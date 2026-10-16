(function () {
  var $ = function (id) { return document.getElementById(id); };
  try { document.documentElement.setAttribute('data-theme', JSON.parse(localStorage.getItem('imastery.theme')) === 'light' ? 'light' : 'dark'); } catch (e) { document.documentElement.setAttribute('data-theme', 'dark'); }

  var params = new URLSearchParams(location.search);
  var nextRaw = params.get('next') || '';
  var next = /^[A-Za-z0-9_-]+\.html(\?[^#\s]*)?(#[^\s]*)?$/.test(nextRaw) && nextRaw.indexOf('login.html') !== 0 ? nextRaw : 'index.html';
  var here = location.href.split('?')[0].split('#')[0];
  var mode = 'in', busy = false;

  function show(el, on) { el.hidden = !on; }
  function msg(el, text) { el.textContent = text || ''; show(el, !!text); }
  function clearMsgs() { msg($('authErr'), ''); msg($('authInfo'), ''); msg($('resetErr'), ''); }
  function setBusy(b, label) {
    busy = b;
    var s = $('authSubmit');
    s.disabled = b;
    s.textContent = b ? label : (mode === 'in' ? 'Sign in' : 'Create account');
  }
  function setMode(m) {
    mode = m;
    $('tabIn').setAttribute('aria-selected', m === 'in' ? 'true' : 'false');
    $('tabUp').setAttribute('aria-selected', m === 'up' ? 'true' : 'false');
    $('authForm').setAttribute('aria-labelledby', m === 'in' ? 'tabIn' : 'tabUp');
    $('authTitle').textContent = m === 'in' ? 'Sign in' : 'Create your account';
    $('authPass').setAttribute('autocomplete', m === 'in' ? 'current-password' : 'new-password');
    show($('passHint'), m === 'up');
    show($('authForgot'), m === 'in');
    clearMsgs();
    setBusy(false);
  }
  function view() {
    var u = Auth.user();
    show($('authSigned'), !!u);
    show($('authForms'), !u);
    if (u) { $('authWho').textContent = u.email || 'your account'; $('authContinue').setAttribute('href', next); $('authTitle').textContent = 'You are signed in'; }
  }
  function goNext() {
    var done = false, go = function () { if (!done) { done = true; location.href = next; } };
    var st = Auth.status();
    if (st === 'synced' || st === 'error') return go();
    Auth.on(function (k) { if (k === 'status' && (Auth.status() === 'synced' || Auth.status() === 'error')) go(); });
    setTimeout(go, 5000);
  }
  function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  if (!Auth.enabled) {
    show($('authOff'), true);
    show($('authForms'), false);
    return;
  }

  $('tabIn').addEventListener('click', function () { setMode('in'); });
  $('tabUp').addEventListener('click', function () { setMode('up'); });
  $('authSignOut').addEventListener('click', function () { Auth.signOut().then(function () { location.href = 'login.html'; }); });

  $('authForm').addEventListener('submit', function (e) {
    e.preventDefault();
    if (busy) return;
    clearMsgs();
    var email = $('authEmail').value.trim(), pass = $('authPass').value;
    if (!validEmail(email)) { msg($('authErr'), 'Enter a valid email address.'); $('authEmail').focus(); return; }
    if (pass.length < 8) { msg($('authErr'), 'Password must be at least 8 characters.'); $('authPass').focus(); return; }
    if (mode === 'in') {
      setBusy(true, 'Signing in…');
      Auth.client.auth.signInWithPassword({ email: email, password: pass }).then(function (r) {
        if (r.error) { setBusy(false); msg($('authErr'), r.error.message); return; }
        msg($('authInfo'), 'Signed in. Syncing your progress…');
        goNext();
      }, function () { setBusy(false); msg($('authErr'), 'Could not reach the server. Check your connection and try again.'); });
    } else {
      setBusy(true, 'Creating account…');
      Auth.client.auth.signUp({ email: email, password: pass, options: { emailRedirectTo: here } }).then(function (r) {
        setBusy(false);
        if (r.error) { msg($('authErr'), r.error.message); return; }
        if (r.data && r.data.session) { msg($('authInfo'), 'Account created. Syncing your progress…'); goNext(); return; }
        setMode('in');
        msg($('authInfo'), 'Check your inbox for a confirmation link, then come back and sign in.');
      }, function () { setBusy(false); msg($('authErr'), 'Could not reach the server. Check your connection and try again.'); });
    }
  });

  $('authForgot').addEventListener('click', function () {
    clearMsgs();
    var email = $('authEmail').value.trim();
    if (!validEmail(email)) { msg($('authErr'), 'Enter your email above first, then choose “Forgot password?”.'); $('authEmail').focus(); return; }
    Auth.client.auth.resetPasswordForEmail(email, { redirectTo: here + '?reset=1' }).then(function (r) {
      if (r.error) { msg($('authErr'), r.error.message); return; }
      msg($('authInfo'), 'If an account exists for that email, a reset link is on its way.');
    }, function () { msg($('authErr'), 'Could not reach the server. Check your connection and try again.'); });
  });

  $('resetForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var pass = $('resetPass').value;
    if (pass.length < 8) { msg($('resetErr'), 'Password must be at least 8 characters.'); return; }
    Auth.client.auth.updateUser({ password: pass }).then(function (r) {
      if (r.error) { msg($('resetErr'), r.error.message); return; }
      location.href = next;
    }, function () { msg($('resetErr'), 'Could not reach the server. Check your connection and try again.'); });
  });

  Auth.on(function (k) {
    if (k === 'recovery') {
      show($('authForms'), false); show($('authSigned'), false); show($('resetForm'), true);
      $('authTitle').textContent = 'Choose a new password';
      $('authSub').textContent = 'Enter a new password for your account.';
      $('resetPass').focus();
    } else if (k === 'user' && $('resetForm').hidden) view();
  });
  setMode('in');
  Auth.init().then(function () { if ($('resetForm').hidden) view(); });
})();
