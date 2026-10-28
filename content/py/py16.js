(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  // Shared test harness: runs each case as python lines in a fresh namespace; returns repr of every non-None expression, or !ExceptionName.
  var PYT = String.raw`
def run_lines(lines):
    g = dict(globals())
    out = []
    for ln in lines:
        try:
            try:
                code = compile(ln, '<t>', 'eval')
            except SyntaxError:
                code = None
            if code is None:
                exec(compile(ln, '<t>', 'exec'), g)
            else:
                v = eval(code, g)
                if v is not None:
                    out.append(repr(v))
        except Exception as e:
            out.append('!' + type(e).__name__)
    return out
`;
  var R = String.raw;

  /* ----------------------------------------------------------------------
     Shared visualizer helpers for py16 (Django & DRF)
     ---------------------------------------------------------------------- */
  function esc(s) {
    return String(s === undefined || s === null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  // Build a box diagram frame. nodes: [[id, label, x, y]], edges: [[u, v, label?]]
  function boxes(label, nodes, edges, hl, ehl, height) {
    return { type: 'graph', label: label, directed: true, height: height || 50,
      nodes: nodes.map(function (n) { return { id: n[0], label: n[1], x: n[2], y: n[3], shape: 'box' }; }),
      edges: edges.map(function (e) { return e.slice(); }), hl: hl || {}, ehl: ehl || {} };
  }
  // Turn a list of steps into frames that share one diagram.
  function walk(label, nodes, edges, steps, height) {
    return steps.map(function (s) {
      var parts = [boxes(label, nodes, edges, s.hl, s.ehl, height)];
      (s.parts || []).forEach(function (p) { parts.push(p); });
      return { narr: s.narr, parts: parts };
    });
  }

  /* ======================================================================
     TOPIC 1: Project structure, MTV and URL routing
     ====================================================================== */
  var URL_ROUTES = [
    ['articles/2003/', 'special'],
    ['articles/<int:year>/', 'year-archive'],
    ['articles/<int:year>/<slug:slug>/', 'article-detail'],
    ['files/<path:p>', 'file'],
    ['<str:page>/', 'flatpage']
  ];
  var CONV = { int: '[0-9]+', str: '[^/]+', slug: '[-a-zA-Z0-9_]+', path: '.+', uuid: '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' };
  function routeRegex(route) {
    var out = '^', pos = 0, names = [], m, re = /<(?:([^>:]+):)?([^>]+)>/g;
    while ((m = re.exec(route))) {
      out += route.slice(pos, m.index).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      names.push([m[2], m[1] || 'str']);
      out += '(' + CONV[m[1] || 'str'] + ')';
      pos = m.index + m[0].length;
    }
    out += route.slice(pos).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$';
    return { rx: new RegExp(out), names: names };
  }

  topics.push({
    title: 'Projects, Apps, MTV and URL Routing with Path Converters',
    analogy: R`<p>A Django <b>project</b> is a shopping mall and each <b>app</b> is a shop inside it (blog, payments, accounts). The mall has one <b>directory board at the entrance</b> (<code>ROOT_URLCONF</code>): a visitor reads it top to bottom and walks to the <b>first</b> shop whose sign matches. Some signs point to a smaller board inside a wing (<code>include()</code>). The shopkeeper (the <b>view</b>) fetches goods from the stock room (the <b>model</b>) and puts them in a nice bag (the <b>template</b>). Django calls this split <b>Model–Template–View</b>.</p>`,
    explain: R`<p>🟢 <b>The plain idea.</b> <code>django-admin startproject mysite</code> makes the <b>project</b>: global settings, the root URL list and the WSGI/ASGI entry points. <code>python manage.py startapp blog</code> makes an <b>app</b>: a reusable package with <code>models.py</code>, <code>views.py</code>, <code>admin.py</code>, <code>apps.py</code>, <code>migrations/</code> and usually its own <code>urls.py</code>. An app only exists for Django once it is listed in <code>INSTALLED_APPS</code>.</p>
      ${H.table(['MVC word', 'Django word', 'Lives in', 'Job'], [
        ['Model', 'Model', '<code>models.py</code>', 'tables, fields, relations, query logic'],
        ['Controller', '<b>View</b>', '<code>views.py</code>', 'takes a request, returns a response'],
        ['View', '<b>Template</b>', '<code>templates/</code>', 'turns data into HTML'],
        ['Router', 'URLconf', '<code>urls.py</code>', 'maps a path to a view']
      ])}
      <p><b>The request lifecycle:</b> the WSGI/ASGI server gives Django a request → it passes <b>down</b> the middleware list → the URL resolver matches <code>request.path_info</code> → the view runs (talking to models, rendering a template) → the response passes back <b>up</b> the middleware list → the server sends it.</p>
      <p><b>URL patterns.</b> <code>path('articles/&lt;int:year&gt;/', views.year_archive, name='year-archive')</code> means: match the literal text, capture a run of digits, <b>convert it to an int</b>, and call <code>year_archive(request, year=2024)</code>. Built-in <b>path converters</b>:</p>
      ${H.table(['converter', 'regex', 'Python value'], [
        ['<code>str</code> (default)', '<code>[^/]+</code>', 'str, no slashes'],
        ['<code>int</code>', '<code>[0-9]+</code>', 'int (no sign, leading zeros OK)'],
        ['<code>slug</code>', '<code>[-a-zA-Z0-9_]+</code>', 'str'],
        ['<code>uuid</code>', 'lower-case hex 8-4-4-4-12', '<code>uuid.UUID</code>'],
        ['<code>path</code>', '<code>.+</code>', 'str, slashes allowed']
      ])}
      <p>Patterns are tried <b>in order</b>; the first full match wins, so put specific routes (<code>articles/2003/</code>) above general ones. Paths have <b>no leading slash</b>. <code>name=</code> lets you build URLs backwards with <code>reverse('year-archive', kwargs={'year': 2024})</code> or <code>{% url %}</code> in templates, so you never hard-code paths.</p>`,
    clues: [
      '"add a new endpoint to a Django app" → a <code>path()</code> in the app <code>urls.py</code>, <code>include()</code>d from the root URLconf',
      '"the URL captures an id but the view gets a string" → use the <code>int</code> converter (or a custom converter)',
      '"two routes, the wrong view runs" → order of <code>urlpatterns</code>, first match wins',
      '"hard-coded URLs break after a rename" → <code>name=</code> + <code>reverse()</code> / <code>{% url %}</code>, plus <code>app_name</code> namespaces',
      '"explain MVC in Django" → MTV: the Django <i>view</i> is the controller, the template is the view',
      '"404 for /about but /about/ works" → <code>APPEND_SLASH</code> and <code>CommonMiddleware</code>'
    ],
    code: [{ lang: 'python', check: false, title: 'A project with one app (layout and URLconfs)', code: R`
# mysite/                      <- project (settings, root URLconf, wsgi/asgi)
#   manage.py
#   mysite/settings.py         INSTALLED_APPS, MIDDLEWARE, DATABASES, ROOT_URLCONF
#   mysite/urls.py
#   blog/                      <- app (python manage.py startapp blog)
#     models.py views.py admin.py apps.py urls.py migrations/ templates/blog/

# mysite/urls.py
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("blog/", include("blog.urls")),           # delegate the rest of the path
]

# blog/urls.py
from django.urls import path, register_converter
from . import views, converters

register_converter(converters.FourDigitYear, "yyyy")
app_name = "blog"                                    # namespace -> reverse("blog:detail", ...)

urlpatterns = [
    path("", views.post_list, name="list"),
    path("<yyyy:year>/", views.year_archive, name="year"),
    path("<int:year>/<slug:slug>/", views.post_detail, name="detail"),
]

# blog/converters.py
class FourDigitYear:
    regex = "[0-9]{4}"
    def to_python(self, value):        # raising ValueError here means "no match, keep looking"
        return int(value)
    def to_url(self, value):
        return "%04d" % value
` }, { lang: 'python', run: true, title: 'What a path converter really does (plain Python)', code: R`
import re

route = "articles/<int:year>/<slug:slug>/"
regex = r"^articles/(?P<year>[0-9]+)/(?P<slug>[-a-zA-Z0-9_]+)/\Z"
m = re.match(regex, "articles/2024/hello-django/")
kwargs = {"year": int(m["year"]), "slug": m["slug"]}   # int converter turns text into int
print(kwargs)
print(re.match(regex, "articles/twenty/hello/"))          # None -> resolver tries the next pattern
` }],
    viz: {
      title: 'Resolve a path against urlpatterns (first match wins)',
      input: 'articles/2024/hello-django/',
      inputLabel: 'Request path (no leading slash needed)',
      gen: function (input) {
        var p = String(input === undefined ? 'articles/2024/hello-django/' : input).trim().replace(/^\//, '');
        if (p.length > 80) throw new Error('Keep the path under 80 characters');
        var frames = [], rows = URL_ROUTES.map(function (r) { return [r[0], r[1], '']; });
        function tbl(hl) { return { type: 'table', label: 'urlpatterns (tried top to bottom)', columns: ['route', 'name', 'result'], rows: rows.map(function (r) { return r.slice(); }), hl: hl }; }
        frames.push({ narr: 'A request for <code>/' + esc(p) + '</code> arrives. Django strips the leading slash and walks <code>urlpatterns</code> from the top. Each route was compiled once into a regular expression.', parts: [tbl({}), { type: 'vars', label: 'request', vals: { path_info: '/' + p } }] });
        var hit = -1;
        for (var i = 0; i < URL_ROUTES.length; i++) {
          var c = routeRegex(URL_ROUTES[i][0]), m = c.rx.exec(p), h = {};
          if (m) {
            var kw = {};
            c.names.forEach(function (nm, j) { kw[nm[0]] = nm[1] === 'int' ? String(parseInt(m[j + 1], 10)) : "'" + m[j + 1] + "'"; });
            rows[i][2] = 'MATCH';
            h[i] = 'ok';
            frames.push({ narr: 'Route <code>' + esc(URL_ROUTES[i][0]) + '</code> matches the <b>whole</b> path. Each captured piece goes through its converter (<code>int</code> → Python int). The view is called with these keyword arguments. Later routes are never tried.', parts: [tbl(h), { type: 'vars', label: 'view kwargs', vals: kw }] });
            hit = i; break;
          }
          rows[i][2] = 'no';
          h[i] = 'bad';
          frames.push({ narr: 'Try <code>' + esc(URL_ROUTES[i][0]) + '</code> → regex <code>' + esc(c.rx.source) + '</code> does not match the full path, so the resolver moves on.', parts: [tbl(h)] });
        }
        if (hit < 0) frames.push({ narr: 'No pattern matched → <code>Resolver404</code> → a <b>404</b> response. (If the path lacked a trailing slash, <code>CommonMiddleware</code> with <code>APPEND_SLASH=True</code> would first try a redirect to the slashed URL.)', parts: [tbl({}), { type: 'text', label: 'Result', html: '<b>404 Not Found</b>' }] });
        frames.push({ narr: 'Lesson: order matters (specific before general), converters both <b>validate</b> and <b>convert</b>, and <code>str</code> never crosses a <code>/</code> while <code>path</code> does.', parts: [tbl(hit >= 0 ? (function () { var o = {}; o[hit] = 'sel'; return o; })() : {})] });
        return frames;
      }
    },
    examples: [
      { title: 'Order bug: the general route swallows the special one', html: R`<p>If <code>'&lt;str:page&gt;/'</code> is listed before <code>'about/'</code>, the about page is never reached: <code>str</code> matches <code>about</code> first. Fix: list specific routes first, or give the catch-all its own prefix.</p>`, code: { lang: 'python', run: true, code: R`
import re
patterns = [(r"^(?P<page>[^/]+)/\Z", "flatpage"), (r"^about/\Z", "about")]
for path in ["about/", "contact/"]:
    for rx, name in patterns:
        if re.match(rx, path):
            print(path, "->", name)
            break
` } },
      { title: 'include() strips the matched prefix', html: R`<p><code>path('blog/', include('blog.urls'))</code> matches the prefix <code>blog/</code>, removes it, and resolves the <b>rest</b> (<code>2024/hello/</code>) against <code>blog/urls.py</code>. Captured kwargs from the outer pattern are passed down too. With <code>app_name = 'blog'</code>, names become <code>blog:detail</code>.</p>`, code: { lang: 'python', check: false, code: R`
from django.urls import reverse
reverse("blog:detail", kwargs={"year": 2024, "slug": "hello"})   # '/blog/2024/hello/'
# template: {% url 'blog:detail' year=2024 slug='hello' %}
` } },
      { title: 're_path for the odd legacy URL', html: R`<p><code>re_path(r'^archive/(?P&lt;year&gt;[0-9]{4})/$', view)</code> uses a raw regex. Captured values are always <b>strings</b> (no converter). Prefer <code>path()</code> plus a custom converter; use <code>re_path</code> only for patterns converters cannot express.</p>`, code: { lang: 'python', check: false, code: R`
from django.urls import re_path
urlpatterns = [re_path(r"^archive/(?P<year>[0-9]{4})/$", views.archive)]   # year arrives as "2024" (str)
` } }
    ],
    deepDive: R`<p>🟣 <b>Internals.</b> At startup nothing is compiled; on the first request <code>get_resolver()</code> (cached with <code>functools.cache</code>) builds a <code>URLResolver</code> for <code>ROOT_URLCONF</code>. Each <code>path()</code> becomes a <code>URLPattern</code> whose <code>RoutePattern</code> turns the route into a regex (<code>_route_to_regex</code>), keeping a converter per group. <code>resolve()</code> walks the list; an <code>include()</code> is a nested <code>URLResolver</code> that matches a prefix and recurses on the remainder. A converter's <code>to_python</code> raising <code>ValueError</code> counts as "no match" (since Django 5.0 it is the only exception treated that way). The result is a <code>ResolverMatch</code> (func, args, kwargs, url_name, namespaces, route), available as <code>request.resolver_match</code>.</p>
      <p><b>reverse()</b> uses the same data backwards: it builds candidate strings, checks each argument with the converter's regex, and quotes them. Reversal ignores argument <b>types</b> beyond what the regex accepts. <b>Performance:</b> resolution is linear in the number of patterns at each level, which is why big projects nest with <code>include()</code>; it is rarely a bottleneck compared with the database. <b>Settings to know:</b> <code>ROOT_URLCONF</code>, <code>APPEND_SLASH</code>, <code>request.urlconf</code> (per-request override, used for multi-tenant hosts), <code>handler404</code>/<code>handler500</code>.</p>`,
    aiEra: R`<p>🤖 <b>AI and URL routing.</b> Assistants scaffold a Django app (models, views, urls, admin) in seconds, and they are good at it because the layout is so conventional. What they get wrong: they mix <code>url()</code> (removed in Django 4.0) with <code>path()</code>, forget the trailing slash or the <code>app_name</code> namespace, put a catch-all pattern above specific ones, or use <code>re_path</code> where a converter is clearer. <b>What you own:</b> knowing that resolution is "first full match wins", which converter validates what, and that <code>reverse()</code> keeps links alive through refactors. A good prompt: <code>List every URL in this urls.py in resolution order, show which view each sample path reaches, and flag shadowed routes.</code> Then verify with <code>python manage.py show_urls</code> (django-extensions) or a quick <code>resolve()</code> test.</p>`,
    problems: [{
      title: 'Build a URL resolver with path converters',
      level: 'Medium', tags: ['django', 'url routing', 'regex', 'converters'], companies: ['Instagram', 'Disqus', 'Mozilla'],
      statement: R`<p>Write <code>compile_route(route)</code> and <code>resolve(urlpatterns, path)</code> that behave like Django's <code>path()</code> routing.</p>
        <ul><li><code>urlpatterns</code> is a list of <code>(route, name)</code> tuples. Routes use <code>&lt;converter:name&gt;</code> or <code>&lt;name&gt;</code> (default converter <code>str</code>).</li>
        <li>Converters: <code>str</code> <code>[^/]+</code>, <code>int</code> <code>[0-9]+</code> → int, <code>slug</code> <code>[-a-zA-Z0-9_]+</code>, <code>uuid</code> (lower-case 8-4-4-4-12 hex) → <code>uuid.UUID</code>, <code>path</code> <code>.+</code>. An unknown converter or a parameter name that is not an identifier raises <code>ValueError</code> from <code>compile_route</code>.</li>
        <li>A leading <code>/</code> on the path is ignored. The <b>whole</b> path must match. The first matching pattern wins. Return <code>(name, kwargs)</code>; if nothing matches raise <code>Resolver404</code>.</li></ul>`,
      constraints: R`Up to 100 patterns; path length ≤ 2000. Literal text in routes may contain regex characters like <code>.</code>, which must match literally.`,
      example: R`<p>With <code>[('articles/2003/', 'special'), ('articles/&lt;int:year&gt;/', 'year')]</code>: <code>resolve(P, 'articles/2024/')</code> → ${H.c('g', "('year', {'year': 2024})")}; <code>'articles/2003/'</code> → ${H.c('b', "('special', {})")} (listed first); <code>'articles/2024'</code> → ${H.c('r', 'Resolver404')} (no trailing slash).</p>`,
      brute: {
        why: R`<p>Splitting on <code>/</code> and comparing segment by segment works for simple routes but breaks for <code>path</code> (which spans slashes), for literal text mixed with parameters in one segment, and it re-parses every route on every request.</p>`,
        code: R`
          def resolve_brute(urlpatterns, path):
              parts = path.strip("/").split("/")
              for route, name in urlpatterns:
                  rparts = route.strip("/").split("/")
                  if len(rparts) != len(parts):
                      continue
                  kwargs, ok = {}, True
                  for r, p in zip(rparts, parts):
                      if r.startswith("<"):
                          conv, _, key = r[1:-1].rpartition(":")
                          kwargs[key] = int(p) if conv == "int" and p.isdigit() else p
                      elif r != p:
                          ok = False
                  if ok:
                      return name, kwargs
              raise LookupError(path)

          print(resolve_brute([("files/<path:p>", "file")], "files/a/b.txt"))   # wrongly fails
        `
      },
      mcq: { q: 'Why compile each route into one anchored regex with named groups?', options: ['It handles converters that span slashes, literal text next to parameters, and full-match checks in one step', 'Regexes are required by WSGI', 'It makes int conversion unnecessary', 'It sorts the patterns automatically'], answer: 0, explain: 'A route is a tiny pattern language. Translating it once to <code>^…\\Z</code> with named groups gives exact, full-path matching for every converter, including <code>path</code>.' },
      hints: [
        R`<p>Hint 1: Scan the route with the regex <code>&lt;(?:(?P&lt;conv&gt;[^&gt;:]+):)?(?P&lt;name&gt;[^&gt;]+)&gt;</code>. Everything between matches is literal text.</p>`,
        R`<p>Hint 2: Escape the literal text with <code>re.escape</code>, replace each parameter with <code>(?P&lt;name&gt;REGEX)</code>, anchor with <code>^</code> and <code>\Z</code>, and remember each parameter's Python converter (<code>int</code>, <code>str</code>, <code>uuid.UUID</code>).</p>`,
        R`<p>Hint 3: In <code>resolve</code>, strip one leading slash, try patterns in order, and on the first <code>fullmatch</code> build <code>{name: convert(text)}</code> in group order. No match → <code>raise Resolver404(path)</code>. Validate the converter name and <code>name.isidentifier()</code> at compile time.</p>`
      ],
      tests: { sig: 'string[] -> string[]', fn: 'run_lines', harness: { python: PYT }, cases: [
        [[["P = [('articles/2003/', 'special'), ('articles/<int:year>/', 'year'), ('articles/<int:year>/<slug:slug>/', 'detail')]",
           "resolve(P, 'articles/2003/')",
           "resolve(P, 'articles/2024/')",
           "resolve(P, '/articles/2024/hello-world/')",
           "resolve(P, 'articles/abc/')",
           "resolve(P, 'articles/2024')",
           "resolve(P, 'articles/007/')"]],
         ["('special', {})",
          "('year', {'year': 2024})",
          "('detail', {'year': 2024, 'slug': 'hello-world'})",
          '!Resolver404',
          '!Resolver404',
          "('year', {'year': 7})"]],
        [[["P = [('files/<path:p>', 'file'), ('<str:name>/', 'page')]",
           "resolve(P, 'files/a/b/c.txt')",
           "resolve(P, 'about/')",
           "resolve(P, 'a/b/')",
           "resolve(P, 'files/')"]],
         ["('file', {'p': 'a/b/c.txt'})",
          "('page', {'name': 'about'})",
          '!Resolver404',
          "('page', {'name': 'files'})"]],
        [[["P = [('hello/<name>/', 'hi')]",
           "resolve(P, 'hello/Ada Lovelace/')",
           "resolve(P, 'hello//')",
           "resolve(P, 'hello/x/y/')"]],
         ["('hi', {'name': 'Ada Lovelace'})",
          '!Resolver404',
          '!Resolver404']],
        [[["P = [('u/<uuid:id>/', 'user'), ('t/<slug:s>/', 'tag')]",
           "resolve(P, 'u/12345678-1234-1234-1234-123456789abc/')",
           "resolve(P, 'u/12345678-1234-1234-1234-123456789ABC/')",
           "resolve(P, 't/django_5-x/')",
           "resolve(P, 't/café/')"]],
         ["('user', {'id': UUID('12345678-1234-1234-1234-123456789abc')})",
          '!Resolver404',
          "('tag', {'s': 'django_5-x'})",
          '!Resolver404']],
        [[["P = [('a.b/', 'dot'), ('<str:x>/', 'any')]",
           "resolve(P, 'a.b/')",
           "resolve(P, 'axb/')"]],
         ["('dot', {})",
          "('any', {'x': 'axb'})"]],
        [[["compile_route('x/<foo:y>/')",
           "compile_route('x/<int:2bad>/')",
           "resolve([], '')",
           "resolve([('', 'home')], '')",
           "resolve([('', 'home')], '/')",
           "P = [('n/<int:i>/', 'n%d' % k) for k in range(100)]",
           "resolve(P, 'n/' + '9' * 50 + '/')[0]"]],
         ['!ValueError',
          '!ValueError',
          '!Resolver404',
          "('home', {})",
          "('home', {})",
          "'n0'"]]
      ] },
      solution: {
        approach: R`<p>Translate each route once into an anchored regex with named groups and remember a converter function per group. Resolution is then: strip the leading slash, try each compiled pattern in order, and on the first full match convert every captured string. This is exactly Django's <code>RoutePattern</code> + <code>URLResolver</code> design (Django also caches the compiled patterns).</p>`,
        code: { lang: 'python', run: true, code: R`
import re
import uuid
from functools import lru_cache


class Resolver404(Exception):
    pass


CONVERTERS = {
    "str": (r"[^/]+", str),
    "int": (r"[0-9]+", int),
    "slug": (r"[-a-zA-Z0-9_]+", str),
    "uuid": (r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", uuid.UUID),
    "path": (r".+", str),
}
_PARAM = re.compile(r"<(?:(?P<conv>[^>:]+):)?(?P<name>[^>]+)>")


@lru_cache(maxsize=None)
def compile_route(route):
    regex, converters, pos = "^", {}, 0
    for m in _PARAM.finditer(route):
        regex += re.escape(route[pos:m.start()])
        conv, name = m["conv"] or "str", m["name"]
        if conv not in CONVERTERS:
            raise ValueError(f"unknown converter {conv!r}")
        if not name.isidentifier():
            raise ValueError(f"bad parameter name {name!r}")
        pattern, to_python = CONVERTERS[conv]
        regex += f"(?P<{name}>{pattern})"
        converters[name] = to_python
        pos = m.end()
    regex += re.escape(route[pos:]) + r"\Z"
    return re.compile(regex), converters


def resolve(urlpatterns, path):
    if path.startswith("/"):
        path = path[1:]
    for route, name in urlpatterns:
        rx, converters = compile_route(route)
        m = rx.match(path)
        if m:
            return name, {k: converters[k](v) for k, v in m.groupdict().items()}
    raise Resolver404(path)


P = [("articles/2003/", "special"), ("articles/<int:year>/", "year"),
     ("articles/<int:year>/<slug:slug>/", "detail")]
print(resolve(P, "/articles/2024/hello-world/"))
print(resolve(P, "articles/2003/"))
try:
    resolve(P, "articles/2024")
except Resolver404 as e:
    print("404 for", e)
` },
        dry: { head: ['path', 'route tried', 'regex match?', 'result'], rows: [
          ['articles/2003/', 'articles/2003/', 'yes', "('special', {})"],
          ['articles/2024/', 'articles/2003/', 'no', 'next'],
          ['articles/2024/', 'articles/&lt;int:year&gt;/', 'yes → year="2024"', "('year', {'year': 2024})"],
          ['articles/2024', 'all three', 'no (missing /)', 'Resolver404']
        ] },
        complexity: R`<p>Compiling a route is O(length) once (cached). Resolving is O(P × L) in the worst case for P patterns and path length L; real projects keep P small per level with <code>include()</code>.</p>`,
        followUps: ['Add <code>include(prefix, patterns)</code> that matches a prefix and recurses on the rest', 'Implement <code>reverse(name, kwargs)</code> using the same compiled data', 'Support custom converters registered at runtime']
      }
    }]
  });

  /* ======================================================================
     TOPIC 2: Views — function-based and class-based
     ====================================================================== */
  var CBV_CODE = [
    'class View:',
    '    @classmethod',
    '    def as_view(cls, **initkwargs):',
    '        def view(request, *args, **kwargs):',
    '            self = cls(**initkwargs)          # fresh instance per request',
    '            self.setup(request, *args, **kwargs)',
    '            return self.dispatch(request, *args, **kwargs)',
    '        return view',
    '    def dispatch(self, request, *args, **kwargs):',
    '        method = request.method.lower()',
    '        if method in self.http_method_names:',
    '            handler = getattr(self, method, self.http_method_not_allowed)',
    '        else:',
    '            handler = self.http_method_not_allowed',
    '        return handler(request, *args, **kwargs)'
  ].join('\n');

  topics.push({
    title: 'Views: Function-Based, Class-Based, Generic Views and Mixins',
    analogy: R`<p>A <b>function-based view</b> is a cook who handles every order personally with a big <code>if</code>: "is it a GET? is it a POST?". A <b>class-based view</b> is a restaurant <b>franchise manual</b>: the head office (<code>View</code>) already wrote the receptionist (<code>dispatch</code>) who reads the order type and sends it to the right station (<code>get</code>, <code>post</code>). Generic views are complete franchise kits ("list page", "detail page", "edit form"): you only fill in the menu (<code>model</code>, <code>template_name</code>) and override the one station you want to change.</p>`,
    explain: R`<p>🟢 <b>The plain idea.</b> A Django view is <b>any callable</b> that takes an <code>HttpRequest</code> (plus URL kwargs) and returns an <code>HttpResponse</code>. That's the whole contract.</p>
      <p><b>Function-based views (FBV)</b> are explicit and easy to read: one function, branch on <code>request.method</code>, decorate with <code>@login_required</code>, <code>@require_http_methods(["GET", "POST"])</code>, <code>@transaction.atomic</code>.</p>
      <p><b>Class-based views (CBV)</b> group behaviour per HTTP method. <code>urls.py</code> needs a function, so you write <code>PostDetail.as_view()</code>. Each request then gets a <b>brand-new instance</b> (so storing state on <code>self</code> is safe), <code>setup()</code> stores <code>self.request</code>, <code>self.args</code>, <code>self.kwargs</code>, and <code>dispatch()</code> lowercases the method and calls <code>self.get</code>, <code>self.post</code>, … or returns <b>405 Method Not Allowed</b> with an <code>Allow</code> header. If you define <code>get</code> but not <code>head</code>, HEAD reuses <code>get</code>; <code>options()</code> is built in.</p>
      ${H.table(['Generic view', 'Gives you', 'You usually override'], [
        ['<code>TemplateView</code>', 'render a template with context', '<code>get_context_data</code>'],
        ['<code>ListView</code>', 'object_list, pagination (<code>paginate_by</code>)', '<code>get_queryset</code>'],
        ['<code>DetailView</code>', 'one object by <code>pk</code>/<code>slug</code>, 404 if missing', '<code>get_object</code>, <code>get_queryset</code>'],
        ['<code>CreateView</code> / <code>UpdateView</code>', 'ModelForm, validation, redirect', '<code>form_valid</code>, <code>get_success_url</code>'],
        ['<code>DeleteView</code>', 'confirm + delete + redirect', '<code>form_valid</code> (Django 4+)']
      ])}
      <p><b>Mixins</b> such as <code>LoginRequiredMixin</code>, <code>PermissionRequiredMixin</code> and <code>UserPassesTestMixin</code> must be listed <b>left</b> of the view base so their <code>dispatch</code> runs first in the MRO.</p>`,
    clues: [
      '"405 Method Not Allowed" → the CBV has no handler for that method; check <code>http_method_names</code> and the <code>Allow</code> header',
      '"login check does not run" → mixin placed right of the view base (MRO order)',
      '"state leaks between requests in my view" → class attributes are shared; instance attributes are per request',
      '"only list objects owned by the user" → override <code>get_queryset()</code>, not the template',
      '"function vs class views, which is better?" → trade-off: explicitness vs reuse via inheritance',
      '"async view" → <code>async def</code> FBV or a CBV whose handlers are all <code>async def</code>'
    ],
    code: [{ lang: 'python', check: false, title: 'FBV and CBV for the same page', code: R`
from django.contrib.auth.decorators import login_required
from django.contrib.auth.mixins import LoginRequiredMixin
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_http_methods
from django.views.generic import ListView, UpdateView

from .forms import PostForm
from .models import Post


@login_required
@require_http_methods(["GET", "POST"])
def post_edit(request, pk):
    post = get_object_or_404(Post, pk=pk, author=request.user)
    form = PostForm(request.POST or None, instance=post)
    if request.method == "POST" and form.is_valid():
        form.save()
        return redirect("blog:detail", pk=post.pk)
    return render(request, "blog/post_form.html", {"form": form})


class PostEdit(LoginRequiredMixin, UpdateView):      # mixin FIRST
    model = Post
    form_class = PostForm

    def get_queryset(self):                           # authorization lives here
        return Post.objects.filter(author=self.request.user)


class PostList(ListView):
    queryset = Post.objects.select_related("author").order_by("-created")
    paginate_by = 20
` }, { lang: 'python', run: true, title: 'as_view() and dispatch() in miniature', code: R`
class Request:
    def __init__(self, method):
        self.method = method

class MiniView:
    http_method_names = ["get", "post", "put", "patch", "delete", "head", "options"]

    @classmethod
    def as_view(cls):
        def view(request, **kwargs):
            self = cls()                                   # new object every request
            return self.dispatch(request, **kwargs)
        return view

    def dispatch(self, request, **kwargs):
        name = request.method.lower()
        handler = getattr(self, name, None) if name in self.http_method_names else None
        return handler(request, **kwargs) if handler else (405, "Method Not Allowed")

class Hello(MiniView):
    def get(self, request, name="world"):
        return (200, f"hello {name}")

view = Hello.as_view()
print(view(Request("GET"), name="Ada"))
print(view(Request("DELETE")))
` }],
    viz: {
      title: 'A request through as_view() → setup() → dispatch() → handler',
      input: 'POST',
      inputLabel: 'HTTP method sent to a view that defines only get()',
      gen: function (input) {
        var m = String(input === undefined ? 'POST' : input).trim().toUpperCase() || 'GET';
        if (!/^[A-Z]{1,10}$/.test(m)) throw new Error('Type an HTTP method like GET, POST, HEAD, OPTIONS');
        var known = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'TRACE'];
        var N = [['U', 'URLconf', 10, 20], ['V', 'view() closure', 30, 20], ['I', 'new instance', 50, 20], ['D', 'dispatch()', 70, 20], ['H', 'handler', 90, 10], ['X', '405 + Allow', 90, 34]];
        var E = [['U', 'V'], ['V', 'I'], ['I', 'D'], ['D', 'H'], ['D', 'X']];
        var target = (m === 'GET' || m === 'HEAD' || m === 'OPTIONS') ? 'H' : 'X';
        var handler = m === 'GET' ? 'get()' : m === 'HEAD' ? 'head = get (set in setup)' : m === 'OPTIONS' ? 'View.options()' : 'http_method_not_allowed()';
        var steps = [
          { narr: 'The resolver found <code>path("hello/", Hello.as_view())</code>. <code>as_view()</code> ran <b>once at import time</b> and returned a plain function, because URLconfs need callables.', hl: { U: 'cur' }, parts: [{ type: 'code', label: 'django.views.View (simplified)', lang: 'python', code: CBV_CODE, hl: { 3: 'cur', 8: 'cur' } }] },
          { narr: 'A <b>' + esc(m) + '</b> request arrives. The closure creates a <b>fresh</b> <code>Hello()</code> instance, so nothing stored on <code>self</code> leaks into another request.', hl: { V: 'cur', I: 'ok' }, ehl: { 'V-I': 'ok' }, parts: [{ type: 'code', label: 'django.views.View (simplified)', lang: 'python', code: CBV_CODE, hl: { 4: 'cur', 5: 'cur' } }] },
          { narr: '<code>setup()</code> stores <code>self.request</code>, <code>self.args</code>, <code>self.kwargs</code>; because the class has <code>get</code> but no <code>head</code>, it also sets <code>self.head = self.get</code>.', hl: { I: 'cur' }, parts: [{ type: 'vars', label: 'instance state', vals: { 'self.request.method': m, 'self.kwargs': '{}', 'self.head': 'self.get' } }] },
          { narr: '<code>dispatch()</code> lowercases the method to <code>' + esc(m.toLowerCase()) + '</code>. ' + (known.indexOf(m) < 0 ? 'It is not in <code>http_method_names</code>, so the handler is <code>http_method_not_allowed</code>.' : 'It is in <code>http_method_names</code>; <code>getattr(self, "' + esc(m.toLowerCase()) + '", http_method_not_allowed)</code> picks the handler.'), hl: { D: 'cur' }, ehl: { 'I-D': 'ok' }, parts: [{ type: 'code', label: 'dispatch', lang: 'python', code: CBV_CODE, hl: { 10: 'cur', 11: 'cur', 12: 'cur', 14: 'cur' } }] },
          { narr: target === 'H' ? 'Handler: <b>' + handler + '</b> → 200 response.' : 'Handler: <b>http_method_not_allowed()</b> → <b>405</b> with <code>Allow: GET, HEAD, OPTIONS</code> (computed from the methods the instance actually has).', hl: (function () { var o = {}; o[target] = target === 'H' ? 'ok' : 'bad'; return o; })(), ehl: (function () { var o = {}; o['D-' + target] = target === 'H' ? 'ok' : 'bad'; return o; })(), parts: [{ type: 'vars', label: 'response', vals: target === 'H' ? { status: 200, via: handler } : { status: 405, Allow: 'GET, HEAD, OPTIONS' } }] },
          { narr: 'The response goes back up through middleware. Mixins like <code>LoginRequiredMixin</code> work by overriding <code>dispatch()</code> and calling <code>super().dispatch()</code> only when the check passes, which is why they must come first in the bases.', hl: { D: 'sel' }, parts: [] }
        ];
        return walk('Class-based view request flow', N, E, steps, 44);
      }
    },
    examples: [
      { title: 'Mixin order decides whether the login check runs', html: R`<p><code>class V(ListView, LoginRequiredMixin)</code> puts <code>View.dispatch</code> before the mixin in the MRO, so the check is skipped. <code>class V(LoginRequiredMixin, ListView)</code> is correct. Run the miniature below and compare the MRO.</p>`, code: { lang: 'python', run: true, code: R`
class Base:
    def dispatch(self):
        return "page"

class LoginRequired:
    def dispatch(self):
        return "login check -> " + super().dispatch()

class Good(LoginRequired, Base): pass
class Bad(Base, LoginRequired): pass
print(Good().dispatch())
print(Bad().dispatch())
print([c.__name__ for c in Bad.__mro__])
` } },
      { title: 'Class attributes are shared, instance attributes are not', html: R`<p>A list defined at class level (<code>items = []</code>) is shared by every request handled by that process. Since <code>as_view()</code> creates a new instance each time, assign per-request state in <code>setup()</code> or the handler.</p>`, code: { lang: 'python', run: true, code: R`
class Leaky:
    seen = []                      # shared across all instances
    def get(self, user):
        self.seen.append(user)
        return list(self.seen)

print(Leaky().get("ann"))
print(Leaky().get("bob"))          # bob sees ann: data leak between requests
` } },
      { title: 'Generic views: override the narrowest hook', html: R`<p>To restrict a <code>DetailView</code> to the owner, override <code>get_queryset()</code>: <code>get_object()</code> then returns 404 for other users' objects (no information leak), and pagination/templating keep working.</p>`, code: { lang: 'python', check: false, code: R`
class InvoiceDetail(LoginRequiredMixin, DetailView):
    model = Invoice

    def get_queryset(self):
        return super().get_queryset().filter(owner=self.request.user)
` } }
    ],
    deepDive: R`<p>🟣 <b>How as_view() really works.</b> It validates <code>initkwargs</code> (a key that is an HTTP method name or not an existing class attribute raises <code>TypeError</code>), builds a closure <code>view</code>, and copies <code>view_class</code>/<code>view_initkwargs</code> onto it for introspection. Since Django 4.1, if every handler is <code>async def</code>, <code>as_view()</code> marks the view as a coroutine function so ASGI runs it natively; mixing sync and async handlers raises <code>ImproperlyConfigured</code>. <b>Generic views are built from mixins</b>: <code>DetailView = SingleObjectTemplateResponseMixin + BaseDetailView(SingleObjectMixin, View)</code>. Reading the source (or ccbv.co.uk) shows which hook calls which. <b>Trade-offs:</b> FBVs are explicit and greppable; CBVs shine when many pages share behaviour, but deep hierarchies hide control flow. Many teams use FBVs or plain <code>View</code> subclasses for business endpoints and generic views for CRUD pages. <b>Responses:</b> <code>HttpResponse</code>, <code>JsonResponse</code>, <code>StreamingHttpResponse</code>, <code>FileResponse</code>, and <code>TemplateResponse</code> (lazy rendering, so middleware can modify the context before render).</p>`,
    aiEra: R`<p>🤖 <b>AI and views.</b> Assistants love to generate CBVs with four mixins and overridden <code>get_context_data</code> even for a two-line page, or FBVs that forget <code>require_http_methods</code> and CSRF. They also mix up <code>DeleteView.delete()</code> (pre Django 4.0 hook) with <code>form_valid()</code> (current), and put the permission check in the template. <b>What to keep in your head:</b> the view contract (request in, response out), the <code>as_view → setup → dispatch</code> chain, mixin order, and "authorise in <code>get_queryset</code>". A good prompt: <code>Rewrite this CBV as an FBV and list every behaviour the generic view gave us implicitly (404s, pagination, redirects, 405s) so I can confirm nothing was lost.</code></p>`,
    problems: [{
      title: 'Implement View.as_view() and dispatch() with 405 and HEAD fallback',
      level: 'Medium', tags: ['django', 'class-based views', 'closures', 'http methods'], companies: ['Eventbrite', 'Sentry', 'Zapier'],
      statement: R`<p>Implement a miniature of Django's <code>View</code> plus <code>HttpResponse</code> and <code>Request</code>:</p>
        <ul><li><code>Request(method)</code> stores <code>method</code>. <code>HttpResponse(content='', status=200)</code> has <code>content</code>, <code>status</code> and a <code>headers</code> dict.</li>
        <li><code>View.http_method_names = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace']</code>.</li>
        <li><code>as_view(**initkwargs)</code>: raise <code>TypeError</code> if a key is an HTTP method name or not an existing class attribute. Return a function <code>view(request, *args, **kwargs)</code> that creates a <b>new instance</b> with the initkwargs as attributes, calls <code>setup</code> then <code>dispatch</code>. Set <code>view.view_class = cls</code>.</li>
        <li><code>setup</code>: if the instance has <code>get</code> but no <code>head</code>, set <code>self.head = self.get</code>; store request/args/kwargs.</li>
        <li><code>dispatch</code>: lowercase the method; unknown or missing handler → status 405 with header <code>Allow</code> = upper-case names (in <code>http_method_names</code> order) of methods the instance has, joined by <code>", "</code>.</li>
        <li><code>options()</code> exists on every view: status 200, the same <code>Allow</code> header.</li></ul>`,
      constraints: R`Handlers return <code>HttpResponse</code> objects. Methods may arrive in any case.`,
      example: R`<p>A view with only <code>get</code>: GET → ${H.c('g', '200')}; POST → ${H.c('r', '405, Allow: GET, HEAD, OPTIONS')}; HEAD → ${H.c('g', '200 via get')}.</p>`,
      brute: {
        why: R`<p>A single shared view instance with an <code>if/elif</code> chain works until two requests run at once: anything stored on <code>self</code> is shared, and every new method needs another branch plus a hand-maintained Allow list.</p>`,
        code: R`
          class SharedView:
              def __call__(self, request):
                  self.request = request                     # shared between requests!
                  if request.method == "GET":
                      return (200, "ok")
                  return (405, "GET")                        # Allow list kept by hand

          view = SharedView()
          print(view(type("R", (), {"method": "POST"})()))
        `
      },
      mcq: { q: 'Why does <code>as_view()</code> create a new instance inside the closure instead of once?', options: ['So per-request state on <code>self</code> is never shared between concurrent requests', 'Because Python cannot store instances in closures', 'To make HEAD work', 'To speed up dispatch'], answer: 0, explain: 'Views often store <code>self.object</code>, <code>self.request</code> and similar. One instance per request makes that safe under threads.' },
      hints: [
        R`<p>Hint 1: <code>as_view</code> is a <code>@classmethod</code> returning an inner function that closes over <code>cls</code> and <code>initkwargs</code>.</p>`,
        R`<p>Hint 2: <code>getattr(self, method, self.http_method_not_allowed)</code> picks the handler; build the Allow list with <code>[m.upper() for m in self.http_method_names if hasattr(self, m)]</code>.</p>`,
        R`<p>Hint 3: Do the HEAD fallback in <code>setup()</code> (instance level). Validate initkwargs before building the closure: method names and unknown attributes both raise <code>TypeError</code>.</p>`
      ],
      tests: { sig: 'string[] -> string[]', fn: 'run_lines', harness: { python: PYT }, cases: [
        [[["class Hello(View):\n    greeting = 'hi'\n    def get(self, request, name='you'):\n        return HttpResponse(self.greeting + ' ' + name)",
          'v = Hello.as_view()',
          "v(Request('GET')).content",
          "v(Request('GET'), name='Ada').content",
          "r = v(Request('POST'))",
          'r.status',
          "r.headers['Allow']"]],
         ["'hi you'", "'hi Ada'", '405', "'GET, HEAD, OPTIONS'"]],
        [[["class Hello(View):\n    greeting = 'hi'\n    def get(self, request, name='you'):\n        return HttpResponse(self.greeting + ' ' + name)",
          "Hello.as_view(greeting='yo')(Request('GET')).content",
          "Hello.as_view(colour='red')",
          'Hello.as_view(get=1)',
          'Hello.as_view().view_class.__name__']],
         ["'yo you'", '!TypeError', '!TypeError', "'Hello'"]],
        [[["class Hello(View):\n    def get(self, request):\n        return HttpResponse('body')",
          "r = Hello.as_view()(Request('HEAD'))",
          'r.status',
          'r.content',
          "o = Hello.as_view()(Request('OPTIONS'))",
          'o.status',
          "o.headers['Allow']"]],
         ['200', "'body'", '200', "'GET, HEAD, OPTIONS'"]],
        [[["class Hello(View):\n    def get(self, request):\n        return HttpResponse('x')",
          "Hello.as_view()(Request('BREW')).status",
          "Hello.as_view()(Request('get')).status",
          "Hello.as_view()(Request('TRACE')).status"]],
         ['405', '200', '405']],
        [[["class Counter(View):\n    def get(self, request):\n        self.n = getattr(self, 'n', 0) + 1\n        return HttpResponse(str(self.n))",
          'c = Counter.as_view()',
          "[c(Request('GET')).content for _ in range(3)]"]],
         ["['1', '1', '1']"]],
        [[["class Api(View):\n    def post(self, request):\n        return HttpResponse('made', status=201)\n    def delete(self, request):\n        return HttpResponse(status=204)",
          "Api.as_view()(Request('GET')).headers['Allow']",
          "Api.as_view()(Request('DELETE')).status",
          "Api.as_view()(Request('post')).content",
          "Api.as_view()(Request('HEAD')).status"]],
         ["'POST, DELETE, OPTIONS'", '204', "'made'", '405']]
      ] },
      solution: {
        approach: R`<p>Mirror Django: <code>as_view</code> validates configuration once and returns a closure; the closure builds a new instance per request, <code>setup</code> wires request state and the HEAD fallback, and <code>dispatch</code> maps the lower-cased method name to a bound method, falling back to a 405 that advertises exactly the methods this instance supports.</p>`,
        code: { lang: 'python', run: true, code: R`
class Request:
    def __init__(self, method):
        self.method = method


class HttpResponse:
    def __init__(self, content="", status=200):
        self.content, self.status, self.headers = content, status, {}

    def __repr__(self):
        return f"<HttpResponse {self.status} {self.content!r}>"


class View:
    http_method_names = ["get", "post", "put", "patch", "delete", "head", "options", "trace"]

    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)

    @classmethod
    def as_view(cls, **initkwargs):
        for key in initkwargs:
            if key in cls.http_method_names:
                raise TypeError(f"{key!r} is a method name, not a valid keyword")
            if not hasattr(cls, key):
                raise TypeError(f"{cls.__name__} has no attribute {key!r}")

        def view(request, *args, **kwargs):
            self = cls(**initkwargs)
            self.setup(request, *args, **kwargs)
            return self.dispatch(request, *args, **kwargs)

        view.view_class = cls
        view.view_initkwargs = initkwargs
        return view

    def setup(self, request, *args, **kwargs):
        if hasattr(self, "get") and not hasattr(self, "head"):
            self.head = self.get
        self.request, self.args, self.kwargs = request, args, kwargs

    def dispatch(self, request, *args, **kwargs):
        method = request.method.lower()
        if method in self.http_method_names:
            handler = getattr(self, method, self.http_method_not_allowed)
        else:
            handler = self.http_method_not_allowed
        return handler(request, *args, **kwargs)

    def _allowed_methods(self):
        return [m.upper() for m in self.http_method_names if hasattr(self, m)]

    def http_method_not_allowed(self, request, *args, **kwargs):
        response = HttpResponse(status=405)
        response.headers["Allow"] = ", ".join(self._allowed_methods())
        return response

    def options(self, request, *args, **kwargs):
        response = HttpResponse()
        response.headers["Allow"] = ", ".join(self._allowed_methods())
        return response


class Hello(View):
    def get(self, request, name="you"):
        return HttpResponse("hi " + name)

v = Hello.as_view()
print(v(Request("GET"), name="Ada"))
r = v(Request("POST"))
print(r, r.headers)
print(v(Request("HEAD")))
` },
        dry: { head: ['request', 'setup()', 'dispatch lookup', 'response'], rows: [
          ['GET', 'head = get', 'self.get', '200'],
          ['HEAD', 'head = get', 'self.head (= get)', '200'],
          ['POST', 'head = get', 'no post → http_method_not_allowed', '405, Allow: GET, HEAD, OPTIONS'],
          ['BREW', 'head = get', 'not in http_method_names', '405'],
          ['OPTIONS', 'head = get', 'View.options', '200 + Allow']
        ] },
        complexity: R`<p>O(1) per request plus O(k) to build the Allow header for k method names.</p>`,
        followUps: ['Add a <code>LoginRequiredMixin</code> that overrides <code>dispatch</code> and returns 302 for anonymous users', 'Detect a class whose handlers mix <code>async def</code> and <code>def</code> and raise like Django does']
      }
    }]
  });

  /* ======================================================================
     TOPIC 3: The ORM — models, lazy querysets, F and Q
     ====================================================================== */
  var QS_CODE = [
    'qs = Book.objects.filter(year__gt=1850)   # no SQL yet',
    'qs = qs.exclude(price__gte=12)            # still no SQL (new QuerySet)',
    'qs = qs.order_by("-price")                # still no SQL',
    'titles = [b.title for b in qs]            # iterating -> 1 query, cache filled',
    'len(qs)                                   # uses the cache, 0 queries',
    'qs.count()                                # cache present -> len(), 0 queries',
    'qs.filter(price=7)                        # new QuerySet: cache NOT shared',
    'qs.filter(price=7).exists()               # 1 new query'
  ].join('\n');

  topics.push({
    title: 'The ORM: Models, Lazy QuerySets, Lookups, F and Q Expressions',
    analogy: R`<p>A QuerySet is a <b>shopping list</b>, not the shopping. Writing "milk, only organic, cheapest first" on paper costs nothing; you can copy the list and add lines to the copy. Only when you <b>walk into the shop</b> (iterate, <code>len()</code>, <code>list()</code>, <code>bool()</code>, printing) does anyone go to the database. After that trip the bag of groceries (the <b>result cache</b>) sits on that list, so looking at it again is free. An <b>F expression</b> is a note to the shop assistant: "take whatever is on the shelf now and add one", instead of you counting at home and shouting a number.</p>`,
    explain: R`<p>🟢 <b>Models.</b> A model is a class whose attributes are fields; one class = one table, one instance = one row. <code>Book.objects</code> is a <b>manager</b> that starts queries.</p>
      <p><b>QuerySets are lazy and chainable.</b> <code>filter()</code>, <code>exclude()</code>, <code>order_by()</code>, <code>select_related()</code>, <code>annotate()</code>, slicing without a step… each returns a <b>new</b> QuerySet and runs <b>no SQL</b>. SQL runs when the QuerySet is <b>evaluated</b>: iteration, <code>len()</code>, <code>list()</code>, <code>bool()</code>, <code>repr()</code>, pickling, or slicing with a step. Some methods always query: <code>count()</code>, <code>exists()</code>, <code>get()</code>, <code>first()</code>, <code>aggregate()</code>, <code>update()</code>, <code>delete()</code> (but <code>count()</code>/<code>exists()</code> reuse an already-filled cache).</p>
      ${H.table(['Lookup', 'SQL idea', 'Example'], [
        ['<code>exact</code> (default)', '<code>= x</code> / <code>IS NULL</code> for None', '<code>filter(year=1965)</code>'],
        ['<code>gt gte lt lte</code>', '<code>&gt; &gt;= &lt; &lt;=</code>', '<code>filter(price__lte=10)</code>'],
        ['<code>in</code>', '<code>IN (…)</code>', '<code>filter(id__in=[1, 4])</code>'],
        ['<code>icontains</code>, <code>startswith</code>', '<code>LIKE</code> (case-insensitive / prefix)', '<code>filter(title__icontains="dune")</code>'],
        ['<code>isnull</code>', '<code>IS [NOT] NULL</code>', '<code>filter(rating__isnull=True)</code>'],
        ['<code>author__name</code>', 'JOIN across a relation', '<code>filter(author__name="Herbert")</code>']
      ])}
      <p><b>Q objects</b> combine conditions with <code>|</code> (OR), <code>&amp;</code> (AND) and <code>~</code> (NOT): <code>Book.objects.filter(Q(year__lt=1900) | Q(rating=5))</code>. Keyword arguments in one <code>filter()</code> call are ANDed.</p>
      <p><b>F expressions</b> refer to a column's value <b>inside the database</b>: <code>Product.objects.filter(pk=1).update(stock=F("stock") - 1)</code> becomes <code>UPDATE … SET stock = stock - 1</code>, which is atomic, so two concurrent requests cannot lose an update. <code>filter(sold__gt=F("stock"))</code> compares two columns.</p>`,
    clues: [
      '"why does this page run the same query twice?" → a QuerySet evaluated twice, or a new QuerySet built each time (cache is per object)',
      '"counter is wrong under load / lost update" → read-modify-write in Python; use <code>F()</code> in <code>update()</code> or <code>select_for_update()</code>',
      '"OR condition" / "NOT condition" in the ORM → <code>Q</code> objects',
      '"compare two columns of the same row" → <code>F()</code>',
      '"how many rows?" → <code>count()</code> (SQL COUNT) instead of <code>len(qs)</code> if you will not use the rows',
      '"just check if anything exists" → <code>exists()</code>'
    ],
    code: [{ lang: 'python', check: false, title: 'Models and everyday queries', code: R`
from django.db import models
from django.db.models import Count, F, Q


class Author(models.Model):
    name = models.CharField(max_length=100)


class Book(models.Model):
    title = models.CharField(max_length=200)
    year = models.IntegerField()
    price = models.DecimalField(max_digits=8, decimal_places=2)
    stock = models.PositiveIntegerField(default=0)
    author = models.ForeignKey(Author, on_delete=models.CASCADE, related_name="books")

    class Meta:
        ordering = ["title"]
        indexes = [models.Index(fields=["year"])]


old_or_cheap = Book.objects.filter(Q(year__lt=1900) | Q(price__lte=5)).exclude(stock=0)
by_author = Author.objects.annotate(n=Count("books")).filter(n__gte=3)
Book.objects.filter(pk=7).update(stock=F("stock") - 1)        # atomic decrement in SQL
print(old_or_cheap.query)                                      # see the SQL without running it
` }, { lang: 'python', run: true, title: 'Laziness in miniature: building is free, evaluating costs a query', code: R`
class MiniQS:
    queries = 0
    def __init__(self, rows, conds=()):
        self.rows, self.conds, self._cache = rows, conds, None
    def filter(self, fn):
        return MiniQS(self.rows, self.conds + (fn,))       # new object, no query
    def __iter__(self):
        if self._cache is None:
            MiniQS.queries += 1                            # pretend SQL runs here
            self._cache = [r for r in self.rows if all(c(r) for c in self.conds)]
        return iter(self._cache)

qs = MiniQS([5, 12, 7, 30]).filter(lambda p: p > 6).filter(lambda p: p < 20)
print("queries after chaining:", MiniQS.queries)
print(list(qs), list(qs))
print("queries after two loops:", MiniQS.queries)
` }],
    viz: {
      title: 'When does a QuerySet hit the database?',
      gen: function () {
        var hl = function (n) { var o = {}; o[n] = 'cur'; return o; };
        var states = [
          [1, 0, 'none', 'filter() returns a new QuerySet holding a WHERE clause. No SQL.'],
          [2, 0, 'none', 'exclude() clones again. Still no SQL: building queries is just object creation.'],
          [3, 0, 'none', 'order_by() clones again. You can pass this QuerySet around freely.'],
          [4, 1, '3 rows', '<b>Iteration evaluates</b>: Django sends one SELECT, builds model instances and stores them in <code>qs._result_cache</code>.'],
          [5, 1, '3 rows', '<code>len(qs)</code> reads the cache. No SQL.'],
          [6, 1, '3 rows', '<code>count()</code> sees a filled cache and returns <code>len(cache)</code>. Without a cache it would run <code>SELECT COUNT(*)</code>.'],
          [7, 1, '3 rows', '<code>qs.filter(...)</code> is a <b>new</b> QuerySet with an empty cache. The old cache cannot answer a different question.'],
          [8, 2, '3 rows', '<code>exists()</code> on the new QuerySet runs <code>SELECT 1 … LIMIT 1</code>: a second query.']
        ];
        return states.map(function (s) {
          return { narr: s[3], parts: [
            { type: 'code', label: 'Python', lang: 'python', code: QS_CODE, hl: hl(s[0]) },
            { type: 'vars', label: 'connection.queries', vals: { 'queries run': s[1], 'qs._result_cache': s[2] }, hl: s[0] === 4 || s[0] === 8 ? { 'queries run': 'ok' } : {} }
          ] };
        });
      }
    },
    examples: [
      { title: 'Lost update: Python arithmetic vs F()', html: R`<p>Two requests read <code>views = 10</code>, both add 1 in Python and both save 11. With <code>F("views") + 1</code> the database does the addition under its row lock, so the result is 12. After an F update, call <code>refresh_from_db()</code> if you need the new value in Python.</p>`, code: { lang: 'python', run: true, code: R`
db = {"views": 10}
a = db["views"]; b = db["views"]          # both requests read 10
db["views"] = a + 1; db["views"] = b + 1  # both write 11
print("python arithmetic:", db["views"])

db = {"views": 10}
for _ in range(2):
    db["views"] += 1                      # what UPDATE ... SET views = views + 1 does
print("F expression:", db["views"])
` } },
      { title: 'exclude() and NULL: why ~Q includes rows with NULL', html: R`<p><code>Book.objects.exclude(rating__lt=4)</code> returns books whose rating is ≥ 4 <b>and books with NULL rating</b>. SQL comparison with NULL is unknown, so Django writes <code>NOT (rating &lt; 4 AND rating IS NOT NULL)</code> to give the intuitive Python meaning "not known to be below 4".</p>`, code: { lang: 'python', check: false, code: R`
Book.objects.exclude(rating__lt=4)
# WHERE NOT ("rating" < 4 AND "rating" IS NOT NULL)
Book.objects.filter(rating__gte=4)
# WHERE "rating" >= 4      (NULL rows NOT included)
` } },
      { title: 'Aggregation vs annotation', html: R`<p><code>aggregate()</code> collapses the whole QuerySet to one dict (<code>{'avg': 9.5}</code>) and runs immediately. <code>annotate()</code> adds a computed column <b>per row</b> (GROUP BY) and stays lazy. <code>values("author").annotate(n=Count("id"))</code> groups by author.</p>`, code: { lang: 'python', check: false, code: R`
from django.db.models import Avg, Count
Book.objects.aggregate(avg=Avg("price"))                       # {'avg': Decimal('9.50')}
Author.objects.annotate(n=Count("books")).order_by("-n")[:5]   # top 5 authors by book count
Book.objects.values("year").annotate(n=Count("id"))            # GROUP BY year
` } }
    ],
    deepDive: R`<p>🟣 <b>Inside a QuerySet.</b> A QuerySet wraps a <code>sql.Query</code> object (the WHERE tree, joins, ordering, limits). Chaining calls <code>_chain()</code> → <code>_clone()</code>, which copies the Query; the new object has <code>_result_cache = None</code>. Evaluation calls <code>_fetch_all()</code>, which runs the compiler (<code>SQLCompiler.as_sql()</code>), iterates the cursor in chunks of 100 rows (<code>GET_ITERATOR_CHUNK_SIZE</code>) and builds instances. <code>.iterator(chunk_size=2000)</code> streams rows without caching (uses server-side cursors on PostgreSQL), essential for millions of rows. Indexing an unevaluated QuerySet (<code>qs[0]</code>) runs a <code>LIMIT 1</code> query and does not fill the cache; negative indexing raises <code>ValueError</code>; filtering after slicing raises <code>TypeError</code>.</p>
      <p><b>Expressions:</b> <code>F</code>, <code>Value</code>, <code>Func</code>, <code>Case/When</code>, <code>Subquery/OuterRef</code>, <code>Exists</code>, and window functions (<code>Window(RowNumber(), …)</code>) compile to SQL so the database does the work. <b>Escape hatches:</b> <code>.raw()</code> and <code>connection.cursor()</code> with parameters (never string formatting, to avoid SQL injection). <b>Debugging:</b> <code>str(qs.query)</code>, <code>qs.explain()</code>, <code>connection.queries</code> (with <code>DEBUG=True</code>), django-debug-toolbar.</p>`,
    aiEra: R`<p>🤖 <b>AI and the ORM.</b> Assistants translate SQL to ORM calls well, and they are a good way to learn unfamiliar expressions (<code>Subquery</code>, <code>Window</code>). Typical mistakes: <code>len(qs)</code> to count a million rows, <code>if qs:</code> when <code>exists()</code> was meant, read-modify-write instead of <code>F()</code>, filtering in Python after fetching everything, and confusing <code>exclude(a, b)</code> (NOT (a AND b)) with <code>exclude(a).exclude(b)</code>. <b>Habit:</b> ask the model to print <code>str(qs.query)</code> for each query it writes and count queries in a test with <code>assertNumQueries</code>. You must be able to say, for any line, whether it hits the database.</p>`,
    problems: [{
      title: 'Build a lazy QuerySet with a result cache and query counter',
      level: 'Medium', tags: ['django orm', 'laziness', 'caching', 'lookups'], companies: ['Instagram', 'Pinterest', 'Robinhood'],
      statement: R`<p>Implement <code>DB(rows)</code> (with a <code>queries</code> counter starting at 0, and <code>fields</code> = keys of the first row) and <code>QuerySet(db)</code>:</p>
        <ul><li><code>filter(**kw)</code>, <code>exclude(**kw)</code>, <code>order_by(*fields)</code> (prefix <code>-</code> for descending) return <b>new</b> QuerySets and never query. Lookups: <code>exact</code> (default), <code>gt gte lt lte in icontains startswith isnull</code>. Unknown field or lookup → <code>FieldError</code> at call time.</li>
        <li>Evaluation (<code>iter</code>, <code>len</code>, <code>bool</code>, <code>list</code>) runs one query (<code>db.queries += 1</code>) and fills the cache; later evaluations reuse it.</li>
        <li><code>count()</code> and <code>exists()</code> use the cache if present, otherwise run one query and do not fill the cache.</li>
        <li><code>qs[i]</code>: negative → <code>ValueError</code>; uses the cache if filled, otherwise one query (cache not filled). <code>qs[a:b]</code> (no step) returns a new lazy QuerySet; filtering a sliced QuerySet raises <code>TypeError</code>.</li>
        <li>Rows keep their original order unless <code>order_by</code> is used. Comparisons with <code>None</code> are false.</li></ul>`,
      constraints: R`Up to 10<sup>4</sup> rows of dicts. Rows are never mutated.`,
      example: R`<p><code>qs = QuerySet(db).filter(year__gt=1850).order_by("-price")</code> → ${H.c('m', 'db.queries == 0')}; <code>[b["title"] for b in qs]</code> → ${H.c('g', "['Neuromancer', 'Dune', 'Dracula']")} and ${H.c('b', 'db.queries == 1')}; <code>len(qs)</code> → 3, still 1 query.</p>`,
      brute: {
        why: R`<p>An eager version filters immediately on every call: chaining three methods scans the table three times, and nothing remembers results, so every loop over the same QuerySet re-queries.</p>`,
        code: R`
          class EagerQS:
              def __init__(self, db, rows=None):
                  self.db = db
                  if rows is None:
                      db.queries += 1
                      rows = list(db.rows)
                  self.rows = rows
              def filter(self, **kw):
                  self.db.queries += 1                       # a query per call
                  return EagerQS(self.db, [r for r in self.rows if all(r[k] == v for k, v in kw.items())])

          class FakeDB:
              def __init__(self, rows):
                  self.rows, self.queries = rows, 0

          d = FakeDB([{"a": 1}, {"a": 2}])
          EagerQS(d).filter(a=1).filter(a=1)
          print(d.queries)
        `
      },
      mcq: { q: 'Which call on an unevaluated QuerySet does <b>not</b> fill its result cache?', options: ['<code>qs.count()</code>', '<code>list(qs)</code>', '<code>len(qs)</code>', '<code>for x in qs</code>'], answer: 0, explain: '<code>count()</code> runs <code>SELECT COUNT(*)</code> and returns a number; only full evaluation stores rows in the cache.' },
      hints: [
        R`<p>Hint 1: Store conditions as data: a tuple of <code>(negate, field, lookup, value)</code>. <code>_clone()</code> copies them into a new object with an empty cache.</p>`,
        R`<p>Hint 2: One private <code>_fetch()</code> applies filters, ordering (sort by fields in reverse order of significance, using <code>reverse=True</code> for <code>-field</code>) and the slice, increments <code>db.queries</code>, and returns rows; <code>_fill()</code> stores them in the cache.</p>`,
        R`<p>Hint 3: Split <code>"year__gt"</code> with <code>rpartition("__")</code> only when the suffix is a known lookup. Check field and lookup inside <code>filter</code> so errors are raised early. Make <code>None</code> fail every comparison except <code>exact</code> with None and <code>isnull</code>.</p>`
      ],
      tests: { sig: 'string[] -> string[]', fn: 'run_lines', harness: { python: PYT }, cases: [
        [[["BOOKS = [{'id': 1, 'title': 'Dune', 'year': 1965, 'price': 9}, {'id': 2, 'title': 'Emma', 'year': 1815, 'price': 5}, {'id': 3, 'title': 'Dracula', 'year': 1897, 'price': 7}, {'id': 4, 'title': 'Neuromancer', 'year': 1984, 'price': 12}]",
           'db = DB(BOOKS)',
           "qs = QuerySet(db).filter(year__gt=1850).order_by('-price')",
           'db.queries',
           "[b['title'] for b in qs]",
           'db.queries',
           'len(qs)',
           'db.queries']],
         ['0', "['Neuromancer', 'Dune', 'Dracula']", '1', '3', '1']],
        [[["BOOKS = [{'id': 1, 'title': 'Dune', 'year': 1965, 'price': 9}, {'id': 2, 'title': 'Emma', 'year': 1815, 'price': 5}, {'id': 3, 'title': 'Dracula', 'year': 1897, 'price': 7}, {'id': 4, 'title': 'Neuromancer', 'year': 1984, 'price': 12}]",
           'db = DB(BOOKS)',
           "qs = QuerySet(db).filter(title__icontains='d')",
           'qs.count()',
           'qs.count()',
           'db.queries',
           'bool(qs)',
           'db.queries',
           'qs.count()',
           'db.queries']],
         ['2', '2', '2', 'True', '3', '2', '3']],
        [[["BOOKS = [{'id': 1, 'title': 'Dune', 'year': 1965, 'price': 9}, {'id': 2, 'title': 'Emma', 'year': 1815, 'price': 5}, {'id': 3, 'title': 'Dracula', 'year': 1897, 'price': 7}, {'id': 4, 'title': 'Neuromancer', 'year': 1984, 'price': 12}]",
           'db = DB(BOOKS)',
           'base = QuerySet(db)',
           'cheap = base.filter(price__lte=7)',
           'old = cheap.exclude(year__gte=1850)',
           "[b['id'] for b in old]",
           "[b['id'] for b in cheap]",
           'db.queries',
           'base is cheap']],
         ['[2]', '[2, 3]', '2', 'False']],
        [[["BOOKS = [{'id': 1, 'title': 'Dune', 'year': 1965, 'price': 9}, {'id': 2, 'title': 'Emma', 'year': 1815, 'price': 5}, {'id': 3, 'title': 'Dracula', 'year': 1897, 'price': 7}, {'id': 4, 'title': 'Neuromancer', 'year': 1984, 'price': 12}]",
           'db = DB(BOOKS)',
           "qs = QuerySet(db).order_by('year')",
           "qs[0]['title']",
           "qs[0]['title']",
           'db.queries',
           'qs[-1]',
           "list(qs)[-1]['title']",
           "qs[1]['title']",
           'db.queries']],
         ["'Emma'", "'Emma'", '2', '!ValueError', "'Neuromancer'", "'Dracula'", '3']],
        [[["BOOKS = [{'id': 1, 'title': 'Dune', 'year': 1965, 'price': 9}, {'id': 2, 'title': 'Emma', 'year': 1815, 'price': 5}, {'id': 3, 'title': 'Dracula', 'year': 1897, 'price': 7}, {'id': 4, 'title': 'Neuromancer', 'year': 1984, 'price': 12}]",
           'db = DB(BOOKS)',
           "s = QuerySet(db).order_by('id')[1:3]",
           'db.queries',
           "[b['id'] for b in s]",
           's.filter(price=5)',
           'db.queries',
           "[b['id'] for b in QuerySet(db).order_by('-year', 'id')[:2]]"]],
         ['0', '[2, 3]', '!TypeError', '1', '[4, 1]']],
        [[["BOOKS = [{'id': 1, 'title': 'Dune', 'year': 1965, 'price': 9, 'rating': 5}, {'id': 2, 'title': 'Emma', 'year': 1815, 'price': 5, 'rating': None}, {'id': 3, 'title': 'Dracula', 'year': 1897, 'price': 7, 'rating': 4}, {'id': 4, 'title': 'Neuromancer', 'year': 1984, 'price': 12, 'rating': 3}]",
           'db = DB(BOOKS)',
           'QuerySet(db).filter(id__in=[1, 4]).count()',
           "QuerySet(db).filter(title__startswith='X').exists()",
           'QuerySet(db).filter(year__lt=1900, price__gt=5).count()',
           'db.queries',
           'QuerySet(db).filter(price__between=1)',
           "QuerySet(db).filter(author='x')",
           "[b['id'] for b in QuerySet(db).filter(rating__isnull=True)]",
           "[b['id'] for b in QuerySet(db).exclude(rating__lt=4)]",
           'db.queries']],
         ['2', 'False', '1', '3', '!FieldError', '!FieldError', '[2]', '[1, 2, 3]', '5']]
      ] },
      solution: {
        approach: R`<p>Represent the query as immutable data (conditions, ordering, slice) and make every builder method return a clone. Only <code>_fetch()</code> touches the database. Full evaluation stores the rows in <code>_cache</code>; <code>count()</code>, <code>exists()</code> and indexing peek at the cache first and otherwise run their own cheaper query, exactly like Django.</p>`,
        code: { lang: 'python', run: true, code: R`
class FieldError(Exception):
    pass


class DB:
    def __init__(self, rows):
        self.rows = list(rows)
        self.fields = set(self.rows[0]) if self.rows else set()
        self.queries = 0


LOOKUPS = {
    "exact": lambda a, b: a == b,
    "gt": lambda a, b: a is not None and a > b,
    "gte": lambda a, b: a is not None and a >= b,
    "lt": lambda a, b: a is not None and a < b,
    "lte": lambda a, b: a is not None and a <= b,
    "in": lambda a, b: a in b,
    "icontains": lambda a, b: a is not None and str(b).lower() in str(a).lower(),
    "startswith": lambda a, b: a is not None and str(a).startswith(b),
    "isnull": lambda a, b: (a is None) == bool(b),
}


class QuerySet:
    def __init__(self, db, conds=(), order=(), limits=None):
        self.db, self._conds, self._order, self._limits = db, conds, order, limits
        self._cache = None

    def _clone(self, **changes):
        state = {"conds": self._conds, "order": self._order, "limits": self._limits}
        state.update(changes)
        return QuerySet(self.db, **state)

    def _parse(self, negate, kw):
        out = []
        for key, value in kw.items():
            field, _, lookup = key.rpartition("__")
            if not field:
                field, lookup = key, "exact"
            if field not in self.db.fields:
                raise FieldError(f"Cannot resolve keyword {field!r}")
            if lookup not in LOOKUPS:
                raise FieldError(f"Unsupported lookup {lookup!r}")
            out.append((field, lookup, value))
        return ((negate, tuple(out)),)

    def filter(self, **kw):
        if self._limits is not None:
            raise TypeError("Cannot filter a query once a slice has been taken.")
        return self._clone(conds=self._conds + self._parse(False, kw))

    def exclude(self, **kw):
        if self._limits is not None:
            raise TypeError("Cannot filter a query once a slice has been taken.")
        return self._clone(conds=self._conds + self._parse(True, kw))

    def order_by(self, *fields):
        return self._clone(order=fields)

    def _fetch(self):
        self.db.queries += 1
        rows = []
        for row in self.db.rows:
            ok = True
            for negate, parts in self._conds:
                hit = all(LOOKUPS[lk](row.get(f), v) for f, lk, v in parts)
                if hit == negate:
                    ok = False
                    break
            if ok:
                rows.append(row)
        for field in reversed(self._order):
            desc = field.startswith("-")
            rows.sort(key=lambda r: r[field.lstrip("-")], reverse=desc)
        if self._limits is not None:
            rows = rows[self._limits[0]:self._limits[1]]
        return rows

    def _fill(self):
        if self._cache is None:
            self._cache = self._fetch()
        return self._cache

    def __iter__(self):
        return iter(self._fill())

    def __len__(self):
        return len(self._fill())

    def __bool__(self):
        return bool(self._fill())

    def count(self):
        return len(self._cache) if self._cache is not None else len(self._fetch())

    def exists(self):
        return bool(self._cache) if self._cache is not None else bool(self._fetch())

    def __getitem__(self, k):
        if isinstance(k, slice):
            if k.step is not None:
                return list(self)[k]
            return self._clone(limits=(k.start or 0, k.stop))
        if k < 0:
            raise ValueError("Negative indexing is not supported.")
        if self._cache is not None:
            return self._cache[k]
        return self._fetch()[k]


db = DB([{"id": 1, "title": "Dune", "year": 1965, "price": 9},
         {"id": 2, "title": "Emma", "year": 1815, "price": 5},
         {"id": 3, "title": "Dracula", "year": 1897, "price": 7}])
qs = QuerySet(db).filter(year__gt=1850).order_by("-price")
print("queries so far:", db.queries)
print([b["title"] for b in qs], len(qs), "queries:", db.queries)
` },
        dry: { head: ['line', 'new QuerySet?', 'SQL run?', 'db.queries', 'cache'], rows: [
          ['filter(year__gt=1850)', 'yes', 'no', '0', 'empty'],
          ['order_by("-price")', 'yes', 'no', '0', 'empty'],
          ['[b for b in qs]', 'no', 'SELECT', '1', '3 rows'],
          ['len(qs)', 'no', 'no', '1', '3 rows'],
          ['qs.count()', 'no', 'no (cache)', '1', '3 rows']
        ] },
        complexity: R`<p>Building is O(1) per call (plus copying the condition tuple). A fetch is O(n·c + n log n) for n rows, c conditions, and sorting. Cached evaluations are O(1).</p>`,
        followUps: ['Add <code>values_list(*fields, flat=False)</code>', 'Add <code>iterator()</code> that streams without filling the cache', 'Implement <code>Q</code> objects with <code>|</code>, <code>&amp;</code> and <code>~</code>']
      }
    }]
  });

  /* ======================================================================
     TOPIC 4: N+1, select_related, prefetch_related, transactions
     ====================================================================== */
  topics.push({
    title: 'The N+1 Problem, select_related, prefetch_related and Transactions',
    analogy: R`<p>You need the author of 50 books. <b>N+1</b> is walking to the library desk once for the list of books, then <b>50 more trips</b>, one per book, to ask "who wrote this?". <b>select_related</b> is asking for a list that already has the author written next to every book (one trip, a JOIN). <b>prefetch_related</b> is two trips: one for the books, then one more carrying all 50 author ids at once ("give me authors 3, 7, 9…"), and you match them up at your desk in Python. A <b>transaction</b> is a shopping trolley: nothing is paid for until checkout, and if you drop the trolley everything goes back on the shelves.</p>`,
    explain: R`<p>🟢 <b>N+1.</b> Accessing a related object that is not loaded yet (<code>book.author.name</code>) makes Django run a query for it. In a loop over N books that is <b>1 + N</b> queries. It is invisible in code review and only shows up as a slow page in production, which is why interviewers love it.</p>
      ${H.table(['Tool', 'SQL', 'Use for', 'Queries'], [
        ['<code>select_related("author")</code>', 'one SELECT with JOIN', 'forward <b>ForeignKey</b> and <b>OneToOne</b> (single object per row)', '1'],
        ['<code>prefetch_related("tags")</code>', 'second SELECT … WHERE id IN (…)', '<b>ManyToMany</b>, <b>reverse FK</b> (<code>author.books</code>), generic relations', '1 + 1 per lookup level'],
        ['<code>Prefetch("books", queryset=…, to_attr="recent")</code>', 'customised second query', 'filtered/ordered related sets', '1 + 1'],
        ['<code>only()</code> / <code>defer()</code> / <code>values()</code>', 'fewer columns', 'wide tables, big text fields', 'same']
      ])}
      <p>Why not always JOIN? A JOIN on a "many" relation multiplies rows (an author with 500 books is repeated 500 times). <code>prefetch_related</code> avoids that by doing a separate <code>IN</code> query and stitching results in Python. Rule of thumb: <b>single-valued → select_related; multi-valued → prefetch_related</b>.</p>
      <p><b>Transactions.</b> By default Django runs in <b>autocommit</b>: each query commits on its own. <code>with transaction.atomic():</code> opens a transaction; nested <code>atomic</code> blocks create <b>savepoints</b>, so an inner failure can roll back only the inner part. If an exception leaves the outermost block, everything rolls back. <code>transaction.on_commit(fn)</code> runs <code>fn</code> only after a successful commit (perfect for sending emails or enqueueing Celery tasks). <code>select_for_update()</code> locks rows until the transaction ends. <code>ATOMIC_REQUESTS=True</code> wraps every view in a transaction.</p>`,
    clues: [
      '"page gets slower as the list grows" / "hundreds of identical queries in the debug toolbar" → N+1',
      '"book.author in a loop" → <code>select_related("author")</code>',
      '"author.books.all() / tags in a loop" → <code>prefetch_related</code>',
      '"email sent but the order was rolled back" → <code>transaction.on_commit</code>',
      '"two users bought the last item" → <code>select_for_update()</code> inside <code>atomic</code>, or a conditional <code>update()</code> with <code>F()</code>',
      '"partial failure should not undo everything" → nested <code>atomic</code> (savepoint) + catch the exception outside the inner block'
    ],
    code: [{ lang: 'python', check: false, title: 'Fixing N+1 and writing safe transactions', code: R`
from django.db import transaction
from django.db.models import F, Prefetch

# N+1: 1 query for books + 1 per book for its author
for book in Book.objects.all():
    print(book.title, book.author.name)

# 1 query (JOIN)
for book in Book.objects.select_related("author"):
    print(book.title, book.author.name)

# 2 queries: authors, then all their books with WHERE author_id IN (...)
for author in Author.objects.prefetch_related(
        Prefetch("books", queryset=Book.objects.order_by("-year"), to_attr="recent_books")):
    print(author.name, [b.title for b in author.recent_books])


def place_order(user, product_id, qty):
    with transaction.atomic():
        product = Product.objects.select_for_update().get(pk=product_id)   # row lock
        if product.stock < qty:
            raise ValueError("out of stock")
        Product.objects.filter(pk=product_id).update(stock=F("stock") - qty)
        order = Order.objects.create(user=user, product=product, qty=qty)
        transaction.on_commit(lambda: send_receipt.delay(order.pk))       # only if COMMIT succeeds
    return order


# tests: assert the number of queries so N+1 never comes back
# with self.assertNumQueries(2):
#     list(Author.objects.prefetch_related("books"))
` }, { lang: 'python', run: true, title: 'Count the queries of each strategy', code: R`
authors = {1: "Herbert", 2: "Austen"}
books = [("Dune", 1), ("Emma", 2), ("Children of Dune", 1), ("Persuasion", 2)]

def naive():
    q = 1                                   # SELECT books
    for _title, aid in books:
        q += 1                              # SELECT author WHERE id = aid
    return q

def select_related():
    return 1                                # SELECT books JOIN authors

def prefetch_related():
    ids = sorted({aid for _t, aid in books})
    return 1 + (1 if ids else 0)            # SELECT authors WHERE id IN (...)

for f in (naive, select_related, prefetch_related):
    print(f"{f.__name__:17} {f()} queries")
` }],
    viz: {
      title: 'N+1 vs select_related vs prefetch_related (query log)',
      input: '5',
      inputLabel: 'Number of books (1 to 12)',
      gen: function (input) {
        var n = parseInt(String(input === undefined ? '5' : input).trim(), 10);
        if (!(n >= 1 && n <= 12)) throw new Error('Enter a whole number from 1 to 12');
        var frames = [], log = [], authorsOf = [];
        for (var i = 0; i < n; i++) authorsOf.push(1 + (i % 3));
        function qpart(hl) { return { type: 'queue', label: 'SQL sent to the database (' + log.length + ' queries)', items: log.slice(), hl: hl || {} }; }
        log.push('SELECT * FROM book');
        frames.push({ narr: '<b>Naive loop.</b> <code>for b in Book.objects.all()</code> runs one query and returns ' + n + ' books. Each book only knows <code>author_id</code>, not the author.', parts: [qpart({ 0: 'ok' }), { type: 'array', label: 'author_id per book', values: authorsOf.slice() }] });
        for (var j = 0; j < n; j++) {
          log.push('SELECT * FROM author WHERE id = ' + authorsOf[j]);
          var h = {}; h[log.length - 1] = 'bad';
          var ah = {}; ah[j] = 'y';
          frames.push({ narr: 'Book ' + (j + 1) + ': <code>b.author.name</code> is not loaded, so Django runs another query' + (j > 2 ? ' (even for an author it fetched for an earlier book: each book caches only its own author)' : '') + '. Total so far: <b>' + log.length + '</b>.', parts: [qpart(h), { type: 'array', label: 'author_id per book', values: authorsOf.slice(), hl: ah }] });
        }
        frames.push({ narr: 'Naive total: <b>1 + N = ' + (n + 1) + '</b> queries. Each one has network round-trip latency, so 1000 books ≈ 1000 round trips.', parts: [qpart({})] });
        log = ['SELECT book.*, author.* FROM book INNER JOIN author ON book.author_id = author.id'];
        frames.push({ narr: '<b>select_related("author")</b>: one query with a JOIN. Every row already carries its author, and Django builds both objects from it. Total: <b>1</b>.', parts: [qpart({ 0: 'ok' })] });
        var ids = []; authorsOf.forEach(function (a) { if (ids.indexOf(a) < 0) ids.push(a); }); ids.sort();
        log = ['SELECT * FROM book', 'SELECT * FROM author WHERE id IN (' + ids.join(', ') + ')'];
        frames.push({ narr: '<b>prefetch_related("author")</b>: query 1 fetches the books, query 2 fetches all distinct authors with <code>IN</code>; Python joins them by id. Total: <b>2</b>, independent of N. This is the tool for many-valued relations where a JOIN would duplicate rows.', parts: [qpart({ 0: 'ok', 1: 'ok' }), { type: 'set', label: 'distinct author ids', items: ids.map(String) }] });
        return frames;
      }
    },
    examples: [
      { title: 'Prefetch is wasted if you filter again', html: R`<p><code>author.books.filter(year__gt=2000)</code> inside the loop ignores the prefetched cache and queries again, because it is a <b>new</b> QuerySet. Filter in the <code>Prefetch(queryset=…)</code> instead, or filter the prefetched list in Python.</p>`, code: { lang: 'python', check: false, code: R`
authors = Author.objects.prefetch_related("books")
for a in authors:
    a.books.filter(year__gt=2000)        # N extra queries: cache not used
authors = Author.objects.prefetch_related(
    Prefetch("books", queryset=Book.objects.filter(year__gt=2000), to_attr="new_books"))
for a in authors:
    a.new_books                          # list, 0 extra queries
` } },
      { title: 'Nested atomic: savepoint keeps the outer work', html: R`<p>The inner block fails and rolls back to its savepoint; the outer insert survives and commits. Catch the exception <b>outside</b> the inner <code>atomic</code>, never inside it (catching inside leaves a broken transaction).</p>`, code: { lang: 'python', check: false, code: R`
with transaction.atomic():
    Order.objects.create(code="A1")
    try:
        with transaction.atomic():            # SAVEPOINT
            Coupon.objects.create(code="DUP")  # IntegrityError
    except IntegrityError:
        pass                                   # ROLLBACK TO SAVEPOINT
# COMMIT: order A1 exists, the coupon does not
` } },
      { title: 'A test that pins the query count', html: R`<p><code>assertNumQueries</code> (or pytest-django's <code>django_assert_num_queries</code>) makes N+1 regressions fail CI. Run it with two different data sizes: a constant count proves there is no per-row query.</p>`, code: { lang: 'python', check: false, code: R`
def test_book_list_is_constant(self):
    make_books(3)
    with self.assertNumQueries(2):
        self.client.get("/books/")
    make_books(30)
    with self.assertNumQueries(2):
        self.client.get("/books/")
` } }
    ],
    deepDive: R`<p>🟣 <b>How prefetching works.</b> After the main query, <code>prefetch_related_objects()</code> walks each lookup level (<code>"books__reviews"</code> = 2 extra queries), collects the keys from the instances, runs <code>related_qs.filter(fk__in=keys)</code>, groups results in a dict and stores them in each instance's <code>_prefetched_objects_cache</code> (or <code>to_attr</code>). If no instance has a key, the <code>IN ()</code> query is skipped. <code>select_related</code> instead adds JOINs to the main SQL (INNER for non-null FKs, LEFT OUTER for nullable ones) and the compiler splits each row into several model instances. Very large <code>IN</code> lists can hit parameter limits (SQLite 999/32766) and Django batches them for some backends.</p>
      <p><b>Transactions in depth.</b> <code>atomic</code> is both a decorator and a context manager. The outermost block issues BEGIN (by turning off autocommit), inner ones <code>SAVEPOINT</code>/<code>RELEASE</code>/<code>ROLLBACK TO</code>. <code>on_commit</code> callbacks are attached to the current savepoint and dropped if it rolls back; in tests use <code>TestCase.captureOnCommitCallbacks(execute=True)</code>. Isolation: PostgreSQL defaults to READ COMMITTED, so a read-then-write still needs <code>select_for_update()</code> (or <code>F()</code>) to be safe; <code>select_for_update(skip_locked=True)</code> builds job queues.</p>`,
    aiEra: R`<p>🤖 <b>AI and N+1.</b> Generated serializers and templates are a prime N+1 source: a nested DRF serializer for <code>author</code> plus a <code>SerializerMethodField</code> that counts comments looks clean and costs 2N+1 queries. Assistants also suggest <code>select_related</code> for many-to-many (it raises <code>FieldError</code>) or forget that <code>.filter()</code> after prefetching re-queries. <b>Workflow:</b> paste the query log (django-debug-toolbar, <code>connection.queries</code>, or an APM trace) into the chat and ask: <code>Group these queries by shape, find the repeated ones and propose select_related / prefetch_related / annotate fixes with the expected query count.</code> Then lock the result in with <code>assertNumQueries</code>. Judging whether a JOIN or an IN query is cheaper for your data remains your job.</p>`,
    problems: [{
      title: 'Count the queries: naive vs select_related vs prefetch_related',
      level: 'Medium', tags: ['django orm', 'n+1', 'select_related', 'prefetch_related'], companies: ['Shopify', 'Instagram', 'Doordash'],
      statement: R`<p>Write <code>book_lines(authors, books, mode)</code> that simulates rendering "<i>title</i> by <i>author</i>" for every book (in the given order) and returns <code>(lines, queries)</code> where <code>queries</code> is the list of SQL strings the ORM would send.</p>
        <ul><li><code>authors</code>: dict id → name. <code>books</code>: list of <code>(id, title, author_id)</code>; <code>author_id</code> may be <code>None</code> (nullable FK) → write <code>?</code> as the author.</li>
        <li><code>"naive"</code>: <code>"SELECT * FROM book"</code>, then for every book with a non-null author <code>"SELECT * FROM author WHERE id = &lt;id&gt;"</code> (no sharing between books).</li>
        <li><code>"select_related"</code>: one query <code>"SELECT * FROM book LEFT OUTER JOIN author ON book.author_id = author.id"</code>.</li>
        <li><code>"prefetch_related"</code>: <code>"SELECT * FROM book"</code>, then, only if at least one book has an author, <code>"SELECT * FROM author WHERE id IN (a, b, …)"</code> with distinct ids ascending.</li>
        <li>Any other mode → <code>ValueError</code>.</li></ul>`,
      constraints: R`0 ≤ books ≤ 10<sup>4</sup>; every non-null author_id exists in <code>authors</code>.`,
      example: R`<p>authors <code>{1: 'Herbert', 2: 'Austen'}</code>, books Dune(1), Emma(2), Children of Dune(1): naive → ${H.c('r', '4 queries')}; select_related → ${H.c('g', '1')}; prefetch_related → ${H.c('b', '2')}, the second being <code>SELECT * FROM author WHERE id IN (1, 2)</code>.</p>`,
      brute: {
        why: R`<p>The brute force <b>is</b> the naive strategy: one lookup per book. It is correct but its query count grows with N, and each query pays a network round trip.</p>`,
        code: R`
          def naive_count(books):
              return 1 + sum(1 for _id, _t, aid in books if aid is not None)

          print(naive_count([(1, "Dune", 1), (2, "Emma", 2), (3, "Children of Dune", 1)]))
        `
      },
      mcq: { q: 'An author has 1000 books. Which strategy avoids repeating the author row 1000 times in the result set when listing authors with their books?', options: ['<code>prefetch_related("books")</code>', '<code>select_related("books")</code>', '<code>only("books")</code>', 'A plain loop'], answer: 0, explain: '<code>select_related</code> cannot follow a reverse FK anyway; <code>prefetch_related</code> does a second <code>IN</code> query and joins in Python without row multiplication.' },
      hints: [
        R`<p>Hint 1: The lines are the same for every mode; only the list of queries differs. Build the lines first with <code>authors.get(aid, '?')</code> semantics (None → <code>?</code>).</p>`,
        R`<p>Hint 2: For prefetch, collect <code>sorted({aid for … if aid is not None})</code> and format with <code>", ".join(map(str, ids))</code>.</p>`,
        R`<p>Hint 3: Edge cases: no books → just the first query in every mode; all authors null → naive and prefetch both send only one query. Validate the mode before doing any work.</p>`
      ],
      tests: { sig: 'string[] -> string[]', fn: 'run_lines', harness: { python: PYT }, cases: [
        [[["A = {1: 'Herbert', 2: 'Austen'}",
           "B = [(1, 'Dune', 1), (2, 'Emma', 2), (3, 'Children of Dune', 1)]",
           "lines, q = book_lines(A, B, 'naive')",
           'lines',
           'len(q)',
           'q[1]',
           "len(book_lines(A, B, 'select_related')[1])",
           "book_lines(A, B, 'prefetch_related')[1]"]],
         ["['Dune by Herbert', 'Emma by Austen', 'Children of Dune by Herbert']", '4', "'SELECT * FROM author WHERE id = 1'", '1', "['SELECT * FROM book', 'SELECT * FROM author WHERE id IN (1, 2)']"]],
        [[["A = {1: 'Herbert'}",
           "book_lines(A, [], 'naive')",
           "book_lines(A, [], 'select_related')[1]",
           "book_lines(A, [], 'prefetch_related')"]],
         ["([], ['SELECT * FROM book'])", "['SELECT * FROM book LEFT OUTER JOIN author ON book.author_id = author.id']", "([], ['SELECT * FROM book'])"]],
        [[["A = {2: 'Austen'}",
           "B = [(1, 'Anon', None), (2, 'Emma', 2)]",
           "book_lines(A, B, 'naive')",
           "len(book_lines(A, B, 'prefetch_related')[1])",
           "book_lines(A, [(1, 'A', None)], 'prefetch_related')"]],
         ["(['Anon by ?', 'Emma by Austen'], ['SELECT * FROM book', 'SELECT * FROM author WHERE id = 2'])", '2', "(['A by ?'], ['SELECT * FROM book'])"]],
        [[["A = {1: 'X'}",
           "book_lines(A, [(1, 'T', 1)], 'joined')"]],
         ['!ValueError']],
        [[["A = {i: 'a%d' % i for i in range(1, 6)}",
           "B = [(i, 't%d' % i, 5 - i % 5) for i in range(10)]",
           "book_lines(A, B, 'prefetch_related')[1][1]",
           "book_lines(A, B, 'naive')[1][-1]",
           "book_lines(A, B, 'select_related')[0][:2]"]],
         ["'SELECT * FROM author WHERE id IN (1, 2, 3, 4, 5)'", "'SELECT * FROM author WHERE id = 1'", "['t0 by a5', 't1 by a4']"]],
        [[["A = {1: 'Solo'}",
           "B = [(i, 'b', 1) for i in range(10000)]",
           "len(book_lines(A, B, 'naive')[1])",
           "len(book_lines(A, B, 'prefetch_related')[1])",
           "len(book_lines(A, B, 'select_related')[0])"]],
         ['10001', '2', '10000']]
      ] },
      solution: {
        approach: R`<p>Compute the rendered lines once, then model each loading strategy's SQL: naive emits one author query per non-null FK, select_related a single JOIN, prefetch_related a book query plus one <code>IN</code> query over distinct ids (skipped when there are none, just as Django skips an empty <code>IN</code>).</p>`,
        code: { lang: 'python', run: true, code: R`
def book_lines(authors, books, mode):
    if mode not in ("naive", "select_related", "prefetch_related"):
        raise ValueError(f"unknown mode {mode!r}")
    lines = [f"{title} by {authors[aid] if aid is not None else '?'}" for _id, title, aid in books]
    if mode == "select_related":
        return lines, ["SELECT * FROM book LEFT OUTER JOIN author ON book.author_id = author.id"]
    queries = ["SELECT * FROM book"]
    if mode == "naive":
        queries += [f"SELECT * FROM author WHERE id = {aid}" for _id, _t, aid in books if aid is not None]
    else:
        ids = sorted({aid for _id, _t, aid in books if aid is not None})
        if ids:
            queries.append(f"SELECT * FROM author WHERE id IN ({', '.join(map(str, ids))})")
    return lines, queries


A = {1: "Herbert", 2: "Austen"}
B = [(1, "Dune", 1), (2, "Emma", 2), (3, "Children of Dune", 1)]
for mode in ("naive", "select_related", "prefetch_related"):
    lines, q = book_lines(A, B, mode)
    print(f"{mode:17} {len(q)} queries", q[-1])
` },
        dry: { head: ['mode', 'queries sent', 'count'], rows: [
          ['naive', 'books; author 1; author 2; author 1', '4'],
          ['select_related', 'books JOIN author', '1'],
          ['prefetch_related', 'books; author IN (1, 2)', '2']
        ] },
        complexity: R`<p>O(N log N) time for N books (sorting the distinct ids) and O(N) space. The real-world cost that matters is the query count: N+1 vs 1 vs 2.</p>`,
        followUps: ['Add a two-level prefetch (<code>books__reviews</code>): how many queries?', 'When is select_related slower than prefetch_related even for a FK?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 5: Migrations
     ====================================================================== */
  topics.push({
    title: 'Migrations: makemigrations, migrate, the Dependency Graph and Safe Schema Changes',
    analogy: R`<p>Migrations are the <b>numbered building permits</b> of your database. Each permit says "add a room", "widen this door", and lists which earlier permits must already be done ("0003 needs 0002, and also the accounts wing's 0001"). The city clerk (<code>migrate</code>) keeps a <b>stamp book</b> (the <code>django_migrations</code> table) of permits already carried out, sorts the rest so every dependency comes first, and executes them in that order.</p>`,
    explain: R`<p>🟢 <b>The two commands.</b> <code>python manage.py makemigrations</code> compares your models with the state rebuilt from existing migration files and writes a new file of <b>operations</b> (<code>CreateModel</code>, <code>AddField</code>, <code>AlterField</code>, <code>RemoveField</code>, <code>AddIndex</code>, <code>RunPython</code>, …). It never touches the database. <code>python manage.py migrate</code> reads which migrations are recorded in <code>django_migrations</code>, plans the unapplied ones in dependency order, runs their SQL and records each one.</p>
      ${H.table(['Command', 'What it does'], [
        ['<code>showmigrations</code>', 'list migrations with [X] applied / [ ] pending'],
        ['<code>sqlmigrate blog 0003</code>', 'print the SQL a migration will run (review it!)'],
        ['<code>migrate blog 0002</code>', 'migrate forwards or <b>backwards</b> to a target'],
        ['<code>migrate --plan</code>', 'show the plan without running it'],
        ['<code>makemigrations --check</code>', 'CI guard: fail if models changed without a migration'],
        ['<code>squashmigrations blog 0001 0040</code>', 'merge many files into one with <code>replaces</code>']
      ])}
      <p><b>The dependency graph.</b> Every migration has <code>dependencies = [("blog", "0002_post_slug"), ("auth", "0012_...")]</code>. Together they form a <b>directed acyclic graph</b>; <code>migrate</code> runs a topological order of the part you have not applied yet. Two developers creating <code>0004</code> on different branches give the graph two <b>leaf nodes</b>; Django refuses to migrate until you run <code>makemigrations --merge</code>.</p>
      <p><b>Data migrations</b> use <code>RunPython(forwards, backwards)</code> with the <b>historical</b> model from <code>apps.get_model("blog", "Post")</code>, never an import of the current model (it may have fields that do not exist yet at that point in history).</p>`,
    clues: [
      '"Conflicting migrations detected; multiple leaf nodes" → two branches each added a migration; <code>makemigrations --merge</code>',
      '"InconsistentMigrationHistory" → an applied migration\'s dependency is not recorded as applied',
      '"add a NOT NULL column to a huge table without downtime" → expand/contract: nullable first, backfill in batches, then constrain',
      '"rename a column safely across deploys" → add new, dual-write, backfill, switch reads, drop old',
      '"populate a new field from old data" → <code>RunPython</code> with <code>apps.get_model</code>',
      '"too many migration files, tests slow" → <code>squashmigrations</code>'
    ],
    code: [{ lang: 'python', check: false, title: 'A schema migration and a data migration', code: R`
# blog/migrations/0003_post_slug.py  (generated by makemigrations)
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("blog", "0002_post_published")]
    operations = [
        migrations.AddField("post", "slug", models.SlugField(max_length=200, null=True)),
    ]


# blog/migrations/0004_fill_slugs.py  (written by hand)
from django.db import migrations
from django.utils.text import slugify


def fill(apps, schema_editor):
    Post = apps.get_model("blog", "Post")          # historical model, not blog.models.Post
    batch = []
    for post in Post.objects.filter(slug__isnull=True).only("id", "title").iterator(chunk_size=2000):
        post.slug = slugify(post.title)[:200]
        batch.append(post)
        if len(batch) == 2000:
            Post.objects.bulk_update(batch, ["slug"])
            batch.clear()
    Post.objects.bulk_update(batch, ["slug"])


class Migration(migrations.Migration):
    dependencies = [("blog", "0003_post_slug")]
    operations = [migrations.RunPython(fill, migrations.RunPython.noop)]
` }, { lang: 'python', run: true, title: 'migrate = topological sort minus what is applied', code: R`
from graphlib import TopologicalSorter

deps = {
    "auth.0001": [],
    "blog.0001": ["auth.0001"],
    "blog.0002": ["blog.0001"],
    "shop.0001": ["blog.0001", "auth.0001"],
}
applied = {"auth.0001", "blog.0001"}
order = list(TopologicalSorter(deps).static_order())
print("full order:", order)
print("plan:", [m for m in order if m not in applied])
` }],
    viz: {
      title: 'Planning migrate: walk the dependency graph',
      gen: function () {
        var N = [['a1', 'auth.0001', 12, 14], ['a2', 'auth.0002', 12, 40], ['b1', 'blog.0001', 45, 14], ['b2', 'blog.0002', 45, 40], ['s1', 'shop.0001', 82, 27]];
        var E = [['a1', 'a2'], ['a1', 'b1'], ['b1', 'b2'], ['a2', 'b2'], ['b2', 's1'], ['a1', 's1']];
        var tbl = function (done, plan) { return { type: 'table', label: 'django_migrations + plan', columns: ['migration', 'state'], rows: ['auth.0001', 'auth.0002', 'blog.0001', 'blog.0002', 'shop.0001'].map(function (m) { return [m, done.indexOf(m) >= 0 ? 'applied (in django_migrations)' : plan.indexOf(m) >= 0 ? 'planned #' + (plan.indexOf(m) + 1) : 'pending']; }) }; };
        var steps = [
          { narr: 'Edges point from a dependency to the migration that needs it. <code>auth.0001</code> is already recorded in <code>django_migrations</code> (green). Target: <code>shop.0001</code>.', hl: { a1: 'ok', s1: 'cur' }, parts: [tbl(['auth.0001'], [])] },
          { narr: 'Depth-first from the target: <code>shop.0001</code> needs <code>auth.0001</code> (done) and <code>blog.0002</code>. Visit <code>blog.0002</code> first: it needs <code>auth.0002</code> and <code>blog.0001</code>.', hl: { a1: 'ok', s1: 'win', b2: 'cur' }, parts: [tbl(['auth.0001'], [])] },
          { narr: '<code>auth.0002</code> only needs <code>auth.0001</code> → it can run: plan #1.', hl: { a1: 'ok', a2: 'sel', b2: 'win', s1: 'win' }, ehl: { 'a1-a2': 'ok' }, parts: [tbl(['auth.0001'], ['auth.0002'])] },
          { narr: '<code>blog.0001</code> only needs <code>auth.0001</code> → plan #2.', hl: { a1: 'ok', a2: 'sel', b1: 'sel', b2: 'win', s1: 'win' }, ehl: { 'a1-b1': 'ok' }, parts: [tbl(['auth.0001'], ['auth.0002', 'blog.0001'])] },
          { narr: 'All of <code>blog.0002</code>\'s dependencies are planned → plan #3. Then <code>shop.0001</code> → plan #4.', hl: { a1: 'ok', a2: 'sel', b1: 'sel', b2: 'sel', s1: 'sel' }, ehl: { 'b1-b2': 'ok', 'a2-b2': 'ok', 'b2-s1': 'ok' }, parts: [tbl(['auth.0001'], ['auth.0002', 'blog.0001', 'blog.0002', 'shop.0001'])] },
          { narr: '<code>migrate</code> runs each planned migration (inside a transaction on PostgreSQL) and inserts a row into <code>django_migrations</code> after each one. A cycle in this graph, or a missing dependency, is reported before anything runs.', hl: { a1: 'ok', a2: 'ok', b1: 'ok', b2: 'ok', s1: 'ok' }, parts: [tbl(['auth.0001', 'auth.0002', 'blog.0001', 'blog.0002', 'shop.0001'], [])] }
        ];
        return walk('Migration dependency graph', N, E, steps, 54);
      }
    },
    examples: [
      { title: 'Zero-downtime NOT NULL column (expand / contract)', html: R`<p>Old app servers keep running during a deploy and do not know the new column. Ship it in steps: (1) add the column <b>nullable</b> (or with <code>db_default</code> in Django 5, which sets a database-level default); (2) deploy code that writes it; (3) backfill in batches; (4) a later migration makes it NOT NULL. Never combine "add column" and "backfill" in one transaction on a big table.</p>`, code: { lang: 'python', check: false, code: R`
migrations.AddField("order", "currency", models.CharField(max_length=3, null=True))          # step 1
# step 3: RunPython backfill in batches (separate migration, atomic = False for big tables)
migrations.AlterField("order", "currency", models.CharField(max_length=3, default="USD"))    # step 4
` } },
      { title: 'Reverse migrations need a reverse operation', html: R`<p><code>migrate blog 0002</code> runs migrations backwards. Schema operations know their inverse; <code>RunPython</code> without a <code>reverse_code</code> is irreversible and raises <code>IrreversibleError</code>. Give <code>RunPython.noop</code> when undoing is harmless.</p>`, code: { lang: 'python', check: false, code: R`
migrations.RunPython(forwards_func, reverse_code=migrations.RunPython.noop)
migrations.RunSQL("CREATE INDEX CONCURRENTLY ...", reverse_sql="DROP INDEX CONCURRENTLY ...")
` } },
      { title: 'CI guard: models and migrations must agree', html: R`<p>Run <code>python manage.py makemigrations --check --dry-run</code> in CI: it exits non-zero when someone changed a model without committing the migration. Pair it with <code>migrate --plan</code> in deploy logs so reviewers see exactly what will run.</p>`, code: { lang: 'bash', check: false, code: R`
python manage.py makemigrations --check --dry-run
python manage.py migrate --plan
python manage.py sqlmigrate blog 0005
` } }
    ],
    deepDive: R`<p>🟣 <b>Inside migrate.</b> <code>MigrationLoader</code> imports every <code>migrations/</code> module, builds a <code>MigrationGraph</code> (nodes keyed by <code>(app_label, name)</code>, edges from <code>dependencies</code>, plus <code>run_before</code>), applies squash replacement rules, and calls <code>check_consistent_history()</code>, which raises <code>InconsistentMigrationHistory</code> if an applied migration has an unapplied parent. <code>MigrationExecutor.migration_plan()</code> uses <code>graph.forwards_plan(target)</code> (an iterative DFS over sorted parents) and skips applied nodes. Operations mutate an in-memory <code>ProjectState</code> (the historical models) and call <code>schema_editor</code> methods that emit backend-specific DDL. <b>Squashing</b>: a squashed migration lists <code>replaces</code>; if all replaced migrations are applied it counts as applied, if none are it is used instead of them, and if only some are, the originals are used.</p>
      <p><b>Production reality.</b> PostgreSQL runs DDL inside transactions (good: failed migrations roll back), MySQL does not. Long-running <code>ALTER TABLE</code> can take an ACCESS EXCLUSIVE lock and block all traffic; use <code>AddIndexConcurrently</code> (in <code>django.contrib.postgres.operations</code>, requires <code>atomic = False</code>), set <code>lock_timeout</code>, and test migrations against a production-sized copy.</p>`,
    aiEra: R`<p>🤖 <b>AI and migrations.</b> Models are happy to edit an old migration file (never do this once it has been applied anywhere), import the live model inside <code>RunPython</code>, or write one migration that adds a NOT NULL column and backfills 50 million rows in one transaction. They are useful for reviewing: paste the output of <code>sqlmigrate</code> and ask <code>Which statements take long locks on PostgreSQL 16 for a 200 GB table, and how would you split this into safe deploy steps?</code> Tools like django-migration-linter or squawk automate the check. The decisions that remain yours: ordering deploys versus migrations, and knowing that the migration graph, not the file name number, defines the order.</p>`,
    problems: [{
      title: 'Plan migrations from a dependency graph',
      level: 'Medium', tags: ['django', 'migrations', 'topological sort', 'dfs'], companies: ['Stripe', 'GitLab', 'Atlassian'],
      statement: R`<p>Write <code>migration_plan(graph, targets, applied=())</code>. <code>graph</code> maps a migration name (e.g. <code>"blog.0002"</code>) to the list of its dependencies. Return the list of migrations to run so that every dependency comes before its dependent, excluding those in <code>applied</code>.</p>
        <ul><li>Process <code>targets</code> in the given order. For each node, visit its dependencies in <b>sorted</b> (alphabetical) order, depth-first; a node is emitted after all its dependencies. Each node appears at most once.</li>
        <li>A target or dependency missing from <code>graph</code> → <code>NodeNotFoundError</code>. A cycle → <code>CircularDependencyError</code>.</li>
        <li>Must handle chains of 3000+ migrations (no recursion-limit crash).</li></ul>`,
      constraints: R`Up to 10<sup>4</sup> nodes and edges.`,
      example: R`<p><code>{'auth.0001': [], 'auth.0002': ['auth.0001'], 'blog.0001': ['auth.0001'], 'blog.0002': ['blog.0001', 'auth.0002']}</code>, target <code>blog.0002</code> → ${H.c('g', "['auth.0001', 'auth.0002', 'blog.0001', 'blog.0002']")}. With <code>applied=['auth.0001', 'auth.0002']</code> → ${H.c('b', "['blog.0001', 'blog.0002']")}.</p>`,
      brute: {
        why: R`<p>Repeatedly scanning all nodes for one whose dependencies are all done works but costs O(V²), cannot follow the "depth-first from the target" order that makes plans readable, and loops forever (or silently stops) on a cycle unless you add extra checks.</p>`,
        code: R`
          def plan_brute(graph, applied=()):
              done, plan = set(applied), []
              while True:
                  ready = [n for n in sorted(graph) if n not in done and all(d in done for d in graph[n])]
                  if not ready:
                      return plan
                  done.add(ready[0])
                  plan.append(ready[0])

          print(plan_brute({"a.1": [], "a.2": ["a.1"]}))
        `
      },
      mcq: { q: 'Which DFS colour tells you that you found a cycle?', options: ['Reaching a node that is still "in progress" (on the current path)', 'Reaching a node that is "done"', 'Reaching a node with no dependencies', 'Visiting the same target twice'], answer: 0, explain: 'A grey (in-progress) node reached again means there is a path back to an ancestor: a cycle. Black (done) nodes are simply skipped.' },
      hints: [
        R`<p>Hint 1: This is a topological sort by DFS post-order: emit a node only after all its dependencies were emitted.</p>`,
        R`<p>Hint 2: Use colours (none / in-progress / done) shared across all targets, and an explicit stack of <code>(node, iterator over sorted deps)</code> instead of recursion.</p>`,
        R`<p>Hint 3: On each step, advance the top iterator; unknown dep → NodeNotFoundError, in-progress dep → CircularDependencyError, new dep → push it; when the iterator is exhausted pop the node, mark done and append it. Filter <code>applied</code> at the end.</p>`
      ],
      tests: { sig: 'string[] -> string[]', fn: 'run_lines', harness: { python: PYT }, cases: [
        [[["G = {'auth.0001': [], 'auth.0002': ['auth.0001'], 'blog.0001': ['auth.0001'], 'blog.0002': ['blog.0001', 'auth.0002']}",
           "migration_plan(G, ['blog.0002'])",
           "migration_plan(G, ['blog.0002'], ['auth.0001', 'auth.0002'])",
           "migration_plan(G, ['blog.0001', 'auth.0002'])",
           'migration_plan(G, [])']],
         ["['auth.0001', 'auth.0002', 'blog.0001', 'blog.0002']", "['blog.0001', 'blog.0002']", "['auth.0001', 'blog.0001', 'auth.0002']", '[]']],
        [[["migration_plan({'a.1': ['b.1'], 'b.1': ['a.1']}, ['a.1'])",
           "migration_plan({'a.1': ['a.1']}, ['a.1'])",
           "migration_plan({'a.1': ['b.1'], 'b.1': ['c.1'], 'c.1': ['a.1']}, ['c.1'])"]],
         ['!CircularDependencyError', '!CircularDependencyError', '!CircularDependencyError']],
        [[["migration_plan({'a.1': ['zz.9']}, ['a.1'])",
           "migration_plan({'a.1': []}, ['b.1'])",
           "migration_plan({'a.1': []}, ['a.1'], ['a.1'])"]],
         ['!NodeNotFoundError', '!NodeNotFoundError', '[]']],
        [[["D = {'x': [], 'l': ['x'], 'r': ['x'], 'top': ['r', 'l']}",
           "migration_plan(D, ['top'])",
           "migration_plan(D, ['r', 'top'])",
           "migration_plan(D, ['top'], ['x', 'l'])"]],
         ["['x', 'l', 'r', 'top']", "['x', 'r', 'l', 'top']", "['r', 'top']"]],
        [[["C = {f'm.{i:05d}': ([f'm.{i - 1:05d}'] if i else []) for i in range(3000)}",
           "p = migration_plan(C, ['m.02999'])",
           'len(p)',
           '(p[0], p[-1])',
           "migration_plan(C, ['m.00002'], ['m.00000'])"]],
         ['3000', "('m.00000', 'm.02999')", "['m.00001', 'm.00002']"]],
        [[["G = {'a.1': [], 'b.1': ['a.1'], 'c.1': ['b.1', 'a.1'], 'd.1': []}",
           "migration_plan(G, ['d.1', 'c.1', 'b.1'])",
           "migration_plan(G, ['c.1', 'c.1'])"]],
         ["['d.1', 'a.1', 'b.1', 'c.1']", "['a.1', 'b.1', 'c.1']"]]
      ] },
      solution: {
        approach: R`<p>Iterative depth-first search with three colours. Each stack frame holds a node and an iterator over its sorted dependencies, so the walk is deterministic and never recurses. Post-order emission gives a valid topological order; a grey node met again is a cycle. Already-applied migrations are removed from the plan at the end, exactly like <code>MigrationExecutor.migration_plan</code> filters <code>forwards_plan</code>.</p>`,
        code: { lang: 'python', run: true, code: R`
class NodeNotFoundError(KeyError):
    pass


class CircularDependencyError(ValueError):
    pass


def migration_plan(graph, targets, applied=()):
    IN_PROGRESS, DONE = 1, 2
    colour, order = {}, []
    for target in targets:
        if target not in graph:
            raise NodeNotFoundError(target)
        if colour.get(target) == DONE:
            continue
        colour[target] = IN_PROGRESS
        stack = [(target, iter(sorted(graph[target])))]
        while stack:
            node, deps = stack[-1]
            for dep in deps:
                if dep not in graph:
                    raise NodeNotFoundError(f"{node} depends on missing {dep}")
                state = colour.get(dep)
                if state == IN_PROGRESS:
                    raise CircularDependencyError(dep)
                if state is None:
                    colour[dep] = IN_PROGRESS
                    stack.append((dep, iter(sorted(graph[dep]))))
                    break
            else:
                stack.pop()
                colour[node] = DONE
                order.append(node)
    done = set(applied)
    return [m for m in order if m not in done]


G = {"auth.0001": [], "auth.0002": ["auth.0001"],
     "blog.0001": ["auth.0001"], "blog.0002": ["blog.0001", "auth.0002"]}
print(migration_plan(G, ["blog.0002"]))
print(migration_plan(G, ["blog.0002"], applied=["auth.0001", "auth.0002"]))
` },
        dry: { head: ['stack top', 'next dep', 'action', 'order'], rows: [
          ['blog.0002', 'auth.0002', 'push', '[]'],
          ['auth.0002', 'auth.0001', 'push', '[]'],
          ['auth.0001', '—', 'pop, emit', '[auth.0001]'],
          ['auth.0002', '—', 'pop, emit', '[…, auth.0002]'],
          ['blog.0002', 'blog.0001', 'push', ''],
          ['blog.0001', 'auth.0001 (done)', 'skip; pop, emit', '[…, blog.0001]'],
          ['blog.0002', '—', 'pop, emit', '[…, blog.0002]']
        ] },
        complexity: R`<p>O(V + E log d) time (each node's d dependencies are sorted once) and O(V) space for colours and the stack.</p>`,
        followUps: ['Detect multiple leaf nodes per app (the "conflicting migrations" error)', 'Plan a backwards migration to a target', 'Apply squash <code>replaces</code> rules (see the practice arena)']
      }
    }]
  });

  /* ======================================================================
     TOPIC 6: Middleware, signals, admin and authentication
     ====================================================================== */
  topics.push({
    title: 'Middleware, Signals, the Admin and Authentication',
    analogy: R`<p>Middleware is the <b>layers of an onion</b> (or airport security lanes) around your view: every request walks <b>in</b> through security, passport control and the gate in that order, and the response walks <b>out</b> in reverse. Any layer can stop you early ("no boarding pass → go back"). <b>Signals</b> are the airport's public announcements: the sender shouts "flight BA12 saved!" and whoever subscribed reacts, without the sender knowing who listens. The <b>admin</b> is the staff back office that comes free with the building. <b>Authentication</b> is the passport check that attaches <code>request.user</code> to you.</p>`,
    explain: R`<p>🟢 <b>Middleware</b> is a list in <code>settings.MIDDLEWARE</code>. Each entry is a factory: it is called once at startup with <code>get_response</code> (the next layer) and returns a callable that handles requests. Order matters: the first entry is the <b>outermost</b> layer, so it sees the request first and the response last.</p>
      ${H.table(['Built-in middleware', 'Job', 'Why its position matters'], [
        ['<code>SecurityMiddleware</code>', 'HTTPS redirect, HSTS, security headers', 'near the top'],
        ['<code>SessionMiddleware</code>', 'loads <code>request.session</code> from the cookie', 'before auth (auth reads the session)'],
        ['<code>CommonMiddleware</code>', '<code>APPEND_SLASH</code>, <code>PREPEND_WWW</code>', 'before views'],
        ['<code>CsrfViewMiddleware</code>', 'rejects unsafe requests without a valid token', 'before views that trust POST data'],
        ['<code>AuthenticationMiddleware</code>', 'sets <code>request.user</code> (lazily)', 'after sessions'],
        ['<code>MessageMiddleware</code>', 'flash messages', 'after sessions']
      ])}
      <p><b>Signals</b> (<code>pre_save</code>, <code>post_save</code>, <code>pre_delete</code>, <code>post_delete</code>, <code>m2m_changed</code>, <code>request_finished</code>, <code>user_logged_in</code>…) let decoupled code react to events. They run <b>synchronously, in the same thread and transaction</b>, and they do <b>not</b> fire for <code>QuerySet.update()</code> or <code>bulk_create()</code>. Connect them in <code>AppConfig.ready()</code>; use <code>dispatch_uid</code> to avoid double registration.</p>
      <p><b>The admin</b>: register a model with a <code>ModelAdmin</code> (<code>list_display</code>, <code>search_fields</code>, <code>list_filter</code>, <code>list_select_related</code>, <code>raw_id_fields</code>) and staff users get CRUD pages for free. <b>Authentication</b>: <code>django.contrib.auth</code> gives the <code>User</code> model (use a <b>custom user model</b> from day one via <code>AUTH_USER_MODEL</code>), password hashing (PBKDF2 by default, Argon2 optional), sessions, <code>login()</code>/<code>logout()</code>, groups and permissions (<code>user.has_perm("blog.change_post")</code>), and pluggable <code>AUTHENTICATION_BACKENDS</code>.</p>`,
    clues: [
      '"add a header / timing / request id to every response" → middleware',
      '"request.user is AnonymousUser in my middleware" → your middleware runs before <code>AuthenticationMiddleware</code>',
      '"do X whenever a model is saved, from another app" → <code>post_save</code> signal (or, often better, an explicit service function)',
      '"signal did not fire" → you used <code>update()</code>/<code>bulk_create()</code>, or the receiver module was never imported',
      '"internal CRUD tool for ops, fast" → Django admin',
      '"we need email login / extra profile fields" → custom user model (<code>AbstractUser</code>) set before the first migration'
    ],
    code: [{ lang: 'python', check: false, title: 'Middleware, a signal and an admin', code: R`
import time
import uuid

from django.contrib import admin
from django.db.models.signals import post_save
from django.dispatch import receiver


class RequestTimingMiddleware:
    def __init__(self, get_response):          # once, at startup
        self.get_response = get_response

    def __call__(self, request):                # every request
        request.id = uuid.uuid4().hex
        start = time.perf_counter()
        response = self.get_response(request)   # call the next layer (eventually the view)
        response["X-Request-ID"] = request.id
        response["Server-Timing"] = f"app;dur={(time.perf_counter() - start) * 1000:.1f}"
        return response


@receiver(post_save, sender="blog.Post", dispatch_uid="post_saved_invalidate")
def invalidate_cache(sender, instance, created, **kwargs):
    cache.delete(f"post:{instance.pk}")


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ("title", "author", "published", "created")
    list_filter = ("published",)
    search_fields = ("title", "author__username")
    list_select_related = ("author",)          # no N+1 on the change list
    raw_id_fields = ("author",)                # no 100k-option <select>
` }, { lang: 'python', run: true, title: 'The onion: build the chain from the inside out', code: R`
def tag(name):
    def factory(get_response):
        def middleware(request):
            print(f"{name} in")
            response = get_response(request)
            print(f"{name} out")
            return response
        return middleware
    return factory

def view(request):
    print("view")
    return "200 OK"

MIDDLEWARE = [tag("Security"), tag("Session"), tag("Auth")]
handler = view
for factory in reversed(MIDDLEWARE):     # Django wraps from the last entry outwards
    handler = factory(handler)
print(handler("GET /"))
` }],
    viz: {
      title: 'A request through the middleware onion (and an early exit)',
      input: '/admin/',
      inputLabel: 'Path (paths starting with /admin/ are blocked for anonymous users)',
      gen: function (input) {
        var p = String(input === undefined ? '/admin/' : input).trim() || '/';
        if (p.length > 60) throw new Error('Keep the path short');
        var blocked = p.indexOf('/admin') === 0;
        var N = [['C', 'client', 6, 22], ['S', 'Security', 24, 22], ['Se', 'Session', 42, 22], ['A', 'Auth', 60, 22], ['G', 'AdminGate', 78, 22], ['V', 'view', 95, 22]];
        var E = [['C', 'S'], ['S', 'Se'], ['Se', 'A'], ['A', 'G'], ['G', 'V']];
        var trail = [];
        function st(narr, hl, ehl) { return { narr: narr, hl: hl, ehl: ehl, parts: [{ type: 'stack', label: 'call stack (top = running)', items: trail.slice() }] }; }
        var steps = [];
        trail.push('Security'); steps.push(st('<code>' + esc(p) + '</code> enters the <b>outermost</b> middleware (first in <code>MIDDLEWARE</code>). It could redirect HTTP→HTTPS here.', { S: 'cur' }, { 'C-S': 'ok' }));
        trail.push('Session'); steps.push(st('<code>SessionMiddleware</code> reads the session cookie and sets a lazy <code>request.session</code>.', { S: 'win', Se: 'cur' }, { 'S-Se': 'ok' }));
        trail.push('Auth'); steps.push(st('<code>AuthenticationMiddleware</code> sets <code>request.user</code> (a lazy object that loads the user from the session on first access). Here: anonymous.', { S: 'win', Se: 'win', A: 'cur' }, { 'Se-A': 'ok' }));
        trail.push('AdminGate');
        if (blocked) {
          steps.push(st('Our custom gate sees an anonymous user on <code>/admin/</code> and <b>returns a 302 redirect without calling <code>get_response</code></b>. The view never runs.', { S: 'win', Se: 'win', A: 'win', G: 'bad' }, { 'A-G': 'ok', 'G-V': 'bad' }));
        } else {
          steps.push(st('The gate lets the request through by calling <code>get_response(request)</code>.', { S: 'win', Se: 'win', A: 'win', G: 'cur' }, { 'A-G': 'ok' }));
          trail.push('view'); steps.push(st('The view runs and returns a 200 response.', { S: 'win', Se: 'win', A: 'win', G: 'win', V: 'ok' }, { 'G-V': 'ok' }));
          trail.pop();
        }
        trail.pop(); steps.push(st('The response unwinds <b>outwards</b>: Auth gets it back first…', { A: 'cur', Se: 'win', S: 'win' }, {}));
        trail.pop(); steps.push(st('…then Session, which saves the session and may set a cookie…', { Se: 'cur', S: 'win' }, {}));
        trail.pop(); steps.push(st('…and finally Security adds headers like HSTS. Response status: <b>' + (blocked ? '302' : '200') + '</b>. Order in <code>MIDDLEWARE</code> = order in, reverse = order out.', { S: 'cur', C: 'ok' }, { 'C-S': 'ok' }));
        return walk('MIDDLEWARE = [Security, Session, Auth, AdminGate]', N, E, steps, 44);
      }
    },
    examples: [
      { title: 'Signals do not fire for bulk operations', html: R`<p><code>Post.objects.filter(…).update(published=True)</code> is one SQL UPDATE; Django never builds model instances, so <code>pre_save</code>/<code>post_save</code> do not run. The same goes for <code>bulk_create</code> and <code>bulk_update</code>. If business logic must always run, put it in a service function, not a signal.</p>`, code: { lang: 'python', check: false, code: R`
post.published = True
post.save()                                      # post_save fires
Post.objects.filter(pk=post.pk).update(published=True)   # no signal
` } },
      { title: 'Object permissions and request.user', html: R`<p>Model permissions (<code>add/change/delete/view_post</code>) are created per model by a <code>post_migrate</code> handler. They are <b>per model, not per object</b>: "can change posts" means all posts. Ownership checks belong in your queryset or a DRF object permission; libraries like django-guardian add per-object permissions.</p>`, code: { lang: 'python', check: false, code: R`
request.user.has_perm("blog.change_post")        # model-level
Post.objects.filter(author=request.user)         # ownership via queryset
` } },
      { title: 'Writing a middleware as a class with process_view', html: R`<p>Besides <code>__call__</code>, a middleware may define hooks: <code>process_view(request, view_func, view_args, view_kwargs)</code> (after URL resolution, before the view), <code>process_exception(request, exception)</code> and <code>process_template_response</code>. Returning a response from a hook short-circuits the rest.</p>`, code: { lang: 'python', check: false, code: R`
class ReadOnlyModeMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
    def __call__(self, request):
        return self.get_response(request)
    def process_view(self, request, view_func, args, kwargs):
        if settings.READ_ONLY and request.method not in ("GET", "HEAD", "OPTIONS"):
            return JsonResponse({"detail": "maintenance"}, status=503)
        return None                               # continue normally
` } }
    ],
    deepDive: R`<p>🟣 <b>How Django builds the chain.</b> <code>BaseHandler.load_middleware()</code> starts from <code>_get_response</code> (which resolves the URL, runs <code>process_view</code> hooks and calls the view), then iterates <code>reversed(settings.MIDDLEWARE)</code>, instantiating each class with the current handler and wrapping the result in <code>convert_exception_to_response</code>. That wrapper turns any exception into a response (<code>Http404</code> → 404, <code>PermissionDenied</code> → 403, <code>SuspiciousOperation</code> → 400, others → 500), so an outer middleware always receives a response object, never an exception. A middleware raising <code>MiddlewareNotUsed</code> in <code>__init__</code> is skipped. Middleware may be sync, async or both (<code>sync_capable</code>/<code>async_capable</code>); a sync middleware in an ASGI stack forces thread switches, costing performance.</p>
      <p><b>Auth internals:</b> <code>login()</code> stores the user id, backend path and a session hash derived from the password hash in the session, and rotates the session key (prevents session fixation). Changing a password invalidates other sessions unless you call <code>update_session_auth_hash</code>. Passwords are stored as <code>algorithm$iterations$salt$hash</code> and transparently upgraded when the iteration count increases.</p>`,
    aiEra: R`<p>🤖 <b>AI and the request pipeline.</b> Generated code often adds middleware in the wrong position (reading <code>request.user</code> before <code>AuthenticationMiddleware</code>), uses old-style <code>MiddlewareMixin</code> with <code>process_request</code> where a simple class is clearer, or wires business logic into <code>post_save</code> signals that silently skip on <code>update()</code>. Ask the assistant to <code>Draw the order in which each MIDDLEWARE entry sees the request and the response, and list which attributes each one adds to request.</code> Signals deserve a second look in review: they make control flow invisible, and they run inside the caller's transaction, so a slow receiver slows every save. Prefer explicit service functions plus <code>transaction.on_commit</code> for side effects.</p>`,
    problems: [{
      title: 'Build a middleware chain that converts exceptions to responses',
      level: 'Medium', tags: ['django', 'middleware', 'closures', 'decorator pattern'], companies: ['Mozilla', 'Eventbrite', 'Sentry'],
      statement: R`<p>Write <code>build_handler(middleware, view)</code> like Django's <code>load_middleware</code>. Also define <code>Request(path)</code>, <code>Response(status, body='')</code> (with a <code>headers</code> dict and repr <code>&lt;Response 200 'ok'&gt;</code>), <code>Http404</code> and <code>PermissionDenied</code>.</p>
        <ul><li><code>middleware</code> is a list of factories <code>factory(get_response) → callable(request)</code>. The first factory is the <b>outermost</b> layer. Factories are called once, from the <b>last</b> to the first.</li>
        <li>Wrap the view and every middleware layer with <code>convert_exception_to_response</code>: <code>Http404</code> → <code>Response(404, 'Not Found')</code>, <code>PermissionDenied</code> → <code>Response(403, 'Forbidden')</code>, any other exception → <code>Response(500, 'Server Error')</code>.</li></ul>`,
      constraints: R`Up to 50 middleware. A middleware may short-circuit by returning a response without calling <code>get_response</code>.`,
      example: R`<p>With logging middleware A, B: init order ${H.c('b', 'B, A')}; one request logs ${H.c('g', 'A in, B in, view, B out, A out')}. If the view raises <code>ValueError</code>, A still receives a ${H.c('r', '500')} response and logs "A out".</p>`,
      brute: {
        why: R`<p>Calling each middleware's "before" hook in a loop, then the view, then the "after" hooks in reverse cannot express short-circuiting or wrapping (try/finally, timing around the call), and one exception skips every "after" hook.</p>`,
        code: R`
          def run_flat(befores, view, afters, request):
              for b in befores:
                  b(request)
              response = view(request)          # an exception here skips all afters
              for a in reversed(afters):
                  response = a(request, response)
              return response

          print(run_flat([print], lambda r: "ok", [lambda r, resp: resp + "!"], "req"))
        `
      },
      mcq: { q: 'Why does Django wrap every middleware layer, not just the view, with <code>convert_exception_to_response</code>?', options: ['So each outer layer always gets a response object back, even when an inner middleware raises', 'To make middleware faster', 'Because views cannot raise exceptions', 'To log every request'], answer: 0, explain: 'Outer middleware (sessions, security headers, CORS) must still post-process the response. Converting at every boundary guarantees they see a response, not an exception.' },
      hints: [
        R`<p>Hint 1: Start with <code>handler = convert_exception_to_response(view)</code>.</p>`,
        R`<p>Hint 2: Loop over <code>reversed(middleware)</code>: <code>handler = convert_exception_to_response(factory(handler))</code>. The last-built handler is the outermost.</p>`,
        R`<p>Hint 3: <code>convert_exception_to_response(get_response)</code> returns <code>inner(request)</code> with try/except: catch <code>Http404</code> and <code>PermissionDenied</code> before the generic <code>Exception</code>.</p>`
      ],
      tests: { sig: 'string[] -> string[]', fn: 'run_lines', harness: { python: PYT }, cases: [
        [[['LOG = []',
           "def tag(name):\n    def factory(get_response):\n        LOG.append('init ' + name)\n        def mw(request):\n            LOG.append(name + ' in')\n            r = get_response(request)\n            LOG.append(name + ' out')\n            return r\n        return mw\n    return factory",
           "def view(request):\n    LOG.append('view')\n    return Response(200, 'ok')",
           "h = build_handler([tag('A'), tag('B')], view)",
           'LOG',
           "h(Request('/'))",
           'LOG[2:]']],
         ["['init B', 'init A']", "<Response 200 'ok'>", "['A in', 'B in', 'view', 'B out', 'A out']"]],
        [[['LOG = []',
           "def tag(name):\n    def factory(get_response):\n        def mw(request):\n            LOG.append(name + ' in')\n            r = get_response(request)\n            LOG.append(name + ' out')\n            return r\n        return mw\n    return factory",
           "def block(get_response):\n    def mw(request):\n        if request.path.startswith('/admin'):\n            return Response(403, 'nope')\n        return get_response(request)\n    return mw",
           "def view(request):\n    LOG.append('view')\n    return Response(200, 'ok')",
           "h = build_handler([tag('A'), block, tag('C')], view)",
           "h(Request('/admin/x')).status",
           'LOG',
           'LOG.clear()',
           "h(Request('/home')).status",
           'LOG']],
         ['403', "['A in', 'A out']", '200', "['A in', 'C in', 'view', 'C out', 'A out']"]],
        [[['LOG = []',
           "def tag(name):\n    def factory(get_response):\n        def mw(request):\n            r = get_response(request)\n            LOG.append(name + ' saw ' + str(r.status))\n            return r\n        return mw\n    return factory",
           "def view(request):\n    raise ValueError('bug')",
           "r = build_handler([tag('A')], view)(Request('/'))",
           'r',
           'LOG']],
         ["<Response 500 'Server Error'>", "['A saw 500']"]],
        [[["def nf(request):\n    raise Http404()",
           "def pd(request):\n    raise PermissionDenied()",
           "build_handler([], nf)(Request('/x'))",
           "build_handler([], pd)(Request('/x')).status",
           "build_handler([], lambda r: Response(200, 'ok'))(Request('/'))"]],
         ["<Response 404 'Not Found'>", '403', "<Response 200 'ok'>"]],
        [[['LOG = []',
           "def tag(name):\n    def factory(get_response):\n        def mw(request):\n            r = get_response(request)\n            LOG.append(name + ' saw ' + str(r.status))\n            return r\n        return mw\n    return factory",
           "def boom(get_response):\n    def mw(request):\n        raise RuntimeError('middleware bug')\n    return mw",
           "h = build_handler([tag('A'), boom, tag('C')], lambda r: Response(200, 'ok'))",
           "h(Request('/')).status",
           'LOG']],
         ['500', "['A saw 500']"]],
        [[["def headers(get_response):\n    def mw(request):\n        r = get_response(request)\n        r.headers['X-Frame-Options'] = 'DENY'\n        return r\n    return mw",
           "def count(get_response):\n    def mw(request):\n        r = get_response(request)\n        r.headers['X-Depth'] = str(int(r.headers.get('X-Depth', '0')) + 1)\n        return r\n    return mw",
           "h = build_handler([headers] + [count] * 50, lambda r: Response(204))",
           "r = h(Request('/'))",
           'r.status',
           "r.headers['X-Frame-Options']",
           "r.headers['X-Depth']",
           "r.body"]],
         ['204', "'DENY'", "'50'", "''"]]
      ] },
      solution: {
        approach: R`<p>Build the onion from the inside out. The innermost handler is the exception-converted view. For each factory from last to first, call it with the current handler and wrap its result in the converter. The final handler is the first factory's layer, so requests enter in list order and responses leave in reverse.</p>`,
        code: { lang: 'python', run: true, code: R`
class Http404(Exception):
    pass


class PermissionDenied(Exception):
    pass


class Request:
    def __init__(self, path):
        self.path = path


class Response:
    def __init__(self, status, body=""):
        self.status, self.body, self.headers = status, body, {}

    def __repr__(self):
        return f"<Response {self.status} {self.body!r}>"


def convert_exception_to_response(get_response):
    def inner(request):
        try:
            return get_response(request)
        except Http404:
            return Response(404, "Not Found")
        except PermissionDenied:
            return Response(403, "Forbidden")
        except Exception:
            return Response(500, "Server Error")
    return inner


def build_handler(middleware, view):
    handler = convert_exception_to_response(view)
    for factory in reversed(middleware):
        handler = convert_exception_to_response(factory(handler))
    return handler


def timing(get_response):
    def mw(request):
        response = get_response(request)
        response.headers["X-Path"] = request.path
        return response
    return mw

def view(request):
    if request.path == "/missing":
        raise Http404()
    return Response(200, "ok")

h = build_handler([timing], view)
print(h(Request("/")), h(Request("/")).headers)
print(h(Request("/missing")))
` },
        dry: { head: ['build step', 'handler is now'], rows: [
          ['start', 'convert(view)'],
          ['factory B', 'convert(B(convert(view)))'],
          ['factory A', 'convert(A(convert(B(convert(view)))))'],
          ['request', 'A in → B in → view → B out → A out']
        ] },
        complexity: R`<p>Building is O(M) for M middleware; each request costs O(M) calls. Space O(M) closures.</p>`,
        followUps: ['Add <code>process_view</code> hooks that run after URL resolution', 'Support middleware that raises <code>MiddlewareNotUsed</code> in its factory to remove itself']
      }
    }]
  });

  /* ======================================================================
     TOPIC 7: DRF serializers, viewsets and routers
     ====================================================================== */
  var SER_STEPS = [
    'serializer = SignupSerializer(data=request.data)',
    'serializer.is_valid(raise_exception=True)',
    '#  1. each field: required? null? to_internal_value() + validators',
    '#  2. validate_<field>(value) for every field that passed',
    '#  3. validate(attrs)  object-level, only if no field errors',
    'user = serializer.save()          # create(validated_data)',
    'return Response(UserSerializer(user).data, status=201)'
  ].join('\n');

  topics.push({
    title: 'Django REST Framework: Serializers, Validation, ViewSets and Routers',
    analogy: R`<p>A DRF <b>serializer</b> is a <b>customs officer at a border</b> who works both directions. Going <b>out</b>, it packs your Python objects into a JSON suitcase (<code>serializer.data</code>), leaving out anything private. Coming <b>in</b>, it opens the incoming suitcase, checks every item against the rules (type, length, required), writes a list of problems per item, and only lets clean goods through as <code>validated_data</code>. A <b>ViewSet</b> is one service desk that handles all paperwork for one resource (list, create, retrieve, update, delete), and the <b>router</b> puts up the signs pointing each URL and method to the right window.</p>`,
    explain: R`<p>🟢 <b>Serializers.</b> <code>ModelSerializer</code> reads your model and creates fields automatically. Output: <code>BookSerializer(book).data</code> (or <code>many=True</code> for a list). Input: <code>s = BookSerializer(data=request.data)</code>, then <code>s.is_valid()</code> fills <code>s.validated_data</code> or <code>s.errors</code>, and <code>s.save()</code> calls <code>create()</code> or <code>update()</code>.</p>
      ${H.table(['Validation step', 'Where you write it', 'Error shape'], [
        ['Field rules', '<code>CharField(max_length=20)</code>, <code>IntegerField(min_value=13)</code>, <code>required</code>, <code>allow_null</code>, <code>allow_blank</code>', '<code>{"age": ["Ensure this value is greater than or equal to 13."]}</code>'],
        ['Field method', '<code>def validate_username(self, value)</code>', 'under that field'],
        ['Object level', '<code>def validate(self, attrs)</code> (runs only if all fields passed)', '<code>{"non_field_errors": [...]}</code>'],
        ['Reusable', '<code>validators=[UniqueValidator(queryset=…)]</code>, <code>UniqueTogetherValidator</code>', 'field or non-field']
      ])}
      <p><code>read_only=True</code> fields appear in output but are ignored in input; <code>write_only=True</code> (passwords) are accepted but never returned. <code>partial=True</code> (used by PATCH) skips "required" checks and does <b>not</b> apply defaults for missing fields.</p>
      <p><b>Views.</b> <code>APIView</code> is a <code>View</code> that parses JSON into <code>request.data</code>, runs authentication, permissions and throttling, and handles <code>APIException</code>s. Generic views (<code>ListCreateAPIView</code>, <code>RetrieveUpdateDestroyAPIView</code>) add <code>get_queryset</code>/<code>get_object</code>/pagination. A <code>ModelViewSet</code> bundles <b>list, create, retrieve, update, partial_update, destroy</b>; a <code>DefaultRouter</code> generates <code>/books/</code> and <code>/books/{pk}/</code> and maps HTTP methods to those actions. <code>@action(detail=True, methods=["post"])</code> adds custom endpoints like <code>/books/{pk}/publish/</code>.</p>`,
    clues: [
      '"validate the request body and return field errors as JSON" → serializer + <code>is_valid(raise_exception=True)</code> → 400',
      '"password must never appear in responses" → <code>write_only=True</code>',
      '"two fields must match / end after start" → <code>validate(self, attrs)</code>',
      '"PATCH should not require all fields" → <code>partial=True</code> (UpdateModelMixin does it for PATCH)',
      '"CRUD API for a model with minimal code" → <code>ModelViewSet</code> + router',
      '"nested serializer makes the endpoint slow" → N+1: <code>select_related</code>/<code>prefetch_related</code> in <code>get_queryset</code>'
    ],
    code: [{ lang: 'python', check: false, title: 'Serializer, ViewSet and router', code: R`
from django.contrib.auth.password_validation import validate_password
from rest_framework import permissions, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.routers import DefaultRouter


class BookSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.name", read_only=True)

    class Meta:
        model = Book
        fields = ["id", "title", "year", "price", "author", "author_name", "status"]
        read_only_fields = ["id", "status"]

    def validate_title(self, value):
        if value.strip().lower() == "untitled":
            raise serializers.ValidationError("Pick a real title.")
        return value.strip()

    def validate(self, attrs):
        if attrs.get("year", 0) > 2100:
            raise serializers.ValidationError("Year is in the far future.")
        return attrs


class BookViewSet(viewsets.ModelViewSet):
    serializer_class = BookSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        return Book.objects.select_related("author").order_by("-id")   # no N+1 for author_name

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        book = self.get_object()                   # runs object permissions
        book.status = "published"
        book.save(update_fields=["status"])
        return Response({"status": "published"})


router = DefaultRouter()
router.register("books", BookViewSet, basename="book")
urlpatterns = router.urls
# GET/POST /books/   GET/PUT/PATCH/DELETE /books/{pk}/   POST /books/{pk}/publish/
` }, { lang: 'python', run: true, title: 'Field errors first, object errors only when fields pass', code: R`
def validate(data):
    errors = {}
    if not str(data.get("title", "")).strip():
        errors["title"] = ["This field may not be blank."]
    if "year" not in data:
        errors["year"] = ["This field is required."]
    if errors:
        return False, errors                      # validate(attrs) is never reached
    if data["year"] > 2100:
        return False, {"non_field_errors": ["Year is in the far future."]}
    return True, {"title": data["title"].strip(), "year": data["year"]}

print(validate({"title": "  "}))
print(validate({"title": "Dune", "year": 3000}))
print(validate({"title": " Dune ", "year": 1965}))
` }],
    viz: {
      title: 'is_valid(): field validation, then object validation',
      input: 'ada, ada@x.io, 12, pw, pw',
      inputLabel: 'username, email, age, password, password2',
      gen: function (input) {
        var raw = String(input === undefined ? 'ada, ada@x.io, 12, pw, pw' : input).split(',').map(function (s) { return s.trim(); });
        if (raw.length !== 5) throw new Error('Give 5 comma-separated values: username, email, age, password, password2');
        var names = ['username', 'email', 'age', 'password', 'password2'];
        var errs = {}, frames = [], valid = {};
        function errMap() { return { type: 'map', label: 'serializer.errors', entries: Object.keys(errs).map(function (k) { return [k, errs[k]]; }) }; }
        frames.push({ narr: 'The view builds <code>SignupSerializer(data=request.data)</code> and calls <code>is_valid()</code>. Nothing is saved yet.', parts: [{ type: 'code', label: 'flow', lang: 'python', code: SER_STEPS, hl: { 1: 'cur', 2: 'cur' } }, { type: 'map', label: 'request.data', entries: names.map(function (n, i) { return [n, raw[i]]; }) }] });
        names.forEach(function (n, i) {
          var v = raw[i], e = null;
          if (v === '') e = n === 'username' || n.indexOf('password') === 0 ? 'This field may not be blank.' : 'This field is required.';
          else if (n === 'username' && v.length > 20) e = 'Ensure this field has no more than 20 characters.';
          else if (n === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) e = 'Enter a valid email address.';
          else if (n === 'age' && !/^-?\d+$/.test(v)) e = 'A valid integer is required.';
          else if (n === 'age' && parseInt(v, 10) < 13) e = 'Ensure this value is greater than or equal to 13.';
          if (e) errs[n] = e; else valid[n] = n === 'age' ? parseInt(v, 10) : v;
          var h = {}; h[n] = e ? 'bad' : 'ok';
          frames.push({ narr: 'Field <code>' + n + '</code>: ' + (e ? '<span class="c-r">' + esc(e) + '</span> The error is stored and validation <b>continues</b> with the next field, so the client sees every problem at once.' : 'passes (' + (n === 'age' ? 'string converted to int ' + parseInt(v, 10) : 'value accepted') + ').'), parts: [{ type: 'code', label: 'flow', lang: 'python', code: SER_STEPS, hl: { 3: 'cur' } }, { type: 'map', label: 'validated so far', entries: Object.keys(valid).map(function (k) { return [k, String(valid[k])]; }), hl: h }, errMap()] });
        });
        if (Object.keys(errs).length) {
          frames.push({ narr: 'Some fields failed, so <code>validate(attrs)</code> is <b>skipped</b>. <code>is_valid(raise_exception=True)</code> raises <code>ValidationError</code> → DRF returns <b>400</b> with this JSON.', parts: [errMap()] });
        } else if (raw[3] !== raw[4]) {
          errs.non_field_errors = 'Passwords do not match.';
          frames.push({ narr: 'All fields passed, so <code>validate(attrs)</code> runs and finds the passwords differ → <code>non_field_errors</code> → <b>400</b>.', parts: [{ type: 'code', label: 'flow', lang: 'python', code: SER_STEPS, hl: { 5: 'cur' } }, errMap()] });
        } else {
          frames.push({ narr: 'Everything passed. <code>validate()</code> drops <code>password2</code>; <code>save()</code> calls <code>create(validated_data)</code> (which hashes the password with <code>set_password</code>) and the view returns <b>201</b>. The password is <code>write_only</code>, so it never appears in the response.', parts: [{ type: 'code', label: 'flow', lang: 'python', code: SER_STEPS, hl: { 6: 'ok', 7: 'ok' } }, { type: 'map', label: 'response body', entries: [['id', '42'], ['username', valid.username], ['email', valid.email], ['age', String(valid.age)]] }] });
        }
        return frames;
      }
    },
    examples: [
      { title: 'Nested output, flat input', html: R`<p>Show the author as a nested object for reading, but accept just an id for writing: a read-only nested serializer plus a write-only <code>PrimaryKeyRelatedField</code> with <code>source</code>. Writable nested serializers need explicit <code>create()</code>/<code>update()</code>; DRF refuses to guess.</p>`, code: { lang: 'python', check: false, code: R`
class BookSerializer(serializers.ModelSerializer):
    author = AuthorSerializer(read_only=True)
    author_id = serializers.PrimaryKeyRelatedField(
        source="author", queryset=Author.objects.all(), write_only=True)

    class Meta:
        model = Book
        fields = ["id", "title", "author", "author_id"]
` } },
      { title: 'SerializerMethodField is a hidden N+1', html: R`<p><code>get_comment_count(self, obj)</code> calling <code>obj.comments.count()</code> runs one query per book. Annotate in the queryset instead and expose the annotation as a plain read-only field.</p>`, code: { lang: 'python', check: false, code: R`
# slow: one COUNT per row
def get_comment_count(self, obj):
    return obj.comments.count()

# fast: one query with GROUP BY
queryset = Book.objects.annotate(comment_count=Count("comments"))
comment_count = serializers.IntegerField(read_only=True)
` } },
      { title: 'How the router maps methods to actions', html: R`<p>For <code>ModelViewSet</code> the router creates two routes. The list route maps GET → <code>list</code> and POST → <code>create</code>; the detail route maps GET → <code>retrieve</code>, PUT → <code>update</code>, PATCH → <code>partial_update</code>, DELETE → <code>destroy</code>. Anything else gets 405. HEAD falls back to GET's action.</p>`, code: { lang: 'python', run: true, code: R`
LIST = {"get": "list", "post": "create"}
DETAIL = {"get": "retrieve", "put": "update", "patch": "partial_update", "delete": "destroy"}
for method, detail in [("GET", False), ("POST", False), ("PATCH", True), ("POST", True)]:
    table = DETAIL if detail else LIST
    print(method, "detail" if detail else "list", "->", table.get(method.lower(), "405"))
` } }
    ],
    deepDive: R`<p>🟣 <b>Inside a serializer.</b> A <code>Serializer</code> is itself a <code>Field</code>; its declared fields are collected by a metaclass into <code>_declared_fields</code>. <code>run_validation(data)</code> calls <code>to_internal_value</code>, which for each writable field calls <code>field.run_validation(primitive)</code> (empty/required/null checks, <code>to_internal_value</code>, then validators) and then <code>validate_&lt;name&gt;</code>; errors are collected into an <code>OrderedDict</code> in field order. Only after that does <code>run_validators</code> and <code>validate(attrs)</code> run. Output uses <code>to_representation</code>, which walks <code>source</code> paths (<code>author.name</code>), so nested sources are attribute lookups that may trigger queries.</p>
      <p><b>Performance.</b> DRF serialization is pure Python and can dominate CPU for big lists: for read-heavy endpoints use <code>values()</code> plus a lightweight serializer, cache responses, paginate, or consider faster libraries. <b>ModelSerializer gotchas:</b> <code>fields = "__all__"</code> leaks new columns automatically (prefer an explicit list); unique constraints become validators that run queries; <code>depth=1</code> creates nested read-only output that silently causes N+1. <b>Versions:</b> DRF 3.15 supports Django 4.2–5.x and Python 3.8+.</p>`,
    aiEra: R`<p>🤖 <b>AI and DRF.</b> Assistants generate ModelViewSets and serializers fluently, which makes it easy to ship an API that exposes every field (<code>"__all__"</code>), accepts writes to fields that should be read-only (<code>is_staff</code>, <code>owner</code>), or performs validation in the view instead of the serializer. Review checklist for generated DRF code: explicit <code>fields</code>, <code>read_only_fields</code> for server-owned data, <code>write_only</code> secrets, ownership enforced in <code>get_queryset</code>/<code>perform_create</code>, and a query-count test for list endpoints. A good prompt: <code>For this serializer, list every input field a client can set, every field returned, and the exact error JSON for an empty body.</code> Then compare it with the real response in a test.</p>`,
    problems: [{
      title: 'Validate a signup payload like a DRF serializer',
      level: 'Medium', tags: ['drf', 'serializers', 'validation', 'api design'], companies: ['Stripe', 'Twilio', 'Razorpay'],
      statement: R`<p>Write <code>validate_signup(data)</code> that mimics this DRF serializer and returns <code>(True, validated_data)</code> or <code>(False, errors)</code>:</p>
        <ul><li>Fields in order: <code>username</code> (CharField, trims whitespace, max 20, not blank), <code>email</code> (EmailField: trims, must match <code>^[^@\s]+@[^@\s]+\.[^@\s]+$</code>), <code>age</code> (IntegerField, <code>min_value=13</code>; accepts ints and digit strings), <code>password</code>, <code>password2</code> (CharFields, not blank, not trimmed).</li>
        <li>All fields required. Missing → <code>"This field is required."</code>; <code>None</code> → <code>"This field may not be null."</code>; blank after trimming → <code>"This field may not be blank."</code>; a CharField given a bool, list or dict → <code>"Not a valid string."</code> (ints/floats are converted with <code>str</code>); too long → <code>"Ensure this field has no more than 20 characters."</code>; bad email → <code>"Enter a valid email address."</code>; non-integer age → <code>"A valid integer is required."</code>; too young → <code>"Ensure this value is greater than or equal to 13."</code></li>
        <li><code>errors</code> maps field → list with one message, in field order. Only if every field passed: if passwords differ return <code>(False, {'non_field_errors': ['Passwords do not match.']})</code>.</li>
        <li><code>validated_data</code> has username, email, age, password (no password2); unknown keys are ignored.</li></ul>`,
      constraints: R`Payload values may be any JSON type.`,
      example: R`<p><code>{'username': ' ada ', 'email': 'ada@example.com', 'age': '36', 'password': 'pw', 'password2': 'pw'}</code> → ${H.c('g', "(True, {'username': 'ada', 'email': 'ada@example.com', 'age': 36, 'password': 'pw'})")}</p>`,
      brute: {
        why: R`<p>Stopping at the first problem (raise on the first bad field) forces the client into one round trip per mistake and makes form UIs painful; DRF collects <b>all</b> field errors before answering.</p>`,
        code: R`
          def validate_first_error(data):
              for field in ("username", "email", "age", "password", "password2"):
                  if field not in data:
                      return False, {field: ["This field is required."]}   # stops early
              return True, data

          print(validate_first_error({}))
        `
      },
      mcq: { q: 'Username is blank and the passwords differ. What does DRF return?', options: ['Only the username error: <code>validate(attrs)</code> runs only after all fields pass', 'Both errors', 'Only <code>non_field_errors</code>', 'A 500 error'], answer: 0, explain: 'Object-level validation needs clean attrs, so it is skipped while any field has errors.' },
      hints: [
        R`<p>Hint 1: Write one small function per field type that returns <code>(value, None)</code> or <code>(None, message)</code>, and a table of <code>(name, function)</code> in field order.</p>`,
        R`<p>Hint 2: Shared prelude for every field: missing → required; <code>None</code> → null. For CharFields reject <code>bool</code> and non-<code>(str, int, float)</code> first, then <code>str()</code>, trim if needed, then blank and length checks.</p>`,
        R`<p>Hint 3: For the integer, reject bools, accept <code>int</code>, accept strings that <code>.strip()</code> to <code>-?digits</code>; anything else is invalid. Run the password comparison only when <code>errors</code> is empty, and remove <code>password2</code> from the result.</p>`
      ],
      tests: { sig: 'string[] -> string[]', fn: 'run_lines', harness: { python: PYT }, cases: [
        [[["validate_signup({'username': ' ada ', 'email': 'ada@example.com', 'age': '36', 'password': 'pw', 'password2': 'pw'})"]],
         ["(True, {'username': 'ada', 'email': 'ada@example.com', 'age': 36, 'password': 'pw'})"]],
        [[['validate_signup({})']],
         ["(False, {'username': ['This field is required.'], 'email': ['This field is required.'], 'age': ['This field is required.'], 'password': ['This field is required.'], 'password2': ['This field is required.']})"]],
        [[["validate_signup({'username': '   ', 'email': 'nope', 'age': 12, 'password': 'a', 'password2': 'b'})"]],
         ["(False, {'username': ['This field may not be blank.'], 'email': ['Enter a valid email address.'], 'age': ['Ensure this value is greater than or equal to 13.']})"]],
        [[["validate_signup({'username': 'bob', 'email': 'b@x.io', 'age': 20, 'password': 'a', 'password2': 'b'})",
          "validate_signup({'username': 'bob', 'email': ' b@x.io ', 'age': 20, 'password': ' a', 'password2': ' a'})"]],
         ["(False, {'non_field_errors': ['Passwords do not match.']})", "(True, {'username': 'bob', 'email': 'b@x.io', 'age': 20, 'password': ' a'})"]],
        [[["validate_signup({'username': True, 'email': 'a@b.co', 'age': '15.5', 'password': 'p', 'password2': 'p'})",
          "validate_signup({'username': 'x' * 21, 'email': None, 'age': None, 'password': 'p', 'password2': ''})"]],
         ["(False, {'username': ['Not a valid string.'], 'age': ['A valid integer is required.']})", "(False, {'username': ['Ensure this field has no more than 20 characters.'], 'email': ['This field may not be null.'], 'age': ['This field may not be null.'], 'password2': ['This field may not be blank.']})"]],
        [[["validate_signup({'username': 'x' * 20, 'email': 'a@b.io', 'age': 13, 'password': 'p', 'password2': 'p', 'is_staff': True})",
          "validate_signup({'username': 12345, 'email': 'a@b.io', 'age': ' 99 ', 'password': 'p', 'password2': 'p'})[1]",
          "validate_signup({'username': 'u', 'email': 'a@b.io', 'age': True, 'password': ['p'], 'password2': 'p'})"]],
         ["(True, {'username': 'xxxxxxxxxxxxxxxxxxxx', 'email': 'a@b.io', 'age': 13, 'password': 'p'})", "{'username': '12345', 'email': 'a@b.io', 'age': 99, 'password': 'p'}", "(False, {'age': ['A valid integer is required.'], 'password': ['Not a valid string.']})"]]
      ] },
      solution: {
        approach: R`<p>Model the serializer as an ordered list of fields, each with a converter that either returns a clean value or one error message. Run every field (collecting all errors), then run object-level validation only when the field pass was clean. This is DRF's <code>to_internal_value</code> → <code>validate()</code> pipeline.</p>`,
        code: { lang: 'python', run: true, code: R`
import re

EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
INT = re.compile(r"^-?\d+$")


def char_field(max_length=None, trim=True):
    def run(value):
        if isinstance(value, bool) or not isinstance(value, (str, int, float)):
            return None, "Not a valid string."
        value = str(value)
        if trim:
            value = value.strip()
        if value == "":
            return None, "This field may not be blank."
        if max_length is not None and len(value) > max_length:
            return None, f"Ensure this field has no more than {max_length} characters."
        return value, None
    return run


def email_field(value):
    value, err = char_field()(value)
    if err:
        return None, err
    return (value, None) if EMAIL.match(value) else (None, "Enter a valid email address.")


def integer_field(min_value):
    def run(value):
        if isinstance(value, bool):
            return None, "A valid integer is required."
        if isinstance(value, str) and INT.match(value.strip()):
            value = int(value.strip())
        if not isinstance(value, int):
            return None, "A valid integer is required."
        if value < min_value:
            return None, f"Ensure this value is greater than or equal to {min_value}."
        return value, None
    return run


FIELDS = [
    ("username", char_field(max_length=20)),
    ("email", email_field),
    ("age", integer_field(min_value=13)),
    ("password", char_field(trim=False)),
    ("password2", char_field(trim=False)),
]


def validate_signup(data):
    attrs, errors = {}, {}
    for name, run in FIELDS:
        if name not in data:
            errors[name] = ["This field is required."]
            continue
        if data[name] is None:
            errors[name] = ["This field may not be null."]
            continue
        value, err = run(data[name])
        if err:
            errors[name] = [err]
        else:
            attrs[name] = value
    if errors:
        return False, errors
    if attrs["password"] != attrs["password2"]:
        return False, {"non_field_errors": ["Passwords do not match."]}
    del attrs["password2"]
    return True, attrs


print(validate_signup({"username": " ada ", "email": "ada@example.com", "age": "36",
                       "password": "pw", "password2": "pw"}))
print(validate_signup({"username": "  ", "email": "nope", "age": 12}))
` },
        dry: { head: ['field', 'input', 'step that decides', 'result'], rows: [
          ['username', "' ada '", 'trim → not blank, ≤ 20', "'ada'"],
          ['email', "'ada@example.com'", 'regex', 'ok'],
          ['age', "'36'", 'digit string → int, ≥ 13', '36'],
          ['password / password2', "'pw' / 'pw'", 'not blank', 'ok'],
          ['validate(attrs)', '—', 'passwords equal', 'drop password2 → valid']
        ] },
        complexity: R`<p>O(total input size): each field is checked once.</p>`,
        followUps: ['Add <code>partial=True</code> behaviour (see the practice arena)', 'Return all messages per field (a list may hold several, e.g. from multiple validators)']
      }
    }]
  });

  /* ======================================================================
     TOPIC 8: DRF permissions, pagination, throttling; Django vs FastAPI
     ====================================================================== */
  topics.push({
    title: 'DRF Permissions, Pagination and Throttling; Django vs FastAPI',
    analogy: R`<p>Think of a <b>nightclub</b>. Authentication is the bouncer reading your ID ("who are you?"). <b>Permissions</b> are the rules for each room: "members only", "VIP room: staff only", "you may look at any table, but only touch your own" (object permissions). <b>Throttling</b> is the turnstile that lets in at most 100 people per minute per person. <b>Pagination</b> is the waiter bringing the menu one page at a time; <b>cursor pagination</b> is a bookmark that still points to the right place even if new dishes are added to the front of the menu while you read.</p>`,
    explain: R`<p>🟢 <b>The order of checks</b> in <code>APIView.initial()</code>: authentication (sets <code>request.user</code>, lazily) → <code>check_permissions</code> → <code>check_throttles</code> → your handler. <code>get_object()</code> additionally runs <code>check_object_permissions(request, obj)</code>.</p>
      ${H.table(['Permission class', 'has_permission', 'has_object_permission'], [
        ['<code>AllowAny</code>', 'always', 'always'],
        ['<code>IsAuthenticated</code>', 'user is logged in', 'always'],
        ['<code>IsAdminUser</code>', '<code>user.is_staff</code>', 'always'],
        ['<code>IsAuthenticatedOrReadOnly</code>', 'safe method (GET, HEAD, OPTIONS) or logged in', 'always'],
        ['custom <code>IsOwnerOrReadOnly</code>', 'always', 'safe method or <code>obj.owner == user</code>']
      ])}
      <p>All classes in <code>permission_classes</code> must pass (AND). You can compose with <code>|</code>, <code>&amp;</code>, <code>~</code>: <code>[IsAdminUser | IsOwner]</code>. A denied unauthenticated request gets <b>401</b> if the first authentication class provides a <code>WWW-Authenticate</code> header (Token, Basic), otherwise <b>403</b> (Session). Object permissions are <b>not</b> checked for list views: filter the queryset instead.</p>
      <p><b>Pagination.</b> <code>PageNumberPagination</code> (<code>?page=3</code>, runs a COUNT, easy to jump), <code>LimitOffsetPagination</code> (<code>?limit=20&amp;offset=40</code>), <code>CursorPagination</code> (opaque <code>?cursor=…</code>, stable under inserts, needs a unique and unchanging ordering, no COUNT, no jumping). Large offsets are slow because the database still walks the skipped rows.</p>
      <p><b>Throttling.</b> <code>AnonRateThrottle</code>, <code>UserRateThrottle</code>, <code>ScopedRateThrottle</code> with rates like <code>"100/hour"</code>; history is kept in the Django cache, so use a shared cache (Redis) across servers. Exceeding it returns <b>429</b> with <code>Retry-After</code>.</p>
      <p><b>Django vs FastAPI.</b> Django is "batteries included": ORM, migrations, admin, auth, forms and a huge ecosystem, mostly synchronous (async views exist; the ORM has async methods that still run sync code in a thread). FastAPI is a thin ASGI layer with Pydantic validation, type-driven OpenAPI docs and native async; you choose your ORM (SQLAlchemy/SQLModel), migrations (Alembic) and auth yourself. Pick Django + DRF for data-heavy products with admin/back-office needs and big teams; FastAPI for lean async services, ML model serving, and high-concurrency I/O APIs. Django Ninja gives FastAPI-style typing on top of Django.</p>`,
    clues: [
      '"users can only edit their own posts" → object permission (<code>has_object_permission</code>) plus queryset filtering for lists',
      '"401 vs 403 for anonymous users" → depends on the authentication class\'s <code>WWW-Authenticate</code> header',
      '"infinite scroll / feed with new items arriving" → cursor pagination',
      '"page=50000 is slow" → OFFSET scans; switch to keyset/cursor pagination',
      '"limit each API key to 1000 requests/day" → throttling (shared cache) or an API gateway',
      '"should we use Django or FastAPI?" → admin/ORM/auth needs vs async-first lean services; team experience'
    ],
    code: [{ lang: 'python', check: false, title: 'Permissions, pagination and throttling settings', code: R`
# settings.py
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
        "rest_framework.authentication.TokenAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {"anon": "60/min", "user": "1000/hour"},
}

# permissions.py
from rest_framework import permissions


class IsOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.owner_id == request.user.id


# views.py
from rest_framework.pagination import CursorPagination


class FeedPagination(CursorPagination):
    page_size = 50
    ordering = ("-created", "-id")              # unique, unchanging ordering


class PostViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]
    pagination_class = FeedPagination

    def get_queryset(self):
        return Post.objects.select_related("owner")
` }, { lang: 'python', run: true, title: 'Why offsets skip or repeat rows when data changes', code: R`
feed = [50, 40, 30, 20, 10]                 # newest first
page1 = feed[0:2]                           # offset 0
feed.insert(0, 60)                          # a new post arrives
page2_offset = feed[2:4]                    # offset 2: repeats 40
last = page1[-1]
page2_cursor = [x for x in feed if x < last][:2]   # cursor: "older than 40"
print("page1", page1, "offset page2", page2_offset, "cursor page2", page2_cursor)
` }],
    viz: {
      title: 'One DRF request: authenticate → permissions → throttle → object permission',
      input: 'PUT owner=2 user=1',
      inputLabel: 'METHOD owner=<id> user=<id or anon>',
      gen: function (input) {
        var s = String(input === undefined ? 'PUT owner=2 user=1' : input).trim();
        var m = /^([A-Za-z]+)\s+owner=(\d+)\s+user=(\d+|anon)$/.exec(s);
        if (!m) throw new Error('Use the form: PUT owner=2 user=1   (user may be anon)');
        var method = m[1].toUpperCase(), owner = m[2], user = m[3];
        var safe = ['GET', 'HEAD', 'OPTIONS'].indexOf(method) >= 0;
        var N = [['Q', method + ' /posts/7/', 8, 24], ['A', 'authenticate', 28, 24], ['P', 'IsAuthenticatedOrReadOnly', 50, 24], ['T', 'throttle', 70, 24], ['O', 'IsOwnerOrReadOnly (object)', 90, 10], ['R', 'response', 90, 40]];
        var E = [['Q', 'A'], ['A', 'P'], ['P', 'T'], ['T', 'O'], ['O', 'R'], ['P', 'R'], ['T', 'R']];
        var steps = [];
        var vars = function (extra) { var v = { method: method, 'request.user': user === 'anon' ? 'AnonymousUser' : 'User(id=' + user + ')', 'post.owner_id': owner }; for (var k in extra) v[k] = extra[k]; return { type: 'vars', label: 'state', vals: v }; };
        steps.push({ narr: 'Authentication classes run in order (Session, then Token). ' + (user === 'anon' ? 'None succeeds → <code>AnonymousUser</code>.' : 'Session finds user ' + user + '.'), hl: { A: 'cur' }, ehl: { 'Q-A': 'ok' }, parts: [vars({})] });
        var p1 = safe || user !== 'anon';
        steps.push({ narr: '<code>IsAuthenticatedOrReadOnly.has_permission</code>: ' + (safe ? method + ' is a safe method → allowed.' : user === 'anon' ? 'unsafe method and anonymous → <b>denied</b>. Since SessionAuthentication has no WWW-Authenticate header, DRF answers <b>403</b> (with TokenAuthentication first it would be 401).' : 'user is authenticated → allowed.'), hl: { P: p1 ? 'ok' : 'bad' }, ehl: { 'A-P': 'ok' }, parts: [vars({ has_permission: p1 })] });
        if (!p1) { steps.push({ narr: 'The view never runs; no database query for the post happens.', hl: { R: 'bad' }, ehl: { 'P-R': 'bad' }, parts: [vars({ status: 403 })] }); }
        else {
          steps.push({ narr: 'Throttles check the request history in the cache (e.g. 1000/hour per user). Under the limit → continue; over → <b>429</b> with <code>Retry-After</code>.', hl: { T: 'ok' }, ehl: { 'P-T': 'ok' }, parts: [vars({ throttle: 'ok' })] });
          var p2 = safe || (user !== 'anon' && user === owner);
          steps.push({ narr: 'The handler calls <code>get_object()</code>, which loads post 7 and runs <code>has_object_permission</code>: ' + (safe ? 'safe method → allowed.' : user === owner ? 'user is the owner → allowed.' : 'user ' + user + ' is not owner ' + owner + ' → <b>403</b>.'), hl: { O: p2 ? 'ok' : 'bad' }, ehl: { 'T-O': 'ok' }, parts: [vars({ has_object_permission: p2 })] });
          steps.push({ narr: p2 ? 'All checks passed: the update runs and returns <b>200</b>.' : 'Denied at object level: <b>403 Forbidden</b>. Note that list endpoints never call object permissions, so filter the queryset too.', hl: { R: p2 ? 'ok' : 'bad' }, ehl: { 'O-R': p2 ? 'ok' : 'bad' }, parts: [vars({ status: p2 ? 200 : 403 })] });
        }
        return walk('DRF request checks', N, E, steps, 50);
      }
    },
    examples: [
      { title: 'OR-composed permissions check object rules pairwise (DRF 3.14+)', html: R`<p>With <code>IsAdminUser | IsOwner</code>, the object check is <code>(admin.has_permission and admin.has_object_permission) or (owner.has_permission and owner.has_object_permission)</code>. Older DRF versions ORed only the object checks, which let any user pass because <code>IsAdminUser.has_object_permission</code> is always True.</p>`, code: { lang: 'python', run: true, code: R`
class IsAdmin:
    def has_permission(self, user): return user["is_staff"]
    def has_object_permission(self, user, obj): return True
class IsOwner:
    def has_permission(self, user): return True
    def has_object_permission(self, user, obj): return obj["owner"] == user["id"]

alice, post = {"id": 1, "is_staff": False}, {"owner": 2}
a, o = IsAdmin(), IsOwner()
old = a.has_object_permission(alice, post) or o.has_object_permission(alice, post)
new = (a.has_permission(alice) and a.has_object_permission(alice, post)) or \
      (o.has_permission(alice) and o.has_object_permission(alice, post))
print("old rule allows:", old, "| new rule allows:", new)
` } },
      { title: 'Cursor pagination needs a unique ordering', html: R`<p>Ordering only by <code>created</code> breaks when two rows share a timestamp: the cursor cannot tell them apart and may skip one. Add the primary key as a tie-breaker (<code>("-created", "-id")</code>) and index it. DRF's cursor also stores an offset to handle duplicates, but a unique ordering is the robust fix.</p>`, code: { lang: 'python', check: false, code: R`
class EventCursor(CursorPagination):
    ordering = ("-created", "-id")
# SQL idea: WHERE (created, id) < (:c, :i) ORDER BY created DESC, id DESC LIMIT 51
` } },
      { title: 'The same endpoint in Django REST Framework and FastAPI', html: R`<p>DRF: a serializer + view + router, with auth, permissions, pagination and the browsable API from settings. FastAPI: one typed function; validation from the Pydantic model and dependencies via <code>Depends</code> (see the FastAPI module). Django's ORM call is synchronous unless you use the <code>a</code>-prefixed methods (<code>aget</code>, <code>acreate</code>, async iteration).</p>`, code: { lang: 'python', check: false, code: R`
# Django REST Framework
class BookDetail(generics.RetrieveAPIView):
    queryset = Book.objects.select_related("author")
    serializer_class = BookSerializer

# FastAPI (+ SQLAlchemy async session)
@app.get("/books/{book_id}", response_model=BookOut)
async def get_book(book_id: int, db: AsyncSession = Depends(get_db)):
    book = await db.get(Book, book_id)
    if book is None:
        raise HTTPException(404)
    return book

# Django async view with the async ORM API
async def book_detail(request, pk):
    book = await Book.objects.select_related("author").aget(pk=pk)
    return JsonResponse({"title": book.title, "author": book.author.name})
` } }
    ],
    deepDive: R`<p>🟣 <b>Permission internals.</b> <code>APIView.check_permissions</code> instantiates each class from <code>get_permissions()</code> and calls <code>permission_denied(request, message, code)</code> on the first failure; that raises <code>NotAuthenticated</code> if authenticators are configured but none succeeded, otherwise <code>PermissionDenied</code>. The exception handler turns <code>NotAuthenticated</code> into 401 only when <code>get_authenticate_header()</code> returns a value; otherwise 403. <code>OperandHolder</code> implements <code>|</code>, <code>&amp;</code> and <code>~</code> for composition. Because <code>request.user</code> is lazy, authentication may actually run inside a permission check.</p>
      <p><b>Pagination internals.</b> <code>PageNumberPagination</code> uses Django's <code>Paginator</code> (<code>COUNT(*)</code> + <code>LIMIT/OFFSET</code>); <code>page=last</code> is supported; the previous link for page 2 drops the <code>page</code> parameter. <code>CursorPagination</code> encodes <code>(offset, reverse, position)</code> in base64, filters with <code>field &lt; position</code> (or <code>&gt;</code>), and fetches <code>page_size + 1</code> rows to know whether a next page exists. <b>Throttling</b>: <code>SimpleRateThrottle</code> keeps a list of request timestamps per key in the cache, prunes those older than the window, and allows the request if fewer than <code>num_requests</code> remain; it is not atomic across processes, so treat it as a soft limit and enforce hard quotas at the gateway.</p>`,
    aiEra: R`<p>🤖 <b>AI, security and framework choice.</b> Generated DRF views often set <code>permission_classes = [AllowAny]</code> "to make the test pass", rely on object permissions for list endpoints (which never call them), or paginate with offsets on million-row tables. Treat every generated permission class as a security review item and write tests for each role × method. On the "Django or FastAPI?" question, assistants tend to answer by popularity; frame it yourself with concrete needs: do we need an admin, migrations and auth today (Django), or a small async service in front of a model or other APIs (FastAPI)? LLM-backed endpoints are I/O-bound and long-running, which favours async stacks (FastAPI, or Django async views on ASGI with streaming responses).</p>`,
    problems: [{
      title: 'Cursor pagination over a changing feed',
      level: 'Hard', tags: ['drf', 'pagination', 'keyset', 'base64'], companies: ['Twitter', 'Slack', 'LinkedIn'],
      statement: R`<p>Write <code>paginate(rows, cursor, page_size)</code> returning <code>(ids, next_cursor)</code>. Rows are dicts with unique <code>id</code> and integer <code>created</code>. Order is <b>newest first</b>: by <code>created</code> descending, then <code>id</code> descending.</p>
        <ul><li><code>cursor=None</code> → first page. Otherwise the cursor is an opaque URL-safe base64 string encoding the position <code>"created:id"</code> of the last row of the previous page; the next page contains rows strictly after that position in the ordering.</li>
        <li><code>next_cursor</code> is <code>None</code> when there are no more rows.</li>
        <li>A cursor that cannot be decoded or parsed raises <code>InvalidCursor</code>. <code>page_size &lt; 1</code> raises <code>ValueError</code>.</li>
        <li>Inserting newer rows or deleting already-seen rows between requests must not cause duplicates or skips.</li></ul>`,
      constraints: R`Up to 10<sup>5</sup> rows; ids unique; page_size ≤ 1000.`,
      example: R`<p>Rows (id/created): 1/10, 2/20, 3/20, 4/30, 5/5 → order ${H.c('b', '4, 3, 2, 1, 5')}. Page size 2: ${H.c('g', '[4, 3]')} → ${H.c('g', '[2, 1]')} → ${H.c('g', '[5]')} and next is None. If a row with created 40 is added after page 1, page 2 is still [2, 1] (offset pagination would repeat 3).</p>`,
      brute: {
        why: R`<p>Offset pagination (<code>rows[offset:offset+size]</code>) is simple but shifts when new rows arrive at the top (duplicates) or seen rows are deleted (skips), and the database must walk all skipped rows for large offsets.</p>`,
        code: R`
          def paginate_offset(rows, offset, size):
              ordered = sorted(rows, key=lambda r: (r["created"], r["id"]), reverse=True)
              return [r["id"] for r in ordered[offset:offset + size]]

          feed = [{"id": i, "created": i} for i in range(1, 6)]
          print(paginate_offset(feed, 0, 2))
          feed.append({"id": 6, "created": 6})
          print(paginate_offset(feed, 2, 2))      # repeats id 4
        `
      },
      mcq: { q: 'Why must the ordering include a unique tie-breaker such as <code>id</code>?', options: ['Without it, rows sharing a <code>created</code> value have no well-defined position, so a cursor can skip or repeat them', 'Because base64 needs two numbers', 'To make sorting faster', 'Because DRF requires the primary key in every URL'], answer: 0, explain: 'A keyset cursor says "everything after (created, id)". With duplicate timestamps and no tie-breaker, "after" is ambiguous.' },
      hints: [
        R`<p>Hint 1: Sort key <code>(created, id)</code> with <code>reverse=True</code>. "After the cursor" means the key is strictly <b>less</b> than the cursor's key.</p>`,
        R`<p>Hint 2: Fetch <code>page_size + 1</code> candidate rows; if you got the extra one, there is a next page and its cursor encodes the last row you return.</p>`,
        R`<p>Hint 3: Encode with <code>base64.urlsafe_b64encode(f"{c}:{i}".encode()).decode()</code>; decode inside try/except (<code>binascii.Error</code>, <code>UnicodeDecodeError</code>, <code>ValueError</code>) and re-raise as <code>InvalidCursor</code>.</p>`
      ],
      tests: { sig: 'string[] -> string[]', fn: 'run_lines', harness: { python: PYT }, cases: [
        [[["R = [{'id': 1, 'created': 10}, {'id': 2, 'created': 20}, {'id': 3, 'created': 20}, {'id': 4, 'created': 30}, {'id': 5, 'created': 5}]",
           'ids, nxt = paginate(R, None, 2)',
           'ids',
           'ids, nxt = paginate(R, nxt, 2)',
           'ids',
           'ids, nxt = paginate(R, nxt, 2)',
           'ids',
           'nxt is None']],
         ['[4, 3]', '[2, 1]', '[5]', 'True']],
        [[["R = [{'id': 1, 'created': 10}, {'id': 2, 'created': 20}, {'id': 3, 'created': 20}, {'id': 4, 'created': 30}, {'id': 5, 'created': 5}]",
           'ids, nxt = paginate(R, None, 2)',
           "R.append({'id': 6, 'created': 40})",
           'paginate(R, nxt, 2)[0]',
           'paginate(R, None, 2)[0]']],
         ['[2, 1]', '[6, 4]']],
        [[["R = [{'id': 1, 'created': 10}, {'id': 2, 'created': 20}, {'id': 3, 'created': 20}, {'id': 4, 'created': 30}, {'id': 5, 'created': 5}]",
           'paginate(R, None, 5)[1] is None',
           'paginate(R, None, 4)[0]',
           'paginate(R, None, 4)[1] is None',
           'paginate(R, None, 100)[0]']],
         ['True', '[4, 3, 2, 1]', 'False', '[4, 3, 2, 1, 5]']],
        [[["R = [{'id': 1, 'created': 10}]",
           "paginate(R, 'not-base64!!', 2)",
           "paginate(R, 'Zm9v', 2)",
           'paginate(R, None, 0)',
           'paginate([], None, 3)']],
         ['!InvalidCursor', '!InvalidCursor', '!ValueError', '([], None)']],
        [[["R = [{'id': 1, 'created': 10}, {'id': 2, 'created': 20}, {'id': 3, 'created': 20}, {'id': 4, 'created': 30}, {'id': 5, 'created': 5}]",
           'ids, nxt = paginate(R, None, 2)',
           "R = [r for r in R if r['id'] != 3]",
           'paginate(R, nxt, 2)[0]',
           'paginate(R, nxt, 1)[0]']],
         ['[2, 1]', '[2]']],
        [[["BIG = [{'id': i, 'created': i % 7} for i in range(1000)]",
           "seen = []\nc = None\nwhile True:\n    ids, c = paginate(BIG, c, 64)\n    seen += ids\n    if c is None:\n        break",
           '(len(seen), len(set(seen)))',
           'seen[:3]',
           'seen[-1]']],
         ['(1000, 1000)', '[993, 986, 979]', '0']]
      ] },
      solution: {
        approach: R`<p>Keyset pagination: the cursor stores the sort key of the last row served. The next page is "rows whose key is strictly smaller", sorted descending, limited to <code>page_size + 1</code> to detect a next page. Because the position is a value, not a count, rows inserted above or deleted below the cursor do not shift the window. This is the idea behind DRF's <code>CursorPagination</code> (which also handles reverse paging and duplicate positions).</p>`,
        code: { lang: 'python', run: true, code: R`
import base64
import binascii


class InvalidCursor(Exception):
    pass


def _key(row):
    return (row["created"], row["id"])


def encode_cursor(key):
    return base64.urlsafe_b64encode(f"{key[0]}:{key[1]}".encode()).decode()


def decode_cursor(cursor):
    try:
        text = base64.urlsafe_b64decode(cursor.encode()).decode()
        created, ident = text.split(":")
        return (int(created), int(ident))
    except (binascii.Error, UnicodeDecodeError, ValueError):
        raise InvalidCursor(cursor) from None


def paginate(rows, cursor, page_size):
    if page_size < 1:
        raise ValueError("page_size must be >= 1")
    position = decode_cursor(cursor) if cursor is not None else None
    ordered = sorted(rows, key=_key, reverse=True)
    if position is not None:
        ordered = [r for r in ordered if _key(r) < position]
    window = ordered[:page_size + 1]
    page = window[:page_size]
    next_cursor = encode_cursor(_key(page[-1])) if len(window) > page_size else None
    return [r["id"] for r in page], next_cursor


R = [{"id": 1, "created": 10}, {"id": 2, "created": 20}, {"id": 3, "created": 20},
     {"id": 4, "created": 30}, {"id": 5, "created": 5}]
ids, nxt = paginate(R, None, 2)
print(ids, nxt)
R.append({"id": 6, "created": 40})          # new post arrives at the top
print(paginate(R, nxt, 2))
` },
        dry: { head: ['request', 'cursor decodes to', 'rows with key &lt; cursor', 'page', 'next'], rows: [
          ['page 1', '—', 'all', '[4, 3]', '(20, 3)'],
          ['page 2', '(20, 3)', '(20,2) (10,1) (5,5)', '[2, 1]', '(10, 1)'],
          ['page 3', '(10, 1)', '(5,5)', '[5]', 'None']
        ] },
        complexity: R`<p>Here O(n log n) per page because we sort in Python. In a database with an index on <code>(created, id)</code> the query <code>WHERE (created, id) &lt; (:c, :i) ORDER BY created DESC, id DESC LIMIT k+1</code> is O(log n + k), independent of how deep you are.</p>`,
        followUps: ['Add a <code>previous</code> cursor (reverse direction)', 'Why does DRF also store an offset inside its cursor?', 'Sign the cursor (HMAC) so clients cannot forge positions']
      }
    }]
  });

  /* ======================================================================
     PRACTICE ARENA
     ====================================================================== */
  practice.push({
    title: 'reverse(): build a URL from a route name',
    level: 'Easy', tags: ['django', 'urls', 'reverse', 'regex'], companies: ['Mozilla', 'Disqus', 'Instagram'],
    statement: R`<p>Write <code>reverse(urlpatterns, name, kwargs)</code>. <code>urlpatterns</code> is a list of <code>(route, name)</code> using converters <code>str</code> (default), <code>int</code>, <code>slug</code>, <code>path</code> (regexes as in Django). Try every pattern with that name in order; a pattern fits when the set of kwargs equals its parameters and <code>str(value)</code> fully matches each converter's regex. Return <code>"/" + route</code> with the values substituted, URL-quoted with <code>urllib.parse.quote(url, safe="/~:@!$&amp;'()*+,;=")</code>. No fit → <code>NoReverseMatch</code>.</p>`,
    constraints: R`Up to 100 patterns; values are ints or strings.`,
    example: R`<p><code>reverse(P, 'detail', {'year': 2024, 'slug': 'hi-there'})</code> → ${H.c('g', "'/articles/2024/hi-there/'")}; <code>{'year': 'abc'}</code> for an int route → ${H.c('r', 'NoReverseMatch')}.</p>`,
    brute: {
      why: R`<p>Plain string formatting (<code>route.replace("&lt;int:year&gt;", str(year))</code>) builds URLs that the resolver would never match (wrong types, missing or extra arguments) and forgets quoting.</p>`,
      code: R`
        def reverse_brute(route, **kwargs):
            for k, v in kwargs.items():
                route = route.replace("<int:" + k + ">", str(v))
            return "/" + route

        print(reverse_brute("articles/<int:year>/", year="abc"))    # '/articles/abc/' : broken link
      `
    },
    mcq: { q: 'Why must reverse() check each value against the converter regex?', options: ['So every URL it builds would resolve back to the same view', 'To make it faster', 'Because kwargs are always strings', 'It does not need to'], answer: 0, explain: 'Reversal is the inverse of resolution; producing a path the resolver rejects would create dead links.' },
    hints: [
      R`<p>Hint 1: Parse each route into literal pieces and <code>(converter, name)</code> parameters with the same regex you used for resolving.</p>`,
      R`<p>Hint 2: Skip a candidate if <code>set(kwargs) != set(params)</code> or any <code>re.fullmatch(regex, str(value))</code> fails.</p>`,
      R`<p>Hint 3: Substitute values with <code>re.sub</code> using a function, then quote the whole path with the given <code>safe</code> set; raise <code>NoReverseMatch</code> after trying all candidates.</p>`
    ],
    tests: { sig: 'string[] -> string[]', fn: 'run_lines', harness: { python: PYT }, cases: [
      [[["P = [('articles/<int:year>/', 'year'), ('articles/<int:year>/<slug:slug>/', 'detail'), ('', 'home'), ('about/', 'about')]",
         "reverse(P, 'year', {'year': 2024})",
         "reverse(P, 'detail', {'year': 2024, 'slug': 'hi-there'})",
         "reverse(P, 'home', {})",
         "reverse(P, 'about', {})"]],
       ["'/articles/2024/'", "'/articles/2024/hi-there/'", "'/'", "'/about/'"]],
      [[["P = [('articles/<int:year>/', 'year'), ('articles/<int:year>/<slug:slug>/', 'detail')]",
         "reverse(P, 'year', {})",
         "reverse(P, 'year', {'year': 'abc'})",
         "reverse(P, 'detail', {'year': 2024, 'slug': 'bad slug'})",
         "reverse(P, 'nope', {})",
         "reverse(P, 'year', {'year': 2024, 'extra': 1})",
         "reverse(P, 'year', {'year': -1})"]],
       ['!NoReverseMatch', '!NoReverseMatch', '!NoReverseMatch', '!NoReverseMatch', '!NoReverseMatch', '!NoReverseMatch']],
      [[["Q = [('v1/<int:pk>/', 'item'), ('v1/<slug:code>/', 'item')]",
         "reverse(Q, 'item', {'code': 'x-1'})",
         "reverse(Q, 'item', {'pk': 5})",
         "reverse(Q, 'item', {'pk': '7'})"]],
       ["'/v1/x-1/'", "'/v1/5/'", "'/v1/7/'"]],
      [[["P = [('hello/<name>/', 'hi'), ('files/<path:p>', 'file')]",
         "reverse(P, 'hi', {'name': 'Ada L'})",
         "reverse(P, 'file', {'p': 'a/b c.txt'})",
         "reverse(P, 'hi', {'name': 'a/b'})"]],
       ["'/hello/Ada%20L/'", "'/files/a/b%20c.txt'", '!NoReverseMatch']],
      [[["P = [('a.b/<int:n>/', 'dot')]",
         "reverse(P, 'dot', {'n': 7})",
         "reverse(P, 'dot', {'n': 10 ** 30})"]],
       ["'/a.b/7/'", "'/a.b/1000000000000000000000000000000/'"]],
      [[["P = [('n%d/<int:i>/' % k, 'r%d' % k) for k in range(100)]",
         "reverse(P, 'r99', {'i': 3})",
         "reverse(P, 'r0', {'i': 0})"]],
       ["'/n99/3/'", "'/n0/0/'"]]
    ] },
    solution: {
      approach: R`<p>Reverse resolution is resolution run backwards: find candidate patterns by name, require an exact parameter set, validate every value with its converter regex, substitute, and quote. Trying candidates in order mirrors Django's <code>_reverse_with_prefix</code>.</p>`,
      code: { lang: 'python', run: true, code: R`
import re
from urllib.parse import quote


class NoReverseMatch(Exception):
    pass


REGEX = {"str": r"[^/]+", "int": r"[0-9]+", "slug": r"[-a-zA-Z0-9_]+", "path": r".+"}
PARAM = re.compile(r"<(?:(?P<conv>[^>:]+):)?(?P<name>[^>]+)>")


def reverse(urlpatterns, name, kwargs):
    for route, route_name in urlpatterns:
        if route_name != name:
            continue
        params = {m["name"]: REGEX[m["conv"] or "str"] for m in PARAM.finditer(route)}
        if set(params) != set(kwargs):
            continue
        if not all(re.fullmatch(params[k], str(v)) for k, v in kwargs.items()):
            continue
        url = PARAM.sub(lambda m: str(kwargs[m["name"]]), route)
        return quote("/" + url, safe="/~:@!$&'()*+,;=")
    raise NoReverseMatch(f"Reverse for {name!r} with {kwargs!r} not found")


P = [("articles/<int:year>/", "year"), ("articles/<int:year>/<slug:slug>/", "detail")]
print(reverse(P, "detail", {"year": 2024, "slug": "hi-there"}))
try:
    reverse(P, "year", {"year": "abc"})
except NoReverseMatch as e:
    print(e)
` },
      complexity: R`<p>O(P · L) for P patterns and route length L.</p>`
    }
  });

  practice.push({
    title: 'Which ViewSet action handles this request?',
    level: 'Easy', tags: ['drf', 'viewsets', 'routers', 'http methods'], companies: ['Shopify', 'Atlassian', 'Zalando'],
    statement: R`<p>A <code>DefaultRouter</code> registers a <code>ModelViewSet</code> with a list route (<code>/books/</code>) and a detail route (<code>/books/{pk}/</code>). Write <code>action_for(method, detail)</code> returning the action name, or <code>None</code> when the router would answer 405. List: GET → <code>list</code>, POST → <code>create</code>. Detail: GET → <code>retrieve</code>, PUT → <code>update</code>, PATCH → <code>partial_update</code>, DELETE → <code>destroy</code>. HEAD uses GET's action. OPTIONS → <code>options</code> on both routes. Method names are case-insensitive.</p>`,
    constraints: R`Any string may be passed as the method.`,
    example: R`<p><code>action_for('PATCH', True)</code> → ${H.c('g', "'partial_update'")}; <code>action_for('DELETE', False)</code> → ${H.c('r', 'None (405)')}.</p>`,
    brute: {
      why: R`<p>A long chain of <code>if/elif</code> on method and detail works, but every new route needs edits in several branches, and it is easy to forget HEAD or case-insensitivity.</p>`,
      code: R`
        def action_brute(method, detail):
            if method == "GET" and not detail:
                return "list"
            if method == "GET" and detail:
                return "retrieve"
            return None                      # forgot POST, PUT, PATCH, DELETE, HEAD...

        print(action_brute("POST", False))
      `
    },
    mcq: { q: 'Which action does <code>PATCH /books/7/</code> map to?', options: ['<code>partial_update</code>', '<code>update</code>', '<code>create</code>', '<code>patch</code>'], answer: 0, explain: 'PATCH on the detail route calls <code>partial_update</code>, which runs the serializer with <code>partial=True</code>.' },
    hints: [
      R`<p>Hint 1: Store two dicts, exactly like the router's <code>Route.mapping</code>.</p>`,
      R`<p>Hint 2: Lowercase the method, pick the dict by <code>detail</code>, and use <code>.get</code>.</p>`,
      R`<p>Hint 3: DRF adds <code>head</code> to the mapping when <code>get</code> is present; OPTIONS is served by the view's <code>options</code> method on every route.</p>`
    ],
    tests: { sig: 'string[] -> string[]', fn: 'run_lines', harness: { python: PYT }, cases: [
      [[["action_for('GET', False)", "action_for('POST', False)"]], ["'list'", "'create'"]],
      [[["action_for('GET', True)", "action_for('PUT', True)", "action_for('patch', True)", "action_for('DELETE', True)"]], ["'retrieve'", "'update'", "'partial_update'", "'destroy'"]],
      [[["action_for('DELETE', False) is None", "action_for('POST', True) is None", "action_for('PUT', False) is None"]], ['True', 'True', 'True']],
      [[["action_for('HEAD', False)", "action_for('head', True)"]], ["'list'", "'retrieve'"]],
      [[["action_for('OPTIONS', True)", "action_for('options', False)"]], ["'options'", "'options'"]],
      [[["action_for('BREW', True) is None", "action_for('', False) is None", "action_for('Get', True)"]], ['True', 'True', "'retrieve'"]]
    ] },
    solution: {
      approach: R`<p>Two lookup tables, one per route, extended with <code>head</code> (copy of <code>get</code>) and <code>options</code>. This is exactly how <code>ViewSetMixin.as_view(actions)</code> binds methods: the router passes <code>{'get': 'list', 'post': 'create'}</code> for the list route.</p>`,
      code: { lang: 'python', run: true, code: R`
LIST_ROUTE = {"get": "list", "post": "create"}
DETAIL_ROUTE = {"get": "retrieve", "put": "update", "patch": "partial_update", "delete": "destroy"}


def action_for(method, detail):
    mapping = dict(DETAIL_ROUTE if detail else LIST_ROUTE)
    if "get" in mapping and "head" not in mapping:
        mapping["head"] = mapping["get"]
    mapping["options"] = "options"
    return mapping.get(method.lower())


for m, d in [("GET", False), ("POST", False), ("PATCH", True), ("DELETE", False)]:
    print(m, "detail" if d else "list", "->", action_for(m, d))
` },
      complexity: R`<p>O(1) time and space: two tiny dictionary lookups per request.</p>`
    }
  });

  practice.push({
    title: 'Evaluate Q object trees (with SQL NULL semantics)',
    level: 'Easy', tags: ['django orm', 'q objects', 'recursion', 'null'], companies: ['Pinterest', 'Robinhood', 'Instacart'],
    statement: R`<p>Write <code>filter_rows(rows, q)</code> returning the ids of rows (in order) that match a Q tree. A leaf is <code>(lookup, value)</code> like <code>('year__gte', 1900)</code> or <code>('title', 'Dune')</code> (exact). Lookups: <code>exact gt gte lt lte in icontains isnull</code>. Internal nodes: <code>('AND', [q, …])</code>, <code>('OR', [q, …])</code>, <code>('NOT', q)</code>. Empty AND/OR lists match every row. Comparisons with a <code>None</code> value are false (SQL NULL), except <code>exact</code> with None and <code>isnull</code>. <code>NOT</code> negates the result, so <code>NOT (rating &lt; 4)</code> includes rows with NULL rating, like Django's <code>exclude()</code>. An unknown lookup raises <code>ValueError</code>.</p>`,
    constraints: R`Up to 10<sup>4</sup> rows; tree depth ≤ 50.`,
    example: R`<p><code>('OR', [('year__lt', 1850), ('rating__gte', 5)])</code> → ${H.c('g', '[1, 2]')}; <code>('NOT', ('rating__lt', 4))</code> → ${H.c('b', '[1, 2, 3]')} (row 2 has NULL rating).</p>`,
    brute: {
      why: R`<p>Converting the tree to a Python expression string and calling <code>eval</code> is unsafe (code injection) and gets NULL handling wrong.</p>`,
      code: R`
        def to_expr(q):
            op, arg = q
            if op == "OR":
                return " or ".join("(" + to_expr(c) + ")" for c in arg)
            field = op.split("__")[0]
            return f"row[{field!r}] == {arg!r}"

        row = {"year": 1965}
        print(eval(to_expr(("OR", [("year", 1965)])), {"row": row}))
      `
    },
    mcq: { q: 'Django runs <code>Book.objects.exclude(rating__lt=4)</code>. Are books with NULL rating returned?', options: ['Yes: Django adds <code>IS NOT NULL</code> inside the NOT so NULL rows are kept', 'No: NULL comparisons are always false', 'Only on PostgreSQL', 'It raises an error'], answer: 0, explain: 'The generated SQL is <code>NOT (rating &lt; 4 AND rating IS NOT NULL)</code>, which is true for NULL ratings.' },
    hints: [
      R`<p>Hint 1: Write <code>matches(row, q)</code> recursively: dispatch on the first element (<code>AND</code>, <code>OR</code>, <code>NOT</code>, or a lookup string).</p>`,
      R`<p>Hint 2: <code>all()</code> of an empty list is True; for OR use <code>any(...) if children else True</code> so empty OR also matches everything.</p>`,
      R`<p>Hint 3: Split the leaf with <code>rpartition('__')</code> only if the suffix is a known lookup; otherwise the whole key is the field with <code>exact</code>. Return False for comparisons when the row value is None.</p>`
    ],
    tests: { sig: 'string[] -> string[]', fn: 'run_lines', harness: { python: PYT }, cases: [
      [[["R = [{'id': 1, 'title': 'Dune', 'year': 1965, 'rating': 5}, {'id': 2, 'title': 'Emma', 'year': 1815, 'rating': None}, {'id': 3, 'title': 'Dracula', 'year': 1897, 'rating': 4}, {'id': 4, 'title': 'Neuromancer', 'year': 1984, 'rating': 3}]",
         "filter_rows(R, ('year__gte', 1900))",
         "filter_rows(R, ('OR', [('year__lt', 1850), ('rating__gte', 5)]))",
         "filter_rows(R, ('NOT', ('title__icontains', 'd')))"]],
       ['[1, 4]', '[1, 2]', '[2, 4]']],
      [[["R = [{'id': 1, 'title': 'Dune', 'year': 1965, 'rating': 5}, {'id': 2, 'title': 'Emma', 'year': 1815, 'rating': None}, {'id': 3, 'title': 'Dracula', 'year': 1897, 'rating': 4}, {'id': 4, 'title': 'Neuromancer', 'year': 1984, 'rating': 3}]",
         "filter_rows(R, ('AND', [('rating__isnull', False), ('OR', [('year__lt', 1900), ('title', 'Neuromancer')])]))",
         "filter_rows(R, ('rating__lt', 4))",
         "filter_rows(R, ('NOT', ('rating__lt', 4)))"]],
       ['[3, 4]', '[4]', '[1, 2, 3]']],
      [[["R = [{'id': 1, 'year': 1965, 'rating': 5}, {'id': 2, 'year': 1815, 'rating': None}]",
         "filter_rows(R, ('id__in', []))",
         "filter_rows(R, ('AND', []))",
         "filter_rows(R, ('OR', []))",
         "filter_rows(R, ('rating', None))"]],
       ['[]', '[1, 2]', '[1, 2]', '[2]']],
      [[["R = [{'id': 1, 'year': 1965}]",
         "filter_rows(R, ('year__between', 1))",
         "filter_rows([], ('year', 1))"]],
       ['!ValueError', '[]']],
      [[["R = [{'id': i, 'n': i} for i in range(10)]",
         "filter_rows(R, ('NOT', ('NOT', ('n__lte', 2))))",
         "filter_rows(R, ('AND', [('n__gt', 2), ('n__lt', 6), ('NOT', ('n', 4))]))",
         "filter_rows(R, ('OR', [('n__in', [1, 9]), ('id', 5)]))"]],
       ['[0, 1, 2]', '[3, 5]', '[1, 5, 9]']],
      [[["R = [{'id': i, 'n': i % 3} for i in range(3000)]",
         "q = ('n', 1)\nfor _ in range(50):\n    q = ('NOT', ('NOT', q))",
         'len(filter_rows(R, q))',
         "len(filter_rows(R, ('OR', [('n', 0), ('n', 2)])))"]],
       ['1000', '2000']]
    ] },
    solution: {
      approach: R`<p>Recursive evaluation of a small boolean tree with three-valued-logic simplified the way Django does: a leaf comparison on NULL is false, and NOT flips the leaf's boolean, which matches the SQL Django emits for <code>exclude()</code>.</p>`,
      code: { lang: 'python', run: true, code: R`
LOOKUPS = {
    "exact": lambda a, b: a == b,
    "gt": lambda a, b: a is not None and a > b,
    "gte": lambda a, b: a is not None and a >= b,
    "lt": lambda a, b: a is not None and a < b,
    "lte": lambda a, b: a is not None and a <= b,
    "in": lambda a, b: a is not None and a in b,
    "icontains": lambda a, b: a is not None and str(b).lower() in str(a).lower(),
    "isnull": lambda a, b: (a is None) == bool(b),
}


def matches(row, q):
    op, arg = q
    if op == "AND":
        return all(matches(row, c) for c in arg)
    if op == "OR":
        return any(matches(row, c) for c in arg) if arg else True
    if op == "NOT":
        return not matches(row, arg)
    field, _, lookup = op.rpartition("__")
    if not field:
        field, lookup = op, "exact"
    if lookup not in LOOKUPS:
        raise ValueError(f"unsupported lookup {lookup!r}")
    return LOOKUPS[lookup](row.get(field), arg)


def filter_rows(rows, q):
    return [r["id"] for r in rows if matches(r, q)]


R = [{"id": 1, "rating": 5}, {"id": 2, "rating": None}, {"id": 3, "rating": 3}]
print(filter_rows(R, ("rating__lt", 4)), filter_rows(R, ("NOT", ("rating__lt", 4))))
` },
      complexity: R`<p>O(rows × tree size). Recursion depth equals tree depth (≤ 101 here).</p>`
    }
  });

  practice.push({
    title: 'DRF permission checker: 200, 401 or 403?',
    level: 'Medium', tags: ['drf', 'permissions', 'authorization', 'http status'], companies: ['GitHub', 'Okta', 'Stripe'],
    statement: R`<p>Write <code>check_permissions(perms, method, user, obj=None, auth='session')</code> returning the HTTP status DRF would send. <code>user</code> is <code>None</code> (anonymous) or <code>{'id': int, 'is_staff': bool}</code>; <code>obj</code> is <code>None</code> or <code>{'owner_id': int}</code>. Permission names: <code>AllowAny</code>, <code>IsAuthenticated</code>, <code>IsAdminUser</code>, <code>IsAuthenticatedOrReadOnly</code>, <code>IsOwnerOrReadOnly</code> (object-level only: safe methods or <code>owner_id == user['id']</code>). A name may be <code>'A|B'</code> (OR): <code>has_permission = A or B</code>; <code>has_object_permission = (A.has and A.obj) or (B.has and B.obj)</code>. Safe methods: GET, HEAD, OPTIONS.</p>
      <p>Run all <code>has_permission</code> checks in order, then (if <code>obj</code>) all object checks. On the first failure: if <code>user</code> is None the result is 401 when <code>auth == 'token'</code> and 403 when <code>'session'</code>; otherwise 403. Unknown name → <code>KeyError</code>. All pass → 200.</p>`,
    constraints: R`Up to 10 permission entries.`,
    example: R`<p><code>check_permissions(['IsAuthenticated'], 'GET', None, auth='token')</code> → ${H.c('r', '401')}; same with session auth → ${H.c('r', '403')}; with a user → ${H.c('g', '200')}.</p>`,
    brute: {
      why: R`<p>Hard-coding role checks inside each view duplicates logic, forgets object-level checks on some endpoints and returns inconsistent status codes.</p>`,
      code: R`
        def view_update(user, post):
            if user is None:
                return 403                     # wrong for token auth (should be 401)
            if post["owner_id"] != user["id"] and not user["is_staff"]:
                return 403
            return 200

        print(view_update(None, {"owner_id": 1}))
      `
    },
    mcq: { q: 'Why does DRF return 403, not 401, to an anonymous user when only SessionAuthentication is configured?', options: ['A 401 must carry a WWW-Authenticate header, and session auth has no challenge to offer', 'Sessions are always authenticated', '401 is deprecated', 'Because the user is staff'], answer: 0, explain: 'HTTP says 401 responses must include WWW-Authenticate. DRF only uses 401 when the first authenticator provides that header (e.g. <code>Token</code>).' },
    hints: [
      R`<p>Hint 1: Model each permission as a pair of functions <code>(has(method, user), obj(method, user, obj))</code> in a dict.</p>`,
      R`<p>Hint 2: For <code>'A|B'</code>, build a combined pair implementing the DRF 3.14+ rule for object checks.</p>`,
      R`<p>Hint 3: One helper <code>deny()</code> computes 401 vs 403. Check all has-permission first, then object permissions only when <code>obj</code> is given.</p>`
    ],
    tests: { sig: 'string[] -> string[]', fn: 'run_lines', harness: { python: PYT }, cases: [
      [[["alice = {'id': 1, 'is_staff': False}",
         "check_permissions(['IsAuthenticated'], 'GET', None, auth='token')",
         "check_permissions(['IsAuthenticated'], 'GET', None)",
         "check_permissions(['IsAuthenticated'], 'GET', alice)"]],
       ['401', '403', '200']],
      [[["check_permissions(['IsAuthenticatedOrReadOnly'], 'GET', None)",
         "check_permissions(['IsAuthenticatedOrReadOnly'], 'POST', None)",
         "check_permissions(['IsAuthenticatedOrReadOnly'], 'POST', None, auth='token')",
         "check_permissions(['IsAuthenticatedOrReadOnly'], 'HEAD', None, auth='token')"]],
       ['200', '403', '401', '200']],
      [[["alice = {'id': 1, 'is_staff': False}",
         "boss = {'id': 2, 'is_staff': True}",
         "check_permissions(['IsAdminUser'], 'GET', alice)",
         "check_permissions(['IsAdminUser'], 'GET', boss)",
         "check_permissions(['AllowAny'], 'DELETE', None)",
         "check_permissions([], 'DELETE', None)"]],
       ['403', '200', '200', '200']],
      [[["alice = {'id': 1, 'is_staff': False}",
         "check_permissions(['IsAuthenticated', 'IsOwnerOrReadOnly'], 'PUT', alice, {'owner_id': 1})",
         "check_permissions(['IsAuthenticated', 'IsOwnerOrReadOnly'], 'PUT', alice, {'owner_id': 2})",
         "check_permissions(['IsAuthenticated', 'IsOwnerOrReadOnly'], 'GET', alice, {'owner_id': 2})",
         "check_permissions(['IsAuthenticated', 'IsOwnerOrReadOnly'], 'PUT', alice)"]],
       ['200', '403', '200', '200']],
      [[["alice = {'id': 1, 'is_staff': False}",
         "boss = {'id': 2, 'is_staff': True}",
         "P = ['IsAdminUser|IsOwnerOrReadOnly']",
         "check_permissions(P, 'PUT', alice, {'owner_id': 1})",
         "check_permissions(P, 'PUT', alice, {'owner_id': 2})",
         "check_permissions(P, 'PUT', boss, {'owner_id': 1})",
         "check_permissions(P, 'DELETE', None, {'owner_id': 1})",
         "check_permissions(P, 'DELETE', None, {'owner_id': 1}, auth='token')"]],
       ['200', '403', '200', '403', '401']],
      [[["check_permissions(['IsSuperhero'], 'GET', None)",
         "check_permissions(['IsAuthenticated|IsAdminUser'], 'GET', {'id': 3, 'is_staff': False})",
         "check_permissions(['AllowAny', 'IsAdminUser'], 'GET', {'id': 3, 'is_staff': False})"]],
       ['!KeyError', '200', '403']]
    ] },
    solution: {
      approach: R`<p>Represent each permission class as a pair of predicates, compose <code>|</code> with DRF's pairwise rule, evaluate model-level checks then object-level checks, and translate the first denial into 401/403 using the same "is there an authentication challenge?" rule as DRF's exception handler.</p>`,
      code: { lang: 'python', run: true, code: R`
SAFE = {"GET", "HEAD", "OPTIONS"}

PERMS = {
    "AllowAny": (lambda m, u: True, lambda m, u, o: True),
    "IsAuthenticated": (lambda m, u: u is not None, lambda m, u, o: True),
    "IsAdminUser": (lambda m, u: bool(u and u["is_staff"]), lambda m, u, o: True),
    "IsAuthenticatedOrReadOnly": (lambda m, u: m in SAFE or u is not None, lambda m, u, o: True),
    "IsOwnerOrReadOnly": (lambda m, u: True,
                          lambda m, u, o: m in SAFE or (u is not None and o["owner_id"] == u["id"])),
}


def _resolve(name):
    if "|" not in name:
        return PERMS[name]
    a, b = (_resolve(part) for part in name.split("|", 1))
    return (lambda m, u: a[0](m, u) or b[0](m, u),
            lambda m, u, o: (a[0](m, u) and a[1](m, u, o)) or (b[0](m, u) and b[1](m, u, o)))


def check_permissions(perms, method, user, obj=None, auth="session"):
    method = method.upper()
    checks = [_resolve(p) for p in perms]

    def deny():
        return 401 if user is None and auth == "token" else 403

    for has, _ in checks:
        if not has(method, user):
            return deny()
    if obj is not None:
        for _, has_obj in checks:
            if not has_obj(method, user, obj):
                return deny()
    return 200


alice = {"id": 1, "is_staff": False}
print(check_permissions(["IsAuthenticated"], "GET", None, auth="token"))
print(check_permissions(["IsAdminUser|IsOwnerOrReadOnly"], "PUT", alice, {"owner_id": 2}))
` },
      complexity: R`<p>O(k) predicate calls for k permission entries.</p>`
    }
  });

  practice.push({
    title: 'A signal dispatcher with sender filters and dispatch_uid',
    level: 'Medium', tags: ['django', 'signals', 'observer pattern', 'design'], companies: ['Eventbrite', 'Sentry', 'Mozilla'],
    statement: R`<p>Implement <code>Signal</code> like <code>django.dispatch.Signal</code>:</p>
      <ul><li><code>connect(receiver, sender=None, dispatch_uid=None)</code>: the lookup key is <code>(dispatch_uid or id(receiver), sender)</code>; connecting the same key twice does nothing.</li>
      <li><code>disconnect(receiver=None, sender=None, dispatch_uid=None)</code> returns True if something was removed.</li>
      <li><code>send(sender, **named)</code> calls every receiver whose registered sender is <code>None</code> or equal to <code>sender</code>, in connection order, as <code>receiver(signal=self, sender=sender, **named)</code>, and returns a list of <code>(receiver, response)</code>. Exceptions propagate.</li>
      <li><code>send_robust</code> is the same but catches <code>Exception</code> and puts the exception object in place of the response.</li>
      <li><code>has_listeners(sender=None)</code> → bool.</li></ul>`,
    constraints: R`Up to 10<sup>4</sup> receivers.`,
    example: R`<p>Receivers <code>a</code> (any sender) and <code>b</code> (sender 'Book'): <code>send(sender='Book', x=3)</code> → ${H.c('g', "[('a', …), ('b', 6)]")}; <code>send(sender='Author', x=3)</code> → only <code>a</code>.</p>`,
    brute: {
      why: R`<p>A plain list of callbacks with no keys registers duplicates every time a module is imported twice (classic double-email bug) and cannot filter by sender.</p>`,
      code: R`
        callbacks = []
        def connect(fn):
            callbacks.append(fn)              # duplicates on re-import
        def send(**kw):
            return [fn(**kw) for fn in callbacks]

        hello = lambda **kw: "hi"
        connect(hello); connect(hello)
        print(send())
      `
    },
    mcq: { q: 'What does <code>dispatch_uid</code> protect against?', options: ['Registering the same receiver twice when the module defining it is imported more than once', 'Receivers raising exceptions', 'Signals firing during bulk_update', 'Thread safety problems in send()'], answer: 0, explain: 'The uid becomes the lookup key, so a second <code>connect</code> with the same uid is ignored even if the function object differs.' },
    hints: [
      R`<p>Hint 1: Keep an ordered list of <code>(key, receiver, sender)</code>; the key decides duplicates.</p>`,
      R`<p>Hint 2: <code>send</code> filters by <code>registered_sender is None or registered_sender == sender</code> and passes <code>signal=self</code>.</p>`,
      R`<p>Hint 3: In <code>disconnect</code>, compute the key the same way as in <code>connect</code>; remove all entries with that key and return whether the list shrank.</p>`
    ],
    tests: { sig: 'string[] -> string[]', fn: 'run_lines', harness: { python: PYT }, cases: [
      [[['s = Signal()',
         "def a(sender, **kw):\n    return 'a:' + str(sender)",
         "def b(sender, **kw):\n    return kw['x'] * 2",
         's.connect(a)',
         "s.connect(b, sender='Book')",
         "[(r.__name__, v) for r, v in s.send(sender='Book', x=3)]",
         "[(r.__name__, v) for r, v in s.send(sender='Author', x=3)]"]],
       ["[('a', 'a:Book'), ('b', 6)]", "[('a', 'a:Author')]"]],
      [[['s = Signal()',
         "def a(sender, **kw):\n    return 1",
         's.connect(a)',
         's.connect(a)',
         "len(s.send(sender='X'))",
         "s.connect(lambda sender, **kw: 2, dispatch_uid='u')",
         "s.connect(lambda sender, **kw: 3, dispatch_uid='u')",
         "[v for r, v in s.send(sender='X')]"]],
       ['1', '[1, 2]']],
      [[['s = Signal()',
         "def a(sender, **kw):\n    return 1",
         's.connect(a)',
         's.disconnect(a)',
         's.disconnect(a)',
         "s.send(sender='X')",
         's.has_listeners()']],
       ['True', 'False', '[]', 'False']],
      [[['s = Signal()',
         "def bad(sender, **kw):\n    raise ValueError('boom')",
         "def ok(sender, **kw):\n    return 'ok'",
         's.connect(bad)',
         's.connect(ok)',
         "s.send(sender='X')",
         "[type(v).__name__ if isinstance(v, Exception) else v for r, v in s.send_robust(sender='X')]"]],
       ['!ValueError', "['ValueError', 'ok']"]],
      [[['s = Signal()',
         "def c(sender, signal, **kw):\n    return signal is s",
         "s.connect(c, sender='Book')",
         "s.send(sender='Book')[0][1]",
         "s.has_listeners('Book')",
         "s.has_listeners('Author')",
         "s.disconnect(c)",
         "s.disconnect(c, sender='Book')"]],
       ['True', 'True', 'False', 'False', 'True']],
      [[['s = Signal()',
         "fs = [(lambda i: (lambda sender, **kw: i))(i) for i in range(5000)]",
         "for f in fs:\n    s.connect(f)",
         "for f in fs:\n    s.connect(f)",
         "r = s.send(sender=None)",
         'len(r)',
         '(r[0][1], r[-1][1])']],
       ['5000', '(0, 4999)']]
    ] },
    solution: {
      approach: R`<p>An ordered registry keyed by <code>(dispatch_uid or id(receiver), sender)</code>, plus a set of keys for O(1) duplicate checks. Sending filters by sender and calls receivers in order; the robust variant wraps each call in try/except. Django's real implementation also stores weak references so receivers can be garbage-collected and caches the per-sender receiver list.</p>`,
      code: { lang: 'python', run: true, code: R`
class Signal:
    def __init__(self):
        self._receivers = []          # (key, receiver, sender)
        self._keys = set()

    @staticmethod
    def _key(receiver, sender, dispatch_uid):
        return (dispatch_uid if dispatch_uid is not None else id(receiver), sender)

    def connect(self, receiver, sender=None, dispatch_uid=None):
        key = self._key(receiver, sender, dispatch_uid)
        if key not in self._keys:
            self._keys.add(key)
            self._receivers.append((key, receiver, sender))

    def disconnect(self, receiver=None, sender=None, dispatch_uid=None):
        key = self._key(receiver, sender, dispatch_uid)
        if key not in self._keys:
            return False
        self._keys.discard(key)
        self._receivers = [r for r in self._receivers if r[0] != key]
        return True

    def _live(self, sender):
        return [rec for _k, rec, s in self._receivers if s is None or s == sender]

    def has_listeners(self, sender=None):
        return bool(self._live(sender))

    def send(self, sender, **named):
        return [(rec, rec(signal=self, sender=sender, **named)) for rec in self._live(sender)]

    def send_robust(self, sender, **named):
        out = []
        for rec in self._live(sender):
            try:
                out.append((rec, rec(signal=self, sender=sender, **named)))
            except Exception as err:
                out.append((rec, err))
        return out


post_save = Signal()
def audit(sender, **kw):
    return f"audit {sender} created={kw['created']}"
post_save.connect(audit, dispatch_uid="audit")
post_save.connect(audit, dispatch_uid="audit")
print(post_save.send(sender="Book", created=True))
` },
      complexity: R`<p>connect O(1); disconnect O(n); send O(n) for n registered receivers.</p>`
    }
  });

  practice.push({
    title: 'PageNumberPagination links: next and previous',
    level: 'Medium', tags: ['drf', 'pagination', 'urls', 'query strings'], companies: ['Booking.com', 'Airbnb', 'Etsy'],
    statement: R`<p>Write <code>page_links(count, page, page_size, url)</code> returning <code>(next_url, previous_url)</code> like DRF's <code>PageNumberPagination</code>. <code>page</code> is the raw query value (a string). Number of pages = <code>max(1, ceil(count / page_size))</code>. <code>'last'</code> means the last page. A non-integer or out-of-range page raises <code>NotFound</code>; <code>page_size &lt; 1</code> raises <code>ValueError</code>.</p>
      <p>Next exists when page &lt; pages: set <code>page=page+1</code>. Previous exists when page &gt; 1: for page 2, <b>remove</b> the <code>page</code> parameter; otherwise set <code>page=page-1</code>. Rebuild query strings like DRF: parse with <code>parse_qs(keep_blank_values=True)</code>, replace or remove the key, then <code>urlencode(sorted(items), doseq=True)</code>.</p>`,
    constraints: R`count ≤ 10<sup>9</sup>.`,
    example: R`<p><code>page_links(95, '2', 10, 'http://a.io/books/?page=2')</code> → ${H.c('g', "('http://a.io/books/?page=3', 'http://a.io/books/')")}</p>`,
    brute: {
      why: R`<p>String concatenation (<code>url + "&amp;page=" + n</code>) duplicates the page parameter, breaks URLs without a query string, and loses other filters.</p>`,
      code: R`
        def next_brute(url, page):
            return url + "&page=" + str(page + 1)

        print(next_brute("http://a.io/books/?page=2", 2))     # two page params
      `
    },
    mcq: { q: 'Why does DRF drop <code>?page=</code> for the link to page 1?', options: ['So page 1 has one canonical URL (the bare list URL), which helps caching and SEO', 'Because page 1 cannot be requested', 'To save bytes only', 'Because count is unknown'], answer: 0, explain: 'The bare URL already shows page 1; removing the parameter avoids two URLs for the same content.' },
    hints: [
      R`<p>Hint 1: Use <code>urllib.parse.urlsplit</code>, <code>parse_qs</code>, <code>urlencode</code> and <code>urlunsplit</code>.</p>`,
      R`<p>Hint 2: Validate first: <code>'last'</code> → pages; otherwise <code>int()</code> inside try/except; then 1 ≤ page ≤ pages.</p>`,
      R`<p>Hint 3: Write <code>replace_param(url, key, value)</code> and <code>remove_param(url, key)</code> helpers that both sort the items before encoding.</p>`
    ],
    tests: { sig: 'string[] -> string[]', fn: 'run_lines', harness: { python: PYT }, cases: [
      [[["page_links(95, '2', 10, 'http://a.io/books/?page=2')"]], ["('http://a.io/books/?page=3', 'http://a.io/books/')"]],
      [[["page_links(95, '1', 10, 'http://a.io/books/?q=dune')"]], ["('http://a.io/books/?page=2&q=dune', None)"]],
      [[["page_links(95, '10', 10, 'http://a.io/books/?page=10')", "page_links(95, 'last', 10, 'http://a.io/books/?page=last')"]], ["(None, 'http://a.io/books/?page=9')", "(None, 'http://a.io/books/?page=9')"]],
      [[["page_links(95, '11', 10, 'http://a.io/b/')", "page_links(95, '0', 10, 'http://a.io/b/')", "page_links(95, 'abc', 10, 'http://a.io/b/')", "page_links(95, '1', 0, 'http://a.io/b/')"]], ['!NotFound', '!NotFound', '!NotFound', '!ValueError']],
      [[["page_links(0, '1', 10, 'http://a.io/b/')", "page_links(10, '1', 10, 'http://a.io/b/')", "page_links(11, '2', 10, 'http://a.io/b/?page=2&q=')"]], ['(None, None)', '(None, None)', "(None, 'http://a.io/b/?q=')"]],
      [[["page_links(100, '3', 10, 'http://a.io/b/?q=a&page=3&tag=x&tag=y')", "page_links(10 ** 9, '500000', 1000, 'http://a.io/b/?page=500000')[0]"]], ["('http://a.io/b/?page=4&q=a&tag=x&tag=y', 'http://a.io/b/?page=2&q=a&tag=x&tag=y')", "'http://a.io/b/?page=500001'"]]
    ] },
    solution: {
      approach: R`<p>Validate the page number exactly like Django's <code>Paginator.validate_number</code>, then rebuild URLs with DRF's <code>replace_query_param</code>/<code>remove_query_param</code> logic: parse, modify one key, sort and re-encode.</p>`,
      code: { lang: 'python', run: true, code: R`
import math
from urllib.parse import parse_qs, urlencode, urlsplit, urlunsplit


class NotFound(Exception):
    pass


def _rebuild(url, key, value=None):
    scheme, netloc, path, query, fragment = urlsplit(url)
    params = parse_qs(query, keep_blank_values=True)
    if value is None:
        params.pop(key, None)
    else:
        params[key] = [str(value)]
    return urlunsplit((scheme, netloc, path, urlencode(sorted(params.items()), doseq=True), fragment))


def page_links(count, page, page_size, url):
    if page_size < 1:
        raise ValueError("page_size must be >= 1")
    pages = max(1, math.ceil(count / page_size))
    if page == "last":
        number = pages
    else:
        try:
            number = int(page)
        except (TypeError, ValueError):
            raise NotFound("Invalid page.") from None
    if not 1 <= number <= pages:
        raise NotFound("Invalid page.")
    nxt = _rebuild(url, "page", number + 1) if number < pages else None
    if number <= 1:
        prev = None
    elif number == 2:
        prev = _rebuild(url, "page")
    else:
        prev = _rebuild(url, "page", number - 1)
    return nxt, prev


print(page_links(95, "2", 10, "http://a.io/books/?page=2"))
print(page_links(95, "1", 10, "http://a.io/books/?q=dune"))
` },
      complexity: R`<p>O(length of the URL).</p>`
    }
  });

  practice.push({
    title: 'Lost updates: read-modify-write vs F() expressions',
    level: 'Medium', tags: ['django orm', 'f expressions', 'concurrency', 'race conditions'], companies: ['Robinhood', 'Coinbase', 'Uber'],
    statement: R`<p>Simulate concurrent requests updating one counter column. Write <code>run_schedule(start, schedule, use_f)</code> returning the final database value. Each step is <code>('read', req)</code> or <code>('write', req, delta)</code>.</p>
      <ul><li><code>use_f=False</code> (Python arithmetic, like <code>obj.n += delta; obj.save()</code>): <code>read</code> loads the current DB value into that request's in-memory object; <code>write</code> does <code>local += delta</code> and then stores <code>local</code> into the DB. Writing before the request has read raises <code>RuntimeError</code>.</li>
      <li><code>use_f=True</code> (<code>update(n=F('n') + delta)</code>): <code>read</code> does nothing to the DB; <code>write</code> adds <code>delta</code> to the DB value atomically.</li></ul>`,
    constraints: R`Up to 10<sup>5</sup> steps.`,
    example: R`<p>start 10, schedule read A, read B, write A +1, write B +1 → Python arithmetic ${H.c('r', '11')} (one increment lost), F() ${H.c('g', '12')}.</p>`,
    brute: {
      why: R`<p>Testing races with real threads and <code>sleep()</code> is flaky; an explicit schedule makes the interleaving deterministic and shows exactly where the update is lost.</p>`,
      code: R`
        import threading
        counter = {"n": 0}
        def bump():
            v = counter["n"]
            counter["n"] = v + 1           # may or may not lose updates: flaky
        ts = [threading.Thread(target=bump) for _ in range(4)]
        for t in ts: t.start()
        for t in ts: t.join()
        print(counter["n"])
      `
    },
    mcq: { q: 'Which change makes <code>post.views += 1; post.save()</code> safe under concurrency?', options: ['<code>Post.objects.filter(pk=post.pk).update(views=F("views") + 1)</code>', 'Calling <code>save()</code> twice', 'Using <code>refresh_from_db()</code> before reading', 'Wrapping it in try/except'], answer: 0, explain: 'The F expression makes the database compute <code>views + 1</code> under the row lock. Refreshing first still leaves a window between read and write.' },
    hints: [
      R`<p>Hint 1: Keep <code>db</code> (an int) and <code>local</code> (a dict request → value).</p>`,
      R`<p>Hint 2: Non-F write: <code>local[req] += delta; db = local[req]</code>. F write: <code>db += delta</code>.</p>`,
      R`<p>Hint 3: Check <code>req in local</code> before a non-F write and raise <code>RuntimeError</code> otherwise. Repeated writes by one request keep accumulating in its local copy.</p>`
    ],
    tests: { sig: 'string[] -> string[]', fn: 'run_lines', harness: { python: PYT }, cases: [
      [[["S = [('read', 'A'), ('read', 'B'), ('write', 'A', 1), ('write', 'B', 1)]", 'run_schedule(10, S, False)', 'run_schedule(10, S, True)']], ['11', '12']],
      [[["S = [('read', 'A'), ('write', 'A', 5), ('read', 'B'), ('write', 'B', -2)]", 'run_schedule(10, S, False)', 'run_schedule(10, S, True)']], ['13', '13']],
      [[["run_schedule(10, [('write', 'A', 1)], False)", "run_schedule(10, [('write', 'A', 1)], True)", 'run_schedule(7, [], False)']], ['!RuntimeError', '11', '7']],
      [[["S = [('read', 'A'), ('write', 'A', 1), ('write', 'A', 1)]", 'run_schedule(10, S, False)', "run_schedule(0, [('read', 'A'), ('read', 'B'), ('write', 'B', 3), ('write', 'A', -1)], False)"]], ['12', '-1']],
      [[["S = [('read', i) for i in range(1000)] + [('write', i, 1) for i in range(1000)]", 'run_schedule(0, S, False)', 'run_schedule(0, S, True)']], ['1', '1000']],
      [[["S = [('read', 'A'), ('read', 'B'), ('write', 'A', 2), ('read', 'C'), ('write', 'C', 3), ('write', 'B', 4)]", 'run_schedule(1, S, False)', 'run_schedule(1, S, True)']], ['5', '10']]
    ] },
    solution: {
      approach: R`<p>Replay the schedule. Python arithmetic keeps a stale snapshot per request and overwrites the column with it, so concurrent writers clobber each other. The F version applies deltas to the stored value itself, so every increment counts.</p>`,
      code: { lang: 'python', run: true, code: R`
def run_schedule(start, schedule, use_f):
    db, local = start, {}
    for step in schedule:
        if step[0] == "read":
            if not use_f:
                local[step[1]] = db
            continue
        _op, req, delta = step
        if use_f:
            db += delta                       # UPDATE ... SET n = n + delta
        else:
            if req not in local:
                raise RuntimeError(f"{req} wrote before reading")
            local[req] += delta               # obj.n += delta
            db = local[req]                   # obj.save() writes the stale total
    return db


S = [("read", "A"), ("read", "B"), ("write", "A", 1), ("write", "B", 1)]
print("python arithmetic:", run_schedule(10, S, False))
print("F expression:     ", run_schedule(10, S, True))
` },
      complexity: R`<p>O(steps) time, O(requests) space.</p>`
    }
  });

  practice.push({
    title: 'Serializer with partial updates, defaults and read-only fields',
    level: 'Medium', tags: ['drf', 'serializers', 'patch', 'validation'], companies: ['Shopify', 'Zalando', 'Square'],
    statement: R`<p>Write <code>validate_book(data, partial=False)</code> returning <code>(True, validated)</code> or <code>(False, errors)</code>, mimicking:</p>
      <ul><li><code>title</code>: CharField, required, trimmed, not blank, max 100.</li>
      <li><code>price</code>: IntegerField, required, <code>min_value=0</code>, accepts digit strings.</li>
      <li><code>status</code>: ChoiceField <code>['draft', 'published']</code>, <code>default='draft'</code> (so not required); invalid → <code>'"&lt;value&gt;" is not a valid choice.'</code></li>
      <li><code>isbn</code>: read-only, silently ignored on input. Unknown keys ignored.</li>
      <li>With <code>partial=True</code> (PATCH), missing fields are skipped and defaults are <b>not</b> applied.</li>
      <li>Object level (only if no field errors): if the validated data contains <code>status == 'published'</code> and <code>price == 0</code> → <code>{'non_field_errors': ['Published books need a price.']}</code>.</li></ul>
      <p>Messages for required, blank, max length, integer and min value are DRF's (see topic 7). Output keys follow field order: title, price, status.</p>`,
    constraints: R`Values may be any JSON type.`,
    example: R`<p><code>validate_book({'title': 'Dune', 'price': 10})</code> → ${H.c('g', "(True, {'title': 'Dune', 'price': 10, 'status': 'draft'})")}; <code>validate_book({'price': 5}, partial=True)</code> → ${H.c('b', "(True, {'price': 5})")}</p>`,
    brute: {
      why: R`<p>Reusing the full (PUT) validation for PATCH forces clients to resend every field, and applying defaults on PATCH silently resets fields (a PATCH of the price would flip a published book back to draft).</p>`,
      code: R`
        def patch_brute(instance, data):
            full = {"status": "draft", **data}          # default applied on PATCH!
            instance.update(full)
            return instance

        print(patch_brute({"title": "Dune", "price": 9, "status": "published"}, {"price": 10}))
      `
    },
    mcq: { q: 'Why does DRF not apply field defaults when <code>partial=True</code>?', options: ['A PATCH must only change the fields the client sent; applying defaults would overwrite existing values', 'Defaults are applied by the database instead', 'Because partial serializers have no fields', 'To speed up validation'], answer: 0, explain: 'Since DRF 3.8, defaults are skipped on partial updates to avoid silently resetting stored data.' },
    hints: [
      R`<p>Hint 1: For each field: if missing → if partial skip; elif has default → use default; elif required → error.</p>`,
      R`<p>Hint 2: Reuse small converters (char, integer, choice) that return <code>(value, error)</code>.</p>`,
      R`<p>Hint 3: Run the object-level rule only when there are no field errors and both <code>status</code> and <code>price</code> are present in the validated data.</p>`
    ],
    tests: { sig: 'string[] -> string[]', fn: 'run_lines', harness: { python: PYT }, cases: [
      [[["validate_book({'title': 'Dune', 'price': 10})", "validate_book({'title': 'Dune'})"]], ["(True, {'title': 'Dune', 'price': 10, 'status': 'draft'})", "(False, {'price': ['This field is required.']})"]],
      [[["validate_book({'price': 5}, partial=True)", 'validate_book({}, partial=True)', "validate_book({'status': 'published'}, partial=True)"]], ["(True, {'price': 5})", '(True, {})', "(True, {'status': 'published'})"]],
      [[["validate_book({'title': 'X', 'price': 1, 'isbn': '123', 'status': 'live'})"]], ["(False, {'status': ['\"live\" is not a valid choice.']})"]],
      [[["validate_book({'title': 'X', 'price': 0, 'status': 'published'})", "validate_book({'price': 0, 'status': 'published'}, partial=True)"]], ["(False, {'non_field_errors': ['Published books need a price.']})", "(False, {'non_field_errors': ['Published books need a price.']})"]],
      [[["validate_book({'title': '', 'price': -1})", "validate_book({'title': 'a' * 101, 'price': '7'})"]], ["(False, {'title': ['This field may not be blank.'], 'price': ['Ensure this value is greater than or equal to 0.']})", "(False, {'title': ['Ensure this field has no more than 100 characters.']})"]],
      [[["validate_book({'title': ' T ', 'price': '7'}, partial=True)", "validate_book({'title': 'T', 'price': 'seven', 'isbn': None}, partial=True)", "validate_book({'title': 'T', 'price': 0})"]], ["(True, {'title': 'T', 'price': 7})", "(False, {'price': ['A valid integer is required.']})", "(True, {'title': 'T', 'price': 0, 'status': 'draft'})"]]
    ] },
    solution: {
      approach: R`<p>A field table with <code>required</code> and <code>default</code> flags drives the loop. The partial flag changes only the "missing value" branch. Read-only fields are not in the table at all, so they are ignored, exactly as DRF excludes them from <code>_writable_fields</code>.</p>`,
      code: { lang: 'python', run: true, code: R`
import re

NOTHING = object()


def as_char(max_length):
    def run(v):
        if isinstance(v, bool) or not isinstance(v, (str, int, float)):
            return None, "Not a valid string."
        v = str(v).strip()
        if not v:
            return None, "This field may not be blank."
        if len(v) > max_length:
            return None, f"Ensure this field has no more than {max_length} characters."
        return v, None
    return run


def as_int(min_value):
    def run(v):
        if isinstance(v, str) and re.fullmatch(r"-?\d+", v.strip()):
            v = int(v.strip())
        if isinstance(v, bool) or not isinstance(v, int):
            return None, "A valid integer is required."
        if v < min_value:
            return None, f"Ensure this value is greater than or equal to {min_value}."
        return v, None
    return run


def as_choice(choices):
    def run(v):
        return (v, None) if v in choices else (None, f'"{v}" is not a valid choice.')
    return run


FIELDS = [  # name, converter, default
    ("title", as_char(100), NOTHING),
    ("price", as_int(0), NOTHING),
    ("status", as_choice(["draft", "published"]), "draft"),
]


def validate_book(data, partial=False):
    out, errors = {}, {}
    for name, run, default in FIELDS:
        if name not in data:
            if partial:
                continue
            if default is not NOTHING:
                out[name] = default
            else:
                errors[name] = ["This field is required."]
            continue
        value, err = run(data[name])
        if err:
            errors[name] = [err]
        else:
            out[name] = value
    if errors:
        return False, errors
    if out.get("status") == "published" and out.get("price", 1) == 0:
        return False, {"non_field_errors": ["Published books need a price."]}
    return True, out


print(validate_book({"title": "Dune", "price": 10}))
print(validate_book({"price": 5}, partial=True))
` },
      complexity: R`<p>O(number of fields + input size).</p>`
    }
  });

  practice.push({
    title: 'SimpleRateThrottle: sliding-window request history',
    level: 'Medium', tags: ['drf', 'throttling', 'rate limiting', 'sliding window'], companies: ['Cloudflare', 'Stripe', 'GitHub'],
    statement: R`<p>Implement <code>Throttle(rate)</code> like DRF's <code>SimpleRateThrottle</code>. <code>rate</code> is <code>"N/period"</code> where the period's <b>first letter</b> is s, m, h or d (1, 60, 3600, 86400 seconds); expose <code>num</code> and <code>duration</code>; a malformed rate raises <code>ValueError</code>.</p>
      <p><code>allow(ident, now)</code> keeps a newest-first list of timestamps per ident. First drop timestamps <code>&lt;= now - duration</code> from the old end. If the list still has <code>num</code> entries, the request is refused (and not recorded): return <code>(False, wait)</code> with <code>wait = float(duration - (now - oldest))</code>. Otherwise record <code>now</code> at the front and return <code>(True, None)</code>.</p>`,
    constraints: R`Timestamps are non-decreasing per ident; up to 10<sup>5</sup> calls.`,
    example: R`<p><code>Throttle('3/min')</code>: requests at 0, 1, 2 allowed; at 3 → ${H.c('r', '(False, 57.0)')}; at 60 the request from time 0 has expired → ${H.c('g', '(True, None)')}.</p>`,
    brute: {
      why: R`<p>A fixed window ("count requests in the current minute") allows a burst of 2N at a window boundary, and recounting all history on every call is O(total requests).</p>`,
      code: R`
        from collections import Counter
        calls = Counter()
        def allow_fixed(ident, now, num=3):
            window = (ident, now // 60)
            calls[window] += 1
            return calls[window] <= num

        print([allow_fixed("u", t) for t in (57, 58, 59, 60, 61, 62)])   # 6 requests in 6 seconds
      `
    },
    mcq: { q: 'Where does DRF store throttle history, and why does it matter in production?', options: ['In the Django cache; with several servers it must be a shared cache such as Redis or limits are per process', 'In the database migrations table', 'In the request session', 'In a cookie on the client'], answer: 0, explain: 'A local-memory cache gives each worker its own history, so the effective limit is multiplied by the number of workers.' },
    hints: [
      R`<p>Hint 1: Parse with <code>num, period = rate.split("/")</code> and map <code>period[0]</code> to seconds.</p>`,
      R`<p>Hint 2: Keep a dict ident → list (newest at index 0). Prune with <code>while history and history[-1] &lt;= now - duration: history.pop()</code>.</p>`,
      R`<p>Hint 3: When refusing, the oldest remaining request is <code>history[-1]</code>; it expires after <code>duration - (now - history[-1])</code> seconds. Do not record refused requests.</p>`
    ],
    tests: { sig: 'string[] -> string[]', fn: 'run_lines', harness: { python: PYT }, cases: [
      [[["t = Throttle('3/min')", "[t.allow('u', s)[0] for s in (0, 1, 2)]", "t.allow('u', 3)", "t.allow('v', 3)"]], ['[True, True, True]', '(False, 57.0)', '(True, None)']],
      [[["t = Throttle('3/min')", "for s in (0, 1, 2):\n    t.allow('u', s)", "t.allow('u', 60)", "t.allow('u', 61)", "t.allow('u', 61.5)"]], ['(True, None)', '(True, None)', '(False, 0.5)']],
      [[["(Throttle('10/s').duration, Throttle('5/hour').duration, Throttle('1/day').num)", "Throttle('x/m')", "Throttle('3/w')", "Throttle('3')"]], ['(1, 3600, 1)', '!ValueError', '!ValueError', '!ValueError']],
      [[["t = Throttle('1/m')", "t.allow('a', 0)", "t.allow('a', 10)", "t.allow('a', 59)", "t.allow('a', 60)"]], ['(True, None)', '(False, 50.0)', '(False, 1.0)', '(True, None)']],
      [[["t = Throttle('2/m')", "[t.allow('k', x) for x in (0, 18, 30, 60, 72)]"]], ['[(True, None), (True, None), (False, 30.0), (True, None), (False, 6.0)]']],
      [[["t = Throttle('100/h')", "ok = sum(t.allow('u', i)[0] for i in range(100000))", 'ok']], ['2800']]
    ] },
    solution: {
      approach: R`<p>A sliding-window log: keep recent timestamps per client, prune the expired ones, compare the count with the limit. This is DRF's <code>SimpleRateThrottle.allow_request</code>; its <code>wait()</code> gives the time until the oldest entry expires (divided by the number of free slots, which is 1 when the window is full).</p>`,
      code: { lang: 'python', run: true, code: R`
class Throttle:
    PERIODS = {"s": 1, "m": 60, "h": 3600, "d": 86400}

    def __init__(self, rate):
        try:
            num, period = rate.split("/")
            self.num = int(num)
            self.duration = self.PERIODS[period[0]]
        except (ValueError, KeyError, IndexError):
            raise ValueError(f"bad rate {rate!r}") from None
        self.history = {}

    def allow(self, ident, now):
        history = self.history.setdefault(ident, [])
        while history and history[-1] <= now - self.duration:
            history.pop()
        if len(history) >= self.num:
            return False, float(self.duration - (now - history[-1]))
        history.insert(0, now)
        return True, None


t = Throttle("3/min")
print([t.allow("u", s) for s in (0, 1, 2, 3)])
print(t.allow("u", 60))
` },
      complexity: R`<p>Amortised O(1) pruning per call; <code>insert(0, …)</code> is O(num), small in practice (a deque would make it O(1)). Space O(num) per client.</p>`
    }
  });

  practice.push({
    title: 'Squashed migrations and inconsistent history',
    level: 'Hard', tags: ['django', 'migrations', 'graphs', 'squashing'], companies: ['GitLab', 'Stripe', 'Instagram'],
    statement: R`<p>Write <code>migrate_plan(graph, replaces, applied)</code>. <code>graph</code> maps migration → list of dependencies; <code>replaces</code> maps a squashed migration → the list of originals it replaces (all of which are also in <code>graph</code>); <code>applied</code> lists recorded migrations. Apply Django's loader rules, then return the plan for <b>all</b> nodes:</p>
      <ol><li>For each squash: if <b>all or none</b> of its originals are applied, use the squash: remove the originals from the graph (and from the applied set), redirect every dependency on an original to the squash, and mark the squash applied when all originals were. If only <b>some</b> are applied, remove the squash instead and redirect dependencies on it to its <b>last</b> original.</li>
      <li>Consistency: if any applied migration (still in the graph) has a dependency that is not applied, raise <code>InconsistentMigrationHistory</code>.</li>
      <li>Plan: run the DFS from the guided problem (targets = all remaining nodes in sorted order, dependencies visited sorted, <code>NodeNotFoundError</code> / <code>CircularDependencyError</code>) and drop applied nodes.</li></ol>`,
    constraints: R`Up to 5000 migrations.`,
    example: R`<p>Originals <code>a.1 → a.2 → a.3</code> squashed into <code>a.sq</code>; <code>b.1</code> depends on <code>a.2</code>. Fresh DB → ${H.c('g', "['a.sq', 'b.1']")}; only <code>a.1</code> applied → ${H.c('b', "['a.2', 'a.3', 'b.1']")}; only <code>b.1</code> applied → ${H.c('r', 'InconsistentMigrationHistory')}.</p>`,
    brute: {
      why: R`<p>Ignoring <code>replaces</code> and planning the raw graph runs both the originals and the squash on a fresh database (duplicate tables) and cannot detect a history that was recorded out of order.</p>`,
      code: R`
        def naive_plan(graph, applied):
            return [m for m in sorted(graph) if m not in applied]   # ignores squash + order

        print(naive_plan({"a.1": [], "a.2": ["a.1"], "a.sq": []}, []))
      `
    },
    mcq: { q: 'A squash replaces 0001–0003 and production has applied only 0001. What does Django do?', options: ['Ignores the squash and keeps using the original migrations', 'Runs the squash and marks 0001 as unapplied', 'Raises InconsistentMigrationHistory', 'Runs both'], answer: 0, explain: 'A partially applied squash cannot be used; the originals stay in charge until all of them are applied, after which the squash counts as applied.' },
    hints: [
      R`<p>Hint 1: Work on copies: <code>g = {k: list(v) for k, v in graph.items()}</code>, <code>done = set(applied)</code>.</p>`,
      R`<p>Hint 2: Write <code>redirect(g, old_set, new)</code> that replaces any dependency in <code>old_set</code> by <code>new</code> (keeping order, no duplicates, never pointing a node at itself).</p>`,
      R`<p>Hint 3: Check consistency only after all squash rules are applied, then reuse your iterative DFS with all sorted nodes as targets and filter <code>done</code>.</p>`
    ],
    tests: { sig: 'string[] -> string[]', fn: 'run_lines', harness: { python: PYT }, cases: [
      [[["D = {'a.1': [], 'a.2': ['a.1'], 'a.3': ['a.2'], 'a.sq': [], 'b.1': ['a.2']}",
         "R = {'a.sq': ['a.1', 'a.2', 'a.3']}",
         'migrate_plan(D, R, [])',
         "migrate_plan(D, R, ['a.1'])",
         "migrate_plan(D, R, ['a.1', 'a.2', 'a.3'])"]],
       ["['a.sq', 'b.1']", "['a.2', 'a.3', 'b.1']", "['b.1']"]],
      [[["D = {'a.1': [], 'a.2': ['a.1'], 'a.3': ['a.2'], 'a.sq': [], 'b.1': ['a.2']}",
         "R = {'a.sq': ['a.1', 'a.2', 'a.3']}",
         "migrate_plan(D, R, ['b.1'])",
         "migrate_plan(D, R, ['a.1', 'b.1'])",
         "migrate_plan(D, R, ['a.1', 'a.2', 'a.3', 'b.1'])"]],
       ['!InconsistentMigrationHistory', '!InconsistentMigrationHistory', '[]']],
      [[["D2 = {'x.1': [], 'x.2': ['x.1']}",
         "migrate_plan(D2, {}, ['x.2'])",
         "migrate_plan(D2, {}, ['x.1'])",
         'migrate_plan(D2, {}, [])']],
       ['!InconsistentMigrationHistory', "['x.2']", "['x.1', 'x.2']"]],
      [[["D3 = {'a.1': [], 'a.2': ['a.1'], 'a.sq': [], 'c.1': ['a.sq']}",
         "R3 = {'a.sq': ['a.1', 'a.2']}",
         "migrate_plan(D3, R3, ['a.1'])",
         'migrate_plan(D3, R3, [])',
         "migrate_plan(D3, R3, ['a.1', 'a.2', 'c.1'])"]],
       ["['a.2', 'c.1']", "['a.sq', 'c.1']", '[]']],
      [[["migrate_plan({'a.1': ['b.1'], 'b.1': ['a.1']}, {}, [])",
         "migrate_plan({'a.1': ['zz.1']}, {}, [])",
         'migrate_plan({}, {}, [])']],
       ['!CircularDependencyError', '!NodeNotFoundError', '[]']],
      [[["C = {f'm.{i:04d}': ([f'm.{i - 1:04d}'] if i else []) for i in range(4000)}",
         "C['m.sq'] = []",
         "C['z.1'] = ['m.3999']",
         "RS = {'m.sq': [f'm.{i:04d}' for i in range(4000)]}",
         'migrate_plan(C, RS, [])',
         "len(migrate_plan(C, RS, ['m.0000']))",
         "migrate_plan(C, RS, [f'm.{i:04d}' for i in range(4000)])"]],
       ["['m.sq', 'z.1']", '4000', "['z.1']"]]
    ] },
    solution: {
      approach: R`<p>Three phases, mirroring <code>MigrationLoader.build_graph()</code>: rewrite the graph for each squash (use it when all or none of its originals are applied, otherwise drop it), validate that the recorded history is closed under dependencies, and run the iterative DFS planner on the rewritten graph.</p>`,
      code: { lang: 'python', run: true, code: R`
class NodeNotFoundError(KeyError):
    pass


class CircularDependencyError(ValueError):
    pass


class InconsistentMigrationHistory(Exception):
    pass


def _forwards(graph, targets):
    colour, order = {}, []
    for target in targets:
        if colour.get(target) == 2:
            continue
        colour[target] = 1
        stack = [(target, iter(sorted(graph[target])))]
        while stack:
            node, deps = stack[-1]
            for dep in deps:
                if dep not in graph:
                    raise NodeNotFoundError(dep)
                if colour.get(dep) == 1:
                    raise CircularDependencyError(dep)
                if dep not in colour:
                    colour[dep] = 1
                    stack.append((dep, iter(sorted(graph[dep]))))
                    break
            else:
                stack.pop()
                colour[node] = 2
                order.append(node)
    return order


def _redirect(graph, old, new):
    for node, deps in graph.items():
        out = []
        for d in deps:
            d = new if d in old else d
            if d != node and d not in out:
                out.append(d)
        graph[node] = out


def migrate_plan(graph, replaces, applied):
    g = {k: list(v) for k, v in graph.items()}
    done = set(applied)
    for squash, originals in replaces.items():
        hits = [o in done for o in originals]
        if all(hits) or not any(hits):
            for o in originals:
                g.pop(o, None)
                done.discard(o)
            _redirect(g, set(originals), squash)
            if all(hits):
                done.add(squash)
        else:
            g.pop(squash, None)
            _redirect(g, {squash}, originals[-1])
    for m in sorted(done):
        for dep in g.get(m, []):
            if dep not in done:
                raise InconsistentMigrationHistory(f"{m} is applied before its dependency {dep}")
    return [m for m in _forwards(g, sorted(g)) if m not in done]


D = {"a.1": [], "a.2": ["a.1"], "a.3": ["a.2"], "a.sq": [], "b.1": ["a.2"]}
R = {"a.sq": ["a.1", "a.2", "a.3"]}
print(migrate_plan(D, R, []))
print(migrate_plan(D, R, ["a.1"]))
try:
    migrate_plan(D, R, ["b.1"])
except InconsistentMigrationHistory as e:
    print("refused:", e)
` },
      complexity: R`<p>O((V + E) · S) for S squashes (each redirect scans the graph) plus the DFS O(V + E log d).</p>`
    }
  });

  practice.push({
    title: 'Detect N+1 patterns in a query log',
    level: 'Hard', tags: ['django', 'n+1', 'regex', 'observability'], companies: ['Datadog', 'Sentry', 'New Relic'],
    statement: R`<p>Tools like django-debug-toolbar and Sentry flag "similar queries". Write <code>find_n_plus_one(queries, threshold)</code>: normalise each SQL string and return <code>[(template, count), …]</code> for templates seen at least <code>threshold</code> times, sorted by count descending, ties by first appearance.</p>
      <p>Normalisation, in this order: (1) replace single-quoted string literals (with <code>''</code> as an escaped quote) by <code>?</code>; (2) replace numbers <code>\b\d+(\.\d+)?\b</code> by <code>?</code> (digits inside identifiers like <code>col1</code> stay); (3) replace <code>IN (?, ?, …)</code> lists by <code>IN (...)</code>; (4) collapse whitespace runs to one space and strip. <code>threshold &lt; 1</code> raises <code>ValueError</code>.</p>`,
    constraints: R`Up to 10<sup>5</sup> queries of ≤ 1000 characters.`,
    example: R`<p><code>['SELECT * FROM book', 'SELECT * FROM author WHERE id = 1', '... id = 2', '... id = 1']</code>, threshold 2 → ${H.c('r', "[('SELECT * FROM author WHERE id = ?', 3)]")}</p>`,
    brute: {
      why: R`<p>Counting exact SQL strings misses the problem entirely: every N+1 query differs only in its parameter, so each appears once.</p>`,
      code: R`
        from collections import Counter
        log = ["SELECT * FROM author WHERE id = 1", "SELECT * FROM author WHERE id = 2"]
        print([q for q, c in Counter(log).items() if c >= 2])     # [] : nothing found
      `
    },
    mcq: { q: 'Why normalise IN lists to a single placeholder form?', options: ['So the same query shape with different list lengths is grouped as one template', 'Because IN is invalid SQL', 'To make queries faster', 'Because Django never uses IN'], answer: 0, explain: 'A prefetch with 3 ids and one with 7 ids are the same query shape; without normalising they would look different.' },
    hints: [
      R`<p>Hint 1: Use regexes in order: strings <code>'(?:[^']|'')*'</code>, numbers, then <code>IN \(\s*\?(?:\s*,\s*\?)*\s*\)</code>, then <code>\s+</code>.</p>`,
      R`<p>Hint 2: Count with a dict that remembers first appearance (Python dicts keep insertion order).</p>`,
      R`<p>Hint 3: Sort with <code>key=lambda item: -item[1]</code>; Python's sort is stable, so ties keep first-appearance order.</p>`
    ],
    tests: { sig: 'string[] -> string[]', fn: 'run_lines', harness: { python: PYT }, cases: [
      [[["Q = ['SELECT * FROM book', 'SELECT * FROM author WHERE id = 1', 'SELECT * FROM author WHERE id = 2', 'SELECT * FROM author WHERE id = 1']", 'find_n_plus_one(Q, 2)']], ["[('SELECT * FROM author WHERE id = ?', 3)]"]],
      [[["find_n_plus_one([\"SELECT * FROM t WHERE name = 'O''Brien'\", \"SELECT * FROM t WHERE name = 'x 1'\"], 2)", "find_n_plus_one(['SELECT * FROM a WHERE id IN (1, 2, 3)', 'SELECT * FROM a WHERE id IN (4)'], 2)"]], ["[('SELECT * FROM t WHERE name = ?', 2)]", "[('SELECT * FROM a WHERE id IN (...)', 2)]"]],
      [[["find_n_plus_one(['SELECT  *\\n FROM x WHERE id=5', 'SELECT * FROM x WHERE id=6'], 2)", "find_n_plus_one(['SELECT col1 FROM t2 WHERE v = 2.5'], 1)"]], ["[('SELECT * FROM x WHERE id=?', 2)]", "[('SELECT col1 FROM t2 WHERE v = ?', 1)]"]],
      [[["Q = ['SELECT a WHERE id = 1', 'SELECT b WHERE id = 1', 'SELECT b WHERE id = 2', 'SELECT a WHERE id = 3', 'SELECT b WHERE id = 4']", 'find_n_plus_one(Q, 2)', "find_n_plus_one(['SELECT 1', 'SELECT 2', 'SELECT x'], 1)", "find_n_plus_one(['SELECT y', 'SELECT 9', 'SELECT 8', 'SELECT y'], 1)"]], ["[('SELECT b WHERE id = ?', 3), ('SELECT a WHERE id = ?', 2)]", "[('SELECT ?', 2), ('SELECT x', 1)]", "[('SELECT y', 2), ('SELECT ?', 2)]"]],
      [[["find_n_plus_one(['SELECT 1'], 2)", 'find_n_plus_one([], 1)', "find_n_plus_one(['SELECT 1'], 0)"]], ['[]', '[]', '!ValueError']],
      [[["Q = ['SELECT * FROM book'] + ['SELECT * FROM author WHERE id = %d' % (i % 50) for i in range(100000)]", 'find_n_plus_one(Q, 10)']], ["[('SELECT * FROM author WHERE id = ?', 100000)]"]]
    ] },
    solution: {
      approach: R`<p>Turn each query into its <b>shape</b> by replacing literals with placeholders, then count shapes. Repeated shapes above a threshold are the N+1 suspects. This is what APM tools and nplusone-style detectors do; the fix is then <code>select_related</code>, <code>prefetch_related</code> or an annotation.</p>`,
      code: { lang: 'python', run: true, code: R`
import re

STRING = re.compile(r"'(?:[^']|'')*'")
NUMBER = re.compile(r"\b\d+(?:\.\d+)?\b")
IN_LIST = re.compile(r"IN \(\s*\?(?:\s*,\s*\?)*\s*\)")
SPACE = re.compile(r"\s+")


def normalise(sql):
    sql = STRING.sub("?", sql)
    sql = NUMBER.sub("?", sql)
    sql = IN_LIST.sub("IN (...)", sql)
    return SPACE.sub(" ", sql).strip()


def find_n_plus_one(queries, threshold):
    if threshold < 1:
        raise ValueError("threshold must be >= 1")
    counts = {}
    for q in queries:
        shape = normalise(q)
        counts[shape] = counts.get(shape, 0) + 1
    hits = [(shape, n) for shape, n in counts.items() if n >= threshold]
    return sorted(hits, key=lambda item: -item[1])


log = ["SELECT * FROM book"] + [f"SELECT * FROM author WHERE id = {i % 3}" for i in range(20)]
print(find_n_plus_one(log, 5))
` },
      complexity: R`<p>O(total characters) for normalising plus O(k log k) to sort k distinct shapes.</p>`
    }
  });

  practice.push({
    title: 'transaction.atomic with savepoints and on_commit',
    level: 'Hard', tags: ['django', 'transactions', 'context managers', 'savepoints'], companies: ['Stripe', 'Adyen', 'Revolut'],
    statement: R`<p>Implement <code>Database</code> with a <code>data</code> dict, a <code>log</code> list, <code>atomic()</code> (a context manager) and <code>on_commit(fn)</code>:</p>
      <ul><li>Outermost <code>atomic</code> logs <code>BEGIN</code>; nested ones log <code>SAVEPOINT sN</code> (N counts up per database and never resets) and snapshot the data (deep copy) and the number of pending callbacks.</li>
      <li>Leaving an inner block normally logs <code>RELEASE SAVEPOINT sN</code>; with an exception it logs <code>ROLLBACK TO SAVEPOINT sN</code>, restores the snapshot and drops callbacks registered since the savepoint.</li>
      <li>Leaving the outermost block normally logs <code>COMMIT</code> and then runs pending callbacks in registration order; with an exception it logs <code>ROLLBACK</code>, restores the data from <code>BEGIN</code> and drops all callbacks.</li>
      <li>Exceptions always propagate. <code>on_commit</code> outside any transaction runs immediately (autocommit).</li></ul>`,
    constraints: R`Nesting depth ≤ 100.`,
    example: R`<p>Outer sets <code>a=1</code> and registers "email"; inner sets <code>b=2</code>, registers "sms", raises and is caught outside it → data ${H.c('g', "{'a': 1}")}, callbacks run ${H.c('g', "['email']")}, log ${H.c('b', 'BEGIN, SAVEPOINT s1, ROLLBACK TO SAVEPOINT s1, COMMIT')}.</p>`,
    brute: {
      why: R`<p>Sending the email directly inside the block means customers get receipts for orders that were rolled back; one flat transaction with no savepoints means a failing optional step (applying a coupon) aborts the whole order.</p>`,
      code: R`
        sent = []
        def place_order(db, fail):
            db["order"] = 1
            sent.append("receipt")            # side effect before commit
            if fail:
                db.clear()                    # rollback, but the email is already gone
        d = {}
        place_order(d, fail=True)
        print(d, sent)
      `
    },
    mcq: { q: 'An inner <code>atomic</code> block fails and you catch the exception <b>inside</b> that inner block. What goes wrong in Django?', options: ['The transaction is left in a broken state; you must let the exception leave the inner atomic so its savepoint is rolled back', 'Nothing, it is the recommended pattern', 'The outer block commits twice', 'on_commit callbacks run immediately'], answer: 0, explain: 'Catching inside means atomic never sees the error, so no ROLLBACK TO SAVEPOINT happens; on PostgreSQL further queries then fail with "current transaction is aborted".' },
    hints: [
      R`<p>Hint 1: Keep a stack of frames <code>(savepoint_name or None, deep-copied data, len(callbacks))</code>; the stack is empty outside transactions.</p>`,
      R`<p>Hint 2: <code>__exit__(exc_type, exc, tb)</code> pops a frame; <code>exc_type is None</code> means success. Return <code>False</code> so exceptions propagate.</p>`,
      R`<p>Hint 3: On outer COMMIT, copy and clear the callback list before running callbacks. On rollback, slice the callback list back to the saved length.</p>`
    ],
    tests: { sig: 'string[] -> string[]', fn: 'run_lines', harness: { python: PYT }, cases: [
      [[['db = Database()',
         'ran = []',
         "with db.atomic():\n    db.data['a'] = 1\n    db.on_commit(lambda: ran.append('email'))\n    try:\n        with db.atomic():\n            db.data['b'] = 2\n            db.on_commit(lambda: ran.append('sms'))\n            raise ValueError\n    except ValueError:\n        pass",
         'db.data',
         'ran',
         'db.log']],
       ["{'a': 1}", "['email']", "['BEGIN', 'SAVEPOINT s1', 'ROLLBACK TO SAVEPOINT s1', 'COMMIT']"]],
      [[['db = Database()',
         'ran = []',
         "try:\n    with db.atomic():\n        db.data['x'] = 1\n        db.on_commit(lambda: ran.append('x'))\n        raise KeyError\nexcept KeyError:\n    pass",
         'db.data',
         'ran',
         'db.log']],
       ['{}', '[]', "['BEGIN', 'ROLLBACK']"]],
      [[['db = Database()',
         'ran = []',
         "db.on_commit(lambda: ran.append('now'))",
         'ran',
         'db.log']],
       ["['now']", '[]']],
      [[['db = Database()',
         'ran = []',
         "with db.atomic():\n    db.on_commit(lambda: ran.append('outer'))\n    with db.atomic():\n        db.on_commit(lambda: ran.append('inner'))\n    ran.append('still inside')",
         'ran',
         'db.log',
         "with db.atomic():\n    with db.atomic():\n        pass",
         'db.log[-4:]']],
       ["['still inside', 'outer', 'inner']", "['BEGIN', 'SAVEPOINT s1', 'RELEASE SAVEPOINT s1', 'COMMIT']", "['BEGIN', 'SAVEPOINT s2', 'RELEASE SAVEPOINT s2', 'COMMIT']"]],
      [[['db = Database()',
         "with db.atomic():\n    db.data['a'] = 1\n    with db.atomic():\n        db.data['b'] = 2\n        try:\n            with db.atomic():\n                db.data['c'] = 3\n                raise ValueError\n        except ValueError:\n            pass",
         'db.data',
         'db.log']],
       ["{'a': 1, 'b': 2}", "['BEGIN', 'SAVEPOINT s1', 'SAVEPOINT s2', 'ROLLBACK TO SAVEPOINT s2', 'RELEASE SAVEPOINT s1', 'COMMIT']"]],
      [[['db = Database()',
         "with db.atomic():\n    db.data['x'] = [1]\n    raise ValueError('x')",
         'db.data',
         'db.log',
         "with db.atomic():\n    db.data['l'] = [1]\n    try:\n        with db.atomic():\n            db.data['l'].append(2)\n            raise KeyError\n    except KeyError:\n        pass",
         'db.data',
         "def nest(n):\n    if n == 0:\n        db.data['deep'] = True\n        return\n    with db.atomic():\n        nest(n - 1)",
         'nest(60)',
         "db.data['deep']",
         'db.log[-1]']],
       ['!ValueError', '{}', "['BEGIN', 'ROLLBACK']", "{'l': [1]}", 'True', "'COMMIT'"]]
    ] },
    solution: {
      approach: R`<p>A stack of frames models nesting: the bottom frame is the real transaction, every other frame is a savepoint holding a snapshot and the callback watermark. Exiting pops a frame and either releases/commits or restores. Callbacks wait in one list and run only when the bottom frame commits, which is exactly how <code>transaction.on_commit</code> behaves (Django ties callbacks to savepoint ids instead of list positions).</p>`,
      code: { lang: 'python', run: true, code: R`
import copy


class Database:
    def __init__(self):
        self.data, self.log = {}, []
        self._frames, self._callbacks, self._savepoints = [], [], 0

    def atomic(self):
        return _Atomic(self)

    def on_commit(self, fn):
        if not self._frames:
            fn()                                   # autocommit: nothing to wait for
        else:
            self._callbacks.append(fn)


class _Atomic:
    def __init__(self, db):
        self.db = db

    def __enter__(self):
        db = self.db
        if not db._frames:
            name = None
            db.log.append("BEGIN")
        else:
            db._savepoints += 1
            name = f"s{db._savepoints}"
            db.log.append(f"SAVEPOINT {name}")
        db._frames.append((name, copy.deepcopy(db.data), len(db._callbacks)))
        return self

    def __exit__(self, exc_type, exc, tb):
        db = self.db
        name, snapshot, watermark = db._frames.pop()
        if exc_type is None:
            if name is None:
                db.log.append("COMMIT")
                callbacks, db._callbacks = db._callbacks, []
                for fn in callbacks:
                    fn()
            else:
                db.log.append(f"RELEASE SAVEPOINT {name}")
        else:
            db.data = snapshot
            del db._callbacks[watermark:]
            db.log.append("ROLLBACK" if name is None else f"ROLLBACK TO SAVEPOINT {name}")
        return False


db, ran = Database(), []
with db.atomic():
    db.data["order"] = 1
    db.on_commit(lambda: ran.append("send receipt"))
    try:
        with db.atomic():
            db.data["coupon"] = "DUP"
            raise ValueError("duplicate coupon")
    except ValueError:
        pass
print(db.data, ran, db.log)
` },
      complexity: R`<p>Entering a savepoint costs a deep copy, O(size of data); a real database avoids this with MVCC/undo logs. Everything else is O(1) per operation plus O(callbacks) at commit.</p>`
    }
  });

  /* ======================================================================
     QUIZ
     ====================================================================== */
  quiz.push(
    { q: R`<code>urlpatterns = [path('&lt;str:page&gt;/', flat), path('about/', about)]</code>. Which view handles <code>/about/</code>?`, options: ['<code>flat</code>, because the first full match wins', '<code>about</code>, because it is more specific', 'Both run', 'Neither: a 404'], answer: 0, explain: 'Django tries patterns in order and stops at the first one that matches the whole path. <code>str</code> matches <code>about</code>.' },
    { q: R`What does the <code>int</code> path converter do with <code>articles/007/</code>?`, options: ['Matches and passes <code>7</code> (an int) to the view', 'Rejects it because of the leading zeros', 'Passes the string <code>"007"</code>', 'Raises ValueError'], answer: 0, explain: 'The regex is <code>[0-9]+</code> and <code>to_python</code> is <code>int()</code>, so leading zeros are accepted and dropped.' },
    { q: R`A class-based view defines only <code>get()</code>. What does a POST receive?`, options: ['405 with <code>Allow: GET, HEAD, OPTIONS</code>', '404', '200 from <code>get()</code>', '500'], answer: 0, explain: '<code>dispatch</code> falls back to <code>http_method_not_allowed</code>; HEAD is aliased to GET and OPTIONS is built into <code>View</code>.' },
    { q: R`How many queries run? <code>qs = Book.objects.filter(year__gt=1900)</code>; <code>list(qs)</code>; <code>len(qs)</code>; <code>qs.count()</code>`, options: ['1', '2', '3', '0'], answer: 0, explain: '<code>list(qs)</code> evaluates and fills the cache; <code>len()</code> and <code>count()</code> both use the cache.' },
    { q: R`Two requests run <code>p.stock -= 1; p.save()</code> at the same time on stock 10. What is the final stock in the worst case, and what fixes it?`, options: ['9; use <code>update(stock=F("stock") - 1)</code> or <code>select_for_update()</code>', '8; nothing needed', '10; use a signal', '9; call <code>save()</code> twice'], answer: 0, explain: 'Both read 10 and both write 9: a lost update. F expressions make the database compute the new value atomically.' },
    { q: R`You loop over 100 books and print <code>book.author.name</code> and each book's <code>tags.all()</code>. Which queryset gives a constant number of queries?`, options: ['<code>Book.objects.select_related("author").prefetch_related("tags")</code>', '<code>Book.objects.select_related("author", "tags")</code>', '<code>Book.objects.prefetch_related("author__name")</code>', '<code>Book.objects.only("author", "tags")</code>'], answer: 0, explain: 'ForeignKey → JOIN with select_related; ManyToMany → separate IN query with prefetch_related. select_related cannot follow many-to-many relations.' },
    { q: R`Inside <code>transaction.atomic()</code> you call <code>send_email()</code> directly and the block later raises. What happens?`, options: ['The data rolls back but the email was already sent; use <code>transaction.on_commit</code>', 'The email is cancelled automatically', 'Django retries the transaction', 'The email is queued until commit'], answer: 0, explain: 'Side effects outside the database are not transactional. <code>on_commit</code> delays them until a successful COMMIT.' },
    { q: R`Which statement about <code>post_save</code> signals is true?`, options: ['They do not fire for <code>QuerySet.update()</code> or <code>bulk_create()</code>', 'They run asynchronously in a worker', 'They run after the transaction commits', 'They fire once per HTTP request'], answer: 0, explain: 'Signals are synchronous, in-transaction hooks around <code>Model.save()</code>/<code>delete()</code>. Bulk operations bypass them.' },
    { q: R`<code>MIDDLEWARE = [A, B, C]</code>. In which order do the middleware see the response?`, options: ['C, B, A', 'A, B, C', 'B, A, C', 'Only A sees it'], answer: 0, explain: 'Requests go in A → B → C → view; responses unwind in reverse: C → B → A.' },
    { q: R`A migration has <code>RunPython(forwards)</code> with no reverse function. What happens on <code>migrate app 0001</code> (backwards past it)?`, options: ['<code>IrreversibleError</code>', 'It is silently skipped', 'Django deletes the rows it created', 'The forward function runs again'], answer: 0, explain: 'Without <code>reverse_code</code> the operation is irreversible; pass <code>RunPython.noop</code> if undoing is harmless.' },
    { q: R`In a DRF serializer, the <code>username</code> field fails and the object-level <code>validate()</code> would also fail. What is in <code>serializer.errors</code>?`, options: ['Only the username error', 'Both errors', 'Only <code>non_field_errors</code>', 'An empty dict'], answer: 0, explain: '<code>validate(attrs)</code> runs only after every field validated successfully.' },
    { q: R`An anonymous user calls a DRF endpoint protected by <code>IsAuthenticated</code>; only <code>TokenAuthentication</code> is configured. Status?`, options: ['401 with <code>WWW-Authenticate: Token</code>', '403', '404', '302 to the login page'], answer: 0, explain: 'TokenAuthentication supplies an authenticate header, so <code>NotAuthenticated</code> becomes 401. With SessionAuthentication it would be 403.' },
    { q: R`Which pagination style stays correct when new rows are inserted at the top of a feed between page requests?`, options: ['CursorPagination', 'LimitOffsetPagination', 'PageNumberPagination', 'None of them'], answer: 0, explain: 'A cursor stores a position value, not a count, so inserts before it do not shift the next page.' },
    { q: R`Which is a fair reason to choose FastAPI over Django + DRF for a new service?`, options: ['A small async I/O-bound API (e.g. calling LLMs) that needs no admin, ORM migrations or built-in auth', 'You need an admin back office tomorrow', 'You want the built-in ORM and migrations', 'Django cannot serve JSON'], answer: 0, explain: 'Django shines with batteries (admin, ORM, auth); FastAPI shines as a lean async layer where you pick your own components.' }
  );

  /* ======================================================================
     INTERVIEW
     ====================================================================== */
  interview.push(
    { level: 'B', q: R`Explain Django's MTV pattern and the life of a request.`, a: R`<p>Model–Template–View: <b>models</b> describe data and queries; <b>views</b> are callables that take an <code>HttpRequest</code> and return an <code>HttpResponse</code> (the "controller" in MVC terms); <b>templates</b> render HTML. A request arrives from the WSGI/ASGI server, passes through the middleware list top to bottom (security, sessions, CSRF, authentication…), the URL resolver matches <code>path_info</code> against <code>ROOT_URLCONF</code> (first full match wins, converters turn captured text into Python values), the view runs and usually queries models and renders a template, and the response goes back through middleware in reverse order before the server sends it. Exceptions are converted to responses at each middleware boundary (404, 403, 500).</p>`, followUps: ['Where would you add a request id header?', 'What does <code>include()</code> do during resolution?'] },
    { level: 'B', q: R`Function-based or class-based views: how do you choose?`, a: R`<p>Both are just callables. FBVs are explicit, easy to read and test, and decorators handle cross-cutting concerns (<code>@login_required</code>, <code>@require_http_methods</code>). CBVs organise behaviour per HTTP method and let you reuse logic through inheritance and mixins; generic views (ListView, DetailView, CreateView…) remove boilerplate for CRUD pages. The cost of CBVs is hidden control flow: you must know which hook (<code>get_queryset</code>, <code>get_object</code>, <code>form_valid</code>) to override and mixin order matters because of the MRO. I use generic CBVs for standard CRUD and FBVs (or simple <code>View</code> subclasses) for custom business endpoints. Each CBV request gets a fresh instance from <code>as_view()</code>, so state on <code>self</code> is safe.</p>`, followUps: ['Why must <code>LoginRequiredMixin</code> be listed first?', 'What does <code>as_view()</code> return?'] },
    { level: 'I', q: R`What does "QuerySets are lazy" mean, and when does a QuerySet hit the database?`, a: R`<p>Building a QuerySet with <code>filter</code>, <code>exclude</code>, <code>order_by</code>, <code>annotate</code> or slicing only builds a <code>Query</code> object; each call returns a new QuerySet and runs no SQL. The query runs when the QuerySet is evaluated: iteration, <code>list()</code>, <code>len()</code>, <code>bool()</code>, <code>repr()</code>, pickling or slicing with a step. Results are stored in <code>_result_cache</code>, so evaluating the same object again is free, but a new QuerySet derived from it (another <code>filter</code>) queries again. <code>count()</code>, <code>exists()</code>, <code>get()</code>, <code>first()</code>, <code>aggregate()</code>, <code>update()</code> and <code>delete()</code> always query unless a filled cache can answer count/exists. For huge results use <code>.iterator()</code> to stream without caching.</p>`, followUps: ['Why is <code>if qs:</code> sometimes worse than <code>qs.exists()</code>?', 'How do you print the SQL a QuerySet will run?'] },
    { level: 'I', q: R`What is the N+1 problem and how do <code>select_related</code> and <code>prefetch_related</code> solve it?`, a: R`<p>N+1 happens when you fetch N objects with one query and then access a relation on each, causing one more query per object. <code>select_related</code> follows single-valued relations (ForeignKey, OneToOne) with a SQL JOIN, so everything comes back in one query. <code>prefetch_related</code> handles multi-valued relations (ManyToMany, reverse FK) and also works for FKs: it runs one extra query per relation level with <code>WHERE fk IN (…)</code> and stitches results together in Python, avoiding the row explosion a JOIN would cause. <code>Prefetch(queryset=…, to_attr=…)</code> filters or orders the related set. Catch regressions with <code>assertNumQueries</code>, django-debug-toolbar or APM traces, and remember that calling <code>.filter()</code> on a prefetched relation ignores the cache.</p>`, followUps: ['When could <code>select_related</code> be slower than <code>prefetch_related</code>?', 'How do you avoid N+1 in a DRF SerializerMethodField?'] },
    { level: 'I', q: R`Explain F and Q expressions with examples.`, a: R`<p><b>F</b> refers to a column's value inside the database. <code>update(stock=F("stock") - 1)</code> compiles to <code>SET stock = stock - 1</code>, which is atomic and avoids lost updates from Python read-modify-write; <code>filter(sold__gt=F("stock"))</code> compares two columns; F also works in annotations and ordering (<code>F("price").desc(nulls_last=True)</code>). After an F update the Python object holds an expression, so call <code>refresh_from_db()</code>. <b>Q</b> objects encapsulate conditions and combine with <code>|</code> (OR), <code>&amp;</code> (AND) and <code>~</code> (NOT): <code>filter(Q(year__lt=1900) | Q(rating=5))</code>. They let you build dynamic filters from user input. Note that negation follows Python intuition with NULLs: <code>~Q(rating__lt=4)</code> includes NULL ratings because Django adds an <code>IS NOT NULL</code> inside the NOT.</p>`, followUps: ['How would you implement an atomic "like" counter?', 'Difference between <code>exclude(a=1, b=2)</code> and <code>exclude(a=1).exclude(b=2)</code>?'] },
    { level: 'I', q: R`How do transactions work in Django? Explain <code>atomic</code>, savepoints and <code>on_commit</code>.`, a: R`<p>Django defaults to autocommit: each query commits immediately. <code>transaction.atomic</code> (decorator or context manager) opens a transaction; if the block exits with an exception it rolls back, otherwise it commits. Nested <code>atomic</code> blocks create savepoints, so you can roll back only an inner part by letting its exception leave the inner block and catching it outside. <code>ATOMIC_REQUESTS</code> wraps every view. <code>transaction.on_commit(fn)</code> registers a callback that runs only after the outermost transaction commits (and is discarded if its savepoint rolls back): the right place to send emails or enqueue Celery tasks so workers never see uncommitted data. For read-then-write races use <code>select_for_update()</code> inside <code>atomic</code>, or a conditional <code>update()</code> with F expressions; PostgreSQL's default isolation is READ COMMITTED.</p>`, followUps: ['Why should you not catch an IntegrityError inside an atomic block?', 'How do you test on_commit callbacks?'] },
    { level: 'I', q: R`How do Django migrations work, and how do you change a big production table safely?`, a: R`<p><code>makemigrations</code> diffs models against the state reconstructed from existing migration files and writes operations; <code>migrate</code> loads all migrations into a dependency graph, checks the recorded history in <code>django_migrations</code> is consistent, computes a topological plan of unapplied nodes and runs them, recording each. Merge conflicts from parallel branches show up as multiple leaf nodes (<code>makemigrations --merge</code>). For large tables use expand/contract: add columns as nullable (or with <code>db_default</code>), deploy code that writes both, backfill in batches in a separate migration (often <code>atomic = False</code>), then add constraints or drop old columns in a later release. Create indexes with <code>AddIndexConcurrently</code> on PostgreSQL, set lock timeouts, review <code>sqlmigrate</code> output, and never edit migrations that have been applied anywhere.</p>`, followUps: ['What is a squashed migration and when is it used?', 'Why use <code>apps.get_model</code> in RunPython?'] },
    { level: 'I', q: R`What is middleware in Django and how is the chain built?`, a: R`<p>Middleware is a factory called once with <code>get_response</code> (the next layer) that returns a callable handling each request; it can modify the request, short-circuit with its own response, or post-process the response. <code>settings.MIDDLEWARE</code> order matters: the first entry is outermost (sees the request first, the response last). Django builds the chain in <code>load_middleware</code> by iterating the list in reverse, wrapping the current handler and wrapping each layer with <code>convert_exception_to_response</code>, so exceptions become 404/403/400/500 responses before outer middleware see them. Optional hooks are <code>process_view</code>, <code>process_exception</code> and <code>process_template_response</code>. Typical uses: security headers, sessions, CSRF, authentication, request ids, timing, tenant routing. Keep them cheap; they run on every request.</p>`, followUps: ['Why must SessionMiddleware come before AuthenticationMiddleware?', 'What changes for middleware under ASGI?'] },
    { level: 'A', q: R`When would you use Django signals, and why do many teams avoid them for business logic?`, a: R`<p>Signals decouple a sender from receivers: <code>post_save</code>, <code>pre_delete</code>, <code>m2m_changed</code>, <code>user_logged_in</code>, or custom signals. They are useful for cross-cutting reactions to third-party models (e.g. create a profile when a User is created) and framework integration. Downsides: control flow is invisible at the call site; receivers run synchronously in the sender's thread and transaction, so slow receivers slow every save and a failing receiver breaks the save; they do not fire for <code>update()</code>, <code>bulk_create()</code> or raw SQL, so logic silently skips; ordering between receivers is by registration; and duplicate registration happens without <code>dispatch_uid</code>. For core business rules prefer explicit service functions, and for side effects use <code>transaction.on_commit</code> with a task queue.</p>`, followUps: ['Where should receivers be connected?', 'How do you test code that relies on signals?'] },
    { level: 'A', q: R`Walk through what happens when a DRF serializer validates input.`, a: R`<p><code>is_valid()</code> calls <code>run_validation(data)</code>. First <code>to_internal_value</code> iterates the writable fields in declaration order: for each, the empty-value checks (required, <code>allow_null</code>, defaults, skipped when <code>partial=True</code>), the field's own <code>to_internal_value</code> (type conversion such as "36" → 36), its validators (max_length, min_value, UniqueValidator), and then the serializer's <code>validate_&lt;field&gt;</code> method. Errors are collected per field rather than stopping at the first. If any field failed, validation stops with those errors. Otherwise serializer-level validators (UniqueTogetherValidator) and <code>validate(attrs)</code> run; their errors go under <code>non_field_errors</code>. Read-only fields are ignored on input, write-only fields are excluded from output. <code>save()</code> then calls <code>create</code> or <code>update</code> with <code>validated_data</code>, plus any kwargs passed to save.</p>`, followUps: ['How do you handle writable nested serializers?', 'Why should <code>fields = "__all__"</code> be avoided?'] },
    { level: 'A', q: R`How do DRF permissions work, including object-level permissions and the 401 vs 403 decision?`, a: R`<p>For every request, <code>APIView.initial()</code> authenticates (lazily), then calls <code>has_permission</code> on each class in <code>permission_classes</code> (all must pass; <code>|</code>, <code>&amp;</code>, <code>~</code> compose them), then throttles. Object permissions run only when the view calls <code>get_object()</code> (or <code>check_object_permissions</code> manually), so list endpoints never check them: restrict list visibility by filtering <code>get_queryset()</code>. With OR composition, DRF 3.14+ evaluates each operand's has_permission and has_object_permission together. On denial, if authenticators are configured and none succeeded, DRF raises <code>NotAuthenticated</code>, which becomes 401 only if the first authentication class provides a <code>WWW-Authenticate</code> header (Token, Basic); with session auth it is 403. Write a test matrix of roles × methods × ownership.</p>`, followUps: ['Implement IsOwnerOrReadOnly', 'Where do you enforce multi-tenancy?'] },
    { level: 'A', q: R`Compare page-number, limit/offset and cursor pagination. When do you use each?`, a: R`<p>Page-number (<code>?page=3</code>) and limit/offset both translate to <code>LIMIT/OFFSET</code> plus a <code>COUNT(*)</code>; they allow jumping to any page and showing totals, which suits admin tables and small datasets. Their problems: deep offsets are slow (the database still walks the skipped rows), counts on huge tables are expensive, and rows shift when data changes, causing duplicates or skips. Cursor (keyset) pagination encodes the last row's position in an opaque cursor and queries <code>WHERE (created, id) &lt; (:c, :i) ORDER BY … LIMIT n+1</code>; it is O(log n + page) with an index, stable under inserts, and ideal for feeds and infinite scroll and for API clients syncing data. Trade-offs: no page jumping, no total, and it needs a unique, immutable ordering (add the primary key as a tie-breaker).</p>`, followUps: ['How does DRF know if there is a next page without COUNT?', 'How would you paginate a search result sorted by relevance?'] },
    { level: 'E', q: R`Your team must pick Django + DRF or FastAPI for a new product. How do you decide?`, a: R`<p>I compare needs, not popularity. Django + DRF gives an integrated ORM with migrations, admin, auth, sessions, permissions, forms, i18n, a large ecosystem (Celery integration, django-filter, allauth) and strong conventions that help large teams; it is mostly synchronous, though async views and an async ORM API exist (the ORM still runs in a thread). FastAPI is a thin ASGI framework: Pydantic validation, type-driven OpenAPI docs, dependency injection and native async, which suits I/O-heavy services (LLM calls, fan-out to other APIs, WebSockets) and ML model serving, but you assemble ORM (SQLAlchemy/SQLModel), migrations (Alembic), auth and admin yourself. Signals for Django: data-heavy CRUD product, back-office needs, team knows Django. Signals for FastAPI: small focused services, high-concurrency I/O, typed contracts. Hybrids are common (Django for the core, FastAPI for specific services), and Django Ninja offers FastAPI-style typing inside Django.</p>`, followUps: ['How would you serve a streaming LLM response from Django?', 'What would make you migrate from one to the other?'] }
  );

  registerModule({
    id: 'py16',
    title: 'Django Essentials & Django REST Framework',
    intro: R`<p>Django is the "batteries included" Python web framework behind Instagram, Disqus and countless internal tools; Django REST Framework (DRF) is the standard way to build APIs on top of it. This module teaches both the way interviews test them: not just "how do I write a view", but <b>what happens underneath</b>. You will see how a request flows through middleware and the URL resolver, why QuerySets are lazy, how one innocent loop becomes the <b>N+1</b> problem and how <code>select_related</code> and <code>prefetch_related</code> fix it, how F and Q expressions and <code>transaction.atomic</code> keep data correct under concurrency, and how migrations are planned from a dependency graph.</p>
      <p>Then we build APIs with DRF: serializers and their exact validation order, viewsets and routers, permissions (including the 401 vs 403 rule), pagination (page number vs cursor) and throttling, and we finish with an honest Django vs FastAPI comparison (the FastAPI and SQLAlchemy modules cover those tools in depth). Django itself cannot run in this sandbox, so Django code is shown as reference, and every exercise rebuilds the mechanism in plain, tested Python: a URL resolver, a lazy QuerySet that counts queries, a middleware chain, a migration planner, a serializer, a permission checker, cursor pagination and more.</p>`,
    goals: [
      'Explain the Django request lifecycle (middleware → URL resolver → view → template) and write URL patterns with converters, <code>include()</code> and <code>reverse()</code>',
      'Predict exactly when a QuerySet runs SQL, count queries, and remove N+1 problems with <code>select_related</code>, <code>prefetch_related</code> and annotations',
      'Use F and Q expressions, <code>transaction.atomic</code>, savepoints, <code>select_for_update</code> and <code>on_commit</code> to keep data correct under concurrency',
      'Plan and review migrations (dependency graph, data migrations, squashing, zero-downtime schema changes) and order middleware correctly',
      'Build DRF APIs with serializers, viewsets, routers, permissions, pagination and throttling, and argue Django vs FastAPI trade-offs in an interview'
    ],
    prereqs: R`<p>Python 8 (advanced OOP: classes, MRO, mixins, descriptors) and Backend 4 (HTTP methods, status codes, REST design, pagination). Basic SQL (SELECT, JOIN, transactions) helps with the ORM topics.</p>`,
    hours: 16,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
