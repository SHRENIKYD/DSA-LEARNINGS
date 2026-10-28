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

  /* =====================================================================
     TOPIC 1 — The compiler: AOT, Ivy, template functions, type-checking
     ===================================================================== */
  var TPL_LINES = [
    'function App_Template(rf, ctx) {',
    '  if (rf & 1) {                       // CREATE pass (first render only)',
    '    ɵɵelementStart(0, "h1");          // slot 0: <h1>',
    '    ɵɵtext(1);                        // slot 1: empty text node',
    '    ɵɵelementEnd();',
    '    ɵɵelementStart(2, "button");      // slot 2: <button>',
    '    ɵɵlistener("click", () => ctx.inc());',
    '    ɵɵtext(3, "+");                   // slot 3: static text',
    '    ɵɵelementEnd();',
    '  }',
    '  if (rf & 2) {                       // UPDATE pass (every check)',
    '    ɵɵadvance(1);                     // move cursor to slot 1',
    '    ɵɵtextInterpolate1("Hello ", ctx.name, "");',
    '  }',
    '}'
  ].join('\n');

  topics.push({
    title: 'The Angular Compiler: AOT, Ivy, Template Functions & Template Type-Checking',
    analogy: `<p>Imagine a <b>restaurant that preps everything before opening</b>. Instead of reading the recipe book while a customer waits (JIT: compile templates in the browser), the chef turns every recipe into a <b>short checklist of exact moves</b> the night before (AOT). At service time the cook just follows the checklist: "put plate in slot 0, put sauce in slot 1". The first time a dish is made the cook builds it from scratch (<b>creation pass</b>); after that the cook only <b>tops up what changed</b> (update pass). And a strict head chef proofreads every checklist the night before so "add 2 kg salt" never reaches the kitchen (template type-checking).</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> A browser cannot run an Angular template like <code>&lt;h1&gt;Hello {{ name }}&lt;/h1&gt;</code>. Something must turn it into JavaScript. Angular's compiler (<code>ngtsc</code>, a wrapper around the TypeScript compiler) does that <b>ahead of time</b> (AOT) during <code>ng build</code> and <code>ng serve</code>. The output is plain JavaScript: each component class gets a static <code>ɵcmp</code> definition holding a <b>template function</b>. "Ivy" is the name of this compiler + runtime pair; it has been the only engine since Angular 13 (View Engine was removed).</p>
      ${H.table(['Term', 'Plain meaning', 'Why you care'], [
        ['AOT', 'Compile templates at build time', 'Smaller bundles (no compiler shipped), template errors at build time, faster start'],
        ['JIT', 'Compile in the browser at runtime', 'Only for special cases (some tests, dynamic templates); ships <code>@angular/compiler</code> (big)'],
        ['Ivy', 'The compiler output format + runtime since v9', 'Generated code calls small <b>instruction</b> functions that can be tree-shaken'],
        ['<code>ɵcmp</code> / <code>ɵfac</code>', 'Static fields the compiler adds to the class', 'Component definition and its factory (how to create it with DI)'],
        ['<code>strictTemplates</code>', 'Full type-checking of templates', 'Typos and wrong input types fail the build, not production']
      ])}
      <p>🔵 <b>The generated template function.</b> For the template <code>&lt;h1&gt;Hello {{name}}&lt;/h1&gt;&lt;button (click)="inc()"&gt;+&lt;/button&gt;</code> the compiler emits (simplified) the code in the visualizer below. Notice:</p>
      <ul>
        <li><b>Two modes</b> chosen by a bit flag <code>rf</code> (render flags): <code>1</code> = create (build DOM once), <code>2</code> = update (refresh bindings). Change detection only ever calls update mode after the first render.</li>
        <li><b>Numbered slots</b>: every element, text node or <code>@if</code>/<code>@for</code> anchor gets an index. The definition records <code>decls</code> (how many slots) and <code>vars</code> (how many binding values to remember).</li>
        <li><b>Instructions</b> like <code>ɵɵelementStart</code>, <code>ɵɵproperty</code>, <code>ɵɵtextInterpolate1</code>, <code>ɵɵlistener</code> are exported functions from <code>@angular/core</code>. If your app never uses a feature (say, <code>i18n</code>), its instructions are never imported, so the bundler drops them. That is the <b>tree-shaking</b> win of Ivy.</li>
        <li>This style is called <b>incremental DOM</b>: there is no virtual DOM tree to diff. The update pass compares each new binding value with the previous one stored in the view's array and touches the real DOM only when it differs.</li>
      </ul>
      <p>🔵 <b>Control flow.</b> <code>@if</code>, <code>@for</code>, <code>@switch</code> and <code>@defer</code> compile to <b>embedded templates</b>: a separate small template function plus an anchor slot. Update mode decides which embedded view should exist (for <code>@for</code>, it reconciles the list using your <code>track</code> expression). That is why <code>track</code> matters: it decides whether rows are moved or destroyed and rebuilt.</p>
      <p>🔵 <b>Template type-checking.</b> With <code>strictTemplates: true</code> (default in new projects) the compiler generates hidden TypeScript "type-check blocks" for each template and asks TypeScript to check them. So <code>[user]="usr"</code> with a missing field, a wrong input type, or calling a method with the wrong arguments is a <b>build error</b>. The Angular Language Service uses the same machinery for red squiggles in your editor.</p>`,
    clues: [
      '"Why is AOT the default / why not compile in the browser?" → no compiler in the bundle, errors at build time, faster bootstrap',
      '"What does Ivy generate for a template?" → a template function with create/update blocks calling <code>ɵɵ</code> instructions on numbered slots',
      '"How does Angular update the DOM without a virtual DOM?" → incremental DOM: compare each binding to the previous value stored in the LView',
      '"A typo in a template binding reached production" → turn on <code>strictTemplates</code> / <code>strictInputTypes</code>',
      '"Library built with an older Angular still works in a newer app" → partial compilation + the Angular linker',
      '"Why does <code>track</code> in <code>@for</code> matter for performance?" → it is the key used to reuse or recreate embedded views'
    ],
    code: [
      { lang: 'ts', title: 'What you write (component source)', code: `import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-counter',
  standalone: true,
  template: '<h1>Hello {{ name() }}</h1><button (click)="inc()">+{{ count() }}</button>',
})
export class CounterComponent {
  // Signals: the template reads them, so the compiler-generated
  // update block re-reads them on each check of this view.
  name = signal('Ada');
  count = signal(0);
  inc(): void {
    this.count.update(c => c + 1);
  }
}` },
      { lang: 'js', run: true, title: 'Runnable model of an Ivy template function (create vs update, slots, binding compare)', code: `// A tiny imitation of Ivy: an LView array of slots + remembered binding values.
const DOM_OPS = [];
function makeView(decls, vars) {
  return { slots: new Array(decls).fill(null), bindings: new Array(vars).fill(undefined), cursor: 0, bindIdx: 0 };
}
let view; // "current view" global, like Ivy's instruction state
function elementStart(i, tag) { view.slots[i] = { tag, children: [] }; DOM_OPS.push('create <' + tag + '>'); }
function text(i, value) { view.slots[i] = { text: value || '' }; DOM_OPS.push('create text "' + (value || '') + '"'); }
function advance(n) { view.cursor += n; }
function textInterpolate1(prefix, v, suffix) {
  const b = view.bindIdx++;
  if (Object.is(view.bindings[b], v)) return;      // unchanged -> no DOM work
  view.bindings[b] = v;
  view.slots[view.cursor].text = prefix + v + suffix;
  DOM_OPS.push('set text slot ' + view.cursor + ' = "' + prefix + v + suffix + '"');
}
function Template(rf, ctx) {
  if (rf & 1) { elementStart(0, 'h1'); text(1); elementStart(2, 'button'); text(3, '+'); }
  if (rf & 2) { advance(1); textInterpolate1('Hello ', ctx.name, ''); }
}
function refresh(ctx) { view.cursor = 0; view.bindIdx = 0; Template(2, ctx); }

view = makeView(4, 1);
const ctx = { name: 'Ada' };
Template(1, ctx);          // first render: create
refresh(ctx);              // first update fills the binding
refresh(ctx);              // same value: zero DOM writes
ctx.name = 'Grace';
refresh(ctx);              // changed: exactly one DOM write
console.log(DOM_OPS.join('\\n'));` }
    ],
    viz: {
      title: 'Step through a generated template function (create pass, then update passes)',
      input: 'Ada Ada Grace',
      inputLabel: 'Values of name for each check (space separated, up to 6)',
      gen: function (input) {
        var vals = words(input, 6, 'Type names like: Ada Ada Grace');
        var frames = [], prev = '(none)', slots = { '0': '<h1>', '1': '""', '2': '<button>', '3': '"+"' };
        var createLines = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        createLines.forEach(function (ln) {
          var hl = {}; hl[ln] = 'cur';
          frames.push({ narr: ln === 1 ? 'First render: Angular calls the template with <code>rf = 1</code> (create). Only the create block runs.' : (ln === 7 ? 'The listener is wired once, during creation. Clicking later calls <code>ctx.inc()</code> and marks the view dirty.' : 'Create pass, line ' + ln + ': build a DOM node and store it in its numbered slot.'),
            parts: [{ type: 'code', label: 'App_Template (compiled)', lang: 'js', code: TPL_LINES, hl: hl }] });
        });
        vals.forEach(function (v, i) {
          var changed = v !== prev;
          var hl = { 11: 'cur', 12: 'cur', 13: changed ? 'ok' : 'done' };
          if (changed) slots['1'] = '"Hello ' + v + '"';
          frames.push({ narr: 'Check #' + (i + 1) + ' (<code>rf = 2</code>): compare <code>ctx.name</code> = <b>' + H.esc(v) + '</b> with the remembered value <b>' + H.esc(prev) + '</b>. ' + (changed ? 'Different, so Angular writes the text node once and remembers the new value.' : 'Same, so no DOM work at all. This compare-per-binding is incremental DOM.'),
            parts: [{ type: 'code', label: 'App_Template (compiled)', lang: 'js', code: TPL_LINES, hl: hl },
              { type: 'map', label: 'View slots (real DOM nodes)', entries: Object.keys(slots).map(function (k) { return [k, slots[k]]; }), hl: changed ? { '1': 'ok' } : {} },
              { type: 'vars', label: 'Remembered binding values', vals: { 'binding[0]': v }, hl: changed ? { 'binding[0]': 'ok' } : {} }] });
          prev = v;
        });
        return pad4(frames);
      }
    },
    examples: [
      { title: 'Seeing the compiled output yourself', html: `<p>Run <code>ng build --configuration development</code> (no minification) and open the main chunk, or set a breakpoint in a component and step into the template. Search for <code>ɵɵdefineComponent</code>: you will find <code>decls</code>, <code>vars</code>, <code>consts</code> (static attributes) and <code>template: function X_Template(rf, ctx)</code>. Reading it once makes "Angular checks bindings, not components" click.</p>` },
      { title: 'Strict templates catching a real bug', html: `<p>The child declares <code>user = input.required&lt;User&gt;()</code>. The parent writes <code>&lt;app-card [user]="selected"&gt;</code> where <code>selected</code> is <code>User | undefined</code>. With <code>strictTemplates</code> the build fails: "Type 'User | undefined' is not assignable to type 'User'". Fix with <code>@if (selected; as s) { &lt;app-card [user]="s" /&gt; }</code>, which narrows the type inside the block.</p>`,
        code: { lang: 'ts', code: `import { Component, input } from '@angular/core';

interface User { id: number; name: string; }

@Component({
  selector: 'app-card',
  standalone: true,
  template: '<p>{{ user().name }}</p>',
})
export class CardComponent {
  user = input.required<User>();
}

@Component({
  selector: 'app-page',
  standalone: true,
  imports: [CardComponent],
  // @if narrows User | undefined to User inside the block, so strictTemplates is happy.
  template: '@if (selected; as s) { <app-card [user]="s" /> } @else { <p>Pick a user</p> }',
})
export class PageComponent {
  selected: User | undefined = undefined;
}` } },
      { title: 'Libraries: partial compilation and the linker', html: `<p>Publishing fully compiled Ivy code would lock a library to one Angular version's private instructions. So libraries are built with <code>compilationMode: 'partial'</code>: they ship a stable declaration format (<code>ɵɵngDeclareComponent</code> calls). When your app builds, the <b>Angular linker</b> (a Babel-style step inside the CLI) turns those declarations into full Ivy definitions for <i>your</i> Angular version. That is why a library built with v17 still runs in a v19 app.</p>` }
    ],
    deepDive: `<p>🟣 <b>Locality.</b> Ivy compiles each component using only its own decorator plus the <i>public shape</i> of what it imports (selectors, inputs, outputs). Standalone components make this explicit through <code>imports</code>. Locality is what lets the build cache work per file and keeps rebuilds fast.</p>
      <p>🟣 <b>Bindings live in an array, not in closures.</b> Each <code>[prop]</code> or <code>{{ }}</code> uses one binding slot. The update pass walks bindings in order with a cursor; <code>ɵɵadvance(n)</code> moves the element cursor so the instructions stay short. Pure pipes and <code>ɵɵpureFunction</code> (for literals like <code>[opts]="{ a: 1 }"</code>) also memoise through binding slots, which is why an object literal in a template does not create a new object on every check.</p>
      <p>🟣 <b>Dev vs prod.</b> In development Angular runs a second "check no changes" pass and adds debug metadata; production builds drop it (<code>ngDevMode</code> is replaced by <code>false</code> and dead code is removed). Measure performance only on production builds.</p>
      <p>🟣 <b>Template type-checking modes.</b> Basic mode checks only top-level expressions; <code>fullTemplateTypeCheck</code> checks embedded views; <code>strictTemplates</code> adds input type checks, <code>$event</code> typing, null checks and DOM element typing. Narrowing works in <code>@if</code> and with <code>as</code> aliases; type guards on directives use <code>ngTemplateGuard_</code> static members.</p>
      <p>🟣 <b>Where JIT still appears.</b> TestBed historically compiled components with JIT; modern setups with the esbuild-based test builders and the <code>application</code> builder use AOT for the app. If you ever see <code>@angular/compiler</code> in a production bundle, something imports it (often a dynamic-template library) and it costs hundreds of KB.</p>`,
    aiEra: `<p>🤖 AI assistants are good at reading generated Ivy output when you paste it: ask "explain what each ɵɵ instruction does in this template function" and you get a decent walkthrough. They are weaker on version details: an assistant may insist on <code>ViewEngine</code> concepts, <code>entryComponents</code> or <code>ngcc</code> (the old compatibility compiler removed in v16). Treat those as signs of stale training data. Use AI to propose fixes for <code>strictTemplates</code> errors after enabling it on a legacy app, but review each one: the lazy fix (<code>$any(...)</code> or the non-null <code>!</code>) silences the checker instead of fixing the data flow. The interview skill AI cannot replace: explaining <i>why</i> compile-time templates make a framework faster and safer.</p>`,
    problems: [{
      title: 'Count Bindings and Slots for a Template (decls / vars)',
      level: 'Medium', tags: ['compiler', 'ivy', 'bindings'], companies: ['Google', 'Microsoft'],
      statement: `<p>Write <code>countSlots(nodes)</code> for a simplified template given as an array of nodes. Each node is <code>{ kind: 'el' | 'text' | 'interp', bindings?: number }</code>. Every node uses one <b>decl slot</b>. An <code>'el'</code> uses <code>bindings</code> binding slots (property bindings); an <code>'interp'</code> text uses one binding slot per interpolated expression (<code>bindings</code>, default 1); a static <code>'text'</code> uses none. Return <code>{ decls, vars }</code> like Ivy's component definition.</p>`,
      constraints: `Up to 1000 nodes. <code>bindings</code> is a non-negative integer when present.`,
      example: `<p><code>[{kind:'el',bindings:2},{kind:'interp'},{kind:'text'}]</code> → ${H.c('g', '{ decls: 3, vars: 3 }')}: three nodes, two property bindings plus one interpolation.</p>`,
      brute: { why: `<p>Counting by scanning the template string for <code>{{</code> and <code>[</code> misses <code>bind-</code> syntax, counts brackets in text, and confuses multiple expressions in one text. Work from a parsed structure, like the compiler does.</p>`,
        code: { lang: 'js', run: true, code: `function countBrute(tpl) {
  return { vars: (tpl.match(/\\{\\{/g) || []).length + (tpl.match(/\\[/g) || []).length };
}
console.log(countBrute('<p>[draft] {{ title }}</p>')); // counts "[draft]" as a binding -> wrong` } },
      mcq: { q: 'Why does Ivy record <code>vars</code> on the component definition?', options: ['To size the LView so each binding has a slot for its previous value', 'To count how many times the template ran', 'To limit the number of inputs a component may have'], answer: 0, explain: 'The LView is pre-sized: decl slots for nodes and binding slots for previous values, so updates are array index operations.' },
      hints: [
        `<p>Hint 1: decls is simply the number of nodes.</p>`,
        `<p>Hint 2: vars depends on kind: el → bindings||0, interp → bindings||1, text → 0.</p>`,
        `<p>Hint 3: one reduce over the array; validate kind and treat a missing bindings field carefully.</p>`
      ],
      solution: {
        approach: `<p>One pass. Each node adds 1 to decls; add its binding count to vars by kind. This mirrors how the compiler sizes the view array so update mode never allocates.</p>`,
        code: { lang: 'js', run: true, code: `function countSlots(nodes) {
  let decls = 0, vars = 0;
  for (const n of nodes) {
    decls++;
    if (n.kind === 'el') vars += n.bindings || 0;
    else if (n.kind === 'interp') vars += n.bindings === undefined ? 1 : n.bindings;
    else if (n.kind !== 'text') throw new Error('unknown kind ' + n.kind);
  }
  return { decls, vars };
}
console.log(countSlots([{ kind: 'el', bindings: 2 }, { kind: 'interp' }, { kind: 'text' }]));
console.log(countSlots([]));
console.log(countSlots([{ kind: 'interp', bindings: 3 }, { kind: 'el' }]));` },
        dry: { head: ['Node', 'decls', 'vars'], rows: [['el (2 bindings)', '1', '2'], ['interp', '2', '3'], ['text', '3', '3']] },
        complexity: `<p>O(n) time, O(1) space.</p>`
      }
    }]
  });

  /* =====================================================================
     TOPIC 2 — Component tree, LView / TView / TNode
     ===================================================================== */
  topics.push({
    title: 'The Component Tree at Runtime: LView, TView and TNode',
    analogy: `<p>Think of a <b>chain of identical coffee shops</b>. Head office writes one <b>floor plan</b> for the shop type: where the counter goes, how many tables, which seats have power sockets. That plan is shared by every branch (the <b>TView</b>, "T" for template/type). Each branch is a <b>real shop</b> with its own customers, cash and chairs (the <b>LView</b>, "L" for logical view or instance). The plan's notes about each fixture ("seat 4: has socket") are the <b>TNodes</b>. A hundred branches share one plan; only the per-branch stuff is copied.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> At runtime Angular does not keep "component objects with child arrays" like a textbook tree. It keeps <b>flat arrays</b>. Every component instance and every embedded view (an <code>@if</code> block, one row of a <code>@for</code>) is an <b>LView</b>: a JavaScript array. Every component <i>type</i> or template has one shared <b>TView</b> with the static facts. Splitting "what is the same for all instances" from "what is different per instance" saves memory and makes updates fast array lookups.</p>
      ${H.table(['Structure', 'One per…', 'Holds (simplified)'], [
        ['<b>TView</b>', 'template (component type, or each embedded template)', 'The template function, <code>decls</code>/<code>vars</code>, a <code>data</code> array of TNodes, lists of lifecycle hooks to call, query info, a blueprint used to create LViews quickly'],
        ['<b>TNode</b>', 'node in a template (element, text, container, projection)', 'Tag name, static attributes, index, which directives match it, input/output maps, parent/child/next links'],
        ['<b>LView</b>', 'instance (each component, each embedded view)', 'A header (host element, flags such as Dirty/Attached/CheckAlways, parent, context = the component instance, injector, cleanup list…), then real DOM nodes and child data in decl slots, then previous binding values'],
        ['<b>LContainer</b>', 'anchor for views created at runtime', 'An array holding the anchor comment and the list of child LViews (rows of <code>@for</code>, the active branch of <code>@if</code>, dynamically created components)']
      ])}
      <p>🔵 <b>How the tree is linked.</b> A component's host element lives in its parent's LView. The component's own LView is stored in that slot next to the host element, and its header points back to the parent. Embedded views live inside LContainers. So the "component tree" you see in Angular DevTools is really a tree of LViews and LContainers that change detection walks depth-first.</p>
      <p>🔵 <b>First create pass.</b> The first time a template runs, Angular is in <code>firstCreatePass</code>: it fills the TView (TNodes, directive matching, hook lists). Every later instance of the same component skips that work and only creates DOM into a fresh LView cloned from the blueprint. This is why rendering the 1000th row of a list is cheaper than the first.</p>
      <p>🔵 <b>Why you care in practice.</b></p>
      <ul>
        <li>Memory scales with <b>number of views × bindings</b>. A 10,000-row table with 20 bindings per row is 200,000 binding slots to check. Virtual scrolling (CDK <code>cdk-virtual-scroll-viewport</code>) or pagination shrinks the LView count.</li>
        <li>Directives on an element are matched at compile time (standalone imports) and recorded on the TNode, so there is no runtime selector matching cost per instance.</li>
        <li>Dynamic creation (<code>ViewContainerRef.createComponent</code>) inserts an LView into an LContainer; forgetting to destroy it leaks the whole subtree.</li>
      </ul>`,
    clues: [
      '"What is an LView / TView?" → per-instance array vs shared static blueprint per template',
      '"Why is the second instance of a component cheaper to create?" → TView and TNodes are built once (first create pass) and shared',
      '"Table with 10,000 rows is slow to check" → number of LViews × bindings; virtual scroll or paginate',
      '"Where do @if / @for views live?" → LContainers holding embedded LViews',
      '"Dynamically created component never goes away" → its LView stays in the LContainer until <code>destroy()</code>/<code>clear()</code>'
    ],
    code: [
      { lang: 'js', run: true, title: 'Runnable model: one TView shared by many LViews', code: `// Static, shared blueprint (TView) vs per-instance array (LView).
const HEADER = ['HOST', 'TVIEW', 'FLAGS', 'PARENT', 'CONTEXT'];   // real header has more slots
function createTView(name, decls, vars, template) {
  return { name, decls, vars, template, firstCreatePass: true, tnodes: [] };
}
function createLView(tView, parent, context) {
  const lView = new Array(HEADER.length + tView.decls + tView.vars).fill(null);
  lView[1] = tView; lView[2] = { dirty: true, attached: true }; lView[3] = parent; lView[4] = context;
  if (tView.firstCreatePass) {
    // done ONCE per template: record static node info
    for (let i = 0; i < tView.decls; i++) tView.tnodes.push({ index: i, info: 'static node ' + i });
    tView.firstCreatePass = false;
    console.log('first create pass for ' + tView.name + ': built ' + tView.tnodes.length + ' TNodes');
  }
  return lView;
}
const rowTView = createTView('Row', 3, 2, function () {});
const views = [];
for (let i = 0; i < 1000; i++) views.push(createLView(rowTView, null, { id: i }));
console.log('LViews:', views.length, '| TViews:', 1, '| TNodes built:', rowTView.tnodes.length);
console.log('slots per LView:', views[0].length, '-> total slots:', views.length * views[0].length);
console.log('all rows share the same TView?', views.every(v => v[1] === rowTView));` },
      { lang: 'ts', title: 'Creating and cleaning up a dynamic component (an LView inside an LContainer)', code: `import { Component, ComponentRef, ViewContainerRef, inject, viewChild, OnDestroy } from '@angular/core';

@Component({ selector: 'app-toast', standalone: true, template: '<div class="toast">Saved!</div>' })
export class ToastComponent {}

@Component({
  selector: 'app-host',
  standalone: true,
  template: '<button (click)="show()">Show</button><ng-container #slot />',
})
export class HostComponent implements OnDestroy {
  // The ng-container anchor becomes an LContainer that holds the toast's LView.
  private slot = viewChild.required('slot', { read: ViewContainerRef });
  private ref: ComponentRef<ToastComponent> | null = null;

  show(): void {
    this.ref?.destroy();                                   // remove the previous LView first
    this.ref = this.slot().createComponent(ToastComponent);
  }
  ngOnDestroy(): void {
    this.ref?.destroy();                                   // views in the container are also destroyed with the host
  }
}` }
    ],
    viz: {
      title: 'Build LViews for N component instances that share one TView',
      input: '3',
      inputLabel: 'Number of <app-row> instances (1–6)',
      gen: function (input) {
        var n = parseInt(String(input).trim(), 10);
        if (!(n >= 1 && n <= 6)) throw new Error('Enter a number from 1 to 6');
        var frames = [];
        var g = { nodes: [{ id: 'app', label: 'App LView', x: 50, y: 8, shape: 'box', w: 22 }, { id: 'tv', label: 'TView: Row', x: 88, y: 50, shape: 'box', w: 20 }], edges: [] };
        frames.push({ narr: 'The root component <code>App</code> has its own LView. No rows exist yet. The Row template\'s TView will be created on first use.', parts: [{ type: 'graph', label: 'Views', directed: true, height: 70, nodes: g.nodes.slice(0, 1), edges: [] }] });
        var nodes = g.nodes.slice(), edges = [];
        for (var i = 0; i < n; i++) {
          var id = 'r' + i, x = 10 + i * (60 / Math.max(1, n - 1 || 1));
          if (n === 1) x = 40;
          nodes.push({ id: id, label: 'Row LView #' + i, x: x, y: 36, shape: 'box', w: 14 });
          edges.push(['app', id, 'child']);
          edges.push([id, 'tv', 'shares']);
          var hl = {}; hl[id] = 'ok'; if (i === 0) hl.tv = 'cur';
          frames.push({ narr: i === 0 ? 'Row #0 is created. This is the <b>first create pass</b>: Angular builds the shared TView (TNodes, hook lists, blueprint). Expensive, but only once.' : 'Row #' + i + ' is created by cloning the blueprint into a fresh LView array. It points at the <b>same</b> TView, so no static work is repeated.',
            parts: [{ type: 'graph', label: 'Views', directed: true, height: 70, nodes: nodes.slice(), edges: edges.slice(), hl: hl },
              { type: 'vars', label: 'Counts', vals: { LViews: i + 2, TViews: 2, 'TNodes built for Row': 3 } }] });
        }
        frames.push({ narr: 'Summary: memory and check time grow with the number of <b>LViews × bindings</b>, not with the number of component types. That is the number to shrink for big lists.',
          parts: [{ type: 'array', label: 'One Row LView (simplified)', values: ['HOST', 'TVIEW', 'FLAGS', 'PARENT', 'CONTEXT', '<div>', 'text', 'prev[0]', 'prev[1]'], hl: { 1: 'sel', 2: 'cur', 7: 'win', 8: 'win' } }] });
        return pad4(frames);
      }
    },
    examples: [
      { title: 'Reading an LView in the browser console', html: `<p>In a dev build, select an element in the Elements panel and run <code>ng.getComponent($0)</code> to get the component instance, <code>ng.getOwningComponent($0)</code> for its owner, and <code>ng.applyChanges(comp)</code> to run change detection on it. These <code>ng</code> globals are the supported way to inspect the tree; the raw LView arrays are internal and change between versions.</p>` },
      { title: 'Why a big list is slow, in numbers', html: `<p>5,000 rows × (1 LView + 15 bindings) means each change detection pass does about 75,000 compare operations, plus lifecycle hooks. At ~10 ns each that is under 1 ms of compares, but real templates also call functions and pipes; one <code>{{ format(row) }}</code> that takes 5 µs turns into 25 ms per check. Fix: precompute in a <code>computed()</code> or pure pipe, and render only the visible rows.</p>` },
      { title: 'Embedded views from @for', html: `<p><code>@for (item of items(); track item.id) { &lt;li&gt;{{ item.name }}&lt;/li&gt; }</code> creates one LContainer at the <code>@for</code> anchor and one embedded LView per item. With a stable <code>track</code>, reordering moves the existing LViews (and their DOM) inside the container; with <code>track $index</code> on a list whose items move, Angular rebinds rows in place, so per-row state (focus, inputs, animations) appears to "jump".</p>` }
    ],
    deepDive: `<p>🟣 <b>Flags in the header.</b> Each LView has a bit field. Names in the source include flags for creation mode, first pass, <i>CheckAlways</i> (Default strategy components), <i>Dirty</i> (OnPush marked for check), <i>Attached</i>, <i>Destroyed</i>, and since v17 flags used for signal-driven refresh (a view that needs refresh, and ancestors that only need to be traversed). Change detection reads these bits to decide whether to execute a template or skip it.</p>
      <p>🟣 <b>Cleanup.</b> The LView has a cleanup list: event listeners added by <code>ɵɵlistener</code>, output subscriptions and <code>DestroyRef</code> callbacks. Destroying a view runs them all, which is why listeners added through templates never leak while <code>addEventListener</code> calls you make by hand can.</p>
      <p>🟣 <b>Injectors are part of the picture.</b> Element injectors are stored with the TNode/LView data (bloom filters speed up "does this element or an ancestor provide token X?"), then the environment injector chain is used. That is how <code>inject()</code> resolves from the closest element first.</p>
      <p>🟣 <b>Hydration.</b> With SSR hydration, Angular walks the same structures and claims existing DOM nodes into the decl slots instead of creating new ones, using serialized info about containers and views stored in the HTML. A mismatch means the LView expected a node the server did not render.</p>
      <p>🟣 <b>Caveat.</b> Internal names (<code>LView</code>, <code>TView</code>, flag names, header size) are implementation details, documented in the Angular source and design docs but not public API. In interviews describe the <i>idea</i> (shared static blueprint + per-instance arrays) and you will be accurate across versions.</p>`,
    aiEra: `<p>🤖 Ask an AI to "explain this LView in the debugger" and it will often invent precise slot numbers. Header slot indices change across versions, so verify against the Angular source for your version (<code>packages/core/src/render3/interfaces/view.ts</code>) instead of trusting a confident answer. Good uses: having AI write a script that counts components in a page with <code>ng.getComponent</code> across all elements to find the biggest subtrees, or summarise a DevTools component-tree export. Your job is the model in your head: views are arrays, templates are shared, and cost scales with views × bindings.</p>`,
    problems: [{
      title: 'Count Views and Binding Checks in a Nested Tree',
      level: 'Medium', tags: ['lview', 'tree', 'performance'], companies: ['Amazon', 'Atlassian'],
      statement: `<p>A component tree is given as nested objects <code>{ name, bindings, children: [...] }</code>. Each node is one LView. Write <code>cost(tree)</code> that returns <code>{ views, checks }</code> where <code>checks</code> is the total number of bindings compared when the <b>whole tree</b> is checked once (Default strategy everywhere).</p>`,
      constraints: `Up to 10<sup>4</sup> nodes, depth up to 1000 (use an explicit stack, not recursion, to be safe).`,
      example: `<p><code>{ name:'App', bindings:2, children:[{name:'List', bindings:1, children:[{name:'Row',bindings:3,children:[]},{name:'Row',bindings:3,children:[]}]}]}</code> → ${H.c('g', '{ views: 4, checks: 9 }')}.</p>`,
      brute: { why: `<p>Recursion is the natural first version, and it is fine for small trees, but very deep trees can overflow the call stack.</p>`,
        code: { lang: 'js', run: true, code: `function costRec(t) {
  let v = 1, c = t.bindings;
  for (const ch of t.children) { const r = costRec(ch); v += r.views; c += r.checks; }
  return { views: v, checks: c };
}
console.log(costRec({ name: 'App', bindings: 2, children: [{ name: 'Row', bindings: 3, children: [] }] }));` } },
      mcq: { q: 'Which change reduces <code>checks</code> the most for a 5,000-row list?', options: ['Virtual scrolling so only ~30 rows exist', 'Renaming components', 'Moving styles to a global stylesheet'], answer: 0, explain: 'Fewer LViews means fewer bindings to compare.' },
      hints: [
        `<p>Hint 1: every node contributes 1 view and its own bindings.</p>`,
        `<p>Hint 2: use an array as a stack: push the root, pop, add, push children.</p>`,
        `<p>Hint 3: order does not matter for sums; handle an empty children array.</p>`
      ],
      solution: {
        approach: `<p>Iterative DFS with an explicit stack summing views and bindings. This is the same walk change detection does, minus the skipping that OnPush and signals enable.</p>`,
        code: { lang: 'js', run: true, code: `function cost(tree) {
  let views = 0, checks = 0;
  const stack = [tree];
  while (stack.length) {
    const n = stack.pop();
    views++; checks += n.bindings;
    for (const c of n.children) stack.push(c);
  }
  return { views, checks };
}
const row = () => ({ name: 'Row', bindings: 3, children: [] });
console.log(cost({ name: 'App', bindings: 2, children: [{ name: 'List', bindings: 1, children: [row(), row()] }] }));
// deep chain: no stack overflow
let deep = { name: 'leaf', bindings: 1, children: [] };
for (let i = 0; i < 5000; i++) deep = { name: 'n' + i, bindings: 1, children: [deep] };
console.log(cost(deep));` },
        dry: { head: ['Pop', 'views', 'checks'], rows: [['App', '1', '2'], ['List', '2', '3'], ['Row', '3', '6'], ['Row', '4', '9']] },
        complexity: `<p>O(n) time, O(n) worst-case stack memory.</p>`
      }
    }]
  });

  /* =====================================================================
     TOPIC 3 — How change detection really runs: dirty marking & the walk
     ===================================================================== */
  var CD_TREE = [
    { name: 'App', onPush: false, parent: -1 },
    { name: 'Header', onPush: false, parent: 0 },
    { name: 'Main', onPush: true, parent: 0 },
    { name: 'Nav', onPush: false, parent: 1 },
    { name: 'Logo', onPush: true, parent: 1 },
    { name: 'List', onPush: true, parent: 2 },
    { name: 'Detail', onPush: true, parent: 2 }
  ];
  function cdLabels(dirty) {
    return CD_TREE.map(function (n, i) { return n.name + (n.onPush ? ' (OnPush)' : '') + (dirty[i] ? ' *' : ''); });
  }

  topics.push({
    title: 'How Change Detection Really Runs: Dirty Marking, refreshView and the Tree Walk',
    analogy: `<p>Picture a <b>building inspector</b> who does a round of every floor after any event in the building. Some offices have a sign "<b>always inspect</b>" (Default strategy). Others have a sign "<b>only inspect if the red flag is up</b>" (OnPush). When someone inside an OnPush office presses the help button, a red flag goes up on that office <b>and on every office on the way to the lobby</b>, so the inspector knows to walk that corridor. Offices with no flag, and everything behind them, are skipped completely.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> Change detection (CD) is Angular re-running the <b>update pass</b> of templates and writing changed bindings to the DOM. It is triggered by a scheduler (zone.js or the zoneless scheduler, next topics) that calls <code>ApplicationRef.tick()</code>. <code>tick()</code> walks the view tree from the root(s), <b>top-down, depth-first</b>, and for each view decides: refresh it, skip it, or just pass through it.</p>
      ${H.table(['View state', 'What the walk does'], [
        ['Default strategy (<i>CheckAlways</i>)', 'Refresh every time its parent is visited'],
        ['OnPush and <b>dirty</b>', 'Refresh, then clear the dirty flag'],
        ['OnPush and clean', 'Skip it <b>and its whole subtree</b>… unless a descendant was marked by a signal (see below)'],
        ['Detached (<code>cdRef.detach()</code>)', 'Skip until reattached or <code>detectChanges()</code> is called on it']
      ])}
      <p>🔵 <b>What "refresh a view" (internally <code>refreshView</code>) does, in order:</b></p>
      <ol>
        <li>Run the template function in update mode (compare bindings, set inputs on children, which calls <code>ngOnChanges</code> for changed inputs).</li>
        <li>Run <code>ngOnInit</code>/<code>ngDoCheck</code> (pre-order hooks) for child directives as their bindings are processed.</li>
        <li>Refresh embedded views (<code>@if</code>, <code>@for</code> rows) inside it.</li>
        <li>Run content hooks (<code>ngAfterContentInit/Checked</code>).</li>
        <li>Refresh child component views (the recursion).</li>
        <li>Run view hooks (<code>ngAfterViewInit/Checked</code>).</li>
      </ol>
      <p>🔵 <b>Who marks an OnPush view dirty?</b> <code>markViewDirty</code> sets the Dirty flag on the view <b>and every ancestor up to the root</b>, so the walk can reach it. It is called when:</p>
      <ul>
        <li>An event bound in its template (or a host listener) fires: Angular wraps the listener.</li>
        <li>A parent passes a <b>new reference</b> to an input (checked with <code>Object.is</code>, not deep equal).</li>
        <li>You call <code>cdRef.markForCheck()</code>; <code>AsyncPipe</code> calls it when a new value arrives.</li>
      </ul>
      <p>🔵 <b>Signals changed the rule (v17+).</b> When a signal read by a template changes, Angular marks only <b>that view</b> for refresh and marks its ancestors as "has a child to refresh" <i>without</i> making them dirty. The walk then passes through clean OnPush ancestors without re-running their templates and refreshes only the consumer view. People call this <b>local</b> or <b>targeted</b> change detection. It works best when components are OnPush and state lives in signals.</p>
      <p>🔵 <b>Dev mode second pass.</b> In development, after <code>tick()</code> Angular runs <code>checkNoChanges</code>: it walks again and throws <code>ExpressionChangedAfterItHasBeenCheckedError</code> (NG0100) if a binding now has a different value, which means your data changed <i>during</i> CD (for example in <code>ngAfterViewInit</code>), breaking the one-way flow.</p>`,
    clues: [
      '"OnPush component does not update after I push into an array" → same reference; inputs compare with <code>Object.is</code>, use immutable updates or signals',
      '"Clicking a button in a deep OnPush child re-checks its ancestors" → <code>markViewDirty</code> walks up to the root',
      '"ExpressionChangedAfterItHasBeenChecked" → state changed during CD; move the change earlier, use signals/computed, or schedule it',
      '"Only the one row with the changed signal should update" → signals give targeted refresh of the consumer view',
      '"Order of lifecycle hooks during a check" → OnChanges → OnInit → DoCheck → AfterContent* → children → AfterView*'
    ],
    code: [
      { lang: 'js', run: true, title: 'Runnable model: tick() with CheckAlways, OnPush dirty flags and markViewDirty', code: `// Each view: { name, onPush, dirty, children, parent }
function view(name, onPush, children = []) {
  const v = { name, onPush, dirty: true, children, parent: null };
  children.forEach(c => (c.parent = v));
  return v;
}
function markViewDirty(v) {             // what an event / markForCheck does
  while (v) { v.dirty = true; v = v.parent; }
}
const refreshed = [];
function detectChangesInView(v) {
  const shouldRefresh = !v.onPush || v.dirty;
  if (!shouldRefresh) return;            // skip the whole subtree
  refreshed.push(v.name);                // "run the template in update mode"
  v.dirty = false;
  v.children.forEach(detectChangesInView);
}
function tick(root) { refreshed.length = 0; detectChangesInView(root); return refreshed.slice(); }

const detail = view('Detail', true);
const list = view('List', true);
const main = view('Main', true, [list, detail]);
const nav = view('Nav', false);
const header = view('Header', false, [nav]);
const app = view('App', false, [header, main]);

console.log('first tick :', tick(app).join(' > '));       // everything starts dirty
console.log('idle tick  :', tick(app).join(' > '));       // OnPush subtree skipped
markViewDirty(detail);                                     // click inside Detail
console.log('after click:', tick(app).join(' > '));       // Main + Detail refresh, List skipped` },
      { lang: 'ts', title: 'OnPush done right: immutable input + signal state + AsyncPipe', code: `import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Observable, interval, map } from 'rxjs';

interface Task { id: number; title: string; done: boolean; }

@Component({
  selector: 'app-task-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '@for (t of tasks(); track t.id) { <li>{{ t.title }}</li> } <p>{{ remaining() }} left</p>',
})
export class TaskListComponent {
  tasks = input.required<Task[]>();
  remaining = computed(() => this.tasks().filter(t => !t.done).length);
}

@Component({
  selector: 'app-tasks-page',
  standalone: true,
  imports: [TaskListComponent, AsyncPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<app-task-list [tasks]="tasks()" /> <button (click)="add()">Add</button> <small>{{ clock$ | async }}</small>',
})
export class TasksPageComponent {
  tasks = signal<Task[]>([]);
  // AsyncPipe calls markForCheck() on each emission, so OnPush still updates.
  clock$: Observable<string> = interval(1000).pipe(map(() => new Date().toLocaleTimeString()));
  add(): void {
    // NEW array reference: the child's input changes, so it refreshes.
    this.tasks.update(list => [...list, { id: list.length + 1, title: 'Task ' + (list.length + 1), done: false }]);
  }
}` }
    ],
    viz: {
      title: 'Mark dirty, then watch tick() walk the tree',
      input: 'Detail',
      inputLabel: 'Component where the click happens (App, Header, Main, Nav, Logo, List, Detail)',
      gen: function (input) {
        var name = String(input || '').trim();
        var idx = -1;
        CD_TREE.forEach(function (n, i) { if (n.name.toLowerCase() === name.toLowerCase()) idx = i; });
        if (idx < 0) throw new Error('Pick one of: App, Header, Main, Nav, Logo, List, Detail');
        var dirty = CD_TREE.map(function () { return false; });
        var frames = [];
        frames.push({ narr: 'All views are clean after the last check. OnPush views (Main, Logo, List, Detail) will be skipped unless flagged. Default views are always checked when reached.',
          parts: [{ type: 'tree', label: 'View tree', arr: cdLabels(dirty), hl: {} }] });
        var i = idx, path = [];
        while (i >= 0) {
          dirty[i] = true; path.push(i);
          var hl = {}; path.forEach(function (p) { hl[p] = 'bad'; });
          frames.push({ narr: '<code>markViewDirty</code>: flag <b>' + CD_TREE[i].name + '</b> as dirty' + (i === idx ? ' (the click happened here).' : ' so the walk can reach the clicked view.'),
            parts: [{ type: 'tree', label: 'View tree (* = dirty)', arr: cdLabels(dirty), hl: hl }] });
          i = CD_TREE[i].parent;
        }
        var visited = [];
        function walk(k) {
          var n = CD_TREE[k];
          var refresh = !n.onPush || dirty[k];
          var hl = {}; visited.forEach(function (v) { hl[v] = 'ok'; }); hl[k] = refresh ? 'cur' : 'done';
          frames.push({ narr: refresh ? 'tick(): <b>refresh ' + n.name + '</b> (' + (n.onPush ? 'OnPush but dirty' : 'Default: always') + '). Run its template update pass, then visit its children.' : 'tick(): <b>skip ' + n.name + '</b> and its whole subtree: OnPush and not dirty.',
            parts: [{ type: 'tree', label: 'View tree (* = dirty)', arr: cdLabels(dirty), hl: hl }] });
          if (!refresh) return;
          dirty[k] = false; visited.push(k);
          CD_TREE.forEach(function (c, ci) { if (c.parent === k) walk(ci); });
        }
        walk(0);
        var fin = {}; visited.forEach(function (v) { fin[v] = 'ok'; });
        frames.push({ narr: 'Done. Refreshed ' + visited.length + ' of ' + CD_TREE.length + ' views: ' + visited.map(function (v) { return CD_TREE[v].name; }).join(', ') + '. Flags are cleared for the next round.',
          parts: [{ type: 'tree', label: 'Refreshed views (green)', arr: cdLabels(dirty), hl: fin }] });
        return pad4(frames);
      }
    },
    examples: [
      { title: 'The mutated array that never shows up', html: `<p>Parent does <code>this.items.push(x)</code>; child is OnPush with <code>@Input() items</code>. The reference did not change, so the child is not marked and stays stale. Fix: <code>this.items = [...this.items, x]</code>, or keep the list in a signal and update it immutably. "It works if I click inside the child" is the tell: the click marks the child dirty.</p>` },
      { title: 'Fixing NG0100 properly', html: `<p>A parent shows <code>{{ childCount }}</code>, and the child sets <code>parent.childCount = 3</code> in <code>ngAfterViewInit</code>. The parent was already checked, so dev mode throws. Bad fix: <code>setTimeout</code> (causes another CD round and a visible flicker). Good fixes: compute the value from data the parent owns, use a <code>computed()</code>, or have the child expose a signal the parent reads (signals schedule a new refresh when they change instead of breaking the one-way rule).</p>` },
      { title: 'Manual control for a high-frequency widget', html: `<p>A live chart gets 60 updates per second. Inject <code>ChangeDetectorRef</code>, call <code>detach()</code>, and call <code>detectChanges()</code> on a <code>requestAnimationFrame</code> throttle. Only that subtree is checked, at most once per frame. Remember to stop the loop in <code>ngOnDestroy</code>.</p>`,
        code: { lang: 'ts', code: `import { ChangeDetectorRef, Component, DestroyRef, NgZone, inject } from '@angular/core';

@Component({ selector: 'app-live', standalone: true, template: '<span>{{ value }}</span>' })
export class LiveComponent {
  value = 0;
  private cdr = inject(ChangeDetectorRef);
  constructor() {
    this.cdr.detach();                               // not checked by tick() anymore
    const zone = inject(NgZone);
    let raf = 0;
    zone.runOutsideAngular(() => {                   // do not trigger app-wide CD per frame
      const loop = () => {
        this.value = Math.round(performance.now());
        this.cdr.detectChanges();                    // check only this view
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    });
    inject(DestroyRef).onDestroy(() => cancelAnimationFrame(raf));
  }
}` } }
    ],
    deepDive: `<p>🟣 <b>Two traversal modes.</b> Since v17 the walk distinguishes "global" mode (refresh views that are CheckAlways or Dirty) from "targeted" mode (only refresh views flagged by a signal; pass through ancestors that merely have a flagged descendant). A Default-strategy ancestor in targeted mode is <i>not</i> refreshed just because a child signal changed. This is how a signal change deep in an OnPush tree costs one template execution instead of a root-to-leaf refresh.</p>
      <p>🟣 <b>Reruns within one tick.</b> If something during CD marks a view for refresh again (for example, a signal written in an effect that runs during the walk), Angular loops the traversal a limited number of times and then reports an infinite-change error, rather than throwing NG0100 like the old rule. Writing signals in templates or <code>computed</code> is still forbidden.</p>
      <p>🟣 <b>Inputs and <code>ngOnChanges</code>.</b> Setting an input happens while the <i>parent's</i> template runs. Signal inputs (<code>input()</code>) update their signal there; the child view is marked for refresh only if it reads that signal. With <code>ngOnChanges</code> you get a <code>SimpleChanges</code> map built from the binding compare.</p>
      <p>🟣 <b>Cost model.</b> A check costs: number of refreshed views × (bindings + function calls in bindings + hooks). Pipes marked <code>pure</code> and <code>computed</code> are memoised; methods in templates are not. That is why "no function calls in templates" became a rule of thumb before signals; now a signal read <code>count()</code> is cheap because it is just a cached value read.</p>
      <p>🟣 <b><code>detectChanges</code> vs <code>markForCheck</code>.</b> <code>detectChanges()</code> synchronously checks this view and its children now. <code>markForCheck()</code> only sets flags (and, with the zoneless/hybrid scheduler, schedules a tick); the actual work happens in the next <code>tick()</code>. Prefer <code>markForCheck</code>: it batches.</p>`,
    aiEra: `<p>🤖 AI tools love to "fix" stale OnPush views by adding <code>cdr.detectChanges()</code> everywhere or switching the component back to Default. Both hide the real bug (mutated reference or state outside Angular's knowledge). When reviewing AI patches, ask: what marks this view dirty, and is the data immutable? Better prompts: "convert this component's state to signals and OnPush, keep inputs immutable, and list every place that previously relied on mutation". AI is also useful for scanning a codebase for <code>.push(</code> on arrays bound to OnPush inputs. In interviews, being able to draw the dirty-marking path up the tree is what separates senior answers.</p>`,
    problems: [{
      title: 'Which Views Refresh? Simulate tick() with OnPush',
      level: 'Medium', tags: ['change-detection', 'onpush', 'tree'], companies: ['Google', 'Uber'],
      statement: `<p>Given <code>parent</code> (array, -1 for root), <code>onPush</code> (booleans) and a list <code>events</code> of view indices where events fired, return the list of view indices refreshed by one <code>tick()</code> in DFS order (children in index order). Events mark the view and all ancestors dirty. Default views always refresh when reached.</p>`,
      constraints: `Up to 10<sup>4</sup> views; parent[i] &lt; i.`,
      example: `<p>parent <code>[-1,0,0,2,2]</code>, onPush <code>[F,F,T,T,T]</code>, events <code>[4]</code> → ${H.c('g', '[0,1,2,4]')}: view 3 is OnPush and clean, so skipped.</p>`,
      brute: { why: `<p>Refreshing every view ignores OnPush entirely: correct output for Default apps, but it is exactly the wasted work OnPush exists to avoid.</p>`,
        code: { lang: 'js', run: true, code: `const refreshAll = parent => parent.map((_, i) => i);
console.log(refreshAll([-1, 0, 0, 2, 2])); // [0,1,2,3,4] - too many` } },
      mcq: { q: 'An event fires in view 4 whose parent 2 is OnPush. Why must 2 also be marked dirty?', options: ['Otherwise the walk skips 2 and never reaches 4', 'To run ngOnInit again on 2', 'It does not need to be marked'], answer: 0, explain: 'A clean OnPush view cuts off its whole subtree, so ancestors must be flagged.' },
      hints: [
        `<p>Hint 1: first apply the events: walk up the parent chain setting dirty.</p>`,
        `<p>Hint 2: build a children list from the parent array.</p>`,
        `<p>Hint 3: DFS from 0; refresh if !onPush or dirty; otherwise return without visiting children.</p>`
      ],
      solution: {
        approach: `<p>Mark dirty along each event's ancestor path (stop early when already dirty, which keeps it linear). Then an iterative DFS in index order that prunes clean OnPush subtrees.</p>`,
        code: { lang: 'js', run: true, code: `function refreshed(parent, onPush, events) {
  const n = parent.length, dirty = new Array(n).fill(false), kids = Array.from({ length: n }, () => []);
  for (let i = 1; i < n; i++) kids[parent[i]].push(i);
  for (const e of events) for (let v = e; v !== -1 && !dirty[v]; v = parent[v]) dirty[v] = true;
  const out = [], stack = [0];
  while (stack.length) {
    const v = stack.pop();
    if (onPush[v] && !dirty[v]) continue;      // prune subtree
    out.push(v);
    for (let k = kids[v].length - 1; k >= 0; k--) stack.push(kids[v][k]);
  }
  return out;
}
const F = false, T = true;
console.log(refreshed([-1, 0, 0, 2, 2], [F, F, T, T, T], [4]));
console.log(refreshed([-1, 0, 0, 2, 2], [F, F, T, T, T], []));
console.log(refreshed([-1, 0, 1], [T, T, T], [2]));` },
        dry: { head: ['Step', 'Action', 'out'], rows: [['mark', '4,2,0 dirty', '[]'], ['pop 0', 'Default → refresh', '[0]'], ['pop 1', 'Default', '[0,1]'], ['pop 2', 'dirty', '[0,1,2]'], ['pop 3', 'clean OnPush skip', '[0,1,2]'], ['pop 4', 'dirty', '[0,1,2,4]']] },
        complexity: `<p>O(n + events) because marking stops at the first already-dirty ancestor.</p>`
      }
    }]
  });

  /* =====================================================================
     TOPIC 4 — The signals reactive graph: producers, consumers, versions
     ===================================================================== */
  topics.push({
    title: 'Inside Signals: the Reactive Graph, Producer and Consumer Nodes, Push-then-Pull',
    analogy: `<p>Think of a <b>newsroom</b>. Reporters (signals) write facts. Editors (computed) build stories from some facts. The printed page (a template or effect) shows stories. When a fact changes, the reporter does <b>not</b> rewrite every story. They just shout "<b>my fact changed!</b>" down the hall, and every editor who used that fact puts a sticky note "maybe stale" on their desk (push dirtiness). Nothing is rewritten until someone <b>actually asks for the page</b>; then each editor checks whether any of their facts really have a new version, and only then rewrites (pull). If the new fact equals the old one, nobody rewrites anything.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> Every <code>signal</code>, <code>computed</code>, <code>effect</code> and every component template is a <b>node</b> in a graph. Nodes that hold or compute a value are <b>producers</b>. Nodes that read values are <b>consumers</b>. A <code>computed</code> is both. Edges are recorded <b>automatically</b> while a consumer runs: any signal you call inside it becomes a dependency. This core lives in <code>@angular/core/primitives/signals</code> and is close to the TC39 Signals proposal.</p>
      ${H.table(['Node', 'Producer?', 'Consumer?', 'Notes'], [
        ['<code>signal()</code>', 'yes', 'no', 'Holds a value and a <b>version</b> number that increases when <code>set</code> gives a non-equal value'],
        ['<code>computed()</code>', 'yes', 'yes', 'Lazy and memoised: runs only when read and something it depends on really changed'],
        ['<code>effect()</code>', 'no', 'yes', 'A <b>live</b> consumer: scheduled to re-run when its deps change'],
        ['Template of a component', 'no', 'yes', 'Each view has a reactive consumer; a change marks <i>that view</i> for refresh'],
        ['<code>linkedSignal()</code> (v19+), <code>resource()</code>', 'yes', 'yes', 'Writable state derived from a source; async data as signals']
      ])}
      <p>🔵 <b>The algorithm: push dirty, pull values.</b></p>
      <ol>
        <li><code>count.set(5)</code>: if <code>equal(old, new)</code> is true (default <code>Object.is</code>), stop. Otherwise bump <code>count</code>'s version.</li>
        <li><b>Push</b>: walk the <i>live</i> consumers of <code>count</code> and mark them dirty, recursively (a dirty computed marks its own live consumers). No computation happens yet. Templates and effects reached this way get scheduled.</li>
        <li><b>Pull</b>: when a scheduled template or effect runs, it reads its computeds. A dirty computed first asks each producer "did your version change since I last looked?" (it stores the version it saw per edge). If none changed, it keeps its cached value and does not re-run. If one did, it re-runs, and if the new result is <code>equal</code> to the old one its own version does not change, so <i>its</i> consumers stay calm.</li>
      </ol>
      <p>This combination gives <b>glitch-free</b> reads (you never see a mix of old and new values) and <b>minimal recomputation</b>.</p>
      <p>🔵 <b>Live vs non-live consumers.</b> A computed read only from plain code (no template/effect above it) is not "live": producers keep no reference to it, so it can be garbage-collected and is checked by polling versions when read. Once a live consumer depends on it, producer→consumer links are created so pushes can reach it. This avoids memory leaks from forgotten computeds.</p>
      <p>🔵 <b>Templates as consumers.</b> When a template runs in update mode it is the "active consumer", so every signal call inside it records an edge to that view's consumer node. When any of those signals changes, Angular marks the view for refresh and notifies the scheduler. This is why a signal read in an OnPush template "just works" without <code>markForCheck</code>.</p>`,
    clues: [
      '"How does Angular know which component to update when a signal changes?" → the template is a reactive consumer; dependencies are tracked when it runs',
      '"computed runs too often / not at all" → it is lazy and memoised; it re-runs only when read and a dependency version changed',
      '"Set a signal to the same value, does anything update?" → no, the <code>equal</code> check stops it (provide a custom <code>equal</code> for objects)',
      '"Diamond dependency / glitch" → push-then-pull with versions gives glitch-free reads',
      '"Read a signal without creating a dependency" → <code>untracked()</code>',
      '"Writing signals inside computed" → not allowed; use <code>linkedSignal</code> or an effect/event handler'
    ],
    code: [
      { lang: 'js', run: true, title: 'Runnable mini signals: versions, push-dirty, pull-recompute, equality cut-off', code: `let activeConsumer = null;
const log = [];
function signal(value, equal = Object.is) {
  const node = { value, version: 0, consumers: new Set() };
  const read = () => { track(node); return node.value; };
  read.set = v => {
    if (equal(node.value, v)) return;            // equality cut-off
    node.value = v; node.version++;
    node.consumers.forEach(markDirty);             // PUSH: mark only, no compute
  };
  return read;
}
function track(producer) {
  if (activeConsumer) { activeConsumer.deps.set(producer, producer.version); producer.consumers.add(activeConsumer); }
}
function markDirty(c) { if (c.dirty) return; c.dirty = true; if (c.consumers) c.consumers.forEach(markDirty); if (c.schedule) c.schedule(); }
function computed(fn, name) {
  const node = { value: undefined, version: 0, dirty: true, deps: new Map(), consumers: new Set() };
  function refresh() {
    if (!node.dirty) return;
    // PULL: if no dependency version changed, keep the cached value
    let changed = node.version === 0;
    for (const [p, seen] of node.deps) { if (p.refresh) p.refresh(); if (p.version !== seen) changed = true; }
    node.dirty = false;
    if (!changed) return;
    const prev = activeConsumer; activeConsumer = node; node.deps = new Map();
    const v = fn(); activeConsumer = prev;
    log.push('recompute ' + name);
    if (node.version === 0 || !Object.is(v, node.value)) { node.value = v; node.version++; }
  }
  node.refresh = refresh;
  return () => { refresh(); track(node); return node.value; };
}
const price = signal(10), qty = signal(2);
const total = computed(() => price() * qty(), 'total');
const isBig = computed(() => total() > 100, 'isBig');
const view = { dirty: false, schedule() { log.push('schedule view refresh'); } };
activeConsumer = view; view.deps = new Map(); isBig(); activeConsumer = null;   // template reads isBig
log.push('--- qty.set(2) same value'); qty.set(2);
log.push('--- qty.set(3)'); qty.set(3);
console.log('isBig =', isBig());               // pulls: total recomputes (30), isBig recomputes (still false)
view.dirty = false;                            // the view refreshed, so it is clean again
log.push('--- price.set(50)'); price.set(50);
console.log('isBig =', isBig());
console.log(log.join('\\n'));` },
      { lang: 'ts', title: 'Equality, untracked and linkedSignal in real Angular', code: `import { Component, computed, effect, linkedSignal, signal, untracked } from '@angular/core';

interface Filter { term: string; page: number; }

@Component({
  selector: 'app-search',
  standalone: true,
  template: '<input [value]="filter().term" (input)="setTerm($any($event.target).value)" /> page {{ page() }}',
})
export class SearchComponent {
  // Custom equality: a new object with the same contents does not notify consumers.
  filter = signal<Filter>({ term: '', page: 1 }, {
    equal: (a, b) => a.term === b.term && a.page === b.page,
  });
  // linkedSignal: writable, but resets whenever its source (the term) changes.
  page = linkedSignal(() => {
    this.filter().term;
    return 1;
  });
  results = computed(() => 'results for "' + this.filter().term + '"');

  constructor() {
    effect(() => {
      const term = this.filter().term;              // tracked dependency
      const p = untracked(() => this.page());       // read without subscribing
      console.log('search', term, 'starting at page', p);
    });
  }
  setTerm(term: string): void {
    this.filter.update(f => ({ ...f, term }));
  }
}` }
    ],
    viz: {
      title: 'Push dirty, then pull: watch a signal change travel the graph',
      input: 'qty=3 price=50 qty=3',
      inputLabel: 'Writes like qty=3 price=50 (price starts 10, qty 2; up to 5 writes)',
      gen: function (input) {
        var ops = words(input, 5, 'Write like: qty=3 price=50');
        var st = { price: 10, qty: 2 };
        var total = 20, big = false;
        var nodes = [{ id: 'price', label: 'price', x: 15, y: 10, shape: 'box', w: 14 }, { id: 'qty', label: 'qty', x: 15, y: 50, shape: 'box', w: 14 },
          { id: 'total', label: 'total = p×q', x: 45, y: 30, shape: 'box', w: 18 }, { id: 'big', label: 'isBig = total>100', x: 72, y: 30, shape: 'box', w: 20 },
          { id: 'view', label: 'Template', x: 93, y: 30, shape: 'box', w: 12 }];
        var edges = [['price', 'total'], ['qty', 'total'], ['total', 'big'], ['big', 'view']];
        function g(hl, ehl, lbl) { return { type: 'graph', label: lbl || 'Reactive graph', directed: true, height: 60, nodes: nodes, edges: edges, hl: hl, ehl: ehl || {} }; }
        function vals() { return { type: 'vars', label: 'Values', vals: { price: st.price, qty: st.qty, total: total, isBig: String(big) } }; }
        var frames = [{ narr: 'Start: the template read <code>isBig()</code>, which read <code>total()</code>, which read <code>price()</code> and <code>qty()</code>. Those reads recorded the edges. price=10, qty=2, total=20, isBig=false.', parts: [g({}), vals()] }];
        ops.forEach(function (op) {
          var m = /^(price|qty)=(-?\d{1,6})$/.exec(op);
          if (!m) throw new Error('Each write must look like qty=3 or price=50');
          var k = m[1], v = parseInt(m[2], 10);
          if (st[k] === v) {
            var h0 = {}; h0[k] = 'done';
            frames.push({ narr: '<code>' + k + '.set(' + v + ')</code>: equal to the current value, so the version does not change and <b>nothing</b> is notified.', parts: [g(h0), vals()] });
            return;
          }
          st[k] = v;
          var h1 = {}; h1[k] = 'cur';
          frames.push({ narr: '<code>' + k + '.set(' + v + ')</code>: value changes, version goes up.', parts: [g(h1), vals()] });
          var h2 = { total: 'bad', big: 'bad', view: 'bad' }; h2[k] = 'cur'; var e2 = {}; e2[k + '-total'] = 'bad'; e2['total-big'] = 'bad'; e2['big-view'] = 'bad';
          frames.push({ narr: '<b>Push</b>: mark live consumers dirty: total, isBig, and the template (which gets scheduled). <i>No computation yet.</i>', parts: [g(h2, e2), vals()] });
          var nt = st.price * st.qty, nb = nt > 100;
          total = nt;
          frames.push({ narr: '<b>Pull</b>: the view refreshes and reads isBig; isBig sees total is dirty, total sees ' + k + '\'s version changed, so total recomputes to <b>' + nt + '</b>.', parts: [g({ total: 'ok', big: 'cur' }), vals()] });
          if (nb === big) {
            frames.push({ narr: 'isBig recomputes: still <b>' + nb + '</b>. Equal to before, so its version does not change. The template binding compare finds no change: zero DOM writes.', parts: [g({ big: 'done', view: 'done' }), vals()] });
          } else {
            big = nb;
            frames.push({ narr: 'isBig recomputes to <b>' + nb + '</b>: a real change, so the template\'s binding updates the DOM.', parts: [g({ big: 'ok', view: 'ok' }), vals()] });
          }
        });
        return pad4(frames);
      }
    },
    examples: [
      { title: 'The diamond without glitches', html: `<p><code>first</code> and <code>last</code> are signals; <code>full = computed(() =&gt; first() + ' ' + last())</code>; <code>initials</code> reads <code>first</code> too. Setting <code>first</code> marks both dirty; when the template pulls, each recomputes once using the <b>same</b> new value of <code>first</code>. With naive event-emitter "push values" you could briefly render a new first name with an old full name.</p>` },
      { title: 'Objects need a custom equal (or immutable updates)', html: `<p><code>user.update(u =&gt; { u.name = 'x'; return u; })</code> returns the <b>same</b> object, so <code>Object.is</code> says "equal" and nothing updates. Always return a new object: <code>user.update(u =&gt; ({ ...u, name: 'x' }))</code>. Conversely, if the server returns a fresh but identical object every poll, a custom <code>equal</code> stops pointless re-renders.</p>` },
      { title: 'Effects are the last resort', html: `<p>Effects are live consumers that run later (scheduled), so using them to copy state from one signal to another creates extra rounds and ordering surprises. Derive with <code>computed</code>; reset-on-change with <code>linkedSignal</code>; load async data with <code>resource()</code>/<code>httpResource()</code> (experimental in v19–v20); keep effects for side effects such as logging, <code>localStorage</code> or a third-party chart.</p>` }
    ],
    deepDive: `<p>🟣 <b>Versions on edges.</b> Each consumer stores, per producer, the version it last saw. Checking "did anything change?" is then a loop of integer compares, which is what makes the pull phase cheap. Producers themselves keep a list of <i>live</i> consumers only.</p>
      <p>🟣 <b>Epochs.</b> The implementation keeps a global epoch counter bumped on every signal write; a computed that already validated itself in the current epoch can skip checking its dependencies again. You do not need this detail in interviews, but it explains why many reads in one render are cheap.</p>
      <p>🟣 <b>Effect timing (v19+).</b> Effects created in components run as part of change detection for that component's position in the tree (before its template refresh), while "root" effects created in services run before the view tree is refreshed. Effects also clean up automatically with the injection context's <code>DestroyRef</code>.</p>
      <p>🟣 <b>Bridging RxJS.</b> <code>toSignal(obs$)</code> subscribes immediately and unsubscribes on destroy; <code>toObservable(sig)</code> uses an effect, so it emits asynchronously and only the latest value per round (it will not emit every intermediate <code>set</code>). Know this when someone expects a synchronous stream.</p>
      <p>🟣 <b>Errors.</b> Writing a signal inside a <code>computed</code> throws. Reading a signal in a constructor or <code>ngOnInit</code> outside a reactive context just returns the value without tracking, a common source of "my value never updates".</p>`,
    aiEra: `<p>🤖 Code assistants trained on years of RxJS-heavy Angular often generate <code>BehaviorSubject</code> stores or effect-chains that copy signals into signals. Ask explicitly for "derived state via computed, no effects for state propagation", and review for mutation inside <code>update</code>. AI is helpful for mechanical migrations (the Angular CLI also ships schematics: <code>ng generate @angular/core:signal-input-migration</code>, <code>:output-migration</code>, <code>:signal-queries-migration</code>). Your value is knowing the graph semantics: laziness, equality cut-off, live vs non-live, and when an effect runs.</p>`,
    problems: [{
      title: 'Minimal Recompute: Which Computeds Re-run?',
      level: 'Hard', tags: ['signals', 'graph', 'memoization'], companies: ['Google', 'Meta'],
      statement: `<p>A DAG of computeds is given as <code>deps: { name: [dependencyNames] }</code> plus <code>fn: { name: (vals) =&gt; value }</code>. Sources are plain values. After changing one source, implement push-then-pull from the single <b>sink</b> <code>'view'</code>: return the list of computeds that actually re-ran. A computed re-runs only if at least one dependency's value changed (by <code>Object.is</code>).</p>`,
      constraints: `Up to 1000 nodes. Graph is acyclic.`,
      example: `<p>a=1, b=a*0, c=b+1, view=c. Change a to 5: b re-runs (0 → 0, unchanged), so c and view do <b>not</b> re-run. Answer ${H.c('g', "['b']")}.</p>`,
      brute: { why: `<p>Recompute every node downstream of the change in topological order. Correct values, but ignores the equality cut-off, so it does all the work signals are designed to skip.</p>`,
        code: { lang: 'js', run: true, code: `// Brute: everything downstream of 'a' re-runs
const down = { a: ['b'], b: ['c'], c: ['view'] };
const ran = [];
(function visit(n) { for (const m of down[n] || []) { ran.push(m); visit(m); } })('a');
console.log(ran); // ['b','c','view'] although b's value did not change` } },
      mcq: { q: 'After <code>b</code> recomputes to the same value, why does <code>c</code> stay cached?', options: ['b\'s version did not increase, so c sees no changed dependency', 'c is never dirty', 'Angular caches c forever'], answer: 0, explain: 'Equality cut-off: an unchanged value keeps the version, so consumers skip recomputation.' },
      hints: [
        `<p>Hint 1: store a value and version for each node; sources bump version when changed.</p>`,
        `<p>Hint 2: pull(node): first pull every dependency; then if any dependency version differs from the version you recorded, re-run fn.</p>`,
        `<p>Hint 3: only bump the node's own version if the new value differs. Memoize per pull round so shared deps are pulled once.</p>`
      ],
      solution: {
        approach: `<p>Keep <code>value</code>, <code>version</code> and <code>seen</code> (versions of deps last time). Pull recursively from the sink; a node recomputes only if some dependency version changed, and bumps its own version only if its value changed. Shared nodes are visited once per round.</p>`,
        code: { lang: 'js', run: true, code: `function makeGraph(sources, deps, fn) {
  const N = {};
  for (const s in sources) N[s] = { value: sources[s], version: 1 };
  for (const c in deps) N[c] = { value: undefined, version: 0, seen: {} };
  let round = 0;
  function pull(name, ran) {
    const n = N[name];
    if (!deps[name] || n.round === round) return;
    n.round = round;
    let changed = n.version === 0;
    for (const d of deps[name]) { pull(d, ran); if (N[d].version !== n.seen[d]) changed = true; }
    if (!changed) return;
    deps[name].forEach(d => (n.seen[d] = N[d].version));
    const v = fn[name](deps[name].map(d => N[d].value));
    ran.push(name);
    if (n.version === 0 || !Object.is(v, n.value)) { n.value = v; n.version++; }
  }
  return {
    set(s, v) { if (!Object.is(N[s].value, v)) { N[s].value = v; N[s].version++; } },
    read(sink) { round++; const ran = []; pull(sink, ran); return { value: N[sink].value, ran }; }
  };
}
const deps = { b: ['a'], c: ['b'], view: ['c'] };
const fn = { b: ([a]) => a * 0, c: ([b]) => b + 1, view: ([c]) => 'c=' + c };
const g = makeGraph({ a: 1 }, deps, fn);
console.log(g.read('view'));   // first read: everything runs
g.set('a', 5);
console.log(g.read('view'));   // only b re-runs
g.set('a', 5);
console.log(g.read('view'));   // nothing re-runs` },
        dry: { head: ['Read', 'Change', 'ran'], rows: [['1', '(initial)', "['b','c','view']"], ['2', 'a: 1 → 5', "['b'] (b still 0)"], ['3', 'a: 5 → 5', '[]']] },
        complexity: `<p>O(V + E) per read in the worst case; usually far less because unchanged branches stop early.</p>`
      }
    }]
  });

  /* =====================================================================
     TOPIC 5 — zone.js, NgZone and zoneless scheduling
     ===================================================================== */
  topics.push({
    title: 'Who Triggers Change Detection? zone.js Patching, NgZone and Zoneless Scheduling',
    analogy: `<p>With <b>zone.js</b>, Angular is like a shop owner who installed <b>motion sensors on every door, phone and mailbox</b>. Any activity at all (a timer, a click, a server reply) rings a bell, and when things go quiet the owner walks the whole shop checking shelves, even if the activity was a fly. <b>Zoneless</b> is the owner who takes the sensors out and instead asks staff to <b>ring the bell only when they actually change a shelf</b> (set a signal, mark for check). Fewer bells, fewer walks, but staff must remember to ring.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> Change detection needs a trigger. Angular has two ways to know "something might have changed":</p>
      ${H.table(['', 'zone.js (classic)', 'Zoneless'], [
        ['How it learns', '<b>Monkey-patches</b> async browser APIs (setTimeout, Promise, addEventListener, XHR, fetch, requestAnimationFrame…) so it knows when any async task runs', 'Explicit <b>notifications</b>: signal read by a template changed, <code>markForCheck()</code> (and AsyncPipe), template/host listener fired, <code>ComponentRef.setInput()</code>, a view attached or removed'],
        ['When it ticks', 'When the Angular zone becomes stable (<code>onMicrotaskEmpty</code>) after a task', 'A scheduler batches notifications and runs <code>ApplicationRef.tick()</code> soon after (racing a macrotask and an animation frame)'],
        ['Cost', '~30 KB+ polyfill, a tick after <i>every</i> async task, stack traces full of zone frames', 'No polyfill, fewer ticks, cleaner stacks; needs OnPush-friendly code'],
        ['Setup', '<code>provideZoneChangeDetection({ eventCoalescing: true })</code> + <code>zone.js</code> in polyfills', '<code>provideZonelessChangeDetection()</code> (experimental API in v18–v19, stable in v20) and remove <code>zone.js</code> from polyfills']
      ])}
      <p>🔵 <b>NgZone in zone apps.</b> Angular runs your app inside an "Angular zone". <code>NgZone</code> exposes it:</p>
      <ul>
        <li><code>zone.runOutsideAngular(fn)</code>: async work started in <code>fn</code> (scroll handlers, polling, animation loops, third-party libraries) will <b>not</b> trigger ticks.</li>
        <li><code>zone.run(fn)</code>: re-enter the zone so a change made from outside is noticed.</li>
        <li><code>onStable</code> / <code>onMicrotaskEmpty</code>: events used by the framework and tests (<code>whenStable</code>).</li>
      </ul>
      <p>🔵 <b>Hybrid scheduling (v18+).</b> Even in zone apps, Angular now also listens to the zoneless notifications: a signal set or <code>markForCheck</code> made outside the zone still schedules a tick. That makes migrating to zoneless incremental.</p>
      <p>🔵 <b>What breaks when you go zoneless.</b> Code that mutated a plain field in a <code>setTimeout</code>, a Promise <code>.then</code> or an RxJS <code>subscribe</code> and relied on zone.js to notice. Fix: store the value in a signal, use the <code>async</code> pipe, or call <code>markForCheck()</code>. OnPush-everywhere + signals apps usually switch with almost no changes. SSR also needs to know when the app is "done": in zoneless apps use <code>PendingTasks</code> (HttpClient and the router already do).</p>`,
    clues: [
      '"Change detection runs hundreds of times per second" → a scroll/mousemove/interval inside the Angular zone; use <code>runOutsideAngular</code> or zoneless',
      '"How does Angular know a setTimeout changed data?" → zone.js patched setTimeout and ticks when the zone is stable',
      '"Remove zone.js / smaller bundle / cleaner stack traces" → <code>provideZonelessChangeDetection()</code>',
      '"After going zoneless the view does not update after an API call" → the value was a plain field set in subscribe; use a signal or AsyncPipe',
      '"SSR never finishes / waits forever" → a never-ending timer keeps the zone unstable, or a zoneless app has untracked async work: use <code>PendingTasks</code>',
      '"Third-party chart library triggers CD constantly" → initialise it in <code>runOutsideAngular</code>'
    ],
    code: [
      { lang: 'js', run: true, title: 'Runnable model: zone-style tick-after-every-task vs a zoneless coalescing scheduler', code: `// zone-style: every async task ends with a tick
let zoneTicks = 0;
function zoneTask(work) { work(); zoneTicks++; }              // patched API wraps the callback
for (let i = 0; i < 50; i++) zoneTask(() => {});            // 50 mousemove events with no state change
zoneTask(() => {});                                          // one real change
console.log('zone.js ticks:', zoneTicks);

// zoneless-style: only notifications schedule, and many notifications coalesce into one tick
let zonelessTicks = 0, scheduled = false;
const queue = [];
function notify(reason) {
  queue.push(reason);
  if (scheduled) return;
  scheduled = true;
  setTimeout(() => {                                          // real Angular races setTimeout and rAF
    scheduled = false;
    zonelessTicks++;
    console.log('tick #' + zonelessTicks + ' for: ' + queue.splice(0).join(', '));
  }, 0);
}
for (let i = 0; i < 50; i++) { /* mousemove handler that changes nothing: no notification */ }
notify('signal count changed');
notify('markForCheck from AsyncPipe');
notify('signal total changed');
setTimeout(() => console.log('zoneless ticks:', zonelessTicks), 5);` },
      { lang: 'ts', title: 'Zoneless bootstrap + code that stays correct without zone.js', code: `import { ApplicationConfig, ChangeDetectionStrategy, Component, inject, provideZonelessChangeDetection, signal } from '@angular/core';
import { provideHttpClient, HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),   // v20 stable name (v18-v19: provideExperimentalZonelessChangeDetection)
    provideHttpClient(),
  ],
};

interface Stats { users: number; }

@Component({
  selector: 'app-stats',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<p>Users: {{ stats()?.users }}</p><p>Seconds: {{ seconds() }}</p>',
})
export class StatsComponent {
  // HTTP result as a signal: when it arrives, the template is notified.
  stats = toSignal(inject(HttpClient).get<Stats>('/api/stats'));
  seconds = signal(0);
  constructor() {
    // A plain field mutated here would NOT re-render without zone.js; a signal does.
    setInterval(() => this.seconds.update(s => s + 1), 1000);
  }
}` }
    ],
    viz: {
      title: 'Count ticks: zone.js vs zoneless for the same stream of events',
      input: 'move move move click timer move http',
      inputLabel: 'Events (move, scroll, click, timer, http, signal) — up to 14',
      gen: function (input) {
        var evs = words(input, 14, 'Type events like: move click timer http');
        var changes = { click: true, http: true, signal: true, timer: false, move: false, scroll: false };
        var zone = 0, zl = 0, pend = [], frames = [];
        frames.push({ narr: 'Two apps receive the same events. zone.js ticks after every patched async task. Zoneless ticks only when something notifies Angular (a signal set, markForCheck, a bound listener), and coalesces bursts.',
          parts: [{ type: 'bars', label: 'Ticks so far', values: [0, 0], idxLabels: ['zone.js', 'zoneless'] }] });
        evs.forEach(function (e, i) {
          if (!(e in changes)) throw new Error('Unknown event "' + e + '". Use move, scroll, click, timer, http, signal');
          zone++;
          var notifies = changes[e];
          if (notifies) pend.push(e);
          var flush = notifies && (i === evs.length - 1 || !changes[evs[i + 1]]);
          if (flush) zl++;
          frames.push({ narr: '<b>' + e + '</b>: zone.js ticks (it cannot tell whether data changed). ' + (notifies ? (flush ? 'Zoneless: a notification was made; the scheduler runs <b>one</b> tick for ' + pend.join(' + ') + '.' : 'Zoneless: notification queued; the next one in the same burst will be coalesced.') : 'Zoneless: the handler (unbound listener, or a timer that changed no signal) did not notify, so <b>no tick</b>.'),
            parts: [{ type: 'bars', label: 'Ticks so far', values: [zone, zl], idxLabels: ['zone.js', 'zoneless'], hl: { 0: 'cur', 1: flush ? 'ok' : 'done' } },
              { type: 'queue', label: 'Zoneless pending notifications', items: pend.slice() }] });
          if (flush) pend = [];
        });
        frames.push({ narr: 'Result: zone.js ran ' + zone + ' ticks, zoneless ' + zl + '. In real apps with mousemove/scroll listeners inside the zone, this gap is the main performance win (and why <code>runOutsideAngular</code> existed).',
          parts: [{ type: 'bars', label: 'Total ticks', values: [zone, zl], idxLabels: ['zone.js', 'zoneless'], hl: { 1: 'ok' } }] });
        return pad4(frames);
      }
    },
    examples: [
      { title: 'A scroll listener that melts the CPU', html: `<p><code>window.addEventListener('scroll', ...)</code> inside a component in a zone app runs a full app tick on every scroll event (dozens per second). Wrap it: <code>zone.runOutsideAngular(() =&gt; addEventListener('scroll', handler, { passive: true }))</code>, and inside the handler only re-enter (<code>zone.run</code>) or set a signal when the state you show really changes (e.g. "header is sticky" flips).</p>` },
      { title: 'Event coalescing', html: `<p>A click on a button inside a clickable card fires two listeners (bubbling). Without coalescing, zone apps tick twice. <code>provideZoneChangeDetection({ eventCoalescing: true })</code> (default in new zone-based projects) batches them into one tick scheduled for the next animation frame. Zoneless gets coalescing by design.</p>` },
      { title: 'Migration checklist to zoneless', html: `<ol><li>Make components OnPush (zoneless works with Default too, but OnPush code is already notification-correct).</li><li>Find plain fields mutated in async callbacks; convert to signals or AsyncPipe.</li><li>Remove <code>NgZone.onStable</code>/<code>onMicrotaskEmpty</code>-based logic; use <code>afterNextRender</code>/<code>afterEveryRender</code> (named <code>afterRender</code> before v20).</li><li>Add <code>provideZonelessChangeDetection()</code>, remove <code>zone.js</code> from <code>polyfills</code> in <code>angular.json</code> (and test polyfills).</li><li>In tests, replace <code>fakeAsync</code>-dependent code where needed and use <code>await fixture.whenStable()</code>.</li></ol>` }
    ],
    deepDive: `<p>🟣 <b>How patching works.</b> zone.js replaces globals like <code>window.setTimeout</code> with wrappers that record the current zone and wrap the callback; when the callback runs, the zone's hooks (<code>onInvokeTask</code>, <code>onHasTask</code>) fire. <code>Promise</code> is replaced by <code>ZoneAwarePromise</code>. Native <code>async/await</code> cannot be patched, so the CLI downlevels <code>async/await</code> to generators for zone apps — one more reason zoneless builds are smaller and faster.</p>
      <p>🟣 <b>When the zone is "stable".</b> NgZone counts pending microtasks and macrotasks. After a task, when the microtask queue drains, it emits <code>onMicrotaskEmpty</code>, and <code>ApplicationRef</code> subscribes to run <code>tick()</code>. <code>onStable</code> fires when no microtasks remain; SSR waits for "no pending macrotasks" too, which is why a stray <code>setInterval</code> blocks server rendering.</p>
      <p>🟣 <b>The zoneless scheduler.</b> It schedules a tick with both a <code>setTimeout</code> and a <code>requestAnimationFrame</code> and runs on whichever comes first, cancelling the other. That keeps rendering responsive when the tab is visible and still progresses in background tabs where rAF is throttled. Multiple notifications before the tick coalesce.</p>
      <p>🟣 <b>Testing.</b> <code>fakeAsync</code>/<code>tick()</code> depend on zone.js's testing patch. Zoneless tests use real async (<code>await fixture.whenStable()</code>) or Jasmine/Jest fake timers. <code>fixture.autoDetectChanges()</code> plus signals mirrors production most closely.</p>
      <p>🟣 <b>Versions.</b> v18 introduced experimental zoneless, v19 developer preview, v20 promoted it to stable with the renamed <code>provideZonelessChangeDetection</code>; v21 makes zoneless the default for new projects. Interviewers mostly want the trade-off, not exact dates.</p>`,
    aiEra: `<p>🤖 A large share of Angular code an assistant has seen assumes zone.js. Generated snippets commonly mutate fields inside <code>subscribe</code> or <code>setTimeout</code>; in a zoneless app those silently fail to render. Make your instructions explicit ("this app is zoneless; state must be signals") and add a lint/test that runs the app zoneless. AI is effective at producing the migration diff across many files once you define the rule, and at explaining patched stack traces. The judgement call — whether a team should go zoneless now, given third-party libraries that expect zone.js — is yours.</p>`,
    problems: [{
      title: 'Coalesce Notifications into Ticks',
      level: 'Medium', tags: ['zoneless', 'scheduler', 'batching'], companies: ['Google', 'Microsoft'],
      statement: `<p>Given a sorted list of notification timestamps (ms) and a scheduling delay <code>d</code>, simulate a coalescing scheduler: the first notification while idle schedules a tick at <code>t + d</code>; all notifications with time ≤ that tick time are handled by it. Return the list of tick times.</p>`,
      constraints: `Up to 10<sup>5</sup> timestamps, d ≥ 0.`,
      example: `<p>times <code>[0, 1, 2, 20, 21]</code>, d = 4 → ${H.c('g', '[4, 24]')}: first burst handled at 4, second at 24.</p>`,
      brute: { why: `<p>One tick per notification: simple, but it is the zone-like behaviour we want to avoid.</p>`,
        code: { lang: 'js', run: true, code: `const ticksBrute = (times, d) => times.map(t => t + d);
console.log(ticksBrute([0, 1, 2, 20, 21], 4)); // 5 ticks` } },
      mcq: { q: 'Why does coalescing not lose updates?', options: ['The tick reads the latest state of all marked views', 'It replays every notification in order', 'It skips views that changed twice'], answer: 0, explain: 'Change detection renders current state, not a list of events, so one tick covers all earlier notifications.' },
      hints: [
        `<p>Hint 1: keep the time of the pending tick, or null when idle.</p>`,
        `<p>Hint 2: for each timestamp, if a tick is pending and t ≤ tickTime, it is absorbed.</p>`,
        `<p>Hint 3: otherwise schedule a new tick at t + d. One linear pass.</p>`
      ],
      solution: {
        approach: `<p>Linear scan keeping the latest scheduled tick time. A timestamp after that time starts a new batch.</p>`,
        code: { lang: 'js', run: true, code: `function ticks(times, d) {
  const out = [];
  let pending = -Infinity;
  for (const t of times) {
    if (t <= pending) continue;        // absorbed by the scheduled tick
    pending = t + d;
    out.push(pending);
  }
  return out;
}
console.log(ticks([0, 1, 2, 20, 21], 4));
console.log(ticks([], 4));
console.log(ticks([5, 5, 5], 0));` },
        dry: { head: ['t', 'pending', 'out'], rows: [['0', '4', '[4]'], ['1', '4', '[4]'], ['2', '4', '[4]'], ['20', '24', '[4,24]'], ['21', '24', '[4,24]']] },
        complexity: `<p>O(n) time, O(1) extra space.</p>`
      }
    }]
  });

  /* =====================================================================
     TOPIC 6 — Bundles, lazy chunks, esbuild builder, analysis & budgets
     ===================================================================== */
  var CHUNKS = [
    ['main', 180, 'initial'], ['polyfills', 35, 'initial'], ['styles', 40, 'initial'],
    ['chunk-shared', 60, 'initial'], ['admin', 220, 'lazy'], ['charts', 310, 'lazy'], ['settings', 45, 'lazy']
  ];

  topics.push({
    title: 'Bundle Size, Lazy Chunks, the esbuild Application Builder, Build Analysis & Budgets',
    analogy: `<p>Shipping an app is like <b>packing for a trip</b>. What you carry onto the plane (the <b>initial bundle</b>) slows you at every step, so it should hold only what you need on day one. Everything else goes in <b>suitcases shipped later</b> (lazy chunks), opened when you reach that city (route) or need that outfit (<code>@defer</code>). The airline's <b>weight limit</b> is your performance budget: the check-in desk refuses an overweight bag before it ever reaches the plane. And when your bag is too heavy, you <b>unpack it onto the bed</b> to see what is taking space (bundle analysis).</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> The browser must download, parse and run your initial JavaScript before the page becomes interactive. Smaller initial JS means faster LCP/INP on real phones. Angular's tools for this: <b>lazy routes</b> (<code>loadComponent</code>, <code>loadChildren</code>), <b><code>@defer</code></b> blocks, tree-shaking, and <b>budgets</b> that fail the build when you regress.</p>
      <p>🔵 <b>The builder.</b> Since Angular 17, new projects use the <b><code>application</code> builder</b>, based on <b>esbuild</b> (bundling/minifying) with <b>Vite</b> as the dev server. It replaced the webpack-based <code>browser</code> builder and is much faster. The package is <code>@angular/build</code> (v18+; earlier via <code>@angular-devkit/build-angular</code>). It builds browser, server (SSR) and prerender outputs in one step. Migrate with <code>ng update @angular/cli --name use-application-builder</code>.</p>
      ${H.table(['Output file', 'What it is'], [
        ['<code>main-[hash].js</code>', 'Your bootstrap code and everything statically imported from it'],
        ['<code>polyfills-[hash].js</code>', 'zone.js and anything listed in <code>polyfills</code> (gone in zoneless apps with no polyfills)'],
        ['<code>chunk-[hash].js</code>', 'Shared code split out by esbuild, and lazy chunks from dynamic <code>import()</code>'],
        ['<code>styles-[hash].css</code>', 'Global styles; component styles live inside their JS'],
        ['<code>stats.json</code>', 'With <code>--stats-json</code>: an esbuild metafile you can load in an analyzer']
      ])}
      <p>The CLI prints an <b>Initial total</b> and a list of <b>Lazy chunk files</b>, with raw and estimated transfer (compressed) sizes. Watch the initial total.</p>
      <p>🔵 <b>Analysing what is inside.</b></p>
      <ul>
        <li><code>ng build --stats-json</code> → open <code>dist/&lt;app&gt;/stats.json</code> in the esbuild bundle analyzer (esbuild.github.io/analyze) to see a treemap and "why is this module included" import chains.</li>
        <li><code>source-map-explorer</code>: build with <code>"sourceMap": true</code>, then run <code>npx source-map-explorer dist/app/browser/*.js</code>. It maps minified bytes back to source files. Turn source maps off again (or keep them <code>hidden</code>) for production deploys.</li>
        <li>Look for: whole libraries imported for one function (moment, lodash, full icon sets), <code>@angular/compiler</code> (JIT leaking in), duplicate versions of the same package, a "shared" chunk that pulls a lazy feature into the initial load.</li>
      </ul>
      <p>🔵 <b>Budgets.</b> In <code>angular.json</code> under the production configuration: <code>"budgets": [{ "type": "initial", "maximumWarning": "500kB", "maximumError": "1MB" }, { "type": "anyComponentStyle", "maximumWarning": "4kB", "maximumError": "8kB" }]</code>. Other types: <code>bundle</code> (by name), <code>allScript</code>, <code>all</code>, <code>anyScript</code>, <code>any</code>. Budgets turn "the app got slow over a year" into a failing CI check on the PR that caused it.</p>`,
    clues: [
      '"Initial bundle is 2 MB" → analyse with <code>--stats-json</code>/source-map-explorer, lazy-load routes, <code>@defer</code> heavy widgets, replace heavy libs',
      '"Prevent bundle regressions in CI" → <code>budgets</code> in angular.json with <code>maximumError</code>',
      '"Migrate from webpack builder / slow builds" → <code>application</code> builder (esbuild + Vite)',
      '"A lazy route\'s library shows up in main" → something in the eager graph statically imports it; find the import chain',
      '"Which is better: loadComponent or @defer?" → route-level vs part-of-page splitting; both create lazy chunks',
      '"Measure compressed size, not raw" → estimated transfer size in CLI output / network panel'
    ],
    code: [
      { lang: 'json', title: 'angular.json (excerpt): application builder, budgets, stats for analysis', code: `{
  "projects": {
    "shop": {
      "architect": {
        "build": {
          "builder": "@angular/build:application",
          "options": {
            "browser": "src/main.ts",
            "polyfills": [],
            "outputPath": "dist/shop"
          },
          "configurations": {
            "production": {
              "outputHashing": "all",
              "sourceMap": { "scripts": true, "hidden": true },
              "budgets": [
                { "type": "initial", "maximumWarning": "400kB", "maximumError": "600kB" },
                { "type": "anyComponentStyle", "maximumWarning": "4kB", "maximumError": "8kB" },
                { "type": "bundle", "name": "polyfills", "maximumError": "50kB" }
              ]
            }
          },
          "defaultConfiguration": "production"
        }
      }
    }
  }
}` },
      { lang: 'bash', title: 'Inspecting the bundle', code: `# 1) esbuild metafile -> drop dist/shop/stats.json into https://esbuild.github.io/analyze/
ng build --stats-json

# 2) source-map-explorer (needs source maps for the run you analyse)
ng build --source-map
npx source-map-explorer "dist/shop/browser/*.js"

# 3) quick size listing (raw bytes) of emitted JS, largest first
ls -lS dist/shop/browser/*.js | head` },
      { lang: 'js', run: true, title: 'Runnable budget checker (like the CLI\'s budget step)', code: `function parseSize(s) {
  const m = /^(\\d+(?:\\.\\d+)?)\\s*(b|kb|mb)$/i.exec(s.trim());
  if (!m) throw new Error('bad size ' + s);
  return Number(m[1]) * { b: 1, kb: 1000, mb: 1000000 }[m[2].toLowerCase()];
}
function checkBudgets(files, budgets) {
  const initial = files.filter(f => f.initial).reduce((a, f) => a + f.bytes, 0);
  const report = [];
  for (const b of budgets) {
    let size;
    if (b.type === 'initial') size = initial;
    else if (b.type === 'bundle') size = (files.find(f => f.name === b.name) || { bytes: 0 }).bytes;
    else if (b.type === 'anyScript') size = Math.max(...files.map(f => f.bytes));
    const level = size > parseSize(b.maximumError) ? 'ERROR' : size > parseSize(b.maximumWarning || b.maximumError) ? 'WARNING' : 'ok';
    report.push(level + ' ' + b.type + (b.name ? '(' + b.name + ')' : '') + ': ' + (size / 1000).toFixed(1) + ' kB');
  }
  return report;
}
const files = [
  { name: 'main', bytes: 310000, initial: true }, { name: 'polyfills', bytes: 34000, initial: true },
  { name: 'styles', bytes: 41000, initial: true }, { name: 'chunk-charts', bytes: 520000, initial: false }
];
console.log(checkBudgets(files, [
  { type: 'initial', maximumWarning: '350kB', maximumError: '500kB' },
  { type: 'bundle', name: 'polyfills', maximumError: '50kB' },
  { type: 'anyScript', maximumWarning: '300kB', maximumError: '600kB' }
]).join('\\n'));` }
    ],
    viz: {
      title: 'Move chunks from initial to lazy and watch the initial-size budget',
      input: 'admin charts',
      inputLabel: 'Which features to lazy-load (admin, charts, settings), space separated',
      gen: function (input) {
        var lazy = String(input || '').split(/[\s,]+/).filter(Boolean).map(function (s) { return s.toLowerCase(); });
        lazy.forEach(function (l) { if (['admin', 'charts', 'settings'].indexOf(l) < 0) throw new Error('Use admin, charts or settings'); });
        var budget = 500;
        var state = CHUNKS.map(function (c) { return { name: c[0], kb: c[1], initial: true }; });
        function total() { return state.filter(function (c) { return c.initial; }).reduce(function (a, c) { return a + c.kb; }, 0); }
        function bars(hl) {
          return { type: 'bars', label: 'Chunk sizes (kB, compressed est.) — initial ones count toward the budget', values: state.map(function (c) { return c.kb; }), idxLabels: state.map(function (c) { return c.name + (c.initial ? '' : ' (lazy)'); }), hl: hl || {} };
        }
        var frames = [];
        var t0 = total(), hl0 = {};
        state.forEach(function (c, i) { hl0[i] = 'bad'; });
        frames.push({ narr: 'Everything is imported eagerly: initial total is <b>' + t0 + ' kB</b> against a budget error at ' + budget + ' kB. The build fails.', parts: [bars(hl0), { type: 'vars', label: 'Budget', vals: { initial: t0 + ' kB', maximumError: budget + ' kB', status: t0 > budget ? 'ERROR' : 'ok' }, hl: { status: 'bad' } }] });
        lazy.forEach(function (name) {
          state.forEach(function (c, i) {
            if (c.name === name && c.initial) {
              c.initial = false;
              var hl = {}; hl[i] = 'ok';
              var t = total();
              frames.push({ narr: '<b>' + name + '</b> becomes a lazy route (<code>loadChildren</code>/<code>loadComponent</code>) so esbuild emits it as a separate chunk loaded on navigation. Initial total: <b>' + t + ' kB</b>.', parts: [bars(hl), { type: 'vars', label: 'Budget', vals: { initial: t + ' kB', maximumError: budget + ' kB', status: t > budget ? 'ERROR' : 'ok' }, hl: { status: t > budget ? 'bad' : 'ok' } }] });
            }
          });
        });
        var tf = total();
        frames.push({ narr: tf > budget ? 'Still over budget. Next suspects: <code>chunk-shared</code> (what eager code imports?) and big libraries in main. Open the stats.json in an analyzer.' : 'Under budget. Add a preloading strategy so lazy chunks are fetched in the background after the first render, and keep the budget in CI so this stays true.',
          parts: [bars({}), { type: 'text', label: 'Rule of thumb', html: 'Only what the <b>first screen</b> needs belongs in the initial bundle.' }] });
        return pad4(frames);
      }
    },
    examples: [
      { title: 'The icon set that ate the bundle', html: `<p>Analysis shows 400 kB from <code>@some/icons/index.js</code>: the app imported <code>* as icons</code> to look one up by name at runtime. Static analysis cannot tree-shake dynamic lookups. Fix: import only the icons used (named imports), or load icons as SVG files lazily over HTTP.</p>` },
      { title: 'A lazy feature that is not lazy', html: `<p><code>loadChildren: () =&gt; import('./reports/routes')</code> is in place, yet the reports chart library is in <code>main</code>. The import chain in the analyzer shows <code>app.component.ts → shared/report-badge.ts → chart.service.ts → chart-lib</code>. A tiny eager component reused a service that imports the heavy library. Fix: move the heavy import behind the lazy boundary or into a <code>@defer</code> block.</p>` },
      { title: '@defer to split part of a page', html: `<p>A product page's reviews widget (with a markdown renderer) is below the fold. Wrapping it creates its own chunk, fetched when it scrolls into view.</p>`,
        code: { lang: 'ts', code: `import { Component } from '@angular/core';
import { ReviewsComponent } from './reviews.component';

@Component({
  selector: 'app-product-page',
  standalone: true,
  imports: [ReviewsComponent],
  // ReviewsComponent (and its markdown dependency) go to a separate lazy chunk
  // because they are only referenced inside @defer.
  template: '<h1>Product</h1> @defer (on viewport; prefetch on idle) { <app-reviews /> } @placeholder { <div class="skeleton">Reviews</div> }',
})
export class ProductPageComponent {}` } }
    ],
    deepDive: `<p>🟣 <b>Why esbuild is fast.</b> It is written in Go, parallelises parsing and linking, and does far fewer passes than webpack + Babel + Terser. The Angular CLI runs the Angular compiler for templates, then hands JavaScript to esbuild, and caches results between rebuilds. Dev server uses Vite with prebundled dependencies.</p>
      <p>🟣 <b>Code splitting rules.</b> esbuild splits at dynamic <code>import()</code> boundaries (lazy routes, <code>@defer</code> dependencies) and extracts modules shared by several entry points into <code>chunk-*</code> files. A shared chunk needed by the initial page is downloaded upfront; the CLI also emits <code>modulepreload</code> links for initial chunks.</p>
      <p>🟣 <b>Tree-shaking needs ES modules and no side effects.</b> CommonJS dependencies cannot be shaken well (the CLI warns: "module X is not ESM"; <code>allowedCommonJsDependencies</code> silences it, it does not fix it). Top-level side effects keep code alive. Ivy's instruction-based output and <code>providedIn: 'root'</code> services are designed to shake out when unused.</p>
      <p>🟣 <b>Raw vs transfer size.</b> Budgets measure raw (uncompressed) bytes of output files. Network cost is compressed (gzip/brotli, often 3–4× smaller), but parse and compile cost on the device is proportional to raw size. On low-end Android, 1 MB of JS can take over a second just to parse and compile.</p>
      <p>🟣 <b>Other levers.</b> Avoid polyfills you do not need (zoneless removes zone.js), use <code>NgOptimizedImage</code> for LCP images, keep global CSS small, enable SSR/prerendering for first paint, and check third-party scripts (analytics often outweighs the app).</p>`,
    aiEra: `<p>🤖 Paste the CLI's chunk table or a source-map-explorer summary into an assistant and ask "what are the top 3 likely wins?": it is quick at spotting known-heavy libraries and suggesting lighter alternatives (date-fns or <code>Intl</code> instead of moment). Verify every suggestion with a new build; AI cannot see your import graph unless you give it the analyzer output. AI can also draft budget configs and CI steps. Caution: assistants still produce webpack-era advice (<code>webpack-bundle-analyzer</code>, custom webpack configs) that does not apply to the esbuild builder.</p>`,
    problems: [{
      title: 'Find Why a Module Is in the Initial Bundle (import chain)',
      level: 'Hard', tags: ['bundling', 'graph', 'bfs'], companies: ['Amazon', 'Shopify'],
      statement: `<p>Given an import graph <code>{ file: [{ to, dynamic }] }</code> and an entry <code>'main.ts'</code>, return the shortest chain of <b>static</b> imports from the entry to a <code>target</code> file (the reason it is in the initial bundle), or <code>null</code> if it is only reachable through dynamic imports (it is lazy).</p>`,
      constraints: `Up to 10<sup>4</sup> files. Graph may have cycles.`,
      example: `<p>main → app (static) → badge (static) → chart-lib (static); main → reports (dynamic) → chart-lib. Target chart-lib → ${H.c('r', "['main.ts','app.ts','badge.ts','chart-lib']")}: the eager badge pulls it in.</p>`,
      brute: { why: `<p>DFS over all edges ignoring the dynamic flag just proves the target is reachable, which every used file is. It cannot tell "eager" from "lazy".</p>`,
        code: { lang: 'js', run: true, code: `function reachable(g, from, target, seen = new Set()) {
  if (from === target) return true;
  seen.add(from);
  return (g[from] || []).some(e => !seen.has(e.to) && reachable(g, e.to, target, seen));
}
console.log(reachable({ 'main.ts': [{ to: 'reports.ts', dynamic: true }], 'reports.ts': [{ to: 'chart-lib', dynamic: false }] }, 'main.ts', 'chart-lib')); // true, but it is lazy!` } },
      mcq: { q: 'Which edges should the search follow to explain inclusion in the initial bundle?', options: ['Only static imports', 'Only dynamic imports', 'All imports'], answer: 0, explain: 'Dynamic import() starts a new lazy chunk; only static chains place code in the initial load.' },
      hints: [
        `<p>Hint 1: shortest chain in an unweighted graph → BFS.</p>`,
        `<p>Hint 2: skip every edge marked dynamic: true, because it starts a new lazy chunk.</p>`,
        `<p>Hint 3: store a parent map to rebuild the path; a visited set handles cycles.</p>`
      ],
      solution: {
        approach: `<p>BFS from the entry over static edges only, recording parents; rebuild the path when the target is reached. This is what the esbuild analyzer's "imported by" chain shows.</p>`,
        code: { lang: 'js', run: true, code: `function whyInitial(graph, entry, target) {
  const parent = new Map([[entry, null]]);
  const q = [entry];
  for (let h = 0; h < q.length; h++) {
    const f = q[h];
    if (f === target) {
      const path = [];
      for (let x = f; x !== null; x = parent.get(x)) path.push(x);
      return path.reverse();
    }
    for (const e of graph[f] || []) {
      if (e.dynamic || parent.has(e.to)) continue;
      parent.set(e.to, f); q.push(e.to);
    }
  }
  return null;
}
const g = {
  'main.ts': [{ to: 'app.ts', dynamic: false }, { to: 'reports.ts', dynamic: true }],
  'app.ts': [{ to: 'badge.ts', dynamic: false }, { to: 'main.ts', dynamic: false }],
  'badge.ts': [{ to: 'chart-lib', dynamic: false }],
  'reports.ts': [{ to: 'chart-lib', dynamic: false }]
};
console.log(whyInitial(g, 'main.ts', 'chart-lib'));
delete g['badge.ts'];
g['app.ts'] = [];
console.log(whyInitial(g, 'main.ts', 'chart-lib')); // null -> lazy only` },
        dry: { head: ['Dequeue', 'Enqueued', 'Note'], rows: [['main.ts', 'app.ts', 'reports.ts skipped (dynamic)'], ['app.ts', 'badge.ts', 'main.ts already seen'], ['badge.ts', 'chart-lib', ''], ['chart-lib', '-', 'target: rebuild path']] },
        complexity: `<p>O(V + E) time and O(V) memory for the parent map and queue.</p>`
      }
    }]
  });

  /* =====================================================================
     TOPIC 7 — Runtime profiling and memory leaks
     ===================================================================== */
  topics.push({
    title: 'Runtime Profiling with Angular DevTools & the Chrome Performance Panel, and Hunting Memory Leaks',
    analogy: `<p>Profiling is like a <b>fitness tracker for your app</b>. Angular DevTools is the coach who knows the sport: "your <i>ProductList</i> took 18 ms in this change detection round". Chrome's Performance panel is the <b>medical scan</b>: every millisecond of the main thread, including layout, paint and garbage collection. A memory leak is a <b>bathtub with the plug half in</b>: each visit to a page adds water (listeners, subscriptions, detached DOM) that never drains, and after an hour of use the tub overflows.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> Never guess about performance: <b>measure, change one thing, measure again</b>, always on a production build (dev mode does extra checks).</p>
      ${H.table(['Tool', 'Answers', 'How'], [
        ['Angular DevTools → <b>Profiler</b>', 'How many CD cycles ran, what triggered them, which components and hooks took time', 'Start recording, interact, stop. Bar chart per cycle; flame graph per component; filter by component'],
        ['Angular DevTools → Components / Injector tree', 'Component state, inputs, signals, which injector provided what', 'Select a component, inspect and edit properties'],
        ['Chrome <b>Performance</b> panel', 'Long tasks (&gt; 50 ms), scripting vs rendering vs painting, INP interactions', 'Record with CPU throttling (4× or more) to mimic phones; look at the Main track; v20 adds Angular-specific timing via <code>enableProfiling()</code> in a custom track'],
        ['Chrome <b>Memory</b> panel', 'What objects stay alive and why (retainers)', 'Heap snapshot → do the action N times → snapshot → Comparison view; filter "Detached"'],
        ['Performance monitor / <code>performance.memory</code>', 'Live JS heap size, DOM nodes, listeners count', 'Watch counts climb when repeating a navigation']
      ])}
      <p>🔵 <b>Reading a slow interaction.</b> In the Performance panel find the long task after your click. If most time is "Scripting" under Angular's <code>tick</code>/<code>refreshView</code>, it is change detection cost: too many views checked (OnPush/signals), expensive template expressions (functions, impure pipes), or huge <code>@for</code> lists (virtual scroll, <code>track</code>). If the time is "Recalculate Style"/"Layout", it is DOM/CSS work: layout thrashing or too many nodes. Fix the right layer.</p>
      <p>🔵 <b>Classic Angular leaks.</b></p>
      <ul>
        <li><b>Subscriptions</b> to long-lived observables (a service <code>Subject</code>, <code>interval</code>, router events) never unsubscribed. HttpClient calls complete on their own; infinite streams do not. Fix: <code>takeUntilDestroyed()</code>, <code>toSignal</code>, or the <code>async</code> pipe.</li>
        <li><b>Manual DOM listeners and timers</b>: <code>addEventListener</code> on <code>window</code>, <code>setInterval</code>, <code>ResizeObserver</code>, <code>IntersectionObserver</code> without cleanup. Register cleanup with <code>inject(DestroyRef).onDestroy(...)</code> or use template/host listeners (auto-cleaned).</li>
        <li><b>Root services holding component data</b>: a singleton cache storing component instances, DOM elements or closures over them.</li>
        <li><b>Dynamic components / overlays</b> never <code>destroy()</code>ed; third-party widgets not disposed.</li>
        <li><b>Detached DOM</b>: nodes removed from the page but still referenced from JS.</li>
      </ul>`,
    clues: [
      '"The app gets slower the longer it stays open" → memory leak; heap snapshots before/after repeating a navigation',
      '"Typing in an input is laggy" → record the interaction; look for long tasks and how many CD cycles each keystroke triggers',
      '"Which component is slow?" → Angular DevTools Profiler flame graph',
      '"Unsubscribe or not?" → infinite/long-lived streams yes (<code>takeUntilDestroyed</code>), HttpClient single-shot usually not',
      '"Detached HTMLDivElement in heap snapshot" → something in JS still references removed DOM',
      '"Profile in dev mode showed 2× the cost" → dev mode runs checkNoChanges; profile production builds'
    ],
    code: [
      { lang: 'ts', title: 'Leak-free component: takeUntilDestroyed, DestroyRef cleanup, toSignal', code: `import { Component, DestroyRef, ElementRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { PriceFeed } from './price-feed.service';

@Component({
  selector: 'app-ticker',
  standalone: true,
  template: '<p>{{ price() }} · width {{ width() }} · {{ seconds() }}s</p>',
})
export class TickerComponent {
  private feed = inject(PriceFeed);
  private host = inject(ElementRef<HTMLElement>);
  width = signal(0);
  seconds = signal(0);

  // toSignal subscribes now and unsubscribes when the component is destroyed.
  price = toSignal(this.feed.prices$, { initialValue: 0 });

  constructor() {
    // takeUntilDestroyed() uses the current injection context's DestroyRef.
    interval(1000).pipe(takeUntilDestroyed()).subscribe(() => this.seconds.update(s => s + 1));

    // Observers and window listeners need explicit cleanup.
    const ro = new ResizeObserver(entries => this.width.set(Math.round(entries[0].contentRect.width)));
    ro.observe(this.host.nativeElement);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') this.width.set(0); };
    window.addEventListener('keydown', onKey);

    inject(DestroyRef).onDestroy(() => {
      ro.disconnect();
      window.removeEventListener('keydown', onKey);
    });
  }
}` },
      { lang: 'js', run: true, title: 'Runnable leak model: mount/unmount 100 times with and without cleanup', code: `// A fake "window" event target to count listeners that stay attached.
const windowListeners = new Set();
const fakeWindow = {
  addEventListener: (t, fn) => windowListeners.add(fn),
  removeEventListener: (t, fn) => windowListeners.delete(fn)
};
function mountLeaky() {
  const bigState = new Array(10000).fill(0);              // retained by the closure below
  fakeWindow.addEventListener('resize', () => bigState.length);
  return { destroy() { /* forgot to remove the listener */ } };
}
function mountClean() {
  const bigState = new Array(10000).fill(0);
  const onResize = () => bigState.length;
  fakeWindow.addEventListener('resize', onResize);
  return { destroy() { fakeWindow.removeEventListener('resize', onResize); } };
}
for (let i = 0; i < 100; i++) mountLeaky().destroy();
console.log('leaky:  listeners still attached =', windowListeners.size, '(~' + windowListeners.size * 80 + ' kB of arrays retained)');
windowListeners.clear();
for (let i = 0; i < 100; i++) mountClean().destroy();
console.log('clean:  listeners still attached =', windowListeners.size);` }
    ],
    viz: {
      title: 'Heap after repeated navigations: leak vs no leak',
      input: '6',
      inputLabel: 'How many times to open and close the page (2–10)',
      gen: function (input) {
        var n = parseInt(String(input).trim(), 10);
        if (!(n >= 2 && n <= 10)) throw new Error('Enter a number from 2 to 10');
        var frames = [], leak = [], ok = [], lh = 20, oh = 20;
        frames.push({ narr: 'Baseline heap snapshot: 20 MB. Now we repeat "open page → close page" and force GC each time (the trash-can icon in DevTools).', parts: [{ type: 'bars', label: 'Heap after GC (MB)', values: [20, 20], idxLabels: ['leaky', 'clean'] }] });
        for (var i = 1; i <= n; i++) {
          lh += 3; leak.push(lh); ok.push(oh + (i % 2));
          frames.push({ narr: 'Round ' + i + ': the leaky version keeps a <b>window listener + subscription</b> whose closure holds the old component, its signals and its detached DOM. +3 MB that GC cannot free. The clean version returns to baseline (small noise is normal).',
            parts: [{ type: 'bars', label: 'Leaky: heap after GC per round (MB)', values: leak.slice(), hl: { [i - 1]: 'bad' } },
              { type: 'bars', label: 'Clean: heap after GC per round (MB)', values: ok.slice(), hl: { [i - 1]: 'ok' } }] });
        }
        frames.push({ narr: 'Diagnosis: take snapshot A after round 1 and B after round ' + n + ', open <b>Comparison</b>. Sort by "# Delta": you will see ~' + (n - 1) + ' extra instances of the component class and "Detached HTMLDivElement" nodes. The <b>Retainers</b> pane shows the chain, e.g. <code>Window → listeners → closure → TickerComponent</code>.',
          parts: [{ type: 'table', label: 'Comparison view (simplified)', columns: ['Constructor', '# New', '# Deleted', '# Delta'], rows: [['TickerComponent', String(n), '1', String(n - 1)], ['Detached HTMLDivElement', String(n * 4), '4', String((n - 1) * 4)], ['Array (10000)', String(n), '1', String(n - 1)]], hl: { 0: 'bad' } }] });
        return pad4(frames);
      }
    },
    examples: [
      { title: 'Profiler shows 40 change detection cycles per keystroke', html: `<p>Recording a search box in Angular DevTools shows dozens of cycles per key. The source column reveals "setTimeout" and "requestAnimationFrame" from a tooltip library polling its position inside the Angular zone. Fix: create the library in <code>runOutsideAngular</code> (or go zoneless). Cycles drop to one per key.</p>` },
      { title: 'A 300 ms INP from a table', html: `<p>Chrome Performance panel shows a 300 ms task after clicking "sort". Bottom-Up view: most time in a <code>formatCurrency</code> function called from the template for 2,000 rows × 3 columns on every check, plus re-creating rows because <code>track $index</code> was used on a sorted list. Fixes: a <code>computed()</code> that formats once per data change, <code>track row.id</code>, and CDK virtual scroll. Result: 25 ms.</p>` },
      { title: 'Quick timing from the console', html: `<p>In a dev build, enable debug tools in <code>main.ts</code> (<code>enableDebugTools(appRef.components[0])</code> from <code>@angular/platform-browser</code>), then run <code>ng.profiler.timeChangeDetection({ record: true })</code> in the console. It runs CD repeatedly and prints the average ms per check — a cheap before/after metric for OnPush refactors.</p>` }
    ],
    deepDive: `<p>🟣 <b>Reading the flame graph.</b> In Angular DevTools each bar is a component; width is time spent in its template + hooks during that cycle; children stack below. Colour intensity shows cost. "Change detection triggered by" tells you the source (event listener, timer, XHR). With signals and OnPush you should see narrow, shallow flames.</p>
      <p>🟣 <b>Chrome Performance tips.</b> Use 4×–6× CPU throttling; enable "Screenshots"; open the Interactions track to see INP breakdown (input delay, processing, presentation delay). Long "presentation delay" means rendering (style/layout/paint) after your handler; long "processing" means your JS (including Angular CD). Angular 20 can emit framework-specific entries (component rendering, CD phases) into a custom track when you call <code>enableProfiling()</code>.</p>
      <p>🟣 <b>Heap snapshot discipline.</b> Use the three-snapshot technique: warm-up, snapshot 1, repeat action, snapshot 2, repeat again, snapshot 3; objects allocated between 1 and 2 still alive in 3 are your leak. The allocation timeline (blue bars that stay blue) shows allocations that survive. Ignore one-off caches that stop growing.</p>
      <p>🟣 <b>Framework helpers that prevent leaks.</b> <code>DestroyRef</code> exists for components, directives, pipes, services in route/environment injectors; <code>takeUntilDestroyed</code> needs an injection context or an explicit <code>DestroyRef</code> argument when called later (e.g. in <code>ngOnInit</code>). <code>effect</code>, <code>toSignal</code>, <code>outputToObservable</code> and template listeners clean up automatically. Route-level providers are destroyed when the route's injector is destroyed (with lazy routes, that depends on router reuse).</p>
      <p>🟣 <b>Real-user monitoring.</b> Lab profiling finds causes; field data (web-vitals library, CrUX) tells you if users are affected. Track INP and LCP per route, and alert on regressions alongside your bundle budgets.</p>`,
    aiEra: `<p>🤖 AI is excellent at the boring half of leak hunting: give it a component and ask "list every resource this allocates and whether it is released" — it reliably flags missing <code>removeEventListener</code>, <code>disconnect</code> and unbounded subscriptions. Some DevTools now include AI assistance to explain performance traces; use it as a second opinion, then confirm in the trace yourself. What AI cannot do is reproduce the user journey that leaks, take the snapshots and read retainer chains in <i>your</i> app; that hands-on skill, plus knowing that production builds must be profiled, is what interviewers probe with "tell me about a performance problem you fixed".</p>`,
    problems: [{
      title: 'Find Leaked Resources from an Allocation Log',
      level: 'Easy', tags: ['memory', 'leaks', 'hashmap'], companies: ['Atlassian', 'Microsoft'],
      statement: `<p>You get a log of events <code>['add:resize#1', 'remove:resize#1', 'add:sub#2', ...]</code> from instrumentation during one mount/unmount of a component. Return the ids that were added but never removed, in order of first add.</p>`,
      constraints: `Up to 10<sup>5</sup> events. Ids are unique per add.`,
      example: `<p><code>['add:a','add:b','remove:a']</code> → ${H.c('r', "['b']")}.</p>`,
      brute: { why: `<p>For every add, scan the whole log for its remove: O(n²).</p>`,
        code: { lang: 'js', run: true, code: `function leaksBrute(log) {
  return log.filter(e => e.startsWith('add:')).map(e => e.slice(4)).filter(id => !log.includes('remove:' + id));
}
console.log(leaksBrute(['add:a', 'add:b', 'remove:a']));` } },
      mcq: { q: 'Which resource does NOT need manual cleanup in a component?', options: ['A (click) listener bound in the template', 'window.addEventListener in the constructor', 'setInterval in ngOnInit'], answer: 0, explain: 'Template listeners are registered in the view\'s cleanup list and removed when the view is destroyed.' },
      hints: [
        `<p>Hint 1: a Map/Set remembers live resources.</p>`,
        `<p>Hint 2: add on "add:", delete on "remove:".</p>`,
        `<p>Hint 3: a JS Set keeps insertion order, so the remaining entries are already in first-add order.</p>`
      ],
      solution: {
        approach: `<p>One pass with an insertion-ordered Set: add, delete, and whatever remains leaked.</p>`,
        code: { lang: 'js', run: true, code: `function leaks(log) {
  const live = new Set();
  for (const e of log) {
    const [op, id] = e.split(':');
    if (op === 'add') live.add(id);
    else if (op === 'remove') live.delete(id);
  }
  return [...live];
}
console.log(leaks(['add:a', 'add:b', 'remove:a']));
console.log(leaks(['add:resize#1', 'add:sub#2', 'remove:sub#2', 'remove:resize#1']));
console.log(leaks([]));` },
        dry: { head: ['Event', 'live'], rows: [['add:a', '{a}'], ['add:b', '{a,b}'], ['remove:a', '{b}']] },
        complexity: `<p>O(n) time and space.</p>`
      }
    }]
  });

  /* =====================================================================
     PRACTICE ARENA
     ===================================================================== */
  practice.push({
    title: 'Budget Verdict: ok, warning or error',
    level: 'Easy', tags: ['budgets', 'build'], companies: ['TCS', 'Infosys', 'Accenture'],
    statement: `<p>Write <code>verdict(bytes, budget)</code> where <code>budget</code> is <code>{ maximumWarning?, maximumError? }</code> with sizes like <code>'500kB'</code>, <code>'1MB'</code>, <code>'300b'</code> (Angular uses 1 kB = 1000 bytes). Return <code>'error'</code> if bytes exceed the error limit, else <code>'warning'</code> if they exceed the warning limit, else <code>'ok'</code>.</p>`,
    constraints: `Units b, kB, MB (case-insensitive), optional decimals. Missing limits are ignored.`,
    example: `<p><code>verdict(520000, { maximumWarning: '500kB', maximumError: '1MB' })</code> → ${H.c('y', "'warning'")}: above 500,000 but not above 1,000,000.</p>`,
    brute: { why: `<p>Using <code>parseInt('500kB')</code> gives 500 and silently compares bytes against 500, so everything errors. Units must be parsed.</p>`,
      code: { lang: 'js', run: true, code: `const naive = (bytes, b) => bytes > parseInt(b.maximumError) ? 'error' : 'ok';
console.log(naive(520000, { maximumError: '1MB' })); // 'error' - wrong` } },
    mcq: { q: 'What does an <code>initial</code> budget measure?', options: ['Total size of the files needed to bootstrap the app', 'Size of the largest lazy chunk', 'Size of node_modules'], answer: 0, explain: 'Initial = all files loaded before the app starts (main, polyfills, styles, initial shared chunks).' },
    hints: [
      `<p>Hint 1: write a parseSize helper with a regex for number + unit.</p>`,
      `<p>Hint 2: check the error limit first, then the warning limit.</p>`,
      `<p>Hint 3: treat a missing limit as Infinity.</p>`
    ],
    solution: {
      approach: `<p>Parse both limits into bytes (missing → Infinity), then compare from strictest outcome down.</p>`,
      code: { lang: 'js', run: true, code: `function parseSize(s) {
  if (s === undefined) return Infinity;
  const m = /^(\\d+(?:\\.\\d+)?)\\s*(b|kb|mb)$/i.exec(String(s).trim());
  if (!m) throw new Error('bad size: ' + s);
  return Number(m[1]) * { b: 1, kb: 1e3, mb: 1e6 }[m[2].toLowerCase()];
}
function verdict(bytes, budget) {
  if (bytes > parseSize(budget.maximumError)) return 'error';
  if (bytes > parseSize(budget.maximumWarning)) return 'warning';
  return 'ok';
}
console.log(verdict(520000, { maximumWarning: '500kB', maximumError: '1MB' }));
console.log(verdict(1500000, { maximumWarning: '500kB', maximumError: '1MB' }));
console.log(verdict(100, { maximumError: '0.5kB' }));` },
      complexity: `<p>O(1): two regex parses and two comparisons.</p>`
    }
  });

  practice.push({
    title: 'How Often Does an OnPush Child Refresh?',
    level: 'Easy', tags: ['onpush', 'inputs', 'references'], companies: ['Wipro', 'Cognizant'],
    statement: `<p>A parent passes an input to an OnPush child on every check. Given the sequence of values bound on consecutive checks (objects/arrays or primitives), return how many checks <b>refresh</b> the child: the first one always does, then only when the value is not <code>Object.is</code>-equal to the previous one (no events inside the child).</p>`,
    constraints: `Up to 10<sup>5</sup> checks.`,
    example: `<p><code>const a = [1]; [a, a, (a.push(2), a), [1, 2]]</code> → ${H.c('g', '2')}: the push mutates the same array, so only the first check and the new array refresh.</p>`,
    brute: { why: `<p>Comparing with <code>JSON.stringify</code> (deep equality) counts mutation as a change, which is <b>not</b> what Angular does, so the model would hide the classic bug.</p>`,
      code: { lang: 'js', run: true, code: `const a = [1];
const seq = [a, a, (a.push(2), a), [1, 2]];
let n = 0, prev;
for (const v of seq) { const s = JSON.stringify(v); if (s !== prev) n++; prev = s; }
console.log(n); // 1 -- stringify sees the final state everywhere, also wrong` } },
    mcq: { q: 'The parent does <code>this.items.push(x)</code>. Does the OnPush child update?', options: ['No, the reference is unchanged', 'Yes, Angular deep-compares arrays', 'Only in production'], answer: 0, explain: 'Inputs are compared by identity.' },
    hints: [
      `<p>Hint 1: keep the previous value you saw on the last check.</p>`,
      `<p>Hint 2: count when i === 0 or !Object.is(prev, v).</p>`,
      `<p>Hint 3: Object.is treats NaN as equal to NaN, unlike ===.</p>`
    ],
    solution: {
      approach: `<p>Linear scan with identity comparison, the same rule Angular uses for input bindings.</p>`,
      code: { lang: 'js', run: true, code: `function refreshes(values) {
  let n = 0;
  for (let i = 0; i < values.length; i++) if (i === 0 || !Object.is(values[i - 1], values[i])) n++;
  return n;
}
const a = [1];
console.log(refreshes([a, a, (a.push(2), a), [1, 2]]));
console.log(refreshes([NaN, NaN, 1]));
console.log(refreshes([]));` },
      complexity: `<p>O(n) time, single pass over the input.</p>`
    }
  });

  practice.push({
    title: 'Template Function Calls vs computed()',
    level: 'Easy', tags: ['templates', 'memoization', 'signals'], companies: ['Paytm', 'Flipkart'],
    statement: `<p>A template binds <code>{{ total() }}</code> where <code>total</code> sums a list. Given the list contents at each of <code>k</code> change-detection checks (an array of arrays), return <code>[plainCalls, memoCalls]</code>: how many times the sum runs if <code>total</code> is a plain method (every check) vs a memoised computed that re-runs only when the list <b>reference</b> changes.</p>`,
    constraints: `k ≤ 10<sup>4</sup>.`,
    example: `<p><code>L = [1,2]</code>; checks <code>[L, L, L, [1,2,3]]</code> → ${H.c('g', '[4, 2]')}.</p>`,
    brute: { why: `<p>The plain method is the brute force here: it recomputes even when nothing changed. Fine for a cheap sum, terrible for formatting 2,000 rows.</p>`,
      code: { lang: 'js', run: true, code: `let calls = 0;
const total = list => { calls++; return list.reduce((a, b) => a + b, 0); };
const L = [1, 2];
[L, L, L, [1, 2, 3]].forEach(l => total(l));
console.log(calls); // 4` } },
    mcq: { q: 'Why is <code>{{ count() }}</code> with a signal cheap even though it looks like a call?', options: ['It returns a cached value; it does not recompute', 'Angular skips it in production', 'Templates never call functions'], answer: 0, explain: 'Signals and computeds return stored values; computeds recompute only when dependencies change.' },
    hints: [
      `<p>Hint 1: plain method calls equal the number of checks run.</p>`,
      `<p>Hint 2: memo: remember the last input reference and result.</p>`,
      `<p>Hint 3: recompute when there is no previous reference or it differs.</p>`
    ],
    solution: {
      approach: `<p>Simulate a one-entry cache keyed by reference, like a pure pipe or a computed with one dependency.</p>`,
      code: { lang: 'js', run: true, code: `function countCalls(checks) {
  let memo = 0, last = undefined, has = false;
  for (const list of checks) {
    if (!has || !Object.is(list, last)) { memo++; last = list; has = true; }
  }
  return [checks.length, memo];
}
const L = [1, 2];
console.log(countCalls([L, L, L, [1, 2, 3]]));
console.log(countCalls([]));
console.log(countCalls([L, [1, 2], L]));` },
      complexity: `<p>O(k) time with a one-entry cache.</p>`
    }
  });

  practice.push({
    title: 'Lifecycle Hook Order for a Parent with Children',
    level: 'Medium', tags: ['lifecycle', 'change-detection'], companies: ['Google', 'SAP'],
    statement: `<p>Simulate the <b>first</b> change detection of a component tree (each node <code>{ name, children }</code>; children are in the view, not projected). Return the hook log in Angular's order: for each view, as its template processes children: child <code>ngOnChanges</code> (assume every child has inputs), <code>ngOnInit</code>, <code>ngDoCheck</code>; then the children's <code>ngAfterContentInit</code>; then recurse into each child view; then the children's <code>ngAfterViewInit</code>. The root only logs its own after-view hook at the end (as <code>root:AfterViewInit</code>).</p>`,
    constraints: `Up to 100 nodes.`,
    example: `<p>App → [A → [C], B] gives ${H.c('g', 'A:OnChanges, A:OnInit, A:DoCheck, B:OnChanges, B:OnInit, B:DoCheck, A:AfterContentInit, B:AfterContentInit, C:OnChanges, C:OnInit, C:DoCheck, C:AfterContentInit, C:AfterViewInit, A:AfterViewInit, B:AfterViewInit, root:AfterViewInit')}.</p>`,
    brute: { why: `<p>A simple pre-order "all hooks of a node, then its children" log is what many people expect, but Angular runs <b>init</b> hooks of siblings while processing the parent template, and <b>after-view</b> hooks bottom-up after children views.</p>`,
      code: { lang: 'js', run: true, code: `function naive(n, out = []) {
  out.push(n.name + ':OnInit', n.name + ':AfterViewInit');
  n.children.forEach(c => naive(c, out));
  return out;
}
console.log(naive({ name: 'A', children: [{ name: 'C', children: [] }] }).join(', '));` } },
    mcq: { q: 'Which runs first?', options: ['Child ngOnInit', 'Parent ngAfterViewInit', 'They run at the same time'], answer: 0, explain: 'The parent\'s view is only "initialised" after all child views were checked.' },
    hints: [
      `<p>Hint 1: model one function processView(node) that handles its children's hooks.</p>`,
      `<p>Hint 2: inside it, three loops over children: pre-order hooks + content hook, recurse, view hook.</p>`,
      `<p>Hint 3: call processView(root) then push root:AfterViewInit.</p>`
    ],
    solution: {
      approach: `<p>The order follows refreshView: template update (children's OnChanges/OnInit/DoCheck in order), content hooks, child views (recursion), view hooks.</p>`,
      code: { lang: 'js', run: true, code: `function hookOrder(root) {
  const log = [];
  function processView(node) {
    for (const c of node.children) log.push(c.name + ':OnChanges', c.name + ':OnInit', c.name + ':DoCheck');
    for (const c of node.children) log.push(c.name + ':AfterContentInit');
    for (const c of node.children) processView(c);
    for (const c of node.children) log.push(c.name + ':AfterViewInit');
  }
  processView(root);
  log.push('root:AfterViewInit');
  return log;
}
const tree = { name: 'App', children: [{ name: 'A', children: [{ name: 'C', children: [] }] }, { name: 'B', children: [] }] };
console.log(hookOrder(tree).join(', '));
console.log(hookOrder({ name: 'App', children: [] }).join(', '));` },
      complexity: `<p>O(n) time, single pass over the input.</p>`
    }
  });

  practice.push({
    title: '@for track Reconciliation: Created, Destroyed, Moved',
    level: 'Medium', tags: ['control-flow', 'track', 'diffing'], companies: ['Microsoft', 'Zoho'],
    statement: `<p>Given old and new lists of <code>track</code> keys, return <code>{ created, destroyed, kept, moved }</code>: keys only in new (new embedded views), only in old (views destroyed), in both (views reused), and of the kept ones how many are <b>not</b> part of a longest increasing subsequence of old positions (the minimal number of view moves).</p>`,
    constraints: `Keys unique within each list; up to 10<sup>5</sup>.`,
    example: `<p>old <code>[a,b,c,d]</code>, new <code>[d,a,b,e]</code> → ${H.c('g', '{ created:1, destroyed:1, kept:3, moved:1 }')}: e new, c gone, only d needs to move.</p>`,
    brute: { why: `<p>Using <code>track $index</code> treats position as identity: every row whose content changed is rebound, and per-row DOM state stays at the old position. Counting "moved" as "every kept key whose index changed" (3 here) also overestimates DOM moves.</p>`,
      code: { lang: 'js', run: true, code: `const oldL = ['a', 'b', 'c', 'd'], newL = ['d', 'a', 'b', 'e'];
console.log(newL.filter((k, i) => oldL.indexOf(k) !== -1 && oldL.indexOf(k) !== i).length); // 3 "moves"` } },
    mcq: { q: 'Why must <code>track</code> be a stable id for lists that reorder?', options: ['So views and DOM are moved instead of rebound or recreated', 'It is only for sorting', 'It makes the list immutable'], answer: 0, explain: 'The key is the identity of the embedded view.' },
    hints: [
      `<p>Hint 1: a Map from old key to old index.</p>`,
      `<p>Hint 2: walk new list; collect old indices of kept keys in new order.</p>`,
      `<p>Hint 3: moved = kept − LIS length of that index sequence (patience sorting, O(n log n)).</p>`
    ],
    solution: {
      approach: `<p>Set differences give created/destroyed. Kept views in increasing old order can stay put; the rest move. The minimum moves equal kept minus the LIS of old indices.</p>`,
      code: { lang: 'js', run: true, code: `function reconcile(oldKeys, newKeys) {
  const oldIdx = new Map(oldKeys.map((k, i) => [k, i]));
  const newSet = new Set(newKeys);
  const seq = [];
  let created = 0;
  for (const k of newKeys) { if (oldIdx.has(k)) seq.push(oldIdx.get(k)); else created++; }
  const destroyed = oldKeys.filter(k => !newSet.has(k)).length;
  const tails = [];
  for (const x of seq) {
    let lo = 0, hi = tails.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (tails[m] < x) lo = m + 1; else hi = m; }
    tails[lo] = x;
  }
  return { created, destroyed, kept: seq.length, moved: seq.length - tails.length };
}
console.log(reconcile(['a', 'b', 'c', 'd'], ['d', 'a', 'b', 'e']));
console.log(reconcile([], ['x']));
console.log(reconcile(['a', 'b', 'c'], ['c', 'b', 'a']));` },
      complexity: `<p>O(n log n) because of the LIS binary search.</p>`
    }
  });

  practice.push({
    title: 'Initial Bundle Size from the Import Graph',
    level: 'Medium', tags: ['bundling', 'graph', 'lazy-loading'], companies: ['Amazon', 'Swiggy'],
    statement: `<p>Given module sizes and import edges <code>{ from, to, dynamic }</code>, return the size of the initial bundle: the sum of sizes of all modules reachable from <code>'main'</code> through <b>static</b> imports only (each module counted once).</p>`,
    constraints: `Up to 10<sup>4</sup> modules; cycles possible.`,
    example: `<p>main(50) → app(30) static, app → admin(200) dynamic, app → util(10) static, admin → util → ${H.c('g', '90')}.</p>`,
    brute: { why: `<p>Summing every module ignores lazy boundaries (290 here); summing along paths double-counts shared modules.</p>`,
      code: { lang: 'js', run: true, code: `const sizes = { main: 50, app: 30, admin: 200, util: 10 };
console.log(Object.values(sizes).reduce((a, b) => a + b)); // 290` } },
    mcq: { q: 'A module is imported statically by both main and a lazy route. Where does it end up?', options: ['In the initial load (possibly a shared chunk)', 'Only in the lazy chunk', 'Duplicated in both'], answer: 0, explain: 'If the eager graph needs it, it must be loaded upfront; bundlers do not duplicate it.' },
    hints: [
      `<p>Hint 1: build an adjacency list of static edges.</p>`,
      `<p>Hint 2: BFS/DFS from main with a visited set.</p>`,
      `<p>Hint 3: sum the sizes of every visited module exactly once.</p>`
    ],
    solution: {
      approach: `<p>Graph reachability over static edges, summing each reached module once.</p>`,
      code: { lang: 'js', run: true, code: `function initialSize(sizes, edges) {
  const adj = {};
  for (const e of edges) if (!e.dynamic) (adj[e.from] = adj[e.from] || []).push(e.to);
  const seen = new Set(['main']), stack = ['main'];
  let total = 0;
  while (stack.length) {
    const m = stack.pop();
    total += sizes[m] || 0;
    for (const n of adj[m] || []) if (!seen.has(n)) { seen.add(n); stack.push(n); }
  }
  return total;
}
const sizes = { main: 50, app: 30, admin: 200, util: 10 };
const edges = [{ from: 'main', to: 'app' }, { from: 'app', to: 'admin', dynamic: true }, { from: 'app', to: 'util' }, { from: 'admin', to: 'util' }, { from: 'util', to: 'main' }];
console.log(initialSize(sizes, edges));
console.log(initialSize({ main: 5 }, []));` },
      complexity: `<p>O(V + E) for one graph traversal.</p>`
    }
  });

  practice.push({
    title: 'Throttle detectChanges to Animation Frames',
    level: 'Medium', tags: ['performance', 'raf', 'change-detection'], companies: ['Bloomberg', 'Morgan Stanley'],
    statement: `<p>A detached live widget receives updates at timestamps (ms, sorted). It calls <code>detectChanges()</code> at most once per animation frame; frames are at multiples of <code>frame</code> (16 ms). An update at time t is rendered at the first frame boundary <b>strictly after</b> t. Return how many renders happen.</p>`,
    constraints: `Up to 10<sup>6</sup> updates.`,
    example: `<p>updates <code>[1, 5, 15, 17, 40]</code>, frame 16 → frames 16, 32, 48 → ${H.c('g', '3')}.</p>`,
    brute: { why: `<p>Calling <code>detectChanges()</code> per update renders 5 times, 2 of them wasted within the same frame the user will never see.</p>`,
      code: { lang: 'js', run: true, code: `console.log([1, 5, 15, 17, 40].length); // 5 renders` } },
    mcq: { q: 'Why run such a loop inside <code>runOutsideAngular</code> in a zone app?', options: ['So each rAF does not trigger an app-wide tick', 'Because rAF does not work inside the zone', 'To make it synchronous'], answer: 0, explain: 'zone.js patches rAF; every callback in the Angular zone would tick the whole app.' },
    hints: [
      `<p>Hint 1: frame index = floor(t / frame) + 1.</p>`,
      `<p>Hint 2: count the distinct frame indices that receive updates.</p>`,
      `<p>Hint 3: input is sorted, so compare with the previous index only.</p>`
    ],
    solution: {
      approach: `<p>Map each update to its render frame and count distinct frames in one pass.</p>`,
      code: { lang: 'js', run: true, code: `function renders(updates, frame = 16) {
  let count = 0, last = -1;
  for (const t of updates) {
    const f = Math.floor(t / frame) + 1;
    if (f !== last) { count++; last = f; }
  }
  return count;
}
console.log(renders([1, 5, 15, 17, 40]));
console.log(renders([0, 16, 32]));
console.log(renders([]));` },
      complexity: `<p>O(n) time and O(1) extra space.</p>`
    }
  });

  practice.push({
    title: 'Equality Cut-off: Count Notifications for Object Signals',
    level: 'Medium', tags: ['signals', 'equality'], companies: ['Google', 'Adobe'],
    statement: `<p>A signal holds an object <code>{ id, name }</code>. Given a list of values passed to <code>set</code>, return <code>[defaultCount, customCount]</code>: how many sets notify consumers with the default <code>Object.is</code> equality vs a custom <code>equal: (a, b) =&gt; a.id === b.id &amp;&amp; a.name === b.name</code>. The initial value is the first element (not a set).</p>`,
    constraints: `Up to 10<sup>5</sup> sets.`,
    example: `<p>Initial <code>{1,'a'}</code>, sets: new <code>{1,'a'}</code>, new <code>{1,'b'}</code>, same object again → ${H.c('g', '[2, 1]')}.</p>`,
    brute: { why: `<p>Notifying on every set (3) makes polling APIs that return fresh but identical objects re-render constantly.</p>`,
      code: { lang: 'js', run: true, code: `const sets = [{}, {}, {}];
console.log(sets.length); // 3 notifications regardless of content` } },
    mcq: { q: 'You mutate the object inside <code>update</code> and return it. What happens with default equality?', options: ['No notification; the reference is equal', 'Notification every time', 'An error is thrown'], answer: 0, explain: 'Same reference → Object.is true → consumers are not notified.' },
    hints: [
      `<p>Hint 1: keep the current value for each strategy separately.</p>`,
      `<p>Hint 2: when equal, the value stays the same (Angular keeps the old one).</p>`,
      `<p>Hint 3: count when not equal and update the current value.</p>`
    ],
    solution: {
      approach: `<p>Simulate two signals with different equality functions; a set only notifies (and replaces the value) when not equal.</p>`,
      code: { lang: 'js', run: true, code: `function notifications(initial, sets) {
  const custom = (a, b) => a.id === b.id && a.name === b.name;
  let curD = initial, curC = initial, d = 0, c = 0;
  for (const v of sets) {
    if (!Object.is(curD, v)) { d++; curD = v; }
    if (!custom(curC, v)) { c++; curC = v; }
  }
  return [d, c];
}
const init = { id: 1, name: 'a' };
const b = { id: 1, name: 'b' };
console.log(notifications(init, [{ id: 1, name: 'a' }, b, b]));
console.log(notifications(init, []));` },
      complexity: `<p>O(n) time, single pass over the input.</p>`
    }
  });

  practice.push({
    title: 'Targeted Change Detection with Signals (two traversal modes)',
    level: 'Hard', tags: ['change-detection', 'signals', 'tree'], companies: ['Google', 'Meta'],
    statement: `<p>Simplified model of Angular 17+ traversal. Views have <code>parent</code> (−1 for root) and <code>onPush</code>. Events at <code>eventViews</code> mark the view and ancestors <b>Dirty</b>. Signal changes at <code>signalViews</code> mark the view <b>RefreshView</b> and ancestors <b>HasChild</b> (not dirty). Traverse from root in <i>global</i> mode:</p>
      <ul><li><b>Global</b>: refresh a view if it is not OnPush, or Dirty, or RefreshView; children of a refreshed view are visited in global mode. If not refreshed but HasChild, visit its children in <i>targeted</i> mode.</li>
      <li><b>Targeted</b>: refresh only if RefreshView (then its children go in global mode); else if HasChild, visit children in targeted mode; otherwise skip.</li></ul>
      <p>Return refreshed view indices in DFS order (children in index order).</p>`,
    constraints: `Up to 10<sup>5</sup> views; parent[i] &lt; i.`,
    example: `<p>parent <code>[-1,0,1,1,3]</code>, onPush <code>[F,T,F,T,T]</code>, signal at 4 → ${H.c('g', '[0,4]')}: 1 is clean OnPush with a flagged child, so we go targeted through 1 and 3 and refresh only 4. Note view 2 (Default) is <b>not</b> refreshed in targeted mode.</p>`,
    brute: { why: `<p>Treating a signal change like an event (mark ancestors dirty) refreshes 0, 1, 2, 3, 4: the old markForCheck behaviour, re-running templates that did not change.</p>`,
      code: { lang: 'js', run: true, code: `// brute: signal = markForCheck -> ancestors dirty -> Default view 2 also refreshes
console.log([0, 1, 2, 3, 4]);` } },
    mcq: { q: 'Why can targeted mode skip a Default-strategy sibling?', options: ['Nothing it reads changed, and the trigger was a signal, not a global event', 'Default components are always skipped', 'Because it is OnPush'], answer: 0, explain: 'Targeted traversal only refreshes views whose signals changed; it passes through ancestors.' },
    hints: [
      `<p>Hint 1: compute flags first: dirty via events, refresh + hasChild via signals.</p>`,
      `<p>Hint 2: recursive (or stack-based) visit(v, mode).</p>`,
      `<p>Hint 3: in global mode the refresh condition is !onPush || dirty || refresh; in targeted mode only refresh. Children of a refreshed view are global.</p>`
    ],
    solution: {
      approach: `<p>Mark flags, then DFS carrying the mode. This shows why signals + OnPush make updates proportional to what changed rather than to the tree depth.</p>`,
      code: { lang: 'js', run: true, code: `function targetedCD(parent, onPush, eventViews, signalViews) {
  const n = parent.length, kids = Array.from({ length: n }, () => []);
  for (let i = 1; i < n; i++) kids[parent[i]].push(i);
  const dirty = new Array(n).fill(false), refresh = new Array(n).fill(false), hasChild = new Array(n).fill(false);
  for (const e of eventViews) for (let v = e; v !== -1; v = parent[v]) dirty[v] = true;
  for (const s of signalViews) { refresh[s] = true; for (let v = parent[s]; v !== -1; v = parent[v]) hasChild[v] = true; }
  const out = [];
  const stack = [[0, 'global']];
  while (stack.length) {
    const [v, mode] = stack.pop();
    const doRefresh = mode === 'global' ? (!onPush[v] || dirty[v] || refresh[v]) : refresh[v];
    let childMode = null;
    if (doRefresh) { out.push(v); childMode = 'global'; }
    else if (hasChild[v]) childMode = 'targeted';
    if (!childMode) continue;
    for (let k = kids[v].length - 1; k >= 0; k--) stack.push([kids[v][k], childMode]);
  }
  return out;
}
const F = false, T = true;
console.log(targetedCD([-1, 0, 1, 1, 3], [F, T, F, T, T], [], [4]));
console.log(targetedCD([-1, 0, 1, 1, 3], [F, T, F, T, T], [4], []));
console.log(targetedCD([-1, 0, 1, 1, 3], [F, T, F, T, T], [], []));` },
      complexity: `<p>O(n + total ancestor-walk length).</p>`,
      followUps: ['What happens if a refreshed view writes a signal read by an ancestor during the same tick?']
    }
  });

  practice.push({
    title: 'Mini Signals with Batched Effects',
    level: 'Hard', tags: ['signals', 'effects', 'scheduling'], companies: ['Google', 'Netflix'],
    statement: `<p>Implement <code>signal(v)</code> (callable getter + <code>set</code>), <code>effect(fn)</code> with automatic dependency tracking, and <code>flush()</code>. Effects run once immediately when created; after that, a <code>set</code> that changes a value only <b>schedules</b> dependent effects; <code>flush()</code> runs each scheduled effect <b>once</b> no matter how many sets happened. Dependencies are re-tracked on every run.</p>`,
    constraints: `Up to 10<sup>4</sup> signals and effects.`,
    example: `<p>An effect logs <code>a() + b()</code>. <code>a.set(1); b.set(2); a.set(3); flush()</code> → the effect runs ${H.c('g', 'once')} after creation and logs 5.</p>`,
    brute: { why: `<p>Running effects synchronously inside <code>set</code> logs three times, with intermediate states (1+0, 1+2, 3+2): wasted work and glitches.</p>`,
      code: { lang: 'js', run: true, code: `let a = 0, b = 0;
const runs = [];
const eff = () => runs.push(a + b);
eff();
a = 1; eff(); b = 2; eff(); a = 3; eff();
console.log(runs); // [0,1,3,5] - three extra runs` } },
    mcq: { q: 'Why re-track dependencies on every run?', options: ['Conditional reads change which signals matter', 'To make effects slower', 'Signals forget their values'], answer: 0, explain: 'If an effect reads b only when a is true, its dependency set changes over time.' },
    hints: [
      `<p>Hint 1: a global activeEffect; the signal getter registers it in the signal's subscriber set.</p>`,
      `<p>Hint 2: set → if changed, add subscribers to a pending Set (dedupes).</p>`,
      `<p>Hint 3: before each effect run, remove it from all old deps; flush copies and clears pending before running.</p>`
    ],
    solution: {
      approach: `<p>Track subscribers per signal and deps per effect. Writes push effects into a Set (dedupe = batching). Flush drains the set; each run clears old deps and re-tracks. This is the essence of Angular's effect scheduling (which flushes during change detection).</p>`,
      code: { lang: 'js', run: true, code: `let active = null;
const pending = new Set();
function signal(value) {
  const subs = new Set();
  const get = () => { if (active) { subs.add(active); active.deps.add(subs); } return value; };
  get.set = v => { if (Object.is(v, value)) return; value = v; subs.forEach(e => pending.add(e)); };
  return get;
}
function effect(fn) {
  const e = { deps: new Set(), run() {
    e.deps.forEach(s => s.delete(e)); e.deps.clear();
    const prev = active; active = e;
    try { fn(); } finally { active = prev; }
  } };
  e.run();
  return e;
}
function flush() { const list = [...pending]; pending.clear(); list.forEach(e => e.run()); return list.length; }

const a = signal(0), b = signal(0), show = signal(true);
const logs = [];
effect(() => logs.push(show() ? a() + b() : 'hidden'));
a.set(1); b.set(2); a.set(3);
console.log('effects run in flush:', flush(), logs);
show.set(false); flush();
b.set(100);                                  // b no longer a dependency
console.log('after hiding, flush runs:', flush(), logs);` },
      complexity: `<p>set: O(subscribers); flush: O(effects run × deps).</p>`
    }
  });

  practice.push({
    title: 'Three-Snapshot Leak Detector',
    level: 'Hard', tags: ['memory', 'heap', 'analysis'], companies: ['Microsoft', 'Atlassian'],
    statement: `<p>You have three heap snapshots as maps <code>constructorName → count</code>, taken after warm-up, after N repetitions of an action, and after 2N repetitions. Report constructors that grew in <b>both</b> intervals by roughly the same amount (each growth ≥ <code>minGrowth</code>, and the two growths differ by at most 25%), sorted by total growth descending. These are likely per-action leaks; one-time caches grow only once.</p>`,
    constraints: `Up to 10<sup>5</sup> constructor names.`,
    example: `<p>s1 {A:10, Cache:5}, s2 {A:20, Cache:50}, s3 {A:30, Cache:50}, minGrowth 5 → ${H.c('r', "['A']")}: Cache grew once (warm cache), A grows every round.</p>`,
    brute: { why: `<p>Comparing only two snapshots flags Cache too, sending you after a harmless lazily-filled cache.</p>`,
      code: { lang: 'js', run: true, code: `const s1 = { A: 10, Cache: 5 }, s2 = { A: 20, Cache: 50 };
console.log(Object.keys(s2).filter(k => s2[k] > (s1[k] || 0))); // ['A','Cache']` } },
    mcq: { q: 'Why force garbage collection before each snapshot?', options: ['So only reachable (retained) objects are counted', 'To make snapshots smaller to download', 'GC creates the leak'], answer: 0, explain: 'Taking a heap snapshot in Chrome runs GC first; unreachable garbage would otherwise look like growth.' },
    hints: [
      `<p>Hint 1: g1 = s2 − s1 and g2 = s3 − s2 for each name (missing = 0).</p>`,
      `<p>Hint 2: keep names where both ≥ minGrowth and |g1 − g2| ≤ 0.25 × max(g1, g2).</p>`,
      `<p>Hint 3: sort by g1 + g2 descending; consider names that appear in any snapshot.</p>`
    ],
    solution: {
      approach: `<p>Compute two growth deltas per constructor and keep consistent, repeated growth. That separates linear leaks from warm-up allocations.</p>`,
      code: { lang: 'js', run: true, code: `function leakSuspects(s1, s2, s3, minGrowth) {
  const names = new Set([...Object.keys(s1), ...Object.keys(s2), ...Object.keys(s3)]);
  const out = [];
  for (const n of names) {
    const a = s1[n] || 0, b = s2[n] || 0, c = s3[n] || 0;
    const g1 = b - a, g2 = c - b;
    if (g1 >= minGrowth && g2 >= minGrowth && Math.abs(g1 - g2) <= 0.25 * Math.max(g1, g2)) out.push([n, g1 + g2]);
  }
  return out.sort((x, y) => y[1] - x[1]).map(x => x[0]);
}
console.log(leakSuspects({ A: 10, Cache: 5 }, { A: 20, Cache: 50 }, { A: 30, Cache: 50 }, 5));
console.log(leakSuspects({ Div: 0, Sub: 1 }, { Div: 40, Sub: 11 }, { Div: 80, Sub: 21 }, 5));
console.log(leakSuspects({}, {}, {}, 1));` },
      complexity: `<p>O(k log k) for k names.</p>`
    }
  });

  practice.push({
    title: 'Assign Modules to Chunks (initial, lazy, shared)',
    level: 'Hard', tags: ['bundling', 'code-splitting', 'graph'], companies: ['Amazon', 'Vercel'],
    statement: `<p>Given static import edges and a list of lazy entry modules (targets of dynamic imports), assign every module to a chunk like a code-splitting bundler: modules reachable statically from <code>'main'</code> go to <code>'initial'</code>. Other modules reachable from exactly one lazy entry go to that entry's chunk; reachable from two or more lazy entries go to <code>'shared'</code>. Return a map module → chunk (unreachable modules omitted).</p>`,
    constraints: `Up to 10<sup>4</sup> modules; static edges only (lazy entries are given separately).`,
    example: `<p>main→core; admin→table, admin→core; reports→table, reports→chart; lazy [admin, reports] → main, core: initial; admin: admin; reports: reports; chart: reports; table: ${H.c('y', 'shared')}.</p>`,
    brute: { why: `<p>Copying each module into every lazy chunk that uses it (no sharing) downloads <code>table</code> twice when users visit both features, and bloats total size.</p>`,
      code: { lang: 'js', run: true, code: `// duplicate everything per lazy entry
const reach = { admin: ['admin', 'table'], reports: ['reports', 'table', 'chart'] };
console.log(Object.values(reach).flat().length, 'module copies (table twice)');` } },
    mcq: { q: 'A module used by main and by a lazy route goes to…', options: ['initial', 'the lazy chunk', 'shared'], answer: 0, explain: 'It is needed at startup anyway, so lazy chunks just reuse it.' },
    hints: [
      `<p>Hint 1: DFS from main to collect the initial set.</p>`,
      `<p>Hint 2: for each lazy entry, DFS (stopping at initial modules) and count which entries reach each module.</p>`,
      `<p>Hint 3: count 1 → that entry; ≥ 2 → shared.</p>`
    ],
    solution: {
      approach: `<p>Reachability per entry, then classification. Real bundlers refine "shared" into one chunk per distinct set of entries, but the idea is the same.</p>`,
      code: { lang: 'js', run: true, code: `function assignChunks(edges, lazyEntries) {
  const adj = {};
  for (const [a, b] of edges) (adj[a] = adj[a] || []).push(b);
  function reach(start, stopSet) {
    const seen = new Set([start]), st = [start];
    while (st.length) for (const n of adj[st.pop()] || []) if (!seen.has(n) && !stopSet.has(n)) { seen.add(n); st.push(n); }
    return seen;
  }
  const initial = reach('main', new Set());
  const owners = new Map();
  for (const e of lazyEntries) for (const m of reach(e, initial)) {
    if (initial.has(m)) continue;
    if (!owners.has(m)) owners.set(m, new Set());
    owners.get(m).add(e);
  }
  const out = {};
  for (const m of initial) out[m] = 'initial';
  for (const [m, set] of owners) out[m] = set.size === 1 ? [...set][0] : 'shared';
  return out;
}
console.log(assignChunks([['main', 'core'], ['admin', 'table'], ['admin', 'core'], ['reports', 'table'], ['reports', 'chart']], ['admin', 'reports']));
console.log(assignChunks([], []));` },
      complexity: `<p>O(L × (V + E)) for L lazy entries.</p>`
    }
  });

  /* =====================================================================
     QUIZ
     ===================================================================== */
  quiz.push({ q: 'In an Ivy template function <code>function T(rf, ctx)</code>, what does the <code>rf &amp; 2</code> block do?', options: ['Updates bindings on each change detection check', 'Creates the DOM nodes the first time', 'Destroys the view', 'Registers event listeners'], answer: 0, explain: 'Bit 1 is creation mode (runs once); bit 2 is update mode, which compares bindings with their previous values.' });
  quiz.push({ q: 'Why does Ivy\'s instruction-based output help bundle size?', options: ['Unused instructions are never imported, so they are tree-shaken', 'It compresses templates with gzip', 'It ships templates as HTML strings', 'It removes the need for JavaScript'], answer: 0, explain: 'Generated code imports only the <code>ɵɵ</code> functions it calls; features you never use disappear from the bundle.' });
  quiz.push({ q: 'What does <code>strictTemplates: true</code> add?', options: ['Type-checking of template expressions, input types and <code>$event</code> via generated type-check code', 'A runtime check of every binding in production', 'Lint rules for HTML formatting', 'Automatic OnPush on every component'], answer: 0, explain: 'The compiler generates type-check blocks for templates and runs TypeScript over them at build time.' });
  quiz.push({ q: 'Ten instances of the same component are on a page. How many TViews and LViews exist for that component\'s template?', options: ['1 TView, 10 LViews', '10 TViews, 10 LViews', '1 TView, 1 LView', '10 TViews, 1 LView'], answer: 0, explain: 'TView is the shared static blueprint; each instance has its own LView array.' });
  quiz.push({ q: 'A click handler fires inside an OnPush component nested under two OnPush ancestors. What does Angular mark dirty?', options: ['The component and every ancestor up to the root', 'Only the component', 'Only the root', 'Nothing; OnPush ignores events'], answer: 0, explain: '<code>markViewDirty</code> walks up so the top-down traversal can reach the clicked view.' });
  quiz.push({ q: 'A signal read only in a deep OnPush child\'s template changes. In Angular 17+, which templates re-execute?', options: ['Only that child\'s template (ancestors are traversed, not refreshed)', 'Every template from root to the child', 'Every template in the app', 'None until markForCheck is called'], answer: 0, explain: 'Signals mark the consumer view for refresh and flag ancestors as having a child to refresh: targeted change detection.' });
  quiz.push({ q: '<code>count.set(5)</code> when <code>count()</code> is already 5. What happens?', options: ['Nothing: the equality check stops it', 'All consumers recompute', 'An error is thrown', 'The version increases but templates skip'], answer: 0, explain: 'Default equality is <code>Object.is</code>; equal values do not bump the version or notify.' });
  quiz.push({ q: 'When does a <code>computed()</code> actually run its function?', options: ['When it is read and a dependency changed since the last run (lazy, memoised)', 'Immediately whenever any dependency changes', 'On every change detection cycle', 'Only once, ever'], answer: 0, explain: 'Push marks it dirty; it recomputes on the next read (pull) only if a dependency version changed.' });
  quiz.push({ q: 'How does zone.js know a <code>setTimeout</code> callback may have changed data?', options: ['It monkey-patches setTimeout and notifies Angular when the task finishes', 'The browser tells Angular directly', 'Angular polls every 16 ms', 'TypeScript inserts calls at compile time'], answer: 0, explain: 'zone.js wraps async APIs; NgZone emits onMicrotaskEmpty and ApplicationRef ticks.' });
  quiz.push({ q: 'After switching to <code>provideZonelessChangeDetection()</code>, a component sets <code>this.data = res</code> inside <code>subscribe</code> and the view does not update. Best fix?', options: ['Store the value in a signal (or use the async pipe)', 'Add zone.js back to polyfills', 'Call setTimeout around the assignment', 'Use ChangeDetectionStrategy.Default'], answer: 0, explain: 'Zoneless relies on notifications: signal sets, markForCheck/AsyncPipe, bound listeners.' });
  quiz.push({ q: 'Which call keeps a high-frequency scroll listener from triggering app-wide change detection in a zone app?', options: ['<code>ngZone.runOutsideAngular()</code>', '<code>ngZone.run()</code>', '<code>cdr.markForCheck()</code>', '<code>ApplicationRef.tick()</code>'], answer: 0, explain: 'Work started outside the Angular zone does not schedule ticks.' });
  quiz.push({ q: 'What does <code>ng build --stats-json</code> give you with the application builder?', options: ['An esbuild metafile you can load into a bundle analyzer', 'A Lighthouse report', 'A list of unused CSS', 'A webpack stats file for webpack-bundle-analyzer only'], answer: 0, explain: 'The esbuild-based builder writes stats.json in esbuild metafile format.' });
  quiz.push({ q: 'Which budget type fails the build when the code needed to start the app gets too large?', options: ['<code>initial</code>', '<code>anyComponentStyle</code>', '<code>lazy</code>', '<code>bundle</code> with name "admin"'], answer: 0, explain: '<code>initial</code> covers all files loaded at bootstrap. (There is no "lazy" budget type.)' });
  quiz.push({ q: 'Heap snapshots after each of 5 open/close cycles show 5 extra <code>ReportComponent</code> instances and detached divs. Most likely cause?', options: ['Something long-lived (window listener, service, subscription) still references each destroyed component', 'The garbage collector is disabled', 'OnPush keeps components alive', 'Signals never release memory'], answer: 0, explain: 'A retained component means a reachable reference; the Retainers pane shows the chain.' });

  /* =====================================================================
     INTERVIEW
     ===================================================================== */
  interview.push({ q: 'Explain what Angular\'s compiler produces for a component and how it updates the DOM without a virtual DOM.', level: 'I',
    a: `<p>AOT compilation turns the decorator + template into static fields on the class: <code>ɵfac</code> (factory with DI) and <code>ɵcmp</code> (definition with selectors, inputs, <code>decls</code>, <code>vars</code> and a <b>template function</b>). The template function has a create block (build DOM into numbered slots, wire listeners) and an update block (for each binding, compare the new value with the previous one stored in the view's array and write to the DOM only if it changed). That is incremental DOM: the "diff" is per binding, not per tree, so memory is proportional to bindings and unused instructions are tree-shaken.</p>`,
    followUps: ['What are decls and vars used for?', 'How do @if and @for compile?', 'Why is JIT avoided in production?'] });
  interview.push({ q: 'What are LView and TView, and why does Angular split them?', level: 'A',
    a: `<p>A TView is the shared, static description of a template: the template function, TNodes (per-node static info such as tag, attributes, matched directives), hook lists, query info and a blueprint. It is created once on the first create pass. An LView is a per-instance array: header (host, flags like Dirty/CheckAlways/Attached, parent, context, injector, cleanup), then DOM nodes and child containers in decl slots, then previous binding values. Splitting means N instances pay only for their own state; static work like directive matching is done once. Embedded views (@if, @for rows) are LViews inside LContainers.</p>`,
    followUps: ['What is an LContainer?', 'How would you inspect the tree in the browser?', 'Why is the first instance slower to create?'] });
  interview.push({ q: 'Walk me through exactly what happens during one change detection cycle.', level: 'A',
    a: `<p>The scheduler (zone.js or zoneless) calls <code>ApplicationRef.tick()</code>. It traverses root views top-down. For each view it decides: refresh if CheckAlways (Default) or Dirty (OnPush marked) or flagged by a signal; pass through if only a descendant is flagged; otherwise skip the subtree. Refreshing runs the template's update block (setting child inputs, which triggers ngOnChanges), pre-order hooks (OnInit/DoCheck), embedded views, content hooks, child component views, then view hooks. Flags are cleared. In dev mode a second checkNoChanges pass throws NG0100 if a binding changed during the cycle. Afterwards render hooks (<code>afterNextRender</code>/<code>afterEveryRender</code>) run.</p>`,
    followUps: ['What marks an OnPush view dirty?', 'What causes NG0100 and how do you fix it properly?', 'detectChanges vs markForCheck?'] });
  interview.push({ q: 'How do signals know which component to update? Describe the reactive graph.', level: 'A',
    a: `<p>Every signal, computed, effect and template is a node. While a consumer runs it is the "active consumer", so each signal read records an edge (and the version it saw). On <code>set</code>, if the value is not equal, the signal bumps its version and pushes "dirty" to its live consumers recursively, without computing. Templates and effects reached get scheduled. When they run, they pull: a dirty computed checks its producers' versions and recomputes only if one changed; if its result is equal to before, its own version stays, so downstream work stops. For templates, the view's consumer node marks that view for refresh, giving targeted change detection.</p>`,
    followUps: ['What is a live consumer and why does it matter for memory?', 'How does the equality function interact with mutation?', 'When would you use untracked()?'] });
  interview.push({ q: 'What problems does zone.js solve and what does it cost? How does zoneless work?', level: 'I',
    a: `<p>zone.js monkey-patches async APIs so Angular learns when any task ends and can tick without the developer telling it. Costs: a polyfill (tens of KB), a full tick after every async task including irrelevant ones (mousemove, third-party timers), noisy stack traces, and native async/await must be downleveled. Zoneless removes zone.js; Angular ticks only on explicit notifications: signals read in templates changing, markForCheck (AsyncPipe), bound listeners, setInput, attaching views. A scheduler coalesces them into one tick using a setTimeout/rAF race. Code must keep state in signals or call markForCheck; provideZonelessChangeDetection is stable from v20.</p>`,
    followUps: ['What breaks when migrating?', 'How does SSR know the app is stable without zones?', 'What is hybrid scheduling?'] });
  interview.push({ q: 'When would you use runOutsideAngular, and what is the zoneless equivalent?', level: 'I',
    a: `<p>In zone apps, for high-frequency or irrelevant async work: scroll/mousemove/resize listeners, animation loops, polling, third-party libraries (maps, charts) that use timers internally. Inside, update only what is needed and re-enter with <code>zone.run</code> or set a signal when visible state changes. In zoneless apps there is nothing to escape: async work never triggers a tick by itself, so you just avoid notifying (do not set signals on every event; throttle). The principle is the same: only tell Angular when rendered state really changed.</p>`,
    followUps: ['How do you verify the fix?', 'What about event coalescing?'] });
  interview.push({ q: 'Our initial bundle is 1.8 MB. How do you investigate and fix it?', level: 'I',
    a: `<p>Measure first: production build output (initial total, lazy chunks), then <code>ng build --stats-json</code> into the esbuild analyzer, or source-map-explorer with source maps, to see which packages and files dominate and the import chain that makes them eager. Typical fixes: lazy routes (<code>loadComponent</code>/<code>loadChildren</code>), <code>@defer</code> for below-the-fold widgets, replacing heavy libs (moment → Intl/date-fns, full lodash → per-function imports), removing JIT/compiler leaks, CommonJS deps, unused polyfills (zone.js if zoneless), and moving shared services that import heavy code behind lazy boundaries. Then lock it with an <code>initial</code> budget with maximumError in CI and preload lazy chunks after first render.</p>`,
    followUps: ['Raw vs compressed size — which matters?', 'How do you stop the regression from coming back?'] });
  interview.push({ q: 'What changed with the application builder (esbuild/Vite) compared with the old webpack builder?', level: 'B',
    a: `<p>Since v17 new projects use the <code>application</code> builder: esbuild bundles and minifies (much faster, written in Go and parallel), Vite serves dev builds, and one builder produces browser, server and prerender outputs. Lazy chunks are emitted as <code>chunk-[hash].js</code>, stats are esbuild metafiles, and custom webpack configs no longer apply (plugins must be replaced by builder options or esbuild-friendly approaches). Migration is automated with <code>ng update @angular/cli --name use-application-builder</code>; the package is <code>@angular/build</code> from v18.</p>`,
    followUps: ['What would block a migration?', 'How do you analyse bundles now?'] });
  interview.push({ q: 'How do you profile a slow interaction in an Angular app?', level: 'I',
    a: `<p>Reproduce on a production build with CPU throttling. In Chrome's Performance panel record the interaction, find the long task and its INP breakdown (input delay, processing, presentation). If processing is Angular's tick/refreshView, open Angular DevTools Profiler to see how many CD cycles ran, what triggered them and which components were expensive in the flame graph. Typical fixes: OnPush + signals, computed/pure pipes instead of template methods, <code>track</code> by id, virtual scroll, moving noisy async work out of the zone. If time is style/layout, fix DOM size or layout thrashing. Re-measure after each change.</p>`,
    followUps: ['Why not profile in dev mode?', 'What does the Angular DevTools flame graph show?', 'How do you track this in the field?'] });
  interview.push({ q: 'Describe how you would find and fix a memory leak in an Angular SPA.', level: 'A',
    a: `<p>Reproduce with a repeated action (open/close a route or dialog). Chrome Memory panel: snapshot after warm-up, repeat N times, snapshot, repeat, snapshot; compare and look for constructors that grow per repetition (your component classes, "Detached" DOM, arrays). Open Retainers to follow the chain to the root: typically a window/document listener, an infinite subscription in a root service, a timer, an observer never disconnected, a singleton cache holding instances, or a dynamic component never destroyed. Fix with template/host listeners, <code>takeUntilDestroyed</code>, <code>toSignal</code>/async pipe, <code>DestroyRef.onDestroy</code> cleanup, bounded caches; verify the counts return to baseline.</p>`,
    followUps: ['Do you need to unsubscribe from HttpClient?', 'What is the three-snapshot technique?'] });
  interview.push({ q: 'What are performance budgets and how do you choose the numbers?', level: 'B',
    a: `<p>Budgets in angular.json make the build warn or fail when outputs exceed limits: <code>initial</code>, <code>bundle</code> by name, <code>anyComponentStyle</code>, <code>allScript</code>, <code>any</code>/<code>anyScript</code>, <code>all</code>. Choose from targets, not current size: e.g. an LCP goal on a mid-range phone over 4G implies a JS budget (often 150–300 kB compressed initial). Set the warning slightly above today's size and the error at the hard limit, run them in CI on every PR, and treat raising a budget as a reviewed decision. Pair with Lighthouse CI or RUM for metrics budgets.</p>`,
    followUps: ['Why also budget component styles?', 'What if a library update blows the budget?'] });
  interview.push({ q: 'Why is ExpressionChangedAfterItHasBeenCheckedError a design smell rather than a bug in Angular?', level: 'I',
    a: `<p>Angular assumes unidirectional flow within a cycle: parents are checked before children, and checking does not change data. NG0100 means a value bound in an already-checked view changed during the same cycle, usually because a child or a lifecycle hook (ngAfterViewInit) wrote parent state, or a getter returns a new value each call. In production the screen would just be stale. Fixes: derive the value earlier or as a computed, move the write to an event/effect, let the child expose a signal the parent reads (signals schedule a follow-up refresh), or restructure ownership. setTimeout hides it at the cost of an extra cycle and flicker.</p>`,
    followUps: ['Why does it only appear in dev mode?', 'How do signals change this?'] });
  interview.push({ q: 'A 5,000-row table re-renders slowly when one cell changes. Walk through your optimization plan, from cheapest to most invasive.', level: 'E',
    a: `<p>1) Measure with DevTools Profiler: is it CD time or DOM work? 2) <code>track row.id</code> in @for so rows are reused, not recreated. 3) Remove template method calls/impure pipes; precompute display values in a computed or pure pipe. 4) OnPush rows with immutable updates, or row data as signals so a cell change refreshes one row view (targeted CD). 5) Reduce view count: CDK virtual scroll or pagination. 6) Go zoneless or move noisy async out of the zone so unrelated events do not tick. 7) For extreme cases, a canvas/grid library or Web Worker for sorting/filtering. Verify INP after each step.</p>`,
    followUps: ['How would signals per row work with a store?', 'What breaks with virtual scroll (find-in-page, a11y)?'] });

  /* spread the correct answers around: rotate the options of each quiz question */
  quiz.forEach(function (q, i) {
    var n = q.options.length, k = i % n;
    if (!k) return;
    q.options = q.options.slice(k).concat(q.options.slice(0, k));
    q.answer = (q.answer - k + n) % n;
  });

  registerModule({
    id: 'fe22',
    title: 'Angular Internals & Performance',
    lang: 'ts',
    intro: `<p>This module opens the hood of Angular. You will see what the <b>compiler</b> really emits (AOT, Ivy template functions with create/update passes, incremental DOM, strict template type-checking), how the runtime stores the <b>component tree</b> as LView/TView arrays, and how <b>change detection</b> actually walks that tree: dirty marking, OnPush, and the targeted refresh that <b>signals</b> enable through their producer/consumer graph. Then we look at <b>who triggers</b> change detection (zone.js patching, NgZone, zoneless scheduling), how the <b>esbuild application builder</b> splits your app into initial and lazy chunks, how to <b>analyse bundles</b> and enforce <b>budgets</b>, and how to <b>profile</b> with Angular DevTools and the Chrome Performance and Memory panels to fix slow interactions and memory leaks.</p>
      <p>Everything targets Angular 17–20 (and notes v21 where it matters). Each topic starts with an everyday analogy, then a visual you can step through, real Angular TypeScript, and small runnable JavaScript models of the mechanism (a template function, a dirty-marking walk, a mini signal graph, a coalescing scheduler, a budget checker, a leak simulator).</p>`,
    goals: [
      'Read Ivy-generated template code and explain create vs update passes, binding slots, incremental DOM and template type-checking',
      'Describe LView, TView, TNode and LContainer and estimate change detection cost as views × bindings',
      'Predict exactly which views refresh after an event, an input change or a signal change, including targeted (signal-driven) traversal',
      'Explain the signals reactive graph: versions, push-dirty/pull-recompute, equality cut-off, live consumers and effect scheduling',
      'Compare zone.js and zoneless scheduling, use NgZone correctly and migrate an app to provideZonelessChangeDetection',
      'Shrink and guard bundles with lazy chunks, @defer, the esbuild analyzer / source-map-explorer and angular.json budgets',
      'Profile with Angular DevTools and Chrome Performance, and find memory leaks with heap snapshot comparison'
    ],
    prereqs: `Required: <b>Angular Routing, Forms &amp; Performance at Scale</b> (fe20) — OnPush, signals basics, zoneless setup, @defer and lazy routes are assumed here and taken deeper — and <b>Rendering Pipeline &amp; Web Performance</b> (fe11) — the browser's style/layout/paint pipeline, Core Web Vitals (LCP, INP) and the Performance panel. Knowing how React's internals work (fe12) is a useful comparison but not required.`,
    hours: 14,
    topics: topics,
    quiz: quiz,
    interview: interview,
    practice: practice
  });
})();
