(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  // ---- small shared helpers for the visualizers ----
  function words(input) { return String(input === undefined || input === null ? '' : input).trim().split(/[\s,;]+/).filter(Boolean); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function copy(o) { var r = {}; for (var k in o) r[k] = o[k]; return r; }

  // =====================================================================
  // TOPIC 1 — IoC & Dependency Injection
  // =====================================================================
  var DI_NODES = [
    { id: 'Ctl', label: 'OrderController', x: 50, y: 8, shape: 'box' },
    { id: 'Svc', label: 'OrderService', x: 50, y: 24, shape: 'box' },
    { id: 'Pay', label: 'StripeGateway', x: 22, y: 42, shape: 'box' },
    { id: 'Repo', label: 'OrderRepository', x: 78, y: 42, shape: 'box' },
    { id: 'DS', label: 'DataSource', x: 78, y: 58, shape: 'box' }
  ];
  var DI_NAMES = { ordercontroller: 'Ctl', orderservice: 'Svc', stripegateway: 'Pay', orderrepository: 'Repo', datasource: 'DS' };
  var DI_LABEL = { Ctl: 'OrderController', Svc: 'OrderService', Pay: 'StripeGateway', Repo: 'OrderRepository', DS: 'DataSource' };

  topics.push({
    title: 'IoC & Dependency Injection: Who Builds the Objects?',
    analogy: `<p>Think of a <b>wall socket</b>. Your lamp does not build a power station, run cables and sign a contract with the electric company. It just says "I need electricity" by having a plug, and <i>someone else</i> (the wall) supplies it. If you move to another country you change the adapter, not the lamp.</p>
      <p>That is <b>Inversion of Control (IoC)</b>: your class stops creating its own helpers with <code>new</code> and instead <i>asks</i> for them. The Spring container is the wall socket: it builds every object, finds what each one needs and plugs it in. The act of plugging things in is called <b>Dependency Injection (DI)</b>.</p>`,
    explain: `<p>A <b>bean</b> is just a normal Java object whose creation and wiring is managed by Spring. The box that manages them is the <b>ApplicationContext</b> (the IoC container).</p>
      <p><b>Without IoC</b> a service creates what it needs:</p>
      <pre>class OrderService { PaymentGateway gw = new StripeGateway(); }   // glued to Stripe forever</pre>
      <p>You cannot test it without calling real Stripe, and you cannot swap the gateway per environment. <b>With IoC</b> the service only <i>declares</i> what it needs (an interface) and Spring hands one in.</p>
      <h4>How Spring finds beans</h4>
      <ul>
        <li><b>Component scanning</b>: classes marked <code>@Component</code>, <code>@Service</code>, <code>@Repository</code>, <code>@Controller</code> / <code>@RestController</code> under your main class package are registered automatically.</li>
        <li><b>@Configuration + @Bean</b>: for classes you do not own (a <code>RestClient</code>, a Jackson <code>ObjectMapper</code>) you write a factory method and Spring calls it once.</li>
      </ul>
      <h4>Three ways to inject</h4>
      ${H.table(['Style', 'Looks like', 'Verdict'], [
        ['<b>Constructor</b>', '<code>OrderService(PaymentGateway gw)</code>', '<span class="c-g">Default choice.</span> Fields can be <code>final</code>, object is never half-built, trivial to unit test with <code>new</code>, cycles fail fast.'],
        ['<b>Setter</b>', '<code>@Autowired void setX(X x)</code>', '<span class="c-y">Only for truly optional or re-configurable dependencies.</span>'],
        ['<b>Field</b>', '<code>@Autowired private X x;</code>', '<span class="c-r">Avoid.</span> Hidden dependencies, no <code>final</code>, needs reflection or the whole Spring context in tests.']
      ])}
      <h4>Which bean wins?</h4>
      <p>Spring matches by <b>type</b> first. If two beans match you get <code>NoUniqueBeanDefinitionException</code>. Break the tie with <code>@Primary</code> (the default pick), <code>@Qualifier("name")</code> (explicit pick) or by naming the parameter like the bean. If none match you get <code>NoSuchBeanDefinitionException</code>. Since Spring 4.3 a class with a <b>single constructor</b> needs no <code>@Autowired</code> at all.</p>
      <p>Below you see the real thing next to a tiny plain-Java container that does the same trick with reflection, so nothing feels like magic.</p>`,
    clues: [
      '"How would you unit test this class without a database or Spring?" → constructor injection, depend on interfaces',
      '"Why do you prefer constructor injection over <code>@Autowired</code> fields?" → immutability, required dependencies, testability',
      '<code>NoUniqueBeanDefinitionException: expected single matching bean but found 2</code> → <code>@Primary</code> / <code>@Qualifier</code>',
      '<code>BeanCurrentlyInCreationException</code> / "The dependencies of some of the beans form a cycle" → circular dependency, redesign',
      '"Swap the implementation per environment / for tests" → program to an interface + profile or <code>@ConditionalOnProperty</code>',
      '<code>NullPointerException</code> on an injected field in a test that did <code>new Service()</code> → field injection smell'
    ],
    code: [
      {
        lang: 'java', check: false, title: 'Field vs constructor injection (Spring)', code: `// BAD: field injection - dependencies are invisible and the fields cannot be final
@Service
public class OrderServiceBad {
    @Autowired private PaymentGateway gateway;
    @Autowired private OrderRepository repo;

    public Order place(Order o) { gateway.charge(o.total()); return repo.save(o); }
}

// GOOD: constructor injection - one constructor means no @Autowired needed
@Service
public class OrderService {
    private final PaymentGateway gateway;   // final = cannot be forgotten, cannot change
    private final OrderRepository repo;

    public OrderService(PaymentGateway gateway, OrderRepository repo) {
        this.gateway = gateway;
        this.repo = repo;
    }

    public Order place(Order o) { gateway.charge(o.total()); return repo.save(o); }
}

// Unit test: no Spring, no reflection, runs in milliseconds
class OrderServiceTest {
    @Test void placesOrder() {
        var service = new OrderService(new FakeGateway(), new InMemoryOrderRepository());
        assertEquals("PAID", service.place(new Order(500)).status());
    }
}`
      },
      {
        lang: 'java', title: 'A tiny DI container with reflection (plain Java, compiles)', code: `import java.lang.reflect.Constructor;
import java.util.*;

interface PaymentGateway { String charge(int cents); }

class StripeGateway implements PaymentGateway {
    public String charge(int cents) { return "charged " + cents + " cents"; }
}

class DataSourceStub { final String url = "jdbc:h2:mem:demo"; }

class OrderRepository {
    private final DataSourceStub ds;
    OrderRepository(DataSourceStub ds) { this.ds = ds; }
    String save(String order) { return "saved " + order + " using " + ds.url; }
}

class OrderService {
    private final PaymentGateway gateway;
    private final OrderRepository repo;
    OrderService(PaymentGateway gateway, OrderRepository repo) {
        this.gateway = gateway;
        this.repo = repo;
    }
    String place(String order) { return gateway.charge(500) + " / " + repo.save(order); }
}

class MiniContainer {
    private final Map<Class<?>, Class<?>> bindings = new HashMap<>();   // interface -> implementation
    private final Map<Class<?>, Object> singletons = new HashMap<>();   // the "bean cache"
    private final Deque<Class<?>> creating = new ArrayDeque<>();        // path being built (cycle detection)

    void bind(Class<?> type, Class<?> impl) { bindings.put(type, impl); }

    @SuppressWarnings("unchecked")
    <T> T get(Class<T> type) {
        Object cached = singletons.get(type);
        if (cached != null) return (T) cached;                           // singleton scope: build once

        Class<?> impl = bindings.getOrDefault(type, type);
        if (creating.contains(impl)) {                                   // we are already building it -> cycle
            List<String> path = creating.stream().map(Class::getSimpleName).collect(Collectors.toList());
            throw new IllegalStateException("Circular dependency: " + path + " -> " + impl.getSimpleName());
        }
        creating.push(impl);
        try {
            Constructor<?>[] ctors = impl.getDeclaredConstructors();
            if (ctors.length != 1) throw new IllegalStateException("Need exactly one constructor in " + impl.getName());
            Constructor<?> ctor = ctors[0];
            ctor.setAccessible(true);

            Class<?>[] paramTypes = ctor.getParameterTypes();
            Object[] args = new Object[paramTypes.length];
            for (int i = 0; i < paramTypes.length; i++) {
                args[i] = get(paramTypes[i]);                            // recursion = resolve dependencies first
            }
            Object bean = ctor.newInstance(args);                        // leaf-first creation order
            singletons.put(type, bean);
            return (T) bean;
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException("Cannot create " + impl.getName(), e);
        } finally {
            creating.pop();
        }
    }
}

class CycleA { CycleA(CycleB b) { } }
class CycleB { CycleB(CycleA a) { } }

public class DiDemo {
    public static void main(String[] args) {
        MiniContainer ctx = new MiniContainer();
        ctx.bind(PaymentGateway.class, StripeGateway.class);
        OrderService svc = ctx.get(OrderService.class);
        System.out.println(svc.place("order-42"));
        System.out.println("same instance? " + (svc == ctx.get(OrderService.class)));   // true

        try {
            ctx.get(CycleA.class);
        } catch (IllegalStateException e) {
            System.out.println(e.getMessage());   // Circular dependency: [CycleB, CycleA] -> CycleA
        }
    }
}`
      }
    ],
    codeTitle: ['Why constructor injection wins', 'Mini IoC container (what Spring does, in 50 lines)'],
    viz: {
      title: 'The container wires a bean dependency graph (leaf-first)',
      input: 'OrderController',
      inputLabel: 'Bean to request (OrderController, OrderService, StripeGateway, OrderRepository, DataSource) - add the word cycle to see a circular dependency',
      gen: function (input) {
        var w = words(input), cyc = false, start = 'Ctl', i;
        for (i = 0; i < w.length; i++) {
          var lw = w[i].toLowerCase();
          if (lw === 'cycle') cyc = true;
          else if (Object.prototype.hasOwnProperty.call(DI_NAMES, lw)) start = DI_NAMES[lw];
          else throw new Error('Type a bean name such as OrderService, optionally followed by the word cycle');
        }
        var deps = { Ctl: ['Svc'], Svc: ['Pay', 'Repo'], Pay: [], Repo: ['DS'], DS: [] };
        if (cyc) deps.Repo = ['DS', 'Svc'];
        var edges = [['Ctl', 'Svc', 'needs'], ['Svc', 'Pay', 'needs'], ['Svc', 'Repo', 'needs'], ['Repo', 'DS', 'needs']];
        if (cyc) edges.push(['Repo', 'Svc', 'needs']);
        var created = {}, order = [], frames = [], stopped = false;
        function lab(id) { return DI_LABEL[id]; }
        function snap(narr, cur, path, e) {
          var hl = {}, tags = {}, k;
          for (k in created) { hl[k] = 'ok'; tags[k] = '#' + created[k]; }
          path.forEach(function (p) { if (!hl[p]) hl[p] = 'win'; });
          if (cur) hl[cur.id] = cur.cls;
          var eh = {};
          if (e) eh[e[0] + '-' + e[1]] = e[2];
          frames.push({ narr: narr, parts: [
            { type: 'graph', label: 'Beans and what their constructors need', directed: true, height: 66, nodes: DI_NODES, edges: edges, hl: hl, ehl: eh, tags: tags },
            { type: 'stack', label: 'Resolution path (what is being built right now)', items: path.map(lab), hl: path.length ? (function () { var o = {}; o[path.length - 1] = 'cur'; return o; })() : {} },
            { type: 'array', label: 'Creation order so far', values: order.map(lab) }
          ] });
        }
        function resolve(id, path, from) {
          if (stopped || created[id]) return;
          if (path.indexOf(id) >= 0) {
            stopped = true;
            snap('<span class="c-r">Cycle!</span> To build <b>' + lab(id) + '</b> Spring needs <b>' + lab(path[path.length - 1]) + '</b>, which is waiting for <b>' + lab(id) + '</b> to finish. Nobody can go first. Constructor injection fails fast at startup with <code>BeanCurrentlyInCreationException</code> - exactly what you want.', { id: id, cls: 'bad' }, path, [path[path.length - 1], id, 'bad']);
            return;
          }
          var np = path.concat([id]);
          var d = deps[id];
          snap(d.length ? 'Container needs <b>' + lab(id) + '</b>. Its constructor wants ' + d.map(lab).join(' and ') + ' - build those first.' : 'Container needs <b>' + lab(id) + '</b>. Its constructor has no parameters, so it can be created right away.', { id: id, cls: 'cur' }, np, from ? [from, id, 'cur'] : null);
          for (var j = 0; j < d.length; j++) resolve(d[j], np, id);
          if (stopped) return;
          order.push(id);
          created[id] = order.length;
          snap('Created <b>' + lab(id) + '</b> (#' + order.length + ') with <code>new</code> using the beans above. Cached: it is a <b>singleton</b>, so everyone shares this one instance.', { id: id, cls: 'sel' }, np, null);
        }
        frames.push({ narr: 'Startup: the container has read all bean definitions (which classes exist, which constructor parameters each needs). It has <b>not</b> created anything yet. You ask for <b>' + lab(start) + '</b>.', parts: [
          { type: 'graph', label: 'Beans and what their constructors need', directed: true, height: 66, nodes: DI_NODES, edges: edges, hl: {}, ehl: {}, tags: {} },
          { type: 'stack', label: 'Resolution path (what is being built right now)', items: [] },
          { type: 'array', label: 'Creation order so far', values: [] }
        ] });
        resolve(start, [], null);
        if (!stopped) snap('Done. Dependencies were created <b>leaf first</b> (' + order.map(lab).join(' then ') + '). Your code never wrote a single <code>new</code>. In a test you can bypass all this and call the constructor yourself with fakes.', null, [], null);
        return frames;
      }
    },
    examples: [
      {
        title: 'Example 1 - Testing is easy with constructor injection',
        html: `<p>Because <code>OrderService</code> receives its helpers through the constructor, a unit test passes two tiny fakes. No Spring context (which can take seconds to start), no database. With field injection you would need <code>@InjectMocks</code>/reflection or <code>@SpringBootTest</code> just to set two fields.</p>
          <p>Rule of thumb: <b>if you can write <code>new MyService(fake1, fake2)</code> in a test, your design is healthy.</b></p>`,
        code: { lang: 'java', code: `interface Clock { long now(); }
class Coupon {
    private final Clock clock;
    Coupon(Clock clock) { this.clock = clock; }
    boolean expired(long expiresAt) { return clock.now() > expiresAt; }
}
class CouponCheck {
    public static void main(String[] args) {
        Coupon c = new Coupon(() -> 1000L);          // fake clock frozen at t=1000
        System.out.println(c.expired(999));          // true
        System.out.println(c.expired(2000));         // false
    }
}` }
      },
      {
        title: 'Example 2 - Two implementations: @Primary vs @Qualifier',
        html: `<p>You have <code>StripeGateway</code> and <code>PaypalGateway</code>, both implementing <code>PaymentGateway</code>. Asking for a <code>PaymentGateway</code> fails with <code>NoUniqueBeanDefinitionException</code>. Pick one default with <code>@Primary</code>, or pick explicitly where it matters with <code>@Qualifier</code>. Another clean option is to inject <code>List&lt;PaymentGateway&gt;</code> or a <code>Map&lt;String, PaymentGateway&gt;</code> and choose at runtime (strategy pattern).</p>`,
        code: { lang: 'java', check: false, code: `@Component @Primary
class StripeGateway implements PaymentGateway { /* default */ }

@Component("paypal")
class PaypalGateway implements PaymentGateway { /* special case */ }

@Service
class CheckoutService {
    private final PaymentGateway defaultGw;
    private final PaymentGateway paypalGw;

    CheckoutService(PaymentGateway defaultGw,                 // gets the @Primary one (Stripe)
                    @Qualifier("paypal") PaymentGateway paypalGw) {
        this.defaultGw = defaultGw;
        this.paypalGw = paypalGw;
    }
}

// Strategy style: Spring injects ALL implementations, keyed by bean name
@Service
class GatewayRouter {
    private final Map<String, PaymentGateway> byName;
    GatewayRouter(Map<String, PaymentGateway> byName) { this.byName = byName; }
    PaymentGateway pick(String name) { return byName.get(name); }
}` }
      },
      {
        title: 'Example 3 - @Bean for classes you do not own',
        html: `<p>You cannot put <code>@Component</code> on a library class like <code>ObjectMapper</code> or a <code>RestClient</code>. Write a factory method in a <code>@Configuration</code> class. Spring calls it once at startup and stores the result as a bean. Parameters of the method are injected too, so beans can depend on other beans.</p>`,
        code: { lang: 'java', check: false, code: `@Configuration
public class HttpConfig {

    @Bean
    RestClient paymentsClient(RestClient.Builder builder,
                              @Value("\${payments.base-url}") String baseUrl) {
        return builder.baseUrl(baseUrl).build();     // built ONCE, shared everywhere
    }

    @Bean(initMethod = "start", destroyMethod = "stop")
    MetricsReporter metricsReporter() { return new MetricsReporter(); }
}` }
      },
      {
        title: 'Example 4 - Breaking a circular dependency',
        html: `<p><code>OrderService</code> needs <code>InvoiceService</code> and <code>InvoiceService</code> needs <code>OrderService</code>. Two honest fixes: <b>(1)</b> extract the shared part into a third class both use (<code>PricingService</code>) - usually the real design bug; <b>(2)</b> publish an event instead of calling directly. Quick band-aids: <code>@Lazy</code> on one parameter (Spring injects a proxy that resolves on first use) or a setter. Spring Boot 2.6+ <b>forbids</b> circular references by default (<code>spring.main.allow-circular-references=false</code>) - treat the error as a design hint, not an obstacle to silence.</p>`
      }
    ],
    deepDive: `<p><b>Container internals.</b> At startup <code>refresh()</code> runs in phases: component scan and <code>@Bean</code> methods produce <b>BeanDefinitions</b> (metadata only: class, scope, constructor args), <code>BeanFactoryPostProcessor</code>s may edit those definitions (this is how <code>@Configuration</code> classes and <code>&#36;{...}</code> placeholders are processed), then <code>BeanPostProcessor</code>s are registered, and finally <code>preInstantiateSingletons()</code> eagerly builds every singleton. That is why wiring mistakes crash the app at boot instead of at 3 a.m. in production.</p>
      <p><b>Circular references.</b> For singletons wired by setter/field, Spring historically used a <b>three-level cache</b> (<code>singletonObjects</code>, <code>earlySingletonObjects</code>, <code>singletonFactories</code>) to expose a half-built object early. Constructor cycles can never work (you cannot call <code>new A(b)</code> before <code>b</code> exists), and Boot now disables the early-reference trick by default.</p>
      <p><b>Other injection forms.</b> <code>Optional&lt;T&gt;</code> or <code>@Autowired(required=false)</code> for optional beans, <code>ObjectProvider&lt;T&gt;</code> for lazy/multiple lookups, <code>List&lt;T&gt;</code> ordered by <code>@Order</code>. Matching order: type, then <code>@Primary</code>, then <code>@Qualifier</code>, then parameter name. <code>@Resource</code> (JSR-250) matches by <b>name</b> first, <code>@Inject</code> is the standard equivalent of <code>@Autowired</code>.</p>
      <p><b>Production reality.</b> Startup time grows with bean count: use <code>spring.main.lazy-initialization=true</code> sparingly (it hides errors), prefer Spring AOT/native images or CDS for fast starts. Never inject <code>ApplicationContext</code> and call <code>getBean()</code> in business code - that is a service locator and defeats the whole point. Injecting a shorter-lived bean (request scope) into a singleton needs a scoped proxy (next topic).</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants write Spring boilerplate instantly, but they learned from a decade of tutorials, so they still love <code>@Autowired</code> fields and sprinkle <code>@Component</code> on everything. They also happily "fix" a <code>NoUniqueBeanDefinitionException</code> by adding <code>@Primary</code> to the wrong class, which silently changes behaviour in other places.</p>
      <p><b>Use AI as a partner:</b> paste your class and ask <code>Refactor to constructor injection, keep behaviour, and write a plain JUnit test with fakes - no Spring context</code>. Ask it to draw the dependency graph of your beans and spot cycles. Ask for the three most likely reasons for a given startup stack trace, then verify each.</p>
      <p><b>Where AI goes wrong:</b> invents bean names or starters that do not exist, mixes <code>javax.*</code> and <code>jakarta.*</code> imports (Spring Boot 3 needs <code>jakarta</code>), or suggests <code>@Lazy</code>/<code>allow-circular-references=true</code> to silence a design problem.</p>
      <p><b>What you must still own:</b> deciding the boundaries between beans, which implementation is the default, and checking facts with the real tools: <code>/actuator/beans</code>, the startup log and <code>--debug</code>.</p>`,
    problems: [
      {
        title: 'Two Gateways, One Crash',
        level: 'Easy',
        tags: ['dependency injection', 'qualifier', 'primary'],
        companies: ['Infosys', 'Capgemini', 'Amazon'],
        statement: `<p>Your app has <code>StripeGateway</code> and <code>PaypalGateway</code>, both <code>@Component</code>s implementing <code>PaymentGateway</code>. <code>CheckoutService</code> has a constructor parameter <code>PaymentGateway gateway</code>. The app fails at startup. Explain the exact error, why it happens, and give <b>three</b> different ways to fix it with the trade-off of each.</p>`,
        constraints: `Spring Boot 3.x, constructor injection, no XML. Both gateways must stay as beans because another class needs PayPal specifically.`,
        example: `<p>Error text: ${H.c('r', 'NoUniqueBeanDefinitionException: No qualifying bean of type PaymentGateway: expected single matching bean but found 2: paypalGateway, stripeGateway')}</p><p>Spring matched by <b>type</b>, found two candidates, and refuses to guess.</p>`,
        brute: { why: `<p>The tempting "fix" is to delete one gateway or use <code>@Autowired(required=false)</code>. Deleting breaks the PayPal feature, and <code>required=false</code> just injects <code>null</code> and moves the crash to runtime (<code>NullPointerException</code> when the first payment happens).</p>` },
        mcq: { q: 'Which change tells Spring "use this one unless told otherwise"?', options: ['@Primary on StripeGateway', '@Qualifier on the class declaration of PaypalGateway only', '@Lazy on CheckoutService', 'Renaming the constructor parameter to anything'], answer: 0, explain: '@Primary marks the default candidate when several beans match by type. @Qualifier is used at the injection point to choose explicitly.' },
        hints: [
          `<p>Hint 1: Spring resolves constructor parameters by <b>type</b> first. Two beans share the type, so the type alone is ambiguous. You need extra information to break the tie.</p>`,
          `<p>Hint 2: The extra information can live on the bean (<code>@Primary</code>), at the injection point (<code>@Qualifier("name")</code> or a parameter name equal to the bean name), or you can inject all of them (<code>Map&lt;String, PaymentGateway&gt;</code>).</p>`,
          `<p>Hint 3: Decide who is the default. Put <code>@Primary</code> there. For the one class that needs the other, add <code>@Qualifier("paypalGateway")</code> to that parameter. Alternatively, inject the Map and choose in code by a key from the request.</p>`
        ],
        solution: {
          approach: `<p><b>Why:</b> the container looks up a bean of type <code>PaymentGateway</code> and finds two. It will not guess, so startup fails (good: fail fast).</p>
            <p><b>Fix 1 - @Primary</b> on <code>StripeGateway</code>: one annotation, everyone gets Stripe by default; PayPal is still available by qualifier. Risk: a hidden default that surprises readers.</p>
            <p><b>Fix 2 - @Qualifier</b> at the injection point: <code>@Qualifier("paypalGateway") PaymentGateway gw</code>. Explicit and local; every consumer must say what it wants.</p>
            <p><b>Fix 3 - inject a Map or List</b> (<code>Map&lt;String, PaymentGateway&gt;</code>, keyed by bean name) and select at runtime: best when the choice depends on the request (customer picks PayPal). This is the strategy pattern with Spring doing the lookup.</p>
            <p>Which one to choose: use @Primary when there is a true default, @Qualifier when a class needs one specific variant, the Map when the choice is made per request.</p>`,
          code: { lang: 'java', check: false, code: `@Component @Primary class StripeGateway implements PaymentGateway { }
@Component class PaypalGateway implements PaymentGateway { }

@Service
class CheckoutService {
    private final PaymentGateway def;
    private final PaymentGateway paypal;
    CheckoutService(PaymentGateway def, @Qualifier("paypalGateway") PaymentGateway paypal) {
        this.def = def; this.paypal = paypal;
    }
}` },
          complexity: `<p>Bean lookup happens once at startup, so there is no per-request cost. The Map approach costs one hash lookup per call.</p>`,
          followUps: ['What if the choice must depend on a property such as payments.provider=paypal? (Use @ConditionalOnProperty on each bean.)', 'How would you test CheckoutService with no Spring at all?']
        }
      }
    ]
  });

  // =====================================================================
  // TOPIC 2 — Bean scopes & lifecycle
  // =====================================================================
  var LIFE = [
    ['Register BeanDefinition', 'Spring scanned your classes and noted the recipe. No object exists yet.', {}],
    ['Instantiate (constructor)', 'The constructor runs. Constructor-injected dependencies are passed in right here.', { constructed: 'yes' }],
    ['Populate fields / setters', 'Field and setter injection happens now. This is why a <b>field</b>-injected value is still <code>null</code> inside the constructor.', { injected: 'yes' }],
    ['Aware callbacks', '<code>BeanNameAware</code>, <code>ApplicationContextAware</code> and friends tell the bean who it is. Rarely needed in app code.', {}],
    ['BeanPostProcessor: before init', 'Every registered <code>BeanPostProcessor</code> gets a look at the raw bean (this is where <code>@PostConstruct</code> is actually driven from).', {}],
    ['@PostConstruct', 'Your init hook. Dependencies are now fully injected, so it is safe to use them: warm a cache, validate config.', { initialized: 'yes' }],
    ['afterPropertiesSet()', 'Only if the class implements <code>InitializingBean</code>. Same idea as @PostConstruct, older style.', {}],
    ['@Bean(initMethod)', 'A custom init method named in the <code>@Bean</code> definition (useful for third-party classes).', {}],
    ['BeanPostProcessor: after init', '<b>AOP proxies are created here.</b> The object stored in the container may now be a proxy wrapping your real bean (for @Transactional, @Async, @Cacheable).', { proxied: 'maybe' }],
    ['READY - bean in use', 'The bean serves requests. For a singleton this lasts until the application stops.', {}],
    ['@PreDestroy', 'Shutdown begins. Close pools, flush buffers, stop threads. Runs <b>only for singletons</b> the container still owns.', {}],
    ['DisposableBean.destroy()', 'Older interface-based equivalent of @PreDestroy.', {}],
    ['@Bean(destroyMethod)', 'Custom destroy method. Note: Spring infers <code>close()</code>/<code>shutdown()</code> automatically for @Bean methods.', {}]
  ];

  var LIFE_SHORT = ['definition', 'constructor', 'inject', 'aware', 'BPP before', '@PostConstruct', 'afterProps', 'initMethod', 'BPP after (proxy)', 'READY', '@PreDestroy', 'destroy()', 'destroyMethod'];

  topics.push({
    title: 'Bean Scopes & Lifecycle (and the Singleton State Bug)',
    analogy: `<p>An office has <b>one coffee machine</b> for everybody - that is a <b>singleton</b>. It is great as long as the machine does not remember <i>your</i> order. If it stores "current drinker = Alice" and Bob presses the button a second later, Bob receives Alice's latte. A <b>prototype</b> is a fresh paper cup for every request. A <b>request-scoped</b> bean is a visitor badge printed at the door and thrown away when the visitor leaves.</p>
      <p>The <b>lifecycle</b> is like an employee: hired (constructor), given a desk and tools (injection), onboarding training (<code>@PostConstruct</code>), works for years, then an exit interview (<code>@PreDestroy</code>).</p>`,
    explain: `<p>Every bean has a <b>scope</b>: how many instances exist and how long they live.</p>
      ${H.table(['Scope', 'Instances', 'Created', 'Use for'], [
        ['<b>singleton</b> (default)', 'ONE per container', 'eagerly at startup', 'services, repositories, config - anything <span class="c-g">stateless</span>'],
        ['<b>prototype</b>', 'new one per injection / <code>getBean()</code>', 'on demand', 'stateful helpers; container does NOT call destroy callbacks'],
        ['<b>request</b>', 'one per HTTP request', 'web only', 'per-request data (tenant, trace id)'],
        ['<b>session</b>', 'one per HTTP session', 'web only', 'shopping cart (but prefer a DB or Redis)'],
        ['<b>application</b> / <b>websocket</b>', 'one per ServletContext / WS session', 'web only', 'rare']
      ])}
      <h4>The #1 beginner bug</h4>
      <p>A singleton is shared by <b>all threads</b> serving <b>all users</b> at once. Any mutable field on it (<code>private User currentUser;</code>, <code>private List&lt;Item&gt; cart;</code>, a <code>SimpleDateFormat</code>) is shared data. Two requests overwrite each other and users see someone else's data. It passes every single-user test and fails in production under load.</p>
      <p><b>Fix:</b> keep singletons stateless. Pass data as method parameters or local variables, or put per-request data in a request-scoped bean, or in a database/cache. Shared <i>read-only</i> config (final fields) is fine; shared counters must use <code>AtomicInteger</code>/<code>ConcurrentHashMap</code>.</p>
      <h4>Prototype inside a singleton (scope mismatch)</h4>
      <p>A singleton is built once, so its prototype/request-scoped dependency is injected <b>once</b> and never refreshed. Fixes: inject <code>ObjectProvider&lt;T&gt;</code> and call <code>getObject()</code> each time, use <code>@Lookup</code>, or a <b>scoped proxy</b> (<code>@RequestScope</code> adds one automatically): Spring injects a thin stand-in that looks up the real bean of the current request on every call.</p>
      <h4>Lifecycle in one line</h4>
      <p>Instantiate &rarr; inject &rarr; init callbacks (<code>@PostConstruct</code>) &rarr; post-processors (proxies!) &rarr; ready &rarr; <code>@PreDestroy</code>. Step through every phase below.</p>`,
    clues: [
      '"Users sometimes see each other\'s data under load" / "works with one user, wrong with two" → mutable state in a singleton',
      '"Is a Spring bean thread-safe?" → singletons are shared; thread safety is YOUR job, easiest way is stateless',
      '"I injected a prototype bean but get the same instance every time" → scope mismatch, use ObjectProvider / scoped proxy',
      '<code>No thread-bound request found</code> / <code>Scope \'request\' is not active</code> → request-scoped bean used outside a web request (async thread, startup code)',
      '"Which runs first: constructor, @Autowired, @PostConstruct?" → lifecycle order question',
      '"Release the connection / stop the executor on shutdown" → @PreDestroy or destroyMethod; prototypes are NOT destroyed by Spring'
    ],
    code: [
      {
        lang: 'java', title: 'Singleton state bug and the stateless fix (plain Java model)', code: `import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

/** Pretends to be a Spring singleton service shared by every request thread. */
class BuggyCheckoutService {
    private String currentUser;                       // shared mutable state = BUG

    void start(String user) { currentUser = user; }
    String receipt() { return "Receipt for " + currentUser; }
}

class FixedCheckoutService {
    String receipt(String user) { return "Receipt for " + user; }   // state lives on the caller's stack
}

public class SingletonStateDemo {
    public static void main(String[] args) throws Exception {
        // Deterministic interleaving: A starts, B starts, A asks for her receipt.
        BuggyCheckoutService svc = new BuggyCheckoutService();
        svc.start("alice");
        svc.start("bob");
        System.out.println("Alice gets: " + svc.receipt());   // "Receipt for bob" - wrong user!

        // Same thing with real threads: count how often a user sees someone else's name.
        ExecutorService pool = Executors.newFixedThreadPool(8);
        AtomicInteger wrong = new AtomicInteger();
        BuggyCheckoutService shared = new BuggyCheckoutService();
        for (int t = 0; t < 8; t++) {
            final String me = "user" + t;
            pool.submit(() -> {
                for (int i = 0; i < 20000; i++) {
                    shared.start(me);
                    if (!shared.receipt().endsWith(me)) wrong.incrementAndGet();
                }
            });
        }
        pool.shutdown();
        pool.awaitTermination(30, TimeUnit.SECONDS);
        System.out.println("wrong receipts: " + wrong.get());   // usually > 0

        FixedCheckoutService safe = new FixedCheckoutService();
        System.out.println(safe.receipt("alice"));              // always correct
    }
}`
      },
      {
        lang: 'java', check: false, title: 'Scopes, lifecycle hooks and scope mismatch (Spring)', code: `@Service                      // singleton by default
public class ReportService {

    private final ObjectProvider<ReportBuilder> builders;   // gives a NEW prototype each time
    private final RequestContext requestContext;            // scoped proxy -> always the current request

    public ReportService(ObjectProvider<ReportBuilder> builders, RequestContext requestContext) {
        this.builders = builders;
        this.requestContext = requestContext;
    }

    public Report build() {
        ReportBuilder b = builders.getObject();             // fresh instance, safe to mutate
        return b.forTenant(requestContext.tenantId()).build();
    }
}

@Component
@Scope("prototype")
class ReportBuilder { /* mutable: has fields that change while building */ }

@Component
@RequestScope                 // = @Scope(value = "request", proxyMode = TARGET_CLASS)
class RequestContext {
    private String tenantId;  // safe: one instance per HTTP request
    public String tenantId() { return tenantId; }
    public void setTenantId(String t) { this.tenantId = t; }
}

@Component
class CacheWarmer {
    private final ProductRepository products;
    private Map<Long, Product> cache;

    CacheWarmer(ProductRepository products) { this.products = products; }  // injected here

    @PostConstruct void warm() { cache = products.loadHotItems(); }          // safe: deps are ready
    @PreDestroy   void stop() { cache.clear(); }                              // cleanup on shutdown
}`
      }
    ],
    codeTitle: ['Reproduce the singleton-state bug', 'ObjectProvider, scoped proxy, @PostConstruct'],
    viz: [
      {
        title: 'Bean lifecycle phases (queue of what happens next)',
        input: 'singleton',
        inputLabel: 'Scope: singleton or prototype',
        gen: function (input) {
          var sc = String(input || 'singleton').trim().toLowerCase();
          if (sc !== 'singleton' && sc !== 'prototype') throw new Error('Type singleton or prototype');
          var proto = sc === 'prototype';
          var frames = [], vals = { constructed: 'no', injected: 'no', initialized: 'no', proxied: 'no' }, i, k;
          for (i = 0; i < LIFE.length; i++) {
            var items = LIFE_SHORT.slice();
            var hl = {};
            for (k = 0; k < i; k++) hl[k] = 'done';
            hl[i] = 'cur';
            if (proto && i >= 10) { for (k = 10; k < LIFE.length; k++) hl[k] = 'bad'; }
            for (k in LIFE[i][2]) vals[k] = LIFE[i][2][k] === 'maybe' ? 'only if an aspect applies' : LIFE[i][2][k];
            var extra = '';
            if (i === 9 && proto) extra = ' <span class="c-r">For a prototype the container hands the object over and forgets it: the last three phases never run, so YOU must clean up.</span>';
            if (i === 10 && proto) extra = ' <span class="c-r">Skipped for prototypes.</span>';
            frames.push({
              narr: '<b>' + (i + 1) + '. ' + LIFE[i][0] + '</b> - ' + LIFE[i][1] + extra,
              parts: [
                { type: 'queue', label: 'Lifecycle phases (' + sc + ')', items: items, hl: hl, frontLabel: 'first', backLabel: 'last' },
                { type: 'vars', label: 'What is true about the bean right now', vals: copy(vals), hl: (function () { var o = {}; for (var kk in LIFE[i][2]) o[kk] = 'ok'; return o; })() }
              ]
            });
            if (proto && i === 9) {
              // prototype: show that destroy callbacks do not happen, then stop after one more frame
              frames.push({ narr: 'Container-managed lifecycle <b>ends</b> for a prototype after "ready". Next <code>getBean()</code> repeats phases 2-10 for a brand-new object.', parts: [
                { type: 'queue', label: 'Lifecycle phases (prototype)', items: LIFE_SHORT.slice(), hl: (function () { var o = {}; for (var a = 0; a < 10; a++) o[a] = 'done'; for (var b = 10; b < LIFE.length; b++) o[b] = 'bad'; return o; })(), frontLabel: 'first', backLabel: 'last' },
                { type: 'vars', label: 'What is true about the bean right now', vals: copy(vals) }
              ] });
              break;
            }
          }
          return frames;
        }
      },
      {
        title: 'Two users, one singleton field: watch the data leak',
        input: 'A1 B1 A2 B2',
        inputLabel: 'Interleaving of requests. A1 = Alice stores her name, A2 = Alice reads it; same for B (Bob)',
        gen: function (input) {
          var toks = words(input).map(function (t) { return t.toUpperCase(); });
          if (toks.length < 2 || toks.length > 8) throw new Error('Give 2 to 8 steps such as A1 B1 A2 B2');
          toks.forEach(function (t) { if (!/^[AB][12]$/.test(t)) throw new Error('Each step must be A1, A2, B1 or B2'); });
          var name = { A: 'alice', B: 'bob' }, field = '(empty)', frames = [], wrong = 0, log = [], seen = { A: '-', B: '-' };
          frames.push({ narr: 'One <code>CheckoutService</code> singleton has a field <code>currentUser</code>. Two requests (threads) use it at the same time. Order of events decides who wins.', parts: [
            { type: 'vars', label: 'Shared singleton', vals: { currentUser: field } },
            { type: 'vars', label: 'What each request sees', vals: { 'Alice sees': '-', 'Bob sees': '-' } }
          ] });
          toks.forEach(function (t) {
            var who = t.charAt(0), step = t.charAt(1), narr, hl = {}, h2 = {};
            if (step === '1') {
              field = name[who];
              narr = '<b>' + name[who] + '</b> calls <code>start("' + name[who] + '")</code> &rarr; the shared field is now <b>' + field + '</b>.';
              hl.currentUser = 'cur';
              log.push(t + ': set field = ' + field);
            } else {
              seen[who] = field;
              var ok = field === name[who];
              if (!ok) wrong++;
              narr = '<b>' + name[who] + '</b> calls <code>receipt()</code> and reads the field: gets <b>' + field + '</b>. ' + (ok ? '<span class="c-g">Correct.</span>' : '<span class="c-r">WRONG - this is somebody else\'s data!</span>');
              hl.currentUser = ok ? 'ok' : 'bad';
              h2[(who === 'A' ? 'Alice' : 'Bob') + ' sees'] = ok ? 'ok' : 'bad';
              log.push(t + ': read field = ' + field + (ok ? '' : '  (WRONG)'));
            }
            frames.push({ narr: narr, parts: [
              { type: 'vars', label: 'Shared singleton', vals: { currentUser: field }, hl: hl },
              { type: 'vars', label: 'What each request sees', vals: { 'Alice sees': seen.A, 'Bob sees': seen.B }, hl: h2 },
              { type: 'queue', label: 'Timeline', items: log.slice(), frontLabel: 'oldest', backLabel: 'newest' }
            ] });
          });
          frames.push({ narr: wrong ? '<span class="c-r">' + wrong + ' request(s) saw wrong data.</span> Try <code>A1 A2 B1 B2</code>: it looks fine because the requests did not overlap - that is why this bug survives testing and appears under load. The cure is not locks; it is <b>no shared mutable state</b> (pass the user as a parameter).' : '<span class="c-g">No leak this time</span> because the requests did not overlap. Try <code>A1 B1 A2 B2</code>. A bug that depends on timing is the worst kind: it passes tests and fails in production.', parts: [
            { type: 'vars', label: 'Result', vals: { 'wrong reads': wrong, 'fix': 'receipt(String user)  - state on the stack' }, hl: { 'wrong reads': wrong ? 'bad' : 'ok', fix: 'ok' } }
          ] });
          return frames;
        }
      }
    ],
    examples: [
      {
        title: 'Example 1 - Request data belongs in parameters, not fields',
        html: `<p>Instead of storing the tenant in a field of a singleton, read it where the request is handled and pass it down. This is the cheapest and most testable fix, no special scope needed.</p>`,
        code: { lang: 'java', check: false, code: `@RestController
class ReportController {
    private final ReportService service;
    ReportController(ReportService service) { this.service = service; }

    @GetMapping("/reports")
    Report get(@RequestHeader("X-Tenant") String tenant) {
        return service.build(tenant);            // data flows as a parameter
    }
}` }
      },
      {
        title: 'Example 2 - Prototype injected into a singleton stays the same',
        html: `<p>Common trap: <code>@Autowired ReportBuilder builder;</code> inside a singleton. The singleton is created once, so it gets <b>one</b> builder and keeps reusing it - two users build into the same object. Use <code>ObjectProvider&lt;ReportBuilder&gt;</code> and call <code>getObject()</code> per use (see the code above), or mark the builder <code>@Scope(value = "prototype", proxyMode = ScopedProxyMode.TARGET_CLASS)</code> so each method call goes to a fresh instance (be careful: with a proxy each <i>call</i> may be a new object).</p>`
      },
      {
        title: 'Example 3 - Constructor vs @PostConstruct',
        html: `<p>With field injection the field is still <code>null</code> while the constructor runs:</p>
          <pre>class Cache {
  @Autowired Repo repo;
  Cache() { repo.loadAll(); }       // NullPointerException! not injected yet
  @PostConstruct void init() { repo.loadAll(); }  // fine: injection is done
}</pre>
          <p>With constructor injection the dependency is available in the constructor, but heavy work (network, DB) is still better in <code>@PostConstruct</code> or an <code>ApplicationRunner</code> so the constructor stays a simple assignment. Remember a proxy is created <b>after</b> <code>@PostConstruct</code>: calling a <code>@Transactional</code> method from <code>@PostConstruct</code> on <code>this</code> is not transactional.</p>`
      },
      {
        title: 'Example 4 - Clean shutdown',
        html: `<p>Anything that owns a thread, socket or file belongs in <code>@PreDestroy</code> (or the <code>destroyMethod</code> of a <code>@Bean</code>). Spring Boot also supports <code>server.shutdown=graceful</code> so in-flight requests finish before beans are destroyed. For a <b>prototype</b> Spring will never call these, so the code that asked for it must close it (try-with-resources).</p>`
      }
    ],
    deepDive: `<p><b>Why "singleton" is not the Gang-of-Four singleton.</b> Spring's singleton means one instance <i>per container and bean name</i>. Two beans of the same class under different names are two instances, and a second ApplicationContext (for example in tests) has its own.</p>
      <p><b>Thread safety rules.</b> A stateless singleton is automatically thread-safe. Immutable state (final fields set in the constructor) is also safe. Mutable shared state needs <code>java.util.concurrent</code> types or confinement. Never use <code>synchronized</code> on a whole service method as the cure - you turn a web server into a single-lane road. With virtual threads (Boot 3.2+, <code>spring.threads.virtual.enabled=true</code>) on Java 21 to 23, avoid long <code>synchronized</code> blocks because they pin the carrier thread (Java 24 and later fixed this); use <code>ReentrantLock</code> if you must lock.</p>
      <p><b>Scoped proxies.</b> A request-scoped bean injected into a singleton is a CGLIB proxy whose every method call looks up the real instance in the current request attributes (<code>RequestContextHolder</code>, a <code>ThreadLocal</code>). This is why request scope fails on a background thread: the ThreadLocal is empty (<code>IllegalStateException: No thread-bound request found</code>). Pass the value explicitly to async work.</p>
      <p><b>Lifecycle details.</b> Order inside initialization: <code>@PostConstruct</code> &rarr; <code>afterPropertiesSet()</code> &rarr; <code>initMethod</code>. Destruction: <code>@PreDestroy</code> &rarr; <code>destroy()</code> &rarr; <code>destroyMethod</code>. <code>SmartLifecycle</code> beans start after all singletons are ready and stop <i>before</i> destruction (used by Kafka listeners, schedulers). <code>@PostConstruct</code> lives in <code>jakarta.annotation</code> since Boot 3. Lazy beans (<code>@Lazy</code>) are built on first use, so their errors show up late.</p>
      <p><b>Production reality.</b> Most "random wrong data" tickets are shared mutable state: static <code>SimpleDateFormat</code>, a <code>HashMap</code> used as an unsynchronized cache, a field holding the "current" something. Review checklist: no non-final instance fields in <code>@Service</code>/<code>@Controller</code> except injected dependencies.</p>`,
    aiEra: `<p><b>What AI changes:</b> an assistant will happily write a "<code>@Service</code> with a <code>private Map cache = new HashMap&lt;&gt;()</code>" because it compiles and looks tidy. Code review tools (and AI reviewers) can flag non-final fields in singletons, but only if you ask for it.</p>
      <p><b>Use AI as a partner:</b> ask <code>List every non-final instance field in these @Service/@Component classes and say which are shared mutable state</code>. Ask it to write a stress test with an <code>ExecutorService</code> hammering one bean with 8 threads to expose races. Ask for a diagram of the lifecycle order for your specific bean with its <code>@PostConstruct</code>.</p>
      <p><b>Where AI goes wrong:</b> it suggests <code>synchronized</code> or <code>@Scope("prototype")</code> on a service as a quick fix (hurting throughput or causing the scope-mismatch trap), and mixes up <code>@PostConstruct</code> package names across Boot 2 and 3.</p>
      <p><b>What you must still own:</b> knowing that a race condition can pass every test, and reasoning about which data is per-request versus shared. No tool can see your intent.</p>`,
    problems: [
      {
        title: 'Prototype Inside a Singleton',
        level: 'Medium',
        tags: ['scopes', 'prototype', 'ObjectProvider'],
        companies: ['Walmart', 'Cognizant', 'JPMorgan'],
        statement: `<p><code>ExportService</code> (singleton) has an <code>@Autowired ExportBuilder builder</code> where <code>ExportBuilder</code> is <code>@Scope("prototype")</code> and keeps a <code>StringBuilder rows</code> that grows while exporting. After a few exports every CSV contains the rows of all previous exports. Explain the cause and give two correct fixes.</p>`,
        constraints: `Spring Boot 3.x. ExportService handles about 200 requests per second from many threads.`,
        example: `<p>Request 1 exports 3 rows, request 2 exports 2 rows. Request 2's file contains ${H.c('r', '5 rows')}.</p><p>Why: the singleton was created once, so Spring injected <b>one</b> prototype instance once. "Prototype" means "new per injection", and there was only one injection.</p>`,
        brute: { why: `<p>Adding <code>synchronized</code> to <code>export()</code> and calling <code>builder.clear()</code> at the end "works" in a demo but serialises all 200 req/s through one lock, and a failure before <code>clear()</code> leaks old rows into the next export. The bug (shared mutable object) is still there.</p>` },
        mcq: { q: 'Which injection gives a fresh ExportBuilder per call inside a singleton?', options: ['ObjectProvider&lt;ExportBuilder&gt;.getObject() per export', '@Autowired ExportBuilder as a field', 'Making the field static', 'Marking ExportService @Lazy'], answer: 0, explain: 'ObjectProvider asks the container at call time, so a prototype bean is created every time. A plain injected field is resolved once when the singleton is built.' },
        hints: [
          `<p>Hint 1: ask "how many times does injection happen?" The singleton is constructed once, so injection into it happens once.</p>`,
          `<p>Hint 2: you need to ask the container at <i>use time</i>, not at <i>construction time</i>. Spring offers <code>ObjectProvider</code>, <code>@Lookup</code> and scoped proxies for this.</p>`,
          `<p>Hint 3: the even simpler design is to avoid the stateful bean: create <code>new ExportBuilder()</code> as a local variable inside <code>export()</code>. A local object cannot be shared between threads.</p>`
        ],
        solution: {
          approach: `<p><b>Cause:</b> scope mismatch. The prototype is resolved once when the singleton is wired, so every request reuses that single mutable builder.</p>
            <p><b>Fix A - ObjectProvider:</b> inject <code>ObjectProvider&lt;ExportBuilder&gt;</code> via the constructor and call <code>getObject()</code> at the start of each export; each call returns a brand-new builder, used and discarded by one thread.</p>
            <p><b>Fix B - make it not a bean:</b> if the builder needs no injected dependencies, just write <code>ExportBuilder b = new ExportBuilder();</code> inside the method. This is often the best answer: not everything needs to be a Spring bean.</p>
            <p>Other options: <code>@Lookup</code> abstract method (Spring subclasses the service) or a scoped proxy. Remember Spring does not call <code>@PreDestroy</code> on prototypes, so close resources yourself.</p>`,
          code: { lang: 'java', check: false, code: `@Service
class ExportService {
    private final ObjectProvider<ExportBuilder> builders;
    ExportService(ObjectProvider<ExportBuilder> builders) { this.builders = builders; }

    String export(List<Row> rows) {
        ExportBuilder b = builders.getObject();      // new instance for THIS call
        rows.forEach(b::add);
        return b.build();
    }
}` },
          complexity: `<p>One extra object allocation per export, no locking. Throughput scales with threads.</p>`,
          followUps: ['How would you prove the bug with a test?', 'What changes if the dependency is request-scoped instead of prototype?']
        }
      }
    ]
  });

  // =====================================================================
  // TOPIC 3 — Auto-configuration, starters, @Conditional
  // =====================================================================
  var AC_CANDS = [
    { name: 'WebMvcAutoConfiguration', provides: 'dispatcherServlet', conds: [['class', 'web']] },
    { name: 'JacksonAutoConfiguration', provides: 'objectMapper', conds: [['class', 'jackson'], ['missing', 'objectMapper']] },
    { name: 'DataSourceAutoConfiguration', provides: 'dataSource', conds: [['class', 'jdbc'], ['missing', 'dataSource']] },
    { name: 'HibernateJpaAutoConfiguration', provides: 'entityManagerFactory', conds: [['class', 'jpa'], ['bean', 'dataSource']] },
    { name: 'KafkaAutoConfiguration', provides: 'kafkaTemplate', conds: [['class', 'kafka'], ['missing', 'kafkaTemplate']] }
  ];

  topics.push({
    title: 'Auto-Configuration, Starters & @Conditional',
    analogy: `<p>Imagine a <b>smart hotel</b>. When you check in, the room looks at what you brought: a laptop? It puts out a charger and a desk lamp. A baby? It adds a cot. But if you already brought your <i>own</i> charger, the hotel leaves it alone and does not add a second one.</p>
      <p>That is Spring Boot auto-configuration: it looks at your <b>classpath</b> (what libraries you added), your <b>properties</b> and the <b>beans you defined</b>, then sets up sensible defaults. The golden rule is <b>"back off"</b>: whatever you define yourself wins.</p>`,
    explain: `<p>You add <code>spring-boot-starter-web</code> and, with zero configuration, you get an embedded Tomcat, a <code>DispatcherServlet</code> and a JSON <code>ObjectMapper</code>. Where did all that come from?</p>
      <h4>The three pieces</h4>
      <ul>
        <li><b>Starters</b> are just dependency bundles (<code>starter-web</code> pulls in spring-webmvc, Tomcat, Jackson, validation...). A starter itself usually has no code.</li>
        <li><b>Auto-configuration classes</b> (hundreds, inside <code>spring-boot-autoconfigure</code>) are normal <code>@Configuration</code> classes with <code>@Bean</code> methods, each guarded by conditions.</li>
        <li><b>@EnableAutoConfiguration</b> (part of <code>@SpringBootApplication</code>) imports the list of those classes from <code>META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports</code> found in every jar.</li>
      </ul>
      <p><code>@SpringBootApplication</code> = <code>@SpringBootConfiguration</code> + <code>@EnableAutoConfiguration</code> + <code>@ComponentScan</code>.</p>
      <h4>The conditions that make it smart</h4>
      ${H.table(['Annotation', 'Meaning', 'Typical use'], [
        ['<code>@ConditionalOnClass</code>', 'Class is on the classpath', 'Only configure Kafka if kafka-clients is present'],
        ['<code>@ConditionalOnMissingBean</code>', 'You did NOT define this bean', 'The "back off" rule: use my DataSource, not the default one'],
        ['<code>@ConditionalOnBean</code>', 'Another bean already exists', 'JPA setup only if a DataSource exists'],
        ['<code>@ConditionalOnProperty</code>', 'A property has a value', 'Feature flags: <code>feature.x.enabled=true</code>'],
        ['<code>@ConditionalOnWebApplication</code>', 'Running as a web app', 'Servlet vs reactive vs none'],
        ['<code>@ConditionalOnMissingClass</code>, <code>@ConditionalOnResource</code>, <code>@ConditionalOnExpression</code>', 'Less common', 'Special cases']
      ])}
      <p>Your own <code>@Configuration</code> classes are processed <b>before</b> auto-configuration (it is "deferred"), so <code>@ConditionalOnMissingBean</code> can see what you defined. Step through the simulation below: change the classpath or add a <code>+objectMapper</code> bean and watch the decisions change.</p>
      <h4>See what happened</h4>
      <p>Run with <code>--debug</code> (or <code>debug=true</code>) to print the <b>Conditions Evaluation Report</b>: Positive matches, Negative matches (with the exact failed condition), Exclusions and Unconditional classes. In a running app use <code>/actuator/conditions</code>. Disable one with <code>@SpringBootApplication(exclude = DataSourceAutoConfiguration.class)</code> or <code>spring.autoconfigure.exclude</code>.</p>`,
    clues: [
      '"How does Spring Boot know to configure a DataSource / Tomcat / Jackson for me?" → starters + auto-configuration + conditions',
      '"I defined my own bean and Boot\'s default disappeared / did not" → <code>@ConditionalOnMissingBean</code>, back-off rule',
      '<code>Failed to configure a DataSource: \'url\' attribute is not specified</code> → auto-config matched (JDBC on classpath) but no URL/driver/embedded DB',
      '"Create your own starter / shared library that configures itself" → auto-configuration + <code>.imports</code> file + <code>@ConfigurationProperties</code>',
      '"Why is this bean (not) in the context?" → <code>--debug</code> conditions report or <code>/actuator/conditions</code>',
      '"Turn a feature on/off by config without code change" → <code>@ConditionalOnProperty</code>'
    ],
    code: [
      {
        lang: 'java', check: false, title: 'A custom auto-configuration (what a starter contains)', code: `// 1) Properties bound from  greeting.prefix=Hello  (see the Profiles topic)
@ConfigurationProperties(prefix = "greeting")
public class GreetingProperties {
    private String prefix = "Hello";
    private boolean loud = false;
    public String getPrefix() { return prefix; }
    public void setPrefix(String prefix) { this.prefix = prefix; }
    public boolean isLoud() { return loud; }
    public void setLoud(boolean loud) { this.loud = loud; }
}

// 2) The auto-configuration class
@AutoConfiguration
@ConditionalOnClass(GreetingClient.class)                 // only if our library jar is present
@EnableConfigurationProperties(GreetingProperties.class)
public class GreetingAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean                              // BACK OFF if the user defined their own
    GreetingClient greetingClient(GreetingProperties props) {
        return new GreetingClient(props.getPrefix());
    }

    @Bean
    @ConditionalOnProperty(prefix = "greeting", name = "loud", havingValue = "true")
    LoudGreetingDecorator loudDecorator(GreetingClient client) {
        return new LoudGreetingDecorator(client);          // feature flag
    }
}`
      },
      {
        lang: 'text', title: 'META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports', code: `com.acme.greeting.GreetingAutoConfiguration`
      },
      {
        lang: 'java', title: 'Plain-Java model of condition evaluation (compiles and runs)', code: `import java.util.*;
import java.util.function.Predicate;

/** What Boot looks at: libraries on the classpath and beans that already exist. */
class Env {
    final Set<String> classpath = new LinkedHashSet<>();
    final Set<String> beans = new LinkedHashSet<>();
}

class Cond {
    final String text;
    final Predicate<Env> test;
    Cond(String text, Predicate<Env> test) { this.text = text; this.test = test; }

    static Cond onClass(String c)       { return new Cond("OnClass(" + c + ")", e -> e.classpath.contains(c)); }
    static Cond onMissingBean(String b) { return new Cond("OnMissingBean(" + b + ")", e -> !e.beans.contains(b)); }
    static Cond onBean(String b)        { return new Cond("OnBean(" + b + ")", e -> e.beans.contains(b)); }
}

class AutoConfig {
    final String name;
    final String provides;
    final List<Cond> conds;
    AutoConfig(String name, String provides, Cond... conds) {
        this.name = name;
        this.provides = provides;
        this.conds = Arrays.asList(conds);
    }
}

public class AutoConfigDemo {
    public static void main(String[] args) {
        Env env = new Env();
        env.classpath.addAll(List.of("web", "jackson", "jdbc", "jpa"));
        env.beans.add("objectMapper");                  // the USER defined their own ObjectMapper

        List<AutoConfig> candidates = List.of(          // evaluated in this order
            new AutoConfig("JacksonAutoConfiguration", "objectMapper", Cond.onClass("jackson"), Cond.onMissingBean("objectMapper")),
            new AutoConfig("DataSourceAutoConfiguration", "dataSource", Cond.onClass("jdbc"), Cond.onMissingBean("dataSource")),
            new AutoConfig("HibernateJpaAutoConfiguration", "entityManagerFactory", Cond.onClass("jpa"), Cond.onBean("dataSource")));

        for (AutoConfig c : candidates) {
            List<String> failed = new ArrayList<>();
            for (Cond k : c.conds) if (!k.test.test(env)) failed.add(k.text);
            if (failed.isEmpty()) {
                env.beans.add(c.provides);
                System.out.println("MATCH     " + c.name + " -> bean " + c.provides);
            } else {
                System.out.println("NO MATCH  " + c.name + " (failed: " + failed + ")");   // like Negative matches
            }
        }
        System.out.println("beans: " + env.beans);
    }
}`
      }
    ],
    codeTitle: ['Custom auto-configuration class', 'The registration file inside the jar', 'Model of the conditions report'],
    viz: {
      title: 'Boot decides which auto-configurations to apply',
      input: 'web jackson jdbc jpa +objectMapper',
      inputLabel: 'Classpath items (web jackson jdbc jpa kafka) and your own beans with a plus sign (+objectMapper +dataSource)',
      gen: function (input) {
        var w = words(input), cp = [], mine = [];
        w.forEach(function (t) { if (t.charAt(0) === '+') { if (t.length > 1) mine.push(t.slice(1)); } else cp.push(t.toLowerCase()); });
        if (!cp.length && !mine.length) throw new Error('Type classpath items such as web jdbc jpa and optionally your beans such as +dataSource');
        if (cp.length + mine.length > 10) throw new Error('Use at most 10 items');
        var beans = mine.slice(), frames = [], rows = [], hl = {};
        function setHl(arr, cls) { var o = {}; arr.forEach(function (x) { o[x] = cls; }); return o; }
        frames.push({ narr: 'Boot starts with two facts: the <b>classpath</b> (libraries you added through starters) and the <b>beans you defined yourself</b> (your @Configuration classes run first). Now it walks the auto-configuration candidates in order.', parts: [
          { type: 'set', label: 'Classpath', items: cp, hl: setHl(cp, 'win') },
          { type: 'set', label: 'Beans already defined by you', items: beans, hl: setHl(beans, 'sel') }
        ] });
        AC_CANDS.forEach(function (c, idx) {
          var fails = [], desc = [];
          c.conds.forEach(function (k) {
            var ok;
            if (k[0] === 'class') ok = cp.indexOf(k[1]) >= 0;
            else if (k[0] === 'missing') ok = beans.indexOf(k[1]) < 0;
            else ok = beans.indexOf(k[1]) >= 0;
            var label = k[0] === 'class' ? 'class ' + k[1] + ' on classpath' : k[0] === 'missing' ? 'no bean ' + k[1] : 'bean ' + k[1] + ' exists';
            desc.push(label + ': ' + (ok ? 'yes' : 'NO'));
            if (!ok) fails.push(label);
          });
          var matched = fails.length === 0;
          if (matched) beans.push(c.provides);
          rows.push([c.name, desc.join(' | '), matched ? 'APPLIED (adds ' + c.provides + ')' : 'skipped']);
          hl = {}; hl[idx] = matched ? 'ok' : 'bad';
          var why;
          if (matched) why = '<span class="c-g">All conditions pass</span> so Boot registers <b>' + c.provides + '</b>.';
          else if (fails[0].indexOf('no bean') === 0) why = '<span class="c-r">Backs off:</span> you already defined <b>' + fails[0].slice(8) + '</b>, so Boot does not create a second one. Your bean wins.';
          else if (fails[0].indexOf('class') === 0) why = '<span class="c-r">Skipped:</span> the library is not on the classpath (you did not add that starter).';
          else why = '<span class="c-r">Skipped:</span> it needs a bean that does not exist (yet). Order matters: a DataSource auto-config earlier in the list can supply it.';
          frames.push({ narr: '<b>' + c.name + '</b>: ' + why, parts: [
            { type: 'table', label: 'Conditions evaluation report (so far)', columns: ['Auto-configuration', 'Conditions', 'Result'], rows: rows.map(function (r) { return r.slice(); }), hl: hl },
            { type: 'set', label: 'Beans in the context now', items: beans.slice(), hl: setHl(beans, 'ok') }
          ] });
        });
        frames.push({ narr: 'Final context: <b>' + beans.length + '</b> of these beans exist. Try adding <code>+dataSource</code> to see Boot back off from DataSourceAutoConfiguration, or remove <code>jdbc</code> and watch JPA get skipped too. In a real app run with <code>--debug</code> to print exactly this table.', parts: [
          { type: 'set', label: 'Beans in the context', items: beans.slice(), hl: setHl(beans, 'sel') }
        ] });
        return frames;
      }
    },
    examples: [
      {
        title: 'Example 1 - Override the default: your DataSource wins',
        html: `<p>Boot builds a Hikari <code>DataSource</code> from <code>spring.datasource.*</code> properties only if <b>no DataSource bean exists</b>. If you need special setup (two databases, a custom pool wrapper), define your own and Boot backs off.</p>`,
        code: { lang: 'java', check: false, code: `@Configuration
class DbConfig {
    @Bean
    DataSource dataSource(@Value("\${DB_URL}") String url,
                          @Value("\${DB_USER}") String user,
                          @Value("\${DB_PASSWORD}") String password) {
        HikariConfig cfg = new HikariConfig();
        cfg.setJdbcUrl(url);
        cfg.setUsername(user);
        cfg.setPassword(password);       // comes from the environment, never from source code
        cfg.setMaximumPoolSize(20);
        return new HikariDataSource(cfg);   // DataSourceAutoConfiguration now backs off
    }
}` }
      },
      {
        title: 'Example 2 - Excluding an auto-configuration',
        html: `<p>Sometimes the library is on the classpath but you do not want it configured (a test slice, or you wire Kafka by hand). Exclude it in code or configuration:</p>`,
        code: { lang: 'java', check: false, code: `@SpringBootApplication(exclude = { DataSourceAutoConfiguration.class })
public class ToolsApplication {
    public static void main(String[] args) { SpringApplication.run(ToolsApplication.class, args); }
}
// or without code:  spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration` }
      },
      {
        title: 'Example 3 - Reading the conditions report',
        html: `<p>Start with <code>java -jar app.jar --debug</code>. Search the output for your bean's class. A typical excerpt:</p>
          <pre>Positive matches:
   DataSourceAutoConfiguration matched:
      - @ConditionalOnClass found required classes 'javax.sql.DataSource' (OnClassCondition)
Negative matches:
   KafkaAutoConfiguration:
      Did not match:
         - @ConditionalOnClass did not find required class 'org.springframework.kafka.core.KafkaTemplate'</pre>
          <p>The report tells you <b>which</b> condition failed. 90% of "Boot did not configure X" bugs are a missing dependency, a missing property or a user bean that made Boot back off.</p>`
      },
      {
        title: 'Example 4 - Feature flag with @ConditionalOnProperty',
        html: `<p>Create the beans of an optional feature only when a property says so. <code>matchIfMissing = true</code> makes the feature on by default.</p>`,
        code: { lang: 'java', check: false, code: `@Configuration
@ConditionalOnProperty(prefix = "features.recommendations", name = "enabled", havingValue = "true", matchIfMissing = false)
class RecommendationConfig {
    @Bean RecommendationService recommendationService(ProductRepository repo) {
        return new RecommendationService(repo);
    }
}` }
      }
    ],
    deepDive: `<p><b>How the list is loaded.</b> <code>AutoConfigurationImportSelector</code> (a <code>DeferredImportSelector</code>) reads every <code>META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports</code> on the classpath (older versions used <code>spring.factories</code>), removes exclusions, filters out classes whose <b>class-level</b> conditions already fail using a precomputed metadata file (<code>spring-autoconfigure-metadata.properties</code>) so Boot does not even load them, sorts them by <code>@AutoConfigureOrder/@AutoConfigureBefore/@AutoConfigureAfter</code> and imports them <b>after</b> your own configuration.</p>
      <p><b>Condition phases.</b> Conditions run in two phases: <i>parse</i> (<code>@ConditionalOnClass</code>, <code>OnProperty</code>) and <i>register bean</i> (<code>OnBean</code>, <code>OnMissingBean</code>), because bean conditions need to know what is already registered. That is why <code>@ConditionalOnBean</code> is only reliable inside auto-configuration classes, not in ordinary component-scanned classes (their order is not defined).</p>
      <p><b>Writing a good starter.</b> Split into <code>acme-spring-boot-autoconfigure</code> (the logic) and <code>acme-spring-boot-starter</code> (just dependencies). Always guard beans with <code>@ConditionalOnMissingBean</code> so users can override, expose settings via <code>@ConfigurationProperties</code> with generated metadata (<code>spring-boot-configuration-processor</code>) for IDE auto-complete, and never use <code>@ComponentScan</code> in an auto-configuration.</p>
      <p><b>Production reality.</b> Slow startup is often "too many auto-configurations for libraries you do not use": review dependencies, use <code>exclude</code>, test slices (<code>@WebMvcTest</code>, <code>@DataJpaTest</code>) and consider Spring AOT. For native images, conditions are evaluated at <b>build time</b>, so a property that flips a <code>@ConditionalOnProperty</code> at runtime will not do what you expect. Be careful: transitive dependencies can silently switch auto-configuration on (adding a test jar that pulls in Hibernate makes Boot demand a database).</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants are good at writing a custom <code>@AutoConfiguration</code>, a <code>@ConfigurationProperties</code> class and the <code>.imports</code> file. They are bad at knowing <i>which</i> auto-configurations fire in your exact version and dependency tree, because that depends on the classpath, which they cannot see.</p>
      <p><b>Use AI as a partner:</b> paste the <code>--debug</code> Conditions Evaluation Report (negative matches section) and ask <code>Why was RedisAutoConfiguration not applied? Give me the failed condition and the dependency or property I must add</code>. Ask it to generate a starter skeleton and then review every <code>@Bean</code> for <code>@ConditionalOnMissingBean</code>.</p>
      <p><b>Where AI goes wrong:</b> it still emits the old <code>META-INF/spring.factories</code> registration key <code>EnableAutoConfiguration</code> (removed for auto-configs in Boot 3), uses <code>@Configuration</code> instead of <code>@AutoConfiguration</code>, or invents starter names. It may also "fix" a startup error by excluding the auto-configuration, which hides the real misconfiguration.</p>
      <p><b>What you must still own:</b> understanding the back-off rule well enough to predict the outcome, and verifying with the real conditions report or <code>/actuator/conditions</code> instead of trusting a guess.</p>`,
    problems: [
      {
        title: 'Failed to Configure a DataSource',
        level: 'Easy',
        tags: ['auto-configuration', 'conditions', 'datasource'],
        companies: ['Amazon', 'TCS', 'Accenture'],
        statement: `<p>You add <code>spring-boot-starter-data-jpa</code> to a new project that only has controllers so far. The app fails at startup with <code>Failed to configure a DataSource: 'url' attribute is not specified and no embedded datasource could be configured</code>. Explain what Boot did and give three valid ways forward.</p>`,
        constraints: `Spring Boot 3.x. The real database (PostgreSQL) is not ready yet, but you want the app to start.`,
        example: `<p>Classpath now contains ${H.c('b', 'JDBC + Hibernate (via the JPA starter)')}. Conditions: <code>DataSourceAutoConfiguration</code> matches because <code>DataSource</code> class exists and no bean is defined. It then looks for a URL: none, and no embedded DB (H2/HSQL/Derby) on the classpath &rarr; ${H.c('r', 'fail fast')}.</p>`,
        brute: { why: `<p>Deleting the JPA starter "works" but throws away the feature you wanted. Another quick hack, <code>exclude = DataSourceAutoConfiguration.class</code>, starts the app but JPA auto-config then fails or you get no database access at all, so the real problem is only hidden.</p>` },
        mcq: { q: 'Why did Boot even try to create a DataSource?', options: ['A condition (class on classpath, no user bean) matched, so the auto-configuration applied', 'Because @SpringBootApplication always requires a database', 'Because the controllers need a DataSource', 'Hibernate forced it at compile time'], answer: 0, explain: 'DataSourceAutoConfiguration is guarded by conditions such as ConditionalOnClass(DataSource) and OnMissingBean. They matched, so Boot tried to configure one and could not find connection details.' },
        hints: [
          `<p>Hint 1: auto-configuration is conditional. Which conditions became true when you added the JPA starter?</p>`,
          `<p>Hint 2: Boot needs connection details. They can come from properties (<code>spring.datasource.url</code>), from your own <code>DataSource</code> bean, or from an embedded database on the classpath.</p>`,
          `<p>Hint 3: choose by situation: real DB ready &rarr; set URL/user/password (via env placeholders); local dev without DB &rarr; add H2 (<code>runtime</code> scope); feature not needed yet &rarr; remove the starter or exclude the auto-config knowingly.</p>`
        ],
        solution: {
          approach: `<p><b>What happened:</b> adding the JPA starter put JDBC and Hibernate on the classpath, so the conditions of <code>DataSourceAutoConfiguration</code> and <code>HibernateJpaAutoConfiguration</code> matched. Boot tried to create a pooled DataSource, found no <code>spring.datasource.url</code> and no embedded database, and failed fast on purpose.</p>
            <p><b>Option 1 - provide the real connection:</b> set <code>spring.datasource.url=jdbc:postgresql://localhost:5432/shop</code>, with username and password taken from environment placeholders (<code>&#36;{DB_USER}</code>, <code>&#36;{DB_PASSWORD}</code>), never hardcoded.</p>
            <p><b>Option 2 - embedded DB for dev:</b> add H2 as a runtime dependency; Boot sees an embedded database and configures it automatically with no URL. Use a profile so production never uses it.</p>
            <p><b>Option 3 - not needed yet:</b> remove the starter, or exclude <code>DataSourceAutoConfiguration</code> and <code>HibernateJpaAutoConfiguration</code> explicitly. Use only when the app truly has no DB.</p>
            <p>Verify with <code>--debug</code>: the negative matches and the exception message show the failing condition.</p>`,
          code: { lang: 'yaml', code: `spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/shop
    username: \${DB_USER:shop}
    password: \${DB_PASSWORD}      # injected from the environment at runtime` },
          complexity: `<p>No runtime cost: this is a startup-time decision. The lesson is diagnostic: read the conditions report instead of guessing.</p>`,
          followUps: ['How do you run the same app with H2 locally and PostgreSQL in production?', 'What does @ConditionalOnMissingBean do if you define two DataSource beans?']
        }
      }
    ]
  });

  // =====================================================================
  // TOPIC 4 — AOP & proxies
  // =====================================================================
  var AOP_NODES = [
    { id: 'Caller', label: 'Caller', x: 10, y: 30, shape: 'box' },
    { id: 'Proxy', label: 'Proxy + advice', x: 38, y: 30, shape: 'box' },
    { id: 'T1', label: 'target.transfer()', x: 77, y: 12, shape: 'box' },
    { id: 'T2', label: 'target.audit()', x: 77, y: 48, shape: 'box' }
  ];
  var AOP_EDGES = [['Caller', 'Proxy', 'call'], ['Proxy', 'T1', 'proceed()'], ['Proxy', 'T2', 'proceed()'], ['T1', 'T2', 'this.audit()']];

  topics.push({
    title: 'AOP & Proxies: Logging Aspects and the Self-Invocation Trap',
    analogy: `<p>Picture an office building with a <b>security guard at the front door</b>. Every visitor who walks in is logged, badge-checked and timed by the guard. The employees upstairs never think about that; they just do their jobs. That guard is an <b>aspect</b>, and the front door is a <b>proxy</b>.</p>
      <p>Now the catch: if two employees on the same floor talk to each other across the desk, the guard never sees it. In Spring this is <b>self-invocation</b>: a method calling another method of the same object (<code>this.other()</code>) walks past the guard, so logging, <code>@Transactional</code>, <code>@Cacheable</code> and <code>@Async</code> silently do nothing.</p>`,
    explain: `<p><b>Cross-cutting concerns</b> are jobs that touch many classes: logging, timing, security checks, transactions, retries, caching. Copy-pasting them everywhere is messy. <b>AOP (Aspect-Oriented Programming)</b> lets you write that code once and say where it applies.</p>
      ${H.table(['Word', 'Plain meaning', 'Example'], [
        ['<b>Aspect</b>', 'A class holding the extra behaviour', '<code>LoggingAspect</code>'],
        ['<b>Join point</b>', 'A moment you can hook into. In Spring AOP: always "a method call on a bean"', '<code>orderService.place()</code>'],
        ['<b>Pointcut</b>', 'An expression that selects which join points', '<code>execution(* com.shop..service..*(..))</code>'],
        ['<b>Advice</b>', 'The code that runs, and when', '<code>@Before</code>, <code>@AfterReturning</code>, <code>@AfterThrowing</code>, <code>@After</code>, <code>@Around</code>'],
        ['<b>Weaving</b>', 'Connecting aspect to target', 'Spring: at runtime, using a proxy']
      ])}
      <h4>How Spring does it: proxies</h4>
      <p>After a bean is created, a post-processor checks whether any pointcut matches it. If yes, Spring puts a <b>proxy</b> in the container <i>instead of</i> the real object. Everyone who injects the bean receives the proxy. A call goes: caller &rarr; proxy &rarr; advice before &rarr; <b>real method</b> &rarr; advice after &rarr; caller.</p>
      <ul>
        <li><b>JDK dynamic proxy</b>: works when the bean implements an interface; the proxy implements the same interface.</li>
        <li><b>CGLIB proxy</b>: generates a subclass of your class. Spring Boot uses this by default (<code>spring.aop.proxy-target-class=true</code>), so it works even without an interface. The class and methods cannot be <code>final</code>.</li>
      </ul>
      <h4>Where it silently does nothing</h4>
      <ul>
        <li><b>Self-invocation</b> (<code>this.method()</code>): no proxy involved. Fix: move the method to another bean, or call through an injected reference to the proxy.</li>
        <li><b>private</b> methods and calls on objects you created with <code>new</code> (not a Spring bean).</li>
        <li><b>final</b> classes/methods with CGLIB, and calls made inside the constructor.</li>
      </ul>
      <p>Watch the animation: choose <code>transfer</code> (which calls <code>this.audit()</code> inside) and see the second call skip the guard.</p>`,
    clues: [
      '"Add logging/timing/auth to many methods without touching them" → AOP, <code>@Around</code> advice',
      '"My <code>@Transactional</code> / <code>@Cacheable</code> / <code>@Async</code> does nothing when I call it from another method in the same class" → self-invocation bypasses the proxy',
      '"How does <code>@Transactional</code> work under the hood?" → proxy + interceptor, same machinery as AOP',
      '"JDK proxy vs CGLIB?" → interface-based vs subclass-based; Boot defaults to CGLIB',
      '<code>Could not generate CGLIB subclass</code> / final method not advised → <code>final</code> blocks proxying',
      '"Why does <code>getClass()</code> print <code>OrderService$$SpringCGLIB$$0</code>?" → you are looking at the proxy'
    ],
    code: [
      {
        lang: 'java', check: false, title: 'Logging and timing aspect (Spring AOP)', code: `// build.gradle: implementation 'org.springframework.boot:spring-boot-starter-aop'   (Boot 4 renames it spring-boot-starter-aspectj)

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Timed { }          // our own marker annotation

@Aspect
@Component
public class LoggingAspect {
    private static final Logger log = LoggerFactory.getLogger(LoggingAspect.class);

    // pointcut: any public method of any class in a "service" package under com.shop
    @Pointcut("execution(public * com.shop..service..*(..))")
    void serviceMethods() { }

    @Around("serviceMethods()")
    public Object logCalls(ProceedingJoinPoint pjp) throws Throwable {
        String name = pjp.getSignature().toShortString();
        long start = System.nanoTime();
        try {
            Object result = pjp.proceed();                       // run the REAL method (or the next advice)
            log.info("{} ok in {} ms", name, (System.nanoTime() - start) / 1_000_000);
            return result;                                       // always return what proceed() returned
        } catch (Throwable t) {
            log.warn("{} failed: {}", name, t.toString());
            throw t;                                             // never swallow the exception
        }
    }

    // advice only for methods carrying our annotation; 'timed' is bound as a parameter
    @Around("@annotation(timed)")
    public Object timeIt(ProceedingJoinPoint pjp, Timed timed) throws Throwable {
        long start = System.nanoTime();
        try { return pjp.proceed(); }
        finally { log.info("{} took {} us", pjp.getSignature().getName(), (System.nanoTime() - start) / 1000); }
    }
}`
      },
      {
        lang: 'java', title: 'A JDK dynamic proxy with around-advice (plain Java) - proves self-invocation bypass', code: `import java.lang.reflect.*;
import java.util.*;

interface AccountService {
    void transfer(String from, String to, int amount);
    void audit(String what);
}

class AccountServiceImpl implements AccountService {
    public void transfer(String from, String to, int amount) {
        System.out.println("    [target] moving " + amount + " from " + from + " to " + to);
        this.audit("transfer " + amount);          // 'this' is the REAL object, not the proxy
    }
    public void audit(String what) {
        System.out.println("    [target] audit: " + what);
    }
}

/** The "advice": runs around every call that goes through the proxy. */
class LoggingHandler implements InvocationHandler {
    private final Object target;
    LoggingHandler(Object target) { this.target = target; }

    @Override
    public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
        System.out.println("[advice] before " + method.getName() + Arrays.toString(args));
        long start = System.nanoTime();
        try {
            return method.invoke(target, args);    // proceed(): call the real method
        } catch (InvocationTargetException e) {
            throw e.getCause();                    // unwrap so callers see the real exception
        } finally {
            System.out.println("[advice] after  " + method.getName() + " (" + (System.nanoTime() - start) / 1000 + " us)");
        }
    }
}

/** Fix: the bean keeps a reference to its own proxy and calls through it. */
class SelfAwareAccountService implements AccountService {
    private AccountService self = this;            // default: raw object
    void setSelf(AccountService proxy) { this.self = proxy; }

    public void transfer(String from, String to, int amount) {
        System.out.println("    [target] moving " + amount + " from " + from + " to " + to);
        self.audit("transfer " + amount);          // goes back through the proxy
    }
    public void audit(String what) {
        System.out.println("    [target] audit: " + what);
    }
}

public class ProxyDemo {
    @SuppressWarnings("unchecked")
    static <T> T advise(Class<T> type, T target) {
        return (T) Proxy.newProxyInstance(type.getClassLoader(), new Class<?>[] { type }, new LoggingHandler(target));
    }

    public static void main(String[] args) {
        AccountService proxy = advise(AccountService.class, new AccountServiceImpl());
        System.out.println("--- 1) transfer via proxy: audit is NOT advised (self-invocation) ---");
        proxy.transfer("A", "B", 100);
        System.out.println("--- 2) audit via proxy: advised ---");
        proxy.audit("direct call");

        SelfAwareAccountService raw = new SelfAwareAccountService();
        AccountService fixed = advise(AccountService.class, raw);
        raw.setSelf(fixed);                         // what 'self-injection' does in Spring
        System.out.println("--- 3) with self reference: audit IS advised ---");
        fixed.transfer("A", "B", 100);
    }
}`
      }
    ],
    codeTitle: ['Logging aspect and custom @Timed annotation', 'Model: a proxy, around-advice, and the self-invocation hole'],
    viz: {
      title: 'Proxy wrapping a target: the call path (and the bypass)',
      input: 'transfer',
      inputLabel: 'Which method does the outside caller call? transfer (it calls this.audit inside) or audit',
      gen: function (input) {
        var m = String(input || 'transfer').trim().toLowerCase();
        if (m !== 'transfer' && m !== 'audit') throw new Error('Type transfer or audit');
        var frames = [], log = [];
        function f(narr, hl, ehl, tags) {
          frames.push({ narr: narr, parts: [
            { type: 'graph', label: 'Caller, proxy and the real object', directed: true, height: 58, nodes: AOP_NODES, edges: AOP_EDGES, hl: hl || {}, ehl: ehl || {}, tags: tags || {} },
            { type: 'queue', label: 'What the advice logged', items: log.slice(), frontLabel: 'first', backLabel: 'last' }
          ] });
        }
        f('Spring created <code>AccountServiceImpl</code> and then <b>wrapped it in a proxy</b>. The container stores the proxy, so everyone who injects <code>AccountService</code> gets the proxy, never the raw object.', { Proxy: 'sel' }, {}, { Proxy: 'what callers hold' });
        f('The controller calls <code>accountService.' + m + '(...)</code>. It holds the <b>proxy</b>, so the call goes to the proxy first.', { Caller: 'cur', Proxy: 'cur' }, { 'Caller-Proxy': 'ok' });
        log.push('before ' + m);
        f('Proxy runs the <b>before part of the advice</b> (start a timer, open a transaction, check permissions...). Logged: "before ' + m + '".', { Proxy: 'cur' }, { 'Caller-Proxy': 'done' });
        if (m === 'transfer') {
          f('Advice calls <code>proceed()</code>: now the <b>real</b> <code>transfer()</code> runs.', { Proxy: 'done', T1: 'cur' }, { 'Proxy-T1': 'ok' });
          f('Inside <code>transfer()</code> the code says <code>this.audit(...)</code>. <code>this</code> is the <b>raw target</b>, not the proxy, so the call jumps straight to <code>audit()</code> and <span class="c-r">walks past the guard</span>: no logging, no transaction, no cache.', { T1: 'cur', T2: 'bad' }, { 'Proxy-T1': 'done', 'T1-T2': 'bad' }, { T2: 'NO advice!' });
          log.push('after transfer');
          f('<code>transfer()</code> returns. Proxy runs the <b>after part</b> of the advice. The log shows only <b>transfer</b>; <code>audit</code> is missing even though it ran.', { Proxy: 'cur', T2: 'bad' }, { 'T1-T2': 'bad', 'Caller-Proxy': 'done' }, { T2: 'ran, never logged' });
          f('<b>Fixes:</b> (1) move <code>audit()</code> into another bean and inject it; (2) inject the bean into itself (<code>@Lazy</code> self reference) and call <code>self.audit()</code>; (3) <code>AopContext.currentProxy()</code> with <code>exposeProxy=true</code>; (4) switch to AspectJ weaving. Now the call goes <b>through</b> the proxy.', { Proxy: 'ok', T2: 'ok' }, { 'Proxy-T2': 'ok' }, { T2: 'advised' });
        } else {
          f('Advice calls <code>proceed()</code>: the real <code>audit()</code> runs.', { Proxy: 'done', T2: 'cur' }, { 'Proxy-T2': 'ok' });
          log.push('after audit');
          f('<code>audit()</code> returns; proxy runs the <b>after part</b>. The call was made <b>from outside</b>, through the proxy, so it was fully advised. Compare with <code>transfer</code>: same method, but called from inside the class it would be invisible.', { Proxy: 'cur', T2: 'ok' }, { 'Proxy-T2': 'done' }, { T2: 'advised' });
          f('Rule to remember: <b>advice only works on calls that cross the proxy boundary</b>. Calls from other beans do; <code>this.x()</code> does not.', { Proxy: 'sel' });
        }
        return frames;
      }
    },
    examples: [
      {
        title: 'Example 1 - An audit trail with a custom annotation',
        html: `<p>Instead of a broad package pointcut you can mark exactly the methods you care about. The aspect reads the annotation and logs who did what. This keeps controllers and services clean and makes the rule visible at the method.</p>`,
        code: { lang: 'java', check: false, code: `@Target(ElementType.METHOD) @Retention(RetentionPolicy.RUNTIME)
public @interface Audited { String action(); }

@Aspect @Component
class AuditAspect {
    private final AuditLog auditLog;
    AuditAspect(AuditLog auditLog) { this.auditLog = auditLog; }

    @AfterReturning(pointcut = "@annotation(audited)", returning = "result")
    void record(JoinPoint jp, Audited audited, Object result) {
        auditLog.write(audited.action(), SecurityContextHolder.getContext().getAuthentication().getName(), jp.getArgs());
    }
}

@Service
class RefundService {
    @Audited(action = "REFUND")
    public Refund refund(long orderId, int cents) { /* refund logic */ return new Refund(orderId, cents); }
}` }
      },
      {
        title: 'Example 2 - Four ways out of self-invocation',
        html: `<p>Your <code>ReportService.generate()</code> calls <code>this.saveAudit()</code> which is <code>@Transactional(REQUIRES_NEW)</code>. Nothing happens in a new transaction. Options, from best to worst:</p>
          <ol>
            <li><b>Move it to another bean</b> (<code>AuditService</code>). Clean, testable, no tricks. Almost always the right answer.</li>
            <li><b>Inject yourself</b>: <code>@Lazy @Autowired ReportService self;</code> then <code>self.saveAudit()</code>. Works, but surprises readers.</li>
            <li><b>AopContext.currentProxy()</b> with <code>@EnableAspectJAutoProxy(exposeProxy = true)</code>. Couples business code to Spring.</li>
            <li><b>AspectJ weaving</b> (compile-time/load-time): advice is woven into the bytecode, so even <code>this.x()</code> and private methods work. Extra build setup.</li>
          </ol>`
      },
      {
        title: 'Example 3 - A final class cannot be proxied by CGLIB',
        html: `<p>With CGLIB Spring creates a <i>subclass</i>. A Kotlin class (final by default) or a Java <code>final class</code> cannot be subclassed, and a <code>final</code> method cannot be overridden - so the advice is skipped for that method with no error. In Kotlin use the <code>kotlin-spring</code> (all-open) plugin. In Java: do not mark Spring-managed services or their public methods <code>final</code>. Also, a CGLIB proxy has the target's class as superclass, so <code>proxy instanceof OrderService</code> is true, but <code>proxy.getClass() == OrderService.class</code> is false; use <code>AopUtils.getTargetClass(bean)</code> if you need the real class.</p>`
      },
      {
        title: 'Example 4 - Order of several aspects',
        html: `<p>Security, transactions and logging all wrap the same method. Order decides who is outside: lower <code>@Order</code> value = outer layer = runs first on the way in and last on the way out. Typical order: <b>security (outermost) &rarr; logging &rarr; transaction &rarr; method</b>. If logging is inside the transaction, a rollback exception passes through the logger first; if outside, it logs after the commit/rollback is decided.</p>`,
        code: { lang: 'java', check: false, code: `@Aspect @Component @Order(10)  class SecurityAspect { /* checks permission first */ }
@Aspect @Component @Order(20)  class LoggingAspect  { /* then logs the call */ }
// @Transactional uses order Ordered.LOWEST_PRECEDENCE by default: it is the innermost wrapper` }
      }
    ],
    deepDive: `<p><b>Who creates the proxy.</b> <code>AnnotationAwareAspectJAutoProxyCreator</code> is a <code>BeanPostProcessor</code>. In "postProcessAfterInitialization" (lifecycle phase 9 in the previous topic) it asks: do any advisors (pointcut + advice pairs) match this bean? If yes it builds a <code>ProxyFactory</code> and returns the proxy instead of the raw bean. <code>@Transactional</code>, <code>@Async</code>, <code>@Cacheable</code>, <code>@Retryable</code>, <code>@PreAuthorize</code> are all advisors of this kind; a bean with several is wrapped by <b>one</b> proxy with a chain of interceptors.</p>
      <p><b>JDK vs CGLIB mechanics.</b> A JDK proxy is created by <code>java.lang.reflect.Proxy</code>, implements your interfaces only, and delegates to an <code>InvocationHandler</code> (exactly like the plain-Java model above). CGLIB (repackaged inside Spring) generates a subclass at runtime and overrides non-final public/protected methods; Spring uses Objenesis to instantiate it <i>without calling your constructor</i>. Consequences: the proxy's own fields are uninitialised, so a method accessing a field directly (not through a getter) on the proxy can see <code>null</code> - another reason to inject through constructors and use methods.</p>
      <p><b>Exceptions through the proxy.</b> With a JDK proxy, a checked exception not declared on the interface is wrapped in <code>UndeclaredThrowableException</code>; always unwrap <code>InvocationTargetException</code> as in the demo or you hide the real error.</p>
      <p><b>Limits and cost.</b> Spring AOP only advises <b>method execution of Spring beans</b>. Field access, constructors, static methods, and objects created with <code>new</code> are out of reach: use AspectJ. The runtime cost of a proxy call is small (a few allocations and an interceptor chain), but a hot inner loop calling an advised method millions of times can show it in a profiler. Since Spring 6, class-based (CGLIB) proxies also support <code>protected</code> and package-private methods for annotations like <code>@Transactional</code>; <code>private</code> never works.</p>
      <p><b>Debugging tip.</b> <code>AopUtils.isAopProxy(bean)</code>, <code>AopUtils.isCglibProxy(bean)</code>, and a breakpoint in <code>CglibAopProxy.DynamicAdvisedInterceptor.intercept</code> show whether your call even reaches the interceptor chain.</p>`,
    aiEra: `<p><b>What AI changes:</b> writing the aspect itself is easy for an assistant; it will produce a pointcut, an <code>@Around</code> and a logger in seconds. What it cannot see is the <b>shape of your calls</b>: whether the annotated method is called from another bean or from <code>this</code>.</p>
      <p><b>Use AI as a partner:</b> ask <code>Review this class: which @Transactional/@Cacheable/@Async methods are called via this. or from another method of the same class? Flag each as self-invocation.</code> Ask it to write a unit test for the aspect using <code>AspectJProxyFactory</code> or <code>@SpringBootTest</code> and assert that the advice ran. Ask it to compare two fixes for a given self-call.</p>
      <p><b>Where AI goes wrong:</b> it adds <code>@Transactional</code> to a private helper and says "done", forgets <code>pjp.proceed()</code> or returns <code>null</code> from <code>@Around</code> (breaking every method return value), swallows exceptions in the advice, or writes a broad pointcut like <code>execution(* *(..))</code> that advises Spring internals.</p>
      <p><b>What you must still own:</b> a mental model of "calls crossing the proxy". When "annotation does nothing" appears, that model is what finds the bug in minutes. Also own the decision to prefer a plain method call, decorator or event over AOP magic when the logic is domain-critical.</p>`,
    problems: [
      {
        title: 'My Aspect Never Fires: Five Suspects',
        level: 'Easy',
        tags: ['aop', 'proxy', 'debugging'],
        companies: ['Infosys', 'Wipro', 'ThoughtWorks'],
        statement: `<p>You wrote a <code>@Aspect</code> with <code>@Around("execution(* com.shop.service.*.*(..))")</code> but nothing is logged. List the five most likely reasons in order of how often they occur, and for each say how to check it in one minute.</p>`,
        constraints: `Spring Boot 3.x with component scanning. The aspect class compiles and the app starts without errors.`,
        example: `<p>Aspect class exists, app runs, ${H.c('r', 'no log lines')}. Five checks: ${H.c('b', 'starter-aop on classpath? / aspect is a bean? / pointcut matches the package? / bean is a Spring bean called from outside? / method is public, non-final?')}</p>`,
        brute: { why: `<p>Randomly adding annotations (<code>@EnableAspectJAutoProxy</code>, <code>@Order</code>, changing the pointcut to <code>execution(* *(..))</code>) until something prints. Slow, and a too-broad pointcut can advise internal Spring beans and break startup.</p>` },
        mcq: { q: 'The pointcut is correct and the bean is advised, but a method called with this.helper() inside the same class is not logged. Why?', options: ['The call never crosses the proxy', 'Spring AOP only supports @Before advice', 'The logger is not thread-safe', 'The aspect must be prototype scoped'], answer: 0, explain: 'Spring AOP works through a proxy. A call on this goes straight to the raw object and bypasses the proxy, so no advice runs.' },
        hints: [
          `<p>Hint 1: split the problem. Is the <b>aspect</b> registered? Is the <b>target</b> proxied? Is the <b>call</b> crossing the proxy?</p>`,
          `<p>Hint 2: ways to verify without guessing: check the dependency (<code>spring-boot-starter-aop</code>), check <code>@Component</code> on the aspect, print <code>AopUtils.isAopProxy(bean)</code>, and enable <code>logging.level.org.springframework.aop=DEBUG</code>.</p>`,
          `<p>Hint 3: the five suspects: (1) missing starter-aop / aspectjweaver, (2) aspect not a bean (no @Component / not scanned), (3) pointcut does not match (wrong package, sub-packages need <code>..</code>), (4) call is self-invocation or the object was created with <code>new</code>, (5) method is private/final/static or the class final under CGLIB.</p>`
        ],
        solution: {
          approach: `<p>Work through the chain from "is AOP on" to "does this call get intercepted":</p>
            <ol>
              <li><b>AOP not enabled:</b> in Boot 3 you need <code>spring-boot-starter-aop</code> (which brings AspectJ's weaver). Check the dependency tree. Without it the annotations are inert and nothing complains.</li>
              <li><b>Aspect is not a bean:</b> <code>@Aspect</code> does not make a component; add <code>@Component</code> and make sure it sits under the scanned package. Check <code>/actuator/beans</code>.</li>
              <li><b>Pointcut mismatch:</b> <code>com.shop.service.*.*(..)</code> matches classes directly in <code>service</code> but not in <code>service.impl</code>; use <code>com.shop.service..*.*(..)</code>. Test with <code>@annotation</code> as a sanity check.</li>
              <li><b>Call does not cross the proxy:</b> self-invocation, object built with <code>new</code>, or called inside the constructor/<code>@PostConstruct</code> of the same bean.</li>
              <li><b>Method cannot be overridden:</b> private, static or final methods and final classes cannot be advised with CGLIB.</li>
            </ol>
            <p>Confirm quickly with <code>AopUtils.isAopProxy(ctx.getBean(MyService.class))</code>: if false, the problem is in steps 1-3 (no proxy at all); if true, look at steps 4-5.</p>`,
          complexity: `<p>Debugging order is O(1) checks. The point is to use the evidence (is it a proxy?) rather than trial and error.</p>`,
          followUps: ['How would you write a test that fails if the aspect stops firing?', 'When would you choose AspectJ weaving over Spring AOP?']
        }
      }
    ]
  });

  // =====================================================================
  // TOPIC 5 — Spring MVC request flow
  // =====================================================================
  var MVC_NODES = [
    { id: 'C', label: 'Client', x: 8, y: 8, shape: 'box' },
    { id: 'F', label: 'Filter chain', x: 34, y: 8, shape: 'box' },
    { id: 'DS', label: 'DispatcherServlet', x: 62, y: 8, shape: 'box' },
    { id: 'HM', label: 'HandlerMapping', x: 88, y: 8, shape: 'box' },
    { id: 'IC', label: 'Interceptors', x: 34, y: 26, shape: 'box' },
    { id: 'HA', label: 'HandlerAdapter', x: 62, y: 26, shape: 'box' },
    { id: 'CT', label: 'Controller', x: 88, y: 26, shape: 'box' },
    { id: 'MC', label: 'MessageConverter', x: 34, y: 44, shape: 'box' },
    { id: 'VR', label: 'ViewResolver', x: 62, y: 44, shape: 'box' },
    { id: 'EH', label: 'ExceptionHandler', x: 86, y: 44, shape: 'box' }
  ];
  var MVC_EDGES = [['C', 'F'], ['F', 'DS'], ['DS', 'HM'], ['DS', 'IC'], ['DS', 'HA'], ['HA', 'CT'], ['CT', 'MC'], ['CT', 'VR'], ['DS', 'EH'], ['EH', 'MC'], ['MC', 'C'], ['VR', 'C']];
  var MVC_COMMON = [
    { t: 'The browser sends the request with an <code>Accept</code> header. Tomcat (the embedded server) parses the bytes into an <code>HttpServletRequest</code>, then runs the <b>servlet filters</b> in order: character encoding, CORS, Spring Security, request logging.', cur: ['C', 'F'], e: 'C-F', q: 'Filters' },
    { t: 'Filters pass the request on to the <b>one</b> servlet Spring MVC registers: the <code>DispatcherServlet</code>, the "front controller". Every request enters the controllers through this single door.', cur: ['F', 'DS'], e: 'F-DS', q: 'DispatcherServlet' }
  ];
  var MVC_MAPPED = [
    { t: 'DispatcherServlet asks <b>HandlerMapping</b>: "who handles this method and path?" <code>RequestMappingHandlerMapping</code> built a table at startup from your <code>@GetMapping</code>/<code>@PostMapping</code> annotations. It returns the controller method plus the matching interceptors (a <i>handler execution chain</i>).', cur: ['DS', 'HM'], e: 'DS-HM', q: 'HandlerMapping' },
    { t: '<b>Interceptors</b> run <code>preHandle()</code> (auth token check, request id, metrics). If one returns <code>false</code> the request stops here and the controller never runs.', cur: ['DS', 'IC'], e: 'DS-IC', q: 'Interceptors' },
    { t: 'DispatcherServlet picks a <b>HandlerAdapter</b> that knows how to call this kind of handler: <code>RequestMappingHandlerAdapter</code> for annotated controller methods.', cur: ['DS', 'HA'], e: 'DS-HA', q: 'HandlerAdapter' },
    { t: 'The adapter prepares every argument: <code>@PathVariable</code> converts the text "42" to a number, <code>@RequestParam</code> reads the query string, and an <code>@RequestBody</code> is read by an <b>HttpMessageConverter</b> (JSON &rarr; object) and checked by <code>@Valid</code>. Then it <b>calls your controller method</b>.', cur: ['HA', 'CT'], e: 'HA-CT', q: 'Controller' }
  ];
  var MVC_MODES = {
    rest: {
      req: 'GET /orders/42  (Accept: application/json)',
      tail: [
        { t: 'Your method returns an <code>OrderDto</code>. The class is <code>@RestController</code> (= <code>@Controller</code> + <code>@ResponseBody</code>), so Spring <b>skips views</b> and asks the <b>message converters</b>: it looks at <code>Accept</code>, picks Jackson and turns the object into JSON.', cur: ['CT', 'MC'], e: 'CT-MC', q: 'MessageConverter' },
        { t: 'JSON goes into the response body with status <b>200</b>. Interceptors run <code>postHandle</code>/<code>afterCompletion</code>, the filters unwind in reverse order and Tomcat sends the bytes back to the client.', cur: ['MC', 'C'], e: 'MC-C', q: '200 JSON' }
      ]
    },
    view: {
      req: 'GET /orders/42/page  (Accept: text/html)',
      tail: [
        { t: 'The method returns the <i>String</i> <code>"orderDetail"</code> after putting data in a <code>Model</code>. There is no <code>@ResponseBody</code>, so the result is a <b>view name</b>. DispatcherServlet now has a ModelAndView and asks a <b>ViewResolver</b> to turn the name into a real template, for example <code>templates/orderDetail.html</code> (Thymeleaf).', cur: ['CT', 'VR'], e: 'CT-VR', q: 'ViewResolver' },
        { t: 'The view renders HTML by merging the model into the template and writes it to the response with status <b>200</b>. Same filter/interceptor unwinding as before.', cur: ['VR', 'C'], e: 'VR-C', q: '200 HTML' }
      ]
    },
    error: {
      req: 'GET /orders/999  (order does not exist)',
      tail: [
        { t: 'The service cannot find order 999 and your controller code throws <code>OrderNotFoundException</code>. The exception travels up out of the controller into DispatcherServlet instead of being turned into JSON.', cur: ['CT', 'DS'], e: 'HA-CT', bad: ['CT'], q: 'Exception thrown' },
        { t: 'DispatcherServlet gives the exception to its <b>HandlerExceptionResolvers</b>. They find your <code>@ExceptionHandler</code> inside a <code>@RestControllerAdvice</code> that maps it to <b>404</b> and returns a <code>ProblemDetail</code>. Interceptors still get <code>afterCompletion</code>.', cur: ['DS', 'EH'], e: 'DS-EH', q: 'ExceptionHandler' },
        { t: 'The returned error object is written through the normal <b>message converter</b> (JSON) with status <b>404</b>. One central place now defines every error response, instead of try/catch in each controller.', cur: ['EH', 'MC'], e: 'EH-MC', q: 'MessageConverter' },
        { t: 'The client receives the 404 JSON body. Note the flow reused the same pieces, only the middle changed.', cur: ['MC', 'C'], e: 'MC-C', q: '404 JSON' }
      ]
    },
    '404': {
      req: 'GET /nothing  (no mapping exists)',
      mapped: false,
      tail: [
        { t: 'HandlerMapping finds <b>no controller</b> for <code>GET /nothing</code>. DispatcherServlet knows already: interceptors and controllers will never run.', cur: ['DS', 'HM'], e: 'DS-HM', bad: ['HM'], q: 'No handler found' },
        { t: 'It reports a <b>404</b> (Boot 3.2+: <code>NoResourceFoundException</code>) to the error handling path. If the path exists but the HTTP method does not, you would get <b>405</b>; wrong <code>Content-Type</code> gives <b>415</b>; no acceptable <code>Accept</code> gives <b>406</b>.', cur: ['DS', 'EH'], e: 'DS-EH', q: 'Error handling' },
        { t: 'The error body is converted (JSON) and returned with status 404 to the client.', cur: ['EH', 'MC'], e: 'EH-MC', q: 'MessageConverter' },
        { t: 'Client receives the 404. Total work done: filters, mapping lookup. The controllers were never touched.', cur: ['MC', 'C'], e: 'MC-C', q: '404 JSON' }
      ]
    }
  };

  topics.push({
    title: 'Spring MVC Request Flow: DispatcherServlet to JSON',
    analogy: `<p>Think of a <b>big post office</b>. A letter arrives at the one front counter (<b>DispatcherServlet</b>). The clerk reads the address and looks it up in the street directory (<b>HandlerMapping</b>), picks the right courier who knows how to deliver to that kind of address (<b>HandlerAdapter</b>), and the delivery person (<b>your controller</b>) does the actual job.</p>
      <p>The reply is then packed in the right envelope: a plain JSON parcel (<b>HttpMessageConverter</b>) or a nicely printed brochure (<b>ViewResolver</b> + template). If something explodes on the way, there is a <b>complaints desk</b> (<code>@ControllerAdvice</code>) that turns the disaster into a polite, consistent error letter.</p>`,
    explain: `<p>Every HTTP request to a Spring Boot web app walks the same path. Knowing it turns "why do I get a 415?" and "why is my interceptor not called?" from guesswork into a quick lookup.</p>
      <ol>
        <li><b>Embedded server</b> (Tomcat) reads the socket on one of its worker threads and builds the request object.</li>
        <li><b>Filters</b> (servlet level, run before Spring MVC): encoding, CORS, security, logging.</li>
        <li><b>DispatcherServlet</b>: the front controller, one per app.</li>
        <li><b>HandlerMapping</b>: finds the controller method for (HTTP method + path + headers) and returns it with its <b>interceptors</b>.</li>
        <li><b>HandlerAdapter</b>: calls the method, filling arguments with <i>argument resolvers</i> (<code>@PathVariable</code>, <code>@RequestParam</code>, <code>@RequestBody</code>, <code>@Valid</code>).</li>
        <li><b>Your controller</b> calls services and returns something.</li>
        <li><b>Return value handling</b>: with <code>@ResponseBody</code>/<code>@RestController</code> an <b>HttpMessageConverter</b> writes JSON; otherwise a <b>ViewResolver</b> renders a template.</li>
        <li><b>Exceptions</b> at any step go to <b>HandlerExceptionResolvers</b> (<code>@ExceptionHandler</code>, <code>@ControllerAdvice</code>, <code>ResponseStatusException</code>).</li>
      </ol>
      <h4>Filter vs Interceptor vs Aspect</h4>
      ${H.table(['', 'Filter', 'HandlerInterceptor', 'Aspect (AOP)'], [
        ['Level', 'Servlet container', 'Spring MVC', 'Any Spring bean method'],
        ['Knows the controller method?', 'No', '<span class="c-g">Yes</span> (handler object)', 'Yes (join point)'],
        ['Runs for non-MVC requests (static files, errors)?', 'Yes', 'Only requests reaching DispatcherServlet', 'No'],
        ['Good for', 'Security, CORS, compression, body wrapping', 'Auth checks, request ids, locale, metrics per endpoint', 'Transactions, timing, audit around services']
      ])}
      <h4>Status code detective</h4>
      ${H.table(['Code', 'Usually means'], [
        ['<b>400</b>', 'Bad JSON, type mismatch (<code>"abc"</code> for a number) or <code>@Valid</code> failed (<code>MethodArgumentNotValidException</code>)'],
        ['<b>404</b>', 'No HandlerMapping matched the path (or your code threw not-found)'],
        ['<b>405</b>', 'Path matches but not for this HTTP method'],
        ['<b>406</b>', 'Client <code>Accept</code> cannot be produced (no converter)'],
        ['<b>415</b>', 'Request <code>Content-Type</code> not supported (e.g. sent form data to a JSON endpoint)'],
        ['<b>500</b>', 'Uncaught exception in your code']
      ])}
      <p>Pick a scenario in the visualizer and follow the highlighted edges. The plain-Java model below implements the same idea (mapping, interceptors, converter, exception resolver) in about 80 lines.</p>`,
    clues: [
      '"Walk me through what happens when a request hits a Spring Boot app" → Tomcat → filters → DispatcherServlet → HandlerMapping → interceptors → adapter → controller → converter/view',
      '"Filter vs Interceptor?" → servlet level vs Spring MVC level; interceptors know the handler',
      '<code>HttpMediaTypeNotSupportedException</code> / 415 → wrong <code>Content-Type</code>; 406 → wrong <code>Accept</code>; 405 → wrong HTTP method',
      '"Return JSON vs return an HTML page" → <code>@RestController</code> / <code>@ResponseBody</code> (MessageConverter) vs view name (ViewResolver)',
      '"Handle errors in one place with a consistent format" → <code>@RestControllerAdvice</code>, <code>ProblemDetail</code>',
      '"Why is my interceptor not called for this URL?" → path patterns not registered, or request never reached DispatcherServlet (filter blocked it)'
    ],
    code: [
      {
        lang: 'java', check: false, title: 'Controller + central error handling (Spring MVC)', code: `@RestController
@RequestMapping("/orders")
class OrderController {
    private final OrderService service;
    OrderController(OrderService service) { this.service = service; }

    @GetMapping("/{id}")                                   // HandlerMapping entry: GET /orders/{id}
    OrderDto get(@PathVariable long id) {                  // argument resolver: "42" -> 42
        return service.find(id);                           // throws OrderNotFoundException if missing
    }

    @PostMapping(consumes = "application/json")           // 415 if the client sends another Content-Type
    ResponseEntity<OrderDto> create(@Valid @RequestBody CreateOrderRequest req) {   // converter: JSON -> object
        OrderDto created = service.create(req);
        return ResponseEntity.created(URI.create("/orders/" + created.id())).body(created);   // 201 + Location
    }
}

@RestControllerAdvice                                      // one place for all controllers' errors
class ApiErrors {
    @ExceptionHandler(OrderNotFoundException.class)
    ProblemDetail notFound(OrderNotFoundException e) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, e.getMessage());
        pd.setTitle("Order not found");
        return pd;                                         // written as application/problem+json
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ProblemDetail invalid(MethodArgumentNotValidException e) {
        ProblemDetail pd = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        pd.setProperty("fields", e.getBindingResult().getFieldErrors().stream()
            .collect(Collectors.toMap(FieldError::getField, FieldError::getDefaultMessage, (a, b) -> a)));
        return pd;
    }
}`
      },
      {
        lang: 'java', title: 'A mini DispatcherServlet in plain Java (mapping, interceptors, converter, exception handling)', code: `import java.util.*;
import java.util.function.Function;

class Req {
    final String method, path;
    Req(String method, String path) { this.method = method; this.path = path; }
}

class Resp {
    int status = 200;
    String body = "";
}

interface Interceptor {
    boolean preHandle(Req req, Resp resp);                 // return false to stop the request
    default void afterCompletion(Req req, Resp resp) { }
}

class NotFoundException extends RuntimeException {
    NotFoundException(String msg) { super(msg); }
}

class MiniDispatcher {
    private record Route(String method, String pattern, Function<Map<String, String>, Object> handler) { }

    private final List<Route> routes = new ArrayList<>();
    private final List<Interceptor> interceptors = new ArrayList<>();

    void map(String method, String pattern, Function<Map<String, String>, Object> handler) {
        routes.add(new Route(method, pattern, handler));
    }

    void addInterceptor(Interceptor i) { interceptors.add(i); }

    /** HandlerMapping: does the path fit the pattern? Extract {variables}. */
    private Map<String, String> match(String pattern, String path) {
        String[] p = pattern.split("/");
        String[] a = path.split("/");
        if (p.length != a.length) return null;
        Map<String, String> vars = new HashMap<>();
        for (int i = 0; i < p.length; i++) {
            if (p[i].startsWith("{")) vars.put(p[i].substring(1, p[i].length() - 1), a[i]);
            else if (!p[i].equals(a[i])) return null;
        }
        return vars;
    }

    /** "HttpMessageConverter": turn the controller result into JSON text. */
    private String toJson(Object o) {
        if (o instanceof Map<?, ?> m) {
            StringBuilder sb = new StringBuilder("{");
            for (Map.Entry<?, ?> e : m.entrySet()) {
                if (sb.length() > 1) sb.append(',');
                sb.append('"').append(e.getKey()).append('"').append(':').append(toJson(e.getValue()));
            }
            return sb.append('}').toString();
        }
        return '"' + String.valueOf(o) + '"';
    }

    Resp doDispatch(Req req) {
        Resp resp = new Resp();
        List<Interceptor> ran = new ArrayList<>();
        try {
            Route found = null;
            Map<String, String> vars = null;
            boolean pathKnown = false;
            for (Route r : routes) {                           // 1) HandlerMapping
                Map<String, String> v = match(r.pattern(), req.path);
                if (v == null) continue;
                pathKnown = true;
                if (r.method().equals(req.method)) { found = r; vars = v; break; }
            }
            if (found == null) {                               // no handler: 404, or 405 if only the method is wrong
                resp.status = pathKnown ? 405 : 404;
                resp.body = toJson(Map.of("error", pathKnown ? "Method Not Allowed" : "Not Found"));
                return resp;
            }
            for (Interceptor i : interceptors) {               // 2) interceptors: preHandle
                if (!i.preHandle(req, resp)) return resp;
                ran.add(i);
            }
            Object result = found.handler().apply(vars);       // 3) HandlerAdapter calls the controller
            resp.body = toJson(result);                        // 4) message converter writes the body
        } catch (NotFoundException e) {                        // 5) exception resolver (@ExceptionHandler)
            resp.status = 404;
            resp.body = toJson(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            resp.status = 500;
            resp.body = toJson(Map.of("error", "Internal Server Error"));
        } finally {
            for (int k = ran.size() - 1; k >= 0; k--) ran.get(k).afterCompletion(req, resp);   // reverse order
        }
        return resp;
    }
}

public class MiniMvcDemo {
    public static void main(String[] args) {
        MiniDispatcher d = new MiniDispatcher();
        d.map("GET", "/orders/{id}", vars -> {
            if (vars.get("id").equals("0")) throw new NotFoundException("order 0 does not exist");
            return Map.of("id", vars.get("id"), "status", "PAID");
        });
        d.addInterceptor(new Interceptor() {
            public boolean preHandle(Req req, Resp resp) { System.out.println("  pre   " + req.method + " " + req.path); return true; }
            public void afterCompletion(Req req, Resp resp) { System.out.println("  after status=" + resp.status); }
        });
        List<Req> requests = List.of(new Req("GET", "/orders/42"), new Req("GET", "/orders/0"),
                                     new Req("POST", "/orders/42"), new Req("GET", "/nothing"));
        for (Req r : requests) {
            Resp resp = d.doDispatch(r);
            System.out.println(r.method + " " + r.path + " -> " + resp.status + " " + resp.body);
        }
    }
}`
      }
    ],
    codeTitle: ['Controller, converters and @RestControllerAdvice', 'Model: a 70-line front controller'],
    viz: {
      title: 'DispatcherServlet request flow, edge by edge',
      input: 'rest',
      inputLabel: 'Scenario: rest (JSON), view (HTML page), error (exception handled), 404 (no mapping)',
      gen: function (input) {
        var key = String(input || 'rest').trim().toLowerCase();
        var mode = Object.prototype.hasOwnProperty.call(MVC_MODES, key) ? MVC_MODES[key] : null;
        if (!mode) throw new Error('Type rest, view, error or 404');
        var steps = MVC_COMMON.concat(mode.mapped === false ? [] : MVC_MAPPED, mode.tail);
        var frames = [], visited = {}, journey = [];
        frames.push({ narr: 'Request: <b>' + mode.req + '</b>. Boxes are the parts of Spring MVC; follow the highlighted arrow to see which part works at each step.', parts: [
          { type: 'graph', label: 'Spring MVC components', directed: true, height: 54, nodes: MVC_NODES, edges: MVC_EDGES, hl: { C: 'cur' }, ehl: {}, tags: {} },
          { type: 'queue', label: 'Journey so far', items: [], frontLabel: 'start', backLabel: 'now' }
        ] });
        steps.forEach(function (s, idx) {
          var hl = {}, ehl = {}, k;
          for (k in visited) hl[k] = 'done';
          s.cur.forEach(function (id) { hl[id] = 'cur'; });
          (s.bad || []).forEach(function (id) { hl[id] = 'bad'; });
          if (idx === steps.length - 1) hl.C = 'sel';
          ehl[s.e] = (s.bad && s.bad.length) ? 'bad' : 'ok';
          s.cur.forEach(function (id) { visited[id] = true; });
          journey.push(s.q);
          frames.push({ narr: '<b>Step ' + (idx + 1) + ':</b> ' + s.t, parts: [
            { type: 'graph', label: 'Spring MVC components', directed: true, height: 54, nodes: MVC_NODES, edges: MVC_EDGES, hl: hl, ehl: ehl, tags: {} },
            { type: 'queue', label: 'Journey so far', items: journey.slice(), hl: (function () { var o = {}; o[journey.length - 1] = 'cur'; return o; })(), frontLabel: 'start', backLabel: 'now' }
          ] });
        });
        return frames;
      }
    },
    examples: [
      {
        title: 'Example 1 - Filter vs interceptor in code',
        html: `<p>A <b>filter</b> sees every request, even for static files and error pages, but has no idea which controller will run. An <b>interceptor</b> receives the matched handler, so it can read annotations on the controller method (for example a custom <code>@RequiresPlan("PRO")</code>). Use <code>OncePerRequestFilter</code> for filters, and register interceptors through <code>WebMvcConfigurer</code>.</p>`,
        code: { lang: 'java', check: false, code: `@Component
class RequestIdFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String id = Optional.ofNullable(req.getHeader("X-Request-Id")).orElse(UUID.randomUUID().toString());
        MDC.put("requestId", id);                 // appears in every log line of this request
        res.setHeader("X-Request-Id", id);
        try { chain.doFilter(req, res); }         // continue towards DispatcherServlet
        finally { MDC.remove("requestId"); }
    }
}

@Configuration
class WebConfig implements WebMvcConfigurer {
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new PlanInterceptor()).addPathPatterns("/api/**").excludePathPatterns("/api/public/**");
    }
}

class PlanInterceptor implements HandlerInterceptor {
    @Override
    public boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object handler) throws Exception {
        if (handler instanceof HandlerMethod hm && hm.hasMethodAnnotation(RequiresPlan.class)) {
            // check the user's plan; res.sendError(403) and return false to stop
        }
        return true;
    }
}` }
      },
      {
        title: 'Example 2 - The same URL, three different errors',
        html: `<p>Given <code>@PostMapping(value="/orders", consumes="application/json")</code>:</p>
          <ul>
            <li><code>PUT /orders</code> &rarr; path matches, method does not &rarr; <b>405</b> (with an <code>Allow: POST</code> header).</li>
            <li><code>POST /orders</code> with <code>Content-Type: text/plain</code> &rarr; <b>415</b> Unsupported Media Type.</li>
            <li><code>POST /orders</code> with JSON <code>{"qty": "abc"}</code> &rarr; the message converter fails to read &rarr; <b>400</b> (<code>HttpMessageNotReadableException</code>).</li>
            <li>JSON is valid but <code>qty = -1</code> breaks <code>@Min(1)</code> &rarr; <b>400</b> (<code>MethodArgumentNotValidException</code>).</li>
          </ul>
          <p>Never have your controller return <b>200 with an error message inside</b>; use the right status so clients, retries and monitoring work.</p>`
      },
      {
        title: 'Example 3 - Controller or RestController returning a view',
        html: `<p><code>@Controller</code> methods return a <b>view name</b> (String) by default; the ViewResolver turns it into a template path. <code>@RestController</code> methods return <b>data</b> that a message converter serialises. Mixing them up is a classic bug: a <code>@Controller</code> that returns a <code>String</code> of JSON will try to find a template named exactly that text and give a 500 "Error resolving template". Add <code>@ResponseBody</code> or use <code>@RestController</code>.</p>`,
        code: { lang: 'java', check: false, code: `@Controller
class PageController {
    @GetMapping("/orders/{id}/page")
    String page(@PathVariable long id, Model model) {
        model.addAttribute("order", service.find(id));
        return "orderDetail";               // ViewResolver -> templates/orderDetail.html
    }
}` }
      },
      {
        title: 'Example 4 - Slow endpoint blocks a Tomcat thread',
        html: `<p>By default one request occupies one Tomcat worker thread (about 200 of them) for the whole call, including waiting on the database or another service. If every request waits 2 seconds on a slow dependency, 200 threads serve only 100 requests per second and the 201st request queues. Options: shorten the wait (timeouts!), return <code>Callable</code>/<code>CompletableFuture</code> to free the container thread, enable virtual threads (<code>spring.threads.virtual.enabled=true</code>, Boot 3.2+, Java 21), or use WebFlux for fully non-blocking pipelines.</p>`
      }
    ],
    deepDive: `<p><b>Startup vs request time.</b> <code>RequestMappingHandlerMapping</code> scans all beans for <code>@RequestMapping</code> once at startup and builds a lookup registry; at request time it only does a fast match and picks the most specific one (an ambiguous pair gives <code>IllegalStateException: Ambiguous mapping</code> at boot). Static resources (<code>/static</code>, <code>/public</code>) are served by another HandlerMapping with a resource handler, which is why a missing file also becomes a 404 from the same machinery.</p>
      <p><b>Argument resolvers and converters.</b> Each controller parameter is handled by a <code>HandlerMethodArgumentResolver</code>; <code>@RequestBody</code> uses <code>RequestResponseBodyMethodProcessor</code> and the list of <code>HttpMessageConverter</code>s (Jackson JSON, plain String, byte[], form data...) chosen by <code>Content-Type</code>. The reverse (return values) uses <code>Accept</code> for <b>content negotiation</b>. Boot configures Jackson with <code>FAIL_ON_UNKNOWN_PROPERTIES</code> disabled and ISO dates; changing the global <code>ObjectMapper</code> changes every endpoint.</p>
      <p><b>Exceptions.</b> The built-in resolvers run in this order: <code>ExceptionHandlerExceptionResolver</code> (your @ExceptionHandler), <code>ResponseStatusExceptionResolver</code> (<code>@ResponseStatus</code>, <code>ResponseStatusException</code>), <code>DefaultHandlerExceptionResolver</code> (standard Spring exceptions &rarr; 4xx). Unhandled ones fall to the servlet container and Boot's <code>/error</code> endpoint (<code>BasicErrorController</code>). With <code>spring.mvc.problemdetails.enabled=true</code> standard errors use RFC 9457 <code>ProblemDetail</code> bodies. Never leak stack traces: keep <code>server.error.include-stacktrace=never</code>.</p>
      <p><b>Async and threads.</b> Returning <code>Callable</code>, <code>DeferredResult</code>, <code>CompletableFuture</code>, <code>SseEmitter</code> or <code>StreamingResponseBody</code> releases the container thread while work continues on another thread, and the response is dispatched again when the result is ready (interceptors <code>preHandle</code> may run twice - use <code>AsyncHandlerInterceptor</code>). ThreadLocals such as security context or MDC do not follow you across threads unless you propagate them.</p>
      <p><b>Production reality.</b> Put authentication in filters (Spring Security is a filter chain), cross-endpoint cross-cutting data in interceptors, and domain concerns in services. Always set server timeouts and max request size (<code>server.tomcat.max-swallow-size</code>, <code>spring.servlet.multipart.max-file-size</code>), and make sure the load balancer idle timeout is larger than your keep-alive.</p>`,
    aiEra: `<p><b>What AI changes:</b> generating a CRUD controller is now a one-line prompt, and the result usually compiles. The typical weaknesses are in exactly the places this flow explains: returning JPA entities directly (leaking fields, lazy loading errors in the converter), <code>200 OK</code> for creates and failures, missing <code>@Valid</code>, and try/catch blocks inside every method instead of a central advice.</p>
      <p><b>Use AI as a partner:</b> ask it to generate <code>MockMvc</code> tests for all status-code branches (400, 404, 405, 415) from your controller, to convert scattered try/catch into a <code>@RestControllerAdvice</code> returning <code>ProblemDetail</code>, and to explain a given 415/406 from the request headers you paste. Turn on <code>logging.level.org.springframework.web=DEBUG</code> and paste the log: it tells which handler and converter were chosen.</p>
      <p><b>Where AI goes wrong:</b> confuses Filter and Interceptor, registers an interceptor but forgets the path patterns, mixes <code>javax.servlet</code> with <code>jakarta.servlet</code> (Boot 3), or puts blocking calls in a WebFlux handler.</p>
      <p><b>What you must still own:</b> the API contract (status codes, error format, idempotency) and where each concern lives in the pipeline. Draw the flow for your own app once; it makes every later debugging session shorter.</p>`,
    problems: [
      {
        title: 'Symptom to Pipeline Stage',
        level: 'Easy',
        tags: ['spring mvc', 'http status', 'debugging'],
        companies: ['Cognizant', 'Capgemini', 'Zalando'],
        statement: `<p>For each symptom name the pipeline stage that produced it and the one-line fix: (a) <code>POST /orders</code> returns <b>415</b>; (b) <code>GET /order/5</code> returns <b>404</b> but <code>/orders/5</code> works; (c) <code>DELETE /orders/5</code> returns <b>405</b> with header <code>Allow: GET</code>; (d) the endpoint returns <b>401</b> before your controller logs anything; (e) a <code>@Valid</code> failure returns <b>400</b> with an ugly default body.</p>`,
        constraints: `Spring Boot 3.x, Spring Security on the classpath, JSON API.`,
        example: `<p>(a) Client sent ${H.c('y', 'Content-Type: text/plain')} to an endpoint that consumes JSON: the stage is <b>message converter selection</b> in the HandlerAdapter; fix the client header (or add a converter).</p>`,
        brute: { why: `<p>Adding <code>try/catch</code> blocks and printing from the controller for each case. But for (a)-(d) the controller is never even called, so the prints never appear and you stare at silent logs.</p>` },
        mcq: { q: 'A 405 response means:', options: ['The path matched a mapping, but not for this HTTP method', 'No controller exists for the path', 'The JSON body was invalid', 'A filter rejected the token'], answer: 0, explain: 'HandlerMapping found handlers for the path but none for the HTTP method, so DispatcherServlet answers 405 and lists allowed methods in the Allow header.' },
        hints: [
          `<p>Hint 1: draw the pipeline: filters, DispatcherServlet, HandlerMapping, interceptors, adapter (argument resolution), controller, converter, exception resolver.</p>`,
          `<p>Hint 2: ask for each symptom: "was my controller method entered?" If not, the answer is before it: filter, mapping or argument resolution.</p>`,
          `<p>Hint 3: map: 401 &rarr; Spring Security filter chain; 404 vs 405 &rarr; HandlerMapping; 415/406 &rarr; content negotiation and converters; 400 validation &rarr; argument resolver then exception resolver.</p>`
        ],
        solution: {
          approach: `<p><b>(a) 415:</b> the HandlerAdapter could not find an <code>HttpMessageConverter</code> for the request <code>Content-Type</code>; the controller was not called. Fix the client header to <code>application/json</code>.</p>
            <p><b>(b) 404:</b> HandlerMapping found no pattern for <code>/order/5</code> (typo, singular vs plural, missing context path or <code>/api</code> prefix). Fix the URL or the <code>@RequestMapping</code>.</p>
            <p><b>(c) 405:</b> the path exists for GET only. Either the client uses the wrong verb or you forgot a <code>@DeleteMapping</code>; the <code>Allow</code> header tells exactly what is supported.</p>
            <p><b>(d) 401:</b> produced in the <b>servlet filter chain</b> by Spring Security, before DispatcherServlet, so no controller log. Check the Authorization header and security configuration.</p>
            <p><b>(e) 400:</b> argument resolution runs the validator and throws <code>MethodArgumentNotValidException</code> before your method body. Add a <code>@RestControllerAdvice</code> handler that returns a clean <code>ProblemDetail</code> with the field errors.</p>
            <p>General method: ask first whether the controller ran, then place the symptom on the diagram.</p>`,
          complexity: `<p>Pure reasoning, O(1). The skill being trained is mapping a symptom to a pipeline stage.</p>`,
          followUps: ['How would you log which HandlerMapping and converter handled a request?', 'Where would you put a rule "reject requests larger than 1 MB"?']
        }
      }
    ]
  });

  // =====================================================================
  // TOPIC 6 — Spring Data JPA
  // =====================================================================
  topics.push({
    title: 'Spring Data JPA: Repositories, Persistence Context & N+1',
    analogy: `<p>A <b>repository</b> is a helpful <b>librarian</b>: you say "find me customer by email" and the librarian fetches it without you writing a single SQL query. The <b>persistence context</b> (the JPA <code>EntityManager</code>) is your <b>desk during one transaction</b>. Every book you borrow sits on the desk together with a <i>photocopy of how it looked when you got it</i>.</p>
      <p>When you finish (commit), the librarian compares each book on the desk with its photocopy and writes down <i>only the differences</i>. That is <b>dirty checking</b>: you never call "save" for a book you changed. <b>N+1</b> is asking the librarian one question to get a list of 100 authors, and then 100 more separate questions, one for each author's address.</p>`,
    explain: `<p>The stack, bottom to top: <b>Database &larr; JDBC &larr; Hibernate (the JPA implementation) &larr; JPA (the standard: <code>@Entity</code>, <code>EntityManager</code>) &larr; Spring Data JPA (repository interfaces)</b>.</p>
      <h4>1. Repositories: write an interface, get an implementation</h4>
      <p>Extend <code>JpaRepository&lt;Customer, Long&gt;</code> and Spring generates the class at startup (a proxy backed by <code>SimpleJpaRepository</code>). You get <code>save</code>, <code>findById</code>, <code>findAll</code>, <code>deleteById</code>, paging and sorting for free. Add methods by <b>naming</b>: <code>findByEmail</code>, <code>findByActiveTrueOrderByEmailAsc</code>, <code>existsByEmail</code>, <code>countByActive</code>. For anything harder write <code>@Query</code> (JPQL, or <code>nativeQuery = true</code>). Return a <code>Page</code>/<code>Slice</code> and pass a <code>Pageable</code> for pagination. Return an interface or record to project only some columns.</p>
      <h4>2. Entity states</h4>
      ${H.table(['State', 'Meaning', 'DB effect'], [
        ['<b>Transient/new</b>', 'Plain Java object, JPA does not know it', 'None'],
        ['<b>Managed</b>', 'On the desk (in the persistence context) inside a transaction', 'Changes are auto-detected and written at flush'],
        ['<b>Detached</b>', 'Was managed, but the transaction/session ended', '<span class="c-r">Changes are NOT saved</span> unless you merge/save it again'],
        ['<b>Removed</b>', 'Scheduled for delete', 'DELETE at flush']
      ])}
      <h4>3. What the persistence context gives you</h4>
      <ul>
        <li><b>First-level cache</b>: <code>findById(1)</code> twice in one transaction runs SQL once; both calls return the <i>same Java object</i>.</li>
        <li><b>Dirty checking</b>: change a managed entity's field and the UPDATE is sent at flush/commit. No <code>save()</code> needed.</li>
        <li><b>Lazy loading</b>: related data (<code>customer.getOrders()</code>) is loaded only when touched, <i>and only while the context is open</i>, otherwise <code>LazyInitializationException</code>.</li>
      </ul>
      <h4>4. The N+1 problem</h4>
      <p>Load 100 customers (1 query), then print each one's orders: each <code>getOrders()</code> fires its own query &rarr; <b>1 + 100 = 101 queries</b>. Fixes: <code>join fetch</code> in the query, <code>@EntityGraph</code>, <code>hibernate.default_batch_fetch_size</code> (loads in groups), or a DTO projection that selects exactly the needed columns. The next modules go deeper into locking and pooling; here you must <b>recognise</b> it from the SQL log (<code>spring.jpa.show-sql</code> or <code>logging.level.org.hibernate.SQL=DEBUG</code>).</p>
      <p>Run the commands in the visualizer: see exactly when SQL is sent and why a rename of a detached object is lost.</p>`,
    clues: [
      '"I changed the field and didn\'t call save(), but the DB updated" → managed entity + dirty checking at commit',
      '"I changed the field and the DB did <b>not</b> update" → detached entity (no transaction / object from another request) or exception swallowed before commit',
      '<code>LazyInitializationException: could not initialize proxy - no Session</code> → lazy association touched after the transaction ended',
      '"One endpoint fires hundreds of identical-looking SELECTs" → N+1; look for loops over lazy collections',
      '"Derive a query from the method name / paginate results" → Spring Data derived queries, <code>Pageable</code>',
      '<code>findById</code> twice, SQL once → first-level cache; "why is my query seeing stale data?" → context returns cached instance'
    ],
    code: [
      {
        lang: 'java', check: false, title: 'Entity, repository, and service (Spring Data JPA)', code: `@Entity
@Table(name = "customers")
public class Customer {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    private boolean active = true;

    @OneToMany(mappedBy = "customer", fetch = FetchType.LAZY)   // collections are LAZY by default
    private List<CustomerOrder> orders = new ArrayList<>();

    protected Customer() { }                                       // JPA needs a no-arg constructor
    public Customer(String email) { this.email = email; }
    public Long getId() { return id; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public List<CustomerOrder> getOrders() { return orders; }
}

public interface CustomerRepository extends JpaRepository<Customer, Long> {

    Optional<Customer> findByEmail(String email);                       // derived: WHERE email = ?
    List<Customer> findByActiveTrueOrderByEmailAsc();                   // WHERE active = true ORDER BY email
    Page<Customer> findByEmailContainingIgnoreCase(String part, Pageable pageable);

    @Query("select c from Customer c join fetch c.orders where c.id = :id")   // one query, no N+1
    Optional<Customer> findWithOrders(@Param("id") Long id);

    @EntityGraph(attributePaths = "orders")                             // another way to fetch orders together
    List<Customer> findByActive(boolean active);

    interface EmailOnly { String getEmail(); }                          // projection: SELECT email only
    List<EmailOnly> findAllBy();

    @Modifying
    @Query("update Customer c set c.active = false where c.id in :ids")
    int deactivate(@Param("ids") Collection<Long> ids);                 // bulk update: bypasses the persistence context!
}

@Service
class CustomerService {
    private final CustomerRepository repo;
    CustomerService(CustomerRepository repo) { this.repo = repo; }

    @Transactional                                                       // the "desk" lives for this method
    public void changeEmail(long id, String newEmail) {
        Customer c = repo.findById(id).orElseThrow();                    // managed now
        c.setEmail(newEmail);                                            // no save() needed: dirty checking
    }                                                                    // commit -> flush -> UPDATE customers SET email=? WHERE id=?
}`
      },
      {
        lang: 'java', title: 'Plain-Java model of dirty checking and the first-level cache', code: `import java.util.*;

class User {
    final long id;
    String name;
    User(long id, String name) { this.id = id; this.name = name; }
}

/** A tiny "EntityManager": desk (context), photocopy (snapshot) and SQL log. */
class MiniSession {
    private final Map<Long, String> db;                                // the database table
    private final Map<Long, User> context = new LinkedHashMap<>();    // first-level cache
    private final Map<Long, String> snapshot = new HashMap<>();       // value at load time
    final List<String> sqlLog = new ArrayList<>();

    MiniSession(Map<Long, String> db) { this.db = db; }

    User find(long id) {
        User cached = context.get(id);
        if (cached != null) {
            sqlLog.add("-- cache hit for id " + id + " (no SQL)");
            return cached;                                             // SAME object every time
        }
        sqlLog.add("SELECT * FROM users WHERE id=" + id);
        String name = db.get(id);
        if (name == null) return null;
        User u = new User(id, name);
        context.put(id, u);
        snapshot.put(id, name);                                        // remember how it looked
        return u;
    }

    /** Compare each managed entity with its snapshot; write only the differences. */
    void flush() {
        for (User u : context.values()) {
            if (!Objects.equals(snapshot.get(u.id), u.name)) {
                sqlLog.add("UPDATE users SET name='" + u.name + "' WHERE id=" + u.id);
                db.put(u.id, u.name);
                snapshot.put(u.id, u.name);
            }
        }
    }

    void commit() {
        flush();                                                       // commit always flushes first
        context.clear();                                               // context closes: entities become detached
        snapshot.clear();
    }
}

public class DirtyCheckDemo {
    public static void main(String[] args) {
        Map<Long, String> db = new HashMap<>();
        db.put(1L, "Asha");
        db.put(2L, "Ben");

        MiniSession tx = new MiniSession(db);
        User u = tx.find(1);
        u.name = "Bobby";                       // just a field assignment, no save() call anywhere
        System.out.println("same object? " + (u == tx.find(1)));   // true, second find is a cache hit
        tx.commit();                            // the UPDATE is sent here

        tx.sqlLog.forEach(System.out::println);
        System.out.println("db now: " + db.get(1L));               // Bobby

        u.name = "Lost";                        // u is DETACHED now: nobody is watching
        System.out.println("db after detached change: " + db.get(1L));   // still Bobby
    }
}`
      }
    ],
    codeTitle: ['Entity, repository with derived queries, service', 'Model: persistence context with dirty checking'],
    viz: {
      title: 'Persistence context: when does SQL actually run?',
      input: 'find 1; rename 1 Bobby; find 1; commit',
      inputLabel: 'Commands separated by semicolons: find N, rename N Name, persist N Name, remove N, flush, commit',
      gen: function (input) {
        var cmds = String(input || '').split(';').map(function (s) { return s.trim(); }).filter(Boolean);
        var hint = 'Use commands like: find 1; rename 1 Bobby; persist 3 Cara; remove 2; flush; commit (2 to 8 commands)';
        if (cmds.length < 2 || cmds.length > 8) throw new Error(hint);
        var db = { 1: 'Asha', 2: 'Ben' }, ctx = [], sql = [], frames = [];
        function dbRows() { return Object.keys(db).map(Number).sort(function (a, b) { return a - b; }).map(function (k) { return [k, db[k]]; }); }
        function ctxRows() { return ctx.map(function (e) { return [e.id, e.name, e.snap === null ? '-' : e.snap, e.state]; }); }
        function frame(narr, ctxHl, dbHl) {
          frames.push({ narr: narr, parts: [
            { type: 'table', label: 'Persistence context (the desk): entity now, photocopy, state', columns: ['id', 'name now', 'snapshot', 'state'], rows: ctxRows(), hl: ctxHl || {} },
            { type: 'table', label: 'Database table users', columns: ['id', 'name'], rows: dbRows(), hl: dbHl || {} },
            { type: 'queue', label: 'SQL sent to the database', items: sql.slice(), frontLabel: 'first', backLabel: 'latest' }
          ] });
        }
        function find(id) { for (var i = 0; i < ctx.length; i++) if (ctx[i].id === id) return i; return -1; }
        function dbIdx(id) { var r = dbRows(); for (var i = 0; i < r.length; i++) if (r[i][0] === id) return i; return -1; }
        function doFlush() {
          var changed = 0, dbHl = {}, i;
          for (i = 0; i < ctx.length; i++) {
            var e = ctx[i];
            if (e.state === 'new') { sql.push("INSERT INTO users VALUES (" + e.id + ", '" + e.name + "')"); db[e.id] = e.name; e.snap = e.name; e.state = 'managed'; changed++; dbHl[dbIdx(e.id)] = 'ok'; }
            else if (e.state === 'removed') { sql.push('DELETE FROM users WHERE id=' + e.id); delete db[e.id]; e.state = 'gone'; changed++; }
            else if (e.snap !== e.name) { sql.push("UPDATE users SET name='" + e.name + "' WHERE id=" + e.id); db[e.id] = e.name; e.snap = e.name; changed++; dbHl[dbIdx(e.id)] = 'ok'; }
          }
          ctx = ctx.filter(function (x) { return x.state !== 'gone'; });
          return { changed: changed, dbHl: dbHl };
        }
        frame('A transaction begins with an <b>empty</b> persistence context. The database holds two rows. Nothing has been loaded, nothing watched.');
        cmds.forEach(function (c) {
          var t = c.split(/\s+/), op = t[0].toLowerCase(), id = Number(t[1]), idx, hl = {};
          if (['find', 'rename', 'persist', 'remove'].indexOf(op) >= 0 && (t.length < 2 || isNaN(id))) throw new Error(hint);
          if (op === 'find') {
            idx = find(id);
            if (idx >= 0) { hl[idx] = 'ok'; frame('<code>find(' + id + ')</code>: already on the desk, so it is answered from the <b>first-level cache</b>. <span class="c-g">No SQL.</span> You get the very same Java object.', hl); }
            else if (db[id] !== undefined) {
              sql.push('SELECT * FROM users WHERE id=' + id);
              ctx.push({ id: id, name: db[id], snap: db[id], state: 'managed' }); hl[ctx.length - 1] = 'ok';
              frame('<code>find(' + id + ')</code>: not on the desk, so Hibernate runs a <b>SELECT</b>, puts the entity in the context as <b>managed</b> and stores a snapshot (the photocopy) for later comparison.', hl);
            } else {
              sql.push('SELECT * FROM users WHERE id=' + id);
              frame('<code>find(' + id + ')</code>: SELECT runs but there is no such row, so the result is empty/null.');
            }
          } else if (op === 'rename') {
            var nm = t.slice(2).join(' ');
            if (!nm) throw new Error(hint);
            idx = find(id);
            if (idx >= 0 && ctx[idx].state !== 'removed') { ctx[idx].name = nm; hl[idx] = 'cur'; frame('<code>entity.setName("' + esc(nm) + '")</code> changes the Java object only. <b>No SQL yet.</b> The entity is now <b>dirty</b>: name now differs from the snapshot. JPA will notice at flush time.', hl); }
            else frame('<span class="c-r">Lost update!</span> Entity ' + id + ' is not managed (never loaded in this transaction, or <b>detached</b> after a commit). Changing a plain Java object does <b>not</b> touch the database. Load it with <code>find</code> inside the transaction first.');
          } else if (op === 'persist') {
            var nm2 = t.slice(2).join(' ');
            if (!nm2) throw new Error(hint);
            if (find(id) >= 0 || db[id] !== undefined) frame('<span class="c-r">Duplicate key</span>: id ' + id + ' already exists, so the INSERT would fail at flush with a constraint violation.');
            else { ctx.push({ id: id, name: nm2, snap: null, state: 'new' }); hl[ctx.length - 1] = 'cur'; frame('<code>persist(new User(' + id + ', "' + esc(nm2) + '"))</code>: the entity becomes managed and is <b>scheduled for INSERT</b>. With assigned ids the SQL waits until flush (with IDENTITY ids Hibernate may insert immediately to learn the id).', hl); }
          } else if (op === 'remove') {
            idx = find(id);
            if (idx >= 0) { ctx[idx].state = 'removed'; hl[idx] = 'bad'; frame('<code>remove(entity)</code>: marked <b>removed</b>. DELETE is sent at flush.', hl); }
            else frame('<span class="c-r">Cannot remove</span> an entity that is not managed. Load it first (<code>find</code>), or use <code>deleteById</code> which does that for you.');
          } else if (op === 'flush' || op === 'commit') {
            var r = doFlush();
            if (op === 'flush') frame(r.changed ? '<b>flush</b>: Hibernate compares every managed entity with its snapshot and sends <b>' + r.changed + '</b> SQL statement(s). The transaction is still open; nothing is permanent until commit.' : '<b>flush</b>: nothing differs from the snapshots, so <span class="c-g">no SQL at all</span>.', {}, r.dbHl);
            else {
              var msg = r.changed ? '<b>commit</b> flushes first: ' + r.changed + ' statement(s) sent (see the queue), then the transaction commits.' : '<b>commit</b>: nothing was dirty, so no SQL; the transaction just ends.';
              ctx = [];
              frame(msg + ' The persistence context is now <b>closed</b>: every entity you still hold is <b>detached</b>, so later changes to it are ignored.', {}, r.dbHl);
            }
          } else throw new Error(hint);
        });
        frame('Summary: SQL appeared only for <b>loads</b> and at <b>flush/commit</b>. Reading the same id again was free (cache), and changing a managed object needed no <code>save()</code>. Try <code>rename 1 X; commit</code> without a find first to see a lost update.', {}, {});
        return frames;
      }
    },
    examples: [
      {
        title: 'Example 1 - Derived queries and what SQL they become',
        html: `<p>Spring parses the method name into a query at startup (a typo like <code>findByEmial</code> fails the application at boot, which is good). Examples:</p>
          ${H.table(['Method name', 'Query'], [
            ['<code>findByEmail(String e)</code>', '<code>where email = ?</code>'],
            ['<code>findByActiveTrueOrderByEmailAsc()</code>', '<code>where active = true order by email asc</code>'],
            ['<code>findTop5ByOrderByCreatedAtDesc()</code>', '<code>order by created_at desc limit 5</code>'],
            ['<code>existsByEmail(String e)</code>', '<code>select 1 ... limit 1</code> (cheaper than loading)'],
            ['<code>countByActive(boolean a)</code>', '<code>select count(*) ... where active = ?</code>']
          ])}
          <p>When the name gets longer than about three conditions, switch to <code>@Query</code> with a clear name.</p>`
      },
      {
        title: 'Example 2 - Spotting and fixing N+1',
        html: `<p>The SQL log shows one <code>select ... from customers</code> followed by many <code>select ... from orders where customer_id=?</code>. The code that caused it looks innocent:</p>
          <pre>for (Customer c : repo.findAll())          // 1 query
    total += c.getOrders().size();          // +1 query PER customer (lazy load)</pre>
          <p>Fix with a fetch join, an entity graph, or better, a query that computes what you need:</p>`,
        code: { lang: 'java', check: false, code: `// one query with a GROUP BY - no entities needed for a report
@Query("select c.email as email, count(o) as orderCount from Customer c left join c.orders o group by c.email")
List<CustomerStats> stats();

interface CustomerStats { String getEmail(); long getOrderCount(); }

// when you need the entities AND their orders in the same call
@EntityGraph(attributePaths = "orders")
List<Customer> findByActiveTrue();` }
      },
      {
        title: 'Example 3 - Pagination without loading everything',
        html: `<p>Return a <code>Page</code> (knows the total count via an extra count query) or a <code>Slice</code> (just "is there a next page?", cheaper). Always give a stable sort order, otherwise pages can repeat or skip rows. Large offsets get slow (the database still walks past all skipped rows); the Data Access Patterns module covers keyset pagination.</p>`,
        code: { lang: 'java', check: false, code: `@GetMapping("/customers")
Page<CustomerDto> list(@RequestParam(defaultValue = "0") int page,
                       @RequestParam(defaultValue = "20") int size) {
    Pageable pageable = PageRequest.of(page, Math.min(size, 100), Sort.by("email"));   // cap the page size!
    return repo.findAll(pageable).map(c -> new CustomerDto(c.getId(), c.getEmail()));  // DTO, not the entity
}` }
      },
      {
        title: 'Example 4 - save() on a new entity vs an existing one',
        html: `<p><code>save()</code> checks "is this entity new?" (id is null, or version is null). New: <code>persist</code> (INSERT). Not new: <code>merge</code> (SELECT, copy state, UPDATE). A common surprise: if you assign the id yourself (a UUID) and call <code>save()</code>, Spring thinks it exists and does a <b>SELECT before the INSERT</b>. Implement <code>Persistable&lt;ID&gt;</code> or use a <code>@Version</code> field to fix it. And inside a transaction you rarely need <code>save()</code> for updates at all, thanks to dirty checking.</p>`
      }
    ],
    deepDive: `<p><b>Where the repository comes from.</b> At startup a <code>JpaRepositoryFactoryBean</code> builds a <b>JDK dynamic proxy</b> for your interface (the same proxy idea as the AOP topic). Calls to <code>save</code>/<code>findById</code> go to <code>SimpleJpaRepository</code> (annotated <code>@Transactional(readOnly = true)</code> at class level and plain <code>@Transactional</code> on writes), derived query methods go to a <code>PartTree</code> parser which builds a JPQL/Criteria query once. This is why each repository call is transactional even if your service is not, but several repository calls in a row are <b>not</b> one transaction unless your service method is <code>@Transactional</code>.</p>
      <p><b>EntityManager is a shared proxy.</b> You inject one <code>EntityManager</code>, but behind it Spring resolves the real one bound to the current transaction (thread). No transaction means no persistent context: each repository call has its own short one, and returned entities are detached immediately.</p>
      <p><b>Flush modes and visibility.</b> With <code>FlushModeType.AUTO</code> Hibernate flushes before running a JPQL query that touches changed tables, so your query sees your pending changes. Bulk <code>@Modifying</code> queries bypass the context: entities already loaded stay stale unless you use <code>clearAutomatically = true</code>.</p>
      <p><b>IDs and batching.</b> <code>GenerationType.IDENTITY</code> forces an immediate INSERT per row and disables JDBC batch inserts; on PostgreSQL prefer <code>SEQUENCE</code> with an allocation size. Set <code>spring.jpa.properties.hibernate.jdbc.batch_size</code> and <code>order_inserts</code> for bulk loads. Use <code>@Version</code> for optimistic locking (detail in the Data Access Patterns module).</p>
      <p><b>Entity design pitfalls.</b> Never use Lombok <code>@Data</code> on entities (the generated <code>equals/hashCode/toString</code> touch lazy collections and trigger queries or infinite recursion in bidirectional relations). Use <code>@ManyToOne(fetch = LAZY)</code> explicitly because the default for to-one is EAGER. Do not return entities from controllers: use DTOs/records. <code>spring.jpa.open-in-view</code> defaults to true (keeps the session open during view rendering, which hides lazy loading in controllers and holds a DB connection longer); set it to false and fetch what you need in the service. <code>ddl-auto</code> should be <code>none</code>/<code>validate</code> in production with migrations in Flyway or Liquibase.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants generate entities, repositories and mappers instantly, which makes the <i>shape of the SQL</i> invisible to you. The code looks perfect and still produces 500 queries per request.</p>
      <p><b>Use AI as a partner:</b> paste the Hibernate SQL log of one request (set <code>logging.level.org.hibernate.SQL=DEBUG</code>) and ask <code>Count the queries, find the N+1 and propose the smallest change to fix it</code>. Ask it to write a <code>@DataJpaTest</code> with Testcontainers that asserts the number of statements. Ask for a Flyway migration matching an entity change, then review the DDL yourself.</p>
      <p><b>Where AI goes wrong:</b> Lombok <code>@Data</code> on entities, <code>FetchType.EAGER</code> "to fix" a LazyInitializationException (which turns one problem into N+1 everywhere), <code>save()</code> after every setter, returning entities with bidirectional relations (infinite JSON recursion), and derived-query names that do not parse.</p>
      <p><b>What you must still own:</b> thinking in transactions and in generated SQL. The question "how many queries does this endpoint run, and why?" can only be answered by looking at the log, not at the Java.</p>`,
    problems: [
      {
        title: 'The Update That Never Happened',
        level: 'Medium',
        tags: ['jpa', 'dirty checking', 'detached entity'],
        companies: ['Atlassian', 'Cognizant', 'Flipkart'],
        statement: `<p>A developer wrote this service method and reports "the email never changes in the database, no exception":</p>
          <pre>public void rename(long id, String email) {
    Customer c = repo.findById(id).orElseThrow();
    c.setEmail(email);
}</pre>
          <p>Other methods that call <code>repo.save(c)</code> work fine. Explain precisely why, give two fixes, and say which you prefer.</p>`,
        constraints: `Spring Boot 3.x, Spring Data JPA, no @Transactional on the class.`,
        example: `<p>Without a transaction, <code>findById</code> opens a tiny persistence context that <b>closes as soon as the repository call returns</b>. The returned <code>Customer</code> is ${H.c('r', 'detached')}. <code>setEmail</code> changes a plain object; nobody compares it with a snapshot, so no UPDATE is issued.</p>`,
        brute: { why: `<p>Calling <code>repo.save(c)</code> after the setter "works" because save merges the detached object back (extra SELECT + UPDATE). But it hides the real model: the next developer forgets save in another method and the bug returns. It also does two statements instead of one.</p>` },
        mcq: { q: 'In which situation does changing a field of an entity update the row without any save() call?', options: ['The entity is managed inside an active transaction', 'The entity was loaded in a previous HTTP request', 'The class has @Entity but no @Transactional anywhere', 'The repository extends JpaRepository'], answer: 0, explain: 'Dirty checking only works for managed entities, which exist only while the persistence context is open, i.e. during the transaction.' },
        hints: [
          `<p>Hint 1: ask "is the entity managed when <code>setEmail</code> runs?" Managed means a persistence context is open for the current transaction.</p>`,
          `<p>Hint 2: each repository method is transactional on its own, but a sequence of calls in your service is not, unless the service method has <code>@Transactional</code>.</p>`,
          `<p>Hint 3: Fix A: add <code>@Transactional</code> to the service method so the entity stays managed and dirty checking writes the UPDATE at commit. Fix B: call <code>repo.save(c)</code> explicitly (merge). Fix C: a single <code>@Modifying @Query("update ...")</code> for pure updates.</p>`
        ],
        solution: {
          approach: `<p><b>Why:</b> no transaction spans the method, so <code>findById</code> runs in its own short transaction and the entity is detached when the call returns. The setter edits a detached Java object that no persistence context is tracking; no flush ever compares it with a snapshot. No exception, because nothing is wrong from JPA's point of view.</p>
            <p><b>Fix A (preferred): <code>@Transactional</code> on the service method.</b> The entity stays managed for the whole method, the setter makes it dirty, and the UPDATE goes out at commit. One load, one update, and the transaction boundary is explicit and also protects multi-step business rules.</p>
            <p><b>Fix B: <code>repo.save(c)</code></b> after the change: works, but it is a merge of a detached object (extra SELECT in some cases) and relies on every developer remembering it.</p>
            <p><b>Fix C: a bulk <code>@Modifying</code> query</b> when you do not need the entity at all (cheapest, but bypasses entity lifecycle callbacks and the cache).</p>
            <p>Verify by logging SQL: with Fix A you will see one SELECT and one UPDATE.</p>`,
          code: { lang: 'java', check: false, code: `@Transactional
public void rename(long id, String email) {
    Customer c = repo.findById(id).orElseThrow();   // managed
    c.setEmail(email);                              // dirty -> UPDATE at commit, no save() needed
}` },
          complexity: `<p>Fix A: 1 SELECT + 1 UPDATE per call, O(1) round-trips. Dirty checking cost is proportional to the number of managed entities in the context.</p>`,
          followUps: ['What changes if two users rename the same customer at the same time? (optimistic locking with @Version)', 'Why can a read-only transaction be faster for queries?']
        }
      }
    ]
  });

  // =====================================================================
  // TOPIC 7 — @Transactional
  // =====================================================================
  var EXC = {
    runtimeexception: ['RuntimeException', true], illegalstateexception: ['IllegalStateException', true], illegalargumentexception: ['IllegalArgumentException', true],
    nullpointerexception: ['NullPointerException', true], error: ['Error', true],
    ioexception: ['IOException', false], sqlexception: ['SQLException', false], exception: ['Exception', false], timeoutexception: ['TimeoutException', false]
  };

  topics.push({
    title: '@Transactional: Propagation, Rollback Rules & Pitfalls',
    analogy: `<p>A transaction is a <b>sealed envelope of changes</b>: either everything inside is delivered (commit) or the whole envelope is shredded (rollback). Think of a group trip with one shared booking. <b>REQUIRED</b> means "join the trip already booked; if there is none, book one". If anyone cancels, the whole trip is cancelled.</p>
      <p><b>REQUIRES_NEW</b> means "take your own separate taxi": the main trip waits (is suspended), the taxi ride has its own receipt, and even if the main trip is cancelled later, the taxi receipt stays. That is exactly why an <b>audit log</b> uses it: "we tried to charge this card" must survive even when the order fails.</p>`,
    explain: `<p><code>@Transactional</code> is not magic; it is the proxy from the AOP topic. A <code>TransactionInterceptor</code> wraps your method: <b>begin</b> (borrow a DB connection, turn off auto-commit, bind it to the current thread) &rarr; <b>run your method</b> &rarr; <b>commit</b> if it returns, <b>rollback</b> if it throws the right kind of exception &rarr; release the connection. All repository calls on that thread reuse the same connection, so they succeed or fail together.</p>
      <h4>Defaults to memorise</h4>
      <ul>
        <li>Propagation <b>REQUIRED</b>, isolation <b>DEFAULT</b> (the database's default, usually READ COMMITTED).</li>
        <li><b>Rolls back only on unchecked exceptions</b> (<code>RuntimeException</code> and <code>Error</code>). A checked exception such as <code>IOException</code> or <code>SQLException</code> <span class="c-r">commits</span> unless you write <code>rollbackFor = Exception.class</code>.</li>
        <li><code>readOnly = true</code> is a hint (skips dirty checking, lets drivers/DB route to a replica). It does not forbid writes by itself on every database.</li>
      </ul>
      <h4>Propagation: what happens when a transactional method calls another</h4>
      ${H.table(['Mode', 'Already in a tx?', 'Result'], [
        ['<b>REQUIRED</b> (default)', 'yes / no', 'join it / start a new one'],
        ['<b>REQUIRES_NEW</b>', 'yes / no', '<b>suspend</b> the outer tx and start a brand-new, independent one (needs a 2nd connection)'],
        ['<b>NESTED</b>', 'yes', 'savepoint inside the same tx (partial rollback); JDBC only'],
        ['<b>SUPPORTS</b>', 'yes / no', 'join it / run without a transaction'],
        ['<b>NOT_SUPPORTED</b>', 'yes', 'suspend it and run without a transaction'],
        ['<b>MANDATORY</b>', 'no', 'throw: caller must already have a tx'],
        ['<b>NEVER</b>', 'yes', 'throw: must not run inside a tx']
      ])}
      <h4>The famous pitfalls (each means "no transaction, no error")</h4>
      <ol>
        <li><b>Self-invocation</b>: <code>this.save()</code> skips the proxy.</li>
        <li><b>private</b> methods (never), final classes/methods; objects made with <code>new</code>.</li>
        <li><b>Checked exception</b> thrown: commits by default.</li>
        <li><b>try/catch that swallows the exception</b> inside the method: Spring sees a normal return and commits half-done work.</li>
        <li><b>Another thread</b> (<code>@Async</code>, parallel streams, <code>CompletableFuture</code>): the transaction is bound to the thread, the new thread has none.</li>
        <li><b>Inner REQUIRED method throws, outer catches it</b>: the shared tx is marked rollback-only, the outer commit then fails with <code>UnexpectedRollbackException</code>.</li>
        <li><b>Long transactions</b>: a remote HTTP call inside a transaction holds a DB connection (and locks) while waiting. The pool (10 connections by default in Hikari) runs dry.</li>
      </ol>
      <p>Step through the stack of transaction contexts below, then through the rollback-rule decision.</p>`,
    clues: [
      '"Order saved but the audit/log row is gone after an error" → audit ran in the same transaction; use REQUIRES_NEW in a <i>separate bean</i>',
      '"@Transactional does nothing" → self-invocation, private method, not a Spring bean, or different thread',
      '"Exception thrown but data was still saved" → checked exception (default no rollback) or exception caught inside',
      '<code>UnexpectedRollbackException: Transaction silently rolled back because it has been marked as rollback-only</code> → inner participating tx failed, outer swallowed it',
      '"All connections busy / pool exhausted / app hangs under load" → long transactions, or REQUIRES_NEW needing a 2nd connection while the 1st is held',
      '"Send email/Kafka message only after the DB commit" → <code>@TransactionalEventListener(phase = AFTER_COMMIT)</code> or outbox'
    ],
    code: [
      {
        lang: 'java', check: false, title: 'Order + audit with REQUIRES_NEW, rollback rules, after-commit event (Spring)', code: `@Service
public class OrderService {
    private final OrderRepository orders;
    private final AuditService audit;          // a SEPARATE bean, so the call goes through its proxy
    private final ApplicationEventPublisher events;

    public OrderService(OrderRepository orders, AuditService audit, ApplicationEventPublisher events) {
        this.orders = orders; this.audit = audit; this.events = events;
    }

    @Transactional(rollbackFor = Exception.class)   // also roll back on checked exceptions
    public Order placeOrder(NewOrder cmd) throws PaymentException {
        audit.record("ORDER_ATTEMPT", cmd.customerId());   // commits independently, survives rollback
        Order saved = orders.save(new Order(cmd));
        paymentGateway.charge(cmd);                         // may throw PaymentException (checked)
        events.publishEvent(new OrderPlaced(saved.getId()));
        return saved;
    }
}

@Service
public class AuditService {
    private final AuditRepository repo;
    public AuditService(AuditRepository repo) { this.repo = repo; }

    @Transactional(propagation = Propagation.REQUIRES_NEW)   // suspend outer tx, use a NEW connection
    public void record(String action, long customerId) {
        repo.save(new AuditEntry(action, customerId, Instant.now()));
    }                                                        // commit happens right here
}

@Component
class OrderEmailListener {
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)   // runs only if the order tx committed
    void onPlaced(OrderPlaced e) { mailer.sendConfirmation(e.orderId()); }
}`
      },
      {
        lang: 'java', title: 'A simulated transaction manager: REQUIRED vs REQUIRES_NEW (plain Java)', code: `import java.util.*;

enum Propagation { REQUIRED, REQUIRES_NEW, SUPPORTS, MANDATORY, NEVER, NOT_SUPPORTED }

class FakeConnection {
    private static int counter = 0;
    final int id = ++counter;
    final List<String> pending = new ArrayList<>();      // uncommitted writes
}

class Tx {
    final FakeConnection conn = new FakeConnection();
    boolean rollbackOnly;
}

class Frame {
    final Tx tx;            // null = running without a transaction
    final boolean owner;    // true = this frame started the tx and must commit it
    final String name;
    Frame(Tx tx, boolean owner, String name) { this.tx = tx; this.owner = owner; this.name = name; }
}

class TxManager {
    private final Deque<Frame> stack = new ArrayDeque<>();   // top = current; below = suspended or outer
    final List<String> database = new ArrayList<>();         // committed rows
    final List<String> log = new ArrayList<>();

    void begin(String name, Propagation p) {
        Frame cur = stack.peek();
        boolean hasTx = cur != null && cur.tx != null;
        switch (p) {
            case REQUIRED:
                if (hasTx) {
                    stack.push(new Frame(cur.tx, false, name));          // JOIN: same connection, not the owner
                    log.add(name + " joins tx on conn#" + cur.tx.conn.id);
                } else {
                    startNew(name);
                }
                break;
            case REQUIRES_NEW:
                startNew(name);                                           // outer frame stays below = suspended
                break;
            case SUPPORTS:
                stack.push(new Frame(hasTx ? cur.tx : null, false, name));
                break;
            case MANDATORY:
                if (!hasTx) throw new IllegalStateException("No existing transaction for " + name);
                stack.push(new Frame(cur.tx, false, name));
                break;
            case NEVER:
                if (hasTx) throw new IllegalStateException("Existing transaction found for " + name);
                stack.push(new Frame(null, false, name));
                break;
            case NOT_SUPPORTED:
                stack.push(new Frame(null, false, name));                 // runs without a tx, outer is suspended
                break;
        }
    }

    private void startNew(String name) {
        Tx tx = new Tx();
        stack.push(new Frame(tx, true, name));
        log.add(name + " starts NEW tx on conn#" + tx.conn.id);
    }

    void execute(String sql) {
        Frame f = stack.peek();
        if (f == null || f.tx == null) {
            database.add(sql);                                            // no tx = auto-commit
            log.add("auto-commit: " + sql);
        } else {
            f.tx.conn.pending.add(sql);                                   // wait for commit
        }
    }

    void commit() {
        Frame f = stack.pop();
        if (f.tx == null || !f.owner) return;                             // joined frames never commit
        if (f.tx.rollbackOnly) {
            log.add(f.name + ": conn#" + f.tx.conn.id + " rolled back (marked rollback-only)");
            throw new IllegalStateException("UnexpectedRollback: tx was marked rollback-only");
        }
        database.addAll(f.tx.conn.pending);
        log.add(f.name + ": COMMIT conn#" + f.tx.conn.id + " " + f.tx.conn.pending);
    }

    void rollback() {
        Frame f = stack.pop();
        if (f.tx == null) return;
        if (f.owner) log.add(f.name + ": ROLLBACK conn#" + f.tx.conn.id + " discards " + f.tx.conn.pending);
        else f.tx.rollbackOnly = true;                                    // joined: only mark, owner decides
    }
}

public class TxDemo {
    static void audit(TxManager tm, Propagation mode) {
        tm.begin("audit.record", mode);
        tm.execute("INSERT audit 'order attempted'");
        tm.commit();
    }

    static void placeOrder(TxManager tm, Propagation auditMode, boolean fail) {
        tm.begin("placeOrder", Propagation.REQUIRED);
        try {
            tm.execute("INSERT order 42");
            audit(tm, auditMode);
            if (fail) throw new IllegalStateException("payment declined");   // unchecked: should roll back
            tm.commit();
        } catch (RuntimeException e) {
            tm.rollback();
        }
    }

    public static void main(String[] args) {
        for (Propagation mode : new Propagation[] { Propagation.REQUIRED, Propagation.REQUIRES_NEW }) {
            TxManager tm = new TxManager();
            placeOrder(tm, mode, true);
            System.out.println("audit via " + mode + ", order fails -> committed rows: " + tm.database);
        }
        // REQUIRED:     [] (audit lost with the order)
        // REQUIRES_NEW: [INSERT audit 'order attempted']
    }
}`
      }
    ],
    codeTitle: ['Order service with REQUIRES_NEW audit and after-commit event', 'Model: transaction contexts, join vs new connection'],
    viz: [
      {
        title: 'Transaction propagation as a stack of contexts',
        input: 'REQUIRES_NEW fail',
        inputLabel: 'Propagation of the audit call (REQUIRED or REQUIRES_NEW) and whether the order then fails (ok or fail)',
        gen: function (input) {
          var w = words(input).map(function (x) { return x.toUpperCase(); });
          var mode = w[0] || 'REQUIRES_NEW', res = (w[1] || 'FAIL').toLowerCase();
          if ((mode !== 'REQUIRED' && mode !== 'REQUIRES_NEW') || (res !== 'ok' && res !== 'fail')) throw new Error('Type e.g. REQUIRES_NEW fail, REQUIRED fail or REQUIRED ok');
          var isNew = mode === 'REQUIRES_NEW', fail = res === 'fail';
          var frames = [], st = [], p1 = [], p2 = [], db = [];
          function snap(narr, hl) {
            var ents = [['conn#1 (T1)', p1.length ? p1.join(' + ') : '-']];
            if (isNew && (p2.length || st.length > 1)) ents.push(['conn#2 (T2)', p2.length ? p2.join(' + ') : '-']);
            var hs = {}; db.forEach(function (d) { hs[d] = 'ok'; });
            frames.push({ narr: narr, parts: [
              { type: 'stack', label: 'Transaction contexts (top = what runs now)', items: st.slice(), hl: hl || {} },
              { type: 'map', label: 'Uncommitted writes per connection', entries: ents },
              { type: 'set', label: 'Database (committed rows)', items: db.slice(), hl: hs }
            ] });
          }
          snap('A request calls <code>OrderService.placeOrder()</code>, which is <code>@Transactional</code> (REQUIRED). Nothing is running yet, so there are <b>no transaction contexts</b>.');
          st.push('T1 conn#1 placeOrder (owner)');
          snap('The proxy sees no active transaction, so it <b>begins T1</b>: borrows connection #1, turns off auto-commit, binds it to this thread.', { 0: 'cur' });
          p1.push('order#42');
          snap('<code>orders.save()</code> runs on connection #1. The row is written but <b>not committed</b>: only this transaction can see it.', { 0: 'cur' });
          if (isNew) {
            st.push('T2 conn#2 audit.record (owner)');
            snap('<code>auditService.record()</code> is <code>REQUIRES_NEW</code>. T1 is <b>suspended</b> (greyed) and a brand-new transaction T2 starts on a <b>second connection</b>. Two connections are now in use by one request.', { 0: 'done', 1: 'cur' });
            p2.push('audit#1');
            snap('The audit row is written on connection #2, inside T2.', { 0: 'done', 1: 'cur' });
            db.push('audit#1');
            st.pop();
            snap('<code>record()</code> returns, so T2 <b>commits immediately</b>. The audit row is durable now, independent of what happens to T1. T1 resumes.', { 0: 'cur' });
          } else {
            st.push('T1 (joined) audit.record');
            snap('<code>auditService.record()</code> is <code>REQUIRED</code>: a transaction already exists, so it <b>joins T1</b>. Same connection, same fate. It is not the owner, so it cannot commit.', { 0: 'done', 1: 'cur' });
            p1.push('audit#1');
            snap('The audit row is written on connection #1 together with the order. Still uncommitted.', { 0: 'done', 1: 'cur' });
            st.pop();
            snap('<code>record()</code> returns. A joined participant does nothing at the end; only the <b>owner</b> (placeOrder) decides commit or rollback.', { 0: 'cur' });
          }
          if (fail) {
            snap('Payment is declined: <code>placeOrder</code> throws a <b>RuntimeException</b>. The proxy will roll back T1.', { 0: 'bad' });
            p1 = [];
            st.pop();
            snap('<b>ROLLBACK T1</b>: connection #1 discards its pending writes. ' + (isNew ? '<span class="c-g">The audit row survives</span> because T2 already committed: we can see who tried to order.' : '<span class="c-r">The audit row is gone too</span>: it lived in the same transaction. We lost the evidence of the failed attempt.'));
          } else {
            db.push('order#42'); if (!isNew) db.push('audit#1');
            p1 = [];
            st.pop();
            snap('<code>placeOrder</code> returns normally, so the proxy <b>commits T1</b>: ' + (isNew ? 'order row becomes durable' : 'order and audit rows become durable together') + '.');
          }
          snap('Final database state. Compare with the other combination: <code>REQUIRES_NEW fail</code> keeps the audit row, <code>REQUIRED fail</code> loses it. Cost of REQUIRES_NEW: a second connection held at the same time, so a small pool can deadlock when every thread holds one connection and waits for another.');
          return frames;
        }
      },
      {
        title: 'Rollback rules: which exceptions roll back?',
        input: 'IOException',
        inputLabel: 'Exception thrown (IOException, SQLException, Exception, RuntimeException, IllegalStateException, Error...). Add rollbackFor to include it in the rule',
        gen: function (input) {
          var w = words(input), name = null, rf = false;
          w.forEach(function (t) {
            var lt = t.toLowerCase();
            if (lt === 'rollbackfor') rf = true;
            else if (Object.prototype.hasOwnProperty.call(EXC, lt)) name = EXC[lt];
            else throw new Error('Try IOException, SQLException, RuntimeException, IllegalStateException, Error, optionally with rollbackFor');
          });
          if (!name) name = EXC.ioexception;
          var X = name[0], unchecked = name[1], rolls = unchecked || rf;
          var src = (rf ? '@Transactional(rollbackFor = Exception.class)' : '@Transactional') + '\npublic void pay() throws Exception {\n    repo.save(payment);\n    throw new ' + X + '("boom");\n}';
          var frames = [];
          function f(narr, line, vals, hl) {
            frames.push({ narr: narr, parts: [
              { type: 'code', label: 'Your method', lang: 'java', code: src, hl: line ? (function () { var o = {}; o[line] = hl || 'cur'; return o; })() : {} },
              { type: 'vars', label: 'Transaction interceptor state', vals: vals, hl: {} }
            ] });
          }
          f('The proxy starts a transaction and calls <code>pay()</code>.', 2, { transaction: 'open', 'pending writes': 'none' });
          f('<code>repo.save(payment)</code> writes the row on the open connection. It is pending, not committed.', 3, { transaction: 'open', 'pending writes': 'payment row' });
          f('The method throws <b>' + X + '</b>. The exception travels back up to the proxy.', 4, { transaction: 'open', 'pending writes': 'payment row', thrown: X }, 'bad');
          f('Interceptor asks: is it unchecked (<code>RuntimeException</code> or <code>Error</code>)? <b>' + X + '</b> is <b>' + (unchecked ? 'unchecked: yes' : 'checked: no') + '</b>.' + (unchecked ? '' : ' By default checked exceptions do NOT trigger rollback.'), 0, { transaction: 'open', thrown: X, 'unchecked?': unchecked ? 'yes' : 'no' });
          f(rf ? 'The annotation says <code>rollbackFor = Exception.class</code>, which covers <b>' + X + '</b>, so the rule now says rollback.' : 'No <code>rollbackFor</code> was declared, so nothing overrides the default rule.', 0, { transaction: 'open', thrown: X, 'rollbackFor set?': rf ? 'yes' : 'no', decision: rolls ? 'ROLLBACK' : 'COMMIT' });
          f(rolls ? '<span class="c-g">ROLLBACK</span>: the payment row is discarded. The exception is rethrown to the caller.' : '<span class="c-r">COMMIT</span> although an exception was thrown! The payment row is saved and the caller still sees the exception. This is the classic checked-exception surprise: write <code>rollbackFor = Exception.class</code> if you want rollback.', 0, { transaction: 'closed', 'payment row': rolls ? 'discarded' : 'SAVED', 'caller sees': X }, 'bad');
          return frames;
        }
      }
    ],
    examples: [
      {
        title: 'Example 1 - Why the self-called @Transactional(REQUIRES_NEW) does nothing',
        html: `<p>In <code>ReportService.generate()</code> you call <code>this.saveAudit()</code> where <code>saveAudit</code> is <code>REQUIRES_NEW</code>. The call never crosses the proxy, so no new transaction starts; the audit row joins whatever transaction <code>generate()</code> has (or none). Fix: move <code>saveAudit</code> to <code>AuditService</code> and inject it, exactly as in the code above.</p>`
      },
      {
        title: 'Example 2 - Swallowed exception commits half the work',
        html: `<p>A "safe" try/catch inside a transactional method hides the failure from the proxy:</p>
          <pre>@Transactional
public void importAll(List&lt;Row&gt; rows) {
    for (Row r : rows) {
        try { repo.save(convert(r)); }
        catch (Exception e) { log.warn("skipped", e); }   // proxy never sees an exception
    }
}</pre>
          <p>If a save fails because the database rejected the statement, the Hibernate session may be left in a bad state and later flushes fail, or half the rows commit. Better: validate before saving, process each row in its own small transaction (a separate bean with REQUIRES_NEW), or let the exception propagate.</p>`
      },
      {
        title: 'Example 3 - Inner REQUIRED fails, outer catches: UnexpectedRollbackException',
        html: `<p>Outer <code>process()</code> calls <code>inner.risky()</code> (REQUIRED, joins the same tx). <code>risky()</code> throws a RuntimeException; the proxy of <code>inner</code> marks the shared transaction <b>rollback-only</b>. The outer method catches the exception and continues happily, but at commit time Spring refuses: <code>UnexpectedRollbackException: Transaction silently rolled back because it has been marked as rollback-only</code>. If the inner work really is optional, give it <code>REQUIRES_NEW</code> (or <code>NESTED</code> with savepoints) so its failure is isolated.</p>`
      },
      {
        title: 'Example 4 - Never call remote services inside a transaction',
        html: `<p>With a Hikari pool of 10 and a method like: <i>open tx &rarr; save order &rarr; call payment API (800 ms) &rarr; commit</i>, each request holds a connection for about a second. Capacity: 10 connections / 0.8 s = about <b>12 requests per second</b>, even though the database is idle. Pattern: do the remote call <b>outside</b> the transaction, or save with a "PENDING" state, call the API, then update in a second short transaction. Use the transactional outbox for reliable messages (Microservices module).</p>`
      }
    ],
    deepDive: `<p><b>Machinery.</b> <code>@Transactional</code> is read by <code>AnnotationTransactionAttributeSource</code>; <code>TransactionInterceptor</code> delegates to a <code>PlatformTransactionManager</code> (<code>JpaTransactionManager</code> for JPA, <code>DataSourceTransactionManager</code> for plain JDBC). It stores the connection and EntityManager in <code>TransactionSynchronizationManager</code> <b>thread-locals</b>; <code>JdbcTemplate</code>, JPA and repositories fetch their connection from there. That is why the transaction does not follow you onto another thread, and why virtual threads work fine (a ThreadLocal per virtual thread), but a thread pool with <code>@Async</code> does not.</p>
      <p><b>Rollback-only and propagation internals.</b> A joined (participating) transaction shares one <code>TransactionStatus</code>. When an inner proxy sees an exception that triggers rollback it cannot roll back (it is not the owner) so it sets <b>rollback-only</b>; the owner then fails with <code>UnexpectedRollbackException</code> on commit unless it also rolls back. <code>REQUIRES_NEW</code> suspends the outer transaction's resources (unbinds the connection from the thread), binds a new one and restores the old afterwards. <code>NESTED</code> uses JDBC savepoints and is not supported by JPA's <code>JpaTransactionManager</code> in a useful way for Hibernate sessions.</p>
      <p><b>Isolation and locks.</b> Isolation levels (READ_COMMITTED, REPEATABLE_READ, SERIALIZABLE) are database features. Defaults differ: PostgreSQL READ COMMITTED, MySQL InnoDB REPEATABLE READ. A higher level may cause serialization failures you must retry. Details, optimistic vs pessimistic locking and deadlocks are covered in the Data Access Patterns and SQL tracks.</p>
      <p><b>Visibility rules (Spring 6).</b> Class-based proxies (CGLIB) can intercept <code>public</code>, <code>protected</code> and package-visible methods; <code>private</code> never. JDK proxies only see interface methods. Put <code>@Transactional</code> on the <b>concrete class or its methods</b>, on the service layer (not on controllers or repositories you also call from batch jobs without thinking), and keep transactions as short as possible. The jakarta <code>@Transactional</code> also works but supports fewer attributes (no readOnly/timeout).</p>
      <p><b>Production reality.</b> Watch for: connection pool exhaustion (metrics <code>hikaricp.connections.pending</code>), long idle-in-transaction sessions in the database, deadlocks when two transactions lock rows in different order, retries of the whole transaction (idempotent code!), and messages published before the commit (use AFTER_COMMIT listeners or outbox). Set a transaction <code>timeout</code> and database statement timeout so one bad query cannot hold locks forever.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants sprinkle <code>@Transactional</code> on everything, which hides the real question: where should the atomic boundary be? They also readily suggest <code>REQUIRES_NEW</code> as a "fix" for rollback-only errors without noticing it opens a second connection and breaks atomicity.</p>
      <p><b>Use AI as a partner:</b> give it a service class and ask <code>Draw the transaction boundaries. List every method call that goes through a proxy and every self-call; flag @Transactional methods that are private, final, self-invoked or called from async threads.</code> Ask for a test using Testcontainers that proves rows are rolled back after a checked exception. Ask it to explain a stack trace containing <code>UnexpectedRollbackException</code> by tracing which inner call marked rollback-only.</p>
      <p><b>Where AI goes wrong:</b> it believes checked exceptions roll back, puts <code>@Transactional</code> on private helpers, calls remote APIs inside transactions, forgets that <code>@TransactionalEventListener</code> needs an active transaction, and mixes jakarta and Spring annotations.</p>
      <p><b>What you must still own:</b> the consistency design: which operations must be atomic, which may be eventually consistent, and which must survive failure (audit). Those decisions come from the business, not the framework.</p>`,
    problems: [
      {
        title: 'The Audit Row That Vanished',
        level: 'Medium',
        tags: ['transactional', 'propagation', 'requires_new'],
        companies: ['Goldman Sachs', 'PayPal', 'Amazon'],
        statement: `<p>A bank service transfers money inside <code>@Transactional transfer()</code>. At the start it calls <code>auditService.log("TRANSFER_ATTEMPT")</code> (a normal <code>@Transactional</code> method). When the transfer fails with insufficient funds, the audit table has <b>no row</b>. Compliance wants every attempt recorded. Fix it, and list two traps in your fix.</p>`,
        constraints: `Spring Boot 3.x, PostgreSQL, HikariCP pool of 10, everything in one codebase.`,
        example: `<p>Today: ${H.c('r', 'transfer() fails &rarr; rollback T1 &rarr; audit row (same T1) also rolled back')}. Wanted: the audit insert commits <b>independently</b> in its own transaction.</p>`,
        brute: { why: `<p>Catching the exception and re-inserting the audit row afterwards in the same method does not work: the transaction is already marked rollback-only. Writing the audit row with plain JDBC on a separate connection works but bypasses Spring, repeats connection handling and is hard to test.</p>` },
        mcq: { q: 'Which change makes the audit row survive a failed transfer?', options: ['AuditService.log is REQUIRES_NEW, called through the AuditService bean', 'AuditService.log is REQUIRED with readOnly=false', 'Catch the exception inside transfer() and ignore it', 'Add rollbackFor = Exception.class to transfer()'], answer: 0, explain: 'REQUIRES_NEW suspends the outer transaction and commits the audit insert in a new one. It must be called through the proxy of another bean to take effect.' },
        hints: [
          `<p>Hint 1: the audit insert and the transfer are in the same transaction (REQUIRED joins). They commit or roll back together. You need them to have <b>different fates</b>.</p>`,
          `<p>Hint 2: Spring lets a method run in an independent transaction with <code>Propagation.REQUIRES_NEW</code>. The outer transaction is suspended while it runs.</p>`,
          `<p>Hint 3: put the method in a <b>separate bean</b> (self-invocation would bypass the proxy), keep it tiny, and think about the pool: while T2 runs, T1 still holds a connection, so each request uses two.</p>`
        ],
        solution: {
          approach: `<p><b>Cause:</b> default propagation REQUIRED makes <code>log()</code> join the transfer's transaction. When <code>transfer()</code> throws a RuntimeException the owner rolls back everything, including the audit row.</p>
            <p><b>Fix:</b> annotate <code>AuditService.log</code> with <code>@Transactional(propagation = Propagation.REQUIRES_NEW)</code>. The interceptor suspends T1, opens T2 on a second connection, inserts the row and commits immediately, then resumes T1. The later rollback of T1 does not touch the audit row.</p>
            <p><b>Trap 1 - self-invocation:</b> if <code>log</code> sits in the same class as <code>transfer</code> and is called with <code>this.log()</code>, the annotation is ignored; keep it in its own bean.</p>
            <p><b>Trap 2 - pool starvation:</b> each in-flight transfer now needs two connections. With a pool of 10 and 10 concurrent transfers, all 10 hold T1 and wait for a second connection that never frees: deadlock until the Hikari timeout. Keep the pool larger than peak concurrency x 2, or write the audit before opening T1 / after T1 ends, or use an async event/outbox.</p>
            <p>Also consider that the audit insert can itself fail: decide whether failing to audit should block the transfer.</p>`,
          code: { lang: 'java', check: false, code: `@Service
public class AuditService {
    private final AuditRepository repo;
    public AuditService(AuditRepository repo) { this.repo = repo; }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(String action, long accountId) {
        repo.save(new AuditEntry(action, accountId, Instant.now()));
    }
}` },
          complexity: `<p>One extra INSERT and one extra connection per transfer. Capacity planning: connections needed = concurrent requests x 2 in the worst case.</p>`,
          followUps: ['How would an event with AFTER_ROLLBACK phase solve the same problem?', 'What happens if the audit insert throws inside REQUIRES_NEW?']
        }
      }
    ]
  });

  // =====================================================================
  // TOPIC 8 — Profiles & configuration
  // =====================================================================
  var PROFILE_URL = { dev: 'jdbc:h2:mem:shop', prod: 'jdbc:postgresql://db.prod.internal:5432/shop', test: 'jdbc:tc:postgresql:16:///shop' };

  topics.push({
    title: 'Profiles & Configuration: One Jar, Many Environments',
    analogy: `<p>Think of a <b>wardrobe</b>. The same person (your app) wears a T-shirt at home (dev), a suit at work (prod) and a lab coat in the test lab (test). The person does not change; the <b>outfit</b> does. A <b>profile</b> is the outfit label.</p>
      <p>Configuration works like packing a suitcase with <b>layers</b>: a default sweater at the bottom, then an outfit on top, and the airline's last-minute instruction on the very top (an environment variable or command-line flag). If two layers say different things, the <b>top layer wins</b>. Secrets (passwords) are never sewn into the clothes: they are handed to you at the door.</p>`,
    explain: `<p>Rule one of production apps: <b>build once, configure per environment</b>. The same jar runs on a laptop, in CI and in production; only the configuration around it changes (the "twelve-factor" idea).</p>
      <h4>Where configuration lives (highest priority first, simplified)</h4>
      <ol>
        <li><b>Command-line arguments</b>: <code>--server.port=9000</code></li>
        <li><b>Java system properties</b> (<code>-Dserver.port=9000</code>)</li>
        <li><b>OS environment variables</b>: <code>SERVER_PORT=9000</code> (relaxed binding: <code>SPRING_DATASOURCE_URL</code> = <code>spring.datasource.url</code>)</li>
        <li><b>Profile-specific files</b>: <code>application-prod.yml</code> (outside the jar beats inside it)</li>
        <li><b>application.yml</b> / <code>application.properties</code></li>
        <li><b>Defaults in code</b> (<code>@Value("&#36;{x:default}")</code>, field initialisers)</li>
      </ol>
      <h4>Profiles</h4>
      <p>A profile is a named group of configuration and beans. Activate with <code>spring.profiles.active=prod</code> (file), <code>SPRING_PROFILES_ACTIVE=prod</code> (env var, best for containers) or <code>--spring.profiles.active=prod</code>. If none is set, the profile is <code>default</code>. Use it in three places:</p>
      <ul>
        <li><b>Files</b>: <code>application-dev.yml</code>, or one YAML with <code>---</code> separated documents and <code>spring.config.activate.on-profile: dev</code>.</li>
        <li><b>Beans</b>: <code>@Profile("dev")</code> on a class or <code>@Bean</code>; <code>@Profile("!prod")</code> means "everything except prod".</li>
        <li><b>Tests</b>: <code>@ActiveProfiles("test")</code>.</li>
      </ul>
      <h4>Reading values: @Value vs @ConfigurationProperties</h4>
      <p><code>@Value("&#36;{payments.timeout:5s}")</code> is fine for one value. For groups use <b>@ConfigurationProperties(prefix = "payments")</b> on a class or record: type-safe, validated at startup (<code>@Validated</code> + <code>@NotBlank</code>), supports lists/maps/durations, and gets IDE auto-complete.</p>
      <h4>Secrets</h4>
      <p>Never commit passwords, tokens or keys. Put a <b>placeholder</b> in the file (<code>password: &#36;{DB_PASSWORD}</code>) and supply the real value from the environment, a Kubernetes Secret (as env var or mounted file via <code>spring.config.import=configtree:/run/secrets/</code>) or a secrets manager. If a placeholder has no value and no default, the app <b>fails at startup</b> ("Could not resolve placeholder"), which is exactly what you want.</p>
      <p>Use the visualizer to see how one property (<code>spring.datasource.url</code>) is looked up through the layers.</p>`,
    clues: [
      '"Same build, different database per environment" → profile-specific properties + env vars',
      '"How do you manage secrets in a Spring app?" → placeholders in config, values from environment / secret manager, never in Git',
      '"Which wins: application.yml or an environment variable?" → env var (higher in the property-source order)',
      '"Use an in-memory H2 for dev and tests but PostgreSQL in prod" → <code>@Profile</code> or profile-specific datasource config',
      '<code>Could not resolve placeholder \'DB_PASSWORD\'</code> → missing env var/property and no default',
      '"Group many related settings, validate them at startup" → <code>@ConfigurationProperties</code> with <code>@Validated</code>'
    ],
    code: [
      {
        lang: 'yaml', title: 'application.yml - base config plus per-profile documents (no secrets)', code: `spring:
  application:
    name: shop
  datasource:
    url: jdbc:postgresql://localhost:5432/shop
    username: \${DB_USER:shop}          # default 'shop' if DB_USER is not set
    password: \${DB_PASSWORD}           # NO default: startup fails if missing
payments:
  base-url: https://sandbox.payments.example
  timeout: 3s
---
spring:
  config:
    activate:
      on-profile: dev
  datasource:
    url: jdbc:h2:mem:shop;MODE=PostgreSQL
    username: sa
    password: ""
  h2:
    console:
      enabled: true
---
spring:
  config:
    activate:
      on-profile: prod
  datasource:
    url: jdbc:postgresql://\${DB_HOST}:5432/shop
    hikari:
      maximum-pool-size: 20
payments:
  base-url: https://api.payments.example
server:
  shutdown: graceful`
      },
      {
        lang: 'java', check: false, title: 'Typed properties and profile-specific beans (Spring)', code: `@ConfigurationProperties(prefix = "payments")
@Validated
public record PaymentsProperties(
        @NotBlank String baseUrl,                     // payments.base-url  (relaxed binding)
        @DefaultValue("3s") Duration timeout) { }

@SpringBootApplication
@ConfigurationPropertiesScan                          // finds the record above
public class ShopApplication { }

@Configuration
class MailConfig {
    @Bean @Profile("prod")
    MailSender realMailSender(@Value("\${SMTP_HOST}") String host) {
        return new SmtpMailSender(host);              // real emails only in prod
    }

    @Bean @Profile("!prod")                           // dev, test, default
    MailSender fakeMailSender() {
        return new LoggingMailSender();               // just logs the email
    }
}

// Running it (secrets come from the environment, not from the jar):
//   SPRING_PROFILES_ACTIVE=prod DB_HOST=db.internal DB_PASSWORD=... java -jar shop.jar`
      },
      {
        lang: 'java', title: 'Layered property lookup with placeholders (plain Java model)', code: `import java.util.*;

class Layered {
    private final List<Map<String, String>> layers = new ArrayList<>();   // highest priority first

    Layered add(Map<String, String> props) { layers.add(props); return this; }

    /** First layer that has the key wins. */
    String raw(String key) {
        for (Map<String, String> layer : layers) {
            String v = layer.get(key);
            if (v != null) return v;
        }
        return null;
    }

    String get(String key) {
        String v = raw(key);
        return v == null ? null : resolve(v, 0);
    }

    /** Replaces a placeholder written as dollar-brace name colon default close-brace. */
    private String resolve(String value, int depth) {
        if (depth > 5) throw new IllegalStateException("placeholder loop in " + value);
        String open = "$" + "{";
        int start = value.indexOf(open);
        if (start < 0) return value;
        int end = value.indexOf('}', start);
        if (end < 0) throw new IllegalStateException("unclosed placeholder in " + value);
        String inner = value.substring(start + 2, end);
        int colon = inner.indexOf(':');
        String name = colon < 0 ? inner : inner.substring(0, colon);
        String def = colon < 0 ? null : inner.substring(colon + 1);
        String found = raw(name);
        if (found == null) {
            if (def == null) throw new IllegalStateException("Could not resolve placeholder '" + name + "'");
            found = def;
        }
        return resolve(value.substring(0, start) + found + value.substring(end + 1), depth + 1);
    }
}

public class ConfigDemo {
    public static void main(String[] args) {
        Map<String, String> cli = Map.of();                                     // --key=value arguments
        Map<String, String> env = Map.of("DB_PASSWORD", "from-secret-manager"); // injected by the platform
        Map<String, String> prodFile = Map.of("spring.datasource.url", "jdbc:postgresql://db.prod:5432/shop");
        Map<String, String> baseFile = Map.of(
            "spring.datasource.url", "jdbc:postgresql://localhost:5432/shop",
            "spring.datasource.username", "$" + "{DB_USER:shop}",
            "spring.datasource.password", "$" + "{DB_PASSWORD}");

        Layered cfg = new Layered().add(cli).add(env).add(prodFile).add(baseFile);
        System.out.println(cfg.get("spring.datasource.url"));        // prod file beats base file
        System.out.println(cfg.get("spring.datasource.username"));   // default 'shop' used
        System.out.println(cfg.get("spring.datasource.password").length() + " chars (never print it!)");
    }
}`
      },
      {
        lang: 'bash', title: 'Choosing the profile and passing secrets at runtime', code: `# plain JVM
SPRING_PROFILES_ACTIVE=prod DB_HOST=db.internal DB_PASSWORD="$(cat /run/secrets/db_password)" java -jar shop.jar

# command-line override (highest priority)
java -jar shop.jar --spring.profiles.active=prod --server.port=9000

# print which property source supplied a value (Actuator, secured endpoint)
curl -s localhost:8080/actuator/env/spring.datasource.url`
      }
    ],
    codeTitle: ['YAML: base plus dev and prod profiles', '@ConfigurationProperties and @Profile beans', 'Model: layered lookup and placeholders', 'Running with a profile and secrets'],
    viz: {
      title: 'Property lookup through the layers (first hit wins)',
      input: 'prod env',
      inputLabel: 'Profile (dev, prod, test, none) and extra layers: env (an OS environment variable is set), cli (a command-line argument is set)',
      gen: function (input) {
        var w = words(input).map(function (x) { return x.toLowerCase(); });
        var profile = 'none', env = false, cli = false;
        w.forEach(function (t) {
          if (t === 'env') env = true; else if (t === 'cli') cli = true;
          else if (t === 'dev' || t === 'prod' || t === 'test' || t === 'none') profile = t;
          else throw new Error('Use dev, prod, test or none, plus optional env and cli');
        });
        var layers = [
          ['1. Command-line argument', cli ? 'jdbc:postgresql://cli-host:5432/shop' : null],
          ['2. OS environment variable SPRING_DATASOURCE_URL', env ? 'jdbc:postgresql://env-host:5432/shop' : null],
          ['3. application-' + (profile === 'none' ? '(no profile)' : profile) + '.yml', profile === 'none' ? null : PROFILE_URL[profile]],
          ['4. application.yml (base)', 'jdbc:postgresql://localhost:5432/shop'],
          ['5. Default in code', null]
        ];
        var frames = [], rows = [], winner = -1, hl, i;
        frames.push({ narr: 'Question: what is the value of <code>spring.datasource.url</code>? Spring Boot asks each layer from the <b>top (highest priority)</b> down and uses the <b>first one that has the key</b>. Active profile: <b>' + (profile === 'none' ? 'default (none)' : profile) + '</b>.', parts: [
          { type: 'table', label: 'Layers, highest priority first', columns: ['Layer', 'Has the key?', 'Value'], rows: layers.map(function (l) { return [l[0], '?', '?']; }) }
        ] });
        for (i = 0; i < layers.length; i++) {
          var l = layers[i], has = l[1] !== null;
          hl = {};
          if (winner >= 0) {
            rows.push([l[0], 'not consulted', has ? l[1] : '-']);
            hl[i] = 'done';
            frames.push({ narr: 'Layer ' + (i + 1) + ' is <b>not even asked</b>: a higher layer already answered.' + (has ? ' Its value (shown) is shadowed.' : ''), parts: [{ type: 'table', label: 'Lookup of spring.datasource.url', columns: ['Layer', 'Has the key?', 'Value'], rows: rows.map(function (r) { return r.slice(); }), hl: hl }] });
          } else if (has) {
            winner = i;
            rows.push([l[0], 'YES', l[1]]);
            hl[i] = 'ok';
            frames.push({ narr: '<span class="c-g">Hit!</span> ' + l[0].slice(3) + ' defines the key, so <b>' + l[1] + '</b> wins. Lower layers are ignored.', parts: [{ type: 'table', label: 'Lookup of spring.datasource.url', columns: ['Layer', 'Has the key?', 'Value'], rows: rows.map(function (r) { return r.slice(); }), hl: hl }] });
          } else {
            rows.push([l[0], 'no', '-']);
            hl[i] = 'bad';
            frames.push({ narr: 'Layer ' + (i + 1) + ' (' + l[0].slice(3) + ') does not define the key: <b>miss</b>, go down one layer.', parts: [{ type: 'table', label: 'Lookup of spring.datasource.url', columns: ['Layer', 'Has the key?', 'Value'], rows: rows.map(function (r) { return r.slice(); }), hl: hl }] });
          }
        }
        frames.push({ narr: 'Now the password. In <code>application.yml</code> it is not a value but a <b>placeholder</b>: <code>password: &#36;{DB_PASSWORD}</code>. Boot resolves it from the environment at startup, so the real secret never appears in Git, in the jar or in your YAML. If <code>DB_PASSWORD</code> is missing the app refuses to start.', parts: [
          { type: 'table', label: 'Resolving spring.datasource.password', columns: ['Step', 'Result'], rows: [['Value in application.yml', '${DB_PASSWORD}'], ['Lookup DB_PASSWORD in environment', 'found (from secret manager)'], ['Effective value', '******** (masked in logs and /actuator/env)']], hl: { 2: 'ok' } }
        ] });
        frames.push({ narr: 'Result: one jar, effective URL <b>' + layers[winner][1] + '</b>. Change the profile or add <code>env</code> / <code>cli</code> to see another layer win. The lesson: <b>specific and late beats general and early</b>, and secrets arrive from outside.', parts: [
          { type: 'vars', label: 'Effective configuration', vals: { profile: profile === 'none' ? 'default' : profile, 'spring.datasource.url': layers[winner][1], 'spring.datasource.password': '********' }, hl: { 'spring.datasource.url': 'ok' } }
        ] });
        return frames;
      }
    },
    examples: [
      {
        title: 'Example 1 - Profile-specific datasource (H2 for dev, PostgreSQL for prod)',
        html: `<p>See the YAML above: the base document holds shared defaults, the <code>dev</code> document swaps in an in-memory H2 (no installation needed, resets every run), and the <code>prod</code> document points to the real PostgreSQL host with a bigger pool. The password is a placeholder everywhere. Add H2 as a <code>runtimeOnly</code> dependency; Boot sees the URL and picks the driver. Run locally with <code>SPRING_PROFILES_ACTIVE=dev</code> and in the container with <code>prod</code>. For integration tests prefer the real engine through Testcontainers (profile <code>test</code>) so SQL behaves like production.</p>`
      },
      {
        title: 'Example 2 - Environment variable override in a container',
        html: `<p>The jar contains <code>spring.datasource.url</code> for localhost. In Kubernetes you set environment variables on the container and nothing is rebuilt:</p>
          <pre>env:
  - name: SPRING_PROFILES_ACTIVE
    value: prod
  - name: SPRING_DATASOURCE_URL
    value: jdbc:postgresql://db.prod.internal:5432/shop
  - name: DB_PASSWORD
    valueFrom:
      secretKeyRef: { name: shop-db, key: password }</pre>
          <p>Relaxed binding converts <code>SPRING_DATASOURCE_URL</code> to <code>spring.datasource.url</code> (dots and dashes become underscores, uppercase). Env vars beat the YAML files, so this always wins.</p>`
      },
      {
        title: 'Example 3 - Fail fast with typed, validated properties',
        html: `<p>With <code>@ConfigurationProperties</code> + <code>@Validated</code>, a missing <code>payments.base-url</code> stops the application at startup with a clear message listing the property and the constraint that failed, instead of a <code>NullPointerException</code> at the first payment at 2 a.m. Durations (<code>3s</code>, <code>PT3S</code>), sizes (<code>10MB</code>), lists and maps are converted for you.</p>`
      },
      {
        title: 'Example 4 - Profile pitfalls',
        html: `<ul>
            <li>Putting production secrets in <code>application-prod.yml</code> inside the jar: anyone with the artifact has them. Use placeholders.</li>
            <li>Business logic that branches on <code>if (env.acceptsProfiles("prod"))</code>: your tests no longer exercise the real path. Use beans/config for differences, not <code>if</code>s.</li>
            <li>Too many profiles (<code>dev-eu-blue</code>): prefer a few profiles plus explicit properties. Profile <b>groups</b> (<code>spring.profiles.group.prod=prod-db,prod-mq</code>) help.</li>
            <li>Forgetting <code>@Profile("!prod")</code> on a debug bean (H2 console, fake auth): it leaks into production if prod does not override it.</li>
          </ul>`
      }
    ],
    deepDive: `<p><b>How Boot builds the Environment.</b> <code>SpringApplication</code> assembles an <code>Environment</code> holding an ordered list of <code>PropertySource</code>s. Config files are loaded by <b>Config Data</b> (Boot 2.4+): it reads <code>application.*</code> from the classpath, then from <code>./</code> and <code>./config/</code> next to the jar (these override the packaged ones), then profile-specific variants which override their non-profile counterparts. <code>spring.config.import=optional:file:./local.yml</code> pulls in extra files, <code>configtree:</code> turns a mounted directory (Kubernetes Secret volume, one file per key) into properties.</p>
      <p><b>Relaxed binding.</b> <code>my-app.maxRetries</code>, <code>my_app.max_retries</code> and <code>MYAPP_MAXRETRIES</code> all map to the same <code>@ConfigurationProperties</code> field. Prefer kebab-case in files and UPPER_SNAKE in env vars. <code>@Value</code> is stricter (use the canonical kebab-case form).</p>
      <p><b>Conditions based on configuration.</b> <code>@ConditionalOnProperty</code> (previous topic) lets properties switch whole features without profiles; profiles suit "named bundles" (dev, prod), properties suit single toggles. Beans in a <code>@Profile</code> are evaluated at startup; there is no hot switching.</p>
      <p><b>Secrets and safety.</b> Mask sensitive keys: Since Boot 3, Actuator's <code>/env</code> and <code>/configprops</code> hide all values by default (<code>management.endpoint.env.show-values=NEVER</code>). If you switch values on, only keys that match the sanitising patterns (<code>password</code>, <code>secret</code>, <code>key</code>, <code>token</code>) are masked, so custom secret names need extra sanitising. Always secure Actuator. Env vars are visible to anyone who can read <code>/proc/&lt;pid&gt;/environ</code> or the container spec; mounted files or a secrets manager with short-lived credentials are stronger. Rotate secrets and design for restart-free reload only if you truly need it (Spring Cloud Config/Vault, <code>@RefreshScope</code> add moving parts).</p>
      <p><b>Production reality.</b> Log the active profiles at startup, fail on missing required config, keep one repo-level default that is safe (no real endpoints), document every property in <code>additional-spring-configuration-metadata.json</code> or via the configuration processor, and test the prod profile in CI with fake values to catch unresolved placeholders before deployment.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants generate complete <code>application.yml</code> files with convincing values, including example passwords, API keys and hostnames. It is easy to paste them in and commit. Secret scanners (and AI tools that read your repo) make leaks more costly than before.</p>
      <p><b>Use AI as a partner:</b> ask <code>Convert these 12 @Value fields into a @ConfigurationProperties record with validation and a metadata-friendly structure</code>; ask it to create profile-specific YAML for dev, test and prod from a description and to list <b>every placeholder that must be provided by the environment</b>. Ask it to write a startup test that loads the prod profile with dummy values.</p>
      <p><b>Where AI goes wrong:</b> hardcodes credentials "for the example", uses outdated keys (<code>spring.profiles</code> in a document instead of <code>spring.config.activate.on-profile</code>), mixes <code>.properties</code> and <code>.yml</code> semantics, forgets that env vars outrank files, and never tells you that you must rotate a leaked secret rather than just delete the line.</p>
      <p><b>What you must still own:</b> the secrets policy: where they live, who can read them, how they rotate. Never paste real secrets into an AI chat either; use placeholders and fake values.</p>`,
    problems: [
      {
        title: 'Same Jar, Three Environments',
        level: 'Medium',
        tags: ['profiles', 'configuration', 'secrets'],
        companies: ['Uber', 'Thoughtworks', 'Capgemini'],
        statement: `<p>Design the configuration for a Spring Boot service that runs: locally against in-memory H2, in CI tests against a throwaway PostgreSQL container, and in production against a managed PostgreSQL. Requirements: one build artifact, <b>no secret in Git or in the jar</b>, an emergency way to change the DB host without rebuilding, and startup must fail if the production password is missing.</p>`,
        constraints: `Spring Boot 3.x, deployed as a container on Kubernetes. Describe files, profiles, environment variables and which layer wins.`,
        example: `<p>Local: ${H.c('b', 'profile dev')} &rarr; <code>jdbc:h2:mem:shop</code>. CI: ${H.c('b', 'profile test')} &rarr; Testcontainers URL. Prod: ${H.c('b', 'profile prod')} &rarr; <code>jdbc:postgresql://&#36;{DB_HOST}:5432/shop</code> and <code>password: &#36;{DB_PASSWORD}</code> with no default.</p>`,
        brute: { why: `<p>Three jars (or three Git branches) each with hard-coded URLs and passwords. Builds drift apart, a prod password lives in Git history forever, and changing the host means a rebuild and redeploy of a different artifact than the one you tested.</p>` },
        mcq: { q: 'Both application-prod.yml and an SPRING_DATASOURCE_URL environment variable define the URL. Which value is used?', options: ['The environment variable', 'application-prod.yml', 'application.yml', 'It is a startup error'], answer: 0, explain: 'Environment variables are higher in the property source order than config files, so they override even profile-specific files.' },
        hints: [
          `<p>Hint 1: separate <b>what differs per environment</b> (URL, pool size, feature switches) from <b>what is secret</b> (passwords, tokens). They are stored differently.</p>`,
          `<p>Hint 2: use <code>application.yml</code> for safe defaults, profile documents for dev/prod differences, and placeholders for secrets. The platform (Kubernetes Secret) provides the secret as an environment variable.</p>`,
          `<p>Hint 3: remember the priority order. An environment variable like <code>SPRING_DATASOURCE_URL</code> overrides files, which gives you the emergency override without rebuilding. A placeholder without default makes startup fail when the secret is missing.</p>`
        ],
        solution: {
          approach: `<p><b>Files (in the jar, no secrets):</b> <code>application.yml</code> with safe defaults and the placeholders <code>password: &#36;{DB_PASSWORD}</code> (no default). A <code>dev</code> document: H2 in-memory URL, <code>sa</code> user, empty password. A <code>test</code> profile: Testcontainers' JDBC URL (<code>jdbc:tc:postgresql:16:///shop</code>) or <code>@ServiceConnection</code> in tests so the URL is generated. A <code>prod</code> document: <code>jdbc:postgresql://&#36;{DB_HOST}:5432/shop</code>, bigger Hikari pool, graceful shutdown.</p>
            <p><b>Runtime (outside the jar):</b> Kubernetes sets <code>SPRING_PROFILES_ACTIVE=prod</code>, <code>DB_HOST</code> and the password from a <code>Secret</code> via <code>secretKeyRef</code> (or a mounted file read with <code>configtree:</code>). Nothing sensitive is in Git or the image.</p>
            <p><b>Emergency override:</b> set <code>SPRING_DATASOURCE_URL</code> on the deployment; environment variables outrank every file, so the next pod start uses the new host with the same image. Roll it back by removing the variable.</p>
            <p><b>Fail fast:</b> the placeholder has no default, so a missing <code>DB_PASSWORD</code> aborts startup with "Could not resolve placeholder", caught by the readiness probe in the first deployment rather than at the first query. Add a CI test that boots the prod profile with dummy values to catch typos early. Keep dev-only beans behind <code>@Profile("!prod")</code> only if they cannot be dangerous when the profile is forgotten.</p>`,
          code: { lang: 'yaml', code: `# deployment excerpt: secrets and environment come from the platform
env:
  - name: SPRING_PROFILES_ACTIVE
    value: prod
  - name: DB_HOST
    value: shop-db.internal
  - name: DB_PASSWORD
    valueFrom:
      secretKeyRef:
        name: shop-db
        key: password` },
          complexity: `<p>Configuration lookup is a one-time startup cost. Operational complexity is the real cost: keep the number of profiles small and document each placeholder.</p>`,
          followUps: ['How would you rotate the DB password without downtime?', 'When would you prefer a config server or Vault over environment variables?']
        }
      }
    ]
  });

  // =====================================================================
  // PRACTICE ARENA
  // =====================================================================
  function mk(o) {
    var p = {
      title: o.title, level: o.level, tags: o.tags, companies: o.companies,
      statement: o.statement, constraints: o.constraints, example: o.example,
      brute: { why: o.bruteWhy },
      mcq: o.mcq, hints: o.hints,
      solution: { approach: o.approach, complexity: o.complexity, followUps: o.followUps }
    };
    if (o.bruteCode) p.brute.code = o.bruteCode;
    if (o.code) p.solution.code = o.code;
    return p;
  }

  // ---------------- EASY ----------------
  practice.push(mk({
    title: 'Constructor Injection Refactor', level: 'Easy', tags: ['dependency injection', 'testing'], companies: ['TCS', 'Infosys', 'Amazon'],
    statement: `<p>A class <code>InvoiceService</code> has three <code>@Autowired private</code> fields (<code>TaxCalculator</code>, <code>InvoiceRepository</code>, <code>MailSender</code>). Refactor it to constructor injection and explain three concrete benefits. Then show how a plain JUnit test creates it without Spring.</p>`,
    constraints: `Spring Boot 3.x, Java 21. No behaviour change allowed.`,
    example: `<p>Before: ${H.c('r', '@Autowired private TaxCalculator tax;')} After: ${H.c('g', 'private final TaxCalculator tax;')} plus a constructor taking all three. A test can now call <code>new InvoiceService(fakeTax, fakeRepo, fakeMail)</code>.</p>`,
    bruteWhy: `<p>Keeping the field injection and using <code>@InjectMocks</code> or <code>@SpringBootTest</code> in tests works, but the dependencies stay invisible, fields cannot be final, and every test pays the cost of reflection or a full Spring context start.</p>`,
    mcq: { q: 'Which is a direct benefit of constructor injection?', options: ['Fields can be final and the object is never half-built', 'Spring starts faster by 10x', 'Circular dependencies are resolved automatically', 'No need for beans to be declared'], answer: 0, explain: 'The constructor receives every required dependency, so fields can be final and a missing dependency is impossible; cycles are detected at startup rather than hidden.' },
    hints: [
      `<p>Hint 1: think about what a class says about itself. A constructor lists, in one place, everything the class needs in order to work.</p>`,
      `<p>Hint 2: Spring 4.3+ injects a single constructor automatically, so <code>@Autowired</code> is not required. Mark fields <code>private final</code>.</p>`,
      `<p>Hint 3: benefits: (1) immutability and final fields, (2) required dependencies enforced by the compiler, (3) tests use plain <code>new</code> with fakes, no Spring, and too many constructor params becomes a visible design smell.</p>`
    ],
    approach: `<p>Replace the three annotated fields with <code>private final</code> fields and one constructor that assigns them; delete <code>@Autowired</code>. Spring calls the single constructor automatically and supplies matching beans by type.</p>
      <p><b>Benefit 1 - safety:</b> final fields mean the dependencies cannot be reassigned or left null; the object is fully built or not built at all. <b>Benefit 2 - visibility:</b> the constructor signature documents what the class needs; if it grows to 8 parameters you notice the class does too much. <b>Benefit 3 - testing:</b> a unit test just calls <code>new InvoiceService(fakeTax, fakeRepo, fakeMail)</code>, running in milliseconds without Spring or reflection. It also makes circular dependencies fail fast at startup.</p>`,
    code: { lang: 'java', check: false, code: `@Service
public class InvoiceService {
    private final TaxCalculator tax;
    private final InvoiceRepository repo;
    private final MailSender mail;

    public InvoiceService(TaxCalculator tax, InvoiceRepository repo, MailSender mail) {
        this.tax = tax; this.repo = repo; this.mail = mail;
    }
}

class InvoiceServiceTest {
    @Test void computesTax() {
        var svc = new InvoiceService(new FlatTax(10), new InMemoryInvoiceRepo(), new NoopMail());
        // assertions here: no Spring context needed
    }
}` },
    complexity: `<p>No runtime difference. The gain is design clarity and test speed.</p>`,
    followUps: ['When is setter injection appropriate?', 'How does Lombok @RequiredArgsConstructor help, and what is its risk?']
  }));

  practice.push(mk({
    title: 'Pick the Scope', level: 'Easy', tags: ['bean scopes'], companies: ['Cognizant', 'Wipro'],
    statement: `<p>Choose a scope (singleton, prototype, request, session) and justify it for: (1) <code>PriceCalculator</code> with only final config fields; (2) <code>ReportBuilder</code> that accumulates rows in a list while building; (3) <code>CurrentTenant</code> holding the tenant id from a header; (4) <code>HikariDataSource</code>; (5) a user's shopping cart in a stateful web app.</p>`,
    constraints: `Spring Boot 3.x web application, many concurrent users.`,
    example: `<p>(1) singleton, because it is stateless and thread-safe. (2) ${H.c('y', 'prototype')} or a local object: it is mutable and must not be shared.</p>`,
    bruteWhy: `<p>Making everything singleton "because it is the default" causes shared mutable state bugs (2, 3, 5). Making everything prototype wastes memory and loses shared resources like the connection pool.</p>`,
    mcq: { q: 'A bean stores the tenant id of the current HTTP request in a field. Which scope is correct?', options: ['request (with a proxy when injected into singletons)', 'singleton', 'application', 'prototype injected once into a singleton'], answer: 0, explain: 'Request scope gives one instance per HTTP request; injecting it into a singleton requires a scoped proxy so each call resolves the current request instance.' },
    hints: [
      `<p>Hint 1: for each class ask "does it keep data that differs per user or per call?" If no, it can be a shared singleton.</p>`,
      `<p>Hint 2: mutable per-call state wants a prototype (or just <code>new</code> in a method); per-HTTP-request data wants request scope; expensive shared resources want singleton.</p>`,
      `<p>Hint 3: remember the mismatch rule: a singleton injecting a shorter-lived bean needs <code>ObjectProvider</code> or a scoped proxy, otherwise it gets one instance forever.</p>`
    ],
    approach: `<p><b>(1) PriceCalculator:</b> singleton. Final config only, no per-call state, thread-safe. <b>(2) ReportBuilder:</b> prototype via <code>ObjectProvider</code>, or better a plain <code>new</code> inside the method, since it needs no injection. <b>(3) CurrentTenant:</b> request scope with a proxy (<code>@RequestScope</code>), because the value differs per HTTP request; remember that it is not available on background threads. <b>(4) DataSource:</b> singleton: a connection pool is exactly the thing to share, and it is thread-safe by design; destroyed on shutdown. <b>(5) Shopping cart:</b> session scope works for a single node, but it breaks scaling (sticky sessions, memory); prefer storing the cart in a database or Redis keyed by user id and keep the service singleton and stateless.</p>`,
    complexity: `<p>Decision exercise. The rule: stateless means singleton; per-use mutable state means prototype or local variable; per-request data means request scope.</p>`,
    followUps: ['What happens if the singleton ReportService field-injects a prototype bean?', 'Why can a request-scoped bean fail inside an @Async method?']
  }));

  practice.push(mk({
    title: 'Why Is My Private @Transactional Ignored?', level: 'Easy', tags: ['transactional', 'proxy'], companies: ['Infosys', 'Accenture'],
    statement: `<p>A developer writes:</p><pre>@Service
public class UserService {
    public void register(User u) { saveUser(u); sendWelcome(u); }
    @Transactional
    private void saveUser(User u) { repo.save(u); audit.save(...); }
}</pre><p>When <code>audit.save</code> throws, the user is still saved. Explain exactly why, and give two correct fixes.</p>`,
    constraints: `Spring Boot 3.x, class-based (CGLIB) proxies, default settings.`,
    example: `<p>Call path: caller &rarr; proxy &rarr; <code>register</code> (not transactional) &rarr; <code>this.saveUser</code> ${H.c('r', '(bypasses proxy, private)')}. Each repository call then commits on its own.</p>`,
    bruteWhy: `<p>Wrapping everything in try/catch and manually deleting the user on failure is fragile: if the process crashes between save and delete you have an orphan row. The framework already offers atomicity if used correctly.</p>`,
    mcq: { q: 'Which makes @Transactional effective here?', options: ['Put @Transactional on the public register method', 'Make saveUser protected and keep this.saveUser()', 'Add @Transactional to the repository field', 'Rename saveUser to doSaveUser'], answer: 0, explain: 'The proxy intercepts the external call to the public method register; the whole body then runs in one transaction. Private methods and self-calls are never intercepted.' },
    hints: [
      `<p>Hint 1: remember that a transaction starts only when a call goes through the proxy. Which call in this code goes through the proxy?</p>`,
      `<p>Hint 2: <code>register</code> is the only method called from outside. It has no annotation, so no transaction exists. The annotation on a private, self-called method is ignored.</p>`,
      `<p>Hint 3: fix by annotating the public entry point (<code>register</code>), or move the transactional part into another bean that <code>UserService</code> injects.</p>`
    ],
    approach: `<p><b>Why:</b> <code>@Transactional</code> works through a proxy that wraps calls coming <i>from outside</i> the bean. Two things break here: <code>saveUser</code> is <b>private</b> (proxies cannot intercept private methods) and it is called with an implicit <code>this</code> from <code>register</code> (self-invocation skips the proxy anyway). Since <code>register</code> itself has no annotation, no transaction exists, so <code>repo.save</code> commits immediately on its own and the later failure cannot undo it.</p>
      <p><b>Fix 1:</b> annotate the public <code>register</code> method (the transaction boundary belongs on the service's public use case). <b>Fix 2:</b> if only part must be transactional, move that part to another bean (<code>UserPersistence.saveUserAndAudit</code>) with a public <code>@Transactional</code> method and inject it. Verify with SQL logs or a test that asserts nothing is saved after a failure.</p>`,
    complexity: `<p>No cost issue: it is a correctness fix. Keep transactions short and on public service methods.</p>`,
    followUps: ['Would protected or package-private work in Spring 6?', 'What if register must call another transactional method with REQUIRES_NEW?']
  }));

  practice.push(mk({
    title: 'Lifecycle Order Prediction', level: 'Easy', tags: ['bean lifecycle'], companies: ['Cognizant', 'HCL'],
    statement: `<p>A singleton bean has a constructor that prints "1 ctor", a setter-injected dependency whose setter prints "2 setter", a <code>@PostConstruct</code> method printing "3 init", and a <code>@PreDestroy</code> printing "4 destroy". Give the exact order of output during application start and stop. Then say what changes if the bean is <code>@Scope("prototype")</code> and the context closes.</p>`,
    constraints: `Spring Boot 3.x, no other post-processors.`,
    example: `<p>Start: ${H.c('g', '1 ctor, 2 setter, 3 init')}. Stop: ${H.c('b', '4 destroy')}. For a prototype, "4 destroy" never prints.</p>`,
    bruteWhy: `<p>Guessing "setter first" because the dependency is needed. But Spring must create the object before it can call any setter, so the constructor always runs first.</p>`,
    mcq: { q: 'Why is a field-injected dependency still null in the constructor?', options: ['Injection happens after the constructor has run', 'Spring ignores private fields', 'Constructors run twice', '@PostConstruct runs before the constructor'], answer: 0, explain: 'Spring must instantiate the object first, then populate fields/setters, then call init callbacks.' },
    hints: [
      `<p>Hint 1: an object cannot receive injected values before it exists, so something comes first.</p>`,
      `<p>Hint 2: phases: instantiate, populate dependencies, aware callbacks, post-processors, @PostConstruct, ready, @PreDestroy.</p>`,
      `<p>Hint 3: prototypes are handed over after init and then forgotten by the container: destroy callbacks are the caller's job.</p>`
    ],
    approach: `<p>Order at startup: <b>constructor</b> (1), then <b>setter injection</b> (2), then <b>@PostConstruct</b> (3), because Spring must create the object before it can inject into it, and init callbacks run only once injection is done. On shutdown the container calls <b>@PreDestroy</b> (4) for singletons.</p>
      <p>For a <b>prototype</b> the first three still run each time someone asks for a new instance, but the container does not track it after creation, so <code>@PreDestroy</code> is never called on context close. The code that obtained the instance must release resources itself (for example with try-with-resources). Also note: if the bean is wrapped by an AOP proxy, the proxy is created after init, so calling a transactional method from @PostConstruct on <code>this</code> is not transactional.</p>`,
    complexity: `<p>Not applicable; understanding the phases lets you place initialisation code correctly.</p>`,
    followUps: ['Where would you start a background thread that must stop on shutdown?', 'What is the difference between @PostConstruct and ApplicationRunner?']
  }));

  // ---------------- MEDIUM ----------------
  practice.push(mk({
    title: 'Singleton Holding Request State', level: 'Medium', tags: ['scopes', 'thread safety', 'debugging'], companies: ['Flipkart', 'Zalando', 'Amazon'],
    statement: `<p>Users report seeing other customers' names on their invoice PDF, rarely, and only in production. The code: <code>@Service class InvoiceService { private Customer current; void load(long id){ current = repo.find(id);} byte[] pdf(){ return render(current);} }</code> and a controller that calls <code>load(id)</code> then <code>pdf()</code>. Diagnose and fix it in two different ways, and explain how you would write a test that proves the bug.</p>`,
    constraints: `Tomcat with 200 threads, ~500 requests/second, Spring Boot 3.x.`,
    example: `<p>Thread A: <code>load(1)</code>; thread B: <code>load(2)</code>; thread A: <code>pdf()</code> renders ${H.c('r', 'customer 2')}. Passes every single-user test.</p>`,
    bruteWhy: `<p>Adding <code>synchronized</code> to both methods does not help (A can still run load, B load, A pdf between the two calls) and it serialises the whole server. Making the service prototype hides the issue while injection into singleton controllers still shares one instance.</p>`,
    mcq: { q: 'What is the best structural fix?', options: ['Pass the customer as a parameter and keep the service stateless', 'Mark both methods synchronized', 'Use volatile on the field', 'Restart the application nightly'], answer: 0, explain: 'The shared mutable field is the bug. Without shared state there is nothing to synchronise and the service scales.' },
    hints: [
      `<p>Hint 1: how many instances of <code>InvoiceService</code> exist? Who uses the field <code>current</code>?</p>`,
      `<p>Hint 2: the two-step "load then pdf" API relies on state left between calls. Combine into one call that carries the data in parameters or return values.</p>`,
      `<p>Hint 3: alternatively use a request-scoped holder or a local object created per request; for the test, run 8+ threads calling load then pdf with different ids and assert each output matches its own id.</p>`
    ],
    approach: `<p><b>Diagnosis:</b> the service is a singleton, so one <code>current</code> field is shared by all request threads. Between thread A's <code>load</code> and <code>pdf</code>, thread B overwrites it. Timing-dependent, hence rare and absent from tests.</p>
      <p><b>Fix 1 (best):</b> remove the field; make the API <code>byte[] pdf(long customerId)</code> which loads into a local variable and renders it. Stateless, no locks, scales with threads. <b>Fix 2:</b> if multi-step state is truly needed, create a small request-scoped object (<code>@RequestScope</code> with proxy) or a per-request workflow object created with <code>new</code> and discarded; or return the loaded <code>Customer</code> from <code>load</code> and pass it to <code>pdf</code>.</p>
      <p><b>Test:</b> an <code>ExecutorService</code> of 16 threads, each running 1000 iterations with a unique id and asserting the PDF contains its own id; against the buggy code it fails within a second, against the fix it never fails. Add a review rule: no non-final instance fields in singleton beans.</p>`,
    complexity: `<p>Fix removes contention: throughput scales with the number of threads instead of being limited by a lock.</p>`,
    followUps: ['How would a static analysis rule detect this?', 'When is it acceptable for a singleton to hold mutable state?']
  }));

  practice.push(mk({
    title: 'Self-Invocation: Choose the Fix', level: 'Medium', tags: ['aop', 'proxy', 'transactional'], companies: ['Thoughtworks', 'Atlassian'],
    statement: `<p><code>OrderService.checkout()</code> calls <code>this.sendReceipt()</code>, annotated <code>@Async</code>, and <code>this.recordMetrics()</code>, annotated <code>@Transactional(REQUIRES_NEW)</code>. Neither behaves as annotated. Explain why and compare four fixes (extract bean, self-injection, AopContext, AspectJ), with a recommendation.</p>`,
    constraints: `Spring Boot 3.x with CGLIB proxies, team prefers readable code.`,
    example: `<p>Both calls are ${H.c('r', 'this.method()')} so they skip the proxy where the async/transaction advice lives: receipt is sent on the request thread and metrics join the caller's transaction.</p>`,
    bruteWhy: `<p>Copy-pasting the async/transaction logic by hand into the caller (own executor, own TransactionTemplate) works but duplicates framework code in every service and is easy to get wrong.</p>`,
    mcq: { q: 'Which fix is generally recommended?', options: ['Move the annotated methods into a separate bean and inject it', 'Use AopContext.currentProxy() everywhere', 'Make the methods private', 'Mark the class final'], answer: 0, explain: 'A separate bean makes the call cross a proxy boundary naturally, keeps code testable and needs no framework tricks.' },
    hints: [
      `<p>Hint 1: find where the advice lives. It is in the proxy, not in your class.</p>`,
      `<p>Hint 2: the call must reach the proxy. Four ways: another bean, a reference to the proxy injected into itself, <code>AopContext.currentProxy()</code> (needs exposeProxy), or weaving the aspect into bytecode (AspectJ).</p>`,
      `<p>Hint 3: compare on readability, coupling to Spring and setup cost; extract-a-bean wins on all three in most codebases.</p>`
    ],
    approach: `<p><b>Why:</b> <code>@Async</code> and <code>@Transactional</code> are implemented by advice in a proxy placed in front of your bean. <code>this.x()</code> calls the raw object, so the advice never runs.</p>
      <p><b>Option 1 - extract a bean</b> (<code>ReceiptSender</code>, <code>MetricsRecorder</code>): natural, testable, explicit boundaries. Recommended. <b>Option 2 - self-injection</b> (<code>@Lazy</code> field of the same type): works, but confusing and hints at a design smell. <b>Option 3 - AopContext.currentProxy()</b>: needs <code>exposeProxy=true</code> and ties business code to Spring internals. <b>Option 4 - AspectJ weaving</b> (compile-time or load-time): handles self-calls and private methods, but adds build complexity and a different mental model; choose it only when you have many such cases.</p>
      <p><b>Recommendation:</b> option 1, and also check that <code>@EnableAsync</code> is present and that the async method returns void or a Future. Mind the REQUIRES_NEW pool cost (second connection).</p>`,
    complexity: `<p>Option 1 adds one extra bean and one proxy call (microseconds). The others add coupling rather than cost.</p>`,
    followUps: ['How do you verify a method is really advised in a test?', 'What does @Async do to the transaction of the caller?']
  }));

  practice.push(mk({
    title: 'Checked Exception Did Not Roll Back', level: 'Medium', tags: ['transactional', 'rollback'], companies: ['JPMorgan', 'Goldman Sachs'],
    statement: `<p><code>@Transactional public void ship(long id) throws ShippingException</code> first updates the order status to SHIPPED, then calls a carrier API that throws the <i>checked</i> <code>ShippingException</code>. The status stays SHIPPED in the DB. Explain, fix it in three ways, and discuss when keeping the commit is actually desirable.</p>`,
    constraints: `Spring Boot 3.x, JPA. ShippingException extends Exception.`,
    example: `<p>Default rule: only ${H.c('r', 'RuntimeException and Error')} roll back. ${H.c('b', 'ShippingException')} is checked, so the interceptor commits and rethrows it to the caller.</p>`,
    bruteWhy: `<p>Catching the exception and setting the status back manually adds a second write and can itself fail; also the caller no longer sees the failure unless you rethrow, and half the logic is duplicated across methods.</p>`,
    mcq: { q: 'What is the minimal annotation change for rollback on any exception?', options: ['@Transactional(rollbackFor = Exception.class)', '@Transactional(readOnly = false)', '@Transactional(propagation = REQUIRES_NEW)', '@Transactional(isolation = SERIALIZABLE)'], answer: 0, explain: 'rollbackFor extends the default rule so checked exceptions also trigger rollback.' },
    hints: [
      `<p>Hint 1: ask which exceptions the default rule treats as failure. The reason is historical (EJB): checked exceptions were "business" outcomes.</p>`,
      `<p>Hint 2: options: <code>rollbackFor</code> on the annotation, wrap the checked exception in a runtime one, or call <code>TransactionAspectSupport.currentTransactionStatus().setRollbackOnly()</code>.</p>`,
      `<p>Hint 3: keeping a commit is right when the checked exception represents a legitimate business result that should be persisted, e.g. "payment declined" recorded as a status.</p>`
    ],
    approach: `<p><b>Why:</b> Spring's default rollback rule matches <code>RuntimeException</code> and <code>Error</code> only. A checked <code>ShippingException</code> is treated as a normal alternative return path, so the interceptor commits (SHIPPED stays) and then rethrows.</p>
      <p><b>Fix A:</b> <code>@Transactional(rollbackFor = ShippingException.class)</code> (or <code>Exception.class</code> as a team-wide convention). <b>Fix B:</b> convert to an unchecked exception at the boundary (<code>throw new ShippingFailedException(e)</code>), which also simplifies callers. <b>Fix C:</b> in a catch block mark the transaction rollback-only programmatically; useful when you want to return a result object instead of throwing.</p>
      <p><b>When commit is desired:</b> if the failure is itself state to store (order marked SHIPPING_FAILED with the reason), commit that and tell the caller. Do not call the carrier API inside the transaction at all if you can avoid it: write PENDING, call the API, then record the result in a short second transaction.</p>`,
    complexity: `<p>No cost difference; the cost of the bug is inconsistent data. Add a test that throws each exception type and asserts DB state.</p>`,
    followUps: ['Does rollbackFor change what the caller receives?', 'How do you test rollback behaviour reliably?']
  }));

  practice.push(mk({
    title: 'Write a Conditional Auto-Configuration', level: 'Medium', tags: ['auto-configuration', 'conditional', 'starter'], companies: ['Netflix', 'Uber', 'Thoughtworks'],
    statement: `<p>Your platform team ships a library with a <code>MetricsClient</code>. Design a Boot auto-configuration so teams just add the dependency: it must create a <code>MetricsClient</code> from <code>metrics.endpoint</code>, back off if the application defines its own, be switchable with <code>metrics.enabled=false</code>, and only apply when the library class is present. List the files needed and the annotations used.</p>`,
    constraints: `Spring Boot 3.x. Must not require users to import anything or scan packages.`,
    example: `<p>User adds the dependency and sets ${H.c('b', 'metrics.endpoint=https://metrics.internal')}: a <code>MetricsClient</code> bean appears. User defines their own bean: ${H.c('g', 'ours backs off')}.</p>`,
    bruteWhy: `<p>Asking every team to add <code>@ComponentScan("com.acme.metrics")</code> or <code>@Import</code> is error prone and scans classes you do not want; shared config copied into each service drifts out of date.</p>`,
    mcq: { q: 'Which annotation lets the user override your default MetricsClient with their own?', options: ['@ConditionalOnMissingBean', '@ConditionalOnBean', '@Primary', '@Lazy'], answer: 0, explain: 'ConditionalOnMissingBean registers the default only when no bean of that type exists yet, which implements the back-off rule.' },
    hints: [
      `<p>Hint 1: Boot loads auto-configurations from a file inside each jar, not by scanning your package.</p>`,
      `<p>Hint 2: pieces: a <code>@ConfigurationProperties</code> class, a <code>@AutoConfiguration</code> class with a guarded <code>@Bean</code>, and the <code>.imports</code> file under <code>META-INF/spring</code>.</p>`,
      `<p>Hint 3: guards: <code>@ConditionalOnClass</code>, <code>@ConditionalOnProperty(prefix="metrics", name="enabled", matchIfMissing=true)</code>, <code>@ConditionalOnMissingBean</code>. Ideally split autoconfigure and starter modules.</p>`
    ],
    approach: `<p><b>Files:</b> (1) <code>MetricsProperties</code> annotated <code>@ConfigurationProperties("metrics")</code> with <code>endpoint</code> and <code>enabled</code>; (2) <code>MetricsAutoConfiguration</code> annotated <code>@AutoConfiguration</code>, <code>@ConditionalOnClass(MetricsClient.class)</code>, <code>@ConditionalOnProperty(prefix="metrics", name="enabled", havingValue="true", matchIfMissing=true)</code> and <code>@EnableConfigurationProperties</code>; (3) inside, a <code>@Bean @ConditionalOnMissingBean MetricsClient metricsClient(MetricsProperties p)</code>; (4) <code>META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports</code> containing the fully qualified class name; (5) optionally the configuration processor dependency for IDE metadata, and a thin <code>-starter</code> jar that only declares dependencies.</p>
      <p><b>Behaviour:</b> auto-config classes are processed after user configuration, so <code>ConditionalOnMissingBean</code> sees the user's bean and backs off. Validate required properties with <code>@Validated</code> so a missing endpoint fails at startup. Test with <code>ApplicationContextRunner</code>: run once with no bean (expects default), once with a user bean (expects theirs), once with <code>metrics.enabled=false</code> (expects none).</p>`,
    code: { lang: 'java', check: false, code: `@AutoConfiguration
@ConditionalOnClass(MetricsClient.class)
@ConditionalOnProperty(prefix = "metrics", name = "enabled", havingValue = "true", matchIfMissing = true)
@EnableConfigurationProperties(MetricsProperties.class)
public class MetricsAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean
    MetricsClient metricsClient(MetricsProperties props) {
        return new MetricsClient(props.getEndpoint());
    }
}

// test
class MetricsAutoConfigurationTest {
    private final ApplicationContextRunner runner =
        new ApplicationContextRunner().withConfiguration(AutoConfigurations.of(MetricsAutoConfiguration.class));

    @Test void backsOffWhenUserDefinesBean() {
        runner.withBean(MetricsClient.class, () -> new MetricsClient("custom"))
              .run(ctx -> assertThat(ctx.getBean(MetricsClient.class).endpoint()).isEqualTo("custom"));
    }
}` },
    complexity: `<p>Evaluated once at startup. The cost to watch is classpath bloat: keep conditions cheap and avoid loading heavy classes in condition checks.</p>`,
    followUps: ['Why split autoconfigure and starter modules?', 'How do you document properties for IDE auto-complete?']
  }));

  practice.push(mk({
    title: 'Feature Flag with Property and Profile', level: 'Medium', tags: ['profiles', 'conditional', 'configuration'], companies: ['Shopify', 'Atlassian'],
    statement: `<p>A <code>RecommendationService</code> should exist only when <code>features.recommendations.enabled=true</code>; in the <code>dev</code> profile a fake implementation should be used instead of the real one. Controllers depend on the interface. Describe the bean definitions and what happens when the flag is false.</p>`,
    constraints: `Spring Boot 3.x. The controller must not crash when the feature is disabled.`,
    example: `<p>Flag on + prod: real service. Flag on + dev: ${H.c('b', 'fake')}. Flag off: ${H.c('y', 'no bean')} and the controller must handle absence (Optional / ObjectProvider).</p>`,
    bruteWhy: `<p>An <code>if (flag)</code> inside every method keeps the dead code loaded, has no startup validation and spreads the toggle across the codebase, making it hard to remove later.</p>`,
    mcq: { q: 'The flag is off and the controller constructor requires RecommendationService. What happens?', options: ['Startup fails with NoSuchBeanDefinitionException', 'It receives null silently', 'Spring creates a default instance', 'The controller is skipped without error'], answer: 0, explain: 'A required constructor dependency with no matching bean fails the context. Use Optional/ObjectProvider or make the controller conditional too.' },
    hints: [
      `<p>Hint 1: two independent switches exist: a property (feature on/off) and a profile (environment). Combine them on separate beans.</p>`,
      `<p>Hint 2: put <code>@ConditionalOnProperty</code> on the configuration and <code>@Profile</code> on the individual beans.</p>`,
      `<p>Hint 3: for the consumer use <code>ObjectProvider&lt;RecommendationService&gt;</code> and <code>ifAvailable</code>, or an empty implementation (null object) when disabled.</p>`
    ],
    approach: `<p>Create a configuration class with <code>@ConditionalOnProperty(prefix="features.recommendations", name="enabled", havingValue="true")</code>. Inside define two beans of the interface: <code>@Bean @Profile("!dev")</code> returning the real service and <code>@Bean @Profile("dev")</code> returning the fake. When the flag is false the whole class is skipped and <b>no bean exists</b>.</p>
      <p>To keep consumers safe, either inject <code>ObjectProvider&lt;RecommendationService&gt;</code> and call <code>getIfAvailable()</code>, or define a third "disabled" configuration with <code>@ConditionalOnProperty(... havingValue="false", matchIfMissing=true)</code> that supplies a null-object implementation returning empty lists, so the rest of the code is unchanged. Prefer the null object when many classes use the interface.</p>
      <p>Test with <code>ApplicationContextRunner</code> for the three combinations. Remove the flag and the dead branch when the feature is permanent.</p>`,
    complexity: `<p>Startup-time decision; no per-request cost. Runtime toggling would need a different mechanism (a feature-flag service).</p>`,
    followUps: ['What if the flag must change without a restart?', 'Why does @ConditionalOnBean on a normal component give unreliable results?']
  }));

  practice.push(mk({
    title: 'Timing Aspect with a Custom Annotation', level: 'Medium', tags: ['aop', 'aspect'], companies: ['Amazon', 'Walmart'],
    statement: `<p>Write an aspect that logs the duration of any method annotated <code>@Timed</code>, including when the method throws, without changing its return value or exception. Name the traps: what makes it silently not run, and what breaks return values?</p>`,
    constraints: `Spring Boot 3.x, spring-boot-starter-aop on the classpath.`,
    example: `<p><code>@Timed public Order find(long id)</code> logs ${H.c('g', 'find took 12 ms')}; if it throws, it logs ${H.c('r', 'find failed after 5 ms')} and rethrows the same exception.</p>`,
    bruteWhy: `<p>Putting <code>long start = ...; ... log</code> at the top and bottom of every method duplicates code, forgets the failure path, and is removed or broken during refactors.</p>`,
    mcq: { q: 'What must an @Around advice return?', options: ['The value returned by pjp.proceed()', 'Always null', 'void', 'The ProceedingJoinPoint'], answer: 0, explain: 'Returning anything else changes what callers receive. Returning null for a method that returns an object causes NullPointerExceptions downstream.' },
    hints: [
      `<p>Hint 1: use <code>@Around</code> so you can measure before and after the real method; <code>pjp.proceed()</code> runs it.</p>`,
      `<p>Hint 2: use try/finally (or catch and rethrow) to log on failure; never swallow the exception.</p>`,
      `<p>Hint 3: traps: not a Spring bean, no starter-aop, self-invocation, private/final methods, forgetting to return the result, wrong pointcut syntax. Bind the annotation with <code>@annotation(timed)</code>.</p>`
    ],
    approach: `<p>Define the marker annotation with <code>@Retention(RUNTIME)</code> and <code>@Target(METHOD)</code>. Write a <code>@Component @Aspect</code> class with <code>@Around("@annotation(timed)")</code> taking <code>ProceedingJoinPoint pjp, Timed timed</code>. Record <code>System.nanoTime()</code>, call <code>pjp.proceed()</code> inside try, return its result, and in <code>finally</code> log the elapsed time (log failures in a catch that rethrows the <b>same</b> Throwable).</p>
      <p><b>Traps that make it silently not run:</b> missing <code>spring-boot-starter-aop</code>, aspect not a bean, the call is a self-invocation, the method is private/final/static or the object is created with <code>new</code>. <b>Traps that break behaviour:</b> forgetting <code>return</code> (callers get null), catching Exception and not rethrowing, changing arguments incorrectly, doing heavy work in the advice, and ordering relative to <code>@Transactional</code> (timing outside the transaction includes commit time, inside it does not).</p>
      <p>Use Micrometer's <code>@Timed</code>/<code>Timer</code> in real projects so timings feed dashboards instead of logs.</p>`,
    code: { lang: 'java', check: false, code: `@Aspect
@Component
public class TimedAspect {
    private static final Logger log = LoggerFactory.getLogger(TimedAspect.class);

    @Around("@annotation(timed)")
    public Object time(ProceedingJoinPoint pjp, Timed timed) throws Throwable {
        long start = System.nanoTime();
        boolean ok = false;
        try {
            Object result = pjp.proceed();
            ok = true;
            return result;
        } finally {
            long ms = (System.nanoTime() - start) / 1_000_000;
            log.info("{} {} in {} ms", pjp.getSignature().toShortString(), ok ? "took" : "failed after", ms);
        }
    }
}` },
    complexity: `<p>Overhead is one extra method call plus two clock reads per advised call: negligible except in extremely hot loops.</p>`,
    followUps: ['How would you add tags (method name, outcome) to a Micrometer timer here?', 'How do you unit-test an aspect?']
  }));

  practice.push(mk({
    title: 'Design the Error Contract of an Endpoint', level: 'Medium', tags: ['spring mvc', 'error handling', 'api design'], companies: ['Stripe', 'Atlassian', 'Zalando'],
    statement: `<p>Design the error handling for <code>POST /orders</code>: invalid JSON, validation failure (<code>qty &lt; 1</code>), unknown product, duplicate request, and a database outage. For each case choose the status code and where in the Spring MVC pipeline it should be produced, and propose one central class so controllers have no try/catch.</p>`,
    constraints: `Spring Boot 3.x, JSON API, consistent error format (RFC 9457 ProblemDetail).`,
    example: `<p>Invalid JSON &rarr; ${H.c('r', '400')} from the message converter. Validation &rarr; ${H.c('r', '400')} with field list. Unknown product &rarr; 422 or 404 from your exception handler.</p>`,
    bruteWhy: `<p>try/catch in each controller returning 200 with <code>{"error": "..."}</code> hides failures from clients, retries, monitoring and caches; formats differ per endpoint.</p>`,
    mcq: { q: 'Which Spring construct centralises exception-to-response mapping for all controllers?', options: ['@RestControllerAdvice with @ExceptionHandler methods', 'A HandlerInterceptor.preHandle', 'A servlet Filter after the controller', '@Transactional'], answer: 0, explain: 'ControllerAdvice is consulted by the exception resolvers when any controller throws.' },
    hints: [
      `<p>Hint 1: classify each failure: client error (4xx) vs server error (5xx), and whether retrying could help.</p>`,
      `<p>Hint 2: invalid JSON and validation failures are produced before your method body (message converter and validator), so you handle their exceptions, not your own checks.</p>`,
      `<p>Hint 3: duplicate request should use an idempotency key and return the original result (200/201) or 409; DB outage maps to 503 with Retry-After, never leaking details.</p>`
    ],
    approach: `<p><b>Status mapping:</b> invalid JSON &rarr; <b>400</b> (<code>HttpMessageNotReadableException</code>, thrown by the message converter); validation failure &rarr; <b>400</b> with a list of field errors (<code>MethodArgumentNotValidException</code>, thrown by the argument resolver); unknown product &rarr; <b>422</b> (valid syntax but cannot be processed) or 404 if the product is in the URL, via a domain exception; duplicate request &rarr; return the stored response for the same <code>Idempotency-Key</code> (or <b>409</b> if the key was used with a different body); database outage &rarr; <b>503</b> with <code>Retry-After</code>, a generic message, and details only in logs; unexpected exceptions &rarr; <b>500</b>.</p>
      <p><b>Structure:</b> one <code>@RestControllerAdvice</code> with handlers returning <code>ProblemDetail</code> (type, title, status, detail, plus properties like <code>errors</code> and a <code>traceId</code>). Domain exceptions (<code>ProductNotFoundException</code>) are unchecked and carry only safe messages. Controllers contain no try/catch, services throw. Add MockMvc tests for each branch to lock the contract, and log a correlation id so support can find the stack trace without exposing it.</p>`,
    complexity: `<p>No runtime cost. The benefit is a consistent, testable contract and simpler controllers.</p>`,
    followUps: ['How do you avoid leaking internal exception messages?', 'Where would you convert a database timeout into a 503?']
  }));

  // ---------------- HARD ----------------
  practice.push(mk({
    title: 'REQUIRES_NEW and the Exhausted Pool', level: 'Hard', tags: ['transactional', 'connection pool', 'deadlock'], companies: ['Goldman Sachs', 'Uber', 'Amazon'],
    statement: `<p>Under load a service freezes: threads wait for connections, nothing recovers until requests time out. Every request runs <code>@Transactional placeOrder()</code> which calls <code>audit.record()</code> annotated <code>REQUIRES_NEW</code>. HikariCP pool size is 10 with Tomcat at 200 threads. Explain the deadlock precisely, show the arithmetic, and propose at least three remedies with their trade-offs.</p>`,
    constraints: `Spring Boot 3.x, HikariCP default connectionTimeout 30 s, PostgreSQL.`,
    example: `<p>10 requests start: each holds ${H.c('b', 'connection #1')} for T1 and asks for ${H.c('r', 'a second one')} for T2. Pool = 10, all taken. Nobody can finish, so nobody releases.</p>`,
    bruteWhy: `<p>Raising the pool size to 200 and ignoring the design just moves the cliff: at 100 concurrent requests the same pattern appears, and the database now has 200 connections (expensive on Postgres). Timeouts only convert a deadlock into errors.</p>`,
    mcq: { q: 'Why does REQUIRES_NEW risk a pool deadlock?', options: ['The outer transaction keeps its connection while the inner one needs another', 'It disables the pool', 'It runs the inner method in the same connection', 'It increases isolation level'], answer: 0, explain: 'Each in-flight request holds one connection and waits for a second; if all connections are held by waiting requests, none can proceed.' },
    hints: [
      `<p>Hint 1: count connections per request. How many does one request hold at the moment the audit call is made?</p>`,
      `<p>Hint 2: with N concurrent requests each holding 1 and waiting for 1 more, you need at least N+1 connections to guarantee progress. With pool P and N &gt;= P it deadlocks.</p>`,
      `<p>Hint 3: remedies: restructure so the audit is not nested (write it before the main transaction or after), make audit asynchronous through an event/outbox, bound concurrency (bulkhead) to below P, or use a separate small pool for audit.</p>`
    ],
    approach: `<p><b>Mechanism:</b> <code>placeOrder</code> opens T1 and holds connection A. <code>audit.record</code> with REQUIRES_NEW suspends T1 (it still holds A) and requests connection B. With pool size 10, once 10 requests hold their A connection, all pool slots are used and every request waits for a B that can only appear if someone finishes; nobody can. Waiting lasts until Hikari's connectionTimeout (30 s), then errors surface; meanwhile Tomcat threads pile up and the service looks frozen. Arithmetic: required connections = 2 x concurrent requests; guaranteed progress needs pool &gt;= concurrency + 1 for a nested pattern, but throughput safe sizing is much higher.</p>
      <p><b>Remedies:</b> (1) <b>Do not nest</b>: call the audit before starting T1, or after it ends (use a <code>TransactionTemplate</code> or a facade method that is not transactional); simplest and needs only one connection at a time. (2) <b>Asynchronous/outbox</b>: publish an audit event handled with its own connection on another thread, or write an outbox row in T1 and let a relay move it; decouples but is eventually consistent, and audit of failed attempts needs <code>AFTER_ROLLBACK</code> handling. (3) <b>Separate pool</b> (second DataSource) for audit, so audit never competes with business traffic; extra configuration. (4) <b>Bulkhead</b>: limit concurrent placeOrder calls to less than pool size/2 with a semaphore; protects the DB but adds queueing. Monitor <code>hikaricp.connections.pending</code> and alert on it.</p>`,
    complexity: `<p>Connection demand is 2 per request for the nested design versus 1 at a time for the sequential design, which doubles safe throughput for the same pool.</p>`,
    followUps: ['How do you reproduce the deadlock in a test?', 'Would virtual threads help? (They remove thread limits but not the connection limit.)']
  }));

  practice.push(mk({
    title: 'LazyInitializationException and N+1 in One Endpoint', level: 'Hard', tags: ['jpa', 'n+1', 'open-in-view', 'performance'], companies: ['Atlassian', 'Zalando', 'Stripe'],
    statement: `<p>A controller returns <code>List&lt;Customer&gt;</code> (entities) with a lazy <code>orders</code> collection. In dev it works; after setting <code>spring.jpa.open-in-view=false</code> it throws <code>LazyInitializationException</code>; with open-in-view on, the endpoint runs 1 + N queries and sometimes recurses infinitely in JSON. Diagnose all three symptoms and redesign the endpoint properly.</p>`,
    constraints: `Spring Boot 3.x, Hibernate 6, 5000 customers, response needs customer email and order count only.`,
    example: `<p>SQL log: ${H.c('r', '1 select customers + 5000 select orders')}. JSON: <code>customer &rarr; orders &rarr; customer &rarr; orders ...</code> overflows.</p>`,
    bruteWhy: `<p>Setting <code>FetchType.EAGER</code> everywhere removes the exception but makes every query load the full object graph, produces cartesian joins or N+1 at other places, and exposes internal fields in the API.</p>`,
    mcq: { q: 'What is the best way to return customer email and order count for 5000 customers?', options: ['A DTO projection query with GROUP BY, paginated', 'EAGER fetch of orders and return entities', 'Keep open-in-view and loop in the controller', 'Cache the entity list in a static field'], answer: 0, explain: 'A projection selects only needed columns in one SQL statement, avoids entities and lazy loading entirely, and pagination bounds memory.' },
    hints: [
      `<p>Hint 1: three symptoms, one root cause: the web layer touches lazy data and serialises entities. Separate them: what must the API return?</p>`,
      `<p>Hint 2: open-in-view keeps the session open while rendering JSON, which hides the problem and holds a DB connection through serialisation. Turning it off exposes the missing fetch.</p>`,
      `<p>Hint 3: design: service method in a read-only transaction, query returning an interface/record projection (email, count) with grouping and a Pageable, controller returns the DTO page.</p>`
    ],
    approach: `<p><b>Symptom 1 (exception):</b> with open-in-view off the persistence context closes when the service returns; the converter later touches <code>orders</code> on a detached entity. <b>Symptom 2 (N+1):</b> each lazy access issues a query; with open-in-view the session stays open so it silently works but runs 5001 queries. <b>Symptom 3 (recursion):</b> bidirectional entity relations serialised by Jackson loop forever; entities should never be the API model.</p>
      <p><b>Redesign:</b> keep <code>open-in-view=false</code>. Add a repository method <code>@Query("select c.email as email, count(o) as orderCount from Customer c left join c.orders o group by c.email")</code> returning an interface/record projection, with <code>Pageable</code> (and a count query or Slice). The service runs it in <code>@Transactional(readOnly = true)</code> and the controller returns <code>Page&lt;CustomerSummary&gt;</code>. If the entities are required, use <code>@EntityGraph</code> or a fetch join (but never a join fetch of a collection together with pagination: Hibernate paginates in memory) or <code>default_batch_fetch_size</code> to reduce N+1 to N/size+1.</p>
      <p><b>Verify:</b> a test using a statement counter asserts exactly 1 (or 2 with count) statements; check the response contains no entity fields. Result: one query, bounded memory, no lazy surprises, stable API.</p>`,
    complexity: `<p>Before: O(N) queries per request. After: 1-2 queries with an index on <code>orders.customer_id</code>; response size bounded by page size.</p>`,
    followUps: ['Why is join fetch of a collection with pagination dangerous?', 'When is an entity graph better than a projection?']
  }));

  practice.push(mk({
    title: 'Break a Circular Dependency Properly', level: 'Hard', tags: ['dependency injection', 'design', 'cycles'], companies: ['Thoughtworks', 'Atlassian', 'Uber'],
    statement: `<p>After upgrading to Boot 3 the app fails: <code>The dependencies of some of the beans in the application context form a cycle: orderService -> invoiceService -> orderService</code>. <code>OrderService.place()</code> calls <code>invoiceService.create()</code>, and <code>InvoiceService.regenerate()</code> calls <code>orderService.recalculate()</code>. Explain why constructor injection cannot solve it, list quick hacks and why they are risky, and redesign.</p>`,
    constraints: `Spring Boot 3.x (allow-circular-references defaults to false). Both services are @Transactional.`,
    example: `<p>${H.c('r', 'OrderService(InvoiceService) and InvoiceService(OrderService)')}: neither can be constructed first.</p>`,
    bruteWhy: `<p>Setting <code>spring.main.allow-circular-references=true</code> brings back early references to half-built objects, which interact badly with proxies (@Transactional) and hides a design flaw; <code>@Lazy</code> just defers the failure to first use.</p>`,
    mcq: { q: 'What is the most robust fix for a service cycle?', options: ['Extract the shared logic into a third component both depend on', 'Enable allow-circular-references', 'Switch both to field injection', 'Make one class final'], answer: 0, explain: 'Cycles usually mean two classes share a responsibility. A third class makes the dependency direction acyclic.' },
    hints: [
      `<p>Hint 1: a constructor needs its arguments to exist, so with two constructors that need each other nobody can be first.</p>`,
      `<p>Hint 2: quick escapes: setter or field injection with allowed cycles, <code>@Lazy</code> on one parameter, <code>ObjectProvider</code>. They work mechanically but keep the tangled design.</p>`,
      `<p>Hint 3: ask which logic is shared: recalculation of totals. Move <code>recalculate</code> into <code>PricingService</code> that both use, or let InvoiceService publish an event that OrderService handles.</p>`
    ],
    approach: `<p><b>Why it fails:</b> with constructor injection Spring must pass a fully constructed <code>InvoiceService</code> to <code>OrderService</code> and vice versa; the container detects the loop (<code>BeanCurrentlyInCreationException</code>) and, since Boot 2.6, refuses early references by default.</p>
      <p><b>Quick hacks and risks:</b> (1) <code>allow-circular-references=true</code> restores the three-level cache trick: a half-initialised, possibly un-proxied object is injected, so @Transactional/@Async may not apply to one side and the failure is subtle. (2) <code>@Lazy</code> injects a proxy resolved on first call: starts fine, but hides the cycle and can fail later. (3) <code>ObjectProvider</code>/<code>@Autowired</code> setter: same as above.</p>
      <p><b>Redesign:</b> find the shared concept. Both need "recalculate totals": extract <code>PricingService</code> (depends on repositories only). <code>OrderService</code> and <code>InvoiceService</code> both depend on it, giving a DAG: Order &rarr; Pricing, Invoice &rarr; Pricing, Order &rarr; Invoice. If the back-call is a reaction ("when an invoice is regenerated, recalculate"), publish a domain event (<code>InvoiceRegenerated</code>) with <code>ApplicationEventPublisher</code> and handle it in <code>OrderService</code> with <code>@TransactionalEventListener</code>; dependency now points one way. Add an architecture test (ArchUnit) forbidding package cycles.</p>`,
    complexity: `<p>Design-level fix with no runtime penalty; it also reduces transaction boundaries confusion and eases testing.</p>`,
    followUps: ['How can an ArchUnit test prevent cycles from returning?', 'What changes if one of the services must be in a different module?']
  }));

  practice.push({
    title: 'Build a Retry Proxy (@Retry in Plain Java)', level: 'Hard', tags: ['aop', 'dynamic proxy', 'resilience'], companies: ['Netflix', 'Amazon', 'Uber'],
    statement: `<p>Without Spring, implement a JDK dynamic proxy that retries calls to an interface up to <code>maxAttempts</code> times, but <b>only</b> for transient <code>IOException</code>s, with a small growing delay, and rethrows non-transient exceptions immediately. Show why a method calling another method on <code>this</code> would not be retried, and what must be unwrapped from reflection.</p>`,
    constraints: `Plain Java 21, no libraries. maxAttempts between 1 and 5.`,
    example: `<p>The API fails twice with ${H.c('y', 'IOException')} then succeeds: caller gets <code>paid 500 after 3 attempts</code>. An <code>IllegalArgumentException</code> is thrown to the caller at once.</p>`,
    brute: { why: `<p>Writing a retry loop around every call site duplicates code, forgets backoff, and often retries non-transient errors (bad input) that can never succeed, or wraps exceptions so callers cannot tell what happened.</p>` },
    mcq: { q: 'Why must the handler unwrap InvocationTargetException?', options: ['Reflection wraps the real exception; callers expect the original', 'It speeds up the call', 'Proxies cannot throw exceptions', 'Otherwise attempts are doubled'], answer: 0, explain: 'Method.invoke wraps exceptions from the target in InvocationTargetException; the real cause must be inspected for retry decisions and rethrown unchanged.' },
    hints: [
      `<p>Hint 1: a dynamic proxy needs an interface and an <code>InvocationHandler</code>; the handler decides what happens around <code>method.invoke(target, args)</code>.</p>`,
      `<p>Hint 2: loop over attempts; catch <code>InvocationTargetException</code>, look at <code>getCause()</code>; retry only when it is a transient type and attempts remain.</p>`,
      `<p>Hint 3: sleep with increasing delay between attempts, rethrow the last cause when attempts are exhausted, and remember that internal <code>this.call()</code> inside the target bypasses the proxy so is not retried.</p>`
    ],
    solution: {
      approach: `<p>Create an interface <code>PaymentApi</code> and a flaky implementation. The <code>RetryHandler</code> implements <code>InvocationHandler</code>: for attempt 1..max it calls <code>method.invoke(target, args)</code>. If that throws <code>InvocationTargetException</code>, take <code>getCause()</code>. If the cause is not an <code>IOException</code>, rethrow it immediately (non-transient). Otherwise log, sleep <code>10 * attempt</code> ms (linear backoff; production code uses exponential backoff with jitter) and try again. After the last attempt rethrow the last cause so the caller sees the real exception type.</p>
        <p>The proxy is created with <code>Proxy.newProxyInstance</code> and handed out instead of the raw object. Because retry lives in the proxy, a call made by the target to its own method via <code>this</code> is not retried (same self-invocation limit as Spring's <code>@Retryable</code>). Retried operations must be <b>idempotent</b>: retrying a charge without an idempotency key can charge twice.</p>`,
      code: `import java.io.IOException;
import java.lang.reflect.*;

interface PaymentApi {
    String charge(int cents) throws Exception;
}

class FlakyPaymentApi implements PaymentApi {
    private int calls = 0;
    public String charge(int cents) throws Exception {
        calls++;
        if (cents <= 0) throw new IllegalArgumentException("cents must be positive");   // not transient
        if (calls < 3) throw new IOException("timeout on call " + calls);                // transient
        return "paid " + cents + " after " + calls + " attempts";
    }
}

class RetryHandler implements InvocationHandler {
    private final Object target;
    private final int maxAttempts;

    RetryHandler(Object target, int maxAttempts) {
        if (maxAttempts < 1 || maxAttempts > 5) throw new IllegalArgumentException("maxAttempts 1..5");
        this.target = target;
        this.maxAttempts = maxAttempts;
    }

    @Override
    public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
        Throwable last = null;
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return method.invoke(target, args);                     // proceed()
            } catch (InvocationTargetException e) {
                last = e.getCause();                                      // unwrap the reflection wrapper
                if (!(last instanceof IOException)) throw last;           // only transient errors are retried
                System.out.println("attempt " + attempt + " failed: " + last.getMessage());
                if (attempt < maxAttempts) Thread.sleep(10L * attempt);   // simple backoff
            }
        }
        throw last;                                                       // attempts exhausted
    }
}

public class RetryDemo {
    public static void main(String[] args) throws Exception {
        PaymentApi api = (PaymentApi) Proxy.newProxyInstance(
            PaymentApi.class.getClassLoader(),
            new Class<?>[] { PaymentApi.class },
            new RetryHandler(new FlakyPaymentApi(), 3));
        System.out.println(api.charge(500));                              // succeeds on the 3rd attempt
        try {
            api.charge(-1);
        } catch (IllegalArgumentException e) {
            System.out.println("not retried: " + e.getMessage());
        }
    }
}`,
      complexity: `<p>At most maxAttempts calls and a bounded total delay (10+20 ms here). Memory O(1). Worst-case latency is the sum of attempt times plus sleeps, so combine with a timeout.</p>`,
      followUps: ['Add exponential backoff with jitter.', 'How would you make the retry decision configurable per method with an annotation?']
    }
  });

  // =====================================================================
  // QUIZ
  // =====================================================================
  quiz.push({ q: 'Which injection style lets you declare dependencies as <code>final</code> fields and unit test with plain <code>new</code>?', options: ['Constructor injection', 'Field injection with @Autowired', 'Setter injection only', 'Looking up beans from ApplicationContext'], answer: 0, explain: 'Constructor injection passes every dependency at creation time, so fields can be final and tests need no Spring.' });
  quiz.push({ q: 'A singleton <code>@Service</code> has a mutable field <code>private User current;</code> set per request. What is the most likely production symptom?', options: ['Users occasionally see other users\' data under concurrent load', 'Startup fails with a cycle error', 'The bean is created once per request', 'Nothing, Spring copies the bean per thread'], answer: 0, explain: 'One instance is shared by all request threads; concurrent requests overwrite the field.' });
  quiz.push({ q: 'A singleton receives a prototype-scoped bean via <code>@Autowired</code> field. How many prototype instances does the singleton use?', options: ['One, injected once at creation', 'A new one on every method call', 'One per thread', 'One per HTTP request'], answer: 0, explain: 'Injection happens once when the singleton is built. Use ObjectProvider or a scoped proxy to get a fresh instance per use.' });
  quiz.push({ q: 'At which lifecycle phase is the AOP proxy typically created?', options: ['In BeanPostProcessor after initialization', 'Before the constructor runs', 'During component scanning', 'At the first HTTP request'], answer: 0, explain: 'AbstractAutoProxyCreator is a BeanPostProcessor and wraps the bean in postProcessAfterInitialization.' });
  quiz.push({ q: 'You define your own <code>DataSource</code> bean. What happens to <code>DataSourceAutoConfiguration</code>?', options: ['It backs off thanks to @ConditionalOnMissingBean', 'It creates a second DataSource anyway', 'Startup fails with a duplicate bean error', 'It deletes your bean'], answer: 0, explain: 'Auto-configuration is guarded by conditions such as OnMissingBean so user-defined beans win.' });
  quiz.push({ q: 'Which tool shows why an auto-configuration did or did not apply?', options: ['--debug conditions evaluation report', 'jstack thread dump', 'The Maven dependency:tree only', 'Browser DevTools'], answer: 0, explain: 'Run with --debug or open /actuator/conditions: positive and negative matches list the evaluated conditions.' });
  quiz.push({ q: 'Inside <code>OrderService</code>, <code>checkout()</code> calls <code>this.audit()</code> which is annotated <code>@Transactional(REQUIRES_NEW)</code>. Result?', options: ['No new transaction: the call bypasses the proxy', 'A new transaction on a second connection', 'A compile error', 'The annotation is applied at runtime by AspectJ automatically'], answer: 0, explain: 'Self-invocation does not go through the Spring proxy, so no advice runs.' });
  quiz.push({ q: 'In the request flow, which component decides <i>which controller method</i> handles a request?', options: ['HandlerMapping', 'ViewResolver', 'HttpMessageConverter', 'HandlerExceptionResolver'], answer: 0, explain: 'DispatcherServlet asks HandlerMapping, which returns the handler (controller method) and its interceptors.' });
  quiz.push({ q: 'A <code>@RestController</code> method returns an <code>OrderDto</code>. Which component turns it into JSON?', options: ['An HttpMessageConverter (Jackson)', 'The ViewResolver', 'HandlerMapping', 'The servlet filter chain'], answer: 0, explain: '@RestController implies @ResponseBody, so the return value is written by a message converter chosen using the Accept header.' });
  quiz.push({ q: 'You post <code>Content-Type: text/plain</code> to an endpoint declared with <code>consumes = "application/json"</code>. Status?', options: ['415 Unsupported Media Type', '404 Not Found', '405 Method Not Allowed', '406 Not Acceptable'], answer: 0, explain: '415 means the request body type is not supported; 406 is about the Accept header of the response.' });
  quiz.push({ q: 'You load a managed entity inside a <code>@Transactional</code> method and call a setter. No <code>save()</code>. What happens at commit?', options: ['An UPDATE is sent thanks to dirty checking', 'Nothing, you must call save()', 'The change is rolled back', 'An exception is thrown'], answer: 0, explain: 'Managed entities are compared with their snapshots at flush; differences are written automatically.' });
  quiz.push({ q: 'You load 100 customers and access each one\'s lazy <code>orders</code>. About how many queries run?', options: ['101 (1 + N)', '2', '1', '100 exactly, since the first is cached'], answer: 0, explain: 'One query for the customers and one per customer for the lazy collection: the N+1 problem.' });
  quiz.push({ q: 'A <code>@Transactional</code> method throws a checked <code>IOException</code> (no rollbackFor). What does Spring do?', options: ['Commits and rethrows the exception', 'Rolls back', 'Suspends the transaction', 'Converts it into a RuntimeException'], answer: 0, explain: 'The default rule rolls back only for RuntimeException and Error.' });
  quiz.push({ q: 'Outer method (REQUIRED) calls a service method (REQUIRED) that throws a RuntimeException. The outer catches it and continues. What happens at the outer commit?', options: ['UnexpectedRollbackException: transaction marked rollback-only', 'Commit succeeds normally', 'The inner work alone is rolled back', 'The outer transaction restarts'], answer: 0, explain: 'The joined transaction is a single shared one; the inner proxy marked it rollback-only and the owner cannot commit.' });
  quiz.push({ q: 'Environment variable <code>SPRING_DATASOURCE_URL</code> and <code>application-prod.yml</code> both define the datasource URL. Which wins?', options: ['The environment variable', 'application-prod.yml', 'Whichever is read first alphabetically', 'application.yml'], answer: 0, explain: 'OS environment variables rank above config files in the property source order.' });
  quiz.push({ q: 'What is the safest way to give Spring a database password?', options: ['Placeholder like &#36;{DB_PASSWORD} filled from the environment or a secret manager', 'Write it in application.yml committed to Git', 'Hardcode it in a @Value default', 'Put it in application-prod.yml inside the jar'], answer: 0, explain: 'Secrets must stay out of source control and artifacts; the runtime platform provides them.' });

  // =====================================================================
  // INTERVIEW
  // =====================================================================
  interview.push({ level: 'B', q: 'What is Inversion of Control and Dependency Injection in Spring?',
    a: `<p><b>IoC</b> means your classes no longer create the objects they depend on with <code>new</code>; a container creates and manages them and decides when. <b>Dependency Injection</b> is the way the container hands those dependencies to a class: through the constructor, a setter or a field. In Spring the container is the <code>ApplicationContext</code>, the managed objects are called <b>beans</b>, and the wiring is done by type (plus <code>@Primary</code>/<code>@Qualifier</code> to disambiguate).</p><p>Benefits: loose coupling (depend on interfaces), easy swapping of implementations per environment, and easy testing with fakes.</p>`,
    followUps: ['Why prefer constructor injection?', 'What happens when two beans match the required type?'] });
  interview.push({ level: 'B', q: 'Constructor injection versus field injection: which do you use and why?',
    a: `<p>Constructor injection by default. Dependencies appear in the constructor signature, fields can be <code>final</code>, the object cannot exist half-built, and unit tests just call <code>new</code> with fakes instead of starting Spring or using reflection. A bloated constructor is also a visible hint that the class has too many responsibilities, and circular dependencies fail fast.</p><p>Field injection hides dependencies, forbids final fields and ties tests to the container. Setter injection is acceptable only for truly optional or reconfigurable dependencies.</p>`,
    followUps: ['Is @Autowired needed on a single constructor?', 'How do you inject all implementations of an interface?'] });
  interview.push({ level: 'B', q: 'List Spring bean scopes and when you would use each.',
    a: `<p><b>singleton</b> (default): one shared instance per container, for stateless services, repositories and pools. <b>prototype</b>: a new instance per request to the container, for stateful helpers; Spring does not call destroy callbacks. <b>request</b>, <b>session</b>, <b>application</b>, <b>websocket</b>: web-aware scopes, one instance per HTTP request, session and so on.</p><p>Key rule: singletons must be stateless (or hold only thread-safe, immutable data). Injecting a shorter-lived bean into a singleton needs <code>ObjectProvider</code> or a scoped proxy, otherwise the singleton keeps the first instance forever.</p>`,
    followUps: ['What is a scoped proxy?', 'Why does request scope fail on an async thread?'] });
  interview.push({ level: 'I', q: 'Walk me through the Spring bean lifecycle.',
    a: `<p>The container reads bean definitions; for each singleton it <b>instantiates</b> the object (constructor), <b>populates</b> dependencies (field and setter injection), calls <b>Aware</b> callbacks, runs <code>BeanPostProcessor.postProcessBeforeInitialization</code>, then init callbacks in order: <code>@PostConstruct</code>, <code>afterPropertiesSet()</code>, custom init method; then <code>postProcessAfterInitialization</code>, where AOP proxies (transactions, async, caching) are created. The bean is then ready. On shutdown: <code>@PreDestroy</code>, <code>DisposableBean.destroy()</code>, custom destroy method.</p><p>Prototype beans skip the destruction phase because the container does not track them.</p>`,
    followUps: ['Where does the proxy for @Transactional get created?', 'Where would you start and stop a background thread?'] });
  interview.push({ level: 'I', q: 'How does Spring Boot auto-configuration work?',
    a: `<p><code>@SpringBootApplication</code> includes <code>@EnableAutoConfiguration</code>, which imports every class listed in <code>META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports</code> across the classpath. Each is an ordinary configuration class whose beans are guarded by conditions: <code>@ConditionalOnClass</code> (library present), <code>@ConditionalOnMissingBean</code> (back off if the user defined one), <code>@ConditionalOnProperty</code> and so on. User configuration is processed first, so user beans win.</p><p>Starters are just dependency bundles that put the right libraries on the classpath. To debug, run with <code>--debug</code> to get the conditions evaluation report or use <code>/actuator/conditions</code>.</p>`,
    followUps: ['How would you write your own starter?', 'How do you disable one auto-configuration?'] });
  interview.push({ level: 'I', q: 'Explain Spring AOP. How is it implemented and what are its limits?',
    a: `<p>AOP separates cross-cutting concerns (logging, security, transactions, caching) from business code through <b>aspects</b>: pointcuts select method calls, advice (<code>@Before</code>, <code>@After</code>, <code>@Around</code>...) runs around them. Spring AOP is <b>proxy-based</b>: after a bean is created a JDK dynamic proxy (interface based) or a CGLIB subclass proxy replaces it in the container; calls from other beans go through the proxy, which runs the advice chain and then the real method.</p><p>Limits: only Spring beans, only method execution, and only calls that cross the proxy. Self-invocation, private/final/static methods and objects created with <code>new</code> are not advised. AspectJ weaving removes those limits at the cost of build complexity.</p>`,
    followUps: ['JDK proxy vs CGLIB?', 'Why does a self-invoked @Transactional method not start a transaction?'] });
  interview.push({ level: 'I', q: 'Describe what happens from the moment an HTTP request reaches a Spring Boot app until the JSON response is sent.',
    a: `<p>The embedded Tomcat thread parses the request and runs servlet <b>filters</b> (encoding, CORS, Spring Security). The request reaches the <b>DispatcherServlet</b>, which asks <b>HandlerMapping</b> for the controller method and its interceptors. Interceptors run <code>preHandle</code>. A <b>HandlerAdapter</b> resolves arguments (<code>@PathVariable</code>, <code>@RequestBody</code> via an HttpMessageConverter, <code>@Valid</code>) and invokes the controller. The return value goes through a <b>message converter</b> (Jackson) chosen by the <code>Accept</code> header for REST, or through a <b>ViewResolver</b> and template for server-rendered pages. Interceptors get <code>postHandle</code>/<code>afterCompletion</code>, the filters unwind, and the response is sent. Exceptions at any step are handled by <b>HandlerExceptionResolvers</b>, typically <code>@RestControllerAdvice</code>.</p>`,
    followUps: ['Filter vs interceptor?', 'What produces 404, 405, 415?'] });
  interview.push({ level: 'I', q: 'What is the difference between a servlet Filter, a HandlerInterceptor and an Aspect?',
    a: `<p>A <b>Filter</b> is part of the Servlet container: it wraps the whole request, including static files and error dispatches, and does not know which controller will run. Good for security, CORS, compression, request ids. A <b>HandlerInterceptor</b> is a Spring MVC concept called around the handler; it receives the handler object so it can inspect annotations of the controller method; it only sees requests reaching the DispatcherServlet. An <b>Aspect</b> wraps method calls on any Spring bean (service layer included) and knows nothing about HTTP.</p><p>Pick the narrowest tool that has the context you need: HTTP-level concerns in filters/interceptors, business-method concerns (transactions, timing, audit) in aspects.</p>`,
    followUps: ['Where does Spring Security sit?', 'In which order do they run for one request?'] });
  interview.push({ level: 'I', q: 'How does Spring Data JPA create a repository implementation from an interface?',
    a: `<p>At startup a repository factory creates a <b>JDK dynamic proxy</b> that implements your interface. Standard methods (<code>save</code>, <code>findById</code>) are delegated to <code>SimpleJpaRepository</code>, which uses the <code>EntityManager</code>. Query methods are parsed once: derived names like <code>findByEmailAndActiveTrue</code> are turned into JPQL/Criteria queries by a PartTree parser, while <code>@Query</code> uses your JPQL or native SQL. A typo in a derived name fails the application at startup.</p><p>The repository methods are transactional on their own (read-only at class level, writing for modifications), but a sequence of calls is only atomic if the service method has <code>@Transactional</code>.</p>`,
    followUps: ['What is a projection?', 'Why might save() trigger a SELECT first?'] });
  interview.push({ level: 'I', q: 'What is the persistence context and what is dirty checking?',
    a: `<p>The persistence context (the <code>EntityManager</code>'s first-level cache) holds managed entities for the duration of a transaction. Loading the same id twice returns the same instance without another SQL. When an entity is loaded Hibernate keeps a snapshot; at flush/commit it compares each managed entity with its snapshot and issues UPDATE statements only for the changed ones. That is <b>dirty checking</b>: inside a transaction you do not need to call <code>save()</code> to update.</p><p>After the transaction the entity is <b>detached</b>: changes are no longer tracked, and touching uninitialised lazy associations throws <code>LazyInitializationException</code>.</p>`,
    followUps: ['What is flush vs commit?', 'What does open-in-view do and why is it controversial?'] });
  interview.push({ level: 'A', q: 'What is the N+1 query problem and how do you fix it?',
    a: `<p>One query loads N parent rows, then accessing a lazy association on each parent triggers N more queries: 1 + N round-trips. It is invisible in the Java code and shows up as slow endpoints that scale with data size. Detect it with the SQL log, Hibernate statistics or a test that counts statements.</p><p>Fixes: <code>join fetch</code> in JPQL, <code>@EntityGraph</code>, batch fetching (<code>hibernate.default_batch_fetch_size</code>) turning N into N/size, or DTO projections selecting exactly the needed columns. Caveats: fetching a collection together with pagination makes Hibernate paginate in memory, and fetching multiple bags causes cartesian products. Avoid "fixing" by switching everything to EAGER.</p>`,
    followUps: ['Why is EAGER not a fix?', 'How would you assert query counts in CI?'] });
  interview.push({ level: 'A', q: 'Explain @Transactional propagation REQUIRED vs REQUIRES_NEW, and give a use case for each.',
    a: `<p><b>REQUIRED</b> (default) joins an existing transaction or starts one; all participants share one connection and commit or roll back together. Use for normal business operations that must be atomic. <b>REQUIRES_NEW</b> suspends the current transaction and starts an independent one with its own connection that commits or rolls back on its own. Use for work that must survive the outer failure, e.g. an audit log of attempts or a counter.</p><p>Trade-offs: REQUIRES_NEW needs a second connection while the first is still held (risk of pool exhaustion), and it only works when called through the proxy of another bean. Other modes: SUPPORTS, NOT_SUPPORTED, MANDATORY, NEVER, NESTED (savepoints).</p>`,
    followUps: ['What happens to a joined transaction when the inner method throws and the outer catches?', 'How do you size a pool when REQUIRES_NEW is used?'] });
  interview.push({ level: 'A', q: 'List common reasons why @Transactional does not work.',
    a: `<p>1) <b>Self-invocation</b>: calling the method with <code>this</code> from the same class bypasses the proxy. 2) The method is <b>private</b> (or final/static, or the class is final with CGLIB). 3) The object is not a Spring bean (created with <code>new</code>). 4) A <b>checked exception</b> is thrown: default rollback is only for RuntimeException/Error. 5) The exception is <b>caught and swallowed</b> inside the method. 6) The work runs on <b>another thread</b> (@Async, parallel streams): transactions are thread-bound. 7) The transaction manager or <code>@EnableTransactionManagement</code> is missing, or the annotation is on an interface with a proxy mode that ignores it. 8) The wrong propagation or a rollback-only marker from an inner call.</p><p>Diagnose with <code>logging.level.org.springframework.transaction=TRACE</code>, which shows when transactions begin and end.</p>`,
    followUps: ['How do you verify in a test that a method is transactional?', 'What does readOnly=true do?'] });
  interview.push({ level: 'A', q: 'How do you manage configuration and secrets across environments in Spring Boot?',
    a: `<p>Build one artifact and configure at runtime. Defaults live in <code>application.yml</code>; environment differences in profile-specific documents (<code>application-prod.yml</code> or <code>on-profile</code> sections) selected with <code>SPRING_PROFILES_ACTIVE</code>. Property precedence puts command-line args and environment variables above files, so the platform can override anything without a rebuild. Secrets are never committed: files contain placeholders such as <code>&#36;{DB_PASSWORD}</code> without a default so the app fails fast, and the values come from Kubernetes Secrets (env vars or mounted files via <code>configtree:</code>) or a secrets manager/Vault.</p><p>Group settings with <code>@ConfigurationProperties</code> and <code>@Validated</code>, keep a few profiles, avoid <code>if (profile)</code> in business code, secure and sanitise Actuator <code>/env</code>, and rotate secrets regularly.</p>`,
    followUps: ['@Value vs @ConfigurationProperties?', 'How would you rotate a database password without downtime?'] });
  interview.push({ level: 'E', q: 'A Spring Boot service freezes under load: threads wait for DB connections. How do you investigate and what design flaws do you look for?',
    a: `<p>Check metrics first: <code>hikaricp.connections.active/pending/timeout</code>, Tomcat busy threads, and a thread dump (<code>jstack</code>): are threads parked in <code>HikariPool.getConnection</code>? Then look at the database for <code>idle in transaction</code> sessions and lock waits.</p><p>Typical design flaws: transactions that span slow remote calls (connection held while waiting on HTTP); <b>nested REQUIRES_NEW</b> needing two connections per request so a pool of N deadlocks at N concurrent requests; open-in-view holding connections during JSON rendering; N+1 patterns multiplying round trips; pool too small or too big (a huge pool just moves the bottleneck to the database); missing timeouts. Fixes: shorten and narrow transactions, do remote calls outside them, remove nesting or use events/outbox, set timeouts and bulkheads, size the pool using measured query time and database capacity, and alert on pending connections.</p>`,
    followUps: ['How would virtual threads change the picture?', 'How do you set a safe pool size?'] });
  interview.push({ level: 'E', q: 'How would you design the layering and boundaries of a Spring Boot service to avoid circular dependencies and transaction confusion?',
    a: `<p>Keep dependencies flowing one way: controller &rarr; application service (use case, owns the <code>@Transactional</code> boundary) &rarr; domain/repositories. Services depend on interfaces; no service calls a controller; repositories contain no business rules. When two services need each other, extract the shared concept into a third component or communicate by domain events (<code>@TransactionalEventListener</code>) so the dependency graph is acyclic. Enforce with ArchUnit tests.</p><p>Transactions sit on public use-case methods, are short, contain no remote calls, and cross-bean calls are used where propagation matters (audit with REQUIRES_NEW lives in its own bean). Controllers return DTOs, not entities, and open-in-view is off, so lazy loading problems surface in tests. Constructor injection everywhere makes cycles fail at startup and keeps unit tests free of Spring.</p>`,
    followUps: ['Where do you place validation: controller, service or domain?', 'How would you test the transaction boundaries?'] });

  // =====================================================================
  // REGISTER
  // =====================================================================
  registerModule({
    id: 'be06',
    title: 'Spring Boot Deep Dive',
    intro: `<p>Spring Boot looks like magic until something breaks: a bean that is null, a <code>@Transactional</code> that does nothing, a user who sees someone else's data, a 404 that makes no sense. This module opens the box. You will learn what the <b>container</b> really does (IoC and dependency injection), how beans are created, scoped and destroyed, how <b>auto-configuration</b> decides what to set up, how <b>proxies and AOP</b> power transactions, how <b>Spring MVC</b> turns a request into JSON, how <b>Spring Data JPA</b> manages entities, and how <b>profiles and configuration</b> let one jar run everywhere.</p>
      <p>Every Spring example is paired with a small <b>plain-Java model</b> that compiles (a mini DI container, a dynamic proxy with around-advice, a transaction manager, a mini DispatcherServlet), so you see the trick instead of memorising annotations.</p>`,
    goals: [
      'Explain IoC and DI, choose constructor injection, and resolve ambiguous beans with @Primary and @Qualifier',
      'Pick the right bean scope, spot the singleton-holds-state bug and walk through the full bean lifecycle',
      'Read a conditions report and write a custom auto-configuration that backs off correctly',
      'Explain how proxies implement AOP and @Transactional, and why self-invocation, private methods and checked exceptions break them',
      'Trace a request through DispatcherServlet, HandlerMapping, interceptors, controller and message converter, and map status codes to stages',
      'Use Spring Data JPA safely: persistence context, dirty checking, lazy loading and the N+1 problem',
      'Choose transaction propagation (REQUIRED vs REQUIRES_NEW) and manage profiles and secrets with property precedence'
    ],
    prereqs: `Backend 1-3 (HTTP basics, your first REST API, databases from code) and Java basics: interfaces, annotations, exceptions and generics.`,
    hours: 14,
    topics: topics, practice: practice, quiz: quiz, interview: interview
  });
})();
