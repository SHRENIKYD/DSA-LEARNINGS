// Turns the newest entry of a changelog into the data the "What's new" popup shows (src/whatsnew.js).
const H = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const inline = (s) => H(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

function latest(md) {
  const lines = md.split('\n'), start = lines.findIndex((l) => /^## \[/.test(l));
  if (start < 0) return null;
  const head = /^## \[([^\]]+)\]\s*(?:—|-)\s*(\d{4}-\d{2}-\d{2})?\s*(?:·\s*(.*))?$/.exec(lines[start]);
  if (!head) return null;
  let html = '', depth = 0;
  const close = (to) => { while (depth > to) { html += '</li></ul>'; depth--; } };
  for (let i = start + 1; i < lines.length && !/^## /.test(lines[i]); i++) {
    const l = lines[i], m = /^(\s*)- (.*)$/.exec(l);
    if (/^### /.test(l)) { close(0); html += '<h4>' + inline(l.slice(4).trim()) + '</h4>'; continue; }
    if (m) {
      const d = Math.floor(m[1].length / 2) + 1;
      if (d > depth) { while (depth < d) { html += '<ul><li>'; depth++; } } else { close(d); html += '</li><li>'; }
      html += inline(m[2].trim());
      continue;
    }
    if (l.trim() && depth) html += ' ' + inline(l.trim());
    else if (l.trim()) { close(0); html += '<p>' + inline(l.trim()) + '</p>'; }
  }
  close(0);
  return { v: head[1], date: head[2] || '', title: (head[3] || '').trim(), html };
}

function dataJs(md) { return 'window.IM_WHATSNEW=' + JSON.stringify(latest(md)) + ';\n'; }

module.exports = { latest, dataJs };
