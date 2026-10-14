var H = (function () {
  var C = { g: 'c-g', r: 'c-r', b: 'c-b', y: 'c-y', p: 'c-p', m: 'c-m' };
  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function arr(values, o) {
    o = o || {};
    var hl = o.hl || {}, ptr = o.ptr || {}, showIdx = o.idx !== false, start = o.start || 0;
    var h = '<div class="mini-arr">' + (o.label ? '<span class="mini-lbl">' + o.label + '</span>' : '');
    values.forEach(function (v, i) {
      h += '<span class="mcell ' + (C[hl[i]] || '') + '">' +
        (ptr[i] !== undefined ? '<i class="mptr">' + esc(ptr[i]) + '</i>' : '') +
        '<b>' + esc(v) + '</b>' + (showIdx ? '<i class="midx">' + (i + start) + '</i>' : '') + '</span>';
    });
    return h + '</div>';
  }
  function table(head, rows) {
    var h = '<div class="tbl-wrap"><table class="tbl"><thead><tr>';
    head.forEach(function (c) { h += '<th>' + c + '</th>'; });
    h += '</tr></thead><tbody>';
    rows.forEach(function (r) {
      h += '<tr>';
      r.forEach(function (c) { h += '<td>' + c + '</td>'; });
      h += '</tr>';
    });
    return h + '</tbody></table></div>';
  }
  function chips(items, o) {
    o = o || {};
    var hl = o.hl || {};
    var h = '<div class="mini-set">' + (o.label ? '<span class="mini-lbl">' + o.label + '</span>' : '') + '{ ';
    items.forEach(function (v) { h += '<span class="mchip ' + (C[hl[v]] || '') + '">' + esc(v) + '</span>'; });
    return h + ' }</div>';
  }
  function kv(entries, o) {
    o = o || {};
    var hl = o.hl || {};
    var h = '<div class="mini-set">' + (o.label ? '<span class="mini-lbl">' + o.label + '</span>' : '') + '{ ';
    entries.forEach(function (e) {
      h += '<span class="mchip ' + (C[hl[e[0]]] || '') + '">' + esc(e[0]) + ' &rarr; ' + esc(e[1]) + '</span>';
    });
    return h + ' }</div>';
  }
  function bits(value, width, o) {
    o = o || {};
    width = width || 8;
    var hl = o.hl || {};
    var s = width >= 32 ? (value >>> 0).toString(2).padStart(32, '0')
      : ((value & ((1 << width) - 1)) >>> 0).toString(2).padStart(width, '0');
    var h = '<div class="mini-arr">' + (o.label ? '<span class="mini-lbl">' + o.label + '</span>' : '');
    for (var i = 0; i < width; i++) {
      var pos = width - 1 - i;
      h += '<span class="mcell bit ' + (C[hl[pos]] || '') + '"><b>' + s[i] + '</b><i class="midx">' + pos + '</i></span>';
    }
    return h + (o.dec === false ? '' : '<span class="mini-lbl">= ' + value + '</span>') + '</div>';
  }
  function c(color, text) { return '<span class="' + (C[color] || '') + '">' + text + '</span>'; }
  return { esc: esc, arr: arr, table: table, chips: chips, kv: kv, bits: bits, c: c };
})();
