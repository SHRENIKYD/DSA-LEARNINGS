var Journey = (function () {
  function esc(s) { return String(s === undefined || s === null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function get(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
  function set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }

  var REGIONS = [
    { key: 'isle', name: 'Foundation Isle', area: 'Foundations', tracks: ['dsa', 'cs'], color: 'gold', icon: 'lighthouse', x: 130, y: 330, rx: 125, ry: 85, lx: 6, ly: 58 },
    { key: 'valley', name: 'Language Valley', area: 'Languages', tracks: ['java', 'py', 'js', 'cpp', 'sql'], color: 'green', icon: 'tree', x: 340, y: 140, rx: 115, ry: 70, lx: 38, ly: 20 },
    { key: 'peaks', name: 'Design Peaks', area: 'System design', tracks: ['lld', 'hld'], color: 'clay', icon: 'mountain', x: 565, y: 110, rx: 110, ry: 65, lx: 68, ly: 12 },
    { key: 'port', name: 'Builder Port', area: 'Engineering', tracks: ['fe', 'be'], color: 'sky', icon: 'anchor', x: 560, y: 330, rx: 120, ry: 80, lx: 70, ly: 62 },
    { key: 'obs', name: 'AI Observatory', area: 'AI', tracks: ['ai'], color: 'violet', icon: 'telescope', x: 350, y: 395, rx: 85, ry: 50, lx: 42, ly: 77 },
    { key: 'harbor', name: 'Career Harbor', area: 'Career', tracks: ['beh'], color: 'gold', icon: 'scroll', x: 100, y: 100, rx: 78, ry: 50, lx: 4, ly: 10 },
    { key: 'cloud', name: 'Cloud Citadel', area: 'Cloud & DevOps', tracks: ['devops'], color: 'sky', icon: 'cloud', x: 345, y: 272, rx: 72, ry: 42, lx: 41, ly: 50 }
  ];
  var NEW_LAND = { key: 'new', name: 'Uncharted', area: 'New lands', tracks: [], color: 'sky', icon: 'compass' };
  var ZONES = { B: 'Beginner Shore', I: 'Intermediate Forest', A: 'Advanced Peaks', E: 'Expert Summit' };
  var ZCOLOR = { B: 'green', I: 'gold', A: 'clay', E: 'violet' };
  var ROLES = [
    { id: 'backend', name: 'Backend role', tracks: ['dsa', 'sql', 'java', 'be', 'hld', 'cs'] },
    { id: 'frontend', name: 'Frontend role', tracks: ['dsa', 'js', 'fe', 'cs', 'hld'] },
    { id: 'fullstack', name: 'Full-stack role', tracks: ['dsa', 'js', 'sql', 'be', 'fe', 'hld'] },
    { id: 'ml', name: 'ML / AI role', tracks: ['dsa', 'py', 'ai', 'sql'] }
  ];
  function regionOf(tid) { for (var i = 0; i < REGIONS.length; i++) if (REGIONS[i].tracks.indexOf(tid) >= 0) return REGIONS[i]; return NEW_LAND; }

  var ICON = {
    ship: '<path d="M3 16h18l-2.5 4.5h-13z"/><path d="M12 3v13"/><path d="M12 4.5l6.5 9H12"/><path d="M12 7l-4.5 6.5H12"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
    cloud: '<path d="M7 18.5h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.2 9.8 4.4 4.4 0 0 0 7 18.5z"/><path d="M9.5 14.5h5M12 12v5"/>',
    map: '<path d="M3 6.5l6-3 6 3 6-3v14l-6 3-6-3-6 3z"/><path d="M9 3.5v14M15 6.5v14"/>',
    chest: '<path d="M4 11h16v9H4z"/><path d="M4 11V9.5a8 4.5 0 0 1 16 0V11"/><path d="M10.5 13.5h3v3h-3z"/>',
    crown: '<path d="M3.5 18.5h17"/><path d="M4.5 18.5L3 7.5l5 4 4-6.5 4 6.5 5-4-1.5 11"/>',
    key: '<circle cx="8" cy="15.5" r="4"/><path d="M11 12.5l8.5-8.5M16.5 7l3 3M14 9.5l2 2"/>',
    gate: '<path d="M4 21V10a8 8 0 0 1 16 0v11"/><path d="M3 21h18"/><path d="M9 21v-7.5a3 3 0 0 1 6 0V21"/>',
    lantern: '<path d="M9 3h6M12 3v2"/><path d="M8.5 7.5h7l2 3-1.5 9h-8l-1.5-9z"/><path d="M12 11.5v4.5"/>',
    wave: '<path d="M2 12c3-3 5-3 8 0s5 3 8 0c1.5-1.4 2.6-1.6 4-1"/><path d="M2 17c3-3 5-3 8 0s5 3 8 0c1.5-1.4 2.6-1.6 4-1"/><path d="M6 7.5c2-2 4-2 6 0"/>',
    flag: '<path d="M5 21V4h11l-2 4 2 4H5"/>',
    lighthouse: '<path d="M9.5 21l1.2-13h2.6l1.2 13z"/><path d="M7 21h10"/><path d="M9.5 8h5l-1-3.5h-3z"/><path d="M3.5 5.5l4.5 2M20.5 5.5l-4.5 2M12 1.5v2"/>',
    tree: '<path d="M12 2.5l6 8.5h-3.5l4.5 6.5H5l4.5-6.5H6z"/><path d="M12 17.5V21"/>',
    mountain: '<path d="M2 20l7-12 4 6.5 3-4.5 6 10z"/><path d="M7.5 10.5l1.5 1.5 1.5-1.5"/>',
    anchor: '<circle cx="12" cy="5" r="2"/><path d="M12 7v14"/><path d="M5 13.5a7 7 0 0 0 14 0"/><path d="M3 13.5h4M17 13.5h4M8.5 10h7"/>',
    telescope: '<path d="M3 14.5l12.5-7 2 3.8L5 18.3z"/><path d="M15.5 7.5l3-1.5 1.8 3.4-2.8 1.6"/><path d="M10.5 15.5L7.5 21M12 15l3 6"/>',
    scroll: '<path d="M7 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8"/><path d="M7 4a2 2 0 0 0-2 2v2h4"/><path d="M7 4a2 2 0 0 1 2 2v12a2 2 0 0 0 2 2"/><path d="M12 9h4.5M12 13h4.5"/>'
  };
  function icon(name, cls) { return '<svg class="ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICON[name] || ICON.compass) + '</svg>'; }

  /* ---------- progress ---------- */
  function mods() {
    var M = window.IM_MODS, out = {};
    if (M) {
      Object.keys(M).forEach(function (mid) {
        var c = M[mid], ids = [];
        for (var i = 0; i < c[0]; i++) { ids.push(mid + '-t' + i); for (var j = 0; j < (c[1][i] || 0); j++) ids.push(mid + '-t' + i + '-q' + j); }
        for (var k = 0; k < c[2]; k++) ids.push(mid + '-p' + k);
        if (c[3]) ids.push(mid + '-quiz');
        if (c[4]) ids.push(mid + '-iv');
        out[mid] = ids;
      });
      return out;
    }
    var SI = (window.SEARCH_INDEX || {}).modules || {};
    Object.keys(SI).forEach(function (mid) { out[mid] = SI[mid].items || []; });
    return out;
  }
  function kind(id) {
    if (/-t\d+$/.test(id)) return 'topic';
    if (/-t\d+-q\d+$/.test(id) || /-p\d+$/.test(id)) return 'problem';
    if (/-quiz$/.test(id)) return 'quiz';
    if (/-iv$/.test(id)) return 'iv';
    return '';
  }
  function stats(done, M) {
    done = done || get('imastery.done', {}) || {};
    M = M || mods();
    var s = { topics: 0, problems: 0, quizzes: 0, ivs: 0, places: 0, landmarks: 0, planned: 0, live: 0, shore: 0, summit: 0, region: {}, track: {}, module: {}, items: 0, done: 0 };
    REGIONS.concat([NEW_LAND]).forEach(function (r) { s.region[r.key] = { places: 0, items: 0, done: 0 }; });
    (window.TRACKS || []).forEach(function (t) {
      var r = s.region[regionOf(t.id).key], tr = { items: 0, done: 0, live: 0, complete: 0, bLive: 0, bDone: 0 };
      t.modules.forEach(function (pm) {
        s.planned++;
        var ids = M[pm.id];
        if (!ids) return;
        s.live++; tr.live++;
        var d = 0;
        ids.forEach(function (id) { if (kind(id) === 'topic') s.landmarks++; if (done[id]) { d++; var k = kind(id); if (k === 'topic') s.topics++; else if (k === 'problem') s.problems++; else if (k === 'quiz') s.quizzes++; else if (k === 'iv') s.ivs++; } });
        var full = ids.length > 0 && d === ids.length;
        s.module[pm.id] = { items: ids.length, done: d, full: full };
        tr.items += ids.length; tr.done += d; s.items += ids.length; s.done += d; r.items += ids.length; r.done += d;
        if (pm.level === 'B') { tr.bLive++; if (full) tr.bDone++; }
        if (full) { s.places++; tr.complete++; r.places++; if (pm.level === 'E') s.summit++; }
      });
      if (tr.bLive && tr.bDone === tr.bLive) s.shore++;
      s.track[t.id] = tr;
    });
    return s;
  }
  function pct(d, t) { return t ? Math.round(d / t * 100) : 0; }

  /* ---------- stamps ---------- */
  var STAMPS = [
    ['voyage', 'First voyage', 'Finish your first landmark', 'ship', 'gold', 'topics', 1],
    ['explorer', 'Explorer', 'Finish 25 landmarks', 'compass', 'sky', 'topics', 25],
    ['carto', 'Cartographer', 'Finish 100 landmarks', 'map', 'green', 'topics', 100],
    ['hunter', 'Treasure hunter', 'Solve 10 problems', 'chest', 'clay', 'problems', 10],
    ['pirate', 'Pirate king', 'Solve 100 problems', 'crown', 'gold', 'problems', 100],
    ['riddle', 'Riddle solver', 'Pass a riddle gate (quiz)', 'key', 'violet', 'quizzes', 1],
    ['gate', 'Gatekeeper', 'Pass 10 riddle gates', 'gate', 'violet', 'quizzes', 10],
    ['tavern', 'Tavern regular', 'Review 5 interview taverns', 'lantern', 'clay', 'ivs', 5],
    ['shore', 'Shore cleared', 'Clear every Beginner place in one land', 'wave', 'green', 'shore', 1],
    ['summit', 'Summit', 'Clear any Expert place', 'flag', 'violet', 'summit', 1]
  ].map(function (a) { return { key: a[0], name: a[1], how: a[2], icon: a[3], color: a[4], stat: a[5], need: a[6] }; })
    .concat(REGIONS.map(function (r) { return { key: 'r-' + r.key, name: r.name, how: 'Clear a whole place in ' + r.name, icon: r.icon, color: r.color, region: r.key, need: 1 }; }));
  function stampsOf(s) {
    return STAMPS.map(function (st) {
      var have = st.region ? s.region[st.region].places : s[st.stat];
      return { st: st, have: Math.min(have, st.need), on: have >= st.need };
    });
  }
  var uid = 0;
  function stampSvg(st, on) {
    var id = 'stp' + (++uid), name = st.name.toUpperCase(), fs = Math.min(12.5, 112 / (name.length * 0.74));
    var seed = 0; for (var i = 0; i < st.key.length; i++) seed = (seed * 31 + st.key.charCodeAt(i)) % 997;
    var rot = on ? (seed % 13) - 6 : 0;
    var h = '<svg class="stamp ' + (on ? 'on c-' + st.color : 'off') + '" viewBox="0 0 120 120" role="img" aria-label="' + esc(st.name + (on ? ' stamp, earned' : ' stamp, not earned yet')) + '"><defs>' +
      '<path id="' + id + 't" d="M20 60a40 40 0 0 1 80 0"/><path id="' + id + 'b" d="M10 60a50 50 0 0 0 100 0"/>';
    if (on) {
      h += '<filter id="' + id + 'f" x="-8%" y="-8%" width="116%" height="116%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="' + seed + '" result="n"/>' +
        '<feDisplacementMap in="SourceGraphic" in2="n" scale="2.4" xChannelSelector="R" yChannelSelector="G" result="d"/>' +
        '<feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="2" seed="' + (seed + 7) + '" result="g"/>' +
        '<feColorMatrix in="g" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -3.4 0 0 0 2.75" result="m"/><feComposite in="d" in2="m" operator="in"/></filter>';
    }
    h += '</defs><g transform="rotate(' + rot + ' 60 60)"' + (on ? ' filter="url(#' + id + 'f)"' : '') + '>' +
      '<circle class="st-fill" cx="60" cy="60" r="55"/><circle class="st-ring" cx="60" cy="60" r="56" stroke-width="3.5"/><circle class="st-ring" cx="60" cy="60" r="51" stroke-width="1"/><circle class="st-ring" cx="60" cy="60" r="31" stroke-width="2"/>' +
      '<text class="st-name" style="font-size:' + fs.toFixed(1) + 'px"><textPath href="#' + id + 't" startOffset="50%" text-anchor="middle">' + esc(name) + '</textPath></text>' +
      '<text class="st-sub"><textPath href="#' + id + 'b" startOffset="50%" text-anchor="middle">' + (on ? '★ INTERVIEW MASTERY ★' : 'NOT YET EARNED') + '</textPath></text>' +
      '<circle class="st-dot" cx="14.5" cy="60" r="2.2"/><circle class="st-dot" cx="105.5" cy="60" r="2.2"/>' +
      (on ? '<g class="st-ic" transform="translate(42 42) scale(1.5)">' + (ICON[st.icon] || '') + '</g>' : '<text class="st-q" x="60" y="61">?</text>') +
      '</g></svg>';
    return h;
  }

  /* ---------- top bar ---------- */
  function bar(opts) {
    opts = opts || {};
    var here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    var page = here === 'videos.html' ? 'videos' : here === 'passport.html' ? 'passport' : here === 'route.html' ? 'route' : here === 'index.html' || here === '' ? 'home' : 'land';
    Array.prototype.forEach.call(document.querySelectorAll('.jnav a'), function (a) {
      var on = a.getAttribute('data-page') === page;
      a.classList.toggle('on', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    var tb = document.getElementById('themeBtn');
    if (opts.theme && tb) {
      var label = function () { var d = document.documentElement.getAttribute('data-theme') !== 'light'; tb.innerHTML = d ? themeIcon('sun') : themeIcon('moon'); tb.setAttribute('aria-label', d ? 'Switch to daylight map' : 'Switch to night map'); tb.title = tb.getAttribute('aria-label'); };
      tb.addEventListener('click', function () { var t = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light'; set('imastery.theme', t); document.documentElement.setAttribute('data-theme', t); label(); });
      window.addEventListener('pageshow', label); window.addEventListener('storage', label);
      label();
    }
    var av = document.getElementById('jav');
    if (av) {
      var draw = function () {
        var u = window.Auth && Auth.enabled ? Auth.user() : null;
        av.innerHTML = u ? esc((u.email || '?').charAt(0).toUpperCase()) : icon('compass');
        av.setAttribute('aria-label', u ? 'Your passport (' + (u.email || 'signed in') + ')' : 'Your passport');
      };
      if (window.Auth && Auth.on) Auth.on(function (k) { if (k === 'user') draw(); });
      draw();
    }
  }
  function themeIcon(n) {
    return n === 'sun' ? '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'
      : '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  }

  function passportStampSvg(x) {
    var svg = stampSvg(x.st, x.on);
    return x.on ? svg : svg.replace(/<text class="st-q"[^>]*>\?<\/text>/, '<g class="st-ic" transform="translate(42 42) scale(1.5)">' + (ICON[x.st.icon] || ICON.compass) + '</g>');
  }
  function stampCollectionHtml(list) {
    var earned = list.filter(function (x) { return x.on; }), got = earned.length;
    var featured = earned.length ? earned[earned.length - 1] : list[0];
    var h = '<div class="passport-summary"><span class="kicker">Traveller’s collection</span><div class="passport-title"><h2 id="pStampsH">Your stamp passport</h2><span class="mono muted" id="pStampsN">' + got + ' of ' + list.length + ' collected</span></div>' +
      '<p class="muted">Every stamp tells a story. Explore landmarks, uncover treasures and leave your mark on the map.</p>' +
      '<div class="passport-meter" role="progressbar" aria-label="Stamp collection" aria-valuemin="0" aria-valuemax="' + list.length + '" aria-valuenow="' + got + '"><i style="width:' + pct(got, list.length) + '%"></i></div></div>';
    if (featured) {
      h += '<div class="passport-feature">' + passportStampSvg(featured) + '<div><span class="kicker">' + (got ? 'From your collection' : 'Your first adventure') + '</span><h3>' + esc(featured.st.name) + '</h3><span class="passport-status' + (got ? ' earned' : '') + '">' + (got ? '✓ Earned' : 'Next stamp to discover') + '</span><p>' + esc(featured.st.how) + '.</p></div><span class="passport-watermark" aria-hidden="true">' + icon('compass') + '</span></div>';
    }
    h += '<div class="passport-page-heading"><h3>Marks of your journey</h3><span class="mono muted">' + (got ? 'Keep exploring' : 'A blank page, a new beginning') + '</span></div><div class="pgrid" id="pStamps">';
    h += list.map(function (x) {
      var progress = Math.min(100, pct(x.have, x.st.need));
      var svg = passportStampSvg(x);
      return '<div class="pst' + (x.on ? ' on' : '') + '">' + svg + '<b>' + esc(x.st.name) + '</b><span class="passport-stamp-status">' + (x.on ? '✓ Earned' : 'Not yet earned') + '</span>' +
        '<span class="passport-condition">' + esc(x.st.how) + '</span>' + (!x.on ? '<div class="passport-stamp-meter" role="progressbar" aria-label="' + esc(x.st.name) + ' progress" aria-valuemin="0" aria-valuemax="' + x.st.need + '" aria-valuenow="' + x.have + '"><i style="width:' + progress + '%"></i></div><span class="passport-count">' + x.have + ' / ' + x.st.need + '</span>' : '') + '</div>';
    }).join('');
    return h + '</div><div class="passport-page-footer"><span>' + icon('map') + ' Interview Mastery · Traveller’s collection</span><span class="mono">01 / 01</span></div>';
  }

  /* ---------- passport page ---------- */
  function passport() {
    bar({ theme: true });
    var acct = document.getElementById('account');
    if (window.Auth) { Auth.mountAccount(acct); Auth.on(function (k) { if (k === 'progress' || k === 'user') draw(); }); }
    function draw() {
      var s = stats(), list = stampsOf(s), got = list.filter(function (x) { return x.on; }).length;
      var u = window.Auth && Auth.enabled ? Auth.user() : null;
      var who = u ? (u.email || 'Signed in') : 'Traveller';
      document.getElementById('pHead').innerHTML = '<span class="pp-av" aria-hidden="true">' + (u ? esc(who.charAt(0).toUpperCase()) : icon('compass')) + '</span>' +
        '<div class="pp-who"><span class="kicker">Traveller\'s passport</span><b>' + esc(who) + '</b><span>' + (u ? 'Your journey is synced to every device you sign in on.' : 'Progress is saved in this browser. Sign in to keep it on every device.') + '</span></div>' +
        '<div class="pp-nums"><div><b>' + got + '</b><span>stamps</span></div><div><b>' + s.places + '</b><span>places cleared</span></div><div><b>' + s.topics.toLocaleString('en-US') + '</b><span>landmarks</span></div></div>';
      document.getElementById('pCollection').innerHTML = stampCollectionHtml(list);
      document.getElementById('pLands').innerHTML = REGIONS.map(function (r) {
        var g = s.region[r.key], p = pct(g.done, g.items);
        return '<div class="pland"><span>' + icon(r.icon) + esc(r.name) + '</span><span class="jbar-p c-' + r.color + '"><i style="width:' + Math.max(p ? 3 : 0, p) + '%"></i></span><span class="mono">' + p + '%</span></div>';
      }).join('');
      var dl = document.getElementById('pDelete');
      if (dl) dl.hidden = !u;
    }
    var th = document.getElementById('pTheme');
    var syncTh = function () { th.checked = document.documentElement.getAttribute('data-theme') === 'light'; };
    th.addEventListener('change', function () { var t = th.checked ? 'light' : 'dark'; set('imastery.theme', t); document.documentElement.setAttribute('data-theme', t); var tb = document.getElementById('themeBtn'); if (tb) tb.innerHTML = themeIcon(t === 'light' ? 'moon' : 'sun'); });
    window.addEventListener('pageshow', syncTh); window.addEventListener('storage', function () { syncTh(); draw(); });
    syncTh();
    var ds = document.getElementById('pDest');
    if (window.PATHS && window.Learn) {
      ds.innerHTML = PATHS.ROUTES.map(function (r) { return '<option value="' + r.id + '">' + esc(r.name) + '</option>'; }).join('');
      ds.value = Learn.pref().id;
      ds.addEventListener('change', function () { Learn.setPref({ id: ds.value }); });
    } else {
      ds.innerHTML = ROLES.map(function (r) { return '<option value="' + r.id + '">' + esc(r.name) + '</option>'; }).join('');
      ds.value = dest().id;
      ds.addEventListener('change', function () { set('imastery.dest', ds.value); });
    }
    draw();
    if (window.Auth) Auth.init();
  }
  function dest() { var d = get('imastery.dest', 'backend'); for (var i = 0; i < ROLES.length; i++) if (ROLES[i].id === d) return ROLES[i]; return ROLES[0]; }

  /* Interactive atlas uses the same progress and track registry as the rest of the site. */
  var atlasSelection = null, atlasPaused = false;
  var ATLAS_POS = { isle: [20, 61], obs: [50, 79], port: [80, 60], peaks: [79, 23], valley: [49, 33], harbor: [18, 20], cloud: [50, 56] };
  var ATLAS_COPY = {
    isle: 'Build solid foundations in problem solving, algorithms and the core ideas behind every computer.',
    valley: 'Find your voice in code. Explore the languages that turn your ideas into working solutions.',
    peaks: 'See the bigger picture. Design clear, resilient systems, from objects to distributed architecture.',
    port: 'Turn ideas into experiences people can use, from the browser to the services behind it.',
    obs: 'Look beyond the horizon. Understand intelligent systems and learn to build alongside AI.',
    harbor: 'Bring your story into focus and prepare to communicate your strengths with confidence.',
    cloud: 'Run what you build. Automate infrastructure, ship safely and keep systems healthy at scale.'
  };
  function atlasHtml(s, current, tracks, last) {
    var chosen = REGIONS.filter(function (r) { return r.key === atlasSelection; })[0] || current || REGIONS[0];
    var route = 'M140 360 C210 365 245 465 350 466 S470 354 560 354 S620 185 553 136 S420 125 343 195 S180 65 126 118';
    var h = '<div class="atlas' + (atlasPaused ? ' is-paused' : '') + '" role="group" aria-label="Interactive learning atlas"><div class="atlas-ocean"><div class="atlas-grid" aria-hidden="true"></div>' +
      '<span class="atlas-caption">' + icon('compass') + ' THE LEARNING ARCHIPELAGO</span>' +
      '<svg class="atlas-route" viewBox="0 0 700 590" preserveAspectRatio="none" aria-hidden="true"><path d="' + route + '"/><circle class="atlas-traveler" r="4"><animateMotion dur="28s" repeatCount="indefinite" path="' + route + '"/></circle></svg>';
    h += REGIONS.map(function (r, i) {
      var pos = ATLAS_POS[r.key], g = s.region[r.key];
      return '<button type="button" class="atlas-island' + (r === chosen ? ' selected' : '') + '" data-island="' + r.key + '" aria-pressed="' + (r === chosen) + '" aria-controls="atlas-detail" style="left:' + pos[0] + '%;top:' + pos[1] + '%;--drift:' + (-i * .8) + 's">' +
        '<span class="atlas-terrain"><span class="atlas-land"></span><span class="atlas-monument">' + icon(r.icon) + '</span>' + (r === current ? '<span class="atlas-pin">You are here</span>' : '') + '</span>' +
        '<b>' + esc(r.name) + '</b><span class="atlas-sub">' + r.tracks.filter(function (t) { return tracks[t]; }).map(function (t) { return esc(tracks[t].short); }).join(' · ') + '</span><span class="atlas-pct">' + pct(g.done, g.items) + '% explored</span></button>';
    }).join('');
    h += '<div class="atlas-legend"><span>●</span> Your journey · select an island to explore</div><button class="atlas-motion" type="button" aria-pressed="' + atlasPaused + '">' + (atlasPaused ? 'Resume motion' : 'Pause motion') + '</button></div>' +
      '<aside class="atlas-detail" id="atlas-detail" aria-live="polite">' + atlasDetail(chosen, s, tracks, last) + '</aside></div>';
    return h;
  }
  function atlasDetail(r, s, tracks, last) {
    var g = s.region[r.key], p = pct(g.done, g.items), available = r.tracks.filter(function (t) { return tracks[t]; });
    var resume = last && available.indexOf(last.track) >= 0 && last.hash;
    var next = null;
    available.some(function (tid) { return tracks[tid].modules.some(function (m) { var ms = s.module[m.id]; if (ms && !ms.full) { next = { track: tid, module: m.id }; return true; } return false; }); });
    var href = resume ? last.track + '.html#' + last.hash : next ? next.track + '.html#' + next.module : available.length ? available[0] + '.html' : '#r-' + r.key;
    return '<span class="atlas-kicker">' + icon(r.icon) + esc(r.area) + '</span><h2>' + esc(r.name) + '</h2><p>' + esc(ATLAS_COPY[r.key]) + '</p>' +
      '<div class="atlas-progress" role="progressbar" aria-label="' + esc(r.name) + ' progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + p + '"><i style="width:' + p + '%"></i></div>' +
      '<div class="atlas-progress-label"><span>' + g.done + ' / ' + g.items + ' activities</span><b>' + p + '%</b></div><h3>Your expedition</h3><div class="atlas-tracks">' +
      available.map(function (tid) { var tr = s.track[tid], n = tr ? pct(tr.done, tr.items) : 0; return '<a href="' + esc(tid) + '.html"><span>' + esc(tracks[tid].title) + '</span><b>' + n + '% ↗</b></a>'; }).join('') + '</div>' +
      '<a class="atlas-cta" href="' + esc(href) + '">' + (resume ? 'Continue expedition' : p === 100 ? 'Revisit this region' : 'Begin expedition') + ' ↗</a><small>One small step. A stronger foundation.</small>';
  }
  function mountAtlas(s, tracks, last) {
    var root = document.querySelector('.atlas'); if (!root) return;
    var svg = root.querySelector('.atlas-route');
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function motion() {
      var paused = atlasPaused || reduced;
      root.classList.toggle('is-paused', paused);
      if (svg && svg.pauseAnimations) { if (paused) svg.pauseAnimations(); else svg.unpauseAnimations(); }
      var b = root.querySelector('.atlas-motion'); b.setAttribute('aria-pressed', String(paused)); b.disabled = !!reduced;
      b.textContent = reduced ? 'Reduced motion enabled' : paused ? 'Resume motion' : 'Pause motion';
    }
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-island]');
      if (b) {
        var r = REGIONS.filter(function (r) { return r.key === b.getAttribute('data-island'); })[0]; if (!r) return;
        atlasSelection = r.key;
        Array.prototype.forEach.call(root.querySelectorAll('[data-island]'), function (el) { var on = el === b; el.classList.toggle('selected', on); el.setAttribute('aria-pressed', String(on)); });
        root.querySelector('.atlas-detail').innerHTML = atlasDetail(r, s, tracks, last);
      }
      if (e.target.closest('.atlas-motion')) { atlasPaused = !atlasPaused; motion(); }
    });
    motion();
  }

  return { stampCollectionHtml: stampCollectionHtml, atlasHtml: atlasHtml, mountAtlas: mountAtlas, ICON: ICON, REGIONS: REGIONS, ZONES: ZONES, ZCOLOR: ZCOLOR, ROLES: ROLES, STAMPS: STAMPS, regionOf: regionOf, icon: icon, mods: mods, stats: stats, stampsOf: stampsOf, stampSvg: stampSvg, bar: bar, themeIcon: themeIcon, passport: passport, dest: dest, setDest: function (id) { set('imastery.dest', id); }, pct: pct, esc: esc };
})();

