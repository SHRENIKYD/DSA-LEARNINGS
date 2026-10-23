#!/usr/bin/env node
// Row level security check. Starts a throwaway local PostgreSQL, fakes the Supabase roles and
// auth.uid(), applies every migration in order, then asserts who can read/write what.
// Usage: node tools/rls-check.js [migrations-folder]   (default: supabase/migrations)
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const cp = require('child_process');

const dir = path.resolve(process.argv[2] || path.join(__dirname, '..', 'supabase', 'migrations'));
const isRoot = process.getuid && process.getuid() === 0;
const pgBin = (() => {
  const base = '/usr/lib/postgresql';
  if (fs.existsSync(base)) {
    const v = fs.readdirSync(base).sort((a, b) => Number(b) - Number(a))[0];
    if (v && fs.existsSync(path.join(base, v, 'bin', 'initdb'))) return path.join(base, v, 'bin');
  }
  return '';
})();
const bin = (n) => (pgBin ? path.join(pgBin, n) : n);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rls-check-'));
fs.chmodSync(tmp, 0o755);
const data = path.join(tmp, 'data'), sock = path.join(tmp, 'sock');
fs.mkdirSync(sock);
let runAs = null;
if (isRoot) { // PostgreSQL refuses to run as root
  runAs = 'postgres';
  cp.spawnSync('chown', ['-R', runAs, tmp]);
}
function run(cmd, args, input) {
  const full = runAs ? ['runuser', ['-u', runAs, '--', cmd, ...args]] : [cmd, args];
  return cp.spawnSync(full[0], full[1], { input, encoding: 'utf8' });
}
function psql(sql, extra) {
  return run(bin('psql'), ['-h', sock, '-U', 'postgres', '-d', 'postgres', '-X', '-q', '-v', 'ON_ERROR_STOP=1', '-t', '-A', ...(extra || [])], sql);
}
function stop() { run(bin('pg_ctl'), ['-D', data, '-m', 'immediate', 'stop']); try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {} }

let failed = 0, passed = 0;
function ok(name) { passed++; console.log('  PASS  ' + name); }
function bad(name, why) { failed++; console.log('  FAIL  ' + name + (why ? '  -> ' + why : '')); }

