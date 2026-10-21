(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- small helpers shared by the visualizers (all toy / teaching only) ---------- */
  // A TOY 32-bit hash (FNV-1a) used ONLY so the visualizers can show "different input -> different output".
  // It is NOT secure. Real systems use argon2id / bcrypt / scrypt / PBKDF2.
  function toyHash(s) {
    var h = 2166136261, i;
    for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    var a = ('00000000' + h.toString(16)).slice(-8);
    h = 2166136261;
    s = s + '#';
    for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return a + ('00000000' + h.toString(16)).slice(-8);
  }
  var B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  // base64url for plain ASCII text (no padding), written by hand so it works in any JS sandbox.
  function b64url(str) {
    var out = '', i, n, c0, c1, c2;
    for (i = 0; i < str.length; i += 3) {
      c0 = str.charCodeAt(i); c1 = i + 1 < str.length ? str.charCodeAt(i + 1) : NaN; c2 = i + 2 < str.length ? str.charCodeAt(i + 2) : NaN;
      n = (c0 << 16) | ((isNaN(c1) ? 0 : c1) << 8) | (isNaN(c2) ? 0 : c2);
      out += B64.charAt((n >> 18) & 63) + B64.charAt((n >> 12) & 63);
      if (!isNaN(c1)) out += B64.charAt((n >> 6) & 63);
      if (!isNaN(c2)) out += B64.charAt(n & 63);
    }
    return out;
  }
  function short(s, n) { s = String(s); return s.length > n ? s.slice(0, n) + '…' : s; }

  /* =====================================================================
     TOPIC 1 — Password hashing
     ===================================================================== */
  topics.push({
    title: 'Storing Passwords Safely: Hashing, Salt, Pepper, bcrypt & argon2',
    analogy: `<p>Think of a <b>meat grinder</b>. You can turn a steak into mince in one second, but nobody can turn mince back into the steak. A password hash is the mince: the server keeps the mince, never the steak. When you log in, the server grinds what you typed and checks that it makes the <i>same mince</i>.</p>
      <p>A <b>salt</b> is a pinch of random spice added before grinding, a different spice for every user. Two users with the same steak now get different mince, so a thief cannot match them up. And a <b>slow</b> grinder (bcrypt, argon2) means that trying a billion guesses takes years, not minutes.</p>`,
    explain: `<p>🟢 <b>The golden rule: never store the password. Never store something you can turn back into the password.</b> Not plain text, not "encrypted" (encryption has a key, and keys leak). Store a <b>one-way hash</b>.</p>
      <p><b>Why plain "SHA-256(password)" is not enough:</b> SHA-256 is built to be <i>fast</i> (billions per second on a gaming GPU). Fast is great for checking a file, terrible for passwords. If your database leaks, an attacker simply tries the 10 million most common passwords against every row.</p>
      <p><b>Four ingredients of a safe password store:</b></p>
      <ol>
        <li><b>Salt</b> — a random value (16+ bytes) <i>unique per user</i>, stored right next to the hash. It is not secret. It kills "rainbow tables" (pre-computed hash lists) and hides the fact that two users share a password.</li>
        <li><b>Slow, tunable hash</b> — a <i>password hashing function</i> (also called a KDF, key-derivation function): <b>argon2id</b> (first choice today), <b>scrypt</b>, <b>bcrypt</b> (battle-tested, still fine), or <b>PBKDF2</b> (when you need FIPS compliance). You choose a "cost" so one hash takes about 100–500 ms on your server.</li>
        <li><b>Constant-time compare</b> — compare hashes with a function that always takes the same time, so timing cannot leak how many characters matched.</li>
        <li><b>Optional pepper</b> — a secret value kept <i>outside</i> the database (in a secrets manager / HSM) and mixed in (often as HMAC). If only the database leaks, the pepper is still unknown.</li>
      </ol>
      ${H.table(['Choice', 'Verdict', 'Why'], [
        ['Plain text', '<span class="c-r">never</span>', 'one leak = every account lost, plus password reuse on other sites'],
        ['MD5 / SHA-1 / SHA-256 alone', '<span class="c-r">never</span>', 'too fast; no salt = rainbow tables'],
        ['SHA-256 + salt', '<span class="c-y">weak</span>', 'salt helps, but still billions of guesses per second'],
        ['PBKDF2-HMAC-SHA256 (600k+ iterations)', '<span class="c-y">ok</span>', 'FIPS friendly, but cheap to attack with GPUs'],
        ['bcrypt (cost 10–12)', '<span class="c-g">good</span>', 'slow, built-in salt; 72-byte input limit'],
        ['scrypt / <b>argon2id</b>', '<span class="c-g">best</span>', 'memory-hard: each guess needs RAM, which GPUs/ASICs lack']
      ])}
      <p><b>What the stored string looks like</b> (one string holds everything needed to verify later):</p>
      <pre>$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHQ$K1y4...hash...
 |algorithm|     |memory KiB, passes, threads| |salt|   |hash|</pre>
      <p>Because the algorithm and cost live inside the string, you can <b>upgrade later</b>: at the next successful login, if the stored cost is old, re-hash the password you just received with the new settings (called <i>rehash on login</i>).</p>`,
    clues: [
      '"How do you store user passwords?" → one-way, salted, slow hash (argon2id / bcrypt) — never encrypt, never plain SHA',
      '"The database was leaked — what is the damage?" → salt + slow hash limits it; pepper helps further',
      '"Two users have the same password, do their hashes match?" → no, because every user gets a unique random salt',
      '"Why not just SHA-256?" → it is designed to be fast; attackers love fast',
      '"bcrypt truncates at 72 bytes" / "password longer than 72 chars" → pre-hash or use argon2id',
      '"Compare hashes safely" → constant-time compare (MessageDigest.isEqual / hmac.compare_digest / crypto.timingSafeEqual)',
      '"We need to move from MD5 to something safe without forcing a reset" → wrap old hash inside the new one, or rehash on next login'
    ],
    code: [
      `import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;

// Plain-JDK salted + slow password hashing with PBKDF2 (no libraries needed).
// In a real Spring app prefer Argon2PasswordEncoder or BCryptPasswordEncoder (shown next).
public class PasswordHasher {
    // OWASP guidance for PBKDF2-HMAC-SHA256 is 600,000+ iterations. Tune so one hash is ~100-500 ms.
    private static final int ITERATIONS = 600_000;
    private static final int SALT_BYTES = 16;     // 128-bit random salt
    private static final int KEY_BITS = 256;      // output length
    private static final SecureRandom RNG = new SecureRandom();

    private static byte[] pbkdf2(char[] password, byte[] salt, int iterations) throws Exception {
        PBEKeySpec spec = new PBEKeySpec(password, salt, iterations, KEY_BITS);
        try {
            return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded();
        } finally {
            spec.clearPassword();                 // wipe the char[] copy inside the spec
        }
    }

    /** Returns one self-describing string: algorithm$iterations$salt$hash */
    public static String hash(char[] password) throws Exception {
        byte[] salt = new byte[SALT_BYTES];
        RNG.nextBytes(salt);                      // a NEW random salt for every password
        byte[] dk = pbkdf2(password, salt, ITERATIONS);
        Base64.Encoder enc = Base64.getEncoder().withoutPadding();
        return "pbkdf2-sha256$" + ITERATIONS + "$" + enc.encodeToString(salt) + "$" + enc.encodeToString(dk);
    }

    /** Re-hash the typed password with the stored salt + cost and compare in CONSTANT time. */
    public static boolean verify(char[] password, String stored) throws Exception {
        String[] p = stored.split("[$]");        // [algo, iterations, salt, hash]
        if (p.length != 4 || !p[0].equals("pbkdf2-sha256")) return false;
        int iterations = Integer.parseInt(p[1]);
        byte[] salt = Base64.getDecoder().decode(p[2]);
        byte[] expected = Base64.getDecoder().decode(p[3]);
        byte[] actual = pbkdf2(password, salt, iterations);
        return MessageDigest.isEqual(expected, actual);   // never use Arrays.equals / String.equals here
    }

    public static void main(String[] args) throws Exception {
        String stored = hash("correct horse battery staple".toCharArray());
        System.out.println("stored  = " + stored.substring(0, 40) + "...");
        System.out.println("right pw -> " + verify("correct horse battery staple".toCharArray(), stored));
        System.out.println("wrong pw -> " + verify("Correct horse battery staple".toCharArray(), stored));
    }
}`,
      {
        lang: 'python', run: true, title: 'Salted PBKDF2 demo (standard library only)', code: `import hashlib, hmac, os

# Demo cost kept low so it runs fast in the browser. In production use 600_000+ for PBKDF2-SHA256
# (or better: argon2id / bcrypt through a maintained library).
ITERATIONS = 20_000

def hash_password(password: str) -> str:
    salt = os.urandom(16)                                   # unique random salt per user
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, ITERATIONS)
    return "$".join(["pbkdf2-sha256", str(ITERATIONS), salt.hex(), dk.hex()])

def verify_password(password: str, stored: str) -> bool:
    algo, iters, salt_hex, hash_hex = stored.split("$")
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt_hex), int(iters))
    return hmac.compare_digest(dk.hex(), hash_hex)           # constant-time compare

alice = hash_password("hunter2-demo")
bob = hash_password("hunter2-demo")                          # SAME password as alice

print("alice stored:", alice[:44] + "...")
print("bob   stored:", bob[:44] + "...")
print("same password, different stored strings?", alice != bob)
print("alice logs in with right password:", verify_password("hunter2-demo", alice))
print("alice logs in with wrong password:", verify_password("hunter3-demo", alice))
`
      },
      {
        lang: 'java', check: false, title: 'Spring Security: argon2id / bcrypt with upgrade-friendly delegating encoder', code: `import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class PasswordConfig {

    // Option 1: the "delegating" encoder stores {id}hash, e.g. {bcrypt}$2a$10$...
    // so you can change the default algorithm later and still verify old hashes.
    @Bean
    PasswordEncoder passwordEncoder() {
        return PasswordEncoderFactories.createDelegatingPasswordEncoder();
    }

    // Option 2: argon2id directly (needs the bcprov dependency). Defaults follow Spring's recommended params.
    // @Bean PasswordEncoder argon() { return Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8(); }
}

// In a service:
//   String stored = encoder.encode(rawPassword);                 // salt is generated for you
//   boolean ok = encoder.matches(rawPassword, stored);           // constant-time compare inside
//   if (ok && encoder.upgradeEncoding(stored)) { save(encoder.encode(rawPassword)); }  // rehash on login`
      },
      {
        lang: 'js', check: false, title: 'Node.js: argon2 and bcrypt (npm packages)', code: `// npm i argon2 bcrypt
const argon2 = require('argon2');
const bcrypt = require('bcrypt');

async function demo(password) {
  // argon2id: memory-hard, the modern default. The library creates the salt and encodes all params in the string.
  const a = await argon2.hash(password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
  console.log(await argon2.verify(a, password));        // true

  // bcrypt: cost 12 means 2^12 rounds. NOTE: bcrypt only looks at the first 72 BYTES of the password.
  const b = await bcrypt.hash(password, 12);
  console.log(await bcrypt.compare(password, b));       // true
}
demo(process.env.DEMO_PASSWORD || 'demo-only-password');`
      }
    ],
    codeTitle: ['Java (plain JDK): PBKDF2 hash + verify', 'Python (runnable): salt makes equal passwords look different', 'Spring Security encoders', 'Node.js argon2 / bcrypt'],
    viz: {
      title: 'Salted, slow hashing pipeline (toy hash for teaching)',
      input: 'hunter2',
      inputLabel: 'A password that two users happen to share',
      gen: function (input) {
        var pw = String(input || '').trim();
        if (!pw) throw new Error('Type any short password, e.g. hunter2');
        if (pw.length > 24) throw new Error('Use at most 24 characters');
        var saltA = 'k9Qz', saltB = 'p2Lm';
        var plain = toyHash(pw), hA = toyHash(saltA + pw), hB = toyHash(saltB + pw);
        var frames = [];
        frames.push({ narr: 'Alice and Bob both chose the password <b>' + H.esc(pw) + '</b>. If we stored it as plain text, one leaked database exposes it instantly. <span class="c-r">Never do this.</span>', parts: [
          { type: 'table', label: 'users table (WRONG: plain text)', columns: ['user', 'password column'], rows: [['alice', H.esc(pw)], ['bob', H.esc(pw)]], hl: { 0: 'bad', 1: 'bad' } }
        ] });
        frames.push({ narr: 'A fast hash with <b>no salt</b> hides the text, but both rows get the <b>same</b> value. A thief sees "these two share a password" and can look the digest up in a pre-built rainbow table.', parts: [
          { type: 'queue', label: 'pipeline', items: ['password', 'fast hash'], frontLabel: 'input', backLabel: 'stored' },
          { type: 'table', label: 'users table (fast hash, no salt)', columns: ['user', 'digest'], rows: [['alice', plain], ['bob', plain]], hl: { 0: 'bad', 1: 'bad' } }
        ] });
        frames.push({ narr: 'Fix #1: give every user a random <b>salt</b> and hash <code>salt + password</code>. The salt is stored in the open next to the hash; it is not a secret.', parts: [
          { type: 'queue', label: 'pipeline', items: ['password', '+ random salt', 'fast hash'], frontLabel: 'input', backLabel: 'stored', hl: { 1: 'ok' } },
          { type: 'map', label: 'salts (random per user)', entries: [['alice', saltA], ['bob', saltB]], hl: { alice: 'ok', bob: 'ok' } }
        ] });
        frames.push({ narr: 'Same password, different salts, so <b>different digests</b>. Rainbow tables are useless, and an attacker has to attack each user one by one.', parts: [
          { type: 'table', label: 'users table (salted)', columns: ['user', 'salt', 'digest'], rows: [['alice', saltA, hA], ['bob', saltB, hB]], hl: { 0: 'ok', 1: 'ok' } }
        ] });
        frames.push({ narr: 'Fix #2: make every guess <b>expensive</b>. A password hash function repeats its work thousands of times (and argon2 also eats memory). Here is how many guesses per second one GPU can try (rough orders of magnitude).', parts: [
          { type: 'bars', label: 'attacker guesses per second (log-ish scale, illustrative)', values: [100, 40, 3, 1], idxLabels: ['MD5', 'SHA-256', 'PBKDF2', 'argon2id'], texts: ['~100 billion', '~20 billion', '~15 thousand (600k rounds)', '~thousands or fewer'], hl: { 0: 'bad', 1: 'bad', 2: 'cur', 3: 'ok' } },
          { type: 'text', html: 'The honest user only hashes <b>once per login</b> (about 0.2 s). The attacker needs <b>billions</b> of tries, so the slowdown hits them 10<sup>9</sup> times harder.' }
        ] });
        frames.push({ narr: 'What actually lands in the database is a single self-describing string: algorithm, cost settings, salt and hash together.', parts: [
          { type: 'map', label: 'stored string, split into parts', entries: [['algorithm', 'argon2id'], ['cost', 'm=19456,t=2,p=1'], ['salt', saltA], ['hash', hA]], hl: { cost: 'sel', salt: 'ok', hash: 'ok' } },
          { type: 'text', html: '<code>$argon2id$v=19$m=19456,t=2,p=1$' + saltA + '$' + hA + '</code>' }
        ] });
        frames.push({ narr: 'Login: read the row, take its salt and cost, hash what the user typed, then compare in <b>constant time</b>. Right password: same digest.', parts: [
          { type: 'queue', label: 'login pipeline', items: ['typed password', 'stored salt', 'same slow hash', 'compare'], frontLabel: 'in', backLabel: 'out', hl: { 3: 'ok' } },
          { type: 'vars', vals: { typed: pw, 'salt (from DB)': saltA, computed: hA, 'stored hash': hA, match: 'true' }, hl: { match: 'ok' } }
        ] });
        var wrong = pw + '!';
        frames.push({ narr: 'Wrong password (<b>' + H.esc(wrong) + '</b>): even one extra character gives a completely different digest, so the login is rejected. We never needed to know the original password.', parts: [
          { type: 'vars', vals: { typed: wrong, computed: toyHash(saltA + wrong), 'stored hash': hA, match: 'false' }, hl: { computed: 'bad', match: 'bad' } }
        ] });
        return frames;
      }
    },
    examples: [
      {
        title: 'Why SHA-256 alone fails: a 10-million-word attack', html: `<p>You store <code>SHA-256(password)</code>. A thief steals the table and downloads a list of the 10 million most common passwords.</p>
        ${H.table(['Step', 'Cost'], [['hash 10M candidate words once', '~1 second on one GPU'], ['look every stolen digest up in that table', 'instant'], ['users cracked', '<span class="c-r">anyone with a common password</span>']])}
        <p>With <b>argon2id</b> and a per-user salt, the thief must run the slow function 10M times <i>per user</i>. At 0.2 s per try that is 23 days <b>for a single account</b>, and good passwords never fall at all.</p>`
      },
      {
        title: 'Rehash on login: upgrading old MD5 hashes quietly', html: `<p>Your legacy table has <code>md5(password)</code>. You cannot rehash without the plain passwords, so:</p>
        <ol><li><b>Now:</b> wrap them. Store <code>argon2id(md5_hex)</code> for every row and mark it <code>algo=md5+argon2</code>. The leaked-MD5 risk is gone immediately.</li>
        <li><b>At each login:</b> compute <code>md5(password)</code>, run it through argon2id to verify, then store <code>argon2id(password)</code> and flip the flag to <code>argon2</code>.</li>
        <li>After a few months, force-reset the dormant accounts.</li></ol>`,
        code: { lang: 'java', check: false, code: `boolean ok = encoder.matches(raw, row.hash);\nif (ok && encoder.upgradeEncoding(row.hash)) {   // stored cost is older than today's policy\n    row.hash = encoder.encode(raw);                // new salt, new cost\n    users.save(row);\n}` }
      },
      {
        title: 'The 72-byte bcrypt trap', html: `<p>bcrypt only uses the first <b>72 bytes</b> of the input. Two long passphrases sharing the same first 72 bytes verify as equal. Also, a NUL byte in some old libraries ends the string early.</p>
        ${H.table(['Password', 'bcrypt sees'], [['"' + 'a'.repeat(30) + 'X"', 'all 31 bytes — fine'], ['(80-char passphrase)', 'only the first 72 bytes — the last 8 chars are ignored']])}
        <p>Fixes: choose argon2id, or pre-hash with <code>base64(SHA-256(password))</code> (44 chars) before bcrypt, never with raw binary output.</p>`
      },
      {
        title: 'Pepper with HMAC: a second line of defence', html: `<p>Stored value: <code>argon2id( HMAC-SHA256(pepper, password) )</code>. The pepper (32 random bytes) lives in a secrets manager or HSM, <b>not</b> in the database. A SQL-injection dump alone is now useless for offline cracking.</p>
        <p>Cost of this: rotating the pepper needs a versioned prefix (<code>v2$...</code>) and re-hash on login, so keep the pepper id in the stored string.</p>`,
        code: { lang: 'python', run: true, code: `import hmac, hashlib, os\n\n# placeholder only; real pepper comes from a secrets manager, never from source code\npepper = os.environ.get("PASSWORD_PEPPER", "dev-only-placeholder").encode()\n\ndef peppered(password: str) -> bytes:\n    return hmac.new(pepper, password.encode(), hashlib.sha256).digest()\n\nprint(peppered("demo-pw").hex()[:16], "...")  # feed THIS into argon2/bcrypt, not the raw password\n` }
      }
    ],
    deepDive: `<p>🟣 <b>Why memory-hardness matters.</b> A GPU has thousands of tiny cores but little memory per core. PBKDF2 and bcrypt need almost no memory, so attackers run thousands of guesses in parallel. argon2id and scrypt force each guess to fill, say, 19 MiB of RAM with data that depends on earlier data, so the cost of parallel hardware rises sharply. argon2 won the Password Hashing Competition (2015); the <b>id</b> variant mixes data-independent passes (resists side-channels) with data-dependent ones (resists GPU trade-offs).</p>
      <p><b>Choosing cost.</b> Benchmark on the real production CPU: pick the highest cost where a single hash stays around 100–500 ms <i>under load</i>. Remember login endpoints become a CPU-based denial-of-service target: rate-limit per account and per IP, and consider a bounded worker pool so 1,000 simultaneous logins cannot starve the rest of the app. Current OWASP minimums (check the cheat sheet for the latest): argon2id with m=19 MiB, t=2, p=1 (or stronger sets such as m=46 MiB, t=1); scrypt N=2<sup>17</sup>, r=8, p=1; bcrypt cost ≥ 10 (many teams use 12); PBKDF2-HMAC-SHA256 ≥ 600,000 iterations.</p>
      <p><b>Salt vs pepper vs key.</b> Salt: unique, public, defeats precomputation. Pepper: global, secret, defeats offline cracking when only the DB leaks. Neither replaces a slow hash. <b>Encryption is not hashing:</b> if a reversible scheme is used, anyone who steals the key gets every password.</p>
      <p><b>Other realities.</b> (1) Timing: return the same error and the same latency for "unknown user" and "wrong password" (do a dummy hash for unknown users) to stop user enumeration. (2) Check new passwords against breached lists (k-anonymity API of Have I Been Pwned) rather than forcing weird complexity rules; NIST 800-63B recommends length over composition and no forced periodic rotation. (3) Never log passwords, including in request-body logging middleware. (4) Prefer passkeys (WebAuthn) where you can: nothing secret is ever sent to your server.</p>`,
    aiEra: `<p><b>What AI changes:</b> GPUs plus LLM-generated "smart" guess lists (patterns like <code>Summer2025!</code>, names plus years, leaked-password style models) make weak human passwords fall faster. Deepfake and phishing kits also push everyone toward <b>passkeys</b> and MFA, so the best answer to "how do we store passwords" in 2026 is often "we avoid having them".</p>
      <p><b>Use AI as a partner:</b> <code>Review this login handler for timing leaks and user-enumeration risks, list each issue</code>, or <code>Generate a migration plan from unsalted SHA-1 to argon2id with rehash-on-login</code>.</p>
      <p><b>Where AI goes wrong:</b> assistants still sometimes suggest <code>MessageDigest.getInstance("SHA-256")</code> for passwords, hard-code a "secret" pepper in source, use <code>Math.random()</code> for salts, or copy old StackOverflow cost values (bcrypt cost 4, PBKDF2 1,000 iterations). Never paste real passwords, hashes or peppers into a chat tool.</p>
      <p><b>What you must still own:</b> choosing the algorithm and cost, the migration plan, constant-time compare, rate limiting, and the incident plan if hashes leak (force reset, invalidate sessions).</p>`,
    problems: [
      {
        title: 'Design the Password Storage for a New Signup Form', level: 'Easy', tags: ['password hashing', 'salt', 'argon2'], companies: ['Amazon', 'Stripe'],
        statement: `<p>You are building signup and login for a new app. Explain exactly what you store in the <code>users</code> table, which algorithm you pick, how login verification works, and what happens when the DB leaks.</p>`,
        constraints: `Normal web app, 50k users, login p95 budget 500 ms, must be easy to upgrade the algorithm later.`,
        example: `<p>Input: password <b>correct horse</b> for user <b>alice</b>.</p><p>Output: column <code>password_hash = $argon2id$v=19$m=19456,t=2,p=1$&lt;salt&gt;$&lt;hash&gt;</code>. ${H.c('g', 'No plain text, no reversible encryption')}, salt unique per row, cost parameters inside the string so we can upgrade.</p>`,
        brute: { why: `<p>Store <code>SHA-256(password)</code> (or worse, plain text). It is fast, so a leaked DB can be attacked at billions of guesses per second, and with no salt identical passwords produce identical hashes and rainbow tables work.</p>` },
        mcq: { q: 'Which stored value is best?', options: ['AES-encrypted password with the key in config', 'SHA-256(password)', 'argon2id with a per-user random salt, params inside the string', 'MD5(password + username)'], answer: 2, explain: 'Slow, memory-hard, salted, self-describing. Encryption is reversible; SHA-256 and MD5 are too fast.' },
        hints: [`<p>Aha: you never need the original password back, you only need to check "is this the same one?" so use a one-way function.</p>`, `<p>Pick a password hashing function (argon2id / bcrypt) so each guess is slow, and let the library generate the salt for you.</p>`, `<p>Recipe: signup = hash with library; login = load row, <code>matches(raw, stored)</code> in constant time, same error message for unknown user and wrong password, rate limit, rehash on login if cost is outdated.</p>`],
        solution: {
          approach: `<p><b>Table:</b> <code>users(id, email unique, password_hash text, created_at)</code>. The hash string is the only password-related column; the salt and cost parameters are embedded in it.</p>
          <p><b>Signup:</b> validate length (at least 12, allow up to 64+ chars), check against a breached-password list, call <code>encoder.encode(raw)</code> (argon2id, m=19 MiB, t=2, p=1 or bcrypt cost 12), store the result.</p>
          <p><b>Login:</b> look up by email; if no user, still run a dummy hash so timing matches; call <code>encoder.matches(raw, stored)</code> (constant-time inside); on failure return one generic message "invalid email or password" and count the attempt for rate limiting; on success, if <code>upgradeEncoding(stored)</code> is true, re-hash and save, then issue a session.</p>
          <p><b>Leak story:</b> attacker gets hashes only; every guess costs ~200 ms of CPU and memory, salts block precomputation, an optional pepper in a secrets manager blocks cracking entirely if only the DB leaked. Still force reset and invalidate sessions after any leak.</p>`,
          complexity: `<p>One slow hash per login/signup (about 100–500 ms CPU by design). Storage: one string of about 100 bytes per user.</p>`,
          followUps: ['How would you migrate users currently stored with unsalted SHA-1?', 'How do you stop login from becoming a CPU DoS vector?']
        }
      }
    ]
  });

  /* =====================================================================
     TOPIC 2 — Sessions vs tokens
     ===================================================================== */
  topics.push({
    title: 'Sessions vs JWT: Where Does "Who Are You?" Live?',
    analogy: `<p>A <b>session</b> is like a <b>coat-check ticket</b>. You hand over your coat once (log in); the cloakroom keeps it and gives you a numbered ticket. The ticket itself means nothing, the cloakroom (server memory or Redis) knows who you are. Lose the ticket? The cloakroom can instantly cancel it.</p>
      <p>A <b>JWT</b> is like a <b>festival wristband printed with your name, ticket type and an expiry date, plus a tamper-proof hologram</b>. Any gate guard can read it and check the hologram without phoning headquarters. The price: if you lose the wristband, headquarters cannot cancel it. It stays valid until it expires.</p>`,
    explain: `<p>🟢 HTTP forgets you after every request (it is <i>stateless</i>). After login, the server must recognise you on request number 2, 3, 4... Two classic ways:</p>
      <p><b>1. Server-side session (stateful).</b> On login the server creates a random, unguessable <b>session id</b> (like <code>9f3c...</code>), stores <code>sid → {userId, roles, createdAt}</code> in memory or Redis, and sends the id to the browser in a <b>cookie</b>. Every later request carries the cookie; the server looks the id up.</p>
      <p><b>2. Token (stateless), usually a JWT.</b> On login the server creates a signed token containing the claims (<code>sub</code>, <code>exp</code>, <code>roles</code>...). The client sends it in <code>Authorization: Bearer ...</code>. The server only checks the signature and expiry, with no lookup.</p>
      ${H.table(['Question', 'Session cookie', 'JWT bearer token'], [
        ['Where is the truth?', 'server store (DB / Redis)', 'inside the token itself'],
        ['Per-request cost', 'one store lookup', 'one signature check (CPU only)'],
        ['Instant logout / ban', '<span class="c-g">easy</span>: delete the row', '<span class="c-r">hard</span>: needs deny-list or short life'],
        ['Scaling across servers', 'shared store or sticky sessions', '<span class="c-g">any server can verify</span>'],
        ['Size on the wire', 'tiny (32-64 chars)', 'larger (300 bytes to several KB)'],
        ['Natural client', 'browser (cookie handled for you)', 'mobile apps, service-to-service, SPAs calling many APIs'],
        ['Main attack', 'CSRF, session fixation', 'XSS stealing the token, weak keys, "alg" tricks']
      ])}
      <p><b>Cookie flags you must set for a session cookie:</b></p>
      ${H.table(['Flag', 'What it does'], [
        ['<code>HttpOnly</code>', 'JavaScript cannot read the cookie, so XSS cannot steal it'],
        ['<code>Secure</code>', 'only sent over HTTPS'],
        ['<code>SameSite=Lax</code> (or Strict)', 'browser does not attach it on most cross-site requests: strong CSRF protection'],
        ['<code>__Host-</code> name prefix', 'forces Secure, Path=/ and no Domain: cannot be overwritten by sibling subdomains'],
        ['<code>Max-Age</code> / idle timeout', 'limits how long a stolen cookie works']
      ])}
      <p><b>Rule of thumb:</b> for a classic website or an admin portal, use a <b>server session cookie</b>. Use JWTs when many independent services must verify identity without a shared store (and keep them short-lived). Many production systems do both: a session at the edge, short JWTs between internal services.</p>`,
    clues: [
      '"Users must be logged out immediately when an admin bans them" → server-side session (or JWT + deny-list)',
      '"Scale to many stateless instances behind a load balancer" → shared session store (Redis) or self-contained tokens',
      '"Mobile app + many microservices need to verify the caller" → JWT / OAuth access token',
      '"Cookie vs localStorage for tokens" → HttpOnly Secure SameSite cookie, because localStorage is readable by any XSS',
      '"Session fixation" → issue a NEW session id at login',
      '"CSRF" → cookie auth needs SameSite and/or an anti-CSRF token; bearer headers are not auto-sent so not CSRF-prone',
      '"sticky sessions" in the question → the app keeps state in RAM; discuss moving state out to Redis'
    ],
    code: [
      {
        lang: 'js', run: true, title: 'A tiny session store: create, lookup, idle + absolute timeout, logout', code: `// In-memory teaching version. Production: Redis with TTL (see Spring Session / connect-redis).
const store = new Map();
const IDLE_MS = 15 * 60 * 1000;          // log out after 15 minutes of silence
const ABSOLUTE_MS = 8 * 60 * 60 * 1000;  // ...and never allow a session older than 8 hours

function newSessionId() {
  // 128 bits from a cryptographically secure source: unguessable. Never use Math.random for this.
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

function login(userId, now) {
  const sid = newSessionId();                       // fresh id at login prevents session FIXATION
  store.set(sid, { userId, createdAt: now, lastSeen: now });
  return sid;                                        // goes into Set-Cookie: sid=...; HttpOnly; Secure; SameSite=Lax
}

function authenticate(sid, now) {
  const s = store.get(sid);
  if (!s) return null;                                          // unknown / logged out
  if (now - s.lastSeen > IDLE_MS || now - s.createdAt > ABSOLUTE_MS) {
    store.delete(sid);                                          // expired: clean up
    return null;
  }
  s.lastSeen = now;                                             // sliding idle window
  return s.userId;
}

function logout(sid) { store.delete(sid); }          // instant, server-side revocation

const t0 = Date.parse('2026-01-01T09:00:00Z');
const sid = login('user-42', t0);
console.log('request after 5 min  ->', authenticate(sid, t0 + 5 * 60000));
console.log('request after 30 min idle ->', authenticate(sid, t0 + 30 * 60000));
const sid2 = login('user-42', t0);
logout(sid2);
console.log('request after logout ->', authenticate(sid2, t0 + 1000));`
      },
      {
        lang: 'java', check: false, title: 'Spring Boot: session cookie hardening + Redis-backed sessions', code: `# application.yml  (needs spring-session-data-redis for the Redis store)
spring:
  session:
    # no store-type needed: Boot picks Redis from the classpath
    timeout: 15m               # idle timeout
server:
  servlet:
    session:
      cookie:
        name: __Host-SID
        http-only: true        # JS cannot read it
        secure: true           # HTTPS only
        same-site: lax         # blocks most cross-site sends (CSRF)
        path: /

// SecurityConfig.java
@Bean
SecurityFilterChain chain(HttpSecurity http) throws Exception {
    http
      .sessionManagement(s -> s
          .sessionFixation(f -> f.migrateSession())          // new id on login, copy attributes
          .maximumSessions(3))                                // optional: cap concurrent logins
      .logout(l -> l.logoutUrl("/logout").invalidateHttpSession(true).deleteCookies("__Host-SID"))
      .csrf(Customizer.withDefaults());                       // keep CSRF protection ON for cookie auth
    return http.build();
}`
      },
      {
        lang: 'js', check: false, title: 'Express: session cookie with express-session + Redis', code: `const session = require('express-session');
const RedisStore = require('connect-redis').default;

app.use(session({
  store: new RedisStore({ client: redisClient, ttl: 900 }),
  name: '__Host-sid',
  secret: process.env.SESSION_SECRET,        // used to sign the cookie, from env or secrets manager
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 15 * 60 * 1000 }
}));

app.post('/login', async (req, res) => {
  const user = await verifyCredentials(req.body.email, req.body.password);
  if (!user) return res.status(401).json({ error: 'invalid email or password' });
  req.session.regenerate(err => {            // fixation defence: brand-new session id
    req.session.userId = user.id;
    res.json({ ok: true });
  });
});`
      }
    ],
    codeTitle: ['Session store from scratch (runnable)', 'Spring Boot session config', 'Express session config'],
    viz: {
      title: 'Request flow: session cookie vs JWT',
      input: 'session',
      inputLabel: 'Type session or jwt',
      gen: function (input) {
        var mode = String(input || 'session').trim().toLowerCase();
        if (mode !== 'session' && mode !== 'jwt') throw new Error('Type either: session   or   jwt');
        var frames = [];
        if (mode === 'session') {
          var nodes = [{ id: 'B', label: 'Browser', x: 12, y: 25, shape: 'box' }, { id: 'A', label: 'API server', x: 50, y: 25, shape: 'box' }, { id: 'S', label: 'Session store (Redis)', x: 86, y: 25, shape: 'box', w: 22 }];
          var edges = [['B', 'A', 'login'], ['A', 'S', 'save'], ['A', 'B', 'cookie'], ['B', 'A', 'cookie sent'], ['A', 'S', 'lookup']];
          var mk = function (ehl, hl, tags) { return { type: 'graph', directed: true, height: 50, nodes: nodes, edges: edges, ehl: ehl, hl: hl || {}, tags: tags || {} }; };
          frames.push({ narr: '<b>Step 1.</b> The browser sends the email and password to <code>POST /login</code>. Over HTTPS, of course.', parts: [mk({ 'B-A': 'cur' }, { B: 'cur' })] });
          frames.push({ narr: '<b>Step 2.</b> The server checks the password hash, then creates a random session id and <b>saves</b> <code>sid → {userId, roles}</code> in the store.', parts: [mk({ 'A-S': 'ok' }, { A: 'cur' }, { S: 'sid=9f3c → user 42' })] });
          frames.push({ narr: '<b>Step 3.</b> The server answers with <code>Set-Cookie: sid=9f3c; HttpOnly; Secure; SameSite=Lax</code>. The browser keeps it and attaches it automatically from now on.', parts: [mk({ 'A-B': 'ok' }, { B: 'ok' }, { B: 'cookie stored' })] });
          frames.push({ narr: '<b>Step 4.</b> Later: <code>GET /orders</code>. The browser sends the cookie on its own, and the page does not need any code for that.', parts: [mk({ 'B-A': 'cur' }, { B: 'cur' }, { B: 'Cookie: sid=9f3c' })] });
          frames.push({ narr: '<b>Step 5.</b> The server <b>looks the id up</b> in the store. Found: user 42. This lookup is the price of sessions, but it also lets you delete the row to log someone out <i>instantly</i>.', parts: [mk({ 'A-S': 'sel' }, { S: 'sel' }, { S: 'found: user 42' })] });
          frames.push({ narr: '<b>Logout / ban:</b> delete <code>sid=9f3c</code> from the store. The very next request with that cookie finds nothing and is rejected. That is the big win over JWT.', parts: [mk({ 'A-S': 'bad' }, { S: 'bad' }, { S: 'row deleted' })] });
        } else {
          var nodes2 = [{ id: 'B', label: 'Client (SPA/app)', x: 14, y: 25, shape: 'box', w: 22 }, { id: 'A', label: 'API server', x: 52, y: 25, shape: 'box' }, { id: 'K', label: 'Signing key (env/JWKS)', x: 88, y: 25, shape: 'box', w: 24 }];
          var edges2 = [['B', 'A', 'login'], ['A', 'B', 'JWT'], ['B', 'A', 'Bearer JWT'], ['K', 'A', 'verify with key']];
          var mk2 = function (ehl, hl, tags) { return { type: 'graph', directed: true, height: 50, nodes: nodes2, edges: edges2, ehl: ehl, hl: hl || {}, tags: tags || {} }; };
          frames.push({ narr: '<b>Step 1.</b> The client sends credentials to <code>POST /login</code>.', parts: [mk2({ 'B-A': 'cur' }, { B: 'cur' })] });
          frames.push({ narr: '<b>Step 2.</b> The server checks the password, then <b>signs</b> a token: <code>{sub: 42, role: user, exp: in 15 min}</code> with its secret/private key. Nothing is stored server-side.', parts: [mk2({ 'K-A': 'ok' }, { A: 'cur' }, { A: 'sign claims' })] });
          frames.push({ narr: '<b>Step 3.</b> The token goes back to the client, which keeps it (memory, or an HttpOnly cookie). Prefer not to use localStorage: any XSS bug can read it.', parts: [mk2({ 'A-B': 'ok' }, { B: 'ok' }, { B: 'holds JWT' })] });
          frames.push({ narr: '<b>Step 4.</b> Each later request carries <code>Authorization: Bearer eyJ...</code>.', parts: [mk2({ 'B-A': 'cur' }, { B: 'cur' }, { B: 'Bearer eyJ...' })] });
          frames.push({ narr: '<b>Step 5.</b> The server <b>recomputes the signature</b> and checks <code>exp</code>. No database call! Any of 50 servers (or another microservice that has the public key) can do the same.', parts: [mk2({ 'K-A': 'sel' }, { A: 'sel', K: 'sel' }, { A: 'signature OK, exp OK' })] });
          frames.push({ narr: '<b>The catch:</b> nothing in this flow lets you cancel the token. If it is stolen or the user is banned, it keeps working until <code>exp</code>. So keep access tokens short (5-15 min) and use refresh tokens (next topics) for longevity.', parts: [mk2({ 'B-A': 'bad' }, { A: 'bad' }, { A: 'cannot revoke early' })] });
        }
        return frames;
      }
    },
    examples: [
      {
        title: 'Session fixation attack (and the one-line fix)', html: `<p>Attack: the attacker visits the site, gets a session id <code>abc</code>, and tricks the victim into using it (a link with <code>?sid=abc</code> or a cookie planted from a sibling subdomain). The victim logs in; if the server keeps the same id, <code>abc</code> now belongs to a logged-in user, and the attacker already has it.</p>
        <p>Fix: <b>generate a brand-new session id at the moment of login</b> (and on privilege changes). Frameworks do it for you if you do not turn it off (<code>sessionFixation().migrateSession()</code> in Spring, <code>req.session.regenerate()</code> in Express).</p>`
      },
      {
        title: 'CSRF: why cookies need extra care but Bearer headers do not', html: `<p>A browser attaches cookies <b>automatically</b>, even when the request was triggered by <code>evil.com</code>. A hidden form on evil.com posting to <code>bank.com/transfer</code> would carry your cookie.</p>
        ${H.table(['Defence', 'How'], [['SameSite=Lax/Strict', 'browser refuses to send the cookie on cross-site POSTs'], ['CSRF token', 'server gives a random token that only your own page can read and send in a header'], ['Origin / Referer check', 'reject state-changing requests from other origins']])}
        <p>A <code>Bearer</code> header is added by <i>your JavaScript</i>, so a foreign page cannot make the browser add it. No CSRF, but now XSS can steal the token if you store it in localStorage.</p>`
      },
      {
        title: 'Sticky sessions vs shared store', html: `<p>If sessions live in each server's RAM, the load balancer must always send a user to the same server ("sticky"). That breaks when a server restarts or autoscaling removes it, and everyone on it is logged out.</p>
        <p>Move sessions to <b>Redis</b> (key = session id, TTL = idle timeout, value = small JSON). Any server can then handle any request. Redis outage handling: fail closed (treat as logged out) and alert.</p>`
      }
    ],
    deepDive: `<p>🟣 <b>Session id quality.</b> Use at least 128 bits from a CSPRNG (<code>SecureRandom</code>, <code>crypto.randomBytes</code>). Never derive ids from user id, time or counters. Store only a <b>hash</b> of the session id in the database if you want protection against a read-only DB leak (same idea as API keys).</p>
      <p><b>Timeouts.</b> Use both an <i>idle</i> timeout (sliding) and an <i>absolute</i> lifetime. Re-authenticate before sensitive actions (change email, payment) even in a live session ("step-up"). Cap concurrent sessions and show users their active devices with a "log out everywhere" button, which is trivial with sessions (delete all rows for that user).</p>
      <p><b>Cookie scope pitfalls.</b> A cookie set with <code>Domain=example.com</code> is sent to every subdomain, including forgotten ones. <code>__Host-</code> avoids that. <code>SameSite=None</code> is needed only for true cross-site embedding and requires Secure. Third-party cookie restrictions in modern browsers mean cross-site SSO should use redirects, not hidden iframes.</p>
      <p><b>Hybrid designs (what big companies actually do).</b> Browser-facing: opaque session cookie at the gateway (BFF, "backend for frontend"). The BFF holds the OAuth access/refresh tokens server-side and the browser never sees them. Between internal services: short-lived signed JWTs, or mTLS identities. This keeps XSS from leaking tokens and still gives stateless verification internally.</p>
      <p><b>Performance reality.</b> A Redis lookup is about 0.2 ms inside a data centre; signature verification is similar (HS256 microseconds, RS256 verify ~50-100 µs, ES256 slower). The "sessions do not scale" argument is mostly outdated; the real driver is revocation needs and service topology, not speed.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI agents and browser extensions increasingly act <i>on behalf of</i> users. That makes "which credential does the agent hold, and for how long?" a design question: prefer short-lived, narrowly scoped tokens (OAuth scopes, token exchange) over giving an agent a user's full session cookie.</p>
      <p><b>Use AI as a partner:</b> <code>Write a table comparing session cookie vs JWT for a banking admin portal and a mobile-first public API; list the revocation story for each</code>. Ask it to attack your design: <code>List ways an attacker could steal or replay this session design</code>.</p>
      <p><b>Where AI goes wrong:</b> generated tutorials love "store the JWT in localStorage", skip CSRF for cookie flows, set <code>maxAge</code> to years, forget <code>regenerate()</code> after login, or invent library options that do not exist. Verify cookie flags in the browser dev tools (Application tab) instead of trusting the code comment.</p>
      <p><b>What you must still own:</b> the revocation requirement ("how fast must a ban take effect?") and the threat model (XSS vs CSRF vs stolen device). The right answer depends on those, not on fashion.</p>`,
    problems: [
      {
        title: 'Choose: Sessions, JWT or Both?', level: 'Easy', tags: ['sessions', 'JWT', 'design choice'], companies: ['Google', 'Atlassian'],
        statement: `<p>Three products: (A) a server-rendered internal HR portal, (B) a public REST API used by 3rd-party mobile apps, (C) a SPA whose backend is 20 microservices. For each, choose session cookies, JWT, or a hybrid, and defend the choice in terms of revocation, scaling and attack surface.</p>`,
        constraints: `HR portal: 2k users, must kick out a fired employee within seconds. Public API: millions of calls/min. Microservices: services must not call a central auth DB on each request.`,
        example: `<p>A: ${H.c('g', 'server session (Redis), HttpOnly cookie')}. B: ${H.c('b', 'OAuth2 access tokens (JWT) + refresh tokens')}. C: ${H.c('p', 'BFF with session cookie for the browser, short JWTs internally')}.</p>`,
        brute: { why: `<p>"Use JWT everywhere because it is stateless and modern." This ignores revocation (the fired employee still has 1 hour of access) and pushes tokens into localStorage where XSS can read them.</p>` },
        mcq: { q: 'The HR portal must lock out a fired employee within seconds. Best fit?', options: ['1-hour JWT in localStorage', 'Server-side session with Redis; delete the session on termination', 'JWT that never expires', 'Basic auth header'], answer: 1, explain: 'Deleting the server-side session takes effect on the very next request. A long JWT cannot be recalled.' },
        hints: [`<p>Ask first: how fast must access be revoked, and who are the clients (browsers or other programs)?</p>`, `<p>Browsers love cookies (automatic, HttpOnly); programmatic clients love bearer tokens; many internal verifiers prefer self-contained signed tokens.</p>`, `<p>Write a 3-row table: product, credential, revocation story, main risk and mitigation (CSRF flags for cookies, XSS and short TTL for tokens).</p>`],
        solution: {
          approach: `<p><b>A, HR portal:</b> server-side session in Redis; cookie <code>__Host-SID; HttpOnly; Secure; SameSite=Lax</code>; CSRF protection on; idle 15 min, absolute 8 h. Firing an employee = delete all of their sessions (index <code>user:{id}:sessions</code>). Revocation is immediate.</p>
          <p><b>B, public API:</b> OAuth2 bearer access tokens (JWT, 5-15 min) plus rotating refresh tokens. No cookie, so no CSRF. Verification needs no DB, which matters at millions of calls/min. Revocation: short TTL, plus a small deny-list keyed by <code>jti</code> for emergencies and token introspection for high-value scopes.</p>
          <p><b>C, SPA + microservices:</b> Backend-for-Frontend: the browser holds only an opaque session cookie; the BFF holds the OAuth tokens and exchanges them for short-lived internal JWTs (audience-restricted) when calling services. Internal services verify signatures with a cached JWKS and never call an auth DB. XSS cannot exfiltrate long-lived tokens because the browser never has them.</p>
          <p>Principle: pick by revocation requirement, client type, and where tokens can be stolen, not by fashion.</p>`,
          complexity: `<p>Session: 1 store read per request (about 0.2 ms) plus memory per active session. JWT: 1 signature check per request, no shared state, but revocation costs extra design.</p>`,
          followUps: ['How would you let a user "log out of all devices" in each model?', 'What changes if the HR portal later needs a mobile app?']
        }
      }
    ]
  });

  /* =====================================================================
     TOPIC 3 — JWT anatomy, verification, logout
     ===================================================================== */
  topics.push({
    title: 'JWT Anatomy: Decode, Verify, and Log Out Safely',
    analogy: `<p>A JWT is a <b>sealed postcard</b>. Anyone who holds it can <i>read</i> the message (base64 is not secret!), but the wax seal on the corner (the signature) proves that only the post office with the stamp really wrote it. If someone changes even one word, the seal no longer matches and the guard throws the card away.</p>
      <p>Because the postcard can be copied, you keep the validity short ("expires in 15 minutes"), and you never write secrets on it.</p>`,
    explain: `<p>🟢 A <b>JSON Web Token (JWT, say "jot")</b> is three base64url strings joined by dots:</p>
      <pre><span class="c-r">eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9</span>.<span class="c-p">eyJzdWIiOiI0MiIsInJvbGUiOiJ1c2VyIiwiZXhwIjoxOTAwMDAwMDAwfQ</span>.<span class="c-b">FAKE-SIGNATURE-FOR-DEMO</span>
   header                                .payload (claims)                                          .signature</pre>
      ${H.table(['Part', 'What it holds', 'Example (decoded)'], [
        ['<span class="c-r">Header</span>', 'how it was signed', '<code>{"alg":"HS256","typ":"JWT"}</code>'],
        ['<span class="c-p">Payload</span>', 'the claims: facts about the user and the token', '<code>{"sub":"42","role":"user","exp":1900000000}</code>'],
        ['<span class="c-b">Signature</span>', 'proof nobody changed header or payload', 'HMAC-SHA256(secret, header + "." + payload)']
      ])}
      <p><b>The most important claims</b> (registered names from RFC 7519):</p>
      ${H.table(['Claim', 'Meaning', 'You must check it?'], [
        ['<code>iss</code>', 'issuer: who created the token', 'yes, must equal your trusted issuer'],
        ['<code>sub</code>', 'subject: the user id', 'use as the identity'],
        ['<code>aud</code>', 'audience: which API the token is for', 'yes, reject tokens meant for another API'],
        ['<code>exp</code>', 'expiry time (unix seconds)', 'yes, always'],
        ['<code>nbf</code> / <code>iat</code>', 'not-before / issued-at', 'allow small clock skew (30-60 s)'],
        ['<code>jti</code>', 'unique token id', 'needed for deny-lists and replay detection']
      ])}
      <p><b>Signing options:</b> <b>HS256</b> = one shared secret (issuer and verifier must both know it, fine for one app). <b>RS256 / ES256 / EdDSA</b> = private key signs, <b>public key verifies</b> (best when many services verify; publish keys at a <code>/.well-known/jwks.json</code> endpoint, with a <code>kid</code> header to pick the right key).</p>
      <p><b>Verification checklist (do all, in this order):</b></p>
      <ol>
        <li>Split into exactly 3 parts. Decode the header.</li>
        <li>Check <code>alg</code> is on <i>your own allow-list</i> (never trust the token to choose; reject <code>none</code>).</li>
        <li>Recompute/verify the signature with the right key, comparing in constant time.</li>
        <li>Only now read claims: <code>exp</code>, <code>nbf</code>, <code>iss</code>, <code>aud</code>.</li>
        <li>Check application rules (user not disabled, scopes allow this call).</li>
      </ol>
      <p><b>Designing logout with JWTs.</b> Since the token is self-contained, "logout" needs a plan. Options, from simple to strong:</p>
      ${H.table(['Strategy', 'How', 'Trade-off'], [
        ['Just delete it on the client', 'remove the token from memory/cookie', 'stolen copies stay valid until <code>exp</code>'],
        ['Short access token + revoke the refresh token', '5-15 min access, server-side refresh token you can delete', '<span class="c-g">best default</span>; worst-case exposure = remaining access TTL'],
        ['Deny-list (blocklist) of <code>jti</code>', 'on logout store jti in Redis until its natural <code>exp</code>', 'one cheap lookup per request; list stays small'],
        ['Per-user token version', 'put <code>ver:7</code> in the JWT; DB/Redis stores current version; bump to log out everywhere', 'one cheap lookup; instantly kills every token of that user'],
        ['Opaque tokens + introspection', 'token is random; API calls the auth server to ask "is it active?"', 'this is a session again; full control, extra hop']
      ])}`,
    clues: [
      '"How do you log out a user with JWT?" → short TTL + revoke refresh token; deny-list jti or token version for instant kill',
      '"Is JWT encrypted?" → no, signed. Base64 is readable by anyone; use JWE or keep secrets out of the payload',
      '"alg: none" / "algorithm confusion" → server-side algorithm allow-list, never accept what the header asks for',
      '"Many services must verify without calling the auth server" → asymmetric keys (RS256/ES256) + JWKS',
      '"The token was stolen from localStorage" → XSS risk; HttpOnly cookie or BFF; keep TTL short',
      '"Where do I put the user role?" → in a claim is convenient but stale for its whole life; re-check sensitive permissions server-side',
      '"HS256 vs RS256" → shared secret vs public/private key pair'
    ],
    code: [
      {
        lang: 'python', run: true, title: 'HS256 JWT sign + verify from scratch (standard library)', code: `import base64, hashlib, hmac, json, os, time

# Secret comes from the environment. The fallback is a DEMO placeholder only - never ship a default secret.
SECRET = os.environ.get("JWT_SECRET", "dev-only-placeholder").encode()
ISSUER, AUDIENCE = "https://auth.example.test", "orders-api"

def b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()

def b64url_decode(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))   # restore the stripped '=' padding

def sign(claims: dict, ttl: int = 900, now=None) -> str:
    now = int(time.time() if now is None else now)
    header = {"alg": "HS256", "typ": "JWT"}
    payload = dict(claims, iss=ISSUER, aud=AUDIENCE, iat=now, exp=now + ttl)
    h = b64url_encode(json.dumps(header, separators=(",", ":")).encode())
    p = b64url_encode(json.dumps(payload, separators=(",", ":")).encode())
    sig = hmac.new(SECRET, (h + "." + p).encode(), hashlib.sha256).digest()
    return h + "." + p + "." + b64url_encode(sig)

def verify(token: str, now=None) -> dict:
    parts = token.split(".")
    if len(parts) != 3:
        raise ValueError("malformed token")
    h, p, s = parts
    header = json.loads(b64url_decode(h))
    if header.get("alg") != "HS256":                      # allow-list: rejects "none" and algorithm switching
        raise ValueError("unexpected alg: " + str(header.get("alg")))
    expected = hmac.new(SECRET, (h + "." + p).encode(), hashlib.sha256).digest()
    if not hmac.compare_digest(expected, b64url_decode(s)):   # constant-time compare
        raise ValueError("bad signature")
    claims = json.loads(b64url_decode(p))                 # only trust claims AFTER the signature passed
    now = int(time.time() if now is None else now)
    if claims.get("exp", 0) <= now:
        raise ValueError("token expired")
    if claims.get("iss") != ISSUER or claims.get("aud") != AUDIENCE:
        raise ValueError("wrong issuer or audience")
    return claims

def attempt(label, token, now=None):
    try:
        print(label, "-> OK", verify(token, now)["sub"])
    except ValueError as e:
        print(label, "-> REJECTED:", e)

t0 = 1_900_000_000
good = sign({"sub": "user-42", "role": "user"}, now=t0)
attempt("fresh token        ", good, now=t0 + 60)
attempt("16 minutes later   ", good, now=t0 + 16 * 60)

h, p, s = good.split(".")
evil_payload = b64url_encode(json.dumps({"sub": "user-42", "role": "admin", "iss": ISSUER, "aud": AUDIENCE, "exp": t0 + 900}, separators=(",", ":")).encode())
attempt("role edited to admin", h + "." + evil_payload + "." + s, now=t0 + 60)

none_header = b64url_encode(b'{"alg":"none","typ":"JWT"}')
attempt("alg=none attack     ", none_header + "." + p + ".", now=t0 + 60)
`
      },
      {
        lang: 'js', run: true, title: 'Decode (NOT verify) the three parts of a JWT in plain JavaScript', code: `// A made-up demo token, built here so the example is self contained. Not a real credential.
const enc = obj => btoa(JSON.stringify(obj)).split('=').join('').split('+').join('-').split('/').join('_');
const demoToken =
  enc({ alg: 'HS256', typ: 'JWT' }) + '.' +
  enc({ sub: 'user-42', role: 'user', exp: 1900000000 }) + '.' +
  'FAKE-SIGNATURE-FOR-DEMO';

function b64urlDecode(part) {
  let s = part.split('-').join('+').split('_').join('/');
  while (s.length % 4) s += '=';          // restore padding
  return atob(s);                          // fine for ASCII claims; use TextDecoder for UTF-8
}

function decodeJwt(token) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('A JWT has exactly 3 dot-separated parts');
  return {
    header: JSON.parse(b64urlDecode(parts[0])),
    payload: JSON.parse(b64urlDecode(parts[1])),
    signature: parts[2]                    // raw bytes; useless without the key
  };
}

const d = decodeJwt(demoToken);
console.log('header   :', JSON.stringify(d.header));
console.log('payload  :', JSON.stringify(d.payload));
console.log('signature:', d.signature);
console.log('expires  :', new Date(d.payload.exp * 1000).toISOString());
console.log('REMINDER : decoding proves nothing. Anyone can write any payload. Only signature verification does.');`
      },
      {
        lang: 'java', title: 'Plain Java: HS256 sign + verify with javax.crypto.Mac', code: `import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

public class MiniJwt {
    private static final Base64.Encoder ENC = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder DEC = Base64.getUrlDecoder();

    private static byte[] hmacSha256(byte[] key, String data) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(key, "HmacSHA256"));
        return mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
    }

    static String sign(String payloadJson, byte[] key) throws Exception {
        String header = ENC.encodeToString("{\\"alg\\":\\"HS256\\",\\"typ\\":\\"JWT\\"}".getBytes(StandardCharsets.UTF_8));
        String payload = ENC.encodeToString(payloadJson.getBytes(StandardCharsets.UTF_8));
        String signingInput = header + "." + payload;
        return signingInput + "." + ENC.encodeToString(hmacSha256(key, signingInput));
    }

    /** Returns the payload JSON if the signature is valid, otherwise throws. */
    static String verify(String token, byte[] key) throws Exception {
        String[] p = token.split("[.]");
        if (p.length != 3) throw new IllegalArgumentException("malformed token");
        String header = new String(DEC.decode(p[0]), StandardCharsets.UTF_8);
        if (!header.contains("\\"alg\\":\\"HS256\\"")) throw new IllegalArgumentException("alg not allowed");
        byte[] expected = hmacSha256(key, p[0] + "." + p[1]);
        byte[] actual = DEC.decode(p[2]);
        if (!MessageDigest.isEqual(expected, actual)) throw new IllegalArgumentException("bad signature");
        return new String(DEC.decode(p[1]), StandardCharsets.UTF_8);   // parse exp/aud with a JSON library next
    }

    public static void main(String[] args) throws Exception {
        String secret = System.getenv("JWT_SECRET");                   // set in the environment, never in source
        if (secret == null) secret = "dev-only-placeholder";           // demo fallback only
        byte[] key = secret.getBytes(StandardCharsets.UTF_8);
        String token = sign("{\\"sub\\":\\"user-42\\",\\"role\\":\\"user\\",\\"exp\\":1900000000}", key);
        System.out.println("payload ok : " + verify(token, key));
        String tampered = token.substring(0, token.lastIndexOf('.')) + ".AAAA";
        try { verify(tampered, key); } catch (IllegalArgumentException e) { System.out.println("tampered  : " + e.getMessage()); }
    }
}`
      },
      {
        lang: 'java', check: false, title: 'Spring Security resource server + Node jsonwebtoken (framework code)', code: `// --- Spring Boot 3: validate incoming JWTs (signature, exp, issuer) using the issuer's JWKS ---
// application.yml:
//   spring.security.oauth2.resourceserver.jwt.issuer-uri: https://auth.example.test
@Bean
SecurityFilterChain api(HttpSecurity http) throws Exception {
    http.authorizeHttpRequests(a -> a.requestMatchers("/admin/**").hasAuthority("SCOPE_admin")
                                     .anyRequest().authenticated())
        .oauth2ResourceServer(o -> o.jwt(Customizer.withDefaults()))   // Bearer token filter + JwtDecoder
        .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS));
    return http.build();
}

// --- Node.js with the jsonwebtoken package ---
// const jwt = require('jsonwebtoken');
// const token = jwt.sign({ sub: '42', role: 'user' }, process.env.JWT_SECRET,
//                        { algorithm: 'HS256', expiresIn: '15m', issuer: 'https://auth.example.test', audience: 'orders-api' });
// const claims = jwt.verify(token, process.env.JWT_SECRET,
//                        { algorithms: ['HS256'], issuer: 'https://auth.example.test', audience: 'orders-api' }); // allow-list!`
      },
      {
        lang: 'python', run: true, title: 'Logout design: deny-list by jti + per-user token version', code: `import time

# In production this is Redis: SET denied:<jti> 1 EX <seconds-until-exp>  and  GET user:<id>:ver
denied_jtis = {}          # jti -> unix time when the entry can be forgotten (the token's own exp)
user_version = {"user-42": 1}

def issue(user, jti, now, ttl=900):
    return {"sub": user, "jti": jti, "ver": user_version[user], "exp": now + ttl}

def is_allowed(claims, now):
    if claims["exp"] <= now:
        return "expired"
    if claims["jti"] in denied_jtis:
        return "revoked (this token was logged out)"
    if claims["ver"] != user_version[claims["sub"]]:
        return "revoked (user logged out everywhere / password changed)"
    return "ok"

def logout_this_device(claims):
    denied_jtis[claims["jti"]] = claims["exp"]       # keep only until it would expire anyway -> list stays small

def logout_everywhere(user):
    user_version[user] += 1                          # one write kills every older token of this user

def cleanup(now):
    for jti in [j for j, until in denied_jtis.items() if until <= now]:
        del denied_jtis[jti]

t = 1_900_000_000
phone = issue("user-42", "jti-phone", t)
laptop = issue("user-42", "jti-laptop", t)
print("phone before logout :", is_allowed(phone, t + 60))
logout_this_device(phone)
print("phone after logout  :", is_allowed(phone, t + 120))
print("laptop still fine   :", is_allowed(laptop, t + 120))
logout_everywhere("user-42")
print("laptop after global :", is_allowed(laptop, t + 180))
cleanup(t + 901)
print("deny-list size after cleanup:", len(denied_jtis))
`
      }
    ],
    codeTitle: ['Python: sign + verify with tamper tests (runnable)', 'JavaScript: decode the three parts (runnable)', 'Java: HS256 with Mac', 'Spring / Node framework code', 'Python: logout strategies (runnable)'],
    viz: [
      {
        title: 'Anatomy of a JWT: header.payload.signature (toy signature)',
        input: 'sub=42 role=user exp=1900000000',
        inputLabel: 'Claims as key=value pairs (letters, digits, - _ only)',
        gen: function (input) {
          var pairs = String(input || '').trim().split(/\s+/).filter(function (x) { return x; });
          if (!pairs.length || pairs.length > 6) throw new Error('Give 1-6 pairs like: sub=42 role=user exp=1900000000');
          var claims = [], json = '{', i, kv;
          for (i = 0; i < pairs.length; i++) {
            kv = pairs[i].split('=');
            if (kv.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(kv[0]) || !/^[A-Za-z0-9_-]+$/.test(kv[1])) throw new Error('Use key=value with letters, digits, - or _ only');
            claims.push(kv);
            json += (i ? ',' : '') + '"' + kv[0] + '":' + (/^\d+$/.test(kv[1]) ? kv[1] : '"' + kv[1] + '"');
          }
          json += '}';
          var headerJson = '{"alg":"HS256","typ":"JWT"}';
          var h = b64url(headerJson), p = b64url(json);
          var secret = 'demo-only-placeholder';
          var sig = b64url(toyHash(h + '.' + p + '.' + secret));
          var frames = [];
          frames.push({ narr: 'A JWT is just <b>three text chunks glued with dots</b>. Let us take one apart. Here is the whole token (the signature below is a TOY, not real HMAC).', parts: [
            { type: 'table', label: 'token = header . payload . signature', columns: ['part', 'base64url text'], rows: [['header', short(h, 44)], ['payload', short(p, 44)], ['signature', short(sig, 44)]], hl: { 0: 'bad', 1: 'sel', 2: 'win' } }
          ] });
          frames.push({ narr: '<b>Part 1, header</b>: decode the base64url and you get plain JSON saying how it was signed. The server must still decide by itself which algorithms it accepts.', parts: [
            { type: 'table', label: 'header', columns: ['base64url', 'decoded JSON'], rows: [[short(h, 30), H.esc(headerJson)]], hl: { 0: 'bad' } }
          ] });
          frames.push({ narr: '<b>Part 2, payload</b>: the claims. Remember: this is only <i>encoded</i>, not hidden. Anyone who sees the token can read it, so never put passwords or private data here.', parts: [
            { type: 'table', label: 'payload', columns: ['base64url', 'decoded JSON'], rows: [[short(p, 30), H.esc(json)]], hl: { 0: 'sel' } },
            { type: 'map', label: 'claims', entries: claims, hl: claims.reduce(function (o, c) { if (c[0] === 'exp') o[c[0]] = 'cur'; return o; }, {}) }
          ] });
          frames.push({ narr: '<b>Part 3, signature</b>: the issuer mixes <code>header.payload</code> with a secret key using HMAC and appends the result. Only holders of the key can create a matching signature.', parts: [
            { type: 'queue', label: 'signing', items: ['header.payload', '+ secret key', 'HMAC-SHA256', 'signature'], frontLabel: 'input', backLabel: 'output', hl: { 3: 'ok' } },
            { type: 'vars', vals: { signingInput: short(h + '.' + p, 36), signature: sig } }
          ] });
          frames.push({ narr: 'The API receives the token, rebuilds <code>header.payload</code>, signs it itself with its own copy of the key, and compares. Equal means nobody touched it.', parts: [
            { type: 'vars', vals: { 'signature in token': sig, 'signature I computed': sig, equal: 'true' }, hl: { equal: 'ok' } }
          ] });
          var evil = json.replace(/"role":"user"/, '"role":"admin"');
          if (evil === json) evil = json.slice(0, json.length - 1) + ',"admin":true}';
          var p2 = b64url(evil), sig2 = b64url(toyHash(h + '.' + p2 + '.' + secret));
          frames.push({ narr: '<span class="c-r">Attack:</span> someone edits the payload to <code>' + H.esc(short(evil, 40)) + '</code> and keeps the old signature. The server recomputes the signature over the NEW payload and gets a different value.', parts: [
            { type: 'vars', vals: { 'signature in token (old)': sig, 'signature server computes': sig2, equal: 'false' }, hl: { equal: 'bad', 'signature server computes': 'bad' } }
          ] });
          frames.push({ narr: 'Result: <b>401 Unauthorized</b>. The attacker cannot produce a valid signature without the key. This is why the key must be long, random, and never in source control.', parts: [
            { type: 'table', label: 'server decision', columns: ['check', 'result'], rows: [['alg in allow-list', 'pass'], ['signature matches', '<span class="c-r">FAIL</span>'], ['exp / aud / iss', 'not even looked at']], hl: { 1: 'bad' } }
          ] });
          return frames;
        }
      },
      {
        title: 'Logout with JWTs: deny-list timeline',
        input: '6',
        inputLabel: 'Minute when the user logs out (1-14)',
        gen: function (input) {
          var m = parseInt(String(input || '6').trim(), 10);
          if (isNaN(m) || m < 1 || m > 14) throw new Error('Enter a minute from 1 to 14');
          var frames = [], rows = [];
          frames.push({ narr: 'Minute 0: user logs in and receives an access token with <code>jti=a1</code> that expires at minute 15.', parts: [
            { type: 'table', label: 'requests', columns: ['minute', 'token', 'deny-list says', 'result'], rows: [['0', 'a1 (login)', '-', 'issued, exp = 15']], hl: { 0: 'ok' } },
            { type: 'map', label: 'deny-list (Redis)', entries: [['(empty)', '-']] }
          ] });
          rows.push([String(Math.max(1, m - 1)), 'a1', 'not listed', '<span class="c-g">200 OK</span>']);
          frames.push({ narr: 'Before logout the token works. The server only checked the signature, <code>exp</code>, and asked the deny-list (not found).', parts: [
            { type: 'table', label: 'requests', columns: ['minute', 'token', 'deny-list says', 'result'], rows: rows.map(function (r) { return r.slice(); }), hl: { 0: 'ok' } },
            { type: 'map', label: 'deny-list (Redis)', entries: [['(empty)', '-']] }
          ] });
          frames.push({ narr: 'Minute ' + m + ': <b>logout</b>. The server cannot "un-sign" the token, so it writes <code>a1</code> into the deny-list with a TTL that ends exactly at the token\'s own expiry (minute 15). Nothing grows forever.', parts: [
            { type: 'map', label: 'deny-list (Redis)', entries: [['a1', 'until minute 15']], hl: { a1: 'cur' } },
            { type: 'vars', vals: { logoutMinute: m, ttlMinutes: 15 - m }, hl: { ttlMinutes: 'sel' } }
          ] });
          rows.push([String(Math.min(14, m + 1)), 'a1 (replayed by a thief)', 'LISTED', '<span class="c-r">401 revoked</span>']);
          frames.push({ narr: 'Minute ' + Math.min(14, m + 1) + ': someone replays the old token. Signature is fine, but the deny-list says <b>revoked</b>. Rejected.', parts: [
            { type: 'table', label: 'requests', columns: ['minute', 'token', 'deny-list says', 'result'], rows: rows.map(function (r) { return r.slice(); }), hl: { 1: 'bad' } },
            { type: 'map', label: 'deny-list (Redis)', entries: [['a1', 'until minute 15']], hl: { a1: 'bad' } }
          ] });
          rows.push(['15', 'a1', 'entry expired', '<span class="c-r">401 expired</span>']);
          frames.push({ narr: 'Minute 15: the token expires by itself, so the deny-list entry is removed automatically. Cost of this design: <b>one fast lookup per request</b> and a tiny list. Without it, a stolen token would work until minute 15 regardless of logout.', parts: [
            { type: 'table', label: 'requests', columns: ['minute', 'token', 'deny-list says', 'result'], rows: rows.map(function (r) { return r.slice(); }), hl: { 2: 'done' } },
            { type: 'map', label: 'deny-list (Redis)', entries: [['(empty)', '-']] }
          ] });
          frames.push({ narr: 'For "log out everywhere", skip per-token entries: keep <code>tokenVersion</code> per user. The JWT carries <code>ver=7</code>; bumping the stored version to 8 invalidates every older token with a single write.', parts: [
            { type: 'table', label: 'token version check', columns: ['token ver', 'user ver now', 'result'], rows: [['7', '7', '<span class="c-g">valid</span>'], ['7', '8 (after logout-all)', '<span class="c-r">revoked</span>']], hl: { 1: 'bad' } }
          ] });
          return frames;
        }
      }
    ],
    examples: [
      {
        title: 'Reading a real-looking token step by step', html: `<p>Fake token (not a real credential): <code>eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI0MiIsInJvbGUiOiJhZG1pbiJ9.FAKE</code></p>
        ${H.table(['Part', 'Decode', 'Result'], [['1', 'base64url("eyJhbGciOiJIUzI1NiJ9")', '<code>{"alg":"HS256"}</code>'], ['2', 'base64url("eyJzdWIiOiI0MiIsInJvbGUiOiJhZG1pbiJ9")', '<code>{"sub":"42","role":"admin"}</code>'], ['3', 'signature bytes', 'cannot be checked without the key']])}
        <p>Seeing <code>role: admin</code> here does <b>not</b> make the caller an admin. Only a token that passes signature verification counts. Never write code that decodes and trusts the payload without verifying.</p>`
      },
      {
        title: 'Algorithm confusion in one picture', html: `<p>A server is configured with an RSA <b>public</b> key and verifies RS256 tokens. A naive library lets the token choose its algorithm. The attacker sets <code>alg: HS256</code> and signs the token using the <i>public key text as the HMAC secret</i> (the public key is public!). The server, told "HS256", uses the same public key as the HMAC secret and the signature matches.</p>
        <p>Fixes: pass an explicit <code>algorithms: ['RS256']</code> allow-list to the verifier, use libraries that bind key type to algorithm, reject <code>none</code>.</p>`
      },
      {
        title: 'Key rotation with kid and JWKS', html: `<p>Issuer rotates keys every 90 days. Tokens carry <code>"kid":"2026-04"</code> in the header. Verifiers fetch <code>/.well-known/jwks.json</code>, cache it (say 10 minutes), pick the key with the matching <code>kid</code>, and refetch if they see an unknown <code>kid</code> (rate-limited so a flood of fake kids cannot hammer the auth server).</p>
        <p>Rotation rhythm: publish new key → start signing with it → keep the old public key in the JWKS until all old tokens have expired → remove it.</p>`
      },
      {
        title: 'Cookie vs Authorization header for carrying the JWT', html: `<p>Same token, two carriers:</p>
        ${H.table(['', 'HttpOnly cookie', 'Authorization: Bearer'], [['XSS can read it', '<span class="c-g">no</span>', '<span class="c-r">yes, if stored in JS-reachable storage</span>'], ['CSRF risk', '<span class="c-r">yes</span> (needs SameSite / token)', '<span class="c-g">no</span>'], ['Works for non-browser clients', 'awkward', '<span class="c-g">natural</span>']])}`
      }
    ],
    deepDive: `<p>🟣 <b>Claims are a cache of facts.</b> Anything you put in a JWT is a snapshot that stays true "until exp". Role changes, account disables, and plan downgrades will not show up until the token is replaced. Use the token for <i>identity</i> and coarse scopes, and look up fast-changing permissions on the server for sensitive actions.</p>
      <p><b>Size and cost.</b> Every request carries the token (cookies and headers have limits, typically 8 KB total). Do not stuff entire permission trees into it. RS256 signatures are 256 bytes; ES256 are 64 bytes, so ES256/EdDSA tokens are smaller. HS256 verification takes a few microseconds; RS256 verification is also fast (signing is the slow side), ES256 verification is slower than RS256 verification.</p>
      <p><b>Common vulnerabilities (the interview list):</b> (1) accepting <code>alg: none</code>; (2) algorithm confusion; (3) weak HS256 secrets guessable offline (use at least 32 random bytes); (4) not validating <code>aud</code>/<code>iss</code>, so a token for service A is accepted by service B; (5) not enforcing <code>exp</code>; (6) trusting unverified <code>kid</code>/<code>jku</code>/<code>x5u</code> header URLs (the token tells you where to fetch keys: attacker controlled!); (7) long-lived tokens in localStorage; (8) logging full tokens.</p>
      <p><b>JWS vs JWE.</b> A normal JWT is a JWS (signed). If the payload must be confidential from the holder or from intermediaries, use JWE (encrypted) or an opaque token plus server-side lookup. <b>PASETO</b> and Biscuit are alternatives that remove algorithm choice; <b>DPoP</b> and mTLS-bound tokens make a stolen bearer token useless on another machine (proof of possession).</p>
      <p><b>Logout trade-offs, honestly.</b> The deny-list brings back server state (but tiny: only revoked, not-yet-expired tokens). If your 15-minute access token plus revocable refresh token meets your risk appetite, skip the deny-list. Payment and admin actions often add step-up checks or call the auth server (introspection) for the final authorization decision.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI agents will increasingly carry tokens to call tools and APIs for you. A leaked long-lived token in a prompt, a log, or an agent's memory is a real breach path. Prefer <b>short-lived, audience-restricted, scope-limited</b> tokens for agents, and treat any token pasted into a chat tool as compromised.</p>
      <p><b>Use AI as a partner:</b> <code>Review this JWT verification function against the OWASP JWT cheat sheet and list what it fails to check</code>; <code>Generate negative test cases: expired, wrong aud, alg none, tampered payload, unknown kid</code>.</p>
      <p><b>Where AI goes wrong:</b> it often shows <code>jwt.decode()</code> (no verification!) where <code>jwt.verify()</code> is needed, forgets the <code>algorithms</code> allow-list, hard-codes <code>'secret'</code>, sets 30-day access tokens, or claims JWTs are "encrypted".</p>
      <p><b>What you must still own:</b> the decision of TTLs and revocation, key management and rotation, and writing the negative tests. Always paste only fake tokens (<code>FAKE-SIGNATURE</code>) into assistants.</p>`,
    problems: [
      {
        title: 'Decode and Verify a JWT by Hand', level: 'Medium', tags: ['JWT', 'HMAC', 'base64url'], companies: ['Okta', 'Auth0', 'Microsoft'],
        statement: `<p>Given a token string and a secret, write the verification steps: split, decode header and payload, check the algorithm allow-list, verify the HS256 signature in constant time, then check <code>exp</code>, <code>iss</code> and <code>aud</code>. Explain the order and why each check exists.</p>`,
        constraints: `HS256 only. Tokens up to 4 KB. Clock skew leeway 30 seconds. Return claims or a precise error.`,
        example: `<p>Input: a token with <code>exp</code> in the past and a valid signature.</p><p>Output: ${H.c('r', 'REJECTED: token expired')}. A tampered payload with an old signature gives ${H.c('r', 'REJECTED: bad signature')} and the claims are never read.</p>`,
        brute: { why: `<p>Just base64-decode the payload and trust it (<code>jwt.decode</code>). Anyone can forge any claim, because decoding checks nothing.</p>` },
        mcq: { q: 'Which order is correct?', options: ['Read claims, then verify signature', 'Verify signature, then read and check claims', 'Check exp only', 'Verify signature only if role is admin'], answer: 1, explain: 'Never trust any claim before the signature is verified. The payload is attacker-controlled until then.' },
        hints: [`<p>Aha: the signature covers the exact bytes of <code>header.payload</code> as received; do not re-serialise the JSON before checking.</p>`, `<p>Use HMAC-SHA256 with the secret and compare with a constant-time function; decode base64url by re-adding <code>=</code> padding.</p>`, `<p>Recipe: split(3) → decode header → alg allow-list → HMAC compare → decode payload → exp (with leeway) → iss → aud → return claims.</p>`],
        solution: {
          approach: `<p>1) Split on dots and require exactly 3 non-empty parts (the signature may be empty only for <code>alg:none</code>, which we reject anyway). 2) Decode the header; require <code>alg == HS256</code> from our own allow-list. 3) Compute <code>HMAC-SHA256(secret, parts[0] + "." + parts[1])</code> over the exact received text and compare to the decoded third part with a constant-time function. 4) Only after a match, decode the payload JSON and check <code>exp &gt; now - leeway</code>, <code>iss</code> equals the expected issuer, and <code>aud</code> contains our API id. 5) Return the claims. Each check exists to stop a specific attack: allow-list vs alg tricks, constant-time vs timing leaks, signature vs forgery, exp vs replay of old tokens, iss/aud vs tokens from another service or tenant. The runnable Python example in this topic implements exactly this and demonstrates the tamper, expiry and alg=none rejections.</p>`,
          code: { lang: 'python', run: true, code: `import base64, hashlib, hmac, json, time\n\ndef b64d(s):\n    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))\n\ndef verify(token, secret, iss, aud, now, leeway=30):\n    h, p, s = token.split(".")\n    if json.loads(b64d(h)).get("alg") != "HS256":\n        raise ValueError("alg not allowed")\n    good = hmac.new(secret, (h + "." + p).encode(), hashlib.sha256).digest()\n    if not hmac.compare_digest(good, b64d(s)):\n        raise ValueError("bad signature")\n    c = json.loads(b64d(p))\n    if c["exp"] + leeway <= now: raise ValueError("expired")\n    if c["iss"] != iss: raise ValueError("wrong issuer")\n    if c["aud"] != aud: raise ValueError("wrong audience")\n    return c\n\ndef mk(secret, claims):\n    e = lambda b: base64.urlsafe_b64encode(b).rstrip(b"=").decode()\n    h = e(b'{"alg":"HS256","typ":"JWT"}'); p = e(json.dumps(claims).encode())\n    return h + "." + p + "." + e(hmac.new(secret, (h + "." + p).encode(), hashlib.sha256).digest())\n\nsecret = b"dev-only-placeholder"\ntok = mk(secret, {"sub": "42", "iss": "me", "aud": "api", "exp": 2000})\nprint(verify(tok, secret, "me", "api", now=1000))\ntry:\n    verify(tok, secret, "me", "api", now=3000)\nexcept ValueError as e:\n    print("rejected:", e)\n` },
          dry: { head: ['Step', 'Check', 'Tampered token', 'Good token'], rows: [['1', '3 parts', 'ok', 'ok'], ['2', 'alg allow-list', 'ok', 'ok'], ['3', 'signature', '<span class="c-r">FAIL → stop</span>', 'ok'], ['4', 'exp / iss / aud', 'never reached', 'ok → claims returned']] },
          complexity: `<p>O(n) in token length: one HMAC plus two base64 decodes. A few microseconds.</p>`,
          followUps: ['How would you support key rotation with kid?', 'What changes for RS256?']
        }
      },
      {
        title: 'Design Logout for a JWT-Based API', level: 'Medium', tags: ['JWT', 'logout', 'revocation'], companies: ['Uber', 'Stripe'],
        statement: `<p>Your API uses 15-minute JWT access tokens and 30-day refresh tokens. Product wants (1) logout on this device, (2) logout everywhere, (3) "ban user now" within seconds, and (4) no database call on the hot path unless needed. Design it.</p>`,
        constraints: `20k requests/second, Redis available, access token TTL 15 min.`,
        example: `<p>Phone logs out → ${H.c('g', 'refresh token deleted + jti added to Redis deny-list until exp')}. A request with the old access token 2 minutes later → ${H.c('r', '401 revoked')}.</p>`,
        brute: { why: `<p>"Delete the token from the client." A copied token still works for up to 15 minutes, and a banned user keeps access until it expires. Or: store every JWT in the DB and look it up per request, which is just a slow session store.</p>` },
        mcq: { q: 'What is the cheapest way to invalidate ALL of one user\'s tokens at once?', options: ['Add every issued jti to a deny-list', 'Keep a per-user token version in the JWT and bump the stored version', 'Rotate the global signing key', 'Wait for expiry'], answer: 1, explain: 'One write (version bump) invalidates every older token for that user; rotating the global key logs out everyone.' },
        hints: [`<p>Two kinds of tokens: access (short, stateless) and refresh (long, stored on the server so it is revocable).</p>`, `<p>For instant kill add a tiny Redis check: deny-list by jti (one device) and token version (everywhere / ban).</p>`, `<p>Entries must carry a TTL equal to remaining token life so Redis memory stays small; check order: signature → exp → deny-list → version.</p>`],
        solution: {
          approach: `<p><b>Tokens:</b> access JWT (15 min, contains <code>sub</code>, <code>jti</code>, <code>ver</code>), refresh token (opaque random string, stored hashed in DB with family id, rotated on every use).</p>
          <p><b>Logout this device:</b> delete that device's refresh token row (no new access tokens) and <code>SET denied:{jti} 1 EX remaining_ttl</code> so the current access token dies now.</p>
          <p><b>Logout everywhere / password change / ban:</b> delete all refresh tokens of the user and increment <code>user:{id}:ver</code> in Redis (and DB). Every verifier compares <code>claims.ver</code> with the cached version, so all older access tokens fail on the next call. For ban also set <code>user:{id}:disabled</code>.</p>
          <p><b>Hot path:</b> verify signature locally (microseconds), then at most two Redis GETs (pipeline them, about 0.3 ms). No DB hit. Accept that, at 15 minutes TTL, the worst case without the Redis checks is 15 minutes of exposure, and say which endpoints (money movement, admin) get the Redis check or even full introspection while others rely on TTL.</p>
          <p><b>Failure mode:</b> if Redis is down, fail closed for high-risk endpoints and fail open (rely on TTL) for low-risk ones, and alert.</p>`,
          complexity: `<p>Per request: O(1) signature check + 1-2 Redis reads. Memory: only revoked, unexpired jtis (small), plus one integer per active user.</p>`,
          followUps: ['How do you handle clock skew between servers?', 'What if a refresh token is stolen? (see the next topic)']
        }
      }
    ]
  });

  /* =====================================================================
     TOPIC 4 — Refresh tokens with rotation + reuse detection
     ===================================================================== */
  topics.push({
    title: 'Refresh Tokens, Rotation & Reuse Detection',
    analogy: `<p>Think of a <b>hotel</b>. The <b>room key card</b> (access token) opens your door but stops working in 15 minutes. The <b>front desk</b> (auth server) knows you, so you go back and show your <b>booking slip</b> (refresh token) to get a fresh key card.</p>
      <p>With <b>rotation</b>, every time you show the booking slip the desk takes it away and gives you a brand-new slip along with the new key card. If a thief later shows an old slip you already used, the desk knows something is wrong: two people hold the same slip! The desk cancels the whole booking, so both you and the thief must go back to the lobby and prove who you are again.</p>`,
    explain: `<p>🟢 <b>The problem:</b> short access tokens (5-15 min) are safer, but nobody wants to type their password every 15 minutes. <b>Solution:</b> issue a second, long-lived credential: the <b>refresh token</b>.</p>
      ${H.table(['', 'Access token', 'Refresh token'], [
        ['Lifetime', 'minutes', 'days or weeks'],
        ['Sent to', 'every API call (resource server)', '<b>only</b> the auth server /token endpoint'],
        ['Format', 'often JWT (self-contained)', '<b>opaque random string</b>, looked up on the server'],
        ['Stored on server?', 'no (stateless)', '<b>yes</b>, as a hash, so it can be revoked'],
        ['If stolen', 'works until it expires (minutes)', 'can mint new access tokens for weeks, so it needs extra protection']
      ])}
      <p><b>Refresh token rotation (RTR)</b> makes theft detectable:</p>
      <ol>
        <li>Every use of refresh token <code>R1</code> returns a new access token <b>and a new refresh token R2</b>. R1 is marked <i>used</i>.</li>
        <li>Tokens issued from the same login belong to one <b>family</b> (same <code>family_id</code>).</li>
        <li>If an already-used token (R1) shows up again, one of the two parties is a thief and we cannot tell which. <b>Revoke the entire family</b> and force a fresh login.</li>
      </ol>
      <p><b>Storage rules.</b> Server: store only <code>SHA-256(token)</code> (the token is 256 random bits, so a fast hash is fine and lets you look it up by hash). Browser: an <code>HttpOnly; Secure; SameSite=Strict; Path=/auth/refresh</code> cookie so JavaScript cannot read it and it is only ever sent to the refresh endpoint. Mobile: iOS Keychain / Android Keystore, not plain preferences.</p>
      <p><b>Lifetimes.</b> Use both a <i>sliding</i> idle window (e.g. 14 days since last use) and an <i>absolute</i> cap (e.g. 90 days since login), after which the user must sign in again.</p>
      <p><b>Real-life wrinkle:</b> a flaky network can make the client send the same refresh request twice, or two browser tabs refresh at once. A strict "any reuse = revoke" rule logs out innocent users. The common fix is a short <b>grace window</b> (about 5-30 seconds) in which a just-rotated token may be retried and returns the same successor, while reuse after that window triggers revocation.</p>`,
    clues: [
      '"Short-lived access tokens but users stay logged in for weeks" → refresh tokens',
      '"Detect a stolen refresh token" → rotation + reuse detection (token families)',
      '"Where do you store the refresh token in a SPA?" → HttpOnly SameSite cookie scoped to the refresh path, or a BFF; not localStorage',
      '"Two tabs refresh at the same time" → atomic compare-and-set on <code>used</code> + a grace window',
      '"Log out everywhere" → delete all refresh tokens of the user (and bump token version)',
      '"Mobile app refresh token" → secure OS storage, device binding, optionally DPoP',
      '"Why not make the access token last 30 days?" → no revocation and big blast radius'
    ],
    code: [
      {
        lang: 'python', run: true, title: 'Refresh rotation with reuse detection (runnable simulation)', code: `import hashlib, secrets

class RefreshService:
    """Stores only hashes of refresh tokens. Rotates on every use; reuse of an old token kills the family."""
    def __init__(self):
        self.rows = {}                 # token_hash -> {"user", "family", "used"}
        self.dead_families = set()

    @staticmethod
    def _hash(token):
        return hashlib.sha256(token.encode()).hexdigest()   # token is 256 random bits, so a fast hash is fine

    def _issue(self, user, family):
        token = secrets.token_urlsafe(32)                    # opaque random string, NOT a JWT
        self.rows[self._hash(token)] = {"user": user, "family": family, "used": False}
        return token

    def login(self, user):
        return self._issue(user, secrets.token_hex(4))       # new family per login

    def refresh(self, token):
        row = self.rows.get(self._hash(token))
        if row is None:
            return "REJECTED unknown token", None
        if row["family"] in self.dead_families:
            return "REJECTED family revoked - log in again", None
        if row["used"]:                                      # an already-used token came back: theft signal
            self.dead_families.add(row["family"])
            return "THEFT DETECTED - family revoked", None
        row["used"] = True                                   # burn the old token...
        return "OK new tokens issued", self._issue(row["user"], row["family"])   # ...and hand out its successor

svc = RefreshService()
r1 = svc.login("user-42")
msg, r2 = svc.refresh(r1);        print("legit client uses R1     :", msg)
msg, r3 = svc.refresh(r2);        print("legit client uses R2     :", msg)
msg, _ = svc.refresh(r1);         print("attacker replays old R1  :", msg)
msg, _ = svc.refresh(r3);         print("legit client uses R3     :", msg)
`
      },
      {
        lang: 'java', title: 'Plain Java: thread-safe rotation with atomic compare-and-set', code: `import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;

public class RefreshService {
    private static final class Row {
        final String userId, familyId;
        final long expiresAtMs;
        final AtomicBoolean used = new AtomicBoolean(false);   // flipped exactly once, even with concurrent requests
        Row(String userId, String familyId, long expiresAtMs) {
            this.userId = userId; this.familyId = familyId; this.expiresAtMs = expiresAtMs;
        }
    }

    private static final long LIFETIME_MS = 14L * 24 * 3600 * 1000;   // 14 days sliding window
    private final Map<String, Row> byHash = new ConcurrentHashMap<>();
    private final Set<String> deadFamilies = ConcurrentHashMap.newKeySet();
    private final SecureRandom rng = new SecureRandom();

    private static String sha256Hex(String s) throws Exception {
        byte[] d = MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder();
        for (byte b : d) sb.append(String.format("%02x", b));
        return sb.toString();
    }

    private String issue(String userId, String familyId, long nowMs) throws Exception {
        byte[] raw = new byte[32];
        rng.nextBytes(raw);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
        store(token, new Row(userId, familyId, nowMs + LIFETIME_MS));
        return token;
    }

    private void store(String token, Row row) throws Exception { byHash.put(sha256Hex(token), row); }

    public String login(String userId, long nowMs) throws Exception {
        return issue(userId, UUID.randomUUID().toString(), nowMs);   // brand-new family
    }

    public String rotate(String token, long nowMs) throws Exception {
        Row row = byHash.get(sha256Hex(token));
        if (row == null) throw new SecurityException("unknown refresh token");
        if (deadFamilies.contains(row.familyId)) throw new SecurityException("family revoked, log in again");
        if (nowMs >= row.expiresAtMs) throw new SecurityException("refresh token expired");
        if (!row.used.compareAndSet(false, true)) {                  // somebody already used it
            deadFamilies.add(row.familyId);                          // assume theft: kill every token of this login
            throw new SecurityException("reuse detected, family revoked");
        }
        return issue(row.userId, row.familyId, nowMs);               // successor stays in the same family
    }

    public static void main(String[] args) throws Exception {
        RefreshService svc = new RefreshService();
        long now = System.currentTimeMillis();
        String r1 = svc.login("user-42", now);
        String r2 = svc.rotate(r1, now);
        System.out.println("R1 -> R2 ok: " + (r2 != null));
        try { svc.rotate(r1, now); } catch (SecurityException e) { System.out.println("replay of R1: " + e.getMessage()); }
        try { svc.rotate(r2, now); } catch (SecurityException e) { System.out.println("R2 afterwards: " + e.getMessage()); }
    }
}`
      },
      {
        lang: 'sql', title: 'Table design + atomic rotate in SQL (SQLite-compatible)', code: `CREATE TABLE refresh_tokens (
  token_hash TEXT PRIMARY KEY,                 -- SHA-256 of the opaque token, never the token itself
  user_id    INTEGER NOT NULL,
  family_id  TEXT    NOT NULL,                 -- all tokens from one login share this
  used_at    TEXT,                             -- NULL = still usable
  expires_at TEXT    NOT NULL,
  revoked    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_refresh_family ON refresh_tokens(family_id);

INSERT INTO refresh_tokens (token_hash, user_id, family_id, expires_at)
VALUES ('hash-of-R1', 42, 'fam-1', '2099-01-01');

-- Rotation step 1: claim the token. The WHERE clause makes this atomic: only ONE concurrent request can win.
UPDATE refresh_tokens SET used_at = datetime('now')
WHERE token_hash = 'hash-of-R1' AND used_at IS NULL AND revoked = 0 AND expires_at > datetime('now');
SELECT changes() AS rows_claimed;             -- 1 = we won, insert the successor; 0 = reuse or expired

-- Reuse detected (changes() = 0 for a known hash): revoke the whole family.
UPDATE refresh_tokens SET revoked = 1 WHERE family_id = 'fam-1';
SELECT token_hash, used_at IS NOT NULL AS used, revoked FROM refresh_tokens WHERE family_id = 'fam-1';`
      },
      {
        lang: 'js', check: false, title: 'Express: refresh endpoint with a scoped HttpOnly cookie', code: `app.post('/auth/refresh', async (req, res) => {
  const presented = req.cookies['__Secure-rt'];              // cookie only travels to this path
  if (!presented) return res.status(401).end();

  const result = await refreshService.rotate(presented);     // atomic: marks used, issues successor or throws
  if (result.reuseDetected) {
    res.clearCookie('__Secure-rt', { path: '/auth/refresh' });
    await audit.log('refresh_token_reuse', { userId: result.userId, family: result.family });
    return res.status(401).json({ error: 'session_revoked' }); // client sends the user to the login page
  }

  res.cookie('__Secure-rt', result.newRefreshToken, {
    httpOnly: true, secure: true, sameSite: 'strict',
    path: '/auth/refresh', maxAge: 14 * 24 * 3600 * 1000
  });
  res.json({ accessToken: result.accessToken, expiresIn: 900 });
});`
      }
    ],
    codeTitle: ['Python: rotation + theft detection (runnable)', 'Java: atomic rotation', 'SQL: the table and the atomic claim', 'Express refresh endpoint'],
    viz: {
      title: 'Refresh rotation: a reused token is rejected',
      input: 'refresh refresh replay:1 refresh',
      inputLabel: 'Actions: refresh (real client) or replay:N (thief replays token N). Max 8.',
      gen: function (input) {
        var acts = String(input || '').trim().split(/\s+/).filter(function (x) { return x; });
        if (!acts.length || acts.length > 8) throw new Error('Give 1-8 actions, e.g.: refresh refresh replay:1 refresh');
        var toks = [{ st: 'active' }], dead = false, frames = [];
        var render = function (hlmap) {
          var rows = toks.map(function (t, i) {
            var color = t.st === 'active' ? '<span class="c-g">active</span>' : t.st === 'used' ? '<span class="c-m">used (burned)</span>' : '<span class="c-r">revoked</span>';
            return ['R' + (i + 1), color, 'family A'];
          });
          return { type: 'table', label: 'refresh_tokens table', columns: ['token', 'status', 'family'], rows: rows, hl: hlmap || {} };
        };
        var i, a, n, last;
        frames.push({ narr: 'Login. The server issues refresh token <b>R1</b> (family A) and stores only its hash. Status: active.', parts: [render({ 0: 'ok' })] });
        for (i = 0; i < acts.length; i++) {
          a = acts[i].toLowerCase();
          if (a === 'refresh') {
            if (dead) {
              frames.push({ narr: 'Action ' + (i + 1) + ': the real client tries to refresh, but family A is revoked. <span class="c-r">Rejected</span>. The user must log in again (annoying, but safe).', parts: [render({ 0: 'bad' }), { type: 'text', html: 'Response: <b>401 session_revoked</b>' }] });
              continue;
            }
            last = -1;
            toks.forEach(function (t, k) { if (t.st === 'active') last = k; });
            toks[last].st = 'used';
            toks.push({ st: 'active' });
            frames.push({ narr: 'Action ' + (i + 1) + ': the client presents <b>R' + (last + 1) + '</b>. The server burns it (used) and returns the successor <b>R' + toks.length + '</b> plus a new access token.', parts: [render((function () { var o = {}; o[last] = 'done'; o[toks.length - 1] = 'ok'; return o; })())] });
          } else if (a.indexOf('replay:') === 0) {
            n = parseInt(a.slice(7), 10);
            if (isNaN(n) || n < 1 || n > toks.length) throw new Error('replay:N needs N between 1 and the number of tokens issued so far (' + toks.length + ' at step ' + (i + 1) + ')');
            if (dead) {
              frames.push({ narr: 'Action ' + (i + 1) + ': the attacker replays R' + n + ' but the whole family is already revoked. <span class="c-r">Rejected</span>.', parts: [render((function () { var o = {}; o[n - 1] = 'bad'; return o; })())] });
            } else if (toks[n - 1].st === 'used') {
              dead = true;
              toks.forEach(function (t) { t.st = 'revoked'; });
              frames.push({ narr: 'Action ' + (i + 1) + ': <span class="c-r">REUSE DETECTED.</span> R' + n + ' was already burned, yet someone presents it again. Either the thief or the real client holds a stale copy. The server cannot tell which, so it <b>revokes every token in family A</b>.', parts: [render((function () { var o = {}; toks.forEach(function (t, k) { o[k] = 'bad'; }); return o; })()), { type: 'text', html: 'Response: <b>401</b>. Audit log: <code>refresh_token_reuse user=42 family=A</code>. Alert security.' }] });
            } else {
              last = n - 1;
              toks[last].st = 'used';
              toks.push({ st: 'active' });
              frames.push({ narr: 'Action ' + (i + 1) + ': R' + n + ' is the current valid token, so this replay simply <i>works</i> (the thief got there first with a fresh copy). Rotation cannot see this; the real client\'s next refresh will present a burned token and trigger detection.', parts: [render((function () { var o = {}; o[last] = 'done'; o[toks.length - 1] = 'cur'; return o; })())] });
            }
          } else {
            throw new Error('Unknown action "' + acts[i] + '". Use: refresh   or   replay:N');
          }
        }
        frames.push({ narr: dead ? 'Final state: every token in the family is dead. The user logs in again with password + MFA, which starts a <b>new family</b>.' : 'Final state. Only the newest token is active; older ones are burned, so a stolen copy of an old token is a trap for the thief.', parts: [render(dead ? { 0: 'bad' } : {})] });
        return frames;
      }
    },
    examples: [
      {
        title: 'Why hash refresh tokens in the database', html: `<p>If an attacker reads the table (SQL injection, backup leak) and tokens are stored raw, they can use them immediately. If you store <code>SHA-256(token)</code>, they only get hashes that cannot be replayed.</p>
        <p>Unlike passwords you do <b>not</b> need bcrypt here: the token is 256 random bits, so brute force is impossible, and a fast hash keeps lookup by hash cheap and indexable.</p>`
      },
      {
        title: 'Two browser tabs refresh at once', html: `<p>Tab A and Tab B both see an expired access token and send <code>R5</code> within 50 ms. Without care: A wins, B presents a burned token → "theft" → user logged out for no reason.</p>
        ${H.table(['Fix', 'Idea'], [['Single-flight in the client', 'one tab (or a shared worker / BroadcastChannel lock) performs the refresh; others wait for its result'], ['Server grace window', 'for ~10 s after rotation, re-presenting R5 returns the same successor R6 instead of alarming'], ['Atomic CAS', 'the DB UPDATE ... WHERE used_at IS NULL makes sure exactly one request rotates']])}`
      },
      {
        title: 'Absolute + idle lifetime', html: `<p>Policy: idle 14 days, absolute 90 days.</p>
        ${H.table(['Day', 'Event', 'Result'], [['0', 'login', 'family created, expires_abs = day 90'], ['10', 'app opened → refresh', 'ok, idle timer reset'], ['40', 'app opened (30 idle days)', '<span class="c-r">idle expired → login</span>'], ['90', 'regular user still refreshing', '<span class="c-r">absolute cap → login</span> (forces re-authentication, picks up changed roles/passwords)']])}`
      },
      {
        title: 'What to do when reuse is detected', html: `<ol><li>Revoke the family (all refresh tokens from this login) and optionally all sessions for the user if risk is high.</li><li>Return a generic 401; do not reveal the reason to the caller.</li><li>Write an audit event with user id, family id, IP, user-agent, geo.</li><li>Notify the user ("new sign-in attempt from ...") and require MFA at the next login.</li><li>Feed the event into anomaly detection (many reuses from one IP = credential-stuffing or token theft campaign).</li></ol>`
      }
    ],
    deepDive: `<p>🟣 <b>Why rotation works, and its limits.</b> Rotation turns a silent theft into a race: whoever uses the token second reveals the compromise. It cannot protect you if the thief uses the stolen token <i>and the real client never comes back</i> (the thief just keeps rotating). That is why you also want an absolute lifetime, device/IP anomaly checks, and ideally <b>sender-constrained tokens</b>: DPoP (the client signs each request with a private key that never leaves the device; a stolen token is useless without it) or mTLS-bound tokens.</p>
      <p><b>Atomicity is everything.</b> "Read row, check used flag, write used flag" as three steps has a race window; two concurrent requests can both pass the check. Use a single conditional UPDATE (<code>WHERE used_at IS NULL</code>) or a Redis Lua script / <code>SET NX</code>, and branch on the affected-row count. In SQL under READ COMMITTED the conditional UPDATE is enough; do not rely on SELECT then UPDATE.</p>
      <p><b>Grace window design.</b> Store <code>rotated_at</code> and <code>successor_hash</code>. If a burned token is presented within N seconds <i>from the same client fingerprint</i>, return the existing successor (idempotent). After N seconds, treat as theft. Keep N tiny; every second of grace is a second a thief can exploit.</p>
      <p><b>Scale.</b> Refresh traffic is a tiny fraction of API traffic (one per 15 minutes per active user), so a relational table or Redis hash is plenty; index on <code>token_hash</code> and <code>family_id</code>; purge expired rows with a scheduled job. Do not put the refresh token in a URL query string (it lands in logs and Referer headers).</p>
      <p><b>OAuth 2.1 and BCP guidance.</b> For public clients (SPAs, mobile), refresh tokens must be either sender-constrained or rotated with reuse detection; the browser-based-apps BCP recommends a BFF so refresh tokens never reach JavaScript at all.</p>`,
    aiEra: `<p><b>What AI changes:</b> long-running AI agents (research agents, coding agents, workflow automations) need credentials that last for hours or days. Resist the temptation to give them a long-lived personal token. Give each agent its own client identity, <b>narrow scopes</b>, rotating refresh tokens, and a way to be revoked individually from an admin screen.</p>
      <p><b>Use AI as a partner:</b> <code>Write a concurrency test that fires 20 simultaneous refreshes with the same token and asserts exactly one succeeds</code>, or <code>Given this refresh endpoint, list race conditions and token-leak paths (logs, URLs, error messages)</code>.</p>
      <p><b>Where AI goes wrong:</b> it often implements "rotation" without storing the old token (so reuse cannot be detected), checks <code>used</code> and sets it in separate statements (race), stores the raw token, or puts refresh tokens in localStorage "for simplicity".</p>
      <p><b>What you must still own:</b> the lifetime policy, the grace-window decision, the incident playbook, and verifying the atomicity with a real concurrent test, not by reading the code.</p>`,
    problems: [
      {
        title: 'Implement Refresh Token Rotation with Reuse Detection', level: 'Hard', tags: ['refresh token', 'rotation', 'concurrency', 'security'], companies: ['Okta', 'Auth0', 'Shopify'],
        statement: `<p>Implement <code>login(user)</code> and <code>rotate(token)</code>. Rotation returns a new token in the same family and burns the old. If a burned token is presented, revoke the whole family and fail. The implementation must be safe when two threads rotate the same token at the same moment, and must never store raw tokens.</p>`,
        constraints: `Tokens are 256-bit random. Up to 10<sup>6</sup> active tokens. Rotation p99 under 10 ms with a single store round trip.`,
        example: `<p>R1 → rotate → R2 (ok). Present R1 again → ${H.c('r', 'reuse detected, family revoked')}. Present R2 → ${H.c('r', 'family revoked')}. Two threads present R2 simultaneously → ${H.c('g', 'exactly one gets R3')}, the other triggers revocation (or a grace-window replay).</p>`,
        brute: { why: `<p>Keep one long-lived refresh token and never rotate: a stolen copy is valid for weeks and invisible. A half-fix rotates but checks the flag with a plain <code>if (!row.used) { row.used = true; ... }</code>, which has a race: both threads pass the check and each creates a successor, so the family forks.</p>`, code: { lang: 'java', check: false, code: `// BROKEN: check-then-act race\nif (!row.used) {      // thread A and B both read false\n    row.used = true;   // both write true\n    return issue(...); // both issue a successor -> two valid branches\n}` } },
        mcq: { q: 'Which primitive makes "mark as used" safe under concurrency?', options: ['A synchronized getter plus a separate setter', 'An atomic compare-and-set (or conditional UPDATE ... WHERE used_at IS NULL) checked via its result', 'Sleeping for 50 ms before writing', 'Checking the flag twice'], answer: 1, explain: 'Only one caller can flip the flag from false to true; the loser sees "false" from CAS and knows the token was already used.' },
        hints: [`<p>Aha: the family id ties tokens together, so revoking one family cancels every descendant of one login without touching other devices.</p>`, `<p>Store a map <code>sha256(token) → Row(user, family, used flag)</code> plus a set of dead families; the row flag must be flipped by an atomic operation.</p>`, `<p>Order of checks: unknown → family dead → expired → CAS(used) fails ⇒ revoke family, else issue successor in same family.</p>`],
        solution: {
          approach: `<p><b>Data:</b> <code>byHash: sha256(token) → Row{user, family, expiresAt, AtomicBoolean used}</code>, <code>deadFamilies</code> set. Tokens are 32 bytes from SecureRandom, base64url encoded. Only hashes are stored.</p>
          <p><b>login:</b> generate a new family id (UUID), issue the first token. <b>rotate:</b> hash the presented token; unknown → reject; family dead → reject; expired → reject; <code>used.compareAndSet(false, true)</code> returns false ⇒ the token was used before ⇒ add the family to <code>deadFamilies</code> and reject (theft signal); otherwise issue a successor with the same family id and return it.</p>
          <p>The CAS is the heart: with N concurrent callers holding the same token, exactly one returns true. In a database, the same effect comes from a single <code>UPDATE ... WHERE token_hash=? AND used_at IS NULL</code> and checking affected rows. For multi-node deployments put the state in Redis/SQL, not process memory.</p>`,
          code: `import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;

class RotatingRefreshStore {
    private static final class Row {
        final String user, family;
        final AtomicBoolean used = new AtomicBoolean(false);
        Row(String user, String family) { this.user = user; this.family = family; }
    }
    private final Map<String, Row> rows = new ConcurrentHashMap<>();
    private final Set<String> dead = ConcurrentHashMap.newKeySet();
    private final SecureRandom rng = new SecureRandom();

    private static String h(String t) throws Exception {
        byte[] d = MessageDigest.getInstance("SHA-256").digest(t.getBytes(StandardCharsets.UTF_8));
        return Base64.getEncoder().encodeToString(d);
    }
    private String issue(String user, String family) throws Exception {
        byte[] b = new byte[32];
        rng.nextBytes(b);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(b);
        rows.put(h(token), new Row(user, family));
        return token;
    }
    String login(String user) throws Exception { return issue(user, UUID.randomUUID().toString()); }

    String rotate(String token) throws Exception {
        Row r = rows.get(h(token));
        if (r == null) throw new SecurityException("unknown token");
        if (dead.contains(r.family)) throw new SecurityException("family revoked");
        if (!r.used.compareAndSet(false, true)) {   // atomic: exactly one winner
            dead.add(r.family);
            throw new SecurityException("reuse detected");
        }
        return issue(r.user, r.family);
    }
}`,
          alt: [{ lang: 'python', run: true, code: `import hashlib, secrets, threading\n\nclass Store:\n    def __init__(self):\n        self.rows, self.dead, self.lock = {}, set(), threading.Lock()\n    def _h(self, t): return hashlib.sha256(t.encode()).hexdigest()\n    def _issue(self, user, fam):\n        t = secrets.token_urlsafe(32)\n        self.rows[self._h(t)] = {"user": user, "fam": fam, "used": False}\n        return t\n    def login(self, user): return self._issue(user, secrets.token_hex(4))\n    def rotate(self, t):\n        with self.lock:                      # the lock plays the role of Java's compareAndSet\n            r = self.rows.get(self._h(t))\n            if r is None: raise PermissionError("unknown token")\n            if r["fam"] in self.dead: raise PermissionError("family revoked")\n            if r["used"]:\n                self.dead.add(r["fam"]); raise PermissionError("reuse detected")\n            r["used"] = True\n            return self._issue(r["user"], r["fam"])\n\ns = Store(); r1 = s.login("u1"); r2 = s.rotate(r1)\ntry: s.rotate(r1)\nexcept PermissionError as e: print(e)\ntry: s.rotate(r2)\nexcept PermissionError as e: print(e)\n` }],
          dry: { head: ['Call', 'Row state before', 'Result'], rows: [['rotate(R1)', 'R1.used=false', 'CAS wins → issue R2 (same family)'], ['rotate(R1) again', 'R1.used=true', '<span class="c-r">CAS fails → family dead, reject</span>'], ['rotate(R2)', 'family dead', '<span class="c-r">reject → re-login</span>']] },
          complexity: `<p>O(1) per call: one hash, one map lookup, one CAS. Memory O(active tokens), cleaned by an expiry job.</p>`,
          followUps: ['Add a 10-second grace window without weakening theft detection.', 'How would you shard this across 10 app servers?']
        }
      }
    ]
  });

  /* =====================================================================
     TOPIC 5 — OAuth 2.0 flows
     ===================================================================== */
  // Shared helper: build a "sequence diagram" as a graph frame. Steps up to k are drawn; step k is highlighted.
  function flowPart(nodes, steps, k, nodeHl, tags, finalCls) {
    var edges = [], ehl = {}, seen = {}, j, s, key;
    for (j = 0; j <= k && j < steps.length; j++) {
      s = steps[j];
      key = s.f + '-' + s.t;
      if (seen[key] !== undefined) edges[seen[key]] = [s.f, s.t, s.label];   // same pair twice: keep the newest label
      else { seen[key] = edges.length; edges.push([s.f, s.t, s.label]); }
      ehl[key] = j === k ? (s.cls || 'cur') : 'done';
    }
    return { type: 'graph', directed: true, height: 74, nodes: nodes, edges: edges, ehl: ehl, hl: nodeHl || {}, tags: tags || {} };
  }

  topics.push({
    title: 'OAuth 2.0: Authorization Code + PKCE, Client Credentials & Friends',
    analogy: `<p>OAuth is a <b>valet key</b>. When you hand your car to a valet you do not give the master key that opens the trunk and the glovebox. You give a limited key: it starts the engine, works for one evening, and can be cancelled. OAuth lets an app (the valet) act in your account (the car) with limited, revocable access, and <b>without ever seeing your password</b>.</p>
      <p><b>PKCE</b> (say "pixy") is the claim-ticket trick: before you leave for the front desk you write a secret word, seal it in an envelope and give the desk only a <i>fingerprint</i> of it. When you come back with the claim ticket, you must also show the secret word. A pickpocket who stole only the ticket cannot.</p>`,
    explain: `<p>🟢 <b>Problem:</b> "PhotoPrint" wants to read your photos in "CloudDrive". You do not want to give PhotoPrint your CloudDrive password. <b>OAuth 2.0</b> is the standard way to give <i>delegated, limited access</i>.</p>
      <p><b>The four roles:</b></p>
      ${H.table(['Role', 'Who', 'Example'], [
        ['Resource owner', 'the user who owns the data', 'you'],
        ['Client', 'the app that wants access', 'PhotoPrint (web app, mobile app, backend job)'],
        ['Authorization server (AS)', 'logs the user in, asks consent, issues tokens', 'CloudDrive login (Auth0, Keycloak, Okta, Google...)'],
        ['Resource server (RS)', 'the API that holds the data and checks access tokens', 'CloudDrive Photos API']
      ])}
      <p><b>Which flow (grant type) when?</b></p>
      ${H.table(['Flow', 'Use for', 'Status'], [
        ['<b>Authorization Code + PKCE</b>', 'anything with a user: web apps, SPAs, mobile and desktop apps', '<span class="c-g">the default for users</span>'],
        ['<b>Client Credentials</b>', 'machine-to-machine: a backend job calling another API, no user involved', '<span class="c-g">standard for services</span>'],
        ['Device Code', 'TVs, CLIs, devices without a good browser ("go to example.com/activate and type ABCD-1234")', 'good'],
        ['Refresh Token', 'get a new access token without asking the user again', 'good (rotate it!)'],
        ['Implicit (token in URL fragment)', 'old SPAs', '<span class="c-r">deprecated, do not use</span>'],
        ['Resource Owner Password (give the app the password)', 'legacy', '<span class="c-r">deprecated, do not use</span>']
      ])}
      <p><b>Authorization Code + PKCE in 8 steps</b> (watch the diagram below):</p>
      <ol>
        <li>The client creates a random <code>code_verifier</code> and its hash <code>code_challenge = BASE64URL(SHA256(verifier))</code>, plus a random <code>state</code>.</li>
        <li>It sends the browser to the AS: <code>/authorize?response_type=code&amp;client_id=...&amp;redirect_uri=...&amp;scope=...&amp;state=...&amp;code_challenge=...&amp;code_challenge_method=S256</code>.</li>
        <li>The user logs in at the AS (the client never sees the password) and approves the scopes.</li>
        <li>The AS redirects the browser back: <code>redirect_uri?code=ONE_TIME_CODE&amp;state=...</code>. The client checks <code>state</code> matches.</li>
        <li>The client calls <code>POST /token</code> directly (back channel) with <code>code</code> and the original <code>code_verifier</code>.</li>
        <li>The AS hashes the verifier; if it equals the stored challenge, it returns the tokens. The code is single-use and lives about 60 seconds.</li>
        <li>The client calls the API with <code>Authorization: Bearer ACCESS_TOKEN</code>.</li>
        <li>The API validates the token (signature/introspection, <code>aud</code>, <code>scope</code>) and answers.</li>
      </ol>
      <p><b>Why PKCE matters:</b> the code travels through the browser (URL), where malware, a malicious app registered for the same custom scheme, or a leaked log could grab it. Without the <code>code_verifier</code> the stolen code is worthless. PKCE is now required for <i>all</i> clients (even confidential ones) in OAuth 2.1.</p>
      <p><b>Safety checklist:</b> exact-match registered <code>redirect_uri</code> (no wildcards), validate <code>state</code> (blocks login CSRF), use S256 (never plain), short single-use codes, request the minimum <code>scope</code>, and never put tokens in URLs.</p>`,
    clues: [
      '"Sign in with Google / let a third-party app access my data" → OAuth2 authorization code flow',
      '"SPA or mobile app login" → authorization code + PKCE (no client secret can be kept in a public client)',
      '"Service A calls service B, no user" → client credentials',
      '"Smart TV / CLI login" → device authorization grant',
      '"Why not implicit flow?" → token in the URL fragment leaks to history/logs and is not sender-bound; replaced by code + PKCE',
      '"What does state do?" → CSRF protection for the redirect; "what does PKCE do?" → binds the code to the client that started the flow',
      '"OAuth is authentication?" → no, it is authorization (delegation); OpenID Connect adds authentication (next topic)'
    ],
    code: [
      {
        lang: 'python', run: true, title: 'PKCE (S256) + a toy authorization server that checks it', code: `import base64, hashlib, secrets

def b64url(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()

def challenge_for(verifier: str) -> str:
    return b64url(hashlib.sha256(verifier.encode("ascii")).digest())

# --- Official test vector from RFC 7636 appendix B: proves our S256 maths is right ---
assert challenge_for("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk") == "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
print("RFC 7636 test vector: OK")

class ToyAuthServer:
    """Just enough of an authorization server to see why PKCE stops code theft."""
    REGISTERED = {"photoprint": "https://photoprint.example.test/callback"}   # exact-match redirect URIs

    def __init__(self):
        self.codes = {}

    def authorize(self, client_id, redirect_uri, challenge, state):
        if self.REGISTERED.get(client_id) != redirect_uri:      # exact string match, no wildcards
            raise ValueError("invalid redirect_uri")
        code = secrets.token_urlsafe(16)
        self.codes[code] = {"client": client_id, "challenge": challenge}
        return redirect_uri + "?code=" + code + "&state=" + state   # what the browser is redirected to

    def token(self, client_id, code, verifier):
        entry = self.codes.pop(code, None)                      # pop = single use
        if entry is None or entry["client"] != client_id:
            raise ValueError("invalid_grant: unknown or already used code")
        if challenge_for(verifier) != entry["challenge"]:       # the PKCE check
            raise ValueError("invalid_grant: code_verifier does not match")
        return {"access_token": "AT-demo-not-real", "token_type": "Bearer", "expires_in": 900}

server = ToyAuthServer()

def login_attempt(label, attacker_steals_code):
    verifier = b64url(secrets.token_bytes(32))                  # 43 random chars, kept ONLY in the client
    state = secrets.token_hex(8)
    url = server.authorize("photoprint", "https://photoprint.example.test/callback", challenge_for(verifier), state)
    code = url.split("code=")[1].split("&")[0]
    who, used_verifier = ("attacker", "guess-guess-guess") if attacker_steals_code else ("real client", verifier)
    try:
        print(label, "->", who, "exchanges code:", server.token("photoprint", code, used_verifier)["token_type"], "token issued")
    except ValueError as e:
        print(label, "->", who, "exchanges code: REJECTED (" + str(e) + ")")

login_attempt("normal login   ", attacker_steals_code=False)
login_attempt("stolen code    ", attacker_steals_code=True)
`
      },
      {
        lang: 'java', title: 'Plain Java: generate code_verifier, code_challenge and state', code: `import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

public class Pkce {
    private static final SecureRandom RNG = new SecureRandom();
    private static final Base64.Encoder B64URL = Base64.getUrlEncoder().withoutPadding();

    /** 32 random bytes -> 43 URL-safe characters (RFC 7636 allows 43-128). */
    static String newVerifier() {
        byte[] b = new byte[32];
        RNG.nextBytes(b);
        return B64URL.encodeToString(b);
    }

    /** code_challenge = BASE64URL( SHA-256( ASCII(code_verifier) ) )  - the "S256" method. */
    static String challenge(String verifier) throws Exception {
        byte[] digest = MessageDigest.getInstance("SHA-256").digest(verifier.getBytes(StandardCharsets.US_ASCII));
        return B64URL.encodeToString(digest);
    }

    public static void main(String[] args) throws Exception {
        // RFC 7636 appendix B test vector
        String v = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
        System.out.println(challenge(v).equals("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"));   // true

        String verifier = newVerifier();                 // keep in server-side session / memory, never in the URL
        String state = newVerifier();                    // random anti-CSRF value, also kept to compare on return
        String url = "https://auth.example.test/authorize?response_type=code"
                + "&client_id=photoprint"
                + "&redirect_uri=https%3A%2F%2Fphotoprint.example.test%2Fcallback"
                + "&scope=photos.read"
                + "&state=" + state
                + "&code_challenge=" + challenge(verifier)
                + "&code_challenge_method=S256";
        System.out.println(url);
    }
}`
      },
      {
        lang: 'http', title: 'The two HTTP requests that matter (values are fake)', code: `# 1) Browser is redirected to the authorization endpoint (front channel)
GET /authorize?response_type=code&client_id=photoprint
    &redirect_uri=https%3A%2F%2Fphotoprint.example.test%2Fcallback
    &scope=photos.read%20offline_access
    &state=xyz-random-1
    &code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM
    &code_challenge_method=S256
Host: auth.example.test

# 2) After login + consent the browser lands here (front channel)
GET /callback?code=DEMO-ONE-TIME-CODE&state=xyz-random-1
Host: photoprint.example.test

# 3) The client's BACKEND exchanges the code (back channel, direct TLS call)
POST /token
Host: auth.example.test
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&code=DEMO-ONE-TIME-CODE
&redirect_uri=https%3A%2F%2Fphotoprint.example.test%2Fcallback
&client_id=photoprint&code_verifier=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk

# 4) Response
{"access_token":"AT-demo-not-real","token_type":"Bearer","expires_in":900,"refresh_token":"RT-demo-not-real","scope":"photos.read"}`
      },
      {
        lang: 'bash', title: 'Client credentials: service-to-service token (curl, fake values)', code: `# The service authenticates AS ITSELF. No user, no browser, no redirect.
curl -s -X POST https://auth.example.test/oauth/token \\
  -u "billing-service:\${BILLING_CLIENT_SECRET}" \\
  -d "grant_type=client_credentials" \\
  -d "scope=invoices.write"

# {"access_token":"AT-demo-not-real","token_type":"Bearer","expires_in":600,"scope":"invoices.write"}
# Cache the token until just before expires_in, then fetch a new one. Do NOT request a token per call.
# The secret comes from a secrets manager / environment variable, never from source control.`
      },
      {
        lang: 'java', check: false, title: 'Spring Security: OAuth2 login (auth code + PKCE) and client credentials WebClient', code: `# application.yml
spring:
  security:
    oauth2:
      client:
        registration:
          photoprint-login:
            provider: demo-idp
            client-id: photoprint
            client-secret: \${PHOTOPRINT_CLIENT_SECRET}      # from environment / secrets manager
            authorization-grant-type: authorization_code
            scope: openid, profile, photos.read
            redirect-uri: "{baseUrl}/login/oauth2/code/{registrationId}"
          billing-service:
            provider: demo-idp
            client-id: billing-service
            client-secret: \${BILLING_CLIENT_SECRET}
            authorization-grant-type: client_credentials
            scope: invoices.write
        provider:
          demo-idp:
            issuer-uri: https://auth.example.test

// SecurityConfig.java : Spring adds state + PKCE (public clients) for you
http.oauth2Login(Customizer.withDefaults());

// Service-to-service call with automatic client_credentials token caching/refresh
@Bean WebClient billingClient(OAuth2AuthorizedClientManager manager) {
    var oauth = new ServletOAuth2AuthorizedClientExchangeFilterFunction(manager);
    oauth.setDefaultClientRegistrationId("billing-service");
    return WebClient.builder().baseUrl("https://billing.example.test").apply(oauth.oauth2Configuration()).build();
}`
      }
    ],
    codeTitle: ['Python: PKCE + toy auth server (runnable)', 'Java: verifier / challenge / state', 'The HTTP messages', 'Client credentials (curl)', 'Spring Security config'],
    viz: [
      {
        title: 'OAuth2 Authorization Code + PKCE, step by step',
        input: 'normal',
        inputLabel: 'Type normal (happy path) or attack (someone steals the code)',
        gen: function (input) {
          var mode = String(input || 'normal').trim().toLowerCase();
          if (mode !== 'normal' && mode !== 'attack') throw new Error('Type either: normal   or   attack');
          var nodes = [
            { id: 'C', label: 'Client app (PhotoPrint)', x: 20, y: 58, shape: 'box', w: 24 },
            { id: 'B', label: 'Browser (user)', x: 20, y: 14, shape: 'box', w: 18 },
            { id: 'AS', label: 'Auth server', x: 80, y: 14, shape: 'box', w: 16 },
            { id: 'API', label: 'Photos API', x: 80, y: 58, shape: 'box', w: 14 }
          ];
          var steps = [
            { f: 'C', t: 'B', label: '1 make verifier+challenge, send user away', narr: '<b>Step 1.</b> The client makes a secret <code>code_verifier</code> (kept private) and its fingerprint <code>code_challenge = SHA256(verifier)</code>, plus a random <code>state</code>. Then it redirects the user\'s browser to the auth server.', tags: { C: 'verifier=V (secret)' } },
            { f: 'B', t: 'AS', label: '2 /authorize + challenge + state', narr: '<b>Step 2.</b> The browser opens <code>/authorize?client_id&amp;redirect_uri&amp;scope&amp;state&amp;code_challenge=...&amp;code_challenge_method=S256</code>. The auth server remembers the challenge, not the verifier.', tags: { C: 'verifier=V (secret)', AS: 'stores challenge' } },
            { f: 'AS', t: 'B', label: '3 login + consent, 302 to redirect_uri?code', narr: '<b>Step 3.</b> The user logs in <i>at the auth server</i> (the client never sees the password) and approves the scopes. The server redirects the browser to <code>redirect_uri?code=CODE&amp;state=...</code>. The code is single-use, lives about 60 seconds, and is useless alone.', tags: { C: 'verifier=V (secret)', AS: 'stores challenge' } },
            { f: 'B', t: 'C', label: '4 callback ?code & state', narr: '<b>Step 4.</b> The browser delivers <code>code</code> and <code>state</code> to the client\'s callback URL. The client first checks that <code>state</code> equals the one it sent (blocks login-CSRF).', tags: { C: 'state matches', AS: 'stores challenge' } }
          ];
          if (mode === 'normal') {
            steps.push({ f: 'C', t: 'AS', label: '5 POST /token code + verifier', narr: '<b>Step 5.</b> The client calls <code>POST /token</code> directly with the <code>code</code> <b>and the original code_verifier V</b>. This is a back-channel call (server to server), not through the browser.', tags: { C: 'sends code + V', AS: 'checks SHA256(V) == challenge' } });
            steps.push({ f: 'AS', t: 'C', label: '6 access (+refresh) token', cls: 'ok', narr: '<b>Step 6.</b> The auth server hashes V, gets the stored challenge: <span class="c-g">match</span>. It burns the code and returns the access token (and maybe a refresh token).', tags: { C: 'has access token', AS: 'SHA256(V) matches' } });
            steps.push({ f: 'C', t: 'API', label: '7 GET /photos Bearer token', narr: '<b>Step 7.</b> The client calls the API with <code>Authorization: Bearer ACCESS_TOKEN</code>. The user\'s password was never shared.', tags: { C: 'has access token', API: 'receives token' } });
            steps.push({ f: 'API', t: 'C', label: '8 200 photos', cls: 'ok', narr: '<b>Step 8.</b> The API validates the token (signature or introspection, <code>exp</code>, <code>aud</code>, <code>scope=photos.read</code>) and returns the data. Done.', tags: { C: 'photos loaded', API: 'token valid, scope ok' } });
          } else {
            nodes.push({ id: 'X', label: 'Attacker app', x: 50, y: 36, shape: 'box', w: 14 });
            steps.push({ f: 'B', t: 'X', label: '4b code leaks (log, malware)', cls: 'bad', narr: '<span class="c-r"><b>Attack.</b></span> A malicious app or a leaked log captures the <code>code</code> from the redirect URL. This is exactly the weakness PKCE closes.', tags: { C: 'verifier=V (secret)', X: 'has CODE only' } });
            steps.push({ f: 'X', t: 'AS', label: '5 POST /token code + wrong verifier', cls: 'bad', narr: 'The attacker races to call <code>/token</code> with the stolen code. They never saw the verifier V (it never left the client), so they must guess one.', tags: { X: 'guesses a verifier', AS: 'checks SHA256(guess)' } });
            steps.push({ f: 'AS', t: 'X', label: '6 400 invalid_grant', cls: 'bad', narr: '<b>Rejected.</b> <code>SHA256(guess) != stored challenge</code>, so no token is issued, and the code is burned. Even if the attacker had won the race against the real client, they would still need V.', tags: { X: 'no token', AS: 'mismatch' } });
            steps.push({ f: 'C', t: 'AS', label: '5 (real) POST /token code + V', cls: 'ok', narr: 'The real client then proceeds as in the happy path with the real verifier. Lesson: <b>the code alone is not enough</b>. That is PKCE\'s whole job.', tags: { C: 'real V only here', AS: 'ok if code still valid' } });
          }
          var frames = [], k;
          for (k = 0; k < steps.length; k++) {
            frames.push({ narr: steps[k].narr, parts: [flowPart(nodes, steps, k, (function () { var o = {}; o[steps[k].f] = 'cur'; o[steps[k].t] = steps[k].cls === 'bad' ? 'bad' : 'sel'; return o; })(), steps[k].tags, steps[k].cls)] });
          }
          return frames;
        }
      },
      {
        title: 'Client credentials: a service gets its own token',
        input: 'invoices.write',
        inputLabel: 'Scope the billing service asks for (try invoices.write or admin.all)',
        gen: function (input) {
          var scope = String(input || '').trim();
          if (!/^[a-z.]+$/.test(scope)) throw new Error('Use letters and dots only, e.g. invoices.write');
          var allowed = scope === 'invoices.write' || scope === 'invoices.read';
          var nodes = [
            { id: 'S', label: 'Billing service', x: 16, y: 30, shape: 'box', w: 20 },
            { id: 'AS', label: 'Auth server', x: 52, y: 12, shape: 'box', w: 16 },
            { id: 'API', label: 'Invoices API', x: 84, y: 48, shape: 'box', w: 18 }
          ];
          var steps = [
            { f: 'S', t: 'AS', label: '1 POST /token client_id+secret, scope', narr: '<b>Step 1.</b> No user and no browser. The billing service proves who <i>it</i> is with its client id and secret (read from a secrets manager, never the repo) and asks for scope <code>' + H.esc(scope) + '</code>.' },
            { f: 'AS', t: 'S', label: allowed ? '2 access_token (10 min)' : '2 400 invalid_scope', cls: allowed ? 'ok' : 'bad', narr: allowed ? '<b>Step 2.</b> The auth server checks that this client is <i>registered</i> for that scope and returns a short-lived access token. No refresh token is issued; the service just asks again when needed.' : '<b>Step 2.</b> <span class="c-r">Rejected.</span> This client is not allowed <code>' + H.esc(scope) + '</code>. Scopes are an allow-list per client: least privilege.' }
          ];
          if (allowed) {
            steps.push({ f: 'S', t: 'API', label: '3 Bearer token', narr: '<b>Step 3.</b> The service calls the API with the token. It should <b>cache</b> the token until shortly before it expires (do not fetch a new one per call).' });
            steps.push({ f: 'API', t: 'S', label: '4 200 OK', cls: 'ok', narr: '<b>Step 4.</b> The API checks signature, <code>exp</code>, <code>aud=invoices-api</code>, and that <code>scope</code> contains <code>invoices.write</code>. Allowed.' });
          } else {
            steps.push({ f: 'S', t: 'API', label: '3 call without token', cls: 'bad', narr: '<b>Step 3.</b> Without a token the call has nothing to show.' });
            steps.push({ f: 'API', t: 'S', label: '4 401 Unauthorized', cls: 'bad', narr: '<b>Step 4.</b> <span class="c-r">401</span>. The design held: a service can only do what its registered scopes allow.' });
          }
          var frames = [], k;
          for (k = 0; k < steps.length; k++) {
            frames.push({ narr: steps[k].narr, parts: [flowPart(nodes, steps, k, (function () { var o = {}; o[steps[k].f] = 'cur'; o[steps[k].t] = steps[k].cls === 'bad' ? 'bad' : 'sel'; return o; })(), {}, steps[k].cls)] });
          }
          return frames;
        }
      }
    ],
    examples: [
      {
        title: 'What each parameter defends against', html: `${H.table(['Parameter', 'Attack it stops'], [
          ['<code>state</code> (random, checked on return)', 'login CSRF: attacker makes you finish THEIR login, attaching their account to your session'],
          ['<code>redirect_uri</code> exact match', 'code/token sent to an attacker-controlled URL (open redirect)'],
          ['<code>code_challenge</code> / <code>code_verifier</code> (PKCE)', 'authorization code interception and injection'],
          ['single-use, 60 s <code>code</code>', 'replay of a leaked code'],
          ['<code>scope</code> + consent', 'over-broad access; the user sees what is requested'],
          ['<code>aud</code> in the access token', 'a token for API A being accepted by API B']
        ])}`
      },
      {
        title: 'Scopes: ask small, check always', html: `<p>Client asks for <code>photos.read</code>. The access token says <code>scope: photos.read</code>. The API endpoint <code>DELETE /photos/9</code> needs <code>photos.write</code>, so the API must answer <b>403 Forbidden</b> (authenticated but not allowed), even though the token is perfectly valid.</p>
        <p>Remember the difference: <b>401</b> = we do not know who you are / token invalid; <b>403</b> = we know you, but you may not do this.</p>`
      },
      {
        title: 'Device code flow (TV login)', html: `<ol><li>TV calls <code>POST /device_authorization</code> and shows: <b>"Go to example.test/activate and enter WDJB-MJHT"</b>.</li><li>You do that on your phone, log in, approve.</li><li>The TV polls <code>POST /token</code> every 5 s with the <code>device_code</code> until it gets tokens (or <code>authorization_pending</code> / <code>slow_down</code>).</li></ol><p>No keyboard needed on the TV, and the TV never sees your password.</p>`
      },
      {
        title: 'Opaque vs JWT access tokens and introspection', html: `<p>An access token is just "a string the API accepts". Two styles:</p>
        ${H.table(['Style', 'API validates by', 'Pros / cons'], [['JWT access token', 'verifying signature + claims locally (JWKS)', 'fast, no network; hard to revoke early'], ['Opaque (random) token', 'calling <code>POST /introspect</code> (RFC 7662) on the auth server (cache for seconds)', 'instantly revocable; one extra hop']])}
        <p>Clients must treat access tokens as opaque either way: never parse them in the app, only the API reads them.</p>`
      }
    ],
    deepDive: `<p>🟣 <b>OAuth 2.0 vs 2.1.</b> OAuth 2.1 (the consolidated draft) formalises today's best practice: authorization code only (PKCE mandatory), no implicit, no password grant, exact redirect URI matching, refresh tokens for public clients must be sender-constrained or rotated, no bearer tokens in query strings.</p>
      <p><b>Public vs confidential clients.</b> A confidential client (server-side web app) can hold a <code>client_secret</code> or, better, authenticate with <code>private_key_jwt</code> or mTLS. A public client (SPA, mobile, desktop) cannot keep secrets: anything in the app bundle is extractable. Their protection is PKCE + redirect URI binding (+ claimed HTTPS redirects / app links on mobile instead of custom schemes).</p>
      <p><b>Browser apps.</b> The IETF "OAuth for Browser-Based Apps" guidance prefers a <b>BFF</b>: the backend runs the code flow and keeps tokens; the SPA only has an HttpOnly session cookie. If the SPA must hold tokens, keep access tokens in memory, short-lived, and use rotation for refresh tokens.</p>
      <p><b>Other pieces worth naming.</b> <b>Token exchange</b> (RFC 8693: swap a user token for a narrower one for a downstream service, "on-behalf-of"). <b>Token revocation</b> (RFC 7009). <b>Pushed Authorization Requests</b> (PAR) and <b>JAR</b> put the authorize parameters in a back-channel call so they cannot be tampered with in the URL. <b>Rich Authorization Requests</b> (RAR) express fine-grained permissions ("transfer up to 100 EUR to this account"). <b>DPoP</b> / <b>mTLS-bound</b> tokens stop stolen-token replay. <b>FAPI</b> profiles combine these for banking.</p>
      <p><b>Mix-up and confusion attacks.</b> When a client talks to several auth servers, an attacker can trick it into sending a code to the wrong one. Defences: per-AS redirect URIs, the <code>iss</code> authorization-response parameter (RFC 9207). <b>Consent phishing</b>: attackers register innocent-looking apps asking for broad scopes; admins should restrict who can consent.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI agents and MCP-style tool servers are now OAuth clients: an assistant wants to read your calendar or open a pull request <i>on your behalf</i>. The same rules apply, with higher stakes: tiny scopes, short-lived tokens, explicit consent screens that name the action, per-agent client ids so a single agent can be revoked, and audit logs of every tool call. Beware <b>prompt injection</b>: a malicious document can try to convince an agent to use its token for something the user never intended, so enforce authorisation in the API, not in the prompt.</p>
      <p><b>Use AI as a partner:</b> <code>Draw a sequence diagram of authorization code + PKCE for a Next.js app with a Spring Boot API</code>, or <code>Review this redirect_uri validation and list bypasses (open redirect, subdomain wildcard, path confusion)</code>.</p>
      <p><b>Where AI goes wrong:</b> it still generates the implicit flow, <code>client_secret</code> inside a mobile app, <code>redirect_uri</code> with wildcards, missing <code>state</code>, tokens in <code>localStorage</code>, and mixes up OAuth (authorization) with login (OIDC). It also invents parameter names.</p>
      <p><b>What you must still own:</b> choosing the right grant, consent and scope design, token lifetimes, and testing the unhappy paths (wrong state, reused code, wrong verifier, wrong redirect).</p>`,
    problems: [
      {
        title: 'Walk Through the Authorization Code + PKCE Flow', level: 'Medium', tags: ['OAuth2', 'PKCE', 'security'], companies: ['Google', 'Okta', 'Microsoft'],
        statement: `<p>A single-page app and its backend want users to sign in via a third-party authorization server and then call an API. Walk through the full flow step by step, naming every parameter, which channel (front or back) each step uses, and what attack each protection prevents. Then explain what an attacker who steals the authorization code can and cannot do.</p>`,
        constraints: `Public client (no secret). Redirect URI is registered. Access tokens expire in 15 minutes.`,
        example: `<p>Client: ${H.c('b', 'verifier V, challenge = S256(V), state')}. Browser → AS (front channel). AS → browser → client (<code>code</code>, <code>state</code>). Client → AS back channel with ${H.c('g', 'code + V')} → tokens. Attacker with only the code → ${H.c('r', 'invalid_grant')}.</p>`,
        brute: { why: `<p>Use the implicit flow or the password grant: tokens appear in the URL (history, logs, Referer) or the app sees the user's password. Or run code flow without PKCE/state: a stolen code or a CSRF'd callback logs the attacker's account into the victim's session.</p>` },
        mcq: { q: 'An attacker steals the authorization code from the redirect. With PKCE (S256) in place, what happens when they call /token?', options: ['They get tokens because the code is valid', 'The request fails because they do not know the code_verifier', 'The auth server emails the user', 'It works only if the redirect_uri differs'], answer: 1, explain: 'The server compares SHA256(verifier) to the stored challenge; only the client that started the flow knows the verifier.' },
        hints: [`<p>Aha: two channels. The browser (front channel) can be spied on; the server-to-server call (back channel) is protected by TLS and by the secret verifier.</p>`, `<p>List parameters: <code>response_type</code>, <code>client_id</code>, <code>redirect_uri</code>, <code>scope</code>, <code>state</code>, <code>code_challenge</code>, <code>code_challenge_method</code>, then <code>grant_type</code>, <code>code</code>, <code>code_verifier</code>.</p>`, `<p>For each step ask "what could go wrong here?" and attach the defence: state (CSRF), exact redirect (open redirect), PKCE (code theft), single-use short code, scope (least privilege), <code>aud</code> (token confusion).</p>`],
        solution: {
          approach: `<p><b>1 Prepare (client):</b> create random <code>code_verifier</code> (43-128 chars), compute <code>code_challenge = BASE64URL(SHA256(verifier))</code>, create random <code>state</code>, store both in the client's temporary storage (server session, or sessionStorage for a pure SPA).</p>
          <p><b>2 Authorize request (front channel):</b> redirect the browser to <code>/authorize</code> with <code>response_type=code, client_id, redirect_uri, scope, state, code_challenge, code_challenge_method=S256</code>. AS validates the redirect URI by exact match and stores the challenge.</p>
          <p><b>3 Login and consent (AS):</b> the user authenticates at the AS (password, MFA, passkey) and approves scopes. The client never sees credentials.</p>
          <p><b>4 Redirect back:</b> AS sends the browser to <code>redirect_uri?code=...&amp;state=...</code>. The client compares <code>state</code> to the stored value and aborts if different.</p>
          <p><b>5 Token request (back channel):</b> client POSTs <code>grant_type=authorization_code, code, redirect_uri, client_id, code_verifier</code>. AS verifies SHA256(verifier) equals the stored challenge, that the code is unused, fresh (about 60 s) and bound to this client and redirect URI; it burns the code and returns an access token (and refresh token, ID token if OIDC).</p>
          <p><b>6 Call the API:</b> <code>Authorization: Bearer ...</code>; the API checks signature/introspection, <code>exp</code>, <code>iss</code>, <code>aud</code> and <code>scope</code>.</p>
          <p><b>Attacker with the stolen code:</b> cannot redeem it, because the verifier never left the client and only its hash was sent; the code is single-use and short-lived. They also cannot forge <code>state</code> to inject their own code, since the client rejects mismatches. What PKCE does <i>not</i> stop: XSS inside the client itself (which can read the verifier and the tokens), so keep the app XSS-free and prefer a BFF.</p>`,
          complexity: `<p>Two redirects plus one back-channel call per login; one SHA-256 and a few random bytes on the client. Token validation per API call is O(1).</p>`,
          followUps: ['What changes for a native mobile app?', 'How would you add refresh tokens safely?']
        }
      }
    ]
  });

  /* =====================================================================
     TOPIC 6 — OpenID Connect & SSO
     ===================================================================== */
  topics.push({
    title: 'OpenID Connect & Single Sign-On (SSO)',
    analogy: `<p>OAuth is the <b>valet key</b>: "this app may park my car". It says nothing about <i>who you are</i>. <b>OpenID Connect (OIDC)</b> adds an <b>ID card</b> to the handshake: along with the key, the front desk hands the app a signed card saying "this is Priya, we checked her at 09:02 with a password and a fingerprint".</p>
      <p><b>SSO</b> is a <b>festival wristband</b>. You show your ticket once at the main gate (the identity provider). Each stage (Wiki, Mail, HR app) just glances at the wristband and lets you in, with no more queueing at the ticket desk.</p>`,
    explain: `<p>🟢 <b>OAuth2 answers "may this app do X?" OIDC answers "who just logged in?".</b> OIDC is a thin layer on top of OAuth 2.0 authorization code flow. You add the scope <code>openid</code> and you additionally get an <b>ID token</b>.</p>
      ${H.table(['Thing', 'What it is', 'Who reads it'], [
        ['<b>ID token</b>', 'a signed JWT about the <i>login event</i>: <code>iss, sub, aud, exp, iat, nonce</code> (+ name, email...)', 'the <b>client app</b> (to know who the user is)'],
        ['<b>Access token</b>', 'permission to call APIs', 'the <b>API</b> (resource server)'],
        ['<b>UserInfo endpoint</b>', 'GET with the access token returns profile claims', 'the client, when it needs more profile data'],
        ['<b>Discovery document</b>', '<code>/.well-known/openid-configuration</code>: all endpoints and the <code>jwks_uri</code>', 'client libraries (auto-configure)'],
        ['<b>JWKS</b>', 'the identity provider\'s public signing keys', 'anyone verifying tokens']
      ])}
      <p><b>The golden rule:</b> never send the ID token to an API as if it were an access token. ID token = "login receipt for the app", access token = "key for the API".</p>
      <p><b>How the client validates an ID token</b> (libraries do it; you must know it):</p>
      <ol>
        <li>Verify the <b>signature</b> using the key from <code>jwks_uri</code> (match by <code>kid</code>); the algorithm must be on your allow-list.</li>
        <li><code>iss</code> equals the issuer you configured.</li>
        <li><code>aud</code> contains <b>your</b> <code>client_id</code>.</li>
        <li><code>exp</code> is in the future (small clock skew allowed).</li>
        <li><code>nonce</code> equals the random value you sent in the authorize request (stops replay of an old ID token).</li>
      </ol>
      <p><b>Identify users by <code>(iss, sub)</code>, not by email.</b> <code>sub</code> is the stable, unique id at that provider. Email can change or be reassigned to a new person.</p>
      <p><b>SSO in plain steps.</b> Many apps trust <b>one identity provider (IdP)</b> such as Okta, Entra ID, Keycloak, Google Workspace. The first app sends you to the IdP, you log in (with MFA), and the IdP stores <i>its own</i> session cookie. When you open the second app, it also redirects to the IdP; the IdP sees you are already logged in, skips the login screen, and bounces you back with a code in a fraction of a second. Each app then creates <i>its own</i> local session.</p>
      <p><b>OIDC vs SAML.</b> SAML 2.0 is the older enterprise SSO standard (XML assertions, browser POST binding). OIDC is JSON/JWT, simpler, friendlier to SPAs and mobile. New apps: OIDC. Big enterprise or legacy SaaS: you will still meet SAML. <b>SCIM</b> is a different job: automatically create/disable user accounts in apps when HR changes the directory.</p>
      <p><b>Logout is the hard part.</b> Logging out of the IdP does not automatically end each app's local session. Options: short app sessions, <b>front-channel logout</b> (IdP loads hidden logout URLs in the browser), <b>back-channel logout</b> (IdP POSTs a signed <i>logout token</i> to each app server), and RP-initiated logout (app sends the user to the IdP's <code>end_session_endpoint</code>).</p>`,
    clues: [
      '"Sign in with Google/Microsoft" or "login via company account" → OpenID Connect (authentication) on top of OAuth2',
      '"One login for all internal tools" / "log in once" → SSO with a central identity provider',
      '"Enterprise customers want to use their own Okta/Entra" → OIDC or SAML federation, per-tenant IdP configuration, JIT provisioning, SCIM',
      '"How does the app know who the user is?" → ID token (validated), not the access token',
      '"Replay of an old ID token" → nonce',
      '"User changed their email and now sees someone else\'s account" → key accounts on (iss, sub), never on email',
      '"After logout the user is still logged in to another app" → back-channel / front-channel logout and short sessions'
    ],
    code: [
      {
        lang: 'python', run: true, title: 'Validating an ID token\'s claims (signature check assumed done by your JWT library)', code: `EXPECTED_ISS = "https://auth.example.test"
CLIENT_ID = "photoprint"

def validate_id_token(claims, expected_nonce, now, leeway=30):
    """Raises ValueError with the exact failing check. Call ONLY after the signature was verified with the IdP's JWKS."""
    if claims.get("iss") != EXPECTED_ISS:
        raise ValueError("iss mismatch: token from an issuer we do not trust")
    aud = claims.get("aud")
    auds = aud if isinstance(aud, list) else [aud]
    if CLIENT_ID not in auds:
        raise ValueError("aud does not contain our client_id: token was meant for another app")
    if len(auds) > 1 and claims.get("azp") != CLIENT_ID:
        raise ValueError("multiple audiences require azp == our client_id")
    if claims.get("exp", 0) + leeway <= now:
        raise ValueError("ID token expired")
    if claims.get("nonce") != expected_nonce:
        raise ValueError("nonce mismatch: possible replay of an old ID token")
    # Stable identity key: the pair (issuer, subject). Email is NOT a safe primary key.
    return (claims["iss"], claims["sub"])

now = 1_900_000_000
good = {"iss": EXPECTED_ISS, "sub": "u-8f2a", "aud": "photoprint", "exp": now + 300, "iat": now, "nonce": "n-123", "email": "priya@example.test"}

tests = {
    "valid token": good,
    "expired token": dict(good, exp=now - 600),
    "token for another app": dict(good, aud="other-app"),
    "wrong issuer": dict(good, iss="https://evil.example.test"),
    "replayed (old nonce)": dict(good, nonce="n-OLD"),
}
for name, claims in tests.items():
    try:
        print(name.ljust(24), "-> user key", validate_id_token(claims, "n-123", now))
    except ValueError as e:
        print(name.ljust(24), "-> REJECTED:", e)
`
      },
      {
        lang: 'json', title: 'Discovery document (shortened): GET /.well-known/openid-configuration', code: `{
  "issuer": "https://auth.example.test",
  "authorization_endpoint": "https://auth.example.test/authorize",
  "token_endpoint": "https://auth.example.test/token",
  "userinfo_endpoint": "https://auth.example.test/userinfo",
  "jwks_uri": "https://auth.example.test/.well-known/jwks.json",
  "end_session_endpoint": "https://auth.example.test/logout",
  "response_types_supported": ["code"],
  "code_challenge_methods_supported": ["S256"],
  "id_token_signing_alg_values_supported": ["RS256", "ES256"],
  "scopes_supported": ["openid", "profile", "email", "offline_access"]
}`
      },
      {
        lang: 'java', title: 'Plain Java: the ID-token claim checks as a reusable method', code: `import java.util.*;

public class IdTokenChecks {
    /** Returns a list of problems; empty list means the claims are acceptable (signature must already be verified). */
    static List<String> check(Map<String, Object> claims, String issuer, String clientId, String expectedNonce, long nowSec) {
        List<String> problems = new ArrayList<>();
        if (!issuer.equals(claims.get("iss"))) problems.add("iss mismatch");

        Object aud = claims.get("aud");
        List<?> audiences = aud instanceof List<?> l ? l : List.of(String.valueOf(aud));
        if (!audiences.contains(clientId)) problems.add("aud does not contain our client_id");

        Object exp = claims.get("exp");
        if (!(exp instanceof Number n) || n.longValue() + 30 <= nowSec) problems.add("expired or missing exp");

        if (!Objects.equals(expectedNonce, claims.get("nonce"))) problems.add("nonce mismatch");
        return problems;
    }

    public static void main(String[] args) {
        long now = 1_900_000_000L;
        Map<String, Object> claims = new HashMap<>();
        claims.put("iss", "https://auth.example.test");
        claims.put("sub", "u-8f2a");
        claims.put("aud", "photoprint");
        claims.put("exp", now + 300);
        claims.put("nonce", "n-123");
        System.out.println("good  : " + check(claims, "https://auth.example.test", "photoprint", "n-123", now));
        claims.put("aud", "someone-else");
        System.out.println("wrong : " + check(claims, "https://auth.example.test", "photoprint", "n-123", now));
        // The user key to store in your database is (iss + "|" + sub), not the email address.
    }
}`
      },
      {
        lang: 'yaml', title: 'Spring Boot: "Login with our company IdP" (OIDC) in a few lines', code: `# application.yml - the discovery document is fetched automatically from issuer-uri
spring:
  security:
    oauth2:
      client:
        registration:
          company-sso:
            client-id: wiki-app
            client-secret: \${WIKI_CLIENT_SECRET}      # from env / secrets manager
            scope: openid, profile, email
            authorization-grant-type: authorization_code
        provider:
          company-sso:
            issuer-uri: https://auth.example.test      # Spring reads /.well-known/openid-configuration
# Java: http.oauth2Login(Customizer.withDefaults());   -> /oauth2/authorization/company-sso starts the flow,
# validates signature, iss, aud, exp and nonce for you, then builds an OidcUser from the ID token.`
      },
      {
        lang: 'js', check: false, title: 'Node.js: openid-client library (discovery + code flow with PKCE)', code: `import * as client from 'openid-client';

const config = await client.discovery(new URL('https://auth.example.test'), 'wiki-app', process.env.WIKI_CLIENT_SECRET);

// 1) build the login URL (the library creates code_challenge + state + nonce; you store verifier/state/nonce in the session)
const codeVerifier = client.randomPKCECodeVerifier();
const params = {
  redirect_uri: 'https://wiki.example.test/callback',
  scope: 'openid profile email',
  code_challenge: await client.calculatePKCECodeChallenge(codeVerifier),
  code_challenge_method: 'S256',
  state: client.randomState(),
  nonce: client.randomNonce()
};
const loginUrl = client.buildAuthorizationUrl(config, params);

// 2) in the callback: exchange the code, the library validates the ID token (signature, iss, aud, exp, nonce)
const tokens = await client.authorizationCodeGrant(config, new URL(req.url, 'https://wiki.example.test'), {
  pkceCodeVerifier: codeVerifier, expectedState: savedState, expectedNonce: savedNonce
});
const claims = tokens.claims();            // { iss, sub, aud, email, ... }  -> user key = iss + '|' + sub`
      }
    ],
    codeTitle: ['Python: ID token claim checks (runnable)', 'Discovery document', 'Java: same checks in plain Java', 'Spring Boot OIDC login', 'Node openid-client'],
    viz: [
      {
        title: 'Single Sign-On: log in once, enter many apps',
        input: 'wiki',
        inputLabel: 'First app you open (letters only), the second will be mail',
        gen: function (input) {
          var first = String(input || '').trim().toLowerCase();
          if (!/^[a-z]{2,10}$/.test(first)) throw new Error('Type a short app name using letters, e.g. wiki');
          var second = first === 'mail' ? 'hr' : 'mail';
          var nodes = [
            { id: 'W', label: first + ' app', x: 14, y: 52, shape: 'box', w: 16 },
            { id: 'IDP', label: 'Identity provider (IdP)', x: 50, y: 14, shape: 'box', w: 26 },
            { id: 'M', label: second + ' app', x: 86, y: 52, shape: 'box', w: 16 }
          ];
          var steps = [
            { f: 'W', t: 'IDP', label: '1 no session: redirect to login', narr: '<b>Step 1.</b> You open the <b>' + H.esc(first) + '</b> app. It has no session for you, so it redirects your browser to the identity provider (OIDC authorize request with <code>nonce</code> and PKCE).', tags: { IDP: 'no IdP cookie yet' } },
            { f: 'IDP', t: 'W', label: '2 login + MFA, then code', narr: '<b>Step 2.</b> You type your password and approve MFA <i>once</i>. The IdP sets <b>its own session cookie</b> on the IdP domain and redirects back with a code. The app swaps it for an ID token and creates its local session.', tags: { IDP: 'IdP session cookie SET', W: 'local session created' } },
            { f: 'M', t: 'IDP', label: '3 no session: redirect to IdP', narr: '<b>Step 3.</b> Later you open the <b>' + H.esc(second) + '</b> app. Same story: it has no session for you, so it redirects to the same IdP.', tags: { IDP: 'IdP cookie present!', W: 'local session' } },
            { f: 'IDP', t: 'M', label: '4 already logged in: code, no prompt', cls: 'ok', narr: '<b>Step 4.</b> The browser sends the IdP cookie, the IdP recognises you and redirects straight back with a code. <span class="c-g">No password, no MFA prompt</span>. That is SSO. The app builds its own session.', tags: { IDP: 'reuses IdP session', W: 'local session', M: 'local session created' } },
            { f: 'W', t: 'M', label: '(no direct trust needed)', cls: 'done', narr: 'Note: the two apps never talk to each other. They each trust the IdP, and each keeps its own local session. That is also why <b>logout</b> needs extra work: ending the IdP session does not magically end the apps\' sessions (use back-channel logout and short app sessions).', tags: { IDP: 'central policy: MFA, risk, disable user', W: 'local session', M: 'local session' } }
          ];
          var frames = [], k;
          for (k = 0; k < steps.length; k++) {
            frames.push({ narr: steps[k].narr, parts: [flowPart(nodes, steps, k, (function () { var o = {}; o[steps[k].f] = 'cur'; o[steps[k].t] = 'sel'; return o; })(), steps[k].tags, steps[k].cls)] });
          }
          return frames;
        }
      },
      {
        title: 'ID token validation checklist',
        input: 'ok',
        inputLabel: 'Scenario: ok, expired, wrongaud, wrongiss or badnonce',
        gen: function (input) {
          var sc = String(input || 'ok').trim().toLowerCase();
          var allowed = ['ok', 'expired', 'wrongaud', 'wrongiss', 'badnonce'];
          if (allowed.indexOf(sc) < 0) throw new Error('Choose one of: ' + allowed.join(', '));
          var claims = [
            ['iss', sc === 'wrongiss' ? 'https://evil.example.test' : 'https://auth.example.test'],
            ['sub', 'u-8f2a'],
            ['aud', sc === 'wrongaud' ? 'other-app' : 'photoprint'],
            ['exp', sc === 'expired' ? 'now - 10 min' : 'now + 5 min'],
            ['nonce', sc === 'badnonce' ? 'n-OLD' : 'n-123']
          ];
          var checks = [
            ['signature valid (JWKS, allowed alg)', true, 'always checked first'],
            ['iss = https://auth.example.test', sc !== 'wrongiss', 'token minted by a trusted issuer'],
            ['aud contains photoprint', sc !== 'wrongaud', 'token was issued for THIS app'],
            ['exp in the future', sc !== 'expired', 'token is fresh'],
            ['nonce = value we sent (n-123)', sc !== 'badnonce', 'not a replayed login']
          ];
          var frames = [], rows = [], i, failed = -1;
          frames.push({ narr: 'The app received this <b>ID token</b> after the code exchange. Its claims are listed below. The app expects issuer <code>https://auth.example.test</code>, its own client id <code>photoprint</code> and nonce <code>n-123</code>.', parts: [{ type: 'map', label: 'ID token claims', entries: claims }] });
          for (i = 0; i < checks.length && failed < 0; i++) {
            rows.push([String(i + 1), checks[i][0], checks[i][1] ? '<span class="c-g">pass</span>' : '<span class="c-r">FAIL</span>']);
            if (!checks[i][1]) failed = i;
            var hl = {}; hl[rows.length - 1] = checks[i][1] ? 'ok' : 'bad';
            frames.push({ narr: checks[i][1] ? 'Check ' + (i + 1) + ': <b>' + checks[i][0] + '</b> passes (' + checks[i][2] + ').' : 'Check ' + (i + 1) + ': <b>' + checks[i][0] + '</b> <span class="c-r">fails</span>. Stop immediately and reject the login.', parts: [{ type: 'table', label: 'checks so far', columns: ['#', 'check', 'result'], rows: rows.map(function (r) { return r.slice(); }), hl: hl }] });
          }
          frames.push({ narr: failed < 0 ? '<span class="c-g">All checks passed.</span> Only now may the app trust the claims and create a local session. Store the user as <code>(iss, sub)</code> = <code>(https://auth.example.test, u-8f2a)</code>.' : '<span class="c-r">Login rejected.</span> One failed check is enough. Show a generic error, log the reason, and never create a session.', parts: [{ type: 'vars', vals: { decision: failed < 0 ? 'ACCEPT' : 'REJECT', 'user key': failed < 0 ? 'iss + sub (not email)' : 'none' }, hl: { decision: failed < 0 ? 'ok' : 'bad' } }] });
          return frames;
        }
      }
    ],
    examples: [
      {
        title: 'Why "email" is a bad primary key', html: `<p>Alice at <code>alice@corp.example</code> leaves. HR reuses the address for a new hire, also named Alice. If your app matched accounts by email, the new Alice instantly inherits the old Alice's data.</p>
        ${H.table(['Key', 'Stable?', 'Safe?'], [['email', 'can change / be reassigned', '<span class="c-r">no</span>'], ['(iss, sub)', 'provider guarantees uniqueness and stability', '<span class="c-g">yes</span>']])}
        <p>Also: only trust <code>email</code> if <code>email_verified</code> is true, and be careful linking a social login to an existing password account by email (account takeover risk): require the user to prove ownership of both.</p>`
      },
      {
        title: 'Enterprise SSO for a SaaS product (multi-tenant)', html: `<p>Customer "Acme" wants staff to log in with Acme's Okta. You store per-tenant IdP settings: <code>issuer, client_id, client_secret (encrypted), allowed email domains</code>.</p>
        <ol><li>User types <code>sam@acme.test</code> → you look up the tenant by email domain (home-realm discovery).</li><li>Redirect to Acme's IdP; validate the ID token against <b>that tenant's</b> issuer and JWKS.</li><li>Just-in-time (JIT) create the user on first login, or let the customer's directory push users via <b>SCIM</b> (and disable them when they leave).</li><li>Map IdP groups to your roles ("Acme-Admins" → Admin).</li></ol>`
      },
      {
        title: 'Back-channel logout in one picture', html: `<p>Sam clicks "log out" in the Wiki. The Wiki redirects to the IdP <code>end_session_endpoint</code>. The IdP ends its session, then sends a server-to-server POST to every registered app's <code>backchannel_logout_uri</code> with a signed <b>logout token</b> (a JWT with <code>sid</code> or <code>sub</code> and <code>events</code>). Each app validates it and deletes the matching local session. Result: Sam is logged out everywhere within seconds, even in apps where the browser tab is closed.</p>`
      },
      {
        title: 'SAML vs OIDC cheat table', html: `${H.table(['', 'SAML 2.0', 'OpenID Connect'], [['Data format', 'XML assertion, XML signature', 'JSON / JWT'], ['Transport', 'browser POST bindings', 'OAuth2 redirects + back-channel'], ['Best for', 'older enterprise web apps', 'modern web, SPA, mobile, APIs'], ['Pain point', 'XML signature wrapping bugs, hard to debug', 'many options; validate carefully']])}`
      }
    ],
    deepDive: `<p>🟣 <b>Flows in OIDC.</b> Use the authorization code flow with PKCE for everything. The old implicit and hybrid flows returned ID tokens in the front channel and are discouraged. In the code flow the ID token comes back from the <i>token endpoint</i> over TLS, so the <code>at_hash</code>/<code>c_hash</code> binding claims are optional for most apps.</p>
      <p><b>Claims you will see:</b> <code>auth_time</code> (when the user actually authenticated, use with <code>max_age</code> to force re-login), <code>acr</code> / <code>amr</code> (how strong: <code>pwd</code>, <code>otp</code>, <code>hwk</code>, <code>mfa</code>), <code>sid</code> (IdP session id, used by logout), <code>azp</code> (authorized party), <code>email_verified</code>. Step-up auth: an app can request <code>acr_values</code> to demand MFA before showing a payment page.</p>
      <p><b>JWKS caching and rotation.</b> Cache the key set by <code>Cache-Control</code> and re-fetch on unknown <code>kid</code> with a rate limit. Never fetch a key from a URL carried inside the token (<code>jku</code>), and pin issuer to configuration.</p>
      <p><b>Session design under SSO.</b> The app's local session is independent. Pick its lifetime consciously: if it lasts 30 days, a user disabled at the IdP keeps access for 30 days unless you implement back-channel logout or periodic silent re-validation (<code>prompt=none</code>, or refresh-token use which fails when the IdP revoked the grant). Silent iframe renewal is dying with third-party cookie restrictions; prefer refresh tokens or top-level redirects.</p>
      <p><b>Federation and trust.</b> Social logins prove control of a mailbox, not corporate identity. For enterprise customers check the IdP is authoritative for the email domain (domain verification) so a rogue tenant cannot claim <code>@bigcorp.com</code>. Beware "nOAuth": apps that trusted a mutable <code>email</code> claim from multi-tenant Entra tokens were vulnerable to account takeover; always key on <code>(iss, sub)</code> (or <code>tid</code> + <code>oid</code> on Entra).</p>`,
    aiEra: `<p><b>What AI changes:</b> consumer identity is shifting toward passkeys and wallet-style verifiable credentials, and agents need their own <b>workload identities</b> (OIDC tokens for CI jobs, Kubernetes service accounts, "agent identity") rather than shared human accounts. Many AI tool platforms expose "Sign in with ..." plus OAuth connectors, so you are very likely to configure an OIDC client or approve an OAuth consent screen this year.</p>
      <p><b>Use AI as a partner:</b> <code>Given these three IdP discovery documents, write a table of differences in supported algorithms, logout endpoints and claims I need to handle</code>, or <code>Generate negative-test fixtures for ID token validation: bad aud, bad iss, expired, replayed nonce</code>.</p>
      <p><b>Where AI goes wrong:</b> it conflates ID token with access token, forgets nonce, matches users by email, hard-codes the JWKS instead of fetching it by <code>kid</code>, and writes SAML code that skips signature validation (the classic XML wrapping hole). Prefer a maintained library and read its security notes.</p>
      <p><b>What you must still own:</b> choosing the account-linking policy, deprovisioning (what happens the day an employee leaves), logout semantics, and mapping IdP groups to authorisation, which no library can decide for you.</p>`,
    problems: [
      {
        title: 'Design SSO for Five Internal Apps', level: 'Medium', tags: ['OIDC', 'SSO', 'logout', 'design'], companies: ['Atlassian', 'Salesforce', 'Okta'],
        statement: `<p>A company has 5 internal web apps (wiki, mail, HR, finance, analytics) with 5 separate user tables and passwords. Design one login for all of them using OpenID Connect: pick the IdP approach, flow, token usage, session design, user-linking key, MFA policy, and how an employee who leaves is cut off quickly.</p>`,
        constraints: `3,000 employees, finance needs MFA every time, offboarding must take effect within 15 minutes.`,
        example: `<p>Wiki → IdP (login + MFA) → ID token → local session. Mail later → IdP cookie found → ${H.c('g', 'no prompt')} → local session. Finance requests ${H.c('p', 'acr=mfa / max_age=0')} so it always re-prompts.</p>`,
        brute: { why: `<p>Keep 5 password databases and "sync" them with scripts. Offboarding means touching 5 systems (someone forgets one), users hold 5 passwords (reuse), and there is no central MFA or audit trail.</p>` },
        mcq: { q: 'Which value should the apps use as the permanent user key?', options: ['email', 'display name', '(iss, sub) from the ID token', 'the session id'], answer: 2, explain: '(iss, sub) is unique and stable per provider. Emails can change or be reassigned.' },
        hints: [`<p>Aha: centralise identity. One IdP authenticates; each app only consumes a validated ID token.</p>`, `<p>Authorization code + PKCE per app (client id per app), discovery for config, local session per app, mapping IdP groups to app roles.</p>`, `<p>Offboarding: disable at the IdP (and SCIM-deprovision), keep app sessions short (say 15 min idle) and/or use back-channel logout so the cut-off is within minutes.</p>`],
        solution: {
          approach: `<p><b>Choose an IdP</b> (Keycloak, Okta, Entra ID) as the only place passwords and MFA live; connect HR directory for joiners/leavers (SCIM or group sync). Each app is a registered OIDC client with its own client id and exact redirect URI.</p>
          <p><b>Login flow:</b> authorization code + PKCE, scopes <code>openid profile email</code> plus <code>groups</code>. The app validates the ID token (signature via JWKS, iss, aud, exp, nonce), keys the user by <code>(iss, sub)</code>, creates a local HttpOnly session cookie, and maps IdP groups to app roles (RBAC).</p>
          <p><b>SSO behaviour:</b> the IdP session cookie makes the second app's login silent. <b>Finance</b> requests <code>acr_values</code> for MFA and <code>max_age=0</code> (or checks <code>auth_time</code>/<code>amr</code> in the ID token) to force fresh MFA even in a live SSO session.</p>
          <p><b>Offboarding within 15 minutes:</b> disable the user in the directory; the IdP revokes sessions and refresh tokens and sends <b>back-channel logout</b> to every app; additionally each app's idle session is 15 minutes and sensitive actions re-check with the IdP (or token introspection). Audit log at the IdP shows who logged into what.</p>
          <p><b>Risks and mitigations:</b> IdP is a single point of failure (HA deployment, break-glass admin account), account takeover at the IdP is catastrophic (phishing-resistant MFA/passkeys, conditional access), and apps must never accept unvalidated tokens.</p>`,
          complexity: `<p>One redirect round trip per app login; JWKS cached so validation is local. Operationally: 5 client registrations instead of 5 user databases.</p>`,
          followUps: ['How would you add a customer-facing app that uses social logins?', 'What if the IdP is down?']
        }
      }
    ]
  });

  /* =====================================================================
     TOPIC 7 — Authorization: RBAC, ABAC, ReBAC
     ===================================================================== */
  topics.push({
    title: 'Authorization: RBAC, ABAC & Relationship-Based Access',
    analogy: `<p>Authentication is the <b>security guard checking your ID at the front door</b>. Authorization is what happens <i>inside</i>: which rooms your badge opens.</p>
      <p><b>RBAC</b> (role-based) is a badge colour: <i>green badge = staff, red badge = manager, black badge = admin</i>. Each colour opens a fixed set of doors. <b>ABAC</b> (attribute-based) is a smart door that reads facts: "You are a nurse (who), in the cardiology ward (where you work), the patient file is cardiology too (what), it is 2 pm (when): open." <b>ReBAC</b> (relationship-based) is "you can open this folder because you are in a team that was shared the parent folder", the way Google Docs shares work.</p>`,
    explain: `<p>🟢 <b>Authentication (authN)</b> = who are you? <b>Authorization (authZ)</b> = what may you do? Wrong answers return <b>401 Unauthorized</b> (no valid identity) or <b>403 Forbidden</b> (known identity, not allowed). Use <b>404</b> instead of 403 when even revealing that the object exists would leak information.</p>
      <p><b>RBAC: users → roles → permissions.</b> You never give permissions to people directly. You define roles (<code>viewer</code>, <code>editor</code>, <code>admin</code>), attach permissions to roles, and assign roles to users. A user with several roles gets the <b>union</b> of their permissions.</p>
      ${H.table(['Role', 'read', 'write', 'delete', 'manage_users'], [
        ['viewer', '<span class="c-g">yes</span>', '<span class="c-r">no</span>', '<span class="c-r">no</span>', '<span class="c-r">no</span>'],
        ['editor', '<span class="c-g">yes</span>', '<span class="c-g">yes</span>', '<span class="c-r">no</span>', '<span class="c-r">no</span>'],
        ['admin', '<span class="c-g">yes</span>', '<span class="c-g">yes</span>', '<span class="c-g">yes</span>', '<span class="c-g">yes</span>']
      ])}
      <p>Good: easy to understand, audit ("who is admin?"), and cheap to check. Weak spot: <b>role explosion</b>. "Editor but only for the Germany region and only on weekdays" turns into dozens of roles.</p>
      <p><b>ABAC: decide with attributes and rules.</b> A policy looks at four kinds of facts: <b>subject</b> (role, department, clearance), <b>resource</b> (owner, department, sensitivity), <b>action</b> (read, delete), <b>environment</b> (time, IP, device trust, MFA done). Example rule: <i>"A doctor may read a patient record if the record's department equals the doctor's department and it is a working hour."</i> It is flexible and fine-grained, but harder to explain and test.</p>
      <p><b>ReBAC: decide with relationships.</b> "alice is <i>owner</i> of folder X; folder X is the <i>parent</i> of document D; owners of a parent are editors of its children." Google's Zanzibar paper and tools such as SpiceDB, OpenFGA and Ory Keto store relationship tuples and answer <code>check(user, relation, object)</code>.</p>
      <p><b>Rules that never change:</b></p>
      <ul>
        <li><b>Deny by default.</b> If no rule says yes, the answer is no.</li>
        <li><b>Check on the server, on every request</b>, at the data level too. Hiding a button in the UI is decoration, not security.</li>
        <li><b>Object-level checks (the #1 API bug, called BOLA or IDOR).</b> "Is this user allowed to see <i>order 123</i>?", not just "is this user logged in?". Changing <code>/orders/123</code> to <code>/orders/124</code> must not reveal someone else's order.</li>
        <li><b>Least privilege</b> and <b>separation of duties</b> (the person who creates a payment cannot also approve it).</li>
        <li><b>Centralise</b> decisions in one place (a policy module or engine) so rules are not scattered across 200 controllers.</li>
      </ul>
      <p><b>Roles vs scopes vs permissions:</b> <i>scopes</i> limit what a <b>token</b> may do (what the user allowed the app to do); <i>roles/permissions</i> describe what the <b>user</b> may do. The effective right is usually the <b>intersection</b>: user has delete rights AND the token carries a delete scope.</p>`,
    clues: [
      '"Admins can do everything, editors can edit, viewers can read" → RBAC',
      '"A user can only see their own orders" / "only managers in the same department" → object-level / ABAC rule',
      '"Share this document with a team; permissions inherit from the folder" → ReBAC (Zanzibar-style)',
      '"Too many roles" / "role explosion" → move to ABAC or ReBAC, or add scoped roles (role + tenant)',
      '"A user changed the id in the URL and saw another customer\'s data" → BOLA / IDOR: missing object-level authorization',
      '"Where do you enforce authorization?" → policy enforcement point in every service + a central policy decision point; defence in depth including the DB (row-level security)',
      '"401 or 403?" → 401 = not authenticated, 403 = authenticated but not allowed'
    ],
    code: [
      {
        lang: 'js', run: true, title: 'RBAC + ABAC permission checkers (deny by default)', code: `// ---------- RBAC: users -> roles -> permissions ----------
const rolePermissions = {
  viewer: ['post:read'],
  editor: ['post:read', 'post:write'],
  admin:  ['post:read', 'post:write', 'post:delete', 'user:manage']
};
const userRoles = { alice: ['editor'], bob: ['viewer'], carol: ['admin'], dave: ['viewer', 'editor'] };

function can(user, permission) {
  const roles = userRoles[user] || [];                       // unknown user -> no roles -> denied
  return roles.some(r => (rolePermissions[r] || []).includes(permission));   // union over roles
}

console.log('alice post:write  ->', can('alice', 'post:write'));    // true
console.log('bob   post:write  ->', can('bob', 'post:write'));      // false
console.log('dave  post:write  ->', can('dave', 'post:write'));     // true (viewer + editor)
console.log('zed   post:read   ->', can('zed', 'post:read'));       // false (deny by default)

// ---------- ABAC: policies look at attributes of subject, resource, action, environment ----------
const policies = [
  { id: 'R1', effect: 'permit', description: 'doctor/nurse reads records of their own department during working hours',
    when: c => ['doctor', 'nurse'].includes(c.subject.role) && c.action === 'read' &&
               c.subject.dept === c.resource.dept && c.env.hour >= 7 && c.env.hour <= 20 },
  { id: 'R2', effect: 'permit', description: 'patients read their own record',
    when: c => c.action === 'read' && c.resource.patientId === c.subject.id },
  { id: 'R3', effect: 'deny', description: 'sensitive records only for doctors',
    when: c => c.resource.sensitive === true && c.subject.role !== 'doctor' }
];

function decide(ctx) {                                        // deny-overrides, default deny
  const matched = policies.filter(p => p.when(ctx));
  if (matched.some(p => p.effect === 'deny')) return { allow: false, why: matched.filter(p => p.effect === 'deny').map(p => p.id).join(',') };
  if (matched.some(p => p.effect === 'permit')) return { allow: true, why: matched.map(p => p.id).join(',') };
  return { allow: false, why: 'no rule matched (default deny)' };
}

const nurse = { id: 'n1', role: 'nurse', dept: 'cardio' };
const base = { action: 'read', env: { hour: 14 } };
console.log('nurse, same dept, 2pm   ->', decide({ ...base, subject: nurse, resource: { dept: 'cardio', patientId: 'p9', sensitive: false } }));
console.log('nurse, other dept       ->', decide({ ...base, subject: nurse, resource: { dept: 'ortho', patientId: 'p9', sensitive: false } }));
console.log('nurse, sensitive record ->', decide({ ...base, subject: nurse, resource: { dept: 'cardio', patientId: 'p9', sensitive: true } }));
console.log('patient reads own       ->', decide({ ...base, subject: { id: 'p9', role: 'patient' }, resource: { dept: 'cardio', patientId: 'p9', sensitive: false } }));
console.log('nurse at 11pm           ->', decide({ action: 'read', env: { hour: 23 }, subject: nurse, resource: { dept: 'cardio', patientId: 'p9', sensitive: false } }));`
      },
      {
        lang: 'java', title: 'Plain Java: RBAC with a role hierarchy and a permission check', code: `import java.util.*;

public class Rbac {
    enum Permission { POST_READ, POST_WRITE, POST_DELETE, USER_MANAGE }

    // Each role lists only what it ADDS; "inherits" pulls in the lower role (VIEWER < EDITOR < ADMIN).
    enum Role {
        VIEWER(null, Permission.POST_READ),
        EDITOR(VIEWER, Permission.POST_WRITE),
        ADMIN(EDITOR, Permission.POST_DELETE, Permission.USER_MANAGE);

        private final Role inherits;
        private final Set<Permission> own;

        Role(Role inherits, Permission... own) {
            this.inherits = inherits;
            this.own = EnumSet.noneOf(Permission.class);
            this.own.addAll(Arrays.asList(own));
        }

        Set<Permission> effective() {
            Set<Permission> all = EnumSet.noneOf(Permission.class);
            for (Role r = this; r != null; r = r.inherits) all.addAll(r.own);
            return all;
        }
    }

    private final Map<String, Set<Role>> userRoles = new HashMap<>();

    void assign(String user, Role role) {
        userRoles.computeIfAbsent(user, u -> EnumSet.noneOf(Role.class)).add(role);
    }

    /** Deny by default: unknown user or no matching role means false. */
    boolean can(String user, Permission p) {
        for (Role r : userRoles.getOrDefault(user, Set.of())) {
            if (r.effective().contains(p)) return true;
        }
        return false;
    }

    public static void main(String[] args) {
        Rbac rbac = new Rbac();
        rbac.assign("alice", Role.EDITOR);
        rbac.assign("carol", Role.ADMIN);
        System.out.println("alice write  : " + rbac.can("alice", Permission.POST_WRITE));   // true (own)
        System.out.println("alice read   : " + rbac.can("alice", Permission.POST_READ));    // true (inherited from VIEWER)
        System.out.println("alice delete : " + rbac.can("alice", Permission.POST_DELETE));  // false
        System.out.println("carol manage : " + rbac.can("carol", Permission.USER_MANAGE));  // true
        System.out.println("nobody read  : " + rbac.can("nobody", Permission.POST_READ));   // false
    }
}`
      },
      {
        lang: 'python', run: true, title: 'ReBAC mini-Zanzibar: relationship tuples + inheritance', code: `# (object, relation, subject) tuples, the way Zanzibar / SpiceDB / OpenFGA store permissions.
tuples = {
    ("folder:eng", "owner", "user:alice"),
    ("team:backend", "member", "user:bob"),
    ("folder:eng", "viewer", "team:backend#member"),     # everybody who is a member of team:backend can view
    ("doc:design", "parent", "folder:eng"),              # doc inherits from its folder
    ("doc:design", "editor", "user:carol"),
}

def subjects_with(obj, relation):
    return [s for (o, r, s) in tuples if o == obj and r == relation]

def has_relation(user, obj, relation, depth=0):
    """True if 'user' has 'relation' on 'obj' directly, through a group, or through the parent folder."""
    if depth > 5:                                         # guard against cycles
        return False
    for s in subjects_with(obj, relation):
        if s == user:
            return True
        if "#" in s:                                      # userset, e.g. team:backend#member
            group, rel = s.split("#")
            if has_relation(user, group, rel, depth + 1):
                return True
    return False

def can_view(user, obj, depth=0):
    if has_relation(user, obj, "viewer") or has_relation(user, obj, "editor") or has_relation(user, obj, "owner"):
        return True
    return any(can_view(user, parent, depth + 1) for parent in subjects_with(obj, "parent") if depth < 5)

for who, what in [("user:alice", "doc:design"), ("user:bob", "doc:design"), ("user:carol", "doc:design"), ("user:mallory", "doc:design")]:
    print(who.ljust(13), "can view", what, "->", can_view(who, what))
`
      },
      {
        lang: 'java', check: false, title: 'Spring Security method security: roles, ownership checks (object-level)', code: `@Configuration
@EnableMethodSecurity            // turns on @PreAuthorize / @PostAuthorize
class MethodSecurityConfig {}

@Service
class OrderService {

    // RBAC: only users that hold the authority may call this
    @PreAuthorize("hasAuthority('order:refund')")
    public void refund(long orderId) { /* refund logic */ }

    // Object-level (anti-IDOR): load first, then check the OWNER of the loaded object
    @PostAuthorize("returnObject.customerId == authentication.name or hasRole('SUPPORT')")
    public Order getOrder(long orderId) {
        return orders.findById(orderId).orElseThrow(NotFoundException::new);
    }

    // ABAC-style: a custom bean makes the decision from several attributes
    @PreAuthorize("@policy.canApprove(authentication, #payment)")
    public void approve(Payment payment) { /* approval logic */ }
}

@Component("policy")
class PaymentPolicy {
    boolean canApprove(Authentication auth, Payment p) {
        boolean isManager = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_MANAGER"));
        boolean notCreator = !p.getCreatedBy().equals(auth.getName());       // separation of duties
        boolean underLimit = p.getAmountCents() <= 1_000_000;                // 10,000.00
        return isManager && notCreator && underLimit;
    }
}`
      },
      {
        lang: 'text', title: 'Policy-as-code (Open Policy Agent / Rego) for the same ABAC idea', code: `package hospital.records

default allow := false                       # deny by default

allow if {                                   # R1
    input.action == "read"
    input.subject.role in {"doctor", "nurse"}
    input.subject.dept == input.resource.dept
    input.env.hour >= 7
    input.env.hour <= 20
    not deny
}

allow if {                                   # R2: patients read their own record
    input.action == "read"
    input.resource.patient_id == input.subject.id
    not deny
}

deny if {                                    # R3: deny overrides
    input.resource.sensitive
    input.subject.role != "doctor"
}`
      }
    ],
    codeTitle: ['JavaScript: RBAC + ABAC (runnable)', 'Java: RBAC with hierarchy', 'Python: ReBAC relationship tuples (runnable)', 'Spring method security', 'Rego policy (OPA)'],
    viz: [
      {
        title: 'RBAC: from user to role to permission',
        input: 'dave post:write',
        inputLabel: 'user permission  (users: alice bob carol dave   permissions: post:read post:write post:delete user:manage)',
        gen: function (input) {
          var perms = ['post:read', 'post:write', 'post:delete', 'user:manage'];
          var roles = ['viewer', 'editor', 'admin'];
          var matrix = [[1, 0, 0, 0], [1, 1, 0, 0], [1, 1, 1, 1]];
          var users = { alice: ['editor'], bob: ['viewer'], carol: ['admin'], dave: ['viewer', 'editor'] };
          var w = String(input || '').trim().split(/\s+/);
          if (w.length !== 2 || !users[w[0].toLowerCase()] || perms.indexOf(w[1].toLowerCase()) < 0) throw new Error('Type: user permission, e.g.  dave post:write   (users: alice bob carol dave)');
          var user = w[0].toLowerCase(), perm = w[1].toLowerCase(), pc = perms.indexOf(perm);
          var rows = matrix.map(function (r) { return r.map(function (v) { return v ? '✓' : '✗'; }); });
          var frames = [], hl, c, r, granted = false, via = [];
          frames.push({ narr: 'This is the <b>role → permission matrix</b>. It is defined once by the team. A ✓ means "this role may do that".', parts: [{ type: 'grid', label: 'RBAC matrix', rowHead: roles, colHead: perms, rows: rows, hl: {} }] });
          frames.push({ narr: 'Users never get permissions directly. We look up which <b>roles</b> a user was assigned: <b>' + user + '</b> has <b>' + users[user].join(' + ') + '</b>.', parts: [{ type: 'map', label: 'user → roles', entries: Object.keys(users).map(function (u) { return [u, users[u].join(', ')]; }), hl: (function () { var o = {}; o[user] = 'cur'; return o; })() }] });
          hl = {};
          users[user].forEach(function (role) { var ri = roles.indexOf(role); for (c = 0; c < perms.length; c++) hl[ri + ',' + c] = 'win'; });
          frames.push({ narr: 'Highlight the row(s) of those roles. A user with several roles gets the <b>union</b> of what those rows allow.', parts: [{ type: 'grid', label: 'rows of ' + user + '\'s roles', rowHead: roles, colHead: perms, rows: rows, hl: hl }] });
          hl = {};
          for (r = 0; r < roles.length; r++) hl[r + ',' + pc] = users[user].indexOf(roles[r]) >= 0 ? 'win' : 'done';
          users[user].forEach(function (role) { var ri = roles.indexOf(role); hl[ri + ',' + pc] = matrix[ri][pc] ? 'ok' : 'bad'; if (matrix[ri][pc]) { granted = true; via.push(role); } });
          frames.push({ narr: 'Now look at the column for <code>' + perm + '</code> in those rows. ' + (granted ? '<span class="c-g">At least one role has ✓ (' + via.join(', ') + ').</span>' : '<span class="c-r">No role of this user has ✓.</span>'), parts: [{ type: 'grid', label: 'column ' + perm, rowHead: roles, colHead: perms, rows: rows, hl: hl }] });
          frames.push({ narr: granted ? '<b>Decision: ALLOW.</b> The server returns the data. Still remember: for a specific object (e.g. one order) you also need an ownership/tenant check.' : '<b>Decision: DENY (403).</b> Default is deny, and nothing granted it. Unknown users or unknown permissions end up here too.', parts: [{ type: 'vars', vals: { user: user, permission: perm, roles: users[user].join(', '), decision: granted ? 'ALLOW' : 'DENY' }, hl: { decision: granted ? 'ok' : 'bad' } }] });
          return frames;
        }
      },
      {
        title: 'ABAC: evaluating a policy from attributes',
        input: 'role=nurse dept=cardio recdept=cardio hour=14 sensitive=no self=no',
        inputLabel: 'Attributes (role: doctor/nurse/clerk/patient; hour 0-23; sensitive, self: yes/no)',
        gen: function (input) {
          var a = { role: 'nurse', dept: 'cardio', recdept: 'cardio', hour: '14', sensitive: 'no', self: 'no' };
          var parts = String(input || '').trim().split(/\s+/).filter(function (x) { return x; }), i, kv;
          for (i = 0; i < parts.length; i++) {
            kv = parts[i].split('=');
            if (kv.length !== 2 || !(kv[0] in a) || !/^[a-z0-9]+$/i.test(kv[1])) throw new Error('Use key=value pairs. Keys: role dept recdept hour sensitive self');
            a[kv[0]] = kv[1].toLowerCase();
          }
          var hour = parseInt(a.hour, 10);
          if (isNaN(hour) || hour < 0 || hour > 23) throw new Error('hour must be 0-23');
          var yes = function (v) { return v === 'yes'; };
          var r1 = (a.role === 'doctor' || a.role === 'nurse') && a.dept === a.recdept && hour >= 7 && hour <= 20;
          var r2 = yes(a.self);
          var r3 = yes(a.sensitive) && a.role !== 'doctor';
          var permit = r1 || r2, decision = permit && !r3;
          var frames = [], rows = [];
          frames.push({ narr: 'An <b>access request</b>: someone wants to <code>read</code> a patient record. ABAC collects <b>attributes</b> of the subject (role, department), the resource (department, sensitivity), and the environment (hour).', parts: [{ type: 'map', label: 'attributes', entries: [['subject.role', a.role], ['subject.dept', a.dept], ['resource.dept', a.recdept], ['resource.sensitive', a.sensitive], ['subject is the patient', a.self], ['env.hour', String(hour)]] }] });
          rows.push(['R1 permit', 'role is doctor/nurse AND same dept AND 7 ≤ hour ≤ 20', r1 ? '<span class="c-g">matches</span>' : 'no match']);
          frames.push({ narr: 'Rule <b>R1 (permit)</b>: staff may read records of <i>their own department</i> in working hours. ' + (r1 ? '<span class="c-g">Matches.</span>' : 'Does not match (' + (a.role !== 'doctor' && a.role !== 'nurse' ? 'role is not clinical' : a.dept !== a.recdept ? 'different department' : 'outside 7-20h') + ').'), parts: [{ type: 'table', label: 'policy evaluation', columns: ['rule', 'condition', 'result'], rows: rows.map(function (x) { return x.slice(); }), hl: { 0: r1 ? 'ok' : 'done' } }] });
          rows.push(['R2 permit', 'the subject is the patient (own record)', r2 ? '<span class="c-g">matches</span>' : 'no match']);
          frames.push({ narr: 'Rule <b>R2 (permit)</b>: patients may read their own record. ' + (r2 ? '<span class="c-g">Matches.</span>' : 'Does not match.'), parts: [{ type: 'table', label: 'policy evaluation', columns: ['rule', 'condition', 'result'], rows: rows.map(function (x) { return x.slice(); }), hl: { 1: r2 ? 'ok' : 'done' } }] });
          rows.push(['R3 deny', 'record is sensitive AND role is not doctor', r3 ? '<span class="c-r">matches</span>' : 'no match']);
          frames.push({ narr: 'Rule <b>R3 (deny)</b>: sensitive records are doctors-only. ' + (r3 ? '<span class="c-r">Matches, and a deny always wins over a permit.</span>' : 'Does not match.'), parts: [{ type: 'table', label: 'policy evaluation', columns: ['rule', 'condition', 'result'], rows: rows.map(function (x) { return x.slice(); }), hl: { 2: r3 ? 'bad' : 'done' } }] });
          frames.push({ narr: 'Combine: <b>deny overrides</b>, and if nothing permits, <b>default deny</b>. ' + (decision ? '<span class="c-g">Result: ALLOW.</span>' : '<span class="c-r">Result: DENY' + (r3 ? ' (R3 deny overrides)' : ' (no permit rule matched)') + '.</span>'), parts: [{ type: 'vars', vals: { permitMatched: permit ? 'yes' : 'no', denyMatched: r3 ? 'yes' : 'no', decision: decision ? 'ALLOW' : 'DENY' }, hl: { decision: decision ? 'ok' : 'bad' } }] });
          return frames;
        }
      }
    ],
    examples: [
      {
        title: 'The classic IDOR / BOLA bug and its fix', html: `<p>Vulnerable endpoint (the user is logged in, but nothing checks <i>whose</i> order it is):</p>
        <pre>GET /api/orders/124   (logged in as customer 7)
SELECT * FROM orders WHERE id = 124;      -- returns customer 9's order!</pre>
        <p>Fix: include the owner in the query, or check after loading, and answer <b>404</b> so existence does not leak:</p>
        <pre>SELECT * FROM orders WHERE id = 124 AND customer_id = 7;   -- 0 rows -> 404</pre>
        <p>Using random UUIDs instead of counters makes guessing harder, but it is <b>not</b> authorization. Always check.</p>`
      },
      {
        title: 'Multi-tenant SaaS: roles are scoped to a tenant', html: `<p>"Admin" must mean "admin <i>of that company</i>", not global admin. Store role assignments as <code>(user, role, tenant)</code>, and put <code>tenant_id</code> in every query and every cache key.</p>
        ${H.table(['user', 'role', 'tenant'], [['sam', 'admin', 'acme'], ['sam', 'viewer', 'globex']])}
        <p>Sam can manage users in Acme but only read in Globex. Add database <b>row-level security</b> (e.g. PostgreSQL RLS with <code>tenant_id = current_setting('app.tenant')</code>) as a second line of defence.</p>`
      },
      {
        title: 'Role explosion and how to avoid it', html: `<p>Requirement: "Editors can publish articles only in their own region, and only if the article is not locked." With pure RBAC you create <code>editor-eu</code>, <code>editor-us</code>, <code>editor-apac</code>... times status.</p>
        <p>Better: keep <b>one</b> role <code>editor</code> and add an attribute rule: <code>subject.region == article.region AND NOT article.locked</code>. Roles describe <i>kind of job</i>, attributes describe <i>situation</i>. That hybrid is what most real systems use.</p>`
      },
      {
        title: 'Scopes and roles together', html: `<p>A mobile app has a token with scope <code>orders:read</code>. The user has the <code>admin</code> role. Can the app delete orders? <b>No.</b> Effective permission = user's rights ∩ token's scopes. The user could delete in the web console, but this app was only granted read access by that user.</p>`
      }
    ],
    deepDive: `<p>🟣 <b>PEP / PDP / PAP / PIP.</b> The XACML vocabulary is useful in interviews: the <b>Policy Enforcement Point</b> (your controller or gateway filter) asks a <b>Policy Decision Point</b> (the engine) "may X do Y on Z?"; policies are written in the <b>Policy Administration Point</b>; the PDP fetches missing attributes from <b>Policy Information Points</b> (HR database, device posture). Engines you can name: <b>OPA/Rego</b>, <b>AWS Cedar</b> (also used by Amazon Verified Permissions), <b>Casbin</b>, <b>Cerbos</b>; for relationship graphs: <b>SpiceDB</b>, <b>OpenFGA</b>, <b>Ory Keto</b>.</p>
      <p><b>List endpoints are harder than single checks.</b> "Show all documents I can see" cannot call the engine once per row. Options: push the filter into SQL (<code>WHERE tenant_id = ? AND (owner_id = ? OR id IN (shared_ids))</code>), ask the ReBAC system to <i>list</i> accessible objects (SpiceDB calls this LookupResources, OpenFGA calls it ListObjects) then query the DB, or use row-level security. Pagination plus post-filtering leaks counts and breaks page sizes.</p>
      <p><b>Consistency matters.</b> Zanzibar introduced "zookies": a token that says "evaluate permissions at least as new as this write", solving the <i>new enemy problem</i> (removing someone from a group and then immediately sharing a document must not show it to them because of stale replicas). In small systems the same worry shows up as cached permissions in JWT claims: the revoke does not apply until expiry.</p>
      <p><b>Performance.</b> RBAC check is a set lookup (microseconds, cacheable per user). ABAC cost depends on attribute fetching, so cache attributes with short TTLs and keep policy evaluation pure (no I/O inside rules). Log every decision (who, what, which rule, result) for audit; for deny, log the failing rule to help support.</p>
      <p><b>Testing.</b> Treat authorization as a matrix test: for every endpoint × role (plus anonymous and cross-tenant), assert the expected status code. This catches regressions when a new endpoint is added without a check. Frameworks that protect all routes by default (Spring <code>anyRequest().authenticated()</code>) beat opt-in annotations.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI features introduce <b>new authorization surfaces</b>. A retrieval-augmented chatbot must only retrieve documents the <i>asking user</i> may read; if the vector index ignores ACLs, the model happily summarises the CEO's private memo. Agents that call tools must act with the user's permissions (delegation, on-behalf-of tokens), not a super-powered service account. Authorisation must live in the tools and the data layer, never in the system prompt ("please do not reveal salaries").</p>
      <p><b>Use AI as a partner:</b> <code>Generate an endpoint x role test matrix from this OpenAPI file and list endpoints that have no authorization annotation</code>, or <code>Convert these English access rules into Rego policies and 10 allow/deny test cases</code>.</p>
      <p><b>Where AI goes wrong:</b> it writes controllers that check only "is authenticated", forgets tenant filters, puts role checks in the frontend, invents Spring expressions that compile but never match, and "fixes" a 403 by widening a role. Review every generated policy for the deny paths.</p>
      <p><b>What you must still own:</b> the access model itself (who should be able to do what, and why), separation-of-duties rules, and sign-off from the data owner. Security rules are business decisions before they are code.</p>`,
    problems: [
      {
        title: 'Build an RBAC Permission Checker', level: 'Easy', tags: ['RBAC', 'authorization', 'deny by default'], companies: ['Amazon', 'Microsoft'],
        statement: `<p>Design and implement <code>can(user, permission)</code> for an app with roles <code>viewer</code>, <code>editor</code>, <code>admin</code>. A user may have several roles. Unknown users or permissions must be denied. Then explain how you would add "editors may only edit posts in their own team".</p>`,
        constraints: `Up to 10<sup>5</sup> users, 50 roles, check must run in O(roles of user) and be cache friendly.`,
        example: `<p>alice=[editor], dave=[viewer, editor]. can(alice, post:write) → ${H.c('g', 'true')}; can(alice, post:delete) → ${H.c('r', 'false')}; can(nobody, post:read) → ${H.c('r', 'false (default deny)')}; can(dave, post:write) → ${H.c('g', 'true (union of roles)')}.</p>`,
        brute: { why: `<p>Scatter <code>if (user.isAdmin()) ... else if (user.name.equals("alice"))</code> checks through controllers. Rules become impossible to audit, one forgotten branch is a vulnerability, and every new role means editing every endpoint.</p>` },
        mcq: { q: 'A user has roles viewer and editor. Which permissions do they get?', options: ['Only the intersection of the two roles', 'Only the highest role', 'The union of both roles\' permissions', 'None until an admin approves'], answer: 2, explain: 'Standard RBAC grants the union of all assigned roles\' permissions (deny rules, if you support them, are a separate feature).' },
        hints: [`<p>Aha: separate two small maps: <code>role → set of permissions</code> and <code>user → set of roles</code>.</p>`, `<p>The check is "any role of this user contains the permission", using sets for O(1) lookups.</p>`, `<p>Edge cases: unknown user → empty roles → false; unknown permission → false; role removed → disappears next request. For team scoping add an object-level rule: <code>post.teamId == user.teamId</code>.</p>`],
        solution: {
          approach: `<p>Keep two maps: <code>rolePermissions: Map&lt;Role, Set&lt;Permission&gt;&gt;</code> loaded from configuration or DB, and <code>userRoles: Map&lt;UserId, Set&lt;Role&gt;&gt;</code>. <code>can(user, p)</code> iterates the user's roles and returns true as soon as one role's set contains <code>p</code>; if the user is unknown the loop does not run and the answer is false (deny by default). Use enums or constants for permissions so typos fail at compile time.</p>
          <p>For "editors only in their own team", RBAC alone cannot express it because the decision depends on the <b>object</b>. Keep the role <code>editor</code> and add an attribute check in the same policy function: <code>can(user, 'post:write', post)</code> returns <code>hasRole(editor) &amp;&amp; post.teamId == user.teamId</code> (admins bypass). This hybrid avoids role explosion (<code>editor-teamA</code>, <code>editor-teamB</code>...).</p>
          <p>Operationally: cache each user's flattened permission set for a short time, invalidate on role change, log denies, and cover the matrix with tests (every role against every endpoint).</p>`,
          code: `import java.util.*;

class PermissionChecker {
    private final Map<String, Set<String>> rolePermissions = new HashMap<>();
    private final Map<String, Set<String>> userRoles = new HashMap<>();

    void grant(String role, String... permissions) {
        rolePermissions.computeIfAbsent(role, r -> new HashSet<>()).addAll(Arrays.asList(permissions));
    }
    void assign(String user, String role) {
        userRoles.computeIfAbsent(user, u -> new HashSet<>()).add(role);
    }
    /** Deny by default: unknown users or permissions fall through to false. */
    boolean can(String user, String permission) {
        for (String role : userRoles.getOrDefault(user, Collections.emptySet())) {
            if (rolePermissions.getOrDefault(role, Collections.emptySet()).contains(permission)) return true;
        }
        return false;
    }
    /** Hybrid: role gives the verb, an attribute rule gives the scope. */
    boolean canEditPost(String user, String userTeam, String postTeam) {
        return can(user, "post:write") && (userTeam.equals(postTeam) || can(user, "user:manage"));
    }
}`,
          alt: [{ lang: 'python', run: true, code: `role_perms = {"viewer": {"post:read"}, "editor": {"post:read", "post:write"}, "admin": {"post:read", "post:write", "post:delete"}}\nuser_roles = {"alice": {"editor"}, "dave": {"viewer", "editor"}}\n\ndef can(user, perm):\n    return any(perm in role_perms.get(r, set()) for r in user_roles.get(user, set()))\n\nprint(can("alice", "post:write"), can("alice", "post:delete"), can("nobody", "post:read"), can("dave", "post:write"))\n` }],
          dry: { head: ['Call', 'Roles found', 'Role has permission?', 'Result'], rows: [['can(alice, post:write)', 'editor', 'yes', '<span class="c-g">true</span>'], ['can(alice, post:delete)', 'editor', 'no', '<span class="c-r">false</span>'], ['can(nobody, post:read)', '(none)', '-', '<span class="c-r">false</span>']] },
          complexity: `<p>O(r) per check where r = roles of the user (usually below 5), each lookup O(1). Memory: one set per role and per user.</p>`,
          followUps: ['How would you support role inheritance (admin includes editor)?', 'How would you support explicit deny rules?']
        }
      },
      {
        title: 'Evaluate an ABAC Policy with Deny-Overrides', level: 'Medium', tags: ['ABAC', 'policy', 'authorization'], companies: ['Google', 'AWS'],
        statement: `<p>Implement <code>decide(request)</code> over a list of policies, each with an effect (permit or deny) and a condition over subject, resource, action and environment attributes. Use <b>deny-overrides</b> and <b>default deny</b>. Show your result for a nurse reading a sensitive record.</p>`,
        constraints: `Policy count up to a few hundred; conditions are pure functions (no I/O); decision under 1 ms.`,
        example: `<p>R1 permit: clinical staff, same department, 7-20h. R3 deny: sensitive records for non-doctors. Nurse + same department + 14:00 + sensitive record → R1 matches, R3 matches → ${H.c('r', 'DENY (deny overrides)')}.</p>`,
        brute: { why: `<p>Hard-code one giant <code>if/else</code> ladder inside every endpoint. Rules duplicate, orderings differ between services, and nobody can answer "why was this denied?".</p>` },
        mcq: { q: 'Two policies match: one permit, one deny. With deny-overrides the result is…', options: ['permit', 'deny', 'whichever was written first', 'ask the user'], answer: 1, explain: 'Deny-overrides: any matching deny wins. If nothing matches at all, default deny applies.' },
        hints: [`<p>Aha: separate <b>what to check</b> (policy data) from <b>how to combine</b> (algorithm).</p>`, `<p>Evaluate every policy against the request context; collect the matches; if any deny matched → deny; else if any permit matched → permit; else deny.</p>`, `<p>Return the matched rule ids so support can explain a denial; make conditions pure so they are testable.</p>`],
        solution: {
          approach: `<p>Model each policy as <code>{id, effect, condition(ctx)}</code> where <code>ctx = {subject, resource, action, env}</code>. The decision function runs all conditions and then combines results: if any matched policy has effect deny, return deny with the denying ids; else if any matched policy has effect permit, return permit with those ids; else return deny with reason "no rule matched" (default deny). Evaluating every rule (instead of stopping at the first permit) is what makes deny-overrides correct, because a later deny must still be able to win. Keep conditions free of I/O: fetch attributes before the call (PIP), cache them briefly, and pass them in. Return the rule ids for audit logs and for user-friendly error messages. Alternative combining algorithms are permit-overrides and first-applicable; security-sensitive systems choose deny-overrides. Worked answer for the nurse: R1 matches (nurse, same dept, hour 14), R3 matches (sensitive, role not doctor) → deny overrides → <b>DENY</b>, reason R3. The runnable JavaScript example in this topic implements exactly this and prints the decisions for five cases.</p>`,
          code: { lang: 'js', run: true, code: `const policies = [\n  { id: 'R1', effect: 'permit', when: c => ['doctor', 'nurse'].includes(c.subject.role) && c.subject.dept === c.resource.dept && c.env.hour >= 7 && c.env.hour <= 20 },\n  { id: 'R3', effect: 'deny', when: c => c.resource.sensitive && c.subject.role !== 'doctor' }\n];\nfunction decide(ctx) {\n  const hits = policies.filter(p => p.when(ctx));\n  const denies = hits.filter(p => p.effect === 'deny');\n  if (denies.length) return { allow: false, rules: denies.map(p => p.id) };\n  const permits = hits.filter(p => p.effect === 'permit');\n  return permits.length ? { allow: true, rules: permits.map(p => p.id) } : { allow: false, rules: [] };\n}\nconsole.log(decide({ subject: { role: 'nurse', dept: 'cardio' }, resource: { dept: 'cardio', sensitive: true }, env: { hour: 14 } }));\nconsole.log(decide({ subject: { role: 'nurse', dept: 'cardio' }, resource: { dept: 'cardio', sensitive: false }, env: { hour: 14 } }));` },
          complexity: `<p>O(P) per decision for P policies (each condition O(1)). Index policies by action/resource type to prune in big systems.</p>`,
          followUps: ['How would you explain a denial to an end user without leaking policy details?', 'How would you test 300 policies for conflicts?']
        }
      }
    ]
  });

  /* =====================================================================
     TOPIC 8 — API keys
     ===================================================================== */
  topics.push({
    title: 'API Keys: Issue, Store, Scope, Rotate',
    analogy: `<p>An API key is a <b>hotel key card for a program</b>, not a person. The card has a printed number on it (the public <i>key id</i>) and a secret magnetic stripe. The hotel does not keep a copy of the stripe, only a fingerprint of it. If you lose the card, the desk deactivates that one card and issues a new one, and your other cards keep working.</p>`,
    explain: `<p>🟢 An <b>API key</b> is a long random string a developer puts in their code so your API can recognise <i>which application</i> is calling. It identifies a <b>client</b>, not a human, and it is a <b>bearer secret</b>: whoever holds it can use it.</p>
      <p><b>Good key design:</b></p>
      <ul>
        <li><b>Random and long:</b> at least 128 bits (preferably 256) from a secure random generator, e.g. <code>sk_live_</code> + 32 random bytes in base62/base64url.</li>
        <li><b>Readable prefix:</b> <code>sk_live_</code>, <code>pk_test_</code>: shows environment and type, and lets secret scanners (GitHub) detect leaks.</li>
        <li><b>Key id + secret:</b> store a short public <code>key_id</code> for lookup and logging, and only a <b>hash</b> of the secret. Show the full key <b>once</b>, at creation.</li>
        <li><b>Fast hash is fine:</b> SHA-256 of a 256-bit random key cannot be brute forced, so you do not need bcrypt/argon2 (unlike passwords, which humans choose).</li>
        <li><b>Scopes and limits:</b> each key gets specific permissions, an owner, an expiry, IP allow-list, and a rate limit / quota.</li>
        <li><b>Rotation:</b> allow two active keys per client so they can switch without downtime; revoke instantly; record <code>last_used_at</code> to find forgotten keys.</li>
      </ul>
      ${H.table(['', 'API key', 'OAuth2 access token', 'Session cookie'], [
        ['Identifies', 'an app / project', 'app acting for a user (or service)', 'a logged-in human in a browser'],
        ['Lifetime', 'long (months) until rotated', 'short (minutes)', 'minutes to days'],
        ['Best for', 'simple server-to-server, public data APIs, developer platforms', 'user-delegated access, many scopes', 'websites'],
        ['Weakness', 'long-lived bearer secret; leaks via git, logs, client-side code', 'more machinery', 'CSRF']
      ])}
      <p><b>Where to send it:</b> in a header (<code>Authorization: Bearer ...</code> or <code>X-API-Key</code>), <b>never in the URL query string</b> (URLs end up in logs, history and Referer headers). <b>Never ship a secret key in a browser or mobile app</b>: anyone can extract it. Browser-side keys must be limited "publishable" keys with tight restrictions (allowed origins, read-only scopes), or requests must go through your backend.</p>
      <p><b>Lookup flow:</b> request arrives with <code>sk_live_ab12cd_SECRET</code> → split into id <code>ab12cd</code> and secret → load row by id → compare <code>SHA-256(secret)</code> with stored hash in constant time → check not revoked / not expired / scope allows this call / rate limit OK → proceed and update <code>last_used_at</code>.</p>`,
    clues: [
      '"Third-party developers call our API" → API keys (or OAuth client credentials) with scopes, quotas and rotation',
      '"How do you store API keys?" → hash them (SHA-256), show once, keep a prefix/id for lookup',
      '"A key was committed to GitHub" → revoke immediately, rotate, scan history, add secret scanning/pre-commit hooks',
      '"Rotate without downtime" → two active keys per client, overlap period',
      '"Per-customer rate limits and billing" → key id is the identity for metering',
      '"Key in a mobile app / frontend JS" → cannot be secret; use restricted publishable keys or a backend proxy',
      '"API key vs JWT/OAuth" → long-lived opaque secret for a client vs short-lived signed token for a user/service'
    ],
    code: [
      {
        lang: 'python', run: true, title: 'Issue, store (hashed) and verify API keys', code: `import hashlib, hmac, secrets

DB = {}   # key_id -> record. In production: a table with an index on key_id.

def issue_key(owner, scopes, env="live"):
    key_id = secrets.token_hex(4)                              # short public id (lookup, logs, support)
    secret = secrets.token_urlsafe(32)                         # 256 bits of randomness
    DB[key_id] = {
        "owner": owner, "scopes": set(scopes), "revoked": False,
        "hash": hashlib.sha256(secret.encode()).hexdigest(),   # store ONLY the hash
    }
    return "sk_" + env + "_" + key_id + "_" + secret           # shown to the customer exactly once

def authenticate(presented, needed_scope):
    try:
        prefix, env, key_id, secret = presented.split("_", 3)
    except ValueError:
        return "401 malformed key"
    rec = DB.get(key_id)
    candidate = hashlib.sha256(secret.encode()).hexdigest()
    stored = rec["hash"] if rec else "0" * 64                  # compare anyway: same timing for unknown ids
    if not hmac.compare_digest(candidate, stored) or rec is None:
        return "401 invalid key"
    if rec["revoked"]:
        return "401 revoked key"
    if needed_scope not in rec["scopes"]:
        return "403 key lacks scope " + needed_scope
    return "200 OK for " + rec["owner"]

key = issue_key("acme-billing", ["invoices:read"])
print("shown once   :", key[:14] + "..." + "(redacted)")
print("read invoices:", authenticate(key, "invoices:read"))
print("write        :", authenticate(key, "invoices:write"))
print("tampered     :", authenticate(key[:-3] + "xyz", "invoices:read"))
DB[key.split("_")[2]]["revoked"] = True
print("after revoke :", authenticate(key, "invoices:read"))
`
      },
      {
        lang: 'java', title: 'Plain Java: generate a key and hash it for storage', code: `import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

public class ApiKeys {
    private static final SecureRandom RNG = new SecureRandom();
    private static final Base64.Encoder B64 = Base64.getUrlEncoder().withoutPadding();

    static String randomPart(int bytes) {
        byte[] b = new byte[bytes];
        RNG.nextBytes(b);
        return B64.encodeToString(b);
    }

    static String sha256Hex(String s) throws Exception {
        byte[] d = MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder();
        for (byte x : d) sb.append(String.format("%02x", x));
        return sb.toString();
    }

    public static void main(String[] args) throws Exception {
        String keyId = randomPart(6);                  // public, stored in plain text, indexed
        String secret = randomPart(32);                // 256 bits, shown once
        String fullKey = "sk_live_" + keyId + "_" + secret;
        String storedHash = sha256Hex(secret);         // only this goes into the database

        // verification: recompute and compare in constant time
        boolean ok = MessageDigest.isEqual(
            storedHash.getBytes(StandardCharsets.UTF_8), sha256Hex(secret).getBytes(StandardCharsets.UTF_8));
        System.out.println("prefix shown in UI: sk_live_" + keyId + "_****");
        System.out.println("verifies: " + ok + ", stored hash length: " + storedHash.length());
    }
}`
      },
      {
        lang: 'js', check: false, title: 'Express middleware: API key auth + rate limit per key', code: `const crypto = require('crypto');

async function apiKeyAuth(req, res, next) {
  const header = req.get('authorization') || '';            // "Bearer sk_live_<id>_<secret>"
  const presented = header.startsWith('Bearer ') ? header.slice(7) : '';
  const [, , keyId, secret] = presented.split('_');
  if (!keyId || !secret) return res.status(401).json({ error: 'missing or malformed API key' });

  const rec = await keys.findById(keyId);                    // indexed lookup by public id
  const hash = crypto.createHash('sha256').update(secret).digest();
  const stored = rec ? Buffer.from(rec.hashHex, 'hex') : Buffer.alloc(32);
  const match = crypto.timingSafeEqual(hash, stored) && rec && !rec.revoked && rec.expiresAt > Date.now();
  if (!match) return res.status(401).json({ error: 'invalid API key' });

  if (!(await limiter.allow(keyId))) return res.status(429).set('Retry-After', '1').end();   // per-key quota
  req.client = { keyId, owner: rec.owner, scopes: rec.scopes };
  keys.touch(keyId);                                          // last_used_at, for cleaning forgotten keys
  next();
}
app.get('/invoices', apiKeyAuth, requireScope('invoices:read'), listInvoices);`
      }
    ],
    codeTitle: ['Python: issue / store / verify (runnable)', 'Java: generate + hash', 'Express middleware'],
    viz: {
      title: 'API key lifecycle: issue, store the hash, verify',
      input: 'invoices:read',
      inputLabel: 'Scope the request needs (the key was issued with invoices:read only)',
      gen: function (input) {
        var need = String(input || '').trim().toLowerCase();
        if (!/^[a-z]+:[a-z]+$/.test(need)) throw new Error('Type a scope like invoices:read or invoices:write');
        var keyId = 'ab12cd', secret = 'Zx9QmP0lK4vT7wRn';
        var hash = toyHash(secret);
        var frames = [];
        frames.push({ narr: 'Customer clicks <b>Create API key</b>. The server draws random bytes for a public <code>key_id</code> and a secret, and builds the full key.', parts: [
          { type: 'map', label: 'generated (shown ONCE to the customer)', entries: [['key_id', keyId], ['secret', secret], ['full key', 'sk_live_' + keyId + '_' + secret]], hl: { 'full key': 'cur' } }
        ] });
        frames.push({ narr: 'The database stores only the id, a <b>hash</b> of the secret, owner, scopes, and flags. If the DB leaks, the attacker has fingerprints, not keys. (The hash here is a toy for display.)', parts: [
          { type: 'table', label: 'api_keys table', columns: ['key_id', 'secret_hash', 'owner', 'scopes', 'revoked'], rows: [[keyId, hash, 'acme-billing', 'invoices:read', 'no']], hl: { 0: 'ok' } }
        ] });
        frames.push({ narr: 'Later the customer\'s server calls the API: <code>Authorization: Bearer sk_live_' + keyId + '_...</code> asking for <b>' + H.esc(need) + '</b>. The API splits the key and finds the row by <code>key_id</code> (fast indexed lookup).', parts: [
          { type: 'queue', label: 'verification pipeline', items: ['split key', 'lookup by key_id', 'hash(secret) == stored?', 'revoked/expired?', 'scope allowed?', 'rate limit'], frontLabel: 'start', backLabel: 'allow', hl: { 1: 'cur' } }
        ] });
        frames.push({ narr: 'It hashes the presented secret and compares with the stored hash in constant time: <span class="c-g">equal</span>. The key is genuine.', parts: [
          { type: 'vars', vals: { presentedHash: hash, storedHash: hash, equal: 'true' }, hl: { equal: 'ok' } }
        ] });
        var allowed = need === 'invoices:read';
        frames.push({ narr: allowed ? 'Scope check: the key has <code>invoices:read</code> and the call needs <code>' + H.esc(need) + '</code>. <span class="c-g">Allowed.</span> The per-key rate limiter also says OK, and <code>last_used_at</code> is updated.' : 'Scope check: the key only has <code>invoices:read</code> but the call needs <code>' + H.esc(need) + '</code>. <span class="c-r">403 Forbidden</span>: the key is valid (so not 401), but not allowed to do this.', parts: [
          { type: 'table', label: 'scope check', columns: ['key scopes', 'needed', 'result'], rows: [['invoices:read', need, allowed ? '<span class="c-g">allow</span>' : '<span class="c-r">403</span>']], hl: { 0: allowed ? 'ok' : 'bad' } }
        ] });
        frames.push({ narr: '<b>Revocation:</b> the key leaks on GitHub. Support sets <code>revoked = yes</code>. Because we look the key up on every request, the next call fails immediately. No waiting for expiry.', parts: [
          { type: 'table', label: 'api_keys table after revoke', columns: ['key_id', 'secret_hash', 'owner', 'scopes', 'revoked'], rows: [[keyId, hash, 'acme-billing', 'invoices:read', '<span class="c-r">YES</span>']], hl: { 0: 'bad' } }
        ] });
        frames.push({ narr: '<b>Rotation without downtime:</b> issue a second key, let the customer deploy it, watch <code>last_used_at</code> on the old key stop moving, then delete the old key.', parts: [
          { type: 'table', label: 'two active keys during rotation', columns: ['key_id', 'status', 'last used'], rows: [[keyId, 'old (to retire)', '2 days ago'], ['ef56gh', 'new', 'just now']], hl: { 0: 'done', 1: 'ok' } }
        ] });
        return frames;
      }
    },
    examples: [
      {
        title: 'A key leaked on GitHub: the first 30 minutes', html: `<ol><li><b>Revoke</b> the key now (do not wait to investigate).</li><li>Issue a replacement, give it to the owner through a secure channel.</li><li>Query logs by <code>key_id</code> for the exposure window: unusual IPs, volumes, data read.</li><li>Remove from Git history (and assume it is already copied; history rewriting does not un-leak).</li><li>Add prevention: secret scanning (GitHub push protection, gitleaks), keys loaded from env/secrets manager, short expiries.</li></ol>`
      },
      {
        title: 'Why SHA-256 is enough here but not for passwords', html: `<p>Password: a human picks it from a small guessable space (millions of likely strings), so you need a slow hash to make guessing expensive. API key: 256 random bits, a space of 2<sup>256</sup> values. Even at 10<sup>12</sup> guesses/second, brute force takes longer than the age of the universe. So a plain SHA-256 is safe and keeps per-request verification cheap.</p><p>Rule: slow hashes are for <b>low-entropy</b> secrets; fast hashes are fine for <b>high-entropy</b> random secrets.</p>`
      },
      {
        title: 'Scopes and quotas per key', html: `${H.table(['Key', 'Scopes', 'Rate limit', 'Expires'], [['sk_live_ab12..', 'invoices:read', '100 req/s', 'in 90 days'], ['sk_live_ef56..', 'invoices:read, invoices:write', '20 req/s', 'in 30 days'], ['pk_live_9z8y..', 'catalog:read (browser, origin-locked)', '10 req/s per IP', 'never (low risk)']])}<p>Different keys per environment and per integration limit the blast radius: the reporting job never needs write access.</p>`
      }
    ],
    deepDive: `<p>🟣 <b>Format choices.</b> Opaque random keys are simplest. Some platforms embed a checksum in the key (so scanners can verify candidates offline with few false positives) and a type prefix (GitHub tokens: <code>ghp_</code>). A "key id + secret" split avoids a full-table scan on hash and lets you log the id safely. Avoid HMAC-of-id schemes that make keys derivable from a master secret: a master leak forges all keys.</p>
      <p><b>Hardening.</b> Per-key rate limits and quotas (token bucket in Redis), IP allow-lists, expiry dates, anomaly alerts (sudden new country, 100x volume), and mTLS or request signing (AWS SigV4 / HMAC of the request) when the secret must never cross the wire: the client sends a signature over method, path, timestamp and body hash, so a captured request cannot be replayed for other calls and the secret itself is never transmitted.</p>
      <p><b>Operational reality.</b> Keys leak through client-side bundles, Postman collections, CI logs, screenshots, support tickets and chat. Give customers a way to restrict and rotate, show only the last 4 characters in the UI, and send a notification when a key is created or used from a new place. Store audit events (created, used first time, revoked, by whom).</p>
      <p><b>When to prefer OAuth.</b> If third parties act on behalf of <i>your users</i>, use OAuth2 so users can grant and revoke per app. If you only need to identify a developer project calling public or lightly sensitive data, API keys are fine. For service-to-service inside your company prefer workload identity (mTLS, SPIFFE, cloud IAM roles, OIDC tokens) over static keys that nobody rotates.</p>`,
    aiEra: `<p><b>What AI changes:</b> API keys are now the glue of AI products: provider keys for LLM APIs, keys in agent configs, MCP server credentials. Leaked LLM keys are abused within minutes (huge bills, data exposure) and bots scan public repos and notebooks continuously. Developers also paste snippets with real keys into chat tools and AI-generated code sometimes hard-codes them.</p>
      <p><b>Use AI as a partner:</b> <code>Review this repo for hard-coded secrets and show me how to move them to environment variables and a secrets manager</code>, or <code>Design a key-rotation runbook with zero downtime for 200 customers</code>.</p>
      <p><b>Where AI goes wrong:</b> it puts <code>?api_key=</code> in URLs, stores keys in plain text "for simplicity", uses <code>===</code> comparison (timing leak), and suggests client-side secret keys. Use separate budgets and scoped keys for agents, and set spending limits.</p>
      <p><b>What you must still own:</b> key scope design, rotation policy, incident response, and never pasting real keys into any assistant, issue tracker or screenshot.</p>`,
    problems: [
      {
        title: 'Design an API Key System for a Developer Platform', level: 'Medium', tags: ['API keys', 'hashing', 'rotation', 'design'], companies: ['Stripe', 'Twilio', 'GitHub'],
        statement: `<p>Design API key management for a platform with 50,000 customers: creation, storage, verification on the hot path (20k req/s), scopes, rate limits, rotation with no downtime, leak response, and what the dashboard shows.</p>`,
        constraints: `Verification under 2 ms p99. DB leak must not expose usable keys. Customers must rotate keys without outage.`,
        example: `<p>Create → shown once: <code>sk_live_ab12cd_&lt;secret&gt;</code>. DB row: id <code>ab12cd</code>, ${H.c('g', 'SHA-256(secret)')}, scopes, owner, expiry. UI later shows <code>sk_live_ab12cd_****</code>.</p>`,
        brute: { why: `<p>Store keys in plain text and scan the table for each request, with one global key per customer. A DB leak hands attackers every key, lookups are slow, and there is no way to rotate or scope.</p>` },
        mcq: { q: 'Why is a fast hash (SHA-256) acceptable for API key storage?', options: ['Keys are short', 'Keys are random with 256 bits of entropy, so brute force is infeasible', 'Hashing is optional for keys', 'SHA-256 is reversible'], answer: 1, explain: 'High-entropy random secrets cannot be brute forced, so you do not need a slow password hash.' },
        hints: [`<p>Aha: split the key into a public id (lookup) and a secret (verified by hash).</p>`, `<p>Cache the verified result for a few seconds in memory/Redis keyed by key id + hash to hit 20k req/s; invalidate on revoke through pub/sub.</p>`, `<p>Rotation = two active keys per client + <code>last_used_at</code>; leak response = instant revoke, audit by key id, secret-scanning partnership.</p>`],
        solution: {
          approach: `<p><b>Format:</b> <code>sk_{env}_{key_id}_{secret}</code>, secret = 32 random bytes base64url. The prefix enables secret scanners; env prevents test keys hitting prod.</p>
          <p><b>Storage:</b> table <code>api_keys(key_id PK, secret_sha256, owner_id, scopes, env, created_at, expires_at, revoked_at, last_used_at)</code>. The full key is shown once at creation; the dashboard shows <code>sk_live_ab12cd_****</code> plus created/last-used.</p>
          <p><b>Hot path:</b> parse → lookup by key_id (in-process LRU/Redis cache with 30 s TTL; DB as source of truth) → SHA-256 compare in constant time → check revoked/expired → scope check against the endpoint's required scope → per-key token-bucket rate limit in Redis → forward. Revocation publishes an event that evicts the cache so it takes effect in seconds. Cost: one hash and one cache hit, well under 2 ms.</p>
          <p><b>Rotation:</b> allow 2+ active keys; customer creates the new one, deploys, watches the old one's last_used_at go quiet, then revokes it. Optional expiry reminders at 30/7 days.</p>
          <p><b>Leak response:</b> enrol in GitHub secret scanning so leaked <code>sk_live_</code> keys trigger an automatic revoke webhook; support can revoke instantly; audit logs per key id; email the owner. Add IP allow-lists and anomaly alerts for sensitive scopes.</p>`,
          complexity: `<p>O(1) per request: one indexed/cached lookup, one SHA-256, one rate-limit counter. Storage about 150 bytes per key.</p>`,
          followUps: ['How would you let browsers use the API safely?', 'When would you move customers from API keys to OAuth client credentials?']
        }
      }
    ]
  });

  // Minimal SHA-1 / HMAC-SHA1 so the TOTP visualizer can compute REAL codes in any sandbox (teaching code).
  function sha1(bytes) {
    var h0 = 0x67452301, h1 = 0xEFCDAB89, h2 = 0x98BADCFE, h3 = 0x10325476, h4 = 0xC3D2E1F0;
    var msg = bytes.slice(), bitLen = bytes.length * 8, i, j, w = new Array(80);
    msg.push(0x80);
    while (msg.length % 64 !== 56) msg.push(0);
    for (i = 7; i >= 0; i--) msg.push(i >= 4 ? 0 : (bitLen >>> (i * 8)) & 255);
    function rol(x, n) { return ((x << n) | (x >>> (32 - n))) >>> 0; }
    for (i = 0; i < msg.length; i += 64) {
      for (j = 0; j < 16; j++) w[j] = ((msg[i + 4 * j] << 24) | (msg[i + 4 * j + 1] << 16) | (msg[i + 4 * j + 2] << 8) | msg[i + 4 * j + 3]) >>> 0;
      for (j = 16; j < 80; j++) w[j] = rol(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);
      var a = h0, b = h1, c = h2, d = h3, e = h4, f, k, t;
      for (j = 0; j < 80; j++) {
        if (j < 20) { f = (b & c) | (~b & d); k = 0x5A827999; }
        else if (j < 40) { f = b ^ c ^ d; k = 0x6ED9EBA1; }
        else if (j < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8F1BBCDC; }
        else { f = b ^ c ^ d; k = 0xCA62C1D6; }
        t = (rol(a, 5) + f + e + k + w[j]) >>> 0;
        e = d; d = c; c = rol(b, 30); b = a; a = t;
      }
      h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0; h4 = (h4 + e) >>> 0;
    }
    var out = [];
    [h0, h1, h2, h3, h4].forEach(function (x) { out.push((x >>> 24) & 255, (x >>> 16) & 255, (x >>> 8) & 255, x & 255); });
    return out;
  }
  function hmacSha1(key, msg) {
    var k = key.slice(), i;
    if (k.length > 64) k = sha1(k);
    while (k.length < 64) k.push(0);
    var ipad = [], opad = [];
    for (i = 0; i < 64; i++) { ipad.push(k[i] ^ 0x36); opad.push(k[i] ^ 0x5c); }
    return sha1(opad.concat(sha1(ipad.concat(msg))));
  }
  function hex2(n) { return ('0' + n.toString(16)).slice(-2); }

  /* =====================================================================
     TOPIC 9 — MFA and TOTP
     ===================================================================== */
  topics.push({
    title: 'Multi-Factor Authentication & TOTP (RFC 6238)',
    analogy: `<p>Getting into a bank vault needs <b>two different keys</b> held by two different things: something you <b>know</b> (a PIN) and something you <b>have</b> (a key card). Stealing one is not enough.</p>
      <p>A TOTP app is a <b>watch that you and the server set to the same secret at the start</b>. Every 30 seconds both of you independently work out the same 6-digit number from the secret and the clock. Nothing travels over the network except the number you type, and it is useless 30 seconds later.</p>`,
    explain: `<p>🟢 <b>MFA (multi-factor authentication)</b> means proving who you are with <b>two or more different kinds</b> of evidence:</p>
      ${H.table(['Factor', 'Example', 'Weakness'], [
        ['Something you <b>know</b>', 'password, PIN', 'phishing, reuse, leaks'],
        ['Something you <b>have</b>', 'phone with an authenticator app, hardware key, SMS to a SIM', 'theft; SMS can be hijacked (SIM swap)'],
        ['Something you <b>are</b>', 'fingerprint, face', 'cannot be changed if leaked; usually unlocks a device-held key']
      ])}
      <p><b>Ranking of second factors (weak → strong):</b> SMS/voice code → email code → <b>TOTP app</b> → push approval (beware "MFA fatigue" spam) → <b>passkeys / FIDO2 / WebAuthn hardware keys</b> (phishing-resistant: the browser only signs for the real domain).</p>
      <p><b>How TOTP works (Time-based One-Time Password):</b></p>
      <ol>
        <li><b>Enrolment:</b> the server creates a random secret (20 bytes), shows it as a QR code (<code>otpauth://totp/App:alice?secret=BASE32&amp;issuer=App</code>). The user's app stores it. The server stores it too (encrypted, because it must be readable to compute codes).</li>
        <li><b>Each login:</b> both sides compute <code>T = floor(unix_time / 30)</code>, then <code>HMAC-SHA1(secret, T as 8 bytes)</code>.</li>
        <li><b>Dynamic truncation:</b> take the last 4 bits of the HMAC as an offset, read 4 bytes there, drop the top bit (31-bit number), then take it <code>mod 10<sup>6</sup></code> and pad with zeros. That is the 6-digit code.</li>
        <li>The server accepts the code for the current 30-second step and usually one step either side (clock drift), but never accepts the <b>same code twice</b>.</li>
      </ol>
      <p><b>Must-have safety features:</b> rate-limit attempts (6 digits = only a million combinations!), lock or slow down after failures, one-time <b>backup/recovery codes</b> (store hashed), a re-verification step before disabling MFA, and alerts when MFA is changed. <b>Step-up MFA</b>: ask again only for risky actions (new device, changing email, sending money).</p>`,
    clues: [
      '"Add 2FA / authenticator app support" → TOTP (RFC 6238), secret per user, 30 s step, 6 digits',
      '"Why is SMS 2FA weaker?" → SIM swap, SS7 interception, phishing relays; prefer app/passkey',
      '"Phishing-resistant MFA" → FIDO2/WebAuthn passkeys (origin-bound)',
      '"User lost their phone" → recovery codes, support identity verification, never an easy bypass',
      '"Brute force the 6 digits" → rate limit, lockouts, and reject reuse of an accepted code',
      '"Codes do not work, clock drift" → accept ±1 step window, keep servers on NTP',
      '"Where do you store the TOTP secret?" → encrypted at rest (KMS/envelope), never logged; unlike passwords it cannot be hashed'
    ],
    code: [
      {
        lang: 'python', run: true, title: 'TOTP from scratch: HOTP + time step + drift window (RFC 4226 / 6238)', code: `import base64, hashlib, hmac, struct, time

def hotp(secret: bytes, counter: int, digits: int = 6) -> str:
    """RFC 4226: HMAC-SHA1 over the 8-byte counter, then dynamic truncation."""
    mac = hmac.new(secret, struct.pack(">Q", counter), hashlib.sha1).digest()   # 20 bytes
    offset = mac[-1] & 0x0F                                   # last 4 bits choose where to read
    word = struct.unpack(">I", mac[offset:offset + 4])[0] & 0x7FFFFFFF   # 31-bit integer (sign bit dropped)
    return str(word % (10 ** digits)).zfill(digits)

def totp(secret: bytes, at=None, step: int = 30, digits: int = 6) -> str:
    """RFC 6238: the counter is simply the number of 30-second steps since 1970."""
    now = time.time() if at is None else at
    return hotp(secret, int(now // step), digits)

def verify(secret: bytes, submitted: str, at=None, window: int = 1, step: int = 30) -> bool:
    """Accept the current step and +-window steps (clock drift). Constant-time compare."""
    counter = int((time.time() if at is None else at) // step)
    ok = False
    for drift in range(-window, window + 1):
        ok |= hmac.compare_digest(hotp(secret, counter + drift), submitted)   # no early exit
    return ok          # a real server ALSO remembers the last accepted counter to block replays

# Official RFC 6238 test secret (ASCII "12345678901234567890") - a published demo value, not a real credential
secret = b"12345678901234567890"
vectors = {59: "94287082", 1111111109: "07081804", 1111111111: "14050471", 1234567890: "89005924", 2000000000: "69279037"}
for t, expected in vectors.items():
    got = totp(secret, at=t, digits=8)
    print("t =", str(t).rjust(10), "->", got, "OK" if got == expected else "MISMATCH")

print("6-digit code at t=59       :", totp(secret, at=59))
print("provisioning secret (base32):", base64.b32encode(secret).decode())
print("code from 1 step ago accepted?", verify(secret, totp(secret, at=970), at=1000))
print("code from 5 steps ago accepted?", verify(secret, totp(secret, at=1000 - 150), at=1000))
`
      },
      {
        lang: 'java', title: 'Plain Java: TOTP with javax.crypto.Mac (HmacSHA1)', code: `import java.nio.ByteBuffer;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

public class Totp {
    static String hotp(byte[] secret, long counter, int digits) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA1");
        mac.init(new SecretKeySpec(secret, "HmacSHA1"));
        byte[] h = mac.doFinal(ByteBuffer.allocate(8).putLong(counter).array());   // big-endian 8 bytes
        int offset = h[h.length - 1] & 0x0F;                                        // dynamic truncation
        int word = ((h[offset] & 0x7F) << 24) | ((h[offset + 1] & 0xFF) << 16)
                 | ((h[offset + 2] & 0xFF) << 8) | (h[offset + 3] & 0xFF);
        int mod = 1;
        for (int i = 0; i < digits; i++) mod *= 10;
        return String.format("%0" + digits + "d", word % mod);
    }

    static String totp(byte[] secret, long unixSeconds, int digits) throws Exception {
        return hotp(secret, unixSeconds / 30, digits);
    }

    public static void main(String[] args) throws Exception {
        byte[] secret = "12345678901234567890".getBytes();            // RFC 6238 test secret (public demo value)
        System.out.println(totp(secret, 59L, 8));                      // 94287082 (RFC 6238 test vector)
        System.out.println(totp(secret, 1111111109L, 8));              // 07081804
        System.out.println("6 digits now-ish: " + totp(secret, System.currentTimeMillis() / 1000, 6));
    }
}`
      },
      {
        lang: 'java', check: false, title: 'Enrolment + login in a Spring/Node service (library-based, framework code)', code: `// Java: dev.samstevens.totp (or similar). SECRET IS ENCRYPTED AT REST; never logged.
SecretGenerator gen = new DefaultSecretGenerator(32);
String secret = gen.generate();                                    // base32 text
QrData qr = new QrData.Builder().label("alice@example.test").secret(secret)
        .issuer("DemoApp").algorithm(HashingAlgorithm.SHA1).digits(6).period(30).build();
String otpauth = qr.getUri();                                      // render as QR; user scans with an authenticator app

// Login step 2: after the password is correct, require the code
CodeVerifier verifier = new DefaultCodeVerifier(new DefaultCodeGenerator(), new SystemTimeProvider());
((DefaultCodeVerifier) verifier).setAllowedTimePeriodDiscrepancy(1);   // +-1 step
if (!rateLimiter.tryAcquire("mfa:" + userId)) throw new TooManyAttempts();   // 6 digits = 1M guesses: limit hard
boolean ok = verifier.isValidCode(decrypt(user.getTotpSecretEnc()), submittedCode)
          && user.getLastTotpStep() < currentStep;                  // replay protection
if (ok) user.setLastTotpStep(currentStep);

// Node.js equivalent with 'otplib':
//   const { authenticator } = require('otplib');
//   authenticator.options = { window: 1 };
//   authenticator.check(token, secretFromDb);`
      }
    ],
    codeTitle: ['Python: RFC 6238 TOTP (runnable, with official test vectors)', 'Java: TOTP with Mac', 'Library-based enrolment + login'],
    viz: {
      title: 'TOTP: from clock to 6-digit code (real HMAC-SHA1)',
      input: '59',
      inputLabel: 'Unix time in seconds (secret = the public RFC 6238 demo secret)',
      gen: function (input) {
        var t = parseInt(String(input || '59').trim(), 10);
        if (isNaN(t) || t < 0 || t > 4000000000) throw new Error('Enter a unix time in seconds, e.g. 59 or 1111111109');
        var secretText = '12345678901234567890';
        var key = secretText.split('').map(function (c) { return c.charCodeAt(0); });
        var T = Math.floor(t / 30), msg = [], i, x = T;
        for (i = 7; i >= 0; i--) { msg[i] = x % 256; x = Math.floor(x / 256); }
        var mac = hmacSha1(key, msg), macHex = mac.map(hex2);
        var offset = mac[19] & 15;
        var word = (((mac[offset] & 127) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3]) >>> 0;
        var code = ('000000' + (word % 1000000)).slice(-6);
        var left = 30 - (t % 30), hl = {};
        for (i = 0; i < 4; i++) hl[offset + i] = 'sel';
        var frames = [];
        frames.push({ narr: 'The phone and the server share one <b>secret</b> (set up once via QR code) and both know the <b>clock</b>. Current time: unix second <b>' + t + '</b>.', parts: [{ type: 'vars', vals: { secret: secretText + ' (RFC demo value)', 'unix time': t, 'step length': '30 s' } }] });
        frames.push({ narr: '<b>Step 1: time → counter.</b> <code>T = floor(' + t + ' / 30) = ' + T + '</code>. Everybody in the same 30-second slot gets the same T. This is why the code changes every 30 s, and why clocks must agree.', parts: [{ type: 'vars', vals: { 'unix time': t, 'T = floor(t/30)': T, 'seconds left in this step': left }, hl: { 'T = floor(t/30)': 'cur' } }, { type: 'bars', label: 'seconds elapsed in the current step (out of 30)', values: [t % 30, left], idxLabels: ['used', 'left'], hl: { 0: 'done', 1: 'ok' } }] });
        frames.push({ narr: '<b>Step 2: HMAC.</b> Compute <code>HMAC-SHA1(secret, T as 8 bytes)</code>. The result is 20 bytes. Without the secret, nobody can predict it.', parts: [{ type: 'array', label: 'T as 8 bytes (big-endian)', values: msg }, { type: 'array', label: 'HMAC-SHA1 result (20 bytes, hex)', values: macHex }] });
        frames.push({ narr: '<b>Step 3: dynamic truncation.</b> Look at the last byte (<code>0x' + macHex[19] + '</code>). Its low 4 bits give the <b>offset = ' + offset + '</b>. Read 4 bytes starting there.', parts: [{ type: 'array', label: 'HMAC bytes (offset ' + offset + ' marked)', values: macHex, hl: hl, ptr: (function () { var o = {}; o[offset] = 'offset'; o[19] = 'last'; return o; })() }] });
        frames.push({ narr: '<b>Step 4: make a number.</b> Join those 4 bytes, clear the top bit (so it is a positive 31-bit number): <code>' + word + '</code>.', parts: [{ type: 'bits', label: 'the 31-bit number (decimal ' + word + ')', value: word, width: 32, showDec: true, hl: { 31: 'bad' } }] });
        frames.push({ narr: '<b>Step 5: keep 6 digits.</b> <code>' + word + ' mod 10<sup>6</sup> = ' + (word % 1000000) + '</code>, padded with zeros: <b>' + code + '</b>. The phone shows exactly this, and the server computes the same value.', parts: [{ type: 'vars', vals: { 'number mod 1000000': word % 1000000, 'code shown': code }, hl: { 'code shown': 'ok' } }] });
        var prev = ('000000' + (function () { var m = [], y = T - 1, k; for (k = 7; k >= 0; k--) { m[k] = ((y % 256) + 256) % 256; y = Math.floor(y / 256); } var h = hmacSha1(key, m), o = h[19] & 15; return (((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) >>> 0; })() % 1000000).slice(-6);
        frames.push({ narr: '<b>Server check:</b> accept the code for steps T-1, T and T+1 (allows for slow phones). Anything else is wrong. Also remember the last accepted step so the <b>same code cannot be used twice</b>, and rate-limit attempts because only 10<sup>6</sup> codes exist.', parts: [{ type: 'table', label: 'accepted window', columns: ['step', 'meaning', 'code'], rows: [[T - 1, 'previous (drift)', prev], [T, 'current', '<b>' + code + '</b>'], [T + 1, 'next (drift)', '(computed on demand)']], hl: { 1: 'ok' } }] });
        return frames;
      }
    },
    examples: [
      {
        title: 'Enrolment flow, step by step', html: `<ol><li>User opens Security settings → "Enable authenticator app".</li><li>Server generates a 20-byte random secret, stores it <i>encrypted</i> with status <code>pending</code>, shows a QR of <code>otpauth://totp/DemoApp:alice@example.test?secret=BASE32&amp;issuer=DemoApp</code>.</li><li>User scans, types the current 6-digit code to prove the app really holds the secret.</li><li>Server verifies, marks MFA <code>enabled</code>, and displays 10 one-time <b>recovery codes</b> once (stored hashed).</li></ol><p>Never enable MFA before the confirm step: users who mis-scan would lock themselves out.</p>`
      },
      {
        title: 'Brute-force maths', html: `<p>6 digits = 1,000,000 codes. With a ±1 window about 3 codes are valid at once, so a random guess succeeds with probability about 3 in a million. At 1,000 guesses per second from many IPs an attacker would succeed in about 5 minutes on average <b>unless you limit attempts</b>. Fix: max 5 attempts per account per few minutes, exponential back-off, then lock and alert, and tie the attempt counter to the <b>account</b>, not only to the IP.</p>`
      },
      {
        title: 'MFA fatigue and phishing relay attacks', html: `<ul><li><b>Push fatigue:</b> attacker triggers 50 "Approve sign-in?" prompts at 3 a.m. until the sleepy user taps yes. Fix: number matching (user must type the number shown on the login screen), rate limit prompts, show location.</li><li><b>Real-time phishing proxy:</b> a fake site relays the username, password and the TOTP code to the real site instantly. TOTP cannot stop this, because the code is valid for the attacker too. <b>Passkeys/WebAuthn do</b>, since the signature is bound to the real domain.</li></ul>`
      },
      {
        title: 'Recovery without a backdoor', html: `${H.table(['Option', 'Risk'], [['10 single-use recovery codes, shown once, stored hashed', 'user must keep them safe; good default'], ['Backup second factor (another device, hardware key)', 'very good'], ['Support resets after identity verification with a waiting period and notifications', 'social-engineering target; document and audit'], ['"Send SMS instead"', 'reintroduces the weakest factor; avoid or restrict']])}`
      }
    ],
    deepDive: `<p>🟣 <b>HOTP vs TOTP.</b> HOTP (RFC 4226) uses an event counter that increments per press and needs re-sync logic; TOTP replaces the counter with <code>floor(time/step)</code>. Defaults used by nearly all apps: SHA-1, 6 digits, 30 s. SHA-1's collision weakness does not hurt HMAC-SHA1 here, and many authenticator apps only support SHA-1 reliably; SHA-256/512 are allowed by the RFC.</p>
      <p><b>Secrets are the problem.</b> Because the server must recompute codes, it must hold the raw secret (symmetric). Encrypt with envelope encryption (KMS data key per record), restrict access, never log it, and never email it. A database plus KMS leak exposes all second factors, which is another reason asymmetric <b>WebAuthn</b> is better: the server holds only a public key.</p>
      <p><b>Replay and drift.</b> Record <code>last_used_step</code> per user and reject any code with step ≤ it (otherwise an observed code works again within the window). To handle drift tolerantly, some servers learn each device's offset after a successful ±1 match. Keep servers synced with NTP; TOTP bugs are often "the container's clock is 3 minutes off".</p>
      <p><b>WebAuthn / passkeys in one paragraph.</b> At registration the authenticator creates a key pair for <code>(user, origin)</code> and gives the server the public key. At login the server sends a random challenge; the authenticator signs it (after local biometrics/PIN) together with the origin. The server verifies the signature and counter. Nothing secret crosses the network and a phishing site on another domain gets a different (useless) credential. Synced passkeys (iCloud/Google) add convenience; device-bound keys add assurance.</p>
      <p><b>Adaptive authentication.</b> Combine signals (new device, impossible travel, Tor, breached password) into a risk score and require MFA only when risky, while always requiring it for admins and privilege changes. Session binding: after MFA, mark the session with <code>amr</code>/<code>auth_time</code> so sensitive endpoints can demand a recent strong login.</p>`,
    aiEra: `<p><b>What AI changes:</b> voice-cloning and deepfake video make "call the helpdesk and reset my MFA" the weakest link: attackers impersonate employees convincingly. Defences are process-based: no MFA resets over a single phone call, verification through a second channel, waiting periods, manager approval. AI also scales phishing and real-time relay kits, which pushes the industry toward phishing-resistant passkeys and away from SMS and even TOTP for high-value accounts.</p>
      <p><b>Use AI as a partner:</b> <code>Write a threat model for our MFA enrolment, login and recovery flows (STRIDE), listing abuse cases</code>, or <code>Generate property tests for TOTP verification: drift window, replay, off-by-one at step boundaries</code>.</p>
      <p><b>Where AI goes wrong:</b> it compares codes with <code>==</code>, skips rate limiting and replay protection, stores the secret in plain text or hashes it (impossible to verify later), computes the counter in milliseconds instead of seconds, or uses local-time instead of UTC. Validate against the RFC 6238 test vectors, as the runnable example does.</p>
      <p><b>What you must still own:</b> the recovery policy (the real attack surface), who is forced to use MFA, and the user experience trade-offs. Do not let any assistant see real TOTP secrets or recovery codes.</p>`,
    problems: [
      {
        title: 'Generate and Verify a TOTP Code', level: 'Medium', tags: ['TOTP', 'MFA', 'HMAC'], companies: ['Google', 'Okta', 'Twilio'],
        statement: `<p>Implement <code>totp(secret, unixTime)</code> per RFC 6238 (SHA-1, 30 s, 6 digits) and <code>verify(secret, code, now)</code> that tolerates one step of clock drift and prevents replay. Check your implementation against a published test vector.</p>`,
        constraints: `Constant-time comparison. Attempts limited. Step = 30 s. Window = ±1 step.`,
        example: `<p>Secret = ASCII <code>12345678901234567890</code>, time <b>59</b>, 8 digits → ${H.c('g', '94287082')} (RFC 6238 vector). With 6 digits → <b>287082</b>.</p>`,
        brute: { why: `<p>Compare with <code>==</code>, accept any code from a huge window, never remember the last used step, and allow unlimited attempts. Timing leaks, replay within the window, and brute force of a 1-million code space all become possible.</p>` },
        mcq: { q: 'Why must the server remember the last accepted time step?', options: ['To save memory', 'So the same observed code cannot be replayed within its validity window', 'Because HMAC needs it', 'To sync clocks'], answer: 1, explain: 'A code stays valid for up to ~90 seconds with a ±1 window, so without replay tracking a shoulder-surfer or proxy could reuse it.' },
        hints: [`<p>Aha: TOTP is just HOTP with counter = floor(time / 30).</p>`, `<p>HMAC-SHA1(secret, counter as 8-byte big-endian); offset = last byte &amp; 0x0F; take 4 bytes, mask the top bit, mod 10<sup>6</sup>.</p>`, `<p>Verify: loop drift in -1..+1, compare in constant time, only accept a step greater than the stored last step; add rate limiting outside this function.</p>`],
        solution: {
          approach: `<p>Compute <code>counter = floor(unixTime / 30)</code>. Build the 8-byte big-endian counter, compute HMAC-SHA1 with the shared secret, take <code>offset = hmac[19] &amp; 0x0F</code>, read 4 bytes from the offset, mask with <code>0x7FFFFFFF</code>, reduce modulo 10<sup>digits</sup> and left-pad with zeros. To verify, calculate the expected code for counters <code>c-1, c, c+1</code> and compare each to the submitted code with a constant-time function (without early exit). If one matches at step <code>s</code>, require <code>s &gt; user.lastStep</code> (replay protection), then store <code>lastStep = s</code> atomically. Surround the call with attempt limiting per account, exponential back-off and alerts, and keep the secret encrypted at rest. Correctness check: the RFC 6238 vectors (time 59 → 94287082, 1111111109 → 07081804 with 8 digits) must match, which the runnable Python example in this topic asserts.</p>`,
          code: { lang: 'python', run: true, code: `import hashlib, hmac, struct

def hotp(secret, counter, digits=6):
    mac = hmac.new(secret, struct.pack(">Q", counter), hashlib.sha1).digest()
    off = mac[-1] & 0x0F
    word = struct.unpack(">I", mac[off:off + 4])[0] & 0x7FFFFFFF
    return str(word % 10 ** digits).zfill(digits)

def verify(secret, code, now, last_step, window=1):
    """Returns the accepted step (to store as last_step) or None."""
    step = now // 30
    for s in range(step - window, step + window + 1):
        if hmac.compare_digest(hotp(secret, s), code) and s > last_step:
            return s
    return None

secret = b"12345678901234567890"
print(hotp(secret, 59 // 30, 8))                      # 94287082
good = hotp(secret, 2)
acc = verify(secret, good, 75, last_step=0)
print("first use:", acc, " replay:", verify(secret, good, 76, last_step=acc))` },
          dry: { head: ['Time t', 'T = t // 30', 'HMAC offset', '8-digit code'], rows: [['59', '1', '11', '94287082'], ['1111111109', '37037036', '4', '07081804']] },
          complexity: `<p>O(1): three HMACs per verification (window 3). Storage: one encrypted secret and one integer per user.</p>`,
          followUps: ['How would you migrate TOTP users to passkeys?', 'How do you handle users whose phone clock is wrong?']
        }
      }
    ]
  });

  /* =====================================================================
     PRACTICE (15): 4 Easy, 6 Medium, 5 Hard
     ===================================================================== */
  practice.push({
    title: 'Find the Bugs in This Password Storage Code', level: 'Easy', tags: ['password hashing', 'code review'], companies: ['Amazon', 'Shopify'],
    statement: `<p>A teammate wrote: <code>String hash = sha256(password); db.save(email, hash); ... if (sha256(input).equals(db.hash(email))) login();</code>. List every security problem and give the corrected design.</p>`,
    constraints: `Java web app, 100k users, legacy hashes already stored.`,
    example: `<p>Problems: ${H.c('r', 'fast hash, no salt, plain equals, no rate limit, no migration')}. Fix: ${H.c('g', 'argon2id/bcrypt via PasswordEncoder, matches(), rehash on login')}.</p>`,
    brute: { why: `<p>Leave it as is. A DB leak lets an attacker crack common passwords in seconds (fast hash, no salt), and identical passwords are visible as identical hashes.</p>` },
    mcq: { q: 'What is the single biggest flaw?', options: ['Using SHA-256 without a salt and without a slow work factor', 'Using the email as a key', 'Saving to the database', 'Calling equals'], answer: 0, explain: 'Fast unsalted hashes are crackable at billions per second and reveal duplicates.' },
    hints: [`<p>Think about what an attacker with a copy of the table can do offline.</p>`, `<p>You need a salted, slow, memory-hard password hash from a maintained library.</p>`, `<p>Also cover timing-safe comparison, rate limiting, generic error messages, and migrating old SHA-256 rows at next login.</p>`],
    solution: { approach: `<p>Problems: (1) SHA-256 is fast, so offline cracking is cheap; (2) no per-user salt, so equal passwords give equal hashes and rainbow tables work; (3) <code>equals</code> is not constant-time; (4) no rate limiting or lockout; (5) different errors for unknown user vs wrong password allow enumeration. Fix: use <code>PasswordEncoder</code> with argon2id (or bcrypt cost 12): <code>encode()</code> creates salt and embeds parameters; <code>matches()</code> verifies in constant time; return one generic error; rate limit per account and IP; migrate legacy rows by wrapping: store <code>argon2id(sha256hex)</code> now and replace with <code>argon2id(password)</code> at the next successful login.</p>`, complexity: `<p>One slow hash (about 100-500 ms) per login by design.</p>` }
  });
  practice.push({
    title: '401, 403 or 404? Classify the Responses', level: 'Easy', tags: ['authorization', 'HTTP status'],
    statement: `<p>Pick the right status code for each case: (a) no token sent; (b) expired token; (c) valid token, user lacks permission to delete; (d) valid token, asks for another tenant's order whose existence should stay secret; (e) valid token but wrong scope.</p>`,
    constraints: `Follow RFC 9110 semantics; do not leak existence of private objects.`,
    example: `<p>(a) ${H.c('r', '401')}, (b) ${H.c('r', '401')}, (c) ${H.c('y', '403')}, (d) ${H.c('p', '404')}, (e) ${H.c('y', '403 (insufficient_scope)')}.</p>`,
    brute: { why: `<p>Return 403 for everything. Clients cannot tell whether to re-authenticate or give up, and 403 on private objects confirms they exist.</p>` },
    mcq: { q: 'A logged-in user requests /orders/124 that belongs to someone else. Best response for privacy?', options: ['200', '401', '404', '500'], answer: 2, explain: '404 does not reveal that order 124 exists; 403 would.' },
    hints: [`<p>401 is about identity (authentication), 403 about permission (authorization).</p>`, `<p>Missing or invalid credentials mean 401 with a WWW-Authenticate header; known identity without permission means 403.</p>`, `<p>For cross-tenant object ids prefer 404 so attackers cannot enumerate ids.</p>`],
    solution: { approach: `<p>(a) 401 with <code>WWW-Authenticate: Bearer</code>, because no identity was presented. (b) 401 with <code>error="invalid_token"</code>; the client should refresh or log in again. (c) 403: the identity is known, but the action is not allowed. (d) 404: the caller must not learn that another tenant's order exists. (e) 403 with <code>error="insufficient_scope"</code> so the client can request a broader scope. A simple rule to remember: if re-authenticating could fix it, use 401; if it cannot, use 403, or 404 to hide existence.</p>`, complexity: `<p>Not applicable; this is a design rule, applied in one middleware.</p>` }
  });
  practice.push({
    title: 'Read the Expiry From a JWT (Without Trusting It)', level: 'Easy', tags: ['JWT', 'base64url'],
    statement: `<p>Write a function that splits a JWT, decodes the payload and returns the <code>exp</code> as an ISO date, for display purposes only (e.g. "your session expires at..."). State clearly why this must never be used for an access decision.</p>`,
    constraints: `Plain JavaScript, no libraries. Input is a made-up demo token.`,
    example: `<p>Payload <code>{"sub":"42","exp":1900000000}</code> → ${H.c('g', '2030-03-17T17:46:40.000Z')}. The result is a hint for the UI, not proof.</p>`,
    brute: { why: `<p>Use the decoded role and exp to authorise requests. Anyone can craft a token with role admin and a far-future exp, since decoding does not check the signature.</p>` },
    mcq: { q: 'Is it safe to base authorization on a decoded but unverified payload?', options: ['Yes if HTTPS is used', 'Yes if the token looks valid', 'No, the signature must be verified first', 'Only for exp'], answer: 2, explain: 'Without signature verification any claim can be forged.' },
    hints: [`<p>A JWT is three base64url parts split by dots; the payload is the second.</p>`, `<p>Convert base64url to base64 (swap - and _, add = padding) then atob and JSON.parse.</p>`, `<p>Guard: exactly 3 parts, JSON parse in try/catch, exp must be a number; remember the server still verifies.</p>`],
    solution: { approach: `<p>Split on <code>.</code>, require 3 parts, convert the second part from base64url to base64 by replacing <code>-</code> with <code>+</code> and <code>_</code> with <code>/</code> and re-adding <code>=</code> padding, decode with <code>atob</code>, parse JSON, and convert <code>exp * 1000</code> to a Date. This is a UI convenience (to schedule a refresh or show a countdown). The server must never use it for decisions: only a verified signature, issuer, audience and expiry check on the server side establishes trust.</p>`, code: { lang: 'js', run: true, code: `const enc = o => btoa(JSON.stringify(o)).split('=').join('').split('+').join('-').split('/').join('_');\nconst token = enc({ alg: 'HS256' }) + '.' + enc({ sub: '42', exp: 1900000000 }) + '.FAKE-SIGNATURE';\nfunction expiryOf(t) {\n  const p = t.split('.');\n  if (p.length !== 3) throw new Error('not a JWT');\n  let b = p[1].split('-').join('+').split('_').join('/');\n  while (b.length % 4) b += '=';\n  const claims = JSON.parse(atob(b));\n  if (typeof claims.exp !== 'number') throw new Error('no exp');\n  return new Date(claims.exp * 1000).toISOString();\n}\nconsole.log(expiryOf(token));` }, complexity: `<p>O(length of the token); trivial cost.</p>` }
  });
  practice.push({
    title: 'Choose the Cookie Flags for a Session Cookie', level: 'Easy', tags: ['sessions', 'cookies', 'CSRF'],
    statement: `<p>Write the <code>Set-Cookie</code> header for a session cookie of a banking site and justify each attribute. What changes if the front end is on a different site from the API?</p>`,
    constraints: `HTTPS only, idle timeout 15 minutes, modern browsers.`,
    example: `<p><code>Set-Cookie: __Host-SID=...; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=900</code></p>`,
    brute: { why: `<p><code>Set-Cookie: sid=abc</code> only. JavaScript can read it (XSS theft), it travels over HTTP, and it is sent on cross-site requests (CSRF).</p>` },
    mcq: { q: 'Which attribute stops JavaScript from reading the cookie?', options: ['Secure', 'HttpOnly', 'SameSite', 'Path'], answer: 1, explain: 'HttpOnly hides the cookie from document.cookie.' },
    hints: [`<p>Think about three attackers: network sniffer, XSS script, and a malicious third-party site.</p>`, `<p>Secure vs sniffing, HttpOnly vs XSS, SameSite vs CSRF, __Host- vs sibling subdomains.</p>`, `<p>Cross-site front end needs SameSite=None; Secure and then real CSRF tokens; better to put API and app on the same site.</p>`],
    solution: { approach: `<p><code>__Host-SID=&lt;random 128-bit&gt;; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=900</code>. <b>Secure</b>: cookie is never sent over plain HTTP. <b>HttpOnly</b>: scripts cannot read it, limiting XSS damage. <b>SameSite=Lax</b>: not sent on cross-site POST/XHR, which defeats most CSRF; use Strict for the most sensitive apps. <b>__Host-</b> prefix forces Secure, Path=/ and no Domain so a sibling subdomain cannot overwrite it. <b>Max-Age</b> plus a server-side idle timeout limits stolen-cookie lifetime. If the app and API are on different sites, SameSite=None; Secure is required, which re-opens CSRF, so add anti-CSRF tokens and check Origin, or serve both under one site via a reverse proxy.</p>`, complexity: `<p>No runtime cost; a configuration decision.</p>` }
  });
  practice.push({
    title: 'Hash, Verify and Auto-Upgrade Passwords', level: 'Medium', tags: ['PBKDF2', 'rehash on login'], companies: ['Dropbox', 'Atlassian'],
    statement: `<p>Implement <code>hash(pw)</code>, <code>verify(pw, stored)</code> and <code>needs_upgrade(stored)</code> so that stored strings carry their own iteration count and old low-cost hashes are rehashed when the user logs in successfully.</p>`,
    constraints: `Python standard library only; constant-time comparison; current policy 20,000 iterations for this demo.`,
    example: `<p>Stored with 1,000 iterations → verify ${H.c('g', 'True')} → needs_upgrade ${H.c('y', 'True')} → rehash to 20,000 iterations.</p>`,
    brute: { why: `<p>Hard-code one iteration count in code and never store it. Raising the cost later breaks verification of every existing user.</p>` },
    mcq: { q: 'Why store the iteration count in the hash string?', options: ['To confuse attackers', 'So verification uses the original cost and the cost can be raised later', 'It is required by SQL', 'To shorten the hash'], answer: 1, explain: 'Self-describing hashes allow gradual upgrades.' },
    hints: [`<p>Format: algorithm$iterations$salt$hash, so each string describes itself.</p>`, `<p>verify parses the stored iterations and recomputes; needs_upgrade compares to the current policy.</p>`, `<p>On successful verify and needs_upgrade true, store hash(password) with new parameters.</p>`],
    solution: { approach: `<p>Store <code>pbkdf2-sha256$iterations$salt_hex$hash_hex</code>. <code>verify</code> splits the string, recomputes PBKDF2 with the stored salt and iteration count and compares in constant time. <code>needs_upgrade</code> returns true if iterations are lower than the current policy. The login handler: if verify succeeds and needs_upgrade is true, call hash again with the plain password that is in memory and save the new string. This upgrades active users silently and leaves dormant ones for a later forced reset.</p>`, code: { lang: 'python', run: true, code: `import hashlib, hmac, os\nPOLICY = 20_000\n\ndef hash_pw(pw, iters=POLICY):\n    salt = os.urandom(16)\n    dk = hashlib.pbkdf2_hmac("sha256", pw.encode(), salt, iters)\n    return "$".join(["pbkdf2-sha256", str(iters), salt.hex(), dk.hex()])\n\ndef verify(pw, stored):\n    _, iters, salt, h = stored.split("$")\n    dk = hashlib.pbkdf2_hmac("sha256", pw.encode(), bytes.fromhex(salt), int(iters))\n    return hmac.compare_digest(dk.hex(), h)\n\ndef needs_upgrade(stored):\n    return int(stored.split("$")[1]) < POLICY\n\nold = hash_pw("demo-pw", 1000)\nif verify("demo-pw", old) and needs_upgrade(old):\n    new = hash_pw("demo-pw")\n    print("upgraded:", old.split("$")[1], "->", new.split("$")[1], verify("demo-pw", new))\n` }, complexity: `<p>One PBKDF2 per verify; one more on upgrade.</p>` }
  });
  practice.push({
    title: 'Audit a JWT Verification Function', level: 'Medium', tags: ['JWT', 'security review'], companies: ['Okta', 'Auth0'],
    statement: `<p>This code calls <code>jwt.decode(token)</code> to read the role, then <code>verify(token, key)</code> using whatever <code>alg</code> the header says, and skips <code>aud</code>. List all vulnerabilities and give the safe version.</p>`,
    constraints: `Library is jsonwebtoken-like; keys from env; tokens issued by your own auth service.`,
    example: `<p>Findings: ${H.c('r', 'decode before verify, alg from header, no aud/iss, no exp leeway policy, secret in source')}.</p>`,
    brute: { why: `<p>Trust the token because "it came over HTTPS". Anyone can create a token; HTTPS only protects transport, not content.</p>` },
    mcq: { q: 'What stops the alg=none and algorithm confusion attacks?', options: ['Short tokens', 'A server-side allow-list of algorithms', 'Base64 encoding', 'HttpOnly cookies'], answer: 1, explain: 'The verifier chooses the algorithm; the token never does.' },
    hints: [`<p>List every check the verification checklist requires and see which are missing.</p>`, `<p>Pass an explicit algorithms array and key type; validate iss, aud and exp.</p>`, `<p>Use verified claims only; never read claims from a decode() result for decisions.</p>`],
    solution: { approach: `<p>Vulnerabilities: (1) reading claims from <code>decode</code> before or without verification; (2) letting the header choose the algorithm (alg=none, RS256/HS256 confusion); (3) missing <code>aud</code> and <code>iss</code> checks so tokens for other services work; (4) no clear <code>exp</code> and leeway policy; (5) possibly weak or hard-coded secrets; (6) trusting <code>kid</code>/<code>jku</code> from the token. Safe version: <code>jwt.verify(token, key, {algorithms:['RS256'], issuer: ISS, audience: AUD, clockTolerance: 30})</code>, use the returned claims only, load the key from a JWKS cache by kid from a pinned issuer URL, and write negative tests for each failure (expired, wrong aud, tampered payload, alg none).</p>`, complexity: `<p>Verification is O(token length); JWKS fetched rarely and cached.</p>` }
  });
  practice.push({
    title: 'Server-Side PKCE Verification', level: 'Medium', tags: ['OAuth2', 'PKCE'], companies: ['Okta', 'Ping Identity'],
    statement: `<p>Implement the authorization server's check at the token endpoint: given the stored <code>code_challenge</code> (S256) and the presented <code>code_verifier</code>, decide whether to issue tokens. Include length validation of the verifier and single-use codes.</p>`,
    constraints: `Verifier length 43-128 characters from [A-Za-z0-9-._~]; S256 only; constant-time compare.`,
    example: `<p>Verifier <code>dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk</code> → challenge <code>E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM</code> ${H.c('g', 'match')}.</p>`,
    brute: { why: `<p>Accept the "plain" method or skip the verifier check when the client has no secret. Then a stolen code can be redeemed by anyone.</p>` },
    mcq: { q: 'Which transform does S256 apply?', options: ['MD5(verifier)', 'BASE64URL(SHA256(verifier))', 'AES(verifier)', 'verifier reversed'], answer: 1, explain: 'RFC 7636 defines challenge = BASE64URL-ENCODE(SHA256(ASCII(verifier))).' },
    hints: [`<p>The server never sees the verifier until the token call; it only holds the challenge.</p>`, `<p>Hash the presented verifier with SHA-256, base64url without padding, compare.</p>`, `<p>Validate the charset and length first; delete the code from storage before returning to enforce single use.</p>`],
    solution: { approach: `<p>On <code>/authorize</code> store <code>{client_id, redirect_uri, code_challenge, expires_at}</code> under the random code. On <code>/token</code>: pop the code (atomically, so it is single use even if the later checks fail), verify client id, redirect URI and expiry, validate the verifier charset and 43-128 length, compute <code>BASE64URL(SHA256(verifier))</code> and compare to the stored challenge using a constant-time comparison. Only then issue tokens. Reject the <code>plain</code> method unless you must support legacy clients. The code below checks the RFC 7636 test vector.</p>`, code: { lang: 'python', run: true, code: `import base64, hashlib, hmac, re\n\ndef s256(v):\n    return base64.urlsafe_b64encode(hashlib.sha256(v.encode("ascii")).digest()).rstrip(b"=").decode()\n\ndef check(stored_challenge, verifier):\n    if not re.fullmatch(r"[A-Za-z0-9._~-]{43,128}", verifier):\n        return False\n    return hmac.compare_digest(s256(verifier), stored_challenge)\n\nv = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"\nc = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"\nprint(check(c, v), check(c, "x" * 43), check(c, "short"))\n` }, complexity: `<p>O(verifier length): one SHA-256 and one compare.</p>` }
  });
  practice.push({
    title: 'Design a Secure Password Reset Flow', level: 'Medium', tags: ['account recovery', 'tokens'], companies: ['Meta', 'Uber'],
    statement: `<p>Design "forgot password": request, email link, token validation, new password, and aftermath. Cover token properties, enumeration, rate limits and session handling.</p>`,
    constraints: `Email is the only recovery channel; MFA may be enabled; tokens must not be reusable.`,
    example: `<p>Token: ${H.c('g', '256-bit random, hashed in DB, 15 min, single use')}. Response to the request form: ${H.c('b', 'always "if the account exists we sent an email"')}.</p>`,
    brute: { why: `<p>Email the old password, use a sequential or timestamp-based token, or reveal "no such user". Attackers enumerate accounts, guess tokens or take over inboxes.</p>` },
    mcq: { q: 'After a successful password reset what must happen?', options: ['Keep all sessions', 'Revoke existing sessions and refresh tokens, notify the user', 'Email the new password', 'Nothing'], answer: 1, explain: 'An attacker may already hold a session; reset must cut it off.' },
    hints: [`<p>Treat the reset token like a temporary password: random, hashed, short-lived, single-use.</p>`, `<p>Same response and timing whether or not the email exists; rate limit per account and IP.</p>`, `<p>After reset: revoke sessions and refresh tokens, require MFA, send a notification email.</p>`],
    solution: { approach: `<p>Request: user submits email; always respond "if an account exists we sent a link", with equal timing (queue the email asynchronously). Create a 256-bit random token, store only its SHA-256 with user id, expiry (15 minutes) and a used flag; invalidate older tokens for the user. Link: <code>https://app.example.test/reset#token=...</code> (fragment or POST body so it does not leak via Referer or logs). On submit: look up by hash, check expiry/unused, validate the new password against breach lists, hash it with argon2id, mark the token used in the same transaction, revoke all sessions and refresh tokens, and notify the user by email. MFA stays required for accounts that have it (reset must not bypass the second factor). Rate limit requests and attempts, log everything, and add CAPTCHA only after repeated abuse.</p>`, complexity: `<p>One hash lookup per step; the heavy cost is the password hash at the final step.</p>` }
  });
  practice.push({
    title: 'Per-API-Key Token Bucket Rate Limiter', level: 'Medium', tags: ['API keys', 'rate limiting'], companies: ['Stripe', 'Cloudflare'],
    statement: `<p>Implement a token bucket keyed by API key id: capacity 10, refill 5 tokens per second. <code>allow(key_id, now)</code> returns true/false. Explain how you would make it work across many servers.</p>`,
    constraints: `O(1) per call; time passed in explicitly for testability.`,
    example: `<p>10 calls at t=0 → all ${H.c('g', 'allowed')}; the 11th → ${H.c('r', 'denied')}; at t=1 five more tokens exist.</p>`,
    brute: { why: `<p>Keep a list of timestamps per key and scan it every request: O(n) per call and large memory for busy keys.</p>` },
    mcq: { q: 'Which two numbers define a token bucket?', options: ['Capacity and refill rate', 'Hash and salt', 'Scope and audience', 'Iterations and memory'], answer: 0, explain: 'Capacity allows bursts; refill rate sets the sustained rate.' },
    hints: [`<p>Store only (tokens, last_refill_time) per key.</p>`, `<p>On each call add elapsed*rate tokens, cap at capacity, then spend one if available.</p>`, `<p>Distributed: do the same math inside a Redis Lua script so it is atomic.</p>`],
    solution: { approach: `<p>State per key: <code>tokens</code> (float) and <code>last</code> timestamp. On a call: <code>tokens = min(capacity, tokens + (now - last) * rate)</code>, set <code>last = now</code>; if <code>tokens &gt;= 1</code>, subtract 1 and allow, otherwise deny and return <code>Retry-After</code>. Across servers use Redis with a Lua script performing the read-modify-write atomically (or <code>INCR</code>-based fixed windows if approximate is fine). Return 429 with headers showing limit, remaining and reset, and key limits to plan tier.</p>`, code: { lang: 'python', run: true, code: `class Bucket:\n    def __init__(self, capacity=10, rate=5.0):\n        self.capacity, self.rate, self.state = capacity, rate, {}\n    def allow(self, key, now):\n        tokens, last = self.state.get(key, (self.capacity, now))\n        tokens = min(self.capacity, tokens + (now - last) * self.rate)\n        if tokens >= 1:\n            self.state[key] = (tokens - 1, now)\n            return True\n        self.state[key] = (tokens, now)\n        return False\n\nb = Bucket()\nprint([b.allow("k1", 0) for _ in range(11)].count(True), "allowed of 11 at t=0")\nprint("t=1:", [b.allow("k1", 1) for _ in range(6)])\n` }, complexity: `<p>O(1) time and memory per key.</p>` }
  });
  practice.push({
    title: 'Role Hierarchy with Cycle Detection', level: 'Medium', tags: ['RBAC', 'graph', 'DFS'], companies: ['Microsoft', 'Atlassian'],
    statement: `<p>Roles may inherit other roles (admin inherits editor inherits viewer). Compute the effective permissions of a role, and reject configurations that contain a cycle.</p>`,
    constraints: `Up to 1,000 roles; inheritance is a DAG after validation.`,
    example: `<p>viewer={read}, editor inherits viewer +{write}, admin inherits editor +{delete} → admin = ${H.c('g', '{read, write, delete}')}. editor inherits admin creates a ${H.c('r', 'cycle → reject')}.</p>`,
    brute: { why: `<p>Copy permissions manually into each role. They drift apart and someone forgets to add a new permission to admin.</p>` },
    mcq: { q: 'Which traversal detects a cycle in the inheritance graph?', options: ['DFS with a "currently visiting" set', 'Binary search', 'Sorting roles by name', 'Hashing'], answer: 0, explain: 'Reaching a node that is on the current DFS path means a cycle.' },
    hints: [`<p>Roles form a directed graph: edge role to parent role.</p>`, `<p>DFS with states unvisited / visiting / done and memoise the results.</p>`, `<p>If you meet a visiting node, raise an error naming the cycle.</p>`],
    solution: { approach: `<p>Represent roles as a map <code>role → {own permissions, parents}</code>. Compute effective permissions by DFS: union of own permissions and the effective permissions of each parent. Keep a state per role (0 = unvisited, 1 = visiting, 2 = done); meeting a role in state 1 means a cycle and the configuration is rejected when an admin saves it. Memoise finished roles so each is computed once. Validate at write time, not at request time, and cache the flattened permissions per role for fast checks.</p>`, code: { lang: 'python', run: true, code: `roles = {"viewer": ({"read"}, []), "editor": ({"write"}, ["viewer"]), "admin": ({"delete"}, ["editor"])}\n\ndef effective(role, state=None, memo=None):\n    state = {} if state is None else state\n    memo = {} if memo is None else memo\n    if role in memo: return memo[role]\n    if state.get(role) == 1: raise ValueError("cycle at " + role)\n    state[role] = 1\n    own, parents = roles[role]\n    perms = set(own)\n    for p in parents:\n        perms |= effective(p, state, memo)\n    state[role] = 2\n    memo[role] = perms\n    return perms\n\nprint(sorted(effective("admin")))\nroles["viewer"] = ({"read"}, ["admin"])\ntry: effective("admin")\nexcept ValueError as e: print("rejected:", e)\n` }, complexity: `<p>O(R + E) for R roles and E inheritance edges.</p>` }
  });
  practice.push({
    title: 'Zero-Downtime Signing Key Rotation with JWKS', level: 'Hard', tags: ['JWT', 'key rotation', 'JWKS'], companies: ['Google', 'Auth0'],
    statement: `<p>Your auth service signs RS256 JWTs and 40 microservices verify them. Design key rotation every 90 days and emergency rotation after a key leak, with no failed requests during normal rotation.</p>`,
    constraints: `Access tokens live 15 minutes; verifiers cache JWKS; a leaked key must stop working within minutes.`,
    example: `<p>Timeline: publish new key ${H.c('b', 'T-1 day')}, sign with new key ${H.c('g', 'T')}, remove old key ${H.c('y', 'T+15 min (+cache TTL)')}.</p>`,
    brute: { why: `<p>Swap the key in one deploy. Verifiers still hold the old public key, or tokens signed by the new key arrive before verifiers know it, causing a wave of 401s.</p>` },
    mcq: { q: 'Which JWT header field lets verifiers choose the right key?', options: ['typ', 'kid', 'iat', 'cty'], answer: 1, explain: 'kid identifies the signing key in the JWKS.' },
    hints: [`<p>Publish before use, retire after the longest token life plus caches.</p>`, `<p>Verifiers fetch by kid, cache with TTL, and refetch (rate limited) on unknown kid.</p>`, `<p>Emergency: remove the key from JWKS immediately, shorten cache TTLs, and add a revocation signal.</p>`],
    solution: { approach: `<p><b>Normal rotation (4 phases):</b> (1) generate key K2 and add its public part to the JWKS while still signing with K1; (2) wait longer than the JWKS cache TTL (say 1 hour) so every verifier knows K2; (3) switch the signer to K2 (header <code>kid=K2</code>); (4) after the longest token lifetime (15 minutes) plus the cache TTL, remove K1 from the JWKS. Verifiers select keys by <code>kid</code>, cache the JWKS honouring <code>Cache-Control</code>, and on unknown kid refetch with a rate limit (so attackers cannot cause a fetch storm with random kids). Keep the private key in a KMS/HSM so it never exists in app memory or repos.</p>
    <p><b>Emergency:</b> remove the compromised key from the JWKS immediately and push a short TTL; verifiers that cached it keep trusting it until refresh, so also publish a "min issued-at" or key-revocation list through a pub/sub channel, and force refresh tokens to be re-checked. Accept that all tokens signed by the leaked key die, and users re-authenticate silently through refresh tokens signed server-side.</p>
    <p><b>Observability:</b> metric of verification failures by reason, alerts on unknown-kid spikes, and a rehearsed runbook (game-day it).</p>`, complexity: `<p>Verification stays O(1) per request with a cached key; rotation costs one extra public key in the JWKS for a while.</p>` }
  });
  practice.push({
    title: 'Refresh Token Grace Window Without Weakening Theft Detection', level: 'Hard', tags: ['refresh token', 'concurrency'], companies: ['Okta', 'Shopify'],
    statement: `<p>Flaky mobile networks cause retries of the same refresh request, which your strict reuse detection treats as theft. Design a grace window that keeps detection effective.</p>`,
    constraints: `Grace of at most 10 seconds; must stay idempotent for the legitimate client; thief replay later must still revoke the family.`,
    example: `<p>R5 presented twice within 3 seconds from the same device → both get ${H.c('g', 'the same R6')}. R5 presented 2 minutes later → ${H.c('r', 'family revoked')}.</p>`,
    brute: { why: `<p>Disable reuse detection, or allow unlimited re-use of the old token. Theft becomes invisible.</p>` },
    mcq: { q: 'During the grace window, what should the server return for a re-presented token?', options: ['A brand-new third token', 'The same successor token that was already issued', 'An error', 'The old token'], answer: 1, explain: 'Idempotent response: same successor, so no branching of the token family.' },
    hints: [`<p>Store rotated_at and the successor hash with the old row.</p>`, `<p>If now - rotated_at is within grace and the request fingerprint matches, return the stored successor.</p>`, `<p>Otherwise treat as reuse. Make the first rotation and the lookup atomic.</p>`],
    solution: { approach: `<p>Extend the row with <code>rotated_at</code>, <code>successor_id</code> and a device fingerprint (client id, a device-bound cookie or DPoP key thumbprint). On presentation of a used token: if <code>now - rotated_at &lt;= 10 s</code> and the fingerprint matches, return the existing successor token (the server must be able to re-deliver it, so keep the successor encrypted or issue it from a short-lived cache keyed by the old token id) and do not rotate again. Otherwise revoke the family. The first rotation must use an atomic conditional update so concurrent requests agree on exactly one successor. Keep the window tiny, log every grace hit (a spike signals a client bug or an attack), and prefer client-side single-flight refresh so the server rarely needs the grace path.</p>`, complexity: `<p>O(1) per call with one extra column read.</p>` }
  });
  practice.push({
    title: 'Authentication Design for Multi-Tenant SaaS with Enterprise SSO', level: 'Hard', tags: ['OIDC', 'SSO', 'multi-tenant', 'SCIM'], companies: ['Salesforce', 'Slack', 'Atlassian'],
    statement: `<p>Design login for a B2B SaaS: small customers use email and password with MFA, large customers require their own SSO (Okta, Entra ID) and automatic user provisioning. Cover tenant discovery, token validation, account linking, role mapping, deprovisioning and security pitfalls.</p>`,
    constraints: `10k tenants, 2M users, some tenants enforce SSO-only, offboarding within minutes.`,
    example: `<p>User types <code>sam@acme.test</code> → tenant Acme has SSO → redirect to Acme's IdP → ID token validated against ${H.c('b', "Acme's issuer and JWKS")} → user key ${H.c('g', '(tenant, iss, sub)')}.</p>`,
    brute: { why: `<p>Match users by email across all IdPs and trust any ID token with a known email. A rogue tenant IdP can claim the email of another tenant's admin and take the account over.</p>` },
    mcq: { q: 'What stops a malicious tenant IdP from asserting another company\'s email?', options: ['Nothing is needed', 'Per-tenant verified domains and keying users by (tenant, iss, sub)', 'Larger JWTs', 'Faster hashing'], answer: 1, explain: 'Bind each IdP to the tenant and its verified domains; never merge identities by email alone.' },
    hints: [`<p>Home-realm discovery: email domain → tenant → auth method.</p>`, `<p>Store per-tenant OIDC/SAML config; validate tokens with that tenant's issuer; key users by (tenant_id, iss, sub).</p>`, `<p>SCIM for lifecycle, group-to-role mapping, enforce SSO-only (disable passwords), session limits and back-channel logout.</p>`],
    solution: { approach: `<p><b>Discovery:</b> the login form asks for email; look up the tenant by a <i>verified</i> domain (DNS TXT proof). If the tenant enforces SSO, redirect to its IdP via authorization code + PKCE; otherwise show the password + MFA path.</p>
    <p><b>Validation:</b> per-tenant config (issuer, client id, secret in a vault, JWKS discovered). Validate signature, iss (must equal this tenant's issuer), aud, exp and nonce. Identity key: <code>(tenant_id, issuer, sub)</code>; never merge accounts by email; require email_verified and domain match for first-time linking.</p>
    <p><b>Provisioning:</b> just-in-time creation on first login plus SCIM endpoints (create, patch, deactivate, groups). Map IdP groups to roles (RBAC) with tenant-scoped roles; the tenant admin edits the mapping.</p>
    <p><b>Offboarding:</b> SCIM deactivate or IdP disable triggers session and refresh-token revocation immediately; SSO-only tenants cannot fall back to passwords; app sessions have short idle timeouts and support OIDC back-channel logout.</p>
    <p><b>Security:</b> prevent tenant confusion (tenant id in every token and query, row-level security), rate limit login by tenant, audit logs exposed to tenant admins, break-glass owner account with MFA for IdP outages, and test with a rogue-IdP scenario.</p>`, complexity: `<p>Login costs one redirect round trip; JWKS and tenant config are cached; SCIM traffic is low volume.</p>` }
  });
  practice.push({
    title: 'Help-Desk MFA Reset Without Creating a Backdoor', level: 'Hard', tags: ['MFA', 'account recovery', 'social engineering'], companies: ['Okta', 'Microsoft'],
    statement: `<p>Attackers (now with voice clones) phone the help desk to reset an executive's MFA. Design the recovery process and the controls that make that attack fail while still helping real users.</p>`,
    constraints: `5,000 employees; remote workforce; some users genuinely lose phones every week.`,
    example: `<p>Weak: "verify date of birth, then reset". Strong: ${H.c('g', 'self-service with a second enrolled factor or recovery codes; otherwise manager approval + callback + waiting period + alerts')}.</p>`,
    brute: { why: `<p>Let the help desk reset MFA after asking knowledge-based questions. Those answers are findable or guessable and voices can be cloned.</p>` },
    mcq: { q: 'Which control best resists a convincing phone impersonation?', options: ['Asking mother\'s maiden name', 'Out-of-band verification through an already-trusted channel plus approval and delay', 'Trusting caller ID', 'Longer calls'], answer: 1, explain: 'Do not rely on what the caller says; verify through a channel they cannot control.' },
    hints: [`<p>Reduce how often help-desk resets are needed: multiple factors, passkeys, recovery codes.</p>`, `<p>For unavoidable resets use an identity-proofing ladder: manager callback, video verification with ID, approvals for privileged users.</p>`, `<p>Add friction for attackers only: waiting period, notifications to old devices and email, limited access after reset.</p>`],
    solution: { approach: `<p><b>Prevent:</b> require users to enrol two factors (passkey plus TOTP, or hardware key) and keep recovery codes, so most lockouts are self-service. Encourage passkeys on multiple devices.</p>
    <p><b>Unavoidable resets:</b> never trust voice or caller ID. The agent triggers a workflow, not a decision: verify identity through an already-trusted channel (callback to the number in the HR system, the manager's approval in the ticketing tool, or live video check against a photo ID). Privileged accounts need two approvers. Apply a delay (for example 24 h for admins) with notifications to the user's email and old devices that allow the real owner to cancel.</p>
    <p><b>Contain:</b> after reset, issue a restricted session (no password changes, no new MFA devices, no payment approvals) for a cooling-off period, revoke old sessions and refresh tokens, and require re-enrolment of all factors.</p>
    <p><b>Detect:</b> alert on resets outside business hours or from unusual locations, log agent identity, run red-team call tests, and train agents that urgency and authority are red flags.</p>`, complexity: `<p>Process design; cost is added latency (minutes to a day) only for the rare, high-risk path.</p>` }
  });
  practice.push({
    title: 'Authorizing List Endpoints at Scale (Filter, Do Not Post-Filter)', level: 'Hard', tags: ['authorization', 'ReBAC', 'pagination'], companies: ['Google', 'Notion'],
    statement: `<p>"List all documents I can see" over 500 million documents, with sharing through folders and teams. Single-object checks are easy; design the list query so it is correct, fast, and paginates properly.</p>`,
    constraints: `p99 under 200 ms; permissions change often; results must not leak documents that were just unshared.`,
    example: `<p>Bad: fetch 1,000 rows then ${H.c('r', 'call check() for each and drop denied rows')} (pages come back half empty, N calls). Good: ${H.c('g', 'resolve accessible ids first or join permission data into the query')}.</p>`,
    brute: { why: `<p>Query the table page by page and call the permission service per row. Latency is N round trips, pages have uneven sizes, and counts leak information.</p>` },
    mcq: { q: 'Which approach keeps pagination correct?', options: ['Post-filter each page', 'Push the permission predicate into the query (or intersect with a precomputed accessible-ids set)', 'Cache the first page forever', 'Return all rows'], answer: 1, explain: 'The database must apply the predicate so LIMIT and cursors operate on allowed rows.' },
    hints: [`<p>The unit of work is "which objects can this user reach", not "may the user see this object".</p>`, `<p>Options: denormalised ACL table joined in SQL, row-level security, or ReBAC LookupResources feeding an ID filter.</p>`, `<p>Handle freshness: version tokens (zookies) or short TTL plus a fallback check on fetch for sensitive data.</p>`],
    solution: { approach: `<p>Choose by access model. <b>Simple sharing:</b> maintain a denormalised table <code>doc_access(doc_id, principal_id)</code> (principals include the user, their groups and teams) and query with a join: <code>SELECT d.* FROM docs d JOIN doc_access a ON a.doc_id = d.id WHERE a.principal_id IN (:user, :groups) ORDER BY d.updated_at, d.id LIMIT 50</code> with keyset pagination. Updates to sharing write the access rows asynchronously (event-driven) with a short lag, which is a conscious trade-off.</p>
    <p><b>Deep hierarchies (Zanzibar style):</b> ask the relationship store for reachable resources (LookupResources) in pages and intersect with the search/index query, or index permissions into the search engine as a field (<code>allowed_principals</code>) so search filters natively. Always re-check the final candidate rows with a point check if the data is highly sensitive (belt and braces).</p>
    <p><b>Correctness:</b> never post-filter paginated results; use consistency tokens so a freshly revoked share is honoured; add tenant filters at the data layer (row-level security); test with a matrix of users and expected visible sets. <b>Cost:</b> one indexed query instead of N permission calls; write amplification on share changes is the price.</p>`, complexity: `<p>Read: O(log N + page size) with the right index. Write: O(affected principals) per sharing change.</p>` }
  });

  /* =====================================================================
     QUIZ (12)
     ===================================================================== */
  quiz.push({ q: 'Which is the best way to store a user password?', options: ['AES-encrypt it with a key in config', 'SHA-256 of the password', 'argon2id (or bcrypt) with a per-user random salt', 'Base64 encode it'], answer: 2, explain: 'Slow, salted, one-way hashing is the standard. Encryption is reversible; plain SHA-256 is far too fast.' });
  quiz.push({ q: 'What does a salt protect against?', options: ['Network sniffing', 'Precomputed rainbow tables and revealing duplicate passwords', 'SQL injection', 'Session fixation'], answer: 1, explain: 'A unique random salt makes identical passwords hash differently and makes precomputed tables useless.' });
  quiz.push({ q: 'Why is a JWT payload NOT secret?', options: ['It is encrypted with a weak key', 'It is only base64url encoded and signed, so anyone can read it', 'It is sent in plain HTTP', 'It is compressed'], answer: 1, explain: 'Signing proves integrity, not confidentiality. Do not put secrets in claims (or use JWE).' });
  quiz.push({ q: 'Which check order is correct for a received JWT?', options: ['Read claims, then verify the signature', 'Allow-list alg, verify signature, then check exp/iss/aud', 'Check exp only', 'Decode and trust the role'], answer: 1, explain: 'Claims are attacker-controlled until the signature (with a server-chosen algorithm) is verified.' });
  quiz.push({ q: 'What is the main advantage of server-side sessions over JWTs?', options: ['They are faster', 'Instant revocation by deleting the server-side record', 'No cookies needed', 'They never expire'], answer: 1, explain: 'A deleted session stops working on the next request; a JWT stays valid until expiry unless extra state is added.' });
  quiz.push({ q: 'In refresh token rotation, what does it mean when an already-used refresh token is presented?', options: ['Normal retry; ignore', 'Possible theft: revoke the whole token family', 'Issue two new tokens', 'Extend the lifetime'], answer: 1, explain: 'Two parties hold the same token. The server cannot tell which one is the thief, so it revokes the family.' });
  quiz.push({ q: 'Which OAuth2 flow should a mobile app or SPA use for user login?', options: ['Implicit', 'Resource owner password credentials', 'Authorization code with PKCE', 'Client credentials'], answer: 2, explain: 'Code + PKCE is the recommended flow for public clients; implicit and password grants are deprecated.' });
  quiz.push({ q: 'What does the OAuth2 "state" parameter prevent?', options: ['Code theft', 'Login CSRF on the redirect callback', 'Token expiry', 'Weak passwords'], answer: 1, explain: 'The client checks that the returned state matches the one it sent, so an attacker cannot inject their own authorization response.' });
  quiz.push({ q: 'What does OpenID Connect add on top of OAuth2?', options: ['Faster tokens', 'An ID token and standard claims for authenticating the user', 'Encryption of access tokens', 'Refresh tokens'], answer: 1, explain: 'OIDC adds the openid scope, the ID token, UserInfo and discovery so apps learn who logged in.' });
  quiz.push({ q: 'An authenticated user changes /orders/123 to /orders/124 and sees someone else\'s order. What is this bug?', options: ['XSS', 'CSRF', 'Broken object-level authorization (IDOR/BOLA)', 'SQL injection'], answer: 2, explain: 'The server checked who the user is but not whether this user may access that specific object.' });
  quiz.push({ q: 'Which is the best primary key for linking an external OIDC identity to a local user?', options: ['email', 'display name', '(iss, sub)', 'IP address'], answer: 2, explain: 'The issuer plus subject pair is stable and unique; emails can change or be reassigned.' });
  quiz.push({ q: 'How is a TOTP code computed?', options: ['Random number sent by SMS', 'HMAC of the shared secret and floor(time/30), then truncated to 6 digits', 'SHA-256 of the password', 'AES of the username'], answer: 1, explain: 'RFC 6238: HOTP with the counter equal to the number of 30-second steps since the epoch.' });
  quiz.push({ q: 'Why can API keys be stored with a plain SHA-256 hash while passwords cannot?', options: ['API keys are shorter', 'API keys are high-entropy random values, so brute force is infeasible', 'SHA-256 is slow', 'Passwords are public'], answer: 1, explain: 'Humans choose guessable passwords (need slow hashes); a 256-bit random key cannot be guessed.' });

  /* =====================================================================
     INTERVIEW (14)
     ===================================================================== */
  interview.push({ q: 'How do you store passwords securely?', level: 'B', a: `<p>I never store the password or anything reversible. I use a dedicated password hashing function, <b>argon2id</b> first choice or bcrypt (cost 10-12) or PBKDF2 with 600k+ iterations if FIPS is needed. Each hash gets a <b>unique random salt</b> (the library generates it and embeds it with the parameters in the stored string), and the cost is tuned so one hash takes roughly 100-500 ms. Verification recomputes and compares in constant time. I rehash at login when parameters are outdated, optionally add a secret pepper held outside the DB, rate limit logins, and return one generic error message.</p>`, followUps: ['Why not SHA-256?', 'What is the difference between a salt and a pepper?', 'How do you migrate old MD5 hashes?'] });
  interview.push({ q: 'Sessions or JWT: how do you choose?', level: 'B', a: `<p>I start from the revocation requirement and the client type. Browser apps with one backend: <b>server-side sessions</b> in Redis with an HttpOnly, Secure, SameSite cookie. Instant logout and bans are trivial. Public APIs, mobile apps and microservices that need to verify identity without a shared store: <b>short-lived signed tokens</b> (JWT) plus revocable refresh tokens. Many real systems are hybrid: a BFF holds tokens and gives the browser only a session cookie, and internal services use short JWTs.</p>`, followUps: ['How do you log out with JWT?', 'Where do you store JWT in a SPA?'] });
  interview.push({ q: 'Explain the structure of a JWT and how you verify it.', level: 'B', a: `<p>Three base64url parts: header (alg, kid), payload (claims such as iss, sub, aud, exp), and signature over <code>header.payload</code>. To verify: split into 3 parts, check the algorithm against my own allow-list (reject none), verify the signature with the right key (HMAC secret or the public key found by <code>kid</code> in the JWKS) in constant time, and only then check <code>exp</code>, <code>nbf</code>, <code>iss</code> and <code>aud</code>. The payload is readable by anyone, so no secrets in it, and claims are stale until expiry.</p>`, followUps: ['What is algorithm confusion?', 'HS256 vs RS256?', 'What goes wrong if you skip aud?'] });
  interview.push({ q: 'How would you implement logout and revocation with JWT access tokens?', level: 'I', a: `<p>Keep access tokens short (5-15 minutes) and store refresh tokens server-side so they can be deleted: logout deletes the refresh token, so no new access tokens appear. For instant effect I add a small Redis <b>deny-list by jti</b> with TTL equal to the token's remaining life, and a <b>per-user token version</b> claim to log out everywhere or ban a user with one write. High-risk endpoints may also introspect. I state the trade-off: any of these reintroduces a little server state.</p>`, followUps: ['What happens if Redis is down?', 'How do you size the deny-list?'] });
  interview.push({ q: 'What is refresh token rotation and how does reuse detection work?', level: 'I', a: `<p>Each use of a refresh token returns a new refresh token and marks the old one as used; all tokens from one login share a family id. If a used token is presented again, either the thief or the legitimate client holds a stale copy, so the server revokes the whole family and forces re-login. Implementation needs hashed storage, an <b>atomic</b> compare-and-set on the used flag to avoid races, an absolute and idle lifetime, and often a tiny grace window for network retries.</p>`, followUps: ['How do you handle two tabs refreshing at once?', 'What does DPoP add?'] });
  interview.push({ q: 'Walk me through OAuth2 authorization code flow with PKCE.', level: 'I', a: `<p>The client generates a random <code>code_verifier</code>, derives <code>code_challenge = BASE64URL(SHA256(verifier))</code> and a random <code>state</code>, then redirects the browser to <code>/authorize</code> with client id, redirect URI, scope, state and challenge. The user logs in and consents at the authorization server, which redirects back with a short, single-use <code>code</code> and the state. The client checks state, then calls <code>/token</code> on the back channel with the code and the verifier. The server hashes the verifier, compares with the stored challenge, and returns tokens. A stolen code is useless without the verifier.</p>`, followUps: ['What does state protect against?', 'Why is the implicit flow deprecated?', 'What is different for confidential clients?'] });
  interview.push({ q: 'When would you use the client credentials grant?', level: 'I', a: `<p>For machine-to-machine calls where no user is involved, for example a billing service calling an invoices API, or a nightly job. The service authenticates with its client id and secret (or better a private-key JWT or mTLS) at the token endpoint, asks for specific scopes, and receives a short-lived access token that it caches until near expiry. There is no refresh token or user consent, so scopes must follow least privilege and secrets come from a secrets manager.</p>`, followUps: ['How do you rotate the client secret?', 'How would you prefer to authenticate workloads inside Kubernetes?'] });
  interview.push({ q: 'What is the difference between OAuth2 and OpenID Connect?', level: 'I', a: `<p>OAuth2 is a <b>delegated authorization</b> framework: it issues access tokens that let an app call an API with limited rights. It does not define how the app learns who the user is. OpenID Connect adds an <b>authentication layer</b>: the <code>openid</code> scope, a signed <b>ID token</b> with claims like <code>iss, sub, aud, exp, nonce</code>, a UserInfo endpoint and discovery metadata. The app validates the ID token to learn who logged in; the access token is for calling APIs and the ID token should never be sent to an API as a credential.</p>`, followUps: ['How do you validate an ID token?', 'Why key users on (iss, sub)?'] });
  interview.push({ q: 'How does SSO work, and what makes logout hard?', level: 'I', a: `<p>Apps trust one identity provider. The first app redirects the user to the IdP, which authenticates (with MFA) and sets its own session cookie, then returns a code/ID token to the app, which creates a local session. A second app redirects to the same IdP, which sees the cookie and returns immediately without a prompt. Logout is hard because every app has its own local session: ending the IdP session does not end them. Solutions are short app sessions, front-channel logout, and OIDC back-channel logout where the IdP posts a signed logout token to each app.</p>`, followUps: ['SAML vs OIDC?', 'How do you deprovision a leaver quickly?'] });
  interview.push({ q: 'Compare RBAC, ABAC and ReBAC. When do you use each?', level: 'A', a: `<p><b>RBAC</b> maps users to roles and roles to permissions: simple, auditable, great for coarse job-based access, but it explodes when rules depend on context. <b>ABAC</b> evaluates policies over subject, resource, action and environment attributes: flexible (department match, working hours, risk), harder to reason about and test. <b>ReBAC</b> derives permission from relationships in a graph (owner of folder, member of team, parent inheritance): the natural model for sharing in docs, drives, and orgs, as in Zanzibar/SpiceDB. Most systems combine them: roles for coarse rights plus attribute or relationship checks for objects, always with deny by default.</p>`, followUps: ['How do you do list endpoints with ReBAC?', 'How would you test a policy set?'] });
  interview.push({ q: 'What is BOLA/IDOR and how do you prevent it systematically?', level: 'A', a: `<p>Broken object-level authorization: the user is authenticated, but the endpoint does not verify that this user may access the specific object id, so changing an id in the URL exposes other people's data. It is the top API risk. Prevention: enforce checks in a central layer (policy engine or repository methods that always take the principal and tenant), scope queries by owner or tenant (<code>WHERE id = ? AND tenant_id = ?</code>), use row-level security as a second layer, return 404 for foreign objects, and write an endpoint-by-role test matrix including cross-tenant cases. Random ids help but are not authorization.</p>`, followUps: ['Where do you put the check: controller, service or database?', 'How do you catch it in code review?'] });
  interview.push({ q: 'How would you design API key management for a developer platform?', level: 'A', a: `<p>Keys have a prefix and format <code>sk_live_&lt;id&gt;_&lt;secret&gt;</code>, the secret is 256 random bits, shown once, and only its SHA-256 is stored beside the public id. Verification: lookup by id (cached), constant-time hash compare, check revoked/expired, scope, and per-key rate limit. Support two active keys per customer for rotation, <code>last_used_at</code>, IP allow-lists, audit logs, and secret-scanning registration so leaks on GitHub auto-revoke. Keep keys out of URLs and never ship secret keys in browser or mobile code.</p>`, followUps: ['Why is plain SHA-256 fine here?', 'When would you move to OAuth?'] });
  interview.push({ q: 'How does TOTP work and how do you implement it safely?', level: 'I', a: `<p>Server and authenticator share a random secret from enrolment. Both compute <code>HMAC-SHA1(secret, floor(unixTime/30))</code>, apply dynamic truncation (offset from the last nibble, 31-bit integer) and take it modulo 10<sup>6</sup>. The server accepts the current step and ±1 for clock drift using constant-time compare, rejects any step it has already accepted (replay), rate limits attempts because only a million codes exist, stores the secret encrypted (it must be recoverable, unlike passwords), and issues hashed one-time recovery codes. For phishing resistance I would push users to passkeys/WebAuthn.</p>`, followUps: ['Why is TOTP phishable?', 'How does WebAuthn avoid that?', 'How do you design account recovery?'] });
  interview.push({ q: 'A security audit finds a long-lived API token in a public repository. What do you do?', level: 'E', a: `<p>First <b>revoke and rotate</b> immediately; do not wait for analysis. Then scope the exposure: use audit logs keyed by the token id to see calls during the exposure window (IPs, volumes, data touched) and decide on customer notification. Remove it from the repository history knowing it has been copied. Fix the cause: load secrets from env or a secrets manager, add push protection and secret scanning in CI, shorten token lifetimes, narrow scopes, and prefer workload identity or OIDC federation over static keys. Finish with a blameless postmortem and a runbook update.</p>`, followUps: ['How would you detect misuse automatically?', 'How can CI authenticate to the cloud without long-lived keys?'] });

  registerModule({
    id: 'be05',
    title: 'Authentication & Authorization',
    intro: `<p>Almost every backend must answer two questions on every request: <b>"who are you?"</b> (authentication) and <b>"what may you do?"</b> (authorization). Get them wrong and the result is the front page of the news. In this module you learn how to store passwords properly, choose between sessions and JWTs, keep users logged in with rotating refresh tokens, walk through OAuth2 (authorization code + PKCE, client credentials), OpenID Connect and SSO, design RBAC and ABAC checks, manage API keys, and add MFA/TOTP. Every topic has a picture-first explanation, runnable code, a step-by-step visualizer, and interview-ready answers.</p>`,
    goals: [
      'Store passwords with a salted, slow hash (argon2id/bcrypt/PBKDF2) and explain salt, pepper and rehash-on-login',
      'Choose between server sessions and JWTs, decode and verify a JWT by hand, and design logout and revocation',
      'Implement refresh token rotation with reuse detection and explain why it needs atomic updates',
      'Walk through OAuth2 authorization code + PKCE, client credentials, OIDC ID-token validation and SSO logout',
      'Write RBAC and ABAC permission checks (deny by default, object-level checks) and describe ReBAC',
      'Design API key storage and rotation, and compute a TOTP code from scratch'
    ],
    prereqs: `BE 1-4 (HTTP basics, first REST API, databases from code, HTTP deep dive). Comfort with headers, cookies and status codes helps.`,
    hours: 14,
    topics: topics,
    quiz: quiz,
    interview: interview,
    practice: practice
  });
})();
