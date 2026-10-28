(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------------- shared helpers ---------------- */
  // C('List<T>') -> inline code with < > escaped (and "${" made safe); P(`...`) -> escaped code block for prose.
  function C(s) { return '<code>' + H.esc(s).replace(/\$\{/g, '&#36;{') + '</code>'; }
  function P(s) { return '<pre><code>' + H.esc(String(s).replace(/^\n+/, '').replace(/\s+$/, '')).replace(/\$\{/g, '&#36;{') + '</code></pre>'; }
  function note(label, html) { return { type: 'text', label: label, html: html }; }
  function box(id, label, x, y, w) { return { id: id, label: label, x: x, y: y, shape: 'box', w: w || 20 }; }

  /* ======================================================================
     TOPIC 1 — Container bootstrap: BeanDefinitions, refresh(), BFPPs
     ====================================================================== */
  topics.push({
    title: 'Inside refresh(): BeanDefinitions, the BeanFactory & BeanFactoryPostProcessors',
    analogy: `<p>Think of building a housing estate. First the architects draw <b>blueprints</b> for every house (address, materials, which houses share a driveway). Before a single brick is laid, the <b>planning office</b> may edit the blueprints: fill in "<i>paint colour: see client sheet</i>" with the real colour, add a garage, reject a plan. Only then do the <b>builders</b> construct houses, and while each one goes up, <b>inspectors</b> may add an alarm system or swap the front door. Spring works exactly like this: blueprints are <b>BeanDefinitions</b>, the planning office is the <b>BeanFactoryPostProcessor</b> phase, builders are the <b>BeanFactory</b>, and inspectors are <b>BeanPostProcessors</b>.</p>`,
    explain: `<p>The Spring Boot module (be06) showed <i>what</i> IoC gives you. Here we open the box. An ${C('ApplicationContext')} is a <b>BeanFactory</b> (it creates beans) plus extras (events, messages, the ${C('Environment')}, resource loading). Its whole start-up happens in one method: ${C('AbstractApplicationContext.refresh()')}. Interviewers love asking "what happens when Spring starts?", and the honest answer is this method's phases.</p>
<h4>1. Two kinds of data: definitions and instances</h4>
<p>A <b>BeanDefinition</b> is metadata, not an object of your class: the bean class or factory method, the scope, lazy-init, ${C('dependsOn')}, init/destroy method names, constructor arguments and property values (which may still contain ${C('${placeholders}')}). They live in a ${C('BeanDefinitionRegistry')} — a map from bean name to definition inside ${C('DefaultListableBeanFactory')}. Instances are created later, from these definitions.</p>
<h4>2. The phases of refresh() (simplified)</h4>
<ol><li><b>prepareRefresh / obtainFreshBeanFactory</b> — create the ${C('DefaultListableBeanFactory')}, validate required properties.</li>
<li><b>prepareBeanFactory</b> — register infrastructure: the ${C('ApplicationContextAwareProcessor')}, resolvable dependencies (you can inject ${C('ApplicationContext')}, ${C('BeanFactory')}, ${C('Environment')}).</li>
<li><b>invokeBeanFactoryPostProcessors</b> — the big one. ${C('ConfigurationClassPostProcessor')} (a ${C('BeanDefinitionRegistryPostProcessor')}) parses your ${C('@Configuration')} classes, runs component scanning, processes ${C('@Import')}, ${C('@Bean')} methods and, last, the deferred imports that bring in Boot auto-configuration. It <b>registers more definitions</b>. Then plain ${C('BeanFactoryPostProcessor')}s may <b>edit</b> definitions, e.g. ${C('PropertySourcesPlaceholderConfigurer')} resolves ${C('${...}')} in definition values.</li>
<li><b>registerBeanPostProcessors</b> — BPPs are themselves beans and are instantiated <b>early</b>, sorted ${C('PriorityOrdered')} → ${C('Ordered')} → the rest.</li>
<li><b>initMessageSource, initApplicationEventMulticaster, onRefresh</b> (Boot starts the embedded web server here), <b>registerListeners</b>.</li>
<li><b>finishBeanFactoryInitialization</b> — ${C('preInstantiateSingletons()')}: create every non-lazy singleton in registration order, then call ${C('SmartInitializingSingleton.afterSingletonsInstantiated()')}.</li>
<li><b>finishRefresh</b> — start ${C('Lifecycle')} beans (${C('SmartLifecycle')} phases), publish ${C('ContextRefreshedEvent')}.</li></ol>
<p>If anything throws, refresh destroys the singletons already created and rethrows — that is why one bad bean stops the whole app at start-up (fail fast), instead of failing at the first request.</p>
<h4>3. BFPP vs BPP — the most common confusion</h4>
<ul><li>${C('BeanFactoryPostProcessor')} runs <b>once, before any normal bean exists</b>, and works on <b>definitions</b>.</li>
<li>${C('BeanPostProcessor')} runs <b>for every bean instance</b> during creation, and may <b>replace</b> the instance (that is how proxies appear).</li></ul>
<p>A BFPP declared with a non-static ${C('@Bean')} method in a ${C('@Configuration')} class forces that config class to be created too early; Spring logs a warning. Declare BFPP ${C('@Bean')} methods ${C('static')}.</p>`,
    clues: [
      'The question says "before any bean is created", "modify bean definitions" or "placeholders in XML/@Value" → BeanFactoryPostProcessor phase.',
      'The question mentions "wrap", "proxy" or "every bean after init" → BeanPostProcessor phase, not BFPP.',
      'Start-up failure lists a bean creation chain ("Error creating bean with name a ... nested b") → it happened in preInstantiateSingletons, step 6 of refresh().',
      'A @Configuration class that defines a BFPP via an instance @Bean method → static method needed, or @Value/@Autowired in that config silently stay null.'
    ],
    code: [{ lang: 'java', check: false, title: 'Registering and editing definitions (Spring 6)', code: `// Runs before any normal bean exists. Adds a definition programmatically.
@Component
class FeatureBeansRegistrar implements BeanDefinitionRegistryPostProcessor {
    @Override
    public void postProcessBeanDefinitionRegistry(BeanDefinitionRegistry registry) {
        RootBeanDefinition def = new RootBeanDefinition(AuditClock.class);
        def.setScope(BeanDefinition.SCOPE_SINGLETON);
        def.setLazyInit(true);
        registry.registerBeanDefinition("auditClock", def);
    }
    @Override
    public void postProcessBeanFactory(ConfigurableListableBeanFactory bf) { }
}

@Configuration
class InfraConfig {
    // static: the BFPP must exist before InfraConfig itself is instantiated
    @Bean
    static BeanFactoryPostProcessor lazyEverything() {
        return bf -> {
            for (String name : bf.getBeanDefinitionNames()) {
                BeanDefinition d = bf.getBeanDefinition(name);
                if (d.getBeanClassName() != null && d.getBeanClassName().startsWith("com.acme.report")) {
                    d.setLazyInit(true);                 // editing METADATA, no instance exists yet
                }
            }
        };
    }
}` }, { lang: 'java', title: 'A tiny definition-driven container (plain Java, runs)', run: true, code: `import java.util.*;
import java.util.function.*;

public class MiniRefresh {
    static class Definition {
        final String name; final Supplier<Object> factory; boolean lazy;
        Definition(String name, Supplier<Object> factory) { this.name = name; this.factory = factory; }
    }
    interface DefinitionPostProcessor { void process(Map<String, Definition> registry); }

    final Map<String, Definition> registry = new LinkedHashMap<>();
    final Map<String, Object> singletons = new LinkedHashMap<>();
    final List<DefinitionPostProcessor> bfpps = new ArrayList<>();

    void refresh() {
        for (DefinitionPostProcessor p : bfpps) p.process(registry);     // phase 3: edit metadata
        for (Definition d : registry.values())                            // phase 6: eager singletons
            if (!d.lazy) getBean(d.name);
    }
    Object getBean(String name) {
        return singletons.computeIfAbsent(name, n -> {
            System.out.println("  creating " + n);
            return registry.get(n).factory.get();
        });
    }

    public static void main(String[] args) {
        MiniRefresh ctx = new MiniRefresh();
        ctx.registry.put("clock", new Definition("clock", () -> "Clock@UTC"));
        ctx.registry.put("report", new Definition("report", () -> "MonthlyReport"));
        ctx.bfpps.add(reg -> reg.get("report").lazy = true);             // a BFPP marks report lazy
        System.out.println("refresh():");
        ctx.refresh();
        System.out.println("after refresh singletons = " + ctx.singletons.keySet());
        System.out.println("first getBean(report):");
        ctx.getBean("report");
        System.out.println("now singletons = " + ctx.singletons.keySet());
    }
}` }],
    codeTitle: ['Registering and editing definitions (Spring 6)', 'A tiny definition-driven container (plain Java, runs)'],
    viz: [{
      title: 'refresh(), phase by phase',
      gen: function () {
        var phases = ['prepare', 'BFPPs', 'register BPPs', 'events + onRefresh', 'preInstantiate', 'finishRefresh'];
        function f(i, narr, defs, inst, hl) {
          var h = {}; h[i] = 'cur'; for (var k = 0; k < i; k++) h[k] = 'done';
          return { narr: narr, parts: [
            { type: 'array', label: 'refresh() phases', values: phases, hl: h },
            { type: 'table', label: 'BeanDefinitionRegistry (metadata)', columns: ['name', 'class', 'lazy', 'value'], rows: defs, hl: hl || {} },
            { type: 'set', label: 'Singleton instances', items: inst }
          ] };
        }
        var d0 = [['appConfig', 'AppConfig', 'false', '-']];
        var d1 = [['appConfig', 'AppConfig', 'false', '-'], ['orderService', 'OrderService', 'false', '-'], ['dataSource', 'HikariDataSource', 'false', 'url=&#36;{db.url}'], ['reportJob', 'ReportJob', 'true', '-']];
        var d2 = [['appConfig', 'AppConfig', 'false', '-'], ['orderService', 'OrderService', 'false', '-'], ['dataSource', 'HikariDataSource', 'false', 'url=jdbc:pg://db/shop'], ['reportJob', 'ReportJob', 'true', '-']];
        return [
          f(0, 'The context is created with only the class you passed (<code>AppConfig</code>) registered. No beans of yours exist yet — only <b>definitions</b>.', d0, []),
          f(1, '<b>ConfigurationClassPostProcessor</b> parses <code>AppConfig</code>: component scan finds <code>OrderService</code>, an <code>@Bean</code> method gives <code>dataSource</code>, and Boot auto-configuration adds more. All are still just metadata.', d1, [], { 1: 'ok', 2: 'ok', 3: 'ok' }),
          f(1, 'Then <b>PropertySourcesPlaceholderConfigurer</b> (a plain BFPP) rewrites <code>&#36;{db.url}</code> in the definition using the Environment. Editing metadata is cheap and safe because nothing was built yet.', d2, [], { 2: 'cur' }),
          f(2, 'BeanPostProcessors are <b>beans too</b>, so they are created now, before everything else: <code>AutowiredAnnotationBeanPostProcessor</code>, <code>CommonAnnotationBeanPostProcessor</code>, the AOP auto-proxy creator…', d2, ['autowiredBPP', 'commonAnnotationBPP', 'autoProxyCreator']),
          f(3, 'The event multicaster and listeners are registered. In Spring Boot, <code>onRefresh()</code> of the web context creates the embedded Tomcat/Jetty here.', d2, ['autowiredBPP', 'commonAnnotationBPP', 'autoProxyCreator', 'webServer']),
          f(4, '<b>preInstantiateSingletons</b> walks the definitions in registration order and creates every non-lazy singleton (dependencies first). <code>reportJob</code> is lazy, so it is skipped until someone asks for it.', d2, ['autowiredBPP', 'commonAnnotationBPP', 'autoProxyCreator', 'webServer', 'appConfig', 'dataSource', 'orderService'], { 3: 'bad' }),
          f(5, '<b>finishRefresh</b>: <code>SmartLifecycle</code> beans start (the web server begins accepting requests), and <code>ContextRefreshedEvent</code> is published. Boot then publishes <code>ApplicationReadyEvent</code>.', d2, ['autowiredBPP', 'commonAnnotationBPP', 'autoProxyCreator', 'webServer', 'appConfig', 'dataSource', 'orderService'])
        ];
      }
    }],
    examples: [
      { title: 'Why @Value is null in a config class that declares a BFPP', html: `<p>A ${C('@Configuration')} class has ${C('@Value("${app.name}") String name')} and also a non-static ${C('@Bean PropertySourcesPlaceholderConfigurer')}. To call that instance method, Spring must create the config class during the BFPP phase — before ${C('AutowiredAnnotationBeanPostProcessor')} exists. The field stays ${C('null')}. Spring logs: <i>"@Bean method ... is non-static and returns an object assignable to Spring's BeanFactoryPostProcessor interface"</i>. Fix: make the method ${C('static')}.</p>` },
      { title: 'Fail-fast start-up', html: `<p>A misspelt property makes ${C('dataSource')} creation throw in phase 6. Spring destroys the singletons that were already created (calls their destroy callbacks), closes the context, and the process exits with the full creation chain in the log. Good: the broken release never takes traffic. With ${C('spring.main.lazy-initialization=true')} the same error appears only on the first request — faster start-up, later failure.</p>` },
      { title: 'Registering beans in code', html: `<p>Besides ${C('BeanDefinitionRegistryPostProcessor')}, Spring 6 offers ${C('GenericApplicationContext.registerBean(Foo.class, () -> new Foo(...))')} and Spring Framework 7 adds the ${C('BeanRegistrar')} API. All of them end the same way: a definition in the registry, built later by the same creation pipeline, so BPPs and proxies still apply.</p>`, code: { lang: 'java', check: false, code: `GenericApplicationContext ctx = new GenericApplicationContext();
ctx.registerBean(Clock.class, Clock::systemUTC);
ctx.registerBean("orders", OrderService.class, () -> new OrderService(ctx.getBean(Clock.class)));
ctx.refresh();` } },
      { title: 'Seeing the definitions', html: `<p>${C('ctx.getBeanDefinitionNames()')} lists registered names, and ${C('((ConfigurableApplicationContext) ctx).getBeanFactory().getBeanDefinition("x")')} shows the metadata (scope, lazy, factory method, the resource it came from). Boot's ${C('/actuator/beans')} shows instances with their dependencies — a quick way to answer "where did this bean come from?".</p>` }
    ],
    deepDive: `<p><b>Ordering of BFPPs.</b> Spring first runs ${C('BeanDefinitionRegistryPostProcessor')}s (PriorityOrdered, then Ordered, then the rest, repeating while new ones appear, because one may register another), then plain BFPPs in the same three groups. ${C('ConfigurationClassPostProcessor')} is PriorityOrdered, which is why your config classes are parsed before your own BFPPs see the registry.</p>
<p><b>Merged bean definitions.</b> A definition can have a parent (inherited scope, properties). Before creating a bean, Spring computes a ${C('RootBeanDefinition')} by merging — and ${C('MergedBeanDefinitionPostProcessor')}s (like the autowiring BPP) cache injection metadata on it, so reflection over annotations happens once per class, not per instance.</p>
<p><b>Frozen configuration.</b> At the start of ${C('finishBeanFactoryInitialization')}, the factory calls ${C('freezeConfiguration()')}; after that, definition metadata is cached aggressively. Changing definitions at runtime is unsupported.</p>
<p><b>AOT and native images.</b> Spring 6 AOT runs refresh at <i>build time</i> up to the BFPP phase, then generates Java code that registers the final definitions (${C('__BeanDefinitions')} classes). At run time there is no classpath scanning or configuration-class parsing. This is why AOT forbids conditions that change at run time and why a BFPP that does dynamic things may not work in a native image.</p>
<p><b>Lifecycle beans.</b> ${C('SmartLifecycle')} beans start in ascending ${C('getPhase()')} order and stop in descending order; Boot's web server and graceful shutdown use this, which is how in-flight requests drain before the DataSource is closed.</p>`,
    aiEra: `<p><b>What AI changes:</b> an assistant can read a 200-line start-up stack trace and point to the failing bean faster than you can scroll. It is also good at writing a quick ${C('BeanDefinitionRegistryPostProcessor')} or explaining a "non-static BFPP" warning.</p>
<p><b>Where it goes wrong:</b> it mixes up BFPP and BPP, suggests ${C('@PostConstruct')} to "modify bean definitions", or proposes ${C('getBean()')} calls inside a BFPP (which instantiates beans too early and skips post-processing). It may also invent phases or apply Spring Boot 2 behaviour (for example XML-era ${C('PropertyPlaceholderConfigurer')}, removed in Spring 6).</p>
<p><b>What you still own:</b> a precise mental model of refresh(): what exists at each phase, what can still change, and why. That model lets you judge generated code, place a hook in the right phase and explain to an interviewer exactly why a field was null.</p>`,
    problems: [{
      title: 'Placeholder Resolution in Bean Definitions',
      level: 'Medium', tags: ['BeanFactoryPostProcessor', 'placeholders', 'recursion'], companies: ['VMware', 'Goldman Sachs', 'Amazon'],
      statement: `<p>Write the core of a placeholder-resolving BFPP. You get bean definition values as strings ${C('"bean.property=value"')} and the Environment's properties as ${C('"key=value"')}. Return every definition with its value resolved, in input order.</p>
<ul><li>${C('${key}')} is replaced by the property value. The property value may itself contain placeholders (resolve recursively).</li>
<li>${C('${key:default}')} uses the default when the key is missing. Split key and default at the <b>first</b> colon. Placeholders inside the braces (key or default) are resolved first, so ${C('${port:${default.port}}')} works.</li>
<li>If any key is missing with no default, refresh fails: return only ${C("\"ERROR Could not resolve placeholder 'key'\"")}.</li>
<li>If a key refers back to itself through other keys, return only ${C("\"ERROR Circular placeholder reference 'key'\"")}, naming the key seen twice.</li></ul>`,
      constraints: `0 ≤ definitions, properties ≤ 100. Values ≤ 200 characters. Braces are balanced inside placeholders.`,
      example: `<p>defs = ${C('["ds.url=jdbc:${db.host}:${db.port}"]')}, props = ${C('["db.host=localhost", "db.port=5432"]')} → ${H.c('g', C('["ds.url=jdbc:localhost:5432"]'))}.</p><p>props = ${C('["p=${q}", "q=${p}"]')}, defs = ${C('["a.x=${p}"]')} → ${H.c('r', C("[\"ERROR Circular placeholder reference 'p'\"]"))}: resolving p needs q, which needs p again.</p>`,
      brute: { why: `<p>A single ${C('String.replace')} pass per property handles flat placeholders, but it never resolves values that contain placeholders, ignores defaults, and loops forever (or silently leaves text) on cycles.</p>`, code: `
class NaivePlaceholders {
    static String resolve(String value, Map<String, String> props) {
        for (Map.Entry<String, String> e : props.entrySet())
            value = value.replace("\${" + e.getKey() + "}", e.getValue());   // one pass: no nesting, no defaults
        return value;
    }
}` },
      mcq: { q: 'In which refresh() phase does Spring replace <code>&#36;{db.url}</code> in a bean definition?', options: ['BeanFactoryPostProcessor phase, before any normal bean is created', 'BeanPostProcessor.postProcessAfterInitialization', 'When the bean\'s @PostConstruct runs', 'Lazily, the first time the property is read'], answer: 0, explain: 'PropertySourcesPlaceholderConfigurer is a BeanFactoryPostProcessor: it edits definition values (and registers an embedded value resolver for @Value) before instantiation.' },
      hints: [`<p>Hint 1: Find ${C('${')}, then its <b>matching</b> ${C('}')} by counting depth — the first ${C('}')} is wrong for ${C('${a:${b}}')}.</p>`, `<p>Hint 2: Resolve the text between the braces recursively first, then split it at the first colon into key and default. If the key exists, resolve its value recursively too.</p>`, `<p>Hint 3: Keep a set of keys currently being resolved: add before recursing into a value, remove after. Adding a key that is already there means a cycle. Throw, catch once at the top, and return the single error line.</p>`],
      tests: { sig: 'string[] string[] -> list<string>', fn: 'resolveAll', cases: [
        [[['ds.url=jdbc:${db.host}:${db.port}'], ['db.host=localhost', 'db.port=5432']], ['ds.url=jdbc:localhost:5432']],
        [[['svc.timeout=${timeout:30}'], []], ['svc.timeout=30']],
        [[['svc.timeout=${timeout:30}'], ['timeout=5']], ['svc.timeout=5']],
        [[['a.msg=${greeting}'], ['greeting=Hi ${name}', 'name=Ana']], ['a.msg=Hi Ana']],
        [[['a.x=${missing}'], []], ["ERROR Could not resolve placeholder 'missing'"]],
        [[['a.x=${p}'], ['p=${q}', 'q=${p}']], ["ERROR Circular placeholder reference 'p'"]],
        [[[], []], []],
        [[['ds.url=${url:jdbc:h2:mem}'], []], ['ds.url=jdbc:h2:mem']],
        [[['a.port=${port:${default.port}}'], ['default.port=8080']], ['a.port=8080']],
        [[['a.x=1', 'b.y=${nope}'], []], ["ERROR Could not resolve placeholder 'nope'"]],
        [[['a.x=plain', 'b.y=${k}-${k}'], ['k=v']], ['a.x=plain', 'b.y=v-v']]
      ] },
      solution: {
        approach: `<p>Scan left to right. Copy text up to each ${C('${')}, find the matching ${C('}')} with a depth counter, resolve the inside recursively (so nested keys and defaults work), split at the first colon, and look the key up. A found value is resolved again with the key added to a "visiting" set; meeting a key that is already being visited is a cycle. Any failure aborts the whole refresh, so a single exception is caught at the top.</p>`,
        code: `
class PlaceholderConfigurer {
    static List<String> resolveAll(String[] defs, String[] props) {
        Map<String, String> p = new HashMap<>();
        for (String kv : props) { int i = kv.indexOf('='); p.put(kv.substring(0, i), kv.substring(i + 1)); }
        List<String> out = new ArrayList<>();
        try {
            for (String d : defs) {
                int i = d.indexOf('=');
                out.add(d.substring(0, i + 1) + resolve(d.substring(i + 1), p, new HashSet<>()));
            }
        } catch (IllegalArgumentException e) {
            return List.of("ERROR " + e.getMessage());      // refresh fails as a whole
        }
        return out;
    }

    static String resolve(String s, Map<String, String> p, Set<String> visiting) {
        StringBuilder sb = new StringBuilder();
        int i = 0;
        while (i < s.length()) {
            int start = s.indexOf("\${", i);
            if (start < 0) { sb.append(s, i, s.length()); break; }
            sb.append(s, i, start);
            int end = matchingBrace(s, start + 2);
            if (end < 0) { sb.append(s.substring(start)); break; }       // unclosed: keep literally
            String inner = resolve(s.substring(start + 2, end), p, visiting);
            int colon = inner.indexOf(':');
            String key = colon < 0 ? inner : inner.substring(0, colon);
            String value = p.get(key);
            if (value != null) {
                if (!visiting.add(key)) throw new IllegalArgumentException("Circular placeholder reference '" + key + "'");
                value = resolve(value, p, visiting);
                visiting.remove(key);
            } else if (colon >= 0) {
                value = inner.substring(colon + 1);
            } else {
                throw new IllegalArgumentException("Could not resolve placeholder '" + key + "'");
            }
            sb.append(value);
            i = end + 1;
        }
        return sb.toString();
    }

    private static int matchingBrace(String s, int from) {
        int depth = 1;
        for (int j = from; j < s.length(); j++) {
            if (s.startsWith("\${", j)) { depth++; j++; }
            else if (s.charAt(j) == '}' && --depth == 0) return j;
        }
        return -1;
    }
}`,
        dry: { head: ['call', 'text', 'action', 'visiting', 'result'], rows: [
          ['1', C('jdbc:${db.host}:${db.port}'), 'copy "jdbc:", inner "db.host"', '{}', 'found "localhost"'],
          ['2', C('localhost'), 'no placeholders', '{db.host}', 'localhost'],
          ['1', C(':${db.port}'), 'copy ":", inner "db.port"', '{}', 'found "5432"'],
          ['done', '', '', '{}', H.c('g', 'jdbc:localhost:5432')],
          ['cycle', C('${p}'), 'p → &#36;{q} → &#36;{p}', '{p, q}', H.c('r', 'p already visiting → error')]
        ] },
        complexity: `<p>O(L × R) where L is the total text length and R the depth of nested references; each placeholder is resolved once per occurrence. Memory O(R) for the recursion and the visiting set.</p>`,
        followUps: ['How does @Value("#{...}") (SpEL) differ from &#36;{...} resolution?', 'Spring Boot lets you set ignoreUnresolvablePlaceholders — when would you want that?', 'Why does a non-static @Bean BFPP break @Value in the same config class?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 2 — doCreateBean: lifecycle callbacks, BPPs and the 3-level cache
     ====================================================================== */
  topics.push({
    title: 'Bean Creation Internals: doCreateBean, Callback Order & the Three-Level Cache',
    analogy: `<p>A car factory line: the <b>frame</b> is welded (constructor), the <b>parts</b> are bolted on (dependency injection), the car gets its <b>VIN plate</b> (Aware callbacks), the <b>inspectors</b> check it before and after the engine test (BeanPostProcessors before/after init), and the <b>engine test</b> itself runs (init callbacks). Sometimes car A needs a part from car B while B needs a part from A. The factory hands B a <b>photo of A's half-built frame</b> (an early reference) so both lines can keep going — that photo is Spring's third-level cache.</p>`,
    explain: `<p>Every singleton is created by ${C('AbstractAutowireCapableBeanFactory.doCreateBean')}. Knowing its exact order answers a whole family of interview questions ("is the field injected in the constructor?", "when does the proxy appear?", "why does @PostConstruct see a non-proxied this?").</p>
<h4>The creation pipeline</h4>
<ol><li><b>Instantiate</b> — pick a constructor (the only one, or the ${C('@Autowired')} one), resolve its arguments (creating those beans first), call it. A BPP hook (${C('InstantiationAwareBeanPostProcessor.postProcessBeforeInstantiation')}) may short-circuit with its own object.</li>
<li><b>Expose an early reference</b> — if the bean is a singleton currently in creation and circular references are allowed, register an ${C('ObjectFactory')} in the third-level cache.</li>
<li><b>Populate</b> — field and setter injection: ${C('AutowiredAnnotationBeanPostProcessor')} injects ${C('@Autowired')}/${C('@Value')}/${C('@Inject')}.</li>
<li><b>Initialize</b> (${C('initializeBean')}): <ol type="a"><li>Aware methods: ${C('BeanNameAware')}, ${C('BeanClassLoaderAware')}, ${C('BeanFactoryAware')}.</li><li>${C('postProcessBeforeInitialization')} of every BPP, in order. ${C('ApplicationContextAware')} is handled here by ${C('ApplicationContextAwareProcessor')}; ${C('@PostConstruct')} runs inside ${C('CommonAnnotationBeanPostProcessor')}, which is PriorityOrdered, so it runs <b>before</b> your un-ordered BPPs.</li><li>${C('InitializingBean.afterPropertiesSet()')}, then the custom ${C('initMethod')}.</li><li>${C('postProcessAfterInitialization')} of every BPP — the AOP auto-proxy creator <b>returns a proxy here</b>; from now on the container hands out the proxy.</li></ol></li>
<li><b>Register for destruction</b> — on ${C('close()')}: ${C('@PreDestroy')}, then ${C('DisposableBean.destroy()')}, then the custom destroy method (or an inferred ${C('close()')}/${C('shutdown()')} for ${C('@Bean')}s).</li></ol>
<h4>The three-level singleton cache</h4>
<ul><li><b>singletonObjects</b> — finished beans.</li><li><b>earlySingletonObjects</b> — early references already handed out.</li><li><b>singletonFactories</b> — ${C('ObjectFactory')} lambdas that produce the early reference on demand via ${C('SmartInstantiationAwareBeanPostProcessor.getEarlyBeanReference')} (this is where an AOP proxy can be created <i>early</i>).</li></ul>
<p>With A ↔ B field injection: A is instantiated, its factory registered; populating A needs B; B is created and needs A; ${C('getSingleton("a")')} finds A's factory, gets an early reference, moves it to level 2; B finishes; A finishes. <b>Constructor</b> cycles cannot work: A has no instance yet when B asks for it. And since <b>Spring Boot 2.6</b> circular references are <b>prohibited by default</b> (${C('spring.main.allow-circular-references=false')}), so even the field cycle fails with ${C('BeanCurrentlyInCreationException')} unless you opt in.</p>`,
    clues: [
      '"Is the dependency available in the constructor?" → only constructor-injected ones; field-injected ones are set after the constructor returns.',
      '"Why is this.someField null in my constructor but fine in @PostConstruct?" → populate happens between instantiate and initialize.',
      '"Where does the proxy come from?" → postProcessAfterInitialization, or getEarlyBeanReference for a bean in a cycle.',
      '"The dependencies of some of the beans form a cycle" at Boot start-up → circular references are disabled by default since Boot 2.6; restructure instead of re-enabling.'
    ],
    code: [{ lang: 'java', check: false, title: 'Every callback in one bean (Spring 6)', code: `@Component
class Probe implements BeanNameAware, ApplicationContextAware, InitializingBean, DisposableBean {
    private final Clock clock;            // constructor injection: available in the constructor
    @Autowired private Repo repo;         // field injection: null inside the constructor!

    Probe(Clock clock) { this.clock = clock; log("constructor, repo=" + repo); }   // repo=null
    public void setBeanName(String n)           { log("BeanNameAware " + n); }
    public void setApplicationContext(ApplicationContext c) { log("ApplicationContextAware"); }
    @PostConstruct void pc()                    { log("@PostConstruct, repo=" + repo); } // injected
    public void afterPropertiesSet()            { log("afterPropertiesSet"); }
    @PreDestroy void pd()                       { log("@PreDestroy"); }
    public void destroy()                       { log("DisposableBean.destroy"); }
}

@Component
class Tracer implements BeanPostProcessor {           // un-ordered: runs after PriorityOrdered BPPs
    public Object postProcessBeforeInitialization(Object b, String n) { return b; }
    public Object postProcessAfterInitialization(Object b, String n) {
        return b;   // returning a different object here REPLACES the bean (that is how proxies work)
    }
}` }, { lang: 'java', title: 'Three-level cache resolving a field cycle (plain Java model)', run: true, code: `import java.util.*;
import java.util.function.*;

public class ThreeLevelCache {
    static class Bean { final String name; Bean dep; Bean(String n) { name = n; } public String toString() { return name; } }
    final Map<String, Object> singletonObjects = new HashMap<>();
    final Map<String, Object> earlySingletonObjects = new HashMap<>();
    final Map<String, Supplier<Object>> singletonFactories = new HashMap<>();
    final Set<String> inCreation = new HashSet<>();
    final Map<String, String> fieldDep = Map.of("a", "b", "b", "a");

    Object getBean(String name) {
        Object o = singletonObjects.get(name);
        if (o == null) o = earlySingletonObjects.get(name);
        if (o == null && singletonFactories.containsKey(name)) {
            o = singletonFactories.remove(name).get();               // level 3 -> level 2
            earlySingletonObjects.put(name, o);
            System.out.println("  early reference to " + name + " handed out");
        }
        if (o != null) return o;
        if (!inCreation.add(name)) throw new IllegalStateException("BeanCurrentlyInCreationException: " + name);
        Bean b = new Bean(name);                                      // 1. instantiate
        System.out.println("instantiated " + name);
        singletonFactories.put(name, () -> b);                       // 2. expose early
        b.dep = (Bean) getBean(fieldDep.get(name));                   // 3. populate (field)
        inCreation.remove(name);
        earlySingletonObjects.remove(name); singletonFactories.remove(name);
        singletonObjects.put(name, b);                                // 4. finished
        System.out.println("finished " + name + " -> " + b.dep);
        return b;
    }

    public static void main(String[] args) {
        ThreeLevelCache f = new ThreeLevelCache();
        Bean a = (Bean) f.getBean("a");
        System.out.println("a.dep.dep == a ? " + (a.dep.dep == a));
    }
}` }],
    codeTitle: ['Every callback in one bean (Spring 6)', 'Three-level cache resolving a field cycle (plain Java model)'],
    viz: [{
      title: 'A ↔ B field cycle through the three caches',
      gen: function () {
        function f(narr, l1, l2, l3, stack, hl) {
          return { narr: narr, parts: [
            { type: 'map', label: 'L1 singletonObjects (finished)', entries: l1, hl: hl && hl.l1 ? hl.l1 : {} },
            { type: 'map', label: 'L2 earlySingletonObjects', entries: l2, hl: hl && hl.l2 ? hl.l2 : {} },
            { type: 'map', label: 'L3 singletonFactories', entries: l3, hl: hl && hl.l3 ? hl.l3 : {} },
            { type: 'stack', label: 'Creation stack (top = current)', items: stack }
          ] };
        }
        return [
          f('<code>getBean("a")</code>: not in any cache. A is marked "in creation" and its constructor runs.', [], [], [], ['create a']),
          f('A exists as a raw object but is not populated. Because circular references are allowed here, an <b>ObjectFactory</b> for A goes into level 3.', [], [], [['a', '() -> earlyRef(rawA)']], ['create a'], { l3: { a: 'ok' } }),
          f('Populating A needs B. B is not cached → create B, register its factory too.', [], [], [['a', '() -> earlyRef(rawA)'], ['b', '() -> earlyRef(rawB)']], ['create a', 'create b'], { l3: { b: 'ok' } }),
          f('Populating B needs A. A is <b>in creation</b>, so Spring calls A\'s factory. <code>getEarlyBeanReference</code> lets the AOP creator build a proxy <i>now</i> if A needs one. The result moves to level 2.', [], [['a', 'early A']], [['b', '() -> earlyRef(rawB)']], ['create a', 'create b'], { l2: { a: 'cur' } }),
          f('B gets the early A, finishes all callbacks and lands in level 1.', [['b', 'B']], [['a', 'early A']], [], ['create a'], { l1: { b: 'ok' } }),
          f('Back in A: B is injected, init callbacks run. If a BPP now returns a <b>different</b> object than the early reference that B holds, Spring fails with "has been injected into other beans in its raw version". Otherwise A lands in level 1.', [['b', 'B'], ['a', 'A']], [], [], [], { l1: { a: 'ok' } }),
          f('<b>Constructor</b> cycle instead: A\'s constructor needs B, B\'s constructor needs A, but A has no instance and no factory yet → <span class="c-r">BeanCurrentlyInCreationException</span>. The same happens for any cycle when Boot\'s default <code>allow-circular-references=false</code> keeps level 3 empty.', [], [], [], ['create a', 'create b', 'get a → ✖'])
        ];
      }
    }],
    examples: [
      { title: '@PostConstruct sees the raw object, not the proxy', html: `<p>Inside ${C('@PostConstruct')}, ${C('this')} is the target object: the proxy is created later, in ${C('postProcessAfterInitialization')}. So calling a ${C('@Transactional')} method of the same bean from ${C('@PostConstruct')} runs <b>without</b> a transaction. Use ${C('ApplicationRunner')}, ${C('@EventListener(ApplicationReadyEvent.class)')} or ${C('SmartInitializingSingleton')} for start-up work that needs proxies.</p>` },
      { title: 'Reading the cycle error', html: `<p>Boot prints a box:</p>${P(`The dependencies of some of the beans in the application context form a cycle:
┌─────┐
|  orderService defined in file [OrderService.class]
↑     ↓
|  paymentService defined in file [PaymentService.class]
└─────┘`)}<p>Fixes in order of preference: move the shared logic into a third bean; publish an event instead of calling back; inject ${C('ObjectProvider<OrderService>')} and resolve lazily; ${C('@Lazy')} on the injection point (injects a lazy-resolution proxy). Re-enabling ${C('allow-circular-references')} is the last resort.</p>` },
      { title: 'A BPP that replaces beans', html: `<p>Returning a different object from ${C('postProcessAfterInitialization')} swaps the bean everyone receives. This is how ${C('@Async')}, ${C('@Validated')} and AOP work. A BPP that depends on normal beans forces them to be created early, without all BPPs applied — Spring logs <i>"Bean 'x' is not eligible for getting processed by all BeanPostProcessors"</i>. Keep BPPs dependency-free and declare their ${C('@Bean')} methods static.</p>` },
      { title: 'Destroy callbacks and prototypes', html: `<p>Spring calls destroy callbacks only for beans it manages to the end: singletons (in reverse dependency order) and scoped beans when the scope ends. <b>Prototype</b> beans are handed over and forgotten: their ${C('@PreDestroy')} never runs, so the caller must release their resources.</p>` }
    ],
    deepDive: `<p><b>Constructor resolution.</b> ${C('ConstructorResolver.autowireConstructor')} picks the ${C('@Autowired')} constructor, or the only one; with several un-annotated constructors Spring uses the no-arg one (and fails if there is none). Kotlin primary constructors and Java records work because they have exactly one canonical constructor.</p>
<p><b>The early proxy contract.</b> ${C('AbstractAutoProxyCreator')} keeps ${C('earlyProxyReferences')}: if it already proxied A through ${C('getEarlyBeanReference')}, its ${C('postProcessAfterInitialization')} returns the raw bean unchanged, and ${C('doCreateBean')} then swaps in the early proxy, so everybody shares one proxy. ${C('AsyncAnnotationBeanPostProcessor')} does <b>not</b> implement early references, which is why an ${C('@Async')} bean inside a cycle fails with the "raw version" error.</p>
<p><b>Thread safety.</b> Singleton creation is guarded by a lock in ${C('DefaultSingletonBeanRegistry')}. Spring 6.2 added <b>background bootstrapping</b> (${C('@Bean(bootstrap = BACKGROUND)')}) and refined locking so independent beans can initialise in parallel; a bean that blocks waiting on another thread's bean during start-up is a classic deadlock source.</p>
<p><b>Destruction order.</b> Spring records "dependent beans" for every injection and destroys dependents first. A ${C('@DependsOn("flyway")')} adds such an edge for ordering without injection.</p>
<p><b>FactoryBean.</b> A bean implementing ${C('FactoryBean<T>')} is a factory: ${C('getBean("x")')} returns ${C('getObject()')}, and ${C('getBean("&x")')} returns the factory itself. Spring Data repositories and many Feign/MyBatis integrations are FactoryBeans.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants will happily "fix" a cycle error by adding ${C('spring.main.allow-circular-references=true')} or sprinkling ${C('@Lazy')}. They are also quick at listing lifecycle callbacks.</p>
<p><b>Where it goes wrong:</b> generated lists often put ${C('@PostConstruct')} after ${C('afterPropertiesSet')}, claim prototype beans get ${C('@PreDestroy')}, or say the proxy exists in the constructor. Those are exactly the details interviewers test.</p>
<p><b>What you still own:</b> recognising that a cycle is a <b>design smell</b> (two services that should be split or connected by events), predicting which object (raw or proxy) another bean holds, and choosing the right hook (constructor, ${C('@PostConstruct')}, ${C('SmartInitializingSingleton')}, ${C('ApplicationReadyEvent')}) for start-up work.</p>`,
    problems: [{
      title: 'Exact Lifecycle Callback Order',
      level: 'Easy', tags: ['bean lifecycle', 'BeanPostProcessor'], companies: ['Infosys', 'Accenture', 'JPMorgan'],
      statement: `<p>Simulate the callbacks Spring makes for one singleton from creation to ${C('context.close()')}. Return the event log:</p>
<ol><li>${C('"constructor"')}, ${C('"inject"')}</li><li>if ${C('aware')}: ${C('"setBeanName"')}</li><li>if ${C('annotations')} (the bean has ${C('@PostConstruct')}/${C('@PreDestroy')}): ${C('"@PostConstruct"')} (it runs in a PriorityOrdered BPP, before custom ones)</li><li>${C('"bpp1.before"')} … ${C('"bppN.before"')} for ${C('customBpps')} = N un-ordered BPPs</li><li>if ${C('initializingBean')} (implements ${C('InitializingBean')} and ${C('DisposableBean')}): ${C('"afterPropertiesSet"')}</li><li>if ${C('initMethod')} is not empty: ${C('"init:" + initMethod')}</li><li>${C('"bpp1.after"')} … ${C('"bppN.after"')}, then ${C('"ready"')}</li><li>${C('"close"')}, then ${C('"@PreDestroy"')} (if annotations), then ${C('"destroy()"')} (if initializingBean).</li></ol>`,
      constraints: `0 ≤ customBpps ≤ 5.`,
      example: `<p>${C('lifecycle(true, true, true, "warmUp", 1)')} → ${H.c('g', C('[constructor, inject, setBeanName, @PostConstruct, bpp1.before, afterPropertiesSet, init:warmUp, bpp1.after, ready, close, @PreDestroy, destroy()]'))}</p>`,
      brute: { why: `<p>Hard-coding one list and removing entries works for the sample but breaks for any number of BPPs and makes it easy to place ${C('@PostConstruct')} after ${C('afterPropertiesSet')} — the most common mistake.</p>`, code: `
class LifecycleGuess {
    static List<String> lifecycle() {
        return List.of("constructor", "inject", "afterPropertiesSet", "@PostConstruct", "ready");   // wrong order
    }
}` },
      mcq: { q: 'A bean has a custom BeanPostProcessor (no @Order) and a @PostConstruct method. Which runs first?', options: ['@PostConstruct, because CommonAnnotationBeanPostProcessor is PriorityOrdered', 'The custom BPP\'s before-init hook', 'afterPropertiesSet', 'They run in parallel'], answer: 0, explain: 'BPPs are sorted PriorityOrdered → Ordered → rest; @PostConstruct is executed by a PriorityOrdered BPP.' },
      hints: [`<p>Hint 1: Write the phases as fixed blocks: instantiate, populate, aware, before-init, init, after-init, ready, destroy.</p>`, `<p>Hint 2: The before and after loops each go 1..N in the same order; only the presence of single entries depends on the flags.</p>`, `<p>Hint 3: Destroy order is @PreDestroy, then DisposableBean.destroy(), then a custom destroy method — the annotation first, mirroring init.</p>`],
      tests: { sig: 'bool bool bool string int -> list<string>', fn: 'lifecycle', cases: [
        [[false, false, false, '', 0], ['constructor', 'inject', 'ready', 'close']],
        [[true, true, true, 'warmUp', 1], ['constructor', 'inject', 'setBeanName', '@PostConstruct', 'bpp1.before', 'afterPropertiesSet', 'init:warmUp', 'bpp1.after', 'ready', 'close', '@PreDestroy', 'destroy()']],
        [[false, false, false, 'init', 2], ['constructor', 'inject', 'bpp1.before', 'bpp2.before', 'init:init', 'bpp1.after', 'bpp2.after', 'ready', 'close']],
        [[true, false, false, '', 0], ['constructor', 'inject', 'setBeanName', 'ready', 'close']],
        [[false, true, false, '', 1], ['constructor', 'inject', '@PostConstruct', 'bpp1.before', 'bpp1.after', 'ready', 'close', '@PreDestroy']],
        [[false, false, true, '', 0], ['constructor', 'inject', 'afterPropertiesSet', 'ready', 'close', 'destroy()']],
        [[true, true, true, 'setup', 3], ['constructor', 'inject', 'setBeanName', '@PostConstruct', 'bpp1.before', 'bpp2.before', 'bpp3.before', 'afterPropertiesSet', 'init:setup', 'bpp1.after', 'bpp2.after', 'bpp3.after', 'ready', 'close', '@PreDestroy', 'destroy()']]
      ] },
      solution: {
        approach: `<p>Follow ${C('doCreateBean')}: instantiate and populate, then ${C('initializeBean')} (Aware → BPP before, where ${C('@PostConstruct')} runs first because its BPP is PriorityOrdered → InitializingBean → init method → BPP after). Destruction mirrors the init callbacks.</p>`,
        code: `
class LifecycleSimulator {
    static List<String> lifecycle(boolean aware, boolean annotations, boolean initializingBean,
                                  String initMethod, int customBpps) {
        List<String> log = new ArrayList<>();
        log.add("constructor");                                  // instantiate
        log.add("inject");                                       // populateBean
        if (aware) log.add("setBeanName");                       // invokeAwareMethods
        if (annotations) log.add("@PostConstruct");              // CommonAnnotationBPP (PriorityOrdered)
        for (int i = 1; i <= customBpps; i++) log.add("bpp" + i + ".before");
        if (initializingBean) log.add("afterPropertiesSet");     // invokeInitMethods
        if (!initMethod.isEmpty()) log.add("init:" + initMethod);
        for (int i = 1; i <= customBpps; i++) log.add("bpp" + i + ".after");   // proxies appear here
        log.add("ready");
        log.add("close");
        if (annotations) log.add("@PreDestroy");                 // DestructionAwareBPP first
        if (initializingBean) log.add("destroy()");              // then DisposableBean
        return log;
    }
}`,
        dry: { head: ['step', 'flag', 'appended'], rows: [
          ['instantiate + populate', '—', 'constructor, inject'],
          ['Aware', 'aware=true', 'setBeanName'],
          ['before-init', 'annotations=true, N=1', '@PostConstruct, bpp1.before'],
          ['init', 'initializingBean, "warmUp"', 'afterPropertiesSet, init:warmUp'],
          ['after-init', 'N=1', 'bpp1.after, ready'],
          ['close', 'annotations, initializingBean', H.c('g', 'close, @PreDestroy, destroy()')]
        ] },
        complexity: `<p>O(N) for N post-processors.</p>`,
        followUps: ['Where would ApplicationContextAware appear in this log?', 'Which callbacks run for a prototype bean?', 'Why does a BPP itself not get processed by BPPs registered after it?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 3 — How DI resolves a dependency
     ====================================================================== */
  topics.push({
    title: 'How Injection Resolves a Dependency: Type, @Qualifier, @Primary, @Priority, Name',
    analogy: `<p>You ask a hotel reception for "<i>a taxi</i>". If there is exactly one, you get it. If there are five, the receptionist checks your note: "<i>the one from Blue Cabs</i>" (qualifier). No note? They give you the hotel's <b>preferred partner</b> (primary). No preferred partner? The one with the best <b>ranking</b> (priority). Still a tie? If your note just said "<i>Bob</i>" and a driver is called Bob, you get Bob (name fallback). Otherwise the receptionist gives up and says "<i>too many taxis, be specific</i>" — Spring's ${'NoUniqueBeanDefinitionException'}.</p>`,
    explain: `<p>For every injection point (constructor parameter, field, setter, ${C('@Bean')} method parameter) Spring builds a ${C('DependencyDescriptor')} and calls ${C('DefaultListableBeanFactory.resolveDependency')}. The algorithm in ${C('doResolveDependency')}:</p>
<ol><li><b>Shortcut / @Value</b> — if the injection point has ${C('@Value')}, resolve the expression and convert it; done.</li>
<li><b>Multiple beans</b> — if the type is an array, ${C('Collection')}, ${C('List')}, ${C('Set')} or ${C('Map<String, T>')}, collect <b>all</b> matching candidates (lists sorted by ${C('Ordered')}/${C('@Order')}/${C('@Priority')}; maps keyed by bean name).</li>
<li><b>Find candidates by type</b> — every bean whose type is assignable to the requested type (generics included: ${C('Repository<Order>')} does not match ${C('Repository<User>')}), filtered by ${C('autowireCandidate=false')} and by <b>qualifiers</b>. A ${C('@Qualifier("x")')} matches a bean declaring that qualifier; a bean with <i>no</i> qualifier matches when its <b>name</b> is "x".</li>
<li><b>Zero</b> candidates → ${C('NoSuchBeanDefinitionException')} (unless ${C('required=false')}, ${C('Optional<T>')}, ${C('@Nullable')} or ${C('ObjectProvider')}).</li>
<li><b>One</b> → inject it.</li>
<li><b>Several</b> → ${C('determineAutowireCandidate')}: exactly one ${C('@Primary')} wins (two primaries → error); else the highest ${C('@Priority')} (lowest number; a tie → error); else a candidate whose bean name equals the parameter or field name; else ${C('NoUniqueBeanDefinitionException')}.</li></ol>
<p>The name fallback needs real parameter names: compile with ${C('-parameters')} (Spring Boot's Maven/Gradle plugins do). Spring 6.1 removed the old bytecode-reading fallback (${C('LocalVariableTableParameterNameDiscoverer')}), which broke many upgrades that silently relied on it.</p>
<h4>Lazy and optional handles</h4>
<ul><li>${C('ObjectProvider<T>')} — resolve later: ${C('getObject()')}, ${C('getIfAvailable()')}, ${C('getIfUnique()')}, ${C('orderedStream()')}. Perfect for optional beans, prototypes inside singletons, and breaking cycles.</li>
<li>${C('Optional<T>')} — empty when there is no candidate.</li>
<li>${C('@Lazy')} on an injection point — injects a proxy that resolves the real bean on first method call.</li></ul>`,
    clues: [
      '"expected single matching bean but found 2" → NoUniqueBeanDefinitionException: add @Primary, a @Qualifier, or rename the parameter.',
      'A @Qualifier together with @Primary → the qualifier filters first, so it wins over @Primary.',
      'Injecting List&lt;Handler&gt; or Map&lt;String, Handler&gt; → you get all beans; order the list with @Order.',
      'Upgrade to Spring 6.1 and suddenly NoUniqueBean errors → the build lost -parameters, so the name fallback stopped working.'
    ],
    code: [{ lang: 'java', check: false, title: 'Ways to choose among several candidates (Spring 6)', code: `interface PaymentGateway { String pay(int cents); }

@Component @Primary
class StripeGateway implements PaymentGateway { public String pay(int cents) { return "stripe:" + cents; } }
@Component @Qualifier("legacy")
class PaypalGateway implements PaymentGateway { public String pay(int cents) { return "paypal:" + cents; } }

@Service
class Checkout {
    Checkout(PaymentGateway gateway,                             // -> stripe (primary)
             @Qualifier("legacy") PaymentGateway old,            // -> paypal (qualifier beats primary)
             List<PaymentGateway> all,                           // -> both, ordered by @Order
             Map<String, PaymentGateway> byName,                 // -> {stripeGateway=..., paypalGateway=...}
             ObjectProvider<FraudCheck> fraud,                   // resolved later, may be absent
             Optional<Clock> clock) { }                          // empty if no Clock bean
}` }, { lang: 'java', title: 'Candidate selection, step by step (plain Java)', run: true, code: `import java.util.*;
import java.util.stream.*;

public class Resolver {
    record Candidate(String name, Set<String> types, boolean primary, Integer priority) { }

    static String resolve(String type, String fieldName, List<Candidate> beans) {
        List<Candidate> c = beans.stream().filter(b -> b.types().contains(type)).collect(Collectors.toList());
        if (c.isEmpty()) return "NoSuchBeanDefinitionException";
        if (c.size() == 1) return c.get(0).name();
        List<Candidate> primaries = c.stream().filter(Candidate::primary).collect(Collectors.toList());
        if (primaries.size() == 1) return primaries.get(0).name();
        if (primaries.size() > 1) return "NoUniqueBeanDefinitionException (more than one primary)";
        for (Candidate b : c) if (b.name().equals(fieldName)) return b.name();
        return "NoUniqueBeanDefinitionException";
    }

    public static void main(String[] args) {
        List<Candidate> beans = List.of(
            new Candidate("stripeGateway", Set.of("PaymentGateway"), false, null),
            new Candidate("paypalGateway", Set.of("PaymentGateway"), false, null));
        System.out.println(resolve("PaymentGateway", "paypalGateway", beans));  // name fallback
        System.out.println(resolve("PaymentGateway", "gateway", beans));        // ambiguous
        System.out.println(resolve("Clock", "clock", beans));                   // none
    }
}` }],
    codeTitle: ['Ways to choose among several candidates (Spring 6)', 'Candidate selection, step by step (plain Java)'],
    viz: [{
      title: 'Resolving PaymentGateway gateway',
      input: 'qualifier= primary=stripe field=gateway',
      inputLabel: 'qualifier=<name or empty> primary=<stripe|paypal|none> field=<parameter name>',
      gen: function (input) {
        var o = { qualifier: '', primary: 'stripe', field: 'gateway' };
        String(input || '').replace(/(qualifier|primary|field)=([A-Za-z]*)/g, function (_, k, v) { o[k] = v; return ''; });
        if (o.primary && ['stripe', 'paypal', 'none', ''].indexOf(o.primary) < 0) throw new Error('primary must be stripe, paypal or none');
        if (o.field.length > 30 || o.qualifier.length > 30) throw new Error('keep names under 30 characters');
        var names = ['stripe', 'paypal', 'clock'];
        var rows = [['stripe', 'PaymentGateway', o.primary === 'stripe' ? 'yes' : '-'], ['paypal', 'PaymentGateway', o.primary === 'paypal' ? 'yes' : '-'], ['clock', 'Clock', '-']];
        function f(narr, hl, cands, result) {
          return { narr: narr, parts: [
            { type: 'table', label: 'Registered beans', columns: ['name', 'type', '@Primary'], rows: rows, hl: hl },
            { type: 'vars', label: 'Resolution state', vals: { requested: 'PaymentGateway ' + o.field, qualifier: o.qualifier || '(none)', candidates: '[' + cands.join(', ') + ']', result: result }, hl: { result: 'cur' } }
          ] };
        }
        var F = [];
        var cands = ['stripe', 'paypal'];
        F.push(f('Step 1 — find every bean whose type is assignable to <code>PaymentGateway</code>. <code>clock</code> is filtered out by type.', { 0: 'win', 1: 'win', 2: 'bad' }, cands, '?'));
        if (o.qualifier) {
          cands = names.slice(0, 2).filter(function (n) { return n === o.qualifier; });
          F.push(f('Step 2 — <code>@Qualifier("' + o.qualifier + '")</code> filters candidates <b>before</b> anything else (none of these beans declares a qualifier, so the bean name is compared).', cands.length ? one(names.indexOf(cands[0]), 'sel') : {}, cands, cands.length ? '?' : 'none left'));
        } else {
          F.push(f('Step 2 — no qualifier on the injection point, so both type matches stay candidates.', { 0: 'win', 1: 'win' }, cands, '?'));
        }
        if (cands.length === 0) {
          F.push(f('Zero candidates → <span class="c-r">NoSuchBeanDefinitionException</span>: "expected at least 1 bean which qualifies as autowire candidate".', {}, cands, 'NoSuchBeanDefinitionException'));
        } else if (cands.length === 1) {
          F.push(f('Exactly one candidate → inject <b>' + cands[0] + '</b>. @Primary is never consulted.', one(names.indexOf(cands[0]), 'ok'), cands, cands[0]));
        } else if (o.primary === 'stripe' || o.primary === 'paypal') {
          F.push(f('Step 3 — several candidates, exactly one is <code>@Primary</code> → <b>' + o.primary + '</b> wins.', one(names.indexOf(o.primary), 'ok'), cands, o.primary));
        } else {
          F.push(f('Step 3 — no @Primary. Step 4 — no @Priority either. Step 5 — compare the parameter name <code>' + o.field + '</code> with bean names.', { 0: 'cur', 1: 'cur' }, cands, '?'));
          if (cands.indexOf(o.field) >= 0) F.push(f('Name match → inject <b>' + o.field + '</b>. This only works when the code was compiled with <code>-parameters</code>.', one(names.indexOf(o.field), 'ok'), cands, o.field));
          else F.push(f('No name matches → <span class="c-r">NoUniqueBeanDefinitionException</span>: "expected single matching bean but found 2: stripe,paypal".', { 0: 'bad', 1: 'bad' }, cands, 'NoUniqueBeanDefinitionException'));
        }
        F.push({ narr: 'Try it: <code>qualifier=paypal</code> (qualifier beats primary), <code>primary=none field=paypal</code> (name fallback), <code>primary=none field=gw</code> (ambiguous), <code>qualifier=ghost</code> (no candidates).', parts: [note('Order of tie-breakers', 'type → qualifier → (0 / 1 / many) → @Primary → @Priority → parameter/field name → error')] });
        return F;
        function one(k, cls) { var h = {}; h[k] = cls; return h; }
      }
    }],
    examples: [
      { title: 'Generic type as a qualifier', html: `<p>With ${C('@Bean Converter<Order> orderConverter()')} and ${C('@Bean Converter<User> userConverter()')}, injecting ${C('Converter<Order>')} picks the first without any annotation: Spring uses the full generic type (${C('ResolvableType')}) when matching. Returning the raw ${C('Converter')} type from the ${C('@Bean')} method throws that information away and makes both match.</p>` },
      { title: 'Strategy pattern with a Map', html: `<p>${C('Map<String, PaymentGateway>')} injects all gateways keyed by bean name. A controller can then do ${C('gateways.get(request.provider() + "Gateway")')} with no if/else chain — adding a provider is adding a bean.</p>`, code: { lang: 'java', check: false, code: `@Service
class PaymentRouter {
    private final Map<String, PaymentGateway> gateways;
    PaymentRouter(Map<String, PaymentGateway> gateways) { this.gateways = gateways; }
    String pay(String provider, int cents) {
        PaymentGateway g = gateways.get(provider + "Gateway");
        if (g == null) throw new IllegalArgumentException("unknown provider " + provider);
        return g.pay(cents);
    }
}` } },
      { title: '@Primary in a library vs your app', html: `<p>A library marks its ${C('ObjectMapper')} ${C('@Primary')}; your app also defines one ${C('@Primary')}. Two primaries → start-up fails. Boot's own auto-configured beans are usually ${C('@ConditionalOnMissingBean')} instead of primary, so your bean simply replaces them — a better pattern for libraries. Spring 6.2 also added ${C('@Fallback')}: the opposite of primary, used only when no other candidate exists.</p>` },
      { title: 'Self-injection', html: `<p>Since Spring 4.3 a bean may inject <b>itself</b> (as the proxy) — self-references are considered only as a last resort among candidates. It is one escape from the self-invocation problem covered later, though splitting the bean is cleaner.</p>` }
    ],
    deepDive: `<p><b>Where the decisions live.</b> ${C('ContextAnnotationAutowireCandidateResolver')} (extends ${C('QualifierAnnotationAutowireCandidateResolver')}) decides qualifier matches and builds lazy proxies for ${C('@Lazy')}. You can define <b>custom qualifier annotations</b> meta-annotated with ${C('@Qualifier')} (e.g. ${C('@Fast')}), which keeps string names out of code.</p>
<p><b>Collections.</b> For ${C('List<T>')} injection Spring sorts with ${C('AnnotationAwareOrderComparator')}: ${C('PriorityOrdered')} first, then by ${C('getOrder()')}/${C('@Order')}/${C('@Priority')}, un-ordered last (they get ${C('Ordered.LOWEST_PRECEDENCE')}), stable for ties. An empty collection is <b>not</b> injected — a required ${C('List<T>')} with no beans fails; use ${C('ObjectProvider<T>.orderedStream()')} or ${C('Optional')}.</p>
<p><b>Resolvable dependencies.</b> ${C('ApplicationContext')}, ${C('BeanFactory')}, ${C('ResourceLoader')} and ${C('ApplicationEventPublisher')} are injectable although they are not beans: they are registered via ${C('registerResolvableDependency')}.</p>
<p><b>Shortcuts.</b> After the first resolution for a prototype or for repeated injection, Spring caches a "shortcut" (the resolved bean name) on the injection metadata, so later resolutions skip the candidate search.</p>`,
    aiEra: `<p><b>What AI changes:</b> NoUniqueBeanDefinitionException is one of the errors assistants fix best: they suggest ${C('@Primary')} or ${C('@Qualifier')} instantly.</p>
<p><b>Where it goes wrong:</b> the suggested fix is often the wrong <i>kind</i>: ${C('@Primary')} on a bean that only one consumer should prefer (changing every other consumer), or a string ${C('@Qualifier')} that silently stops matching after a rename. It may also claim @Primary beats @Qualifier, or rely on name fallback without checking ${C('-parameters')}.</p>
<p><b>What you still own:</b> choosing the scope of the decision — global default (${C('@Primary')}/${C('@Fallback')}), per injection point (${C('@Qualifier')}, custom qualifier annotation), or all of them (${C('List')}/${C('Map')}) — and knowing the precedence order cold.</p>`,
    problems: [{
      title: 'Resolve an Injection Point',
      level: 'Medium', tags: ['dependency injection', 'qualifier', 'primary'], companies: ['Amazon', 'Walmart', 'Morgan Stanley'],
      statement: `<p>Implement ${C('resolve(type, qualifier, fieldName, beans)')}. Each bean is ${C('"name|Type1,Type2|flags"')} where flags is a comma list (maybe empty) of ${C('primary')}, ${C('priority=N')} and ${C('q=value')} (a declared ${C('@Qualifier')}). Return the chosen bean name, or ${C('"NoSuchBeanDefinitionException"')} / ${C('"NoUniqueBeanDefinitionException"')}.</p>
<ol><li>Candidates: beans whose types include ${C('type')} (in input order).</li>
<li>If ${C('qualifier')} is not empty, keep beans whose declared ${C('q')} equals it; a bean <b>without</b> a declared q matches when its name equals it.</li>
<li>0 → NoSuch. 1 → it.</li>
<li>Several: exactly one primary → it; more than one primary → NoUnique.</li>
<li>Else among candidates that have a priority, the lowest number wins; a tie for the lowest → NoUnique.</li>
<li>Else a candidate whose name equals ${C('fieldName')}; else NoUnique.</li></ol>`,
      constraints: `0 ≤ beans ≤ 50. Names and types are identifiers.`,
      example: `<p>beans = ${C('["stripe|PaymentGateway|primary", "paypal|PaymentGateway|"]')}: field ${C('gateway')} → ${H.c('g', 'stripe')}; qualifier ${C('paypal')} → ${H.c('g', 'paypal')} (qualifier filters before primary is considered).</p>`,
      brute: { why: `<p>Picking "the first bean of that type" hides ambiguity: the result depends on scan order, which changes when someone renames a package. Spring deliberately fails instead.</p>`, code: `
class FirstMatch {
    static String resolve(String type, String[] beans) {
        for (String b : beans) if (Arrays.asList(b.split("\\\\|")[1].split(",")).contains(type)) return b.split("\\\\|")[0];
        return "NoSuchBeanDefinitionException";
    }
}` },
      mcq: { q: 'Two beans implement <code>Notifier</code>; one is <code>@Primary</code>. The injection point is <code>@Qualifier("sms") Notifier n</code> and the non-primary bean is named <code>sms</code>. What is injected?', options: ['the sms bean — qualifiers filter before @Primary is considered', 'the primary bean', 'NoUniqueBeanDefinitionException', 'NoSuchBeanDefinitionException'], answer: 0, explain: 'The qualifier narrows the candidates to one; @Primary only breaks ties among several remaining candidates.' },
      hints: [`<p>Hint 1: Parse each bean once into name, a set of types, primary flag, priority (nullable) and declared qualifier (nullable). Remember ${C('split("\\\\|", -1)')} keeps an empty flags field.</p>`, `<p>Hint 2: Apply the steps strictly in order and return as soon as one step decides. Count primaries; do not stop at the first.</p>`, `<p>Hint 3: For priority, find the minimum among candidates that have one, then count how many share it: one → winner, more → NoUnique, none have priority → go on to the name fallback.</p>`],
      tests: { sig: 'string string string string[] -> string', fn: 'resolve', cases: [
        [['PaymentGateway', '', 'gateway', ['stripe|PaymentGateway,StripeGateway|']], 'stripe'],
        [['Clock', '', 'clock', ['stripe|PaymentGateway|']], 'NoSuchBeanDefinitionException'],
        [['PaymentGateway', '', 'gateway', ['stripe|PaymentGateway|primary', 'paypal|PaymentGateway|']], 'stripe'],
        [['PaymentGateway', '', 'paypal', ['stripe|PaymentGateway|', 'paypal|PaymentGateway|']], 'paypal'],
        [['PaymentGateway', '', 'gateway', ['stripe|PaymentGateway|', 'paypal|PaymentGateway|']], 'NoUniqueBeanDefinitionException'],
        [['PaymentGateway', 'paypal', 'gateway', ['stripe|PaymentGateway|primary', 'paypal|PaymentGateway|']], 'paypal'],
        [['PaymentGateway', 'stripe', 'gateway', ['stripe|PaymentGateway|q=fast', 'paypal|PaymentGateway|']], 'NoSuchBeanDefinitionException'],
        [['PaymentGateway', 'fast', 'gateway', ['stripe|PaymentGateway|q=fast', 'paypal|PaymentGateway|']], 'stripe'],
        [['PaymentGateway', '', 'gateway', ['a|PaymentGateway|primary', 'b|PaymentGateway|primary']], 'NoUniqueBeanDefinitionException'],
        [['PaymentGateway', '', 'gateway', ['a|PaymentGateway|priority=5', 'b|PaymentGateway|priority=1']], 'b'],
        [['PaymentGateway', '', 'a', ['a|PaymentGateway|priority=1', 'b|PaymentGateway|priority=1']], 'NoUniqueBeanDefinitionException'],
        [['PaymentGateway', '', 'paypal', ['stripe|PaymentGateway|primary', 'paypal|PaymentGateway|']], 'stripe'],
        [['StripeGateway', '', 'gateway', ['stripe|PaymentGateway,StripeGateway|', 'paypal|PaymentGateway|']], 'stripe'],
        [['PaymentGateway', '', 'x', []], 'NoSuchBeanDefinitionException']
      ] },
      solution: {
        approach: `<p>Model ${C('doResolveDependency')} + ${C('determineAutowireCandidate')}: filter by type, then by qualifier (declared qualifier, or bean name when none is declared), then decide 0/1/many, and for many apply primary → priority → name in that order, failing on ties.</p>`,
        code: `
class InjectionResolver {
    static final class Bean {
        String name; Set<String> types; boolean primary; Integer priority; String qualifier;
    }

    static String resolve(String type, String qualifier, String fieldName, String[] beans) {
        List<Bean> cands = new ArrayList<>();
        for (String spec : beans) {
            Bean b = parse(spec);
            if (b.types.contains(type)) cands.add(b);
        }
        if (!qualifier.isEmpty()) {
            List<Bean> kept = new ArrayList<>();
            for (Bean b : cands)
                if (b.qualifier != null ? b.qualifier.equals(qualifier) : b.name.equals(qualifier)) kept.add(b);
            cands = kept;
        }
        if (cands.isEmpty()) return "NoSuchBeanDefinitionException";
        if (cands.size() == 1) return cands.get(0).name;

        Bean primary = null;
        for (Bean b : cands) if (b.primary) {
            if (primary != null) return "NoUniqueBeanDefinitionException";   // more than one primary
            primary = b;
        }
        if (primary != null) return primary.name;

        Bean best = null; boolean tie = false;
        for (Bean b : cands) {
            if (b.priority == null) continue;
            if (best == null || b.priority < best.priority) { best = b; tie = false; }
            else if (b.priority.equals(best.priority)) tie = true;
        }
        if (best != null) return tie ? "NoUniqueBeanDefinitionException" : best.name;

        for (Bean b : cands) if (b.name.equals(fieldName)) return b.name;   // needs -parameters
        return "NoUniqueBeanDefinitionException";
    }

    private static Bean parse(String spec) {
        String[] p = spec.split("\\\\|", -1);
        Bean b = new Bean();
        b.name = p[0];
        b.types = new HashSet<>(Arrays.asList(p[1].split(",")));
        for (String flag : p[2].split(",")) {
            if (flag.equals("primary")) b.primary = true;
            else if (flag.startsWith("priority=")) b.priority = Integer.parseInt(flag.substring(9));
            else if (flag.startsWith("q=")) b.qualifier = flag.substring(2);
        }
        return b;
    }
}`,
        dry: { head: ['step', 'candidates', 'decision'], rows: [
          ['type PaymentGateway', '[stripe(primary), paypal]', 'continue'],
          ['qualifier "paypal"', '[paypal]', H.c('g', 'one left → paypal')],
          ['(no qualifier) primary', '[stripe, paypal]', H.c('g', 'one primary → stripe')],
          ['priorities 1, 1', '[a, b]', H.c('r', 'tie → NoUnique')],
          ['no primary/priority, field "paypal"', '[stripe, paypal]', H.c('g', 'name match → paypal')]
        ] },
        complexity: `<p>O(B × T) to parse and filter B beans with T types each; the tie-break passes are O(B).</p>`,
        followUps: ['How would a custom @Fast qualifier annotation change the qualifier step?', 'What does Spring 6.2 @Fallback add to this algorithm?', 'How does ObjectProvider.getIfUnique behave when there are two candidates and one is primary?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 4 — Scopes, scoped proxies and @Configuration full vs lite
     ====================================================================== */
  topics.push({
    title: 'Scopes, Scoped Proxies & @Configuration Full vs Lite Mode',
    analogy: `<p>A restaurant has one <b>head chef</b> for everybody (singleton), hands every guest a <b>new napkin</b> (prototype), and gives each table its own <b>order pad</b> (request/session scope). The head chef cannot keep one table's order pad in his pocket all night — he keeps a <b>note that says "the pad of whichever table I am serving right now"</b>. That note is a <b>scoped proxy</b>. Meanwhile the kitchen manager's recipe book says "make the sauce" in three recipes; a smart manager (full mode) makes the sauce once and reuses it, a careless one (lite mode) makes it three times.</p>`,
    explain: `<p>be06 covered what the scopes are. Here is how they are implemented and where they bite.</p>
<h4>How a scope works</h4>
<p>A scope is an object implementing ${C('org.springframework.beans.factory.config.Scope')}: ${C('get(name, objectFactory)')} returns the existing instance for the current context or creates one; ${C('remove')} and ${C('registerDestructionCallback')} handle the end of the context. ${C('RequestScope')} and ${C('SessionScope')} store instances as attributes of the current request/session, found through ${C('RequestContextHolder')} — a <b>ThreadLocal</b>. Singleton and prototype are built into the factory: singletons go to ${C('singletonObjects')}, prototypes are created on every ${C('getBean')} and never cached or destroyed.</p>
<h4>The scope-mismatch problem and three fixes</h4>
<p>Injection happens <b>once</b>, when the singleton is created. A request-scoped bean injected directly into a singleton would be captured once (there is no request at start-up, so it actually fails with "Scope 'request' is not active"). Fixes:</p>
<ul><li><b>Scoped proxy</b> — ${C('@RequestScope')} (which sets ${C('proxyMode = TARGET_CLASS')}) registers <b>two</b> definitions: the real one renamed ${C('scopedTarget.cart')} and a singleton CGLIB proxy named ${C('cart')}. Each call on the proxy does ${C('beanFactory.getBean("scopedTarget.cart")')}, which asks the scope for the current request's instance.</li>
<li>${C('ObjectProvider<T>')} — call ${C('getObject()')} each time you need it.</li>
<li><b>Lookup method injection</b> — ${C('@Lookup')} on an abstract method; Spring CGLIB-overrides it to call ${C('getBean')}.</li></ul>
<h4>@Configuration full vs lite</h4>
<p>A ${C('@Configuration')} class is by default (${C('proxyBeanMethods = true')}) <b>enhanced by CGLIB</b> at start-up. The subclass intercepts calls to ${C('@Bean')} methods: if one ${C('@Bean')} method calls another, the interceptor returns the <b>container's</b> bean (respecting scope) instead of running the method again. In <b>lite mode</b> — ${C('proxyBeanMethods = false')}, or ${C('@Bean')} methods in a ${C('@Component')} or plain class — there is no subclass: a call is a plain Java call that builds a <b>new</b> object every time. Boot's auto-configurations use ${C('proxyBeanMethods = false')} for faster start-up and must therefore receive dependencies as method <b>parameters</b>, never by calling sibling methods.</p>`,
    clues: [
      'A shared @Bean ends up as two different objects (two pools, two caches) → lite-mode config calling a sibling @Bean method.',
      '"Scope \'request\' is not active for the current thread" → a request-scoped bean used at start-up, in @Async/another thread, or without a scoped proxy.',
      'A prototype injected into a singleton behaves like a singleton → injection happens once; use ObjectProvider or @Lookup.',
      'getClass() of a config class prints ...$$SpringCGLIB$$0 → full mode enhancement (it is not an AOP proxy).'
    ],
    code: [{ lang: 'java', check: false, title: 'Scoped proxy and full vs lite (Spring 6)', code: `@Component
@RequestScope                       // = @Scope(value = "request", proxyMode = ScopedProxyMode.TARGET_CLASS)
class Cart { final List<String> items = new ArrayList<>(); }

@Service
class CheckoutService {             // singleton
    private final Cart cart;        // this is the CGLIB scoped PROXY, created once
    CheckoutService(Cart cart) { this.cart = cart; }
    int count() { return cart.items.size(); }   // proxy -> getBean("scopedTarget.cart") -> this request's Cart
}

@Configuration                       // full mode: CGLIB-enhanced
class DbConfig {
    @Bean DataSource dataSource() { return new HikariDataSource(); }
    @Bean JdbcTemplate jdbc() { return new JdbcTemplate(dataSource()); }   // returns the SAME container bean
}

@Configuration(proxyBeanMethods = false)   // lite mode: no subclass
class FastConfig {
    @Bean DataSource dataSource() { return new HikariDataSource(); }
    @Bean JdbcTemplate jdbc(DataSource ds) { return new JdbcTemplate(ds); } // take it as a parameter!
}` }, { lang: 'java', title: 'Full mode in miniature: memoising @Bean calls (plain Java, runs)', run: true, code: `import java.util.*;
import java.util.function.*;

public class FullVsLite {
    static int pools = 0;
    static class Pool { final int id = ++pools; }

    static class Config {                       // what you write
        Pool dataSource() { return new Pool(); }
        String repoA() { return "repoA uses pool#" + dataSource().id; }
        String repoB() { return "repoB uses pool#" + dataSource().id; }
    }
    static class EnhancedConfig extends Config { // what CGLIB generates in full mode (simplified)
        private final Map<String, Object> container = new HashMap<>();
        @Override Pool dataSource() {
            return (Pool) container.computeIfAbsent("dataSource", k -> super.dataSource());
        }
    }

    public static void main(String[] args) {
        Config lite = new Config();
        System.out.println("lite: " + lite.repoA() + ", " + lite.repoB() + "  (pools created: " + pools + ")");
        pools = 0;
        Config full = new EnhancedConfig();
        System.out.println("full: " + full.repoA() + ", " + full.repoB() + "  (pools created: " + pools + ")");
    }
}` }],
    codeTitle: ['Scoped proxy and full vs lite (Spring 6)', 'Full mode in miniature: memoising @Bean calls (plain Java, runs)'],
    viz: [{
      title: 'One singleton, two requests, one scoped proxy',
      gen: function () {
        var nodes = [box('T1', 'Thread 1 (request A)', 10, 10, 22), box('T2', 'Thread 2 (request B)', 10, 50, 22), box('S', 'CheckoutService (singleton)', 40, 30, 24), box('P', 'Cart proxy (singleton)', 66, 30, 22), box('CA', 'Cart of A', 92, 10, 14), box('CB', 'Cart of B', 92, 50, 14)];
        var edges = [['T1', 'S', 'count()'], ['T2', 'S', 'count()'], ['S', 'P', 'cart.items'], ['P', 'CA', 'getBean'], ['P', 'CB', 'getBean']];
        function g(hl, ehl, tags) { return { type: 'graph', label: 'Call path', directed: true, height: 62, nodes: nodes, edges: edges, hl: hl, ehl: ehl || {}, tags: tags || {} }; }
        function v(vals, h) { return { type: 'vars', label: 'RequestContextHolder (ThreadLocal)', vals: vals, hl: h || {} }; }
        return [
          { narr: 'At start-up Spring registers <code>scopedTarget.cart</code> (request scope) and a <b>singleton proxy</b> named <code>cart</code>. <code>CheckoutService</code> receives the proxy — no request exists yet, and none is needed.', parts: [g({ S: 'cur', P: 'ok' }, { 'S-P': 'ok' }, { P: 'injected once' }), v({ thread1: '-', thread2: '-' })] },
          { narr: 'Request A arrives on thread 1. The DispatcherServlet\'s <code>RequestContextFilter</code>/<code>FrameworkServlet</code> binds request A into a <b>ThreadLocal</b>.', parts: [g({ T1: 'cur' }), v({ thread1: 'request A', thread2: '-' }, { thread1: 'cur' })] },
          { narr: 'Thread 1 calls <code>count()</code>; the singleton touches <code>cart</code>, which is the proxy. The proxy calls <code>getBean("scopedTarget.cart")</code> → RequestScope looks in request A\'s attributes → creates <b>Cart of A</b>.', parts: [g({ T1: 'cur', S: 'cur', P: 'cur', CA: 'ok' }, { 'T1-S': 'cur', 'S-P': 'cur', 'P-CA': 'ok' }), v({ thread1: 'request A', thread2: '-' })] },
          { narr: 'Meanwhile thread 2 handles request B. <b>Same</b> singleton, <b>same</b> proxy — but the ThreadLocal now points at request B, so the proxy resolves <b>Cart of B</b>. No data leaks between users.', parts: [g({ T2: 'cur', S: 'cur', P: 'cur', CB: 'ok' }, { 'T2-S': 'cur', 'S-P': 'cur', 'P-CB': 'ok' }), v({ thread1: 'request A', thread2: 'request B' }, { thread2: 'cur' })] },
          { narr: 'Request A ends: the request attributes are cleared and destruction callbacks of Cart of A run. Request-scoped beans <b>do</b> get <code>@PreDestroy</code>; prototypes do not.', parts: [g({ CA: 'done', T1: 'done' }), v({ thread1: '-', thread2: 'request B' })] },
          { narr: 'Trap: the singleton starts a <code>CompletableFuture.supplyAsync(() -&gt; cart.items...)</code>. The pool thread has <b>no</b> request bound → <span class="c-r">IllegalStateException: Scope \'request\' is not active</span>. Copy the data you need into the task instead.', parts: [g({ P: 'bad' }, {}, { P: 'no request on pool thread' }), v({ thread1: '-', poolThread: 'nothing bound' }, { poolThread: 'bad' })] }
        ];
      }
    }],
    examples: [
      { title: 'Two connection pools by accident', html: `<p>A config class annotated ${C('@Component')} (lite mode) has ${C('@Bean DataSource ds()')} and ${C('@Bean JdbcTemplate jdbc() { return new JdbcTemplate(ds()); }')}. The app now has <b>two</b> Hikari pools: the container's bean and the one created by the direct call — double the database connections, and the second one is never closed. Switching to ${C('@Configuration')} or using a method parameter fixes it.</p>` },
      { title: 'Why final @Bean methods fail', html: `<p>In full mode the CGLIB subclass must override every ${C('@Bean')} method, so ${C('@Bean')} methods and the ${C('@Configuration')} class must not be ${C('final')} or ${C('private')}. Spring reports "@Bean method must not be private or final; change the method's modifiers to continue". Lite mode has no such restriction — and records cannot be full-mode config classes.</p>` },
      { title: 'Prototype per call with ObjectProvider', html: `<p>A singleton ${C('ReportService')} needs a fresh, stateful ${C('ReportBuilder')} per report:</p>`, code: { lang: 'java', check: false, code: `@Component @Scope("prototype") class ReportBuilder { /* mutable state */ }

@Service
class ReportService {
    private final ObjectProvider<ReportBuilder> builders;
    ReportService(ObjectProvider<ReportBuilder> builders) { this.builders = builders; }
    String build(Order o) {
        ReportBuilder b = builders.getObject();     // new instance every call
        return b.add(o).render();
    }
}` } },
      { title: 'Static @Bean methods are never intercepted', html: `<p>A ${C('static')} ${C('@Bean')} method cannot be overridden, so even in full mode a call to it runs the method again. That is fine for BFPPs (they are called once by the container) but wrong for shared resources.</p>` }
    ],
    deepDive: `<p><b>The enhancer.</b> ${C('ConfigurationClassPostProcessor.enhanceConfigurationClasses')} replaces the bean class in the definition with a CGLIB subclass (${C('AppConfig$$SpringCGLIB$$0')}). Its ${C('BeanMethodInterceptor')} checks whether the call comes from the container itself (the factory method currently being invoked); if so it calls ${C('super')} to build the object, otherwise it delegates to ${C('beanFactory.getBean')}. Because of that check, a ${C('@Bean')} method that returns a prototype still gives a new object per call, even in full mode.</p>
<p><b>Scoped proxies under the hood.</b> ${C('ScopedProxyUtils.createScopedProxy')} registers a ${C('ScopedProxyFactoryBean')}. With ${C('ScopedProxyMode.INTERFACES')} a JDK proxy is used instead of CGLIB. The target definition gets ${C('autowireCandidate=false')} so that only the proxy is injected by type.</p>
<p><b>Custom scopes.</b> ${C('SimpleThreadScope')} (registered via ${C('CustomScopeConfigurer')}) and Spring Batch's ${C('step')}/${C('job')} scopes follow the same pattern. A "tenant" scope keyed by a tenant id in a ThreadLocal is a common interview design question — remember it must also work (or fail clearly) on async threads and with virtual threads, where ThreadLocal copies are per virtual thread.</p>
<p><b>Lite mode wins at scale.</b> CGLIB enhancement costs start-up time and memory and is not friendly to native images; that is why Spring Boot's own configurations are all lite.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants generate ${C('@Configuration')} classes in seconds; they often copy Boot's ${C('proxyBeanMethods = false')} because it is common in modern code.</p>
<p><b>Where it goes wrong:</b> they combine ${C('proxyBeanMethods = false')} with sibling ${C('@Bean')} calls — the code compiles, tests with mocks pass, and production silently gets duplicate pools or caches. They also inject request-scoped beans into ${C('@Async')} methods or reactive pipelines, where the ThreadLocal is empty.</p>
<p><b>What you still own:</b> reviewing configuration for "who owns this instance?", spotting inter-bean calls in lite mode, and understanding that scope is about <i>lookup time</i>, which only a proxy or provider can delay.</p>`,
    problems: [{
      title: 'Count Instances: Full vs Lite @Configuration',
      level: 'Medium', tags: ['@Configuration', 'CGLIB', 'proxyBeanMethods'], companies: ['VMware', 'Atlassian', 'Uber'],
      statement: `<p>A configuration class has singleton ${C('@Bean')} methods given as ${C('"name"')} or ${C('"name=dep1,dep2"')}, meaning the method body <b>calls</b> the methods ${C('dep1()')}, ${C('dep2()')} directly (in that order). At start-up the container invokes every ${C('@Bean')} method once, in input order. Return how many times each method body <b>executes</b> (one count per bean, in input order).</p>
<ul><li>Full mode (${C('proxyBeanMethods = true')}): calls are intercepted; every body runs exactly once.</li>
<li>Lite mode: a direct call runs the body again, including the calls inside it.</li></ul>`,
      constraints: `0 ≤ beans ≤ 15, no cycles, every dependency is one of the beans. Counts fit in an int.`,
      example: `<p>${C('["a", "b=a", "c=a,b"]')}, lite → ${H.c('g', C('[4, 2, 1]'))}: container runs a (a=1), b (b=1, a=2), c (c=1, a=3, b=2 which calls a again: a=4).</p>`,
      brute: { why: `<p>Counting only the edges (number of methods that mention ${C('a')}) gives 3 for ${C('a')}: it misses that a call to ${C('b()')} inside ${C('c()')} re-runs ${C('b')}'s own calls. Lite mode is a full recursive execution.</p>`, code: `
class EdgeCount {
    static int[] instances(String[] beans) {
        Map<String, Integer> idx = new HashMap<>();
        for (int i = 0; i < beans.length; i++) idx.put(beans[i].split("=")[0], i);
        int[] c = new int[beans.length];
        Arrays.fill(c, 1);
        for (String b : beans) if (b.contains("=")) for (String d : b.split("=")[1].split(",")) c[idx.get(d)]++;
        return c;                                   // wrong for nested calls
    }
}` },
      mcq: { q: 'Why does Spring Boot use <code>@Configuration(proxyBeanMethods = false)</code> in its auto-configurations?', options: ['To avoid CGLIB enhancement (faster start-up, native-image friendly); dependencies are passed as @Bean method parameters instead', 'To make every bean a prototype', 'Because CGLIB cannot proxy configuration classes', 'To allow final @Bean methods to be intercepted'], answer: 0, explain: 'Lite mode skips the CGLIB subclass. It is safe as long as no @Bean method calls a sibling @Bean method.' },
      hints: [`<p>Hint 1: In full mode the answer is all ones — no simulation needed.</p>`, `<p>Hint 2: In lite mode write ${C('run(x)')}: increment ${C('count[x]')}, then ${C('run(d)')} for each dependency. Call ${C('run')} once for every bean in input order.</p>`, `<p>Hint 3: The recursion can blow up exponentially on deep diamonds; memoise "how many times does running x execute y" if inputs grow. For ≤ 15 beans plain recursion is fine.</p>`],
      tests: { sig: 'string[] bool -> int[]', fn: 'instances', cases: [
        [[['a', 'b=a'], true], [1, 1]],
        [[['a', 'b=a'], false], [2, 1]],
        [[['a', 'b=a', 'c=a,b'], false], [4, 2, 1]],
        [[['a', 'b=a', 'c=a,b'], true], [1, 1, 1]],
        [[['x'], false], [1]],
        [[[], false], []],
        [[['c=b', 'b=a', 'a'], false], [1, 2, 3]],
        [[['d', 'b=d', 'c=d', 'a=b,c'], false], [5, 2, 2, 1]]
      ] },
      solution: {
        approach: `<p>Full mode memoises every ${C('@Bean')} through the container, so each body runs once. Lite mode is ordinary Java: simulate the container's single invocation of each method and let each invocation recursively execute its direct calls, counting executions.</p>`,
        code: `
class ConfigModes {
    static int[] instances(String[] beans, boolean proxyBeanMethods) {
        int n = beans.length;
        Map<String, Integer> idx = new HashMap<>();
        List<List<Integer>> calls = new ArrayList<>();
        for (int i = 0; i < n; i++) idx.put(beans[i].split("=")[0], i);
        for (String b : beans) {
            List<Integer> ds = new ArrayList<>();
            int eq = b.indexOf('=');
            if (eq >= 0) for (String d : b.substring(eq + 1).split(",")) ds.add(idx.get(d));
            calls.add(ds);
        }
        int[] count = new int[n];
        if (proxyBeanMethods) { Arrays.fill(count, 1); return count; }   // CGLIB: container bean reused
        for (int i = 0; i < n; i++) run(i, calls, count);                // container calls each once
        return count;
    }

    private static void run(int bean, List<List<Integer>> calls, int[] count) {
        count[bean]++;                                                   // body executes
        for (int d : calls.get(bean)) run(d, calls, count);              // plain Java call: runs again
    }
}`,
        dry: { head: ['container invokes', 'executions', 'a', 'b', 'c'], rows: [
          ['a()', 'a', '1', '0', '0'],
          ['b()', 'b, a', '2', '1', '0'],
          ['c()', 'c, a, b, a', '4', '2', '1'],
          ['full mode', 'each once', H.c('g', '1'), H.c('g', '1'), H.c('g', '1')]
        ] },
        complexity: `<p>Lite: O(total executions), exponential in the worst case of deep diamonds (that is the real-world cost too!). Full: O(n).</p>`,
        followUps: ['What changes if b is a prototype @Bean in full mode?', 'How does BeanMethodInterceptor know a call comes from the container?', 'How would you detect accidental inter-bean calls in lite mode with a test?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 5 — AOP proxies: auto-proxy creator, advisor chain, JDK vs CGLIB
     ====================================================================== */
  topics.push({
    title: 'AOP Proxy Internals: Advisors, the Interceptor Chain, JDK vs CGLIB & Self-Invocation',
    analogy: `<p>A celebrity (your bean) has a <b>manager</b> (the proxy). Every request to the celebrity goes through the manager, who passes it through a <b>line of assistants</b> — security, scheduling, a photographer — each doing something before and after, then finally to the celebrity. But when the celebrity calls <b>themselves</b> ("note to self: sign this"), no manager is involved, so no assistant sees it. That is the self-invocation pitfall in one sentence.</p>`,
    explain: `<p>Spring AOP is <b>proxy-based</b>: no bytecode of your class is changed (that would be AspectJ weaving). Everything happens in a BeanPostProcessor.</p>
<h4>1. Who creates proxies?</h4>
<p>${C('@EnableAspectJAutoProxy')} (switched on automatically by Boot's ${C('AopAutoConfiguration')}) registers ${C('AnnotationAwareAspectJAutoProxyCreator')}, a subclass of ${C('AbstractAutoProxyCreator')}. In ${C('postProcessAfterInitialization')} it calls ${C('wrapIfNecessary')}: find all <b>Advisors</b> that apply to this bean's class; if there are any, build a proxy with ${C('ProxyFactory')} and return it instead of the bean.</p>
<h4>2. Advisors = pointcut + advice</h4>
<ul><li>Each ${C('@Aspect')} method (${C('@Around')}, ${C('@Before')}, …) becomes an ${C('Advisor')}: an AspectJ pointcut plus an advice adapted to a ${C('MethodInterceptor')}.</li>
<li>Infrastructure features are advisors too: ${C('BeanFactoryTransactionAttributeSourceAdvisor')} (pointcut "has @Transactional", advice ${C('TransactionInterceptor')}), the caching advisor, method security. One proxy holds them all — there is never a proxy per feature.</li></ul>
<h4>3. The call path</h4>
<p>On each proxied call, the proxy asks the ${C('AdvisedSupport')} for the interceptor chain that matches <b>this method</b> (cached per method), wraps it in a ${C('ReflectiveMethodInvocation')} (JDK) or ${C('CglibMethodInvocation')} and calls ${C('proceed()')}. Each interceptor calls ${C('proceed()')} to go to the next; the last ${C('proceed()')} invokes the target by reflection. If the chain is empty the proxy calls the target directly.</p>
<h4>4. JDK dynamic proxy vs CGLIB</h4>
<ul><li><b>JDK</b> (${C('java.lang.reflect.Proxy')}): implements the bean's interfaces; only interface methods exist on the proxy; injecting the concrete class type fails ("is not of required type").</li>
<li><b>CGLIB</b>: generates a subclass; works without interfaces; cannot advise ${C('final')}, ${C('static')} or ${C('private')} methods, and cannot proxy ${C('final')} classes. Spring uses Objenesis, so your constructor is not called a second time.</li>
<li>${C('DefaultAopProxyFactory')} picks CGLIB if ${C('proxyTargetClass')} is true or the class has no user interfaces. <b>Spring Boot sets ${C('spring.aop.proxy-target-class=true')} by default</b>, so in Boot apps you almost always get CGLIB, even with interfaces.</li></ul>
<h4>5. Self-invocation</h4>
<p>Inside the target, ${C('this.validate()')} is a plain Java call on the <b>target</b>, not on the proxy, so no advice runs — no transaction, no cache, no ${C('@Async')}, no security check. The same holds for CGLIB: the proxy delegates to a <b>separate</b> target instance, it does not call ${C('super')}.</p>`,
    clues: [
      'An annotation works when called from another bean but not from the same class → self-invocation; the call never reached the proxy.',
      '"Bean named x is expected to be of type FooImpl but was actually of type jdk.proxy2.$Proxy53" → JDK proxy; inject the interface or use CGLIB.',
      'Advice silently ignored on a final or private method → CGLIB cannot override it.',
      'Several aspects on one method in surprising order → order them with @Order on the aspect class (lower = outer).'
    ],
    code: [{ lang: 'java', check: false, title: 'An aspect and what the proxy does with it (Spring 6)', code: `@Aspect @Component @Order(1)            // lower order = outer interceptor
class TimingAspect {
    @Around("@annotation(com.acme.Timed)")
    Object time(ProceedingJoinPoint pjp) throws Throwable {
        long t0 = System.nanoTime();
        try { return pjp.proceed(); }      // next interceptor, or the target
        finally { log.info("{} took {} us", pjp.getSignature(), (System.nanoTime() - t0) / 1000); }
    }
}

// Building a proxy by hand: exactly what the auto-proxy creator does
ProxyFactory pf = new ProxyFactory(new OrderServiceImpl());
pf.setProxyTargetClass(true);                                // CGLIB (Boot's default)
pf.addAdvice((MethodInterceptor) inv -> {                     // org.aopalliance.intercept
    System.out.println("before " + inv.getMethod().getName());
    return inv.proceed();
});
OrderService proxy = (OrderService) pf.getProxy();
System.out.println(AopUtils.isCglibProxy(proxy));             // true` }, { lang: 'java', title: 'Interceptor chain on a JDK proxy, with the self-invocation bypass (plain Java, runs)', run: true, code: `import java.lang.reflect.*;
import java.util.*;

public class ChainDemo {
    interface Shop { String order(String item); String validate(String item); }
    static class ShopImpl implements Shop {
        public String order(String item) { return "ordered " + this.validate(item); }  // self-call
        public String validate(String item) { return item.toUpperCase(); }
    }
    interface Interceptor { Object invoke(Invocation inv) throws Throwable; }
    static class Invocation {
        final Object target; final Method method; final Object[] args; final List<Interceptor> chain; int i = -1;
        Invocation(Object t, Method m, Object[] a, List<Interceptor> c) { target = t; method = m; args = a; chain = c; }
        Object proceed() throws Throwable {
            if (++i == chain.size()) return method.invoke(target, args);   // end of chain: the target
            return chain.get(i).invoke(this);
        }
    }

    public static void main(String[] args) {
        List<String> log = new ArrayList<>();
        List<Interceptor> chain = List.of(
            inv -> { log.add("tx>" + inv.method.getName()); Object r = inv.proceed(); log.add("tx<"); return r; },
            inv -> { log.add("log>" + inv.method.getName()); return inv.proceed(); });
        Shop target = new ShopImpl();
        Shop proxy = (Shop) Proxy.newProxyInstance(Shop.class.getClassLoader(), new Class<?>[] { Shop.class },
            (p, m, a) -> new Invocation(target, m, a, chain).proceed());
        System.out.println(proxy.order("pen") + "  " + log);   // validate() is NOT in the log
        log.clear();
        System.out.println(proxy.validate("pen") + "  " + log);
    }
}` }],
    codeTitle: ['An aspect and what the proxy does with it (Spring 6)', 'Interceptor chain on a JDK proxy, with the self-invocation bypass (plain Java, runs)'],
    viz: [{
      title: 'proxy.order() → chain → target → this.validate()',
      gen: function () {
        var nodes = [box('C', 'Caller (another bean)', 8, 30, 18), box('P', 'Proxy (CGLIB)', 30, 30, 16), box('TX', 'TransactionInterceptor', 52, 12, 22), box('AS', 'TimingAspect (@Around)', 52, 48, 22), box('T', 'Target OrderService', 80, 30, 20), box('V', 'validate()', 80, 58, 14)];
        var edges = [['C', 'P', 'order()'], ['P', 'TX', '1'], ['TX', 'AS', 'proceed'], ['AS', 'T', 'proceed'], ['T', 'V', 'this.validate()']];
        function g(hl, ehl, tags) { return { type: 'graph', label: 'Runtime objects', directed: true, height: 66, nodes: nodes, edges: edges, hl: hl, ehl: ehl || {}, tags: tags || {} }; }
        function st(items) { return { type: 'stack', label: 'Call stack (top = current)', items: items }; }
        return [
          { narr: 'The caller holds the <b>proxy</b>, injected because the auto-proxy creator replaced the bean in <code>postProcessAfterInitialization</code>.', parts: [g({ C: 'cur', P: 'ok' }, { 'C-P': 'cur' }), st(['caller.checkout()', 'proxy.order()'])] },
          { narr: 'The proxy looks up the cached interceptor chain for <code>order()</code>: advisors are sorted by order — here the transaction advisor first (outer), then the timing aspect.', parts: [g({ P: 'cur', TX: 'win', AS: 'win' }, {}, { P: 'chain = [tx, timing]' }), st(['caller.checkout()', 'proxy.order()', 'ReflectiveMethodInvocation.proceed()'])] },
          { narr: 'Interceptor 1, <code>TransactionInterceptor</code>, begins a transaction and calls <code>proceed()</code>.', parts: [g({ TX: 'cur' }, { 'P-TX': 'cur' }, { TX: 'BEGIN' }), st(['proxy.order()', 'TransactionInterceptor.invoke', 'proceed()'])] },
          { narr: 'Interceptor 2, the <code>@Around</code> advice, starts a timer and calls <code>pjp.proceed()</code>.', parts: [g({ AS: 'cur' }, { 'TX-AS': 'cur' }, { TX: 'BEGIN' }), st(['TransactionInterceptor.invoke', 'TimingAspect.time', 'proceed()'])] },
          { narr: 'End of chain: the invocation calls the <b>target</b> method by reflection. Inside, the code calls <code>this.validate()</code>.', parts: [g({ T: 'cur' }, { 'AS-T': 'cur' }), st(['TimingAspect.time', 'target.order()'])] },
          { narr: '<code>this</code> is the target, not the proxy. <code>validate()</code> runs with <span class="c-r">no advice</span>: its own <code>@Transactional(propagation = REQUIRES_NEW)</code>, <code>@Cacheable</code> or <code>@PreAuthorize</code> is silently ignored.', parts: [g({ T: 'cur', V: 'bad' }, { 'T-V': 'bad' }, { V: 'not intercepted' }), st(['target.order()', 'target.validate()'])] },
          { narr: 'Returning unwinds the chain: the timer logs, the transaction commits, the proxy returns to the caller. To advise <code>validate()</code>, the call must come <b>through the proxy</b>: move it to another bean, inject self (<code>@Lazy</code>/<code>ObjectProvider</code>), or use AspectJ weaving.', parts: [g({ C: 'ok', P: 'ok', TX: 'ok', AS: 'ok', T: 'done' }, {}, { TX: 'COMMIT' }), st(['caller.checkout()'])] }
        ];
      }
    }],
    examples: [
      { title: 'Advice order inside one aspect', html: `<p>Since Spring 5.3, advice in the <b>same</b> aspect has the precedence ${C('@Around')}, ${C('@Before')}, ${C('@After')}, ${C('@AfterReturning')}, ${C('@AfterThrowing')} (outermost first). Effect: ${C('@After')} (like finally) runs <b>after</b> ${C('@AfterReturning')}/${C('@AfterThrowing')} of the same aspect. Between aspects, the one with the lower ${C('@Order')} is outer: its "before" part runs first and its "after" part runs last.</p>` },
      { title: 'Transaction outside or inside a retry?', html: `<p>A ${C('@Retryable')} aspect and ${C('@Transactional')} on the same method: if the transaction interceptor is outer, all retries share one transaction, and a failed attempt marks it rollback-only — retry cannot help. You want retry <b>outside</b> the transaction (retry with a lower order value than the transaction advisor, which is ${C('Ordered.LOWEST_PRECEDENCE')} by default; set ${C('@EnableTransactionManagement(order = ...)')} if needed).</p>` },
      { title: 'Checking what you got', html: `<p>${C('AopUtils.isAopProxy(bean)')}, ${C('AopUtils.isCglibProxy(bean)')}, ${C('AopUtils.getTargetClass(bean)')}, and ${C('((Advised) bean).getAdvisors()')} show the proxy type and its advisor chain. ${C('AopTestUtils.getTargetObject(bean)')} unwraps it in tests.</p>`, code: { lang: 'java', check: false, code: `Object bean = ctx.getBean("orderService");
System.out.println(AopUtils.isCglibProxy(bean));            // true in Spring Boot
for (Advisor a : ((Advised) bean).getAdvisors()) System.out.println(a);` } },
      { title: 'Self-invocation fixes compared', html: `<ul><li><b>Split the bean</b> — cleanest; the call crosses a proxy.</li><li><b>Self-injection</b> — ${C('@Lazy @Autowired OrderService self;')} then ${C('self.validate()')}.</li><li>${C('AopContext.currentProxy()')} — needs ${C('exposeProxy = true')}; couples code to Spring AOP.</li><li><b>AspectJ compile/load-time weaving</b> — advice is woven into the class, so even self-calls and private methods are advised.</li><li>${C('TransactionTemplate')} — programmatic, no proxy needed.</li></ul>` }
    ],
    deepDive: `<p><b>Chain caching.</b> ${C('AdvisedSupport.getInterceptorsAndDynamicInterceptionAdvice')} caches the chain per ${C('Method')}. Pointcuts are first checked statically against the class (${C('ClassFilter')}) and method; only "dynamic" pointcuts (e.g. ${C('args(..)')} with runtime type checks) are evaluated per call — so prefer annotation and execution pointcuts.</p>
<p><b>Introductions and target sources.</b> Proxies can add interfaces (${C('@DeclareParents')}) and can delegate to a ${C('TargetSource')} other than a fixed object: ${C('HotSwappableTargetSource')}, pooling, and the lazy ${C('@Lazy')} injection proxy are all target sources — the same mechanism as scoped proxies.</p>
<p><b>CGLIB in Spring 6.</b> Spring repackages CGLIB as ${C('org.springframework.cglib')}; generated class names contain ${C('$$SpringCGLIB$$')}. For AOT/native images, proxy classes are generated at build time. Java 17+ strong encapsulation means CGLIB defines classes through ${C('MethodHandles.Lookup')} in the target's package, so package-private methods can be intercepted when class loaders match.</p>
<p><b>equals/hashCode/toString.</b> JDK proxies route these through the handler; Spring's ${C('JdkDynamicAopProxy')} implements equals as "same interfaces, advisors and target source". Never compare proxies with ${C('==')} against raw targets.</p>
<p><b>Spring AOP vs AspectJ.</b> Spring AOP: method execution join points on Spring beans only, runtime proxies. AspectJ: field access, constructors, static methods, any object, woven at compile/load time. Spring uses the AspectJ <i>pointcut language</i> without the AspectJ weaver.</p>`,
    aiEra: `<p><b>What AI changes:</b> writing aspects, pointcut expressions and custom annotations is now nearly free, and assistants know the self-invocation pitfall by heart when asked directly.</p>
<p><b>Where it goes wrong:</b> generated code frequently calls an annotated method from the same class (inside a loop, from ${C('@PostConstruct')}, from a private helper), or puts ${C('@Transactional')} on a private method; tests with mocked dependencies never notice. Assistants also over-use ${C('AopContext.currentProxy()')}.</p>
<p><b>What you still own:</b> reading code as call graphs that either cross a proxy or do not, knowing which features are proxy-based (transactions, caching, async, retry, security, validation), and choosing between Spring AOP and weaving when proxies are not enough.</p>`,
    problems: [{
      title: 'Build a Proxy-Based Interceptor Chain',
      level: 'Hard', tags: ['AOP', 'java.lang.reflect.Proxy', 'interceptor chain'], companies: ['Google', 'VMware', 'Oracle'],
      statement: `<p>Implement a mini ${C('ProxyFactory')}:</p>
<ul><li>${C('interface MethodInterceptorLite { Object invoke(InvocationLite inv) throws Throwable; }')}</li>
<li>${C('class InvocationLite')} with ${C('getMethod()')}, ${C('getArguments()')} (the live array: interceptors may change arguments), ${C('getThis()')} (the target) and ${C('proceed()')}: calls the next interceptor, or the target method when the chain is exhausted.</li>
<li>${C('class ProxyFactoryLite')} with ${C('static <T> T create(T target, Class<T> iface, List<MethodInterceptorLite> chain)')} returning a JDK dynamic proxy.</li></ul>
<p>Exceptions thrown by the target must reach the caller <b>unwrapped</b> (not as ${C('InvocationTargetException')} or ${C('UndeclaredThrowableException')}). An interceptor may skip ${C('proceed()')} and return its own value. Calls the target makes on ${C('this')} are, as in Spring, not intercepted.</p>`,
      constraints: `Chain length 0–10. Interceptors run in list order (index 0 is outermost).`,
      example: `<p>Target ${C('order(item)')} returns ${C('"ordered " + this.validate(item)')}. With chain [A, B] where each logs ${C('"X>method"')} before and ${C('"X<"')} after: ${C('proxy.order("pen")')} → ${H.c('g', '"ordered pen"')} with log ${C('[A>order, B>order, B<, A<]')} — ${C('validate')} never appears.</p>`,
      brute: { why: `<p>Hand-writing a decorator class per interface works for one interface but duplicates every method and every cross-cutting concern; it does not scale to "all beans with @Transactional". A dynamic proxy writes the decorator at run time.</p>`, code: `
interface Greeter { String greet(String n); }
class LoggingGreeter implements Greeter {          // one hand-written decorator per interface
    private final Greeter target;
    LoggingGreeter(Greeter target) { this.target = target; }
    public String greet(String n) { System.out.println("before greet"); return target.greet(n); }
}` },
      mcq: { q: 'Inside <code>InvocationHandler.invoke</code> you call <code>method.invoke(target, args)</code> and the target throws <code>IllegalArgumentException</code>. What reaches the caller if you do nothing special?', options: ['UndeclaredThrowableException wrapping InvocationTargetException… unless you unwrap and rethrow getCause()', 'IllegalArgumentException directly', 'Nothing — the proxy swallows it', 'A NullPointerException'], answer: 0, explain: 'Reflection wraps target exceptions in InvocationTargetException (checked); a proxy throwing an undeclared checked exception wraps it again. Spring\'s AopUtils.invokeJoinpointUsingReflection unwraps it.' },
      hints: [`<p>Hint 1: ${C('InvocationLite')} keeps an index into the chain. ${C('proceed()')} increments it: past the end → invoke the target; otherwise call ${C('chain.get(i).invoke(this)')}.</p>`, `<p>Hint 2: In the target call, catch ${C('InvocationTargetException')} and ${C('throw e.getCause()')}. The ${C('InvocationHandler')} may throw ${C('Throwable')}, so an unchecked cause reaches the caller as itself.</p>`, `<p>Hint 3: Create a <b>new</b> ${C('InvocationLite')} per call (the index is per-call state). Pass ${C('args == null ? new Object[0] : args')} for no-arg methods, and use ${C('iface.cast(Proxy.newProxyInstance(iface.getClassLoader(), new Class<?>[]{iface}, handler))')}.</p>`],
      tests: { sig: 'string -> string', fn: 'chk', harness: { java: `
interface Shop { String order(String item); String validate(String item); }
class ShopImpl implements Shop {
  int targetCalls = 0;
  public String order(String item) { targetCalls++; return "ordered " + this.validate(item); }
  public String validate(String item) { targetCalls++; if (item.isEmpty()) throw new IllegalArgumentException("empty"); return item; }
}
class Check {
  static MethodInterceptorLite tag(String n, List<String> log) {
    return inv -> { log.add(n + ">" + inv.getMethod().getName()); Object r = inv.proceed(); log.add(n + "<"); return r; };
  }
  static String chk(String kind) {
    List<String> log = new ArrayList<>();
    ShopImpl target = new ShopImpl();
    List<MethodInterceptorLite> chain = new ArrayList<>();
    if (!kind.equals("empty") && !kind.equals("args")) { chain.add(tag("A", log)); }
    if (kind.equals("order") || kind.equals("validate") || kind.equals("exception")) chain.add(tag("B", log));
    if (kind.equals("shortCircuit")) chain.add(inv -> inv.getMethod().getName().equals("validate") ? "cached" : inv.proceed());
    if (kind.equals("args")) chain.add(inv -> { inv.getArguments()[0] = ((String) inv.getArguments()[0]).toUpperCase(); return inv.proceed(); });
    if (kind.equals("this")) chain.add(inv -> { log.add(String.valueOf(inv.getThis() == target)); return inv.proceed(); });
    Shop proxy = ProxyFactoryLite.create(target, Shop.class, chain);
    try {
      switch (kind) {
        case "validate": case "shortCircuit": return proxy.validate("pen") + " " + log + " calls=" + target.targetCalls;
        case "exception": return proxy.validate("") + " " + log;
        case "isProxy": return String.valueOf(java.lang.reflect.Proxy.isProxyClass(proxy.getClass()) && proxy != (Object) target);
        default: return proxy.order("pen") + " " + log + " calls=" + target.targetCalls;
      }
    } catch (IllegalArgumentException e) {
      return "IllegalArgumentException " + e.getMessage() + " " + log;
    } catch (Throwable t) {
      return "wrong exception type " + t.getClass().getSimpleName();
    }
  }
}` }, cases: [
        [['order'], 'ordered pen [A>order, B>order, B<, A<] calls=2'],
        [['validate'], 'pen [A>validate, B>validate, B<, A<] calls=1'],
        [['empty'], 'ordered pen [] calls=2'],
        [['exception'], 'IllegalArgumentException empty [A>validate, B>validate]'],
        [['shortCircuit'], 'cached [A>validate, A<] calls=0'],
        [['args'], 'ordered PEN [] calls=2'],
        [['this'], 'ordered pen [A>order, true, A<] calls=2'],
        [['isProxy'], 'true']
      ] },
      solution: {
        approach: `<p>Mirror Spring's ${C('JdkDynamicAopProxy')} + ${C('ReflectiveMethodInvocation')}: the ${C('InvocationHandler')} builds a fresh invocation object per call holding target, method, arguments, the chain and a cursor. ${C('proceed()')} advances the cursor; at the end it reflectively calls the target and unwraps ${C('InvocationTargetException')}. Because the target's own ${C('this.validate()')} is a direct Java call, it bypasses the handler — the self-invocation pitfall falls out naturally.</p>`,
        code: `
import java.lang.reflect.*;

interface MethodInterceptorLite {
    Object invoke(InvocationLite inv) throws Throwable;
}

class InvocationLite {
    private final Object target;
    private final Method method;
    private final Object[] args;
    private final List<MethodInterceptorLite> chain;
    private int index = -1;                                  // per-call cursor into the chain

    InvocationLite(Object target, Method method, Object[] args, List<MethodInterceptorLite> chain) {
        this.target = target; this.method = method; this.args = args; this.chain = chain;
    }
    Method getMethod() { return method; }
    Object[] getArguments() { return args; }                 // live array: interceptors may change it
    Object getThis() { return target; }

    Object proceed() throws Throwable {
        if (++index == chain.size()) {                       // end of chain: call the target
            try {
                return method.invoke(target, args);
            } catch (InvocationTargetException e) {
                throw e.getCause();                          // rethrow what the target threw
            }
        }
        return chain.get(index).invoke(this);                // next interceptor decides whether to proceed
    }
}

class ProxyFactoryLite {
    static <T> T create(T target, Class<T> iface, List<MethodInterceptorLite> chain) {
        List<MethodInterceptorLite> frozen = List.copyOf(chain);
        InvocationHandler handler = (proxy, method, args) ->
                new InvocationLite(target, method, args == null ? new Object[0] : args, frozen).proceed();
        return iface.cast(Proxy.newProxyInstance(iface.getClassLoader(), new Class<?>[] { iface }, handler));
    }
}`,
        dry: { head: ['call', 'index', 'action', 'log'], rows: [
          ['proxy.order("pen")', '-1 → 0', 'A logs, proceed', 'A>order'],
          ['', '0 → 1', 'B logs, proceed', 'A>order, B>order'],
          ['', '1 → 2 = size', 'target.order → this.validate (direct)', 'unchanged'],
          ['return', '', 'B logs, then A logs', H.c('g', 'A>order, B>order, B<, A<')],
          ['proxy.validate("")', '…', 'target throws, unwrapped', H.c('r', 'IllegalArgumentException; no "<" entries')]
        ] },
        complexity: `<p>O(k) per call for a chain of k interceptors plus one reflective call. Spring additionally caches the matching chain per Method so pointcut matching is not repeated.</p>`,
        followUps: ['How would you add a pointcut so an interceptor applies only to some methods?', 'What changes for a CGLIB proxy, and why is self-invocation still not intercepted?', 'How does Spring expose the current proxy (exposeProxy) and what does it cost?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 6 — @Transactional internals
     ====================================================================== */
  topics.push({
    title: '@Transactional Internals: TransactionInterceptor, Thread-Bound Resources & Rollback-Only',
    analogy: `<p>A shared shopping trolley in a supermarket: the first family member to start shopping takes a trolley (begins the transaction) and everyone who joins later puts items in the <b>same</b> trolley (REQUIRED). If anyone shouts "<i>this is wrong, put it all back!</i>" the trolley gets a red tag (rollback-only); even if the leader later walks to the till happily, the cashier sees the tag and refuses (UnexpectedRollbackException). A family member who says "<i>I pay separately</i>" (REQUIRES_NEW) parks the shared trolley, takes a new one, pays, and comes back to the parked trolley.</p>`,
    explain: `<p>be06 showed how to use ${C('@Transactional')} and its pitfalls. Now the machinery.</p>
<h4>1. The pieces</h4>
<ul><li>${C('TransactionInterceptor')} — the AOP advice (via ${C('BeanFactoryTransactionAttributeSourceAdvisor')}). Its ${C('invokeWithinTransaction')} is a template: get the ${C('TransactionAttribute')} for this method, call ${C('createTransactionIfNecessary')}, ${C('proceed()')}, then ${C('completeTransactionAfterThrowing')} or ${C('commitTransactionAfterReturning')}.</li>
<li>${C('TransactionAttributeSource')} — reads ${C('@Transactional')} (method first, then class, then interface) into propagation, isolation, timeout, readOnly and <b>rollback rules</b>.</li>
<li>${C('PlatformTransactionManager')} — ${C('DataSourceTransactionManager')}/${C('JdbcTransactionManager')}, ${C('JpaTransactionManager')}, ${C('JtaTransactionManager')}. ${C('AbstractPlatformTransactionManager.getTransaction')} implements the propagation rules once for all of them.</li>
<li>${C('TransactionSynchronizationManager')} — <b>ThreadLocal</b> maps binding the current resources to the thread: the ${C('ConnectionHolder')} for each DataSource (or the EntityManager), the transaction name, read-only flag and the list of ${C('TransactionSynchronization')} callbacks.</li></ul>
<h4>2. Why it "just works" for JdbcTemplate and JPA repositories</h4>
<p>On begin, the manager takes a connection from the pool, sets ${C('autoCommit=false')} and binds it to the thread under the DataSource key. ${C('JdbcTemplate')} calls ${C('DataSourceUtils.getConnection(ds)')}, which first looks in the ThreadLocal — so every DAO call on that thread uses the <b>same connection</b> without passing it around. That is also why a transaction does <b>not</b> follow your work onto another thread (${C('@Async')}, ${C('parallelStream')}, ${C('CompletableFuture')}).</p>
<h4>3. Propagation in the manager</h4>
<ul><li>No existing tx: REQUIRED, REQUIRES_NEW, NESTED start one; SUPPORTS, NOT_SUPPORTED, NEVER run without; MANDATORY throws ${C('IllegalTransactionStateException')}.</li>
<li>Existing tx: REQUIRED/SUPPORTS/MANDATORY <b>participate</b>; REQUIRES_NEW <b>suspends</b> it (unbinds resources from the ThreadLocal into a ${C('SuspendedResourcesHolder')}) and starts a new physical tx on a <b>second connection</b>; NOT_SUPPORTED suspends and runs without; NEVER throws; NESTED creates a JDBC <b>savepoint</b> in the same connection.</li></ul>
<h4>4. Rollback-only and UnexpectedRollbackException</h4>
<p>When a <b>participating</b> method throws a rollback-triggering exception, the interceptor cannot roll back (it does not own the physical transaction), so it marks the shared transaction <b>rollback-only</b>. If the outer method catches the exception and returns normally, the commit sees the flag, rolls back, and throws ${C('UnexpectedRollbackException')} — "Transaction silently rolled back because it has been marked as rollback-only". A failing NESTED method instead rolls back to its savepoint and leaves the outer transaction healthy.</p>
<h4>5. Rollback rules</h4>
<p>By default only ${C('RuntimeException')} and ${C('Error')} roll back; checked exceptions <b>commit</b>. ${C('rollbackFor')}/${C('noRollbackFor')} add rules; the matching rule closest to the thrown type in the class hierarchy wins.</p>`,
    clues: [
      '"Transaction silently rolled back because it has been marked as rollback-only" → an inner REQUIRED method threw and someone caught it.',
      'Data saved even though the method threw → the exception was checked (default: commit) or the call bypassed the proxy.',
      'REQUIRES_NEW under load causes pool exhaustion / deadlock → each thread holds two connections at once.',
      'Transaction missing in @Async or parallel code → resources are bound to a ThreadLocal of the original thread.'
    ],
    code: [{ lang: 'java', check: false, title: 'What the interceptor does, condensed from TransactionAspectSupport (Spring 6)', code: `protected Object invokeWithinTransaction(Method method, Class<?> targetClass, InvocationCallback invocation) throws Throwable {
    TransactionAttribute txAttr = getTransactionAttributeSource().getTransactionAttribute(method, targetClass);
    PlatformTransactionManager tm = determineTransactionManager(txAttr);
    TransactionInfo txInfo = createTransactionIfNecessary(tm, txAttr, methodIdentification(method, targetClass));
    Object retVal;
    try {
        retVal = invocation.proceedWithInvocation();          // next interceptor or the target
    } catch (Throwable ex) {
        completeTransactionAfterThrowing(txInfo, ex);         // txAttr.rollbackOn(ex) ? rollback : commit
        throw ex;
    } finally {
        cleanupTransactionInfo(txInfo);                       // restore the outer TransactionInfo
    }
    commitTransactionAfterReturning(txInfo);                  // may throw UnexpectedRollbackException
    return retVal;
}

// Programmatic equivalent - no proxy, no self-invocation problem
transactionTemplate.executeWithoutResult(status -> {
    orderRepo.save(order);
    if (fraud) status.setRollbackOnly();
});` }, { lang: 'java', title: 'Thread-bound connection: why DAOs share one connection (plain Java, runs)', run: true, code: `import java.util.*;

public class ThreadBound {
    static int nextConn = 1;
    static final ThreadLocal<Integer> BOUND = new ThreadLocal<>();      // TransactionSynchronizationManager

    static int getConnection() {                                      // DataSourceUtils.getConnection
        Integer c = BOUND.get();
        return c != null ? c : nextConn++;                             // no tx: a fresh pooled connection
    }
    static void inTransaction(Runnable work) {
        BOUND.set(nextConn++);
        System.out.println("begin on conn#" + BOUND.get());
        try { work.run(); System.out.println("commit conn#" + BOUND.get()); }
        finally { BOUND.remove(); }
    }

    public static void main(String[] args) throws Exception {
        inTransaction(() -> {
            System.out.println("  orderDao uses conn#" + getConnection());
            System.out.println("  stockDao uses conn#" + getConnection());
            Thread t = new Thread(() -> System.out.println("  async thread uses conn#" + getConnection() + " (NOT in the tx)"));
            t.start();
            try { t.join(); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        });
    }
}` }],
    codeTitle: ['What the interceptor does, condensed from TransactionAspectSupport (Spring 6)', 'Thread-bound connection: why DAOs share one connection (plain Java, runs)'],
    viz: [{
      title: 'REQUIRED inner failure caught by the outer method',
      gen: function () {
        var code = '@Transactional\nvoid placeOrder() {\n  orders.save(o);\n  try {\n    audit.record(o);   // @Transactional (REQUIRED), throws\n  } catch (RuntimeException e) { }\n  stock.reserve(o);\n}   // commit?';
        function f(narr, hl, vals, vh, stack) {
          return { narr: narr, parts: [
            { type: 'code', label: 'OrderService', lang: 'java', code: code, hl: hl },
            { type: 'vars', label: 'TransactionSynchronizationManager (this thread)', vals: vals, hl: vh || {} },
            { type: 'stack', label: 'TransactionInfo stack', items: stack }
          ] };
        }
        return [
          f('The proxy\'s <code>TransactionInterceptor</code> finds REQUIRED and no transaction bound → <b>begin</b>: take conn#7, <code>setAutoCommit(false)</code>, bind it to the thread.', { 1: 'cur', 2: 'cur' }, { connection: 'conn#7', rollbackOnly: false, newTransaction: true }, { connection: 'ok' }, ['placeOrder: NEW tx']),
          f('<code>orders.save</code> uses the bound conn#7 — no connection is passed around.', { 3: 'cur' }, { connection: 'conn#7', rollbackOnly: false, writes: 'order' }, {}, ['placeOrder: NEW tx']),
          f('<code>audit.record</code> goes through <b>another proxy</b>: REQUIRED and a transaction exists → <b>participate</b> (newTransaction=false). Same connection.', { 5: 'cur' }, { connection: 'conn#7', rollbackOnly: false, writes: 'order, audit' }, {}, ['placeOrder: NEW tx', 'record: participating']),
          f('<code>record</code> throws a RuntimeException. Its interceptor does not own the physical tx, so it cannot roll back; it calls <code>setRollbackOnly()</code> on the shared transaction and rethrows.', { 5: 'bad' }, { connection: 'conn#7', rollbackOnly: true, writes: 'order, audit' }, { rollbackOnly: 'bad' }, ['placeOrder: NEW tx']),
          f('<code>placeOrder</code> catches and swallows the exception and carries on — it thinks all is well.', { 6: 'cur', 7: 'cur' }, { connection: 'conn#7', rollbackOnly: true, writes: 'order, audit, stock' }, { rollbackOnly: 'bad' }, ['placeOrder: NEW tx']),
          f('The outer interceptor calls <code>commit</code>. The manager sees the rollback-only flag → <b>rolls back everything</b> and throws <span class="c-r">UnexpectedRollbackException</span> to the caller.', { 8: 'bad' }, { connection: 'conn#7', rollbackOnly: true, result: 'ROLLBACK + UnexpectedRollbackException' }, { result: 'bad' }, []),
          f('Fixes: let the exception propagate (if the whole order should fail), make <code>record</code> REQUIRES_NEW (audit independent; uses a second connection), or NESTED (savepoint: audit rolls back alone) — or do not make <code>record</code> transactional and validate before writing.', {}, { REQUIRES_NEW: 'own tx, conn#8', NESTED: 'savepoint on conn#7' }, {}, [])
        ];
      }
    }],
    examples: [
      { title: 'readOnly is a hint, not a lock', html: `<p>${C('@Transactional(readOnly = true)')} calls ${C('Connection.setReadOnly(true)')} (drivers may route to a replica or optimise), and with JPA sets Hibernate's flush mode to MANUAL so dirty checking is skipped — a real speed-up for big reads. It does <b>not</b> prevent an explicit ${C('UPDATE')} in every database.</p>` },
      { title: 'Work after commit', html: `<p>Sending an email inside the transaction risks "email sent, then rollback". Register a synchronization (or use ${C('@TransactionalEventListener')}, next topic):</p>`, code: { lang: 'java', check: false, code: `TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
    @Override public void afterCommit() { mailer.sendConfirmation(orderId); }
});` } },
      { title: 'Two transaction managers', html: `<p>With two DataSources you have two managers; ${C('@Transactional("ordersTx")')} picks one by qualifier. A method touching both databases is <b>not</b> atomic across them unless you use JTA/XA or an outbox pattern — ${C('ChainedTransactionManager')} is deprecated because it only gives "best effort".</p>` },
      { title: 'Timeout', html: `<p>${C('@Transactional(timeout = 5)')} sets a deadline: ${C('JdbcTemplate')} applies the remaining time as the JDBC query timeout of each statement, and the commit fails if the deadline passed. It does not interrupt Java code that is busy outside the database.</p>` }
    ],
    deepDive: `<p><b>getTransaction step by step.</b> ${C('doGetTransaction()')} reads the ThreadLocal; ${C('isExistingTransaction')} checks whether a connection holder is bound and active; then ${C('handleExistingTransaction')} or ${C('startTransaction')}. The returned ${C('DefaultTransactionStatus')} records ${C('newTransaction')}, ${C('newSynchronization')}, a savepoint, and the ${C('suspendedResources')} to restore in ${C('cleanupAfterCompletion')}.</p>
<p><b>globalRollbackOnParticipationFailure</b> (default true) is what turns a participating failure into "mark the whole transaction rollback-only". Setting it false lets the outer method decide, at the cost of possibly committing half-done work.</p>
<p><b>Synchronization callbacks.</b> On commit: ${C('beforeCommit(readOnly)')} (JPA flushes here), ${C('beforeCompletion')}, the physical commit, ${C('afterCommit')}, ${C('afterCompletion(STATUS_COMMITTED)')}. Exceptions thrown in ${C('afterCommit')} propagate to the caller although the data is already committed.</p>
<p><b>JPA specifics.</b> ${C('JpaTransactionManager')} binds an ${C('EntityManagerHolder')} and also exposes the JDBC connection, so JdbcTemplate and JPA can share one transaction. Isolation levels other than default need a ${C('JpaDialect')} that supports them (Hibernate's does).</p>
<p><b>Reactive and virtual threads.</b> ${C('ReactiveTransactionManager')} stores the context in the Reactor ${C('Context')}, not a ThreadLocal. Virtual threads keep ThreadLocal semantics per virtual thread, so imperative transactions work unchanged — but pinning and pool sizing still matter.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants instantly recognise ${C('UnexpectedRollbackException')} and explain rollback-only; they can also generate ${C('TransactionTemplate')} code.</p>
<p><b>Where it goes wrong:</b> a common suggestion is "add REQUIRES_NEW" to every helper, which doubles connection use and can deadlock a small pool under load, or "catch the exception" which produces exactly the rollback-only surprise. Generated code often expects transactions to cover ${C('@Async')} or ${C('parallelStream')} work.</p>
<p><b>What you still own:</b> deciding the <b>transaction boundary</b> (which business step must be atomic), predicting which connection and thread each call uses, and choosing REQUIRED vs REQUIRES_NEW vs NESTED from the failure semantics you want.</p>`,
    problems: [{
      title: 'Simulate REQUIRED, REQUIRES_NEW and Rollback-Only',
      level: 'Hard', tags: ['@Transactional', 'propagation', 'simulation', 'recursion'], companies: ['Goldman Sachs', 'PayPal', 'Amazon'],
      statement: `<p>Simulate Spring's transaction manager for a call tree written as tokens separated by spaces:</p>
<ul><li>${C('w:X')} — write X: inside a transaction it is buffered; with none, log ${C('"autocommit X"')}.</li>
<li>${C('throw')} — throw a RuntimeException from the current method.</li>
<li>${C('PROP { ... }')} — call a ${C('@Transactional(propagation = PROP)')} method on another bean whose body is inside the braces; PROP is ${C('REQUIRED')} or ${C('REQUIRES_NEW')}.</li>
<li>${C('try PROP { ... }')} — the same call wrapped in a try/catch that swallows any exception and logs ${C('"caught <ExceptionName>"')}.</li></ul>
<p>The script is the body of a non-transactional caller. Rules and log lines:</p>
<ul><li>New physical tx: ${C('"begin Tn"')} (n = 1, 2, … in creation order). REQUIRED with an active tx logs ${C('"join Tn"')}.</li>
<li>REQUIRES_NEW with an active tx logs ${C('"suspend Tn"')} before begin and ${C('"resume Tn"')} after completing the new one.</li>
<li>When a method that began a tx ends: by exception → ${C('"rollback Tn"')}; normally but marked rollback-only → ${C('"rollback Tn (rollback-only)"')} and it throws ${C('UnexpectedRollbackException')}; otherwise ${C('"commit Tn [writes]"')} (Java ${C('List.toString')}).</li>
<li>A participating method that ends by exception logs ${C('"mark rollback-only Tn"')} and the exception continues.</li>
<li>A statement that throws skips the rest of its body. Finish with ${C('"result ok"')} or ${C('"result <ExceptionName>"')} for an exception escaping the script.</li></ul>`,
      constraints: `Script ≤ 200 tokens, well-formed braces, nesting ≤ 20.`,
      example: `<p>${C('REQUIRED { w:a try REQUIRED { w:b throw } w:c }')} → ${H.c('r', C('[begin T1, join T1, mark rollback-only T1, caught RuntimeException, rollback T1 (rollback-only), result UnexpectedRollbackException]'))}. The inner failure poisoned the shared transaction even though it was caught.</p>`,
      brute: { why: `<p>Treating each annotated method as its own transaction (begin/commit per method) gets REQUIRES_NEW right but REQUIRED wrong: inner work would commit independently and the rollback-only surprise disappears. Participation is the whole point.</p>`, code: `
class TxPerMethod {
    static List<String> run(List<String> methods) {
        List<String> log = new ArrayList<>();
        int n = 0;
        for (String m : methods) { n++; log.add("begin T" + n); log.add("commit T" + n); }   // ignores joining
        return log;
    }
}` },
      mcq: { q: 'Outer REQUIRED calls inner REQUIRES_NEW, which throws; outer catches it and returns normally. What happens to the outer transaction?', options: ['It commits; the inner new transaction was rolled back on its own and the outer was only suspended', 'It is marked rollback-only and fails with UnexpectedRollbackException', 'Both roll back', 'Both commit'], answer: 0, explain: 'REQUIRES_NEW runs a separate physical transaction; its failure rolls back only itself. Rollback-only marking applies to participating (joined) methods.' },
      hints: [`<p>Hint 1: Parse the tokens into a tree first (statements: write, throw, call with propagation, caught flag and child body). Executing a tree recursively is much easier than executing tokens.</p>`, `<p>Hint 2: Keep a field ${C('current')} (the ThreadLocal stand-in). ${C('exec(body)')} returns the exception name or null, stopping at the first statement that throws.</p>`, `<p>Hint 3: In ${C('call')}: REQUIRED with ${C('current != null')} → log join, run, on exception mark rollback-only. Otherwise remember ${C('outer = current')}, log suspend if outer exists, create Tn, set current, run, restore ${C('current = outer')}, log rollback/commit (check the rollback-only flag on a normal end), then resume.</p>`],
      tests: { sig: 'string -> list<string>', fn: 'run', cases: [
        [['REQUIRED { w:a w:b }'], ['begin T1', 'commit T1 [a, b]', 'result ok']],
        [['w:x REQUIRED { w:a throw }'], ['autocommit x', 'begin T1', 'rollback T1', 'result RuntimeException']],
        [['REQUIRED { w:a try REQUIRED { w:b throw } w:c }'], ['begin T1', 'join T1', 'mark rollback-only T1', 'caught RuntimeException', 'rollback T1 (rollback-only)', 'result UnexpectedRollbackException']],
        [['REQUIRED { w:order try REQUIRES_NEW { w:audit throw } w:c }'], ['begin T1', 'suspend T1', 'begin T2', 'rollback T2', 'resume T1', 'caught RuntimeException', 'commit T1 [order, c]', 'result ok']],
        [['REQUIRED { w:order REQUIRES_NEW { w:audit } throw }'], ['begin T1', 'suspend T1', 'begin T2', 'commit T2 [audit]', 'resume T1', 'rollback T1', 'result RuntimeException']],
        [[''], ['result ok']],
        [['w:a w:b'], ['autocommit a', 'autocommit b', 'result ok']],
        [['try REQUIRED { w:a throw } REQUIRED { w:b }'], ['begin T1', 'rollback T1', 'caught RuntimeException', 'begin T2', 'commit T2 [b]', 'result ok']],
        [['REQUIRES_NEW { w:a REQUIRES_NEW { w:b } }'], ['begin T1', 'suspend T1', 'begin T2', 'commit T2 [b]', 'resume T1', 'commit T1 [a]', 'result ok']],
        [['REQUIRED { w:a try REQUIRES_NEW { w:b try REQUIRED { throw } } }'], ['begin T1', 'suspend T1', 'begin T2', 'join T2', 'mark rollback-only T2', 'caught RuntimeException', 'rollback T2 (rollback-only)', 'resume T1', 'caught UnexpectedRollbackException', 'commit T1 [a]', 'result ok']],
        [['REQUIRED { }'], ['begin T1', 'commit T1 []', 'result ok']]
      ] },
      solution: {
        approach: `<p>Parse into a tree, then interpret it with a single ${C('current')} transaction reference playing the role of ${C('TransactionSynchronizationManager')}'s ThreadLocal. A participating failure flips the shared ${C('rollbackOnly')} flag; the owner checks that flag when it ends normally and converts it into ${C('UnexpectedRollbackException')}. Suspension is just remembering the outer transaction in a local variable and restoring it after completion.</p>`,
        code: `
class TxSimulator {
    static final class Tx {
        final int id; final List<String> writes = new ArrayList<>(); boolean rollbackOnly;
        Tx(int id) { this.id = id; }
    }
    static final class Node {
        final String kind, arg; final boolean caught; final List<Node> body;
        Node(String kind, String arg, boolean caught, List<Node> body) { this.kind = kind; this.arg = arg; this.caught = caught; this.body = body; }
    }

    private final List<String> log = new ArrayList<>();
    private Tx current;                         // stands in for the thread-bound transaction
    private int nextId = 1;
    private String[] tok;
    private int pos;

    static List<String> run(String script) {
        TxSimulator s = new TxSimulator();
        s.tok = script.isBlank() ? new String[0] : script.trim().split("\\\\s+");
        List<Node> program = s.parseBody();
        String ex = s.exec(program);
        s.log.add("result " + (ex == null ? "ok" : ex));
        return s.log;
    }

    private List<Node> parseBody() {
        List<Node> body = new ArrayList<>();
        while (pos < tok.length && !tok[pos].equals("}")) {
            String t = tok[pos++];
            if (t.startsWith("w:")) body.add(new Node("write", t.substring(2), false, null));
            else if (t.equals("throw")) body.add(new Node("throw", null, false, null));
            else {
                boolean caught = t.equals("try");
                String prop = caught ? tok[pos++] : t;
                pos++;                                         // skip "{"
                List<Node> inner = parseBody();
                pos++;                                         // skip "}"
                body.add(new Node("call", prop, caught, inner));
            }
        }
        return body;
    }

    private String exec(List<Node> body) {
        for (Node n : body) {
            String ex = null;
            if (n.kind.equals("write")) {
                if (current != null) current.writes.add(n.arg); else log.add("autocommit " + n.arg);
            } else if (n.kind.equals("throw")) {
                ex = "RuntimeException";
            } else {
                ex = call(n.arg, n.body);
                if (ex != null && n.caught) { log.add("caught " + ex); ex = null; }
            }
            if (ex != null) return ex;                         // skip the rest of this body
        }
        return null;
    }

    private String call(String prop, List<Node> body) {
        Tx outer = current;
        if (prop.equals("REQUIRED") && outer != null) {        // participate
            log.add("join T" + outer.id);
            String ex = exec(body);
            if (ex != null) { outer.rollbackOnly = true; log.add("mark rollback-only T" + outer.id); }
            return ex;
        }
        if (outer != null) log.add("suspend T" + outer.id);   // REQUIRES_NEW
        Tx tx = new Tx(nextId++);
        log.add("begin T" + tx.id);
        current = tx;
        String ex = exec(body);
        current = outer;
        if (ex != null) log.add("rollback T" + tx.id);
        else if (tx.rollbackOnly) { log.add("rollback T" + tx.id + " (rollback-only)"); ex = "UnexpectedRollbackException"; }
        else log.add("commit T" + tx.id + " " + tx.writes);
        if (outer != null) log.add("resume T" + outer.id);
        return ex;
    }
}`,
        dry: { head: ['statement', 'current', 'log line', 'flag'], rows: [
          ['REQUIRED {', 'none → T1', 'begin T1', ''],
          ['w:a', 'T1', '(buffered)', ''],
          ['try REQUIRED {', 'T1', 'join T1', ''],
          ['throw', 'T1', 'mark rollback-only T1', H.c('r', 'rollbackOnly = true')],
          ['(try)', 'T1', 'caught RuntimeException', ''],
          ['w:c, }', 'T1 → none', 'rollback T1 (rollback-only)', H.c('r', 'UnexpectedRollbackException')]
        ] },
        complexity: `<p>O(tokens) to parse and execute; recursion depth equals the nesting depth.</p>`,
        followUps: ['Add NESTED: how do savepoints change the outcome of the example?', 'What would change if globalRollbackOnParticipationFailure were false?', 'How many connections does a REQUIRES_NEW chain of depth 5 hold at once?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 7 — @Async and application events
     ====================================================================== */
  topics.push({
    title: '@Async & Application Events: Executors, Proxies and @TransactionalEventListener',
    analogy: `<p>A manager hands a task to an <b>assistant</b> and walks away (${'@Async'}): she gets a <b>ticket</b> (a future) to check the result later. If she does the task herself because she is the assistant too (self-invocation), she waits. An office <b>notice board</b> is the event system: posting a notice ("order placed") does not tell you who reads it. Some readers act immediately; others only act <b>after the deal is signed</b> — if the deal falls through, they never act. That is ${'@TransactionalEventListener'}.</p>`,
    explain: `<h4>1. How @Async works</h4>
<p>${C('@EnableAsync')} (Boot auto-configures the executor, but you still add the annotation) registers ${C('AsyncAnnotationBeanPostProcessor')}. In ${C('postProcessAfterInitialization')} it adds an ${C('AsyncAnnotationAdvisor')} to beans with ${C('@Async')} methods (to an existing proxy if there is one). The advice, ${C('AnnotationAsyncExecutionInterceptor')}, submits ${C('invocation.proceed()')} to a ${C('TaskExecutor')} and returns at once:</p>
<ul><li>${C('void')} → fire and forget; exceptions go to an ${C('AsyncUncaughtExceptionHandler')} (default: log them).</li>
<li>${C('CompletableFuture<T>')} / ${C('Future<T>')} → the caller gets a future completed by the worker; exceptions complete it exceptionally.</li>
<li>Any other return type → the call is still asynchronous and the caller gets ${C('null')}.</li></ul>
<p>Which executor? ${C('@Async("name")')} picks a bean by qualifier; otherwise an ${C('AsyncConfigurer')}, else a unique ${C('TaskExecutor')} bean or one named ${C('taskExecutor')}. Spring Boot auto-configures a ${C('ThreadPoolTaskExecutor')} (${C('spring.task.execution.*')}; 8 core threads, unbounded queue) — or a virtual-thread ${C('SimpleAsyncTaskExecutor')} with ${C('spring.threads.virtual.enabled=true')}. Because it is proxy-based, ${C('@Async')} has the same limits as other AOP: no effect on self-invocation or private methods. And thread-bound state does <b>not</b> travel: transaction, security context, request scope, MDC — unless you configure a ${C('TaskDecorator')}.</p>
<h4>2. How events work</h4>
<p>${C('publisher.publishEvent(e)')} → ${C('ApplicationEventMulticaster')} (by default ${C('SimpleApplicationEventMulticaster')}) finds listeners whose event type matches (generics included) and calls them <b>synchronously, on the publisher's thread, in ${C('@Order')} order</b>. ${C('@EventListener')} methods are adapted by ${C('EventListenerMethodProcessor')} into ${C('ApplicationListenerMethodAdapter')}s; a ${C('condition')} attribute filters with SpEL; returning a value publishes it as a new event. Because the call is synchronous, a listener that throws propagates the exception to the publisher, and a listener runs inside the publisher's transaction.</p>
<h4>3. @TransactionalEventListener</h4>
<p>Instead of running immediately, the listener registers a ${C('TransactionSynchronization')} on the current transaction and runs in the chosen phase: ${C('AFTER_COMMIT')} (default), ${C('AFTER_ROLLBACK')}, ${C('AFTER_COMPLETION')} or ${C('BEFORE_COMMIT')}. With <b>no</b> active transaction the event is <b>dropped</b> unless ${C('fallbackExecution = true')}. An AFTER_COMMIT listener runs after the commit, while the old transaction's resources are still bound, so a listener that wants to write must use ${C('REQUIRES_NEW')} (Spring 6.1 rejects a plain ${C('@Transactional')} on such a listener at start-up).</p>`,
    clues: [
      '@Async method still runs on the caller thread → self-invocation, missing @EnableAsync, or a private/final method.',
      'Exception in an @Async void method vanishes → it went to AsyncUncaughtExceptionHandler; return CompletableFuture or register a handler.',
      '"Event listener sends email even though the order rolled back" → use @TransactionalEventListener (AFTER_COMMIT), not @EventListener.',
      'Transactional listener never fires in a test or batch job → no transaction was active; set fallbackExecution = true or start one.'
    ],
    code: [{ lang: 'java', check: false, title: '@Async with a named executor, and after-commit events (Spring 6)', code: `@Configuration @EnableAsync
class AsyncConfig {
    @Bean(name = "mailExecutor")
    ThreadPoolTaskExecutor mailExecutor() {
        ThreadPoolTaskExecutor ex = new ThreadPoolTaskExecutor();
        ex.setCorePoolSize(4); ex.setMaxPoolSize(4); ex.setQueueCapacity(500);
        ex.setThreadNamePrefix("mail-");
        ex.setTaskDecorator(r -> { Map<String, String> mdc = MDC.getCopyOfContextMap();     // carry MDC across
                                   return () -> { if (mdc != null) MDC.setContextMap(mdc); try { r.run(); } finally { MDC.clear(); } }; });
        return ex;
    }
}

@Service
class OrderService {
    private final ApplicationEventPublisher events;
    OrderService(ApplicationEventPublisher events) { this.events = events; }
    @Transactional
    public void place(Order o) {
        repo.save(o);
        events.publishEvent(new OrderPlaced(o.id()));      // queued until commit
    }
}

@Component
class OrderMailer {
    @Async("mailExecutor")
    @TransactionalEventListener                           // AFTER_COMMIT by default
    public void on(OrderPlaced e) { mail.send(e.orderId()); }   // runs on mail-1..4, only if committed
}` }, { lang: 'java', title: 'A tiny event bus with after-commit delivery (plain Java, runs)', run: true, code: `import java.util.*;
import java.util.function.*;

public class AfterCommitBus {
    final Map<String, List<Consumer<String>>> immediate = new HashMap<>();
    final Map<String, List<Consumer<String>>> afterCommit = new HashMap<>();
    List<Runnable> pending;                          // non-null while a "transaction" is active

    void publish(String event) {
        immediate.getOrDefault(event, List.of()).forEach(l -> l.accept(event));    // synchronous, now
        for (Consumer<String> l : afterCommit.getOrDefault(event, List.of())) {
            if (pending != null) pending.add(() -> l.accept(event));               // wait for commit
            else System.out.println("  (no tx: after-commit listener skipped for " + event + ")");
        }
    }
    void inTransaction(Runnable work, boolean fail) {
        pending = new ArrayList<>();
        work.run();
        List<Runnable> toRun = pending; pending = null;
        if (fail) { System.out.println("rollback"); return; }
        System.out.println("commit");
        toRun.forEach(Runnable::run);
    }

    public static void main(String[] args) {
        AfterCommitBus bus = new AfterCommitBus();
        bus.immediate.computeIfAbsent("OrderPlaced", k -> new ArrayList<>()).add(e -> System.out.println("  audit sees " + e));
        bus.afterCommit.computeIfAbsent("OrderPlaced", k -> new ArrayList<>()).add(e -> System.out.println("  email for " + e));
        bus.inTransaction(() -> bus.publish("OrderPlaced"), false);
        bus.inTransaction(() -> bus.publish("OrderPlaced"), true);
        bus.publish("OrderPlaced");
    }
}` }],
    codeTitle: ['@Async with a named executor, and after-commit events (Spring 6)', 'A tiny event bus with after-commit delivery (plain Java, runs)'],
    viz: [{
      title: 'Publish inside a transaction: who runs when?',
      gen: function () {
        function f(narr, q, log, vals, qh) {
          return { narr: narr, parts: [
            { type: 'queue', label: 'TransactionSynchronizations registered', items: q, hl: qh || {}, frontLabel: 'first', backLabel: 'last' },
            { type: 'array', label: 'What has run (in order)', values: log.length ? log : ['—'] },
            { type: 'vars', label: 'Thread "http-nio-1"', vals: vals }
          ] };
        }
        return [
          f('<code>place()</code> starts a transaction on the request thread.', [], [], { tx: 'active', thread: 'http-nio-1' }),
          f('<code>publishEvent(OrderPlaced)</code>. The plain <code>@EventListener</code> (audit) runs <b>immediately and synchronously</b> on the same thread, inside the same transaction.', [], ['audit'], { tx: 'active', thread: 'http-nio-1' }),
          f('The <code>@TransactionalEventListener</code> (mailer) does not run; it registers a synchronization for AFTER_COMMIT.', ['mailer@AFTER_COMMIT'], ['audit'], { tx: 'active' }, { 0: 'cur' }),
          f('A <code>BEFORE_COMMIT</code> listener (e.g. a final validation) would run during <code>beforeCommit</code>, still able to make the transaction fail.', ['mailer@AFTER_COMMIT', 'check@BEFORE_COMMIT'], ['audit', 'check'], { tx: 'committing' }, { 1: 'ok' }),
          f('The database commit succeeds. <code>afterCompletion(COMMITTED)</code> runs registered listeners whose phase matches: the mailer.', ['mailer@AFTER_COMMIT'], ['audit', 'check', 'COMMIT', 'mailer'], { tx: 'committed' }, { 0: 'ok' }),
          f('Because the mailer is also <code>@Async("mailExecutor")</code>, the call is handed to a <b>mail-1</b> thread; the request returns without waiting for SMTP.', [], ['audit', 'check', 'COMMIT', 'mailer → mail-1'], { tx: 'none', thread: 'mail-1 (async)' }),
          f('Had the transaction rolled back, the AFTER_COMMIT synchronization would be discarded: <span class="c-g">no email for an order that does not exist</span>. The audit listener, however, already ran — its writes rolled back with the transaction.', [], ['audit', 'ROLLBACK'], { tx: 'rolled back' })
        ];
      }
    }],
    examples: [
      { title: 'Self-invocation with @Async', html: `<p>${C('public void importAll() { for (File f : files) importOne(f); }')} with ${C('@Async importOne')} runs everything sequentially on the caller thread: ${C('importOne')} is called on ${C('this')}. Move ${C('importOne')} to another bean, or submit to an injected executor explicitly.</p>` },
      { title: 'Waiting for several async calls', html: `<p>Return ${C('CompletableFuture')} from the ${C('@Async')} methods (declared on <b>another</b> bean) and combine the futures; both quotes run in parallel on the executor while the caller waits only once:</p>`, code: { lang: 'java', check: false, code: `CompletableFuture<Price> a = pricing.quote("A");      // @Async methods on ANOTHER bean
CompletableFuture<Price> b = pricing.quote("B");
CompletableFuture.allOf(a, b).join();
Price best = Stream.of(a.join(), b.join()).min(Comparator.comparing(Price::amount)).orElseThrow();` } },
      { title: 'Unbounded queue surprise', html: `<p>Boot's default executor queue capacity is ${C('Integer.MAX_VALUE')}: max-pool-size is never reached because threads beyond core are only created when the queue is full. Under a burst, tasks pile up in memory. Set ${C('spring.task.execution.pool.queue-capacity')} and a rejection policy deliberately.</p>` },
      { title: 'Ordering and async listeners', html: `<p>${C('@Order')} orders synchronous listeners. Marking a listener ${C('@Async')} makes its order meaningless relative to the others and moves exceptions away from the publisher — great for side effects (email, metrics), wrong for logic that must happen before the publisher continues.</p>` }
    ],
    deepDive: `<p><b>Proxy merging.</b> ${C('AsyncAnnotationBeanPostProcessor')} extends ${C('AbstractAdvisingBeanPostProcessor')}: if the bean is already an ${C('Advised')} proxy, it adds its advisor to that proxy (first in the chain by default, via ${C('beforeExistingAdvisors')}); otherwise it creates a new proxy. It does not support early references, so an ${C('@Async')} bean in a circular dependency fails with the "raw version" error.</p>
<p><b>Async + transactions.</b> A method that is both ${C('@Async')} and ${C('@Transactional')} gets its <b>own</b> transaction on the worker thread (the async advisor runs first, the transaction interceptor runs on the worker). It never joins the caller's transaction.</p>
<p><b>Event multicaster with an executor.</b> Setting a ${C('TaskExecutor')} on ${C('SimpleApplicationEventMulticaster')} makes <i>all</i> listeners asynchronous, including framework ones — rarely what you want. Prefer ${C('@Async')} per listener.</p>
<p><b>Generic events and payloads.</b> Publishing any object wraps it in ${C('PayloadApplicationEvent')}; generic types are matched via ${C('ResolvableType')} (implement ${C('ResolvableTypeProvider')} if erasure hides the type).</p>
<p><b>Durability.</b> In-memory events are lost if the JVM dies between commit and listener. For must-happen side effects use the <b>transactional outbox</b> (write the event row in the same transaction, deliver later) — Spring Modulith's event publication registry does this.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants add ${C('@Async')} and events eagerly to "make it faster" or "decouple" code.</p>
<p><b>Where it goes wrong:</b> async calls inside the same class, ${C('@EventListener')} where ${C('@TransactionalEventListener')} is needed (emails for rolled-back orders), listeners that expect the publisher's request scope or security context, and forgetting that the default executor queue is unbounded.</p>
<p><b>What you still own:</b> deciding what must be atomic, what may be eventually consistent, and what must survive a crash (outbox), plus making context propagation explicit (TaskDecorator, Micrometer context propagation).</p>`,
    problems: [{
      title: 'Deliver Transactional Events by Phase',
      level: 'Medium', tags: ['events', '@TransactionalEventListener', 'synchronization'], companies: ['Shopify', 'Zalando', 'Booking.com'],
      statement: `<p>Simulate event delivery on one thread. Operations:</p>
<ul><li>${C('"begin"')} → log ${C('"begin"')} (no nesting: begin only when no tx is active).</li>
<li>${C('"publish X"')} → a plain ${C('@EventListener')}: log ${C('"handle X"')} immediately.</li>
<li>${C('"beforeCommit X"')}, ${C('"afterCommit X"')}, ${C('"afterRollback X"')}, ${C('"afterCompletion X"')} → publish X to a transactional listener with that phase. Inside a tx it is registered; with no tx it is dropped: log ${C('"skip X"')}.</li>
<li>${C('"fallback X"')} → an AFTER_COMMIT listener with ${C('fallbackExecution = true')}: with no tx, log ${C('"handle X"')} immediately.</li>
<li>${C('"commit"')} → log ${C('"handle X"')} for registered BEFORE_COMMIT listeners (registration order), then ${C('"commit"')}, then ${C('"handle X"')} for AFTER_COMMIT and AFTER_COMPLETION listeners in registration order.</li>
<li>${C('"rollback"')} → log ${C('"rollback"')}, then AFTER_ROLLBACK and AFTER_COMPLETION listeners in registration order.</li></ul>`,
      constraints: `0 ≤ ops ≤ 1000. commit/rollback appear only when a tx is active.`,
      example: `<p>${C('["begin", "afterCompletion C", "beforeCommit D", "afterCommit A", "commit"]')} → ${H.c('g', C('[begin, handle D, commit, handle C, handle A]'))}: before-commit work first, then after-completion callbacks in the order they were registered.</p>`,
      brute: { why: `<p>Delivering every event immediately (plain ${C('@EventListener')} semantics) sends notifications for transactions that later roll back, and runs side effects while the transaction can still fail.</p>`, code: `
class ImmediateBus {
    static List<String> run(String[] ops) {
        List<String> log = new ArrayList<>();
        for (String op : ops) {
            String[] p = op.split(" ");
            if (p.length == 2) log.add("handle " + p[1]);            // ignores the transaction
            else log.add(op);
        }
        return log;
    }
}` },
      mcq: { q: 'An <code>@TransactionalEventListener</code> (default settings) receives an event published from a method that is NOT transactional. What happens?', options: ['The event is not delivered to that listener (unless fallbackExecution = true)', 'It is delivered immediately', 'It is delivered when the next transaction commits', 'An IllegalStateException is thrown to the publisher'], answer: 0, explain: 'Without an active transaction there is no synchronization to hook into; the listener is skipped unless fallbackExecution is set.' },
      hints: [`<p>Hint 1: Keep one boolean "tx active" and one list of registered ${C('(phase, event)')} pairs.</p>`, `<p>Hint 2: On commit, scan the list twice: first BEFORE_COMMIT entries, then (after logging "commit") AFTER_COMMIT and AFTER_COMPLETION entries. On rollback, one scan for AFTER_ROLLBACK and AFTER_COMPLETION.</p>`, `<p>Hint 3: Clear the list and the active flag when the transaction ends, so later events see "no transaction". Treat ${C('fallback')} as AFTER_COMMIT inside a tx.</p>`],
      tests: { sig: 'string[] -> list<string>', fn: 'run', cases: [
        [[['begin', 'afterCommit OrderPlaced', 'commit']], ['begin', 'commit', 'handle OrderPlaced']],
        [[['begin', 'afterCommit OrderPlaced', 'rollback']], ['begin', 'rollback']],
        [[['afterCommit A']], ['skip A']],
        [[['fallback A']], ['handle A']],
        [[['begin', 'publish A', 'afterCommit B', 'commit']], ['begin', 'handle A', 'commit', 'handle B']],
        [[['begin', 'afterCommit A', 'afterRollback B', 'afterCompletion C', 'rollback']], ['begin', 'rollback', 'handle B', 'handle C']],
        [[['begin', 'afterCompletion C', 'beforeCommit D', 'afterCommit A', 'commit']], ['begin', 'handle D', 'commit', 'handle C', 'handle A']],
        [[[]], []],
        [[['begin', 'afterCommit A', 'commit', 'afterCommit B']], ['begin', 'commit', 'handle A', 'skip B']],
        [[['begin', 'fallback A', 'rollback']], ['begin', 'rollback']],
        [[['publish X', 'begin', 'beforeCommit Y', 'rollback', 'beforeCommit Z']], ['handle X', 'begin', 'rollback', 'skip Z']]
      ] },
      solution: {
        approach: `<p>Model ${C('TransactionalApplicationListenerSynchronization')}: inside a transaction, each transactional publish registers a synchronization with its phase. ${C('beforeCommit')} runs BEFORE_COMMIT ones; after the physical completion, ${C('afterCompletion(status)')} runs, in registration order, those whose phase matches the outcome (AFTER_COMPLETION matches both).</p>`,
        code: `
class TxEventSimulator {
    static List<String> run(String[] ops) {
        List<String> log = new ArrayList<>();
        List<String[]> registered = new ArrayList<>();       // {phase, event}
        boolean active = false;
        for (String op : ops) {
            String[] p = op.split(" ");
            switch (p[0]) {
                case "begin": active = true; log.add("begin"); break;
                case "publish": log.add("handle " + p[1]); break;          // plain @EventListener
                case "fallback":
                    if (active) registered.add(new String[] { "afterCommit", p[1] });
                    else log.add("handle " + p[1]);
                    break;
                case "commit":
                    for (String[] r : registered) if (r[0].equals("beforeCommit")) log.add("handle " + r[1]);
                    log.add("commit");
                    for (String[] r : registered)
                        if (r[0].equals("afterCommit") || r[0].equals("afterCompletion")) log.add("handle " + r[1]);
                    registered.clear(); active = false;
                    break;
                case "rollback":
                    log.add("rollback");
                    for (String[] r : registered)
                        if (r[0].equals("afterRollback") || r[0].equals("afterCompletion")) log.add("handle " + r[1]);
                    registered.clear(); active = false;
                    break;
                default:                                                   // a transactional phase
                    if (active) registered.add(new String[] { p[0], p[1] });
                    else log.add("skip " + p[1]);
            }
        }
        return log;
    }
}`,
        dry: { head: ['op', 'active', 'registered', 'log'], rows: [
          ['begin', 'true', '[]', 'begin'],
          ['afterCompletion C', 'true', '[C@completion]', ''],
          ['beforeCommit D', 'true', '[C, D@before]', ''],
          ['afterCommit A', 'true', '[C, D, A@commit]', ''],
          ['commit', 'false', '[]', H.c('g', 'handle D, commit, handle C, handle A')]
        ] },
        complexity: `<p>O(ops) overall: each registration is scanned a constant number of times at completion.</p>`,
        followUps: ['Where does @Async fit if the AFTER_COMMIT listener is also asynchronous?', 'Why must an AFTER_COMMIT listener that writes use REQUIRES_NEW?', 'How would you guarantee delivery if the JVM crashes right after commit?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 8 — Environment, profiles and auto-configuration internals
     ====================================================================== */
  topics.push({
    title: 'Environment, Profiles & Auto-Configuration Internals: PropertySources, DeferredImportSelector, Conditions',
    analogy: `<p>Settings in a company come from a <b>stack of rule books</b>: the CEO's memo beats the department handbook, which beats the general handbook. To find the dress code you open the books from the top and stop at the first one that mentions it. Some handbooks only apply "<i>for the night shift</i>" (profiles). And the office furniture supplier (auto-configuration) visits <b>last</b>, after every team has set up its own desks, and only fills the gaps: "<i>no desk here? I will put one</i>" — that is ${'@ConditionalOnMissingBean'}.</p>`,
    explain: `<h4>1. The Environment is an ordered list of PropertySources</h4>
<p>${C('ConfigurableEnvironment.getPropertySources()')} is a ${C('MutablePropertySources')} list; ${C('getProperty(key)')} asks each source in order and returns the <b>first</b> hit, then resolves ${C('${...}')} placeholders in the value against the whole Environment. Spring Boot fills it (highest precedence first, simplified): command-line args (${C('--server.port=9000')}), ${C('SPRING_APPLICATION_JSON')}, Java system properties, OS environment variables, ${C('random.*')}, config data files — profile-specific ${C('application-{profile}.properties')} above ${C('application.properties')}, files outside the jar above files inside — then ${C('@PropertySource')} files, then default properties.</p>
<h4>2. Relaxed binding</h4>
<p>OS environment variables cannot contain dots, so ${C('server.port')} is also found as ${C('SERVER_PORT')}: uppercase, ${C('.')} → ${C('_')}, dashes removed (${C('my-app.max-size')} → ${C('MYAPP_MAXSIZE')}). ${C('@ConfigurationProperties')} binding is relaxed in all directions (kebab, camel, underscore); ${C('@Value')} only gets the environment-variable mapping.</p>
<h4>3. Profiles</h4>
<p>${C('spring.profiles.active=prod,eu')} activates profiles; with none active, the profile ${C('default')} is active. ${C('application-prod.properties')} is loaded only when ${C('prod')} is active; when several profiles are active, the <b>last one wins</b> for conflicting keys. ${C('@Profile')} on a component/${C('@Bean')} is a condition evaluated against the active profiles and supports expressions: ${C('!')}, ${C('&')}, ${C('|')} and parentheses (mixing ${C('&')} and ${C('|')} without parentheses is rejected).</p>
<h4>4. How auto-configuration is loaded</h4>
<ol><li>${C('@SpringBootApplication')} includes ${C('@EnableAutoConfiguration')}, which imports ${C('AutoConfigurationImportSelector')} — a <b>DeferredImportSelector</b>.</li>
<li>Deferred means: ${C('ConfigurationClassParser')} processes <b>all of your configuration first</b> (component scan, your ${C('@Bean')}s), and only then asks the selector. That is the reason ${C('@ConditionalOnMissingBean')} sees your beans.</li>
<li>The selector reads candidates from ${C('META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports')} in every jar, removes ${C('exclude')}s, quickly filters with pre-computed ${C('@ConditionalOnClass')} metadata (without loading classes), and sorts them with ${C('AutoConfigurationSorter')}: alphabetically, then by ${C('@AutoConfigureOrder')}, then honouring ${C('@AutoConfiguration(after/before)')}.</li>
<li>Each class is then parsed like normal configuration; conditions are evaluated in that order, so ${C('@ConditionalOnMissingBean')} in a later auto-configuration sees beans registered by earlier ones.</li></ol>`,
    clues: [
      'Value differs between laptop and Kubernetes → an environment variable (SERVER_PORT) or command-line arg overrides the file; check /actuator/env for the winning source.',
      '"My bean replaced Boot\'s" works because user config is parsed before the deferred auto-config import.',
      '@ConditionalOnMissingBean on a bean in YOUR @Configuration is unreliable → ordering among user configs is not guaranteed; it is meant for auto-configuration.',
      'Two auto-configurations depend on each other\'s beans → declare after/before, not @Order.'
    ],
    code: [{ lang: 'java', check: false, title: 'A well-behaved auto-configuration (Spring Boot 3)', code: `@AutoConfiguration(after = DataSourceAutoConfiguration.class)     // ordering among auto-configs
@ConditionalOnClass(JdbcTemplate.class)                             // checked from metadata, cheap
@ConditionalOnProperty(prefix = "audit", name = "enabled", havingValue = "true", matchIfMissing = true)
@EnableConfigurationProperties(AuditProperties.class)
public class AuditAutoConfiguration {
    @Bean
    @ConditionalOnMissingBean                                       // back off if the user defined one
    @ConditionalOnBean(DataSource.class)                            // only after DataSource auto-config ran
    AuditWriter auditWriter(JdbcTemplate jdbc, AuditProperties props) {   // lite mode: parameters, not calls
        return new AuditWriter(jdbc, props.table());
    }
}
// META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports
//   com.acme.audit.AuditAutoConfiguration

// Reading the Environment directly
@Component
class PortReporter {
    PortReporter(Environment env) {
        System.out.println(env.getProperty("server.port", Integer.class, 8080));
        System.out.println(Arrays.toString(env.getActiveProfiles()));
    }
}` }, { lang: 'java', title: 'First-hit lookup over ordered property sources (plain Java, runs)', run: true, code: `import java.util.*;

public class PropertySources {
    record Source(String name, Map<String, String> values) { }

    static String get(List<Source> sources, String key) {
        String envKey = key.toUpperCase().replace('.', '_').replace("-", "");
        for (Source s : sources) {                                  // highest precedence first
            String v = s.name().equals("systemEnvironment") ? s.values().get(envKey) : s.values().get(key);
            if (v != null) { System.out.println("  " + key + " found in " + s.name()); return v; }
        }
        return null;
    }

    public static void main(String[] args) {
        List<Source> env = List.of(
            new Source("commandLineArgs", Map.of()),
            new Source("systemEnvironment", Map.of("SERVER_PORT", "9000")),
            new Source("application-prod.properties", Map.of("db.url", "jdbc:postgresql://prod/shop")),
            new Source("application.properties", Map.of("server.port", "8080", "db.url", "jdbc:h2:mem:shop")));
        System.out.println(get(env, "server.port"));   // 9000 - env var beats the file
        System.out.println(get(env, "db.url"));        // profile file beats the base file
    }
}` }],
    codeTitle: ['A well-behaved auto-configuration (Spring Boot 3)', 'First-hit lookup over ordered property sources (plain Java, runs)'],
    viz: [{
      title: 'Where does server.port come from?',
      input: 'cli= env=9000 prod=8443 base=8080 profiles=prod',
      inputLabel: 'cli=, env=, prod=, base= values (empty = not set), profiles=prod or none',
      gen: function (input) {
        var o = { cli: '', env: '9000', prod: '8443', base: '8080', profiles: 'prod' };
        String(input || '').replace(/(cli|env|prod|base|profiles)=([A-Za-z0-9]*)/g, function (_, k, v) { o[k] = v; return ''; });
        ['cli', 'env', 'prod', 'base'].forEach(function (k) { if (o[k] && !/^\d{1,5}$/.test(o[k])) throw new Error(k + ' must be a port number or empty'); });
        var prodActive = o.profiles === 'prod';
        var rows = [
          ['commandLineArgs', '--server.port', o.cli || '-'],
          ['systemEnvironment', 'SERVER_PORT', o.env || '-'],
          ['application-prod.properties', 'server.port', prodActive ? (o.prod || '-') : '(profile inactive)'],
          ['application.properties', 'server.port', o.base || '-'],
          ['defaults', 'server.port', '8080 (Tomcat default)']
        ];
        var vals = [o.cli, o.env, prodActive ? o.prod : '', o.base, '8080'];
        var F = [];
        F.push({ narr: 'The Environment is an <b>ordered</b> list. <code>getProperty("server.port")</code> starts at the top and stops at the first source that has the key.', parts: [{ type: 'table', label: 'PropertySources (top = highest precedence)', columns: ['source', 'key looked up', 'value'], rows: rows, hl: {} }] });
        for (var i = 0; i < 5; i++) {
          var h = {}; for (var k = 0; k < i; k++) h[k] = 'done'; h[i] = vals[i] ? 'ok' : 'cur';
          if (vals[i]) {
            F.push({ narr: 'Source <b>' + rows[i][0] + '</b> has it (' + rows[i][1] + ') → <span class="c-g">' + vals[i] + '</span>. Lower sources are never consulted' + (i === 1 ? ' — the env var name is the relaxed form: uppercase, dots → underscores.' : '.'), parts: [{ type: 'table', label: 'PropertySources (top = highest precedence)', columns: ['source', 'key looked up', 'value'], rows: rows, hl: h }, { type: 'vars', label: 'Result', vals: { 'server.port': vals[i], from: rows[i][0] }, hl: { 'server.port': 'ok' } }] });
            break;
          }
          F.push({ narr: 'Source <b>' + rows[i][0] + '</b>: ' + (i === 2 && !prodActive ? 'the prod profile is not active, so this file is not even loaded.' : 'no value. Move down.'), parts: [{ type: 'table', label: 'PropertySources (top = highest precedence)', columns: ['source', 'key looked up', 'value'], rows: rows, hl: h }] });
        }
        F.push({ narr: 'Debug in a real app: <code>/actuator/env/server.port</code> lists every source that defines the key and which one wins. Try <code>cli=7000</code>, <code>env=</code>, or <code>profiles=none</code>.', parts: [note('Remember', 'command line &gt; system props &gt; OS env &gt; application-{profile} &gt; application &gt; @PropertySource &gt; defaults')] });
        return F;
      }
    }],
    examples: [
      { title: 'Why exclude instead of fighting', html: `<p>To stop Boot configuring a DataSource for a library that has none, use ${C('@SpringBootApplication(exclude = DataSourceAutoConfiguration.class)')} or ${C('spring.autoconfigure.exclude=...')}. Exclusion removes the candidate before conditions are evaluated; defining a dummy bean to trigger ${C('@ConditionalOnMissingBean')} is a hack.</p>` },
      { title: 'The conditions report', html: `<p>Run with ${C('--debug')} (or ${C('/actuator/conditions')}): "Positive matches" lists applied auto-configurations with the reason (${C('@ConditionalOnClass found required class ...')}), "Negative matches" the skipped ones (${C('@ConditionalOnMissingBean found beans of type DataSource: myDataSource')}). It is the fastest way to answer "why did Boot (not) create X?".</p>` },
      { title: 'Profile expressions', html: `<p>${C('@Profile("prod & !cloud")')}, ${C('@Profile("(us | eu) & prod")')}. ${C('@Profile({"a", "b"})')} means a OR b. ${C('"a & b | c"')} fails at start-up as a malformed expression — add parentheses. Profile groups (${C('spring.profiles.group.prod=db,mq')}) activate several at once.</p>` },
      { title: 'Config data imports', html: `<p>${C('spring.config.import=optional:configserver:,vault://')} pulls property sources from external systems (Config Server, Vault, Kubernetes ConfigMaps) into the same ordered list — they are just more PropertySources, positioned above the file that imports them.</p>` }
    ],
    deepDive: `<p><b>Two-phase conditions.</b> Each condition declares a ${C('ConfigurationPhase')}: ${C('PARSE_CONFIGURATION')} conditions (like ${C('@ConditionalOnClass')}) decide whether a class is parsed at all; ${C('REGISTER_BEAN')} conditions (${C('@ConditionalOnBean')}, ${C('@ConditionalOnMissingBean')}) are deferred until bean definitions are being registered, so they see everything registered before them — but nothing registered after. That is why they depend on auto-configuration ordering.</p>
<p><b>Fast filtering.</b> The Boot build generates ${C('META-INF/spring-autoconfigure-metadata.properties')} with each auto-configuration's ${C('ConditionalOnClass')}, ${C('ConditionalOnWebApplication')} and ordering, so the selector can drop hundreds of candidates via ${C('AutoConfigurationImportFilter')}s without loading their classes.</p>
<p><b>Sorting algorithm.</b> ${C('AutoConfigurationSorter')} sorts names alphabetically, then stably by ${C('@AutoConfigureOrder')}, then does a depth-first pass: before adding a class, it first adds every class that must come before it (its ${C('after')} list plus classes that declared ${C('before')} it). A class reached again while still being processed means a cycle: "AutoConfigure cycle detected".</p>
<p><b>Environment post-processors.</b> ${C('EnvironmentPostProcessor')}s (registered in ${C('spring.factories')}) run before the context exists and may add or reorder PropertySources — this is how config data, random values and cloud bindings are loaded.</p>
<p><b>Testing auto-configuration.</b> ${C('ApplicationContextRunner')} builds a small context with chosen user configuration, properties and classpath filters, so each condition can be unit-tested quickly.</p>`,
    aiEra: `<p><b>What AI changes:</b> generating a starter (properties class, auto-configuration, imports file) is quick with an assistant, and it can read a conditions report for you.</p>
<p><b>Where it goes wrong:</b> it registers auto-configurations in the old ${C('spring.factories')} key (removed for auto-configuration in Boot 3), uses ${C('@Configuration')} + ${C('@Order')} instead of ${C('@AutoConfiguration(after=...)')}, puts ${C('@ConditionalOnMissingBean')} on application beans, or assumes properties files beat environment variables.</p>
<p><b>What you still own:</b> predicting the winning property source in each environment (laptop, CI, Kubernetes), designing starters that back off cleanly, and debugging with ${C('/actuator/env')} and the conditions report.</p>`,
    problems: [{
      title: 'Resolve a Property Across Sources and Profiles',
      level: 'Medium', tags: ['Environment', 'profiles', 'relaxed binding'], companies: ['Netflix', 'Capital One', 'ThoughtWorks'],
      statement: `<p>Each entry is ${C('"origin|key=value"')}. Origins from highest to lowest precedence: ${C('commandLine')}, ${C('systemProps')}, ${C('env')}, ${C('application-<profile>')} (only for active profiles; among them the <b>later</b> profile in ${C('profiles')} wins), ${C('application')}, ${C('propertySource')}, ${C('defaults')}. With no active profiles, the profile ${C('default')} is active.</p>
<ul><li>${C('env')} keys are environment variable names: key ${C('k')} matches the env name ${C('k')} uppercased, with ${C('.')} → ${C('_')} and ${C('-')} removed.</li>
<li>Other origins match the key exactly.</li>
<li>The chosen value's ${C('${k}')} and ${C('${k:default}')} placeholders are resolved with the same lookup (recursively).</li></ul>
<p>Return the value, ${C('"<none>"')} if the key is not found, or ${C('"ERROR"')} if a placeholder cannot be resolved and has no default.</p>`,
      constraints: `≤ 100 entries; no circular placeholders; keys within one origin are unique.`,
      example: `<p>${C('["application|app.url=http://${app.host}:${server.port:8080}", "env|APP_HOST=prod.example.com"]')}, key ${C('app.url')} → ${H.c('g', 'http://prod.example.com:8080')}.</p>`,
      brute: { why: `<p>Loading all entries into one ${C('HashMap')} (last write wins) makes the answer depend on input order, ignores profiles and relaxed env names, and leaves placeholders unresolved.</p>`, code: `
class FlatMapLookup {
    static String resolve(String[] entries, String key) {
        Map<String, String> all = new HashMap<>();
        for (String e : entries) { String kv = e.substring(e.indexOf('|') + 1); all.put(kv.substring(0, kv.indexOf('=')), kv.substring(kv.indexOf('=') + 1)); }
        return all.getOrDefault(key, "<none>");
    }
}` },
      mcq: { q: '<code>application.properties</code> sets <code>server.port=8080</code> and the container sets the environment variable <code>SERVER_PORT=9000</code>. Which port is used?', options: ['9000 — OS environment variables have higher precedence than application.properties', '8080 — files always win', 'Start-up fails because of the conflict', 'Whichever was loaded last'], answer: 0, explain: 'Environment variables sit above config data files in the PropertySources order, and SERVER_PORT is the relaxed form of server.port.' },
      hints: [`<p>Hint 1: Build the ordered list of source names first: commandLine, systemProps, env, then ${C('application-p')} for active profiles in <b>reverse</b> order, then application, propertySource, defaults.</p>`, `<p>Hint 2: Store entries in a map from origin to (key → value). For ${C('env')} look up the converted key ${C('key.toUpperCase().replace(".", "_").replace("-", "")')}.</p>`, `<p>Hint 3: After choosing a value, scan for ${C('${')}, find the matching ${C('}')}, split at the first colon, recursively look the key up (and resolve its value), else use the default, else return ERROR.</p>`],
      tests: { sig: 'string[] string[] string -> string', fn: 'resolve', cases: [
        [[['application|server.port=8080'], [], 'server.port'], '8080'],
        [[['application|server.port=8080', 'env|SERVER_PORT=9000'], [], 'server.port'], '9000'],
        [[['application|server.port=8080', 'env|SERVER_PORT=9000', 'commandLine|server.port=7000'], [], 'server.port'], '7000'],
        [[['application|db.url=h2', 'application-prod|db.url=pg'], ['prod'], 'db.url'], 'pg'],
        [[['application|db.url=h2', 'application-prod|db.url=pg'], ['dev'], 'db.url'], 'h2'],
        [[['application-a|x=1', 'application-b|x=2'], ['b', 'a'], 'x'], '1'],
        [[['application|x=1', 'application-default|x=2'], [], 'x'], '2'],
        [[['application|app.url=http://${app.host}:${server.port:8080}', 'env|APP_HOST=prod.example.com'], [], 'app.url'], 'http://prod.example.com:8080'],
        [[['application|a=1'], [], 'b'], '<none>'],
        [[['env|SPRING_DATASOURCE_URL=jdbc:pg'], [], 'spring.datasource.url'], 'jdbc:pg'],
        [[['env|MYAPP_MAXSIZE=10', 'application|my-app.max-size=5'], [], 'my-app.max-size'], '10'],
        [[['propertySource|x=ps', 'application|x=app'], [], 'x'], 'app'],
        [[['propertySource|x=ps', 'defaults|x=d'], [], 'x'], 'ps'],
        [[['application|a=${nope}'], [], 'a'], 'ERROR'],
        [[['systemProps|x=sys', 'env|X=env'], [], 'x'], 'sys']
      ] },
      solution: {
        approach: `<p>Model ${C('PropertySourcesPropertyResolver')}: an ordered list of named sources, first hit wins, then nested placeholder resolution against the same resolver. Profiles only decide which ${C('application-<p>')} sources exist and in which order (later profile = higher). The env source translates the key to its relaxed variable name.</p>`,
        code: `
class EnvironmentResolver {
    static String resolve(String[] entries, String[] profiles, String key) {
        Map<String, Map<String, String>> byOrigin = new HashMap<>();
        for (String e : entries) {
            int bar = e.indexOf('|'), eq = e.indexOf('=', bar);
            byOrigin.computeIfAbsent(e.substring(0, bar), k -> new HashMap<>()).put(e.substring(bar + 1, eq), e.substring(eq + 1));
        }
        List<String> order = new ArrayList<>(List.of("commandLine", "systemProps", "env"));
        List<String> active = profiles.length == 0 ? List.of("default") : Arrays.asList(profiles);
        for (int i = active.size() - 1; i >= 0; i--) order.add("application-" + active.get(i));   // last profile wins
        order.addAll(List.of("application", "propertySource", "defaults"));
        try {
            String v = lookup(key, order, byOrigin);
            return v == null ? "<none>" : v;
        } catch (IllegalArgumentException ex) {
            return "ERROR";
        }
    }

    private static String lookup(String key, List<String> order, Map<String, Map<String, String>> byOrigin) {
        for (String origin : order) {
            Map<String, String> src = byOrigin.get(origin);
            if (src == null) continue;
            String k = origin.equals("env") ? key.toUpperCase().replace(".", "_").replace("-", "") : key;
            String v = src.get(k);
            if (v != null) return placeholders(v, order, byOrigin);
        }
        return null;
    }

    private static String placeholders(String s, List<String> order, Map<String, Map<String, String>> byOrigin) {
        StringBuilder sb = new StringBuilder();
        int i = 0;
        while (true) {
            int start = s.indexOf("\${", i);
            if (start < 0) { sb.append(s.substring(i)); return sb.toString(); }
            sb.append(s, i, start);
            int depth = 1, end = start + 2;
            for (; end < s.length(); end++) {
                if (s.startsWith("\${", end)) { depth++; end++; }
                else if (s.charAt(end) == '}' && --depth == 0) break;
            }
            String inner = placeholders(s.substring(start + 2, end), order, byOrigin);
            int colon = inner.indexOf(':');
            String k = colon < 0 ? inner : inner.substring(0, colon);
            String v = lookup(k, order, byOrigin);
            if (v == null) {
                if (colon < 0) throw new IllegalArgumentException("Could not resolve placeholder '" + k + "'");
                v = inner.substring(colon + 1);
            }
            sb.append(v);
            i = end + 1;
        }
    }
}`,
        dry: { head: ['source (in order)', 'key tried', 'hit?', 'value'], rows: [
          ['commandLine', 'app.url', 'no', ''],
          ['env', 'APP_URL', 'no', ''],
          ['application', 'app.url', 'yes', C('http://${app.host}:${server.port:8080}')],
          ['  placeholder app.host', 'APP_HOST in env', 'yes', 'prod.example.com'],
          ['  placeholder server.port', 'all sources', 'no → default', H.c('g', '8080')]
        ] },
        complexity: `<p>O(S) source checks per lookup (S ≈ 7 + profiles) times the number of placeholders, with nesting adding recursion depth.</p>`,
        followUps: ['Where would @TestPropertySource and DynamicPropertySource sit in this order?', 'Why does @ConfigurationProperties accept MY_APP_MAXSIZE-style variants that @Value does not?', 'How does spring.config.import change the list of sources?']
      }
    }]
  });

  /* ======================================================================
     PRACTICE — Easy
     ====================================================================== */
  practice.push({
    title: 'Default Bean Names from Class Names',
    level: 'Easy', tags: ['component scanning', 'bean names'], companies: ['TCS', 'Cognizant', 'Capgemini'],
    statement: `<p>Write ${C('beanName(spec)')} that returns the bean name ${C('AnnotationBeanNameGenerator')} assigns. ${C('spec')} is a fully-qualified class name, optionally followed by ${C('@name')} when the annotation gives an explicit name (${C('@Component("name")')}).</p>
<ul><li>Explicit name → use it.</li>
<li>Otherwise take the short class name (after the last dot); a nested class ${C('Outer$Inner')} becomes ${C('Outer.Inner')}.</li>
<li>Decapitalize like ${C('java.beans.Introspector')}: if the first <b>two</b> characters are both upper case, keep the name unchanged; otherwise lower-case the first character.</li></ul>`,
    constraints: `1 ≤ spec length ≤ 200; class names are valid Java identifiers.`,
    example: `${H.table(['spec', 'bean name'], [[C('com.acme.OrderService'), H.c('g', 'orderService')], [C('com.acme.URLService'), H.c('g', 'URLService')], [C('com.acme.Outer$Inner'), H.c('g', 'outer.Inner')], [C('com.acme.OrderService@orders'), H.c('g', 'orders')]])}<p>Why: "URLService" starts with two capitals, so it is left alone — a frequent surprise when someone writes ${C('@Qualifier("uRLService")')}.</p>`,
    brute: { why: `<p>Always lower-casing the first letter gives ${C('uRLService')}, which is not the name Spring registers; a ${C('@Qualifier')} or ${C('getBean')} with that name fails.</p>`, code: `
class NaiveBeanName {
    static String beanName(String fqcn) {
        String s = fqcn.substring(fqcn.lastIndexOf('.') + 1);
        return Character.toLowerCase(s.charAt(0)) + s.substring(1);   // wrong for URLService
    }
}` },
    mcq: { q: 'Which name does Spring give to <code>@Service class HTTPClientFacade</code>?', options: ['HTTPClientFacade', 'hTTPClientFacade', 'httpClientFacade', 'hTTPclientFacade'], answer: 0, explain: 'Introspector-style decapitalization leaves names that start with two upper-case letters unchanged.' },
    hints: [`<p>Hint 1: Handle ${C('@')} first: everything after it is the answer.</p>`, `<p>Hint 2: Short name = substring after the last ${C('.')}, then replace ${C('$')} with ${C('.')}.</p>`, `<p>Hint 3: Decapitalize: length > 1 and both of the first two characters upper case → unchanged; else lower-case only the first character.</p>`],
    tests: { sig: 'string -> string', fn: 'beanName', cases: [
      [['com.acme.OrderService'], 'orderService'],
      [['com.acme.URLService'], 'URLService'],
      [['com.acme.UrlService'], 'urlService'],
      [['com.acme.Outer$Inner'], 'outer.Inner'],
      [['com.acme.OrderService@orders'], 'orders'],
      [['A'], 'a'],
      [['com.acme.X1Service'], 'x1Service'],
      [['Foo'], 'foo'],
      [['com.acme.ID'], 'ID']
    ] },
    solution: {
      approach: `<p>Follow ${C('AnnotationBeanNameGenerator.buildDefaultBeanName')}: explicit value wins; otherwise ${C('ClassUtils.getShortName')} (which turns ${C('$')} into ${C('.')}) and Introspector-style decapitalization.</p>`,
      code: `
class BeanNames {
    static String beanName(String spec) {
        int at = spec.indexOf('@');
        if (at >= 0) return spec.substring(at + 1);                          // @Component("name")
        String shortName = spec.substring(spec.lastIndexOf('.') + 1).replace('$', '.');
        return decapitalize(shortName);
    }

    static String decapitalize(String name) {
        if (name.length() > 1 && Character.isUpperCase(name.charAt(0)) && Character.isUpperCase(name.charAt(1)))
            return name;                                                     // URLService stays URLService
        return Character.toLowerCase(name.charAt(0)) + name.substring(1);
    }
}`,
      complexity: `<p>O(L) for a spec of length L.</p>`,
      followUps: ['How does @Bean naming differ (method name, or the name attribute with aliases)?', 'What happens when two scanned classes produce the same bean name?']
    }
  });

  practice.push({
    title: 'JDK or CGLIB? And Is This Method Advised?',
    level: 'Easy', tags: ['AOP', 'proxies', 'CGLIB'], companies: ['Infosys', 'Wipro', 'Oracle'],
    statement: `<p>Write ${C('classify(hasInterfaces, proxyTargetClass, finalClass, methodKind)')} following ${C('DefaultAopProxyFactory')}:</p>
<ul><li>CGLIB is used if ${C('proxyTargetClass')} is true or the bean has no interfaces; otherwise a JDK proxy.</li>
<li>CGLIB on a final class → ${C('"ERROR"')}.</li>
<li>CGLIB: methods of kind ${C('final')}, ${C('private')} or ${C('static')} → ${C('"CGLIB:not-advised"')}; ${C('interface')}, ${C('public')}, ${C('protected')} → ${C('"CGLIB:advised"')}.</li>
<li>JDK: ${C('interface')} methods → ${C('"JDK:advised"')}; any other kind is not even visible on the proxy → ${C('"JDK:not-on-proxy"')}.</li></ul>`,
    constraints: `methodKind ∈ {interface, public, protected, final, private, static}.`,
    example: `<p>Spring Boot app (proxyTargetClass = true), class implements an interface, interface method → ${H.c('g', 'CGLIB:advised')}. Same class declared ${C('final')} → ${H.c('r', 'ERROR')} ("Cannot subclass final class").</p>`,
    brute: { why: `<p>Assuming "interfaces → JDK proxy" is the plain-Spring rule; it is wrong in Spring Boot, which sets ${C('spring.aop.proxy-target-class=true')}. Ignoring the flag gives the wrong proxy type and wrong injection-type errors.</p>`, code: `
class NaiveProxyType {
    static String classify(boolean hasInterfaces) {
        return hasInterfaces ? "JDK:advised" : "CGLIB:advised";      // ignores proxyTargetClass and final
    }
}` },
    mcq: { q: 'In a Spring Boot 3 app, <code>OrderServiceImpl implements OrderService</code> and has <code>@Transactional</code> methods. What proxy does it get by default?', options: ['A CGLIB subclass proxy, because Boot sets proxy-target-class=true', 'A JDK dynamic proxy, because it has an interface', 'No proxy; transactions are woven by AspectJ', 'Both a JDK and a CGLIB proxy'], answer: 0, explain: 'AopAutoConfiguration enables proxyTargetClass by default, so injecting the implementation class type also works.' },
    hints: [`<p>Hint 1: Compute ${C('cglib = proxyTargetClass || !hasInterfaces')} first.</p>`, `<p>Hint 2: CGLIB subclasses: a final class cannot be subclassed; final, private and static methods cannot be overridden.</p>`, `<p>Hint 3: A JDK proxy only implements the interfaces, so only interface methods exist on it.</p>`],
    tests: { sig: 'bool bool bool string -> string', fn: 'classify', cases: [
      [[true, false, false, 'interface'], 'JDK:advised'],
      [[true, false, false, 'public'], 'JDK:not-on-proxy'],
      [[false, false, false, 'public'], 'CGLIB:advised'],
      [[true, true, false, 'interface'], 'CGLIB:advised'],
      [[true, true, true, 'interface'], 'ERROR'],
      [[false, false, false, 'final'], 'CGLIB:not-advised'],
      [[false, false, false, 'private'], 'CGLIB:not-advised'],
      [[true, false, true, 'interface'], 'JDK:advised'],
      [[false, true, false, 'protected'], 'CGLIB:advised'],
      [[false, false, false, 'static'], 'CGLIB:not-advised']
    ] },
    solution: {
      approach: `<p>Decide the proxy type exactly as ${C('DefaultAopProxyFactory.createAopProxy')} does, then apply each technology's limits: subclassing for CGLIB, interface-only for JDK.</p>`,
      code: `
class ProxyClassifier {
    static String classify(boolean hasInterfaces, boolean proxyTargetClass, boolean finalClass, String methodKind) {
        boolean cglib = proxyTargetClass || !hasInterfaces;
        if (cglib) {
            if (finalClass) return "ERROR";                                  // cannot subclass a final class
            switch (methodKind) {
                case "final": case "private": case "static": return "CGLIB:not-advised";
                default: return "CGLIB:advised";
            }
        }
        return methodKind.equals("interface") ? "JDK:advised" : "JDK:not-on-proxy";
    }
}`,
      complexity: `<p>O(1): a fixed number of checks per call.</p>`,
      followUps: ['Why does a final class with an interface still work with proxyTargetClass=false?', 'What does Objenesis do for CGLIB proxies?']
    }
  });

  practice.push({
    title: 'How Many Instances Were Created?',
    level: 'Easy', tags: ['scopes', 'lazy-init'], companies: ['Accenture', 'HCL', 'Deloitte'],
    statement: `<p>Beans are ${C('"name:singleton"')}, ${C('"name:singleton:lazy"')} or ${C('"name:prototype"')}. At refresh, every non-lazy singleton is created. Then the code calls ${C('getBean')} for each name in ${C('requests')} (unknown names are ignored). Return the total number of instances created: a singleton at most once, a prototype on every request.</p>`,
    constraints: `0 ≤ beans, requests ≤ 1000.`,
    example: `<p>beans ${C('["s:singleton", "p:prototype"]')}, requests ${C('["p", "p", "p", "s"]')} → ${H.c('g', '4')}: s at refresh (1) + three prototypes (3); the request for s reuses it.</p>`,
    brute: { why: `<p>Counting requests ignores that singletons are cached and created eagerly even when never requested; counting beans ignores that prototypes multiply.</p>`, code: `
class CountRequests {
    static int instances(String[] beans, String[] requests) { return requests.length; }   // wrong for singletons
}` },
    mcq: { q: 'A singleton bean is marked @Lazy and nothing ever injects or requests it. How many instances exist after start-up?', options: ['0', '1', 'One per thread', 'It depends on the number of @Autowired fields'], answer: 0, explain: 'Lazy singletons are created on first request; preInstantiateSingletons skips them.' },
    hints: [`<p>Hint 1: Parse each bean into scope and lazy flag in a map.</p>`, `<p>Hint 2: Keep a set of created singletons; add all non-lazy ones at "refresh".</p>`, `<p>Hint 3: For each request: prototype → count++; singleton → count++ only if newly added to the set.</p>`],
    tests: { sig: 'string[] string[] -> int', fn: 'instances', cases: [
      [[['a:singleton', 'b:prototype'], ['a', 'a', 'b', 'b']], 3],
      [[[], []], 0],
      [[['a:singleton:lazy'], []], 0],
      [[['a:singleton:lazy'], ['a', 'a']], 1],
      [[['p:prototype'], []], 0],
      [[['s:singleton', 'p:prototype'], ['p', 'p', 'p', 's', 'x']], 4],
      [[['a:singleton', 'b:singleton'], []], 2],
      [[['p:prototype'], { $rep: 'p', n: 5000 }], 5000]
    ] },
    solution: {
      approach: `<p>Model ${C('preInstantiateSingletons')} (non-lazy singletons eagerly) and ${C('doGetBean')} (singleton cache vs a new prototype each time).</p>`,
      code: `
class InstanceCounter {
    static int instances(String[] beans, String[] requests) {
        Map<String, String[]> defs = new HashMap<>();
        for (String b : beans) { String[] p = b.split(":"); defs.put(p[0], p); }
        Set<String> created = new HashSet<>();
        int count = 0;
        for (String[] p : defs.values())
            if (p[1].equals("singleton") && p.length == 2 && created.add(p[0])) count++;   // eager at refresh
        for (String r : requests) {
            String[] p = defs.get(r);
            if (p == null) continue;                                          // NoSuchBean: ignored here
            if (p[1].equals("prototype")) count++;                            // new every time
            else if (created.add(r)) count++;                                 // lazy singleton, first use
        }
        return count;
    }
}`,
      complexity: `<p>O(beans + requests).</p>`,
      followUps: ['How would request scope change the count for 3 HTTP requests?', 'What does spring.main.lazy-initialization=true change?']
    }
  });

  /* ======================================================================
     PRACTICE — Medium
     ====================================================================== */
  practice.push({
    title: 'Order of an Injected List<Handler>',
    level: 'Medium', tags: ['dependency injection', 'Ordered', 'sorting'], companies: ['Visa', 'Intuit', 'SAP'],
    statement: `<p>Spring injects ${C('List<Handler>')} sorted by ${C('AnnotationAwareOrderComparator')}. Beans are given in registration order as ${C('"name"')} (no order), ${C('"name:N"')} (${C('Ordered')}/${C('@Order')} value N) or ${C('"name:pN"')} (implements ${C('PriorityOrdered')} with value N). Return the injected order:</p>
<ul><li>PriorityOrdered beans come before all others.</li>
<li>Then ascending order value; beans without an order count as ${C('Integer.MAX_VALUE')} (LOWEST_PRECEDENCE).</li>
<li>The sort is stable: equal keys keep registration order.</li></ul>`,
    constraints: `0 ≤ beans ≤ 10<sup>4</sup>; order values fit in an int.`,
    example: `<p>${C('["audit", "auth:1", "metrics:10"]')} → ${H.c('g', C('[auth, metrics, audit]'))}. ${C('["u", "m:2147483647", "n"]')} → ${H.c('y', C('[u, m, n]'))}: an explicit LOWEST_PRECEDENCE ties with "no order".</p>`,
    brute: { why: `<p>Sorting only by the number and putting unordered beans last with a separate rule breaks ties with ${C('Integer.MAX_VALUE')} and forgets that PriorityOrdered beats any Ordered value.</p>`, code: `
class NumberOnlySort {
    static String[] order(String[] beans) {
        String[] out = beans.clone();
        Arrays.sort(out, Comparator.comparingInt(b -> b.contains(":") ? Integer.parseInt(b.split(":")[1].replace("p", "")) : Integer.MAX_VALUE));
        return out;                                         // ignores the PriorityOrdered group
    }
}` },
    mcq: { q: 'Bean A implements PriorityOrdered with order 100; bean B has @Order(-5). Which comes first in an injected List?', options: ['A — PriorityOrdered beats any plain Ordered value', 'B — -5 is smaller', 'Registration order decides', 'Spring throws because the order kinds are mixed'], answer: 0, explain: 'OrderComparator first compares the PriorityOrdered flag, then the order values.' },
    hints: [`<p>Hint 1: Parse each bean into (name, priorityFlag, orderValue, index).</p>`, `<p>Hint 2: Comparator: priority beans first, then ${C('Integer.compare(order)')}. Use a stable sort (${C('List.sort')}/${C('Arrays.sort')} on objects are stable merge sorts).</p>`, `<p>Hint 3: Missing order → ${C('Integer.MAX_VALUE')}, so an explicit MAX_VALUE ties and stays in registration order.</p>`],
    tests: { sig: 'string[] -> string[]', fn: 'order', cases: [
      [[['audit', 'auth:1', 'metrics:10']], ['auth', 'metrics', 'audit']],
      [[['c', 'b', 'a']], ['c', 'b', 'a']],
      [[['x:5', 'y:p100', 'z:1']], ['y', 'z', 'x']],
      [[['a:-5', 'b:0', 'c:-10']], ['c', 'a', 'b']],
      [[['u', 'm:2147483647', 'n']], ['u', 'm', 'n']],
      [[['a:3', 'b:3', 'c:p3', 'd:p1']], ['d', 'c', 'a', 'b']],
      [[[]], []],
      [[['solo:-2147483648']], ['solo']]
    ] },
    solution: {
      approach: `<p>Reproduce ${C('OrderComparator.doCompare')}: compare the PriorityOrdered flag, then the order value (default LOWEST_PRECEDENCE). A stable sort keeps registration order for ties, matching Spring's ${C('List.sort')}.</p>`,
      code: `
class InjectionOrder {
    static String[] order(String[] beans) {
        List<String[]> list = new ArrayList<>();               // {name, "p"/"", value}
        for (String b : beans) {
            int c = b.indexOf(':');
            if (c < 0) { list.add(new String[] { b, "", String.valueOf(Integer.MAX_VALUE) }); continue; }
            String v = b.substring(c + 1);
            boolean prio = v.startsWith("p");
            list.add(new String[] { b.substring(0, c), prio ? "p" : "", prio ? v.substring(1) : v });
        }
        list.sort(Comparator.<String[]>comparingInt(x -> x[1].isEmpty() ? 1 : 0)   // PriorityOrdered first
                .thenComparingInt(x -> Integer.parseInt(x[2])));                // then order value; stable
        String[] out = new String[list.size()];
        for (int i = 0; i < out.length; i++) out[i] = list.get(i)[0];
        return out;
    }
}`,
      complexity: `<p>O(n log n) for the stable sort of n beans.</p>`,
      followUps: ['How does @Priority on the class interact with @Order on a @Bean method?', 'What order does Map&lt;String, Handler&gt; injection use?']
    }
  });

  practice.push({
    title: 'Creation and Destruction Order of Singletons',
    level: 'Medium', tags: ['bean lifecycle', 'graphs', 'DFS'], companies: ['Amazon', 'Bloomberg', 'Salesforce'],
    statement: `<p>Beans are ${C('"name:dep1,dep2"')} (constructor dependencies, possibly none: ${C('"name:"')}), in registration order. ${C('preInstantiateSingletons')} calls ${C('getBean')} for each in order; ${C('getBean')} creates dependencies first, depth-first in declared order. A bean is <b>created</b> when its constructor returns. On ${C('close()')}, beans are destroyed in reverse creation order (dependents before their dependencies).</p>
<p>Return ${C('"create:x"')} lines in creation order followed by ${C('"destroy:x"')} lines. If a dependency is missing, return only ${C('"error:NoSuchBeanDefinitionException:x"')}; if a bean is requested while it is still being created (a constructor cycle), return only ${C('"error:BeanCurrentlyInCreationException:x"')} naming that bean.</p>`,
    constraints: `0 ≤ beans ≤ 2000; dependency chains may be up to 2000 long.`,
    example: `<p>${C('["top:left,right", "left:base", "right:base", "base:"]')} → create base, left, right, top; destroy top, right, left, base.</p><p>${C('["a:b", "b:a"]')} → ${H.c('r', 'error:BeanCurrentlyInCreationException:a')} (a → b → a while a is in creation).</p>`,
    brute: { why: `<p>Creating beans in registration order without resolving dependencies first passes ${C('null')} into constructors; repeatedly scanning for "a bean whose dependencies are all created" works but is O(n²) and does not name the bean in a cycle the way Spring does.</p>`, code: `
class ScanUntilReady {
    static List<String> order(Map<String, List<String>> deps) {
        List<String> done = new ArrayList<>();
        boolean progress = true;
        while (progress) {
            progress = false;
            for (String b : deps.keySet())
                if (!done.contains(b) && done.containsAll(deps.get(b))) { done.add(b); progress = true; }
        }
        return done;                                         // O(n^2); silently drops cyclic beans
    }
}` },
    mcq: { q: 'Why does Spring destroy beans in roughly the reverse order of creation?', options: ['So a bean is destroyed before the beans it depends on, which may still be needed in its @PreDestroy', 'Because a stack is faster than a queue', 'Because prototype beans must go first', 'It does not; order is random'], answer: 0, explain: 'Spring tracks dependent beans and destroys dependents first, e.g. a repository before its DataSource.' },
    hints: [`<p>Hint 1: This is a DFS post-order: a bean is appended after all its dependencies are.</p>`, `<p>Hint 2: Three states: not started, in creation, created. Requesting a bean that is "in creation" is the cycle error. Validate unknown names when you visit them.</p>`, `<p>Hint 3: Chains of 2000 can overflow a recursive DFS on small stacks in other languages; in Java the default stack copes, but an explicit stack is safer. Destroy order is the reversed creation list.</p>`],
    tests: { sig: 'string[] -> list<string>', fn: 'lifecycleOrder', cases: [
      [[['a:b', 'b:']], ['create:b', 'create:a', 'destroy:a', 'destroy:b']],
      [[['repo:', 'service:repo', 'controller:service']], ['create:repo', 'create:service', 'create:controller', 'destroy:controller', 'destroy:service', 'destroy:repo']],
      [[['a:b', 'b:a']], ['error:BeanCurrentlyInCreationException:a']],
      [[['a:ghost']], ['error:NoSuchBeanDefinitionException:ghost']],
      [[[]], []],
      [[['x:', 'y:', 'z:x,y']], ['create:x', 'create:y', 'create:z', 'destroy:z', 'destroy:y', 'destroy:x']],
      [[['top:left,right', 'left:base', 'right:base', 'base:']], ['create:base', 'create:left', 'create:right', 'create:top', 'destroy:top', 'destroy:right', 'destroy:left', 'destroy:base']],
      [[['a:a']], ['error:BeanCurrentlyInCreationException:a']],
      [[['a:b', 'b:c', 'c:b']], ['error:BeanCurrentlyInCreationException:b']]
    ] },
    solution: {
      approach: `<p>Iterative DFS with a "visiting" state mirrors ${C('singletonsCurrentlyInCreation')}. A bean is finished (post-order) once all its dependencies are; the creation list reversed is the destruction order.</p>`,
      code: `
class SingletonOrder {
    static List<String> lifecycleOrder(String[] beans) {
        Map<String, List<String>> deps = new LinkedHashMap<>();
        for (String b : beans) {
            int c = b.indexOf(':');
            String rest = b.substring(c + 1);
            deps.put(b.substring(0, c), rest.isEmpty() ? List.of() : Arrays.asList(rest.split(",")));
        }
        Map<String, Integer> state = new HashMap<>();          // 1 = in creation, 2 = created
        List<String> created = new ArrayList<>();
        for (String root : deps.keySet()) {
            if (state.containsKey(root)) continue;
            Deque<String> stack = new ArrayDeque<>();
            Deque<Integer> next = new ArrayDeque<>();           // index of the next dependency to visit
            state.put(root, 1); stack.push(root); next.push(0);
            while (!stack.isEmpty()) {
                String cur = stack.peek();
                int i = next.pop();
                List<String> ds = deps.get(cur);
                if (i < ds.size()) {
                    next.push(i + 1);
                    String d = ds.get(i);
                    if (!deps.containsKey(d)) return List.of("error:NoSuchBeanDefinitionException:" + d);
                    Integer s = state.get(d);
                    if (s == null) { state.put(d, 1); stack.push(d); next.push(0); }
                    else if (s == 1) return List.of("error:BeanCurrentlyInCreationException:" + d);
                } else {
                    stack.pop();
                    state.put(cur, 2);
                    created.add(cur);                            // constructor returned
                }
            }
        }
        List<String> out = new ArrayList<>();
        for (String b : created) out.add("create:" + b);
        for (int i = created.size() - 1; i >= 0; i--) out.add("destroy:" + created.get(i));
        return out;
    }
}`,
      complexity: `<p>O(V + E) time, O(V) memory, no recursion.</p>`,
      followUps: ['How does @DependsOn add an edge without injection?', 'How would field injection plus the early-reference cache change the cycle result?']
    }
  });

  practice.push({
    title: 'Advice Execution Trace',
    level: 'Medium', tags: ['AOP', 'advice ordering', 'simulation'], companies: ['VMware', 'JPMorgan', 'Adobe'],
    statement: `<p>Aspects are ${C('"Name:order:advices"')} where advices is a ${C('+')}-joined subset of ${C('around')}, ${C('before')}, ${C('after')}, ${C('afterReturning')}, ${C('afterThrowing')}. Build the chain like Spring 5.3+: aspects by ascending order (stable for ties), and inside one aspect the precedence ${C('around, before, after, afterReturning, afterThrowing')} (earlier = outer). Then run it and return the log:</p>
<ul><li>around: log ${C('"N.around>"')}, proceed, log ${C('"N.around<"')} only if no exception.</li>
<li>before: log ${C('"N.before"')}, proceed.</li>
<li>after: proceed, then always log ${C('"N.after"')}.</li>
<li>afterReturning / afterThrowing: proceed, then log ${C('"N.afterReturning"')} on success / ${C('"N.afterThrowing"')} on exception.</li>
<li>Target: ${C('"target"')}, or ${C('"target!"')} when ${C('throwing')}. Finish with ${C('"returned"')} or ${C('"threw"')}.</li></ul>`,
    constraints: `0 ≤ aspects ≤ 50.`,
    example: `<p>${C('["A:1:before+after+afterReturning+afterThrowing"]')}, throwing → ${H.c('g', C('[A.before, target!, A.afterThrowing, A.after, threw]'))}: within one aspect, @After behaves like an outer finally.</p>`,
    brute: { why: `<p>Logging all "before" parts in aspect order, then the target, then all "after" parts in the same order gets the unwinding wrong: the outermost aspect must finish <b>last</b>.</p>`, code: `
class FlatTrace {
    static List<String> trace(List<String> aspectNames) {
        List<String> log = new ArrayList<>();
        for (String a : aspectNames) log.add(a + ".before");
        log.add("target");
        for (String a : aspectNames) log.add(a + ".after");   // wrong: should be reversed
        return log;
    }
}` },
    mcq: { q: 'Aspect Sec has @Order(0) and aspect Tx has @Order(5), both with @Around. Whose code runs last on the way out?', options: ['Sec — the lowest order value is the outermost interceptor', 'Tx', 'Whichever was registered first', 'Both run simultaneously'], answer: 0, explain: 'Lower order = higher precedence = outer: it enters first and exits last.' },
    hints: [`<p>Hint 1: Flatten into a list of (aspect name, advice kind) interceptors: sort aspects stably by order, then append each aspect's advices in the fixed precedence.</p>`, `<p>Hint 2: Write ${C('boolean proceed(int i)')} that returns whether the call ended normally: at ${C('i == size')} log the target and return ${C('!throwing')}.</p>`, `<p>Hint 3: Each kind is a few lines around a recursive ${C('proceed(i + 1)')} call; only around and before log before recursing.</p>`],
    tests: { sig: 'string[] bool -> list<string>', fn: 'trace', cases: [
      [[['Log:2:before', 'Tx:1:around'], false], ['Tx.around>', 'Log.before', 'target', 'Tx.around<', 'returned']],
      [[['Log:2:before', 'Tx:1:around'], true], ['Tx.around>', 'Log.before', 'target!', 'threw']],
      [[['A:1:before+after+afterReturning+afterThrowing'], false], ['A.before', 'target', 'A.afterReturning', 'A.after', 'returned']],
      [[['A:1:before+after+afterReturning+afterThrowing'], true], ['A.before', 'target!', 'A.afterThrowing', 'A.after', 'threw']],
      [[[], false], ['target', 'returned']],
      [[['X:5:around+before', 'Y:5:after'], false], ['X.around>', 'X.before', 'target', 'Y.after', 'X.around<', 'returned']],
      [[['Sec:0:before', 'Audit:10:afterReturning+after', 'Tx:5:around'], true], ['Sec.before', 'Tx.around>', 'target!', 'Audit.after', 'threw']],
      [[['B:-1:afterThrowing', 'A:-2:after'], true], ['target!', 'B.afterThrowing', 'A.after', 'threw']]
    ] },
    solution: {
      approach: `<p>This is ${C('ReflectiveMethodInvocation.proceed')} with Spring's advisor ordering: a recursive walk down the chain. Each interceptor decides what to log before calling the next and what to log after it returns or fails.</p>`,
      code: `
class AdviceTrace {
    private static final List<String> KINDS = List.of("around", "before", "after", "afterReturning", "afterThrowing");
    private final List<String[]> chain = new ArrayList<>();      // {aspect, kind}
    private final List<String> log = new ArrayList<>();
    private boolean throwing;

    static List<String> trace(String[] aspects, boolean throwing) {
        AdviceTrace t = new AdviceTrace();
        t.throwing = throwing;
        List<String[]> parsed = new ArrayList<>();
        for (String a : aspects) parsed.add(a.split(":"));
        parsed.sort(Comparator.comparingInt(p -> Integer.parseInt(p[1])));          // stable
        for (String[] p : parsed) {
            List<String> mine = Arrays.asList(p[2].split("\\\\+"));
            for (String k : KINDS) if (mine.contains(k)) t.chain.add(new String[] { p[0], k });
        }
        boolean ok = t.proceed(0);
        t.log.add(ok ? "returned" : "threw");
        return t.log;
    }

    private boolean proceed(int i) {                             // true = returned normally
        if (i == chain.size()) { log.add(throwing ? "target!" : "target"); return !throwing; }
        String n = chain.get(i)[0];
        switch (chain.get(i)[1]) {
            case "around": { log.add(n + ".around>"); boolean ok = proceed(i + 1); if (ok) log.add(n + ".around<"); return ok; }
            case "before": { log.add(n + ".before"); return proceed(i + 1); }
            case "after": { boolean ok = proceed(i + 1); log.add(n + ".after"); return ok; }
            case "afterReturning": { boolean ok = proceed(i + 1); if (ok) log.add(n + ".afterReturning"); return ok; }
            default: { boolean ok = proceed(i + 1); if (!ok) log.add(n + ".afterThrowing"); return ok; }
        }
    }
}`,
      complexity: `<p>O(k log k) to sort and O(k) to run a chain of k interceptors.</p>`,
      followUps: ['What if two aspects share the same @Order value?', 'How would an @Around that catches the exception and returns a fallback change the rest of the trace?']
    }
  });

  practice.push({
    title: 'Evaluate @Profile Expressions',
    level: 'Medium', tags: ['profiles', 'parsing', 'recursive descent'], companies: ['Red Hat', 'IBM', 'Spotify'],
    statement: `<p>Implement ${C('matches(expr, active)')} for ${C('@Profile')} expressions. Grammar: profile names (letters, digits, ${C('.')}, ${C('-')}, ${C('_')}), ${C('!')} (not), ${C('&')} (and), ${C('|')} (or) and parentheses; spaces are ignored. Within one parenthesis level only one kind of binary operator may appear — ${C('"a & b | c"')} is malformed. Return ${C('"true"')}, ${C('"false"')} or ${C('"invalid"')} (malformed, unbalanced or empty). With no active profiles, the profile ${C('default')} is active.</p>`,
    constraints: `Expression length ≤ 500.`,
    example: `${H.table(['expression', 'active', 'result'], [[C('prod & (us | eu)'), C('[prod, eu]'), H.c('g', 'true')], [C('!(dev | test)'), C('[test]'), H.c('r', 'false')], [C('a & b | c'), C('[a]'), H.c('y', 'invalid')], [C('default'), C('[]'), H.c('g', 'true')]])}`,
    brute: { why: `<p>Checking ${C('expr.contains(profile)')} for each active profile says ${C('"!prod"')} matches ${C('prod')} and ${C('"production"')} matches ${C('prod')}. Profile expressions need real parsing.</p>`, code: `
class ContainsCheck {
    static boolean matches(String expr, Set<String> active) {
        for (String p : active) if (expr.contains(p)) return true;   // wrong for !, &, substrings
        return false;
    }
}` },
    mcq: { q: 'How should you write "prod and (us or eu)" so Spring accepts it?', options: ['prod & (us | eu)', 'prod & us | eu', 'prod AND (us OR eu)', 'prod, (us | eu)'], answer: 0, explain: 'Spring\'s Profiles parser supports &, |, ! and parentheses, and rejects mixing & and | without parentheses.' },
    hints: [`<p>Hint 1: Tokenize first: names, ${C('!')}, ${C('&')}, ${C('|')}, ${C('(')}, ${C(')')}; any other character → invalid.</p>`, `<p>Hint 2: ${C('expr := unary (op unary)*')} where every op in the loop must equal the first op; ${C('unary := "!" unary | "(" expr ")" | name')}.</p>`, `<p>Hint 3: Signal malformed input with an exception, and after parsing check that all tokens were consumed (to catch a stray ${C(')')}).</p>`],
    tests: { sig: 'string string[] -> string', fn: 'matches', cases: [
      [['prod', ['prod']], 'true'],
      [['!prod', ['dev']], 'true'],
      [['prod & cloud', ['prod']], 'false'],
      [['prod | cloud', ['cloud']], 'true'],
      [['prod & (us | eu)', ['prod', 'eu']], 'true'],
      [['a & b | c', ['a']], 'invalid'],
      [['default', []], 'true'],
      [['!(dev | test)', ['test']], 'false'],
      [['(prod', ['prod']], 'invalid'],
      [['', []], 'invalid'],
      [['dev', []], 'false'],
      [['prod)', ['prod']], 'invalid'],
      [['(a | b) & !(c & d)', ['b', 'c']], 'true'],
      [['eu-west.1', ['eu-west.1']], 'true']
    ] },
    solution: {
      approach: `<p>A small recursive-descent parser that evaluates as it parses. Each parenthesis level remembers the first binary operator it saw and rejects the other one, matching Spring's "Malformed profile expression" rule.</p>`,
      code: `
class ProfileExpression {
    private final List<String> tokens = new ArrayList<>();
    private final Set<String> active;
    private int pos;

    private ProfileExpression(String expr, Set<String> active) {
        this.active = active;
        int i = 0;
        while (i < expr.length()) {
            char c = expr.charAt(i);
            if (c == ' ') { i++; continue; }
            if ("!&|()".indexOf(c) >= 0) { tokens.add(String.valueOf(c)); i++; continue; }
            int j = i;
            while (j < expr.length() && (Character.isLetterOrDigit(expr.charAt(j)) || ".-_".indexOf(expr.charAt(j)) >= 0)) j++;
            if (j == i) throw new IllegalStateException("bad char");
            tokens.add(expr.substring(i, j));
            i = j;
        }
    }

    static String matches(String expr, String[] activeProfiles) {
        Set<String> active = activeProfiles.length == 0 ? Set.of("default") : new HashSet<>(Arrays.asList(activeProfiles));
        try {
            ProfileExpression p = new ProfileExpression(expr, active);
            boolean v = p.expr();
            if (p.pos != p.tokens.size()) return "invalid";
            return String.valueOf(v);
        } catch (IllegalStateException e) {
            return "invalid";
        }
    }

    private boolean expr() {
        boolean value = unary();
        String op = null;
        while (pos < tokens.size() && (peek().equals("&") || peek().equals("|"))) {
            String t = tokens.get(pos++);
            if (op != null && !op.equals(t)) throw new IllegalStateException("Malformed profile expression");
            op = t;
            boolean rhs = unary();                        // always parse, so syntax errors are found
            value = t.equals("&") ? value && rhs : value || rhs;
        }
        return value;
    }

    private boolean unary() {
        if (pos >= tokens.size()) throw new IllegalStateException("unexpected end");
        String t = tokens.get(pos++);
        if (t.equals("!")) return !unary();
        if (t.equals("(")) {
            boolean v = expr();
            if (pos >= tokens.size() || !tokens.get(pos++).equals(")")) throw new IllegalStateException("missing )");
            return v;
        }
        if ("&|)".contains(t)) throw new IllegalStateException("unexpected " + t);
        return active.contains(t);
    }

    private String peek() { return tokens.get(pos); }
}`,
      complexity: `<p>O(L) for an expression of length L.</p>`,
      followUps: ['How does @Profile({"a", "b"}) combine its values?', 'How do profile groups (spring.profiles.group.*) expand before matching?']
    }
  });

  practice.push({
    title: 'Commit or Roll Back? Rollback Rules',
    level: 'Medium', tags: ['@Transactional', 'rollback rules', 'class hierarchy'], companies: ['Barclays', 'Citi', 'Stripe'],
    statement: `<p>Decide what ${C('@Transactional')} does when a method throws ${C('thrown')}. ${C('hierarchy')} lists ${C('"Child:Parent"')} pairs; the built-in pairs ${C('RuntimeException:Exception')}, ${C('Exception:Throwable')} and ${C('Error:Throwable')} always exist. Rules are ${C('rollbackFor')} entries followed by ${C('noRollbackFor')} entries (class names).</p>
<ul><li>Depth of a rule = number of steps up from ${C('thrown')} to the rule's class (0 = same class); a rule that is not an ancestor does not match.</li>
<li>The matching rule with the <b>smallest</b> depth wins (the first such rule on ties).</li>
<li>No matching rule → default: roll back for ${C('RuntimeException')} and ${C('Error')} subclasses, commit for checked exceptions.</li></ul>
<p>Return ${C('"rollback"')} or ${C('"commit"')}.</p>`,
    constraints: `≤ 200 hierarchy pairs, no cycles.`,
    example: `<p>${C('PaymentDeclined → BusinessException → Exception')}, ${C('rollbackFor = Exception')}, ${C('noRollbackFor = BusinessException')}: depths 2 and 1 → ${H.c('g', 'commit')} (the closer rule wins).</p>`,
    brute: { why: `<p>Checking "is it in rollbackFor? then rollback; is it in noRollbackFor? then commit" in a fixed order ignores the hierarchy distance — a broad ${C('rollbackFor = Exception')} would override a precise ${C('noRollbackFor')}.</p>`, code: `
class FirstListWins {
    static String outcome(String thrown, List<String> rollbackFor, List<String> noRollbackFor) {
        if (rollbackFor.contains(thrown)) return "rollback";
        if (noRollbackFor.contains(thrown)) return "commit";
        return thrown.endsWith("Exception") ? "commit" : "rollback";   // guesses
    }
}` },
    mcq: { q: 'A @Transactional method throws java.io.IOException and has no rollback rules. What happens?', options: ['The transaction commits — checked exceptions do not trigger rollback by default', 'It rolls back', 'Spring wraps it into a RuntimeException and rolls back', 'The transaction is left open'], answer: 0, explain: 'DefaultTransactionAttribute.rollbackOn returns true only for RuntimeException and Error (EJB convention).' },
    hints: [`<p>Hint 1: Build a parent map including the three built-in pairs; ${C('depth(thrown, rule)')} walks parents counting steps.</p>`, `<p>Hint 2: Scan rollbackFor then noRollbackFor, keeping the rule with strictly smaller depth.</p>`, `<p>Hint 3: Without a winner, walk up from thrown and roll back if you meet RuntimeException or Error.</p>`],
    tests: { sig: 'string[] string string[] string[] -> string', fn: 'outcome', cases: [
      [[['IllegalStateException:RuntimeException'], 'IllegalStateException', [], []], 'rollback'],
      [[['IOException:Exception'], 'IOException', [], []], 'commit'],
      [[['IOException:Exception'], 'IOException', ['Exception'], []], 'rollback'],
      [[['OutOfMemoryError:VirtualMachineError', 'VirtualMachineError:Error'], 'OutOfMemoryError', [], []], 'rollback'],
      [[['OptimisticLockException:PersistenceException', 'PersistenceException:RuntimeException'], 'OptimisticLockException', [], ['PersistenceException']], 'commit'],
      [[['PaymentDeclined:BusinessException', 'BusinessException:Exception'], 'PaymentDeclined', ['Exception'], ['BusinessException']], 'commit'],
      [[['CardExpired:PaymentDeclined', 'PaymentDeclined:BusinessException', 'BusinessException:Exception'], 'CardExpired', ['PaymentDeclined'], ['BusinessException']], 'rollback'],
      [[[], 'Exception', [], []], 'commit'],
      [[[], 'RuntimeException', [], ['RuntimeException']], 'commit'],
      [[['TimeoutException:Exception'], 'TimeoutException', ['IOException'], []], 'commit']
    ] },
    solution: {
      approach: `<p>This is ${C('RuleBasedTransactionAttribute.rollbackOn')}: compute each rule's depth from the thrown type, keep the shallowest match, and fall back to the default "unchecked rolls back" rule.</p>`,
      code: `
class RollbackRules {
    static String outcome(String[] hierarchy, String thrown, String[] rollbackFor, String[] noRollbackFor) {
        Map<String, String> parent = new HashMap<>(Map.of(
                "RuntimeException", "Exception", "Exception", "Throwable", "Error", "Throwable"));
        for (String h : hierarchy) { String[] p = h.split(":"); parent.put(p[0], p[1]); }
        Boolean winner = null;
        int best = Integer.MAX_VALUE;
        for (String r : rollbackFor) { int d = depth(thrown, r, parent); if (d >= 0 && d < best) { best = d; winner = true; } }
        for (String r : noRollbackFor) { int d = depth(thrown, r, parent); if (d >= 0 && d < best) { best = d; winner = false; } }
        if (winner == null)                                                  // default rule
            winner = depth(thrown, "RuntimeException", parent) >= 0 || depth(thrown, "Error", parent) >= 0;
        return winner ? "rollback" : "commit";
    }

    private static int depth(String type, String rule, Map<String, String> parent) {
        int d = 0;
        for (String t = type; t != null; t = parent.get(t), d++) if (t.equals(rule)) return d;
        return -1;
    }
}`,
      complexity: `<p>O(R × H) for R rules and hierarchy height H.</p>`,
      followUps: ['How does rollbackForClassName pattern matching differ from class-based rules?', 'Why might a framework exception translator change which rule matches?']
    }
  });

  /* ======================================================================
     PRACTICE — Hard
     ====================================================================== */
  practice.push({
    title: 'All Seven Propagation Levels, With Savepoints',
    level: 'Hard', tags: ['@Transactional', 'propagation', 'NESTED', 'interpreter'], companies: ['Goldman Sachs', 'Revolut', 'Oracle'],
    statement: `<p>Extend the call-tree simulator from the transactions topic (same syntax: ${C('w:X')}, ${C('throw')}, ${C('PROP { ... }')}, ${C('try PROP { ... }')}; same log lines for begin, join, suspend/resume, commit, rollback, rollback-only, caught and result) to all propagation levels:</p>
<ul><li>${C('REQUIRED')}: join if a tx is active, else begin. ${C('REQUIRES_NEW')}: suspend any active tx and begin.</li>
<li>${C('SUPPORTS')}: join if active (with ${C('"join Tn"')}); else run without a transaction.</li>
<li>${C('MANDATORY')}: join if active; else the method does not run and the call throws ${C('IllegalTransactionStateException')}.</li>
<li>${C('NEVER')}: if a tx is active the call throws ${C('IllegalTransactionStateException')} without running; else run without one.</li>
<li>${C('NOT_SUPPORTED')}: if active, ${C('"suspend Tn"')}, run without a transaction, ${C('"resume Tn"')}; else just run.</li>
<li>${C('NESTED')}: with an active tx, log ${C('"savepoint Tn"')}, run the body in the same tx; on exception discard the writes made since the savepoint and log ${C('"rollback to savepoint Tn"')} (the outer tx is <b>not</b> marked rollback-only), else log ${C('"release savepoint Tn"')}. Without a tx it behaves like REQUIRED.</li></ul>
<p>Any participating (joined) method that throws marks the shared tx rollback-only, as before. Exceptions thrown by non-transactional execution do not affect anything else.</p>`,
    constraints: `Script ≤ 300 tokens, nesting ≤ 30.`,
    example: `<p>${C('REQUIRED { w:a try NESTED { w:b throw } w:c }')} → ${H.c('g', C('[begin T1, savepoint T1, rollback to savepoint T1, caught RuntimeException, commit T1 [a, c], result ok]'))}. With REQUIRED instead of NESTED the outer transaction would be poisoned; the savepoint undoes only b.</p>`,
    brute: { why: `<p>Treating NESTED as REQUIRES_NEW gets the "outer survives" part right but commits the inner work independently (it should be part of the outer commit) and needs a second connection. Treating it as REQUIRED poisons the outer transaction.</p>`, code: `
class NestedAsNew {
    static String nested(boolean innerFails) {
        return innerFails ? "inner rolled back separately" : "inner committed separately";   // wrong: should join the outer commit
    }
}` },
    mcq: { q: 'What does NESTED propagation need from the transaction manager to work with JDBC?', options: ['Savepoint support on the same connection (DataSourceTransactionManager supports it; JPA needs special handling)', 'A second connection from the pool', 'XA / JTA', 'Nothing; it is identical to REQUIRES_NEW'], answer: 0, explain: 'NESTED uses JDBC savepoints inside the existing physical transaction. JpaTransactionManager only supports it for JDBC access, not for EntityManager state.' },
    hints: [`<p>Hint 1: Reuse the tree parser and ${C('exec')}; only ${C('call(prop, body)')} grows. Write small helpers: ${C('join(tx, body)')}, ${C('newTx(outer, body)')} and ${C('noTx(body)')}.</p>`, `<p>Hint 2: For NESTED, remember ${C('int mark = tx.writes.size()')} and on failure remove writes from the end down to the mark.</p>`, `<p>Hint 3: For NOT_SUPPORTED set ${C('current = null')} while the body runs and restore it afterwards; MANDATORY/NEVER failures return the exception name without logging anything else.</p>`],
    tests: { sig: 'string -> list<string>', fn: 'run', cases: [
      [['REQUIRED { w:a MANDATORY { w:b } }'], ['begin T1', 'join T1', 'commit T1 [a, b]', 'result ok']],
      [['MANDATORY { w:a }'], ['result IllegalTransactionStateException']],
      [['REQUIRED { w:a try NEVER { w:b } w:c }'], ['begin T1', 'caught IllegalTransactionStateException', 'commit T1 [a, c]', 'result ok']],
      [['REQUIRED { w:a try NESTED { w:b throw } w:c }'], ['begin T1', 'savepoint T1', 'rollback to savepoint T1', 'caught RuntimeException', 'commit T1 [a, c]', 'result ok']],
      [['REQUIRED { w:a NESTED { w:b } }'], ['begin T1', 'savepoint T1', 'release savepoint T1', 'commit T1 [a, b]', 'result ok']],
      [['NESTED { w:a }'], ['begin T1', 'commit T1 [a]', 'result ok']],
      [['SUPPORTS { w:a throw }'], ['autocommit a', 'result RuntimeException']],
      [['REQUIRED { try SUPPORTS { throw } }'], ['begin T1', 'join T1', 'mark rollback-only T1', 'caught RuntimeException', 'rollback T1 (rollback-only)', 'result UnexpectedRollbackException']],
      [['REQUIRED { w:a NOT_SUPPORTED { w:b } w:c }'], ['begin T1', 'suspend T1', 'autocommit b', 'resume T1', 'commit T1 [a, c]', 'result ok']],
      [['REQUIRED { w:a try NOT_SUPPORTED { throw } }'], ['begin T1', 'suspend T1', 'resume T1', 'caught RuntimeException', 'commit T1 [a]', 'result ok']],
      [['NEVER { w:a }'], ['autocommit a', 'result ok']],
      [['REQUIRED { w:a REQUIRES_NEW { w:b try NESTED { w:c throw } } }'], ['begin T1', 'suspend T1', 'begin T2', 'savepoint T2', 'rollback to savepoint T2', 'caught RuntimeException', 'commit T2 [b]', 'resume T1', 'commit T1 [a]', 'result ok']],
      [['REQUIRED { w:a try MANDATORY { w:b throw } }'], ['begin T1', 'join T1', 'mark rollback-only T1', 'caught RuntimeException', 'rollback T1 (rollback-only)', 'result UnexpectedRollbackException']]
    ] },
    solution: {
      approach: `<p>Same interpreter, richer ${C('call')}: each propagation level is a combination of four primitives — join (participate, poison on failure), new (suspend + begin + complete + resume), none (optionally suspending) and savepoint (partial undo). This mirrors ${C('AbstractPlatformTransactionManager.handleExistingTransaction')} and ${C('getTransaction')}.</p>`,
      code: `
class PropagationSimulator {
    static final class Tx {
        final int id; final List<String> writes = new ArrayList<>(); boolean rollbackOnly;
        Tx(int id) { this.id = id; }
    }
    static final class Node {
        final String kind, arg; final boolean caught; final List<Node> body;
        Node(String kind, String arg, boolean caught, List<Node> body) { this.kind = kind; this.arg = arg; this.caught = caught; this.body = body; }
    }
    private static final String ILLEGAL = "IllegalTransactionStateException";

    private final List<String> log = new ArrayList<>();
    private Tx current;
    private int nextId = 1;
    private String[] tok;
    private int pos;

    static List<String> run(String script) {
        PropagationSimulator s = new PropagationSimulator();
        s.tok = script.isBlank() ? new String[0] : script.trim().split("\\\\s+");
        String ex = s.exec(s.parseBody());
        s.log.add("result " + (ex == null ? "ok" : ex));
        return s.log;
    }

    private List<Node> parseBody() {
        List<Node> body = new ArrayList<>();
        while (pos < tok.length && !tok[pos].equals("}")) {
            String t = tok[pos++];
            if (t.startsWith("w:")) body.add(new Node("write", t.substring(2), false, null));
            else if (t.equals("throw")) body.add(new Node("throw", null, false, null));
            else {
                boolean caught = t.equals("try");
                String prop = caught ? tok[pos++] : t;
                pos++;
                List<Node> inner = parseBody();
                pos++;
                body.add(new Node("call", prop, caught, inner));
            }
        }
        return body;
    }

    private String exec(List<Node> body) {
        for (Node n : body) {
            String ex = null;
            if (n.kind.equals("write")) {
                if (current != null) current.writes.add(n.arg); else log.add("autocommit " + n.arg);
            } else if (n.kind.equals("throw")) {
                ex = "RuntimeException";
            } else {
                ex = call(n.arg, n.body);
                if (ex != null && n.caught) { log.add("caught " + ex); ex = null; }
            }
            if (ex != null) return ex;
        }
        return null;
    }

    private String call(String prop, List<Node> body) {
        Tx outer = current;
        switch (prop) {
            case "REQUIRED":      return outer != null ? join(outer, body) : newTx(null, body);
            case "REQUIRES_NEW":  return newTx(outer, body);
            case "SUPPORTS":      return outer != null ? join(outer, body) : exec(body);
            case "MANDATORY":     return outer != null ? join(outer, body) : ILLEGAL;
            case "NEVER":         return outer != null ? ILLEGAL : exec(body);
            case "NOT_SUPPORTED": {
                if (outer == null) return exec(body);
                log.add("suspend T" + outer.id);
                current = null;
                String ex = exec(body);
                current = outer;
                log.add("resume T" + outer.id);
                return ex;
            }
            case "NESTED": {
                if (outer == null) return newTx(null, body);
                log.add("savepoint T" + outer.id);
                int mark = outer.writes.size();
                String ex = exec(body);
                if (ex != null) {
                    while (outer.writes.size() > mark) outer.writes.remove(outer.writes.size() - 1);
                    log.add("rollback to savepoint T" + outer.id);
                } else {
                    log.add("release savepoint T" + outer.id);
                }
                return ex;
            }
            default: throw new IllegalArgumentException(prop);
        }
    }

    private String join(Tx tx, List<Node> body) {
        log.add("join T" + tx.id);
        String ex = exec(body);
        if (ex != null) { tx.rollbackOnly = true; log.add("mark rollback-only T" + tx.id); }
        return ex;
    }

    private String newTx(Tx outer, List<Node> body) {
        if (outer != null) log.add("suspend T" + outer.id);
        Tx tx = new Tx(nextId++);
        log.add("begin T" + tx.id);
        current = tx;
        String ex = exec(body);
        current = outer;
        if (ex != null) log.add("rollback T" + tx.id);
        else if (tx.rollbackOnly) { log.add("rollback T" + tx.id + " (rollback-only)"); ex = "UnexpectedRollbackException"; }
        else log.add("commit T" + tx.id + " " + tx.writes);
        if (outer != null) log.add("resume T" + outer.id);
        return ex;
    }
}`,
      complexity: `<p>O(tokens) plus the cost of undoing writes at savepoints (each write is undone at most once per level).</p>`,
      followUps: ['Why does JpaTransactionManager not support NESTED for entity changes?', 'Which propagation would you pick for an audit log that must survive a business rollback, and what does it cost under load?']
    }
  });

  practice.push({
    title: 'Circular References Through the Three-Level Cache',
    level: 'Hard', tags: ['circular dependencies', 'singleton cache', 'BeanPostProcessor'], companies: ['Alibaba', 'VMware', 'Microsoft'],
    statement: `<p>Simulate singleton creation. Beans are ${C('"name:mode:deps:proxy"')}: mode ${C('field')} or ${C('ctor')}, deps a comma list (maybe empty), proxy ${C('none')}, ${C('aop')} (wrapped by the auto-proxy creator, which supports early references) or ${C('async')} (wrapped after init by a BPP without early-reference support). ${C('allowCircular')} mirrors ${C('spring.main.allow-circular-references')}. Beans are requested in input order.</p>
<p>${C('getBean(x)')}: return a finished singleton; else a stored early reference; else, if x has a singleton factory, create the early reference (${C('"proxy"')} for aop, else ${C('"raw"')}), store it and remove the factory; else if x is in creation → error; else create x:</p>
<ol><li>mark in creation; for ctor mode resolve deps now (log ${C('"inject D into X: <ref>"')} for each);</li>
<li>instantiate; if allowCircular, register x's singleton factory;</li>
<li>for field mode resolve deps now (same log);</li>
<li>exposed object: ${C('"proxy"')} for aop or async, else ${C('"raw"')}; if an early reference to x was handed out and differs from the exposed object → error with ${C('" (raw version injected)"')};</li>
<li>log ${C('"created X: <exposed>"')}.</li></ol>
<p>On error, append ${C('"error BeanCurrentlyInCreationException: X"')} (plus the suffix if any) and stop.</p>`,
    constraints: `≤ 200 beans; all deps exist.`,
    example: `<p>${C('["a:field:b:aop", "b:field:a:none"]')}, allowCircular → ${H.c('g', C('[inject a into b: proxy, created b: raw, inject b into a: raw, created a: proxy]'))}: b received A's early <b>proxy</b>, the same object A finally exposes. With ${C('async')} instead of ${C('aop')}, b holds the raw A while A ends up proxied → error.</p>`,
    brute: { why: `<p>A container that simply recurses (create dependency, then the bean) loops forever or overflows on any cycle; one that just forbids cycles cannot explain why field cycles worked for years while constructor cycles never did.</p>`, code: `
class NaiveRecursiveFactory {
    Map<String, List<String>> deps = new HashMap<>();
    Map<String, Object> done = new HashMap<>();
    Object getBean(String n) {
        if (done.containsKey(n)) return done.get(n);
        for (String d : deps.get(n)) getBean(d);           // a <-> b: StackOverflowError
        Object o = new Object(); done.put(n, o); return o;
    }
}` },
    mcq: { q: 'Why can field-injection cycles be resolved but constructor-injection cycles cannot?', options: ['With field injection the bean is instantiated (and its early reference exposed) before dependencies are injected; a constructor needs the dependency before any instance exists', 'Constructors are slower', 'Field injection uses CGLIB', 'Because Spring Boot forbids constructors in cycles by configuration'], answer: 0, explain: 'The singleton factory is registered after instantiation, so only references requested after the constructor can be satisfied early.' },
    hints: [`<p>Hint 1: Keep the three maps exactly like Spring: finished singletons, early references, and a set of names that have a factory (the factory's result only depends on the proxy kind).</p>`, `<p>Hint 2: Remember which beans had their early reference taken. At the end of creation compare that early reference with the exposed object.</p>`, `<p>Hint 3: Use an exception to abort from deep recursion; catch it once at the top and append the error line to the log built so far.</p>`],
    tests: { sig: 'string[] bool -> list<string>', fn: 'create', cases: [
      [[['a:field:b:none', 'b:field:a:none'], true], ['inject a into b: raw', 'created b: raw', 'inject b into a: raw', 'created a: raw']],
      [[['a:field:b:none', 'b:field:a:none'], false], ['error BeanCurrentlyInCreationException: a']],
      [[['a:ctor:b:none', 'b:ctor:a:none'], true], ['error BeanCurrentlyInCreationException: a']],
      [[['a:field:b:aop', 'b:field:a:none'], true], ['inject a into b: proxy', 'created b: raw', 'inject b into a: raw', 'created a: proxy']],
      [[['a:field:b:async', 'b:field:a:none'], true], ['inject a into b: raw', 'created b: raw', 'inject b into a: raw', 'error BeanCurrentlyInCreationException: a (raw version injected)']],
      [[['a:field:b:async', 'b:field::none'], true], ['created b: raw', 'inject b into a: raw', 'created a: proxy']],
      [[['a:ctor:b:none', 'b:field:a:none'], true], ['error BeanCurrentlyInCreationException: a']],
      [[['b:field:a:none', 'a:ctor:b:none'], true], ['inject b into a: raw', 'created a: raw', 'inject a into b: raw', 'created b: raw']],
      [[[], true], []],
      [[['a:ctor:b,c:aop', 'b:field::none', 'c:ctor:b:none'], false], ['created b: raw', 'inject b into a: raw', 'inject b into c: raw', 'created c: raw', 'inject c into a: raw', 'created a: proxy']]
    ] },
    solution: {
      approach: `<p>Implement ${C('DefaultSingletonBeanRegistry.getSingleton(name, allowEarlyReference)')} and the relevant parts of ${C('doCreateBean')}: the factory is registered after instantiation, populate happens after that, and the final "raw version injected" check compares the early reference with the exposed object. AOP proxies created early are reused (the creator remembers them), async proxies are not.</p>`,
      code: `
class CircularResolver {
    static final class Def { String name, mode, proxy; List<String> deps; }
    static final class CreationError extends RuntimeException { CreationError(String m) { super(m); } }

    private final Map<String, Def> defs = new LinkedHashMap<>();
    private final Map<String, String> singletons = new HashMap<>();        // level 1
    private final Map<String, String> early = new HashMap<>();             // level 2
    private final Set<String> factories = new HashSet<>();                 // level 3
    private final Set<String> inCreation = new HashSet<>();
    private final List<String> log = new ArrayList<>();
    private boolean allowCircular;

    static List<String> create(String[] beans, boolean allowCircular) {
        CircularResolver r = new CircularResolver();
        r.allowCircular = allowCircular;
        for (String b : beans) {
            String[] p = b.split(":", -1);
            Def d = new Def();
            d.name = p[0]; d.mode = p[1]; d.proxy = p[3];
            d.deps = p[2].isEmpty() ? List.of() : Arrays.asList(p[2].split(","));
            r.defs.put(d.name, d);
        }
        try {
            for (String n : r.defs.keySet()) r.getBean(n);
        } catch (CreationError e) {
            r.log.add("error BeanCurrentlyInCreationException: " + e.getMessage());
        }
        return r.log;
    }

    private String getBean(String name) {
        if (singletons.containsKey(name)) return singletons.get(name);
        if (early.containsKey(name)) return early.get(name);
        if (factories.remove(name)) {                                      // level 3 -> level 2
            String ref = defs.get(name).proxy.equals("aop") ? "proxy" : "raw";  // getEarlyBeanReference
            early.put(name, ref);
            return ref;
        }
        if (inCreation.contains(name)) throw new CreationError(name);
        return createBean(defs.get(name));
    }

    private String createBean(Def d) {
        inCreation.add(d.name);
        if (d.mode.equals("ctor")) inject(d);                                // constructor arguments
        if (allowCircular) factories.add(d.name);                            // addSingletonFactory
        if (d.mode.equals("field")) inject(d);                               // populateBean
        String exposed = d.proxy.equals("none") ? "raw" : "proxy";           // postProcessAfterInitialization
        String earlyRef = early.get(d.name);
        if (earlyRef != null && !earlyRef.equals(exposed))
            throw new CreationError(d.name + " (raw version injected)");
        inCreation.remove(d.name);
        factories.remove(d.name);
        early.remove(d.name);
        singletons.put(d.name, exposed);
        log.add("created " + d.name + ": " + exposed);
        return exposed;
    }

    private void inject(Def d) {
        for (String dep : d.deps) log.add("inject " + dep + " into " + d.name + ": " + getBean(dep));
    }
}`,
      complexity: `<p>O(V + E): every bean is created once and every dependency edge resolved once.</p>`,
      followUps: ['How do @Lazy injection points break a constructor cycle?', 'Why did Spring Boot 2.6 disable circular references by default?', 'Which other BPPs (besides @Async) can cause the raw-version error?']
    }
  });

  practice.push({
    title: 'An @Async Proxy with Futures and an Uncaught-Exception Handler',
    level: 'Hard', tags: ['@Async', 'java.lang.reflect.Proxy', 'CompletableFuture', 'executors'], companies: ['Uber', 'LinkedIn', 'Atlassian'],
    statement: `<p>Build the core of ${C('AsyncExecutionInterceptor')} with a JDK proxy:</p>
<ul><li>Define ${C('@AsyncLite')} (runtime retention, on methods).</li>
<li>${C('AsyncProxyFactory.create(target, iface, executor, uncaught)')} returns a proxy. A call is asynchronous when the interface method <b>or</b> the target's implementing method carries ${C('@AsyncLite')}; otherwise it runs directly on the caller (exceptions unwrapped).</li>
<li>Async method returning ${C('CompletableFuture')}: submit the call to the executor and immediately return a <b>new</b> future that completes with the target future's result, or exceptionally with the exception the method threw.</li>
<li>Async method with any other return type (normally ${C('void')}): submit and return ${C('null')}; an exception is passed to ${C('uncaught.accept(method, exception)')}.</li></ul>
<p>Self-invocation inside the target is, as in Spring, not intercepted.</p>`,
    constraints: `Use only java.lang.reflect and java.util.concurrent. Do not block the caller.`,
    example: `<p>${C('proxy.send("ana").get()')} → ${H.c('g', '"ana@async-1"')} (ran on the executor thread). ${C('proxy.sendAllThenReport("bo")')}, whose target calls ${C('this.send(...)')}, returns ${H.c('y', '"bo@main"')}: the inner call ran on the caller's thread.</p>`,
    brute: { why: `<p>Wrapping every call in ${C('executor.submit(...).get()')} technically uses another thread but blocks the caller, so nothing is concurrent; and it loses the difference between void (fire and forget) and future-returning methods.</p>`, code: `
class BlockingAsync {
    static Object call(ExecutorService ex, Callable<Object> task) throws Exception {
        return ex.submit(task).get();                      // caller waits: not asynchronous at all
    }
}` },
    mcq: { q: 'An @Async void method throws an exception. Where does it go in Spring?', options: ['To the AsyncUncaughtExceptionHandler (by default it is logged); the caller never sees it', 'It is rethrown in the caller thread', 'It completes a hidden future that the caller can join', 'It crashes the JVM'], answer: 0, explain: 'There is no future to carry the failure, so Spring hands it to the configured AsyncUncaughtExceptionHandler (SimpleAsyncUncaughtExceptionHandler logs it).' },
    hints: [`<p>Hint 1: In the handler, look up the implementing method with ${C('target.getClass().getMethod(m.getName(), m.getParameterTypes())')} and check both for the annotation.</p>`, `<p>Hint 2: For ${C('CompletableFuture')} returns, create ${C('result = new CompletableFuture<>()')}; in the task, invoke the target, then ${C('whenComplete')} its future into ${C('result')}; catch ${C('InvocationTargetException')} and complete exceptionally with ${C('getCause()')}.</p>`, `<p>Hint 3: Delegate ${C('Object')} methods (${C('toString')}, ${C('hashCode')}, ${C('equals')}) directly to the target, and always unwrap ${C('InvocationTargetException')} on the synchronous path.</p>`],
    tests: { sig: 'string -> string', fn: 'chk', harness: { java: `
interface Mailer {
  @AsyncLite CompletableFuture<String> send(String to);
  @AsyncLite void sendAndForget(String to);
  String sendAllThenReport(String to);
  @AsyncLite CompletableFuture<String> fail(String to);
  String sync();
  CompletableFuture<String> report();
}
class MailerImpl implements Mailer {
  public CompletableFuture<String> send(String to) { return CompletableFuture.completedFuture(to + "@" + Thread.currentThread().getName()); }
  public void sendAndForget(String to) { if (to.isEmpty()) throw new IllegalArgumentException("no recipient"); }
  public String sendAllThenReport(String to) { return this.send(to).join(); }
  public CompletableFuture<String> fail(String to) { throw new IllegalStateException("smtp down"); }
  public String sync() { if (Thread.currentThread().getName().equals("async-1")) return "wrong thread"; return "caller"; }
  @AsyncLite public CompletableFuture<String> report() { return CompletableFuture.completedFuture(Thread.currentThread().getName()); }
}
class Check {
  static String chk(String kind) throws Exception {
    ExecutorService ex = Executors.newSingleThreadExecutor(r -> new Thread(r, "async-1"));
    List<String> errors = new CopyOnWriteArrayList<>();
    Mailer m = AsyncProxyFactory.create(new MailerImpl(), Mailer.class, ex, (method, t) -> errors.add(method.getName() + ":" + t.getMessage()));
    String caller = Thread.currentThread().getName();
    try {
      switch (kind) {
        case "async": return m.send("ana").get(5, TimeUnit.SECONDS);
        case "self": return String.valueOf(m.sendAllThenReport("bo").equals("bo@" + caller));
        case "sync": return m.sync();
        case "implAnnotated": return m.report().get(5, TimeUnit.SECONDS);
        case "voidOk": { m.sendAndForget("x"); ex.shutdown(); ex.awaitTermination(5, TimeUnit.SECONDS); return "errors=" + errors; }
        case "voidError": { m.sendAndForget(""); ex.shutdown(); ex.awaitTermination(5, TimeUnit.SECONDS); return "errors=" + errors; }
        case "futureError": {
          try { m.fail("x").get(5, TimeUnit.SECONDS); return "no error"; }
          catch (ExecutionException e) { return e.getCause().getClass().getSimpleName() + ":" + e.getCause().getMessage(); }
        }
        case "notBlocked": {
          CountDownLatch gate = new CountDownLatch(1);
          ex.execute(() -> { try { gate.await(); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); } });
          CompletableFuture<String> f = m.send("z");
          boolean doneBefore = f.isDone();
          gate.countDown();
          return doneBefore + " " + f.get(5, TimeUnit.SECONDS);
        }
        default: return m.toString().startsWith("MailerImpl") ? "toString delegated" : "toString not delegated";
      }
    } finally {
      ex.shutdownNow();
    }
  }
}` }, cases: [
      [['async'], 'ana@async-1'],
      [['self'], 'true'],
      [['sync'], 'caller'],
      [['implAnnotated'], 'async-1'],
      [['voidOk'], 'errors=[]'],
      [['voidError'], 'errors=[sendAndForget:no recipient]'],
      [['futureError'], 'IllegalStateException:smtp down'],
      [['notBlocked'], 'false z@async-1'],
      [['toString'], 'toString delegated']
    ] },
    solution: {
      approach: `<p>The ${C('InvocationHandler')} plays ${C('AsyncExecutionInterceptor')}: detect the annotation on the interface or implementation method, then either call through synchronously or submit to the executor. A future-returning method gets a bridge future that the worker completes; anything else is fire-and-forget with failures routed to the handler — exactly Spring's contract.</p>`,
      code: `
import java.lang.annotation.*;
import java.lang.reflect.*;

@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
@interface AsyncLite { }

class AsyncProxyFactory {
    static <T> T create(T target, Class<T> iface, Executor executor, BiConsumer<Method, Throwable> uncaught) {
        InvocationHandler handler = (proxy, m, args) -> {
            if (m.getDeclaringClass() == Object.class || !isAsync(target, m)) {
                try { return m.invoke(target, args); }                     // direct call on the caller thread
                catch (InvocationTargetException e) { throw e.getCause(); }
            }
            if (CompletableFuture.class.isAssignableFrom(m.getReturnType())) {
                CompletableFuture<Object> result = new CompletableFuture<>();
                executor.execute(() -> {
                    try {
                        CompletableFuture<?> f = (CompletableFuture<?>) m.invoke(target, args);
                        f.whenComplete((v, err) -> { if (err != null) result.completeExceptionally(err); else result.complete(v); });
                    } catch (InvocationTargetException e) {
                        result.completeExceptionally(e.getCause());
                    } catch (Throwable t) {
                        result.completeExceptionally(t);
                    }
                });
                return result;                                             // caller continues immediately
            }
            executor.execute(() -> {                                       // void: fire and forget
                try { m.invoke(target, args); }
                catch (InvocationTargetException e) { uncaught.accept(m, e.getCause()); }
                catch (Throwable t) { uncaught.accept(m, t); }
            });
            return null;
        };
        return iface.cast(Proxy.newProxyInstance(iface.getClassLoader(), new Class<?>[] { iface }, handler));
    }

    private static boolean isAsync(Object target, Method m) throws NoSuchMethodException {
        if (m.isAnnotationPresent(AsyncLite.class)) return true;
        return target.getClass().getMethod(m.getName(), m.getParameterTypes()).isAnnotationPresent(AsyncLite.class);
    }
}`,
      complexity: `<p>O(1) overhead per call plus one reflective method lookup (Spring caches the decision per method).</p>`,
      followUps: ['How would you propagate MDC/security context to the worker thread?', 'What should happen when the executor rejects the task?', 'Why does Spring return null for async methods with other return types instead of failing?']
    }
  });

  practice.push({
    title: 'Evaluate Auto-Configurations in Order',
    level: 'Hard', tags: ['auto-configuration', 'conditions', 'topological sort'], companies: ['VMware', 'Netflix', 'JetBrains'],
    statement: `<p>Simulate ${C('AutoConfigurationImportSelector')} + ${C('AutoConfigurationSorter')} + condition evaluation. Inputs: user-defined bean types (registered first — user config is parsed before the deferred import), classes on the classpath, properties ${C('"k=v"')}, and auto-configurations ${C('"Name;key=value;..."')} with optional keys ${C('after')}, ${C('before')}, ${C('onClass')}, ${C('onBean')}, ${C('onMissingBean')} (comma lists), ${C('onProperty')} (${C('k=v')}: equal value; or ${C('k')}: present and not ${C('false')}) and ${C('provides')} (bean types registered when applied).</p>
<p><b>Sort:</b> names alphabetically, then a depth-first pass: before emitting X, emit (recursively) every candidate X must follow — X's ${C('after')} entries in declared order, then candidates whose ${C('before')} contains X (alphabetically). Unknown names are ignored. Reaching a class that is still being processed → return only ${C('"error AutoConfigure cycle"')}.</p>
<p><b>Evaluate</b> in sorted order, conditions in the order onClass, onProperty, onBean, onMissingBean; log ${C('"apply N"')} or the first failure: ${C('"skip N: missing class C"')}, ${C('"skip N: property k"')}, ${C('"skip N: no bean T"')}, ${C('"skip N: bean T exists"')}.</p>`,
    constraints: `≤ 300 auto-configurations.`,
    example: `<p>User bean ${C('DataSource')} + ${C('"DataSourceAutoConfiguration;onClass=HikariDataSource;onMissingBean=DataSource;provides=DataSource"')} → ${H.c('y', '"skip DataSourceAutoConfiguration: bean DataSource exists"')}: your bean wins because auto-configuration runs last.</p>`,
    brute: { why: `<p>Evaluating auto-configurations in file order (or ${C('HashMap')} order) makes ${C('@ConditionalOnBean')} results random: a configuration that needs a ${C('DataSource')} may run before the one that provides it.</p>`, code: `
class FileOrderEvaluation {
    static List<String> evaluate(List<String> names, Map<String, String> needs, Set<String> beans, Map<String, String> provides) {
        List<String> out = new ArrayList<>();
        for (String n : names) {                            // no sorting by after/before
            if (needs.containsKey(n) && !beans.contains(needs.get(n))) { out.add("skip " + n); continue; }
            out.add("apply " + n);
            if (provides.containsKey(n)) beans.add(provides.get(n));
        }
        return out;
    }
}` },
    mcq: { q: 'Why does a user-defined DataSource bean make Boot\'s DataSourceAutoConfiguration back off, regardless of package or class names?', options: ['Auto-configurations are imported by a DeferredImportSelector, processed after all user configuration, so @ConditionalOnMissingBean already sees the user bean', 'Spring sorts beans alphabetically', 'User beans are always @Primary', 'Boot scans user packages last'], answer: 0, explain: 'The deferred import guarantees ordering between user configuration and auto-configuration.' },
    hints: [`<p>Hint 1: Parse each auto-configuration into a map of key → value. A ${C('TreeMap')} of name → config gives the alphabetical order for free.</p>`, `<p>Hint 2: DFS with two sets: ${C('processing')} (on the current path) and ${C('done')}. For X, visit "must come before X" candidates first, then append X.</p>`, `<p>Hint 3: Keep a set of registered bean types seeded with the user beans; check conditions in the given order and add ${C('provides')} only for applied configurations.</p>`],
    tests: { sig: 'string[] string[] string[] string[] -> list<string>', fn: 'evaluate', cases: [
      [[['DataSource'], ['HikariDataSource'], [], ['DataSourceAutoConfiguration;onClass=HikariDataSource;onMissingBean=DataSource;provides=DataSource']], ['skip DataSourceAutoConfiguration: bean DataSource exists']],
      [[[], ['HikariDataSource'], [], ['DataSourceAutoConfiguration;onClass=HikariDataSource;onMissingBean=DataSource;provides=DataSource']], ['apply DataSourceAutoConfiguration']],
      [[[], [], [], ['DataSourceAutoConfiguration;onClass=HikariDataSource;onMissingBean=DataSource;provides=DataSource']], ['skip DataSourceAutoConfiguration: missing class HikariDataSource']],
      [[[], [], [], ['CacheAutoConfiguration;onBean=DataSource;provides=CacheManager', 'ZDataSourceAutoConfiguration;provides=DataSource']], ['skip CacheAutoConfiguration: no bean DataSource', 'apply ZDataSourceAutoConfiguration']],
      [[[], [], [], ['CacheAutoConfiguration;after=ZDataSourceAutoConfiguration;onBean=DataSource;provides=CacheManager', 'ZDataSourceAutoConfiguration;provides=DataSource']], ['apply ZDataSourceAutoConfiguration', 'apply CacheAutoConfiguration']],
      [[[], [], [], ['CacheAutoConfiguration;onBean=DataSource;provides=CacheManager', 'ZDataSourceAutoConfiguration;before=CacheAutoConfiguration;provides=DataSource']], ['apply ZDataSourceAutoConfiguration', 'apply CacheAutoConfiguration']],
      [[[], [], ['feature.enabled=false'], ['FeatureAutoConfiguration;onProperty=feature.enabled=true;provides=Feature']], ['skip FeatureAutoConfiguration: property feature.enabled']],
      [[[], [], ['feature.enabled=true'], ['FeatureAutoConfiguration;onProperty=feature.enabled=true;provides=Feature']], ['apply FeatureAutoConfiguration']],
      [[[], [], ['debug=yes'], ['X;onProperty=debug']], ['apply X']],
      [[[], [], ['debug=false'], ['X;onProperty=debug']], ['skip X: property debug']],
      [[[], [], [], ['A;after=B', 'B;after=A']], ['error AutoConfigure cycle']],
      [[[], [], [], ['A;after=Missing']], ['apply A']],
      [[[], [], [], ['BDataSource;onMissingBean=DataSource;provides=DataSource', 'ADataSource;onMissingBean=DataSource;provides=DataSource']], ['apply ADataSource', 'skip BDataSource: bean DataSource exists']],
      [[[], [], [], []], []]
    ] },
    solution: {
      approach: `<p>Two phases, like Boot: <b>sort</b> (alphabetical, then a DFS that honours after/before and detects cycles — ${C('AutoConfigurationSorter.doSortByAfterAnnotation')}) and <b>evaluate</b> (conditions against a growing registry of bean types that starts with the user's beans, because user configuration is parsed before the deferred import).</p>`,
      code: `
class AutoConfigEvaluator {
    private final Map<String, Map<String, String>> cfg = new TreeMap<>();     // alphabetical
    private final List<String> sorted = new ArrayList<>();
    private final Set<String> processing = new HashSet<>(), done = new HashSet<>();

    static List<String> evaluate(String[] userBeans, String[] classpath, String[] props, String[] autoConfigs) {
        AutoConfigEvaluator e = new AutoConfigEvaluator();
        for (String a : autoConfigs) {
            String[] parts = a.split(";");
            Map<String, String> m = new HashMap<>();
            for (int i = 1; i < parts.length; i++) {
                int eq = parts[i].indexOf('=');
                m.put(parts[i].substring(0, eq), parts[i].substring(eq + 1));
            }
            e.cfg.put(parts[0], m);
        }
        try {
            for (String n : e.cfg.keySet()) e.visit(n);
        } catch (IllegalStateException cycle) {
            return List.of("error AutoConfigure cycle");
        }
        Map<String, String> p = new HashMap<>();
        for (String kv : props) { int eq = kv.indexOf('='); p.put(kv.substring(0, eq), kv.substring(eq + 1)); }
        Set<String> cp = new HashSet<>(Arrays.asList(classpath));
        Set<String> beans = new HashSet<>(Arrays.asList(userBeans));          // user config came first
        List<String> out = new ArrayList<>();
        for (String n : e.sorted) {
            String why = e.failure(e.cfg.get(n), cp, p, beans);
            if (why != null) { out.add("skip " + n + ": " + why); continue; }
            out.add("apply " + n);
            beans.addAll(list(e.cfg.get(n).get("provides")));
        }
        return out;
    }

    private void visit(String n) {
        if (done.contains(n)) return;
        if (!processing.add(n)) throw new IllegalStateException("AutoConfigure cycle detected");
        for (String before : mustPrecede(n)) visit(before);
        processing.remove(n);
        done.add(n);
        sorted.add(n);
    }

    private List<String> mustPrecede(String n) {
        List<String> r = new ArrayList<>();
        for (String a : list(cfg.get(n).get("after"))) if (cfg.containsKey(a)) r.add(a);
        for (Map.Entry<String, Map<String, String>> o : cfg.entrySet())
            if (list(o.getValue().get("before")).contains(n) && !r.contains(o.getKey())) r.add(o.getKey());
        return r;
    }

    private String failure(Map<String, String> c, Set<String> cp, Map<String, String> p, Set<String> beans) {
        for (String cls : list(c.get("onClass"))) if (!cp.contains(cls)) return "missing class " + cls;
        String prop = c.get("onProperty");
        if (prop != null) {
            int eq = prop.indexOf('=');
            String k = eq < 0 ? prop : prop.substring(0, eq), v = p.get(k);
            boolean ok = eq < 0 ? v != null && !v.equals("false") : prop.substring(eq + 1).equals(v);
            if (!ok) return "property " + k;
        }
        for (String b : list(c.get("onBean"))) if (!beans.contains(b)) return "no bean " + b;
        for (String b : list(c.get("onMissingBean"))) if (beans.contains(b)) return "bean " + b + " exists";
        return null;
    }

    private static List<String> list(String csv) {
        return csv == null || csv.isEmpty() ? List.of() : Arrays.asList(csv.split(","));
    }
}`,
      complexity: `<p>O(n² ) for the "before" scan in the sort (n auto-configurations), O(n · c) for evaluation with c conditions each. Boot precomputes these relations in metadata files.</p>`,
      followUps: ['Where does @AutoConfigureOrder fit between the alphabetical sort and after/before?', 'Why are @ConditionalOnBean conditions on user @Configuration classes discouraged?', 'How does ApplicationContextRunner let you unit-test this without starting an app?']
    }
  });

  /* ======================================================================
     QUIZ
     ====================================================================== */
  quiz.push(
    { q: 'What does a <code>BeanFactoryPostProcessor</code> work on?', options: ['Bean definitions (metadata), before any normal bean is instantiated', 'Every bean instance after initialization', 'HTTP requests before the DispatcherServlet', 'Proxies created by the AOP framework'], answer: 0, explain: 'BFPPs run in the invokeBeanFactoryPostProcessors phase of refresh() and modify definitions; BeanPostProcessors work on instances.' },
    { q: 'Which component parses @Configuration classes, runs component scanning and processes @Import?', options: ['ConfigurationClassPostProcessor', 'AutowiredAnnotationBeanPostProcessor', 'DispatcherServlet', 'ApplicationEventMulticaster'], answer: 0, explain: 'It is a PriorityOrdered BeanDefinitionRegistryPostProcessor that registers most of your bean definitions.' },
    { q: 'In which order do these run for one bean: @PostConstruct, afterPropertiesSet(), custom init-method, field injection?', options: ['field injection → @PostConstruct → afterPropertiesSet → init-method', '@PostConstruct → field injection → afterPropertiesSet → init-method', 'afterPropertiesSet → @PostConstruct → field injection → init-method', 'init-method → afterPropertiesSet → @PostConstruct → field injection'], answer: 0, explain: 'populateBean runs before initializeBean; inside it, @PostConstruct (via a BPP before-init) precedes InitializingBean and then the custom init method.' },
    { q: 'When does the AOP auto-proxy creator normally replace a bean with its proxy?', options: ['In postProcessAfterInitialization, after the init callbacks', 'Before the constructor runs', 'During component scanning', 'When the first method is called'], answer: 0, explain: 'wrapIfNecessary runs after initialization — or earlier via getEarlyBeanReference when the bean is part of a circular reference.' },
    { q: 'Since Spring Boot 2.6, what happens by default with two singletons that inject each other via fields?', options: ['Start-up fails: circular references are prohibited unless spring.main.allow-circular-references=true', 'Spring resolves it with the early-reference cache', 'Spring injects null into one of them', 'Spring creates two instances of each'], answer: 0, explain: 'Boot disables allowCircularReferences by default and prints the cycle.' },
    { q: 'Two beans of type <code>Notifier</code>, neither @Primary nor @Priority. The constructor parameter is <code>Notifier smsNotifier</code> and one bean is named <code>smsNotifier</code>. Code is compiled with -parameters. Result?', options: ['The bean named smsNotifier is injected (name fallback)', 'NoUniqueBeanDefinitionException', 'NoSuchBeanDefinitionException', 'The first one found on the classpath'], answer: 0, explain: 'After primary and priority, Spring matches the parameter name against bean names; this needs real parameter names.' },
    { q: 'What does <code>@Configuration(proxyBeanMethods = false)</code> change?', options: ['The class is not CGLIB-enhanced, so calling one @Bean method from another creates a new object', 'All beans become prototypes', 'Beans are created lazily', '@Bean methods may no longer take parameters'], answer: 0, explain: 'Lite mode: inter-bean method calls are plain Java calls; pass dependencies as parameters instead.' },
    { q: 'A request-scoped bean with proxyMode TARGET_CLASS is injected into a singleton. What does the singleton hold?', options: ['A singleton CGLIB proxy that looks up the current request\'s instance on every call', 'The instance from the first request, forever', 'A new instance per method call', 'null until the first request arrives'], answer: 0, explain: 'The scoped proxy delegates to getBean("scopedTarget.name"), which asks the RequestScope (ThreadLocal-bound request).' },
    { q: 'Spring Boot app, class <code>OrderServiceImpl implements OrderService</code> with @Transactional methods. Which proxy type is used by default?', options: ['CGLIB, because Boot sets spring.aop.proxy-target-class=true', 'JDK dynamic proxy', 'AspectJ load-time weaving', 'No proxy'], answer: 0, explain: 'Plain Spring would choose a JDK proxy for a class with interfaces; Boot defaults to class-based proxies.' },
    { q: 'Inside a bean, method <code>a()</code> calls <code>this.b()</code>, and <code>b()</code> is annotated <code>@Transactional(propagation = REQUIRES_NEW)</code>. A caller invokes <code>a()</code> through the proxy, and a() is not transactional. What happens?', options: ['b() runs without any transaction — the self-call bypasses the proxy', 'b() runs in a new transaction', 'b() joins a()\'s transaction', 'Spring throws IllegalTransactionStateException'], answer: 0, explain: 'this refers to the target, so the TransactionInterceptor is never invoked for b().' },
    { q: 'An inner REQUIRED method throws a RuntimeException; the outer REQUIRED method catches it and returns normally. What does the caller see?', options: ['UnexpectedRollbackException, and everything is rolled back', 'A normal return; the outer work is committed', 'The original RuntimeException', 'A committed outer transaction and a rolled back inner one'], answer: 0, explain: 'The participating failure marked the shared transaction rollback-only; the outer commit detects it, rolls back and throws.' },
    { q: 'How does JdbcTemplate find the connection of the current @Transactional method?', options: ['DataSourceUtils.getConnection looks it up in TransactionSynchronizationManager\'s ThreadLocal resources', 'The connection is passed as a hidden method parameter', 'It opens a new connection and the database merges them', 'Through a static field on the DataSource'], answer: 0, explain: 'The transaction manager binds a ConnectionHolder to the thread; any data-access code on that thread reuses it.' },
    { q: 'With default settings, which exception makes a @Transactional method roll back?', options: ['IllegalStateException', 'java.io.IOException', 'java.sql.SQLException thrown directly', 'Any Exception'], answer: 0, explain: 'Only RuntimeException and Error trigger rollback by default; checked exceptions commit unless rollbackFor says otherwise.' },
    { q: 'A <code>@TransactionalEventListener</code> receives an event published when no transaction is active (fallbackExecution not set). What happens?', options: ['The listener is not invoked', 'It is invoked immediately', 'It is invoked when the next transaction commits', 'Spring throws to the publisher'], answer: 0, explain: 'There is no transaction to register a synchronization with, so the event is skipped for that listener.' },
    { q: 'Why does @ConditionalOnMissingBean in Boot auto-configuration see beans you defined in your own @Configuration classes?', options: ['Auto-configurations are imported by a DeferredImportSelector, processed after user configuration', 'Your beans are always @Primary', 'Boot scans your packages last', 'Conditions are evaluated after all beans are instantiated'], answer: 0, explain: 'The deferred import ensures user definitions are registered before auto-configuration conditions are evaluated.' },
    { q: 'application.properties has <code>server.port=8080</code>, the OS environment has <code>SERVER_PORT=9000</code>, and the app is started with <code>--server.port=7000</code>. Which port is used?', options: ['7000', '9000', '8080', 'Start-up fails'], answer: 0, explain: 'Command-line arguments have the highest precedence, then OS environment variables, then config files.' }
  );

  /* ======================================================================
     INTERVIEW Q&A
     ====================================================================== */
  interview.push(
    { q: 'Walk me through what happens inside <code>ApplicationContext.refresh()</code>.', level: 'A', a: `<p>Refresh prepares the environment and creates a ${C('DefaultListableBeanFactory')}, registers infrastructure (Aware processors, resolvable dependencies), then runs <b>BeanFactoryPostProcessors</b>: ${C('ConfigurationClassPostProcessor')} parses configuration classes, scans components, processes ${C('@Import')}/${C('@Bean')} and finally the deferred auto-configuration imports, registering bean <b>definitions</b>; other BFPPs (like the placeholder configurer) edit them. Next it instantiates and registers <b>BeanPostProcessors</b> (PriorityOrdered, Ordered, rest), initialises the message source and event multicaster, calls ${C('onRefresh')} (Boot creates the web server), registers listeners, then ${C('preInstantiateSingletons')} creates all non-lazy singletons and calls ${C('SmartInitializingSingleton')} callbacks. ${C('finishRefresh')} starts ${C('SmartLifecycle')} beans and publishes ${C('ContextRefreshedEvent')}. On any failure the created singletons are destroyed and the exception is rethrown.</p>`, followUps: ['What is frozen after the BFPP phase and why?', 'What does Spring AOT move to build time?', 'Where would you hook code that needs every bean (and proxy) ready?'] },
    { q: 'BeanFactoryPostProcessor vs BeanPostProcessor — when would you write each?', level: 'I', a: `<p>A <b>BFPP</b> runs once, before any regular bean exists, and changes <b>definitions</b>: register extra beans (${C('BeanDefinitionRegistryPostProcessor')}), set lazy-init, resolve placeholders, change scopes. A <b>BPP</b> runs for every bean <b>instance</b> during creation (before and after init callbacks) and may return a different object: proxies for AOP, ${C('@Async')}, validation; injecting annotations; collecting beans into a registry. Pitfalls: BFPP ${C('@Bean')} methods must be ${C('static')} (otherwise the config class is created too early and its ${C('@Value')}/${C('@Autowired')} fields stay null), and BPPs should not depend on ordinary beans, or those beans are created before all BPPs exist ("not eligible for getting processed by all BeanPostProcessors").</p>`, followUps: ['How are BPPs ordered?', 'Can a BFPP call getBean()? What goes wrong?'] },
    { q: 'Describe the full lifecycle of a singleton bean, including where the proxy appears.', level: 'I', a: `<p>Instantiate (constructor resolution and constructor injection) → expose an early reference (singleton factory, if circular references are allowed) → populate (field/setter injection by ${C('AutowiredAnnotationBeanPostProcessor')}) → Aware callbacks (${C('BeanNameAware')}, ${C('BeanFactoryAware')}) → ${C('postProcessBeforeInitialization')} of all BPPs (${C('ApplicationContextAware')}, then ${C('@PostConstruct')} via the PriorityOrdered ${C('CommonAnnotationBeanPostProcessor')}, then others) → ${C('afterPropertiesSet')} → custom init method → ${C('postProcessAfterInitialization')}, where the auto-proxy creator returns the <b>proxy</b> → registered for destruction. On close: ${C('@PreDestroy')}, ${C('DisposableBean.destroy')}, custom destroy method, dependents before their dependencies. Prototypes skip destruction.</p>`, followUps: ['Why does a @Transactional call from @PostConstruct not start a transaction?', 'What is SmartInitializingSingleton for?'] },
    { q: 'How does Spring resolve circular dependencies, and why are they disabled by default in Spring Boot?', level: 'A', a: `<p>For singletons with field/setter injection, Spring registers an ${C('ObjectFactory')} in the third-level cache right after instantiation. When B (being created while populating A) asks for A, ${C('getSingleton')} finds A in creation, calls the factory (which lets ${C('SmartInstantiationAwareBeanPostProcessor.getEarlyBeanReference')} create an AOP proxy early), puts the result in the second-level cache and returns it. A then finishes; if a BPP returns a different object than the early reference B already holds (e.g. ${C('@Async')}), Spring throws "has been injected into other beans in its raw version". Constructor cycles cannot be solved — no instance exists yet. Boot 2.6+ sets ${C('allow-circular-references=false')} because cycles hide design problems and the early-reference path is fragile; fix by extracting a third bean, using events, ${C('ObjectProvider')} or ${C('@Lazy')}.</p>`, followUps: ['Why three caches and not two?', 'Does @Lazy on a constructor parameter solve a constructor cycle? How?'] },
    { q: 'How does Spring choose which bean to inject when several match the type?', level: 'I', a: `<p>${C('doResolveDependency')} collects candidates by type (generics included) and filters them by qualifier: a ${C('@Qualifier("x")')} matches beans declaring that qualifier, or — when a bean declares none — the bean named x. With zero candidates it throws ${C('NoSuchBeanDefinitionException')} (unless optional), with one it injects it. With several, ${C('determineAutowireCandidate')} picks the single ${C('@Primary')} (two primaries is an error), then the highest ${C('@Priority')}, then a bean whose name equals the field/parameter name (requires ${C('-parameters')} since Spring 6.1), else ${C('NoUniqueBeanDefinitionException')}. Collections and ${C('Map<String, T>')} receive all candidates, ordered by ${C('@Order')}/${C('Ordered')}. ${C('ObjectProvider')}, ${C('Optional')} and ${C('@Lazy')} defer or relax resolution; Spring 6.2's ${C('@Fallback')} marks a bean as the last choice.</p>`, followUps: ['Qualifier vs Primary — which wins?', 'How would you design custom qualifier annotations?'] },
    { q: 'Explain @Configuration full mode vs lite mode. When does it matter?', level: 'I', a: `<p>In full mode (${C('@Configuration')} with default ${C('proxyBeanMethods = true')}), Spring replaces the class with a CGLIB subclass whose ${C('BeanMethodInterceptor')} intercepts calls to ${C('@Bean')} methods: a call from one ${C('@Bean')} method to another returns the container's bean (respecting its scope) instead of executing the method again. In lite mode (${C('proxyBeanMethods = false')}, or ${C('@Bean')} methods in ${C('@Component')}/plain classes) there is no subclass, so such a call creates a new object — duplicate connection pools, caches or clients that the container never manages or closes. Lite mode starts faster and is native-image friendly (all Boot auto-configs use it) but requires dependencies to be passed as ${C('@Bean')} method parameters.</p>`, followUps: ['Why must @Bean methods not be final in full mode?', 'What does a static @Bean method do in full mode?'] },
    { q: 'How does a request-scoped bean work when injected into a singleton?', level: 'A', a: `<p>With ${C('proxyMode = TARGET_CLASS')} (which ${C('@RequestScope')} sets), Spring registers the real definition as ${C('scopedTarget.name')} (not an autowire candidate) and a singleton ${C('ScopedProxyFactoryBean')} under the original name. The singleton receives the CGLIB proxy; every method call on it does ${C('getBean("scopedTarget.name")')}, and ${C('RequestScope')} returns the instance stored in the current request's attributes, found through ${C('RequestContextHolder')}'s ThreadLocal (bound by the DispatcherServlet or ${C('RequestContextFilter')}). Without a proxy, the injection would happen once at start-up with no request active and fail. Calls from other threads (async tasks, parallel streams) fail with "Scope 'request' is not active" unless context is propagated. Alternatives: ${C('ObjectProvider<T>')} or ${C('@Lookup')} methods.</p>`, followUps: ['How would you implement a tenant scope?', 'Do request-scoped beans get @PreDestroy?'] },
    { q: 'How does Spring AOP build and execute a proxy? JDK vs CGLIB?', level: 'A', a: `<p>${C('AnnotationAwareAspectJAutoProxyCreator')} (a BeanPostProcessor) finds all advisors whose pointcut matches the bean class: ${C('@Aspect')} advice methods plus infrastructure advisors (transactions, caching, security, async). It builds one proxy per bean with ${C('ProxyFactory')}. ${C('DefaultAopProxyFactory')} chooses CGLIB if ${C('proxyTargetClass')} is set (Boot's default) or the class has no interfaces, otherwise a JDK dynamic proxy that implements the interfaces only. On each call the proxy gets the cached interceptor chain for that method and runs a ${C('ReflectiveMethodInvocation')}: each ${C('MethodInterceptor')} calls ${C('proceed()')}; the last one invokes the target. CGLIB cannot advise final/private/static methods or final classes; JDK proxies cannot be injected as the implementation type. Both delegate to a separate target object, so self-invocation is never intercepted.</p>`, followUps: ['How are multiple aspects ordered?', 'When would you switch to AspectJ weaving?'] },
    { q: 'What is the self-invocation problem, and what are your options?', level: 'I', a: `<p>Proxy-based features only run when a call goes <b>through the proxy</b>. ${C('this.method()')} inside the bean calls the target directly, so ${C('@Transactional')}, ${C('@Cacheable')}, ${C('@Async')}, ${C('@Retryable')}, ${C('@PreAuthorize')} on the called method are ignored — silently. Options, best first: move the method into another bean (clear boundary); inject the bean into itself (${C('@Lazy')} self-reference or ${C('ObjectProvider')}) and call through it; use programmatic APIs (${C('TransactionTemplate')}, ${C('CacheManager')}); ${C('AopContext.currentProxy()')} with ${C('exposeProxy = true')} (couples code to AOP); or AspectJ compile/load-time weaving, which also covers private methods and constructors.</p>`, followUps: ['Does CGLIB fix self-invocation, since it subclasses?', 'How would you write a test that catches this bug?'] },
    { q: 'Explain how @Transactional works internally, from proxy to JDBC connection.', level: 'A', a: `<p>The ${C('BeanFactoryTransactionAttributeSourceAdvisor')} matches methods with ${C('@Transactional')}; its advice ${C('TransactionInterceptor.invokeWithinTransaction')} reads the attribute (propagation, isolation, timeout, readOnly, rollback rules), picks the ${C('PlatformTransactionManager')} and calls ${C('getTransaction')}. For a new transaction ${C('DataSourceTransactionManager')} borrows a connection, sets ${C('autoCommit(false)')}, isolation and read-only, and binds a ${C('ConnectionHolder')} to the thread through ${C('TransactionSynchronizationManager')}. ${C('JdbcTemplate')}/${C('DataSourceUtils')} and JPA find that bound resource, so all calls on the thread share one connection. After ${C('proceed()')}, a rollback-triggering exception (RuntimeException/Error by default) leads to rollback — or, for a participating method, to rollback-only marking — otherwise commit, which runs synchronization callbacks (beforeCommit flush, afterCommit, afterCompletion) and unbinds/restores suspended resources.</p>`, followUps: ['Why does a transaction not cover @Async work?', 'What does readOnly actually do with JPA?'] },
    { q: 'REQUIRED vs REQUIRES_NEW vs NESTED — how do they differ under failure and under load?', level: 'A', a: `<p><b>REQUIRED</b> joins an existing transaction: one connection, one commit; a failing inner method marks the whole transaction rollback-only, so catching the exception leads to ${C('UnexpectedRollbackException')}. <b>REQUIRES_NEW</b> suspends the outer transaction and runs a separate physical one on a <b>second connection</b>; it commits or rolls back independently (good for audit logs), but each thread holds two connections, which can exhaust a small pool and deadlock under load, and the inner commit stays even if the outer later rolls back. <b>NESTED</b> sets a JDBC savepoint on the same connection; an inner failure rolls back to the savepoint without poisoning the outer transaction, and the inner work commits only with the outer. It needs savepoint support (${C('DataSourceTransactionManager')}; JPA only for JDBC-level work).</p>`, followUps: ['How would you size the pool if REQUIRES_NEW is used?', 'What happens with REQUIRES_NEW inside a method running with NOT_SUPPORTED?'] },
    { q: 'How do @Async and application events work, and how do you make side effects happen only after commit?', level: 'I', a: `<p>${C('@EnableAsync')} registers ${C('AsyncAnnotationBeanPostProcessor')}, which adds an advisor whose interceptor submits the call to a ${C('TaskExecutor')} (qualifier-named, ${C('AsyncConfigurer')}, or Boot's auto-configured ${C('ThreadPoolTaskExecutor')}). ${C('void')} methods are fire-and-forget with exceptions sent to ${C('AsyncUncaughtExceptionHandler')}; ${C('CompletableFuture')} methods return a future. It is proxy-based (no self-invocation) and thread-bound context (transaction, security, request scope, MDC) does not travel. Events are published synchronously to matching listeners on the publisher's thread, inside its transaction. For after-commit side effects use ${C('@TransactionalEventListener')} (AFTER_COMMIT by default): it registers a transaction synchronization and runs only if the commit succeeds; without a transaction it is skipped unless ${C('fallbackExecution = true')}. For guaranteed delivery across crashes, use a transactional outbox.</p>`, followUps: ['Why must an AFTER_COMMIT listener that writes use REQUIRES_NEW?', 'What is wrong with Boot\'s default async queue capacity?'] },
    { q: 'How does Spring Boot auto-configuration decide what to create?', level: 'A', a: `<p>${C('@EnableAutoConfiguration')} imports ${C('AutoConfigurationImportSelector')}, a <b>DeferredImportSelector</b>, so it runs after all user configuration has been parsed. It loads candidate classes from ${C('META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports')}, removes exclusions, filters cheaply with precomputed ${C('@ConditionalOnClass')} metadata, and sorts them (alphabetical, ${C('@AutoConfigureOrder')}, then ${C('@AutoConfiguration(after/before)')}). Each is processed as a configuration class; parse-phase conditions (on class, on property, on web application) decide inclusion, register-phase conditions (${C('@ConditionalOnBean')}, ${C('@ConditionalOnMissingBean')}) are evaluated against the definitions registered so far — which is why your own beans make Boot back off. Debug with ${C('--debug')} or ${C('/actuator/conditions')}; test with ${C('ApplicationContextRunner')}.</p>`, followUps: ['Why is @ConditionalOnBean on a user configuration class unreliable?', 'How would you write your own starter?'] },
    { q: 'How does the Spring Environment resolve a property, and how do profiles affect it?', level: 'I', a: `<p>The ${C('Environment')} holds an ordered ${C('MutablePropertySources')} list; ${C('getProperty')} returns the first source that defines the key and then resolves ${C('${...}')} placeholders in the value. Boot's order, highest first: command-line args, ${C('SPRING_APPLICATION_JSON')}, system properties, OS environment variables (matched via relaxed names such as ${C('SERVER_PORT')}), random values, config data (profile-specific files above default files, external above packaged), ${C('@PropertySource')}, default properties. Active profiles (or ${C('default')} when none) load ${C('application-{profile}')} files — later profiles win — and enable ${C('@Profile')} beans, whose expressions support ${C('!')}, ${C('&')}, ${C('|')} and parentheses. ${C('/actuator/env')} shows which source won.</p>`, followUps: ['Where do @TestPropertySource and @DynamicPropertySource rank?', 'Why can @ConfigurationProperties bind MY_APP_MAXSIZE but @Value cannot use every relaxed form?'] }
  );

  /* ---------- vary the position of correct answers (authored with the answer first) ---------- */
  function rotate(q, k) {
    if (!q || !q.options) return;
    var n = q.options.length; k = k % n;
    if (!k) return;
    q.options = q.options.slice(k).concat(q.options.slice(0, k));
    q.answer = (q.answer - k + n) % n;
  }
  quiz.forEach(function (q, i) { rotate(q, (i * 3 + 1) % 4); });
  var allProblems = practice.slice();
  topics.forEach(function (t) { (t.problems || []).forEach(function (p) { allProblems.push(p); }); });
  allProblems.forEach(function (p, i) { rotate(p.mcq, (i * 2 + 1) % 3); });

  registerModule({
    id: 'java17',
    title: 'Spring Framework Internals: IoC, AOP & Transactions',
    intro: `<p>The Spring Boot module taught you to <i>use</i> Spring. This module opens the engine. You will follow ${C('refresh()')} phase by phase, watch bean <b>definitions</b> turn into instances through ${C('doCreateBean')}, see exactly when ${C('@PostConstruct')} runs and when the <b>proxy</b> appears, and learn how the three-level singleton cache resolves (or refuses) circular references.</p>
<p>Then the parts senior interviews probe: how dependency injection chooses between candidates (${C('@Qualifier')}, ${C('@Primary')}, ${C('@Priority')}, names), how scoped proxies and ${C('@Configuration')} full/lite mode work, how the AOP <b>interceptor chain</b> runs on JDK and CGLIB proxies (and why self-invocation bypasses it), how ${C('@Transactional')} binds connections to threads and turns inner failures into ${C('UnexpectedRollbackException')}, how ${C('@Async')} and transactional events behave, and how the Environment and auto-configuration decide what exists.</p>
<p>Spring code that needs the framework is shown as reference; every problem is solved in <b>plain Java</b> that compiles and is tested: a placeholder resolver, a dependency resolver, a reflection-proxy interceptor chain, a propagation simulator with savepoints, a three-level cache, an ${C('@Async')} proxy and an auto-configuration evaluator.</p>`,
    goals: [
      'Explain every phase of <code>refresh()</code> and the difference between BeanFactoryPostProcessors and BeanPostProcessors',
      'State the exact bean lifecycle callback order and where proxies are created, including early references for circular dependencies',
      'Predict which bean is injected (type, qualifier, primary, priority, name; collections and ObjectProvider) and fix ambiguity errors',
      'Explain scoped proxies and @Configuration full vs lite mode, and spot duplicate-instance bugs',
      'Build a JDK-proxy interceptor chain, choose between JDK and CGLIB proxies, and explain and fix self-invocation',
      'Trace @Transactional from TransactionInterceptor to the thread-bound connection, and predict REQUIRED / REQUIRES_NEW / NESTED outcomes including rollback-only',
      'Use @Async and @TransactionalEventListener correctly and explain what does not cross threads',
      'Predict property values from PropertySource order and profiles, and explain how auto-configuration is ordered and conditioned'
    ],
    prereqs: `<p>Java 16 (JPA &amp; Hibernate: persistence context, transactions) and the Spring Boot Deep Dive (be06: DI basics, scopes, auto-configuration, AOP and @Transactional usage). Comfortable with reflection and annotations (Java 9) and with thread pools and ThreadLocal (Java 11–12).</p>`,
    hours: 22,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
