const assert = require('node:assert/strict');
const { publish } = require('./video-publish');
async function main() {
  const calls = [];
  let dispatched = false;
  const cli = args => {
    calls.push(args);
    if (args[0] === 'workflow') dispatched = true;
    if (args[1] === 'list') return JSON.stringify(dispatched ? [{ databaseId: 2 }] : [{ databaseId: 1, status: 'completed', conclusion: 'success' }]);
    return '';
  };
  await publish('pages.yml', false, cli, async () => {});
  assert(calls.some(c => c[1] === 'watch' && c[2] === '2' && c.includes('--exit-status')));
  calls.length = 0; dispatched = false;
  await publish('pages.yml', true, cli);
  assert.equal(calls.length, 1, 'successful releases are not dispatched again');
  const retry = [];
  await publish('android.yml', true, args => {
    retry.push(args);
    return args[1] === 'list' ? JSON.stringify([{ databaseId: 3, status: 'completed', conclusion: 'failure' }]) : '';
  });
  assert(retry.some(c => c[1] === 'rerun' && c[2] === '3'));
  assert(retry.some(c => c[1] === 'watch' && c[2] === '3'));
  dispatched = false;
  await assert.rejects(publish('android.yml', false, args => {
    if (args[1] === 'list') return JSON.stringify(dispatched ? [{ databaseId: 4 }] : []);
    if (args[0] === 'workflow') dispatched = true;
    if (args[1] === 'watch') throw new Error('upload failed');
    return '';
  }, async () => {}), /upload failed/);
  await assert.rejects(publish('pages.yml', false, args => args[1] === 'list' ? '[]' : '', async () => {}), /Cannot locate/);
  console.log('PASS: dispatch discovery, success monitoring, failed-run recovery, upload failure propagation');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
