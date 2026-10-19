(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  function hesc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function bx(id, label, x, y, w) {
    var n = { id: id, label: label === undefined ? id : label, x: x, y: y, shape: 'box' };
    if (w) n.w = w;
    return n;
  }
  function pyc(label, code, hl) { return { type: 'code', label: label, lang: 'python', code: code, hl: hl || {} }; }
  // A TOY 32-bit hash (FNV-1a), used ONLY so visualizers can show "different input -> different output".
  // It is NOT a password hash. Real code uses argon2id / bcrypt / scrypt.
  function toyHash(s) {
    var h = 2166136261, i, out = '';
    for (var round = 0; round < 2; round++) {
      for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
      out += ('00000000' + h.toString(16)).slice(-8);
      s = s + '#';
    }
    return out;
  }
  function kvParse(input, fmt) {
    var o = {};
    String(input || '').trim().split(/\s+/).forEach(function (tok) {
      if (!tok) return;
      var i = tok.indexOf('=');
      if (i <= 0) throw new Error('Use key=value pairs separated by spaces, e.g. ' + fmt);
      o[tok.slice(0, i).toLowerCase()] = tok.slice(i + 1);
    });
    return o;
  }
  var NOW = 1700000000;
  var KEY = 'unit-test-key-not-a-real-secret';
  // Test-fixture JWTs for the solution checker. They were signed with obvious TEST keys
  // ('unit-test-key-not-a-real-secret', 'test-key-one-not-real', 'test-key-two-not-real') at now = 1700000000.
  // They protect nothing; real keys always come from the environment or a secrets manager.
  var TK = {
    valid: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MiIsImF1ZCI6Im9yZGVycy1hcGkiLCJleHAiOjE3MDAwMDAzMDB9.MzsKiazxvtR8kdin6k1uQLOPMnOGvJwxw8RWF9hXEOo',
    valid_list: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI3IiwiYXVkIjpbIndlYiIsIm9yZGVycy1hcGkiXSwiZXhwIjoxNzAwMDAwMDYwfQ.msKoYcdAvEwib0w1ZjtJ6ixexm9YmMQHshVRlZ6OAC4',
    expired: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MiIsImF1ZCI6Im9yZGVycy1hcGkiLCJleHAiOjE2OTk5OTk5OTl9.X8bqRNT1-KdLj5DhmU673lguXDCDqb_mq_XDIWryVhU',
    exp_now: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MiIsImF1ZCI6Im9yZGVycy1hcGkiLCJleHAiOjE3MDAwMDAwMDB9.v06SDIAcE7HW5TXe9eQ2ouUAAId73e8cezSN_oXhNK4',
    wrong_aud: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MiIsImF1ZCI6ImJpbGxpbmctYXBpIiwiZXhwIjoxNzAwMDAwMzAwfQ.xLF37b0VhgsxWylZF4PgpiT2zDmXr76ByEmmMZ_FarU',
    alg_none: 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxIiwiYXVkIjoib3JkZXJzLWFwaSIsImV4cCI6MTcwMDAwMDMwMH0.',
    tampered: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImF1ZCI6Im9yZGVycy1hcGkiLCJleHAiOjE3MDAwMDAzMDB9.MzsKiazxvtR8kdin6k1uQLOPMnOGvJwxw8RWF9hXEOo',
    other_key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MiIsImF1ZCI6Im9yZGVycy1hcGkiLCJleHAiOjE3MDAwMDAzMDB9.EZXHor9Vq9RrJ-2168gFHTesCJT1PR3mIAolQXndt74',
    no_exp: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MiIsImF1ZCI6Im9yZGVycy1hcGkifQ.Yb4t-QIeuccvzVW_mkmXNqFleerdxbSFbJb58KUndP4',
    hs512: 'eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MiIsImF1ZCI6Im9yZGVycy1hcGkiLCJleHAiOjE3MDAwMDAzMDB9.iubOYmKiUNSk_VEKEovg7lMArP5krKeIQz_1he2VyCE',
    no_aud: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0MiIsImV4cCI6MTcwMDAwMDMwMH0.V33UR0WPfSBRAy42iSEJxrEjNpUvNpJqW-KzjmQxTmg',
    h_ok_k1: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImsxIn0.eyJzdWIiOiJ1MSIsImlzcyI6Imh0dHBzOi8vYXV0aC5leGFtcGxlLmNvbSIsImF1ZCI6Im9yZGVycy1hcGkiLCJpYXQiOjE2OTk5OTk5OTAsImV4cCI6MTcwMDAwMDMwMH0.Cee-48x_924cq4_ZaiRJCpOhMQw96j2d7d1Q4AiDVYc',
    h_ok_k2: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImsyIn0.eyJzdWIiOiJ1MiIsImlzcyI6Imh0dHBzOi8vYXV0aC5leGFtcGxlLmNvbSIsImF1ZCI6Im9yZGVycy1hcGkiLCJpYXQiOjE2OTk5OTk5OTAsImV4cCI6MTcwMDAwMDMwMH0.kJJCgPbhmeFJwHFKYpBRsFx7CZtRrvRcOg5uuiM9iXw',
    h_unknown_kid: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ims5In0.eyJzdWIiOiJ1MSIsImlzcyI6Imh0dHBzOi8vYXV0aC5leGFtcGxlLmNvbSIsImF1ZCI6Im9yZGVycy1hcGkiLCJpYXQiOjE2OTk5OTk5OTAsImV4cCI6MTcwMDAwMDMwMH0.Y9-OyKIdwRTO5YTGQWLkVRNkDQctTgz7ytVpga4j5AI',
    h_no_kid: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1MSIsImlzcyI6Imh0dHBzOi8vYXV0aC5leGFtcGxlLmNvbSIsImF1ZCI6Im9yZGVycy1hcGkiLCJpYXQiOjE2OTk5OTk5OTAsImV4cCI6MTcwMDAwMDMwMH0.ezsNifZXxuORJbxOc4zV_1NwFJDjOmBllYJBtlaqUvY',
    h_wrong_key_for_kid: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImsxIn0.eyJzdWIiOiJ1MSIsImlzcyI6Imh0dHBzOi8vYXV0aC5leGFtcGxlLmNvbSIsImF1ZCI6Im9yZGVycy1hcGkiLCJpYXQiOjE2OTk5OTk5OTAsImV4cCI6MTcwMDAwMDMwMH0.6TkL1feWvKQYtMm5JQcIXL32xBwW-cE6rCfTK8r6Arc',
    h_leeway_ok: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImsxIn0.eyJzdWIiOiJ1MSIsImlzcyI6Imh0dHBzOi8vYXV0aC5leGFtcGxlLmNvbSIsImF1ZCI6Im9yZGVycy1hcGkiLCJpYXQiOjE2OTk5OTk5OTAsImV4cCI6MTY5OTk5OTk3MH0.Fzgo9SzCBbq97HJRFzKYVZ_XDk1xAoPriDjtHlW54e8',
    h_expired: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImsxIn0.eyJzdWIiOiJ1MSIsImlzcyI6Imh0dHBzOi8vYXV0aC5leGFtcGxlLmNvbSIsImF1ZCI6Im9yZGVycy1hcGkiLCJpYXQiOjE2OTk5OTk5OTAsImV4cCI6MTY5OTk5OTk0MH0.78l_H4gy-Svjp77h-YLCvOlX6MqD3uQF7PCUe3DTj7Q',
    h_nbf_future: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImsxIn0.eyJzdWIiOiJ1MSIsImlzcyI6Imh0dHBzOi8vYXV0aC5leGFtcGxlLmNvbSIsImF1ZCI6Im9yZGVycy1hcGkiLCJpYXQiOjE2OTk5OTk5OTAsImV4cCI6MTcwMDAwMDMwMCwibmJmIjoxNzAwMDAwMTIwfQ.wrlFoE-xypQqWyLSvAy-wgDqhPfiwdfE46iSX8vudwQ',
    h_nbf_leeway: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImsxIn0.eyJzdWIiOiJ1MSIsImlzcyI6Imh0dHBzOi8vYXV0aC5leGFtcGxlLmNvbSIsImF1ZCI6Im9yZGVycy1hcGkiLCJpYXQiOjE2OTk5OTk5OTAsImV4cCI6MTcwMDAwMDMwMCwibmJmIjoxNzAwMDAwMDQ1fQ.Rzm8Y2a84UlWwCNgVKHQheNahugZcn1ax71L84iHy4A',
    h_iat_future: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImsxIn0.eyJzdWIiOiJ1MSIsImlzcyI6Imh0dHBzOi8vYXV0aC5leGFtcGxlLmNvbSIsImF1ZCI6Im9yZGVycy1hcGkiLCJpYXQiOjE3MDAwMDA2MDAsImV4cCI6MTcwMDAwMDMwMH0._6I8DkRrwPMocPql-gWBSn3mrE3GCQ3ySEsdBVPhkcA',
    h_wrong_iss: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImsxIn0.eyJzdWIiOiJ1MSIsImlzcyI6Imh0dHBzOi8vZXZpbC5leGFtcGxlLm5ldCIsImF1ZCI6Im9yZGVycy1hcGkiLCJpYXQiOjE2OTk5OTk5OTAsImV4cCI6MTcwMDAwMDMwMH0.r7VcbWbQwrCv0thJ2HAQpOQ-Rk8YIh46NQ3hAEgVIyA',
    h_wrong_aud: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImsxIn0.eyJzdWIiOiJ1MSIsImlzcyI6Imh0dHBzOi8vYXV0aC5leGFtcGxlLmNvbSIsImF1ZCI6WyJiaWxsaW5nLWFwaSJdLCJpYXQiOjE2OTk5OTk5OTAsImV4cCI6MTcwMDAwMDMwMH0.UpO3l68skiceCRh12GkLaLawky-jQZRwosiC82No7vk',
    h_missing_sub: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImsxIn0.eyJpc3MiOiJodHRwczovL2F1dGguZXhhbXBsZS5jb20iLCJhdWQiOiJvcmRlcnMtYXBpIiwiaWF0IjoxNjk5OTk5OTkwLCJleHAiOjE3MDAwMDAzMDB9.4GIK5FEZ7NVA3mBcQUh-tob31rnkaOcvNNn3_P1gxhU',
    h_rs256: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImsxIn0.eyJzdWIiOiJ1MSIsImlzcyI6Imh0dHBzOi8vYXV0aC5leGFtcGxlLmNvbSIsImF1ZCI6Im9yZGVycy1hcGkiLCJpYXQiOjE2OTk5OTk5OTAsImV4cCI6MTcwMDAwMDMwMH0.aFyIu0aq8R05_E5B64jccEDQtN2zJruYj6QkyFNQuDE'
  };

  /* =====================================================================
     TOPIC 1 — Password hashing in Python (argon2id / bcrypt with pwdlib)
     ===================================================================== */
  topics.push({
    title: 'Password Hashing in Python: argon2id with pwdlib, bcrypt, Rehash and Safe Verify',
    analogy: `<p>Think of a <b>wax seal</b> made with a stamp that takes a full minute to press. Anyone can check a seal by pressing the stamp again and comparing, but someone trying a million fake stamps would need a million minutes. A password hash is that slow seal. The <b>salt</b> is a tiny random scratch added to each person's stamp, so two people with the same password still get different seals, and a thief cannot reuse one table of guesses for everyone.</p>`,
    explain: `<p>🟢 <b>You already know the why</b> from <b>Backend 5</b> (Authentication &amp; Authorization): store a <b>slow, salted, one-way hash</b>, never the password and never a fast hash like MD5, SHA-1 or plain SHA-256. This topic is the <b>Python how</b>: which library, which call, and the traps that only show up in a real FastAPI app.</p>
      <p><b>Which library in 2026?</b></p>
      ${H.table(['Library', 'Status', 'Use it for'], [
        ['<code>pwdlib</code> (<code>pip install "pwdlib[argon2]"</code>)', '<span class="c-g">Current</span>. Small, typed, made by the FastAPI-Users author; the FastAPI docs now use it.', 'New FastAPI projects. argon2id by default, can also verify old bcrypt hashes.'],
        ['<code>argon2-cffi</code>', '<span class="c-g">Current</span>. The argon2 engine pwdlib uses underneath.', 'When you want the raw <code>PasswordHasher</code> API.'],
        ['<code>bcrypt</code>', '<span class="c-g">Current</span> (pyca). Version 5 refuses passwords longer than 72 bytes instead of quietly cutting them.', 'Verifying legacy bcrypt hashes; still acceptable for new ones if argon2 is not available.'],
        ['<code>passlib</code>', '<span class="c-r">Unmaintained</span> since 2020. Warns or breaks with new <code>bcrypt</code> releases and Python 3.13 (the <code>crypt</code> module was removed).', 'Nothing new. Migrate (see the examples).'],
        ['<code>hashlib.sha256(pw)</code>, MD5, SHA-1', '<span class="c-r">Wrong for passwords</span>: built to be fast, so a GPU tries billions of guesses per second.', 'File checksums, never passwords.']
      ])}
      <p><b>The three calls you need.</b> <code>hash(password)</code> at signup returns one string like <code>$argon2id$v=19$m=65536,t=3,p=4$salt$hash</code>. That string carries the algorithm, the cost settings and the salt, so you store just one column. <code>verify(password, stored)</code> at login returns True or False. <code>verify_and_update(password, stored)</code> also tells you when the stored hash uses old settings, so you can quietly save a stronger hash while you still have the plain password in memory.</p>
      <p><b>Three FastAPI-specific rules.</b></p>
      <ol><li><b>Hashing is slow on purpose</b> (about 50 ms of CPU). Inside an <code>async def</code> route it would freeze the event loop for every other request (Python Backend I). Use a plain <code>def</code> route, or <code>await asyncio.to_thread(password_hash.verify, ...)</code>.</li>
      <li><b>Unknown user must cost the same as wrong password.</b> If you return early when the email is not found, the fast reply tells an attacker which emails exist. Verify against a <b>dummy hash</b> anyway.</li>
      <li><b>The hash never leaves the server.</b> It lives in the DB model, never in the response model (Python Backend I, response models).</li></ol>`,
    clues: [
      '"How would you store passwords in a FastAPI app?" → argon2id via <code>pwdlib</code> (or <code>argon2-cffi</code>), one PHC string column, response model without the hash',
      '"Is SHA-256 with a salt good enough?" → no: it is fast; use a memory-hard, tunable hash (argon2id, scrypt) or bcrypt',
      '"Your login endpoint got slow under load / other requests stall during login" → CPU-heavy hashing on the event loop; use <code>def</code> or <code>asyncio.to_thread</code>',
      '"Attackers can tell which emails are registered" → early return for unknown users; verify against a dummy hash and return one generic error',
      '"We are still on passlib / bcrypt and want argon2" → verify-and-update (rehash on next successful login), keep the old hasher for verification only',
      '"Long passphrases verify even with a typo at the end" → the bcrypt 72-byte limit'
    ],
    code: [
      {
        lang: 'python', title: 'pwdlib: argon2id for new hashes, bcrypt kept for old ones, upgrade on login',
        code: `# pip install "pwdlib[argon2,bcrypt]"
from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher
from pwdlib.hashers.bcrypt import BcryptHasher

# The FIRST hasher creates new hashes. The others can only VERIFY old hashes.
password_hash = PasswordHash((Argon2Hasher(), BcryptHasher()))

# Computed once at import time; used when the user does not exist (see verify_login).
DUMMY_HASH = password_hash.hash("dummy-password-for-timing-only")


def hash_new_password(plain: str) -> str:
    # Returns a PHC string: "$argon2id$v=19$m=65536,t=3,p=4$<salt>$<hash>"
    return password_hash.hash(plain)


def verify_login(plain: str, stored_hash: str | None) -> tuple[bool, str | None]:
    """Return (ok, new_hash_or_None). Same work whether or not the user exists."""
    if stored_hash is None:
        password_hash.verify(plain, DUMMY_HASH)     # burn the same CPU time
        return False, None
    # verify_and_update -> (valid, updated_hash). updated_hash is not None when the
    # stored hash used an old algorithm (bcrypt) or weaker argon2 settings.
    valid, updated = password_hash.verify_and_update(plain, stored_hash)
    return valid, updated`
      },
      {
        lang: 'python', title: 'argon2-cffi directly: tuned parameters, mismatch exception, needs-rehash',
        code: `# pip install argon2-cffi
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

# Defaults follow RFC 9106 (argon2id, t=3, m=64 MiB, p=4). Tune so one hash takes
# roughly 50-250 ms on YOUR production CPU; OWASP's floor is m=19 MiB, t=2, p=1.
ph = PasswordHasher(time_cost=3, memory_cost=64 * 1024, parallelism=4)


def check(stored: str, plain: str) -> tuple[bool, str | None]:
    try:
        ph.verify(stored, plain)             # NOTE: argon2-cffi takes (hash, password)
    except VerifyMismatchError:
        return False, None                   # wrong password: the normal "no"
    except (VerificationError, InvalidHashError):
        return False, None                   # corrupt or foreign hash: log it, still say no
    if ph.check_needs_rehash(stored):        # parameters changed since this hash was made
        return True, ph.hash(plain)
    return True, None`
      },
      {
        lang: 'python', run: true, title: 'Runnable: salted scrypt with the standard library (format, verify, rehash check)',
        code: `import base64
import hashlib
import hmac
import secrets

# scrypt is memory-hard like argon2 and ships with Python's hashlib (OpenSSL).
# Demo cost: N=2**14 (16 MiB) so it runs quickly here. OWASP's 2026 floor is
# N=2**17, r=8, p=1, which needs maxmem raised to about 130 MiB.
N, R, P = 2 ** 14, 8, 1


def b64(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


def unb64(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def hash_password(plain: str, n: int = N) -> str:
    salt = secrets.token_bytes(16)                      # new random salt per password
    dk = hashlib.scrypt(plain.encode(), salt=salt, n=n, r=R, p=P, dklen=32)
    return f"scrypt\${n}\${R}\${P}\${b64(salt)}\${b64(dk)}"   # everything needed to verify later


def verify_password(plain: str, stored: str) -> bool:
    algo, n, r, p, salt, expected = stored.split("$")
    if algo != "scrypt":
        return False
    dk = hashlib.scrypt(plain.encode(), salt=unb64(salt), n=int(n), r=int(r), p=int(p), dklen=32)
    return hmac.compare_digest(dk, unb64(expected))     # constant-time comparison


def needs_rehash(stored: str) -> bool:
    return int(stored.split("$")[1]) < N


a = hash_password("correct horse battery staple")
b = hash_password("correct horse battery staple")
print("hash A :", a[:60] + "...(truncated)")
print("same password, different hashes? ", a != b)
print("verify right password:", verify_password("correct horse battery staple", a))
print("verify wrong password:", verify_password("correct horse battery stapler", a))
old = hash_password("tea-time-every-day", n=2 ** 12)
print("old weaker hash needs rehash:", needs_rehash(old), "| new one:", needs_rehash(a))`
      }
    ],
    codeTitle: ['pwdlib (recommended)', 'argon2-cffi directly', 'Runnable stdlib scrypt'],
    viz: {
      title: 'Signup, login, wrong password, upgrade and unknown user (toy hash)',
      input: 'correct horse battery staple',
      inputLabel: 'Password typed at signup',
      gen: function (input) {
        var pw = String(input || '');
        if (!pw.length) throw new Error('Type a password, for example: correct horse battery staple');
        if (pw.length > 64) pw = pw.slice(0, 64);
        var salt = toyHash('salt:' + pw).slice(0, 12);
        var digest = toyHash(salt + '|' + pw);
        var stored = '$argon2id$v=19$m=65536,t=3,p=4$' + salt + '$' + digest;
        var wrong = pw + 'x', wrongDigest = toyHash(salt + '|' + wrong);
        var f = [];
        f.push({ narr: 'Signup. The password arrives over HTTPS in the request body. It is only ever held in memory for a few milliseconds: never logged, never stored, never put in an error message.', parts: [{ type: 'vars', label: 'Request body (in memory only)', vals: { email: 'asha@example.com', password: '•'.repeat(Math.min(pw.length, 20)) + ' (' + pw.length + ' chars)' }, hl: { password: 'cur' } }] });
        f.push({ narr: 'Step 1: make a <b>fresh random salt</b> (16 bytes from the OS random generator). Every user gets a different one, so identical passwords give different hashes and one precomputed table cannot crack everybody.', parts: [{ type: 'vars', label: 'Inputs to the hash', vals: { salt: salt + ' (random, toy)', password: '(in memory)' }, hl: { salt: 'ok' } }] });
        f.push({ narr: 'Step 2: run the <b>slow, memory-hard</b> hash with the cost settings. argon2id here uses 64 MiB of RAM and 3 passes. Your server does this once per login; an attacker must do it once per guess per user.', parts: [{ type: 'table', label: 'Cost settings (argon2id)', columns: ['setting', 'value', 'what it costs an attacker'], rows: [['m (memory)', '65536 KiB', '64 MiB per guess: GPUs run out of memory'], ['t (time)', '3', '3 passes over that memory'], ['p (parallelism)', '4', 'lanes used per hash']], hl: { 0: 'ok' } }] });
        f.push({ narr: 'Step 3: store <b>one PHC string</b>. It holds the algorithm, version, settings, salt and digest, so verify later needs nothing else. The salt is not secret; it only has to be unique.', parts: [{ type: 'map', label: 'users.password_hash column', entries: [['algorithm', 'argon2id'], ['version', '19'], ['params', 'm=65536,t=3,p=4'], ['salt', salt], ['digest', digest]], hl: { digest: 'ok' } }, { type: 'text', label: 'Stored string', html: '<code>' + hesc(stored) + '</code>' }] });
        f.push({ narr: 'Login with the right password. Read the salt and settings back out of the stored string, hash the typed password the same way, then compare the two digests with a <b>constant-time</b> comparison (<code>hmac.compare_digest</code> inside the library).', parts: [{ type: 'table', label: 'Compare digests', columns: ['', 'digest'], rows: [['stored', digest], ['recomputed', digest]], hl: { 1: 'ok' } }, { type: 'vars', label: 'Result', vals: { verify: 'True', status: '200 + tokens' }, hl: { verify: 'ok' } }] });
        f.push({ narr: 'Login with one extra character. The digest changes completely (the avalanche effect), so verify says False. Answer with one generic message: <i>"Incorrect email or password"</i>.', parts: [{ type: 'table', label: 'Compare digests', columns: ['', 'digest'], rows: [['stored', digest], ['recomputed from "' + hesc(wrong.slice(-8)) + '"', wrongDigest]], hl: { 1: 'bad' } }, { type: 'vars', label: 'Result', vals: { verify: 'False', status: '401' }, hl: { verify: 'bad' } }] });
        f.push({ narr: 'Upgrade on login. Last year you used <code>t=2</code>; now the policy is <code>t=3</code>. After a <b>successful</b> verify, <code>verify_and_update</code> returns a new hash with today\'s settings and you save it. Users never notice; old hashes fade away as people log in.', parts: [{ type: 'table', label: 'needs rehash?', columns: ['stored params', 'current policy', 'action'], rows: [['m=65536,t=2,p=4', 'm=65536,t=3,p=4', 'save new hash'], ['m=65536,t=3,p=4', 'm=65536,t=3,p=4', 'nothing to do']], hl: { 0: 'cur', 1: 'ok' } }] });
        f.push({ narr: 'Unknown email. If you returned immediately, the reply would take 1 ms instead of 50 ms and an attacker could list your users by timing. So verify against a <b>dummy hash</b> anyway, then return the same 401 and the same message.', parts: [{ type: 'table', label: 'Timing seen by an attacker', columns: ['case', 'naive code', 'safe code'], rows: [['wrong password', '≈ 50 ms', '≈ 50 ms'], ['email not registered', '<b>≈ 1 ms</b> (leak!)', '≈ 50 ms (dummy hash)']], hl: { 1: 'bad' } }] });
        return f;
      }
    },
    examples: [
      {
        title: 'Moving off passlib without forcing password resets',
        html: `<p>Old code: <code>CryptContext(schemes=["bcrypt"], deprecated="auto")</code>. New code: <code>PasswordHash((Argon2Hasher(), BcryptHasher()))</code>. Existing <code>$2b$...</code> hashes still verify through the bcrypt hasher; after each successful login <code>verify_and_update</code> hands you an argon2id hash to save. After a few months, check how many rows still start with <code>$2b$</code>. Users who never came back can be forced through a reset email later.</p>`,
        code: { lang: 'python', code: `from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher
from pwdlib.hashers.bcrypt import BcryptHasher

password_hash = PasswordHash((Argon2Hasher(), BcryptHasher()))


def login_and_upgrade(user, plain: str, db) -> bool:
    valid, new_hash = password_hash.verify_and_update(plain, user.password_hash)
    if valid and new_hash is not None:
        user.password_hash = new_hash          # silently upgraded to argon2id
        db.commit()
    return valid` }
      },
      {
        title: 'Keeping slow hashing off the event loop',
        html: `<p>A route declared <code>async def login()</code> that calls <code>password_hash.verify()</code> directly blocks the loop for ~50 ms per login. Under 40 logins per second, every other endpoint on that worker waits. Two fixes: declare the route with plain <code>def</code> (FastAPI runs it in the threadpool), or keep <code>async def</code> and push the CPU work to a thread. argon2-cffi releases the GIL while hashing, so threads really run in parallel.</p>`,
        code: { lang: 'python', code: `import asyncio

from pwdlib import PasswordHash

password_hash = PasswordHash.recommended()     # argon2id with sensible defaults


async def verify_async(plain: str, stored: str) -> bool:
    # Runs in a worker thread; the event loop keeps serving other requests.
    return await asyncio.to_thread(password_hash.verify, plain, stored)` }
      },
      {
        title: 'Why plain SHA-256 is wrong (numbers, not opinions)',
        html: `<p>One modern GPU computes roughly <b>10<sup>10</sup></b> SHA-256 hashes per second. A list of the 10 million most common passwords is checked against one salted hash in about a millisecond, so a stolen table of 1 million users falls in minutes. With argon2id at 64 MiB and ~50 ms per hash, the same GPU manages maybe tens of guesses per second because it runs out of memory. Same attack: <b>thousands of years</b> instead of minutes. That gap is the whole point of a password hash.</p>
        ${H.table(['Hash', 'Guesses per second (one GPU, rough)', '10M-word list vs 1M users'], [['MD5 / SHA-1 / SHA-256', '10<sup>10</sup>', '<span class="c-r">minutes</span>'], ['bcrypt cost 12', '~10<sup>3</sup>', '<span class="c-g">centuries</span>'], ['argon2id 64 MiB, t=3', '~10<sup>1</sup>-10<sup>2</sup>', '<span class="c-g">far longer</span>']])}`
      },
      {
        title: 'The bcrypt 72-byte trap, and the fix',
        html: `<p>bcrypt only reads the first <b>72 bytes</b>. With older libraries, two 80-byte passphrases sharing the first 72 bytes both verified. Since <code>bcrypt</code> 5.0 the library raises <code>ValueError</code> instead, which turns a silent weakness into a 500 error if you never tested long passwords. Fixes: use argon2id (no such limit), or cap password length at 64 characters in your Pydantic model, which still meets NIST's "allow at least 64" rule. Remember that emoji and accented letters take several bytes each.</p>`,
        code: { lang: 'python', run: true, code: `samples = ["a" * 72, "é" * 40, "🔒" * 20]
for s in samples:
    print(len(s), "characters ->", len(s.encode("utf-8")), "UTF-8 bytes",
          "(over bcrypt's 72-byte limit)" if len(s.encode()) > 72 else "")` }
      }
    ],
    deepDive: `<p>🟣 <b>PHC strings and agility.</b> The <code>$argon2id$v=19$m=...,t=...,p=...$salt$hash</code> format (Password Hashing Competition string) makes the stored value self-describing. That is what lets one <code>PasswordHash</code> object verify bcrypt (<code>$2b$12$...</code>) and argon2 side by side, and lets <code>check_needs_rehash</code> compare stored parameters with current policy. Never invent your own format without the algorithm name in it.</p>
      <p><b>Tuning.</b> Pick the highest memory and time your login traffic can afford: measure on the production instance type, target 50-250 ms, and remember the cost is per <i>login attempt</i>, so rate limiting (Topic 6) protects your CPU from people hammering <code>/token</code>. Memory cost also multiplies with concurrency: 64 MiB × 32 parallel logins is 2 GiB.</p>
      <p><b>Pepper.</b> An optional secret mixed in with HMAC (<code>argon2(HMAC(pepper, password))</code>) kept in a secrets manager, not the DB. It helps only if the DB leaks without the app secrets. It complicates rotation, so many teams skip it.</p>
      <p><b>Normalization.</b> The same visible password can be different bytes (é as one code point or e + accent). Apply <code>unicodedata.normalize("NFKC", pw)</code> before hashing at signup <i>and</i> login, or users on another keyboard get locked out.</p>
      <p><b>What not to do.</b> <code>random</code> for salts (use <code>secrets</code> / <code>os.urandom</code>); <code>==</code> to compare digests you computed yourself (use <code>hmac.compare_digest</code>); hashing in the browser "so the server never sees it" (the hash simply becomes the password); encrypting passwords (whoever has the key has every password).</p>`,
    aiEra: `<p>🤖 Ask an assistant for "FastAPI login with hashed passwords" and many answers still use <code>passlib.context.CryptContext</code> from older tutorials. It may run today with warnings and break on the next <code>bcrypt</code> or Python upgrade. Recognise the 2026 shape: <code>pwdlib</code> or <code>argon2-cffi</code>, argon2id, verify-and-update, dummy hash for unknown users, hashing off the event loop. Assistants are good at writing the migration script, the needs-rehash metric query, and a test that long and Unicode passwords round-trip. They are bad at choosing cost parameters: they copy numbers from blog posts instead of measuring on your hardware. Ask the model to write a small benchmark, run it yourself, and pick the parameters from real numbers. Never paste real user hashes into a chat to "check them".</p>`,
    problems: [
      {
        title: 'Check a Password Against a Modern Policy',
        level: 'Easy', tags: ['password policy', 'NIST 800-63B', 'validation'], companies: ['Atlassian', 'Razorpay'],
        statement: `<p>Your signup endpoint needs a policy check that follows current NIST guidance (SP 800-63B rev. 4): <b>length and blocklists, not "one uppercase + one symbol" rules</b>. Write <code>check_password(password, username, has_mfa)</code> returning a list of problem codes in this exact order (empty list = accepted):</p>
          <ol><li><code>"too_short"</code>: fewer than <b>15</b> characters, or fewer than <b>8</b> when the account has MFA. Count characters after <code>unicodedata.normalize("NFKC", ...)</code>.</li>
          <li><code>"too_long"</code>: more than <b>64</b> characters.</li>
          <li><code>"common"</code>: the lowercased password is in the blocklist <code>{"password", "123456789", "qwertyuiop", "iloveyou", "letmein", "passwordpassword", "123456789012345"}</code>.</li>
          <li><code>"contains_username"</code>: the username (3+ characters) appears in the password, ignoring case.</li>
          <li><code>"repeated"</code>: at least 2 characters and all of them the same character.</li></ol>
          <p>Spaces are allowed and count as characters. Do not trim.</p>`,
        constraints: `0 ≤ len(password) ≤ 200. username is 0-50 characters. In production the blocklist is a breached-password list (for example a k-anonymity range lookup to the Have I Been Pwned API).`,
        example: `${H.table(['password', 'username', 'mfa', 'result'], [['"correct horse battery staple"', 'asha', 'False', '<span class="c-g">[]</span>'], ['"abcdefgh"', 'asha', 'True', '<span class="c-g">[]</span> (8 is enough with MFA)'], ['"abcdefgh"', 'asha', 'False', '<span class="c-r">["too_short"]</span>'], ['"letmein"', 'bob', 'True', '<span class="c-r">["too_short", "common"]</span>']])}`,
        brute: {
          why: `<p>The classic composition rule: "8+ characters with an uppercase, a digit and a symbol". It accepts <code>Password1!</code> (in every breach list) and rejects <code>correct horse battery staple</code>. Users respond with predictable patterns. NIST dropped composition rules for exactly this reason.</p>`,
          code: { lang: 'python', code: `import re


def check_password(password: str, username: str, has_mfa: bool) -> list[str]:
    ok = (len(password) >= 8 and re.search("[A-Z]", password)
          and re.search("[0-9]", password) and re.search("[^A-Za-z0-9]", password))
    return [] if ok else ["weak"]          # "Password1!" passes, a long passphrase fails` }
        },
        mcq: { q: 'Which rule does current NIST guidance recommend?', options: ['Check new passwords against a list of known-breached passwords', 'Require at least one symbol and one uppercase letter', 'Force a password change every 90 days', 'Forbid spaces'], answer: 0, explain: 'SP 800-63B: length, blocklists of compromised passwords, allow spaces and all printable characters, no composition rules, no periodic rotation unless there is evidence of compromise.' },
        hints: [
          `<p>Hint 1: normalize first (<code>unicodedata.normalize("NFKC", password)</code>), then measure <code>len()</code>. Pick the minimum from <code>has_mfa</code>.</p>`,
          `<p>Hint 2: append codes to a list in the fixed order; several codes can appear together, e.g. a 70-character "aaaa…" is both too_long and repeated.</p>`,
          `<p>Hint 3: "repeated" means <code>len(pw) &gt;= 2 and len(set(pw)) == 1</code>. Skip the username check when the username is shorter than 3 characters, or every password containing "al" would fail for user "al".</p>`
        ],
        solution: {
          approach: `<p>Normalize once, then run five independent checks in order and collect the failures. Returning every problem (not just the first) lets the UI show all messages at once. In FastAPI this function becomes a Pydantic <code>field_validator</code> or a check in the signup service that raises a 422 with these codes.</p>`,
          code: { lang: 'python', run: true, code: `import unicodedata

BLOCKLIST = {"password", "123456789", "qwertyuiop", "iloveyou", "letmein",
             "passwordpassword", "123456789012345"}


def check_password(password: str, username: str, has_mfa: bool) -> list[str]:
    pw = unicodedata.normalize("NFKC", password)
    problems: list[str] = []
    minimum = 8 if has_mfa else 15
    if len(pw) < minimum:
        problems.append("too_short")
    if len(pw) > 64:
        problems.append("too_long")
    if pw.lower() in BLOCKLIST:
        problems.append("common")
    if len(username) >= 3 and username.lower() in pw.lower():
        problems.append("contains_username")
    if len(pw) >= 2 and len(set(pw)) == 1:
        problems.append("repeated")
    return problems


print(check_password("correct horse battery staple", "asha", False))
print(check_password("letmein", "bob", True))
print(check_password("asha-loves-tea-2026", "Asha", False))` },
          complexity: `<p>O(n + u) time for password length n and username length u (normalization, set, substring search); O(n) extra space for the normalized copy.</p>`,
          followUps: ['How would you check a breached-password API without sending the password (k-anonymity on the SHA-1 prefix)?', 'Where should this check run: Pydantic model, service, or both?']
        },
        tests: { fn: 'checkPassword', names: { python: 'check_password' }, sig: 'string string bool -> string[]', cases: [
          [['correct horse battery staple', 'asha', false], []],
          [['short', 'asha', true], ['too_short']],
          [['abcdefgh', 'asha', true], []],
          [['abcdefgh', 'asha', false], ['too_short']],
          [['passwordpassword', 'x', false], ['common']],
          [['PasswordPassword', 'x', false], ['common']],
          [['asha-loves-tea-2026', 'Asha', false], ['contains_username']],
          [['aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'bob', false], ['too_long', 'repeated']],
          [['zzzzzzzzzzzzzzz', 'bob', false], ['repeated']],
          [['', 'bob', true], ['too_short']],
          [['al-the-great-adventurer', 'al', false], []],
          [['letmein', 'bob', true], ['too_short', 'common']],
          [['   spaces count too   ', 'bob', false], []]
        ] }
      }
    ]
  });

  /* =====================================================================
     TOPIC 2 — OAuth2 password flow with JWT in FastAPI
     ===================================================================== */
  topics.push({
    title: 'OAuth2 Password Flow with JWT in FastAPI: /token, Bearer Tokens and get_current_user',
    analogy: `<p>Think of a <b>music festival</b>. At the gate you show your ID once (username and password). The gate staff give you a <b>wristband</b> printed with your name, your ticket type and today's date, plus a tamper-proof hologram (the signature). After that, every stage checks the wristband, not your ID. A wristband with a fake hologram, yesterday's date, or printed for a different festival gets you turned away.</p>`,
    explain: `<p>🟢 <b>The flow in four steps.</b></p>
      <ol><li>The client sends <code>POST /auth/token</code> with a <b>form</b> body: <code>username=...&amp;password=...</code> (OAuth2 says form fields, not JSON).</li>
      <li>The server checks the password hash (Topic 1). If good, it signs a short-lived <b>access token</b> (a JWT) and returns <code>{"access_token": "...", "token_type": "bearer"}</code>.</li>
      <li>The client sends that token on every request: <code>Authorization: Bearer eyJ...</code>.</li>
      <li>A dependency, <code>get_current_user</code>, reads the header, <b>verifies</b> the token and loads the user. Routes simply declare that dependency.</li></ol>
      <p><b>The FastAPI pieces.</b></p>
      ${H.table(['Piece', 'What it does'], [
        ['<code>OAuth2PasswordBearer(tokenUrl="auth/token")</code>', 'A dependency that pulls the token out of the <code>Authorization: Bearer</code> header, answers 401 if it is missing, and adds the "Authorize" button to <code>/docs</code>.'],
        ['<code>OAuth2PasswordRequestForm = Depends()</code>', 'Reads <code>username</code>, <code>password</code> and <code>scope</code> from the form body. Needs <code>python-multipart</code> (included in <code>fastapi[standard]</code>).'],
        ['<code>jwt.encode(claims, key, algorithm="HS256")</code>', 'PyJWT: signs the claims and returns the token string.'],
        ['<code>jwt.decode(token, key, algorithms=["HS256"], audience=..., issuer=...)</code>', 'PyJWT: checks signature, <code>exp</code>, <code>nbf</code>, <code>iat</code>, <code>aud</code>, <code>iss</code>, and returns the claims. Raises on any problem.']
      ])}
      <p><b>What goes in the token.</b> Keep it small and non-secret (anyone can base64-decode a JWT): <code>sub</code> (user id as a <b>string</b>), <code>exp</code> (15 minutes is common), <code>iat</code>, <code>iss</code> (who issued it), <code>aud</code> (which API it is for), <code>jti</code> (unique id, for revocation), and <code>scope</code> (Topic 3). Never put the password, the hash, or personal data you would not print on a wristband.</p>
      <p><b>Name check.</b> The OAuth2 "password grant" is fine when <b>your own</b> first-party app logs in to <b>your own</b> API. It is deprecated in OAuth 2.1 for third-party apps, which should use Authorization Code + PKCE or an identity provider (Backend 5). The FastAPI pattern here is still the standard way to build a small, self-contained API login.</p>`,
    clues: [
      '"Implement login for a FastAPI API" → <code>OAuth2PasswordRequestForm</code> on <code>/token</code>, PyJWT access token, <code>OAuth2PasswordBearer</code> + <code>get_current_user</code> dependency',
      '"Why does <code>jwt.decode</code> need <code>algorithms=[...]</code>?" → so the token header cannot pick the algorithm (alg confusion, <code>alg: none</code>)',
      '"Tokens from our staging environment work in production" → missing <code>aud</code>/<code>iss</code> checks or a shared signing key',
      '"401 or 403?" → 401 = we do not know who you are (no/invalid/expired token, add <code>WWW-Authenticate: Bearer</code>); 403 = we know you, but no',
      '"How do you log a user out with JWTs?" → short <code>exp</code>, refresh-token revocation, a <code>jti</code> deny-list or a per-user token version',
      '"Another team runs the identity provider" → verify RS256/ES256/EdDSA tokens with the issuer\'s JWKS (<code>PyJWKClient</code>), never share an HMAC key'
    ],
    code: [
      {
        lang: 'python', title: 'app/auth.py: the full password flow with PyJWT (no secrets in code)',
        code: `# pip install "fastapi[standard]" pyjwt "pwdlib[argon2]"
import uuid
from datetime import datetime, timedelta, timezone
from typing import Annotated

import jwt                                   # PyJWT
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel

from app.config import Settings, get_settings          # Topic 5: values come from the environment
from app.passwords import verify_login                  # Topic 1: dummy hash for unknown users
from app.users import User, find_user_by_email, get_user_by_id

router = APIRouter(prefix="/auth", tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


def create_access_token(user_id: int, settings: Settings) -> str:
    now = datetime.now(timezone.utc)
    claims = {
        "sub": str(user_id),                 # PyJWT 2.10+ requires sub to be a string
        "iss": settings.jwt_issuer,
        "aud": settings.jwt_audience,
        "iat": now,
        "nbf": now,
        "exp": now + timedelta(minutes=settings.access_token_minutes),
        "jti": uuid.uuid4().hex,             # unique id: lets you deny-list one token
    }
    return jwt.encode(claims, settings.jwt_secret.get_secret_value(), algorithm="HS256")


@router.post("/token", response_model=Token)
def login(form: Annotated[OAuth2PasswordRequestForm, Depends()],
          settings: Annotated[Settings, Depends(get_settings)]) -> Token:
    # Plain def: hashing is CPU work, so FastAPI runs this in the threadpool.
    user = find_user_by_email(form.username)
    ok, _new_hash = verify_login(form.password, user.password_hash if user else None)
    if not ok or user is None or not user.is_active:
        # One message for every failure: no hint whether the email exists.
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password",
                            headers={"WWW-Authenticate": "Bearer"})
    token = create_access_token(user.id, settings)
    return Token(access_token=token, expires_in=settings.access_token_minutes * 60)


CREDENTIALS_ERROR = HTTPException(status.HTTP_401_UNAUTHORIZED, "Could not validate credentials",
                                  headers={"WWW-Authenticate": "Bearer"})


def get_current_user(token: Annotated[str, Depends(oauth2_scheme)],
                     settings: Annotated[Settings, Depends(get_settings)]) -> User:
    try:
        claims = jwt.decode(
            token,
            settings.jwt_secret.get_secret_value(),
            algorithms=["HS256"],            # an allow-list: the token header cannot choose
            audience=settings.jwt_audience,
            issuer=settings.jwt_issuer,
            leeway=30,                       # seconds of clock skew tolerated
            options={"require": ["exp", "iat", "sub", "iss", "aud"]},
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token expired",
                            headers={"WWW-Authenticate": 'Bearer error="invalid_token"'})
    except jwt.InvalidTokenError:            # bad signature, wrong aud/iss, malformed, missing claim
        raise CREDENTIALS_ERROR
    user = get_user_by_id(int(claims["sub"]))
    if user is None or not user.is_active:
        raise CREDENTIALS_ERROR
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


@router.get("/me")
def read_me(user: CurrentUser) -> dict:
    return {"id": user.id, "email": user.email}`
      },
      {
        lang: 'python', run: true, title: 'Runnable: what a JWT is, and the attacks a careless verifier lets through (stdlib only)',
        code: `import base64
import hashlib
import hmac
import json
import secrets
import time

KEY = secrets.token_bytes(32)        # a fresh random key for this demo run; real apps read it from settings


def b64e(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


def b64d(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def sign(claims: dict, header: dict | None = None, key: bytes = KEY) -> str:
    h = b64e(json.dumps(header or {"alg": "HS256", "typ": "JWT"}).encode())
    p = b64e(json.dumps(claims).encode())
    sig = hmac.new(key, f"{h}.{p}".encode(), hashlib.sha256).digest()
    return f"{h}.{p}.{b64e(sig)}"


def careless_verify(token: str) -> dict:
    """The bugs people write: trust the header's alg, never check exp or aud."""
    h, p, s = token.split(".")
    header = json.loads(b64d(h))
    if header.get("alg") == "none":
        return json.loads(b64d(p))                       # accepts unsigned tokens!
    expected = hmac.new(KEY, f"{h}.{p}".encode(), hashlib.sha256).digest()
    if expected != b64d(s):                              # plain != leaks timing
        raise ValueError("bad signature")
    return json.loads(b64d(p))


def careful_verify(token: str, audience: str) -> dict:
    """What PyJWT does for jwt.decode(token, key, algorithms=["HS256"], audience=...)."""
    h, p, s = token.split(".")
    if json.loads(b64d(h)).get("alg") != "HS256":        # allow-list, decided by the SERVER
        raise ValueError("algorithm not allowed")
    expected = hmac.new(KEY, f"{h}.{p}".encode(), hashlib.sha256).digest()
    if not hmac.compare_digest(expected, b64d(s)):
        raise ValueError("bad signature")
    claims = json.loads(b64d(p))
    if "exp" not in claims or time.time() >= claims["exp"]:
        raise ValueError("expired or no exp")
    aud = claims.get("aud")
    if audience not in (aud if isinstance(aud, list) else [aud]):
        raise ValueError("wrong audience")
    return claims


now = int(time.time())
good = sign({"sub": "42", "aud": "orders-api", "exp": now + 900})
print("A JWT is three base64url parts:", [part[:12] + ".." for part in good.split(".")])
print("payload anyone can read:", json.loads(b64d(good.split(".")[1])))

unsigned = (b64e(json.dumps({"alg": "none"}).encode()) + "." +
            b64e(json.dumps({"sub": "1", "role": "admin", "aud": "orders-api", "exp": now + 900}).encode()) + ".")
attacks = {
    "valid token": good,
    "alg none": unsigned,
    "expired": sign({"sub": "42", "aud": "orders-api", "exp": now - 5}),
    "token for billing-api": sign({"sub": "42", "aud": "billing-api", "exp": now + 900}),
    "tampered payload": good.split(".")[0] + "." + b64e(json.dumps({"sub": "1", "aud": "orders-api", "exp": now + 900}).encode()) + "." + good.split(".")[2],
}
for name, tok in attacks.items():
    results = []
    for fn in (careless_verify, lambda t: careful_verify(t, "orders-api")):
        try:
            results.append("ACCEPT sub=" + str(fn(tok)["sub"]))
        except ValueError as e:
            results.append("reject (" + str(e) + ")")
    print(f"{name:22} careless: {results[0]:16} careful: {results[1]}")`
      }
    ],
    codeTitle: ['FastAPI + PyJWT password flow', 'Runnable: JWT by hand, careless vs careful'],
    viz: {
      title: 'Login, then a protected request: where each failure is caught',
      input: 'ok',
      inputLabel: 'Scenario: ok | wrong-password | no-header | expired | tampered | wrong-aud',
      gen: function (input) {
        var sc = String(input || 'ok').trim().toLowerCase();
        var allowed = ['ok', 'wrong-password', 'no-header', 'expired', 'tampered', 'wrong-aud'];
        if (allowed.indexOf(sc) < 0) throw new Error('Pick one of: ' + allowed.join(' | '));
        var nodes = [bx('c', 'Client app', 8, 30, 14), bx('t', 'POST /auth/token', 34, 10, 18), bx('db', 'users table + argon2', 64, 10, 20), bx('b', 'OAuth2PasswordBearer', 34, 50, 20), bx('d', 'jwt.decode (PyJWT)', 64, 50, 18), bx('r', 'GET /auth/me route', 90, 30, 16)];
        var edges = [['c', 't'], ['t', 'db'], ['c', 'b'], ['b', 'd'], ['d', 'r']];
        function g(hl, ehl) { return { type: 'graph', directed: true, height: 60, label: 'Password flow', nodes: nodes, edges: edges, hl: hl, ehl: ehl || {} }; }
        var f = [];
        f.push({ narr: 'The client posts a <b>form</b> (not JSON) to <code>/auth/token</code>: <code>username=asha@example.com&amp;password=…</code>. <code>OAuth2PasswordRequestForm</code> reads those fields.', parts: [g({ c: 'cur', t: 'cur' }, { 'c-t': 'cur' }), { type: 'vars', label: 'Form body', vals: { grant_type: 'password', username: 'asha@example.com', password: '(hidden)', scope: 'orders:read' } }] });
        if (sc === 'wrong-password') {
          f.push({ narr: 'The service loads the user and verifies the argon2id hash. The password is wrong, so verify returns False.', parts: [g({ db: 'bad' }, { 't-db': 'bad' }), { type: 'vars', label: 'verify_login', vals: { user_found: 'yes', verify: 'False' }, hl: { verify: 'bad' } }] });
          f.push({ narr: 'Answer <b>401</b> with <code>WWW-Authenticate: Bearer</code> and the generic text "Incorrect email or password". The same text, status and timing as an unknown email (dummy hash), so the reply leaks nothing.', parts: [g({ t: 'bad' }), { type: 'vars', label: 'Response', vals: { status: 401, detail: 'Incorrect email or password', 'WWW-Authenticate': 'Bearer' }, hl: { status: 'bad' } }] });
          f.push({ narr: 'Count this failure in the login rate limiter (Topic 6): per account and per IP. Ten fast failures for one account means someone is guessing.', parts: [g({}), { type: 'table', label: 'Login limiter', columns: ['key', 'failures in 15 min', 'limit'], rows: [['acct:asha@example.com', '1', '5'], ['ip:203.0.113.9', '1', '20']] }] });
          return f;
        }
        f.push({ narr: 'Password verified. The server signs a JWT with claims it chooses: <code>sub</code>, <code>iss</code>, <code>aud</code>, <code>iat</code>, <code>exp</code> 15 minutes ahead, <code>jti</code>. The signing key comes from settings, never from code.', parts: [g({ db: 'ok', t: 'ok' }, { 't-db': 'ok' }), { type: 'map', label: 'Claims signed with HS256', entries: [['sub', '"42"'], ['iss', 'https://api.example.com'], ['aud', 'orders-api'], ['iat', '12:00:00'], ['exp', '12:15:00'], ['jti', '9f1c…']] }] });
        f.push({ narr: 'Response: <code>{"access_token": "eyJ…", "token_type": "bearer", "expires_in": 900}</code>. The client keeps it in memory (or the mobile keychain) and sends it on each call.', parts: [g({ c: 'ok' }, { 'c-t': 'ok' }), { type: 'vars', label: 'Token response', vals: { access_token: 'eyJhbGciOi…', token_type: 'bearer', expires_in: 900 }, hl: { access_token: 'ok' } }] });
        if (sc === 'no-header') {
          f.push({ narr: 'Later the client calls <code>GET /auth/me</code> but forgets the <code>Authorization</code> header. <code>OAuth2PasswordBearer</code> stops the request before your code runs.', parts: [g({ b: 'bad' }, { 'c-b': 'bad' }), { type: 'vars', label: 'Response', vals: { status: 401, detail: 'Not authenticated', 'WWW-Authenticate': 'Bearer' }, hl: { status: 'bad' } }] });
          f.push({ narr: 'Your route and <code>get_current_user</code> never ran. That is why protected routes only need to <b>declare</b> the dependency.', parts: [g({ r: 'done', d: 'done' }), { type: 'text', html: 'Fix on the client: <code>Authorization: Bearer &lt;token&gt;</code>. In <code>/docs</code>, press <b>Authorize</b> and Swagger sends it for you.' }] });
          return f;
        }
        f.push({ narr: '<code>GET /auth/me</code> arrives with <code>Authorization: Bearer eyJ…</code>. <code>OAuth2PasswordBearer</code> strips the "Bearer " prefix and hands the raw token string to <code>get_current_user</code>.', parts: [g({ b: 'cur' }, { 'c-b': 'ok' }), { type: 'vars', label: 'Header', vals: { Authorization: 'Bearer eyJhbGciOi…' } }] });
        var checks = [['algorithm in ["HS256"]', 'yes'], ['signature matches key', sc === 'tampered' ? 'NO' : 'yes'], ['exp > now (−30 s leeway)', sc === 'expired' ? 'NO' : 'yes'], ['iss == settings.jwt_issuer', 'yes'], ['aud contains "orders-api"', sc === 'wrong-aud' ? 'NO' : 'yes']];
        var failAt = sc === 'tampered' ? 1 : sc === 'expired' ? 2 : sc === 'wrong-aud' ? 4 : -1;
        var shown = failAt < 0 ? checks : checks.slice(0, failAt + 1);
        var hl = {}; shown.forEach(function (_, i) { hl[i] = i === failAt ? 'bad' : 'ok'; });
        f.push({ narr: '<code>jwt.decode</code> runs its checks in order and stops at the first failure.' + (failAt < 0 ? ' Every check passes.' : ' This token fails: ' + checks[failAt][0] + '.'), parts: [g({ d: failAt < 0 ? 'ok' : 'bad' }, { 'b-d': failAt < 0 ? 'ok' : 'bad' }), { type: 'table', label: 'PyJWT checks', columns: ['check', 'passes?'], rows: shown, hl: hl }] });
        if (failAt >= 0) {
          var why = { 1: 'Someone edited the payload (for example <code>sub</code>) or signed with another key. Without the server key the signature cannot be rebuilt.', 2: 'Normal after 15 minutes. The client should use its refresh token (or log in again) and retry once.', 4: 'A valid token minted for a different API (say <code>billing-api</code>). Without the <code>aud</code> check, one leaked token would open every service sharing the key.' }[failAt];
          f.push({ narr: why + ' The dependency turns the PyJWT exception into <b>401</b> with <code>WWW-Authenticate: Bearer</code>.', parts: [g({ d: 'bad', r: 'done' }), { type: 'vars', label: 'Response', vals: { status: 401, detail: failAt === 2 ? 'Token expired' : 'Could not validate credentials' }, hl: { status: 'bad' } }] });
          return f;
        }
        f.push({ narr: 'Claims are trusted now. Load user 42 from the database and check <code>is_active</code> (a banned user\'s token is still cryptographically valid until it expires).', parts: [g({ d: 'ok', r: 'cur' }, { 'd-r': 'ok' }), { type: 'vars', label: 'get_current_user returns', vals: { id: 42, email: 'asha@example.com', is_active: 'True' }, hl: { id: 'ok' } }] });
        f.push({ narr: 'The route runs with a real <code>User</code> object and returns 200. The whole check cost one HMAC and one DB lookup; no session store was needed.', parts: [g({ c: 'ok', r: 'ok' }, { 'c-b': 'ok', 'b-d': 'ok', 'd-r': 'ok' }), { type: 'vars', label: 'Response', vals: { status: 200, body: '{"id":42,"email":"asha@example.com"}' }, hl: { status: 'ok' } }] });
        return f;
      }
    },
    examples: [
      {
        title: 'Driving the flow with curl (password from the environment, not the command line)',
        html: `<p>Note the <b>form</b> encoding on <code>/auth/token</code> and the Bearer header afterwards. Reading the password from an environment variable keeps it out of your shell history and screenshots.</p>`,
        code: { lang: 'bash', code: `# export DEMO_PASSWORD first (for example with: read -s DEMO_PASSWORD && export DEMO_PASSWORD)
TOKEN=$(curl -s -X POST http://127.0.0.1:8000/auth/token \\
  --data-urlencode "username=asha@example.com" \\
  --data-urlencode "password=$DEMO_PASSWORD" | python -c "import sys, json; print(json.load(sys.stdin)['access_token'])")

curl -i http://127.0.0.1:8000/auth/me -H "Authorization: Bearer $TOKEN"     # 200
curl -i http://127.0.0.1:8000/auth/me                                       # 401 Not authenticated` }
      },
      {
        title: 'Tokens issued by someone else: RS256 / EdDSA with JWKS',
        html: `<p>When Auth0, Keycloak, Cognito or your platform team issues tokens, you never get their private key. You fetch their <b>public</b> keys from the JWKS URL and pick the one whose <code>kid</code> matches the token header. Your service can verify but can never mint tokens. Always pin the algorithm list to what the issuer really uses.</p>`,
        code: { lang: 'python', code: `import jwt
from jwt import PyJWKClient

jwks_client = PyJWKClient("https://auth.example.com/.well-known/jwks.json", cache_keys=True)


def verify_external(token: str) -> dict:
    signing_key = jwks_client.get_signing_key_from_jwt(token)      # picks the key by kid
    return jwt.decode(token, signing_key.key, algorithms=["RS256"],
                      audience="orders-api", issuer="https://auth.example.com/")` }
      },
      {
        title: 'A refresh token in an HttpOnly cookie',
        html: `<p>Access tokens live 15 minutes. To avoid asking for the password every 15 minutes, also issue a long-lived, random <b>refresh token</b> (not a JWT: just <code>secrets.token_urlsafe(32)</code>, stored hashed in the DB) in a cookie the page's JavaScript cannot read. <code>POST /auth/refresh</code> checks it, rotates it, and returns a fresh access token. Rotation and reuse detection are covered in Backend 5.</p>`,
        code: { lang: 'python', code: `import hashlib
import secrets

from fastapi import Response


def set_refresh_cookie(response: Response, store) -> None:
    raw = secrets.token_urlsafe(32)                         # the value only the browser keeps
    store.save(hashlib.sha256(raw.encode()).hexdigest())    # random 256-bit value: a fast hash is fine here
    response.set_cookie("refresh_token", raw, httponly=True, secure=True,
                        samesite="strict", path="/auth/refresh", max_age=14 * 24 * 3600)` }
      },
      {
        title: 'Decoding is not verifying',
        html: `<p>Paste any JWT into a decoder and you see the claims without a key. That is fine for <b>debugging</b>, and dangerous in code: <code>jwt.decode(token, options={"verify_signature": False})</code> reads claims an attacker typed. The only safe use is reading a hint like <code>kid</code> or <code>iss</code> <i>before</i> the real verification, and PyJWT already offers <code>jwt.get_unverified_header(token)</code> for that. Grep your code base for <code>verify_signature</code> during reviews.</p>`
      }
    ],
    deepDive: `<p>🟣 <b>Why the algorithm list matters.</b> The JWT header says which algorithm signed it. If the verifier trusts that, an attacker can send <code>alg: none</code> (no signature), or, when the server holds an RSA public key, send <code>alg: HS256</code> and sign with the public key text as the HMAC secret. PyJWT's <code>algorithms=[...]</code> argument is required for exactly this reason; never build it from the token.</p>
      <p><b>HS256 vs asymmetric.</b> HS256 uses one shared secret: anyone who can verify can also mint. That is fine when the same service issues and checks tokens. Once several services verify, switch to RS256, ES256 or EdDSA: the issuer keeps the private key, everyone else gets public keys from JWKS, and keys rotate by <code>kid</code>. An HS256 key must be at least 32 random bytes (RFC 7518): generate it with <code>secrets.token_urlsafe(32)</code>, never type a word.</p>
      <p><b>Clock skew.</b> <code>leeway=30</code> tolerates small clock differences between machines for <code>exp</code>, <code>nbf</code> and <code>iat</code>. Large leeway quietly extends every token's life.</p>
      <p><b>Revocation.</b> A JWT is valid until it expires, even after logout or a password change. Options, cheapest first: short expiry plus revocable refresh tokens; a <code>token_version</code> column on the user that must match a claim (one DB read you already do when loading the user); a Redis deny-list of <code>jti</code> values with TTL = remaining lifetime.</p>
      <p><b>Where the browser keeps it.</b> In SPAs, access tokens in <code>localStorage</code> can be read by any XSS. Safer: keep access tokens in memory and the refresh token in an <code>HttpOnly; Secure; SameSite</code> cookie, or use the BFF pattern (the backend holds tokens, the browser holds a session cookie). Cookies bring CSRF back into scope (Backend 5).</p>`,
    aiEra: `<p>🤖 Generated FastAPI auth code is one of the most copied and most broken snippets on the internet. Common faults in assistant output: <code>python-jose</code> (barely maintained; prefer PyJWT or <code>joserfc</code>), a hard-coded <code>SECRET_KEY = "09d25e..."</code> copied from an old tutorial, <code>jwt.decode</code> without <code>audience</code>/<code>issuer</code>, <code>datetime.utcnow()</code> (deprecated since Python 3.12), an integer <code>sub</code> that PyJWT 2.10 now rejects, and different error messages for "no such user" and "wrong password". Use the assistant to draft the code and the tests, then review against a checklist: algorithm allow-list, aud/iss/exp required, secret from settings, generic 401, hashing off the loop. Ask it to write negative tests (expired, wrong audience, <code>alg: none</code>, tampered payload); those are the tests humans forget.</p>`,
    problems: [
      {
        title: 'Verify a JWT and Reject Expired or Wrong-Audience Tokens',
        level: 'Medium', tags: ['JWT', 'HMAC', 'verification'], companies: ['Okta', 'Stripe', 'Zerodha'],
        statement: `<p>Write <code>verify_jwt(token, secret, audience, now)</code> with only the standard library, so you understand exactly what <code>jwt.decode</code> does. Return <code>"ok:&lt;sub&gt;"</code> or the <b>first</b> failing check as <code>"error:&lt;reason&gt;"</code>, in this order:</p>
          <ol><li><code>malformed</code>: not exactly 3 dot-separated parts, or the header is not a base64url JSON object.</li>
          <li><code>bad_alg</code>: header <code>alg</code> is not exactly <code>"HS256"</code> (this blocks <code>none</code>).</li>
          <li><code>bad_signature</code>: HMAC-SHA256 of <code>header.payload</code> with <code>secret</code> does not match (constant-time compare), or the signature part does not decode.</li>
          <li><code>malformed</code>: the payload is not a JSON object.</li>
          <li><code>missing_exp</code>: no integer <code>exp</code> claim.</li>
          <li><code>expired</code>: <code>now &gt;= exp</code> (no leeway here).</li>
          <li><code>wrong_audience</code>: <code>aud</code> (a string or a list) does not contain <code>audience</code>; a missing <code>aud</code> also fails.</li></ol>
          <p>The test tokens were signed with the obvious test key <code>"unit-test-key-not-a-real-secret"</code> at <code>now = 1700000000</code>.</p>`,
        constraints: `Tokens up to 4 KB. Standard library only (base64, hashlib, hmac, json). base64url segments have no padding; add it back before decoding.`,
        example: `${H.table(['token', 'audience', 'result'], [['valid, aud "orders-api", exp now+300', 'orders-api', '<span class="c-g">ok:42</span>'], ['header <code>{"alg":"none"}</code>, empty signature', 'orders-api', '<span class="c-r">error:bad_alg</span>'], ['exp = now − 1', 'orders-api', '<span class="c-r">error:expired</span>'], ['aud "billing-api"', 'orders-api', '<span class="c-r">error:wrong_audience</span>'], ['payload edited after signing', 'orders-api', '<span class="c-r">error:bad_signature</span>']])}`,
        brute: {
          why: `<p>Decode the payload and trust it, or verify the signature but skip <code>exp</code> and <code>aud</code>. The first accepts anything an attacker types. The second accepts tokens that expired months ago and tokens issued for other services. Both "work" in every happy-path test.</p>`,
          code: { lang: 'python', code: `import base64
import json


def verify_jwt(token: str, secret: str, audience: str, now: int) -> str:
    payload = token.split(".")[1]
    claims = json.loads(base64.urlsafe_b64decode(payload + "=="))   # no signature check at all
    return "ok:" + str(claims.get("sub"))` }
        },
        mcq: { q: 'A token\'s header says <code>{"alg": "none"}</code> and the signature part is empty. With <code>jwt.decode(token, key, algorithms=["HS256"])</code> PyJWT will…', options: ['Reject it, because "none" is not in the allowed list', 'Accept it, because there is no signature to check', 'Accept it only if <code>exp</code> is in the future', 'Ask the client to resend'], answer: 0, explain: 'The server decides the allowed algorithms. Anything not in the list, including "none", raises InvalidAlgorithmError.' },
        hints: [
          `<p>Hint 1: <code>split(".")</code> must give 3 parts. Pad base64url with <code>"=" * (-len(s) % 4)</code> before <code>base64.urlsafe_b64decode</code>; wrap decoding and <code>json.loads</code> in try/except.</p>`,
          `<p>Hint 2: sign exactly the ASCII bytes <code>parts[0] + "." + parts[1]</code> with <code>hmac.new(secret.encode(), ..., hashlib.sha256)</code> and compare bytes with <code>hmac.compare_digest</code>. Check the signature <b>before</b> trusting anything in the payload.</p>`,
          `<p>Hint 3: <code>exp</code> must be an int but not a bool (<code>isinstance(True, int)</code> is True in Python). Normalise <code>aud</code>: a string becomes a one-item list, a list stays, anything else becomes empty.</p>`
        ],
        solution: {
          approach: `<p>Follow the order PyJWT uses: structure → algorithm allow-list → signature → claims. Never look at the claims until the signature is proven, because until then they are attacker-controlled text. Use <code>hmac.compare_digest</code> so the compare time does not reveal how many leading bytes matched. In the real FastAPI app you call <code>jwt.decode(token, key, algorithms=["HS256"], audience=..., options={"require": ["exp"]})</code>, which performs all these steps and raises <code>ExpiredSignatureError</code>, <code>InvalidAudienceError</code> and friends.</p>`,
          code: { lang: 'python', run: true, code: `import base64
import binascii
import hashlib
import hmac
import json


def _b64d(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def _json_obj(segment: str):
    try:
        value = json.loads(_b64d(segment))
    except (ValueError, binascii.Error):
        return None
    return value if isinstance(value, dict) else None


def verify_jwt(token: str, secret: str, audience: str, now: int) -> str:
    parts = token.split(".")
    if len(parts) != 3:
        return "error:malformed"
    header = _json_obj(parts[0])
    if header is None:
        return "error:malformed"
    if header.get("alg") != "HS256":
        return "error:bad_alg"
    expected = hmac.new(secret.encode(), (parts[0] + "." + parts[1]).encode(), hashlib.sha256).digest()
    try:
        given = _b64d(parts[2])
    except (ValueError, binascii.Error):
        return "error:bad_signature"
    if not hmac.compare_digest(expected, given):
        return "error:bad_signature"
    claims = _json_obj(parts[1])
    if claims is None:
        return "error:malformed"
    exp = claims.get("exp")
    if not isinstance(exp, int) or isinstance(exp, bool):
        return "error:missing_exp"
    if now >= exp:
        return "error:expired"
    aud = claims.get("aud")
    auds = [aud] if isinstance(aud, str) else aud if isinstance(aud, list) else []
    if audience not in auds:
        return "error:wrong_audience"
    return "ok:" + str(claims.get("sub", ""))


print(verify_jwt("abc.def", "k", "orders-api", 0))` },
          complexity: `<p>O(n) in the token length: one base64 decode per part, one HMAC over header.payload, one JSON parse. Constant extra memory beyond the decoded parts.</p>`,
          followUps: ['Add a 30-second leeway: which comparisons change?', 'Why must the signature be checked before reading <code>exp</code>?', 'How would you support several keys during rotation (see the Hard practice problem)?']
        },
        tests: { fn: 'verifyJwt', names: { python: 'verify_jwt' }, sig: 'string string string long -> string', cases: [
          [[TK.valid, KEY, 'orders-api', NOW], 'ok:42'],
          [[TK.valid_list, KEY, 'orders-api', NOW], 'ok:7'],
          [[TK.expired, KEY, 'orders-api', NOW], 'error:expired'],
          [[TK.exp_now, KEY, 'orders-api', NOW], 'error:expired'],
          [[TK.wrong_aud, KEY, 'orders-api', NOW], 'error:wrong_audience'],
          [[TK.alg_none, KEY, 'orders-api', NOW], 'error:bad_alg'],
          [[TK.tampered, KEY, 'orders-api', NOW], 'error:bad_signature'],
          [[TK.other_key, KEY, 'orders-api', NOW], 'error:bad_signature'],
          [[TK.no_exp, KEY, 'orders-api', NOW], 'error:missing_exp'],
          [['abc.def', KEY, 'orders-api', NOW], 'error:malformed'],
          [['!!!.e30.sig', KEY, 'orders-api', NOW], 'error:malformed'],
          [[TK.hs512, KEY, 'orders-api', NOW], 'error:bad_alg'],
          [[TK.no_aud, KEY, 'orders-api', NOW], 'error:wrong_audience'],
          [[TK.valid, KEY, 'orders-api', NOW + 300], 'error:expired'],
          [[TK.valid, KEY, 'orders-api', NOW + 299], 'ok:42']
        ] }
      }
    ]
  });

  /* =====================================================================
     TOPIC 3 — Scopes and roles
     ===================================================================== */
  topics.push({
    title: 'Scopes and Roles: Security(), SecurityScopes, Permission Dependencies and Ownership',
    analogy: `<p>A hotel gives you a <b>key card</b>. The card says which doors it opens: your room, the gym, maybe the lounge. Those are <b>scopes</b>, written on the card itself. Your <b>role</b> (guest, staff, manager) decides which doors the front desk is willing to put on your card. And even a card that opens "rooms on floor 3" must not open <i>someone else's</i> room on floor 3: that is the <b>ownership</b> check.</p>`,
    explain: `<p>🟢 <b>Three questions, three layers.</b></p>
      ${H.table(['Question', 'Mechanism', 'Fails with'], [
        ['Who are you?', 'Valid token (Topic 2)', '<b>401</b> Unauthorized + <code>WWW-Authenticate</code>'],
        ['May this <i>token</i> call this <i>kind</i> of endpoint?', '<b>Scopes</b> in the token, e.g. <code>orders:read</code>, <code>orders:refund</code>', '<b>403</b> Forbidden'],
        ['May this <i>user</i> do this <i>action</i>?', '<b>Roles → permissions</b> (RBAC), checked in a dependency', '<b>403</b> Forbidden'],
        ['May this user touch <i>this record</i>?', '<b>Ownership / tenant</b> check in the query', '<b>404</b> (do not reveal it exists) or 403']
      ])}
      <p><b>Scopes</b> describe what a <i>token</i> is allowed to do. They are chosen at login: the client asks for some (<code>scope=orders:read profile</code>), the server grants the ones the user's role allows, and writes them into the JWT as a space-separated <code>scope</code> claim. A read-only reporting script gets a token with <code>orders:read</code> only, so even if it leaks, it cannot refund anything.</p>
      <p><b>FastAPI's scope tools.</b> Declare scopes on the scheme: <code>OAuth2PasswordBearer(tokenUrl=..., scopes={"orders:read": "Read orders"})</code> (they show up in the docs' Authorize dialog). In routes use <code>Security(get_current_user, scopes=["orders:refund"])</code> instead of <code>Depends</code>. Inside <code>get_current_user</code>, a parameter typed <code>SecurityScopes</code> receives <b>every</b> scope required along the whole dependency chain, so you check them in one place.</p>
      <p><b>Roles</b> group permissions for humans: <code>customer</code>, <code>support</code>, <code>admin</code>. Keep the mapping in one table (code or DB) and check <b>permissions</b>, not role names, in routes: <code>require_permission("orders:refund")</code> survives the day you add a <code>finance</code> role; <code>if user.role == "admin"</code> scattered in 40 routes does not.</p>
      <p><b>Ownership</b> is where most real breaches happen (OWASP API1, Broken Object Level Authorization, covered in Backend 15). Put it in the query: <code>WHERE id = :id AND owner_id = :current_user</code>, so forgetting it is impossible rather than merely unlikely.</p>`,
    clues: [
      '"Some clients should only read, never write" → OAuth2 scopes in the token; <code>Security(..., scopes=[...])</code> on routes',
      '"Admins can do everything, support can refund up to a limit" → RBAC table of role → permissions, plus an attribute rule (ABAC) for the limit',
      '"User A can see user B\'s invoice by changing the id" → BOLA/IDOR: ownership filter inside the query, answer 404',
      '"Should a missing scope be 401 or 403?" → 403 (identity is known); include <code>WWW-Authenticate: Bearer error="insufficient_scope" scope="..."</code>',
      '"Where do you check permissions in FastAPI?" → dependencies (route or router level), never only in the frontend',
      '"A user was demoted but still has admin powers for 15 minutes" → roles baked into the JWT; re-check critical permissions against the DB or keep tokens short'
    ],
    code: [
      {
        lang: 'python', title: 'Scopes end to end: grant at login, require with Security(), check with SecurityScopes',
        code: `from typing import Annotated

import jwt
from fastapi import Depends, FastAPI, HTTPException, Security, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm, SecurityScopes

from app.config import Settings, get_settings
from app.passwords import verify_login
from app.tokens import create_access_token          # Topic 2, now with a "scope" claim
from app.users import User, find_user_by_email, get_user_by_id

ROLE_SCOPES: dict[str, set[str]] = {
    "customer": {"orders:read", "orders:write", "profile"},
    "support": {"orders:read", "orders:refund", "profile"},
    "admin": {"orders:read", "orders:write", "orders:refund", "users:admin", "profile"},
}

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="auth/token",
    scopes={"orders:read": "Read your orders", "orders:write": "Place orders",
            "orders:refund": "Refund orders", "users:admin": "Manage users", "profile": "Your profile"},
)
app = FastAPI()


@app.post("/auth/token")
def login(form: Annotated[OAuth2PasswordRequestForm, Depends()],
          settings: Annotated[Settings, Depends(get_settings)]) -> dict:
    user = find_user_by_email(form.username)
    ok, _ = verify_login(form.password, user.password_hash if user else None)
    if not ok or user is None:
        raise HTTPException(401, "Incorrect email or password", headers={"WWW-Authenticate": "Bearer"})
    allowed = ROLE_SCOPES.get(user.role, set())
    requested = set(form.scopes) or allowed           # no scope asked: give the role's default set
    granted = sorted(requested & allowed)             # NEVER grant what the role does not allow
    token = create_access_token(user.id, settings, scope=" ".join(granted))
    return {"access_token": token, "token_type": "bearer", "scope": " ".join(granted)}


def get_current_user(security_scopes: SecurityScopes,
                     token: Annotated[str, Depends(oauth2_scheme)],
                     settings: Annotated[Settings, Depends(get_settings)]) -> User:
    authenticate = (f'Bearer scope="{security_scopes.scope_str}"'
                    if security_scopes.scopes else "Bearer")
    try:
        claims = jwt.decode(token, settings.jwt_secret.get_secret_value(), algorithms=["HS256"],
                            audience=settings.jwt_audience, issuer=settings.jwt_issuer)
    except jwt.InvalidTokenError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Could not validate credentials",
                            headers={"WWW-Authenticate": authenticate})
    token_scopes = set(str(claims.get("scope", "")).split())
    missing = [s for s in security_scopes.scopes if s not in token_scopes]
    if missing:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not enough permissions",
                            headers={"WWW-Authenticate": f'Bearer error="insufficient_scope" scope="{security_scopes.scope_str}"'})
    user = get_user_by_id(int(claims["sub"]))
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Could not validate credentials",
                            headers={"WWW-Authenticate": authenticate})
    return user


@app.get("/orders")
def list_my_orders(user: Annotated[User, Security(get_current_user, scopes=["orders:read"])]) -> list:
    return []


@app.post("/orders/{order_id}/refund", status_code=202)
def refund(order_id: int,
           user: Annotated[User, Security(get_current_user, scopes=["orders:refund"])]) -> dict:
    return {"order_id": order_id, "refund": "queued", "by": user.id}`
      },
      {
        lang: 'python', title: 'Permission dependency factory, router-wide guards and an ownership-safe query',
        code: `from typing import Annotated, Callable

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_session
from app.models import Invoice, User

ROLE_PERMISSIONS: dict[str, frozenset[str]] = {
    "customer": frozenset({"invoice:read"}),
    "support": frozenset({"invoice:read", "invoice:read_any"}),
    "admin": frozenset({"invoice:read", "invoice:read_any", "invoice:void", "user:manage"}),
}


def require_permission(permission: str) -> Callable[..., User]:
    """Build a dependency that allows only users whose role grants 'permission'."""
    def checker(user: Annotated[User, Depends(get_current_user)]) -> User:
        if permission not in ROLE_PERMISSIONS.get(user.role, frozenset()):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Not enough permissions")
        return user
    return checker


# Every route in this router needs user:manage; individual routes cannot forget it.
admin_router = APIRouter(prefix="/admin", dependencies=[Depends(require_permission("user:manage"))])
router = APIRouter(prefix="/invoices")


@router.get("/{invoice_id}")
def get_invoice(invoice_id: int,
                user: Annotated[User, Depends(require_permission("invoice:read"))],
                db: Annotated[Session, Depends(get_session)]) -> dict:
    stmt = select(Invoice).where(Invoice.id == invoice_id)
    if "invoice:read_any" not in ROLE_PERMISSIONS[user.role]:
        stmt = stmt.where(Invoice.owner_id == user.id)     # ownership lives IN the query
    invoice = db.scalars(stmt).first()
    if invoice is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Invoice not found")   # same for "not yours"
    return {"id": invoice.id, "total_cents": invoice.total_cents}`
      },
      {
        lang: 'python', run: true, title: 'Runnable: the decision engine behind those dependencies (stdlib only)',
        code: `ROLE_SCOPES = {
    "customer": {"orders:read", "orders:write"},
    "support": {"orders:read", "orders:refund"},
    "admin": {"orders:read", "orders:write", "orders:refund", "users:admin"},
}


def grant(role: str, requested: set[str]) -> set[str]:
    """Scopes written into the token: what was asked AND what the role allows."""
    allowed = ROLE_SCOPES.get(role, set())
    return (requested or allowed) & allowed


def decide(token_ok: bool, token_scopes: set[str], needed: list[str],
           owner_id: int | None, user_id: int, can_read_any: bool) -> int:
    if not token_ok:
        return 401                                   # who are you?
    if any(s not in token_scopes for s in needed):
        return 403                                   # known, but this token may not
    if owner_id is None:
        return 404                                   # no such record
    if owner_id != user_id and not can_read_any:
        return 404                                   # not yours: do not reveal it exists
    return 200


print("customer asks for refund too ->", sorted(grant("customer", {"orders:read", "orders:refund"})))
print("support default scopes       ->", sorted(grant("support", set())))
cases = [
    ("no token", (False, set(), ["orders:read"], 7, 7, False)),
    ("read own order", (True, {"orders:read"}, ["orders:read"], 7, 7, False)),
    ("read someone else's", (True, {"orders:read"}, ["orders:read"], 9, 7, False)),
    ("support reads any", (True, {"orders:read"}, ["orders:read"], 9, 7, True)),
    ("refund with read-only token", (True, {"orders:read"}, ["orders:refund"], 7, 7, False)),
    ("order does not exist", (True, {"orders:read"}, ["orders:read"], None, 7, False)),
]
for name, args in cases:
    print(f"{name:28} -> {decide(*args)}")`
      }
    ],
    codeTitle: ['Scopes with Security()', 'Roles, router guards, ownership', 'Runnable decision engine'],
    viz: {
      title: 'One request through the authorization layers',
      input: 'token=valid scopes=orders:read need=orders:read owner=9 caller=7 role=customer',
      inputLabel: 'token=valid|invalid|none scopes=a,b need=x owner=id|none caller=id role=customer|support|admin',
      gen: function (input) {
        var o = kvParse(input, 'token=valid scopes=orders:read need=orders:read owner=9 caller=7 role=customer');
        var token = o.token || 'valid';
        if (['valid', 'invalid', 'none'].indexOf(token) < 0) throw new Error('token must be valid, invalid or none');
        var scopes = (o.scopes || '').split(',').filter(Boolean).slice(0, 6);
        var need = (o.need || 'orders:read').split(',').filter(Boolean).slice(0, 4);
        var owner = o.owner === undefined ? '9' : o.owner, caller = o.caller || '7', role = o.role || 'customer';
        var readAny = role === 'support' || role === 'admin';
        var rows = [], f = [];
        function tbl(hl) { return { type: 'table', label: 'Checks so far', columns: ['layer', 'question', 'result'], rows: rows.slice(), hl: hl }; }
        f.push({ narr: 'The request reaches the route. FastAPI resolves <code>Security(get_current_user, scopes=[' + need.map(function (s) { return '"' + hesc(s) + '"'; }).join(', ') + '])</code> before your function body runs.', parts: [{ type: 'vars', label: 'Request', vals: { token: token, 'token scopes': scopes.join(' ') || '(none)', 'route needs': need.join(' '), role: role, caller: caller, 'record owner': owner } }] });
        if (token !== 'valid') {
          rows.push(['authentication', 'is the token present and valid?', token === 'none' ? 'no header' : 'decode failed']);
          f.push({ narr: 'Layer 1 fails: ' + (token === 'none' ? '<code>OAuth2PasswordBearer</code> found no Authorization header.' : '<code>jwt.decode</code> raised (bad signature, expired, wrong audience…).') + ' We do not know who this is.', parts: [tbl({ 0: 'bad' })] });
          f.push({ narr: 'Answer <b>401</b> with <code>WWW-Authenticate: Bearer</code>. Do not check scopes or load data for an unknown caller.', parts: [{ type: 'vars', label: 'Response', vals: { status: 401, 'WWW-Authenticate': 'Bearer' }, hl: { status: 'bad' } }] });
          f.push({ narr: 'Fix: log in again or refresh the token. Clients typically retry once after refreshing on 401, but never on 403.', parts: [tbl({ 0: 'bad' })] });
          return f;
        }
        rows.push(['authentication', 'valid token?', 'yes (sub=' + hesc(caller) + ')']);
        f.push({ narr: 'Layer 1 passes: the signature, expiry, issuer and audience are fine. We know the caller is user ' + hesc(caller) + '.', parts: [tbl({ 0: 'ok' })] });
        var missing = need.filter(function (s) { return scopes.indexOf(s) < 0; });
        rows.push(['scopes', 'token has ' + need.join(' + ') + '?', missing.length ? 'missing ' + missing.join(', ') : 'yes']);
        if (missing.length) {
          f.push({ narr: 'Layer 2 fails: <code>SecurityScopes.scopes</code> lists <code>' + hesc(need.join(' ')) + '</code> but the token only carries <code>' + hesc(scopes.join(' ') || '(none)') + '</code>. Identity is known, so this is <b>403</b>, not 401.', parts: [tbl({ 1: 'bad' })] });
          f.push({ narr: 'Answer 403 and tell the client which scope it lacks, so a well-behaved client can ask the user to grant it.', parts: [{ type: 'vars', label: 'Response', vals: { status: 403, 'WWW-Authenticate': 'Bearer error="insufficient_scope" scope="' + need.join(' ') + '"' }, hl: { status: 'bad' } }] });
          return f;
        }
        f.push({ narr: 'Layer 2 passes: every scope the route requires is in the token.', parts: [tbl({ 1: 'ok' })] });
        if (owner === 'none') {
          rows.push(['ownership', 'record exists for this caller?', 'no row']);
          f.push({ narr: 'The query returns no row: the record does not exist. Answer <b>404</b>.', parts: [tbl({ 2: 'bad' }), { type: 'vars', label: 'Response', vals: { status: 404 }, hl: { status: 'bad' } }] });
          return f;
        }
        var mine = owner === caller;
        rows.push(['ownership', 'owner_id = caller OR role may read any?', mine ? 'owner matches' : readAny ? role + ' may read any' : 'NO (owner ' + hesc(owner) + ')']);
        if (!mine && !readAny) {
          f.push({ narr: 'Layer 3: the query <code>WHERE id = :id AND owner_id = ' + hesc(caller) + '</code> finds nothing, because the record belongs to user ' + hesc(owner) + '. This is the BOLA/IDOR check.', parts: [tbl({ 2: 'bad' }), pyc('Query', 'stmt = select(Order).where(Order.id == order_id)\nif not can_read_any:\n    stmt = stmt.where(Order.owner_id == user.id)\norder = db.scalars(stmt).first()   # None', { 3: 'bad' })] });
          f.push({ narr: 'Answer <b>404 Not Found</b>, identical to a record that does not exist. A 403 here would confirm to an attacker that id exists, letting them map your data.', parts: [{ type: 'vars', label: 'Response', vals: { status: 404, detail: 'Order not found' }, hl: { status: 'bad' } }] });
          return f;
        }
        f.push({ narr: 'Layer 3 passes: ' + (mine ? 'the caller owns the record.' : 'the <b>' + hesc(role) + '</b> role has a "read any" permission, so the ownership filter is not added. Log this access: staff reading customer data belongs in the audit log.'), parts: [tbl({ 2: 'ok' })] });
        f.push({ narr: 'All layers passed. The route body runs and returns <b>200</b>.', parts: [tbl({ 0: 'ok', 1: 'ok', 2: 'ok' }), { type: 'vars', label: 'Response', vals: { status: 200 }, hl: { status: 'ok' } }] });
        return f;
      }
    },
    examples: [
      {
        title: 'Read-only token for a reporting script',
        html: `<p>The finance team's nightly script logs in with <code>scope=orders:read</code>. Its token can list orders but every call to <code>/orders/{id}/refund</code> gets 403, even though the service account belongs to an admin. If the script's token leaks from a CI log, the damage is "someone can read orders for 15 minutes", not "someone can refund everything". Least privilege per token, not just per user.</p>
        ${H.table(['Token scope', 'GET /orders', 'POST /orders/9/refund'], [['orders:read', '<span class="c-g">200</span>', '<span class="c-r">403</span>'], ['orders:read orders:refund', '<span class="c-g">200</span>', '<span class="c-g">202</span>']])}`
      },
      {
        title: 'Router-level guard so no admin route forgets the check',
        html: `<p>Ten admin endpoints, each with <code>Depends(require_permission("user:manage"))</code>, means one day someone adds the eleventh without it. Put the dependency on the router: <code>APIRouter(prefix="/admin", dependencies=[Depends(require_permission("user:manage"))])</code>. Then write one test that walks <code>app.routes</code> and fails if any <code>/admin</code> route is reachable by a customer token.</p>`,
        code: { lang: 'python', code: `from fastapi.routing import APIRoute


def admin_routes(app) -> list[str]:
    # Used in a test: call each one with a customer token and expect 403.
    return [r.path for r in app.routes if isinstance(r, APIRoute) and r.path.startswith("/admin")]` }
      },
      {
        title: 'Role plus an attribute: support can refund up to 100.00',
        html: `<p>RBAC answers "may support refund?" (yes). The amount limit is an <b>attribute</b> rule (ABAC). Keep it in the service, next to the data, and test it like business logic: support refunding 99.99 → OK, 100.01 → 403 with a clear reason, admin refunding 5,000 → OK and audited.</p>`,
        code: { lang: 'python', run: true, code: `LIMITS_CENTS = {"support": 10_000, "admin": None}      # None = no limit


def may_refund(role: str, amount_cents: int) -> bool:
    if role not in LIMITS_CENTS:
        return False
    limit = LIMITS_CENTS[role]
    return limit is None or amount_cents <= limit


print(may_refund("support", 9_999), may_refund("support", 10_001), may_refund("admin", 500_000), may_refund("customer", 1))` }
      },
      {
        title: 'When roles in the JWT go stale',
        html: `<p>Asha is demoted from admin at 12:00. Her token says <code>scope=... users:admin</code> until 12:15. For most endpoints that window is acceptable. For dangerous ones (delete users, change payouts) re-check the permission against the database in the dependency, or bump a <code>token_version</code> column on demotion so <code>get_current_user</code> rejects her old tokens immediately.</p>`
      }
    ],
    deepDive: `<p>🟣 <b>How <code>Security</code> differs from <code>Depends</code>.</b> <code>Security(dep, scopes=[...])</code> is <code>Depends</code> plus a list of scopes. FastAPI collects the scopes from every <code>Security</code> in the chain (route → sub-dependency → <code>get_current_user</code>) and injects the union into the <code>SecurityScopes</code> parameter. It also records them in OpenAPI, so the docs show which scopes each operation needs. Because scopes differ per route, FastAPI caches the dependency result per scope set within a request.</p>
      <p><b>Scope naming.</b> Use <code>resource:action</code> (<code>orders:read</code>) and keep the list short and stable; scopes are a public contract with clients. Do not encode record ids in scopes. Fine-grained "which record" decisions belong to ownership and relationship checks (ReBAC tools such as OpenFGA or SpiceDB for complex sharing, Backend 5).</p>
      <p><b>Where to enforce.</b> Coarse checks in dependencies (cheap, before any DB work). Ownership in the query (so list endpoints filter instead of post-filtering, which breaks pagination and leaks counts). Business limits in services. Never trust a hidden button in the frontend: OWASP API5 (Broken Function Level Authorization) is exactly "the admin endpoint existed and nobody checked the role".</p>
      <p><b>Multi-tenant APIs.</b> Put <code>tenant_id</code> in the token, resolve it in a dependency, and add it to every query through one repository helper (and, for defence in depth, PostgreSQL Row Level Security). A cross-tenant leak is usually a missing WHERE, not broken crypto.</p>
      <p><b>Testing.</b> Build a matrix test: every route × every role × own/other record, with the expected status. It is mechanical, catches regressions, and reviewers can read it as documentation.</p>`,
    aiEra: `<p>🤖 Assistants happily generate <code>if current_user.role != "admin": raise HTTPException(403)</code> inside each route. It works, and it rots: new roles, new routes and copy-paste errors. Ask instead for a permission table plus a <code>require_permission</code> factory, router-level guards, and the role × route matrix test. AI is also useful for reviewing: "list every route in this FastAPI app and the permission it requires; flag routes with path ids that do not filter by owner". Treat the answer as a lead, not a proof, and confirm with the matrix test. For AI agents that call your API, give them their own narrowly scoped tokens (for example <code>orders:read</code> only), never a human admin's token, so a prompt-injected agent cannot do more than its scopes allow.</p>`,
    problems: [
      {
        title: '401, 403 or 404? Decide the Status for a Protected Request',
        level: 'Easy', tags: ['authorization', 'scopes', 'status codes', 'BOLA'], companies: ['Microsoft', 'Freshworks'],
        statement: `<p>Write <code>access_status(auth, granted, required, owner, caller)</code> that returns the HTTP status for a request to a record endpoint:</p>
          <ol><li><code>auth</code> is <code>"none"</code> or <code>"invalid"</code> → <b>401</b>.</li>
          <li>Any scope in <code>required</code> is not covered by <code>granted</code> → <b>403</b>. A granted scope covers a required one if they are equal, or the granted scope is <code>"&lt;resource&gt;:*"</code> and the required one starts with <code>"&lt;resource&gt;:"</code>.</li>
          <li><code>owner</code> is <code>""</code> (record does not exist) → <b>404</b>.</li>
          <li><code>owner != caller</code> and <code>"admin"</code> is not in <code>granted</code> → <b>404</b> (hide that the record exists).</li>
          <li>Otherwise <b>200</b>.</li></ol>`,
        constraints: `auth ∈ {"none", "invalid", "valid"}. Up to 20 scopes each. Ids are non-empty strings except owner may be "".`,
        example: `${H.table(['auth', 'granted', 'required', 'owner', 'caller', 'status'], [['valid', '[orders:read]', '[orders:read]', '7', '7', '<span class="c-g">200</span>'], ['valid', '[orders:read]', '[orders:refund]', '7', '7', '<span class="c-r">403</span>'], ['valid', '[orders:*]', '[orders:refund]', '7', '7', '<span class="c-g">200</span>'], ['valid', '[orders:read]', '[orders:read]', '9', '7', '<span class="c-r">404</span>'], ['none', '[]', '[orders:read]', '7', '7', '<span class="c-r">401</span>']])}`,
        brute: {
          why: `<p>One generic <code>403</code> for everything, or checking ownership by loading the record first and returning 403 "not yours". The first breaks clients (they cannot tell "log in again" from "you may not"). The second tells attackers which ids exist.</p>`,
          code: { lang: 'python', code: `def access_status(auth, granted, required, owner, caller):
    if auth != "valid" or not set(required) <= set(granted) or owner != caller:
        return 403        # clients cannot tell 'refresh your token' from 'never allowed'
    return 200` }
        },
        mcq: { q: 'A valid token without the <code>orders:refund</code> scope calls the refund endpoint. Best response?', options: ['403 with <code>WWW-Authenticate: Bearer error="insufficient_scope"</code>', '401 so the client logs in again', '404', '500'], answer: 0, explain: 'The caller is authenticated, so 401 is wrong. 403 plus the insufficient_scope hint (RFC 6750) tells the client exactly what is missing.' },
        hints: [
          `<p>Hint 1: the order of checks is the whole problem: identity, then scopes, then the record. Return as soon as one fails.</p>`,
          `<p>Hint 2: write a small <code>covers(g, r)</code>: <code>g == r or (g.endswith(":*") and r.startswith(g[:-1]))</code>. Note <code>g[:-1]</code> keeps the colon, so <code>orders:*</code> does not cover <code>ordersx:read</code>.</p>`,
          `<p>Hint 3: a required scope is satisfied if <code>any(covers(g, r) for g in granted)</code>; all required scopes must be satisfied. Empty <code>required</code> means no scope check.</p>`
        ],
        solution: {
          approach: `<p>Check from outside in: authentication (401) → token permissions (403) → record existence and ownership (404). Wildcards are handled by a tiny <code>covers</code> helper. In FastAPI the first two checks live in <code>get_current_user</code> with <code>SecurityScopes</code>; the last two live in the query, which returns no row either way.</p>`,
          code: { lang: 'python', run: true, code: `def covers(granted_scope: str, required_scope: str) -> bool:
    if granted_scope == required_scope:
        return True
    return granted_scope.endswith(":*") and required_scope.startswith(granted_scope[:-1])


def access_status(auth: str, granted: list[str], required: list[str], owner: str, caller: str) -> int:
    if auth != "valid":
        return 401
    for need in required:
        if not any(covers(g, need) for g in granted):
            return 403
    if owner == "":
        return 404
    if owner != caller and "admin" not in granted:
        return 404
    return 200


print(access_status("valid", ["orders:*"], ["orders:refund"], "7", "7"))
print(access_status("valid", ["orders:read"], ["orders:read"], "9", "7"))` },
          complexity: `<p>O(|required| × |granted|) string comparisons, at most 400 here. Use a set for exact matches if scopes grow.</p>`,
          followUps: ['Should an admin reading another user\'s record be audited? How?', 'How does this change for list endpoints?']
        },
        tests: { fn: 'accessStatus', names: { python: 'access_status' }, sig: 'string string[] string[] string string -> int', cases: [
          [['valid', ['orders:read'], ['orders:read'], '7', '7'], 200],
          [['valid', ['orders:read'], ['orders:refund'], '7', '7'], 403],
          [['valid', ['orders:*'], ['orders:refund'], '7', '7'], 200],
          [['valid', ['orders:*'], ['ordersx:read'], '7', '7'], 403],
          [['valid', ['orders:read'], ['orders:read'], '9', '7'], 404],
          [['valid', ['orders:read', 'admin'], ['orders:read'], '9', '7'], 200],
          [['none', [], ['orders:read'], '7', '7'], 401],
          [['invalid', ['orders:read'], ['orders:read'], '7', '7'], 401],
          [['valid', ['orders:read'], ['orders:read'], '', '7'], 404],
          [['valid', [], [], '7', '7'], 200],
          [['valid', ['orders:read'], ['orders:read', 'profile'], '7', '7'], 403],
          [['valid', ['orders:read'], ['orders:refund'], '', '7'], 403]
        ] }
      }
    ]
  });

  /* =====================================================================
     TOPIC 4 — CORS
     ===================================================================== */
  topics.push({
    title: 'CORS in FastAPI: Origins, Preflight, Credentials and the Wildcard Trap',
    analogy: `<p>Your browser is a strict <b>school receptionist</b>. A page from <code>app.example.com</code> asks her to fetch something from <code>api.example.com</code>, a different building. Before handing over the answer, she phones the API building: "A page from app.example.com wants to read your reply, with the student's ID card. OK?" If the API says "yes, app.example.com is on my list", she passes the reply on. The phone call is the <b>preflight</b>. Note: she is the only one who checks. Someone walking straight into the API building (curl, a server, a script) never meets her.</p>`,
    explain: `<p>🟢 <b>Origin</b> = scheme + host + port. <code>https://app.example.com</code> and <code>https://api.example.com</code> are different origins; so are <code>http://localhost:3000</code> and <code>http://localhost:8000</code>. By default (the <b>same-origin policy</b>) a page's JavaScript may <i>send</i> requests to other origins in limited ways but may not <i>read</i> the responses. <b>CORS</b> (Cross-Origin Resource Sharing) is how a server tells the browser "you may let these origins read my responses".</p>
      <p><b>Simple vs preflighted requests.</b> A GET, or a POST with a form-like content type and no custom headers, is sent directly with an <code>Origin</code> header. Anything else, such as <code>Content-Type: application/json</code>, an <code>Authorization</code> header, or PUT/PATCH/DELETE, first triggers an <code>OPTIONS</code> <b>preflight</b> carrying <code>Access-Control-Request-Method</code> and <code>Access-Control-Request-Headers</code>. Only if the server's answer allows it does the browser send the real request.</p>
      <p><b>FastAPI setup</b> uses Starlette's <code>CORSMiddleware</code>:</p>
      ${H.table(['Option', 'Default', 'Set it to'], [
        ['<code>allow_origins</code>', '<code>[]</code>', 'An explicit list from settings: <code>["https://app.example.com"]</code>. Exact strings, no trailing slash.'],
        ['<code>allow_origin_regex</code>', 'None', 'Only if needed (preview deploys); escape dots and anchor it.'],
        ['<code>allow_methods</code>', '<code>["GET"]</code>', 'The methods your API really uses.'],
        ['<code>allow_headers</code>', '<code>[]</code>', '<code>["Authorization", "Content-Type"]</code> plus any custom ones.'],
        ['<code>allow_credentials</code>', '<code>False</code>', '<code>True</code> only if the browser must send cookies (or client certs) cross-origin.'],
        ['<code>expose_headers</code>', '<code>[]</code>', 'Response headers the page’s JS may read, e.g. <code>X-Request-ID</code>, <code>Retry-After</code>.'],
        ['<code>max_age</code>', '600', 'Seconds the browser may cache a preflight answer.']
      ])}
      <p><b>The trap.</b> <code>allow_origins=["*"]</code> with <code>allow_credentials=True</code>. Browsers refuse <code>Access-Control-Allow-Origin: *</code> together with credentials, so Starlette "helps" by echoing back whatever <code>Origin</code> arrived. The result: <b>every website on the internet</b> can make cookie-carrying requests to your API and read the answers. Use an explicit list.</p>
      <p><b>CORS is not security for your API.</b> It protects <i>users' browsers</i> from pages reading data they should not. It does not stop curl, bots, or other servers, and it does not stop a simple cross-site form POST from <i>reaching</i> your server (that is CSRF; handle it with SameSite cookies or CSRF tokens). Authentication and authorization still happen on every request.</p>`,
    clues: [
      '"The frontend gets a CORS error but curl works" → CORS is enforced by browsers only; add the frontend origin to <code>allow_origins</code>',
      '"Our API uses cookies and the frontend is on another subdomain" → explicit origins + <code>allow_credentials=True</code>, cookies with <code>SameSite</code>/<code>Secure</code>, CSRF protection',
      '"Someone set <code>allow_origins=["*"]</code> and <code>allow_credentials=True</code>" → every site can read authenticated responses; replace with an allow-list',
      '"Why do I see an OPTIONS request before my PUT?" → preflight, triggered by the method, JSON content type or Authorization header',
      '"The page cannot read the <code>X-Total-Count</code> header" → <code>expose_headers</code>',
      '"Our CORS error appears only when the server crashes" → the 500 response lacks CORS headers, so the browser hides the real error; read the server logs'
    ],
    code: [
      {
        lang: 'python', title: 'CORSMiddleware configured from settings (never a wildcard with credentials)',
        code: `from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings

settings = get_settings()          # cors_origins: list[str] read from the environment (Topic 5)
app = FastAPI()

if "*" in settings.cors_origins and settings.cors_allow_credentials:
    # Fail at startup instead of shipping "every website may read logged-in responses".
    raise RuntimeError("CORS: '*' cannot be combined with allow_credentials=True")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,             # e.g. ["https://app.example.com"]
    allow_credentials=settings.cors_allow_credentials,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
    expose_headers=["X-Request-ID", "Retry-After"],
    max_age=600,
)

# Preview deployments like https://pr-123.app.example.com, matched safely:
#   allow_origin_regex=r"https://pr-[0-9]+[.]app[.]example[.]com"
# Starlette uses fullmatch, but an unescaped "." still matches ANY character.`
      },
      {
        lang: 'python', run: true, title: 'Runnable: how the server decides a preflight (and why the wildcard is dangerous)',
        code: `SAFELISTED = {"accept", "accept-language", "content-language", "content-type"}


def preflight(origin, method, req_headers, allow_origins, allow_methods, allow_headers, credentials):
    """Return the response headers for an OPTIONS preflight, or a rejection reason."""
    wildcard = "*" in allow_origins
    if origin != "null" and (origin in allow_origins or wildcard):
        pass
    else:
        return {"status": 400, "reason": "origin not allowed"}
    if method.upper() not in {m.upper() for m in allow_methods}:
        return {"status": 400, "reason": "method not allowed"}
    allowed_h = {h.lower() for h in allow_headers} | SAFELISTED
    if any(h.lower() not in allowed_h for h in req_headers):
        return {"status": 400, "reason": "headers not allowed"}
    headers = {"Access-Control-Allow-Methods": ", ".join(allow_methods),
               "Access-Control-Allow-Headers": ", ".join(req_headers), "Access-Control-Max-Age": "600"}
    if wildcard and not credentials:
        headers["Access-Control-Allow-Origin"] = "*"
    else:
        headers["Access-Control-Allow-Origin"] = origin      # echo + Vary so caches do not mix origins
        headers["Vary"] = "Origin"
    if credentials:
        headers["Access-Control-Allow-Credentials"] = "true"
    return {"status": 200, **headers}


good = (["https://app.example.com"], ["GET", "POST"], ["Authorization", "Content-Type"], True)
print("our app      :", preflight("https://app.example.com", "POST", ["authorization"], *good))
print("evil site    :", preflight("https://evil.example.net", "POST", ["authorization"], *good))
print("wrong method :", preflight("https://app.example.com", "DELETE", [], *good))

bad = (["*"], ["GET", "POST"], ["Authorization"], True)
print("WILDCARD+CREDS lets evil in:", preflight("https://evil.example.net", "POST", ["authorization"], *bad))`
      }
    ],
    codeTitle: ['CORSMiddleware from settings', 'Runnable preflight decision'],
    viz: {
      title: 'A cross-origin PUT with a token: preflight, then the real request',
      input: 'origin=https://app.example.com method=PUT headers=authorization,content-type',
      inputLabel: 'origin=… method=GET|POST|PUT|DELETE headers=a,b (server allows https://app.example.com; GET POST PUT; authorization, content-type)',
      gen: function (input) {
        var o = kvParse(input, 'origin=https://app.example.com method=PUT headers=authorization');
        var origin = (o.origin || 'https://app.example.com').slice(0, 60), method = (o.method || 'PUT').toUpperCase();
        var hdrs = (o.headers || '').toLowerCase().split(',').filter(Boolean).slice(0, 5);
        var allowO = ['https://app.example.com'], allowM = ['GET', 'POST', 'PUT'], allowH = ['authorization', 'content-type'];
        var safelist = ['accept', 'accept-language', 'content-language', 'content-type'];
        var nodes = [bx('p', 'Page on ' + origin.replace(/^https?:\/\//, '').slice(0, 22), 12, 30, 24), bx('b', 'Browser CORS check', 45, 30, 18), bx('m', 'CORSMiddleware', 72, 15, 16), bx('r', 'FastAPI route', 90, 45, 14)];
        var edges = [['p', 'b'], ['b', 'm'], ['m', 'r']];
        function g(hl, ehl) { return { type: 'graph', directed: true, height: 60, label: 'Who talks to whom', nodes: nodes, edges: edges, hl: hl, ehl: ehl || {} }; }
        var f = [];
        var same = origin === 'https://api.example.com';
        f.push({ narr: 'JavaScript on <code>' + hesc(origin) + '</code> calls <code>fetch("https://api.example.com/items/7", {method: "' + method + '"' + (hdrs.length ? ', headers: {' + hdrs.join(', ') + '}' : '') + '})</code>. The browser compares origins: ' + (same ? 'same origin, so CORS does not apply.' : 'different origin, so CORS rules apply.'), parts: [g({ p: 'cur', b: 'cur' }, { 'p-b': 'cur' }), { type: 'vars', label: 'Origins', vals: { page: origin, api: 'https://api.example.com', 'same origin?': same ? 'yes' : 'no' }, hl: { 'same origin?': same ? 'ok' : 'cur' } }] });
        if (same) {
          f.push({ narr: 'Same origin: the request goes straight out and the page may read the reply. No preflight, no CORS headers needed.', parts: [g({ b: 'ok', m: 'ok' }, { 'b-m': 'ok' }), { type: 'text', html: 'Try a different origin, e.g. <code>origin=https://evil.example.net</code>.' }] });
          f.push({ narr: 'Your normal authentication still runs on the server for every request.', parts: [g({ r: 'ok' }, { 'm-r': 'ok' }), { type: 'vars', label: 'Response', vals: { status: 200 }, hl: { status: 'ok' } }] });
          f.push({ narr: 'Summary: CORS only matters across origins, and only inside browsers.', parts: [g({})] });
          return f;
        }
        var simple = (method === 'GET' || method === 'POST') && hdrs.every(function (h) { return safelist.indexOf(h) >= 0 && h !== 'content-type'; });
        f.push({ narr: simple ? 'This is a <b>simple</b> request (GET/POST, no special headers): the browser sends it directly with an <code>Origin</code> header, then decides whether the page may <i>read</i> the answer.' : 'This needs a <b>preflight</b>: ' + (['GET', 'POST'].indexOf(method) < 0 ? 'the method ' + method + ' is not simple' : 'the headers ' + hdrs.join(', ') + ' are not all safelisted') + '. The browser first sends <code>OPTIONS</code>.', parts: [g({ b: 'cur', m: 'cur' }, { 'b-m': 'cur' }), { type: 'map', label: simple ? 'Request headers' : 'Preflight request', entries: simple ? [['Origin', origin]] : [['method', 'OPTIONS'], ['Origin', origin], ['Access-Control-Request-Method', method], ['Access-Control-Request-Headers', hdrs.join(', ') || '(none)']] }] });
        var okO = allowO.indexOf(origin) >= 0, okM = allowM.indexOf(method) >= 0;
        var badH = hdrs.filter(function (h) { return allowH.indexOf(h) < 0 && safelist.indexOf(h) < 0; });
        var rows = [['origin in allow_origins', okO ? 'yes' : 'NO'], ['method in allow_methods', okM ? 'yes' : 'NO'], ['headers in allow_headers', badH.length ? 'NO: ' + badH.join(', ') : 'yes']];
        var hl = { 0: okO ? 'ok' : 'bad', 1: okM ? 'ok' : 'bad', 2: badH.length ? 'bad' : 'ok' };
        var pass = okO && (simple || (okM && !badH.length));
        f.push({ narr: '<code>CORSMiddleware</code> checks the request against its configuration.' + (pass ? ' Everything is allowed.' : ' Something is not allowed.'), parts: [g({ m: pass ? 'ok' : 'bad' }, { 'b-m': pass ? 'ok' : 'bad' }), { type: 'table', label: 'Server config check', columns: ['check', 'result'], rows: simple ? rows.slice(0, 1) : rows, hl: hl }] });
        if (!pass) {
          f.push({ narr: simple ? 'The server still runs the route (simple requests are not blocked in advance!) but answers without <code>Access-Control-Allow-Origin</code> for this origin. The browser hides the reply from the page.' : 'Starlette answers the preflight with <b>400</b> and no allow headers. The browser never sends the real ' + method + '; the console shows a CORS error.', parts: [g({ b: 'bad' }), { type: 'vars', label: 'Outcome', vals: { 'page can read reply?': 'no', 'request reached route?': simple ? 'YES (side effects happen!)' : 'no' }, hl: { 'page can read reply?': 'bad' } }] });
          f.push({ narr: 'Lesson: CORS stops <i>reading</i>, not <i>sending</i>. A simple POST with a cookie still reaches the server, which is why cookie-authenticated APIs also need CSRF protection.', parts: [g({}), { type: 'text', html: 'Fix for a legitimate frontend: add its exact origin to <code>allow_origins</code> in settings.' }] });
          return f;
        }
        if (!simple) f.push({ narr: 'Preflight answer: 200 with the allowed origin (echoed, never <code>*</code> with credentials), methods, headers and <code>Max-Age: 600</code>, so the browser skips the preflight for 10 minutes.', parts: [g({ m: 'ok', b: 'ok' }, { 'b-m': 'ok' }), { type: 'map', label: 'Preflight response', entries: [['Access-Control-Allow-Origin', origin], ['Access-Control-Allow-Methods', allowM.join(', ')], ['Access-Control-Allow-Headers', hdrs.join(', ')], ['Access-Control-Allow-Credentials', 'true'], ['Access-Control-Max-Age', '600'], ['Vary', 'Origin']] }] });
        f.push({ narr: 'Now the real ' + method + ' goes out with the token. Your route authenticates it as usual (CORS said nothing about <i>who</i> the user is).', parts: [g({ r: 'cur' }, { 'b-m': 'ok', 'm-r': 'ok' }), { type: 'vars', label: 'Real request', vals: { method: method, Origin: origin, Authorization: hdrs.indexOf('authorization') >= 0 ? 'Bearer eyJ…' : '(none)' } }] });
        f.push({ narr: 'The response carries <code>Access-Control-Allow-Origin: ' + hesc(origin) + '</code>, so the browser lets the page read it. Done.', parts: [g({ p: 'ok', b: 'ok', m: 'ok', r: 'ok' }, { 'p-b': 'ok', 'b-m': 'ok', 'm-r': 'ok' }), { type: 'vars', label: 'Response', vals: { status: 200, 'Access-Control-Allow-Origin': origin }, hl: { status: 'ok' } }] });
        return f;
      }
    },
    examples: [
      {
        title: 'Local development: React on :5173, FastAPI on :8000',
        html: `<p>Different ports are different origins. Put the dev origins in your local <code>.env</code>, not in code, so production never inherits them:</p>
        <pre>APP_CORS_ORIGINS=["http://localhost:5173","http://127.0.0.1:5173"]</pre>
        <p>A list field in pydantic-settings is parsed from JSON text like this. In production the same variable holds <code>["https://app.example.com"]</code>. Alternatively, use the Vite dev proxy so the browser only ever talks to one origin and CORS disappears from local development entirely.</p>`
      },
      {
        title: 'The regex that let in evil-example.com',
        html: `<p>A team allowed preview builds with <code>allow_origin_regex="https://.*.example.com"</code>. Because <code>.</code> means "any character", <code>https://evil-example.com</code> matches too: <code>.*</code> eats "evil" and the unescaped dot matches "-". Fix: escape the dots and limit the label: <code>r"https://[a-z0-9-]+[.]example[.]com"</code>. Then test the regex with a list of good and bad origins in a unit test.</p>`,
        code: { lang: 'python', run: true, code: `import re

loose = re.compile(r"https://.*.example.com")
strict = re.compile(r"https://[a-z0-9-]+[.]example[.]com")
for origin in ["https://pr-12.example.com", "https://evil-example.com", "https://a.example.com.evil.net"]:
    print(f"{origin:34} loose={bool(loose.fullmatch(origin))!s:5} strict={bool(strict.fullmatch(origin))}")` }
      },
      {
        title: 'A public, read-only API',
        html: `<p>A public weather API with no cookies and no user data can use <code>allow_origins=["*"]</code>, <code>allow_methods=["GET"]</code>, <code>allow_credentials=False</code>. That is a reasonable and common setup. The danger is only the combination of a wildcard with credentials, or a wildcard on an API that trusts the network location of the caller (for example an internal admin API reachable from employees' browsers).</p>`
      },
      {
        title: 'Hidden 500s that look like CORS errors',
        html: `<p>The frontend console says "No 'Access-Control-Allow-Origin' header". The real cause: the route crashed. Starlette's outermost error middleware produced a plain 500 without CORS headers, so the browser hides it. Always check the API logs (or the Network tab's status column) before touching CORS settings. Adding <code>"*"</code> "to make the error go away" is how the wildcard trap usually starts.</p>`
      }
    ],
    deepDive: `<p>🟣 <b>What Starlette's middleware does.</b> For an <code>OPTIONS</code> request carrying <code>Origin</code> and <code>Access-Control-Request-Method</code>, it answers itself (your route never runs): 200 with allow headers if everything is permitted, else 400 with a short reason. For other requests it calls your app and adds <code>Access-Control-Allow-Origin</code> (and <code>Vary: Origin</code> when echoing) to the response. With <code>allow_origins=["*"]</code> and credentials, or when a cookie is present, it echoes the incoming origin: convenient, and the reason the wildcard trap is so dangerous.</p>
      <p><b>Caching.</b> If the allowed origin varies, responses must carry <code>Vary: Origin</code>, or a CDN might serve a response with <code>Access-Control-Allow-Origin: https://a.example.com</code> to a page on <code>b.example.com</code>. Starlette adds it when echoing; check your CDN keeps it.</p>
      <p><b>Private Network Access.</b> Chromium-based browsers increasingly require an extra preflight before public pages call private-network addresses (localhost, 10.x, 192.168.x), with <code>Access-Control-Request-Private-Network</code>. Starlette's middleware has an <code>allow_private_network</code> flag in recent versions. Mostly relevant for dev tools and IoT devices.</p>
      <p><b>The <code>null</code> origin.</b> Sandboxed iframes, <code>file://</code> pages and some redirects send <code>Origin: null</code>. Never put <code>"null"</code> in the allow list; any attacker can produce it with a sandboxed iframe.</p>
      <p><b>CORS vs CSRF vs auth.</b> CORS controls which pages may read responses. CSRF defences (SameSite=Lax/Strict cookies, CSRF tokens, checking <code>Origin</code> on state-changing requests) control whether a cross-site request may act with the user's cookies. Bearer tokens in headers are not sent automatically, so pure token APIs are not CSRF-prone, but cookie-based ones are.</p>`,
    aiEra: `<p>🤖 "Fix my CORS error" is one of the most common prompts, and the most common AI answer is <code>allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"]</code>. It makes the error disappear and opens the API to every website. When an assistant suggests a CORS change, ask: which exact origin needs access, are cookies involved, and is the error really CORS or a hidden 500? Assistants are useful for generating the test table (allowed origin, disallowed origin, preflight with a disallowed header, regex edge cases) and for explaining a specific failing preflight from the browser's Network tab. Paste the request and response headers, not your production config with secrets in it.</p>`,
    problems: [
      {
        title: 'Answer a CORS Preflight Correctly',
        level: 'Medium', tags: ['CORS', 'preflight', 'HTTP headers'], companies: ['Cloudflare', 'Postman'],
        statement: `<p>Write <code>cors_preflight(origin, method, req_headers, allow_origins, allow_methods, allow_headers, allow_credentials)</code> returning the response as a list of strings:</p>
          <ol><li>If <code>"*"</code> is in <code>allow_origins</code> and <code>allow_credentials</code> is true, return <code>["error:wildcard_with_credentials"]</code> (refuse the unsafe config).</li>
          <li>Origin is allowed if it is in <code>allow_origins</code> exactly, or <code>"*"</code> is in the list. <code>"null"</code> is never allowed. Otherwise <code>["reject:origin"]</code>.</li>
          <li>Method (case-insensitive) must be in <code>allow_methods</code> or the list contains <code>"*"</code>; else <code>["reject:method"]</code>.</li>
          <li>Each requested header (case-insensitive) must be in <code>allow_headers</code>, be safelisted (<code>accept, accept-language, content-language, content-type</code>), or the list contains <code>"*"</code>; else <code>["reject:headers"]</code>.</li>
          <li>On success return, in order: <code>"Access-Control-Allow-Origin: X"</code> (X is <code>*</code> when the wildcard is used, otherwise the origin), <code>"Access-Control-Allow-Methods: M"</code> (M = the requested method in uppercase), <code>"Access-Control-Allow-Headers: H"</code> only if headers were requested (lowercase, joined with <code>", "</code>, in request order), <code>"Access-Control-Allow-Credentials: true"</code> only if credentials are allowed, <code>"Access-Control-Max-Age: 600"</code>, and <code>"Vary: Origin"</code> only when the origin was echoed.</li></ol>`,
        constraints: `Up to 20 entries per list. Origins compare exactly (case-sensitive, no trailing slash normalisation).`,
        example: `${H.table(['origin', 'method / headers', 'config', 'result'], [['https://app.example.com', 'PUT / [Authorization]', 'origins [app], methods [GET, PUT], headers [authorization], creds', '<span class="c-g">Allow-Origin: https://app.example.com, Methods: PUT, Headers: authorization, Credentials: true, Max-Age: 600, Vary: Origin</span>'], ['https://evil.example.net', 'GET / []', 'same', '<span class="c-r">["reject:origin"]</span>'], ['anything', 'GET', 'origins ["*"], creds', '<span class="c-r">["error:wildcard_with_credentials"]</span>']])}`,
        brute: {
          why: `<p>Reflect everything: copy <code>Origin</code> into <code>Access-Control-Allow-Origin</code>, copy the requested method and headers back, and add <code>Allow-Credentials: true</code>. Every frontend works, including every attacker's page. This is exactly what <code>["*"]</code> + credentials does in Starlette.</p>`,
          code: { lang: 'python', code: `def cors_preflight(origin, method, req_headers, allow_origins, allow_methods, allow_headers, allow_credentials):
    return ["Access-Control-Allow-Origin: " + origin,          # anyone, with cookies
            "Access-Control-Allow-Methods: " + method.upper(),
            "Access-Control-Allow-Credentials: true"]` }
        },
        mcq: { q: 'Which request does NOT trigger a preflight?', options: ['<code>GET /items</code> with only an <code>Accept</code> header', '<code>POST</code> with <code>Content-Type: application/json</code>', '<code>DELETE /items/3</code>', '<code>GET</code> with <code>Authorization: Bearer …</code>'], answer: 0, explain: 'GET with safelisted headers is a simple request. JSON content type, non-simple methods and the Authorization header all require a preflight.' },
        hints: [
          `<p>Hint 1: check the configuration first (wildcard + credentials), then origin, method, headers, in that order. Return immediately on the first failure.</p>`,
          `<p>Hint 2: lowercase both sides for headers, uppercase for methods. Build a set: <code>{h.lower() for h in allow_headers} | SAFELISTED</code>.</p>`,
          `<p>Hint 3: remember whether the wildcard was used: it decides both the Allow-Origin value and whether <code>Vary: Origin</code> is added. Append the optional lines only when their condition holds.</p>`
        ],
        solution: {
          approach: `<p>Validate the configuration, then the three request properties, then build the header list in a fixed order. Echoing the origin requires <code>Vary: Origin</code> so shared caches keep per-origin copies. In FastAPI you configure <code>CORSMiddleware</code> rather than writing this, but knowing the algorithm lets you read a failing preflight in the browser and fix the right setting.</p>`,
          code: { lang: 'python', run: true, code: `SAFELISTED = {"accept", "accept-language", "content-language", "content-type"}


def cors_preflight(origin: str, method: str, req_headers: list[str], allow_origins: list[str],
                   allow_methods: list[str], allow_headers: list[str], allow_credentials: bool) -> list[str]:
    wildcard = "*" in allow_origins
    if wildcard and allow_credentials:
        return ["error:wildcard_with_credentials"]
    if origin == "null" or not (origin in allow_origins or wildcard):
        return ["reject:origin"]
    m = method.upper()
    if "*" not in allow_methods and m not in {x.upper() for x in allow_methods}:
        return ["reject:method"]
    ok_headers = {h.lower() for h in allow_headers} | SAFELISTED
    wanted = [h.lower() for h in req_headers]
    if "*" not in allow_headers and any(h not in ok_headers for h in wanted):
        return ["reject:headers"]
    out = ["Access-Control-Allow-Origin: " + ("*" if wildcard else origin),
           "Access-Control-Allow-Methods: " + m]
    if wanted:
        out.append("Access-Control-Allow-Headers: " + ", ".join(wanted))
    if allow_credentials:
        out.append("Access-Control-Allow-Credentials: true")
    out.append("Access-Control-Max-Age: 600")
    if not wildcard:
        out.append("Vary: Origin")
    return out


print(cors_preflight("https://app.example.com", "put", ["Authorization"], ["https://app.example.com"],
                     ["GET", "PUT"], ["authorization"], True))` },
          complexity: `<p>O(o + m + h) to build the small sets and scan the requested headers; everything is bounded by 20 entries.</p>`,
          followUps: ['What extra header must the actual (non-preflight) response carry?', 'How would you allow preview deployments safely?']
        },
        tests: { fn: 'corsPreflight', names: { python: 'cors_preflight' }, sig: 'string string string[] string[] string[] string[] bool -> string[]', cases: [
          [['https://app.example.com', 'put', ['Authorization'], ['https://app.example.com'], ['GET', 'PUT'], ['authorization'], true], ['Access-Control-Allow-Origin: https://app.example.com', 'Access-Control-Allow-Methods: PUT', 'Access-Control-Allow-Headers: authorization', 'Access-Control-Allow-Credentials: true', 'Access-Control-Max-Age: 600', 'Vary: Origin']],
          [['https://evil.example.net', 'GET', [], ['https://app.example.com'], ['GET'], [], true], ['reject:origin']],
          [['https://x.com', 'GET', [], ['*'], ['GET'], [], true], ['error:wildcard_with_credentials']],
          [['https://x.com', 'GET', [], ['*'], ['GET'], [], false], ['Access-Control-Allow-Origin: *', 'Access-Control-Allow-Methods: GET', 'Access-Control-Max-Age: 600']],
          [['null', 'GET', [], ['*'], ['GET'], [], false], ['reject:origin']],
          [['https://app.example.com', 'DELETE', [], ['https://app.example.com'], ['GET', 'POST'], [], false], ['reject:method']],
          [['https://app.example.com', 'POST', ['X-Debug'], ['https://app.example.com'], ['POST'], ['authorization'], false], ['reject:headers']],
          [['https://app.example.com', 'POST', ['Content-Type'], ['https://app.example.com'], ['POST'], [], false], ['Access-Control-Allow-Origin: https://app.example.com', 'Access-Control-Allow-Methods: POST', 'Access-Control-Allow-Headers: content-type', 'Access-Control-Max-Age: 600', 'Vary: Origin']],
          [['https://app.example.com/', 'GET', [], ['https://app.example.com'], ['GET'], [], false], ['reject:origin']],
          [['https://app.example.com', 'patch', ['X-Trace', 'Accept'], ['https://app.example.com'], ['*'], ['*'], true], ['Access-Control-Allow-Origin: https://app.example.com', 'Access-Control-Allow-Methods: PATCH', 'Access-Control-Allow-Headers: x-trace, accept', 'Access-Control-Allow-Credentials: true', 'Access-Control-Max-Age: 600', 'Vary: Origin']]
        ] }
      }
    ]
  });

  /* =====================================================================
     TOPIC 5 — Settings with pydantic-settings, and secrets handling
     ===================================================================== */
  topics.push({
    title: 'Configuration and Secrets: pydantic-settings, .env, SecretStr and Never Committing a Key',
    analogy: `<p>A <b>travelling chef</b> carries the same recipe book (your code) to every restaurant. Each kitchen has its own fridge contents and its own door key (database address, API keys). You would never print the door key in the recipe book that everyone photocopies. Instead each kitchen leaves the key in a <b>locked drawer</b> (the environment or a secrets manager) and the chef checks on arrival that every ingredient is there <i>before</i> service starts, not halfway through the first order.</p>`,
    explain: `<p>🟢 <b>Rule one: config lives outside the code.</b> The same container image runs in dev, staging and production; only environment variables differ (the "twelve-factor" idea). Secrets (DB passwords, JWT keys, API tokens) must never appear in the repository, in images, or in logs.</p>
      <p><b>pydantic-settings</b> (<code>pip install pydantic-settings</code>) gives you a typed <code>Settings</code> class. Each field is read from an environment variable with the same name (case-insensitive, optionally with a prefix), converted to the declared type and validated, exactly like a request body. If a required variable is missing or wrong, the app <b>fails at startup</b> with a clear error instead of crashing on the first request.</p>
      ${H.table(['Feature', 'How'], [
        ['Prefix', '<code>SettingsConfigDict(env_prefix="APP_")</code>: field <code>jwt_secret</code> reads <code>APP_JWT_SECRET</code>'],
        ['Local file', '<code>env_file=".env"</code>: read for development; real environment variables win over it'],
        ['Secret values', '<code>jwt_secret: SecretStr</code>: prints as <code>**********</code>; call <code>.get_secret_value()</code> only where you need it'],
        ['Lists and nested', '<code>cors_origins: list[str]</code> parsed from JSON text; <code>env_nested_delimiter="__"</code> for <code>APP_DB__POOL_SIZE</code>'],
        ['Docker/K8s secret files', '<code>secrets_dir="/run/secrets"</code>: one file per field'],
        ['One instance', '<code>@lru_cache</code> on <code>get_settings()</code>, injected with <code>Depends(get_settings)</code>, overridable in tests']
      ])}
      <p><b>The <code>.env</code> file.</b> Handy for local development, and the most leaked file in the world. Put <code>.env</code> in <code>.gitignore</code> <i>before</i> the first commit, and commit a <code>.env.example</code> with obvious placeholders (<code>APP_JWT_SECRET=change-me-in-.env</code>) so new developers know which variables exist. Make your settings validator <b>reject</b> placeholder values, so nobody ships them.</p>
      <p><b>Generate real secrets</b> with the OS random generator, never by typing:</p>
      <pre>python -c "import secrets; print(secrets.token_urlsafe(32))"</pre>
      <p><b>In production</b> secrets come from a secrets manager (AWS Secrets Manager, GCP Secret Manager, Azure Key Vault, HashiCorp Vault) injected as environment variables or files by the platform. Kubernetes Secrets are only base64-encoded unless encryption at rest is enabled. Rotation should be routine, so design for two valid keys at once (current and previous).</p>`,
    clues: [
      '"How do you manage configuration across environments in FastAPI?" → <code>pydantic_settings.BaseSettings</code>, env vars per environment, <code>get_settings()</code> with <code>lru_cache</code> and <code>Depends</code>',
      '"Someone committed the <code>.env</code> file / an API key to GitHub" → rotate the key first, then purge history, then add secret scanning and push protection',
      '"The app crashed in production because a variable was missing" → required fields with no defaults so validation fails at startup, plus a readiness check',
      '"Secrets appeared in our logs" → <code>SecretStr</code>, never log settings or full request headers, redact in the logging formatter',
      '"How do you rotate the JWT signing key without logging everybody out?" → accept current + previous key (by <code>kid</code>) for one token lifetime, sign only with current',
      '"How do tests use different settings?" → <code>app.dependency_overrides[get_settings]</code> or <code>Settings(_env_file=None, ...)</code> with explicit values'
    ],
    code: [
      {
        lang: 'python', title: 'app/config.py: typed settings with validation that refuses unsafe values',
        code: `# pip install pydantic-settings
from functools import lru_cache
from typing import Literal

from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

PLACEHOLDERS = {"change-me", "changeme", "change-me-in-.env", "secret", "dev"}


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="APP_",            # APP_DATABASE_URL -> database_url
        env_file=".env",              # local development only; real env vars take priority
        env_file_encoding="utf-8",
        extra="ignore",               # unrelated variables in .env do not crash the app
        secrets_dir=None,             # set to "/run/secrets" when using Docker/K8s secret files
    )

    env: Literal["dev", "staging", "prod"] = "dev"
    debug: bool = False
    database_url: SecretStr                          # required: no default, startup fails without it
    jwt_secret: SecretStr = Field(min_length=32)     # required, and long enough for HS256
    jwt_issuer: str = "https://api.example.com"
    jwt_audience: str = "orders-api"
    access_token_minutes: int = Field(default=15, ge=1, le=60)
    cors_origins: list[str] = []                     # JSON text: APP_CORS_ORIGINS='["https://app.example.com"]'
    cors_allow_credentials: bool = True
    redis_url: SecretStr = SecretStr("redis://localhost:6379/0")   # may contain a password

    @field_validator("jwt_secret")
    @classmethod
    def not_a_placeholder(cls, v: SecretStr) -> SecretStr:
        if v.get_secret_value().lower() in PLACEHOLDERS:
            raise ValueError("jwt_secret is a placeholder; generate one with secrets.token_urlsafe(32)")
        return v

    @model_validator(mode="after")
    def safe_for_production(self) -> "Settings":
        if self.env == "prod" and self.debug:
            raise ValueError("debug must be off in prod")
        if "*" in self.cors_origins and self.cors_allow_credentials:
            raise ValueError("CORS wildcard cannot be combined with credentials")
        return self


@lru_cache
def get_settings() -> Settings:
    # Created once per process, on first use. Raises pydantic.ValidationError if the
    # environment is wrong, which stops the app at startup (call it in lifespan).
    return Settings()`
      },
      {
        lang: 'bash', title: '.env.example (committed) and the commands around it',
        code: `# .env.example: copy to .env (which is in .gitignore) and fill in real values.
# Placeholders below are rejected by Settings on purpose.
APP_ENV=dev
APP_DEBUG=true
APP_DATABASE_URL=postgresql+psycopg://app:change-me@localhost:5432/app
APP_JWT_SECRET=change-me-in-.env
APP_CORS_ORIGINS='["http://localhost:5173"]'

# One-time setup on a developer machine:
#   cp .env.example .env
#   python -c "import secrets; print(secrets.token_urlsafe(32))"    # paste the output into APP_JWT_SECRET
#   echo ".env" >> .gitignore                                         # before the first commit!`
      },
      {
        lang: 'python', run: true, title: 'Runnable: what BaseSettings does, in plain Python (env lookup, types, masking, fail fast)',
        code: `import os


class Secret:
    """Like pydantic's SecretStr: hides the value in repr/str/logs."""
    def __init__(self, value: str):
        self._value = value

    def get_secret_value(self) -> str:
        return self._value

    def __repr__(self) -> str:
        return "Secret('**********')"


def parse_bool(raw: str) -> bool:
    low = raw.strip().lower()
    if low in {"1", "true", "yes", "on"}:
        return True
    if low in {"0", "false", "no", "off"}:
        return False
    raise ValueError(f"not a boolean: {raw!r}")


def load_settings(environ: dict) -> dict:
    errors, out = [], {}
    def get(name, default=None):
        return environ.get("APP_" + name.upper(), default)

    out["env"] = get("env", "dev")
    if out["env"] not in {"dev", "staging", "prod"}:
        errors.append("env: must be dev, staging or prod")
    try:
        out["debug"] = parse_bool(get("debug", "false"))
    except ValueError as e:
        errors.append("debug: " + str(e))
    secret = get("jwt_secret")
    if secret is None:
        errors.append("jwt_secret: required")
    elif len(secret) < 32:
        errors.append("jwt_secret: too short (need 32+ characters)")
    else:
        out["jwt_secret"] = Secret(secret)
    if errors:
        raise SystemExit("Refusing to start:\\n  " + "\\n  ".join(errors))
    return out


# Simulate two deployments. The demo secret is generated here, never typed.
import secrets
good_env = {"APP_ENV": "prod", "APP_DEBUG": "off", "APP_JWT_SECRET": secrets.token_urlsafe(32)}
print("prod settings:", load_settings(good_env))          # the secret is masked

bad_env = {"APP_ENV": "production", "APP_DEBUG": "maybe", "APP_JWT_SECRET": "change-me"}
try:
    load_settings(bad_env)
except SystemExit as e:
    print(e)

print("real process env has APP_JWT_SECRET?", "APP_JWT_SECRET" in os.environ)`
      }
    ],
    codeTitle: ['pydantic-settings Settings', '.env.example', 'Runnable: settings by hand'],
    viz: {
      title: 'Where each setting comes from, and when startup refuses',
      input: 'APP_ENV=prod APP_DEBUG=false APP_JWT_SECRET=generated-with-secrets-token-urlsafe-32',
      inputLabel: 'Real environment variables (KEY=VALUE, space separated). The .env file below is fixed.',
      gen: function (input) {
        var envVars = {};
        String(input || '').trim().split(/\s+/).forEach(function (t) {
          if (!t) return;
          var i = t.indexOf('=');
          if (i <= 0) throw new Error('Use KEY=VALUE pairs, e.g. APP_ENV=prod APP_DEBUG=false');
          envVars[t.slice(0, i).toUpperCase()] = t.slice(i + 1);
        });
        var dotenv = { APP_ENV: 'dev', APP_DEBUG: 'true', APP_DATABASE_URL: 'postgresql+psycopg://app:****@localhost/app', APP_JWT_SECRET: 'change-me-in-.env' };
        var defaults = { env: 'dev', debug: 'false', database_url: '(required)', jwt_secret: '(required)', access_token_minutes: '15' };
        var fields = ['env', 'debug', 'database_url', 'jwt_secret', 'access_token_minutes'];
        var f = [];
        f.push({ narr: 'At startup, <code>get_settings()</code> builds <code>Settings()</code>. pydantic-settings looks for each field in several sources, <b>highest priority first</b>: arguments passed in code, real environment variables, the <code>.env</code> file, secret files, then field defaults.', parts: [{ type: 'table', label: 'Source priority', columns: ['#', 'source', 'typical use'], rows: [['1', 'Settings(...) arguments', 'tests'], ['2', 'environment variables', 'production, CI'], ['3', '.env file', 'a developer laptop'], ['4', 'secrets_dir files', 'Docker / K8s secrets'], ['5', 'field defaults', 'safe defaults']], hl: { 1: 'cur' } }] });
        f.push({ narr: 'The two inputs for this run: the real environment (your input) and the developer <code>.env</code> file that was accidentally copied into the image.', parts: [{ type: 'map', label: 'Environment variables', entries: Object.keys(envVars).length ? Object.keys(envVars).map(function (k) { return [k, /SECRET/.test(k) ? '(hidden, ' + envVars[k].length + ' chars)' : envVars[k]]; }) : [['(none)', '-']] }, { type: 'map', label: '.env file', entries: Object.keys(dotenv).map(function (k) { return [k, dotenv[k]]; }) }] });
        var rows = [], res = {};
        fields.forEach(function (fl) {
          var key = 'APP_' + fl.toUpperCase();
          var v, src;
          if (envVars[key] !== undefined) { v = envVars[key]; src = 'environment'; }
          else if (dotenv[key] !== undefined) { v = dotenv[key]; src = '.env file'; }
          else { v = defaults[fl]; src = 'default'; }
          res[fl] = v;
          rows.push([fl, key, src, fl === 'jwt_secret' ? '**********' : hesc(v)]);
        });
        f.push({ narr: 'Each field is resolved independently: the first source that has <code>APP_&lt;FIELD&gt;</code> wins. Notice how values the environment does not set fall through to the <code>.env</code> file.', parts: [{ type: 'table', label: 'Resolution', columns: ['field', 'variable', 'came from', 'value'], rows: rows, hl: rows.reduce(function (a, r, i) { a[i] = r[2] === '.env file' ? 'cur' : r[2] === 'environment' ? 'ok' : ''; return a; }, {}) }] });
        var errs = [];
        if (['dev', 'staging', 'prod'].indexOf(res.env) < 0) errs.push(['env', 'must be dev | staging | prod']);
        if (['true', 'false', '1', '0', 'yes', 'no', 'on', 'off'].indexOf(String(res.debug).toLowerCase()) < 0) errs.push(['debug', 'not a boolean']);
        if (res.database_url === '(required)') errs.push(['database_url', 'field required']);
        if (res.jwt_secret === '(required)') errs.push(['jwt_secret', 'field required']);
        else if (/^change-?me/.test(res.jwt_secret)) errs.push(['jwt_secret', 'placeholder value']);
        else if (res.jwt_secret.length < 32) errs.push(['jwt_secret', 'shorter than 32 characters']);
        var dbg = ['true', '1', 'yes', 'on'].indexOf(String(res.debug).toLowerCase()) >= 0;
        if (!errs.length && res.env === 'prod' && dbg) errs.push(['(model)', 'debug must be off in prod']);
        f.push({ narr: 'Validation runs the type conversions and your validators: <code>Literal</code> for env, bool parsing, required fields, <code>min_length=32</code>, the placeholder check and the cross-field "no debug in prod" rule.', parts: [{ type: 'table', label: 'Validation', columns: ['field', 'problem'], rows: errs.length ? errs : [['all fields', 'valid']], hl: errs.length ? errs.reduce(function (a, _, i) { a[i] = 'bad'; return a; }, {}) : { 0: 'ok' } }] });
        if (errs.length) {
          f.push({ narr: '<b>Startup fails</b> with a <code>ValidationError</code> listing every problem. That is the goal: a deploy with a placeholder secret or debug mode never starts serving traffic. The orchestrator keeps the old version running.', parts: [{ type: 'text', label: 'Log line', html: '<code>pydantic_core.ValidationError: ' + errs.length + ' validation error(s) for Settings</code><br>' + errs.map(function (e) { return '<code>' + hesc(e[0]) + ': ' + hesc(e[1]) + '</code>'; }).join('<br>') }] });
          f.push({ narr: 'Fix: set the missing or unsafe variables in the deployment environment (from the secrets manager), and keep <code>.env</code> out of the image with <code>.dockerignore</code>.', parts: [{ type: 'text', html: 'Try: <code>APP_ENV=prod APP_DEBUG=false APP_JWT_SECRET=&lt;43 random chars&gt; APP_DATABASE_URL=postgresql://…</code>' }] });
          return f;
        }
        f.push({ narr: 'All good. The object is cached by <code>lru_cache</code>; every request that needs it gets the same instance through <code>Depends(get_settings)</code>.', parts: [{ type: 'vars', label: 'Settings()', vals: { env: res.env, debug: String(dbg), database_url: "SecretStr('**********')", jwt_secret: "SecretStr('**********')", access_token_minutes: res.access_token_minutes }, hl: { jwt_secret: 'ok' } }] });
        f.push({ narr: 'If someone logs the settings object, secrets print as stars. Only the code that signs tokens calls <code>.get_secret_value()</code>, at the moment it needs the value.', parts: [pyc('Safe by default', 'log.info("settings loaded: %r", settings)\n# Settings(env=\'prod\', jwt_secret=SecretStr(\'**********\'), ...)\nkey = settings.jwt_secret.get_secret_value()   # only here', { 3: 'ok' })] });
        return f;
      }
    },
    examples: [
      {
        title: 'Overriding settings in tests',
        html: `<p>Tests should never read your laptop's <code>.env</code>. Build settings explicitly and override the dependency. <code>_env_file=None</code> turns off the file for that instance. Generate the test key at runtime too, so even test code has no literal secret.</p>`,
        code: { lang: 'python', code: `import secrets

from fastapi.testclient import TestClient

from app.config import Settings, get_settings
from app.main import app


def test_settings() -> Settings:
    return Settings(_env_file=None, env="dev", database_url="sqlite://",
                    jwt_secret=secrets.token_urlsafe(32), cors_origins=["http://testserver"])


app.dependency_overrides[get_settings] = test_settings
client = TestClient(app)` }
      },
      {
        title: 'Someone pushed the .env file to GitHub',
        html: `<p>Order matters. <b>1. Rotate</b> every secret in the file immediately (new DB password, new JWT key, new API keys): bots scan public GitHub within minutes, and history rewriting does not un-leak anything already cloned. <b>2. Revoke</b> sessions signed with the old JWT key. <b>3. Clean</b> the history (<code>git filter-repo</code>) and force-push, mostly for hygiene. <b>4. Prevent</b>: <code>.env</code> in <code>.gitignore</code>, a pre-commit secret scanner (gitleaks, detect-secrets), GitHub push protection. <b>5. Review</b> access logs for use of the leaked keys.</p>`
      },
      {
        title: 'Rotating the JWT key without logging everyone out',
        html: `<p>Keep two keys in settings: <code>APP_JWT_KEYS='{"2026-10": "...", "2026-07": "..."}'</code> plus <code>APP_JWT_CURRENT_KID=2026-10</code>. Sign new tokens with the current key and put its id in the <code>kid</code> header. Verify with whichever key the <code>kid</code> names. After one token lifetime (plus refresh window), remove the old key. A <code>dict[str, SecretStr]</code> field parses that JSON automatically.</p>`,
        code: { lang: 'python', code: `import jwt
from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class KeySettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="APP_")
    jwt_keys: dict[str, SecretStr]           # kid -> key, from JSON in APP_JWT_KEYS
    jwt_current_kid: str


def sign(claims: dict, s: KeySettings) -> str:
    key = s.jwt_keys[s.jwt_current_kid].get_secret_value()
    return jwt.encode(claims, key, algorithm="HS256", headers={"kid": s.jwt_current_kid})


def verify(token: str, s: KeySettings, audience: str) -> dict:
    kid = jwt.get_unverified_header(token).get("kid")
    if kid not in s.jwt_keys:
        raise jwt.InvalidTokenError("unknown kid")
    return jwt.decode(token, s.jwt_keys[kid].get_secret_value(), algorithms=["HS256"], audience=audience)` }
      },
      {
        title: 'Secrets that leak sideways',
        html: `<p>Even with perfect settings code, secrets escape through: <b>URLs</b> (an API key in a query string ends up in proxy and access logs), <b>exception messages</b> (a DB error that prints the full connection string), <b>debug pages</b> (<code>debug=True</code> tracebacks with local variables), <b>OpenAPI examples</b> with a real token pasted in, <b>Docker image layers</b> (<code>COPY .env</code> or <code>ARG API_KEY</code>; use BuildKit secret mounts), and <b>CI logs</b> that echo environment variables. Treat each as a review checklist item.</p>`
      }
    ],
    deepDive: `<p>🟣 <b>How pydantic-settings resolves values.</b> <code>BaseSettings</code> builds a list of "settings sources" (<code>init_settings</code>, <code>env_settings</code>, <code>dotenv_settings</code>, <code>file_secret_settings</code>) and merges them in priority order before normal Pydantic validation. You can reorder them or add your own (for example a source that reads AWS Secrets Manager) by overriding the class method <code>settings_customise_sources</code>. Complex types (<code>list</code>, <code>dict</code>, nested models) are parsed from JSON strings; with <code>env_nested_delimiter="__"</code>, <code>APP_DB__POOL_SIZE=20</code> fills <code>db.pool_size</code>.</p>
      <p><b>Why <code>lru_cache</code>, and when not.</b> Reading the environment and validating takes milliseconds and should happen once. But the cache means changes to environment variables after startup are ignored; that is usually what you want (restart to reconfigure). For values that must change at runtime (feature flags, rotating credentials from Vault with leases), use a dedicated client with its own refresh logic.</p>
      <p><b>SecretStr limits.</b> It hides values in <code>repr</code>, <code>str</code> and <code>model_dump_json()</code> output, which stops the most common log leaks. It does not encrypt memory, and once you call <code>get_secret_value()</code> the plain string is just a string. Do not pass it into f-strings that get logged.</p>
      <p><b>Least privilege for config.</b> The API's database user should not be the migration user; the read-only reporting service should have a read-only role. Different secrets per service and per environment mean one leak has one blast radius.</p>
      <p><b>Container specifics.</b> Prefer secret files (<code>/run/secrets/app_jwt_secret</code> via <code>secrets_dir</code>) over environment variables when available: environment variables are visible to every process in the container and appear in <code>docker inspect</code> and crash dumps.</p>`,
    aiEra: `<p>🤖 Two AI-era leaks to know. First, assistants and agents read your files: an agent with access to the repository can read <code>.env</code> and may paste it into a prompt, a log or a commit. Keep real secrets out of the working tree when using coding agents (a secrets manager or a <code>.env</code> outside the repo), and configure the agent to ignore secret files. Second, generated code often contains example secrets that look real (<code>SECRET_KEY = "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"</code> from an old tutorial); scanners flag them, and worse, people ship them. Ask the assistant for a <code>Settings</code> class with validators that reject placeholders, and a CI step that runs a secret scanner. AI is genuinely good at writing <code>.env.example</code> files and documenting every variable; make it generate placeholders, never values.</p>`,
    problems: [
      {
        title: 'Load and Validate Settings from Environment Lines',
        level: 'Medium', tags: ['configuration', 'validation', 'secrets'], companies: ['Swiggy', 'GitLab'],
        statement: `<p>Write <code>load_settings(lines)</code>, a mini pydantic-settings. <code>lines</code> are <code>KEY=VALUE</code> strings (as in an env file). Rules:</p>
          <ul><li>Skip blank lines, lines starting with <code>#</code> and lines without <code>=</code>. Split on the first <code>=</code>, strip spaces, uppercase the key; strip one pair of matching surrounding quotes (<code>"</code> or <code>'</code>) from the value. Later lines win. Only keys starting with <code>APP_</code> matter.</li>
          <li>Fields (in this order): <code>env</code> (dev|staging|prod, default dev), <code>debug</code> (true/1/yes/on or false/0/no/off, case-insensitive, default false), <code>database_url</code> (required), <code>jwt_secret</code> (required; at least 32 characters; not one of <code>change-me, changeme, change-me-in-.env, secret</code> case-insensitive), <code>access_token_minutes</code> (integer 1-60, default 15).</li>
          <li>Errors, in field order: <code>invalid:env</code>, <code>invalid:debug</code>, <code>missing:database_url</code>, <code>missing:jwt_secret</code> or <code>weak:jwt_secret</code>, <code>invalid:access_token_minutes</code>. If there are no field errors but env is prod and debug is true: <code>["debug_in_prod"]</code>.</li>
          <li>On success return <code>["ok", "env=&lt;env&gt;", "debug=&lt;true|false&gt;", "minutes=&lt;n&gt;", "jwt_secret=**********"]</code>. The secret is never echoed.</li></ul>`,
        constraints: `Up to 200 lines. Values are printable ASCII. An integer is optional sign plus digits.`,
        example: `${H.table(['lines', 'result'], [['APP_DATABASE_URL=postgresql://db/app, APP_JWT_SECRET=&lt;40 random chars&gt;', '<span class="c-g">["ok", "env=dev", "debug=false", "minutes=15", "jwt_secret=**********"]</span>'], ['APP_JWT_SECRET=change-me', '<span class="c-r">["missing:database_url", "weak:jwt_secret"]</span>'], ['APP_ENV=prod, APP_DEBUG=yes, plus valid URL and secret', '<span class="c-r">["debug_in_prod"]</span>']])}`,
        brute: {
          why: `<p>Read <code>os.environ.get("APP_JWT_SECRET", "dev-secret")</code> wherever a value is needed. Missing variables silently become defaults, a typo in a variable name means the placeholder ships to production, and the first sign of trouble is forged tokens rather than a failed deploy.</p>`,
          code: { lang: 'python', code: `import os

JWT_SECRET = os.environ.get("APP_JWT_SECRET", "dev-secret")    # silent, guessable fallback
DEBUG = os.environ.get("APP_DEBUG") == "true"                     # "True" or "1" quietly mean False` }
        },
        mcq: { q: 'A required field <code>database_url</code> has no default and <code>APP_DATABASE_URL</code> is not set. What happens with pydantic-settings?', options: ['<code>Settings()</code> raises a ValidationError, so the app fails at startup', 'The field becomes None', 'The field becomes an empty string', 'FastAPI returns 500 on the first request'], answer: 0, explain: 'Settings are validated like any Pydantic model. Required fields must be present; failing at startup is the point.' },
        hints: [
          `<p>Hint 1: first build a dict from the lines (handling comments, the first <code>=</code>, quotes, last-wins), then read each field with its default.</p>`,
          `<p>Hint 2: write tiny parsers that return <code>None</code> on failure (<code>parse_bool</code>, <code>parse_int</code> using <code>lstrip("+-").isdigit()</code>) and append the error code when they do.</p>`,
          `<p>Hint 3: the cross-field <code>debug_in_prod</code> check runs only when the field list is clean, mirroring a Pydantic <code>model_validator(mode="after")</code>, which only runs after all fields validated.</p>`
        ],
        solution: {
          approach: `<p>Two phases, like pydantic-settings: <b>collect</b> raw strings from the source (with precedence by line order), then <b>validate</b> each field with its own parser and default, collecting every error. A model-level rule runs last. The output never contains the secret, mirroring <code>SecretStr</code>.</p>`,
          code: { lang: 'python', run: true, code: `PLACEHOLDERS = {"change-me", "changeme", "change-me-in-.env", "secret"}
TRUE, FALSE = {"true", "1", "yes", "on"}, {"false", "0", "no", "off"}


def _collect(lines: list[str]) -> dict[str, str]:
    env: dict[str, str] = {}
    for line in lines:
        s = line.strip()
        if not s or s.startswith("#") or "=" not in s:
            continue
        key, value = s.split("=", 1)
        key, value = key.strip().upper(), value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\\"'":
            value = value[1:-1]
        env[key] = value
    return env


def load_settings(lines: list[str]) -> list[str]:
    env = _collect(lines)
    errors: list[str] = []
    app_env = env.get("APP_ENV", "dev")
    if app_env not in {"dev", "staging", "prod"}:
        errors.append("invalid:env")
    raw_debug = env.get("APP_DEBUG", "false").lower()
    debug = raw_debug in TRUE
    if raw_debug not in TRUE | FALSE:
        errors.append("invalid:debug")
    if not env.get("APP_DATABASE_URL"):
        errors.append("missing:database_url")
    secret = env.get("APP_JWT_SECRET")
    if not secret:
        errors.append("missing:jwt_secret")
    elif len(secret) < 32 or secret.lower() in PLACEHOLDERS:
        errors.append("weak:jwt_secret")
    raw_min = env.get("APP_ACCESS_TOKEN_MINUTES", "15")
    digits = raw_min[1:] if raw_min[:1] in "+-" else raw_min
    minutes = int(raw_min) if digits.isdigit() else None
    if minutes is None or not 1 <= minutes <= 60:
        errors.append("invalid:access_token_minutes")
    if errors:
        return errors
    if app_env == "prod" and debug:
        return ["debug_in_prod"]
    return ["ok", "env=" + app_env, "debug=" + str(debug).lower(), "minutes=" + str(minutes),
            "jwt_secret=**********"]


print(load_settings(["APP_JWT_SECRET=change-me"]))` },
          complexity: `<p>O(total length of the lines): one pass to collect, constant work per field.</p>`,
          followUps: ['How would you add a <code>secrets_dir</code> source with lower priority than the environment?', 'Which of these errors would you also check in a CI step before deploying?']
        },
        tests: { fn: 'loadSettings', names: { python: 'load_settings' }, sig: 'string[] -> string[]', cases: [
          [[['APP_DATABASE_URL=postgresql://db/app', 'APP_JWT_SECRET=test-only-secret-0123456789abcdefghij']], ['ok', 'env=dev', 'debug=false', 'minutes=15', 'jwt_secret=**********']],
          [[['APP_JWT_SECRET=change-me']], ['missing:database_url', 'weak:jwt_secret']],
          [[[]], ['missing:database_url', 'missing:jwt_secret']],
          [[['APP_ENV=prod', 'APP_DEBUG=yes', 'APP_DATABASE_URL=postgresql://db/app', 'APP_JWT_SECRET=test-only-secret-0123456789abcdefghij']], ['debug_in_prod']],
          [[['APP_ENV=production', 'APP_DEBUG=maybe', 'APP_DATABASE_URL=x', 'APP_JWT_SECRET=short']], ['invalid:env', 'invalid:debug', 'weak:jwt_secret']],
          [[['# comment', '', 'not a pair', 'app_database_url = "postgresql://db/app"', "APP_JWT_SECRET='test-only-secret-0123456789abcdefghij'", 'APP_ACCESS_TOKEN_MINUTES=30', 'APP_ENV=staging', 'APP_DEBUG=ON']], ['ok', 'env=staging', 'debug=true', 'minutes=30', 'jwt_secret=**********']],
          [[['APP_DATABASE_URL=x', 'APP_JWT_SECRET=test-only-secret-0123456789abcdefghij', 'APP_ACCESS_TOKEN_MINUTES=0']], ['invalid:access_token_minutes']],
          [[['APP_DATABASE_URL=x', 'APP_JWT_SECRET=test-only-secret-0123456789abcdefghij', 'APP_ACCESS_TOKEN_MINUTES=ten']], ['invalid:access_token_minutes']],
          [[['APP_DATABASE_URL=x', 'APP_JWT_SECRET=old', 'APP_JWT_SECRET=test-only-secret-0123456789abcdefghij']], ['ok', 'env=dev', 'debug=false', 'minutes=15', 'jwt_secret=**********']],
          [[['APP_DATABASE_URL=x', 'APP_JWT_SECRET=CHANGE-ME-IN-.ENV']], ['weak:jwt_secret']],
          [[['APP_DATABASE_URL=', 'APP_JWT_SECRET=test-only-secret-0123456789abcdefghij', 'APP_ENV=prod']], ['missing:database_url']]
        ] }
      }
    ]
  });

  /* =====================================================================
     TOPIC 6 — Rate limiting and abuse prevention in Python APIs
     ===================================================================== */
  topics.push({
    title: 'Rate Limiting in FastAPI: Token Buckets, Redis, Login Throttling and 429',
    analogy: `<p>A <b>ticket machine</b> at a car park drops one ticket into a tray every second, and the tray holds at most 10. Each car takes one ticket to enter. A queue of 10 cars arriving together all get in (the tray was full: that is the <b>burst</b>), but the 11th must wait for the next ticket. Over a long time, no more than one car per second gets in, however hard people push. That tray is a <b>token bucket</b>.</p>`,
    explain: `<p>🟢 <b>Why limit?</b> Without limits, one client can guess passwords on <code>/auth/token</code> all day, scrape every product, run up your LLM or SMS bill, or simply use all your workers so nobody else gets served. OWASP lists this as <b>API4: Unrestricted Resource Consumption</b> and <b>API6: Unrestricted Access to Sensitive Business Flows</b>. Backend 15 covers the algorithms in general; here we make them work in a Python service.</p>
      <p><b>Pick the key, then the algorithm.</b></p>
      ${H.table(['Key', 'Good for', 'Watch out'], [
        ['client IP', 'anonymous endpoints, signup, login', 'behind a proxy every request seems to come from the proxy; offices and mobile networks share IPs'],
        ['user id / API key', 'authenticated traffic, fair use per customer', 'only after authentication, so it cannot protect the login itself'],
        ['account being logged in to', 'credential stuffing and password guessing', 'attackers can lock real users out; prefer slow-down over hard lockout']
      ])}
      <p><b>Token bucket</b> (capacity <i>C</i>, refill <i>r</i> per second) allows bursts up to <i>C</i> and an average of <i>r</i>. <b>Fixed window</b> ("100 per minute", one counter per minute) is the simplest with Redis: <code>INCR</code> plus <code>EXPIRE</code>, but allows up to 2× at window edges. <b>Sliding window</b> and <b>GCRA</b> smooth that out.</p>
      <p><b>Where the counter lives.</b> A Python dict in the process is fine for a demo and wrong in production: with 4 Uvicorn workers and 3 pods you have 12 separate dicts, so the real limit is 12× what you configured. Use <b>Redis</b> (atomic <code>INCR</code> or a Lua script) or let the <b>gateway</b> (nginx, Envoy, API gateway, Cloudflare) do coarse per-IP limits, and keep per-user and per-account limits in the app where you know who the user is.</p>
      <p><b>Answer with 429.</b> Status <code>429 Too Many Requests</code>, a <code>Retry-After</code> header in seconds, and optionally the remaining quota (<code>X-RateLimit-Remaining</code>, or the IETF <code>RateLimit</code> / <code>RateLimit-Policy</code> headers). Well-behaved clients back off; you can tell abusive ones apart because they do not.</p>`,
    clues: [
      '"Protect the login endpoint from brute force" → per-account and per-IP limits on <code>/auth/token</code>, progressive delay, MFA, breached-password checks',
      '"The rate limit works locally but not in production" → in-memory counters per worker/pod; move them to Redis',
      '"Every request has the same IP" → you are behind a proxy; configure <code>--proxy-headers</code> and <code>--forwarded-allow-ips</code>, trust X-Forwarded-For only from your proxy',
      '"Allow bursts but cap the average" → token bucket (capacity = burst, refill = average rate)',
      '"Our SMS/OTP or LLM endpoint costs money per call" → strict per-user and per-target limits plus spending caps (OWASP API6)',
      '"What should the client see?" → 429 + <code>Retry-After</code>; never 500 or a silent drop'
    ],
    code: [
      {
        lang: 'python', title: 'A Redis fixed-window limiter as a FastAPI dependency (shared by all workers)',
        code: `# pip install "redis>=5"
from typing import Annotated, Callable

import redis.asyncio as redis
from fastapi import Depends, FastAPI, HTTPException, Request, status

from app.config import get_settings

app = FastAPI()
pool = redis.from_url(get_settings().redis_url.get_secret_value(), decode_responses=True)


def rate_limit(name: str, limit: int, window_s: int, key_func: Callable[[Request], str]):
    """Allow 'limit' requests per 'window_s' seconds for each key."""
    async def dependency(request: Request) -> None:
        key = f"rl:{name}:{key_func(request)}"
        async with pool.pipeline(transaction=True) as pipe:
            pipe.incr(key)                       # atomic across every worker and pod
            pipe.expire(key, window_s, nx=True)  # set the TTL only on the first hit (Redis 7+)
            pipe.ttl(key)
            count, _, ttl = await pipe.execute()
        if count > limit:
            raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Too many requests",
                                headers={"Retry-After": str(max(ttl, 1))})
    return dependency


def client_ip(request: Request) -> str:
    # Correct only if Uvicorn runs with --proxy-headers --forwarded-allow-ips=<your proxy IPs>
    return request.client.host if request.client else "unknown"


@app.post("/auth/token", dependencies=[Depends(rate_limit("login-ip", 20, 900, client_ip))])
async def login() -> dict:
    # The per-ACCOUNT limit needs the username from the form; it is applied inside
    # the handler (see the login example) because the form is parsed there.
    return {"detail": "see Topic 2 for the body of this route"}


@app.get("/search", dependencies=[Depends(rate_limit("search", 60, 60, client_ip))])
async def search(q: str) -> list[str]:
    return []`
      },
      {
        lang: 'python', title: 'slowapi: decorator-style limits with a Redis backend',
        code: `# pip install slowapi
from fastapi import FastAPI, Request
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address, storage_uri="redis://localhost:6379/0",
                  headers_enabled=True)        # adds X-RateLimit-* and Retry-After headers
app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.post("/otp/send")
@limiter.limit("3/minute;10/hour")             # several windows at once
async def send_otp(request: Request) -> dict:  # slowapi needs the 'request' parameter
    return {"sent": True}`
      },
      {
        lang: 'python', run: true, title: 'Runnable: a token bucket with an injectable clock (stdlib only)',
        code: `import time


class TokenBucket:
    """capacity = burst size, rate = tokens added per second."""

    def __init__(self, capacity: int, rate: float, clock=time.monotonic):
        self.capacity, self.rate, self.clock = capacity, rate, clock
        self.tokens = float(capacity)                # start full
        self.last = clock()

    def allow(self, cost: float = 1.0) -> tuple[bool, float]:
        now = self.clock()
        self.tokens = min(self.capacity, self.tokens + (now - self.last) * self.rate)
        self.last = now
        if self.tokens >= cost:
            self.tokens -= cost
            return True, 0.0
        return False, (cost - self.tokens) / self.rate   # seconds until allowed: Retry-After


class FakeClock:
    def __init__(self):
        self.t = 0.0

    def __call__(self) -> float:
        return self.t


clock = FakeClock()
bucket = TokenBucket(capacity=3, rate=1.0, clock=clock)    # burst 3, then 1 per second
for t in [0, 0, 0, 0, 0.5, 1.0, 1.0, 4.0, 4.0, 4.0, 4.0]:
    clock.t = t
    ok, retry = bucket.allow()
    print(f"t={t:>4}s  {'200' if ok else '429'}" + ("" if ok else f"  Retry-After={retry:.1f}s"))

# One bucket per key: in production these would live in Redis, not a dict.
buckets: dict[str, TokenBucket] = {}
def allow_for(key: str) -> bool:
    return buckets.setdefault(key, TokenBucket(5, 0.5, clock)).allow()[0]
print("per-user:", [allow_for("user:7") for _ in range(6)], "other user:", allow_for("user:8"))`
      }
    ],
    codeTitle: ['Redis limiter dependency', 'slowapi', 'Runnable token bucket'],
    viz: {
      title: 'Token bucket: burst, empty, refill',
      input: 'capacity=3 rate=1 times=0,0,0,0,0.5,1,1,3,3,3,3',
      inputLabel: 'capacity=N rate=tokens-per-second times=comma-separated seconds (non-decreasing)',
      gen: function (input) {
        var o = kvParse(input, 'capacity=3 rate=1 times=0,0,0,0,1');
        var cap = Math.min(20, Math.max(1, parseInt(o.capacity || '3', 10)));
        var rate = parseFloat(o.rate || '1');
        if (!(rate > 0) || !(cap >= 1)) throw new Error('capacity must be ≥ 1 and rate > 0');
        var times = String(o.times || '0,0,0,0,1').split(',').map(Number).slice(0, 24);
        if (times.some(function (t, i) { return isNaN(t) || t < 0 || (i && t < times[i - 1]); })) throw new Error('times must be non-decreasing numbers, e.g. 0,0,0,0.5,1');
        var tokens = cap, last = times.length ? times[0] : 0, after = [], labels = [], verdict = {}, f = [];
        f.push({ narr: 'The bucket starts <b>full</b> with ' + cap + ' tokens and refills at ' + rate + ' token(s) per second, never above ' + cap + '. Each request takes one token; no token means <b>429</b>.', parts: [{ type: 'vars', label: 'Bucket', vals: { capacity: cap, rate: rate + '/s', tokens: cap } }] });
        times.forEach(function (t, i) {
          var add = (t - last) * rate;
          var before = Math.min(cap, tokens + add);
          last = t;
          var ok = before >= 1 - 1e-9;
          tokens = ok ? before - 1 : before;
          after.push(Math.round(tokens * 100) / 100);
          labels.push('t=' + t);
          verdict[i] = ok ? 'ok' : 'bad';
          var retry = ok ? 0 : (1 - before) / rate;
          f.push({ narr: 'Request ' + (i + 1) + ' at t=' + t + 's. Refill: +' + (Math.round(add * 100) / 100) + ' → ' + (Math.round(before * 100) / 100) + ' token(s) available. ' + (ok ? 'Take one: <b>allowed</b>.' : 'Less than one token: <b>429</b> with <code>Retry-After: ' + Math.max(1, Math.ceil(retry)) + '</code>.'), parts: [{ type: 'bars', label: 'Tokens left after each request', values: after.slice(), idxLabels: labels.slice(), hl: Object.assign({}, verdict), texts: after.map(function (v, k) { return verdict[k] === 'ok' ? '✓ ' + v : '✗ ' + v; }) }, { type: 'vars', label: 'This request', vals: { time: t + 's', 'available before': Math.round(before * 100) / 100, result: ok ? '200' : '429' }, hl: { result: ok ? 'ok' : 'bad' } }] });
        });
        var allowed = Object.keys(verdict).filter(function (k) { return verdict[k] === 'ok'; }).length;
        f.push({ narr: allowed + ' of ' + times.length + ' requests allowed. Bursts up to ' + cap + ' pass instantly; after that the bucket enforces ' + rate + ' per second on average. In production this state lives in Redis, keyed by user, API key or IP.', parts: [{ type: 'vars', label: 'Summary', vals: { allowed: allowed, rejected: times.length - allowed } }] });
        if (f.length < 4) f.push({ narr: 'Add more request times to see the bucket empty and refill.', parts: [{ type: 'text', html: 'Example: <code>times=0,0,0,0,0.5,1</code>' }] });
        return f;
      }
    },
    examples: [
      {
        title: 'Throttling the login endpoint per account and per IP',
        html: `<p>Credential stuffing uses thousands of IPs with one password each, so a per-IP limit alone misses it; password spraying tries one password across many accounts. Use both keys. Count <b>failures</b> per account (5 per 15 minutes, then slow down), all attempts per IP (20 per 15 minutes), and do not hard-lock the account (an attacker could lock out your CEO on purpose). The answer to a throttled login is still the generic 401 or a 429; never "this account is locked", which confirms the account exists.</p>`,
        code: { lang: 'python', run: true, code: `from collections import defaultdict

WINDOW, MAX_FAILS = 900, 5
fails: dict[str, list[float]] = defaultdict(list)      # Redis sorted sets in production


def login_allowed(account: str, now: float) -> bool:
    recent = [t for t in fails[account] if now - t < WINDOW]
    fails[account] = recent
    return len(recent) < MAX_FAILS


def record_failure(account: str, now: float) -> None:
    fails[account].append(now)


for i in range(7):
    now = i * 10.0
    ok = login_allowed("asha@example.com", now)
    print(f"attempt {i + 1} at {now:>4}s -> {'try password' if ok else '429 Retry later'}")
    if ok:
        record_failure("asha@example.com", now)
print("16 minutes later:", login_allowed("asha@example.com", 60 + 960))` }
      },
      {
        title: 'The real client IP behind a load balancer',
        html: `<p>Behind nginx or a cloud load balancer, <code>request.client.host</code> is the balancer's address, so every user shares one bucket. Run <code>uvicorn app.main:app --proxy-headers --forwarded-allow-ips="10.0.0.0/8"</code> (your proxies' range) so Uvicorn takes the client address from <code>X-Forwarded-For</code>, but only when the request came from a trusted proxy. Never read <code>X-Forwarded-For</code> yourself from any request: clients can send that header with any value and pick a fresh "IP" for every attempt.</p>`
      },
      {
        title: 'Costly endpoints: limit by money, not just requests',
        html: `<p>An endpoint that calls an LLM costs per token; one that sends SMS costs per message and can be abused to spam a victim's phone ("SMS pumping"). Limit per user <i>and</i> per destination phone number, cap daily spend per account, and require a verified account for expensive actions. Use a weighted token bucket: <code>bucket.allow(cost=estimated_tokens / 1000)</code>, so one huge prompt counts as many small ones.</p>`
      },
      {
        title: 'What a good 429 looks like',
        html: `${H.table(['Header / field', 'Value', 'Why'], [['status', '429', 'clients and SDKs know to back off'], ['Retry-After', '<code>12</code>', 'seconds until the next token (or an HTTP date)'], ['RateLimit-Policy', '<code>"default";q=60;w=60</code>', 'the quota (IETF draft format)'], ['body', '<code>{"detail": "Too many requests"}</code>', 'same error shape as everything else']])}
        <p>Log rejected keys with counts. A client that keeps hammering after 429 is a bot; feed it to your WAF or block list.</p>`
      }
    ],
    deepDive: `<p>🟣 <b>Atomicity.</b> "Read the counter, add one, write it back" from two workers at once loses updates and lets extra requests through. Redis <code>INCR</code> is atomic; for token buckets or sliding windows that need several reads and writes, run them in a Lua script (<code>EVALSHA</code>) so Redis executes them as one step. The <code>redis-py</code> client supports <code>register_script</code> for this.</p>
      <p><b>GCRA</b> (Generic Cell Rate Algorithm) stores a single timestamp per key, the "theoretical arrival time" (TAT). A request at time <i>t</i> is allowed if <i>t</i> ≥ TAT − burst_tolerance, and then TAT = max(TAT, t) + emission_interval. It behaves like a token bucket with one number of state, which is why libraries such as <code>redis-cell</code> and many gateways use it (see the Hard practice problem).</p>
      <p><b>Failure mode.</b> If Redis is down, do you fail open (allow everything) or closed (reject everything)? For general endpoints fail open with an alert, so a cache outage does not become a full outage; for login, OTP and payment endpoints fail closed or fall back to a strict local limit.</p>
      <p><b>Layering.</b> Edge (CDN/WAF): coarse per-IP floods and bots. Gateway: per-API-key quotas. App: per-user, per-account and per-business-action limits, since only the app knows those identities. Also cap request work itself: body size, page size (<code>limit ≤ 100</code>), upload size, query timeouts, and GraphQL depth if you have it.</p>
      <p><b>Fairness and plans.</b> Paid tiers get bigger buckets; internal services get separate keys so a batch job cannot starve customers. Return the remaining quota so clients can pace themselves rather than discover the limit by failing.</p>`,
    aiEra: `<p>🤖 AI changes rate limiting in two ways. Attackers use AI agents and residential proxy networks to make traffic look human and spread it across many IPs, so per-IP limits alone are weaker every year; per-account, per-action and behavioural signals matter more. And your own AI features are the most expensive endpoints you own: an unthrottled "summarise" endpoint can burn your monthly LLM budget overnight. Limit them by user and by tokens, not requests. Assistants write decent limiter code, but often in-memory (broken with multiple workers) or with a non-atomic get-then-set on Redis. Ask explicitly for "atomic Redis Lua script, shared across workers, with Retry-After", and test it with concurrent requests.</p>`,
    problems: [
      {
        title: 'Implement a Token Bucket Rate Limiter',
        level: 'Medium', tags: ['rate limiting', 'token bucket', 'simulation'], companies: ['Stripe', 'Cloudflare', 'Flipkart'],
        statement: `<p>Write <code>token_bucket(capacity, refill_per_sec, times_ms)</code>. The bucket starts <b>full</b>; its clock starts at the first request's time. For each request time (milliseconds, non-decreasing): add <code>elapsed_ms × refill_per_sec / 1000</code> tokens (never above <code>capacity</code>), then if at least one whole token is available take it and output <code>true</code>, otherwise output <code>false</code>. Return the list of booleans.</p>
          <p>Use exact arithmetic: keep the balance in <b>milli-tokens</b> (integers) so 3 × 0.1 never becomes 0.30000000000000004.</p>`,
        constraints: `1 ≤ capacity ≤ 10<sup>6</sup>, 1 ≤ refill_per_sec ≤ 10<sup>6</sup>, 0 ≤ len(times_ms) ≤ 10<sup>5</sup>, 0 ≤ times_ms[i] ≤ 10<sup>12</sup>, non-decreasing.`,
        example: `${H.table(['capacity', 'rate', 'times (ms)', 'result', 'why'], [['3', '1', '0, 0, 0, 0, 1000', 'T T T <span class="c-r">F</span> T', 'burst of 3, the 4th finds 0 tokens, one second later one token is back'], ['1', '2', '0, 100, 500, 600, 1000', 'T <span class="c-r">F</span> T <span class="c-r">F</span> T', '2 tokens/s = one token every 500 ms']])}`,
        brute: {
          why: `<p>Store every request time and count those in the last second ("sliding log"). It works but keeps up to <i>rate × window</i> timestamps per key, and it does not model bursts the way the product wants. A token bucket needs two numbers per key: balance and last refill time.</p>`,
          code: { lang: 'python', code: `def token_bucket(capacity: int, refill_per_sec: int, times_ms: list[int]) -> list[bool]:
    log: list[int] = []
    out = []
    for t in times_ms:
        log = [x for x in log if t - x < 1000]        # O(n) per request, memory grows with traffic
        ok = len(log) < capacity
        if ok:
            log.append(t)
        out.append(ok)
    return out                                       # ignores refill_per_sec entirely` }
        },
        mcq: { q: 'Your limiter keeps buckets in a Python dict and the app runs with <code>--workers 4</code> on 3 pods. A user\'s real limit is…', options: ['Up to 12× the configured limit, one bucket per process', 'Exactly the configured limit', '4× the limit', '1/12 of the limit'], answer: 0, explain: 'Each process has its own dict and the load balancer spreads requests, so each of the 12 processes allows the full quota. Shared state (Redis) fixes it.' },
        hints: [
          `<p>Hint 1: the state is just two integers: <code>milli</code> (balance × 1000) and <code>last</code> (time of the previous request). Start with <code>milli = capacity * 1000</code>.</p>`,
          `<p>Hint 2: on each request, <code>milli = min(capacity * 1000, milli + (t - last) * refill_per_sec)</code>: elapsed ms × tokens/s is exactly milli-tokens.</p>`,
          `<p>Hint 3: allowed when <code>milli &gt;= 1000</code>; subtract 1000. Empty input returns an empty list. Large idle gaps must not overflow the cap (Python ints are unbounded anyway, but the min keeps the balance right).</p>`
        ],
        solution: {
          approach: `<p>Lazy refill: do not run a timer; compute the refill when a request arrives from the elapsed time. Integer milli-tokens make every boundary exact (a request exactly 1000 ms later at rate 1 always gets its token). In production the two numbers live in a Redis hash updated by a Lua script, keyed per user or API key, and a rejected request turns into <code>429</code> with <code>Retry-After = ceil((1000 - milli) / refill_per_sec)</code> milliseconds converted to seconds.</p>`,
          code: { lang: 'python', run: true, code: `def token_bucket(capacity: int, refill_per_sec: int, times_ms: list[int]) -> list[bool]:
    full = capacity * 1000
    milli = full                       # balance in thousandths of a token
    last = times_ms[0] if times_ms else 0
    out: list[bool] = []
    for t in times_ms:
        milli = min(full, milli + (t - last) * refill_per_sec)   # ms * tokens/s = milli-tokens
        last = t
        if milli >= 1000:
            milli -= 1000
            out.append(True)
        else:
            out.append(False)
    return out


print(token_bucket(3, 1, [0, 0, 0, 0, 1000]))
print(token_bucket(1, 2, [0, 100, 500, 600, 1000]))` },
          complexity: `<p>O(n) time for n requests, O(1) state per key, which is why token buckets scale to millions of keys in Redis.</p>`,
          followUps: ['How do you compute <code>Retry-After</code> for a rejected request?', 'Write the Redis Lua script that does one step of this atomically.', 'How would you charge 5 tokens for an expensive endpoint?']
        },
        tests: { fn: 'tokenBucket', names: { python: 'token_bucket' }, sig: 'int int long[] -> bool[]', cases: [
          [[3, 1, [0, 0, 0, 0]], [true, true, true, false]],
          [[3, 1, [0, 0, 0, 0, 1000]], [true, true, true, false, true]],
          [[3, 1, [0, 0, 0, 500, 999, 1000]], [true, true, true, false, false, true]],
          [[1, 2, [0, 100, 500, 600, 1000]], [true, false, true, false, true]],
          [[2, 1, []], []],
          [[5, 10, [0, 0, 0, 0, 0, 0, 50, 100]], [true, true, true, true, true, false, false, true]],
          [[2, 1, [0, 0, 100000, 100000, 100000]], [true, true, true, true, false]],
          [[1, 1, [5000, 5500, 6000, 6000]], [true, false, true, false]],
          [[1000000, 1000000, [0, 1000000000000]], [true, true]]
        ] }
      }
    ]
  });

  /* =====================================================================
     TOPIC 7 — Input validation and the OWASP API checks for Python
     ===================================================================== */
  topics.push({
    title: 'Input Validation and the OWASP API Top 10 for Python: Pydantic as an Allow-List, Dangerous Calls, Hardening',
    analogy: `<p>An airport has <b>several checkpoints</b>, not one. Check-in confirms you have a ticket (authentication). The gate checks it is <i>this</i> flight (authorization, ownership). Security scans your bag against a list of what is allowed, by shape and size (validation). And the plane's door is locked from the inside no matter what (safe defaults). An attacker only needs one checkpoint to be missing.</p>`,
    explain: `<p>🟢 <b>Validate with an allow-list, at the edge.</b> Describe what good input looks like and reject everything else. In FastAPI that is a <b>Pydantic model</b>: types, lengths, ranges, patterns, enums, and <code>extra="forbid"</code> so unknown fields are a 422 instead of silently ignored or, worse, copied into your database. Validation is your first defence against injection and mass assignment, but not the only one: you still use parameterised queries, ownership checks and safe APIs behind it.</p>
      <p><b>The OWASP API Security Top 10 (2023) mapped to FastAPI.</b></p>
      ${H.table(['Risk', 'What it looks like in a Python API', 'Main defence'], [
        ['API1 Broken Object Level Authorization', '<code>GET /invoices/{id}</code> returns anyone\'s invoice', 'ownership filter in the query (Topic 3)'],
        ['API2 Broken Authentication', 'no rate limit on <code>/token</code>, tokens without <code>exp</code>/<code>aud</code>', 'Topics 1, 2, 6'],
        ['API3 Broken Object Property Level Authorization', 'client sets <code>is_admin</code>; response leaks <code>password_hash</code>', 'separate In/Out models, <code>extra="forbid"</code>, <code>response_model</code>'],
        ['API4 Unrestricted Resource Consumption', '<code>?limit=1000000</code>, 2 GB uploads, no timeouts', '<code>Field(le=100)</code>, body size limits, rate limits'],
        ['API5 Broken Function Level Authorization', '<code>/admin/*</code> reachable with a customer token', 'router-level permission dependencies'],
        ['API6 Unrestricted Access to Sensitive Business Flows', 'bots buying all tickets, OTP spam', 'per-account/action limits, CAPTCHA, anomaly checks'],
        ['API7 Server-Side Request Forgery', '"fetch this avatar URL" hits <code>169.254.169.254</code>', 'URL allow-list, block private IPs, no redirects'],
        ['API8 Security Misconfiguration', '<code>debug=True</code>, open <code>/docs</code>, CORS wildcard, verbose errors', 'settings validation, hardened app factory'],
        ['API9 Improper Inventory Management', 'forgotten <code>/v1</code> or staging API still live', 'OpenAPI export in CI, retire old versions'],
        ['API10 Unsafe Consumption of APIs', 'trusting a partner API\'s JSON blindly', 'validate third-party responses with Pydantic too, timeouts']
      ])}
      <p><b>Python calls that should make a reviewer stop.</b> <code>eval</code>/<code>exec</code> on input; <code>pickle.loads</code> on anything untrusted (runs code); <code>yaml.load</code> without <code>SafeLoader</code> (use <code>yaml.safe_load</code>); <code>subprocess</code> with <code>shell=True</code>; f-strings inside SQL (<code>text(f"... {name}")</code>); <code>open(base + user_path)</code> (path traversal); <code>tarfile.extractall</code> without <code>filter="data"</code>; <code>xml.etree</code> on untrusted XML (use <code>defusedxml</code>); <code>random</code> for tokens (use <code>secrets</code>); <code>assert</code> for security checks (removed by <code>python -O</code>); <code>requests.get(user_url)</code> (SSRF). Tools like <b>bandit</b> or ruff's <code>S</code> rules flag most of them automatically, and <b>pip-audit</b> checks your dependencies for known CVEs.</p>`,
    clues: [
      '"A user made himself admin by adding a field to the JSON" → mass assignment (API3): input model without that field, <code>extra="forbid"</code>',
      '"Our API returns the password hash" → output model / <code>response_model</code> that lists only public fields',
      '"Fetch an image from a URL the user gives us" → SSRF: scheme and host allow-list, resolve and block private/link-local IPs, no redirects, timeouts',
      '"Download a file by name" → path traversal: resolve the path and require it to stay inside the base directory',
      '"Load a config/YAML/pickle uploaded by users" → <code>yaml.safe_load</code>, never <code>pickle</code> for untrusted data',
      '"Can someone send a 1 GB JSON body?" → yes by default; cap at the proxy and in middleware, cap list lengths in models'
    ],
    code: [
      {
        lang: 'python', title: 'Pydantic models as allow-lists: strict input, filtered output, bounded queries',
        code: `from typing import Annotated, Literal

from fastapi import FastAPI, Query
from pydantic import BaseModel, ConfigDict, EmailStr, Field, HttpUrl, StringConstraints

Username = Annotated[str, StringConstraints(strip_whitespace=True, min_length=3, max_length=30,
                                            pattern=r"^[a-z0-9_]+$")]


class ProfileUpdate(BaseModel):
    # Unknown keys such as "is_admin" or "role" are a 422, never silently accepted.
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    display_name: Annotated[str, Field(min_length=1, max_length=50)] | None = None
    username: Username | None = None
    avatar_url: HttpUrl | None = None                 # checked again for SSRF before fetching
    theme: Literal["light", "dark", "system"] | None = None
    tags: Annotated[list[Annotated[str, Field(max_length=20)]], Field(max_length=10)] = []


class SignupIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    email: EmailStr                                   # pip install "pydantic[email]"
    password: Annotated[str, Field(min_length=8, max_length=64)]


class UserOut(BaseModel):
    # What may LEAVE the server. No password_hash, no role, no internal flags.
    id: int
    username: str
    display_name: str | None = None


app = FastAPI()


@app.get("/users", response_model=list[UserOut])
def list_users(limit: Annotated[int, Query(ge=1, le=100)] = 20,     # API4: bounded page size
               offset: Annotated[int, Query(ge=0, le=10_000)] = 0) -> list[dict]:
    return []`
      },
      {
        lang: 'python', title: 'A hardened app factory: docs, hosts, headers, body size, errors',
        code: `from fastapi import FastAPI, Request
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import get_settings

MAX_BODY = 1 * 1024 * 1024        # 1 MiB for JSON APIs; uploads get their own route and limit


class SecurityHeaders(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        declared = request.headers.get("content-length")
        if declared is not None and (not declared.isdigit() or int(declared) > MAX_BODY):
            return JSONResponse({"detail": "Request body too large"}, status_code=413)
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
        response.headers["Cache-Control"] = "no-store"          # API responses with personal data
        return response


def create_app() -> FastAPI:
    s = get_settings()
    prod = s.env == "prod"
    app = FastAPI(debug=False,
                  docs_url=None if prod else "/docs",            # API8: no public docs in prod
                  redoc_url=None if prod else "/redoc",
                  openapi_url=None if prod else "/openapi.json")
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=["api.example.com", "localhost"])
    app.add_middleware(SecurityHeaders)

    @app.exception_handler(Exception)
    async def unhandled(request: Request, exc: Exception) -> JSONResponse:
        # Log the details server-side with a request id; never send stack traces to clients.
        return JSONResponse({"detail": "Internal server error"}, status_code=500)

    return app

# Note: Content-Length can be absent (chunked uploads). Enforce the hard limit at the
# proxy too (nginx client_max_body_size 1m), and stream-count bytes for upload routes.`
      },
      {
        lang: 'python', run: true, title: 'Runnable: path traversal and SSRF guards (stdlib only)',
        code: `import ipaddress
from pathlib import PurePosixPath
from urllib.parse import urlsplit

BASE = PurePosixPath("/srv/app/uploads")


def safe_file(user_path: str) -> str | None:
    """Join and normalise; refuse anything that escapes BASE."""
    parts = []
    for part in PurePosixPath(user_path).parts:
        if part in ("/", "."):
            continue
        if part == "..":
            if not parts:
                return None                 # tried to climb above BASE
            parts.pop()
        else:
            parts.append(part)
    return str(BASE.joinpath(*parts)) if parts else None


ALLOWED_HOSTS = {"images.example-cdn.com"}


def safe_fetch_target(url: str) -> str:
    u = urlsplit(url)
    if u.scheme != "https":
        return "reject: only https"
    if u.username or u.password:
        return "reject: credentials in URL"
    host = (u.hostname or "").lower()
    try:
        ip = ipaddress.ip_address(host)
    except ValueError:
        ip = None
    if ip is not None:
        if not ip.is_global:                # private, loopback, link-local (cloud metadata), reserved
            return "reject: non-public IP " + str(ip)
        return "ok (public IP; still resolve-and-pin before connecting)"
    if host not in ALLOWED_HOSTS:
        return "reject: host not on allow-list"
    return "ok"


for p in ["avatar.png", "2026/10/me.jpg", "../../etc/passwd", "a/../../secrets.env", "/etc/shadow"]:
    print(f"{p:22} -> {safe_file(p)}")
for url in ["https://images.example-cdn.com/a.png", "http://images.example-cdn.com/a.png",
            "https://169.254.169.254/latest/meta-data/", "https://127.0.0.1:8000/admin",
            "https://user:pw@images.example-cdn.com/", "https://evil.example.net/x.png"]:
    print(f"{url:44} -> {safe_fetch_target(url)}")`
      }
    ],
    codeTitle: ['Pydantic allow-lists', 'Hardened app factory', 'Runnable path and SSRF guards'],
    viz: {
      title: 'A PATCH /users/{id} request through every checkpoint',
      input: 'caller=5 target=5 fields=display_name,is_admin size=300',
      inputLabel: 'caller=id target=id fields=a,b (display_name, username, theme, is_admin, role…) size=bytes',
      gen: function (input) {
        var o = kvParse(input, 'caller=5 target=5 fields=display_name size=300');
        var caller = o.caller || '5', target = o.target || '5', size = parseInt(o.size || '300', 10);
        if (isNaN(size) || size < 0) throw new Error('size must be a number of bytes');
        var fields = (o.fields || 'display_name').split(',').filter(Boolean).slice(0, 8);
        var known = ['display_name', 'username', 'avatar_url', 'theme', 'tags'];
        var stages = ['body size ≤ 1 MiB', 'token valid (401)', 'caller may edit target (BOLA)', 'body matches ProfileUpdate (extra="forbid")', 'rate limit', 'response_model=UserOut'];
        var rows = [], f = [];
        function tbl(hl) { return { type: 'table', label: 'Checkpoints', columns: ['#', 'check', 'result'], rows: rows.slice(), hl: hl }; }
        f.push({ narr: 'Request: <code>PATCH /users/' + hesc(target) + '</code> by user ' + hesc(caller) + ' with JSON fields <code>' + hesc(fields.join(', ')) + '</code> (' + size + ' bytes). It must pass every checkpoint, in this order, cheapest first.', parts: [{ type: 'table', label: 'Pipeline', columns: ['#', 'check'], rows: stages.map(function (s, i) { return [String(i + 1), s]; }) }] });
        if (size > 1048576) {
          rows.push(['1', stages[0], 'NO: ' + size + ' bytes']);
          f.push({ narr: 'The middleware sees <code>Content-Length: ' + size + '</code> and answers <b>413</b> before reading the body or touching auth. Big bodies are a cheap way to exhaust memory (API4).', parts: [tbl({ 0: 'bad' }), { type: 'vars', label: 'Response', vals: { status: 413 }, hl: { status: 'bad' } }] });
          f.push({ narr: 'The proxy (nginx <code>client_max_body_size</code>) should enforce the same limit, because chunked bodies have no Content-Length.', parts: [tbl({ 0: 'bad' })] });
          f.push({ narr: 'Nothing else ran: no DB query, no hashing, no logging of the body.', parts: [tbl({ 0: 'bad' })] });
          return f;
        }
        rows.push(['1', stages[0], 'ok']);
        rows.push(['2', stages[1], 'ok (sub=' + hesc(caller) + ')']);
        f.push({ narr: 'Size is fine and <code>get_current_user</code> verifies the token: the caller is user ' + hesc(caller) + '.', parts: [tbl({ 0: 'ok', 1: 'ok' })] });
        if (caller !== target) {
          rows.push(['3', stages[2], 'NO: user ' + hesc(caller) + ' ≠ ' + hesc(target)]);
          f.push({ narr: 'Ownership: a customer may only edit their own profile. The update query includes <code>WHERE id = :target AND id = :caller</code>; no row matches, so answer <b>404</b> (API1, BOLA).', parts: [tbl({ 2: 'bad' }), { type: 'vars', label: 'Response', vals: { status: 404 }, hl: { status: 'bad' } }] });
          f.push({ narr: 'Admins edit other users through a separate <code>/admin/users/{id}</code> router guarded by a permission dependency (API5), with its own input model and audit log.', parts: [tbl({ 2: 'bad' })] });
          return f;
        }
        rows.push(['3', stages[2], 'ok (own profile)']);
        var extra = fields.filter(function (x) { return known.indexOf(x) < 0; });
        if (extra.length) {
          rows.push(['4', stages[3], 'NO: extra ' + extra.join(', ')]);
          f.push({ narr: 'Pydantic rejects the unknown field(s) <code>' + hesc(extra.join(', ')) + '</code> because the model says <code>extra="forbid"</code>. Without that, a careless <code>setattr(user, k, v)</code> loop would have made this user an admin (API3, mass assignment).', parts: [tbl({ 3: 'bad' }), { type: 'map', label: '422 detail', entries: extra.map(function (x) { return [JSON.stringify(['body', x]), 'extra_forbidden: Extra inputs are not permitted']; }) }] });
          f.push({ narr: 'The client gets <b>422</b> with one error per bad field. Nothing was written.', parts: [{ type: 'vars', label: 'Response', vals: { status: 422 }, hl: { status: 'bad' } }] });
          return f;
        }
        rows.push(['4', stages[3], 'ok']);
        rows.push(['5', stages[4], 'ok (3 of 30 per minute)']);
        f.push({ narr: 'The body matches the allow-list model and the per-user write limit has room. The service applies only the fields that were set: <code>body.model_dump(exclude_unset=True)</code>.', parts: [tbl({ 3: 'ok', 4: 'ok' }), pyc('Service', 'changes = body.model_dump(exclude_unset=True)\nfor field, value in changes.items():\n    setattr(user, field, value)   # safe: only ProfileUpdate fields exist\ndb.commit()', { 1: 'ok' })] });
        rows.push(['6', stages[5], 'ok: id, username, display_name only']);
        f.push({ narr: 'The ORM object has <code>password_hash</code>, <code>role</code> and <code>email_verified</code>, but <code>response_model=UserOut</code> filters the reply to public fields. <b>200</b>.', parts: [tbl({ 5: 'ok' }), { type: 'vars', label: 'Response', vals: { status: 200, body: '{"id":' + hesc(target) + ',"username":"asha","display_name":"Asha"}' }, hl: { status: 'ok' } }] });
        return f;
      }
    },
    examples: [
      {
        title: 'SQL injection is still possible with SQLAlchemy',
        html: `<p>The ORM protects you only when you let it bind values. <code>text(f"SELECT * FROM users WHERE name = '{name}'")</code> is as injectable as raw string SQL. Use bound parameters, and for dynamic <code>ORDER BY</code> columns (which cannot be bound) map user input through an allow-list.</p>`,
        code: { lang: 'python', code: `from sqlalchemy import select, text

from app.models import User

SORTABLE = {"name": User.name, "created": User.created_at}


def find_by_name(db, name: str):
    return db.execute(text("SELECT id, name FROM users WHERE name = :name"), {"name": name}).all()


def list_sorted(db, sort: str):
    column = SORTABLE.get(sort, User.created_at)       # never getattr(User, sort) on raw input
    return db.scalars(select(User).order_by(column)).all()` }
      },
      {
        title: 'Shelling out safely',
        html: `<p>Converting an uploaded image with ImageMagick? <code>subprocess.run(f"convert {name} out.png", shell=True)</code> lets a file named <code>x.png; rm -rf /</code> run a second command. Pass a <b>list</b> of arguments with no shell, validate the name against a strict pattern, put <code>--</code> before file arguments, and set a timeout.</p>`,
        code: { lang: 'python', code: `import re
import subprocess

SAFE_NAME = re.compile(r"[A-Za-z0-9_-]{1,64}[.](png|jpg|jpeg)")


def thumbnail(name: str) -> None:
    if not SAFE_NAME.fullmatch(name):
        raise ValueError("bad file name")
    subprocess.run(["magick", "--", name, "-resize", "256x256", "thumb.png"],
                   check=True, timeout=10, shell=False)` }
      },
      {
        title: 'A ten-line "bandit": find dangerous calls with the ast module',
        html: `<p>Static checkers parse your code and look for risky calls. Here is the idea in the standard library. In real projects run <code>bandit -r app/</code> or enable ruff's <code>S</code> rules in CI, plus <code>pip-audit</code> for vulnerable dependencies.</p>`,
        code: { lang: 'python', run: true, code: `import ast

SOURCE = '''
import pickle, subprocess, yaml, hashlib
data = pickle.loads(body)
cfg = yaml.load(text)
subprocess.run(cmd, shell=True)
digest = hashlib.md5(password.encode()).hexdigest()
value = eval(user_expr)
safe = yaml.safe_load(text)
'''
RISKY = {"pickle.loads": "untrusted pickle runs code", "yaml.load": "use yaml.safe_load",
         "eval": "never eval input", "hashlib.md5": "not for passwords"}

for node in ast.walk(ast.parse(SOURCE)):
    if isinstance(node, ast.Call):
        name = ast.unparse(node.func)
        if name in RISKY:
            print(f"line {node.lineno}: {name} -> {RISKY[name]}")
        if any(k.arg == "shell" and getattr(k.value, "value", False) is True for k in node.keywords):
            print(f"line {node.lineno}: shell=True -> pass a list, no shell")` }
      },
      {
        title: 'Validating what partners send you (API10)',
        html: `<p>A payment provider's webhook says <code>{"status": "paid", "amount": "100.00"}</code>. Treat it like user input: verify the HMAC signature header with <code>hmac.compare_digest</code> (secret from settings), parse the body into a strict Pydantic model, check the amount against your own order record, and make the handler idempotent by event id. Use timeouts on every outbound call (<code>httpx.Client(timeout=5)</code>) so a slow partner cannot hang your workers.</p>`
      }
    ],
    deepDive: `<p>🟣 <b>Validation vs sanitisation vs encoding.</b> <i>Validation</i> rejects input that is not the expected shape. <i>Sanitisation</i> changes input to make it safe (strip HTML tags) and is easy to get wrong. <i>Output encoding</i> makes data safe for a specific sink (HTML escaping in templates, parameter binding in SQL, argument lists for processes). An API should validate on the way in and encode for each sink on the way out; JSON APIs mostly avoid XSS as long as the frontend does not inject strings as HTML.</p>
      <p><b>Pydantic details that matter for security.</b> Lax mode coerces <code>"123"</code> to <code>123</code>, which is usually fine; use <code>strict=True</code> on fields where type confusion matters (booleans in permission flags). <code>max_length</code> on lists and strings bounds memory. Regexes run in Python's backtracking engine: avoid nested quantifiers like <code>(a+)+</code> on user input (ReDoS); pydantic-core uses a Rust regex engine for <code>pattern</code> by default, which is linear time, but your own <code>re</code> calls are not.</p>
      <p><b>SSRF done properly.</b> Checking the hostname string is not enough: <code>images.example.com</code> may resolve to <code>10.0.0.5</code>, DNS can change between check and use (rebinding), and redirects can bounce to internal hosts. Resolve once, check every resolved IP with <code>ipaddress</code> (<code>is_global</code>), connect to that IP with the right Host/SNI, disable redirects, set timeouts and a response size cap, or route outbound fetches through an egress proxy that enforces the allow-list. On AWS, require IMDSv2 so metadata needs a token.</p>
      <p><b>Error messages.</b> Pydantic's 422 echoes the bad <code>input</code> value back by default. For password and token fields that means the secret appears in responses and possibly logs; customise the validation error handler to drop <code>input</code> for sensitive fields.</p>
      <p><b>Inventory.</b> Export <code>openapi.json</code> in CI and diff it: a new endpoint or an endpoint that lost its security requirement shows up in code review (API9). Retire old versions with a date, and make sure staging is not on the public internet with production data.</p>`,
    aiEra: `<p>🤖 Code assistants reproduce insecure patterns at scale: <code>text(f"...")</code> SQL, <code>shell=True</code>, <code>yaml.load</code>, <code>requests.get(url)</code> with a user URL and no checks, and models without <code>extra="forbid"</code>. They also generate "update" endpoints that loop over the request dict and <code>setattr</code> every key: textbook mass assignment. Use AI the other way too: ask it to review a router against the OWASP API Top 10 and list concrete findings with line numbers, then verify each one yourself and turn true findings into tests. Run bandit/ruff-S and pip-audit in CI so the boring checks never depend on anyone's attention. New with LLM features: user text that reaches a model can carry instructions (prompt injection), so the model's output is untrusted input too; validate it with Pydantic before acting on it, and never let it pick SQL, URLs or shell commands directly.</p>`,
    problems: [
      {
        title: 'Harden a Profile-Update Endpoint',
        level: 'Medium', tags: ['mass assignment', 'BOLA', 'Pydantic', 'OWASP API'], companies: ['GitHub', 'Shopify'],
        statement: `<p>This endpoint shipped last week. Find every OWASP API issue and rewrite it.</p>
          <pre>@app.patch("/users/{user_id}")
async def update_user(user_id: int, request: Request, db: Session = Depends(get_session)):
    data = await request.json()
    user = db.get(User, user_id)
    for key, value in data.items():
        setattr(user, key, value)
    db.commit()
    return user.__dict__</pre>`,
        constraints: `FastAPI, SQLAlchemy 2.0, Pydantic v2. Customers may edit only their own display_name, username, avatar_url and theme. Admins use a separate admin route.`,
        example: `${H.table(['Attack', 'Old behaviour', 'New behaviour'], [['PATCH /users/8 as user 7', '<span class="c-r">200, edits user 8</span>', '<span class="c-g">404</span>'], ['body {"role": "admin"}', '<span class="c-r">200, user is now admin</span>', '<span class="c-g">422 extra_forbidden</span>'], ['body {"display_name": "x" * 10<sup>6</sup>}', '<span class="c-r">stored</span>', '<span class="c-g">422 string_too_long</span> (or 413)'], ['any successful call', '<span class="c-r">returns password_hash</span>', '<span class="c-g">UserOut fields only</span>']])}`,
        brute: {
          why: `<p>Adding <code>if "role" in data: del data["role"]</code>. That is a deny-list: next month someone adds <code>is_staff</code>, <code>credit_cents</code> or <code>email_verified</code> to the model and the hole reopens. The fix is an allow-list model plus ownership and output filtering.</p>`,
          code: { lang: 'python', code: `for banned in ("role", "is_admin"):          # deny-list: misses every future field
    data.pop(banned, None)
for key, value in data.items():
    setattr(user, key, value)` }
        },
        mcq: { q: 'Which single change stops the mass-assignment bug most reliably?', options: ['Accept a Pydantic model with only the editable fields and <code>extra="forbid"</code>', 'Delete <code>role</code> from the dict before saving', 'Check the request in the frontend', 'Rename the <code>role</code> column'], answer: 0, explain: 'An allow-list model defines exactly what may be written; unknown keys become a 422. Deny-lists and frontend checks are bypassed easily.' },
        hints: [
          `<p>Hint 1: count the problems: no authentication, no ownership check (BOLA), raw dict with setattr (mass assignment), no size limits, the whole ORM object returned (property exposure), and <code>None</code> user crashes with a 500.</p>`,
          `<p>Hint 2: use <code>/users/me</code> so the id comes from the token, not the path. That removes the BOLA question entirely for the self-service route.</p>`,
          `<p>Hint 3: <code>ProfileUpdate(extra="forbid")</code> in, <code>body.model_dump(exclude_unset=True)</code> to apply only sent fields, <code>response_model=UserOut</code> out; plus a rate limit dependency and a uniqueness check for username (409).</p>`
        ],
        solution: {
          approach: `<p>Six fixes. <b>1.</b> Require authentication with <code>CurrentUser</code>. <b>2.</b> Remove the client-chosen id: <code>PATCH /users/me</code> edits the caller (admins get <code>/admin/users/{id}</code> behind a permission dependency). <b>3.</b> Replace <code>request.json()</code> with a <code>ProfileUpdate</code> model: allow-listed fields, lengths, patterns, <code>extra="forbid"</code>. <b>4.</b> Apply only fields the client sent (<code>exclude_unset=True</code>). <b>5.</b> Return <code>UserOut</code> through <code>response_model</code>, so hashes and roles never leave. <b>6.</b> Rate-limit writes, handle the unique username conflict as 409, and keep the route <code>def</code> because the session is synchronous.</p>`,
          code: { lang: 'python', code: `from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field, HttpUrl
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth import CurrentUser
from app.db import get_session
from app.limits import rate_limit, user_key

router = APIRouter(prefix="/users", tags=["users"])


class ProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    display_name: Annotated[str, Field(min_length=1, max_length=50)] | None = None
    username: Annotated[str, Field(min_length=3, max_length=30, pattern=r"^[a-z0-9_]+$")] | None = None
    avatar_url: HttpUrl | None = None
    theme: Literal["light", "dark", "system"] | None = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    display_name: str | None = None
    avatar_url: str | None = None
    theme: str = "system"


@router.patch("/me", response_model=UserOut,
              dependencies=[Depends(rate_limit("profile-write", 30, 60, user_key))])
def update_me(body: ProfileUpdate, user: CurrentUser,
              db: Annotated[Session, Depends(get_session)]) -> UserOut:
    changes = body.model_dump(exclude_unset=True, mode="json")   # only fields the client sent
    for field, value in changes.items():
        setattr(user, field, value)                              # safe: fields come from the model
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Username already taken")
    db.refresh(user)
    return UserOut.model_validate(user)` },
          complexity: `<p>One SELECT (already done when loading the current user) and one UPDATE. Validation is linear in the body size, which is now bounded.</p>`,
          followUps: ['How would the admin version differ (fields, audit log, permission)?', 'Where would you check <code>avatar_url</code> for SSRF: at update time, at fetch time, or both?']
        },
        tests: { skip: 'framework wiring, verified by reading' }
      }
    ]
  });

  /* =====================================================================
     PRACTICE — Easy
     ===================================================================== */
  practice.push({
    title: 'Redact Secrets Before They Reach the Logs',
    level: 'Easy', tags: ['logging', 'secrets', 'regex'], companies: ['Datadog', 'Atlassian'],
    statement: `<p>Write <code>redact(line)</code> for your logging filter. Replace secret values with <code>[REDACTED]</code>, applying these rules in this order:</p>
      <ol><li><b>JSON pairs</b>: <code>"key": "value"</code> (any spaces around the colon) where the key contains <code>password</code>, <code>passwd</code>, <code>secret</code>, <code>token</code>, <code>api_key</code>, <code>apikey</code> or <code>authorization</code> (case-insensitive). Only the string value is replaced: <code>"password": "[REDACTED]"</code>.</li>
      <li><b>Bearer tokens</b>: the word <code>bearer</code> (any case) followed by spaces and a token: keep the word, replace the token: <code>Bearer [REDACTED]</code>.</li>
      <li><b>key=value pairs</b> where the key (letters, digits, <code>_</code>, <code>-</code>) contains one of the first six words: the value runs until whitespace, <code>&amp;</code>, <code>,</code> or <code>;</code>. An empty value is left alone.</li></ol>`,
    constraints: `0 ≤ len(line) ≤ 10<sup>4</sup>. Over-redaction (for example a key named <code>tokenizer</code>) is acceptable; under-redaction is not.`,
    example: `${H.table(['input', 'output'], [['<code>user=asha password=hunter2</code>', '<code>user=asha password=[REDACTED]</code>'], ['<code>GET /cb?code=1&amp;access_token=abc.def&amp;state=x</code>', '<code>GET /cb?code=1&amp;access_token=[REDACTED]&amp;state=x</code>'], ['<code>Authorization: Bearer eyJhbGciOi.abc.def</code>', '<code>Authorization: Bearer [REDACTED]</code>'], ['<code>{"user": "asha", "password": "hunter2"}</code>', '<code>{"user": "asha", "password": "[REDACTED]"}</code>']])}`,
    brute: {
      why: `<p>Hoping developers never log secrets, or redacting only the exact string <code>password=</code>. Real leaks come from query strings (<code>access_token=</code>), headers (<code>Authorization: Bearer</code>), JSON bodies in error logs, and environment dumps (<code>DB_PASSWORD=</code>). One central filter in the logging pipeline catches them all.</p>`,
      code: { lang: 'python', code: `def redact(line: str) -> str:
    return line.replace("password=", "password=***")    # leaves the value, misses tokens and JSON` }
    },
    mcq: { q: 'Where is the best place to apply redaction?', options: ['In a logging filter/formatter every log record passes through', 'In each route before calling the logger', 'In the log viewer UI', 'Nowhere: logs are internal'], answer: 0, explain: 'A central filter cannot be forgotten by one route. Logs are copied to many systems and people, so secrets must be removed before they are written.' },
    hints: [
      `<p>Hint 1: three regular expressions, applied in order. Use <code>(?i)</code> or <code>re.IGNORECASE</code> and capture the part you keep, then substitute <code>\\1</code> plus the replacement.</p>`,
      `<p>Hint 2: for keys, match <code>[A-Za-z0-9_-]*(?:password|passwd|secret|token|api_key|apikey)[A-Za-z0-9_-]*</code> so prefixes like <code>DB_</code> and suffixes like <code>_hash</code> are included.</p>`,
      `<p>Hint 3: the key=value value is <code>[^\\s&amp;,;]+</code> (one or more characters), which leaves <code>password=</code> with nothing after it unchanged. Do JSON first so the key=value rule never sees JSON text.</p>`
    ],
    solution: {
      approach: `<p>Three compiled patterns, each capturing what should be kept. Order matters: JSON pairs first (so the quotes are handled correctly), then Bearer tokens, then key=value pairs. In a FastAPI service, install it as a <code>logging.Filter</code> that rewrites <code>record.msg</code> and string args, and also use <code>SecretStr</code> so most secrets never reach a log call in the first place.</p>`,
      code: { lang: 'python', run: true, code: `import logging
import re

WORDS = r"(?:password|passwd|secret|token|api_key|apikey)"
JSON_PAIR = re.compile(r'("[A-Za-z0-9_-]*(?:' + WORDS[3:-1] + r'|authorization)[A-Za-z0-9_-]*"\\s*:\\s*)"[^"]*"', re.I)
BEARER = re.compile(r"\\b(bearer)\\s+[A-Za-z0-9._~+/=-]+", re.I)
KEY_VALUE = re.compile(r"\\b([A-Za-z0-9_-]*" + WORDS + r"[A-Za-z0-9_-]*)=[^\\s&,;]+", re.I)


def redact(line: str) -> str:
    line = JSON_PAIR.sub(r'\\1"[REDACTED]"', line)
    line = BEARER.sub(r"\\1 [REDACTED]", line)
    return KEY_VALUE.sub(r"\\1=[REDACTED]", line)


class RedactFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.msg = redact(str(record.msg))
        record.args = tuple(redact(a) if isinstance(a, str) else a for a in (record.args or ()))
        return True


logging.basicConfig(level=logging.INFO, format="%(message)s")
log = logging.getLogger("app")
log.addFilter(RedactFilter())
log.info("callback %s", "GET /cb?code=1&access_token=abc.def&state=x")
log.info('body {"user": "asha", "password": "hunter2"}')` },
      complexity: `<p>O(n) per line for these patterns (no nested quantifiers, so no catastrophic backtracking).</p>`,
      followUps: ['How do you redact structured (JSON) logs where secrets are nested several levels deep?', 'Why should you also avoid secrets in URLs entirely?']
    },
    tests: { fn: 'redact', sig: 'string -> string', cases: [
      [['login ok user=asha password=hunter2'], 'login ok user=asha password=[REDACTED]'],
      [['GET /cb?code=1&access_token=abc.def&state=x'], 'GET /cb?code=1&access_token=[REDACTED]&state=x'],
      [['Authorization: Bearer eyJhbGciOi.abc.def'], 'Authorization: Bearer [REDACTED]'],
      [['{"user": "asha", "password": "hunter2"}'], '{"user": "asha", "password": "[REDACTED]"}'],
      [['{"client_secret":"s3cr3t","id":7}'], '{"client_secret":"[REDACTED]","id":7}'],
      [['user=asha role=admin'], 'user=asha role=admin'],
      [['API_KEY=abc123 DB_PASSWORD=pw'], 'API_KEY=[REDACTED] DB_PASSWORD=[REDACTED]'],
      [['bearer abc'], 'bearer [REDACTED]'],
      [[''], ''],
      [['password= and nothing else'], 'password= and nothing else'],
      [['{"Authorization": "Bearer xyz"}'], '{"Authorization": "[REDACTED]"}'],
      [['refresh_token=r1;path=/'], 'refresh_token=[REDACTED];path=/']
    ] }
  });

  practice.push({
    title: 'Is This Secret Good Enough to Ship?',
    level: 'Easy', tags: ['secrets', 'configuration', 'entropy'], companies: ['HashiCorp', 'Zoho'],
    statement: `<p>Your settings loader should refuse weak signing keys. Write <code>secret_strength(value)</code> returning the first matching verdict:</p>
      <ol><li><code>"placeholder"</code>: the lowercased value is one of <code>change-me, changeme, change-me-in-.env, secret, password, dev, test</code>, or it starts with <code>change-me</code> or <code>your-</code>.</li>
      <li><code>"too_short"</code>: fewer than 32 <b>bytes</b> in UTF-8.</li>
      <li><code>"low_variety"</code>: fewer than 10 distinct characters (for example <code>"a" * 40</code>, or a repeated short word).</li>
      <li><code>"ok"</code> otherwise.</li></ol>
      <p>Also show how to generate a value that is always <code>"ok"</code>.</p>`,
    constraints: `0 ≤ len(value) ≤ 1000.`,
    example: `${H.table(['value', 'verdict'], [['<code>change-me-in-.env</code>', '<span class="c-r">placeholder</span>'], ['<code>my-jwt-key</code>', '<span class="c-r">too_short</span>'], ['<code>abababab…</code> (40 chars)', '<span class="c-r">low_variety</span>'], ['output of <code>secrets.token_urlsafe(32)</code>', '<span class="c-g">ok</span>']])}`,
    brute: {
      why: `<p>Checking only that the variable is set. <code>APP_JWT_SECRET=secret</code> passes, and anyone who guesses it (it is the first word in every cracking list) can mint admin tokens. HS256 keys can be brute-forced offline from a single captured token if they are short or predictable.</p>`,
      code: { lang: 'python', code: `def secret_strength(value: str) -> str:
    return "ok" if value else "missing"        # "secret" ships to production` }
    },
    mcq: { q: 'Which command produces a good HS256 key?', options: ['<code>python -c "import secrets; print(secrets.token_urlsafe(32))"</code>', '<code>python -c "import random; print(random.random())"</code>', '<code>date | md5sum</code>', 'Your company name plus the year'], answer: 0, explain: 'secrets uses the OS cryptographic random generator; 32 random bytes is 256 bits, matching HS256. random is predictable, and dates or names are guessable.' },
    hints: [
      `<p>Hint 1: check in the given order and return early. Lowercase once for the placeholder checks.</p>`,
      `<p>Hint 2: measure bytes with <code>len(value.encode("utf-8"))</code>, not characters; the HMAC key is bytes.</p>`,
      `<p>Hint 3: distinct characters is <code>len(set(value))</code>. It is a crude variety check, not real entropy measurement, but it catches the classic mistakes. Generating with <code>secrets.token_urlsafe(32)</code> gives 43 characters drawn from 64 symbols.</p>`
    ],
    solution: {
      approach: `<p>A cheap, ordered rule list. It cannot prove randomness (nothing can, from one value), but it rejects every weak key humans actually type. Use it as a Pydantic <code>field_validator</code> on <code>jwt_secret</code> so a weak key stops the deploy. The real fix is procedural: keys are generated by <code>secrets</code>, stored in a secrets manager, and nobody types them.</p>`,
      code: { lang: 'python', run: true, code: `import secrets

PLACEHOLDERS = {"change-me", "changeme", "change-me-in-.env", "secret", "password", "dev", "test"}


def secret_strength(value: str) -> str:
    low = value.lower()
    if low in PLACEHOLDERS or low.startswith(("change-me", "your-")):
        return "placeholder"
    if len(value.encode("utf-8")) < 32:
        return "too_short"
    if len(set(value)) < 10:
        return "low_variety"
    return "ok"


generated = secrets.token_urlsafe(32)          # 32 random bytes -> 43 URL-safe characters
print(len(generated), "chars ->", secret_strength(generated))
print(secret_strength("change-me-in-.env"), secret_strength("ab" * 20))` },
      complexity: `<p>O(n) for the encode and the set.</p>`,
      followUps: ['Why is a 32-byte random key enough for HS256 but a 32-character English sentence is not?', 'How would you detect the same key reused across environments?']
    },
    tests: { fn: 'secretStrength', names: { python: 'secret_strength' }, sig: 'string -> string', cases: [
      [['change-me-in-.env'], 'placeholder'],
      [['CHANGEME'], 'placeholder'],
      [['change-me-before-prod-please-really-long-value'], 'placeholder'],
      [['your-secret-key-here-0123456789-abcdef'], 'placeholder'],
      [['my-jwt-key'], 'too_short'],
      [[''], 'too_short'],
      [['abababababababababababababababababababab'], 'low_variety'],
      [['test-only-secret-0123456789abcdefghij'], 'ok'],
      [['ééééééééééééééé'], 'too_short'], [['ééééééééééééééééé'], 'low_variety'],
      [['éèêëēėęàáâäæãåāîïíīįì'], 'ok']
    ] }
  });

  practice.push({
    title: 'Hash and Verify a Password with Salted scrypt',
    level: 'Easy', tags: ['password hashing', 'scrypt', 'constant-time compare'], companies: ['Dropbox', 'PhonePe'],
    statement: `<p>Write <code>hash_and_check(password, attempt)</code> using only <code>hashlib.scrypt</code> (N=2<sup>14</sup>, r=8, p=1, 32-byte output), a 16-byte salt from <code>secrets</code>, and <code>hmac.compare_digest</code>. Return four strings:</p>
      <ol><li>the stored value, formatted <code>scrypt$16384$8$1$&lt;salt&gt;$&lt;hash&gt;</code> with unpadded base64url salt (22 chars) and hash (43 chars);</li>
      <li><code>"true"</code>/<code>"false"</code>: does <code>password</code> verify against it;</li>
      <li><code>"true"</code>/<code>"false"</code>: does <code>attempt</code> verify against it;</li>
      <li><code>"true"</code>/<code>"false"</code>: does hashing <code>password</code> a second time give a <b>different</b> stored value (it must, thanks to the salt).</li></ol>
      <p>Salts are random, so the tests check the format and the booleans, not the exact hash.</p>`,
    constraints: `0 ≤ len(password), len(attempt) ≤ 64. Standard library only.`,
    example: `${H.table(['password', 'attempt', 'result'], [['"correct horse"', '"correct horse"', '["scrypt$16384$8$1$Zx…$Qm…", "true", "true", "true"]'], ['"correct horse"', '"correct horsf"', '["scrypt$…", "true", "<span class="c-r">false</span>", "true"]']])}`,
    brute: {
      why: `<p><code>hashlib.sha256(password.encode()).hexdigest()</code> with no salt: identical passwords give identical hashes, a GPU tries billions of guesses per second, and precomputed tables crack common passwords instantly. Comparing with <code>==</code> on secrets adds a timing side channel.</p>`,
      code: { lang: 'python', code: `import hashlib


def hash_and_check(password: str, attempt: str) -> list[str]:
    stored = hashlib.sha256(password.encode()).hexdigest()           # fast and unsalted: wrong
    ok = hashlib.sha256(attempt.encode()).hexdigest() == stored
    return [stored, "true", str(ok).lower(), "false"]                # same input, same hash` }
    },
    mcq: { q: 'Why does the stored string include N, r, p and the salt?', options: ['So verify can recompute with the same settings, and settings can be raised later', 'To make the hash longer', 'Because the salt must be kept secret there', 'It is required by HTTP'], answer: 0, explain: 'A self-describing format lets you verify old hashes and detect when they need rehashing with stronger parameters. The salt is not secret; it only has to be unique.' },
    hints: [
      `<p>Hint 1: <code>salt = secrets.token_bytes(16)</code>; <code>dk = hashlib.scrypt(pw.encode(), salt=salt, n=16384, r=8, p=1, dklen=32)</code>.</p>`,
      `<p>Hint 2: base64url without padding: <code>base64.urlsafe_b64encode(b).rstrip(b"=").decode()</code>; to decode add <code>"=" * (-len(s) % 4)</code> back.</p>`,
      `<p>Hint 3: verify by splitting on <code>$</code>, reading the parameters <i>from the string</i> (not constants), recomputing, and comparing with <code>hmac.compare_digest</code>.</p>`
    ],
    solution: {
      approach: `<p>Hash: random salt, memory-hard scrypt, self-describing string. Verify: parse, recompute with the stored parameters, constant-time compare. The fourth value demonstrates why salts matter: the same password never produces the same stored value twice. In FastAPI projects you would use <code>pwdlib</code> with argon2id instead; this exercise shows what such a library does inside.</p>`,
      code: { lang: 'python', run: true, code: `import base64
import hashlib
import hmac
import secrets


def _b64(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


def _unb64(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def make_hash(password: str, n: int = 16384, r: int = 8, p: int = 1) -> str:
    salt = secrets.token_bytes(16)
    dk = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=n, r=r, p=p, dklen=32)
    return "$".join(["scrypt", str(n), str(r), str(p), _b64(salt), _b64(dk)])


def verify(password: str, stored: str) -> bool:
    try:
        algo, n, r, p, salt, expected = stored.split("$")
    except ValueError:
        return False
    if algo != "scrypt":
        return False
    dk = hashlib.scrypt(password.encode("utf-8"), salt=_unb64(salt), n=int(n), r=int(r), p=int(p), dklen=32)
    return hmac.compare_digest(dk, _unb64(expected))


def hash_and_check(password: str, attempt: str) -> list[str]:
    stored = make_hash(password)
    again = make_hash(password)
    return [stored, str(verify(password, stored)).lower(), str(verify(attempt, stored)).lower(),
            str(again != stored).lower()]


print(hash_and_check("correct horse", "correct horsf"))` },
      complexity: `<p>Each hash costs 128 × r × N bytes = 16 MiB of memory and a few tens of milliseconds by design; that cost is what slows attackers down.</p>`,
      followUps: ['How would <code>needs_rehash</code> work when you raise N to 2<sup>17</sup>?', 'What changes if you add a pepper?']
    },
    tests: { fn: 'hashAndCheck', names: { python: 'hash_and_check' }, sig: 'string string -> string[]',
      check: '(args, out) => { if (!Array.isArray(out) || out.length !== 4) return false; const p = String(out[0]).split("$"); return p.length === 6 && p[0] === "scrypt" && p[1] === "16384" && p[2] === "8" && p[3] === "1" && p[4].length === 22 && p[5].length === 43 && out[1] === "true" && out[2] === String(args[0] === args[1]) && out[3] === "true"; }',
      cases: [
        [['correct horse battery staple', 'correct horse battery staple'], null],
        [['correct horse battery staple', 'correct horse battery stapler'], null],
        [['', ''], null],
        [['', 'x'], null],
        [['pässwörd-ünïcode', 'pässwörd-ünïcode'], null],
        [['Tr0ub4dor&3', 'tr0ub4dor&3'], null]
      ] }
  });

  practice.push({
    title: 'Fix the CORS Configuration Before Launch',
    level: 'Easy', tags: ['CORS', 'configuration', 'code review'], companies: ['Vercel', 'Canva'],
    statement: `<p>A teammate "fixed" a CORS error with this. The API uses an HttpOnly session cookie set by <code>api.example.com</code>; the real frontends are <code>https://app.example.com</code> and preview builds like <code>https://pr-42.preview.example.com</code>. Explain what is wrong and write the correct configuration.</p>
      <pre>app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_origin_regex="https://.*.example.com",
)</pre>`,
    constraints: `Starlette CORSMiddleware via FastAPI. Origins must come from settings. Local development uses http://localhost:5173.`,
    example: `${H.table(['Origin', 'Before', 'After'], [['https://app.example.com', 'allowed', '<span class="c-g">allowed</span>'], ['https://pr-42.preview.example.com', 'allowed', '<span class="c-g">allowed</span>'], ['https://evil.example.net', '<span class="c-r">allowed, with cookies</span>', '<span class="c-g">rejected</span>'], ['https://evil-example.com', '<span class="c-r">allowed (regex)</span>', '<span class="c-g">rejected</span>'], ['null', '<span class="c-r">allowed</span>', '<span class="c-g">rejected</span>']])}`,
    brute: {
      why: `<p>Keep the wildcard and add "we check auth anyway". But the browser sends the session cookie automatically, so any page the user visits can call the API as that user and read the replies: their orders, profile, anything. Auth checks pass because the cookie is valid.</p>`,
      code: { lang: 'python', code: `app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True)   # every site, as the user` }
    },
    mcq: { q: 'With <code>allow_origins=["*"]</code> and <code>allow_credentials=True</code>, Starlette…', options: ['Echoes the request\'s Origin back, so every site gets credentialed access', 'Rejects all requests', 'Sends <code>*</code>, which browsers accept with cookies', 'Ignores the credentials flag'], answer: 0, explain: 'Browsers forbid * with credentials, so Starlette reflects the incoming origin instead. The effect is that every origin is trusted with the user\'s cookies.' },
    hints: [
      `<p>Hint 1: count the issues: wildcard + credentials, an unescaped and over-broad regex, wildcard methods and headers, and hard-coded values instead of settings.</p>`,
      `<p>Hint 2: explicit origins from settings, plus a narrow regex: <code>r"https://pr-[0-9]+[.]preview[.]example[.]com"</code> (dots escaped as <code>[.]</code>, only the label part variable).</p>`,
      `<p>Hint 3: methods and headers you actually use. Because this is a cookie API, also add CSRF protection (SameSite cookie and/or a CSRF header) since CORS does not stop simple cross-site POSTs from being sent.</p>`
    ],
    solution: {
      approach: `<p>Problems: (1) wildcard + credentials means every origin is reflected and trusted with cookies; (2) the regex <code>https://.*.example.com</code> matches <code>https://evil-example.com</code> and is broader than needed; (3) <code>*</code> methods/headers widen exposure for no reason; (4) configuration is in code, so dev origins leak into production. Fix: origins from settings, a strict regex for previews, explicit methods and headers, a startup check that refuses wildcard + credentials, and CSRF protection for the cookie.</p>`,
      code: { lang: 'python', code: `from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic_settings import BaseSettings, SettingsConfigDict


class CorsSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="APP_", env_file=".env", extra="ignore")
    cors_origins: list[str] = ["https://app.example.com"]          # dev .env adds http://localhost:5173
    cors_preview_regex: str | None = r"https://pr-[0-9]+[.]preview[.]example[.]com"


s = CorsSettings()
if "*" in s.cors_origins:
    raise RuntimeError("Cookie-authenticated API: '*' is never allowed")

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=s.cors_origins,
    allow_origin_regex=s.cors_preview_regex,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "X-CSRF-Token"],
    max_age=600,
)
# Session cookie: HttpOnly; Secure; SameSite=Lax (or Strict), and state-changing
# routes require the X-CSRF-Token header to match the token in the session.` },
      complexity: `<p>No runtime cost difference; one regex fullmatch per cross-origin request at most.</p>`,
      followUps: ['Why is SameSite=Lax not enough on its own for every endpoint?', 'Write a unit test that sends preflights from five good and bad origins.']
    },
    tests: { skip: 'framework wiring, verified by reading' }
  });

  /* =====================================================================
     PRACTICE — Medium
     ===================================================================== */
  practice.push({
    title: 'Refresh Token Rotation with Reuse Detection',
    level: 'Medium', tags: ['refresh tokens', 'rotation', 'state machine'], companies: ['Auth0', 'Okta', 'Swiggy'],
    statement: `<p>Simulate a refresh-token store. Process <code>events</code> in order and return one result per event:</p>
      <ul><li><code>"login"</code>: start a new <b>family</b> and issue the next token name <code>r1, r2, …</code> (one global counter): <code>"issued:rN"</code>.</li>
      <li><code>"refresh:rX"</code>: if rX does not exist → <code>"invalid"</code>; if its family is revoked → <code>"revoked"</code>; if rX is the family's <b>current</b> token → mark it used and issue the next token in the same family: <code>"issued:rN"</code>; if rX is an <b>older, already-used</b> token of an active family → someone replayed a stolen token: revoke the whole family → <code>"reuse_detected"</code>.</li>
      <li><code>"logout:rX"</code>: unknown → <code>"invalid"</code>; family already revoked → <code>"revoked"</code>; otherwise revoke the family → <code>"logged_out"</code>.</li></ul>`,
    constraints: `0 ≤ len(events) ≤ 10<sup>4</sup>. Token names in events are well-formed.`,
    example: `${H.table(['events', 'results', 'why'], [['login, refresh:r1, refresh:r2', 'issued:r1, issued:r2, issued:r3', 'normal rotation'], ['login, refresh:r1, refresh:r1, refresh:r2', 'issued:r1, issued:r2, <span class="c-r">reuse_detected</span>, <span class="c-r">revoked</span>', 'r1 was replayed, so even the legitimate r2 dies: both parties must log in again']])}`,
    brute: {
      why: `<p>A long-lived refresh token that is never rotated. If it leaks (a log, a stolen laptop backup), the attacker refreshes forever and you never notice. Rotation alone is not enough either: without reuse detection, the attacker and the user both keep refreshing in parallel.</p>`,
      code: { lang: 'python', code: `def refresh_events(events: list[str]) -> list[str]:
    out = []
    for e in events:
        out.append("issued:r1")          # same token forever, theft is invisible
    return out` }
    },
    mcq: { q: 'Why revoke the whole family when an old token is reused?', options: ['You cannot tell whether the attacker or the user is the one replaying, so both sessions must end', 'To save database space', 'Because the old token expired', 'It is required by JWT'], answer: 0, explain: 'Reuse means two parties hold tokens from the same family. Revoking the family forces a fresh login, which only the real user (with the password/MFA) can do.' },
    hints: [
      `<p>Hint 1: keep three maps: token → family, family → current token, family → revoked flag. A token is "used" when it is in the family but not current.</p>`,
      `<p>Hint 2: the check order for refresh is: exists? → family revoked? → current? → otherwise reuse.</p>`,
      `<p>Hint 3: the global counter increments only when a token is issued (login or successful refresh), never on failures.</p>`
    ],
    solution: {
      approach: `<p>A small state machine per family. In a FastAPI app the same logic lives in a <code>refresh_tokens</code> table (<code>token_hash</code>, <code>family_id</code>, <code>used_at</code>, <code>revoked_at</code>), updated inside one transaction with <code>SELECT ... FOR UPDATE</code> so two concurrent refreshes cannot both win. On <code>reuse_detected</code>, also alert and log the IP/user agent of both uses.</p>`,
      code: { lang: 'python', run: true, code: `def refresh_events(events: list[str]) -> list[str]:
    family_of: dict[str, int] = {}
    current: dict[int, str] = {}
    revoked: set[int] = set()
    counter = 0
    families = 0
    out: list[str] = []

    def issue(fam: int) -> str:
        nonlocal counter
        counter += 1
        name = "r" + str(counter)
        family_of[name] = fam
        current[fam] = name
        return "issued:" + name

    for event in events:
        if event == "login":
            families += 1
            out.append(issue(families))
            continue
        action, _, token = event.partition(":")
        fam = family_of.get(token)
        if fam is None:
            out.append("invalid")
        elif fam in revoked:
            out.append("revoked")
        elif action == "logout":
            revoked.add(fam)
            out.append("logged_out")
        elif current[fam] == token:
            out.append(issue(fam))
        else:
            revoked.add(fam)
            out.append("reuse_detected")
    return out


print(refresh_events(["login", "refresh:r1", "refresh:r1", "refresh:r2"]))` },
      complexity: `<p>O(1) per event with hash maps; O(number of issued tokens) memory (in a database, rows expire after their lifetime).</p>`,
      followUps: ['Two browser tabs refresh at the same instant with the same token. How do you avoid a false reuse alarm (grace window)?', 'Why store the refresh token hashed, and why is SHA-256 acceptable here when it is not for passwords?']
    },
    tests: { fn: 'refreshEvents', names: { python: 'refresh_events' }, sig: 'string[] -> string[]', cases: [
      [[['login', 'refresh:r1', 'refresh:r2']], ['issued:r1', 'issued:r2', 'issued:r3']],
      [[['login', 'refresh:r1', 'refresh:r1']], ['issued:r1', 'issued:r2', 'reuse_detected']],
      [[['login', 'refresh:r1', 'refresh:r1', 'refresh:r2']], ['issued:r1', 'issued:r2', 'reuse_detected', 'revoked']],
      [[['refresh:r9']], ['invalid']],
      [[['login', 'login', 'refresh:r1', 'refresh:r2']], ['issued:r1', 'issued:r2', 'issued:r3', 'issued:r4']],
      [[['login', 'logout:r1', 'refresh:r1']], ['issued:r1', 'logged_out', 'revoked']],
      [[['login', 'login', 'refresh:r1', 'refresh:r1', 'refresh:r2']], ['issued:r1', 'issued:r2', 'issued:r3', 'reuse_detected', 'issued:r4']],
      [[[]], []],
      [[['logout:r1', 'login', 'logout:r2', 'logout:r1']], ['invalid', 'issued:r1', 'invalid', 'logged_out']]
    ] }
  });

  practice.push({
    title: 'Throttle Password Guessing per Account',
    level: 'Medium', tags: ['brute force', 'sliding window', 'login'], companies: ['Microsoft', 'Paytm'],
    statement: `<p>Process login attempts <code>"t:account:ok"</code> or <code>"t:account:fail"</code> (t = seconds, non-decreasing) and return one result each:</p>
      <ul><li>If the account has <b>5 or more failures</b> with <code>t - failure_time &lt; 900</code>, the attempt is not checked at all: <code>"throttled"</code> (and not counted).</li>
      <li>Otherwise a <code>fail</code> is recorded and returns <code>"denied"</code>; an <code>ok</code> returns <code>"allowed"</code> and clears that account's failures.</li></ul>
      <p>Account names compare case-insensitively (users type <code>Asha@Example.com</code> and <code>asha@example.com</code>).</p>`,
    constraints: `0 ≤ events ≤ 10<sup>5</sup>, 0 ≤ t ≤ 10<sup>9</sup>. Account names contain no colon.`,
    example: `${H.table(['events', 'results'], [['5 × fail at t=0..40, then ok at t=50', 'denied ×5, <span class="c-r">throttled</span> (even though the password is right)'], ['…then ok at t=900', '<span class="c-g">allowed</span>: the first failure (t=0) has left the window']])}`,
    brute: {
      why: `<p>Lock the account permanently after 5 failures. Now an attacker can lock out any user by typing their email five times: a denial of service against your customers and your support team. A sliding window that slows guessing down without permanent lockout is the usual compromise, combined with MFA and per-IP limits.</p>`,
      code: { lang: 'python', code: `def login_throttle(events: list[str]) -> list[str]:
    fails: dict[str, int] = {}
    out = []
    for e in events:
        _, acct, result = e.split(":")
        if fails.get(acct, 0) >= 5:
            out.append("throttled")              # forever: attacker-controlled lockout
            continue
        fails[acct] = fails.get(acct, 0) + (result == "fail")
        out.append("allowed" if result == "ok" else "denied")
    return out` }
    },
    mcq: { q: 'An attacker tries one common password against 50,000 accounts from 10,000 IPs. Which control catches it best?', options: ['Breached-password checks plus per-IP and global failure-rate monitoring', 'Per-account lockout after 5 failures', 'Longer JWT expiry', 'CORS'], answer: 0, explain: 'Password spraying makes one attempt per account, so per-account limits never trigger. Blocking common passwords at signup and watching overall failure rates (and requiring MFA) is what works.' },
    hints: [
      `<p>Hint 1: split each event into time, account (lowercased) and result. Keep a list of failure times per account.</p>`,
      `<p>Hint 2: before deciding, drop failures with <code>t - ft &gt;= 900</code>. A deque per account makes this O(1) amortised.</p>`,
      `<p>Hint 3: a throttled attempt changes nothing (it is not recorded as a failure, so the window can expire). A success clears the list.</p>`
    ],
    solution: {
      approach: `<p>Sliding log of recent failures per account. Expired failures fall off the front; 5 recent failures means "throttled". In production the log is a Redis sorted set per account (<code>ZADD</code> the timestamp, <code>ZREMRANGEBYSCORE</code> old ones, <code>ZCARD</code> to count) and the throttled response is the same generic 401 or a 429 with <code>Retry-After</code>, never "account locked".</p>`,
      code: { lang: 'python', run: true, code: `from collections import defaultdict, deque

WINDOW, LIMIT = 900, 5


def login_throttle(events: list[str]) -> list[str]:
    failures: dict[str, deque] = defaultdict(deque)
    out: list[str] = []
    for event in events:
        t_raw, account, result = event.split(":")
        t, account = int(t_raw), account.lower()
        recent = failures[account]
        while recent and t - recent[0] >= WINDOW:
            recent.popleft()
        if len(recent) >= LIMIT:
            out.append("throttled")
        elif result == "fail":
            recent.append(t)
            out.append("denied")
        else:
            recent.clear()
            out.append("allowed")
    return out


print(login_throttle(["0:a:fail", "10:a:fail", "20:a:fail", "30:a:fail", "40:a:fail", "50:a:ok", "900:a:ok"]))` },
      complexity: `<p>O(1) amortised per event; O(min(failures, 5 per account)) memory beyond what the window keeps.</p>`,
      followUps: ['Add a per-IP limit of 20 attempts per 15 minutes. What is the key?', 'How would progressive delays (1 s, 2 s, 4 s…) change the user experience compared with a hard throttle?']
    },
    tests: { fn: 'loginThrottle', names: { python: 'login_throttle' }, sig: 'string[] -> string[]', cases: [
      [[['0:a:fail', '10:a:fail', '20:a:fail', '30:a:fail', '40:a:fail', '50:a:ok', '900:a:ok']], ['denied', 'denied', 'denied', 'denied', 'denied', 'throttled', 'allowed']],
      [[['0:a:fail', '1:a:ok', '2:a:fail']], ['denied', 'allowed', 'denied']],
      [[['0:Asha@x.com:fail', '1:asha@X.com:fail', '2:ASHA@x.com:fail', '3:asha@x.com:fail', '4:asha@x.com:fail', '5:asha@x.com:ok']], ['denied', 'denied', 'denied', 'denied', 'denied', 'throttled']],
      [[['0:a:fail', '0:a:fail', '0:a:fail', '0:a:fail', '0:a:fail', '0:b:ok']], ['denied', 'denied', 'denied', 'denied', 'denied', 'allowed']],
      [[[]], []],
      [[['0:a:fail', '100:a:fail', '200:a:fail', '300:a:fail', '400:a:fail', '899:a:fail', '900:a:fail', '1000:a:fail']], ['denied', 'denied', 'denied', 'denied', 'denied', 'throttled', 'denied', 'denied']],
      [[['5:a:ok', '6:a:ok']], ['allowed', 'allowed']]
    ] }
  });

  practice.push({
    title: 'Permission Matrix for a Blog API (Roles + Ownership)',
    level: 'Medium', tags: ['RBAC', 'ownership', 'authorization'], companies: ['WordPress (Automattic)', 'Medium'],
    statement: `<p>Write <code>can(role, action, is_owner, published)</code> for posts:</p>
      ${H.table(['role', 'read', 'create', 'update', 'delete', 'publish'], [['admin', 'any', 'yes', 'any', 'any', 'any'], ['editor', 'any', 'yes', 'any', 'own only', 'any'], ['author', 'published or own', 'yes', 'own only', 'own <b>unpublished</b> only', 'no'], ['reader / anything else', 'published only', 'no', 'no', 'no', 'no']])}
      <p>Unknown actions are always <code>False</code>. Roles are case-sensitive; an unknown role behaves like <code>reader</code>.</p>`,
    constraints: `role and action are short strings; is_owner and published are booleans.`,
    example: `${H.table(['role', 'action', 'owner', 'published', 'result'], [['author', 'delete', 'True', 'True', '<span class="c-r">False</span> (published posts need an editor)'], ['editor', 'delete', 'False', 'False', '<span class="c-r">False</span>'], ['reader', 'read', 'False', 'False', '<span class="c-r">False</span> (drafts are private)'], ['Admin', 'update', 'False', 'True', '<span class="c-r">False</span> (unknown role → reader)']])}`,
    brute: {
      why: `<p><code>if role == "admin" or is_owner: return True</code> scattered across routes. It lets an author publish their own post without review, lets an author delete a published post, and hides the rules in a dozen places so nobody can answer "who can delete posts?" without reading every route.</p>`,
      code: { lang: 'python', code: `def can(role: str, action: str, is_owner: bool, published: bool) -> bool:
    return role == "admin" or is_owner           # owners can publish and delete anything they wrote` }
    },
    mcq: { q: 'Where should the "author may delete only unpublished own posts" rule live in a FastAPI app?', options: ['In one policy function used by a dependency or the service, covered by a matrix test', 'In the React delete button', 'In the database column default', 'In the JWT'], answer: 0, explain: 'Policy in one tested place. The frontend can hide the button for UX, but the server must enforce it.' },
    hints: [
      `<p>Hint 1: handle unknown actions and the admin case first; then map unknown roles to reader.</p>`,
      `<p>Hint 2: write the table as data where you can: a dict from (role, action) to a small rule such as <code>"any"</code>, <code>"own"</code>, <code>"own_unpublished"</code>, <code>"published_or_own"</code>, <code>"published"</code>.</p>`,
      `<p>Hint 3: evaluate the rule with <code>is_owner</code> and <code>published</code>. Missing pairs mean False.</p>`
    ],
    solution: {
      approach: `<p>A policy table plus a tiny evaluator, so the rules are data that reviewers can read and tests can enumerate. In FastAPI, a dependency loads the post (with ownership from the token's <code>sub</code>), calls <code>can()</code>, and raises 403 (or 404 for unreadable drafts so their existence is hidden).</p>`,
      code: { lang: 'python', run: true, code: `ACTIONS = {"read", "create", "update", "delete", "publish"}
POLICY = {
    "editor": {"read": "any", "create": "any", "update": "any", "delete": "own", "publish": "any"},
    "author": {"read": "published_or_own", "create": "any", "update": "own", "delete": "own_unpublished"},
    "reader": {"read": "published"},
}


def can(role: str, action: str, is_owner: bool, published: bool) -> bool:
    if action not in ACTIONS:
        return False
    if role == "admin":
        return True
    rule = POLICY.get(role, POLICY["reader"]).get(action)
    if rule == "any":
        return True
    if rule == "own":
        return is_owner
    if rule == "own_unpublished":
        return is_owner and not published
    if rule == "published_or_own":
        return published or is_owner
    if rule == "published":
        return published
    return False


for args in [("author", "delete", True, True), ("author", "delete", True, False), ("editor", "publish", False, False)]:
    print(args, "->", can(*args))` },
      complexity: `<p>O(1) per check: two dictionary lookups.</p>`,
      followUps: ['How do you test every cell of this matrix without writing 100 test functions?', 'A co-author feature arrives. Is this still RBAC, or time for relationship-based access?']
    },
    tests: { fn: 'can', sig: 'string string bool bool -> bool', cases: [
      [['admin', 'delete', false, true], true],
      [['admin', 'fly', false, true], false],
      [['editor', 'delete', false, false], false],
      [['editor', 'delete', true, true], true],
      [['editor', 'publish', false, false], true],
      [['author', 'delete', true, true], false],
      [['author', 'delete', true, false], true],
      [['author', 'publish', true, false], false],
      [['author', 'read', true, false], true],
      [['author', 'read', false, false], false],
      [['author', 'update', false, true], false],
      [['reader', 'read', false, false], false],
      [['reader', 'read', false, true], true],
      [['reader', 'create', false, false], false],
      [['Admin', 'update', false, true], false],
      [['guest', 'read', false, true], true]
    ] }
  });

  practice.push({
    title: 'Keep a Download Path Inside Its Folder',
    level: 'Medium', tags: ['path traversal', 'file handling', 'validation'], companies: ['Box', 'Google Drive'],
    statement: `<p><code>GET /files/{path:path}</code> serves files from a base folder. Write <code>safe_join(base, user_path)</code> that returns the absolute path to open, or <code>"error"</code>:</p>
      <ul><li><code>"error"</code> if <code>user_path</code> contains a NUL character, a backslash, a <code>%</code> (the framework already decoded once; leftovers mean double encoding), or starts with <code>/</code>.</li>
      <li>Split on <code>/</code>; skip empty parts and <code>.</code>; <code>..</code> removes the previous part, or is an <code>"error"</code> if there is none (it would climb out of base).</li>
      <li>If no parts remain (the path means "base itself"), <code>"error"</code>.</li>
      <li>Return <code>base</code> without trailing slashes + <code>/</code> + the parts joined by <code>/</code>.</li></ul>`,
    constraints: `base is an absolute POSIX path. 0 ≤ len(user_path) ≤ 4096.`,
    example: `${H.table(['user_path', 'result'], [['report.pdf', '<span class="c-g">/srv/files/report.pdf</span>'], ['a/../b.txt', '<span class="c-g">/srv/files/b.txt</span>'], ['../etc/passwd', '<span class="c-r">error</span>'], ['%2e%2e/secret', '<span class="c-r">error</span> (double-encoded traversal)']])}`,
    brute: {
      why: `<p><code>open(base + "/" + user_path)</code>, or <code>user_path.replace("../", "")</code>. The first reads <code>/etc/passwd</code> on request. The second is bypassed by <code>....//</code>, which becomes <code>../</code> after one replacement. Normalise first, then check containment.</p>`,
      code: { lang: 'python', code: `def safe_join(base: str, user_path: str) -> str:
    return base + "/" + user_path.replace("../", "")     # "....//etc/passwd" -> "../etc/passwd"` }
    },
    mcq: { q: 'Which is the most robust check with real files on disk?', options: ['<code>(base / p).resolve().is_relative_to(base.resolve())</code> after rejecting odd characters', 'Removing every <code>..</code> from the string', 'Checking that the path ends in <code>.pdf</code>', 'URL-decoding the path twice'], answer: 0, explain: 'resolve() follows symlinks and normalises; is_relative_to (Python 3.9+) confirms the final target is inside base. String filtering is always bypassable.' },
    hints: [
      `<p>Hint 1: reject the dangerous characters first; that also blocks Windows-style <code>..\\</code> and encoded tricks.</p>`,
      `<p>Hint 2: walk the parts with a stack: push names, pop on <code>..</code>, fail when popping an empty stack.</p>`,
      `<p>Hint 3: on a real server, also call <code>Path.resolve()</code> and <code>is_relative_to</code>, because a symlink inside the folder could point outside it; and serve by an id from the database when you can, not by a user-supplied path at all.</p>`
    ],
    solution: {
      approach: `<p>Pure string normalisation with a stack, which the tests can check without a filesystem. In the FastAPI route, add the filesystem-level check: <code>target = (BASE / rel).resolve(); if not target.is_relative_to(BASE.resolve()): 404</code>, then <code>FileResponse(target)</code>. Return 404 rather than 400 for escapes, so probing reveals nothing.</p>`,
      code: { lang: 'python', run: true, code: `def safe_join(base: str, user_path: str) -> str:
    if any(ch in user_path for ch in ("\\x00", "\\\\", "%")) or user_path.startswith("/"):
        return "error"
    parts: list[str] = []
    for part in user_path.split("/"):
        if part in ("", "."):
            continue
        if part == "..":
            if not parts:
                return "error"
            parts.pop()
        else:
            parts.append(part)
    if not parts:
        return "error"
    return base.rstrip("/") + "/" + "/".join(parts)


for p in ["report.pdf", "a/../b.txt", "../etc/passwd", "....//etc/passwd"]:
    print(repr(p), "->", safe_join("/srv/files", p))` },
      complexity: `<p>O(n) in the path length.</p>`,
      followUps: ['Why does "....//etc/passwd" end up harmless here?', 'How does <code>FileResponse</code> plus an id lookup remove the problem entirely?']
    },
    tests: { fn: 'safeJoin', names: { python: 'safe_join' }, sig: 'string string -> string', cases: [
      [['/srv/files', 'report.pdf'], '/srv/files/report.pdf'],
      [['/srv/files/', '2026/10/a.txt'], '/srv/files/2026/10/a.txt'],
      [['/srv/files', '../etc/passwd'], 'error'],
      [['/srv/files', 'a/../b.txt'], '/srv/files/b.txt'],
      [['/srv/files', 'a/../../b.txt'], 'error'],
      [['/srv/files', '/etc/passwd'], 'error'],
      [['/srv/files', 'a\\b.txt'], 'error'],
      [['/srv/files', 'a.txt\u0000.png'], 'error'],
      [['/srv/files', './././x'], '/srv/files/x'],
      [['/srv/files', ''], 'error'],
      [['/srv/files', '..'], 'error'],
      [['/srv/files', '%2e%2e/secret'], 'error'],
      [['/srv/files', 'a//b'], '/srv/files/a/b'],
      [['/srv/files', '....//etc/passwd'], '/srv/files/..../etc/passwd']
    ] }
  });

  practice.push({
    title: 'Guard Outbound URLs Against SSRF',
    level: 'Medium', tags: ['SSRF', 'OWASP API7', 'ipaddress'], companies: ['Capital One', 'AWS'],
    statement: `<p>Users give your API an image URL to import. Write <code>check_url(url, allowed_hosts)</code> returning <code>"ok"</code> or the first failing reason:</p>
      <ol><li><code>reject:scheme</code>: scheme is not <code>https</code>.</li>
      <li><code>reject:userinfo</code>: the URL contains a username or password.</li>
      <li><code>reject:host</code>: empty host (after stripping one trailing dot).</li>
      <li>IP literal hosts: <code>reject:private_ip</code> if not globally routable (loopback, private, link-local like <code>169.254.169.254</code>, reserved); otherwise <code>reject:ip_literal</code> (we only fetch from named, allow-listed hosts).</li>
      <li><code>reject:host</code>: host (lowercase) not in <code>allowed_hosts</code>.</li>
      <li><code>reject:port</code>: an invalid port, or a port other than 443.</li></ol>`,
    constraints: `Use urllib.parse.urlsplit and ipaddress. No DNS lookups in this function (resolution happens later, see follow-ups).`,
    example: `${H.table(['url', 'result'], [['https://images.example-cdn.com/a.png', '<span class="c-g">ok</span>'], ['https://169.254.169.254/latest/meta-data/', '<span class="c-r">reject:private_ip</span> (cloud credentials live here)'], ['https://user:pw@images.example-cdn.com/', '<span class="c-r">reject:userinfo</span>'], ['https://images.example-cdn.com.evil.net/', '<span class="c-r">reject:host</span>']])}`,
    brute: {
      why: `<p><code>if "example-cdn.com" in url</code>. Bypassed by <code>https://example-cdn.com.evil.net</code>, <code>https://evil.net/?example-cdn.com</code> and <code>https://example-cdn.com@evil.net</code> (the part before <code>@</code> is a username). Parse the URL and compare the exact host.</p>`,
      code: { lang: 'python', code: `def check_url(url: str, allowed_hosts: list[str]) -> str:
    return "ok" if any(h in url for h in allowed_hosts) else "reject:host"    # substring match` }
    },
    mcq: { q: 'The hostname check passes. What can still send the request to an internal address?', options: ['DNS that resolves the allowed name to 10.x, or a redirect to an internal URL', 'A long path', 'HTTPS', 'A query string'], answer: 0, explain: 'Validate the resolved IP addresses too, pin the connection to them, and disable redirects (or re-check each hop).' },
    hints: [
      `<p>Hint 1: <code>u = urlsplit(url.strip())</code>; <code>u.scheme</code>, <code>u.username</code>, <code>u.password</code>, <code>u.hostname</code> (already lowercased) and <code>u.port</code> (raises <code>ValueError</code> when invalid) give you everything.</p>`,
      `<p>Hint 2: <code>ipaddress.ip_address(host)</code> raises ValueError for names; for real IPs use <code>.is_global</code>, which is False for private, loopback, link-local and reserved ranges.</p>`,
      `<p>Hint 3: follow the given order exactly; check the port last so <code>https://127.0.0.1:8443</code> reports private_ip.</p>`
    ],
    solution: {
      approach: `<p>Parse, then check from the cheapest and most decisive rule to the last. IP literals are rejected outright, which also blocks the classic metadata endpoint. At fetch time, resolve the host, check every returned address with <code>is_global</code>, connect to that address with <code>follow_redirects=False</code>, a short timeout and a response size cap, or send all user-driven fetches through an egress proxy that applies the same rules.</p>`,
      code: { lang: 'python', run: true, code: `import ipaddress
from urllib.parse import urlsplit


def check_url(url: str, allowed_hosts: list[str]) -> str:
    u = urlsplit(url.strip())
    if u.scheme.lower() != "https":
        return "reject:scheme"
    if u.username is not None or u.password is not None:
        return "reject:userinfo"
    host = u.hostname or ""            # urlsplit already lowercases it
    if host.endswith("."):
        host = host[:-1]
    if not host:
        return "reject:host"
    try:
        ip = ipaddress.ip_address(host)
    except ValueError:
        ip = None
    if ip is not None:
        return "reject:ip_literal" if ip.is_global else "reject:private_ip"
    if host not in {h.lower() for h in allowed_hosts}:
        return "reject:host"
    try:
        port = u.port
    except ValueError:
        return "reject:port"
    if port not in (None, 443):
        return "reject:port"
    return "ok"


print(check_url("https://169.254.169.254/latest/meta-data/", ["images.example-cdn.com"]))` },
      complexity: `<p>O(len(url) + len(allowed_hosts)).</p>`,
      followUps: ['Write the fetch step with httpx that resolves, re-checks and pins the IP.', 'Why is <code>https://2130706433/</code> dangerous in some HTTP clients even though this check rejects it?']
    },
    tests: { fn: 'checkUrl', names: { python: 'check_url' }, sig: 'string string[] -> string', cases: [
      [['https://images.example-cdn.com/a.png', ['images.example-cdn.com']], 'ok'],
      [['http://images.example-cdn.com/a.png', ['images.example-cdn.com']], 'reject:scheme'],
      [['https://169.254.169.254/latest/meta-data/', ['images.example-cdn.com']], 'reject:private_ip'],
      [['https://127.0.0.1:8443/', ['images.example-cdn.com']], 'reject:private_ip'],
      [['https://[::1]/', ['images.example-cdn.com']], 'reject:private_ip'],
      [['https://10.0.0.5/', ['images.example-cdn.com']], 'reject:private_ip'],
      [['https://8.8.8.8/', ['images.example-cdn.com']], 'reject:ip_literal'],
      [['https://user:pw@images.example-cdn.com/', ['images.example-cdn.com']], 'reject:userinfo'],
      [['https://images.example-cdn.com.evil.net/', ['images.example-cdn.com']], 'reject:host'],
      [['https://IMAGES.example-cdn.com./x', ['images.example-cdn.com']], 'ok'],
      [['https://images.example-cdn.com:8443/x', ['images.example-cdn.com']], 'reject:port'],
      [['https://images.example-cdn.com:443/x', ['images.example-cdn.com']], 'ok'],
      [['file:///etc/passwd', ['images.example-cdn.com']], 'reject:scheme'],
      [['https:///nohost', ['images.example-cdn.com']], 'reject:host'],
      [['https://2130706433/', ['images.example-cdn.com']], 'reject:host'],
      [['https://images.example-cdn.com:abc/', ['images.example-cdn.com']], 'reject:port']
    ] }
  });

  /* =====================================================================
     PRACTICE — Hard
     ===================================================================== */
  practice.push({
    title: 'Spot the Vulnerabilities in a Login Endpoint',
    level: 'Hard', tags: ['code review', 'timing attack', 'user enumeration', 'rate limiting'], companies: ['Google', 'Razorpay', 'Atlassian'],
    statement: `<p>Review this login route. List every vulnerability, say why it matters, and write the fixed version.</p>
      <pre>SECRET_KEY = "super-secret-key"

@app.post("/login")
async def login(body: dict, db: Session = Depends(get_session)):
    log.info(f"login attempt {body}")
    row = db.execute(text(f"SELECT * FROM users WHERE email = '{body['email']}'")).first()
    if row is None:
        raise HTTPException(404, "No account with that email")
    if hashlib.sha256(body["password"].encode()).hexdigest() != row.password_hash:
        raise HTTPException(401, "Wrong password")
    token = jwt.encode({"sub": row.id, "admin": row.is_admin}, SECRET_KEY)
    return {"token": token, "user": dict(row._mapping)}</pre>`,
    constraints: `FastAPI, SQLAlchemy 2.0, PyJWT, pwdlib. Keep the endpoint a drop-in replacement for the mobile app (form-encoded OAuth2 is fine).`,
    example: `${H.table(['#', 'Problem', 'Impact'], [['1', 'hard-coded weak <code>SECRET_KEY</code>', 'anyone can mint admin tokens'], ['2', 'f-string SQL', 'SQL injection: <code>\' OR 1=1 --</code>'], ['3', '404 vs 401 messages', 'user enumeration'], ['4', 'early return for unknown users', 'timing enumeration'], ['5', 'unsalted SHA-256, <code>!=</code> compare', 'fast offline cracking, timing leak'], ['6', 'password logged', 'secrets in logs'], ['7', 'no exp/aud/iss, int sub', 'tokens valid forever, across services'], ['8', 'whole row returned', 'leaks the password hash'], ['9', 'no rate limit', 'unlimited guessing'], ['10', 'CPU work in <code>async def</code>', 'event loop stalls under load']])}`,
    brute: {
      why: `<p>Fixing only the obvious SQL injection. The endpoint would still mint forgeable tokens (weak hard-coded key), tell attackers which emails exist (messages and timing), let them crack the leaked hashes quickly (fast hash) and guess without limit. Security review is a checklist, not a single bug hunt.</p>`,
      code: { lang: 'python', code: `row = db.execute(text("SELECT * FROM users WHERE email = :e"), {"e": body["email"]}).first()
# ...and everything else left as it was` }
    },
    mcq: { q: 'Why must an unknown email still run a password hash?', options: ['So the response time matches a wrong password and does not reveal which emails exist', 'To warm the CPU cache', 'Because SQLAlchemy needs it', 'To create the account automatically'], answer: 0, explain: 'A 1 ms reply versus a 50 ms reply is measurable over the internet with enough samples. Hash against a dummy value and return the same generic 401.' },
    hints: [
      `<p>Hint 1: walk the request in order: input parsing → logging → query → existence check → password check → token creation → response. Each step has at least one problem.</p>`,
      `<p>Hint 2: the fixes are mostly the earlier topics: settings for the key, bound parameters or the ORM, pwdlib with a dummy hash, PyJWT with exp/aud/iss and a string sub, a response model, a rate-limit dependency, and <code>def</code> instead of <code>async def</code>.</p>`,
      `<p>Hint 3: do not put <code>admin</code> in the token as a free boolean; grant scopes from the role at login (Topic 3), and make error responses identical for every failure.</p>`
    ],
    solution: {
      approach: `<p><b>Findings:</b> (1) hard-coded, guessable signing key; (2) SQL injection through an f-string; (3) different messages and status codes reveal registered emails; (4) early return makes unknown emails measurably faster; (5) unsalted fast SHA-256 and a non-constant-time comparison; (6) the request body, including the password, is logged; (7) the JWT has no <code>exp</code>, <code>iss</code>, <code>aud</code>, <code>jti</code>, an int <code>sub</code>, and a raw admin flag; (8) the full DB row, including the hash, is returned; (9) no rate limiting per account or IP; (10) CPU-heavy hashing would block the event loop in <code>async def</code>; (11) <code>body: dict</code> has no validation or size limit. <b>Fix:</b> the code below, plus migrating old SHA-256 hashes by verifying them once on login and re-hashing with argon2id (or forcing a reset), and rotating the old key immediately because it was in source control.</p>`,
      code: { lang: 'python', code: `import hashlib
import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Annotated

import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from pwdlib import PasswordHash
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.db import get_session
from app.limits import account_limiter, rate_limit, client_ip
from app.models import User

router = APIRouter(tags=["auth"])
audit_log = logging.getLogger("audit")
password_hash = PasswordHash.recommended()
DUMMY_HASH = password_hash.hash("dummy-password-for-timing-only")
FAILED = HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password",
                       headers={"WWW-Authenticate": "Bearer"})


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


@router.post("/auth/token", response_model=TokenOut,
             dependencies=[Depends(rate_limit("login-ip", 20, 900, client_ip))])
def login(request: Request,
          form: Annotated[OAuth2PasswordRequestForm, Depends()],
          db: Annotated[Session, Depends(get_session)],
          settings: Annotated[Settings, Depends(get_settings)]) -> TokenOut:
    email = form.username.strip().lower()
    if not account_limiter.allow(email):                 # per-account failures, Redis-backed
        raise FAILED                                     # same answer: no "account locked" hint
    user = db.scalars(select(User).where(User.email == email)).first()   # bound parameter
    ok, new_hash = password_hash.verify_and_update(form.password, user.password_hash if user else DUMMY_HASH)
    if user is None or not ok or not user.is_active:
        account_limiter.record_failure(email)
        audit_log.warning("login_failed", extra={"account": hashlib.sha256(email.encode()).hexdigest()[:16],
                                                  "ip": client_ip(request)})   # never the password
        raise FAILED
    if new_hash:
        user.password_hash = new_hash
        db.commit()
    now = datetime.now(timezone.utc)
    claims = {"sub": str(user.id), "iss": settings.jwt_issuer, "aud": settings.jwt_audience,
              "iat": now, "exp": now + timedelta(minutes=settings.access_token_minutes),
              "jti": uuid.uuid4().hex, "scope": " ".join(sorted(user.granted_scopes()))}
    token = jwt.encode(claims, settings.jwt_secret.get_secret_value(), algorithm="HS256")
    return TokenOut(access_token=token, expires_in=settings.access_token_minutes * 60)` },
      complexity: `<p>One indexed lookup by email, one argon2id verify (~50 ms CPU, in the threadpool because the route is <code>def</code>), two Redis round trips for limits.</p>`,
      followUps: ['How do you migrate the existing unsalted SHA-256 hashes without knowing the passwords (wrap them: argon2(sha256(pw)))?', 'What would you log on failure that helps detect credential stuffing without logging secrets?']
    },
    tests: { skip: 'framework wiring, verified by reading' }
  });

  practice.push({
    title: 'Verify JWTs with Key Rotation, Leeway and Issuer Checks',
    level: 'Hard', tags: ['JWT', 'key rotation', 'kid', 'clock skew'], companies: ['Auth0', 'Google', 'Stripe'],
    statement: `<p>Your service accepts HS256 tokens signed by any key in a rotation set. Write <code>verify_rotating(token, keys, issuer, audience, now)</code>, where <code>keys</code> are <code>"kid=secret"</code> strings. Return <code>"ok:&lt;sub&gt;:&lt;kid&gt;"</code> or the first failure, in this order:</p>
      <ol><li><code>error:malformed</code>: not 3 parts, or header/payload not a base64url JSON object (check the payload only after the signature).</li>
      <li><code>error:bad_alg</code>: <code>alg</code> is not <code>"HS256"</code>.</li>
      <li><code>error:unknown_kid</code>: no <code>kid</code> header, or it is not in <code>keys</code>.</li>
      <li><code>error:bad_signature</code>.</li>
      <li><code>error:missing_claim</code>: any of <code>sub, iss, aud, exp, iat</code> missing.</li>
      <li><code>error:expired</code>: <code>now - 60 &gt;= exp</code> (60 s leeway, PyJWT's rule).</li>
      <li><code>error:not_yet_valid</code>: <code>nbf</code> present and <code>nbf &gt; now + 60</code>, or <code>iat &gt; now + 60</code>.</li>
      <li><code>error:wrong_issuer</code>, then <code>error:wrong_audience</code> (aud may be a string or a list).</li></ol>
      <p>Test keys: <code>k1=test-key-one-not-real</code>, <code>k2=test-key-two-not-real</code>; now = 1700000000; issuer <code>https://auth.example.com</code>; audience <code>orders-api</code>.</p>`,
    constraints: `Standard library only. Up to 10 keys. Keys may contain "=" after the first one.`,
    example: `${H.table(['token', 'result'], [['kid k2, valid claims, sub u2', '<span class="c-g">ok:u2:k2</span>'], ['kid k1, exp = now − 30', '<span class="c-g">ok:u1:k1</span> (inside the leeway)'], ['kid k1, exp = now − 60', '<span class="c-r">error:expired</span>'], ['kid k9', '<span class="c-r">error:unknown_kid</span>'], ['kid k1 but signed with k2\'s key', '<span class="c-r">error:bad_signature</span>']])}`,
    brute: {
      why: `<p>Try every key until one verifies. It works, but costs N HMACs per request, makes "which key signed this?" invisible in logs, and if any old key leaked and was not removed, it keeps working silently. Selecting the key by <code>kid</code> is O(1), explicit, and makes removing a key an obvious, testable step.</p>`,
      code: { lang: 'python', code: `import base64, hashlib, hmac


def verify_rotating(token, keys, issuer, audience, now):
    h, p, s = token.split(".")
    for entry in keys:                                     # every key, every request
        secret = entry.split("=", 1)[1]
        mac = hmac.new(secret.encode(), (h + "." + p).encode(), hashlib.sha256).digest()
        if base64.urlsafe_b64encode(mac).rstrip(b"=").decode() == s:
            return "ok"                                    # and no claim checks at all
    return "error:bad_signature"` }
    },
    mcq: { q: 'You rotate from key k1 to k2. When can k1 be removed from the verification set?', options: ['After the longest-lived token signed with k1 has expired (plus leeway)', 'Immediately after deploying k2', 'Never', 'When k2 expires'], answer: 0, explain: 'Sign new tokens with k2 at once, keep accepting k1 until every k1 token has naturally expired, then remove it. For a leaked key, remove it immediately and accept forced re-logins.' },
    hints: [
      `<p>Hint 1: parse <code>keys</code> into a dict with <code>entry.split("=", 1)</code>. Read the header first (alg, kid), pick the key, then verify the signature before decoding the payload.</p>`,
      `<p>Hint 2: required claims first, then time checks with the leeway, then issuer and audience. Time rules: expired when <code>exp &lt;= now - 60</code>; not yet valid when <code>nbf &gt; now + 60</code> or <code>iat &gt; now + 60</code>.</p>`,
      `<p>Hint 3: return the kid with the result; in production you log it so you can see when traffic on the old key drops to zero and it is safe to remove.</p>`
    ],
    solution: {
      approach: `<p>Header → key selection by <code>kid</code> → signature → claims, mirroring <code>jwt.get_unverified_header</code> followed by <code>jwt.decode(token, keys[kid], algorithms=["HS256"], audience=..., issuer=..., leeway=60, options={"require": [...]})</code>. With asymmetric keys the same flow uses a JWKS and <code>PyJWKClient</code>. Rotation becomes routine: add the new key, switch signing, wait one token lifetime, remove the old key.</p>`,
      code: { lang: 'python', run: true, code: `import base64
import binascii
import hashlib
import hmac
import json

LEEWAY = 60
REQUIRED = ("sub", "iss", "aud", "exp", "iat")


def _b64d(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def _obj(seg: str):
    try:
        v = json.loads(_b64d(seg))
    except (ValueError, binascii.Error):
        return None
    return v if isinstance(v, dict) else None


def verify_rotating(token: str, keys: list[str], issuer: str, audience: str, now: int) -> str:
    key_by_kid = dict(entry.split("=", 1) for entry in keys if "=" in entry)
    parts = token.split(".")
    if len(parts) != 3:
        return "error:malformed"
    header = _obj(parts[0])
    if header is None:
        return "error:malformed"
    if header.get("alg") != "HS256":
        return "error:bad_alg"
    kid = header.get("kid")
    if not isinstance(kid, str) or kid not in key_by_kid:
        return "error:unknown_kid"
    mac = hmac.new(key_by_kid[kid].encode(), (parts[0] + "." + parts[1]).encode(), hashlib.sha256).digest()
    try:
        if not hmac.compare_digest(mac, _b64d(parts[2])):
            return "error:bad_signature"
    except (ValueError, binascii.Error):
        return "error:bad_signature"
    claims = _obj(parts[1])
    if claims is None:
        return "error:malformed"
    if any(c not in claims for c in REQUIRED):
        return "error:missing_claim"
    if claims["exp"] <= now - LEEWAY:
        return "error:expired"
    if ("nbf" in claims and claims["nbf"] > now + LEEWAY) or claims["iat"] > now + LEEWAY:
        return "error:not_yet_valid"
    if claims["iss"] != issuer:
        return "error:wrong_issuer"
    aud = claims["aud"]
    if audience not in (aud if isinstance(aud, list) else [aud]):
        return "error:wrong_audience"
    return "ok:" + str(claims["sub"]) + ":" + kid


print(verify_rotating("a.b", [], "", "", 0))` },
      complexity: `<p>O(n) in the token length plus O(k) to build the key map (cache it in real code). One HMAC per request regardless of how many keys are active.</p>`,
      followUps: ['How would you emit a metric per kid to know when the old key is unused?', 'What changes when the issuer moves to EdDSA with a JWKS endpoint?']
    },
    tests: { fn: 'verifyRotating', names: { python: 'verify_rotating' }, sig: 'string string[] string string long -> string', cases: [
      [[TK.h_ok_k1, ['k1=test-key-one-not-real', 'k2=test-key-two-not-real'], 'https://auth.example.com', 'orders-api', NOW], 'ok:u1:k1'],
      [[TK.h_ok_k2, ['k1=test-key-one-not-real', 'k2=test-key-two-not-real'], 'https://auth.example.com', 'orders-api', NOW], 'ok:u2:k2'],
      [[TK.h_unknown_kid, ['k1=test-key-one-not-real', 'k2=test-key-two-not-real'], 'https://auth.example.com', 'orders-api', NOW], 'error:unknown_kid'],
      [[TK.h_no_kid, ['k1=test-key-one-not-real', 'k2=test-key-two-not-real'], 'https://auth.example.com', 'orders-api', NOW], 'error:unknown_kid'],
      [[TK.h_wrong_key_for_kid, ['k1=test-key-one-not-real', 'k2=test-key-two-not-real'], 'https://auth.example.com', 'orders-api', NOW], 'error:bad_signature'],
      [[TK.h_leeway_ok, ['k1=test-key-one-not-real', 'k2=test-key-two-not-real'], 'https://auth.example.com', 'orders-api', NOW], 'ok:u1:k1'],
      [[TK.h_expired, ['k1=test-key-one-not-real', 'k2=test-key-two-not-real'], 'https://auth.example.com', 'orders-api', NOW], 'error:expired'],
      [[TK.h_nbf_future, ['k1=test-key-one-not-real', 'k2=test-key-two-not-real'], 'https://auth.example.com', 'orders-api', NOW], 'error:not_yet_valid'],
      [[TK.h_nbf_leeway, ['k1=test-key-one-not-real', 'k2=test-key-two-not-real'], 'https://auth.example.com', 'orders-api', NOW], 'ok:u1:k1'],
      [[TK.h_iat_future, ['k1=test-key-one-not-real', 'k2=test-key-two-not-real'], 'https://auth.example.com', 'orders-api', NOW], 'error:not_yet_valid'],
      [[TK.h_wrong_iss, ['k1=test-key-one-not-real', 'k2=test-key-two-not-real'], 'https://auth.example.com', 'orders-api', NOW], 'error:wrong_issuer'],
      [[TK.h_wrong_aud, ['k1=test-key-one-not-real', 'k2=test-key-two-not-real'], 'https://auth.example.com', 'orders-api', NOW], 'error:wrong_audience'],
      [[TK.h_missing_sub, ['k1=test-key-one-not-real', 'k2=test-key-two-not-real'], 'https://auth.example.com', 'orders-api', NOW], 'error:missing_claim'],
      [[TK.h_rs256, ['k1=test-key-one-not-real', 'k2=test-key-two-not-real'], 'https://auth.example.com', 'orders-api', NOW], 'error:bad_alg'],
      [['a.b', ['k1=test-key-one-not-real'], 'https://auth.example.com', 'orders-api', NOW], 'error:malformed'],
      [[TK.h_ok_k1, ['k2=test-key-two-not-real'], 'https://auth.example.com', 'orders-api', NOW], 'error:unknown_kid']
    ] }
  });

  practice.push({
    title: 'Implement a GCRA Rate Limiter (One Timestamp per Key)',
    level: 'Hard', tags: ['rate limiting', 'GCRA', 'Redis'], companies: ['Cloudflare', 'GitHub', 'Shopify'],
    statement: `<p>GCRA stores a single number per key: the <b>theoretical arrival time</b> (TAT). With emission interval <code>T = period_ms</code> and burst size <code>B</code>, the tolerance is <code>tau = (B - 1) × T</code>. For each request at time <code>t</code>:</p>
      <ol><li><code>tat_eff = max(tat, t)</code> (on the first request, <code>tat = t</code>).</li>
      <li>If <code>tat_eff - t &gt; tau</code> → reject (<code>false</code>), state unchanged.</li>
      <li>Otherwise allow (<code>true</code>) and set <code>tat = tat_eff + T</code>.</li></ol>
      <p>Write <code>gcra(period_ms, burst, times_ms)</code> returning the list of decisions. It should agree with a token bucket of capacity B refilling one token every T ms.</p>`,
    constraints: `1 ≤ period_ms ≤ 10<sup>9</sup>, 1 ≤ burst ≤ 10<sup>6</sup>, up to 10<sup>5</sup> non-decreasing integer times.`,
    example: `${H.table(['T', 'B', 'times', 'result'], [['1000', '3', '0, 0, 0, 0, 1000', 'T T T <span class="c-r">F</span> T'], ['1000', '1', '0, 500, 1000, 1000', 'T <span class="c-r">F</span> T <span class="c-r">F</span>']])}`,
    brute: {
      why: `<p>A sliding log per key: store every timestamp of the last window in a Redis sorted set. Accurate, but memory grows with the allowed rate (a 1000/min key stores 1000 entries) and every request does several commands. GCRA needs one integer and one atomic compare-and-set.</p>`,
      code: { lang: 'python', code: `def gcra(period_ms: int, burst: int, times_ms: list[int]) -> list[bool]:
    log: list[int] = []
    out = []
    window = period_ms * burst
    for t in times_ms:
        log = [x for x in log if t - x < window]      # O(window) memory and time per key
        out.append(len(log) < burst)
        if out[-1]:
            log.append(t)
    return out                                         # also not the same burst semantics` }
    },
    mcq: { q: 'Why is GCRA attractive for a Redis-backed limiter?', options: ['One value per key, updated with a single atomic script, with token-bucket behaviour', 'It needs no clock', 'It allows unlimited bursts', 'It stores every request'], answer: 0, explain: 'The whole state is the TAT. A Lua script reads it, decides, and writes the new TAT atomically, which keeps memory tiny even for millions of keys.' },
    hints: [
      `<p>Hint 1: start with <code>tat = None</code>; on each request compute <code>tat_eff = t if tat is None or tat &lt; t else tat</code>.</p>`,
      `<p>Hint 2: <code>tau = (burst - 1) * period_ms</code>. Reject when <code>tat_eff - t &gt; tau</code>; note that rejected requests do not move the TAT.</p>`,
      `<p>Hint 3: the retry-after for a rejection is <code>tat_eff - t - tau</code> milliseconds; you will need it for the 429 header in the Redis version.</p>`
    ],
    solution: {
      approach: `<p>The TAT is "when the bucket would be empty if requests kept arriving at the allowed rate". A request is allowed while that moment is not more than <code>tau</code> in the future. In Redis, a Lua script does <code>GET</code>, the comparison, and <code>SET key new_tat PX ...</code> atomically, with the Redis server time (<code>TIME</code>) as the clock, so all workers share one consistent clock.</p>`,
      code: { lang: 'python', run: true, code: `def gcra(period_ms: int, burst: int, times_ms: list[int]) -> list[bool]:
    tau = (burst - 1) * period_ms
    tat = None
    out: list[bool] = []
    for t in times_ms:
        tat_eff = t if tat is None or tat < t else tat
        if tat_eff - t > tau:
            out.append(False)            # retry after (tat_eff - t - tau) ms
        else:
            tat = tat_eff + period_ms
            out.append(True)
    return out


# Redis version (atomic): the same three lines inside a Lua script.
GCRA_LUA = """
local now = tonumber(ARGV[1]); local period = tonumber(ARGV[2]); local tau = tonumber(ARGV[3])
local tat = tonumber(redis.call('GET', KEYS[1]) or now)
if tat < now then tat = now end
if tat - now > tau then return {0, tat - now - tau} end
redis.call('SET', KEYS[1], tat + period, 'PX', tat + period - now + tau)
return {1, 0}
"""
print(gcra(1000, 3, [0, 0, 0, 0, 1000]))` },
      complexity: `<p>O(1) time and O(1) state per request and key.</p>`,
      followUps: ['Prove that GCRA and the token bucket from Topic 6 give the same decisions.', 'How would you support a cost &gt; 1 per request?']
    },
    tests: { fn: 'gcra', sig: 'long int long[] -> bool[]', cases: [
      [[1000, 3, [0, 0, 0, 0, 1000]], [true, true, true, false, true]],
      [[1000, 1, [0, 500, 1000, 1000]], [true, false, true, false]],
      [[100, 2, []], []],
      [[1000, 2, [0, 0, 0, 10000, 10000, 10000]], [true, true, false, true, true, false]],
      [[250, 4, [0, 0, 0, 0, 0, 100, 250, 260, 500]], [true, true, true, true, false, false, true, false, true]],
      [[1, 1, [0, 1, 2, 2, 3]], [true, true, true, false, true]],
      [[60000, 5, [0, 1, 2, 3, 4, 5, 59999, 60000]], [true, true, true, true, true, false, false, true]]
    ] }
  });

  practice.push({
    title: 'Design Auth, Config and Abuse Controls for a Multi-Tenant FastAPI SaaS',
    level: 'Hard', tags: ['system design', 'multi-tenant', 'security architecture'], companies: ['Salesforce', 'Freshworks', 'Notion'],
    statement: `<p>You are building <b>InvoiceHub</b>: companies (tenants) sign up, invite staff, and their customers pay invoices through a public link. Design the security for the FastAPI backend: login and tokens, roles and scopes per tenant, tenant isolation in the database, API keys for integrations, CORS for the web app and the embeddable pay widget, configuration and secrets across three environments, and rate limits. Give the key code pieces.</p>`,
    constraints: `FastAPI + SQLAlchemy + PostgreSQL + Redis, 4 pods × 4 workers. 2,000 tenants, peak 500 req/s. Some enterprise tenants want SSO later. One security engineer reviews everything.`,
    example: `${H.table(['Actor', 'Authenticates with', 'Can do'], [['tenant staff (web)', 'password + MFA → access token (15 min) + refresh cookie', 'scopes from tenant role: invoices:read/write, members:admin'], ['integration (server)', 'API key <code>ih_live_…</code> hashed in DB', 'scopes chosen when the key is created'], ['payer (public link)', 'signed, single-invoice link token', 'view and pay that one invoice only']])}`,
    brute: {
      why: `<p>One global <code>role</code> column, tenant filtering "remembered" in each query, a shared HS256 key in a committed <code>config.py</code>, <code>allow_origins=["*"]</code> for the widget, and per-worker in-memory rate limits. The first forgotten <code>WHERE tenant_id</code> leaks one company's invoices to another; the committed key lets anyone forge tokens for every tenant.</p>`,
      code: { lang: 'python', code: `invoices = db.scalars(select(Invoice).where(Invoice.id == invoice_id)).all()   # which tenant?` }
    },
    mcq: { q: 'What is the strongest guard against cross-tenant leaks?', options: ['Tenant id from the token, applied by one repository layer, plus PostgreSQL Row Level Security', 'Asking developers to remember WHERE tenant_id', 'A separate CORS origin per tenant', 'Longer JWTs'], answer: 0, explain: 'Make the safe path the only path in code, and have the database enforce it again, so a single mistake cannot leak data.' },
    hints: [
      `<p>Hint 1: separate the identities: staff users, integration API keys, and anonymous payers each get a different credential type, lifetime and scope set.</p>`,
      `<p>Hint 2: the token carries <code>sub</code>, <code>tid</code> (tenant) and <code>scope</code>; a <code>TenantContext</code> dependency sets <code>SET LOCAL app.tenant_id</code> on the session so RLS policies apply to every query in the transaction.</p>`,
      `<p>Hint 3: CORS: the dashboard origin with credentials; the pay widget calls a separate public router with no cookies, so <code>"*"</code> without credentials is acceptable there. Rate limits keyed by tenant, user, API key and payer link in Redis.</p>`
    ],
    solution: {
      approach: `<p><b>Identity.</b> Staff log in through <code>/auth/token</code> (argon2id via pwdlib, MFA for admins, per-account and per-IP throttling). Access tokens are 15-minute JWTs with <code>sub</code>, <code>tid</code>, <code>scope</code>, <code>iss</code>, <code>aud</code>, <code>jti</code>, signed with EdDSA keys (kid + JWKS, so a future SSO gateway and other services can verify without sharing secrets). Refresh tokens are random, hashed, rotated with reuse detection, in an HttpOnly SameSite=Strict cookie scoped to <code>/auth/refresh</code>. Enterprise SSO later plugs in as another way to reach the same token issuance.</p>
        <p><b>Authorization.</b> Roles live per membership (user × tenant): owner, admin, accountant, viewer → scopes table. <code>Security(get_principal, scopes=[...])</code> on routes; admin routers guarded at router level. Integrations use API keys (<code>ih_live_</code> prefix for secret scanning, SHA-256 hashed in DB because they are high-entropy, scopes fixed at creation, last-used tracking, rotation with overlap). Payers get a signed link token bound to one invoice id and expiry; it grants <code>invoice:pay</code> on that id only.</p>
        <p><b>Tenant isolation.</b> Every tenant-owned table has <code>tenant_id</code>; a <code>TenantSession</code> dependency runs <code>SET LOCAL app.tenant_id</code> from the verified token, and PostgreSQL RLS policies enforce <code>tenant_id = current_setting('app.tenant_id')::bigint</code>. Repositories also filter explicitly (belt and braces); a matrix test tries every route with a token from tenant A against data from tenant B and expects 404.</p>
        <p><b>Edges.</b> CORS: dashboard origin only, with credentials; the public pay router allows <code>*</code> without credentials and serves no cookies. Pydantic models with <code>extra="forbid"</code>, bounded pagination, 1 MiB bodies, separate upload route with size and type checks, SSRF-guarded webhook URLs for integrations. Rate limits in Redis (GCRA): per IP at the edge, per tenant plan, per user, per API key, and per payer link; 429 with Retry-After.</p>
        <p><b>Config and secrets.</b> <code>pydantic-settings</code> with validators (no placeholders, no debug in prod, no CORS wildcard with credentials), secrets from the cloud secrets manager mounted as files (<code>secrets_dir</code>), different keys per environment, signing keys rotated quarterly with overlap, <code>.env</code> only on laptops and in <code>.gitignore</code>, gitleaks in pre-commit and CI, pip-audit and bandit in CI. Audit log for logins, role changes, API key creation, cross-tenant support access.</p>`,
      code: { lang: 'python', code: `from typing import Annotated

from fastapi import Depends, HTTPException, Security, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.auth import Principal, get_principal       # verifies the JWT or API key, returns sub/tid/scopes
from app.db import get_session


def tenant_session(principal: Annotated[Principal, Security(get_principal, scopes=[])],
                   db: Annotated[Session, Depends(get_session)]) -> Session:
    if principal.tenant_id is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No tenant in token")
    # SET LOCAL lasts until the end of this transaction; RLS policies read it.
    db.execute(text("SELECT set_config('app.tenant_id', :tid, true)"), {"tid": str(principal.tenant_id)})
    return db


TenantDB = Annotated[Session, Depends(tenant_session)]

# PostgreSQL, once per tenant-owned table (in an Alembic migration):
#   ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
#   ALTER TABLE invoices FORCE ROW LEVEL SECURITY;
#   CREATE POLICY tenant_isolation ON invoices
#     USING (tenant_id = current_setting('app.tenant_id')::bigint);` },
      complexity: `<p>Per request: one signature verification (EdDSA, microseconds), one Redis round trip for limits, one <code>set_config</code> statement on the existing transaction. RLS adds a predicate the planner folds into index scans on <code>(tenant_id, ...)</code>.</p>`,
      followUps: ['How does a support engineer read a tenant\'s data for a ticket, and how is that audited?', 'What changes when one enterprise tenant requires its own database?', 'How do you rotate the EdDSA signing key with zero downtime?']
    },
    tests: { skip: 'framework wiring, verified by reading' }
  });

  /* =====================================================================
     QUIZ
     ===================================================================== */
  quiz.push({
    q: 'Which is the best choice for hashing passwords in a new FastAPI project in 2026?',
    options: ['argon2id through <code>pwdlib</code> or <code>argon2-cffi</code>', '<code>hashlib.sha256(password + salt)</code>', '<code>passlib</code> with MD5-crypt', 'AES-encrypting the password with a key from settings'],
    answer: 0,
    explain: 'argon2id is memory-hard and tunable. SHA-256 is too fast, passlib is unmaintained, and encryption is reversible by whoever holds the key.'
  });
  quiz.push({
    q: 'Your login route is <code>async def</code> and calls <code>password_hash.verify()</code> directly. Under load, all endpoints slow down. Why?',
    options: ['The ~50 ms CPU-bound hash blocks the event loop; use <code>def</code> or <code>asyncio.to_thread</code>', 'argon2 uses the network', 'FastAPI disables async for auth routes', 'The JWT is too large'],
    answer: 0,
    explain: 'Blocking work inside async def stalls every coroutine on that worker. A def route runs in the threadpool; argon2-cffi releases the GIL while hashing.'
  });
  quiz.push({
    q: 'What does the <code>algorithms=["HS256"]</code> argument to <code>jwt.decode</code> protect against?',
    options: ['A token header choosing <code>none</code> or switching to an algorithm the server did not intend', 'Expired tokens', 'Tokens for another audience', 'Replay of the same token'],
    answer: 0,
    explain: 'The server, not the token, decides which algorithms are acceptable. exp, aud and replay are separate checks.'
  });
  quiz.push({
    q: 'Which body format does <code>OAuth2PasswordRequestForm</code> expect at the token endpoint?',
    options: ['Form fields <code>username</code> and <code>password</code> (application/x-www-form-urlencoded)', 'JSON <code>{"email": ..., "password": ...}</code>', 'Basic auth header only', 'A query string'],
    answer: 0,
    explain: 'The OAuth2 password grant uses form fields; FastAPI needs python-multipart to parse them. That is also what the Swagger Authorize dialog sends.'
  });
  quiz.push({
    q: 'A request carries a valid token that lacks the <code>orders:refund</code> scope required by the route. Status?',
    options: ['403', '401', '404', '422'],
    answer: 0,
    explain: 'The caller is authenticated (so not 401) but not allowed. Add WWW-Authenticate: Bearer error="insufficient_scope" to say which scope is missing.'
  });
  quiz.push({
    q: 'User 7 requests <code>GET /invoices/42</code>, which belongs to user 9. What should a customer-facing API return?',
    options: ['404, the same as a non-existent invoice', '403 "this invoice is not yours"', '200 with the invoice', '401'],
    answer: 0,
    explain: 'Returning 404 hides whether the id exists, so attackers cannot map your data. Implement it by filtering on owner in the query.'
  });
  quiz.push({
    q: 'In FastAPI, what does a <code>SecurityScopes</code> parameter receive?',
    options: ['All scopes required by every <code>Security(...)</code> in the dependency chain for this route', 'The scopes in the JWT', 'The scopes defined on <code>OAuth2PasswordBearer</code>', 'The user\'s roles from the database'],
    answer: 0,
    explain: 'FastAPI collects the required scopes along the chain. You compare them with the token\'s scope claim yourself.'
  });
  quiz.push({
    q: '<code>CORSMiddleware(allow_origins=["*"], allow_credentials=True)</code>: what really happens in Starlette?',
    options: ['The incoming Origin is echoed back, so every site may make credentialed requests and read replies', 'Browsers block every request', 'Only same-origin requests work', 'Credentials are silently dropped'],
    answer: 0,
    explain: 'Because browsers reject * with credentials, Starlette reflects the origin. That trusts the whole internet with your users\' cookies.'
  });
  quiz.push({
    q: 'Does CORS stop <code>curl</code> or another server from calling your API?',
    options: ['No. CORS is enforced by browsers only; authentication and authorization must protect the API', 'Yes, the middleware rejects unknown origins', 'Only for POST', 'Only with credentials'],
    answer: 0,
    explain: 'Non-browser clients ignore CORS headers and can send any Origin. CORS protects users\' browsers, not your server.'
  });
  quiz.push({
    q: 'With pydantic-settings, the same field is set in the real environment and in <code>.env</code>. Which value wins by default?',
    options: ['The environment variable', 'The .env file', 'The field default', 'Whichever was defined last in the class'],
    answer: 0,
    explain: 'Priority: init arguments > environment variables > .env file > secrets_dir > defaults. Production sets real variables; .env is for laptops.'
  });
  quiz.push({
    q: 'Why declare <code>jwt_secret: SecretStr</code> instead of <code>str</code>?',
    options: ['It prints as <code>**********</code> in repr, str and JSON dumps, so it does not leak into logs by accident', 'It encrypts the value in memory', 'It generates a random key', 'It is faster'],
    answer: 0,
    explain: 'SecretStr hides the value from casual printing. You call get_secret_value() only where the key is used. It does not encrypt anything.'
  });
  quiz.push({
    q: 'Your in-memory rate limiter allows 10 requests/minute. The app runs 4 Uvicorn workers on 2 pods. What is the effective limit?',
    options: ['Up to 80 per minute', '10 per minute', '40 per minute', '5 per minute'],
    answer: 0,
    explain: '8 processes, each with its own counters. Shared storage (Redis) or the gateway gives one consistent limit.'
  });
  quiz.push({
    q: 'Which Pydantic setting stops clients from setting fields such as <code>is_admin</code> that are not in your input model?',
    options: ['<code>model_config = ConfigDict(extra="forbid")</code>', '<code>from_attributes=True</code>', '<code>strict=False</code>', '<code>populate_by_name=True</code>'],
    answer: 0,
    explain: 'extra="forbid" turns unknown keys into a 422 (OWASP API3, mass assignment). Combine with separate input and output models.'
  });
  quiz.push({
    q: 'Which of these is safe for untrusted input?',
    options: ['<code>yaml.safe_load(text)</code>', '<code>pickle.loads(body)</code>', '<code>subprocess.run(cmd, shell=True)</code>', '<code>eval(expression)</code>'],
    answer: 0,
    explain: 'safe_load builds only plain data types. Unpickling, shell=True with input, and eval can all run attacker-chosen code.'
  });

  /* =====================================================================
     INTERVIEW
     ===================================================================== */
  interview.push({
    q: 'How do you store and verify passwords in a FastAPI service?',
    level: 'B',
    a: `<p>I never store the password or anything reversible. At signup I hash with <b>argon2id</b> through <code>pwdlib</code> (or <code>argon2-cffi</code>): it generates a random salt and returns a self-describing PHC string with algorithm, parameters, salt and digest, which goes in one column. At login I call <code>verify_and_update</code>: it checks in constant time and, if the stored hash uses old parameters or bcrypt, hands me a new hash to save, so upgrades happen silently. Unknown emails are verified against a dummy hash so timing and messages are identical ("Incorrect email or password"). The route is a plain <code>def</code> (or uses <code>asyncio.to_thread</code>) because hashing is deliberately CPU-heavy, and <code>/token</code> is rate-limited per account and per IP. The hash is only in the DB model, never in a response model.</p>`,
    followUps: ['How do you choose argon2 parameters?', 'How would you migrate users from unsalted SHA-256?']
  });
  interview.push({
    q: 'Walk me through the OAuth2 password flow with JWT in FastAPI.',
    level: 'I',
    a: `<p>The client posts form fields to <code>/auth/token</code>; <code>OAuth2PasswordRequestForm</code> parses them. I verify the password, then sign an access token with PyJWT: <code>sub</code> as a string, <code>iss</code>, <code>aud</code>, <code>iat</code>, <code>exp</code> about 15 minutes ahead, <code>jti</code> and a <code>scope</code> claim, using a key from settings. The response is <code>{"access_token", "token_type": "bearer"}</code>. Protected routes depend on <code>get_current_user</code>, which takes the token from <code>OAuth2PasswordBearer</code> (401 if the header is missing), calls <code>jwt.decode(token, key, algorithms=["HS256"], audience=..., issuer=..., leeway=30, options={"require": [...]})</code>, maps any <code>InvalidTokenError</code> to 401 with <code>WWW-Authenticate: Bearer</code>, then loads the user and checks <code>is_active</code>. Long sessions use a rotated refresh token in an HttpOnly cookie. For third-party clients I would use Authorization Code + PKCE instead of the password grant.</p>`,
    followUps: ['What claims are mandatory for you and why?', 'Why not put the user\'s email and roles in the token?']
  });
  interview.push({
    q: 'When do you return 401 and when 403? And when 404?',
    level: 'B',
    a: `<p><b>401 Unauthorized</b> means "I do not know who you are": no token, a bad signature, expired, wrong audience. It comes with <code>WWW-Authenticate: Bearer</code> and clients may refresh and retry once. <b>403 Forbidden</b> means "I know who you are, and you may not do this": a missing scope or a role without the permission; retrying will not help, and for scopes I add <code>error="insufficient_scope"</code> with the needed scope. <b>404</b> is what I return when a user asks for a specific record they do not own: it is indistinguishable from a record that does not exist, so attackers cannot enumerate ids (BOLA). The implementation is an ownership filter in the query, so "not yours" and "not there" are literally the same code path.</p>`,
    followUps: ['Does FastAPI\'s OAuth2PasswordBearer return 401 or 403 when the header is missing?', 'Is 404 ever wrong for authorization failures?']
  });
  interview.push({
    q: 'Scopes vs roles: how do you model permissions in a FastAPI API?',
    level: 'I',
    a: `<p>Roles group permissions for people (customer, support, admin) and live in one table, ideally per tenant membership. Scopes describe what a particular <b>token</b> may do (<code>orders:read</code>, <code>orders:refund</code>); at login I grant the intersection of what the client requested and what the role allows, so a reporting script can get a read-only token even for an admin account. Routes declare required scopes with <code>Security(get_current_user, scopes=[...])</code>; <code>get_current_user</code> receives <code>SecurityScopes</code> and compares with the token's <code>scope</code> claim. Business rules that depend on attributes (refund limits) go in the service. Ownership goes in queries. Admin areas get router-level dependencies, and a role × route matrix test keeps it honest. Critical permissions can be re-checked against the DB to avoid stale roles in long-lived tokens.</p>`,
    followUps: ['How would you handle sharing (a user grants access to one document)?', 'How do scopes show up in OpenAPI?']
  });
  interview.push({
    q: 'Explain CORS. What would you configure for a React app on app.example.com calling api.example.com with cookies?',
    level: 'I',
    a: `<p>Browsers block pages from reading cross-origin responses unless the server opts in with CORS headers. Non-simple requests (JSON bodies, <code>Authorization</code>, PUT/DELETE) are preceded by an <code>OPTIONS</code> preflight asking about the origin, method and headers. For this setup: <code>CORSMiddleware(allow_origins=["https://app.example.com"], allow_credentials=True, allow_methods=[the ones used], allow_headers=["Content-Type", "X-CSRF-Token"], max_age=600)</code>, with origins read from settings so localhost only appears in development. Never <code>"*"</code> with credentials: Starlette would echo any origin. Because it is cookie-based, I also need CSRF protection: SameSite=Lax or Strict on the session cookie and a CSRF token header on state-changing requests. And I remember CORS only protects browsers; auth still runs on every request.</p>`,
    followUps: ['Why do some CORS errors hide a 500?', 'How do you allow preview deployments safely?']
  });
  interview.push({
    q: 'How do you manage configuration and secrets in a Python backend?',
    level: 'I',
    a: `<p>A typed <code>Settings(BaseSettings)</code> class from pydantic-settings, with <code>SettingsConfigDict(env_prefix="APP_", env_file=".env")</code>. Secrets are <code>SecretStr</code> and have no defaults, so a missing value fails at startup. Validators reject placeholders, short keys, debug in production and CORS wildcard with credentials. <code>get_settings()</code> is <code>lru_cache</code>d and injected via <code>Depends</code>, so tests override it. Locally, <code>.env</code> is in <code>.gitignore</code> and <code>.env.example</code> documents variables with placeholders. In production values come from a secrets manager as files (<code>secrets_dir</code>) or environment variables, per environment and per service, generated with <code>secrets.token_urlsafe(32)</code>. Signing keys rotate with overlap via <code>kid</code>. Secret scanning runs in pre-commit and CI, and logs pass through a redaction filter.</p>`,
    followUps: ['What is your playbook when a key is committed to a public repo?', 'Environment variables vs mounted secret files?']
  });
  interview.push({
    q: 'Design rate limiting for a FastAPI API that runs on several pods.',
    level: 'A',
    a: `<p>Layers. The edge (CDN/WAF) handles floods per IP. In the app, limits keyed by what only the app knows: user id, API key, tenant plan, and for <code>/auth/token</code> both the account and the IP. State lives in Redis because in-process counters multiply by workers × pods; the algorithm is a token bucket or GCRA implemented in a Lua script so read-decide-write is atomic and uses one clock. A FastAPI dependency computes the key and raises 429 with <code>Retry-After</code> (and optionally <code>RateLimit</code> headers). Client IP comes from Uvicorn with <code>--proxy-headers</code> and a trusted proxy list, never from a raw <code>X-Forwarded-For</code>. Expensive endpoints (LLM, SMS) are limited by cost and per target. If Redis is down: fail open with alerts for normal endpoints, fail closed or strict local limits for login and payments.</p>`,
    followUps: ['Token bucket vs sliding window vs GCRA?', 'How do you test a limiter under concurrency?']
  });
  interview.push({
    q: 'What is the OWASP API Security Top 10, and which items does FastAPI help with out of the box?',
    level: 'I',
    a: `<p>The 2023 list: API1 BOLA, API2 Broken Authentication, API3 Broken Object Property Level Authorization, API4 Unrestricted Resource Consumption, API5 Broken Function Level Authorization, API6 Unrestricted Access to Sensitive Business Flows, API7 SSRF, API8 Security Misconfiguration, API9 Improper Inventory Management, API10 Unsafe Consumption of APIs. FastAPI helps with API3 through Pydantic input models (<code>extra="forbid"</code>) and <code>response_model</code> output filtering, with API4 through declarative bounds (<code>Query(le=100)</code>, <code>max_length</code>), and with API9 because the OpenAPI document is generated from code and can be diffed in CI. Everything else is on me: ownership filters (API1), auth done right (API2), router-level permission dependencies (API5), business-flow limits (API6), URL validation for outbound fetches (API7), hardened settings (API8), and validating partner responses with timeouts (API10).</p>`,
    followUps: ['Give a concrete API3 bug you have seen.', 'How do you find BOLA bugs systematically?']
  });
  interview.push({
    q: 'How would you prevent SSRF in an endpoint that imports an image from a user-supplied URL?',
    level: 'A',
    a: `<p>Validate with an allow-list first: <code>https</code> only, no userinfo, port 443, host on an allow-list if the product allows it. Then resolve the host myself, check every resolved address with <code>ipaddress</code> (<code>is_global</code>; block loopback, private, link-local including <code>169.254.169.254</code>, and IPv6 equivalents), and connect to that pinned IP with the original Host/SNI so DNS rebinding cannot swap it. Disable redirects or re-validate each hop, set connect/read timeouts and a maximum response size, and check the content type and magic bytes of what comes back. Better still, run user-driven fetches through an egress proxy in a network segment that cannot reach internal services, and require IMDSv2 on AWS. Log the target for audits.</p>`,
    followUps: ['Why is checking the hostname string not enough?', 'How would you test this?']
  });
  interview.push({
    q: 'A JWT signing key leaked. What do you do, and how would you have designed for it?',
    level: 'A',
    a: `<p>Immediately: generate a new key in the secrets manager, deploy it as the signing key, and remove the leaked key from the verification set, accepting that all users must log in again; revoke refresh tokens if their store might be affected. Check logs for tokens signed with the old <code>kid</code> after the leak time, especially with unusual <code>sub</code> or scopes. Then find how it leaked (repo, CI log, image layer) and fix that path, with secret scanning to prevent a repeat. By design: keys carry a <code>kid</code>, the verifier accepts a set of keys, so routine rotation is a config change; tokens are short-lived; services that only verify get public keys (EdDSA/RS256 with JWKS) so a leak in one consumer cannot mint tokens; and high-risk actions re-check state in the DB.</p>`,
    followUps: ['How long do you keep the old key during a routine rotation?', 'What changes with asymmetric keys?']
  });
  interview.push({
    q: 'How do you validate input in FastAPI beyond "it is a string"?',
    level: 'B',
    a: `<p>Pydantic models are allow-lists: <code>Annotated[str, Field(min_length=1, max_length=50)]</code>, <code>pattern</code>, <code>Literal</code> for fixed choices, <code>EmailStr</code>, <code>HttpUrl</code>, numeric bounds with <code>ge</code>/<code>le</code>, list length limits, and <code>ConfigDict(extra="forbid", str_strip_whitespace=True)</code>. Cross-field rules use <code>model_validator</code>. Query parameters get the same treatment with <code>Query(ge=1, le=100)</code>. Separate input and output models stop mass assignment and data leaks. Validation is only the first layer: SQL still uses bound parameters, file paths are resolved and contained, subprocesses take argument lists, and outbound URLs are SSRF-checked. I also cap request body size at the proxy and in middleware, and make sure 422 responses do not echo secrets back.</p>`,
    followUps: ['Strict vs lax mode: when does it matter?', 'Where do you validate data from third-party APIs?']
  });
  interview.push({
    q: 'Review this: a teammate uses <code>random.choice</code> to generate password-reset tokens and compares them with <code>==</code>. What is wrong?',
    level: 'I',
    a: `<p><code>random</code> is a Mersenne Twister: fast and predictable. After observing enough outputs an attacker can predict future tokens, so they could reset other people's passwords. Use <code>secrets.token_urlsafe(32)</code>, which reads the OS cryptographic generator. Comparing with <code>==</code> can leak through timing how many leading characters matched; use <code>hmac.compare_digest</code>, or better, store only a SHA-256 hash of the token and look it up by hash, so a database leak does not expose live tokens either. Also: single use, short expiry (15-60 minutes), invalidate on use and on password change, rate-limit the request endpoint, and send the same response whether or not the email exists.</p>`,
    followUps: ['Why is a fast hash fine for reset tokens but not for passwords?', 'How do you stop reset-email flooding?']
  });
  interview.push({
    q: 'How do AI coding assistants change security work on a Python API?',
    level: 'E',
    a: `<p>They speed up the boring parts and multiply old mistakes. Generated FastAPI auth code often uses unmaintained libraries (passlib, python-jose), hard-coded example secrets, <code>jwt.decode</code> without audience or issuer, CORS wildcards and f-string SQL, so I review generated code against a checklist and back it with tooling: bandit or ruff <code>S</code> rules, pip-audit, gitleaks, an OpenAPI diff, and matrix tests for authorization. I use assistants deliberately for negative tests (expired, wrong audience, <code>alg: none</code>, cross-tenant access), threat-model drafts and reviewing diffs for OWASP API issues, then verify each finding. New risks come with AI features: agents with repository access can read <code>.env</code>; LLM outputs are untrusted input (prompt injection) and must be validated before they drive actions; AI endpoints need cost-based rate limits; and agents calling our API get their own narrowly scoped tokens.</p>`,
    followUps: ['How do you stop slopsquatting (hallucinated package names)?', 'What scopes would you give an AI agent that summarises orders?']
  });

  /* =====================================================================
     REGISTER
     ===================================================================== */
  registerModule({
    id: 'be19',
    title: 'Python Backend III: Auth, Security & Configuration',
    lang: 'python',
    intro: `<p>Your FastAPI service works. Now it has to be <b>safe to put on the internet</b>. This module turns the security ideas from <b>Backend 5</b> (Authentication &amp; Authorization) and <b>Backend 15</b> (Security Engineering) into working Python: the libraries to pick in 2026, the exact calls, and the traps that only appear in a real FastAPI app. Every example is Python; no Java needed.</p>
      <p>You will hash passwords with <b>argon2id</b> (pwdlib, argon2-cffi), build the <b>OAuth2 password flow with JWT</b> using <code>OAuth2PasswordBearer</code>, <code>OAuth2PasswordRequestForm</code> and PyJWT, protect routes with <b>scopes, roles and ownership</b> checks, configure <b>CORS</b> without the wildcard trap, load <b>settings and secrets</b> from the environment with pydantic-settings and <code>SecretStr</code>, add <b>rate limits</b> that work across workers, and harden input handling against the <b>OWASP API Top 10</b>. Wherever the core idea fits in the standard library (a JWT built by hand, a token bucket, a CORS preflight decision, a settings loader, SSRF and path guards) there is a runnable demo and a tested exercise.</p>
      <p>Next on the route: testing and quality for APIs (Python Backend IV), then workers, caching and deployment (V).</p>`,
    goals: [
      'Hash and verify passwords with argon2id via <code>pwdlib</code> / <code>argon2-cffi</code>, upgrade old hashes on login, defeat timing-based user enumeration, and keep hashing off the event loop',
      'Implement the OAuth2 password flow in FastAPI with <code>OAuth2PasswordRequestForm</code>, PyJWT access tokens (<code>exp</code>, <code>iss</code>, <code>aud</code>, <code>jti</code>) and a <code>get_current_user</code> dependency that maps every failure to the right 401',
      'Explain what a JWT is byte by byte and why <code>alg: none</code>, a missing algorithm allow-list or a missing expiry/audience check are dangerous',
      'Protect routes with <code>Security(..., scopes=[...])</code>, <code>SecurityScopes</code>, permission dependencies, router-level guards and ownership filters, and choose correctly between 401, 403 and 404',
      'Configure <code>CORSMiddleware</code> from settings, explain preflight requests, and fix wildcard-with-credentials and loose-regex misconfigurations',
      'Load typed, validated settings with <code>pydantic_settings.BaseSettings</code>, <code>SettingsConfigDict(env_file=...)</code> and <code>SecretStr</code>; generate, store, rotate and redact secrets safely',
      'Build token-bucket and GCRA rate limiters, run them on Redis across workers, and throttle login attempts per account and IP with proper 429 responses',
      'Use Pydantic models as allow-lists and recognise the OWASP API Top 10 and dangerous Python calls (pickle, yaml.load, shell=True, f-string SQL, unchecked URLs and paths) in code review'
    ],
    prereqs: `<b>Python Backend I</b> (FastAPI Fundamentals: routing, Pydantic models, response models, dependencies, async vs sync). The concepts from <b>Backend 5</b> (Authentication &amp; Authorization: hashing, sessions vs JWT, OAuth2, RBAC) are assumed and not re-taught in depth. Helpful: <b>Backend 15</b> (Security Engineering) and basic SQL. Python 3.11+. No Java required.`,
    hours: 12,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
