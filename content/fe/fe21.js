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
    var items = String(input === undefined || input === null ? '' : input).split(/[\s,]+/).filter(Boolean);
    if (!items.length) throw new Error(hint);
    if (items.length > max) throw new Error('Use at most ' + max + ' items. ' + hint);
    return items;
  }

  /* =====================================================================
     TOPIC 1 — Test runners, TestBed, services, pipes and directives
     ===================================================================== */
  topics.push({
    title: 'Test Runners & TestBed: Testing Services, Pipes and Directives',
    analogy: `<p>Think of a <b>car-parts test bench</b> in a garage. You do not test a new brake pad by driving the whole car down a mountain. You clamp the pad onto a bench, connect a <b>fake wheel</b> and a <b>fake pedal</b>, press, and measure. Angular's <b>TestBed</b> is that bench: a tiny, throw-away Angular app built for one test, where you plug in fake parts (mock services) instead of the real database or server. The <b>test runner</b> (Jasmine+Karma, Jest or Vitest) is the mechanic with the clipboard who runs every check and writes down pass or fail.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> A <b>unit test</b> checks one small piece (a service, a pipe, a component) in isolation, fast, with fake neighbours. Angular code relies on dependency injection (DI), so we need a small injector to create things the Angular way. <code>TestBed.configureTestingModule({...})</code> builds that injector; <code>TestBed.inject(Token)</code> gets an instance out of it. A fresh TestBed is created for <b>every</b> test, so tests cannot leak state into each other.</p>
      <p>🔵 <b>Which runner in 2026?</b> The tooling changed a lot between Angular 16 and 21:</p>
      ${H.table(['Runner', 'Status', 'Notes'], [
        ['Jasmine + <b>Karma</b>', 'Default for years; <b>Karma is deprecated</b> (announced 2023, no new features)', 'Runs tests in a real browser. Still works in v17–20 projects; plan to migrate'],
        ['<b>Jest</b> (experimental builder <code>@angular-devkit/build-angular:jest</code>, v16+)', 'Experimental; the Angular team deprecated it in v20 in favour of Vitest', 'Many teams use the community <code>jest-preset-angular</code> instead; runs in Node + jsdom'],
        ['Web Test Runner (experimental, v17)', 'Deprecated in v20', 'Real browser, Jasmine API'],
        ['<b>Vitest</b> (<code>@angular/build:unit-test</code>)', 'Experimental in v20, <b>default for new projects in v21</b>', 'Fast, ESM native, jsdom/happy-dom or browser mode; <code>vi.fn()</code> mocks'],
      ])}
      <p>The good news: <b>TestBed, ComponentFixture, HttpTestingController, harnesses and RouterTestingHarness are the same in every runner</b>. Only the mock syntax differs: Jasmine <code>jasmine.createSpyObj('Api', ['get'])</code> and <code>spyOn(obj, 'm').and.returnValue(x)</code>; Jest <code>jest.fn().mockReturnValue(x)</code>; Vitest <code>vi.fn().mockReturnValue(x)</code>.</p>
      <p>🔵 <b>Three levels of isolation:</b></p>
      ${H.table(['What', 'How to test', 'Why'], [
        ['Pure function / pure pipe', '<code>new TruncatePipe().transform(\'hello\', 3)</code> — no TestBed at all', 'Fastest; nothing Angular-specific inside'],
        ['Service with <code>inject()</code> deps', '<code>TestBed.configureTestingModule({ providers: [{ provide: Api, useValue: fakeApi }] })</code> then <code>TestBed.inject(CartService)</code>', '<code>inject()</code> only works inside an injection context, so <code>new CartService()</code> throws'],
        ['Directive / component', 'Declare a small <b>host component</b> in the test that uses the directive, create a fixture, inspect the DOM', 'Directives only make sense attached to elements'],
      ])}
      <p>🔵 <b>Fakes vs mocks vs spies.</b> A <b>stub/fake</b> is a simple stand-in object with canned answers. A <b>spy</b> records how it was called so you can assert <code>toHaveBeenCalledWith(...)</code>. Prefer fakes for <i>what comes back</i> and spies for <i>did we call the side effect</i>. For functions that use <code>inject()</code> (functional guards, interceptors, factories) call them inside <code>TestBed.runInInjectionContext(() =&gt; fn())</code>.</p>`,
    clues: [
      '"How would you unit test a service that depends on HttpClient and a Logger?" → TestBed with <code>providers</code> overriding deps (<code>useValue</code> fakes), then <code>TestBed.inject</code>',
      '"Karma is deprecated, what should we move to?" → Vitest (<code>@angular/build:unit-test</code>, default in v21) or Jest via jest-preset-angular; TestBed code stays the same',
      '"Test a pure pipe" → instantiate it directly and call <code>transform</code>; no TestBed needed',
      '"Test an attribute directive" → a tiny host component in the spec that uses the directive',
      '"<code>inject() must be called from an injection context</code> in my test" → use <code>TestBed.inject</code> or <code>TestBed.runInInjectionContext</code>',
      '"Tests pass alone but fail together" → shared mutable state (module-level variables, a real singleton, un-reset timers); TestBed resets per test, your globals do not'
    ],
    code: [
      { lang: 'ts', title: 'cart.service.spec.ts — service with faked dependencies (Jasmine syntax; Vitest/Jest notes inline)', code: `import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CartService } from './cart.service';
import { PriceApi } from './price.api';
import { Logger } from './logger';

describe('CartService', () => {
  let service: CartService;
  // A spy object: every listed method is a spy we can program and inspect.
  // Vitest: const api = { getPrice: vi.fn() }; Jest: { getPrice: jest.fn() }
  let api: jasmine.SpyObj<PriceApi>;
  const logger = { warn: jasmine.createSpy('warn') };

  beforeEach(() => {
    api = jasmine.createSpyObj<PriceApi>('PriceApi', ['getPrice']);
    TestBed.configureTestingModule({
      providers: [
        CartService,                              // the real thing under test
        { provide: PriceApi, useValue: api },     // fake neighbour
        { provide: Logger, useValue: logger },
      ],
    });
    service = TestBed.inject(CartService);        // created inside the test injector
  });

  it('adds up prices returned by the API', () => {
    api.getPrice.and.returnValue(of(10));          // Vitest: api.getPrice.mockReturnValue(of(10))
    service.add('apple');
    service.add('pear');
    expect(service.total()).toBe(20);              // total is a computed signal
    expect(api.getPrice).toHaveBeenCalledWith('pear');
  });

  it('warns instead of throwing on an empty id', () => {
    service.add('');
    expect(logger.warn).toHaveBeenCalled();
    expect(service.total()).toBe(0);
  });
});` },
      { lang: 'ts', title: 'highlight.directive.spec.ts — directive tested through a host component', code: `import { Component, Directive, ElementRef, HostListener, inject, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

@Directive({ selector: '[appHighlight]', standalone: true })
export class HighlightDirective {
  color = input('yellow', { alias: 'appHighlight' });
  private el = inject(ElementRef);
  @HostListener('mouseenter') on() { this.el.nativeElement.style.backgroundColor = this.color(); }
  @HostListener('mouseleave') off() { this.el.nativeElement.style.backgroundColor = ''; }
}

// The host exists only for this spec: it is the "fake wheel" for the directive.
@Component({
  standalone: true,
  imports: [HighlightDirective],
  template: '<p appHighlight="pink">hover me</p><p>plain</p>',
})
class HostComponent {}

describe('HighlightDirective', () => {
  it('paints the background on mouseenter and clears it on mouseleave', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const p = fixture.debugElement.query(By.directive(HighlightDirective));
    p.triggerEventHandler('mouseenter');
    expect(p.nativeElement.style.backgroundColor).toBe('pink');
    p.triggerEventHandler('mouseleave');
    expect(p.nativeElement.style.backgroundColor).toBe('');
    // Only one element carries the directive:
    expect(fixture.debugElement.queryAll(By.directive(HighlightDirective)).length).toBe(1);
  });
});` }
    ],
    viz: {
      title: 'Inside TestBed: build a throw-away injector, swap in fakes, inject, reset',
      input: 'PriceApi:fake Logger:fake Clock:real',
      inputLabel: 'Dependencies of CartService as Name:fake or Name:real (max 5)',
      gen: function (input) {
        var deps = words(input, 5, 'Format: PriceApi:fake Logger:real').map(function (w) {
          var p = w.split(':');
          if (p.length !== 2 || !/^(fake|real)$/.test(p[1]) || !p[0]) throw new Error('Each item must be Name:fake or Name:real, e.g. PriceApi:fake');
          return { name: p[0], fake: p[1] === 'fake' };
        });
        var frames = [], entries = [];
        frames.push({ narr: '<code>beforeEach</code> starts. TestBed creates a brand-new, empty <b>test injector</b>. Nothing from the previous test survives.', parts: [{ type: 'map', label: 'test injector providers', entries: [['(empty)', '-']] }] });
        entries.push(['CartService', 'real class (under test)']);
        frames.push({ narr: '<code>configureTestingModule({ providers: [CartService, ...] })</code> registers the class we want to test. We always use the <b>real</b> thing here, otherwise we would be testing a fake.', parts: [{ type: 'map', label: 'test injector providers', entries: entries.slice(), hl: { CartService: 'ok' } }] });
        deps.forEach(function (d) {
          entries.push([d.name, d.fake ? '{ useValue: fake' + d.name + ' }' : d.name + ' (real)']);
          var hl = {}; hl[d.name] = d.fake ? 'sel' : 'cur';
          frames.push({ narr: d.fake ? '<code>{ provide: ' + H.esc(d.name) + ', useValue: fake }</code>: when anyone asks for <b>' + H.esc(d.name) + '</b>, the injector hands out our fake (canned answers, spies). No network, no randomness.' : '<b>' + H.esc(d.name) + '</b> stays real. That is fine when it is cheap and deterministic (a formatter, a pure helper). If it touches time, network or storage, fake it.', parts: [{ type: 'map', label: 'test injector providers', entries: entries.slice(), hl: hl }] });
        });
        var hl2 = { CartService: 'ok' };
        deps.forEach(function (d) { hl2[d.name] = d.fake ? 'sel' : 'done'; });
        frames.push({ narr: '<code>TestBed.inject(CartService)</code>: the injector creates CartService. Its field initializers call <code>inject(...)</code> for each dependency and receive the fakes we registered. This is why <code>new CartService()</code> alone would throw: <code>inject()</code> needs an injection context.', parts: [{ type: 'map', label: 'test injector providers', entries: entries.slice(), hl: hl2 }, { type: 'graph', directed: true, height: 50, nodes: [{ id: 't', label: 'TestBed', x: 10, y: 25, shape: 'box' }, { id: 'c', label: 'CartService', x: 45, y: 25, shape: 'box' }].concat(deps.map(function (d, i) { return { id: 'd' + i, label: d.name + (d.fake ? ' (fake)' : ''), x: 85, y: 8 + i * (34 / Math.max(1, deps.length - 1 || 1)), shape: 'box' }; })), edges: [['t', 'c']].concat(deps.map(function (d, i) { return ['c', 'd' + i]; })), hl: { c: 'ok' } }] });
        frames.push({ narr: 'The <code>it(...)</code> body runs: call methods (Act) and check results or spy calls (Assert). Arrange → Act → Assert keeps tests readable.', parts: [{ type: 'code', lang: 'ts', code: "api.getPrice.and.returnValue(of(10)); // arrange\nservice.add('apple');                // act\nexpect(service.total()).toBe(10);     // assert", hl: { 1: 'cur', 2: 'cur', 3: 'ok' } }] });
        frames.push({ narr: 'After the test, Angular <b>tears down</b> the test module (destroying components and calling <code>ngOnDestroy</code>/<code>DestroyRef</code> callbacks; teardown is on by default since v13). The next test starts with a clean bench.', parts: [{ type: 'map', label: 'test injector providers', entries: [['(reset)', 'next test gets a fresh injector']] }] });
        return pad4(frames);
      }
    },
    examples: [
      { title: 'Pure pipe: no TestBed, just a class', html: `<p>A pure pipe is a function wearing a class. Test it like one: fastest possible test, and you can loop over a table of cases.</p>`,
        code: { lang: 'ts', code: `import { TruncatePipe } from './truncate.pipe';

describe('TruncatePipe', () => {
  const pipe = new TruncatePipe();
  const cases: Array<[string, number, string]> = [
    ['hello world', 5, 'hello…'],
    ['hi', 5, 'hi'],          // shorter than limit: unchanged
    ['', 3, ''],              // empty input
  ];
  for (const [input, limit, expected] of cases) {
    it('truncates "' + input + '" to ' + limit, () => {
      expect(pipe.transform(input, limit)).toBe(expected);
    });
  }
});` } },
      { title: 'A pipe that injects something needs an injection context', html: `<p>If the pipe uses <code>inject(LOCALE_ID)</code>, <code>new</code> throws. Create it inside <code>TestBed.runInInjectionContext</code> and provide the token.</p>`,
        code: { lang: 'ts', code: `import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PricePipe } from './price.pipe';

it('formats with the injected locale', () => {
  TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'de-DE' }] });
  const pipe = TestBed.runInInjectionContext(() => new PricePipe());
  // German formatting uses a comma for decimals
  expect(pipe.transform(1234.5, 'EUR')).toContain('1.234,50');
});` } },
      { title: 'Same test, three runners', html: `<p>Only the spy line changes when you migrate from Karma/Jasmine to Vitest or Jest. That is why migrations are usually mechanical (codemods exist for <code>jasmine.createSpyObj</code> → <code>vi.fn</code>).</p>${H.table(['Runner', 'Create a spy returning a value', 'Assert'], [['Jasmine', '<code>jasmine.createSpy().and.returnValue(of(1))</code>', '<code>toHaveBeenCalledWith(x)</code>'], ['Jest', '<code>jest.fn().mockReturnValue(of(1))</code>', '<code>toHaveBeenCalledWith(x)</code>'], ['Vitest', '<code>vi.fn().mockReturnValue(of(1))</code>', '<code>toHaveBeenCalledWith(x)</code>']])}` }
    ],
    deepDive: `<p>🟣 <b>Why Karma faded.</b> Karma launches a real browser, bundles all specs with webpack and talks to it over a socket. That is slow to start and hard to debug in CI. Jest and Vitest run in Node with a fake DOM (jsdom / happy-dom), start fast, and support watch mode with smart re-runs. The trade-off: jsdom is not a real browser (no layout, no real CSS, no <code>IntersectionObserver</code> without a polyfill). Vitest's <b>browser mode</b> (Playwright provider) restores a real browser when you need it.</p>
      <p>🟣 <b>TestBed internals.</b> <code>configureTestingModule</code> just records config. The first call to <code>inject</code> or <code>createComponent</code> <b>compiles</b> the testing module; after that, <code>overrideProvider</code>/<code>overrideComponent</code> throw ("Cannot override provider when the test module has already been instantiated"). Standalone components with their own <code>providers</code> create an element injector, so overriding a root provider may not reach them: use <code>TestBed.overrideComponent(Cmp, { set: { providers: [...] } })</code>. The <code>teardown: { destroyAfterEach: true }</code> default (v13+) removes fixture DOM after each test and catches leaks.</p>
      <p>🟣 <b>Do not over-mock.</b> Mocking everything makes tests that pass while the app is broken ("mock drift"). Fake the <b>boundaries</b> (HTTP, time, storage, randomness, browser APIs) and keep pure collaborators real. A test that mirrors the implementation line by line breaks on every refactor and proves nothing.</p>`,
    aiEra: `<p>🤖 AI assistants are very good at writing spec boilerplate: <code>describe</code> blocks, TestBed setup, spy objects. They are also the main source of <b>stale patterns</b>: <code>async()</code> (removed, now <code>waitForAsync</code>), <code>TestBed.get</code> (removed, now <code>TestBed.inject</code>), <code>HttpClientTestingModule</code> (deprecated, now <code>provideHttpClientTesting()</code>), <code>declarations: [StandaloneCmp]</code> (wrong, standalone goes in <code>imports</code>). Ask for "Angular 19+, standalone, Vitest syntax" and review every mock: an AI will happily mock the very function under test so the test always passes. A good workflow is: you write the test names (the behaviours that matter), the AI fills in the bodies, you mutate the code to check the test actually fails.</p>`,
    problems: [{
      title: 'Build a Tiny Spy (like jasmine.createSpy / vi.fn)',
      level: 'Easy', tags: ['spies', 'mocks', 'unit-test'], companies: ['Infosys', 'Thoughtworks'],
      statement: `<p>Implement <code>createSpy(impl?)</code> that returns a function which records every call. It must expose <code>spy.calls</code> (array of argument arrays), <code>spy.returnValue(v)</code> (makes later calls return <code>v</code>), and <code>spy.calledWith(...args)</code> (true if any call had exactly those arguments, compared with JSON). Without <code>returnValue</code>, call <code>impl</code> if given, else return <code>undefined</code>.</p>`,
      constraints: `Arguments are JSON-serialisable. Up to 1000 calls.`,
      example: `<p><code>s = createSpy(); s(1,2); s.returnValue(9); s('a')</code> returns ${H.c('g', '9')}; <code>s.calls</code> is <code>[[1,2],['a']]</code>; <code>s.calledWith(1,2)</code> is ${H.c('g', 'true')}, <code>s.calledWith(2,1)</code> is ${H.c('r', 'false')} (order matters).</p>`,
      brute: { why: `<p>Recording only a counter answers "was it called?" but not "with what?". Most real bugs are wrong arguments (wrong id, wrong page), so a counter-only spy gives false confidence.</p>`,
        code: { lang: 'js', run: true, code: `function countSpy() { const f = () => { f.count++; }; f.count = 0; return f; }
const s = countSpy(); s('wrong-id');
console.log('called', s.count, 'times, but with what? unknown');` } },
      mcq: { q: 'Why do spies store the argument list of every call instead of only the last one?', options: ['To save memory', 'So a test can assert on any call, its order and the call count', 'Because JavaScript requires it'], answer: 1, explain: 'Assertions like "called twice, the second time with page 2" need the full history.' },
      hints: [
        `<p>Hint 1: a function is an object, so you can attach properties (<code>calls</code>, methods) to it.</p>`,
        `<p>Hint 2: inside the spy, push <code>[...arguments]</code> first, then decide what to return.</p>`,
        `<p>Hint 3: compare argument lists with <code>JSON.stringify</code>; use a flag to know whether <code>returnValue</code> was set (the value itself could be <code>undefined</code> or <code>0</code>).</p>`
      ],
      solution: {
        approach: `<p>Closure over a <code>calls</code> array and a "programmed return" slot. Order: record, then return programmed value, else delegate to <code>impl</code>. This is exactly what <code>jasmine.createSpy().and.returnValue</code> and <code>vi.fn().mockReturnValue</code> do internally (plus many extras).</p>`,
        code: { lang: 'js', run: true, code: `function createSpy(impl) {
  let hasReturn = false, ret;
  const spy = function (...args) {
    spy.calls.push(args);                       // 1) record
    if (hasReturn) return ret;                  // 2) programmed answer
    return impl ? impl.apply(this, args) : undefined; // 3) fall through
  };
  spy.calls = [];
  spy.returnValue = v => { hasReturn = true; ret = v; return spy; };
  spy.calledWith = (...args) => spy.calls.some(c => JSON.stringify(c) === JSON.stringify(args));
  return spy;
}

const s = createSpy((a, b) => a + b);
console.log(s(1, 2));            // 3 (impl)
s.returnValue(9);
console.log(s('a'));             // 9 (programmed)
console.log(JSON.stringify(s.calls), s.calledWith(1, 2), s.calledWith(2, 1));` },
        dry: { head: ['call', 'calls after', 'returns'], rows: [['s(1,2)', '[[1,2]]', '3 (impl)'], ['returnValue(9)', '[[1,2]]', 'spy'], ["s('a')", "[[1,2],['a']]", '9']] },
        complexity: `<p>O(1) per call, O(C·A) for <code>calledWith</code> over C calls.</p>`,
        followUps: ['How would you add <code>callFake</code> or a queue of return values (<code>mockReturnValueOnce</code>)?', 'How would <code>spyOn(obj, "method")</code> replace and later restore a method?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 2 — Component tests with ComponentFixture
     ===================================================================== */
  topics.push({
    title: 'Component Tests: ComponentFixture, Inputs, Outputs, DOM & Change Detection',
    analogy: `<p>Testing a component is like testing a <b>vending machine</b> in the factory. You do not open it up and poke the circuit board. You do what a customer does: put in a coin (set an input), press a button (click), and look at what comes out of the slot (the DOM and emitted outputs). One quirk: this factory machine only refreshes its little display when someone <b>presses the refresh switch</b> — that switch is <code>fixture.detectChanges()</code>. Forget it and you read yesterday's display.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> <code>TestBed.createComponent(MyCmp)</code> returns a <b>ComponentFixture</b>: a handle holding the component instance, its host DOM element and a change-detection trigger. You test like a user: set inputs, trigger events, then read the DOM.</p>
      ${H.table(['Fixture API', 'What it gives you'], [
        ['<code>fixture.componentInstance</code>', 'The class instance (avoid poking private state; prefer the DOM)'],
        ['<code>fixture.nativeElement</code>', 'The host DOM element: <code>querySelector</code>, <code>textContent</code>, <code>click()</code>'],
        ['<code>fixture.debugElement</code>', 'Angular wrapper: <code>query(By.css(\'button\'))</code>, <code>By.directive(X)</code>, <code>triggerEventHandler</code>, <code>injector</code>'],
        ['<code>fixture.componentRef.setInput(\'name\', v)</code>', 'Set an input <b>the way a parent would</b> (works for <code>@Input</code> and signal <code>input()</code>, marks OnPush dirty)'],
        ['<code>fixture.detectChanges()</code>', 'Run change detection now (first call also runs <code>ngOnInit</code>)'],
        ['<code>await fixture.whenStable()</code>', 'Wait for pending async work Angular knows about (zone tasks / pending tasks)'],
        ['<code>fixture.autoDetectChanges()</code>', 'Run CD automatically after async events, like the real app'],
      ])}
      <p>🔵 <b>The three classic mistakes.</b></p>
      <ol>
        <li><b>Forgot <code>detectChanges()</code></b>: the template still shows the old value. In a zone.js test nothing runs CD for you unless you call it or enable autoDetect.</li>
        <li><b>Assigned an input directly</b> (<code>cmp.name = 'x'</code>): with <code>OnPush</code> the view is not marked dirty, so <code>detectChanges()</code> skips it, and signal inputs cannot be assigned at all (they are read-only). Use <code>setInput</code>.</li>
        <li><b>Tested private internals</b>: asserting <code>cmp.items.length</code> instead of "three rows are visible". Implementation tests break on refactor; DOM tests break only when behaviour breaks.</li>
      </ol>
      <p>🔵 <b>Outputs.</b> Subscribe to the output in the test: <code>cmp.saved.subscribe(spy)</code> works for both <code>@Output() EventEmitter</code> and the new <code>output()</code> function (it returns an <code>OutputEmitterRef</code> with <code>subscribe</code>). Or wrap the component in a host component and bind <code>(saved)="onSaved($event)"</code>, which also tests the binding name.</p>
      <p>🔵 <b>Zoneless (stable in v20, default for new apps in v21).</b> Add <code>provideZonelessChangeDetection()</code> to the test providers (in v18–19 it was <code>provideExperimentalZonelessChangeDetection()</code>). Then prefer <code>await fixture.whenStable()</code> over many <code>detectChanges()</code> calls: Angular schedules CD itself when signals change or events fire, and your test waits for it exactly like the real browser would. In zoneless tests, calling <code>detectChanges()</code> on a component that was not marked dirty throws in dev mode (ExpressionChanged checks run), which catches bugs early.</p>`,
    clues: [
      '"The test sets a value but the DOM still shows the old text" → missing <code>fixture.detectChanges()</code> / <code>await whenStable()</code>',
      '"OnPush component does not update in the test" → set inputs with <code>fixture.componentRef.setInput</code>, not by assigning the property',
      '"How do you test an @Output / output()?" → subscribe a spy to it, or use a host component binding',
      '"Signal input cannot be assigned in my spec" → <code>input()</code> is read-only; use <code>setInput</code> or a host component',
      '"Child component is heavy (charts, maps) and slows tests" → replace it with a stub via <code>TestBed.overrideComponent(Parent, { remove: { imports: [Chart] }, add: { imports: [ChartStub] } })</code>',
      '"Moving to zoneless" → <code>provideZonelessChangeDetection()</code> in tests and <code>await fixture.whenStable()</code>'
    ],
    code: [
      { lang: 'ts', title: 'counter.component.spec.ts — inputs, outputs, DOM, OnPush (Vitest syntax)', code: `import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';

@Component({
  selector: 'app-counter',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: \`
    <h2>{{ label() }}</h2>
    <span data-testid="count">{{ count() }}</span>
    <button (click)="inc()" [disabled]="atMax()">+1</button>\`,
})
export class CounterComponent {
  label = input.required<string>();
  max = input(3);
  changed = output<number>();
  count = signal(0);
  atMax = computed(() => this.count() >= this.max());
  inc() { this.count.update(c => c + 1); this.changed.emit(this.count()); }
}

describe('CounterComponent', () => {
  let fixture: ComponentFixture<CounterComponent>;
  let el: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [CounterComponent],                         // standalone: imports, not declarations
      providers: [provideZonelessChangeDetection()],
    });
    fixture = TestBed.createComponent(CounterComponent);
    fixture.componentRef.setInput('label', 'Cups of tea'); // like a parent binding [label]
    await fixture.whenStable();                            // let Angular render
    el = fixture.nativeElement;
  });

  it('renders the label input', () => {
    expect(el.querySelector('h2')!.textContent).toBe('Cups of tea');
  });

  it('increments, emits, and disables at max', async () => {
    const spy = vi.fn();
    fixture.componentInstance.changed.subscribe(spy);      // output() is subscribable
    const btn = el.querySelector('button')!;
    for (let i = 0; i < 3; i++) btn.click();
    await fixture.whenStable();
    expect(el.querySelector('[data-testid="count"]')!.textContent).toBe('3');
    expect(spy).toHaveBeenLastCalledWith(3);
    expect(btn.disabled).toBe(true);
  });

  it('reacts to a new max input', async () => {
    fixture.componentRef.setInput('max', 1);
    el.querySelector('button')!.click();
    await fixture.whenStable();
    expect(el.querySelector('button')!.disabled).toBe(true);
  });
});` }
    ],
    viz: {
      title: 'Fixture timeline: when does the DOM catch up with the component?',
      input: 'create detect click read detect read',
      inputLabel: 'Steps: create, detect, setInput, assign, click, read (max 10)',
      gen: function (input) {
        var steps = words(input, 10, 'Use steps like: create detect click read detect read');
        var frames = [], created = false, state = { count: 0, label: '' }, dom = { count: '(nothing)', label: '(nothing)' }, dirty = false, inited = false;
        function snap(narr, hl) {
          frames.push({ narr: narr, parts: [
            { type: 'vars', label: 'component instance (class state)', vals: { count: state.count, label: JSON.stringify(state.label), 'view dirty?': dirty ? 'yes' : 'no' }, hl: hl || {} },
            { type: 'vars', label: 'DOM (what the test can see)', vals: { 'h2 text': dom.label, 'count text': dom.count } }
          ] });
        }
        steps.forEach(function (s) {
          if (s !== 'create' && !created) throw new Error('Start with "create" before other steps.');
          if (s === 'create') { created = true; state = { count: 0, label: '' }; dom = { count: '(empty)', label: '(empty)' }; dirty = true; inited = false; snap('<code>TestBed.createComponent</code>: the class is constructed, the host element is in the DOM, but the template has <b>not</b> been rendered yet and <code>ngOnInit</code> has not run.', { count: 'cur' }); }
          else if (s === 'detect') { var first = !inited; inited = true; if (dirty) { dom = { count: String(state.count), label: state.label || '(empty)' }; } dirty = false; snap('<code>fixture.detectChanges()</code>' + (first ? ' (first time: runs <code>ngOnInit</code> too)' : '') + ': Angular checks the view and copies current state into the DOM. Now the DOM matches the class.', { 'view dirty?': 'ok' }); }
          else if (s === 'setinput' || s === 'setInput') { state.label = 'Tea'; dirty = true; snap('<code>fixture.componentRef.setInput(\'label\', \'Tea\')</code>: input updated <b>and</b> the OnPush view is marked dirty, exactly like a parent binding. The DOM updates on the next CD.', { label: 'ok', 'view dirty?': 'cur' }); }
          else if (s === 'assign') { state.label = 'Tea'; snap('<code>cmp.label = \'Tea\'</code> (direct assignment, old-style <code>@Input</code>): the field changed but the OnPush view is <b>not</b> marked dirty. The next <code>detectChanges()</code> will skip it. (Signal inputs cannot be assigned at all.)', { label: 'bad' }); }
          else if (s === 'click') { state.count++; dirty = true; snap('<code>button.click()</code>: the <code>(click)</code> handler runs and updates the signal. Event handlers mark the view dirty, but the DOM is <b>not</b> repainted until change detection runs.', { count: 'ok', 'view dirty?': 'cur' }); }
          else if (s === 'read') { var stale = dom.count !== String(state.count) || (dom.label !== (state.label || '(empty)') && dom.label !== '(empty)'); snap(stale ? 'The test reads the DOM: it sees ' + H.c('r', '<b>stale</b>') + ' values (class count = ' + state.count + ', DOM shows ' + H.esc(dom.count) + '). Classic "forgot detectChanges" failure.' : 'The test reads the DOM: it ' + H.c('g', 'matches') + ' the class state. Safe to assert.', {}); }
          else throw new Error('Unknown step "' + s + '". Use create, detect, setInput, assign, click, read.');
        });
        return pad4(frames, 'In zoneless tests, <code>await fixture.whenStable()</code> lets Angular run the scheduled change detection for you.');
      }
    },
    examples: [
      { title: 'Stub a heavy child component', html: `<p>Parent tests should not render a real chart library. Swap the import for a lightweight stub with the same selector and inputs. This is a <b>shallow</b> test of the parent.</p>`,
        code: { lang: 'ts', code: `import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DashboardComponent } from './dashboard.component';
import { SalesChartComponent } from './sales-chart.component';

@Component({ selector: 'app-sales-chart', standalone: true, template: '<div class="chart-stub"></div>' })
class SalesChartStub { data = input<number[]>([]); }

it('passes monthly totals to the chart', async () => {
  TestBed.overrideComponent(DashboardComponent, {
    remove: { imports: [SalesChartComponent] },
    add: { imports: [SalesChartStub] },
  });
  const fixture = TestBed.createComponent(DashboardComponent);
  fixture.detectChanges();
  const stub = fixture.debugElement.query(By.directive(SalesChartStub)).componentInstance as SalesChartStub;
  expect(stub.data().length).toBe(12);
});` } },
      { title: 'Testing an output through a host component', html: `<p>A host component checks the <b>public contract</b>: the output name used in templates. If someone renames <code>changed</code>, this test fails, while a direct <code>subscribe</code> test would be updated by the IDE rename and still pass.</p>`,
        code: { lang: 'ts', code: `import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CounterComponent } from './counter.component';

@Component({
  standalone: true,
  imports: [CounterComponent],
  template: '<app-counter label="x" (changed)="last = $event" />',
})
class HostComponent { last = -1; }

it('emits through the template binding', () => {
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
  expect(fixture.componentInstance.last).toBe(1);
});` } },
      { title: 'Typing into an input', html: `<p>Set <code>value</code>, then dispatch the <code>input</code> event so Angular's value accessor sees it. Forgetting the event is the most common forms-test bug.</p>`,
        code: { lang: 'ts', code: `const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
input.value = 'angular';
input.dispatchEvent(new Event('input'));   // ngModel / formControl listen to 'input'
input.dispatchEvent(new Event('blur'));    // marks the control as touched
fixture.detectChanges();
expect(fixture.nativeElement.querySelector('.hint').textContent).toContain('7 letters');` } }
    ],
    deepDive: `<p>🟣 <b>DebugElement vs nativeElement.</b> <code>nativeElement</code> is the real DOM node: portable to any testing style. <code>DebugElement</code> adds Angular-aware queries (<code>By.directive</code>), access to the element's injector (<code>de.injector.get(Svc)</code> to grab a component-level provider), and <code>triggerEventHandler(name, payload)</code>, which calls the Angular listener directly <b>without</b> a real DOM event (no bubbling, no default action). Prefer real events (<code>click()</code>, <code>dispatchEvent</code>) for behaviour; use <code>triggerEventHandler</code> for custom component outputs.</p>
      <p>🟣 <b>ComponentFixtureAutoDetect.</b> Providing <code>{ provide: ComponentFixtureAutoDetect, useValue: true }</code> makes fixtures run CD after zone tasks, closer to production. With zoneless, the fixture follows the app scheduler, so <code>whenStable()</code> is the main synchronisation point. Angular 18+ also tracks <b>pending tasks</b> (<code>PendingTasks</code>), so <code>whenStable</code> waits for HTTP requests made by <code>HttpClient</code> too.</p>
      <p>🟣 <b>Errors in templates.</b> Since v14-ish, unknown elements and properties in tests produce errors (configurable with <code>errorOnUnknownElements</code> / <code>errorOnUnknownProperties</code>). Keep them on: they catch missing imports that would break the real app. Use <code>NO_ERRORS_SCHEMA</code> only as a last resort; it also hides real typos.</p>
      <p>🟣 <b>Deferrable views.</b> <code>@defer</code> blocks render their placeholder in tests by default (<code>DeferBlockBehavior.Playthrough</code> in recent versions renders when triggers fire). Use <code>fixture.getDeferBlocks()</code> and <code>await block.render(DeferBlockState.Complete)</code> to test each state explicitly.</p>`,
    aiEra: `<p>🤖 Ask an AI to "write tests for this component" and you often get <b>implementation tests</b>: <code>expect(component.items.length).toBe(3)</code>, spies on private methods, or <code>component.ngOnInit()</code> called by hand. They inflate coverage and lock in the current code. Steer it: "test through the DOM only, use setInput, data-testid selectors, no access to private members". AI is genuinely useful for generating edge-case tables (empty, very long, unicode, max) and for converting old <code>declarations</code>-style specs to standalone/zoneless. In interviews, explaining <i>why</i> <code>setInput</code> beats assignment for OnPush shows real understanding, not memorised syntax.</p>`,
    problems: [{
      title: 'Will the Assertion See the New Value?',
      level: 'Medium', tags: ['change-detection', 'fixture', 'OnPush'], companies: ['Google', 'SAP'],
      statement: `<p>Model a fixture for an <b>OnPush</b> component. Write <code>simulate(steps)</code> where steps are <code>'setInput'</code>, <code>'assign'</code>, <code>'click'</code>, <code>'detect'</code>, <code>'read'</code>. Track class state <code>{count, label}</code>, a <code>dirty</code> flag and the rendered DOM. <code>setInput</code> and <code>click</code> change state and mark dirty; <code>assign</code> changes <code>label</code> without marking dirty; <code>detect</code> renders only if dirty (the component is created dirty). Return, for each <code>'read'</code>, whether the DOM is <b>fresh</b> or <b>stale</b>.</p>`,
      constraints: `Up to 100 steps. Initial state <code>{count: 0, label: ''}</code>, initially dirty, DOM not rendered (counts as stale).`,
      example: `<p><code>['detect','click','read','detect','read','assign','detect','read']</code> → ${H.c('r', 'stale')}, ${H.c('g', 'fresh')}, ${H.c('r', 'stale')}. The last read is stale because assignment did not mark the OnPush view dirty, so detect skipped it.</p>`,
      brute: { why: `<p>Assuming "detectChanges always re-renders" (the Default strategy mental model) predicts fresh for the last read and misses the OnPush bug entirely.</p>`,
        code: { lang: 'js', run: true, code: `function naive(steps) { let changed = false; const out = [];
  for (const s of steps) { if (s === 'detect') changed = false; else if (s === 'read') out.push(changed ? 'stale' : 'fresh'); else changed = true; }
  return out; }
console.log(naive(['detect','click','read','detect','read','assign','detect','read'])); // last is wrongly 'fresh'` } },
      mcq: { q: 'An OnPush component\'s <code>@Input</code> is assigned directly in a test, then <code>detectChanges()</code> runs. What renders?', options: ['The new value', 'The old value, because the view was not marked dirty', 'An error is always thrown'], answer: 1, explain: 'OnPush checks a component only when marked dirty (input change through a binding / setInput, event, signal, markForCheck). Direct assignment does none of these.' },
      hints: [
        `<p>Hint 1: keep two copies of the data: what the class holds and what the DOM shows.</p>`,
        `<p>Hint 2: only <code>detect</code> copies class → DOM, and only when <code>dirty</code> is true; afterwards dirty becomes false.</p>`,
        `<p>Hint 3: a read is fresh when DOM equals class state (both fields). Start with the DOM as <code>null</code> so early reads are stale.</p>`
      ],
      solution: {
        approach: `<p>Simulate the two copies plus a dirty bit. This is the exact mental model you need when a component test "does not update": who marks the view dirty, and who runs change detection?</p>`,
        code: { lang: 'js', run: true, code: `function simulate(steps) {
  const state = { count: 0, label: '' };
  let dom = null, dirty = true;
  const out = [];
  for (const s of steps) {
    if (s === 'setInput') { state.label = 'Tea'; dirty = true; }
    else if (s === 'assign') { state.label = 'Coffee'; }            // no markForCheck!
    else if (s === 'click') { state.count++; dirty = true; }
    else if (s === 'detect') { if (dirty) { dom = { ...state }; dirty = false; } }
    else if (s === 'read') {
      const fresh = dom && dom.count === state.count && dom.label === state.label;
      out.push(fresh ? 'fresh' : 'stale');
    }
  }
  return out;
}
console.log(simulate(['detect', 'click', 'read', 'detect', 'read', 'assign', 'detect', 'read']));
console.log(simulate(['read', 'setInput', 'detect', 'read']));` },
        dry: { head: ['step', 'class', 'dirty', 'DOM', 'read'], rows: [['detect', '0,""', 'false', '0,""', ''], ['click', '1,""', 'true', '0,""', ''], ['read', '', '', '', 'stale'], ['detect', '1,""', 'false', '1,""', ''], ['read', '', '', '', 'fresh'], ['assign', '1,"Coffee"', 'false', '1,""', ''], ['detect (skipped)', '', 'false', '1,""', ''], ['read', '', '', '', 'stale']] },
        complexity: `<p>O(n) steps, O(1) memory.</p>`,
        followUps: ['How does a signal read in the template change this model?', 'What would <code>ChangeDetectorRef.markForCheck()</code> add as a step?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 3 — Component harnesses (Angular CDK testing)
     ===================================================================== */
  topics.push({
    title: 'Component Harnesses with the Angular CDK',
    analogy: `<p>A TV <b>remote control</b> lets you change the channel without knowing which chip inside the TV handles it. If the manufacturer redesigns the circuit board next year, your remote still has a "channel up" button that works. A <b>component harness</b> is a remote control for a component: tests press <code>select.open()</code> and <code>select.clickOptions({ text: 'Tea' })</code> instead of digging for <code>div.mat-mdc-select-trigger &gt; span</code>. When the component's markup changes, only the remote (the harness) is updated, not the hundreds of tests that use it.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> A harness is a small class that knows how to <b>find</b> a component in the DOM and how to <b>operate</b> it like a user. Angular Material ships one for every component (<code>MatButtonHarness</code>, <code>MatInputHarness</code>, <code>MatSelectHarness</code>, <code>MatDialogHarness</code>, <code>MatTableHarness</code>...). You can write your own for your components with <code>ComponentHarness</code> from <code>@angular/cdk/testing</code>.</p>
      ${H.table(['Piece', 'What it does'], [
        ['<code>TestbedHarnessEnvironment.loader(fixture)</code>', 'Creates a <code>HarnessLoader</code> scoped to the fixture (unit tests)'],
        ['<code>TestbedHarnessEnvironment.documentRootLoader(fixture)</code>', 'Loader for the whole document: overlays, dialogs, menus rendered outside the component'],
        ['<code>loader.getHarness(MatButtonHarness.with({ text: \'Save\' }))</code>', 'Find exactly one match (throws if none)'],
        ['<code>loader.getAllHarnesses(X)</code> / <code>getHarnessOrNull</code> / <code>hasHarness</code>', 'Many / optional / existence check'],
        ['<code>static hostSelector</code>', 'In your own harness: the CSS selector of the component host'],
        ['<code>this.locatorFor(\'button\')</code>', 'Lazy finder for an element (<code>TestElement</code>) inside the host'],
        ['<code>TestElement</code>', 'Runner-neutral element: <code>click()</code>, <code>sendKeys()</code>, <code>text()</code>, <code>getAttribute()</code>, <code>hasClass()</code>'],
      ])}
      <p>🔵 <b>Why everything is <code>async</code>.</b> Every harness method returns a Promise and <b>automatically runs change detection and waits for stability</b> before and after acting. That removes most <code>detectChanges()</code>/<code>whenStable()</code> noise. It also means the same harness works in different environments: TestBed for unit tests, and (via other environments such as Protractor in the past, or community adapters for Playwright) in browser tests.</p>
      <p>🔵 <b>Filters.</b> <code>MatButtonHarness.with({ text: /save/i })</code> returns a <code>HarnessPredicate</code>. In your own harness you add filters with a static <code>with(options)</code> method building a <code>new HarnessPredicate(MyHarness, options).addOption('label', options.label, (h, l) =&gt; HarnessPredicate.stringMatches(h.getLabel(), l))</code>.</p>
      <p>🔵 <b>When to use them.</b> Always for Material/CDK components (their DOM is private and changes between versions — the MDC migration in v15 broke thousands of CSS-selector tests but not harness tests). For your own components: write harnesses for widely reused UI (design-system components), not for every one-off page.</p>`,
    clues: [
      '"Our tests broke after upgrading Angular Material" → tests depended on internal DOM; use Material harnesses',
      '"How do you test a mat-select / mat-dialog in a unit test?" → <code>MatSelectHarness</code> / <code>MatDialogHarness</code>, dialogs via <code>documentRootLoader</code>',
      '"Design system used by 20 teams; how do consumers test against it?" → ship a harness alongside each component',
      '"Too many detectChanges/whenStable calls in tests" → harness methods auto-run change detection',
      '"Find the Save button among many" → <code>MatButtonHarness.with({ text: \'Save\' })</code> predicate'
    ],
    code: [
      { lang: 'ts', title: 'Using Material harnesses: select a value, click Save, read a dialog', code: `import { TestBed } from '@angular/core/testing';
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatSelectHarness } from '@angular/material/select/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatDialogHarness } from '@angular/material/dialog/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { OrderFormComponent } from './order-form.component';

describe('OrderFormComponent', () => {
  let loader: HarnessLoader;
  let rootLoader: HarnessLoader;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [OrderFormComponent],
      providers: [provideNoopAnimations()],   // no real animations in tests
    });
    const fixture = TestBed.createComponent(OrderFormComponent);
    loader = TestbedHarnessEnvironment.loader(fixture);              // inside the component
    rootLoader = TestbedHarnessEnvironment.documentRootLoader(fixture); // overlays live on <body>
  });

  it('confirms the chosen drink in a dialog', async () => {
    const select = await loader.getHarness(MatSelectHarness.with({ selector: '[formControlName=drink]' }));
    await select.open();
    await select.clickOptions({ text: 'Tea' });
    expect(await select.getValueText()).toBe('Tea');

    const save = await loader.getHarness(MatButtonHarness.with({ text: 'Save' }));
    expect(await save.isDisabled()).toBe(false);
    await save.click();                       // change detection runs automatically

    const dialog = await rootLoader.getHarness(MatDialogHarness);
    expect(await (await dialog.host()).text()).toContain('1 x Tea');
  });
});` },
      { lang: 'ts', title: 'Writing your own harness for a rating component', code: `import { BaseHarnessFilters, ComponentHarness, HarnessPredicate } from '@angular/cdk/testing';

export interface RatingHarnessFilters extends BaseHarnessFilters {
  label?: string | RegExp;
}

export class RatingHarness extends ComponentHarness {
  static hostSelector = 'app-rating';

  // Lazy locators: re-query the DOM every time they are called.
  private stars = this.locatorForAll('button.star');
  private labelEl = this.locatorFor('.label');

  static with(options: RatingHarnessFilters = {}): HarnessPredicate<RatingHarness> {
    return new HarnessPredicate(RatingHarness, options)
      .addOption('label', options.label, (h, label) => HarnessPredicate.stringMatches(h.getLabel(), label));
  }

  async getLabel(): Promise<string> { return (await this.labelEl()).text(); }

  async getValue(): Promise<number> {
    const stars = await this.stars();
    const filled = await Promise.all(stars.map(s => s.hasClass('filled')));
    return filled.filter(Boolean).length;
  }

  async rate(value: number): Promise<void> {
    const stars = await this.stars();
    if (value < 1 || value > stars.length) throw Error('No star ' + value);
    await stars[value - 1].click();
  }
}

// usage in a spec:
// const r = await loader.getHarness(RatingHarness.with({ label: 'Food' }));
// await r.rate(4); expect(await r.getValue()).toBe(4);` }
    ],
    viz: {
      title: 'Harness call → DOM work → automatic change detection',
      input: 'open choose:Tea value click:Save',
      inputLabel: 'Harness actions: open, choose:X, value, click:Label (max 8)',
      gen: function (input) {
        var acts = words(input, 8, 'Try: open choose:Tea value click:Save');
        var frames = [], selected = '(none)', open = false;
        var nodes = [{ id: 't', label: 'spec', x: 8, y: 30, shape: 'box' }, { id: 'h', label: 'harness', x: 35, y: 30, shape: 'box' }, { id: 'e', label: 'TestElement', x: 63, y: 30, shape: 'box' }, { id: 'd', label: 'DOM + CD', x: 90, y: 30, shape: 'box' }];
        var edges = [['t', 'h'], ['h', 'e'], ['e', 'd']];
        function f(narr, hl, ehl, rows) {
          frames.push({ narr: narr, parts: [{ type: 'graph', directed: true, nodes: nodes, edges: edges, hl: hl, ehl: ehl }, { type: 'table', label: 'what actually happens', columns: ['layer', 'work'], rows: rows }] });
        }
        acts.forEach(function (a) {
          var p = a.split(':'), cmd = p[0], arg = p.slice(1).join(':');
          if (cmd === 'open') {
            open = true;
            f('<code>await select.open()</code>. The spec says <i>what</i> it wants. It does not know the trigger is a <code>div.mat-mdc-select-trigger</code>.', { t: 'cur', h: 'cur' }, { 't-h': 'cur' }, [['harness', 'locate trigger element inside host'], ['TestElement', 'click() it'], ['environment', 'detectChanges() + whenStable() (forceStabilize)']]);
            f('The panel opens in an <b>overlay on &lt;body&gt;</b>, outside the component. The select harness knows to look there via the document root, so the spec never has to.', { e: 'ok', d: 'ok' }, { 'h-e': 'ok', 'e-d': 'ok' }, [['DOM', 'mat-option elements appear in .cdk-overlay-container'], ['state', 'panel open = true']]);
          } else if (cmd === 'choose') {
            if (!arg) throw new Error('choose needs an option text, e.g. choose:Tea');
            if (!open) f('<code>clickOptions</code> on a closed select: the Material harness opens the panel for you first. Harnesses hide these details.', { h: 'cur' }, { 't-h': 'cur' }, [['harness', 'open() automatically'], ['environment', 'stabilize']]);
            open = false; selected = arg;
            f('<code>await select.clickOptions({ text: \'' + H.esc(arg) + '\' })</code>: the harness filters option harnesses by text, clicks the match, then stabilizes. The value becomes <b>' + H.esc(arg) + '</b>.', { h: 'ok', e: 'ok', d: 'ok' }, { 'h-e': 'ok', 'e-d': 'ok' }, [['harness', 'getAllHarnesses(MatOptionHarness.with({text}))'], ['TestElement', 'click() on the option'], ['environment', 'detectChanges + whenStable'], ['form control', 'value = ' + H.esc(arg)]]);
          } else if (cmd === 'value') {
            f('<code>await select.getValueText()</code> reads the rendered trigger text: <b>' + H.esc(selected) + '</b>. Reading also stabilizes first, so you never read a stale DOM.', { t: 'ok' }, { 't-h': 'ok' }, [['TestElement', 'text() of value element'], ['result', H.esc(selected)]]);
          } else if (cmd === 'click') {
            if (!arg) throw new Error('click needs a button label, e.g. click:Save');
            f('<code>loader.getHarness(MatButtonHarness.with({ text: \'' + H.esc(arg) + '\' }))</code> then <code>click()</code>. If the markup changes from <code>&lt;button mat-button&gt;</code> to <code>&lt;a mat-button&gt;</code>, this line still works.', { h: 'cur', d: 'ok' }, { 'h-e': 'cur', 'e-d': 'ok' }, [['predicate', 'hostSelector + text filter'], ['TestElement', 'click()'], ['environment', 'stabilize']]);
          } else throw new Error('Unknown action "' + a + '". Use open, choose:X, value, click:Label.');
        });
        return pad4(frames);
      }
    },
    examples: [
      { title: 'CSS selector test vs harness test after an upgrade', html: `<p>When Material moved to MDC-based components (v15), class names changed everywhere. Compare:</p>${H.table(['Test style', 'Line', 'After upgrade'], [['CSS', '<code>query(\'.mat-select-value-text span\')</code>', H.c('r', 'breaks: class renamed')], ['Harness', '<code>await select.getValueText()</code>', H.c('g', 'passes: Material updated its harness')]])}<p>Harnesses are a <b>contract</b> owned by the component author.</p>` },
      { title: 'Harness for a table: assert rows as data', html: `<p><code>MatTableHarness</code> turns the table into plain arrays, so the assertion reads like a spec.</p>`,
        code: { lang: 'ts', code: `import { MatTableHarness } from '@angular/material/table/testing';

it('shows one row per order', async () => {
  const table = await loader.getHarness(MatTableHarness);
  const rows = await table.getCellTextByColumnName();
  expect(rows['name'].text).toEqual(['Tea', 'Coffee']);
  expect(rows['qty'].text).toEqual(['1', '2']);
});` } },
      { title: 'Child harnesses: compose them', html: `<p>A card harness can expose its inner button harness with <code>this.locatorFor(MatButtonHarness.with({ text: 'Buy' }))</code>. Tests then read: <code>await (await card.buyButton()).click()</code>. Harnesses can locate other harnesses, building a tree that mirrors the UI.</p>`,
        code: { lang: 'ts', code: `import { ComponentHarness } from '@angular/cdk/testing';
import { MatButtonHarness } from '@angular/material/button/testing';

export class ProductCardHarness extends ComponentHarness {
  static hostSelector = 'app-product-card';
  buyButton = this.locatorFor(MatButtonHarness.with({ text: 'Buy' }));
  private title = this.locatorFor('h3');
  async getTitle() { return (await this.title()).text(); }
}` } }
    ],
    deepDive: `<p>🟣 <b>How auto change detection works.</b> <code>TestbedHarnessEnvironment</code> wraps every <code>TestElement</code> action with <code>forceStabilize()</code>: it calls <code>fixture.detectChanges()</code> and <code>await fixture.whenStable()</code>. If you need to observe an intermediate state (a spinner while a request is pending), use <code>await manualChangeDetection(async () =&gt; { ... })</code> from <code>@angular/cdk/testing</code> to turn it off temporarily, and drive CD yourself.</p>
      <p>🟣 <b>Parallel reads.</b> Many harness calls each trigger stabilization. <code>parallel(() =&gt; [a.getText(), b.getText()])</code> batches them so stabilization happens once — noticeably faster in large table tests.</p>
      <p>🟣 <b>fakeAsync caveat.</b> Harness methods are Promise-based; inside <code>fakeAsync</code> you can still <code>await</code> them in many cases, but timers they wait on need <code>tick()</code>/<code>flush()</code>. Most teams use harnesses in plain <code>async</code> tests.</p>
      <p>🟣 <b>Locator semantics.</b> <code>locatorFor</code> throws if not found, <code>locatorForOptional</code> returns <code>null</code>, <code>locatorForAll</code> returns an array. Locators are lazy and re-query each call, so they never hold stale elements after re-renders — unlike a <code>DebugElement</code> captured in <code>beforeEach</code>.</p>`,
    aiEra: `<p>🤖 AI tools frequently generate brittle CSS-selector queries for Material components (copying class names from the rendered DOM). Prompt for "use Angular Material component harnesses" and they do much better, because harness APIs are small and well documented. For your own design system, an AI can draft a harness from the component source quickly (locators, getters, actions); you review that it acts like a user (click, type) rather than reaching into component instances. Harnesses also make AI-written tests more stable: the AI targets the stable contract instead of guessing DOM details.</p>`,
    problems: [{
      title: 'Harness Predicate Filtering',
      level: 'Medium', tags: ['harness', 'predicate', 'filters'], companies: ['Microsoft', 'Atlassian'],
      statement: `<p>Model <code>HarnessPredicate</code>. Given an array of fake buttons <code>{ text, disabled, selector }</code>, implement <code>with(options)</code> returning a predicate object with <code>addOption(name, value, fn)</code> and <code>getAll(buttons)</code>. An option whose value is <code>undefined</code> is ignored. String values must match exactly; <code>RegExp</code> values must <code>test</code> the text. <code>getHarness(buttons, pred)</code> returns the first match or throws <code>'Failed to find element matching ...'</code>.</p>`,
      constraints: `Up to 1000 buttons, options: <code>text</code> (string | RegExp), <code>disabled</code> (boolean).`,
      example: `<p>Buttons: Save (enabled), Save draft (enabled), Delete (disabled). <code>with({ text: /^save/i })</code> → ${H.c('g', '2 matches')}. <code>with({ text: 'Save', disabled: true })</code> → ${H.c('r', 'throws')}.</p>`,
      brute: { why: `<p>Writing a separate <code>findButtonByText</code>, <code>findDisabledButtonByText</code>... per combination explodes quickly and every helper re-implements matching rules slightly differently.</p>`,
        code: { lang: 'js', run: true, code: `const find1 = (bs, t) => bs.find(b => b.text === t);
const find2 = (bs, t) => bs.find(b => b.text === t && !b.disabled);
console.log(find1([{ text: 'Save' }], 'Save'), find2([{ text: 'Save', disabled: true }], 'Save')); // N helpers for N combos` } },
      mcq: { q: 'Why does <code>addOption</code> skip options whose value is <code>undefined</code>?', options: ['Performance', 'So <code>with({})</code> matches everything and callers only pass the filters they care about', 'Because undefined throws in JS'], answer: 1, explain: 'Unspecified filters must not exclude anything; that is what makes the single <code>with()</code> composable.' },
      hints: [
        `<p>Hint 1: store a list of checks; each check is a function <code>button =&gt; boolean</code>.</p>`,
        `<p>Hint 2: a helper <code>stringMatches(actual, pattern)</code> handles string vs RegExp vs undefined/null.</p>`,
        `<p>Hint 3: <code>getAll</code> filters with <code>every</code> over the checks; <code>getHarness</code> takes <code>[0]</code> or throws with a description of the options.</p>`
      ],
      solution: {
        approach: `<p>Composable predicate: each <code>addOption</code> pushes a check only if the value is defined. Matching = all checks pass. This mirrors the real CDK class (which also supports async checks and descriptions for error messages).</p>`,
        code: { lang: 'js', run: true, code: `function stringMatches(actual, pattern) {
  if (pattern === null || pattern === undefined) return actual === pattern;
  return typeof pattern === 'string' ? actual === pattern : pattern.test(actual);
}
class HarnessPredicate {
  constructor(name, options) { this.name = name; this.options = options; this.checks = []; }
  addOption(key, value, fn) { if (value !== undefined) this.checks.push(b => fn(b, value)); return this; }
  getAll(items) { return items.filter(b => this.checks.every(c => c(b))); }
}
const ButtonHarness = {
  with(o = {}) {
    return new HarnessPredicate('ButtonHarness', o)
      .addOption('text', o.text, (b, t) => stringMatches(b.text, t))
      .addOption('disabled', o.disabled, (b, d) => b.disabled === d);
  }
};
function getHarness(items, pred) {
  const m = pred.getAll(items);
  if (!m.length) throw new Error('Failed to find element matching ' + pred.name + ' with ' + JSON.stringify(pred.options, (k, v) => v instanceof RegExp ? String(v) : v));
  return m[0];
}
const buttons = [{ text: 'Save', disabled: false }, { text: 'Save draft', disabled: false }, { text: 'Delete', disabled: true }];
console.log(ButtonHarness.with({ text: /^save/i }).getAll(buttons).map(b => b.text));
console.log(getHarness(buttons, ButtonHarness.with({ disabled: true })).text);
try { getHarness(buttons, ButtonHarness.with({ text: 'Save', disabled: true })); } catch (e) { console.log(e.message); }` },
        dry: { head: ['options', 'checks', 'matches'], rows: [['{ text: /^save/i }', 'text', 'Save, Save draft'], ['{ disabled: true }', 'disabled', 'Delete'], ['{ text: "Save", disabled: true }', 'text, disabled', 'none → throw']] },
        complexity: `<p>O(B × K) for B buttons and K options.</p>`,
        followUps: ['How would you support async getters (the real harness reads the DOM asynchronously)?', 'How should the error message help a developer fix a failing test?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 4 — Testing signals, computed, effects
     ===================================================================== */
  topics.push({
    title: 'Testing Signals, computed() and effect()',
    analogy: `<p>Signals are like a <b>spreadsheet</b>. Cell A1 holds a number (a <code>signal</code>), cell B1 holds <code>=A1*2</code> (a <code>computed</code>), and there is a <b>macro</b> that emails your boss whenever B1 changes (an <code>effect</code>). Checking a formula is easy: type into A1 and look at B1 straight away. The email macro is different: the spreadsheet <b>batches</b> macros and runs them a moment later, so a test must say "run pending macros now" before checking the outbox. In Angular tests that "now" button is <code>TestBed.tick()</code> (v20+) or <code>TestBed.flushEffects()</code> (v17–19).</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> Signals are synchronous values, so most signal code is the <b>easiest</b> Angular code to test: set a signal, read a computed, assert. No fixture, no async.</p>
      ${H.table(['Thing', 'When does it update?', 'How to test'], [
        ['<code>signal()</code>', 'Immediately on <code>set</code>/<code>update</code>', 'Call <code>.set()</code>, read <code>()</code>'],
        ['<code>computed()</code>', 'Lazily, the next time someone reads it (memoised)', 'Read it after changing inputs — always fresh'],
        ['<code>effect()</code>', '<b>Scheduled</b>: runs later, during the next change detection / microtask flush', '<code>TestBed.tick()</code> (v20+), <code>TestBed.flushEffects()</code> (v17–19, deprecated in v20), or <code>fixture.detectChanges()</code> for component effects'],
        ['<code>toObservable(sig)</code>', 'Built on an effect, so it emits asynchronously', 'Flush effects, then check the subscriber'],
        ['<code>toSignal(obs$)</code>', 'Synchronously for sync sources like <code>of()</code>/<code>BehaviorSubject</code>', 'Needs an injection context: create it in a service/component, or inside <code>TestBed.runInInjectionContext</code>'],
        ['Signal <code>input()</code>', 'Set by the parent binding', '<code>fixture.componentRef.setInput(\'name\', v)</code>'],
        ['<code>model()</code>', 'Two-way: parent sets, child writes back', 'setInput + subscribe to the <code>nameChange</code> output (or host component with <code>[(name)]</code>)'],
      ])}
      <p>🔵 <b>Services built on signals.</b> A signal-based store (<code>items = signal&lt;Item[]&gt;([])</code>, <code>total = computed(...)</code>, methods that update) is tested with <code>TestBed.inject(Store)</code> and plain synchronous asserts. If it uses an effect (for example to persist to <code>localStorage</code>), you need an injection context (the effect is created in the service field initializer, so <code>TestBed.inject</code> handles that) and a flush before asserting the side effect.</p>
      <p>🔵 <b>Do not test the framework.</b> "computed recalculates when the signal changes" is Angular's job. Test <b>your</b> logic: the formula, edge cases (empty cart, discount caps), and the side effects your effect performs.</p>
      <p>🔵 <b>resource() / httpResource().</b> These (v19+, experimental at first) expose <code>value()</code>, <code>status()</code>, <code>isLoading()</code> and <code>error()</code> signals. Test them by controlling the loader: provide a fake loader returning a Promise you resolve in the test, or use <code>HttpTestingController</code> for <code>httpResource</code>, then <code>await TestBed.inject(ApplicationRef).whenStable()</code> (or <code>fixture.whenStable()</code>) before reading <code>value()</code>.</p>`,
    clues: [
      '"My effect never ran in the test" → effects are scheduled; call <code>TestBed.tick()</code> / <code>flushEffects()</code> or run change detection',
      '"toSignal() can only be used within an injection context" in a spec → use <code>TestBed.runInInjectionContext</code>',
      '"Test a signal store with computed totals" → plain <code>TestBed.inject</code>, set, read; no async needed',
      '"Component uses input.required()" → <code>setInput</code> before the first change detection, or it throws NG0950',
      '"Test a model() two-way binding" → host component with <code>[(value)]</code> or subscribe to <code>valueChange</code>'
    ],
    code: [
      { lang: 'ts', title: 'cart.store.spec.ts — signals, computed and a persisting effect', code: `import { Injectable, computed, effect, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { InjectionToken, inject } from '@angular/core';

export const STORAGE = new InjectionToken<Pick<Storage, 'setItem' | 'getItem'>>('STORAGE', {
  providedIn: 'root', factory: () => localStorage,
});

@Injectable({ providedIn: 'root' })
export class CartStore {
  private storage = inject(STORAGE);
  readonly items = signal<{ name: string; price: number; qty: number }[]>([]);
  readonly total = computed(() => this.items().reduce((s, i) => s + i.price * i.qty, 0));
  readonly freeShipping = computed(() => this.total() >= 50);

  constructor() {
    // Side effect: persist whenever items change. Runs later, not synchronously.
    effect(() => this.storage.setItem('cart', JSON.stringify(this.items())));
  }
  add(name: string, price: number) {
    this.items.update(list => {
      const hit = list.find(i => i.name === name);
      return hit ? list.map(i => (i === hit ? { ...i, qty: i.qty + 1 } : i)) : [...list, { name, price, qty: 1 }];
    });
  }
}

describe('CartStore', () => {
  const fakeStorage = { setItem: jasmine.createSpy('setItem'), getItem: () => null };
  let store: CartStore;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [{ provide: STORAGE, useValue: fakeStorage }] });
    store = TestBed.inject(CartStore);
  });

  it('computes totals synchronously', () => {
    store.add('book', 30);
    store.add('book', 30);
    expect(store.total()).toBe(60);          // computed is fresh on read
    expect(store.freeShipping()).toBe(true);
  });

  it('persists through the effect only after effects are flushed', () => {
    store.add('pen', 2);
    expect(fakeStorage.setItem).not.toHaveBeenCalledWith('cart', jasmine.stringContaining('pen'));
    TestBed.tick();                          // v20+. In v17-19: TestBed.flushEffects()
    expect(fakeStorage.setItem).toHaveBeenCalledWith('cart', jasmine.stringContaining('pen'));
  });
});` }
    ],
    viz: {
      title: 'Signal graph in a test: computed is pulled, effect waits for a flush',
      input: 'add:30 read add:30 read tick',
      inputLabel: 'Steps: add:N (item price), read, tick (max 10)',
      gen: function (input) {
        var steps = words(input, 10, 'Try: add:30 read add:30 read tick');
        var frames = [], items = [], persisted = '[]', pending = false, lastTotal = 0;
        function g(narr, hl) {
          var total = items.reduce(function (s, x) { return s + x; }, 0);
          frames.push({ narr: narr, parts: [
            { type: 'graph', directed: true, height: 50, nodes: [{ id: 'i', label: 'items (signal)', x: 12, y: 25, shape: 'box' }, { id: 't', label: 'total (computed)', x: 45, y: 12, shape: 'box' }, { id: 'f', label: 'freeShipping', x: 80, y: 12, shape: 'box' }, { id: 'e', label: 'effect: persist', x: 62, y: 40, shape: 'box' }], edges: [['i', 't'], ['t', 'f'], ['i', 'e']], hl: hl },
            { type: 'vars', label: 'values', vals: { items: '[' + items.join(', ') + ']', 'total()': total, 'storage.cart': persisted, 'effect pending?': pending ? 'yes' : 'no' }, hl: pending ? { 'effect pending?': 'cur' } : {} }
          ] });
          lastTotal = total;
        }
        g('Fresh store from <code>TestBed.inject(CartStore)</code>. The constructor created the effect, which is <b>scheduled</b> to run once.', { i: 'ok' });
        pending = true;
        steps.forEach(function (s) {
          var p = s.split(':');
          if (p[0] === 'add') {
            var n = Number(p[1]);
            if (!isFinite(n) || n < 0 || n > 10000) throw new Error('add needs a price 0..10000, e.g. add:30');
            items.push(n); pending = true;
            g('<code>store.add(' + n + ')</code> sets the items signal <b>synchronously</b>. Dependents are only marked <i>dirty</i>: computed values are not recalculated yet, and the effect is queued.', { i: 'cur', t: 'done', e: 'cur' });
          } else if (p[0] === 'read') {
            g('<code>expect(store.total())</code>: reading pulls the computed. It sees it is dirty, recalculates from items and caches the result. Synchronous, no flush needed.', { t: 'ok', i: 'ok' });
          } else if (p[0] === 'tick') {
            if (pending) { persisted = '[' + items.join(',') + ']'; pending = false; g('<code>TestBed.tick()</code> (or <code>flushEffects()</code> before v20) runs pending effects. The effect reads <code>items()</code> and writes to the fake storage. Only now can the test assert the side effect.', { e: 'ok' }); }
            else g('<code>TestBed.tick()</code> with nothing queued: no-op. Effects only re-run when a signal they read changed.', { e: 'done' });
          } else throw new Error('Unknown step "' + s + '". Use add:N, read, tick.');
        });
        return pad4(frames);
      }
    },
    examples: [
      { title: 'Required signal input must be set before the first render', html: `<p><code>input.required()</code> throws <b>NG0950</b> if read before a value is set. In tests, call <code>setInput</code> right after <code>createComponent</code> and <b>before</b> the first <code>detectChanges</code>/<code>whenStable</code>.</p>`,
        code: { lang: 'ts', code: `const fixture = TestBed.createComponent(UserBadgeComponent);
fixture.componentRef.setInput('user', { name: 'Ada', role: 'admin' }); // before first CD
fixture.detectChanges();
expect(fixture.nativeElement.textContent).toContain('Ada (admin)');` } },
      { title: 'toSignal in a test needs an injection context', html: `<p>Use <code>TestBed.runInInjectionContext</code> to create a signal from an observable outside a component. A <code>BehaviorSubject</code> emits synchronously, so the signal has a value immediately.</p>`,
        code: { lang: 'ts', code: `import { TestBed } from '@angular/core/testing';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject } from 'rxjs';

it('mirrors the subject', () => {
  const subject = new BehaviorSubject(1);
  const sig = TestBed.runInInjectionContext(() => toSignal(subject, { requireSync: true }));
  expect(sig()).toBe(1);
  subject.next(2);
  expect(sig()).toBe(2);          // toSignal subscribes eagerly; updates are synchronous
});` } },
      { title: 'Testing a model() two-way binding with a host', html: `<p><code>model()</code> creates an input <i>and</i> an output named <code>valueChange</code>. A host with banana-in-a-box checks both directions.</p>`,
        code: { lang: 'ts', code: `import { Component, model, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

@Component({ selector: 'app-toggle', standalone: true, template: '<button (click)="on.set(!on())">{{ on() ? "ON" : "OFF" }}</button>' })
class ToggleComponent { on = model(false); }

@Component({ standalone: true, imports: [ToggleComponent], template: '<app-toggle [(on)]="enabled" />' })
class Host { enabled = signal(true); }

it('syncs both ways', async () => {
  const f = TestBed.createComponent(Host);
  await f.whenStable();
  const btn: HTMLButtonElement = f.nativeElement.querySelector('button');
  expect(btn.textContent).toBe('ON');           // parent -> child
  btn.click();
  await f.whenStable();
  expect(f.componentInstance.enabled()).toBe(false); // child -> parent
});` } }
    ],
    deepDive: `<p>🟣 <b>Effect timing changed in v19.</b> Before v19 all effects were queued as microtasks. Since v19, <b>component effects</b> run as part of change detection (before the component's view is checked) and <b>root effects</b> (created in services) run before change detection in the app tick. In tests this means: component effects flush on <code>fixture.detectChanges()</code>/<code>whenStable()</code>; root effects flush on <code>TestBed.tick()</code> (which runs <code>ApplicationRef.tick()</code>) or the deprecated <code>flushEffects()</code>.</p>
      <p>🟣 <b>Glitch-free reads.</b> Computed signals are pull-based: setting a signal twice and reading once computes once. Tests that count computations (with a spy inside the computed) can verify memoisation, but that is testing Angular — only do it when you rely on the performance property.</p>
      <p>🟣 <b>untracked and equality.</b> If your computed uses a custom <code>equal</code> function (e.g. deep equality for arrays), test that an "equal" update does <b>not</b> re-trigger downstream effects: set an equal value, flush, and assert the effect spy count did not change.</p>
      <p>🟣 <b>linkedSignal (v19+).</b> A writable signal that resets when its source changes. Test both paths: user writes a value, then the source changes and the value resets to the computed default.</p>`,
    aiEra: `<p>🤖 Models trained on older code often wrap signal tests in <code>fakeAsync</code> and <code>tick()</code> or call <code>fixture.detectChanges()</code> after every line — harmless but noisy, and it hides the key point that signals and computed are synchronous. They also invent <code>effect.flush()</code>-style APIs that do not exist. Give the assistant the exact version ("Angular 20, use TestBed.tick for effects") and check imports. A great AI use: generate a table of state transitions for a signal store (add, remove, clear, discount) and turn each row into an <code>it()</code>.</p>`,
    problems: [{
      title: 'Mini Signals with a Test Flush',
      level: 'Hard', tags: ['signals', 'effects', 'scheduler'], companies: ['Google', 'Netflix'],
      statement: `<p>Build <code>signal(v)</code>, <code>computed(fn)</code> and <code>effect(fn)</code> with <b>automatic dependency tracking</b>. Computeds are lazy and memoised (recompute only when a dependency changed). Effects are <b>queued</b> when a dependency changes and only run when the test calls <code>flushEffects()</code>; an effect queued twice runs once. Effects also run once on the first flush after creation.</p>`,
      constraints: `No cycles. Up to 100 nodes. Equality with <code>Object.is</code>.`,
      example: `<p><code>a=signal(1); b=computed(()=&gt;a()*2); effect(()=&gt;log.push(b()))</code>. Before flush: log ${H.c('r', '[]')}. Flush: ${H.c('g', '[2]')}. <code>a.set(5); a.set(6)</code>, flush: ${H.c('g', '[2, 12]')} (one run, not two).</p>`,
      brute: { why: `<p>Running effects synchronously inside <code>set</code> is simple but runs them for every intermediate value (5 then 6) and can observe half-updated state. Angular deliberately batches.</p>`,
        code: { lang: 'js', run: true, code: `function eagerSignal(v, subs = []) { const s = () => v; s.set = n => { v = n; subs.forEach(f => f()); }; s.subs = subs; return s; }
const a = eagerSignal(1), log = [];
a.subs.push(() => log.push(a() * 2));
a.set(5); a.set(6);
console.log(log); // [10, 12] -> ran for the intermediate value too` } },
      mcq: { q: 'Why are effects queued instead of run inside <code>set()</code>?', options: ['To batch many updates into one run and avoid observing intermediate state', 'Because JavaScript cannot call functions synchronously', 'To make computed signals eager'], answer: 0, explain: 'Batching gives one consistent run after a burst of writes. That is also why tests must flush.' },
      hints: [
        `<p>Hint 1: keep a global "current consumer". When a signal is read while a consumer is active, record the dependency both ways.</p>`,
        `<p>Hint 2: on <code>set</code>, walk dependents: computeds become dirty (and propagate), effects are added to a <code>Set</code> queue.</p>`,
        `<p>Hint 3: a computed recalculates on read only if dirty; before running a computed or effect, clear its old dependencies and re-track.</p>`
      ],
      solution: {
        approach: `<p>Push-dirty / pull-value: writes push a dirty flag through the graph and enqueue effects; reads pull fresh values. <code>flushEffects</code> drains the queue. This is the shape of Angular's reactive graph and explains why <code>TestBed.tick()</code> exists.</p>`,
        code: { lang: 'js', run: true, code: `let active = null;
const queue = new Set();
function track(node) { if (active) { node.deps.add(active); active.sources.add(node); } }
function markDirty(node) {
  for (const d of node.deps) {
    if (d.kind === 'effect') queue.add(d);
    else if (!d.dirty) { d.dirty = true; markDirty(d); }
  }
}
function run(node, fn) {
  for (const s of node.sources) s.deps.delete(node);
  node.sources.clear();
  const prev = active; active = node;
  try { return fn(); } finally { active = prev; }
}
function signal(v) {
  const node = { deps: new Set(), sources: new Set() };
  const read = () => { track(node); return v; };
  read.set = n => { if (!Object.is(n, v)) { v = n; markDirty(node); } };
  return read;
}
function computed(fn) {
  const node = { kind: 'computed', deps: new Set(), sources: new Set(), dirty: true, value: undefined };
  return () => {
    if (node.dirty) { node.value = run(node, fn); node.dirty = false; }
    track(node);
    return node.value;
  };
}
function effect(fn) { const node = { kind: 'effect', deps: new Set(), sources: new Set(), fn }; queue.add(node); }
function flushEffects() { const list = [...queue]; queue.clear(); for (const e of list) run(e, e.fn); }

const a = signal(1), b = computed(() => a() * 2), log = [];
effect(() => log.push(b()));
console.log('before flush', log);
flushEffects();  console.log('after flush', log);
a.set(5); a.set(6);
flushEffects();  console.log('after batch', log);
a.set(6); flushEffects(); console.log('same value, no run', log);` },
        dry: { head: ['action', 'b dirty', 'queue', 'log'], rows: [['effect()', 'yes', '[E]', '[]'], ['flush', 'no (2)', '[]', '[2]'], ['a.set(5)', 'yes', '[E]', '[2]'], ['a.set(6)', 'yes', '[E] (Set, once)', '[2]'], ['flush', 'no (12)', '[]', '[2, 12]']] },
        complexity: `<p>Writes are O(reachable dependents); reads are O(1) when clean. Memory O(nodes + edges).</p>`,
        followUps: ['Real Angular also checks whether a computed\'s new value is equal and stops propagation (version counters). How would you add that?', 'How would you detect a cycle?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 5 — Async & RxJS: fakeAsync/tick, waitForAsync, marble tests
     ===================================================================== */
  topics.push({
    title: 'Async & RxJS: fakeAsync/tick, waitForAsync and Marble Tests',
    analogy: `<p>Imagine filming a slow plant growing. Waiting three weeks in real time is silly, so you use a <b>time-lapse camera</b> you control: "skip ahead 300 milliseconds", "skip until nothing is left to happen". <code>fakeAsync</code> + <code>tick()</code> is that time-lapse remote for timers and promises. <b>Marble diagrams</b> are the storyboard for the film: <code>-a--b-|</code> reads "nothing, then a, two beats of nothing, b, then the end", and <code>TestScheduler</code> plays the storyboard in virtual time and checks that the output storyboard matches.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> Real waiting makes tests slow and flaky. Instead we <b>fake time</b>. Three tools, from oldest to most precise:</p>
      ${H.table(['Tool', 'What it does', 'Best for'], [
        ['<code>waitForAsync(() =&gt; {...})</code>', 'Runs the test in a zone and finishes only when all async tasks (promises, timers, XHR) completed — in <b>real</b> time', 'Legacy code; <code>beforeEach</code> with <code>compileComponents()</code>. Replaced the removed <code>async()</code> helper. Plain <code>async/await</code> is usually nicer.'],
        ['<code>fakeAsync(() =&gt; {...})</code> + <code>tick(ms)</code>, <code>flush()</code>, <code>flushMicrotasks()</code>', 'Patches timers into a <b>virtual clock</b>. <code>tick(300)</code> moves time 300 ms and runs due timers; <code>flushMicrotasks()</code> drains resolved promises; <code>flush()</code> runs until no timers are left', 'Debounce, delay, setTimeout, polling, animations in component tests. Needs <b>zone.js</b> (<code>zone.js/testing</code>)'],
        ['RxJS <code>TestScheduler</code> + marbles', 'Runs RxJS operators on a <b>virtual scheduler</b> and compares event streams frame by frame', 'Custom operators, effects/epics, debounce/switchMap pipelines — pure RxJS logic'],
        ['Runner fake timers: <code>vi.useFakeTimers()</code> / <code>jest.useFakeTimers()</code>', 'Replace global timers; advance with <code>vi.advanceTimersByTime(ms)</code>', 'Zoneless apps and Vitest, where <code>fakeAsync</code> is unavailable'],
      ])}
      <p>🔵 <b>Marble syntax (RxJS 7).</b> Each character is one virtual frame (1 ms):</p>
      ${H.table(['Symbol', 'Meaning'], [
        ['<code>-</code>', 'one frame passes, nothing happens'],
        ['<code>a</code>', 'emit value <code>a</code> (mapped through the values object)'],
        ['<code>|</code>', 'complete'], ['<code>#</code>', 'error'],
        ['<code>(ab)</code>', 'a and b emitted in the <b>same</b> frame (the group takes no extra time... but the parentheses still advance the column count)'],
        ['<code>^</code>', 'subscription point (hot observables)'], ['<code>300ms</code>', 'time progression in time-progression syntax, e.g. <code>a 299ms b</code>'],
      ])}
      <p>🔵 <b>Inside <code>scheduler.run(helpers =&gt; ...)</code></b>, all RxJS time operators (<code>debounceTime</code>, <code>delay</code>, <code>interval</code>, <code>timer</code>) automatically use virtual time — no need to pass the scheduler. Helpers: <code>cold</code>, <code>hot</code>, <code>expectObservable(obs$, subMarble?)</code>, <code>expectSubscriptions</code>, <code>flush</code>, <code>time</code>.</p>
      <p>🔵 <b>Errors to recognise.</b> "1 timer(s) still in the queue" → a <code>fakeAsync</code> test ended with pending timers: add <code>tick</code>/<code>flush</code>, or <code>discardPeriodicTasks()</code> for intervals. "Cannot use setInterval from within an async zone test" → you mixed <code>waitForAsync</code> with an interval that never ends.</p>`,
    clues: [
      '"Test a search box with debounceTime(300)" → <code>fakeAsync</code> + <code>tick(300)</code>, or marbles in <code>TestScheduler.run</code>',
      '"Test a custom RxJS operator / NgRx effect precisely" → marble tests with <code>cold</code>/<code>hot</code>/<code>expectObservable</code>',
      '"1 periodic timer(s) still in the queue" → <code>discardPeriodicTasks()</code> or unsubscribe/destroy before the test ends',
      '"Zoneless app, fakeAsync does not work" → runner fake timers (<code>vi.useFakeTimers</code>) or marbles',
      '"switchMap must cancel the old request" → marble test that asserts the first inner observable\'s subscription is unsubscribed (<code>expectSubscriptions</code>)',
      '"Flaky test with setTimeout(…, 1000) and done()" → replace real waiting with virtual time'
    ],
    code: [
      { lang: 'ts', title: 'search.component.spec.ts — debounce with fakeAsync/tick', code: `import { fakeAsync, tick, flush, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { SearchComponent } from './search.component';
import { SearchApi } from './search.api';

describe('SearchComponent (fakeAsync)', () => {
  it('waits 300 ms of silence, then searches once with the last term', fakeAsync(() => {
    const api = { search: jasmine.createSpy('search').and.returnValue(of(['angular'])) };
    TestBed.configureTestingModule({
      imports: [SearchComponent],
      providers: [{ provide: SearchApi, useValue: api }],
    });
    const fixture = TestBed.createComponent(SearchComponent);
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');

    input.value = 'ang';     input.dispatchEvent(new Event('input'));
    tick(100);               // virtual: 100 ms later
    input.value = 'angular'; input.dispatchEvent(new Event('input'));
    tick(299);
    expect(api.search).not.toHaveBeenCalled();   // still inside the debounce window
    tick(1);                                     // 300 ms of silence reached
    expect(api.search).toHaveBeenCalledOnceWith('angular');

    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('li').length).toBe(1);
    flush();                 // nothing must be left in the timer queue
  }));
});` },
      { lang: 'ts', title: 'typeahead.spec.ts — the same pipeline as a marble test', code: `import { TestScheduler } from 'rxjs/testing';
import { Observable, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';

// The pure pipeline extracted from the component: easy to test in isolation.
export function typeahead(terms$: Observable<string>, search: (t: string) => Observable<string[]>) {
  return terms$.pipe(debounceTime(300), distinctUntilChanged(), switchMap(search));
}

describe('typeahead', () => {
  let scheduler: TestScheduler;
  beforeEach(() => {
    // Runner-agnostic deep equality: Jasmine, Jest and Vitest all have toEqual.
    scheduler = new TestScheduler((actual, expected) => expect(actual).toEqual(expected));
  });

  it('debounces, skips duplicates and cancels stale searches', () => {
    scheduler.run(({ cold, hot, expectObservable, expectSubscriptions }) => {
      // Time-progression syntax: a@0, b@51, b@401, c@802 (each letter is 1 frame, spaces ignored).
      const terms = hot('a 50ms b 349ms b 400ms c', { a: 'an', b: 'ang', c: 'angu' });
      const slow = cold('800ms r', { r: ['result'] });   // every search takes 800 ms
      const result$ = typeahead(terms, () => slow);
      // 'ang' settles at 351 (51 + 300). The repeat 'ang' at 701 is dropped by distinctUntilChanged.
      // 'angu' settles at 1102, which cancels the first search (it would answer at 1151).
      expectObservable(result$, '^ 2000ms !').toBe('1902ms r', { r: ['result'] });
      expectSubscriptions(slow.subscriptions).toBe([
        '351ms ^ 750ms !',    // subscribed 351, unsubscribed 1102 by switchMap
        '1102ms ^ 898ms !',   // subscribed 1102, unsubscribed 2001 when the test unsubscribes
      ]);
    });
  });
});` }
    ],
    viz: {
      title: 'fakeAsync virtual clock: keystrokes, debounceTime(300) and tick()',
      input: '0 100 500',
      inputLabel: 'Keystroke times in ms (ascending, max 6); debounce is 300 ms',
      gen: function (input) {
        var ts = words(input, 6, 'Give keystroke times like: 0 100 500').map(Number);
        ts.forEach(function (t, i) { if (!isFinite(t) || t < 0 || t > 5000) throw new Error('Times must be numbers 0..5000'); if (i && t < ts[i - 1]) throw new Error('Times must be ascending'); });
        var D = 300, frames = [], now = 0, timer = null, fired = [];
        var events = [];
        ts.forEach(function (t, i) { events.push({ t: t, type: 'key', k: i + 1 }); });
        function snap(narr, hlTimer) {
          frames.push({ narr: narr, parts: [
            { type: 'vars', label: 'virtual clock', vals: { now: now + ' ms', 'pending debounce timer': timer === null ? '(none)' : 'fires at ' + timer + ' ms (key ' + timer.k + ')', 'searches fired': fired.length ? fired.join(', ') : '(none)' }, hl: hlTimer ? { 'pending debounce timer': hlTimer } : {} },
            { type: 'bars', label: 'keystrokes on the timeline (ms)', values: ts.length ? ts : [0], texts: ts.map(function (t, i) { return 'k' + (i + 1); }) }
          ] });
        }
        snap('Test starts inside <code>fakeAsync</code>. The clock is at 0 and frozen: nothing happens unless the test calls <code>tick()</code>.');
        events.forEach(function (ev) {
          if (timer !== null && timer.at <= ev.t) {
            now = timer.at; fired.push('key ' + timer.k + ' @' + timer.at);
            snap('<code>tick(' + (timer.at - (ev.t - (ev.t - now))) + ')</code> reaches ' + timer.at + ' ms: 300 ms passed with no new key, so the debounce timer fires and the search runs for key ' + timer.k + '.', 'ok');
            timer = null;
          }
          var gap = ev.t - now; now = ev.t;
          var replaced = timer !== null;
          timer = { at: ev.t + D, k: ev.k, toString: function () { return String(this.at); } };
          snap((gap ? '<code>tick(' + gap + ')</code>, then ' : '') + 'key ' + ev.k + ' typed at ' + ev.t + ' ms. ' + (replaced ? H.c('r', 'The previous pending timer is cancelled') + ' (debounce restarts). ' : '') + 'A new timer is scheduled for ' + (ev.t + D) + ' ms.', 'cur');
        });
        if (timer !== null) {
          var at = timer.at;
          snap('<code>tick(' + (at - now - 1) + ')</code>: one millisecond short. The assertion <code>expect(search).not.toHaveBeenCalled()</code> for the last term passes here. Off-by-one ticks are a classic source of confusing failures.', 'cur');
          now = at; fired.push('key ' + timer.k + ' @' + at); timer = null;
          snap('<code>tick(1)</code>: clock hits ' + at + ' ms, the last timer fires, the search runs with the latest term. Finally <code>flush()</code> confirms no timers remain, so the test can end cleanly.', 'ok');
        }
        return pad4(frames);
      }
    },
    examples: [
      { title: 'Marble basics: a map operator', html: `<p>The simplest marble test. Values are mapped from letters through objects, so diagrams stay readable.</p>`,
        code: { lang: 'ts', code: `import { TestScheduler } from 'rxjs/testing';
import { map } from 'rxjs';

it('doubles values', () => {
  const ts = new TestScheduler((a, e) => expect(a).toEqual(e));
  ts.run(({ cold, expectObservable }) => {
    const src = cold('-a-b-|', { a: 1, b: 2 });
    expectObservable(src.pipe(map(x => x * 2))).toBe('-x-y-|', { x: 2, y: 4 });
  });
});` } },
      { title: 'Retry with delay, tested in virtual time', html: `<p><code>retry({ count: 2, delay: 1000 })</code> would take 2 real seconds per run. In <code>TestScheduler.run</code> the delay is virtual, so the test is instant and exact.</p>`,
        code: { lang: 'ts', code: `import { TestScheduler } from 'rxjs/testing';
import { retry } from 'rxjs';

it('retries twice with a 1s pause, then fails', () => {
  const ts = new TestScheduler((a, e) => expect(a).toEqual(e));
  ts.run(({ cold, expectObservable }) => {
    const failing = cold('-#');                        // errors after 1 frame
    const result = failing.pipe(retry({ count: 2, delay: 1000 }));
    // 1 + 1000 + 1 + 1000 + 1 = error at frame 2003
    expectObservable(result).toBe('2003ms #');
  });
});` } },
      { title: 'Vitest fake timers instead of fakeAsync (zoneless)', html: `<p>Without zone.js, <code>fakeAsync</code> is not available. Runner fake timers do the same job for <code>setTimeout</code>-based code, including RxJS's default async scheduler.</p>`,
        code: { lang: 'ts', code: `import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Subject, debounceTime } from 'rxjs';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it('debounces with fake timers', () => {
  const seen: string[] = [];
  const s = new Subject<string>();
  s.pipe(debounceTime(300)).subscribe(v => seen.push(v));
  s.next('a'); vi.advanceTimersByTime(100);
  s.next('ab'); vi.advanceTimersByTime(300);
  expect(seen).toEqual(['ab']);
});` } }
    ],
    deepDive: `<p>🟣 <b>How fakeAsync works.</b> zone.js's <code>FakeAsyncTestZoneSpec</code> intercepts <code>setTimeout</code>, <code>setInterval</code>, <code>requestAnimationFrame</code> and promise microtasks. Timers go into a sorted queue keyed by virtual time; <code>tick(n)</code> advances the clock, running microtasks between timers; <code>Date.now()</code> is faked too. It cannot fake real I/O: a real <code>XMLHttpRequest</code> or <code>fetch</code> inside fakeAsync errors or never resolves — that is why HTTP is faked with <code>HttpTestingController</code>. Native <code>async/await</code> compiled to ES2017+ cannot be patched by zone.js, which is why the Angular CLI downlevels async/await when zone.js is used; zoneless apps avoid the issue entirely.</p>
      <p>🟣 <b>Marble timing rules.</b> In <code>run</code> mode one frame = 1 virtual ms. Every character, including <code>-</code>, letters and the parentheses of a group, advances one frame — except spaces, which are ignored in run mode for alignment. A sync group <code>(ab)</code> emits both at the column of <code>(</code> but occupies 4 frames of diagram width, a common source of off-by-N bugs; time-progression syntax (<code>a 299ms b</code>) is more readable for long gaps.</p>
      <p>🟣 <b>Hot vs cold in tests.</b> <code>cold</code> starts its timeline at each subscription (like an HTTP call); <code>hot</code> runs independently and <code>^</code> marks where the test subscribes (like DOM events or a Subject). Using cold for a user-typing stream hides bugs where late subscribers miss values.</p>
      <p>🟣 <b>Prefer extracting pure pipelines.</b> A component that builds its RxJS pipeline inline is hard to marble-test. Extract <code>typeahead(terms$, search)</code> into a function, marble-test it exhaustively, and keep one fakeAsync component test for the wiring.</p>`,
    aiEra: `<p>🤖 Marble diagrams are where AI assistants make the most <b>timing mistakes</b>: they forget that each character is a frame, miscount sync groups, or mix the old (non-run) mode where frames were 10 units. Treat generated marbles as drafts: run them, read the diff RxJS prints (it lists every notification with its frame), and adjust. A very effective workflow is asking the AI to <i>explain</i> a failing marble diff line by line. For fakeAsync, ask it to justify each <code>tick</code> value against the timers in the code; "tick(1000) to be safe" hides real off-by-one bugs.</p>`,
    problems: [{
      title: 'A Virtual Clock (fakeAsync in miniature)',
      level: 'Medium', tags: ['fakeAsync', 'timers', 'virtual-time'], companies: ['Amazon', 'Zalando'],
      statement: `<p>Implement <code>createClock()</code> returning <code>{ setTimeout(fn, ms), clearTimeout(id), tick(ms), flush(), now(), pending() }</code>. Timers run in order of due time, ties in order of creation. A callback may schedule new timers; <code>tick(ms)</code> must run those too if they fall inside the window. <code>flush()</code> runs everything and returns the elapsed time; throw if more than 1000 timers run (an endless loop).</p>`,
      constraints: `Delays are integers ≥ 0. At most 1000 timers per flush.`,
      example: `<p>Schedule A at 100 and B at 50; B schedules C at +100. <code>tick(120)</code> runs ${H.c('g', 'B (50), A (100)')}; C is due at 150 so it stays pending. <code>tick(30)</code> runs ${H.c('g', 'C')}.</p>`,
      brute: { why: `<p>Using real <code>setTimeout</code> and sleeping in the test takes real time and is flaky under CI load. Running all callbacks immediately ignores order and cancellation.</p>`,
        code: { lang: 'js', run: true, code: `const log = [];
const fakeNow = [[100, 'A'], [50, 'B']];
fakeNow.forEach(([, n]) => log.push(n)); // runs in creation order, ignores time
console.log(log); // ['A','B'] but B is due first` } },
      mcq: { q: 'A timer callback scheduled during <code>tick(120)</code> is due at 110. Should <code>tick(120)</code> run it?', options: ['Yes, it falls inside the window', 'No, only timers that existed before tick started', 'Only with flush()'], answer: 0, explain: 'tick advances time step by step, so new timers due inside the window run — just like real time would.' },
      hints: [
        `<p>Hint 1: store timers as <code>{ id, at, seq, fn }</code>; pick the smallest <code>(at, seq)</code> each step.</p>`,
        `<p>Hint 2: <code>tick(ms)</code>: target = now + ms; loop while the earliest timer's <code>at</code> ≤ target: set now = at, remove it, run it. Finally now = target.</p>`,
        `<p>Hint 3: <code>flush</code> is tick-until-empty, with a counter guard to catch infinite rescheduling.</p>`
      ],
      solution: {
        approach: `<p>A priority list by (dueTime, sequence). Advancing time pops due timers one by one so callbacks scheduled during the tick are considered. This is the heart of zone.js's FakeAsyncTestZoneSpec and of Vitest's fake timers.</p>`,
        code: { lang: 'js', run: true, code: `function createClock() {
  let now = 0, seq = 0, nextId = 1;
  let timers = [];
  const earliest = () => timers.reduce((m, t) => (!m || t.at < m.at || (t.at === m.at && t.seq < m.seq) ? t : m), null);
  return {
    now: () => now,
    pending: () => timers.length,
    setTimeout(fn, ms = 0) { const id = nextId++; timers.push({ id, at: now + ms, seq: seq++, fn }); return id; },
    clearTimeout(id) { timers = timers.filter(t => t.id !== id); },
    tick(ms = 0) {
      const target = now + ms;
      for (let t = earliest(); t && t.at <= target; t = earliest()) {
        now = t.at;
        timers = timers.filter(x => x !== t);
        t.fn();
      }
      now = target;
    },
    flush() {
      const start = now; let runs = 0;
      for (let t = earliest(); t; t = earliest()) {
        if (++runs > 1000) throw new Error('flush: more than 1000 timers, infinite loop?');
        now = t.at; timers = timers.filter(x => x !== t); t.fn();
      }
      return now - start;
    }
  };
}

const c = createClock(), log = [];
c.setTimeout(() => log.push('A@' + c.now()), 100);
c.setTimeout(() => { log.push('B@' + c.now()); c.setTimeout(() => log.push('C@' + c.now()), 100); }, 50);
c.tick(120); console.log(log, 'pending', c.pending());
c.tick(30);  console.log(log);
const id = c.setTimeout(() => log.push('never'), 10); c.clearTimeout(id);
console.log('flush elapsed', c.flush(), log);` },
        dry: { head: ['call', 'now', 'ran', 'pending'], rows: [['tick(120)', '50', 'B (schedules C@150)', 'A, C'], ['', '100', 'A', 'C'], ['', '120', '-', 'C'], ['tick(30)', '150', 'C', '-']] },
        complexity: `<p>O(T) per step to find the earliest (O(log T) with a heap); fine for tests.</p>`,
        followUps: ['How would you add <code>setInterval</code> and <code>discardPeriodicTasks</code>?', 'Where do microtasks (Promise callbacks) fit between timers?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 6 — HTTP: provideHttpClientTesting & HttpTestingController
     ===================================================================== */
  topics.push({
    title: 'Testing HTTP: provideHttpClientTesting, HttpTestingController & Interceptors',
    analogy: `<p>Think of a <b>flight simulator</b>. The pilot's controls are real, but the "sky" is a computer that answers whatever the instructor types: calm weather, a storm, an engine failure. <code>HttpTestingController</code> is the instructor's console. Your service sends real <code>HttpClient</code> requests, but they never leave the building: they land on the console, the test checks them ("is this the right URL, the right headers?") and then types the answer: success data, a 404, a network error.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> Never hit a real server in unit tests (slow, flaky, needs data). Angular ships a <b>fake HTTP backend</b>. Requests made with <code>HttpClient</code> are captured; the test inspects and answers them.</p>
      <p>🔵 <b>Setup (Angular 15+ standalone style; <code>HttpClientTestingModule</code> is deprecated since v18):</b></p>
      ${H.table(['Step', 'Code', 'Why'], [
        ['1', '<code>provideHttpClient()</code> (plus <code>withInterceptors([...])</code> if needed)', 'The real client, configured like the app'],
        ['2', '<code>provideHttpClientTesting()</code> <b>after</b> it', 'Replaces the backend with the testing backend. Order matters: it must come after <code>provideHttpClient</code>'],
        ['3', '<code>httpMock = TestBed.inject(HttpTestingController)</code>', 'The instructor console'],
        ['4', '<code>afterEach(() =&gt; httpMock.verify())</code>', 'Fails if any request was made but not handled — catches unexpected or duplicated calls'],
      ])}
      ${H.table(['Controller API', 'Use'], [
        ['<code>expectOne(\'/api/users/1\')</code>', 'Exactly one matching request must be pending; returns a <code>TestRequest</code>. Also accepts <code>{ method, url }</code> or a predicate <code>req =&gt; ...</code>'],
        ['<code>match(predicate)</code>', 'All matching pending requests (polling, batches)'],
        ['<code>expectNone(url)</code>', 'Assert a request was <b>not</b> made (cache hit!)'],
        ['<code>req.request</code>', 'The <code>HttpRequest</code>: <code>method</code>, <code>body</code>, <code>headers.get(\'Authorization\')</code>, <code>params</code>'],
        ['<code>req.flush(body, { status, statusText, headers })</code>', 'Answer with data, or with an error status like 404/500'],
        ['<code>req.error(new ProgressEvent(\'error\'))</code>', 'Simulate a network failure (status 0)'],
        ['<code>req.cancelled</code>', 'True if the subscriber unsubscribed (switchMap cancelled it)'],
      ])}
      <p>🔵 <b>Important:</b> HTTP observables are <b>cold</b>. If your test never subscribes, no request is sent and <code>expectOne</code> fails with "Expected one matching request, found none". Subscribe first, then <code>expectOne</code>, then <code>flush</code>, then assert what the subscriber received. <code>flush</code> delivers synchronously, so no fakeAsync is needed.</p>
      <p>🔵 <b>Interceptors</b> are tested two ways: (a) <b>integration</b>: register with <code>provideHttpClient(withInterceptors([authInterceptor]))</code>, make a call, assert the captured request's headers; (b) <b>unit</b>: call the function directly inside <code>TestBed.runInInjectionContext</code> with a fake <code>next</code> that returns <code>of(new HttpResponse(...))</code>.</p>`,
    clues: [
      '"How do you test a service that calls an API?" → <code>provideHttpClient()</code> + <code>provideHttpClientTesting()</code>, <code>expectOne</code>, <code>flush</code>, <code>verify</code>',
      '"Test the error path / retry / 401 handling" → <code>req.flush(\'msg\', { status: 401, statusText: \'Unauthorized\' })</code> or <code>req.error(new ProgressEvent(\'error\'))</code>',
      '"Check the auth header is attached" → interceptor test asserting <code>req.request.headers.get(\'Authorization\')</code>',
      '"Make sure the cache avoids a second request" → <code>expectNone</code> after a cache hit',
      '"Expected one matching request, found none" → the observable was never subscribed (cold)',
      '"HttpClientTestingModule is deprecated" → move to <code>provideHttpClientTesting()</code>'
    ],
    code: [
      { lang: 'ts', title: 'user.service.spec.ts — happy path, error path, retry and verify', code: `import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors, HttpErrorResponse } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UserService, User } from './user.service';
import { authInterceptor } from './auth.interceptor';
import { AuthStore } from './auth.store';

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])), // real client + real interceptor
        provideHttpClientTesting(),                              // MUST come after provideHttpClient
        { provide: AuthStore, useValue: { token: () => 'abc123' } },
      ],
    });
    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());   // no unexpected or unanswered requests

  it('GETs a user with the auth header', () => {
    let result: User | undefined;
    service.getUser(1).subscribe(u => (result = u));     // subscribe FIRST (cold observable)

    const req = httpMock.expectOne({ method: 'GET', url: '/api/users/1' });
    expect(req.request.headers.get('Authorization')).toBe('Bearer abc123');
    req.flush({ id: 1, name: 'Ada' });                   // synchronous delivery

    expect(result).toEqual({ id: 1, name: 'Ada' });
  });

  it('maps a 404 to a friendly error', () => {
    let error: string | undefined;
    service.getUser(99).subscribe({ error: (e: Error) => (error = e.message) });
    httpMock.expectOne('/api/users/99').flush('Not found', { status: 404, statusText: 'Not Found' });
    expect(error).toBe('User 99 does not exist');
  });

  it('retries once on a network error, then succeeds', () => {
    let name = '';
    service.getUser(2).subscribe(u => (name = u.name));  // service uses retry(1)
    httpMock.expectOne('/api/users/2').error(new ProgressEvent('error')); // status 0
    httpMock.expectOne('/api/users/2').flush({ id: 2, name: 'Grace' });   // the retry
    expect(name).toBe('Grace');
  });
});` },
      { lang: 'ts', title: 'auth.interceptor.spec.ts — unit-testing a functional interceptor', code: `import { TestBed } from '@angular/core/testing';
import { HttpRequest, HttpResponse, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { Observable, of, firstValueFrom } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { AuthStore } from './auth.store';

it('adds a bearer token but skips public assets', async () => {
  TestBed.configureTestingModule({ providers: [{ provide: AuthStore, useValue: { token: () => 't0k' } }] });
  const seen: HttpRequest<unknown>[] = [];
  const next: HttpHandlerFn = (req): Observable<HttpEvent<unknown>> => {
    seen.push(req);
    return of(new HttpResponse({ status: 200 }));
  };
  // inject() inside the interceptor needs an injection context:
  await firstValueFrom(TestBed.runInInjectionContext(() => authInterceptor(new HttpRequest('GET', '/api/me'), next)));
  await firstValueFrom(TestBed.runInInjectionContext(() => authInterceptor(new HttpRequest('GET', '/assets/i18n/en.json'), next)));

  expect(seen[0].headers.get('Authorization')).toBe('Bearer t0k');
  expect(seen[1].headers.has('Authorization')).toBe(false);
});` }
    ],
    viz: {
      title: 'HttpTestingController: capture, match, flush, verify',
      input: 'GET:/api/users GET:/api/users/1 POST:/api/orders!',
      inputLabel: 'Requests the code makes as METHOD:/url; add ! to one the test forgets to handle (max 6)',
      gen: function (input) {
        var reqs = words(input, 6, 'Format: GET:/api/users POST:/api/orders!').map(function (w) {
          var forgot = /!$/.test(w); w = w.replace(/!$/, '');
          var i = w.indexOf(':');
          if (i < 1) throw new Error('Each request must be METHOD:/url, e.g. GET:/api/users');
          var m = w.slice(0, i).toUpperCase(), u = w.slice(i + 1);
          if (!/^(GET|POST|PUT|PATCH|DELETE)$/.test(m) || u.charAt(0) !== '/') throw new Error('Use GET/POST/PUT/PATCH/DELETE and a url starting with /');
          return { m: m, u: u, forgot: forgot, state: 'pending' };
        });
        var frames = [];
        function tbl() { return reqs.map(function (r) { return [r.m, r.u, r.state]; }); }
        function f(narr, hl) { frames.push({ narr: narr, parts: [{ type: 'table', label: 'testing backend: captured requests', columns: ['method', 'url', 'state'], rows: tbl(), hl: hl || {} }] }); }
        var shown = reqs.slice(); reqs = [];
        frames.push({ narr: '<code>provideHttpClient()</code> then <code>provideHttpClientTesting()</code>: the real <code>HttpClient</code> now talks to a <b>testing backend</b> that stores requests instead of sending them.', parts: [{ type: 'table', label: 'testing backend: captured requests', columns: ['method', 'url', 'state'], rows: [['-', '(none yet)', '-']] }] });
        shown.forEach(function (r, i) { reqs.push(r); var hl = {}; hl[i] = 'cur'; f('The code under test subscribes and sends <code>' + r.m + ' ' + H.esc(r.u) + '</code>. It is <b>captured</b> and waits: the subscriber has no answer yet.', hl); });
        reqs.forEach(function (r, i) {
          var hl = {};
          if (r.forgot) { hl[i] = 'bad'; f('The test never calls <code>expectOne</code> for <code>' + r.m + ' ' + H.esc(r.u) + '</code>. It stays pending.', hl); return; }
          hl[i] = 'cur';
          f('<code>httpMock.expectOne({ method: \'' + r.m + '\', url: \'' + H.esc(r.u) + '\' })</code> finds exactly one match. The test can assert on <code>req.request</code> (headers, body, params).', hl);
          r.state = r.m === 'GET' ? 'flushed 200' : 'flushed 201';
          hl[i] = 'ok';
          f('<code>req.flush(' + (r.m === 'GET' ? '[...data]' : '{ id: 7 }, { status: 201, statusText: \'Created\' }') + ')</code>: the response is delivered <b>synchronously</b> to the subscriber. Assert on what it received right after.', hl);
        });
        var left = reqs.filter(function (r) { return r.state === 'pending'; });
        var hlEnd = {}; reqs.forEach(function (r, i) { hlEnd[i] = r.state === 'pending' ? 'bad' : 'done'; });
        f(left.length ? '<code>afterEach(() =&gt; httpMock.verify())</code> ' + H.c('r', 'fails') + ': "Expected no open requests, found ' + left.length + ': ' + left.map(function (r) { return r.m + ' ' + H.esc(r.u); }).join(', ') + '". Good: an unexpected call (or a missing assertion) is caught.' : '<code>httpMock.verify()</code> ' + H.c('g', 'passes') + ': every request was matched and answered. No surprise calls happened.', hlEnd);
        return pad4(frames);
      }
    },
    examples: [
      { title: 'Expect no request when the cache hits', html: `<p>A caching service should call the API once. Flush the first call, call again, and assert no second request exists.</p>`,
        code: { lang: 'ts', code: `it('serves the second call from cache', () => {
  service.getConfig().subscribe();
  httpMock.expectOne('/api/config').flush({ theme: 'dark' });

  let theme = '';
  service.getConfig().subscribe(c => (theme = c.theme));
  httpMock.expectNone('/api/config');   // no network the second time
  expect(theme).toBe('dark');
});` } },
      { title: 'switchMap cancellation is visible on the TestRequest', html: `<p>When a new search starts, the old request should be cancelled. <code>TestRequest.cancelled</code> becomes true once the subscriber unsubscribes.</p>`,
        code: { lang: 'ts', code: `import { Subject } from 'rxjs';

it('cancels the stale search', () => {
  const terms = new Subject<string>();
  service.search(terms).subscribe();     // terms.pipe(switchMap(t => http.get(...)))
  terms.next('an');
  const first = httpMock.expectOne(r => r.url === '/api/search' && r.params.get('q') === 'an');
  terms.next('ang');
  const second = httpMock.expectOne(r => r.params.get('q') === 'ang');
  expect(first.cancelled).toBe(true);
  second.flush(['angular']);
});` } },
      { title: 'httpResource / resource with the testing backend', html: `<p><code>httpResource</code> (v19.2+, experimental at first) uses <code>HttpClient</code> under the hood, so the same controller works. Wait for stability before reading the value.</p>`,
        code: { lang: 'ts', code: `import { ApplicationRef } from '@angular/core';

it('loads a user through httpResource', async () => {
  const fixture = TestBed.createComponent(UserCardComponent);  // uses httpResource(() => '/api/users/' + id())
  fixture.componentRef.setInput('id', 3);
  fixture.detectChanges();
  TestBed.tick();                                   // let the resource issue its request
  httpMock.expectOne('/api/users/3').flush({ id: 3, name: 'Linus' });
  await TestBed.inject(ApplicationRef).whenStable();
  fixture.detectChanges();
  expect(fixture.nativeElement.textContent).toContain('Linus');
});` } }
    ],
    deepDive: `<p>🟣 <b>What provideHttpClientTesting really does.</b> It provides <code>HttpClientTestingBackend</code> as the <code>HttpBackend</code> (and as <code>HttpTestingController</code>). Your interceptors still run, because they sit in front of the backend. That makes these tests a nice <b>integration slice</b>: service + interceptors + serialisation, minus the network. If you register <code>provideHttpClientTesting()</code> <i>before</i> <code>provideHttpClient()</code>, the real backend provider wins and requests try to hit the network (or fail in jsdom).</p>
      <p>🟣 <b>Responses are not validated.</b> <code>flush({...})</code> accepts anything; TypeScript generics on <code>http.get&lt;User&gt;</code> are compile-time only. If the backend contract drifts, these tests still pass. Protect the boundary with runtime parsing (e.g. a zod schema in the service) and contract tests / generated clients from OpenAPI, and keep a few E2E tests against a real backend.</p>
      <p>🟣 <b>Progress and blobs.</b> <code>req.event(new HttpResponse(...))</code> and progress events (<code>HttpEventType.UploadProgress</code>) let you test upload progress bars. <code>flush</code> accepts <code>ArrayBuffer</code>/<code>Blob</code> for binary responses; set <code>responseType</code> in the request.</p>
      <p>🟣 <b>Alternatives.</b> Mock Service Worker (MSW) intercepts at the network layer and works across unit, component and E2E tests with one set of handlers; it is popular with Vitest/Jest. HttpTestingController remains the Angular-native, zero-dependency option and gives precise per-request assertions.</p>`,
    aiEra: `<p>🤖 Common AI-generated mistakes: <code>HttpClientTestingModule</code> in <code>imports</code> (deprecated), <code>provideHttpClientTesting()</code> listed before <code>provideHttpClient()</code>, missing <code>verify()</code>, and asserting before subscribing. Another subtle one: the AI mocks <code>HttpClient</code> itself with <code>jasmine.createSpyObj(['get'])</code>, which skips your interceptors and URL building — the test passes while the real request is wrong. Ask for HttpTestingController tests and check that each one asserts on the <b>request</b> (URL, params, headers, body), not just on the flushed response echoing back.</p>`,
    problems: [{
      title: 'Fake HTTP Backend with expectOne and verify',
      level: 'Medium', tags: ['http', 'test-doubles'], companies: ['Booking.com', 'Adobe'],
      statement: `<p>Implement <code>createBackend()</code> with <code>request(method, url, onResponse)</code> (what the client calls), and the test-side API <code>expectOne(matcher)</code>, <code>expectNone(matcher)</code>, <code>verify()</code>. A matcher is a URL string, <code>{method, url}</code>, or a predicate. <code>expectOne</code> throws unless exactly one <b>pending</b> request matches, removes it, and returns <code>{ request, flush(body, status=200) }</code>. <code>flush</code> calls <code>onResponse({ status, body })</code>. <code>verify</code> throws listing open requests.</p>`,
      constraints: `Up to 100 pending requests.`,
      example: `<p>Client sends GET /a and POST /b. <code>expectOne('/a').flush([1])</code> delivers ${H.c('g', '{status:200, body:[1]}')}. <code>verify()</code> throws ${H.c('r', '"Expected no open requests, found 1: POST /b"')}.</p>`,
      brute: { why: `<p>Stubbing <code>http.get</code> to return a fixed value hides the request entirely: you cannot assert the URL, method, or that no extra calls happened.</p>`,
        code: { lang: 'js', run: true, code: `const http = { get: () => ({ subscribe: fn => fn([1, 2]) }) };
http.get('/wrong/url').subscribe(v => console.log('passes anyway:', v));` } },
      mcq: { q: 'Why is <code>verify()</code> usually put in <code>afterEach</code>?', options: ['It is required to release memory', 'It fails a test that made an unexpected or unanswered request', 'It flushes all pending requests automatically'], answer: 1, explain: 'verify asserts there are no open requests — catching duplicate calls, missing expectations and accidental requests.' },
      hints: [
        `<p>Hint 1: normalise every matcher into a predicate <code>req =&gt; boolean</code>.</p>`,
        `<p>Hint 2: <code>expectOne</code> = filter pending; if count ≠ 1 throw a descriptive error; otherwise remove it from pending.</p>`,
        `<p>Hint 3: <code>verify</code> lists <code>METHOD url</code> of every pending request in the message.</p>`
      ],
      solution: {
        approach: `<p>A pending list plus matcher normalisation. The test drives responses explicitly, which is exactly the HttpTestingController contract.</p>`,
        code: { lang: 'js', run: true, code: `function createBackend() {
  let pending = [];
  const toPred = m => typeof m === 'function' ? m
    : typeof m === 'string' ? r => r.url === m
    : r => (!m.method || r.method === m.method) && r.url === m.url;
  const desc = r => r.method + ' ' + r.url;
  return {
    request(method, url, onResponse) { pending.push({ method, url, onResponse }); },
    expectOne(m) {
      const hits = pending.filter(toPred(m));
      if (hits.length !== 1) throw new Error('Expected one matching request for ' + JSON.stringify(m) + ', found ' + hits.length);
      const req = hits[0];
      pending = pending.filter(r => r !== req);
      return { request: req, flush: (body, status = 200) => req.onResponse({ status, body }) };
    },
    expectNone(m) {
      const hits = pending.filter(toPred(m));
      if (hits.length) throw new Error('Expected zero matching requests, found ' + hits.length);
    },
    verify() {
      if (pending.length) throw new Error('Expected no open requests, found ' + pending.length + ': ' + pending.map(desc).join(', '));
    }
  };
}

const be = createBackend();
be.request('GET', '/a', res => console.log('client got', JSON.stringify(res)));
be.request('POST', '/b', res => console.log('created', JSON.stringify(res)));
be.expectOne('/a').flush([1]);
be.expectNone({ method: 'GET', url: '/a' });
try { be.verify(); } catch (e) { console.log(e.message); }
be.expectOne({ method: 'POST', url: '/b' }).flush({ id: 7 }, 201);
be.verify(); console.log('verify passed');` },
        dry: { head: ['action', 'pending after', 'result'], rows: [['request GET /a', '[GET /a]', ''], ['request POST /b', '[GET /a, POST /b]', ''], ["expectOne('/a').flush([1])", '[POST /b]', 'client got 200 [1]'], ['verify()', '[POST /b]', 'throws'], ['expectOne POST /b, flush 201', '[]', 'created 201'], ['verify()', '[]', 'passes']] },
        complexity: `<p>O(P) per expectation for P pending requests.</p>`,
        followUps: ['Add <code>match()</code> returning all matches (for polling).', 'How would you model <code>req.error()</code> and <code>cancelled</code>?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 7 — Router & forms testing
     ===================================================================== */
  topics.push({
    title: 'Testing Routing (RouterTestingHarness, Guards, Resolvers) and Forms',
    analogy: `<p>Testing routes is like checking a <b>hotel's key-card system</b>. You do not rebuild the hotel; you take a test card, swipe it at door 305, and watch: does the door open, or does the alarm send you back to reception? <code>RouterTestingHarness</code> is the test card and a mini hotel corridor in one. Testing forms is like checking a <b>paper form at the post office counter</b>: hand it in with a missing signature and see that the clerk refuses it with the right reason, before anything is mailed.</p>`,
    explain: `<p>🟢 <b>Router: the plain idea.</b> Use the <b>real router</b> with your <b>real route config</b> (or a small test config) and navigate in the test. Since v15.2 the tool is <code>RouterTestingHarness</code>; <code>RouterTestingModule</code> is deprecated — use <code>provideRouter(routes)</code> in the providers.</p>
      ${H.table(['What to test', 'How'], [
        ['A routed component reads params', '<code>const h = await RouterTestingHarness.create(); const cmp = await h.navigateByUrl(\'/products/7\', ProductPage);</code> then check <code>h.routeNativeElement</code>'],
        ['A guard redirects', 'Navigate to the guarded URL, then <code>expect(TestBed.inject(Router).url).toBe(\'/login?returnUrl=%2Faccount\')</code>'],
        ['A guard function in isolation', '<code>TestBed.runInInjectionContext(() =&gt; authGuard(route, state))</code> and assert <code>true</code> or a <code>UrlTree</code>'],
        ['A resolver', 'Same: call it in an injection context with a fake service; or navigate and check the bound input'],
        ['A link navigates', 'Click the <code>routerLink</code> element, <code>await fixture.whenStable()</code>, check <code>Location.path()</code> or router url'],
        ['Component that injects <code>ActivatedRoute</code>', 'Prefer the harness. Or provide a fake: <code>{ provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: \'7\' })) } }</code>'],
      ])}
      <p>🔵 With <code>withComponentInputBinding()</code> in <code>provideRouter</code>, route params arrive as inputs. In unit tests of the component you can skip the router entirely and just <code>setInput('id', '7')</code>; keep one harness test for the wiring.</p>
      <p>🟢 <b>Forms: the plain idea.</b> Reactive forms are <b>plain objects</b>: most logic (validators, enabling fields, computed totals) is tested without any DOM, synchronously. Validators are pure functions: <code>expect(passwordMatch(group)).toEqual({ mismatch: true })</code>. Then add a few DOM tests that prove the template is wired: typing updates the control, errors are displayed after <code>touched</code>, submit is disabled while invalid.</p>
      ${H.table(['Forms test', 'Key detail'], [
        ['Reactive: model logic', '<code>form.setValue/patchValue</code>, assert <code>form.valid</code>, <code>form.errors</code>, <code>control.hasError(\'required\')</code>'],
        ['Reactive: template wiring', 'Set <code>input.value</code> + <code>dispatchEvent(new Event(\'input\'))</code>; blur for touched'],
        ['Template-driven (<code>ngModel</code>)', 'Controls are created <b>asynchronously</b>: <code>await fixture.whenStable()</code> after the first <code>detectChanges</code> before reading or writing values'],
        ['Async validators', 'Fake the service, use <code>fakeAsync</code> + <code>tick(debounce)</code>; status goes <code>PENDING</code> → <code>VALID/INVALID</code>'],
        ['Custom ControlValueAccessor', 'Host component with a <code>FormControl</code>: test <code>writeValue</code> (model → view), <code>onChange</code> (view → model), <code>setDisabledState</code>'],
      ])}`,
    clues: [
      '"Test that /account redirects to /login when logged out" → <code>RouterTestingHarness</code> + real routes + fake auth, assert router url',
      '"RouterTestingModule is deprecated" → <code>provideRouter(routes)</code> + <code>RouterTestingHarness</code>',
      '"Unit test a functional guard (CanActivateFn)" → <code>TestBed.runInInjectionContext(() =&gt; guard(route, state))</code>',
      '"Template-driven form value is empty in my test" → ngModel is async: <code>await fixture.whenStable()</code>',
      '"Test a cross-field validator" → call the validator function on a <code>FormGroup</code>; no DOM',
      '"Test a custom form control" → host component binding <code>[formControl]</code>; check both directions and disabled'
    ],
    code: [
      { lang: 'ts', title: 'routes.spec.ts — guard redirect and param rendering with RouterTestingHarness', code: `import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Component, input, signal } from '@angular/core';
import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';

@Component({ standalone: true, template: '<h1>Product {{ id() }}</h1>' })
class ProductPage { id = input<string>(); }
@Component({ standalone: true, template: '<h1>Account</h1>' })
class AccountPage {}
@Component({ standalone: true, template: '<h1>Login</h1>' })
class LoginPage {}

describe('routing', () => {
  const loggedIn = signal(false);

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'products/:id', component: ProductPage },
          { path: 'account', component: AccountPage, canActivate: [authGuard] },
          { path: 'login', component: LoginPage },
        ], withComponentInputBinding()),
        { provide: AuthService, useValue: { isLoggedIn: () => loggedIn() } },
      ],
    });
  });

  it('binds the :id param to the input', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/products/42', ProductPage);  // also asserts the component type
    expect(harness.routeNativeElement!.textContent).toContain('Product 42');
  });

  it('redirects logged-out users to /login with a returnUrl', async () => {
    loggedIn.set(false);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/account');
    expect(TestBed.inject(Router).url).toBe('/login?returnUrl=%2Faccount');
    expect(harness.routeNativeElement!.textContent).toContain('Login');
  });

  it('lets logged-in users in', async () => {
    loggedIn.set(true);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/account', AccountPage);
  });
});` },
      { lang: 'ts', title: 'signup.form.spec.ts — reactive form logic without the DOM', code: `import { FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';

export function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const p = group.get('password')?.value;
  const c = group.get('confirm')?.value;
  return p && c && p !== c ? { mismatch: true } : null;
}

export function buildSignupForm(fb: FormBuilder) {
  return fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirm: [''],
  }, { validators: passwordsMatch });
}

describe('signup form', () => {
  const form = () => buildSignupForm(new FormBuilder());  // FormBuilder needs no DI here

  it('is invalid when empty, with the right errors', () => {
    const f = form();
    expect(f.valid).toBe(false);
    expect(f.controls.email.hasError('required')).toBe(true);
  });

  it('flags a mismatch at group level', () => {
    const f = form();
    f.setValue({ email: 'a@b.co', password: 'longenough', confirm: 'different' });
    expect(f.hasError('mismatch')).toBe(true);
    f.controls.confirm.setValue('longenough');
    expect(f.valid).toBe(true);
  });
});` }
    ],
    viz: {
      title: 'RouterTestingHarness: navigate, run guards, land on a page',
      input: '/account loggedOut',
      inputLabel: 'URL and auth state: e.g. /account loggedOut, /account loggedIn, /products/42 loggedOut',
      gen: function (input) {
        var w = words(input, 2, 'Format: /account loggedOut');
        var url = w[0], auth = (w[1] || 'loggedOut');
        if (url.charAt(0) !== '/') throw new Error('URL must start with /');
        if (!/^logged(In|Out)$/.test(auth)) throw new Error('Auth state must be loggedIn or loggedOut');
        var inn = auth === 'loggedIn';
        var nodes = [{ id: 'h', label: 'harness', x: 8, y: 30, shape: 'box' }, { id: 'r', label: 'Router', x: 30, y: 30, shape: 'box' }, { id: 'g', label: 'authGuard', x: 54, y: 12, shape: 'box' }, { id: 'p', label: 'page', x: 80, y: 30, shape: 'box' }, { id: 'l', label: '/login', x: 80, y: 52, shape: 'box' }];
        var edges = [['h', 'r'], ['r', 'g'], ['r', 'p'], ['g', 'l']];
        var frames = [];
        function f(narr, hl, ehl, vals) { frames.push({ narr: narr, parts: [{ type: 'graph', directed: true, nodes: nodes, edges: edges, hl: hl, ehl: ehl }, { type: 'vars', label: 'test view', vals: vals }] }); }
        f('<code>RouterTestingHarness.create()</code> creates a root component with a <code>&lt;router-outlet&gt;</code> and uses the real router configured by <code>provideRouter(routes)</code>.', { h: 'cur' }, {}, { 'router.url': '/', 'auth': auth });
        f('<code>await harness.navigateByUrl(\'' + H.esc(url) + '\')</code>: the real router matches the URL against the test route config.', { h: 'ok', r: 'cur' }, { 'h-r': 'cur' }, { 'router.url': '(navigating)', 'auth': auth });
        var m = /^\/products\/([^\/]+)$/.exec(url);
        if (url === '/account') {
          f('The route has <code>canActivate: [authGuard]</code>. The guard runs with the <b>fake</b> AuthService we provided, so the test controls the answer.', { r: 'ok', g: 'cur' }, { 'r-g': 'cur' }, { 'router.url': '(guards)', 'isLoggedIn()': String(inn) });
          if (inn) f('Guard returns <code>true</code>. AccountPage is created in the outlet. <code>navigateByUrl(\'/account\', AccountPage)</code> also <b>asserts</b> the component type and returns the instance.', { g: 'ok', p: 'ok' }, { 'r-p': 'ok' }, { 'router.url': '/account', 'outlet shows': 'Account' });
          else f('Guard returns a <code>UrlTree</code> for <code>/login?returnUrl=%2Faccount</code>. The router cancels this navigation and starts a new one. The test asserts <code>router.url</code> and the rendered Login page.', { g: 'bad', l: 'ok' }, { 'g-l': 'bad' }, { 'router.url': '/login?returnUrl=%2Faccount', 'outlet shows': 'Login' });
        } else if (m) {
          f('No guard on <code>products/:id</code>. The param <code>id = "' + H.esc(m[1]) + '"</code> is captured.', { r: 'ok' }, { 'r-p': 'cur' }, { 'router.url': url, 'params': '{ id: "' + H.esc(m[1]) + '" }' });
          f('With <code>withComponentInputBinding()</code> the param is set on the <code>id</code> input. <code>harness.routeNativeElement</code> shows "Product ' + H.esc(m[1]) + '".', { p: 'ok' }, { 'r-p': 'ok' }, { 'router.url': url, 'outlet shows': 'Product ' + H.esc(m[1]) });
        } else {
          f('No route matches and the test config has no <code>**</code> route, so navigation <b>rejects</b> with "Cannot match any routes". In a test that is a useful failure: the URL or config is wrong.', { r: 'bad' }, {}, { 'router.url': '/', 'error': 'NG04002 Cannot match any routes' });
        }
        f('Assertions done. Each test creates a new harness, so routing state never leaks between tests.', { h: 'done' }, {}, { tip: 'test the guard function alone too, with runInInjectionContext' });
        return pad4(frames);
      }
    },
    examples: [
      { title: 'Unit-test a functional guard', html: `<p>The fastest guard test: no navigation at all. Build the arguments, call the guard in an injection context, and compare the <code>UrlTree</code> by serialising it.</p>`,
        code: { lang: 'ts', code: `import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';

it('returns a UrlTree to /login when logged out', () => {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), { provide: AuthService, useValue: { isLoggedIn: () => false } }],
  });
  const state = { url: '/account' } as RouterStateSnapshot;
  const result = TestBed.runInInjectionContext(() => authGuard({} as ActivatedRouteSnapshot, state));
  expect(result instanceof UrlTree).toBe(true);
  expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/login?returnUrl=%2Faccount');
});` } },
      { title: 'Template-driven form: wait for ngModel', html: `<p><code>NgModel</code> registers its control in a resolved promise, so values written right after the first CD are lost. Await stability first.</p>`,
        code: { lang: 'ts', code: `it('binds the name via ngModel', async () => {
  const fixture = TestBed.createComponent(ProfileFormComponent); // template: <input name="name" [(ngModel)]="name">
  fixture.detectChanges();
  await fixture.whenStable();                     // ngModel controls now exist
  const input: HTMLInputElement = fixture.nativeElement.querySelector('input[name=name]');
  input.value = 'Ada';
  input.dispatchEvent(new Event('input'));
  expect(fixture.componentInstance.name).toBe('Ada');
});` } },
      { title: 'Async validator with fakeAsync', html: `<p>A "username taken" validator debounces 400 ms and calls an API. Drive time and check status transitions.</p>`,
        code: { lang: 'ts', code: `import { fakeAsync, tick } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { of } from 'rxjs';
import { usernameAvailable } from './username.validator';

it('goes PENDING then INVALID for a taken name', fakeAsync(() => {
  const api = { isTaken: (n: string) => of(n === 'admin') };
  const ctrl = new FormControl('', { asyncValidators: [usernameAvailable(api)] });
  ctrl.setValue('admin');
  expect(ctrl.status).toBe('PENDING');
  tick(400);                                   // the validator's debounce
  expect(ctrl.status).toBe('INVALID');
  expect(ctrl.hasError('taken')).toBe(true);
}));` } }
    ],
    deepDive: `<p>🟣 <b>Why the harness beats mocking ActivatedRoute.</b> A hand-made <code>ActivatedRoute</code> fake must imitate <code>paramMap</code>, <code>snapshot</code>, <code>data</code>, <code>queryParamMap</code>, parent routes... and silently diverges from the real thing (e.g. the snapshot not updating on reuse). The harness runs real matching, guards, resolvers, input binding and route reuse, so tests catch config bugs (wrong param name, wrong order, missing <code>pathMatch: 'full'</code>). <code>harness.navigateByUrl</code> resolves after navigation and change detection; for lazy routes it loads the real chunk (fine in tests).</p>
      <p>🟣 <b>Location in tests.</b> <code>provideLocationMocks()</code> swaps <code>Location</code>/<code>LocationStrategy</code> for spy-able versions (<code>SpyLocation</code>), so tests can simulate back navigation (<code>location.back()</code>) without touching the browser history of the test runner.</p>
      <p>🟣 <b>Forms are mostly unit-level.</b> Since reactive forms are synchronous objects, the bulk of validation rules belong in plain unit tests (dozens of cases, milliseconds). Keep DOM tests for wiring and accessibility (error message linked with <code>aria-describedby</code>, focus moves to the first invalid field on submit). For a ControlValueAccessor, test the four contract methods; the most common bug is calling <code>onChange</code> inside <code>writeValue</code>, which makes the form dirty on load.</p>
      <p>🟣 <b>Signal forms.</b> Angular is experimenting with signal-based forms (v21 experimental). The testing approach stays the same: model logic as plain synchronous tests, a few DOM wiring tests.</p>`,
    aiEra: `<p>🤖 AI assistants still produce <code>RouterTestingModule.withRoutes([...])</code> and hand-rolled <code>ActivatedRoute</code> stubs from older tutorials. Ask for <code>RouterTestingHarness</code> and <code>provideRouter</code>. For forms, AI is excellent at generating validator case tables (valid and invalid emails, boundary password lengths); check that boundary values are actually on the boundary (7, 8, 9 characters for a minimum of 8). And ask it to include the <i>negative</i> route tests (redirects, 404s), which generated suites often skip.</p>`,
    problems: [{
      title: 'Test a Guard Decision Table',
      level: 'Easy', tags: ['router', 'guards', 'table-driven'], companies: ['Capgemini', 'Deloitte'],
      statement: `<p>Write <code>roleGuard(user, url)</code> and a tiny table-driven test runner. Rules: no user → redirect <code>'/login?returnUrl=' + encodeURIComponent(url)</code>; URL starting with <code>/admin</code> and role ≠ <code>'admin'</code> → <code>'/forbidden'</code>; otherwise <code>true</code>. Then run a table of <code>[user, url, expected]</code> cases and print PASS/FAIL per row.</p>`,
      constraints: `URLs are strings starting with <code>/</code>; user is <code>null</code> or <code>{ role }</code>.`,
      example: `<p><code>(null, '/admin/users')</code> → ${H.c('y', "'/login?returnUrl=%2Fadmin%2Fusers'")}; <code>({role:'user'}, '/admin')</code> → ${H.c('r', "'/forbidden'")}; <code>({role:'admin'}, '/admin')</code> → ${H.c('g', 'true')}.</p>`,
      brute: { why: `<p>Writing one <code>it()</code> per case by copy-paste works but hides the decision matrix; missing combinations (logged-out + admin URL) are easy to overlook.</p>`,
        code: { lang: 'js', run: true, code: `const g = (u, url) => (u ? true : '/login');
console.log(g(null, '/admin'), g({ role: 'user' }, '/admin')); // second should be /forbidden: untested combo` } },
      mcq: { q: 'Which order of checks is correct?', options: ['Role check first, then login check', 'Login check first, then role check', 'Order does not matter'], answer: 1, explain: 'A logged-out user has no role. Checking login first gives the helpful login redirect instead of "forbidden".' },
      hints: [
        `<p>Hint 1: write the rules top-down as early returns, most general failure first.</p>`,
        `<p>Hint 2: <code>encodeURIComponent('/admin')</code> is <code>%2Fadmin</code> — match the router's serialisation.</p>`,
        `<p>Hint 3: loop over a cases array, compare with <code>===</code>, count failures, and include boundary URLs like <code>/administrator</code> (does it start with /admin?).</p>`
      ],
      solution: {
        approach: `<p>Early-return guard and a data-driven test loop. The <code>/administrator</code> row shows how a table exposes a prefix bug: decide whether to match a path segment, not a raw prefix.</p>`,
        code: { lang: 'js', run: true, code: `function roleGuard(user, url) {
  if (!user) return '/login?returnUrl=' + encodeURIComponent(url);
  const isAdminArea = url === '/admin' || url.startsWith('/admin/');   // segment, not raw prefix
  if (isAdminArea && user.role !== 'admin') return '/forbidden';
  return true;
}
const cases = [
  [null, '/admin/users', '/login?returnUrl=%2Fadmin%2Fusers'],
  [{ role: 'user' }, '/admin', '/forbidden'],
  [{ role: 'admin' }, '/admin', true],
  [{ role: 'user' }, '/administrator', true],
  [{ role: 'user' }, '/shop', true],
];
let fails = 0;
for (const [user, url, expected] of cases) {
  const got = roleGuard(user, url);
  const ok = got === expected; if (!ok) fails++;
  console.log((ok ? 'PASS' : 'FAIL'), JSON.stringify(user), url, '->', got);
}
console.log(fails ? fails + ' failing' : 'all passed');` },
        dry: { head: ['user', 'url', 'result'], rows: [['null', '/admin/users', 'login redirect'], ['user', '/admin', '/forbidden'], ['admin', '/admin', 'true'], ['user', '/administrator', 'true (segment match)']] },
        complexity: `<p>O(1) per check; O(cases) for the table.</p>`,
        followUps: ['How would you run this table as an Angular spec with <code>runInInjectionContext</code>?', 'Should this guard be <code>canMatch</code> instead?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 8 — E2E with Playwright/Cypress, coverage, what to test
     ===================================================================== */
  topics.push({
    title: 'End-to-End Tests (Playwright/Cypress), Coverage & What Is Worth Testing',
    analogy: `<p>A restaurant checks quality at three levels. The chef <b>tastes each sauce</b> while cooking (unit tests: fast, many, cheap). The head chef <b>checks each plate</b> before it leaves the kitchen (component/integration tests). And once in a while a <b>mystery diner</b> books a table, orders, pays and reviews the whole evening (end-to-end tests: slow, few, but the only check that the whole experience works). A restaurant with only mystery diners finds problems weeks late; one with only sauce-tasting never notices the waiter forgot the table. <b>Coverage</b> is the list of dishes someone tasted — it says what was tasted, not whether anyone noticed it was too salty.</p>`,
    explain: `<p>🟢 <b>E2E tests</b> drive a real browser against the built app: open the page, click, type, and check what the user sees. Protractor (Angular's old E2E tool) was <b>deprecated in v12 and reached end of life in 2022</b>; <code>ng e2e</code> now asks you to add a builder. The two mainstream choices:</p>
      ${H.table(['', 'Playwright', 'Cypress'], [
        ['Add to Angular', '<code>ng add playwright-ng-schematics</code> or <code>npm init playwright</code>', '<code>ng add @cypress/schematic</code>'],
        ['Browsers', 'Chromium, Firefox, WebKit (Safari engine)', 'Chrome-family, Firefox, (WebKit experimental)'],
        ['Model', 'Runs outside the browser, async/await API, multiple tabs/origins, parallel workers by default', 'Runs inside the browser, chained commands, great time-travel debugger'],
        ['Waiting', 'Auto-waiting locators + web-first assertions (<code>await expect(locator).toHaveText()</code>)', 'Automatic retries of queries/assertions up to a timeout'],
        ['Network', '<code>page.route()</code> to mock or modify requests', '<code>cy.intercept()</code>'],
        ['Component testing', 'Experimental for some frameworks', 'Cypress Component Testing supports Angular'],
      ])}
      <p>🔵 <b>Stable E2E rules.</b> (1) Locate by what users see: <code>getByRole('button', { name: 'Checkout' })</code>, <code>getByLabel('Email')</code>; fall back to <code>data-testid</code>, never to generated CSS classes. (2) Never <code>sleep</code>/<code>cy.wait(3000)</code>; wait for a condition. (3) Each test creates its own data (API seeding or fixtures) and does not depend on test order. (4) Log in once via API and reuse storage state instead of typing the password in every test. (5) Keep E2E for <b>critical journeys</b>: sign-up, login, checkout, the money paths.</p>
      <p>🟢 <b>Coverage</b>: <code>ng test --code-coverage</code> (Karma/istanbul) or <code>ng test --coverage</code> with the Vitest builder writes a report of which <b>lines, statements, branches and functions</b> ran during tests. Set thresholds in config so CI fails if coverage drops. But 100% line coverage with no assertions proves nothing: <b>branch</b> coverage and <b>mutation testing</b> (StrykerJS: it changes your code, e.g. <code>&gt;</code> to <code>&gt;=</code>, and checks that some test fails) measure test <i>quality</i> much better.</p>
      <p>🔵 <b>What is worth testing?</b></p>
      ${H.table(['Test it', 'Usually skip'], [
        ['Business rules: prices, discounts, permissions, validation', 'Angular itself (that <code>computed</code> recomputes, that <code>*ngIf</code> hides)'],
        ['Components\' public behaviour: inputs → DOM, clicks → outputs', 'Private methods and internal state'],
        ['Error paths: 401, 500, empty lists, network down', 'Trivial getters, generated code, constants'],
        ['Bugs you fixed (a regression test per bug)', 'Snapshot tests of whole templates (they get blindly updated)'],
        ['Critical user journeys end-to-end', 'Every page and every variant end-to-end (slow, flaky, costly)'],
      ])}`,
    clues: [
      '"Protractor is dead, what do we use?" → Playwright or Cypress via <code>ng add</code>',
      '"E2E tests are flaky" → remove fixed sleeps, use role-based locators and auto-waiting assertions, isolate test data, mock third parties',
      '"Management wants 100% coverage" → explain line vs branch coverage, mutation testing, and diminishing returns; target critical code',
      '"Which tests should we write for this feature?" → pyramid/trophy: many unit, solid component/integration, few E2E on critical paths',
      '"Test failed only in CI" → timing, timezone/locale, test order dependence, shared data; run with the CI seed and trace viewer',
      '"Visual regressions slipped through" → screenshot comparisons (<code>toHaveScreenshot</code>) on stable, key screens only'
    ],
    code: [
      { lang: 'ts', title: 'e2e/checkout.spec.ts — Playwright test of a critical journey', code: `import { test, expect } from '@playwright/test';

test.describe('checkout', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the slow, third-party payment API; keep our own backend real.
    await page.route('**/payments/charge', route =>
      route.fulfill({ status: 200, json: { id: 'pay_123', status: 'succeeded' } }));
    await page.goto('/products');
  });

  test('a shopper can buy one item', async ({ page }) => {
    await page.getByRole('button', { name: 'Add Angular mug to cart' }).click();
    await expect(page.getByTestId('cart-count')).toHaveText('1');   // auto-waits, no sleep

    await page.getByRole('link', { name: 'Cart' }).click();
    await page.getByRole('button', { name: 'Checkout' }).click();
    await page.getByLabel('Email').fill('ada@example.com');
    await page.getByLabel('Card number').fill('4242 4242 4242 4242');
    await page.getByRole('button', { name: 'Pay' }).click();

    await expect(page).toHaveURL(/\\/orders\\/\\w+/);
    await expect(page.getByRole('heading', { name: 'Thank you!' })).toBeVisible();
  });

  test('shows a friendly error when payment fails', async ({ page }) => {
    await page.route('**/payments/charge', route => route.fulfill({ status: 402, json: { error: 'card_declined' } }));
    await page.goto('/checkout?demo=1');
    await page.getByRole('button', { name: 'Pay' }).click();
    await expect(page.getByRole('alert')).toContainText('declined');
  });
});` },
      { lang: 'ts', title: 'cypress/e2e/login.cy.ts — the same ideas in Cypress', code: `describe('login', () => {
  it('logs in and lands on the dashboard', () => {
    cy.intercept('POST', '/api/login', { statusCode: 200, body: { token: 't' } }).as('login');
    cy.visit('/login');
    cy.findByLabelText('Email').type('ada@example.com');    // @testing-library/cypress
    cy.findByLabelText('Password').type('correct horse');
    cy.findByRole('button', { name: 'Sign in' }).click();
    cy.wait('@login').its('request.body').should('deep.include', { email: 'ada@example.com' });
    cy.location('pathname').should('eq', '/dashboard');     // retried until true or timeout
  });
});` }
    ],
    viz: {
      title: 'Test portfolio: speed vs confidence for a suite',
      input: 'unit:300 component:80 e2e:12',
      inputLabel: 'Test counts as unit:N component:N e2e:N (each 0..2000)',
      gen: function (input) {
        var w = words(input, 3, 'Format: unit:300 component:80 e2e:12'), c = { unit: 0, component: 0, e2e: 0 };
        w.forEach(function (x) { var p = x.split(':'), n = Number(p[1]); if (!(p[0] in c) || !isFinite(n) || n < 0 || n > 2000) throw new Error('Use unit:N component:N e2e:N with N from 0 to 2000'); c[p[0]] = Math.round(n); });
        var ms = { unit: 5, component: 60, e2e: 8000 }, flake = { unit: 0.0001, component: 0.001, e2e: 0.01 };
        var secs = function (k) { return Math.round(c[k] * ms[k] / 100) / 10; };
        var frames = [];
        var bars = function (hl) { return { type: 'bars', label: 'number of tests', values: [c.unit, c.component, c.e2e], idxLabels: ['unit', 'component', 'e2e'], hl: hl || {} }; };
        frames.push({ narr: 'Your suite: ' + c.unit + ' unit, ' + c.component + ' component, ' + c.e2e + ' E2E tests. A healthy suite is usually wide at the bottom (many fast unit tests) and narrow at the top.', parts: [bars()] });
        frames.push({ narr: '<b>Unit</b> tests (pure logic, services, pipes) take about 5 ms each: ' + secs('unit') + ' s total. They pinpoint the broken function, but each one proves only a small piece.', parts: [bars({ 0: 'ok' }), { type: 'vars', label: 'unit', vals: { 'time (s)': secs('unit'), 'proves': 'logic is right' } }] });
        frames.push({ narr: '<b>Component/integration</b> tests (TestBed, harnesses, HttpTestingController) take about 60 ms each: ' + secs('component') + ' s. They prove the template, DI and HTTP wiring work together — often the best value per test.', parts: [bars({ 1: 'ok' }), { type: 'vars', label: 'component', vals: { 'time (s)': secs('component'), 'proves': 'pieces work together' } }] });
        frames.push({ narr: '<b>E2E</b> tests take about 8 s each in a real browser: ' + secs('e2e') + ' s serial (parallel workers help). Highest confidence per test, slowest, and the most flaky.', parts: [bars({ 2: 'cur' }), { type: 'vars', label: 'e2e', vals: { 'time (s)': secs('e2e'), 'proves': 'the user journey works' } }] });
        var pFlaky = 1 - Math.pow(1 - flake.unit, c.unit) * Math.pow(1 - flake.component, c.component) * Math.pow(1 - flake.e2e, c.e2e);
        var total = Math.round((secs('unit') + secs('component') + secs('e2e')) * 10) / 10;
        var verdict = c.e2e > c.component ? H.c('r', 'Ice-cream cone: more E2E than component tests. Slow and flaky; push checks down a level.') : c.unit + c.component === 0 ? H.c('r', 'No fast tests at all. Every bug is found late.') : H.c('g', 'Pyramid/trophy shape: fast feedback with a few journey checks on top.');
        frames.push({ narr: 'Total serial run time ≈ ' + total + ' s. With rough flake rates (0.01% / 0.1% / 1% per test), the chance at least one test flakes in a run is about <b>' + Math.round(pFlaky * 100) + '%</b>. ' + verdict, parts: [bars(), { type: 'vars', label: 'suite', vals: { 'total time (s)': total, 'P(any flaky failure)': Math.round(pFlaky * 100) + '%' }, hl: { 'P(any flaky failure)': pFlaky > 0.2 ? 'bad' : 'ok' } }] });
        return pad4(frames);
      }
    },
    examples: [
      { title: 'Coverage thresholds in the Vitest builder', html: `<p>Fail CI when coverage drops, but pick thresholds you can defend (and exclude generated code). Branch coverage catches missing <code>else</code> paths that line coverage hides. Option names below follow the v21 Vitest builder; run <code>ng test --help</code> on your version, and with Karma use <code>--code-coverage</code> plus <code>check</code> in <code>karma.conf.js</code>.</p>`,
        code: { lang: 'json', code: `{
  "projects": {
    "shop": {
      "architect": {
        "test": {
          "builder": "@angular/build:unit-test",
          "options": {
            "runner": "vitest",
            "coverage": true,
            "coverageInclude": ["src/app/**/*.ts"],
            "coverageExclude": ["src/app/**/*.routes.ts", "src/app/**/generated/**"],
            "coverageThresholds": { "statements": 80, "branches": 75, "functions": 80, "lines": 80 }
          }
        }
      }
    }
  }
}` } },
      { title: '100% coverage, zero value', html: `<p>This test executes every line of <code>applyDiscount</code>, so line coverage is 100%. It asserts nothing, so a mutation (changing <code>&gt;=</code> to <code>&gt;</code>) survives. Mutation testing would flag it.</p>`,
        code: { lang: 'ts', code: `export function applyDiscount(total: number): number {
  return total >= 100 ? total * 0.9 : total;
}

it('runs applyDiscount', () => {
  applyDiscount(150);
  applyDiscount(50);          // both branches executed, nothing checked
});

it('gives 10% off at exactly 100 (boundary) and not below', () => {
  expect(applyDiscount(100)).toBe(90);   // kills the ">" mutant
  expect(applyDiscount(99.99)).toBe(99.99);
});` } },
      { title: 'Log in once, reuse the session (Playwright setup project)', html: `<p>Typing credentials in every E2E test is slow and brittle. A setup project logs in once and saves cookies/localStorage; other tests start authenticated.</p>`,
        code: { lang: 'ts', code: `// auth.setup.ts
import { test as setup, expect } from '@playwright/test';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(process.env['E2E_USER'] ?? 'qa@example.com');
  await page.getByLabel('Password').fill(process.env['E2E_PASS'] ?? 'not-a-real-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL('/dashboard');
  await page.context().storageState({ path: 'playwright/.auth/user.json' });
});
// playwright.config.ts: projects: [{ name: 'setup', testMatch: /auth\\.setup\\.ts/ },
//   { name: 'chromium', use: { storageState: 'playwright/.auth/user.json' }, dependencies: ['setup'] }]` } }
    ],
    deepDive: `<p>🟣 <b>Pyramid vs trophy.</b> The classic pyramid says "mostly unit". Kent C. Dodds' testing trophy argues for <b>mostly integration</b> (component tests with real children and fake network), because they give the most confidence per minute in UI code. In Angular terms: TestBed component tests with harnesses and HttpTestingController are your workhorse; pure unit tests for complex logic; E2E for a handful of journeys; static analysis (strict TypeScript, ESLint, template type checking) as the wide base that catches whole classes of bugs for free.</p>
      <p>🟣 <b>Flakiness is a bug.</b> Track flaky tests (Playwright retries + reports mark them "flaky"), quarantine and fix them; a suite people re-run until green trains everyone to ignore red. Common roots: real time (use fake clocks or <code>page.clock</code>), animations (disable with <code>provideNoopAnimations</code> or <code>reducedMotion</code>), shared test data, third-party scripts, and order-dependent state. Jasmine and Vitest can run tests in <b>random order</b>, which exposes hidden dependencies.</p>
      <p>🟣 <b>Contract and visual tests.</b> Between unit and E2E sit <b>contract tests</b> (Pact, or schema checks against the OpenAPI spec) that catch backend drift without a full browser, and <b>visual regression</b> tests (Playwright <code>toHaveScreenshot</code>, Chromatic for Storybook) for CSS breakage that DOM assertions miss. Accessibility checks (axe-core via <code>@axe-core/playwright</code>) can run in the same E2E suite.</p>
      <p>🟣 <b>CI shape.</b> Run lint + unit + component tests on every push (minutes), E2E against a preview deployment on PRs (sharded across workers), and a nightly cross-browser run. Upload Playwright traces on failure: they show DOM snapshots, network and console for each step.</p>`,
    aiEra: `<p>🤖 AI changes the economics: writing a test now costs seconds, so the bottleneck becomes <b>deciding what to test and judging whether a test is meaningful</b>. Generated suites love high coverage numbers with weak assertions, and E2E tests with <code>waitForTimeout</code> and CSS selectors. Use AI for the boring parts (Playwright codegen and AI-assisted test generation from a recorded journey, fixture data, mocks), then apply the rules: role-based locators, no sleeps, one behaviour per test. Mutation testing is a great referee for AI-written tests: if mutants survive, the AI's tests are decoration. Also expect interviewers to ask how you test AI features themselves (streaming responses, non-deterministic text): assert on structure and invariants, mock the model at the HTTP boundary, and keep a small set of golden examples.</p>`,
    problems: [{
      title: 'Line Coverage vs Branch Coverage Calculator',
      level: 'Medium', tags: ['coverage', 'metrics'], companies: ['Microsoft', 'Uber'],
      statement: `<p>A function is described as a list of statements; some are <code>if</code> statements with two branches (<code>T</code>/<code>F</code>). Given the statement list and the execution traces of several tests (each trace lists executed statement ids and, for each <code>if</code>, the branch taken), compute <b>statement coverage %</b> and <b>branch coverage %</b>, and list uncovered branches.</p>`,
      constraints: `Up to 200 statements, 100 traces. Round percentages to one decimal.`,
      example: `<p>Statements 1..4 where 2 is an <code>if</code>. One test runs 1,2(T),3,4. Statement coverage ${H.c('g', '100%')} but branch coverage ${H.c('r', '50%')}: the <code>F</code> branch of statement 2 never ran.</p>`,
      brute: { why: `<p>Counting only executed lines reports 100% and hides the untested <code>else</code> path, which is exactly where off-by-one and null bugs live.</p>`,
        code: { lang: 'js', run: true, code: `const stmts = [1, 2, 3, 4], ran = new Set([1, 2, 3, 4]);
console.log('line coverage', 100 * [...ran].length / stmts.length + '%', '(but else-branch never tested)');` } },
      mcq: { q: 'A test suite has 100% statement coverage. What can you conclude?', options: ['All branches were taken', 'Every statement ran at least once, nothing more', 'The code has no bugs'], answer: 1, explain: 'Statement coverage says nothing about branches not taken or about whether assertions check the results.' },
      hints: [
        `<p>Hint 1: collect the union of executed statement ids across all traces.</p>`,
        `<p>Hint 2: for branches, collect a set of strings like <code>"2:T"</code>. The universe is every <code>if</code> id × {T, F}.</p>`,
        `<p>Hint 3: uncovered branches = universe minus taken; percentages = covered / total × 100, guard against division by zero.</p>`
      ],
      solution: {
        approach: `<p>Two set unions and two set differences. Istanbul (used by Karma, Jest and Vitest's istanbul/v8 providers) tracks exactly these counters per file: statements, branches, functions, lines.</p>`,
        code: { lang: 'js', run: true, code: `function coverage(statements, traces) {
  const ran = new Set(), taken = new Set();
  for (const t of traces) {
    t.stmts.forEach(id => ran.add(id));
    Object.entries(t.branches || {}).forEach(([id, b]) => taken.add(id + ':' + b));
  }
  const ifs = statements.filter(s => s.type === 'if').map(s => s.id);
  const universe = ifs.flatMap(id => [id + ':T', id + ':F']);
  const pct = (a, b) => (b === 0 ? 100 : Math.round((1000 * a) / b) / 10);
  return {
    statements: pct(statements.filter(s => ran.has(s.id)).length, statements.length),
    branches: pct(universe.filter(b => taken.has(b)).length, universe.length),
    uncovered: universe.filter(b => !taken.has(b)),
  };
}
const fn = [{ id: 1 }, { id: 2, type: 'if' }, { id: 3 }, { id: 4 }, { id: 5, type: 'if' }, { id: 6 }];
console.log(coverage(fn, [{ stmts: [1, 2, 3, 4, 5, 6], branches: { 2: 'T', 5: 'T' } }]));
console.log(coverage(fn, [{ stmts: [1, 2, 3, 4, 5, 6], branches: { 2: 'T', 5: 'T' } }, { stmts: [1, 2, 4, 5], branches: { 2: 'F', 5: 'F' } }]));` },
        dry: { head: ['traces', 'statements %', 'branches %', 'uncovered'], rows: [['T1', '100', '50', '2:F, 5:F'], ['T1 + T2', '100', '100', 'none']] },
        complexity: `<p>O(total trace length + statements).</p>`,
        followUps: ['How does mutation testing go beyond branch coverage?', 'Why might you exclude some files from coverage?']
      }
    }]
  });

  /* =====================================================================
     PRACTICE ARENA
     ===================================================================== */
  practice.push({
    title: 'Write toEqual (Deep Equality for Assertions)',
    level: 'Easy', tags: ['assertions', 'equality'], companies: ['TCS', 'Infosys'],
    statement: `<p>Implement <code>deepEqual(a, b)</code> like Jasmine/Vitest <code>toEqual</code> for plain data: primitives compared with <code>Object.is</code> (so <code>NaN</code> equals <code>NaN</code>), arrays element by element, plain objects by the same set of keys and equal values (key order does not matter). Then write <code>expectEqual(actual, expected)</code> that throws <code>"Expected X to equal Y"</code> using JSON.</p>`,
    constraints: `Values are JSON-like plus NaN. No cycles. Depth ≤ 50.`,
    example: `<p><code>deepEqual({a:[1,{b:2}]}, {a:[1,{b:2}]})</code> → ${H.c('g', 'true')}. <code>deepEqual([1,2],[2,1])</code> → ${H.c('r', 'false')}. <code>deepEqual({a:1},{a:1,b:undefined})</code> → ${H.c('r', 'false')} (different key sets).</p>`,
    brute: { why: `<p><code>JSON.stringify(a) === JSON.stringify(b)</code> fails when key order differs and treats <code>NaN</code> as <code>null</code>, so <code>{x: NaN}</code> "equals" <code>{x: null}</code>.</p>`,
      code: { lang: 'js', run: true, code: `const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
console.log(eq({ a: 1, b: 2 }, { b: 2, a: 1 }), eq({ x: NaN }, { x: null })); // false, true -> both wrong` } },
    mcq: { q: 'Which assertion should compare two separately created objects with the same content?', options: ['<code>toBe</code>', '<code>toEqual</code>', 'Either'], answer: 1, explain: '<code>toBe</code> checks identity (<code>Object.is</code>); two different objects are never identical.' },
    hints: [
      `<p>Hint 1: handle the easy case first: if <code>Object.is(a, b)</code> return true; if either is not an object, return false.</p>`,
      `<p>Hint 2: arrays must both be arrays with equal length; recurse on each index.</p>`,
      `<p>Hint 3: for objects compare <code>Object.keys</code> lengths, then check every key of <code>a</code> exists in <code>b</code> and recurse.</p>`
    ],
    solution: {
      approach: `<p>Recursive structural comparison. Real matchers also handle Dates, Maps, Sets, class instances and asymmetric matchers like <code>jasmine.any(Number)</code> / <code>expect.any(Number)</code>.</p>`,
      code: { lang: 'js', run: true, code: `function deepEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) return a.length === b.length && a.every((x, i) => deepEqual(x, b[i]));
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every(k => Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k]));
}
function expectEqual(actual, expected) {
  if (!deepEqual(actual, expected)) throw new Error('Expected ' + JSON.stringify(actual) + ' to equal ' + JSON.stringify(expected));
}
console.log(deepEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] }), deepEqual([1, 2], [2, 1]), deepEqual({ a: 1 }, { a: 1, b: undefined }), deepEqual(NaN, NaN));
try { expectEqual({ total: 20 }, { total: 21 }); } catch (e) { console.log(e.message); }` },
      complexity: `<p>O(size of the structures).</p>`
    }
  });

  practice.push({
    title: 'Table-Driven Tests for a Truncate Pipe',
    level: 'Easy', tags: ['pipes', 'table-driven', 'edge-cases'], companies: ['Wipro', 'Cognizant'],
    statement: `<p>Implement <code>truncate(value, limit, suffix = '…')</code> like a pure Angular pipe's <code>transform</code>: <code>null</code>/<code>undefined</code> → <code>''</code>; strings not longer than <code>limit</code> are unchanged; otherwise cut to <code>limit</code> characters, trim trailing spaces, and add the suffix. Then run a table of at least 6 cases (including boundaries) and print PASS/FAIL.</p>`,
    constraints: `0 ≤ limit ≤ 1000.`,
    example: `<p><code>('hello world', 5)</code> → ${H.c('g', "'hello…'")}; <code>('hello world', 6)</code> → ${H.c('g', "'hello…'")} (trailing space trimmed); <code>('hi', 2)</code> → ${H.c('g', "'hi'")} (exactly at the limit).</p>`,
    brute: { why: `<p>Testing only one "happy" input (<code>'hello world', 5</code>) leaves the boundary (length == limit), null input and trailing-space cases unverified — those are where bugs hide.</p>`,
      code: { lang: 'js', run: true, code: `const t = (v, n) => v.slice(0, n) + '…';
console.log(t('hello world', 5)); // looks fine...
console.log(t('hi', 2));          // 'hi…' -> bug at the boundary, never tested` } },
    mcq: { q: 'Why test <code>length === limit</code> specifically?', options: ['It is the most common input', 'Off-by-one errors live exactly at boundaries', 'Angular requires it'], answer: 1, explain: 'Use &lt; vs &lt;= mistakes show up only at the boundary value.' },
    hints: [
      `<p>Hint 1: guard null/undefined first and return an empty string.</p>`,
      `<p>Hint 2: compare <code>value.length &lt;= limit</code> for the unchanged case; otherwise <code>slice(0, limit).trimEnd() + suffix</code>.</p>`,
      `<p>Hint 3: cases: null, empty, shorter, equal, one longer, trailing space at the cut, custom suffix, limit 0.</p>`
    ],
    solution: {
      approach: `<p>Small pure function + a data table. In an Angular spec, the same table drives <code>for (const [v, n, exp] of cases) it(...)</code> with <code>new TruncatePipe()</code>.</p>`,
      code: { lang: 'js', run: true, code: `function truncate(value, limit, suffix = '…') {
  if (value == null) return '';
  if (value.length <= limit) return value;
  return value.slice(0, limit).trimEnd() + suffix;
}
const cases = [
  [null, 5, '…', ''], ['', 5, '…', ''], ['hi', 5, '…', 'hi'], ['hi', 2, '…', 'hi'],
  ['hey', 2, '…', 'he…'], ['hello world', 6, '…', 'hello…'], ['abcdef', 3, '...', 'abc...'], ['abc', 0, '…', '…'],
];
for (const [v, n, s, exp] of cases) {
  const got = truncate(v, n, s);
  console.log(got === exp ? 'PASS' : 'FAIL', JSON.stringify(v), n, '->', JSON.stringify(got));
}` },
      complexity: `<p>O(limit) per call, O(cases) for the table.</p>`
    }
  });

  practice.push({
    title: 'Parse a Simple Marble Diagram',
    level: 'Easy', tags: ['rxjs', 'marbles', 'parsing'], companies: ['Google', 'Spotify'],
    statement: `<p>Parse a marble string (simple subset, run mode) into notifications: <code>-</code> advances one frame; a letter emits that letter at the current frame and advances one; <code>|</code> completes; <code>#</code> errors. Return an array of <code>{ frame, kind: 'N'|'C'|'E', value? }</code>. Ignore spaces.</p>`,
    constraints: `Length ≤ 200. No groups or time progression in this version.`,
    example: `<p><code>'-a--b-|'</code> → ${H.c('g', "[{1,N,a}, {4,N,b}, {6,C}]")}.</p>`,
    brute: { why: `<p>Using the string index as the frame breaks as soon as spaces are added for alignment (spaces take no time in run mode).</p>`,
      code: { lang: 'js', run: true, code: `const s = '-a  -b|';
console.log([...s].map((c, i) => c >= 'a' && c <= 'z' ? c + '@' + i : null).filter(Boolean)); // b@5, but should be 3` } },
    mcq: { q: 'In <code>TestScheduler.run</code>, how much virtual time does <code>-</code> represent?', options: ['10 ms', '1 ms (one frame)', 'Nothing'], answer: 1, explain: 'In run mode every frame is 1 virtual millisecond.' },
    hints: [
      `<p>Hint 1: keep a <code>frame</code> counter separate from the string index.</p>`,
      `<p>Hint 2: skip spaces without advancing; every other character advances the frame by one after it is handled.</p>`,
      `<p>Hint 3: <code>|</code> and <code>#</code> also occupy a frame, and nothing should be emitted after them (stop parsing).</p>`
    ],
    solution: {
      approach: `<p>Single pass with a frame counter. This is the core of RxJS <code>TestScheduler.parseMarbles</code>; the full version adds groups, time progression and subscription markers.</p>`,
      code: { lang: 'js', run: true, code: `function parseMarbles(m) {
  const out = []; let frame = 0;
  for (const c of m) {
    if (c === ' ') continue;
    if (c === '|') { out.push({ frame, kind: 'C' }); break; }
    if (c === '#') { out.push({ frame, kind: 'E' }); break; }
    if (c !== '-') out.push({ frame, kind: 'N', value: c });
    frame++;
  }
  return out;
}
console.log(JSON.stringify(parseMarbles('-a--b-|')));
console.log(JSON.stringify(parseMarbles('-a  -b|')));
console.log(JSON.stringify(parseMarbles('ab#c')));` },
      complexity: `<p>O(length) time, single pass over the string.</p>`
    }
  });

  practice.push({
    title: 'Debounce Under a Virtual Clock',
    level: 'Medium', tags: ['debounce', 'fakeAsync', 'timers'], companies: ['Amazon', 'Flipkart'],
    statement: `<p>Implement <code>debounce(fn, ms, clock)</code> using an injected clock (<code>clock.setTimeout</code>/<code>clearTimeout</code>), so it can be tested in virtual time. Then simulate: keystrokes <code>'a'@0, 'ab'@100, 'abc'@250, 'abcd'@700</code> with 300 ms debounce and report which values were emitted and when.</p>`,
    constraints: `Use the clock from the topic (or a compact version). Times ≤ 10<sup>5</sup>.`,
    example: `<p>Emits ${H.c('g', "'abc' @550")} and ${H.c('g', "'abcd' @1000")}. 'a' and 'ab' were cancelled by later keystrokes within 300 ms.</p>`,
    brute: { why: `<p>Calling the real <code>setTimeout</code> means the test must actually wait about a second per run and becomes flaky on slow CI machines.</p>`,
      code: { lang: 'js', run: true, code: `const start = Date.now();
setTimeout(() => console.log('real wait took', Date.now() - start >= 300 ? '>=300ms' : 'less?'), 300);` } },
    mcq: { q: 'Why inject the clock instead of calling global <code>setTimeout</code>?', options: ['Global timers are slower', 'So tests can control time deterministically', 'Angular forbids global timers'], answer: 1, explain: 'Dependency injection of time (a clock token, or fakeAsync patching globals) makes timing deterministic.' },
    hints: [
      `<p>Hint 1: keep the pending timer id in a closure; each call clears it and schedules a new one.</p>`,
      `<p>Hint 2: the clock needs <code>setTimeout</code>, <code>clearTimeout</code>, <code>now</code> and <code>tick(ms)</code> that runs due timers in order.</p>`,
      `<p>Hint 3: drive the simulation by ticking to each keystroke time, calling the debounced function, and finally ticking past the last one.</p>`
    ],
    solution: {
      approach: `<p>Debounce = cancel-and-reschedule. With a virtual clock the test is exact to the millisecond; this mirrors <code>fakeAsync</code> + <code>tick</code> and Angular's practice of injecting time-related services through tokens.</p>`,
      code: { lang: 'js', run: true, code: `function makeClock() {
  let now = 0, id = 0, timers = [];
  return {
    now: () => now,
    setTimeout(fn, ms) { timers.push({ id: ++id, at: now + ms, fn }); return id; },
    clearTimeout(x) { timers = timers.filter(t => t.id !== x); },
    tick(ms) {
      const target = now + ms;
      for (;;) {
        const due = timers.filter(t => t.at <= target).sort((a, b) => a.at - b.at || a.id - b.id)[0];
        if (!due) break;
        timers = timers.filter(t => t !== due); now = due.at; due.fn();
      }
      now = target;
    }
  };
}
function debounce(fn, ms, clock) {
  let pending = null;
  return (...args) => { if (pending) clock.clearTimeout(pending); pending = clock.setTimeout(() => { pending = null; fn(...args); }, ms); };
}
const clock = makeClock(), out = [];
const search = debounce(v => out.push(v + ' @' + clock.now()), 300, clock);
for (const [v, t] of [['a', 0], ['ab', 100], ['abc', 250], ['abcd', 700]]) { clock.tick(t - clock.now()); search(v); }
clock.tick(1000);
console.log(out);` },
      complexity: `<p>O(1) per call plus timer bookkeeping.</p>`
    }
  });

  practice.push({
    title: 'Find Flaky Tests from CI History',
    level: 'Medium', tags: ['flaky', 'ci', 'hashmap'], companies: ['Meta', 'Shopify'],
    statement: `<p>Given CI results <code>{ commit, test, status: 'pass'|'fail' }</code>, a test is <b>flaky</b> if on the <b>same commit</b> it both passed and failed. Return flaky tests sorted by the number of commits where they flaked (desc, then name), with that count.</p>`,
    constraints: `Up to 10<sup>5</sup> results.`,
    example: `<p>c1: login pass, login fail; c2: login fail, login pass; c2: cart fail (only) → ${H.c('y', '[login: 2]')}. cart failed consistently on c2: a real failure, not flake.</p>`,
    brute: { why: `<p>Calling anything that ever failed "flaky" mixes real regressions with flakes; real bugs then get retried and ignored.</p>`,
      code: { lang: 'js', run: true, code: `const r = [{ test: 'cart', status: 'fail' }, { test: 'login', status: 'fail' }];
console.log([...new Set(r.filter(x => x.status === 'fail').map(x => x.test))]); // cart is a real bug, not flaky` } },
    mcq: { q: 'Why group by commit?', options: ['To save memory', 'Same code + different outcome = non-determinism; different commits may have real changes', 'CI requires it'], answer: 1, explain: 'Flakiness means the outcome changes without the code changing.' },
    hints: [
      `<p>Hint 1: key a map by <code>test + '|' + commit</code> and record which statuses were seen.</p>`,
      `<p>Hint 2: a key is flaky if its set has both pass and fail.</p>`,
      `<p>Hint 3: count flaky keys per test, then sort by count desc, name asc.</p>`
    ],
    solution: {
      approach: `<p>Two-level grouping with sets. Playwright and many CI systems do this automatically when retries are enabled (a test that fails then passes on retry is marked "flaky").</p>`,
      code: { lang: 'js', run: true, code: `function flakyTests(results) {
  const seen = new Map();
  for (const r of results) {
    const k = r.test + '|' + r.commit;
    if (!seen.has(k)) seen.set(k, new Set());
    seen.get(k).add(r.status);
  }
  const count = new Map();
  for (const [k, s] of seen) if (s.has('pass') && s.has('fail')) { const t = k.split('|')[0]; count.set(t, (count.get(t) || 0) + 1); }
  return [...count].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([test, n]) => ({ test, n }));
}
console.log(flakyTests([
  { commit: 'c1', test: 'login', status: 'pass' }, { commit: 'c1', test: 'login', status: 'fail' },
  { commit: 'c2', test: 'login', status: 'fail' }, { commit: 'c2', test: 'login', status: 'pass' },
  { commit: 'c2', test: 'cart', status: 'fail' }, { commit: 'c3', test: 'search', status: 'pass' }, { commit: 'c3', test: 'search', status: 'fail' },
]));` },
      complexity: `<p>O(R + T log T) for R results and T distinct flaky tests.</p>`
    }
  });

  practice.push({
    title: 'Pick Affected Spec Files from a Change',
    level: 'Medium', tags: ['ci', 'graph', 'bfs'], companies: ['Google', 'Nx-style monorepos'],
    statement: `<p>You have an import graph <code>{ file: [imports...] }</code>. Given changed files, return every <code>*.spec.ts</code> file that imports (directly or transitively) any changed file, or is itself changed. This is how <code>vitest --changed</code> / <code>jest --onlyChanged</code> / Nx "affected" keep CI fast.</p>`,
    constraints: `Up to 10<sup>4</sup> files; the graph may contain cycles.`,
    example: `<p><code>cart.spec → cart.service → price.api</code>, <code>header.spec → header.cmp</code>. Changing <code>price.api</code> → ${H.c('g', '[cart.spec.ts]')}.</p>`,
    brute: { why: `<p>Running the whole suite on every commit is correct but slow; for each spec, a separate DFS to see if it reaches a changed file is O(S × (V+E)).</p>`,
      code: { lang: 'js', run: true, code: `console.log('brute: for each spec, DFS all imports... repeated work for shared dependencies');` } },
    mcq: { q: 'Which direction should the search go for efficiency?', options: ['From every spec forward', 'From changed files backwards along reversed import edges', 'Random'], answer: 1, explain: 'Reverse the graph once, then BFS from the (few) changed files.' },
    hints: [
      `<p>Hint 1: build a reverse map: for each import edge a → b, record b → a ("who imports me").</p>`,
      `<p>Hint 2: BFS from all changed files over the reverse map with a visited set (handles cycles).</p>`,
      `<p>Hint 3: filter visited files ending in <code>.spec.ts</code>, sort for stable output.</p>`
    ],
    solution: {
      approach: `<p>Reverse edges + multi-source BFS. Every visited file is affected; specs among them must run.</p>`,
      code: { lang: 'js', run: true, code: `function affectedSpecs(graph, changed) {
  const rev = new Map();
  for (const [f, deps] of Object.entries(graph)) for (const d of deps) { if (!rev.has(d)) rev.set(d, []); rev.get(d).push(f); }
  const seen = new Set(changed), q = [...changed];
  while (q.length) { const f = q.shift(); for (const p of rev.get(f) || []) if (!seen.has(p)) { seen.add(p); q.push(p); } }
  return [...seen].filter(f => f.endsWith('.spec.ts')).sort();
}
const g = {
  'cart.spec.ts': ['cart.service.ts'], 'cart.service.ts': ['price.api.ts'], 'price.api.ts': ['http.ts'],
  'header.spec.ts': ['header.cmp.ts'], 'header.cmp.ts': ['cart.service.ts'], 'a.ts': ['b.ts'], 'b.ts': ['a.ts'],
};
console.log(affectedSpecs(g, ['price.api.ts']));
console.log(affectedSpecs(g, ['a.ts']));` },
      complexity: `<p>O(V + E) for V files and E import edges, computed once per change set.</p>`
    }
  });

  practice.push({
    title: 'Diff Two Marble Timelines',
    level: 'Medium', tags: ['rxjs', 'marbles', 'diff'], companies: ['Microsoft', 'Bloomberg'],
    statement: `<p>Given two notification arrays (actual and expected) in the shape <code>{ frame, kind, value? }</code>, return a readable diff like TestScheduler prints: lines prefixed <code>-</code> for expected-only and <code>+</code> for actual-only, sorted by frame. Return <code>[]</code> when equal.</p>`,
    constraints: `Up to 1000 notifications each.`,
    example: `<p>expected <code>[{1,N,a},{5,N,b},{6,C}]</code>, actual <code>[{1,N,a},{4,N,b},{6,C}]</code> → ${H.c('r', "['+ 4 N b', '- 5 N b']")}: b came one frame early.</p>`,
    brute: { why: `<p>Printing the two full arrays as JSON forces the developer to compare long lists by eye; one frame off in 30 notifications is invisible.</p>`,
      code: { lang: 'js', run: true, code: `console.log(JSON.stringify([{ frame: 1, kind: 'N', value: 'a' }, { frame: 5, kind: 'N', value: 'b' }]), 'vs', JSON.stringify([{ frame: 1, kind: 'N', value: 'a' }, { frame: 4, kind: 'N', value: 'b' }]));` } },
    mcq: { q: 'A marble test fails with b at frame 4 instead of 5. Most likely cause?', options: ['A bug in RxJS', 'A miscounted marble (e.g. a group or a missing dash)', 'Jasmine is slow'], answer: 1, explain: 'Off-by-one frames almost always come from counting the diagram wrong.' },
    hints: [
      `<p>Hint 1: turn each notification into a canonical string key like <code>"5 N b"</code>.</p>`,
      `<p>Hint 2: use multisets (count maps) so duplicates are handled.</p>`,
      `<p>Hint 3: output expected-only with '-', actual-only with '+', sorted by frame then sign.</p>`
    ],
    solution: {
      approach: `<p>Multiset difference on canonical keys, then sort. Good failure messages are a feature of good test tools.</p>`,
      code: { lang: 'js', run: true, code: `function marbleDiff(actual, expected) {
  const key = n => n.frame + ' ' + n.kind + (n.value !== undefined ? ' ' + n.value : '');
  const count = list => list.reduce((m, n) => m.set(key(n), (m.get(key(n)) || 0) + 1), new Map());
  const a = count(actual), e = count(expected), out = [];
  for (const [k, c] of e) for (let i = 0; i < c - (a.get(k) || 0); i++) out.push(['-', k]);
  for (const [k, c] of a) for (let i = 0; i < c - (e.get(k) || 0); i++) out.push(['+', k]);
  return out.sort((x, y) => parseInt(x[1]) - parseInt(y[1]) || (x[0] === '-' ? -1 : 1)).map(([s, k]) => s + ' ' + k);
}
const E = [{ frame: 1, kind: 'N', value: 'a' }, { frame: 5, kind: 'N', value: 'b' }, { frame: 6, kind: 'C' }];
const A = [{ frame: 1, kind: 'N', value: 'a' }, { frame: 4, kind: 'N', value: 'b' }, { frame: 6, kind: 'C' }];
console.log(marbleDiff(A, E));
console.log(marbleDiff(E, E));` },
      complexity: `<p>O(n log n) for n notifications, dominated by the final sort.</p>`
    }
  });

  practice.push({
    title: 'Mini Mutation Testing',
    level: 'Medium', tags: ['mutation-testing', 'coverage', 'test-quality'], companies: ['Thoughtworks', 'ING'],
    statement: `<p>Given a function source string and a test function <code>(fn) =&gt; boolean</code>, generate mutants by swapping one operator at a time (<code>&gt;=</code>↔<code>&gt;</code>, <code>&lt;=</code>↔<code>&lt;</code>, <code>+</code>↔<code>-</code>, <code>*</code>↔<code>/</code>). A mutant is <b>killed</b> if the tests fail on it. Report the mutation score (killed / total) and the surviving mutants.</p>`,
    constraints: `Source is a small single-expression arrow function. Use <code>new Function</code> to build mutants.`,
    example: `<p><code>t =&gt; t &gt;= 100 ? t * 0.9 : t</code> with a weak test (only 150 and 50) leaves the <code>&gt;=</code>→<code>&gt;</code> mutant ${H.c('r', 'alive')}; adding the boundary case 100 kills it.</p>`,
    brute: { why: `<p>Line coverage says 100% for the weak test because both branches ran. It cannot tell that the boundary is unchecked.</p>`,
      code: { lang: 'js', run: true, code: `const f = t => (t >= 100 ? t * 0.9 : t);
f(150); f(50);
console.log('both branches ran: 100% branch coverage, yet the boundary 100 is untested');` } },
    mcq: { q: 'A mutant survives. What does that tell you?', options: ['The code is wrong', 'No test distinguishes the mutated behaviour from the original', 'The mutation tool failed'], answer: 1, explain: 'Survivors point to missing or weak assertions (or to equivalent mutants that cannot be distinguished).' },
    hints: [
      `<p>Hint 1: find every operator position with a regex; produce one mutant per position.</p>`,
      `<p>Hint 2: build each mutant with <code>new Function('return ' + src)()</code> and run the tests in try/catch.</p>`,
      `<p>Hint 3: match longer operators first (<code>&gt;=</code> before <code>&gt;</code>) so you do not mutate half of an operator.</p>`
    ],
    solution: {
      approach: `<p>Generate single-point mutants, run the suite on each, count kills. StrykerJS does this on real TypeScript (with an Angular/Karma/Vitest runner) and many more mutators.</p>`,
      code: { lang: 'js', run: true, code: `const SWAP = { '>=': '>', '>': '>=', '<=': '<', '<': '<=', '+': '-', '-': '+', '*': '/', '/': '*' };
function mutants(src) {
  const out = [], re = />=|<=|=>|>|<|\\+|-|\\*|\\//g;
  let m;
  while ((m = re.exec(src))) {
    if (m[0] === '=>') continue;                         // never mutate the arrow itself
    out.push({ at: m.index, desc: m[0] + ' -> ' + SWAP[m[0]], src: src.slice(0, m.index) + SWAP[m[0]] + src.slice(m.index + m[0].length) });
  }
  return out;
}
function mutationScore(src, tests) {
  const ms = mutants(src), survivors = [];
  for (const mu of ms) {
    let killed;
    try { killed = !tests(new Function('return ' + mu.src)()); } catch (e) { killed = true; }
    if (!killed) survivors.push(mu.desc + ' @' + mu.at);
  }
  return { score: (ms.length - survivors.length) + '/' + ms.length, survivors };
}
const src = 't => t >= 100 ? t * 0.9 : t';
const weak = f => Math.abs(f(150) - 135) < 1e-9 && f(50) === 50;
const strong = f => weak(f) && f(100) === 90 && f(99) === 99;
console.log('weak  ', mutationScore(src, weak));
console.log('strong', mutationScore(src, strong));` },
      complexity: `<p>O(M × T) for M mutants and test time T — why real tools use coverage data to run only relevant tests per mutant.</p>`
    }
  });

  practice.push({
    title: 'Full Marble Parser: Groups and Time Progression',
    level: 'Hard', tags: ['rxjs', 'marbles', 'parsing'], companies: ['Google', 'Microsoft'],
    statement: `<p>Extend the marble parser to RxJS run-mode rules: spaces ignored; <code>-</code>, letters, <code>|</code>, <code>#</code> each take one frame; a group <code>(ab)</code> emits all its members at the frame of <code>(</code>, and every character of the group, including both parentheses, advances one frame; a time progression <code>Nms</code>, <code>Ns</code> or <code>Nm</code> that starts the string or follows a space and is followed by a space (or the end) advances N milliseconds (s = 1000, m = 60000). Return notifications <code>{ frame, kind, value? }</code>.</p>`,
    constraints: `Length ≤ 500. Values are single letters.`,
    example: `<p><code>'-(ab)-c|'</code> → a@1, b@1, c@6, complete@7. <code>'a 299ms b'</code> → a@0, ${H.c('g', 'b@300')}. <code>'2003ms #'</code> → error@2003.</p>`,
    brute: { why: `<p>Treating a group as zero-width (<code>(ab)</code> = 1 frame) gives c@3 instead of c@6 — exactly the miscount that makes marble tests fail mysteriously.</p>`,
      code: { lang: 'js', run: true, code: `// wrong: group counted as one frame
let f = 0; const out = [];
for (const c of '-(ab)-c|') { if (c === '(' || c === ')') continue; if (/[a-z]/.test(c)) out.push(c + '@' + f); f++; }
console.log(out); // a@1 b@2 c@4 -> all wrong` } },
    mcq: { q: 'In run mode, at which frame does <code>c</code> emit in <code>\'-(ab)-c\'</code>?', options: ['3', '4', '6'], answer: 2, explain: '"-" 0, "(" 1 (group emits a,b at 1), "a" 2, "b" 3, ")" 4, "-" 5, "c" 6.' },
    hints: [
      `<p>Hint 1: keep <code>frame</code> and <code>groupStart</code> (−1 outside a group). Emissions use <code>groupStart</code> when inside a group.</p>`,
      `<p>Hint 2: on a digit at the start or after a space, try the regex <code>/^(\\d+(?:\\.\\d+)?)(ms|s|m)(?= |$)/</code> on the rest of the string; if it matches, advance by the duration and skip it.</p>`,
      `<p>Hint 3: every non-space character still advances one frame after being handled, including parentheses.</p>`
    ],
    solution: {
      approach: `<p>One pass, a small state machine (in group or not) and a lookahead for time progression. Same rules as <code>TestScheduler.parseMarbles</code> in run mode.</p>`,
      code: { lang: 'js', run: true, code: `function parse(m) {
  const out = []; let frame = 0, group = -1;
  for (let i = 0; i < m.length; i++) {
    const c = m[i];
    if (c === ' ') continue;
    if (/[0-9]/.test(c) && (i === 0 || m[i - 1] === ' ')) {
      const t = m.slice(i).match(/^(\\d+(?:\\.\\d+)?)(ms|s|m)(?= |$)/);
      if (t) {
        const n = parseFloat(t[1]);
        frame += t[2] === 'ms' ? n : t[2] === 's' ? n * 1000 : n * 60000;
        i += t[0].length - 1;
        continue;
      }
    }
    const at = group >= 0 ? group : frame;
    if (c === '(') group = frame;
    else if (c === ')') group = -1;
    else if (c === '|') out.push({ frame: at, kind: 'C' });
    else if (c === '#') out.push({ frame: at, kind: 'E' });
    else if (c !== '-') out.push({ frame: at, kind: 'N', value: c });
    frame++;
  }
  return out;
}
const show = s => console.log(s.padEnd(14), parse(s).map(n => (n.value || n.kind) + '@' + n.frame).join(' '));
show('-(ab)-c|');
show('a 299ms b');
show('2003ms #');
show('a 50ms b 349ms b 400ms c');` },
      complexity: `<p>O(length) time, one pass, O(notifications) output.</p>`
    }
  });

  practice.push({
    title: 'debounceTime on a Marble Timeline',
    level: 'Hard', tags: ['rxjs', 'debounceTime', 'virtual-time'], companies: ['Netflix', 'Atlassian'],
    statement: `<p>Given source notifications <code>{ frame, kind, value? }</code> (from a marble) and a duration <code>D</code>, compute the output of <code>debounceTime(D)</code>: a value is emitted at <code>frame + D</code> if no newer value arrives before that frame (a newer value at a frame <b>strictly less</b> than the due frame cancels it). On complete, a pending value is emitted immediately at the completion frame, then complete. On error, the pending value is dropped and the error is forwarded.</p>`,
    constraints: `Up to 10<sup>4</sup> notifications sorted by frame.`,
    example: `<p>Source a@0, b@1, c@5, complete@20 with D=3 → ${H.c('g', 'b@4, c@8, complete@20')}. With complete@6 → ${H.c('g', 'b@4, c@6 (flushed), complete@6')}.</p>`,
    brute: { why: `<p>Simulating every millisecond with a loop is O(total time), which explodes for <code>debounceTime(5000)</code> over long timelines.</p>`,
      code: { lang: 'js', run: true, code: `let steps = 0; for (let t = 0; t < 1e6; t++) steps++;
console.log('ms-by-ms simulation steps:', steps);` } },
    mcq: { q: 'Source completes while a value is still waiting in debounceTime. What happens?', options: ['The value is dropped', 'The value is emitted immediately, then complete', 'Complete waits D ms'], answer: 1, explain: 'debounceTime flushes the last pending value on completion.' },
    hints: [
      `<p>Hint 1: keep one pending <code>{ value, due }</code>. Before handling each source notification, emit the pending value if its due frame is at or before the current frame.</p>`,
      `<p>Hint 2: for a value: if pending exists and its due ≤ current frame, emit it at <code>due</code> first; then replace pending.</p>`,
      `<p>Hint 3: complete: flush pending (emitting at due if due ≤ frame, else at the completion frame), then emit complete. Error: drop pending, forward.</p>`
    ],
    solution: {
      approach: `<p>Event-driven simulation: only notification frames matter, so the work is O(n). This is exactly what TestScheduler does in virtual time, and why marble tests of debounce run instantly.</p>`,
      code: { lang: 'js', run: true, code: `function debounceTimeline(src, D) {
  const out = []; let pending = null;
  const settle = frame => { if (pending && pending.due <= frame) { out.push({ frame: pending.due, kind: 'N', value: pending.value }); pending = null; } };
  for (const n of src) {
    settle(n.frame);
    if (n.kind === 'N') pending = { value: n.value, due: n.frame + D };
    else if (n.kind === 'C') {
      if (pending) out.push({ frame: n.frame, kind: 'N', value: pending.value });
      pending = null; out.push({ frame: n.frame, kind: 'C' }); return out;
    } else { pending = null; out.push({ frame: n.frame, kind: 'E' }); return out; }
  }
  if (pending) out.push({ frame: pending.due, kind: 'N', value: pending.value });   // source never completes
  return out;
}
const fmt = l => l.map(n => (n.value || n.kind) + '@' + n.frame).join(' ');
const N = (frame, value) => ({ frame, kind: 'N', value });
console.log(fmt(debounceTimeline([N(0, 'a'), N(1, 'b'), N(5, 'c'), { frame: 20, kind: 'C' }], 3)));
console.log(fmt(debounceTimeline([N(0, 'a'), N(1, 'b'), N(5, 'c'), { frame: 6, kind: 'C' }], 3)));
console.log(fmt(debounceTimeline([N(0, 'a'), N(2, 'b'), { frame: 3, kind: 'E' }], 3)));` },
      complexity: `<p>O(n) time, O(1) extra space.</p>`
    }
  });

  practice.push({
    title: 'Hook Execution Order for Nested describe Blocks',
    level: 'Hard', tags: ['jasmine', 'vitest', 'test-runner', 'tree'], companies: ['Amazon', 'SAP'],
    statement: `<p>A suite is a tree: <code>{ name, beforeAll, beforeEach, afterEach, afterAll, tests: [names], children: [suites] }</code> (hooks optional). Produce the exact execution log a Jasmine/Vitest runner would produce: on entering a suite run its <code>beforeAll</code>; for each test run all <code>beforeEach</code> from outermost to innermost, the test, then all <code>afterEach</code> from innermost to outermost; tests of a suite run before its child suites; on leaving run <code>afterAll</code>.</p>`,
    constraints: `Depth ≤ 20, up to 500 tests.`,
    example: `<p>outer(bE1, aE1, test A) with inner(bE2, aE2, test B) → <code>bA-outer, bE1, A, aE1, bE1, bE2, B, aE2, aE1, aA-outer</code>.</p>`,
    brute: { why: `<p>Running only the test's own suite hooks misses the outer <code>beforeEach</code> (e.g. the outer <code>TestBed.configureTestingModule</code>) — the classic "works in the outer describe, fails in the nested one" confusion.</p>`,
      code: { lang: 'js', run: true, code: `console.log(['bE2', 'B', 'aE2'], '<- missing outer bE1/aE1 around B');` } },
    mcq: { q: 'An outer <code>beforeEach</code> configures TestBed and an inner one overrides a provider. Which runs first for an inner test?', options: ['Inner', 'Outer', 'They run in parallel'], answer: 1, explain: 'beforeEach hooks run outermost first, so the inner hook can refine what the outer one set up (before the module is compiled).' },
    hints: [
      `<p>Hint 1: recurse with a stack (array) of ancestor suites; the stack gives you the hook chain for each test.</p>`,
      `<p>Hint 2: for a test, map the stack forward for beforeEach and in reverse for afterEach.</p>`,
      `<p>Hint 3: beforeAll before the suite's tests and children, afterAll after both; skip missing hooks.</p>`
    ],
    solution: {
      approach: `<p>DFS carrying the ancestor chain. Knowing this order explains why <code>TestBed.overrideProvider</code> must happen in an inner <code>beforeEach</code> before the outer one calls <code>createComponent</code> — or the module is already compiled.</p>`,
      code: { lang: 'js', run: true, code: `function runOrder(root) {
  const log = [];
  (function visit(suite, chain) {
    const stack = chain.concat([suite]);
    if (suite.beforeAll) log.push(suite.beforeAll);
    for (const t of suite.tests || []) {
      stack.forEach(s => s.beforeEach && log.push(s.beforeEach));
      log.push(t);
      stack.slice().reverse().forEach(s => s.afterEach && log.push(s.afterEach));
    }
    for (const c of suite.children || []) visit(c, stack);
    if (suite.afterAll) log.push(suite.afterAll);
  })(root, []);
  return log;
}
const suite = {
  name: 'outer', beforeAll: 'bA-outer', beforeEach: 'bE1', afterEach: 'aE1', afterAll: 'aA-outer', tests: ['A'],
  children: [{ name: 'inner', beforeEach: 'bE2', afterEach: 'aE2', tests: ['B', 'C'], children: [{ name: 'deep', beforeEach: 'bE3', tests: ['D'] }] }],
};
console.log(runOrder(suite).join(', '));` },
      complexity: `<p>O(tests × depth): each test walks its ancestor chain twice.</p>`
    }
  });

  practice.push({
    title: 'Shard E2E Tests Across CI Workers',
    level: 'Hard', tags: ['ci', 'scheduling', 'greedy', 'heap'], companies: ['Uber', 'Stripe'],
    statement: `<p>Given E2E test durations (seconds) and <code>k</code> workers, assign tests to workers to minimise the slowest worker's total (the wall-clock time of the CI job). Implement the <b>LPT</b> greedy (longest processing time first: sort descending, always give the next test to the currently least-loaded worker) and compare it with naive round-robin by file order.</p>`,
    constraints: `Up to 10<sup>4</sup> tests, 1 ≤ k ≤ 64.`,
    example: `<p>Durations in file order <code>[30, 5, 30, 5, 5, 5]</code>, k=2. Round-robin puts both 30s on worker 1: ${H.c('r', '65 / 15')}, so CI waits 65 s. LPT gives ${H.c('g', '40 / 40')}, whatever the file order.</p>`,
    brute: { why: `<p>Trying every assignment is k<sup>n</sup>; the exact problem is NP-hard (multiprocessor scheduling). Round-robin ignores durations and can put all slow tests on one worker.</p>`,
      code: { lang: 'js', run: true, code: `function roundRobin(d, k) { const w = Array(k).fill(0); d.forEach((x, i) => (w[i % k] += x)); return w; }
console.log(roundRobin([30, 5, 30, 5, 5, 5], 2)); // [65, 15]` } },
    mcq: { q: 'Why sort longest-first before greedy assignment?', options: ['It looks tidy', 'Big jobs placed last cannot be balanced; placing them first lets small jobs fill the gaps', 'Sorting is required by Playwright'], answer: 1, explain: 'LPT is guaranteed within 4/3 of optimal; plain greedy in arbitrary order can be up to 2× worse.' },
    hints: [
      `<p>Hint 1: sort durations descending so the biggest, hardest-to-place tests are assigned first.</p>`,
      `<p>Hint 2: keep worker loads; for each test pick the worker with the minimum load (a min-heap for large k, a linear scan is fine for k ≤ 64).</p>`,
      `<p>Hint 3: return the per-worker lists and the makespan (max load); compare with round-robin to show the gain.</p>`
    ],
    solution: {
      approach: `<p>LPT greedy. Playwright's <code>--shard=i/n</code> splits by file order; teams with very uneven specs feed historic durations into a custom splitter like this (CircleCI and others offer timing-based splitting).</p>`,
      code: { lang: 'js', run: true, code: `function lpt(durations, k) {
  const workers = Array.from({ length: k }, () => ({ load: 0, tests: [] }));
  const order = durations.map((d, i) => ({ d, i })).sort((a, b) => b.d - a.d || a.i - b.i);
  for (const t of order) {
    let best = workers[0];
    for (const w of workers) if (w.load < best.load) best = w;
    best.load += t.d; best.tests.push('t' + t.i + '(' + t.d + ')');
  }
  return { makespan: Math.max(...workers.map(w => w.load)), workers };
}
function roundRobin(d, k) { const w = Array(k).fill(0); d.forEach((x, i) => (w[i % k] += x)); return Math.max(...w); }
const d = [30, 5, 30, 5, 5, 5];
console.log('round-robin makespan', roundRobin(d, 2));
const r = lpt(d, 2);
console.log('LPT makespan', r.makespan, r.workers.map(w => w.tests.join(' ')));
const big = Array.from({ length: 40 }, (_, i) => ((i * 37) % 23) + 2);
console.log('40 tests on 4 workers: RR', roundRobin(big, 4), 'LPT', lpt(big, 4).makespan, 'lower bound', Math.ceil(big.reduce((a, b) => a + b) / 4));` },
      complexity: `<p>O(n log n + n·k), or O(n log n + n log k) with a heap.</p>`
    }
  });

  /* =====================================================================
     QUIZ
     ===================================================================== */
  quiz.push({ q: 'A service uses <code>private api = inject(PriceApi)</code>. A spec does <code>const s = new CartService()</code>. What happens?',
    options: ['It works; inject() returns undefined', 'It throws because inject() must run in an injection context', 'It works only with Jest', 'Angular creates a fake PriceApi automatically'], answer: 1,
    explain: 'Use <code>TestBed.inject(CartService)</code> (with a provider for PriceApi) or <code>TestBed.runInInjectionContext(() =&gt; new CartService())</code>.' });
  quiz.push({ q: 'Which statement about Karma in 2025–2026 Angular projects is accurate?',
    options: ['Karma is the default for new projects in v21', 'Karma is deprecated; v21 makes Vitest the default runner for new projects', 'Karma was replaced by Protractor', 'TestBed only works with Karma'], answer: 1,
    explain: 'Karma was deprecated in 2023. The <code>@angular/build:unit-test</code> builder runs Vitest (experimental in v20, default in v21). TestBed works with any runner.' });
  quiz.push({ q: 'An OnPush component test does <code>fixture.componentInstance.title = \'New\'; fixture.detectChanges();</code> and the DOM still shows the old title. Best fix?',
    options: ['Call detectChanges twice', 'Use <code>fixture.componentRef.setInput(\'title\', \'New\')</code>', 'Switch the component to Default change detection', 'Wrap the test in fakeAsync'], answer: 1,
    explain: 'setInput goes through the same path as a parent binding and marks the OnPush view dirty. It also works for signal inputs, which cannot be assigned.' });
  quiz.push({ q: 'Why do Angular Material harness methods return Promises?',
    options: ['Because Material components are lazy-loaded', 'They auto-run change detection and wait for stability, and must work in async environments like browser E2E', 'To slow tests down to human speed', 'Promises are required by Jasmine'], answer: 1,
    explain: 'Each action is wrapped in stabilization (detectChanges + whenStable), and the same harness API can run in different environments.' });
  quiz.push({ q: 'A dialog opened by the component is not found by <code>TestbedHarnessEnvironment.loader(fixture)</code>. Why?',
    options: ['Dialogs cannot be tested', 'The dialog renders in an overlay on <code>document.body</code>, outside the fixture; use <code>documentRootLoader</code>', 'You must call flush() first', 'Harnesses only find buttons'], answer: 1,
    explain: 'CDK overlays live in <code>.cdk-overlay-container</code> on the body. The document-root loader searches the whole document.' });
  quiz.push({ q: 'In a service test, a signal changes and the service\'s <code>effect()</code> should write to storage. The spy shows no call yet. What do you add (Angular 20)?',
    options: ['<code>tick(0)</code>', '<code>TestBed.tick()</code>', '<code>effect.run()</code>', 'Nothing; effects run synchronously'], answer: 1,
    explain: 'Effects are scheduled. <code>TestBed.tick()</code> runs them (v17–19 used <code>TestBed.flushEffects()</code>, deprecated in v20). Component effects also flush with change detection.' });
  quiz.push({ q: 'Reading a <code>computed()</code> right after changing its source signal in a test returns…',
    options: ['The old value until change detection runs', 'The fresh value, because computeds recalculate lazily on read', 'undefined', 'A Promise'], answer: 1,
    explain: 'Computed signals are pull-based and synchronous: a read after a write always sees the new value.' });
  quiz.push({ q: 'In <code>TestScheduler.run</code>, at which frame is <code>b</code> emitted in <code>\'a 9ms b\'</code>?',
    options: ['9', '10', '11', '19'], answer: 1,
    explain: '<code>a</code> is at frame 0 and takes 1 frame; the space is ignored; <code>9ms</code> advances 9 more frames, so <code>b</code> is at 10.' });
  quiz.push({ q: 'A fakeAsync test ends with "1 periodic timer(s) still in the queue". What is the cleanest fix?',
    options: ['Add tick(100000)', 'Destroy the component/unsubscribe so the interval stops, or call discardPeriodicTasks()', 'Switch to waitForAsync', 'Ignore it; it is a warning'], answer: 1,
    explain: 'An interval never ends on its own, so flush() cannot drain it. Stop it the way the app would (destroy), or discard periodic tasks explicitly.' });
  quiz.push({ q: 'Which provider order is correct for HTTP tests?',
    options: ['<code>provideHttpClientTesting()</code> then <code>provideHttpClient()</code>', '<code>provideHttpClient()</code> then <code>provideHttpClientTesting()</code>', 'Only <code>HttpClientTestingModule</code>', 'Order never matters'], answer: 1,
    explain: 'The testing provider overrides the backend, so it must come after the real client providers.' });
  quiz.push({ q: 'A test calls <code>service.getUser(1)</code> without subscribing, then <code>httpMock.expectOne(\'/api/users/1\')</code>. Result?',
    options: ['Passes', 'Fails: no request was made because HttpClient observables are cold', 'Times out after 5 seconds', 'Makes a real network request'], answer: 1,
    explain: 'No subscription, no request. Subscribe first, then expectOne, then flush.' });
  quiz.push({ q: 'What is the modern replacement for <code>RouterTestingModule</code> when testing navigation?',
    options: ['<code>provideRouter(routes)</code> + <code>RouterTestingHarness</code>', '<code>RouterModule.forRoot</code> in declarations', 'Mocking Router.navigate with a spy only', 'Protractor'], answer: 0,
    explain: '<code>RouterTestingHarness.create()</code> plus real routes runs real matching, guards and resolvers; <code>navigateByUrl</code> resolves after navigation.' });
  quiz.push({ q: 'In a template-driven form test, setting the input value right after the first <code>detectChanges()</code> does nothing. Why?',
    options: ['ngModel registers its control asynchronously; await fixture.whenStable() first', 'Template-driven forms cannot be tested', 'You must use setInput', 'The input needs a data-testid'], answer: 0,
    explain: 'NgModel sets up its FormControl in a resolved promise. Wait for stability before interacting.' });
  quiz.push({ q: 'Your suite has 100% line coverage. What does that guarantee?',
    options: ['No bugs', 'Every branch is tested', 'Every line executed at least once during tests, nothing about assertions', 'Mutation score is 100%'], answer: 2,
    explain: 'Coverage measures execution, not verification. Branch coverage and mutation testing say more about test quality.' });
  quiz.push({ q: 'Which E2E practice most reduces flakiness?',
    options: ['Adding <code>waitForTimeout(3000)</code> before assertions', 'Role-based locators with auto-waiting assertions and isolated test data', 'Running tests in a fixed order', 'Using generated CSS class selectors'], answer: 1,
    explain: 'Wait for conditions, not time; locate by what users see; never share mutable data between tests.' });

  /* =====================================================================
     INTERVIEW
     ===================================================================== */
  interview.push({ q: 'How do you unit test an Angular service that depends on HttpClient and another service?', level: 'B',
    a: `<p>I configure <code>TestBed</code> with the real service and fakes for its neighbours: <code>provideHttpClient()</code> then <code>provideHttpClientTesting()</code> for HTTP, and <code>{ provide: Logger, useValue: fakeLogger }</code> for the other dependency. I get the service with <code>TestBed.inject</code> and the controller with <code>TestBed.inject(HttpTestingController)</code>. Each test subscribes, uses <code>expectOne</code> to assert method/URL/headers/body, <code>flush</code>es a response or error, and asserts what the subscriber received. <code>afterEach</code> calls <code>verify()</code> to catch unexpected requests. I fake boundaries (network, time, storage) and keep pure collaborators real.</p>`,
    followUps: ['How would you test retry logic?', 'Why not just mock HttpClient.get with a spy?', 'What does verify() catch?'] });
  interview.push({ q: 'Karma is deprecated. How would you migrate a large Angular test suite, and what changes?', level: 'I',
    a: `<p>TestBed, fixtures, harnesses, HttpTestingController and RouterTestingHarness stay the same, so the migration is mostly about the runner and mocks. For Angular 20/21 I would move to the <code>@angular/build:unit-test</code> builder with Vitest (or Jest via jest-preset-angular if the team already uses it). Steps: switch the builder in <code>angular.json</code>; replace Jasmine-specific APIs (<code>jasmine.createSpyObj</code> → objects of <code>vi.fn()</code>, <code>and.returnValue</code> → <code>mockReturnValue</code>, <code>jasmine.any</code> → <code>expect.any</code>) with a codemod; decide on <code>fakeAsync</code> (needs zone.js) vs runner fake timers for zoneless code; check tests relying on real browser behaviour (layout, IntersectionObserver), which may need jsdom polyfills or Vitest browser mode; run both runners in CI in parallel for a while and migrate folder by folder.</p>`,
    followUps: ['What breaks when moving from a real browser to jsdom?', 'How do you handle fakeAsync in a zoneless app?', 'How would you measure the speed gain?'] });
  interview.push({ q: 'Walk me through testing a component with inputs, outputs and OnPush.', level: 'I',
    a: `<p>Create the fixture with <code>TestBed.createComponent</code>, set inputs with <code>fixture.componentRef.setInput</code> (it marks OnPush views dirty and works for signal inputs, which are read-only), then trigger change detection (<code>detectChanges</code>, or <code>await fixture.whenStable()</code> when zoneless). Interact through the DOM: <code>click()</code>, set an input's value and dispatch an <code>input</code> event. Assert the DOM and outputs: subscribe a spy to the <code>output()</code>/<code>EventEmitter</code>, or use a host component binding <code>(changed)="..."</code> to also cover the public name. I avoid asserting private fields and I stub heavy children with <code>overrideComponent</code>.</p>`,
    followUps: ['Why does assigning an input directly fail with OnPush?', 'When would you use a host component?', 'DebugElement.triggerEventHandler vs a real click?'] });
  interview.push({ q: 'What are component harnesses and when are they worth writing?', level: 'I',
    a: `<p>A harness (from <code>@angular/cdk/testing</code>) is a class that encapsulates how to find and operate a component: <code>hostSelector</code>, locators like <code>locatorFor('button')</code>, and user-level async methods (<code>rate(4)</code>, <code>getValue()</code>). Tests use <code>TestbedHarnessEnvironment.loader(fixture)</code> to get them. Benefits: tests don't depend on internal DOM, change detection and stability are handled automatically, and the component owner updates one harness when markup changes. Material ships harnesses for all components — always use those. I write my own for shared design-system components consumed by many teams, not for one-off pages.</p>`,
    followUps: ['How do you find a component rendered in an overlay?', 'What does parallel() do?', 'How do you test an intermediate loading state with harnesses?'] });
  interview.push({ q: 'How do you test signals, computed values and effects?', level: 'I',
    a: `<p>Signals and computeds are synchronous: set the source, read the computed, assert — no fixture or async needed for signal stores (<code>TestBed.inject(Store)</code>). Effects are scheduled, so after a change I run <code>TestBed.tick()</code> (v20+; <code>TestBed.flushEffects()</code> in v17–19) or change detection for component effects, then assert the side effect via a fake (e.g. a storage token). Signal inputs are set with <code>setInput</code>; <code>input.required</code> must be set before the first CD. <code>toSignal</code> needs an injection context (<code>TestBed.runInInjectionContext</code>). I test my logic (formulas, edge cases), not that Angular recomputes.</p>`,
    followUps: ['How did effect timing change in v19?', 'How do you test a model() binding?', 'How would you test resource() loading and error states?'] });
  interview.push({ q: 'fakeAsync vs waitForAsync vs async/await vs marble tests: when do you use each?', level: 'A',
    a: `<p><b>async/await</b> with <code>whenStable</code> is the default for simple async flows and harnesses. <b>fakeAsync + tick/flush</b> when timing matters in a component test (debounce, delay, polling): it controls a virtual clock for timers and microtasks but requires zone.js and cannot handle real I/O. <b>waitForAsync</b> is legacy: it waits in real time for zone tasks; I only keep it in old code. <b>Marble tests</b> with <code>TestScheduler.run</code> for pure RxJS logic — custom operators, effects, typeahead pipelines — because they assert the exact timeline, including subscriptions and cancellation. In zoneless/Vitest projects I use runner fake timers (<code>vi.useFakeTimers</code>) instead of fakeAsync.</p>`,
    followUps: ['Why can\'t zone.js patch native async/await?', 'How do hot and cold observables differ in marble tests?', 'How do you assert that switchMap cancelled the previous inner observable?'] });
  interview.push({ q: 'Explain marble syntax and write a marble test for a debounced search.', level: 'A',
    a: `<p>Each character is one virtual frame (1 ms in run mode): <code>-</code> nothing, a letter is a value, <code>|</code> complete, <code>#</code> error, <code>(ab)</code> synchronous group, <code>^</code> subscription point for hot observables, and <code>10ms</code> time progression; spaces are ignored. Test: <code>scheduler.run(({ hot, cold, expectObservable }) =&gt; { const terms = hot('a 50ms b 400ms c', {...}); const search = cold('100ms r', {...}); expectObservable(typeahead(terms, () =&gt; search)).toBe(...) })</code>. Inside <code>run</code>, <code>debounceTime</code> uses virtual time automatically. I also assert <code>expectSubscriptions(search.subscriptions)</code> to prove stale searches are unsubscribed. Off-by-one frames usually mean a miscounted diagram, so I prefer time-progression syntax for long gaps.</p>`,
    followUps: ['How many frames does (ab) take?', 'When would you use hot vs cold?', 'How do you test an NgRx effect with marbles?'] });
  interview.push({ q: 'How do you test an HTTP interceptor (e.g. one that adds auth headers and refreshes tokens on 401)?', level: 'A',
    a: `<p>Two layers. Unit: call the functional interceptor inside <code>TestBed.runInInjectionContext</code> with a fake <code>next</code> that records the request and returns <code>of(new HttpResponse(...))</code> or <code>throwError</code>; assert the header was added and public URLs were skipped. Integration: register it with <code>provideHttpClient(withInterceptors([auth]))</code> + <code>provideHttpClientTesting()</code>, make a call, and with <code>HttpTestingController</code> flush a 401, expect the refresh request, flush new tokens, then expect the retried original with the new header — and verify only one refresh happens when several requests fail at once. <code>verify()</code> ensures no extra calls.</p>`,
    followUps: ['How do you avoid infinite refresh loops, and how do you test that?', 'How do you test HttpContext options?', 'Where would MSW be a better fit?'] });
  interview.push({ q: 'How do you test routing, guards and resolvers in modern Angular?', level: 'I',
    a: `<p>For wiring: <code>provideRouter(routes, withComponentInputBinding())</code> plus <code>RouterTestingHarness.create()</code>; <code>await harness.navigateByUrl('/products/7', ProductPage)</code> runs real matching, guards and resolvers and returns the activated component; I assert <code>harness.routeNativeElement</code> or <code>TestBed.inject(Router).url</code> for redirects. For logic: functional guards/resolvers are just functions, so I call them in <code>TestBed.runInInjectionContext</code> with fake services and assert <code>true</code> or the serialised <code>UrlTree</code>. Components that receive params as inputs can be unit tested with <code>setInput</code> without any router. I avoid hand-written <code>ActivatedRoute</code> stubs.</p>`,
    followUps: ['How do you test canDeactivate with a confirm dialog?', 'How do you test lazy routes?', 'What is provideLocationMocks for?'] });
  interview.push({ q: 'How do you test reactive forms, custom validators and a ControlValueAccessor?', level: 'I',
    a: `<p>Reactive forms are plain objects, so most tests have no DOM: build the form, <code>setValue/patchValue</code>, assert <code>valid</code>, <code>errors</code>, <code>hasError</code>. Validators are pure functions tested with boundary tables; cross-field validators are tested on a <code>FormGroup</code>. Async validators use fakeAsync with a fake service and assert <code>PENDING</code> → <code>VALID/INVALID</code>. Then a few DOM tests prove wiring: type (value + <code>input</code> event), blur for touched, error message shown, submit disabled. A CVA is tested in a host component with <code>[formControl]</code>: <code>setValue</code> updates the view (writeValue), user input updates the control (onChange), disable propagates (setDisabledState), and loading a value does not mark the form dirty.</p>`,
    followUps: ['Why does a template-driven form test need whenStable?', 'How would you test updateOn: blur?', 'What accessibility checks belong in form tests?'] });
  interview.push({ q: 'Playwright vs Cypress for an Angular app: which would you choose and how do you keep E2E tests stable?', level: 'I',
    a: `<p>Both are fine; Protractor is gone. I lean to <b>Playwright</b> for cross-browser coverage including WebKit, parallel workers and sharding by default, multi-tab/origin support and the trace viewer; <b>Cypress</b> shines in interactive debugging and has solid Angular component testing. Stability rules: role/label-based locators (<code>getByRole</code>), never fixed sleeps, web-first assertions that auto-wait, test data created per test via API, authentication once with saved storage state, mock only third-party services (<code>page.route</code>/<code>cy.intercept</code>), disable animations, retries with flaky reporting, and keep E2E to critical journeys.</p>`,
    followUps: ['How would you run E2E against preview deployments in CI?', 'How do you debug a test that fails only in CI?', 'When do you add visual regression tests?'] });
  interview.push({ q: 'What is worth testing in an Angular app, and how do you think about coverage targets?', level: 'A',
    a: `<p>I test behaviour that would hurt if it broke: business rules (pricing, permissions, validation), component contracts (inputs → DOM, user actions → outputs/HTTP), error and empty states, and a regression test for each fixed bug, plus E2E for money paths. I skip framework behaviour, private methods, trivial code and big snapshots. Shape: lots of fast unit/component tests (component tests with harnesses and HttpTestingController are the best value), few E2E, plus static checks (strict TS, template type checking, ESLint). Coverage is a smoke alarm, not a goal: I set a realistic threshold (often 70–85% with branch coverage) to stop regressions, exclude generated code, and use mutation testing (StrykerJS) on critical modules to verify assertions are meaningful.</p>`,
    followUps: ['How do you convince a manager that 100% coverage is the wrong goal?', 'Testing pyramid vs testing trophy?', 'How do you deal with a slow 40-minute test suite?'] });
  interview.push({ q: 'Your Angular test suite is flaky and slow in CI. How do you diagnose and fix it?', level: 'E',
    a: `<p>Measure first: collect per-test durations and flaky history (same commit, different outcomes). Typical flake roots: real timers (replace with fakeAsync/fake timers), pending async not awaited (missing <code>whenStable</code>, un-subscribed HTTP), shared mutable state across tests (module-level variables, real singletons, localStorage) — exposed by running in random order — locale/timezone differences, animations, and E2E sleeps or shared data. Speed: move from Karma to Vitest, run only affected specs on PRs (dependency graph), stub heavy children, avoid recompiling big modules per test, shard E2E by duration (LPT) across workers, and push slow E2E checks down to component tests where possible. Quarantine flaky tests with an owner and deadline so red stays meaningful.</p>`,
    followUps: ['How would you detect order-dependent tests?', 'What metrics would you put on a test-health dashboard?', 'How do you prevent new flaky tests from merging?'] });

  registerModule({
    id: 'fe21',
    title: 'Angular Testing',
    lang: 'ts',
    intro: `<p>Tests are the safety net that lets a team change Angular code on a Friday without fear. This module teaches the whole Angular testing toolbox, from the smallest pipe test to a full browser run: <b>TestBed</b> and test runners (Jasmine/Karma, and the move to <b>Vitest</b> and Jest), <b>component tests</b> with <code>ComponentFixture</code>, inputs, outputs and OnPush, <b>component harnesses</b> from the Angular CDK, <b>signals</b> and effects, <b>async and RxJS</b> (fakeAsync/tick, waitForAsync, marble tests with <code>TestScheduler</code>), <b>HTTP</b> with <code>HttpTestingController</code>, <b>router and forms</b> with <code>RouterTestingHarness</code>, and <b>end-to-end</b> tests with Playwright and Cypress, plus coverage and the hardest skill of all: deciding <i>what is worth testing</i>.</p>
      <p>Everything targets Angular 17 to 21: standalone components, signals, zoneless change detection and the new test builders. Each topic opens with an everyday analogy, then a visual you can step through, then real Angular TypeScript specs, and small runnable JavaScript models (a spy, a virtual clock, a marble parser, a fake HTTP backend) so you can see how the tools work inside.</p>`,
    goals: [
      'Set up TestBed with faked dependencies to test services, pipes and directives, and explain the Karma deprecation and the move to Vitest/Jest',
      'Test components through their public surface (inputs, outputs, DOM) with ComponentFixture, setInput, OnPush and zoneless change detection',
      'Write and use CDK component harnesses so tests survive markup refactors',
      'Test signals, computed values and effects (TestBed.tick / flushEffects) and signal inputs',
      'Control time in tests with fakeAsync/tick/flush, waitForAsync and RxJS marble tests using TestScheduler',
      'Test HTTP services and interceptors with provideHttpClientTesting and HttpTestingController (expectOne, flush, error, verify)',
      'Test routes, guards and forms with RouterTestingHarness and runInInjectionContext, and write stable Playwright/Cypress E2E tests',
      'Choose what to test, read coverage reports critically, and build a balanced test strategy'
    ],
    prereqs: `Required: <b>Angular Services &amp; DI</b> (fe18) — providers, <code>inject()</code> and the injector tree are exactly what TestBed swaps out — and <b>RxJS &amp; Signals</b> (fe19) — observables, operators like debounceTime/switchMap and signal/computed/effect are what you will be testing. The routing and forms topics from fe20 and the React-side tooling module (fe14) help but are not required.`,
    hours: 14,
    topics: topics,
    quiz: quiz,
    interview: interview,
    practice: practice
  });
})();
