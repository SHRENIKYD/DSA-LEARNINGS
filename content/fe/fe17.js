(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  var NGCHECK = false; // Angular code needs the Angular compiler and packages, so the validator skips compiling it.

  // An Angular TypeScript snippet (shown with highlighting, not executed).
  function ng(code, title) { return { lang: 'ts', code: code, title: title, check: NGCHECK }; }
  // An Angular template / HTML snippet (shown, not executed).
  function tpl(code, title) { return { lang: 'html', code: code, title: title, check: NGCHECK }; }
  // A shell snippet (Angular CLI commands).
  function sh(code, title) { return { lang: 'bash', code: code, title: title, check: NGCHECK }; }
  // A plain-JavaScript model of an idea. It really runs (console output only).
  function jsrun(code, title) { return { lang: 'js', code: code, title: title, run: true }; }
  // Split an input string into words.
  function words(input) { return String(input === undefined ? '' : input).trim().split(/[\s,]+/).filter(Boolean); }

  /* ======================= TOPIC 1: CLI & WORKSPACE ======================= */
  topics.push({
    title: 'Angular CLI, Workspace and Bootstrapping',
    analogy: `<p>The Angular CLI is a <b>restaurant kitchen manager</b>. You do not build the stoves, hire the cooks or design the menu cards yourself. You say "open a new restaurant" (<code>ng new</code>), "add a dessert station" (<code>ng generate component dessert</code>), "start serving" (<code>ng serve</code>) or "pack the food trucks" (<code>ng build</code>), and the manager sets everything up the same way every time.</p>
      <p>The <b>workspace</b> is the building, <code>angular.json</code> is the floor plan, and <code>main.ts</code> is the moment someone flips the "OPEN" sign.</p>`,
    explain: `<p><b>Angular</b> is a full frontend <i>framework</i> from Google. Unlike React (a library you assemble yourself), Angular ships routing, forms, an HTTP client, dependency injection, testing tools and a CLI in one box, with strong opinions on how a project should look. That is why many large companies (banks, airlines, enterprise SaaS) pick it: every Angular project looks familiar.</p>
      <h5>🟢 1. The CLI commands you must know</h5>
      ${H.table(['Command', 'What it does'], [
        ['<code>npm i -g @angular/cli</code>', 'installs the <code>ng</code> command'],
        ['<code>ng new shop</code>', 'creates a new workspace + app (asks about styles, SSR)'],
        ['<code>ng serve</code>', 'dev server with live reload at <code>localhost:4200</code>'],
        ['<code>ng generate component cart</code> (<code>ng g c cart</code>)', 'creates the component files and wiring'],
        ['<code>ng g service</code> / <code>pipe</code> / <code>directive</code> / <code>guard</code>', 'other building blocks'],
        ['<code>ng build</code>', 'production build into <code>dist/</code> (minified, tree-shaken, hashed file names)'],
        ['<code>ng test</code>, <code>ng lint</code>, <code>ng update</code>, <code>ng add</code>', 'tests, linting, version upgrades with code migrations, adding libraries']
      ])}
      <h5>🟢 2. What is inside a new project</h5>
      ${H.table(['File', 'Role'], [
        ['<code>angular.json</code>', 'workspace config: projects, build/serve/test targets, assets, styles, budgets'],
        ['<code>src/main.ts</code>', 'entry point: calls <code>bootstrapApplication(App, appConfig)</code>'],
        ['<code>src/app/app.config.ts</code>', 'app-wide <b>providers</b>: router, HTTP client, change detection setup'],
        ['<code>src/app/app.routes.ts</code>', 'the route table'],
        ['<code>src/app/app.ts</code> (older: <code>app.component.ts</code>)', 'the root component, rendered into <code>&lt;app-root&gt;</code> in <code>index.html</code>'],
        ['<code>tsconfig*.json</code>, <code>package.json</code>', 'TypeScript and npm settings']
      ])}
      <h5>🔵 3. How the app starts</h5>
      <p>The browser loads <code>index.html</code>, which contains an empty <code>&lt;app-root&gt;&lt;/app-root&gt;</code> tag. The bundled <code>main.ts</code> runs <code>bootstrapApplication(App, appConfig)</code>. Angular creates the root <b>injector</b> from the providers in <code>appConfig</code>, finds the element matching the root component's <code>selector</code>, creates the component and renders its template there. From then on, the app is a <b>tree of components</b>.</p>
      <p>Modern Angular (v17+) generates <b>standalone</b> apps: no <code>AppModule</code>. Older projects bootstrap with <code>platformBrowserDynamic().bootstrapModule(AppModule)</code>. You will meet both in interviews.</p>`,
    clues: [
      '"How do you create / run / build an Angular app?" → <code>ng new</code>, <code>ng serve</code>, <code>ng build</code>',
      '"What is angular.json?" → the workspace config file with build targets, assets, styles and budgets',
      '"What happens when an Angular app boots?" → <code>main.ts</code> → <code>bootstrapApplication</code> → root injector → root component into <code>&lt;app-root&gt;</code>',
      '"Where do you register the router / HttpClient in a standalone app?" → <code>providers</code> in <code>app.config.ts</code> (<code>provideRouter</code>, <code>provideHttpClient</code>)',
      '"How do you upgrade Angular versions safely?" → <code>ng update</code> runs schematics/migrations',
      '"Bundle too big" / "budgets exceeded" → the <code>budgets</code> section in angular.json'
    ],
    code: [
      sh(`# Install the CLI once, then create and run a project
npm install -g @angular/cli
ng new shop --style=scss --ssr=false   # standalone app by default (v17+)
cd shop
ng serve --open                        # http://localhost:4200, live reload

# Generate building blocks (short forms: g = generate, c = component)
ng g c product-card      # component (ts + html + scss + spec)
ng g s cart              # service
ng g p price             # pipe
ng g d highlight         # directive

ng build                 # production build into dist/shop
ng update @angular/core @angular/cli   # upgrade with automatic code migrations`, 'Angular CLI essentials'),
      ng(`// src/main.ts: the entry point
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));

// src/app/app.config.ts: app-wide providers (replaces most of the old AppModule)
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(), // log uncaught errors (recent CLI versions add this)
    provideRouter(routes),                 // the router
    provideHttpClient(),                   // HttpClient for API calls
  ],
};

// src/app/app.ts: the root component
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',            // matches <app-root> in index.html
  imports: [RouterOutlet],         // what this template uses
  template: \`
    <h1>Shop</h1>
    <router-outlet />
  \`,
})
export class App {}`, 'main.ts, app.config.ts and the root component'),
      jsrun(`// A tiny model of "bootstrapApplication": build a root injector from providers,
// then create the root component and render it into the host element.
function provide(name, factory) { return { name, factory }; }

function bootstrapApplication(RootComponent, config) {
  const injector = new Map();
  for (const p of config.providers) injector.set(p.name, p.factory());   // root injector
  console.log('1. root injector has:', [...injector.keys()].join(', '));
  const host = { tag: RootComponent.selector, html: '' };                 // <app-root> in index.html
  console.log('2. found host element <' + host.tag + '>');
  const instance = new RootComponent(injector);                          // create component
  host.html = instance.render();                                         // first render
  console.log('3. rendered:', host.html);
  return instance;
}

class App {
  static selector = 'app-root';
  constructor(injector) { this.title = 'Shop'; this.router = injector.get('Router'); }
  render() { return '<h1>' + this.title + '</h1><router-outlet>' + this.router.current + '</router-outlet>'; }
}

bootstrapApplication(App, {
  providers: [provide('Router', () => ({ current: '/home' })), provide('HttpClient', () => ({}))],
});`, 'Plain JS model: what bootstrapping does (runnable)')
    ],
    viz: {
      title: 'From ng serve to a rendered root component',
      input: 'Router HttpClient',
      inputLabel: 'Providers in app.config.ts (space separated, 0-4 names)',
      gen: function (input) {
        var prov = words(input);
        if (prov.length > 4) throw new Error('Use at most 4 provider names, e.g. "Router HttpClient"');
        var nodes = [
          { id: 'cli', label: 'ng serve', x: 8, y: 10, shape: 'box', w: 14 },
          { id: 'html', label: 'index.html', x: 30, y: 10, shape: 'box', w: 16 },
          { id: 'main', label: 'main.ts', x: 52, y: 10, shape: 'box', w: 14 },
          { id: 'cfg', label: 'app.config.ts', x: 52, y: 40, shape: 'box', w: 18 },
          { id: 'inj', label: 'root injector', x: 76, y: 40, shape: 'box', w: 18 },
          { id: 'root', label: '<app-root>', x: 76, y: 10, shape: 'box', w: 16 }
        ];
        var edges = [['cli', 'html'], ['html', 'main'], ['main', 'cfg'], ['cfg', 'inj'], ['main', 'root'], ['inj', 'root']];
        function g(hl, ehl) { return { type: 'graph', label: 'Boot sequence', directed: true, height: 55, nodes: nodes, edges: edges, hl: hl, ehl: ehl }; }
        var f = [];
        f.push({ narr: '<code>ng serve</code> compiles your TypeScript and templates (esbuild + Vite dev server) and serves the app at <code>localhost:4200</code>. Nothing Angular has run in the browser yet.', parts: [g({ cli: 'cur' }, {})] });
        f.push({ narr: 'The browser loads <code>index.html</code>. It contains an <b>empty</b> <code>&lt;app-root&gt;&lt;/app-root&gt;</code> tag and script tags for the bundle.', parts: [g({ cli: 'done', html: 'cur' }, { 'cli-html': 'cur' })] });
        f.push({ narr: 'The bundle runs <code>main.ts</code>, which calls <code>bootstrapApplication(App, appConfig)</code>.', parts: [g({ html: 'done', main: 'cur' }, { 'html-main': 'cur' }), { type: 'code', label: 'main.ts', lang: 'ts', code: "bootstrapApplication(App, appConfig);", hl: { 1: 'cur' } }] });
        f.push({ narr: 'Angular reads the <code>providers</code> in <code>appConfig</code>' + (prov.length ? ': ' + prov.map(H.esc).join(', ') : ' (none given, so only built-in services exist)') + '.', parts: [g({ main: 'done', cfg: 'cur' }, { 'main-cfg': 'cur' }), { type: 'set', label: 'providers', items: prov.length ? prov : ['(empty)'] }] });
        var items = [];
        for (var i = 0; i < prov.length; i++) {
          items.push(prov[i]);
          f.push({ narr: 'Register <b>' + H.esc(prov[i]) + '</b> in the <b>root injector</b>. Any component can later ask for it with <code>inject(' + H.esc(prov[i]) + ')</code> and gets the same single instance.', parts: [g({ cfg: 'done', inj: 'cur' }, { 'cfg-inj': 'cur' }), { type: 'set', label: 'root injector', items: items.slice(), hl: (function () { var o = {}; o[prov[i]] = 'ok'; return o; })() }] });
        }
        f.push({ narr: 'Angular finds the element matching the root component\'s <code>selector</code> (<code>app-root</code>), creates the <code>App</code> class and renders its template inside it.', parts: [g({ inj: 'done', root: 'cur' }, { 'main-root': 'cur', 'inj-root': 'ok' })] });
        f.push({ narr: 'Done: the page now shows the root component. Every other component is a child in its template, so the app is a <b>tree</b> rooted at <code>App</code>.', parts: [g({ cli: 'sel', html: 'sel', main: 'sel', cfg: 'sel', inj: 'sel', root: 'sel' }, {}), { type: 'tree', label: 'Component tree', arr: ['App', 'Header', 'RouterOutlet'], hl: { 0: 'sel' } }] });
        return f;
      }
    },
    examples: [
      { title: 'Generating a component', html: `<p><code>ng g c product-card</code> creates <code>product-card.ts</code>, <code>.html</code>, <code>.scss</code> and <code>.spec.ts</code> in its own folder. In a standalone app nothing else is edited: you just add <code>ProductCard</code> to the <code>imports</code> of the component that uses it. In an NgModule app the CLI also adds it to the nearest module's <code>declarations</code>. Recent CLI versions (v20+) drop the <code>.component</code> suffix from generated file and class names by default (<code>product-card.ts</code> / <code>ProductCard</code>); older ones produce <code>product-card.component.ts</code> / <code>ProductCardComponent</code>.</p>` },
      { title: 'Budgets stop accidental bloat', html: `<p>In <code>angular.json</code>, <code>"budgets": [{ "type": "initial", "maximumWarning": "500kB", "maximumError": "1MB" }]</code> makes <code>ng build</code> warn or fail when the initial bundle grows past a limit. Teams use this in CI so nobody quietly adds a 300 kB date library.</p>`, code: { lang: 'json', code: `{
  "budgets": [
    { "type": "initial", "maximumWarning": "500kB", "maximumError": "1MB" },
    { "type": "anyComponentStyle", "maximumWarning": "4kB", "maximumError": "8kB" }
  ]
}` } },
      { title: 'Environments and build configurations', html: `<p><code>ng build</code> uses the <code>production</code> configuration by default (optimisation on, source maps off). <code>ng serve</code> uses <code>development</code>. You can add <code>staging</code> with <code>fileReplacements</code> that swap <code>environment.ts</code> for <code>environment.staging.ts</code>, then run <code>ng build --configuration staging</code>. Never put secrets there: everything in a frontend bundle is public.</p>` },
      { title: 'Upgrading with ng update', html: `<p><code>ng update @angular/core @angular/cli</code> bumps versions <b>and</b> runs migrations (schematics) that rewrite your code, for example converting <code>*ngIf</code> to <code>@if</code> (<code>ng g @angular/core:control-flow</code>) or to standalone (<code>ng g @angular/core:standalone</code>). Upgrade one major version at a time and read update.angular.dev.</p>` }
    ],
    deepDive: `<h5>🟣 The build system</h5>
      <p>Since v17 new projects use the <b>application builder</b> (<code>@angular/build:application</code>), based on <b>esbuild</b> for bundling and <b>Vite</b> for the dev server. Older projects used Webpack (<code>@angular-devkit/build-angular:browser</code>). The switch made builds several times faster. The builder also handles SSR and prerendering when enabled.</p>
      <h5>🟣 AOT compilation</h5>
      <p>Angular templates are not interpreted at runtime. The <b>Ahead-of-Time (AOT)</b> compiler turns each template into JavaScript instructions (create element, bind property, listen to event) at build time. Benefits: template errors caught at build time (with <code>strictTemplates</code>, type errors too), smaller bundles because the compiler is not shipped, and faster startup. JIT (compile in the browser) is legacy and only used in some tests.</p>
      <h5>🟣 Workspaces and monorepos</h5>
      <p>One workspace can hold several <b>projects</b> (apps and libraries), created with <code>ng new --create-application=false</code> then <code>ng g application admin</code> and <code>ng g library ui-kit</code>. Large teams often use <b>Nx</b> on top for caching, affected-only builds and module boundary rules.</p>
      <h5>🟣 Change detection setup</h5>
      <p>Classic Angular uses <b>Zone.js</b>, which patches browser APIs (events, timers, promises) to know when to check the UI. Newer versions support <b>zoneless</b> change detection (<code>provideZonelessChangeDetection()</code>), where signals and events tell Angular exactly when to update; it is stable since v20 and the default for new projects from v21. Knowing that "app.config.ts decides change detection" is a strong interview signal.</p>`,
    aiEra: `<p><b>What AI changes:</b> Assistants scaffold a complete Angular app in one prompt and Angular itself publishes AI guidance (an <code>llms.txt</code>, best-practice rules files, and an MCP server in the CLI, <code>ng mcp</code>) so tools generate modern code. Typing <code>ng g c</code> is no longer the skill; knowing <b>what a correct modern project looks like</b> is.</p>
      <p><b>Use AI as a partner:</b> <code>Here is my angular.json and package.json. Which Angular version is this, which builder does it use, and what would ng update change?</code> or <code>Explain every provider in this app.config.ts</code>.</p>
      <p><b>Where AI goes wrong:</b> Models trained on years of old tutorials generate <code>AppModule</code>, <code>*ngIf</code>, <code>@Input()</code> decorators and Webpack configs for a brand-new v19+ project, or mix both styles in one file. They also invent CLI flags.</p>
      <p><b>What you must still own:</b> reading the version in <code>package.json</code>, knowing the boot sequence, and recognising legacy vs modern style so you can tell the AI (and your team) which one to use.</p>`,
    problems: [{
      title: 'Wire Up a Standalone App: main.ts and app.config.ts',
      level: 'Easy', tags: ['cli', 'bootstrap', 'providers'], companies: ['Accenture', 'Deloitte'],
      statement: `<p>A teammate deleted <code>main.ts</code> and <code>app.config.ts</code>. The app has a root component <code>App</code> (selector <code>app-root</code>), a <code>routes</code> array in <code>app.routes.ts</code>, and services that call APIs with <code>HttpClient</code>. Recreate both files so the app boots as a <b>standalone</b> application with routing and HTTP available everywhere.</p>`,
      constraints: `No NgModule. Providers must be registered once, at the application level. The root component must render a <code>&lt;router-outlet /&gt;</code>.`,
      example: `${H.table(['Symptom without the fix', 'Cause'], [['Blank page, console: "NG0400" style bootstrap error', 'nothing calls <code>bootstrapApplication</code>'], ['<code>NullInjectorError: No provider for HttpClient!</code>', '<code>provideHttpClient()</code> missing'], ['<code>&lt;router-outlet&gt;</code> renders nothing', '<code>provideRouter(routes)</code> missing or <code>RouterOutlet</code> not imported']])}
        <p>${H.c('g', 'Why')}: services are looked up in the injector; if nobody provided them, injection fails at runtime.</p>`,
      brute: { why: `<p>Provide <code>HttpClient</code> separately inside every component's <code>providers</code> array. Each component then gets its <b>own</b> instance (no shared interceptors or caching), and you repeat the wiring everywhere. App-wide services belong in the root injector.</p>`, code: ng(`// Anti-pattern: re-providing app-wide services per component
@Component({
  selector: 'app-products',
  providers: [provideHttpClient()],   // new HttpClient just for this subtree
  template: '...',
})
export class Products {}`, 'Providers in the wrong place') },
      mcq: { q: 'Where should <code>provideRouter(routes)</code> go in a standalone app?', options: ['In the root component\'s <code>imports</code> array', 'In the <code>providers</code> of the application config passed to <code>bootstrapApplication</code>', 'In <code>angular.json</code>', 'In every routed component'], answer: 1, explain: 'Router setup is an app-wide provider. It goes into ApplicationConfig.providers, which bootstrapApplication uses to build the root injector.' },
      hints: [
        `<p>Hint 1: Two different jobs: something must <b>start</b> the app (main.ts) and something must <b>list the app-wide services</b> (app.config.ts).</p>`,
        `<p>Hint 2: <code>bootstrapApplication(rootComponent, config)</code> from <code>@angular/platform-browser</code>; the config is an <code>ApplicationConfig</code> with a <code>providers</code> array.</p>`,
        `<p>Hint 3: Recipe: export <code>appConfig = { providers: [provideRouter(routes), provideHttpClient()] }</code>; in main.ts call <code>bootstrapApplication(App, appConfig).catch(console.error)</code>; make sure <code>App</code> imports <code>RouterOutlet</code>.</p>`
      ],
      solution: {
        approach: `<p><code>main.ts</code> only starts the app. <code>app.config.ts</code> collects app-wide providers using the <code>provideX()</code> functions. The root component imports <code>RouterOutlet</code> because its template uses <code>&lt;router-outlet /&gt;</code>. This is exactly what <code>ng new</code> generates.</p>`,
        code: ng(`// src/app/app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),          // router available everywhere
    provideHttpClient(withFetch()), // HttpClient (fetch backend, good for SSR)
  ],
};

// src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config';

bootstrapApplication(App, appConfig).catch((err) => console.error(err));

// src/app/app.ts
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class App {}`, 'Solution'),
        alt: [jsrun(`// Model: a missing provider gives the same error Angular gives.
function createInjector(providers) {
  const map = new Map(providers.map((p) => [p, { name: p }]));
  return { get(token) { if (!map.has(token)) throw new Error('NullInjectorError: No provider for ' + token + '!'); return map.get(token); } };
}
const broken = createInjector(['Router']);
try { broken.get('HttpClient'); } catch (e) { console.log(e.message); }
const fixed = createInjector(['Router', 'HttpClient']);
console.log('got', fixed.get('HttpClient').name, 'and the same one again:', fixed.get('HttpClient') === fixed.get('HttpClient'));`, 'Plain JS model (runnable)')],
        complexity: `<p>Startup cost is one injector creation plus the first render. One provider registration means one shared instance per app (a singleton).</p>`,
        followUps: ['How would you add an HTTP interceptor in this setup?', 'What does the equivalent NgModule-based main.ts look like?']
      }
    }]
  });

  /* ======================= TOPIC 2: STANDALONE COMPONENTS ======================= */
  topics.push({
    title: 'Standalone Components: Class + Template + Styles',
    analogy: `<p>A component is a <b>LEGO brick with its own instruction card</b>. The brick (TypeScript class) holds the data and behaviour, the instruction card (template) says what it looks like, and the paint (styles) only colours <i>this</i> brick. A <b>standalone</b> brick also carries a little list of the other bricks it snaps onto (<code>imports</code>), so you can use it anywhere without a separate catalogue.</p>`,
    explain: `<p>An Angular <b>component</b> is a TypeScript class with the <code>@Component</code> decorator. The decorator is metadata that tells Angular how to turn the class into UI.</p>
      ${H.table(['Metadata', 'Meaning'], [
        ['<code>selector</code>', 'the custom tag used to place it, e.g. <code>app-product-card</code> → <code>&lt;app-product-card /&gt;</code>'],
        ['<code>template</code> / <code>templateUrl</code>', 'inline HTML string, or a path to an <code>.html</code> file'],
        ['<code>styles</code> / <code>styleUrl</code>', 'CSS scoped to this component (by default)'],
        ['<code>imports</code>', 'other standalone components, directives and pipes this template uses'],
        ['<code>changeDetection</code>', '<code>ChangeDetectionStrategy.OnPush</code> for faster, more predictable updates'],
        ['<code>providers</code>', 'services with a fresh instance for this component and its children'],
        ['<code>host</code>', 'bindings on the component\'s own host element (classes, attributes, listeners)']
      ])}
      <h5>🟢 1. Class fields are what the template sees</h5>
      <p>Every public (or protected) field and method of the class is available inside the template. <code>title = "Cart"</code> in the class lets the template write <code>{{ title }}</code>. Modern Angular stores changing values in <b>signals</b>: <code>count = signal(0)</code>, read with <code>count()</code>, change with <code>count.set(1)</code> or <code>count.update(c =&gt; c + 1)</code>. Signals tell Angular precisely what changed.</p>
      <h5>🟢 2. "Standalone" means no NgModule needed</h5>
      <p>Before v14, every component had to be <i>declared</i> in an <code>NgModule</code>, and the module decided what the template could use. A <b>standalone</b> component lists its own dependencies in <code>imports</code>. Since v19, <code>standalone: true</code> is the default, so you do not write it at all. (Writing <code>standalone: false</code> opts back into NgModule declarations.)</p>
      <h5>🔵 3. Using one component inside another</h5>
      <p>To use <code>&lt;app-product-card&gt;</code> inside <code>ProductList</code>, add <code>ProductCard</code> to <code>ProductList</code>'s <code>imports</code>. Forget it, and the build fails with "<i>'app-product-card' is not a known element</i>". This explicit wiring is what makes standalone apps easy to lazy-load and tree-shake.</p>
      <h5>🔵 4. Style encapsulation</h5>
      <p>By default (<code>ViewEncapsulation.Emulated</code>) Angular adds unique attributes like <code>_ngcontent-abc-c12</code> to your elements and rewrites your CSS selectors to match only them. So <code>h2 { color: red }</code> in a card does not paint every <code>h2</code> on the page. <code>:host</code> styles the component's own tag. <code>None</code> makes styles global; <code>ShadowDom</code> uses real Shadow DOM.</p>`,
    clues: [
      '"is not a known element" → the child component is missing from <code>imports</code> (standalone) or <code>declarations</code>/<code>exports</code> (NgModule)',
      '"What does the @Component decorator do?" → attaches metadata: selector, template, styles, imports, change detection',
      '"Why do my styles not leak to other components?" → emulated view encapsulation with <code>_ngcontent</code> attributes',
      '"Style the component\'s own tag" → <code>:host</code> selector',
      '"What is a standalone component?" → declares its own dependencies in <code>imports</code>; default since v19',
      '"Make a component render faster / only when inputs change" → <code>ChangeDetectionStrategy.OnPush</code> + signals'
    ],
    code: [
      ng(`import { Component, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-cart-summary',                  // used as <app-cart-summary />
  imports: [CurrencyPipe],                       // the template uses the currency pipe
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <h2>{{ title }}</h2>
    <p>Items: {{ count() }}</p>
    <p>Total: {{ total() | currency:'INR' }}</p>
    <button (click)="add(499)">Add item</button>
  \`,
  styles: \`
    :host { display: block; padding: 1rem; border: 1px solid #ddd; }
    h2 { margin: 0; }   /* only affects THIS component's h2 */
  \`,
})
export class CartSummary {
  title = 'Your cart';                   // plain field: never changes
  private prices = signal<number[]>([]); // state lives in a signal
  count = computed(() => this.prices().length);
  total = computed(() => this.prices().reduce((sum, p) => sum + p, 0));

  add(price: number) {
    this.prices.update((list) => [...list, price]); // new array, signal notifies the view
  }
}`, 'A standalone component with signals'),
      jsrun(`// A tiny model of signals: read with s(), write with set/update, computed re-derives.
function signal(value) {
  const subs = new Set();
  const s = () => { if (signal.active) subs.add(signal.active); return value; };
  s.set = (v) => { if (Object.is(v, value)) return; value = v; subs.forEach((fn) => fn()); };
  s.update = (fn) => s.set(fn(value));
  return s;
}
function computed(fn) {
  let cached, dirty = true;
  const c = () => { if (dirty) { const prev = signal.active; signal.active = () => { dirty = true; }; cached = fn(); signal.active = prev; dirty = false; } return cached; };
  return c;
}
const prices = signal([]);
const total = computed(() => prices().reduce((a, b) => a + b, 0));
console.log('total', total());
prices.update((l) => [...l, 499]);
prices.update((l) => [...l, 250]);
console.log('total', total());
prices.set(prices());           // same reference: no notification
console.log('still', total());`, 'Plain JS model: signals and computed (runnable)')
    ],
    viz: {
      title: 'Emulated encapsulation: how Angular scopes component CSS',
      input: 'h2 p button',
      inputLabel: 'CSS selectors in the component styles (1-4 tag names)',
      gen: function (input) {
        var sels = words(input);
        if (!sels.length || sels.length > 4) throw new Error('Type 1 to 4 tag names, e.g. "h2 p button"');
        for (var i = 0; i < sels.length; i++) if (!/^[a-z][a-z0-9-]*$/.test(sels[i])) throw new Error('Use plain lowercase tag names like h2 or button');
        var attr = '_ngcontent-c1';
        var f = [];
        f.push({ narr: 'You wrote plain CSS in the component\'s <code>styles</code>. Written like this, it would normally hit <b>every</b> matching element on the page.', parts: [
          { type: 'table', label: 'Your CSS', columns: ['selector', 'rule'], rows: sels.map(function (s) { return [s, 'color: red']; }) }
        ] });
        f.push({ narr: 'At build time Angular gives this component a unique id and adds an attribute <code>' + attr + '</code> to <b>every element in its template</b>. The host tag gets <code>_nghost-c1</code>.', parts: [
          { type: 'table', label: 'Rendered DOM (this component)', columns: ['element', 'added attribute'], rows: [['app-cart-summary', '_nghost-c1']].concat(sels.map(function (s) { return [s, attr]; })) }
        ] });
        var rows = [];
        for (var j = 0; j < sels.length; j++) {
          rows.push([sels[j], sels[j] + '[' + attr + ']']);
          var hl = {}; hl[j] = 'ok';
          f.push({ narr: 'Rewrite selector <code>' + H.esc(sels[j]) + '</code> to <code>' + H.esc(sels[j]) + '[' + attr + ']</code>. Now it only matches elements that carry this component\'s attribute.', parts: [
            { type: 'table', label: 'Rewritten CSS', columns: ['you wrote', 'browser gets'], rows: rows.slice(), hl: hl }
          ] });
        }
        f.push({ narr: '<code>:host</code> becomes <code>[_nghost-c1]</code>, so it styles the component\'s own tag.', parts: [
          { type: 'table', label: 'Special selectors', columns: ['you wrote', 'browser gets'], rows: [[':host', '[_nghost-c1]'], [':host(.active)', '[_nghost-c1].active']] }
        ] });
        f.push({ narr: 'Result: a <code>' + H.esc(sels[0]) + '</code> in <b>another</b> component has a different attribute (<code>_ngcontent-c2</code>), so it is ' + H.c('g', 'not affected') + '. That is emulated encapsulation: scoping without real Shadow DOM.', parts: [
          { type: 'table', label: 'Who turns red?', columns: ['element', 'attribute', 'matches?'], rows: [[sels[0] + ' in CartSummary', attr, 'yes'], [sels[0] + ' in Header', '_ngcontent-c2', 'no']], hl: { 0: 'ok', 1: 'bad' } }
        ] });
        return f;
      }
    },
    examples: [
      { title: '"is not a known element"', html: `<p>You create <code>ProductCard</code> and use <code>&lt;app-product-card /&gt;</code> in <code>ProductList</code>'s template, but forget <code>imports: [ProductCard]</code>. The compiler fails: <i>NG8001: 'app-product-card' is not a known element</i>. Fix: add it to <code>imports</code>. The same error appears for missing pipes ("The pipe 'currency' could not be found") and directives.</p>`, code: ng(`@Component({
  selector: 'app-product-list',
  imports: [ProductCard],             // <- without this: NG8001
  template: '<app-product-card />',
})
export class ProductList {}`, 'The fix') },
      { title: 'Inline template vs templateUrl', html: `<p>Small components keep the HTML inline with <code>template</code> (a backtick string). Bigger ones use <code>templateUrl: "./product-card.html"</code> and <code>styleUrl: "./product-card.scss"</code>. There is no runtime difference: both are compiled ahead of time. Pick by readability.</p>` },
      { title: 'Selector naming', html: `<p>Use a prefix (<code>app-</code>, or your library's like <code>mat-</code>) and kebab-case: <code>app-user-avatar</code>. A dash is required for custom elements and avoids clashing with future HTML tags. Selectors can also be attributes (<code>[appTooltip]</code>), which is how most directives are used.</p>` },
      { title: 'Content projection with ng-content', html: `<p>A <code>Card</code> component can render whatever the caller puts between its tags using <code>&lt;ng-content /&gt;</code> (Angular's version of React's <code>children</code>). Named slots use <code>&lt;ng-content select="[card-title]" /&gt;</code>.</p>`, code: tpl(`<!-- card.html -->
<div class="card">
  <header><ng-content select="[card-title]" /></header>
  <ng-content />            <!-- everything else -->
</div>

<!-- usage -->
<app-card>
  <h3 card-title>Order #42</h3>
  <p>Shipped yesterday.</p>
</app-card>`, 'Content projection') }
    ],
    deepDive: `<h5>🟣 What the decorator compiles into</h5>
      <p>The AOT compiler turns <code>@Component</code> into a static field on the class (<code>ɵcmp</code>) holding a <b>component definition</b>: the selector, inputs/outputs, a <code>template</code> function made of instructions (create element, text, property binding, listener) and the list of dependencies. At runtime Angular's renderer (Ivy) runs that function in two modes: <b>creation</b> (build DOM once) and <b>update</b> (re-evaluate bindings and patch only what changed). No virtual DOM is involved; Angular compares each binding's previous value with the new one.</p>
      <h5>🟣 Change detection in one paragraph</h5>
      <p>With the default strategy and Zone.js, after any event, timer or HTTP response Angular checks every component from the root down. With <code>OnPush</code>, a component is checked only when an input changes reference, an event happens inside it, an <code>async</code> pipe emits, or a signal read in its template changes. Signals go further: Angular knows exactly which views read a changed signal. That is why modern guidance is "signals + OnPush everywhere".</p>
      <h5>🟣 Standalone and the compilation scope</h5>
      <p>Every template is compiled against a <b>compilation scope</b>: the set of components, directives and pipes it may use. For a standalone component, the scope is its own <code>imports</code>. For an NgModule-declared component, the scope is everything declared in or exported to that module. Standalone makes the dependency graph explicit per file, which helps tree-shaking, lazy loading (<code>loadComponent</code>) and tooling.</p>
      <h5>🟣 Host element</h5>
      <p>The component's tag (<code>&lt;app-cart-summary&gt;</code>) stays in the DOM and is <code>display: inline</code> by default, a common layout surprise. Set <code>:host { display: block }</code>. Use the <code>host</code> metadata (<code>host: { class: "card", "[class.active]": "active()" }</code>) instead of the older <code>@HostBinding</code>/<code>@HostListener</code> decorators.</p>`,
    aiEra: `<p><b>What AI changes:</b> Generating a component file is instant. The value you add is choosing <b>boundaries</b> (what is one component), keeping state in signals, and making it OnPush.</p>
      <p><b>Use AI as a partner:</b> <code>Convert this NgModule component to standalone, list what must move to imports, and keep behaviour identical</code> or <code>Review this component: which fields should be signals or computed?</code></p>
      <p><b>Where AI goes wrong:</b> It still writes <code>standalone: true</code> everywhere (harmless but outdated in v19+), mixes <code>@Input()</code> with <code>input()</code>, forgets to add children to <code>imports</code>, sets <code>ViewEncapsulation.None</code> to "fix" a style issue and leaks CSS globally, or puts heavy logic into the constructor.</p>
      <p><b>What you must still own:</b> explaining the compilation scope, encapsulation and change detection strategy, and spotting a missing import from the error code in seconds.</p>`,
    problems: [{
      title: 'Build a Reusable ProductCard and Use It in a List',
      level: 'Easy', tags: ['standalone', 'component', 'imports'], companies: ['Infosys', 'Wipro'],
      statement: `<p>Create a standalone <code>ProductCard</code> (selector <code>app-product-card</code>) that shows a product name and price with a scoped style (a light border). Then create <code>ProductList</code> that shows two cards. For now the card shows hard-coded data (inputs come in a later topic). The page must compile and the card's border must <b>not</b> affect other elements.</p>`,
      constraints: `Standalone components only. Use <code>imports</code> for dependencies. Use component <code>styles</code> with <code>:host</code>. OnPush change detection.`,
      example: `${H.table(['Template', 'Result'], [['<code>&lt;app-product-card /&gt;&lt;app-product-card /&gt;</code>', 'two bordered cards: "Keyboard — ₹2,499.00"'], ['missing <code>imports: [ProductCard]</code>', 'build error NG8001']])}`,
      brute: { why: `<p>Paste the card HTML twice into <code>ProductList</code> and put the CSS in the global <code>styles.scss</code>. It "works" but duplicates markup and the global <code>.card</code> rule can clash with any other <code>.card</code> on the site.</p>`, code: tpl(`<!-- product-list.html: duplicated markup -->
<div class="card"><h3>Keyboard</h3><p>₹2,499.00</p></div>
<div class="card"><h3>Keyboard</h3><p>₹2,499.00</p></div>
<!-- styles.scss (global): .card { border: 1px solid #ccc } -->`, 'Copy-paste + global CSS') },
      mcq: { q: 'You use <code>&lt;app-product-card&gt;</code> in ProductList and get NG8001. What is the fix?', options: ['Add <code>standalone: true</code> to ProductList', 'Add <code>ProductCard</code> to ProductList\'s <code>imports</code>', 'Rename the selector to start with <code>ng-</code>', 'Restart ng serve'], answer: 1, explain: 'A standalone template only knows what it imports. Add the component class to imports.' },
      hints: [
        `<p>Hint 1: Two components: the reusable one (card) and the one that uses it (list). The list must explicitly <i>import</i> the card.</p>`,
        `<p>Hint 2: Put the border in the card's own <code>styles</code> on <code>:host</code>. Emulated encapsulation keeps it from leaking.</p>`,
        `<p>Hint 3: Recipe: <code>@Component({ selector: "app-product-card", template, styles: ":host{display:block;border:1px solid #ddd}" })</code>; then <code>@Component({ imports: [ProductCard], template: "&lt;app-product-card /&gt; x2" })</code>.</p>`
      ],
      solution: {
        approach: `<p>The card owns its markup and styles. <code>:host</code> styles the card tag itself and needs <code>display:block</code> because custom elements are inline by default. The list imports the card. Inputs to pass different products are added in the inputs topic.</p>`,
        code: ng(`import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-product-card',
  imports: [CurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <h3>{{ name }}</h3>
    <p>{{ price | currency:'INR' }}</p>
  \`,
  styles: \`
    :host { display: block; border: 1px solid #ddd; border-radius: 8px; padding: 12px; }
    h3 { margin: 0 0 4px; }
  \`,
})
export class ProductCard {
  name = 'Keyboard';
  price = 2499;
}

@Component({
  selector: 'app-product-list',
  imports: [ProductCard],                 // makes <app-product-card> known
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <app-product-card />
    <app-product-card />
  \`,
  styles: ':host { display: grid; gap: 12px; }',
})
export class ProductList {}`, 'Solution'),
        alt: [jsrun(`// Model of the compile-time scope check that produces NG8001.
function compile(component) {
  const used = [...component.template.matchAll(/<(app-[a-z-]+)/g)].map((m) => m[1]);
  const known = new Set(component.imports.map((c) => c.selector));
  for (const tag of used) if (!known.has(tag)) return 'NG8001: ' + tag + ' is not a known element';
  return 'compiled OK, uses ' + used.length + ' child component(s)';
}
const ProductCard = { selector: 'app-product-card' };
console.log(compile({ template: '<app-product-card /><app-product-card />', imports: [] }));
console.log(compile({ template: '<app-product-card /><app-product-card />', imports: [ProductCard] }));`, 'Plain JS model (runnable)')],
        complexity: `<p>Each card is a separate view; creation is O(number of cards). OnPush means the cards are not re-checked unless their inputs or signals change.</p>`,
        followUps: ['How would you let the caller put custom content (a badge) inside the card?', 'What changes if you set ViewEncapsulation.None?']
      }
    }]
  });

  /* ======================= TOPIC 3: BINDINGS ======================= */
  topics.push({
    title: 'Data Binding: Interpolation, Property, Event and Two-Way',
    analogy: `<p>Think of a <b>car dashboard</b>. The speedometer only <i>shows</i> what the engine says (data flows engine → display: interpolation and property binding). The pedals only <i>send</i> signals from you to the engine (event binding). The air-conditioning knob does both: you turn it, and it also shows the current setting (two-way binding). Angular's binding syntax is just the shape of the arrow: <code>[ ]</code> into the view, <code>( )</code> out of the view, <code>[( )]</code> both ways ("banana in a box").</p>`,
    explain: `<p>Templates connect the class (data) and the DOM (what the user sees) with <b>bindings</b>. There are four kinds, and the brackets tell you the direction.</p>
      ${H.table(['Syntax', 'Name', 'Direction', 'Example'], [
        ['<code>{{ expr }}</code>', 'Interpolation', 'class → text', '<code>&lt;h1&gt;Hi {{ user().name }}&lt;/h1&gt;</code>'],
        ['<code>[prop]="expr"</code>', 'Property binding', 'class → DOM property / input', '<code>&lt;img [src]="photoUrl"&gt;</code>, <code>[disabled]="saving()"</code>'],
        ['<code>(event)="stmt"</code>', 'Event binding', 'DOM → class', '<code>(click)="save()"</code>, <code>(keyup.enter)="search()"</code>'],
        ['<code>[(x)]="value"</code>', 'Two-way binding', 'both', '<code>&lt;input [(ngModel)]="query"&gt;</code>']
      ])}
      <h5>🟢 1. Interpolation</h5>
      <p><code>{{ }}</code> evaluates a <b>template expression</b> and inserts the result as <b>text</b>. Angular escapes it, so <code>&lt;script&gt;</code> in a user name shows as text and never runs. Expressions can call methods, read signals (<code>count()</code>), use ternaries and pipes, but cannot use assignments, <code>new</code>, or <code>++</code>.</p>
      <h5>🟢 2. Property binding: brackets mean "evaluate this"</h5>
      <p><code>[disabled]="isSaving"</code> sets the DOM <b>property</b> <code>disabled</code> to the value of the expression. Without brackets, <code>disabled="isSaving"</code> would just be the string "isSaving". Variants: <code>[attr.aria-label]="label"</code> for HTML <b>attributes</b> that have no property (ARIA, <code>colspan</code>), <code>[class.active]="isActive"</code> to toggle one class, <code>[style.width.px]="w"</code> for one style with a unit.</p>
      <h5>🟢 3. Event binding</h5>
      <p><code>(click)="add(item)"</code> runs a <b>template statement</b> when the event fires. <code>$event</code> is the native event (or the emitted value for component outputs). Key filters are built in: <code>(keydown.enter)</code>, <code>(keydown.escape)</code>, <code>(keydown.shift.tab)</code>.</p>
      <h5>🔵 4. Two-way binding is sugar</h5>
      <p><code>[(ngModel)]="name"</code> is exactly <code>[ngModel]="name" (ngModelChange)="name = $event"</code>. Any component can support <code>[(x)]</code> by having an input <code>x</code> and an output <code>xChange</code>; modern Angular does both at once with <code>x = model()</code>. <code>ngModel</code> lives in <code>FormsModule</code>, so add that to <code>imports</code>. With a signal you can write <code>[(ngModel)]="query"</code> where <code>query = signal("")</code>: Angular reads and writes the signal for you.</p>
      <h5>🔵 5. Template reference variables</h5>
      <p><code>&lt;input #box&gt;</code> gives the element a name you can use elsewhere in the template: <code>(click)="search(box.value)"</code>. On a component tag, <code>#ref</code> points to the component instance.</p>`,
    clues: [
      '"Difference between [ ] and ( ) and [( )]" → into the view, out of the view, both ways ("banana in a box")',
      '"Can\'t bind to \'ngModel\' since it isn\'t a known property of \'input\'" → import <code>FormsModule</code>',
      '"Property vs attribute binding" → <code>[value]</code> sets the DOM property; <code>[attr.x]</code> for attributes without a property (ARIA, colspan)',
      '"Toggle a CSS class conditionally" → <code>[class.active]="cond"</code> or <code>[class]="{...}"</code>',
      '"Press Enter to submit" → <code>(keydown.enter)</code> key event filter',
      '"How does two-way binding work under the hood?" → <code>[x]</code> + <code>(xChange)</code>, or <code>model()</code>'
    ],
    code: [
      ng(`import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-search-box',
  imports: [FormsModule],                       // needed for ngModel
  template: \`
    <!-- interpolation: class -> text (escaped) -->
    <h2>Search {{ items.length }} products</h2>

    <!-- two-way: the input and the signal stay in sync -->
    <input [(ngModel)]="query" placeholder="Type to filter"
           (keydown.escape)="query.set('')" />

    <!-- property, attribute, class and style bindings -->
    <button [disabled]="!query()"
            [attr.aria-label]="'Clear search for ' + query()"
            [class.primary]="query().length > 2"
            [style.opacity]="query() ? 1 : 0.5"
            (click)="query.set('')">Clear</button>

    <p>{{ matches().length }} match(es)</p>

    <!-- template reference variable -->
    <input #note /> <button (click)="log(note.value)">Log note</button>
  \`,
})
export class SearchBox {
  items = ['Keyboard', 'Mouse', 'Monitor', 'Webcam'];
  query = signal('');
  matches = computed(() =>
    this.items.filter((i) => i.toLowerCase().includes(this.query().toLowerCase())));

  log(text: string) { console.log('note:', text); }
}`, 'All four binding kinds in one component'),
      jsrun(`// Two-way binding is just "property in" + "event out". A model:
function makeInput() {
  const listeners = [];
  return {
    value: '',
    on(fn) { listeners.push(fn); },
    type(text) { this.value = text; listeners.forEach((fn) => fn(text)); }, // user typing fires (input)
  };
}
const component = { query: 'mouse' };
const input = makeInput();

// [ngModel]="query"  -> write the class value into the DOM
input.value = component.query;
// (ngModelChange)="query = $event" -> write DOM changes back into the class
input.on((v) => { component.query = v; });

console.log('start  input:', input.value, '| class:', component.query);
input.type('monitor');
console.log('typed  input:', input.value, '| class:', component.query);
component.query = 'webcam'; input.value = component.query;  // change detection pushes it back
console.log('code   input:', input.value, '| class:', component.query);`, 'Plain JS model: two-way = property + event (runnable)')
    ],
    viz: {
      title: 'Which way does the data flow? Step through four bindings',
      input: 'Asha',
      inputLabel: 'Name the user types (1-12 characters)',
      gen: function (input) {
        var name = String(input === undefined ? '' : input).trim();
        if (!name || name.length > 12) throw new Error('Type a name between 1 and 12 characters');
        var src = '<h1>Hello {{ name() }}</h1>\n<input [(ngModel)]="name" />\n<button [disabled]="!name()"\n        (click)="greet()">Greet</button>\n<p>{{ message() }}</p>';
        var nodes = [{ id: 'cls', label: 'class (signals)', x: 15, y: 25, shape: 'box', w: 22 }, { id: 'dom', label: 'DOM (view)', x: 80, y: 25, shape: 'box', w: 18 }];
        function g(e, hl) { return { type: 'graph', label: 'Direction', directed: true, height: 50, nodes: nodes, edges: e, hl: hl || {} }; }
        var f = [];
        f.push({ narr: 'Start: <code>name = signal("")</code>, <code>message = signal("")</code>. Interpolation <code>{{ name() }}</code> renders an empty greeting. Data flows <b>class → view</b>.', parts: [
          { type: 'code', label: 'Template', lang: 'html', code: src, hl: { 1: 'cur' } }, g([['cls', 'dom', '{{ }}']], { cls: 'cur' }), { type: 'vars', label: 'class state', vals: { name: '""', message: '""' } }] });
        f.push({ narr: 'Property binding <code>[disabled]="!name()"</code> evaluates to <b>true</b>, so the Greet button is disabled. Brackets = evaluate the expression and set the DOM property.', parts: [
          { type: 'code', label: 'Template', lang: 'html', code: src, hl: { 3: 'cur' } }, g([['cls', 'dom', '[disabled]']], { dom: 'cur' }), { type: 'vars', label: 'DOM properties', vals: { 'button.disabled': true } }] });
        var typed = '';
        for (var i = 0; i < name.length && i < 4; i++) {
          typed = name.slice(0, i + 1);
          f.push({ narr: 'User types "<b>' + H.esc(typed) + '</b>". The <code>(ngModelChange)</code> half of <code>[(ngModel)]</code> writes it <b>back into the signal</b> (view → class).', parts: [
            { type: 'code', label: 'Template', lang: 'html', code: src, hl: { 2: 'cur' } }, g([['dom', 'cls', 'ngModelChange']], { cls: 'ok' }), { type: 'vars', label: 'class state', vals: { name: '"' + typed + '"' }, hl: { name: 'ok' } }] });
        }
        typed = name;
        f.push({ narr: 'The signal changed, so Angular re-evaluates only the bindings that read it: the heading becomes "Hello ' + H.esc(name) + '" and <code>[disabled]</code> becomes false.', parts: [
          { type: 'code', label: 'Template', lang: 'html', code: src, hl: { 1: 'ok', 3: 'ok' } }, g([['cls', 'dom', 'update']], { dom: 'ok' }), { type: 'vars', label: 'DOM', vals: { h1: 'Hello ' + name, 'button.disabled': false }, hl: { h1: 'ok' } }] });
        f.push({ narr: 'User clicks Greet. Event binding <code>(click)="greet()"</code> runs a <b>statement</b> in the class (view → class). <code>greet()</code> sets <code>message</code>.', parts: [
          { type: 'code', label: 'Template', lang: 'html', code: src, hl: { 4: 'cur' } }, g([['dom', 'cls', '(click)']], { cls: 'cur' }), { type: 'vars', label: 'class state', vals: { name: '"' + name + '"', message: '"Welcome, ' + name + '!"' }, hl: { message: 'ok' } }] });
        f.push({ narr: 'The <code>{{ message() }}</code> interpolation updates. Summary: <b>[ ]</b> and <b>{{ }}</b> push data in, <b>( )</b> sends events out, <b>[( )]</b> does both.', parts: [
          { type: 'code', label: 'Template', lang: 'html', code: src, hl: { 5: 'sel' } }, g([['cls', 'dom', '[ ] {{ }}'], ['dom', 'cls', '( )']], { cls: 'sel', dom: 'sel' })] });
        return f;
      }
    },
    examples: [
      { title: 'Property vs attribute: the value trap', html: `<p><code>&lt;input value="Asha"&gt;</code> sets the <b>attribute</b> (the initial value). When the user types, the <b>property</b> <code>input.value</code> changes but the attribute stays "Asha". Angular's <code>[value]</code> binds the property, which is what you want. Use <code>[attr.x]</code> only for things that are not properties: <code>[attr.aria-expanded]</code>, <code>[attr.colspan]</code>, <code>[attr.data-id]</code>.</p>` },
      { title: 'Missing FormsModule', html: `<p>Error: <i>Can't bind to 'ngModel' since it isn't a known property of 'input'</i>. <code>ngModel</code> is a directive from <code>FormsModule</code>; add it to the component's <code>imports</code>. For bigger forms prefer Reactive Forms (or the newer signal-based forms) covered in later modules.</p>` },
      { title: 'Building your own two-way binding with model()', html: `<p>A star rating that the parent can bind with <code>[(rating)]="stars"</code>: declare <code>rating = model(0)</code> in the child and call <code>this.rating.set(n)</code> when a star is clicked. Angular wires the <code>ratingChange</code> output for you.</p>`, code: ng(`@Component({
  selector: 'app-stars',
  template: \`
    @for (n of [1, 2, 3, 4, 5]; track n) {
      <button (click)="rating.set(n)" [class.on]="n <= rating()">★</button>
    }
  \`,
})
export class Stars {
  rating = model(0);   // input "rating" + output "ratingChange"
}

// parent template: <app-stars [(rating)]="stars" />   where stars = signal(3)`, 'model() for custom two-way binding') },
      { title: '$event and passing values', html: `<p><code>(input)="onType($event)"</code> passes the DOM <code>Event</code>; in the method use <code>(e.target as HTMLInputElement).value</code>. Simpler: use a template variable, <code>&lt;input #q (input)="onType(q.value)"&gt;</code>, which keeps the class free of DOM types.</p>` }
    ],
    deepDive: `<h5>🟣 Template expressions are restricted on purpose</h5>
      <p>Template expressions cannot assign, use <code>new</code>, <code>++</code>, bitwise operators or reach globals like <code>window</code> or <code>console</code> (only the component's members and template variables). They should be <b>cheap and side-effect free</b>, because Angular may evaluate them on every change detection pass. In dev mode Angular runs an extra check and throws <code>ExpressionChangedAfterItHasBeenCheckedError</code> (NG0100) if a value changed between the check and the verification, which usually means an expression or a lifecycle hook is mutating state.</p>
      <h5>🟣 Calling methods in templates</h5>
      <p><code>{{ total() }}</code> where <code>total</code> is a normal method runs on every check of that component. With <code>computed()</code> signals the value is memoised and only recalculated when its inputs change, so "never call methods in templates" has become "call signals freely, avoid expensive plain methods".</p>
      <h5>🟣 Security: sanitisation</h5>
      <p>Interpolation is always text. Binding <code>[innerHTML]</code> passes through Angular's <b>DomSanitizer</b>, which strips scripts and dangerous URLs (<code>javascript:</code>). <code>[src]</code>/<code>[href]</code> are URL-sanitised. <code>bypassSecurityTrustHtml</code> turns this off and is an XSS risk unless the content is trusted.</p>
      <h5>🟣 Binding precedence and host bindings</h5>
      <p>When a template binds <code>[class.x]</code> and the component's <code>host</code> also binds classes, Angular merges them by a defined precedence (template bindings win over host bindings, specific <code>[class.x]</code> over map bindings). Strict template type checking (<code>strictTemplates</code>) type-checks every binding against the input types, catching typos and wrong types at build time.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI writes bindings correctly most of the time; your job is reviewing direction, performance and security.</p>
      <p><b>Use AI as a partner:</b> <code>List every binding in this template, its direction and how often it is evaluated</code>, or <code>Find any binding that could cause XSS or ExpressionChangedAfterItHasBeenChecked</code>.</p>
      <p><b>Where AI goes wrong:</b> it uses <code>[innerHTML]</code> with <code>bypassSecurityTrustHtml</code> to "make it work", forgets <code>FormsModule</code>, calls heavy methods in interpolation, uses <code>disabled="{{ x }}"</code> (string interpolation into a property) or mixes <code>[(ngModel)]</code> with reactive form controls on the same input.</p>
      <p><b>What you must still own:</b> reading <code>[(x)]</code> as <code>[x]</code> + <code>(xChange)</code>, knowing property vs attribute, and keeping expressions pure and cheap.</p>`,
    problems: [{
      title: 'Live Character Counter for a Tweet Box',
      level: 'Easy', tags: ['two-way binding', 'property binding', 'signals'], companies: ['Twitter/X', 'Zoho'],
      statement: `<p>Build <code>TweetBox</code>: a textarea bound two-way to a signal, a counter "<i>n</i> / 280", the counter turns red (class <code>over</code>) above 280, and a <b>Post</b> button disabled when the text is empty (after trimming) or over the limit. Clicking Post logs the text and clears the box.</p>`,
      constraints: `Use <code>[(ngModel)]</code> with a signal, <code>computed</code> for derived values, <code>[class.over]</code>, <code>[disabled]</code>, <code>(click)</code>.`,
      example: `${H.table(['Text length', 'Counter', 'Button'], [['0', '0 / 280', 'disabled'], ['12', '12 / 280', 'enabled'], ['281', '<span class="c-r">281 / 280</span>', 'disabled']])}`,
      brute: { why: `<p>Listen to <code>(input)</code>, store the text, and also store <code>count</code>, <code>isOver</code> and <code>canPost</code> as separate fields updated in the handler. Four pieces of state for one fact; miss one update and the UI lies.</p>`, code: ng(`export class BadTweetBox {
  text = ''; count = 0; isOver = false; canPost = false;
  onInput(e: Event) {
    this.text = (e.target as HTMLTextAreaElement).value;
    this.count = this.text.length;          // must remember to update...
    this.isOver = this.count > 280;         // ...each of these...
    this.canPost = !!this.text.trim() && !this.isOver; // ...every time
  }
}`, 'Duplicated state') },
      mcq: { q: 'What is <code>[(ngModel)]="text"</code> shorthand for?', options: ['<code>[ngModel]="text"</code> only', '<code>[ngModel]="text" (ngModelChange)="text = $event"</code>', '<code>(input)="text"</code>', '<code>{{ text }}</code>'], answer: 1, explain: 'Banana-in-a-box combines a property binding and an event binding named with the Change suffix.' },
      hints: [
        `<p>Hint 1: There is only <b>one</b> real piece of state: the text. Everything else is derived from it.</p>`,
        `<p>Hint 2: <code>text = signal("")</code> bound with <code>[(ngModel)]</code>; <code>length</code>, <code>over</code>, <code>canPost</code> are <code>computed()</code>.</p>`,
        `<p>Hint 3: Template: textarea <code>[(ngModel)]="text"</code>; <code>&lt;span [class.over]="over()"&gt;{{ length() }} / 280&lt;/span&gt;</code>; button <code>[disabled]="!canPost()" (click)="post()"</code>; <code>post()</code> logs and calls <code>text.set("")</code>. Import FormsModule.</p>`
      ],
      solution: {
        approach: `<p>Store the text once; derive the rest with <code>computed</code>, which is memoised and always consistent. Property bindings push the derived values into the DOM; the event binding calls <code>post()</code>.</p>`,
        code: ng(`import { Component, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-tweet-box',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <textarea [(ngModel)]="text" rows="3" aria-label="Tweet text"></textarea>
    <span [class.over]="over()">{{ length() }} / {{ limit }}</span>
    <button [disabled]="!canPost()" (click)="post()">Post</button>
  \`,
  styles: '.over { color: crimson; font-weight: bold; }',
})
export class TweetBox {
  readonly limit = 280;
  text = signal('');
  length = computed(() => this.text().length);
  over = computed(() => this.length() > this.limit);
  canPost = computed(() => this.text().trim().length > 0 && !this.over());

  post() {
    console.log('posted:', this.text());
    this.text.set('');
  }
}`, 'Solution'),
        alt: [jsrun(`const limit = 280;
const view = (text) => {
  const len = text.length, over = len > limit, canPost = text.trim().length > 0 && !over;
  return len + ' / ' + limit + (over ? ' (red)' : '') + ' | Post ' + (canPost ? 'enabled' : 'disabled');
};
for (const t of ['', '   ', 'Hello Angular', 'x'.repeat(281)]) console.log(JSON.stringify(t.slice(0, 15)), '->', view(t));`, 'Plain JS model (runnable)')],
        complexity: `<p>O(n) per keystroke for <code>trim()</code> and length, n ≤ a few hundred. Computed signals recalculate only when <code>text</code> changes.</p>`,
        followUps: ['Count emoji correctly (hint: grapheme clusters, Intl.Segmenter).', 'Post on Ctrl+Enter.']
      }
    }]
  });

  /* ======================= TOPIC 4: CONTROL FLOW ======================= */
  topics.push({
    title: 'Built-in Control Flow: @if, @for, @switch (and *ngIf/*ngFor)',
    analogy: `<p>A template is a <b>printed menu</b>; control flow is the waiter's rules for which pages to show. <code>@if</code>: "show the dessert page only if the kitchen is open". <code>@for</code>: "print one line per dish". <code>@switch</code>: "show the breakfast, lunch or dinner page depending on the time". The <code>track</code> in <code>@for</code> is the <b>dish number</b>: if the chef reorders the menu, the waiter moves lines by number instead of reprinting the whole page.</p>`,
    explain: `<p>Angular 17 added <b>built-in control flow</b> blocks to templates. They replace the older structural directives <code>*ngIf</code>, <code>*ngFor</code> and <code>[ngSwitch]</code> (deprecated since v20) and need <b>no imports</b>.</p>
      <h5>🟢 1. @if / @else if / @else</h5>
      <p>Renders a block only when the condition is truthy. When the condition becomes false, the block's elements and child components are <b>destroyed</b> (not hidden). <code>@if (user(); as u)</code> stores the result in a local alias.</p>
      <h5>🟢 2. @for with track and @empty</h5>
      <p><code>@for (item of items(); track item.id) { ... } @empty { ... }</code>. <b><code>track</code> is required</b>: it gives each row an identity so Angular can reuse DOM for the same item when the list changes. Use a unique id; use <code>$index</code> only for static lists. Built-in variables: <code>$index</code>, <code>$first</code>, <code>$last</code>, <code>$even</code>, <code>$odd</code>, <code>$count</code>. <code>@empty</code> renders when the list has zero items.</p>
      <h5>🟢 3. @switch</h5>
      <p><code>@switch (status()) { @case ("loading") {...} @case ("error") {...} @default {...} }</code>. Cases compare with <code>===</code>; there is no fall-through.</p>
      <h5>🔵 4. @let and @defer (good to know)</h5>
      <p><code>@let total = price() * qty();</code> declares a read-only template variable (v18.1+). <code>@defer (on viewport) { &lt;heavy-chart /&gt; } @placeholder { ... }</code> lazy-loads a block's code only when needed, which shrinks the initial bundle.</p>
      <h5>🔵 5. The old syntax interviewers still ask about</h5>
      ${H.table(['Modern', 'Legacy equivalent'], [
        ['<code>@if (cond) { A } @else { B }</code>', '<code>&lt;div *ngIf="cond; else other"&gt;A&lt;/div&gt;&lt;ng-template #other&gt;B&lt;/ng-template&gt;</code>'],
        ['<code>@for (x of xs; track x.id; let i = $index)</code>', '<code>*ngFor="let x of xs; trackBy: byId; let i = index"</code>'],
        ['<code>@switch (v) { @case (1) {...} }</code>', '<code>[ngSwitch]="v"</code> + <code>*ngSwitchCase="1"</code>'],
        ['no import', '<code>NgIf</code>/<code>NgFor</code> or <code>CommonModule</code> in imports']
      ])}
      <p>The <code>*</code> is sugar: <code>*ngIf="x"</code> wraps the element in an <code>&lt;ng-template [ngIf]="x"&gt;</code>. Only one structural directive per element was allowed, which forced extra <code>&lt;ng-container&gt;</code> wrappers. The new blocks fix that and run faster.</p>`,
    clues: [
      '"Show X only when ..." → <code>@if</code>; "otherwise show Y" → <code>@else</code>',
      '"Render a list" / "empty state when no results" → <code>@for ... @empty</code>',
      '"Why is track mandatory?" / "list re-renders all rows" → identity for DOM reuse (old: <code>trackBy</code>)',
      '"Can\'t have multiple template bindings on one element" → old structural directive limit; use <code>ng-container</code> or new blocks',
      '"Loading / error / success states" → <code>@switch</code> on a status signal',
      '"Lazy-load a heavy widget below the fold" → <code>@defer (on viewport)</code>',
      '"What does the asterisk in *ngIf mean?" → shorthand for <code>&lt;ng-template&gt;</code>'
    ],
    code: [
      tpl(`<!-- status = signal<'loading' | 'error' | 'ready'>('loading') -->
@switch (status()) {
  @case ('loading') { <p>Loading…</p> }
  @case ('error')   { <p class="err">Could not load orders.</p> }
  @default {
    @let count = orders().length;
    <h2>{{ count }} order(s)</h2>

    <ul>
      @for (o of orders(); track o.id; let i = $index, last = $last) {
        <li [class.last]="last">
          {{ i + 1 }}. {{ o.item }}
          @if (o.shipped) { <span>✔ shipped</span> } @else { <span>pending</span> }
        </li>
      } @empty {
        <li>No orders yet.</li>
      }
    </ul>

    @if (user(); as u) {
      <p>Signed in as {{ u.name }}</p>
    }
  }
}

@defer (on viewport) {
  <app-sales-chart />           <!-- its code is loaded only when scrolled into view -->
} @placeholder {
  <div class="skeleton">Chart</div>
}`, 'Modern control flow'),
      tpl(`<!-- The same with legacy structural directives (needs NgIf/NgFor/NgSwitch or CommonModule) -->
<ng-container [ngSwitch]="status">
  <p *ngSwitchCase="'loading'">Loading…</p>
  <ng-container *ngSwitchDefault>
    <ul>
      <li *ngFor="let o of orders; trackBy: trackById; let i = index">
        {{ i + 1 }}. {{ o.item }}
        <span *ngIf="o.shipped; else pending">✔ shipped</span>
      </li>
    </ul>
    <ng-template #pending><span>pending</span></ng-template>
  </ng-container>
</ng-container>`, 'Legacy *ngIf / *ngFor / ngSwitch'),
      jsrun(`// How "track" lets a list reuse DOM rows. We diff old vs new by key.
function reconcile(oldRows, newItems, key) {
  const byKey = new Map(oldRows.map((r) => [r.key, r]));
  let created = 0, reused = 0;
  const rows = newItems.map((item) => {
    const k = key(item);
    if (byKey.has(k)) { reused++; const r = byKey.get(k); byKey.delete(k); return r; }
    created++; return { key: k, dom: '<li>' + item.name + '</li>' };
  });
  return { rows, created, reused, destroyed: byKey.size };
}
const a = [{ id: 1, name: 'Tea' }, { id: 2, name: 'Coffee' }, { id: 3, name: 'Juice' }];
let rows = reconcile([], a, (x) => x.id).rows;
// Server returns NEW objects (same ids) in a new order, plus one new item.
const b = [{ id: 3, name: 'Juice' }, { id: 1, name: 'Tea' }, { id: 4, name: 'Lassi' }];
const byId = reconcile(rows, b, (x) => x.id);
console.log('track id      -> created', byId.created, 'reused', byId.reused, 'destroyed', byId.destroyed);
// Tracking by object identity: every new object looks new.
const objRows = a.map((x) => ({ key: x, dom: '' }));
const byRef = reconcile(objRows, b, (x) => x);
console.log('track object  -> created', byRef.created, 'reused', byRef.reused, 'destroyed', byRef.destroyed);`, 'Plain JS model: why track matters (runnable)')
    ],
    viz: {
      title: '@for with track: which rows are reused, moved, created, destroyed',
      input: 'A B C D | D A B E',
      inputLabel: 'Old ids | new ids (letters, up to 7 each)',
      gen: function (input) {
        var halves = String(input === undefined ? '' : input).split('|');
        if (halves.length !== 2) throw new Error('Use the format "A B C | B C D"');
        var oldL = words(halves[0]), newL = words(halves[1]);
        if (oldL.length > 7 || newL.length > 7) throw new Error('At most 7 ids on each side');
        var seen = {};
        newL.forEach(function (x) { if (seen[x]) throw new Error('Ids must be unique on each side (duplicate ' + x + ')'); seen[x] = 1; });
        var f = [];
        f.push({ narr: 'Old list rendered with <code>@for (x of items(); track x.id)</code>. Each row\'s DOM (and any child component state, like a typed input) is remembered by its <b>id</b>.', parts: [
          { type: 'array', label: 'old rows (DOM)', values: oldL.length ? oldL : ['(empty)'] },
          { type: 'array', label: 'new data', values: newL.length ? newL : ['(empty)'] }] });
        var oldSet = {}; oldL.forEach(function (x) { oldSet[x] = 1; });
        var result = [], hl = {}, reused = 0, created = 0;
        for (var i = 0; i < newL.length; i++) {
          var id = newL[i], was = oldL.indexOf(id);
          result.push(id);
          if (was >= 0) { hl[i] = 'ok'; reused++; }
          else { hl[i] = 'cur'; created++; }
          var ohl = {}; if (was >= 0) ohl[was] = 'ok';
          f.push({ narr: was >= 0 ? 'New position ' + i + ': id <b>' + H.esc(id) + '</b> existed (old position ' + was + '). Angular ' + H.c('g', 'reuses') + ' that DOM row' + (was !== i ? ' and <b>moves</b> it' : '') + '. Its state survives.' : 'New position ' + i + ': id <b>' + H.esc(id) + '</b> is new, so Angular ' + H.c('y', 'creates') + ' a fresh row.', parts: [
            { type: 'array', label: 'old rows', values: oldL.length ? oldL : ['(empty)'], hl: ohl },
            { type: 'array', label: 'new rows being built', values: result.slice(), hl: Object.assign({}, hl) }] });
        }
        var gone = oldL.filter(function (x) { return !seen[x]; });
        var ghl = {}; oldL.forEach(function (x, k) { if (!seen[x]) ghl[k] = 'bad'; });
        f.push({ narr: gone.length ? 'Ids no longer present (' + gone.map(H.esc).join(', ') + ') are ' + H.c('r', 'destroyed') + ': their DOM is removed and their components run <code>ngOnDestroy</code>.' : 'No old id disappeared, so nothing is destroyed.', parts: [
          { type: 'array', label: 'old rows', values: oldL.length ? oldL : ['(empty)'], hl: ghl },
          { type: 'array', label: 'final rows', values: result.length ? result : ['@empty block'], hl: hl }] });
        f.push({ narr: 'Totals: <b>' + reused + '</b> reused, <b>' + created + '</b> created, <b>' + gone.length + '</b> destroyed. With <code>track $index</code> instead, rows would be matched by <i>position</i>, so state would stick to the wrong item after a reorder.' + (newL.length ? '' : ' The list is empty, so the <code>@empty</code> block shows.'), parts: [
          { type: 'vars', label: 'summary', vals: { reused: reused, created: created, destroyed: gone.length } }] });
        return f;
      }
    },
    examples: [
      { title: '@if destroys, [hidden] hides', html: `<p><code>@if (open()) { &lt;app-editor /&gt; }</code> creates the editor when <code>open</code> becomes true and <b>destroys</b> it (state lost, <code>ngOnDestroy</code> runs) when false. <code>&lt;app-editor [hidden]="!open()" /&gt;</code> keeps it alive and just hides it with CSS. Choose @if for heavy or rarely shown content, hiding for fast toggles that must keep state.</p>` },
      { title: 'Choosing the track expression', html: `<p>${H.table(['track', 'when'], [['<code>item.id</code>', 'default choice: stable unique id'], ['<code>item</code> (identity)', 'only if the same object instances are kept (immutable updates that preserve unchanged objects)'], ['<code>$index</code>', 'static lists that never reorder and have no per-row state']])} Tracking by object identity is a trap when data is re-fetched: every object is new, so every row is destroyed and recreated.</p>` },
      { title: 'Migrating automatically', html: `<p><code>ng generate @angular/core:control-flow</code> rewrites <code>*ngIf</code>, <code>*ngFor</code> and <code>ngSwitch</code> in your templates to the new blocks. Review the diff: <code>trackBy</code> functions become <code>track</code> expressions, and <code>else</code> templates become <code>@else</code> blocks.</p>` },
      { title: 'Using $count, $first, $last', html: `<p>Render "A, B and C": inside <code>@for (n of names(); track n)</code> write <code>{{ n }}@if (!$last) { @if ($index === $count - 2) { and } @else { , } }</code>. The context variables avoid computing lengths in the class.</p>` }
    ],
    deepDive: `<h5>🟣 Why built-in blocks are faster</h5>
      <p><code>*ngFor</code> is a directive that used <code>IterableDiffer</code> and runs inside change detection like any other directive. <code>@for</code> is compiled into dedicated runtime instructions with a faster reconciliation algorithm (benchmarks showed up to ~90% faster in some list cases). Making <code>track</code> mandatory removed the most common performance bug: forgetting <code>trackBy</code>, which re-created all rows on every new array.</p>
      <h5>🟣 Embedded views</h5>
      <p>Every block body (an @if branch, each @for row) is an <b>embedded view</b>: a small chunk of DOM plus bindings with its own context. Showing a branch creates the view; hiding destroys it. For @for, Angular keeps a map of track keys to views and only moves, inserts or removes views. This is the same mechanism <code>ViewContainerRef.createEmbeddedView</code> uses in custom structural directives.</p>
      <h5>🟣 Duplicate keys and expensive tracks</h5>
      <p>If two items produce the same track key, Angular warns in dev mode (NG0955) because rows may be confused. The track expression runs for every item on every check, so keep it a cheap property read.</p>
      <h5>🟣 @defer triggers</h5>
      <p><code>on idle</code> (default), <code>on viewport</code>, <code>on interaction</code>, <code>on hover</code>, <code>on immediate</code>, <code>on timer(2s)</code>, <code>when cond</code>, plus <code>prefetch on ...</code>. Sub-blocks: <code>@placeholder (minimum 500ms)</code>, <code>@loading (after 100ms; minimum 1s)</code>, <code>@error</code>. Dependencies inside a defer block must be standalone and not referenced elsewhere eagerly, or they cannot be split out. With SSR, incremental hydration uses <code>hydrate on ...</code> triggers.</p>`,
    aiEra: `<p><b>What AI changes:</b> Most training data still uses <code>*ngIf</code>/<code>*ngFor</code>, so assistants often produce legacy templates. Recognising and converting both is a core skill.</p>
      <p><b>Use AI as a partner:</b> <code>Convert this template to @if/@for/@switch, choose correct track expressions and explain each one</code>, or <code>Which parts of this page should be @defer blocks and with which triggers?</code></p>
      <p><b>Where AI goes wrong:</b> <code>track $index</code> on lists with editable rows, <code>track item</code> on re-fetched data, wrapping the whole page in <code>@defer</code> (layout shift, SEO), and forgetting <code>@empty</code> states.</p>
      <p><b>What you must still own:</b> the identity/track reasoning, destroy-vs-hide decisions, and empty/loading/error states for every list.</p>`,
    problems: [{
      title: 'Order List with Status Switch, Tracking and Empty State',
      level: 'Medium', tags: ['@for', '@if', '@switch', 'track'], companies: ['Swiggy', 'Zomato'],
      statement: `<p>Render orders from <code>orders = signal&lt;Order[]&gt;([])</code> and <code>status = signal&lt;"loading" | "error" | "ready"&gt;("loading")</code>. Show "Loading…" while loading, an error message with a Retry button on error, otherwise the list. Each row shows its number (1-based), item name and a "shipped" badge only if shipped. If there are no orders show "No orders yet". Re-fetching the same orders must <b>not</b> recreate rows.</p>`,
      constraints: `Use <code>@switch</code>, <code>@for</code> with a correct <code>track</code>, <code>@empty</code> and <code>@if</code>. No <code>CommonModule</code> import.`,
      example: `${H.table(['status', 'orders', 'shows'], [['loading', '—', 'Loading…'], ['error', '—', 'error text + Retry'], ['ready', '[]', 'No orders yet'], ['ready', '[{id:7,item:"Dosa",shipped:true}]', '1. Dosa ✔ shipped']])}`,
      brute: { why: `<p>Three separate <code>@if</code>s on three booleans (<code>isLoading</code>, <code>hasError</code>, <code>isEmpty</code>) plus <code>track $index</code>. Booleans can contradict each other (loading <i>and</i> error) and index tracking matches rows by position, so a re-ordered refetch moves badge state to the wrong rows.</p>`, code: tpl(`@if (isLoading) { <p>Loading…</p> }
@if (hasError) { <p>Error</p> }
@if (!isLoading && !hasError) {
  @for (o of orders(); track $index) { <li>{{ o.item }}</li> }
}`, 'Contradictory booleans + index tracking') },
      mcq: { q: 'Orders are re-fetched every 30 s (new objects, same ids). Which track expression avoids recreating every row?', options: ['<code>track o</code>', '<code>track $index</code>', '<code>track o.id</code>', '<code>track $count</code>'], answer: 2, explain: 'New objects break identity tracking; $index breaks on reorder. The id is stable across fetches.' },
      hints: [
        `<p>Hint 1: One status value with three possibilities is cleaner than three booleans: impossible combinations cannot happen.</p>`,
        `<p>Hint 2: <code>@switch (status())</code> with <code>@case</code> blocks; in the default branch, <code>@for (...; track o.id; let i = $index)</code> plus <code>@empty</code>.</p>`,
        `<p>Hint 3: Row: <code>{{ i + 1 }}. {{ o.item }} @if (o.shipped) { &lt;span&gt;✔ shipped&lt;/span&gt; }</code>. Error case: a Retry button with <code>(click)="reload()"</code>.</p>`
      ],
      solution: {
        approach: `<p>A single status signal drives <code>@switch</code>. The list tracks by id so refetches only patch changed text. <code>@empty</code> handles zero orders, and <code>@if</code> inside the row shows the badge.</p>`,
        code: ng(`import { Component, signal, ChangeDetectionStrategy } from '@angular/core';

interface Order { id: number; item: string; shipped: boolean; }
type Status = 'loading' | 'error' | 'ready';

@Component({
  selector: 'app-orders',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    @switch (status()) {
      @case ('loading') { <p>Loading…</p> }
      @case ('error') {
        <p role="alert">Could not load orders.</p>
        <button (click)="reload()">Retry</button>
      }
      @default {
        <ul>
          @for (o of orders(); track o.id; let i = $index) {
            <li>
              {{ i + 1 }}. {{ o.item }}
              @if (o.shipped) { <span class="badge">✔ shipped</span> }
            </li>
          } @empty {
            <li>No orders yet</li>
          }
        </ul>
      }
    }
  \`,
})
export class Orders {
  status = signal<Status>('loading');
  orders = signal<Order[]>([]);

  constructor() { this.reload(); }

  reload() {
    this.status.set('loading');
    // Simulated API call; a real app would use HttpClient or resource().
    setTimeout(() => {
      this.orders.set([{ id: 7, item: 'Dosa', shipped: true }, { id: 9, item: 'Idli', shipped: false }]);
      this.status.set('ready');
    }, 500);
  }
}`, 'Solution'),
        alt: [jsrun(`function view(status, orders) {
  switch (status) {
    case 'loading': return 'Loading…';
    case 'error': return 'Could not load orders. [Retry]';
    default:
      if (!orders.length) return 'No orders yet';
      return orders.map((o, i) => (i + 1) + '. ' + o.item + (o.shipped ? ' ✔ shipped' : '')).join(' | ');
  }
}
console.log(view('loading', []));
console.log(view('error', []));
console.log(view('ready', []));
console.log(view('ready', [{ id: 7, item: 'Dosa', shipped: true }, { id: 9, item: 'Idli', shipped: false }]));`, 'Plain JS model (runnable)')],
        complexity: `<p>Reconciliation is O(n) in the number of orders with a key map; with id tracking only changed rows touch the DOM.</p>`,
        followUps: ['Rewrite the template with *ngFor/*ngIf/ngSwitch and trackBy.', 'Replace the setTimeout with the resource() API or HttpClient + toSignal.']
      }
    }]
  });

  /* ======================= TOPIC 5: INPUTS & OUTPUTS ======================= */
  topics.push({
    title: 'Component Communication: input(), output() and model()',
    analogy: `<p>A component is a <b>vending machine</b>. Inputs are the <b>coin slot and buttons</b> on the front: the outside world puts things in, the machine never reaches out to grab your wallet. Outputs are the <b>tray</b> where things come out: the machine announces "here is your drink" and whoever stands in front decides what to do with it. A <code>model()</code> is the <b>change-return knob</b>: you set it, and the machine can also turn it back.</p>`,
    explain: `<p>Parents pass data <b>down</b> through inputs and children send events <b>up</b> through outputs. This is the same "data down, events up" rule as React props and callbacks.</p>
      <h5>🟢 1. input(): data in</h5>
      ${H.table(['Declaration', 'Meaning'], [
        ['<code>name = input&lt;string&gt;()</code>', 'optional, value is <code>string | undefined</code>'],
        ['<code>size = input(16)</code>', 'optional with default 16 (type inferred as number)'],
        ['<code>product = input.required&lt;Product&gt;()</code>', 'parent <b>must</b> bind it, otherwise a compile error'],
        ['<code>disabled = input(false, { transform: booleanAttribute })</code>', 'lets the parent write just <code>disabled</code> or <code>disabled="true"</code>'],
        ['<code>label = input("", { alias: "aria-label" })</code>', 'public name differs from the field name']
      ])}
      <p>A signal input is <b>read-only</b> inside the child: read it with <code>this.product()</code>, never <code>set</code> it. Parent usage: <code>&lt;app-product-card [product]="p" size="24" /&gt;</code> (brackets = evaluate an expression; no brackets = a plain string).</p>
      <h5>🟢 2. output(): events out</h5>
      <p><code>added = output&lt;Product&gt;()</code> declares an event. The child calls <code>this.added.emit(this.product())</code>. The parent listens with <code>(added)="onAdd($event)"</code>, where <code>$event</code> is the emitted value. Outputs do not bubble up the DOM: only the direct parent can listen.</p>
      <h5>🟢 3. model(): two-way input</h5>
      <p><code>value = model(0)</code> is an input the child is <b>allowed to write</b>. Writing it with <code>set</code>/<code>update</code> emits <code>valueChange</code>, so the parent can bind <code>[(value)]="count"</code>.</p>
      <h5>🔵 4. Derive with computed, react with effect</h5>
      <p>Because inputs are signals, derived values are just <code>total = computed(() =&gt; this.price() * this.qty())</code>, recalculated whenever an input changes. No <code>ngOnChanges</code> needed.</p>
      <h5>🔵 5. The decorator versions (still everywhere)</h5>
      <p>Before v17.1: <code>@Input() name!: string;</code>, <code>@Input({ required: true })</code>, and <code>@Output() added = new EventEmitter&lt;Product&gt;();</code>. Decorator inputs are plain properties, so to react to changes you used <code>ngOnChanges</code> or an input setter. Both styles work in the same app; new code should use the functions. <code>output()</code> returns an <code>OutputEmitterRef</code>, not an RxJS <code>EventEmitter</code>; use <code>outputFromObservable</code> / <code>outputToObservable</code> to bridge to RxJS.</p>`,
    clues: [
      '"Pass data from parent to child" → <code>input()</code> (legacy <code>@Input()</code>)',
      '"Notify the parent when ..." → <code>output()</code> + <code>emit</code> (legacy <code>@Output() EventEmitter</code>)',
      '"Make a custom component support [(value)]" → <code>model()</code> or input + <code>valueChange</code> output',
      '"Input is required" → <code>input.required()</code>',
      '"Boolean attribute like disabled" → <code>transform: booleanAttribute</code>',
      '"Recalculate when an input changes" → <code>computed()</code> over input signals instead of <code>ngOnChanges</code>',
      '"Sibling components need to talk" → lift state to the parent, or a shared service with signals'
    ],
    code: [
      ng(`import { Component, input, output, computed, booleanAttribute, ChangeDetectionStrategy } from '@angular/core';
import { CurrencyPipe } from '@angular/common';

export interface Product { id: number; name: string; price: number; }

@Component({
  selector: 'app-product-card',
  imports: [CurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <h3>{{ product().name }}</h3>
    <p>{{ product().price | currency:'INR' }} × {{ qty() }} = {{ total() | currency:'INR' }}</p>
    <button [disabled]="soldOut()" (click)="added.emit(product())">Add to cart</button>
  \`,
})
export class ProductCard {
  product = input.required<Product>();                           // must be bound
  qty = input(1);                                                // default 1
  soldOut = input(false, { transform: booleanAttribute });       // <app-product-card soldOut />
  total = computed(() => this.product().price * this.qty());     // derived from inputs
  added = output<Product>();                                     // event to the parent
}

@Component({
  selector: 'app-shop',
  imports: [ProductCard],
  template: \`
    @for (p of products; track p.id) {
      <app-product-card [product]="p" [qty]="2" (added)="addToCart($event)" />
    }
    <app-product-card [product]="rare" soldOut />
    <p>Cart: {{ cart.length }} item(s)</p>
  \`,
})
export class Shop {
  products: Product[] = [{ id: 1, name: 'Keyboard', price: 2499 }, { id: 2, name: 'Mouse', price: 799 }];
  rare: Product = { id: 3, name: 'Vintage Lamp', price: 9999 };
  cart: Product[] = [];
  addToCart(p: Product) { this.cart = [...this.cart, p]; }
}`, 'input(), output(), computed'),
      ng(`// The same child written with decorators (pre-v17 style, still common)
import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';

@Component({ selector: 'app-product-card-legacy', template: '...' })
export class ProductCardLegacy implements OnChanges {
  @Input({ required: true }) product!: Product;
  @Input() qty = 1;
  @Output() added = new EventEmitter<Product>();
  total = 0;

  ngOnChanges(changes: SimpleChanges) {          // recompute when inputs change
    if (changes['product'] || changes['qty']) this.total = this.product.price * this.qty;
  }
  add() { this.added.emit(this.product); }
}`, 'Legacy @Input / @Output'),
      jsrun(`// Model: data down (inputs), events up (outputs).
class Child {
  constructor() { this.handlers = []; this.inputs = {}; }
  setInput(name, value) { this.inputs[name] = value; }     // parent -> child
  onAdded(fn) { this.handlers.push(fn); }                 // parent subscribes to (added)
  click() { this.handlers.forEach((fn) => fn(this.inputs.product)); }  // child -> parent
}
const parent = { cart: [] };
const card = new Child();
card.setInput('product', { id: 1, name: 'Keyboard' });
card.onAdded((p) => { parent.cart = [...parent.cart, p]; });
card.click(); card.click();
console.log('cart has', parent.cart.length, 'items:', parent.cart.map((p) => p.name).join(', '));`, 'Plain JS model (runnable)')
    ],
    viz: {
      title: 'Data down, events up: a quantity stepper with model()',
      input: '+ + - +',
      inputLabel: 'Clicks on the stepper (+ or -, up to 8)',
      gen: function (input) {
        var clicks = words(input);
        if (!clicks.length || clicks.length > 8) throw new Error('Type 1 to 8 clicks like "+ + -"');
        clicks.forEach(function (c) { if (c !== '+' && c !== '-') throw new Error('Each click must be + or -'); });
        var nodes = [
          { id: 'cart', label: 'CartPage (qty signal)', x: 25, y: 10, shape: 'box', w: 30 },
          { id: 'step', label: 'Stepper value = model()', x: 25, y: 50, shape: 'box', w: 30 },
          { id: 'sum', label: 'Summary [qty]', x: 78, y: 50, shape: 'box', w: 22 }
        ];
        function g(hl, ehl) { return { type: 'graph', label: 'Component tree', directed: true, height: 62, nodes: nodes, edges: [['cart', 'step', '[(value)]'], ['cart', 'sum', '[qty]'], ['step', 'cart', 'valueChange']], hl: hl, ehl: ehl }; }
        var qty = 1, f = [];
        f.push({ narr: 'The parent owns <code>qty = signal(1)</code> and binds it <b>down</b> to two children: <code>&lt;app-stepper [(value)]="qty" /&gt;</code> and <code>&lt;app-summary [qty]="qty()" /&gt;</code>.', parts: [g({ cart: 'cur' }, { 'cart-step': 'cur', 'cart-sum': 'cur' }), { type: 'vars', label: 'state', vals: { 'parent qty': qty, 'stepper value()': qty, 'summary qty()': qty } }] });
        for (var i = 0; i < clicks.length; i++) {
          var c = clicks[i], before = qty;
          if (c === '+') qty = Math.min(9, qty + 1); else qty = Math.max(1, qty - 1);
          if (qty === before) {
            f.push({ narr: 'Click <b>' + c + '</b>: the stepper is already at its ' + (c === '+' ? 'max (9)' : 'min (1)') + ', so it does <b>not</b> call <code>value.set</code>. Nothing is emitted.', parts: [g({ step: 'bad' }, {}), { type: 'vars', label: 'state', vals: { 'parent qty': qty, 'stepper value()': qty, 'summary qty()': qty } }] });
            continue;
          }
          f.push({ narr: 'Click <b>' + c + '</b> inside the stepper: it calls <code>value.update(v =&gt; v ' + c + ' 1)</code>. A <code>model()</code> may be written by the child, and doing so <b>emits</b> <code>valueChange(' + qty + ')</code> up to the parent.', parts: [g({ step: 'cur' }, { 'step-cart': 'cur' }), { type: 'vars', label: 'state', vals: { 'stepper value()': qty, 'emitted valueChange': qty }, hl: { 'emitted valueChange': 'ok' } }] });
          f.push({ narr: 'The parent\'s two-way binding writes ' + qty + ' into its <code>qty</code> signal, which flows <b>down</b> again to the Summary input. Both children now agree: there is one source of truth.', parts: [g({ cart: 'ok', sum: 'ok' }, { 'cart-sum': 'ok' }), { type: 'vars', label: 'state', vals: { 'parent qty': qty, 'stepper value()': qty, 'summary qty()': qty }, hl: { 'parent qty': 'ok', 'summary qty()': 'ok' } }] });
        }
        f.push({ narr: 'Final quantity: <b>' + qty + '</b>. Children never reached into the parent: the stepper only <i>emitted</i>, the summary only <i>received</i>.', parts: [g({ cart: 'sel', step: 'sel', sum: 'sel' }, {}), { type: 'vars', label: 'final', vals: { qty: qty } }] });
        return f;
      }
    },
    examples: [
      { title: 'String vs expression binding', html: `<p><code>&lt;app-avatar size="24" /&gt;</code> passes the <b>string</b> "24". <code>&lt;app-avatar [size]="24" /&gt;</code> passes the <b>number</b> 24. With strict templates, a <code>number</code> input rejects the string at compile time, or you add <code>transform: numberAttribute</code> to accept both.</p>` },
      { title: 'Never mutate an input object', html: `<p>If the child does <code>this.product().price = 0</code>, it changes the parent's object behind its back, and OnPush parents will not even notice (same reference). Emit an event instead: <code>priceChange.emit(0)</code>, and let the owner create a new object.</p>` },
      { title: 'Sibling communication', html: `<p>A filter bar and a table are siblings. The filter bar emits <code>(filterChange)</code>; the parent stores <code>filter = signal("")</code> and passes <code>[filter]="filter()"</code> to the table. For distant components, put the signal in an injectable <b>service</b> instead of passing it through many layers.</p>`, code: tpl(`<app-filter-bar (filterChange)="filter.set($event)" />
<app-results-table [filter]="filter()" />`, 'Lifting state to the parent') },
      { title: 'Reacting to input changes', html: `<p>Modern: derive with <code>computed()</code>; for side effects (e.g. load data when <code>userId</code> changes) use <code>effect()</code> or the <code>resource()</code>/<code>httpResource()</code> APIs, which re-run when their signal inputs change. Legacy: <code>ngOnChanges(changes)</code> with <code>changes["userId"].currentValue</code>, or an <code>@Input() set userId(v) {...}</code> setter.</p>` }
    ],
    deepDive: `<h5>🟣 How signal inputs are set</h5>
      <p>The parent's template binding <code>[product]="p"</code> is evaluated during the parent's change detection. If the value changed (<code>Object.is</code>), Angular writes it into the child's <b>input signal node</b> internally. Everything that read <code>product()</code> (computed values, the child's template, effects) is marked dirty. With OnPush the child is re-checked because an input changed.</p>
      <h5>🟣 Why signal inputs beat decorators</h5>
      <p>Decorator inputs are mutable fields, so code could overwrite them and lose the parent's value until the next change. Their changes could only be observed through <code>ngOnChanges</code> (stringly-typed <code>SimpleChanges</code>) or setters. Signal inputs are read-only, typed, composable with <code>computed</code>, and <code>input.required</code> is checked at compile time, with no "undefined until ngOnInit" window to trip over (reading a required input in the constructor throws NG0950 because it is not set yet).</p>
      <h5>🟣 Outputs are not DOM events</h5>
      <p>Component outputs are delivered directly to the listener in the parent template. They do not bubble through the DOM and <code>$event</code> is whatever was emitted. A native DOM event with the same name (e.g. an output called <code>click</code>) would also be caught by the listener, which is why naming outputs like native events is discouraged.</p>
      <h5>🟣 Queries are signals too</h5>
      <p>The same family includes <code>viewChild()</code>, <code>viewChildren()</code>, <code>contentChild()</code> and <code>contentChildren()</code> (replacing <code>@ViewChild</code> etc.), returning signals that update when the queried elements appear or disappear.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI can migrate hundreds of <code>@Input</code>s to <code>input()</code> quickly (Angular also ships <code>ng g @angular/core:signal-input-migration</code> and <code>output-migration</code>). Your job is deciding the component API.</p>
      <p><b>Use AI as a partner:</b> <code>Design the inputs/outputs for a reusable date-range picker; justify required vs optional and model vs input+output</code>.</p>
      <p><b>Where AI goes wrong:</b> calling <code>.set()</code> on an <code>input()</code> (compile error), using <code>effect()</code> to copy inputs into other signals instead of <code>computed()</code>, reading <code>this.product()</code> in the constructor, and creating huge "god" input objects.</p>
      <p><b>What you must still own:</b> a clean, minimal, typed component API and the data-down/events-up discipline.</p>`,
    problems: [{
      title: 'Rating Component with Two-Way Binding',
      level: 'Medium', tags: ['model', 'input', 'output'], companies: ['Flipkart', 'Myntra'],
      statement: `<p>Build <code>app-rating</code>: shows <code>max</code> stars (input, default 5), the current value is two-way bindable as <code>[(value)]</code>, clicking star <i>n</i> sets the value to <i>n</i>, clicking the same star again clears it to 0, and a <code>readonly</code> boolean attribute disables clicks. Also emit a <code>rated</code> output with the new value whenever the user changes it.</p>`,
      constraints: `Use <code>model()</code> for value, <code>input()</code> with <code>booleanAttribute</code> for readonly, <code>output()</code> for rated. Accessible buttons with <code>aria-pressed</code>.`,
      example: `${H.table(['value', 'click', 'new value', 'rated emits'], [['0', 'star 3', '3', '3'], ['3', 'star 3', '0', '0'], ['3 (readonly)', 'star 5', '3', 'nothing']])}`,
      brute: { why: `<p>Keep a private copy <code>current</code> of the value and emit it without telling the parent's binding, or mutate the input directly. The parent and child then disagree after the first click: the child shows 4 stars while the parent still thinks 2.</p>`, code: ng(`export class BadRating {
  @Input() value = 0;
  current = this.value;             // copied once: stale when the parent changes value
  select(n: number) { this.current = n; } // parent never hears about it
}`, 'Stale private copy') },
      mcq: { q: 'Which declaration lets the parent write <code>[(value)]="stars"</code>?', options: ['<code>value = input(0)</code>', '<code>value = model(0)</code>', '<code>value = output&lt;number&gt;()</code>', '<code>value = signal(0)</code>'], answer: 1, explain: 'model() creates a writable input plus a valueChange output, which is exactly what [( )] needs.' },
      hints: [
        `<p>Hint 1: The value belongs to the parent but the child must be able to change it. That is precisely a model input.</p>`,
        `<p>Hint 2: <code>value = model(0)</code>, <code>max = input(5)</code>, <code>readonly = input(false, { transform: booleanAttribute })</code>, <code>rated = output&lt;number&gt;()</code>; stars = <code>computed(() =&gt; [1..max])</code>.</p>`,
        `<p>Hint 3: In <code>select(n)</code>: return if readonly; next = (n === value()) ? 0 : n; <code>value.set(next)</code>; <code>rated.emit(next)</code>. Template: <code>@for (n of stars(); track n)</code> button with <code>[attr.aria-pressed]="n &lt;= value()"</code>.</p>`
      ],
      solution: {
        approach: `<p><code>model()</code> keeps a single source of truth in the parent while letting the child write. <code>computed</code> builds the star array from <code>max</code>. The extra <code>rated</code> output is for side effects like analytics.</p>`,
        code: ng(`import { Component, model, input, output, computed, booleanAttribute, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-rating',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    @for (n of stars(); track n) {
      <button type="button"
              [attr.aria-label]="n + ' star' + (n > 1 ? 's' : '')"
              [attr.aria-pressed]="n <= value()"
              [class.on]="n <= value()"
              [disabled]="readonly()"
              (click)="select(n)">★</button>
    }
  \`,
  styles: '.on { color: gold; } button { background: none; border: 0; font-size: 1.5rem; }',
})
export class Rating {
  value = model(0);                                               // [(value)]
  max = input(5);
  readonly = input(false, { transform: booleanAttribute });
  rated = output<number>();
  stars = computed(() => Array.from({ length: this.max() }, (_, i) => i + 1));

  select(n: number) {
    if (this.readonly()) return;
    const next = n === this.value() ? 0 : n;   // clicking the same star clears it
    this.value.set(next);                      // also emits valueChange
    this.rated.emit(next);
  }
}

// Parent: <app-rating [(value)]="stars" (rated)="log($event)" />  with stars = signal(3)`, 'Solution'),
        alt: [jsrun(`function makeRating(parent, readonly) {
  return {
    select(n) {
      if (readonly) return 'nothing (readonly)';
      const next = n === parent.stars ? 0 : n;
      parent.stars = next;                // valueChange -> parent signal
      return 'rated ' + next;
    },
  };
}
const parent = { stars: 0 };
const r = makeRating(parent, false);
console.log(r.select(3), '| parent', parent.stars);
console.log(r.select(3), '| parent', parent.stars);
const ro = makeRating({ stars: 3 }, true);
console.log(ro.select(5));`, 'Plain JS model (runnable)')],
        complexity: `<p>O(max) buttons; one signal write per click.</p>`,
        followUps: ['Add keyboard support (arrow keys, roving tabindex) with role="radiogroup".', 'Support half stars.']
      }
    }]
  });

  /* ======================= TOPIC 6: LIFECYCLE ======================= */
  topics.push({
    title: 'Lifecycle Hooks: From Creation to Destruction',
    analogy: `<p>A component's life is like <b>renting a flat</b>. The <i>constructor</i> is signing the lease (you exist, but the furniture has not arrived). <code>ngOnChanges</code> is the landlord handing you keys and notes (inputs). <code>ngOnInit</code> is moving in: now you set things up. <code>ngAfterViewInit</code> is when all the rooms are built and you can hang pictures (touch the DOM). <code>ngOnDestroy</code> is moving out: return the keys, cancel the internet subscription, or you keep paying (memory leaks).</p>`,
    explain: `<p>Angular calls special methods on your component at fixed moments. You implement the ones you need (and the matching interface, e.g. <code>implements OnInit</code>, for type safety).</p>
      ${H.table(['Hook', 'When', 'Typical use'], [
        ['<code>constructor</code>', 'class created (not a hook)', '<code>inject()</code> services, create signals. Inputs are <b>not</b> set yet.'],
        ['<code>ngOnChanges(changes)</code>', 'before ngOnInit and whenever a bound input changes', 'react to input changes (legacy style)'],
        ['<code>ngOnInit</code>', 'once, after the first ngOnChanges', 'initial data load that needs inputs'],
        ['<code>ngDoCheck</code>', 'every change detection run', 'custom change detection (rare, expensive)'],
        ['<code>ngAfterContentInit</code> / <code>Checked</code>', 'after projected content (<code>ng-content</code>) is ready / checked', 'work with <code>contentChild</code>'],
        ['<code>ngAfterViewInit</code> / <code>Checked</code>', 'after this component\'s view and child views are ready / checked', 'work with <code>viewChild</code> elements'],
        ['<code>ngOnDestroy</code>', 'just before removal', 'clean up timers, subscriptions, listeners']
      ])}
      <h5>🟢 1. The order to memorise</h5>
      <p><b>constructor → ngOnChanges → ngOnInit → ngDoCheck → ngAfterContentInit → ngAfterContentChecked → ngAfterViewInit → ngAfterViewChecked</b> … then on every later check: ngOnChanges (if inputs changed) → ngDoCheck → AfterContentChecked → AfterViewChecked … and finally <b>ngOnDestroy</b>. A parent's <code>ngAfterViewInit</code> runs <b>after</b> all its children's view hooks.</p>
      <h5>🟢 2. Constructor vs ngOnInit</h5>
      <p>The constructor is plain TypeScript; Angular has not set inputs yet. <code>ngOnInit</code> runs after the first inputs arrive, so "load the user whose id is my input" belongs in <code>ngOnInit</code> (or better, in a <code>computed</code>/<code>resource</code> that reads the input signal).</p>
      <h5>🔵 3. Cleaning up: ngOnDestroy and DestroyRef</h5>
      <p>Anything you start must be stopped: <code>setInterval</code>, manual <code>addEventListener</code>, RxJS subscriptions that do not complete. Modern helpers: <code>inject(DestroyRef).onDestroy(() =&gt; ...)</code> (works outside classes too) and RxJS <code>takeUntilDestroyed()</code>. The <code>async</code> pipe and <code>toSignal()</code> unsubscribe automatically.</p>
      <h5>🔵 4. The signal-era hooks</h5>
      <p>With signals many hooks become unnecessary: <code>computed</code> replaces most <code>ngOnChanges</code> logic, <code>effect()</code> runs side effects when signals change, and <code>afterNextRender()</code> / <code>afterEveryRender()</code> (named <code>afterRender</code> before v20) run code after the DOM is painted, only in the browser (safe for SSR). <code>ngOnInit</code> and <code>ngOnDestroy</code> remain common.</p>`,
    clues: [
      '"Difference between constructor and ngOnInit" → DI/field setup vs initialisation after inputs are set',
      '"Input is undefined in the constructor" → read it in ngOnInit or through a computed signal',
      '"Access a DOM element / child component" → <code>ngAfterViewInit</code> with <code>viewChild</code> (or <code>afterNextRender</code>)',
      '"Memory leak when navigating away" → missing cleanup in <code>ngOnDestroy</code> / <code>takeUntilDestroyed</code>',
      '"ExpressionChangedAfterItHasBeenCheckedError in ngAfterViewInit" → changing bound state after the view was checked',
      '"Which hook runs on every change detection?" → <code>ngDoCheck</code> (and the *Checked hooks)',
      '"Order of hooks parent vs child" → parent init before child init; child view hooks before parent view hooks'
    ],
    code: [
      ng(`import { Component, OnInit, OnChanges, OnDestroy, AfterViewInit, SimpleChanges,
         input, signal, viewChild, ElementRef, inject, DestroyRef } from '@angular/core';

@Component({
  selector: 'app-live-clock',
  template: \`
    <p #box>{{ label() }}: {{ now() }}</p>
  \`,
})
export class LiveClock implements OnChanges, OnInit, AfterViewInit, OnDestroy {
  label = input('Time');
  now = signal(new Date().toLocaleTimeString());
  box = viewChild.required<ElementRef<HTMLParagraphElement>>('box');
  private timerId?: ReturnType<typeof setInterval>;

  constructor() {
    // Inputs are NOT available here yet. Use it for inject() and fields only.
    inject(DestroyRef).onDestroy(() => console.log('DestroyRef: cleaned up'));
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['label']) console.log('label changed to', changes['label'].currentValue);
  }

  ngOnInit() {
    // Inputs are set. Start work here.
    this.timerId = setInterval(() => this.now.set(new Date().toLocaleTimeString()), 1000);
  }

  ngAfterViewInit() {
    // The <p #box> element now exists.
    console.log('rendered width', this.box().nativeElement.offsetWidth);
  }

  ngOnDestroy() {
    clearInterval(this.timerId);  // without this the timer runs forever (leak)
  }
}`, 'Common hooks in one component'),
      ng(`// Modern alternatives
import { Component, input, computed, effect, afterNextRender, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';

@Component({ selector: 'app-modern', template: '<canvas #c></canvas>' })
export class Modern {
  userId = input.required<number>();
  title = computed(() => 'User #' + this.userId());          // replaces ngOnChanges math

  constructor() {
    effect(() => console.log('userId is now', this.userId())); // side effect on change
    afterNextRender(() => {                                    // browser-only, after paint
      console.log('safe to measure the DOM / init a chart library');
    });
    interval(1000).pipe(takeUntilDestroyed()).subscribe((n) => console.log('tick', n)); // auto-unsubscribes
  }
}`, 'Signal-era replacements'),
      jsrun(`// Simulate Angular calling hooks on a parent with one child.
const log = [];
function make(name) {
  return {
    constructor: () => log.push(name + ': constructor'),
    ngOnChanges: () => log.push(name + ': ngOnChanges'),
    ngOnInit: () => log.push(name + ': ngOnInit'),
    ngDoCheck: () => log.push(name + ': ngDoCheck'),
    ngAfterViewInit: () => log.push(name + ': ngAfterViewInit'),
    ngOnDestroy: () => log.push(name + ': ngOnDestroy'),
  };
}
const parent = make('Parent'), child = make('Child');
// Creation: parent is created and initialised, then its template creates the child.
parent.constructor(); parent.ngOnChanges(); parent.ngOnInit(); parent.ngDoCheck();
child.constructor(); child.ngOnChanges(); child.ngOnInit(); child.ngDoCheck();
child.ngAfterViewInit();          // children finish their views first...
parent.ngAfterViewInit();         // ...then the parent
// Removal: children are destroyed before the parent is gone.
child.ngOnDestroy(); parent.ngOnDestroy();
log.forEach((l, i) => console.log(String(i + 1).padStart(2), l));`, 'Plain JS model: hook order parent/child (runnable)')
    ],
    viz: {
      title: 'Lifecycle timeline of a component',
      input: '2',
      inputLabel: 'Number of input changes after creation (0-3)',
      gen: function (input) {
        var n = parseInt(String(input === undefined ? '' : input).trim(), 10);
        if (isNaN(n) || n < 0 || n > 3) throw new Error('Type a number from 0 to 3');
        var hooks = ['constructor', 'ngOnChanges', 'ngOnInit', 'ngDoCheck', 'ngAfterContentInit', 'ngAfterContentChecked', 'ngAfterViewInit', 'ngAfterViewChecked'];
        var why = {
          constructor: 'The class is instantiated. <code>inject()</code> works, inputs are still unset.',
          ngOnChanges: 'Bound inputs received their first values. Runs only if the component has inputs bound.',
          ngOnInit: 'Runs <b>once</b>. Inputs are ready: start loading data here.',
          ngDoCheck: 'Runs on <b>every</b> change detection pass. Keep it tiny or avoid it.',
          ngAfterContentInit: 'Projected content (<code>&lt;ng-content&gt;</code>) is in place. Runs once.',
          ngAfterContentChecked: 'Projected content was checked. Runs after every check.',
          ngAfterViewInit: 'This view and all child views exist: <code>viewChild</code> elements are available. Runs once.',
          ngAfterViewChecked: 'The view was checked. Runs after every check. Changing bound state here causes NG0100.'
        };
        var done = [], f = [];
        for (var i = 0; i < hooks.length; i++) {
          done.push(hooks[i]);
          var hl = {}; hl[i] = 'cur'; for (var k = 0; k < i; k++) hl[k] = 'done';
          f.push({ narr: '<b>' + hooks[i] + '</b>: ' + why[hooks[i]], parts: [{ type: 'array', label: 'creation phase', values: hooks, hl: hl }, { type: 'stack', label: 'hooks called so far', items: done.slice() }] });
        }
        var rep = ['ngOnChanges', 'ngDoCheck', 'ngAfterContentChecked', 'ngAfterViewChecked'];
        for (var c = 1; c <= n; c++) {
          f.push({ narr: 'Input change #' + c + ': the parent binds a new value. Angular runs <code>ngOnChanges</code> (with only the changed keys in <code>SimpleChanges</code>), then the per-check hooks. <code>ngOnInit</code> and the <i>Init</i> hooks do <b>not</b> run again.', parts: [{ type: 'array', label: 'update phase #' + c, values: rep, hl: { 0: 'cur', 1: 'ok', 2: 'ok', 3: 'ok' } }] });
        }
        f.push({ narr: 'The component is removed (an <code>@if</code> becomes false or the route changes). <b>ngOnDestroy</b> runs: clear timers and subscriptions here, or they leak.', parts: [{ type: 'array', label: 'teardown', values: ['ngOnDestroy'], hl: { 0: 'bad' } }, { type: 'vars', label: 'totals', vals: { 'ngOnInit calls': 1, 'ngOnChanges calls': 1 + n, 'ngOnDestroy calls': 1 } }] });
        return f;
      }
    },
    examples: [
      { title: 'Input undefined in the constructor', html: `<p><code>constructor() { console.log(this.userId()); }</code> with <code>userId = input.required&lt;number&gt;()</code> throws NG0950 ("input is required but no value is available yet"). With <code>@Input() userId</code> it silently logs <code>undefined</code>. Move the logic to <code>ngOnInit</code>, or better, to a <code>computed</code> that reads the input.</p>` },
      { title: 'NG0100 from ngAfterViewInit', html: `<p>Setting <code>this.title = "Ready"</code> (a value bound in the template) inside <code>ngAfterViewInit</code> changes data <i>after</i> the view was checked. In dev mode Angular re-checks and throws <i>ExpressionChangedAfterItHasBeenCheckedError</i>. Fix: compute the value earlier, use a signal (which schedules a new check), or move the logic to <code>ngOnInit</code>.</p>` },
      { title: 'The classic subscription leak', html: `<p>A component subscribes to <code>interval(1000)</code> or a websocket in <code>ngOnInit</code> and never unsubscribes. Each visit to the page adds another live subscription. Fix with <code>takeUntilDestroyed()</code>, the <code>async</code> pipe, <code>toSignal()</code>, or unsubscribe in <code>ngOnDestroy</code>. HTTP requests from <code>HttpClient</code> complete by themselves, so they do not leak this way.</p>`, code: ng(`export class Ticker {
  private destroyRef = inject(DestroyRef);
  ngOnInit() {
    interval(1000)
      .pipe(takeUntilDestroyed(this.destroyRef))   // outside the constructor, pass DestroyRef
      .subscribe((n) => console.log(n));
  }
}`, 'takeUntilDestroyed') },
      { title: 'Measuring the DOM safely with SSR', html: `<p>On the server there is no <code>window</code> or layout. <code>afterNextRender(() =&gt; el.getBoundingClientRect())</code> only runs in the browser, after rendering, so it is the right place to initialise chart libraries, focus inputs or measure sizes.</p>` }
    ],
    deepDive: `<h5>🟣 Where hooks run in change detection</h5>
      <p>During a check of a view, Angular: (1) sets inputs on child components and calls their <code>ngOnChanges</code>, <code>ngOnInit</code> (first time) and <code>ngDoCheck</code>; (2) updates this view's bindings; (3) runs content hooks; (4) recursively checks child views; (5) runs view hooks. That is why child <code>ngAfterViewInit</code> fires before the parent's, and why changing a parent's bound state from a child's AfterView hook triggers NG0100.</p>
      <h5>🟣 ngOnChanges details</h5>
      <p><code>SimpleChanges</code> maps input names to <code>{ previousValue, currentValue, firstChange }</code>. It fires only when the binding's value changes by reference: mutating an array inside does <b>not</b> trigger it. It fires for template bindings only, not when you set a property in code (except through <code>ComponentRef.setInput</code>). It is also called for signal inputs.</p>
      <h5>🟣 Directives and services</h5>
      <p>Directives have the same hooks (minus content/view hooks being relevant only if they query). Services have only <code>ngOnDestroy</code>, called when their injector is destroyed (for a root service, when the app is destroyed). For component-level providers, the service dies with the component.</p>
      <h5>🟣 effect() timing</h5>
      <p>Component effects run during change detection, before the component's view is refreshed, and re-run when any signal they read changes. Do not use them to synchronise one signal into another (use <code>computed</code> or <code>linkedSignal</code>); use them for logging, localStorage, or imperative third-party APIs.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI tools happily generate every hook "just in case". Knowing which hook is actually needed (often none, thanks to signals) is what separates a senior answer.</p>
      <p><b>Use AI as a partner:</b> <code>Find leaks in this component: list everything started and where it is stopped</code>, or <code>Rewrite this ngOnChanges logic with computed signals</code>.</p>
      <p><b>Where AI goes wrong:</b> HTTP calls in the constructor reading undefined inputs, DOM access in <code>ngOnInit</code> before the view exists, <code>setTimeout</code> hacks to silence NG0100, empty <code>ngOnDestroy</code> while subscriptions leak, and heavy logic in <code>ngDoCheck</code>.</p>
      <p><b>What you must still own:</b> the hook order, the constructor vs ngOnInit distinction and a cleanup plan for every resource.</p>`,
    problems: [{
      title: 'Countdown Timer That Never Leaks',
      level: 'Medium', tags: ['lifecycle', 'ngOnDestroy', 'signals'], companies: ['Paytm', 'PhonePe'],
      statement: `<p>Build <code>app-countdown</code> with input <code>seconds</code> (required). It shows the remaining seconds, ticks down every second, stops at 0 and emits <code>finished</code> once. If the parent changes <code>seconds</code>, restart from the new value. If the component is destroyed (e.g. inside an <code>@if</code> that turns false), the timer must stop.</p>`,
      constraints: `Exactly one interval alive at any time. No reading inputs in the constructor. Use <code>DestroyRef</code> or <code>ngOnDestroy</code> for cleanup.`,
      example: `${H.table(['event', 'display', 'live timers'], [['created seconds=3', '3', '1'], ['+3 s', '0, emits finished', '0'], ['seconds changed to 5', '5', '1'], ['destroyed', '—', '0']])}`,
      brute: { why: `<p>Start <code>setInterval</code> in the constructor and never clear it. The input is not set yet (so the start value is wrong), changing the input starts a second timer, and after the component is destroyed the interval keeps firing and holds the component in memory.</p>`, code: ng(`export class BadCountdown {
  @Input() seconds = 0;
  left = 0;
  constructor() {
    this.left = this.seconds;                       // 0: input not set yet
    setInterval(() => this.left--, 1000);           // never cleared, goes negative
  }
}`, 'Leaky timer') },
      mcq: { q: 'The countdown is inside <code>@if (show())</code> and <code>show</code> becomes false. What must happen to its interval?', options: ['Nothing, Angular clears timers automatically', 'It must be cleared in ngOnDestroy / DestroyRef, otherwise it keeps running', 'It pauses until the component comes back', 'It is garbage collected immediately'], answer: 1, explain: 'Angular destroys the view and calls ngOnDestroy, but it does not know about your setInterval. You must clear it.' },
      hints: [
        `<p>Hint 1: Every time <code>seconds</code> changes you need: stop the old timer, start a new one. That is "react to an input change".</p>`,
        `<p>Hint 2: Use <code>effect()</code> reading <code>this.seconds()</code> with its <code>onCleanup</code> callback, or <code>ngOnChanges</code> + a stored interval id. Register destruction cleanup with <code>DestroyRef</code>.</p>`,
        `<p>Hint 3: Recipe: <code>left = signal(0)</code>; <code>effect((onCleanup) =&gt; { left.set(seconds()); const id = setInterval(tick, 1000); onCleanup(() =&gt; clearInterval(id)); })</code>; tick: if left() &lt;= 1 → set 0, emit finished, clear; else decrement. Effects are cleaned up automatically on destroy.</p>`
      ],
      solution: {
        approach: `<p>An <code>effect</code> that reads <code>seconds()</code> re-runs whenever the input changes. Its <code>onCleanup</code> clears the previous interval before the next run <b>and</b> when the component is destroyed, so there is never more than one timer. <code>untracked</code> keeps the effect from depending on <code>left</code>.</p>`,
        code: ng(`import { Component, input, output, signal, effect, untracked, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-countdown',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<span aria-live="polite">{{ left() }}</span>',
})
export class Countdown {
  seconds = input.required<number>();
  finished = output<void>();
  left = signal(0);

  constructor() {
    effect((onCleanup) => {
      const start = this.seconds();               // tracked: re-run when the input changes
      untracked(() => this.left.set(start));
      if (start <= 0) return;
      const id = setInterval(() => {
        if (this.left() <= 1) {
          this.left.set(0);
          clearInterval(id);
          this.finished.emit();
        } else {
          this.left.update((s) => s - 1);
        }
      }, 1000);
      onCleanup(() => clearInterval(id));         // runs before the next run AND on destroy
    });
  }
}`, 'Solution'),
        alt: [jsrun(`// Simulated clock to prove "one timer at a time" and cleanup on destroy.
let live = 0, events = [];
function startCountdown(seconds) {
  let left = seconds, alive = true; live++;
  const stop = () => { if (alive) { alive = false; live--; } };
  return {
    tick() { if (!alive) return; left--; if (left <= 0) { left = 0; stop(); events.push('finished'); } return left; },
    stop, get left() { return left; },
  };
}
let c = startCountdown(3);
c.tick(); c.tick(); c.tick();
console.log('after 3 ticks left', c.left, 'live timers', live, events);
c.stop(); c = startCountdown(5);                 // input changed: cleanup then restart
console.log('restarted left', c.left, 'live timers', live);
c.stop();                                        // component destroyed
console.log('destroyed, live timers', live);`, 'Plain JS model (runnable)')],
        complexity: `<p>O(1) per tick, one interval alive. Memory is released on destroy because nothing references the component afterwards.</p>`,
        followUps: ['Implement it with RxJS (timer + takeWhile + takeUntilDestroyed).', 'How would you make it drift-free using Date.now() instead of counting ticks?']
      }
    }]
  });

  /* ======================= TOPIC 7: PIPES ======================= */
  topics.push({
    title: 'Pipes: Formatting Values in Templates',
    analogy: `<p>A pipe is a <b>coffee filter</b> placed in the template. Raw data goes in at the top (<code>1712345678000</code>), and what drips out is something people can read ("6 Apr 2024"). You can stack filters (<code>| date | uppercase</code>). A <b>pure</b> pipe is a smart filter: if you pour the exact same thing in again, it hands back the cup it already made instead of brewing again.</p>`,
    explain: `<p>A <b>pipe</b> transforms a value for display, right in the template: <code>{{ value | pipeName:arg1:arg2 }}</code>. It never changes the original data.</p>
      <h5>🟢 1. Built-in pipes (import them from <code>@angular/common</code>)</h5>
      ${H.table(['Pipe', 'Example', 'Output'], [
        ['<code>DatePipe</code>', '<code>{{ d | date:"d MMM y" }}</code>', '6 Apr 2024'],
        ['<code>CurrencyPipe</code>', '<code>{{ 2499 | currency:"INR" }}</code>', '₹2,499.00'],
        ['<code>DecimalPipe</code> (<code>number</code>)', '<code>{{ 3.14159 | number:"1.0-2" }}</code>', '3.14'],
        ['<code>PercentPipe</code>', '<code>{{ 0.256 | percent }}</code>', '26%'],
        ['<code>UpperCasePipe</code> / <code>LowerCasePipe</code> / <code>TitleCasePipe</code>', '<code>{{ "hi there" | titlecase }}</code>', 'Hi There'],
        ['<code>SlicePipe</code>', '<code>{{ list | slice:0:3 }}</code>', 'first 3 items'],
        ['<code>JsonPipe</code>', '<code>{{ obj | json }}</code>', 'pretty JSON (debugging)'],
        ['<code>KeyValuePipe</code>', '<code>@for (e of map | keyvalue; track e.key)</code>', 'iterate object entries'],
        ['<code>AsyncPipe</code>', '<code>{{ user$ | async }}</code>', 'subscribes to an Observable/Promise and unsubscribes on destroy']
      ])}
      <h5>🟢 2. Writing your own pipe</h5>
      <p>A pipe is a class with <code>@Pipe({ name: "initials" })</code> implementing <code>PipeTransform</code>: <code>transform(value, ...args)</code> returns the new value. Like components, pipes are standalone by default; add the class to a component's <code>imports</code> to use it.</p>
      <h5>🔵 3. Pure vs impure</h5>
      <p>Pipes are <b>pure</b> by default: Angular calls <code>transform</code> again only when the input value or an argument changes <b>by reference</b> (or primitive value). That makes them very cheap, like a memoised function. The trap: if you <code>push</code> into an array, the reference is the same, so a pure <code>filter</code> pipe shows stale results. Fix by creating a new array. An <b>impure</b> pipe (<code>pure: false</code>) runs on every change detection pass, which can be slow; <code>async</code> is the famous impure built-in.</p>
      <h5>🔵 4. Pipes vs methods vs computed</h5>
      <p><code>{{ formatPrice(p) }}</code> (a method) runs on every check. <code>{{ p | price }}</code> (pure pipe) runs only when <code>p</code> changes. <code>computed()</code> is the signal-based equivalent inside the class. Use pipes for reusable <b>display formatting</b>; use computed for component-specific derived state.</p>`,
    clues: [
      '"Format a date / currency / number in the template" → built-in pipes (<code>date</code>, <code>currency</code>, <code>number</code>)',
      '"The pipe \'x\' could not be found" → add the pipe class to <code>imports</code>',
      '"My filter pipe does not update when I push to the array" → pure pipe + same reference; use immutable updates',
      '"Pure vs impure pipe" → change-by-reference vs every change detection run',
      '"Subscribe to an Observable in the template without leaks" → <code>async</code> pipe',
      '"Avoid calling functions in templates" → pure pipe or <code>computed</code>'
    ],
    code: [
      ng(`import { Pipe, PipeTransform, Component } from '@angular/core';
import { DatePipe, CurrencyPipe, UpperCasePipe, AsyncPipe } from '@angular/common';
import { interval, map } from 'rxjs';

// A custom pure pipe: "Asha Rao" -> "AR"
@Pipe({ name: 'initials' })                // standalone by default, pure by default
export class InitialsPipe implements PipeTransform {
  transform(fullName: string | null | undefined, max = 2): string {
    if (!fullName) return '';
    return fullName.trim().split(/\\s+/)    // split on whitespace
      .slice(0, max)
      .map((w) => w[0].toUpperCase())
      .join('');
  }
}

@Component({
  selector: 'app-profile',
  imports: [DatePipe, CurrencyPipe, UpperCasePipe, AsyncPipe, InitialsPipe],
  template: \`
    <span class="avatar">{{ name | initials }}</span>
    <h2>{{ name | uppercase }}</h2>
    <p>Joined {{ joined | date:'d MMM y' }}</p>
    <p>Balance {{ balance | currency:'INR':'symbol':'1.0-0' }}</p>
    <p>Seconds on page: {{ seconds$ | async }}</p>
  \`,
})
export class Profile {
  name = 'Asha Rao';
  joined = new Date(2024, 3, 6);
  balance = 125000;
  seconds$ = interval(1000).pipe(map((n) => n + 1)); // async pipe subscribes AND unsubscribes
}`, 'Built-in and custom pipes'),
      jsrun(`// Model of how Angular treats a PURE pipe: it caches by input reference.
function purePipe(transform) {
  let lastArgs = null, lastResult, calls = 0;
  return {
    run(...args) {
      const same = lastArgs && args.length === lastArgs.length && args.every((a, i) => Object.is(a, lastArgs[i]));
      if (!same) { calls++; lastResult = transform(...args); lastArgs = args; }
      return lastResult;
    },
    get calls() { return calls; },
  };
}
const activeOnly = purePipe((list) => list.filter((u) => u.active).map((u) => u.name));
let users = [{ name: 'Asha', active: true }, { name: 'Ben', active: false }];

console.log(activeOnly.run(users), 'calls', activeOnly.calls);
console.log(activeOnly.run(users), 'calls', activeOnly.calls, '(cached)');
users.push({ name: 'Chen', active: true });            // MUTATION: same reference
console.log(activeOnly.run(users), 'calls', activeOnly.calls, '<- stale! Chen missing');
users = [...users];                                    // new reference
console.log(activeOnly.run(users), 'calls', activeOnly.calls, '<- fresh');`, 'Plain JS model: pure pipe caching and the mutation trap (runnable)')
    ],
    viz: {
      title: 'Pure pipe: when does transform() actually run?',
      input: 'same new push same new',
      inputLabel: 'Sequence of checks: same | new | push (up to 8)',
      gen: function (input) {
        var steps = words(input);
        if (!steps.length || steps.length > 8) throw new Error('Type 1 to 8 steps, e.g. "same new push"');
        steps.forEach(function (s) { if (['same', 'new', 'push'].indexOf(s) < 0) throw new Error('Each step must be same, new or push'); });
        var list = ['Asha', 'Ben'], ref = 1, cachedRef = 1, shown = list.slice(), calls = 1, f = [];
        f.push({ narr: 'First render: <code>{{ users | activeNames }}</code>. The pipe runs once (call #1) and Angular remembers the input reference <b>ref#1</b>.', parts: [
          { type: 'array', label: 'users (ref#' + ref + ')', values: list.slice() }, { type: 'array', label: 'what the screen shows', values: shown.slice(), hl: { 0: 'ok', 1: 'ok' } }, { type: 'vars', label: 'pipe', vals: { 'transform calls': calls, 'cached for': 'ref#' + cachedRef } }] });
        var extra = ['Chen', 'Dev', 'Esha', 'Farid', 'Gita', 'Hari', 'Ila', 'Jay'], e = 0;
        for (var i = 0; i < steps.length; i++) {
          var s = steps[i], narr;
          if (s === 'push') {
            list.push(extra[e++ % extra.length]);
            narr = 'Code does <code>users.push(...)</code>. The array <b>changed inside</b> but the reference is still ref#' + ref + '. On the next check the pure pipe sees the same reference and ' + H.c('r', 'skips') + ' transform. The screen is now stale.';
          } else if (s === 'new') {
            list = list.slice(); ref++;
            narr = 'Code assigns a <b>new array</b> (<code>users = [...users]</code>, ref#' + ref + '). Different reference → the pipe ' + H.c('g', 'runs') + ' and the screen is correct again.';
          } else {
            narr = 'A change detection pass happens (some unrelated click). Same reference ref#' + ref + ' → transform is ' + H.c('g', 'skipped') + ' and the cached result is reused. This is why pure pipes are cheap.';
          }
          var hl = {};
          if (ref !== cachedRef) { calls++; cachedRef = ref; shown = list.slice(); }
          for (var k = 0; k < list.length; k++) hl[k] = k < shown.length ? 'ok' : 'bad';
          f.push({ narr: narr, parts: [
            { type: 'array', label: 'users (ref#' + ref + ')', values: list.slice(), hl: hl },
            { type: 'array', label: 'what the screen shows', values: shown.slice() },
            { type: 'vars', label: 'pipe', vals: { 'transform calls': calls, 'cached for': 'ref#' + cachedRef, stale: shown.length !== list.length }, hl: { stale: shown.length !== list.length ? 'bad' : 'ok' } }] });
        }
        f.push({ narr: 'Lesson: with pure pipes (and OnPush, and signals) <b>update immutably</b>: create a new array or object instead of mutating. Only reach for <code>pure: false</code> when the input is truly mutable, and keep it fast.', parts: [{ type: 'vars', label: 'final', vals: { 'transform calls': calls, 'checks run': steps.length + 1 } }] });
        return f;
      }
    },
    examples: [
      { title: 'Chaining and arguments', html: `<p><code>{{ order.placedAt | date:"shortTime" | lowercase }}</code> runs left to right. Arguments follow colons: <code>currency:"USD":"code":"1.2-2"</code> (currency code, display, digits). Locale-sensitive pipes use <code>LOCALE_ID</code>; register extra locale data for non-<code>en-US</code> formatting.</p>` },
      { title: 'async pipe with @if', html: `<p><code>@if (user$ | async; as user) { {{ user.name }} } @else { Loading… }</code> subscribes once and exposes the value. With signals you can convert instead: <code>user = toSignal(this.user$)</code> and read <code>user()</code>.</p>` },
      { title: 'A truncate pipe', html: `<p><code>{{ review.text | truncate:80 }}</code> keeps reviews short in a card.</p>`, code: ng(`@Pipe({ name: 'truncate' })
export class TruncatePipe implements PipeTransform {
  transform(text: string | null | undefined, max = 100, suffix = '…'): string {
    if (!text) return '';
    return text.length <= max ? text : text.slice(0, max).trimEnd() + suffix;
  }
}`, 'Custom truncate pipe') },
      { title: 'Why there is no built-in filter/orderBy pipe', html: `<p>AngularJS had <code>filter</code> and <code>orderBy</code>. Angular removed them because, to see changes in arrays, they would have to be impure and run on every check, which was a major performance problem. The guidance: filter and sort in the component (today, a <code>computed</code> signal).</p>` }
    ],
    deepDive: `<h5>🟣 How pure pipes are compiled</h5>
      <p>The compiler turns <code>{{ x | myPipe:a }}</code> into an instruction like <code>ɵɵpipeBind2(index, slot, x, a)</code>. The runtime stores the previous arguments in the view's binding slots; if all are identical (<code>Object.is</code>), it returns the cached result without calling <code>transform</code>. One pipe instance is created per usage in the template (pure pipes may be shared), so pipes can also hold a little state.</p>
      <h5>🟣 Impure pipes and AsyncPipe</h5>
      <p>An impure pipe's <code>transform</code> runs on every check of its view. <code>AsyncPipe</code> is impure because the latest value can change without the input reference changing. Internally it subscribes when it first sees an Observable, stores the latest value, calls <code>markForCheck()</code> on each emission (so it works with OnPush), switches subscriptions if the Observable reference changes, and unsubscribes in its <code>ngOnDestroy</code>.</p>
      <h5>🟣 Pipes and DI</h5>
      <p>Pipes can <code>inject()</code> services, e.g. a <code>TranslatePipe</code> that reads the current language. If the language can change at runtime, a pure pipe would not update (same key in), which is why such pipes either take the language as an extra argument (so a change re-runs them) or are made impure and kept very cheap.</p>
      <h5>🟣 Pipes in code</h5>
      <p>You can inject and call a built-in pipe in TypeScript (<code>new DatePipe("en-US").transform(d)</code>), but for formatting in code prefer <code>formatDate</code>, <code>formatCurrency</code>, <code>formatNumber</code> from <code>@angular/common</code>, or <code>Intl</code>.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI writes custom pipes instantly. Your value is knowing when a pipe is the right tool and keeping it pure.</p>
      <p><b>Use AI as a partner:</b> <code>Which method calls in this template should become pure pipes or computed signals? Estimate how often each runs</code>.</p>
      <p><b>Where AI goes wrong:</b> generating <code>filter</code>/<code>sort</code> pipes with <code>pure: false</code>, mutating arrays and wondering why a pure pipe is stale, forgetting to import the pipe, or doing network calls inside <code>transform</code>.</p>
      <p><b>What you must still own:</b> the pure/impure model, reference equality, and the async pipe's subscription lifecycle.</p>`,
    problems: [{
      title: 'Write a Pure "timeAgo" Pipe',
      level: 'Medium', tags: ['pipes', 'pure', 'formatting'], companies: ['LinkedIn', 'ShareChat'],
      statement: `<p>Write a pipe <code>timeAgo</code> that turns a timestamp (Date or epoch ms) into "just now" (&lt; 60 s), "5 min ago", "3 h ago", "2 days ago", or a short date ("6 Apr 2024") if older than 7 days. It takes an optional <code>now</code> argument (ms) so it stays pure and testable. Use it as <code>{{ post.createdAt | timeAgo:now() }}</code> where <code>now</code> is a signal updated every minute.</p>`,
      constraints: `Pure pipe. Handle <code>null</code>/<code>undefined</code> by returning an empty string. Future dates show "just now".`,
      example: `${H.table(['created', 'now', 'output'], [['now − 20 s', 'now', 'just now'], ['now − 5 min', 'now', '5 min ago'], ['now − 26 h', 'now', '1 day ago'], ['now − 10 days', 'now', 'short date']])}`,
      brute: { why: `<p>Make the pipe impure and call <code>Date.now()</code> inside <code>transform</code>. It "updates by itself", but runs on every change detection for every post (hundreds of calls per click) and gives different answers in tests.</p>`, code: ng(`@Pipe({ name: 'timeAgo', pure: false })     // runs on EVERY check
export class BadTimeAgo implements PipeTransform {
  transform(d: Date) {
    const s = (Date.now() - d.getTime()) / 1000;  // hidden input: the clock
    return Math.floor(s / 60) + ' min ago';
  }
}`, 'Impure pipe with a hidden clock') },
      mcq: { q: 'Why pass <code>now</code> as an argument instead of reading <code>Date.now()</code> in transform?', options: ['Arguments are faster to type', 'A pure pipe re-runs only when inputs/arguments change; passing now makes the update explicit and the pipe deterministic', 'Date.now() is not allowed in TypeScript', 'Angular forbids Date in pipes'], answer: 1, explain: 'The pipe stays pure and testable; when the now signal ticks, the argument changes and Angular re-runs transform exactly then.' },
      hints: [
        `<p>Hint 1: A pure function must get everything it depends on as input. The current time is an input too.</p>`,
        `<p>Hint 2: Compute <code>diff = (now - time) / 1000</code> and walk thresholds: 60 s, 3600 s, 86400 s, 7 days.</p>`,
        `<p>Hint 3: Recipe: if value is null return ""; t = value instanceof Date ? value.getTime() : value; s = max(0, floor((now - t)/1000)); &lt;60 → "just now"; &lt;3600 → floor(s/60)+" min ago"; &lt;86400 → floor(s/3600)+" h ago"; &lt;7 days → n + (n === 1 ? " day ago" : " days ago"); else formatDate.</p>`
      ],
      solution: {
        approach: `<p>All inputs are explicit, so the pipe is pure and cached per <code>(value, now)</code>. A minute-ticking <code>now</code> signal in the component updates every row exactly once per minute. <code>formatDate</code> handles old dates using the app locale.</p>`,
        code: ng(`import { Pipe, PipeTransform, inject, LOCALE_ID } from '@angular/core';
import { formatDate } from '@angular/common';

@Pipe({ name: 'timeAgo' })   // pure by default
export class TimeAgoPipe implements PipeTransform {
  private locale = inject(LOCALE_ID);

  transform(value: Date | number | null | undefined, now: number = Date.now()): string {
    if (value === null || value === undefined) return '';
    const t = value instanceof Date ? value.getTime() : value;
    const s = Math.max(0, Math.floor((now - t) / 1000));
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + ' min ago';
    if (s < 86400) return Math.floor(s / 3600) + ' h ago';
    const days = Math.floor(s / 86400);
    if (days < 7) return days + (days === 1 ? ' day ago' : ' days ago');
    return formatDate(t, 'd MMM y', this.locale);
  }
}

// In the component:
//   now = signal(Date.now());
//   constructor() { const id = setInterval(() => this.now.set(Date.now()), 60_000);
//                   inject(DestroyRef).onDestroy(() => clearInterval(id)); }
// Template: {{ post.createdAt | timeAgo:now() }}`, 'Solution'),
        alt: [jsrun(`function timeAgo(value, now) {
  if (value === null || value === undefined) return '';
  const t = value instanceof Date ? value.getTime() : value;
  const s = Math.max(0, Math.floor((now - t) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + ' min ago';
  if (s < 86400) return Math.floor(s / 3600) + ' h ago';
  const days = Math.floor(s / 86400);
  if (days < 7) return days + (days === 1 ? ' day ago' : ' days ago');
  return new Date(t).toDateString();
}
const now = Date.UTC(2024, 3, 16, 12, 0, 0);
for (const ago of [20, 300, 3 * 3600, 26 * 3600, 3 * 86400, 10 * 86400, -50]) console.log(ago, '->', timeAgo(now - ago * 1000, now));
console.log('null ->', JSON.stringify(timeAgo(null, now)));`, 'Plain JS model (runnable)')],
        complexity: `<p>O(1) per call, and thanks to purity it is called at most once per (value, now) pair per row.</p>`,
        followUps: ['Use Intl.RelativeTimeFormat for localisation.', 'How would you share one ticking now signal across the app?']
      }
    }]
  });

  /* ======================= TOPIC 8: DIRECTIVES ======================= */
  topics.push({
    title: 'Directives: Attribute, Structural and Host Bindings',
    analogy: `<p>If a component is a <b>whole new appliance</b> (it brings its own body: a template), a directive is a <b>sticker with superpowers</b> you put on an existing appliance. Stick a "glow when touched" sticker (<code>appHighlight</code>) on any button, card or row and it starts glowing, without changing what the thing is. A <b>structural</b> directive is a sticker that decides whether the appliance is in the room at all, or how many copies there are.</p>`,
    explain: `<p>A <b>directive</b> is a class with <code>@Directive</code> that adds behaviour to an element it is placed on. Angular has three families:</p>
      ${H.table(['Kind', 'What it does', 'Examples'], [
        ['<b>Component</b>', 'a directive <i>with a template</i>', 'every <code>@Component</code>'],
        ['<b>Attribute directive</b>', 'changes look or behaviour of the host element', '<code>NgClass</code>, <code>NgStyle</code>, <code>NgModel</code>, <code>RouterLink</code>, your <code>appHighlight</code>'],
        ['<b>Structural directive</b>', 'adds/removes DOM by creating views from an <code>&lt;ng-template&gt;</code>', '<code>*ngIf</code>, <code>*ngFor</code>, <code>*ngTemplateOutlet</code>, your <code>*appPermission</code>']
      ])}
      <h5>🟢 1. An attribute directive</h5>
      <p><code>@Directive({ selector: "[appHighlight]" })</code>: the square brackets mean "match any element that has this attribute". Inside, use the <code>host</code> metadata to bind properties and listen to events on that element: <code>host: { "(mouseenter)": "on.set(true)", "[style.backgroundColor]": "on() ? color() : null" }</code>. Directives can have <code>input()</code>s and <code>output()</code>s like components. Use it as <code>&lt;p appHighlight color="gold"&gt;</code>, after adding <code>Highlight</code> to <code>imports</code>.</p>
      <h5>🟢 2. Built-in attribute directives</h5>
      <p><code>[ngClass]="{ active: isActive, disabled: !enabled }"</code> and <code>[ngStyle]</code> set many classes/styles at once, but plain <code>[class]</code> and <code>[style]</code> bindings now do the same and are preferred. <code>ngModel</code> is a directive too.</p>
      <h5>🔵 3. A structural directive</h5>
      <p>A structural directive receives a <code>TemplateRef</code> (the blueprint of the element it sits on) and a <code>ViewContainerRef</code> (the spot in the DOM). It calls <code>createEmbeddedView(templateRef)</code> to stamp a copy and <code>clear()</code> to remove it. The <code>*</code> prefix is sugar for wrapping the element in <code>&lt;ng-template&gt;</code>. Since v17 most of these needs are covered by <code>@if</code>/<code>@for</code>, but custom ones (permissions, feature flags) are still common interview tasks.</p>
      <h5>🔵 4. Host bindings: modern vs legacy</h5>
      <p>Prefer the <code>host</code> object in the decorator. The older decorators <code>@HostBinding("class.active") active = true</code> and <code>@HostListener("click", ["$event"]) onClick(e) {}</code> do the same thing and appear in most existing codebases. Directives get the host element via <code>inject(ElementRef)</code>; change it through bindings or <code>Renderer2</code>, not by direct DOM manipulation, so it works with SSR.</p>
      <h5>🔵 5. Host directives (composition)</h5>
      <p><code>hostDirectives: [Tooltip, { directive: Highlight, inputs: ["color"] }]</code> attaches directives to a component automatically, a composition tool for design systems (like mixins without inheritance).</p>`,
    clues: [
      '"Add the same behaviour to many elements" (highlight, autofocus, click-outside, tooltip) → attribute directive',
      '"Show an element only for admins" / "feature flag in the template" → custom structural directive',
      '"Component vs directive" → a component is a directive with a template',
      '"What is TemplateRef / ViewContainerRef?" → the blueprint vs the place where views are inserted',
      '"@HostListener / @HostBinding" → legacy decorators; modern: <code>host</code> metadata',
      '"Why only one structural directive per element?" → each one owns the <code>&lt;ng-template&gt;</code> wrapper; nest with <code>ng-container</code>'
    ],
    code: [
      ng(`import { Directive, input, signal, inject, ElementRef } from '@angular/core';

// Attribute directive: <p appHighlight color="gold">Hover me</p>
@Directive({
  selector: '[appHighlight]',
  host: {
    '(mouseenter)': 'hovered.set(true)',
    '(mouseleave)': 'hovered.set(false)',
    '[style.backgroundColor]': 'hovered() ? color() : null',
    '[attr.data-highlighted]': 'hovered()',
  },
})
export class Highlight {
  color = input('yellow');
  hovered = signal(false);
}

// Attribute directive with DOM access: focus an input when it appears.
@Directive({ selector: 'input[appAutofocus]' })
export class Autofocus {
  private el = inject(ElementRef<HTMLInputElement>);
  ngAfterViewInit() { this.el.nativeElement.focus(); }
}`, 'Attribute directives with host bindings'),
      ng(`import { Directive, TemplateRef, ViewContainerRef, inject, input, effect } from '@angular/core';

// Structural directive: <button *appIfRole="'admin'">Delete</button>
@Directive({ selector: '[appIfRole]' })
export class IfRole {
  private tpl = inject(TemplateRef<unknown>);      // blueprint of the <button>
  private vcr = inject(ViewContainerRef);          // where to stamp it
  private auth = inject(AuthService);              // exposes role = signal<string>(...)
  appIfRole = input.required<string>();            // same name as the selector
  private shown = false;

  constructor() {
    effect(() => {
      const allowed = this.auth.role() === this.appIfRole();
      if (allowed && !this.shown) { this.vcr.createEmbeddedView(this.tpl); this.shown = true; }
      if (!allowed && this.shown) { this.vcr.clear(); this.shown = false; }
    });
  }
}`, 'A custom structural directive'),
      jsrun(`// Model of a structural directive: a template (blueprint) + a container (slot).
function makeContainer() {
  const views = [];
  return {
    createEmbeddedView(tpl, ctx) { const v = tpl(ctx || {}); views.push(v); return v; },
    clear() { views.length = 0; },
    html() { return views.join(''); },
  };
}
const buttonTemplate = () => '<button>Delete</button>';   // what *appIfRole sits on
const vcr = makeContainer();

function ifRole(currentRole, required) {
  vcr.clear();
  if (currentRole === required) vcr.createEmbeddedView(buttonTemplate);
  return vcr.html() || '(nothing rendered)';
}
console.log('viewer:', ifRole('viewer', 'admin'));
console.log('admin :', ifRole('admin', 'admin'));

// *ngFor-like: stamp the template once per item with a context.
const rowTpl = (ctx) => '<li>' + ctx.index + ':' + ctx.$implicit + '</li>';
vcr.clear();
['Tea', 'Coffee'].forEach((item, index) => vcr.createEmbeddedView(rowTpl, { $implicit: item, index }));
console.log('list  :', vcr.html());`, 'Plain JS model: TemplateRef + ViewContainerRef (runnable)')
    ],
    viz: {
      title: 'How *appIfRole desugars and stamps views',
      input: 'viewer admin admin viewer',
      inputLabel: 'Sequence of current user roles (up to 6); the button needs "admin"',
      gen: function (input) {
        var roles = words(input);
        if (!roles.length || roles.length > 6) throw new Error('Type 1 to 6 roles, e.g. "viewer admin"');
        var f = [];
        f.push({ narr: 'You write the short form with an asterisk. Angular rewrites it at compile time: the element moves inside an <code>&lt;ng-template&gt;</code> and the directive is placed on that template.', parts: [
          { type: 'code', label: 'You write', lang: 'html', code: '<button *appIfRole="\'admin\'">Delete</button>', hl: { 1: 'cur' } },
          { type: 'code', label: 'Angular sees', lang: 'html', code: '<ng-template [appIfRole]="\'admin\'">\n  <button>Delete</button>\n</ng-template>', hl: { 1: 'ok', 2: 'ok', 3: 'ok' } }] });
        f.push({ narr: 'The directive gets two things injected: <code>TemplateRef</code> (the blueprint of the button, not rendered yet) and <code>ViewContainerRef</code> (an anchor comment in the DOM where copies can be inserted).', parts: [
          { type: 'vars', label: 'injected', vals: { TemplateRef: '<button>Delete</button> (blueprint)', ViewContainerRef: '<!--container--> anchor' } },
          { type: 'stack', label: 'views in the container', items: [] }] });
        var shown = false;
        for (var i = 0; i < roles.length; i++) {
          var allowed = roles[i] === 'admin', narr;
          if (allowed && !shown) { shown = true; narr = 'Role is <b>' + H.esc(roles[i]) + '</b> → allowed and nothing is shown yet, so call <code>createEmbeddedView(tpl)</code>. A real <code>&lt;button&gt;</code> appears.'; }
          else if (!allowed && shown) { shown = false; narr = 'Role is <b>' + H.esc(roles[i]) + '</b> → not allowed and a view exists, so call <code>vcr.clear()</code>. The button is ' + H.c('r', 'destroyed') + ' (not hidden).'; }
          else narr = 'Role is <b>' + H.esc(roles[i]) + '</b> → state already correct (' + (shown ? 'shown' : 'hidden') + '), so the directive does <b>nothing</b>. Guarding with a flag avoids stamping duplicates.';
          f.push({ narr: narr, parts: [
            { type: 'array', label: 'role changes', values: roles, hl: (function (j, ok) { var o = {}; for (var k = 0; k < j; k++) o[k] = 'done'; o[j] = ok ? 'ok' : 'bad'; return o; })(i, allowed) },
            { type: 'stack', label: 'views in the container', items: shown ? ['<button>Delete</button>'] : [], hl: shown ? { 0: 'ok' } : {} }] });
        }
        f.push({ narr: 'That is all a structural directive is: decide <b>when</b> (and how many times, with what context) to stamp the template. <code>@if</code> and <code>@for</code> do the same job, compiled into the framework.', parts: [
          { type: 'vars', label: 'final', vals: { 'button rendered': shown } }] });
        return f;
      }
    },
    examples: [
      { title: 'Click-outside directive', html: `<p>Close a dropdown when the user clicks anywhere else. Listen on the document via <code>host: { "(document:click)": "onDoc($event)" }</code>, compare <code>event.target</code> with the host element and emit an output.</p>`, code: ng(`@Directive({ selector: '[appClickOutside]', host: { '(document:click)': 'onDocClick($event)' } })
export class ClickOutside {
  private el = inject(ElementRef<HTMLElement>);
  appClickOutside = output<void>();
  onDocClick(e: MouseEvent) {
    if (!this.el.nativeElement.contains(e.target as Node)) this.appClickOutside.emit();
  }
}
// <div class="menu" (appClickOutside)="open.set(false)">...</div>`, 'Click outside') },
      { title: 'ngClass vs [class]', html: `<p><code>[ngClass]="{ active: a, error: e }"</code> needs the <code>NgClass</code> import. <code>[class]="{ active: a, error: e }"</code> and <code>[class.active]="a"</code> are built into the template syntax, need no import and are what the style guide recommends today.</p>` },
      { title: 'Legacy host decorators', html: `<p>You will see this in older code. It is equivalent to the <code>host</code> object version.</p>`, code: ng(`@Directive({ selector: '[appHighlight]' })
export class HighlightLegacy {
  @Input() appHighlight = 'yellow';
  @HostBinding('style.backgroundColor') bg: string | null = null;
  @HostListener('mouseenter') onEnter() { this.bg = this.appHighlight; }
  @HostListener('mouseleave') onLeave() { this.bg = null; }
}`, '@HostBinding / @HostListener') },
      { title: 'ng-container and ng-template', html: `<p><code>&lt;ng-container&gt;</code> is a grouping element that renders <b>nothing</b> in the DOM, handy for applying a directive to several siblings. <code>&lt;ng-template #tpl&gt;</code> is a blueprint that renders nothing until something stamps it, e.g. <code>&lt;ng-container *ngTemplateOutlet="tpl; context: { $implicit: user }" /&gt;</code>.</p>` }
    ],
    deepDive: `<h5>🟣 Directive matching</h5>
      <p>Selectors are CSS-like: element (<code>app-card</code>), attribute (<code>[appTooltip]</code>), attribute with value, class (<code>.x</code>, rare), combinations (<code>input[appAutofocus]</code>) and <code>:not()</code>. The compiler matches every directive in the template's compilation scope against every element, so several directives can apply to one element; but only <b>one component</b> per element. Directive inputs whose name equals the selector allow <code>appHighlight="gold"</code> usage.</p>
      <h5>🟣 Microsyntax</h5>
      <p><code>*ngFor="let item of items; index as i; trackBy: fn"</code> is parsed into inputs <code>ngForOf</code>, <code>ngForTrackBy</code> and template variables bound from the context (<code>$implicit</code>, <code>index</code>). That is why a structural directive's inputs are named with the selector as prefix. A static <code>ngTemplateContextGuard</code> lets strict templates type the context.</p>
      <h5>🟣 Dependency injection in directives</h5>
      <p>Directives can inject the host component, other directives on the same element, <code>ElementRef</code>, <code>TemplateRef</code>, <code>ViewContainerRef</code> and <code>Renderer2</code>. This is how <code>NgModel</code> finds the <code>ControlValueAccessor</code> for an input and how <code>RouterLinkActive</code> finds child <code>RouterLink</code>s.</p>
      <h5>🟣 Performance and SSR</h5>
      <p>Direct <code>nativeElement</code> manipulation bypasses Angular and breaks on the server (no DOM) and with hydration if it changes the server-rendered markup. Prefer host bindings; for imperative work use <code>afterNextRender</code>. Document-level listeners in many directive instances add up: consider one shared service.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI can produce directive boilerplate instantly. The skill is recognising when a directive (behaviour on existing elements) beats a component (new UI) and writing it SSR-safe.</p>
      <p><b>Use AI as a partner:</b> <code>Turn these copy-pasted mouseenter/mouseleave handlers into one directive with host bindings</code>, or <code>Convert @HostBinding/@HostListener to host metadata</code>.</p>
      <p><b>Where AI goes wrong:</b> direct <code>document.querySelector</code> calls, <code>nativeElement.innerHTML</code> writes (XSS), forgetting to clear the view container, or making a structural directive when an <code>@if</code> would do.</p>
      <p><b>What you must still own:</b> the TemplateRef/ViewContainerRef mental model and the asterisk desugaring, which interviewers love.</p>`,
    problems: [{
      title: 'Build an appTooltip Attribute Directive',
      level: 'Medium', tags: ['directive', 'host', 'input'], companies: ['Atlassian', 'Freshworks'],
      statement: `<p>Create <code>[appTooltip]</code>: <code>&lt;button appTooltip="Save changes"&gt;💾&lt;/button&gt;</code>. On hover or keyboard focus it sets <code>aria-describedby</code> and a <code>data-tooltip</code> attribute (CSS shows the bubble from <code>attr(data-tooltip)</code>); on mouseleave, blur or Escape it removes them. Add an optional <code>tooltipDelay</code> input (ms, default 0).</p>`,
      constraints: `No direct DOM writes; use <code>host</code> bindings. Clear any pending timeout when hidden or destroyed. Keyboard accessible.`,
      example: `${H.table(['event', 'data-tooltip', 'aria-describedby'], [['mouseenter', '"Save changes"', 'tip-1'], ['keydown.escape', 'removed', 'removed'], ['focus', '"Save changes"', 'tip-1']])}`,
      brute: { why: `<p>Add <code>(mouseenter)</code>/<code>(mouseleave)</code> handlers and a <code>showTip</code> boolean to <b>every</b> component that needs a tooltip. The behaviour is copy-pasted many times, keyboard users are forgotten, and fixes must be applied everywhere.</p>`, code: tpl(`<!-- repeated in every component -->
<button (mouseenter)="showTip = true" (mouseleave)="showTip = false">💾</button>
@if (showTip) { <span class="tip">Save changes</span> }`, 'Copy-pasted hover state') },
      mcq: { q: 'Which selector makes the directive apply to <code>&lt;button appTooltip="..."&gt;</code>?', options: ['<code>appTooltip</code>', '<code>[appTooltip]</code>', '<code>.appTooltip</code>', '<code>#appTooltip</code>'], answer: 1, explain: 'Square brackets in a selector match an attribute. A bare name would match an element called appTooltip.' },
      hints: [
        `<p>Hint 1: The behaviour belongs to existing elements of any type, not to new UI. That is an attribute directive.</p>`,
        `<p>Hint 2: Keep a <code>visible = signal(false)</code>. Host listeners for mouseenter/focus/mouseleave/blur/keydown.escape; host bindings <code>[attr.data-tooltip]</code> and <code>[attr.aria-describedby]</code> that return <code>null</code> when hidden (null removes an attribute).</p>`,
        `<p>Hint 3: show(): clear the old timeout, then <code>setTimeout(() =&gt; visible.set(true), tooltipDelay())</code>; hide(): clear the timeout and set false; register <code>DestroyRef.onDestroy(clear)</code>. Give each instance a unique id from a static counter.</p>`
      ],
      solution: {
        approach: `<p>One directive owns the behaviour; templates just add the attribute. Attribute bindings returning <code>null</code> remove the attribute, so no manual DOM code is needed. Focus/blur/Escape make it keyboard accessible, and the timeout is always cleared.</p>`,
        code: ng(`import { Directive, input, signal, inject, DestroyRef } from '@angular/core';

let nextId = 0;

@Directive({
  selector: '[appTooltip]',
  host: {
    '(mouseenter)': 'show()',
    '(focus)': 'show()',
    '(mouseleave)': 'hide()',
    '(blur)': 'hide()',
    '(keydown.escape)': 'hide()',
    '[attr.data-tooltip]': 'visible() ? appTooltip() : null',
    '[attr.aria-describedby]': 'visible() ? id : null',
  },
})
export class Tooltip {
  appTooltip = input.required<string>();     // the text: appTooltip="Save changes"
  tooltipDelay = input(0);
  visible = signal(false);
  readonly id = 'tip-' + ++nextId;
  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  show() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.visible.set(true), this.tooltipDelay());
  }

  hide() {
    clearTimeout(this.timer);
    this.visible.set(false);
  }
}
/* global CSS:
[data-tooltip] { position: relative; }
[data-tooltip]::after { content: attr(data-tooltip); position: absolute; top: 110%; left: 0;
  background: #222; color: #fff; padding: 4px 8px; border-radius: 4px; white-space: nowrap; } */`, 'Solution'),
        alt: [jsrun(`// Model of the host attribute bindings: null removes the attribute.
function render(visible, text, id) {
  const attrs = { 'data-tooltip': visible ? text : null, 'aria-describedby': visible ? id : null };
  return Object.entries(attrs).filter(([, v]) => v !== null).map(([k, v]) => k + '="' + v + '"').join(' ') || '(no tooltip attributes)';
}
let visible = false;
const events = { mouseenter: true, focus: true, mouseleave: false, blur: false, escape: false };
for (const e of ['mouseenter', 'escape', 'focus', 'blur']) { visible = events[e]; console.log(e.padEnd(10), '->', render(visible, 'Save changes', 'tip-1')); }`, 'Plain JS model (runnable)')],
        complexity: `<p>O(1) per event. No global listeners, so cost scales only with elements the user interacts with.</p>`,
        followUps: ['Render a real tooltip component in an overlay (CDK Overlay) instead of CSS.', 'Attach the tooltip to a component with hostDirectives.']
      }
    }]
  });

  /* ======================= TOPIC 9: NGMODULES VS STANDALONE ======================= */
  topics.push({
    title: 'NgModules vs Standalone: Old and New Architecture',
    analogy: `<p>NgModules are like <b>departments in an office</b>: to use the printer from Finance you had to be <i>in</i> Finance or Finance had to <i>lend</i> it to your department, and the paperwork lived in a separate file. Standalone is <b>everyone carrying their own toolkit</b>: each person lists the few tools they use, and you can send one person to another office (lazy load) without moving the whole department.</p>`,
    explain: `<p>From Angular 2 to 13 every component, directive and pipe had to belong to an <b>NgModule</b>. Standalone APIs arrived in v14, became the CLI default in v17 and the decorator default in v19. You must understand both, because most production apps are still partly module-based.</p>
      <h5>🟢 1. What an NgModule declares</h5>
      ${H.table(['Field', 'Meaning'], [
        ['<code>declarations</code>', 'components/directives/pipes that <b>belong</b> to this module (each can be declared in only one module)'],
        ['<code>imports</code>', 'other modules whose <b>exported</b> things my declarations can use (e.g. <code>CommonModule</code>, <code>FormsModule</code>)'],
        ['<code>exports</code>', 'what modules that import me may use'],
        ['<code>providers</code>', 'services registered in the injector (for eager modules, effectively the root)'],
        ['<code>bootstrap</code>', 'root component (only in the root <code>AppModule</code>)']
      ])}
      <h5>🟢 2. The same app, both ways</h5>
      ${H.table(['Concern', 'NgModule style', 'Standalone style'], [
        ['Start the app', '<code>platformBrowserDynamic().bootstrapModule(AppModule)</code>', '<code>bootstrapApplication(App, appConfig)</code>'],
        ['Use a child component', 'declare it (or import its module)', 'add it to the component\'s <code>imports</code>'],
        ['Router', '<code>RouterModule.forRoot(routes)</code>', '<code>provideRouter(routes)</code>'],
        ['HTTP', '<code>HttpClientModule</code>', '<code>provideHttpClient()</code>'],
        ['Lazy load', '<code>loadChildren: () =&gt; import("./admin.module").then(m =&gt; m.AdminModule)</code>', '<code>loadComponent: () =&gt; import("./admin")</code> or <code>loadChildren</code> to a routes file'],
        ['Shared UI', 'a <code>SharedModule</code> exporting everything', 'import exactly what each component uses']
      ])}
      <h5>🔵 3. Why the change</h5>
      <p>Modules added an indirection: to understand what a template could use, you had to find which module declared it and what that module imported. "Shared modules" pulled in far more than needed, hurting tree-shaking and lazy loading. Standalone makes each file self-describing, removes boilerplate, and makes lazy loading a single component trivial.</p>
      <h5>🔵 4. They interoperate</h5>
      <p>A standalone component can <code>imports: [SomeLegacyModule]</code> to use its exported components. An NgModule can <code>imports: [MyStandaloneComponent]</code> to use it in declared components. Migration is incremental with <code>ng g @angular/core:standalone</code> (convert declarations → remove unnecessary modules → switch to <code>bootstrapApplication</code>).</p>
      <h5>🔵 5. forRoot / forChild</h5>
      <p>Module libraries used <code>forRoot()</code> (providers + config once, in the root) and <code>forChild()</code> (no singleton providers, for lazy modules) to avoid creating duplicate services. Standalone equivalents are <code>provideX()</code> functions in <code>app.config.ts</code> or in a route's <code>providers</code>.</p>`,
    clues: [
      '"What is an NgModule? declarations vs imports vs exports vs providers" → classic interview question; know each field',
      '"Component declared in two modules" error → each declarable belongs to exactly one NgModule',
      '"What is a standalone component and why was it introduced?" → no module needed; explicit deps, better tree-shaking/lazy loading',
      '"forRoot vs forChild" → singleton providers once in the root vs routes only in lazy modules',
      '"Migrate an old app" → standalone migration schematic, incremental interop',
      '"Lazy load a single page" → <code>loadComponent</code>'
    ],
    code: [
      ng(`// LEGACY: module-based app
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';   // deprecated in favour of provideHttpClient
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [AppComponent, ProductCardComponent, PricePipe],  // things that BELONG here
  imports: [BrowserModule, HttpClientModule, FormsModule,
            RouterModule.forRoot(routes)],                         // what declarations may use
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}

// main.ts
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
platformBrowserDynamic().bootstrapModule(AppModule).catch((e) => console.error(e));

// declared components must say standalone: false in v19+
@Component({ selector: 'app-product-card', standalone: false, templateUrl: './product-card.component.html' })
export class ProductCardComponent {}`, 'NgModule style'),
      ng(`// MODERN: standalone app (same behaviour)
// main.ts
bootstrapApplication(App, {
  providers: [provideRouter(routes), provideHttpClient()],
});

// app.ts
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ProductCard, PricePipe, FormsModule],  // only what this template uses
  templateUrl: './app.html',
})
export class App {}

// app.routes.ts: lazy load one component or a whole feature's routes
export const routes: Routes = [
  { path: '', loadComponent: () => import('./home/home').then((m) => m.Home) },
  { path: 'admin', loadChildren: () => import('./admin/admin.routes').then((m) => m.ADMIN_ROUTES) },
];

// Interop: a standalone component can still import a legacy NgModule
@Component({ selector: 'app-report', imports: [LegacyChartsModule], template: '<old-chart />' })
export class Report {}`, 'Standalone style'),
      jsrun(`// Model of "compilation scope": what may a template use?
const CommonModule = { exports: ['ngIf', 'ngFor', 'date'] };
const SharedModule = { exports: ['app-card', 'app-button', 'app-modal', 'app-table', 'app-chart'] };

function moduleScope(mod) {                      // NgModule: own declarations + imported exports
  const scope = new Set(mod.declarations);
  mod.imports.forEach((m) => m.exports.forEach((e) => scope.add(e)));
  return scope;
}
function standaloneScope(cmp) {                  // standalone: exactly what it imports
  return new Set(cmp.imports);
}
const AppModule = { declarations: ['app-root', 'app-product-list'], imports: [CommonModule, SharedModule] };
const ProductList = { imports: ['app-card', 'date'] };

console.log('module scope   :', [...moduleScope(AppModule)].length, 'things ->', [...moduleScope(AppModule)].join(', '));
console.log('standalone scope:', [...standaloneScope(ProductList)].length, 'things ->', [...standaloneScope(ProductList)].join(', '));
console.log('A lazy chunk for ProductList only needs what it imports, not the whole SharedModule.');`, 'Plain JS model: module scope vs standalone scope (runnable)')
    ],
    viz: {
      title: 'Migrating an NgModule app to standalone, step by step',
      input: 'Header ProductList Cart',
      inputLabel: 'Components declared in AppModule (1-4 names)',
      gen: function (input) {
        var cs = words(input);
        if (!cs.length || cs.length > 4) throw new Error('Type 1 to 4 component names');
        var f = [];
        var rows = cs.map(function (c) { return [c, 'declared in AppModule', 'standalone: false']; });
        f.push({ narr: 'Start: every component is listed in <code>AppModule.declarations</code>. Templates can use anything AppModule declares or imports (<code>CommonModule</code>, <code>FormsModule</code>, <code>SharedModule</code>…), whether they need it or not.', parts: [
          { type: 'table', label: 'Components', columns: ['component', 'belongs to', 'flag'], rows: rows },
          { type: 'graph', label: 'Dependencies', directed: true, height: 40, nodes: [{ id: 'm', label: 'AppModule', x: 50, y: 8, shape: 'box', w: 20 }].concat(cs.map(function (c, i) { return { id: c, label: c, x: 12 + i * (76 / Math.max(1, cs.length - 1 || 1)), y: 32, shape: 'box', w: 18 }; })), edges: cs.map(function (c) { return ['m', c]; }) }] });
        for (var i = 0; i < cs.length; i++) {
          rows = rows.map(function (r) { return r.slice(); });
          rows[i] = [cs[i], 'itself', 'standalone (default)'];
          var hl = {}; hl[i] = 'ok';
          f.push({ narr: 'Schematic step 1 for <b>' + H.esc(cs[i]) + '</b>: remove <code>standalone: false</code>, move it from <code>declarations</code> into its users\' <code>imports</code>, and give it its own <code>imports</code> list with only what its template uses (e.g. <code>RouterLink</code>, <code>CurrencyPipe</code>).', parts: [
            { type: 'table', label: 'Components', columns: ['component', 'belongs to', 'flag'], rows: rows, hl: hl }] });
        }
        f.push({ narr: 'Step 2: <code>AppModule</code> now declares nothing; remove it. Its providers move to <code>app.config.ts</code> as <code>provideRouter</code>, <code>provideHttpClient</code>, etc.', parts: [
          { type: 'table', label: 'Providers', columns: ['before (module)', 'after (function)'], rows: [['RouterModule.forRoot(routes)', 'provideRouter(routes)'], ['HttpClientModule', 'provideHttpClient()'], ['BrowserAnimationsModule', 'provideAnimationsAsync() (or CSS animations)']], hl: { 0: 'ok', 1: 'ok' } }] });
        f.push({ narr: 'Step 3: <code>main.ts</code> switches from <code>bootstrapModule(AppModule)</code> to <code>bootstrapApplication(App, appConfig)</code>. Behaviour is identical; the dependency graph is now explicit per component, and each route can <code>loadComponent</code> lazily.', parts: [
          { type: 'code', label: 'main.ts', lang: 'ts', code: '// before\nplatformBrowserDynamic().bootstrapModule(AppModule);\n// after\nbootstrapApplication(App, appConfig);', hl: { 2: 'bad', 4: 'ok' } }] });
        return f;
      }
    },
    examples: [
      { title: 'The "declared in two modules" error', html: `<p>Declaring <code>PricePipe</code> in both <code>ProductsModule</code> and <code>CartModule</code> fails: "Type PricePipe is part of the declarations of 2 modules". The legacy fix was a <code>SharedModule</code> that declares and exports it, imported by both. With standalone, each component simply imports <code>PricePipe</code>.</p>` },
      { title: 'SharedModule bloat', html: `<p>A <code>SharedModule</code> exporting 40 components is imported by every feature module. A lazy feature that uses 2 of them still depends on the whole module, which makes bundling and code review harder. Standalone imports keep each feature's dependency list honest.</p>` },
      { title: 'Feature module with lazy routes (legacy)', html: `<p>Old lazy loading required a module: <code>{ path: "admin", loadChildren: () =&gt; import("./admin/admin.module").then(m =&gt; m.AdminModule) }</code> with <code>RouterModule.forChild(adminRoutes)</code> inside. Modern code points <code>loadChildren</code> at a plain <code>Routes</code> array, and route-level <code>providers</code> replace feature-module providers.</p>` },
      { title: 'When you still see NgModules', html: `<p>Some libraries still ship NgModules (older UI kits), large enterprise apps migrate gradually, and tests may use <code>TestBed.configureTestingModule({ imports: [MyStandaloneCmp] })</code>, which is itself module-shaped. Knowing both is expected.</p>` }
    ],
    deepDive: `<h5>🟣 Injector hierarchy differences</h5>
      <p>Providers in an <b>eagerly imported</b> NgModule land in the root injector (which surprised many people). A <b>lazy-loaded</b> module creates a child <b>environment injector</b>, so services provided there get a separate instance for that feature, a classic source of "why do I have two instances of my service?" bugs. In standalone apps, <code>providers</code> on a route create an environment injector for that route subtree, and <code>@Injectable({ providedIn: "root" })</code> remains the default for singletons (and is tree-shakable).</p>
      <h5>🟣 Standalone under the hood</h5>
      <p>A standalone component's definition includes its dependencies directly. When it imports an NgModule, Angular collects that module's exported declarables into the component's scope and its providers into a standalone injector created for the component when needed. <code>importProvidersFrom(SomeModule)</code> extracts providers from legacy modules into an <code>ApplicationConfig</code>.</p>
      <h5>🟣 Timeline</h5>
      <p>v14: standalone in developer preview. v15: stable, plus <code>provideRouter</code>/<code>provideHttpClient</code>. v16: standalone migration schematic. v17: CLI generates standalone by default; new control flow. v19: <code>standalone: true</code> is the default for components, directives and pipes. NgModules are <b>not</b> deprecated, but new guidance and docs are standalone-first.</p>
      <h5>🟣 Testing</h5>
      <p>For standalone components, put the component itself in <code>TestBed</code>'s <code>imports</code>; override its dependencies with <code>TestBed.overrideComponent(C, { set: { imports: [...] } })</code> or provide mocks via <code>providers</code>.</p>`,
    aiEra: `<p><b>What AI changes:</b> Migration is largely mechanical, and AI plus Angular's schematics do most of it. Humans decide the order, handle edge cases (dynamic components, library modules) and review.</p>
      <p><b>Use AI as a partner:</b> <code>Here is my AppModule and a feature module. Produce a step-by-step migration plan to standalone and flag providers whose scope would change</code>.</p>
      <p><b>Where AI goes wrong:</b> it moves providers from a lazy module to root (changing instance counts), keeps a giant <code>SharedModule</code> imported into standalone components, or invents <code>standalone: true</code> on NgModule-declared components (error: a standalone component cannot be declared).</p>
      <p><b>What you must still own:</b> explaining declarations/imports/exports/providers clearly, and knowing which injector a provider lands in.</p>`,
    problems: [{
      title: 'Convert a Small NgModule Feature to Standalone',
      level: 'Medium', tags: ['ngmodule', 'standalone', 'migration', 'lazy loading'], companies: ['JPMorgan', 'Barclays'],
      statement: `<p>You have <code>ReportsModule</code> declaring <code>ReportsPage</code> and <code>ReportRow</code> plus a <code>PercentChangePipe</code>, importing <code>CommonModule</code> and <code>RouterModule.forChild([{ path: "", component: ReportsPage }])</code>, and lazy loaded from the app routes with <code>loadChildren</code> to the module. Convert the feature to standalone without changing behaviour, keeping it lazy loaded.</p>`,
      constraints: `No NgModule left in the feature. Each component imports only what its template uses. Lazy loading must remain.`,
      example: `${H.table(['Before', 'After'], [['<code>declarations: [ReportsPage, ReportRow, PercentChangePipe]</code>', 'each is standalone with its own <code>imports</code>'], ['<code>loadChildren: () =&gt; import(".../reports.module")</code>', '<code>loadComponent: () =&gt; import(".../reports-page")</code>']])}`,
      brute: { why: `<p>Mark the components <code>standalone: true</code> but keep them in <code>ReportsModule.declarations</code>. This does not compile ("Component is standalone, and cannot be declared in an NgModule"). Alternatively, import <code>ReportsModule</code> into every standalone component, which keeps all the module indirection.</p>`, code: ng(`@NgModule({
  declarations: [ReportsPage],           // ERROR: standalone components cannot be declared
  imports: [CommonModule],
})
export class ReportsModule {}

@Component({ selector: 'app-reports-page', standalone: true, template: '...' })
export class ReportsPage {}`, 'Half-migrated (does not compile)') },
      mcq: { q: 'After converting, how should the app route lazy load ReportsPage?', options: ['<code>component: ReportsPage</code> (eager import)', '<code>loadComponent: () =&gt; import("./reports/reports-page").then(m =&gt; m.ReportsPage)</code>', '<code>loadChildren</code> pointing at a module that no longer exists', 'Lazy loading is impossible without modules'], answer: 1, explain: 'loadComponent lazy loads a single standalone component (a default export also works without .then).' },
      hints: [
        `<p>Hint 1: Every declarable becomes self-contained: list in its own <code>imports</code> exactly what its template uses.</p>`,
        `<p>Hint 2: ReportRow uses the pipe → <code>imports: [PercentChangePipe]</code>; ReportsPage renders rows → <code>imports: [ReportRow]</code>. <code>@for</code>/<code>@if</code> need no CommonModule.</p>`,
        `<p>Hint 3: Delete ReportsModule; in app.routes use <code>loadComponent</code> (or <code>loadChildren</code> to a <code>REPORTS_ROUTES</code> array if the feature has several pages). Run the app and check the network tab: the reports chunk loads only on navigation.</p>`
      ],
      solution: {
        approach: `<p>Make each declarable standalone with explicit imports, delete the module, and point the route at the component with <code>loadComponent</code>. The bundler still splits the feature into its own chunk because it is only reached through a dynamic <code>import()</code>.</p>`,
        code: ng(`// percent-change.pipe.ts
@Pipe({ name: 'percentChange' })
export class PercentChangePipe implements PipeTransform {
  transform(now: number, before: number): string {
    if (!before) return '—';
    const pct = ((now - before) / before) * 100;
    return (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%';
  }
}

// report-row.ts
@Component({
  selector: 'tr[app-report-row]',
  imports: [PercentChangePipe],
  template: '<td>{{ row().name }}</td><td>{{ row().now | percentChange:row().before }}</td>',
})
export class ReportRow { row = input.required<{ name: string; now: number; before: number }>(); }

// reports-page.ts
@Component({
  selector: 'app-reports-page',
  imports: [ReportRow],
  template: \`
    <table><tbody>
      @for (r of rows; track r.name) { <tr app-report-row [row]="r"></tr> }
    </tbody></table>
  \`,
})
export class ReportsPage {
  rows = [{ name: 'Revenue', now: 120, before: 100 }, { name: 'Churn', now: 4, before: 5 }];
}

// app.routes.ts (ReportsModule deleted)
export const routes: Routes = [
  { path: 'reports', loadComponent: () => import('./reports/reports-page').then((m) => m.ReportsPage) },
];`, 'Solution'),
        alt: [jsrun(`const percentChange = (now, before) => !before ? '—' : ((now - before) / before * 100 >= 0 ? '+' : '') + ((now - before) / before * 100).toFixed(1) + '%';
const rows = [{ name: 'Revenue', now: 120, before: 100 }, { name: 'Churn', now: 4, before: 5 }, { name: 'New', now: 3, before: 0 }];
rows.forEach((r) => console.log(r.name.padEnd(8), percentChange(r.now, r.before)));
// "Lazy loading": the feature code is only fetched when the route is visited.
const loaded = new Set();
const loadComponent = (name) => { loaded.add(name); return name; };
console.log('chunks before navigation:', [...loaded]);
loadComponent('ReportsPage');
console.log('chunks after /reports    :', [...loaded]);`, 'Plain JS model (runnable)')],
        complexity: `<p>No runtime cost change; build output: one lazy chunk containing only ReportsPage, ReportRow and the pipe.</p>`,
        followUps: ['The module also provided ReportsService. Where does that provider go now, and does its instance scope change?', 'Why use an attribute selector (tr[app-report-row]) for a table row component?']
      }
    }]
  });

  /* ======================= PRACTICE: EASY ======================= */
  practice.push({
    title: 'Counter with Signals and Limits', level: 'Easy', tags: ['signals', 'event binding', 'property binding'], companies: ['TCS', 'Infosys'],
    statement: `<p>Build <code>app-counter</code> with buttons <b>−</b>, <b>+</b> and <b>Reset</b>. The count starts at the <code>start</code> input (default 0), never goes below 0 or above <code>max</code> (input, default 10). Disable − at 0 and + at max. Show "Limit reached" when count equals max.</p>`,
    constraints: `Use <code>signal</code>, <code>computed</code>, <code>input()</code>, <code>(click)</code> and <code>[disabled]</code>. Reset returns to <code>start</code>.`,
    example: `${H.table(['Clicks (start 0, max 2)', 'Count', 'Notes'], [['+', '1', ''], ['+', '2', '+ disabled, "Limit reached"'], ['Reset', '0', '− disabled']])}`,
    brute: { why: `<p>Use a plain number field and check limits only in the template with <code>*ngIf</code> messages, letting the value go out of range. The UI shows warnings but the state is already wrong.</p>`, code: ng(`export class BadCounter {
  count = 0;
  inc() { this.count++; }            // can exceed max
  dec() { this.count--; }            // can go negative
}`, 'No guards') },
    mcq: { q: 'Where should the "never above max" rule live?', options: ['Only in the template as a warning', 'In the update logic (clamp) plus disabled buttons for UX', 'In CSS', 'In ngOnDestroy'], answer: 1, explain: 'State must stay valid no matter how the method is called; disabled buttons are an extra UX layer.' },
    hints: [
      `<p>Hint 1: One signal holds the count; "at limit" and "at zero" are derived.</p>`,
      `<p>Hint 2: <code>count = signal(0)</code> initialised from <code>start()</code> in the constructor is too early (inputs are not set). Use <code>linkedSignal(() =&gt; this.start())</code> or set it in <code>ngOnInit</code>.</p>`,
      `<p>Hint 3: <code>inc = () =&gt; count.update(c =&gt; Math.min(max(), c + 1))</code>, <code>dec</code> with <code>Math.max(0, c - 1)</code>; <code>[disabled]="count() === max()"</code>; <code>@if (atMax()) { Limit reached }</code>.</p>`
    ],
    solution: {
      approach: `<p><code>linkedSignal</code> creates writable state that resets whenever <code>start</code> changes, avoiding the constructor timing problem. Clamping in the update keeps the state valid; computed flags drive the template.</p>`,
      code: ng(`import { Component, input, linkedSignal, computed, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-counter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <button (click)="dec()" [disabled]="count() === 0" aria-label="Decrease">−</button>
    <output>{{ count() }}</output>
    <button (click)="inc()" [disabled]="atMax()" aria-label="Increase">+</button>
    <button (click)="reset()">Reset</button>
    @if (atMax()) { <p role="status">Limit reached</p> }
  \`,
})
export class Counter {
  start = input(0);
  max = input(10);
  count = linkedSignal(() => this.start());     // writable, re-syncs if start changes
  atMax = computed(() => this.count() >= this.max());

  inc() { this.count.update((c) => Math.min(this.max(), c + 1)); }
  dec() { this.count.update((c) => Math.max(0, c - 1)); }
  reset() { this.count.set(this.start()); }
}`, 'Solution'),
      alt: [jsrun(`function counter(start = 0, max = 10) {
  let c = start;
  return { inc() { c = Math.min(max, c + 1); return c; }, dec() { c = Math.max(0, c - 1); return c; }, reset() { c = start; return c; } };
}
const k = counter(0, 2);
console.log(k.inc(), k.inc(), k.inc(), '(clamped at 2)');
console.log(k.reset(), k.dec(), '(never below 0)');`, 'Plain JS model (runnable)')],
      complexity: `<p>O(1) per click: one clamp and one signal write.</p>`,
      followUps: ['Add a step input. How do you keep the clamp correct?']
    }
  });

  practice.push({
    title: 'Show / Hide Password Toggle', level: 'Easy', tags: ['property binding', '@if', 'accessibility'], companies: ['Paytm', 'Razorpay'],
    statement: `<p>Build a password field with a button that toggles between hidden and visible. The button text is "Show" or "Hide", it has <code>aria-pressed</code> reflecting the state, and the input's <code>type</code> switches between <code>password</code> and <code>text</code>. Show "Caps Lock is on" when the user types with Caps Lock enabled.</p>`,
    constraints: `Use <code>[type]</code> property binding, a boolean signal, <code>(keyup)</code> with <code>$event.getModifierState("CapsLock")</code>.`,
    example: `${H.table(['Action', 'input type', 'button'], [['initial', 'password', 'Show'], ['click', 'text', 'Hide (aria-pressed=true)'], ['click', 'password', 'Show']])}`,
    brute: { why: `<p>Render two different inputs with <code>@if</code> (one text, one password). Each toggle destroys one input and creates the other, so focus and cursor position are lost and the typed value must be copied manually.</p>`, code: tpl(`@if (visible) { <input type="text" [value]="pw" /> }
@else { <input type="password" [value]="pw" /> }`, 'Two inputs swapped') },
    mcq: { q: 'Why bind <code>[type]</code> instead of swapping two inputs with @if?', options: ['It is shorter only', 'The same element is kept, so focus, value and cursor survive', '@if cannot render inputs', '[type] is required by HTML'], answer: 1, explain: '@if destroys and creates elements. A property binding just changes one property on the existing element.' },
    hints: [
      `<p>Hint 1: Only one fact changes: visible or not. Everything else is derived from it.</p>`,
      `<p>Hint 2: <code>[type]="visible() ? 'text' : 'password'"</code> on a single input; the button toggles with <code>visible.update(v =&gt; !v)</code>.</p>`,
      `<p>Hint 3: Caps Lock: <code>(keyup)="caps.set($event.getModifierState('CapsLock'))"</code>, then <code>@if (caps()) { ... }</code>. Add <code>[attr.aria-pressed]="visible()"</code> and <code>type="button"</code> so it does not submit a form.</p>`
    ],
    solution: {
      approach: `<p>One input element whose <code>type</code> property is bound to a signal. The button is a real toggle button with <code>aria-pressed</code>. Caps Lock detection reads the keyboard event's modifier state.</p>`,
      code: ng(`import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-password-field',
  template: \`
    <label for="pw">Password</label>
    <input id="pw" [type]="visible() ? 'text' : 'password'" autocomplete="current-password"
           (keyup)="caps.set($event.getModifierState('CapsLock'))" />
    <button type="button" [attr.aria-pressed]="visible()" (click)="visible.update(v => !v)">
      {{ visible() ? 'Hide' : 'Show' }}
    </button>
    @if (caps()) { <p role="alert">Caps Lock is on</p> }
  \`,
})
export class PasswordField {
  visible = signal(false);
  caps = signal(false);
}`, 'Solution'),
      alt: [jsrun(`let visible = false;
const view = () => 'type=' + (visible ? 'text' : 'password') + ' button=' + (visible ? 'Hide' : 'Show') + ' aria-pressed=' + visible;
console.log(view()); visible = !visible; console.log(view()); visible = !visible; console.log(view());`, 'Plain JS model (runnable)')],
      complexity: `<p>O(1) per event: one signal flip and one property update.</p>`,
      followUps: ['Auto-hide the password again after 10 seconds, with proper cleanup.']
    }
  });

  practice.push({
    title: 'Initials Avatar Pipe', level: 'Easy', tags: ['pipe', 'pure'], companies: ['Zoho', 'Freshworks'],
    statement: `<p>Write a pure pipe <code>initials</code>: "asha rao" → "AR", "Ben" → "B", "  mary  jane  watson " → "MJ" (max 2 by default, configurable as an argument), <code>null</code> → "?". Use it in an avatar: <code>{{ user.name | initials }}</code>.</p>`,
    constraints: `Pure pipe, handles extra spaces, empty strings and null. Uppercase result.`,
    example: `${H.table(['Input', 'Arg', 'Output'], [['"asha rao"', '—', 'AR'], ['"mary jane watson"', '3', 'MJW'], ['""', '—', '?']])}`,
    brute: { why: `<p>Call a component method <code>{{ getInitials(user.name) }}</code> in the template. It works but runs on every change detection for every avatar and the logic is duplicated in every component that needs it.</p>`, code: ng(`export class UserList {
  getInitials(n: string) { return n.split(' ').map(w => w[0]).join(''); } // crashes on double spaces
}`, 'Method in template') },
    mcq: { q: 'With a pure pipe, when does Angular call transform for one avatar?', options: ['Every change detection', 'Only when the name (or the argument) changes', 'Once ever', 'Only on click'], answer: 1, explain: 'Pure pipes are memoised on their inputs and arguments.' },
    hints: [
      `<p>Hint 1: Normalise first: trim and split on runs of whitespace so empty words disappear.</p>`,
      `<p>Hint 2: <code>value.trim().split(/\\s+/).filter(Boolean)</code>, take the first <code>max</code> words, map to the first character.</p>`,
      `<p>Hint 3: If there are no words return "?"; else join and <code>toUpperCase()</code>. Declare with <code>@Pipe({ name: "initials" })</code>, implement <code>PipeTransform</code>, and import it where used.</p>`
    ],
    solution: {
      approach: `<p>A pure, defensive transform. Normalising whitespace avoids <code>undefined</code> characters from empty words.</p>`,
      code: ng(`import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'initials' })
export class InitialsPipe implements PipeTransform {
  transform(name: string | null | undefined, max = 2): string {
    const words = (name ?? '').trim().split(/\\s+/).filter(Boolean);
    if (!words.length) return '?';
    return words.slice(0, max).map((w) => w[0]).join('').toUpperCase();
  }
}`, 'Solution'),
      alt: [jsrun(`function initials(name, max = 2) {
  const words = (name ?? '').trim().split(/\\s+/).filter(Boolean);
  if (!words.length) return '?';
  return words.slice(0, max).map((w) => w[0]).join('').toUpperCase();
}
for (const [n, m] of [['asha rao'], ['Ben'], ['  mary  jane  watson ', 3], [''], [null]]) console.log(JSON.stringify(n), m || 2, '->', initials(n, m));`, 'Plain JS model (runnable)')],
      complexity: `<p>O(length of name) per call, cached by purity.</p>`,
      followUps: ['Handle names in scripts where the first code unit is not a full character (emoji, some Indic scripts) using Intl.Segmenter.']
    }
  });

  practice.push({
    title: 'Greeting Card with Inputs and Defaults', level: 'Easy', tags: ['input', 'interpolation', '@if'], companies: ['Wipro', 'Cognizant'],
    statement: `<p>Create <code>app-greeting</code> with inputs <code>name</code> (default "friend"), <code>excited</code> (boolean attribute) and <code>avatarUrl</code> (optional). Render "Hello, name." or "Hello, name!" when excited, and an <code>&lt;img&gt;</code> only when <code>avatarUrl</code> is provided, with a meaningful <code>alt</code>.</p>`,
    constraints: `Use <code>input()</code> with defaults and <code>booleanAttribute</code>, interpolation, <code>[src]</code>, and <code>@if</code>.`,
    example: `${H.table(['Usage', 'Output'], [['<code>&lt;app-greeting name="Asha" /&gt;</code>', 'Hello, Asha.'], ['<code>&lt;app-greeting excited /&gt;</code>', 'Hello, friend!'], ['<code>&lt;app-greeting [avatarUrl]="u" /&gt;</code>', 'image + Hello, friend.']])}`,
    brute: { why: `<p>Use <code>src="{{ avatarUrl }}"</code> always. When there is no URL the browser requests <code>"undefined"</code> or shows a broken image icon, and <code>excited="false"</code> as a plain string would be truthy without a transform.</p>`, code: tpl(`<img src="{{ avatarUrl }}" />   <!-- broken image when missing -->
<p>Hello, {{ name }}{{ excited ? '!' : '.' }}</p>`, 'Always-rendered image') },
    mcq: { q: 'Without <code>booleanAttribute</code>, what does <code>&lt;app-greeting excited /&gt;</code> pass to an <code>input(false)</code>?', options: ['true', 'the empty string ""', 'false', 'undefined'], answer: 1, explain: 'A bare attribute is the empty string. booleanAttribute converts "" (and "true") to true.' },
    hints: [
      `<p>Hint 1: Three inputs, each with a sensible default; the template only reads them.</p>`,
      `<p>Hint 2: <code>excited = input(false, { transform: booleanAttribute })</code>; <code>avatarUrl = input&lt;string&gt;()</code>.</p>`,
      `<p>Hint 3: <code>@if (avatarUrl(); as url) { &lt;img [src]="url" [alt]="name() + ' avatar'" /&gt; }</code> then <code>&lt;p&gt;Hello, {{ name() }}{{ excited() ? "!" : "." }}&lt;/p&gt;</code>.</p>`
    ],
    solution: {
      approach: `<p>Signal inputs with defaults and a boolean transform; the image is rendered only when a URL exists, using the <code>as</code> alias for a narrowed type.</p>`,
      code: ng(`import { Component, input, booleanAttribute } from '@angular/core';

@Component({
  selector: 'app-greeting',
  template: \`
    @if (avatarUrl(); as url) {
      <img [src]="url" [alt]="name() + ' avatar'" width="40" height="40" />
    }
    <p>Hello, {{ name() }}{{ excited() ? '!' : '.' }}</p>
  \`,
})
export class Greeting {
  name = input('friend');
  excited = input(false, { transform: booleanAttribute });
  avatarUrl = input<string>();
}`, 'Solution'),
      alt: [jsrun(`const booleanAttribute = (v) => typeof v === 'boolean' ? v : v != null && v !== 'false';
function greeting({ name = 'friend', excited = false, avatarUrl } = {}) {
  return (avatarUrl ? '[img ' + avatarUrl + '] ' : '') + 'Hello, ' + name + (booleanAttribute(excited) ? '!' : '.');
}
console.log(greeting({ name: 'Asha' }));
console.log(greeting({ excited: '' }));
console.log(greeting({ avatarUrl: '/a.png' }));`, 'Plain JS model (runnable)')],
      complexity: `<p>O(1) per render: a few signal reads and one conditional image.</p>`,
      followUps: ['Show a fallback initials avatar when the image fails to load ((error) event).']
    }
  });

  /* ======================= PRACTICE: MEDIUM ======================= */
  practice.push({
    title: 'Searchable, Sortable Product List', level: 'Medium', tags: ['computed', '@for', '@empty', 'ngModel'], companies: ['Amazon', 'Flipkart'],
    statement: `<p>Given <code>products = input.required&lt;Product[]&gt;()</code>, render a search box and a sort select ("name" or "price"). Show matching products (case-insensitive name match), sorted, with a count "Showing n of m". Show "No products match <i>query</i>" when empty. Typing must not re-create rows that stay visible.</p>`,
    constraints: `Derived list with <code>computed</code>, no mutation of the input array, <code>track p.id</code>.`,
    example: `${H.table(['query', 'sort', 'result'], [['"m"', 'price', 'Mouse ₹799, Monitor ₹12,999'], ['"zzz"', 'name', 'No products match "zzz"']])}`,
    brute: { why: `<p>Call <code>this.products().sort(...)</code> inside a method used in the template. <code>sort</code> mutates the parent's array in place, the method runs on every check, and the parent sees its data reordered.</p>`, code: ng(`visible() {
  return this.products()
    .sort((a, b) => a.price - b.price)        // MUTATES the input array
    .filter((p) => p.name.includes(this.q));  // case-sensitive, runs every check
}`, 'Mutating sort in a method') },
    mcq: { q: 'Why copy before sorting (<code>[...list].sort()</code> or <code>toSorted()</code>)?', options: ['Sorting a copy is faster', 'Array.sort mutates in place, which would change the parent\'s input data', 'Signals cannot hold sorted arrays', 'TypeScript requires it'], answer: 1, explain: 'Inputs belong to the parent. Mutating them breaks one-way data flow and OnPush assumptions.' },
    hints: [
      `<p>Hint 1: Two pieces of local state (query, sort key) plus one input; the visible list is derived.</p>`,
      `<p>Hint 2: <code>visible = computed(() =&gt; products().filter(match).toSorted(compare))</code>; <code>toSorted</code> returns a new array.</p>`,
      `<p>Hint 3: Template: <code>&lt;input [(ngModel)]="query"&gt;</code>, <code>&lt;select [(ngModel)]="sortBy"&gt;</code>, <code>@for (p of visible(); track p.id) {...} @empty { No products match "{{ query() }}" }</code>, and the count line.</p>`
    ],
    solution: {
      approach: `<p>Signals for query and sort, one <code>computed</code> for the visible list (memoised: recalculated only when inputs change), immutable sort, id tracking.</p>`,
      code: ng(`import { Component, input, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';

interface Product { id: number; name: string; price: number; }

@Component({
  selector: 'app-product-search',
  imports: [FormsModule, CurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <input [(ngModel)]="query" placeholder="Search" aria-label="Search products" />
    <select [(ngModel)]="sortBy" aria-label="Sort by">
      <option value="name">Name</option>
      <option value="price">Price</option>
    </select>
    <p>Showing {{ visible().length }} of {{ products().length }}</p>
    <ul>
      @for (p of visible(); track p.id) {
        <li>{{ p.name }} — {{ p.price | currency:'INR' }}</li>
      } @empty {
        <li>No products match "{{ query() }}"</li>
      }
    </ul>
  \`,
})
export class ProductSearch {
  products = input.required<Product[]>();
  query = signal('');
  sortBy = signal<'name' | 'price'>('name');

  visible = computed(() => {
    const q = this.query().trim().toLowerCase();
    const key = this.sortBy();
    return this.products()
      .filter((p) => p.name.toLowerCase().includes(q))
      .toSorted((a, b) => key === 'price' ? a.price - b.price : a.name.localeCompare(b.name));
  });
}`, 'Solution'),
      alt: [jsrun(`const products = [{ id: 1, name: 'Mouse', price: 799 }, { id: 2, name: 'Monitor', price: 12999 }, { id: 3, name: 'Keyboard', price: 2499 }];
function visible(list, query, key) {
  const q = query.trim().toLowerCase();
  return [...list].filter((p) => p.name.toLowerCase().includes(q))
    .sort((a, b) => key === 'price' ? a.price - b.price : a.name.localeCompare(b.name));
}
console.log(visible(products, 'm', 'price').map((p) => p.name).join(', '));
console.log(visible(products, '', 'name').map((p) => p.name).join(', '));
console.log(visible(products, 'zzz', 'name').length, 'results; original order kept:', products.map((p) => p.id).join(','));`, 'Plain JS model (runnable)')],
      complexity: `<p>O(n log n) per query/sort change; zero work on unrelated change detection thanks to <code>computed</code> memoisation.</p>`,
      followUps: ['Debounce the query for a server-side search (toObservable + debounceTime, or a resource with a debounced signal).', 'Persist query and sort in the URL query params.']
    }
  });

  practice.push({
    title: 'Accordion: Only One Panel Open', level: 'Medium', tags: ['@for', 'signals', 'accessibility', 'ng-content'], companies: ['Atlassian', 'Adobe'],
    statement: `<p>Build <code>app-accordion</code> taking <code>items = input.required&lt;{ id: string; title: string; body: string }[]&gt;()</code>. Clicking a header opens its panel and closes any other; clicking the open header closes it. Optional input <code>multi</code> (boolean attribute) allows several open panels. Headers are buttons with <code>aria-expanded</code> and <code>aria-controls</code>.</p>`,
    constraints: `Store open ids in one signal (<code>Set</code>). Panels not open are not rendered.`,
    example: `${H.table(['Clicks', 'Open (single)', 'Open (multi)'], [['A', 'A', 'A'], ['B', 'B', 'A, B'], ['B', '—', 'A']])}`,
    brute: { why: `<p>Give every item an <code>isOpen</code> boolean and mutate it (<code>item.isOpen = !item.isOpen</code>), looping to close the others. It mutates the parent's input objects and OnPush may not notice the change.</p>`, code: ng(`toggle(item: any) {
  this.items().forEach((i) => (i.isOpen = false));   // mutates input objects
  item.isOpen = !item.isOpen;
}`, 'Mutating input items') },
    mcq: { q: 'Which state shape handles both single and multi mode simply?', options: ['A boolean on each item', 'A signal holding a Set of open ids', 'A separate signal per item', 'The DOM\'s open attribute'], answer: 1, explain: 'One Set of ids is the single source of truth; single mode just keeps at most one id in it.' },
    hints: [
      `<p>Hint 1: What is open is UI state owned by the accordion, not by the data items.</p>`,
      `<p>Hint 2: <code>open = signal(new Set&lt;string&gt;())</code>; <code>isOpen(id)</code> reads <code>open().has(id)</code>.</p>`,
      `<p>Hint 3: toggle(id): copy the set (or start empty in single mode), delete if present else add, then <code>open.set(next)</code>. Template: button with <code>[attr.aria-expanded]</code>, then <code>@if (isOpen(it.id)) { &lt;div role="region" [id]="'panel-' + it.id"&gt; }</code>.</p>`
    ],
    solution: {
      approach: `<p>A Set of ids in a signal, updated immutably (new Set each time so the signal notifies). Single mode starts from an empty Set so at most one id is kept.</p>`,
      code: ng(`import { Component, input, signal, booleanAttribute, ChangeDetectionStrategy } from '@angular/core';

interface Item { id: string; title: string; body: string; }

@Component({
  selector: 'app-accordion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    @for (it of items(); track it.id) {
      <h3>
        <button type="button" [attr.aria-expanded]="isOpen(it.id)" [attr.aria-controls]="'panel-' + it.id"
                (click)="toggle(it.id)">{{ it.title }}</button>
      </h3>
      @if (isOpen(it.id)) {
        <div role="region" [id]="'panel-' + it.id">{{ it.body }}</div>
      }
    }
  \`,
})
export class Accordion {
  items = input.required<Item[]>();
  multi = input(false, { transform: booleanAttribute });
  open = signal(new Set<string>());

  isOpen(id: string) { return this.open().has(id); }

  toggle(id: string) {
    const wasOpen = this.open().has(id);
    const next = this.multi() ? new Set(this.open()) : new Set<string>();
    if (wasOpen) next.delete(id); else next.add(id);
    this.open.set(next);
  }
}`, 'Solution'),
      alt: [jsrun(`function accordion(multi) {
  let open = new Set();
  return (id) => { const was = open.has(id); const next = multi ? new Set(open) : new Set(); if (was) next.delete(id); else next.add(id); open = next; return [...open].join(',') || '—'; };
}
const single = accordion(false), multi = accordion(true);
for (const c of ['A', 'B', 'B']) console.log('click', c, '| single:', single(c), '| multi:', multi(c));`, 'Plain JS model (runnable)')],
      complexity: `<p>O(n) to render n headers; toggling is O(k) to copy the set of open ids.</p>`,
      followUps: ['Turn it into a compound component (app-accordion + app-accordion-item) using ng-content and an injected parent.', 'Add arrow-key navigation between headers.']
    }
  });

  practice.push({
    title: 'Tabs Component with a selected Output', level: 'Medium', tags: ['input', 'output', 'model', '@switch'], companies: ['Microsoft', 'Salesforce'],
    statement: `<p>Create <code>app-tabs</code> with <code>tabs = input.required&lt;string[]&gt;()</code> and a two-way <code>selected</code> index (<code>[(selected)]</code>, default 0). Render a tab list with <code>role="tablist"</code>, buttons with <code>role="tab"</code> and <code>aria-selected</code>. ArrowRight/ArrowLeft move the selection (wrapping). The parent shows different content with <code>@switch</code> on the selected index.</p>`,
    constraints: `Use <code>model()</code> for selected, <code>(keydown.arrowright)</code>/<code>(keydown.arrowleft)</code>, <code>track</code> by tab label.`,
    example: `${H.table(['tabs', 'selected', 'key', 'new selected'], [['[Info, Reviews, Q&amp;A]', '0', 'ArrowLeft', '2 (wraps)'], ['same', '2', 'ArrowRight', '0']])}`,
    brute: { why: `<p>Each tab button holds its own <code>active</code> flag and the parent searches the DOM with <code>querySelector(".active")</code> to know which is selected. State is scattered and the parent depends on child DOM details.</p>`, code: ng(`// parent
ngAfterViewInit() {
  const active = document.querySelector('.tab.active');   // reaching into child DOM
  this.current = active?.textContent;
}`, 'Reading child DOM') },
    mcq: { q: 'Which syntax should the parent use so it both sets and receives the selected index?', options: ['<code>[selected]="i"</code>', '<code>(selected)="i = $event"</code>', '<code>[(selected)]="i"</code>', '<code>#selected</code>'], answer: 2, explain: 'Two-way binding to a model() input both passes the value down and receives selectedChange.' },
    hints: [
      `<p>Hint 1: The selected index belongs to the parent (it decides what content to show), but the tabs must be able to change it.</p>`,
      `<p>Hint 2: <code>selected = model(0)</code>; clicking tab i calls <code>selected.set(i)</code>.</p>`,
      `<p>Hint 3: Arrow keys: <code>move(d)</code> sets <code>(selected() + d + n) % n</code>. Template: <code>@for (t of tabs(); track t; let i = $index)</code> button with <code>[attr.aria-selected]="i === selected()"</code> and <code>[tabindex]="i === selected() ? 0 : -1"</code>.</p>`
    ],
    solution: {
      approach: `<p>The parent owns the index; <code>model()</code> lets the tabs update it. Wrapping uses modular arithmetic. Roving <code>tabindex</code> keeps only the selected tab in the Tab order, matching the WAI-ARIA tabs pattern.</p>`,
      code: ng(`import { Component, input, model, signal } from '@angular/core';

@Component({
  selector: 'app-tabs',
  template: \`
    <div role="tablist" (keydown.arrowright)="move(1)" (keydown.arrowleft)="move(-1)">
      @for (t of tabs(); track t; let i = $index) {
        <button type="button" role="tab"
                [attr.aria-selected]="i === selected()"
                [tabindex]="i === selected() ? 0 : -1"
                [class.active]="i === selected()"
                (click)="selected.set(i)">{{ t }}</button>
      }
    </div>
  \`,
})
export class Tabs {
  tabs = input.required<string[]>();
  selected = model(0);

  move(delta: number) {
    const n = this.tabs().length;
    if (!n) return;
    this.selected.set((this.selected() + delta + n) % n);
  }
}

@Component({
  selector: 'app-product-page',
  imports: [Tabs],
  template: \`
    <app-tabs [tabs]="['Info', 'Reviews', 'Q&A']" [(selected)]="tab" />
    @switch (tab()) {
      @case (0) { <p>Product details…</p> }
      @case (1) { <p>Reviews…</p> }
      @default  { <p>Questions…</p> }
    }
  \`,
})
export class ProductPage { tab = signal(0); }`, 'Solution'),
      alt: [jsrun(`function tabs(n) { let sel = 0; return { move(d) { sel = (sel + d + n) % n; return sel; }, click(i) { sel = i; return sel; } }; }
const t = tabs(3);
console.log('left ->', t.move(-1));
console.log('right ->', t.move(1));
console.log('click 1 ->', t.click(1), '| right ->', t.move(1));`, 'Plain JS model (runnable)')],
      complexity: `<p>O(n) render for n tabs, O(1) per key press.</p>`,
      followUps: ['Move focus to the newly selected tab after arrow keys (viewChildren + focus).', 'Lazy render panels with @defer (on interaction).']
    }
  });

  practice.push({
    title: 'Debounced Search Input That Cleans Up', level: 'Medium', tags: ['lifecycle', 'output', 'DestroyRef'], companies: ['Uber', 'Ola'],
    statement: `<p>Build <code>app-debounced-search</code> with input <code>delay</code> (ms, default 300) and output <code>search</code>. It emits the trimmed text only after the user has stopped typing for <code>delay</code> ms, never emits the same text twice in a row, emits immediately on Enter, and never emits after being destroyed.</p>`,
    constraints: `No RxJS required (bonus: show the RxJS version). Clear pending timers on destroy.`,
    example: `${H.table(['Typing (time ms)', 'Emits'], [['"a" (0), "an" (100), "ang" (200)', '"ang" at 500'], ['"ang" again', 'nothing (duplicate)'], ['"x" then Enter', '"x" immediately']])}`,
    brute: { why: `<p>Emit on every <code>(input)</code> event. A user typing "angular" fires 7 API calls, responses can arrive out of order, and the server is hammered.</p>`, code: tpl(`<input (input)="search.emit($any($event.target).value)" />   <!-- one emit per keystroke -->`, 'Emit every keystroke') },
    mcq: { q: 'The component is destroyed 100 ms after the last keystroke (delay 300). What must happen?', options: ['Emit anyway at 300 ms', 'Clear the pending timer so nothing emits', 'Emit immediately on destroy', 'Nothing special'], answer: 1, explain: 'A late emit from a destroyed component causes bugs (navigating away still triggers a search). Clear the timer in DestroyRef/ngOnDestroy.' },
    hints: [
      `<p>Hint 1: Debounce = restart a timer on every keystroke; only the last timer gets to fire.</p>`,
      `<p>Hint 2: Keep <code>timer</code> and <code>lastEmitted</code> fields. <code>onType(v)</code>: clearTimeout, then setTimeout(() =&gt; emitIfNew(v), delay()).</p>`,
      `<p>Hint 3: <code>emitIfNew(v)</code>: trim, compare with lastEmitted, emit and remember. Enter: clear timer and emitIfNew now. Constructor: <code>inject(DestroyRef).onDestroy(() =&gt; clearTimeout(timer))</code>.</p>`
    ],
    solution: {
      approach: `<p>Manual debounce with a single timer reference; deduplication through <code>lastEmitted</code>; cleanup through <code>DestroyRef</code>. The RxJS alternative is <code>debounceTime</code> + <code>distinctUntilChanged</code> + <code>takeUntilDestroyed</code>.</p>`,
      code: ng(`import { Component, input, output, inject, DestroyRef } from '@angular/core';

@Component({
  selector: 'app-debounced-search',
  template: \`
    <input #q type="search" aria-label="Search"
           (input)="onType(q.value)" (keydown.enter)="now(q.value)" />
  \`,
})
export class DebouncedSearch {
  delay = input(300);
  search = output<string>();
  private timer?: ReturnType<typeof setTimeout>;
  private lastEmitted: string | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  onType(value: string) {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.emitIfNew(value), this.delay());
  }

  now(value: string) {
    clearTimeout(this.timer);
    this.emitIfNew(value);
  }

  private emitIfNew(value: string) {
    const v = value.trim();
    if (v === this.lastEmitted) return;
    this.lastEmitted = v;
    this.search.emit(v);
  }
}

/* RxJS version (inside the class):
   private text = new Subject<string>();
   constructor() {
     this.text.pipe(map(v => v.trim()), debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
       .subscribe(v => this.search.emit(v));
   } */`, 'Solution'),
      alt: [jsrun(`// Simulated clock so the run is instant and deterministic.
let nowMs = 0; const timers = [];
const setT = (fn, ms) => { const t = { at: nowMs + ms, fn, live: true }; timers.push(t); return t; };
const clearT = (t) => { if (t) t.live = false; };
const advance = (ms) => { nowMs += ms; timers.filter((t) => t.live && t.at <= nowMs).forEach((t) => { t.live = false; t.fn(); }); };
const out = []; let timer = null, last = null;
const emitIfNew = (v) => { v = v.trim(); if (v === last) return; last = v; out.push(v + '@' + nowMs); };
const onType = (v) => { clearT(timer); timer = setT(() => emitIfNew(v), 300); };
onType('a'); advance(100); onType('an'); advance(100); onType('ang'); advance(300);
onType('ang'); advance(300);
onType('x'); clearT(timer); emitIfNew('x');
onType('late'); advance(100); clearT(timer); advance(500);   // destroyed before firing
console.log(out.join(' | '));`, 'Plain JS model with a fake clock (runnable)')],
      complexity: `<p>O(1) per keystroke; at most one live timer.</p>`,
      followUps: ['Cancel the previous HTTP request when a new search starts (switchMap).', 'Show a spinner only if the request takes longer than 200 ms.']
    }
  });

  practice.push({
    title: 'appSingleClick: Stop Double Submits', level: 'Medium', tags: ['directive', 'host binding', 'async'], companies: ['Razorpay', 'Stripe'],
    statement: `<p>Users double-click "Pay" and get charged twice. Write an attribute directive <code>[appSingleClick]</code> that takes a function returning a Promise: <code>&lt;button [appSingleClick]="pay"&gt;Pay&lt;/button&gt;</code>. On click it disables the host button, sets <code>aria-busy="true"</code>, calls the function, and re-enables when the promise settles (success or failure). Extra clicks while pending are ignored.</p>`,
    constraints: `Host bindings only, no direct DOM writes. Must re-enable on rejection. No emits after destroy.`,
    example: `${H.table(['Event', 'disabled', 'calls'], [['click', 'true', '1'], ['click (pending)', 'true', '1'], ['promise resolves', 'false', '1'], ['click', 'true', '2']])}`,
    brute: { why: `<p>Add a <code>paying</code> flag and <code>[disabled]</code> in every component with a submit button, and forget the <code>finally</code>: a rejected payment leaves the button disabled forever.</p>`, code: ng(`async pay() {
  this.paying = true;
  await this.api.pay();      // if this throws, paying stays true forever
  this.paying = false;
}`, 'Flag without finally') },
    mcq: { q: 'Why use <code>finally</code> (or <code>.finally()</code>) to reset the pending flag?', options: ['It runs faster', 'It runs on both success and failure, so the button always re-enables', 'It cancels the request', 'Angular requires it'], answer: 1, explain: 'Without finally, an error path would leave the UI stuck in the pending state.' },
    hints: [
      `<p>Hint 1: The behaviour is the same for every async button, so it belongs in a reusable directive.</p>`,
      `<p>Hint 2: <code>pending = signal(false)</code>; host: <code>"(click)": "run()"</code>, <code>"[disabled]": "pending()"</code>, <code>"[attr.aria-busy]": "pending() || null"</code>.</p>`,
      `<p>Hint 3: <code>async run()</code>: if pending return; set true; <code>try { await this.appSingleClick()() } finally { if (!destroyed) pending.set(false) }</code>. Track destroyed via DestroyRef.</p>`
    ],
    solution: {
      approach: `<p>The directive owns a pending signal bound to the host's <code>disabled</code> and <code>aria-busy</code>. <code>finally</code> guarantees reset; a destroyed flag avoids touching state after teardown.</p>`,
      code: ng(`import { Directive, input, signal, inject, DestroyRef } from '@angular/core';

@Directive({
  selector: 'button[appSingleClick]',
  host: {
    '(click)': 'run()',
    '[disabled]': 'pending()',
    '[attr.aria-busy]': 'pending() || null',
  },
})
export class SingleClick {
  appSingleClick = input.required<() => Promise<unknown>>();
  pending = signal(false);
  private destroyed = false;

  constructor() { inject(DestroyRef).onDestroy(() => (this.destroyed = true)); }

  async run() {
    if (this.pending()) return;          // ignore extra clicks
    this.pending.set(true);
    try {
      await this.appSingleClick()();
    } catch (e) {
      console.error('action failed', e); // let the caller show its own error UI too
    } finally {
      if (!this.destroyed) this.pending.set(false);
    }
  }
}
// usage: <button [appSingleClick]="pay">Pay</button>   with  pay = () => this.api.pay(this.cart())`, 'Solution'),
      alt: [jsrun(`function singleClick(action) {
  let pending = false, calls = 0;
  return {
    async click() { if (pending) return 'ignored'; pending = true; calls++; try { await action(); return 'ok'; } catch { return 'failed'; } finally { pending = false; } },
    get state() { return { pending, calls }; },
  };
}
(async () => {
  let fail = false;
  const btn = singleClick(() => new Promise((res, rej) => setTimeout(() => (fail ? rej(new Error('x')) : res()), 10)));
  const a = btn.click(); const b = btn.click();
  console.log(await a, await b, btn.state);
  fail = true;
  console.log(await btn.click(), btn.state, '(re-enabled after failure)');
})();`, 'Plain JS model (runnable)')],
      complexity: `<p>O(1) per click; at most one action in flight at a time.</p>`,
      followUps: ['Show a spinner inside the button via content projection or a CSS class.', 'Should the server also be idempotent? (Yes: idempotency keys.)']
    }
  });

  /* ======================= PRACTICE: HARD ======================= */
  practice.push({
    title: 'Structural Directive *appIfFeature with an else Template', level: 'Hard', tags: ['structural directive', 'TemplateRef', 'ViewContainerRef', 'signals'], companies: ['Google', 'Microsoft'],
    statement: `<p>Feature flags come from <code>FeatureFlags</code>, a service with <code>flags = signal&lt;Record&lt;string, boolean&gt;&gt;({})</code> that can change at runtime. Write <code>*appIfFeature="'newCheckout'; else oldCheckout"</code> that renders the host template when the flag is on, otherwise the optional <code>else</code> template, and switches live when flags change, without re-creating a view that is already correct.</p>`,
    constraints: `Use <code>TemplateRef</code>, <code>ViewContainerRef</code>, signal inputs named for the microsyntax (<code>appIfFeature</code>, <code>appIfFeatureElse</code>), and an <code>effect</code>.`,
    example: `${H.table(['flag', 'else given', 'rendered'], [['true', 'yes', 'main template'], ['false', 'yes', 'else template'], ['false', 'no', 'nothing'], ['true → true', 'yes', 'main (no re-create)']])}`,
    brute: { why: `<p>Use <code>[hidden]</code> on both blocks. Both the new and old checkout components are created, both run their <code>ngOnInit</code> (and API calls), and the hidden one still costs memory. A structural directive creates only one.</p>`, code: tpl(`<app-new-checkout [hidden]="!flags.flags()['newCheckout']" />
<app-old-checkout [hidden]="flags.flags()['newCheckout']" />   <!-- both are alive -->`, 'Hide both, create both') },
    mcq: { q: 'In <code>*appIfFeature="\'x\'; else other"</code>, which input receives <code>other</code>?', options: ['<code>else</code>', '<code>appIfFeatureElse</code>', '<code>elseTemplate</code>', '<code>appIfFeature</code>'], answer: 1, explain: 'Microsyntax keys are prefixed with the directive selector and capitalised: else → appIfFeatureElse.' },
    hints: [
      `<p>Hint 1: Track which template is currently rendered ("main", "else" or none) and only touch the container when the desired one differs.</p>`,
      `<p>Hint 2: Inject <code>TemplateRef</code>, <code>ViewContainerRef</code>, the service. Inputs: <code>appIfFeature = input.required&lt;string&gt;()</code>, <code>appIfFeatureElse = input&lt;TemplateRef&lt;unknown&gt;&gt;()</code>.</p>`,
      `<p>Hint 3: <code>effect(() =&gt; { const on = !!flags()[name()]; const want = on ? "main" : (elseTpl() ? "else" : null); if (want === current) return; vcr.clear(); if (want) vcr.createEmbeddedView(want === "main" ? tpl : elseTpl()!); current = want; })</code>.</p>`
    ],
    solution: {
      approach: `<p>An effect reads the flag signal and inputs, computes which template should be visible, and changes the container only on a transition, so components inside keep their state while the flag stays the same. Signals make it live-updating with no subscriptions to clean up.</p>`,
      code: ng(`import { Directive, Injectable, TemplateRef, ViewContainerRef, inject, input, effect, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class FeatureFlags {
  flags = signal<Record<string, boolean>>({});
  set(name: string, on: boolean) { this.flags.update((f) => ({ ...f, [name]: on })); }
}

@Directive({ selector: '[appIfFeature]' })
export class IfFeature {
  private tpl = inject(TemplateRef<unknown>);
  private vcr = inject(ViewContainerRef);
  private flags = inject(FeatureFlags);

  appIfFeature = input.required<string>();                  // the flag name
  appIfFeatureElse = input<TemplateRef<unknown> | undefined>(); // "; else tpl"
  private current: 'main' | 'else' | null = null;

  constructor() {
    effect(() => {
      const on = !!this.flags.flags()[this.appIfFeature()];
      const elseTpl = this.appIfFeatureElse();
      const want = on ? 'main' : elseTpl ? 'else' : null;
      if (want === this.current) return;                     // already correct: keep view state
      this.vcr.clear();
      if (want === 'main') this.vcr.createEmbeddedView(this.tpl);
      if (want === 'else' && elseTpl) this.vcr.createEmbeddedView(elseTpl);
      this.current = want;
    });
  }
}

/* usage
<app-new-checkout *appIfFeature="'newCheckout'; else oldCheckout" />
<ng-template #oldCheckout><app-old-checkout /></ng-template> */`, 'Solution'),
      alt: [jsrun(`function ifFeature(mainTpl, elseTpl) {
  let current = null, creations = 0, rendered = '';
  return (on) => {
    const want = on ? 'main' : elseTpl ? 'else' : null;
    if (want !== current) { rendered = want === 'main' ? mainTpl : want === 'else' ? elseTpl : ''; if (want) creations++; current = want; }
    return (rendered || '(nothing)') + ' | views created so far: ' + creations;
  };
}
const d = ifFeature('<new-checkout>', '<old-checkout>');
for (const on of [false, true, true, false]) console.log('flag', on, '->', d(on));
const noElse = ifFeature('<new-checkout>', null);
console.log('no else, flag false ->', noElse(false));`, 'Plain JS model (runnable)')],
      complexity: `<p>O(1) per flag change; views are created only on transitions.</p>`,
      followUps: ['Add a static ngTemplateContextGuard so strict templates type the context.', 'Would @if with a computed signal be simpler here? When is the directive still worth it?']
    }
  });

  practice.push({
    title: 'Task App with Parent/Child Components', level: 'Hard', tags: ['input', 'output', 'model', '@for', 'architecture'], companies: ['Amazon', 'Swiggy'],
    statement: `<p>Build a task app from three standalone components: <code>TaskApp</code> (owns state), <code>TaskInput</code> (emits <code>add</code> with trimmed text; ignores empty), and <code>TaskItem</code> (input <code>task</code>, outputs <code>toggle</code> and <code>remove</code>, inline edit on double click that emits <code>rename</code>). Add filters All/Active/Done with counts, a "Clear done" button, and "Nothing to do" when the filtered list is empty. Toggling one item must not re-create other rows.</p>`,
    constraints: `State only in TaskApp as a signal of immutable objects. Children never mutate inputs. <code>track task.id</code>. OnPush everywhere.`,
    example: `${H.table(['Action', 'Tasks', 'Filter result'], [['add "Buy milk", add "Code"', '2 active', 'All: 2'], ['toggle "Buy milk"', '1 active, 1 done', 'Done: 1'], ['Clear done', '1 active', 'All: 1']])}`,
    brute: { why: `<p>One giant component with all markup, and children that receive the task object and flip <code>task.done = !task.done</code> directly. It mutates parent state behind its back: OnPush views and computed counts do not update, and the logic cannot be reused or tested in isolation.</p>`, code: ng(`// inside TaskItem
toggle() { this.task.done = !this.task.done; }   // mutating an @Input object`, 'Child mutates input') },
    mcq: { q: 'A child wants to mark its task done. What is the correct flow?', options: ['Mutate task().done in the child', 'Emit toggle(id); the parent creates a new array with a new object for that task', 'Inject the parent and edit its array', 'Use a global variable'], answer: 1, explain: 'Data down, events up. The owner updates state immutably, which signals and OnPush rely on.' },
    hints: [
      `<p>Hint 1: Draw the tree first: who owns the list (TaskApp), who only displays (TaskItem), who only produces new text (TaskInput).</p>`,
      `<p>Hint 2: <code>tasks = signal&lt;Task[]&gt;([])</code>, <code>filter = signal&lt;"all" | "active" | "done"&gt;("all")</code>, <code>visible</code> and <code>counts</code> as <code>computed</code>. Updates use <code>map</code>/<code>filter</code> to create new arrays and objects.</p>`,
      `<p>Hint 3: Item: <code>editing = signal(false)</code>; dblclick → editing true; Enter → <code>rename.emit(text)</code> and editing false; Escape → cancel. App template: <code>@for (t of visible(); track t.id) { &lt;app-task-item [task]="t" (toggle)="toggle(t.id)" (remove)="remove(t.id)" (rename)="rename(t.id, $event)" /&gt; } @empty { Nothing to do }</code>.</p>`
    ],
    solution: {
      approach: `<p>Single owner, immutable updates, derived views. Because toggling creates a new object only for one task, the other <code>TaskItem</code>s receive the same object reference and (with OnPush) are not re-checked; <code>track t.id</code> keeps all rows' DOM.</p>`,
      code: ng(`import { Component, signal, computed, input, output, ChangeDetectionStrategy } from '@angular/core';

export interface Task { id: number; text: string; done: boolean; }
type Filter = 'all' | 'active' | 'done';

@Component({
  selector: 'app-task-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <form (submit)="submit(box); $event.preventDefault()">
      <input #box aria-label="New task" placeholder="What needs doing?" />
      <button>Add</button>
    </form>
  \`,
})
export class TaskInput {
  add = output<string>();
  submit(box: HTMLInputElement) {
    const text = box.value.trim();
    if (!text) return;
    this.add.emit(text);
    box.value = '';
  }
}

@Component({
  selector: 'app-task-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <input type="checkbox" [checked]="task().done" (change)="toggle.emit()" [attr.aria-label]="'Done: ' + task().text" />
    @if (editing()) {
      <input #ed [value]="task().text" (keydown.enter)="save(ed.value)" (keydown.escape)="editing.set(false)" (blur)="save(ed.value)" />
    } @else {
      <span [class.done]="task().done" (dblclick)="editing.set(true)">{{ task().text }}</span>
    }
    <button (click)="remove.emit()" aria-label="Delete">✕</button>
  \`,
  styles: '.done { text-decoration: line-through; opacity: .6; } :host { display: flex; gap: 8px; }',
})
export class TaskItem {
  task = input.required<Task>();
  toggle = output<void>();
  remove = output<void>();
  rename = output<string>();
  editing = signal(false);

  save(text: string) {
    if (!this.editing()) return;          // blur after Enter: already saved
    this.editing.set(false);
    const t = text.trim();
    if (t && t !== this.task().text) this.rename.emit(t);
  }
}

@Component({
  selector: 'app-task-app',
  imports: [TaskInput, TaskItem],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <app-task-input (add)="add($event)" />
    <nav>
      @for (f of filters; track f) {
        <button [attr.aria-pressed]="filter() === f" (click)="filter.set(f)">{{ f }} ({{ counts()[f] }})</button>
      }
      <button (click)="clearDone()" [disabled]="!counts().done">Clear done</button>
    </nav>
    <ul>
      @for (t of visible(); track t.id) {
        <li><app-task-item [task]="t" (toggle)="toggle(t.id)" (remove)="remove(t.id)" (rename)="rename(t.id, $event)" /></li>
      } @empty {
        <li>Nothing to do</li>
      }
    </ul>
  \`,
})
export class TaskApp {
  readonly filters: Filter[] = ['all', 'active', 'done'];
  tasks = signal<Task[]>([]);
  filter = signal<Filter>('all');
  private nextId = 1;

  visible = computed(() => {
    const f = this.filter();
    return this.tasks().filter((t) => f === 'all' || (f === 'done' ? t.done : !t.done));
  });
  counts = computed(() => {
    const done = this.tasks().filter((t) => t.done).length;
    return { all: this.tasks().length, active: this.tasks().length - done, done };
  });

  add(text: string) { this.tasks.update((l) => [...l, { id: this.nextId++, text, done: false }]); }
  toggle(id: number) { this.tasks.update((l) => l.map((t) => (t.id === id ? { ...t, done: !t.done } : t))); }
  rename(id: number, text: string) { this.tasks.update((l) => l.map((t) => (t.id === id ? { ...t, text } : t))); }
  remove(id: number) { this.tasks.update((l) => l.filter((t) => t.id !== id)); }
  clearDone() { this.tasks.update((l) => l.filter((t) => !t.done)); }
}`, 'Solution'),
      alt: [jsrun(`let tasks = [], nextId = 1;
const add = (text) => { text = text.trim(); if (text) tasks = [...tasks, { id: nextId++, text, done: false }]; };
const toggle = (id) => { tasks = tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)); };
const clearDone = () => { tasks = tasks.filter((t) => !t.done); };
const view = (f) => tasks.filter((t) => f === 'all' || (f === 'done' ? t.done : !t.done)).map((t) => t.text).join(', ') || 'Nothing to do';
add('Buy milk'); add('Code'); add('   ');
const before = tasks;
toggle(1);
console.log('all:', view('all'), '| done:', view('done'), '| active:', view('active'));
console.log('row 2 kept same object (no re-render under OnPush):', before[1] === tasks[1]);
clearDone();
console.log('after clear:', view('all'), '| done:', view('done'));`, 'Plain JS model (runnable)')],
      complexity: `<p>Each update is O(n) to build a new array; only the changed row's component is re-checked thanks to reference equality + OnPush + id tracking.</p>`,
      followUps: ['Move state into a TaskStore service so a header badge can show the active count.', 'Persist to localStorage with an effect, safely for SSR.']
    }
  });

  practice.push({
    title: 'Lazy-Load Images Directive with IntersectionObserver', level: 'Hard', tags: ['directive', 'lifecycle', 'SSR', 'performance'], companies: ['Netflix', 'Pinterest'],
    statement: `<p>Write <code>img[appLazySrc]</code>: <code>&lt;img [appLazySrc]="url" alt="..." /&gt;</code>. It sets a lightweight placeholder <code>src</code> first and swaps to the real URL only when the image comes within 200px of the viewport. If the URL input changes later, load the new one the same way. It must disconnect its observer on destroy, do nothing on the server (SSR), and fall back to loading immediately if <code>IntersectionObserver</code> is missing.</p>`,
    constraints: `Use <code>afterNextRender</code> (browser only), <code>DestroyRef</code>, host binding for <code>src</code>. One observer per directive instance.`,
    example: `${H.table(['Event', 'src'], [['created (off screen)', 'placeholder'], ['scrolled near', 'real url'], ['url input changes (off screen)', 'placeholder again, then new url when visible']])}`,
    brute: { why: `<p>Listen to the window <code>scroll</code> event in every image and call <code>getBoundingClientRect()</code> on each scroll. Hundreds of images run layout calculations at 60 events per second (jank), and listeners are never removed. The native <code>loading="lazy"</code> attribute is often enough in practice, but interviewers ask for this directive to test lifecycle and cleanup skills.</p>`, code: ng(`@HostListener('window:scroll')
onScroll() {
  const r = this.el.nativeElement.getBoundingClientRect();   // forced layout per image per scroll
  if (r.top < innerHeight) this.el.nativeElement.src = this.url;
}`, 'Scroll listener per image') },
    mcq: { q: 'Why create the observer inside <code>afterNextRender</code> rather than the constructor?', options: ['It is faster', 'It only runs in the browser after rendering, so SSR never touches IntersectionObserver or the DOM', 'Constructors cannot call functions', 'It runs on every change detection'], answer: 1, explain: 'On the server there is no IntersectionObserver or layout. afterNextRender callbacks are skipped during SSR.' },
    hints: [
      `<p>Hint 1: Separate "which URL do we want" (input signal) from "are we visible yet" (a signal set by the observer). The shown src is derived from both.</p>`,
      `<p>Hint 2: <code>visible = signal(false)</code>; host <code>"[src]": "visible() ? appLazySrc() : placeholder"</code>. In <code>afterNextRender</code>, create the observer with <code>rootMargin: "200px"</code> and observe the host element.</p>`,
      `<p>Hint 3: When the URL changes, reset <code>visible</code> to false and re-observe (an effect on <code>appLazySrc()</code>). On intersect: <code>visible.set(true)</code>, unobserve. Cleanup: <code>DestroyRef.onDestroy(() =&gt; observer?.disconnect())</code>. If <code>!("IntersectionObserver" in window)</code>, set visible true immediately.</p>`
    ],
    solution: {
      approach: `<p>The <code>src</code> is a pure function of two signals, bound through <code>host</code>. The observer exists only in the browser, is created once, re-observes when the URL changes, and is disconnected on destroy. On the server the placeholder is rendered, which is also good for hydration.</p>`,
      code: ng(`import { Directive, ElementRef, inject, input, signal, effect, untracked, afterNextRender, DestroyRef } from '@angular/core';

const PLACEHOLDER = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

@Directive({
  selector: 'img[appLazySrc]',
  host: { '[src]': 'visible() ? appLazySrc() : placeholder' },
})
export class LazySrc {
  appLazySrc = input.required<string>();
  visible = signal(false);
  readonly placeholder = PLACEHOLDER;
  private el = inject(ElementRef<HTMLImageElement>);
  private observer?: IntersectionObserver;

  constructor() {
    afterNextRender(() => {
      if (!('IntersectionObserver' in window)) { this.visible.set(true); return; }
      this.observer = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          this.visible.set(true);
          this.observer!.unobserve(this.el.nativeElement);
        }
      }, { rootMargin: '200px' });
      this.observer.observe(this.el.nativeElement);
    });

    // When the URL changes after the first load, go back to the placeholder and watch again.
    effect(() => {
      this.appLazySrc();                                 // track the input
      untracked(() => {
        if (!this.observer) return;                      // first run or server: nothing to reset
        this.visible.set(false);
        this.observer.observe(this.el.nativeElement);
      });
    });

    inject(DestroyRef).onDestroy(() => this.observer?.disconnect());
  }
}`, 'Solution'),
      alt: [jsrun(`// Fake IntersectionObserver to show the state transitions.
class FakeIO { constructor(cb) { this.cb = cb; this.targets = new Set(); FakeIO.all.push(this); }
  observe(t) { this.targets.add(t); } unobserve(t) { this.targets.delete(t); } disconnect() { this.targets.clear(); this.dead = true; }
  fire(t) { if (this.targets.has(t)) this.cb([{ isIntersecting: true, target: t }]); } }
FakeIO.all = [];
function lazyImg(url) {
  const img = { url, visible: false, get src() { return this.visible ? this.url : 'placeholder'; } };
  const io = new FakeIO(() => { img.visible = true; io.unobserve(img); });
  io.observe(img);
  return { img, io, setUrl(u) { img.url = u; img.visible = false; io.observe(img); }, destroy() { io.disconnect(); } };
}
const d = lazyImg('/cat.jpg');
console.log('created  :', d.img.src);
d.io.fire(d.img); console.log('scrolled :', d.img.src);
d.setUrl('/dog.jpg'); console.log('url swap :', d.img.src);
d.io.fire(d.img); console.log('visible  :', d.img.src);
d.destroy(); console.log('destroyed, observer dead:', d.io.dead);`, 'Plain JS model (runnable)')],
      complexity: `<p>O(1) work per image per intersection change; no per-scroll layout reads. One observer per image (a shared observer service would scale better for thousands).</p>`,
      followUps: ['Share one IntersectionObserver across all instances via a service.', 'Compare with the native loading="lazy" attribute and Angular\'s NgOptimizedImage directive.']
    }
  });

  /* ======================= QUIZ ======================= */
  quiz.push({ q: 'In a standalone app, where is the router registered?', options: ['In <code>angular.json</code>', 'In <code>providers</code> of the config passed to <code>bootstrapApplication</code>, via <code>provideRouter(routes)</code>', 'In every component\'s <code>imports</code>', 'In <code>index.html</code>'], answer: 1, explain: 'App-wide services and setup are providers on the application config. Components only import RouterOutlet/RouterLink if their templates use them.' });
  quiz.push({ q: 'You use <code>&lt;app-badge /&gt;</code> in a standalone component and get NG8001 "is not a known element". What is missing?', options: ['<code>CommonModule</code>', '<code>Badge</code> in the component\'s <code>imports</code>', 'A <code>declarations</code> array', 'A provider for Badge'], answer: 1, explain: 'A standalone template can only use what its component imports.' });
  quiz.push({ q: 'What does <code>[(ngModel)]="name"</code> expand to?', options: ['<code>[ngModel]="name" (ngModelChange)="name = $event"</code>', '<code>(ngModel)="name"</code>', '<code>{{ name }}</code>', '<code>[name]="ngModel"</code>'], answer: 0, explain: 'Two-way binding is a property binding plus an event binding with the Change suffix.' });
  quiz.push({ q: 'Which binding sets an ARIA attribute that has no DOM property?', options: ['<code>[aria-label]="x"</code>', '<code>[attr.aria-label]="x"</code>', '<code>(aria-label)="x"</code>', '<code>aria-label="{{ x }}"</code> is the only way'], answer: 1, explain: 'Use attribute binding (attr. prefix) for attributes without a matching property.' });
  quiz.push({ q: 'What is required in every <code>@for</code> block?', options: ['An <code>@empty</code> block', 'A <code>track</code> expression', 'An <code>index</code> variable', 'Importing NgFor'], answer: 1, explain: 'track gives rows an identity so Angular can reuse DOM. @empty is optional and no import is needed.' });
  quiz.push({ q: 'Data is re-fetched every minute (new objects, same ids). Which @for track keeps DOM rows?', options: ['<code>track item</code>', '<code>track $index</code>', '<code>track item.id</code>', 'No track'], answer: 2, explain: 'Object identity changes on every fetch; index breaks on reorder; a stable id survives both.' });
  quiz.push({ q: 'A component has <code>userId = input.required&lt;number&gt;()</code>. What happens if you read <code>this.userId()</code> in the constructor?', options: ['It returns the bound value', 'It throws because the required input has no value yet', 'It returns 0', 'It returns a Promise'], answer: 1, explain: 'Inputs are set after construction. Reading a required signal input too early throws (NG0950). Use ngOnInit, computed or effect.' });
  quiz.push({ q: 'Which lifecycle hook is the right place to clear a <code>setInterval</code> started by the component?', options: ['<code>ngOnInit</code>', '<code>ngAfterViewInit</code>', '<code>ngOnDestroy</code> (or a <code>DestroyRef.onDestroy</code> callback)', '<code>ngDoCheck</code>'], answer: 2, explain: 'Angular does not know about your timers. Stop them when the component is destroyed.' });
  quiz.push({ q: 'In what order do these run for a single component on creation?', options: ['ngOnInit → constructor → ngOnChanges → ngAfterViewInit', 'constructor → ngOnChanges → ngOnInit → ngAfterViewInit', 'constructor → ngOnInit → ngOnChanges → ngAfterViewInit', 'ngOnChanges → constructor → ngAfterViewInit → ngOnInit'], answer: 1, explain: 'Constructor first, then the first ngOnChanges (when inputs are bound), ngOnInit once, and view hooks after the view is built.' });
  quiz.push({ q: 'A pure <code>activeUsers</code> pipe shows stale results after <code>users.push(newUser)</code>. Why?', options: ['Pipes cannot handle arrays', 'The array reference did not change, so the pure pipe was not re-run', 'push is asynchronous', 'The pipe must be imported twice'], answer: 1, explain: 'Pure pipes re-run only when inputs change by reference. Create a new array instead of mutating.' });
  quiz.push({ q: 'What does the <code>async</code> pipe do?', options: ['Makes a function async', 'Subscribes to an Observable/Promise, returns the latest value and unsubscribes on destroy', 'Delays rendering until the page loads', 'Runs the template in a web worker'], answer: 1, explain: 'It manages the subscription lifecycle and marks OnPush views for check on each emission.' });
  quiz.push({ q: 'What is the asterisk in <code>*ngIf="ok"</code> shorthand for?', options: ['A required input', 'Wrapping the element in <code>&lt;ng-template [ngIf]="ok"&gt;</code>', 'A wildcard selector', 'Two-way binding'], answer: 1, explain: 'Structural directive syntax desugars into an ng-template the directive can stamp or clear.' });
  quiz.push({ q: 'Which statement about NgModules is true?', options: ['A component can be declared in several NgModules', 'A declarable belongs to exactly one NgModule; others use it via exports/imports', 'Standalone components must be declared in AppModule', 'NgModules were removed in Angular 17'], answer: 1, explain: 'Declaring in two modules is an error. NgModules still exist and interoperate with standalone.' });
  quiz.push({ q: 'Which declaration lets a parent write <code>&lt;app-slider [(value)]="v" /&gt;</code>?', options: ['<code>value = input(0)</code>', '<code>value = output&lt;number&gt;()</code>', '<code>value = model(0)</code>', '<code>@Input() value = 0</code> alone'], answer: 2, explain: 'model() is a writable input with an implicit valueChange output. The decorator way needs @Input value plus @Output valueChange.' });

  /* ======================= INTERVIEW ======================= */
  interview.push({ q: 'What happens, step by step, when an Angular application starts?', level: 'B', a: `<p>The browser loads <code>index.html</code>, which contains an empty <code>&lt;app-root&gt;</code> and the bundles produced by the CLI (AOT-compiled, so templates are already JavaScript). <code>main.ts</code> calls <code>bootstrapApplication(App, appConfig)</code> (or, in module apps, <code>platformBrowserDynamic().bootstrapModule(AppModule)</code>). Angular creates the platform and the root environment injector from the providers (router, HttpClient, change detection setup such as Zone.js or zoneless), finds the element matching the root component's selector, instantiates the component, and runs the first change detection to render its template. Child components are created as their tags are encountered, forming the component tree; the router then activates the component for the current URL.</p>`, followUps: ['What is AOT and why does it matter?', 'Where would you add an HTTP interceptor?', 'What changes with zoneless change detection?'] });
  interview.push({ q: 'What is a standalone component and why did Angular move to it?', level: 'B', a: `<p>A standalone component lists its own template dependencies in <code>imports</code> instead of being declared in an <code>NgModule</code>. It became the CLI default in v17 and the decorator default in v19. Reasons: less boilerplate; each file is self-describing (you can see what a template uses without hunting through modules); no "SharedModule" that drags in everything; easier lazy loading of a single component with <code>loadComponent</code>; better tree-shaking and tooling. NgModules still work and interoperate: a standalone component can import an NgModule and vice versa, so large apps migrate gradually with the standalone schematic.</p>`, followUps: ['How do you lazy load a standalone component?', 'Where do providers go without modules?', 'Can a standalone component use a component from a legacy NgModule?'] });
  interview.push({ q: 'Explain the four kinds of data binding in Angular.', level: 'B', a: `<p><b>Interpolation</b> <code>{{ expr }}</code> renders an expression as escaped text. <b>Property binding</b> <code>[prop]="expr"</code> sets a DOM property, a directive input or a component input; variants are <code>[attr.x]</code> for attributes, <code>[class.x]</code> and <code>[style.x]</code>. <b>Event binding</b> <code>(event)="statement"</code> runs code when a DOM event or component output fires, with <code>$event</code> as the payload, plus key filters like <code>(keydown.enter)</code>. <b>Two-way binding</b> <code>[(x)]="value"</code> is sugar for <code>[x]="value" (xChange)="value = $event"</code>, used with <code>ngModel</code> (FormsModule) or a component's <code>model()</code> input. Direction: square brackets into the view, parentheses out of it.</p>`, followUps: ['What is the difference between a DOM property and an HTML attribute?', 'How would you implement [(value)] on your own component?', 'Why are template expressions restricted?'] });
  interview.push({ q: 'Compare the new control flow (@if, @for, @switch) with *ngIf, *ngFor and ngSwitch.', level: 'I', a: `<p>The built-in blocks (v17+) are part of the template language, need no imports, and compile to dedicated instructions, so they are faster and produce smaller code. <code>@for</code> requires a <code>track</code> expression, which removes the classic forgotten-<code>trackBy</code> performance bug, and supports <code>@empty</code> and context variables (<code>$index</code>, <code>$first</code>, <code>$last</code>, <code>$even</code>, <code>$odd</code>, <code>$count</code>). <code>@if</code> has real <code>@else if</code>/<code>@else</code> branches instead of <code>else</code> template references, and type narrowing works better. Old structural directives allowed only one per element, forcing <code>ng-container</code> wrappers. The legacy directives are deprecated since v20; <code>ng g @angular/core:control-flow</code> migrates templates.</p>`, followUps: ['How does track work and what happens with track $index on a reorder?', 'What is @defer and what triggers does it support?', 'What does @if destroy that [hidden] keeps?'] });
  interview.push({ q: 'How do parent and child components communicate in Angular?', level: 'B', a: `<p>Parent to child: <b>inputs</b> (<code>input()</code>, <code>input.required()</code>, legacy <code>@Input()</code>) bound with <code>[name]="value"</code>. Child to parent: <b>outputs</b> (<code>output()</code>, legacy <code>@Output() EventEmitter</code>) that the child <code>emit</code>s and the parent handles with <code>(name)="handler($event)"</code>. Both directions: <code>model()</code> with <code>[(name)]</code>. The parent can also access a child instance through <code>viewChild()</code> or a template reference variable, but that couples them. Siblings or distant components share state through a common parent or an injectable service holding signals (or an RxJS subject). The rule is data down, events up: children never mutate inputs.</p>`, followUps: ['When would you use a shared service instead of inputs/outputs?', 'Why should a child not mutate an input object?', 'What is content projection?'] });
  interview.push({ q: 'What are signal inputs and why are they preferred over @Input()?', level: 'I', a: `<p><code>input()</code> (v17.1+, stable in v19) declares an input as a <b>read-only signal</b>. Benefits: derived values are plain <code>computed()</code> instead of <code>ngOnChanges</code> or setters; effects can react to changes; they are type-safe with <code>input.required</code> checked at compile time, and options like <code>transform: booleanAttribute</code> and <code>alias</code>; the child cannot accidentally overwrite them; and they integrate with fine-grained, signal-based (and zoneless) change detection, so Angular knows exactly which views depend on them. Gotcha: inputs are not available in the constructor. Migration is automated with <code>ng g @angular/core:signal-input-migration</code>.</p>`, followUps: ['How do you react to an input change with signals?', 'What is the difference between input() and model()?', 'What does linkedSignal solve?'] });
  interview.push({ q: 'List the lifecycle hooks in order and give a use for each.', level: 'I', a: `<p><b>constructor</b> (not a hook): DI with <code>inject()</code>, field setup. <b>ngOnChanges</b>: called before ngOnInit and whenever a bound input reference changes, with <code>SimpleChanges</code>. <b>ngOnInit</b>: once, after first inputs; start data loading. <b>ngDoCheck</b>: every change detection; custom change detection (rare). <b>ngAfterContentInit / ngAfterContentChecked</b>: projected content ready / checked; use <code>contentChild</code>. <b>ngAfterViewInit / ngAfterViewChecked</b>: own and child views ready / checked; use <code>viewChild</code>, integrate DOM libraries. <b>ngOnDestroy</b>: cleanup of timers, subscriptions, listeners. Children's view hooks run before the parent's. Modern alternatives: <code>computed</code>/<code>effect</code>, <code>afterNextRender</code>/<code>afterEveryRender</code>, and <code>DestroyRef</code>.</p>`, followUps: ['Why does changing a bound value in ngAfterViewInit cause NG0100?', 'Constructor vs ngOnInit?', 'Does ngOnChanges fire when you mutate an array input?'] });
  interview.push({ q: 'What is ExpressionChangedAfterItHasBeenCheckedError and how do you fix it?', level: 'A', a: `<p>In development Angular runs a second verification pass after change detection. If a binding's value differs between the check and the verification, it throws NG0100, because the view would show inconsistent data (unidirectional data flow was violated). Common causes: changing parent state from a child's <code>ngAfterViewInit</code>, a getter or method in the template returning a new value each call (e.g. <code>Date.now()</code> or a new object), or a service updated during rendering. Fixes: compute the value earlier (ngOnInit or a computed), make template expressions pure, move the update to an event, or use signals, which schedule another render properly. Wrapping in <code>setTimeout</code> hides the symptom and should be a last resort.</p>`, followUps: ['Why only in development mode?', 'How do signals change this picture?', 'What is unidirectional data flow in change detection?'] });
  interview.push({ q: 'Explain pure vs impure pipes and when you would write a custom pipe.', level: 'I', a: `<p>A pipe transforms a value for display: <code>{{ v | name:arg }}</code>. <b>Pure</b> pipes (default) are re-evaluated only when the input or an argument changes by reference or primitive value, so they behave like memoised functions and are very cheap. <b>Impure</b> pipes (<code>pure: false</code>) run on every change detection of the view; <code>async</code> is impure because emissions arrive without the input changing. Write a custom pipe for reusable, side-effect-free display formatting used across components (initials, truncate, time ago, file size). Avoid filtering/sorting pipes (AngularJS had them; they need to be impure); derive lists with <code>computed</code> instead. Keep inputs explicit (e.g. pass <code>now</code> as an argument) so pipes stay pure and testable.</p>`, followUps: ['Why is a mutated array not reflected by a pure pipe?', 'How does the async pipe work with OnPush?', 'Pipe vs computed signal: which and when?'] });
  interview.push({ q: 'What is the difference between components, attribute directives and structural directives?', level: 'I', a: `<p>All are directives. A <b>component</b> is a directive with its own template and view; only one component can match an element. An <b>attribute directive</b> attaches behaviour or styling to an existing element (<code>NgClass</code>, <code>RouterLink</code>, a custom <code>appTooltip</code>) through host bindings and listeners, inputs and outputs; several can match the same element. A <b>structural directive</b> changes the DOM layout by creating or destroying <i>embedded views</i>: it injects <code>TemplateRef</code> (the blueprint) and <code>ViewContainerRef</code> (the insertion point) and calls <code>createEmbeddedView</code>/<code>clear</code>; the <code>*</code> syntax desugars to <code>&lt;ng-template&gt;</code>. Built-in control flow blocks now cover most structural needs.</p>`, followUps: ['Write a *appRepeat="3" directive.', 'What is hostDirectives?', 'Why use host bindings rather than nativeElement manipulation?'] });
  interview.push({ q: 'Explain NgModule metadata: declarations, imports, exports, providers, bootstrap.', level: 'B', a: `<p><b>declarations</b>: the components, directives and pipes that belong to this module (each declarable belongs to exactly one module). <b>imports</b>: other modules whose <i>exported</i> declarables (and providers) this module's templates may use, e.g. <code>CommonModule</code>, <code>FormsModule</code>, <code>RouterModule.forChild</code>. <b>exports</b>: what modules importing this one can use. <b>providers</b>: services registered in the module's injector; eagerly imported modules effectively add them to the root injector, lazy-loaded modules create a child injector (separate instances). <b>bootstrap</b>: the root component, only in AppModule. <code>forRoot()</code>/<code>forChild()</code> exist to register singleton providers once while sharing declarations.</p>`, followUps: ['Why might a lazily loaded module get its own instance of a service?', 'What is the standalone equivalent of RouterModule.forRoot?', 'What does importProvidersFrom do?'] });
  interview.push({ q: 'How does change detection work in Angular, and what do OnPush and signals change?', level: 'A', a: `<p>Classically, Zone.js patches async APIs (events, timers, XHR, promises); when one completes, Angular runs change detection from the root, checking every component's bindings by comparing previous and new values, then patching only changed DOM. With <code>ChangeDetectionStrategy.OnPush</code> a component and its subtree are skipped unless an input reference changed, an event happened inside it, an <code>async</code> pipe emitted, <code>markForCheck</code> was called, or a signal read in its template changed. Signals give fine-grained tracking: Angular knows which views read a changed signal and marks only them. In zoneless mode (stable since v20) there is no Zone.js; change detection is scheduled by signal changes, template events, <code>markForCheck</code> and the async pipe. Best practice: signals plus OnPush everywhere, immutable updates.</p>`, followUps: ['Why does mutating an input object break OnPush?', 'What does markForCheck do vs detectChanges?', 'What breaks when you remove Zone.js?'] });
  interview.push({ q: 'You join a team with a large Angular 12 app using NgModules, *ngIf and @Input. How would you modernise it?', level: 'E', a: `<p>Incrementally and with automation. 1) Upgrade one major version at a time with <code>ng update</code>, fixing breaking changes and running tests per step (update.angular.dev). 2) Switch to the esbuild application builder. 3) Run the standalone migration schematic (convert declarations, prune modules, switch to <code>bootstrapApplication</code>), feature by feature, watching provider scopes in lazy modules. 4) Migrate templates with the control-flow schematic. 5) Migrate to signal inputs/outputs/queries with the official schematics; adopt signals for local state and <code>computed</code> for derived values. 6) Turn on <code>OnPush</code> component by component, then evaluate zoneless. 7) Enable <code>strictTemplates</code>. Protect behaviour with tests (unit plus a few end-to-end flows), keep each step a reviewable PR, and measure bundle size and performance before and after.</p>`, followUps: ['What risks do you watch for when moving providers?', 'How do you get buy-in for this work?', 'How would AI tools fit into this migration?'] });

  registerModule({
    id: 'fe17',
    title: 'Angular Fundamentals',
    intro: `<p>Angular is Google's full frontend framework: routing, forms, HTTP, dependency injection, testing and a powerful CLI in one box. It powers many banking, airline and enterprise apps, so Angular rounds are common in service companies and large product teams. This module teaches <b>modern Angular</b> (v17 to v20+ style): standalone components, signals, the new <code>@if</code>/<code>@for</code>/<code>@switch</code> control flow and the <code>input()</code>/<code>output()</code>/<code>model()</code> functions, while showing the older <code>NgModule</code>, <code>*ngIf</code> and <code>@Input()</code> forms that interviewers still ask about.</p>
      <p>Each topic starts with an everyday analogy, shows real Angular TypeScript, then lets you <b>watch it happen</b> in a visualiser: the boot sequence, CSS encapsulation, binding directions, <code>@for</code> tracking, data-down/events-up, the lifecycle timeline, pure pipe caching, structural directive stamping and an NgModule → standalone migration. Every solution has a small runnable plain-JavaScript model so you can see the idea without installing anything.</p>`,
    goals: [
      'Create, run, build and upgrade an app with the Angular CLI, and explain the workspace files and the bootstrap sequence',
      'Write standalone components with templates, scoped styles, <code>imports</code> and signals',
      'Use interpolation, property, attribute, class/style, event and two-way bindings correctly',
      'Render conditions and lists with <code>@if</code>, <code>@for</code> (with the right <code>track</code>), <code>@switch</code> and <code>@defer</code>, and translate to <code>*ngIf</code>/<code>*ngFor</code>',
      'Design component APIs with <code>input()</code>, <code>output()</code> and <code>model()</code> (and their decorator equivalents)',
      'Place logic in the right lifecycle hook and always clean up timers and subscriptions',
      'Use built-in pipes, write pure custom pipes, and build attribute and structural directives',
      'Explain NgModules vs standalone and migrate a feature from one to the other'
    ],
    prereqs: `the Frontend module on DOM &amp; Events, and the JavaScript modules on functions/closures and classes/modules. Basic TypeScript (types, interfaces, generics) helps. No previous Angular experience is needed; React knowledge is helpful but not required.`,
    hours: 14,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
