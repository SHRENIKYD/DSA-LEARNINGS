(function () {
  var $ = function (id) { return document.getElementById(id); };
  try { document.documentElement.setAttribute('data-theme', JSON.parse(localStorage.getItem('imastery.theme')) === 'light' ? 'light' : 'dark'); } catch (e) { document.documentElement.setAttribute('data-theme', 'dark'); }

  var params = new URLSearchParams(location.search);
  var nextRaw = params.get('next') || '';
  var next = /^[A-Za-z0-9_-]+\.html(\?[^#\s]*)?(#[^\s]*)?$/.test(nextRaw) && nextRaw.indexOf('login.html') !== 0 ? nextRaw : 'index.html';
  var here = location.href.split('?')[0].split('#')[0];
  var oauthReturn = params.has('code');
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
  var wantDelete = params.get('delete') === '1', deleted = false;
  function showDelete() {
    var u = Auth.user();
    show($('authForms'), false); show($('authSigned'), false); show($('authDelete'), true);
    $('authTitle').textContent = 'Delete your account';
    $('authSub').textContent = 'You can always create a new account later, but your progress will not come back.';
    $('delWho').textContent = (u && u.email) || 'you are signed in to';
    $('delConfirm').focus();
  }
  function view() {
    var u = Auth.user();
    if (deleted) return;
    if (u && wantDelete) return showDelete();
    if (!u && wantDelete) { $('authTitle').textContent = 'Delete your account'; $('authSub').textContent = 'Sign in to the account you want to delete. You will confirm on the next screen.'; }
    show($('authSigned'), !!u);
    show($('authForms'), !u);
    if (u) { $('authWho').textContent = u.email || 'your account'; $('authContinue').setAttribute('href', next); $('authTitle').textContent = 'You are signed in'; }
  }
  function goNext() {
    if (wantDelete) { msg($('authInfo'), ''); return showDelete(); }
    var done = false, go = function () { if (!done) { done = true; location.href = next; } };
    var st = Auth.status();
    if (st === 'synced' || st === 'error') return go();
    Auth.on(function (k) { if (k === 'status' && (Auth.status() === 'synced' || Auth.status() === 'error')) go(); });
    setTimeout(go, 5000);
  }
  function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  if (window.IM_APP_HANDOFF) {
    show($('authForms'), false); show($('authSigned'), false); show($('authHandoff'), true);
    $('authTitle').textContent = 'Back to the app';
    $('authSub').textContent = 'Finishing your Google sign-in in Interview Mastery.';
    $('authHandoffBtn').setAttribute('href', window.IM_APP_HANDOFF);
    setTimeout(function () { location.replace(window.IM_APP_HANDOFF); }, 50);
    return;
  }

  if (!Auth.enabled) {
    show($('authOff'), true);
    show($('authForms'), false);
    return;
  }

  $('tabIn').addEventListener('click', function () { setMode('in'); });
  $('tabUp').addEventListener('click', function () { setMode('up'); });
  $('authSignOut').addEventListener('click', function () { Auth.signOut().then(function () { location.href = 'login.html'; }, function (e) { alert(e.message); }); });

  // In the mobile app Google refuses sign-in inside the app's WebView, so open it in the system browser
  // (Chrome Custom Tabs / Safari) and come back through the app's deep link.
  var C = window.Capacitor, NATIVE = !!(C && C.isNativePlatform && C.isNativePlatform());
  var APP_CALLBACK = 'io.github.shrenikyd.interviewmastery://login-callback';
  // Google returns to the public site (already an allowed redirect), which hands the code back to the app.
  var APP_RETURN = 'https://shrenikyd.github.io/DSA-LEARNINGS/login.html?app=1';
  function plugin(name) { return C && C.Plugins ? C.Plugins[name] : null; }
  function resetGoogle() { busy = false; $('authGoogle').disabled = false; $('authGoogleTx').textContent = 'Continue with Google'; }
  function offline() { resetGoogle(); msg($('authErr'), 'Could not reach the server. Check your connection and try again.'); }

  $('authGoogle').addEventListener('click', function () {
    if (busy) return;
    clearMsgs();
    busy = true; $('authGoogle').disabled = true; $('authGoogleTx').textContent = 'Opening Google…';
    if (NATIVE) {
      Auth.client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: APP_RETURN, skipBrowserRedirect: true } }).then(function (r) {
        if (r.error || !r.data || !r.data.url) { resetGoogle(); msg($('authErr'), (r.error && r.error.message) || 'Google sign-in is not available right now.'); return; }
        var B = plugin('Browser');
        if (!B) { resetGoogle(); msg($('authErr'), 'This version of the app cannot open Google sign-in. Update the app or use email.'); return; }
        B.open({ url: r.data.url });
      }, offline);
      return;
    }
    Auth.client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: here + '?next=' + encodeURIComponent(next) + (wantDelete ? '&delete=1' : '') } }).then(function (r) {
      if (r.error) { resetGoogle(); msg($('authErr'), r.error.message); }
    }, offline);
  });

  function appCallback(url) {
    if (typeof url !== 'string' || url.indexOf(APP_CALLBACK) !== 0) return;
    var B = plugin('Browser');
    if (B && B.close) { try { B.close().catch(function () { }); } catch (e) { } }
    var q = new URLSearchParams(url.split('?')[1] || ''), code = q.get('code');
    if (!code) { resetGoogle(); msg($('authErr'), 'Google sign-in failed: ' + (q.get('error_description') || 'no sign-in code came back') + '.'); return; }
    $('authGoogleTx').textContent = 'Signing in…';
    Auth.client.auth.exchangeCodeForSession(code).then(function (r) {
      if (r.error) { resetGoogle(); msg($('authErr'), r.error.message); return; }
      msg($('authInfo'), 'Signed in. Syncing your progress…');
      goNext();
    }, offline);
  }
  if (NATIVE) {
    var A = plugin('App'), B0 = plugin('Browser');
    if (A && A.addListener) A.addListener('appUrlOpen', function (ev) { appCallback(ev && ev.url); });
    if (B0 && B0.addListener) B0.addListener('browserFinished', function () { setTimeout(function () { if (busy && $('authGoogleTx').textContent === 'Opening Google…') { resetGoogle(); msg($('authInfo'), 'Google sign-in was cancelled.'); } }, 600); });
  }

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

  $('delConfirm').addEventListener('input', function () { $('delBtn').disabled = this.value.trim().toUpperCase() !== 'DELETE'; });
  $('delBtn').addEventListener('click', function () {
    var b = this;
    if (b.disabled) return;
    b.disabled = true; b.textContent = 'Deleting…'; msg($('delErr'), '');
    Auth.deleteAccount().then(function () {
      deleted = true;
      show($('authDelete'), false); show($('authDeleted'), true);
      $('authTitle').textContent = 'Account deleted'; $('authSub').textContent = 'Thanks for learning with us.';
    }, function (e) {
      b.disabled = false; b.textContent = 'Delete my account';
      msg($('delErr'), (e && e.message) || 'Could not delete the account. Check your connection and try again.');
    });
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
  if (params.get('error_description')) msg($('authErr'), 'Google sign-in failed: ' + params.get('error_description'));
  Auth.init().then(function (u) {
    if (!$('resetForm').hidden) return;
    view();
    if (u && oauthReturn) { msg($('authInfo'), 'Signed in. Syncing your progress…'); goNext(); }
  });
})();
