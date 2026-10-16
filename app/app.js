(function () {
  var SI = window.SEARCH_INDEX || { modules: {}, entries: [] };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s === undefined || s === null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }

  var LV = { B: { name: 'Beginner', c: 'var(--g)' }, I: { name: 'Intermediate', c: 'var(--lv-i)' }, A: { name: 'Advanced', c: 'var(--p)' }, E: { name: 'Expert', c: 'var(--r)' } };
  var TABS = [['home', '⌂', 'Home'], ['map', '◈', 'Map'], ['play', '▶', 'Play'], ['badges', '★', 'Badges'], ['me', '◉', 'Me']];
  var BIT = '<svg class="bit" viewBox="0 0 56 56" aria-hidden="true"><rect x="10" y="14" width="36" height="30" rx="9" fill="#22D3EE"/><rect x="15" y="20" width="26" height="15" rx="5" fill="#06222A"/><circle cx="22" cy="27.5" r="3.2" fill="#67E8F9"/><circle cx="34" cy="27.5" r="3.2" fill="#67E8F9"/><path d="M24 38.5q4 3 8 0" stroke="#06222A" stroke-width="2.2" fill="none" stroke-linecap="round"/><rect x="26" y="5" width="4" height="9" rx="2" fill="#22D3EE"/><circle cx="28" cy="5" r="3.5" fill="#FDE047"/><rect x="4" y="24" width="6" height="10" rx="3" fill="#0891B2"/><rect x="46" y="24" width="6" height="10" rx="3" fill="#0891B2"/></svg>';

  var play = lsGet('imastery.play', null) || Play.emptyState();
  play.settings = play.settings || { haptics: true, bit: true, motion: true };
  if (play.settings.sound === undefined) play.settings.sound = true;
  play.settings.tts = play.settings.tts || { rate: 1, voice: null, cont: true };
  Sound.enable(play.settings.sound);
  Reader.configure({ rate: play.settings.tts.rate, voice: play.settings.tts.voice, cont: play.settings.tts.cont, motion: play.settings.motion, onSave: function (t) { play.settings.tts = t; save(); } });
  var S = null;

  function done() { return lsGet('imastery.done', {}) || {}; }
  function save() { lsSet('imastery.play', play); }
  function now() { return new Date(); }
  function trackById(id) { return TRACKS.filter(function (t) { return t.id === id; })[0]; }
  function pmById(mid) { var r = null; TRACKS.forEach(function (t) { t.modules.forEach(function (pm) { if (pm.id === mid) r = { t: t, pm: pm }; }); }); return r; }
  function buzz(ms) { if (play.settings.haptics && navigator.vibrate) { try { navigator.vibrate(ms || 12); } catch (e) { } } }

  /* ---------- state refresh, rewards ---------- */
  function refresh(silent) {
    var before = S;
    var o = Play.observe(play, done(), now());
    play = o.state;
    var got = Play.claim(play, now());
    S = Play.summary(done(), play, SI, TRACKS, now());
    if (!silent && before) {
      var gained = S.xp - before.xp;
      if (gained > 0) toast('+' + gained + ' XP' + (got ? ' · quest done!' : ''));
      if (S.level.level > before.level.level) celebrate({ kick: 'Level up', title: 'Level ' + S.level.level + ' · ' + S.level.name, sub: 'Keep the streak going.' });
      S.badges.forEach(function (b, i) { if (b.earned && !before.badges[i].earned) celebrate({ kick: 'Badge unlocked', title: b.name, sub: b.how, badge: b }); });
      Object.keys(S.totals.modules).forEach(function (mid) { var a = S.totals.modules[mid], b = before.totals.modules[mid]; if (a.complete && b && !b.complete) { var x = pmById(mid); celebrate({ kick: 'Module complete', title: x ? x.pm.title : mid, sub: '+' + Play.XP.module + ' XP bonus' }); } });
    }
    play.lastLevel = S.level.level;
    save();
  }

  var toastT;
  function toast(msg) {
    Sound.play('xp');
    var t = $('#toast'); t.textContent = msg; t.hidden = false; t.classList.remove('go'); void t.offsetWidth; t.classList.add('go'); buzz(10);
    clearTimeout(toastT); toastT = setTimeout(function () { t.hidden = true; }, 1800);
  }
  var celQueue = [];
  function celebrate(c) { celQueue.push(c); if (celQueue.length === 1) showCel(); }
  function showCel() {
    var c = celQueue[0], el = $('#cel');
    if (!c) { el.hidden = true; return; }
    var badge = c.badge ? '<span class="bdg big" style="--bc:' + c.badge.color + '">' + esc(c.badge.glyph) + '</span>' : '<span class="cel-star">★</span>';
    el.innerHTML = '<div class="conf" aria-hidden="true">' + confetti() + '</div><div class="cel-card" role="dialog" aria-modal="true" aria-labelledby="celT">' + badge +
      '<span class="kick xp">' + esc(c.kick) + '</span><h2 id="celT">' + esc(c.title) + '</h2><p class="muted">' + esc(c.sub) + '</p><button class="b3 y" type="button" id="celOk">CONTINUE</button></div>';
    el.hidden = false; buzz([20, 40, 20]); Sound.play(c.badge ? 'badge' : 'level');
    $('#celOk').addEventListener('click', function () { celQueue.shift(); showCel(); });
    $('#celOk').focus();
  }
  function confetti() {
    if (!play.settings.motion) return '';
    var cols = ['#FDE047', '#22D3EE', '#C084FC', '#4ADE80', '#FB923C', '#F87171'], s = '';
    for (var i = 0; i < 26; i++) s += '<i style="left:' + Math.round(Math.random() * 100) + '%;background:' + cols[i % cols.length] + ';animation-delay:' + (Math.random() * 0.6).toFixed(2) + 's;transform:rotate(' + Math.round(Math.random() * 360) + 'deg)"></i>';
    return s;
  }

  /* ---------- shared bits ---------- */
  function hud() {
    var sync = Auth.enabled && Auth.user() ? '<span class="syncdot ' + esc(Auth.status()) + '" title="Sync"></span>' : '';
    return '<div class="hud"><span class="pill fl" title="Day streak">🔥 ' + S.streak.days + '</span><span class="pill xpv" title="Total XP">⚡ ' + S.xp.toLocaleString('en-US') + '</span><span class="pill lvp" title="Level">Lv ' + S.level.level + '</span>' + sync + '<a class="av sp" href="#me" aria-label="Profile">' + avatar() + '</a></div>';
  }
  function avatar() {
    var u = Auth.enabled ? Auth.user() : null;
    if (!u) return 'IM';
    var m = u.user_metadata || {}, pic = m.avatar_url || m.picture || '';
    return /^https:\/\/[^\s"'<>]+$/.test(pic) ? '<img src="' + esc(pic) + '" alt="" referrerpolicy="no-referrer">' : esc((u.email || '?').charAt(0).toUpperCase());
  }
  function bar(p, cls) { return '<div class="xpbar ' + (cls || '') + '"><i style="width:' + Math.round(Math.max(0, Math.min(1, p)) * 100) + '%"></i></div>'; }
  function head(title, back, read) { return '<div class="ah">' + (back ? '<a class="back" href="' + back + '" aria-label="Back">‹</a>' : '') + '<h1>' + esc(title) + '</h1>' + (read && Reader.available() ? '<button type="button" class="readbtn sp" id="readBtn" aria-label="Read this screen aloud">🔊</button>' : '') + '</div>'; }
  function wireRead(title) { var b = $('#readBtn'); if (b) b.addEventListener('click', function () { if (Reader.isOpen()) { Reader.close(); return; } Sound.play('open'); Reader.open($('#scr'), title); }); }
  function tabbar(on) { return '<nav class="tabbar" aria-label="Main">' + TABS.map(function (t) { return '<a href="#' + t[0] + '" class="' + (t[0] === on ? 'on' : '') + '"' + (t[0] === on ? ' aria-current="page"' : '') + '><b aria-hidden="true">' + t[1] + '</b>' + t[2] + '</a>'; }).join('') + '</nav>'; }
  function page(tab, body, opts) {
    opts = opts || {};
    $('#app').innerHTML = '<main class="scr' + (opts.cls ? ' ' + opts.cls : '') + '" id="scr">' + body + '</main>' + (opts.noTabs ? '' : tabbar(tab));
    $('#scr').scrollTop = 0;
  }
  function lessonHref(mid, anchor) { var x = pmById(mid); return x ? x.t.id + '.html#' + mid + (anchor || '') : '#map'; }
  function nextModule(tid) {
    var t = trackById(tid || 'dsa'), r = null;
    t.modules.forEach(function (pm) { var m = S.totals.modules[pm.id]; if (!r && m && !m.complete) r = pm; });
    return r;
  }
  function bitSays() {
    var q = S.quests.filter(function (x) { return !x.done; }).length, s = S.streak.days, nm = nextModule('dsa');
    if (!S.totals.doneItems) return 'Hi, I\'m Bit! Start with a 60-second game, then your first topic. I\'ll keep score.';
    if (!S.streak.today && s) return s + '-day streak on the line! One topic today keeps it alive.';
    if (q === 0) return 'All 3 quests done today. Legend. Anything more is bonus XP.';
    return (s ? s + ' days in a row! ' : '') + q + ' quest' + (q === 1 ? '' : 's') + ' left' + (nm ? '. Next up: <b>' + esc(nm.title) + '</b>.' : '.');
  }

  /* ---------- screens ---------- */
  function home() {
    var last = lsGet('imastery.last', null), l = S.level, h = hud();
    if (play.settings.bit) h += '<div class="row top">' + BIT + '<div class="speech">' + bitSays() + '</div></div>';
    h += '<a class="card lvcard" href="#badges"><div class="row sb"><b>Level ' + l.level + ' · ' + esc(l.name) + '</b><span class="mono xp">' + l.into + ' / ' + l.need + ' XP</span></div>' + bar(l.into / l.need) + '</a>';
    if (last && last.track && last.hash) {
      h += '<div class="card hero"><span class="kick">Resume · ' + esc(last.track) + ' / module ' + esc(last.num) + '</span><b class="ttl">' + esc(last.topicTitle || last.title) + '</b><span class="muted sm">' + esc(last.title) + '</span><a class="b3" href="' + esc(last.track) + '.html#' + esc(last.hash) + '">▶ RESUME</a></div>';
    } else {
      h += '<div class="card hero"><span class="kick">Start here</span><b class="ttl">DSA 1 · Programming Foundations</b><span class="muted sm">Or warm up with a concept game first.</span><a class="b3" href="dsa.html#dsa01">▶ START</a></div>';
    }
    h += '<div class="row sb"><b>Daily quests</b><span class="mono muted sm">' + (S.streak.freezesLeft) + ' streak freeze' + (S.streak.freezesLeft === 1 ? '' : 's') + ' left</span></div><div class="quests">' +
      S.quests.map(function (q) { return '<div class="quest' + (q.done ? ' done' : '') + '"><span class="ico" aria-hidden="true">' + q.icon + '</span><span class="tx">' + esc(q.label) + bar(q.have / q.need) + '</span><span class="rw">' + (q.done ? '✓ +' : '+') + q.xp + '</span></div>'; }).join('') + '</div>';
    var pool = Games.list.filter(function (x) { return !(play.games && play.games[x.id]) && x.id !== play.lastGame; });
    if (!pool.length) pool = Games.list.filter(function (x) { return x.id !== play.lastGame; });
    var dn = Math.floor(new Date(now().getFullYear(), now().getMonth(), now().getDate()).getTime() / 864e5), g = pool[dn % pool.length];
    h += '<a class="card gamecard" href="#game/' + g.id + '"><span class="kick xp">Today\'s game · ' + esc(g.kicker) + '</span><b class="ttl">' + esc(g.title) + '</b><span class="muted sm">' + esc(g.goal) + '</span><span class="b3 ghost">PLAY · +' + Play.XP.game + ' XP</span></a>';
    page('home', h);
  }

  function map(tid) {
    var t = trackById(tid) || trackById(play.track) || TRACKS[0];
    play.track = t.id; save();
    var h = '<div class="hud"><h1 class="hd">' + esc(t.short) + '</h1><span class="pill fl sp">🔥 ' + S.streak.days + '</span></div>';
    h += '<div class="chips" role="tablist" aria-label="Tracks">' + TRACKS.map(function (x) { var tr = S.totals.tracks[x.id]; return '<a role="tab" href="#map/' + x.id + '" class="chip' + (x.id === t.id ? ' on' : '') + '" aria-selected="' + (x.id === t.id) + '">' + esc(x.short) + (tr && tr.complete ? ' · ' + tr.complete : '') + '</a>'; }).join('') + '</div>';
    var cur = nextModule(t.id), groups = [];
    t.modules.forEach(function (pm) { var g = groups[groups.length - 1]; if (!g || g.lv !== pm.level) groups.push(g = { lv: pm.level, mods: [] }); g.mods.push(pm); });
    groups.forEach(function (g) {
      var lv = LV[g.lv], comp = g.mods.filter(function (pm) { var m = S.totals.modules[pm.id]; return m && m.complete; }).length;
      h += '<div class="lvhead" style="--lc:' + lv.c + '"><span class="kick">' + esc(lv.name) + '</span><b>Modules ' + g.mods[0].num + '–' + g.mods[g.mods.length - 1].num + '</b><span class="muted sm">' + comp + ' of ' + g.mods.length + ' complete · boss at the end</span></div><div class="path">';
      var X = [50, 26, 50, 74];
      g.mods.forEach(function (pm, i) {
        var m = S.totals.modules[pm.id], st = !m ? 'lock' : m.complete ? 'done' : (cur && cur.id === pm.id ? 'cur' : (m.done ? 'part' : 'todo'));
        var pct = m && m.total ? m.done / m.total : 0;
        h += '<a class="node ' + st + '" href="#module/' + pm.id + '" style="--x:' + X[i % 4] + '%;--p:' + Math.round(pct * 100) + '"><span class="n">' + (st === 'done' ? '✓' : pm.num) + '</span><span class="lbl">' + esc(pm.title) + '</span>' + (st === 'cur' ? '<span class="here">START</span>' : '') + '</a>';
      });
      h += '<a class="node boss" href="#arena/' + t.id + '/' + g.lv + '" style="--x:50%"><span class="n">⚔</span><span class="lbl">' + esc(lv.name) + ' boss</span></a></div>';
    });
    page('map', h);
    var c = $('.node.cur'); if (c && c.scrollIntoView) c.scrollIntoView({ block: 'center' });
  }

  function moduleView(mid) {
    var x = pmById(mid); if (!x) return map();
    var m = S.totals.modules[mid], pm = x.pm, lv = LV[pm.level], g = Games.forModule(mid);
    var h = head(x.t.short + ' · Module ' + pm.num, '#map/' + x.t.id, true);
    h += '<div class="card"><span class="kick" style="color:' + lv.c + '">' + esc(lv.name) + '</span><b class="ttl lg">' + esc(pm.title) + '</b><p class="muted sm">' + esc(pm.scope || '') + '</p>';
    if (m) h += '<div class="row sb mono sm"><span>' + m.done + ' / ' + m.total + ' done</span><span class="xp">⚡ ' + m.xp + ' XP</span></div>' + bar(m.done / m.total);
    else h += '<p class="muted sm">This module is still being written.</p>';
    h += '</div>';
    if (g) h += '<a class="card gamecard" href="#game/' + g.id + '"><span class="kick xp">Warm-up game' + (play.games && play.games[g.id] ? ' · won ✓' : '') + '</span><b class="ttl">' + esc(g.title) + '</b><span class="muted sm">' + esc(g.goal) + '</span><span class="b3 ghost">PLAY</span></a>';
    if (m) {
      h += '<div class="acts"><a class="b3" href="' + lessonHref(mid) + '">📖 LEARN</a><a class="b3 ghost" href="' + lessonHref(mid, '-quiz') + '">🎯 QUIZ</a></div>';
      if (m.practice) h += '<a class="card boss" href="' + lessonHref(mid, '-arena') + '"><div class="row sb"><span class="kick" style="color:var(--p)">Boss · practice arena</span><span aria-hidden="true">⚔</span></div><b class="ttl">' + (m.practice - m.practiceDone) + ' of ' + m.practice + ' problems left</b>' + bar((m.practice - m.practiceDone) / m.practice, 'hp') + '<span class="b3 p">ATTACK</span></a>';
    }
    page('map', h);
    wireRead(pm.title);
  }

  function arena(tid, lvKey) {
    var t = trackById(tid) || trackById(play.track) || TRACKS[0];
    var h = head('Boss fights', tid ? '#map/' + t.id : '');
    h += '<div class="chips">' + TRACKS.map(function (x) { return '<a href="#arena/' + x.id + '" class="chip' + (x.id === t.id ? ' on' : '') + '">' + esc(x.short) + '</a>'; }).join('') + '</div>';
    var rows = t.modules.filter(function (pm) { var m = S.totals.modules[pm.id]; return m && m.practice && (!lvKey || pm.level === lvKey); });
    if (lvKey) h += '<p class="muted sm">' + esc(LV[lvKey].name) + ' level: beat every module boss to clear it.</p>';
    h += rows.map(function (pm) {
      var m = S.totals.modules[pm.id], left = m.practice - m.practiceDone;
      return '<a class="probl" href="' + lessonHref(pm.id, '-arena') + '"><span class="d ' + (left ? 'h' : 'e') + '">' + (left ? left + ' HP' : 'KO') + '</span><span class="tx">' + pm.num + '. ' + esc(pm.title) + bar(left / m.practice, 'hp') + '</span><span class="st">' + (left ? 'attack ›' : '✓') + '</span></a>';
    }).join('') || '<p class="muted">No bosses here yet.</p>';
    page('play', h);
  }

  function playTab() {
    var h = '<div class="ah"><h1>Play</h1></div><p class="muted sm">' + Games.list.length + ' games that teach an idea before the lesson does. Every play is a new random puzzle. First win: +' + Play.XP.game + ' XP, later wins: +' + Play.XP.replay + ' XP.</p>';
    h += '<a class="card surprise" href="#surprise"><span class="kick xp">🎲 Surprise me</span><b class="ttl">Play a random game</b><span class="muted sm">Never the same as your last one.</span></a>';
    h += Games.list.map(function (g) { var won = play.games && play.games[g.id]; return '<a class="card gamecard" href="#game/' + g.id + '"><span class="kick xp">' + esc(g.kicker) + (won ? ' · won ×' + won.wins : '') + '</span><b class="ttl">' + esc(g.title) + '</b><span class="muted sm">' + esc(g.goal) + '</span></a>'; }).join('');
    h += '<a class="card boss" href="#arena/' + esc(play.track || 'dsa') + '"><span class="kick" style="color:var(--p)">Boss fights</span><b class="ttl">Practice arenas</b><span class="muted sm">Every solved problem is a hit on the module boss.</span></a>';
    page('play', h);
  }

  function game(gid) {
    var g = Games.get(gid); if (!g) return playTab();
    play.lastGame = g.id; save();
    var won0 = play.games && play.games[g.id] ? play.games[g.id].wins : 0;
    var h = head(g.title, '#play', true) + '<div class="row sb"><span class="kick">' + esc(g.kicker) + '</span><span class="mono muted sm" id="gWins">' + (won0 ? 'won ×' + won0 : 'new game') + '</span></div><p class="goal">' + esc(g.goal) + '</p><div class="game" id="game"></div><div id="learned" hidden></div>' +
      '<div class="acts"><button class="b3 ghost" type="button" id="newPuzzle">🎲 NEW PUZZLE</button><a class="b3 ghost" href="#surprise">🔀 ANOTHER GAME</a></div>';
    page('play', h, { noTabs: false });
    wireRead(g.title);
    $('#newPuzzle').addEventListener('click', function () { Sound.play('open'); mountGame(g); var sc = $('#scr'); if (sc) sc.scrollTop = 0; });
    mountGame(g);
  }
  function mountGame(g) {
    var won = false, box = $('#game'), l = $('#learned');
    box.innerHTML = ''; l.hidden = true; l.innerHTML = '';
    g.mount(box, {
      tick: function () { buzz(8); Sound.play('tap'); },
      miss: function () { buzz([10, 30, 10]); Sound.play('wrong'); },
      win: function () {
        Sound.play('correct');
        var xpBefore = S.xp;
        Play.winGame(play, g.id, now());
        refresh();
        if (S.xp === xpBefore) toast('Won again! Daily replay XP is used up.');
        var w = $('#gWins'); if (w) w.textContent = 'won ×' + play.games[g.id].wins;
        if (!won) {
          won = true;
          l.innerHTML = '<div class="row top">' + BIT + '<div class="speech"><b>What you just discovered:</b> ' + esc(g.learned) + '</div></div><div class="acts"><button class="b3" type="button" id="nextPuzzle">🎲 NEXT PUZZLE</button><a class="b3 g" href="' + lessonHref(g.mid) + '">📖 LEARN IT</a></div>';
          l.hidden = false;
          $('#nextPuzzle').addEventListener('click', function () { Sound.play('open'); mountGame(g); var sc = $('#scr'); if (sc) sc.scrollTop = 0; });
          setTimeout(function () { if (l.scrollIntoView) l.scrollIntoView({ behavior: play.settings.motion ? 'smooth' : 'auto', block: 'nearest' }); }, 50);
        }
      }
    });
  }

  function badgesView() {
    var e = S.badges.filter(function (b) { return b.earned; }).length, l = S.level;
    var h = '<div class="ah"><h1>Badges</h1><span class="mono muted sm sp">' + e + ' / ' + S.badges.length + '</span></div>';
    h += '<div class="card lvcard"><div class="row sb"><b>Level ' + l.level + ' · ' + esc(l.name) + '</b><span class="mono xp">' + S.xp.toLocaleString('en-US') + ' XP</span></div>' + bar(l.into / l.need) + '<span class="muted sm">' + (l.need - l.into) + ' XP to level ' + (l.level + 1) + '</span></div>';
    h += '<div class="bgrid">' + S.badges.map(function (b) { return '<div class="bg' + (b.earned ? '' : ' lock') + '"><span class="bdg" style="--bc:' + b.color + '">' + (b.earned ? esc(b.glyph) : '🔒') + '</span><b>' + esc(b.name) + '</b><span class="muted">' + (b.earned ? '✓ earned' : esc(b.how)) + '</span>' + (b.earned ? '' : bar(b.have / b.need)) + '</div>'; }).join('') + '</div>';
    page('badges', h);
  }

  function me() {
    var u = Auth.enabled ? Auth.user() : null, h = '<div class="ah"><h1>Me</h1></div>';
    var LABEL = { idle: '', syncing: 'Syncing…', pending: 'Saving…', saving: 'Saving…', synced: 'Progress synced', error: 'Not synced, will retry' };
    if (u) h += '<div class="card row"><span class="av lg">' + avatar() + '</span><div class="grow"><b class="em">' + esc(u.email || 'Signed in') + '</b><span class="mono sm sync ' + esc(Auth.status()) + '">' + esc(LABEL[Auth.status()] || '') + '</span></div></div>';
    else if (Auth.enabled) h += '<div class="card"><b class="ttl">Save your streak and XP</b><span class="muted sm">Sign in to sync progress with the website and your other devices.</span><a class="b3" href="login.html?next=index.html">SIGN IN</a></div>';
    else h += '<div class="card"><b class="ttl">Playing offline</b><span class="muted sm">Accounts are not set up in this build. Progress stays on this phone.</span></div>';
    var stats = [['⚡', S.xp.toLocaleString('en-US'), 'total XP'], ['🔥', S.streak.days, 'day streak'], ['✓', S.totals.completeModules, 'modules done']];
    h += '<div class="tiles">' + stats.map(function (s) { return '<div><b>' + s[0] + ' ' + s[1] + '</b><span>' + s[2] + '</span></div>'; }).join('') + '</div>';
    var set = [['sound', 'Sound effects'], ['haptics', 'Haptics'], ['bit', 'Show Bit, the mascot'], ['motion', 'Confetti and motion']];
    h += '<div class="list">' + set.map(function (s) { return '<label class="set" for="set-' + s[0] + '">' + s[1] + '<input type="checkbox" class="tog" id="set-' + s[0] + '" data-set="' + s[0] + '"' + (play.settings[s[0]] ? ' checked' : '') + '></label>'; }).join('') + '</div>';
    if (Reader.available()) h += '<div class="list"><div class="set">Read aloud<span class="muted">Tap 🔊 on any lesson or game</span></div><div class="set">Reading speed<span class="muted">' + (play.settings.tts.rate || 1) + '× · change it in the player</span></div></div>';
    h += '<div class="list"><div class="set">Interview Mastery v' + esc(window.IM_VERSION || '') + '<span class="muted">' + S.totals.doneItems + ' / ' + S.totals.items + ' items done</span></div>' + '<a class="set" href="privacy.html">Privacy policy<span class="muted">›</span></a>' + (u ? '<button class="set" type="button" id="signOut">Sign out</button><a class="set danger" href="#delete">Delete account<span class="muted">›</span></a>' : '') + '</div>';
    page('me', h);
    Array.prototype.forEach.call(document.querySelectorAll('[data-set]'), function (c) { c.addEventListener('change', function () { play.settings[c.dataset.set] = c.checked; save(); if (c.dataset.set === 'sound') { Sound.enable(c.checked); Sound.play('correct'); } if (c.checked && c.dataset.set === 'haptics') buzz(15); }); });
    var so = $('#signOut'); if (so) so.addEventListener('click', function () { so.disabled = true; Auth.signOut().then(function () { play = Play.emptyState(); play.settings = { haptics: true, bit: true, motion: true }; save(); location.hash = '#home'; location.reload(); }); });
  }

  function deleteView() {
    var u = Auth.enabled ? Auth.user() : null;
    if (!u) { location.replace('#me'); return; }
    var h = head('Delete account', '#me');
    h += '<div class="card danger-card"><b class="ttl">This cannot be undone</b><p class="sm">Deleting <b>' + esc(u.email || 'your account') + '</b> removes the account and all progress synced to it, on every device. XP, streak and game wins on this phone are cleared too.</p></div>';
    h += '<label class="fld" for="delConfirm"><span>Type DELETE to confirm</span><input id="delConfirm" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false"></label>';
    h += '<p class="g-msg" id="delErr" hidden></p><button class="b3 r" type="button" id="delBtn" disabled>DELETE MY ACCOUNT</button><a class="b3 ghost" href="#me">KEEP MY ACCOUNT</a>';
    page('me', h);
    var inp = $('#delConfirm'), btn = $('#delBtn'), err = $('#delErr');
    inp.addEventListener('input', function () { btn.disabled = inp.value.trim().toUpperCase() !== 'DELETE'; });
    btn.addEventListener('click', function () {
      if (btn.disabled) return;
      btn.disabled = true; btn.textContent = 'DELETING…'; err.hidden = true;
      Auth.deleteAccount().then(function () {
        play = Play.emptyState(); play.settings = { haptics: true, bit: true, motion: true, sound: true, tts: { rate: 1, voice: null, cont: true } }; save();
        page('me', head('Account deleted') + '<div class="card"><b class="ttl">Your account and its progress were deleted.</b><span class="muted sm">You can keep learning without an account, or create a new one any time.</span><a class="b3" href="#home">BACK TO HOME</a></div>');
      }, function (e) {
        btn.disabled = false; btn.textContent = 'DELETE MY ACCOUNT';
        err.textContent = (e && e.message) || 'Could not delete the account. Check your connection and try again.'; err.hidden = false;
      });
    });
  }

  /* ---------- router ---------- */
  function route() {
    Reader.close();
    var p = (location.hash || '#home').slice(1).split('/');
    if (!S) refresh(true);
    switch (p[0]) {
      case 'map': return map(p[1]);
      case 'module': return moduleView(p[1]);
      case 'arena': return arena(p[1], p[2]);
      case 'play': return playTab();
      case 'game': return game(p[1]);
      case 'surprise': { var rg = Games.random(play.lastGame); location.replace('#game/' + rg.id); return; }
      case 'badges': return badgesView();
      case 'me': return me();
      case 'delete': return deleteView();
      default: return home();
    }
  }

  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('.tabbar a,.chip,.node,a.card,.back')) Sound.play('tap'); });
  document.documentElement.classList.toggle('calm', !play.settings.motion);
  refresh(true);
  window.addEventListener('hashchange', route);
  route();
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { refresh(); var p = (location.hash || '#home').slice(1).split('/')[0]; if (p !== 'game') route(); } });
  if (Auth.enabled) {
    Auth.on(function (k) {
      if (k === 'progress') { refresh(); if ((location.hash || '#home').indexOf('#game') !== 0) route(); }
      else if ((k === 'user' || k === 'status') && /^#(me|home)?$/.test(location.hash || '#home')) route();
    });
    Auth.init();
  }
})();
