(function () { var topics = [], practice = [], quiz = [], interview = [];

// The running example in this module: Contoso Shop.
//   React SPA  ->  Orders API (.NET)  ->  Inventory API (downstream)
// All ids are made-up placeholders.
var TENANT = '00000000-0000-0000-0000-000000000000';
var SPA_ID = '11111111-1111-1111-1111-111111111111';
var API_ID = '22222222-2222-2222-2222-222222222222';

// Scenario problem builder (weak answer -> strong answer).
function P(o) {
  return {
    title: o.t, level: o.l, tags: o.tags,
    statement: '<p>' + o.s + '</p>',
    constraints: o.c || 'Answer out loud in 2 to 3 minutes. Name the token, the claim and the status code at each step.',
    example: o.ex,
    brute: { why: '<p><b>Weak answer:</b> <i>&ldquo;' + o.weak + '&rdquo;</i></p><p><b>Why it fails:</b> ' + o.why + '</p>' },
    mcq: { q: o.q[0], options: o.q[1], answer: o.q[2], explain: o.q[3] },
    hints: ['<p>Hint 1: ' + o.h[0] + '</p>', '<p>Hint 2: ' + o.h[1] + '</p>', '<p>Hint 3: ' + o.h[2] + '</p>'],
    solution: { approach: o.a, code: o.code, complexity: '<p><b>What a strong answer shows:</b> ' + o.cx + '</p>', followUps: o.f }
  };
}

// Visualizer helper: a box diagram where each step lights up nodes and one edge.
function flowViz(title, label, nodes, edges, steps, height) {
  return {
    title: title,
    gen: function () {
      return steps.map(function (s) {
        var parts = [{ type: 'graph', label: label, directed: true, height: height || 60, nodes: nodes, edges: edges, hl: s.hl || {}, ehl: s.ehl || {}, tags: s.tags || {} }];
        if (s.extra) parts = parts.concat(s.extra);
        return { narr: s.n, parts: parts };
      });
    }
  };
}

// Visualizer helper: build a table row by row, one narration per row, then a summary frame.
function rowViz(title, label, columns, rows, narrs, finalNarr, selRows) {
  return {
    title: title,
    gen: function () {
      var frames = [{ narr: narrs[0], parts: [{ type: 'table', label: label, columns: columns, rows: [] }] }];
      for (var i = 0; i < rows.length; i++) {
        var h = {}; h[i] = 'cur';
        frames.push({ narr: narrs[i + 1] || rows[i][0], parts: [{ type: 'table', label: label, columns: columns, rows: rows.slice(0, i + 1), hl: h }] });
      }
      var fh = {}; (selRows || []).forEach(function (r) { fh[r] = 'sel'; });
      frames.push({ narr: finalNarr, parts: [{ type: 'table', label: label, columns: columns, rows: rows.slice(), hl: fh }] });
      return frames;
    }
  };
}

// ---------- TOPIC 1 ----------
topics.push({
  title: 'The Mental Model: Who Signs In, Who Decides, and the Three Tokens',
  analogy: `<p>Think of a <b>concert</b>. The <b>box office</b> checks your identity card and sells you a <b>wristband</b>. The <b>door guard</b> at each hall never phones the box office. The guard only looks at the wristband: is it real (the hologram), is it for <i>this</i> hall, is it for <i>today</i>, and does its colour allow the VIP area? Entra ID is the box office. Your API is the door guard. The access token is the wristband.</p>`,
  explain: `<p><b>The plain idea:</b> <b>authentication</b> answers "who are you?" and <b>authorization</b> answers "what are you allowed to do?". In a modern web app these two jobs are done by different parties.</p>
    ${H.table(['Party', 'OAuth 2.0 name', 'In our example (Contoso Shop)'], [
      ['The person', 'Resource owner', 'A shop employee who signs in'],
      ['The front end', 'Client', 'React single-page app using MSAL (Microsoft Authentication Library)'],
      ['The identity provider', 'Authorization server', 'Microsoft Entra ID (the current name of Azure Active Directory)'],
      ['The API', 'Resource server', 'The Orders API written in .NET']
    ])}
    <p><b>The one sentence that removes most confusion:</b> Entra ID signs the user in and issues signed tokens; the React app keeps the access token and sends it with every call; the API remembers nothing between calls and checks the token again, on its own machine, every time.</p>
    <p><b>Three tokens, three readers:</b></p>
    ${H.table(['Token', 'Who is meant to read it', 'Job', 'Typical lifetime in Entra ID'], [
      ['ID token', 'The client app', 'Says who signed in (name, email, object id)', 'About 1 hour'],
      ['Access token', 'The API named in <code>aud</code>', 'Proves the client may call this API with these permissions', '60 to 90 minutes by default'],
      ['Refresh token', 'Only Entra ID', 'Gets new access tokens without a new sign-in', '24 hours for single-page apps, up to 90 days for other clients']
    ])}
    <p>A <b>JWT</b> (JSON Web Token) is three Base64URL parts joined by dots: <code>header.payload.signature</code>. It is <b>signed, not encrypted</b>: anyone can read it, but nobody can change it without breaking the signature.</p>`,
  clues: ['"What is the difference between authentication and authorization?"', '"What is inside a JWT?" or "Decode this token for me"', '"ID token vs access token: which one goes to the API?"', '"How does the API trust the token without calling the identity provider?"', '"Scopes vs roles" or "delegated vs application permissions"', '"OAuth vs OpenID Connect vs SAML"', '"Is a JWT encrypted?" (a trap: it is only signed)'],
  code: [{ lang: 'csharp', title: 'Decoding is not validating: read a JWT payload with no key at all', code: `using System;
using System.Text;

public static class JwtPeek
{
    // Base64Url is Base64 that uses '-' and '_' and drops the '=' padding.
    static byte[] FromBase64Url(string s)
    {
        s = s.Replace('-', '+').Replace('_', '/');
        switch (s.Length % 4) { case 2: s += "=="; break; case 3: s += "="; break; }
        return Convert.FromBase64String(s);
    }

    // Returns the claims as JSON text. No secret and no key is needed for this.
    public static string Payload(string jwt)
    {
        string[] parts = jwt.Split('.');
        if (parts.Length != 3) throw new ArgumentException("A JWT has 3 parts");
        return Encoding.UTF8.GetString(FromBase64Url(parts[1]));
    }

    public static void Main()
    {
        string jwt = "eyJhbGciOiJub25lIn0.eyJhdWQiOiJvcmRlcnMtYXBpIiwic2NwIjoiT3JkZXJzLlJlYWQifQ.c2ln";
        Console.WriteLine(Payload(jwt));   // {"aud":"orders-api","scp":"Orders.Read"}
        // Anyone can do this. Trust only comes from checking the signature and the claims.
    }
}` }],
  viz: {
    title: 'What the API checks on one token',
    input: 'good',
    inputLabel: 'Scenario: good, tampered, wrong-aud, expired, no-scope',
    gen: function (input) {
      var sc = String(input || 'good').trim().toLowerCase();
      var ok = ['good', 'tampered', 'wrong-aud', 'expired', 'no-scope'];
      if (ok.indexOf(sc) < 0) throw new Error('Type one of: ' + ok.join(', '));
      var claims = {
        iss: 'https://login.microsoftonline.com/' + TENANT + '/v2.0',
        aud: sc === 'wrong-aud' ? '00000003-0000-0000-c000-000000000000 (Microsoft Graph)' : API_ID + ' (Orders API)',
        exp: sc === 'expired' ? '09:00 (now is 11:30)' : '12:15 (now is 11:30)',
        scp: sc === 'no-scope' ? 'Orders.Write' : 'Orders.Read',
        oid: 'aaaaaaaa-0000-0000-0000-000000000001'
      };
      var checks = [
        ['1. Header present', 'Authorization: Bearer ...', null, 'The handler reads the token from the <code>Authorization</code> header. No header means 401 straight away.'],
        ['2. Find the key', 'kid in header matches a cached public key', null, 'The header names a key id (<code>kid</code>). The API finds that public key in its cached copy of the identity provider key list. No network call.'],
        ['3. Signature', 'verify with the public key', sc === 'tampered' ? 401 : null, 'The API recomputes the signature check. If one character of the payload changed, the check fails.'],
        ['4. Issuer (iss)', 'must be our tenant', null, 'The token must come from the tenant we trust, not just from any tenant.'],
        ['5. Audience (aud)', 'must be the Orders API', sc === 'wrong-aud' ? 401 : null, 'The token must be addressed to this API. An ID token or a token for another API fails here.'],
        ['6. Lifetime (exp, nbf)', 'now must be inside the window', sc === 'expired' ? 401 : null, 'The token must not be expired. A small clock difference (5 minutes by default) is allowed.'],
        ['7. Build the user', 'claims become HttpContext.User', null, 'Authentication is done. The claims become the user object for this one request.'],
        ['8. Policy (scp or roles)', 'needs Orders.Read', sc === 'no-scope' ? 403 : null, 'Authorization is a separate step: does this caller hold the permission the endpoint needs?']
      ];
      var frames = [{ narr: 'A request arrives with a bearer token. Scenario: <b>' + sc + '</b>. These are the claims inside it. Anyone can read them; the question is whether we can <b>trust</b> them.', parts: [{ type: 'vars', label: 'Decoded payload', vals: claims }] }];
      var rows = [];
      for (var i = 0; i < checks.length; i++) {
        var c = checks[i], fail = c[2];
        rows.push([c[0], c[1], fail ? 'FAIL: ' + fail : 'pass']);
        var hl = {}; hl[i] = fail ? 'bad' : 'ok';
        frames.push({ narr: c[3] + (fail ? ' <span class="c-r">This check fails, so the API answers <b>' + fail + '</b> and stops.</span>' : ' <span class="c-g">Pass.</span>'), parts: [{ type: 'table', label: 'Checks so far', columns: ['Check', 'Rule', 'Result'], rows: rows.slice(), hl: hl }, { type: 'vars', label: 'Decoded payload', vals: claims }] });
        if (fail) {
          frames.push({ narr: fail === 401 ? '<b>401 Unauthorized</b>: the API could not trust the identity. The client should get a fresh token (or sign in again).' : '<b>403 Forbidden</b>: the API knows who is calling, but that caller lacks the permission. Getting a new token for the same scopes will not help.', parts: [{ type: 'table', label: 'Final result', columns: ['Check', 'Rule', 'Result'], rows: rows.slice(), hl: hl }] });
          return frames;
        }
      }
      frames.push({ narr: '<b>200 OK</b>. All eight checks passed, with no call to the identity provider and no server session.', parts: [{ type: 'table', label: 'Final result', columns: ['Check', 'Rule', 'Result'], rows: rows.slice() }] });
      return frames;
    }
  },
  examples: [
    { title: 'The claims you must be able to read', html: `${H.table(['Claim', 'Meaning', 'What the API does with it'], [
      ['<code>iss</code>', 'Issuer: who made the token', 'Must match the tenant you trust'],
      ['<code>aud</code>', 'Audience: who the token is for', 'Must be your API'],
      ['<code>exp</code>, <code>nbf</code>, <code>iat</code>', 'Expires, not before, issued at (Unix seconds)', 'Now must be inside the window'],
      ['<code>oid</code>, <code>tid</code>', 'User object id and tenant id', 'Together they are the stable key for a user'],
      ['<code>sub</code>', 'Subject, unique per user per app', 'Do not use it to match a user across two apps'],
      ['<code>scp</code>', 'Delegated scopes, separated by spaces', 'What the client may do for this user'],
      ['<code>roles</code>', 'App roles given to the user or to an app', 'What the caller is'],
      ['<code>azp</code> (v2) or <code>appid</code> (v1)', 'The client app that asked for the token', 'Useful for allow-lists and logs']
    ])}` },
    { title: 'Scopes vs roles in one picture', html: `${H.table(['', 'Delegated permission (scope)', 'Application permission (app role)'], [
      ['Who acts', 'A signed-in user, through the client', 'The app itself, no user'],
      ['Claim', '<code>scp</code>', '<code>roles</code>'],
      ['Flow', 'Authorization code', 'Client credentials'],
      ['Real access', 'Only what both the app was granted and the user may do', 'Whatever the admin granted the app'],
      ['Example', 'The shop SPA reads orders as Priya', 'A nightly job exports all orders']
    ])}<p>App roles can also be assigned to users (for example <code>Admin</code>), and then they arrive in <code>roles</code> for that user.</p>` },
    { title: 'OAuth 2.0 vs OpenID Connect vs SAML', html: `${H.table(['', 'OAuth 2.0', 'OpenID Connect (OIDC)', 'SAML 2.0'], [
      ['Job', 'Authorization: delegated access to an API', 'Authentication, built on top of OAuth 2.0', 'Authentication and single sign-on'],
      ['Main output', 'Access token', 'ID token plus access token', 'XML assertion'],
      ['Typical use', 'Call an API for a user', 'A "Sign in with Microsoft" button', 'Older enterprise web apps'],
      ['Format', 'Opaque or JWT', 'JWT', 'XML']
    ])}` }
  ],
  deepDive: `<p><b>How local validation works.</b> Entra ID signs tokens with a private key (RS256). The matching public keys are published at a <b>JWKS</b> address (JSON Web Key Set), which the API finds through the OpenID Connect discovery document at <code>/.well-known/openid-configuration</code>. The .NET handler downloads this once, caches it (about 12 hours by default), and reloads it when it meets an unknown <code>kid</code>, which is how key rotation works without a restart.</p>
    <p><b>Do not pin keys.</b> Entra ID rotates signing keys on its own schedule. An API that hard-codes one key will fail one day with a signature error.</p>
    <p><b>Clients should treat access tokens as opaque.</b> The token is addressed to the API. Its format can change, and tokens for Microsoft Graph cannot be validated by your code at all. The client reads the ID token (or account object) for display.</p>
    <p><b>Unique user key.</b> Use <code>tid</code> + <code>oid</code>. Email and <code>preferred_username</code> can change and can be reused. <code>sub</code> is different for the same user in each app.</p>
    <p><b>v1.0 vs v2.0 tokens.</b> v1.0 tokens use issuer <code>https://sts.windows.net/{tenant}/</code>, an <code>aud</code> like <code>api://...</code> and the claim <code>appid</code>. v2.0 tokens use <code>https://login.microsoftonline.com/{tenant}/v2.0</code>, the API client id as <code>aud</code>, and <code>azp</code>. The API's app registration decides which version it receives.</p>
    <p><b>Group claims overflow.</b> A user in more than 200 groups gets no <code>groups</code> list in a JWT, only a pointer to Microsoft Graph. This is one reason to prefer app roles.</p>`,
  aiEra: `<p><b>What AI changes:</b> assistants write sign-in code quickly, and they are often trained on years of outdated samples: the implicit flow, tokens in <code>localStorage</code> with hand-written refresh code, or <code>ValidateAudience = false</code> "to make it work". You must be able to spot these.</p>
    <p><b>Use AI as a partner:</b> paste a <i>decoded, fake</i> payload and ask <code>Which checks would an API fail on this token and why?</code> Never paste a real token into a chat tool; a live access token is a password for up to 90 minutes.</p>
    <p><b>New in the AI era:</b> AI agents call APIs for users. The same model applies: an agent acting for a user needs a delegated token with narrow scopes; an agent acting alone needs an app identity. "The agent used my admin token" is the 2026 version of a shared password.</p>
    <p><b>What you must still own:</b> naming who the audience of each token is, and explaining why the API trusts it.</p>`,
  problems: [
    P({
      t: 'The front end sends the ID token to the API', l: 'Easy', tags: ['tokens', 'audience'],
      s: 'A teammate wires the React app to send <code>idToken</code> in the <code>Authorization</code> header. The Orders API answers 401 every time. They ask you to "turn off audience validation so it works". What do you say and do?',
      ex: `<p>Decoded ID token: ${H.c('r', 'aud = ' + SPA_ID + ' (the SPA)')}. The API expects ${H.c('g', 'aud = ' + API_ID + ' (the Orders API)')}.</p>`,
      weak: 'Sure, set ValidateAudience to false. The token is still signed by Microsoft, so it is safe.',
      why: 'With audience checks off, the API accepts any token Entra ID issued in that tenant for any app. A token meant for a different app could then be replayed against your API.',
      q: ['Which token should the API accept?', ['The ID token, because it has the user name', 'An access token whose <code>aud</code> is this API', 'The refresh token', 'Any token signed by Entra ID'], 1, 'Each token has one intended reader. Only the access token is addressed to the API.'],
      h: ['Look at the <code>aud</code> claim of the token being sent and ask who it is addressed to.', 'The client must ask for a scope that belongs to the API, such as <code>api://.../Orders.Read</code>, to get an access token for it.', 'Fix the client, not the API: use <code>acquireTokenSilent</code> with the API scope and send <code>accessToken</code>. Keep audience validation on.'],
      a: `<p><b>Model answer.</b> "I would not turn off audience validation. The 401 is correct: the ID token is addressed to the SPA, so its <code>aud</code> is the SPA's client id, and the API only accepts tokens addressed to itself. The fix is in the client. The API app registration exposes a scope, for example <code>Orders.Read</code>. The SPA asks MSAL for a token with that scope, which returns an <b>access token</b> whose <code>aud</code> is the Orders API, and the interceptor sends that one. I would decode both tokens at jwt.ms in a dev tenant to show the difference to my teammate. Turning off the audience check would let a token issued for any other app in the tenant be replayed against our API."</p>`,
      cx: 'reads the <code>aud</code> claim, fixes the client, and explains the replay risk of disabling validation.',
      f: ['How would you prove this to the teammate in two minutes?', 'What does the SPA use the ID token for, then?']
    })
  ]
});

// ---------- TOPIC 2 ----------
var N3 = [
  { id: 'SPA', label: 'React SPA (MSAL)', x: 14, y: 30, shape: 'box', w: 22 },
  { id: 'IDP', label: 'Entra ID', x: 50, y: 10, shape: 'box', w: 18 },
  { id: 'API', label: 'Orders API (.NET)', x: 86, y: 30, shape: 'box', w: 22 }
];
var E3 = [['SPA', 'IDP'], ['IDP', 'SPA'], ['SPA', 'API'], ['API', 'SPA']];

topics.push({
  title: 'The Flows: Authorization Code with PKCE, Client Credentials, On-Behalf-Of',
  analogy: `<p>You leave a coat at a <b>cloakroom</b>. You get a numbered ticket, and you also whisper a secret word to the attendant that only the two of you know. Later, whoever hands in the ticket must also say the word. A thief who grabs the ticket from the floor gets nothing. The ticket is the <b>authorization code</b>. The secret word is the <b>PKCE verifier</b> (PKCE means Proof Key for Code Exchange, said "pixy").</p>`,
  explain: `<p><b>The plain idea:</b> a "flow" is just the agreed set of steps by which an app gets a token. You pick the flow by asking two things: <b>is there a user?</b> and <b>can the app keep a secret?</b> A browser app cannot keep a secret, because anyone can open the developer tools and read its code.</p>
    ${H.table(['Situation', 'Flow', 'Why'], [
      ['React or Angular app calls an API', 'Authorization code + PKCE', 'No secret in the browser; PKCE makes a stolen code useless'],
      ['Server-rendered web app', 'Authorization code as a confidential client (secret or certificate) + PKCE', 'Tokens stay on the server'],
      ['Background job or service, no user', 'Client credentials', 'The app signs in as itself'],
      ['API calls another API as the same user', 'On-behalf-of (OBO)', 'Swaps the incoming user token for a new one addressed to the next API'],
      ['TV, command line tool, no browser', 'Device code', 'The user signs in on a phone or laptop'],
      ['Azure resource calls Azure resource', 'Managed identity', 'Azure holds the credential; you store nothing'],
      ['Implicit grant', 'Do not use', 'Tokens came back in the URL; replaced by code + PKCE'],
      ['Resource owner password (ROPC)', 'Do not use', 'The app sees the password; breaks multi-factor sign-in']
    ])}
    <p><b>Authorization code + PKCE in nine steps:</b></p>
    <ol>
      <li>MSAL makes a random <code>code_verifier</code> and its SHA-256 hash, the <code>code_challenge</code>.</li>
      <li>The browser goes to Entra ID <code>/authorize</code> with the client id, redirect address, scopes, <code>state</code>, <code>nonce</code> and the challenge.</li>
      <li>The user signs in at Entra ID. Your app never sees the password.</li>
      <li>Entra ID sends the browser back with a short-lived, one-time <b>code</b>.</li>
      <li>MSAL posts the code and the <b>verifier</b> to <code>/token</code>.</li>
      <li>Entra ID hashes the verifier, compares it with the challenge, and returns the ID token, access token and refresh token.</li>
      <li>MSAL caches them in the browser.</li>
      <li>The app calls the API with <code>Authorization: Bearer</code> and the access token.</li>
      <li>The API validates the token and answers.</li>
    </ol>`,
  clues: ['"Which OAuth flow would you use for a single-page app?"', '"Explain PKCE" or "why PKCE if we already have HTTPS?"', '"How does a background job call the API with no user?"', '"Your API needs to call another API as the user"', '"Why is the implicit flow deprecated?"', '"What are state and nonce for?"', '"Public client vs confidential client"'],
  viz: [
    flowViz('Authorization code + PKCE, step by step', 'Sign-in and first API call', N3, E3, [
      { n: 'Three parties. The user clicks <b>Sign in</b> in the React app.', hl: { SPA: 'cur' } },
      { n: '<b>Step 1.</b> MSAL creates a random <code>code_verifier</code> and keeps it. It computes <code>code_challenge = SHA256(verifier)</code>.', hl: { SPA: 'cur' }, extra: [{ type: 'vars', label: 'In the browser only', vals: { code_verifier: 'dBjftJeZ4CVP... (secret)', code_challenge: 'E9Melhoa2Ow... (hash)' } }] },
      { n: '<b>Step 2.</b> The browser is redirected to <code>/authorize</code> with client id, redirect address, scopes, <code>state</code>, <code>nonce</code> and the <b>challenge</b> (not the verifier).', hl: { SPA: 'done', IDP: 'cur' }, ehl: { 'SPA-IDP': 'ok' }, extra: [{ type: 'vars', label: 'Query string', vals: { response_type: 'code', scope: 'openid profile offline_access api://' + API_ID + '/Orders.Read', code_challenge_method: 'S256' } }] },
      { n: '<b>Step 3.</b> The user signs in at Entra ID: password, multi-factor prompt, company policies. The app sees none of this.', hl: { IDP: 'cur' }, tags: { IDP: 'sign-in + MFA' } },
      { n: '<b>Step 4.</b> Entra ID redirects back to the registered address with a one-time <b>authorization code</b> in the URL.', hl: { IDP: 'done', SPA: 'cur' }, ehl: { 'IDP-SPA': 'ok' }, extra: [{ type: 'vars', vals: { code: '0.AXoA... (lives about 1 minute, single use)', state: 'same value we sent' } }] },
      { n: '<b>Step 5.</b> MSAL posts the code <b>and the verifier</b> to <code>/token</code>. An attacker who stole only the code cannot do this.', hl: { SPA: 'done', IDP: 'cur' }, ehl: { 'SPA-IDP': 'ok' } },
      { n: '<b>Step 6.</b> Entra ID checks <code>SHA256(verifier) == challenge</code>, then returns three tokens.', hl: { IDP: 'done', SPA: 'ok' }, ehl: { 'IDP-SPA': 'ok' }, extra: [{ type: 'table', label: 'Token response', columns: ['Token', 'For'], rows: [['id_token', 'the SPA'], ['access_token', 'the Orders API'], ['refresh_token', 'Entra ID only']] }] },
      { n: '<b>Step 7.</b> MSAL caches the tokens in browser storage.', hl: { SPA: 'ok' }, tags: { SPA: 'token cache' } },
      { n: '<b>Step 8.</b> The app calls the API with <code>Authorization: Bearer &lt;access token&gt;</code>.', hl: { SPA: 'done', API: 'cur' }, ehl: { 'SPA-API': 'ok' } },
      { n: '<b>Step 9.</b> The API validates signature, issuer, audience, lifetime and scope on its own, then returns <b>200</b> with data.', hl: { API: 'ok', SPA: 'ok' }, ehl: { 'API-SPA': 'ok' } }
    ], 44),
    rowViz('Pick the flow from the situation', 'Two questions: is there a user? can the app keep a secret?',
      ['Situation', 'User?', 'Can keep a secret?', 'Flow'],
      [
        ['React SPA calls Orders API', 'yes', 'no (browser)', 'Authorization code + PKCE'],
        ['Server-rendered site signs users in', 'yes', 'yes (server)', 'Authorization code, confidential client'],
        ['Nightly export job', 'no', 'yes', 'Client credentials'],
        ['Orders API calls Inventory API as the user', 'yes (passed along)', 'yes', 'On-behalf-of'],
        ['Azure Function reads Key Vault', 'no', 'no secret needed', 'Managed identity'],
        ['Command line tool on a server', 'yes', 'no', 'Device code']
      ],
      ['We fill a decision table. Ask the two questions for each situation.',
        'A browser app has a user but cannot hide a secret, so it uses the code flow protected by PKCE.',
        'A server-rendered site can hide a secret or certificate, so it is a <b>confidential client</b>.',
        'No user at all: the app signs in as itself with <b>client credentials</b> and gets an app-only token.',
        'The API already holds a user token. It swaps it for one addressed to the next API: <b>on-behalf-of</b>.',
        'Inside Azure, a <b>managed identity</b> gives the resource its own identity with no stored credential.',
        'No browser on the device: show a code, let the user sign in elsewhere.'],
      'Two questions choose the flow. In interviews, say the question out loud before the flow name.', [0, 2, 3])
  ],
  examples: [
    { title: 'What PKCE stops', html: `<p>Without PKCE, anything that can read the redirect URL (a hostile app registered for the same custom URL on a phone, a leaked log, a browser extension) could post the code to <code>/token</code> and get tokens. With PKCE the token endpoint also demands the verifier, which never left the real app's memory. HTTPS protects the wire; PKCE protects the <b>hand-over</b> on the device.</p>` },
    { title: 'Client credentials request for the Inventory API', html: `<p>No user, no browser. The scope is always the resource plus <code>/.default</code>, which means "give me the app permissions an admin already granted". The token has <code>roles</code> and no <code>scp</code>.</p>`, code: { lang: 'http', check: false, code: `POST https://login.microsoftonline.com/00000000-0000-0000-0000-000000000000/oauth2/v2.0/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
&client_id=33333333-3333-3333-3333-333333333333
&client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer
&client_assertion=<signed JWT made with the app certificate>
&scope=api://44444444-4444-4444-4444-444444444444/.default` } },
    { title: 'state and nonce are two different guards', html: `${H.table(['Value', 'Travels in', 'Stops'], [['<code>state</code>', 'The authorize request and the redirect back', 'Cross-site request forgery on the redirect: a response the app never asked for'], ['<code>nonce</code>', 'The authorize request and inside the ID token', 'Replay of an old ID token'], ['<code>code_challenge</code>', 'The authorize request; verifier goes to /token', 'Use of a stolen authorization code']])}<p>MSAL creates and checks all three for you. You still need to know what each one is for.</p>` }
  ],
  deepDive: `<p><b>Where the standards stand in 2026.</b> RFC 9700 (OAuth 2.0 Security Best Current Practice, January 2025) says: use PKCE for every code flow, including confidential clients; do not use the implicit grant; do not use the password grant; match redirect addresses exactly. The OAuth 2.1 draft folds the same rules into one document.</p>
    <p><b>Entra ID details for SPAs.</b> The redirect address must be registered under the <b>Single-page application</b> platform. Only then does the token endpoint allow the cross-origin call from the browser, and only then does Entra ID issue the 24-hour refresh token. Registering it under "Web" gives error AADSTS9002326.</p>
    <p><b>On-behalf-of.</b> The middle API posts the incoming access token as an <code>assertion</code> with <code>grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer</code> and <code>requested_token_use=on_behalf_of</code>. The middle API must be a confidential client, the incoming token must be addressed to it, and the user or an admin must have consented to the downstream scope. OBO works only for user tokens, not app-only tokens.</p>
    <p><b>Credentials for confidential clients, best to worst:</b> managed identity or workload identity federation (no secret at all), then a certificate, then a client secret. Secrets expire and leak.</p>
    <p><b>Device code</b> is useful and also a common phishing target (the attacker sends the victim a real code to enter), so many companies block it with conditional access policies.</p>`,
  aiEra: `<p><b>What AI changes:</b> code assistants still suggest the implicit flow or the password grant because old tutorials used them. A quick review rule: if you see <code>response_type=token</code>, <code>grant_type=password</code>, or a client secret inside front-end code, stop.</p>
    <p><b>Agents and flows:</b> an AI agent that acts for a signed-in user is the on-behalf-of case; an agent that runs on a schedule is the client credentials case. Remote MCP servers (Model Context Protocol, a way for AI tools to call services) use OAuth with PKCE for the same reason SPAs do: the client cannot be trusted with a secret.</p>
    <p><b>Use AI as a partner:</b> ask <code>Draw the on-behalf-of flow as numbered steps and list which aud each token has</code>, then check each <code>aud</code> yourself. Models often get the audience of the middle token wrong.</p>
    <p><b>What you must still own:</b> choosing the flow from the two questions, and saying what each extra value (state, nonce, challenge) defends against.</p>`,
  problems: [
    P({
      t: 'Walk from the Sign in click to the first row of data', l: 'Medium', tags: ['pkce', 'end-to-end'],
      s: 'The interviewer says: "The user opens the Contoso Shop SPA and clicks Sign in. Tell me everything that happens until the orders list shows, and name every token."',
      ex: `<p>Good shape: ${H.c('b', 'redirect with challenge')} → ${H.c('y', 'sign-in at Entra ID')} → ${H.c('p', 'code back')} → ${H.c('g', 'code + verifier for tokens')} → ${H.c('b', 'Bearer call')} → ${H.c('g', 'API validates locally')}.</p>`,
      weak: 'The user logs in with Microsoft, we get a JWT, and we send it to the back end which checks it.',
      why: 'It skips the code, PKCE, which token goes where, and how the API checks it. The interviewer cannot tell whether you understand or only use the library.',
      q: ['What does the SPA send to the token endpoint to redeem the code?', ['The client secret', 'The code and the code_verifier', 'The ID token', 'The user password'], 1, 'A browser app has no secret. The verifier proves it is the same app that started the flow.'],
      h: ['Start with what MSAL creates before the browser leaves your site.', 'There are two trips to Entra ID: one through the browser address bar, one as a background POST.', 'End with the API side: signature with cached keys, then iss, aud, exp, then scope, then 200. Mention what happens an hour later.'],
      a: `<p><b>Model answer.</b> "MSAL creates a random verifier and sends its hash, the challenge, in a redirect to Entra ID's authorize endpoint, along with our client id, redirect address, the scopes <code>openid profile offline_access</code> and our API scope <code>Orders.Read</code>, plus state and nonce. The user signs in at Entra ID, including any multi-factor step; our app never sees the password. Entra ID redirects back with a one-time code. MSAL posts the code and the verifier to the token endpoint. Entra ID checks the verifier against the challenge and returns an <b>ID token</b> for the app, an <b>access token</b> for the Orders API and a <b>refresh token</b>. MSAL caches them. Our HTTP interceptor asks MSAL for the access token and adds it as a Bearer header. The API validates the signature with cached public keys, then issuer, audience, lifetime and the scope, builds the user from the claims, and returns the orders. About an hour later MSAL silently uses the refresh token to get a new access token; the user notices nothing."</p>`,
      cx: 'names all three tokens and their readers, explains PKCE in one line, and finishes with local validation and silent renewal.',
      f: ['What changes if the app is server-rendered instead?', 'Where exactly could an attacker steal the code, and why does that not help them?']
    })
  ]
});

// ---------- TOPIC 3 ----------
var N4 = [
  { id: 'SPA', label: 'React SPA', x: 10, y: 34, shape: 'box', w: 16 },
  { id: 'IDP', label: 'Entra ID', x: 50, y: 8, shape: 'box', w: 16 },
  { id: 'API', label: 'Orders API', x: 42, y: 34, shape: 'box', w: 18 },
  { id: 'INV', label: 'Inventory API', x: 78, y: 34, shape: 'box', w: 20 },
  { id: 'KV', label: 'Key Vault', x: 42, y: 56, shape: 'box', w: 16 }
];
var E4 = [['SPA', 'API'], ['API', 'IDP'], ['IDP', 'API'], ['API', 'INV'], ['API', 'KV'], ['SPA', 'IDP']];

topics.push({
  title: 'End to End: A Stateless API, Token Storage, Renewal and Revocation',
  analogy: `<p>A <b>hotel key card</b> versus a <b>guest list</b>. With a key card, the door reads the card and opens: fast, no phone call, but if you lose the card it works until it expires. With a guest list, the doorman looks up your name every time: slower and he needs the list nearby, but the manager can cross you off this second. A signed JWT is the key card. A server session or an opaque token is the guest list.</p>`,
  explain: `<p><b>The plain idea:</b> with bearer tokens the API keeps <b>no memory of the user</b>. Each request stands alone. The user object (<code>HttpContext.User</code>) is rebuilt from the token on every call and thrown away at the end. The only things the API caches are the identity provider's settings and public keys.</p>
    <p><b>Who stores what:</b></p>
    ${H.table(['Place', 'What lives there', 'Note'], [
      ['Entra ID', 'The sign-in session (a cookie on the Microsoft sign-in site), consent, refresh token state', 'This is what makes single sign-on work'],
      ['Browser (MSAL cache)', 'ID token, access token, refresh token', '<code>sessionStorage</code> by default; <code>localStorage</code> or memory are options'],
      ['The API', 'Nothing about the user', 'Only cached signing keys and metadata'],
      ['A server session (cookie or BFF designs only)', 'A session id that maps to tokens kept on the server', 'A different design, covered below']
    ])}
    <p><b>Renewal:</b> before each call the app asks MSAL for a token (<code>acquireTokenSilent</code>). MSAL returns the cached one if it is still valid, or quietly uses the refresh token to get a new one. If that is impossible (refresh token expired, password changed, a new multi-factor rule), MSAL raises <code>InteractionRequiredAuthError</code> and the app sends the user to sign in again.</p>
    <p><b>Revocation:</b> a JWT cannot be "un-issued". It stays valid until <code>exp</code>. That is why access tokens are short-lived, and why systems that need an instant "off switch" use sessions or opaque tokens that are looked up on every call.</p>`,
  clues: ['"How does the API remember the logged-in user?" (it does not)', '"Where do you store the token in the browser?"', '"Session cookie vs JWT: when would you pick each?"', '"A user was fired at 10:00. When do they lose access?"', '"What happens when the access token expires?"', '"What is a BFF?" (backend for frontend)', '"How do two services authenticate to each other?"', '"How do you store the Key Vault secret to read Key Vault?" (a trap: managed identity)'],
  viz: flowViz('One user request through three services, with no stored secret', 'React SPA → Orders API → Inventory API', N4, E4, [
    { n: 'The user is signed in. The SPA holds an access token whose audience is the <b>Orders API</b>.', hl: { SPA: 'cur' }, extra: [{ type: 'vars', label: 'Token A (in the browser)', vals: { aud: 'Orders API', scp: 'Orders.Read', oid: 'Priya' } }] },
    { n: 'The SPA calls the Orders API with token A as a Bearer header.', hl: { SPA: 'done', API: 'cur' }, ehl: { 'SPA-API': 'ok' } },
    { n: 'The Orders API validates token A <b>locally</b>: signature with cached keys, issuer, audience, lifetime, scope. No session lookup.', hl: { API: 'ok' }, tags: { API: 'validate A' } },
    { n: 'The Orders API needs stock levels from the Inventory API. Token A is <b>not</b> addressed to Inventory, so forwarding it would fail (wrong <code>aud</code>).', hl: { API: 'cur', INV: 'bad' } },
    { n: '<b>On-behalf-of:</b> the Orders API sends token A plus its own credential to Entra ID and asks for a token for the Inventory API, still as Priya.', hl: { API: 'cur', IDP: 'cur' }, ehl: { 'API-IDP': 'ok' } },
    { n: 'Entra ID returns token B. Same user, new audience, new scope.', hl: { IDP: 'done', API: 'ok' }, ehl: { 'IDP-API': 'ok' }, extra: [{ type: 'vars', label: 'Token B (on the server only)', vals: { aud: 'Inventory API', scp: 'Stock.Read', oid: 'Priya', azp: 'Orders API' } }] },
    { n: 'The Orders API calls the Inventory API with token B. Inventory validates it the same way and can apply its own rules for Priya.', hl: { API: 'done', INV: 'ok' }, ehl: { 'API-INV': 'ok' } },
    { n: 'The Orders API also needs a connection string. It reads Key Vault using its <b>managed identity</b>: Azure gives it a token for Key Vault. No password is stored anywhere.', hl: { API: 'cur', KV: 'ok' }, ehl: { 'API-KV': 'ok' } },
    { n: 'An hour later token A expires. MSAL uses the refresh token at Entra ID to get a new one silently. The API never refreshes tokens; it only checks them.', hl: { SPA: 'cur', IDP: 'cur' }, ehl: { 'SPA-IDP': 'ok' } }
  ], 64),
  examples: [
    { title: 'Browser storage trade-offs', html: `${H.table(['Where', 'Can injected script read it? (XSS)', 'Sent automatically? (CSRF)', 'Survives reload'], [
      ['<code>localStorage</code>', 'Yes', 'No', 'Yes, across tabs'],
      ['<code>sessionStorage</code>', 'Yes', 'No', 'Yes, this tab only'],
      ['In-memory variable', 'Harder, not impossible', 'No', 'No (get it again silently)'],
      ['HttpOnly, Secure, SameSite cookie', 'No', 'Yes, so defend against CSRF', 'Yes']
    ])}<p>XSS (cross-site scripting) is hostile script running in your page. CSRF (cross-site request forgery) is another site making the browser send a request with your cookies.</p>` },
    { title: 'Server session vs JWT bearer', html: `${H.table(['', 'Server session (cookie)', 'JWT bearer'], [
      ['Client holds', 'A random session id in an HttpOnly cookie', 'The token itself'],
      ['Identity lives', 'In a server-side store', 'Inside the signed token'],
      ['Each request', 'Look up the session', 'Verify signature and claims locally'],
      ['Revoke', 'Instant: delete the session', 'Hard: valid until expiry'],
      ['Scaling', 'Needs a shared store such as Redis', 'No shared state'],
      ['Mobile and other APIs as clients', 'Awkward', 'Natural'],
      ['CSRF', 'Must defend', 'Not an issue for header tokens']
    ])}` },
    { title: 'Opaque tokens and introspection', html: `<p>An <b>opaque token</b> is a random string with no readable content. The API cannot check it alone. It asks the issuer on each call ("token introspection", RFC 7662) or calls a session endpoint, and gets back who the caller is.</p><p>Example: a booking platform gives each signed-in user a session id. Every service call sends that id in a header. The service asks the platform's session endpoint "who is this?", receives the user and tenant, builds a request context, and passes that context inward. Nothing is stored by the service.</p><p><b>Trade-off:</b> introspection gives instant revocation but adds a network call and a dependency to every request. Local JWT validation is fast and independent but valid until expiry.</p>` }
  ],
  deepDive: `<p><b>BFF (backend for frontend).</b> A small server sits next to the SPA. It runs the OpenID Connect flow as a confidential client, keeps the access and refresh tokens on the server, and gives the browser only an HttpOnly session cookie. It attaches the token when it forwards calls to the API. No token is ever readable by script in the page, which is why current IETF guidance for browser-based apps recommends it for sensitive apps. The cost is one more component, and you must now defend against CSRF.</p>
    <p><b>What "revoke" really offers in Entra ID.</b> Revoking sign-in sessions kills refresh tokens at once. Access tokens already issued keep working until they expire. <b>Continuous Access Evaluation (CAE)</b> closes that gap for services that support it (Microsoft Graph, Exchange, SharePoint, Teams): Entra ID tells the service about events such as "user disabled" or "password changed", and the service rejects the token within minutes with a 401 that carries a claims challenge. In return, CAE tokens can live up to 28 hours.</p>
    <p><b>Other tools:</b> a small deny-list of token ids (<code>jti</code>) or user ids in a cache for emergencies; checking a "disabled" flag in your own database for the most sensitive actions; sender-constrained tokens (DPoP, RFC 9449, or mutual TLS) that are useless without the client's private key.</p>
    <p><b>Refresh token rules.</b> SPAs get a refresh token with a fixed 24-hour life. When it ends, MSAL tries a hidden iframe that relies on the Entra ID session cookie; browsers that block third-party cookies (Safari, Firefox, private windows) make that fail, and the user sees a redirect or popup.</p>
    <p><b>Token cache on the server.</b> For on-behalf-of in a scaled-out API, use a distributed token cache (Redis or SQL), not the in-memory one, or every instance repeats the exchange.</p>`,
  aiEra: `<p><b>What AI changes:</b> generated React code often saves a token to <code>localStorage</code> by hand and reads it back in every component. With MSAL you never touch storage yourself. Generated .NET code sometimes adds <code>AddSession()</code> "to remember the user" next to JWT bearer; that mixes two models and is a sign the author did not understand statelessness.</p>
    <p><b>Agents make revocation matter more.</b> A long-running AI agent holds tokens for hours. Give it short-lived, narrow tokens and a way to cut it off: per-agent identities, and a kill switch that revokes its sessions.</p>
    <p><b>Use AI as a partner:</b> ask <code>List what happens to an in-flight request when the user is disabled at 10:00 and the token expires at 10:40</code>, then compare with your own timeline.</p>
    <p><b>What you must still own:</b> the trade-off sentence: local validation is fast but cannot be revoked instantly; lookup can be revoked instantly but costs a call.</p>`,
  problems: [
    P({
      t: 'Local JWT validation or introspection for a platform that needs instant revocation?', l: 'Hard', tags: ['revocation', 'design'],
      s: 'You are designing a payroll platform. Security says: "When we disable a user, access must stop within 10 seconds." Today the API validates Entra ID JWTs locally with a 60-minute lifetime. What do you propose?',
      ex: `<p>Timeline today: ${H.c('g', '09:30 token issued')} → ${H.c('r', '10:00 user disabled')} → ${H.c('y', 'token still accepted')} → ${H.c('g', '10:30 token expires')}. A 30-minute gap.</p>`,
      weak: 'Just set the token lifetime to 10 seconds.',
      why: 'Every user would hit the token endpoint constantly, sign-in outages would break the app within seconds, and Entra ID does not allow lifetimes that short (the minimum is 10 minutes).',
      q: ['Which design gives instant revocation with the least extra latency for normal requests?', ['Local JWT validation plus a small cached deny-list pushed on disable events', 'Longer token lifetimes', 'Turning off lifetime validation', 'Storing the JWT in a database and never checking it'], 0, 'The deny-list is tiny and cached, so normal requests stay local, while a disable event takes effect in seconds.'],
      h: ['A signed token is valid until it expires. Something must be looked up if you want an off switch.', 'Compare three options: opaque token with introspection, BFF session, JWT plus deny-list.', 'Say the trade-off for each (latency, dependency, complexity), pick one for the 10-second rule, and say what happens if the lookup store is down.'],
      a: `<p><b>Model answer.</b> "A JWT cannot be recalled, so something has to be checked per request. I see three options. <b>One:</b> opaque tokens with introspection: instant revocation, but every request pays a network call and the identity service becomes a hard dependency. <b>Two:</b> a BFF with server sessions: delete the session and access stops; good for a browser app, less natural for other API clients. <b>Three:</b> keep local JWT validation and add a deny-list: when a user is disabled, an event writes their <code>oid</code> to Redis with a time-to-live equal to the longest token lifetime, and each API instance checks a local copy refreshed every few seconds. For this platform I would choose three: normal requests stay fast and independent, and revocation lands inside 10 seconds. I would also shorten access tokens to 10 or 15 minutes, revoke refresh tokens on disable, and decide the failure mode up front: if Redis is unreachable, sensitive endpoints fail closed and read-only ones continue."</p>`,
      cx: 'states that JWTs cannot be recalled, compares options with their costs, picks one, and names the failure mode.',
      f: ['What does Continuous Access Evaluation give you here, and what does it not?', 'How big can the deny-list grow, and how do you keep it small?']
    })
  ]
});

// ---------- TOPIC 4 ----------
var TS_CONFIG = `// authConfig.ts
import { Configuration, LogLevel, PublicClientApplication } from "@azure/msal-browser";

export const msalConfig: Configuration = {
  auth: {
    clientId: "11111111-1111-1111-1111-111111111111",            // the SPA app registration
    authority: "https://login.microsoftonline.com/00000000-0000-0000-0000-000000000000",
    redirectUri: window.location.origin,                          // must be registered as a SPA redirect
    postLogoutRedirectUri: window.location.origin,
  },
  cache: { cacheLocation: "sessionStorage" },                     // the default; cleared when the tab closes
  system: { loggerOptions: { logLevel: LogLevel.Warning } },
};

// A scope of OUR API: Application ID URI + scope name from the API app registration.
export const apiRequest = {
  scopes: ["api://22222222-2222-2222-2222-222222222222/Orders.Read"],
};

export const msalInstance = new PublicClientApplication(msalConfig);`;

var TS_MAIN = `// main.tsx
import { createRoot } from "react-dom/client";
import { MsalProvider, AuthenticatedTemplate, UnauthenticatedTemplate, useMsal } from "@azure/msal-react";
import { msalInstance, apiRequest } from "./authConfig";
import { OrdersPage } from "./OrdersPage";

function Shell() {
  const { instance } = useMsal();
  return (
    <>
      <UnauthenticatedTemplate>
        <button onClick={() => instance.loginRedirect(apiRequest)}>Sign in</button>
      </UnauthenticatedTemplate>
      <AuthenticatedTemplate>
        <OrdersPage />
      </AuthenticatedTemplate>
    </>
  );
}

async function start() {
  await msalInstance.initialize();                       // required since msal-browser v3
  await msalInstance.handleRedirectPromise();            // finishes a sign-in that is coming back
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length > 0) msalInstance.setActiveAccount(accounts[0]);

  createRoot(document.getElementById("root")!).render(
    <MsalProvider instance={msalInstance}>
      <Shell />
    </MsalProvider>
  );
}
start();`;

var TS_CLIENT = `// apiClient.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { msalInstance, apiRequest } from "./authConfig";

export const api = axios.create({ baseURL: "https://api.contoso.example", timeout: 30000 });

// One shared promise, so many callers wait for ONE refresh (single-flight).
let refreshing: Promise<string> | null = null;

async function getAccessToken(forceRefresh = false): Promise<string> {
  const account = msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0];
  if (!account) throw new Error("Not signed in");
  try {
    // Cached token if still valid; otherwise MSAL silently uses the refresh token.
    const result = await msalInstance.acquireTokenSilent({ ...apiRequest, account, forceRefresh });
    return result.accessToken;
  } catch (e) {
    if (e instanceof InteractionRequiredAuthError) {
      await msalInstance.acquireTokenRedirect({ ...apiRequest, account });   // the user must interact
    }
    throw e;
  }
}

function refreshOnce(): Promise<string> {
  if (!refreshing) {
    refreshing = getAccessToken(true).finally(() => { refreshing = null; });
  }
  return refreshing;
}

// REQUEST: attach a token to every call. This instance only talks to our own API.
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getAccessToken();
  config.headers.Authorization = "Bearer " + token;
  config.headers["X-Correlation-ID"] = crypto.randomUUID();
  return config;
});

// RESPONSE: on 401, refresh once and retry once. Never retry a 403.
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    if (error.response?.status === 401 && original && !original._retried) {
      original._retried = true;
      const token = await refreshOnce();
      original.headers.Authorization = "Bearer " + token;
      return api(original);
    }
    return Promise.reject(error);
  }
);`;

var TS_NG = `// Option 1: MSAL's own interceptor maps URL prefixes to scopes.
export function msalInterceptorConfig(): MsalInterceptorConfiguration {
  return {
    interactionType: InteractionType.Redirect,
    protectedResourceMap: new Map([
      ["https://api.contoso.example/", ["api://22222222-2222-2222-2222-222222222222/Orders.Read"]],
    ]),                                              // only these URLs get a token
  };
}
// providers: provideHttpClient(withInterceptorsFromDi()),
//            { provide: HTTP_INTERCEPTORS, useClass: MsalInterceptor, multi: true }

// Option 2: your own functional interceptor.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  if (!req.url.startsWith(environment.apiBaseUrl)) return next(req);   // never leak tokens to other hosts
  return from(auth.getAccessToken()).pipe(
    switchMap((token) => next(req.clone({ setHeaders: { Authorization: "Bearer " + token } }))),
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) auth.login();
      return throwError(() => err);
    })
  );
};
// providers: provideHttpClient(withInterceptors([authInterceptor]))`;

var SF_CODE = 'let refreshing = null;\nfunction refreshOnce() {\n  if (!refreshing) {\n    refreshing = getAccessToken(true)\n      .finally(() => { refreshing = null; });\n  }\n  return refreshing;\n}\n// response interceptor, on 401:\nconst token = await refreshOnce();\noriginal.headers.Authorization = "Bearer " + token;\nreturn api(original);';

topics.push({
  title: 'The Front End: MSAL in React, the API Client and the Interceptor',
  analogy: `<p>An office has a <b>mail room</b>. Staff do not buy stamps. They drop letters in the out-tray and the mail room stamps every single one, and only letters going to approved addresses. If the stamps run out, the mail room buys one new roll, not one roll per waiting letter. The mail room is the <b>interceptor</b>. The stamp is the <b>access token</b>. Buying one roll for everyone waiting is <b>single-flight</b>.</p>`,
  explain: `<p><b>The plain idea:</b> the front end has three jobs, and MSAL does most of the work.</p>
    <ol>
      <li><b>Sign the user in.</b> Configure MSAL with the SPA's client id and the tenant, wrap the app in <code>MsalProvider</code>, and call <code>loginRedirect</code>.</li>
      <li><b>Get a token for the API before each call.</b> Call <code>acquireTokenSilent</code> with the API's scope. MSAL returns a cached token or refreshes it quietly.</li>
      <li><b>Attach it in one place.</b> All calls go through one API client. An <b>interceptor</b> (a function that runs on every request and response) adds the <code>Authorization: Bearer</code> header, so no developer can forget it.</li>
    </ol>
    <p><b>Why both an API service and an interceptor?</b> The service gives one place for the base address, types and error mapping. The interceptor handles what is the same for every call: token, correlation id, one retry on 401.</p>
    <p><b>Three rules interviewers listen for:</b></p>
    <ul>
      <li>Attach tokens <b>only to your own API's addresses</b>, never to third-party hosts.</li>
      <li>On 401, refresh and retry <b>once</b>. On 403, do not retry; show "not allowed".</li>
      <li>Route guards and hidden buttons are <b>user experience, not security</b>. Anyone can call the API with curl. The API enforces.</li>
    </ul>`,
  clues: ['"How do you make sure every API call carries the token?"', '"Why an interceptor on top of the API service?"', '"What happens in the UI when the token expires?"', '"Five requests fail with 401 at the same time. What does your code do?"', '"Is a route guard enough to protect the admin page?"', '"How would you do this in Angular?"', '"loginRedirect or loginPopup?"'],
  code: [{ lang: 'ts', check: false, title: 'MSAL configuration', code: TS_CONFIG }, { lang: 'ts', check: false, title: 'Start-up and sign-in button', code: TS_MAIN }, { lang: 'ts', check: false, title: 'API client with request and response interceptors', code: TS_CLIENT }, { lang: 'ts', check: false, title: 'Angular: two ways', code: TS_NG }],
  codeTitle: ['authConfig.ts', 'main.tsx', 'apiClient.ts', 'Angular'],
  viz: {
    title: 'Three 401s at once: single-flight refresh',
    input: '3',
    inputLabel: 'How many requests fail with 401 at the same moment (2 to 6)',
    gen: function (input) {
      var n = parseInt(String(input).trim(), 10);
      if (isNaN(n) || n < 2 || n > 6) throw new Error('Enter a number from 2 to 6');
      var names = []; for (var i = 0; i < n; i++) names.push('GET /orders/' + (i + 1));
      var frames = [], waiting = [];
      frames.push({ narr: n + ' requests were sent with a token that has just expired. All ' + n + ' come back <b>401</b> almost together.', parts: [{ type: 'queue', label: 'Responses arriving', items: names.map(function (x) { return x + ' : 401'; }) }, { type: 'vars', vals: { refreshing: 'null', 'calls to Entra ID': 0 } }, { type: 'code', lang: 'ts', code: SF_CODE, hl: {} }] });
      for (var k = 0; k < n; k++) {
        waiting.push(names[k]);
        var first = k === 0, hl = {};
        if (first) { hl[3] = 'cur'; hl[4] = 'ok'; } else { hl[3] = 'cur'; hl[7] = 'ok'; }
        var qh = {}; qh[k] = first ? 'ok' : 'win';
        frames.push({ narr: first ? '<b>' + names[k] + '</b> reaches the handler first. <code>refreshing</code> is empty, so it starts <b>one</b> refresh and stores the promise.' : '<b>' + names[k] + '</b> arrives. <code>refreshing</code> is already set, so it does <b>not</b> start another refresh. It waits on the same promise.', parts: [{ type: 'queue', label: 'Waiting on the shared promise', items: waiting.slice(), hl: qh }, { type: 'vars', vals: { refreshing: 'Promise (pending)', 'calls to Entra ID': 1 }, hl: { 'calls to Entra ID': first ? 'ok' : '' } }, { type: 'code', lang: 'ts', code: SF_CODE, hl: hl }] });
      }
      frames.push({ narr: 'Entra ID answers once. The promise resolves with the new token, and <code>finally</code> clears <code>refreshing</code> for next time.', parts: [{ type: 'queue', label: 'All waiters wake with the same token', items: waiting.slice() }, { type: 'vars', vals: { refreshing: 'null', token: 'new access token', 'calls to Entra ID': 1 }, hl: { token: 'ok' } }, { type: 'code', lang: 'ts', code: SF_CODE, hl: { 5: 'ok' } }] });
      frames.push({ narr: 'Each request is replayed <b>once</b> with the new token and marked <code>_retried</code>, so a second 401 will not loop.', parts: [{ type: 'queue', label: 'Retried', items: names.map(function (x) { return x + ' : 200'; }) }, { type: 'code', lang: 'ts', code: SF_CODE, hl: { 11: 'ok', 12: 'ok' } }] });
      frames.push({ narr: 'Without single-flight there would have been <b>' + n + '</b> refresh calls instead of <b>1</b>. With refresh token rotation, parallel refreshes can even cancel each other.', parts: [{ type: 'bars', label: 'Refresh calls to Entra ID', values: [n, 1], idxLabels: ['naive', 'single-flight'], hl: { 0: 'bad', 1: 'ok' } }] });
      return frames;
    }
  },
  examples: [
    { title: 'A route guard is user experience, not security', html: `<p>This sends signed-out users to the sign-in page, which is polite. It protects nothing: the API must reject the call on its own.</p>`, code: { lang: 'ts', check: false, code: `import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useIsAuthenticated } from "@azure/msal-react";

export function RequireAuth({ children }: { children: ReactNode }) {
  const isAuthenticated = useIsAuthenticated();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}` } },
    { title: 'Redirect or popup?', html: `${H.table(['', '<code>loginRedirect</code>', '<code>loginPopup</code>'], [['What the user sees', 'The whole page goes to Microsoft and comes back', 'A small window opens'], ['Works when popups are blocked', 'Yes', 'No'], ['Keeps in-page state', 'No, the app reloads', 'Yes'], ['Good default for', 'Most apps, mobile browsers, embedded browsers', 'Apps where losing unsaved work would hurt']])}<p>With redirects, call <code>handleRedirectPromise()</code> at start-up (the <code>MsalProvider</code> does this for you) before asking for accounts.</p>` },
    { title: 'What the user sees when things expire', html: `${H.table(['Event', 'What MSAL does', 'User sees'], [['Access token expired, refresh token valid', 'Silent call to the token endpoint', 'Nothing'], ['Refresh token expired (24 hours in a SPA), Entra ID session alive', 'Hidden iframe, or a quick redirect that returns at once', 'Nothing, or a flicker'], ['Entra ID session ended, password changed, new MFA rule', 'Throws <code>InteractionRequiredAuthError</code>', 'The sign-in page'], ['API returns 401 anyway', 'Interceptor forces one refresh and retries', 'Nothing if the retry works']])}` }
  ],
  deepDive: `<p><b>MSAL already protects against some races.</b> It de-duplicates identical silent requests that overlap. Your own single-flight still matters because the response interceptor forces a refresh, and because some teams use libraries other than MSAL.</p>
    <p><b>One interaction at a time.</b> Starting a redirect or popup while another is in progress throws <code>interaction_in_progress</code>. Check <code>inProgress === InteractionStatus.None</code> from <code>useMsal()</code> before you start one.</p>
    <p><b>Cache location.</b> <code>sessionStorage</code> is the default: signing in again per tab is the price. <code>localStorage</code> shares the session across tabs. Recent MSAL versions encrypt the <code>localStorage</code> cache, which helps against casual copying from disk but not against script running inside your page. Real protection against XSS is a strict Content Security Policy, no <code>dangerouslySetInnerHTML</code> with untrusted data, and for high-value apps a BFF.</p>
    <p><b>Scopes for two APIs.</b> One access token has one audience. If the SPA calls the Orders API and Microsoft Graph, it asks for two tokens with two calls, and the interceptor picks by URL. Asking for scopes of two resources in one request fails.</p>
    <p><b>Anything in the bundle is public.</b> Client id and tenant id are not secrets. A client secret or API key in front-end code is a leak.</p>
    <p><b>Sign-out.</b> <code>logoutRedirect</code> clears the MSAL cache and ends the Entra ID session. Clearing only local storage leaves the Microsoft session alive, so "Sign in" signs the same user straight back in.</p>`,
  aiEra: `<p><b>What AI changes:</b> assistants produce a working interceptor in seconds. Review it for the four classic gaps: it attaches the token to <b>every</b> URL, including third parties; it retries 401 forever; it starts one refresh per failed call; it treats 403 like 401 and loops.</p>
    <p><b>Use AI as a partner:</b> <code>Write tests for this interceptor: token attached only to our base URL, one retry on 401, no retry on 403, one refresh for five parallel 401s.</code> Tests are where generated auth code earns trust.</p>
    <p><b>AI chat front ends</b> that stream answers use <code>fetch</code> or server-sent events, which bypass an Axios interceptor. Make sure the streaming call path also gets its token from the same function.</p>
    <p><b>What you must still own:</b> the statement that the browser is not a trust boundary. Front-end checks improve the experience; the API decides.</p>`
});

// ---------- TOPIC 5 ----------
var CS_PROGRAM = `// appsettings.json (no secrets here; ids are not secrets)
// "AzureAd": {
//   "Instance": "https://login.microsoftonline.com/",
//   "TenantId": "00000000-0000-0000-0000-000000000000",
//   "ClientId": "22222222-2222-2222-2222-222222222222",
//   "Audience": "api://22222222-2222-2222-2222-222222222222"
// }

// Program.cs
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Identity.Web;

var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddMicrosoftIdentityWebApi(builder.Configuration.GetSection("AzureAd"));

builder.Services.AddAuthorization(options =>
{
    // Secure by default: every endpoint needs a signed-in caller unless marked [AllowAnonymous].
    options.FallbackPolicy = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build();

    options.AddPolicy("Orders.Read",  p => p.RequireScope("Orders.Read"));    // delegated permission (scp)
    options.AddPolicy("Orders.Write", p => p.RequireScope("Orders.Write"));
    options.AddPolicy("AdminsOnly",   p => p.RequireRole("Admin"));           // app role (roles)
});

builder.Services.AddControllers();
var app = builder.Build();

app.UseHttpsRedirection();
app.UseCors();              // before authentication, so browser preflight requests get an answer
app.UseAuthentication();    // validates the token and fills HttpContext.User
app.UseAuthorization();     // evaluates [Authorize] and policies
app.MapControllers();
app.Run();`;

var CS_RAW = `// The same thing without the helper library, so you can explain each check.
string tenantId = "00000000-0000-0000-0000-000000000000";
string apiClientId = "22222222-2222-2222-2222-222222222222";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        // Downloads the discovery document and signing keys from here, then caches them.
        o.Authority = $"https://login.microsoftonline.com/{tenantId}/v2.0";
        o.MapInboundClaims = false;                    // keep short claim names such as "roles" and "scp"
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = $"https://login.microsoftonline.com/{tenantId}/v2.0",
            ValidateAudience = true,
            ValidAudience = apiClientId,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(2),       // default is 5 minutes
            ValidateIssuerSigningKey = true,
            RequireSignedTokens = true,
            ValidAlgorithms = new[] { SecurityAlgorithms.RsaSha256 },
            NameClaimType = "name",
            RoleClaimType = "roles"
        };
        o.Events = new JwtBearerEvents
        {
            OnAuthenticationFailed = ctx =>
            {
                var log = ctx.HttpContext.RequestServices.GetRequiredService<ILogger<Program>>();
                log.LogWarning(ctx.Exception, "Token rejected");   // log the reason, never the token
                return Task.CompletedTask;
            }
        };
    });`;

var CS_CTRL = `[ApiController, Route("api/v1/orders")]
[Authorize(Policy = "Orders.Read")]
public class OrdersController(IOrderService orders, IAuthorizationService authz) : ControllerBase
{
    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id, CancellationToken ct)
    {
        string oid = User.GetObjectId()!;        // Microsoft.Identity.Web helper for the "oid" claim
        string tid = User.GetTenantId()!;        // tenant comes from the token, never from the request body

        Order? order = await orders.FindAsync(tid, id, ct);
        if (order is null) return NotFound();

        // Resource-based check: the token says WHO; this rule says WHICH records.
        var result = await authz.AuthorizeAsync(User, order, new SameStoreRequirement());
        return result.Succeeded ? Ok(order) : Forbid();      // Forbid() -> 403
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = "AdminsOnly")]            // adds to the class policy: both must pass
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        await orders.DeleteAsync(User.GetTenantId()!, id, ct);
        return NoContent();
    }
}

public class SameStoreRequirement : IAuthorizationRequirement { }

public class SameStoreHandler : AuthorizationHandler<SameStoreRequirement, Order>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext ctx, SameStoreRequirement req, Order order)
    {
        string? store = ctx.User.FindFirst("store")?.Value;
        if (store == order.StoreId || ctx.User.IsInRole("Admin")) ctx.Succeed(req);
        return Task.CompletedTask;                // not calling Succeed means "denied"
    }
}
// Program.cs: builder.Services.AddSingleton<IAuthorizationHandler, SameStoreHandler>();`;

var CS_OBO = `// Orders API calls the Inventory API as the same user (on-behalf-of).
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddMicrosoftIdentityWebApi(builder.Configuration.GetSection("AzureAd"))
    .EnableTokenAcquisitionToCallDownstreamApi()
    .AddDownstreamApi("Inventory", builder.Configuration.GetSection("Inventory"))
    .AddDistributedTokenCaches();                 // Redis or SQL behind IDistributedCache when scaled out

// In a service:
public class StockClient(IDownstreamApi inventory)
{
    public Task<StockDto?> GetAsync(string sku) =>
        inventory.GetForUserAsync<StockDto>("Inventory", o => o.RelativePath = "api/stock/" + sku);
}

// Service to Azure resource: managed identity, nothing stored.
var secrets = new SecretClient(new Uri("https://contoso-shop-kv.vault.azure.net/"), new DefaultAzureCredential());
KeyVaultSecret conn = await secrets.GetSecretAsync("OrdersDb");

// Service to service with no user: client credentials (prefer a certificate or managed identity).
IConfidentialClientApplication daemon = ConfidentialClientApplicationBuilder
    .Create("33333333-3333-3333-3333-333333333333")
    .WithCertificate(certificateFromKeyVault)
    .WithAuthority("https://login.microsoftonline.com/00000000-0000-0000-0000-000000000000")
    .Build();
AuthenticationResult token = await daemon
    .AcquireTokenForClient(new[] { "api://44444444-4444-4444-4444-444444444444/.default" })
    .ExecuteAsync();`;

var N5 = [
  { id: 'REQ', label: 'Request', x: 8, y: 20, shape: 'box', w: 12 },
  { id: 'CORS', label: 'CORS', x: 25, y: 20, shape: 'box', w: 10 },
  { id: 'AUTHN', label: 'Authentication', x: 44, y: 20, shape: 'box', w: 18 },
  { id: 'AUTHZ', label: 'Authorization', x: 65, y: 20, shape: 'box', w: 16 },
  { id: 'EP', label: 'Endpoint', x: 86, y: 20, shape: 'box', w: 14 },
  { id: 'KEYS', label: 'Cached signing keys', x: 44, y: 44, shape: 'box', w: 22 }
];
var E5 = [['REQ', 'CORS'], ['CORS', 'AUTHN'], ['AUTHN', 'AUTHZ'], ['AUTHZ', 'EP'], ['AUTHN', 'KEYS']];

topics.push({
  title: 'The Back End: Token Validation, Scopes, Roles and Policies in .NET',
  analogy: `<p>An <b>airport</b> has two different desks. At <b>passport control</b> the officer checks that your passport is real, is yours, and has not expired. That is authentication. At the <b>gate</b> the agent checks that your boarding pass is for this flight and this cabin. That is authorization. A real passport with no boarding pass does not get you on the plane (403). A fake passport never reaches the gate (401).</p>`,
  explain: `<p><b>The plain idea:</b> in ASP.NET Core, two pieces of middleware run on every request. <b>Authentication</b> turns the token into a user (<code>HttpContext.User</code>). <b>Authorization</b> decides whether that user may run this endpoint.</p>
    <p><b>What the JWT bearer handler does each time:</b></p>
    <ol>
      <li>Reads the token from <code>Authorization: Bearer ...</code>. Missing or bad token means no user, and a protected endpoint then answers <b>401</b>.</li>
      <li>Finds the public key named by <code>kid</code> in its cached key set and verifies the signature.</li>
      <li>Checks <code>iss</code> (our tenant), <code>aud</code> (this API), <code>exp</code> and <code>nbf</code> (now is inside the window, 5 minutes of slack by default), and that the algorithm is an expected one.</li>
      <li>Builds a <code>ClaimsPrincipal</code> from the claims, for this request only.</li>
    </ol>
    <p><b>Then authorization runs:</b> <code>[Authorize]</code> attributes and <b>policies</b> check scopes (<code>scp</code>), roles (<code>roles</code>) or any claim. Failure here is <b>403</b>. Last, your own code checks the record itself: "is this order in the caller's store?"</p>
    <p><b>Secure by default:</b> set a <b>fallback policy</b> that requires a signed-in caller. Then an endpoint with no attribute is protected, and you must write <code>[AllowAnonymous]</code> on purpose to open one.</p>
    <p>.NET 10 is the current long-term support release (November 2025). Everything here works the same on .NET 8.</p>`,
  clues: ['"How do you ensure the API is only called with a valid token?"', '"What does UseAuthentication do? What does UseAuthorization do?"', '"Role-based vs policy-based authorization"', '"How do you stop user A reading user B\'s order?" (resource-based authorization)', '"How do you make sure nobody forgets [Authorize]?" (fallback policy)', '"How would you validate a token by hand?"', '"How do you authenticate Azure Functions?"', '"The API must call another API"'],
  code: [{ lang: 'csharp', check: false, title: 'Program.cs with Microsoft.Identity.Web', code: CS_PROGRAM }, { lang: 'csharp', check: false, title: 'The same with plain AddJwtBearer', code: CS_RAW }, { lang: 'csharp', check: false, title: 'Using the identity, and a resource-based rule', code: CS_CTRL }, { lang: 'csharp', check: false, title: 'Calling other services: on-behalf-of, managed identity, client credentials', code: CS_OBO }],
  codeTitle: ['Program.cs', 'AddJwtBearer by hand', 'Controller + handler', 'Downstream calls'],
  viz: flowViz('One request through the ASP.NET Core pipeline', 'GET /api/v1/orders/42 with a Bearer token', N5, E5, [
    { n: 'A request arrives. It will pass through middleware in the order you registered it in <code>Program.cs</code>.', hl: { REQ: 'cur' } },
    { n: '<b>CORS</b> runs first. A browser preflight (<code>OPTIONS</code>, no token) is answered here and never reaches authentication.', hl: { CORS: 'cur' }, ehl: { 'REQ-CORS': 'ok' } },
    { n: '<b>Authentication</b>: the JWT bearer handler reads the header and splits the token into header, payload, signature.', hl: { AUTHN: 'cur' }, ehl: { 'CORS-AUTHN': 'ok' }, extra: [{ type: 'vars', label: 'JWT header', vals: { alg: 'RS256', kid: 'key-2026-11' } }] },
    { n: 'It looks up <code>kid</code> in the <b>cached</b> key set. Only an unknown <code>kid</code> or an expired cache triggers a download.', hl: { AUTHN: 'cur', KEYS: 'ok' }, ehl: { 'AUTHN-KEYS': 'ok' } },
    { n: 'Signature verified. Then issuer, audience and lifetime. Any failure: no user is set.', hl: { AUTHN: 'ok' }, extra: [{ type: 'table', columns: ['Check', 'Result'], rows: [['signature', 'pass'], ['iss', 'pass'], ['aud', 'pass'], ['exp / nbf', 'pass']] }] },
    { n: 'The claims become <code>HttpContext.User</code>. This object lives for this request only.', hl: { AUTHN: 'done' }, extra: [{ type: 'vars', label: 'HttpContext.User', vals: { oid: 'Priya', scp: 'Orders.Read', roles: 'StoreManager', store: 'S-17' } }] },
    { n: '<b>Authorization</b>: the endpoint asks for policy <code>Orders.Read</code>. The <code>scp</code> claim contains it. No user at all would mean 401 here; a user without the scope would mean 403.', hl: { AUTHZ: 'ok' }, ehl: { 'AUTHN-AUTHZ': 'ok' } },
    { n: 'The <b>endpoint</b> runs. It loads order 42 and makes a resource-based check: the order belongs to store S-17, the caller is in S-17. Allowed.', hl: { EP: 'ok' }, ehl: { 'AUTHZ-EP': 'ok' } },
    { n: '<b>200 OK</b>. Nothing about Priya is kept. The next request starts from zero with its own token.', hl: { REQ: 'ok', EP: 'done' } }
  ], 52),
  examples: [
    { title: 'Role, claim and policy checks side by side', html: `${H.table(['Style', 'Looks like', 'Use when'], [['Simple', '<code>[Authorize]</code>', 'Any signed-in caller'], ['Role-based', '<code>[Authorize(Roles = "Admin")]</code>', 'A fixed job title is enough'], ['Policy-based', '<code>[Authorize(Policy = "Orders.Write")]</code>', 'Scopes, several claims, or reuse across endpoints'], ['Requirement + handler', '<code>IAuthorizationRequirement</code> and <code>AuthorizationHandler</code>', 'Custom logic such as minimum age or tenant allow-list'], ['Resource-based', '<code>IAuthorizationService.AuthorizeAsync(User, order, ...)</code>', 'The answer depends on the record itself']])}<p>Several <code>[Authorize]</code> attributes add up: all must pass. Roles listed in one attribute separated by commas mean "any of these".</p>` },
    { title: 'Azure Functions (isolated worker): three ways to check callers', html: `<p>An HTTP trigger with <code>AuthorizationLevel.Anonymous</code> checks nothing. Function keys are shared secrets, not user identity. Choose one:</p><ol><li><b>App Service Authentication</b> ("Easy Auth"): the platform validates the Entra ID token before your code runs and passes the caller in the <code>X-MS-CLIENT-PRINCIPAL</code> header.</li><li><b>API Management</b> in front with a <code>validate-jwt</code> (or <code>validate-azure-ad-token</code>) policy.</li><li><b>Worker middleware</b> that validates the token for every invocation and stops the call early with 401.</li></ol>`, code: { lang: 'csharp', check: false, code: `public class AuthMiddleware(ITokenValidator validator) : IFunctionsWorkerMiddleware
{
    public async Task Invoke(FunctionContext context, FunctionExecutionDelegate next)
    {
        HttpRequestData? req = await context.GetHttpRequestDataAsync();
        if (req is not null)
        {
            string? header = req.Headers.TryGetValues("Authorization", out var values) ? values.FirstOrDefault() : null;
            ClaimsPrincipal? user = null;
            if (header is not null && header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                user = await validator.ValidateAsync(header.Substring("Bearer ".Length));   // signature, iss, aud, exp

            if (user is null)
            {
                HttpResponseData res = req.CreateResponse(HttpStatusCode.Unauthorized);
                res.Headers.Add("WWW-Authenticate", "Bearer");
                context.GetInvocationResult().Value = res;     // short-circuit: the function never runs
                return;
            }
            context.Items["User"] = user;                      // trusted context for the function
        }
        await next(context);
    }
}
// Program.cs: builder.UseMiddleware<AuthMiddleware>();` } },
    { title: 'Validating a token string by hand', html: `<p>Useful in a Function, a WebSocket handshake or a message consumer, where the bearer middleware is not in the path. The configuration manager caches and refreshes the keys, so create it once and reuse it.</p>`, code: { lang: 'csharp', check: false, code: `static readonly ConfigurationManager<OpenIdConnectConfiguration> Metadata = new(
    "https://login.microsoftonline.com/00000000-0000-0000-0000-000000000000/v2.0/.well-known/openid-configuration",
    new OpenIdConnectConfigurationRetriever());

public static async Task<ClaimsIdentity?> ValidateAsync(string token, CancellationToken ct)
{
    OpenIdConnectConfiguration config = await Metadata.GetConfigurationAsync(ct);

    var handler = new JsonWebTokenHandler();        // the handler ASP.NET Core 8 and later use by default
    TokenValidationResult result = await handler.ValidateTokenAsync(token, new TokenValidationParameters
    {
        ValidIssuer = config.Issuer,
        IssuerSigningKeys = config.SigningKeys,
        ValidAudience = "22222222-2222-2222-2222-222222222222",
        ValidateLifetime = true
    });
    return result.IsValid ? result.ClaimsIdentity : null;   // result.Exception holds the reason
}` } }
  ],
  deepDive: `<p><b>Authentication does not reject; authorization does.</b> If the token is bad, the handler simply sets no user. The 401 is produced when the authorization step finds that an endpoint needs a user and there is none (a "challenge"). A known user who fails a policy gets 403 (a "forbid"). This is why an endpoint with no <code>[Authorize]</code> and no fallback policy happily serves a request with a garbage token.</p>
    <p><b>FallbackPolicy vs DefaultPolicy.</b> The default policy is what a bare <code>[Authorize]</code> means. The fallback policy applies to endpoints with <i>no</i> authorization data at all. It also covers static files and health checks served through endpoint routing, so mark those <code>AllowAnonymous</code> on purpose.</p>
    <p><b>Claim names.</b> Older handlers renamed short JWT claims to long XML-style names. ASP.NET Core 8 and later use <code>JsonWebTokenHandler</code>; set <code>MapInboundClaims = false</code> and set <code>RoleClaimType</code> so that <code>IsInRole</code> and <code>RequireRole</code> read <code>roles</code>. Microsoft.Identity.Web does this for you.</p>
    <p><b>Microsoft.Identity.Web extras:</b> it validates issuers for multi-tenant apps, and by default rejects a token that carries neither <code>scp</code> nor <code>roles</code>, which protects against app-only tokens from any app in the tenant.</p>
    <p><b>App-only callers.</b> A daemon's token has <code>roles</code> and no <code>scp</code>. A policy that should allow both a user and a daemon checks "scope X <b>or</b> app role Y". Never treat a missing <code>scp</code> as "full access".</p>
    <p><b>DefaultAzureCredential</b> tries several sources in order (environment variables, workload identity, managed identity, then developer tools such as Visual Studio and the Azure CLI), so the same code runs on a laptop and in Azure. In production, pin it to <code>ManagedIdentityCredential</code> so that a stray environment variable cannot change which identity is used.</p>
    <p><b>.NET 10 note.</b> For endpoints known to be APIs, cookie authentication now answers 401 and 403 instead of redirecting to a login page, which removes a common source of confusing 302 and 404 responses in mixed sites.</p>`,
  aiEra: `<p><b>What AI changes:</b> the dangerous pattern in generated back-end code is "make the error go away": <code>ValidateIssuer = false</code>, <code>ValidateAudience = false</code>, <code>RequireHttpsMetadata = false</code>, or a wide-open CORS policy. Each one removes a wall. Treat any <code>Validate... = false</code> in a pull request as needing a written reason.</p>
    <p><b>AI features need the same rules.</b> When your API calls a model with tools, the tool calls must run with the <b>caller's</b> identity and pass the same policy and resource checks. A prompt that says "only show the user's own orders" is not authorization; the query filter is.</p>
    <p><b>Use AI as a partner:</b> <code>Here is my Program.cs. List every endpoint that is reachable without a token and why.</code> Then confirm with an integration test that calls each route without a header and expects 401.</p>
    <p><b>What you must still own:</b> knowing which layer produced a 401 or 403, and the rule that tenant and user come from the validated token, never from the request body.</p>`,
  problems: [
    P({
      t: '"How do you ensure the API is only called with a valid token?"', l: 'Medium', tags: ['model-answer', 'end-to-end'],
      s: 'This is the single most common sign-in question in full-stack tech lead interviews. Give a 60-second answer that covers both the client half and the server half.',
      ex: `<p>Good shape: ${H.c('b', 'client attaches')} (sign-in, token for the API, interceptor) + ${H.c('g', 'server enforces')} (signature, iss, aud, exp, scope) + ${H.c('y', 'nothing left open')} (fallback policy) + ${H.c('p', 'stateless')}.</p>`,
      weak: 'I use the authentication middleware and put [Authorize] on the controllers.',
      why: 'It is true, but it names a component and explains nothing. It does not say what is validated, where the keys come from, how the client gets and renews the token, or what stops a forgotten attribute from leaving an endpoint open.',
      q: ['Which sentence shows you do not rely on the client?', ['"The React app hides the admin menu"', '"The API validates signature, issuer, audience and lifetime on every request, and a fallback policy protects every endpoint"', '"We use HTTPS"', '"The token is stored in session storage"'], 1, 'Enforcement lives on the server. Client-side measures are convenience.'],
      h: ['Split the answer in two halves: who attaches the token, and who enforces it.', 'For the server half, list the checks in order and say where the public keys come from.', 'Finish with the two things most candidates forget: the fallback policy, and the difference between 401 and 403.'],
      a: `<p><b>Model answer (about 60 seconds).</b> "There are two halves. <b>On the client</b>, the app signs in with OpenID Connect using the authorization code flow with PKCE. MSAL gets an access token issued for my API and caches it. Every call goes through one API client with an interceptor that asks MSAL for a token before each request, renewing it silently when it has expired, and adds the Bearer header, only for my own API's addresses. On a 401 it refreshes once and retries once. <b>On the API</b>, I do not rely on the client. The JWT bearer handler validates every request: the signature against Entra ID's public keys, which are cached from the metadata endpoint, then issuer, audience and lifetime. If that fails the answer is 401. Then authorization policies check the scope or role, and my code checks the record itself; failure there is 403. So that no endpoint is left open by accident, I set a fallback policy that requires a signed-in caller everywhere unless I mark an endpoint anonymous. The API is stateless: no session, the token is checked on every request."</p>`,
      cx: 'two halves, the checks in order, 401 vs 403, the fallback policy, and the word "stateless".',
      f: ['What if the token is stolen?', 'What if someone calls the API with curl?', 'Who refreshes the token, and where?']
    })
  ]
});

// ---------- TOPIC 6 ----------
topics.push({
  title: 'Troubleshooting 401 and 403, and Saying It Well in the Interview',
  analogy: `<p>A <b>doctor</b> does not guess. They ask "where does it hurt?", then run the cheapest test first. For sign-in problems the questions are: <b>which status code</b>, <b>which layer answered</b>, and <b>what does the token say</b>. The cheapest test is to decode the token and read four claims. Most cases end there.</p>`,
  explain: `<p><b>The plain idea:</b> <b>401</b> means "I cannot trust who you are". <b>403</b> means "I know who you are and the answer is no". They have different causes and different fixes, so say which one you see before anything else.</p>
    ${H.table(['', '401 Unauthorized', '403 Forbidden'], [
      ['Meaning', 'No token, or the token failed validation', 'Valid token, missing permission'],
      ['Comes from', 'The authentication challenge', 'A policy, a role check, or your own code'],
      ['Client should', 'Get a fresh token once and retry, or sign in again', 'Not retry. Show "not allowed"'],
      ['Look at', '<code>WWW-Authenticate</code> header, <code>aud</code>, <code>iss</code>, <code>exp</code>', '<code>scp</code>, <code>roles</code>, consent, policy name']
    ])}
    <p><b>A five-step routine:</b></p>
    <ol>
      <li><b>Reproduce</b> and note status code, user, time, environment.</li>
      <li><b>Read the response.</b> A 401 from ASP.NET Core carries <code>WWW-Authenticate: Bearer error="invalid_token", error_description="..."</code>.</li>
      <li><b>Decode the token</b> (jwt.ms, in a test tenant) and read <code>aud</code>, <code>iss</code>, <code>exp</code>, <code>scp</code>, <code>roles</code>, <code>ver</code>.</li>
      <li><b>Read the server log</b> for the error code (IDX... from the .NET token libraries, AADSTS... from Entra ID).</li>
      <li><b>Compare environments:</b> app settings, redirect addresses, which app registration each one points to.</li>
    </ol>
    <p><b>In the interview</b>, a good answer is structured: status code, layer, evidence, fix, prevention. And practise the whiteboard: three boxes (browser, Entra ID, API) and seven arrows.</p>`,
  clues: ['"The API returns 401 only in production. What do you check?"', '"It works in Postman but fails from the browser"', '"The token is valid but I get 403"', '"Users are logged out randomly after a few hours"', '"What does aud mismatch mean?"', '"Draw the sign-in flow on the whiteboard"', '"What is the difference between 401 and 403?"', '"How do you debug this without logging the token?"'],
  viz: rowViz('Symptom to cause to first check', 'Sign-in troubleshooting table',
    ['Symptom', 'Likely cause', 'First check'],
    [
      ['401, error mentions audience (IDX10214)', 'Token is for another API, or an ID token was sent', 'Decode: compare aud with the API setting'],
      ['401, issuer invalid (IDX10205)', 'v1.0 vs v2.0 token, or wrong tenant', 'ver and iss claims; token version in the API registration'],
      ['401, lifetime failed (IDX10223)', 'Expired token, or a server clock that is wrong', 'exp claim; server time; client refresh logic'],
      ['401, signature key not found (IDX10503)', 'Wrong authority, stale key cache, key rotation', 'Authority and metadata address; outbound network access'],
      ['401 from the browser only, Postman works', 'CORS preflight (OPTIONS, no token) rejected', 'Network tab: is the failing call OPTIONS? Middleware order'],
      ['403 with a valid token', 'Scope or role missing; consent not granted', 'scp and roles claims; admin consent; policy name spelling'],
      ['Works locally, fails after deploy', 'Redirect address, app setting or registration differs', 'App settings per environment; redirect addresses'],
      ['Random sign-outs after hours', 'Silent renewal failing (third-party cookies blocked)', 'MSAL logs; errors from acquireTokenSilent']
    ],
    ['We build the table an interviewer hopes you carry in your head. Start with the status code and the error text.',
      '<b>Audience.</b> The most common 401. The front end asked for the wrong scope or sent the ID token.',
      '<b>Issuer.</b> Usually a version mix-up: the API expects v2.0 issuers and receives a v1.0 token, or the reverse.',
      '<b>Lifetime.</b> Either the client did not renew, or a server clock has drifted more than the allowed 5 minutes.',
      '<b>Signing key.</b> The API cannot find the key named in the token header. Check where it downloads keys from.',
      '<b>Browser only.</b> Browsers send an OPTIONS request with no token first. If authentication answers it with 401, the real call never happens.',
      '<b>403.</b> The token is fine. Read scp and roles, then check whether an admin granted consent.',
      '<b>Deploy.</b> Sign-in settings are per environment. One wrong client id or redirect address breaks only that environment.',
      '<b>After hours.</b> The 24-hour refresh token ran out and the hidden renewal could not use the Entra ID cookie.'],
    'Status code, then error text, then four claims. That order solves most sign-in incidents in minutes.', [0, 4, 5]),
  examples: [
    { title: 'Tools, and what never to do', html: `${H.table(['Tool', 'Use it for'], [['jwt.ms', 'Decoding a token in the browser (test tenants; treat production tokens as passwords)'], ['Browser network tab', 'Is the header there? Is the failing call an OPTIONS preflight?'], ['MSAL logger', 'Why a silent renewal failed'], ['Entra ID sign-in logs', 'AADSTS error codes, conditional access results, which app and resource'], ['Application Insights', 'Tracing one request across services by correlation id'], ['<code>IdentityModelEventSource.ShowPII = true</code>', 'Full validation errors, in development only']])}<p><b>Never</b> log the token itself, and never "fix" a 401 by switching a validation flag off.</p>` },
    { title: 'Entra ID error codes worth recognising', html: `${H.table(['Code', 'Plain meaning'], [['AADSTS50011', 'The redirect address in the request is not registered for the app'], ['AADSTS65001', 'The user or an admin has not consented to the requested permission'], ['AADSTS700016', 'The client id was not found in this tenant'], ['AADSTS500011', 'The resource (the API in the scope) was not found in this tenant'], ['AADSTS7000215 / 7000222', 'Wrong client secret / expired client secret'], ['AADSTS9002326', 'The redirect address is not registered as a single-page application'], ['AADSTS50076', 'Multi-factor sign-in is required: interaction needed']])}` },
    { title: 'The whiteboard drill: three boxes, seven arrows', html: `<p>Draw <b>Browser (React + MSAL)</b>, <b>Entra ID</b>, <b>API (.NET)</b>. Then narrate:</p><ol><li>Browser to Entra ID: sign-in request with a PKCE challenge.</li><li>Entra ID to browser: a code; then tokens (ID, access, refresh) in exchange for the code and verifier.</li><li>Browser: cache the tokens; the interceptor adds the Bearer header.</li><li>Browser to API: the request with the access token.</li><li>API: verify the signature with cached keys; check issuer, audience, lifetime, scope; build the user; run the policy; run the endpoint.</li><li>API to browser: 200, 401 or 403.</li><li>On expiry: silent renewal with the refresh token; if that is impossible, sign in again.</li></ol><p>If you can draw and narrate this in two minutes, you are ready for this round.</p>` }
  ],
  deepDive: `<p><b>CORS is not security for the API.</b> CORS (cross-origin resource sharing) is a rule that browsers enforce to protect users. Tools like curl ignore it. It still breaks things: a preflight has no <code>Authorization</code> header by design, so <code>UseCors</code> must run before authentication, or the fallback policy turns every preflight into a 401.</p>
    <p><b>Token version mismatch in detail.</b> The API's app registration sets which token version it is issued (<code>requestedAccessTokenVersion</code> in the manifest; older manifests call it <code>accessTokenAcceptedVersion</code>). Value 2 gives v2.0 tokens; empty or 1 gives v1.0. The version is chosen by the <b>API's</b> registration, not by which endpoint the client called. An API configured for a v2.0 issuer that receives a v1.0 token fails on issuer and often on audience too.</p>
    <p><b>"Works for me, not for them".</b> Different users can differ in: tenant (guest accounts carry their home tenant in <code>idp</code> but your tenant in <code>tid</code>), role or group assignment, conditional access rules, and consent. Compare two decoded tokens side by side.</p>
    <p><b>Scale-out surprises.</b> One instance with a wrong setting or a blocked outbound connection to the metadata address gives failures on a fraction of requests. Look at failures grouped by instance.</p>
    <p><b>Deployment slots.</b> A staging slot has its own host name. If that address is not a registered redirect address, sign-in fails only there. Settings not marked "slot setting" travel with the swap.</p>
    <p><b>Observability without leaks.</b> Log <code>oid</code>, <code>tid</code>, <code>aud</code>, <code>azp</code>, the failure reason and a correlation id. That is enough to debug and contains no credential.</p>`,
  aiEra: `<p><b>What AI changes:</b> an assistant can read an IDX or AADSTS error and name the likely cause quickly, which is real help. The risk is in what you paste. Paste the error text and a decoded payload with ids replaced. Never paste a live token, a client secret or a connection string.</p>
    <p><b>Where AI goes wrong:</b> it suggests switching validation off, widening CORS to any origin with credentials, or adding the ID token as a fallback. Each "fix" makes the error disappear and the hole appear.</p>
    <p><b>Use AI for practice:</b> <code>Act as an interviewer. Give me a sign-in incident with a status code and one log line. Ask follow-ups until I name the claim that is wrong.</code> Answer out loud; the skill being tested is a calm, ordered diagnosis.</p>
    <p><b>What you must still own:</b> the order of investigation, and the judgment to say "this 401 is correct, the client is wrong".</p>`,
  problems: [
    P({
      t: 'The API returns 401 for some users after lunch', l: 'Medium', tags: ['troubleshooting', '401'],
      s: 'Support reports: "From about 13:00, some users get errors on every screen until they close the tab and sign in again. Others are fine." The API logs show 401s. Give five hypotheses and how you would test each.',
      ex: `<p>Clue: ${H.c('y', 'only some users')} + ${H.c('y', 'after a few hours of use')} + ${H.c('g', 'signing in again fixes it')} points at ${H.c('b', 'token renewal')}, not at the API.</p>`,
      weak: 'The tokens are expiring. I would increase the token lifetime to 8 hours.',
      why: 'It jumps to one cause with no evidence, and the fix makes stolen tokens useful for 8 hours instead of fixing renewal.',
      q: ['Which fact most strongly points at the client rather than the API?', ['The status code is 401', 'Signing in again fixes it and only long-open tabs are affected', 'It happens after lunch', 'Some users are fine'], 1, 'A fresh sign-in works, so the API and its settings are fine. The failing piece is renewal in long-lived tabs.'],
      h: ['Ask what the failing users have in common: browser, time since sign-in, tab left open, network.', 'Read the 401 reason on the server (expired? audience?) and the MSAL log on the client (why did silent renewal fail?).', 'List hypotheses from most to least likely, each with one test: lifetime error in logs, browser type, interceptor behaviour on 401, clock, conditional access.'],
      a: `<p><b>Model answer.</b> "First I would group the failures: which browser, how long since sign-in, which API instance. Then five hypotheses. <b>One:</b> silent renewal fails for people who signed in before 13:00 the previous day or whose refresh token ran out, because their browser blocks third-party cookies; test by checking the browser mix and the MSAL log for an interaction-required error. <b>Two:</b> the interceptor does not handle that error, so it keeps sending the expired token; test by reading the server log for lifetime failures (IDX10223) and the code path. <b>Three:</b> a conditional access rule, for example a sign-in frequency of 4 hours, forces re-authentication; test in the Entra ID sign-in logs. <b>Four:</b> one API instance has a wrong clock or cannot refresh signing keys; test by grouping 401s by instance. <b>Five:</b> a second tab or app signed the user out; test by checking sign-out events. The fix is most likely on the client: catch the interaction-required error and send the user through a redirect, with their place saved. I would not lengthen the token lifetime."</p>`,
      cx: 'groups the evidence first, gives ordered hypotheses each with a test, and refuses the unsafe quick fix.',
      f: ['How would you reproduce a 24-hour expiry without waiting 24 hours?', 'What would you add to monitoring so that you see this before support does?']
    })
  ]
});

// ---------- INTERVIEW: section 1, the mental model ----------
interview.push({
  q: 'What is the difference between authentication and authorization, and who plays which role in a React + .NET app?', level: 'B',
  a: `<p>Authentication proves who you are; authorization decides what you are allowed to do.</p>
    <ul><li><b>Authentication</b> ends with an identity: a user or an app.</li><li><b>Authorization</b> ends with yes or no for one action.</li></ul>
    <p>OAuth 2.0 names four parties:</p>
    <table><tr><th>Party</th><th>OAuth name</th><th>Example</th></tr>
    <tr><td>The person</td><td>Resource owner</td><td>An employee who signs in</td></tr>
    <tr><td>The front end</td><td>Client</td><td>React app using MSAL</td></tr>
    <tr><td>The identity provider</td><td>Authorization server</td><td>Microsoft Entra ID</td></tr>
    <tr><td>The API</td><td>Resource server</td><td>.NET Web API</td></tr></table>
    <p>Entra ID signs the user in and issues signed tokens. The React app keeps the access token and sends it with each call. The API keeps no memory of the user: it checks the token again on every request and reads identity and permissions from it.</p>
    <blockquote><b>Say it in the interview:</b> Authentication is who you are, authorization is what you may do. Entra ID authenticates and issues tokens, the client carries the token, and the API validates it on every request and then authorizes.</blockquote>`,
  followUps: ['Which HTTP status code belongs to each failure?', 'Can you have authorization without authentication?', 'Where does the API get the user name from?']
});
interview.push({
  q: 'OAuth 2.0 vs OpenID Connect vs SAML: what is each one for?', level: 'B',
  a: `<p>OAuth 2.0 is for giving an app access to an API; OpenID Connect adds sign-in on top of OAuth 2.0; SAML is an older XML way to do sign-in.</p>
    <table><tr><th></th><th>OAuth 2.0</th><th>OpenID Connect</th><th>SAML 2.0</th></tr>
    <tr><td>Job</td><td>Authorization (delegated API access)</td><td>Authentication layer on OAuth 2.0</td><td>Authentication and single sign-on</td></tr>
    <tr><td>Main output</td><td>Access token</td><td>ID token + access token</td><td>XML assertion</td></tr>
    <tr><td>Typical use</td><td>Call an API for a user</td><td>"Sign in with Microsoft"</td><td>Older enterprise web apps</td></tr>
    <tr><td>Format</td><td>Opaque or JWT</td><td>JWT</td><td>XML</td></tr></table>
    <p>OAuth 2.0 alone never tells the client who the user is. OpenID Connect adds the <b>ID token</b>, the <code>openid</code> scope, a discovery document and a <code>/userinfo</code> endpoint for that. For new work with a single-page app and an API, you use OpenID Connect to sign in and OAuth 2.0 to call the API, usually in the same request.</p>
    <blockquote><b>Say it in the interview:</b> OAuth 2.0 is about access to an API, OpenID Connect adds identity on top of it with the ID token, and SAML is the XML-based predecessor still common for enterprise single sign-on.</blockquote>`,
  followUps: ['Why is "log in with OAuth" technically the wrong phrase?', 'When would you still choose SAML?']
});
interview.push({
  q: 'What are the three tokens (ID token, access token, refresh token), and which one goes to the API?', level: 'B',
  a: `<p>Only the access token goes to the API; the ID token is for the client app and the refresh token is only for the identity provider.</p>
    <table><tr><th>Token</th><th>Meant for</th><th>Job</th><th>Lifetime in Entra ID</th></tr>
    <tr><td>ID token</td><td>The client app</td><td>Tells the app who signed in</td><td>About 1 hour</td></tr>
    <tr><td>Access token</td><td>The API in <code>aud</code></td><td>Proves the client may call the API with these scopes</td><td>60 to 90 minutes by default, configurable</td></tr>
    <tr><td>Refresh token</td><td>The token endpoint</td><td>Gets new access tokens with no new sign-in</td><td>24 hours for single-page apps; up to 90 days otherwise</td></tr></table>
    <p><b>The trap:</b> sending the ID token to your API. It is addressed to the client (its <code>aud</code> is the client's id), so a correct API rejects it. An API that accepts it has audience checks switched off.</p>
    <blockquote><b>Say it in the interview:</b> The ID token tells the client who signed in, the access token is what the API accepts, and the refresh token goes only to the token endpoint to get new access tokens.</blockquote>`,
  followUps: ['Why is the refresh token lifetime shorter for single-page apps?', 'What does the SPA do with the ID token?', 'What scope asks for a refresh token?']
});
interview.push({
  q: 'What is inside a JWT?', level: 'B',
  a: `<p>A JWT (JSON Web Token) is three Base64URL text parts joined by dots: a header, a payload of claims, and a signature.</p>
    <pre><code>// header
{ "typ": "JWT", "alg": "RS256", "kid": "key-2026-11" }
// payload of an Entra ID v2.0 access token
{ "iss": "https://login.microsoftonline.com/00000000-0000-0000-0000-000000000000/v2.0",
  "aud": "22222222-2222-2222-2222-222222222222",
  "oid": "aaaaaaaa-0000-0000-0000-000000000001",
  "tid": "00000000-0000-0000-0000-000000000000",
  "scp": "Orders.Read Orders.Write", "roles": ["Admin"],
  "azp": "11111111-1111-1111-1111-111111111111",
  "iat": 1794300000, "nbf": 1794300000, "exp": 1794303600, "ver": "2.0" }</code></pre>
    <ul><li><code>iss</code> who issued it, <code>aud</code> who it is for, <code>exp</code>/<code>nbf</code>/<code>iat</code> the time window.</li>
    <li><code>oid</code> + <code>tid</code> the user and tenant; <code>sub</code> is unique per user per app.</li>
    <li><code>scp</code> delegated scopes, <code>roles</code> app roles, <code>azp</code> the client app.</li></ul>
    <p>A JWT is <b>signed, not encrypted</b>. Anyone can read it, so never put secrets in it.</p>
    <blockquote><b>Say it in the interview:</b> Header, payload, signature. The payload carries claims like issuer, audience, expiry, user id, scopes and roles. It is readable by anyone; the signature only proves it was not changed.</blockquote>`,
  followUps: ['Which claim would you use as the stable key for a user?', 'What is the difference between decoding and validating?', 'What is kid for?']
});
interview.push({
  q: 'How does the API validate the signature without calling Entra ID on every request?', level: 'I',
  a: `<p>The API downloads Entra ID's public keys once, caches them, and then checking a signature is only local CPU work.</p>
    <ol><li>Entra ID signs each token with a <b>private</b> key.</li>
    <li>The matching <b>public</b> keys are published at a JWKS address (JSON Web Key Set). The API finds that address in the discovery document: <code>https://login.microsoftonline.com/{tenant}/v2.0/.well-known/openid-configuration</code>, field <code>jwks_uri</code>.</li>
    <li>The token header's <code>kid</code> says which key was used.</li>
    <li>The ASP.NET Core JWT bearer handler caches the document and keys, refreshes them on a timer, and refreshes early when it meets an unknown <code>kid</code>. That is how key rotation works with no restart.</li></ol>
    <p>A valid signature proves two things: Entra ID issued the token, and nobody changed it. The claims then prove it is for this API (<code>aud</code>), from the trusted issuer (<code>iss</code>), still in date (<code>exp</code>), and carries the needed scope or role.</p>
    <blockquote><b>Say it in the interview:</b> The token is signed with the issuer's private key. My API caches the public keys from the JWKS endpoint, picks the one named by kid, and verifies locally, so there is no network call per request.</blockquote>`,
  followUps: ['What happens when Entra ID rotates its keys?', 'Why must you never hard-code the signing key?', 'What would an API do if alg were "none"?']
});
interview.push({
  q: 'Scopes vs roles, and delegated vs application permissions: what is the difference?', level: 'I',
  a: `<p>A scope says what the client app may do on behalf of a signed-in user; a role says what the caller (a user or an app) is.</p>
    <table><tr><th></th><th>Delegated (scopes, <code>scp</code>)</th><th>Application (app roles, <code>roles</code>)</th></tr>
    <tr><td>Who acts</td><td>A signed-in user through the client</td><td>The app itself, no user</td></tr>
    <tr><td>Flow</td><td>Authorization code</td><td>Client credentials</td></tr>
    <tr><td>Real access</td><td>The overlap of what the app was granted and what the user may do</td><td>Whatever an admin granted the app</td></tr>
    <tr><td>Example</td><td>The shop SPA reads orders as Priya</td><td>A nightly job exports all orders</td></tr></table>
    <p>App roles can also be assigned to <b>users</b> or groups (for example <code>Admin</code>, <code>Manager</code>); they then appear in the <code>roles</code> claim of that user's token. A common API design checks both: the scope proves the app is allowed to ask, the role proves the user is allowed to do it.</p>
    <blockquote><b>Say it in the interview:</b> Scopes are delegated permissions in the scp claim: what the app may do for the user. Roles are in the roles claim: what the user or the app is. Delegated access can never exceed what the user could do themselves.</blockquote>`,
  followUps: ['How does your API tell a user token from an app-only token?', 'Why prefer app roles over group ids in the token?', 'What does the .default scope mean?']
});
interview.push({
  q: 'In Entra ID, what is an app registration, and how is it different from a service principal (enterprise application)?', level: 'I',
  a: `<p>The app registration is the definition of your app; the service principal is the copy of that app inside one tenant, where permissions and assignments live.</p>
    <table><tr><th></th><th>App registration (application object)</th><th>Service principal (enterprise application)</th></tr>
    <tr><td>How many</td><td>One, in the home tenant</td><td>One per tenant that uses the app</td></tr>
    <tr><td>Holds</td><td>Client id, redirect addresses, exposed scopes, app roles, credentials</td><td>Consent granted, user and group assignments, sign-in policies</td></tr>
    <tr><td>Analogy</td><td>A class</td><td>An instance of the class</td></tr></table>
    <p>For our example you create two registrations. The <b>API</b> registration sets an Application ID URI (<code>api://22222222-...</code>), exposes scopes (<code>Orders.Read</code>) and defines app roles. The <b>SPA</b> registration has a single-page application redirect address and is granted the API's scopes. Keeping them separate means the SPA can never be confused with the API as an audience.</p>
    <blockquote><b>Say it in the interview:</b> The app registration is the global definition: ids, redirect addresses, scopes and roles. The service principal is its local identity in a tenant, where consent and role assignments are stored. I register the SPA and the API separately.</blockquote>`,
  followUps: ['Why register the SPA and the API as two apps?', 'What is a managed identity in these terms?', 'Where do you assign a user to an app role?']
});
interview.push({
  q: 'What is consent in Entra ID, and what is the difference between user consent and admin consent?', level: 'I',
  a: `<p>Consent is the recorded "yes" that lets a client app use a permission; a user can say yes for themselves, and an admin can say yes for the whole organisation.</p>
    <ul><li><b>User consent:</b> the first time, the user sees "This app wants to read your orders" and accepts. It covers only that user and only low-risk delegated scopes the tenant allows.</li>
    <li><b>Admin consent:</b> an administrator grants the permission for everyone, so users see no prompt. It is <b>required</b> for application permissions (app roles used with client credentials) and for delegated scopes marked "admin only".</li></ul>
    <p>Typical symptoms when consent is missing: error <b>AADSTS65001</b> at sign-in or during an on-behalf-of exchange, or a token that arrives without the expected <code>scp</code> or <code>roles</code>, which the API answers with 403.</p>
    <p>For a company's own apps, the normal practice is to grant admin consent once per environment as part of deployment, and to list a pre-authorized client on the API so that its own SPA never prompts.</p>
    <blockquote><b>Say it in the interview:</b> Consent records that an app may use a permission. Users can consent to simple delegated scopes for themselves; an admin must consent for application permissions and can consent for the whole tenant, which removes the prompt.</blockquote>`,
  followUps: ['The token has no roles claim after you added an app permission. Why?', 'What is incremental consent?', 'What is a pre-authorized client application?']
});
interview.push({
  q: 'Single-tenant vs multi-tenant apps: what changes in token validation?', level: 'A',
  a: `<p>A single-tenant API trusts one issuer; a multi-tenant API accepts tokens from many tenants, so it must check the issuer per tenant and decide itself which tenants are allowed.</p>
    <table><tr><th></th><th>Single-tenant</th><th>Multi-tenant</th></tr>
    <tr><td>Authority</td><td><code>/{tenant-id}</code></td><td><code>/organizations</code> or <code>/common</code></td></tr>
    <tr><td>Issuer check</td><td>One fixed <code>iss</code></td><td><code>iss</code> must match the token's own <code>tid</code> pattern</td></tr>
    <tr><td>Who may sign in</td><td>Your directory only</td><td>Any tenant that has consented, unless you restrict it</td></tr></table>
    <p>Rules for the multi-tenant case:</p>
    <ul><li>Never set <code>ValidateIssuer = false</code>. Microsoft.Identity.Web validates the issuer against the <code>tid</code> for you.</li>
    <li>Keep an <b>allow-list of tenant ids</b> (your customers) and reject the rest in <code>OnTokenValidated</code> or a policy.</li>
    <li>Take the tenant for every data query from the validated <code>tid</code> claim, never from a header or body the client controls.</li>
    <li>Key users by <code>tid</code> + <code>oid</code>; guest users have a different <code>oid</code> in each tenant.</li></ul>
    <blockquote><b>Say it in the interview:</b> In a multi-tenant app the issuer differs per customer, so I validate it against the tid in the token, keep an allow-list of onboarded tenants, and scope every query by the tenant id from the validated token.</blockquote>`,
  followUps: ['What is the risk of ValidateIssuer = false?', 'How do guest (B2B) users appear in the token?', 'How would you test that tenant A cannot read tenant B data?']
});

// ---------- INTERVIEW: section 2, the flows ----------
interview.push({
  q: 'Which OAuth 2.0 flow do you use for which scenario?', level: 'I',
  a: `<p>Pick the flow by asking two things: is there a user, and can the app keep a secret?</p>
    <table><tr><th>Scenario</th><th>Flow</th><th>Note</th></tr>
    <tr><td>Single-page app calls an API</td><td>Authorization code + PKCE</td><td>No secret in the browser</td></tr>
    <tr><td>Server-rendered web app</td><td>Authorization code as a confidential client</td><td>Secret or certificate; tokens stay on the server</td></tr>
    <tr><td>Service or job, no user</td><td>Client credentials</td><td>App identity: certificate, secret or managed identity</td></tr>
    <tr><td>API calls another API as the user</td><td>On-behalf-of</td><td>Swap the incoming token for a downstream one</td></tr>
    <tr><td>TV or command line tool</td><td>Device code</td><td>User signs in on another device</td></tr>
    <tr><td>Azure resource to Azure resource</td><td>Managed identity</td><td>No stored credential at all</td></tr>
    <tr><td>Implicit grant</td><td>Do not use</td><td>Tokens in the URL; replaced by code + PKCE</td></tr>
    <tr><td>Password grant (ROPC)</td><td>Do not use</td><td>App handles the password; breaks MFA</td></tr></table>
    <blockquote><b>Say it in the interview:</b> For a SPA I use authorization code with PKCE, for a daemon client credentials, for API-to-API as the user on-behalf-of, and inside Azure managed identity. I do not use implicit or the password grant.</blockquote>`,
  followUps: ['What is a public client vs a confidential client?', 'Why is a mobile app also a public client?', 'When is device code a security risk?']
});
interview.push({
  q: 'Explain the authorization code flow with PKCE step by step.', level: 'I',
  a: `<p>The app gets a one-time code through the browser, then swaps it for tokens in a background call, and PKCE proves that the app doing the swap is the one that started.</p>
    <ol><li><b>PKCE setup:</b> MSAL makes a random <code>code_verifier</code> and sends only its hash, the <code>code_challenge</code>.</li>
    <li><b>Redirect</b> to <code>/authorize</code> with <code>client_id</code>, <code>redirect_uri</code>, scopes (for example <code>openid profile api://.../Orders.Read</code>), <code>state</code>, <code>nonce</code> and the challenge.</li>
    <li><b>Sign-in</b> at Entra ID: password, multi-factor, company policies. The app never sees the password.</li>
    <li><b>Code:</b> Entra ID redirects back to the registered address with a short-lived, single-use code.</li>
    <li><b>Exchange:</b> MSAL posts the code and the verifier to <code>/token</code>. Entra ID hashes the verifier and compares.</li>
    <li><b>Tokens:</b> ID token, access token, and a refresh token (scope <code>offline_access</code>).</li>
    <li>MSAL caches them; the app calls the API with a Bearer header; the API validates and answers.</li></ol>
    <blockquote><b>Say it in the interview:</b> The browser fetches a one-time code, MSAL redeems it with the PKCE verifier at the token endpoint, and gets an ID token, an access token and a refresh token. A stolen code is useless without the verifier.</blockquote>`,
  followUps: ['Why PKCE when the traffic is already HTTPS?', 'Why is the code sent through the browser but the tokens are not?', 'Do confidential clients need PKCE too?']
});
interview.push({
  q: 'Why was the implicit flow deprecated, and why should you avoid the resource owner password (ROPC) grant?', level: 'I',
  a: `<p>Implicit puts tokens in the browser address bar where they leak, and ROPC makes your app handle the user's password; both have safer replacements.</p>
    <p><b>Implicit grant</b></p>
    <ul><li>The access token came back in the URL fragment, so it could land in browser history, logs and referrer data.</li>
    <li>There was no proof that the receiver was the app that asked, and no refresh token; renewal used hidden iframes and third-party cookies, which browsers now block.</li>
    <li>It existed because browsers once could not call the token endpoint across origins. CORS removed that reason. Replacement: authorization code + PKCE.</li></ul>
    <p><b>Password grant (ROPC)</b></p>
    <ul><li>The app collects the user name and password, which trains users to type passwords into apps and makes your app a target.</li>
    <li>It cannot do multi-factor sign-in, passkeys, conditional access or federated sign-in.</li></ul>
    <p>RFC 9700 (the 2025 OAuth security best practice) says not to use either, and the OAuth 2.1 draft removes them.</p>
    <blockquote><b>Say it in the interview:</b> Implicit leaks tokens through the URL and has no sender proof, so it was replaced by code with PKCE. The password grant exposes credentials to the app and breaks MFA, so I never use it for user sign-in.</blockquote>`,
  followUps: ['You find response_type=token in a legacy app. What is your migration plan?', 'Is there any acceptable use of ROPC?']
});
interview.push({
  q: 'What are the state and nonce parameters for, and how do they differ from PKCE?', level: 'A',
  a: `<p>They are three separate guards: <code>state</code> protects the redirect, <code>nonce</code> protects the ID token, and PKCE protects the authorization code.</p>
    <table><tr><th>Value</th><th>How it travels</th><th>Attack it stops</th></tr>
    <tr><td><code>state</code></td><td>Sent on the authorize request; must come back unchanged on the redirect</td><td>Cross-site request forgery: an attacker feeding their own sign-in response into the victim's browser</td></tr>
    <tr><td><code>nonce</code></td><td>Sent on the authorize request; returned <b>inside</b> the signed ID token</td><td>Replay of an old or stolen ID token</td></tr>
    <tr><td><code>code_verifier</code> / <code>code_challenge</code></td><td>Challenge to /authorize, verifier to /token</td><td>Use of an intercepted authorization code</td></tr></table>
    <p><code>state</code> can also carry harmless context, such as the page to return to. It must be unguessable and tied to the browser session. MSAL generates and checks all three. If you write an OpenID Connect client by hand and skip one, you have a real hole, which is a good reason not to write one by hand.</p>
    <blockquote><b>Say it in the interview:</b> State ties the response to the request and stops CSRF on the redirect, nonce ties the ID token to this sign-in and stops replay, and PKCE ties the code to the client that started the flow.</blockquote>`,
  followUps: ['What is a login CSRF attack?', 'Where does MSAL keep these values during a redirect?']
});

// ---------- INTERVIEW: section 3, end to end ----------
interview.push({
  q: 'What does the .NET API validate on every request?', level: 'I',
  a: `<p>On every request the API checks the token's signature and claims from scratch, then checks permissions; nothing is remembered from the previous call.</p>
    <ol><li>Read the token from <code>Authorization: Bearer ...</code>. Missing: 401.</li>
    <li>Read <code>kid</code>, take the matching public key from the cached key set, verify the signature. Tampered or wrong key: 401.</li>
    <li>Validate claims: <code>iss</code> is the expected issuer; <code>aud</code> is this API (an ID token or a token for another API fails here); <code>exp</code> and <code>nbf</code> include now, with a small clock allowance (5 minutes by default); the algorithm is an expected one, never <code>none</code>.</li>
    <li>Build a <code>ClaimsPrincipal</code> and set <code>HttpContext.User</code> for this request only.</li>
    <li>Authorization: policies check scope, role or claim; then your own code checks the record itself.</li>
    <li>The endpoint runs. 200, or 401 (identity not trusted), or 403 (identity known, not allowed).</li></ol>
    <blockquote><b>Say it in the interview:</b> I do not create a server session. Each request is authenticated from the bearer token: signature with cached keys, then issuer, audience, lifetime. Authorization is a separate step with scopes, roles and resource-level rules.</blockquote>`,
  followUps: ['Which of these checks needs a network call?', 'What is the default clock skew and why does it exist?', 'Give an example of a resource-level rule.']
});
interview.push({
  q: 'Where is the token stored, and who stores what?', level: 'I',
  a: `<p>The browser holds the tokens, Entra ID holds the sign-in session, and the API stores nothing about the user.</p>
    <table><tr><th>Place</th><th>Stores</th></tr>
    <tr><td>Entra ID</td><td>The sign-in session (cookies on the Microsoft sign-in site), consent, refresh token state. This enables single sign-on.</td></tr>
    <tr><td>Browser (MSAL cache)</td><td>ID, access and refresh tokens, in <code>sessionStorage</code> by default; <code>localStorage</code> or memory are options.</td></tr>
    <tr><td>API server</td><td>Nothing per user. Only signing keys and metadata.</td></tr></table>
    <p>Browser storage trade-offs:</p>
    <table><tr><th>Location</th><th>Readable by injected script (XSS)</th><th>Auto-sent (CSRF)</th><th>Survives reload</th></tr>
    <tr><td><code>localStorage</code></td><td>Yes</td><td>No</td><td>Yes, all tabs</td></tr>
    <tr><td><code>sessionStorage</code></td><td>Yes</td><td>No</td><td>Yes, this tab</td></tr>
    <tr><td>Memory</td><td>Harder</td><td>No</td><td>No</td></tr>
    <tr><td>HttpOnly cookie</td><td>No</td><td>Yes: needs CSRF defence</td><td>Yes</td></tr></table>
    <blockquote><b>Say it in the interview:</b> MSAL keeps the tokens in the browser, session storage by default. The API is stateless and stores only signing keys. For the highest security I move tokens to the server behind a BFF with an HttpOnly cookie.</blockquote>`,
  followUps: ['Which storage would you choose for a banking app, and why?', 'Does encrypting localStorage stop XSS token theft?', 'What does the Entra ID session cookie give you?']
});
interview.push({
  q: 'Session id vs JWT bearer token: what is the difference and when do you use each?', level: 'I',
  a: `<p>A session id is a key to data kept on the server; a JWT carries the data itself, signed, so the server needs no store.</p>
    <table><tr><th></th><th>Server session (cookie)</th><th>JWT bearer</th></tr>
    <tr><td>Client holds</td><td>Random id in an HttpOnly cookie</td><td>The token</td></tr>
    <tr><td>Per request</td><td>Look up the session in a store</td><td>Verify signature and claims locally</td></tr>
    <tr><td>Revocation</td><td>Instant: delete the session</td><td>Hard: valid until expiry</td></tr>
    <tr><td>Scaling</td><td>Needs a shared store</td><td>No shared state</td></tr>
    <tr><td>Mobile and API clients</td><td>Awkward</td><td>Natural</td></tr>
    <tr><td>CSRF</td><td>Must defend</td><td>Not an issue with header tokens</td></tr></table>
    <p><b>Use sessions</b> for server-rendered sites and when you need an instant off switch. <b>Use JWT bearer</b> for APIs called by SPAs, mobile apps and other services. The <b>BFF pattern</b> combines them: a small server does the sign-in, keeps tokens server-side, gives the browser only a session cookie, and attaches the token when it forwards calls to the API.</p>
    <blockquote><b>Say it in the interview:</b> Sessions are stateful and easy to revoke; JWTs are stateless and scale without a shared store but live until they expire. For a high-security SPA I put a BFF in front so the browser only ever holds a cookie.</blockquote>`,
  followUps: ['What does the BFF cost you?', 'How do you scale sessions across 10 servers?', 'Why is CSRF not a concern for bearer headers?']
});
interview.push({
  q: 'How are token expiry and renewal handled?', level: 'I',
  a: `<p>The client renews tokens quietly in the background with the refresh token; the API never renews anything, it only rejects expired tokens.</p>
    <ol><li>The access token expires, for example after 60 minutes.</li>
    <li>Before each API call the app calls <code>acquireTokenSilent</code>. MSAL returns the cached token if it is still good. Otherwise it sends the refresh token to the token endpoint and gets a new access token, with no user action.</li>
    <li>If silent renewal is impossible (refresh token expired or revoked, a new multi-factor or consent requirement), MSAL throws <code>InteractionRequiredAuthError</code>. The app then calls <code>acquireTokenRedirect</code> or <code>acquireTokenPopup</code>.</li>
    <li>If an expired token still reaches the API, the API answers 401 with <code>WWW-Authenticate: Bearer error="invalid_token"</code>. The client interceptor forces one refresh and retries once.</li></ol>
    <p>Save the user's place (route, form draft) before a redirect so they return to where they were.</p>
    <blockquote><b>Say it in the interview:</b> Before every call I ask MSAL for a token. It serves from cache or uses the refresh token silently. Only when that fails do I send the user through an interactive sign-in. The API just returns 401 for an expired token.</blockquote>`,
  followUps: ['What happens after 24 hours in a single-page app?', 'Why retry only once on 401?', 'How do third-party cookie rules affect silent renewal?']
});
interview.push({
  q: 'What are opaque tokens and token introspection, and how does a session-header style platform validate callers?', level: 'A',
  a: `<p>An opaque token is a random string with no readable content, so the API must ask the issuer who it belongs to on each request; that question is called introspection.</p>
    <pre><code>Client --(session id or opaque token)--&gt; API --(who is this?)--&gt; Identity service
                                          API &lt;--(user, tenant, active)--</code></pre>
    <p>Example: a booking platform issues a session id at sign-in. Each service reads it from a header, calls the platform's session endpoint, receives the user and tenant, builds a request context, and passes that context to its inner layers. A missing or unknown session is answered with 401 before any business code runs. The service stores no session itself.</p>
    <table><tr><th></th><th>Introspection (RFC 7662)</th><th>Local JWT validation</th></tr>
    <tr><td>Revocation</td><td>Instant</td><td>Only at expiry</td></tr>
    <tr><td>Cost per request</td><td>A network call (often cached for seconds)</td><td>CPU only</td></tr>
    <tr><td>Dependency</td><td>Issuer must be up</td><td>Issuer needed only for keys</td></tr>
    <tr><td>Token content</td><td>Hidden from the client</td><td>Readable by anyone</td></tr></table>
    <blockquote><b>Say it in the interview:</b> With opaque tokens the API validates by asking the issuer on each call, which gives instant revocation at the price of latency and a dependency. With JWTs the API validates locally, which is fast but the token lives until it expires.</blockquote>`,
  followUps: ['How would you cache introspection results safely?', 'What is the "authenticate once at the edge, pass a trusted context inward" principle?', 'Can you combine both models?']
});
interview.push({
  q: 'How do logout and revocation work with JWTs?', level: 'A',
  a: `<p>You can end the session and stop new tokens at once, but an access token already issued keeps working until it expires.</p>
    <ul><li><b>Client logout:</b> <code>logoutRedirect</code> clears the MSAL cache and ends the Entra ID session. Front-channel logout can tell other apps to sign out too.</li>
    <li><b>A JWT cannot be un-issued.</b> It is valid until <code>exp</code>.</li>
    <li><b>Password change or account disabled:</b> refresh tokens stop working, but access tokens already in hand still pass validation. This is the reason lifetimes are short.</li></ul>
    <p>Ways to shrink the gap:</p>
    <ol><li>Short access token lifetime.</li>
    <li>Refresh token revocation and rotation.</li>
    <li>Continuous Access Evaluation, where the resource supports it.</li>
    <li>A small deny-list of user ids or token ids for emergencies.</li>
    <li>Opaque tokens or server sessions when instant revocation is a hard requirement.</li></ol>
    <blockquote><b>Say it in the interview:</b> Logout clears the client cache and the identity provider session. An issued JWT stays valid until expiry, so I keep access tokens short, revoke refresh tokens, and add a deny-list or introspection where instant cut-off is required.</blockquote>`,
  followUps: ['A laptop is stolen at 10:00. Walk me through what you revoke.', 'Why not just delete the token from the browser?', 'What does a deny-list cost?']
});
interview.push({
  q: 'How do you secure service-to-service calls and access to Azure resources?', level: 'A',
  a: `<p>Give every service its own identity and let it get short-lived tokens, so that no password is shared or stored in code.</p>
    <ul><li><b>Client credentials:</b> the calling app authenticates with a certificate (preferred) or a secret and gets an app-only token with a <code>roles</code> claim. The target API checks the app role.</li>
    <li><b>Managed identity</b> (system-assigned or user-assigned): Azure issues tokens for the resource's own identity. You store nothing. Example: a Function reading a secret from Key Vault.</li>
    <li><b>On-behalf-of:</b> API A receives the user's token and swaps it for a token to call API B, keeping the user's identity, so B can apply per-user rules.</li>
    <li><b>Defence in depth:</b> private networking or mutual TLS, least-privilege role assignments, automatic rotation for any secret that must exist (Key Vault), and nothing in source control.</li></ul>
    <p>Choose on-behalf-of when the downstream service must know the user; choose client credentials or managed identity when the service acts for itself.</p>
    <blockquote><b>Say it in the interview:</b> Services authenticate with their own identity: managed identity inside Azure, client credentials with a certificate otherwise, and on-behalf-of when the user's identity must flow to the next API. No stored secrets where a managed identity will do.</blockquote>`,
  followUps: ['System-assigned vs user-assigned managed identity?', 'Why is a certificate better than a client secret?', 'What breaks if you forward the user token instead of using on-behalf-of?']
});
interview.push({
  q: 'What is Continuous Access Evaluation (CAE), and what does a claims challenge look like?', level: 'E',
  a: `<p>CAE lets a service reject a still-valid token within minutes of a critical event, instead of waiting for the token to expire.</p>
    <ul><li><b>Events:</b> account disabled or deleted, password changed or reset, multi-factor enabled, an admin revoking sessions, high user risk, and a change of network location for policies that depend on it.</li>
    <li><b>How:</b> Entra ID notifies CAE-aware services (Microsoft Graph, Exchange, SharePoint, Teams). The service then answers <b>401</b> with a <code>WWW-Authenticate</code> header containing <code>error="insufficient_claims"</code> and a <code>claims</code> value.</li>
    <li><b>Client duty:</b> a client that declared the capability <code>cp1</code> passes that <code>claims</code> value back into MSAL's token request, which bypasses the cache and gets a fresh decision from Entra ID.</li>
    <li><b>Trade:</b> because revocation is near real time, CAE tokens can live up to 28 hours, which improves resilience during sign-in outages.</li></ul>
    <p>Your own API can use the same claims-challenge mechanism to demand a stronger sign-in for one sensitive action (for example an authentication context that requires multi-factor), often called step-up authentication.</p>
    <blockquote><b>Say it in the interview:</b> CAE closes the gap between revocation and token expiry for supported services. The API returns a 401 with a claims challenge, and a capable client sends those claims back to Entra ID to get a fresh token or a sign-in prompt.</blockquote>`,
  followUps: ['How should your interceptor treat a 401 that carries a claims challenge?', 'How would you require MFA only for the "refund" endpoint?']
});

// ---------- INTERVIEW: section 4, the front end ----------
interview.push({
  q: 'Is a route guard or a hidden menu item enough to protect a page?', level: 'B',
  a: `<p>No. A route guard only improves the experience; real protection is always on the API.</p>
    <pre><code>function RequireAuth({ children }: { children: ReactNode }) {
  const isAuthenticated = useIsAuthenticated();
  return isAuthenticated ? &lt;&gt;{children}&lt;/&gt; : &lt;Navigate to="/login" replace /&gt;;
}</code></pre>
    <ul><li>All front-end code runs on the user's machine. They can change it, skip it, or ignore the app and call the API with curl or Postman.</li>
    <li>So the guard is there to avoid showing a broken page and to send people to sign in.</li>
    <li>The API must check the token and the permission for every request, as if the front end did not exist.</li>
    <li>Do hide what a user cannot use: it is good design. Just never count it as a control.</li></ul>
    <blockquote><b>Say it in the interview:</b> Hiding a menu item or guarding a route is user experience. Anyone can call the API directly, so enforcement is always on the server; the client only needs to obtain and send the token.</blockquote>`,
  followUps: ['How would you prove to a tester that the admin API is protected?', 'Should the SPA read roles from the ID token to hide buttons?']
});
interview.push({
  q: 'How do you set up MSAL in a React app and sign the user in?', level: 'I',
  a: `<p>You create one MSAL instance from a small configuration, initialise it, wrap the app in a provider, and call a login method.</p>
    <pre><code>export const msalConfig: Configuration = {
  auth: {
    clientId: "11111111-1111-1111-1111-111111111111",
    authority: "https://login.microsoftonline.com/00000000-0000-0000-0000-000000000000",
    redirectUri: window.location.origin,
  },
  cache: { cacheLocation: "sessionStorage" },
};
export const apiRequest = { scopes: ["api://22222222-2222-2222-2222-222222222222/Orders.Read"] };
export const msalInstance = new PublicClientApplication(msalConfig);

await msalInstance.initialize();          // required since msal-browser v3
// &lt;MsalProvider instance={msalInstance}&gt;&lt;App /&gt;&lt;/MsalProvider&gt;
// button: instance.loginRedirect(apiRequest)</code></pre>
    <ul><li>The scope is the API's Application ID URI plus the scope name from the API's app registration.</li>
    <li><code>AuthenticatedTemplate</code> and <code>UnauthenticatedTemplate</code> choose what to render.</li>
    <li>Set the active account after start-up so silent calls know which user to use.</li>
    <li>Client id and tenant id are not secrets; they can come from build-time settings.</li></ul>
    <blockquote><b>Say it in the interview:</b> I configure a PublicClientApplication with the SPA client id and tenant authority, initialise it, wrap the app in MsalProvider, and sign in with loginRedirect asking for my API's scope.</blockquote>`,
  followUps: ['Why is it a "public" client application?', 'What must be registered in Entra ID for the redirect to work?', 'What does handleRedirectPromise do?']
});
interview.push({
  q: 'How do you attach the token to every API request from the front end?', level: 'I',
  a: `<p>All calls go through one API client, and a request interceptor on that client asks MSAL for a token and adds the header, so no call can forget it.</p>
    <pre><code>export const api = axios.create({ baseURL: "https://api.contoso.example" });

api.interceptors.request.use(async (config) =&gt; {
  const token = await getAccessToken();          // acquireTokenSilent inside
  config.headers.Authorization = "Bearer " + token;
  config.headers["X-Correlation-ID"] = crypto.randomUUID();
  return config;
});

api.interceptors.response.use((res) =&gt; res, async (error) =&gt; {
  const original = error.config;
  if (error.response?.status === 401 &amp;&amp; !original._retried) {
    original._retried = true;                    // retry once only
    original.headers.Authorization = "Bearer " + (await refreshOnce());
    return api(original);
  }
  return Promise.reject(error);                  // 403: show "not allowed", no retry
});</code></pre>
    <ul><li>The instance has a fixed base address, so tokens go only to your own API.</li>
    <li><code>getAccessToken</code> falls back to an interactive sign-in on <code>InteractionRequiredAuthError</code>.</li>
    <li>Usage is then plain: <code>api.get("/orders")</code>.</li></ul>
    <blockquote><b>Say it in the interview:</b> One Axios instance with a request interceptor that gets a token from MSAL and sets the Bearer header, and a response interceptor that refreshes once and retries once on 401 and never retries a 403.</blockquote>`,
  followUps: ['Why must the token not be sent to third-party URLs?', 'What goes wrong if you retry on 403?', 'How do you handle the fetch API or a streaming call?']
});
interview.push({
  q: 'What is the Angular equivalent of the React interceptor?', level: 'I',
  a: `<p>Angular has interceptors built into its HTTP client, and MSAL for Angular ships one that maps URLs to scopes.</p>
    <p><b>Option 1: the MSAL interceptor.</b> You list which address prefixes need which scopes; only those get a token.</p>
    <pre><code>protectedResourceMap: new Map([
  ["https://api.contoso.example/", ["api://22222222-2222-2222-2222-222222222222/Orders.Read"]],
])
// provideHttpClient(withInterceptorsFromDi()),
// { provide: HTTP_INTERCEPTORS, useClass: MsalInterceptor, multi: true }</code></pre>
    <p><b>Option 2: a functional interceptor</b> (<code>HttpInterceptorFn</code>, Angular 15 and later).</p>
    <pre><code>export const authInterceptor: HttpInterceptorFn = (req, next) =&gt; {
  const auth = inject(AuthService);
  if (!req.url.startsWith(environment.apiBaseUrl)) return next(req);
  return from(auth.getAccessToken()).pipe(
    switchMap((t) =&gt; next(req.clone({ setHeaders: { Authorization: "Bearer " + t } }))));
};
// provideHttpClient(withInterceptors([authInterceptor]))</code></pre>
    <p>Requests are immutable in Angular, so you <code>clone</code> to add a header. <code>MsalGuard</code> plays the role of the React route guard.</p>
    <blockquote><b>Say it in the interview:</b> In Angular I use MSAL's interceptor with a protectedResourceMap, or a functional HttpInterceptorFn that clones the request with the Bearer header, only for my API's base URL.</blockquote>`,
  followUps: ['Why does the request need to be cloned?', 'How do you order several interceptors?']
});
interview.push({
  q: 'Five requests fail with 401 at the same moment. What should the client do?', level: 'A',
  a: `<p>Start exactly one token refresh and make the other four wait for it, then retry each request once; this is called single-flight.</p>
    <pre><code>let refreshing: Promise&lt;string&gt; | null = null;

export function refreshOnce(): Promise&lt;string&gt; {
  if (!refreshing) {
    refreshing = getAccessToken(true)             // forceRefresh
      .finally(() =&gt; { refreshing = null; });
  }
  return refreshing;                              // everyone awaits the same promise
}</code></pre>
    <p>Why it matters:</p>
    <ul><li>Five parallel refreshes waste calls and can hit rate limits.</li>
    <li>With <b>refresh token rotation</b>, each use issues a new refresh token and retires the old one. Parallel refreshes then race, and the loser looks like token reuse, which can revoke the whole session.</li>
    <li>If the refresh needs interaction, you want one redirect, not five.</li></ul>
    <p>Also mark each request as retried so a second 401 is returned to the caller instead of looping. JavaScript is single-threaded, so the check-and-set on <code>refreshing</code> needs no lock.</p>
    <blockquote><b>Say it in the interview:</b> I share one in-flight refresh promise. The first 401 starts the refresh, the others await the same promise, then each request is replayed once with the new token. That prevents a refresh stampede.</blockquote>`,
  followUps: ['What happens across two browser tabs?', 'What if the refresh itself fails?', 'Does MSAL already de-duplicate silent requests?']
});
interview.push({
  q: 'loginRedirect vs loginPopup, and why does silent sign-in sometimes fail in Safari or private windows?', level: 'A',
  a: `<p>Redirect sends the whole page to the sign-in site and back; popup opens a small window and keeps your page alive; silent sign-in in a hidden iframe fails where the browser blocks third-party cookies.</p>
    <table><tr><th></th><th>Redirect</th><th>Popup</th></tr>
    <tr><td>Popup blockers</td><td>No problem</td><td>Can block it</td></tr>
    <tr><td>In-page state</td><td>Lost; the app reloads</td><td>Kept</td></tr>
    <tr><td>Mobile and embedded browsers</td><td>Reliable</td><td>Often broken</td></tr></table>
    <p><b>The third-party cookie issue:</b></p>
    <ul><li>Normal renewal uses the refresh token and needs no cookie.</li>
    <li>A SPA's refresh token lasts 24 hours. After that, MSAL tries a hidden iframe to the sign-in site, which relies on the Entra ID session cookie. Inside an iframe that cookie is "third-party".</li>
    <li>Safari, Firefox and private windows block it, so <code>ssoSilent</code> and that iframe fail with an interaction-required error.</li>
    <li>Handle it: catch the error, save the user's place, and do a redirect. It usually returns at once because the Microsoft session is still alive in a top-level page.</li></ul>
    <blockquote><b>Say it in the interview:</b> I default to redirect because it works everywhere. Silent iframe sign-in depends on third-party cookies, which several browsers block, so my code always handles InteractionRequiredAuthError with a redirect fallback.</blockquote>`,
  followUps: ['What is the interaction_in_progress error?', 'How do you return the user to the page they were on?', 'How does a BFF avoid this problem?']
});

// ---------- INTERVIEW: section 5, the back end ----------
interview.push({
  q: 'What do UseAuthentication, UseAuthorization, [Authorize] and [AllowAnonymous] each do?', level: 'B',
  a: `<p><code>UseAuthentication</code> works out who the caller is, <code>UseAuthorization</code> decides whether they may run the endpoint, and the two attributes tell it what each endpoint needs.</p>
    <table><tr><th>Piece</th><th>Job</th></tr>
    <tr><td><code>app.UseAuthentication()</code></td><td>Runs the handler (for example JWT bearer), validates the token and fills <code>HttpContext.User</code></td></tr>
    <tr><td><code>app.UseAuthorization()</code></td><td>Reads the endpoint's requirements and answers 401 (no user) or 403 (user lacks permission)</td></tr>
    <tr><td><code>[Authorize]</code></td><td>"This endpoint needs a signed-in caller", optionally with <code>Roles</code> or <code>Policy</code></td></tr>
    <tr><td><code>[AllowAnonymous]</code></td><td>"This endpoint is open", overriding any <code>[Authorize]</code> and the fallback policy</td></tr></table>
    <p><b>Order matters:</b> routing, then CORS, then authentication, then authorization, then the endpoints. Since .NET 7 a <code>WebApplication</code> adds the two middlewares for you when the services are registered, but calling them yourself keeps the order visible and correct.</p>
    <blockquote><b>Say it in the interview:</b> Authentication middleware builds the user from the token; authorization middleware checks the endpoint's requirements against that user. Authorize demands a caller, AllowAnonymous opens an endpoint on purpose, and the order is CORS, authentication, authorization.</blockquote>`,
  followUps: ['What happens if UseAuthorization comes before UseAuthentication?', 'What does an endpoint with no attribute do by default?', 'How do minimal APIs express the same thing?']
});
interview.push({
  q: 'How do you add JWT bearer authentication to a .NET API with Microsoft.Identity.Web?', level: 'I',
  a: `<p>You point the library at your tenant and API ids in configuration, register it with one call, and define policies for scopes and roles.</p>
    <pre><code>// appsettings.json
// "AzureAd": { "Instance": "https://login.microsoftonline.com/",
//   "TenantId": "00000000-0000-0000-0000-000000000000",
//   "ClientId": "22222222-2222-2222-2222-222222222222" }

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddMicrosoftIdentityWebApi(builder.Configuration.GetSection("AzureAd"));

builder.Services.AddAuthorization(options =&gt;
{
    options.FallbackPolicy = new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser().Build();                      // secure by default
    options.AddPolicy("Orders.Read", p =&gt; p.RequireScope("Orders.Read"));   // scp
    options.AddPolicy("AdminsOnly",  p =&gt; p.RequireRole("Admin"));          // roles
});

app.UseAuthentication();
app.UseAuthorization();</code></pre>
    <ul><li><code>RequireScope</code> checks the <code>scp</code> claim; <code>RequireRole</code> checks <code>roles</code>.</li>
    <li>The <b>fallback policy</b> protects every endpoint that has no attribute. It is the back-end half of "every call must have a valid token".</li></ul>
    <blockquote><b>Say it in the interview:</b> AddMicrosoftIdentityWebApi wires up JWT bearer validation against my tenant and audience. I add policies for scopes and roles, and a fallback policy requiring an authenticated user so no endpoint is public by accident.</blockquote>`,
  followUps: ['What is the difference between FallbackPolicy and DefaultPolicy?', 'Where would you put [AllowAnonymous], for example?', 'What does the library add over plain AddJwtBearer?']
});
interview.push({
  q: 'How do you use the caller identity inside controllers, and how do you stop user A reading user B\'s record?', level: 'I',
  a: `<p>Read the caller from <code>User</code> (the claims), and add a resource-based check that compares the caller with the record being requested.</p>
    <pre><code>[Authorize(Policy = "Orders.Read")]
public async Task&lt;IActionResult&gt; Get(int id, CancellationToken ct)
{
    string oid = User.GetObjectId()!;      // "oid" claim
    string tid = User.GetTenantId()!;      // "tid" claim
    Order? order = await orders.FindAsync(tid, id, ct);
    if (order is null) return NotFound();

    var result = await authz.AuthorizeAsync(User, order, new SameStoreRequirement());
    return result.Succeeded ? Ok(order) : Forbid();
}

public class SameStoreHandler : AuthorizationHandler&lt;SameStoreRequirement, Order&gt;
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext ctx, SameStoreRequirement req, Order order)
    {
        if (ctx.User.FindFirst("store")?.Value == order.StoreId || ctx.User.IsInRole("Admin"))
            ctx.Succeed(req);
        return Task.CompletedTask;
    }
}</code></pre>
    <p>The token says <b>who</b> is calling. Your rule decides <b>which records</b> they may touch. A policy alone cannot do that, because it runs before the record is loaded. Skipping this check is the most common API security bug (broken object level authorization).</p>
    <blockquote><b>Say it in the interview:</b> I read oid, tid and roles from the ClaimsPrincipal, never from the request body, and I use resource-based authorization with IAuthorizationService to check that the loaded record belongs to the caller before returning it.</blockquote>`,
  followUps: ['Would you return 403 or 404 for someone else\'s order, and why?', 'How do you reach the user in a service class that is not a controller?', 'How do you test this rule?']
});
interview.push({
  q: 'Role-based, claims-based and policy-based authorization in ASP.NET Core: how do they relate?', level: 'I',
  a: `<p>They are layers of the same system: a role check is a simple claim check, and a policy is a named set of requirements that can include roles, claims or custom code.</p>
    <table><tr><th>Style</th><th>Example</th><th>Good for</th></tr>
    <tr><td>Role-based</td><td><code>[Authorize(Roles = "Admin,Manager")]</code></td><td>Simple "is one of these" checks</td></tr>
    <tr><td>Claims-based</td><td><code>p.RequireClaim("department", "Finance")</code></td><td>Facts about the caller</td></tr>
    <tr><td>Policy-based</td><td><code>[Authorize(Policy = "CanRefund")]</code></td><td>Named, reusable, testable rules</td></tr>
    <tr><td>Custom requirement</td><td><code>IAuthorizationRequirement</code> + handler</td><td>Logic: limits, time, tenant lists, the resource</td></tr></table>
    <ul><li>Roles in one attribute, comma-separated, mean <b>any</b>. Two attributes stacked mean <b>all</b>.</li>
    <li>Prefer policies named after the <b>action</b> (<code>CanRefund</code>), not the job title. When the rule changes, you edit one place.</li>
    <li>RBAC (role-based access control) grants by role; ABAC (attribute-based) decides from attributes of user, resource and context. Policies with handlers let you do both.</li></ul>
    <blockquote><b>Say it in the interview:</b> Roles and claims are inputs; policies are the unit I authorize with. I name policies after actions and implement anything non-trivial as a requirement with a handler, including resource-based checks.</blockquote>`,
  followUps: ['Several handlers exist for one requirement. How is the result decided?', 'How would you load permissions from a database?', 'What is the downside of sprinkling role names through controllers?']
});

interview.push({
  q: 'How would you configure JWT validation without the helper library, so you can explain what happens?', level: 'A',
  a: `<p>You call <code>AddJwtBearer</code>, give it the authority to download keys from, and spell out each check in <code>TokenValidationParameters</code>.</p>
    <pre><code>builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =&gt;
    {
        o.Authority = $"https://login.microsoftonline.com/{tenantId}/v2.0";  // metadata + keys, cached
        o.MapInboundClaims = false;
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,   ValidIssuer = $"https://login.microsoftonline.com/{tenantId}/v2.0",
            ValidateAudience = true, ValidAudience = apiClientId,
            ValidateLifetime = true, ClockSkew = TimeSpan.FromMinutes(2),
            ValidateIssuerSigningKey = true, RequireSignedTokens = true,
            NameClaimType = "name",  RoleClaimType = "roles"
        };
        o.Events = new JwtBearerEvents
        {
            OnAuthenticationFailed = ctx =&gt; { /* log ctx.Exception, never the token */ return Task.CompletedTask; }
        };
    });</code></pre>
    <p>To validate a raw token string yourself (a Function, a WebSocket handshake), create one <code>ConfigurationManager&lt;OpenIdConnectConfiguration&gt;</code> for the discovery address, and pass its <code>Issuer</code> and <code>SigningKeys</code> to <code>JsonWebTokenHandler.ValidateTokenAsync</code>. Keep the manager as a singleton so the keys stay cached.</p>
    <blockquote><b>Say it in the interview:</b> Authority tells the handler where to fetch and cache the signing keys. TokenValidationParameters lists the checks: issuer, audience, lifetime, signing key. Events let me log failures.</blockquote>`,
  followUps: ['Which handler does ASP.NET Core 8 and later use by default?', 'Why set RoleClaimType?', 'What is the danger of creating a new ConfigurationManager per request?']
});
interview.push({
  q: 'How do you authenticate HTTP-triggered Azure Functions (isolated worker)?', level: 'A',
  a: `<p>A Function with <code>AuthorizationLevel.Anonymous</code> checks nothing, and function keys are shared secrets rather than user identity, so you must add token validation in front of or inside the Function.</p>
    <ol><li><b>App Service Authentication ("Easy Auth")</b> on the Function App: the platform validates the Entra ID token before your code runs and passes the caller in the <code>X-MS-CLIENT-PRINCIPAL</code> header.</li>
    <li><b>API Management</b> in front, with a <code>validate-jwt</code> or <code>validate-azure-ad-token</code> policy, and the Function reachable only from it.</li>
    <li><b>Worker middleware</b> (<code>IFunctionsWorkerMiddleware</code>): for each HTTP invocation read the Bearer header, validate signature, issuer, audience and lifetime, answer 401 early if it fails, otherwise put the principal in <code>context.Items</code>.</li></ol>
    <p>With ASP.NET Core integration you can also register <code>AddJwtBearer</code> and read <code>HttpContext.User</code>, but triggers do not enforce <code>[Authorize]</code> for you on every setup, so check it explicitly.</p>
    <p>The design rule: <b>authenticate once at the edge, then pass a trusted context inward</b>. Inner services receive a context object (user, tenant) and never parse headers themselves.</p>
    <blockquote><b>Say it in the interview:</b> Functions do not authenticate users by default. I either turn on platform authentication, put API Management in front with JWT validation, or add worker middleware that validates the token and short-circuits with 401 before any business logic.</blockquote>`,
  followUps: ['Why are function keys not enough?', 'How do non-HTTP triggers (queue, timer) get an identity?', 'How do you allow a health endpoint without a token?']
});
interview.push({
  q: 'Show how a .NET service calls Key Vault, another API as itself, and another API as the user.', level: 'A',
  a: `<p>Use a managed identity for Azure resources, client credentials for app-to-app calls with no user, and on-behalf-of when the user's identity must travel to the next API.</p>
    <pre><code>// 1. Managed identity: nothing stored
var kv = new SecretClient(new Uri("https://contoso-shop-kv.vault.azure.net/"), new DefaultAzureCredential());
KeyVaultSecret secret = await kv.GetSecretAsync("OrdersDb");

// 2. Client credentials (daemon): app-only token with roles
var app = ConfidentialClientApplicationBuilder.Create(clientId)
    .WithCertificate(cert)
    .WithAuthority($"https://login.microsoftonline.com/{tenantId}").Build();
var result = await app.AcquireTokenForClient(new[] { "api://44444444-.../.default" }).ExecuteAsync();

// 3. On-behalf-of: call the Inventory API as the signed-in user
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddMicrosoftIdentityWebApi(builder.Configuration.GetSection("AzureAd"))
    .EnableTokenAcquisitionToCallDownstreamApi()
    .AddDownstreamApi("Inventory", builder.Configuration.GetSection("Inventory"))
    .AddDistributedTokenCaches();</code></pre>
    <p><code>DefaultAzureCredential</code> tries environment variables, managed identity, then developer sign-ins, so one code path works on a laptop and in Azure.</p>
    <blockquote><b>Say it in the interview:</b> Managed identity with DefaultAzureCredential for Key Vault, client credentials with a certificate and the .default scope for daemon calls, and Microsoft.Identity.Web's on-behalf-of support when the downstream API needs to know the user.</blockquote>`,
  followUps: ['What role assignment does the identity need on Key Vault?', 'Why .default for client credentials?', 'Where is the on-behalf-of token cached when you run 6 instances?']
});
interview.push({
  q: 'What if there is no JWT in the browser? Explain cookie sessions in ASP.NET Core and the BFF pattern.', level: 'A',
  a: `<p>The server signs the user in, keeps the tokens on the server, and gives the browser only an HttpOnly cookie that script cannot read.</p>
    <pre><code>builder.Services.AddAuthentication(o =&gt;
    {
        o.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
        o.DefaultChallengeScheme = OpenIdConnectDefaults.AuthenticationScheme;
    })
    .AddCookie(o =&gt;
    {
        o.Cookie.HttpOnly = true;
        o.Cookie.SecurePolicy = CookieSecurePolicy.Always;
        o.Cookie.SameSite = SameSiteMode.Strict;
        o.ExpireTimeSpan = TimeSpan.FromHours(8);
        o.SlidingExpiration = true;
    })
    .AddOpenIdConnect(o =&gt; { /* authority, client id, code flow, SaveTokens = true */ });
builder.Services.AddAntiforgery();</code></pre>
    <ul><li>The cookie is the session. Tokens never reach JavaScript, so XSS cannot steal them.</li>
    <li>Cookies are sent automatically, so state-changing endpoints need CSRF defence: <code>SameSite</code>, anti-forgery tokens, or a required custom header.</li>
    <li>In a <b>BFF</b>, this server sits beside the SPA and forwards API calls, attaching the access token itself (for example with YARP).</li>
    <li>Large cookies or instant revocation: keep the ticket in a server-side store (<code>ITicketStore</code>) and send only a key.</li></ul>
    <blockquote><b>Say it in the interview:</b> With cookie authentication plus OpenID Connect the tokens stay on the server and the browser holds an HttpOnly, Secure, SameSite cookie. That removes token theft by XSS, and in exchange I must defend against CSRF.</blockquote>`,
  followUps: ['Which SameSite value breaks the sign-in redirect, and why?', 'How does the BFF refresh the access token?', 'When is a BFF not worth it?']
});
interview.push({
  q: 'If you had to issue your own JWTs, how would you do it, and what are the design rules?', level: 'E',
  a: `<p>You sign a small set of claims with a key the APIs can verify, keep the token short-lived, and build refresh and key rotation around it; in practice you should prefer an existing identity provider.</p>
    <pre><code>var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretFromKeyVault)); // HS256 demo only
var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
var token = new JwtSecurityToken(
    issuer: "https://auth.contoso.example", audience: "orders-api",
    claims: new[] { new Claim("sub", userId), new Claim("role", "Admin") },
    notBefore: DateTime.UtcNow, expires: DateTime.UtcNow.AddMinutes(15),
    signingCredentials: creds);
string jwt = new JwtSecurityTokenHandler().WriteToken(token);</code></pre>
    <ul><li><b>Asymmetric signing</b> (RSA or ECDSA): APIs hold only the public key. With a shared HMAC secret, every API that can verify can also forge.</li>
    <li><b>Short access tokens</b> (5 to 15 minutes).</li>
    <li><b>Refresh tokens</b> are random, stored <b>hashed</b> on the server, and <b>rotated</b>: each use issues a new one. Reuse of an old one means theft, so revoke the whole family.</li>
    <li><b>Key rotation:</b> publish keys at a JWKS address with <code>kid</code>, overlap old and new.</li>
</ul>
    <p>In practice, use Entra ID, Auth0, Keycloak or similar unless you have a strong reason.</p>
    <blockquote><b>Say it in the interview:</b> Short-lived access tokens signed with an asymmetric key, hashed and rotated refresh tokens with reuse detection, and keys published through JWKS with a kid. But I would choose a managed identity provider over building one.</blockquote>`,
  followUps: ['What is the algorithm confusion attack?', 'How does reuse detection work for a token family?', 'What would .NET Identity give you out of the box?']
});
interview.push({
  q: 'Your API must accept tokens from two issuers (for example staff from Entra ID and customers from another identity provider). How do you design that?', level: 'E',
  a: `<p>Register one authentication scheme per issuer and make the authorization policies say which schemes they accept, so a token is only ever checked against the issuer it claims to come from.</p>
    <pre><code>builder.Services.AddAuthentication()
    .AddJwtBearer("Staff",     o =&gt; { o.Authority = staffAuthority;    o.Audience = apiId; })
    .AddJwtBearer("Customers", o =&gt; { o.Authority = customerAuthority; o.Audience = apiId; });

builder.Services.AddAuthorization(options =&gt;
{
    options.DefaultPolicy = new AuthorizationPolicyBuilder("Staff", "Customers")
        .RequireAuthenticatedUser().Build();
    options.AddPolicy("StaffOnly", p =&gt; p.AddAuthenticationSchemes("Staff").RequireRole("Admin"));
});</code></pre>
    <ul><li>Alternatively use a <b>policy scheme</b> (<code>AddPolicyScheme</code>) that peeks at the unvalidated <code>iss</code> and forwards to the right handler. Peeking is safe only for routing; the chosen handler still validates fully.</li>
    <li><b>Do not merge trust.</b> A "customer" token must never satisfy a staff policy just because it has a claim called <code>roles</code>. Bind sensitive policies to a scheme.</li>
    <li>Normalise identities after validation (claims transformation) into one internal shape: user id, tenant, permissions, and which issuer vouched for them.</li>
    <li>Expect each failed scheme to log a failure; filter that noise.</li></ul>
    <blockquote><b>Say it in the interview:</b> One named JWT bearer scheme per issuer, policies that list the schemes they accept, and sensitive policies bound to the staff scheme only. After validation I map both kinds of identity into one internal claims shape.</blockquote>`,
  followUps: ['Why is it unsafe to trust a claim without knowing which issuer signed it?', 'What changes during a migration from one identity provider to another?']
});

// ---------- INTERVIEW: section 6, troubleshooting ----------
interview.push({
  q: 'What is the difference between 401 and 403, and what should the client do for each?', level: 'B',
  a: `<p>401 means the API could not trust who you are; 403 means it knows who you are and you are not allowed.</p>
    <table><tr><th></th><th>401 Unauthorized</th><th>403 Forbidden</th></tr>
    <tr><td>Typical cause</td><td>No token, expired token, wrong audience or issuer, bad signature</td><td>Valid token without the needed scope or role, or a record that is not yours</td></tr>
    <tr><td>ASP.NET Core term</td><td>Challenge</td><td>Forbid</td></tr>
    <tr><td>Extra information</td><td><code>WWW-Authenticate: Bearer error="invalid_token"</code></td><td>Usually none</td></tr>
    <tr><td>Client action</td><td>Get a fresh token once and retry; else sign in</td><td>Do not retry; show "you do not have access"</td></tr></table>
    <p>The name "Unauthorized" for 401 is misleading: it is really "unauthenticated". Mixing the two up causes real bugs, for example a client that keeps refreshing tokens on a 403 and loops forever.</p>
    <blockquote><b>Say it in the interview:</b> 401 is not authenticated or an invalid token: refresh or sign in again. 403 is authenticated but not permitted: a new token will not help, so I show a not-allowed message and do not retry.</blockquote>`,
  followUps: ['When might you return 404 instead of 403?', 'Which middleware produces each code?']
});
interview.push({
  q: 'A call returns 401 or 403 in production. What is your checklist?', level: 'I',
  a: `<p>Read the status code and error text first, then decode the token and compare four claims with what the API expects.</p>
    <table><tr><th>Symptom</th><th>Likely cause</th><th>Check</th></tr>
    <tr><td>401, audience error</td><td>Token for another API, or an ID token</td><td>Decode; compare <code>aud</code> with the API setting</td></tr>
    <tr><td>401, issuer mismatch</td><td>v1.0 vs v2.0 token, wrong tenant</td><td><code>ver</code> claim; token version in the API registration</td></tr>
    <tr><td>401, IDX10223 lifetime</td><td>Expired token or clock drift</td><td><code>exp</code>; server clock; refresh logic</td></tr>
    <tr><td>401, IDX10503 signature key</td><td>Key rotation, wrong authority</td><td>Metadata address, key cache</td></tr>
    <tr><td>401 from the browser only</td><td>CORS preflight rejected by authentication</td><td>CORS before auth; allow OPTIONS</td></tr>
    <tr><td>403 with a valid token</td><td>Missing scope or role</td><td><code>scp</code>/<code>roles</code>; admin consent; policy names</td></tr>
    <tr><td>Works locally, fails in Azure</td><td>Redirect address or app setting differs</td><td>App settings, slots, registration</td></tr>
    <tr><td>Random 401 after hours</td><td>Silent renewal failing</td><td>MSAL logs, third-party cookies</td></tr></table>
    <p>Tools: jwt.ms, the browser network tab, the MSAL logger, Entra ID sign-in logs, Application Insights with correlation ids.</p>
    <blockquote><b>Say it in the interview:</b> I start from the status code and the WWW-Authenticate error, decode the token, and compare aud, iss, exp and scp or roles with the API configuration. 401 sends me to the token; 403 sends me to permissions and consent.</blockquote>`,
  followUps: ['How do you debug this without logging tokens?', 'What does the ver claim tell you?', 'Why would Postman succeed while the browser fails?']
});

// ---------- INTERVIEW: section 7, interview answers and drills ----------
interview.push({
  q: 'How does .NET "remember" the JWT? How is the session validated on each call?', level: 'B',
  a: `<p>It does not remember it: with bearer tokens the API is stateless, and the user is rebuilt from the token on every request.</p>
    <ul><li><code>HttpContext.User</code> exists only for the current request. It is created from the token's claims and discarded when the response is sent.</li>
    <li>There is no session table, no in-memory user list and no sticky server.</li>
    <li>What the server <b>does</b> cache is configuration: the OpenID Connect metadata and the signing keys.</li>
    <li>If a project needs a server-side session id, that is a different design (cookie authentication or a BFF), where the id is looked up on each request.</li>
    <li>A third design uses opaque session tokens: the service asks the issuing platform "who is this?" on each call and builds a request context from the answer.</li></ul>
    <p>Because nothing is remembered, any instance can serve any request, which is what makes the API easy to scale out.</p>
    <blockquote><b>Say it in the interview:</b> It does not remember. The API is stateless: the user principal is rebuilt from the token's claims on each request, and the only thing cached is the issuer's metadata and signing keys.</blockquote>`,
  followUps: ['Then how can any server in a farm handle my request?', 'What would you lose by adding server sessions?']
});
interview.push({
  q: 'Rapid fire: tokens and flows', level: 'B',
  a: `<p>Short answers you should be able to give at once.</p>
    <table><tr><th>Question</th><th>Short answer</th></tr>
    <tr><td>ID token vs access token?</td><td>ID token is for the client (who signed in). Access token is for the API (what the client may do).</td></tr>
    <tr><td>Why PKCE?</td><td>A public client cannot keep a secret. PKCE ties the code to the client that started the flow.</td></tr>
    <tr><td>Where do you store tokens in a SPA?</td><td>In the MSAL cache: session storage by default, or memory. For the highest security, a BFF with HttpOnly cookies.</td></tr>
    <tr><td>Can you revoke a JWT?</td><td>Not directly. Use short lifetimes, refresh token revocation, CAE, or opaque tokens with introspection.</td></tr>
    <tr><td>What if the refresh token expires?</td><td>MSAL throws <code>InteractionRequiredAuthError</code>; send the user to sign in again.</td></tr>
    <tr><td>Is a JWT encrypted?</td><td>No, only signed. Anyone can read it, so no secrets inside.</td></tr></table>
    <blockquote><b>Say it in the interview:</b> Keep each answer to one sentence, then stop. If the interviewer wants more, they will ask, and you have the longer version ready.</blockquote>`,
  followUps: ['Pick one row and give the 60-second version.', 'Which of these answers changes if the client is a mobile app?']
});
interview.push({
  q: 'Rapid fire: validation and status codes', level: 'B',
  a: `<p>Short answers about what the API checks.</p>
    <table><tr><th>Question</th><th>Short answer</th></tr>
    <tr><td>401 vs 403?</td><td>401: not authenticated or invalid token. 403: authenticated but not permitted.</td></tr>
    <tr><td>What does an <code>aud</code> mismatch mean?</td><td>The token was issued for another API, or it is an ID token.</td></tr>
    <tr><td>What is <code>kid</code>?</td><td>The key id in the JWT header. It says which public key verifies the signature.</td></tr>
    <tr><td>Stateless vs stateful authentication?</td><td>A self-contained signed token checked locally, versus a server-side session looked up on each request.</td></tr>
    <tr><td>Scope vs role?</td><td>Scope: a permission the client app was granted for the user. Role: what the user or app is assigned.</td></tr></table>
    <blockquote><b>Say it in the interview:</b> Name the claim or the status code in the first five words of each answer. It shows you know exactly where to look.</blockquote>`,
  followUps: ['Which claim holds scopes, and which holds roles?', 'What does the API do when it meets an unknown kid?']
});
interview.push({
  q: 'Rapid fire: platform and browser', level: 'B',
  a: `<p>Short answers about Entra ID, Azure and the browser.</p>
    <table><tr><th>Question</th><th>Short answer</th></tr>
    <tr><td>How do services authenticate to Azure resources?</td><td>With a managed identity. No stored credentials.</td></tr>
    <tr><td>What is single sign-on (SSO)?</td><td>One Entra ID sign-in session reused across apps, so tokens are obtained silently with no new prompt.</td></tr>
    <tr><td>What is MFA?</td><td>Multi-factor authentication: a second proof, such as an app approval or passkey, checked by Entra ID at sign-in.</td></tr>
    <tr><td>What is conditional access?</td><td>Policies Entra ID evaluates at sign-in (device, location, risk). Your API does not see them; it only sees the resulting token.</td></tr>
    <tr><td>What is CORS, and does it secure the API?</td><td>A browser rule for cross-origin calls. It protects users in browsers; it is not a control against non-browser clients.</td></tr></table>
    <blockquote><b>Say it in the interview:</b> For each of these, say who enforces it: Azure for managed identity, Entra ID for SSO, MFA and conditional access, the browser for CORS. The API enforces tokens and permissions.</blockquote>`,
  followUps: ['Why can curl ignore CORS?', 'How does your app find out that MFA is now required?']
});
interview.push({
  q: 'What does Microsoft return when the user logs in, and what does .NET do with it?', level: 'I',
  a: `<p>Entra ID first returns a one-time code to the browser, which MSAL swaps for three tokens; .NET never sees the login and only ever receives the access token on API calls.</p>
    <ol><li>After the user authenticates, Entra ID redirects to the registered address with an <b>authorization code</b>.</li>
    <li>MSAL redeems the code at the token endpoint together with the PKCE verifier.</li>
    <li>It receives an <b>ID token</b> for the app, an <b>access token</b> for the API and a <b>refresh token</b>, and stores them in the browser cache.</li>
    <li>On each API call the access token travels in the <code>Authorization</code> header.</li>
    <li>.NET validates it with Entra ID's public keys and builds a <code>ClaimsPrincipal</code> for that request.</li>
    <li>There is no .NET session. To know the user, the code reads claims such as <code>oid</code>, <code>scp</code> and <code>roles</code>.</li></ol>
    <p>The API never sees the ID token, the refresh token or the password.</p>
    <blockquote><b>Say it in the interview:</b> Entra ID returns a code; MSAL exchanges it with the PKCE verifier for an ID token, an access token and a refresh token. .NET only receives the access token, validates it and builds the user from its claims for that one request.</blockquote>`,
  followUps: ['Which of the three tokens can the API never see, and why is that good?', 'Where does the API get the user display name if it needs it?']
});
interview.push({
  q: 'Why put an interceptor on top of an API service?', level: 'I',
  a: `<p>The service gives one place to describe your API; the interceptor guarantees that the things every call needs happen every time, even for code written next year.</p>
    <table><tr><th>API service</th><th>Interceptor</th></tr>
    <tr><td>Base address, typed methods, mapping errors to messages</td><td>Cross-cutting work for every request and response</td></tr>
    <tr><td>One method per endpoint</td><td>No knowledge of endpoints</td></tr>
    <tr><td>A developer could still forget the header in a new method</td><td>New endpoints are secure by default</td></tr></table>
    <p>What the interceptor does in one place:</p>
    <ul><li>gets the token (silently renewed) and adds the Bearer header;</li>
    <li>adds headers such as a correlation id;</li>
    <li>handles 401 with a single refresh and a single retry;</li>
    <li>normalises errors, and leaves 403 alone.</li></ul>
    <p>In React this is an Axios interceptor with MSAL. In Angular it is an <code>HttpInterceptorFn</code>, or MSAL's interceptor with a <code>protectedResourceMap</code>.</p>
    <blockquote><b>Say it in the interview:</b> The service centralises endpoints and typing; the interceptor is the cross-cutting layer that attaches the token, adds a correlation id and handles 401 once. It removes duplicated token code and makes new calls secure by default.</blockquote>`,
  followUps: ['What should an interceptor never do?', 'How do you unit test it?']
});
interview.push({
  q: 'Draw the sign-in and API call flow on a whiteboard and talk through it.', level: 'I',
  a: `<p>Draw three boxes (browser, Entra ID, API) and narrate seven arrows in order.</p>
    <ol><li><b>Browser to Entra ID:</b> sign-in request, authorization code flow with a PKCE challenge.</li>
    <li><b>Entra ID to browser:</b> a code, then tokens (ID, access, refresh) in exchange for code and verifier.</li>
    <li><b>Browser:</b> MSAL caches the tokens; the interceptor adds the Bearer header.</li>
    <li><b>Browser to API:</b> the request with the access token.</li>
    <li><b>API:</b> verify the signature with cached keys; check <code>iss</code>, <code>aud</code>, <code>exp</code>, <code>scp</code>; build the principal; run the policy; run the endpoint.</li>
    <li><b>API to browser:</b> 200, 401 or 403.</li>
    <li><b>On expiry:</b> MSAL renews silently with the refresh token; if it cannot, interactive sign-in.</li></ol>
    <p>Tips: label each token with its audience as you draw it, draw a small dotted line from the API to "keys (cached)" to show there is no per-request call, and finish in two minutes. If there is a downstream API, add a fourth box and one more arrow pair for on-behalf-of.</p>
    <blockquote><b>Say it in the interview:</b> Three boxes, seven arrows: sign-in with PKCE, code then tokens, cache and interceptor, request with the access token, local validation and policy, response, silent renewal.</blockquote>`,
  followUps: ['Where on your drawing would an attacker try to steal something?', 'Add a second API that the first one calls. What changes?']
});
interview.push({
  q: 'XSS vs CSRF: what is each, and how does the token storage choice change which one you worry about?', level: 'I',
  a: `<p>XSS is hostile script running inside your page; CSRF is another site making the browser send a request that carries your cookies.</p>
    <table><tr><th></th><th>XSS (cross-site scripting)</th><th>CSRF (cross-site request forgery)</th></tr>
    <tr><td>Attacker gets</td><td>To run code as your page: read storage, call APIs</td><td>One blind request sent with the victim's cookies</td></tr>
    <tr><td>Hits hardest</td><td>Tokens in <code>localStorage</code> or <code>sessionStorage</code></td><td>Cookie-based sessions</td></tr>
    <tr><td>Defences</td><td>Output encoding (React does this by default), a strict Content Security Policy, no untrusted HTML, dependency hygiene</td><td><code>SameSite</code> cookies, anti-forgery tokens, a required custom header</td></tr></table>
    <ul><li>Bearer tokens in a header are immune to CSRF, because the browser never attaches them by itself, but they can be read by XSS.</li>
    <li>HttpOnly cookies cannot be read by XSS but are sent automatically, so they need CSRF defence. Note that XSS can still <i>use</i> the session while the page is open.</li></ul>
    <blockquote><b>Say it in the interview:</b> XSS runs script in my page and can steal tokens from storage; CSRF abuses cookies the browser sends automatically. Header tokens trade CSRF risk for XSS risk, and HttpOnly cookies do the opposite, so I defend the one my design exposes.</blockquote>`,
  followUps: ['Does an HttpOnly cookie make XSS harmless?', 'What does SameSite=Lax still allow?', 'Name one Content Security Policy rule you would set.']
});
interview.push({
  q: 'How do you ensure the API is only called with a valid token?', level: 'A',
  a: `<p>The client attaches a token to every call, and the API checks every call as if the client could not be trusted.</p>
    <p><b>Weak answer:</b> "I use authentication middleware." It is true, but it names a component and explains nothing.</p>
    <p><b>Strong answer in four layers:</b></p>
    <ol><li><b>Sign-in:</b> OpenID Connect, authorization code with PKCE. MSAL gets an access token issued for my API and caches it.</li>
    <li><b>Client plumbing:</b> one API service with an interceptor that asks MSAL for a token before each request (silent renewal included), adds the Bearer header only for my API's addresses, and on 401 refreshes once and retries once.</li>
    <li><b>API authentication:</b> the JWT bearer handler validates each request: signature with cached Entra ID keys, then issuer, audience and lifetime. Failure: 401.</li>
    <li><b>API authorization:</b> policies check scopes and roles, my code checks the record. Failure: 403. A <b>fallback policy</b> requires an authenticated caller everywhere unless an endpoint is marked anonymous.</li></ol>
    <p>Likely follow-ups: a stolen token (short lifetimes, HTTPS only, BFF if XSS risk is high, rotation, CAE, monitoring); a direct curl call (same validation, the SPA's guards are only UX); who refreshes (MSAL on the client, never the API).</p>
    <blockquote><b>Say it in the interview:</b> Two halves. The client attaches a token through an interceptor; the API validates signature, issuer, audience, expiry and scope on every request, statelessly, with a fallback policy so that nothing is open by accident.</blockquote>`,
  followUps: ['What if the token is stolen?', 'What if I call the API directly with curl?', 'Where does the token expire and who refreshes it?']
});
interview.push({
  q: 'Which security questions usually follow the sign-in discussion, and what are your short answers?', level: 'A',
  a: `<p>Interviewers move from "how do users sign in" to "what else protects the system", and they expect one clear rule per area.</p>
    <table><tr><th>Area</th><th>Rule</th></tr>
    <tr><td>Secure headers</td><td><code>Strict-Transport-Security</code>, <code>Content-Security-Policy</code>, <code>X-Content-Type-Options</code>, <code>Referrer-Policy</code></td></tr>
    <tr><td>Password storage (if you ever own it)</td><td>Never reversible. A slow salted hash: Argon2id, bcrypt, or PBKDF2 with a high iteration count</td></tr>
    <tr><td>Secrets</td><td>Key Vault plus managed identity. Nothing in Git, pipelines or front-end bundles; anything in a SPA bundle is public</td></tr>
    <tr><td>Logging</td><td>Never log tokens, passwords or full personal data. Log correlation ids and token metadata such as <code>oid</code> and <code>aud</code></td></tr>
    <tr><td>Multi-tenancy</td><td>Scope every query by the tenant from the validated token (<code>tid</code>), never by a value the client sends</td></tr>
    <tr><td>Least privilege</td><td>Narrow scopes, separate roles, managed identities with only the role assignments they need</td></tr></table>
    <p>If asked for numbers on password hashing: OWASP currently suggests Argon2id with at least 19 MiB of memory and 2 iterations, or PBKDF2-HMAC-SHA256 with 600,000 iterations.</p>
    <blockquote><b>Say it in the interview:</b> Beyond sign-in I cover secure headers, slow salted password hashes if we store passwords at all, secrets in Key Vault with managed identity, no tokens in logs, tenant taken from the validated token, and least privilege everywhere.</blockquote>`,
  followUps: ['Why must a password hash be slow?', 'How do you find a secret that was committed to Git last year?', 'How would you prove tenant isolation in a test?']
});

// ---------- PRACTICE: 3 Easy, 5 Medium, 4 Hard ----------
practice.push(P({
  t: '401 or 403? Classify five cases', l: 'Easy', tags: ['status-codes'],
  s: 'For each case say whether the Orders API should answer 401 or 403, and what the client should do: (a) no <code>Authorization</code> header; (b) token expired 10 minutes ago; (c) valid token with <code>scp = Orders.Read</code> calling <code>DELETE /orders/7</code>, which needs <code>Orders.Write</code>; (d) valid token, but order 7 belongs to another store; (e) a token whose <code>aud</code> is Microsoft Graph.',
  ex: `<p>${H.c('r', '401')} = "I cannot trust who you are". ${H.c('y', '403')} = "I know who you are, and no".</p>`,
  weak: 'They are all 401 because the user is not authorized to do those things.',
  why: 'It mixes up the two codes. The client would then try to refresh the token for cases (c) and (d), which can never help, and may loop.',
  q: ['A valid token lacks the needed scope. Which code and which client action?', ['401, refresh the token', '403, show "not allowed" and do not retry', '401, sign in again', '500, retry later'], 1, 'The identity is trusted; the permission is missing. A new token for the same scopes changes nothing.'],
  h: ['Ask for each case: did token validation pass?', 'If validation failed or there is no token it is 401. If validation passed and a rule said no, it is 403.', 'Cases (a), (b), (e) fail validation. Cases (c), (d) pass validation and fail a policy or a resource check. For (d), also think about 404.'],
  a: `<p><b>Model answer.</b> "(a) <b>401</b>: no token, so no identity; the client signs in or attaches the token. (b) <b>401</b> with <code>invalid_token</code>: the lifetime check fails; the client refreshes once and retries. (c) <b>403</b>: the token is valid but the scope <code>Orders.Write</code> is missing; the client shows 'not allowed' and does not retry. If the user should have that right, the app must request the scope and consent must exist. (d) <b>403</b> from the resource-based check; some teams return <b>404</b> here so that they do not reveal that the order exists, and either is fine if it is consistent. (e) <b>401</b>: the audience check fails because the token is addressed to Graph; the client is asking for the wrong scope, so retrying with the same token is pointless and the code must be fixed."</p>`,
  cx: 'separates validation failures from permission failures, and gives a different client action for each.',
  f: ['Why might you prefer 404 over 403 in case (d)?', 'Which header tells the client why a 401 happened?']
}));
practice.push(P({
  t: 'Read a decoded token and predict the API response', l: 'Easy', tags: ['jwt', 'claims'],
  s: 'The Orders API expects issuer tenant <code>00000000-...</code>, audience <code>22222222-...</code>, and policy <code>Orders.Read</code> on <code>GET /orders</code>. A request arrives at 11:30 with this payload: <code>iss</code> = the right tenant, <code>aud</code> = <code>22222222-...</code>, <code>exp</code> = 12:10, <code>roles</code> = <code>["Orders.Export"]</code>, no <code>scp</code> claim, <code>azp</code> = an unknown app. What happens and why?',
  ex: `<p>${H.c('g', 'iss ok')}, ${H.c('g', 'aud ok')}, ${H.c('g', 'exp ok')}, ${H.c('r', 'no scp')}, ${H.c('y', 'roles present')} → this is an ${H.c('b', 'app-only token')}.</p>`,
  weak: 'The token is valid and signed, so the API returns 200.',
  why: 'A valid token only proves identity. The endpoint asks for the delegated scope Orders.Read, and this token has no scopes at all.',
  q: ['A token with roles and no scp claim was most likely obtained with which flow?', ['Authorization code + PKCE', 'Client credentials', 'Device code', 'Implicit'], 1, 'App-only tokens come from client credentials and carry application permissions in roles.'],
  h: ['Walk the checks in order: signature, issuer, audience, lifetime. Do they pass?', 'Look at which permission claim is present and which one the policy reads.', 'Authentication passes, the scope policy fails, so the answer is 403. Then say what design would let a daemon call this endpoint on purpose.'],
  a: `<p><b>Model answer.</b> "Authentication passes: issuer, audience and lifetime are all correct, so the caller is known. But this is an <b>app-only token</b>: it has a <code>roles</code> claim and no <code>scp</code>, which means some application got it with client credentials. The endpoint's policy requires the delegated scope <code>Orders.Read</code>, so authorization fails and the API returns <b>403</b>. That is the right outcome. If we do want a background job to read orders, I would define an application permission such as <code>Orders.Read.All</code> as an app role on the API, have an admin grant it to that one app, and write the policy as 'scope Orders.Read <b>or</b> app role Orders.Read.All'. I would not treat a missing scope as full access, and I would log <code>azp</code> so we can see which app is calling."</p>`,
  cx: 'recognises an app-only token from its claims and explains 403 as a correct, intended result.',
  f: ['How would you write a policy that accepts a user scope or an app role?', 'Why is it dangerous to accept any token that merely has the right audience?']
}));
practice.push(P({
  t: 'The admin page is "protected" by hiding the button', l: 'Easy', tags: ['front-end', 'authorization'],
  s: 'In a code review you see that the React app hides the "Refund order" button unless the ID token has the role <code>Admin</code>. The endpoint <code>POST /orders/{id}/refund</code> has only <code>[Authorize]</code>. The author says: "Normal users cannot see the button, so it is safe." What is your review comment?',
  ex: `<p><span class="c-r" style="overflow-wrap:anywhere;white-space:normal">curl -X POST https://api.contoso.example/orders/7/refund -H "Authorization: Bearer (any signed-in user token)"</span> → today this returns ${H.c('r', '200')}.</p>`,
  weak: 'Looks good. Maybe also add a route guard on the refunds page to be extra safe.',
  why: 'A second client-side check adds nothing. Any signed-in user can call the endpoint directly, because the server only asks for "some valid token".',
  q: ['Where must the Admin rule be enforced?', ['In the React component', 'In the route guard', 'On the API endpoint, with a role or policy check', 'In the CSS'], 2, 'Only the server is a trust boundary. The UI check is for convenience.'],
  h: ['Think about who controls the code that runs in the browser.', 'Look at what the endpoint itself requires: [Authorize] alone means any signed-in caller.', 'Ask for a policy on the endpoint, a test that a non-admin token gets 403, and keep the hidden button as UX.'],
  a: `<p><b>Model answer.</b> "The hidden button is fine as user experience, but it is not a control. The browser is under the user's control, so anyone who is signed in can send this POST with curl. The endpoint only has <code>[Authorize]</code>, which means 'any valid token'. Please add <code>[Authorize(Policy = "CanRefund")]</code>, where the policy requires the <code>Admin</code> app role from the <b>access token</b>, and add an integration test that a normal user's token receives 403. If refunds are limited per store, add a resource-based check as well. One more point: the UI reads the role from the ID token for display, which is acceptable, but the API must make its decision from the access token it validates, never from anything the client claims."</p>`,
  cx: 'states that the browser is not a trust boundary, asks for a server-side policy and a test.',
  f: ['How would you find other endpoints with the same gap?', 'What would a fallback policy have changed here?']
}));
practice.push(P({
  t: 'Works in Postman, fails from the browser', l: 'Medium', tags: ['cors', 'troubleshooting'],
  s: 'After you added a fallback authorization policy, the SPA cannot call the API: the browser console shows a CORS error. The same request with the same token works in Postman. What is happening and how do you fix it?',
  ex: `<p>Network tab: ${H.c('y', 'OPTIONS /api/v1/orders')} → ${H.c('r', '401')}, and the real ${H.c('b', 'GET')} is never sent.</p>`,
  weak: 'It is a CORS problem, so I would allow any origin, any header and any method.',
  why: 'It guesses instead of looking at the failing request, and a wide-open CORS policy is a risk of its own. The real cause is that the preflight is being asked for a token.',
  q: ['Why does the preflight request have no Authorization header?', ['The SPA forgot it', 'Browsers never send credentials or custom headers on a preflight, by design', 'Entra ID strips it', 'Axios removes it on OPTIONS'], 1, 'A preflight is the browser asking permission before sending the real request, so it carries no token.'],
  h: ['Open the network tab and look at which request fails: the GET or an OPTIONS before it.', 'Postman is not a browser, so it sends no preflight and ignores CORS.', 'Check middleware order: CORS must run before authentication and authorization, with the SPA origin and the Authorization header allowed.'],
  a: `<p><b>Model answer.</b> "Postman works, so the token and the API's validation are fine. The difference is that a browser sends a <b>preflight</b> first: an <code>OPTIONS</code> request with no <code>Authorization</code> header, because the real call is cross-origin and has a custom header. Since I added the fallback policy, that OPTIONS request reaches authorization, has no user, and gets 401. The browser then reports a CORS failure and never sends the GET. The fix is ordering and a precise policy: call <code>UseCors</code> before <code>UseAuthentication</code> and <code>UseAuthorization</code> so the CORS middleware answers the preflight itself, and configure the policy with the SPA's exact origin, the methods we use, and the <code>Authorization</code> and <code>Content-Type</code> headers. I would not use a wildcard origin. Then I would add a test that an OPTIONS request from the SPA origin returns 204 with the right headers."</p>`,
  cx: 'finds the failing request before proposing a fix, explains the preflight, and keeps the CORS policy narrow.',
  f: ['Is CORS a security control for the API?', 'What if the API sits behind a gateway that also handles CORS?']
}));
practice.push(P({
  t: 'Write the interceptor: attach, retry once, no stampede', l: 'Medium', tags: ['front-end', 'interceptor', 'code'],
  s: 'Implement an Axios setup for the Contoso Shop SPA that (1) attaches an access token to every request to your API, (2) on 401 forces one refresh and retries the request once, (3) starts only one refresh when many requests fail together, (4) never retries on 403.',
  ex: `<p>5 parallel calls with an expired token → ${H.c('r', '5 × 401')} → ${H.c('g', '1 refresh')} → ${H.c('g', '5 retries, each once')}.</p>`,
  weak: 'In the response interceptor, when I see a 401 I call acquireTokenSilent and then call the request again.',
  why: 'With no retry flag this loops forever if the second call is also 401, and with five failures it starts five refreshes at once.',
  q: ['What makes many waiting requests share one refresh?', ['A setTimeout of 1 second', 'A module-level promise that the first caller creates and the rest await', 'A global boolean and a busy loop', 'Calling the refresh five times and using the last result'], 1, 'Awaiting the same promise is the simplest correct single-flight in JavaScript.'],
  h: ['Use one Axios instance with a fixed base address, so tokens only go to your API.', 'Mark the request config (for example <code>_retried</code>) before replaying it.', 'Keep a module-level <code>refreshing</code> promise; clear it in <code>finally</code>; only handle status 401.'],
  a: `<p><b>Approach.</b> One Axios instance with a fixed base address. The <b>request</b> interceptor asks MSAL for a token and sets the Bearer header. The <b>response</b> interceptor reacts only to 401: it marks the request as retried, awaits a shared refresh promise, sets the new header and replays the request once. Any other status, including 403, is rejected to the caller. The shared promise is created by the first failure and cleared in <code>finally</code>, so later expiries start a fresh one. If the refresh needs interaction, MSAL's error triggers one redirect.</p>`,
  code: { lang: 'ts', check: false, code: `import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { msalInstance, apiRequest } from "./authConfig";

type Retriable = InternalAxiosRequestConfig & { _retried?: boolean };

export const api = axios.create({ baseURL: "https://api.contoso.example" });

async function getToken(forceRefresh: boolean): Promise<string> {
  const account = msalInstance.getActiveAccount();
  if (!account) throw new Error("Not signed in");
  try {
    return (await msalInstance.acquireTokenSilent({ ...apiRequest, account, forceRefresh })).accessToken;
  } catch (e) {
    if (e instanceof InteractionRequiredAuthError) {
      await msalInstance.acquireTokenRedirect({ ...apiRequest, account });
    }
    throw e;
  }
}

let refreshing: Promise<string> | null = null;
function refreshOnce(): Promise<string> {
  if (!refreshing) {
    refreshing = getToken(true).finally(() => { refreshing = null; });
  }
  return refreshing;
}

api.interceptors.request.use(async (config) => {
  config.headers.Authorization = "Bearer " + (await getToken(false));
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as Retriable | undefined;
    if (error.response?.status !== 401 || !original || original._retried) {
      return Promise.reject(error);                 // 403 and everything else: no retry
    }
    original._retried = true;                       // retry at most once
    original.headers.Authorization = "Bearer " + (await refreshOnce());
    return api(original);
  }
);` },
  cx: 'one instance, a retry flag, a shared promise, and a clear rule that only 401 is retried.',
  f: ['How would you unit test the single-flight behaviour?', 'What changes if two browser tabs refresh at the same time?']
}));
practice.push(P({
  t: 'Sign-in works locally and fails after deployment', l: 'Medium', tags: ['deployment', 'entra-id'],
  s: 'On your machine everything works. In the new test environment, clicking Sign in shows a Microsoft error page with code AADSTS50011. A colleague fixes that, and now sign-in succeeds but every API call returns 401. Explain both failures and how you would prevent them next time.',
  ex: `<p>Failure 1: ${H.c('r', 'AADSTS50011')} (redirect address). Failure 2: ${H.c('r', '401 invalid_token, audience')}.</p>`,
  weak: 'The environment is broken. I would redeploy and clear the browser cache.',
  why: 'Neither failure is random. Each one names a specific setting that differs between environments.',
  q: ['What does AADSTS50011 mean?', ['The password is wrong', 'The redirect address sent by the app is not registered for that app', 'The token expired', 'The API is down'], 1, 'Entra ID only redirects to addresses registered on the app, compared exactly.'],
  h: ['The first error is produced by Entra ID before any token exists. What does the app send that Entra ID compares against a list?', 'For the 401, decode the access token and compare its audience with the API setting in that environment.', 'Think about which values differ per environment: redirect address, SPA client id, API client id and scope, API audience setting.'],
  a: `<p><b>Model answer.</b> "The first failure, <b>AADSTS50011</b>, means the redirect address the SPA sent is not registered. Locally it is <code>http://localhost:5173</code>; the test site has a different host, and that exact address must be added under the <b>single-page application</b> platform of the SPA registration. The second failure is a classic mismatch between the two halves. Sign-in works, so the SPA has a token, but the API rejects it. I would decode the token and compare <code>aud</code> with the API's configured audience in the test environment. Usually the SPA build still asks for the scope of the <i>development</i> API registration while the test API expects its own client id, or the API's app setting was not set and falls back to a default. I would fix the configuration and then prevent it: per-environment settings defined in the pipeline, not in code; a start-up check that logs the tenant and audience the API expects; and a smoke test after each deployment that signs in with a test account and calls one protected endpoint."</p>`,
  cx: 'reads each error as a specific configuration difference and adds prevention, not only a fix.',
  f: ['Should each environment have its own app registrations?', 'What happens to redirect addresses when you use deployment slots?']
}));
practice.push(P({
  t: 'A valid token still gets 403 after you added a new role', l: 'Medium', tags: ['403', 'roles', 'consent'],
  s: 'You added an app role <code>OrderApprover</code> to the API registration and protected <code>POST /orders/{id}/approve</code> with <code>RequireRole("OrderApprover")</code>. A tester who "has the role" gets 403. The token validates fine. List what you check, in order.',
  ex: `<p>Decoded token: ${H.c('g', 'aud ok')}, ${H.c('g', 'scp = Orders.Read')}, ${H.c('r', 'no roles claim')}.</p>`,
  weak: 'The role check must be broken, so I would remove RequireRole and check the role in code instead.',
  why: 'The check is doing its job. The token does not contain the role, so the real question is why it is missing.',
  q: ['The roles claim is missing from a user token. Which cause is most likely?', ['The user was not assigned the app role on the enterprise application (or is using a token issued before the assignment)', 'The API clock is wrong', 'The signature is invalid', 'CORS is blocking it'], 0, 'Roles appear only when the user or one of their groups is assigned the role, and only in tokens issued after that.'],
  h: ['Decode the token first. Is the role in it?', 'If it is missing: where are users assigned to app roles, and when was this token issued?', 'If it is present: check the claim name the API reads (RoleClaimType), the exact spelling and case, and which policy the endpoint actually uses.'],
  a: `<p><b>Model answer.</b> "403 with a valid token means permissions, so I decode the token and look at <code>roles</code>. <b>If the role is missing:</b> one, was the tester actually assigned <code>OrderApprover</code> on the API's enterprise application, directly or through a group; two, is the token older than the assignment, because MSAL serves a cached token for up to an hour, so I sign out and in or force a refresh; three, is the tester in the right tenant and using the right app. <b>If the role is present:</b> four, does the API read roles from the <code>roles</code> claim, which needs <code>RoleClaimType = "roles"</code> when not using Microsoft.Identity.Web; five, does the role <i>value</i> in the registration match the string in code exactly; six, is another policy on the controller also failing, since stacked attributes must all pass. I would also log the policy name and missing requirement on 403 so the next case takes one minute."</p>`,
  cx: 'decodes first, splits into "role missing" and "role present", and knows tokens are cached.',
  f: ['How long can the old token keep being used?', 'How would you surface the reason for a 403 without leaking details to the caller?']
}));
practice.push(P({
  t: 'A Function App must call Key Vault and Azure OpenAI with no stored secret', l: 'Medium', tags: ['managed-identity', 'azure'],
  s: 'A new Azure Function summarises orders using an Azure OpenAI deployment and reads a database connection string from Key Vault. The first draft has an API key and a Key Vault client secret in app settings. Redesign it so that no secret is stored.',
  ex: `<p>Before: ${H.c('r', 'OPENAI_KEY=..., KV_CLIENT_SECRET=...')}. After: ${H.c('g', 'managed identity + role assignments')}, settings contain only endpoints.</p>`,
  weak: 'Put the keys in Key Vault and read them at start-up with the Key Vault client secret.',
  why: 'It moves the problem: you now need a secret to read the secrets. And the OpenAI API key is still a shared, long-lived credential.',
  q: ['What does a managed identity remove?', ['The need for HTTPS', 'The need to store and rotate a credential for the service', 'The need for role assignments', 'The need for an access token'], 1, 'Azure holds the credential and issues tokens to the resource. You still grant roles and tokens are still used.'],
  h: ['Give the Function App an identity of its own.', 'Each target resource decides what that identity may do through a role assignment.', 'In code use a token credential (DefaultAzureCredential or ManagedIdentityCredential) with both SDK clients; keep only endpoints in settings; disable key-based access if you can.'],
  a: `<p><b>Model answer.</b> "I turn on a <b>managed identity</b> for the Function App; user-assigned if several apps should share it or if I want it to survive re-creation. Then I grant that identity exactly two roles: <b>Key Vault Secrets User</b> on the vault, and <b>Cognitive Services OpenAI User</b> on the Azure OpenAI resource. In code both clients take a token credential instead of a key: <code>new SecretClient(vaultUri, credential)</code> and <code>new AzureOpenAIClient(endpoint, credential)</code>. App settings now hold only the two endpoints, which are not secrets. Locally the same code works because <code>DefaultAzureCredential</code> falls back to my developer sign-in, provided I have the same roles in the dev resources. To finish, I disable local (key) authentication on the OpenAI resource so that a leaked key cannot be used, and I can go further and use Key Vault references or a managed-identity connection to the database so that even the connection string contains no password."</p>`,
  cx: 'identity, least-privilege role assignments, token credential in code, and key access switched off.',
  f: ['System-assigned or user-assigned, and why?', 'How do you make this work on a developer laptop?', 'What do you see in the logs when the role assignment is missing?']
}));
practice.push(P({
  t: 'The Orders API must call the Inventory API as the user', l: 'Hard', tags: ['on-behalf-of', 'design'],
  s: 'The React SPA calls the Orders API (.NET). To show stock levels, the Orders API must call the Inventory API, which applies per-user rules (a store manager only sees their own store). A developer forwards the incoming Bearer token to Inventory and gets 401. Design the correct solution and name the three things that most often go wrong.',
  ex: `<p>Token A: ${H.c('b', 'aud = Orders API')}. Inventory expects ${H.c('g', 'aud = Inventory API')}. Forwarding A → ${H.c('r', '401 audience')}.</p>`,
  weak: 'Make the Inventory API accept the Orders API audience as well, or let the SPA send two tokens to the Orders API.',
  why: 'Accepting another API\'s audience means any client of Orders can call Inventory directly with that token. Passing extra tokens through a middle tier spreads credentials around and couples the SPA to an internal service.',
  q: ['After the on-behalf-of exchange, what is true of the new token?', ['Same audience, new user', 'Same user, new audience (the Inventory API)', 'No user, app roles only', 'It is the refresh token'], 1, 'On-behalf-of keeps the user and changes the audience and scopes.'],
  h: ['One access token has one audience. What audience does the incoming token have?', 'The middle API can swap a user token for another user token. What must it be able to prove about itself to do that?', 'List the prerequisites: confidential client credential for Orders, a delegated scope exposed by Inventory, consent for Orders to use it, and a token cache that works across instances.'],
  a: `<p><b>Model answer.</b> "Forwarding fails for a good reason: the token's audience is the Orders API, and Inventory must only accept tokens addressed to itself. The right flow is <b>on-behalf-of</b>. The Orders API, as a confidential client with a certificate or a managed-identity federated credential, posts the incoming token to Entra ID and asks for a token for <code>api://inventory/Stock.Read</code>. Entra ID returns a new token with the <b>same user</b> and the <b>Inventory audience</b>, and Inventory applies its per-user rules. In .NET I enable this with Microsoft.Identity.Web: <code>EnableTokenAcquisitionToCallDownstreamApi</code>, <code>AddDownstreamApi</code>, and a distributed token cache. The three usual failures: <b>consent</b>, shown as AADSTS65001, fixed by granting admin consent for Orders to call Inventory or listing Orders as a known client application so consent is combined; an <b>in-memory token cache</b> on a scaled-out API, which repeats the exchange on every instance; and <b>using it for app-only tokens</b>, which on-behalf-of does not support, so background jobs need client credentials instead. If Inventory did not need the user, I would simply use client credentials or a managed identity."</p>`,
  cx: 'explains why forwarding is wrong, describes the exchange, and lists realistic failure modes.',
  f: ['What happens if Inventory demands MFA and the user token was obtained without it?', 'How long is the on-behalf-of token valid, and where is it cached?', 'When would you choose client credentials here instead?']
}));
practice.push(P({
  t: 'Tenant isolation in a multi-tenant SaaS API', l: 'Hard', tags: ['multi-tenant', 'security'],
  s: 'Contoso sells its shop platform to many companies, each with its own Entra ID tenant. The API is multi-tenant. A penetration tester signs in as a user of tenant A, changes <code>?tenantId=B</code> in a request and receives tenant B\'s orders. Explain the bug and design the fix so that this class of bug cannot return.',
  ex: `<p>${H.c('r', 'GET /orders?tenantId=B')} with a token where ${H.c('g', 'tid = A')} → returned B\'s data. The API trusted the ${H.c('r', 'query string')}, not the ${H.c('g', 'token')}.</p>`,
  weak: 'Validate that the tenantId parameter is a GUID, and hide it in the UI.',
  why: 'A well-formed id is still someone else\'s id. The server must not take the tenant from anything the caller can edit.',
  q: ['Where should the tenant for a query come from?', ['A request header', 'The query string', 'The tid claim of the validated access token', 'The front-end local storage'], 2, 'Only the validated token is trustworthy. Everything else in the request is caller-controlled.'],
  h: ['Find every place the tenant is read from the request rather than from the token.', 'Make the right behaviour automatic: one component resolves the tenant, and data access cannot run without it.', 'Add defence in depth: a tenant allow-list at authentication, global query filters or row-level security in the database, and automated cross-tenant tests.'],
  a: `<p><b>Model answer.</b> "The bug is trusting a client-supplied tenant id. The fix has four layers. <b>One, identity:</b> the API validates the issuer per tenant, and in <code>OnTokenValidated</code> rejects tenants that are not onboarded customers. <b>Two, a single source of truth:</b> a scoped <code>ITenantContext</code> is filled from the validated <code>tid</code> claim and nothing else; I remove <code>tenantId</code> from every route, query and body. <b>Three, automatic filtering:</b> EF Core global query filters add <code>WHERE TenantId = @current</code> to every query, and writes stamp the tenant from the context; for stronger isolation I add SQL row-level security or a database per tenant, so that even a missed filter returns nothing. <b>Four, proof:</b> integration tests sign in as tenant A and try to read, update and delete tenant B's records by id, expecting 404; these run in the pipeline. I would also key cache entries and blob paths by tenant, since data leaks through caches as easily as through queries, and review support or admin features that legitimately cross tenants so they use a separate, audited role."</p>`,
  cx: 'names the root cause, makes isolation automatic rather than per-endpoint, and proves it with tests.',
  f: ['How do guest users affect the tid claim?', 'How would a shared cache leak data between tenants?', 'What must a support engineer do to see a customer\'s data?']
}));
practice.push(P({
  t: 'An access token was stolen through XSS', l: 'Hard', tags: ['incident', 'bff', 'xss'],
  s: 'A third-party script in the Contoso Shop SPA was compromised for two hours and read tokens from session storage. You are the tech lead. Describe what you do in the first hour, and the design changes you propose afterwards.',
  ex: `<p>Stolen: ${H.c('r', 'access tokens (valid up to about 1 hour)')} and ${H.c('r', 'refresh tokens (valid up to 24 hours)')} for every user who had the page open.</p>`,
  weak: 'Ask all users to change their passwords and move the tokens to local storage with encryption.',
  why: 'Password changes do not cancel access tokens already issued, and any storage that script can read can be read by the attacker\'s script as well.',
  q: ['Which action stops the attacker from getting new access tokens?', ['Clearing the CDN cache', 'Revoking the affected users\' sign-in sessions (refresh tokens) in Entra ID', 'Changing the API audience', 'Restarting the API'], 1, 'Revoking sessions invalidates refresh tokens. Access tokens already issued still run until they expire.'],
  h: ['Separate "stop the leak", "cut off stolen credentials", and "find out what was done".', 'Remember what revocation can and cannot do to a JWT that is already issued.', 'Afterwards: fewer scripts and a strict Content Security Policy, shorter tokens, and consider a BFF so that no token is ever readable by script.'],
  a: `<p><b>Model answer.</b> "<b>First hour.</b> Contain: remove the compromised script and deploy; from now on no new tokens leak. Cut off: revoke sign-in sessions in Entra ID for affected users, which kills the stolen refresh tokens; access tokens live up to an hour longer, so for the most sensitive endpoints I enable a temporary deny-list or require re-authentication. Investigate: using API logs keyed by <code>oid</code>, client IP and user agent, look for calls made with those identities from unfamiliar addresses during the window, and involve security and privacy colleagues for notification duties. <b>Afterwards.</b> Reduce the chance: self-host or pin third-party scripts with Subresource Integrity, and ship a strict Content Security Policy. Reduce the impact: shorten access token lifetime, narrow scopes, and require step-up sign-in for refunds. Remove the prize: move to a <b>BFF</b> so tokens stay on the server and the browser holds only an HttpOnly cookie, accepting the extra component and CSRF defences. I would be honest that XSS with a BFF can still act as the user while the page is open, so the CSP work is not optional."</p>`,
  cx: 'orders the response (contain, revoke, investigate), knows the limits of revocation, and proposes layered design changes with their costs.',
  f: ['What exactly can the attacker still do in the hour after revocation?', 'What is Subresource Integrity?', 'How would sender-constrained tokens (DPoP) have helped?']
}));
practice.push(P({
  t: 'One request in six returns 401 in production', l: 'Hard', tags: ['troubleshooting', 'scale-out', 'keys'],
  s: 'The API returns 401 only in production, and only for roughly one request in six. The same user and the same token succeed when they retry. The API runs on six instances. The log shows <code>IDX10503: Signature validation failed</code> on the failing requests. What do you check, and what is your theory?',
  ex: `<p>${H.c('g', '5 instances: 200')} · ${H.c('r', '1 instance: 401, signature key not found')}. Same token on both.</p>`,
  weak: 'The token signature is invalid, so the front end must be sending a corrupted token. I would ask the front-end team to investigate.',
  why: 'The same token succeeds on retry, so the token is fine. A failure rate of one in six with six instances points at one server.',
  q: ['The same token passes on five instances and fails on one. Where is the fault?', ['In the token', 'In the user account', 'In the state or configuration of that one instance', 'In Entra ID'], 2, 'The input is identical, so the difference must be in the instance: its key cache, settings or network.'],
  h: ['Compare the failure rate with the number of instances, and group the failing requests by instance.', 'Signature validation needs the right public key. Where does each instance get its keys, and when?', 'Check on the bad instance: authority setting, outbound access to the metadata address, age of its key cache versus the kid in the token, and whether it is an older deployment.'],
  a: `<p><b>Model answer.</b> "A token that passes on retry is a good token, and one in six with six instances says one instance is different, so first I group the 401s by instance name to confirm. The error means that instance could not find a key matching the token's <code>kid</code>. My theory: Entra ID rotated in a new signing key, five instances refreshed their key set and one could not, most likely because its outbound call to the metadata address is blocked or failing (a network rule, DNS, or an exhausted outbound port pool), or because it runs an older build pinned to a wrong authority. I would check from that instance whether it can reach the discovery address, read its start-up log for metadata retrieval errors, and compare the <code>kid</code> in a failing token with the keys it has cached. Short-term fix: restart or remove that instance. Real fix: correct the network path, and add a health check that fails when metadata cannot be fetched, so the load balancer takes such an instance out. I would also alert on 401 rate per instance, and I would never 'solve' this by pinning a key in configuration."</p>`,
  cx: 'reasons from the numbers to one instance, ties the error code to key retrieval, and adds a health check and alert.',
  f: ['How often does the handler refresh keys, and what triggers an early refresh?', 'Why is pinning the signing key a bad fix?', 'What would the same symptom with IDX10223 suggest instead?']
}));

// ---------- QUIZ ----------
quiz.push({ q: 'Which token should a .NET API accept in the <code>Authorization</code> header?', options: ['The ID token', 'The access token issued for that API', 'The refresh token', 'The authorization code'], answer: 1, explain: 'The access token is the only one addressed to the API (its <code>aud</code> is the API). The ID token is for the client and the refresh token is for the token endpoint.' });
quiz.push({ q: 'A JWT payload can be read by anyone who holds the token. Why is it still trustworthy?', options: ['It is encrypted with AES', 'Its signature proves the issuer made it and nobody changed it', 'It is stored in a cookie', 'Base64URL cannot be decoded without a key'], answer: 1, explain: 'A JWT is signed, not encrypted. Trust comes from verifying the signature with the issuer public key and then checking the claims.' });
quiz.push({ q: 'How does the API verify a token signature without calling Entra ID on each request?', options: ['It stores every issued token in a database', 'It uses public keys downloaded from the JWKS address and cached', 'It asks the browser to confirm', 'It compares the token with the previous request'], answer: 1, explain: 'The public keys are published through the discovery document. The handler caches them and picks one by the <code>kid</code> in the token header.' });
quiz.push({ q: 'What does PKCE protect against?', options: ['A stolen authorization code being exchanged for tokens by someone else', 'SQL injection', 'Expired access tokens', 'Weak passwords'], answer: 0, explain: 'The token endpoint demands the verifier whose hash was sent at the start. Someone who only intercepted the code cannot supply it.' });
quiz.push({ q: 'A nightly job with no user must call the Orders API. Which flow fits?', options: ['Authorization code + PKCE', 'Device code', 'Client credentials', 'Implicit'], answer: 2, explain: 'With no user, the app signs in as itself and receives an app-only token with a <code>roles</code> claim.' });
quiz.push({ q: 'The Orders API must call the Inventory API and keep the identity of the signed-in user. What should it do?', options: ['Forward the incoming token unchanged', 'Use the on-behalf-of flow to get a token addressed to Inventory', 'Send the user password', 'Ask the SPA for the refresh token'], answer: 1, explain: 'The incoming token has the wrong audience for Inventory. On-behalf-of swaps it for a token with the same user and the Inventory audience.' });
quiz.push({ q: 'A user was disabled at 10:00. Their access token expires at 10:45 and the API validates JWTs locally. When does the API start rejecting them?', options: ['At 10:00 exactly', 'At about 10:45, unless something extra such as a deny-list is in place', 'Never', 'After the next deployment'], answer: 1, explain: 'A JWT cannot be recalled. Disabling the user stops new tokens, but the one already issued passes validation until <code>exp</code>.' });
quiz.push({ q: 'Where does MSAL for browsers keep tokens by default?', options: ['In <code>sessionStorage</code>', 'In an HttpOnly cookie', 'On the API server', 'In the URL fragment'], answer: 0, explain: 'The default cache location is <code>sessionStorage</code>, which is cleared when the tab closes. <code>localStorage</code> and memory are options.' });
quiz.push({ q: 'Five requests receive 401 at the same time. What is the right client behaviour?', options: ['Start five refreshes and use the fastest', 'Start one refresh, let the others await it, then retry each request once', 'Sign the user out at once', 'Retry all five in a loop until they pass'], answer: 1, explain: 'Sharing one in-flight refresh (single-flight) avoids a stampede and avoids races with refresh token rotation. A retry flag prevents loops.' });
quiz.push({ q: 'What does a fallback authorization policy that requires an authenticated user give you?', options: ['Faster token validation', 'Endpoints with no authorization attribute are protected by default', 'Automatic token refresh', 'Encryption of responses'], answer: 1, explain: 'The fallback policy applies to endpoints that declare nothing, so a forgotten <code>[Authorize]</code> no longer leaves an endpoint open.' });
quiz.push({ q: 'A request carries a valid token whose <code>scp</code> is <code>Orders.Read</code>. The endpoint requires <code>Orders.Write</code>. Which status code?', options: ['401', '403', '404', '500'], answer: 1, explain: 'The caller is authenticated, so it is not 401. The permission is missing, so the answer is 403 and the client should not retry.' });
quiz.push({ q: 'The browser shows a CORS error and the network tab shows <code>OPTIONS</code> returning 401, yet Postman works. What is the most likely fix?', options: ['Turn off token validation', 'Run the CORS middleware before authentication and authorization', 'Send the ID token instead', 'Increase the token lifetime'], answer: 1, explain: 'A preflight carries no token by design. CORS middleware must answer it before the authorization step asks for a user.' });

// ---------- MODULE ----------
registerModule({
  id: 'tl05',
  title: 'Sign-In & Access Questions: OAuth 2.0, OpenID Connect & Entra ID',
  intro: `<p>Almost every full-stack tech lead interview asks some form of <b>"how does sign-in work in your app, end to end?"</b> Many strong developers struggle here, because a library such as MSAL (Microsoft Authentication Library) hides the steps. This module makes the steps visible.</p>
    <p>We follow one small example all the way through: <b>Contoso Shop</b>, a React single-page app that calls a .NET <b>Orders API</b>, which calls a downstream <b>Inventory API</b>. The identity provider is <b>Microsoft Entra ID</b> (the current name of Azure Active Directory). All ids in the examples are made-up placeholders.</p>
    <p>How to use it: read a question, <b>say your answer out loud</b>, then open the model answer. Every answer starts with one plain sentence and ends with a short version you can say in the room.</p>`,
  goals: [
    'Explain authentication vs authorization and name the four parties in a sign-in',
    'Say what the ID token, access token and refresh token are for, and read the main claims in a JWT',
    'Walk through authorization code with PKCE, client credentials and on-behalf-of, and pick the right flow for a situation',
    'Describe what a .NET API validates on every request and why it needs no session',
    'Build the front-end half: MSAL in React, an API client and an interceptor with one retry and single-flight refresh',
    'Diagnose 401 and 403 problems in order: status code, error text, token claims, configuration'
  ],
  prereqs: `<p>You should be comfortable with HTTP requests, headers and status codes, and have built a simple .NET Web API (module tl04). Basic React or Angular helps for the front-end topic. No earlier knowledge of OAuth is assumed.</p>`,
  hours: 11,
  langExplain: `<p>Back-end code is C# on .NET 10 (it works the same on .NET 8). Front-end code is TypeScript with React, plus one Angular example. The ideas (tokens, flows, validation) are the same in every language.</p>`,
  topics: topics, practice: practice, quiz: quiz, interview: interview
}); })();
