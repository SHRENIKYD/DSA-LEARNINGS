/* Presentation helpers for the native journey. Reads progress; never fabricates completion. */
var AppExperience = (function () {
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  var POS = { isle: [22, 57], valley: [49, 31], peaks: [79, 18], port: [79, 58], obs: [50, 80], harbor: [19, 16] };
  function world(J, stats, tracks, selected) {
    var chosen = J.REGIONS.filter(function (r) { return r.key === selected; })[0] || J.REGIONS[0];
    var html = '<section class="island-map" aria-label="Learning regions"><span class="map-kick">THE LEARNING ARCHIPELAGO</span><svg class="island-route" viewBox="0 0 340 350" preserveAspectRatio="none" aria-hidden="true"><path d="M75 200 C100 230 130 285 170 280 S230 215 269 203 S300 95 269 63 S195 70 167 109 S95 20 65 56"/></svg>';
    html += J.REGIONS.map(function (r, i) { var p = POS[r.key], g = stats.region[r.key] || { done: 0, items: 0 }; return '<a class="floating-island' + (r === chosen ? ' selected' : '') + '" href="#world/' + r.key + '"' + (r === chosen ? ' aria-current="location"' : '') + ' style="left:' + p[0] + '%;top:' + p[1] + '%;--delay:' + (-i * .7) + 's"><span class="island-land">' + J.icon(r.icon) + '</span><b>' + esc(r.name) + '</b><small>' + J.pct(g.done, g.items) + '% explored</small></a>'; }).join('') + '</section>';
    var ids = chosen.tracks.filter(function (id) { return tracks.some(function (t) { return t.id === id; }); });
    var g = stats.region[chosen.key], pct = J.pct(g.done, g.items);
    html += '<section class="card island-detail"><span class="kick">' + esc(chosen.area) + '</span><h2>' + esc(chosen.name) + '</h2><div class="xpbar"><i style="width:' + pct + '%"></i></div><span class="muted sm">' + g.done + ' of ' + g.items + ' activities explored</span>';
    html += ids.map(function (id) { var t = tracks.filter(function (t) { return t.id === id; })[0], st = stats.track[id] || { done: 0, items: 0 }; return '<a class="journey-link" href="#map/' + id + '"><span>' + esc(t.title) + '</span><span class="mono sm">' + J.pct(st.done, st.items) + '% ›</span></a>'; }).join('');
    return html + '</section>';
  }
  function search(entries, query, tracks) {
    query = String(query || '').trim().toLowerCase().slice(0, 160);
    if (!query) return '<p class="muted sm">Search a topic, module or interview concept across every track.</p>';
    var allowed = {}; tracks.forEach(function (t) { allowed[t.id] = true; });
    var matches = (entries || []).filter(function (e) { var tid = String(e.h || '').split('.html#')[0]; return allowed[tid] && /^[a-z]+\.html#[a-z0-9-]+$/.test(e.h) && (String(e.t || '') + ' ' + String(e.c || '') + ' ' + String(e.s || '')).toLowerCase().indexOf(query) >= 0; });
    return '<p class="muted sm" role="status">' + matches.length + ' results' + (matches.length > 50 ? ' · first 50 shown' : '') + '</p>' + matches.slice(0, 50).map(function (e) { return '<a class="journey-link search-result" href="' + esc(e.h) + '"><span><b>' + esc(e.t) + '</b><small>' + esc(e.c) + '</small></span><span aria-hidden="true">↗</span></a>'; }).join('') + (!matches.length ? '<div class="card"><b>No matches yet</b><p class="muted sm">Try fewer words or a related concept.</p></div>' : '');
  }
  function week(Play, days, date) {
    var out = [];
    for (var i = 6; i >= 0; i--) { var d = new Date(date); d.setDate(d.getDate() - i); var k = Play.dayKey(d), val = days[k], active = val && Object.keys(val).some(function (x) { return typeof val[x] === 'number' && val[x] > 0; }); out.push({ key: k, label: d.toLocaleDateString(undefined, { weekday: 'short' }), active: !!active, today: i === 0 }); }
    return out;
  }
  return { world: world, search: search, week: week, esc: esc };
})();
if (typeof module !== 'undefined') module.exports = AppExperience;
