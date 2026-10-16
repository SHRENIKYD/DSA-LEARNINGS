var Play = (function () {
  var XP = { topic: 10, guided: 20, practice: { E: 15, M: 25, H: 40 }, quiz: 30, iv: 15, module: 100, game: 25, replay: 5, replaysPerDay: 10 };
  var NAMES = ['Loop Learner', 'Big-O Spotter', 'Pointer Pro', 'Hash Hunter', 'Tree Climber', 'Graph Explorer', 'DP Wizard', 'Interview Ready'];
  var QUESTS = [
    { id: 'topic', icon: '📖', label: 'Finish 1 topic', need: 1, xp: 20 },
    { id: 'solve', icon: '🧩', label: 'Solve 2 problems', need: 2, xp: 40 },
    { id: 'game', icon: '🎯', label: 'Win 1 concept game', need: 1, xp: 25 }
  ];

  function kind(id) {
    if (/-t\d+-q\d+$/.test(id)) return 'guided';
    if (/-t\d+$/.test(id)) return 'topic';
    if (/-p\d+$/.test(id)) return 'practice';
    if (/-quiz$/.test(id)) return 'quiz';
    if (/-iv$/.test(id)) return 'iv';
    return '';
  }
  function moduleOf(id) { var m = /^([a-z]+\d+)-/.exec(id); return m ? m[1] : ''; }
  function itemXP(id, pl) {
    var k = kind(id);
    if (k === 'practice') { var ix = +/-p(\d+)$/.exec(id)[1]; return XP.practice[(pl || '').charAt(ix)] || XP.practice.M; }
    return XP[k] || 0;
  }

  function totals(done, SI, TRACKS) {
    done = done || {};
    var res = { xp: 0, items: 0, doneItems: 0, modules: {}, tracks: {}, completeModules: 0 };
    TRACKS.forEach(function (t) {
      var tr = { id: t.id, total: 0, done: 0, xp: 0, complete: 0, live: 0 };
      t.modules.forEach(function (pm) {
        var mi = SI.modules[pm.id];
        if (!mi) return;
        tr.live++;
        var m = { id: pm.id, track: t.id, total: mi.items.length, done: 0, xp: 0, practice: 0, practiceDone: 0, complete: false };
        mi.items.forEach(function (id) {
          var isP = kind(id) === 'practice';
          if (isP) m.practice++;
          if (done[id]) { m.done++; m.xp += itemXP(id, mi.pl); if (isP) m.practiceDone++; }
        });
        m.complete = m.total > 0 && m.done === m.total;
        if (m.complete) { m.xp += XP.module; tr.complete++; res.completeModules++; }
        res.modules[pm.id] = m;
        tr.total += m.total; tr.done += m.done; tr.xp += m.xp;
      });
      res.tracks[t.id] = tr;
      res.xp += tr.xp; res.items += tr.total; res.doneItems += tr.done;
    });
    return res;
  }

  function levelOf(xp) {
    var level = 1, floor = 0;
    while (xp >= floor + need(level)) { floor += need(level); level++; }
    return { level: level, into: xp - floor, need: need(level), name: NAMES[Math.min(NAMES.length - 1, Math.floor((level - 1) / 3))] };
  }
  function need(level) { return 100 + 50 * level; }

  function dayKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function addDays(d, n) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; }
  function active(day) { return !!day && ((day.t || 0) + (day.q || 0) + (day.g || 0) + (day.x || 0)) > 0; }

  function streak(days, now) {
    days = days || {};
    var d = active(days[dayKey(now)]) ? now : addDays(now, -1), count = 0, freezesUsed = {};
    for (var i = 0; i < 4000; i++) {
      var k = dayKey(d);
      if (active(days[k])) count++;
      else {
        var month = k.slice(0, 7);
        if (count > 0 && (freezesUsed[month] || 0) < 2 && active(days[dayKey(addDays(d, -1))])) freezesUsed[month] = (freezesUsed[month] || 0) + 1;
        else break;
      }
      d = addDays(d, -1);
    }
    var thisMonth = dayKey(now).slice(0, 7);
    return { days: count, today: active(days[dayKey(now)]), freezesLeft: 2 - (freezesUsed[thisMonth] || 0) };
  }

  function quests(state, now) {
    var k = dayKey(now), day = (state.days || {})[k] || {}, claimed = ((state.claimed || {})[k]) || {};
    return QUESTS.map(function (q) {
      var have = q.id === 'topic' ? (day.t || 0) : q.id === 'solve' ? (day.q || 0) : (day.g || 0);
      return { id: q.id, icon: q.icon, label: q.label, need: q.need, xp: q.xp, have: Math.min(have, q.need), done: have >= q.need, claimed: !!claimed[q.id] };
    });
  }

  function emptyState() { return { v: 1, seen: null, days: {}, claimed: {}, bonus: 0, games: {} }; }

  // Diff the done map against what play mode has already seen; credit new ticks to today.
  function observe(state, done, now) {
    state = state || emptyState();
    var fresh = [];
    if (!state.seen) { state.seen = {}; Object.keys(done || {}).forEach(function (id) { if (done[id]) state.seen[id] = 1; }); return { state: state, fresh: fresh }; }
    var k = dayKey(now), day = state.days[k] || (state.days[k] = {});
    Object.keys(done || {}).forEach(function (id) {
      if (!done[id] || state.seen[id]) return;
      state.seen[id] = 1;
      var kd = kind(id);
      if (kd === 'topic') day.t = (day.t || 0) + 1;
      else if (kd === 'guided' || kd === 'practice') day.q = (day.q || 0) + 1;
      else if (kd) day.x = (day.x || 0) + 1;
      if (kd) fresh.push(id);
    });
    Object.keys(state.seen).forEach(function (id) { if (!(done || {})[id]) delete state.seen[id]; });
    return { state: state, fresh: fresh };
  }

  function claim(state, now) {
    var k = dayKey(now), got = 0;
    state.claimed = state.claimed || {};
    var c = state.claimed[k] || (state.claimed[k] = {});
    quests(state, now).forEach(function (q) { if (q.done && !c[q.id]) { c[q.id] = 1; state.bonus = (state.bonus || 0) + q.xp; got += q.xp; } });
    return got;
  }

  function winGame(state, gid, now) {
    state.games = state.games || {};
    var g = state.games[gid] || (state.games[gid] = { wins: 0 });
    var first = g.wins === 0;
    g.wins++;
    var k = dayKey(now), day = state.days[k] || (state.days[k] = {});
    day.g = (day.g || 0) + 1;
    var xp = first ? XP.game : ((day.r || 0) < XP.replaysPerDay ? XP.replay : 0);
    if (!first && xp) day.r = (day.r || 0) + 1;
    state.bonus = (state.bonus || 0) + xp;
    return xp;
  }

  var BADGES = [
    { id: 'first', name: 'First Steps', fam: 'start', glyph: 'O(1)', color: '#4ADE80', test: function (c) { return [Math.min(c.t.doneItems, 1), 1]; }, how: 'Tick your first topic' },
    { id: 'dsa02', name: 'Big-O Detective', fam: 'skill', glyph: 'log', color: '#22D3EE', test: mod('dsa02'), how: 'Finish DSA Module 2: Complexity' },
    { id: 'dsa06', name: 'Two-Pointer Tamer', fam: 'skill', glyph: '↔', color: '#FBBF24', test: mod('dsa06'), how: 'Finish DSA Module 6: Two Pointers' },
    { id: 'dsa08', name: 'Hash Map Hero', fam: 'skill', glyph: '#', color: '#F472B6', test: mod('dsa08'), how: 'Finish DSA Module 8: Hashing' },
    { id: 'dsa10', name: 'Binary Search Ninja', fam: 'skill', glyph: '½', color: '#60A5FA', test: mod('dsa10'), how: 'Finish DSA Module 10: Binary Search' },
    { id: 'dsa17', name: 'DP Wizard', fam: 'skill', glyph: 'dp', color: '#C084FC', test: mod('dsa17'), how: 'Finish DSA Module 17: Dynamic Programming I' },
    { id: 'dsa19', name: 'Graph Explorer', fam: 'skill', glyph: 'G', color: '#34D399', test: mod('dsa19'), how: 'Finish DSA Module 19: Graphs I' },
    { id: 'st7', name: '7-Day Streak', fam: 'streak', glyph: '7', color: '#FB923C', test: function (c) { return [Math.min(c.s.days, 7), 7]; }, how: 'Learn 7 days in a row' },
    { id: 'st30', name: '30-Day Streak', fam: 'streak', glyph: '30', color: '#FB923C', test: function (c) { return [Math.min(c.s.days, 30), 30]; }, how: 'Learn 30 days in a row' },
    { id: 'games3', name: 'Game On', fam: 'style', glyph: '▶', color: '#E95420', test: function (c) { return [Math.min(Object.keys(c.g || {}).length, 3), 3]; }, how: 'Win 3 different concept games' },
    { id: 'games20', name: 'Game Master', fam: 'style', glyph: '🎮', color: '#A3E635', test: function (c) { return [Math.min(Object.keys(c.g || {}).length, 20), 20]; }, how: 'Win 20 different concept games' },
    { id: 'wins25', name: 'Puzzle Addict', fam: 'style', glyph: '25', color: '#F472B6', test: function (c) { var n = 0; Object.keys(c.g || {}).forEach(function (k) { n += c.g[k].wins || 0; }); return [Math.min(n, 25), 25]; }, how: 'Win 25 puzzles' },
    { id: 'lv5', name: 'Level 5', fam: 'level', glyph: '5', color: '#FDE047', test: function (c) { return [Math.min(c.l.level, 5), 5]; }, how: 'Reach level 5' },
    { id: 'sql', name: 'Query Whisperer', fam: 'track', glyph: 'SQL', color: '#60A5FA', test: trk('sql'), how: 'Finish every SQL module' },
    { id: 'dsa', name: 'DSA Master', fam: 'track', glyph: 'DSA', color: '#22D3EE', test: trk('dsa'), how: 'Finish every DSA module' }
  ];
  function mod(mid) { return function (c) { var m = c.t.modules[mid]; return m ? [m.done, m.total] : [0, 1]; }; }
  function trk(tid) { return function (c) { var t = c.t.tracks[tid]; return t && t.live ? [t.complete, t.live] : [0, 1]; }; }
  function badges(t, s, l, games) {
    var c = { t: t, s: s, l: l, g: games };
    return BADGES.map(function (b) { var r = b.test(c); return { id: b.id, name: b.name, glyph: b.glyph, color: b.color, how: b.how, have: r[0], need: r[1], earned: r[1] > 0 && r[0] >= r[1] }; });
  }

  function summary(done, state, SI, TRACKS, now) {
    var t = totals(done, SI, TRACKS), xp = t.xp + (state.bonus || 0), l = levelOf(xp), s = streak(state.days, now);
    return { totals: t, xp: xp, level: l, streak: s, quests: quests(state, now), badges: badges(t, s, l, state.games) };
  }

  return { XP: XP, kind: kind, moduleOf: moduleOf, itemXP: itemXP, totals: totals, levelOf: levelOf, need: need, streak: streak, quests: quests, observe: observe, claim: claim, winGame: winGame, badges: badges, summary: summary, emptyState: emptyState, dayKey: dayKey };
})();
if (typeof module !== 'undefined') module.exports = Play;
