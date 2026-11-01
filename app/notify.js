/* Local reminders (Android/iOS app only). plan() is pure: it turns the learner's data into the reminders to schedule;
   sync() cancels the old ones and schedules those through @capacitor/local-notifications. Nothing leaves the phone. */
var Notify = (function () {
  var IDS = { streak: 101, reviews: 102, plan: 103, quest: 104, weekly: 105, nudge3: 106, nudge7: 107, level: 108, mock: 109 };
  var GROUP = { streak: 'core', reviews: 'core', plan: 'helpful', quest: 'helpful', weekly: 'helpful', level: 'helpful', mock: 'optin', nudge3: 'optin', nudge7: 'optin' };
  var DEFAULTS = { core: true, helpful: true, optin: false, hour: 19, quietFrom: 22, quietTo: 7 };

  function settings(s) {
    var o = {};
    Object.keys(DEFAULTS).forEach(function (k) { o[k] = s && s[k] !== undefined ? s[k] : DEFAULTS[k]; });
    return o;
  }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
  function at(base, dayOffset, hour, minute) { var d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + dayOffset, hour, minute || 0, 0, 0); return d; }
  function inQuiet(h, s) { return s.quietFrom === s.quietTo ? false : s.quietFrom < s.quietTo ? h >= s.quietFrom && h < s.quietTo : h >= s.quietFrom || h < s.quietTo; }
  // A time inside quiet hours moves to the end of them (the same or the next morning).
  function unquiet(d, s) {
    if (!inQuiet(d.getHours(), s)) return d;
    var x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), s.quietTo, 0, 0, 0);
    if (x <= d) x.setDate(x.getDate() + 1);
    return x;
  }
  function future(d, now) { return d.getTime() > now.getTime() + 60000; }
  function dayKey(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  /* in: { settings, streak: {days, today}, reviews: [{due, title}], next: {title, minutes} | null, quests: {xp}, level: {level, into, need},
         week: {days, games, topics}, lastActive: Date | null }
     returns [{ id, kind, title, body, at: Date, route }] for every reminder that is switched on and still in the future. */
  function plan(inp, now) {
    var s = settings(inp.settings), out = [];
    function add(kind, d, title, body, route) {
      if (!s[GROUP[kind]] || !d) return;
      d = unquiet(d, s);
      if (future(d, now)) out.push({ id: IDS[kind], kind: kind, title: title, body: body, at: d, route: route });
    }
    var st = inp.streak || { days: 0, today: false };
    if (st.days >= 2) {
      // Today at 8 PM if nothing was done yet; once today counts, warn tomorrow evening instead.
      var sd = st.today ? at(now, 1, 20) : at(now, 0, 20);
      add('streak', sd, 'Your ' + st.days + '-day streak ends tonight', 'One 5-minute game keeps it alive.', '#play');
    }
    var rv = (inp.reviews || []).filter(function (r) { return r && r.due; }).sort(function (a, b) { return a.due - b.due; });
    if (rv.length) {
      var first = new Date(rv[0].due), rd = at(first, 0, 8);
      if (rd < first) rd = at(first, 1, 8);
      if (!future(rd, now)) rd = now.getHours() < 8 ? at(now, 0, 8) : at(now, 1, 8);
      var cnt = rv.filter(function (r) { return r.due <= rd.getTime(); }).length || 1;
      var names = rv.slice(0, 3).map(function (r) { return r.title; }).filter(Boolean).join(', ');
      add('reviews', rd, plural(cnt, 'section') + ' due for review', (names ? names + '. ' : '') + 'About ' + Math.max(2, cnt * 2) + ' minutes.', '#today');
    }
    var nx = inp.next;
    var pd = at(now, now.getHours() < s.hour ? 0 : 1, s.hour);
    if (nx && nx.title) add('plan', pd, 'Today’s plan' + (nx.minutes ? ': ' + nx.minutes + ' min' : ''), 'Next up: ' + nx.title + '.', '#home');
    var q = inp.quests || { xp: 0 };
    add('quest', at(now, now.getHours() < 9 ? 0 : 1, 9), 'New daily quests are ready', '3 quests today, up to +' + (q.xp || 0) + ' XP.', '#expedition');
    var lv = inp.level;
    if (lv && lv.need > 0 && lv.need - lv.into <= Math.max(30, lv.need * 0.25)) add('level', at(now, now.getHours() < 12 ? 0 : 1, 12, 30), 'Level ' + (lv.level + 1) + ' is close', 'Only ' + (lv.need - lv.into) + ' XP to go. One game could do it.', '#play');
    var wd = at(now, (7 - now.getDay()) % 7, 19, 30);
    if (!future(wd, now)) wd = at(wd, 7, 19, 30);
    var w = inp.week || { days: 0, games: 0, topics: 0 };
    add('weekly', wd, 'Your week in review', plural(w.days, 'day') + ' active, ' + plural(w.games, 'game') + ' won, ' + plural(w.topics, 'topic') + ' learned.', '#progress');
    if (inp.lastActive) {
      var la = inp.lastActive, title = nx && nx.title ? 'Pick up where you left off: ' + nx.title + '.' : 'Your next lesson is waiting.';
      add('nudge3', at(la, 3, 18), 'Ready for a quick session?', title, '#home');
      add('nudge7', at(la, 7, 18), 'We saved your spot', title, '#home');
    }
    return out;
  }

  /* ---------- device glue ---------- */
  function plugin() { var c = typeof window !== 'undefined' && window.Capacitor; return c && c.isNativePlatform && c.isNativePlatform() && c.Plugins && c.Plugins.LocalNotifications ? c.Plugins.LocalNotifications : null; }
  function toNative(n) { return { id: n.id, title: n.title, body: n.body, schedule: { at: n.at }, smallIcon: 'ic_stat_notify', largeIcon: 'ic_notify_large', iconColor: '#FF6A00', isExactNotification: false, extra: { route: n.route } }; }
  function cancelAll(P) { return P.cancel({ notifications: Object.keys(IDS).map(function (k) { return { id: IDS[k] }; }) }).catch(function () { }); }
  var asked = false;
  function permitted(P, ask) {
    return P.checkPermissions().then(function (r) {
      if (r.display === 'granted') return true;
      if (!ask || asked || r.display === 'denied') return false;
      asked = true;
      return P.requestPermissions().then(function (x) { return x.display === 'granted'; });
    }).catch(function () { return false; });
  }
  function sync(inp, opts) {
    var P = plugin();
    if (!P) return Promise.resolve(false);
    var list = plan(inp, new Date());
    return permitted(P, opts && opts.ask).then(function (ok) {
      return cancelAll(P).then(function () { return ok && list.length ? P.schedule({ notifications: list.map(toNative) }).then(function () { return true; }) : ok; });
    }).catch(function () { return false; });
  }
  // An event worth telling later (a module finished: a mock-round hint an hour on).
  function now(kind, title, body, route, inSettings, delayMin) {
    var P = plugin(), s = settings(inSettings);
    if (!P || !s[GROUP[kind]]) return Promise.resolve(false);
    var d = new Date(Date.now() + (delayMin || 0) * 60000 + 2000);
    d = unquiet(d, s);
    return permitted(P, false).then(function (ok) { return ok ? P.schedule({ notifications: [toNative({ id: IDS[kind], title: title, body: body, at: d, route: route })] }).then(function () { return true; }) : false; }).catch(function () { return false; });
  }
  function onTap(fn) {
    var P = plugin();
    if (P && P.addListener) P.addListener('localNotificationActionPerformed', function (e) { var r = e && e.notification && e.notification.extra && e.notification.extra.route; if (r) fn(r); });
  }
  return { IDS: IDS, GROUP: GROUP, DEFAULTS: DEFAULTS, settings: settings, plan: plan, unquiet: unquiet, dayKey: dayKey, available: function () { return !!plugin(); }, sync: sync, now: now, onTap: onTap, permitted: function (ask) { var P = plugin(); return P ? permitted(P, ask) : Promise.resolve(false); } };
})();
if (typeof module !== 'undefined') module.exports = Notify;