function main() {
  if (!fs.existsSync(dir)) throw new Error('migrations folder not found: ' + dir);
  const files = fs.readdirSync(dir).filter((f) => /\.sql$/.test(f)).sort();
  if (!files.length) throw new Error('no .sql files in ' + dir);
  let r = run(bin('initdb'), ['-D', data, '-A', 'trust', '-U', 'postgres', '-E', 'UTF8']);
  if (r.status !== 0) throw new Error('initdb failed: ' + r.stderr);
  r = run(bin('pg_ctl'), ['-D', data, '-w', '-l', path.join(tmp, 'log'), '-o', `-c listen_addresses= -c unix_socket_directories=${sock}`, 'start']);
  if (r.status !== 0) throw new Error('pg_ctl start failed: ' + r.stderr);

  // Supabase stand-ins: roles, auth schema, auth.uid(), default grants.
  r = psql(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated, service_role;
    grant usage on schema public to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
    alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  `);
  if (r.status !== 0) throw new Error('setup failed: ' + r.stderr);

  console.log('Applying migrations from ' + dir);
  for (const f of files) {
    r = psql(fs.readFileSync(path.join(dir, f), 'utf8'));
    if (r.status !== 0) throw new Error(f + ' failed: ' + r.stderr);
    console.log('  applied ' + f);
  }
  // Every migration must be safe to run twice.
  for (const f of files) {
    r = psql(fs.readFileSync(path.join(dir, f), 'utf8'));
    if (r.status !== 0) bad('re-running ' + f + ' is idempotent', r.stderr.trim()); else ok('re-running ' + f + ' is idempotent');
  }

  const A = '00000000-0000-0000-0000-00000000000a', B = '00000000-0000-0000-0000-00000000000b';
  psql(`insert into auth.users values ('${A}'), ('${B}');`);

  // Run statements as a role (and optional user). Returns {ok, out, err}; each statement in its own transaction.
  function as(role, uid, sql) {
    const pre = `set role ${role}; ` + (uid ? `select set_config('request.jwt.claim.sub','${uid}',false) \\g /dev/null\n` : '');
    const x = psql(pre + sql);
    return { ok: x.status === 0, out: (x.stdout || '').trim(), err: (x.stderr || '').trim() };
  }
  function expectOk(name, role, uid, sql, want) {
    const x = as(role, uid, sql);
    if (!x.ok) return bad(name, x.err);
    if (want !== undefined && x.out !== want) return bad(name, 'got "' + x.out + '", want "' + want + '"');
    ok(name);
  }
  function expectDenied(name, role, uid, sql) {
    const x = as(role, uid, sql);
    if (x.ok) return bad(name, 'was allowed (output "' + x.out + '")');
    ok(name);
  }
  const count = (t, w) => `select count(*) from ${t}${w ? ' where ' + w : ''};`;

  // progress: own row
  expectOk('A inserts own progress', 'authenticated', A, `insert into public.progress (user_id, done) values ('${A}', '{"x":1}');`);
  expectOk('B inserts own progress', 'authenticated', B, `insert into public.progress (user_id, done) values ('${B}', '{"y":2}');`);
  expectOk('A reads own progress', 'authenticated', A, count('public.progress', `user_id='${A}'`), '1');
  expectOk('A sees only own row', 'authenticated', A, count('public.progress'), '1');
  expectOk('A updates own progress', 'authenticated', A, `with u as (update public.progress set done='{"x":2}' where user_id='${A}' returning 1) select count(*) from u;`, '1');
  // progress: other user
  expectOk('B cannot see A row', 'authenticated', B, count('public.progress', `user_id='${A}'`), '0');
  expectOk('B cannot update A row (0 rows)', 'authenticated', B, `with u as (update public.progress set done='{"hack":1}' where user_id='${A}' returning 1) select count(*) from u;`, '0');
  expectOk('B cannot delete A row (0 rows)', 'authenticated', B, `with u as (delete from public.progress where user_id='${A}' returning 1) select count(*) from u;`, '0');
  expectDenied('B cannot insert a row for A', 'authenticated', B, `insert into public.progress (user_id, done) values ('${A}', '{}');`);
  expectDenied('A cannot hand own row to B (update user_id)', 'authenticated', A, `update public.progress set user_id='${B}' where user_id='${A}';`);
  expectOk('A row is still intact', 'service_role', null, `select done::text from public.progress where user_id='${A}';`, '{"x": 2}');
  // progress: anon
  expectDenied('anon cannot read progress', 'anon', null, count('public.progress'));
  expectDenied('anon cannot insert progress', 'anon', null, `insert into public.progress (user_id) values ('${A}');`);
  // progress: size limit
  expectDenied('oversized done JSON is rejected on update', 'authenticated', A, `update public.progress set done=jsonb_build_object('big', repeat('x', 300000)) where user_id='${A}';`);
  expectDenied('oversized last JSON is rejected on update', 'authenticated', A, `update public.progress set last=jsonb_build_object('big', repeat('x', 300000)) where user_id='${A}';`);
  expectOk('under-limit JSON is accepted', 'authenticated', A, `update public.progress set done=jsonb_build_object('ok', repeat('x', 100000)) where user_id='${A}';`);

  // client_errors
  const ins = (app, extra) => `insert into public.client_errors (app, version, page, message, stack, ua) values ('${app}', '1.0', '/p', ${extra || "'m'"}, 's', 'ua');`;
  expectOk('anon can insert a client error', 'anon', null, ins('web'));
  expectOk('authenticated can insert a client error', 'authenticated', A, ins('android'));
  expectDenied('anon cannot select client_errors', 'anon', null, count('public.client_errors'));
  expectDenied('authenticated cannot select client_errors', 'authenticated', A, count('public.client_errors'));
  expectDenied('anon cannot update client_errors', 'anon', null, `update public.client_errors set message='x';`);
  expectDenied('authenticated cannot update client_errors', 'authenticated', A, `update public.client_errors set message='x';`);
  expectDenied('anon cannot delete client_errors', 'anon', null, `delete from public.client_errors;`);
  expectDenied('authenticated cannot delete client_errors', 'authenticated', A, `delete from public.client_errors;`);
  expectDenied('client error with unknown app is rejected', 'anon', null, ins('ios'));
  expectDenied('client error message over 500 chars is rejected', 'anon', null, ins('web', "repeat('m', 501)"));
  expectDenied('client error stack over 4000 chars is rejected', 'anon', null, `insert into public.client_errors (app, stack) values ('web', repeat('s', 4001));`);
  expectDenied('client error page over 200 chars is rejected', 'anon', null, `insert into public.client_errors (app, page) values ('web', repeat('p', 201));`);
  expectDenied('client error ua over 300 chars is rejected', 'anon', null, `insert into public.client_errors (app, ua) values ('web', repeat('u', 301));`);
  expectOk('service role can read client_errors', 'service_role', null, count('public.client_errors'), '2');

  // delete account
  expectDenied('anon cannot call delete_my_account', 'anon', null, `select public.delete_my_account();`);
  expectDenied('signed-out user cannot delete anything', 'authenticated', null, `select public.delete_my_account();`);
  expectOk('A deletes own account', 'authenticated', A, `select public.delete_my_account();`);
  expectOk('A user and progress are gone', 'postgres', null, `select (select count(*) from auth.users where id='${A}') + (select count(*) from public.progress where user_id='${A}');`, '0');
  expectOk('B user and progress are untouched', 'postgres', null, `select (select count(*) from auth.users where id='${B}') + (select count(*) from public.progress where user_id='${B}');`, '2');
}

try { main(); } catch (e) { failed++; console.log('ERROR ' + e.message); }
stop();
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
