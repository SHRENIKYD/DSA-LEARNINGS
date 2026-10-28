(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- shared helpers for this module's visualizers ---------- */
  function pad4(frames, tip) {
    while (frames.length < 4) {
      var last = frames[frames.length - 1];
      frames.push({ narr: tip || 'Tip: try a longer input above to see more steps.', parts: last.parts });
    }
    return frames;
  }
  function words(input, max, hint) {
    var items = String(input === undefined ? '' : input).split(/[\s,]+/).filter(Boolean);
    if (!items.length) throw new Error(hint);
    if (items.length > max) throw new Error('Use at most ' + max + ' items. ' + hint);
    return items;
  }
  function cp(o) { var r = {}; for (var k in o) r[k] = o[k]; return r; }

  /* =====================================================================
     TOPIC 1 — Router: routes, params, guards, resolvers, lazy loading
     ===================================================================== */
  var ROUTES = [
    { path: '', note: 'redirectTo: "products"' },
    { path: 'login', note: 'LoginComponent (eager)' },
    { path: 'products', note: 'loadComponent: ProductList' },
    { path: 'products/:id', note: 'loadComponent: ProductDetail, resolve: { product }' },
    { path: 'admin', note: 'canMatch: [adminGuard], loadChildren: ADMIN_ROUTES' },
    { path: 'account', note: 'canActivate: [authGuard], loadComponent: Account' },
    { path: '**', note: 'NotFoundComponent' }
  ];
  function matchRoute(url) {
    var segs = url.split('/').filter(Boolean);
    for (var i = 0; i < ROUTES.length; i++) {
      var r = ROUTES[i], ps = r.path.split('/').filter(Boolean);
      if (r.path === '**') return { i: i, params: {} };
      if (r.path === '' && segs.length === 0) return { i: i, params: {} };
      if (r.path === '') continue;
      var isPrefix = r.path === 'admin';
      if (!isPrefix && ps.length !== segs.length) continue;
      if (isPrefix && segs.length < 1) continue;
      var ok = true, params = {};
      for (var j = 0; j < ps.length; j++) {
        if (ps[j].charAt(0) === ':') params[ps[j].slice(1)] = segs[j];
        else if (ps[j] !== segs[j]) { ok = false; break; }
      }
      if (ok) return { i: i, params: params };
    }
    return { i: ROUTES.length - 1, params: {} };
  }

  topics.push({
    title: 'The Angular Router: Routes, Params, Guards, Resolvers & Lazy Loading',
    analogy: `<p>Think of a <b>big office building with a reception desk</b>. A visitor says an address ("floor 3, room 42"). The receptionist checks a <b>directory</b> (the route table) from top to bottom and stops at the first line that fits. Some floors have a <b>security guard</b> who checks your badge before the lift doors open (guards). Some rooms need the <b>coffee and files ready</b> before you walk in (resolvers). And some floors are not even furnished until the first visitor asks for them; the furniture is delivered on demand (lazy loading). The room number written in the address ("42") is the <b>route parameter</b>.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> A single-page app has one HTML page, but users still want real URLs they can bookmark and share. The Angular <b>Router</b> watches the URL, finds the matching entry in a list of <b>routes</b>, and shows that route's component inside a <code>&lt;router-outlet&gt;</code> without reloading the page.</p>
      <p>A route is a plain object. The modern (Angular 15+, standalone) setup is <code>provideRouter(routes, ...features)</code> in <code>app.config.ts</code> — no <code>NgModule</code> needed.</p>
      ${H.table(['Route field', 'What it does', 'Example'], [
        ['<code>path</code>', 'URL pattern. <code>:id</code> is a parameter, <code>**</code> matches anything', '<code>products/:id</code>'],
        ['<code>component</code>', 'Eagerly loaded component to show', '<code>LoginComponent</code>'],
        ['<code>loadComponent</code>', 'Lazy: download one standalone component when first visited', '<code>() =&gt; import(\'./detail\').then(m =&gt; m.Detail)</code>'],
        ['<code>loadChildren</code>', 'Lazy: download a whole child route array (a feature area)', '<code>() =&gt; import(\'./admin/routes\')</code>'],
        ['<code>canActivate</code> / <code>canActivateChild</code>', 'Guard: may we enter this route (or its children)?', '<code>[authGuard]</code>'],
        ['<code>canMatch</code>', 'Guard that runs <i>while matching</i>: if false the router tries the next route and the lazy code is never downloaded', '<code>[adminGuard]</code>'],
        ['<code>canDeactivate</code>', 'May we leave? (unsaved changes)', '<code>[unsavedChangesGuard]</code>'],
        ['<code>resolve</code>', 'Load data before the component is created', '<code>{ product: productResolver }</code>'],
        ['<code>title</code>, <code>data</code>, <code>providers</code>', 'Page title, static data, route-scoped services', '<code>title: \'Products\'</code>']
      ])}
      <p>🔵 <b>Order matters.</b> The router uses <b>first match wins</b>, scanning top to bottom, so specific paths go before general ones and <code>**</code> always goes last. An empty path with <code>redirectTo</code> needs <code>pathMatch: 'full'</code>, otherwise the empty prefix would match every URL.</p>
      <p>🔵 <b>Reading parameters.</b> Three ways, newest first:</p>
      <ol>
        <li><b>Component input binding</b>: add <code>withComponentInputBinding()</code> to <code>provideRouter</code>. Then path params, query params, resolved data and route <code>data</code> are set on inputs with the same name: <code>id = input&lt;string&gt;()</code>. Cleanest, testable, and works with signals.</li>
        <li><code>inject(ActivatedRoute).paramMap</code>: an Observable that emits again when only the parameter changes (Angular <b>reuses</b> the component when you go from <code>/products/1</code> to <code>/products/2</code>, so reading the snapshot once is a classic bug).</li>
        <li><code>route.snapshot.paramMap.get('id')</code>: fine only when the component is never reused for a different id.</li>
      </ol>
      <p>🔵 <b>Functional guards and resolvers.</b> Since Angular 15 guards are plain functions (<code>CanActivateFn</code>, <code>CanMatchFn</code>, <code>CanDeactivateFn&lt;T&gt;</code>, <code>ResolveFn&lt;T&gt;</code>) that use <code>inject()</code> for services. Class-based guards (<code>implements CanActivate</code>) are deprecated. A guard returns <code>boolean</code>, a <code>UrlTree</code> (redirect), or since v18 a <code>RedirectCommand</code>, or an Observable/Promise of these.</p>
      ${H.table(['Lazy option', 'Downloads', 'Use when'], [
        ['<code>loadComponent</code>', 'One component chunk', 'A single heavy page (chart, editor)'],
        ['<code>loadChildren</code>', 'A route file with many child routes + their providers', 'A whole feature area (admin, settings)'],
        ['<code>@defer</code> (template)', 'Part of a page', 'Heavy widget below the fold (see the @defer topic)']
      ])}
      <p>Add <code>withPreloading(PreloadAllModules)</code> (or a custom strategy) to download lazy chunks in the background after the first page is interactive, so the next click is instant.</p>`,
    clues: [
      '"Only admins can see /admin and non-admins should not even download the admin code" → <code>canMatch</code> guard + <code>loadChildren</code>',
      '"Warn the user before leaving a form with unsaved changes" → <code>canDeactivate</code> guard',
      '"Going from /user/1 to /user/2 the page still shows user 1" → component is reused; read params reactively (input binding or <code>paramMap</code>), not the snapshot',
      '"Initial bundle is too big / first load is slow" → lazy routes with <code>loadComponent</code> / <code>loadChildren</code>, plus a preloading strategy',
      '"Data must be there before the page shows (no empty flash)" → <code>ResolveFn</code>, or show a skeleton and load in the component (trade-off: resolvers block navigation)',
      '"Redirect to /login and come back after login" → guard returns <code>router.createUrlTree([\'/login\'], { queryParams: { returnUrl: state.url } })</code>'
    ],
    code: [
      { lang: 'ts', title: 'app.routes.ts + app.config.ts — standalone routing with functional guards, resolver and lazy loading', code: `import { ApplicationConfig, inject } from '@angular/core';
import {
  Routes, provideRouter, withComponentInputBinding, withPreloading,
  PreloadAllModules, CanActivateFn, CanMatchFn, ResolveFn, Router
} from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { AuthService } from './auth.service';
import { ProductApi, Product } from './product.api';

// Functional guard: plain function, services come from inject().
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  // true = go on; UrlTree = cancel this navigation and redirect.
  return auth.isLoggedIn()
    ? true
    : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

// canMatch runs during matching. Returning false makes the router try the
// next route, so the lazy admin chunk is never downloaded for non-admins.
export const adminGuard: CanMatchFn = () => inject(AuthService).hasRole('admin');

// Resolver: data is fetched before the component is created.
export const productResolver: ResolveFn<Product> = (route) =>
  inject(ProductApi).getById(route.paramMap.get('id')!);

export const routes: Routes = [
  { path: '', redirectTo: 'products', pathMatch: 'full' },        // full: else '' matches everything
  { path: 'login', loadComponent: () => import('./login/login.component').then(m => m.LoginComponent) },
  { path: 'products', title: 'Products',
    loadComponent: () => import('./products/list.component').then(m => m.ProductListComponent) },
  { path: 'products/:id',
    loadComponent: () => import('./products/detail.component').then(m => m.ProductDetailComponent),
    resolve: { product: productResolver } },                       // becomes input 'product'
  { path: 'admin', canMatch: [adminGuard],
    loadChildren: () => import('./admin/admin.routes').then(m => m.ADMIN_ROUTES) },
  { path: 'account', canActivate: [authGuard],
    loadComponent: () => import('./account/account.component').then(m => m.AccountComponent) },
  { path: '**', loadComponent: () => import('./not-found.component').then(m => m.NotFoundComponent) }, // always last
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes,
      withComponentInputBinding(),            // params / query / data / resolved -> component inputs
      withPreloading(PreloadAllModules)),     // fetch lazy chunks in the background after start
    provideHttpClient(withFetch()),
  ],
};` },
      { lang: 'ts', title: 'Reading params as signal inputs (withComponentInputBinding)', code: `import { Component, input, computed } from '@angular/core';
import { Product } from './product.api';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  template: \`
    <h1>{{ product().name }}</h1>
    <p>Showing id {{ id() }}, tab {{ tab() ?? 'overview' }}</p>
  \`,
})
export class ProductDetailComponent {
  // Route param ':id' — re-set automatically when the URL changes from /products/1 to /products/2.
  id = input.required<string>();
  // Query param ?tab=reviews (undefined when absent).
  tab = input<string>();
  // Resolved data from resolve: { product: productResolver }.
  product = input.required<Product>();
  title = computed(() => this.product().name.toUpperCase());
}` }
    ],
    viz: {
      title: 'Navigate: match → guards → resolve → lazy load → render',
      input: '/products/42',
      inputLabel: 'URL to navigate to (try /admin/users, /account, /, /nope)',
      gen: function (input) {
        var url = String(input || '').trim();
        if (!url || url.charAt(0) !== '/') throw new Error('Type a URL path starting with /, e.g. /products/42');
        if (url.length > 60) throw new Error('Keep the URL under 60 characters.');
        var frames = [], m = matchRoute(url), r = ROUTES[m.i];
        var rows = ROUTES.map(function (x) { return [x.path === '' ? "''" : x.path, x.note]; });
        frames.push({ narr: 'The user navigates to <code>' + H.esc(url) + '</code>. The router splits it into segments and scans the route table <b>top to bottom</b>. First match wins.', parts: [{ type: 'table', label: 'route table', columns: ['path', 'config'], rows: rows }] });
        for (var i = 0; i <= m.i; i++) {
          var hl = {}; hl[i] = i === m.i ? 'ok' : 'bad';
          frames.push({ narr: i === m.i ? 'Row ' + (i + 1) + ' (<code>' + H.esc(ROUTES[i].path || "''") + '</code>) <b>matches</b>.' + (Object.keys(m.params).length ? ' Parameter captured: <code>' + H.esc(JSON.stringify(m.params)) + '</code>.' : '') : 'Row ' + (i + 1) + ' (<code>' + H.esc(ROUTES[i].path || "''") + '</code>) does not fit the segments, try the next one.', parts: [{ type: 'table', label: 'route table', columns: ['path', 'config'], rows: rows, hl: hl }] });
        }
        var nodes = [{ id: 'u', label: 'URL', x: 6, y: 30, shape: 'box' }, { id: 'g', label: 'guards', x: 28, y: 30, shape: 'box' }, { id: 'r', label: 'resolve', x: 50, y: 30, shape: 'box' }, { id: 'l', label: 'lazy chunk', x: 72, y: 30, shape: 'box' }, { id: 'c', label: 'outlet', x: 94, y: 30, shape: 'box' }];
        var edges = [['u', 'g'], ['g', 'r'], ['r', 'l'], ['l', 'c']];
        function g(hl, ehl, narr) { frames.push({ narr: narr, parts: [{ type: 'graph', directed: true, nodes: nodes, edges: edges, hl: hl, ehl: ehl }] }); }
        if (r.path === '') { g({ u: 'cur' }, {}, '<code>redirectTo: \'products\'</code> with <code>pathMatch: \'full\'</code>: the router replaces the URL with <code>/products</code> and starts matching again.'); return pad4(frames); }
        if (r.path === 'admin') {
          g({ g: 'cur' }, { 'u-g': 'cur' }, '<code>canMatch: [adminGuard]</code> runs <i>during matching</i>. If the user is not an admin it returns false, the router moves on to the next route (here <code>**</code>), and the admin chunk is <b>never downloaded</b>.');
          g({ g: 'ok', l: 'cur' }, { 'g-l': 'cur' }, 'User is an admin: <code>loadChildren</code> downloads <code>admin.routes</code> once, then the remaining segments (<code>' + H.esc(url.split('/').slice(2).join('/') || "''") + '</code>) are matched against the child routes.');
          g({ c: 'ok' }, { 'l-c': 'ok' }, 'The matched child component renders in the outlet. Next visit, the chunk is cached.');
          return pad4(frames);
        }
        if (r.path === 'account') {
          g({ g: 'cur' }, { 'u-g': 'cur' }, '<code>canActivate: [authGuard]</code> runs <b>after</b> matching. Logged out? It returns a <code>UrlTree</code> to <code>/login?returnUrl=/account</code> and this navigation is cancelled.');
          g({ g: 'ok', l: 'cur' }, { 'g-l': 'cur' }, 'Logged in: guard returns <code>true</code>. Note: with canActivate the lazy chunk can still be fetched before/while guards run; use canMatch if the code itself must stay hidden.');
          g({ c: 'ok' }, { 'l-c': 'ok' }, 'AccountComponent renders inside <code>&lt;router-outlet&gt;</code>.');
          return pad4(frames);
        }
        g({ g: 'done' }, { 'u-g': 'cur' }, 'No guards on this route, so nothing blocks the navigation.');
        if (r.path === 'products/:id') g({ r: 'cur' }, { 'g-r': 'cur' }, '<code>productResolver</code> calls the API with id <code>' + H.esc(m.params.id) + '</code>. Navigation <b>waits</b> here: the old page stays on screen until data arrives (show a progress bar via router events).');
        else g({ r: 'done' }, { 'g-r': 'cur' }, 'No resolvers, so the component will load its own data (often with a skeleton).');
        g({ l: 'cur' }, { 'r-l': 'cur' }, r.note.indexOf('load') >= 0 ? '<code>loadComponent</code> runs <code>import()</code>: the browser downloads this page\'s JS chunk the first time only.' : 'Eager component: already in the main bundle, nothing to download.');
        g({ c: 'ok' }, { 'l-c': 'ok' }, 'The component is created in the outlet.' + (m.params.id ? ' With <code>withComponentInputBinding()</code> its <code>id</code> input is <code>"' + H.esc(m.params.id) + '"</code> and its <code>product</code> input holds the resolved data.' : ''));
        return pad4(frames);
      }
    },
    examples: [
      { title: 'Unsaved-changes guard with CanDeactivateFn', html: `<p>The guard receives the component instance, so the component decides. Keep the check in the component (it knows its form), and the guard just asks.</p>`,
        code: { lang: 'ts', code: `import { CanDeactivateFn } from '@angular/router';

export interface HasUnsavedChanges { hasUnsavedChanges(): boolean; }

export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) =>
  component.hasUnsavedChanges()
    ? confirm('You have unsaved changes. Leave anyway?')
    : true;

// route: { path: 'profile/edit', component: EditProfileComponent, canDeactivate: [unsavedChangesGuard] }` } },
      { title: 'Feature routes file for loadChildren (with route-level providers)', html: `<p><code>providers</code> on a route create an <b>environment injector</b> for that branch: the service exists only while the admin area is loaded, and is tree-shaken out of the main bundle.</p>`,
        code: { lang: 'ts', code: `import { Routes } from '@angular/router';
import { AdminStore } from './admin.store';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    providers: [AdminStore],                 // scoped to /admin/**
    loadComponent: () => import('./admin-shell.component').then(m => m.AdminShellComponent),
    children: [
      { path: 'users', loadComponent: () => import('./users.component').then(m => m.UsersComponent) },
      { path: 'users/:userId', loadComponent: () => import('./user-edit.component').then(m => m.UserEditComponent) },
      { path: '', redirectTo: 'users', pathMatch: 'full' },
    ],
  },
];` } },
      { title: 'The reused-component bug, and the reactive fix', html: `<p>Going from <code>/products/1</code> to <code>/products/2</code> keeps the same component instance (same route config). A <code>snapshot</code> read in <code>ngOnInit</code> never updates. Fix with <code>paramMap</code> + <code>switchMap</code> (cancels the old request), or with an input + <code>toObservable</code>/<code>resource</code>.</p>`,
        code: { lang: 'ts', code: `import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { map, switchMap } from 'rxjs';
import { ProductApi } from './product.api';

@Component({
  selector: 'app-product-page',
  standalone: true,
  imports: [AsyncPipe],
  template: \`@if (product$ | async; as p) { <h1>{{ p.name }}</h1> } @else { <p>Loading…</p> }\`,
})
export class ProductPageComponent {
  private route = inject(ActivatedRoute);
  private api = inject(ProductApi);

  // BUG version: const id = this.route.snapshot.paramMap.get('id'); (read once, never updates)
  product$ = this.route.paramMap.pipe(
    map(params => params.get('id')!),
    switchMap(id => this.api.getById(id)),   // switchMap cancels the in-flight request for the old id
  );
}` } }
    ],
    deepDive: `<p>🟣 <b>The navigation pipeline.</b> Each navigation goes through: <code>NavigationStart</code> → apply redirects / match (runs <code>canMatch</code>, loads <code>loadChildren</code>) → <code>RoutesRecognized</code> → <code>GuardsCheckStart</code> (<code>canDeactivate</code> of the old tree first, then <code>canActivateChild</code>/<code>canActivate</code> top-down) → <code>ResolveStart</code> (resolvers run in parallel) → activate (create/reuse components) → <code>NavigationEnd</code>. Any guard returning a UrlTree produces <code>NavigationCancel</code> and a new navigation. Newer versions also support <code>withViewTransitions()</code> for animated route changes using the View Transitions API.</p>
      <p>🟣 <b>canActivate vs canMatch.</b> canActivate runs after the route has matched; with <code>loadChildren</code> the router may already have loaded the chunk. canMatch is evaluated during matching, so a false result lets a <i>different</i> route with the same path match (e.g. two <code>dashboard</code> routes, one for admins, one for users) and keeps code off non-authorized devices. Remember guards are UX, not security: the server must still check every API call.</p>
      <p>🟣 <b>Resolvers trade-off.</b> Resolvers block the navigation, so a slow API freezes the old page. Many teams prefer navigating immediately and showing a skeleton (data loaded in the component via a store or <code>resource()</code>). Use resolvers for small, critical data or when SSR needs the data before rendering. A resolver that errors cancels navigation unless you catch and return a fallback or a redirect.</p>
      <p>🟣 <b>Route reuse.</b> The default <code>RouteReuseStrategy</code> reuses the instance when the route config is the same. You can provide a custom strategy (e.g. to keep a list page alive when going to detail and back), or set <code>onSameUrlNavigation: 'reload'</code> with <code>runGuardsAndResolvers</code> to re-run resolvers on the same URL.</p>
      <p>🟣 <b>Bundle reality.</b> Each <code>import()</code> becomes a separate chunk with esbuild (the default builder since v17). Shared code is split into common chunks. Check with <code>ng build --stats-json</code> and a bundle analyzer, and set budgets in <code>angular.json</code> to fail the build when the initial bundle grows.</p>`,
    aiEra: `<p>🤖 AI assistants generate route tables quickly, but they often produce <b>pre-v15 patterns</b>: <code>RouterModule.forRoot</code> in an NgModule, class guards implementing <code>CanActivate</code>, or <code>ActivatedRoute.snapshot</code> reads that break on reuse. Ask explicitly for "standalone, provideRouter, functional guards, withComponentInputBinding, signal inputs". Review the order of routes (wildcard last, <code>pathMatch: 'full'</code> on empty redirects) and check that sensitive features use canMatch. In interviews, be ready to explain <i>why</i> a guard is not a security boundary and why switchMap matters for params — that is where reviewers find out if you understand the router or just pasted it. Tools like the Angular CLI MCP server and <code>ng generate</code> schematics can scaffold guards and resolvers in the modern style; use them and then read every line.</p>`,
    problems: [{
      title: 'Write a Tiny Route Matcher (first match wins, params, wildcard)',
      level: 'Medium', tags: ['router', 'matching', 'params'], companies: ['Google', 'Microsoft'],
      statement: `<p>Implement <code>match(routes, url)</code> that mimics the Angular router for flat routes. Each route has a <code>path</code> like <code>'products/:id'</code>, <code>''</code> or <code>'**'</code>. Return <code>{ path, params }</code> for the <b>first</b> route whose segments all match (literal equal, or <code>:name</code> captures any one segment), or <code>null</code>. The empty path matches only the empty URL (full match). <code>**</code> matches anything.</p>`,
      constraints: `URL has no query string. Segments split on <code>/</code>, empty segments ignored. At most 50 routes.`,
      example: `<p>Routes <code>['', 'products', 'products/new', 'products/:id', '**']</code>. URL <code>/products/new</code> gives ${H.c('g', "'products/new'")} because it appears <b>before</b> <code>products/:id</code>. URL <code>/products/7</code> gives ${H.c('g', "'products/:id' with { id: '7' }")}. URL <code>/x/y</code> gives ${H.c('y', "'**'")}.</p>`,
      brute: { why: `<p>A tempting shortcut is to pick the route with the most matching characters (a "best match"). Angular does not do that: it is strictly first-match in config order, which is why you must put specific routes first. "Best match" also behaves differently from the real router and hides config bugs.</p>`,
        code: { lang: 'js', run: true, code: `// Wrong model: longest common prefix wins (not how Angular works)
function matchBrute(routes, url) {
  let best = null, bestLen = -1;
  for (const r of routes) {
    let n = 0;
    while (n < r.length && n < url.length - 1 && r[n] === url[n + 1]) n++;
    if (n > bestLen) { bestLen = n; best = r; }
  }
  return best;
}
console.log(matchBrute(['', 'products', 'products/:id', '**'], '/products/7')); // 'products/' prefix wins, params never captured` } },
      mcq: { q: 'Routes are <code>[\'products/:id\', \'products/new\']</code>. What does <code>/products/new</code> render?', options: ['The "new" page, because a literal match is preferred', 'The detail page with id = "new"', 'Nothing, it is ambiguous'], answer: 1, explain: 'First match wins in config order, so <code>:id</code> captures "new". Put <code>products/new</code> first.' },
      hints: [
        `<p>Hint 1: split both the route path and the URL into segments; a route can only match if the segment counts are equal (except <code>**</code>).</p>`,
        `<p>Hint 2: walk segments in parallel. A segment starting with <code>:</code> stores the URL segment under that name; otherwise the strings must be equal.</p>`,
        `<p>Hint 3: return on the first success. Empty path: zero segments equals zero segments, so it works naturally as a full match.</p>`
      ],
      solution: {
        approach: `<p>Scan routes in order. For each, compare segment arrays: equal length, and each pattern segment is either a param (capture) or the identical literal. Wildcard short-circuits. This is exactly why config order is a correctness concern.</p>`,
        code: { lang: 'js', run: true, code: `function match(routes, url) {
  const segs = url.split('/').filter(Boolean);
  for (const path of routes) {
    if (path === '**') return { path, params: {} };
    const ps = path.split('/').filter(Boolean);
    if (ps.length !== segs.length) continue;      // full match only (flat routes)
    const params = {};
    let ok = true;
    for (let i = 0; i < ps.length; i++) {
      if (ps[i].startsWith(':')) params[ps[i].slice(1)] = decodeURIComponent(segs[i]);
      else if (ps[i] !== segs[i]) { ok = false; break; }
    }
    if (ok) return { path, params };
  }
  return null;
}

const routes = ['', 'products', 'products/new', 'products/:id', 'users/:uid/orders/:oid', '**'];
for (const u of ['/', '/products', '/products/new', '/products/7', '/users/3/orders/9', '/x/y']) {
  console.log(u.padEnd(20), JSON.stringify(match(routes, u)));
}` },
        complexity: `<p>O(R × S) for R routes and S segments. The real router also handles nested children, matrix params, redirects, <code>canMatch</code> and custom <code>UrlMatcher</code> functions.</p>`,
        followUps: ['How would you support child routes with a prefix match?', 'How would canMatch change the loop?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 2 — Reactive vs template-driven forms (typed forms)
     ===================================================================== */
  topics.push({
    title: 'Forms: Reactive vs Template-Driven, Typed Forms & the Control Tree',
    analogy: `<p>Two ways to run a <b>restaurant order</b>. In a small café the waiter just writes on the paper pad at the table (template-driven: the form lives in the HTML and Angular builds the model behind the scenes). In a big kitchen there is a <b>central order system</b> on a screen (reactive: the model is built in code first, and the HTML only displays it). The paper pad is quick for a two-item order. The central system is what you want when orders have rules, change live, and many cooks must agree on the same truth.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> Every Angular form is a tree of <b>controls</b>. A <code>FormControl</code> holds one value (an input). A <code>FormGroup</code> holds named controls (an object). A <code>FormArray</code> holds a list of controls. Each control tracks its <b>value</b>, <b>status</b> (<code>VALID</code>, <code>INVALID</code>, <code>PENDING</code>, <code>DISABLED</code>), and interaction flags (<code>touched</code>/<code>untouched</code>, <code>dirty</code>/<code>pristine</code>). The two form styles only differ in <b>who builds that tree</b>.</p>
      ${H.table(['', 'Template-driven (<code>FormsModule</code>)', 'Reactive (<code>ReactiveFormsModule</code>)'], [
        ['Who builds the controls', 'Angular, from <code>ngModel</code> directives in the template', 'You, in TypeScript (<code>FormGroup</code>, <code>FormBuilder</code>)'],
        ['Data flow', 'Two-way binding <code>[(ngModel)]</code>, updates are <b>async</b> (next tick)', 'Explicit and <b>synchronous</b>: <code>form.value</code> is current right after <code>setValue</code>'],
        ['Validation', 'Attributes: <code>required</code>, <code>minlength</code>, custom validator directives', 'Functions passed to controls: <code>Validators.required</code>, custom fns'],
        ['Dynamic fields', 'Awkward', 'Easy: <code>FormArray.push()</code>, <code>addControl()</code>'],
        ['Testing', 'Needs the DOM / TestBed', 'Plain unit tests on the model'],
        ['Typing', 'Loose', '<b>Strictly typed</b> since Angular 14'],
        ['Good for', 'Login, newsletter, small simple forms', 'Checkout, multi-step wizards, dynamic, cross-field rules']
      ])}
      <p>🔵 <b>Typed reactive forms (v14+).</b> <code>new FormControl('')</code> is typed <code>FormControl&lt;string | null&gt;</code>, because <code>reset()</code> sets it back to <code>null</code> by default. Add <code>{ nonNullable: true }</code> (or use <code>inject(NonNullableFormBuilder)</code> / <code>fb.nonNullable.group(...)</code>) and <code>reset()</code> returns to the <i>initial</i> value instead, so the type is plain <code>string</code>.</p>
      ${H.table(['Expression', 'Type'], [
        ['<code>form.value</code>', '<code>Partial&lt;{ email: string; age: number }&gt;</code> — disabled controls are left out!'],
        ['<code>form.getRawValue()</code>', '<code>{ email: string; age: number }</code> — includes disabled controls'],
        ['<code>form.controls.email</code>', '<code>FormControl&lt;string&gt;</code> (typed access, prefer over <code>form.get(\'email\')</code>)'],
        ['<code>UntypedFormGroup</code>', 'Escape hatch used by the migration for old code']
      ])}
      <p>🔵 <b>Connecting to the template.</b> <code>[formGroup]="form"</code> on the <code>&lt;form&gt;</code>, <code>formControlName="email"</code> on inputs, <code>formGroupName</code>/<code>formArrayName</code> for nesting. <code>(ngSubmit)</code> fires on submit. The link between control and DOM element is a <b>ControlValueAccessor</b> (CVA): a small adapter with <code>writeValue</code>, <code>registerOnChange</code>, <code>registerOnTouched</code>, <code>setDisabledState</code>. Built-in ones exist for input, checkbox, select, radio; you write your own to make a custom component (star rating, date picker) work with <code>formControlName</code>.</p>
      <p>🔵 <b>Observing changes.</b> <code>valueChanges</code> and <code>statusChanges</code> are Observables; since v18 <code>control.events</code> is a single stream of <code>ValueChangeEvent</code>, <code>StatusChangeEvent</code>, <code>TouchedChangeEvent</code>, <code>PristineChangeEvent</code>, <code>FormSubmittedEvent</code>, <code>FormResetEvent</code>. To use them with signals: <code>toSignal(form.valueChanges, { initialValue: form.getRawValue() })</code>. Angular also has <b>Signal Forms</b> (<code>@angular/forms/signals</code>, experimental since v21) where a form is derived from a <code>signal</code> model; know it exists, but reactive forms remain the production default in 2026 interviews.</p>
      <p>🔵 <b>Disable correctly.</b> Use <code>control.disable()</code> or <code>new FormControl({ value: 'x', disabled: true })</code>, not the HTML <code>[disabled]</code> attribute on a reactive input (Angular warns about it). Disabled controls are excluded from <code>value</code> and from validation.</p>`,
    clues: [
      '"Fields are added and removed at runtime (add another address / phone)" → reactive form with <code>FormArray</code>',
      '"Password and confirm must match / end date after start date" → cross-field validator on the <code>FormGroup</code>',
      '"Make my custom star-rating component work with formControlName" → implement <code>ControlValueAccessor</code> + <code>NG_VALUE_ACCESSOR</code>',
      '"form.value is missing a field" → that control is disabled; use <code>getRawValue()</code>',
      '"After reset() my string field became null" → use <code>nonNullable</code> controls / <code>NonNullableFormBuilder</code>',
      '"Small login form, quick to build" → template-driven with <code>ngModel</code> is fine'
    ],
    code: [
      { lang: 'ts', title: 'Typed reactive checkout form with FormArray and nonNullable builder', code: `import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, NonNullableFormBuilder, Validators, FormArray, FormControl } from '@angular/forms';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: \`
    <form [formGroup]="form" (ngSubmit)="submit()">
      <input formControlName="email" type="email" placeholder="Email" />
      @if (form.controls.email.touched && form.controls.email.hasError('email')) {
        <small>Enter a valid email.</small>
      }
      <div formGroupName="address">
        <input formControlName="street" placeholder="Street" />
        <input formControlName="zip" placeholder="ZIP" />
      </div>
      <div formArrayName="phones">
        @for (ctrl of phones.controls; track $index) {
          <input [formControlName]="$index" placeholder="Phone" />
          <button type="button" (click)="phones.removeAt($index)">x</button>
        }
      </div>
      <button type="button" (click)="addPhone()">Add phone</button>
      <button type="submit" [disabled]="form.invalid || form.pending">Pay</button>
    </form>
  \`,
})
export class CheckoutComponent {
  private fb = inject(NonNullableFormBuilder);   // every control is nonNullable: reset() -> initial value

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    address: this.fb.group({
      street: ['', Validators.required],
      zip: ['', [Validators.required, Validators.pattern(/^\\d{5}$/)]],
    }),
    phones: this.fb.array<FormControl<string>>([]),
  });

  get phones(): FormArray<FormControl<string>> { return this.form.controls.phones; }

  addPhone(): void { this.phones.push(this.fb.control('', Validators.required)); }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }  // reveal all errors
    // Fully typed: { email: string; address: { street: string; zip: string }; phones: string[] }
    const order = this.form.getRawValue();
    console.log(order.address.zip);
  }
}` },
      { lang: 'ts', title: 'Template-driven login form with ngModel', code: `import { Component } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: \`
    <form #f="ngForm" (ngSubmit)="login(f)">
      <input name="email" [(ngModel)]="model.email" required email #email="ngModel" />
      @if (email.invalid && email.touched) { <small>Valid email required</small> }
      <input name="password" type="password" [(ngModel)]="model.password" required minlength="8" />
      <button [disabled]="f.invalid">Log in</button>
    </form>
  \`,
})
export class LoginComponent {
  model = { email: '', password: '' };   // the "source of truth" is this plain object
  login(f: NgForm): void {
    if (f.valid) console.log('logging in', this.model.email);
  }
}` }
    ],
    viz: {
      title: 'Control tree: value, status and flags bubble up',
      input: 'email=a@b.co zip=12 street=Main',
      inputLabel: 'Typed values in order (name=value). zip needs 5 digits; email needs @',
      gen: function (input) {
        var steps = words(input, 8, 'Format: email=a@b.co zip=12345 street=Main');
        var vals = { email: '', street: '', zip: '' };
        function check(v) {
          return {
            email: !v.email ? 'required' : (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email) ? 'ok' : 'email'),
            street: v.street ? 'ok' : 'required',
            zip: !v.zip ? 'required' : (/^\d{5}$/.test(v.zip) ? 'ok' : 'pattern')
          };
        }
        var frames = [];
        function snap(narr, cur, dirty) {
          var e = check(vals);
          var addr = e.street === 'ok' && e.zip === 'ok' ? 'VALID' : 'INVALID';
          var root = addr === 'VALID' && e.email === 'ok' ? 'VALID' : 'INVALID';
          var hl = {}; if (cur) hl[cur] = 'cur';
          frames.push({ narr: narr, parts: [
            { type: 'tree', label: 'FormGroup tree', arr: ['form: ' + root, 'email: ' + (e.email === 'ok' ? 'VALID' : 'INVALID'), 'address: ' + addr, null, null, 'street: ' + (e.street === 'ok' ? 'VALID' : 'INVALID'), 'zip: ' + (e.zip === 'ok' ? 'VALID' : 'INVALID')], hl: (function () { var h = {}; h[0] = root === 'VALID' ? 'ok' : 'bad'; h[2] = addr === 'VALID' ? 'ok' : 'bad'; if (cur === 'email') h[1] = 'cur'; if (cur === 'street') h[5] = 'cur'; if (cur === 'zip') h[6] = 'cur'; return h; })() },
            { type: 'map', label: 'errors per control', entries: [['email', e.email === 'ok' ? 'null' : '{ ' + e.email + ': true }'], ['address.street', e.street === 'ok' ? 'null' : '{ required: true }'], ['address.zip', e.zip === 'ok' ? 'null' : '{ ' + e.zip + ' }']], hl: hl },
            { type: 'vars', label: 'form flags', vals: { dirty: dirty, valid: root === 'VALID', 'value.address.zip': JSON.stringify(vals.zip) } }
          ] });
        }
        snap('A fresh form: every control is <b>pristine</b> and <b>untouched</b>. Required fields are empty, so each leaf is INVALID and the status <b>bubbles up</b>: one invalid child makes its parent invalid.', null, false);
        steps.forEach(function (s) {
          var kv = s.split('='), k = kv[0], v = kv.slice(1).join('=');
          if (!(k in vals)) throw new Error('Unknown field "' + k + '". Use email, street or zip.');
          vals[k] = v.slice(0, 30);
          var e = check(vals)[k];
          snap('User types <code>' + H.esc(vals[k]) + '</code> into <b>' + k + '</b>. Validators run synchronously on that control, then the parent and the root recompute status. ' + (e === 'ok' ? 'This control is now VALID.' : 'Error object: <code>{ ' + e + ' }</code>.'), k, true);
        });
        snap('Submitting? Call <code>markAllAsTouched()</code> if invalid so every error message shows. The submit button should use <code>[disabled]="form.invalid || form.pending"</code>.', null, true);
        return pad4(frames);
      }
    },
    examples: [
      { title: 'A ControlValueAccessor for a star rating', html: `<p>Implement the four CVA methods and register with <code>NG_VALUE_ACCESSOR</code> (multi). Now <code>&lt;app-stars formControlName="rating" /&gt;</code> works like a native input, including disable and touched.</p>`,
        code: { lang: 'ts', code: `import { Component, forwardRef, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-stars',
  standalone: true,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => StarsComponent), multi: true }],
  template: \`
    @for (n of [1, 2, 3, 4, 5]; track n) {
      <button type="button" [disabled]="disabled()" (click)="pick(n)" (blur)="onTouched()"
              [attr.aria-pressed]="n <= value()">{{ n <= value() ? '★' : '☆' }}</button>
    }
  \`,
})
export class StarsComponent implements ControlValueAccessor {
  value = signal(0);
  disabled = signal(false);
  private onChange: (v: number) => void = () => {};
  onTouched: () => void = () => {};

  writeValue(v: number | null): void { this.value.set(v ?? 0); }          // model -> view
  registerOnChange(fn: (v: number) => void): void { this.onChange = fn; } // view -> model
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(d: boolean): void { this.disabled.set(d); }

  pick(n: number): void { this.value.set(n); this.onChange(n); this.onTouched(); }
}` } },
      { title: 'Turning form state into signals', html: `<p>Bridge RxJS streams from the form into signals so templates and <code>computed</code>s stay OnPush-friendly.</p>`,
        code: { lang: 'ts', code: `import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-price',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: \`<input type="number" [formControl]="form.controls.qty" /> Total: {{ total() }}\`,
})
export class PriceComponent {
  form = inject(NonNullableFormBuilder).group({ qty: 1, price: 9.5 });
  private value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  total = computed(() => (this.value().qty ?? 0) * (this.value().price ?? 0));
}` } },
      { title: 'value vs getRawValue with a disabled control', html: `<p>A frequent bug: a field disabled for display "disappears" from the payload.</p>
        ${H.table(['Call', 'Result'], [['<code>form.value</code>', '<code>{ name: "Ann" }</code> — <span class="c-r">country missing</span>'], ['<code>form.getRawValue()</code>', '<code>{ name: "Ann", country: "IN" }</code>']])}`,
        code: { lang: 'ts', code: `import { FormControl, FormGroup } from '@angular/forms';

const form = new FormGroup({
  name: new FormControl('Ann', { nonNullable: true }),
  country: new FormControl({ value: 'IN', disabled: true }, { nonNullable: true }),
});
console.log(form.value);          // { name: 'Ann' }
console.log(form.getRawValue());  // { name: 'Ann', country: 'IN' }` } }
    ],
    deepDive: `<p>🟣 <b>Update timing.</b> <code>updateOn: 'change' | 'blur' | 'submit'</code> (per control or group) decides when value and validation update. <code>'blur'</code> is great for expensive or async validation. <code>setValue</code> demands every key; <code>patchValue</code> accepts a subset. Both take <code>{ emitEvent: false }</code> to avoid triggering <code>valueChanges</code> (useful to avoid loops when two fields sync each other).</p>
      <p>🟣 <b>Why template-driven is async.</b> <code>NgModel</code> registers its control with the parent <code>NgForm</code> in a resolved promise, and writes values in the next microtask, to avoid "changed after checked" errors. That is why <code>@ViewChild(NgForm)</code> reads right after init can show an empty value. Reactive forms are created synchronously in the class, so they are deterministic and easy to unit test.</p>
      <p>🟣 <b>Performance.</b> Every keystroke runs validators up the tree and emits <code>valueChanges</code> on each ancestor. For giant forms (hundreds of controls): use <code>updateOn: 'blur'</code>, split into sub-components with OnPush, avoid heavy work in <code>valueChanges</code> subscribers (debounce), and render big FormArrays with virtual scroll (CDK). With zone.js every input event also triggers change detection for the app; OnPush + signals limit what is checked.</p>
      <p>🟣 <b>Typed forms gotchas.</b> <code>FormRecord&lt;FormControl&lt;boolean&gt;&gt;</code> is for dynamic keys. <code>FormGroup</code> with optional controls must declare them optional in the type to use <code>removeControl</code>. <code>form.get('a.b')</code> returns <code>AbstractControl | null</code> — prefer <code>form.controls.a.controls.b</code>.</p>`,
    aiEra: `<p>🤖 AI tools are good at turning a JSON schema or an API DTO into a typed <code>FormGroup</code> plus template, which saves the boring part. Watch for three common AI mistakes: using <code>UntypedFormGroup</code> or <code>any</code> (losing type safety), binding <code>[disabled]</code> on reactive inputs, and forgetting <code>markAllAsTouched()</code> so errors never show. Also check accessibility: every input needs a <code>&lt;label&gt;</code>, errors should be linked with <code>aria-describedby</code>. Schema-driven "dynamic form" generators (formly-style) are another place where AI helps: you describe fields, it generates config. In interviews, still be able to hand-write a FormArray and a CVA in ten minutes; that is a very common Angular machine-coding task.</p>`,
    problems: [{
      title: 'Model a Typed Form Group: value vs raw value, status bubbling',
      level: 'Easy', tags: ['forms', 'form group', 'status'], companies: ['Infosys', 'Accenture', 'Microsoft'],
      statement: `<p>Write a tiny model of Angular controls: <code>control(value, validators, disabled)</code> and <code>group(children)</code>. Implement <code>status(node)</code> (<code>'VALID' | 'INVALID' | 'DISABLED'</code>), <code>value(node)</code> (skips disabled children, like <code>form.value</code>) and <code>raw(node)</code> (like <code>getRawValue()</code>). A group is INVALID if any enabled child is INVALID; DISABLED if all children are disabled.</p>`,
      constraints: `Validators are functions returning an error object or <code>null</code>. Groups nest up to 3 levels.`,
      example: `<p>Group <code>{ name: 'Ann' (required), country: 'IN' (disabled) }</code>: status ${H.c('g', 'VALID')}, value <code>{ name: 'Ann' }</code>, raw <code>{ name: 'Ann', country: 'IN' }</code>.</p>`,
      brute: { why: `<p>Treating the form as a flat object and validating only on submit misses the core behaviour: status is computed per node and propagates up, and disabled controls are excluded from both validation and <code>value</code>.</p>`,
        code: { lang: 'js', run: true, code: `// Flat validation: ignores disabled and nesting
function validateFlat(obj, rules) {
  return Object.keys(rules).every(k => rules[k](obj[k]) === null);
}
const required = v => (v ? null : { required: true });
console.log(validateFlat({ name: 'Ann', country: '' }, { name: required, country: required })); // false, but country is disabled in the real form` } },
      mcq: { q: 'A group has one disabled control with an empty required value and one valid enabled control. What is the group status?', options: ['INVALID', 'VALID', 'DISABLED', 'PENDING'], answer: 1, explain: 'Disabled controls are skipped in validation, so only the enabled valid control counts.' },
      hints: [
        `<p>Hint 1: write <code>status</code> recursively: a leaf runs its validators; a group looks at its children.</p>`,
        `<p>Hint 2: filter out disabled children first, both for status and for <code>value</code>.</p>`,
        `<p>Hint 3: <code>raw</code> is the same walk without the filter. Edge case: a group whose children are all disabled is itself DISABLED.</p>`
      ],
      solution: {
        approach: `<p>Recursive walk. Leaves: disabled → DISABLED, else first validator error → INVALID, else VALID. Groups: enabled children only; if none, DISABLED; if any INVALID, INVALID. Same structure for value (filtered) and raw (unfiltered).</p>`,
        code: { lang: 'js', run: true, code: `const control = (value, validators = [], disabled = false) => ({ kind: 'c', value, validators, disabled });
const group = (children) => ({ kind: 'g', children });
const required = v => (v === '' || v == null ? { required: true } : null);
const minLen = n => v => (String(v).length < n ? { minlength: { requiredLength: n } } : null);

function isDisabled(node) { return status(node) === 'DISABLED'; }
function status(node) {
  if (node.kind === 'c') {
    if (node.disabled) return 'DISABLED';
    return node.validators.some(fn => fn(node.value) !== null) ? 'INVALID' : 'VALID';
  }
  const enabled = Object.values(node.children).filter(c => !isDisabled(c));
  if (!enabled.length) return 'DISABLED';
  return enabled.some(c => status(c) === 'INVALID') ? 'INVALID' : 'VALID';
}
function value(node) {
  if (node.kind === 'c') return node.value;
  const out = {};
  for (const [k, c] of Object.entries(node.children)) if (!isDisabled(c)) out[k] = value(c);
  return out;
}
function raw(node) {
  if (node.kind === 'c') return node.value;
  const out = {};
  for (const [k, c] of Object.entries(node.children)) out[k] = raw(c);
  return out;
}

const form = group({
  name: control('Ann', [required]),
  country: control('', [required], true),
  address: group({ zip: control('123', [required, minLen(5)]) }),
});
console.log(status(form), JSON.stringify(value(form)), JSON.stringify(raw(form)));
form.children.address.children.zip.value = '12345';
console.log(status(form));` },
        complexity: `<p>O(n) per status computation over n controls. Angular caches status on each control and only recomputes the path from a changed control up to the root.</p>`,
        followUps: ['How does PENDING (async validators) change the rules?', 'Why does Angular recompute only the ancestors of a changed control?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 3 — Validators: sync, async, custom, cross-field
     ===================================================================== */
  topics.push({
    title: 'Validators: Built-in, Custom, Cross-Field and Async',
    analogy: `<p>Think of <b>airport security</b>. Some checks are instant and done right at the desk: "Is the passport there? Is the name spelled right?" (sync validators). One check needs a phone call to another office: "Is this person on a no-fly list?" (async validator). While that call is in progress you are <b>waiting</b> (PENDING). Nobody makes the phone call if your passport is missing: the desk checks first. And some rules compare two documents together: "Does the boarding pass name match the passport?" (cross-field validator).</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> A validator is a <b>function</b> that receives a control and returns either <code>null</code> (all good) or an <b>error object</b> like <code>{ required: true }</code> or <code>{ minlength: { requiredLength: 8, actualLength: 3 } }</code>. Angular merges the errors of all validators into <code>control.errors</code> and sets the status.</p>
      ${H.table(['Type', 'Signature', 'Returns', 'Example'], [
        ['Sync <code>ValidatorFn</code>', '<code>(c: AbstractControl) =&gt; ValidationErrors | null</code>', 'Immediately', '<code>Validators.required</code>, <code>min</code>, <code>max</code>, <code>email</code>, <code>pattern</code>, <code>minLength</code>, <code>requiredTrue</code>'],
        ['Async <code>AsyncValidatorFn</code>', '<code>(c) =&gt; Observable&lt;ValidationErrors | null&gt; | Promise&lt;...&gt;</code>', 'Later (status <code>PENDING</code> meanwhile)', '"Is this username taken?"'],
        ['Group (cross-field)', 'Same <code>ValidatorFn</code>, placed on the <b>FormGroup</b>', 'Error on the group', '"passwords match", "end ≥ start"']
      ])}
      <p>🔵 <b>Order of execution.</b> When a value changes Angular runs <b>all sync validators</b> first. Only if they all pass does it run the <b>async validators</b>, setting status to <code>PENDING</code>. If the value changes again before the async result arrives, Angular <b>unsubscribes</b> from the previous async Observable (so a stale "taken" never overwrites a newer answer). The async Observable must <b>complete</b> (e.g. an HTTP call, or add <code>take(1)</code>/<code>first()</code>), otherwise the control stays PENDING forever.</p>
      <p>🔵 <b>Custom validator factory.</b> A validator with settings is a function that returns a <code>ValidatorFn</code>:</p>
      ${H.kv([['forbiddenName(/admin/i)', 'returns (c) =&gt; /admin/i.test(c.value) ? { forbiddenName: { value: c.value } } : null'], ['strongPassword()', 'returns errors like { missingDigit: true, tooShort: true }']], { label: 'factories' })}
      <p>🔵 <b>Cross-field validators</b> go on the parent group: <code>fb.group({...}, { validators: [matchFields('password', 'confirm')] })</code>. The error lands on the <b>group</b> (<code>form.errors?.mismatch</code>), so show the message near the confirm field with <code>@if (form.hasError('mismatch') &amp;&amp; form.controls.confirm.touched)</code>. Some teams also call <code>setErrors</code> on the child, but then they must clear it carefully; keeping the error on the group is simpler and correct.</p>
      <p>🔵 <b>Dynamic validators.</b> <code>addValidators</code>, <code>removeValidators</code>, <code>setValidators</code>, <code>hasValidator</code>, followed by <code>updateValueAndValidity()</code> (Angular does not re-run validation automatically when you change the list). Example: "company name is required only when account type is business".</p>
      <p>🔵 <b>Template-driven custom validators</b> are directives that implement <code>Validator</code> (or <code>AsyncValidator</code>) and provide <code>NG_VALIDATORS</code> (or <code>NG_ASYNC_VALIDATORS</code>) with <code>multi: true</code>, so you can write <code>&lt;input ngModel appForbidden="admin"&gt;</code>.</p>`,
    clues: [
      '"Check if the username/email is already taken" → async validator with debounce, switchMap-style cancel, and <code>updateOn: \'blur\'</code> or a timer',
      '"Confirm password must match" / "date range" → validator on the <b>FormGroup</b>, not on one control',
      '"Field required only if checkbox is ticked" → <code>addValidators</code>/<code>removeValidators</code> + <code>updateValueAndValidity()</code>',
      '"Form stays PENDING forever / submit button never enables" → async validator Observable never completes',
      '"Show only one error message at a time" → check errors in priority order (required before pattern)',
      '"Reusable validation for template-driven forms" → directive providing <code>NG_VALIDATORS</code>'
    ],
    code: [
      { lang: 'ts', title: 'Custom sync, cross-field and async validators', code: `import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  AbstractControl, AsyncValidatorFn, ValidationErrors, ValidatorFn,
} from '@angular/forms';
import { Observable, catchError, map, of, timer, switchMap } from 'rxjs';

// 1) Parameterised sync validator (factory returns a ValidatorFn).
export function strongPassword(minLength = 8): ValidatorFn {
  return (c: AbstractControl): ValidationErrors | null => {
    const v: string = c.value ?? '';
    if (!v) return null;                       // let Validators.required handle empty
    const errors: ValidationErrors = {};
    if (v.length < minLength) errors['tooShort'] = { min: minLength, actual: v.length };
    if (!/\\d/.test(v)) errors['missingDigit'] = true;
    if (!/[A-Z]/.test(v)) errors['missingUpper'] = true;
    return Object.keys(errors).length ? errors : null;
  };
}

// 2) Cross-field validator: put it on the FormGroup.
export function matchFields(a: string, b: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const x = group.get(a)?.value, y = group.get(b)?.value;
    return x && y && x !== y ? { mismatch: { a, b } } : null;
  };
}

// 3) Async validator: debounced server check that always completes.
@Injectable({ providedIn: 'root' })
export class UsernameValidator {
  private http = inject(HttpClient);

  unique(): AsyncValidatorFn {
    return (c: AbstractControl): Observable<ValidationErrors | null> =>
      // Angular unsubscribes from the previous call when the value changes, so the
      // timer acts as a debounce: a fast typist cancels it before the HTTP call starts.
      timer(400).pipe(
        switchMap(() => this.http.get<{ taken: boolean }>('/api/users/exists', { params: { name: c.value } })),
        map(res => (res.taken ? { usernameTaken: true } : null)),
        catchError(() => of(null)),            // network failure: don't block the user (server re-checks)
      );
  }
}` },
      { lang: 'ts', title: 'Wiring them up in a sign-up form', code: `import { Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { matchFields, strongPassword, UsernameValidator } from './validators';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: \`
    <form [formGroup]="form" (ngSubmit)="save()">
      <label>Username <input formControlName="username" /></label>
      @if (form.controls.username.pending) { <small>Checking…</small> }
      @if (form.controls.username.hasError('usernameTaken')) { <small>Already taken</small> }

      <label>Password <input type="password" formControlName="password" /></label>
      @if (form.controls.password.hasError('missingDigit')) { <small>Add a digit</small> }

      <label>Confirm <input type="password" formControlName="confirm" /></label>
      @if (form.hasError('mismatch') && form.controls.confirm.touched) { <small>Passwords differ</small> }

      <button [disabled]="form.invalid || form.pending">Create account</button>
    </form>
  \`,
})
export class SignupComponent {
  private fb = inject(NonNullableFormBuilder);
  private usernames = inject(UsernameValidator);

  form = this.fb.group(
    {
      username: this.fb.control('', {
        validators: [Validators.required, Validators.minLength(3)],
        asyncValidators: [this.usernames.unique()],
        updateOn: 'blur',                                   // async check only when leaving the field
      }),
      password: ['', [Validators.required, strongPassword(10)]],
      confirm: ['', Validators.required],
    },
    { validators: [matchFields('password', 'confirm')] },  // group-level
  );

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    console.log(this.form.getRawValue());
  }
}` }
    ],
    viz: {
      title: 'Typing into a field with sync + async validators',
      input: 'a, al, alice, alice!, alice9',
      inputLabel: 'Values typed over time (comma separated). Taken names: alice, bob',
      gen: function (input) {
        var vals = String(input || '').split(',').map(function (s) { return s.trim(); });
        if (!vals.length || vals.length > 8) throw new Error('Give 1 to 8 comma-separated values, e.g. a, al, alice');
        var taken = { alice: 1, bob: 1 };
        var frames = [], pending = null, log = [];
        vals.forEach(function (v, i) {
          v = v.slice(0, 20);
          var errs = [];
          if (!v) errs.push('required');
          else if (v.length < 3) errs.push('minlength');
          if (v && !/^[a-z0-9]+$/i.test(v)) errs.push('pattern');
          if (pending !== null) log.push('unsubscribe check("' + pending + '")');
          pending = null;
          if (errs.length) {
            frames.push({ narr: 'Value <code>' + H.esc(v) + '</code>: sync validators fail (' + errs.join(', ') + '). Status <b>INVALID</b>. The async validator is <b>not called</b>: no point asking the server about an invalid value.' + (log.length ? ' Any in-flight async check was cancelled.' : ''), parts: [
              { type: 'vars', label: 'control', vals: { value: v, status: 'INVALID', errors: '{ ' + errs.join(', ') + ' }' }, hl: { status: 'bad' } },
              { type: 'queue', label: 'async log', items: log.slice(-4) }
            ] });
          } else {
            pending = v; log.push('subscribe check("' + v + '")');
            var last = i === vals.length - 1;
            frames.push({ narr: 'Value <code>' + H.esc(v) + '</code> passes all sync validators, so Angular subscribes to the async validator and sets status <b>PENDING</b>.' + (last ? '' : ' The user keeps typing before it answers...'), parts: [
              { type: 'vars', label: 'control', vals: { value: v, status: 'PENDING', errors: 'null' }, hl: { status: 'cur' } },
              { type: 'queue', label: 'async log', items: log.slice(-4) }
            ] });
            if (last) {
              var t = !!taken[v.toLowerCase()];
              log.push('result("' + v + '") = ' + (t ? '{usernameTaken}' : 'null'));
              frames.push({ narr: 'The server answers for the <b>latest</b> value only (older checks were unsubscribed, so their answers can never arrive late and overwrite this one). ' + (t ? '<code>' + H.esc(v) + '</code> is taken: <b>INVALID</b>.' : '<code>' + H.esc(v) + '</code> is free: <b>VALID</b>.'), parts: [
                { type: 'vars', label: 'control', vals: { value: v, status: t ? 'INVALID' : 'VALID', errors: t ? '{ usernameTaken: true }' : 'null' }, hl: { status: t ? 'bad' : 'ok' } },
                { type: 'queue', label: 'async log', items: log.slice(-4) }
              ] });
            }
          }
        });
        return pad4(frames);
      }
    },
    examples: [
      { title: 'Conditional validators: required only for business accounts', html: `<p>React to one field and change another field's validators, then re-run validation.</p>`,
        code: { lang: 'ts', code: `import { DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, Validators } from '@angular/forms';

export function wireCompanyRule(form: FormGroup<{ type: FormControl<'personal' | 'business'>; company: FormControl<string> }>): void {
  const destroyRef = inject(DestroyRef);           // call from an injection context (constructor)
  form.controls.type.valueChanges.pipe(takeUntilDestroyed(destroyRef)).subscribe(type => {
    const company = form.controls.company;
    if (type === 'business') company.addValidators(Validators.required);
    else company.removeValidators(Validators.required);  // same function reference, so removal works
    company.updateValueAndValidity();                     // validators changed: recompute now
  });
}` } },
      { title: 'Template-driven validator directive', html: `<p>Wrap a validator function in a directive so <code>&lt;input ngModel appForbidden="admin"&gt;</code> works.</p>`,
        code: { lang: 'ts', code: `import { Directive, input } from '@angular/core';
import { AbstractControl, NG_VALIDATORS, ValidationErrors, Validator } from '@angular/forms';

@Directive({
  selector: '[appForbidden]',
  standalone: true,
  providers: [{ provide: NG_VALIDATORS, useExisting: ForbiddenDirective, multi: true }],
})
export class ForbiddenDirective implements Validator {
  appForbidden = input('');
  validate(c: AbstractControl): ValidationErrors | null {
    const bad = this.appForbidden();
    return bad && String(c.value ?? '').toLowerCase().includes(bad.toLowerCase())
      ? { forbidden: { word: bad } } : null;
  }
}` } },
      { title: 'One message at a time, in priority order', html: `<p>Map error keys to messages and show the first present one. Keep the map in one place so every field reads the same.</p>
        ${H.table(['errors', 'message shown'], [['<code>{ required, minlength }</code>', 'required wins: "This field is required"'], ['<code>{ minlength }</code>', '"At least 8 characters"'], ['<code>null</code>', 'nothing']])}`,
        code: { lang: 'ts', code: `import { ValidationErrors } from '@angular/forms';

const MESSAGES: Array<[string, (e: any) => string]> = [
  ['required', () => 'This field is required'],
  ['minlength', e => \`At least \${e.requiredLength} characters\`],
  ['email', () => 'Enter a valid email'],
  ['usernameTaken', () => 'That username is taken'],
];

export function firstError(errors: ValidationErrors | null): string | null {
  if (!errors) return null;
  for (const [key, fmt] of MESSAGES) if (errors[key]) return fmt(errors[key]);
  return 'Invalid value';
}` } }
    ],
    deepDive: `<p>🟣 <b>Validator composition.</b> Angular composes all sync validators with <code>Validators.compose</code> and merges their error objects; for async ones it uses <code>forkJoin</code>-like merging, which is why each async Observable must complete. Validators should be <b>pure</b> (no side effects, no setting other controls) because they run often and in an order you do not control.</p>
      <p>🟣 <b>Async timing details.</b> Angular does not debounce async validators. Options: <code>updateOn: 'blur'</code>, the <code>timer(400).pipe(switchMap(...))</code> trick (works because Angular unsubscribes on each new value), or debounce <code>valueChanges</code> yourself and call <code>setErrors</code>. While PENDING, the parent group is PENDING too, so <code>form.valid</code> is false and <code>form.invalid</code> is also false — disable submit with <code>invalid || pending</code>. Async validators fire on init too; with large forms and many async validators, prefer server-side validation on submit plus a few targeted checks.</p>
      <p>🟣 <b>Errors on submit from the server.</b> The server is the real source of truth (race: username taken between check and submit). Map server errors back with <code>control.setErrors({ server: msg })</code>; they will be cleared on the next value change because validation runs again.</p>
      <p>🟣 <b>Signal forms preview.</b> In the experimental signal-based forms API, validation is declared in a schema function (<code>required(path.email)</code>, <code>validate(path.x, ...)</code>, <code>validateAsync</code>/<code>validateHttp</code>) and errors are signals. The mental model (sync first, async pending, cross-field on the parent) stays the same.</p>`,
    aiEra: `<p>🤖 Validators are a sweet spot for AI: "write a validator that ensures IBAN format" or "end date must be after start date" produces correct code quickly, and AI can generate the unit tests (feed values, assert error objects) which matter more than the validator itself. Check the classic AI bugs: async validators that never complete (a raw <code>valueChanges</code> stream), validators that return <code>{}</code> instead of <code>null</code> (an empty object is still treated as an error object!), and regexes that reject valid real-world data (names with apostrophes, plus-addressed emails). Never rely on client validation for security; it is UX. The server must validate again.</p>`,
    problems: [{
      title: 'Run a Validator Pipeline: sync first, then async, latest wins',
      level: 'Medium', tags: ['validators', 'async', 'race conditions'], companies: ['Google', 'Deloitte'],
      statement: `<p>Simulate Angular's validation of one control. Given sync validators, one async validator (a function returning a Promise that resolves after a delay), and a timeline of typed values with timestamps, print the status after each event. Rules: sync validators run first; if any fails, status is INVALID and no async call is made; otherwise status is PENDING and the async validator starts. A new value <b>cancels</b> the in-flight async check (its result must be ignored).</p>`,
      constraints: `Up to 20 events. Async validator delay is fixed. Use plain setTimeout-based promises.`,
      example: `<p>Typing <code>al</code> (t=0) then <code>alice</code> (t=100) then <code>alicia</code> (t=200) with a 300 ms server: <code>INVALID</code>, <code>PENDING</code>, <code>PENDING</code>, then only <code>alicia → VALID</code> is applied; the alice result is ignored even though it arrives first.</p>`,
      brute: { why: `<p>Applying every async result as it arrives looks fine until results arrive out of order: the answer for an old value overwrites the answer for the current value. Angular avoids that by unsubscribing; you must do the equivalent with a request id.</p>`,
        code: { lang: 'js', run: true, code: `// Buggy: every async result is applied, even stale ones
const taken = new Set(['alice']);
const check = (v, ms) => new Promise(r => setTimeout(() => r(taken.has(v) ? 'INVALID' : 'VALID'), ms));
let status = 'VALID';
check('alice', 50).then(s => { status = s; console.log('applied alice ->', s); });
check('alicia', 10).then(s => { status = s; console.log('applied alicia ->', s); });
setTimeout(() => console.log('final (wrong, current value is alicia):', status), 80);` } },
      mcq: { q: 'While an async validator is running, what are <code>form.valid</code> and <code>form.invalid</code>?', options: ['true and false', 'false and true', 'both false', 'both true'], answer: 2, explain: 'Status is PENDING, which is neither VALID nor INVALID. That is why submit buttons check <code>invalid || pending</code>.' },
      hints: [
        `<p>Hint 1: keep a counter <code>requestId</code>. Every new value increments it.</p>`,
        `<p>Hint 2: when an async result arrives, compare the id captured at start with the current id; if different, drop it (that is "unsubscribe").</p>`,
        `<p>Hint 3: sync errors short-circuit: set INVALID and do not start the async check, but still bump the id so older checks get dropped.</p>`
      ],
      solution: {
        approach: `<p>Each value change bumps a generation counter. Run sync validators; if any error, mark INVALID. Otherwise mark PENDING and start the async check, capturing the generation. When it resolves, apply only if the generation is unchanged. This is exactly what Angular's unsubscribe (and RxJS <code>switchMap</code>) gives you.</p>`,
        code: { lang: 'js', run: true, code: `const taken = new Set(['alice', 'bob']);
const syncValidators = [
  v => (v ? null : { required: true }),
  v => (v.length >= 3 ? null : { minlength: 3 }),
];
const asyncValidator = (v, ms) =>
  new Promise(res => setTimeout(() => res(taken.has(v) ? { taken: true } : null), ms));

function createControl() {
  let gen = 0;
  const ctl = { value: '', status: 'INVALID', errors: null };
  ctl.setValue = function (v, serverMs) {
    const my = ++gen;                              // new value -> older async checks are stale
    ctl.value = v;
    const errs = syncValidators.map(fn => fn(v)).filter(Boolean);
    if (errs.length) {
      ctl.status = 'INVALID'; ctl.errors = Object.assign({}, ...errs);
      console.log('set', JSON.stringify(v), '-> INVALID', JSON.stringify(ctl.errors));
      return;
    }
    ctl.status = 'PENDING'; ctl.errors = null;
    console.log('set', JSON.stringify(v), '-> PENDING');
    asyncValidator(v, serverMs).then(err => {
      if (my !== gen) { console.log('  ignored stale result for', JSON.stringify(v)); return; }
      ctl.status = err ? 'INVALID' : 'VALID'; ctl.errors = err;
      console.log('  result for', JSON.stringify(v), '->', ctl.status);
    });
  };
  return ctl;
}

const c = createControl();
const timeline = [[0, 'al', 0], [100, 'alice', 50], [120, 'alicia', 300]];
for (const [t, v, ms] of timeline) setTimeout(() => c.setValue(v, ms), t);
setTimeout(() => console.log('final:', c.value, c.status), 600);` },
        complexity: `<p>O(V) sync work per change for V validators; one async call per change that passes sync checks. In production add a debounce so fast typing does not start a request per keystroke.</p>`,
        followUps: ['Where would you put a debounce, and why does the timer trick work with Angular?', 'How would you handle the server rejecting the username on submit anyway?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 4 — Change detection: Default vs OnPush, zone.js vs zoneless, signals
     ===================================================================== */
  var CD_TREE = ['App', 'Header', 'Page', 'Logo', 'Cart', 'List', 'Chart'];
  topics.push({
    title: 'Change Detection: Default vs OnPush, zone.js vs Zoneless, and Signals',
    analogy: `<p>Imagine a <b>school inspector</b>. The old way: every time <i>anything</i> happens anywhere in town (a bell rings, a door opens), the inspector walks through <b>every classroom</b> in every school to see if something changed (Default change detection driven by zone.js). It works, but most visits are wasted. The smarter way: classrooms hang a <b>"please check me" flag</b> on the door when something really changed, and the inspector only visits flagged rooms and the corridor leading to them (OnPush). The newest way: each blackboard has a <b>tiny sensor</b> that tells the inspector exactly which board changed, and nobody needs to listen to every bell in town at all (signals + zoneless).</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> Change detection (CD) is how Angular keeps the screen in sync with your data. Angular compiles each template into code that, when "checked", reads every binding (<code>{{ total }}</code>, <code>[disabled]="busy"</code>) and updates the DOM if a value changed. Two questions decide performance: <b>when</b> does a check start, and <b>which components</b> are checked?</p>
      ${H.table(['', 'When does CD run?', 'What is checked?'], [
        ['Default + zone.js', 'After <b>any</b> async event zone.js patched: click, input, <code>setTimeout</code>, XHR/fetch, Promise', 'The <b>whole</b> component tree, top-down'],
        ['OnPush + zone.js', 'Same triggers', 'Skips an OnPush component (and its subtree) unless it is <b>marked dirty</b>'],
        ['Zoneless (signals / events / markForCheck)', 'Only when Angular is <b>notified</b>: a signal read in a template changed, a template event fired, <code>markForCheck</code>, async pipe emission, input change', 'Dirty components; with signals, only the views that read the changed signal']
      ])}
      <p>🔵 <b>What marks an OnPush component dirty?</b></p>
      <ol>
        <li>An <b>@Input reference changed</b> (compared with <code>===</code>; mutating an array in place does <i>not</i> count).</li>
        <li>An <b>event handler in its template</b> (or its children) ran, e.g. <code>(click)</code>.</li>
        <li>The <code>async</code> pipe received a new value (it calls <code>markForCheck</code>).</li>
        <li>A <b>signal read in its template</b> changed.</li>
        <li>You called <code>ChangeDetectorRef.markForCheck()</code> manually.</li>
      </ol>
      <p>Marking dirty walks <b>up</b> to the root (so the path to the component is checked), then the next CD pass goes <b>down</b> and checks the dirty path only.</p>
      <p>🔵 <b>zone.js</b> monkey-patches browser async APIs so Angular knows "something async finished, maybe data changed". It is convenient but costs bundle size (~30 KB), makes stack traces noisy, triggers CD for events that change nothing (a scroll listener, a third-party library's timers), and does not understand native <code>async/await</code> without down-levelling. <b>Zoneless</b> was experimental in v18, developer preview in v19, <b>stable in v20</b> (<code>provideZonelessChangeDetection()</code>) and is the <b>default for new apps from v21</b>. In zoneless mode, code that changes a plain field inside a <code>setTimeout</code> will <b>not</b> update the screen; use a signal or <code>markForCheck()</code>.</p>
      <p>🔵 <b>Signals.</b> <code>signal()</code> holds a value, <code>computed()</code> derives one, <code>effect()</code> runs side effects. When a template reads a signal, Angular records that view as a <b>consumer</b>. Setting the signal marks exactly that view for refresh (since v17 this is "local" CD for OnPush views: ancestors are not re-checked just because a child's signal changed). That is the foundation of zoneless Angular.</p>
      ${H.kv([['@Component', "changeDetection: ChangeDetectionStrategy.OnPush"], ['state', 'count = signal(0)'], ['template', '{{ count() }}'], ['update', 'this.count.update(n =&gt; n + 1)']], { label: 'the modern recipe' })}`,
    clues: [
      '"The app gets slow when the list/table is large; every keystroke lags" → OnPush + immutable inputs/signals, <code>track</code> in <code>@for</code>, fewer function calls in templates',
      '"I pushed into the array but the OnPush child did not update" → input reference unchanged; create a new array (or use a signal)',
      '"ExpressionChangedAfterItHasBeenCheckedError" → a binding changed during the check (dev-mode double check); move the change earlier or derive it with computed',
      '"Remove zone.js / reduce bundle / better INP" → <code>provideZonelessChangeDetection()</code> + signals + OnPush',
      '"Third-party chart library triggers thousands of change detections" → run it outside Angular (<code>NgZone.runOutsideAngular</code>) or go zoneless',
      '"UI does not update after setTimeout in a zoneless app" → write to a signal or call <code>markForCheck()</code>'
    ],
    code: [
      { lang: 'ts', title: 'OnPush + signals + zoneless bootstrap', code: `import {
  ApplicationConfig, ChangeDetectionStrategy, Component, computed, input, output,
  provideZonelessChangeDetection, signal,
} from '@angular/core';

export const appConfig: ApplicationConfig = {
  providers: [provideZonelessChangeDetection()],   // stable since v20; also remove zone.js from polyfills
};

export interface Item { id: number; name: string; price: number; }

@Component({
  selector: 'app-cart-line',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    {{ item().name }} — {{ item().price }}
    <button (click)="remove.emit(item().id)">Remove</button>
  \`,
})
export class CartLineComponent {
  item = input.required<Item>();        // signal input: OnPush-friendly by design
  remove = output<number>();
}

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CartLineComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    @for (item of items(); track item.id) {
      <app-cart-line [item]="item" (remove)="removeItem($event)" />
    } @empty { <p>Cart is empty</p> }
    <p>Total: {{ total() }}</p>
    <button (click)="addLater()">Add after 1s</button>
  \`,
})
export class CartComponent {
  items = signal<Item[]>([{ id: 1, name: 'Pen', price: 2 }]);
  total = computed(() => this.items().reduce((s, i) => s + i.price, 0)); // memoised

  removeItem(id: number): void {
    // New array reference: never mutate state in place.
    this.items.update(list => list.filter(i => i.id !== id));
  }

  addLater(): void {
    // Works without zone.js because a signal write schedules change detection.
    setTimeout(() => this.items.update(l => [...l, { id: Date.now(), name: 'Book', price: 12 }]), 1000);
  }
}` },
      { lang: 'ts', title: 'Escape hatches: markForCheck and running outside Angular', code: `import { ChangeDetectionStrategy, ChangeDetectorRef, Component, NgZone, inject, OnInit } from '@angular/core';

@Component({
  selector: 'app-ticker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`Price: {{ price }}\`,
})
export class TickerComponent implements OnInit {
  price = 0;                                 // plain field (legacy style)
  private cdr = inject(ChangeDetectorRef);
  private zone = inject(NgZone);

  ngOnInit(): void {
    // In a zone.js app: avoid a full-app CD every 50 ms for a noisy timer.
    this.zone.runOutsideAngular(() => {
      setInterval(() => {
        const next = Math.round(Math.random() * 100);
        if (next !== this.price) {
          this.price = next;
          this.cdr.markForCheck();           // mark this view + ancestors dirty, CD is scheduled
        }
      }, 50);
    });
  }
}` }
    ],
    viz: {
      title: 'Which components get checked? Default vs OnPush vs signals',
      input: 'Cart',
      inputLabel: 'Component where the change happens: Header, Page, Logo, Cart, List or Chart',
      gen: function (input) {
        var target = String(input || '').trim();
        var idx = CD_TREE.indexOf(target);
        if (idx < 1) throw new Error('Pick one of: Header, Page, Logo, Cart, List, Chart');
        var frames = [], arr = CD_TREE.slice();
        var path = []; var i = idx; while (i > 0) { path.push(i); i = Math.floor((i - 1) / 2); } path.push(0);
        function all(cls) { var h = {}; for (var k = 0; k < arr.length; k++) h[k] = cls; return h; }
        frames.push({ narr: 'Component tree. Index 0 is the root <b>App</b>. The change happens in <b>' + target + '</b> (a click handler inside it updates its state).', parts: [{ type: 'tree', label: 'component tree', arr: arr, hl: (function () { var h = {}; h[idx] = 'cur'; return h; })() }] });
        frames.push({ narr: '<b>Default + zone.js</b>: zone.js sees the click finish and calls <code>ApplicationRef.tick()</code>. Every component\'s bindings are checked top-down: <b>' + arr.length + ' checks</b>, even if only one value changed.', parts: [{ type: 'tree', label: 'Default: everything checked', arr: arr, hl: all('bad') }, { type: 'vars', label: 'cost', vals: { checked: arr.length, needed: 1 } }] });
        var h2 = {}; path.forEach(function (p) { h2[p] = 'win'; }); h2[idx] = 'ok';
        frames.push({ narr: '<b>OnPush everywhere</b>: the event marks <b>' + target + '</b> and its ancestors dirty (walk <b>up</b>: ' + path.map(function (p) { return arr[p]; }).join(' → ') + '). Then tick() goes <b>down</b> and only enters dirty OnPush views. Siblings are skipped.', parts: [{ type: 'tree', label: 'OnPush: dirty path only', arr: arr, hl: h2 }, { type: 'vars', label: 'cost', vals: { checked: path.length, needed: 1 } }] });
        var h3 = {}; h3[idx] = 'ok';
        frames.push({ narr: '<b>Signals + OnPush (zoneless)</b>: the template of ' + target + ' read <code>count()</code>, so it is a registered consumer. Setting the signal marks just that view to refresh; ancestors are only traversed, not re-checked. <b>1 view refreshed.</b>', parts: [{ type: 'tree', label: 'signals: only the consumer', arr: arr, hl: h3 }, { type: 'vars', label: 'cost', vals: { checked: 1, needed: 1 } }] });
        var h4 = {}; for (var c = 0; c < arr.length; c++) h4[c] = 'done'; h4[idx] = 'bad';
        frames.push({ narr: 'Trap: with OnPush, if a parent does <code>items.push(x)</code> the child\'s input <b>reference is unchanged</b>, so the child is not marked dirty and shows stale data. Fix: <code>items = [...items, x]</code> or a signal <code>update</code>.', parts: [{ type: 'tree', label: 'mutation bug', arr: arr, hl: h4 }, { type: 'text', html: '<code>old === new</code> → <span class="c-r">skip</span>' }] });
        return pad4(frames);
      }
    },
    examples: [
      { title: 'Why a function call in a template is a smell', html: `<p><code>{{ formatTotal() }}</code> runs on <b>every</b> check of that view. With Default CD that can be hundreds of times per second on a busy page. A <code>computed</code> runs only when its signals change, and a pure pipe only when its input changes.</p>
        ${H.table(['Binding', 'Runs when'], [['<code>{{ formatTotal() }}</code>', 'Every CD check of the view'], ['<code>{{ total | currency }}</code> (pure pipe)', 'Only when <code>total</code> changes'], ['<code>{{ totalLabel() }}</code> where totalLabel = computed(...)', 'Only when a dependency signal changes (cached otherwise)']])}`,
        code: { lang: 'ts', code: `import { Component, computed, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-total',
  standalone: true,
  imports: [CurrencyPipe],
  template: \`
    <p>{{ totalLabel() }}</p>
    <p>{{ total() | currency: 'EUR' }}</p>
  \`,
})
export class TotalComponent {
  prices = signal([3, 4, 5]);
  total = computed(() => this.prices().reduce((a, b) => a + b, 0));
  totalLabel = computed(() => \`\${this.prices().length} items, \${this.total()} total\`);
}` } },
      { title: 'ExpressionChangedAfterItHasBeenChecked, explained', html: `<p>In dev mode Angular runs a second check right after the first to make sure bindings are stable. If a lifecycle hook like <code>ngAfterViewInit</code> changes a value that the parent already rendered, the second check sees a different value and throws. Fix by computing the value earlier (constructor, <code>ngOnInit</code>), deriving it with <code>computed</code>, or updating a signal (which schedules a fresh pass) instead of mutating a field mid-check.</p>`,
        code: { lang: 'ts', code: `import { AfterViewInit, Component, signal, viewChild, ElementRef } from '@angular/core';

@Component({
  selector: 'app-measure',
  standalone: true,
  template: \`<div #box>content</div><p>Width: {{ width() }}</p>\`,
})
export class MeasureComponent implements AfterViewInit {
  box = viewChild.required<ElementRef<HTMLDivElement>>('box');
  width = signal(0);
  ngAfterViewInit(): void {
    // A plain field assignment here would throw ExpressionChanged... in dev mode.
    // A signal write is allowed: Angular schedules another refresh for this view.
    this.width.set(this.box().nativeElement.offsetWidth);
  }
}` } },
      { title: 'Migrating a zone app to zoneless: checklist', html: `${H.table(['Step', 'Why'], [
        ['Make components OnPush', 'Already "zoneless-ready": they only update on explicit notifications'],
        ['Replace mutable fields bound in templates with signals', 'A signal write notifies Angular; a plain field write does not'],
        ['Find <code>setTimeout</code>/<code>setInterval</code>/3rd-party callbacks that change state', 'They no longer trigger CD automatically'],
        ['Remove <code>NgZone.onStable</code>/<code>isStable</code> reliance', 'Zone events do not fire without zone.js; use <code>afterNextRender</code>/<code>afterEveryRender</code>'],
        ['Add <code>provideZonelessChangeDetection()</code> and remove <code>zone.js</code> from polyfills', 'Drops ~30 KB and global monkey patching'],
        ['Tests: use <code>await fixture.whenStable()</code> instead of relying on <code>fakeAsync</code>-only behaviour', 'Testing utilities work without zones, timing changes a little']
      ])}`,
        code: { lang: 'ts', code: `import { bootstrapApplication } from '@angular/platform-browser';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),   // and delete "zone.js" from angular.json polyfills
    provideRouter(routes),
  ],
}).catch(err => console.error(err));` } }
    ],
    deepDive: `<p>🟣 <b>How a check works.</b> Each component's template is compiled (Ivy) into a template function with a <b>creation</b> block and an <b>update</b> block. In update mode it compares each binding with the value stored in the view's data array (LView) and writes the DOM only when they differ (<code>Object.is</code>). There is no virtual DOM diff: Angular knows the exact bindings at compile time. Cost is proportional to the number of bindings checked, which is why skipping subtrees (OnPush) and fine-grained signals help so much.</p>
      <p>🟣 <b>Scheduling.</b> With zone.js, <code>NgZone.onMicrotaskEmpty</code> triggers <code>ApplicationRef.tick()</code>. Since v18 Angular also has a <b>hybrid scheduler</b>: even in zone apps, signal writes and <code>markForCheck</code> outside the zone schedule a tick. Zoneless uses <code>ChangeDetectionScheduler</code>, which coalesces notifications into one tick (via a <code>requestAnimationFrame</code>/<code>setTimeout</code> race). <code>provideZoneChangeDetection({ eventCoalescing: true })</code> is the zone-world way to merge multiple events into one tick.</p>
      <p>🟣 <b>Signal graph internals.</b> Signals form a push-pull graph: writes push a "dirty" notification to consumers; computeds are lazy and recompute when read (pull), using version numbers to skip unchanged dependencies. Template views are reactive consumers; when notified, the view gets a <code>RefreshView</code> flag and ancestors get a <code>HasChildViewsToRefresh</code> flag, so the tick traverses down to it without re-checking ancestors' bindings. <code>effect()</code> is for syncing to the outside (localStorage, logging, DOM APIs), not for setting other signals; use <code>computed</code> or <code>linkedSignal</code> for derived state.</p>
      <p>🟣 <b>Measure first.</b> Angular DevTools has a Profiler showing each CD cycle and time per component. Chrome performance traces show <code>tick</code> cost. Typical wins: OnPush on list items, <code>track item.id</code> in <code>@for</code> (avoids DOM re-creation), pure pipes/computed instead of template methods, and virtual scrolling for long lists.</p>`,
    aiEra: `<p>🤖 Change detection questions are where interviewers separate "can use Angular" from "understands Angular", and AI will not save you live. AI assistants still often generate Default-CD components with mutable fields and <code>ngOnChanges</code> plumbing; prompt for "OnPush, signals, signal inputs, zoneless compatible". AI is very useful for migrations: the Angular CLI ships schematics (<code>ng generate @angular/core:signal-input-migration</code>, <code>output-migration</code>, <code>signal-queries-migration</code>, control-flow migration), and LLM agents can go file by file converting fields to signals and finding <code>setTimeout</code> callbacks that zoneless would break. Always verify with the DevTools profiler and tests, because a missed notification in zoneless mode is a silent "screen did not update" bug.</p>`,
    problems: [{
      title: 'Count Checked Components: Default vs OnPush',
      level: 'Medium', tags: ['change detection', 'OnPush', 'tree'], companies: ['Google', 'Thoughtworks'],
      statement: `<p>Given a component tree (each node: <code>{ name, onPush, children }</code>) and a set of components marked dirty by an event, return the list of components Angular checks in one tick. Rules: Default components are always checked when reached; an OnPush component is checked (and its children visited) only if it is dirty. Marking a component dirty also marks all its ancestors dirty.</p>`,
      constraints: `Up to 1000 nodes. Return names in pre-order (the order Angular visits them).`,
      example: `<p>App(Default) → [Header(OnPush) → Logo(Default)], [Page(OnPush) → Cart(OnPush)]. Event in Cart: dirty = Cart, Page, App. Checked: ${H.c('g', 'App, Page, Cart')}. Header and its Default child Logo are skipped because Header is OnPush and clean.</p>`,
      brute: { why: `<p>The naive model "checks every component" (Default everywhere). It is the right answer only when no component is OnPush, and it hides why a subtree under a clean OnPush parent never updates.</p>`,
        code: { lang: 'js', run: true, code: `function checkedAll(node, out = []) {
  out.push(node.name);
  for (const c of node.children || []) checkedAll(c, out);
  return out;
}
const tree = { name: 'App', children: [{ name: 'Header', onPush: true, children: [{ name: 'Logo' }] }, { name: 'Page', onPush: true, children: [{ name: 'Cart', onPush: true }] }] };
console.log(checkedAll(tree).join(', '));` } },
      mcq: { q: 'A Default-strategy child sits inside a clean OnPush parent. An unrelated click happens elsewhere. Is the child checked?', options: ['Yes, Default is always checked', 'No, the OnPush parent is skipped together with its whole subtree', 'Only if it has inputs'], answer: 1, explain: 'Angular never enters a skipped OnPush view, so nothing below it is visited.' },
      hints: [
        `<p>Hint 1: first compute the full dirty set: for each dirty node, add every ancestor (store a parent map).</p>`,
        `<p>Hint 2: then do a pre-order DFS. Before visiting a node, ask: is it Default, or is it OnPush and dirty? If not, skip it <i>and its subtree</i>.</p>`,
        `<p>Hint 3: the root is always checked by <code>tick()</code>. Edge case: an empty dirty set with all-OnPush children checks only the root.</p>`
      ],
      solution: {
        approach: `<p>Build parent links, expand dirty marks upward, then DFS with a skip rule. This mirrors Angular: <code>markForCheck</code> walks up, <code>tick()</code> walks down and skips clean OnPush views.</p>`,
        code: { lang: 'js', run: true, code: `function checked(root, dirtyNames) {
  const parent = new Map();
  (function link(n) { for (const c of n.children || []) { parent.set(c, n); link(c); } })(root);

  // expand "dirty" upward (markForCheck walks to the root)
  const dirty = new Set();
  (function find(n) {
    if (dirtyNames.includes(n.name)) for (let p = n; p; p = parent.get(p)) dirty.add(p);
    for (const c of n.children || []) find(c);
  })(root);

  const out = [];
  (function visit(n, isRoot) {
    if (!isRoot && n.onPush && !dirty.has(n)) return;    // skip clean OnPush subtree
    out.push(n.name);
    for (const c of n.children || []) visit(c, false);
  })(root, true);
  return out;
}

const tree = {
  name: 'App', children: [
    { name: 'Header', onPush: true, children: [{ name: 'Logo' }] },
    { name: 'Page', onPush: true, children: [
      { name: 'Cart', onPush: true, children: [] },
      { name: 'Chart', onPush: false, children: [] },
    ] },
  ],
};
console.log(checked(tree, ['Cart']).join(', '));   // App, Page, Cart, Chart
console.log(checked(tree, ['Logo']).join(', '));   // App, Header, Logo
console.log(checked(tree, []).join(', '));         // App` },
        complexity: `<p>O(n) to link and expand, O(visited) for the walk. That is the point of OnPush: the walk cost depends on the dirty part, not the whole app.</p>`,
        followUps: ['How does a signal change differ from markForCheck in what gets re-checked?', 'Why is Chart (Default) checked in the first call?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 5 — @defer blocks, SSR, hydration, incremental hydration
     ===================================================================== */
  topics.push({
    title: '@defer, SSR and Hydration (Full, Event Replay, Incremental)',
    analogy: `<p>Think of a <b>furniture showroom</b>. SSR is showing customers a fully set-up room the moment they walk in (HTML from the server) instead of an empty room with a pile of flat-pack boxes (a blank page while JS loads). <b>Hydration</b> is the staff quietly plugging in the lamps and connecting the drawers so they actually <i>work</i>, without tearing the room down. <b>@defer</b> is leaving the heavy massage chair in the warehouse until a customer actually walks to that corner. <b>Incremental hydration</b> is only switching on the lamp in the corner the customer is about to touch, while the rest of the room stays a nice-looking display.</p>`,
    explain: `<p>🟢 <b>@defer (v17+).</b> A template block that <b>lazy-loads</b> the standalone components, directives and pipes used inside it into a separate JS chunk, and renders them only when a <b>trigger</b> fires. No router or manual <code>import()</code> needed.</p>
      ${H.table(['Trigger', 'Loads/renders when'], [
        ['<code>on idle</code> (default)', 'Browser is idle (<code>requestIdleCallback</code>)'],
        ['<code>on viewport</code>', 'The placeholder (or a referenced element) scrolls into view (IntersectionObserver)'],
        ['<code>on interaction</code>', 'User clicks or presses a key on the placeholder / a trigger element'],
        ['<code>on hover</code>', 'Mouse enters or focus lands on it'],
        ['<code>on immediate</code>', 'Right after the non-deferred content finished rendering'],
        ['<code>on timer(2s)</code>', 'After a delay'],
        ['<code>when expr</code>', 'A boolean expression becomes true (one-way: it does not unload later)'],
        ['<code>prefetch on ...</code>', 'Download the chunk earlier than rendering (e.g. <code>on viewport; prefetch on idle</code>)']
      ])}
      <p>Sub-blocks: <code>@placeholder (minimum 500ms)</code> shown before the trigger (must not contain heavy deps), <code>@loading (after 100ms; minimum 1s)</code> while the chunk downloads (avoids flicker), <code>@error</code> if loading fails. Only <b>standalone</b> dependencies that are not referenced elsewhere in the same file are deferred; otherwise they are loaded eagerly.</p>
      <p>🔵 <b>SSR.</b> With <code>ng new --ssr</code> (or <code>ng add @angular/ssr</code>) the server renders the route to HTML so users and crawlers see content immediately (better FCP/LCP, SEO). Since v19 you can choose a <b>render mode per route</b> with <code>ServerRoute</code>: <code>RenderMode.Prerender</code> (SSG at build time), <code>RenderMode.Server</code> (SSR per request), <code>RenderMode.Client</code> (CSR only). Browser-only APIs (<code>window</code>, <code>localStorage</code>) must be guarded: use <code>afterNextRender</code> or check <code>isPlatformBrowser</code>.</p>
      <p>🔵 <b>Hydration.</b> Without it, the client used to throw the server DOM away and re-render (a visible flash). <code>provideClientHydration()</code> (v16+, stable v17) makes Angular <b>reuse the existing DOM nodes</b> and attach listeners. Extras:</p>
      <ul>
        <li><b>HTTP transfer cache</b>: requests made on the server are serialised into the page so the client does not refetch (on by default with hydration).</li>
        <li><code>withEventReplay()</code> (stable v19, default in new apps): clicks that happen <b>before</b> hydration finishes are recorded and replayed afterwards, so early clicks are not lost.</li>
        <li><code>withIncrementalHydration()</code> (stable v20): <code>@defer (hydrate on viewport)</code> blocks are rendered on the server as real HTML, but their JS is <b>not downloaded or hydrated</b> until the hydrate trigger fires. Triggers: <code>hydrate on idle | viewport | interaction | hover | immediate | timer(...)</code>, <code>hydrate when expr</code>, <code>hydrate never</code> (static forever).</li>
      </ul>
      ${H.table(['Without SSR (CSR)', 'SSR + full hydration', 'SSR + incremental hydration'], [
        ['Blank page until all JS runs', 'Content visible fast; all JS still downloaded and hydrated up front', 'Content visible fast; JS for deferred areas downloaded only when needed'],
        ['Poor LCP, SEO depends on crawler JS', 'Good LCP; TBT/INP can suffer on big pages', 'Good LCP and smaller initial JS, better INP']
      ])}`,
    clues: [
      '"A heavy chart/editor/map below the fold slows initial load" → <code>@defer (on viewport) { ... } @placeholder { skeleton }</code>',
      '"Need SEO and fast first paint for product pages" → SSR or prerender with <code>RenderMode</code> per route + hydration',
      '"Screen flickers when the app boots after SSR" → enable <code>provideClientHydration()</code> (DOM reuse instead of re-render)',
      '"Clicks before the page is interactive are lost" → <code>withEventReplay()</code>',
      '"window is not defined" / "localStorage is not defined" on the server → guard with <code>afterNextRender</code> / <code>isPlatformBrowser</code>',
      '"NG0500 hydration mismatch" → server and client DOM differ (invalid HTML nesting, direct DOM manipulation, random/time values)'
    ],
    code: [
      { lang: 'ts', title: '@defer with triggers, prefetch, placeholder, loading and error', code: `import { Component } from '@angular/core';
import { ReviewsComponent } from './reviews.component';       // standalone, used only inside @defer
import { PriceChartComponent } from './price-chart.component'; // heavy (chart library)

@Component({
  selector: 'app-product-page',
  standalone: true,
  imports: [ReviewsComponent, PriceChartComponent],
  template: \`
    <h1>Product</h1>

    <!-- Chart chunk is prefetched when idle, rendered when scrolled into view -->
    @defer (on viewport; prefetch on idle) {
      <app-price-chart />
    } @placeholder (minimum 300ms) {
      <div class="skeleton" style="height: 240px">Chart</div>
    } @loading (after 100ms; minimum 500ms) {
      <p>Loading chart…</p>
    } @error {
      <p>Could not load the chart.</p>
    }

    <!-- Reviews load only when the user asks -->
    @defer (on interaction(showReviews)) {
      <app-reviews />
    }
    <button #showReviews>Show reviews</button>
  \`,
})
export class ProductPageComponent {}` },
      { lang: 'ts', title: 'SSR config: hydration, event replay, incremental hydration, per-route render modes', code: `// app.config.ts (browser)
import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideClientHydration, withEventReplay, withIncrementalHydration } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideClientHydration(withEventReplay(), withIncrementalHydration()),
  ],
};

// app.routes.server.ts (server) — choose how each route is rendered
import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },           // static marketing page at build time
  { path: 'products/:id', renderMode: RenderMode.Server },  // fresh SSR per request
  { path: 'account/**', renderMode: RenderMode.Client },    // private, no SEO value
  { path: '**', renderMode: RenderMode.Server },
];` }
    ],
    viz: {
      title: 'Page boot timeline: CSR vs SSR + hydration vs incremental hydration',
      input: 'incremental',
      inputLabel: 'Mode: csr, ssr or incremental',
      gen: function (input) {
        var mode = String(input || '').trim().toLowerCase();
        if (['csr', 'ssr', 'incremental'].indexOf(mode) < 0) throw new Error('Type csr, ssr or incremental');
        var cols = ['0.2s', '0.6s', '1.0s', '1.6s', '2.4s'];
        var rows = [];
        var frames = [];
        function push(narr, row, hl) {
          rows.push(row);
          var h = {}; h[rows.length - 1] = hl || 'cur';
          frames.push({ narr: narr, parts: [{ type: 'table', label: mode + ' timeline', columns: ['step'].concat(cols), rows: rows.map(function (r) { return r.slice(); }), hl: h }] });
        }
        if (mode === 'csr') {
          push('Browser gets a nearly empty <code>index.html</code>: just <code>&lt;app-root&gt;&lt;/app-root&gt;</code>. Nothing to show yet.', ['HTML', '■', '', '', '', '']);
          push('It must download and parse the main JS bundle before anything renders.', ['download JS', '', '■', '■', '', '']);
          push('Angular boots, components fetch data, then render. <b>First contentful paint only now</b>: bad LCP and a blank screen on slow phones.', ['render + data', '', '', '', '■', '■'], 'bad');
          push('Interactive at the same time it becomes visible. Crawlers that do not run JS see an empty page.', ['interactive', '', '', '', '', '■'], 'bad');
        } else if (mode === 'ssr') {
          push('Server renders the route to full HTML (with data). Browser paints it immediately: <b>fast FCP/LCP</b>.', ['HTML (SSR)', '■', '', '', '', ''], 'ok');
          push('Page is visible but not interactive yet. Clicks now are recorded by <b>event replay</b> instead of being lost.', ['visible', '■', '■', '■', '■', '■'], 'ok');
          push('All the JS for the page downloads (same size as CSR).', ['download JS', '', '■', '■', '', '']);
          push('<b>Hydration</b>: Angular walks the existing DOM, reuses nodes, attaches listeners. Data comes from the HTTP transfer cache (no refetch). Recorded clicks replay.', ['hydrate', '', '', '', '■', ''], 'cur');
          push('Interactive. The whole page was hydrated, including parts the user may never scroll to.', ['interactive', '', '', '', '', '■'], 'ok');
        } else {
          push('Server renders everything, including <code>@defer (hydrate on viewport)</code> blocks, as real HTML. Fast LCP.', ['HTML (SSR)', '■', '', '', '', ''], 'ok');
          push('Only the JS for the <b>non-deferred</b> shell downloads: a smaller initial bundle.', ['download shell JS', '', '■', '', '', ''], 'ok');
          push('The shell hydrates. Deferred regions stay as static, "dehydrated" HTML: visible, no JS yet.', ['hydrate shell', '', '', '■', '', ''], 'ok');
          push('The user scrolls the reviews block into view: its chunk downloads and <b>only that block hydrates</b> (parents first if needed).', ['hydrate reviews', '', '', '', '■', ''], 'cur');
          push('Footer with <code>hydrate never</code> stays static forever: zero JS cost. Less main-thread work means better INP.', ['footer', '', '', '', '', '—'], 'sel');
        }
        return pad4(frames);
      }
    },
    examples: [
      { title: 'Incremental hydration in a template', html: `<p>Server renders the content; the block's JS loads and hydrates only on the trigger. A plain <code>on</code> trigger still controls client-side (non-SSR) rendering of the block.</p>`,
        code: { lang: 'ts', code: `import { Component } from '@angular/core';
import { CommentsComponent } from './comments.component';
import { FooterLinksComponent } from './footer-links.component';

@Component({
  selector: 'app-article',
  standalone: true,
  imports: [CommentsComponent, FooterLinksComponent],
  template: \`
    <article>…main content, hydrated normally…</article>

    @defer (on viewport; hydrate on viewport) {
      <app-comments />
    } @placeholder {
      <p>Comments</p>
    }

    @defer (hydrate never) {
      <app-footer-links />          <!-- static HTML forever, no JS shipped for it -->
    }
  \`,
})
export class ArticleComponent {}` } },
      { title: 'Browser-only code in an SSR app', html: `<p>Constructors and <code>ngOnInit</code> run on the server too. Put DOM, <code>window</code> and <code>localStorage</code> access in <code>afterNextRender</code>, which runs only in the browser after rendering.</p>`,
        code: { lang: 'ts', code: `import { Component, afterNextRender, signal } from '@angular/core';

@Component({
  selector: 'app-theme',
  standalone: true,
  template: \`Theme: {{ theme() }}\`,
})
export class ThemeComponent {
  theme = signal<'light' | 'dark'>('light');   // server renders the safe default
  constructor() {
    afterNextRender(() => {
      // browser only: safe to touch localStorage and matchMedia here
      const saved = localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.theme.set(saved === 'dark' || (!saved && prefersDark) ? 'dark' : 'light');
    });
  }
}` } },
      { title: 'Debugging NG0500 hydration mismatches', html: `${H.table(['Cause', 'Fix'], [
        ['Invalid HTML nesting (<code>&lt;div&gt;</code> inside <code>&lt;p&gt;</code>, <code>&lt;tr&gt;</code> without <code>&lt;tbody&gt;</code>): the browser parser fixes it, so DOM ≠ server output', 'Write valid HTML'],
        ['Direct DOM manipulation (<code>innerHTML</code>, jQuery, <code>appendChild</code>) in components', 'Use Angular templates/Renderer2, or <code>ngSkipHydration</code> on that host as a last resort'],
        ['<code>Date.now()</code>, <code>Math.random()</code>, locale or timezone differences between server and client', 'Compute on server and transfer via state, or render after <code>afterNextRender</code>'],
        ['CDN/edge "optimises" HTML (strips comments)', 'Angular uses comment nodes as markers: disable that minification']
      ])}`,
        code: { lang: 'ts', code: `import { Component } from '@angular/core';
import { LegacyWidgetComponent } from './legacy-widget.component';

@Component({
  selector: 'app-host',
  standalone: true,
  imports: [LegacyWidgetComponent],
  // Last resort: this subtree is re-rendered on the client instead of hydrated.
  template: \`<app-legacy-widget ngSkipHydration />\`,
})
export class HostComponent {}` } }
    ],
    deepDive: `<p>🟣 <b>How @defer is compiled.</b> The compiler finds the dependencies used only inside the block and replaces their static import with a dynamic <code>import()</code> function, producing a separate chunk. At runtime the block is a small state machine: placeholder → (trigger) → loading → complete or error. Viewport and interaction triggers attach observers/listeners to the placeholder or the referenced element. On the server, normal <code>@defer</code> blocks render their <b>placeholder</b> (triggers never fire on the server) unless incremental hydration is enabled, in which case blocks with hydrate triggers render their main content.</p>
      <p>🟣 <b>Hydration mechanics.</b> The server adds an <code>ngh</code> attribute and a serialized hydration info script (<code>ng-state</code>) describing view boundaries, the number of nodes in <code>@if</code>/<code>@for</code> containers, and i18n blocks. The client walks the DOM in the same order as rendering would create it, "claiming" nodes instead of creating them. For incremental hydration, dehydrated blocks keep a registry; when a hydrate trigger fires (or an event is replayed inside them via JSAction-based event dispatch, the same library Google Search uses), Angular loads the chunk and hydrates top-down from the nearest hydrated ancestor.</p>
      <p>🟣 <b>Costs and trade-offs.</b> SSR adds server cost and complexity (Node server or edge runtime; caching rules; auth cookies forwarded on server requests). TTFB can increase if server data fetching is slow; mitigate with caching, prerendering stable pages and streaming. Hydration still costs main-thread time on big pages, which is why incremental hydration and <code>@defer</code> matter for INP. Avoid layout shift: placeholders should reserve the same size as the final content (CLS).</p>
      <p>🟣 <b>Measuring.</b> Lighthouse / Web Vitals (LCP, INP, CLS), the Angular DevTools "hydration" overlay, and the console line "Angular hydrated N components and M DOM nodes" tell you whether hydration worked and how much was skipped.</p>`,
    aiEra: `<p>🤖 AI is handy for auditing a page: "find components that use <code>window</code> or <code>document</code> outside <code>afterNextRender</code>" or "suggest @defer candidates from this bundle report". It is also often wrong about versions: many models still say hydration is experimental or describe the old Angular Universal <code>ngExpressEngine</code> setup. Know the current story (v17 stable hydration and <code>@defer</code>, v19 route render modes and event replay, v20 stable incremental hydration and zoneless) and verify generated configs against <code>angular.dev</code>. AI-driven crawlers and answer engines also read your HTML: SSR/prerendering means your content is visible to them without running JS.</p>`,
    problems: [{
      title: 'Simulate @defer Trigger Logic (placeholder, loading, minimum times)',
      level: 'Hard', tags: ['defer', 'state machine', 'timing'], companies: ['Google', 'Atlassian'],
      statement: `<p>Write <code>deferTimeline(opts)</code> that returns the list of <code>[timeMs, state]</code> changes for one <code>@defer</code> block. Options: <code>triggerAt</code> (when the trigger fires), <code>loadMs</code> (chunk download time), <code>placeholderMin</code> (placeholder must stay at least this long once shown at t=0), <code>loadingAfter</code> (show loading only if the load takes longer than this), <code>loadingMin</code> (once shown, loading stays at least this long). States: <code>placeholder</code>, <code>loading</code>, <code>content</code>.</p>`,
      constraints: `All values are non-negative integers. If the chunk is already prefetched, <code>loadMs</code> is 0.`,
      example: `<p><code>triggerAt 1000, loadMs 800, placeholderMin 500, loadingAfter 100, loadingMin 500</code> gives ${H.c('g', '[0 placeholder], [1100 loading], [1800 content]')}: loading appears 100 ms after the trigger, and content shows when the chunk is ready at 1800 (loading has been visible 700 ≥ 500 ms).</p>`,
      brute: { why: `<p>Switching states the instant each event happens ignores the anti-flicker timers: a fast load shows a loading spinner for 20 ms (a flash) and a placeholder can disappear the moment it appears. That is exactly what <code>after</code> and <code>minimum</code> exist to prevent.</p>`,
        code: { lang: 'js', run: true, code: `function naive({ triggerAt, loadMs }) {
  return [[0, 'placeholder'], [triggerAt, 'loading'], [triggerAt + loadMs, 'content']];
}
console.log(JSON.stringify(naive({ triggerAt: 1000, loadMs: 20 }))); // spinner flashes for 20 ms` } },
      mcq: { q: 'The chunk loads in 50 ms and <code>@loading (after 100ms)</code> is set. What does the user see?', options: ['Placeholder, then loading for 50 ms, then content', 'Placeholder, then content directly (no loading state)', 'Loading only'], answer: 1, explain: 'The load finished before the "after" threshold, so the loading block never appears: no flicker.' },
      hints: [
        `<p>Hint 1: the earliest the block may leave the placeholder is <code>max(triggerAt, placeholderMin)</code>; the chunk is ready at <code>triggerAt + loadMs</code>.</p>`,
        `<p>Hint 2: loading appears at <code>triggerAt + loadingAfter</code> only if the chunk is not ready by then.</p>`,
        `<p>Hint 3: if loading was shown at time L, content waits until <code>max(ready, L + loadingMin)</code>. Otherwise content shows at <code>max(ready, placeholder end)</code>.</p>`
      ],
      solution: {
        approach: `<p>Compute key timestamps instead of simulating every millisecond: placeholder end, ready time, optional loading start, and content time with the minimums applied. Each anti-flicker option becomes a <code>max()</code>.</p>`,
        code: { lang: 'js', run: true, code: `function deferTimeline({ triggerAt, loadMs, placeholderMin = 0, loadingAfter = 0, loadingMin = 0 }) {
  const out = [[0, 'placeholder']];
  const ready = triggerAt + loadMs;                    // chunk downloaded
  const placeholderEnd = Math.max(triggerAt, placeholderMin);
  const loadingStart = Math.max(triggerAt + loadingAfter, placeholderEnd);
  if (ready > loadingStart) {                          // slow enough to show loading
    out.push([loadingStart, 'loading']);
    out.push([Math.max(ready, loadingStart + loadingMin), 'content']);
  } else {
    out.push([Math.max(ready, placeholderEnd), 'content']);
  }
  return out;
}

const cases = [
  { triggerAt: 1000, loadMs: 800, placeholderMin: 500, loadingAfter: 100, loadingMin: 500 },
  { triggerAt: 1000, loadMs: 50, loadingAfter: 100, loadingMin: 500 },    // fast: no spinner
  { triggerAt: 0, loadMs: 300, placeholderMin: 400, loadingAfter: 100, loadingMin: 500 },
  { triggerAt: 200, loadMs: 0, placeholderMin: 0 },                       // prefetched
];
for (const c of cases) console.log(JSON.stringify(deferTimeline(c)));` },
        complexity: `<p>O(1). The real implementation uses timers per block, but the rule set is the same: <code>after</code> avoids flashing a spinner for fast loads, <code>minimum</code> avoids flashing it for slightly-slow ones.</p>`,
        followUps: ['How does prefetch on idle change loadMs?', 'Why must the placeholder not contain deferred dependencies?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 6 — State: services with signals, NgRx Store, NgRx SignalStore
     ===================================================================== */
  topics.push({
    title: 'State Management: Signal Services, NgRx Store and NgRx SignalStore',
    analogy: `<p>Think of a <b>shared whiteboard in an office</b>. In a small team, one person owns the board and everyone asks her to update it (a service with signals). In a bank, nobody writes on the ledger directly: you fill in a <b>request slip</b> (action), a clerk applies strict rules to produce the new ledger page (reducer), other clerks handle phone calls to other banks (effects), and anyone can read a summary sheet (selectors). Every slip is kept, so you can replay the day (DevTools time travel). <b>SignalStore</b> is the modern middle ground: a well-organised whiteboard with clear sections and rules, but without all the slips.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> "State" is data that more than one component needs and that changes over time: the logged-in user, the cart, a product list with filters. Angular gives you three common levels, from simple to formal:</p>
      ${H.table(['Option', 'What it is', 'Good for', 'Cost'], [
        ['Service with signals', 'An <code>@Injectable({ providedIn: \'root\' })</code> class holding private <code>signal</code>s, exposing <code>asReadonly()</code> and <code>computed</code>s, with methods to change them', 'Most apps, feature state, small teams', 'Low; conventions are up to you'],
        ['<b>NgRx Store</b> (Redux)', 'One global immutable state tree; <b>actions</b> describe events, pure <b>reducers</b> compute the new state, <b>selectors</b> read memoised slices, <b>effects</b> do side effects (HTTP)', 'Large apps, many teams, complex flows, audit/time-travel debugging', 'Most boilerplate (reduced by <code>createActionGroup</code>, <code>createFeature</code>)'],
        ['<b>NgRx SignalStore</b> (<code>@ngrx/signals</code>)', 'A store built from signals with <code>signalStore(withState, withComputed, withMethods, withHooks)</code>, <code>patchState</code>, <code>rxMethod</code>, entity helpers', 'Feature/component stores in signal-first apps', 'Medium; composable features, little ceremony']
      ])}
      <p>🔵 <b>Redux data flow in NgRx Store</b> (one direction only):</p>
      ${H.chips(['component dispatches action', 'reducer (pure): state + action → new state', 'selectors recompute (memoised)', 'component reads via store.selectSignal / select', 'effect listens to actions → HTTP → dispatches success/failure'], { label: 'unidirectional flow' })}
      <p>🔵 <b>Rules that keep it sane.</b> Reducers are pure and never mutate (return new objects; NgRx runtime checks catch mutation in dev). Actions are named as <b>events</b> (<code>[Cart Page] Item Removed</code>) rather than commands, so one action can be handled by several reducers/effects. Selectors are memoised: <code>createSelector</code> recomputes only when its inputs change by reference. Effects use the right flattening operator: <code>switchMap</code> for "latest wins" searches, <code>concatMap</code> for ordered writes, <code>exhaustMap</code> for "ignore repeated login clicks", <code>mergeMap</code> for independent parallel work.</p>
      <p>🔵 <b>Where state should live.</b> Not everything belongs in a global store. A useful split: <b>server cache</b> (lists, entities) — a store or a data-fetching helper like <code>httpResource</code>/<code>resource</code>; <b>URL state</b> (filters, page number, selected tab) — the router query params, so links and back button work; <b>form state</b> — the form model; <b>local UI state</b> (is this dropdown open) — a <code>signal</code> in the component. Putting UI toggles in a global store is a common over-engineering smell.</p>`,
    clues: [
      '"Many unrelated components need the same data and it changes often" → shared state (signal service, SignalStore or NgRx Store)',
      '"We need an audit trail / time-travel debugging / strict patterns for 10+ teams" → NgRx Store (actions, reducers, effects, DevTools)',
      '"Simple feature state without Redux boilerplate in a signal-based app" → NgRx SignalStore or a service with signals',
      '"Search box fires overlapping requests and old results appear" → effect/rxMethod with <code>switchMap</code> (+ debounce)',
      '"Double-click on Pay sends two orders" → <code>exhaustMap</code> in the effect, plus disabling the button',
      '"Filters should survive refresh and be shareable" → keep them in URL query params, not only in a store'
    ],
    code: [
      { lang: 'ts', title: 'Level 1 — a service with signals (often enough)', code: `import { Injectable, computed, signal } from '@angular/core';

export interface CartItem { id: number; name: string; price: number; qty: number; }

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly _items = signal<CartItem[]>([]);      // private, writable
  readonly items = this._items.asReadonly();              // public, read-only
  readonly count = computed(() => this._items().reduce((n, i) => n + i.qty, 0));
  readonly total = computed(() => this._items().reduce((s, i) => s + i.price * i.qty, 0));

  add(item: Omit<CartItem, 'qty'>): void {
    this._items.update(list => {
      const found = list.find(i => i.id === item.id);
      return found
        ? list.map(i => (i.id === item.id ? { ...i, qty: i.qty + 1 } : i))   // immutable update
        : [...list, { ...item, qty: 1 }];
    });
  }
  remove(id: number): void { this._items.update(list => list.filter(i => i.id !== id)); }
}` },
      { lang: 'ts', title: 'Level 2 — NgRx Store: action group, feature reducer, selectors, effect', code: `import { inject } from '@angular/core';
import { createActionGroup, createFeature, createReducer, createSelector, emptyProps, on, props } from '@ngrx/store';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, debounceTime, map, of, switchMap } from 'rxjs';
import { ProductApi, Product } from './product.api';

export const ProductsActions = createActionGroup({
  source: 'Products Page',
  events: {
    'Search Changed': props<{ query: string }>(),
    'Load Success': props<{ products: Product[] }>(),
    'Load Failure': props<{ error: string }>(),
    'Cleared': emptyProps(),
  },
});

interface ProductsState { query: string; products: Product[]; loading: boolean; error: string | null; }
const initialState: ProductsState = { query: '', products: [], loading: false, error: null };

export const productsFeature = createFeature({
  name: 'products',
  reducer: createReducer(
    initialState,
    on(ProductsActions.searchChanged, (s, { query }) => ({ ...s, query, loading: true, error: null })),
    on(ProductsActions.loadSuccess, (s, { products }) => ({ ...s, products, loading: false })),
    on(ProductsActions.loadFailure, (s, { error }) => ({ ...s, error, loading: false })),
    on(ProductsActions.cleared, () => initialState),
  ),
  // createFeature also generates selectProducts, selectLoading, selectQuery...
  extraSelectors: ({ selectProducts }) => ({
    selectInStock: createSelector(selectProducts, ps => ps.filter(p => p.stock > 0)),
  }),
});

// Functional effect: latest search wins (switchMap cancels older HTTP calls).
export const searchProducts = createEffect(
  (actions$ = inject(Actions), api = inject(ProductApi)) =>
    actions$.pipe(
      ofType(ProductsActions.searchChanged),
      debounceTime(300),
      switchMap(({ query }) =>
        api.search(query).pipe(
          map(products => ProductsActions.loadSuccess({ products })),
          catchError(err => of(ProductsActions.loadFailure({ error: String(err) }))), // keep the effect alive
        ),
      ),
    ),
  { functional: true },
);

// In a component: products = inject(Store).selectSignal(productsFeature.selectInStock);
// Register: provideStore(), provideState(productsFeature), provideEffects({ searchProducts })` },
      { lang: 'ts', title: 'Level 3 — NgRx SignalStore with rxMethod', code: `import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { debounceTime, distinctUntilChanged, pipe, switchMap, tap } from 'rxjs';
import { ProductApi, Product } from './product.api';

type State = { query: string; products: Product[]; loading: boolean };

export const ProductsStore = signalStore(
  { providedIn: 'root' },
  withState<State>({ query: '', products: [], loading: false }),
  withComputed(({ products }) => ({
    count: computed(() => products().length),
  })),
  withMethods((store, api = inject(ProductApi)) => ({
    // rxMethod accepts a value, a signal or an observable as input
    search: rxMethod<string>(
      pipe(
        debounceTime(300),
        distinctUntilChanged(),
        tap(query => patchState(store, { query, loading: true })),
        switchMap(query =>
          api.search(query).pipe(
            tapResponse({
              next: products => patchState(store, { products, loading: false }),
              error: () => patchState(store, { products: [], loading: false }),
            }),
          ),
        ),
      ),
    ),
  })),
  withHooks({
    onInit(store) { store.search(store.query); },   // re-runs the search whenever the query signal changes
  }),
);` }
    ],
    viz: {
      title: 'NgRx round trip: dispatch → reducer → selector → effect → success',
      input: 'Search Changed, Load Success, Cleared',
      inputLabel: 'Actions to dispatch (Search Changed, Load Success, Load Failure, Cleared)',
      gen: function (input) {
        var acts = String(input || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        var allowed = ['Search Changed', 'Load Success', 'Load Failure', 'Cleared'];
        if (!acts.length || acts.length > 6) throw new Error('Give 1 to 6 actions, e.g. Search Changed, Load Success');
        acts.forEach(function (a) { if (allowed.indexOf(a) < 0) throw new Error('Unknown action "' + a + '". Use: ' + allowed.join(', ')); });
        var nodes = [{ id: 'C', label: 'Component', x: 8, y: 30, shape: 'box' }, { id: 'S', label: 'Store', x: 34, y: 10, shape: 'box' }, { id: 'R', label: 'Reducer', x: 62, y: 10, shape: 'box' }, { id: 'Sel', label: 'Selectors', x: 90, y: 30, shape: 'box' }, { id: 'E', label: 'Effect', x: 34, y: 52, shape: 'box' }, { id: 'API', label: 'HTTP API', x: 62, y: 52, shape: 'box' }];
        var edges = [['C', 'S', 'dispatch'], ['S', 'R'], ['R', 'Sel'], ['Sel', 'C', 'signal'], ['S', 'E'], ['E', 'API'], ['API', 'E'], ['E', 'S', 'new action']];
        var state = { query: '', loading: false, count: 0, error: 'null' };
        var frames = [];
        function f(narr, hl, ehl) { frames.push({ narr: narr, parts: [{ type: 'graph', directed: true, height: 62, nodes: nodes, edges: edges, hl: hl, ehl: ehl }, { type: 'vars', label: 'products state', vals: cp(state) }] }); }
        f('Initial state. Components read it through memoised selectors (e.g. <code>store.selectSignal(selectProducts)</code>).', {}, {});
        acts.forEach(function (a) {
          if (a === 'Search Changed') {
            state.query = 'lamp'; state.loading = true; state.error = 'null';
            f('Component dispatches <code>[Products Page] Search Changed { query: "lamp" }</code>. The reducer returns a <b>new</b> state with <code>loading: true</code>.', { C: 'cur', S: 'cur', R: 'ok' }, { 'C-S': 'cur', 'S-R': 'cur' });
            f('Selectors whose inputs changed recompute; the component\'s signal updates and shows a spinner. At the same time the <b>effect</b> sees the action (after reducers) and calls the API with <code>switchMap</code>.', { Sel: 'ok', E: 'cur', API: 'cur' }, { 'R-Sel': 'ok', 'Sel-C': 'ok', 'S-E': 'cur', 'E-API': 'cur' });
          } else if (a === 'Load Success') {
            state.loading = false; state.count = 3;
            f('The API answers. The effect maps the response to <code>Load Success { products }</code> and returns it; NgRx dispatches it to the store.', { API: 'ok', E: 'ok' }, { 'API-E': 'ok', 'E-S': 'ok' });
            f('Reducer stores the products and sets <code>loading: false</code>. Only components that select products or loading re-render.', { R: 'ok', Sel: 'ok', C: 'ok' }, { 'S-R': 'ok', 'R-Sel': 'ok', 'Sel-C': 'ok' });
          } else if (a === 'Load Failure') {
            state.loading = false; state.error = '"timeout"';
            f('The HTTP call fails. <code>catchError</code> <b>inside</b> the switchMap turns it into <code>Load Failure</code> so the effect stream stays alive for future searches.', { API: 'bad', E: 'cur' }, { 'API-E': 'bad', 'E-S': 'cur' });
            f('Reducer records the error; the component shows a message and a retry button.', { R: 'ok', C: 'bad' }, { 'R-Sel': 'ok', 'Sel-C': 'ok' });
          } else {
            state = { query: '', loading: false, count: 0, error: 'null' };
            f('<code>Cleared</code>: the reducer returns <code>initialState</code>. No effect listens to it, so no HTTP.', { C: 'cur', R: 'ok', Sel: 'ok' }, { 'C-S': 'cur', 'S-R': 'ok', 'R-Sel': 'ok' });
          }
        });
        return pad4(frames);
      }
    },
    examples: [
      { title: 'Choosing the right flattening operator in effects', html: `${H.table(['Operator', 'Behaviour', 'Use for'], [
        ['<code>switchMap</code>', 'Cancel the previous inner request', 'Search, typeahead, "load details for selected id"'],
        ['<code>concatMap</code>', 'Queue, one at a time, in order', 'Saving edits where order matters'],
        ['<code>exhaustMap</code>', 'Ignore new actions while one is running', 'Login, Pay, Submit buttons'],
        ['<code>mergeMap</code>', 'Run all in parallel', 'Independent deletes/likes of different items']
      ])}<p>Wrong choice = real bugs: <code>switchMap</code> on "Save" can cancel a write the user expected to happen.</p>`,
        code: { lang: 'ts', code: `import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { createActionGroup, props } from '@ngrx/store';
import { catchError, exhaustMap, map, of } from 'rxjs';
import { CheckoutApi } from './checkout.api';

export const CheckoutActions = createActionGroup({
  source: 'Checkout',
  events: {
    'Pay Clicked': props<{ cartId: string }>(),
    'Pay Success': props<{ orderId: string }>(),
    'Pay Failure': props<{ error: string }>(),
  },
});

export const pay = createEffect(
  (actions$ = inject(Actions), api = inject(CheckoutApi)) =>
    actions$.pipe(
      ofType(CheckoutActions.payClicked),
      exhaustMap(({ cartId }) =>              // a second click while paying is ignored
        api.pay(cartId).pipe(
          map(({ orderId }) => CheckoutActions.paySuccess({ orderId })),
          catchError(e => of(CheckoutActions.payFailure({ error: String(e) }))),
        ),
      ),
    ),
  { functional: true },
);` } },
      { title: 'Entities: normalised collections with SignalStore', html: `<p>Store lists as <code>{ ids, entityMap }</code> so updates by id are O(1) and there is one copy of each item. <code>withEntities</code> plus updaters (<code>setAll</code>, <code>addEntity</code>, <code>updateEntity</code>, <code>removeEntity</code>) do this for you (NgRx Store has <code>@ngrx/entity</code> for the same idea).</p>`,
        code: { lang: 'ts', code: `import { signalStore, patchState, withMethods } from '@ngrx/signals';
import { withEntities, addEntity, removeEntity, updateEntity } from '@ngrx/signals/entities';

export interface Task { id: number; title: string; done: boolean; }

export const TasksStore = signalStore(
  withEntities<Task>(),                     // adds ids(), entityMap(), entities() signals
  withMethods(store => ({
    add(title: string): void { patchState(store, addEntity({ id: Date.now(), title, done: false })); },
    toggle(id: number): void {
      patchState(store, updateEntity({ id, changes: t => ({ done: !t.done }) }));
    },
    remove(id: number): void { patchState(store, removeEntity(id)); },
  })),
);
// Provide per component: @Component({ providers: [TasksStore] }) -> state lives and dies with it.` } },
      { title: 'Decision table: which state tool?', html: `${H.table(['Situation', 'Pick'], [
        ['Toggle, hover, local input text', '<code>signal()</code> in the component'],
        ['A few shared values (user, theme, cart) in a mid-size app', 'Service with signals'],
        ['Feature with loading/error/entities and async flows', 'NgRx SignalStore (provided at feature or component level)'],
        ['Large org, many teams, complex cross-feature event flows, strong DevTools needs', 'NgRx Store + Effects'],
        ['Filters, pagination, selected tab', 'URL query params (+ <code>withComponentInputBinding</code>)'],
        ['Data fetched from the server and cached', 'Store, or <code>httpResource</code>/<code>resource</code> for simple reads']
      ])}`,
        code: { lang: 'ts', code: `import { Component, input } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { Product } from './product.api';

@Component({
  selector: 'app-product-reviews',
  standalone: true,
  template: \`
    @if (reviews.isLoading()) { <p>Loading…</p> }
    @else if (reviews.error()) { <p>Failed to load</p> }
    @else { <p>{{ reviews.value()?.length ?? 0 }} reviews</p> }
  \`,
})
export class ProductReviewsComponent {
  productId = input.required<string>();
  // Re-fetches automatically when productId() changes; older requests are cancelled.
  reviews = httpResource<Product[]>(() => \`/api/products/\${this.productId()}/reviews\`);
}` } }
    ],
    deepDive: `<p>🟣 <b>NgRx Store internals.</b> The store is a <code>BehaviorSubject</code>-like state stream. <code>dispatch</code> pushes the action through the combined reducer (all feature reducers), produces a new root state, then notifies selectors and finally the <code>Actions</code> stream that effects listen to — so effects always see the state <i>after</i> the reducer ran. <code>createSelector</code> memoises on argument references (last-args cache of size 1); returning a new array from a projector every time (e.g. <code>filter</code>) is fine because it only runs when inputs change. <code>selectSignal</code> exposes a selector as a signal, ideal for OnPush/zoneless templates. Runtime checks (<code>strictStateImmutability</code>, <code>strictActionImmutability</code>, <code>strictActionTypeUniqueness</code>) catch mistakes in dev.</p>
      <p>🟣 <b>Effect pitfalls.</b> A <code>catchError</code> placed on the outer stream (after switchMap) completes the effect: after the first error it never runs again. Always catch inside the inner observable. Effects that do not dispatch need <code>{ dispatch: false }</code>. Avoid effects that map one action to many sequential actions to model a workflow; consider a dedicated orchestration effect or a state machine.</p>
      <p>🟣 <b>SignalStore internals.</b> <code>signalStore</code> returns an injectable class. State is held in a <code>WritableSignal</code> per slice (via <code>DeepSignal</code> so nested properties are themselves signals: <code>store.user.name()</code>). <code>patchState</code> merges partial state immutably. Features compose with <code>signalStoreFeature</code> so you can build reusable <code>withLoading()</code>, <code>withPagination()</code> or <code>withDevtools()</code> (community package). Providing the store in a component's <code>providers</code> gives one instance per component (like a component store).</p>
      <p>🟣 <b>Performance.</b> Big state trees are fine; the costs are copying on update (keep updates shallow and normalise with entities) and over-broad selectors. With signals, prefer many small computed selectors to one big object; each consumer only re-renders when the specific value it reads changes (<code>computed</code> uses <code>Object.is</code>, so return stable references when nothing changed).</p>`,
    aiEra: `<p>🤖 NgRx boilerplate is exactly the kind of code AI writes well: given a feature description it can generate action groups, reducers, selectors, effects and tests. That raises the bar for the human part: deciding <b>whether</b> you need a global store at all, naming actions as events, picking <code>switchMap</code> vs <code>exhaustMap</code> correctly, and placing <code>catchError</code> inside. Older training data means AI frequently produces <code>createAction</code> per action, class-based effects with <code>@Effect()</code> (removed long ago) or <code>@ngrx/component-store</code> where SignalStore is the current recommendation; ask for the modern APIs explicitly. When AI agents operate the UI (or you log actions for analytics), an event-style action log is also a clean, replayable record of what happened.</p>`,
    problems: [{
      title: 'Build a Mini Redux Store with Memoised Selectors',
      level: 'Hard', tags: ['ngrx', 'redux', 'memoization'], companies: ['Google', 'Microsoft', 'SAP'],
      statement: `<p>Implement <code>createStore(reducer, initial)</code> with <code>dispatch(action)</code>, <code>getState()</code>, <code>subscribe(fn)</code> (returns unsubscribe), and <code>createSelector(...inputs, projector)</code> that memoises on input <b>references</b>: the projector runs only when at least one input selector result changed (<code>===</code>). Show that a cart total selector does not recompute when an unrelated slice changes.</p>`,
      constraints: `Reducers must be pure and return new objects. Up to 10<sup>4</sup> dispatches.`,
      example: `<p>Dispatch <code>add</code> (cart changes) → total recomputes. Dispatch <code>setTheme</code> (cart reference unchanged) → total ${H.c('g', 'reused from cache')}, projector not called.</p>`,
      brute: { why: `<p>Recomputing every derived value after every action is simple but wastes work, and returns <b>new references</b> each time, which makes OnPush components and signals think the data changed and re-render for nothing.</p>`,
        code: { lang: 'js', run: true, code: `let calls = 0;
const total = s => { calls++; return s.cart.reduce((a, i) => a + i.price, 0); };
const states = [{ cart: [{ price: 2 }], theme: 'light' }];
states.push({ ...states[0], theme: 'dark' });          // cart unchanged
states.forEach(total);
console.log('projector calls without memo:', calls);   // 2, one was wasted` } },
      mcq: { q: 'A reducer does <code>state.items.push(x); return state;</code>. What breaks?', options: ['Nothing, it is faster', 'Memoised selectors and OnPush see the same references and do not update', 'NgRx throws on every action in production'], answer: 1, explain: 'Change detection and memoisation compare references. Mutating in place keeps the old reference, so consumers think nothing changed (dev runtime checks will also flag it).' },
      hints: [
        `<p>Hint 1: the store is just a variable plus a list of listeners. <code>dispatch</code> = <code>state = reducer(state, action)</code> then notify.</p>`,
        `<p>Hint 2: a selector keeps <code>lastInputs</code> and <code>lastResult</code>. Compute the input values first; if each equals the cached one (<code>===</code>), return the cached result.</p>`,
        `<p>Hint 3: reducers must return the <b>same</b> slice references for untouched parts (spread at the top level only) — that is what makes the cache hit.</p>`
      ],
      solution: {
        approach: `<p>A closure over <code>state</code> and listeners for the store. For selectors, a size-1 cache keyed by input results (the NgRx/reselect strategy). Immutable updates keep unchanged slices referentially equal, so the cache hits.</p>`,
        code: { lang: 'js', run: true, code: `function createStore(reducer, initial) {
  let state = initial;
  const listeners = new Set();
  return {
    getState: () => state,
    dispatch(action) {
      state = reducer(state, action);
      listeners.forEach(fn => fn(state));
    },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
}

function createSelector(...args) {
  const projector = args.pop(), inputs = args;
  let lastIn = null, lastOut;
  const sel = state => {
    const vals = inputs.map(f => f(state));
    if (lastIn && vals.every((v, i) => v === lastIn[i])) return lastOut;  // cache hit
    sel.recomputations++;
    lastIn = vals; lastOut = projector(...vals);
    return lastOut;
  };
  sel.recomputations = 0;
  return sel;
}

function reducer(state, a) {
  switch (a.type) {
    case 'add': return { ...state, cart: [...state.cart, a.item] };       // new cart ref
    case 'setTheme': return { ...state, theme: a.theme };                 // cart ref kept
    default: return state;
  }
}

const store = createStore(reducer, { cart: [], theme: 'light' });
const selectCart = s => s.cart;
const selectTotal = createSelector(selectCart, cart => cart.reduce((t, i) => t + i.price, 0));
store.subscribe(s => console.log('total =', selectTotal(s), '| recomputations =', selectTotal.recomputations));

store.dispatch({ type: 'add', item: { name: 'Pen', price: 2 } });
store.dispatch({ type: 'setTheme', theme: 'dark' });     // total reused
store.dispatch({ type: 'add', item: { name: 'Book', price: 12 } });` },
        complexity: `<p>Dispatch is O(reducer + listeners). A selector costs O(inputs) on a hit and O(projector) on a miss. Memoisation pays off when projectors are expensive or when stable references prevent re-renders.</p>`,
        followUps: ['How would you add an effects mechanism that runs after reducers?', 'Why is a cache of size 1 usually enough for selectors?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 7 — Angular interview rounds & machine coding
     ===================================================================== */
  var MC_PLAN = [
    ['0–5', 'Clarify', 'Ask about data shape, edge cases (empty, error, slow network), must-haves vs nice-to-haves, Angular version'],
    ['5–10', 'Plan', 'Sketch components (container + presentational), state (signals/service), routes; say it out loud'],
    ['10–35', 'Core', 'Working happy path first: typed models, service, OnPush component, @for with track, signals'],
    ['35–45', 'Edges', 'Loading, empty, error states; debounce + switchMap; disable buttons while pending; validation messages'],
    ['45–52', 'Polish', 'a11y (labels, keyboard, aria-live), clean names, extract a reusable piece'],
    ['52–60', 'Explain', 'Trade-offs, what you would add with more time (tests, virtual scroll, SSR, store), performance notes']
  ];
  topics.push({
    title: 'How Angular Interview Rounds Look: Machine Coding, Concepts and Debugging',
    analogy: `<p>A machine-coding round is like a <b>cooking competition with a timer</b>. Judges do not only taste the dish; they watch how you organise your station, whether you ask what the diners are allergic to, whether you taste as you go, and whether you can explain your choices. A perfect dish served late, or a fast one with a raw centre (no error handling), both lose to a simpler, well-organised, finished dish.</p>`,
    explain: `<p>🟢 <b>What companies actually run.</b> Angular-heavy employers (enterprise SaaS, banks, consulting firms, Google-adjacent teams, product companies in India and Europe) usually combine:</p>
      ${H.table(['Round', 'Format', 'What they look for'], [
        ['Concepts / rapid fire', '30–45 min Q&amp;A', 'Change detection, OnPush, signals vs RxJS, DI hierarchy, standalone, lifecycle hooks, router guards, forms, @defer, SSR/hydration, zoneless'],
        ['<b>Machine coding</b>', '60–90 min, build a small app live (StackBlitz / local CLI)', 'Working features, clean component split, typed code, edge states, RxJS/signal correctness, a11y'],
        ['Debugging / code review', 'Given a buggy component or PR', 'Spot memory leaks (unsubscribed streams), mutation with OnPush, snapshot params, nested subscribes, missing track'],
        ['Frontend system design', '45–60 min whiteboard', 'Architecture of a big Angular app: module boundaries, lazy routes, state, caching, SSR, micro-frontends (Module Federation / Native Federation), performance budgets'],
        ['JS/TS fundamentals', 'Often a separate round', 'Closures, promises, event loop, generics, utility types']
      ])}
      <p>🔵 <b>Typical machine-coding prompts.</b> Typeahead search with debounce and cancel; paginated/sortable/filterable data table; multi-step form wizard with validation and a route guard for unsaved changes; todo/kanban with drag-and-drop (CDK); infinite scroll list; nested comments; star rating as a <code>ControlValueAccessor</code>; countdown/stopwatch; tabs/accordion component with content projection; shopping cart with totals; autocomplete with keyboard navigation.</p>
      <p>🔵 <b>A 60-minute plan</b> that works:</p>
      ${H.table(['Minutes', 'Phase', 'Do this'], MC_PLAN)}
      <p>🔵 <b>Signals that you are senior.</b> Typed interfaces for data; a service for data access (<code>HttpClient</code> or a mock with <code>of(...).pipe(delay())</code>); OnPush everywhere; <code>input()</code>/<code>output()</code>; built-in control flow (<code>@if</code>, <code>@for ... track</code>, <code>@switch</code>); no manual subscriptions without cleanup (<code>async</code> pipe, <code>toSignal</code>, <code>takeUntilDestroyed</code>); the right RxJS operator with a reason; loading/empty/error states; keyboard support. Narrate decisions as you type ("I'm using switchMap so an old response can't overwrite a newer search").</p>`,
    clues: [
      '"Build a search box that calls an API" → debounceTime + distinctUntilChanged + switchMap, loading/empty/error states, cancel on new input',
      '"You have 60 minutes, start whenever you are ready" → spend 5 minutes clarifying and planning out loud first',
      '"This component has a memory leak, find it" → subscriptions without <code>takeUntilDestroyed</code>/async pipe, listeners on window, intervals',
      '"Make this list faster" → OnPush, <code>track item.id</code>, pure pipes/computed, virtual scroll, @defer below the fold',
      '"Design the frontend for a large admin portal" → lazy feature routes, shared libs (Nx), state strategy, auth guards + interceptors, SSR choice, budgets',
      '"What changed in recent Angular versions?" → standalone default, signals, control flow, @defer, zoneless stable (v20), incremental hydration, signal forms (experimental)'
    ],
    code: [
      { lang: 'ts', title: 'Machine-coding classic: typeahead search (signals + RxJS interop, OnPush, a11y)', code: `import { ChangeDetectionStrategy, Component, Injectable, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Observable, catchError, debounceTime, delay, distinctUntilChanged, map, of, startWith, switchMap } from 'rxjs';

export interface User { id: number; name: string; }
type SearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; users: User[] }
  | { status: 'error'; message: string };

@Injectable({ providedIn: 'root' })
export class UserApi {
  private all: User[] = ['Asha', 'Ben', 'Chen', 'Divya', 'Elena', 'Farid'].map((name, id) => ({ id, name }));
  // Mock backend with latency; swap for HttpClient.get in real code.
  search(q: string): Observable<User[]> {
    return of(this.all.filter(u => u.name.toLowerCase().includes(q.toLowerCase()))).pipe(delay(300));
  }
}

@Component({
  selector: 'app-user-search',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <label for="q">Search users</label>
    <input id="q" [value]="query()" (input)="query.set($any($event.target).value)" autocomplete="off" />
    <div aria-live="polite">
      @switch (state().status) {
        @case ('loading') { <p>Searching…</p> }
        @case ('error') { <p role="alert">Something went wrong.</p> }
        @case ('done') {
          @if (results().length) {
            <ul>@for (u of results(); track u.id) { <li>{{ u.name }}</li> }</ul>
          } @else { <p>No users found.</p> }
        }
      }
    </div>
  \`,
})
export class UserSearchComponent {
  private api = inject(UserApi);
  query = signal('');

  // signal -> observable -> async pipeline -> signal. No manual subscribe, no leak.
  state = toSignal(
    toObservable(this.query).pipe(
      map(q => q.trim()),
      debounceTime(300),                 // wait until typing pauses
      distinctUntilChanged(),            // ignore same query
      switchMap((q): Observable<SearchState> =>
        q.length < 2
          ? of({ status: 'idle' } as SearchState)
          : this.api.search(q).pipe(
              map(users => ({ status: 'done', users }) as SearchState),
              startWith({ status: 'loading' } as SearchState),
              catchError(() => of({ status: 'error', message: 'failed' } as SearchState)),
            )),                          // switchMap: a new query cancels the old request
    ),
    { initialValue: { status: 'idle' } as SearchState },
  );

  results(): User[] {
    const s = this.state();
    return s.status === 'done' ? s.users : [];
  }
}` }
    ],
    viz: {
      title: 'Your 60-minute machine-coding round, phase by phase',
      input: '60',
      inputLabel: 'Total minutes available (45 to 120)',
      gen: function (input) {
        var total = parseInt(input, 10);
        if (isNaN(total) || total < 45 || total > 120) throw new Error('Enter minutes between 45 and 120');
        var weights = [5, 5, 25, 10, 7, 8], sum = 60, t = 0, rows = [], frames = [];
        var tips = [
          'Do not touch the keyboard yet. Restate the problem, ask 3–5 questions, agree on scope. Interviewers score this.',
          'Name your components and data flow before coding. A tiny sketch: <code>SearchPage</code> (container, state) → <code>ResultList</code> (presentational, OnPush, inputs only).',
          'Build the happy path end to end first. A working ugly app beats a beautiful half-app. Mock the API with <code>of(data).pipe(delay(300))</code> if none is given.',
          'Add the states real users hit: loading, empty, error, double-submit, fast typing (debounce + switchMap).',
          'Accessibility and polish: labels, focus, keyboard, <code>aria-live</code> for async results. Rename unclear things.',
          'Stop coding. Explain trade-offs and "with more time I would...": tests, virtual scroll, caching, store, SSR.'
        ];
        MC_PLAN.forEach(function (p, i) {
          var mins = Math.round(weights[i] * total / sum);
          rows.push([t + '–' + (t + mins), p[1], p[2]]);
          t += mins;
          var hl = {}; hl[i] = 'cur';
          frames.push({ narr: '<b>' + p[1] + '</b> (' + mins + ' min). ' + tips[i], parts: [
            { type: 'table', label: 'plan for ' + total + ' minutes', columns: ['minutes', 'phase', 'what to do'], rows: rows.map(function (r) { return r.slice(); }), hl: hl },
            { type: 'bars', label: 'time used (min)', values: rows.map(function (r) { var a = r[0].split('–'); return Number(a[1]) - Number(a[0]); }), texts: rows.map(function (r) { return r[1]; }), hl: hl }
          ] });
        });
        return pad4(frames);
      }
    },
    examples: [
      { title: 'Code-review round: spot the five bugs', html: `<p>A very common interview format. Read the component, then compare with the fixes below.</p>
        ${H.table(['Bug', 'Why it hurts', 'Fix'], [
          ['<code>subscribe</code> in ngOnInit without cleanup', 'Leak: keeps running after the component is destroyed', '<code>async</code> pipe, <code>toSignal</code>, or <code>takeUntilDestroyed()</code>'],
          ['Nested <code>subscribe</code> inside <code>subscribe</code>', 'No cancellation, race conditions, callback pyramid', '<code>switchMap</code>/<code>concatMap</code>'],
          ['<code>snapshot.paramMap</code> on a reused route', 'Stale data when id changes', 'Input binding or <code>paramMap</code> stream'],
          ['<code>this.items.push()</code> with OnPush child', 'Child never updates', 'New array / signal update'],
          ['<code>@for</code> tracking by object identity on refetched data', 'All DOM rows re-created on each refetch', '<code>track item.id</code>']
        ])}`,
        code: { lang: 'ts', code: `import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';

// BUGGY on purpose: used in code-review interview rounds.
@Component({
  selector: 'app-orders-buggy',
  standalone: true,
  template: \`@for (o of orders; track o) { <app-order-row [order]="o" /> }\`,
})
export class OrdersBuggyComponent implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  orders: any[] = [];

  ngOnInit(): void {
    const userId = this.route.snapshot.paramMap.get('id');            // bug 3
    this.http.get<any>('/api/users/' + userId).subscribe(user => {     // bug 1 (no cleanup)
      this.http.get<any[]>('/api/orders?user=' + user.id).subscribe(os => {  // bug 2 (nested)
        os.forEach(o => this.orders.push(o));                            // bug 4 (mutation)
      });
    });
  }
}` } },
      { title: 'Rapid-fire questions you should answer in one breath', html: `${H.table(['Question', 'One-breath answer'], [
        ['Standalone vs NgModule?', 'Standalone components declare their own <code>imports</code>; default since v19; NgModules still work for legacy code'],
        ['Signals vs RxJS?', 'Signals for synchronous state and derived values; RxJS for events over time (debounce, cancel, retry). Bridge with <code>toSignal</code>/<code>toObservable</code>'],
        ['<code>providedIn: \'root\'</code> vs component <code>providers</code>?', 'Root = one tree-shakable singleton; component providers = a new instance per component instance'],
        ['<code>ngOnChanges</code> vs <code>effect</code>/<code>computed</code> on inputs?', 'With signal inputs derive with <code>computed</code>; use effects only for side effects'],
        ['What does <code>track</code> do?', 'Gives each row a stable identity so Angular moves DOM nodes instead of recreating them'],
        ['Why OnPush?', 'Skips checking a subtree unless inputs, events, async pipe or signals mark it dirty']
      ])}`,
        code: { lang: 'ts', code: `import { Component, computed, input } from '@angular/core';

// Answering "derive from inputs" the modern way: no ngOnChanges needed.
@Component({
  selector: 'app-price-tag',
  standalone: true,
  template: \`<span [class.sale]="onSale()">{{ label() }}</span>\`,
})
export class PriceTagComponent {
  price = input.required<number>();
  discount = input(0);                           // percent
  final = computed(() => +(this.price() * (1 - this.discount() / 100)).toFixed(2));
  onSale = computed(() => this.discount() > 0);
  label = computed(() => (this.onSale() ? \`\${this.final()} (was \${this.price()})\` : \`\${this.price()}\`));
}` } },
      { title: 'Machine coding: reusable tabs with content projection', html: `<p>Shows component API design: parent queries children with <code>contentChildren</code> (signal query), keyboard support, and a single source of truth for the active tab.</p>`,
        code: { lang: 'ts', code: `import { ChangeDetectionStrategy, Component, computed, contentChildren, effect, input, signal } from '@angular/core';

@Component({
  selector: 'app-tab',
  standalone: true,
  host: { role: 'tabpanel', '[hidden]': '!visible()' },
  template: \`<ng-content />\`,
})
export class TabComponent {
  label = input.required<string>();
  visible = signal(false);                    // set by the parent TabsComponent
}

@Component({
  selector: 'app-tabs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <div role="tablist" (keydown.arrowRight)="move(1)" (keydown.arrowLeft)="move(-1)">
      @for (t of tabs(); track $index) {
        <button role="tab" [attr.aria-selected]="$index === active()" [tabIndex]="$index === active() ? 0 : -1"
                (click)="active.set($index)">{{ t.label() }}</button>
      }
    </div>
    <ng-content />
  \`,
})
export class TabsComponent {
  tabs = contentChildren(TabComponent);       // signal query: updates when projected tabs change
  active = signal(0);
  private count = computed(() => this.tabs().length);

  constructor() {
    // Single source of truth: the active index decides which projected tab is visible.
    effect(() => this.tabs().forEach((t, i) => t.visible.set(i === this.active())));
  }

  move(step: number): void {
    const n = this.count();
    if (n) this.active.update(i => (i + step + n) % n);
  }
}
// Usage: <app-tabs><app-tab label="One">A</app-tab><app-tab label="Two">B</app-tab></app-tabs>` } }
    ],
    deepDive: `<p>🟣 <b>How you are scored.</b> Most rubrics have 4–6 axes: <b>problem understanding</b> (questions, scope), <b>working solution</b> (does the core flow work?), <b>code quality</b> (naming, small components, types, no <code>any</code> soup), <b>framework fluency</b> (idiomatic Angular: DI, OnPush, signals, control flow, forms, router), <b>edge cases and UX</b> (loading/error/empty, a11y), and <b>communication</b>. Senior candidates are also judged on trade-off talk: "signals for this local state; NgRx only if multiple features need it", "resolver vs skeleton", "SSR not needed for an internal admin tool".</p>
      <p>🟣 <b>Environment tips.</b> Practise in the setup the company uses (StackBlitz Angular template, or <code>ng new --ssr=false --style=css</code> locally). Know how to add <code>provideHttpClient()</code> and <code>provideRouter()</code> from memory, how to mock an API with RxJS (<code>of</code>, <code>delay</code>, <code>throwError</code>), and how to read compiler errors fast. Keep one file per component only if time allows; a single file with several standalone components is acceptable in a timed round, if you say so.</p>
      <p>🟣 <b>Version awareness as a signal.</b> Interviewers in 2026 notice whether you write <code>*ngIf</code>/<code>*ngFor</code> and <code>@Input()</code> (fine but dated) or <code>@if</code>/<code>@for</code>, <code>input()</code>, <code>output()</code>, <code>model()</code>, <code>inject()</code>, and whether you know zoneless is the default in new apps. Being able to explain migration paths (control-flow schematic, signal input migration, gradual zoneless) is valuable for companies with large legacy Angular codebases (AngularJS → Angular migrations still exist in banks and enterprises).</p>
      <p>🟣 <b>System design for Angular.</b> Expect: monorepo with Nx and enforced library boundaries, lazy feature routes, shared UI library (design system with CDK/Material), HTTP interceptors for auth tokens/retries/errors (<code>HttpInterceptorFn</code>), global error handler, i18n strategy, SSR or prerender decisions per route, micro-frontends with Native Federation only when independent deployability is really needed, and performance budgets in CI.</p>`,
    aiEra: `<p>🤖 Many companies now allow (or even expect) AI assistants in take-home tasks and some live rounds, while others explicitly ban them. Either way the signal they look for shifted: can you <b>direct and verify</b> generated code? In an AI-allowed round, generate the boilerplate (types, mock data, CSS) fast, then spend your time on the parts AI gets wrong: cancellation semantics, OnPush/signal correctness, cleanup, accessibility, and edge states. Narrate what you checked. In AI-free rounds, the same fundamentals must come from your fingers, so practise typing the typeahead, form wizard, and data-table patterns from memory. Interviewers increasingly ask "the AI wrote this component; review it" — the code-review example above is exactly that format.</p>`,
    problems: [{
      title: 'Typeahead Pipeline Without a Framework: debounce + latest-wins',
      level: 'Hard', tags: ['machine coding', 'debounce', 'switchMap', 'race conditions'], companies: ['Google', 'Microsoft', 'Swiggy', 'Flipkart'],
      statement: `<p>The heart of the most common Angular machine-coding task, in plain JS. Write <code>createTypeahead(search, waitMs)</code> returning <code>onInput(text)</code>. It must: trim the text; ignore it if it equals the last searched text; wait until the user stops typing for <code>waitMs</code> (debounce); call <code>search(text)</code> (returns a Promise); and only render results for the <b>latest</b> query (an older slow response must be dropped). Queries shorter than 2 characters clear the results without calling the API.</p>`,
      constraints: `Use setTimeout for debounce. The search mock has random-ish latency; your output must still end with the latest query's results.`,
      example: `<p>User types <code>a</code>, <code>an</code>, <code>ann</code> quickly (50 ms apart) with a 200 ms debounce: only ${H.c('g', 'search("ann")')} is called. If the user then types <code>anna</code> while <code>ann</code> is still loading, the <code>ann</code> results are ignored when they arrive.</p>`,
      brute: { why: `<p>Calling the API on every keystroke floods the server, and rendering each response as it arrives causes flicker and stale results when responses come back out of order. This is exactly what <code>debounceTime</code> + <code>switchMap</code> solve in RxJS.</p>`,
        code: { lang: 'js', run: true, code: `const latency = { an: 120, ann: 20 };
const search = q => new Promise(r => setTimeout(() => r(q + '-results'), latency[q] || 50));
let shown = '';
['an', 'ann'].forEach(q => search(q).then(res => { shown = res; console.log('render', res); }));
setTimeout(() => console.log('final (stale!):', shown), 200);` } },
      mcq: { q: 'In Angular, which RxJS pipeline matches this behaviour?', options: ['<code>mergeMap(search)</code>', '<code>debounceTime(300), distinctUntilChanged(), switchMap(search)</code>', '<code>concatMap(search)</code>', '<code>exhaustMap(search)</code>'], answer: 1, explain: 'Debounce waits for a pause, distinct skips repeats, switchMap cancels the previous request so only the latest query renders.' },
      hints: [
        `<p>Hint 1: debounce = clear the previous timer on every input and start a new one.</p>`,
        `<p>Hint 2: "latest wins" = increment a request id before each search; when a promise resolves, compare its id to the current id.</p>`,
        `<p>Hint 3: handle short queries and duplicates before scheduling. Also catch errors so a failed request shows an error state instead of breaking later searches.</p>`
      ],
      solution: {
        approach: `<p>Combine a timer (debounce) with a request counter (switchMap-style cancellation). The counter must change when a newer query is <i>sent</i>, so any older in-flight promise sees a mismatched id and is dropped.</p>`,
        code: { lang: 'js', run: true, code: `function createTypeahead(search, waitMs, render) {
  let timer = null, lastQuery = null, reqId = 0;
  return function onInput(raw) {
    const q = raw.trim();
    clearTimeout(timer);                               // debounce: restart the wait
    timer = setTimeout(() => {
      if (q === lastQuery) return;                     // distinctUntilChanged
      lastQuery = q;
      const my = ++reqId;                              // newer query invalidates older ones
      if (q.length < 2) { render('idle', []); return; }
      render('loading', []);
      search(q)
        .then(res => { if (my === reqId) render('done', res); else console.log('  dropped stale', q); })
        .catch(() => { if (my === reqId) render('error', []); });
    }, waitMs);
  };
}

// Mock API: 'ann' is slow, 'anna' is fast -> responses arrive out of order.
const names = ['Ann', 'Anna', 'Annie', 'Ben'];
const latency = { ann: 300, anna: 50 };
const search = q => new Promise(res =>
  setTimeout(() => res(names.filter(n => n.toLowerCase().startsWith(q))), latency[q] ?? 80));

const onInput = createTypeahead(search, 100, (status, items) => console.log(status, JSON.stringify(items)));
const typed = [[0, 'a'], [40, 'an'], [80, 'ann'], [250, 'anna'], [300, 'anna ']];
for (const [t, text] of typed) setTimeout(() => onInput(text), t);` },
        complexity: `<p>One API call per pause in typing, O(1) work per keystroke. The pattern is identical to the Angular version: <code>debounceTime</code> is the timer, <code>distinctUntilChanged</code> is <code>lastQuery</code>, <code>switchMap</code> is the request id (plus real cancellation of the HTTP call).</p>`,
        followUps: ['How would you add keyboard navigation (up/down/enter) and aria-activedescendant?', 'How would you cache results per query?']
      }
    }]
  });

  /* =====================================================================
     PRACTICE ARENA — Easy → Medium → Hard
     ===================================================================== */
  practice.push({
    title: 'Fix the Route Order',
    level: 'Easy', tags: ['router', 'config'], companies: ['TCS', 'Infosys', 'Capgemini'],
    statement: `<p>A teammate's route list renders the wrong pages. Write <code>fixOrder(paths)</code> that returns the routes reordered so first-match-wins behaves as intended: within the same segment count, routes with more <b>literal</b> segments come before routes with parameters, and <code>**</code> always goes last. Keep the original relative order otherwise (stable).</p>`,
    constraints: `Up to 100 paths. Paths have no leading slash. <code>''</code> counts as 0 segments.`,
    example: `<p><code>['**', 'users/:id', 'users/new', '']</code> → ${H.c('g', "['', 'users/new', 'users/:id', '**']")}. Before the fix, <code>/users/new</code> showed the profile of a user called "new", and nothing after <code>**</code> was reachable.</p>`,
    brute: { why: `<p>Sorting alphabetically looks tidy but has nothing to do with matching: <code>:id</code> sorts before <code>new</code> (":" is before letters in ASCII), which is exactly the bug.</p>`,
      code: { lang: 'js', run: true, code: `const sorted = ['**', 'users/:id', 'users/new', ''].slice().sort();
console.log(sorted); // [ '', '**', 'users/:id', 'users/new' ]  -> wildcard early, param before literal` } },
    mcq: { q: 'Where must <code>{ path: \'**\' }</code> go?', options: ['First, so 404s are fast', 'Last, because it matches everything', 'Anywhere, the router finds the best match'], answer: 1, explain: 'First match wins. A wildcard anywhere but last hides every route after it.' },
    hints: [
      `<p>Hint 1: give each route a sort key; the wildcard gets the largest key.</p>`,
      `<p>Hint 2: count literal segments vs param segments. More literals means more specific.</p>`,
      `<p>Hint 3: <code>Array.prototype.sort</code> is stable in modern JS, so equal keys keep their order. Compare by: wildcard flag, then number of params ascending.</p>`
    ],
    solution: {
      approach: `<p>Stable sort with a specificity key: wildcard last; otherwise fewer <code>:param</code> segments first. Literal-heavy routes then win before generic ones, which is what the author meant.</p>`,
      code: { lang: 'js', run: true, code: `function fixOrder(paths) {
  const key = p => {
    if (p === '**') return [1, 0];
    const params = p.split('/').filter(s => s.startsWith(':')).length;
    return [0, params];
  };
  return paths.slice().sort((a, b) => {
    const ka = key(a), kb = key(b);
    return ka[0] - kb[0] || ka[1] - kb[1];
  });
}
console.log(fixOrder(['**', 'users/:id', 'users/new', '']));
console.log(fixOrder(['orgs/:org/repos/:repo', 'orgs/:org/repos/new', 'orgs/angular/repos/:repo', '**']));` },
      complexity: `<p>O(n log n). In a real app you would rather keep the config readable and add a unit test asserting key URLs resolve to the expected component.</p>`
    }
  });

  practice.push({
    title: 'Compose Validators into One Error Object',
    level: 'Easy', tags: ['validators', 'forms'], companies: ['Accenture', 'Wipro'],
    statement: `<p>Implement <code>compose(...validators)</code> returning one validator that runs all of them on a control value and merges their error objects. Return <code>null</code> when there are no errors (never an empty object). Provide <code>required</code>, <code>minLength(n)</code> and <code>pattern(re)</code> like Angular's (note: Angular's <code>minLength</code> and <code>pattern</code> skip empty values so that only <code>required</code> reports them).</p>`,
    constraints: `Values are strings, <code>null</code> or <code>undefined</code>.`,
    example: `<p><code>compose(required, minLength(3))('')</code> → ${H.c('r', '{ required: true }')} (minLength stays quiet on empty). <code>('ab')</code> → <code>{ minlength: { requiredLength: 3, actualLength: 2 } }</code>. <code>('abc')</code> → ${H.c('g', 'null')}.</p>`,
    brute: { why: `<p>Returning <code>{}</code> when everything passes is a classic bug: Angular treats any non-null return as "has errors", so the control is INVALID with no message to show.</p>`,
      code: { lang: 'js', run: true, code: `const composeBad = (...vs) => v => Object.assign({}, ...vs.map(f => f(v)));
const req = v => (v ? null : { required: true });
console.log(composeBad(req)('hello')); // {}  -> treated as an error!` } },
    mcq: { q: 'A validator returns <code>{}</code> for a valid value. What is the control status?', options: ['VALID', 'INVALID', 'PENDING'], answer: 1, explain: 'Only <code>null</code> means valid. An empty object is still an errors object.' },
    hints: [
      `<p>Hint 1: run every validator and collect only the non-null results first.</p>`,
      `<p>Hint 2: merge them with <code>Object.assign</code>; if nothing was collected, return null.</p>`,
      `<p>Hint 3: in <code>minLength</code> and <code>pattern</code>, return null for empty values so messages do not pile up.</p>`
    ],
    solution: {
      approach: `<p>Filter, merge, and normalise "no errors" to <code>null</code>. This mirrors <code>Validators.compose</code>.</p>`,
      code: { lang: 'js', run: true, code: `const isEmpty = v => v == null || v === '';
const required = v => (isEmpty(v) ? { required: true } : null);
const minLength = n => v => (isEmpty(v) || v.length >= n ? null : { minlength: { requiredLength: n, actualLength: v.length } });
const pattern = re => v => (isEmpty(v) || re.test(v) ? null : { pattern: { requiredPattern: String(re), actualValue: v } });

function compose(...validators) {
  return value => {
    const errs = validators.map(fn => fn(value)).filter(e => e !== null);
    return errs.length ? Object.assign({}, ...errs) : null;
  };
}

const username = compose(required, minLength(3), pattern(/^[a-z0-9_]+$/));
for (const v of ['', 'ab', 'Ab!', 'ann_9', null]) console.log(JSON.stringify(v), '->', JSON.stringify(username(v)));` },
      complexity: `<p>O(V) per value for V validators.</p>`
    }
  });

  practice.push({
    title: 'How Many DOM Rows Does @for Recreate?',
    level: 'Easy', tags: ['control flow', 'track', 'performance'], companies: ['Google', 'Siemens'],
    statement: `<p>After a refetch, a list gets brand-new objects with the same ids. Write <code>rowsCreated(oldList, newList, trackFn)</code> that returns how many rows Angular must <b>create</b> (keys in the new list not present in the old list). Compare <code>track item</code> (object identity) with <code>track item.id</code>.</p>`,
    constraints: `Lists up to 10<sup>4</sup> items; ids unique.`,
    example: `<p>Old <code>[{id:1},{id:2},{id:3}]</code>, new list = same ids but new objects. <code>track item</code> → ${H.c('r', '3 created')} (and 3 destroyed). <code>track item.id</code> → ${H.c('g', '0 created')}.</p>`,
    brute: { why: `<p>Assuming "same data, same DOM" is the trap. Identity tracking compares object references, so every refetch looks like a totally new list.</p>`,
      code: { lang: 'js', run: true, code: `const a = { id: 1 }, b = { id: 1 };
console.log('same data?', JSON.stringify(a) === JSON.stringify(b), '| same identity?', a === b);` } },
    mcq: { q: 'Why does Angular require <code>track</code> in <code>@for</code>?', options: ['For sorting', 'So you consciously pick a stable identity and avoid needless DOM re-creation', 'It is only for SSR'], answer: 1, explain: 'Making track mandatory forces a decision; a good key (id) lets Angular move/keep rows instead of recreating them.' },
    hints: [
      `<p>Hint 1: compute the track key of every old item and put the keys in a Set.</p>`,
      `<p>Hint 2: count the new items whose track key is not in that Set: those rows are created.</p>`,
      `<p>Hint 3: with identity tracking the key is the object itself, so a Set of objects works the same way.</p>`
    ],
    solution: {
      approach: `<p>Set difference of keys. It shows why <code>track item.id</code> keeps DOM (and focus, scroll, CSS transitions, child component state) across refetches.</p>`,
      code: { lang: 'js', run: true, code: `function rowsCreated(oldList, newList, trackFn) {
  const old = new Set(oldList.map(trackFn));
  return newList.filter(x => !old.has(trackFn(x))).length;
}
const before = [{ id: 1, n: 'a' }, { id: 2, n: 'b' }, { id: 3, n: 'c' }];
const after = [{ id: 1, n: 'a' }, { id: 2, n: 'B' }, { id: 4, n: 'd' }];   // fresh objects from the API
console.log('track item    ->', rowsCreated(before, after, x => x));
console.log('track item.id ->', rowsCreated(before, after, x => x.id));` },
      complexity: `<p>O(n + m). Angular's real algorithm also detects moves (a reorder keeps rows and just moves DOM nodes).</p>`
    }
  });

  practice.push({
    title: 'Run the Guard Chain',
    level: 'Medium', tags: ['router', 'guards'], companies: ['Microsoft', 'JPMorgan'],
    statement: `<p>Model the guard phase of a navigation. Input: <code>canDeactivate</code> guards of the page being left, and <code>canActivate</code> guards of the target (parent first). Each guard is a function returning <code>true</code>, <code>false</code>, a redirect string like <code>'/login'</code> (a UrlTree), or a Promise of those. Return <code>{ result: 'navigate' | 'cancel' | 'redirect', to? }</code>. Order: all canDeactivate first, then canActivate in order; the first non-true result decides.</p>`,
    constraints: `Up to 20 guards. Promises may resolve in any order but the decision follows guard order.`,
    example: `<p>Leaving an edited form (<code>confirm → false</code>): ${H.c('r', 'cancel')}, and the auth guard never runs. Logged out: ${H.c('y', 'redirect /login')}.</p>`,
    brute: { why: `<p>Running guards in parallel and taking whichever answers first makes the outcome depend on network timing. Angular evaluates results in a defined priority order so a redirect from a parent guard wins over a child's.</p>`,
      code: { lang: 'js', run: true, code: `const slow = () => new Promise(r => setTimeout(() => r('/login'), 30));
const fast = () => Promise.resolve(false);
Promise.race([slow(), fast()]).then(r => console.log('race picked:', r, '(timing-dependent, wrong rule)'));` } },
    mcq: { q: 'Which guard type runs first in a navigation from page A to page B?', options: ['canActivate of B', 'canDeactivate of A', 'resolvers of B'], answer: 1, explain: 'Leaving is checked before entering; resolvers run only after all guards pass.' },
    hints: [
      `<p>Hint 1: concatenate the two lists in the right order.</p>`,
      `<p>Hint 2: <code>await</code> each guard in a loop; <code>await</code> works on plain values too.</p>`,
      `<p>Hint 3: map result types: string → redirect, false → cancel, true → continue.</p>`
    ],
    solution: {
      approach: `<p>Sequential evaluation in priority order with early exit. (Angular actually starts guards concurrently but still honours priority order when combining results; the observable outcome matches this model.)</p>`,
      code: { lang: 'js', run: true, code: `async function runGuards(canDeactivate, canActivate) {
  for (const g of [...canDeactivate, ...canActivate]) {
    const r = await g();
    if (r === true) continue;
    if (typeof r === 'string') return { result: 'redirect', to: r };
    return { result: 'cancel' };
  }
  return { result: 'navigate' };
}

const unsaved = () => false;                                    // user pressed Cancel in confirm()
const saved = () => true;
const auth = loggedIn => () => new Promise(r => setTimeout(() => r(loggedIn ? true : '/login'), 10));
const admin = () => Promise.resolve(true);

(async () => {
  console.log(await runGuards([unsaved], [auth(true), admin]));   // cancel
  console.log(await runGuards([saved], [auth(false), admin]));    // redirect /login
  console.log(await runGuards([saved], [auth(true), admin]));     // navigate
})();` },
      complexity: `<p>O(G) guard calls in the worst case. Keep guards cheap: cache auth state in a service instead of calling the server per navigation.</p>`
    }
  });

  practice.push({
    title: 'Cross-Field Validator: Date Range and Matching Passwords',
    level: 'Medium', tags: ['validators', 'cross-field'], companies: ['Oracle', 'Amadeus'],
    statement: `<p>Write two group-level validators: <code>dateRange('start', 'end', maxDays)</code> → <code>{ dateOrder: true }</code> if end is before start, <code>{ rangeTooLong: { max, actual } }</code> if longer than <code>maxDays</code>; and <code>matchFields('password', 'confirm')</code> → <code>{ mismatch: true }</code>. Both return <code>null</code> when either field is empty (let <code>required</code> handle that).</p>`,
    constraints: `Dates are ISO strings <code>YYYY-MM-DD</code>. Use UTC to avoid timezone surprises.`,
    example: `<p><code>{ start: '2026-01-10', end: '2026-01-05' }</code> → ${H.c('r', '{ dateOrder: true }')}. <code>{ start: '2026-01-01', end: '2026-03-15' }</code> with max 30 → ${H.c('r', '{ rangeTooLong: { max: 30, actual: 73 } }')}.</p>`,
    brute: { why: `<p>Putting the check on the <code>end</code> control alone fails: when the user edits <code>start</code>, the end control's validator does not re-run, so the error is stale. Group validators run whenever any child changes.</p>`,
      code: { lang: 'js', run: true, code: `// Validator on the end control only: re-runs only when end changes
let start = '2026-01-01';
const endValidator = end => (end < start ? { dateOrder: true } : null);
console.log(endValidator('2026-01-05')); // null
start = '2026-02-01';                     // user edits start; end validator does NOT run again
console.log('error shown is stale until end changes');` } },
    mcq: { q: 'Where should "password and confirm must match" live?', options: ['On the confirm control', 'On the parent FormGroup', 'In the submit handler only'], answer: 1, explain: 'The rule depends on two controls, so it belongs to their common parent; it re-runs when either changes.' },
    hints: [
      `<p>Hint 1: a group validator receives the group; read both child values.</p>`,
      `<p>Hint 2: parse dates with <code>Date.UTC</code> pieces or <code>new Date(iso + 'T00:00:00Z')</code> and divide the difference by 86 400 000.</p>`,
      `<p>Hint 3: return null early if either value is empty.</p>`
    ],
    solution: {
      approach: `<p>Both are factories returning a function of the group value. Errors live on the group; templates show them near the second field when it is touched.</p>`,
      code: { lang: 'js', run: true, code: `const DAY = 86400000;
const toUtc = iso => Date.parse(iso + 'T00:00:00Z');

const dateRange = (a, b, maxDays) => group => {
  const s = group[a], e = group[b];
  if (!s || !e) return null;
  const days = Math.round((toUtc(e) - toUtc(s)) / DAY);
  if (days < 0) return { dateOrder: true };
  if (days > maxDays) return { rangeTooLong: { max: maxDays, actual: days } };
  return null;
};
const matchFields = (a, b) => group => (group[a] && group[b] && group[a] !== group[b] ? { mismatch: true } : null);

const range = dateRange('start', 'end', 30);
console.log(JSON.stringify(range({ start: '2026-01-10', end: '2026-01-05' })));
console.log(JSON.stringify(range({ start: '2026-01-01', end: '2026-03-15' })));
console.log(JSON.stringify(range({ start: '2026-01-01', end: '2026-01-20' })));
const pw = matchFields('password', 'confirm');
console.log(JSON.stringify(pw({ password: 'S3cret!', confirm: 'S3cret' })), JSON.stringify(pw({ password: 'x', confirm: '' })));` },
      complexity: `<p>O(1) per run. Group validators run on every child change, so keep them cheap.</p>`
    }
  });

  practice.push({
    title: 'Dynamic FormArray: Add, Remove, Validate',
    level: 'Medium', tags: ['forms', 'FormArray'], companies: ['SAP', 'Salesforce'],
    statement: `<p>Model a "phones" <code>FormArray</code>: <code>push(value)</code>, <code>removeAt(i)</code>, <code>value()</code>, <code>status()</code>. Each phone is required and must match <code>/^\\+?\\d{7,15}$/</code>. The array also has an array-level validator: at most 3 phones and <b>no duplicates</b> (<code>{ duplicate: [indexes] }</code>). Status is INVALID if any item or the array validator fails.</p>`,
    constraints: `Up to 20 operations.`,
    example: `<p>push '+4912345678', push '+4912345678' → ${H.c('r', 'INVALID { duplicate: [1] }')}; removeAt(1) → ${H.c('g', 'VALID')}.</p>`,
    brute: { why: `<p>Validating only individual items misses rules about the collection (max size, uniqueness). Angular lets you attach validators to the FormArray itself for exactly this.</p>`,
      code: { lang: 'js', run: true, code: `const phones = ['+4912345678', '+4912345678'];
console.log(phones.every(p => /^\\+?\\d{7,15}$/.test(p)) ? 'VALID (missed duplicate!)' : 'INVALID');` } },
    mcq: { q: 'After <code>removeAt(i)</code>, what should the template use as the <code>@for</code> track for FormArray rows?', options: ['<code>track $index</code> is common; better: track the control object itself', 'A random number', 'The current value string'], answer: 0, explain: 'Values change while typing (bad key). The control instance is a stable identity for the row; $index works for simple cases.' },
    hints: [
      `<p>Hint 1: store items as objects <code>{ value }</code> so each has a stable identity.</p>`,
      `<p>Hint 2: item errors: run the regex per item. Array errors: count and find duplicates with a Map from value to first index.</p>`,
      `<p>Hint 3: status = INVALID if any item error or array error.</p>`
    ],
    solution: {
      approach: `<p>Two levels of validation, like Angular: per-control validators and an array validator over all values. Recompute on each operation.</p>`,
      code: { lang: 'js', run: true, code: `const PHONE = /^\\+?\\d{7,15}$/;
function phonesArray(max = 3) {
  const items = [];
  const itemErr = v => (!v ? { required: true } : PHONE.test(v) ? null : { pattern: true });
  const arrayErr = () => {
    const seen = new Map(), dup = [];
    items.forEach((it, i) => { if (it.value && seen.has(it.value)) dup.push(i); else seen.set(it.value, i); });
    const e = {};
    if (dup.length) e.duplicate = dup;
    if (items.length > max) e.maxItems = { max, actual: items.length };
    return Object.keys(e).length ? e : null;
  };
  return {
    push(v) { items.push({ value: v }); return this; },
    removeAt(i) { items.splice(i, 1); return this; },
    value: () => items.map(i => i.value),
    status() {
      const ie = items.map(i => itemErr(i.value));
      const ae = arrayErr();
      return { status: ie.some(Boolean) || ae ? 'INVALID' : 'VALID', items: ie, array: ae };
    },
  };
}

const fa = phonesArray();
fa.push('+4912345678').push('+4912345678');
console.log(JSON.stringify(fa.status()));
fa.removeAt(1).push('12');
console.log(JSON.stringify(fa.status()));
fa.removeAt(1).push('+15551234567');
console.log(JSON.stringify(fa.value()), fa.status().status);` },
      complexity: `<p>O(n) per recomputation. For huge arrays, use <code>updateOn: 'blur'</code> and virtual scrolling.</p>`
    }
  });

  practice.push({
    title: 'Load a Lazy Route Chunk Exactly Once',
    level: 'Medium', tags: ['lazy loading', 'promises', 'caching'], companies: ['Google', 'Adobe'],
    statement: `<p>Two quick navigations to <code>/reports</code> (or a navigation plus a preload) must not download the chunk twice. Write <code>lazy(loader)</code> that wraps a <code>() =&gt; Promise</code> so: concurrent calls share the same in-flight promise; later calls return the cached result; and if loading <b>fails</b>, the cache is cleared so the next call can retry (e.g. after a network blip or a new deploy).</p>`,
    constraints: `The loader may reject. Do not cache failures.`,
    example: `<p>Three calls at the same time → ${H.c('g', 'loader runs once')}. First attempt rejects, second call → ${H.c('y', 'loader runs again')} and succeeds.</p>`,
    brute: { why: `<p>Caching only the <b>result</b> (after it resolves) misses concurrent callers: they all see an empty cache and all start a download. Caching the promise forever also caches a rejection, so one failed chunk load breaks the route until a full page reload.</p>`,
      code: { lang: 'js', run: true, code: `let runs = 0, cache = null;
const loader = () => new Promise(r => setTimeout(() => { runs++; r('ReportsComponent'); }, 10));
const get = async () => cache ?? (cache = await loader());
Promise.all([get(), get(), get()]).then(() => console.log('downloads:', runs)); // 3` } },
    mcq: { q: 'How does Angular avoid downloading a lazy route twice?', options: ['It caches the loaded component/routes on the route config after the first load', 'The browser always caches JS so it does not matter', 'It does download twice'], answer: 0, explain: 'The router stores the loaded result (and in-flight loader) on the route; the browser module cache also dedupes import() of the same URL.' },
    hints: [
      `<p>Hint 1: store the <b>promise</b>, not the value, as soon as the first call starts.</p>`,
      `<p>Hint 2: attach a <code>.catch</code> that resets the stored promise and re-throws.</p>`,
      `<p>Hint 3: chunk load errors after a deploy (old chunk names gone) are a real production issue: retry once, then show "new version available, reload".</p>`
    ],
    solution: {
      approach: `<p>Promise memoisation with failure eviction: the standard pattern behind router lazy-loading and <code>import()</code> deduplication.</p>`,
      code: { lang: 'js', run: true, code: `function lazy(loader) {
  let p = null;
  return () => {
    if (!p) {
      p = loader().catch(err => { p = null; throw err; });   // don't cache failures
    }
    return p;
  };
}

let runs = 0, failNext = true;
const loadReports = lazy(() => new Promise((res, rej) => setTimeout(() => {
  runs++;
  if (failNext) { failNext = false; rej(new Error('ChunkLoadError')); } else res('ReportsComponent');
}, 10)));

(async () => {
  const results = await Promise.allSettled([loadReports(), loadReports(), loadReports()]);
  console.log('first wave:', results.map(r => r.status).join(','), '| downloads:', runs);
  console.log('retry:', await loadReports(), '| downloads:', runs);
  console.log('cached:', await loadReports(), '| downloads:', runs);
})();` },
      complexity: `<p>O(1) per call. One network request per successful chunk.</p>`
    }
  });

  practice.push({
    title: 'Immutable Cart Reducer with Normalised Entities',
    level: 'Medium', tags: ['ngrx', 'reducer', 'entities'], companies: ['Flipkart', 'Zalando'],
    statement: `<p>Write a pure reducer for <code>{ ids: [], entities: {} }</code> handling <code>add</code> (increase qty if present), <code>setQty</code> (qty ≤ 0 removes), <code>remove</code> and <code>clear</code>. Never mutate the input. Untouched entities must keep their <b>same object reference</b> (so memoised selectors and OnPush rows skip them).</p>`,
    constraints: `Up to 10<sup>4</sup> items.`,
    example: `<p>Add Pen, add Book, add Pen → ids <code>[1, 2]</code>, Pen qty 2. After <code>setQty(1, 0)</code>, ids ${H.c('g', '[2]')} and the Book object is ${H.c('g', 'the same reference')} as before.</p>`,
    brute: { why: `<p>Deep-cloning the whole state on every action (<code>JSON.parse(JSON.stringify(s))</code>) is "immutable" but gives every entity a new reference, so every row re-renders and every selector recomputes.</p>`,
      code: { lang: 'js', run: true, code: `const s1 = { ids: [1, 2], entities: { 1: { id: 1, qty: 1 }, 2: { id: 2, qty: 1 } } };
const s2 = JSON.parse(JSON.stringify(s1)); s2.entities[1].qty = 2;
console.log('Book kept its reference?', s1.entities[2] === s2.entities[2]); // false` } },
    mcq: { q: 'Why normalise a list into <code>ids</code> + <code>entities</code>?', options: ['It uses less memory than an array', 'O(1) lookup/update by id and a single copy of each item', 'NgRx requires it'], answer: 1, explain: 'Lookups and updates by id become constant time, and one canonical copy avoids inconsistent duplicates.' },
    hints: [
      `<p>Hint 1: copy only along the path you change: new <code>entities</code> object, new entity for the changed id.</p>`,
      `<p>Hint 2: for remove, build a new ids array with <code>filter</code> and a new entities object without that key.</p>`,
      `<p>Hint 3: return the same state object for unknown actions or no-ops.</p>`
    ],
    solution: {
      approach: `<p>Structural sharing: shallow copies on the changed path, everything else reused. This is what <code>@ngrx/entity</code> adapters and SignalStore entity updaters do.</p>`,
      code: { lang: 'js', run: true, code: `const initial = { ids: [], entities: {} };
function cart(state = initial, a) {
  switch (a.type) {
    case 'add': {
      const cur = state.entities[a.item.id];
      if (cur) return { ...state, entities: { ...state.entities, [cur.id]: { ...cur, qty: cur.qty + 1 } } };
      return { ids: [...state.ids, a.item.id], entities: { ...state.entities, [a.item.id]: { ...a.item, qty: 1 } } };
    }
    case 'setQty': {
      const cur = state.entities[a.id];
      if (!cur) return state;
      if (a.qty <= 0) return cart(state, { type: 'remove', id: a.id });
      return { ...state, entities: { ...state.entities, [a.id]: { ...cur, qty: a.qty } } };
    }
    case 'remove': {
      if (!state.entities[a.id]) return state;
      const { [a.id]: _gone, ...rest } = state.entities;
      return { ids: state.ids.filter(id => id !== a.id), entities: rest };
    }
    case 'clear': return initial;
    default: return state;
  }
}

let s = initial;
s = cart(s, { type: 'add', item: { id: 1, name: 'Pen', price: 2 } });
s = cart(s, { type: 'add', item: { id: 2, name: 'Book', price: 12 } });
const book = s.entities[2];
s = cart(s, { type: 'add', item: { id: 1, name: 'Pen', price: 2 } });
console.log(JSON.stringify(s.ids), 'pen qty', s.entities[1].qty);
s = cart(s, { type: 'setQty', id: 1, qty: 0 });
console.log(JSON.stringify(s.ids), 'book same ref?', s.entities[2] === book);` },
      complexity: `<p>O(1) for update by id; O(n) for remove (filtering ids) and for the entities spread. Libraries accept that cost for simplicity.</p>`
    }
  });

  practice.push({
    title: 'Build signal() and computed() with Dependency Tracking',
    level: 'Hard', tags: ['signals', 'reactivity', 'memoization'], companies: ['Google', 'Microsoft'],
    statement: `<p>Implement a tiny version of Angular signals: <code>signal(v)</code> returning a getter with <code>.set</code> and <code>.update</code>; <code>computed(fn)</code> that is <b>lazy</b> (runs only when read), <b>memoised</b> (recomputes only if a dependency changed since last time) and <b>tracks dependencies automatically</b> while <code>fn</code> runs; and <code>effect(fn)</code> that re-runs (synchronously, for simplicity) when its dependencies change. Equal writes (<code>Object.is</code>) must not notify.</p>`,
    constraints: `Dependencies can change between runs (conditional reads). No external libraries.`,
    example: `<p><code>a = signal(1); b = signal(2); sum = computed(() =&gt; a() + b())</code>. Read sum twice → ${H.c('g', 'computed runs once')}. <code>a.set(1)</code> (same value) → ${H.c('g', 'no recompute')}. <code>a.set(5)</code> → next read recomputes to 7.</p>`,
    brute: { why: `<p>A computed that re-runs on every read is correct but wasteful, and it returns new references for objects each time, which breaks <code>Object.is</code> checks in templates. Re-running it eagerly on every write wastes work for values nobody reads.</p>`,
      code: { lang: 'js', run: true, code: `let runs = 0;
const a = { v: 1 }, b = { v: 2 };
const sum = () => { runs++; return a.v + b.v; };     // recompute on every read
sum(); sum(); sum();
console.log('runs:', runs);` } },
    mcq: { q: 'Angular\'s <code>computed</code> is lazy. What does that mean?', options: ['It runs once at creation and never again', 'It computes only when read, and only if a dependency changed', 'It runs in a web worker'], answer: 1, explain: 'Dirty notification is pushed, but the value is pulled on read; unread computeds cost nothing.' },
    hints: [
      `<p>Hint 1: keep a global "current consumer". When a signal is read, if there is a current consumer, add the signal to its dependency set and the consumer to the signal's subscriber set.</p>`,
      `<p>Hint 2: on <code>set</code> with a new value, mark subscribers dirty (computeds) and propagate to their subscribers; schedule effects.</p>`,
      `<p>Hint 3: before re-running a computed or effect, clear its old dependencies (unsubscribe), so conditional branches do not leave stale subscriptions.</p>`
    ],
    solution: {
      approach: `<p>Push-pull: writes push "dirty" flags down the graph; reads pull fresh values, recomputing only dirty computeds. Effects are consumers that re-run when notified. This is the model behind <code>@angular/core</code> signals (which add version counters and batched effect scheduling).</p>`,
      code: { lang: 'js', run: true, code: `let current = null;                       // consumer currently running
const pendingEffects = new Set();

function track(producer) {
  if (current) { current.deps.add(producer); producer.subs.add(current); }
}
function cleanup(consumer) {
  consumer.deps.forEach(p => p.subs.delete(consumer));
  consumer.deps.clear();
}
function notify(producer) {
  [...producer.subs].forEach(c => {
    if (c.dirty) return;
    c.dirty = true;
    if (c.isEffect) pendingEffects.add(c); else notify(c);   // computeds pass it on
  });
}
function flush() { const list = [...pendingEffects]; pendingEffects.clear(); list.forEach(e => e.run()); }

function signal(value) {
  const node = { subs: new Set() };
  const get = () => { track(node); return value; };
  get.set = v => { if (Object.is(v, value)) return; value = v; notify(node); flush(); };
  get.update = fn => get.set(fn(value));
  return get;
}

function computed(fn) {
  const node = { subs: new Set(), deps: new Set(), dirty: true, value: undefined, runs: 0 };
  const get = () => {
    if (node.dirty) {
      cleanup(node);
      const prev = current; current = node;
      try { node.value = fn(); node.runs++; } finally { current = prev; }
      node.dirty = false;
    }
    track(node);
    return node.value;
  };
  get.node = node;
  return get;
}

function effect(fn) {
  const node = { subs: new Set(), deps: new Set(), dirty: false, isEffect: true };
  node.run = () => {
    cleanup(node);
    const prev = current; current = node;
    try { fn(); } finally { current = prev; node.dirty = false; }
  };
  node.run();
  return node;
}

const a = signal(1), b = signal(2), show = signal(true);
const sum = computed(() => a() + b());
const label = computed(() => (show() ? 'sum=' + sum() : 'hidden'));
effect(() => console.log('render:', label()));
console.log('sum runs so far:', sum.node.runs);
a.set(1);                          // same value: nothing happens
a.set(5);                          // render: sum=7
show.set(false);                   // render: hidden (sum no longer a dependency)
b.set(100);                        // no render: label does not depend on sum now
console.log('sum runs total:', sum.node.runs);` },
      complexity: `<p>A write costs O(affected consumers); a read of a clean computed is O(1). Angular adds version numbers so a computed whose dependencies were set to equal values can skip work, and schedules effects asynchronously.</p>`,
      followUps: ['Why does Angular run effects asynchronously instead of synchronously like this model?', 'What would linkedSignal add on top of this?']
    }
  });

  practice.push({
    title: 'Zoneless Scheduler: Coalesce Notifications into One Tick',
    level: 'Hard', tags: ['change detection', 'zoneless', 'microtasks'], companies: ['Google', 'Thoughtworks'],
    statement: `<p>In zoneless Angular, many notifications (several signal writes, an event, a <code>markForCheck</code>) in the same task must result in <b>one</b> change-detection pass. Write <code>createScheduler(tick)</code> with <code>notify(source)</code>: the first notification schedules <code>tick(sources)</code> in a microtask; further notifications before it runs are merged. A notification <b>during</b> a tick (e.g. an effect writing a signal) schedules exactly one more tick afterwards. Guard against infinite loops: stop after 10 consecutive re-ticks with an error message (Angular reports a similar error for runaway change detection loops).</p>`,
    constraints: `Use <code>queueMicrotask</code>. Sources are strings for logging.`,
    example: `<p>3 signal writes in one click handler → ${H.c('g', '1 tick with 3 sources')}. A tick whose effect writes a signal → ${H.c('y', 'second tick')}. A tick that always writes → ${H.c('r', 'stopped after 10')}.</p>`,
    brute: { why: `<p>Running change detection synchronously on every write renders intermediate states and repeats work (3 writes = 3 full passes). zone.js-based apps coalesce through <code>onMicrotaskEmpty</code>; zoneless needs its own scheduler.</p>`,
      code: { lang: 'js', run: true, code: `let ticks = 0;
const notifyNaive = src => { ticks++; console.log('tick for', src); };
['count', 'total', 'label'].forEach(notifyNaive);
console.log('ticks:', ticks);` } },
    mcq: { q: 'In a zoneless app, a component updates a plain class field inside <code>setTimeout</code>. What happens?', options: ['The view updates as with zone.js', 'Nothing re-renders until something else notifies Angular', 'Angular throws an error'], answer: 1, explain: 'No zone means no automatic notification. Use a signal or markForCheck so the scheduler is told.' },
    hints: [
      `<p>Hint 1: keep <code>scheduled</code> (boolean), <code>running</code> (boolean) and a Set of pending sources.</p>`,
      `<p>Hint 2: <code>notify</code> adds the source; if not scheduled, schedule a microtask. If running, just record it — the tick loop will see pending sources when it ends.</p>`,
      `<p>Hint 3: after a tick, if new sources arrived, loop (count iterations) instead of scheduling recursively; bail out at the limit.</p>`
    ],
    solution: {
      approach: `<p>Microtask batching plus a bounded re-run loop. That is the essence of Angular's <code>ChangeDetectionSchedulerImpl</code> (which races microtask/rAF/setTimeout and also detects infinite loops).</p>`,
      code: { lang: 'js', run: true, code: `function createScheduler(tick, maxLoops = 10) {
  let scheduled = false, running = false;
  const pending = new Set();
  function run() {
    scheduled = false;
    let loops = 0;
    while (pending.size) {
      if (++loops > maxLoops) { console.log('ERROR: infinite change detection loop, stopping'); pending.clear(); return; }
      const sources = [...pending]; pending.clear();
      running = true;
      try { tick(sources); } finally { running = false; }
    }
  }
  return {
    notify(source) {
      pending.add(source);
      if (!scheduled && !running) { scheduled = true; queueMicrotask(run); }
    },
  };
}

// 1) three writes in one handler -> one tick
let n = 0;
const s1 = createScheduler(src => console.log('tick', ++n, 'sources:', src.join(',')));
s1.notify('count'); s1.notify('total'); s1.notify('label');

// 2) an effect writes during the tick -> exactly one more tick
let wrote = false;
const s2 = createScheduler(src => {
  console.log('[s2] tick for', src.join(','));
  if (!wrote) { wrote = true; s2.notify('effect-write'); }
});
setTimeout(() => s2.notify('click'), 0);

// 3) a buggy tick that always writes -> stopped
const s3 = createScheduler(() => s3.notify('loop'));
setTimeout(() => s3.notify('start'), 5);` },
      complexity: `<p>O(1) per notification; one tick per batch. The loop guard turns a frozen tab into a clear error.</p>`,
      followUps: ['Why does Angular also race requestAnimationFrame with a timer instead of only using microtasks?', 'How does this differ from zone.js event coalescing?']
    }
  });

  practice.push({
    title: 'Incremental Hydration: Which Blocks Hydrate on an Event?',
    level: 'Hard', tags: ['ssr', 'hydration', 'defer', 'trees'], companies: ['Google', 'Shopify'],
    statement: `<p>A page has nested <code>@defer</code> blocks, each with a hydrate trigger: <code>immediate</code>, <code>idle</code>, <code>viewport</code>, <code>interaction</code>, or <code>never</code>. Given the block tree and an event <code>{ type, blockId }</code> (e.g. the user clicks inside block <code>reviews-list</code>), return the blocks that hydrate, in order. Rules: hydrating a block requires all its <b>dehydrated ancestors</b> to hydrate first (top-down), regardless of their own trigger, except that a <code>never</code> ancestor blocks everything below it. <code>idle</code> fires once at startup, together with <code>immediate</code>.</p>`,
    constraints: `Up to 100 blocks, depth ≤ 6.`,
    example: `<p>Tree: <code>main(immediate) → reviews(viewport) → reviews-list(interaction)</code>. Click in <code>reviews-list</code> before scrolling → ${H.c('g', "['reviews', 'reviews-list']")} (main already hydrated at startup).</p>`,
    brute: { why: `<p>Hydrating only the clicked block cannot work: a child's component instance needs its parent's injector and view to exist. Hydrating the whole page on the first interaction throws away the benefit of incremental hydration.</p>`,
      code: { lang: 'js', run: true, code: `const hydrateOnlyTarget = (blockId) => [blockId];
console.log(hydrateOnlyTarget('reviews-list'), '<- parent reviews is still dehydrated: no injector, no view');` } },
    mcq: { q: 'What does <code>@defer (hydrate never)</code> mean?', options: ['The block is not rendered on the server', 'The block is rendered on the server and stays static HTML; its JS is never loaded for hydration', 'The block hydrates on the first click'], answer: 1, explain: 'It is server-rendered content that never becomes interactive, so it costs no JS.' },
    hints: [
      `<p>Hint 1: store parent links and a <code>hydrated</code> set.</p>`,
      `<p>Hint 2: at startup, hydrate blocks whose trigger is immediate or idle (with their ancestors).</p>`,
      `<p>Hint 3: for an event in block X: collect the path root → X; if any block on it is <code>never</code>, stop; else hydrate the not-yet-hydrated blocks on that path in top-down order.</p>`
    ],
    solution: {
      approach: `<p>Path from root to target, top-down, skipping already-hydrated blocks and refusing to cross a <code>never</code> boundary. Angular also replays the triggering event after the block hydrates (event replay), so the click is not lost.</p>`,
      code: { lang: 'js', run: true, code: `function createPage(blocks) {
  const byId = new Map(blocks.map(b => [b.id, b]));
  const hydrated = new Set();
  const pathTo = id => { const p = []; for (let b = byId.get(id); b; b = byId.get(b.parent)) p.unshift(b); return p; };
  function hydratePath(id) {
    const path = pathTo(id);
    if (path.some(b => b.trigger === 'never')) return [];
    const done = [];
    for (const b of path) if (!hydrated.has(b.id)) { hydrated.add(b.id); done.push(b.id); }
    return done;
  }
  return {
    startup() {
      const out = [];
      for (const b of blocks) if (b.trigger === 'immediate' || b.trigger === 'idle') out.push(...hydratePath(b.id));
      return out;
    },
    event(type, id) {
      const b = byId.get(id);
      if (!b) return [];
      // the event itself counts as that block's trigger, or simply as "needed now" for interaction/hover
      return hydratePath(id);
    },
  };
}

const page = createPage([
  { id: 'main', parent: null, trigger: 'immediate' },
  { id: 'reviews', parent: 'main', trigger: 'viewport' },
  { id: 'reviews-list', parent: 'reviews', trigger: 'interaction' },
  { id: 'footer', parent: null, trigger: 'never' },
  { id: 'footer-newsletter', parent: 'footer', trigger: 'interaction' },
  { id: 'recs', parent: 'main', trigger: 'idle' },
]);
console.log('startup:', page.startup());
console.log('click reviews-list:', page.event('interaction', 'reviews-list'));
console.log('click again:', page.event('interaction', 'reviews-list'));
console.log('click footer-newsletter:', page.event('interaction', 'footer-newsletter'));` },
      complexity: `<p>O(depth) per event. The real runtime also downloads the chunks of all blocks on the path (in parallel) before hydrating top-down.</p>`
    }
  });

  practice.push({
    title: 'Undo/Redo as a Meta-Reducer',
    level: 'Hard', tags: ['ngrx', 'meta-reducer', 'history'], companies: ['Figma', 'Atlassian', 'Canva'],
    statement: `<p>NgRx meta-reducers wrap a reducer to add behaviour for every action. Write <code>undoable(reducer, limit)</code> that turns state into <code>{ past, present, future }</code>: normal actions push the old present to <code>past</code> (capped at <code>limit</code>) and clear <code>future</code>; <code>UNDO</code> and <code>REDO</code> move between them; actions that do not change the present (same reference) are <b>not</b> recorded.</p>`,
    constraints: `limit ≥ 1. Up to 10<sup>5</sup> actions; keep each step O(1) amortised apart from the cap.`,
    example: `<p>add A, add B, UNDO → present <code>[A]</code>, future 1. add C → ${H.c('g', 'future cleared')}. UNDO, UNDO → <code>[]</code>; a third UNDO → ${H.c('y', 'no-op')}.</p>`,
    brute: { why: `<p>Storing a deep copy of the whole state on every action wastes memory, and recording no-op actions (like a selection that did not change) fills the history with steps that "undo nothing".</p>`,
      code: { lang: 'js', run: true, code: `const history = [];
let state = { items: [] };
for (const a of ['noop', 'noop', 'add']) {
  history.push(JSON.parse(JSON.stringify(state)));        // deep copy every time, even for no-ops
  if (a === 'add') state = { items: [...state.items, 'x'] };
}
console.log('history length:', history.length, '(2 useless entries)');` } },
    mcq: { q: 'Why can undo history store state objects directly instead of deep copies?', options: ['Because NgRx deep-freezes them in production', 'Because reducers are immutable, old states are never modified, so references are safe snapshots', 'It cannot; deep copies are required'], answer: 1, explain: 'Immutability means each past state object stays exactly as it was; structural sharing keeps memory low.' },
    hints: [
      `<p>Hint 1: the wrapper receives <code>{ past, present, future }</code> and an action, and calls the inner reducer only for normal actions.</p>`,
      `<p>Hint 2: compare <code>newPresent === present</code> to detect no-ops.</p>`,
      `<p>Hint 3: cap with <code>past.slice(-limit)</code> after pushing.</p>`
    ],
    solution: {
      approach: `<p>Wrap the reducer; keep history as arrays of state references (cheap thanks to immutability and structural sharing). This is how undo/redo is commonly added to NgRx or SignalStore apps (as a meta-reducer or a store feature).</p>`,
      code: { lang: 'js', run: true, code: `function undoable(reducer, limit = 50) {
  const init = { past: [], present: reducer(undefined, { type: '@@INIT' }), future: [] };
  return (state = init, action) => {
    const { past, present, future } = state;
    switch (action.type) {
      case 'UNDO':
        if (!past.length) return state;
        return { past: past.slice(0, -1), present: past[past.length - 1], future: [present, ...future] };
      case 'REDO':
        if (!future.length) return state;
        return { past: [...past, present], present: future[0], future: future.slice(1) };
      default: {
        const next = reducer(present, action);
        if (next === present) return state;                       // no-op: not recorded
        return { past: [...past, present].slice(-limit), present: next, future: [] };
      }
    }
  };
}

const list = (s = [], a) => (a.type === 'add' ? [...s, a.v] : a.type === 'select' ? s : s);
const r = undoable(list, 3);
let s = r(undefined, { type: '@@INIT' });
const run = a => { s = r(s, a); console.log(a.type.padEnd(6), JSON.stringify(s.present), 'past', s.past.length, 'future', s.future.length); };
[{ type: 'add', v: 'A' }, { type: 'add', v: 'B' }, { type: 'select' }, { type: 'UNDO' }, { type: 'add', v: 'C' },
 { type: 'UNDO' }, { type: 'UNDO' }, { type: 'UNDO' }, { type: 'REDO' }].forEach(run);` },
      complexity: `<p>O(limit) per action because of the array copies; with a ring buffer it is O(1). Memory is O(limit × changed parts) thanks to structural sharing.</p>`
    }
  });

  /* =====================================================================
     QUIZ
     ===================================================================== */
  quiz.push({ q: 'Non-admin users must not even download the admin feature code. Which guard do you put on the <code>loadChildren</code> route?',
    options: ['<code>canMatch</code>', '<code>canActivate</code>', '<code>canDeactivate</code>', '<code>resolve</code>'], answer: 0,
    explain: '<code>canMatch</code> runs while the router is matching. If it returns false the route is skipped and its lazy chunk is never loaded. <code>canActivate</code> runs after matching, so the chunk may already be downloaded.' });
  quiz.push({ q: 'Navigating from <code>/products/1</code> to <code>/products/2</code>, the page still shows product 1. The component reads <code>route.snapshot.paramMap.get(\'id\')</code> in <code>ngOnInit</code>. Why?',
    options: ['The router reuses the same component instance, so ngOnInit does not run again', 'The snapshot is cached for 5 seconds', 'Params only update after a full page reload', 'withComponentInputBinding is turned on'], answer: 0,
    explain: 'Same route config means the instance is reused. Read params reactively: a signal input with <code>withComponentInputBinding()</code>, or the <code>paramMap</code> Observable with switchMap.' });
  quiz.push({ q: 'A reactive form has a disabled <code>country</code> control. What does <code>form.value</code> contain?',
    options: ['All controls except the disabled one', 'All controls including country', '<code>null</code> while any control is disabled', 'Only the controls that the user has touched'], answer: 0,
    explain: '<code>value</code> excludes disabled controls; <code>getRawValue()</code> includes them.' });
  quiz.push({ q: 'What is the type of <code>new FormControl(\'\')</code> in typed forms, and why?',
    options: ['<code>FormControl&lt;string | null&gt;</code>, because <code>reset()</code> sets it to null by default', '<code>FormControl&lt;string&gt;</code>, inferred from the empty string', '<code>FormControl&lt;any&gt;</code>, for backwards compatibility', '<code>FormControl&lt;unknown&gt;</code>'], answer: 0,
    explain: 'Without <code>nonNullable: true</code>, reset returns null, so the type includes null. NonNullableFormBuilder avoids that.' });
  quiz.push({ q: 'A control has a sync <code>required</code> validator and an async "username taken" validator. The field is empty. What happens?',
    options: ['Status is INVALID and the async validator is not called', 'Both run in parallel; status is PENDING', 'Only the async validator runs', 'Status is VALID until blur'], answer: 0,
    explain: 'Async validators run only after all sync validators pass, so no request is made for an invalid value.' });
  quiz.push({ q: 'An OnPush child receives <code>[items]="items"</code>. The parent runs <code>this.items.push(newItem)</code>. What does the child show?',
    options: ['The old list, because the input reference did not change', 'The new list, because arrays are tracked deeply', 'An ExpressionChanged error', 'The new list, but only in production'], answer: 0,
    explain: 'OnPush compares input references with ===. Mutation keeps the same reference. Create a new array or use a signal update.' });
  quiz.push({ q: 'In a zoneless Angular app, which of these does NOT schedule change detection by itself?',
    options: ['Assigning a plain class field inside <code>setTimeout</code>', 'Setting a signal that a template reads', 'A <code>(click)</code> handler in the template', 'Calling <code>ChangeDetectorRef.markForCheck()</code>'], answer: 0,
    explain: 'Without zone.js nothing intercepts timers. Signal writes, template events, markForCheck and the async pipe notify the scheduler.' });
  quiz.push({ q: 'What does <code>@defer (on viewport; prefetch on idle)</code> do?',
    options: ['Downloads the chunk when the browser is idle, renders the block when its placeholder enters the viewport', 'Renders immediately and hydrates on idle', 'Downloads and renders only when visible; prefetch is ignored', 'Renders on idle, prefetches on viewport'], answer: 0,
    explain: 'prefetch controls when the JS is fetched; the main trigger controls when the content is rendered.' });
  quiz.push({ q: 'A user clicks a button on an SSR page before Angular finished hydrating. Which feature makes that click still work?',
    options: ['<code>withEventReplay()</code>', '<code>withIncrementalHydration()</code> alone', '<code>ngSkipHydration</code>', '<code>RenderMode.Prerender</code>'], answer: 0,
    explain: 'Event replay records events that happen before hydration and replays them once the listeners are attached.' });
  quiz.push({ q: 'An NgRx effect handles "Pay Clicked". Users double-click and get charged twice. Which operator fixes the effect?',
    options: ['<code>exhaustMap</code>', '<code>mergeMap</code>', '<code>switchMap</code>', '<code>concatMap</code>'], answer: 0,
    explain: 'exhaustMap ignores new actions while one payment is in progress. switchMap would cancel the first payment request mid-flight; mergeMap and concatMap would send both.' });
  quiz.push({ q: 'An effect has <code>catchError</code> placed after <code>switchMap</code> on the outer <code>actions$</code> stream. What happens after the first HTTP error?',
    options: ['The effect stream completes and stops reacting to future actions', 'Nothing special; it keeps working', 'The store resets to initial state', 'NgRx retries the request forever'], answer: 0,
    explain: 'An error reaching the outer stream ends it (catchError replaces it with a completed observable). Put catchError inside the inner observable.' });
  quiz.push({ q: 'Which statement about <code>computed()</code> signals is correct?',
    options: ['It is lazy and memoised: it recomputes only when read after a dependency changed', 'It recomputes on every change detection pass', 'It should be used to call APIs when a signal changes', 'It runs eagerly whenever any signal in the app changes'], answer: 0,
    explain: 'computed tracks dependencies, caches the value, and recomputes on read only if needed. Side effects belong in effect() or rxMethod.' });

  /* =====================================================================
     INTERVIEW Q&A
     ===================================================================== */
  interview.push({ q: 'How do you set up lazy loading in a modern standalone Angular app, and how do you decide what to lazy-load?', level: 'I',
    a: `<p>Routes use <code>loadComponent: () =&gt; import('./x').then(m =&gt; m.X)</code> for a single page or <code>loadChildren</code> pointing at a <code>Routes</code> array for a feature area; each <code>import()</code> becomes its own chunk. Inside a page, <code>@defer</code> lazy-loads heavy parts of the template. I keep the shell (layout, auth, first route) eager and lazy-load every feature route, especially heavy ones (charts, editors, admin). I add a preloading strategy (<code>withPreloading(PreloadAllModules)</code> or a custom one that preloads likely next routes) so later navigations are instant, and use bundle budgets plus <code>--stats-json</code> to verify the initial bundle actually shrank.</p>`,
    followUps: ['How would you write a custom preloading strategy?', 'What happens if a lazy chunk fails to load after a new deploy?', 'loadChildren vs loadComponent: when does each make sense?'] });
  interview.push({ q: 'Explain canActivate vs canMatch vs canDeactivate, and how a guard redirects.', level: 'I',
    a: `<p><code>canActivate</code> runs after a route matched and decides whether to enter it. <code>canMatch</code> runs during matching; if it returns false the router tries the next route, which lets two routes share a path (admin vs user dashboard) and keeps lazy code from loading for unauthorised users. <code>canDeactivate</code> runs on the route being left (unsaved changes). Guards are functions (<code>CanActivateFn</code> etc.) that use <code>inject()</code> and return boolean, a <code>UrlTree</code> (redirect: <code>router.createUrlTree(['/login'], { queryParams: { returnUrl } })</code>), a <code>RedirectCommand</code> (v18+), or an Observable/Promise of these. Guards are UX only; the API must enforce authorisation.</p>`,
    followUps: ['Why are class-based guards deprecated?', 'How would you test a functional guard?', 'In what order do guards run for nested routes?'] });
  interview.push({ q: 'Resolvers or loading data inside the component — which do you prefer and why?', level: 'A',
    a: `<p>A resolver (<code>ResolveFn</code>) delays navigation until data is ready, so the new page never renders empty; with SSR it also guarantees the data is in the HTML. The cost is that the old page stays on screen with no feedback if the API is slow, and an error cancels navigation unless handled. Loading in the component (store, <code>resource</code>/<code>httpResource</code>, or a service) navigates instantly and shows a skeleton, which usually feels faster and handles errors locally. I use resolvers for small, critical data (the entity for a detail page in an SSR app) and component loading with skeletons for heavy or secondary data. Either way I show a global progress bar from router events.</p>`,
    followUps: ['How do you show a progress indicator during resolvers?', 'How do resolved values reach the component with withComponentInputBinding?'] });
  interview.push({ q: 'Reactive vs template-driven forms: compare them and say when you would choose each.', level: 'B',
    a: `<p>Both build the same control tree (FormControl, FormGroup, FormArray). Template-driven forms create it from <code>ngModel</code> directives, use two-way binding and update asynchronously; they are quick for simple forms like login. Reactive forms are built in TypeScript, update synchronously, are strictly typed since v14, are easy to unit test without the DOM, and handle dynamic fields (FormArray), conditional validators and cross-field rules cleanly. For anything beyond a few fields, or with dynamic structure or complex validation, I choose reactive forms with <code>NonNullableFormBuilder</code>. I'd also mention signal forms as the experimental future direction.</p>`,
    followUps: ['Why are template-driven forms asynchronous?', 'How do typed forms handle reset() and null?', 'What is getRawValue for?'] });
  interview.push({ q: 'How do you make a custom component (e.g. a star rating) work with formControlName?', level: 'I',
    a: `<p>Implement <code>ControlValueAccessor</code>: <code>writeValue</code> (model to view), <code>registerOnChange</code> (save the callback and call it when the user picks a value), <code>registerOnTouched</code> (call on blur), and optionally <code>setDisabledState</code>. Register the component with <code>{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() =&gt; StarsComponent), multi: true }</code>. Then <code>formControlName</code>, <code>ngModel</code>, validators, disabled and touched all work like with a native input. For validation inside the component you can also provide <code>NG_VALIDATORS</code>. Keep the internal value in a signal so the component works with OnPush.</p>`,
    followUps: ['When is forwardRef needed?', 'How would the component show validation errors from the parent control?'] });
  interview.push({ q: 'Write (verbally) an async validator for "username is taken". What pitfalls do you avoid?', level: 'I',
    a: `<p>An <code>AsyncValidatorFn</code> returns an Observable of <code>ValidationErrors | null</code>: <code>timer(400).pipe(switchMap(() =&gt; http.get(...)), map(r =&gt; r.taken ? { usernameTaken: true } : null), catchError(() =&gt; of(null)))</code>. Pitfalls: the Observable must <b>complete</b> (HTTP does; <code>valueChanges</code> does not), otherwise the control stays PENDING; Angular does not debounce, so I use the timer trick (Angular unsubscribes on each new value) or <code>updateOn: 'blur'</code>; sync validators should reject obviously invalid values first; the submit button checks <code>invalid || pending</code>; and the server still re-validates on submit because of races.</p>`,
    followUps: ['Why does the timer act as a debounce?', 'How do you map a server-side "taken" error after submit back onto the control?'] });
  interview.push({ q: 'Explain Angular change detection: Default vs OnPush, and what marks an OnPush component dirty.', level: 'I',
    a: `<p>Change detection runs each component's compiled update code and patches DOM bindings that changed. With zone.js, any async event triggers <code>ApplicationRef.tick()</code>, and Default components are checked every time, top-down. An OnPush component (and its subtree) is skipped unless it is dirty. It becomes dirty when an input reference changes, an event handler in its template runs, the async pipe emits, a signal read in its template changes, or <code>markForCheck()</code> is called. Marking dirty walks up to the root so the path is checked. That is why OnPush requires immutable updates: mutating an array keeps the same reference and the child never updates.</p>`,
    followUps: ['What is ExpressionChangedAfterItHasBeenCheckedError?', 'How do signals change which views are refreshed?', 'markForCheck vs detectChanges?'] });
  interview.push({ q: 'What is zoneless Angular, why would you adopt it, and how do you migrate?', level: 'A',
    a: `<p>Zoneless removes zone.js; Angular runs change detection only when notified (signal writes read by templates, template events, <code>markForCheck</code>, async pipe, input changes, router/HTTP integration). It became stable in v20 (<code>provideZonelessChangeDetection()</code>) and is the default for new apps in v21. Benefits: smaller bundle, no monkey-patching, fewer useless CD cycles, better INP, clearer stack traces, native async/await. Migration: make components OnPush and signal-based first (they're then already zoneless-compatible), find state changes in <code>setTimeout</code>/third-party callbacks and convert them to signals or markForCheck, replace <code>NgZone.onStable</code> usage with <code>afterNextRender</code>, update tests to use <code>whenStable</code>, then switch the provider and remove zone.js from polyfills.</p>`,
    followUps: ['What breaks silently in zoneless mode?', 'What is the hybrid scheduler in zone apps since v18?'] });
  interview.push({ q: 'When would you use @defer, and which triggers would you choose for a product page?', level: 'I',
    a: `<p><code>@defer</code> lazy-loads the standalone components used only inside the block. On a product page: the hero image, title, price and add-to-cart stay eager (LCP). Reviews: <code>on viewport</code> with <code>prefetch on idle</code>. Recommendations carousel: <code>on viewport</code>. A size-guide modal: <code>on interaction</code> of its button with <code>prefetch on hover</code>. Chat widget: <code>on idle</code> or <code>on timer(5s)</code>. I always provide a <code>@placeholder</code> with the same dimensions (no layout shift), use <code>@loading (after 100ms; minimum 500ms)</code> to avoid flicker, and an <code>@error</code> block. Deferred deps must be standalone and not referenced elsewhere in the file, or they get bundled eagerly.</p>`,
    followUps: ['What does @defer render on the server?', 'How does @defer differ from a lazy route?'] });
  interview.push({ q: 'Explain SSR, hydration and incremental hydration in Angular. What problems do they solve, and what new problems appear?', level: 'A',
    a: `<p>SSR renders HTML on the server so content appears before JS runs (better LCP, SEO, link previews). Since v19 you pick per route: <code>RenderMode.Prerender</code>, <code>Server</code> or <code>Client</code>. Hydration (<code>provideClientHydration()</code>) reuses the server DOM instead of re-rendering, transfers HTTP responses so the client does not refetch, and with <code>withEventReplay()</code> replays early clicks. Incremental hydration (stable v20) keeps <code>@defer (hydrate on ...)</code> blocks as server HTML and downloads/hydrates their JS only when triggered, cutting initial JS and improving INP; <code>hydrate never</code> keeps a region static. New problems: browser-only APIs on the server (use <code>afterNextRender</code>), hydration mismatches (invalid HTML, direct DOM manipulation, non-deterministic values; error NG0500), server cost and TTFB, and caching/auth handling on the server.</p>`,
    followUps: ['How do you debug a hydration mismatch?', 'When would you choose prerendering over SSR?', 'What does the transfer cache do?'] });
  interview.push({ q: 'NgRx Store vs NgRx SignalStore vs a service with signals: how do you choose?', level: 'A',
    a: `<p>A service with private signals and public readonly/computed signals covers most shared state with zero dependencies. NgRx SignalStore adds structure (<code>withState</code>, <code>withComputed</code>, <code>withMethods</code>, <code>withHooks</code>, entities, <code>rxMethod</code>) and reusable features, and can be provided per feature or per component; it's my default for feature state in signal-first apps. NgRx Store (actions, reducers, selectors, effects) fits large apps with many teams and complex cross-feature event flows: actions as events decouple features, DevTools give time travel and an audit log, and the strict pattern scales across teams, at the cost of boilerplate and indirection. I also keep URL state in the router and local UI state in component signals rather than any store.</p>`,
    followUps: ['How do you avoid over-using a global store?', 'How would you migrate from NgRx Store to SignalStore incrementally?'] });
  interview.push({ q: 'Walk through what happens when a component dispatches an action that loads data in NgRx, including errors.', level: 'I',
    a: `<p>The component dispatches <code>[Products Page] Search Changed</code>. The store runs all reducers; the products reducer returns a new state with <code>loading: true</code>. Memoised selectors whose inputs changed recompute and the component (reading via <code>selectSignal</code>) shows a spinner. After reducers, the action reaches the <code>Actions</code> stream; a functional effect with <code>ofType</code> + <code>debounceTime</code> + <code>switchMap</code> calls the API. On success it maps to <code>Load Success</code>, which the reducer stores; on failure <code>catchError</code> <b>inside</b> the switchMap returns <code>Load Failure</code>, so the effect stays alive. switchMap cancels the in-flight request if a newer search arrives, preventing stale results.</p>`,
    followUps: ['Where should you put catchError and why?', 'When would you use concatMap instead?', 'How would you test this effect?'] });
  interview.push({ q: 'A large Angular data grid feels sluggish when typing in a filter box. How do you diagnose and fix it?', level: 'A',
    a: `<p>Diagnose with Angular DevTools Profiler (how many CD cycles per keystroke, which components are slow) and a Chrome performance trace (scripting vs rendering). Typical fixes: OnPush for the grid and row components; signals/computed for the filtered list instead of template method calls; debounce the filter input; <code>@for</code> with <code>track row.id</code> so rows are moved, not recreated; pure pipes for formatting; virtual scrolling (CDK <code>cdk-virtual-scroll-viewport</code>) so only visible rows exist; move heavy filtering to a Web Worker if needed; run noisy third-party listeners outside Angular or go zoneless. Then measure again with INP from real users.</p>`,
    followUps: ['Why is a function call in a template expensive?', 'How does virtual scrolling interact with row height and accessibility?'] });
  interview.push({ q: 'You have 60 minutes to build an Angular "users table with search, sort and pagination" in an interview. How do you approach it?', level: 'I',
    a: `<p>First 5 minutes: clarify (data size, server or client-side paging, debounce, empty/error states, Angular version) and sketch: a <code>UsersPage</code> container holding state as signals (<code>query</code>, <code>sort</code>, <code>page</code>) or in URL query params, a <code>UserService</code> (mocked with <code>of(data).pipe(delay(300))</code>), and an OnPush presentational table with inputs/outputs. Next 25 minutes: the happy path, with <code>computed</code> for filtered → sorted → paged rows (or an RxJS pipeline with debounce and switchMap for server mode), <code>@for ... track user.id</code>. Then 10 minutes for loading/empty/error states, disabling paging buttons at the edges, and resetting to page 1 when the query changes. Then a11y (<code>aria-sort</code>, labelled input, keyboard), and the final minutes explaining trade-offs and what I'd add: tests, virtual scroll, caching, URL sync.</p>`,
    followUps: ['How would you keep sort and page in the URL?', 'What would you test first?', 'How would the design change for 1 million rows?'] });

  /* spread the correct answers around: rotate the options of each quiz question */
  quiz.forEach(function (q, i) {
    var n = q.options.length, k = i % n;
    if (!k) return;
    q.options = q.options.slice(k).concat(q.options.slice(0, k));
    q.answer = (q.answer - k + n) % n;
  });

  registerModule({
    id: 'fe20',
    title: 'Angular Routing, Forms & Performance at Scale',
    lang: 'ts',
    intro: `<p>This module takes you from "I can build an Angular component" to "I can design, speed up and defend a large Angular app in an interview". You will learn the <b>Router</b> the modern way (standalone routes, functional guards, resolvers, lazy <code>loadComponent</code>/<code>loadChildren</code>, params as signal inputs), <b>forms</b> (typed reactive vs template-driven, custom controls), <b>validators</b> (sync, async, cross-field), <b>change detection</b> (Default vs OnPush, zone.js vs zoneless, signals), <b>@defer</b>, <b>SSR and hydration</b> (event replay and incremental hydration), and <b>state</b> with signal services, NgRx Store and NgRx SignalStore.</p>
      <p>Everything targets Angular 17 to 21 (2026): standalone APIs, built-in control flow, signals and zoneless. Every topic starts with an everyday analogy, then a visual you can step through, then real Angular TypeScript and small runnable JavaScript models of the same mechanism (a route matcher, a validator pipeline, a change-detection walk, a mini Redux store) so you can <i>see</i> the idea work. The last topic shows exactly how Angular interview rounds run, including a 60-minute machine-coding plan.</p>`,
    goals: [
      'Configure standalone routing with lazy loadComponent/loadChildren, functional guards (CanActivateFn, CanMatchFn, CanDeactivateFn), resolvers and withComponentInputBinding, and explain the navigation pipeline',
      'Build typed reactive forms with FormGroup/FormArray and a ControlValueAccessor, and choose between reactive and template-driven forms',
      'Write custom sync, cross-field and async validators that debounce, cancel stale checks and always complete',
      'Predict which components change detection checks under Default, OnPush and signals, and migrate an app to zoneless',
      'Use @defer triggers, SSR render modes, full and incremental hydration to improve LCP and INP, and debug hydration mismatches',
      'Pick between a signal service, NgRx SignalStore and NgRx Store, and implement actions, reducers, selectors and effects with the right RxJS operator',
      'Plan and deliver a 60-minute Angular machine-coding round and handle concept, debugging and design rounds'
    ],
    prereqs: `Required: <b>RxJS &amp; Signals</b> (fe19) — observables, operators like switchMap and debounceTime, and signal/computed/effect are used everywhere here — and <b>Browser APIs, Storage &amp; Networking</b> (fe07) — fetch/HTTP, storage and the browser-vs-server split that SSR depends on. The Angular basics from Angular Fundamentals (fe17) and Services &amp; DI (fe18), plus TypeScript generics, help a lot.`,
    hours: 16,
    topics: topics,
    quiz: quiz,
    interview: interview,
    practice: practice
  });
})();
