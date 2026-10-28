(function () {
var topics = [], practice = [], quiz = [], interview = [];
// helpers: A = Angular/TypeScript snippet (syntax-checked as TS; Angular itself is not installed, so it is not executed)
// R = plain JS model of the same idea that runs in the sandbox
var A = function (code, title) { return { lang: 'ts', code: code, title: title }; };
var R = function (code, title) { return { lang: 'js', code: code, title: title, run: true }; };

/* ============================ TOPIC 1: Services & @Injectable ============================ */
topics.push({
  title: 'Services, @Injectable and providedIn: \'root\'',
  analogy: `<p>Think of a <b>hotel</b>. Guests (components) do not cook their own food, do their own laundry or run their own power plant. They pick up the phone and ask the <b>front desk</b> (the injector) for "room service" (a service). The front desk knows who provides room service, creates that staff member the first time anyone asks, and from then on sends the <b>same</b> staff member to every room.</p>
    <p>A component that writes <code>new CartService()</code> itself is a guest who builds a kitchen in their room: it works, but nobody can share it, swap it or test it.</p>`,
  explain: `<p>A <b>service</b> in Angular is just a plain TypeScript class that holds logic or data that is <i>not</i> about drawing the screen: talking to a server, caching, logging, auth state, a shopping cart. Components should stay thin: show data, react to clicks, and ask services for the rest.</p>
    <p><b>Dependency Injection (DI)</b> means a class <i>receives</i> the objects it needs instead of creating them. Angular has a built-in DI system: you register a <b>provider</b> ("how to make a thing") under a <b>token</b> ("the name of the thing", usually the class itself), and an <b>injector</b> creates and hands out instances.</p>
    <p><code>@Injectable()</code> marks a class as something Angular's DI compiler should generate a factory for (so its own dependencies can be injected). Adding <code>providedIn: 'root'</code> also <b>registers</b> it in the application-wide (root) injector:</p>
    <pre>@Injectable({ providedIn: 'root' })
export class CartService { ... }</pre>
    ${H.table(['Way to provide', 'Where it lives', 'How many instances', 'Tree-shakable?'], [
      ['<code>providedIn: \'root\'</code>', 'root environment injector', H.c('g', 'one for the whole app'), H.c('g', 'yes - dropped if never injected')],
      ['<code>providers: [CartService]</code> in <code>bootstrapApplication</code> / <code>app.config.ts</code>', 'root environment injector', 'one', H.c('r', 'no')],
      ['<code>providers: [CartService]</code> on a route', 'a child environment injector for that route', 'one per route injector', 'no'],
      ['<code>providers: [CartService]</code> on a <code>@Component</code>', 'that component\'s element injector', H.c('y', 'one per component instance'), 'no']
    ])}
    <p><b>Lazy creation:</b> the instance is created the first time someone injects it, not at startup. <b>Singleton</b> here means "one per injector", not "one forever" - providing the same class again lower in the tree creates another instance.</p>`,
  clues: [
    '"share data between two unrelated components" -> a root service (often holding a signal or BehaviorSubject)',
    '"the component is doing HTTP calls and business logic" -> extract a service, keep the component thin',
    '"why is my service a singleton?" / "why do I have two instances?" -> providedIn root vs providers arrays lower in the tree',
    '"tree-shakable providers" -> <code>providedIn: \'root\'</code> (or <code>providedIn</code> on an InjectionToken factory)',
    '"No provider for X" (NullInjectorError) -> the token was never registered in any injector on the lookup path',
    '"what does @Injectable actually do?" -> generates a factory so DI can construct it and inject its dependencies'
  ],
  code: [
    A(`import { Injectable, computed, signal } from '@angular/core';

export interface CartItem { id: number; name: string; price: number; qty: number; }

// One instance for the whole app, created lazily on first inject().
// If no code ever injects CartService, the bundler drops it (tree-shaking).
@Injectable({ providedIn: 'root' })
export class CartService {
  // private writable state, public read-only view
  private readonly items = signal<CartItem[]>([]);
  readonly all = this.items.asReadonly();
  readonly total = computed(() => this.items().reduce((sum, i) => sum + i.price * i.qty, 0));

  add(item: Omit<CartItem, 'qty'>): void {
    this.items.update(list => {
      const found = list.find(i => i.id === item.id);
      // never mutate: return a new array so signal consumers see a change
      return found
        ? list.map(i => (i.id === item.id ? { ...i, qty: i.qty + 1 } : i))
        : [...list, { ...item, qty: 1 }];
    });
  }

  clear(): void {
    this.items.set([]);
  }
}`, 'A root service holding shared state'),
    A(`import { Component, inject } from '@angular/core';
import { CartService } from './cart.service';

@Component({
  selector: 'app-cart-badge',
  standalone: true, // default since Angular 19; written here for clarity
  template: '<span class="badge">{{ cart.all().length }} items, {{ cart.total() }} INR</span>'
})
export class CartBadgeComponent {
  // ask the injector for the shared CartService
  protected readonly cart = inject(CartService);
}

@Component({
  selector: 'app-product',
  standalone: true,
  template: '<button (click)="buy()">Add to cart</button>'
})
export class ProductComponent {
  private readonly cart = inject(CartService); // SAME instance as in the badge
  buy(): void {
    this.cart.add({ id: 7, name: 'Mug', price: 299 });
  }
}`, 'Two components sharing one service')
  ],
  viz: {
    title: 'Who creates the service, and when?',
    input: 'Badge, Product, Badge',
    inputLabel: 'Comma-separated components that call inject(CartService), in order',
    gen: function (input) {
      var names = String(input || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      if (!names.length) throw new Error('Type component names separated by commas, e.g. Badge, Product');
      if (names.length > 6) names = names.slice(0, 6);
      var frames = [], created = 0, log = [];
      frames.push({ narr: 'App starts. The root injector has a <b>recipe</b> for <code>CartService</code> (from <code>providedIn: \'root\'</code>) but has <b>not</b> built it yet. Services are lazy.', parts: [
        { type: 'map', label: 'Root injector records', entries: [['CartService', 'recipe only (not created)']] },
        { type: 'vars', label: 'Counters', vals: { instancesCreated: 0 } } ] });
      names.forEach(function (n, i) {
        var first = created === 0;
        if (first) created = 1;
        log.push([n, first ? 'created instance #1' : 'reused instance #1']);
        frames.push({ narr: '<b>' + String(n).replace(/[<>&]/g, '') + '</b> calls <code>inject(CartService)</code>. ' + (first ? 'No instance yet, so the injector runs the factory, <span class="c-g">creates the object</span> and caches it.' : 'An instance is already cached, so the injector <span class="c-b">returns the same object</span>. That is why both components see the same cart.'), parts: [
          { type: 'map', label: 'Root injector records', entries: [['CartService', 'instance #1']], hl: { CartService: first ? 'ok' : 'win' } },
          { type: 'table', label: 'inject() calls', columns: ['component', 'result'], rows: log.map(function (r) { return r.slice(); }), hl: (function () { var h = {}; h[i] = first ? 'ok' : 'win'; return h; })() },
          { type: 'vars', label: 'Counters', vals: { instancesCreated: created } } ] });
      });
      frames.push({ narr: 'Result: ' + names.length + ' inject() calls, <b>1</b> instance. A change made through one component (add to cart) is instantly visible to all others, because they hold the same object.', parts: [
        { type: 'vars', label: 'Counters', vals: { injectCalls: names.length, instancesCreated: created }, hl: { instancesCreated: 'sel' } } ] });
      frames.push({ narr: 'Contrast: if a component listed <code>providers: [CartService]</code> in its own decorator, every instance of that component would get a <span class="c-y">private new cart</span>. Same class, different injector, different instance.', parts: [
        { type: 'graph', label: 'Two provider locations', height: 50, nodes: [
          { id: 'r', label: 'Root: Cart #1', x: 50, y: 8, shape: 'box', w: 30 },
          { id: 'a', label: 'Badge -> #1', x: 20, y: 40, shape: 'box', w: 26 },
          { id: 'b', label: 'Widget (own providers) -> #2', x: 75, y: 40, shape: 'box', w: 40 } ],
          edges: [['r', 'a'], ['r', 'b']], hl: { b: 'cur', a: 'ok' } } ] });
      return frames;
    }
  },
  examples: [
    { title: 'Before and after: extracting a service', html: `<p>A component that calls <code>fetch</code>, parses JSON, caches results and formats dates is hard to test and impossible to reuse. Move the data work into <code>ProductService</code>; the component keeps only "show the list, react to clicks". Now a test can hand the component a fake service in one line.</p>`, code: A(`// before: the component does everything
// export class ProductListComponent { async ngOnInit() { const r = await fetch('/api/products'); ... } }

// after: the component asks for a service
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Product { id: number; name: string; }

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);
  list(): Observable<Product[]> {
    return this.http.get<Product[]>('/api/products');
  }
}`) },
    { title: 'Singleton per injector, not per universe', html: `<p>Lazy-loaded routes that list a service in their own <code>providers</code> array get a <b>child environment injector</b>. Code inside that route then sees its own instance, while the rest of the app sees the root one. This is a classic "my cart is empty on the checkout page" bug.</p>${H.table(['Provided where', 'Shop page sees', 'Checkout (lazy route with providers: [CartService])'], [['root only', 'cart #1', 'cart #1'], ['root + route', 'cart #1', H.c('r', 'cart #2 (empty!)')]])}` },
    { title: 'A plain model of a lazy singleton cache', html: `<p>The core of an injector is a map from token to instance plus a map from token to recipe. You can model it in a few lines of JavaScript.</p>`, code: R(`class TinyInjector {
  constructor() { this.recipes = new Map(); this.instances = new Map(); }
  provide(token, factory) { this.recipes.set(token, factory); }
  get(token) {
    if (this.instances.has(token)) return this.instances.get(token); // cached singleton
    const factory = this.recipes.get(token);
    if (!factory) throw new Error('NullInjectorError: No provider for ' + token);
    const instance = factory(this);            // build lazily, may inject its own deps
    this.instances.set(token, instance);
    return instance;
  }
}

const root = new TinyInjector();
let built = 0;
root.provide('Logger', () => ({ log: (m) => console.log('[log]', m) }));
root.provide('Cart', (inj) => { built++; const logger = inj.get('Logger'); const items = [];
  return { add: (x) => { items.push(x); logger.log('added ' + x); }, size: () => items.length }; });

root.get('Cart').add('mug');      // created here
root.get('Cart').add('pen');      // reused
console.log('cart size', root.get('Cart').size(), '| times built', built);
try { root.get('Payments'); } catch (e) { console.log(e.message); }`) }
  ],
  deepDive: `<p><b>What the compiler emits.</b> For an <code>@Injectable</code> class Angular generates a static <code>ɵprov</code> definition (token, factory, <code>providedIn</code>) and a <code>ɵfac</code> factory that calls <code>inject()</code> for each constructor parameter. Because the provider definition sits on the class itself, the root injector finds it only when some code references the class - that is why <code>providedIn: 'root'</code> is <b>tree-shakable</b> while a <code>providers: []</code> array (which references the class eagerly) is not.</p>
    <p><b>providedIn options today:</b> <code>'root'</code> (the normal choice), <code>'platform'</code> (shared by multiple Angular apps on one page - rare, micro-frontends). <code>'any'</code> and <code>providedIn: SomeNgModule</code> are deprecated; use route <code>providers</code> instead.</p>
    <p><b>Lifecycle.</b> Services can implement <code>ngOnDestroy</code>, or better, inject <code>DestroyRef</code> and call <code>onDestroy(cb)</code>. A root service is destroyed only when the app is destroyed; a component-level service dies with its component - handy for per-widget state that must not leak.</p>
    <p><b>State choice.</b> Modern services expose state as <b>signals</b> (<code>signal</code>, <code>computed</code>, <code>asReadonly()</code>) or as RxJS (<code>BehaviorSubject</code> + <code>asObservable()</code>). Either way: keep the writable part private and expose a read-only view, so only the service can change state.</p>
    <p><b>Do not abuse services as global variables.</b> Shared mutable state with no clear owner becomes a debugging nightmare; for large apps consider NgRx SignalStore or NgRx Store, which are still built on top of DI.</p>`,
  aiEra: `<p><b>What AI changes:</b> assistants generate Angular services in seconds, but they mix eras: you will see <code>@NgModule({ providers })</code>, <code>providedIn: 'any'</code> or constructor injection next to signals. Ask for "Angular 19+, standalone, <code>inject()</code>, signals" explicitly and still review.</p>
    <p><b>Common AI slips:</b> providing a service in both <code>providedIn: 'root'</code> and a component <code>providers</code> array (two instances, state "randomly" resets), exposing a writable <code>signal</code> publicly, or mutating arrays inside <code>update()</code>.</p>
    <p><b>Good prompt:</b> <code>List every injector where CartService is provided in this code and tell me how many instances exist at runtime.</code> Then verify with Angular DevTools, which shows the injector tree and providers.</p>
    <p><b>What you must still own:</b> explaining in one breath why a service is a singleton (one per injector, lazy, cached) and when you want it not to be.</p>`,
  problems: [
    {
      title: 'Share a Notification Count Between Header and Inbox',
      level: 'Easy', tags: ['service', 'providedIn root', 'signals'], companies: ['TCS', 'Thoughtworks'],
      statement: `<p>The header shows an unread badge and the Inbox page marks messages as read. Right now each component keeps its own <code>unread</code> number, so they disagree. Create a service so both always show the same number. Only the service may change the count.</p>`,
      constraints: `Angular 17+, standalone components, <code>inject()</code>. No NgModules. Expose read-only state.`,
      example: `${H.table(['Action', 'Header badge', 'Inbox counter'], [['start (5 unread)', '5', '5'], ['Inbox: mark one read', '4', '4'], ['Buggy version after mark read', H.c('r', '5'), '4']])}`,
      brute: {
        why: `<p>Each component owns a copy of the number. Keeping them in sync needs <code>@Output</code> events bubbling to a common parent and <code>@Input</code>s back down - a lot of wiring, and it breaks as soon as the two components live on different routes.</p>`,
        code: A(`import { Component } from '@angular/core';

@Component({ selector: 'app-header', standalone: true, template: '<span>{{ unread }}</span>' })
export class HeaderComponent { unread = 5; }   // its own copy

@Component({ selector: 'app-inbox', standalone: true, template: '<button (click)="read()">read</button> {{ unread }}' })
export class InboxComponent {
  unread = 5;                                    // a second copy that drifts
  read(): void { this.unread--; }
}`, 'Two copies of the truth')
      },
      mcq: { q: 'Where should the unread count live so both components always agree?', options: ['In a root-provided service both components inject', 'In each component, synced with setInterval', 'In a component-level providers array of each component', 'In localStorage read on every change detection'], answer: 0, explain: 'One root service gives one instance, so both components read the same state. Component-level providers would create two separate instances.' },
      hints: [
        `<p>Hint 1: two components disagree because there are two copies of the data. Make one owner.</p>`,
        `<p>Hint 2: a class with <code>@Injectable({ providedIn: 'root' })</code> is created once and handed to everyone who injects it. Keep a private <code>signal</code> inside it.</p>`,
        `<p>Hint 3: recipe: service with <code>private count = signal(5)</code>, <code>readonly unread = this.count.asReadonly()</code>, <code>markRead()</code> using <code>update(n =&gt; Math.max(0, n - 1))</code>; both components <code>inject()</code> it and read <code>unread()</code> in the template.</p>`
      ],
      solution: {
        approach: `<p>Move the state into a root service. Writable signal stays private; components read <code>unread()</code> and call methods. Because the template reads a signal, both views update automatically when the value changes.</p>`,
        code: A(`import { Component, Injectable, inject, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly count = signal(5);
  readonly unread = this.count.asReadonly();       // read-only for consumers
  markRead(): void { this.count.update(n => Math.max(0, n - 1)); }
}

@Component({ selector: 'app-header', standalone: true, template: '<span class="badge">{{ notes.unread() }}</span>' })
export class HeaderComponent { protected readonly notes = inject(NotificationService); }

@Component({ selector: 'app-inbox', standalone: true, template: '<button (click)="notes.markRead()">Mark read</button> {{ notes.unread() }}' })
export class InboxComponent { protected readonly notes = inject(NotificationService); }`, 'One service, one truth'),
        dry: { head: ['Step', 'count signal', 'Header shows', 'Inbox shows'], rows: [['start', '5', '5', '5'], ['markRead()', '4', '4', '4'], ['markRead() x4 more', '0', '0', '0'], ['markRead() again', '0 (clamped)', '0', '0']] },
        complexity: `<p>O(1) per update; the signal notifies only the two templates that read it.</p>`,
        followUps: ['How would you write the same service with a BehaviorSubject?', 'What changes if the Inbox route lists NotificationService in its providers?']
      }
    }
  ]
});
/* ============================ TOPIC 2: inject() vs constructor injection ============================ */
topics.push({
  title: 'inject() vs Constructor Injection and the Injection Context',
  analogy: `<p>Imagine a <b>conference badge desk</b>. You can only collect your badge (a dependency) while you are standing <b>at the desk during check-in</b>. Once you have walked into the hall, shouting "give me my badge!" does not work - there is nobody to hand it over.</p>
    <p><code>inject()</code> is collecting the badge at the desk. The "check-in window" is the <b>injection context</b>: while Angular is constructing your class (field initializers and constructor) or running a factory, guard, resolver or interceptor. Outside that window (inside a click handler, a <code>setTimeout</code>, <code>ngOnInit</code>) the desk is closed.</p>`,
  explain: `<p>Angular has two ways to ask for a dependency:</p>
    ${H.table(['Style', 'Code', 'Notes'], [
      ['Constructor injection (classic)', '<code>constructor(private http: HttpClient) {}</code>', 'Works everywhere, still common in older code and interviews. Relies on TypeScript parameter types (emitted by the compiler).'],
      ['<code>inject()</code> function (modern, v14+)', '<code>private http = inject(HttpClient);</code>', 'Recommended today. Works in field initializers, constructors, and in <b>functional</b> guards, resolvers, interceptors and factories.']
    ])}
    <p><b>Why the community moved to <code>inject()</code>:</b></p>
    <ul>
      <li><b>Functions can use DI.</b> Functional guards (<code>CanActivateFn</code>), resolvers and interceptors (<code>HttpInterceptorFn</code>) have no constructor, so <code>inject()</code> is the only way.</li>
      <li><b>Inheritance is easier.</b> A subclass does not need to repeat every parent dependency in <code>super(a, b, c)</code>.</li>
      <li><b>Reusable helpers.</b> You can write <code>function injectUserId() { return inject(ActivatedRoute)... }</code> and call it from any component field.</li>
      <li><b>Options in one place:</b> <code>inject(Logger, { optional: true, self: true, skipSelf: true, host: true })</code> replaces the <code>@Optional() @Self() @SkipSelf() @Host()</code> parameter decorators.</li>
    </ul>
    <p><b>The one rule:</b> <code>inject()</code> must run <b>synchronously inside an injection context</b>. Otherwise Angular throws <code>NG0203: inject() must be called from an injection context</code>. If you truly need DI later, capture the <code>Injector</code> early and use <code>runInInjectionContext(injector, () =&gt; inject(X))</code>.</p>`,
  clues: [
    '"NG0203 inject() must be called from an injection context" -> inject() ran in a callback, ngOnInit, or after an await',
    '"functional guard / interceptor / resolver needs a service" -> use inject() inside the function',
    '"subclass constructor has to pass 6 dependencies to super()" -> switch base class to inject() fields',
    '"@Optional, @Self, @SkipSelf, @Host" -> same as inject options { optional, self, skipSelf, host }',
    '"create a reusable injectX() helper" -> a plain function that calls inject(), called from a field initializer',
    '"toSignal / takeUntilDestroyed without arguments" -> they call inject() internally, so need an injection context'
  ],
  code: [
    A(`import { Component, Injectable, Optional, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class Logger { log(msg: string): void { console.log(msg); } }

// Classic: constructor injection with parameter decorators
@Component({ selector: 'app-old', standalone: true, template: '' })
export class OldStyleComponent {
  constructor(private http: HttpClient, @Optional() private logger: Logger | null) {}
}

// Modern: inject() in field initializers (same result)
@Component({ selector: 'app-new', standalone: true, template: '' })
export class NewStyleComponent {
  private readonly http = inject(HttpClient);
  private readonly logger = inject(Logger, { optional: true }); // Logger | null
}`, 'Same dependencies, two styles'),
    A(`import { Component, Injector, inject, runInInjectionContext } from '@angular/core';
import { Router } from '@angular/router';

@Component({ selector: 'app-later', standalone: true, template: '<button (click)="go()">Go</button>' })
export class LaterComponent {
  private readonly injector = inject(Injector);   // OK: field initializer = injection context

  go(): void {
    // inject(Router) here would throw NG0203 - a click handler is NOT an injection context.
    runInInjectionContext(this.injector, () => {
      const router = inject(Router);              // OK: we re-opened the context explicitly
      router.navigate(['/home']);
    });
  }
}`, 'NG0203 and runInInjectionContext')
  ],
  viz: {
    title: 'Is this inject() call inside the injection context?',
    input: 'field, constructor, ngOnInit, click, guard, afterAwait',
    inputLabel: 'Places where inject() is called: field, constructor, ngOnInit, click, timeout, guard, interceptor, factory, afterAwait',
    gen: function (input) {
      var ok = { field: 'field initializer runs while Angular constructs the class', constructor: 'the constructor runs inside the construction context', guard: 'Angular runs functional guards inside the route\'s environment injector', interceptor: 'functional interceptors run in the HttpClient\'s injection context', factory: 'useFactory and InjectionToken factories run in an injection context' };
      var bad = { ngOnInit: 'lifecycle hooks run later, after construction has finished', click: 'event handlers run whenever the user clicks, long after construction', timeout: 'the callback runs on a later macrotask, the context is gone', afterAwait: 'code after await resumes in a microtask; the synchronous context has ended' };
      var items = String(input || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 8);
      if (!items.length) throw new Error('Type places such as: field, constructor, ngOnInit, click, guard');
      items.forEach(function (x) { if (!ok[x] && !bad[x]) throw new Error('Unknown place "' + x + '". Use field, constructor, ngOnInit, click, timeout, guard, interceptor, factory, afterAwait'); });
      var frames = [], rows = [];
      frames.push({ narr: 'Angular keeps a hidden "current injector" pointer. It is set <b>only</b> while it is constructing something or running a DI-aware function. <code>inject()</code> reads that pointer.', parts: [
        { type: 'vars', label: 'Hidden state', vals: { currentInjector: 'null' } },
        { type: 'table', label: 'inject() calls', columns: ['where', 'result', 'why'], rows: [] } ] });
      items.forEach(function (x, i) {
        var good = !!ok[x];
        rows.push([x, good ? 'returns instance' : 'NG0203 error', good ? ok[x] : bad[x]]);
        frames.push({ narr: '<code>inject()</code> called in <b>' + x + '</b>: ' + (good ? '<span class="c-g">the pointer is set</span> - ' + ok[x] + '.' : '<span class="c-r">the pointer is null</span> - ' + bad[x] + '. Fix: inject in a field and store it, or use <code>runInInjectionContext</code>.'), parts: [
          { type: 'vars', label: 'Hidden state', vals: { currentInjector: good ? 'set (context open)' : 'null (context closed)' }, hl: { currentInjector: good ? 'ok' : 'bad' } },
          { type: 'table', label: 'inject() calls', columns: ['where', 'result', 'why'], rows: rows.map(function (r) { return r.slice(); }), hl: (function () { var h = {}; h[i] = good ? 'ok' : 'bad'; return h; })() } ] });
      });
      frames.push({ narr: 'Rule of thumb: <b>inject at the top, use later.</b> Store dependencies in fields during construction, then call their methods from anywhere.', parts: [
        { type: 'code', label: 'Pattern', lang: 'ts', code: 'private readonly router = inject(Router); // context open\n\nonClick() {\n  this.router.navigate([\'/x\']);        // just use the field\n}', hl: { 1: 'ok', 4: 'ok' } } ] });
      return frames;
    }
  },
  examples: [
    { title: 'A reusable inject helper', html: `<p>Because <code>inject()</code> is a function, you can wrap common lookups. The helper must be called in an injection context (a field initializer here).</p>`, code: A(`import { inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';

// returns a signal with the :id route param
export function injectRouteId() {
  const route = inject(ActivatedRoute);
  return toSignal(route.paramMap.pipe(map(p => p.get('id'))), { initialValue: null });
}

// usage inside a component class:
// readonly id = injectRouteId();`) },
    { title: 'Inheritance without the super() chain', html: `<p>With constructor injection a subclass must repeat and forward all base dependencies. With <code>inject()</code> fields, the base class pulls its own.</p>`, code: A(`import { Directive, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Directive()
export abstract class BasePage {
  protected readonly http = inject(HttpClient);
  protected readonly router = inject(Router);
}

// No constructor needed at all
export class OrdersPage extends BasePage {
  load() { return this.http.get('/api/orders'); }
}`) },
    { title: 'Model: why the context closes', html: `<p>A simplified model of the hidden pointer shows why code after a callback or <code>await</code> loses access.</p>`, code: R(`let currentInjector = null;
const registry = { Router: { navigate: (p) => 'navigated to ' + p } };

function inject(token) {
  if (!currentInjector) throw new Error('NG0203: inject() must be called from an injection context');
  return currentInjector[token];
}
function construct(Cls) {               // Angular sets the pointer only while constructing
  const prev = currentInjector; currentInjector = registry;
  try { return new Cls(); } finally { currentInjector = prev; }
}

class Good { router = inject('Router'); go() { return this.router.navigate('/home'); } }
class Bad  { go() { return inject('Router').navigate('/home'); } }

console.log(construct(Good).go());
try { construct(Bad).go(); } catch (e) { console.log(e.message); }`) }
  ],
  deepDive: `<p><b>How it works.</b> Angular keeps a module-level "current injector" (and, for components, the current element injector / LView). Generated factories and framework hooks set it, call your code, then restore it. <code>inject()</code> just reads it - so it is purely synchronous and dynamic. <code>assertInInjectionContext(fn)</code> lets your own helpers throw a clear error early.</p>
    <p><b>Places that are injection contexts:</b> class field initializers and constructors of DI-created classes, <code>useFactory</code> and <code>InjectionToken</code> factories, functional guards/resolvers/<code>CanMatchFn</code>, <code>HttpInterceptorFn</code>, <code>provideAppInitializer</code>/<code>APP_INITIALIZER</code> factories, and <code>runInInjectionContext</code>. Lifecycle hooks such as <code>ngOnInit</code> are <b>not</b>.</p>
    <p><b>Interop with APIs that use it.</b> <code>takeUntilDestroyed()</code>, <code>toSignal()</code>, <code>effect()</code> and <code>afterNextRender()</code> call <code>inject()</code> internally. Called in <code>ngOnInit</code> they fail unless you pass the dependency explicitly (<code>takeUntilDestroyed(this.destroyRef)</code>, <code>effect(fn, { injector })</code>).</p>
    <p><b>Testing.</b> In tests, <code>TestBed.inject(X)</code> resolves from the test injector, and <code>TestBed.runInInjectionContext(() =&gt; myGuard(route, state))</code> lets you call functional guards directly.</p>
    <p><b>Constructor injection is not deprecated.</b> Both styles compile to the same factory; the Angular team recommends <code>inject()</code> and ships a schematic (<code>ng generate @angular/core:inject</code>) to migrate. Constructor injection does depend on the compiler reading parameter types, which is one reason it does not work for plain functions.</p>`,
  aiEra: `<p><b>What AI changes:</b> LLM-generated code often calls <code>inject()</code> inside <code>ngOnInit</code>, inside <code>subscribe</code> callbacks, or after <code>await</code> in an async method - the NG0203 error is one of the most common "AI wrote it, it crashed" moments in Angular.</p>
    <p><b>Migration help:</b> AI tools (and the official schematic) are good at converting constructor injection to <code>inject()</code> in bulk. Review the diff for parameter decorators (<code>@Optional</code>, <code>@Inject(TOKEN)</code>) mapped to the right options, and for <code>super()</code> calls removed correctly.</p>
    <p><b>Good prompt:</b> <code>Find every inject(), toSignal(), effect() and takeUntilDestroyed() call that is not in a field initializer, constructor or DI factory.</code></p>
    <p><b>What you still own:</b> knowing what an injection context is, so you can read the error and fix it in one move.</p>`,
  problems: [
    {
      title: 'Fix NG0203 in a Search Component',
      level: 'Medium', tags: ['inject()', 'injection context', 'takeUntilDestroyed'], companies: ['Infosys', 'SAP'],
      statement: `<p>A component crashes with <code>NG0203</code>. In <code>ngOnInit</code> it calls <code>inject(SearchService)</code> and subscribes with <code>takeUntilDestroyed()</code>. Fix it so the dependency is injected correctly and the subscription still stops when the component is destroyed.</p>`,
      constraints: `Keep the subscription start in <code>ngOnInit</code> (an input must be set first). Standalone component, Angular 17+.`,
      example: `${H.table(['Line', 'Runs in', 'Context?'], [['inject(SearchService) in ngOnInit', 'lifecycle hook', H.c('r', 'no - NG0203')], ['takeUntilDestroyed() in ngOnInit', 'lifecycle hook', H.c('r', 'no - NG0203')], ['field = inject(...)', 'construction', H.c('g', 'yes')]])}`,
      brute: {
        why: `<p>Both <code>inject()</code> and argument-less <code>takeUntilDestroyed()</code> need the injection context, which closes after construction. Wrapping everything in <code>try/catch</code> or moving all logic into the constructor (before inputs are set) are wrong fixes.</p>`,
        code: A(`import { Component, OnInit, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SearchService } from './search.service';

@Component({ selector: 'app-search', standalone: true, template: '' })
export class SearchComponent implements OnInit {
  readonly query = input.required<string>();
  ngOnInit(): void {
    const search = inject(SearchService);               // NG0203
    search.find(this.query()).pipe(takeUntilDestroyed()) // NG0203 too
      .subscribe(r => console.log(r));
  }
}`, 'Crashes with NG0203')
      },
      mcq: { q: 'Which change fixes takeUntilDestroyed() inside ngOnInit?', options: ['Inject DestroyRef in a field and pass it: takeUntilDestroyed(this.destroyRef)', 'Wrap the call in setTimeout', 'Make ngOnInit async', 'Call inject() twice'], answer: 0, explain: 'takeUntilDestroyed() looks up DestroyRef with inject(). Outside the context you must pass a DestroyRef you captured during construction.' },
      hints: [
        `<p>Hint 1: which parts of a class run while Angular is constructing it? Move the DI lookups there.</p>`,
        `<p>Hint 2: <code>takeUntilDestroyed</code> accepts an optional <code>DestroyRef</code> argument. You can inject <code>DestroyRef</code> like any other service.</p>`,
        `<p>Hint 3: recipe: fields <code>search = inject(SearchService)</code> and <code>destroyRef = inject(DestroyRef)</code>; in <code>ngOnInit</code> use <code>this.search.find(...).pipe(takeUntilDestroyed(this.destroyRef))</code>.</p>`
      ],
      solution: {
        approach: `<p>Inject at the top (field initializers are an injection context), use later. Pass <code>DestroyRef</code> explicitly to <code>takeUntilDestroyed</code> when calling it outside the context.</p>`,
        code: A(`import { Component, DestroyRef, OnInit, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SearchService } from './search.service';

@Component({ selector: 'app-search', standalone: true, template: '' })
export class SearchComponent implements OnInit {
  readonly query = input.required<string>();
  private readonly search = inject(SearchService);     // context open
  private readonly destroyRef = inject(DestroyRef);    // context open

  ngOnInit(): void {
    this.search.find(this.query())
      .pipe(takeUntilDestroyed(this.destroyRef))         // explicit, no inject() needed
      .subscribe(results => console.log(results));
  }
}`, 'Inject at the top, use later'),
        dry: { head: ['Moment', 'Context open?', 'What happens'], rows: [['field initializers', 'yes', 'SearchService and DestroyRef resolved'], ['inputs set', '-', 'query() now has a value'], ['ngOnInit', 'no', 'uses stored fields only'], ['component destroyed', '-', 'DestroyRef fires, subscription completes']] },
        complexity: `<p>O(1) extra work; one subscription, cleaned up automatically.</p>`,
        followUps: ['How would you rewrite this with toSignal and a computed query?', 'When would you use runInInjectionContext instead?']
      }
    }
  ]
});
/* ============================ TOPIC 3: Injector tree ============================ */
topics.push({
  title: 'The Injector Tree: Element vs Environment Injectors',
  analogy: `<p>Think of asking for a <b>stapler in an office building</b>. First you check your own desk (the component's element injector). Then your team's shelf (the parent component), then the floor's supply room, all the way up the <b>org chart of desks</b>. If nobody in the building's desks has one, you go to the <b>building's central store room</b> (the environment injectors: route, then root, then platform). If even the store room says no, you get the "<b>NullInjectorError</b>" - the null injector at the very top always says no.</p>`,
  explain: `<p>Angular does not have one injector, it has <b>two parallel hierarchies</b>:</p>
    ${H.table(['Hierarchy', 'Created by', 'Configured with', 'Lifetime'], [
      ['<b>Element injectors</b>', 'every component / directive host element in the DOM tree', '<code>providers</code> and <code>viewProviders</code> in <code>@Component</code> / <code>@Directive</code>', 'lives and dies with that element'],
      ['<b>Environment injectors</b>', 'the app (root), each lazy route with <code>providers</code>, <code>createEnvironmentInjector</code>', '<code>providedIn: \'root\'</code>, <code>bootstrapApplication(App, { providers })</code>, route <code>providers</code>', 'app or route lifetime']
    ])}
    <p><b>Resolution order</b> when a component calls <code>inject(Token)</code>:</p>
    <ol>
      <li>Its own element injector, then the parent element's, up the <b>DOM (component) tree</b> to the root component.</li>
      <li>If not found, jump to the <b>environment injector</b> that created this component (e.g. the lazy route's), then up: <b>root</b> environment injector → <b>platform</b> injector → <b>NullInjector</b> (throws <code>NullInjectorError: No provider for Token!</code>).</li>
    </ol>
    <p>The <b>first</b> injector that has a provider wins, and its instance is cached <i>there</i>.</p>
    <p><b>Resolution modifiers</b> change where the search starts or stops:</p>
    ${H.table(['inject() option', 'Old decorator', 'Meaning'], [
      ['<code>{ self: true }</code>', '<code>@Self()</code>', 'look only in my own element injector'],
      ['<code>{ skipSelf: true }</code>', '<code>@SkipSelf()</code>', 'start at my parent (e.g. nested menus finding the parent menu)'],
      ['<code>{ host: true }</code>', '<code>@Host()</code>', 'stop at the host component boundary'],
      ['<code>{ optional: true }</code>', '<code>@Optional()</code>', 'return <code>null</code> instead of throwing']
    ])}`,
  clues: [
    '"NullInjectorError: No provider for X" -> walk the lookup path: element tree, then environment chain',
    '"each tab / each row needs its own state" -> provide the service in the component providers array',
    '"lazy route gets a different instance" -> route providers create a child environment injector',
    '"nested tree / menu component needs its parent" -> inject(Parent, { skipSelf: true, optional: true })',
    '"providers vs viewProviders" -> visibility to projected content (ng-content)',
    '"hierarchical dependency injection" -> the two-tree lookup, first match wins'
  ],
  code: [
    A(`import { Component, Injectable, inject, signal } from '@angular/core';

// NOT providedIn root: each provider location makes its own instance
@Injectable()
export class TabState {
  readonly dirty = signal(false);
}

@Component({
  selector: 'app-tab',
  standalone: true,
  providers: [TabState], // element injector: one TabState per <app-tab> element
  imports: [TabFormComponent],
  template: '<app-tab-form /> dirty: {{ state.dirty() }}'
})
export class TabComponent {
  protected readonly state = inject(TabState);
}

@Component({
  selector: 'app-tab-form',
  standalone: true,
  template: '<input (input)="state.dirty.set(true)" />'
})
export class TabFormComponent {
  // walks UP the element tree and finds the TabState of the enclosing <app-tab>
  protected readonly state = inject(TabState);
}`, 'Per-component instances via the element injector'),
    A(`import { Routes } from '@angular/router';
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { AdminAuditService } from './admin-audit.service';

export const routes: Routes = [
  {
    path: 'admin',
    // creates a CHILD environment injector for this route subtree
    providers: [AdminAuditService],
    loadComponent: () => import('./admin.page').then(m => m.AdminPage)
  }
];

// root environment injector configuration
export const appConfig: ApplicationConfig = {
  providers: [provideRouter(routes), provideHttpClient()]
};`, 'Environment injectors: root and route')
  ],
  viz: {
    title: 'Where does inject(Token) find a provider?',
    input: 'route',
    inputLabel: 'Where the provider is: tab, page, route, root, none',
    gen: function (input) {
      var where = String(input || 'route').trim().toLowerCase();
      var chain = [
        { id: 'f', label: 'TabForm (element)', key: 'form' },
        { id: 't', label: 'Tab (element)', key: 'tab' },
        { id: 'p', label: 'AdminPage (element)', key: 'page' },
        { id: 'e', label: 'Route env injector', key: 'route' },
        { id: 'r', label: 'Root env injector', key: 'root' },
        { id: 'pl', label: 'Platform', key: 'platform' },
        { id: 'n', label: 'NullInjector', key: 'null' }
      ];
      if (['tab', 'page', 'route', 'root', 'none'].indexOf(where) < 0) throw new Error('Type one of: tab, page, route, root, none');
      var nodes = chain.map(function (c, i) { return { id: c.id, label: c.label, x: i < 3 ? 20 : 75, y: (i < 3 ? i : i - 3) * 17 + 6, shape: 'box', w: 34 }; });
      var edges = [['f', 't'], ['t', 'p'], ['p', 'e'], ['e', 'r'], ['r', 'pl'], ['pl', 'n']];
      var frames = [];
      frames.push({ narr: '<code>TabFormComponent</code> calls <code>inject(TabState)</code>. Left column: <b>element injectors</b> (DOM tree). Right column: <b>environment injectors</b>. The search goes up the left first, then jumps right.', parts: [
        { type: 'graph', label: 'Lookup path', directed: true, height: 70, nodes: nodes, edges: edges, hl: { f: 'cur' } } ] });
      for (var i = 0; i < chain.length; i++) {
        var c = chain[i], hl = {}, ehl = {};
        for (var j = 0; j < i; j++) hl[chain[j].id] = 'done';
        if (i > 0) ehl[chain[i - 1].id + '-' + c.id] = 'cur';
        var found = c.key === where;
        if (c.key === 'null') {
          hl[c.id] = 'bad';
          frames.push({ narr: 'Reached the <b>NullInjector</b>. It always throws: <span class="c-r">NullInjectorError: No provider for TabState!</span> Fix: add a provider somewhere on this path, or use <code>{ optional: true }</code>.', parts: [
            { type: 'graph', label: 'Lookup path', directed: true, height: 70, nodes: nodes, edges: edges, hl: hl, ehl: ehl } ] });
          break;
        }
        hl[c.id] = found ? 'ok' : 'cur';
        frames.push({ narr: (i === 3 ? 'The element tree ended without a match, so the search <b>jumps</b> to the environment injector that created this component (the lazy route\'s). ' : '') + 'Check <b>' + c.label + '</b>: ' + (found ? '<span class="c-g">provider found</span>. The instance is created (or reused) and cached in this injector. Every descendant that asks will share it.' : 'no provider here, go up.'), parts: [
          { type: 'graph', label: 'Lookup path', directed: true, height: 70, nodes: nodes, edges: edges, hl: hl, ehl: ehl } ] });
        if (found) {
          frames.push({ narr: 'Lifetime follows the injector: ' + ({ tab: 'one instance per <code>&lt;app-tab&gt;</code>, destroyed with it', page: 'one per AdminPage, destroyed when you navigate away', route: 'one per route injector, created on first visit to /admin', root: 'one for the whole app' })[where] + '.', parts: [
            { type: 'vars', label: 'Result', vals: { foundIn: c.label, steps: i + 1 }, hl: { foundIn: 'sel' } } ] });
          break;
        }
      }
      return frames;
    }
  },
  examples: [
    { title: 'Recursive menu finds its parent with skipSelf', html: `<p>A <code>MenuComponent</code> can contain other <code>MenuComponent</code>s. Each wants a reference to its <i>parent</i> menu, not itself. <code>skipSelf</code> starts the search one level up; <code>optional</code> gives <code>null</code> at the top level.</p>`, code: A(`import { Component, inject } from '@angular/core';

@Component({ selector: 'app-menu', standalone: true, template: '<ng-content />' })
export class MenuComponent {
  // the enclosing menu, or null if this is the top-level one
  readonly parent = inject(MenuComponent, { skipSelf: true, optional: true });
  readonly depth: number = this.parent ? this.parent.depth + 1 : 0;
}`) },
    { title: 'providers vs viewProviders', html: `<p><code>providers</code> are visible to the component's own template <b>and</b> to content projected into it via <code>&lt;ng-content&gt;</code>. <code>viewProviders</code> are visible only to the component's own view (its template children), <b>not</b> to projected content. Use <code>viewProviders</code> to keep internal services private from whatever a user projects.</p>${H.table(['Provided in', 'Own template children', 'Projected content'], [['providers', H.c('g', 'yes'), H.c('g', 'yes')], ['viewProviders', H.c('g', 'yes'), H.c('r', 'no')]])}` },
    { title: 'Model: two-phase lookup', html: `<p>A small model of the algorithm: walk element parents, then environment parents.</p>`, code: R(`function makeInj(name, providers, parent) { return { name, providers, parent, cache: {} }; }
function resolve(token, elementInj, envInj) {
  for (let e = elementInj; e; e = e.parent) {          // phase 1: element tree
    if (token in e.providers) return (e.cache[token] ??= e.providers[token]()) && e.name;
  }
  for (let e = envInj; e; e = e.parent) {              // phase 2: environment chain
    if (token in e.providers) return (e.cache[token] ??= e.providers[token]()) && e.name;
  }
  throw new Error('NullInjectorError: No provider for ' + token + '!');
}
const root  = makeInj('root', { Http: () => ({}) }, null);
const route = makeInj('admin-route', { Audit: () => ({}) }, root);
const tab   = makeInj('Tab', { TabState: () => ({}) }, null);
const form  = makeInj('TabForm', {}, tab);

for (const t of ['TabState', 'Audit', 'Http', 'Payments']) {
  try { console.log(t, '-> found in', resolve(t, form, route)); }
  catch (e) { console.log(t, '->', e.message); }
}`) }
  ],
  deepDive: `<p><b>Element injectors are not real objects per element.</b> For speed, Angular stores providers in the component's view data (LView/TView) and uses a <b>bloom filter</b> per element to quickly skip elements that cannot have the token. That is why element lookups are cheap even in deep trees.</p>
    <p><b>Which environment injector?</b> A component's environment injector is the one used when it was created - for routed components, the route's injector (or the closest ancestor route with <code>providers</code>/lazy children). Dynamic components created with <code>ViewContainerRef.createComponent</code> can be given a custom <code>injector</code> or <code>environmentInjector</code>.</p>
    <p><b>Route injectors are created lazily and are not destroyed</b> when you leave the route (historically; newer versions add an opt-in to destroy them). Do not rely on <code>ngOnDestroy</code> of a route-provided service firing on navigation.</p>
    <p><b>@Host</b> stops at the host element of the current component's template, which matters for directives that want a provider from "the component I am used in" but nothing beyond. <b>Content projection</b> follows the element tree of where content is <i>declared</i> plus the host it is projected into, which is why <code>viewProviders</code> exist.</p>
    <p><b>NgModule era:</b> eager <code>NgModule.providers</code> all merged into the root injector; lazy-loaded NgModules created child injectors - the same idea as today's route <code>providers</code>. <code>importProvidersFrom(SomeModule)</code> bridges old modules into standalone apps.</p>`,
  aiEra: `<p><b>What AI changes:</b> when you paste "NullInjectorError: No provider for HttpClient" into an assistant, it will almost always say "add <code>provideHttpClient()</code>" - usually right. But for scoped services it may suggest adding <code>providedIn: 'root'</code>, which silently turns a per-tab state into a global one. Know which lifetime you want first.</p>
    <p><b>Debugging with tools:</b> Angular DevTools has an <b>Injector Tree</b> view showing element and environment injectors and resolution paths for a selected component - paste that structure to an AI and ask it to explain why a token resolved where it did.</p>
    <p><b>What you still own:</b> drawing the two-column lookup diagram from memory in an interview; it answers half of all Angular DI questions.</p>`,
  problems: [
    {
      title: 'Independent State for Each Accordion Panel',
      level: 'Medium', tags: ['element injector', 'component providers', 'hierarchical DI'], companies: ['Accenture', 'Deloitte'],
      statement: `<p>An <code>&lt;app-panel&gt;</code> renders a header and body sub-components that both need to know whether <b>this</b> panel is open. The current <code>PanelState</code> is <code>providedIn: 'root'</code>, so opening one panel opens all of them. Make every panel independent without passing inputs to the header and body.</p>`,
      constraints: `Header and body inject the state; no <code>@Input</code>/<code>input()</code> wiring for the open flag.`,
      example: `${H.table(['Action', 'Panel A', 'Panel B (buggy)', 'Panel B (fixed)'], [['open A', 'open', H.c('r', 'open'), 'closed'], ['open B', 'open', 'open', 'open']])}`,
      brute: {
        why: `<p>One root instance is shared by every panel, so they all toggle together. Passing <code>open</code> as an input to every child fixes it but recreates prop drilling and breaks for deeper children.</p>`,
        code: A(`import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })   // one instance for ALL panels
export class PanelState {
  readonly open = signal(false);
  toggle(): void { this.open.update(v => !v); }
}`, 'Shared by accident')
      },
      mcq: { q: 'What gives each &lt;app-panel&gt; its own PanelState?', options: ['providers: [PanelState] in the PanelComponent decorator', 'providedIn: \'root\'', 'providedIn: \'platform\'', 'Calling inject(PanelState) twice'], answer: 0, explain: 'Component providers register in that component\'s element injector, so every element gets a fresh instance shared by its descendants.' },
      hints: [
        `<p>Hint 1: the instance count follows where the provider is registered. You want one per panel element.</p>`,
        `<p>Hint 2: remove <code>providedIn</code> and list the class in the panel component's <code>providers</code>. Children walk up the element tree and find the nearest one.</p>`,
        `<p>Hint 3: recipe: <code>@Injectable() class PanelState</code>; <code>@Component({ providers: [PanelState] }) class PanelComponent</code>; header and body call <code>inject(PanelState)</code>. Check: two panels, two instances.</p>`
      ],
      solution: {
        approach: `<p>Provide the state at the panel level. The element injector creates one instance per panel element; header and body find it by walking up. When the panel is destroyed, so is its state.</p>`,
        code: A(`import { Component, Injectable, inject, signal } from '@angular/core';

@Injectable()                                  // no providedIn: scoped by whoever provides it
export class PanelState {
  readonly open = signal(false);
  toggle(): void { this.open.update(v => !v); }
}

@Component({ selector: 'app-panel-header', standalone: true,
  template: '<button (click)="s.toggle()">{{ s.open() ? "Hide" : "Show" }}</button>' })
export class PanelHeaderComponent { protected readonly s = inject(PanelState); }

@Component({ selector: 'app-panel-body', standalone: true,
  template: '@if (s.open()) { <ng-content /> }' })
export class PanelBodyComponent { protected readonly s = inject(PanelState); }

@Component({
  selector: 'app-panel', standalone: true,
  providers: [PanelState],                     // one PanelState per <app-panel>
  imports: [PanelHeaderComponent, PanelBodyComponent],
  template: '<app-panel-header /><app-panel-body><ng-content /></app-panel-body>'
})
export class PanelComponent {}`, 'Element-scoped state'),
        dry: { head: ['Element', 'inject(PanelState) found in', 'Instance'], rows: [['Panel A header', 'Panel A element injector', '#1'], ['Panel A body', 'Panel A element injector', '#1'], ['Panel B header', 'Panel B element injector', '#2'], ['Panel B body', 'Panel B element injector', '#2']] },
        complexity: `<p>O(depth) lookup (bloom-filter accelerated), one small object per panel.</p>`,
        followUps: ['Would viewProviders work here? What about the projected content?', 'How would the body find the panel if it were projected from outside?']
      }
    }
  ]
});

/* ============================ TOPIC 4: Provider types ============================ */
topics.push({
  title: 'Provider Recipes: useClass, useValue, useFactory, useExisting, multi',
  analogy: `<p>A provider is a <b>recipe card</b> pinned to a label in the kitchen. The label is the <b>token</b> ("Coffee"). The card says how to make it: <b>useClass</b> = "brew with this machine model", <b>useValue</b> = "here is a ready-made cup, just hand it over", <b>useFactory</b> = "follow these steps, which may need milk and sugar from other shelves", <b>useExisting</b> = "this label is just another name for the Espresso label - give them the same cup". <b>multi</b> = "people keep adding cards; hand out all of them as a list".</p>`,
  explain: `<p>The short form <code>providers: [Logger]</code> is shorthand for <code>{ provide: Logger, useClass: Logger }</code>. The long form separates the <b>token</b> (what people ask for) from the <b>recipe</b> (what they get):</p>
    ${H.table(['Recipe', 'Example', 'Use it for'], [
      ['<code>useClass</code>', '<code>{ provide: Logger, useClass: RemoteLogger }</code>', 'swap an implementation (mock in tests, platform-specific class); Angular constructs it and injects its deps'],
      ['<code>useValue</code>', '<code>{ provide: API_URL, useValue: \'/api\' }</code>', 'config objects, constants, ready-made fakes; nothing is constructed'],
      ['<code>useFactory</code>', '<code>{ provide: Storage, useFactory: () =&gt; inject(PLATFORM_ID) === \'browser\' ? localStorage : memoryStorage() }</code>', 'decide at runtime, call a function, depend on other tokens (old style: <code>deps: [...]</code>)'],
      ['<code>useExisting</code>', '<code>{ provide: OldLogger, useExisting: Logger }</code>', 'an <b>alias</b>: both tokens return the <b>same instance</b>'],
      ['<code>multi: true</code>', '<code>{ provide: HTTP_INTERCEPTORS, useClass: A, multi: true }</code>', 'plugin lists; injecting the token returns an <b>array</b> of all contributions']
    ])}
    <p><b>The classic trap:</b> <code>useClass: Logger</code> for two tokens creates <b>two</b> instances (one per token). If you want both tokens to share one object, use <code>useExisting</code>.</p>
    <p><b>Factories run once per injector</b> (the result is cached like any other instance). If you need a fresh object every time, inject a factory <i>function</i> and call it yourself.</p>`,
  clues: [
    '"swap the implementation in tests / per environment" -> useClass or useValue override',
    '"configuration object / feature flags / API base URL" -> InjectionToken + useValue',
    '"choose implementation at runtime (browser vs server)" -> useFactory with inject(PLATFORM_ID)',
    '"two tokens must return the same instance" / "alias" -> useExisting',
    '"plugin system / register many handlers" -> multi: true providers',
    '"deps array" -> old-style factory dependencies, today you call inject() inside the factory'
  ],
  code: [
    A(`import { ApplicationConfig, Injectable, InjectionToken, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export abstract class Logger { abstract log(msg: string): void; }

@Injectable() export class ConsoleLogger extends Logger { log(m: string) { console.log(m); } }
@Injectable() export class SilentLogger extends Logger { log(_m: string) { /* no-op */ } }

export interface AppConfig { apiUrl: string; retries: number; }
export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG');
export const STORAGE = new InjectionToken<Storage | null>('STORAGE');

export const appConfig: ApplicationConfig = {
  providers: [
    // useValue: hand over a ready object
    { provide: APP_CONFIG, useValue: { apiUrl: '/api', retries: 2 } },
    // useClass: callers ask for the abstract Logger, get ConsoleLogger
    { provide: Logger, useClass: ConsoleLogger },
    // useExisting: SilentLogger token is an alias for whatever Logger resolves to (same instance)
    { provide: SilentLogger, useExisting: Logger },
    // useFactory: decide at runtime, may inject() other tokens
    {
      provide: STORAGE,
      useFactory: () => (isPlatformBrowser(inject(PLATFORM_ID)) ? window.localStorage : null)
    }
  ]
};`, 'All four recipes in one config'),
    A(`import { InjectionToken, inject, Component } from '@angular/core';

export interface Validator { name: string; check(value: string): boolean; }
export const VALIDATORS = new InjectionToken<Validator[]>('VALIDATORS');

export const validatorProviders = [
  { provide: VALIDATORS, multi: true, useValue: { name: 'required', check: (v: string) => v.length > 0 } },
  { provide: VALIDATORS, multi: true, useValue: { name: 'max10', check: (v: string) => v.length <= 10 } }
];

@Component({ selector: 'app-field', standalone: true, providers: validatorProviders, template: '' })
export class FieldComponent {
  // multi providers arrive as an array, in registration order
  private readonly validators = inject(VALIDATORS);
  errors(value: string): string[] {
    return this.validators.filter(v => !v.check(value)).map(v => v.name);
  }
}`, 'multi: true builds a list')
  ],
  viz: {
    title: 'Resolving tokens: useClass vs useExisting instances',
    input: 'useExisting',
    inputLabel: 'Recipe for the NewLogger alias token: useExisting or useClass',
    gen: function (input) {
      var mode = String(input || 'useExisting').trim();
      if (mode !== 'useExisting' && mode !== 'useClass') throw new Error('Type useExisting or useClass');
      var frames = [], inst = [];
      var provs = [['Logger', 'useClass: ConsoleLogger'], ['NewLogger', mode === 'useExisting' ? 'useExisting: Logger' : 'useClass: ConsoleLogger']];
      frames.push({ narr: 'Two tokens are registered. We will inject <code>Logger</code> then <code>NewLogger</code> and count how many <code>ConsoleLogger</code> objects exist.', parts: [
        { type: 'table', label: 'Providers', columns: ['token', 'recipe'], rows: provs.map(function (r) { return r.slice(); }) },
        { type: 'map', label: 'Instance cache', entries: [] } ] });
      inst.push(['Logger', 'ConsoleLogger #1']);
      frames.push({ narr: '<code>inject(Logger)</code>: recipe is <b>useClass</b>, so Angular constructs <span class="c-g">ConsoleLogger #1</span> and caches it under <code>Logger</code>.', parts: [
        { type: 'table', label: 'Providers', columns: ['token', 'recipe'], rows: provs.map(function (r) { return r.slice(); }), hl: { 0: 'cur' } },
        { type: 'map', label: 'Instance cache', entries: inst.map(function (r) { return r.slice(); }), hl: { Logger: 'ok' } } ] });
      if (mode === 'useExisting') {
        frames.push({ narr: '<code>inject(NewLogger)</code>: recipe is <b>useExisting: Logger</b>. Angular does not construct anything; it <b>resolves the Logger token</b> instead.', parts: [
          { type: 'table', label: 'Providers', columns: ['token', 'recipe'], rows: provs.map(function (r) { return r.slice(); }), hl: { 1: 'cur' } },
          { type: 'map', label: 'Instance cache', entries: inst.map(function (r) { return r.slice(); }), hl: { Logger: 'win' } } ] });
        inst.push(['NewLogger', '-> ConsoleLogger #1 (alias)']);
      } else {
        frames.push({ narr: '<code>inject(NewLogger)</code>: recipe is <b>useClass: ConsoleLogger</b> - a separate recipe for a separate token, so Angular <span class="c-y">constructs another object</span>.', parts: [
          { type: 'table', label: 'Providers', columns: ['token', 'recipe'], rows: provs.map(function (r) { return r.slice(); }), hl: { 1: 'cur' } },
          { type: 'map', label: 'Instance cache', entries: inst.map(function (r) { return r.slice(); }) } ] });
        inst.push(['NewLogger', 'ConsoleLogger #2']);
      }
      frames.push({ narr: 'Cache after both calls.', parts: [
        { type: 'map', label: 'Instance cache', entries: inst.map(function (r) { return r.slice(); }), hl: { NewLogger: mode === 'useExisting' ? 'ok' : 'bad' } } ] });
      frames.push({ narr: mode === 'useExisting' ? '<span class="c-g">One object, two names.</span> State set through one token (e.g. a log level) is visible through the other. This is what you want for aliases and for exposing a component as an abstract token.' : '<span class="c-r">Two objects.</span> If <code>ConsoleLogger</code> holds state (buffer, level), the two tokens drift apart. Use <code>useExisting</code> when you mean "same thing, another name".', parts: [
        { type: 'vars', label: 'Result', vals: { instances: mode === 'useExisting' ? 1 : 2, sameObject: mode === 'useExisting' ? 'true' : 'false' }, hl: { sameObject: mode === 'useExisting' ? 'ok' : 'bad' } } ] });
      return frames;
    }
  },
  examples: [
    { title: 'Swap an implementation for an environment', html: `<p>Components inject the abstract <code>Analytics</code> class. The config decides which concrete class backs it. No component changes when you switch vendors.</p>`, code: A(`import { Injectable, isDevMode } from '@angular/core';

export abstract class Analytics { abstract track(event: string): void; }
@Injectable() export class GoogleAnalytics extends Analytics { track(e: string) { /* send to GA */ } }
@Injectable() export class NoopAnalytics extends Analytics { track(_e: string) {} }

export const analyticsProvider = {
  provide: Analytics,
  useClass: isDevMode() ? NoopAnalytics : GoogleAnalytics
};`) },
    { title: 'Old-style factory with deps (still asked)', html: `<p>Before <code>inject()</code>, factories received their dependencies as arguments listed in <code>deps</code>. You will meet this in older codebases. Both forms are equivalent.</p>`, code: A(`import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { UserApi } from './user-api';
import { APP_CONFIG, AppConfig } from './config';

// old: positional deps
export const userApiOld = {
  provide: UserApi,
  useFactory: (http: HttpClient, cfg: AppConfig) => new UserApi(http, cfg.apiUrl),
  deps: [HttpClient, APP_CONFIG]
};

// new: inject() inside the factory
export const userApiNew = {
  provide: UserApi,
  useFactory: () => new UserApi(inject(HttpClient), inject(APP_CONFIG).apiUrl)
};`) },
    { title: 'Model: the four recipes', html: `<p>Runnable model showing caching per token, aliasing with useExisting, factories and multi lists.</p>`, code: R(`function createInjector(providers) {
  const cache = new Map(), multi = new Map();
  for (const p of providers) if (p.multi) (multi.get(p.provide) || multi.set(p.provide, []).get(p.provide)).push(p);
  const byToken = new Map(providers.filter(p => !p.multi).map(p => [p.provide, p]));
  const inj = {
    get(token) {
      if (multi.has(token)) return multi.get(token).map(p => p.useValue);
      if (cache.has(token)) return cache.get(token);
      const p = byToken.get(token);
      if (!p) throw new Error('No provider for ' + token);
      let v;
      if ('useValue' in p) v = p.useValue;
      else if (p.useClass) v = new p.useClass();
      else if (p.useFactory) v = p.useFactory(inj);
      else if (p.useExisting) v = inj.get(p.useExisting);
      cache.set(token, v);
      return v;
    }
  };
  return inj;
}
class ConsoleLogger { constructor() { ConsoleLogger.count = (ConsoleLogger.count || 0) + 1; } }
const inj = createInjector([
  { provide: 'Logger', useClass: ConsoleLogger },
  { provide: 'Alias', useExisting: 'Logger' },
  { provide: 'Copy', useClass: ConsoleLogger },
  { provide: 'Url', useValue: '/api' },
  { provide: 'Full', useFactory: (i) => i.get('Url') + '/users' },
  { provide: 'Plugins', multi: true, useValue: 'a' },
  { provide: 'Plugins', multi: true, useValue: 'b' }
]);
console.log('alias same?', inj.get('Logger') === inj.get('Alias'));
console.log('copy same?', inj.get('Logger') === inj.get('Copy'), '| loggers built', ConsoleLogger.count);
console.log(inj.get('Full'), inj.get('Plugins'));`) }
  ],
  deepDive: `<p><b>Abstract classes as tokens.</b> TypeScript interfaces vanish at runtime, so they cannot be tokens. Use an <code>abstract class</code> (it exists at runtime and documents the API) or an <code>InjectionToken&lt;T&gt;</code>.</p>
    <p><b>useExisting for component self-exposure.</b> Form controls register themselves as <code>{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() =&gt; MyInput), multi: true }</code>. <code>useExisting</code> guarantees Angular uses the component instance itself, not a new copy. <code>forwardRef</code> is needed because the class is referenced before it is declared.</p>
    <p><b>multi and overriding.</b> Mixing <code>multi: true</code> and non-multi providers for the same token throws. A child injector's multi providers <b>replace</b> (not append to) the parent list for that injector - the lists do not merge across levels.</p>
    <p><b>Factory caching.</b> <code>useFactory</code> is called once per injector and the result is cached. Expensive factories at the root run once, lazily. For "new instance every time" inject a creator function: <code>{ provide: CREATE_ID, useValue: () =&gt; crypto.randomUUID() }</code>.</p>
    <p><b>Modern provider helpers.</b> Libraries ship <code>provideX()</code> functions (<code>provideRouter</code>, <code>provideHttpClient</code>) that return <code>EnvironmentProviders</code>. These can only go in environment injectors (app config or routes), not component <code>providers</code>; <code>makeEnvironmentProviders</code> lets your library do the same.</p>`,
  aiEra: `<p><b>What AI changes:</b> assistants frequently write <code>useClass</code> where <code>useExisting</code> is needed (the <code>NG_VALUE_ACCESSOR</code> case is the famous one), or interface types as tokens which fail at runtime. Ask the model to "list each provider, its token, recipe and how many instances exist".</p>
    <p><b>Config by AI:</b> generating environment-specific <code>useValue</code> config is a good AI task, but secrets must never be put into frontend config - everything in a bundle is public.</p>
    <p><b>What you still own:</b> choosing the recipe from the requirement in seconds: constant → value, swap → class, runtime decision → factory, alias → existing, plugin list → multi.</p>`
});
/* ============================ TOPIC 5: InjectionToken ============================ */
topics.push({
  title: 'InjectionToken: DI for Things That Are Not Classes',
  analogy: `<p>In a cloakroom you get a <b>numbered ticket</b>. The ticket is not your coat, it is a unique key for getting your coat back. Two people may both own "a black coat", but their tickets are different, so there is no mix-up.</p>
    <p>An <code>InjectionToken</code> is that ticket for values that have no class of their own - a config object, a URL string, a function, the browser's <code>window</code>. Using a plain string like <code>'API_URL'</code> is like writing "black coat" on a sticky note: two libraries might use the same words.</p>`,
  explain: `<p>DI needs a <b>runtime key</b> for every dependency. Classes work because they exist at runtime. But a <code>string</code>, an <code>interface</code> or a <code>function type</code> does not. <code>InjectionToken&lt;T&gt;</code> creates a unique runtime object that also carries the <b>type</b> <code>T</code>, so <code>inject(TOKEN)</code> is fully typed.</p>
    <pre>export const API_URL = new InjectionToken&lt;string&gt;('API_URL');
// provide
{ provide: API_URL, useValue: 'https://api.shop.com' }
// consume
private readonly apiUrl = inject(API_URL); // type: string</pre>
    <p>The string argument is only a <b>description</b> for error messages; two tokens with the same description are still different keys.</p>
    <p><b>Tree-shakable token with a default:</b> a token can carry its own factory, just like <code>providedIn: 'root'</code> on a class:</p>
    <pre>export const WINDOW = new InjectionToken&lt;Window&gt;('WINDOW', {
  providedIn: 'root',
  factory: () =&gt; inject(DOCUMENT).defaultView!
});</pre>
    ${H.table(['Use case', 'Token'], [
      ['App configuration', '<code>APP_CONFIG: InjectionToken&lt;AppConfig&gt;</code>'],
      ['Browser globals (testable, SSR-safe)', '<code>WINDOW</code>, built-in <code>DOCUMENT</code>'],
      ['Feature flags', '<code>FEATURES: InjectionToken&lt;Record&lt;string, boolean&gt;&gt;</code>'],
      ['Plugin lists', '<code>VALIDATORS</code> with <code>multi: true</code>'],
      ['Built-in Angular tokens', '<code>DOCUMENT</code>, <code>PLATFORM_ID</code>, <code>LOCALE_ID</code>, <code>APP_INITIALIZER</code>, <code>HTTP_INTERCEPTORS</code>, <code>NG_VALUE_ACCESSOR</code>']
    ])}`,
  clues: [
    '"inject a config object / API URL / feature flags" -> InjectionToken + useValue',
    '"interface cannot be used as a token" -> InjectionToken&lt;MyInterface&gt; or an abstract class',
    '"window is not defined" during SSR / tests -> wrap globals in a token with a factory',
    '"default value that apps can override" -> token with providedIn root + factory, override with a provider',
    '"@Inject(TOKEN) in a constructor" -> old style for tokens; today inject(TOKEN)',
    '"string token collision" -> InjectionToken objects are unique by identity'
  ],
  code: [
    A(`import { InjectionToken, inject, Injectable, ApplicationConfig } from '@angular/core';
import { DOCUMENT } from '@angular/common';

export interface FeatureFlags { newCheckout: boolean; darkMode: boolean; }

// A token with a default factory: works with zero setup, tree-shakable, overridable
export const FEATURE_FLAGS = new InjectionToken<FeatureFlags>('FEATURE_FLAGS', {
  providedIn: 'root',
  factory: () => ({ newCheckout: false, darkMode: true })
});

// Wrap a browser global so it can be faked in tests and is null-safe on the server
export const WINDOW = new InjectionToken<Window | null>('WINDOW', {
  providedIn: 'root',
  factory: () => inject(DOCUMENT).defaultView
});

@Injectable({ providedIn: 'root' })
export class CheckoutRouter {
  private readonly flags = inject(FEATURE_FLAGS);
  private readonly win = inject(WINDOW);
  path(): string { return this.flags.newCheckout ? '/checkout-v2' : '/checkout'; }
  scrollTop(): void { this.win?.scrollTo(0, 0); }
}

// Override the default for one deployment
export const appConfig: ApplicationConfig = {
  providers: [{ provide: FEATURE_FLAGS, useValue: { newCheckout: true, darkMode: true } }]
};`, 'Tokens with defaults, overridden in config'),
    A(`import { Component, Inject, InjectionToken } from '@angular/core';

export const API_URL = new InjectionToken<string>('API_URL');

// Older constructor style: @Inject tells DI which token to use,
// because the parameter type "string" alone is not a usable key.
@Component({ selector: 'app-legacy', standalone: true, template: '{{ url }}' })
export class LegacyComponent {
  constructor(@Inject(API_URL) public url: string) {}
}`, 'Legacy: @Inject(TOKEN)')
  ],
  viz: {
    title: 'String keys collide, InjectionTokens do not',
    input: 'API_URL',
    inputLabel: 'A key name two libraries both use',
    gen: function (input) {
      var name = String(input || 'API_URL').trim().replace(/[^A-Za-z0-9_]/g, '').slice(0, 20);
      if (!name) throw new Error('Type a name such as API_URL');
      var frames = [];
      frames.push({ narr: 'Library A and your app both want a config value called <b>' + name + '</b>. First, imagine DI keyed by plain strings.', parts: [
        { type: 'map', label: 'Registry keyed by string', entries: [] } ] });
      frames.push({ narr: 'Library A registers <code>\'' + name + '\'</code> = <code>https://payments.example</code>.', parts: [
        { type: 'map', label: 'Registry keyed by string', entries: [[name, 'https://payments.example']], hl: (function () { var h = {}; h[name] = 'ok'; return h; })() } ] });
      frames.push({ narr: 'Your app registers the <b>same string</b> = <code>https://api.shop.com</code>. <span class="c-r">It overwrites Library A\'s value.</span> Library A now calls your API. Silent, nasty bug.', parts: [
        { type: 'map', label: 'Registry keyed by string', entries: [[name, 'https://api.shop.com']], hl: (function () { var h = {}; h[name] = 'bad'; return h; })() } ] });
      frames.push({ narr: 'Now with tokens. Each <code>new InjectionToken(\'' + name + '\')</code> creates a <b>unique object</b>. The description is just a label for error messages.', parts: [
        { type: 'map', label: 'Registry keyed by token object', entries: [['tokenA (desc ' + name + ')', 'https://payments.example'], ['tokenApp (desc ' + name + ')', 'https://api.shop.com']], hl: (function () { var h = {}; h['tokenApp (desc ' + name + ')'] = 'ok'; return h; })() } ] });
      frames.push({ narr: '<code>inject(tokenA)</code> returns the payments URL, <code>inject(tokenApp)</code> returns yours. <span class="c-g">No collision</span>, and TypeScript knows both are <code>string</code> because of <code>InjectionToken&lt;string&gt;</code>.', parts: [
        { type: 'table', label: 'Lookups', columns: ['call', 'result', 'type'], rows: [['inject(tokenA)', 'https://payments.example', 'string'], ['inject(tokenApp)', 'https://api.shop.com', 'string']], hl: { 0: 'ok', 1: 'ok' } } ] });
      return frames;
    }
  },
  examples: [
    { title: 'Inject a function, not an object', html: `<p>Tokens can carry functions - perfect for "give me the current time" so tests can freeze time.</p>`, code: A(`import { InjectionToken, inject, Injectable } from '@angular/core';

export const NOW = new InjectionToken<() => Date>('NOW', {
  providedIn: 'root',
  factory: () => () => new Date()
});

@Injectable({ providedIn: 'root' })
export class Greeting {
  private readonly now = inject(NOW);
  text(): string { return this.now().getHours() < 12 ? 'Good morning' : 'Good afternoon'; }
}
// test: providers: [{ provide: NOW, useValue: () => new Date('2026-01-01T09:00:00') }]`) },
    { title: 'Library configuration via provideX()', html: `<p>Well-designed libraries expose a <code>provideX(config)</code> function that registers a token. Users never touch the token directly.</p>`, code: A(`import { InjectionToken, makeEnvironmentProviders, EnvironmentProviders } from '@angular/core';

export interface ToastConfig { position: 'top' | 'bottom'; durationMs: number; }
export const TOAST_CONFIG = new InjectionToken<ToastConfig>('TOAST_CONFIG');

export function provideToasts(config: Partial<ToastConfig> = {}): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: TOAST_CONFIG, useValue: { position: 'bottom', durationMs: 3000, ...config } }
  ]);
}
// app.config.ts: providers: [provideToasts({ position: 'top' })]`) },
    { title: 'Model: identity-based keys', html: `<p>A <code>Map</code> keyed by objects behaves like Angular's token lookup: identity, not description, is the key.</p>`, code: R(`class InjectionToken { constructor(desc) { this.desc = desc; } toString() { return 'InjectionToken ' + this.desc; } }
const libToken = new InjectionToken('API_URL');
const appToken = new InjectionToken('API_URL');

const byString = new Map([['API_URL', 'payments']]);
byString.set('API_URL', 'shop');                   // overwrite!
console.log('string key ->', byString.get('API_URL'));

const byToken = new Map([[libToken, 'payments'], [appToken, 'shop']]);
console.log('lib token ->', byToken.get(libToken), '| app token ->', byToken.get(appToken));
console.log('same description, same token?', libToken === appToken, '|', String(libToken));`) }
  ],
  deepDive: `<p><b>Why not just import a constant?</b> <code>import { API_URL } from './env'</code> works until you need a different value per test, per lazy route, per tenant or on the server. DI lets the <i>consumer</i> stay unchanged while the <i>provider</i> varies. That is the whole point.</p>
    <p><b>Token factories run in an injection context</b>, so they can <code>inject()</code> other tokens. Like <code>providedIn: 'root'</code> classes, an unused token with a factory is tree-shaken.</p>
    <p><b>Typed multi tokens.</b> For multi providers, type the token as an array: <code>new InjectionToken&lt;Validator[]&gt;('VALIDATORS')</code>; each provider contributes one element.</p>
    <p><b>Initialisation tokens.</b> <code>APP_INITIALIZER</code> (multi token whose factories return functions, optionally returning a Promise/Observable that delays bootstrap) has a modern replacement: <code>provideAppInitializer(() =&gt; inject(ConfigService).load())</code> (v19+). Similarly <code>ENVIRONMENT_INITIALIZER</code> → <code>provideEnvironmentInitializer</code>.</p>
    <p><b>SSR.</b> Never touch <code>window</code>, <code>localStorage</code> or <code>navigator</code> directly in services that may run on the server; inject <code>DOCUMENT</code>, check <code>PLATFORM_ID</code> with <code>isPlatformBrowser</code>, or use <code>afterNextRender</code>. A <code>WINDOW</code> token with a null-safe factory makes this explicit and testable.</p>`,
  aiEra: `<p><b>What AI changes:</b> generated code often reaches for <code>window</code> or <code>localStorage</code> directly, which crashes under SSR and makes tests touch real browser state. Asking an assistant to "wrap every browser global in an InjectionToken with a factory" is a quick, reviewable refactor.</p>
    <p><b>Watch for</b> AI using an <code>interface</code> as a provider token (compiles in some positions, fails at runtime) or string tokens copied from very old AngularJS-era answers.</p>
    <p><b>What you still own:</b> deciding what deserves to be injectable configuration versus a plain constant import - over-tokenising makes code hard to follow.</p>`,
  problems: [
    {
      title: 'Make an API Base URL Configurable',
      level: 'Easy', tags: ['InjectionToken', 'useValue', 'config'], companies: ['Cognizant', 'Wipro'],
      statement: `<p><code>OrderService</code> hard-codes <code>'https://prod.shop.com/api'</code>. QA needs a staging URL and tests need <code>'/test'</code>. Make the base URL injectable with a sensible default, typed as <code>string</code>, without changing <code>OrderService</code>'s callers.</p>`,
      constraints: `Use an <code>InjectionToken</code>; default must work with zero configuration; override via providers.`,
      example: `${H.table(['Setup', 'orders() URL'], [['no provider (default)', '/api/orders'], ['{ provide: API_BASE, useValue: \'https://staging.shop.com/api\' }', 'https://staging.shop.com/api/orders'], ['test override \'/test\'', '/test/orders']])}`,
      brute: {
        why: `<p>A hard-coded string forces code edits (or <code>if (env === ...)</code> branches) for every environment and makes tests hit production URLs. An exported constant is better but still cannot vary per test or per lazy route.</p>`,
        code: A(`import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);
  orders() { return this.http.get('https://prod.shop.com/api/orders'); } // hard-coded
}`, 'Hard-coded URL')
      },
      mcq: { q: 'Why can\'t you write inject(string) to get the URL?', options: ['A primitive type has no unique runtime key; you need a token object', 'Strings are not allowed in Angular', 'inject only works with Observables', 'Because the URL is too long'], answer: 0, explain: 'Types like string vanish at runtime and are not unique. InjectionToken gives a unique, typed runtime key.' },
      hints: [
        `<p>Hint 1: DI needs a unique runtime key for a value that is not a class.</p>`,
        `<p>Hint 2: <code>new InjectionToken&lt;string&gt;('API_BASE', { providedIn: 'root', factory: () =&gt; '/api' })</code> gives you a default.</p>`,
        `<p>Hint 3: recipe: export the token, <code>inject(API_BASE)</code> in the service, build the URL with it; environments and tests add <code>{ provide: API_BASE, useValue: ... }</code>.</p>`
      ],
      solution: {
        approach: `<p>Token with a root factory default; the service injects it. Any injector on the path can override it with <code>useValue</code>.</p>`,
        code: A(`import { Injectable, InjectionToken, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export const API_BASE = new InjectionToken<string>('API_BASE', {
  providedIn: 'root',
  factory: () => '/api'                     // default when nobody overrides it
});

export interface Order { id: number; total: number; }

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE); // typed as string
  orders(): Observable<Order[]> {
    return this.http.get<Order[]>(this.base + '/orders');
  }
}

// staging app.config.ts: providers: [{ provide: API_BASE, useValue: 'https://staging.shop.com/api' }]`, 'Configurable base URL'),
        dry: { head: ['Injector has provider?', 'inject(API_BASE)', 'Request URL'], rows: [['no', '/api (factory)', '/api/orders'], ['yes, staging', 'https://staging.shop.com/api', 'https://staging.shop.com/api/orders'], ['TestBed override', '/test', '/test/orders']] },
        complexity: `<p>O(1); the token is resolved once per service instance.</p>`,
        followUps: ['How would you load the URL from a JSON file at startup?', 'Could an interceptor prepend the base URL instead?']
      }
    }
  ]
});
/* ============================ TOPIC 6: HttpClient & interceptors ============================ */
topics.push({
  title: 'HttpClient and Functional Interceptors',
  analogy: `<p>Sending an HTTP request through interceptors is like sending a parcel through a <b>row of post-office counters</b>. Counter 1 stamps your return address (auth header). Counter 2 writes the time on it (logging). Counter 3 says "if it gets lost, send it again" (retry). The parcel goes out through counters 1 → 2 → 3, and the reply comes back through 3 → 2 → 1, so each counter also sees the answer on the way home.</p>
    <p>Each counter can change the parcel, but only by making a <b>fresh copy</b> - the original is sealed (requests are immutable).</p>`,
  explain: `<p><b>HttpClient</b> is Angular's HTTP service. You enable it once in the app config with <code>provideHttpClient()</code>, then <code>inject(HttpClient)</code> anywhere. Every method returns a <b>cold Observable</b>: nothing is sent until someone subscribes (or uses <code>toSignal</code>, <code>firstValueFrom</code>, the <code>async</code> pipe), and each subscription sends a new request.</p>
    <pre>http.get&lt;User[]&gt;('/api/users', { params: { page: 2 } })   // JSON parsed, typed
http.post&lt;User&gt;('/api/users', body)
http.get('/file.pdf', { responseType: 'blob' })
http.get&lt;User&gt;('/api/me', { observe: 'response' })       // full HttpResponse with headers</pre>
    <p><b>Interceptors</b> are middleware around every request. The modern form is a <b>plain function</b> (<code>HttpInterceptorFn</code>):</p>
    <pre>export const authInterceptor: HttpInterceptorFn = (req, next) =&gt; {
  const token = inject(AuthService).token();
  return next(token ? req.clone({ setHeaders: { Authorization: 'Bearer ' + token } }) : req);
};
// app.config.ts
provideHttpClient(withInterceptors([authInterceptor, loggingInterceptor]))</pre>
    ${H.table(['Point', 'Rule'], [
      ['Order', 'Requests pass interceptors in array order; responses come back in <b>reverse</b> order'],
      ['Immutability', '<code>HttpRequest</code> and <code>HttpHeaders</code> are immutable: use <code>req.clone({...})</code>'],
      ['DI inside', 'functional interceptors run in an injection context, so <code>inject()</code> works'],
      ['Short-circuit', 'return <code>of(new HttpResponse({...}))</code> without calling <code>next</code> (cache, mocks)'],
      ['Errors', 'use RxJS <code>catchError</code>, <code>retry</code>, <code>timeout</code> on <code>next(req)</code>'],
      ['Old style', 'class implementing <code>HttpInterceptor</code> + <code>{ provide: HTTP_INTERCEPTORS, useClass, multi: true }</code>, enabled with <code>withInterceptorsFromDi()</code>']
    ])}`,
  clues: [
    '"add an auth token to every request" -> functional interceptor + req.clone({ setHeaders })',
    '"redirect to login on 401" / "global error toast" -> interceptor with catchError',
    '"retry failed requests" / "show a global loading spinner" -> interceptor with retry / finalize',
    '"NullInjectorError: No provider for HttpClient" -> add provideHttpClient() to app config',
    '"request not sent" -> HttpClient observables are cold; nobody subscribed',
    '"HTTP_INTERCEPTORS multi provider" -> legacy class-based interceptors (withInterceptorsFromDi)'
  ],
  code: [
    A(`import { ApplicationConfig, inject } from '@angular/core';
import {
  HttpErrorResponse, HttpInterceptorFn, provideHttpClient, withFetch, withInterceptors
} from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, finalize, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { LoadingService } from './loading.service';

// 1) attach the token (only for our own API)
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).token();
  if (!token || !req.url.startsWith('/api')) return next(req);
  return next(req.clone({ setHeaders: { Authorization: 'Bearer ' + token } }));
};

// 2) global loading counter, decremented whatever happens
export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loading = inject(LoadingService);
  loading.start();
  return next(req).pipe(finalize(() => loading.stop()));
};

// 3) on 401, go to login; always re-throw so callers can react too
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router); // inject synchronously, before any async callback
  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) router.navigate(['/login']);
      return throwError(() => err);
    })
  );
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(
      withFetch(), // use the fetch API backend (recommended for SSR)
      withInterceptors([authInterceptor, loadingInterceptor, errorInterceptor])
    )
  ]
};`, 'Three functional interceptors'),
    A(`import { Injectable, inject } from '@angular/core';
import {
  HTTP_INTERCEPTORS, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest,
  provideHttpClient, withInterceptorsFromDi
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

// Legacy (still common in interviews and older apps): class-based interceptor
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private readonly auth = inject(AuthService);
  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.auth.token();
    return next.handle(token ? req.clone({ setHeaders: { Authorization: 'Bearer ' + token } }) : req);
  }
}

export const legacyProviders = [
  provideHttpClient(withInterceptorsFromDi()), // opt in to DI-registered class interceptors
  { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
];`, 'Legacy class-based interceptor')
  ],
  viz: {
    title: 'A request through the interceptor chain and back',
    input: '200',
    inputLabel: 'Server status code to simulate (200, 401, 500)',
    gen: function (input) {
      var status = parseInt(String(input || '200').trim(), 10);
      if ([200, 401, 500].indexOf(status) < 0) throw new Error('Type 200, 401 or 500');
      var names = ['auth', 'loading', 'error'];
      var nodes = [
        { id: 'c', label: 'Component', x: 8, y: 25, shape: 'box', w: 16 },
        { id: 'auth', label: 'auth', x: 30, y: 25, shape: 'box', w: 12 },
        { id: 'loading', label: 'loading', x: 48, y: 25, shape: 'box', w: 14 },
        { id: 'error', label: 'error', x: 66, y: 25, shape: 'box', w: 12 },
        { id: 's', label: 'Backend', x: 90, y: 25, shape: 'box', w: 16 } ];
      var edges = [['c', 'auth'], ['auth', 'loading'], ['loading', 'error'], ['error', 's']];
      var frames = [], headers = {}, spin = 0;
      function g(hl, ehl) { return { type: 'graph', label: 'withInterceptors([auth, loading, error])', directed: true, height: 50, nodes: nodes, edges: edges, hl: hl, ehl: ehl || {} }; }
      function v() { var o = { Authorization: headers.Authorization || '(none)', spinnerCount: spin }; return { type: 'vars', label: 'State', vals: o }; }
      frames.push({ narr: 'Component calls <code>http.get(\'/api/orders\').subscribe()</code>. Subscribing is what starts the request.', parts: [g({ c: 'cur' }), v()] });
      headers.Authorization = 'Bearer abc';
      frames.push({ narr: '<b>auth</b> runs first: the request is immutable, so it calls <code>req.clone({ setHeaders })</code> and passes the <span class="c-g">copy</span> to <code>next</code>.', parts: [g({ auth: 'cur', c: 'done' }, { 'c-auth': 'cur' }), v()] });
      spin = 1;
      frames.push({ narr: '<b>loading</b> increments the spinner counter and wraps the rest of the chain with <code>finalize</code>.', parts: [g({ loading: 'cur', auth: 'done', c: 'done' }, { 'auth-loading': 'cur' }), v()] });
      frames.push({ narr: '<b>error</b> attaches <code>catchError</code> to the response stream and calls <code>next</code>. The last <code>next</code> is the real backend (fetch / XHR).', parts: [g({ error: 'cur', loading: 'done', auth: 'done', c: 'done' }, { 'loading-error': 'cur' }), v()] });
      frames.push({ narr: 'Backend answers <b>' + status + '</b>. The response now travels <b>back</b> through the chain in reverse order: error → loading → auth.', parts: [g({ s: status === 200 ? 'ok' : 'bad' }, { 'error-s': 'cur' }), { type: 'vars', label: 'Response', vals: { status: status } , hl: { status: status === 200 ? 'ok' : 'bad' } }] });
      if (status === 401) frames.push({ narr: '<b>error</b> sees 401 inside <code>catchError</code>: navigates to <code>/login</code>, then <span class="c-r">re-throws</span> so the caller also gets the error.', parts: [g({ error: 'bad' }), { type: 'vars', label: 'Side effect', vals: { navigate: '/login' }, hl: { navigate: 'cur' } }] });
      else if (status === 500) frames.push({ narr: '<b>error</b> sees 500: not a 401, so it just re-throws. (A retry interceptor could retry here with <code>retry({ count: 2, delay: 500 })</code>.)', parts: [g({ error: 'bad' }), v()] });
      else frames.push({ narr: '<b>error</b>: success passes straight through <code>catchError</code> untouched.', parts: [g({ error: 'ok' }), v()] });
      spin = 0;
      frames.push({ narr: '<b>loading</b>: <code>finalize</code> runs on success, error <i>and</i> unsubscribe, so the spinner counter always returns to 0.', parts: [g({ loading: 'ok' }), v()] });
      frames.push({ narr: 'Back to the component: ' + (status === 200 ? '<span class="c-g">next(orders)</span> then complete.' : '<span class="c-r">error callback</span> receives an <code>HttpErrorResponse</code> with status ' + status + '.'), parts: [g({ c: status === 200 ? 'ok' : 'bad' }), v()] });
      return frames;
    }
  },
  examples: [
    { title: 'Typed GET into a signal', html: `<p>Turn the cold Observable into a signal for templates. <code>toSignal</code> subscribes once (in the injection context) and unsubscribes on destroy. For reactive, parameterised fetching, Angular 19+ also offers <code>httpResource()</code> (experimental at first) which returns a resource with <code>value()</code>, <code>isLoading()</code> and <code>error()</code> signals.</p>`, code: A(`import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';

interface User { id: number; name: string; }

@Component({
  selector: 'app-users', standalone: true,
  template: '@for (u of users(); track u.id) { <li>{{ u.name }}</li> } @empty { <li>Loading...</li> }'
})
export class UsersComponent {
  private readonly http = inject(HttpClient);
  readonly users = toSignal(this.http.get<User[]>('/api/users'), { initialValue: [] });
}`) },
    { title: 'Caching interceptor that short-circuits', html: `<p>An interceptor may return a response <b>without calling <code>next</code></b>. Here GET responses are cached in memory; cache hits never reach the network. Pass per-request options with <code>HttpContext</code> so callers can opt out.</p>`, code: A(`import { HttpContextToken, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { of, tap } from 'rxjs';

export const CACHE = new HttpContextToken<boolean>(() => true); // default: cache on
const store = new Map<string, HttpResponse<unknown>>();

export const cacheInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.method !== 'GET' || !req.context.get(CACHE)) return next(req);
  const hit = store.get(req.urlWithParams);
  if (hit) return of(hit.clone());                       // short-circuit
  return next(req).pipe(tap(ev => { if (ev instanceof HttpResponse) store.set(req.urlWithParams, ev); }));
};
// opt out: http.get(url, { context: new HttpContext().set(CACHE, false) })`) },
    { title: 'Model: middleware chain order', html: `<p>Each interceptor gets <code>req</code> and <code>next</code>; composing them right-to-left gives "in in order, out in reverse".</p>`, code: R(`const log = [];
const mk = (name) => (req, next) => {
  log.push('-> ' + name);
  const res = next({ ...req, headers: { ...req.headers, [name]: '1' } }); // clone, never mutate
  log.push('<- ' + name);
  return res;
};
const backend = (req) => { log.push('backend sees headers ' + Object.keys(req.headers).join(',')); return { status: 200 }; };
const chain = [mk('auth'), mk('loading'), mk('error')]
  .reduceRight((next, icpt) => (req) => icpt(req, next), backend);
const original = { url: '/api/orders', headers: {} };
console.log(chain(original), log.join(' | '));
console.log('original untouched:', JSON.stringify(original.headers));`) }
  ],
  deepDive: `<p><b>Under the hood.</b> <code>provideHttpClient()</code> registers <code>HttpClient</code>, an <code>HttpHandler</code> chain and a backend (<code>HttpXhrBackend</code> by default, <code>FetchBackend</code> with <code>withFetch()</code>). Functional interceptors are wrapped into the chain via <code>runInInjectionContext</code>, which is why <code>inject()</code> works at the top of the function - but <b>not</b> inside <code>catchError</code>/<code>tap</code> callbacks that run later. Inject first, use in the callback.</p>
    <p><b>Other features:</b> <code>withXsrfConfiguration</code> / <code>withNoXsrfProtection</code> (XSRF cookie to header for same-origin mutating requests), <code>withJsonpSupport</code>, <code>withRequestsMadeViaParent</code> (child injector delegates to parent's HttpClient chain), and SSR <b>transfer cache</b> (<code>provideClientHydration(withHttpTransferCacheOptions(...))</code>) which reuses server responses on the client.</p>
    <p><b>Cancellation.</b> Unsubscribing aborts the underlying request. <code>switchMap</code> on a search box therefore cancels stale requests for free - a big advantage over promise-based fetch.</p>
    <p><b>Token refresh.</b> On 401, a refresh interceptor must queue concurrent requests while one refresh is in flight (share a single refresh Observable with <code>shareReplay(1)</code>), retry each queued request with the new token, and avoid intercepting the refresh call itself to prevent loops.</p>
    <p><b>Scope gotcha.</b> Interceptors apply to the <code>HttpClient</code> instance from the injector where they are configured. Providing <code>provideHttpClient()</code> again in a lazy route creates a <b>new</b> client without the root interceptors, unless you use <code>withRequestsMadeViaParent()</code>.</p>`,
  aiEra: `<p><b>What AI changes:</b> AI writes interceptors quickly but often mutates headers (<code>req.headers.set</code> without using the returned copy), calls <code>inject()</code> inside <code>catchError</code>, swallows errors by returning <code>EMPTY</code>, or produces infinite refresh loops. Review each of those four points every time.</p>
    <p><b>Version drift:</b> models trained on older docs still default to <code>HttpClientModule</code> and <code>HTTP_INTERCEPTORS</code>. <code>HttpClientModule</code> is deprecated; ask explicitly for <code>provideHttpClient(withInterceptors(...))</code>.</p>
    <p><b>Security reminder:</b> never let an AI-generated interceptor attach tokens to every URL - only to your own API origin, or you leak credentials to third parties.</p>`,
  problems: [
    {
      title: 'Auth Header Interceptor That Skips Third-Party URLs',
      level: 'Medium', tags: ['HttpInterceptorFn', 'req.clone', 'security'], companies: ['Amazon', 'Razorpay'],
      statement: `<p>Write a functional interceptor that adds <code>Authorization: Bearer &lt;token&gt;</code> to requests whose URL starts with the configured API base, and leaves every other request (CDN, analytics, maps) untouched. If there is no token, send the request unchanged. Register it in the app config.</p>`,
      constraints: `Angular 17+, <code>HttpInterceptorFn</code>, <code>inject()</code>, no mutation of the original request.`,
      example: `${H.table(['Request URL', 'Token', 'Header added?'], [['/api/orders', 'abc', H.c('g', 'yes')], ['https://maps.example.com/tiles', 'abc', H.c('r', 'no')], ['/api/orders', 'none', 'no']])}`,
      brute: {
        why: `<p>Adding the header in every service call duplicates code and is easy to forget. Adding it blindly to <b>all</b> requests leaks the token to third parties. Mutating <code>req.headers</code> does nothing because headers are immutable.</p>`,
        code: A(`import { HttpInterceptorFn } from '@angular/common/http';

export const badAuth: HttpInterceptorFn = (req, next) => {
  req.headers.set('Authorization', 'Bearer ' + localStorage.getItem('t')); // result thrown away
  return next(req);                                                        // and would hit every URL
};`, 'Mutation + leak')
      },
      mcq: { q: 'How do you add a header to an HttpRequest inside an interceptor?', options: ['next(req.clone({ setHeaders: { Authorization: value } }))', 'req.headers.set(...) then next(req)', 'req.headers[\'Authorization\'] = value', 'Object.assign(req, { headers })'], answer: 0, explain: 'HttpRequest and HttpHeaders are immutable. clone() returns a new request with the change; pass that copy to next.' },
      hints: [
        `<p>Hint 1: requests are immutable - you must forward a modified <b>copy</b>.</p>`,
        `<p>Hint 2: inject the token source and the API base at the top of the function; check <code>req.url.startsWith(base)</code> first.</p>`,
        `<p>Hint 3: recipe: <code>const token = inject(AuthService).token(); const base = inject(API_BASE);</code> if no token or other origin, <code>return next(req)</code>; else <code>return next(req.clone({ setHeaders: { Authorization: 'Bearer ' + token } }))</code>; register with <code>withInterceptors([authInterceptor])</code>.</p>`
      ],
      solution: {
        approach: `<p>Guard clauses first (no token, foreign URL → pass through), then clone with <code>setHeaders</code>. Register once in <code>provideHttpClient(withInterceptors(...))</code>.</p>`,
        code: A(`import { ApplicationConfig, Injectable, InjectionToken, inject, signal } from '@angular/core';
import { HttpInterceptorFn, provideHttpClient, withInterceptors } from '@angular/common/http';

export const API_BASE = new InjectionToken<string>('API_BASE', { providedIn: 'root', factory: () => '/api' });

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly token = signal<string | null>(null);
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).token();
  const base = inject(API_BASE);
  if (!token || !req.url.startsWith(base)) return next(req);   // untouched
  return next(req.clone({ setHeaders: { Authorization: 'Bearer ' + token } }));
};

export const appConfig: ApplicationConfig = {
  providers: [provideHttpClient(withInterceptors([authInterceptor]))]
};`, 'authInterceptor'),
        dry: { head: ['req.url', 'token', 'branch', 'sent with header'], rows: [['/api/orders', 'abc', 'clone + setHeaders', 'yes'], ['https://maps.example.com/t', 'abc', 'foreign URL, pass through', 'no'], ['/api/orders', 'null', 'no token, pass through', 'no']] },
        complexity: `<p>O(1) per request (one string check, one clone).</p>`,
        followUps: ['How would you add token refresh on 401 without a loop?', 'How do you unit test this interceptor?']
      }
    }
  ]
});

/* ============================ TOPIC 7: Testing with TestBed ============================ */
topics.push({
  title: 'Testing DI with TestBed and HttpTestingController',
  analogy: `<p>A <b>flight simulator</b> is a cockpit where the engines, weather and control tower are all fake but behave exactly as the pilot expects. TestBed is a simulator for one Angular class: you build a tiny injector, plug in <b>fake services</b> where real ones would be slow or dangerous (network, storage, time), and check how your class reacts. <code>HttpTestingController</code> is the fake control tower that lets you decide exactly what every "server" answers, and when.</p>`,
  explain: `<p><b>TestBed</b> creates a test environment injector (and can compile components). Because everything is wired through DI, swapping a dependency is just a provider:</p>
    <pre>TestBed.configureTestingModule({
  providers: [
    CartService,
    { provide: PriceApi, useValue: { price: () =&gt; of(100) } }   // fake
  ]
});
const cart = TestBed.inject(CartService);</pre>
    ${H.table(['Tool', 'What it does'], [
      ['<code>TestBed.configureTestingModule({ imports, providers })</code>', 'build the test injector; standalone components go in <code>imports</code>'],
      ['<code>TestBed.inject(Token)</code>', 'resolve from the test injector (services, tokens, HttpTestingController)'],
      ['<code>TestBed.createComponent(Cmp)</code>', 'create a component + fixture; <code>fixture.detectChanges()</code> / <code>await fixture.whenStable()</code>'],
      ['<code>TestBed.overrideProvider</code> / <code>overrideComponent</code>', 'replace providers, including component-level ones'],
      ['<code>provideHttpClient(), provideHttpClientTesting()</code>', 'real HttpClient with a mock backend (order matters: client first)'],
      ['<code>HttpTestingController</code>', '<code>expectOne(url)</code>, <code>req.flush(body)</code>, <code>verify()</code>'],
      ['<code>TestBed.runInInjectionContext(fn)</code>', 'call functional guards / interceptors / inject helpers directly']
    ])}
    <p><b>Older equivalents:</b> <code>HttpClientTestingModule</code> (deprecated, replaced by <code>provideHttpClientTesting()</code>), <code>TestBed.get</code> (removed, use <code>TestBed.inject</code>), <code>declarations: [Cmp]</code> for NgModule-based components.</p>
    <p>Many services need <b>no TestBed at all</b>: if a class has no Angular dependencies, just <code>new</code> it. Use TestBed when <code>inject()</code> is involved (it requires an injection context).</p>`,
  clues: [
    '"how do you mock a service in Angular tests" -> provide a fake with useValue / useClass in TestBed',
    '"test an HTTP service without a server" -> provideHttpClientTesting + HttpTestingController',
    '"NG0203 in a test" -> call inject-based code via TestBed.inject or TestBed.runInInjectionContext',
    '"component provides its own service, my override has no effect" -> TestBed.overrideComponent / overrideProvider',
    '"assert no unexpected requests" -> httpMock.verify() in afterEach',
    '"test a functional interceptor / guard" -> runInInjectionContext or a real HttpClient with withInterceptors'
  ],
  code: [
    A(`import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { OrderService, API_BASE } from './order.service';

describe('OrderService', () => {
  let service: OrderService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),          // real HttpClient...
        provideHttpClientTesting(),   // ...with a fake backend (must come after)
        { provide: API_BASE, useValue: '/test' }
      ]
    });
    service = TestBed.inject(OrderService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify()); // fail if any request was not handled

  it('GETs orders from the configured base', () => {
    let result: unknown;
    service.orders().subscribe(r => (result = r));      // nothing sent until subscribe

    const req = httpMock.expectOne('/test/orders');     // exactly one matching request
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 1, total: 50 }]);                  // the "server" answers now

    expect(result).toEqual([{ id: 1, total: 50 }]);
  });

  it('surfaces server errors', () => {
    let status = 0;
    service.orders().subscribe({ error: e => (status = e.status) });
    httpMock.expectOne('/test/orders').flush('boom', { status: 500, statusText: 'Server Error' });
    expect(status).toBe(500);
  });
});`, 'Testing an HTTP service'),
    A(`import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { authInterceptor, AuthService } from './auth.interceptor';

describe('authInterceptor', () => {
  it('adds the bearer token for /api URLs only', () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { token: signal('abc') } }   // fake auth
      ]
    });
    const http = TestBed.inject(HttpClient);
    const mock = TestBed.inject(HttpTestingController);

    http.get('/api/me').subscribe();
    http.get('https://cdn.example.com/x.json').subscribe();

    expect(mock.expectOne('/api/me').request.headers.get('Authorization')).toBe('Bearer abc');
    expect(mock.expectOne('https://cdn.example.com/x.json').request.headers.has('Authorization')).toBe(false);
    mock.verify();
  });
});`, 'Testing a functional interceptor')
  ],
  viz: {
    title: 'HttpTestingController: you play the server',
    input: 'flush',
    inputLabel: 'What the test does with the pending request: flush, error, forget',
    gen: function (input) {
      var mode = String(input || 'flush').trim().toLowerCase();
      if (['flush', 'error', 'forget'].indexOf(mode) < 0) throw new Error('Type flush, error or forget');
      var frames = [];
      frames.push({ narr: '<code>configureTestingModule</code> builds a test injector: real <code>HttpClient</code>, but the backend is replaced by a <b>recording fake</b>.', parts: [
        { type: 'graph', label: 'Test injector', directed: true, height: 40, nodes: [
          { id: 's', label: 'OrderService', x: 15, y: 20, shape: 'box', w: 22 }, { id: 'h', label: 'HttpClient', x: 50, y: 20, shape: 'box', w: 20 }, { id: 'b', label: 'Testing backend', x: 85, y: 20, shape: 'box', w: 24 } ],
          edges: [['s', 'h'], ['h', 'b']], hl: { b: 'sel' } },
        { type: 'queue', label: 'Pending requests', items: [] } ] });
      frames.push({ narr: 'The test subscribes: <code>service.orders().subscribe(...)</code>. The request reaches the fake backend and <b>waits</b> in a queue. No network, no timer.', parts: [
        { type: 'queue', label: 'Pending requests', items: ['GET /test/orders'], hl: { 0: 'cur' } },
        { type: 'vars', label: 'Subscriber', vals: { result: 'undefined (still waiting)' } } ] });
      frames.push({ narr: '<code>httpMock.expectOne(\'/test/orders\')</code> finds exactly one matching request (it would fail on zero or two) and returns a <code>TestRequest</code>.', parts: [
        { type: 'queue', label: 'Pending requests', items: ['GET /test/orders'], hl: { 0: 'ok' } } ] });
      if (mode === 'flush') {
        frames.push({ narr: '<code>req.flush([{ id: 1 }])</code>: the fake server answers <b>synchronously</b>. The subscriber receives the data immediately.', parts: [
          { type: 'queue', label: 'Pending requests', items: [] },
          { type: 'vars', label: 'Subscriber', vals: { result: '[{ id: 1 }]' }, hl: { result: 'ok' } } ] });
        frames.push({ narr: '<code>httpMock.verify()</code> in <code>afterEach</code>: queue is empty, <span class="c-g">test passes</span>.', parts: [ { type: 'vars', label: 'verify()', vals: { outstanding: 0, verdict: 'pass' }, hl: { verdict: 'ok' } } ] });
      } else if (mode === 'error') {
        frames.push({ narr: '<code>req.flush(\'boom\', { status: 500, statusText: \'Server Error\' })</code>: the subscriber\'s <b>error</b> callback receives an <code>HttpErrorResponse</code>. (For network failures use <code>req.error(new ProgressEvent(\'error\'))</code>.)', parts: [
          { type: 'queue', label: 'Pending requests', items: [] },
          { type: 'vars', label: 'Subscriber', vals: { error: 'HttpErrorResponse 500' }, hl: { error: 'bad' } } ] });
        frames.push({ narr: '<code>verify()</code>: nothing outstanding, and your assertions on the error path pass.', parts: [ { type: 'vars', label: 'verify()', vals: { outstanding: 0, verdict: 'pass' }, hl: { verdict: 'ok' } } ] });
      } else {
        frames.push({ narr: 'The test forgets to flush. The subscriber never gets a value, so a weak assertion might even pass by accident...', parts: [
          { type: 'queue', label: 'Pending requests', items: ['GET /test/orders'], hl: { 0: 'bad' } } ] });
        frames.push({ narr: '...but <code>httpMock.verify()</code> <span class="c-r">throws: "Expected no open requests, found 1"</span>. That is why <code>verify()</code> belongs in <code>afterEach</code>.', parts: [ { type: 'vars', label: 'verify()', vals: { outstanding: 1, verdict: 'fail' }, hl: { verdict: 'bad' } } ] });
      }
      return frames;
    }
  },
  examples: [
    { title: 'Component test with a fake service', html: `<p>Standalone components go into <code>imports</code>. Provide a fake for the service the component injects; then interact through the DOM.</p>`, code: A(`import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { HeaderComponent, NotificationService } from './header';

it('shows the unread count from the service', async () => {
  const fake = { unread: signal(3), markRead: () => {} };
  await TestBed.configureTestingModule({
    imports: [HeaderComponent],
    providers: [{ provide: NotificationService, useValue: fake }]
  }).compileComponents();

  const fixture = TestBed.createComponent(HeaderComponent);
  fixture.detectChanges();
  expect(fixture.nativeElement.textContent).toContain('3');

  fake.unread.set(7);                   // change the fake's state
  fixture.detectChanges();
  expect(fixture.nativeElement.textContent).toContain('7');
});`) },
    { title: 'Overriding a component-level provider', html: `<p>If the component lists <code>providers: [PanelState]</code>, a root-level test provider is never reached - the element injector wins. Override the component itself.</p>`, code: A(`import { TestBed } from '@angular/core/testing';
import { PanelComponent, PanelState } from './panel';

class FakePanelState { open = () => true; toggle() {} }

beforeEach(() => {
  TestBed.configureTestingModule({ imports: [PanelComponent] });
  TestBed.overrideComponent(PanelComponent, {
    set: { providers: [{ provide: PanelState, useClass: FakePanelState }] }
  });
});`) },
    { title: 'Testing a functional guard', html: `<p>Functional guards call <code>inject()</code>, so they must run in an injection context. <code>TestBed.runInInjectionContext</code> provides one.</p>`, code: A(`import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';

it('redirects anonymous users to /login', () => {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), { provide: AuthService, useValue: { isLoggedIn: () => false } }]
  });
  const result = TestBed.runInInjectionContext(() =>
    authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));
  expect(result instanceof UrlTree).toBe(true);
});`) }
  ],
  deepDive: `<p><b>Test runners.</b> The Angular CLI historically used Karma + Jasmine; Karma is deprecated and newer CLI versions support <b>Vitest</b> (and Jest via builders / community presets) and the experimental Web Test Runner. TestBed APIs are the same across runners; only the <code>describe/it/expect</code> spies differ (<code>jasmine.createSpyObj</code> vs <code>vi.fn()</code>).</p>
    <p><b>Change detection in tests.</b> With zone-based apps, <code>fixture.detectChanges()</code> triggers CD; <code>fakeAsync</code> + <code>tick()</code> drives timers. In <b>zoneless</b> apps (<code>provideZonelessChangeDetection()</code>, stable in v20), prefer <code>await fixture.whenStable()</code> and signals, and enable <code>autoDetectChanges</code> deliberately.</p>
    <p><b>Order of HTTP providers.</b> <code>provideHttpClientTesting()</code> must come <i>after</i> <code>provideHttpClient(...)</code> because it overrides the backend. Interceptors configured with <code>withInterceptors</code> still run against the testing backend, which is what lets you test them for real.</p>
    <p><b>What to fake.</b> Fake at the DI boundary closest to the side effect: HTTP (testing backend), time (inject a <code>NOW</code> token), storage (inject a token), randomness (inject a generator). Do not mock the class you are testing, and avoid deep spy chains that re-implement the code.</p>
    <p><b>Isolation.</b> TestBed is reset between tests automatically; root singletons are re-created per test, so shared state does not leak - unless it lives in module-level variables (like the cache <code>Map</code> in the interceptor example), which you must reset yourself.</p>`,
  aiEra: `<p><b>What AI changes:</b> generating test boilerplate (TestBed setup, fakes, <code>expectOne</code>/<code>flush</code>) is one of the best uses of AI in Angular. Common mistakes in generated tests: using deprecated <code>HttpClientTestingModule</code>, forgetting <code>verify()</code>, asserting before <code>flush</code>, putting a standalone component in <code>declarations</code>, and providing a fake at root when the component provides its own instance.</p>
    <p><b>Check that tests can fail.</b> Ask the AI to also write a version of the code with a bug, run the tests, and confirm they catch it. Tests that pass on broken code are worse than no tests.</p>
    <p><b>What you still own:</b> deciding what behaviour is worth testing and where the DI seam is.</p>`
});
/* ============================ PRACTICE ============================ */
function P(o) { practice.push(o); }

P({
  title: 'Convert Constructor Injection to inject()', level: 'Easy', tags: ['inject()', 'migration'], companies: ['Infosys', 'Capgemini'],
  statement: `<p>Rewrite this component to use <code>inject()</code> field initializers instead of constructor parameters, keeping the same behaviour, including the <code>@Optional()</code> logger and the <code>@Inject(API_URL)</code> token.</p>`,
  constraints: `No constructor left. Same types (logger may be <code>null</code>).`,
  example: `${H.table(['Constructor parameter', 'inject() equivalent'], [['private http: HttpClient', 'inject(HttpClient)'], ['@Optional() private log: Logger', 'inject(Logger, { optional: true })'], ['@Inject(API_URL) private url: string', 'inject(API_URL)']])}`,
  brute: { why: `<p>Constructor injection works but needs decorators for tokens and options, and subclasses must forward every argument to <code>super()</code>.</p>`, code: A(`import { Component, Inject, Optional } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_URL, Logger } from './tokens';

@Component({ selector: 'app-report', standalone: true, template: '' })
export class ReportComponent {
  constructor(private http: HttpClient, @Optional() private log: Logger | null, @Inject(API_URL) private url: string) {}
}`, 'Before') },
  mcq: { q: 'What does @Optional() become with inject()?', options: ['inject(Logger, { optional: true })', 'inject(Logger) ?? undefined', 'inject(Optional(Logger))', 'inject(Logger, { self: true })'], answer: 0, explain: 'Resolution options map 1:1: optional, self, skipSelf, host.' },
  hints: [`<p>Hint 1: each constructor parameter becomes a <code>private readonly</code> field.</p>`, `<p>Hint 2: decorators become the options object of <code>inject()</code>; a token passed to <code>@Inject</code> is passed directly to <code>inject</code>.</p>`, `<p>Hint 3: delete the constructor; the type of the optional field is <code>Logger | null</code>, inferred automatically.</p>`],
  solution: { approach: `<p>Map each parameter to a field initializer. Field initializers run during construction, so they are inside the injection context.</p>`, code: A(`import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_URL, Logger } from './tokens';

@Component({ selector: 'app-report', standalone: true, template: '' })
export class ReportComponent {
  private readonly http = inject(HttpClient);
  private readonly log = inject(Logger, { optional: true }); // Logger | null
  private readonly url = inject(API_URL);                    // typed by the token
}`, 'After'), complexity: `<p>No runtime difference; same factory output.</p>`, followUps: ['Which Angular schematic automates this?'] }
});

P({
  title: 'Provide a Mock Logger with useValue', level: 'Easy', tags: ['useValue', 'testing'], companies: ['TCS'],
  statement: `<p>A <code>PaymentService</code> injects <code>Logger</code>. In a unit test, replace the logger with an object that records messages in an array, then assert that <code>pay(100)</code> logs <code>"paid 100"</code>.</p>`,
  constraints: `TestBed, no real console output.`,
  example: `<p>After <code>pay(100)</code>, the fake's <code>messages</code> equals <code>['paid 100']</code>.</p>`,
  brute: { why: `<p>Spying on <code>console.log</code> globally couples the test to the real logger implementation and leaks across tests.</p>`, code: A(`it('logs', () => {
  const spy = spyOn(console, 'log');           // global spy, brittle
  TestBed.inject(PaymentService).pay(100);
  expect(spy).toHaveBeenCalled();
});`, 'Global console spy') },
  mcq: { q: 'Which provider replaces Logger with a ready-made object?', options: ['{ provide: Logger, useValue: fake }', '{ provide: Logger, useExisting: fake }', '{ provide: fake, useClass: Logger }', 'Logger'], answer: 0, explain: 'useValue hands over the object as-is. useExisting expects another token, not an object.' },
  hints: [`<p>Hint 1: DI lets the test choose what <code>inject(Logger)</code> returns.</p>`, `<p>Hint 2: build a plain object <code>{ messages: [], log(m) { this.messages.push(m); } }</code>.</p>`, `<p>Hint 3: provide it with <code>useValue</code>, <code>TestBed.inject(PaymentService)</code>, call <code>pay</code>, assert on <code>messages</code>.</p>`],
  solution: { approach: `<p>Fake at the DI seam with <code>useValue</code>; assert on the fake's recorded state.</p>`, code: A(`import { TestBed } from '@angular/core/testing';
import { Logger } from './logger';
import { PaymentService } from './payment.service';

describe('PaymentService', () => {
  it('logs the paid amount', () => {
    const fake = { messages: [] as string[], log(m: string) { this.messages.push(m); } };
    TestBed.configureTestingModule({ providers: [{ provide: Logger, useValue: fake }] });
    TestBed.inject(PaymentService).pay(100);
    expect(fake.messages).toEqual(['paid 100']);
  });
});`, 'Fake via useValue'), complexity: `<p>O(1); the test runs synchronously with no real I/O.</p>` }
});

P({
  title: 'Fix "No provider for HttpClient"', level: 'Easy', tags: ['provideHttpClient', 'NullInjectorError'], companies: ['Wipro', 'HCL'],
  statement: `<p>A freshly generated standalone app throws <code>NullInjectorError: R3InjectorError(Standalone[AppComponent])[ProductService -&gt; HttpClient -&gt; HttpClient]: No provider for HttpClient!</code>. Fix the app configuration, and use the fetch backend.</p>`,
  constraints: `No <code>HttpClientModule</code> (deprecated).`,
  example: `<p>Read the error right to left: AppComponent needed ProductService, which needed HttpClient, which no injector provides.</p>`,
  brute: { why: `<p>Adding <code>HttpClientModule</code> to a component's <code>imports</code> works in some versions but is deprecated, and adding <code>HttpClient</code> itself to <code>providers</code> skips the backend and interceptors setup.</p>`, code: A(`import { ApplicationConfig } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [HttpClient]   // wrong: HttpClient needs a handler chain and backend
};`, 'Wrong fix') },
  mcq: { q: 'Where is provideHttpClient() registered in a standalone app?', options: ['In the providers of bootstrapApplication / app.config.ts', 'In every component\'s imports', 'In a component\'s viewProviders', 'In tsconfig.json'], answer: 0, explain: 'It returns environment providers, which belong in the root (or a route) environment injector.' },
  hints: [`<p>Hint 1: the chain in the error shows who needed what. The last link is missing.</p>`, `<p>Hint 2: Angular ships a <code>provideHttpClient()</code> function for the app config.</p>`, `<p>Hint 3: <code>providers: [provideHttpClient(withFetch())]</code> in <code>app.config.ts</code>.</p>`],
  solution: { approach: `<p>Register HttpClient once in the root environment injector via <code>provideHttpClient</code>.</p>`, code: A(`import { ApplicationConfig } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [provideRouter(routes), provideHttpClient(withFetch())]
};`, 'app.config.ts'), complexity: `<p>Configuration only; no runtime cost beyond one client.</p>` }
});

P({
  title: 'Environment-Based Storage with useFactory', level: 'Medium', tags: ['useFactory', 'PLATFORM_ID', 'SSR'], companies: ['Swiggy', 'Myntra'],
  statement: `<p>A <code>KeyValueStore</code> abstraction must use <code>localStorage</code> in the browser and an in-memory map on the server (SSR), chosen automatically. Components inject <code>KeyValueStore</code> only.</p>`,
  constraints: `<code>useFactory</code> with <code>inject(PLATFORM_ID)</code>; no direct <code>window</code> access on the server.`,
  example: `${H.table(['Platform', 'Implementation'], [['browser', 'LocalStore (localStorage)'], ['server', 'MemoryStore (Map)']])}`,
  brute: { why: `<p>Calling <code>localStorage</code> directly crashes during SSR with "localStorage is not defined"; scattering <code>typeof window</code> checks in every component duplicates logic.</p>`, code: A(`import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class Prefs {
  get(k: string) { return localStorage.getItem(k); }   // crashes on the server
}`, 'Direct global access') },
  mcq: { q: 'Which recipe picks an implementation at runtime?', options: ['useFactory', 'useValue', 'useExisting', 'multi'], answer: 0, explain: 'A factory runs code (in an injection context) and returns whichever object fits.' },
  hints: [`<p>Hint 1: define an abstract class as the token so both implementations share one API.</p>`, `<p>Hint 2: the factory can call <code>inject(PLATFORM_ID)</code> and <code>isPlatformBrowser</code>.</p>`, `<p>Hint 3: <code>{ provide: KeyValueStore, useFactory: () =&gt; isPlatformBrowser(inject(PLATFORM_ID)) ? new LocalStore() : new MemoryStore() }</code>.</p>`],
  solution: { approach: `<p>Abstract class token + factory choosing the implementation once per injector.</p>`, code: A(`import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export abstract class KeyValueStore {
  abstract get(key: string): string | null;
  abstract set(key: string, value: string): void;
}
export class LocalStore extends KeyValueStore {
  get(k: string) { return localStorage.getItem(k); }
  set(k: string, v: string) { localStorage.setItem(k, v); }
}
export class MemoryStore extends KeyValueStore {
  private readonly map = new Map<string, string>();
  get(k: string) { return this.map.get(k) ?? null; }
  set(k: string, v: string) { this.map.set(k, v); }
}

export const storeProvider = {
  provide: KeyValueStore,
  useFactory: () => (isPlatformBrowser(inject(PLATFORM_ID)) ? new LocalStore() : new MemoryStore())
};`, 'Factory-selected implementation'), complexity: `<p>Factory runs once per injector; O(1) operations.</p>`, followUps: ['How would you test both branches?'] }
});

P({
  title: 'Alias an Old Service Name with useExisting', level: 'Medium', tags: ['useExisting', 'refactoring'], companies: ['SAP', 'Oracle'],
  statement: `<p>You renamed <code>UserStore</code> to <code>AccountStore</code>. 40 legacy components still inject <code>UserStore</code>. Keep them working <b>and</b> guarantee they share the single <code>AccountStore</code> instance with new code.</p>`,
  constraints: `One provider line. No duplicate state.`,
  example: `<p><code>inject(UserStore) === inject(AccountStore)</code> must be <code>true</code>.</p>`,
  brute: { why: `<p><code>{ provide: UserStore, useClass: AccountStore }</code> builds a <b>second</b> AccountStore, so legacy and new components see different data.</p>`, code: A(`export const legacy = { provide: UserStore, useClass: AccountStore }; // second instance!`, 'Duplicate instance') },
  mcq: { q: 'Which provider makes two tokens return the same object?', options: ['useExisting', 'useClass', 'useValue: new AccountStore()', 'multi: true'], answer: 0, explain: 'useExisting forwards the lookup to another token, so the same cached instance is returned.' },
  hints: [`<p>Hint 1: count instances: each <code>useClass</code> recipe builds its own.</p>`, `<p>Hint 2: you want "this token is another name for that token".</p>`, `<p>Hint 3: <code>{ provide: UserStore, useExisting: AccountStore }</code> in the root providers, with <code>AccountStore</code> <code>providedIn: 'root'</code>.</p>`],
  solution: { approach: `<p>Alias with <code>useExisting</code>; the lookup redirects to AccountStore's cached instance.</p>`, code: A(`import { ApplicationConfig, Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AccountStore { readonly name = signal('guest'); }

/** @deprecated use AccountStore */
export abstract class UserStore { abstract readonly name: AccountStore['name']; }

export const appConfig: ApplicationConfig = {
  providers: [{ provide: UserStore, useExisting: AccountStore }]
};`, 'Alias'), complexity: `<p>O(1) lookup, exactly one shared instance.</p>` }
});

P({
  title: 'Plugin Registry with multi Providers', level: 'Medium', tags: ['multi', 'InjectionToken'], companies: ['Atlassian', 'Microsoft'],
  statement: `<p>Build an export menu where feature areas register exporters (CSV, PDF, JSON) without the menu knowing them. The menu injects all registered exporters and lists their labels.</p>`,
  constraints: `<code>InjectionToken&lt;Exporter[]&gt;</code>, <code>multi: true</code>. Adding a format must not change the menu code.`,
  example: `<p>Providers for CSV and PDF registered → menu shows <code>["CSV", "PDF"]</code>.</p>`,
  brute: { why: `<p>A hard-coded <code>switch(format)</code> in the menu must be edited for every new format (violates open/closed) and imports every exporter even if unused.</p>`, code: A(`export function exportAs(format: string, rows: unknown[]): string {
  switch (format) { case 'csv': return 'csv'; case 'pdf': return 'pdf'; default: throw new Error('unknown'); }
}`, 'Central switch') },
  mcq: { q: 'What does inject(TOKEN) return when TOKEN has three multi providers?', options: ['An array of all three values', 'The last registered value', 'The first registered value', 'An error'], answer: 0, explain: 'multi providers are collected into an array in registration order.' },
  hints: [`<p>Hint 1: you need "a list that anybody can append to" in DI.</p>`, `<p>Hint 2: <code>multi: true</code> on a typed array token.</p>`, `<p>Hint 3: each feature exports <code>{ provide: EXPORTERS, multi: true, useValue: {...} }</code>; the menu does <code>inject(EXPORTERS).map(e =&gt; e.label)</code>.</p>`],
  solution: { approach: `<p>Typed multi token; contributions collected by DI; menu depends only on the interface.</p>`, code: A(`import { Component, InjectionToken, inject } from '@angular/core';

export interface Exporter { label: string; run(rows: unknown[]): string; }
export const EXPORTERS = new InjectionToken<Exporter[]>('EXPORTERS');

export const csvExporter = { provide: EXPORTERS, multi: true,
  useValue: { label: 'CSV', run: (rows: unknown[]) => rows.map(r => JSON.stringify(r)).join('\\n') } };
export const pdfExporter = { provide: EXPORTERS, multi: true,
  useValue: { label: 'PDF', run: (_rows: unknown[]) => '%PDF-1.7 ...' } };

@Component({
  selector: 'app-export-menu', standalone: true,
  template: '@for (e of exporters; track e.label) { <button>{{ e.label }}</button> }'
})
export class ExportMenuComponent {
  protected readonly exporters = inject(EXPORTERS, { optional: true }) ?? [];
}
// app.config.ts: providers: [csvExporter, pdfExporter]`, 'multi registry'), complexity: `<p>O(k) for k exporters.</p>`, followUps: ['What happens if a lazy route adds one more exporter in its providers?'] }
});

P({
  title: 'Global Loading Spinner Interceptor', level: 'Medium', tags: ['interceptor', 'finalize', 'signals'], companies: ['Flipkart', 'PayPal'],
  statement: `<p>Show a spinner while <b>any</b> HTTP request is in flight. Several requests can overlap; the spinner must hide only when all are done, including failed or cancelled ones.</p>`,
  constraints: `Functional interceptor + a root service with a counter signal.`,
  example: `${H.table(['Event', 'inFlight', 'spinner'], [['A starts', '1', 'on'], ['B starts', '2', 'on'], ['A fails', '1', 'on'], ['B cancelled', '0', 'off']])}`,
  brute: { why: `<p>A boolean <code>loading = true/false</code> hides the spinner when the <i>first</i> request ends even if others are running, and <code>tap</code>-only logic misses errors and unsubscribes.</p>`, code: A(`import { HttpInterceptorFn } from '@angular/common/http';
import { tap } from 'rxjs';
let loading = false;
export const bad: HttpInterceptorFn = (req, next) => {
  loading = true;
  return next(req).pipe(tap(() => (loading = false)));   // wrong on overlap, errors, cancel
};`, 'Boolean flag') },
  mcq: { q: 'Which RxJS operator runs on complete, error AND unsubscribe?', options: ['finalize', 'tap', 'map', 'catchError'], answer: 0, explain: 'finalize runs its callback when the subscription ends for any reason.' },
  hints: [`<p>Hint 1: overlapping requests need a counter, not a boolean flag.</p>`, `<p>Hint 2: increment before <code>next(req)</code>, decrement in <code>finalize</code>.</p>`, `<p>Hint 3: service with <code>count = signal(0)</code> and <code>busy = computed(() =&gt; count() &gt; 0)</code>; interceptor injects it at the top.</p>`],
  solution: { approach: `<p>Reference-count in-flight requests; <code>finalize</code> guarantees the decrement.</p>`, code: A(`import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { finalize } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly count = signal(0);
  readonly busy = computed(() => this.count() > 0);
  start() { this.count.update(n => n + 1); }
  stop() { this.count.update(n => Math.max(0, n - 1)); }
}

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loading = inject(LoadingService);
  loading.start();
  return next(req).pipe(finalize(() => loading.stop()));
};`, 'Counting interceptor'), complexity: `<p>O(1) per request start and stop.</p>`, followUps: ['How would you exclude background polling requests (HttpContextToken)?'] }
});

P({
  title: 'Retry Idempotent Requests with Backoff', level: 'Medium', tags: ['interceptor', 'retry', 'RxJS'], companies: ['Uber', 'Zomato'],
  statement: `<p>Write an interceptor that retries <b>GET</b> requests up to 2 times on network errors (status 0) or 5xx, waiting 300 ms then 600 ms. Never retry POST, and never retry 4xx.</p>`,
  constraints: `RxJS <code>retry({ count, delay })</code>; functional interceptor.`,
  example: `${H.table(['Request', 'Responses', 'Outcome'], [['GET', '503, 503, 200', 'success after 2 retries'], ['GET', '404', 'fails immediately'], ['POST', '503', 'fails immediately']])}`,
  brute: { why: `<p><code>retry(3)</code> on everything re-sends POSTs (duplicate orders!) and hammers the server on 4xx errors that will never succeed.</p>`, code: A(`import { HttpInterceptorFn } from '@angular/common/http';
import { retry } from 'rxjs';
export const naive: HttpInterceptorFn = (req, next) => next(req).pipe(retry(3));`, 'Retry everything') },
  mcq: { q: 'Why not retry POST by default?', options: ['POST is not idempotent; retries can duplicate side effects', 'POST cannot fail', 'Angular forbids it', 'retry only works on GET'], answer: 0, explain: 'Repeating a non-idempotent request may create two orders or charges unless the API supports idempotency keys.' },
  hints: [`<p>Hint 1: decide first whether the request is safe to repeat.</p>`, `<p>Hint 2: <code>retry({ count: 2, delay: (err, n) =&gt; ... })</code> - return <code>timer(ms)</code> to retry or <code>throwError</code> to stop.</p>`, `<p>Hint 3: in <code>delay</code>, rethrow unless status is 0 or &gt;= 500; delay = 300 * 2^(n-1).</p>`],
  solution: { approach: `<p>Only GET passes through the retry pipe; the delay function filters retryable errors and computes exponential backoff.</p>`, code: A(`import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { retry, throwError, timer } from 'rxjs';

export const retryInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.method !== 'GET') return next(req);
  return next(req).pipe(
    retry({
      count: 2,
      delay: (err: HttpErrorResponse, attempt: number) => {
        const retryable = err.status === 0 || err.status >= 500;
        return retryable ? timer(300 * 2 ** (attempt - 1)) : throwError(() => err);
      }
    })
  );
};`, 'Backoff retry'), complexity: `<p>At most 3 requests per call; worst-case extra latency 900 ms.</p>`, followUps: ['How would you add jitter?', 'How does an Idempotency-Key header allow retrying POST?'] }
});

P({
  title: 'Test a Service That Calls Two Endpoints', level: 'Medium', tags: ['TestBed', 'HttpTestingController'], companies: ['Thoughtworks', 'Intuit'],
  statement: `<p><code>ProfileService.load(id)</code> GETs <code>/api/users/:id</code> and then <code>/api/users/:id/orders</code>, returning <code>{ user, orders }</code>. Write a test that flushes both requests in order and verifies the combined result and that no extra requests were made.</p>`,
  constraints: `<code>provideHttpClient()</code> + <code>provideHttpClientTesting()</code>.`,
  example: `<p>Flush user <code>{ id: 1, name: 'Asha' }</code>, then orders <code>[]</code> → result <code>{ user: {...}, orders: [] }</code>.</p>`,
  brute: { why: `<p>Hitting a real dev server makes the test slow, flaky and dependent on data. Expecting both requests up-front fails, because the second is only sent after the first responds.</p>`, code: A(`it('loads', () => {
  service.load(1).subscribe();
  httpMock.expectOne('/api/users/1');
  httpMock.expectOne('/api/users/1/orders'); // fails: not sent yet (first not flushed)
});`, 'Expecting too early') },
  mcq: { q: 'When is the second request (orders) visible to expectOne?', options: ['Only after the first request is flushed', 'Immediately after subscribe', 'After verify()', 'Never in tests'], answer: 0, explain: 'The service sends the second request in a switchMap after the first response arrives, which happens on flush.' },
  hints: [`<p>Hint 1: think about when each request is actually sent.</p>`, `<p>Hint 2: <code>expectOne</code> + <code>flush</code> the first, then <code>expectOne</code> + <code>flush</code> the second.</p>`, `<p>Hint 3: capture the result in a variable, assert after both flushes, and call <code>verify()</code> in <code>afterEach</code>.</p>`],
  solution: { approach: `<p>Drive the fake server step by step in the same order the service sends requests.</p>`, code: A(`import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ProfileService } from './profile.service';

describe('ProfileService', () => {
  let httpMock: HttpTestingController;
  let service: ProfileService;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    httpMock = TestBed.inject(HttpTestingController);
    service = TestBed.inject(ProfileService);
  });
  afterEach(() => httpMock.verify());

  it('combines user and orders', () => {
    let result: unknown;
    service.load(1).subscribe(r => (result = r));
    httpMock.expectOne('/api/users/1').flush({ id: 1, name: 'Asha' });   // step 1
    httpMock.expectOne('/api/users/1/orders').flush([]);                  // step 2 (sent after step 1)
    expect(result).toEqual({ user: { id: 1, name: 'Asha' }, orders: [] });
  });
});`, 'Sequential flushes'), complexity: `<p>Synchronous, no timers.</p>` }
});

P({
  title: 'Token Refresh Interceptor Without Loops', level: 'Hard', tags: ['interceptor', 'auth', 'concurrency'], companies: ['Google', 'Stripe'],
  statement: `<p>On a 401 from <code>/api</code>, call <code>/auth/refresh</code> once, then retry the failed request with the new token. If 5 requests fail at once, only <b>one</b> refresh call must be made. If refresh fails, log out. Never intercept the refresh call itself.</p>`,
  constraints: `Functional interceptor, RxJS. Shared in-flight refresh.`,
  example: `${H.table(['Time', 'Event'], [['t0', '5 requests get 401'], ['t1', '1 refresh request sent'], ['t2', 'refresh OK -> 5 retries with new token'], ['alt', 'refresh 401 -> logout, all 5 error']])}`,
  brute: { why: `<p>Calling refresh inside <code>catchError</code> for each failure sends 5 refreshes (race, token rotation invalidates each other), and intercepting the refresh call's own 401 causes an infinite loop.</p>`, code: A(`import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap } from 'rxjs';
import { AuthService } from './auth.service';
export const naive: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  return next(req).pipe(catchError(() => auth.refresh().pipe(switchMap(() => next(req))))); // N refreshes, loops
};`, 'Refresh per failure') },
  mcq: { q: 'How do concurrent 401s share one refresh?', options: ['Keep one in-flight refresh Observable with shareReplay(1) in a service', 'Call refresh in each interceptor run', 'Use setTimeout to wait', 'Retry with retry(5)'], answer: 0, explain: 'A shared Observable is subscribed by all waiting requests; the HTTP call happens once.' },
  hints: [`<p>Hint 1: the refresh must be a shared resource owned by a service, not per request.</p>`, `<p>Hint 2: store <code>refresh$ = http.post(...).pipe(tap(save), finalize(() =&gt; refresh$ = null), shareReplay(1))</code>.</p>`, `<p>Hint 3: skip URLs starting with <code>/auth/</code>; on 401 → <code>auth.refresh().pipe(switchMap(t =&gt; next(withToken(req, t))), catchError(e =&gt; { auth.logout(); return throwError(() =&gt; e); }))</code>.</p>`],
  solution: { approach: `<p>A root <code>AuthService</code> owns a single in-flight refresh Observable. The interceptor bypasses auth endpoints, retries once per request with the new token, and logs out if refresh fails.</p>`, code: A(`import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { Observable, catchError, finalize, map, shareReplay, switchMap, tap, throwError } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  readonly token = signal<string | null>(null);
  private refresh$: Observable<string> | null = null;

  refresh(): Observable<string> {
    // reuse the in-flight refresh if one exists
    this.refresh$ ??= this.http.post<{ token: string }>('/auth/refresh', {}).pipe(
      map(r => r.token),
      tap(t => this.token.set(t)),
      finalize(() => (this.refresh$ = null)),
      shareReplay(1)
    );
    return this.refresh$;
  }
  logout(): void { this.token.set(null); }
}

const withToken = (req: HttpRequest<unknown>, t: string) =>
  req.clone({ setHeaders: { Authorization: 'Bearer ' + t } });

export const refreshInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  if (req.url.startsWith('/auth/')) return next(req);           // never intercept refresh itself
  const t = auth.token();
  return next(t ? withToken(req, t) : req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401) return throwError(() => err);
      return auth.refresh().pipe(
        switchMap(newToken => next(withToken(req, newToken))),  // retry once
        catchError(refreshErr => { auth.logout(); return throwError(() => refreshErr); })
      );
    })
  );
};`, 'Single-flight refresh'), complexity: `<p>One refresh call per expiry regardless of concurrency; each failed request retried once.</p>`, followUps: ['What if the retried request returns 401 again?', 'Where would you store tokens securely (cookies vs memory)?'] }
});

P({
  title: 'Scoped Wizard State with a Route Injector', level: 'Hard', tags: ['route providers', 'environment injector', 'lifetime'], companies: ['Booking.com', 'Adobe'],
  statement: `<p>A 3-step checkout wizard spans child routes <code>/checkout/address</code>, <code>/checkout/payment</code>, <code>/checkout/review</code>. All steps share a <code>WizardState</code>, but other parts of the app must not see it, and starting a new checkout should begin empty. Explain where to provide it and how to reset it.</p>`,
  constraints: `No global singleton. Route-level providers. Explain lifetime caveats.`,
  example: `<p>Address step sets city = Pune → payment step reads Pune; product page cannot inject <code>WizardState</code> (NullInjectorError).</p>`,
  brute: { why: `<p><code>providedIn: 'root'</code> makes the wizard data visible app-wide and it survives across checkouts. Providing it in each step component gives each step its own empty copy.</p>`, code: A(`import { Injectable, signal } from '@angular/core';
@Injectable({ providedIn: 'root' })        // global: leaks and never resets
export class WizardState { readonly city = signal(''); }`, 'Global wizard state') },
  mcq: { q: 'Where should WizardState be provided so all three child routes share it and no one else sees it?', options: ['providers on the parent /checkout route', 'providedIn root', 'providers on each step component', 'viewProviders on AppComponent'], answer: 0, explain: 'Route providers create an environment injector shared by that route subtree only.' },
  hints: [`<p>Hint 1: you need one instance for a route subtree.</p>`, `<p>Hint 2: route <code>providers</code> create a child environment injector used by all child routes.</p>`, `<p>Hint 3: route injectors are generally kept after navigation, so add an explicit <code>reset()</code> called when the wizard starts (or provide it on the parent wizard component's element injector, which is destroyed on leave).</p>`],
  solution: { approach: `<p>Provide on the parent route so all steps share one instance and other routes cannot inject it. Because a route's environment injector may outlive navigation, reset on entry - or, if you want automatic disposal, provide it in a <code>CheckoutShellComponent</code> (the parent route's component) whose element injector is destroyed when the user leaves.</p>`, code: A(`import { Injectable, inject, signal } from '@angular/core';
import { Routes } from '@angular/router';

@Injectable()
export class WizardState {
  readonly city = signal('');
  readonly card = signal('');
  reset(): void { this.city.set(''); this.card.set(''); }
}

export const routes: Routes = [
  {
    path: 'checkout',
    providers: [WizardState],                  // shared by this subtree only
    canActivate: [() => { inject(WizardState).reset(); return true; }], // fresh start on entry
    children: [
      { path: 'address', loadComponent: () => import('./address.step').then(m => m.AddressStep) },
      { path: 'payment', loadComponent: () => import('./payment.step').then(m => m.PaymentStep) },
      { path: 'review', loadComponent: () => import('./review.step').then(m => m.ReviewStep) }
    ]
  }
];`, 'Route-scoped state'), complexity: `<p>One instance per route injector; O(1) access.</p>`, followUps: ['Note: the parent canActivate does not re-run when moving between child steps - why does that matter here?', 'How would you compare this to an NgRx SignalStore provided at the route?'] }
});

P({
  title: 'Mini DI Container (Model Angular\'s Injector)', level: 'Hard', tags: ['injector', 'hierarchy', 'design'], companies: ['Google', 'Microsoft'],
  statement: `<p>Implement a tiny hierarchical injector in plain JavaScript supporting <code>useClass</code>, <code>useValue</code>, <code>useFactory</code>, <code>useExisting</code>, caching per injector, parent lookup, <code>optional</code>/<code>self</code>/<code>skipSelf</code> options, and cycle detection with a readable error.</p>`,
  constraints: `No libraries. Factories receive an <code>inject</code> function.`,
  example: `<p>Child resolves its own <code>Logger</code>, falls back to parent for <code>Config</code>; A needs B needs A → <code>Circular dependency: A -&gt; B -&gt; A</code>.</p>`,
  brute: { why: `<p>A flat map of singletons cannot scope instances, and a naive recursive resolve overflows the stack on cycles instead of reporting them.</p>`, code: R(`const registry = {};
function get(name) { return registry[name] ??= create(name); }   // no scopes, no cycle check
function create(name) { return { name }; }
console.log(get('A') === get('A'));`, 'Flat registry') },
  mcq: { q: 'How do you detect a circular dependency during resolution?', options: ['Track tokens currently being constructed in a stack/set', 'Count total instances', 'Catch RangeError', 'Sort tokens alphabetically'], answer: 0, explain: 'If a token is requested while it is still being built, there is a cycle; the stack gives the path.' },
  hints: [`<p>Hint 1: each injector has providers, a cache and a parent pointer.</p>`, `<p>Hint 2: <code>get(token, opts)</code>: decide the start injector (<code>skipSelf</code>), walk up (stop if <code>self</code>), build in the injector that owns the provider.</p>`, `<p>Hint 3: keep a shared <code>resolving</code> array; push before build, pop after; if the token is already in it throw with the path.</p>`],
  solution: { approach: `<p>Hierarchical lookup with per-injector cache, options handling and a resolution stack for cycle detection - the same shape as Angular's R3Injector.</p>`, code: R(`class Injector {
  constructor(providers, parent = null) {
    this.parent = parent; this.cache = new Map();
    this.providers = new Map(providers.map(p => [p.provide, p]));
  }
  get(token, opts = {}, stack = []) {
    let inj = opts.skipSelf ? this.parent : this;
    while (inj) {
      if (inj.providers.has(token)) return inj.build(token, stack);
      if (opts.self) break;
      inj = inj.parent;
    }
    if (opts.optional) return null;
    throw new Error('NullInjectorError: No provider for ' + token);
  }
  build(token, stack) {
    if (this.cache.has(token)) return this.cache.get(token);
    if (stack.includes(token)) throw new Error('Circular dependency: ' + [...stack, token].join(' -> '));
    stack.push(token);
    const p = this.providers.get(token);
    const inject = (t, o) => this.get(t, o, stack);
    let v;
    try {
      if ('useValue' in p) v = p.useValue;
      else if (p.useExisting) v = inject(p.useExisting);
      else if (p.useFactory) v = p.useFactory(inject);
      else v = new p.useClass(inject);
    } finally { stack.pop(); }
    this.cache.set(token, v);
    return v;
  }
}

class Logger { constructor() { this.id = Math.random().toString(36).slice(2, 6); } }
const root = new Injector([
  { provide: 'Config', useValue: { api: '/api' } },
  { provide: 'Logger', useClass: Logger },
  { provide: 'Log2', useExisting: 'Logger' },
  { provide: 'Url', useFactory: (inject) => inject('Config').api + '/v1' },
  { provide: 'A', useFactory: (inject) => ({ b: inject('B') }) },
  { provide: 'B', useFactory: (inject) => ({ a: inject('A') }) }
]);
const child = new Injector([{ provide: 'Logger', useClass: Logger }], root);

console.log('alias same:', root.get('Logger') === root.get('Log2'));
console.log('child own logger:', child.get('Logger') !== root.get('Logger'));
console.log('skipSelf gets parent:', child.get('Logger', { skipSelf: true }) === root.get('Logger'));
console.log('fallback to parent:', child.get('Url'));
console.log('optional missing:', child.get('Nope', { optional: true }));
try { child.get('Config', { self: true }); } catch (e) { console.log(e.message); }
try { root.get('A'); } catch (e) { console.log(e.message); }`, 'Mini hierarchical injector'), complexity: `<p>O(depth) per lookup, O(1) on cache hit.</p>`, followUps: ['How would you add multi providers?', 'How does Angular break cycles in practice (forwardRef, lazy inject via Injector)?'] }
});

P({
  title: 'Request Cache with Opt-Out and Invalidation', level: 'Hard', tags: ['interceptor', 'HttpContext', 'caching'], companies: ['Netflix', 'Shopify'],
  statement: `<p>Write a caching interceptor for GET requests with a 30 s TTL, an <code>HttpContextToken</code> to opt out per request, de-duplication of concurrent identical requests, and invalidation of all cached entries for a URL prefix after any POST/PUT/DELETE to that prefix.</p>`,
  constraints: `Cache in a root service (so tests can reset it). Inject time via a token.`,
  example: `${H.table(['Call', 'Network?'], [['GET /api/items (t=0)', 'yes'], ['GET /api/items (t=5s, concurrent)', 'no (shared)'], ['POST /api/items', 'yes, invalidates /api/items'], ['GET /api/items', 'yes']])}`,
  brute: { why: `<p>A module-level Map with no TTL serves stale data forever, two simultaneous requests both hit the network, and writes leave stale lists behind.</p>`, code: A(`import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { of, tap } from 'rxjs';
const cache = new Map<string, HttpResponse<unknown>>();   // no TTL, no invalidation, global
export const naiveCache: HttpInterceptorFn = (req, next) =>
  cache.has(req.url) ? of(cache.get(req.url)!) : next(req).pipe(tap(e => { if (e instanceof HttpResponse) cache.set(req.url, e); }));`, 'Naive cache') },
  mcq: { q: 'How do two concurrent identical GETs share one network call?', options: ['Store the in-flight Observable with shareReplay and return it to both', 'Use two separate caches', 'Delay the second with setTimeout', 'Use retry'], answer: 0, explain: 'Caching the in-flight shared Observable (not only the final response) de-duplicates concurrent requests.' },
  hints: [`<p>Hint 1: cache Observables, not just responses - that handles both hits and in-flight sharing.</p>`, `<p>Hint 2: store <code>{ expires, obs$ }</code>; compare with an injected <code>NOW</code> function.</p>`, `<p>Hint 3: for non-GET, delete keys starting with the path prefix before forwarding; on error remove the entry so failures are not cached.</p>`],
  solution: { approach: `<p>Root <code>HttpCache</code> service holds Observables with expiry. The interceptor serves fresh entries, shares in-flight ones via <code>shareReplay(1)</code>, drops failed entries, and invalidates by prefix on writes.</p>`, code: A(`import { Injectable, InjectionToken, inject } from '@angular/core';
import { HttpContextToken, HttpEvent, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { Observable, filter, shareReplay, tap } from 'rxjs';

export const CACHEABLE = new HttpContextToken<boolean>(() => true);
export const NOW = new InjectionToken<() => number>('NOW', { providedIn: 'root', factory: () => () => Date.now() });
const TTL_MS = 30_000;

@Injectable({ providedIn: 'root' })
export class HttpCache {
  readonly entries = new Map<string, { expires: number; obs$: Observable<HttpEvent<unknown>> }>();
  invalidate(prefix: string): void {
    for (const key of [...this.entries.keys()]) if (key.startsWith(prefix)) this.entries.delete(key);
  }
}

export const cacheInterceptor: HttpInterceptorFn = (req, next) => {
  const cache = inject(HttpCache);
  const now = inject(NOW);
  const path = req.url.split('?')[0];

  if (req.method !== 'GET') {
    cache.invalidate(path);                          // writes invalidate the collection
    return next(req);
  }
  if (!req.context.get(CACHEABLE)) return next(req);

  const key = req.urlWithParams;
  const hit = cache.entries.get(key);
  if (hit && hit.expires > now()) return hit.obs$;  // fresh hit or in-flight share

  const obs$ = next(req).pipe(
    filter(ev => ev instanceof HttpResponse),        // replay only the final response
    tap({ error: () => cache.entries.delete(key) }), // do not cache failures
    shareReplay(1)
  );
  cache.entries.set(key, { expires: now() + TTL_MS, obs$ });
  return obs$;
};`, 'TTL cache with de-dup and invalidation'), complexity: `<p>O(1) per GET; O(n) entries scanned on invalidation.</p>`, followUps: ['How would you bound memory (LRU)?', 'What about responses that vary by Authorization header?'] }
});
/* ============================ QUIZ ============================ */
quiz.push({ q: 'What does <code>@Injectable({ providedIn: \'root\' })</code> give you?', options: ['One lazily created instance for the app, tree-shaken if unused', 'A new instance for every component', 'An instance created eagerly at startup in every lazy module', 'A service that can only be used in templates'], answer: 0, explain: 'The class registers itself in the root environment injector; it is created on first inject() and dropped from the bundle if nothing injects it.' });
quiz.push({ q: 'A component lists <code>providers: [TabState]</code>. Three <code>&lt;app-tab&gt;</code> elements are on screen. How many TabState instances exist (assuming each is injected)?', options: ['1', '3', '0', 'It depends on change detection'], answer: 1, explain: 'Component providers live in each element injector, so each tab element gets its own instance.' });
quiz.push({ q: 'Where does Angular look <b>first</b> when a component calls <code>inject(X)</code>?', options: ['The root environment injector', 'The component\'s own element injector', 'The platform injector', 'The NullInjector'], answer: 1, explain: 'Resolution walks the element injector tree upward first, then the environment injectors (route, root, platform).' });
quiz.push({ q: 'Which call throws NG0203?', options: ['inject(Router) in a field initializer', 'inject(Router) inside a click handler method', 'inject(Router) inside a functional guard', 'inject(Router) inside a useFactory'], answer: 1, explain: 'Event handlers run after construction, outside any injection context.' });
quiz.push({ q: 'Two tokens should return the <b>same</b> instance. Which provider do you use for the second token?', options: ['useClass', 'useValue', 'useExisting', 'multi: true'], answer: 2, explain: 'useExisting is an alias that forwards the lookup to the other token\'s cached instance; useClass would construct a second object.' });
quiz.push({ q: 'Why can\'t a TypeScript <code>interface</code> be used as a DI token?', options: ['Interfaces are erased at compile time, so there is no runtime key', 'Interfaces are too slow', 'Angular forbids generics', 'Interfaces can only be used with useValue'], answer: 0, explain: 'Use an InjectionToken&lt;T&gt; or an abstract class, both exist at runtime.' });
quiz.push({ q: 'Interceptors are registered as <code>withInterceptors([a, b, c])</code>. In what order do they see the <b>response</b>?', options: ['a, b, c', 'c, b, a', 'Random order', 'Only c sees it'], answer: 1, explain: 'Requests go a → b → c → backend; the response unwinds back through c → b → a.' });
quiz.push({ q: 'How do you correctly add a header inside an interceptor?', options: ['req.headers.set(\'X\', \'1\'); return next(req);', 'return next(req.clone({ setHeaders: { X: \'1\' } }));', 'req.headers[\'X\'] = \'1\'; return next(req);', 'return next({ ...req, X: \'1\' });'], answer: 1, explain: 'HttpRequest and HttpHeaders are immutable; clone returns a modified copy which you pass to next.' });
quiz.push({ q: 'A service calls <code>this.http.get(\'/api/x\')</code> but no request appears in the Network tab. Most likely cause?', options: ['Nobody subscribed to the Observable', 'HttpClient batches requests', 'GET requests are cached by default', 'Interceptors block GET'], answer: 0, explain: 'HttpClient observables are cold: the request is sent on subscribe (or via async pipe / toSignal / firstValueFrom).' });
quiz.push({ q: 'In a test, which pair of providers gives a real HttpClient with a fake backend?', options: ['HttpClientModule only', 'provideHttpClient(), provideHttpClientTesting()', 'provideHttpClientTesting(), provideHttpClient()', 'HttpTestingController only'], answer: 1, explain: 'provideHttpClientTesting must come after provideHttpClient so it overrides the backend.' });
quiz.push({ q: 'What does <code>httpMock.verify()</code> check?', options: ['That no unexpected or unflushed requests remain', 'That the server is online', 'That all responses were 200', 'That interceptors ran'], answer: 0, explain: 'verify() fails the test if any request was made that the test did not match and handle.' });
quiz.push({ q: 'Your test provides a fake <code>PanelState</code> in <code>configureTestingModule.providers</code>, but the component still uses the real one. Why?', options: ['The component lists PanelState in its own providers, and its element injector wins', 'TestBed ignores useValue', 'Fakes must be classes', 'You must call compileComponents twice'], answer: 0, explain: 'Element injector providers are found before the test environment injector. Use TestBed.overrideComponent or overrideProvider.' });
quiz.push({ q: 'Which old API corresponds to <code>inject(Parent, { skipSelf: true, optional: true })</code>?', options: ['@SkipSelf() @Optional() parent: Parent', '@Self() @Host() parent: Parent', '@Inject(Parent) parent', '@Host() parent: Parent'], answer: 0, explain: 'Each parameter decorator maps to the same-named inject() option.' });

/* ============================ INTERVIEW ============================ */
interview.push({ q: 'What is dependency injection, and why does Angular use it?', level: 'B', a: `<p>Dependency injection means a class <b>receives</b> the objects it needs instead of constructing them. In Angular, providers register "how to create X" under a token, and injectors create and cache instances and hand them out via <code>inject()</code> or constructor parameters. Benefits: <b>loose coupling</b> (components depend on abstractions, not concrete classes), <b>testability</b> (swap a real <code>HttpClient</code> backend or service for a fake in TestBed with one provider), <b>sharing and scoping</b> (one instance per app, per route or per component, chosen by where you provide it), and <b>configuration</b> (InjectionTokens for URLs, flags, platform objects). It also lets the framework itself be configured through providers (<code>provideRouter</code>, <code>provideHttpClient</code>).</p>`, followUps: ['What is the difference between a token and a provider?', 'What does @Injectable do on its own without providedIn?'] });
interview.push({ q: 'What is the difference between <code>providedIn: \'root\'</code> and listing a service in <code>providers</code>?', level: 'B', a: `<p><code>providedIn: 'root'</code> is declared on the service class itself: the service registers in the root environment injector, is created lazily on first use, and is <b>tree-shakable</b> - if nothing injects it, it is removed from the bundle. Listing it in a <code>providers</code> array (app config, route, or component) registers it in <i>that</i> injector: in the app config it is also a root singleton but not tree-shakable; on a route it is one instance per route environment injector; on a component it is one instance <b>per component instance</b>, destroyed with it. Providing the same class in several places creates several instances, which is the source of many "my state reset" bugs.</p>`, followUps: ['When would you deliberately provide a service at the component level?', 'Why are deprecated options like providedIn: \'any\' discouraged?'] });
interview.push({ q: 'Compare constructor injection and the <code>inject()</code> function.', level: 'I', a: `<p>Both produce the same factory code. Constructor injection (<code>constructor(private http: HttpClient)</code>) relies on parameter types and decorators like <code>@Optional</code>, <code>@Inject(TOKEN)</code>. <code>inject(HttpClient)</code> is a function call usable in field initializers, constructors and any DI-driven function. Advantages of <code>inject()</code>: works in functional guards, resolvers and interceptors (which have no constructor); subclasses do not have to forward dependencies to <code>super()</code>; options are a typed object (<code>{ optional, self, skipSelf, host }</code>); type inference from tokens; reusable <code>injectX()</code> helpers. The constraint: it must run synchronously in an <b>injection context</b>, otherwise NG0203. Angular recommends <code>inject()</code> and provides a migration schematic; constructor injection still works.</p>`, followUps: ['What exactly is an injection context?', 'How would you call inject() later, for example in a click handler?'] });
interview.push({ q: 'Explain the injector hierarchy: element injectors vs environment injectors.', level: 'I', a: `<p>Angular has two hierarchies. <b>Element injectors</b> belong to elements that host components or directives and are configured by <code>providers</code>/<code>viewProviders</code> in their decorators; they mirror the DOM/component tree and live as long as the element. <b>Environment injectors</b> are configured by <code>providedIn: 'root'</code>, the <code>bootstrapApplication</code>/app config providers and route <code>providers</code>; the chain is route injector(s) → root → platform → NullInjector. When a component injects a token, Angular walks up the element injectors first; if none provides it, it switches to the environment injector associated with the component (e.g. its lazy route's) and walks up that chain. First match wins and caches the instance there; reaching the NullInjector throws <code>NullInjectorError</code>. Modifiers <code>self</code>, <code>skipSelf</code>, <code>host</code> and <code>optional</code> adjust the walk.</p>`, followUps: ['How does content projection affect what a projected component can inject?', 'How do you inspect the injector tree at runtime?'] });
interview.push({ q: 'Describe <code>useClass</code>, <code>useValue</code>, <code>useFactory</code> and <code>useExisting</code> with a use case for each.', level: 'I', a: `<p><b>useClass</b>: construct this class for the token - e.g. <code>{ provide: Logger, useClass: RemoteLogger }</code> to swap implementations or provide a mock class in tests. <b>useValue</b>: return a ready object - configuration (<code>{ provide: APP_CONFIG, useValue: {...} }</code>), constants, simple fakes. <b>useFactory</b>: run a function in an injection context and return its result - choose an implementation at runtime (<code>isPlatformBrowser(inject(PLATFORM_ID)) ? localStorage : memory</code>), or build an object from other tokens; old style used a <code>deps</code> array. <b>useExisting</b>: alias one token to another so both resolve to the <b>same instance</b> - renaming services, exposing a component as <code>NG_VALUE_ACCESSOR</code>. Plus <code>multi: true</code> to collect many providers into an array (plugins, interceptors, validators). Each non-alias recipe is cached per injector.</p>`, followUps: ['What goes wrong if you use useClass where useExisting was needed?', 'How often does a useFactory run?'] });
interview.push({ q: 'What is an <code>InjectionToken</code> and when do you need one?', level: 'I', a: `<p>An <code>InjectionToken&lt;T&gt;</code> is a unique runtime object used as a DI key for values that have no class: strings, numbers, config objects, functions, browser globals, interface-typed implementations. It is unique by identity (two tokens with the same description do not collide, unlike string keys) and carries the type <code>T</code> so <code>inject(TOKEN)</code> is typed. It can have a default with <code>{ providedIn: 'root', factory: () =&gt; ... }</code>, which is tree-shakable and overridable with a provider. Typical uses: <code>API_URL</code>, feature flags, <code>WINDOW</code> for SSR-safe/testable globals, multi-token plugin lists. Angular's own tokens include <code>DOCUMENT</code>, <code>PLATFORM_ID</code>, <code>LOCALE_ID</code>, <code>HTTP_INTERCEPTORS</code> and <code>NG_VALUE_ACCESSOR</code>. In constructor style you need <code>@Inject(TOKEN)</code>.</p>`, followUps: ['How would you build a library provideX(config) function?', 'Why not just import a constant?'] });
interview.push({ q: 'How do functional HTTP interceptors work, and how do they differ from class-based ones?', level: 'I', a: `<p>A functional interceptor is <code>(req, next) =&gt; Observable&lt;HttpEvent&gt;</code> typed as <code>HttpInterceptorFn</code>, registered with <code>provideHttpClient(withInterceptors([a, b]))</code>. It runs in an injection context so <code>inject()</code> works at its top. It can transform the request (<code>req.clone</code>, because requests are immutable), short-circuit with its own response, and operate on the response stream with RxJS (<code>catchError</code>, <code>retry</code>, <code>finalize</code>). Order is explicit: requests flow in array order, responses in reverse. Class-based interceptors implement <code>HttpInterceptor.intercept(req, next: HttpHandler)</code> and are registered with <code>{ provide: HTTP_INTERCEPTORS, useClass, multi: true }</code>; in standalone apps they need <code>withInterceptorsFromDi()</code>, and their order depends on provider registration order, which is harder to reason about. Functional ones are recommended.</p>`, followUps: ['How do you pass per-request options to an interceptor?', 'Why can\'t you inject() inside catchError?'] });
interview.push({ q: 'How would you implement a global HTTP error handler that redirects to login on 401 and shows a toast on 5xx?', level: 'I', a: `<p>Write an <code>HttpInterceptorFn</code> that injects <code>Router</code> and a <code>ToastService</code> at the top, then pipes <code>next(req)</code> through <code>catchError((err: HttpErrorResponse) =&gt; ...)</code>. On <code>401</code> navigate to <code>/login</code> (optionally with a <code>returnUrl</code>), on <code>status &gt;= 500</code> or <code>0</code> (network) show a toast, then <b>re-throw</b> with <code>throwError(() =&gt; err)</code> so callers can still handle it (swallowing errors with <code>EMPTY</code> leaves components waiting forever). Skip auth endpoints to avoid loops, allow opt-outs via <code>HttpContextToken</code> for calls that handle their own errors, and register it last-but-near-the-backend or first depending on whether other interceptors (retry) should run before it. Uncaught non-HTTP errors go to a custom <code>ErrorHandler</code> provider.</p>`, followUps: ['Where should retry sit relative to the error interceptor?', 'How would you unit test it?'] });
interview.push({ q: 'How do you test a service that uses HttpClient?', level: 'I', a: `<p>Configure TestBed with <code>provideHttpClient()</code> followed by <code>provideHttpClientTesting()</code> (replaces the backend), inject the service and <code>HttpTestingController</code>. Subscribe to the method under test, then <code>httpMock.expectOne(urlOrPredicate)</code> to assert exactly one matching request and inspect <code>req.request.method</code>, headers and body. Answer with <code>req.flush(body)</code> or <code>req.flush(msg, { status: 500, statusText })</code> (or <code>req.error(new ProgressEvent('error'))</code> for network errors) and assert on what the subscriber received. Call <code>httpMock.verify()</code> in <code>afterEach</code> to catch unexpected requests. Provide fakes for tokens like the API base URL with <code>useValue</code>. Older code used <code>HttpClientTestingModule</code>, now deprecated.</p>`, followUps: ['How do you test a request that is sent only after another responds?', 'How would you test an interceptor?'] });
interview.push({ q: 'What is the injection context, and how do you fix "NG0203: inject() must be called from an injection context"?', level: 'A', a: `<p>Angular keeps a "current injector" pointer set only while it constructs DI-managed classes (field initializers, constructor), runs provider factories, functional guards/resolvers, interceptors, initializers, or inside <code>runInInjectionContext</code>. <code>inject()</code> reads that pointer synchronously. NG0203 means it ran elsewhere: lifecycle hooks (<code>ngOnInit</code>), event handlers, timers, subscriptions, or after an <code>await</code>. Fixes: move the <code>inject()</code> to a field and use the stored reference later; for helpers like <code>takeUntilDestroyed</code>, <code>toSignal</code>, <code>effect</code> pass the dependency explicitly (<code>takeUntilDestroyed(this.destroyRef)</code>, <code>effect(fn, { injector })</code>); or capture <code>Injector</code> and wrap the late call in <code>runInInjectionContext(injector, () =&gt; ...)</code>. In tests use <code>TestBed.runInInjectionContext</code>. Library helpers can call <code>assertInInjectionContext</code> to fail fast.</p>`, followUps: ['Why is inject() after await a problem but before it fine?', 'How do signals APIs depend on this?'] });
interview.push({ q: 'Explain <code>providers</code> vs <code>viewProviders</code> and the <code>@Host</code> / <code>host</code> modifier.', level: 'A', a: `<p><code>providers</code> on a component are visible to its view (template children) <b>and</b> to content projected into it with <code>&lt;ng-content&gt;</code>. <code>viewProviders</code> are visible only to the component's own view; projected content cannot inject them - useful to keep an internal service private while still letting users project arbitrary content. The <code>host</code> option (<code>@Host()</code>) limits resolution to stop at the host element of the current template - typically used by directives that require a provider from the component they decorate (for example form directives finding a parent <code>ControlContainer</code>) without accidentally picking one from further up. Combined with <code>optional</code>, it gives a clean "only if my host provides it" lookup.</p>`, followUps: ['Show a case where viewProviders prevents a bug.', 'How do Angular forms use these modifiers?'] });
interview.push({ q: 'How would you implement a token refresh flow with interceptors so concurrent 401s trigger only one refresh?', level: 'A', a: `<p>Keep the refresh logic in a root <code>AuthService</code> that owns a single in-flight refresh Observable: <code>refresh$ ??= http.post('/auth/refresh').pipe(map(r =&gt; r.token), tap(store), finalize(() =&gt; refresh$ = null), shareReplay(1))</code>. The interceptor bypasses auth endpoints (so the refresh call cannot loop), attaches the current token, and on a 401 returns <code>auth.refresh().pipe(switchMap(t =&gt; next(req.clone({ setHeaders: { Authorization: 'Bearer ' + t } }))))</code>. All concurrent failures subscribe to the same shared refresh, so only one network call happens. If refresh fails, log out, clear state and re-throw. Retry each request at most once (mark it with an <code>HttpContextToken</code>) to avoid infinite loops if the server keeps returning 401. Prefer httpOnly refresh cookies over storing refresh tokens in JS-accessible storage.</p>`, followUps: ['How does this change with cookie-based sessions?', 'How would you test the concurrency behaviour?'] });
interview.push({ q: 'Design DI for a multi-tenant Angular app where each tenant has different API URLs, feature flags and theming, loaded at startup.', level: 'E', a: `<p>Define typed tokens: <code>TENANT_CONFIG: InjectionToken&lt;TenantConfig&gt;</code>, with derived tokens or services (<code>API_BASE</code>, <code>FEATURES</code>) built by factories from it, so consumers inject narrow dependencies. Load config before the app renders with <code>provideAppInitializer(() =&gt; inject(ConfigLoader).load())</code> (older: <code>APP_INITIALIZER</code>), or fetch it in <code>main.ts</code> and pass it into <code>bootstrapApplication(App, { providers: [{ provide: TENANT_CONFIG, useValue: cfg }] })</code> - the latter keeps config synchronous and avoids "config not loaded yet" states. An interceptor prepends <code>API_BASE</code> and adds the tenant header. Feature-specific services are provided on lazy routes guarded by <code>canMatch</code> using flags, so disabled features are never downloaded. Theme via CSS variables set by a service from the config. For tests, every token is overridable with <code>useValue</code>; for SSR, resolve tenant from the request and use the transfer cache. Avoid a god-config service injected everywhere.</p>`, followUps: ['What are the trade-offs between APP_INITIALIZER and pre-bootstrap fetching?', 'How would you switch tenants without a reload?'] });
interview.push({ q: 'How does Angular DI compare with React Context and with a plain module singleton?', level: 'E', a: `<p>A module singleton (<code>export const store = new Store()</code>) is simple but cannot be scoped or replaced without module mocking, and is shared across SSR requests - a data-leak risk. React Context provides values down the component tree like Angular element injectors, but has no built-in factories, lazy instantiation, environment-level scopes or resolution modifiers, and consumers re-render when the value changes; teams add libraries for DI-like behaviour. Angular DI is a full container: tokens, recipes (class/value/factory/alias/multi), two hierarchies (element and environment), lazy cached instances, tree-shakable providers, and first-class test overrides. The cost is concepts and indirection: debugging "which instance am I getting?" requires understanding the hierarchy. In interviews, emphasise scoping, testability and SSR-safety as the deciding factors.</p>`, followUps: ['How would you recreate Angular-style scoped services in React?', 'Why are module singletons dangerous with SSR?'] });
registerModule({
  id: 'fe18',
  title: 'Angular Services & Dependency Injection',
  intro: `<p>Dependency Injection is the backbone of every Angular app and a favourite interview topic: "why is my service a singleton?", "why do I get NullInjectorError?", "what is the difference between useClass and useExisting?", "how do interceptors work?". This module explains DI like a hotel front desk: components <b>ask</b> for what they need, <b>providers</b> are recipe cards, and <b>injectors</b> are a two-level hierarchy (element tree, then environment chain) that builds and caches instances.</p>
    <p>You will learn services with <code>@Injectable</code> and <code>providedIn: 'root'</code>, the modern <code>inject()</code> function and the injection context (plus classic constructor injection), the injector tree, all provider recipes (<code>useClass</code>, <code>useValue</code>, <code>useFactory</code>, <code>useExisting</code>, <code>multi</code>), <code>InjectionToken</code>, <code>HttpClient</code> with functional interceptors (and legacy <code>HTTP_INTERCEPTORS</code>), and testing with TestBed and <code>HttpTestingController</code>. Code targets Angular 17-20 (standalone, signals, <code>provideHttpClient(withInterceptors(...))</code>); runnable plain-JS models show what the framework does under the hood.</p>`,
  goals: [
    'Write services with <code>@Injectable</code>, choose between <code>providedIn: \'root\'</code>, route and component providers, and predict how many instances exist',
    'Use <code>inject()</code> correctly, explain the injection context and fix NG0203 in one move; map it to constructor injection and parameter decorators',
    'Draw the element and environment injector lookup path and use <code>self</code>, <code>skipSelf</code>, <code>host</code>, <code>optional</code>',
    'Pick the right provider recipe (<code>useClass</code>, <code>useValue</code>, <code>useFactory</code>, <code>useExisting</code>, <code>multi</code>) from a requirement',
    'Create typed <code>InjectionToken</code>s with defaults for config, globals and plugin lists',
    'Build functional HTTP interceptors for auth, loading, retry, caching and token refresh',
    'Test services, components, interceptors and guards with TestBed fakes and <code>HttpTestingController</code>'
  ],
  prereqs: `<b>Angular Fundamentals</b> (standalone components, templates, signals, routing basics), plus TypeScript classes and generics and RxJS Observables basics from the JavaScript &amp; TypeScript track. Familiarity with HTTP and fetch from Browser APIs helps for the interceptor topic.`,
  hours: 12,
  topics: topics,
  practice: practice,
  quiz: quiz,
  interview: interview
});
})();
