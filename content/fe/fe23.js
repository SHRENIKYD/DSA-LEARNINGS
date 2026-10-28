(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- shared helpers for this module's visualizers ---------- */
  function pad4(frames, tip) {
    while (frames.length < 4) {
      var last = frames[frames.length - 1];
      frames.push({ narr: tip || 'Tip: try a different input above to see more steps.', parts: last.parts });
    }
    return frames;
  }
  function words(input, max, hint) {
    var items = String(input === undefined ? '' : input).split(/[\s,]+/).filter(Boolean);
    if (!items.length) throw new Error(hint);
    if (items.length > max) throw new Error('Use at most ' + max + ' items. ' + hint);
    return items;
  }

  /* =====================================================================
     TOPIC 1 — Library types, smart vs presentational, facades
     ===================================================================== */
  var LAYER_ALLOW = {
    app: ['feature', 'ui', 'data-access', 'util'],
    feature: ['feature', 'ui', 'data-access', 'util'],
    ui: ['ui', 'util'],
    'data-access': ['data-access', 'util'],
    util: ['util']
  };
  function layerOf(name) {
    if (name.indexOf('app-') === 0) return 'app';
    if (name.indexOf('feature-') === 0) return 'feature';
    if (name.indexOf('ui-') === 0) return 'ui';
    if (name.indexOf('data-access-') === 0) return 'data-access';
    if (name.indexOf('util-') === 0) return 'util';
    return null;
  }

  topics.push({
    title: 'Structuring Large Angular Apps: Feature, UI, Data-Access & Util Libraries, Smart vs Presentational, Facades',
    analogy: `<p>Think of a <b>restaurant</b>. The <b>waiters</b> (presentational / UI components) only show plates nicely and pass orders on; they never cook. The <b>head chef</b> of each section (feature / smart component) decides what goes on the plate. The <b>pantry and suppliers</b> (data-access) get the ingredients, and the <b>kitchen tools</b> (util: knives, scales) are used by everybody. The chef talks to one <b>pass window</b> (the facade) instead of running to every supplier himself. Rules like "waiters never walk into the cold store" are what keep a 300-cook kitchen from turning into chaos.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> A small Angular app can live in one <code>src/app</code> folder. At 50+ screens and 5+ teams that folder becomes a ball of mud: everything imports everything, nobody knows what is safe to change, and every build compiles the world. The fix used by most large Angular shops (and promoted by Nx and the Angular Architects) is to split code into <b>libraries with a type</b>, and to allow imports only in one direction.</p>
      ${H.table(['Library type', 'Contains', 'May import', 'Example'], [
        ['<b>feature</b>', 'Smart (container) components, routes of one business use case', 'feature, ui, data-access, util', '<code>libs/booking/feature-search</code>'],
        ['<b>ui</b>', 'Presentational components, directives, pipes. Inputs in, outputs out. No services that fetch data', 'ui, util', '<code>libs/shared/ui-button</code>'],
        ['<b>data-access</b>', 'HTTP clients, stores (signal services, NgRx), facades, models', 'data-access, util', '<code>libs/booking/data-access</code>'],
        ['<b>util</b>', 'Pure helpers: date/format functions, validators, types', 'util only', '<code>libs/shared/util-dates</code>'],
        ['<b>app</b> (shell)', 'Bootstrap, <code>app.config.ts</code>, top routes. Thin!', 'everything', '<code>apps/booking</code>']
      ])}
      <p>🔵 <b>Smart vs presentational.</b> A <b>smart</b> (container) component knows <i>where data comes from</i>: it injects a store or facade, reads signals, and handles events by calling methods. A <b>presentational</b> (dumb) component knows only <i>how to show</i> data: <code>input()</code>s, <code>output()</code>s, <code>ChangeDetectionStrategy.OnPush</code>, no injected data services. Presentational components are easy to reuse, test and put in Storybook. Most screens are one smart component on top of several presentational ones.</p>
      <p>🔵 <b>Facade.</b> A facade is a small injectable class in data-access that exposes <b>what the UI needs</b> (signals like <code>flights</code>, <code>loading</code>; methods like <code>search(from, to)</code>) and hides <b>how</b> (HTTP, NgRx actions, caching). Feature components depend on the facade, not on the store library. You can then swap NgRx Store for a SignalStore, or a REST API for GraphQL, without touching any component.</p>
      <p>🔵 <b>Domains (vertical slices).</b> Group libraries by <b>business domain</b> first (<code>booking</code>, <code>checkin</code>, <code>shared</code>), then by type. A domain only exposes a small public API (its <code>index.ts</code>); other domains may not reach into its internals. This is Domain-Driven Design's "bounded context" applied to the frontend.</p>
      ${H.table(['Folder', 'Inside'], [
        ['<code>libs/booking/feature-search</code>', 'search page (smart), routes'],
        ['<code>libs/booking/ui-flight-card</code>', 'flight card (presentational)'],
        ['<code>libs/booking/data-access</code>', 'FlightApi, BookingStore, BookingFacade'],
        ['<code>libs/shared/util-dates</code>', 'pure date helpers'],
        ['<code>libs/shared/ui-design-system</code>', 'buttons, inputs, dialogs (all domains use it)']
      ])}`,
    clues: [
      '"Our app has 400 components and every change breaks something else" → introduce library types + one-way dependency rules',
      '"Make this component reusable / put it in Storybook" → presentational: inputs/outputs only, OnPush, no data services',
      '"We may move from NgRx to SignalStore later" → hide the store behind a <b>facade</b>',
      '"Several teams, one Angular codebase" → domains (vertical slices) with a small public API per domain',
      '"Where should this HTTP call live?" → data-access library, never inside a ui library',
      '"Circular dependency detected" between features → extract shared code into a lower layer (data-access or util)'
    ],
    code: [
      { lang: 'ts', title: 'data-access: a signal-based facade that hides HTTP and state', code: `import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface Flight { id: number; from: string; to: string; date: string; delayed: boolean; }

@Injectable({ providedIn: 'root' })
export class FlightApi {
  private http = inject(HttpClient);
  find(from: string, to: string) {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<Flight[]>('/api/flights', { params });
  }
}

// The facade is the ONLY thing feature components talk to.
@Injectable({ providedIn: 'root' })
export class BookingFacade {
  private api = inject(FlightApi);

  // private writable state ...
  private readonly _flights = signal<Flight[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  // ... public read-only view of it
  readonly flights = this._flights.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly delayedCount = computed(() => this._flights().filter(f => f.delayed).length);

  async search(from: string, to: string): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    try {
      this._flights.set(await firstValueFrom(this.api.find(from, to)));
    } catch {
      this._error.set('Could not load flights. Please try again.');
    } finally {
      this._loading.set(false);
    }
  }
}` },
      { lang: 'ts', title: 'feature (smart) + ui (presentational) components', code: `import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { BookingFacade, Flight } from '@acme/booking/data-access';

// ui library: knows nothing about HTTP or stores
@Component({
  selector: 'ui-flight-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <article class="card" [class.delayed]="flight().delayed">
      <h3>{{ flight().from }} → {{ flight().to }}</h3>
      <p>{{ flight().date }}</p>
      <button type="button" (click)="select.emit(flight().id)">Select</button>
    </article>
  \`,
})
export class FlightCardComponent {
  flight = input.required<Flight>();
  select = output<number>();
}

// feature library: wires the facade to presentational pieces
@Component({
  selector: 'booking-flight-search',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FlightCardComponent],
  template: \`
    <button type="button" (click)="facade.search('HAM', 'GRZ')">Search</button>
    @if (facade.loading()) { <p>Loading…</p> }
    @if (facade.error(); as e) { <p role="alert">{{ e }}</p> }
    @for (f of facade.flights(); track f.id) {
      <ui-flight-card [flight]="f" (select)="onSelect($event)" />
    } @empty { <p>No flights yet.</p> }
  \`,
})
export class FlightSearchComponent {
  protected facade = inject(BookingFacade);
  onSelect(id: number) { console.log('selected', id); }
}` },
      { lang: 'js', run: true, title: 'Runnable model: check every import against the layer rules', code: `// Allowed edges between library types (who may import whom)
const allow = {
  app: ['feature', 'ui', 'data-access', 'util'],
  feature: ['feature', 'ui', 'data-access', 'util'],
  ui: ['ui', 'util'],
  'data-access': ['data-access', 'util'],
  util: ['util'],
};
const typeOf = name => ['app', 'feature', 'ui', 'data-access', 'util'].find(t => name.startsWith(t + '-'));

const imports = [
  ['app-booking', 'feature-search'],
  ['feature-search', 'ui-flight-card'],
  ['feature-search', 'data-access-booking'],
  ['ui-flight-card', 'data-access-booking'],   // a dumb card fetching data? not allowed
  ['data-access-booking', 'util-dates'],
  ['util-dates', 'ui-flight-card'],             // helpers depending on UI? not allowed
];

for (const [from, to] of imports) {
  const ok = allow[typeOf(from)].includes(typeOf(to));
  console.log((ok ? 'OK    ' : 'BLOCK ') + from + ' -> ' + to);
}` }
    ],
    viz: {
      title: 'Check each import against the layer rules',
      input: 'app-shop>feature-cart feature-cart>ui-price feature-cart>data-access-cart ui-price>data-access-cart data-access-cart>util-money util-money>ui-price',
      inputLabel: 'imports as from>to, names start with app-, feature-, ui-, data-access- or util-',
      gen: function (input) {
        var pairs = words(input, 10, 'Write imports like feature-cart>ui-price separated by spaces.');
        var edges = [], names = [];
        pairs.forEach(function (p) {
          var ab = p.split('>');
          if (ab.length !== 2 || !layerOf(ab[0]) || !layerOf(ab[1])) throw new Error('Bad import "' + p + '". Use from>to with names like feature-x, ui-x, data-access-x, util-x, app-x.');
          edges.push(ab);
          if (names.indexOf(ab[0]) < 0) names.push(ab[0]);
          if (names.indexOf(ab[1]) < 0) names.push(ab[1]);
        });
        if (names.length > 9) throw new Error('Use at most 9 distinct libraries.');
        var rowY = { app: 6, feature: 20, ui: 34, 'data-access': 48, util: 62 }, perRow = {};
        var nodes = names.map(function (n) {
          var t = layerOf(n); perRow[t] = (perRow[t] || 0) + 1;
          return { id: n, label: n, x: 12 + (perRow[t] - 1) * 30, y: rowY[t], shape: 'box', w: 26 };
        });
        var frames = [], ehl = {}, bad = 0;
        frames.push({ narr: 'Libraries are drawn by <b>type</b>: app on top, then feature, ui, data-access, util at the bottom. The rule of thumb: imports may only point <b>down</b> (or sideways where allowed).', parts: [{ type: 'graph', directed: true, height: 70, nodes: nodes, edges: edges, hl: {}, ehl: {} }, { type: 'table', label: 'rules', columns: ['type', 'may import'], rows: Object.keys(LAYER_ALLOW).map(function (k) { return [k, LAYER_ALLOW[k].join(', ')]; }) }] });
        edges.forEach(function (e) {
          var ft = layerOf(e[0]), tt = layerOf(e[1]), ok = LAYER_ALLOW[ft].indexOf(tt) >= 0;
          var key = e[0] + '-' + e[1];
          ehl = Object.assign({}, ehl); ehl[key] = ok ? 'ok' : 'bad';
          if (!ok) bad++;
          var hl = {}; hl[e[0]] = 'cur'; hl[e[1]] = ok ? 'ok' : 'bad';
          frames.push({ narr: '<code>' + H.esc(e[0]) + '</code> (' + ft + ') imports <code>' + H.esc(e[1]) + '</code> (' + tt + '). ' + (ok ? '<b>Allowed</b>: a ' + ft + ' library may use ' + tt + ' code.' : '<b>Blocked</b>: a ' + ft + ' library may only import ' + LAYER_ALLOW[ft].join(', ') + '. Lint fails here. Fix: move the shared code down a layer or invert the dependency (pass data via inputs).'), parts: [{ type: 'graph', directed: true, height: 70, nodes: nodes, edges: edges, hl: hl, ehl: ehl }] });
        });
        frames.push({ narr: bad ? '<b>' + bad + ' violation(s)</b>. In Nx these become lint errors from <code>@nx/enforce-module-boundaries</code>, so they never reach main.' : 'Clean graph: every arrow points to an allowed layer. Changes to a ui library can never break data-access, and util stays pure.', parts: [{ type: 'graph', directed: true, height: 70, nodes: nodes, edges: edges, hl: {}, ehl: ehl }] });
        return pad4(frames);
      }
    },
    examples: [
      { title: 'Refactor a "god component" into smart + presentational', html: `<p>A 600-line <code>OrdersComponent</code> injects <code>HttpClient</code>, holds filters, formats money and renders a table. Split it: <code>OrdersPageComponent</code> (feature, smart) injects <code>OrdersFacade</code>; <code>OrdersTableComponent</code> and <code>OrderFilterComponent</code> (ui) take inputs and emit outputs; <code>formatMoney</code> moves to <code>util-format</code>; the HTTP call moves to <code>data-access-orders</code>. Each piece now has one reason to change and can be tested alone.</p>
        ${H.table(['Before', 'After'], [['1 file, 600 lines, Default CD', '4 files, ~120 lines each, all OnPush'], ['Test needs HttpClient mocks + DOM', 'UI tested with inputs; facade tested without DOM'], ['Reuse impossible', 'Table reused in admin and customer apps']])}` },
      { title: 'Facade over NgRx: the components never see actions', html: `<p>If the team already uses NgRx Store, the facade can still be the only contact point. Later swapping to SignalStore only changes this file.</p>`,
        code: { lang: 'ts', code: `import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { ordersActions } from './orders.actions';
import { selectOrders, selectOrdersLoading } from './orders.selectors';

@Injectable({ providedIn: 'root' })
export class OrdersFacade {
  private store = inject(Store);
  readonly orders = this.store.selectSignal(selectOrders);
  readonly loading = this.store.selectSignal(selectOrdersLoading);
  load(status: string) { this.store.dispatch(ordersActions.load({ status })); }
  cancel(id: string) { this.store.dispatch(ordersActions.cancel({ id })); }
}` } },
      { title: 'Public API: only index.ts is importable', html: `<p>Each library has one <code>index.ts</code> and a path alias in <code>tsconfig.base.json</code>. Other libraries import <code>@acme/booking/data-access</code>, never <code>@acme/booking/data-access/src/lib/internal/cache</code>. What is not exported is private, so the owning team can refactor it freely.</p>`,
        code: { lang: 'ts', code: `// libs/booking/data-access/src/index.ts
export { BookingFacade } from './lib/booking.facade';
export type { Flight } from './lib/flight.model';
// FlightApi and the cache stay internal: not exported on purpose.` } }
    ],
    deepDive: `<p>🟣 <b>Why types and not just folders?</b> A type encodes <i>allowed dependencies</i>, and therefore what can break what. util has no Angular dependencies at all, so it is trivially testable and reusable. ui depends only on ui and util, so a design-system change never requires a backend change. data-access never imports components, so it can be reused by a different UI (an admin app, a mobile Ionic app).</p>
      <p>🟣 <b>Facade criticism.</b> Facades add a layer; with a simple signal service the service <i>is</i> already a facade, and wrapping it again is ceremony. Use a separate facade when (a) the state layer is a library with its own API (NgRx), (b) a screen needs data from several stores, or (c) you expect to replace the implementation. Do not make one giant facade for the whole app; one per feature/use case.</p>
      <p>🟣 <b>Smart vs presentational is a spectrum.</b> A date picker is "presentational" but has internal state (which month is open). That is fine: local UI state can live in the component (signals). The line is <b>application state and side effects</b> (HTTP, routing, global store): those belong to smart components or services.</p>
      <p>🟣 <b>Standalone changed the unit of reuse.</b> With standalone components (default since v19) there is no NgModule to group things, so the <b>library</b> becomes the grouping unit, its <code>index.ts</code> the API, and route files (<code>*.routes.ts</code>) the entry point of a feature. Lazy-loading a feature is <code>loadChildren: () =&gt; import('@acme/booking/feature-search').then(m =&gt; m.SEARCH_ROUTES)</code>.</p>
      <p>🟣 <b>Scaling numbers.</b> Typical large Nx Angular workspaces have hundreds of libraries. Buildable/publishable libs are optional: most teams keep libraries non-buildable (compiled by the app) and only get caching from <code>nx affected</code> on lint/test.</p>`,
    aiEra: `<p>🤖 AI coding agents work much better in a well-layered repo: a small library with a clear type and public API fits in the context window, and lint rules give the agent fast, objective feedback ("your import violates module boundaries"). Without rules, agents happily inject <code>HttpClient</code> into a presentational card because it was the shortest path. Practical tips: put the layer rules in your agent instructions file (e.g. <code>AGENTS.md</code> / <code>CLAUDE.md</code>), ask the agent to generate new code with <code>nx g @nx/angular:library</code> so the tags are right, and let it refactor god components into smart + presentational pieces, then review the boundaries yourself. In interviews, being able to draw this diagram on a whiteboard in two minutes is a strong senior signal.</p>`,
    problems: [{
      title: 'Find Layer Violations in an Import List',
      level: 'Medium', tags: ['architecture', 'libraries', 'graphs'], companies: ['Thoughtworks', 'SAP', 'Deloitte'],
      statement: `<p>Given library names (prefixed with their type: <code>app-</code>, <code>feature-</code>, <code>ui-</code>, <code>data-access-</code>, <code>util-</code>) and a list of imports <code>[from, to]</code>, return the list of imports that violate the layer rules (feature → feature/ui/data-access/util; ui → ui/util; data-access → data-access/util; util → util; app → anything). Also report any <b>cycle</b> among the libraries as a second result.</p>`,
      constraints: `Up to 500 libraries and 5 000 imports.`,
      example: `<p>Imports <code>ui-card→data-access-cart</code>, <code>feature-a→feature-b</code>, <code>feature-b→feature-a</code>. Violations: ${H.c('r', 'ui-card→data-access-cart')}. Cycle: ${H.c('y', 'feature-a → feature-b → feature-a')} (allowed by type, but cycles still make lazy loading and builds painful).</p>`,
      brute: { why: `<p>Checking only the type rule misses cycles: two features importing each other are both "allowed" by type yet impossible to lazy-load separately. A naive cycle check that starts a DFS from every node repeats work: O(V·(V+E)).</p>`,
        code: { lang: 'js', run: true, code: `const allow = { app: 'feature ui data-access util', feature: 'feature ui data-access util', ui: 'ui util', 'data-access': 'data-access util', util: 'util' };
const t = n => ['app', 'feature', 'ui', 'data-access', 'util'].find(p => n.startsWith(p + '-'));
const imports = [['ui-card', 'data-access-cart'], ['feature-a', 'feature-b'], ['feature-b', 'feature-a']];
// Only the type check: the cycle goes unnoticed
console.log(imports.filter(([a, b]) => !allow[t(a)].split(' ').includes(t(b))));` } },
      mcq: { q: 'Two feature libraries import each other. Types allow feature → feature. What is the best fix?', options: ['Leave it, the type rule passes', 'Extract the shared piece into a data-access or util library both can use', 'Merge everything into the app'], answer: 1, explain: 'A cycle means the two features cannot be built, tested or lazy-loaded independently. Moving the shared code down a layer breaks the cycle.' },
      hints: [
        `<p>Hint 1: the type check is a simple lookup per edge: type(from) → allowed set → contains type(to)?</p>`,
        `<p>Hint 2: for cycles, run one DFS over the whole graph with three colours: white (unvisited), grey (on the current path), black (finished).</p>`,
        `<p>Hint 3: meeting a grey node means a back edge, which is a cycle. Keep the path stack to print it. Each node and edge is processed once: O(V + E).</p>`
      ],
      solution: {
        approach: `<p>First pass: filter edges whose target type is not in the allow-list of the source type. Second pass: three-colour DFS; a grey neighbour closes a cycle, which we slice out of the current path.</p>`,
        code: { lang: 'js', run: true, code: `const allow = { app: ['feature', 'ui', 'data-access', 'util'], feature: ['feature', 'ui', 'data-access', 'util'], ui: ['ui', 'util'], 'data-access': ['data-access', 'util'], util: ['util'] };
const typeOf = n => ['app', 'feature', 'ui', 'data-access', 'util'].find(p => n.startsWith(p + '-'));

function audit(imports) {
  const violations = imports.filter(([a, b]) => !allow[typeOf(a)].includes(typeOf(b)));
  const adj = new Map();
  for (const [a, b] of imports) {
    if (!adj.has(a)) adj.set(a, []);
    if (!adj.has(b)) adj.set(b, []);
    adj.get(a).push(b);
  }
  const color = new Map(), path = [], cycles = [];
  function dfs(u) {
    color.set(u, 'grey'); path.push(u);
    for (const v of adj.get(u)) {
      if (color.get(v) === 'grey') cycles.push(path.slice(path.indexOf(v)).concat(v).join(' -> '));
      else if (!color.has(v)) dfs(v);
    }
    path.pop(); color.set(u, 'black');
  }
  for (const n of adj.keys()) if (!color.has(n)) dfs(n);
  return { violations, cycles };
}

console.log(audit([
  ['app-shop', 'feature-a'], ['ui-card', 'data-access-cart'],
  ['feature-a', 'feature-b'], ['feature-b', 'feature-a'], ['data-access-cart', 'util-money'],
]));` },
        complexity: `<p>O(V + E) time and memory. Nx computes the same project graph from your TypeScript imports and its lint rule reports both type violations and circular dependencies.</p>`,
        followUps: ['How would you print the shortest cycle instead of any cycle?', 'How would you add a "scope" dimension (domain) on top of the type?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 2 — Nx monorepos & module-boundary rules
     ===================================================================== */
  var NX_PROJECTS = {
    'booking-feature-search': ['scope:booking', 'type:feature'],
    'booking-data-access': ['scope:booking', 'type:data-access'],
    'checkin-feature-scan': ['scope:checkin', 'type:feature'],
    'checkin-data-access': ['scope:checkin', 'type:data-access'],
    'shared-ui-button': ['scope:shared', 'type:ui'],
    'shared-util-dates': ['scope:shared', 'type:util']
  };
  var NX_RULES = [
    { sourceTag: 'scope:booking', only: ['scope:booking', 'scope:shared'] },
    { sourceTag: 'scope:checkin', only: ['scope:checkin', 'scope:shared'] },
    { sourceTag: 'scope:shared', only: ['scope:shared'] },
    { sourceTag: 'type:feature', only: ['type:feature', 'type:ui', 'type:data-access', 'type:util'] },
    { sourceTag: 'type:ui', only: ['type:ui', 'type:util'] },
    { sourceTag: 'type:data-access', only: ['type:data-access', 'type:util'] },
    { sourceTag: 'type:util', only: ['type:util'] }
  ];

  topics.push({
    title: 'Nx Monorepos: Project Graph, Tags & Module-Boundary Rules, Affected Builds',
    analogy: `<p>Picture a <b>big apartment building</b> with many families (teams). Everyone shares the lift and the plumbing (one repo, one <code>node_modules</code>, one Angular version). To keep peace, the building has a <b>key-card system</b>: each door is tagged ("floor 3", "staff only"), and your card says which tags you may open. That is Nx tags plus <code>enforce-module-boundaries</code>. And when a pipe on floor 3 is repaired, the plumber only checks the floors below it, not the whole building: that is <code>nx affected</code>.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> <b>Nx</b> is a build system for monorepos with first-class Angular support (<code>@nx/angular</code>). It reads your TypeScript imports to build a <b>project graph</b> (which app/library uses which), then uses that graph for three things: <b>rules</b> (who may import whom), <b>speed</b> (run tasks only for affected projects and cache results), and <b>code generation</b> (generators that create libraries and components the same way every time).</p>
      <p>🔵 <b>Tags.</b> Each project declares tags in its <code>project.json</code>. The common scheme is two dimensions: <b>scope</b> (business domain: <code>scope:booking</code>, <code>scope:shared</code>) and <b>type</b> (layer: <code>type:feature</code>, <code>type:ui</code>, <code>type:data-access</code>, <code>type:util</code>). The ESLint rule <code>@nx/enforce-module-boundaries</code> holds <code>depConstraints</code>: for each source tag, which tags the target must have.</p>
      ${H.table(['Constraint option', 'Meaning'], [
        ['<code>onlyDependOnLibsWithTags</code>', 'Target must have at least one of these tags'],
        ['<code>notDependOnLibsWithTags</code>', 'Target must have none of these tags (also checked transitively)'],
        ['<code>allSourceTags</code>', 'Constraint applies only to projects that have <b>all</b> listed tags (combine scope + type)'],
        ['<code>onlyDependOnLibsWithTags: [\'*\']</code>', 'Anything goes (used for app shells)'],
        ['<code>enforceBuildableLibDependency</code>', 'A buildable lib may only depend on other buildable libs'],
        ['<code>banTransitiveDependencies</code>', 'Import only packages you declare, not ones you get indirectly']
      ])}
      <p>A project with several tags must satisfy <b>every</b> constraint whose <code>sourceTag</code> it carries. So <code>booking-feature-search</code> (scope:booking + type:feature) may import <code>shared-ui-button</code> (scope rule: shared ok; type rule: ui ok), but not <code>checkin-data-access</code> (scope rule fails).</p>
      <p>The rule also reports: <b>deep imports</b> into another library's files (must use its public path alias), <b>relative imports</b> crossing project roots, <b>circular dependencies</b>, and <b>static imports of lazy-loaded libraries</b> (which would silently pull the lazy chunk into the main bundle).</p>
      <p>🔵 <b>Affected and caching.</b> <code>nx affected -t lint test build</code> compares your branch to <code>main</code>, maps changed files to projects, and runs tasks only for those projects and everything that depends on them. Every task result is cached by a hash of its inputs (source files, deps, config, environment), locally and optionally in a remote cache (Nx Cloud or self-hosted), so a CI run often replays most tasks in seconds.</p>`,
    clues: [
      '"Team A keeps importing Team B\'s internals" → scope tags + <code>onlyDependOnLibsWithTags</code>, public API via path aliases',
      '"CI takes 50 minutes for a one-line change" → <code>nx affected</code> + local/remote computation cache',
      '"The lazy admin chunk ended up in main.js" → a static import of a lazy-loaded lib; the boundary rule flags it',
      '"Every developer creates libraries differently" → Nx generators (<code>nx g @nx/angular:library</code>) with tags and conventions',
      '"Upgrade Angular across 30 apps at once" → single-version policy + <code>nx migrate</code> which runs Angular migrations too',
      '"Not ready for Nx but want rules" → lighter tools like Sheriff (tag-based boundaries on top of plain Angular CLI)'
    ],
    code: [
      { lang: 'json', title: 'libs/booking/feature-search/project.json (trimmed)', code: `{
  "name": "booking-feature-search",
  "sourceRoot": "libs/booking/feature-search/src",
  "projectType": "library",
  "tags": ["scope:booking", "type:feature"],
  "targets": {
    "lint": { "executor": "@nx/eslint:lint" },
    "test": { "executor": "@nx/jest:jest", "options": { "jestConfig": "libs/booking/feature-search/jest.config.ts" } }
  }
}` },
      { lang: 'js', title: 'eslint.config.mjs — enforce-module-boundaries with two tag dimensions', check: false, code: `import nx from '@nx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/angular'],
  {
    files: ['**/*.ts'],
    rules: {
      '@nx/enforce-module-boundaries': ['error', {
        enforceBuildableLibDependency: true,
        allow: [],
        depConstraints: [
          // scope dimension: domains only use themselves + shared
          { sourceTag: 'scope:booking', onlyDependOnLibsWithTags: ['scope:booking', 'scope:shared'] },
          { sourceTag: 'scope:checkin', onlyDependOnLibsWithTags: ['scope:checkin', 'scope:shared'] },
          { sourceTag: 'scope:shared',  onlyDependOnLibsWithTags: ['scope:shared'] },
          // type dimension: layers only point down
          { sourceTag: 'type:app',         onlyDependOnLibsWithTags: ['*'] },
          { sourceTag: 'type:feature',     onlyDependOnLibsWithTags: ['type:feature', 'type:ui', 'type:data-access', 'type:util'] },
          { sourceTag: 'type:ui',          onlyDependOnLibsWithTags: ['type:ui', 'type:util'] },
          { sourceTag: 'type:data-access', onlyDependOnLibsWithTags: ['type:data-access', 'type:util'] },
          { sourceTag: 'type:util',        onlyDependOnLibsWithTags: ['type:util'] },
          // no UI frameworks leaking into pure utils (checked transitively)
          { sourceTag: 'type:util', notDependOnLibsWithTags: ['type:ui'] },
        ],
      }],
    },
  },
];` },
      { lang: 'bash', title: 'Everyday Nx commands', code: `# create a tagged library in the right folder
npx nx g @nx/angular:library --directory=libs/booking/feature-search --tags=scope:booking,type:feature

# see the project graph in the browser
npx nx graph

# only lint/test/build what this branch touched (and its dependents)
npx nx affected -t lint test build --base=origin/main --head=HEAD

# upgrade Nx + Angular together, then run the generated code migrations
npx nx migrate latest
npx nx migrate --run-migrations` },
      { lang: 'js', run: true, title: 'Runnable model: evaluate depConstraints for one import', code: `const projects = {
  'booking-feature-search': ['scope:booking', 'type:feature'],
  'checkin-data-access': ['scope:checkin', 'type:data-access'],
  'shared-ui-button': ['scope:shared', 'type:ui'],
};
const rules = [
  { sourceTag: 'scope:booking', only: ['scope:booking', 'scope:shared'] },
  { sourceTag: 'type:feature', only: ['type:feature', 'type:ui', 'type:data-access', 'type:util'] },
];

function check(from, to) {
  const src = projects[from], dst = projects[to];
  for (const r of rules) {
    if (!src.includes(r.sourceTag)) continue;                 // rule does not apply
    if (!r.only.some(tag => dst.includes(tag)))
      return 'ERROR ' + from + ' -> ' + to + ': ' + r.sourceTag + ' may only use ' + r.only.join(' | ');
  }
  return 'ok    ' + from + ' -> ' + to;
}
console.log(check('booking-feature-search', 'shared-ui-button'));
console.log(check('booking-feature-search', 'checkin-data-access'));` }
    ],
    viz: {
      title: 'Evaluate every depConstraint for one import',
      input: 'booking-feature-search>checkin-data-access',
      inputLabel: 'from>to using: ' + Object.keys(NX_PROJECTS).join(', '),
      gen: function (input) {
        var ab = String(input || '').trim().split('>');
        if (ab.length !== 2 || !NX_PROJECTS[ab[0]] || !NX_PROJECTS[ab[1]]) throw new Error('Write from>to with two of: ' + Object.keys(NX_PROJECTS).join(', '));
        var src = NX_PROJECTS[ab[0]], dst = NX_PROJECTS[ab[1]], frames = [], failed = null;
        var rows = NX_RULES.map(function (r) { return [r.sourceTag, r.only.join(', '), '']; });
        function tbl(hl) { return { type: 'table', label: 'depConstraints', columns: ['sourceTag', 'onlyDependOnLibsWithTags', 'result'], rows: rows.map(function (r) { return r.slice(); }), hl: hl }; }
        var tags = { type: 'map', label: 'tags', entries: [[ab[0], src.join(' ')], [ab[1], dst.join(' ')]], hl: {} };
        frames.push({ narr: 'Lint sees <code>import ... from \'@acme/' + H.esc(ab[1]) + '\'</code> inside <code>' + H.esc(ab[0]) + '</code>. Nx looks up both projects\' tags in the project graph.', parts: [tags, tbl({})] });
        NX_RULES.forEach(function (r, i) {
          var hl = {};
          if (src.indexOf(r.sourceTag) < 0) {
            rows[i][2] = 'skip'; hl[i] = 'done';
            frames.push({ narr: 'Rule for <code>' + r.sourceTag + '</code>: the source does not carry this tag, so the rule is <b>skipped</b>.', parts: [tags, tbl(hl)] });
            return;
          }
          var ok = r.only.some(function (t) { return dst.indexOf(t) >= 0; });
          rows[i][2] = ok ? 'pass' : 'FAIL'; hl[i] = ok ? 'ok' : 'bad';
          if (!ok && !failed) failed = r;
          frames.push({ narr: 'Rule for <code>' + r.sourceTag + '</code> applies. Does the target have one of [' + r.only.join(', ') + ']? Target tags: ' + dst.join(', ') + ' → <b>' + (ok ? 'yes, pass' : 'no, FAIL') + '</b>.', parts: [tags, tbl(hl)] });
        });
        frames.push({ narr: failed ? H.c('r', '<b>Lint error</b>') + ': "A project tagged with <code>' + failed.sourceTag + '</code> can only depend on libs tagged with ' + failed.only.join(', ') + '". Every applicable rule must pass, one failure is enough to block the import.' : H.c('g', '<b>Import allowed</b>') + ': every rule the source carries passed. Scope and type are checked independently.', parts: [tags, tbl({})] });
        return pad4(frames);
      }
    },
    examples: [
      { title: 'Folder layout for two domains + shared', html: `${H.table(['Path', 'Tags'], [
        ['<code>apps/airline</code>', 'type:app'],
        ['<code>libs/booking/feature-search</code>', 'scope:booking, type:feature'],
        ['<code>libs/booking/data-access</code>', 'scope:booking, type:data-access'],
        ['<code>libs/checkin/feature-scan</code>', 'scope:checkin, type:feature'],
        ['<code>libs/shared/ui-design-system</code>', 'scope:shared, type:ui'],
        ['<code>libs/shared/util-auth</code>', 'scope:shared, type:util']
      ])}<p>Cross-domain needs (check-in wants the booking reference) are solved by moving the shared model to <code>shared</code>, or by a small "api" library that booking deliberately exposes (tag <code>type:api</code>) — never by letting check-in import booking internals.</p>` },
      { title: 'How affected saves CI time', html: `<p>A PR changes <code>libs/shared/util-dates</code>. The graph says it is used by <code>booking-data-access</code> → <code>booking-feature-search</code> → <code>apps/airline</code>. Nx runs lint/test for those 4 projects only; the other 120 are skipped. With remote caching, the build of unchanged projects is replayed from cache on every other machine too.</p>
        ${H.table(['Change', 'Affected'], [['libs/shared/util-dates/src/x.ts', 'util-dates, booking-data-access, booking-feature-search, airline'], ['libs/checkin/feature-scan/...', 'feature-scan, airline'], ['package.json / nx.json / tsconfig.base.json', 'everything (global inputs)']])}` },
      { title: 'Catching an accidental eager import of a lazy library', html: `<p>The admin routes are lazy, but someone writes <code>import { AdminUser } from '@acme/admin/feature-users'</code> in the shell to reuse a type. Now the whole admin chunk is in the initial bundle. <code>enforce-module-boundaries</code> reports "Static imports of lazy-loaded libraries are forbidden". Fix: move <code>AdminUser</code> into <code>admin/data-access</code> or a <code>util</code>/model library.</p>`,
        code: { lang: 'ts', code: `import { Routes } from '@angular/router';

export const appRoutes: Routes = [
  {
    path: 'admin',
    // lazy: fine
    loadChildren: () => import('@acme/admin/feature-users').then(m => m.ADMIN_ROUTES),
  },
];
// BAD (elsewhere in the shell): import { AdminUser } from '@acme/admin/feature-users';
// GOOD: import type { AdminUser } from '@acme/admin/model';` } }
    ],
    deepDive: `<p>🟣 <b>How Nx builds the graph.</b> It parses TypeScript imports (and <code>package.json</code> dependencies) of every project and maps them to projects via the path aliases in <code>tsconfig.base.json</code>. Plugins can add implicit dependencies or infer targets from config files ("project crystal" inferred tasks since Nx 18), so many projects no longer need a hand-written <code>targets</code> block.</p>
      <p>🟣 <b>Task hashing.</b> A task hash includes the project's source files, the hashes of its dependencies' sources, relevant config (<code>namedInputs</code> in <code>nx.json</code>, e.g. exclude <code>*.spec.ts</code> from the <code>build</code> input), runtime values, and the command. Same hash → cached terminal output and artifacts are restored. Getting <code>inputs</code>/<code>outputs</code> right is the difference between a safe cache and a stale one.</p>
      <p>🟣 <b>Buildable vs non-buildable libraries.</b> Non-buildable libs are compiled as part of the app (simplest, fastest for small teams). Buildable libs (<code>@nx/angular:ng-packagr-lite</code>) let Nx cache each lib's compiled output and enable incremental builds for huge apps; publishable libs produce an npm package in Angular Package Format. Most workspaces stay non-buildable until build time really hurts.</p>
      <p>🟣 <b>Single-version policy.</b> One root <code>package.json</code> means every app runs the same Angular/RxJS version. That makes upgrades one PR instead of 30 and avoids duplicate framework copies — but forces everyone to upgrade together. Micro-frontends (next topic) are the escape hatch when teams truly need independent release cadence.</p>
      <p>🟣 <b>Conformance and ownership.</b> Nx Powerpack/Enterprise adds CODEOWNERS generation from project ownership and conformance rules beyond imports. Open-source alternatives: GitHub CODEOWNERS per <code>libs/&lt;domain&gt;</code>, plus dependency-cruiser or Sheriff for boundary checks without Nx.</p>`,
    aiEra: `<p>🤖 Nx ships an MCP server and editor integration that let AI agents query the real project graph ("which projects use util-dates?", "what are this library's tags?") instead of guessing from file names, and run generators instead of hand-writing boilerplate. That matters: an agent asked to "add a component" might drop it in the wrong library; with generators + boundary lint it gets immediate feedback. In CI, Nx Cloud offers AI-assisted explanations of failed tasks and self-healing suggestions; treat them like a junior's PR. The architectural decisions — what the domains are, which tags exist, what is public — remain human work and are exactly what senior interviews probe.</p>`,
    problems: [{
      title: 'Compute the Affected Projects for a Change',
      level: 'Medium', tags: ['nx', 'graphs', 'ci'], companies: ['Nrwl', 'Microsoft', 'Cisco'],
      statement: `<p>Given the project graph as a dependency list <code>[project, dependsOn]</code> and a list of changed projects, return all <b>affected</b> projects: the changed ones plus every project that depends on them directly or transitively. Return them in a valid <b>build order</b> (dependencies before dependents).</p>`,
      constraints: `Up to 2 000 projects; the graph is acyclic.`,
      example: `<p>Deps: <code>app→feature</code>, <code>feature→data</code>, <code>data→util</code>, <code>feature→ui</code>. Changed: <code>util</code>. Affected in order: ${H.c('g', 'util, data, feature, app')}. <code>ui</code> is untouched.</p>`,
      brute: { why: `<p>Re-running every project ignores the graph. Checking "does X depend on the changed project?" by a fresh DFS per project is O(V·(V+E)).</p>`,
        code: { lang: 'js', run: true, code: `const deps = [['app', 'feature'], ['feature', 'data'], ['data', 'util'], ['feature', 'ui']];
const all = [...new Set(deps.flat())];
console.log('run everything:', all); // wastes CI on ui` } },
      mcq: { q: 'Which direction do you traverse to find affected projects?', options: ['From the changed project to its dependencies', 'From the changed project to its dependents (reverse edges)', 'Both directions'], answer: 1, explain: 'If util changes, those who import util may break. Reverse the edges and BFS from the changed projects.' },
      hints: [
        `<p>Hint 1: build a reverse adjacency list: for each <code>[a, b]</code> add <code>a</code> to <code>dependents[b]</code>.</p>`,
        `<p>Hint 2: BFS from all changed projects over dependents to collect the affected set.</p>`,
        `<p>Hint 3: for the order, run Kahn's topological sort on the subgraph induced by the affected set (count in-degree only from affected dependencies).</p>`
      ],
      solution: {
        approach: `<p>Reverse-edge BFS gives the affected set in O(V + E); Kahn's algorithm restricted to that set gives a build order where every project is built after the projects it depends on.</p>`,
        code: { lang: 'js', run: true, code: `function affected(deps, changed) {
  const dependents = new Map(), dependsOn = new Map();
  const add = (m, k, v) => { if (!m.has(k)) m.set(k, []); if (v !== undefined) m.get(k).push(v); };
  for (const [a, b] of deps) { add(dependents, b, a); add(dependents, a); add(dependsOn, a, b); add(dependsOn, b); }

  const set = new Set(changed), queue = [...changed];
  while (queue.length) {
    const p = queue.shift();
    for (const d of dependents.get(p) || []) if (!set.has(d)) { set.add(d); queue.push(d); }
  }

  // Kahn's topological sort inside the affected set
  const indeg = new Map([...set].map(p => [p, (dependsOn.get(p) || []).filter(x => set.has(x)).length]));
  const ready = [...set].filter(p => indeg.get(p) === 0).sort(), order = [];
  while (ready.length) {
    const p = ready.shift(); order.push(p);
    for (const d of dependents.get(p) || []) {
      if (!set.has(d)) continue;
      indeg.set(d, indeg.get(d) - 1);
      if (indeg.get(d) === 0) ready.push(d);
    }
  }
  return order;
}
const deps = [['app', 'feature'], ['feature', 'data'], ['data', 'util'], ['feature', 'ui'], ['admin', 'ui']];
console.log(affected(deps, ['util']));
console.log(affected(deps, ['ui']));` },
        complexity: `<p>O(V + E). Nx does this plus file → project mapping, global inputs (root config changes affect everything) and task-level parallelism with <code>--parallel</code>.</p>`,
        followUps: ['How do root files like package.json fit in?', 'How would you parallelise builds level by level?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 3 — Micro-frontends with Module Federation / Native Federation
     ===================================================================== */
  topics.push({
    title: 'Angular Micro-Frontends: Module Federation, Native Federation, Shared Singletons & Version Skew',
    analogy: `<p>A <b>shopping mall</b>: the mall owner (the <b>shell</b> or host) owns the building, the corridors (routing) and the electricity (shared Angular runtime). Each <b>shop</b> (remote) is run by its own company, renovates on its own schedule and opens its doors when you walk in (loaded at runtime). The directory board at the entrance (the <b>manifest</b>) says which shop is where today. If every shop brought its own power generator (its own copy of Angular) the mall would be loud and slow, so shops plug into the shared supply — but only if their plugs fit (compatible versions).</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> Micro-frontends (fe15 covered the general idea) let independent teams <b>deploy separately</b> and compose the UI <b>at runtime</b>. In Angular there are two main runtime mechanisms:</p>
      ${H.table(['', 'Module Federation (webpack/Rspack)', 'Native Federation'], [
        ['Package', '<code>@angular-architects/module-federation</code>, or Nx <code>@nx/angular</code> host/remote generators (webpack or Rspack, <code>@module-federation/enhanced</code>)', '<code>@angular-architects/native-federation</code>'],
        ['Builder', 'Needs a webpack/Rspack-based build (custom builder), not the default esbuild <code>application</code> builder', 'Wraps the default esbuild <code>application</code> builder (Angular 17+)'],
        ['Runtime', 'webpack container + share scope', 'Browser-native <b>ES modules + import maps</b> (with the es-module-shims polyfill where needed)'],
        ['Config', '<code>webpack.config.js</code> / <code>module-federation.config.ts</code>', '<code>federation.config.js</code>, same mental model'],
        ['Status in 2026', 'Mature; Nx + Rspack is a common choice', 'The common choice for CLI apps on esbuild; also bundler-agnostic']
      ])}
      <p>🔵 <b>The moving parts.</b> A <b>remote</b> declares what it <code>exposes</code> (e.g. <code>'./routes'</code> → its route array) and which packages it <code>shares</code>. The <b>host</b> reads a <b>manifest</b> (<code>federation.manifest.json</code>: remote name → URL of its <code>remoteEntry.json</code>), initialises federation <i>before</i> Angular boots, then lazy-loads remotes from routes with <code>loadRemoteModule('mfe-cart', './routes')</code>. Because the manifest is fetched at runtime, you can point to a new remote version without rebuilding the host.</p>
      <p>🔵 <b>Sharing.</b> <code>shareAll({ singleton: true, strictVersion: true, requiredVersion: 'auto' })</code> shares every dependency from <code>package.json</code>. <b>singleton</b> means one copy for the whole page — mandatory for <code>@angular/core</code>, <code>@angular/router</code>, <code>rxjs</code> and zone.js, because two copies of Angular means two injectors trees, two zones and broken DI tokens. <b>strictVersion</b> turns a version mismatch into an error instead of a silent second copy.</p>
      <p>🔵 <b>Version skew.</b> Sharing Angular as a singleton works only when all teams use a <b>compatible (same major) version</b>. If a team must stay on an older major, you either (a) give it its own Angular copy and wrap its app as a <b>Web Component</b> (Angular Elements, <code>createCustomElement</code>) — the "multi-version" approach, heavier and with rough edges around routing and zone.js — or (b) coordinate upgrades. Many companies conclude: a well-structured Nx monorepo (previous topic) with one version gives most of the benefits with far fewer problems; use federation only when separate deployments are a hard requirement.</p>`,
    clues: [
      '"Teams must deploy independently / different release trains" → micro-frontends with a runtime manifest',
      '"We are on the esbuild application builder" → Native Federation (no webpack config needed)',
      '"Error: NG0203 / inject() must be called from an injection context, only in the micro-frontend" or "two zones" → Angular loaded twice; share it as a singleton',
      '"One team cannot upgrade to the new Angular major" → version skew: multi-version via Web Components, or coordinate the upgrade',
      '"The shell must work even if the cart remote is down" → catch the loadRemoteModule error and route to a fallback component',
      '"Change the remote URL per environment without rebuilding" → load the manifest at runtime'
    ],
    code: [
      { lang: 'js', title: 'federation.config.js of a remote (Native Federation)', check: false, code: `const { withNativeFederation, shareAll } = require('@angular-architects/native-federation/config');

module.exports = withNativeFederation({
  name: 'mfe-cart',
  exposes: {
    // what the shell may load: a route array (lazy feature) is the most robust contract
    './routes': './projects/mfe-cart/src/app/cart.routes.ts',
  },
  shared: {
    // one copy of Angular, RxJS etc. for the whole page; mismatch = error, not a silent duplicate
    ...shareAll({ singleton: true, strictVersion: true, requiredVersion: 'auto' }),
  },
  skip: ['rxjs/ajax', 'rxjs/fetch', 'rxjs/testing', 'rxjs/webSocket'],
});` },
      { lang: 'ts', title: 'Host: main.ts initialises federation before Angular boots', code: `import { initFederation } from '@angular-architects/native-federation';

// 1. read the manifest (remote name -> remoteEntry URL), build the import map
// 2. only then load the real bootstrap code, so shared packages resolve to ONE copy
initFederation('federation.manifest.json')
  .catch(err => console.error('Federation init failed', err))
  .then(() => import('./bootstrap'))
  .catch(err => console.error(err));` },
      { lang: 'ts', title: 'Host routes: lazy-load a remote with a graceful fallback', code: `import { Routes } from '@angular/router';
import { loadRemoteModule } from '@angular-architects/native-federation';
import { RemoteUnavailableComponent } from './remote-unavailable.component';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./home.component').then(m => m.HomeComponent) },
  {
    path: 'cart',
    loadChildren: () =>
      loadRemoteModule('mfe-cart', './routes')
        .then(m => m.CART_ROUTES)
        // remote down or deploy broken: the shell keeps working
        .catch(() => [{ path: '**', component: RemoteUnavailableComponent }]),
  },
];` },
      { lang: 'json', title: 'federation.manifest.json (served by the host, editable per environment)', code: `{
  "mfe-cart": "https://cart.example.com/remoteEntry.json",
  "mfe-account": "https://account.example.com/remoteEntry.json"
}` }
    ],
    viz: {
      title: 'Boot a host and load a remote (Native Federation)',
      input: 'host=20.1.0 cart=20.0.3 account=19.2.0',
      inputLabel: 'Angular version per app: host=x.y.z then remotes name=x.y.z',
      gen: function (input) {
        var items = words(input, 5, 'Write host=20.1.0 cart=20.0.3 ...');
        var apps = items.map(function (s) {
          var kv = s.split('='), m = /^(\d+)\.(\d+)\.(\d+)$/.exec(kv[1] || '');
          if (kv.length !== 2 || !m || !/^[a-z]+$/.test(kv[0])) throw new Error('Bad entry "' + s + '". Use name=20.1.0 (lowercase name).');
          return { name: kv[0], v: kv[1], major: +m[1], minor: +m[2] };
        });
        if (apps[0].name !== 'host') throw new Error('Start with host=x.y.z');
        var host = apps[0], remotes = apps.slice(1);
        if (!remotes.length) throw new Error('Add at least one remote, e.g. cart=20.0.3');
        var nodes = [{ id: 'host', label: 'shell ' + host.v, x: 10, y: 30, shape: 'box' }, { id: 'man', label: 'manifest', x: 35, y: 8, shape: 'box' }, { id: 'core', label: '@angular/core (shared)', x: 35, y: 52, shape: 'box', w: 26 }];
        var edges = [['host', 'man'], ['host', 'core']];
        remotes.forEach(function (r, i) { nodes.push({ id: r.name, label: r.name + ' ' + r.v, x: 75, y: 8 + i * (44 / Math.max(1, remotes.length - 1 || 1)), shape: 'box' }); edges.push([r.name, 'core']); edges.push(['host', r.name]); });
        var frames = [];
        frames.push({ narr: 'Page loads <code>main.ts</code> of the shell. Angular has <b>not</b> booted yet: <code>initFederation()</code> must run first so every shared package resolves to one URL.', parts: [{ type: 'graph', directed: true, nodes: nodes, edges: edges, hl: { host: 'cur' }, ehl: {} }] });
        frames.push({ narr: 'The shell fetches <code>federation.manifest.json</code>: ' + remotes.map(function (r) { return r.name; }).join(', ') + ' → their <code>remoteEntry.json</code> URLs. It builds an <b>import map</b> so <code>import \'@angular/core\'</code> means one file for everyone.', parts: [{ type: 'graph', directed: true, nodes: nodes, edges: edges, hl: { man: 'cur' }, ehl: { 'host-man': 'cur' } }] });
        frames.push({ narr: 'Shared singleton <code>@angular/core ' + host.v + '</code> is registered (singleton + strictVersion). Now <code>import(\'./bootstrap\')</code> boots Angular once.', parts: [{ type: 'graph', directed: true, nodes: nodes, edges: edges, hl: { core: 'ok', host: 'ok' }, ehl: { 'host-core': 'ok' } }] });
        var hl = { host: 'ok', core: 'ok' }, ehl = { 'host-core': 'ok' }, rows = [];
        remotes.forEach(function (r) {
          var same = r.major === host.major;
          hl = Object.assign({}, hl); ehl = Object.assign({}, ehl);
          hl[r.name] = same ? 'ok' : 'bad'; ehl['host-' + r.name] = 'cur'; ehl[r.name + '-core'] = same ? 'ok' : 'bad';
          rows.push([r.name, r.v, same ? 'shares the singleton' : 'major mismatch']);
          frames.push({ narr: 'User navigates to <code>/' + r.name + '</code>: <code>loadRemoteModule(\'' + r.name + '\', \'./routes\')</code>. The remote needs Angular <code>^' + r.major + '.0.0</code>; the page has <code>' + host.v + '</code>. ' + (same ? 'Same major → it <b>reuses the shared copy</b>. One injector tree, one zone, small download.' : '<b>Different major</b> → with <code>strictVersion</code> this fails loudly instead of loading a second Angular. Options: upgrade the remote, or ship it as a Web Component with its own Angular (multi-version, heavier).'), parts: [{ type: 'graph', directed: true, nodes: nodes, edges: edges, hl: hl, ehl: ehl }, { type: 'table', label: 'remotes', columns: ['remote', 'angular', 'result'], rows: rows.slice() }] });
        });
        frames.push({ narr: 'Summary: compatible remotes are cheap and seamless. Mismatched ones need a strategy. A route-level <code>.catch()</code> keeps the shell usable if a remote fails.', parts: [{ type: 'table', label: 'remotes', columns: ['remote', 'angular', 'result'], rows: rows }] });
        return pad4(frames);
      }
    },
    examples: [
      { title: 'Expose routes, not single components', html: `<p>Exposing <code>'./routes'</code> lets the remote team add pages, guards and providers (<code>providers</code> on the route) without the shell changing. Exposing a component couples the shell to that component's inputs. The contract between shell and remote should be tiny: a route array, a few custom events, maybe a shared auth token service.</p>`,
        code: { lang: 'ts', code: `// projects/mfe-cart/src/app/cart.routes.ts (inside the remote)
import { Routes } from '@angular/router';
import { CartStore } from './cart.store';

export const CART_ROUTES: Routes = [
  {
    path: '',
    providers: [CartStore],            // remote-scoped state, created on first visit
    loadComponent: () => import('./cart-page.component').then(m => m.CartPageComponent),
  },
  { path: 'checkout', loadComponent: () => import('./checkout.component').then(m => m.CheckoutComponent) },
];` } },
      { title: 'Communicating between shell and remotes', html: `${H.table(['Need', 'Good option', 'Avoid'], [
        ['Current user / token', 'A small shared library (singleton) exposing a signal, or read from a cookie the server sets', 'Each remote calling /me separately with its own logic'],
        ['"Item added" notifications', 'Custom DOM events or a tiny typed event bus in a shared lib', 'Remotes importing each other\'s services'],
        ['Navigation across remotes', 'Shell router (absolute URLs)', 'Remote creating its own Router root'],
        ['Shared design', 'Design-system library shared as singleton + CSS custom properties', 'Copy-pasted CSS per remote']
      ])}` },
      { title: 'Multi-version fallback: wrap a legacy remote as a Web Component', html: `<p>An Angular 18 remote that cannot upgrade yet is bootstrapped with its own Angular copy and registered as a custom element. The shell renders <code>&lt;legacy-reports&gt;</code> in a wrapper component (with <code>CUSTOM_ELEMENTS_SCHEMA</code>). It works, but costs a second framework download and needs care with routing (the element must not take over the URL) and zone.js (load it once).</p>`,
        code: { lang: 'ts', code: `import { createApplication } from '@angular/platform-browser';
import { createCustomElement } from '@angular/elements';
import { provideZonelessChangeDetection } from '@angular/core';
import { ReportsComponent } from './reports.component';

// Bootstrap without a root component, then register a custom element.
(async () => {
  const app = await createApplication({ providers: [provideZonelessChangeDetection()] });
  const element = createCustomElement(ReportsComponent, { injector: app.injector });
  customElements.define('legacy-reports', element);
})();` } }
    ],
    deepDive: `<p>🟣 <b>How Native Federation works under the hood.</b> At build time, each shared package is bundled once as a separate ES module with a version in its metadata, and each app gets a <code>remoteEntry.json</code> listing exposed modules and shared packages. At runtime <code>initFederation</code> reads the host's and the remotes' entries, picks one version per shared singleton (the highest compatible), and writes an <b>import map</b> (<code>{"imports": {"@angular/core": "https://.../core-20.1.0.js"}}</code>). Bare imports anywhere on the page then resolve through that map. Because it relies on standard ESM, the same mechanism works regardless of the bundler that produced the files.</p>
      <p>🟣 <b>Bootstrap ordering.</b> The <code>main.ts → import('./bootstrap')</code> split exists so shared packages are not statically imported before the federation runtime decides which copy to use. Forgetting it is the number-one "Angular loaded twice" cause.</p>
      <p>🟣 <b>Operational concerns.</b> Cache <code>remoteEntry.json</code> briefly (or not at all) but the hashed chunks forever. Version the contract (exposed module names). Add contract tests in the remote's CI (does <code>./routes</code> still export <code>CART_ROUTES</code>?). Monitor remote load failures. SSR with federation is possible but considerably more complex; many teams keep federated apps client-rendered.</p>
      <p>🟣 <b>When not to.</b> Federation adds runtime failure modes, a second deployment pipeline per app, version-negotiation bugs, duplicated global CSS and harder debugging. If teams share one release train, a monorepo with lazy routes and module boundaries delivers the same code isolation without runtime composition. Choose federation for organisational reasons (independent deploys, different teams/vendors, gradual migration of a legacy app), not for "clean code".</p>`,
    aiEra: `<p>🤖 Federation configs are error-prone glue, and AI assistants often mix up the two worlds (webpack <code>ModuleFederationPlugin</code> options in a Native Federation project, or old <code>@angular-architects/module-federation</code> + <code>ngx-build-plus</code> setups from Angular 12 era). Tell the assistant your exact builder and versions, and verify against the package's README. Where AI helps a lot: generating contract tests for exposed modules, writing the fallback components, and analysing bundle/network logs to find duplicated Angular copies. Strategic question an interviewer may ask: "With AI making code changes cheap, is a coordinated monorepo upgrade easier than maintaining multi-version federation?" — usually yes, and saying why shows judgement.</p>`,
    problems: [{
      title: 'Pick One Version per Shared Singleton',
      level: 'Hard', tags: ['micro-frontends', 'semver', 'federation'], companies: ['SAP', 'Siemens', 'Allianz'],
      statement: `<p>The host and several remotes each declare, for a shared package, the version they ship and the range they need (simplified to a caret range <code>^M.m.p</code>: same major, at least <code>M.m.p</code>). Choose the <b>highest shipped version</b> that satisfies <b>every</b> app's range. If none exists, report the apps that cannot be satisfied by the host's version (they need multi-version or an upgrade).</p>`,
      constraints: `Up to 20 apps; versions are plain <code>x.y.z</code>.`,
      example: `<p>host ships 20.1.0 needs ^20.0.0; cart ships 20.0.3 needs ^20.0.0; account ships 20.2.1 needs ^20.2.0 → choose ${H.c('g', '20.2.1')} (satisfies all). If account needed ^21.0.0 → ${H.c('r', 'no common version; account conflicts')}.</p>`,
      brute: { why: `<p>"Always use the host's copy" ignores remotes that need a newer minor (they may call APIs that do not exist yet). "Always take the highest" ignores ranges and can pick a version some app cannot run.</p>`,
        code: { lang: 'js', run: true, code: `const apps = [{ name: 'host', ships: '20.1.0' }, { name: 'account', ships: '20.2.1', needs: '^20.2.0' }];
console.log('naive: always host ->', apps[0].ships, '(account needs ^20.2.0: broken at runtime)');` } },
      mcq: { q: 'Why is <code>strictVersion: true</code> recommended for <code>@angular/core</code>?', options: ['It makes downloads smaller', 'A mismatch becomes a clear error instead of silently loading a second Angular', 'It allows two majors to share one injector'], answer: 1, explain: 'Without it the runtime may fall back to a separate copy, giving two Angulars and confusing DI/zone bugs. Failing loudly is safer.' },
      hints: [
        `<p>Hint 1: parse versions into number triples and compare lexicographically.</p>`,
        `<p>Hint 2: a candidate satisfies <code>^M.m.p</code> if its major equals M and it is ≥ M.m.p.</p>`,
        `<p>Hint 3: try candidates from the highest shipped version down; the first one that satisfies everyone wins. If none, list apps whose range rejects the host's version.</p>`
      ],
      solution: {
        approach: `<p>Candidates are the versions actually shipped (only those exist as files). Sort descending, test each against every range, return the first that passes. Otherwise compute conflicts relative to the host's version so the team knows who must change.</p>`,
        code: { lang: 'js', run: true, code: `const parse = v => v.split('.').map(Number);
const cmp = (a, b) => { const x = parse(a), y = parse(b); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; };
const satisfies = (v, range) => { const min = range.slice(1); return parse(v)[0] === parse(min)[0] && cmp(v, min) >= 0; };

function negotiate(apps) {
  const candidates = [...new Set(apps.map(a => a.ships))].sort((a, b) => cmp(b, a));
  for (const v of candidates) if (apps.every(a => satisfies(v, a.needs))) return { version: v };
  const hostV = apps[0].ships;
  return { version: null, conflicts: apps.filter(a => !satisfies(hostV, a.needs)).map(a => a.name + ' needs ' + a.needs) };
}

console.log(negotiate([
  { name: 'host', ships: '20.1.0', needs: '^20.0.0' },
  { name: 'cart', ships: '20.0.3', needs: '^20.0.0' },
  { name: 'account', ships: '20.2.1', needs: '^20.2.0' },
]));
console.log(negotiate([
  { name: 'host', ships: '20.1.0', needs: '^20.0.0' },
  { name: 'reports', ships: '21.0.0', needs: '^21.0.0' },
]));` },
        complexity: `<p>O(C · A) for C candidates and A apps. Real resolvers handle full semver ranges (tilde, pre-releases, unions) and per-package eager/singleton flags.</p>`,
        followUps: ['How would pre-release versions (21.0.0-rc.1) change the comparison?', 'Should the host or the remotes "win" in a tie?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 4 — Design systems with Angular CDK / Material and theming
     ===================================================================== */
  function keyManagerRun(items, keys) {
    var active = -1, log = [];
    function enabled(i) { return items[i].charAt(0) !== '!'; }
    function step(from, delta) {
      var n = items.length, i = from;
      for (var k = 0; k < n; k++) { i = (i + delta + n) % n; if (enabled(i)) return i; }
      return from;
    }
    keys.forEach(function (key) {
      var before = active;
      if (key === 'down') active = step(active < 0 ? -1 : active, 1);
      else if (key === 'up') active = step(active < 0 ? 0 : active, -1);
      else if (key === 'home') active = step(-1, 1);
      else if (key === 'end') active = step(0, -1);
      else if (/^[a-z]$/.test(key)) {
        for (var k = 1; k <= items.length; k++) {
          var j = ((active < 0 ? -1 : active) + k) % items.length;
          if (enabled(j) && items[j].toLowerCase().charAt(0) === key) { active = j; break; }
        }
      } else throw new Error('Unknown key "' + key + '". Use down, up, home, end or a single letter.');
      log.push({ key: key, from: before, to: active });
    });
    return log;
  }

  topics.push({
    title: 'Design Systems with Angular CDK & Material: Behaviour Primitives, Material 3 Theming & Tokens',
    analogy: `<p>Building furniture: the <b>CDK</b> is the box of <b>hinges, rails and screws</b> — the hard mechanical bits (focus handling, keyboard navigation, floating panels, drag and drop) with no paint on them. <b>Angular Material</b> is a finished <b>IKEA kitchen</b> built with those parts, painted in Google's Material style. Your company design system either repaints the IKEA kitchen (theme Material) or builds its own cabinets on the same hinges (custom components on the CDK). Nobody sane re-invents hinges.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> A design system in Angular is usually a <b>ui library</b> (topic 1) of components that use shared <b>design tokens</b> (fe15 explained tokens in general). Angular gives you two layers to build it on:</p>
      ${H.table(['Layer', 'What it gives', 'Examples'], [
        ['<b>@angular/cdk</b>', 'Unstyled <b>behaviour</b>: accessibility, positioning, interaction', '<code>Overlay</code>, <code>Portal</code>, <code>A11yModule</code> (<code>cdkTrapFocus</code>, <code>LiveAnnouncer</code>, <code>FocusMonitor</code>, <code>ListKeyManager</code>), <code>DragDrop</code>, <code>ScrollingModule</code> (virtual scroll), <code>CdkTable</code>, <code>CdkListbox</code>, <code>CdkMenu</code>, CDK <code>Dialog</code>, <code>BreakpointObserver</code>, <code>Clipboard</code>'],
        ['<b>@angular/material</b>', 'Styled components implementing <b>Material Design 3</b> (default since v18)', '<code>mat-button</code>, <code>mat-form-field</code>, <code>MatTable</code> + <code>MatSort</code> + <code>MatPaginator</code>, <code>MatDialog</code>, <code>MatAutocomplete</code>, <code>MatStepper</code>'],
        ['Your design system', 'Brand look + company patterns', '<code>&lt;acme-button&gt;</code>, <code>&lt;acme-select&gt;</code> built on CDK, or themed Material']
      ])}
      <p>🔵 <b>Material 3 theming (v19+ API).</b> One mixin, <code>mat.theme()</code>, takes a colour palette, typography and density and emits <b>CSS custom properties</b> named <code>--mat-sys-*</code> (system tokens like <code>--mat-sys-primary</code>, <code>--mat-sys-surface</code>, <code>--mat-sys-body-medium</code>). Every Material component reads those variables. Your own components should read them too, so they follow the same theme. Dark mode: set <code>color-scheme: light dark</code> (or switch it with a class); the generated tokens use CSS <code>light-dark()</code>, so no second theme build is needed.</p>
      <p>🔵 <b>Customising without hacks.</b> Since v19 each component has an <b>overrides</b> mixin (<code>mat.button-overrides(...)</code>, <code>mat.form-field-overrides(...)</code>) that sets its documented component tokens. That replaces the old, fragile <code>::ng-deep .mat-mdc-button { ... }</code> selectors that broke on every upgrade. Brand palettes are generated with <code>ng generate @angular/material:theme-color</code>.</p>
      <p>🔵 <b>Build on CDK when Material does not fit.</b> A custom select needs: a trigger, a floating panel (<code>Overlay</code> with a flexible connected position strategy), keyboard navigation (<code>ActiveDescendantKeyManager</code>), ARIA (<code>role="combobox"</code>, <code>role="listbox"</code>, <code>aria-activedescendant</code>), closing on outside click / Escape, and focus return. The CDK provides every piece; you add the look.</p>`,
    clues: [
      '"Build a custom dropdown / select / menu that is accessible" → CDK Overlay + ListKeyManager (or CdkListbox / CdkMenu)',
      '"Modal must keep focus inside and return it on close" → CDK Dialog / <code>cdkTrapFocus</code> + restore focus',
      '"Our brand colours, but Material components" → <code>mat.theme()</code> with a generated palette + <code>*-overrides</code> mixins',
      '"We use ::ng-deep everywhere and upgrades break styling" → component token overrides and CSS variables instead',
      '"10 000 rows in a list" → <code>cdk-virtual-scroll-viewport</code>',
      '"Dark mode toggle without reloading" → <code>color-scheme</code> + <code>light-dark()</code>-based system tokens'
    ],
    code: [
      { lang: 'css', check: false, title: 'styles.scss — Material 3 theme, dark mode, and a token override', code: `@use '@angular/material' as mat;

html {
  color-scheme: light dark;           // follow the OS; tokens use light-dark()
  @include mat.theme((
    color: mat.$violet-palette,       // or a palette generated for your brand
    typography: Roboto,
    density: 0,
  ));
}

// manual switch: <html class="dark">
html.dark { color-scheme: dark; }

// documented component tokens instead of ::ng-deep hacks
.danger-zone {
  @include mat.button-overrides((
    filled-container-color: var(--mat-sys-error),
    filled-label-text-color: var(--mat-sys-on-error),
  ));
}

// your own components read the same system tokens
.acme-card {
  background: var(--mat-sys-surface-container);
  color: var(--mat-sys-on-surface);
  border-radius: var(--mat-sys-corner-large);
  font: var(--mat-sys-body-medium);
}` },
      { lang: 'ts', title: 'A design-system button: host bindings, variants as inputs, tokens in CSS', code: `import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

type Variant = 'primary' | 'secondary' | 'danger';

@Component({
  // attribute selector: keeps the native <button> (keyboard, form submit, a11y for free)
  selector: 'button[acmeButton], a[acmeButton]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'acme-button',
    '[class]': 'variantClass()',
    '[attr.aria-busy]': 'loading() || null',
  },
  template: \`
    @if (loading()) { <span class="spinner" aria-hidden="true"></span> }
    <ng-content />
  \`,
  styles: \`
    :host { font: var(--mat-sys-label-large); border-radius: var(--mat-sys-corner-full); padding: 0 16px; min-height: 40px; }
    :host(.primary) { background: var(--mat-sys-primary); color: var(--mat-sys-on-primary); }
    :host(.danger) { background: var(--mat-sys-error); color: var(--mat-sys-on-error); }
    :host(:focus-visible) { outline: 3px solid var(--mat-sys-tertiary); outline-offset: 2px; }
  \`,
})
export class AcmeButtonComponent {
  variant = input<Variant>('primary');
  loading = input(false);
  protected variantClass = computed(() => 'acme-button ' + this.variant());
}
// usage: <button acmeButton variant="danger" (click)="delete()">Delete</button>` },
      { lang: 'js', run: true, title: 'Runnable model: what ListKeyManager does (wrap, skip disabled, typeahead)', code: `// items starting with '!' are disabled
const items = ['Apple', '!Banana', 'Cherry', 'Date', '!Elder', 'Fig'];
const enabled = i => !items[i].startsWith('!');
let active = -1;

function move(delta) {                         // withWrap() + skipPredicate(disabled)
  const n = items.length;
  let i = active;
  for (let k = 0; k < n; k++) {
    i = (i + delta + n) % n;
    if (enabled(i)) { active = i; return; }
  }
}
function typeahead(ch) {                       // withTypeAhead(): next item starting with ch
  for (let k = 1; k <= items.length; k++) {
    const j = (active + k + items.length) % items.length;
    if (enabled(j) && items[j][0].toLowerCase() === ch) { active = j; return; }
  }
}
const show = key => console.log(key.padEnd(6), '->', active, items[active]);
move(1); show('down');
move(1); show('down');   // skips disabled Banana
move(-1); move(-1); show('up x2'); // wraps from Apple to Fig
typeahead('d'); show('d');` }
    ],
    viz: {
      title: 'ListKeyManager: arrow keys, wrap, disabled items, typeahead',
      input: 'down down down up up home end c f',
      inputLabel: 'keys: down, up, home, end or a letter (list: Apple, Banana*, Cherry, Date, Elder*, Fig; * disabled)',
      gen: function (input) {
        var items = ['Apple', '!Banana', 'Cherry', 'Date', '!Elder', 'Fig'];
        var keys = words(input, 14, 'Type keys like: down down up home c');
        var log = keyManagerRun(items, keys);
        var labels = items.map(function (s) { return s.charAt(0) === '!' ? s.slice(1) + ' (disabled)' : s; });
        function part(active, extra) {
          var hl = {}; items.forEach(function (s, i) { if (s.charAt(0) === '!') hl[i] = 'done'; });
          if (active >= 0) hl[active] = extra || 'cur';
          var ptr = {}; if (active >= 0) ptr[active] = 'active';
          return { type: 'array', label: 'role="listbox" options', values: labels, hl: hl, ptr: ptr, showIdx: true };
        }
        var frames = [{ narr: 'Focus is on the combobox input; no option is active yet (<code>activeItemIndex = -1</code>). With <code>ActiveDescendantKeyManager</code> DOM focus stays on the input and only <code>aria-activedescendant</code> changes.', parts: [part(-1)] }];
        log.forEach(function (e) {
          var why = e.key === 'down' || e.key === 'up' ? 'Arrow ' + e.key + ': move one step' + (e.from >= 0 && ((e.key === 'down' && e.to < e.from) || (e.key === 'up' && e.to > e.from)) ? ', <b>wrapping</b> around the end (<code>withWrap()</code>)' : '') + ', skipping disabled options (<code>skipPredicate</code>).' :
            e.key === 'home' ? 'Home: first enabled option (<code>withHomeAndEnd()</code>).' : e.key === 'end' ? 'End: last enabled option.' : 'Typed "' + e.key + '": <code>withTypeAhead()</code> jumps to the next enabled option starting with that letter.';
          frames.push({ narr: why + (e.to >= 0 ? ' Now <code>aria-activedescendant="opt-' + e.to + '"</code> → screen readers announce <b>' + H.esc(labels[e.to]) + '</b>.' : ''), parts: [part(e.to), { type: 'vars', vals: { key: e.key, activeItemIndex: e.to }, hl: { activeItemIndex: 'cur' } }] });
        });
        frames.push({ narr: 'Enter would select the active option, Escape would close the panel and keep focus on the input. All of this behaviour comes from the CDK; your design system only styles <code>.active</code>.', parts: [part(log[log.length - 1].to, 'sel')] });
        return pad4(frames);
      }
    },
    examples: [
      { title: 'A custom select panel with CDK Overlay + ActiveDescendantKeyManager', html: `<p>The core of every accessible dropdown: open an overlay connected to the trigger, manage the active option with the key manager, close on backdrop click or Escape.</p>`,
        code: { lang: 'ts', code: `import {
  AfterViewInit, ChangeDetectionStrategy, Component, Directive, Injector, inject, input, output,
  signal, viewChildren
} from '@angular/core';
import { ActiveDescendantKeyManager, Highlightable } from '@angular/cdk/a11y';
import { CdkConnectedOverlay, CdkOverlayOrigin } from '@angular/cdk/overlay';

@Directive({
  selector: '[acmeOption]',
  host: { role: 'option', '[id]': 'id()', '[class.active]': 'active()', '[attr.aria-selected]': 'active()' },
})
export class AcmeOptionDirective implements Highlightable {
  id = input.required<string>();
  value = input.required<string>();
  disabled = false;
  active = signal(false);
  setActiveStyles() { this.active.set(true); }
  setInactiveStyles() { this.active.set(false); }
  getLabel() { return this.value(); }       // used by typeahead
}

@Component({
  selector: 'acme-select',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CdkConnectedOverlay, CdkOverlayOrigin, AcmeOptionDirective],
  template: \`
    <button type="button" cdkOverlayOrigin #origin="cdkOverlayOrigin" role="combobox"
            [attr.aria-expanded]="open()" aria-controls="acme-listbox"
            [attr.aria-activedescendant]="activeId()"
            (click)="open.set(!open())" (keydown)="onKey($event)">
      {{ selected() ?? 'Choose…' }}
    </button>
    <ng-template cdkConnectedOverlay [cdkConnectedOverlayOrigin]="origin" [cdkConnectedOverlayOpen]="open()"
                 [cdkConnectedOverlayHasBackdrop]="true" cdkConnectedOverlayBackdropClass="cdk-overlay-transparent-backdrop"
                 (backdropClick)="open.set(false)" (detach)="open.set(false)">
      <ul id="acme-listbox" role="listbox" class="panel">
        @for (o of options(); track o) { <li acmeOption [id]="'opt-' + $index" [value]="o" (click)="choose(o)">{{ o }}</li> }
      </ul>
    </ng-template>
  \`,
})
export class AcmeSelectComponent implements AfterViewInit {
  options = input<string[]>([]);
  changed = output<string>();
  open = signal(false);
  selected = signal<string | null>(null);
  activeId = signal<string | null>(null);
  private items = viewChildren(AcmeOptionDirective);
  private km?: ActiveDescendantKeyManager<AcmeOptionDirective>;
  private injector = inject(Injector);

  ngAfterViewInit() {
    // the manager accepts a signal of items (v19+) or a QueryList / array
    this.km = new ActiveDescendantKeyManager(this.items, this.injector)
      .withWrap().withTypeAhead().withHomeAndEnd();
    this.km.change.subscribe(() => this.activeId.set(this.km?.activeItem?.id() ?? null));
  }
  onKey(e: KeyboardEvent) {
    if (!this.open() && (e.key === 'ArrowDown' || e.key === 'Enter')) { this.open.set(true); return; }
    if (e.key === 'Escape') { this.open.set(false); return; }
    if (e.key === 'Enter' && this.km?.activeItem) { this.choose(this.km.activeItem.value()); return; }
    this.km?.onKeydown(e);
  }
  choose(v: string) { this.selected.set(v); this.changed.emit(v); this.open.set(false); }
}` } },
      { title: 'Virtual scroll for a long list', html: `<p>Only the rows in view (plus a buffer) exist in the DOM. Fixed row height makes it cheap: <code>itemSize</code> in pixels.</p>`,
        code: { lang: 'ts', code: `import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ScrollingModule } from '@angular/cdk/scrolling';

@Component({
  selector: 'acme-contact-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ScrollingModule],
  template: \`
    <cdk-virtual-scroll-viewport itemSize="48" class="viewport" style="height: 480px">
      <div *cdkVirtualFor="let c of contacts(); trackBy: byId" class="row">{{ c.name }}</div>
    </cdk-virtual-scroll-viewport>
  \`,
})
export class ContactListComponent {
  contacts = input<{ id: number; name: string }[]>([]);
  byId = (_: number, c: { id: number }) => c.id;
}` } },
      { title: 'Material or custom? A quick decision table', html: `${H.table(['Situation', 'Choice'], [
        ['Internal tools, admin, speed matters more than brand', 'Angular Material, themed with mat.theme()'],
        ['Strong brand, Material look not wanted', 'Own components on CDK primitives (or a headless library)'],
        ['Mix: brand colours, standard widgets', 'Material + palette + component overrides, custom only where needed'],
        ['Many frameworks in the company (React + Angular)', 'Tokens as CSS variables shared by all; Web Components or per-framework wrappers']
      ])}` }
    ],
    deepDive: `<p>🟣 <b>Overlay internals.</b> <code>Overlay.create()</code> appends a pane inside a single <code>.cdk-overlay-container</code> at the end of <code>body</code>, so panels escape <code>overflow: hidden</code> and z-index traps of parents. A <b>position strategy</b> (<code>flexibleConnectedTo(origin).withPositions([...])</code>) tries positions in order and falls back if the panel would leave the viewport; a <b>scroll strategy</b> (reposition, block, close) decides what happens on scroll. Since v17 the overlay container can use the Popover API where supported, improving top-layer behaviour.</p>
      <p>🟣 <b>Focus management rules.</b> Dialogs: move focus inside on open, trap Tab, restore focus to the trigger on close, close on Escape, label with <code>aria-labelledby</code>. Menus/listboxes: roving tabindex (<code>FocusKeyManager</code>) when options are real focusable elements, or active-descendant when focus must stay on an input (combobox). <code>FocusMonitor</code> tells you whether focus came from keyboard, mouse or programmatic, so you can show focus rings only for keyboard users (<code>:focus-visible</code> in CSS does the same for most cases).</p>
      <p>🟣 <b>Theming evolution.</b> Pre-v15 Material used legacy components; v15 moved to MDC-based components; v17/18 introduced Material 3 and made it the default; v19 simplified everything to <code>mat.theme()</code>, system tokens and <code>*-overrides</code> mixins. Old <code>define-light-theme</code> + <code>all-component-themes</code> setups still work but are the "previous" API. Knowing this history lets you explain why old Stack Overflow answers break.</p>
      <p>🟣 <b>Shipping the library.</b> A design-system library in a monorepo is consumed from source; outside it is published in Angular Package Format via <code>ng-packagr</code> with secondary entry points (<code>@acme/ui/button</code>, <code>@acme/ui/select</code>) so apps only pull what they import. Document with Storybook, test behaviour with the CDK <b>component harnesses</b> (<code>MatButtonHarness</code>, or your own <code>ComponentHarness</code>) so tests survive DOM refactors, and run visual-regression and axe checks in CI.</p>
      <p>🟣 <b>Headless future.</b> The Angular team has been adding more headless, signal-based accessibility primitives (CDK listbox/menu first, and newer experimental "Angular Aria" style directives in recent releases). The direction is clear: behaviour from Angular, look from your tokens.</p>`,
    aiEra: `<p>🤖 Design-to-code tools (Figma Dev Mode, MCP servers for Figma, and AI agents) can now read a design file and emit Angular components plus token CSS. They are good at layout and tokens, weak at behaviour: generated dropdowns often lack keyboard support, focus return and ARIA. The winning workflow: let AI produce the visual shell, but compose it from your CDK-based primitives (tell it "use AcmeSelect, never a raw div dropdown"). Keep a machine-readable component catalogue (props, tokens, usage rules, Code Connect mappings) so agents pick the right component. Automated axe checks and harness tests in CI catch the a11y regressions AI tends to introduce.</p>`,
    problems: [{
      title: 'Implement a Key Manager (wrap, skip disabled, Home/End)',
      level: 'Medium', tags: ['a11y', 'cdk', 'keyboard'], companies: ['Google', 'Atlassian', 'Adobe'],
      statement: `<p>Write <code>createKeyManager(items, { wrap })</code> where items have <code>{ label, disabled }</code>. Return an object with <code>down()</code>, <code>up()</code>, <code>home()</code>, <code>end()</code> and <code>activeIndex</code>. Disabled items are skipped. Without wrap, moving past the end stays on the last enabled item. If every item is disabled, the index stays <code>-1</code>.</p>`,
      constraints: `Up to 1 000 items; each key press must be O(n) worst case.`,
      example: `<p>Items <code>[A, B(disabled), C]</code>, wrap on: down → ${H.c('g', '0 (A)')}, down → ${H.c('g', '2 (C)')} (skips B), down → ${H.c('y', '0 (A)')} (wrap).</p>`,
      brute: { why: `<p>A plain <code>index++</code> lands on disabled items and walks off the end of the array; screen readers then announce nothing or the wrong option.</p>`,
        code: { lang: 'js', run: true, code: `const items = [{ label: 'A' }, { label: 'B', disabled: true }, { label: 'C' }];
let i = -1;
for (let k = 0; k < 4; k++) { i++; console.log(i, items[i] ? items[i].label + (items[i].disabled ? ' (disabled!)' : '') : 'undefined!'); }` } },
      mcq: { q: 'Focus must stay in the text input of a combobox while arrows move through options. Which CDK key manager?', options: ['FocusKeyManager', 'ActiveDescendantKeyManager', 'Neither, use tabindex on every option'], answer: 1, explain: 'Active-descendant keeps DOM focus on the input and points <code>aria-activedescendant</code> at the active option. FocusKeyManager moves real focus.' },
      hints: [
        `<p>Hint 1: write one helper <code>step(from, delta)</code> that walks at most n positions looking for an enabled item.</p>`,
        `<p>Hint 2: with wrap use modulo; without wrap stop at the array boundary and keep the old index.</p>`,
        `<p>Hint 3: home = step from -1 forward; end = step from n backward. If no enabled item is found, return the original index.</p>`
      ],
      solution: {
        approach: `<p>Every action reduces to "walk from a start in a direction until an enabled item". The bound of n steps guarantees termination even when everything is disabled.</p>`,
        code: { lang: 'js', run: true, code: `function createKeyManager(items, { wrap = true } = {}) {
  const n = items.length;
  const km = { activeIndex: -1 };
  function step(from, delta) {
    let i = from;
    for (let k = 0; k < n; k++) {
      i += delta;
      if (i < 0 || i >= n) { if (!wrap) return km.activeIndex; i = (i + n) % n; }
      if (!items[i].disabled) return i;
    }
    return km.activeIndex;
  }
  km.down = () => (km.activeIndex = step(km.activeIndex, 1));
  km.up = () => (km.activeIndex = step(km.activeIndex === -1 ? n : km.activeIndex, -1));
  km.home = () => (km.activeIndex = step(-1, 1));
  km.end = () => (km.activeIndex = step(n, -1));
  return km;
}

const items = [{ label: 'A' }, { label: 'B', disabled: true }, { label: 'C' }];
const km = createKeyManager(items);
console.log(km.down(), km.down(), km.down(), km.up(), km.end(), km.home());
const noWrap = createKeyManager(items, { wrap: false });
console.log(noWrap.down(), noWrap.down(), noWrap.down());
console.log(createKeyManager([{ disabled: true }]).down());` },
        complexity: `<p>O(n) per key press worst case (long runs of disabled items), O(1) memory. The CDK version adds typeahead with a debounce buffer, horizontal orientation (RTL aware) and page up/down.</p>`,
        followUps: ['How would you add typeahead that waits 200 ms for more letters?', 'How should Left/Right behave in RTL?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 5 — i18n: $localize (compile-time) vs runtime libraries
     ===================================================================== */
  var I18N_SOURCE = { cartTitle: 'Your cart', itemsLeft: 'Only {n} left', checkout: 'Checkout', greet: 'Hi {name}!' };
  var I18N_TRANS = {
    de: { cartTitle: 'Dein Warenkorb', itemsLeft: 'Nur noch {n} übrig', checkout: 'Zur Kasse' },
    fr: { cartTitle: 'Votre panier', checkout: 'Paiement', greet: 'Salut {name} !' },
    'de-AT': { cartTitle: 'Dein Einkaufswagen' }
  };

  topics.push({
    title: 'Angular i18n: $localize & the i18n Attribute, Build-per-Locale vs Runtime Translation',
    analogy: `<p>Printing a <b>restaurant menu</b> for tourists. Option one: print a <b>separate menu per language</b> before opening (compile-time i18n): each guest gets a clean, fast menu, but changing language means getting another menu. Option two: one menu with a <b>translator standing at the table</b> (runtime i18n): switch language any time, but the translator costs time and has to carry every dictionary. Angular's built-in system is option one; libraries like Transloco are option two.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> You mark texts as translatable, a tool extracts them into a file for translators, and translated files are merged back. Angular's built-in package is <code>@angular/localize</code> (<code>ng add @angular/localize</code>). fe15 covered general i18n (ICU plurals, <code>Intl</code>, RTL); here we focus on how Angular does it.</p>
      ${H.table(['Where', 'How to mark', 'Example'], [
        ['Element text', '<code>i18n</code> attribute, optionally <code>meaning|description@@customId</code>', '<code>&lt;h1 i18n="cart page title@@cartTitle"&gt;Your cart&lt;/h1&gt;</code>'],
        ['Attribute', '<code>i18n-&lt;attr&gt;</code>', '<code>&lt;img alt="Logo" i18n-alt&gt;</code>'],
        ['Plurals / choices', 'ICU expression inside the template', '<code>{count, plural, =0 {empty} =1 {1 item} other {{{count}} items}}</code>'],
        ['TypeScript', '<code>$localize</code> tagged template', '<code>$localize\`:@@checkout:Checkout\`</code>'],
        ['Text with no element', '<code>&lt;ng-container i18n&gt;</code>', 'avoids extra DOM']
      ])}
      <p>🔵 <b>The workflow.</b> (1) <code>ng extract-i18n --format=xlf2 --output-path src/locale</code> writes <code>messages.xlf</code> (XLIFF 1.2/2.0, XMB or JSON formats). (2) Translators produce <code>messages.de.xlf</code>. (3) In <code>angular.json</code> list <code>i18n.sourceLocale</code> and <code>locales</code>, and set <code>"localize": true</code> on the build. (4) <code>ng build</code> compiles <b>once</b>, then <b>inlines</b> each translation into a copy of the output: <code>dist/app/browser/en-US/</code>, <code>/de/</code>, <code>/fr/</code>, each with the right <code>&lt;base href&gt;</code>, <code>LOCALE_ID</code> and locale data for pipes.</p>
      <p>🔵 <b>Use custom IDs.</b> Without <code>@@id</code> the message ID is a hash of the text and meaning: fixing a typo in English changes the ID and orphans every translation. Custom IDs like <code>@@cartTitle</code> are stable.</p>
      <p>🔵 <b>Changing language</b> with the built-in approach means <b>navigating to another locale build</b> (<code>/de/cart</code>), usually chosen by the server from the URL, a cookie or <code>Accept-Language</code>. That is ideal for public sites (fast, SEO friendly, cacheable per locale) and fine for most apps.</p>
      <p>🔵 <b>Runtime alternatives</b> when users must switch language instantly without reload, or translations come from a CMS after deploy:</p>
      ${H.table(['Option', 'How', 'Trade-off'], [
        ['<code>loadTranslations()</code> from <code>@angular/localize</code>', 'Fetch a JSON of translations <i>before</i> bootstrap, then boot', 'One build, language chosen at startup; still needs a reload to switch'],
        ['<b>Transloco</b> (<code>@jsverse/transloco</code>)', '<code>{{ \'cart.title\' | transloco }}</code>, <code>*transloco</code> directive, lazy JSON per scope/feature', 'Live switching, lazy loading per feature; runtime cost, keys instead of source text'],
        ['ngx-translate', '<code>translate</code> pipe + service', 'Long-standing and simple; fewer features than Transloco']
      ])}`,
    clues: [
      '"Separate URLs per language, best performance, SEO" → built-in <code>@angular/localize</code> with build-per-locale',
      '"Users switch language from a dropdown without reloading" → runtime library (Transloco / ngx-translate)',
      '"A typo fix in English wiped all German translations" → messages had auto-generated IDs; use <code>@@customId</code>',
      '"Translate a string in a service / toast / page title" → <code>$localize</code> tagged template in TypeScript',
      '"Dates show in US format on the German site" → <code>LOCALE_ID</code> / locale data; localized builds set it automatically',
      '"Translations come from a CMS after deploy" → runtime loading (<code>loadTranslations</code> before bootstrap or a runtime library)'
    ],
    code: [
      { lang: 'ts', title: 'Template + TypeScript marking with stable custom IDs and an ICU plural', code: `import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-cart-summary',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe],
  template: \`
    <h2 i18n="Heading of the cart page@@cartTitle">Your cart</h2>

    <!-- ICU plural: translators get the whole sentence, grammar stays with them -->
    <p i18n="@@cartCount">{count(), plural, =0 {Your cart is empty} =1 {One item} other {{{count()}} items}}</p>

    <!-- attribute translation -->
    <button type="button" i18n-aria-label="@@removeAll" aria-label="Remove all items" i18n="@@clear">Clear</button>

    <!-- currency and number formats follow LOCALE_ID of the build -->
    <p>{{ total() | currency: 'EUR' }}</p>
  \`,
})
export class CartSummaryComponent {
  count = input(0);
  total = input(0);

  // $localize in TypeScript: ':meaning|description@@id:' prefix, named placeholders with ':name:'
  readonly greeting = computed(() => $localize\`:Greeting in the header@@greet:Hi \${this.userName()}:name:!\`);
  userName = input('there');
}` },
      { lang: 'json', title: 'angular.json (excerpt): locales and per-locale build', code: `{
  "projects": {
    "shop": {
      "i18n": {
        "sourceLocale": "en-US",
        "locales": {
          "de": { "translation": "src/locale/messages.de.xlf" },
          "fr": { "translation": "src/locale/messages.fr.xlf" }
        }
      },
      "architect": {
        "build": {
          "builder": "@angular/build:application",
          "options": {
            "localize": true,
            "i18nMissingTranslation": "error"
          }
        }
      }
    }
  }
}` },
      { lang: 'ts', title: 'Runtime translations with loadTranslations (one build, language picked at startup)', code: `// main.ts
import { loadTranslations } from '@angular/localize';
import { bootstrapApplication } from '@angular/platform-browser';

async function start() {
  const lang = localStorage.getItem('lang') ?? navigator.language.slice(0, 2);
  if (lang !== 'en') {
    // JSON produced by: ng extract-i18n --format json, then translated
    const res = await fetch('/assets/i18n/' + lang + '.json');
    const file = (await res.json()) as { translations: Record<string, string> };
    loadTranslations(file.translations);       // must run BEFORE any $localize call executes
  }
  // dynamic import so components (and their $localize calls) load after translations
  const { AppComponent } = await import('./app/app.component');
  const { appConfig } = await import('./app/app.config');
  await bootstrapApplication(AppComponent, appConfig);
}
start().catch(err => console.error(err));` },
      { lang: 'js', run: true, title: 'Runnable model: translation lookup with locale fallback and missing-ID report', code: `const source = { cartTitle: 'Your cart', itemsLeft: 'Only {n} left', checkout: 'Checkout' };
const trans = {
  de: { cartTitle: 'Dein Warenkorb', itemsLeft: 'Nur noch {n} übrig', checkout: 'Zur Kasse' },
  'de-AT': { cartTitle: 'Dein Einkaufswagen' },
};

// de-AT -> de -> source text (like a translator's fallback chain)
function chain(locale) {
  const out = [];
  for (let l = locale; l; l = l.includes('-') ? l.slice(0, l.lastIndexOf('-')) : '') out.push(l);
  return out;
}
function t(locale, id, params = {}) {
  for (const l of chain(locale)) if (trans[l] && trans[l][id]) return fill(trans[l][id], params);
  return fill(source[id], params);
}
const fill = (s, p) => s.replace(/\\{(\\w+)\\}/g, (_, k) => String(p[k]));

console.log(t('de-AT', 'cartTitle'));
console.log(t('de-AT', 'itemsLeft', { n: 3 }));
console.log(t('fr', 'checkout'));
const missing = l => Object.keys(source).filter(id => !(trans[l] || {})[id]);
console.log('missing in fr:', missing('fr'));` }
    ],
    viz: {
      title: 'Resolve each message for a locale (exact → parent → source)',
      input: 'de-AT',
      inputLabel: 'locale: de, de-AT, fr, en, or something unknown like it',
      gen: function (input) {
        var loc = String(input || '').trim();
        if (!/^[a-z]{2}(-[A-Z]{2})?$/.test(loc)) throw new Error('Use a locale like de, fr or de-AT.');
        var chainL = [loc]; if (loc.indexOf('-') > 0) chainL.push(loc.split('-')[0]);
        var ids = Object.keys(I18N_SOURCE), rows = ids.map(function (id) { return [id, I18N_SOURCE[id], '…', '']; }), frames = [];
        function tbl(hl) { return { type: 'table', label: 'messages for ' + loc, columns: ['@@id', 'source (en-US)', 'shown', 'from'], rows: rows.map(function (r) { return r.slice(); }), hl: hl }; }
        frames.push({ narr: 'Building/serving the <b>' + H.esc(loc) + '</b> version. Lookup order: <code>' + chainL.concat(['source']).join(' → ') + '</code>. (With build-per-locale Angular does this at build time; with <code>i18nMissingTranslation: "error"</code> a missing ID fails the build instead of falling back.)', parts: [{ type: 'set', label: 'fallback chain', items: chainL.concat(['source']) }, tbl({})] });
        var missingN = 0;
        ids.forEach(function (id, i) {
          var found = null;
          for (var k = 0; k < chainL.length; k++) if (I18N_TRANS[chainL[k]] && I18N_TRANS[chainL[k]][id]) { found = chainL[k]; break; }
          rows[i][2] = found ? I18N_TRANS[found][id] : I18N_SOURCE[id];
          rows[i][3] = found || 'source (missing!)';
          if (!found && loc !== 'en') missingN++;
          var hl = {}; hl[i] = found === loc ? 'ok' : found ? 'win' : 'bad';
          frames.push({ narr: '<code>@@' + id + '</code>: ' + (found === loc ? 'exact translation in <b>' + loc + '</b>.' : found ? 'not in ' + loc + ', found in parent <b>' + found + '</b>.' : 'no translation in any locale of the chain → shows the <b>English source</b>. In a real build that is a warning (or error).'), parts: [tbl(hl)] });
        });
        frames.push({ narr: missingN ? missingN + ' message(s) fell back to English. Run <code>ng extract-i18n</code> and diff against the translation file to find them before release.' : 'All messages translated. Each build output folder (<code>/' + H.esc(loc) + '/</code>) has these strings inlined, no runtime lookup cost.', parts: [tbl({})] });
        return pad4(frames);
      }
    },
    examples: [
      { title: 'Serving locale builds', html: `<p>After <code>ng build</code> with <code>localize: true</code> you have <code>dist/shop/browser/en-US</code>, <code>/de</code>, <code>/fr</code>. The web server maps <code>/de/*</code> to the German folder (each <code>index.html</code> already has <code>&lt;base href="/de/"&gt;</code>) and redirects <code>/</code> based on a cookie or <code>Accept-Language</code>. A language switcher is just a link to <code>/fr/</code> + the current path. With SSR, the server bundle is localized too.</p>
        ${H.table(['URL', 'Served from'], [['/de/cart', 'dist/shop/browser/de/index.html'], ['/fr/cart', 'dist/shop/browser/fr/index.html'], ['/', '302 → /de/ (cookie lang=de)']])}` },
      { title: 'Runtime switching with Transloco', html: `<p>Keys instead of source text, JSON files per language, and live switching. Scoped translations can be lazy-loaded with a feature route.</p>`,
        code: { lang: 'ts', code: `import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslocoDirective],
  template: \`
    <ng-container *transloco="let t">
      <h1>{{ t('header.title') }}</h1>
      <p>{{ t('header.greet', { name: 'Ana' }) }}</p>
      <select (change)="use($any($event.target).value)" [attr.aria-label]="t('header.language')">
        <option value="en">English</option>
        <option value="de">Deutsch</option>
      </select>
    </ng-container>
  \`,
})
export class HeaderComponent {
  private transloco = inject(TranslocoService);
  use(lang: string) { this.transloco.setActiveLang(lang); }   // loads /assets/i18n/de.json and re-renders
}` } },
      { title: 'Common Angular i18n mistakes', html: `${H.table(['Mistake', 'Why it hurts', 'Fix'], [
        ['Concatenating <code>$localize</code> pieces', 'Word order differs per language', 'One message with placeholders'],
        ['No custom IDs', 'Text edits change hashes, translations lost', '<code>@@stableId</code>'],
        ['Hard-coded <code>\'en-US\'</code> in DatePipe', 'Ignores the build locale', 'Rely on <code>LOCALE_ID</code>'],
        ['<code>left</code>/<code>right</code> CSS', 'Breaks Arabic/Hebrew (RTL)', 'Logical properties + <code>dir</code>; CDK <code>Directionality</code> in components'],
        ['Translating in <code>ngOnInit</code> with runtime lib but OnPush', 'Language switch not reflected', 'Use the pipe/directive or <code>selectTranslate()</code> Observable / signal']
      ])}` }
    ],
    deepDive: `<p>🟣 <b>How $localize is compiled.</b> The compiler turns template <code>i18n</code> blocks into <code>$localize</code> tagged-template calls. In a localized build, after bundling, the CLI <b>inlines</b> translations: it finds every <code>$localize</code> call in the output JS and replaces it with the translated string literal, once per locale. That's why one compile produces N locales quickly, and why the runtime cost is zero. In dev (<code>ng serve</code>) you serve one locale via a build configuration (<code>"localize": ["de"]</code>).</p>
      <p>🟣 <b>Runtime $localize.</b> Without inlining, <code>$localize</code> is a real function at runtime that looks up <code>loadTranslations</code> data by message ID. Translations must be loaded before the code that calls <code>$localize</code> runs — template messages are evaluated when the component is first created, but top-level constants in a module are evaluated at import time, hence the "load translations, then dynamic import the app" pattern.</p>
      <p>🟣 <b>Message IDs.</b> The default ID is a hash of the message text and meaning (not the description). Same text + same meaning in two places = one translation. Different meaning (e.g. "Book" as noun vs verb) = two IDs. Custom IDs override this; duplicates with different text produce a warning.</p>
      <p>🟣 <b>Locale data.</b> Pipes (<code>DatePipe</code>, <code>DecimalPipe</code>, <code>CurrencyPipe</code>, <code>PercentPipe</code>) use locale data (from CLDR) for the active <code>LOCALE_ID</code>. Localized builds include the right data automatically; runtime approaches must <code>registerLocaleData(localeDe)</code> and provide <code>LOCALE_ID</code> (which is read once at bootstrap — changing it later requires recreating the app or using <code>Intl</code> directly). <code>DEFAULT_CURRENCY_CODE</code> sets the default currency.</p>
      <p>🟣 <b>Performance and SSR.</b> Build-per-locale multiplies build output size and CI time by the number of locales, but each user downloads only their language. Runtime libs add the dictionary download (lazy per scope) and a pipe evaluation per binding. With SSR + hydration, ensure the server renders the same language the client will hydrate with, or hydration mismatches appear.</p>`,
    aiEra: `<p>🤖 Machine translation by LLMs is now good enough that many teams translate XLIFF/JSON files automatically in CI and send only flagged strings to human reviewers. Feed the <b>description</b> and <b>meaning</b> fields as context — that is exactly what they exist for, and it fixes many ambiguous translations ("Book" the noun vs the verb). Keep placeholders and ICU syntax intact (validate the translated file with <code>ng build --localize</code> and <code>i18nMissingTranslation: "error"</code>). AI agents are also handy for the boring migration work: finding hard-coded strings in templates and wrapping them with <code>i18n</code> + stable IDs. Pseudo-localization (accented, 30% longer strings) generated by a script is still the cheapest way to catch layout breakage.</p>`,
    problems: [{
      title: 'Report Missing and Orphaned Translations',
      level: 'Easy', tags: ['i18n', 'tooling'], companies: ['Booking.com', 'SAP'],
      statement: `<p>Given the extracted source messages <code>{ id: text }</code> and a translation file <code>{ id: text }</code>, return <code>{ missing, orphaned, placeholderMismatch }</code>: IDs in source but not translated, IDs translated but no longer in source, and IDs whose set of <code>{placeholders}</code> differs between source and translation.</p>`,
      constraints: `Up to 20 000 messages.`,
      example: `<p>Source <code>{a:'Hi {name}', b:'Bye'}</code>, translation <code>{a:'Hallo {nme}', c:'Alt'}</code> → missing ${H.c('r', '[b]')}, orphaned ${H.c('y', '[c]')}, placeholder mismatch ${H.c('r', '[a]')}.</p>`,
      brute: { why: `<p>Only counting keys (<code>Object.keys(a).length === Object.keys(b).length</code>) says "complete" when one missing and one orphaned key cancel out, and ignores broken placeholders that crash or show <code>{nme}</code> at runtime.</p>`,
        code: { lang: 'js', run: true, code: `const src = { a: 'Hi {name}', b: 'Bye' }, tr = { a: 'Hallo {nme}', c: 'Alt' };
console.log('complete?', Object.keys(src).length === Object.keys(tr).length); // true, but wrong` } },
      mcq: { q: 'Why do Angular teams add <code>@@customId</code> to messages?', options: ['To make bundles smaller', 'So IDs stay stable when the source text changes', 'Because ICU requires it'], answer: 1, explain: 'Default IDs hash the text, so edits orphan translations. Custom IDs survive edits.' },
      hints: [
        `<p>Hint 1: two set differences give missing and orphaned.</p>`,
        `<p>Hint 2: extract placeholders with a regex like <code>/\\{(\\w+)\\}/g</code> into a sorted array.</p>`,
        `<p>Hint 3: compare the sorted placeholder lists only for IDs present in both files.</p>`
      ],
      solution: {
        approach: `<p>Key sets for missing/orphaned, regex for placeholders, compare joined sorted names. Linear in total text length.</p>`,
        code: { lang: 'js', run: true, code: `function audit(source, translation) {
  const ph = s => (s.match(/\\{(\\w+)\\}/g) || []).sort().join(',');
  const missing = Object.keys(source).filter(id => !(id in translation));
  const orphaned = Object.keys(translation).filter(id => !(id in source));
  const placeholderMismatch = Object.keys(source)
    .filter(id => id in translation && ph(source[id]) !== ph(translation[id]));
  return { missing, orphaned, placeholderMismatch };
}
console.log(audit({ a: 'Hi {name}', b: 'Bye', d: '{n} of {total}' }, { a: 'Hallo {nme}', c: 'Alt', d: '{total} von {n}' }));` },
        complexity: `<p>O(total characters). Note <code>d</code> passes: placeholders may be <b>reordered</b> by translators, only the set must match.</p>`,
        followUps: ['How would you validate ICU plural branches (every locale needs its own categories)?', 'Where in CI would you run this?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 6 — Security: sanitization, bypass risks, XSRF, CSP
     ===================================================================== */
  var SAFE_TAGS = ['b', 'i', 'em', 'strong', 'p', 'a', 'ul', 'li', 'br', 'img', 'span'];
  var SAFE_ATTRS = ['href', 'src', 'alt', 'title', 'class'];
  var SAFE_URL = /^(?!javascript:)(?:[a-z0-9+.-]+:|[^&:\/?#]*(?:[\/?#]|$))/i;
  function sanitizeSteps(html) {
    var steps = [], out = '', re = /<\/?([a-zA-Z0-9]+)([^>]*)>|[^<]+/g, m, skipDepth = 0;
    while ((m = re.exec(html))) {
      var tok = m[0];
      if (!m[1]) {
        if (skipDepth) { steps.push({ tok: tok, act: 'drop', why: 'text inside a dropped &lt;script&gt;/&lt;style&gt; is removed too' }); continue; }
        out += tok; steps.push({ tok: tok, act: 'keep', why: 'plain text (it will be escaped when written)' }); continue;
      }
      var tag = m[1].toLowerCase(), closing = tok.charAt(1) === '/';
      if (tag === 'script' || tag === 'style') { skipDepth += closing ? -1 : 1; if (skipDepth < 0) skipDepth = 0; steps.push({ tok: tok, act: 'drop', why: '&lt;' + tag + '&gt; is never allowed; its content is dropped as well' }); continue; }
      if (SAFE_TAGS.indexOf(tag) < 0) { steps.push({ tok: tok, act: 'drop', why: '&lt;' + tag + '&gt; is not on the allowlist (the text inside is kept)' }); continue; }
      if (closing) { out += '</' + tag + '>'; steps.push({ tok: tok, act: 'keep', why: 'closing tag of an allowed element' }); continue; }
      var attrs = [], dropped = [], ar = /([a-zA-Z-:]+)\s*=\s*("([^"]*)"|'([^']*)'|[^\s>]+)/g, a;
      while ((a = ar.exec(m[2]))) {
        var name = a[1].toLowerCase(), val = a[3] !== undefined ? a[3] : a[4] !== undefined ? a[4] : a[2];
        if (SAFE_ATTRS.indexOf(name) < 0) { dropped.push(name + ' (not allowed)'); continue; }
        if ((name === 'href' || name === 'src') && !SAFE_URL.test(val.trim())) { attrs.push(name + '="unsafe:' + val + '"'); dropped.push(name + ' URL prefixed with unsafe:'); continue; }
        attrs.push(name + '="' + val + '"');
      }
      out += '<' + tag + (attrs.length ? ' ' + attrs.join(' ') : '') + '>';
      steps.push({ tok: tok, act: dropped.length ? 'fix' : 'keep', why: dropped.length ? 'allowed tag, but: ' + dropped.join(', ') : 'allowed tag with safe attributes' });
    }
    return { steps: steps, out: out };
  }

  topics.push({
    title: 'Angular Security: Built-in Sanitization, DomSanitizer Bypass Risks, XSRF & CSP/Trusted Types',
    analogy: `<p>Angular is an <b>airport security checkpoint</b>. By default <b>every bag is scanned</b> (all values are untrusted): text is X-rayed and passed as harmless text, and anything dangerous in HTML (scripts, <code>onclick</code>) is taken out. <code>bypassSecurityTrust...</code> is the <b>"diplomatic pouch"</b>: it skips the scanner. That is fine for sealed bags from your own embassy, and a disaster if a stranger can slip something into the pouch. XSRF protection is the <b>boarding pass check</b> (prove the request came from your own app), and CSP is the <b>no-fly list</b> telling the browser which scripts may ever board.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> The big frontend risk is <b>XSS</b> (cross-site scripting): attacker-controlled text ends up executed as code in your page, stealing sessions or acting as the user. Angular's design blocks most XSS by default:</p>
      ${H.table(['You write', 'Angular does', 'Safe?'], [
        ['<code>{{ comment }}</code>', 'Sets <b>text</b> content. <code>&lt;script&gt;</code> shows as characters', '✅ always'],
        ['<code>[innerHTML]="comment"</code>', 'Runs the <b>HTML sanitizer</b>: keeps safe tags, strips scripts, event handlers, <code>javascript:</code> URLs; warns in dev', '✅ for most needs'],
        ['<code>[href]="url"</code>, <code>[src]</code>', 'URL sanitizer: unsafe schemes become <code>unsafe:javascript:…</code>', '✅'],
        ['<code>[style]</code> bindings', 'Style context (modern browsers: safe values pass)', '✅'],
        ['<code>&lt;iframe [src]="url"&gt;</code>, <code>&lt;script [src]&gt;</code>', 'Resource URL context: <b>cannot</b> be sanitized, so Angular throws unless the value is explicitly trusted', '⚠️ needs a decision'],
        ['<code>el.nativeElement.innerHTML = x</code>', 'Nothing! Direct DOM access skips Angular', '❌'],
        ['<code>sanitizer.bypassSecurityTrustHtml(x)</code>', 'Marks <code>x</code> as trusted; no sanitizing', '❌ if <code>x</code> contains user data']
      ])}
      <p>🔵 <b>The five security contexts</b> are HTML, Style, URL, Resource URL (and Script, which Angular never binds). <code>DomSanitizer</code> has a <code>bypassSecurityTrust*</code> method per context and <code>sanitize(SecurityContext.HTML, value)</code> to sanitize manually. Rule: <b>only bypass values you fully control</b> (constants, allowlisted embed URLs you build yourself), or HTML already sanitized with a strong library like DOMPurify on the client and the server. Keep all bypasses in one small, reviewed pipe/service so they are easy to audit.</p>
      <p>🔵 <b>XSRF/CSRF.</b> A malicious site can make the user's browser send a cookie-authenticated <code>POST</code> to your API. Angular's <code>HttpClient</code> has built-in support for the <b>cookie-to-header</b> pattern: the server sets a cookie <code>XSRF-TOKEN</code>; for mutating requests (not GET/HEAD) to <b>relative</b> (same-origin) URLs, Angular reads it and sends header <code>X-XSRF-TOKEN</code>. Another origin cannot read your cookie, so it cannot forge the header. The <b>server must verify</b> the header matches. Configure names with <code>withXsrfConfiguration()</code>; combine with <code>SameSite</code> cookies.</p>
      <p>🔵 <b>CSP.</b> A Content-Security-Policy header tells the browser which scripts/styles may run. Angular needs inline <code>&lt;style&gt;</code> elements for component styles, so a strict CSP uses a <b>nonce</b>: put <code>ngCspNonce="{{random}}"</code> on the root element (server fills it per request) or provide the <code>CSP_NONCE</code> token. Angular 19 added <code>"security": { "autoCsp": true }</code> in <code>angular.json</code>, which generates a hash-based CSP for the inline scripts of <code>index.html</code>. <b>Trusted Types</b> (<code>require-trusted-types-for 'script'</code>) make the browser reject raw strings assigned to dangerous sinks; Angular supports it with policies named <code>angular</code>, <code>angular#bundler</code>, and (only if you bypass) <code>angular#unsafe-bypass</code>.</p>`,
    clues: [
      '"Render rich text / markdown / CMS HTML" → <code>[innerHTML]</code> (sanitized), or DOMPurify + one audited bypass',
      '"unsafe value used in a resource URL context" error on an iframe → build the URL yourself from an allowlist, then <code>bypassSecurityTrustResourceUrl</code>',
      '"WARNING: sanitizing HTML stripped some content" → Angular removed something dangerous (or a style/attribute you expected)',
      '"Cookie-based session, protect POST/PUT/DELETE" → XSRF cookie-to-header with HttpClient + server check + SameSite',
      '"Security team requires a strict CSP" → nonce via <code>ngCspNonce</code>/<code>CSP_NONCE</code>, <code>autoCsp</code>, Trusted Types',
      '"Code review: <code>this.el.nativeElement.innerHTML = data</code>" → bypasses sanitization, XSS'
    ],
    code: [
      { lang: 'ts', title: 'The only place in the app allowed to bypass: an allowlisted video embed pipe', code: `import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

// We never trust the incoming URL. We extract an ID, validate it,
// and BUILD the embed URL ourselves from a constant origin.
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

@Pipe({ name: 'safeVideoEmbed' })
export class SafeVideoEmbedPipe implements PipeTransform {
  private sanitizer = inject(DomSanitizer);

  transform(videoId: string | null | undefined): SafeResourceUrl | null {
    if (!videoId || !VIDEO_ID.test(videoId)) return null;          // reject anything odd
    const url = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(videoId);
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);   // safe: we control every character
  }
}
// template: @if (id | safeVideoEmbed; as src) { <iframe [src]="src" title="Product video"></iframe> }` },
      { lang: 'ts', title: 'Bad vs good: rendering user HTML', code: `import { Component, ElementRef, inject, input, effect, SecurityContext } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-comment',
  template: \`
    <!-- GOOD: Angular sanitizes; <img onerror> and <script> are stripped -->
    <div class="body" [innerHTML]="html()"></div>
  \`,
})
export class CommentComponent {
  html = input('');
  private el = inject(ElementRef);
  private sanitizer = inject(DomSanitizer);

  constructor() {
    effect(() => {
      // BAD (do not do this): this.el.nativeElement.querySelector('.body').innerHTML = this.html();
      // BAD (do not do this): this.sanitizer.bypassSecurityTrustHtml(this.html())
      // If you must touch the DOM yourself, sanitize explicitly first:
      const clean = this.sanitizer.sanitize(SecurityContext.HTML, this.html()) ?? '';
      console.debug('sanitized length', clean.length);
    });
  }
}` },
      { lang: 'ts', title: 'app.config.ts — XSRF names, interceptor that only sends tokens to our API, CSP nonce', code: `import { ApplicationConfig, CSP_NONCE, inject } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors, withXsrfConfiguration, HttpInterceptorFn } from '@angular/common/http';
import { AuthStore } from './auth.store';

const API = '/api/';

// Attach the bearer token ONLY to our own API, never to third-party URLs.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthStore).accessToken();
  if (!token || !req.url.startsWith(API)) return next(req);
  return next(req.clone({ setHeaders: { Authorization: 'Bearer ' + token } }));
};

declare global { interface Window { __CSP_NONCE__?: string } }

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
      withFetch(),
      withInterceptors([authInterceptor]),
      // defaults are XSRF-TOKEN / X-XSRF-TOKEN; set them to match the backend
      withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' }),
    ),
    // alternative to ngCspNonce on the root element: provide the per-request nonce
    { provide: CSP_NONCE, useValue: globalThis.window?.__CSP_NONCE__ ?? null },
  ],
};` },
      { lang: 'js', run: true, title: 'Runnable model: an allowlist HTML sanitizer + Angular\'s safe-URL test', code: `const SAFE_URL = /^(?!javascript:)(?:[a-z0-9+.-]+:|[^&:\\/?#]*(?:[\\/?#]|$))/i;
for (const u of ['https://a.com', '/cart', 'mailto:x@y.z', 'javascript:alert(1)', ' JaVaScRiPt:alert(1)'])
  console.log(u.padEnd(24), SAFE_URL.test(u.trim()) ? 'safe' : 'unsafe:' + u.trim());

const TAGS = new Set(['b', 'i', 'p', 'a', 'img']), ATTRS = new Set(['href', 'src', 'alt']);
function sanitize(html) {
  return html
    .replace(/<(script|style)[^>]*>[\\s\\S]*?<\\/\\1>/gi, '')              // drop script/style with content
    .replace(/<\\/?([a-z0-9]+)([^>]*)>/gi, (tag, name, attrs) => {
      name = name.toLowerCase();
      if (!TAGS.has(name)) return '';                                  // unknown tag: drop tag, keep text
      if (tag[1] === '/') return '</' + name + '>';
      const kept = [...attrs.matchAll(/([a-z-]+)\\s*=\\s*"([^"]*)"/gi)]
        .filter(([, a]) => ATTRS.has(a.toLowerCase()))                 // drops onerror, onclick, style...
        .map(([, a, v]) => a + '="' + (/^(href|src)$/i.test(a) && !SAFE_URL.test(v.trim()) ? 'unsafe:' + v : v) + '"');
      return '<' + name + (kept.length ? ' ' + kept.join(' ') : '') + '>';
    });
}
console.log(sanitize('<p>Hi <b>there</b><img src="x" onerror="steal()"><script>steal()<\\/script><a href="javascript:steal()">win</a></p>'));` }
    ],
    viz: {
      title: 'Watch [innerHTML] sanitize a comment, token by token',
      input: '<p onclick="x()">Nice <b>post</b>!<img src="a.png" onerror="steal()"><script>steal()<\/script><a href="javascript:steal()">prize</a><marquee>hi</marquee></p>',
      inputLabel: 'HTML a user typed into a comment (max 300 chars)',
      gen: function (input) {
        var html = String(input || '');
        if (!html.trim()) throw new Error('Type some HTML, e.g. <b>hi</b><img src=x onerror="steal()">');
        if (html.length > 300) throw new Error('Keep the HTML under 300 characters.');
        var r = sanitizeSteps(html), frames = [], rows = [];
        if (r.steps.length > 24) throw new Error('Too many tags; keep it to about 20 tokens.');
        frames.push({ narr: 'The template binds <code>[innerHTML]="comment"</code>. Angular sees an untrusted string in the <b>HTML context</b> and runs its sanitizer: parse, walk every node, keep only allowlisted elements/attributes, check URLs.', parts: [{ type: 'text', label: 'input', html: '<code>' + H.esc(html) + '</code>' }] });
        r.steps.forEach(function (s, i) {
          rows.push([H.esc(s.tok.length > 40 ? s.tok.slice(0, 40) + '…' : s.tok), s.act, s.why]);
          var hl = {}; hl[i] = s.act === 'keep' ? 'ok' : s.act === 'fix' ? 'cur' : 'bad';
          frames.push({ narr: '<code>' + H.esc(s.tok.length > 60 ? s.tok.slice(0, 60) + '…' : s.tok) + '</code> → <b>' + s.act + '</b>: ' + s.why + '.', parts: [{ type: 'table', label: 'sanitizer decisions', columns: ['token', 'action', 'why'], rows: rows.slice(), hl: hl }] });
        });
        frames.push({ narr: 'Result written to the DOM. In dev mode Angular logs <i>"WARNING: sanitizing HTML stripped some content"</i>. Calling <code>bypassSecurityTrustHtml</code> on this input would have kept <code>onerror="steal()"</code>, which runs as soon as the image fails to load.', parts: [{ type: 'text', label: 'sanitized output', html: '<code>' + H.esc(r.out) + '</code>' }] });
        return pad4(frames);
      }
    },
    examples: [
      { title: 'XSRF round trip', html: `${H.table(['Step', 'What happens'], [
        ['1', 'GET /api/session → server sets cookie <code>XSRF-TOKEN=k8f2…</code> (readable by JS, <code>SameSite=Lax</code>, <code>Secure</code>)'],
        ['2', '<code>http.post(\'/api/orders\', body)</code> → Angular reads the cookie and adds <code>X-XSRF-TOKEN: k8f2…</code>'],
        ['3', 'Server compares header with cookie (or with the session) → match → accept'],
        ['4', 'Evil site auto-submits a form to /api/orders: browser sends the cookie, but evil.com cannot read it to set the header → mismatch → 403'],
        ['Note', 'Absolute URLs (<code>https://api.other.com</code>) never get the header, to avoid leaking the token; use same-origin paths or a proxy, or implement the header in your own interceptor deliberately']
      ])}<p>Pure bearer-token APIs (token in memory, sent via <code>Authorization</code> header) are not vulnerable to CSRF in the same way, because the browser does not attach the token automatically. They are, however, exposed if XSS can read the token — which is why XSS defence matters most.</p>` },
      { title: 'Strict CSP with a nonce for an SSR app', html: `<p>The server generates a random nonce per response, puts it in the header and in the HTML. Angular adds the nonce to every <code>&lt;style&gt;</code> it creates for components.</p>`,
        code: { lang: 'http', code: `HTTP/1.1 200 OK
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-r4nd0m' 'strict-dynamic'; style-src 'self' 'nonce-r4nd0m'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; require-trusted-types-for 'script'; trusted-types angular angular#bundler
Content-Type: text/html

<app-root ngCspNonce="r4nd0m"></app-root>` } },
      { title: 'Security review checklist for an Angular PR', html: `${H.table(['Grep for', 'Why'], [
        ['<code>bypassSecurityTrust</code>', 'Every hit needs a justification; input must be constant or allowlisted'],
        ['<code>nativeElement.innerHTML</code>, <code>insertAdjacentHTML</code>, <code>document.write</code>', 'Skip Angular sanitization entirely'],
        ['<code>Renderer2.setProperty(el, \'innerHTML\'</code>', 'Renderer does not sanitize either'],
        ['<code>JitCompiler</code>, building templates from strings', 'Template injection = arbitrary code execution; always AOT'],
        ['<code>localStorage.setItem(\'token\'</code>', 'Any XSS can read it; prefer HttpOnly cookies or in-memory + refresh'],
        ['Interceptor adding tokens to every URL', 'Leaks credentials to third parties']
      ])}` }
    ],
    deepDive: `<p>🟣 <b>How the HTML sanitizer works.</b> Angular parses the string with an inert document (<code>DOMParser</code> / a <code>&lt;template&gt;</code>), walks the tree, and rebuilds HTML from allowlisted elements and attributes only; URL attributes go through the URL sanitizer (which, in recent versions, only blocks the <code>javascript:</code> scheme rather than allowlisting a few protocols). It re-parses until stable to defeat mutation-XSS tricks. It does <b>not</b> keep <code>style</code> attributes or <code>&lt;svg&gt;</code>/<code>&lt;iframe&gt;</code>/forms in most cases, which is why rich-text content sometimes "loses formatting" — the right fix is usually CSS classes, not bypass.</p>
      <p>🟣 <b>Why bypass is dangerous even with "trusted" sources.</b> Content from your own CMS is still user content if editors, imports or a compromised account can write to it. Stored XSS through an admin CMS is a classic. If you must render arbitrary HTML, sanitize on the server at write time and again with DOMPurify at render, and consider rendering it in a sandboxed iframe on a separate origin.</p>
      <p>🟣 <b>SSR specifics.</b> Server-rendered HTML uses the same escaping. <code>TransferState</code> serializes data into a script tag with escaping of <code>&lt;</code>, so API data cannot break out. Do not render user data into <code>&lt;meta&gt;</code> tags with string concatenation in server code; use <code>Meta</code>/<code>Title</code> services.</p>
      <p>🟣 <b>Other built-ins.</b> HttpClient strips the XSSI prefix <code>)]}',\\n</code> from JSON responses, so servers can prepend it to prevent JSON hijacking. Angular never uses <code>eval</code> in AOT production builds, making a CSP without <code>'unsafe-eval'</code> possible. Keep Angular updated: security fixes ship in patch releases and only for supported (active + LTS) majors.</p>
      <p>🟣 <b>Supply chain.</b> Most real incidents now come from compromised npm packages rather than template bugs. Use lockfiles, <code>npm audit</code>/Dependabot, minimal dependencies in the design system, and Subresource Integrity for any third-party script you cannot avoid.</p>`,
    aiEra: `<p>🤖 AI assistants are a real XSS risk amplifier: asked "render this HTML" they often reach for <code>bypassSecurityTrustHtml</code> because it silences the warning. Treat any AI-generated bypass as a review blocker unless the input is provably constant. Conversely, AI is great at security reviews: point an agent at a diff with the checklist above and it will find <code>innerHTML</code> and token-leaking interceptors quickly. New AI-era risk: apps that render <b>LLM output</b> (chat UIs, summaries). Model output can contain attacker-injected markup via prompt injection, so treat it exactly like user input: render markdown through a sanitizing pipeline, never bypass, and never let model output build URLs for iframes or scripts.</p>`,
    problems: [{
      title: 'Validate Links Like Angular\'s URL Sanitizer',
      level: 'Easy', tags: ['security', 'xss', 'urls'], companies: ['Google', 'Okta'],
      statement: `<p>Write <code>safeHref(url)</code>: return the trimmed URL if it is safe for an <code>href</code>, otherwise <code>'unsafe:' + url</code>. A URL is unsafe if, after trimming and ignoring case, it starts with <code>javascript:</code>. Also treat control characters/whitespace hidden inside the scheme (e.g. <code>java\\tscript:</code>) as unsafe, because browsers strip them.</p>`,
      constraints: `Strings up to 2 000 chars.`,
      example: `<p><code>'/cart'</code> → ${H.c('g', '/cart')}; <code>'https://x.com'</code> → ${H.c('g', 'kept')}; <code>' JavaScript:alert(1)'</code> → ${H.c('r', 'unsafe:JavaScript:alert(1)')}; <code>'java\\tscript:x'</code> → ${H.c('r', 'unsafe')}.</p>`,
      brute: { why: `<p><code>url.startsWith('javascript:')</code> is bypassed by upper case, leading spaces and embedded tabs/newlines, all of which browsers accept.</p>`,
        code: { lang: 'js', run: true, code: `const naive = u => u.startsWith('javascript:') ? 'unsafe:' + u : u;
console.log(naive('JavaScript:alert(1)'), '|', naive(' javascript:alert(1)'), '|', naive('java\\tscript:alert(1)'));` } },
      mcq: { q: 'Where is <code>bypassSecurityTrustResourceUrl</code> acceptable?', options: ['On any URL from the API', 'On a URL you build yourself from a validated ID and a constant origin', 'Never, iframes cannot be used in Angular'], answer: 1, explain: 'You control every character of the result, so nothing attacker-controlled reaches the resource context.' },
      hints: [
        `<p>Hint 1: normalise first: trim, lower-case, and remove ASCII control characters and whitespace (<code>/[\\u0000-\\u0020]/g</code>).</p>`,
        `<p>Hint 2: then check the normalised string with <code>startsWith('javascript:')</code>.</p>`,
        `<p>Hint 3: return the original (trimmed) value when safe, so you do not change legitimate URLs.</p>`
      ],
      solution: {
        approach: `<p>Normalise the way a browser would before deciding, then use a blocklist of one scheme (matching modern Angular). Keep the user's URL unchanged when safe.</p>`,
        code: { lang: 'js', run: true, code: `function safeHref(url) {
  const trimmed = String(url).trim();
  const normalised = trimmed.replace(/[\\u0000-\\u0020]/g, '').toLowerCase();
  return normalised.startsWith('javascript:') ? 'unsafe:' + trimmed : trimmed;
}
for (const u of ['/cart', 'https://x.com/a?b=1', ' JavaScript:alert(1)', 'java\\tscript:alert(1)', 'mailto:hi@x.com'])
  console.log(JSON.stringify(u).padEnd(26), '->', safeHref(u));` },
        complexity: `<p>O(n). Real sanitizers also handle <code>data:</code>/<code>vbscript:</code> in some contexts and resource URLs (which cannot be made safe by inspection at all).</p>`,
        followUps: ['Why can Angular sanitize href but not iframe src?', 'Is an allowlist (http, https, mailto) safer than a blocklist?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 7 — Machine coding: data table (sort/filter/paginate) + infinite scroll
     ===================================================================== */
  var PEOPLE = [
    { id: 1, name: 'Anna', city: 'Berlin', age: 31 }, { id: 2, name: 'Ben', city: 'Pune', age: 25 },
    { id: 3, name: 'Chen', city: 'Berlin', age: 42 }, { id: 4, name: 'Dana', city: 'Austin', age: 25 },
    { id: 5, name: 'Eva', city: 'Pune', age: 37 }, { id: 6, name: 'Farid', city: 'Austin', age: 29 },
    { id: 7, name: 'Gita', city: 'Pune', age: 33 }, { id: 8, name: 'Hans', city: 'Berlin', age: 51 }
  ];
  function parseTableQuery(input) {
    var q = { filter: '', sort: null, dir: 'asc', page: 1, size: 3 };
    words(input, 6, 'Write e.g. filter=pu sort=age:desc page=1 size=3').forEach(function (w) {
      var kv = w.split('=');
      if (kv.length !== 2) throw new Error('Use key=value pairs: filter=, sort=col:asc|desc, page=, size=');
      if (kv[0] === 'filter') q.filter = kv[1].toLowerCase();
      else if (kv[0] === 'sort') { var sd = kv[1].split(':'); if (['name', 'city', 'age'].indexOf(sd[0]) < 0) throw new Error('Sort by name, city or age.'); q.sort = sd[0]; q.dir = sd[1] === 'desc' ? 'desc' : 'asc'; }
      else if (kv[0] === 'page') { q.page = parseInt(kv[1], 10); if (!(q.page >= 1)) throw new Error('page must be 1 or more.'); }
      else if (kv[0] === 'size') { q.size = parseInt(kv[1], 10); if (!(q.size >= 1 && q.size <= 8)) throw new Error('size must be 1..8.'); }
      else throw new Error('Unknown key ' + kv[0]);
    });
    return q;
  }

  topics.push({
    title: 'Machine Coding I: Data Table with Sort, Filter & Pagination, and Infinite Scroll',
    analogy: `<p>A <b>library catalogue</b>. Filtering is choosing the shelf ("only cookbooks"), sorting is arranging those books by title, and pagination is the librarian handing you <b>ten at a time</b>. The order matters: you must pick the shelf and sort it <i>before</i> taking the first ten, or you get "the first ten books in the building, then sorted". Infinite scroll is the librarian who quietly brings the next ten when you reach the end of the pile — but must not run twice for the same pile, and must say "that was the last shelf".</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> The data table is the most common Angular machine-coding prompt. Interviewers check three things: (1) the <b>derived-state pipeline</b> is right (filter → sort → paginate), (2) the <b>component split</b> is clean, (3) <b>edge cases</b> work (empty results, last page shrinking, reset to page 1 when the filter changes, loading/error). fe20 gave the generic round plan; here is the feature-specific build sheet.</p>
      ${H.table(['Minute', 'Build step for a 75-minute table round'], [
        ['0–7', 'Clarify: client or server side? how many rows? which columns sortable? multi-sort? URL-shareable state? Material allowed?'],
        ['7–15', 'Sketch: <code>UsersPage</code> (smart) → <code>FilterBar</code>, <code>DataTable</code>, <code>Paginator</code> (presentational). Type <code>User</code>, <code>SortState</code>. Mock API with <code>of(data).pipe(delay(300))</code>'],
        ['15–45', 'State as signals + <code>computed</code> pipeline; render with <code>@for (row of pageRows(); track row.id)</code>; sort headers as buttons with <code>aria-sort</code>'],
        ['45–60', 'Edge cases: <code>@empty</code>, page reset (<code>linkedSignal</code>), clamp page, loading/error, debounced filter'],
        ['60–75', 'Polish: URL sync via query params, keyboard, a unit test of the pipeline; explain server-side variant and virtual scroll for 100k rows']
      ])}
      <p>🔵 <b>Signal pipeline (client-side).</b> Keep <b>source state</b> minimal (<code>rows</code>, <code>query</code>, <code>sort</code>, <code>page</code>, <code>pageSize</code>) and derive everything else with <code>computed</code>: <code>filtered</code> → <code>sorted</code> → <code>pageRows</code>, plus <code>total</code> and <code>pageCount</code>. Sorting must <b>copy</b> (<code>[...rows].sort()</code>) — <code>Array.prototype.sort</code> mutates, and mutating the source array breaks signal equality and OnPush. Use <code>localeCompare</code> for strings and a numeric compare for numbers.</p>
      <p>🔵 <b>Page reset.</b> When the filter or sort changes, the page must go back to 1. <code>linkedSignal</code> (stable in v20) expresses that perfectly: a writable signal whose value is <b>recomputed when its source changes</b> but can still be set by the user (<code>page = linkedSignal({ source: () =&gt; [query(), sort()], computation: () =&gt; 1 })</code>). Older code used an <code>effect</code> to reset — which works but is a "signal write in effect" smell.</p>
      <p>🔵 <b>Server-side mode.</b> With 1M rows, filter/sort/page move to the API: <code>GET /users?q=pu&amp;sort=age,desc&amp;page=2&amp;size=20</code>. In the component, a <b>resource</b> (<code>rxResource</code>/<code>httpResource</code>, experimental in v19–v20) or <code>toObservable(params).pipe(debounceTime(300), switchMap(...))</code> reloads when params change and cancels stale requests. Show the previous page while loading to avoid flicker.</p>
      <p>🔵 <b>Infinite scroll.</b> Use an <code>IntersectionObserver</code> on a <b>sentinel</b> element at the end of the list (not a scroll listener). Guard: don't load if a request is in flight or there is no next page; use <b>cursor</b> pagination (<code>?after=abc</code>) to avoid duplicates when new items arrive; keep "Load more" as an accessible fallback; switch to <code>cdk-virtual-scroll-viewport</code> when the DOM gets big.</p>`,
    clues: [
      '"Build a table with sort, filter and pagination" → signals + computed filter → sort → slice; reset page on filter',
      '"Shareable link to the current view" → sync query/sort/page with router query params (<code>withComponentInputBinding</code>)',
      '"Table must handle a million rows" → server-side paging/sorting + debounced params + cancel stale (switchMap / resource)',
      '"Load more as the user scrolls" → IntersectionObserver on a sentinel, in-flight guard, cursor pagination, end state',
      '"After filtering the table shows an empty page 5" → page not reset / not clamped',
      '"Material allowed" → <code>MatTable</code> + <code>MatSort</code> + <code>MatPaginator</code> with <code>MatTableDataSource</code> (or your own data source)'
    ],
    code: [
      { lang: 'ts', title: 'UsersPage (smart): signals, computed pipeline, linkedSignal page reset', code: `import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { UsersApi, User } from './users.api';
import { FilterBarComponent } from './filter-bar.component';
import { DataTableComponent, SortState } from './data-table.component';
import { PaginatorComponent } from './paginator.component';

@Component({
  selector: 'app-users-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FilterBarComponent, DataTableComponent, PaginatorComponent],
  template: \`
    <app-filter-bar [value]="query()" (valueChange)="query.set($event)" />
    @if (rows() === undefined) {
      <p aria-live="polite">Loading…</p>
    } @else {
      <app-data-table [rows]="pageRows()" [sort]="sort()" (sortChange)="sort.set($event)" />
      <app-paginator [page]="page()" [pageCount]="pageCount()" [total]="total()" (pageChange)="page.set($event)" />
    }
  \`,
})
export class UsersPageComponent {
  private api = inject(UsersApi);

  // ---- source state ----
  readonly rows = toSignal(this.api.all());                 // undefined until loaded
  readonly query = signal('');
  readonly sort = signal<SortState>({ key: 'name', dir: 'asc' });
  readonly pageSize = signal(10);
  // resets to 1 whenever query or sort change, but the paginator can still set it
  readonly page = linkedSignal({ source: () => [this.query(), this.sort()], computation: () => 1 });

  // ---- derived state ----
  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const all = this.rows() ?? [];
    return q ? all.filter(u => u.name.toLowerCase().includes(q) || u.city.toLowerCase().includes(q)) : all;
  });
  readonly sorted = computed(() => {
    const { key, dir } = this.sort();
    const factor = dir === 'asc' ? 1 : -1;
    return [...this.filtered()].sort((a, b) => {             // copy: sort() mutates
      const x = a[key], y = b[key];
      const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
      return c * factor || a.id - b.id;                       // stable tie-break
    });
  });
  readonly total = computed(() => this.sorted().length);
  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  readonly pageRows = computed(() => {
    const p = Math.min(this.page(), this.pageCount());        // clamp
    const start = (p - 1) * this.pageSize();
    return this.sorted().slice(start, start + this.pageSize());
  });
}` },
      { lang: 'ts', title: 'DataTable (presentational): accessible sortable headers', code: `import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface Row { id: number; name: string; city: string; age: number; }
export type SortKey = 'name' | 'city' | 'age';
export interface SortState { key: SortKey; dir: 'asc' | 'desc'; }

@Component({
  selector: 'app-data-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <table>
      <caption class="visually-hidden">Users</caption>
      <thead>
        <tr>
          @for (col of columns; track col.key) {
            <th scope="col" [attr.aria-sort]="ariaSort(col.key)">
              <button type="button" (click)="toggle(col.key)">
                {{ col.label }}
                @if (sort().key === col.key) { <span aria-hidden="true">{{ sort().dir === 'asc' ? '▲' : '▼' }}</span> }
              </button>
            </th>
          }
        </tr>
      </thead>
      <tbody>
        @for (r of rows(); track r.id) {
          <tr><td>{{ r.name }}</td><td>{{ r.city }}</td><td>{{ r.age }}</td></tr>
        } @empty {
          <tr><td colspan="3">No matching users.</td></tr>
        }
      </tbody>
    </table>
  \`,
})
export class DataTableComponent {
  rows = input.required<Row[]>();
  sort = input.required<SortState>();
  sortChange = output<SortState>();
  readonly columns: { key: SortKey; label: string }[] = [
    { key: 'name', label: 'Name' }, { key: 'city', label: 'City' }, { key: 'age', label: 'Age' },
  ];
  ariaSort(key: SortKey) {
    const s = this.sort();
    return s.key !== key ? 'none' : s.dir === 'asc' ? 'ascending' : 'descending';
  }
  toggle(key: SortKey) {
    const s = this.sort();
    this.sortChange.emit({ key, dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc' });
  }
}` },
      { lang: 'ts', title: 'Infinite scroll: sentinel directive + cursor-paged store', code: `import { Directive, ElementRef, Injectable, inject, output, signal, OnDestroy, AfterViewInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Directive({ selector: '[appInView]' })
export class InViewDirective implements AfterViewInit, OnDestroy {
  appInView = output<void>();
  private el = inject(ElementRef<HTMLElement>);
  private io?: IntersectionObserver;
  ngAfterViewInit() {
    // rootMargin: start loading a bit before the sentinel is actually visible
    this.io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) this.appInView.emit();
    }, { rootMargin: '300px' });
    this.io.observe(this.el.nativeElement);
  }
  ngOnDestroy() { this.io?.disconnect(); }
}

interface Page<T> { items: T[]; nextCursor: string | null; }
export interface Post { id: string; title: string; }

@Injectable()
export class FeedStore {
  private http = inject(HttpClient);
  readonly items = signal<Post[]>([]);
  readonly loading = signal(false);
  readonly error = signal(false);
  private cursor: string | null = '';                       // '' = first page, null = no more
  get done() { return this.cursor === null; }

  loadMore() {
    if (this.loading() || this.cursor === null) return;     // in-flight + end guards
    this.loading.set(true);
    this.error.set(false);
    const url = '/api/posts?limit=20' + (this.cursor ? '&after=' + encodeURIComponent(this.cursor) : '');
    this.http.get<Page<Post>>(url).subscribe({
      next: page => {
        const seen = new Set(this.items().map(p => p.id));   // de-duplicate defensively
        this.items.update(list => [...list, ...page.items.filter(p => !seen.has(p.id))]);
        this.cursor = page.nextCursor;
        this.loading.set(false);
      },
      error: () => { this.error.set(true); this.loading.set(false); },
    });
  }
}
// template:
// @for (p of store.items(); track p.id) { <article>{{ p.title }}</article> }
// @if (!store.done) { <div appInView (appInView)="store.loadMore()"></div>
//   <button type="button" (click)="store.loadMore()" [disabled]="store.loading()">Load more</button> }
// @else { <p>You reached the end.</p> }` },
      { lang: 'js', run: true, title: 'Runnable model: the filter → sort → paginate pipeline with page reset and clamp', code: `const rows = [
  { id: 1, name: 'Anna', city: 'Berlin', age: 31 }, { id: 2, name: 'Ben', city: 'Pune', age: 25 },
  { id: 3, name: 'Chen', city: 'Berlin', age: 42 }, { id: 4, name: 'Dana', city: 'Austin', age: 25 },
  { id: 5, name: 'Eva', city: 'Pune', age: 37 }, { id: 6, name: 'Farid', city: 'Austin', age: 29 },
];
function view({ query = '', key = 'name', dir = 'asc', page = 1, size = 2 }) {
  const q = query.toLowerCase();
  const filtered = rows.filter(r => !q || r.name.toLowerCase().includes(q) || r.city.toLowerCase().includes(q));
  const f = dir === 'asc' ? 1 : -1;
  const sorted = [...filtered].sort((a, b) =>
    (typeof a[key] === 'number' ? a[key] - b[key] : String(a[key]).localeCompare(b[key])) * f || a.id - b.id);
  const pageCount = Math.max(1, Math.ceil(sorted.length / size));
  const p = Math.min(Math.max(1, page), pageCount);          // clamp
  return { total: sorted.length, page: p, pageCount, rows: sorted.slice((p - 1) * size, p * size).map(r => r.name + '(' + r.age + ')') };
}
console.log(view({}));
console.log(view({ key: 'age', dir: 'desc', page: 2 }));
console.log(view({ query: 'pu', page: 3 }));   // page 3 does not exist any more -> clamped` }
    ],
    viz: {
      title: 'Derived state: filter → sort → paginate',
      input: 'filter=e sort=age:desc page=2 size=3',
      inputLabel: 'filter=text sort=name|city|age:asc|desc page=N size=N',
      gen: function (input) {
        var q = parseTableQuery(input), frames = [];
        var cols = ['id', 'name', 'city', 'age'];
        function rowsOf(list) { return list.map(function (r) { return [r.id, r.name, r.city, r.age]; }); }
        frames.push({ narr: 'Source signal <code>rows</code>: 8 users. Everything else will be <code>computed</code> from it plus the UI state signals.', parts: [{ type: 'vars', label: 'state signals', vals: { query: q.filter || "''", sort: q.sort ? q.sort + ' ' + q.dir : 'none', page: q.page, pageSize: q.size } }, { type: 'table', label: 'rows', columns: cols, rows: rowsOf(PEOPLE) }] });
        var filtered = PEOPLE.filter(function (r) { return !q.filter || r.name.toLowerCase().indexOf(q.filter) >= 0 || r.city.toLowerCase().indexOf(q.filter) >= 0; });
        var hl = {}; PEOPLE.forEach(function (r, i) { hl[i] = filtered.indexOf(r) >= 0 ? 'ok' : 'done'; });
        frames.push({ narr: '<code>filtered = computed(...)</code>: keep rows whose name or city contains "' + H.esc(q.filter) + '" → <b>' + filtered.length + '</b> rows. Filter first: it shrinks the work for sorting.', parts: [{ type: 'table', label: 'rows (green = kept)', columns: cols, rows: rowsOf(PEOPLE), hl: hl }] });
        var sorted = filtered.slice();
        if (q.sort) {
          var f = q.dir === 'asc' ? 1 : -1, k = q.sort;
          sorted.sort(function (a, b) { var c = typeof a[k] === 'number' ? a[k] - b[k] : String(a[k]).localeCompare(String(b[k])); return c * f || a.id - b.id; });
        }
        frames.push({ narr: q.sort ? '<code>sorted</code>: copy (<code>[...filtered]</code>) then sort by <b>' + q.sort + ' ' + q.dir + '</b>, ties broken by id so the order is stable across renders.' : 'No sort chosen: keep the filtered order.', parts: [{ type: 'table', label: 'sorted', columns: cols, rows: rowsOf(sorted) }] });
        var pageCount = Math.max(1, Math.ceil(sorted.length / q.size)), p = Math.min(q.page, pageCount);
        frames.push({ narr: '<code>pageCount = ceil(' + sorted.length + ' / ' + q.size + ') = ' + pageCount + '</code>. Requested page ' + q.page + (p !== q.page ? ' does not exist → <b>clamped</b> to ' + p + ' (otherwise the user sees an empty table).' : ' is valid.'), parts: [{ type: 'vars', label: 'paging', vals: { total: sorted.length, pageCount: pageCount, requested: q.page, page: p }, hl: { page: p !== q.page ? 'bad' : 'ok' } }] });
        var start = (p - 1) * q.size, sh = {};
        sorted.forEach(function (r, i) { sh[i] = i >= start && i < start + q.size ? 'sel' : 'done'; });
        frames.push({ narr: '<code>pageRows = sorted.slice(' + start + ', ' + (start + q.size) + ')</code>. Only these rows reach <code>@for (...; track row.id)</code>.', parts: [{ type: 'table', label: 'sorted (purple = this page)', columns: cols, rows: rowsOf(sorted), hl: sh }] });
        frames.push({ narr: 'Now imagine the user types another letter: <code>query</code> changes → <code>linkedSignal</code> resets <code>page</code> to 1 → only the computeds that depend on query re-run. No manual subscriptions, no stale page.', parts: [{ type: 'table', label: 'rendered page ' + p + ' of ' + pageCount, columns: cols, rows: rowsOf(sorted.slice(start, start + q.size)) }] });
        return frames;
      }
    },
    examples: [
      { title: 'Same feature with Angular Material in 30 lines', html: `<p>If Material is allowed, <code>MatTableDataSource</code> does filter/sort/paginate client-side. Know its gotchas: assign <code>sort</code>/<code>paginator</code> after the view exists, and customise <code>filterPredicate</code> / <code>sortingDataAccessor</code> for nested data.</p>`,
        code: { lang: 'ts', code: `import { AfterViewInit, ChangeDetectionStrategy, Component, input, effect, viewChild } from '@angular/core';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';

interface User { id: number; name: string; city: string; age: number; }

@Component({
  selector: 'app-users-mat',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatTableModule, MatSortModule, MatPaginatorModule],
  template: \`
    <input (input)="ds.filter = $any($event.target).value.trim().toLowerCase()" aria-label="Filter users" />
    <table mat-table [dataSource]="ds" matSort>
      <ng-container matColumnDef="name"><th mat-header-cell *matHeaderCellDef mat-sort-header>Name</th><td mat-cell *matCellDef="let u">{{ u.name }}</td></ng-container>
      <ng-container matColumnDef="age"><th mat-header-cell *matHeaderCellDef mat-sort-header>Age</th><td mat-cell *matCellDef="let u">{{ u.age }}</td></ng-container>
      <tr mat-header-row *matHeaderRowDef="cols"></tr>
      <tr mat-row *matRowDef="let row; columns: cols"></tr>
      <tr class="mat-row" *matNoDataRow><td class="mat-cell" colspan="2">No results</td></tr>
    </table>
    <mat-paginator [pageSizeOptions]="[10, 25, 50]" />
  \`,
})
export class UsersMatComponent implements AfterViewInit {
  users = input<User[]>([]);
  cols = ['name', 'age'];
  ds = new MatTableDataSource<User>([]);
  private sort = viewChild.required(MatSort);
  private paginator = viewChild.required(MatPaginator);
  constructor() { effect(() => { this.ds.data = this.users(); }); }
  ngAfterViewInit() { this.ds.sort = this.sort(); this.ds.paginator = this.paginator(); }
}` } },
      { title: 'Server-side table: params signal → debounced, cancellable request', html: `<p>With large data, the component only holds parameters; the API does the work. <code>switchMap</code> cancels the previous request when params change, and <code>debounceTime</code> avoids a request per keystroke.</p>`,
        code: { lang: 'ts', code: `import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, debounceTime, map, of, startWith, switchMap } from 'rxjs';

interface PageResult<T> { items: T[]; total: number; }
interface User { id: number; name: string; }

@Component({ selector: 'app-users-server', template: '' })
export class UsersServerComponent {
  private http = inject(HttpClient);
  query = signal('');
  sort = signal('name,asc');
  page = signal(0);
  private params = computed(() => ({ q: this.query(), sort: this.sort(), page: this.page(), size: 20 }));

  readonly state = toSignal(
    toObservable(this.params).pipe(
      debounceTime(250),
      switchMap(p => this.http.get<PageResult<User>>('/api/users', {
        params: new HttpParams({ fromObject: { q: p.q, sort: p.sort, page: p.page, size: p.size } }),
      }).pipe(
        map(res => ({ status: 'ok' as const, res })),
        startWith({ status: 'loading' as const }),
        catchError(() => of({ status: 'error' as const })),
      )),
    ),
    { initialValue: { status: 'loading' as const } },
  );
}` } },
      { title: 'Grading yourself: what interviewers tick off', html: `${H.table(['Checkpoint', 'Pass looks like'], [
        ['Pipeline order', 'filter → sort → paginate; total and pageCount from filtered data'],
        ['Immutability', 'Copy before sort; never mutate input arrays'],
        ['Edge cases', 'Empty state, last partial page, page reset/clamp, case-insensitive filter, trimmed input'],
        ['Performance', 'OnPush, <code>track row.id</code>, computed (memoised), debounce filter for server mode'],
        ['A11y', '<code>&lt;th scope="col"&gt;</code>, <code>aria-sort</code>, sort buttons not clickable <code>&lt;th&gt;</code>s, labelled filter input, live region for result count'],
        ['Talk', 'When to move server-side, virtual scroll vs pagination, URL sync']
      ])}` }
    ],
    deepDive: `<p>🟣 <b>Why computed and not methods in the template?</b> A method call like <code>{{ pageRows() }}</code> on a plain method runs on every change-detection pass; a <code>computed</code> is memoised and only recalculates when one of its signal dependencies changes, then notifies just the views that read it (and works under zoneless). For 10k rows, sort cost O(n log n) happens once per sort/filter change instead of every tick.</p>
      <p>🟣 <b>Stable sorting.</b> JS sort is stable (ES2019), but sorting by a key with many duplicates still gives an order that depends on the input order; adding <code>|| a.id - b.id</code> makes the result deterministic, which matters for tests and for pagination (rows must not jump between pages). For locale-aware string sorting with many rows, reuse one <code>Intl.Collator</code> (<code>collator.compare</code>) instead of calling <code>localeCompare</code> each time.</p>
      <p>🟣 <b>URL as state.</b> Put <code>q</code>, <code>sort</code>, <code>page</code> in query params: reading them via <code>withComponentInputBinding()</code> inputs and writing with <code>router.navigate([], { queryParams, queryParamsHandling: 'merge', replaceUrl: true })</code>. Then back/forward, refresh and sharing all work. Avoid two sources of truth: either the URL is the source and signals derive from inputs, or signals are the source and an effect writes the URL.</p>
      <p>🟣 <b>Infinite scroll pitfalls.</b> Offset pagination duplicates/skips items when the list changes between requests — cursors fix it. Very long lists need virtualization (<code>cdk-virtual-scroll-viewport</code>), and then the sentinel becomes the viewport's <code>scrolledIndexChange</code> near the end. Restore scroll position on back navigation (<code>withInMemoryScrolling({ scrollPositionRestoration: 'enabled' })</code> plus keeping loaded items in a store). Provide a footer that is reachable (infinite scroll hides footers) and announce new items politely for screen readers.</p>`,
    aiEra: `<p>🤖 "Build a sortable, filterable, paginated table in Angular" is a prompt every AI assistant answers in seconds, which is why interviewers now watch <b>how you verify</b>: do you notice that the generated sort mutates the input, that page is not reset after filtering, that <code>&lt;th (click)&gt;</code> is not keyboard accessible, or that the subscription leaks? In AI-allowed rounds, generate mock data, types and CSS quickly, then spend your time on the pipeline and edge cases, and say so out loud. For production tables, AI is good at writing the server query builder and the pipeline unit tests (property-based tests: "every page has ≤ size rows, the concatenation of all pages equals the sorted list").</p>`,
    problems: [{
      title: 'Paginate a Filtered, Sorted List (with clamp and stable ties)',
      level: 'Easy', tags: ['machine-coding', 'table', 'arrays'], companies: ['Infosys', 'Accenture', 'Zoho'],
      statement: `<p>Write <code>view(rows, { query, key, dir, page, size })</code> returning <code>{ rows, page, pageCount, total }</code>. Filter case-insensitively on <code>name</code>, sort by <code>key</code> (numbers numerically, strings with <code>localeCompare</code>), ties by <code>id</code>, then return the requested page (1-based), clamped into <code>[1, pageCount]</code>. <code>pageCount</code> is at least 1. Do not mutate <code>rows</code>.</p>`,
      constraints: `Up to 10<sup>5</sup> rows → O(n log n).`,
      example: `<p>6 rows, size 2, sort age desc, page 9 → page ${H.c('y', 'clamped to 3')}, last two rows of the sorted list.</p>`,
      brute: { why: `<p>Paginating before sorting returns "the first page, sorted" instead of "the first page of the sorted list". And <code>rows.sort()</code> mutates the caller's array.</p>`,
        code: { lang: 'js', run: true, code: `const rows = [{ id: 1, name: 'b', age: 3 }, { id: 2, name: 'a', age: 9 }, { id: 3, name: 'c', age: 5 }];
const wrong = rows.slice(0, 2).sort((a, b) => b.age - a.age);   // paged first, then sorted: c (age 5) is never seen
console.log(wrong.map(r => r.age), '(should be [9, 5])');` } },
      mcq: { q: 'The user is on page 4 and types a filter that leaves 5 rows (size 10). What should happen?', options: ['Show an empty page 4', 'Reset/clamp to page 1', 'Throw an error'], answer: 1, explain: 'Filters and sorts reset the page; clamping is the safety net for any other path to an invalid page.' },
      hints: [
        `<p>Hint 1: the order is filter → sort (on a copy) → slice.</p>`,
        `<p>Hint 2: comparator: numeric difference or <code>localeCompare</code>, multiplied by ±1, then <code>|| a.id - b.id</code>.</p>`,
        `<p>Hint 3: <code>pageCount = max(1, ceil(total / size))</code>; <code>page = min(max(1, page), pageCount)</code>; slice <code>(page-1)*size</code> to <code>page*size</code>.</p>`
      ],
      solution: {
        approach: `<p>Pure function, exactly the body of the three <code>computed</code>s in the component. Pure → trivially unit-testable.</p>`,
        code: { lang: 'js', run: true, code: `function view(rows, { query = '', key = 'id', dir = 'asc', page = 1, size = 10 } = {}) {
  const q = query.trim().toLowerCase();
  const filtered = q ? rows.filter(r => r.name.toLowerCase().includes(q)) : rows;
  const f = dir === 'desc' ? -1 : 1;
  const sorted = [...filtered].sort((a, b) => {
    const c = typeof a[key] === 'number' ? a[key] - b[key] : String(a[key]).localeCompare(String(b[key]));
    return c * f || a.id - b.id;
  });
  const total = sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / size));
  const p = Math.min(Math.max(1, page), pageCount);
  return { rows: sorted.slice((p - 1) * size, p * size), page: p, pageCount, total };
}
const data = [3, 1, 4, 1, 5, 9].map((age, i) => ({ id: i + 1, name: 'user' + (i + 1), age }));
console.log(view(data, { key: 'age', dir: 'desc', page: 9, size: 2 }));
console.log(view(data, { query: 'USER1', size: 2 }));
console.log(view([], { page: 3 }));
console.log('input untouched:', data.map(d => d.id).join(','));` },
        complexity: `<p>O(n log n) time, O(n) extra memory for the copy.</p>`,
        followUps: ['How would multi-column sort work?', 'How do you test this pipeline with property-based tests?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 8 — Machine coding: wizard, autocomplete, kanban
     ===================================================================== */
  function kanbanMove(board, cardId, toCol, toIdx, limits) {
    var from = null, fromIdx = -1;
    Object.keys(board).forEach(function (c) { var i = board[c].indexOf(cardId); if (i >= 0) { from = c; fromIdx = i; } });
    if (!from) return { board: board, err: 'card ' + cardId + ' not found' };
    if (!board[toCol]) return { board: board, err: 'column ' + toCol + ' not found' };
    if (from !== toCol && limits[toCol] && board[toCol].length >= limits[toCol]) return { board: board, err: toCol + ' is at its WIP limit (' + limits[toCol] + ')' };
    var next = {}; Object.keys(board).forEach(function (c) { next[c] = board[c].slice(); });
    next[from].splice(fromIdx, 1);
    var idx = Math.max(0, Math.min(toIdx, next[toCol].length));
    next[toCol].splice(idx, 0, cardId);
    return { board: next, err: null, from: from, fromIdx: fromIdx, idx: idx };
  }

  topics.push({
    title: 'Machine Coding II: Multi-Step Form Wizard, Autocomplete & Kanban Board (CDK Drag and Drop)',
    analogy: `<p>Three classic party games. The <b>wizard</b> is a passport office with numbered counters: you cannot go to counter 3 until counter 2 stamps your form, but you can walk back and fix a mistake, and the clerk keeps your papers if you step out for coffee. The <b>autocomplete</b> is a helpful shop assistant finishing your sentence — but only after you pause, and forgetting what you said two sentences ago. The <b>kanban board</b> is sticky notes on a wall: you move a note, everybody sees it move at once, and if the office manager says "that column is full", the note goes back.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> After data tables, these three are the most-asked Angular machine-coding builds. Each has one <b>core idea</b> the interviewer is waiting for:</p>
      ${H.table(['Feature', 'Core idea', 'Angular tools'], [
        ['Multi-step wizard', '<b>One form model</b> split into per-step groups; navigation gated by the current step\'s validity; state survives Back', 'Typed reactive forms (<code>FormGroup</code> per step), <code>signal</code> step index, <code>markAllAsTouched</code>, optional <code>CdkStepper</code>/<code>MatStepper</code> with <code>linear</code>, <code>canDeactivate</code> guard, draft in storage'],
        ['Autocomplete', '<b>Latest-wins</b> async search + keyboard navigation + accessible combobox', '<code>valueChanges</code> → <code>debounceTime</code> → <code>distinctUntilChanged</code> → <code>switchMap</code>; <code>MatAutocomplete</code> or CDK Overlay + <code>ActiveDescendantKeyManager</code>'],
        ['Kanban board', '<b>Immutable move</b> of a card between lists + persistence with rollback + keyboard alternative', '<code>@angular/cdk/drag-drop</code>: <code>cdkDropListGroup</code>, <code>cdkDropList</code>, <code>cdkDrag</code>, <code>moveItemInArray</code>, <code>transferArrayItem</code>']
      ])}
      <p>🔵 <b>Wizard structure.</b> <code>WizardPage</code> (smart) owns <code>form = fb.group({ account: fb.group(...), address: fb.group(...), payment: fb.group(...) })</code> and <code>step = signal(0)</code>. Each step component receives its sub-group as input (<code>[group]="form.controls.address"</code>) — a presentational step that only renders controls. <b>Next</b>: if the current group is invalid, <code>markAllAsTouched()</code> and stop; else <code>step.update(s =&gt; s + 1)</code>. <b>Back</b> never validates. <b>Submit</b> on the last step sends <code>form.getRawValue()</code>. Cross-step rules (e.g. shipping country affects payment methods) use <code>computed</code> from <code>toSignal(group.valueChanges)</code> or a validator on the parent group. Persist a draft (debounced <code>valueChanges</code> → <code>sessionStorage</code>) and warn on leave.</p>
      <p>🔵 <b>Autocomplete details.</b> Ignore queries shorter than 2 characters; show loading/empty/error states; highlight the matched part <b>without</b> <code>innerHTML</code> (split the string into parts and wrap the match in <code>&lt;mark&gt;</code> in the template); on select, set the control value to the object and use <code>displayWith</code> to show its label; cache results per query if the API is slow.</p>
      <p>🔵 <b>Kanban details.</b> CDK's <code>moveItemInArray</code> and <code>transferArrayItem</code> <b>mutate</b> arrays. With signals, copy first (or write your own immutable move) and <code>set</code> a new board object, otherwise OnPush/signal consumers do not notice. Persist with an optimistic update: apply locally, call the API, roll back on error with a toast. Add keyboard support ("Move to…" menu or arrow-key handlers) because drag and drop alone is not accessible.</p>`,
    clues: [
      '"Multi-step signup / checkout form" → one FormGroup with nested groups per step, step signal, validate current step on Next',
      '"Back must keep what I typed" → do not destroy the model: keep the form in the parent, steps only render it',
      '"Search as you type with suggestions" → debounce + distinctUntilChanged + switchMap, min length, combobox ARIA, keyboard',
      '"Trello-like board" → CDK drag-drop lists connected by <code>cdkDropListGroup</code>, immutable updates, optimistic save',
      '"WIP limit / some columns refuse cards" → <code>cdkDropListEnterPredicate</code> or reject in the drop handler',
      '"Drag and drop must be accessible" → keyboard move actions + live-region announcements'
    ],
    code: [
      { lang: 'ts', title: 'Wizard (smart parent): one typed form, step gating, draft persistence', code: `import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { JsonPipe } from '@angular/common';
import { debounceTime } from 'rxjs';

const DRAFT_KEY = 'signup-draft';

@Component({
  selector: 'app-signup-wizard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, JsonPipe],
  template: \`
    <ol class="steps" aria-label="Progress">
      @for (label of labels; track label; let i = $index) {
        <li [attr.aria-current]="i === step() ? 'step' : null" [class.done]="i < step()">{{ label }}</li>
      }
    </ol>

    <form [formGroup]="form" (ngSubmit)="submit()">
      @switch (step()) {
        @case (0) {
          <fieldset formGroupName="account">
            <legend>Account</legend>
            <label>Email <input type="email" formControlName="email" autocomplete="email" /></label>
            @if (form.controls.account.controls.email.touched && form.controls.account.controls.email.invalid) {
              <p class="error" role="alert">Enter a valid email.</p>
            }
            <label>Password <input type="password" formControlName="password" autocomplete="new-password" /></label>
          </fieldset>
        }
        @case (1) {
          <fieldset formGroupName="address">
            <legend>Address</legend>
            <label>Street <input formControlName="street" autocomplete="street-address" /></label>
            <label>Postcode <input formControlName="zip" autocomplete="postal-code" /></label>
          </fieldset>
        }
        @case (2) {
          <section aria-labelledby="review-h">
            <h3 id="review-h">Review</h3>
            <pre>{{ form.getRawValue() | json }}</pre>
          </section>
        }
      }
      <div class="actions">
        <button type="button" (click)="back()" [disabled]="step() === 0">Back</button>
        @if (isLast()) { <button type="submit">Create account</button> }
        @else { <button type="button" (click)="next()">Next</button> }
      </div>
    </form>
  \`,
})
export class SignupWizardComponent {
  private fb = inject(NonNullableFormBuilder);
  readonly labels = ['Account', 'Address', 'Review'];
  readonly step = signal(0);
  readonly isLast = computed(() => this.step() === this.labels.length - 1);

  readonly form = this.fb.group({
    account: this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
    }),
    address: this.fb.group({
      street: ['', Validators.required],
      zip: ['', [Validators.required, Validators.pattern(/^\\d{5}$/)]],
    }),
  });
  private readonly stepGroups = [this.form.controls.account, this.form.controls.address];

  constructor() {
    // restore and autosave a draft (never store the password)
    const saved = sessionStorage.getItem(DRAFT_KEY);
    if (saved) this.form.patchValue(JSON.parse(saved));
    this.form.valueChanges.pipe(debounceTime(500), takeUntilDestroyed(inject(DestroyRef))).subscribe(() => {
      const { account, address } = this.form.getRawValue();
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ account: { email: account.email }, address }));
    });
  }

  next() {
    const group = this.stepGroups[this.step()];
    if (group && group.invalid) { group.markAllAsTouched(); return; }   // gate only the current step
    this.step.update(s => Math.min(s + 1, this.labels.length - 1));
  }
  back() { this.step.update(s => Math.max(0, s - 1)); }               // never validates
  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    console.log('POST /api/signup', this.form.getRawValue());
    sessionStorage.removeItem(DRAFT_KEY);
  }
}` },
      { lang: 'ts', title: 'Kanban with CDK drag-drop, signals, immutable moves and optimistic save', code: `import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDropList, CdkDropListGroup, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { HttpClient } from '@angular/common/http';

interface Card { id: string; title: string; }
type ColumnId = 'backlog' | 'doing' | 'done';
type Board = Record<ColumnId, Card[]>;

@Component({
  selector: 'app-kanban',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CdkDropListGroup, CdkDropList, CdkDrag],
  template: \`
    <div class="board" cdkDropListGroup>
      @for (col of columns; track col) {
        <section class="column" [attr.aria-label]="col">
          <h3>{{ col }} ({{ board()[col].length }})</h3>
          <ul cdkDropList [id]="col" [cdkDropListData]="col" (cdkDropListDropped)="drop($event)">
            @for (card of board()[col]; track card.id) {
              <li cdkDrag [cdkDragData]="card">
                {{ card.title }}
                <!-- keyboard alternative to dragging -->
                @if (col !== 'done') {
                  <button type="button" (click)="moveTo(card, col, next(col))" [attr.aria-label]="'Move ' + card.title + ' to ' + next(col)">→</button>
                }
              </li>
            }
          </ul>
        </section>
      }
    </div>
  \`,
})
export class KanbanComponent {
  private http = inject(HttpClient);
  private announcer = inject(LiveAnnouncer);
  readonly columns: ColumnId[] = ['backlog', 'doing', 'done'];
  readonly board = signal<Board>({
    backlog: [{ id: 'a', title: 'Write spec' }, { id: 'b', title: 'Design API' }],
    doing: [{ id: 'c', title: 'Build table' }],
    done: [],
  });

  next(col: ColumnId): ColumnId { return col === 'backlog' ? 'doing' : 'done'; }

  drop(e: CdkDragDrop<ColumnId>) {
    this.apply(e.previousContainer.data, e.container.data, e.previousIndex, e.currentIndex);
  }
  moveTo(card: Card, from: ColumnId, to: ColumnId) {
    const fromIdx = this.board()[from].findIndex(c => c.id === card.id);
    this.apply(from, to, fromIdx, this.board()[to].length);
  }

  private apply(from: ColumnId, to: ColumnId, fromIdx: number, toIdx: number) {
    const before = this.board();
    // copy the affected arrays first: CDK helpers mutate in place
    const next: Board = { ...before, [from]: [...before[from]], [to]: [...before[to]] };
    if (from === to) moveItemInArray(next[to], fromIdx, toIdx);
    else transferArrayItem(next[from], next[to], fromIdx, toIdx);
    this.board.set(next);                                     // optimistic
    const card = next[to][toIdx];
    this.announcer.announce(card.title + ' moved to ' + to);
    this.http.patch('/api/cards/' + card.id, { column: to, index: toIdx }).subscribe({
      error: () => { this.board.set(before); this.announcer.announce('Move failed, card returned'); },
    });
  }
}` },
      { lang: 'js', run: true, title: 'Runnable model: immutable kanban move with WIP limit and rollback', code: `function move(board, cardId, toCol, toIdx, limits = {}) {
  const from = Object.keys(board).find(c => board[c].includes(cardId));
  if (!from) throw new Error('no card ' + cardId);
  if (from !== toCol && limits[toCol] && board[toCol].length >= limits[toCol]) return { board, rejected: toCol + ' is full' };
  const next = { ...board, [from]: board[from].filter(id => id !== cardId) };
  const target = from === toCol ? next[from] : [...board[toCol]];
  target.splice(Math.min(toIdx, target.length), 0, cardId);
  next[toCol] = target;
  return { board: next };
}

let board = { backlog: ['a', 'b'], doing: ['c'], done: [] };
const limits = { doing: 2 };
const before = board;
board = move(board, 'a', 'doing', 0, limits).board;
console.log(JSON.stringify(board));
console.log(move(board, 'b', 'doing', 0, limits).rejected);   // WIP limit
console.log('old object untouched (rollback is just set(before)):', JSON.stringify(before));` }
    ],
    viz: {
      title: 'Kanban moves: immutable update, WIP limit, rollback',
      input: 'a>doing:0 b>doing:1 c>done:0 b>backlog:0 d>done:5',
      inputLabel: 'moves card>column:index (cards a b c d e; columns backlog doing done; doing has WIP limit 2)',
      gen: function (input) {
        var moves = words(input, 8, 'Write moves like a>doing:0');
        var board = { backlog: ['a', 'b', 'd'], doing: ['c'], done: ['e'] }, limits = { doing: 2 };
        function grid(b, hl) {
          var rows = ['backlog', 'doing', 'done'].map(function (c) { var r = b[c].slice(); while (r.length < 4) r.push(''); return r.slice(0, 4); });
          return { type: 'grid', label: 'board signal', rows: rows, rowHead: ['backlog', 'doing (max 2)', 'done'], colHead: ['0', '1', '2', '3'], hl: hl || {} };
        }
        var frames = [{ narr: 'Initial <code>board</code> signal. Each move creates <b>new arrays</b> for the changed columns, so <code>board.set(next)</code> notifies the view; the old object stays intact for rollback.', parts: [grid(board)] }];
        var rowIdx = { backlog: 0, doing: 1, done: 2 };
        moves.forEach(function (m, n) {
          var mm = /^([a-e])>(backlog|doing|done):(\d+)$/.exec(m);
          if (!mm) throw new Error('Bad move "' + m + '". Use card>column:index, e.g. a>doing:0');
          var r = kanbanMove(board, mm[1], mm[2], parseInt(mm[3], 10), limits);
          if (r.err) {
            frames.push({ narr: 'Move ' + (n + 1) + ': <code>' + H.esc(m) + '</code> → <b>rejected</b>: ' + H.esc(r.err) + '. In CDK this is <code>cdkDropListEnterPredicate</code> returning false (the card snaps back) or the drop handler ignoring it.', parts: [grid(board, {})] });
            return;
          }
          var hl = {}; hl[rowIdx[mm[2]] + ',' + r.idx] = 'ok';
          var sameCol = r.from === mm[2];
          frames.push({ narr: 'Move ' + (n + 1) + ': card <b>' + mm[1] + '</b> from <code>' + r.from + '[' + r.fromIdx + ']</code> to <code>' + mm[2] + '[' + r.idx + ']</code>' + (r.idx !== parseInt(mm[3], 10) ? ' (index clamped to the end of the list)' : '') + '. ' + (sameCol ? 'Same list → <code>moveItemInArray</code> on a copy.' : 'Different lists → <code>transferArrayItem</code> on copies of both.') + ' Optimistic: the UI updates now, the PATCH goes out in the background.', parts: [grid(r.board, hl)] });
          if (n === 1) {
            frames.push({ narr: 'Suppose this PATCH failed (500). Because we kept <code>before</code>, rollback is just <code>board.set(before)</code> plus an announcement via <code>LiveAnnouncer</code>. (In this demo we keep the move so you can continue.)', parts: [grid(board, {}), { type: 'text', label: 'toast', html: 'Move failed, card returned.' }] });
          }
          board = r.board;
        });
        frames.push({ narr: 'Final board. Persisting order: send <code>{ column, index }</code> (or a fractional rank like "between b and c") so concurrent users can merge moves.', parts: [grid(board)] });
        return pad4(frames);
      }
    },
    examples: [
      { title: 'Autocomplete with MatAutocomplete: latest-wins, displayWith, safe highlight', html: `<p>The control holds either the typed string or the selected object. <code>displayWith</code> shows the label. Highlighting splits text into parts so no HTML string is ever built.</p>`,
        code: { lang: 'ts', code: `import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { toSignal } from '@angular/core/rxjs-interop';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, debounceTime, distinctUntilChanged, filter, map, of, startWith, switchMap } from 'rxjs';

interface City { id: number; name: string; country: string; }

@Component({
  selector: 'app-city-autocomplete',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatAutocompleteModule, MatInputModule],
  template: \`
    <mat-form-field>
      <mat-label>City</mat-label>
      <input matInput [formControl]="ctrl" [matAutocomplete]="auto" />
      <mat-autocomplete #auto="matAutocomplete" [displayWith]="label" autoActiveFirstOption>
        @for (c of results(); track c.id) {
          <mat-option [value]="c">
            @for (part of split(c.name); track $index) {
              @if (part.hit) { <mark>{{ part.text }}</mark> } @else { {{ part.text }} }
            }
            <small>, {{ c.country }}</small>
          </mat-option>
        } @empty {
          @if (term().length >= 2) { <mat-option disabled>No cities found</mat-option> }
        }
      </mat-autocomplete>
    </mat-form-field>
  \`,
})
export class CityAutocompleteComponent {
  private http = inject(HttpClient);
  readonly ctrl = new FormControl<string | City>('', { nonNullable: true });
  private term$ = this.ctrl.valueChanges.pipe(
    startWith(''),
    filter((v): v is string => typeof v === 'string'),   // ignore the selected object
    map(v => v.trim()),
  );
  readonly term = toSignal(this.term$, { initialValue: '' });
  readonly results = toSignal(this.term$.pipe(
    debounceTime(250),
    distinctUntilChanged(),
    switchMap(q => q.length < 2 ? of([]) :
      this.http.get<City[]>('/api/cities', { params: new HttpParams().set('q', q) }).pipe(catchError(() => of([])))),
  ), { initialValue: [] as City[] });

  label = (c: City | string | null) => (typeof c === 'string' ? c : c?.name ?? '');
  split(text: string) {
    const q = this.term().toLowerCase(), i = q ? text.toLowerCase().indexOf(q) : -1;
    if (i < 0) return [{ text, hit: false }];
    return [
      { text: text.slice(0, i), hit: false },
      { text: text.slice(i, i + q.length), hit: true },
      { text: text.slice(i + q.length), hit: false },
    ];
  }
}` } },
      { title: 'Wizard: route per step or one component?', html: `${H.table(['', 'One component + step signal', 'Child route per step (/signup/address)'], [
        ['Back button / deep link', 'Back leaves the wizard (unless you sync step to a query param)', 'Browser Back moves between steps; refresh keeps the step'],
        ['Form state', 'Lives in the component', 'Must live in a service provided on the parent route'],
        ['Guards', 'Manual checks', '<code>canActivate</code> per step: block /payment until address is valid'],
        ['Good for', '60-minute interview, small wizards', 'Real checkout flows, analytics per step']
      ])}<p>In an interview, start with the single component and <b>say</b> how you would move to routes.</p>` },
      { title: 'Making drag and drop accessible', html: `<ul><li>Every draggable card has a keyboard path: "Move to ▸" menu or <kbd>Space</kbd> to pick up, arrows to move, <kbd>Space</kbd> to drop.</li><li>Announce results with <code>LiveAnnouncer</code> ("Build table moved to Done, position 1 of 3").</li><li>Use <code>cdkDragHandle</code> so inner buttons stay clickable; set <code>cdkDragLockAxis</code> for single lists.</li><li>Respect <code>prefers-reduced-motion</code> for the drop animation (<code>.cdk-drag-animating</code> transition).</li><li>For big boards, CDK drag-drop works with virtual scrolling only with care; paginate columns or collapse them.</li></ul>` }
    ],
    deepDive: `<p>🟣 <b>Wizard validation timing.</b> Disabled groups are excluded from validity and <code>value</code>, which you can use to skip optional steps (disable the "company" group when the user picks "private person"). For async validators (email taken) the group can be <code>PENDING</code>; Next should wait (<code>statusChanges.pipe(filter(s =&gt; s !== 'PENDING'), take(1))</code>) or be disabled while pending. On submit, server errors should map back onto controls (<code>setErrors({ server: msg })</code>) and jump to the first step that has an error.</p>
      <p>🟣 <b>Signal Forms.</b> Angular 21 introduced experimental <b>Signal Forms</b> (<code>form()</code> over a signal model with schema-based validation). For interviews on Angular 17–20, reactive forms remain the expected answer; mention Signal Forms as the direction, not as production advice.</p>
      <p>🟣 <b>Autocomplete correctness.</b> <code>switchMap</code> guarantees the last query wins, but the server may still be hit for each debounced term; add client caching (<code>Map&lt;string, City[]&gt;</code>) and abort via HttpClient unsubscription (the fetch backend aborts the request). Handle IME composition (Japanese/Chinese input) — <code>valueChanges</code> during composition can fire with partial characters; Material's input handles this. Combobox ARIA: <code>role="combobox"</code>, <code>aria-expanded</code>, <code>aria-controls</code>, <code>aria-activedescendant</code>, options with <code>role="option"</code>; <code>MatAutocomplete</code> sets them for you.</p>
      <p>🟣 <b>Kanban ordering at scale.</b> Saving indexes means every move rewrites positions of many cards. Production boards use <b>fractional indexing</b> (rank strings like "a0", "a0V", "a1") so a move updates only the moved card, and concurrent moves rarely conflict. Real-time collaboration adds WebSocket/SSE updates; incoming moves are applied to the signal the same immutable way, and an in-progress drag must not be disrupted (queue remote updates until drop).</p>
      <p>🟣 <b>CDK drag-drop internals.</b> The CDK listens to pointer events, renders a <b>preview</b> (clone following the pointer) and a <b>placeholder</b> (gap in the list), computes the target index from sibling client rects (cached at drag start, so call <code>cdkDropList</code>'s auto-scroll and avoid layout changes during drag), and emits <code>cdkDropListDropped</code> with <code>previousIndex</code>/<code>currentIndex</code>/containers. It never changes your data — you do.</p>`,
    aiEra: `<p>🤖 These three builds are in every AI assistant's training data, so AI-generated versions are fast and <b>subtly wrong</b> in recognisable ways: wizards that lose data on Back because each step owns its own form; autocompletes using <code>mergeMap</code> (out-of-order results) or <code>[innerHTML]</code> for highlighting (XSS); kanbans calling <code>transferArrayItem</code> directly on signal arrays (no UI update under OnPush/zoneless) and no keyboard path. In interviews, explicitly name these traps as you code — that is now the differentiator. For take-home tasks, AI-written Playwright tests for the happy path plus your own tests for the traps (Back keeps data, last query wins, failed move rolls back) make a strong submission.</p>`,
    problems: [{
      title: 'Wizard Navigator: Gate Next on the Current Step Only',
      level: 'Medium', tags: ['machine-coding', 'forms', 'state'], companies: ['Salesforce', 'Intuit', 'ServiceNow'],
      statement: `<p>Model a wizard as <code>steps = [{ name, valid, skip? }]</code>. Implement <code>createWizard(steps)</code> with <code>next()</code>, <code>back()</code>, <code>goTo(i)</code> and <code>current</code>. <code>next()</code> moves to the next non-skipped step only if the current step is valid (otherwise returns <code>{ blocked: name }</code>). <code>back()</code> always moves to the previous non-skipped step. <code>goTo(i)</code> is allowed only if every non-skipped step before <code>i</code> is valid (clicking a later step in the progress bar).</p>`,
      constraints: `Up to 20 steps; validity can change between calls (it is read live).`,
      example: `<p>Steps account(valid), company(skip), address(invalid), review. <code>next()</code> → ${H.c('g', 'address')} (company skipped). <code>next()</code> → ${H.c('r', '{ blocked: address }')}. <code>goTo(3)</code> → ${H.c('r', 'refused')}.</p>`,
      brute: { why: `<p>Validating the <b>whole</b> form on every Next blocks the user on step 1 because step 3 is still empty. Not handling skipped steps lands the user on an invisible step.</p>`,
        code: { lang: 'js', run: true, code: `const steps = [{ name: 'account', valid: true }, { name: 'address', valid: false }, { name: 'review', valid: true }];
let current = 0;
function nextBrute() { if (steps.every(s => s.valid)) current++; else return 'blocked'; }
console.log(nextBrute(), '<- blocked on step 1 although account is valid');` } },
      mcq: { q: 'The user is on step 2 and presses Back while step 2 is invalid. What should happen?', options: ['Block until step 2 is valid', 'Go back; Back never validates', 'Reset step 2'], answer: 1, explain: 'Users must be able to go back to fix earlier answers. Only forward movement is gated.' },
      hints: [
        `<p>Hint 1: write a helper <code>nextIndex(from, dir)</code> that skips steps with <code>skip: true</code>.</p>`,
        `<p>Hint 2: <code>next()</code> checks only <code>steps[current].valid</code>; <code>back()</code> checks nothing.</p>`,
        `<p>Hint 3: <code>goTo(i)</code>: allow if <code>i &lt;= current</code>, or if every non-skipped step in <code>[0, i)</code> is valid.</p>`
      ],
      solution: {
        approach: `<p>Navigation logic is pure state; keep it out of the template so it is testable. Skips are handled in one helper; gates are per-direction.</p>`,
        code: { lang: 'js', run: true, code: `function createWizard(steps) {
  const w = { current: 0 };
  const nextIndex = (from, dir) => {
    for (let i = from + dir; i >= 0 && i < steps.length; i += dir) if (!steps[i].skip) return i;
    return from;
  };
  w.next = () => {
    if (!steps[w.current].valid) return { blocked: steps[w.current].name };
    w.current = nextIndex(w.current, 1);
    return { at: steps[w.current].name };
  };
  w.back = () => { w.current = nextIndex(w.current, -1); return { at: steps[w.current].name }; };
  w.goTo = i => {
    const ok = i <= w.current || steps.slice(0, i).every(s => s.skip || s.valid);
    if (ok && !steps[i].skip) w.current = i;
    return ok ? { at: steps[w.current].name } : { refused: steps[i].name };
  };
  return w;
}
const steps = [{ name: 'account', valid: true }, { name: 'company', skip: true }, { name: 'address', valid: false }, { name: 'review', valid: true }];
const w = createWizard(steps);
console.log(w.next(), w.next(), w.goTo(3));
steps[2].valid = true;
console.log(w.next(), w.back(), w.back(), w.goTo(3));` },
        complexity: `<p>O(n) per call. In Angular, <code>valid</code> is <code>group.valid</code> of each step's FormGroup and <code>current</code> is a signal.</p>`,
        followUps: ['How would you sync the step with a ?step= query param?', 'How do async validators (PENDING) change next()?']
      }
    }]
  });

  /* =====================================================================
     PRACTICE ARENA
     ===================================================================== */
  practice.push({
    title: 'Smart or Presentational?',
    level: 'Easy', tags: ['architecture', 'components'], companies: ['TCS', 'Capgemini', 'Cognizant'],
    statement: `<p>Each component is described as <code>{ name, injects: [...], inputs: n, outputs: n }</code>. Classify it: <b>smart</b> if it injects any data/state token (<code>HttpClient</code>, <code>Store</code>, <code>Router</code>, <code>ActivatedRoute</code>, or any name ending in <code>Facade</code>, <code>Store</code> or <code>Api</code>), otherwise <b>presentational</b>. Flag as <b>suspicious</b> a presentational component with zero inputs and zero outputs (it probably does nothing reusable) and a smart component that lives in a <code>ui-</code> library (name starts with <code>ui-</code>).</p>`,
    constraints: `Up to 1 000 components.`,
    example: `<p><code>{ name: 'ui-card', injects: ['BookingFacade'] }</code> → ${H.c('r', 'smart + suspicious (smart in ui lib)')}. <code>{ name: 'ui-badge', injects: ['ElementRef'], inputs: 1 }</code> → ${H.c('g', 'presentational')}.</p>`,
    brute: { why: `<p>Counting inputs ("many inputs = presentational") says nothing about data access: a component with 5 inputs that also injects <code>HttpClient</code> is smart, and hard to reuse.</p>`,
      code: { lang: 'js', run: true, code: `const c = { name: 'ui-card', injects: ['HttpClient'], inputs: 5, outputs: 1 };
console.log(c.inputs > 2 ? 'presentational' : 'smart', '<- wrong: it injects HttpClient');` } },
    mcq: { q: 'Which injection keeps a component presentational?', options: ['<code>HttpClient</code>', '<code>ElementRef</code> for focusing an element', '<code>Store</code>'], answer: 1, explain: 'DOM helpers like ElementRef, Renderer2 or DestroyRef are UI concerns, not data/state access.' },
    hints: [
      `<p>Hint 1: write <code>isDataToken(name)</code> from a set plus three suffix checks.</p>`,
      `<p>Hint 2: <code>smart = injects.some(isDataToken)</code>.</p>`,
      `<p>Hint 3: build the flags list separately: smart in ui- library; presentational with no API.</p>`
    ],
    solution: {
      approach: `<p>A data-access test on injected tokens decides the kind; two extra rules flag likely architecture smells.</p>`,
      code: { lang: 'js', run: true, code: `const DATA = new Set(['HttpClient', 'Store', 'Router', 'ActivatedRoute']);
const isData = t => DATA.has(t) || /(Facade|Store|Api)$/.test(t);
function classify(c) {
  const smart = (c.injects || []).some(isData);
  const flags = [];
  if (smart && c.name.startsWith('ui-')) flags.push('smart component in ui library');
  if (!smart && !c.inputs && !c.outputs) flags.push('no inputs or outputs');
  return { name: c.name, kind: smart ? 'smart' : 'presentational', flags };
}
[
  { name: 'ui-card', injects: ['BookingFacade'], inputs: 1 },
  { name: 'ui-badge', injects: ['ElementRef'], inputs: 1 },
  { name: 'booking-search-page', injects: ['BookingFacade', 'Router'] },
  { name: 'ui-divider', injects: [] },
].forEach(c => console.log(JSON.stringify(classify(c))));` },
      complexity: `<p>O(total injected tokens). Real tools (ESLint rules, Nx boundaries) enforce the same idea at import level.</p>`
    }
  });

  practice.push({
    title: 'Should HttpClient Attach the XSRF Header?',
    level: 'Easy', tags: ['security', 'xsrf', 'http'], companies: ['Okta', 'JPMorgan', 'Barclays'],
    statement: `<p>Implement <code>attachXsrf(method, url, cookies)</code> mimicking Angular's default interceptor: return the header object <code>{ 'X-XSRF-TOKEN': token }</code> when the method is <b>not</b> GET or HEAD, the URL is <b>relative</b> (does not start with <code>http://</code>, <code>https://</code> or <code>//</code>), and cookie <code>XSRF-TOKEN</code> exists; otherwise return <code>{}</code>. Methods are case-insensitive.</p>`,
    constraints: `<code>cookies</code> is a <code>document.cookie</code>-style string like <code>"a=1; XSRF-TOKEN=abc"</code>.`,
    example: `<p><code>('POST', '/api/orders', 'XSRF-TOKEN=k1')</code> → ${H.c('g', "{ 'X-XSRF-TOKEN': 'k1' }")}. <code>('GET', ...)</code> → ${H.c('m', '{}')}. <code>('POST', 'https://other.com/x', ...)</code> → ${H.c('m', '{}')} (never leak the token).</p>`,
    brute: { why: `<p>Attaching the token to every request leaks it to third-party domains and adds noise to GETs, which should be safe (no side effects) anyway.</p>`,
      code: { lang: 'js', run: true, code: `const attachAll = (m, u, c) => ({ 'X-XSRF-TOKEN': (c.match(/XSRF-TOKEN=([^;]+)/) || [])[1] });
console.log(attachAll('POST', 'https://evil.example/collect', 'XSRF-TOKEN=k1'), '<- token leaked');` } },
    mcq: { q: 'Why can an attacker site not forge the X-XSRF-TOKEN header?', options: ['Browsers block all cross-site POSTs', 'It cannot read your site\'s cookie, so it does not know the value', 'Angular encrypts the header'], answer: 1, explain: 'The same-origin policy prevents other origins from reading your cookies. Cookies are still sent automatically, which is why the header (not the cookie) is the proof.' },
    hints: [
      `<p>Hint 1: normalise the method to upper case and exit early for GET and HEAD.</p>`,
      `<p>Hint 2: absolute URLs match <code>/^(https?:)?\\/\\//i</code>.</p>`,
      `<p>Hint 3: parse cookies by splitting on <code>;</code>, trimming, splitting at the first <code>=</code>, and <code>decodeURIComponent</code> the value.</p>`
    ],
    solution: {
      approach: `<p>Three guards, then cookie lookup. Matches Angular's <code>HttpXsrfInterceptor</code> behaviour for the default configuration.</p>`,
      code: { lang: 'js', run: true, code: `function readCookie(cookies, name) {
  for (const part of cookies.split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}
function attachXsrf(method, url, cookies, cookieName = 'XSRF-TOKEN', headerName = 'X-XSRF-TOKEN') {
  const m = method.toUpperCase();
  if (m === 'GET' || m === 'HEAD') return {};
  if (/^(https?:)?\\/\\//i.test(url)) return {};
  const token = readCookie(cookies, cookieName);
  return token ? { [headerName]: token } : {};
}
console.log(attachXsrf('post', '/api/orders', 'theme=dark; XSRF-TOKEN=k%201'));
console.log(attachXsrf('GET', '/api/orders', 'XSRF-TOKEN=k1'));
console.log(attachXsrf('DELETE', '//cdn.other.com/x', 'XSRF-TOKEN=k1'));
console.log(attachXsrf('PUT', 'api/me', 'other=1'));` },
      complexity: `<p>O(cookie length). The server half — comparing header and cookie/session — is the part that actually blocks attacks.</p>`
    }
  });

  practice.push({
    title: 'Pick the ICU Plural Branch',
    level: 'Easy', tags: ['i18n', 'icu'], companies: ['Booking.com', 'Airbnb'],
    statement: `<p>Given an ICU plural message parsed into branches, e.g. <code>{ '=0': 'Your cart is empty', '=1': 'One item', one: '# item', other: '# items' }</code>, and a count, return the text: an <b>exact match</b> <code>=n</code> wins first, otherwise the <b>plural category</b> from <code>Intl.PluralRules(locale)</code>, otherwise <code>other</code>. Replace <code>#</code> with the number formatted for the locale.</p>`,
    constraints: `Locales supported by <code>Intl</code>; counts 0..10<sup>9</sup>.`,
    example: `<p>en, 0 → ${H.c('g', 'Your cart is empty')}; en, 1 → ${H.c('g', 'One item')}; en, 1200 → ${H.c('g', '1,200 items')}; de, 1200 → ${H.c('g', '1.200 items')}.</p>`,
    brute: { why: `<p><code>count === 1 ? one : other</code> is English-only; Polish, Russian and Arabic have more categories, and exact <code>=0</code> messages are ignored.</p>`,
      code: { lang: 'js', run: true, code: `const b = { '=0': 'Your cart is empty', other: '# items' };
console.log((0 === 1 ? b.one : b.other).replace('#', 0), '<- should say empty');` } },
    mcq: { q: 'In Angular templates, where does ICU plural logic run with build-time i18n?', options: ['On the server only', 'At runtime in the browser, choosing the branch for the current count', 'Nowhere, Angular does not support plurals'], answer: 1, explain: 'Translations are inlined at build time, but the branch is selected at runtime because the count is only known then.' },
    hints: [
      `<p>Hint 1: check <code>branches['=' + count]</code> first.</p>`,
      `<p>Hint 2: <code>new Intl.PluralRules(locale).select(count)</code> returns zero/one/two/few/many/other.</p>`,
      `<p>Hint 3: fall back to <code>other</code>; format <code>#</code> with <code>Intl.NumberFormat(locale)</code>.</p>`
    ],
    solution: {
      approach: `<p>Exact → category → other, then number formatting. This is exactly the ICU algorithm Angular's runtime uses for <code>{n, plural, ...}</code>.</p>`,
      code: { lang: 'js', run: true, code: `function icuPlural(branches, count, locale = 'en') {
  const exact = branches['=' + count];
  const cat = new Intl.PluralRules(locale).select(count);
  const text = exact ?? branches[cat] ?? branches.other;
  return text.replace(/#/g, new Intl.NumberFormat(locale).format(count));
}
const cart = { '=0': 'Your cart is empty', '=1': 'One item', one: '# item', other: '# items' };
for (const n of [0, 1, 2, 1200]) console.log('en', n, '->', icuPlural(cart, n));
console.log('de 1200 ->', icuPlural(cart, 1200, 'de'));
const pl = { one: '# plik', few: '# pliki', many: '# plików', other: '# pliku' };
for (const n of [1, 3, 5, 22]) console.log('pl', n, '->', icuPlural(pl, n, 'pl'));` },
      complexity: `<p>O(1) per call; cache <code>PluralRules</code>/<code>NumberFormat</code> instances in hot paths.</p>`
    }
  });

  practice.push({
    title: 'Paginator Label and Page Buttons',
    level: 'Easy', tags: ['machine-coding', 'pagination'], companies: ['Zoho', 'Freshworks', 'Wipro'],
    statement: `<p>Write <code>paginator(total, page, size, window = 5)</code> returning <code>{ label, pages }</code>. <code>label</code> is like <code>"11–20 of 47"</code> (or <code>"0 of 0"</code> when empty). <code>pages</code> is at most <code>window</code> page numbers centred on the current page, shifted to stay within <code>[1, pageCount]</code>, with <code>'…'</code> markers plus first/last pages when they are not included.</p>`,
    constraints: `total up to 10<sup>9</sup>; page is 1-based and already valid.`,
    example: `<p><code>(47, 2, 10)</code> → ${H.c('g', '"11–20 of 47", [1,2,3,4,5]')}. <code>(1000, 50, 10)</code> → ${H.c('g', '"491–500 of 1000", [1,"…",48,49,50,51,52,"…",100]')}.</p>`,
    brute: { why: `<p>Rendering a button for every page gives 100 000 buttons for a big table, and <code>page*size</code> as the label end overshoots on the last page ("41–50 of 47").</p>`,
      code: { lang: 'js', run: true, code: `const total = 47, page = 5, size = 10;
console.log(((page - 1) * size + 1) + '–' + (page * size) + ' of ' + total, '<- end overshoots');` } },
    mcq: { q: 'On the last page of 47 rows (size 10), what is the correct label?', options: ['41–50 of 47', '41–47 of 47', '40–47 of 47'], answer: 1, explain: 'End = min(page × size, total).' },
    hints: [
      `<p>Hint 1: start = (page−1)·size + 1, end = min(page·size, total).</p>`,
      `<p>Hint 2: window start = clamp(page − ⌊window/2⌋, 1, max(1, pageCount − window + 1)).</p>`,
      `<p>Hint 3: add 1 and '…' in front if the window does not start at 1 (and similarly for the end).</p>`
    ],
    solution: {
      approach: `<p>Arithmetic for the label, a clamped sliding window for the buttons, then ellipsis decoration.</p>`,
      code: { lang: 'js', run: true, code: `function paginator(total, page, size, win = 5) {
  if (total === 0) return { label: '0 of 0', pages: [] };
  const pageCount = Math.ceil(total / size);
  const start = (page - 1) * size + 1, end = Math.min(page * size, total);
  const fmt = n => n.toLocaleString('en-US');
  const w = Math.min(win, pageCount);
  const from = Math.min(Math.max(1, page - Math.floor(w / 2)), pageCount - w + 1);
  const pages = Array.from({ length: w }, (_, i) => from + i);
  if (pages[0] > 1) pages.unshift(...(pages[0] > 2 ? [1, '…'] : [1]));
  const last = pages[pages.length - 1];
  if (last < pageCount) pages.push(...(last < pageCount - 1 ? ['…', pageCount] : [pageCount]));
  return { label: fmt(start) + '–' + fmt(end) + ' of ' + fmt(total), pages };
}
console.log(paginator(47, 2, 10));
console.log(paginator(47, 5, 10));
console.log(paginator(1000, 50, 10));
console.log(paginator(0, 1, 10));` },
      complexity: `<p>O(window). In Angular, these are <code>computed</code>s in the paginator component, and the buttons get <code>aria-current="page"</code>.</p>`
    }
  });

  practice.push({
    title: 'Nx depConstraints with allSourceTags',
    level: 'Medium', tags: ['nx', 'module-boundaries'], companies: ['Nrwl', 'Siemens', 'Allianz'],
    statement: `<p>Implement <code>check(projects, constraints, from, to)</code>. A constraint has either <code>sourceTag</code> or <code>allSourceTags</code> (applies only if the source has all of them), and any of <code>onlyDependOnLibsWithTags</code> (target needs at least one; <code>'*'</code> = anything) and <code>notDependOnLibsWithTags</code> (target must have none). Every applicable constraint must pass. Return <code>{ ok, reasons }</code>. A source with tags but <b>no</b> applicable constraint is an error too ("no constraint matches"), as in Nx.</p>`,
    constraints: `Up to 100 constraints and 1 000 projects.`,
    example: `<p><code>allSourceTags: ['scope:shared','type:ui']</code> with <code>notDependOnLibsWithTags: ['type:data-access']</code> blocks <code>shared-ui-x → shared-data-access-y</code> even if a looser <code>scope:shared</code> rule allows it.</p>`,
    brute: { why: `<p>Returning after the first applicable constraint ("first match wins") lets a permissive rule hide a stricter one. Nx requires all applicable constraints to pass.</p>`,
      code: { lang: 'js', run: true, code: `const constraints = [{ sourceTag: 'scope:shared', only: ['scope:shared'] }, { sourceTag: 'type:ui', only: ['type:ui', 'type:util'] }];
const src = ['scope:shared', 'type:ui'], dst = ['scope:shared', 'type:data-access'];
const first = constraints.find(c => src.includes(c.sourceTag));
console.log('first-match says', first.only.some(t => dst.includes(t)) ? 'ok' : 'error', '<- but the type rule fails');` } },
    mcq: { q: 'A project tagged scope:a, type:feature imports a lib tagged scope:b, type:util. Rules: scope:a → only scope:a/shared; type:feature → anything typed. Result?', options: ['Allowed, the type rule passes', 'Error, the scope rule fails', 'Allowed because util is always allowed'], answer: 1, explain: 'Both constraints apply to the source; one failure is enough.' },
    hints: [
      `<p>Hint 1: a constraint applies if <code>src.includes(sourceTag)</code> or <code>allSourceTags.every(t =&gt; src.includes(t))</code>.</p>`,
      `<p>Hint 2: for each applicable one, test only/not lists; collect reasons instead of returning early.</p>`,
      `<p>Hint 3: if nothing applied and the source has tags, report "no constraint matches".</p>`
    ],
    solution: {
      approach: `<p>Filter applicable constraints, evaluate all, accumulate reasons. This is the core of <code>@nx/enforce-module-boundaries</code>'s tag check (minus transitive <code>notDependOnLibsWithTags</code>).</p>`,
      code: { lang: 'js', run: true, code: `function check(projects, constraints, from, to) {
  const src = projects[from], dst = projects[to], reasons = [];
  const applies = c => c.allSourceTags ? c.allSourceTags.every(t => src.includes(t)) : src.includes(c.sourceTag);
  const active = constraints.filter(applies);
  if (!active.length && src.length) reasons.push('no constraint matches tags of ' + from);
  for (const c of active) {
    const name = c.sourceTag || c.allSourceTags.join('+');
    const only = c.onlyDependOnLibsWithTags;
    if (only && !only.includes('*') && !only.some(t => dst.includes(t))) reasons.push(name + ': target needs one of ' + only.join('|'));
    const not = c.notDependOnLibsWithTags || [];
    const hit = not.filter(t => dst.includes(t));
    if (hit.length) reasons.push(name + ': target must not have ' + hit.join(','));
  }
  return { ok: reasons.length === 0, reasons };
}
const projects = {
  'shared-ui-x': ['scope:shared', 'type:ui'],
  'shared-data-y': ['scope:shared', 'type:data-access'],
  'shared-util-z': ['scope:shared', 'type:util'],
  'legacy': ['team:old'],
};
const constraints = [
  { sourceTag: 'scope:shared', onlyDependOnLibsWithTags: ['scope:shared'] },
  { allSourceTags: ['scope:shared', 'type:ui'], notDependOnLibsWithTags: ['type:data-access'] },
];
console.log(check(projects, constraints, 'shared-ui-x', 'shared-util-z'));
console.log(check(projects, constraints, 'shared-ui-x', 'shared-data-y'));
console.log(check(projects, constraints, 'legacy', 'shared-util-z'));` },
      complexity: `<p>O(C · T) per import for C constraints and T tags.</p>`
    }
  });

  practice.push({
    title: 'Autocomplete: Debounce, Min Length, Cache and Latest-Wins',
    level: 'Medium', tags: ['machine-coding', 'rxjs', 'autocomplete'], companies: ['Google', 'Flipkart', 'Expedia'],
    statement: `<p>Simulate an autocomplete. Input: keystroke events <code>[time, value]</code>, a <code>debounce</code> (ms), a <code>minLength</code>, and an API latency function <code>latency(q)</code>. A query fires when the value has been stable for <code>debounce</code> ms, is ≥ <code>minLength</code> after trimming, and differs from the last fired query. Results from the cache return instantly. When a new query fires, any in-flight one is <b>cancelled</b>. Return the list of <code>[time, query]</code> results actually rendered, and the number of API calls.</p>`,
    constraints: `Up to 1 000 events; integer times.`,
    example: `<p>Keys at 0 "a", 50 "an", 400 "ang", debounce 300, minLength 2, latency 500 for "an", 100 for "ang". "an" fires at 350 (would land at 850) but "ang" fires at 700 and cancels it → rendered ${H.c('g', '[[800, "ang"]]')}, 2 calls.</p>`,
    brute: { why: `<p>Firing on every keystroke with <code>mergeMap</code>: many calls, and slow early responses overwrite newer ones (the list flickers back to old results).</p>`,
      code: { lang: 'js', run: true, code: `const events = [[0, 'an'], [50, 'ang']], lat = { an: 500, ang: 100 };
const arrivals = events.map(([t, q]) => [t + lat[q], q]).sort((a, b) => a[0] - b[0]);
console.log('rendered in arrival order:', arrivals, '<- stale "an" overwrites "ang"');` } },
    mcq: { q: 'Which operator gives latest-wins semantics?', options: ['mergeMap', 'concatMap', 'switchMap', 'exhaustMap'], answer: 2, explain: 'switchMap unsubscribes from the previous inner Observable when a new value arrives, which cancels the HTTP request.' },
    hints: [
      `<p>Hint 1: a value fires at <code>t + debounce</code> only if the next event comes later than that.</p>`,
      `<p>Hint 2: keep <code>inflight = { q, doneAt }</code>; a new fire before <code>doneAt</code> replaces it (cancel).</p>`,
      `<p>Hint 3: after processing fires in time order, a still-pending in-flight result is rendered at its <code>doneAt</code>; cache hits render immediately without a call.</p>`
    ],
    solution: {
      approach: `<p>Compute debounced fire times, then walk fires in order maintaining the single in-flight request; render only those not cancelled. This mirrors <code>debounceTime → map(trim) → filter(len) → distinctUntilChanged → switchMap(cacheOr(api))</code>.</p>`,
      code: { lang: 'js', run: true, code: `function simulate(events, debounce, minLength, latency) {
  const fires = [];
  events.forEach(([t, v], i) => {
    const at = t + debounce, next = events[i + 1];
    if (!next || next[0] > at) fires.push([at, v.trim()]);
  });
  const cache = new Map(), rendered = [];
  let last = null, inflight = null, calls = 0;
  const settle = until => { if (inflight && inflight.doneAt <= until) { cache.set(inflight.q, true); rendered.push([inflight.doneAt, inflight.q]); inflight = null; } };
  for (const [at, q] of fires) {
    settle(at);
    if (q.length < minLength || q === last) continue;
    last = q;
    inflight = null;                                // switchMap: cancel the previous request
    if (cache.has(q)) { rendered.push([at, q]); continue; }
    calls++;
    inflight = { q, doneAt: at + latency(q) };
  }
  settle(Infinity);
  return { rendered, calls };
}
const lat = q => ({ an: 500, ang: 100 }[q] || 50);
console.log(simulate([[0, 'a'], [50, 'an'], [400, 'ang']], 300, 2, lat));
console.log(simulate([[0, 'an'], [400, 'ang'], [800, 'an'], [1300, 'ang']], 300, 2, () => 100));` },
      complexity: `<p>O(E). The second run shows the cache: going back to "an" and "ang" renders instantly with no extra calls.</p>`
    }
  });

  practice.push({
    title: 'Infinite Scroll Loader with Cursor and In-Flight Guard',
    level: 'Medium', tags: ['machine-coding', 'infinite-scroll', 'pagination'], companies: ['LinkedIn', 'Meta', 'Pinterest'],
    statement: `<p>The sentinel becomes visible at given times (IntersectionObserver may fire several times quickly). The API <code>fetchPage(cursor)</code> takes 100 ms and returns <code>{ items, next }</code>. Implement <code>load(visibleTimes)</code> that starts a request only when none is in flight and <code>next !== null</code>; de-duplicates items by id; and returns the final list plus the number of requests.</p>`,
    constraints: `Up to 1 000 visibility events; items have unique ids per page but pages may overlap.`,
    example: `<p>Visible at 0, 10, 20 (three quick events) → only ${H.c('g', '1 request')}. Overlapping page items (id 3 on pages 1 and 2) appear ${H.c('g', 'once')}.</p>`,
    brute: { why: `<p>Calling the API on every intersection event triggers parallel duplicate requests for the same cursor and appends duplicate rows.</p>`,
      code: { lang: 'js', run: true, code: `let requests = 0;
for (const t of [0, 10, 20]) requests++;   // no guard
console.log('requests for one page:', requests);` } },
    mcq: { q: 'Why prefer cursor pagination over ?page=N for feeds?', options: ['Cursors are shorter', 'New items inserted at the top shift offsets, causing duplicates/skips; cursors stay stable', 'Browsers cache cursors'], answer: 1, explain: 'A cursor points at the last item seen, so inserts elsewhere do not shift the next page.' },
    hints: [
      `<p>Hint 1: track <code>busyUntil</code>; ignore events before it.</p>`,
      `<p>Hint 2: when a request completes, append items whose id is not in a <code>Set</code>, then store <code>next</code>.</p>`,
      `<p>Hint 3: stop for good when <code>next === null</code>; process completions in time order before handling each event.</p>`
    ],
    solution: {
      approach: `<p>Event-driven simulation with a single in-flight slot, a seen-id set and an end flag — the same three guards as the Angular <code>FeedStore</code> in the lesson.</p>`,
      code: { lang: 'js', run: true, code: `const PAGES = {
  '': { items: [{ id: 1 }, { id: 2 }, { id: 3 }], next: 'c3' },
  c3: { items: [{ id: 3 }, { id: 4 }], next: 'c4' },
  c4: { items: [{ id: 5 }], next: null },
};
function load(visibleTimes) {
  let cursor = '', busyUntil = -1, pending = null, requests = 0;
  const items = [], seen = new Set();
  const complete = () => {
    for (const it of pending.items) if (!seen.has(it.id)) { seen.add(it.id); items.push(it.id); }
    cursor = pending.next; pending = null;
  };
  for (const t of visibleTimes) {
    if (pending && t >= busyUntil) complete();
    if (pending || cursor === null) continue;          // in flight or finished
    requests++; pending = PAGES[cursor]; busyUntil = t + 100;
  }
  if (pending) complete();
  return { items, requests, done: cursor === null };
}
console.log(load([0, 10, 20]));
console.log(load([0, 10, 150, 160, 300, 450, 600]));` },
      complexity: `<p>O(events + items) time; O(items) memory for the seen-id set.</p>`
    }
  });

  practice.push({
    title: 'Audit Templates and Code for Sanitization Bypasses',
    level: 'Medium', tags: ['security', 'xss', 'code-review'], companies: ['Microsoft', 'Atlassian', 'Okta'],
    statement: `<p>Given source lines, report risky ones with a severity: <b>high</b> for <code>bypassSecurityTrust*</code> whose argument is not a string literal, <code>nativeElement.innerHTML =</code>, <code>insertAdjacentHTML</code>, <code>document.write</code>; <b>medium</b> for <code>bypassSecurityTrust*</code> with a literal argument and <code>localStorage.setItem</code> of something named <code>token</code>; <b>info</b> for <code>[innerHTML]</code> bindings (sanitized, but worth a look). Return <code>[{ line, severity, rule }]</code>.</p>`,
    constraints: `Up to 50 000 lines; one finding per rule per line.`,
    example: `<p><code>this.s.bypassSecurityTrustHtml(comment)</code> → ${H.c('r', 'high')}. <code>bypassSecurityTrustResourceUrl('https://maps.example/embed')</code> → ${H.c('y', 'medium')}. <code>&lt;div [innerHTML]="body"&gt;</code> → ${H.c('b', 'info')}.</p>`,
    brute: { why: `<p>Grepping for "innerHTML" alone mixes harmless sanitized bindings with real DOM writes and misses bypass calls entirely.</p>`,
      code: { lang: 'js', run: true, code: `const lines = ['<div [innerHTML]="x"></div>', 'this.s.bypassSecurityTrustHtml(c)'];
console.log(lines.filter(l => l.includes('innerHTML')), '<- flags the safe one, misses the bypass');` } },
    mcq: { q: 'Which line is the real XSS risk?', options: ['<code>&lt;p&gt;{{ comment }}&lt;/p&gt;</code>', '<code>&lt;div [innerHTML]="comment"&gt;</code>', '<code>bypassSecurityTrustHtml(comment)</code> bound to innerHTML'], answer: 2, explain: 'Interpolation is text; [innerHTML] is sanitized; bypass disables sanitization for attacker-controlled data.' },
    hints: [
      `<p>Hint 1: one regex per rule; for bypass capture the first argument: <code>/bypassSecurityTrust\\w+\\(\\s*([^)]*)\\)/</code>.</p>`,
      `<p>Hint 2: an argument is a literal if it starts and ends with the same quote character.</p>`,
      `<p>Hint 3: number lines from 1 and keep the rule name in the report for reviewers.</p>`
    ],
    solution: {
      approach: `<p>Ordered rule table with regex + severity function. Run it in CI as a custom ESLint rule or a simple script and require a justification comment for every high finding.</p>`,
      code: { lang: 'js', run: true, code: `const RULES = [
  { rule: 'bypass', re: /bypassSecurityTrust\\w+\\(\\s*([^)]*)\\)/, sev: m => (/^(['"\`]).*\\1$/.test(m[1].trim()) ? 'medium' : 'high') },
  { rule: 'dom-innerHTML', re: /nativeElement(\\.\\w+)*\\.innerHTML\\s*=/, sev: () => 'high' },
  { rule: 'insertAdjacentHTML', re: /insertAdjacentHTML\\(/, sev: () => 'high' },
  { rule: 'document.write', re: /document\\.write\\(/, sev: () => 'high' },
  { rule: 'token-in-localStorage', re: /localStorage\\.setItem\\(\\s*['"][^'"]*token/i, sev: () => 'medium' },
  { rule: 'innerHTML-binding', re: /\\[innerHTML\\]=/, sev: () => 'info' },
];
function audit(source) {
  const out = [];
  source.split('\\n').forEach((text, i) => {
    for (const r of RULES) { const m = text.match(r.re); if (m) out.push({ line: i + 1, severity: r.sev(m), rule: r.rule }); }
  });
  return out;
}
const src = [
  "const safe = this.s.bypassSecurityTrustHtml(comment);",
  "const map = this.s.bypassSecurityTrustResourceUrl('https://maps.example/embed');",
  "template: '<div [innerHTML]=\\"body\\"></div>'",
  "this.el.nativeElement.innerHTML = data;",
  "localStorage.setItem('access_token', t);",
  "const ok = 1;",
].join('\\n');
console.table(audit(src));` },
      complexity: `<p>O(lines × rules). A real linter works on the AST (no false hits in comments/strings), but the rules are the same.</p>`
    }
  });

  practice.push({
    title: 'Multi-Column Sort Comparator for a Data Table',
    level: 'Medium', tags: ['machine-coding', 'table', 'sorting'], companies: ['Bloomberg', 'Morgan Stanley', 'SAP'],
    statement: `<p>Implement <code>makeComparator(sorts, collatorLocale)</code> where <code>sorts</code> is an ordered list like <code>[{ key: 'city', dir: 'asc' }, { key: 'age', dir: 'desc' }]</code> (shift-click adds columns). Compare by the first key; on a tie use the next. Numbers numerically, strings with one shared <code>Intl.Collator</code> (case-insensitive, numeric: "item2" before "item10"), <code>null</code>/<code>undefined</code> always <b>last</b> regardless of direction. Final tie-break by <code>id</code>.</p>`,
    constraints: `10<sup>5</sup> rows; comparator must not allocate per call.`,
    example: `<p>Sort city asc, age desc: ${H.c('g', 'Austin 29, Austin 25, Berlin 51, Berlin 42, … , (city null) last')}.</p>`,
    brute: { why: `<p>Sorting several times (once per key) only works if you sort by the <i>last</i> key first and rely on stability — easy to get backwards. <code>localeCompare</code> per call also creates locale data repeatedly and nulls end up first in descending order.</p>`,
      code: { lang: 'js', run: true, code: `const rows = [{ c: 'item10' }, { c: 'item2' }, { c: null }];
console.log([...rows].sort((a, b) => String(a.c).localeCompare(String(b.c))).map(r => r.c), '<- item10 before item2, "null" sorted as text');` } },
    mcq: { q: 'Where should rows with an empty value go when sorting descending?', options: ['First', 'Last, same as ascending', 'Random'], answer: 1, explain: 'Most users expect blanks at the bottom in both directions; flipping them to the top on desc looks like a bug.' },
    hints: [
      `<p>Hint 1: create the collator once: <code>new Intl.Collator(locale, { sensitivity: 'base', numeric: true })</code>.</p>`,
      `<p>Hint 2: handle null before applying the direction factor, so nulls stay last.</p>`,
      `<p>Hint 3: loop over sorts; return the first non-zero result; finally <code>a.id - b.id</code>.</p>`
    ],
    solution: {
      approach: `<p>Build the comparator once (closures over the collator and sort list), with a null-last rule outside the direction factor.</p>`,
      code: { lang: 'js', run: true, code: `function makeComparator(sorts, locale = 'en') {
  const coll = new Intl.Collator(locale, { sensitivity: 'base', numeric: true });
  return (a, b) => {
    for (const { key, dir } of sorts) {
      const x = a[key], y = b[key];
      const xn = x == null, yn = y == null;
      if (xn || yn) { if (xn && yn) continue; return xn ? 1 : -1; }     // nulls last, both directions
      const c = typeof x === 'number' && typeof y === 'number' ? x - y : coll.compare(String(x), String(y));
      if (c) return dir === 'desc' ? -c : c;
    }
    return a.id - b.id;
  };
}
const rows = [
  { id: 1, city: 'Berlin', age: 42, sku: 'item10' }, { id: 2, city: 'austin', age: 25, sku: 'item2' },
  { id: 3, city: null, age: 30, sku: 'item1' }, { id: 4, city: 'Austin', age: 29, sku: null },
  { id: 5, city: 'Berlin', age: 51, sku: 'item3' },
];
console.log([...rows].sort(makeComparator([{ key: 'city', dir: 'asc' }, { key: 'age', dir: 'desc' }])).map(r => r.city + ' ' + r.age));
console.log([...rows].sort(makeComparator([{ key: 'sku', dir: 'desc' }])).map(r => r.sku));` },
      complexity: `<p>O(n log n · k) for k sort keys; no per-comparison allocation.</p>`
    }
  });

  practice.push({
    title: 'Fractional Ranks for Kanban Ordering',
    level: 'Hard', tags: ['kanban', 'ordering', 'strings'], companies: ['Atlassian', 'Figma', 'Linear'],
    statement: `<p>To save a card move by updating <b>only that card</b>, each card has a rank string; the list is sorted by rank lexicographically. Implement <code>rankBetween(a, b)</code> returning a string strictly between <code>a</code> and <code>b</code> (either may be <code>null</code> = open end) using the alphabet <code>0-9a-z</code> (base 36). Ranks never end in <code>'0'</code> (so there is always room between). Then <code>moveCard(list, id, toIndex)</code> computes the new rank from its new neighbours.</p>`,
    constraints: `Ranks up to ~50 chars; assume <code>a &lt; b</code> when both given.`,
    example: `<p><code>rankBetween('a', 'b')</code> → ${H.c('g', "'ai'")} (a midpoint). <code>rankBetween(null, '1')</code> → ${H.c('g', "'0i'")}. <code>rankBetween('az', 'b')</code> → ${H.c('g', "'azi'")}. Moving card X between "a" and "b" updates only X.</p>`,
    brute: { why: `<p>Storing integer positions means moving a card to the top renumbers every card below it: N writes per move, and two users moving cards at once overwrite each other's numbering.</p>`,
      code: { lang: 'js', run: true, code: `let list = ['A', 'B', 'C', 'D'].map((id, i) => ({ id, pos: i }));
const moved = list.splice(3, 1)[0]; list.unshift(moved);
const writes = list.filter((c, i) => c.pos !== i).length;
console.log('writes for one move:', writes);` } },
    mcq: { q: 'Why must ranks never end with the smallest digit "0"?', options: ['It looks odd', 'Then there would be no string between "x" and "x0", since nothing sorts between them', 'Databases reject trailing zeros'], answer: 1, explain: '"x" < "x0" with nothing in between in this alphabet. Forbidding trailing 0 guarantees a midpoint always exists.' },
    hints: [
      `<p>Hint 1: walk both strings digit by digit (missing digits of <code>a</code> count as 0, of <code>b</code> as 36 when b is null/shorter-open).</p>`,
      `<p>Hint 2: when the digits differ by at least 2, take the middle digit and stop; if they differ by 1, copy <code>a</code>'s digit and continue with <code>b</code> treated as open (36).</p>`,
      `<p>Hint 3: if equal, copy and continue. Midpoint of 0 and 36 is 18 = 'i'.</p>`
    ],
    solution: {
      approach: `<p>Classic fractional-indexing midpoint over base-36 digit strings. After a differing digit pair, the upper bound becomes open, so the loop always terminates with a digit strictly between.</p>`,
      code: { lang: 'js', run: true, code: `const DIG = '0123456789abcdefghijklmnopqrstuvwxyz', BASE = 36;
function rankBetween(a, b) {
  a = a || ''; let out = '', bOpen = b == null;
  for (let i = 0; ; i++) {
    const da = i < a.length ? DIG.indexOf(a[i]) : 0;
    const db = bOpen ? BASE : (i < b.length ? DIG.indexOf(b[i]) : 0);
    if (da === db) { out += DIG[da]; continue; }
    if (db - da >= 2) return out + DIG[Math.floor((da + db) / 2)];
    out += DIG[da]; bOpen = true;                    // differ by 1: keep a's digit, upper bound now open
  }
}
function moveCard(list, id, toIndex) {
  const rest = list.filter(c => c.id !== id);
  const before = rest[toIndex - 1] ? rest[toIndex - 1].rank : null;
  const after = rest[toIndex] ? rest[toIndex].rank : null;
  const card = { id, rank: rankBetween(before, after) };
  rest.splice(toIndex, 0, card);
  return { list: rest, write: card };                  // exactly one DB write
}
console.log(rankBetween('a', 'b'), rankBetween(null, '1'), rankBetween('az', 'b'), rankBetween('b', null), rankBetween(null, null));
let list = [{ id: 'A', rank: 'a' }, { id: 'B', rank: 'b' }, { id: 'C', rank: 'c' }];
const r = moveCard(list, 'C', 0);
console.log(r.write, r.list.map(c => c.id + ':' + c.rank).join(' '));
console.log('sorted check:', r.list.every((c, i, arr) => i === 0 || arr[i - 1].rank < c.rank));` },
      complexity: `<p>O(length of ranks). Ranks grow slowly with repeated inserts at the same spot; production libraries periodically rebalance.</p>`
    }
  });

  practice.push({
    title: 'Remote Loader: Dedupe, Timeout and Fallback',
    level: 'Hard', tags: ['micro-frontends', 'promises', 'resilience'], companies: ['Zalando', 'IKEA', 'SAP'],
    statement: `<p>Build <code>createRemoteLoader(fetchRemote, { timeoutMs, retries })</code> returning <code>load(name)</code>. Requirements: (1) concurrent calls for the same remote share <b>one</b> in-flight promise; (2) a successful module is cached forever; (3) each attempt times out after <code>timeoutMs</code>; (4) failures retry up to <code>retries</code> times; (5) after final failure, resolve to a <b>fallback</b> <code>{ fallback: true, name }</code> (never reject, so the shell route can render an error component) and do <b>not</b> cache the failure (the next navigation tries again).</p>`,
    constraints: `Use Promises and <code>setTimeout</code>; finish fast (tests use small timeouts).`,
    example: `<p>Three parallel <code>load('cart')</code> → ${H.c('g', '1 fetch')}. A remote that hangs → ${H.c('y', 'fallback after timeout × (retries+1)')}. Next call after failure → ${H.c('g', 'tries again')}.</p>`,
    brute: { why: `<p>Calling <code>loadRemoteModule</code> in each place without coordination fetches the same remote several times, a hanging CDN freezes navigation forever, and caching a rejected promise makes the remote unusable until a full reload.</p>`,
      code: { lang: 'js', run: true, code: `let fetches = 0;
const fetchRemote = () => { fetches++; return Promise.resolve({ routes: [] }); };
Promise.all([fetchRemote(), fetchRemote(), fetchRemote()]).then(() => console.log('fetches:', fetches));` } },
    mcq: { q: 'Why should the loader not cache a failed attempt?', options: ['Failed promises use more memory', 'The remote may be back on the next navigation; a cached rejection blocks it until reload', 'Angular forbids it'], answer: 1, explain: 'Transient CDN or deploy issues are common; retrying on the next navigation recovers automatically.' },
    hints: [
      `<p>Hint 1: keep two maps: <code>done</code> (name → module) and <code>inflight</code> (name → promise).</p>`,
      `<p>Hint 2: timeout = <code>Promise.race([fetch, new Promise((_, rej) =&gt; setTimeout(rej, ms))])</code>; loop attempts with try/catch.</p>`,
      `<p>Hint 3: in <code>finally</code> delete the in-flight entry; only set <code>done</code> on success; return the fallback object after the last failure.</p>`
    ],
    solution: {
      approach: `<p>Memoise the in-flight promise per name (dedupe), wrap each attempt in a timeout race, retry in a loop, cache successes only. This is what a production shell wraps around <code>loadRemoteModule</code>.</p>`,
      code: { lang: 'js', run: true, code: `function createRemoteLoader(fetchRemote, { timeoutMs = 50, retries = 1 } = {}) {
  const done = new Map(), inflight = new Map();
  const withTimeout = p => {
    let timer;
    return Promise.race([p, new Promise((_, rej) => { timer = setTimeout(() => rej(new Error('timeout')), timeoutMs); })])
      .finally(() => clearTimeout(timer));
  };
  return function load(name) {
    if (done.has(name)) return Promise.resolve(done.get(name));
    if (inflight.has(name)) return inflight.get(name);
    const p = (async () => {
      for (let attempt = 0; attempt <= retries; attempt++) {
        try { const mod = await withTimeout(fetchRemote(name)); done.set(name, mod); return mod; }
        catch (e) { /* try again */ }
      }
      return { fallback: true, name };
    })().finally(() => inflight.delete(name));
    inflight.set(name, p);
    return p;
  };
}

(async () => {
  const calls = {};
  let accountUp = false;
  const fetchRemote = name => {
    calls[name] = (calls[name] || 0) + 1;
    if (name === 'cart') return new Promise(r => setTimeout(() => r({ name, routes: ['/cart'] }), 10));
    if (name === 'account' && accountUp) return Promise.resolve({ name, routes: ['/account'] });
    return new Promise(() => {});                    // hangs forever
  };
  const load = createRemoteLoader(fetchRemote, { timeoutMs: 30, retries: 1 });
  console.log(await Promise.all([load('cart'), load('cart'), load('cart')]));
  console.log(await load('cart'), 'cart fetches:', calls.cart);
  console.log(await load('account'), 'account attempts:', calls.account);
  accountUp = true;
  console.log(await load('account'), 'account attempts:', calls.account);
})();` },
      complexity: `<p>O(1) bookkeeping per call; worst-case latency timeoutMs × (retries + 1). Add exponential backoff and telemetry in production.</p>`
    }
  });

  practice.push({
    title: 'Detect Deep Imports and Eager Imports of Lazy Libraries',
    level: 'Hard', tags: ['nx', 'module-boundaries', 'bundling'], companies: ['Nrwl', 'Microsoft', 'Deutsche Bank'],
    statement: `<p>Given path aliases <code>{ '@acme/booking/feature': 'libs/booking/feature/src/index.ts', ... }</code>, a set of <b>lazy</b> library aliases (only allowed in <code>import()</code>), and a list of files with their imports <code>{ file, imports: [{ spec, dynamic }] }</code>, report: <b>deep</b> imports (spec starts with an alias + <code>/</code>, or a relative path that climbs into another library's folder), and <b>eager-lazy</b> imports (a static import of a lazy alias). Imports inside the same library are fine.</p>`,
    constraints: `Up to 10 000 files.`,
    example: `<p><code>apps/shop/src/app.ts</code> statically imports <code>@acme/admin/feature</code> (lazy) → ${H.c('r', 'eager-lazy')}. <code>libs/booking/ui/x.ts</code> imports <code>@acme/booking/data/src/lib/cache</code> → ${H.c('r', 'deep')}. <code>import(\'@acme/admin/feature\')</code> → ${H.c('g', 'ok')}.</p>`,
    brute: { why: `<p>Checking only the alias prefix misses relative climbs like <code>../../../checkin/data/src/lib/x</code>, which bypass the public API just as much, and ignores the static-vs-dynamic distinction that decides whether a lazy chunk stays lazy.</p>`,
      code: { lang: 'js', run: true, code: `const imp = '../../../checkin/data/src/lib/x';
console.log(imp.startsWith('@acme/') ? 'checked' : 'ignored', '<- relative deep import slips through');` } },
    mcq: { q: 'A shell file does <code>import { AdminUser } from \'@acme/admin/feature\'</code> just for a type. What is the cheapest correct fix?', options: ['Ignore it, types are erased', 'Use <code>import type</code> or move the type to a model/util library', 'Make admin eager'], answer: 1, explain: 'A plain import can pull runtime code (and side effects) of the lazy library into the main bundle. <code>import type</code> is erased; a shared model lib is cleaner still.' },
    hints: [
      `<p>Hint 1: derive each library's root folder from its alias target (strip <code>/src/index.ts</code>).</p>`,
      `<p>Hint 2: resolve relative specs against the importing file's folder (handle <code>..</code> segments) and find which library root contains the result.</p>`,
      `<p>Hint 3: deep = target library differs from the importer's library and the path is not exactly the alias; eager-lazy = alias in the lazy set and <code>!dynamic</code>.</p>`
    ],
    solution: {
      approach: `<p>Map files to libraries by longest root prefix, normalise relative paths, then classify each import. This is a mini version of what <code>@nx/enforce-module-boundaries</code> computes from the project graph.</p>`,
      code: { lang: 'js', run: true, code: `function audit(aliases, lazy, files) {
  const roots = Object.entries(aliases).map(([alias, target]) => ({ alias, root: target.replace(/\\/src\\/index\\.ts$/, '') }));
  const libOf = path => roots.filter(r => path === r.root || path.startsWith(r.root + '/')).sort((a, b) => b.root.length - a.root.length)[0];
  const resolve = (from, spec) => {
    const parts = from.split('/').slice(0, -1);
    for (const seg of spec.split('/')) { if (seg === '..') parts.pop(); else if (seg !== '.') parts.push(seg); }
    return parts.join('/');
  };
  const findings = [];
  for (const { file, imports } of files) {
    const own = libOf(file);
    for (const { spec, dynamic } of imports) {
      if (lazy.has(spec) && !dynamic) { findings.push({ file, spec, problem: 'eager-lazy' }); continue; }
      const aliasHit = roots.find(r => spec.startsWith(r.alias + '/'));
      if (aliasHit && (!own || aliasHit.alias !== own.alias)) { findings.push({ file, spec, problem: 'deep (alias)' }); continue; }
      if (spec.startsWith('.')) {
        const target = libOf(resolve(file, spec));
        if (target && (!own || target.alias !== own.alias)) findings.push({ file, spec, problem: 'deep (relative into ' + target.alias + ')' });
      }
    }
  }
  return findings;
}
const aliases = {
  '@acme/admin/feature': 'libs/admin/feature/src/index.ts',
  '@acme/booking/data': 'libs/booking/data/src/index.ts',
  '@acme/booking/ui': 'libs/booking/ui/src/index.ts',
  '@acme/checkin/data': 'libs/checkin/data/src/index.ts',
};
const files = [
  { file: 'apps/shop/src/app/app.routes.ts', imports: [{ spec: '@acme/admin/feature', dynamic: true }] },
  { file: 'apps/shop/src/app/header.ts', imports: [{ spec: '@acme/admin/feature', dynamic: false }] },
  { file: 'libs/booking/ui/src/lib/card.ts', imports: [{ spec: '@acme/booking/data/src/lib/cache' }, { spec: './card.model' }] },
  { file: 'libs/booking/data/src/lib/api.ts', imports: [{ spec: '../../../../checkin/data/src/lib/pnr' }, { spec: '../index' }] },
];
console.table(audit(aliases, new Set(['@acme/admin/feature']), files));` },
      complexity: `<p>O(I · L) for I imports and L libraries (use a trie of roots for O(I · depth)).</p>`
    }
  });

  /* =====================================================================
     QUIZ
     ===================================================================== */
  quiz.push({ q: 'In a layered Angular workspace, a <code>ui</code> library component needs the list of flights. Where should the HTTP call live?',
    options: ['In a data-access library; a feature (smart) component reads it and passes data into the ui component via inputs', 'Inside the ui component, injecting HttpClient', 'In a util library, because it is shared', 'In the app shell'], answer: 0,
    explain: 'ui may only depend on ui and util. Data loading belongs to data-access, and the smart component wires it to presentational inputs.' });
  quiz.push({ q: 'What is the main benefit of putting a <b>facade</b> between feature components and NgRx Store?',
    options: ['Components depend on a small, stable API, so the state implementation can change without touching them', 'It makes NgRx faster', 'It removes the need for selectors', 'It enables server-side rendering'], answer: 0,
    explain: 'A facade hides how state is managed (actions, selectors, HTTP) behind signals and methods the UI needs.' });
  quiz.push({ q: 'A project tagged <code>scope:booking, type:feature</code> imports a library tagged <code>scope:checkin, type:data-access</code>. Rules: <code>scope:booking</code> → only <code>scope:booking</code>/<code>scope:shared</code>; <code>type:feature</code> → feature/ui/data-access/util. What does lint report?',
    options: ['An error, because every applicable constraint must pass and the scope rule fails', 'Nothing, the type rule passes', 'A warning only', 'An error about circular dependencies'], answer: 0,
    explain: 'All constraints whose source tag the project carries apply. One failing constraint makes the import invalid.' });
  quiz.push({ q: 'A PR changes only <code>libs/shared/util-dates</code>. What does <code>nx affected -t test</code> run?',
    options: ['Tests of util-dates and every project that depends on it, directly or transitively', 'Only util-dates tests', 'All tests in the repo', 'Tests of the libraries util-dates depends on'], answer: 0,
    explain: 'Affected = changed projects plus their dependents (reverse edges in the project graph).' });
  quiz.push({ q: 'Why is <code>@angular/core</code> shared as a <b>singleton</b> in Module/Native Federation?',
    options: ['Two copies of Angular on one page break DI, zones and shared tokens, and double the download', 'Singletons load faster from the CDN', 'Angular refuses to bootstrap twice', 'Because Angular is licensed per page'], answer: 0,
    explain: 'Remotes must use the host\'s Angular instance to share injectors and services; a second copy leads to subtle runtime bugs.' });
  quiz.push({ q: 'Your Angular 20 app uses the default esbuild <code>application</code> builder and needs runtime micro-frontends. Which option fits most naturally?',
    options: ['Native Federation (<code>@angular-architects/native-federation</code>)', 'webpack Module Federation via a custom webpack config in the esbuild builder', 'iframes for every route', 'Angular Elements only, no federation'], answer: 0,
    explain: 'Native Federation wraps the esbuild builder and uses ES modules + import maps; classic Module Federation requires a webpack/Rspack build.' });
  quiz.push({ q: 'In Angular Material v19+, how do you change the filled button colour in one area without <code>::ng-deep</code>?',
    options: ['<code>@include mat.button-overrides((filled-container-color: ...))</code> scoped to a selector', 'Add <code>!important</code> on <code>.mat-mdc-button</code>', 'Set <code>ViewEncapsulation.None</code> on every component', 'Fork Angular Material'], answer: 0,
    explain: 'Overrides mixins set documented component tokens (CSS variables), which survive upgrades.' });
  quiz.push({ q: 'A combobox must keep DOM focus in the text input while arrow keys move through options. Which CDK tool fits?',
    options: ['<code>ActiveDescendantKeyManager</code>', '<code>FocusKeyManager</code>', '<code>cdkTrapFocus</code>', '<code>FocusMonitor</code>'], answer: 0,
    explain: 'Active-descendant updates <code>aria-activedescendant</code> on the focused input instead of moving focus.' });
  quiz.push({ q: 'A developer fixes a typo in an English template string marked <code>i18n</code> (no custom ID). What happens to the German translation?',
    options: ['It is orphaned, because the auto-generated message ID is a hash of the text', 'It updates automatically', 'Angular asks the translator via the CLI', 'Nothing, IDs are based on the element position'], answer: 0,
    explain: 'Default IDs derive from text + meaning. Use <code>@@customId</code> to keep IDs stable.' });
  quiz.push({ q: 'With built-in <code>@angular/localize</code> and <code>"localize": true</code>, how does a user switch from English to German?',
    options: ['By navigating to the German build (e.g. /de/...), since each locale is a separate inlined build', 'By calling setLocale(\'de\') at runtime', 'By changing LOCALE_ID in a component', 'By reloading with ?lang=de on the same build'], answer: 0,
    explain: 'Compile-time i18n inlines translations per locale; runtime switching needs a library like Transloco.' });
  quiz.push({ q: 'Which binding is an XSS risk?',
    options: ['<code>[innerHTML]="sanitizer.bypassSecurityTrustHtml(userComment)"</code>', '<code>{{ userComment }}</code>', '<code>[innerHTML]="userComment"</code>', '<code>[textContent]="userComment"</code>'], answer: 0,
    explain: 'Bypassing marks attacker-controlled HTML as trusted, so event handlers and scripts survive.' });
  quiz.push({ q: 'Angular\'s HttpClient sends the <code>X-XSRF-TOKEN</code> header automatically for which request?',
    options: ['<code>POST /api/orders</code> (relative URL) when the XSRF-TOKEN cookie exists', '<code>GET /api/orders</code>', '<code>POST https://api.partner.com/orders</code>', 'Every request, always'], answer: 0,
    explain: 'Only mutating methods to relative (same-origin) URLs, so the token is never leaked to other origins.' });
  quiz.push({ q: 'Under a strict CSP without <code>\'unsafe-inline\'</code> for styles, what must an Angular app provide?',
    options: ['A per-response nonce via <code>ngCspNonce</code> on the root element or the <code>CSP_NONCE</code> token', 'Nothing, Angular never creates style elements', '<code>\'unsafe-eval\'</code> for the compiler', 'A separate CSS file per component loaded by link tags'], answer: 0,
    explain: 'Angular inserts <code>&lt;style&gt;</code> elements for component styles; the nonce lets them pass the policy.' });
  quiz.push({ q: 'In a signal-based data table, what is the correct derived-state order?',
    options: ['filter → sort → paginate', 'paginate → filter → sort', 'sort → paginate → filter', 'paginate → sort → filter'], answer: 0,
    explain: 'Paginating earlier shows "a page of the raw data, sorted", not "a page of the sorted, filtered data".' });
  quiz.push({ q: 'A kanban drop handler calls CDK\'s <code>transferArrayItem</code> directly on the arrays inside a <code>signal</code> and nothing re-renders (OnPush/zoneless). Why?',
    options: ['The helpers mutate arrays in place, so the signal value reference never changes and no notification happens', 'transferArrayItem only works with NgModules', 'CDK drag-drop requires zone.js', 'Signals cannot hold arrays'], answer: 0,
    explain: 'Copy the affected arrays, apply the move, then <code>set</code> a new board object.' });

  /* spread the correct answers around: rotate the options of each quiz question */
  quiz.forEach(function (q, i) {
    var n = q.options.length, k = i % n;
    if (!k) return;
    q.options = q.options.slice(k).concat(q.options.slice(0, k));
    q.answer = (q.answer - k + n) % n;
  });

  /* =====================================================================
     INTERVIEW
     ===================================================================== */
  interview.push({ q: 'How would you structure a large Angular application with 5 teams and 200+ screens?', level: 'E',
    a: `<p>I split by <b>business domain first</b> (booking, checkin, account, shared), then by <b>library type</b>: feature (smart components + routes), ui (presentational, inputs/outputs, OnPush), data-access (API clients, stores, facades) and util (pure functions). Imports only go "down": feature → ui/data-access/util, ui → ui/util, data-access → data-access/util, util → util; domains only use themselves and shared. Each library has a public <code>index.ts</code>. The app shell stays thin: bootstrap, layout, top-level lazy routes into feature libraries. I enforce it with Nx tags and <code>@nx/enforce-module-boundaries</code>, assign CODEOWNERS per domain folder, and use <code>nx affected</code> plus remote caching so CI scales. Only if teams need independent deployments would I add federation on top.</p>`,
    followUps: ['Where would a "current user" service live?', 'How do you stop the shared folder from becoming a dumping ground?', 'When would you split into several apps?'] });
  interview.push({ q: 'Explain smart vs presentational components and why it matters with signals and OnPush.', level: 'I',
    a: `<p>A <b>smart</b> component knows where data comes from: it injects a facade/store, reads signals and translates user events into method calls. A <b>presentational</b> component only renders: <code>input()</code>s in, <code>output()</code>s out, no data services, OnPush. With signals and OnPush, presentational components re-render only when their inputs change (by reference) or a signal they read changes, which keeps change detection cheap and predictable, and they work in zoneless apps out of the box. They are reusable across apps, easy to test (set inputs, assert DOM/outputs) and fit Storybook. Local UI state (open/closed, hovered) can still live in a presentational component; application state and side effects do not.</p>`,
    followUps: ['Is a date picker presentational if it has internal state?', 'How do you test a presentational component without TestBed?'] });
  interview.push({ q: 'What is a facade in Angular and when is it worth it?', level: 'A',
    a: `<p>A facade is an injectable in data-access that exposes exactly what a feature's UI needs — read-only signals (<code>flights</code>, <code>loading</code>, <code>error</code>) and intention-revealing methods (<code>search()</code>, <code>book()</code>) — and hides the implementation (HTTP, NgRx actions/selectors, caching, combining several stores). It is worth it when the state layer is a library with a big API (NgRx), when a screen combines several sources, or when you expect to migrate (Store → SignalStore, REST → GraphQL): components never change. It is not worth it as a mandatory extra layer over a simple signal service, which already is a facade. I keep facades per feature, not one global "AppFacade", to avoid a god object.</p>`,
    followUps: ['How does a facade affect testing?', 'Would you expose Observables or signals from a facade?'] });
  interview.push({ q: 'How do Nx module-boundary rules work, and what problems do they prevent?', level: 'A',
    a: `<p>Every project gets tags in <code>project.json</code>, usually two dimensions (<code>scope:*</code> and <code>type:*</code>). The ESLint rule <code>@nx/enforce-module-boundaries</code> has <code>depConstraints</code>: for each source tag (or combination via <code>allSourceTags</code>), <code>onlyDependOnLibsWithTags</code> and/or <code>notDependOnLibsWithTags</code>. Nx builds the project graph from TS imports, and for every import all applicable constraints must pass. The rule also flags deep imports bypassing a library's public API, relative imports across projects, circular dependencies and static imports of lazy-loaded libraries (which would pull lazy chunks into main). It prevents the slow erosion into a ball of mud, keeps domains decoupled so teams can refactor internals, and keeps lazy loading effective.</p>`,
    followUps: ['How would you introduce these rules into an existing messy repo?', 'How do you handle a legitimate cross-domain dependency?'] });
  interview.push({ q: 'Monorepo or micro-frontends for a large Angular product? Walk me through the trade-offs.', level: 'E',
    a: `<p>Both solve "many teams, one product", at different layers. A <b>monorepo</b> gives code isolation at build time: one Angular version, atomic cross-team changes, shared tooling, simple deployment, no runtime composition bugs — but one release train and everyone upgrades together. <b>Micro-frontends</b> (Native/Module Federation) give independent <b>deployments</b>: teams ship remotes on their own cadence and the shell loads them via a manifest. The cost is runtime complexity: shared-dependency negotiation, version skew (Angular must be a compatible singleton or you pay for multi-version via Web Components), duplicated global CSS, harder debugging, more pipelines and contract testing. My default is a well-bounded Nx monorepo; I add federation when independent deploys are an organisational requirement (different companies/vendors, very different release cycles, or strangling a legacy app). The two also combine well: an Nx monorepo that builds several federated remotes.</p>`,
    followUps: ['What would make you split a monorepo app into remotes?', 'How do you share auth and design system across remotes?', 'How do you deal with one remote stuck on an older Angular major?'] });
  interview.push({ q: 'Describe how Native Federation loads a remote at runtime in an Angular app.', level: 'E',
    a: `<p>At build time each app produces ES module bundles, a <code>remoteEntry.json</code> listing exposed modules and shared packages with versions, and shared packages as separate bundles. At startup the host's <code>main.ts</code> calls <code>initFederation('federation.manifest.json')</code> <i>before</i> importing the real bootstrap: it reads the manifest (remote name → remoteEntry URL), reads the remotes' metadata, chooses one version per shared singleton, and creates an <b>import map</b> so bare specifiers like <code>@angular/core</code> resolve to a single URL for the whole page. Then <code>import('./bootstrap')</code> boots Angular. When the router hits a route using <code>loadRemoteModule('mfe-cart', './routes')</code>, the remote's module is fetched via standard dynamic import and returns, e.g., its route array. I wrap that in a <code>.catch()</code> returning a fallback route so the shell survives a broken remote.</p>`,
    followUps: ['Why the main.ts → bootstrap.ts split?', 'How would you version and contract-test exposed modules?'] });
  interview.push({ q: 'How would you build a company design system in Angular? Material, CDK or from scratch?', level: 'A',
    a: `<p>I never start from scratch on behaviour: overlays, focus traps, key managers, drag-drop and virtual scroll are hard and the <b>CDK</b> solves them. The question is the look. For internal tools I theme <b>Angular Material</b>: <code>mat.theme()</code> with a brand palette, system tokens (<code>--mat-sys-*</code>), and <code>*-overrides</code> mixins for component tweaks — no <code>::ng-deep</code>. For a strong non-Material brand I build our own components on CDK primitives and style them from our tokens (CSS custom properties, ideally the same tokens other frameworks use). Either way: a ui library with secondary entry points, Storybook docs, component harnesses for tests, axe and visual-regression in CI, semantic versioning and codemods/schematics for breaking changes.</p>`,
    followUps: ['How do you support dark mode?', 'How do you keep product teams from forking components?', 'How do component harnesses help?'] });
  interview.push({ q: 'Compare Angular\'s built-in i18n with runtime libraries like Transloco.', level: 'A',
    a: `<p>Built-in <code>@angular/localize</code>: mark text with <code>i18n</code> / <code>$localize</code>, extract with <code>ng extract-i18n</code>, and the build inlines translations into one output per locale. Pros: zero runtime cost, translators see full sentences with ICU plurals, typo-proof with custom IDs, great for SEO with locale URLs. Cons: language switch = navigate to another build, N× build output, translations fixed at build time (unless using <code>loadTranslations</code> at startup). Transloco/ngx-translate: keys + JSON loaded at runtime, live switching, lazy-loaded scopes per feature, translations editable after deploy. Cons: runtime lookups, keys instead of source text, more care with OnPush and SSR. I choose built-in for public sites and apps where language rarely changes; runtime libs for SaaS where users switch languages in-app or content comes from a CMS.</p>`,
    followUps: ['How do you handle dates and currencies per locale?', 'What breaks in RTL languages?'] });
  interview.push({ q: 'How does Angular protect against XSS, and when can a developer break it?', level: 'A',
    a: `<p>Angular treats every value as untrusted. Interpolation writes text, not HTML. Property bindings into dangerous sinks are sanitized by context: HTML (<code>[innerHTML]</code> runs an allowlist sanitizer), URL (<code>javascript:</code> links neutralised to <code>unsafe:</code>), style, and resource URL (iframe/script src) which cannot be sanitized and so throws unless trusted. AOT means no runtime template compilation from strings. Developers break it by: calling <code>bypassSecurityTrust*</code> on data that contains user input, writing to the DOM directly (<code>nativeElement.innerHTML</code>, <code>insertAdjacentHTML</code>, <code>Renderer2.setProperty(..., 'innerHTML')</code>), compiling templates at runtime, or using third-party libraries that write HTML. I keep bypasses in one audited pipe that only builds values from constants/allowlists, add Trusted Types and a strict CSP as defence in depth, and treat LLM output like user input.</p>`,
    followUps: ['Why can Angular sanitize href but not iframe src?', 'What do Trusted Types add on top?'] });
  interview.push({ q: 'Explain XSRF protection with Angular\'s HttpClient end to end.', level: 'I',
    a: `<p>CSRF abuses the fact that browsers attach cookies automatically to cross-site requests. With the cookie-to-header pattern the server sets a random token in a JS-readable cookie (<code>XSRF-TOKEN</code>). For mutating requests (not GET/HEAD) to relative URLs, Angular's interceptor reads the cookie and sends it as <code>X-XSRF-TOKEN</code>. The server verifies header and cookie/session match. A malicious site can make the browser send the cookie but cannot read it (same-origin policy), so it cannot set the header. Configuration: <code>withXsrfConfiguration({ cookieName, headerName })</code> or <code>withNoXsrfProtection()</code>. Absolute URLs never get the header, so cross-origin APIs need their own scheme. Add <code>SameSite=Lax/Strict</code> cookies as an extra layer. Bearer tokens in an Authorization header are not auto-sent, so CSRF matters less there, but XSS then becomes the main risk.</p>`,
    followUps: ['Why does Angular skip GET requests?', 'How would you protect a cross-origin API?'] });
  interview.push({ q: 'You have 75 minutes to build a sortable, filterable, paginated data table in Angular. Walk me through it.', level: 'I',
    a: `<p>First 5–7 minutes: clarify client vs server side, row count, sortable columns, multi-sort, URL sync, whether Material is allowed. Then I sketch: <code>UsersPage</code> (smart) with <code>FilterBar</code>, <code>DataTable</code> and <code>Paginator</code> (presentational, OnPush) and types. State as signals: <code>rows</code> (from a mock service via <code>toSignal</code>), <code>query</code>, <code>sort</code>, <code>pageSize</code>, and <code>page</code> as a <code>linkedSignal</code> that resets to 1 when query or sort change. Derived <code>computed</code>s: filtered → sorted (copy, localeCompare/number, id tie-break) → pageCount → pageRows with clamping. Template: <code>@for (...; track row.id)</code>, <code>@empty</code>, sort buttons inside <code>&lt;th scope="col" [attr.aria-sort]&gt;</code>. Then loading/error states, debounced filter, a unit test of the pipeline. I finish by explaining server-side mode (params signal → debounce → switchMap or resource) and virtual scroll for big data.</p>`,
    followUps: ['How would you sync sort and page with the URL?', 'What changes for 1M rows?', 'How do you make sort headers accessible?'] });
  interview.push({ q: 'How do you design a multi-step form wizard in Angular so users never lose data?', level: 'I',
    a: `<p>One typed reactive form owned by the parent (smart) component, with a nested <code>FormGroup</code> per step; step components only render their group (passed as input or via <code>formGroupName</code>). A <code>step</code> signal controls which step shows. Next validates only the current group (<code>markAllAsTouched</code> and stop if invalid); Back never validates. Skipped/optional steps are disabled groups so they do not block validity. Submit validates everything, sends <code>getRawValue()</code>, maps server errors back with <code>setErrors</code> and jumps to the first failing step. To survive refresh I autosave a debounced draft to sessionStorage (without secrets) and add a <code>canDeactivate</code> guard. For real checkouts I'd use child routes per step with the form in a route-scoped service, so browser Back works and each step can be guarded.</p>`,
    followUps: ['How do async validators affect Next?', 'Would you use MatStepper?', 'How would Signal Forms change this?'] });
  interview.push({ q: 'Build a kanban board with drag and drop in Angular: what are the key decisions?', level: 'A',
    a: `<p>I use <code>@angular/cdk/drag-drop</code>: <code>cdkDropListGroup</code> around columns, <code>cdkDropList</code> per column with its id as data, <code>cdkDrag</code> per card, and one <code>(cdkDropListDropped)</code> handler. State is a <code>signal&lt;Board&gt;</code>; because <code>moveItemInArray</code>/<code>transferArrayItem</code> mutate, I copy the affected arrays, apply the move and <code>set</code> a new object so OnPush/zoneless views update. Persistence is optimistic: update locally, PATCH, roll back to the saved previous board and announce on error. For ordering I'd use fractional ranks so a move writes one row and concurrent moves rarely conflict. WIP limits via <code>cdkDropListEnterPredicate</code>. Accessibility: a keyboard path ("Move to…" buttons or key handlers) and <code>LiveAnnouncer</code> messages. For real-time collaboration, apply remote moves immutably and queue them while a drag is in progress.</p>`,
    followUps: ['How do you handle two users moving the same card?', 'How would you virtualise very long columns?'] });

  registerModule({
    id: 'fe23',
    title: 'Angular Architecture & Machine Coding',
    lang: 'ts',
    intro: `<p>This module is about Angular at <b>company scale</b> and under <b>interview pressure</b>. First the architecture: how big Angular codebases are cut into <b>feature, ui, data-access and util libraries</b>, why smart and presentational components and <b>facades</b> keep teams independent, how <b>Nx</b> tags and module-boundary rules stop the codebase from turning into spaghetti, and when <b>micro-frontends</b> with Module Federation or Native Federation are worth their runtime cost. Then the cross-cutting concerns every senior Angular developer owns: <b>design systems</b> on the Angular CDK and Material 3 theming, <b>i18n</b> with <code>$localize</code> or runtime libraries, and <b>security</b> (sanitization, the danger of <code>bypassSecurityTrust*</code>, XSRF, CSP and Trusted Types).</p>
      <p>The last two topics are hands-on <b>machine-coding</b> build sheets for the features interviewers ask for most: a data table with sort/filter/pagination, infinite scroll, a multi-step form wizard, an autocomplete and a kanban board, each with a plan, a component breakdown, production-style Angular 17–20 code and the traps reviewers look for. Every topic starts with an everyday analogy, has a visual you can step through, and small runnable JavaScript models of the mechanism (a boundary checker, a version negotiator, a key manager, a sanitizer, a table pipeline, an immutable kanban move).</p>`,
    goals: [
      'Split a large Angular codebase into domain-scoped feature, ui, data-access and util libraries with one-way dependencies, and use smart/presentational components and facades correctly',
      'Configure Nx tags and @nx/enforce-module-boundaries depConstraints, and explain the project graph, affected commands and caching',
      'Decide between a monorepo and micro-frontends, and set up Native/Module Federation with shared singletons, a runtime manifest and graceful fallbacks',
      'Build accessible design-system components on the Angular CDK (Overlay, key managers, focus, drag-drop, virtual scroll) and theme Material 3 with mat.theme() and component overrides',
      'Implement i18n with i18n attributes, $localize, custom IDs and build-per-locale, and choose runtime alternatives (loadTranslations, Transloco) when needed',
      'Explain and apply Angular security: contextual sanitization, safe use of DomSanitizer, XSRF with HttpClient, CSP nonces/autoCsp and Trusted Types',
      'Deliver data table, infinite scroll, form wizard, autocomplete and kanban features in a 60–90 minute machine-coding round with a clear plan and component breakdown'
    ],
    prereqs: `Required: <b>Angular Routing, Forms &amp; Performance at Scale</b> (fe20) — standalone routing, lazy loading, typed reactive forms, OnPush/signals and the generic machine-coding plan are used everywhere here — and <b>Frontend Architecture at Scale</b> (fe15) — the framework-neutral ideas behind micro-frontends, design tokens, monorepos and i18n that this module applies to Angular. Comfort with RxJS operators (switchMap, debounceTime) and TypeScript generics helps.`,
    hours: 18,
    topics: topics,
    quiz: quiz,
    interview: interview,
    practice: practice
  });
})();
