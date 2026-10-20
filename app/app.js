(function () {
  var SI = window.SEARCH_INDEX || { modules: {}, entries: [] };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s === undefined || s === null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }

  var LV = { B: { name: 'Beginner Shore', c: 'var(--g)' }, I: { name: 'Intermediate Forest', c: 'var(--xp)' }, A: { name: 'Advanced Peaks', c: 'var(--flame)' }, E: { name: 'Expert Summit', c: 'var(--p)' } };
  function tabIcon(d) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + d + '</svg>'; }
  var TABS = [['home', tabIcon('<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>'), 'Home'], ['map', tabIcon('<path d="M3 6.5l6-3 6 3 6-3v14l-6 3-6-3-6 3z"/><path d="M9 3.5v14M15 6.5v14"/>'), 'World'], ['play', tabIcon('<path d="M7 4.5l12 7.5-12 7.5z"/>'), 'Play'], ['badges', tabIcon('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5.5"/><path d="M12 9.2l.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z"/>'), 'Badges'], ['me', tabIcon('<rect x="5" y="3" width="14" height="18" rx="2"/><circle cx="12" cy="10" r="3"/><path d="M9 16h6"/>'), 'Me']];
  var BIT = '<svg class="bit" viewBox="0 0 56 56" aria-hidden="true"><rect x="10" y="14" width="36" height="30" rx="9" fill="#F2C14E"/><rect x="15" y="20" width="26" height="15" rx="5" fill="#12263A"/><circle cx="22" cy="27.5" r="3.2" fill="#F4EEDC"/><circle cx="34" cy="27.5" r="3.2" fill="#F4EEDC"/><path d="M24 38.5q4 3 8 0" stroke="#12263A" stroke-width="2.2" fill="none" stroke-linecap="round"/><rect x="26" y="5" width="4" height="9" rx="2" fill="#F2C14E"/><circle cx="28" cy="5" r="3.5" fill="#FF8A5B"/><rect x="4" y="24" width="6" height="10" rx="3" fill="#B8891F"/><rect x="46" y="24" width="6" height="10" rx="3" fill="#B8891F"/></svg>';

  var play = lsGet('imastery.play', null) || Play.emptyState();
  play.settings = play.settings || { haptics: true, bit: true, motion: true };
  if (play.settings.sound === undefined) play.settings.sound = true;
  play.settings.tts = play.settings.tts || { rate: 1, voice: null, cont: true };
  Sound.enable(play.settings.sound);
  Reader.configure({ rate: play.settings.tts.rate, voice: play.settings.tts.voice, cont: play.settings.tts.cont, motion: play.settings.motion, onSave: function (t) { play.settings.tts = t; save(); } });
  var S = null;

  function theme() { return lsGet('imastery.theme', null) === 'light' ? 'light' : 'dark'; }
  function setTheme(t) {
    lsSet('imastery.theme', t);
    document.documentElement.setAttribute('data-theme', t);
    var mc = $('meta[name="theme-color"]'); if (mc) mc.setAttribute('content', t === 'light' ? '#F6F1E4' : '#12263A');
  }
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
    var cols = ['#F2C14E', '#FF8A5B', '#B48CF2', '#5FB98B', '#8FC3E0', '#F4EEDC'], s = '';
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
    if (!u) return '<img src="app/icon.png" alt="Interview Mastery">';
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
    if (play.settings.motion && !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) $('#scr').classList.add('screen-enter');
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
    if (window.Learn && window.PATHS) {
      var rv = Learn.routeView(), nx = rv.next[0];
      h += '<a class="card routecard" href="#route"><span class="kick">Your route · ' + esc(Learn.LANG_NAMES[rv.pref.lang]) + ' · ' + rv.pref.hours + ' h/week</span><b class="ttl">' + esc(rv.sch.plan.route.name) + '</b>' + bar(rv.pctHours / 100) +
        '<span class="muted sm">' + rv.pctHours + '% done · ' + rv.mastered + ' of ' + rv.core + ' modules mastered · about ' + rv.weeksLeft + ' weeks left' + (nx ? '. Next: ' + esc(nx.meta.title) + '. ' + esc(nx.why) : '') + '</span><span class="b3 ghost">OPEN YOUR ROUTE PLAN</span></a>';
    }
    var nv = Object.keys(window.IM_VIDEOS || {}).length;
    if (nv) h += '<a class="card vidcard" href="videos.html"><span class="kick">Videos</span><b class="ttl">Watch topics explained</b><span class="muted sm">' + nv.toLocaleString('en-US') + ' topics have a video so far. New ones are added every day.</span><span class="b3 ghost">🎬 OPEN VIDEOS</span></a>';
    h += '<div class="journey-shortcuts"><a class="card" href="#world"><span>◈</span><b>Explore islands</b><small>Find your next lesson</small></a><a class="card" href="#passport"><span>▧</span><b>Your passport</b><small>Collect your journey</small></a><a class="card" href="#expedition"><span>☀</span><b>Daily quests</b><small>One small victory</small></a><a class="card" href="#search"><span>⌕</span><b>Search lessons</b><small>Every track, one place</small></a></div>';
    page('home', h);
  }

  function map(tid) {
    var t = trackById(tid) || trackById(play.track) || TRACKS[0];
    play.track = t.id; save();
    var h = '<div class="hud"><h1 class="hd">' + esc(t.short) + '</h1><span class="pill fl sp">🔥 ' + S.streak.days + '</span></div>';
    h += '<a class="muted sm" href="#world">‹ Back to the islands</a>';
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
      var mv = Object.keys(window.IM_VIDEOS || {}).filter(function (k) { return k.indexOf(mid + '-t') === 0; }).length;
      if (mv) h += '<a class="card vidcard" href="videos.html#' + x.t.id + '"><span class="kick">Videos</span><b class="ttl">' + mv + ' video' + (mv === 1 ? '' : 's') + ' for this module</b><span class="muted sm">They also play inside each lesson.</span></a>';
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

  function playTab(cat) {
    cat = cat && Games.cats.some(function (c) { return c[0] === cat; }) ? cat : (play.gameCat || 'all');
    play.gameCat = cat; save();
    var list = Games.inCat(cat);
    var h = '<div class="ah"><h1>Play</h1></div><p class="muted sm">' + Games.list.length + ' games that teach an idea before the lesson does. Every play is a new random puzzle. First win: +' + Play.XP.game + ' XP, later wins: +' + Play.XP.replay + ' XP.</p>';
    h += '<div class="chips" role="tablist" aria-label="Game topics">' + Games.cats.map(function (c) { var n = Games.inCat(c[0]).length; return '<a role="tab" href="#play/' + c[0] + '" class="chip' + (c[0] === cat ? ' on' : '') + '" aria-selected="' + (c[0] === cat) + '">' + esc(c[1]) + ' · ' + n + '</a>'; }).join('') + '</div>';
    h += '<a class="card surprise" href="#surprise/' + cat + '"><span class="kick xp">🎲 Surprise me</span><b class="ttl">Play a random ' + (cat === 'all' ? '' : esc(Games.cats.filter(function (c) { return c[0] === cat; })[0][1]) + ' ') + 'game</b><span class="muted sm">Never the same as your last one.</span></a>';
    h += list.map(function (g) { var won = play.games && play.games[g.id]; return '<a class="card gamecard" href="#game/' + g.id + '"><span class="kick xp">' + esc(g.kicker) + (won ? ' · won ×' + won.wins : '') + '</span><b class="ttl">' + esc(g.title) + '</b><span class="muted sm">' + esc(g.goal) + '</span></a>'; }).join('');
    h += '<a class="card boss" href="#arena/' + esc(play.track || 'dsa') + '"><span class="kick" style="color:var(--p)">Boss fights</span><b class="ttl">Practice arenas</b><span class="muted sm">Every solved problem is a hit on the module boss.</span></a>';
    page('play', h);
  }

  function game(gid) {
    var g = Games.get(gid); if (!g) return playTab();
    play.lastGame = g.id; save();
    var won0 = play.games && play.games[g.id] ? play.games[g.id].wins : 0;
    var h = head(g.title, '#play/' + (play.gameCat || 'all'), true) + '<div class="row sb"><span class="kick">' + esc(g.kicker) + '</span><span class="mono muted sm" id="gWins">' + (won0 ? 'won ×' + won0 : 'new game') + '</span></div><p class="goal">' + esc(g.goal) + '</p><div class="game" id="game"></div><div id="learned" hidden></div>' +
      '<div class="acts"><button class="b3 ghost" type="button" id="newPuzzle">🎲 NEW PUZZLE</button><a class="b3 ghost" href="#surprise/' + (play.gameCat || 'all') + '">🔀 ANOTHER GAME</a></div>';
    page('play', h, { noTabs: false });
    wireRead(g.title);
    $('#newPuzzle').addEventListener('click', function () { Sound.play('open'); mountGame(g); var sc = $('#scr'); if (sc) sc.scrollTop = 0; });
    mountGame(g);
  }
  function mountGame(g) {
    var won = false, box = $('#game'), l = $('#learned');
    box.classList.remove('game-won');
    box.innerHTML = ''; l.hidden = true; l.innerHTML = '';
    g.mount(box, {
      tick: function () { buzz(8); Sound.play('tap'); },
      miss: function () { buzz([10, 30, 10]); Sound.play('wrong'); },
      win: function () {
        if (won) return;
        Sound.play('correct');
        box.classList.add('game-won');
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
    h += '<a class="card" href="#passport"><span class="kick">Traveller’s collection</span><b class="ttl">Open your stamp passport ↗</b><span class="muted sm">A different mark for every milestone.</span></a>';
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
    h += '<div class="list"><label class="set" for="set-theme">Light theme<input type="checkbox" class="tog" id="set-theme"' + (theme() === 'light' ? ' checked' : '') + '></label>' + set.map(function (s) { return '<label class="set" for="set-' + s[0] + '">' + s[1] + '<input type="checkbox" class="tog" id="set-' + s[0] + '" data-set="' + s[0] + '"' + (play.settings[s[0]] ? ' checked' : '') + '></label>'; }).join('') + '</div>';
    if (Reader.available()) h += '<div class="list"><div class="set">Read aloud<span class="muted">Tap 🔊 on any lesson or game</span></div><div class="set">Reading speed<span class="muted">' + (play.settings.tts.rate || 1) + '× · change it in the player</span></div></div>';
    h += '<div class="list"><div class="set">Interview Mastery v' + esc(window.IM_VERSION || '') + '<span class="muted">' + S.totals.doneItems + ' / ' + S.totals.items + ' items done</span></div>' + '<a class="set" href="privacy.html">Privacy policy<span class="muted">›</span></a>' + (u ? '<button class="set" type="button" id="signOut">Sign out</button><a class="set danger" href="#delete">Delete account<span class="muted">›</span></a>' : '') + '</div>';
    h += '<div class="list"><button class="set" type="button" id="checkUpdates">Check for updates<span class="muted">↗</span></button><p class="sm muted" id="updateStatus" role="status" aria-live="polite"></p></div>';
    h += '<div class="list"><a class="set" href="#progress">Your progress ›</a><a class="set" href="#passport">Stamp passport ›</a><a class="set" href="#welcome">Meet Bit & replay the introduction ›</a></div>';
    page('me', h);
    Array.prototype.forEach.call(document.querySelectorAll('[data-set]'), function (c) { c.addEventListener('change', function () { play.settings[c.dataset.set] = c.checked; save(); if (c.dataset.set === 'motion') document.documentElement.classList.toggle('calm', !c.checked); if (c.dataset.set === 'sound') { Sound.enable(c.checked); Sound.play('correct'); } if (c.checked && c.dataset.set === 'haptics') buzz(15); }); });
    $('#set-theme').addEventListener('change', function () { setTheme(this.checked ? 'light' : 'dark'); Sound.play('tap'); });
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

  /* ---------- explorer experience ---------- */
  function world(key) {
    var J = window.Journey, last = lsGet('imastery.last', null);
    var selected = key || play.region || (last && last.track ? J.regionOf(last.track).key : 'isle');
    if (J.REGIONS.some(function (r) { return r.key === selected; })) { play.region = selected; save(); }
    var h = head('Your learning world', null, true) + '<p class="muted sm">Pick an island. Every lesson is a small step forward.</p>' + AppExperience.world(J, J.stats(done()), TRACKS, selected) +
      '<div class="acts"><a class="b3 ghost" href="#search">⌕ SEARCH LESSONS</a><a class="b3 ghost" href="#passport">▧ YOUR PASSPORT</a></div>';
    page('map', h); wireRead('Your learning world');
  }
  function passportView() {
    var J = window.Journey, stats = J.stats(done());
    page('badges', head('Your passport', '#badges', true) + '<section class="passport-book app-passport">' + J.stampCollectionHtml(J.stampsOf(stats)) + '</section>'); wireRead('Your stamp passport');
  }
  function searchView() {
    page('map', head('Search every track', '#map') + '<label class="muted sm" for="appSearch">Topic, module or interview concept</label><input class="app-search" id="appSearch" type="search" placeholder="Try binary search, Python, SQL…" maxlength="160" autocomplete="off"><div id="appSearchResults">' + AppExperience.search(SI.entries, '', TRACKS) + '</div>');
    $('#appSearch').addEventListener('input', function () { $('#appSearchResults').innerHTML = AppExperience.search(SI.entries, this.value, TRACKS); });
  }
  function expeditionView() {
    var week = AppExperience.week(Play, play.days || {}, now());
    var h = head('Today’s expedition', '#home', true) + '<div class="card"><div class="row sb"><b>🔥 ' + S.streak.days + '-day streak</b><span class="muted sm">' + S.streak.freezesLeft + ' freezes left</span></div><div class="streak-week">' +
      week.map(function (d) { return '<div' + (d.today ? ' aria-current="date"' : '') + '><small>' + esc(d.label) + '</small><span class="' + (d.active ? 'active' : '') + '" aria-label="' + d.key + (d.active ? ', activity recorded' : ', no activity') + '">' + (d.active ? '✓' : '·') + '</span></div>'; }).join('') + '</div><p class="muted sm">One small lesson or game today keeps your journey moving.</p></div>';
    h += S.quests.map(function (q) { var link = q.id === 'game' ? '#play' : q.id === 'solve' ? '#arena/' + (play.track || 'dsa') : '#map'; return '<a class="card quest-detail" href="' + link + '"><div class="row sb"><b>' + q.icon + ' ' + esc(q.label) + '</b><span class="xp mono">+' + q.xp + ' XP</span></div>' + bar(q.have / q.need) + '<span class="muted sm">' + q.have + ' / ' + q.need + (q.claimed ? ' · ✓ reward collected' : q.done ? ' · complete' : ' · keep exploring ›') + '</span></a>'; }).join('');
    page('home', h); wireRead('Today’s expedition');
  }
  function progressView() {
    page('me', head('Your journey so far', '#me') + '<div class="tiles"><div><b>⚡ ' + S.xp + '</b><span>total XP</span></div><div><b>✓ ' + S.totals.doneItems + '</b><span>activities</span></div><div><b>▶ ' + Object.keys(play.games || {}).length + '</b><span>games discovered</span></div></div>' +
      '<div class="card"><span class="kick">Your next milestone</span><b class="ttl">Level ' + (S.level.level + 1) + '</b>' + bar(S.level.into / S.level.need) + '<p class="muted sm">' + (S.level.need - S.level.into) + ' XP to go. Every bit of practice counts.</p></div><div class="list"><a class="set" href="#expedition">Daily quests & streak ›</a><a class="set" href="#badges">Achievements ›</a><a class="set" href="#passport">Stamp passport ›</a><a class="set" href="#world">Explore the world ›</a></div>');
  }
  /* The full route plan. All route, mastery and project logic lives in Learn and PATHS; this only draws it. */
  function routeScreen(restore) {
    if (!(window.Learn && window.PATHS)) return home();
    var p = Learn.pref(), v = Learn.routeView(p), R = v.sch.plan.route, sc = v.sch, D = done(), HRS = [5, 10, 20, 40];
    var LVN = { B: 'Beginner', I: 'Intermediate', A: 'Advanced', E: 'Expert' };
    function mname(id) { var m = Learn.meta(id); return m ? m.title : id; }
    function stateTag(x) {
      if (!x.st.live) return '<span class="rt-st soon">being written</span>';
      if (x.st.mastered) return '<span class="rt-st mastered">★ mastered</span>';
      if (x.st.satisfied) return '<span class="rt-st done">✓ ' + (x.st.tested && !x.st.visited ? 'tested out' : 'complete') + '</span>';
      if (x.st.pct) return '<span class="rt-st part">' + x.st.pct + '%</span>';
      return '';
    }
    var h = head('Your route', '#home');
    h += '<div class="card"><span class="kick">Overall</span><b class="ttl">' + esc(R.name) + '</b>' + bar(v.pctHours / 100) + '<span class="muted sm">' + v.pctHours + '% done · ' + v.projectsDone + ' of ' + v.projects.length + ' projects done · about ' + v.weeksLeft + ' weeks left at ' + p.hours + ' h/week</span></div>';
    h += '<fieldset class="rt-pick"><legend class="kick">Destination</legend>' + PATHS.ROUTES.map(function (r) {
      return '<label class="rt-opt' + (r.id === p.id ? ' on' : '') + '"><input type="radio" name="rtRoute" value="' + esc(r.id) + '"' + (r.id === p.id ? ' checked' : '') + '><b>' + esc(r.name) + '</b><span class="muted sm">' + esc(r.blurb) + '</span><small>' + r.langs.map(function (l) { return esc(Learn.LANG_NAMES[l]); }).join(' · ') + '</small></label>';
    }).join('') + '</fieldset>';
    h += '<div class="card"><label class="rt-field" for="rtLang"><span class="kick">Code language</span></label><select id="rtLang"' + (R.langs.length < 2 ? ' disabled' : '') + '>' + R.langs.map(function (l) { return '<option value="' + l + '"' + (l === p.lang ? ' selected' : '') + '>' + esc(Learn.LANG_NAMES[l]) + '</option>'; }).join('') + '</select>' +
      '<fieldset class="rt-hours"><legend class="kick">Hours per week</legend>' + HRS.map(function (x) { return '<label class="rt-h' + (x === p.hours ? ' on' : '') + '"><input type="radio" name="rtHours" value="' + x + '"' + (x === p.hours ? ' checked' : '') + '><span>' + x + ' h</span></label>'; }).join('') + '</fieldset></div>';
    h += '<section aria-labelledby="rtSchedH" class="card"><div class="row sb"><b id="rtSchedH" class="ttl">Schedule</b><span class="mono sm muted">' + sc.total + ' h in all</span></div><dl class="rt-sched">' +
      '<div><dt>Required modules</dt><dd>' + sc.core + ' h</dd></div><div><dt>Recommended modules</dt><dd>' + sc.rec + ' h</dd></div><div><dt>Spaced revision (' + Math.round(PATHS.REVISION * 100) + '%)</dt><dd>' + sc.revision + ' h</dd></div><div><dt>Projects</dt><dd>' + sc.projects + ' h</dd></div>' +
      '<div class="tot"><dt>Route total</dt><dd>' + sc.total + ' h</dd></div></dl><div class="rt-weeks">' + HRS.map(function (x) { return '<div' + (x === p.hours ? ' class="on"' : '') + '><b>' + sc.weeks[x] + '</b><span>weeks at ' + x + ' h</span></div>'; }).join('') + '</div>' +
      '<p class="muted sm">Optional modules and extensions add about ' + sc.extWeeks[p.hours] + ' weeks at ' + p.hours + ' h/week. Hours come from each module’s own estimate, which includes its practice. Weeks are the total divided by your weekly hours, rounded up.' +
      (v.coverage.length ? ' <b>' + v.coverage.length + ' required modules do not yet have every solution in ' + esc(Learn.LANG_NAMES[p.lang]) + '.</b>' : ' Every required module has its solutions in ' + esc(Learn.LANG_NAMES[p.lang]) + '.') + '</p></section>';
    h += '<section aria-labelledby="rtNextH"><h2 id="rtNextH" class="rt-h2">Study next</h2>' + (v.next.length ? v.next.map(function (n) {
      if (n.kind === 'project') return '<a class="card rt-next" href="#proj-' + esc(n.id) + '" data-proj-link="' + esc(n.id) + '"><span class="kick">Project · about ' + n.meta.hours + ' h</span><b class="ttl">' + esc(n.meta.title) + '</b><span class="muted sm">' + esc(n.why) + '</span></a>';
      var miss = Learn.missing(n.id, p.lang, D);
      return '<a class="card rt-next" href="' + esc(Learn.href(n.id)) + '"><span class="kick">' + esc(LVN[n.meta.level] || '') + ' · ' + n.meta.hours + ' h</span><b class="ttl">' + esc(n.meta.title) + '</b><span class="muted sm">' + esc(n.why) + '</span>' +
        (miss.length ? '<small class="rt-miss">Missing first: ' + miss.map(function (x) { return esc(mname(x)); }).join(', ') + '</small>' : '') + '</a>';
    }).join('') : '<div class="card"><span class="muted sm">Every required module and project is complete. Pick an extension below, or a new route.</span></div>') + '</section>';
    var due = Learn.due();
    if (due.length) h += '<section class="card rt-due" aria-labelledby="rtDueH"><b id="rtDueH" class="ttl">' + due.length + ' review' + (due.length === 1 ? '' : 's') + ' due today</b>' + due.slice(0, 5).map(function (r) { var m = Learn.meta(r.mod); return '<a href="' + esc(m ? m.track + '.html#' + r.id : '#route') + '">' + esc(r.title) + '</a>'; }).join('') + '</section>';
    var byStage = {};
    v.items.forEach(function (x) { (byStage[x.stage] = byStage[x.stage] || []).push(x); });
    h += '<h2 class="rt-h2">Stages</h2><p class="muted sm">Required modules make the route. A stage is complete when its required modules are mastered and its project is done.</p>';
    h += R.stages.map(function (st, si) {
      var list = byStage[si] || [], sg = v.stages[si], pr = sg.project;
      return '<section class="card rt-stage' + (sg.complete ? ' complete' : '') + '" aria-labelledby="rtS' + si + '"><div class="row sb"><b id="rtS' + si + '" class="ttl"><span class="rt-n" aria-hidden="true">' + (si + 1) + '</span>' + esc(st.name) + '</b></div>' +
        '<span class="rt-stat' + (sg.complete ? ' ok' : '') + '">' + (sg.complete ? '★ Stage complete' : sg.mastered + ' of ' + sg.required + ' required modules mastered' + (pr ? ' · project ' + (pr.done ? 'done' : 'not done yet') : '')) + '</span>' +
        '<ol class="rt-mods">' + list.map(function (x) {
          var m = x.meta, miss = Learn.missing(x.id, p.lang, D);
          return '<li class="rt-mod' + (x.st.satisfied ? ' ok' : '') + '"><a href="' + esc(Learn.href(x.id)) + '"><b>' + esc(m ? m.title : x.id) + '</b><span class="muted sm">' + esc(m ? (LVN[m.level] || '') + ' · ' + m.hours + ' h' : '') + '</span></a><span class="rt-kind k-' + x.kind + '">' + (x.kind === 'core' ? 'required' : x.kind === 'rec' ? 'recommended' : 'optional') + '</span>' + stateTag(x) +
            (miss.length && !x.st.satisfied ? '<small class="rt-miss">Needs first: ' + miss.map(function (y) { return '<a href="' + esc(Learn.href(y)) + '">' + esc(mname(y)) + '</a>'; }).join(', ') + '</small>' : '') + '</li>';
        }).join('') + '</ol>' +
        (st.behavioral ? '<p class="sm"><b>Behavioural prep here:</b> ' + st.behavioral.map(function (b) { return '<a class="rt-lnk" href="' + esc(Learn.href(b)) + '">' + esc(mname(b)) + '</a>'; }).join(', ') + '</p>' : '') +
        (pr ? '<div class="rt-proj' + (pr.done ? ' done' : '') + '" id="proj-' + esc(pr.id) + '" tabindex="-1"><span class="kick">Project · about ' + pr.project.hours + ' h' + (pr.done ? ' · done' : '') + '</span><b>' + esc(pr.project.name) + '</b><p class="sm">' + esc(pr.project.brief) + '</p>' +
          '<fieldset class="rt-chk"><legend>Done when every criterion is ticked (' + pr.ticked + ' of ' + pr.total + ')</legend>' + pr.project.rubric.map(function (c, i) { return '<label><input type="checkbox" data-proj="' + esc(pr.id) + '" data-i="' + i + '"' + (pr.ticks[i] ? ' checked' : '') + '><span>' + esc(c) + '</span></label>'; }).join('') + '</fieldset></div>' : '') + '</section>';
    }).join('');
    h += '<section aria-labelledby="rtExtH"><h2 id="rtExtH" class="rt-h2">Extensions after the route</h2><div class="rt-ext">' + sc.plan.extensions.map(function (id) { var st = Learn.status(id, D), m = Learn.meta(id); return '<a class="rt-x' + (st.satisfied ? ' ok' : '') + '" href="' + esc(Learn.href(id)) + '">' + esc(mname(id)) + '<small>' + (m ? m.hours + ' h' : '') + (st.satisfied ? ' · done' : '') + '</small></a>'; }).join('') + '</div></section>';
    var keep = restore && restore.top;
    page('home', h, { cls: 'rt-scr' });
    var scr = $('#scr');
    if (keep) scr.scrollTop = keep;
    if (restore && restore.focus) { var f = scr.querySelector(restore.focus); if (f) f.focus(); }
    function again(focus) { routeScreen({ top: scr.scrollTop, focus: focus }); }
    scr.addEventListener('change', function (e) {
      var t = e.target;
      if (t.name === 'rtRoute') { Learn.setPref({ id: t.value }); again('input[name="rtRoute"][value="' + t.value + '"]'); }
      else if (t.name === 'rtHours') { Learn.setPref({ hours: +t.value }); again('input[name="rtHours"][value="' + t.value + '"]'); }
      else if (t.id === 'rtLang') { Learn.setPref({ lang: t.value }); again('#rtLang'); }
      else if (t.getAttribute && t.getAttribute('data-proj')) {
        var pid = t.getAttribute('data-proj'), i = t.getAttribute('data-i');
        Learn.setCriterion(pid, +i, t.checked);
        again('input[data-proj="' + pid + '"][data-i="' + i + '"]');
      }
    });
    scr.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('[data-proj-link]');
      if (!a) return;
      e.preventDefault();
      var box = $('#proj-' + a.getAttribute('data-proj-link'));
      if (box) { box.scrollIntoView({ block: 'start' }); box.focus(); }
    });
  }
  function welcomeView() {
    page('home', '<div class="welcome"><img class="welcome-icon" src="app/icon.png" alt="Interview Mastery"><span class="kick">A little curiosity. A world of possibility.</span><h1>Learn it.<br>Play it.<br>Make it yours.</h1><p class="muted">Explore ' + TRACKS.length + ' tracks and ' + Games.list.length + ' concept games. Understand an idea, try it yourself, then collect the marks of your journey.</p>' + BIT + '<p class="speech">I’m Bit. Let’s turn one small step into a habit.</p><button class="b3" id="beginJourney">LET’S EXPLORE ↗</button><a class="b3 ghost" href="login.html?next=index.html">SIGN IN TO SYNC PROGRESS</a><p class="muted sm">You can start without an account. Your progress stays on this device until you sign in.</p></div>', { noTabs: true });
    $('#beginJourney').addEventListener('click', function () { lsSet('imastery.welcomed', true); Sound.play('open'); location.hash = '#home'; });
  }

  /* ---------- router ---------- */
  function route() {
    Reader.close();
    var p = (location.hash || '#home').slice(1).split('/');
    if ((p[0] === 'home' || !p[0]) && !lsGet('imastery.welcomed', false) && !(S && S.totals && S.totals.doneItems) && !Object.keys(play.games || {}).length) return welcomeView();
    if (!S) refresh(true);
    switch (p[0]) {
      case 'map': return p[1] ? map(p[1]) : world();
      case 'world': return world(p[1]);
      case 'passport': return passportView();
      case 'search': return searchView();
      case 'expedition': return expeditionView();
      case 'progress': return progressView();
      case 'route': return routeScreen();
      case 'welcome': return welcomeView();
      case 'module': return moduleView(p[1]);
      case 'arena': return arena(p[1], p[2]);
      case 'play': return playTab(p[1]);
      case 'game': return game(p[1]);
      case 'surprise': { var rg = Games.random(play.lastGame, p[1]); location.replace('#game/' + rg.id); return; }
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
  setTheme(theme());
  if (window.AppUpdates) AppUpdates.init();
  window.addEventListener('pageshow', function () { setTheme(theme()); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { setTheme(theme()); refresh(); var p = (location.hash || '#home').slice(1).split('/')[0]; if (p !== 'game') route(); } });
  if (Auth.enabled) {
    Auth.on(function (k) {
      if (k === 'progress') { refresh(); if ((location.hash || '#home').indexOf('#game') !== 0) route(); }
      else if ((k === 'user' || k === 'status') && /^#(me|home)?$/.test(location.hash || '#home')) route();
    });
    Auth.init();
  }
})();

