(function () { var topics = [], practice = [], quiz = [], interview = [];

/* ============================ TOPIC 1: TEST PYRAMID ============================ */
topics.push({
  title: 'The Test Pyramid and the Four Kinds of Tests',
  analogy: `<p>Think of building a <b>car</b>. A good factory checks every single bolt on its own (fast, cheap, thousands of checks). Then it checks that the engine and gearbox work together once they are bolted up (slower). Then it checks the paper agreement between the supplier and the factory ("your part will always be 5 cm wide"). Finally, someone takes the finished car for a <b>test drive</b> on a real road (very slow, very costly, and sometimes the road is closed for reasons that have nothing to do with the car). You do thousands of bolt checks, a few dozen engine checks, and only a handful of test drives. That shape - wide at the bottom, narrow at the top - is the <b>test pyramid</b>.</p>`,
  explain: `<p><b>Why we test at all.</b> Tests are a safety net. They let you change code on Friday afternoon without fear. A test suite is only useful if it is <b>fast</b> (you run it often), <b>trustworthy</b> (a red test means a real bug), and <b>cheap to keep</b> (small refactors do not break 200 tests).</p>
  <p>🟢 <b>The four kinds of tests</b>, from small to big:</p>
  ${H.table(['Kind', 'What it checks', 'Real things used?', 'Speed per test', 'Who writes it'], [
    ['<b>Unit</b>', 'One class or function in isolation (a pricing rule, a validator)', 'None. Collaborators are replaced by fakes/stubs', '1-10 ms', 'Developer, every day'],
    ['<b>Integration</b>', 'Your code + one real dependency (JPA + a real Postgres, Kafka producer + a real broker)', 'Yes, one real piece', '100 ms - 2 s', 'Developer'],
    ['<b>Contract</b>', 'The "shape" of messages between two services (fields, types, status codes)', 'No network between services; each side tested alone against a shared contract file', '50-300 ms', 'Consumer team writes, provider team verifies'],
    ['<b>End-to-end (E2E)</b>', 'A full user journey through the whole deployed system (browser or API client)', 'Everything', '5-60 s', 'QA / platform team, kept very few']
  ])}
  <p>🔵 <b>The pyramid rule:</b> many unit tests, fewer integration tests, very few E2E tests. Why? Because each step up the pyramid gets <b>slower</b>, <b>flakier</b> (fails for random reasons: network, timing, shared data), and <b>harder to debug</b> (a red E2E test tells you "something is broken somewhere"; a red unit test tells you "line 42 of PricingService is broken").</p>
  <p><b>Two popular variations:</b></p>
  <ul>
    <li><b>Test trophy</b> (Kent C. Dodds): the middle is fat. Lots of integration tests, because for web apps they give the best confidence per minute.</li>
    <li><b>Testing honeycomb / diamond</b> (Spotify, for microservices): few unit tests for pure plumbing, many <i>integrated</i> tests of one service with its real database, few E2E. Contract tests guard the boundaries.</li>
  </ul>
  <p>🔴 <b>The anti-pattern: the ice-cream cone.</b> Few unit tests, a thick layer of manual and E2E tests on top. Feedback takes hours, the suite is flaky, and everyone starts ignoring red builds. If your CI takes 90 minutes, check the shape of your suite first.</p>
  <p><b>What a good test looks like - Arrange, Act, Assert (AAA).</b> Arrange the data, act by calling the code once, assert on the result. One reason to fail per test. A name that reads like a sentence: <code>bulkOrderOfTenGetsTenPercentOff</code>.</p>
  <p><b>Do not test the framework.</b> You do not need a test proving that <code>@NotNull</code> works. You do need one proving that <i>your</i> rule "an order needs at least one item" works.</p>`,
  clues: [
    '"Our CI takes 90 minutes and half the failures are random" -> suite shape is an ice-cream cone; push checks down the pyramid',
    '"How would you test this service?" -> answer by layers: unit for rules, integration for DB/queue, contract for service boundaries, a few E2E for critical journeys',
    '"We deploy 20 microservices independently" -> contract tests (Pact) instead of one giant E2E environment',
    '"Which tests should block the pull request?" -> unit + integration + contract (fast, deterministic); E2E smoke after deploy',
    '"The test passes alone but fails with the others" -> shared state/ordering problem; tests must be independent',
    '"100% coverage but bugs still escape" -> coverage measures lines run, not behaviour verified; look at assertions and mutation testing'
  ],
  code: [
    { lang: 'java', check: false, title: 'JUnit 5: one unit test, one slice test, one full-stack test (Spring Boot)', code: `// 1) UNIT test - plain JUnit, no Spring, runs in milliseconds
class PricingServiceTest {
    @Test
    void bulkOrderOfTenGetsTenPercentOff() {
        PricingService service = new PricingService(new InMemoryPriceRepository());
        long total = service.priceFor("SKU-1", 10);   // unit price 1000 cents
        assertEquals(9000, total);                    // 10 * 1000 - 10%
    }
}

// 2) SLICE / integration test - only the web layer is started, the service is mocked
@WebMvcTest(OrderController.class)
class OrderControllerTest {
    @Autowired MockMvc mvc;
    @MockBean PlaceOrderUseCase placeOrder;

    @Test
    void returns201WhenOrderIsAccepted() throws Exception {
        when(placeOrder.place(any())).thenReturn("order-42");
        mvc.perform(post("/orders").contentType("application/json")
                .content("{\\"sku\\":\\"SKU-1\\",\\"qty\\":2}"))
           .andExpect(status().isCreated())
           .andExpect(header().string("Location", "/orders/order-42"));
    }
}

// 3) FULL-STACK test - whole Spring context + real HTTP port (use sparingly)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class OrderJourneySmokeTest {
    @Autowired TestRestTemplate rest;

    @Test
    void customerCanPlaceAndFetchAnOrder() {
        var created = rest.postForEntity("/orders", Map.of("sku", "SKU-1", "qty", 2), Void.class);
        assertEquals(HttpStatus.CREATED, created.getStatusCode());
        var fetched = rest.getForEntity(created.getHeaders().getLocation(), String.class);
        assertEquals(HttpStatus.OK, fetched.getStatusCode());
    }
}` },
    { lang: 'java', title: 'Arrange-Act-Assert without any framework (compiles and runs)', code: `class AaaDemo {
    // A tiny rule to test: orders over 5000 cents ship free.
    static boolean shipsFree(long totalCents) { return totalCents > 5000; }

    static void check(boolean condition, String name) {
        System.out.println((condition ? "PASS " : "FAIL ") + name);
    }

    public static void main(String[] args) {
        // Arrange
        long justOver = 5001, exactly = 5000;
        // Act
        boolean over = shipsFree(justOver);
        boolean edge = shipsFree(exactly);
        // Assert - boundaries are where bugs live
        check(over, "5001 cents ships free");
        check(!edge, "exactly 5000 cents does NOT ship free");
    }
}` }
  ],
  codeTitle: ['Three Spring test styles', 'AAA in plain Java'],
  viz: {
    title: 'Test pyramid: count vs speed vs cost',
    input: '700 150 40 10',
    inputLabel: 'Number of tests (unit integration contract e2e)',
    gen: function (input) {
      var n = String(input).trim().split(/[\s,]+/).map(Number);
      if (n.length !== 4 || n.some(function (x) { return isNaN(x) || x < 0 || x > 5000; })) throw new Error('Enter 4 numbers between 0 and 5000: unit integration contract e2e');
      var names = ['Unit', 'Integration', 'Contract', 'E2E'];
      var ms = [5, 400, 150, 8000], flaky = [0.1, 2, 1, 8];
      var secs = n.map(function (c, i) { return Math.round(c * ms[i] / 1000); });
      var frames = [];
      frames.push({ narr: 'The pyramid says: <b>lots of cheap tests at the bottom, a few expensive ones at the top</b>. Here is your suite - the bars are how many tests of each kind you have.', parts: [
        { type: 'bars', label: 'Number of tests', values: n.slice(), idxLabels: names, texts: n.map(String), hl: { 0: 'ok', 1: 'win', 2: 'sel', 3: 'cur' } }
      ] });
      frames.push({ narr: 'Now look at <b>how long ONE test takes</b> (typical milliseconds). A unit test is ~5 ms. One E2E test is ~8 seconds - over a thousand times slower. The bars are on very different scales, that is the whole point.', parts: [
        { type: 'bars', label: 'Typical ms per single test', values: ms.slice(), idxLabels: names, texts: ms.map(function (x) { return x + ' ms'; }), hl: { 3: 'bad' } },
        { type: 'text', html: 'Fast feedback means developers run tests <b>before</b> they commit.' }
      ] });
      var worst = 0; secs.forEach(function (s, i) { if (s > secs[worst]) worst = i; });
      var hl3 = {}; hl3[worst] = 'bad';
      frames.push({ narr: 'Multiply: count x time. Total seconds per kind: <b>' + secs.join(' / ') + '</b>. The most expensive layer in your suite is <b>' + names[worst] + '</b> (' + secs[worst] + ' s).', parts: [
        { type: 'bars', label: 'Total seconds spent in each layer', values: secs.slice(), idxLabels: names, texts: secs.map(function (x) { return x + ' s'; }), hl: hl3 }
      ] });
      frames.push({ narr: 'Next, <b>flakiness</b>: the share of runs that fail for no real reason. More moving parts (browser, network, shared data) means more random failures. A flaky test teaches the team to ignore red builds.', parts: [
        { type: 'bars', label: 'Typical flaky rate (% of runs)', values: flaky.slice(), idxLabels: names, texts: flaky.map(function (x) { return x + '%'; }), hl: { 3: 'bad', 1: 'cur' } }
      ] });
      var shape = n[3] > n[0] ? 'ICE-CREAM CONE (more E2E than unit)' : (n[1] > n[0] ? 'TROPHY / DIAMOND (integration-heavy)' : 'PYRAMID');
      var bad = n[3] > n[0] || n[3] > n[1];
      frames.push({ narr: 'Verdict for your numbers: <b>' + shape + '</b>. ' + (bad ? '<span class="c-r">Too many E2E tests - push their checks down into unit/integration/contract tests.</span>' : '<span class="c-g">Healthy: the cheap layers carry most of the weight.</span>'), parts: [
        { type: 'bars', label: 'Your suite', values: n.slice(), idxLabels: names, texts: n.map(String), hl: bad ? { 3: 'bad', 0: 'cur' } : { 0: 'ok', 1: 'ok' } },
        { type: 'table', label: 'Rule of thumb', columns: ['Layer', 'Share of suite', 'Runs when'], rows: [['Unit', '70%', 'every save / every commit'], ['Integration', '20%', 'every pull request'], ['Contract', '8%', 'every pull request + before deploy'], ['E2E', '2%', 'after deploy (smoke)']] }
      ] });
      frames.push({ narr: 'Takeaway: <b>test each rule at the lowest level that can catch it</b>. A discount rule belongs in a unit test; "the orders table accepts this row" in an integration test; "the Payment service still returns <code>status</code>" in a contract test; "the checkout page works" in one E2E smoke test.', parts: [
        { type: 'text', html: '<b>Lowest level that can catch the bug wins.</b>' }
      ] });
      return frames;
    }
  },
  examples: [
    { title: 'Pick the layer: a quick decision table', html: `<p>For every new check, ask "what is the cheapest test that would still catch this bug?"</p>
      ${H.table(['Scenario', 'Best test', 'Why not higher/lower?'], [
        ['Coupon gives 10% off only when the cart is over 50', '<span class="c-g">Unit</span>', 'Pure logic; no I/O needed'],
        ['Repository query with a JOIN and a custom <code>ORDER BY</code>', '<span class="c-b">Integration (real DB)</span>', 'An in-memory fake would not run real SQL'],
        ['Mobile app reads <code>order.totalCents</code> from the Orders API', '<span class="c-p">Contract</span>', 'Catches a renamed field without running both systems'],
        ['User can sign up, pay and see a receipt in the browser', '<span class="c-y">E2E (one smoke test)</span>', 'Only the full path proves wiring and config']
      ])}` },
    { title: 'Ice-cream cone: how it happens and how to fix it', html: `<p>A team with no unit tests asks QA to automate everything through the browser. After a year they have 600 Selenium tests, 70 minutes of CI and 12% flaky runs. <b>Fix plan:</b> (1) freeze new E2E tests; (2) for every E2E, ask which rule it really checks and re-write that as a unit or integration test; (3) keep 5-10 E2E "golden path" smoke tests; (4) add contract tests where services meet; (5) track suite time and flaky rate on a dashboard.</p>` },
    { title: 'A flaky test caused by the clock', html: `<p>Test: <code>assertEquals("Good morning", greeter.greet())</code>. It passes at 9 am and fails at 3 pm because the code calls <code>LocalTime.now()</code>. <b>Cure:</b> pass a <code>Clock</code> into the class. In production use <code>Clock.systemUTC()</code>; in the test use <code>Clock.fixed(...)</code>. Same idea for random numbers, UUIDs, and "current user". Anything non-deterministic must be an <i>input</i>.</p>`,
      code: { lang: 'java', code: `class Greeter {
    private final Clock clock;
    Greeter(Clock clock) { this.clock = clock; }

    String greet() {
        int hour = LocalTime.now(clock).getHour();
        return hour < 12 ? "Good morning" : "Good afternoon";
    }

    public static void main(String[] args) {
        Clock nineAm = Clock.fixed(Instant.parse("2026-01-05T09:00:00Z"), ZoneOffset.UTC);
        Clock threePm = Clock.fixed(Instant.parse("2026-01-05T15:00:00Z"), ZoneOffset.UTC);
        System.out.println(new Greeter(nineAm).greet());   // always Good morning
        System.out.println(new Greeter(threePm).greet());  // always Good afternoon
    }
}` } },
    { title: 'Microservices: the honeycomb in numbers', html: `<p>Service <b>Orders</b> has 3 inbound integrations (web app, mobile app, Billing) and 2 outbound (Postgres, Kafka). A sensible mix: ~120 unit tests for rules, ~30 integration tests using Testcontainers (repository, Kafka publisher), ~6 consumer contract tests plus provider verification, 3 E2E smoke tests owned by the platform team. Total runtime under 4 minutes on a laptop.</p>` }
  ],
  deepDive: `<p><b>Why the pyramid is really about cost of feedback.</b> A bug found in a unit test costs seconds; the same bug found by an E2E test costs minutes of waiting plus a long debugging session ("is it the browser? the data? the network?"); found in production it costs money and reputation. The pyramid is an <i>economic</i> argument, not a religion.</p>
  <p><b>Definitions are fuzzy - agree on them as a team.</b> Some people call anything that touches Spring a "unit test". Martin Fowler separates <i>solitary</i> unit tests (every collaborator replaced) from <i>sociable</i> ones (real collaborators from the same module are used, only I/O boundaries are replaced). Sociable tests survive refactoring better, because they do not know which classes you split the logic into.</p>
  <p><b>Test the behaviour, not the implementation.</b> Tests that check "method X called method Y twice" break whenever you refactor, even if behaviour is unchanged. Prefer asserting on outputs and visible state; verify interactions only when the interaction <i>is</i> the behaviour (send exactly one email).</p>
  <p><b>Flaky test hygiene.</b> Causes: shared database rows, test order dependence, real clocks, random ports, <code>Thread.sleep</code> instead of waiting for a condition (use Awaitility), parallelism, external services. Policy: quarantine a flaky test within a day, fix or delete within a week. A suite that cries wolf is worse than no suite.</p>
  <p><b>Coverage vs mutation testing.</b> Line coverage only tells you code ran. <b>Mutation testing</b> (PIT for Java) changes your code ("&gt;" to "&gt;=") and checks that some test fails. Surviving mutants = weak assertions. Use coverage to find untested areas, not as a target to hit.</p>
  <p><b>The test pyramid for the whole delivery pipeline.</b> Commit stage (unit + fast integration, under 10 min) -> acceptance stage (contract + integration with containers) -> post-deploy smoke -> production monitoring (synthetic checks, canaries). "Testing in production" is a legitimate last layer when combined with feature flags and fast rollback.</p>
  <p><b>Non-functional tests</b> sit beside the pyramid: performance/load (Gatling, k6), security (SAST, dependency scans, DAST), resilience (chaos experiments), accessibility. They run on a schedule or before release, not on every commit.</p>`,
  aiEra: `<p><b>What AI changes:</b> AI assistants can generate dozens of unit tests in seconds, so the <i>cost</i> of writing tests has dropped sharply. The scarce skill is now deciding <b>what to test and at which layer</b>, and judging whether a generated test really protects behaviour.</p>
  <p><b>Use AI as a partner:</b> paste a class and ask <code>List the behaviours and edge cases of this class as test names only, do not write the code yet</code>. Review the list, then ask for the tests. Ask <code>Which of these tests would break if I only refactored?</code> to find brittle tests.</p>
  <p><b>Where AI goes wrong:</b> it loves tests that mirror the implementation (mock everything, assert each call), tests with no real assertion, or tests that are "green because they test the mock". It also tends to produce too many E2E-style tests with sleeps. It may invent API methods that do not exist.</p>
  <p><b>What you must still own:</b> the shape of the suite (pyramid), the definition of "done", the rule that a generated test must <b>fail first</b> when you break the code on purpose (run it against a deliberate bug), and deleting tests that only restate the code. Treat AI-written tests as a junior colleague's pull request: read every assertion.</p>`,
  problems: [
    {
      title: 'Choose the Right Test Type for Each Scenario',
      level: 'Medium', tags: ['test pyramid', 'strategy'], companies: ['Thoughtworks', 'Atlassian'],
      statement: `<p>You are reviewing the test plan of a "Ride Receipts" service (Spring Boot + Postgres + Kafka). For each scenario below choose <b>Unit / Integration / Contract / E2E</b> and justify it in one sentence:</p>
        <ol>
          <li>Fare = base + distance x rate, minimum fare applies, surge multiplier is capped at 3x.</li>
          <li>A native query that returns the 10 latest receipts per rider using a window function.</li>
          <li>The Payments team renames <code>amountCents</code> to <code>amount_minor</code> in their <code>/payments/{id}</code> response.</li>
          <li>A rider requests a trip, pays, and the receipt email appears in a real inbox sandbox.</li>
          <li>The receipt publisher must write the Kafka message with the key <code>riderId</code> so ordering is kept per rider.</li>
          <li>Controller returns 400 with a problem-details body when <code>currency</code> is missing.</li>
        </ol>`,
      constraints: `One primary type per scenario; at most 2 scenarios may be E2E. Explain what you would NOT use and why.`,
      example: `<p>Scenario: "A 10% bulk discount applies at 10 or more items".</p><p>Answer: ${H.c('g', 'Unit')} - pure arithmetic on in-memory objects; runs in 2 ms, no I/O. Not E2E: a browser test would take 10 s to check a rule that a unit test checks in 2 ms.</p>`,
      brute: { why: `<p>"Test everything through the browser (E2E)" - every check, even a rounding rule, drives a full stack. Suite takes hours, fails randomly, and a red test does not say which rule broke. The wasted work is booting the whole system to check one line of arithmetic.</p>` },
      mcq: { q: 'The Payments team renames a JSON field and your Orders service crashes only in production. Which test type would have caught it BEFORE deploy cheaply?', options: ['A unit test of the Orders service with mocks', 'A consumer-driven contract test verified by the Payments pipeline', 'More manual testing', 'Higher line coverage'], answer: 1, explain: 'The consumer publishes the exact fields it relies on; the provider build verifies it and fails when a rename would break the consumer. A unit test with a mock keeps passing because the mock still returns the old field.' },
      hints: [
        `<p>Ask for each item: what is the <b>cheapest</b> test that would still fail if this breaks? Pure logic needs no database; SQL needs a real database.</p>`,
        `<p>If the risk lives <b>between two services</b> (field names, status codes), that is the contract test's job; a unit test with a mock cannot see it.</p>`,
        `<p>Recipe: classify as (a) pure rule -> unit, (b) one real dependency -> integration, (c) boundary shape -> contract, (d) whole user journey -> E2E. Keep E2E to the one money-path story.</p>`
      ],
      solution: {
        approach: `<p><b>1. Fare calculation - Unit.</b> It is pure arithmetic with boundaries (minimum fare, 3x cap); write table-driven tests with edge values (just below/at/above the cap). No I/O, 1-2 ms each.</p>
          <p><b>2. Window-function query - Integration with a real Postgres (Testcontainers).</b> An in-memory fake or H2 would not run Postgres syntax, so the test would prove nothing about the real SQL. Insert a few receipts, call the repository, assert order and limit.</p>
          <p><b>3. Field rename in Payments - Contract.</b> Orders (consumer) records "I read <code>amountCents</code>" in a Pact file; Payments (provider) verifies it in its own build, so the rename fails <i>their</i> pipeline before release. Not unit (mock hides it), not E2E (too late and too slow).</p>
          <p><b>4. Rider requests, pays, gets an email - E2E (one smoke test).</b> It is the critical money path and the only thing that checks real wiring, config and credentials. Keep exactly one or two of these.</p>
          <p><b>5. Kafka key = riderId - Integration</b> using a Kafka Testcontainer (or an embedded broker): publish and read back the record, assert the key and partition stability. A mock producer would only prove you called <code>send</code>.</p>
          <p><b>6. 400 with problem-details - Slice test (<code>@WebMvcTest</code>), a light integration test.</b> It starts only the web layer, mocks the use case, and proves the validation and error mapping. Cheaper than a full-stack test and more realistic than calling the method directly.</p>
          <p><b>Summary:</b> 1 unit, 1 integration-DB, 1 contract, 1 E2E, 1 integration-Kafka, 1 slice. Only one E2E - the rest are cheaper and pinpoint failures.</p>`,
        complexity: `<p>Not an algorithm: judged by feedback time. Expected suite cost: units in milliseconds, integration in seconds, contract in hundreds of ms, one E2E in tens of seconds.</p>`,
        followUps: ['What would make you add a second E2E test?', 'How do you stop the E2E suite from growing again?']
      }
    }
  ]
});

/* ============================ TOPIC 2: TEST DOUBLES / MOCKING ============================ */
topics.push({
  title: 'Unit Tests and Test Doubles: Dummy, Stub, Spy, Mock, Fake',
  analogy: `<p>A <b>film set</b> uses props instead of the real thing. A <b>dummy</b> is a cardboard phone someone holds but never dials. A <b>stub</b> is a phone that always says "hello" when you pick it up. A <b>spy</b> is a phone with a tape recorder - after the scene you can play back who called. A <b>mock</b> is a phone that knows the script: if the actor does not dial exactly the right number, the director shouts "cut!". A <b>fake</b> is a working toy phone - it really connects two toy handsets, just not to the real phone network. In tests we replace real collaborators (database, email, payment gateway) with these stand-ins so the thing under test can be checked fast and alone.</p>`,
  explain: `<p><b>Why we need doubles.</b> A unit test must be fast and deterministic. If your <code>SignupService</code> talks to a real SMTP server, the test is slow, can fail when the network blips, and sends real emails. So we hand the service a <i>stand-in</i> that has the same interface. That is called a <b>test double</b> (like a stunt double).</p>
  <p>🟢 <b>The five kinds</b> (Gerard Meszaros' vocabulary, still the standard):</p>
  ${H.table(['Double', 'What it does', 'What you check', 'Example'], [
    ['<b>Dummy</b>', 'Fills a parameter, never really used', 'Nothing (it blows up if touched)', 'A <code>Mailer</code> passed in a test about duplicate emails'],
    ['<b>Stub</b>', 'Returns canned answers', 'The result of the code under test', '<code>userStore.exists(x)</code> always returns true'],
    ['<b>Spy</b>', 'A real or stub object that also records calls', 'What was called, afterwards', 'List of emails "sent"'],
    ['<b>Mock</b>', 'Pre-programmed with expectations, fails if they are not met', 'Interactions (called once, with these args)', 'Mockito <code>verify(mailer).send(...)</code>'],
    ['<b>Fake</b>', 'A working but simplified implementation', 'State, as with the real thing', 'In-memory repository backed by a HashMap']
  ])}
  <p>🔵 <b>State vs interaction testing.</b> With a <b>stub or fake</b> you run the code, then look at the <i>result or state</i> ("user is now saved"). With a <b>mock or spy</b> you look at <i>interactions</i> ("send was called once with 'Welcome!'"). Prefer state checks; they survive refactoring. Use interaction checks only when the call itself is the observable behaviour (sending an email, publishing an event, charging a card).</p>
  <p><b>How the service gets its double: constructor injection.</b> The class asks for its collaborators through the constructor and depends on an <b>interface</b>. In production you pass the real adapter; in a test you pass a double. No framework is required - this is plain Java.</p>
  <p><b>Popular tools.</b> Java: JUnit 5, AssertJ, Mockito, (WireMock for HTTP). JS: Jest/Vitest (<code>jest.fn()</code>, <code>vi.spyOn</code>). Python: pytest, <code>unittest.mock</code>. But remember the tool is optional - a hand-written fake is often clearer than a mock with ten <code>when(...)</code> lines.</p>
  <p>🔴 <b>Over-mocking smell.</b> If the test has more setup lines than assertions, and every refactor breaks it, you are testing wiring instead of behaviour. A fake repository usually gives a more honest test than a mock repository.</p>`,
  clues: [
    '"How do you test a class that sends emails / calls a payment API?" -> inject an interface, replace with spy/mock in unit test',
    '"What is the difference between a mock and a stub?" -> stub returns answers (state); mock verifies calls (behaviour)',
    '"Mock vs fake" -> fake has working logic (in-memory repo); mock only has scripted answers and expectations',
    '"Tests break whenever we refactor" -> over-mocking / testing implementation details; use fakes and assert on outcomes',
    '"Don\'t mock what you don\'t own" -> wrap third-party clients behind your own port and test the adapter with an integration test',
    '"Test passes but production fails" -> mock lied (does not behave like the real dependency); add an integration/contract test'
  ],
  code: [
    { lang: 'java', title: 'All five doubles written by hand for one interface (compiles and runs)', code: `import java.util.*;

interface Mailer { void send(String to, String subject); }
interface UserStore { boolean exists(String email); void save(String email); }

/** The class under test. It only knows interfaces, so any double can be injected. */
class SignupService {
    private final UserStore store;
    private final Mailer mailer;
    SignupService(UserStore store, Mailer mailer) { this.store = store; this.mailer = mailer; }

    boolean signUp(String email) {
        if (store.exists(email)) return false;          // duplicate: nothing else happens
        store.save(email);
        mailer.send(email, "Welcome!");
        return true;
    }
}

// DUMMY: required by the constructor, must never be touched in this test.
class DummyMailer implements Mailer {
    public void send(String to, String subject) { throw new AssertionError("dummy was used"); }
}
// STUB: returns a canned answer so we can force the "already exists" branch.
class StubUserStore implements UserStore {
    private final boolean answer;
    StubUserStore(boolean answer) { this.answer = answer; }
    public boolean exists(String email) { return answer; }
    public void save(String email) { }
}
// SPY: records what happened; we inspect it after the call.
class SpyMailer implements Mailer {
    final List<String> sent = new ArrayList<>();
    public void send(String to, String subject) { sent.add(to + ":" + subject); }
}
// MOCK (hand-written): knows what it expects and verifies it.
class MockMailer implements Mailer {
    private final String expectedTo; private int calls = 0;
    MockMailer(String expectedTo) { this.expectedTo = expectedTo; }
    public void send(String to, String subject) {
        if (!to.equals(expectedTo)) throw new AssertionError("unexpected recipient " + to);
        calls++;
    }
    void verifyCalledOnce() { if (calls != 1) throw new AssertionError("expected 1 call, got " + calls); }
}
// FAKE: a real, working, in-memory implementation.
class FakeUserStore implements UserStore {
    final Set<String> saved = new HashSet<>();
    public boolean exists(String email) { return saved.contains(email); }
    public void save(String email) { saved.add(email); }
}

class DoublesDemo {
    static void check(boolean ok, String name) { System.out.println((ok ? "PASS " : "FAIL ") + name); }

    public static void main(String[] args) {
        // Stub + dummy: duplicate email returns false and never sends mail.
        check(!new SignupService(new StubUserStore(true), new DummyMailer()).signUp("a@x.com"), "duplicate rejected (stub + dummy)");
        // Fake + spy: state in the fake, interaction in the spy.
        FakeUserStore store = new FakeUserStore(); SpyMailer spy = new SpyMailer();
        boolean created = new SignupService(store, spy).signUp("b@x.com");
        check(created && store.saved.contains("b@x.com"), "user saved in fake (state)");
        check(spy.sent.equals(List.of("b@x.com:Welcome!")), "welcome mail recorded by spy (interaction)");
        // Mock: strict expectation, verified at the end.
        MockMailer mock = new MockMailer("c@x.com");
        new SignupService(new FakeUserStore(), mock).signUp("c@x.com");
        mock.verifyCalledOnce();
        check(true, "mock verified exactly one call");
    }
}` },
    { lang: 'java', check: false, title: 'The same ideas with Mockito + AssertJ', code: `@ExtendWith(MockitoExtension.class)
class SignupServiceMockitoTest {
    @Mock UserStore store;        // Mockito creates a mock; by default it is also a stub (returns false/null/0)
    @Mock Mailer mailer;
    @InjectMocks SignupService service;

    @Test
    void sendsWelcomeMailForNewUser() {
        when(store.exists("a@x.com")).thenReturn(false);        // STUB behaviour
        boolean created = service.signUp("a@x.com");
        assertThat(created).isTrue();
        verify(mailer).send("a@x.com", "Welcome!");              // MOCK verification
        verify(store).save("a@x.com");
        verifyNoMoreInteractions(mailer);
    }

    @Test
    void capturesArgumentWhenYouNeedToInspectIt() {
        ArgumentCaptor<String> subject = ArgumentCaptor.forClass(String.class);
        service.signUp("b@x.com");
        verify(mailer).send(eq("b@x.com"), subject.capture());
        assertThat(subject.getValue()).startsWith("Welcome");
    }

    @Test
    void spyWrapsARealObject() {
        FakeUserStore real = new FakeUserStore();
        UserStore spyStore = spy(real);                          // SPY: real behaviour + call recording
        new SignupService(spyStore, mailer).signUp("c@x.com");
        verify(spyStore).save("c@x.com");
        assertThat(real.saved).contains("c@x.com");
    }
}` },
    { lang: 'js', run: true, title: 'A mini test runner with a spy (runnable JavaScript)', code: `// --- 1) A tiny test runner: test(name, fn) records PASS/FAIL. ---
var results = [];
function test(name, fn) {
  try { fn(); results.push({ name: name, ok: true }); }
  catch (e) { results.push({ name: name, ok: false, why: e.message }); }
}
function assertEqual(actual, expected, label) {
  var a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a !== e) throw new Error((label || 'assertEqual') + ': expected ' + e + ' but got ' + a);
}

// --- 2) A spy: wraps a function and records every call. ---
function spy(impl) {
  var s = function () {
    var args = Array.prototype.slice.call(arguments);
    s.calls.push(args);
    return impl ? impl.apply(null, args) : undefined;
  };
  s.calls = [];
  return s;
}

// --- 3) The code under test gets its collaborators as parameters (injection). ---
function makeSignup(store, mailer) {
  return function signUp(email) {
    if (store.exists(email)) return false;
    store.save(email);
    mailer.send(email, 'Welcome!');
    return true;
  };
}
// A fake store: real logic, in memory.
function fakeStore() {
  var saved = {};
  return { exists: function (e) { return !!saved[e]; }, save: function (e) { saved[e] = true; } };
}

// --- 4) The tests. ---
test('new user gets exactly one welcome mail', function () {
  var send = spy();
  var signUp = makeSignup(fakeStore(), { send: send });
  assertEqual(signUp('a@x.com'), true, 'return value');
  assertEqual(send.calls, [['a@x.com', 'Welcome!']], 'mail calls');
});
test('duplicate user sends nothing', function () {
  var send = spy();
  var signUp = makeSignup(fakeStore(), { send: send });
  signUp('a@x.com'); send.calls.length = 0;          // forget the first mail
  assertEqual(signUp('a@x.com'), false, 'second signup');
  assertEqual(send.calls.length, 0, 'mails after duplicate');
});

// --- 5) Prove the tests can fail: run the same check against a buggy version. ---
test('suite is red against a buggy service (mutation check)', function () {
  var buggy = function (email) { return true; };      // forgets to send mail
  var send = spy();
  var failed = false;
  try { buggy('z@x.com'); assertEqual(send.calls.length, 1, 'mail count'); } catch (e) { failed = true; }
  if (!failed) throw new Error('tests would not catch the bug!');
});

results.forEach(function (r) { console.log((r.ok ? 'PASS ' : 'FAIL ') + r.name + (r.ok ? '' : ' -> ' + r.why)); });
console.log(results.filter(function (r) { return r.ok; }).length + '/' + results.length + ' tests passed');` },
    { lang: 'python', run: true, title: 'The same mini runner + spy in Python (runnable)', code: `import json

results = []

def test(fn):
    """Decorator: run the test right away and record PASS/FAIL."""
    try:
        fn()
        results.append((fn.__name__, True, ""))
    except AssertionError as e:
        results.append((fn.__name__, False, str(e)))
    return fn

def assert_equal(actual, expected, label="assert_equal"):
    if actual != expected:
        raise AssertionError(f"{label}: expected {json.dumps(expected)} but got {json.dumps(actual)}")

class Spy:
    """Records every call; optionally forwards to a real implementation."""
    def __init__(self, impl=None):
        self.calls, self.impl = [], impl
    def __call__(self, *args):
        self.calls.append(list(args))
        return self.impl(*args) if self.impl else None

class FakeStore:
    def __init__(self): self.saved = set()
    def exists(self, email): return email in self.saved
    def save(self, email): self.saved.add(email)

def make_signup(store, mailer_send):
    def sign_up(email):
        if store.exists(email):
            return False
        store.save(email)
        mailer_send(email, "Welcome!")
        return True
    return sign_up

@test
def new_user_gets_one_welcome_mail():
    send = Spy()
    assert_equal(make_signup(FakeStore(), send)("a@x.com"), True, "return value")
    assert_equal(send.calls, [["a@x.com", "Welcome!"]], "mail calls")

@test
def duplicate_user_sends_nothing():
    send = Spy()
    sign_up = make_signup(FakeStore(), send)
    sign_up("a@x.com"); send.calls.clear()
    assert_equal(sign_up("a@x.com"), False, "second signup")
    assert_equal(len(send.calls), 0, "mails after duplicate")

for name, ok, why in results:
    print(("PASS " if ok else "FAIL ") + name + ("" if ok else " -> " + why))
print(f"{sum(1 for r in results if r[1])}/{len(results)} tests passed")` }
  ],
  codeTitle: ['Five doubles by hand', 'Mockito version', 'JS mini test runner + spy', 'Python mini test runner + spy'],
  viz: [
    {
      title: 'The five test doubles side by side',
      gen: function () {
        var cols = ['Double', 'Returns real data?', 'Records calls?', 'Fails by itself?', 'You assert on'];
        var rows = [
          ['Dummy', 'no (never used)', 'no', 'yes, if touched', 'nothing'],
          ['Stub', 'canned answers', 'no', 'no', 'the result of your code'],
          ['Spy', 'canned or real', 'YES', 'no', 'recorded calls, after the act'],
          ['Mock', 'scripted answers', 'YES', 'YES, on unmet expectation', 'interactions (verify)'],
          ['Fake', 'real working logic', 'no', 'no', 'state (what is stored)']
        ];
        var notes = [
          '<b>Everything starts the same:</b> your class needs collaborators. In a test we give it stand-ins, but each stand-in has a different <i>job</i>. Step through them one by one.',
          '<b>Dummy</b> - "I have to pass something, but this test does not care." If the code touches it, the test blows up, which proves the path was not taken.',
          '<b>Stub</b> - "When you ask, I answer this." Use it to steer the code into a branch (user already exists, price is 500).',
          '<b>Spy</b> - works like a stub but <i>remembers</i> what was done to it. After the act you ask: what did you see?',
          '<b>Mock</b> - knows the script in advance. If a call is missing or extra, it fails the test. Great for "must send exactly one email", dangerous when overused.',
          '<b>Fake</b> - a small, honest implementation (a HashMap pretending to be a database). Your tests read like real usage and survive refactors.'
        ];
        var frames = [];
        for (var i = 0; i < 6; i++) {
          var hl = {};
          if (i > 0) hl[i - 1] = 'sel';
          frames.push({ narr: notes[i], parts: [{ type: 'table', label: 'Test double cheat sheet', columns: cols, rows: rows, hl: hl }] });
        }
        frames.push({ narr: 'Pick the <b>simplest double that does the job</b>: dummy < stub < fake < spy < mock. The more a double knows about <i>how</i> your code works, the more fragile the test.', parts: [
          { type: 'table', label: 'Simplest first', columns: cols, rows: rows, hl: { 0: 'ok', 1: 'ok', 4: 'win' } }
        ] });
        return frames;
      }
    },
    {
      title: 'One unit test, step by step (fake store + spy mailer)',
      gen: function () {
        var src = 'SignupService s = new SignupService(fakeStore, spyMailer);\nboolean ok = s.signUp("b@x.com");\nassertTrue(ok);\nassertTrue(fakeStore.saved.contains("b@x.com"));\nassertEquals(1, spyMailer.sent.size());';
        var frames = [];
        frames.push({ narr: '<b>Arrange:</b> build the service with a <b>fake store</b> (empty) and a <b>spy mailer</b> (no mails yet). Nothing real is touched.', parts: [
          { type: 'code', label: 'Test', lang: 'java', code: src, hl: { 1: 'cur' } },
          { type: 'vars', label: 'Doubles', vals: { 'fakeStore.saved': '[]', 'spyMailer.sent': '[]' } }
        ] });
        frames.push({ narr: '<b>Act:</b> call <code>signUp</code> once. Inside, the service asks <code>exists()</code> (false), then <code>save()</code> on the fake, then <code>send()</code> on the spy.', parts: [
          { type: 'code', label: 'Test', lang: 'java', code: src, hl: { 2: 'cur' } },
          { type: 'vars', label: 'Doubles', vals: { 'fakeStore.saved': '[b@x.com]', 'spyMailer.sent': '[b@x.com:Welcome!]' }, hl: { 'fakeStore.saved': 'ok', 'spyMailer.sent': 'ok' } }
        ] });
        frames.push({ narr: '<b>Assert 1 (state):</b> the return value is true.', parts: [
          { type: 'code', label: 'Test', lang: 'java', code: src, hl: { 3: 'ok' } },
          { type: 'vars', vals: { ok: 'true' }, hl: { ok: 'ok' } }
        ] });
        frames.push({ narr: '<b>Assert 2 (state):</b> the fake now contains the user - same thing we would check in a real database.', parts: [
          { type: 'code', label: 'Test', lang: 'java', code: src, hl: { 4: 'ok' } },
          { type: 'vars', vals: { 'fakeStore.saved': '[b@x.com]' }, hl: { 'fakeStore.saved': 'ok' } }
        ] });
        frames.push({ narr: '<b>Assert 3 (interaction):</b> the spy saw exactly one welcome mail. If a refactor sends two, this test goes red - exactly the bug we care about.', parts: [
          { type: 'code', label: 'Test', lang: 'java', code: src, hl: { 5: 'ok' } },
          { type: 'vars', vals: { 'spyMailer.sent.size()': 1 }, hl: { 'spyMailer.sent.size()': 'ok' } }
        ] });
        frames.push({ narr: 'What if we break the code (forget to call <code>save</code>)? Assert 2 fails: <span class="c-r">fakeStore.saved is empty</span>. A test that cannot fail is useless - always check yours can.', parts: [
          { type: 'code', label: 'Test', lang: 'java', code: src, hl: { 4: 'bad' } },
          { type: 'vars', vals: { 'fakeStore.saved': '[]' }, hl: { 'fakeStore.saved': 'bad' } }
        ] });
        return frames;
      }
    }
  ],
  examples: [
    { title: 'Stub: steering the code into a rare branch', html: `<p>You want to test "payment gateway is down -> order goes to PENDING". You cannot ask the real gateway to be down. Write a stub whose <code>charge()</code> throws <code>GatewayTimeout</code>; the test then simply asserts that the order status is <code>PENDING</code>. No call counting is needed - the <i>result</i> is the behaviour.</p>`,
      code: { lang: 'java', code: `interface PaymentGateway { String charge(long cents); }
class TimeoutGateway implements PaymentGateway {
    public String charge(long cents) { throw new IllegalStateException("gateway timeout"); }
}
class Checkout {
    private final PaymentGateway gateway;
    Checkout(PaymentGateway gateway) { this.gateway = gateway; }
    String pay(long cents) {
        try { gateway.charge(cents); return "PAID"; }
        catch (IllegalStateException e) { return "PENDING"; }   // retry later
    }
    public static void main(String[] args) {
        System.out.println(new Checkout(new TimeoutGateway()).pay(500)); // PENDING
    }
}` } },
    { title: 'Mock vs fake: same test, two styles', html: `<p><b>Mock style:</b> <code>when(repo.findById(1)).thenReturn(order); service.cancel(1); verify(repo).save(argThat(o -&gt; o.status()==CANCELLED));</code> - it knows that you call <code>findById</code> then <code>save</code>. If you later use <code>findByIdForUpdate</code>, the test breaks.</p>
      <p><b>Fake style:</b> <code>repo.save(order); service.cancel(1); assertEquals(CANCELLED, repo.findById(1).get().status());</code> - it only knows <i>what the repository promises</i>. You can refactor the service freely. This is why many teams write one <code>InMemoryXRepository</code> per port and reuse it in every unit test.</p>` },
    { title: 'Do not mock what you do not own', html: `<p>Mocking <code>HttpClient</code> or <code>AmazonS3</code> directly makes a test that repeats your <i>assumptions</i> about the library. The mock will happily accept impossible calls. <b>Better:</b> define your own small interface (<code>ReceiptStorage.save(id, bytes)</code>), mock or fake <i>that</i> in unit tests, and test the real adapter once with an integration test (LocalStack / MinIO / WireMock). Then the lie is confined to one tiny class.</p>` },
    { title: 'Contract tests for your fakes', html: `<p>A fake can drift from the real thing: your <code>InMemoryUserStore</code> returns a case-sensitive match but Postgres compares case-insensitively. Fix: write one <b>shared contract test</b> (an abstract JUnit class <code>UserStoreContract</code>) with tests like "finds by email ignoring case", and run it against <i>both</i> the fake and the real JPA adapter. If both pass, the fake is trustworthy.</p>` }
  ],
  deepDive: `<p><b>Classicist vs mockist (Detroit vs London school).</b> The <i>classicist</i> school uses real objects where cheap and doubles only at the edges; tests are mostly state-based. The <i>mockist</i> (London) school mocks every collaborator and drives design from interactions. Neither is wrong, but mockist suites cost more at refactoring time. A good default: sociable unit tests of a whole module with fakes at the ports.</p>
  <p><b>Strict vs lenient mocks.</b> Mockito's strict stubs fail a test if you stub something the code never uses (<code>UnnecessaryStubbingException</code>). This catches dead setup. Use <code>MockitoExtension</code> (strict by default) and avoid <code>lenient()</code> unless needed.</p>
  <p><b>Final classes and static methods.</b> Mockito 5 uses the inline mock maker by default, so it can mock final classes, and <code>mockStatic</code> exists - but needing it is a design smell. Wrap static/global access (<code>System.currentTimeMillis</code>, <code>UUID.randomUUID</code>) in a small injectable interface or use <code>java.time.Clock</code>.</p>
  <p><b>Test data builders and Object Mothers.</b> Writing <code>new Order(...12 arguments...)</code> in 200 tests is painful. Use a builder with sensible defaults: <code>anOrder().withQty(10).build()</code>. Changing the constructor then needs a one-line change.</p>
  <p><b>Parameterized and property-based tests.</b> JUnit's <code>@ParameterizedTest</code> with <code>@CsvSource</code> checks many rows of a table (qty, expected total). Property-based testing (jqwik, fast-check, Hypothesis) generates random inputs and checks laws like "total is never negative" or "decode(encode(x)) == x" - great for pricing and parsers.</p>
  <p><b>Verifying async code.</b> Never <code>Thread.sleep(2000)</code>. Use Awaitility (<code>await().atMost(2, SECONDS).untilAsserted(...)</code>), or inject an <code>Executor</code> you control (a direct executor runs tasks on the calling thread so the test is deterministic).</p>
  <p><b>Naming and structure.</b> One behaviour per test; names state the behaviour; no logic (loops, ifs) in tests; avoid shared mutable fixtures; the failing test message should tell you what broke without opening the file (AssertJ's <code>assertThat(...).as("...")</code>).</p>`,
  aiEra: `<p><b>What AI changes:</b> assistants write mocks fluently, and "generate unit tests for this class" is a one-liner. The danger is volume without value: 40 tests that each mock everything and assert nothing meaningful.</p>
  <p><b>Use AI as a partner:</b> ask it <code>Write a fake in-memory implementation of this repository interface plus a shared contract test that I can run against the fake and the real JPA adapter</code>. Ask <code>Review these tests: which ones assert implementation instead of behaviour?</code> Ask it to produce edge cases as a table (qty 0, -1, MAX_VALUE, rounding) and feed that into a <code>@ParameterizedTest</code>.</p>
  <p><b>Where AI goes wrong:</b> mocks that return impossible values; <code>verify(...)</code> on every line (tests that mirror the code); using <code>any()</code> matchers that make assertions meaningless; stubbing methods that do not exist; forgetting to test failure paths. Also: tests written <i>after</i> the AI wrote the code tend to codify its bugs - the test passes because it was derived from the buggy implementation.</p>
  <p><b>What you must still own:</b> the specification. Write (or at least read) the test names <b>before</b> the implementation, decide the edge cases yourself, and always make the test fail once on purpose. In an interview, be ready to explain <i>why</i> you chose a fake over a mock, not just how to call Mockito.</p>`,
  problems: [
    {
      title: 'Unit-Test a Pricing Service with a Fake Repository',
      level: 'Easy', tags: ['unit testing', 'fake', 'ports and adapters'], companies: ['Shopify', 'Flipkart'],
      statement: `<p>Write a <code>PricingService</code> and unit tests for it, using a <b>hand-written fake repository</b> (no Mockito). Rules:</p>
        <ul>
          <li>Unit prices come from a <code>PriceRepository</code> port (cents). Unknown SKU -> <code>NoSuchElementException</code>.</li>
          <li>Quantity must be at least 1, otherwise <code>IllegalArgumentException</code>.</li>
          <li>10 or more units get 10% off the subtotal (integer maths, floor the discount).</li>
          <li>Coupon <code>WELCOME5</code> takes 500 cents off <i>after</i> the bulk discount; total never goes below 0.</li>
          <li>Every successful pricing writes one line to an <code>AuditLog</code> (use a hand-written spy for it).</li>
        </ul>
        <p>Provide a tiny assert helper and a <code>main()</code> that runs all tests and prints PASS/FAIL.</p>`,
      constraints: `Money in <code>long</code> cents. No test framework, no mocking library. Each test independent (new fake each time).`,
      example: `<p>Prices: SKU-1 = 1000 cents.</p>${H.table(['qty', 'coupon', 'subtotal', 'bulk off', 'coupon off', 'total'], [['1', '-', '1000', '0', '0', '<b>1000</b>'], ['10', '-', '10000', '1000', '0', '<b>9000</b>'], ['10', 'WELCOME5', '10000', '1000', '500', '<b>8500</b>'], ['1', 'WELCOME5', '1000', '0', '500', '<b>500</b>']])}<p>${H.c('g', '9 units')} get no bulk discount; ${H.c('r', 'price 300 with coupon')} gives 0, never -200.</p>`,
      brute: { why: `<p>Test through a real Postgres or a Mockito mock of every call. The DB version is slow and needs setup per test; the mock version repeats the implementation (<code>when(repo.find("SKU-1")).thenReturn(...)</code> + <code>verify(repo).find(...)</code>) and breaks when the lookup method is renamed. The wasted work is the infrastructure/interaction noise around a 3-line rule.</p>` },
      mcq: { q: 'Why is a hand-written fake repository a better default than a mock here?', options: ['Mocks cannot return values', 'The test checks results, not which repository method was called, so refactors do not break it', 'Fakes are faster than mocks by 100x', 'Fakes are required by JUnit'], answer: 1, explain: 'A fake lets the test assert on outcomes (state). A mock ties the test to the exact calls the implementation makes, which makes refactoring painful.' },
      hints: [
        `<p>The aha: the service should depend on an <b>interface</b> (the port) that you own. Then a HashMap-backed class can stand in for the database.</p>`,
        `<p>Create <code>InMemoryPriceRepository</code> with a <code>put(sku, cents)</code> helper for the Arrange step, and <code>SpyAuditLog</code> with a list of messages for the audit rule.</p>`,
        `<p>Order of rules: validate qty, load price (or throw), subtotal, bulk discount, coupon, clamp at 0, audit. Test one rule per test, plus the boundaries 9 and 10 units and a coupon bigger than the total.</p>`
      ],
      solution: {
        approach: `<p>Define the port <code>PriceRepository</code> and <code>AuditLog</code> in the domain. <code>PricingService</code> takes both through its constructor. For tests, <code>InMemoryPriceRepository</code> is a <b>fake</b> (a working HashMap) and <code>SpyAuditLog</code> is a <b>spy</b> (records lines). A 10-line <code>Check</code> helper throws <code>AssertionError</code>; <code>main()</code> runs each test in a try/catch so one failure does not hide the others. Each test builds its own fake, so tests never share state. Boundaries covered: qty 9 vs 10, coupon larger than total, unknown SKU, qty 0.</p>`,
        code: `import java.util.*;

/** Port: owned by the domain. Adapters (JPA, REST, in-memory) implement it. */
interface PriceRepository {
    Optional<Long> findUnitPriceCents(String sku);
}
interface AuditLog { void record(String line); }

/** Domain service: pure rules, no I/O of its own. */
class PricingService {
    private final PriceRepository prices;
    private final AuditLog audit;

    PricingService(PriceRepository prices, AuditLog audit) { this.prices = prices; this.audit = audit; }

    long priceFor(String sku, int qty, String coupon) {
        if (qty < 1) throw new IllegalArgumentException("qty must be >= 1");
        long unit = prices.findUnitPriceCents(sku)
                .orElseThrow(() -> new NoSuchElementException("unknown sku " + sku));
        long subtotal = unit * qty;
        long bulkDiscount = qty >= 10 ? subtotal * 10 / 100 : 0;   // integer maths, floors
        long total = subtotal - bulkDiscount;
        if ("WELCOME5".equals(coupon)) total -= 500;
        total = Math.max(0, total);                                  // never negative
        audit.record(sku + " x" + qty + " = " + total);
        return total;
    }
}

/** FAKE: a real, working, in-memory repository. */
class InMemoryPriceRepository implements PriceRepository {
    private final Map<String, Long> prices = new HashMap<>();
    InMemoryPriceRepository put(String sku, long cents) { prices.put(sku, cents); return this; }
    public Optional<Long> findUnitPriceCents(String sku) { return Optional.ofNullable(prices.get(sku)); }
}
/** SPY: remembers every audit line. */
class SpyAuditLog implements AuditLog {
    final List<String> lines = new ArrayList<>();
    public void record(String line) { lines.add(line); }
}

/** A tiny assert helper - no framework needed. */
class Check {
    static void equal(Object expected, Object actual, String what) {
        if (!Objects.equals(expected, actual))
            throw new AssertionError(what + ": expected " + expected + " but was " + actual);
    }
    static void throwsA(Class<? extends Throwable> type, Runnable code, String what) {
        try { code.run(); } catch (Throwable t) {
            if (type.isInstance(t)) return;
            throw new AssertionError(what + ": wrong exception " + t);
        }
        throw new AssertionError(what + ": expected " + type.getSimpleName());
    }
}

class PricingServiceTests {
    static int passed = 0, failed = 0;

    static void test(String name, Runnable body) {
        try { body.run(); passed++; System.out.println("PASS " + name); }
        catch (AssertionError e) { failed++; System.out.println("FAIL " + name + " -> " + e.getMessage()); }
    }
    // Arrange helper: a fresh fake for every test.
    static PricingService service(SpyAuditLog audit) {
        return new PricingService(new InMemoryPriceRepository().put("SKU-1", 1000).put("CHEAP", 300), audit);
    }

    public static void main(String[] args) {
        test("single item costs unit price", () -> Check.equal(1000L, service(new SpyAuditLog()).priceFor("SKU-1", 1, null), "total"));
        test("nine items get no bulk discount", () -> Check.equal(9000L, service(new SpyAuditLog()).priceFor("SKU-1", 9, null), "total"));
        test("ten items get 10% off", () -> Check.equal(9000L, service(new SpyAuditLog()).priceFor("SKU-1", 10, null), "total"));
        test("coupon applies after bulk discount", () -> Check.equal(8500L, service(new SpyAuditLog()).priceFor("SKU-1", 10, "WELCOME5"), "total"));
        test("coupon never makes total negative", () -> Check.equal(0L, service(new SpyAuditLog()).priceFor("CHEAP", 1, "WELCOME5"), "total"));
        test("unknown sku is rejected", () -> Check.throwsA(NoSuchElementException.class, () -> service(new SpyAuditLog()).priceFor("NOPE", 1, null), "unknown sku"));
        test("zero quantity is rejected", () -> Check.throwsA(IllegalArgumentException.class, () -> service(new SpyAuditLog()).priceFor("SKU-1", 0, null), "qty 0"));
        test("successful pricing writes one audit line", () -> {
            SpyAuditLog audit = new SpyAuditLog();
            service(audit).priceFor("SKU-1", 2, null);
            Check.equal(List.of("SKU-1 x2 = 2000"), audit.lines, "audit lines");
        });
        test("failed pricing writes no audit line", () -> {
            SpyAuditLog audit = new SpyAuditLog();
            try { service(audit).priceFor("NOPE", 1, null); } catch (NoSuchElementException expected) { }
            Check.equal(0, audit.lines.size(), "audit lines");
        });
        System.out.println(passed + " passed, " + failed + " failed");
        if (failed > 0) System.exit(1);
    }
}`,
        complexity: `<p>Each test is O(1) in time and memory; the suite runs in a few milliseconds because nothing touches I/O. The pricing method itself is O(1) (one map lookup).</p>`,
        followUps: ['How would you add a shared contract test so the fake and the JPA adapter behave the same?', 'How would you test a rule that depends on the current date (Black Friday discount)?', 'Convert the table of cases to a JUnit @ParameterizedTest.']
      }
    }
  ]
});

/* ============================ TOPIC 3: INTEGRATION TESTS + TESTCONTAINERS ============================ */
topics.push({
  title: 'Integration Tests and Testcontainers (Real Dependencies on Demand)',
  analogy: `<p>A unit test is like checking an <b>electric kettle</b> by itself on the workbench. An integration test plugs it into a <b>real wall socket</b>. Many bugs only show when the plug meets the socket: wrong voltage, wrong shape, a fuse that trips. For backends the "socket" is a real database, queue or cache. <b>Testcontainers</b> is a magic power strip: when the test starts, a fresh real Postgres (in a Docker container) appears, the test plugs in, and when the test ends the whole socket is thrown away. Each run gets a clean, identical, disposable socket - no shared "test database" that somebody forgot to clean.</p>`,
  explain: `<p><b>What is an integration test?</b> A test where <i>your code</i> talks to <i>one or more real dependencies</i>: a real database, a real message broker, a real HTTP server (even if local). It answers "does my SQL really run?", "does my entity mapping match the table?", "does the Kafka message really arrive with this key?"</p>
  <p>🟢 <b>The old way and why it hurts.</b></p>
  <ul>
    <li><b>H2 / in-memory fake databases:</b> fast, but H2 is not Postgres. It has different SQL, no <code>jsonb</code>, no window-function quirks, different locking. Tests go green, production breaks.</li>
    <li><b>A shared "test" database:</b> tests from different developers and CI runs overwrite each other's rows. Failures become random.</li>
    <li><b>"Works on my laptop" installs:</b> everyone installs Postgres 14, 15, 16 by hand.</li>
  </ul>
  <p>🔵 <b>Testcontainers in one picture.</b> It is a library (Java, Node, Python, Go...) that talks to the local Docker daemon:</p>
  <ol>
    <li>Your test declares <code>new PostgreSQLContainer&lt;&gt;("postgres:16-alpine")</code>.</li>
    <li>Testcontainers pulls the image (cached after the first time), starts it on a <b>random free port</b>, and waits until it is really ready (a "wait strategy").</li>
    <li>It gives you the JDBC URL, username and password <i>from the running container</i>. You never hardcode secrets or ports.</li>
    <li>Your Spring app (or plain JDBC code) connects, <b>Flyway/Liquibase migrations run</b> exactly as in production, the test runs.</li>
    <li>A small helper container called <b>Ryuk</b> deletes the container when the JVM exits - even if the test crashed.</li>
  </ol>
  <p><b>Spring Boot 3.1+ makes it nearly free:</b> annotate the container field with <code>@ServiceConnection</code> and Spring configures the datasource for you. Before that, <code>@DynamicPropertySource</code> copied the container's URL into Spring properties.</p>
  <p><b>Speed tips.</b> Starting a container costs 1-3 s. So: (1) start it <b>once per test class or once per JVM</b> (static field / singleton), not once per test; (2) share it between classes; (3) clean data between tests with <code>@Transactional</code> rollback or a <code>TRUNCATE</code> in <code>@BeforeEach</code>; (4) keep integration tests focused (the repository, not the whole app).</p>
  <p>🔴 <b>What to test here, and what not to.</b> Test queries, mappings, constraints, transactions and migrations. Do <i>not</i> re-test business rules (that is a unit test) and do not test the framework itself (that Spring can save an entity).</p>`,
  clues: [
    '"Works with H2, fails on Postgres" -> use Testcontainers with the same engine and version as production',
    '"How do you test a repository / native query / migration?" -> integration test with a real DB container, run Flyway first',
    '"How do you test code that publishes to Kafka / uses Redis / S3?" -> Kafka, Redis, LocalStack containers',
    '"CI tests are slow because each test starts a container" -> singleton container, reuse across classes, rollback instead of restart',
    '"Tests fail only when run in parallel / on CI" -> shared database or fixed ports; use random ports and isolated data',
    '"Where do the DB credentials for tests come from?" -> read them from the container object (never commit real secrets)'
  ],
  code: [
    { lang: 'java', check: false, title: 'Spring Boot 3.1+ integration test with @ServiceConnection (Postgres)', code: `@SpringBootTest
@Testcontainers
class OrderRepositoryIT {

    // Started once for this class; Spring Boot wires spring.datasource.* from it automatically.
    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired OrderRepository orders;
    @Autowired JdbcTemplate jdbc;

    @BeforeEach
    void cleanTable() {
        jdbc.execute("TRUNCATE TABLE orders RESTART IDENTITY CASCADE");   // fresh state for each test
    }

    @Test
    void savesAndLoadsAnOrder() {
        Order saved = orders.save(new Order("rider-1", "SKU-1", 2, "idem-123"));
        assertThat(orders.findById(saved.getId())).get()
            .extracting(Order::getQuantity).isEqualTo(2);
    }

    @Test
    void duplicateIdempotencyKeyIsRejectedByTheDatabase() {
        orders.saveAndFlush(new Order("rider-1", "SKU-1", 1, "idem-123"));
        assertThatThrownBy(() -> orders.saveAndFlush(new Order("rider-2", "SKU-2", 1, "idem-123")))
            .isInstanceOf(DataIntegrityViolationException.class);   // UNIQUE constraint from the Flyway migration
    }
}` },
    { lang: 'java', check: false, title: 'Singleton container shared by every test class (fast suites)', code: `// One container for the whole JVM: started on first use, killed by Ryuk at exit.
abstract class AbstractPostgresIT {

    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine");

    static {
        POSTGRES.start();      // no @Container: we manage the lifecycle ourselves
    }

    // Spring Boot < 3.1 (or when you want explicit control): copy values from the container.
    @DynamicPropertySource
    static void datasourceProps(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }
}

@SpringBootTest
@Transactional                                  // every test rolls back -> no cleanup code needed
class InvoiceRepositoryIT extends AbstractPostgresIT {
    @Autowired InvoiceRepository invoices;

    @Test
    void latestTenInvoicesPerCustomerUsesWindowFunction() {
        // insert 25 invoices for two customers ... then:
        assertThat(invoices.latestTenPerCustomer()).hasSize(20);   // native query with ROW_NUMBER() OVER (...)
    }
}` },
    { lang: 'java', check: false, title: 'No Spring: plain JDBC and a Kafka container', code: `@Testcontainers
class ReceiptPublisherIT {

    @Container
    static KafkaContainer kafka = new KafkaContainer(DockerImageName.parse("confluentinc/cp-kafka:7.6.1"));

    @Test
    void publishesWithRiderIdAsKey() {
        Map<String, Object> props = Map.of(
            ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, kafka.getBootstrapServers(),
            ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class,
            ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        try (var producer = new KafkaProducer<String, String>(props)) {
            new ReceiptPublisher(producer, "receipts").publish(new Receipt("rider-7", 1250));
        }
        try (var consumer = TestKafka.consumer(kafka.getBootstrapServers(), "receipts")) {
            ConsumerRecord<String, String> rec = TestKafka.firstRecord(consumer, Duration.ofSeconds(10));
            assertThat(rec.key()).isEqualTo("rider-7");          // ordering per rider is preserved
            assertThat(rec.value()).contains("1250");
        }
    }
}` },
    { lang: 'yaml', title: 'CI: GitHub Actions (Docker is already available on ubuntu runners)', code: `name: build
on: [pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { distribution: temurin, java-version: '21', cache: maven }
      # unit tests first (seconds), integration tests next (they start containers)
      - run: ./mvnw -B verify
        env:
          TESTCONTAINERS_RYUK_DISABLED: "false"` }
  ],
  codeTitle: ['@ServiceConnection + Postgres', 'Singleton container base class', 'Kafka container', 'CI pipeline'],
  viz: {
    title: 'Testcontainers lifecycle: from @Container to cleanup',
    gen: function () {
      var nodes = [
        { id: 'T', label: 'JUnit test', x: 12, y: 8, shape: 'box', w: 14 },
        { id: 'TC', label: 'Testcontainers lib', x: 40, y: 8, shape: 'box', w: 20 },
        { id: 'D', label: 'Docker daemon', x: 75, y: 8, shape: 'box', w: 18 },
        { id: 'PG', label: 'postgres:16 (random port)', x: 75, y: 28, shape: 'box', w: 26 },
        { id: 'R', label: 'Ryuk reaper', x: 40, y: 28, shape: 'box', w: 16 },
        { id: 'S', label: 'Spring context + DataSource', x: 14, y: 28, shape: 'box', w: 26 },
        { id: 'F', label: 'Flyway migrations', x: 14, y: 48, shape: 'box', w: 22 }
      ];
      var edges = [['T', 'TC', '@Container'], ['TC', 'D', 'pull + run'], ['D', 'PG', 'create'], ['TC', 'S', 'JDBC url'], ['S', 'PG', 'SQL'], ['S', 'F', 'on startup'], ['F', 'PG', 'DDL'], ['R', 'D', 'kill on exit']];
      function g(hl, ehl, tags) { return { type: 'graph', label: 'Test JVM  /  Docker', directed: true, height: 56, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} }; }
      return [
        { narr: 'The test class declares a container with <code>@Container</code>. At this point nothing is running yet - the test JVM just <b>asks Testcontainers for a Postgres</b>.', parts: [g({ T: 'cur', TC: 'cur' }, { 'T-TC': 'ok' })] },
        { narr: 'Testcontainers talks to the <b>Docker daemon</b>: pull <code>postgres:16-alpine</code> (cached after the first run) and run it. A tiny helper called <b>Ryuk</b> starts too - its only job is cleanup.', parts: [g({ TC: 'cur', D: 'cur', R: 'sel' }, { 'TC-D': 'ok' })] },
        { narr: 'Docker creates the container and maps Postgres port 5432 to a <b>random free port</b> on your machine (say 54321). Random ports mean two builds can run side by side without clashing.', parts: [g({ D: 'cur', PG: 'ok' }, { 'D-PG': 'ok' }, { PG: ':54321' })] },
        { narr: 'Testcontainers waits until Postgres logs "ready to accept connections". Only then does the test continue - no <code>Thread.sleep</code>, no guessing.', parts: [g({ PG: 'ok', TC: 'cur' }, {}, { PG: 'ready' })] },
        { narr: 'The container\'s real URL, user and password are <b>handed to Spring</b> (<code>@ServiceConnection</code> or <code>@DynamicPropertySource</code>). Nothing is hardcoded; the credentials are throw-away values made by the container.', parts: [g({ TC: 'cur', S: 'ok' }, { 'TC-S': 'ok' }, { S: 'url injected' })] },
        { narr: 'Spring starts, <b>Flyway runs the same migration files as production</b> against the fresh database. Wrong SQL, a missing column or a bad constraint fails right here, in the test.', parts: [g({ S: 'cur', F: 'ok', PG: 'cur' }, { 'S-F': 'ok', 'F-PG': 'ok' }, { F: 'V1..V12 applied' })] },
        { narr: 'Now each test runs real SQL through the repository against real Postgres: inserts, the UNIQUE constraint, the window-function query. Between tests we truncate or roll back.', parts: [g({ S: 'ok', PG: 'ok' }, { 'S-PG': 'ok' })] },
        { narr: 'The JVM exits (or crashes). <b>Ryuk</b> notices the connection drop and tells Docker to remove the container and its volume. Nothing is left behind on your laptop or the CI machine.', parts: [g({ R: 'cur', D: 'cur', PG: 'bad' }, { 'R-D': 'bad' }, { PG: 'removed' })] }
      ];
    }
  },
  examples: [
    { title: 'Green on H2, red on Postgres', html: `<p>Entity has a <code>jsonb</code> column and a repository method with <code>ILIKE</code> and <code>ON CONFLICT DO NOTHING</code>. H2 cannot run any of these, so the team "simplifies" the test config - and the real queries are never tested. With Testcontainers the same migration and query run against the real engine. <b>Rule: test with the same database engine and major version you run in production.</b></p>` },
    { title: 'Cleaning data between tests', html: `<p>Three options, from simplest to most robust: (1) <code>@Transactional</code> on the test class - rollback after each test (does not work if the code under test uses a different thread or commits inside <code>REQUIRES_NEW</code>); (2) <code>TRUNCATE ... RESTART IDENTITY CASCADE</code> in <code>@BeforeEach</code>; (3) a unique tenant/rider id per test so tests cannot see each other's rows. Never rely on test order.</p>` },
    { title: 'Reuse: local speed vs CI purity', html: `<p><code>.withReuse(true)</code> (plus <code>testcontainers.reuse.enable=true</code> in your personal <code>~/.testcontainers.properties</code>) keeps the container alive between local runs, saving seconds. Do not enable it on CI - CI must start from a clean slate. Mind that reused containers keep data, so always clean tables yourself.</p>` },
    { title: 'Testing S3-style storage with LocalStack or MinIO', html: `<p>Instead of mocking the AWS SDK, start a <code>LocalStackContainer</code> with the S3 service, create a bucket in <code>@BeforeAll</code>, and run your real <code>S3ReceiptStorage</code> adapter against it. You now test serialization, key naming and error handling for real, while unit tests still use an <code>InMemoryReceiptStorage</code> fake.</p>` }
  ],
  deepDive: `<p><b>How it really works.</b> Testcontainers uses the Docker Engine API (a Unix socket, or a TCP/remote host). Wait strategies (<code>Wait.forListeningPort()</code>, <code>forLogMessage</code>, <code>forHttp("/health")</code>) poll until the app inside is genuinely usable. Ryuk is a privileged sidecar container that holds a TCP connection to the JVM and removes labelled resources when it drops. In locked-down CI (rootless Docker, Kubernetes runners) you may need <code>TESTCONTAINERS_HOST_OVERRIDE</code>, or run Testcontainers Cloud / a Docker-in-Docker service.</p>
  <p><b>Dev services &amp; test slices.</b> Besides <code>@SpringBootTest</code>, use <code>@DataJpaTest</code> with <code>@AutoConfigureTestDatabase(replace = NONE)</code> so Spring does <i>not</i> swap your Postgres for H2. Slice tests start in a second instead of five. Spring Boot 3.1 also offers <code>spring-boot-testcontainers</code> and <code>SpringApplication.from(...).with(...)</code> to run the app locally with containers for development.</p>
  <p><b>Parallelism.</b> Containers are per JVM. Gradle/Surefire forks multiple JVMs, each would start its own container (heavy). Either limit forks for integration tests, or use one container per fork with separate schemas/databases (<code>CREATE DATABASE test_N (N = fork number)</code> via a helper).</p>
  <p><b>Test the migrations themselves.</b> A strong pattern: start Postgres, run migrations V1..Vn from scratch, then also test "upgrade from the previous release schema with sample data" to catch destructive migrations. Flyway's <code>validateMigrationNaming</code> and checksum validation help.</p>
  <p><b>Flakiness sources.</b> Port clashes (use random ports), races on startup (use wait strategies, not sleep), eventually-consistent systems (Awaitility), leftover state (truncate), Docker Hub rate limits (pre-pull or use a registry mirror), slow CI disks (use <code>tmpfs</code>: <code>withTmpFs(Map.of("/var/lib/postgresql/data", "rw"))</code> makes Postgres noticeably faster in tests, durability is irrelevant there).</p>
  <p><b>Security &amp; secrets.</b> Test containers should never connect to real cloud resources, and test configs must not contain production secrets. Use the throwaway credentials generated by the container object; pull secrets for anything real from the CI secret store, never from source control.</p>
  <p><b>Where it sits in the pyramid.</b> Integration tests are the "middle layer": they cost seconds, not milliseconds, so there are dozens, not thousands. A common split is <code>*Test</code> (unit, Surefire) vs <code>*IT</code> (integration, Failsafe, <code>mvn verify</code>) so developers can run the fast set alone.</p>`,
  aiEra: `<p><b>What AI changes:</b> boilerplate for containers, Flyway setups and test data is exactly what assistants write well. It lowers the barrier for teams that used to "skip integration tests because setup is hard".</p>
  <p><b>Use AI as a partner:</b> <code>Given this Flyway migration and this repository, list the database-level behaviours worth an integration test (constraints, indexes, query ordering) - names only</code>. Use it to produce realistic seed data and to translate a slow H2 test into a Testcontainers one. Let a coding agent run the suite and read the failure logs - integration test output is verbose, and summarising it is a good use of AI.</p>
  <p><b>Where AI goes wrong:</b> it often reaches for H2 "for simplicity", mixes old and new Spring Boot APIs (<code>@DynamicPropertySource</code> with <code>@ServiceConnection</code> duplicates), forgets <code>@Testcontainers</code>/<code>@Container</code> wiring, starts a new container per test method, and invents image tags that do not exist. It may also hardcode a password in <code>application-test.yml</code>.</p>
  <p><b>What you must still own:</b> the decision of <i>what deserves a real dependency</i>, the container versions that match production, the cleanup strategy, and keeping the suite fast. When an AI-generated integration test passes, break the SQL on purpose and confirm that it turns red.</p>`,
  problems: [
    {
      title: 'Write a Testcontainers Postgres Integration Test',
      level: 'Medium', tags: ['testcontainers', 'postgres', 'integration test', 'spring boot'], companies: ['Stripe', 'Zalando'],
      statement: `<p>Your <code>orders</code> table has a <b>UNIQUE</b> constraint on <code>idempotency_key</code> (so a retried POST cannot create two orders). A JPA <code>OrderRepository</code> also has a derived query <code>findTop3ByRiderIdOrderByCreatedAtDesc</code>.</p>
        <p>Write an integration test class using <b>Testcontainers + real Postgres 16</b> that proves: (1) an order can be saved and read back; (2) a duplicate idempotency key is rejected by the <i>database</i>; (3) the "top 3 newest" query returns the newest three in the right order; (4) tests do not leak data into each other. Explain how you keep the suite fast.</p>`,
      constraints: `Spring Boot 3.3, JUnit 5, Flyway migrations in <code>db/migration</code>. No H2. No hardcoded credentials or ports.`,
      example: `<p>Insert orders with created_at 1, 2, 3, 4, 5 for rider-1 and one order for rider-2.</p><p>Query for rider-1 returns ${H.c('g', 'created_at 5, 4, 3')} (newest first, exactly 3, nothing from rider-2). Saving a second order with key <code>idem-1</code> throws ${H.c('r', 'DataIntegrityViolationException')}.</p>`,
      brute: { why: `<p>Use H2 in PostgreSQL mode, or mock the repository. H2 does not enforce the same constraint messages, ordering or SQL dialect, and a mocked repository never touches SQL at all. The test stays green while the real migration has a typo in the UNIQUE index. Wasted work: confidence that is not real.</p>` },
      mcq: { q: 'Which is the best way to keep many Testcontainers-based test classes fast?', options: ['Start a new container in every test method', 'Start one container per JVM (singleton) and clean data between tests', 'Replace Postgres with H2 in CI', 'Use Thread.sleep to wait for the DB'], answer: 1, explain: 'Container startup (1-3 s) is the main cost. A shared container started once, plus TRUNCATE or rollback between tests, keeps tests isolated and fast.' },
      hints: [
        `<p>The aha: you want the <b>same engine and migrations</b> as production, so start a real <code>PostgreSQLContainer</code> instead of faking the database.</p>`,
        `<p>Use <code>@Testcontainers</code> + <code>@Container @ServiceConnection static</code> on the container so Spring gets the URL/user/password from it automatically; put the container in a base class if several test classes need it.</p>`,
        `<p>Recipe: truncate in <code>@BeforeEach</code>, use <code>saveAndFlush</code> so the constraint fires immediately, assert with AssertJ, create orders with explicit timestamps (inject a <code>Clock</code> or set <code>createdAt</code> directly) to avoid sleeping.</p>`
      ],
      solution: {
        approach: `<p><b>Plan.</b> Use <code>@DataJpaTest</code> with <code>@AutoConfigureTestDatabase(replace = NONE)</code> so only JPA and Flyway start (about 1-2 s), and a <code>@ServiceConnection</code> Postgres container so the datasource points at the real database. Flyway runs the real migrations, so the UNIQUE index exists exactly as in production.</p>
          <p><b>Isolation.</b> Each test runs inside the transaction <code>@DataJpaTest</code> provides and rolls back, plus an explicit truncate for safety. Because the container is static, it starts once for the class; with a shared base class it starts once for the whole JVM.</p>
          <p><b>Constraint test.</b> Use <code>saveAndFlush</code> twice: without a flush JPA batches inserts and the exception would appear only at commit, after the test body ended. Assert on <code>DataIntegrityViolationException</code>.</p>
          <p><b>Ordering test.</b> Create six orders with explicit <code>createdAt</code> values (no sleeping), then assert the returned list equals timestamps 5, 4, 3 and that rider-2's order is absent. This verifies the derived query's ORDER BY and LIMIT against real SQL.</p>
          <p><b>Speed &amp; safety.</b> One container per JVM, slice test rather than <code>@SpringBootTest</code>, tmpfs for the data directory, pinned image tag, credentials taken from the container (never literals). Put it in <code>*IT</code> classes run by Failsafe so developers can run unit tests alone.</p>`,
        code: { lang: 'java', check: false, code: `@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)   // do NOT swap in H2
@Testcontainers
class OrderRepositoryIT {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withTmpFs(Map.of("/var/lib/postgresql/data", "rw"));   // faster, data is disposable anyway

    @Autowired OrderRepository orders;
    @Autowired JdbcTemplate jdbc;

    @BeforeEach
    void clean() { jdbc.execute("TRUNCATE TABLE orders RESTART IDENTITY CASCADE"); }

    private static Order order(String rider, String key, long epochSecond) {
        Order o = new Order(rider, "SKU-1", 1, key);
        o.setCreatedAt(Instant.ofEpochSecond(epochSecond));      // explicit time: no sleeping, no flakiness
        return o;
    }

    @Test
    void savesAndReadsBack() {
        Order saved = orders.saveAndFlush(order("rider-1", "idem-1", 1));
        assertThat(orders.findById(saved.getId())).isPresent();
    }

    @Test
    void databaseRejectsDuplicateIdempotencyKey() {
        orders.saveAndFlush(order("rider-1", "idem-1", 1));
        assertThatThrownBy(() -> orders.saveAndFlush(order("rider-2", "idem-1", 2)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void topThreeNewestForOneRider() {
        for (int i = 1; i <= 5; i++) orders.saveAndFlush(order("rider-1", "k" + i, i));
        orders.saveAndFlush(order("rider-2", "other", 99));
        List<Order> top = orders.findTop3ByRiderIdOrderByCreatedAtDesc("rider-1");
        assertThat(top).extracting(o -> o.getCreatedAt().getEpochSecond()).containsExactly(5L, 4L, 3L);
    }
}` },
        complexity: `<p>Cost model: container start about 1-3 s once per JVM; each test about 20-50 ms (real SQL on a local socket). A suite of 40 repository tests typically finishes in under 15 s including startup.</p>`,
        followUps: ['How would you run the same tests against two Postgres versions during an upgrade?', 'How would you test a Flyway migration that rewrites existing data?', 'What changes if your CI has no Docker (rootless / Kubernetes runner)?']
      }
    }
  ]
});

/* ============================ TOPIC 4: CONTRACT TESTING ============================ */
topics.push({
  title: 'Contract Tests: Consumer-Driven Contracts and Pact',
  analogy: `<p>You order a custom <b>door</b> from a carpenter. Instead of building the whole house to see if the door fits, you both sign a <b>one-page agreement</b>: "width 90 cm, height 210 cm, opens inward." The carpenter checks every door he builds against the page. You check your door frame against the same page. Nobody needs the other's workshop. If the carpenter wants to change the width, the agreement shows exactly <b>who will be hurt</b> before the door is built. In software the "door" is an API response, the "carpenter" is the <b>provider</b> service, the "house builder" is the <b>consumer</b> service, and the agreement is a <b>contract</b> file.</p>`,
  explain: `<p><b>The problem.</b> You have a web app (consumer) calling an Orders service (provider). Each team deploys on its own. Two bad options exist:</p>
  <ul>
    <li><b>Consumer unit test with a mock of the provider:</b> fast, but the mock is your <i>guess</i>. The provider renames <code>totalCents</code> to <code>total_amount</code>, your mock still returns the old name, tests stay green, production breaks.</li>
    <li><b>Big shared E2E environment:</b> deploy all 30 services together and test. Slow, flaky, and a red build does not say whose fault it is.</li>
  </ul>
  <p>🟢 <b>Contract testing is the middle way.</b> The two sides never talk during the test. Each is tested <b>alone</b> against the same written contract.</p>
  <p>🔵 <b>Consumer-driven contracts (CDC) with Pact - the flow:</b></p>
  <ol>
    <li><b>Consumer test:</b> the consumer team writes a test that says "when I call <code>GET /orders/42</code>, I expect status 200 and a body with <code>id</code> (string) and <code>totalCents</code> (number)". Pact starts a <i>mock provider</i> that answers exactly that, and the consumer code runs against it. If the consumer code can handle it, the test passes and Pact writes a <b>pact file</b> (JSON).</li>
    <li><b>Publish:</b> the pact is uploaded to a <b>Pact Broker</b> (or PactFlow) with the consumer's version and branch.</li>
    <li><b>Provider verification:</b> in the provider's CI, Pact downloads every consumer's pact, starts the <b>real provider</b> (with fake data or fake downstream calls), replays each request, and compares the real responses with the contract. Before each replay the provider puts itself in the named <b>provider state</b> ("order 42 exists").</li>
    <li><b>Gate the deploy:</b> before releasing either side, run <code>can-i-deploy</code>. The broker answers yes only if the versions being deployed have compatible, verified contracts.</li>
  </ol>
  <p><b>Why "consumer-driven"?</b> The consumer says only what it <i>actually uses</i>. If Orders adds ten new fields, nobody cares. If Orders removes a field the web app reads, the provider's build fails <i>before release</i> and shows exactly which consumer would break. This lets providers change safely and delete unused fields with confidence.</p>
  ${H.table(['', 'Unit test with mock', 'Contract test', 'E2E test'], [
    ['Catches renamed field', '<span class="c-r">No</span>', '<span class="c-g">Yes</span>', '<span class="c-g">Yes (late)</span>'],
    ['Needs both services running', 'No', '<span class="c-g">No</span>', '<span class="c-r">Yes</span>'],
    ['Runs on every PR', 'Yes', 'Yes', 'Rarely'],
    ['Tells you who broke what', 'No', '<span class="c-g">Yes, exactly</span>', 'Vaguely'],
    ['Checks business logic', 'Yes', '<span class="c-r">No - only shape</span>', 'Yes']
  ])}
  <p>🔴 <b>What contract tests are NOT.</b> They check the <i>shape and basic semantics</i> of messages (fields, types, status codes, headers), not business rules. "Total equals sum of items" is a unit test inside the provider. Keep contracts <b>loose</b>: match on type (<code>like(2599)</code>) or regex instead of exact values, or the contract will break for no reason.</p>
  <p><b>Other flavours.</b> <i>Spring Cloud Contract</i> is provider-driven: the provider writes the contract in a Groovy/YAML DSL and generates stubs for consumers. <i>OpenAPI-based</i> checks (Schemathesis, Dredd, <code>openapi-diff</code> in CI) verify the provider against its published spec and detect breaking changes. <i>Message pacts</i> do the same for Kafka/SQS events: the consumer states the JSON it expects in a message.</p>`,
  clues: [
    '"Many teams deploy their own microservices independently" -> consumer-driven contract tests + can-i-deploy',
    '"We keep breaking other teams with API changes" -> publish consumer contracts, verify in provider CI, version and deprecate',
    '"E2E environment is always broken / too slow" -> replace most cross-service E2E with contract tests',
    '"How do you test an event schema between producer and consumer?" -> message pacts or schema registry compatibility checks',
    '"Can I remove this field from the response?" -> check the broker: does any verified consumer contract use it?',
    '"Unit tests mock the other service but we still get integration bugs" -> the mock is unverified; verify it with a contract'
  ],
  code: [
    { lang: 'java', check: false, title: 'Consumer side (web-checkout): Pact JUnit 5 test that creates the contract', code: `@ExtendWith(PactConsumerTestExt.class)
@PactTestFor(providerName = "orders-service", pactVersion = PactSpecVersion.V3)
class OrdersClientPactTest {

    @Pact(consumer = "web-checkout")
    V4Pact orderExists(PactDslWithProvider builder) {
        return builder
            .given("order 42 exists")                              // provider state name
            .uponReceiving("a request for order 42")
                .method("GET").path("/orders/42")
                .headers("Accept", "application/json")
            .willRespondWith()
                .status(200)
                .headers(Map.of("Content-Type", "application/json"))
                .body(new PactDslJsonBody()
                    .stringType("id", "42")            // match on TYPE, not exact value
                    .stringType("status", "PAID")
                    .integerType("totalCents", 2599))  // consumer only lists fields it really uses
            .toPact(V4Pact.class);
    }

    @Test
    void clientParsesOrder(MockServer mockServer) {
        OrdersClient client = new OrdersClient(mockServer.getUrl());   // real client code, mock provider
        Order order = client.getOrder("42");
        assertThat(order.totalCents()).isEqualTo(2599);
        assertThat(order.status()).isEqualTo("PAID");
    }
}` },
    { lang: 'json', title: 'The generated pact file (shortened, valid JSON)', code: `{
  "consumer": { "name": "web-checkout" },
  "provider": { "name": "orders-service" },
  "interactions": [
    {
      "description": "a request for order 42",
      "providerStates": [ { "name": "order 42 exists" } ],
      "request": { "method": "GET", "path": "/orders/42", "headers": { "Accept": "application/json" } },
      "response": {
        "status": 200,
        "headers": { "Content-Type": "application/json" },
        "body": { "id": "42", "status": "PAID", "totalCents": 2599 },
        "matchingRules": {
          "body": {
            "$.id": { "combine": "AND", "matchers": [ { "match": "type" } ] },
            "$.totalCents": { "combine": "AND", "matchers": [ { "match": "integer" } ] }
          }
        }
      }
    }
  ],
  "metadata": { "pactSpecification": { "version": "3.0.0" } }
}` },
    { lang: 'java', check: false, title: 'Provider side (orders-service): verify every consumer pact', code: `@Provider("orders-service")
@PactBroker                                   // URL + auth come from env/system properties (never hardcode tokens)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class OrdersProviderPactTest {

    @LocalServerPort int port;
    @MockBean OrderRepository orders;          // downstream calls are faked; we verify the HTTP contract

    @BeforeEach
    void target(PactVerificationContext context) {
        context.setTarget(new HttpTestTarget("localhost", port));
    }

    @TestTemplate
    @ExtendWith(PactVerificationInvocationContextProvider.class)
    void verifyPact(PactVerificationContext context) { context.verifyInteraction(); }

    // The consumer said "given order 42 exists" - set up that world here.
    @State("order 42 exists")
    void order42Exists() {
        when(orders.findById("42")).thenReturn(Optional.of(new Order("42", "PAID", 2599)));
    }
}` },
    { lang: 'bash', title: 'CI gate: may this version be deployed? (Pact CLI)', code: `# Run in the consumer's pipeline after publishing the pact, and again before deploying.
pact-broker can-i-deploy \\
  --pacticipant web-checkout --version "$GIT_COMMIT" \\
  --to-environment production \\
  --retry-while-unknown 10 --retry-interval 15
# Exit code 0 = every provider verified this version's contract. Non-zero = do NOT deploy.
# Broker URL and token are read from PACT_BROKER_BASE_URL / PACT_BROKER_TOKEN (CI secrets).` },
    { lang: 'js', run: true, title: 'A tiny contract verifier you can run (JavaScript)', code: `// The consumer's contract: which fields it reads and their types.
var contract = {
  request: 'GET /orders/42',
  status: 200,
  body: { id: 'string', status: 'string', totalCents: 'number' }
};

// Check one real provider response against the contract.
function verify(contract, response) {
  var problems = [];
  if (response.status !== contract.status) problems.push('status ' + response.status + ' != ' + contract.status);
  Object.keys(contract.body).forEach(function (field) {
    if (!(field in response.body)) problems.push('missing field "' + field + '"');
    else if (typeof response.body[field] !== contract.body[field])
      problems.push('field "' + field + '" is ' + typeof response.body[field] + ', expected ' + contract.body[field]);
  });
  return problems;   // extra fields are fine: the consumer does not read them
}

var providerVersions = {
  'v1 (current)':            { status: 200, body: { id: '42', status: 'PAID', totalCents: 2599 } },
  'v2 adds a new field':     { status: 200, body: { id: '42', status: 'PAID', totalCents: 2599, currency: 'USD' } },
  'v3 renames totalCents':   { status: 200, body: { id: '42', status: 'PAID', total_amount: 2599 } },
  'v4 totalCents -> string': { status: 200, body: { id: '42', status: 'PAID', totalCents: '2599' } },
  'v5 order not found':      { status: 404, body: {} }
};

Object.keys(providerVersions).forEach(function (name) {
  var problems = verify(contract, providerVersions[name]);
  console.log((problems.length ? 'BREAKS  ' : 'SAFE    ') + name + (problems.length ? '  -> ' + problems.join('; ') : ''));
});` }
  ],
  codeTitle: ['Consumer Pact test', 'Pact file', 'Provider verification', 'can-i-deploy gate', 'Contract verifier (runnable)'],
  viz: {
    title: 'Contract test flow: consumer -> pact -> provider',
    input: 'totalCents',
    inputLabel: 'Field name the provider returns today (the consumer expects totalCents)',
    gen: function (input) {
      var field = String(input).trim();
      if (!/^[A-Za-z_][A-Za-z0-9_]{0,24}$/.test(field)) throw new Error('Enter one field name, e.g. totalCents or total_amount');
      var ok = field === 'totalCents';
      var frames = [];
      frames.push({ narr: '<b>Step 1 - Consumer test.</b> The web app team writes: "When I call <code>GET /orders/42</code> I need <code>id</code>, <code>status</code> and <code>totalCents</code>." Pact starts a mock provider that answers exactly that.', parts: [
        { type: 'queue', label: 'Contract journey', frontLabel: 'start', backLabel: 'later', items: ['Consumer test'], hl: { 0: 'cur' } },
        { type: 'text', html: 'Expectation: <code>200 {id, status, totalCents:number}</code>' }
      ] });
      frames.push({ narr: '<b>Step 2 - Pact file.</b> The consumer code passes against the mock, so Pact writes <code>web-checkout-orders-service.json</code>. This file <i>is</i> the contract.', parts: [
        { type: 'queue', label: 'Contract journey', frontLabel: 'start', backLabel: 'later', items: ['Consumer test', 'pact.json'], hl: { 0: 'done', 1: 'ok' } }
      ] });
      frames.push({ narr: '<b>Step 3 - Publish.</b> CI uploads the pact to the Pact Broker tagged with the consumer version and branch. The provider team can now see exactly what this consumer relies on.', parts: [
        { type: 'queue', label: 'Contract journey', frontLabel: 'start', backLabel: 'later', items: ['Consumer test', 'pact.json', 'Pact Broker'], hl: { 0: 'done', 1: 'done', 2: 'ok' } }
      ] });
      frames.push({ narr: '<b>Step 4 - Provider verification.</b> The Orders pipeline downloads the pact, sets the state <i>"order 42 exists"</i>, starts the real Orders service and replays <code>GET /orders/42</code>. It returns a body containing <code>' + field + '</code>.', parts: [
        { type: 'queue', label: 'Contract journey', frontLabel: 'start', backLabel: 'later', items: ['Consumer test', 'pact.json', 'Pact Broker', 'Provider replay'], hl: { 0: 'done', 1: 'done', 2: 'done', 3: 'cur' } },
        { type: 'table', label: 'Real response vs contract', columns: ['Field', 'Contract wants', 'Provider sent'], rows: [['id', 'string', 'string'], ['status', 'string', 'string'], ['totalCents', 'number', ok ? 'number' : 'MISSING (sent "' + field + '")']], hl: ok ? { 2: 'ok' } : { 2: 'bad' } }
      ] });
      if (ok) {
        frames.push({ narr: '<span class="c-g">Verification passed.</span> Every field the consumer reads is present with the right type. The result is published back to the broker.', parts: [
          { type: 'queue', label: 'Contract journey', frontLabel: 'start', backLabel: 'later', items: ['Consumer test', 'pact.json', 'Pact Broker', 'Provider replay', 'Verified'], hl: { 4: 'ok' } }
        ] });
        frames.push({ narr: '<b>Step 5 - can-i-deploy.</b> Before releasing, either team asks the broker. All contracts verified -> <span class="c-g">yes, deploy</span>. Try typing <code>total_amount</code> above to see the failure path.', parts: [
          { type: 'queue', label: 'Contract journey', frontLabel: 'start', backLabel: 'later', items: ['Verified', 'can-i-deploy: YES', 'Deploy'], hl: { 1: 'ok', 2: 'ok' } }
        ] });
      } else {
        frames.push({ narr: '<span class="c-r">Verification FAILED in the provider\'s own build.</span> The consumer needs <code>totalCents</code> but the provider now sends <code>' + field + '</code>. The Orders team learns this before merging - and sees which consumer would break.', parts: [
          { type: 'queue', label: 'Contract journey', frontLabel: 'start', backLabel: 'later', items: ['Consumer test', 'pact.json', 'Pact Broker', 'Provider replay', 'FAILED'], hl: { 4: 'bad' } }
        ] });
        frames.push({ narr: '<b>Step 5 - can-i-deploy says NO.</b> The rename is blocked. Safe options: keep both fields for a while (expand), let the consumer move to the new name and publish a new pact, then remove the old field (contract) - the <b>expand/contract</b> pattern.', parts: [
          { type: 'queue', label: 'Contract journey', frontLabel: 'start', backLabel: 'later', items: ['FAILED', 'can-i-deploy: NO', 'Release blocked'], hl: { 0: 'bad', 1: 'bad', 2: 'bad' } }
        ] });
      }
      return frames;
    }
  },
  examples: [
    { title: 'Breaking vs safe API changes (what the contract catches)', html: `${H.table(['Provider change', 'Breaks a consumer that reads <code>totalCents</code>?', 'Contract result'], [
      ['Add field <code>currency</code>', 'No', '<span class="c-g">pass</span>'],
      ['Rename <code>totalCents</code> to <code>total</code>', 'Yes', '<span class="c-r">fail - blocked</span>'],
      ['Change <code>totalCents</code> from number to string', 'Yes', '<span class="c-r">fail - type matcher</span>'],
      ['Remove a field no consumer lists', 'No', '<span class="c-g">pass - safe to delete</span>'],
      ['Return 404 instead of 200 for a known order', 'Yes', '<span class="c-r">fail - status</span>']
    ])}<p>This is why a contract can prove "this field is unused, delete it" - something no unit test can.</p>` },
    { title: 'Provider states: making the real service ready', html: `<p>The contract says "given order 42 exists". The provider test has a <code>@State("order 42 exists")</code> method that inserts or stubs that order. States are <b>names</b>, not code, so the consumer team does not need to know how the provider stores data. Keep a small, stable list of states ("order 42 exists", "no orders exist", "order 42 is cancelled").</p>` },
    { title: 'Message contract for a Kafka event', html: `<p>Consumer <code>Billing</code> reads the event <code>OrderPlaced</code> from topic <code>orders.v1</code> and uses <code>orderId</code> and <code>totalCents</code>. With a message pact the consumer test feeds a sample message to its handler and records the expected JSON; the Orders producer test generates its real message and verifies it matches. Same idea, no HTTP.</p>`,
      code: { lang: 'java', check: false, code: `@Pact(consumer = "billing")
V4Pact orderPlaced(MessagePactBuilder builder) {
    return builder.expectsToReceive("an OrderPlaced event")
        .withContent(new PactDslJsonBody()
            .stringType("orderId", "42")
            .integerType("totalCents", 2599))
        .toPact();
}` } },
    { title: 'Choosing: Pact vs Spring Cloud Contract vs OpenAPI diff', html: `<p><b>Pact</b>: consumer-driven, polyglot (JVM, JS, Go, Python, .NET), great for many consumers owned by different teams. <b>Spring Cloud Contract</b>: provider writes the contract and generates stubs; ideal when one team owns both sides or the provider leads the API. <b>OpenAPI diff / schema checks</b>: lowest effort, catches structural breaks, but cannot tell which consumer uses which field. Many teams combine OpenAPI linting for public APIs with Pact for internal service-to-service calls.</p>` }
  ],
  deepDive: `<p><b>Pending pacts and WIP pacts.</b> A brand-new consumer pact must not break the provider's main build the moment it is published. The broker marks it <i>pending</i> until it is verified once successfully; <i>work-in-progress</i> pacts from feature branches are verified without failing the provider build. This keeps the process friendly.</p>
  <p><b>Versioning and environments.</b> Record deployments with <code>pact-broker record-deployment</code> so the broker knows which version is in <code>production</code>. <code>can-i-deploy --to-environment production</code> then checks compatibility with what is <i>actually deployed</i>, not "latest". Use the git SHA as the version, branch names as branches.</p>
  <p><b>Breaking changes done right: expand and contract.</b> (1) Provider <b>adds</b> the new field while still sending the old one. (2) Consumers migrate and publish new pacts. (3) When no verified pact reads the old field, the provider <b>removes</b> it. The same applies to database columns and event schemas. Combine with API versioning only for truly incompatible changes.</p>
  <p><b>Postel's law &amp; tolerant readers.</b> "Be liberal in what you accept." Consumers should ignore unknown fields (configure Jackson with <code>FAIL_ON_UNKNOWN_PROPERTIES=false</code>) and contracts should match types, not exact values. Overspecified contracts (exact timestamps, full response bodies) create noise and make providers fight consumers.</p>
  <p><b>What contracts cannot catch.</b> Semantic changes with the same shape (price now in dollars rather than cents), performance regressions, auth/config differences between environments, ordering in async flows. Keep a few E2E smoke tests and good monitoring for those.</p>
  <p><b>Ownership and process.</b> Contract tests only work if the provider team treats a failing verification as a real signal and talks to the consumer team. Put the broker URL in the PR checks, add webhooks so a new pact triggers a provider build, and review the contract list when you design API changes.</p>
  <p><b>Security.</b> Pact files can contain sample data - never real customer data, tokens or secrets. Broker credentials come from CI secret stores, never from the repository.</p>`,
  aiEra: `<p><b>What AI changes:</b> AI can draft Pact tests from an OpenAPI spec or from the consumer's client code, and summarise a failing verification ("field <code>totalCents</code> removed - consumers: web-checkout, mobile-app"). That makes contract testing cheaper to adopt.</p>
  <p><b>Use AI as a partner:</b> <code>Here is my client class and its DTO. Write a Pact consumer test that lists only the fields the client really reads, matching on type</code>. Or: <code>Given this OpenAPI diff, which changes are breaking for consumers that only read id and totalCents?</code>. LLM-based agents also call APIs; their tool schemas (function-calling / MCP) are contracts too - they deserve the same compatibility checks.</p>
  <p><b>Where AI goes wrong:</b> it copies the entire response body into the contract (overspecified, brittle), uses exact values instead of type matchers, invents provider states, and may generate a provider verification that mocks the very thing being verified so it can never fail.</p>
  <p><b>What you must still own:</b> deciding the minimal set of fields a consumer truly needs, the compatibility policy (expand/contract, deprecation windows), and the cultural agreement between teams. Be ready to argue in an interview when contracts beat E2E - and when they do not.</p>`,
  problems: [
    {
      title: 'Design a Consumer-Driven Contract for an Orders API',
      level: 'Medium', tags: ['pact', 'contract testing', 'microservices'], companies: ['Zalando', 'ThoughtWorks'],
      statement: `<p>The <b>Mobile app</b> and the <b>Billing service</b> both call the <b>Orders service</b>. Mobile uses <code>GET /orders/{id}</code> (reads <code>id</code>, <code>status</code>, <code>items[].sku</code>). Billing reads the same endpoint but only <code>id</code> and <code>totalCents</code>. Orders now wants to (a) add <code>currency</code>, (b) rename <code>totalCents</code> to <code>total</code>, (c) delete the unused <code>legacyRef</code> field.</p>
        <p>Design the contract testing set-up: what each consumer's pact contains, what provider states are needed, how the provider verifies, what the CI gates look like, and how each of the three changes is rolled out safely.</p>`,
      constraints: `Three teams, independent deploys, Java services, a Pact Broker is available. No shared E2E environment. Contracts must not contain real customer data.`,
      example: `<p>Mobile pact: <code>GET /orders/42</code> given <i>order 42 exists</i> -> 200 with ${H.c('b', 'id:string, status:string, items:[{sku:string}]')}. Billing pact: same request -> 200 with ${H.c('b', 'id:string, totalCents:integer')}.</p><p>Result: adding <code>currency</code> ${H.c('g', 'passes')}; renaming <code>totalCents</code> ${H.c('r', 'fails Billing')}; deleting <code>legacyRef</code> ${H.c('g', 'passes - nobody lists it')}.</p>`,
      brute: { why: `<p>Spin up all three services in a shared "integration" environment and run end-to-end scenarios after each merge. It is slow, a red result does not tell which team caused it, environments drift, and teams queue for the environment. A cheaper but weaker alternative - each consumer mocks Orders in unit tests - never verifies that the mock matches the real Orders service.</p>` },
      mcq: { q: 'Orders wants to rename totalCents to total. What is the safest rollout?', options: ['Rename it and tell Billing in Slack', 'Add total next to totalCents, let Billing migrate and publish a new pact, then remove totalCents when no pact uses it', 'Version the whole API to /v2 immediately', 'Disable the Billing contract test'], answer: 1, explain: 'Expand and contract: add the new field, migrate consumers (verified by new pacts), and only then remove the old field once can-i-deploy shows nobody relies on it.' },
      hints: [
        `<p>The aha: each consumer writes its <b>own</b> pact containing only the fields <i>it</i> reads. The provider must satisfy the union of all pacts.</p>`,
        `<p>Use a provider state like "order 42 exists" so the real Orders service can answer; match with types (<code>stringType</code>, <code>integerType</code>) rather than exact values.</p>`,
        `<p>Recipe: consumer pipeline = test -> publish pact -> can-i-deploy. Provider pipeline = verify all pacts from the broker (including pending/WIP) -> record deployment. Rollout of breaking changes = expand, migrate, contract.</p>`
      ],
      solution: {
        approach: `<p><b>1. Consumer contracts.</b> Mobile and Billing each add a Pact consumer test around their real <code>OrdersClient</code>. Mobile's interaction expects <code>id</code>, <code>status</code> and <code>items[].sku</code> (use <code>eachLike</code> with a type matcher for the array); Billing's expects <code>id</code> and <code>totalCents</code> (integer matcher). Both use the provider state <i>order 42 exists</i> and nothing else; neither lists fields it ignores, and both clients are configured to ignore unknown properties. Pacts are published to the broker with the git SHA and branch.</p>
          <p><b>2. Provider verification.</b> The Orders pipeline runs a Spring Boot test on a random port that pulls all current pacts (main branches of consumers plus pending/WIP) from the broker. A <code>@State("order 42 exists")</code> method stubs the repository to return a fixed order. Each interaction is replayed over real HTTP, so serialization, filters and status codes are tested for real. Results are published back with the provider version.</p>
          <p><b>3. Gates.</b> On every pull request: unit tests, integration tests, then pact verification. Before deploy each service runs <code>can-i-deploy --to-environment production</code>; after deploy <code>record-deployment</code>. Webhooks trigger a provider build whenever a consumer publishes a changed pact.</p>
          <p><b>4. Rolling out the changes.</b> (a) Adding <code>currency</code> is non-breaking: verification passes immediately. (b) Renaming: first <i>expand</i> - send both <code>totalCents</code> and <code>total</code>; Billing changes its client and pact to read <code>total</code> and deploys; when the broker shows no deployed consumer version's pact still lists <code>totalCents</code>, <i>contract</i> - remove it. Trying to rename in one step makes Billing's pact fail in Orders' build, which blocks the change - exactly what we want. (c) <code>legacyRef</code> appears in no pact, so it can be deleted after confirming in the broker and in access logs.</p>
          <p><b>5. Safety &amp; hygiene.</b> Contract data is synthetic, broker tokens come from CI secrets, and a couple of E2E smoke tests still cover semantic problems (e.g. cents vs dollars) that shape-checks cannot see.</p>`,
        code: { lang: 'java', check: false, code: `// Billing's consumer pact: ONLY the two fields Billing reads.
@Pact(consumer = "billing-service")
V4Pact orderForBilling(PactDslWithProvider builder) {
    return builder
        .given("order 42 exists")
        .uponReceiving("billing reads order 42")
            .method("GET").path("/orders/42")
        .willRespondWith()
            .status(200)
            .body(new PactDslJsonBody()
                .stringType("id", "42")
                .integerType("totalCents", 2599))
        .toPact(V4Pact.class);
}

// Mobile's consumer pact: different fields, same endpoint.
@Pact(consumer = "mobile-app")
V4Pact orderForMobile(PactDslWithProvider builder) {
    return builder
        .given("order 42 exists")
        .uponReceiving("mobile reads order 42")
            .method("GET").path("/orders/42")
        .willRespondWith()
            .status(200)
            .body(new PactDslJsonBody()
                .stringType("id", "42")
                .stringType("status", "PAID")
                .eachLike("items", 1).stringType("sku", "SKU-1").closeObject().closeArray())
        .toPact(V4Pact.class);
}` },
        complexity: `<p>Cost: one consumer test per integration (50-300 ms each) and one provider replay per pact interaction (a few ms plus app start about 5 s). Value: O(consumers) cheap checks replace one O(services) shared environment.</p>`,
        followUps: ['How do you contract-test a Kafka event the same way?', 'What do you do when a consumer team is unresponsive and blocks a removal?', 'How do you version contracts when a mobile app version stays in the wild for a year?']
      }
    }
  ]
});

/* ============================ TOPIC 5: CLEAN + HEXAGONAL ============================ */
topics.push({
  title: 'Clean Architecture and Hexagonal Ports and Adapters',
  analogy: `<p>Think of a <b>laptop</b>. The motherboard (your business rules) has standard <b>sockets</b>: USB-C, HDMI, headphone jack. It does not care whether you plug in a mouse, a monitor or a speaker from any brand. The socket shape is the <b>port</b>; the cable or device that fits it is the <b>adapter</b>. If you swap the mouse, you do not re-solder the motherboard. Now imagine a laptop where the mouse is soldered into the motherboard - changing it means rebuilding everything. A "fat controller" that mixes HTTP, SQL and business rules is that soldered mouse.</p>`,
  explain: `<p><b>The core idea in one line:</b> keep your <b>business rules in the middle</b>, and make everything else (web framework, database, message broker, third-party APIs) a <b>replaceable detail on the outside</b>. Source-code dependencies point <b>inward only</b>: the core never imports Spring, JPA, Kafka or Stripe.</p>
  <p>🟢 <b>Three names, one idea.</b></p>
  <ul>
    <li><b>Hexagonal architecture / Ports &amp; Adapters</b> (Alistair Cockburn, 2005): the application is a hexagon. <b>Ports</b> are interfaces on its edge. <b>Adapters</b> plug into ports.</li>
    <li><b>Onion architecture</b> (Jeffrey Palermo): concentric rings, domain in the centre.</li>
    <li><b>Clean architecture</b> (Robert C. Martin): rings are Entities -> Use cases -> Interface adapters -> Frameworks &amp; drivers; the <i>dependency rule</i>: only point inwards.</li>
  </ul>
  <p>🔵 <b>Two kinds of ports</b></p>
  ${H.table(['', 'Driving (inbound / primary)', 'Driven (outbound / secondary)'], [
    ['Who calls whom?', 'The outside world calls <b>into</b> your app', 'Your app calls <b>out</b> to something'],
    ['Port is', 'A use-case interface: <code>PlaceOrderUseCase</code>', 'An interface the core needs: <code>OrderRepository</code>, <code>PaymentGateway</code>'],
    ['Who implements the port?', 'The <b>application service</b> (inside)', 'An <b>adapter</b> (outside): JPA, REST client, Kafka'],
    ['Adapter examples', 'REST controller, CLI, message listener, scheduled job, test code', 'JpaOrderRepository, StripePaymentAdapter, InMemoryOrderRepository'],
    ['Who defines the interface?', 'The core', '<b>The core</b> (dependency inversion!)']
  ])}
  <p><b>Dependency inversion is the trick.</b> Normally "service calls repository" makes the domain depend on the database code. Instead the domain <i>defines</i> <code>OrderRepository</code> and the JPA class <i>implements</i> it. Now the arrow of source-code dependency points from the adapter <b>into</b> the core, even though at run time the data flows outward.</p>
  <p><b>Typical package layout</b> (Java):</p>
  <pre>com.shop.orders
  domain/          Order, Money, OrderStatus      (pure Java, no frameworks)
  application/     PlaceOrderUseCase, OrderService, ports/ OrderRepository, PaymentGateway
  adapter/in/web/  OrderController, OrderRequest (DTO)
  adapter/out/db/  JpaOrderRepository, OrderEntity
  adapter/out/pay/ StripePaymentAdapter
  config/          wiring (Spring @Configuration)</pre>
  <p><b>Why bother?</b> (1) <b>Testability</b>: the core is tested with in-memory adapters - no Spring, no DB, millisecond tests. (2) <b>Replaceability</b>: swap Postgres for DynamoDB or REST for gRPC by writing one adapter. (3) <b>Deferred decisions</b>: you can build and test the rules before choosing the database. (4) <b>Clarity</b>: rules live in one place.</p>
  <p>🔴 <b>The fat controller smell.</b> A controller that parses JSON, runs SQL via <code>JdbcTemplate</code>, calls Stripe, applies discount rules and builds the response. It cannot be unit-tested without a server and a DB, and every change touches everything. The cure is the refactor you will do in the practice problem.</p>
  <p><b>Don't over-engineer.</b> For a 3-endpoint CRUD service, a plain controller -> service -> repository layering is fine. Hexagonal pays off when there is real domain logic, several integrations, or long product life. Do not create an interface for every class; create ports only at real boundaries.</p>`,
  clues: [
    '"How do you keep business logic independent of frameworks?" -> ports and adapters, dependency rule, domain with no Spring imports',
    '"We want to swap the database / payment provider later" -> output port + adapter; one new class, core untouched',
    '"Controller has 300 lines with SQL and if-else rules" -> fat controller; extract use case + ports',
    '"How do you test business logic without a database?" -> in-memory adapter (fake) behind a port',
    '"Where does validation / mapping / transaction go?" -> input validation + DTO mapping in the inbound adapter, rules in domain, transaction boundary at the use case',
    '"Domain depends on JPA annotations" -> dependency rule violated; separate entity from domain model or accept the trade-off consciously'
  ],
  code: [
    { lang: 'java', title: 'Port + in-memory adapter + domain service (compiles and runs)', code: `import java.util.*;

// ---------- DOMAIN (no framework imports anywhere in this section) ----------
record Order(String id, String riderId, long totalCents, String status) {
    Order markPaid() { return new Order(id, riderId, totalCents, "PAID"); }
}

// ---------- APPLICATION: ports owned by the core ----------
/** Driving port (inbound): what the outside world may ask us to do. */
interface PlaceOrderUseCase {
    String place(String riderId, long totalCents);
}
/** Driven port (outbound): what the core needs from the outside. */
interface OrderRepository {
    void save(Order order);
    Optional<Order> findById(String id);
}
interface PaymentGateway {
    boolean charge(String riderId, long cents);
}

/** Application service implements the inbound port and USES the outbound ports. */
class OrderService implements PlaceOrderUseCase {
    private final OrderRepository orders;
    private final PaymentGateway payments;
    private int next = 1;

    OrderService(OrderRepository orders, PaymentGateway payments) { this.orders = orders; this.payments = payments; }

    public String place(String riderId, long totalCents) {
        if (totalCents <= 0) throw new IllegalArgumentException("total must be positive");   // business rule
        String id = "ord-" + next++;
        Order order = new Order(id, riderId, totalCents, "NEW");
        orders.save(order);
        if (payments.charge(riderId, totalCents)) orders.save(order.markPaid());
        return id;
    }
}

// ---------- ADAPTERS (outside the hexagon) ----------
/** Driven adapter #1: in-memory, perfect for tests and local demos. */
class InMemoryOrderRepository implements OrderRepository {
    private final Map<String, Order> rows = new HashMap<>();
    public void save(Order order) { rows.put(order.id(), order); }
    public Optional<Order> findById(String id) { return Optional.ofNullable(rows.get(id)); }
}
/** Driven adapter #2: a fake payment provider that always approves (or always declines). */
class FakePaymentGateway implements PaymentGateway {
    private final boolean approve;
    FakePaymentGateway(boolean approve) { this.approve = approve; }
    public boolean charge(String riderId, long cents) { return approve; }
}
/** Driving adapter: translates "HTTP-ish" text into a use-case call (a real one would be a Spring controller). */
class OrderCli {
    private final PlaceOrderUseCase useCase;
    OrderCli(PlaceOrderUseCase useCase) { this.useCase = useCase; }
    String handle(String line) {                       // e.g. "rider-1 2599"
        String[] parts = line.split(" ");
        try { return "201 " + useCase.place(parts[0], Long.parseLong(parts[1])); }
        catch (IllegalArgumentException e) { return "400 " + e.getMessage(); }
    }
}

class HexagonDemo {
    public static void main(String[] args) {
        InMemoryOrderRepository repo = new InMemoryOrderRepository();
        OrderCli cli = new OrderCli(new OrderService(repo, new FakePaymentGateway(true)));   // wiring = composition root
        System.out.println(cli.handle("rider-1 2599"));       // 201 ord-1
        System.out.println(cli.handle("rider-1 0"));          // 400 total must be positive
        System.out.println(repo.findById("ord-1").get());     // status PAID
    }
}` },
    { lang: 'java', check: false, title: 'Spring wiring: the only place that knows both sides', code: `@Configuration
class OrdersConfig {
    @Bean
    PlaceOrderUseCase placeOrderUseCase(OrderRepository repo, PaymentGateway gateway) {
        return new OrderService(repo, gateway);       // core is plain Java, Spring just wires it
    }
}

@RestController
@RequestMapping("/orders")
class OrderController {                                // driving adapter
    private final PlaceOrderUseCase useCase;
    OrderController(PlaceOrderUseCase useCase) { this.useCase = useCase; }

    @PostMapping
    ResponseEntity<Void> place(@Valid @RequestBody PlaceOrderRequest req) {
        String id = useCase.place(req.riderId(), req.totalCents());     // translate DTO -> use-case call, nothing more
        return ResponseEntity.created(URI.create("/orders/" + id)).build();
    }
}

@Repository
class JpaOrderRepositoryAdapter implements OrderRepository {   // driven adapter
    private final SpringDataOrderJpa jpa;
    JpaOrderRepositoryAdapter(SpringDataOrderJpa jpa) { this.jpa = jpa; }
    public void save(Order o) { jpa.save(OrderEntity.from(o)); }
    public Optional<Order> findById(String id) { return jpa.findById(id).map(OrderEntity::toDomain); }
}` },
    { lang: 'java', check: false, title: 'ArchUnit: make the dependency rule fail the build', code: `@AnalyzeClasses(packages = "com.shop.orders")
class ArchitectureTest {

    @ArchTest
    static final ArchRule domainIsFrameworkFree =
        noClasses().that().resideInAPackage("..domain..")
            .should().dependOnClassesThat().resideInAnyPackage(
                "org.springframework..", "jakarta.persistence..", "..adapter..");

    @ArchTest
    static final ArchRule layersPointInward =
        layeredArchitecture().consideringOnlyDependenciesInLayers()
            .layer("Domain").definedBy("..domain..")
            .layer("Application").definedBy("..application..")
            .layer("Adapters").definedBy("..adapter..")
            .whereLayer("Domain").mayOnlyBeAccessedByLayers("Application", "Adapters")
            .whereLayer("Application").mayOnlyBeAccessedByLayers("Adapters")
            .whereLayer("Adapters").mayNotBeAccessedByAnyLayer();
}` }
  ],
  codeTitle: ['Hexagon in plain Java', 'Spring wiring + adapters', 'ArchUnit rules'],
  viz: [
    {
      title: 'Hexagon: one request travels through the ports',
      gen: function () {
        var nodes = [
          { id: 'C', label: 'Client (mobile app)', x: 9, y: 28, shape: 'box', w: 17 },
          { id: 'W', label: 'REST adapter (driving)', x: 29, y: 28, shape: 'box', w: 20 },
          { id: 'IP', label: 'Port: PlaceOrderUseCase', x: 49, y: 8, shape: 'box', w: 22 },
          { id: 'D', label: 'DOMAIN CORE (OrderService, Order)', x: 52, y: 28, shape: 'box', w: 30 },
          { id: 'OP', label: 'Port: OrderRepository', x: 52, y: 48, shape: 'box', w: 22 },
          { id: 'J', label: 'JPA adapter (driven)', x: 78, y: 48, shape: 'box', w: 20 },
          { id: 'DB', label: 'Postgres', x: 92, y: 28, shape: 'box', w: 12 },
          { id: 'PG', label: 'Port: PaymentGateway', x: 78, y: 8, shape: 'box', w: 20 }
        ];
        var edges = [['C', 'W', 'POST /orders'], ['W', 'IP', 'calls'], ['IP', 'D'], ['D', 'OP', 'save()'], ['OP', 'J'], ['J', 'DB', 'SQL'], ['D', 'PG', 'charge()']];
        function g(hl, ehl, tags) { return { type: 'graph', label: 'Inside the hexagon vs outside', directed: true, height: 58, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} }; }
        return [
          { narr: 'The <b>domain core</b> (middle) holds the rules. Around it are <b>ports</b> (interfaces) and, outside, <b>adapters</b> (framework code). Let us follow one request.', parts: [g({ D: 'sel', IP: 'win', OP: 'win', PG: 'win' }, {}, { D: 'rules live here' })] },
          { narr: '<b>1.</b> A mobile client sends <code>POST /orders</code>. It knows nothing about our internals.', parts: [g({ C: 'cur' }, {})] },
          { narr: '<b>2.</b> The <b>REST adapter</b> (driving adapter) parses JSON, validates the shape, and turns the DTO into plain arguments. No business rules here.', parts: [g({ C: 'done', W: 'cur' }, { 'C-W': 'ok' })] },
          { narr: '<b>3.</b> It calls the <b>inbound port</b> <code>PlaceOrderUseCase</code>. The controller depends on this interface, not on the service class.', parts: [g({ W: 'done', IP: 'cur' }, { 'C-W': 'ok', 'W-IP': 'ok' })] },
          { narr: '<b>4.</b> The <b>application service</b> in the core runs the business rules: total must be positive, build the <code>Order</code>.', parts: [g({ IP: 'done', D: 'cur' }, { 'C-W': 'ok', 'W-IP': 'ok', 'IP-D': 'ok' })] },
          { narr: '<b>5.</b> The core needs to store the order. It calls its own <b>outbound port</b> <code>OrderRepository.save()</code>. It has no idea JPA exists.', parts: [g({ D: 'done', OP: 'cur' }, { 'C-W': 'ok', 'W-IP': 'ok', 'IP-D': 'ok', 'D-OP': 'ok' })] },
          { narr: '<b>6.</b> The <b>JPA adapter</b> implements that port, maps domain to entity, and runs SQL against Postgres. In tests we plug an in-memory adapter into the same port instead.', parts: [g({ OP: 'done', J: 'cur', DB: 'ok' }, { 'C-W': 'ok', 'W-IP': 'ok', 'IP-D': 'ok', 'D-OP': 'ok', 'OP-J': 'ok', 'J-DB': 'ok' })] },
          { narr: '<b>7.</b> Payment goes the same way via <code>PaymentGateway</code>. Swapping Stripe for Adyen = write one new adapter. The response travels back along the same path as a 201.', parts: [g({ D: 'cur', PG: 'ok' }, { 'D-PG': 'ok', 'C-W': 'ok', 'W-IP': 'ok', 'IP-D': 'ok' })] }
        ];
      }
    },
    {
      title: 'Dependency direction: only inward, and a violation',
      gen: function () {
        var nodes = [
          { id: 'WEB', label: 'Web adapter', x: 14, y: 8, shape: 'box', w: 18 },
          { id: 'DBA', label: 'JPA adapter', x: 14, y: 40, shape: 'box', w: 18 },
          { id: 'APP', label: 'Application (use cases + ports)', x: 52, y: 24, shape: 'box', w: 30 },
          { id: 'DOM', label: 'Domain (entities, rules)', x: 86, y: 24, shape: 'box', w: 24 }
        ];
        function g(edges, hl, ehl, tags) { return { type: 'graph', label: 'Source-code dependencies (arrow = "imports / knows about")', directed: true, height: 50, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} }; }
        var good = [['WEB', 'APP'], ['DBA', 'APP'], ['APP', 'DOM']];
        var goodE = { 'WEB-APP': 'ok', 'DBA-APP': 'ok', 'APP-DOM': 'ok' };
        return [
          { narr: 'The rule: <b>arrows point inward</b>. Outer rings (adapters) know about inner rings (application, domain). The inner rings know <b>nothing</b> about the outer ones.', parts: [g(good, { DOM: 'sel' }, goodE)] },
          { narr: 'Notice the JPA adapter points <b>at</b> the application: it implements the <code>OrderRepository</code> interface that the application owns. That is dependency inversion in one arrow.', parts: [g(good, { DBA: 'cur', APP: 'win' }, { 'DBA-APP': 'ok' }, { APP: 'owns OrderRepository' })] },
          { narr: 'Now a developer is in a hurry and writes <code>import jakarta.persistence.Entity</code> in the domain class, or calls <code>JpaOrderRepository</code> directly from a domain rule. A new arrow appears: <b>Domain -> JPA adapter</b>.', parts: [g(good.concat([['DOM', 'DBA']]), { DOM: 'bad', DBA: 'bad' }, { 'DOM-DBA': 'bad' }, { DOM: 'violation' })] },
          { narr: 'Why is that bad? The core now needs the database library to compile and to be tested. Changing the persistence code can break business rules, and you can no longer test the domain in milliseconds.', parts: [g(good.concat([['DOM', 'DBA']]), { DOM: 'bad' }, { 'DOM-DBA': 'bad' }, { DOM: 'needs JPA to compile' })] },
          { narr: '<b>Fix:</b> define an interface (<code>OrderRepository</code>) in the application ring, let the domain/application depend on <i>that</i>, and make the JPA adapter implement it. The bad arrow is gone.', parts: [g(good, { DBA: 'ok', APP: 'ok', DOM: 'sel' }, goodE)] },
          { narr: '<b>Keep it fixed:</b> an ArchUnit test fails the build if a class in <code>..domain..</code> imports <code>..adapter..</code> or <code>org.springframework..</code>. Rules you do not automate will be broken under deadline pressure.', parts: [g(good, { DOM: 'sel' }, goodE, { DOM: 'ArchUnit guards' })] }
        ];
      }
    }
  ],
  examples: [
    { title: 'Swapping an adapter without touching the core', html: `<p>Today <code>StripePaymentAdapter</code> implements <code>PaymentGateway</code>. Procurement picks Adyen. You write <code>AdyenPaymentAdapter</code>, change one line in the configuration class, run the same contract test against both adapters. <code>OrderService</code> and all its unit tests are untouched - that is the payoff.</p>` },
    { title: 'Driving adapters: one core, many front doors', html: `<p>The same <code>PlaceOrderUseCase</code> is called by a REST controller, a Kafka listener (<code>OrderRequested</code> events), a nightly batch job, and a CLI admin tool. Each adapter handles its own translation and error mapping (HTTP 400, dead-letter queue, exit code) and calls the one use case. Rules exist once.</p>` },
    { title: 'Where does the @Transactional go?', html: `<p>Put it on the <b>use case</b> (application service) method, not on the controller or the repository adapter. The use case is the unit of work: "place order" either fully happens or not. If you want the core free of Spring, wrap it in a small decorator or configure transactions on the bean in the config class.</p>` },
    { title: 'Domain model vs JPA entity', html: `<p>Purist: keep a separate <code>Order</code> (domain) and <code>OrderEntity</code> (JPA) and map between them in the adapter - cleaner core, extra mapping code. Pragmatic: annotate the domain class with JPA annotations and accept that "domain depends on <code>jakarta.persistence</code>" (an annotations-only dependency). Choose consciously, write the decision down (ADR), and enforce it with ArchUnit.</p>` }
  ],
  deepDive: `<p><b>Dependency rule and the Stable Dependencies Principle.</b> Depend in the direction of stability: volatile things (UI, frameworks, vendors) depend on stable things (business rules). The measurable version: package <i>instability</i> I = outgoing / (incoming + outgoing). The domain should have I close to 0.</p>
  <p><b>Use cases as the unit of design.</b> In Clean Architecture each use case is a class with an input model and output model ("request/response DTOs") so that the core does not return entities to the web layer. This avoids lazy-loading exceptions at the JSON layer and keeps the API shape independent of the schema.</p>
  <p><b>Common mistakes.</b> (1) Ports named after technology (<code>OrderJpaPort</code>) instead of capability (<code>OrderRepository</code>). (2) Passing HTTP types (<code>HttpServletRequest</code>) into the core. (3) One giant "service" interface with 30 methods - split by use case (interface segregation). (4) An anaemic domain: all logic in services, entities are bags of getters; prefer behaviour on the entity (<code>order.markPaid()</code>). (5) Mapper explosion - use records and small mapping methods; do not generate mapping layers for trivial CRUD.</p>
  <p><b>Modular monolith first.</b> Hexagonal structure per module (orders, billing, catalog) inside one deployable is often better than microservices on day one. Modules talk through each other's inbound ports or domain events, never through each other's tables. Spring Modulith checks this. Later, a module with a clean boundary can be extracted into a service.</p>
  <p><b>Testing implications.</b> Core: pure unit tests with in-memory adapters. Each driven adapter: integration test (Testcontainers) and a shared contract test with the in-memory one. Each driving adapter: slice test (<code>@WebMvcTest</code>) with the use case mocked. A very small number of full-stack tests proves wiring. This is the test pyramid expressed in architecture.</p>
  <p><b>Performance and pragmatism.</b> Ports add a virtual call and sometimes mapping - negligible compared with I/O. The real cost is cognitive: more files. For simple read endpoints (reports, search) many teams let a query adapter read the database directly (CQRS-style read models) and keep full hexagonal treatment for commands where rules matter.</p>
  <p><b>Events as ports.</b> Publishing a domain event (<code>OrderPaid</code>) through an outbound port <code>EventPublisher</code> decouples the core from Kafka/SNS. Combined with the transactional outbox pattern, adapters publish reliably after commit.</p>`,
  aiEra: `<p><b>What AI changes:</b> assistants are very good at the mechanical parts: extracting an interface, moving code between packages, writing the adapter and the mapper. That makes refactoring a fat controller a one-afternoon job. But AI tools tend to follow the existing structure - if the code is a ball of mud, generated code adds to it.</p>
  <p><b>Use AI as a partner:</b> <code>Here is a 200-line controller. List each responsibility it has (parsing, validation, rules, persistence, external calls) and propose ports. Do not write code yet.</code> Then review the proposed boundaries yourself. Put the architecture rules in your repository (<code>CLAUDE.md</code>/<code>AGENTS.md</code> and ArchUnit tests) so coding agents are told, and checked, to respect the dependency direction.</p>
  <p><b>Where AI goes wrong:</b> it imports <code>org.springframework</code> or JPA entities into the domain "for convenience", creates an interface for every class (needless ports), leaks DTOs into the core, or puts business rules back into the controller when asked to "add a field quickly". It also invents layers that your team never agreed on.</p>
  <p><b>What you must still own:</b> where the boundaries are, what is core vs detail, and the automated guardrails (ArchUnit, module checks) that keep generated code honest. Architecture is the part of the codebase that AI can break silently, so tests on structure matter more, not less.</p>`,
  problems: [
    {
      title: 'Refactor a Fat Controller into Hexagonal Ports and Adapters',
      level: 'Medium', tags: ['hexagonal', 'refactoring', 'dependency inversion', 'clean architecture'], companies: ['ThoughtWorks', 'Spotify'],
      statement: `<p>The <code>POST /orders</code> endpoint below is one 40-line controller method: it parses input, checks stock with a SQL query, applies a 10% discount for 10+ items, saves the order with SQL and charges a payment provider over HTTP. Nobody can test the discount rule without a database and a network.</p>
        <p>Refactor it into <b>ports and adapters</b>: identify the domain rule(s), define inbound and outbound ports, write the application service, write adapters (including in-memory versions), and show how you test the rule without Spring or a DB. Explain which dependency arrows must point where.</p>`,
      constraints: `Keep behaviour identical: quantity must be at least 1; stock must be sufficient; 10 or more units get 10% off; payment failure leaves the order PAYMENT_FAILED. Money in cents.`,
      example: `<p>Input: <code>POST /orders {sku:"SKU-1", qty:10}</code>, stock 50, unit price 1000.</p><p>Output: ${H.c('g', '201, total 9000, status PAID')}. With qty 100 and stock 50: ${H.c('r', '409 insufficient stock')}. With a declining card: ${H.c('y', 'order saved as PAYMENT_FAILED')}.</p>`,
      brute: { why: `<p>Everything in the controller: SQL via <code>JdbcTemplate</code>, rules inline, <code>RestTemplate</code> call to the payment API. To test the 10% rule you need a database with stock rows and a payment sandbox or MockServer, so the rule is covered by one slow test, if at all. Any change to the payment API or schema edits the same method that holds the business rule.</p>`,
        code: { lang: 'java', check: false, code: `@PostMapping("/orders")
ResponseEntity<?> place(@RequestBody Map<String, Object> body) {
    String sku = (String) body.get("sku");
    int qty = (Integer) body.get("qty");
    if (qty < 1) return ResponseEntity.badRequest().body("qty");
    Integer stock = jdbc.queryForObject("SELECT stock FROM items WHERE sku = ?", Integer.class, sku);   // SQL in controller
    if (stock == null || stock < qty) return ResponseEntity.status(409).body("insufficient stock");
    long unit = jdbc.queryForObject("SELECT price FROM items WHERE sku = ?", Long.class, sku);
    long total = unit * qty;
    if (qty >= 10) total = total - total / 10;                                                           // business rule hidden here
    jdbc.update("INSERT INTO orders(sku, qty, total, status) VALUES (?,?,?, 'NEW')", sku, qty, total);
    ResponseEntity<String> r = rest.postForEntity(paymentUrl + "/charge", Map.of("cents", total), String.class);  // HTTP in controller
    String status = r.getStatusCode().is2xxSuccessful() ? "PAID" : "PAYMENT_FAILED";
    jdbc.update("UPDATE orders SET status = ? WHERE sku = ? AND status = 'NEW'", status, sku);
    return ResponseEntity.status(201).body(Map.of("total", total, "status", status));
}` } },
      mcq: { q: 'Which statement about the refactored design is correct?', options: ['The domain imports the JPA repository class to save orders', 'The domain defines an OrderRepository interface and the JPA adapter implements it', 'The controller calls the database directly for speed', 'Ports are only needed for the database, not for payment'], answer: 1, explain: 'Dependency inversion: the interface lives with the core and the adapter implements it, so the source-code arrow points inward.' },
      hints: [
        `<p>The aha: list the controller's <b>responsibilities</b>: parse HTTP, check stock, price + discount, persist, charge. Only "price + discount + status decision" is business logic; the rest is I/O.</p>`,
        `<p>Create outbound ports for each external thing the core needs: <code>StockRepository</code> (stock + price), <code>OrderRepository</code>, <code>PaymentGateway</code>. Create one inbound port <code>PlaceOrderUseCase</code>.</p>`,
        `<p>Recipe: application service does validate -> check stock -> price -> save NEW -> charge -> save final status. Controller maps the HTTP body to a command and exceptions to 400/409. Wire everything in a config class. Test the service with in-memory adapters.</p>`
      ],
      solution: {
        approach: `<p><b>Step 1 - find the rule.</b> The valuable logic is: quantity at least 1, stock sufficient, 10% off at 10+ units, and "payment declined means PAYMENT_FAILED". Everything else (JSON, SQL, HTTP) is detail.</p>
          <p><b>Step 2 - ports.</b> Inbound: <code>PlaceOrderUseCase.place(sku, qty)</code> returning a result with total and status. Outbound: <code>CatalogPort</code> (stock and unit price), <code>OrderRepository</code> (save), <code>PaymentGateway</code> (charge, returns boolean). All interfaces live in the application package.</p>
          <p><b>Step 3 - application service.</b> <code>OrderService</code> implements the inbound port and uses outbound ports only. Insufficient stock raises a domain exception <code>OutOfStockException</code>; invalid quantity raises <code>IllegalArgumentException</code>.</p>
          <p><b>Step 4 - adapters.</b> Driving: a thin REST controller that maps JSON to arguments and exceptions to 400/409 and calls the use case. Driven: <code>JdbcCatalogAdapter</code>, <code>JdbcOrderRepository</code>, <code>HttpPaymentAdapter</code> in production; <code>InMemoryCatalog</code>, <code>InMemoryOrderRepository</code>, <code>FakePaymentGateway</code> in tests.</p>
          <p><b>Step 5 - dependency arrows.</b> Controller -> inbound port; service -> outbound ports; JDBC/HTTP adapters -> outbound ports (they implement them). The domain/application never imports Spring, JDBC or HTTP classes; an ArchUnit test enforces this.</p>
          <p><b>Step 6 - tests.</b> The discount rule, the stock check and the payment-failure branch become three-line unit tests in milliseconds. Each JDBC adapter gets a Testcontainers integration test; the HTTP adapter gets a WireMock test; one slice test checks status-code mapping; one smoke test checks wiring.</p>`,
        code: `import java.util.*;

// ---- ports (owned by the core) ----
interface PlaceOrderUseCase { Result place(String sku, int qty); }
interface CatalogPort { int stockOf(String sku); long unitPriceCents(String sku); void reduceStock(String sku, int qty); }
interface OrderStore { void save(String sku, int qty, long total, String status); }
interface PaymentGateway { boolean charge(long cents); }

record Result(long totalCents, String status) { }
class OutOfStockException extends RuntimeException {
    OutOfStockException(String sku) { super("insufficient stock for " + sku); }
}

// ---- application service: the business rules, no I/O of its own ----
class PlaceOrderService implements PlaceOrderUseCase {
    private final CatalogPort catalog; private final OrderStore orders; private final PaymentGateway payments;
    PlaceOrderService(CatalogPort catalog, OrderStore orders, PaymentGateway payments) {
        this.catalog = catalog; this.orders = orders; this.payments = payments;
    }
    public Result place(String sku, int qty) {
        if (qty < 1) throw new IllegalArgumentException("qty must be >= 1");
        if (catalog.stockOf(sku) < qty) throw new OutOfStockException(sku);
        long total = catalog.unitPriceCents(sku) * qty;
        if (qty >= 10) total -= total / 10;                          // 10% bulk discount
        catalog.reduceStock(sku, qty);
        String status = payments.charge(total) ? "PAID" : "PAYMENT_FAILED";
        orders.save(sku, qty, total, status);
        return new Result(total, status);
    }
}

// ---- adapters used in tests / demos (production would add JDBC + HTTP ones) ----
class InMemoryCatalog implements CatalogPort {
    final Map<String, Integer> stock = new HashMap<>(); final Map<String, Long> price = new HashMap<>();
    public int stockOf(String sku) { return stock.getOrDefault(sku, 0); }
    public long unitPriceCents(String sku) { return price.get(sku); }
    public void reduceStock(String sku, int qty) { stock.merge(sku, -qty, Integer::sum); }
}
class RecordingOrderStore implements OrderStore {
    final List<String> rows = new ArrayList<>();
    public void save(String sku, int qty, long total, String status) { rows.add(sku + "/" + qty + "/" + total + "/" + status); }
}
class StubPayment implements PaymentGateway {
    private final boolean ok; StubPayment(boolean ok) { this.ok = ok; }
    public boolean charge(long cents) { return ok; }
}

/** Thin driving adapter: HTTP-ish text in, status line out. */
class ThinController {
    private final PlaceOrderUseCase useCase;
    ThinController(PlaceOrderUseCase useCase) { this.useCase = useCase; }
    String post(String sku, int qty) {
        try { Result r = useCase.place(sku, qty); return "201 total=" + r.totalCents() + " status=" + r.status(); }
        catch (OutOfStockException e) { return "409 " + e.getMessage(); }
        catch (IllegalArgumentException e) { return "400 " + e.getMessage(); }
    }
}

class RefactorDemo {
    public static void main(String[] args) {
        InMemoryCatalog catalog = new InMemoryCatalog();
        catalog.stock.put("SKU-1", 50); catalog.price.put("SKU-1", 1000L);
        RecordingOrderStore store = new RecordingOrderStore();
        ThinController ok = new ThinController(new PlaceOrderService(catalog, store, new StubPayment(true)));
        System.out.println(ok.post("SKU-1", 10));    // 201 total=9000 status=PAID  (rule tested without DB or HTTP)
        System.out.println(ok.post("SKU-1", 100));   // 409 insufficient stock for SKU-1
        System.out.println(ok.post("SKU-1", 0));     // 400 qty must be >= 1
        ThinController declined = new ThinController(new PlaceOrderService(catalog, store, new StubPayment(false)));
        System.out.println(declined.post("SKU-1", 1)); // 201 total=1000 status=PAYMENT_FAILED
        System.out.println(store.rows);
    }
}`,
        complexity: `<p>Runtime is unchanged: O(1) calls to the same collaborators. The gain is in cost of change and test time: the business rule is verified in about 1 ms with in-memory adapters instead of seconds with DB and network.</p>`,
        followUps: ['How would you make "reduce stock + save order" atomic across two ports?', 'Where would you publish an OrderPaid event, and how would the transactional outbox fit?', 'How would you add an ArchUnit rule that fails if the application package imports java.sql?']
      }
    }
  ]
});

/* ============================ TOPIC 6: BOUNDED CONTEXTS + UBIQUITOUS LANGUAGE ============================ */
topics.push({
  title: 'DDD Strategic Design: Bounded Contexts and Ubiquitous Language',
  analogy: `<p>The word <b>"bank"</b> means a river edge to a geographer, a place to keep money to an accountant, and a tilt to a pilot. Nobody is wrong - they live in different <b>worlds</b>, and inside each world the word has exactly one meaning. A hospital is the same: to the <i>reception desk</i> a "patient" is a name and an insurance number; to the <i>surgeon</i> a "patient" is a body with blood type and allergies; to the <i>billing office</i> a "patient" is an account with unpaid invoices. If the hospital forced one giant "Patient" form on everybody, it would be huge, confusing and every department would fight over it. Domain-driven design says: <b>draw a border around each world (a bounded context), speak one clean language inside it, and translate at the borders.</b></p>`,
  explain: `<p><b>Domain-Driven Design (DDD)</b>, from Eric Evans' 2003 book, is a way to build software around the real business. It has two halves: <b>strategic design</b> (the big picture: which parts of the business, which boundaries, which teams) and <b>tactical design</b> (inside a boundary: entities, value objects, aggregates, repositories). This topic is about the strategic half - the one that matters most for architecture interviews.</p>
  <p>🟢 <b>Key words in plain English</b></p>
  ${H.table(['Term', 'Plain meaning', 'Example (ride-hailing)'], [
    ['<b>Domain</b>', 'The business area you work in', 'Moving people by car on demand'],
    ['<b>Subdomain</b>', 'A part of the business. <b>Core</b> = your competitive edge; <b>supporting</b> = needed but not special; <b>generic</b> = solved by everyone (buy it)', 'Core: matching &amp; pricing. Supporting: driver onboarding. Generic: email/SMS, payments, identity'],
    ['<b>Bounded context</b>', 'A boundary (usually one team, one codebase/service/module) inside which every term has one precise meaning and one model', '<i>Dispatch</i>, <i>Pricing</i>, <i>Payments</i>, <i>Driver Onboarding</i>'],
    ['<b>Ubiquitous language</b>', 'The shared vocabulary used by developers AND business experts - in conversation, docs and code', '"Trip", "Fare estimate", "Surge zone", "Dispatch offer"'],
    ['<b>Context map</b>', 'A picture of all contexts and how they relate (next topic)', 'Dispatch -> Pricing (customer/supplier)']
  ])}
  <p>🔵 <b>Why one big model fails.</b> Start with a single <code>Trip</code> class used by everyone: dispatch wants pickup location and driver position; pricing wants distance and surge multiplier; payments wants card token and receipt; support wants complaint history. The class grows to 80 fields, every change needs five teams, and the word <i>Trip</i> quietly means something different to each. This is the <b>"big ball of mud"</b>.</p>
  <p><b>The DDD answer:</b> several small models, one per context. <code>Dispatch.Trip</code> has pickup, driver and ETA. <code>Billing.Trip</code> (maybe called <code>Charge</code>) has amount and payment status. They are linked only by an <b>id</b> and by messages. Each model is simple because it only serves one purpose.</p>
  <p><b>How to find the boundaries</b> (practical recipe):</p>
  <ol>
    <li><b>Listen to the language.</b> When the same word means different things to different people, or when one concept has different names, you have found a seam.</li>
    <li><b>Event storming.</b> Put the domain events on sticky notes in time order ("TripRequested", "DriverAssigned", "FareCalculated", "PaymentCaptured"). Group events that belong together; boundaries appear where the vocabulary or the owner changes.</li>
    <li><b>Look at teams and rates of change.</b> Things that change together and are owned together belong together (Conway's law: systems mirror the communication structure of the organisation).</li>
    <li><b>Look at data ownership.</b> Who is the source of truth for the driver's rating? That context owns it; others hold copies or ask.</li>
  </ol>
  <p><b>Ubiquitous language in code.</b> Names in code come from the business: <code>dispatcher.offerTripTo(driver)</code>, not <code>tripManager.process(data)</code>. If the business says "cancel with fee", the method is <code>cancelWithFee</code>. When the language changes (the business now says "ride" not "trip"), the code changes too. Inside one context, never use two words for one idea or one word for two ideas.</p>
  <p>🔴 <b>Bounded context is not the same as a microservice.</b> A context is a <i>logical</i> boundary of meaning and ownership. It can live as a module in a monolith or as a service. A good rule: <b>one bounded context per team and per deployable is a sensible starting point; many services inside one context is usually a smell (distributed monolith).</b></p>`,
  clues: [
    '"The word X means different things to different teams" -> bounded contexts with separate models',
    '"How do you split a monolith into microservices?" -> find bounded contexts first (event storming), not technical layers',
    '"Our Customer table has 120 columns used by 6 teams" -> one shared model across contexts; split per context',
    '"Business and developers talk past each other" -> ubiquitous language, glossary per context, names in code match the business',
    '"Which part should we build ourselves vs buy?" -> core vs supporting vs generic subdomains',
    '"Team ownership / Conway\'s law" -> align contexts with teams so they can change independently'
  ],
  code: [
    { lang: 'java', title: 'Same word, different models in two contexts (compiles and runs)', code: `import java.util.*;

/** Context 1: DISPATCH. "Trip" means "a request to move a rider from A to B, with a driver". */
class Dispatch {
    record GeoPoint(double lat, double lon) { }
    record Trip(String tripId, GeoPoint pickup, GeoPoint dropoff, String driverId, String state) {
        Trip assign(String driver) { return new Trip(tripId, pickup, dropoff, driver, "DRIVER_ASSIGNED"); }
    }
    /** Published event: the ONLY thing other contexts learn about a finished trip. */
    record TripCompleted(String tripId, double distanceKm, int durationMin) { }
}

/** Context 2: BILLING. Here the thing is a "Charge": amount and payment state. No coordinates, no drivers. */
class Billing {
    enum PaymentState { PENDING, CAPTURED, FAILED }
    record Charge(String tripId, long amountCents, PaymentState state) { }

    /** Anti-corruption / translation at the border: Dispatch language in, Billing language out. */
    static Charge fromTripCompleted(Dispatch.TripCompleted e, long perKmCents, long perMinCents) {
        long amount = Math.round(e.distanceKm() * perKmCents) + e.durationMin() * perMinCents;
        return new Charge(e.tripId(), amount, PaymentState.PENDING);
    }
}

class BoundedContextDemo {
    public static void main(String[] args) {
        Dispatch.Trip trip = new Dispatch.Trip("t-1", new Dispatch.GeoPoint(12.97, 77.59), new Dispatch.GeoPoint(13.03, 77.62), null, "REQUESTED")
                .assign("driver-9");
        System.out.println(trip.state() + " driver=" + trip.driverId());
        // Billing never sees coordinates or drivers - only the event it needs.
        Billing.Charge charge = Billing.fromTripCompleted(new Dispatch.TripCompleted("t-1", 8.4, 22), 1200, 150);
        System.out.println(charge);   // Charge[tripId=t-1, amountCents=13380, state=PENDING]
    }
}` },
    { lang: 'text', title: 'A one-page glossary per context (ubiquitous language)', code: `CONTEXT: Dispatch                          CONTEXT: Billing
-----------------------------------        -----------------------------------
Trip     = rider+route+driver request       Charge    = amount owed for a finished trip
Offer    = invitation sent to a driver      Capture   = taking the money from the card
Assign   = driver accepted an offer         Refund    = returning money after a dispute
ETA      = estimated pickup time            Settlement= payout batch to drivers

Forbidden in Dispatch: "payment", "invoice"  Forbidden in Billing: "pickup", "ETA", "offer"` }
  ],
  codeTitle: ['Two models, one word', 'Context glossaries'],
  viz: [
    {
      title: 'Bounded contexts of a ride-hailing app',
      gen: function () {
        var nodes = [
          { id: 'RM', label: 'Rider Accounts', x: 12, y: 8, shape: 'box', w: 18 },
          { id: 'DO', label: 'Driver Onboarding', x: 12, y: 40, shape: 'box', w: 20 },
          { id: 'DI', label: 'Dispatch (core)', x: 44, y: 24, shape: 'box', w: 20 },
          { id: 'PR', label: 'Pricing (core)', x: 76, y: 8, shape: 'box', w: 18 },
          { id: 'PA', label: 'Payments', x: 76, y: 40, shape: 'box', w: 16 },
          { id: 'NO', label: 'Notifications', x: 44, y: 52, shape: 'box', w: 18 }
        ];
        function g(hl, tags, edges) { return { type: 'graph', label: 'Bounded contexts (each box = one model + one team)', directed: true, height: 60, nodes: nodes, edges: edges || [], hl: hl || {}, ehl: {}, tags: tags || {} }; }
        var tagsAll = { RM: 'Rider = profile', DO: 'Driver = applicant', DI: 'Trip = route+driver', PR: 'Trip = distance+time', PA: 'Trip = charge', NO: 'Trip = message' };
        return [
          { narr: 'Start with the business: riders, drivers, trips, prices, payments. A single <code>Trip</code> table shared by everything would become a bottleneck. Let us find the worlds.', parts: [g({}, {})] },
          { narr: '<b>Dispatch</b> is the heart: matching riders with drivers in real time. It is a <b>core subdomain</b> - our competitive edge - so we build it ourselves and keep our best engineers on it.', parts: [g({ DI: 'sel' }, { DI: 'core' })] },
          { narr: '<b>Pricing</b> (fare estimate, surge) is also <b>core</b>. Its language is distance, duration, demand, multiplier. It does not care who the driver is.', parts: [g({ DI: 'sel', PR: 'sel' }, { DI: 'core', PR: 'core' })] },
          { narr: '<b>Rider Accounts</b> and <b>Driver Onboarding</b> (documents, background checks) are <b>supporting</b>: needed, but not what makes us special. A "driver" here is an <i>applicant</i> with documents; in Dispatch a driver is a <i>moving dot with a status</i>.', parts: [g({ DI: 'sel', PR: 'sel', RM: 'win', DO: 'win' }, { DI: 'core', PR: 'core', RM: 'supporting', DO: 'supporting' })] },
          { narr: '<b>Payments</b> and <b>Notifications</b> are <b>generic</b>: every business needs them. Buy or reuse (Stripe/Adyen, an SMS/email provider) behind your own interface rather than building from scratch.', parts: [g({ DI: 'sel', PR: 'sel', RM: 'win', DO: 'win', PA: 'cur', NO: 'cur' }, { DI: 'core', PR: 'core', RM: 'supporting', DO: 'supporting', PA: 'generic', NO: 'generic' })] },
          { narr: 'Same word, six meanings: look at the tags - <b>Trip</b> is a route-with-driver in Dispatch, distance-and-time in Pricing, a charge in Payments, a message topic in Notifications. Each context owns its <i>own</i> small model.', parts: [g({}, tagsAll)] },
          { narr: 'Contexts talk only through <b>explicit contracts</b>: Dispatch publishes <code>TripCompleted</code>; Payments reacts. Nobody reads another context\'s database tables. That is what keeps teams independent.', parts: [g({ DI: 'cur', PA: 'ok' }, tagsAll, [['DI', 'PR', 'quote?'], ['DI', 'PA', 'TripCompleted'], ['DI', 'NO', 'events'], ['RM', 'DI', 'rider id'], ['DO', 'DI', 'driver approved']])] }
        ];
      }
    },
    {
      title: 'Ubiquitous language: one word, different meanings',
      input: 'Trip',
      inputLabel: 'Word to explore (Trip, Driver, Customer)',
      gen: function (input) {
        var w = String(input).trim().toLowerCase();
        var data = {
          trip: { head: 'Trip', rows: [['Dispatch', 'route + rider + assigned driver + live state'], ['Pricing', 'distance, duration, zone, time of day'], ['Payments', 'an amount to capture + payment state'], ['Support', 'a case with timeline, complaints, refunds']] },
          driver: { head: 'Driver', rows: [['Onboarding', 'applicant: documents, background check, status'], ['Dispatch', 'a location ping + availability + vehicle type'], ['Payments', 'a payout account and earnings'], ['Support', 'rating history and incident reports']] },
          customer: { head: 'Customer', rows: [['Sales', 'a lead with company name and plan'], ['Billing', 'an account with invoices and balance'], ['Support', 'a person with tickets and contact preferences'], ['Shipping', 'a delivery address and phone number']] }
        };
        var d = data[w];
        if (!d) throw new Error('Try one of: Trip, Driver, Customer');
        var frames = [];
        frames.push({ narr: 'The business says "<b>' + d.head + '</b>" all day. Do all departments mean the same thing? Let us look at four contexts.', parts: [{ type: 'table', label: 'The word "' + d.head + '"', columns: ['Context', 'What the word means here'], rows: [['?', '?']] }] });
        for (var i = 0; i < d.rows.length; i++) {
          var shown = d.rows.slice(0, i + 1);
          var hl = {}; hl[i] = 'sel';
          frames.push({ narr: 'In <b>' + d.rows[i][0] + '</b>, "' + d.head + '" means: <i>' + d.rows[i][1] + '</i>. Inside this context the meaning is exact and nobody argues.', parts: [{ type: 'table', label: 'The word "' + d.head + '"', columns: ['Context', 'What the word means here'], rows: shown, hl: hl }] });
        }
        frames.push({ narr: 'Four meanings, four small models. Forcing one shared <code>' + d.head + '</code> class on all of them gives a bloated, conflicted model. <b>Keep separate models, share only an id, and translate at the border.</b>', parts: [{ type: 'table', label: 'Result', columns: ['Context', 'What the word means here'], rows: d.rows, hl: { 0: 'ok', 1: 'ok', 2: 'ok', 3: 'ok' } }] });
        return frames;
      }
    }
  ],
  examples: [
    { title: 'Event storming to find contexts', html: `<p>Sticky notes for a food delivery app, in time order: <i>OrderPlaced -> RestaurantAccepted -> DishPrepared -> CourierAssigned -> OrderPickedUp -> OrderDelivered -> PaymentCaptured -> RestaurantPaidOut</i>. Group: <b>Ordering</b> (OrderPlaced), <b>Kitchen</b> (Accepted, Prepared), <b>Logistics</b> (CourierAssigned, PickedUp, Delivered), <b>Finance</b> (PaymentCaptured, PaidOut). The words change at each boundary: "order" is a cart in Ordering, a ticket in Kitchen, a delivery job in Logistics.</p>` },
    { title: 'Core, supporting, generic: where to invest', html: `<p>Core: build in-house, best people, deep modelling (tactical DDD). Supporting: build simply or use low-code; CRUD is fine. Generic: buy/outsource (auth via an identity provider, payments via a PSP, email via a provider) and hide it behind a port. Spending DDD effort on a generic subdomain is a classic waste.</p>` },
    { title: 'Same entity id, separate data', html: `<p>Rider Accounts owns <code>riderId</code> and the profile. Dispatch stores only <code>riderId</code> plus what it needs (current trip). To show a name on the driver's screen, Dispatch keeps a small <b>local copy</b> updated by <code>RiderRenamed</code> events, or calls an API when needed. Never join across contexts in SQL: you would couple their schemas.</p>` },
    { title: 'Mapping contexts to deployables', html: `<p>Day 1: a modular monolith with packages <code>dispatch</code>, <code>pricing</code>, <code>payments</code>, each hexagonal, talking via in-process events. Later, when load or team size demands it, extract <code>pricing</code> into its own service - the boundary and the events already exist. Splitting along the wrong lines first (by technical layer) gives chatty services and shared databases.</p>` }
  ],
  deepDive: `<p><b>Aggregates (tactical link).</b> Inside a context, an <i>aggregate</i> is a cluster of objects changed together under one root (<code>Trip</code> root with its <code>Stops</code>), protecting an invariant. Aggregate = transaction boundary. References between aggregates are by <b>id</b>, not object. Between contexts, you only exchange ids and messages.</p>
  <p><b>Language per context, glossary per team.</b> Keep a living glossary in the repo next to the code. Add a rule for forbidden words in a context. Name packages and classes after the language ("DispatchOffer"), and keep database tables in the same vocabulary. When new people ask "what does X mean?", the glossary is the answer.</p>
  <p><b>Sizing contexts.</b> Too big: several teams, several vocabularies, release trains. Too small: every feature needs three services to change at once (a "distributed monolith"). Signals for splitting: the model contradicts itself, two teams blocked on one schema, different scaling/consistency needs, different lifecycles. Signals against: constant cross-context transactions, identical vocabulary.</p>
  <p><b>Consistency across contexts.</b> Within a context: strong consistency via ACID transactions. Between contexts: <b>eventual consistency</b> via events, sagas and the transactional outbox. Design the business process to tolerate it ("your receipt will arrive shortly").</p>
  <p><b>Microservices fallacies.</b> "One entity = one service" (CustomerService, OrderService) produces anaemic CRUD services and cross-service joins. Bounded contexts are about <i>behaviour and language</i>, not nouns. Another trap: sharing a library with the domain model across contexts - that quietly re-creates the single shared model.</p>
  <p><b>Team Topologies &amp; Conway.</b> Stream-aligned teams own a context end-to-end. If the org chart and the context map disagree, the architecture will drift toward the org chart. The "inverse Conway manoeuvre" reshapes teams to get the architecture you want.</p>
  <p><b>Evolving boundaries.</b> Boundaries are hypotheses. Revisit them after incidents and when features keep crossing them. Moving a boundary in a modular monolith is cheap; moving a network boundary is expensive - another reason to start modular.</p>`,
  aiEra: `<p><b>What AI changes:</b> LLMs can read a pile of tickets, docs and database schemas and cluster concepts quickly, which speeds up the first draft of a domain glossary or event-storming board. They are also helpful as a "naive domain newcomer" who asks what a term means.</p>
  <p><b>Use AI as a partner:</b> paste transcripts of a business workshop and ask <code>List domain events and the words the business uses; flag any word used with more than one meaning</code>. Ask for a draft context map and then <i>challenge it</i> with real scenarios. Keep the glossary in your repo so coding agents use the right names (put it in the agent instructions file).</p>
  <p><b>Where AI goes wrong:</b> it defaults to "one service per noun" (UserService, OrderService, ProductService), invents contexts that match a textbook not your business, and merges words that mean different things. It also loves a single big shared <code>Customer</code> DTO.</p>
  <p><b>What you must still own:</b> conversations with real domain experts, the decision of what is core, and the team-boundary politics. AI does not know your org chart, regulations or what your CEO considers the competitive edge. In interviews, show you can justify boundaries from the business, not from technology.</p>`,
  problems: [
    {
      title: 'Draw the Bounded Contexts for a Ride-Hailing App',
      level: 'Medium', tags: ['ddd', 'bounded context', 'context map', 'microservices'], companies: ['Uber', 'Ola', 'Lyft'],
      statement: `<p>You are designing the backend for a ride-hailing product (rider app, driver app, back-office). Features: sign-up and profiles, driver document verification, requesting a ride, matching with nearby drivers, fare estimates with surge pricing, live trip tracking, payments and driver payouts, ratings, promo codes, notifications, and customer support.</p>
        <p>Propose the bounded contexts: name each, state its main language (3-5 terms), say whether it is <b>core / supporting / generic</b>, what data it <b>owns</b>, and the events/APIs it exposes. Show where the same word (Trip, Driver) means something different. Say which contexts you would start as modules of one deployable, and why.</p>`,
      constraints: `Aim for 6-9 contexts, 4 teams of 6 engineers each, launch in one city first, 3 more cities within a year. Avoid "one service per noun".`,
      example: `<p>Fragment of an answer: ${H.c('b', 'Dispatch')} (core) owns <code>Trip</code>, <code>Offer</code>, <code>DriverLocation</code>; publishes <code>TripRequested</code>, <code>DriverAssigned</code>, <code>TripCompleted</code>. ${H.c('b', 'Payments')} (generic, wraps a PSP) owns <code>Charge</code>, <code>Payout</code>; reacts to <code>TripCompleted</code>. In Dispatch a Driver is a ${H.c('g', 'location + availability')}; in Onboarding a Driver is an ${H.c('y', 'applicant with documents')}.</p>`,
      brute: { why: `<p>Make a service per noun: UserService, DriverService, TripService, PaymentService, each with CRUD, sharing one big database. Every ride request fans out over four synchronous calls and joins across tables, one schema change blocks four teams, and "User" means five things. It looks tidy on a slide but couples everything.</p>` },
      mcq: { q: 'Which subdomain would you NOT spend heavy custom-modelling effort on?', options: ['Dispatch / matching', 'Surge pricing', 'Sending SMS and email notifications', 'Real-time trip tracking'], answer: 2, explain: 'Notifications are a generic subdomain: every business needs them and providers already solve it. Hide the provider behind a port and invest DDD effort in core subdomains instead.' },
      hints: [
        `<p>The aha: find the places where the <b>same word changes meaning</b> (Driver, Trip) and where <b>different teams/experts</b> own the rules. Those are your seams.</p>`,
        `<p>Classify with core / supporting / generic. Core: matching and pricing. Supporting: onboarding, accounts, support tooling. Generic: payments (PSP), notifications, identity.</p>`,
        `<p>Recipe: list events in time order, group them, name contexts after their language, define the events/APIs between them, then choose deployables (start modular monolith, extract Dispatch and Pricing first if load needs it).</p>`
      ],
      solution: {
        approach: `<p><b>Contexts (8).</b> (1) <b>Dispatch</b> - core. Language: Trip, Offer, Assignment, ETA, DriverLocation. Owns live trip state and driver availability; publishes TripRequested, DriverAssigned, TripStarted, TripCompleted, TripCancelled. (2) <b>Pricing</b> - core. Language: FareQuote, SurgeZone, Multiplier, BaseRate. Owns rate cards and surge calculation; exposes <code>quote(route, time)</code> and publishes FareFinalised. (3) <b>Rider Accounts</b> - supporting. Language: Rider, Profile, SavedPlace. Owns rider data. (4) <b>Driver Onboarding</b> - supporting. Language: Applicant, Document, Verification, Approval; publishes DriverApproved/DriverSuspended. (5) <b>Payments</b> - generic, wraps a payment provider. Language: Charge, Capture, Refund, Payout. Owns money movement and reacts to FareFinalised/TripCompleted. (6) <b>Notifications</b> - generic. Consumes events and sends push/SMS/email; owns templates and delivery logs. (7) <b>Ratings &amp; Trust</b> - supporting. Language: Rating, Flag, TrustScore; consumes TripCompleted; publishes DriverFlagged. (8) <b>Support</b> - supporting. Language: Case, Escalation, Resolution; reads events, calls other contexts through their APIs.</p>
          <p><b>Same word, different model.</b> Driver = applicant with documents (Onboarding); location + status + vehicle (Dispatch); payout account (Payments); rating history (Trust). Trip = route and driver (Dispatch); distance, time, zone (Pricing); amount to capture (Payments); case timeline (Support). Only <code>tripId</code> and <code>driverId</code> are shared; each context keeps its own copy of just the fields it needs, updated by events.</p>
          <p><b>Integration.</b> Mostly asynchronous events through a broker with a published, versioned schema (Dispatch -> Payments/Notifications/Trust). Synchronous calls only where a user waits: Dispatch asks Pricing for a quote. Payments is wrapped by an anti-corruption layer around the PSP. No shared database tables.</p>
          <p><b>Deployment and teams.</b> With four teams start as a modular monolith with one module per context (hexagonal inside each, events in-process), but give Dispatch and Pricing separate deployables early because they scale and change fastest. Teams: Marketplace (Dispatch + Pricing), Platform-Money (Payments + Notifications), Driver Experience (Onboarding + Trust), Rider Experience (Accounts + Support). Revisit boundaries after each city launch.</p>`,
        complexity: `<p>Not an algorithm; quality criteria: each context has one language and one owner, cross-context traffic is mostly asynchronous events, data ownership is unambiguous, and a change in one context rarely forces changes in another.</p>`,
        followUps: ['Which context would you extract first when traffic grows 10x, and why?', 'How do you show the driver name on the rider app without joining across contexts?', 'Where does the promo code feature live?']
      }
    }
  ]
});

/* ============================ TOPIC 7: CONTEXT MAPS + ACL ============================ */
topics.push({
  title: 'Context Maps and the Anti-Corruption Layer',
  analogy: `<p>Imagine a <b>country that has just built a new modern city</b> next to an old walled town with its own strange laws, language and currency. Trade must happen. At the gate you place a <b>customs office with interpreters</b>: they translate old-town paperwork into the new city's forms and never let old-town habits leak in. That office is the <b>anti-corruption layer</b>. And the <b>map</b> hanging in the mayor's office that shows every town, who depends on whom, who has to follow whose rules and where the interpreters stand - that is the <b>context map</b>.</p>`,
  explain: `<p>Once you have several bounded contexts, the real work is the <b>relationships</b>. A <b>context map</b> is a diagram (and a short text) that shows each context and the type of relationship on every line. It is as much about <b>teams and power</b> as about code: who must adapt to whom?</p>
  <p>🟢 <b>Words you must know: upstream and downstream.</b> <b>Upstream (U)</b> context influences; <b>downstream (D)</b> depends on it. If Pricing publishes a quote format and Dispatch uses it, Pricing is upstream.</p>
  <p>🔵 <b>The main relationship patterns</b></p>
  ${H.table(['Pattern', 'Plain meaning', 'When to use'], [
    ['<b>Partnership</b>', 'Two teams succeed or fail together; they plan and release in step', 'Two core contexts built in parallel'],
    ['<b>Shared Kernel</b>', 'Two contexts share a small piece of model/code, changed only by agreement', 'Tiny, stable shared part (Money, Country codes); dangerous if it grows'],
    ['<b>Customer / Supplier</b>', 'Upstream (supplier) promises to meet downstream (customer) needs; customer influences the plan', 'Teams cooperate, both have budget and goodwill'],
    ['<b>Conformist</b>', 'Downstream simply adopts upstream\'s model as is', 'Upstream will not change (a vendor) and its model is good enough'],
    ['<b>Anti-Corruption Layer (ACL)</b>', 'Downstream builds a translator so the upstream model never leaks in', 'Upstream model is messy/legacy/foreign and you want a clean one'],
    ['<b>Open Host Service (OHS)</b>', 'Upstream offers a well-documented, stable API for many consumers', 'Many downstream consumers (public or internal platform API)'],
    ['<b>Published Language (PL)</b>', 'A shared, well-documented exchange format (OpenAPI, JSON schema, Avro, industry standard)', 'Used together with OHS, events and B2B integrations'],
    ['<b>Separate Ways</b>', 'No integration: the cost of connecting is higher than the benefit', 'Features that do not need each other'],
    ['<b>Big Ball of Mud</b>', 'A region where models are tangled; draw a border around it and keep it out', 'The legacy system you have not escaped yet']
  ])}
  <p><b>The Anti-Corruption Layer in detail.</b> "Corruption" = foreign concepts, names, quirks and bugs creeping into your clean model. An ACL has three parts:</p>
  <ol>
    <li><b>Facade / client:</b> talks to the foreign system in its own protocol (SOAP, flat files, SQL views, weird REST). Hides how ugly it is.</li>
    <li><b>Translator / mapper:</b> converts foreign data to your domain language and back (<code>CUST_STAT = "A"</code> -> <code>CustomerStatus.ACTIVE</code>; amounts as strings -> <code>Money</code>; two date formats -> <code>Instant</code>).</li>
    <li><b>Port:</b> an interface in <i>your</i> domain (<code>CustomerDirectory.findById</code>). Your domain code only sees the port. This is exactly a hexagonal driven adapter!</li>
  </ol>
  <p><b>Where ACLs shine:</b> integrating a legacy mainframe/ERP, a third-party SaaS API, an acquired company's system; and during a <b>strangler fig migration</b>, where the new system grows around the old one and the ACL lets new code read legacy data without adopting its model.</p>
  <p>🔴 <b>Costs.</b> An ACL is code you must write, test and maintain, and it adds latency. Do not use it between two clean, friendly contexts (use Customer/Supplier or OHS+PL) or when conforming is fine (Conformist is a legitimate, cheap choice when the upstream model is good).</p>`,
  clues: [
    '"We must integrate with a legacy system with a messy model" -> anti-corruption layer',
    '"How do we migrate a monolith without a big-bang rewrite?" -> strangler fig + ACL between new and old',
    '"Many teams consume our API" -> open host service + published language (versioned, documented)',
    '"The vendor API changes names and shapes often" -> ACL (or adapter) so only one class changes',
    '"Two teams constantly block each other" -> look at the relationship: customer/supplier, partnership, or merge/split contexts',
    '"Draw the context map" -> boxes for contexts, arrows from upstream to downstream, label each with a pattern (ACL, OHS/PL, CF, SK)'
  ],
  code: [
    { lang: 'java', title: 'Anti-corruption layer in plain Java: legacy shapes in, clean domain out (compiles and runs)', code: `import java.util.*;

// ---------- OUR CLEAN DOMAIN (the language we want) ----------
enum CustomerStatus { ACTIVE, INACTIVE, BLOCKED }
record Money(long cents, String currency) { }
record Customer(String id, String fullName, CustomerStatus status, Money creditLimit) { }

/** The port our domain depends on. Nothing about legacy here. */
interface CustomerDirectory {
    Optional<Customer> findById(String id);
}

// ---------- THE LEGACY SYSTEM (we cannot change it) ----------
/** What the old CRM returns: cryptic codes, strings for numbers, last name first. */
record LegacyCustRec(String custNo, String nameLast, String nameFirst, String custStat, String credLim, String curr) { }
class LegacyCrmClient {                                      // stands in for SOAP/SQL/flat-file access
    private final Map<String, LegacyCustRec> rows = new HashMap<>();
    LegacyCrmClient() {
        rows.put("00042", new LegacyCustRec("00042", "LOVELACE", "ADA", "A", "1500.50", "GBP"));
        rows.put("00043", new LegacyCustRec("00043", "TURING", "ALAN", "X", "0", "GBP"));
    }
    LegacyCustRec fetch(String custNo) { return rows.get(custNo); }   // null when missing
}

// ---------- THE ACL: facade + translator, implementing OUR port ----------
class LegacyCustomerAdapter implements CustomerDirectory {
    private final LegacyCrmClient crm;
    LegacyCustomerAdapter(LegacyCrmClient crm) { this.crm = crm; }

    public Optional<Customer> findById(String id) {
        LegacyCustRec r = crm.fetch(pad(id));              // legacy ids are zero-padded to 5 chars
        return r == null ? Optional.empty() : Optional.of(translate(r));
    }

    // All the weirdness is confined to these few lines.
    private Customer translate(LegacyCustRec r) {
        String name = capitalise(r.nameFirst()) + " " + capitalise(r.nameLast());
        return new Customer(r.custNo(), name, status(r.custStat()), money(r.credLim(), r.curr()));
    }
    private static CustomerStatus status(String code) {
        switch (code) {
            case "A": return CustomerStatus.ACTIVE;
            case "I": return CustomerStatus.INACTIVE;
            default:  return CustomerStatus.BLOCKED;       // unknown legacy codes fail safe, never silently ACTIVE
        }
    }
    private static Money money(String amount, String currency) {
        return new Money(Math.round(Double.parseDouble(amount) * 100), currency);
    }
    private static String pad(String id) { return String.format("%5s", id).replace(' ', '0'); }
    private static String capitalise(String s) { return s.charAt(0) + s.substring(1).toLowerCase(); }
}

class AclDemo {
    public static void main(String[] args) {
        CustomerDirectory directory = new LegacyCustomerAdapter(new LegacyCrmClient());
        System.out.println(directory.findById("42").get());   // Customer[id=00042, fullName=Ada Lovelace, status=ACTIVE, ...150050 GBP]
        System.out.println(directory.findById("43").get().status());   // BLOCKED (unknown code X)
        System.out.println(directory.findById("99").isPresent());      // false
    }
}` },
    { lang: 'java', check: false, title: 'Testing the ACL: golden-sample test against real legacy payloads', code: `class LegacyCustomerAdapterTest {

    // Real (anonymised) payloads captured from the legacy system live in test resources.
    @Test
    void translatesActiveCustomerFromRecordedPayload() throws Exception {
        LegacyCustRec rec = new ObjectMapper().readValue(
            getClass().getResourceAsStream("/legacy/cust-00042.json"), LegacyCustRec.class);
        Customer c = new LegacyCustomerAdapter(stubReturning(rec)).findById("42").orElseThrow();
        assertThat(c.fullName()).isEqualTo("Ada Lovelace");
        assertThat(c.creditLimit()).isEqualTo(new Money(150050, "GBP"));
    }

    @ParameterizedTest
    @CsvSource({"A,ACTIVE", "I,INACTIVE", "X,BLOCKED", "'',BLOCKED"})     // unknown codes must fail safe
    void statusMappingFailsSafe(String legacyCode, CustomerStatus expected) {
        assertThat(LegacyCustomerAdapter.status(legacyCode)).isEqualTo(expected);
    }
}` }
  ],
  codeTitle: ['ACL: facade + translator behind a port', 'Testing the ACL'],
  viz: [
    {
      title: 'Context map of the ride-hailing platform',
      gen: function () {
        var nodes = [
          { id: 'DI', label: 'Dispatch', x: 40, y: 22, shape: 'box', w: 16 },
          { id: 'PR', label: 'Pricing', x: 72, y: 8, shape: 'box', w: 14 },
          { id: 'PA', label: 'Payments', x: 72, y: 38, shape: 'box', w: 14 },
          { id: 'PSP', label: 'External PSP (Stripe-like)', x: 94, y: 38, shape: 'box', w: 24 },
          { id: 'DO', label: 'Driver Onboarding', x: 10, y: 8, shape: 'box', w: 20 },
          { id: 'LG', label: 'Legacy Fleet System', x: 10, y: 40, shape: 'box', w: 20 },
          { id: 'NO', label: 'Notifications', x: 40, y: 50, shape: 'box', w: 16 }
        ];
        var edges = [['PR', 'DI', 'U to D: OHS + PL'], ['DI', 'PA', 'events: customer/supplier'], ['PSP', 'PA', 'ACL in Payments'], ['LG', 'DO', 'ACL in Onboarding'], ['DO', 'DI', 'DriverApproved event'], ['DI', 'NO', 'conformist']];
        function g(hl, ehl, tags, shown) { return { type: 'graph', label: 'Context map (arrow = upstream -> downstream)', directed: true, height: 58, nodes: nodes, edges: shown || edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} }; }
        return [
          { narr: 'Seven boxes: our own contexts plus two <b>outsiders</b> (a payment provider and a legacy fleet system). The context map shows <b>how each pair relates</b>. Arrows point from upstream to downstream.', parts: [g({ PSP: 'win', LG: 'win' }, {}, {}, [])] },
          { narr: '<b>Pricing -> Dispatch.</b> Pricing is upstream and offers a documented API used by several consumers: <b>Open Host Service + Published Language</b> (versioned OpenAPI). Dispatch just follows it.', parts: [g({ PR: 'sel', DI: 'cur' }, { 'PR-DI': 'ok' }, { PR: 'upstream' }, [edges[0]])] },
          { narr: '<b>Dispatch -> Payments.</b> Dispatch publishes <code>TripCompleted</code>; Payments needs certain fields. The two teams talk and agree on the event: <b>Customer / Supplier</b>.', parts: [g({ DI: 'sel', PA: 'cur' }, { 'DI-PA': 'ok' }, { DI: 'supplier', PA: 'customer' }, [edges[0], edges[1]])] },
          { narr: '<b>PSP -> Payments.</b> The provider\'s model (charges, intents, webhooks) is foreign and changes without asking us. Payments builds an <b>Anti-Corruption Layer</b> so provider names never enter our domain.', parts: [g({ PSP: 'win', PA: 'cur' }, { 'PSP-PA': 'sel' }, { PA: 'ACL' }, edges.slice(0, 3))] },
          { narr: '<b>Legacy Fleet System -> Driver Onboarding.</b> We are migrating off it (strangler fig). Onboarding reads legacy driver records through an <b>ACL</b> and writes clean <code>Applicant</code> objects. The legacy mess stays behind the wall.', parts: [g({ LG: 'win', DO: 'cur' }, { 'LG-DO': 'sel' }, { DO: 'ACL' }, edges.slice(0, 4))] },
          { narr: '<b>Dispatch -> Notifications.</b> Notifications simply accepts Dispatch\'s event format and builds messages from it: a <b>Conformist</b>. It is cheap and fine because it does not need its own model of trips.', parts: [g({ DI: 'sel', NO: 'cur' }, { 'DI-NO': 'ok' }, { NO: 'conformist' }, edges)] },
          { narr: 'The complete map. Each line has a <b>pattern</b> and an <b>owner</b>. Teams can now see where they are free to change things (downstream of nobody) and where they must coordinate (upstream of many).', parts: [g({ DI: 'sel' }, { 'PR-DI': 'ok', 'DI-PA': 'ok', 'PSP-PA': 'ok', 'LG-DO': 'ok', 'DO-DI': 'ok', 'DI-NO': 'ok' }, { PA: 'ACL', DO: 'ACL', NO: 'CF', PR: 'OHS/PL' }, edges)] }
        ];
      }
    },
    {
      title: 'Anti-corruption layer: translating a legacy record',
      input: 'A',
      inputLabel: 'Legacy status code (A, I, or anything else, e.g. X)',
      gen: function (input) {
        var code = String(input).trim().toUpperCase().slice(0, 3);
        if (!code) throw new Error('Enter a status code such as A, I or X');
        var map = { A: 'ACTIVE', I: 'INACTIVE' };
        var out = map[code] || 'BLOCKED';
        var nodes = [
          { id: 'D', label: 'Our Domain (clean)', x: 14, y: 22, shape: 'box', w: 22 },
          { id: 'P', label: 'Port: CustomerDirectory', x: 40, y: 22, shape: 'box', w: 24 },
          { id: 'T', label: 'ACL translator', x: 66, y: 22, shape: 'box', w: 18 },
          { id: 'L', label: 'Legacy CRM', x: 90, y: 22, shape: 'box', w: 14 }
        ];
        function g(hl, ehl) { return { type: 'graph', label: 'Read path through the ACL', directed: true, height: 40, nodes: nodes, edges: [['D', 'P', 'findById(42)'], ['P', 'T'], ['T', 'L', 'fetch(00042)']], hl: hl || {}, ehl: ehl || {} }; }
        var legacyRows = [['custNo', '00042'], ['nameLast / nameFirst', 'LOVELACE / ADA'], ['custStat', code], ['credLim', '1500.50 (string)'], ['curr', 'GBP']];
        return [
          { narr: 'Our domain asks its own port: <code>findById("42")</code>. It does not know a legacy system exists.', parts: [g({ D: 'cur', P: 'cur' }, { 'D-P': 'ok' })] },
          { narr: 'The ACL adapter (implementing the port) pads the id to the legacy format <code>00042</code> and calls the legacy client.', parts: [g({ P: 'done', T: 'cur', L: 'cur' }, { 'D-P': 'ok', 'P-T': 'ok', 'T-L': 'ok' })] },
          { narr: 'The legacy system answers in <b>its</b> language: cryptic column names, numbers as strings, last name first.', parts: [g({ L: 'sel' }, { 'T-L': 'ok' }), { type: 'table', label: 'Legacy record', columns: ['field', 'value'], rows: legacyRows, hl: { 2: 'cur' } }] },
          { narr: 'The translator maps each field: names are re-ordered and capitalised, <code>1500.50</code> becomes <code>150050 cents</code>, and the status code <b>' + code + '</b> becomes <b>' + out + '</b>.' + (map[code] ? '' : ' <span class="c-r">Unknown legacy code -> fail safe to BLOCKED, never silently ACTIVE.</span>'), parts: [
            { type: 'table', label: 'Translation rules', columns: ['legacy', 'clean domain'], rows: [['LOVELACE / ADA', 'Ada Lovelace'], ['custStat = ' + code, 'status = ' + out], ['credLim "1500.50" GBP', 'Money(150050, GBP)']], hl: { 1: map[code] ? 'ok' : 'bad' } }
          ] },
          { narr: 'The domain receives a clean <code>Customer</code>. No legacy field names, no string maths, no magic letters. Everything weird lives in one small class.', parts: [g({ D: 'ok', P: 'ok' }, { 'D-P': 'ok' }), { type: 'table', label: 'What the domain sees', columns: ['field', 'value'], rows: [['id', '00042'], ['fullName', 'Ada Lovelace'], ['status', out], ['creditLimit', '150050 GBP cents']], hl: { 2: map[code] ? 'ok' : 'bad' } }] },
          { narr: 'Later the legacy system is replaced: write <code>NewCrmCustomerAdapter</code> implementing the same port, flip the wiring, delete the old adapter. The domain and its tests never change. That is the real payoff of the ACL.', parts: [g({ P: 'sel' }, { 'P-T': 'ok' })] }
        ];
      }
    }
  ],
  examples: [
    { title: 'Strangler fig with an ACL (step by step)', html: `<p>A 15-year-old monolith owns orders. Plan: (1) put a routing proxy in front; (2) build the new <b>Returns</b> context as a clean service; (3) Returns needs order data, so it reads through an <b>ACL</b> that calls the legacy API and translates; (4) route <code>/returns/*</code> to the new service; (5) repeat for the next feature; (6) when the last route moves, delete the monolith and replace the ACL adapter with a call to the new Orders service. At no point do you stop shipping.</p>` },
    { title: 'Conformist is a valid choice', html: `<p>Your invoicing context must follow tax-authority XML formats. Building an ACL to translate the government schema into a "nicer" model and back adds code and bugs for no gain; you cannot change their model anyway. <b>Conform</b> in that one context, keep the rest of your system clean, and isolate the XML in an adapter. Decide with cost in mind: ACL when the foreign model would pollute many places, conform when it is small and stable.</p>` },
    { title: 'Anti-corruption for events', html: `<p>ACLs also work on <b>incoming messages</b>. A Kafka consumer in Billing receives Dispatch's <code>TripCompletedV3</code> with 40 fields. A small mapper converts it into Billing's own command <code>CaptureCharge(tripId, amount)</code> and ignores the rest. If Dispatch moves to <code>V4</code>, only the mapper changes.</p>` },
    { title: 'Reading a context map in an interview', html: `<p>When shown a map, say for each arrow: "Who is upstream? What does downstream need? Which pattern fits? What is the cost if upstream changes?" Example: "Payments depends on a PSP we do not control, so the PSP is upstream and we protect ourselves with an ACL plus contract tests. Dispatch is upstream of Notifications, which only reads events, so conformist is enough."</p>` }
  ],
  deepDive: `<p><b>Relationship vs integration style.</b> The pattern (ACL, OHS...) is about <i>model and power</i>. The technical style (REST, gRPC, events, shared DB view, file drop) is separate. An ACL can wrap an HTTP API, a SOAP service, a database view or a message topic. Prefer asynchronous events between contexts to reduce temporal coupling; use synchronous calls where a user waits.</p>
  <p><b>Shared Kernel pitfalls.</b> It looks efficient (one library with <code>Customer</code> for everyone) but turns into a distributed monolith: any change needs all consumers to upgrade. Keep it tiny (value objects such as <code>Money</code>, <code>CountryCode</code>), versioned, and owned by a clear group. Never share entities or repositories.</p>
  <p><b>Published Language and versioning.</b> A published language needs: schema (OpenAPI/Avro/Protobuf/JSON Schema), documentation, compatibility rules (add fields freely, never repurpose, deprecate with a window) and examples. Use a schema registry with BACKWARD or FULL compatibility checks for events, and contract tests (Pact) at the boundaries of ACLs.</p>
  <p><b>ACL design rules.</b> (1) The port is defined by <i>your</i> needs, not by what the legacy offers. (2) Make translation total and fail safe: unknown codes -> explicit result or error, not a default that hides a problem. (3) Keep the ACL <i>stateless</i> and thin; business decisions stay in your domain. (4) Capture real legacy payloads as golden test fixtures. (5) Add timeouts, circuit breakers and caching around the legacy call - the legacy system is usually slow and fragile. (6) Monitor translation errors; they reveal undocumented legacy behaviour.</p>
  <p><b>Data synchronisation.</b> If the new system needs legacy data frequently, avoid calling it on every request: use change-data-capture (Debezium) or nightly exports into a read model inside the new context, translated by the ACL. Beware dual writes during migration; prefer one source of truth per piece of data, switched at a defined moment.</p>
  <p><b>Team dynamics.</b> A map is also an organisational tool. Conformist often means a team has no power; customer/supplier requires the upstream to prioritise downstream asks. Making these relationships explicit helps leadership fund the right integrations, and it explains why "just add a field" takes three weeks.</p>
  <p><b>Evolving the map.</b> Redraw it quarterly. Look for arrows that appear without a pattern label (accidental integrations), contexts with many inbound arrows (candidates for OHS+PL), and cycles (upstream/downstream both ways) - cycles usually mean the boundary is wrong.</p>`,
  aiEra: `<p><b>What AI changes:</b> Mapping a legacy schema or a vendor API to a clean domain model is repetitive, careful work that AI assists well: generating the translator, the unit tests for every code in an enum, and documentation of "what this column really means". Migration projects that were months of reading now start with an AI-written first draft.</p>
  <p><b>Use AI as a partner:</b> give it sample legacy payloads (anonymised!) and ask <code>Propose a clean domain model, the port interface, and the field-by-field mapping table; list every value that could be null, malformed or unknown</code>. Ask it to generate property-based tests for the translator. Use agents to explore a large legacy codebase and summarise "who reads and writes the CUSTOMER table". LLM tools and MCP servers you integrate with are also upstream systems: wrap them in an ACL so a changed tool schema cannot corrupt your domain.</p>
  <p><b>Where AI goes wrong:</b> it assumes legacy fields mean what their names say (they rarely do), maps unknown codes to a harmless default, skips timezone/rounding traps, and may put business rules into the translator. Never paste real customer data or credentials into a prompt - use anonymised samples.</p>
  <p><b>What you must still own:</b> the meaning of legacy data (ask the people who have run it for years), the decision on conformist vs ACL, the migration order and risk plan, and the verification against production-like data. AI can draft the mapper; only you can sign off that "status X" really means blocked.</p>`,
  problems: [
    {
      title: 'Design an Anti-Corruption Layer for a Legacy System',
      level: 'Hard', tags: ['ddd', 'anti-corruption layer', 'strangler fig', 'migration'], companies: ['Goldman Sachs', 'ThoughtWorks'],
      statement: `<p>A bank is building a new <b>Loans</b> service. It must read customer data from a 20-year-old mainframe CRM exposed as a SOAP service and a nightly flat file. The legacy model uses: 10-character zero-padded ids, <code>NAME1</code>/<code>NAME2</code> fields (sometimes company, sometimes person), status codes <code>A/I/C/Z/?</code>, amounts as strings in major units with an implied currency per branch, dates as <code>YYYYMMDD</code> in local branch time, and occasional duplicate records.</p>
        <p>Design the ACL: the port, the translator rules, error handling for bad data, how you test it, performance and resilience, and how it supports a later migration off the mainframe.</p>`,
      constraints: `Mainframe allows 20 requests/second and has 2 s typical latency; Loans needs customer reads at peak 200/s; data privacy rules forbid logging personal data; the new domain model must not contain legacy names.`,
      example: `<p>Legacy: <code>{ID:"0000004211", NAME1:"ACME LTD", NAME2:"", STAT:"Z", LIMIT:"250000.00", BR:"UK01", OPENED:"20080315"}</code></p><p>Clean: ${H.c('g', 'Customer(id=4211, type=COMPANY, name="Acme Ltd", status=BLOCKED (unknown code Z, flagged), creditLimit=25000000 GBP minor units, customerSince=2008-03-15)')}.</p>`,
      brute: { why: `<p>Let Loans call the SOAP service directly and use the legacy DTOs (<code>NAME1</code>, <code>STAT</code>) in domain code. Legacy quirks spread into dozens of classes, tests need the mainframe, the 20 req/s limit is hit at peak, and replacing the mainframe later means rewriting Loans. Every status-code surprise becomes a production bug in the core domain.</p>` },
      mcq: { q: 'The legacy system sends an unknown status code "Z". What should the ACL do?', options: ['Map it to ACTIVE so processing continues', 'Throw away the customer', 'Map it to a safe state (e.g. BLOCKED / UNKNOWN), record a metric and alert, keep the raw value for diagnosis', 'Crash the application'], answer: 2, explain: 'Fail safe and observable: an unknown value must never become a permissive default. Surface it through metrics/alerts so the team learns the true meaning of the code.' },
      hints: [
        `<p>The aha: the <b>port belongs to Loans</b> and is shaped by what Loans needs (<code>CustomerDirectory.find(id)</code>), not by what the mainframe offers.</p>`,
        `<p>Split the ACL: client (SOAP + retry + timeout + circuit breaker), translator (pure functions, heavily tested), and a read-model cache/replica fed from the nightly file or CDC to respect the 20 req/s limit.</p>`,
        `<p>Translate totally and fail safe: unknown codes, bad dates, duplicates, company-vs-person. Keep raw payloads in a quarantine store for diagnosis. Test with recorded anonymised payloads and property-based tests.</p>`
      ],
      solution: {
        approach: `<p><b>1. The port (in Loans).</b> <code>CustomerDirectory.findById(CustomerId)</code> returns <code>Optional&lt;Customer&gt;</code> where <code>Customer</code> has <code>type (PERSON|COMPANY)</code>, <code>displayName</code>, <code>status</code> (ACTIVE, INACTIVE, CLOSED, BLOCKED), <code>creditLimit: Money</code> (minor units + ISO currency), <code>customerSince: LocalDate</code>. No legacy words. An <code>UNKNOWN_LEGACY_STATE</code> flag lets the domain decline risky actions.</p>
          <p><b>2. Components.</b> (a) <i>LegacyCrmClient</i>: SOAP client with 3 s timeout, bulkhead (max 15 concurrent), circuit breaker, retry with jitter on idempotent reads. (b) <i>CustomerTranslator</i>: pure, stateless functions. (c) <i>CustomerReadModel</i>: a local table in the Loans database, refreshed by the nightly flat file (bulk) and by change events (if the mainframe can publish them) or short-TTL read-through caching, so peak 200 reads/s are served locally and the mainframe sees fewer than 20/s. (d) <i>LegacyCustomerAdapter</i> implements the port: read model first, mainframe on miss, translate, cache.</p>
          <p><b>3. Translation rules.</b> Ids: strip zero padding, keep as string, never parse to int. Names: if <code>NAME2</code> empty and <code>NAME1</code> matches company suffix rules or branch flags, type = COMPANY; otherwise person; title-case; trim. Status: A -> ACTIVE, I -> INACTIVE, C -> CLOSED, anything else (Z, ?, blank) -> BLOCKED with <code>unknownLegacyState=true</code>, raw code stored and metric <code>acl.unknown_status{code}</code> incremented. Money: parse as <code>BigDecimal</code> (never double), currency from branch table, convert to minor units with explicit rounding; reject negative limits. Dates: parse <code>YYYYMMDD</code> with the branch time zone; invalid dates -> null plus a data-quality counter. Duplicates: pick the record with the latest update stamp, deterministic tie-break, and log the ids (not personal data).</p>
          <p><b>4. Error handling.</b> Technical failures (timeout, SOAP fault) map to a domain-level <code>CustomerDirectoryUnavailable</code> and trigger fallback to the cached read model with an "as-of" age; business-level anomalies (bad data) map to the safe state above. Poison records go to a quarantine table for manual review. Logs contain ids and error codes only; payload dumps are redacted or disabled due to privacy rules.</p>
          <p><b>5. Testing.</b> Golden tests from anonymised recorded payloads (one per code and edge case); property-based tests (random strings must never throw uncaught or produce ACTIVE for unknown codes); contract test of the SOAP stub (WSDL/WireMock); adapter integration test with Testcontainers for the read model; resilience test (kill the stub, assert fallback); a nightly <i>reconciliation job</i> compares read model vs mainframe sample counts.</p>
          <p><b>6. Migration path.</b> Loans only knows the port. When a new Customer service replaces the mainframe, implement <code>NewCustomerServiceAdapter</code>; run both in <b>shadow mode</b> (call both, compare results, log differences) for a few weeks, then switch by feature flag and delete the legacy adapter. This is the strangler fig applied to the dependency.</p>
          <p><b>7. Operations.</b> Dashboards: cache hit rate, mainframe latency, circuit state, unknown-code counters, translation error rate. Alert on new unknown codes, because they usually signal an undocumented business rule.</p>`,
        code: { lang: 'java', code: `import java.math.*;
import java.time.*;
import java.time.format.*;
import java.util.*;

enum CustStatus { ACTIVE, INACTIVE, CLOSED, BLOCKED }
enum CustType { PERSON, COMPANY }
record Money(long minorUnits, String currency) { }
record Customer(String id, CustType type, String name, CustStatus status, boolean unknownLegacyState, Money creditLimit, LocalDate since) { }
record LegacyRow(String id, String name1, String name2, String stat, String limit, String branch, String opened) { }

class CustomerTranslator {
    private static final Map<String, String> BRANCH_CURRENCY = Map.of("UK01", "GBP", "DE01", "EUR");
    private final Map<String, Integer> unknownCodeCounter = new HashMap<>();     // stand-in for a metrics counter

    Customer translate(LegacyRow r) {
        String id = r.id().replaceFirst("^0+(?!$)", "");                           // strip zero padding, keep as text
        boolean company = r.name2() == null || r.name2().isBlank();
        String name = company ? titleCase(r.name1()) : titleCase(r.name2()) + " " + titleCase(r.name1());
        CustStatus status; boolean unknown = false;
        switch (r.stat()) {
            case "A": status = CustStatus.ACTIVE; break;
            case "I": status = CustStatus.INACTIVE; break;
            case "C": status = CustStatus.CLOSED; break;
            default:                                                              // fail safe + observable
                status = CustStatus.BLOCKED; unknown = true;
                unknownCodeCounter.merge(r.stat(), 1, Integer::sum);
        }
        String currency = BRANCH_CURRENCY.getOrDefault(r.branch(), "XXX");
        long minor = new BigDecimal(r.limit()).movePointRight(2).setScale(0, RoundingMode.HALF_EVEN).longValueExact();
        LocalDate since = LocalDate.parse(r.opened(), DateTimeFormatter.BASIC_ISO_DATE);
        return new Customer(id, company ? CustType.COMPANY : CustType.PERSON, name, status, unknown, new Money(minor, currency), since);
    }
    Map<String, Integer> unknownCodes() { return unknownCodeCounter; }
    private static String titleCase(String s) {
        StringBuilder sb = new StringBuilder();
        for (String w : s.trim().toLowerCase().split("\\\\s+")) {
            if (sb.length() > 0) sb.append(' ');
            sb.append(Character.toUpperCase(w.charAt(0))).append(w.substring(1));
        }
        return sb.toString();
    }
}

class LoansAclDemo {
    public static void main(String[] args) {
        CustomerTranslator t = new CustomerTranslator();
        System.out.println(t.translate(new LegacyRow("0000004211", "ACME LTD", "", "Z", "250000.00", "UK01", "20080315")));
        System.out.println(t.translate(new LegacyRow("0000000007", "LOVELACE", "ADA", "A", "1500.50", "DE01", "19991231")));
        System.out.println("unknown codes seen: " + t.unknownCodes());
    }
}` },
        complexity: `<p>Translation is O(1) per record. Capacity: with a 95% read-model hit rate, 200 reads/s becomes about 10 mainframe calls/s, under the 20 req/s limit. Latency: local read about 2 ms; miss up to the 2 s mainframe call, protected by timeout and circuit breaker.</p>`,
        followUps: ['How would you detect that the legacy system started returning a new status code?', 'How would you migrate customer ownership without dual-write bugs?', 'When would you choose Conformist instead of an ACL here?']
      }
    }
  ]
});

/* ============================ PRACTICE: EASY ============================ */
practice.push({
  title: 'Name That Test Double',
  level: 'Easy', tags: ['test doubles', 'vocabulary'], companies: ['Thoughtworks'],
  statement: `<p>Classify each stand-in as <b>dummy, stub, spy, mock or fake</b> and say what the test then asserts on:</p>
    <ol>
      <li>A <code>HashMap</code>-backed class implementing <code>UserRepository</code> that really stores and finds users.</li>
      <li>A <code>Mailer</code> passed to a constructor, throwing <code>AssertionError</code> if any method is called.</li>
      <li>A <code>Clock</code> that always returns 9:00.</li>
      <li>Mockito <code>verify(mailer, times(1)).send("a@x.com", "Welcome!")</code> on a Mockito mock.</li>
      <li>A <code>Mailer</code> that appends every call to a list, which the test reads afterwards.</li>
    </ol>`,
  constraints: `One word per item plus one sentence about what is asserted.`,
  example: `<p>Item: "A <code>PriceList</code> whose <code>priceOf()</code> always returns 500" -> ${H.c('g', 'stub')}: it only supplies a canned answer; the test asserts on the <i>result</i> of the code under test.</p>`,
  brute: { why: `<p>Calling everything "a mock" (as many Mockito tutorials do). That hides the real distinction between checking state and checking interactions, and leads to tests that verify every call.</p>` },
  mcq: { q: 'Which double is the best default when you want tests that survive refactoring?', options: ['Strict mock with verify on every call', 'Fake with real in-memory behaviour, asserting on resulting state', 'Dummy', 'Spy on the class under test'], answer: 1, explain: 'A fake lets you assert outcomes, not call sequences, so internal restructuring does not break tests.' },
  hints: [
    `<p>Ask: does it have real working logic (fake), canned answers (stub), recorded calls (spy), built-in expectations (mock), or is it never used (dummy)?</p>`,
    `<p>"Verify" with expectations set before the act usually signals a mock; reading recorded calls afterwards signals a spy.</p>`,
    `<p>Answer format: 1 fake (assert state), 2 dummy (assert nothing; it proves the path is not taken), 3 stub (result), 4 mock (interaction), 5 spy (recorded calls).</p>`
  ],
  solution: {
    approach: `<p>1 = <b>fake</b>: it has working behaviour (store/find), so tests assert on resulting state. 2 = <b>dummy</b>: only fills the parameter list; if the code touches it the test fails, which proves that branch was not taken. 3 = <b>stub</b>: returns a canned value (9:00) so the result becomes deterministic. 4 = <b>mock</b>: carries an expectation (called exactly once with these arguments) that fails the test when not met, so it asserts on interactions. 5 = <b>spy</b>: records calls and lets the test inspect them afterwards. Note that Mockito objects play several roles depending on how you use them (stubbed with <code>when</code>, verified with <code>verify</code>).</p>`,
    complexity: `<p>Vocabulary exercise; no runtime cost. Prefer the simplest double that supports the assertion.</p>`
  }
});

practice.push({
  title: 'Fix the Flaky Greeting Test',
  level: 'Easy', tags: ['determinism', 'clock', 'flaky tests'], companies: ['Atlassian', 'Shopify'],
  statement: `<p>This test passes in the morning and fails in the afternoon. Fix the production class (not just the test) so the test is deterministic for both cases, and add tests for exactly 12:00 and 11:59.</p>
    <pre>class Greeter { String greet() { return LocalTime.now().getHour() &lt; 12 ? "Good morning" : "Good afternoon"; } }</pre>`,
  constraints: `Java 21, no mocking library, no static mocking. Greeter must work in production without extra setup.`,
  example: `<p>At 09:00 -> ${H.c('g', '"Good morning"')}; at 15:00 -> ${H.c('g', '"Good afternoon"')}; at 12:00 -> afternoon (hour is not &lt; 12); 11:59 -> morning.</p>`,
  brute: { why: `<p>Use <code>Thread.sleep</code> or run the test only in the morning, or mock the static <code>LocalTime.now()</code> with a bytecode tool. All are fragile or hide the real issue: time is a hidden input.</p>` },
  mcq: { q: 'What is the cleanest fix for code that calls LocalTime.now()?', options: ['Inject a java.time.Clock and call LocalTime.now(clock)', 'Wrap the test in try/catch', 'Skip the test after noon', 'Use Thread.sleep until morning'], answer: 0, explain: 'Make time an explicit dependency: Clock.systemUTC() in production, Clock.fixed(...) in tests.' },
  hints: [
    `<p>The aha: the current time is a <b>hidden input</b>. Hidden inputs make tests non-deterministic.</p>`,
    `<p>Pass a <code>Clock</code> into the constructor; <code>LocalTime.now(clock)</code> reads from it. Production uses <code>Clock.systemDefaultZone()</code>.</p>`,
    `<p>Create fixed clocks with <code>Clock.fixed(Instant.parse("..."), ZoneOffset.UTC)</code> and assert at 11:59, 12:00 and 09:00.</p>`
  ],
  solution: {
    approach: `<p>Inject a <code>Clock</code> through the constructor and read it with <code>LocalTime.now(clock)</code>. Production wiring passes <code>Clock.systemDefaultZone()</code> (keep a no-arg convenience constructor); tests pass <code>Clock.fixed</code>. Boundary tests at 11:59 and 12:00 catch the classic off-by-one.</p>`,
    code: `class Greeter {
    private final Clock clock;
    Greeter() { this(Clock.systemDefaultZone()); }
    Greeter(Clock clock) { this.clock = clock; }

    String greet() { return LocalTime.now(clock).getHour() < 12 ? "Good morning" : "Good afternoon"; }

    static Clock at(String hhmm) { return Clock.fixed(Instant.parse("2026-01-05T" + hhmm + ":00Z"), ZoneOffset.UTC); }
    static void check(String expected, String actual) { System.out.println((expected.equals(actual) ? "PASS " : "FAIL ") + actual); }

    public static void main(String[] args) {
        check("Good morning", new Greeter(at("09:00")).greet());
        check("Good morning", new Greeter(at("11:59")).greet());
        check("Good afternoon", new Greeter(at("12:00")).greet());
        check("Good afternoon", new Greeter(at("15:00")).greet());
    }
}`,
    complexity: `<p>O(1). The gain is determinism: the suite gives the same result at any time of day.</p>`
  }
});

practice.push({
  title: 'Spot the Dependency Rule Violation',
  level: 'Easy', tags: ['clean architecture', 'dependency rule'], companies: ['Amazon'],
  statement: `<p>Given these imports, mark each as OK or a violation of the dependency rule and explain: (a) <code>domain.Order</code> imports <code>jakarta.persistence.Entity</code>; (b) <code>adapter.web.OrderController</code> imports <code>application.PlaceOrderUseCase</code>; (c) <code>application.OrderService</code> imports <code>adapter.db.JpaOrderRepository</code>; (d) <code>adapter.db.JpaOrderRepository</code> imports <code>application.port.OrderRepository</code>; (e) <code>domain.Money</code> imports <code>java.math.BigDecimal</code>.</p>`,
  constraints: `Strict hexagonal rules: domain and application must not depend on adapters or on frameworks.`,
  example: `<p>(b) ${H.c('g', 'OK')}: an outer adapter may know an inner port. (c) ${H.c('r', 'violation')}: the inner application depends on an outer concrete class.</p>`,
  brute: { why: `<p>Judging by package names only ("they are all in the same project, so it is fine") ignores the direction of the arrows, which is what protects testability and replaceability.</p>` },
  mcq: { q: 'What should OrderService depend on to save an order?', options: ['JpaOrderRepository', 'An OrderRepository interface owned by the application', 'EntityManager', 'DataSource'], answer: 1, explain: 'Depend on an abstraction owned by the inner ring; let the JPA adapter implement it (dependency inversion).' },
  hints: [
    `<p>Draw the rings: domain in the middle, application around it, adapters outside. Arrows may only point inward.</p>`,
    `<p>Framework imports (Spring, JPA, Jackson) are outer-ring knowledge. JDK types like <code>BigDecimal</code> are fine anywhere.</p>`,
    `<p>Check each import: does the importing class sit in an inner ring while the imported class sits in an outer ring? That is a violation.</p>`
  ],
  solution: {
    approach: `<p>(a) <b>Violation</b> in the strict sense - the domain depends on a persistence framework annotation; acceptable only as a conscious, documented pragmatic trade-off, otherwise use a separate JPA entity in the adapter. (b) <b>OK</b> - adapter depends inward on the inbound port. (c) <b>Violation</b> - application depends on a concrete outer class; introduce an <code>OrderRepository</code> port in the application and let the adapter implement it. (d) <b>OK</b> - this is dependency inversion: the adapter implements the port owned by the application. (e) <b>OK</b> - standard library types are stable and framework-free. Enforce all of this with ArchUnit so it cannot rot.</p>`,
    complexity: `<p>Conceptual check; automate with an ArchUnit rule running in the unit-test stage (milliseconds).</p>`
  }
});

practice.push({
  title: 'Diagnose the Ice-Cream Cone',
  level: 'Easy', tags: ['test pyramid', 'strategy'], companies: ['Thoughtworks', 'Atlassian'],
  statement: `<p>A team has 40 unit tests, 30 integration tests and 400 browser E2E tests. CI takes 85 minutes and 9% of runs fail randomly. Describe the shape, list three problems it causes, and give a four-step plan to fix it without stopping feature work.</p>`,
  constraints: `The plan must reduce CI time below 15 minutes within a quarter and must not remove coverage of critical journeys.`,
  example: `<p>Shape: ${H.c('r', 'ice-cream cone')} (heavy on top). Problems: slow feedback, flaky red builds that teams ignore, hard-to-diagnose failures.</p>`,
  brute: { why: `<p>"Add more parallel CI machines." This hides slowness without fixing flakiness or the cost of maintaining 400 brittle tests, and the bill grows.</p>` },
  mcq: { q: 'Which first step is the best?', options: ['Delete all E2E tests', 'Map each E2E test to the rule it really checks and re-implement it as unit/integration/contract tests; keep a few smoke tests', 'Add retries to all E2E tests', 'Run E2E only on Fridays'], answer: 1, explain: 'Move each check to the lowest level that can catch the bug; keep a small number of journeys as E2E smoke tests.' },
  hints: [
    `<p>The aha: most E2E tests check rules that a unit or integration test could catch far faster.</p>`,
    `<p>Classify the 400 tests by the rule they verify; cluster and replace. Quarantine flaky ones immediately.</p>`,
    `<p>Plan: freeze new E2E; migrate by risk; keep 10 golden-path smoke tests; add contract tests at service boundaries; publish suite time and flake rate on a dashboard.</p>`
  ],
  solution: {
    approach: `<p>Shape: an <b>ice-cream cone</b> (few unit tests, very many E2E). Problems: (1) feedback takes over an hour so developers batch changes and skip running tests; (2) 9% random failures teach everyone to re-run and ignore red; (3) a failing E2E gives no location of the bug, so diagnosis is slow; plus high maintenance cost. <b>Plan:</b> (1) quarantine the flakiest 10% this week and freeze new E2E tests; (2) triage the 400 tests by the rule they check, and re-write them as unit tests (business rules), integration tests with Testcontainers (persistence, messaging) and contract tests (service boundaries) in order of failure frequency and value; (3) keep about 10 E2E golden-path smoke tests run after deploy, not on every commit; (4) track total time, flake rate and test count per layer on a dashboard and set the target (under 15 minutes, under 1% flake). Critical journeys stay covered by the smoke suite.</p>`,
    complexity: `<p>Expected outcome: units run in seconds, integration in a few minutes, smoke tests in about 5 minutes; total pipeline under 15 minutes.</p>`
  }
});

/* ============================ PRACTICE: MEDIUM ============================ */
practice.push({
  title: 'Signup Service with a Fake Mailer and Fake Store',
  level: 'Medium', tags: ['fake', 'spy', 'unit testing'], companies: ['Shopify', 'Stripe'],
  statement: `<p>Write <code>SignupService.signUp(email)</code>: reject invalid email (no "@") with <code>IllegalArgumentException</code>; return false for a duplicate; otherwise save the user and send exactly one welcome mail. Provide a fake user store, a spy mailer, a tiny assertion helper and a <code>main</code> running at least four tests.</p>`,
  constraints: `Plain Java, no libraries. Each test builds fresh doubles. Mailer failure must not roll back the saved user (log and continue) - test that as well.`,
  example: `<p>"a@x.com" first time -> ${H.c('g', 'true, 1 mail')}; again -> ${H.c('y', 'false, no new mail')}; "nope" -> ${H.c('r', 'IllegalArgumentException')}; mailer throws -> ${H.c('g', 'true, user still saved')}.</p>`,
  brute: { why: `<p>Use real SMTP and a real database in the test. Slow, needs network, risk of sending real mail, and impossible to simulate "mail server down" reliably.</p>` },
  mcq: { q: 'To test "mailer failure does not lose the user", which double is simplest?', options: ['A mailer stub that throws an exception', 'A real SMTP server turned off', 'A dummy', 'A fake repository'], answer: 0, explain: 'A stub that throws forces the failure branch deterministically, and the test asserts the user is still saved.' },
  hints: [
    `<p>Depend on two interfaces: <code>UserStore</code> and <code>Mailer</code>, injected by constructor.</p>`,
    `<p>Write <code>FakeUserStore</code> (HashSet), <code>SpyMailer</code> (list of recipients) and <code>ThrowingMailer</code> (stub).</p>`,
    `<p>Order of work: validate, check duplicate, save, then try to send in try/catch. Test the four outcomes.</p>`
  ],
  solution: {
    approach: `<p>The service is plain Java with two ports. The fake store holds a set; the spy mailer records recipients; a throwing mailer stub forces the failure branch. The mail is sent after saving and wrapped in try/catch so a mail outage cannot undo the signup (a real system would queue a retry). The assertion helper throws AssertionError with a message, and main runs every test in isolation.</p>`,
    code: `import java.util.*;

interface UserStore { boolean exists(String e); void save(String e); }
interface Mailer { void send(String to); }

class SignupService {
    private final UserStore store; private final Mailer mailer;
    SignupService(UserStore store, Mailer mailer) { this.store = store; this.mailer = mailer; }
    boolean signUp(String email) {
        if (email == null || !email.contains("@")) throw new IllegalArgumentException("invalid email");
        if (store.exists(email)) return false;
        store.save(email);
        try { mailer.send(email); } catch (RuntimeException e) { System.out.println("mail failed, will retry later"); }
        return true;
    }
}
class FakeStore implements UserStore {
    final Set<String> saved = new HashSet<>();
    public boolean exists(String e) { return saved.contains(e); }
    public void save(String e) { saved.add(e); }
}
class SpyMail implements Mailer { final List<String> to = new ArrayList<>(); public void send(String t) { to.add(t); } }
class ThrowingMail implements Mailer { public void send(String t) { throw new IllegalStateException("smtp down"); } }

class SignupTests {
    static void is(boolean ok, String name) { if (!ok) throw new AssertionError(name); System.out.println("PASS " + name); }
    public static void main(String[] args) {
        FakeStore s1 = new FakeStore(); SpyMail m1 = new SpyMail();
        is(new SignupService(s1, m1).signUp("a@x.com") && m1.to.equals(List.of("a@x.com")), "new user saved and mailed once");
        FakeStore s2 = new FakeStore(); SpyMail m2 = new SpyMail(); SignupService svc = new SignupService(s2, m2);
        svc.signUp("a@x.com");
        is(!svc.signUp("a@x.com") && m2.to.size() == 1, "duplicate rejected, no second mail");
        try { new SignupService(new FakeStore(), new SpyMail()).signUp("nope"); is(false, "invalid email rejected"); }
        catch (IllegalArgumentException expected) { is(true, "invalid email rejected"); }
        FakeStore s3 = new FakeStore();
        is(new SignupService(s3, new ThrowingMail()).signUp("b@x.com") && s3.saved.contains("b@x.com"), "mail failure keeps the user");
    }
}`,
    complexity: `<p>O(1) per call; all tests together run in milliseconds because nothing does I/O.</p>`,
    followUps: ['How would you retry failed mails reliably?', 'How would you add an outbox so save and mail intent are atomic?']
  }
});

practice.push({
  title: 'Mockito Test with ArgumentCaptor and Strict Stubs',
  level: 'Medium', tags: ['mockito', 'unit testing'], companies: ['Netflix'],
  statement: `<p>An <code>OrderService.cancel(orderId)</code> loads an order from <code>OrderRepository</code>, refuses (throws <code>IllegalStateException</code>) if it is already shipped, otherwise saves it with status CANCELLED and publishes <code>OrderCancelled(orderId)</code> through an <code>EventPublisher</code>. Write Mockito tests for both paths, use an <code>ArgumentCaptor</code> to inspect the saved order, and avoid over-verifying.</p>`,
  constraints: `JUnit 5 + Mockito + AssertJ. Strict stubs (MockitoExtension). Do not verify the order of unrelated calls.`,
  example: `<p>Order "o1" status PAID -> ${H.c('g', 'saved with CANCELLED, one event published')}. Order "o2" status SHIPPED -> ${H.c('r', 'IllegalStateException, nothing saved, no event')}.</p>`,
  brute: { why: `<p>Verifying every call in order with <code>InOrder</code> and <code>verifyNoMoreInteractions</code> on all mocks. The test mirrors the implementation and breaks on harmless refactors.</p>` },
  mcq: { q: 'When is ArgumentCaptor most useful?', options: ['To replace assertions entirely', 'When you must inspect an object the code passes to a collaborator', 'To speed up tests', 'To mock static methods'], answer: 1, explain: 'A captor retrieves the actual argument so you can assert on its fields, instead of matching with brittle equals.' },
  hints: [
    `<p>Use <code>@Mock</code> for repository and publisher, <code>@InjectMocks</code> for the service, stub <code>findById</code> with <code>when(...)</code>.</p>`,
    `<p>Capture the saved order with <code>ArgumentCaptor&lt;Order&gt;</code> and assert its status. Publishing is an observable behaviour, so verify it once.</p>`,
    `<p>For the failure path, assert the exception and use <code>verify(repo, never()).save(any())</code> and <code>verifyNoInteractions(publisher)</code>.</p>`
  ],
  solution: {
    approach: `<p>The two paths map to two tests. In the happy path, stub the repository to return a PAID order, call <code>cancel</code>, capture the argument passed to <code>save</code>, assert status CANCELLED, and verify that exactly one <code>OrderCancelled</code> event with the right id was published (the event is the observable behaviour, so verifying it is justified). In the shipped path, assert the exception message and that nothing was saved or published. With strict stubs unused stubbing fails the test, so there is no dead setup. Do not verify call order or the <code>findById</code> call itself: that is implementation detail.</p>`,
    code: { lang: 'java', check: false, code: `@ExtendWith(MockitoExtension.class)
class OrderServiceCancelTest {
    @Mock OrderRepository repo;
    @Mock EventPublisher publisher;
    @InjectMocks OrderService service;
    @Captor ArgumentCaptor<Order> saved;

    @Test
    void cancelsPaidOrderAndPublishesEvent() {
        when(repo.findById("o1")).thenReturn(Optional.of(new Order("o1", "PAID")));
        service.cancel("o1");
        verify(repo).save(saved.capture());
        assertThat(saved.getValue().status()).isEqualTo("CANCELLED");
        verify(publisher).publish(new OrderCancelled("o1"));
    }

    @Test
    void refusesToCancelShippedOrder() {
        when(repo.findById("o2")).thenReturn(Optional.of(new Order("o2", "SHIPPED")));
        assertThatThrownBy(() -> service.cancel("o2")).isInstanceOf(IllegalStateException.class);
        verify(repo, never()).save(any());
        verifyNoInteractions(publisher);
    }
}` },
    complexity: `<p>Each test runs in about 5-20 ms. Maintenance cost depends on how little the test knows about internals.</p>`,
    followUps: ['Rewrite the same tests with an InMemoryOrderRepository fake and compare brittleness.', 'How would you test that the event is only published after the save succeeds?']
  }
});

practice.push({
  title: 'Make a Slow Testcontainers Suite Fast',
  level: 'Medium', tags: ['testcontainers', 'performance', 'ci'], companies: ['Zalando', 'Revolut'],
  statement: `<p>A service has 25 integration test classes, each annotated with its own <code>@Container</code> Postgres and <code>@SpringBootTest</code> with different <code>@MockBean</code>s. The suite takes 14 minutes. Explain the causes and give a concrete plan to get it under 4 minutes without losing realism.</p>`,
  constraints: `Spring Boot 3.3, Maven, GitHub Actions, Postgres 16 in production, 4 CPU cores in CI.`,
  example: `<p>Observed: 25 container starts x about 3 s = 75 s; 25 Spring contexts (each different because of mock beans) x about 12 s = 300 s; plus tests.</p>`,
  brute: { why: `<p>Throw away containers and switch to H2, or raise the machine size. H2 loses realism (dialect, locks, jsonb); a bigger machine only helps a little with serial waste.</p>` },
  mcq: { q: 'Why do many different @MockBean combinations slow a Spring suite?', options: ['Mockito is slow', 'Each unique configuration forces a new application context to be built instead of reusing the cached one', 'Docker restarts', 'JUnit runs tests twice'], answer: 1, explain: 'Spring caches contexts by configuration; different @MockBean sets create different keys, so contexts are rebuilt.' },
  hints: [
    `<p>Find where time goes: container startups, Spring context creation, data setup, Flyway. Measure before changing anything.</p>`,
    `<p>Use one singleton container for the JVM and share a base class so Spring can reuse one cached context; replace most <code>@SpringBootTest</code> with slices.</p>`,
    `<p>Clean data with truncate or rollback, use tmpfs, run unit tests first (fail fast), consider parallel forks with separate schemas.</p>`
  ],
  solution: {
    approach: `<p><b>Diagnose</b> with timestamps from surefire reports and the Spring context-cache statistics. Typical culprits: (1) a container per class, (2) a new Spring context per unique <code>@MockBean</code>/property combination, (3) heavy full-context tests for things a slice could check, (4) data setup with long scripts, (5) Flyway re-run each time.</p>
          <p><b>Plan.</b> (a) One static singleton Postgres in an abstract base class, started once per JVM (or Testcontainers reuse locally); tmpfs for the data directory. (b) Standardise the context: move mock beans into a shared <code>@TestConfiguration</code> so most classes share one cached context; use <code>@DirtiesContext</code> only when unavoidable. (c) Convert repository tests to <code>@DataJpaTest</code> (JPA slice, about 1 s) and controller tests to <code>@WebMvcTest</code>; keep about 5 full-stack tests. (d) Isolation by <code>@Transactional</code> rollback or <code>TRUNCATE</code> instead of new containers. (e) Run Failsafe in 2 parallel forks, each with its own database name on the same container. (f) In CI cache the Maven repo and Docker image layers; run unit tests first to fail fast. Expected result: one container start (3 s), 3-4 contexts (about 40 s), tests (about 60 s), under 4 minutes total, still on real Postgres.</p>`,
    complexity: `<p>Cost model: total = containers x start + distinct contexts x boot + tests. The plan reduces the first two multipliers from 25 to about 1 and 4.</p>`,
    followUps: ['How do you stop the problem from returning?', 'What changes if tests must run on Kubernetes-based CI without Docker?']
  }
});

practice.push({
  title: 'Provider Verification with Provider States',
  level: 'Medium', tags: ['pact', 'provider verification', 'contract testing'], companies: ['Zalando'],
  statement: `<p>The Billing consumer's pact has two interactions: <i>given invoice 7 exists</i> -> <code>GET /invoices/7</code> returns 200 with <code>{id, amountCents}</code>; <i>given no invoice 99 exists</i> -> <code>GET /invoices/99</code> returns 404. Write the provider-side verification set-up and explain how the states make the test deterministic.</p>`,
  constraints: `Spring Boot provider, Pact JVM, broker credentials from environment variables, no real database in this verification.`,
  example: `<p>State "invoice 7 exists" makes the repository return invoice 7 -> ${H.c('g', '200')}; state "no invoice 99 exists" makes it return empty -> ${H.c('g', '404')}.</p>`,
  brute: { why: `<p>Seed a shared test database with production-like data and hope the ids exist. States become implicit, data drifts, and the verification fails for reasons unrelated to the contract.</p>` },
  mcq: { q: 'What is a provider state?', options: ['An HTTP status code', 'A named precondition the provider sets up before replaying an interaction', 'A deployment environment', 'A database migration'], answer: 1, explain: 'It is the "given ..." part of the contract; the provider maps each name to set-up code so the replay is deterministic.' },
  hints: [
    `<p>Each interaction's "given" text maps to a <code>@State</code> method in the provider test.</p>`,
    `<p>Mock the repository with <code>@MockBean</code> so you control what exists; the HTTP layer, serialization and filters remain real.</p>`,
    `<p>Read the broker URL and token from environment variables via the Pact annotations/properties, never from code.</p>`
  ],
  solution: {
    approach: `<p>Run a <code>@SpringBootTest</code> on a random port and use <code>PactVerificationContext</code> with an <code>HttpTestTarget</code> pointing at it. Annotate the class with <code>@Provider("billing-service")</code> and <code>@PactBroker</code>; the broker URL, token and provider version are provided through environment/system properties set in CI secrets. Define <code>@State("invoice 7 exists")</code> to make the mocked <code>InvoiceRepository</code> return an invoice with id 7 and amount 1999, and <code>@State("no invoice 99 exists")</code> to return <code>Optional.empty()</code>. Each state executes before its interaction, so the test is deterministic and independent of any database. Publish results with the git SHA, and call can-i-deploy before releasing.</p>`,
    code: { lang: 'java', check: false, code: `@Provider("billing-service")
@PactBroker      // pactbroker.url / auth token come from env or -D properties set by CI
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class InvoiceProviderPactTest {
    @LocalServerPort int port;
    @MockBean InvoiceRepository invoices;

    @BeforeEach void target(PactVerificationContext ctx) { ctx.setTarget(new HttpTestTarget("localhost", port)); }

    @TestTemplate
    @ExtendWith(PactVerificationInvocationContextProvider.class)
    void verify(PactVerificationContext ctx) { ctx.verifyInteraction(); }

    @State("invoice 7 exists")
    void invoice7() { when(invoices.findById("7")).thenReturn(Optional.of(new Invoice("7", 1999))); }

    @State("no invoice 99 exists")
    void noInvoice99() { when(invoices.findById("99")).thenReturn(Optional.empty()); }
}` },
    complexity: `<p>Each interaction replay takes a few milliseconds plus one application start (about 5 s per provider build).</p>`,
    followUps: ['What if the consumer adds a state that the provider cannot reproduce?', 'How do you handle authentication headers in replayed requests?']
  }
});

practice.push({
  title: 'Choose Slice Tests vs Full-Stack Tests for a Controller',
  level: 'Medium', tags: ['spring boot', 'slice tests', 'test strategy'], companies: ['VMware'],
  statement: `<p>For a Spring Boot <code>OrderController</code>, decide which of these checks belong in <code>@WebMvcTest</code>, which in <code>@DataJpaTest</code> with Testcontainers, which in plain unit tests, and which in a single <code>@SpringBootTest</code>: (1) validation error returns 400 with problem-details; (2) the service applies the 10% bulk discount; (3) an unauthenticated request gets 401; (4) the JPA query for "latest 3 orders"; (5) the beans are wired and the app starts with the prod profile; (6) JSON field names in the response.</p>`,
  constraints: `Minimise suite time; each check must be tested at exactly one level.`,
  example: `<p>(2) ${H.c('g', 'plain unit test')} - pure rule, no Spring. (4) ${H.c('b', '@DataJpaTest + Testcontainers')} - real SQL.</p>`,
  brute: { why: `<p>Put everything in <code>@SpringBootTest</code> for convenience. Each test boots the whole application (10 s+), the discount rule is hidden behind HTTP, and failures are hard to localise.</p>` },
  mcq: { q: 'What does @WebMvcTest start?', options: ['The full application with a database', 'Only the web layer (controllers, filters, JSON mapping); other beans must be mocked', 'Only the JPA layer', 'Nothing'], answer: 1, explain: 'It is a slice: MVC infrastructure only, so the test is fast and focused on HTTP concerns.' },
  hints: [
    `<p>Ask which layer's behaviour you are checking: HTTP mapping, a rule, SQL, security, or wiring.</p>`,
    `<p>Use the cheapest slice that exercises that layer for real; mock the layers below it.</p>`,
    `<p>Assign: 1,3,6 to WebMvcTest (3 with spring-security-test); 2 unit; 4 DataJpaTest + Testcontainers; 5 one SpringBootTest smoke.</p>`
  ],
  solution: {
    approach: `<p>(1) <b>@WebMvcTest</b> with the use case mocked: validation, exception handlers and problem-details are web-layer behaviour. (2) <b>Plain unit test</b> of the service with in-memory adapters: a pure rule needs no Spring. (3) <b>@WebMvcTest</b> with <code>spring-security-test</code> (<code>@WithMockUser</code> or no user) imported security config; it verifies filters and authorization rules cheaply. (4) <b>@DataJpaTest</b> with <code>replace = NONE</code> and a Postgres Testcontainer: it exercises real SQL, mappings and ordering. (5) <b>One @SpringBootTest</b> smoke test with the prod-like profile (context loads, health endpoint up): the only place that proves wiring and configuration. (6) <b>@WebMvcTest</b> with JSON assertions, or better a contract test if other services consume the shape. Result: about 50 millisecond-level unit tests, 10 slices at 1-2 s start, 5 DB tests sharing one container, 1 full-stack test.</p>`,
    complexity: `<p>Context startup cost: unit 0 s, WebMvc slice about 1-2 s (cached across classes), DataJpa slice about 2 s plus container, full stack 8-15 s.</p>`,
    followUps: ['How do you keep slices from sharing too many context variants?', 'Where do you test CORS configuration?']
  }
});

practice.push({
  title: 'Design the Ports for a Notification Feature',
  level: 'Medium', tags: ['hexagonal', 'ports and adapters', 'design'], companies: ['Slack', 'Twilio'],
  statement: `<p>The Orders core must notify customers when an order ships: by email today, SMS and push next quarter, with per-customer preferences and quiet hours. Design the ports (inbound and outbound), the adapters and how you will test it. Keep the core free of provider SDKs.</p>`,
  constraints: `Providers may change; delivery may fail and need retries; messages must not be sent twice for the same event.`,
  example: `<p>Outbound port ${H.c('b', 'CustomerNotifier.notify(customerId, OrderShippedMessage)')} implemented by Email, SMS and Push adapters, selected by a preference policy in the core.</p>`,
  brute: { why: `<p>Inject <code>SendGridClient</code> and <code>TwilioClient</code> into <code>OrderService</code> and write if/else per channel. Adding a provider edits core code, tests need provider sandboxes, and duplicates are not prevented.</p>` },
  mcq: { q: 'Where should the decision "which channel for this customer, respecting quiet hours" live?', options: ['In each provider adapter', 'In the core as policy, with channels behind a port', 'In the database', 'In the controller'], answer: 1, explain: 'It is business policy, so it belongs in the core; adapters only deliver on one channel.' },
  hints: [
    `<p>Separate the <b>policy</b> (who gets what, when) from the <b>delivery</b> (how a channel sends).</p>`,
    `<p>Outbound ports: <code>CustomerNotifier</code> per channel or one <code>ChannelSender</code> interface, <code>PreferencesRepository</code>, <code>SentLog</code> for idempotency.</p>`,
    `<p>Driving side: an event listener adapter turning <code>OrderShipped</code> into a use-case call; retries via a queue; idempotency key = event id + channel.</p>`
  ],
  solution: {
    approach: `<p><b>Inbound:</b> use case <code>NotifyOrderShipped(orderId)</code> driven by a Kafka-listener adapter for the <code>OrderShipped</code> event. <b>Core:</b> a <code>NotificationPolicy</code> picks channels from the customer's preferences and quiet hours (using an injected <code>Clock</code>) and creates a <code>Message</code> with an idempotency key <code>eventId:channel</code>. <b>Outbound ports:</b> <code>PreferencesRepository</code>, <code>SentLog</code> (records keys, prevents duplicates), <code>ChannelSender</code> with a method <code>send(Message)</code> and a <code>channel()</code> identifier. <b>Adapters:</b> <code>EmailSenderAdapter</code> (SMTP/provider API), <code>SmsSenderAdapter</code>, <code>PushSenderAdapter</code>, plus in-memory versions for tests. Failures are reported through the port as typed results (retryable or permanent); a retry adapter republishes retryable ones with backoff and dead-letters permanent ones. <b>Testing:</b> unit-test the policy (quiet hours, preference combinations, duplicates) with fakes and a fixed clock; adapter integration tests with WireMock/MailHog/LocalStack; contract tests for provider APIs; one smoke test. Adding SMS later means a new adapter and a preference value, no change to the use case.</p>`,
    complexity: `<p>Policy evaluation is O(channels). Reliability comes from idempotent sends (SentLog) and at-least-once delivery from the queue.</p>`,
    followUps: ['How do you prevent a duplicate email if the provider call succeeded but the SentLog write failed?', 'How would you test quiet hours across time zones?']
  }
});

/* ============================ PRACTICE: HARD ============================ */
practice.push({
  title: 'Context Map for an E-Commerce Company',
  level: 'Hard', tags: ['ddd', 'context map', 'team topologies'], companies: ['Amazon', 'Zalando', 'Shopify'],
  statement: `<p>An e-commerce company has these areas: Catalog (products, content), Search, Pricing and Promotions, Cart and Checkout, Orders, Inventory, Warehouse and Shipping, Payments (external PSP), Customer Accounts, Returns, Marketing email (external SaaS), and a 15-year-old ERP that still owns finance and supplier data. Draw the context map: list the contexts, the upstream/downstream direction of the main relationships, and the pattern on each (Partnership, Shared Kernel, Customer/Supplier, Conformist, ACL, OHS+PL, Separate Ways). Justify the three riskiest relationships.</p>`,
  constraints: `8 teams. The ERP cannot be changed. The PSP and email SaaS are vendors. Search and Catalog must scale for read-heavy traffic.`,
  example: `<p>Fragment: Catalog -> Search ${H.c('b', 'OHS + PL')} (catalog publishes ProductChanged events with a versioned schema); Payments PSP -> Payments ${H.c('y', 'ACL')}; ERP -> Finance ${H.c('y', 'ACL')}.</p>`,
  brute: { why: `<p>One shared "product/order/customer" database used by all teams, plus point-to-point API calls everywhere. There is no explicit direction or ownership, a change in the ERP schema breaks five services, and teams negotiate every change in meetings.</p>` },
  mcq: { q: 'The email SaaS vendor changes its API model yearly. Which pattern protects Marketing?', options: ['Shared kernel with the vendor', 'Anti-corruption layer around the vendor client', 'Conformist everywhere', 'Open host service'], answer: 1, explain: 'An ACL confines vendor concepts to one adapter, so vendor changes touch one class instead of the domain.' },
  hints: [
    `<p>The aha: place external systems (PSP, ERP, SaaS) on the map as <b>upstream</b> parties you do not control, then choose ACL or Conformist for each.</p>`,
    `<p>Find contexts with many consumers (Catalog, Customer Accounts, Pricing): they should be Open Host Services with a Published Language.</p>`,
    `<p>List the risky relationships: ERP integration, Orders/Inventory/Checkout consistency, Pricing consumed by Cart, Search and Catalog. For each write the failure mode and the mitigation.</p>`
  ],
  solution: {
    approach: `<p><b>Contexts and subdomains.</b> Core: Pricing and Promotions, Catalog, Checkout/Orders (revenue path), Search (differentiator). Supporting: Inventory, Warehouse and Shipping, Returns, Customer Accounts. Generic: Payments (PSP), Marketing email (SaaS), Identity. Legacy: ERP (finance, suppliers) as a Big Ball of Mud to be fenced.</p>
          <p><b>Relationships.</b> (1) Catalog -> Search, Cart, Marketing: Catalog is an <b>Open Host Service with Published Language</b> (versioned product events and API). (2) Pricing -> Cart/Checkout: <b>Customer/Supplier</b> - Checkout is the main customer and its needs (quote API, timeouts) drive Pricing's roadmap. (3) Cart/Checkout -> Orders: <b>Partnership</b> (released together; one team can own both initially). (4) Orders -> Inventory, Shipping, Returns: events, <b>Customer/Supplier</b>, with a saga for reserve-stock/charge/ship. (5) Payments PSP -> Payments context: <b>ACL</b>, because the PSP model (intents, webhooks, statuses) must not leak. (6) Marketing SaaS -> Marketing: <b>ACL</b> (or Conformist if the use is trivial). (7) ERP -> Finance/Supplier integration: <b>ACL</b> plus read model, strangler-fig migration; the ERP stays upstream until replaced. (8) Customer Accounts -> everyone: <b>OHS + PL</b> (identity, profile events). (9) Shared Kernel: only tiny Money/Currency/CountryCode value types in a versioned library. (10) Marketing and Returns: <b>Separate Ways</b> unless a real need appears.</p>
          <p><b>Three riskiest relationships.</b> (a) <b>ERP</b>: slow, fragile and unchangeable; mitigate with ACL, async batch/CDC read models, circuit breakers and reconciliation jobs, and a plan to extract finance gradually. (b) <b>Checkout - Inventory - Payments consistency</b>: three contexts must agree on an order; use a saga with compensations, idempotency keys and a transactional outbox, accept eventual consistency in the UX. (c) <b>Pricing - Cart</b>: wrong prices cost money; use a synchronous quote API with a short timeout, cache with TTL, version the quote, contract tests on both sides and a signed quote id the order must carry.</p>
          <p><b>Teams.</b> Align stream teams to contexts (Discovery: Catalog+Search; Marketplace: Pricing; Buy Flow: Cart, Checkout, Orders; Fulfilment: Inventory, Warehouse, Shipping, Returns; Platform: Payments, Identity, Messaging; Finance Integration: ERP ACL). Review the map quarterly and mark arrows without an agreed pattern as risks.</p>`,
    complexity: `<p>Quality criteria: every arrow has a direction, a pattern and an owner; no shared databases; vendors and legacy are fenced by ACLs; cycles are removed or justified.</p>`,
    followUps: ['Which context would you extract from the monolith first?', 'How do you detect an accidental integration that is not on the map?']
  }
});

practice.push({
  title: 'Strangler Migration Plan: Monolith to Bounded Contexts',
  level: 'Hard', tags: ['strangler fig', 'migration', 'anti-corruption layer', 'architecture'], companies: ['Thoughtworks', 'Goldman Sachs'],
  statement: `<p>A 12-year-old Java monolith with one 400-table database handles Orders, Billing, Inventory and Reporting. Management wants microservices "within a year" without stopping feature delivery. Propose a migration plan: how to pick the first slice, how to route traffic, how new code reads and writes legacy data, how to handle the shared database, what to test at each step, and the exit criteria.</p>`,
  constraints: `20 engineers, weekly releases must continue, no big-bang cutover, strict audit requirements for Billing, peak traffic 500 req/s.`,
  example: `<p>Slice 1: ${H.c('g', 'Reporting')} (read-only, low risk) via CDC read model; slice 2: ${H.c('b', 'Notifications')}; slice 3: ${H.c('y', 'Inventory')}; Billing last.</p>`,
  brute: { why: `<p>Freeze features for 12 months and rewrite everything as 20 microservices, then cut over on a weekend. Risk is enormous, value arrives only at the end, the old and new behaviours drift, and the rewrite repeats old mistakes with new infrastructure.</p>` },
  mcq: { q: 'What does the routing layer (facade/proxy) enable in a strangler migration?', options: ['Deleting the monolith first', 'Sending individual routes to new services while the rest still goes to the monolith', 'Removing tests', 'Merging databases'], answer: 1, explain: 'It lets you migrate one capability at a time and roll back by flipping a route, which keeps risk small.' },
  hints: [
    `<p>The aha: migrate by <b>capability</b>, behind a routing proxy, with the old code still working as fallback. Pick low-risk, loosely coupled slices first.</p>`,
    `<p>Break the shared database gradually: read through an ACL or CDC read model first, move ownership of tables next, dual-writes are a last resort.</p>`,
    `<p>Each step needs: characterization tests on old behaviour, contract tests at the new boundary, shadow traffic comparison, a feature-flag cutover and a rollback plan.</p>`
  ],
  solution: {
    approach: `<p><b>0. Prepare.</b> Run event storming with the business to find bounded contexts, and analyse the code and database for coupling (which tables each module reads/writes). Add observability and <b>characterization tests</b> on the monolith's key behaviours so the old and new code can be compared. Put a routing facade (API gateway or reverse proxy) in front.</p>
          <p><b>1. Choose slices</b> by value and low coupling: Reporting first (read-only; build a read model fed by change-data-capture), then Notifications (event-driven, few writes), then Inventory, then Orders; Billing last because of audit risk. Anything with heavy cross-table transactions waits.</p>
          <p><b>2. Per slice (repeat).</b> (a) Define the new context's hexagonal domain and published events. (b) Build an <b>ACL</b> so the new code reads legacy data through its own port without adopting legacy names. (c) Implement the capability in the new service; run <b>shadow mode</b>: the proxy sends a copy of requests to the new service and compares answers without affecting users. (d) Cut over by feature flag, 1% -> 10% -> 100%, with dashboards and an instant rollback route. (e) Move data ownership: new service owns its tables; the monolith reads via the new API or an event-fed replica; remove the old code after a quiet period.</p>
          <p><b>3. Data.</b> Avoid dual-writes. Prefer single writer per table, outbox + CDC (e.g. Debezium) to publish changes, and idempotent consumers. Use the expand/contract pattern for schema changes. Reconciliation jobs compare counts and checksums between old and new stores.</p>
          <p><b>4. Testing at each step.</b> Characterization tests (golden master) for old behaviour; contract tests (Pact) between monolith and new service; Testcontainers integration tests for the new service; replay of production traffic in staging; load tests at 500 req/s with the proxy; audit-trail tests for Billing.</p>
          <p><b>5. Delivery and exit criteria.</b> Weekly releases continue because each slice is incremental and behind flags. Each slice is complete when traffic is 100% on the new service for 4 weeks, the old code and tables are deleted, and the SLOs hold. Success of the programme = monolith reduced to the contexts not worth moving; a stop at any point leaves a working system.</p>`,
    complexity: `<p>Not an algorithm; manage risk by slice size: aim for slices deliverable in 4-8 weeks, each independently reversible, with a measurable outcome (latency, deploy frequency, incident count).</p>`,
    followUps: ['What if two slices need the same table?', 'How do you convince management to stop at 60% migrated?']
  }
});

practice.push({
  title: 'Test Strategy for a 30-Microservice Platform',
  level: 'Hard', tags: ['test strategy', 'contract testing', 'microservices', 'ci/cd'], companies: ['Netflix', 'Spotify', 'Uber'],
  statement: `<p>A platform has 30 services owned by 8 teams, each deployed several times a day. The shared staging environment is broken half of the time and E2E tests take 70 minutes. Design a test strategy: the mix of tests per service, how services are verified against each other, what remains E2E, how production is protected, how flakiness is managed, and which metrics prove it works.</p>`,
  constraints: `Deploy to production continuously per service; mean time to restore under 15 minutes; CI per service under 10 minutes; no shared mutable test environment as a gate.`,
  example: `<p>Per service: ~${H.c('g', '70% unit')}, ${H.c('b', '20% integration (Testcontainers)')}, ${H.c('p', 'contracts for each boundary')}, ${H.c('y', 'no cross-service E2E in the PR gate')}.</p>`,
  brute: { why: `<p>One giant E2E suite on a shared staging environment as the release gate for all 30 services. It serialises deployments, fails for unrelated reasons, and gives no clear owner for a red build, so teams batch changes and bypass the gate.</p>` },
  mcq: { q: 'Which practice lets a team deploy their service without running every other service?', options: ['Consumer-driven contracts verified with can-i-deploy', 'More manual QA', 'Bigger staging cluster', 'Skipping tests'], answer: 0, explain: 'Contracts verify compatibility pairwise and the broker tells you if the version about to ship is safe against what runs in production.' },
  hints: [
    `<p>The aha: replace one big gate with many small, owned, fast gates: per-service tests plus per-boundary contracts.</p>`,
    `<p>Production safety comes from progressive delivery (canary, feature flags, automatic rollback) and monitoring - the last layer of the pyramid.</p>`,
    `<p>Keep a handful of synthetic E2E journeys running continuously against production (and after deploys), owned by a platform team, with alerts rather than blocking gates.</p>`
  ],
  solution: {
    approach: `<p><b>Per service (PR gate, under 10 min).</b> Unit tests with fakes at the ports (most tests); integration tests with Testcontainers for its database, cache and broker (about 20%); slice tests for HTTP; ArchUnit/lint rules; static analysis and dependency/security scans. Test data is created by the tests themselves, never shared.</p>
          <p><b>Between services.</b> Consumer-driven contracts (Pact) for every synchronous API, message pacts or schema-registry compatibility for events. Consumers publish pacts, providers verify in CI, <code>can-i-deploy</code> gates both sides against the environment actually running (production). Provider states are defined per contract. Public/partner APIs additionally have OpenAPI breaking-change checks.</p>
          <p><b>E2E.</b> Keep 5-10 critical journeys (sign-up, checkout, refund) as automated synthetic tests owned by a platform team. They run post-deploy against production-like environments and continuously in production with test accounts, and they alert instead of blocking each PR. No cross-service E2E in the PR gate.</p>
          <p><b>Environments.</b> Ephemeral per-PR environments (Kubernetes namespace or docker compose with only the dependencies a service needs, others replaced by contract-verified stubs). Avoid a shared mutable staging as a gate.</p>
          <p><b>Production protection.</b> Progressive delivery: canary or blue-green with automatic rollback on SLO regression, feature flags to decouple deploy from release, dark launches/shadow traffic for risky changes, observability with SLOs, tracing and alerting, load and chaos tests on a schedule.</p>
          <p><b>Flakiness policy.</b> Track flake rate per test; auto-quarantine after N flips; owners fix within a week or delete; ban sleeps; fixed clocks and random seeds; retries only at the CI job level with reporting, never silently.</p>
          <p><b>Metrics.</b> Lead time to production, deploy frequency, change failure rate, time to restore (DORA), CI duration per service, flake rate, escaped defects by layer, number of contract verification failures caught before deploy (evidence that contracts replace E2E).</p>`,
    complexity: `<p>Cost grows linearly with services (O(S) fast checks) plus O(boundaries) contracts, instead of O(S) services deployed together in one slow environment.</p>`,
    followUps: ['How do you handle a consumer you cannot reach (external partner)?', 'Which tests would you run in production and how do you keep them safe?']
  }
});

practice.push({
  title: 'Enforce Architecture with ArchUnit Fitness Functions',
  level: 'Hard', tags: ['archunit', 'architecture', 'fitness functions', 'modular monolith'], companies: ['Spotify', 'ThoughtWorks'],
  statement: `<p>Your modular monolith has modules <code>orders</code>, <code>billing</code> and <code>catalog</code>, each with <code>domain</code>, <code>application</code> and <code>adapter</code> packages. Write ArchUnit rules that fail the build when: (1) domain or application imports Spring or JPA; (2) domain or application imports an adapter; (3) a module accesses another module's internal packages (only its <code>api</code> package is allowed); (4) there are cyclic dependencies between modules; (5) classes named <code>*Controller</code> are not in an adapter.web package. Explain how you roll this out on an existing, messy codebase.</p>`,
  constraints: `ArchUnit 1.x, JUnit 5. The codebase already has 63 known violations that cannot all be fixed immediately.`,
  example: `<p>A class <code>billing.application.InvoiceService</code> importing <code>orders.adapter.db.OrderEntity</code> -> ${H.c('r', 'rule 3 violation')} (cross-module access to an internal adapter).</p>`,
  brute: { why: `<p>Rely on code review and a wiki page of rules. People forget under deadlines, reviewers miss imports in large diffs, and AI-generated code ignores unwritten rules. Violations accumulate silently.</p>` },
  mcq: { q: 'How do you introduce strict architecture rules in a codebase that already has violations?', options: ['Fail the build on day one', 'Freeze the existing violations (ArchUnit FreezingArchRule), fail on new ones, and burn the list down', 'Ignore the rules', 'Delete the tests'], answer: 1, explain: 'Freezing records the current violations in a store; only new violations fail the build, so you can improve gradually.' },
  hints: [
    `<p>The aha: architecture rules are tests ("fitness functions") that run in the normal unit-test stage in seconds.</p>`,
    `<p>Use <code>noClasses().that().resideInAPackage(...).should().dependOnClassesThat()...</code>, <code>slices().matching("..(*)..").should().beFreeOfCycles()</code> and <code>layeredArchitecture()</code>.</p>`,
    `<p>Roll-out: add the tests with <code>FreezingArchRule.freeze(rule)</code>, commit the violation store, make CI fail on any new violation, schedule burn-down.</p>`
  ],
  solution: {
    approach: `<p>Write five rules as a test class. Rule 1 and 2 are <code>noClasses()</code> rules from <code>..domain..</code> and <code>..application..</code> to framework and adapter packages. Rule 3 uses a naming convention: each module's public surface is <code>com.shop.&lt;module&gt;.api</code>; a rule says classes in module A may depend on module B only through B's <code>api</code> package. Rule 4 is <code>slices().matching("com.shop.(*)..").should().beFreeOfCycles()</code>. Rule 5 asserts that classes with a name ending in Controller reside in <code>..adapter.web..</code>. For the legacy mess wrap each rule in <code>FreezingArchRule.freeze(...)</code>: existing violations are stored in a committed file and tolerated, new violations fail the build, and fixed violations are removed from the store automatically. Track the count over time on a dashboard and agree a burn-down goal. Also run the rules in the IDE and document them in the agent instruction file so AI assistants follow them.</p>`,
    code: { lang: 'java', check: false, code: `@AnalyzeClasses(packages = "com.shop", importOptions = ImportOption.DoNotIncludeTests.class)
class ArchitectureRulesTest {

    @ArchTest
    static final ArchRule coreHasNoFrameworks = FreezingArchRule.freeze(
        noClasses().that().resideInAnyPackage("..domain..", "..application..")
            .should().dependOnClassesThat().resideInAnyPackage("org.springframework..", "jakarta.persistence..", "com.fasterxml.jackson.."));

    @ArchTest
    static final ArchRule coreDoesNotKnowAdapters = FreezingArchRule.freeze(
        noClasses().that().resideInAnyPackage("..domain..", "..application..")
            .should().dependOnClassesThat().resideInAPackage("..adapter.."));

    @ArchTest
    static final ArchRule modulesOnlyUseOtherModulesThroughApi = FreezingArchRule.freeze(
        noClasses().that().resideInAPackage("com.shop.billing..")
            .should().dependOnClassesThat().resideInAnyPackage(
                "com.shop.orders.domain..", "com.shop.orders.application..", "com.shop.orders.adapter..",
                "com.shop.catalog.domain..", "com.shop.catalog.application..", "com.shop.catalog.adapter.."));

    @ArchTest
    static final ArchRule noCyclesBetweenModules =
        slices().matching("com.shop.(*)..").should().beFreeOfCycles();

    @ArchTest
    static final ArchRule controllersLiveInWebAdapter =
        classes().that().haveSimpleNameEndingWith("Controller").should().resideInAPackage("..adapter.web..");
}` },
    complexity: `<p>The rules run in 1-3 seconds on a typical codebase (bytecode scan), cheap enough for every build.</p>`,
    followUps: ['How would Spring Modulith change this?', 'How do you prevent the frozen violation file from becoming a dumping ground?']
  }
});

/* ============================ QUIZ ============================ */
quiz.push({ q: 'According to the test pyramid, which kind of test should you have the MOST of?', options: ['End-to-end browser tests', 'Unit tests', 'Manual tests', 'Load tests'], answer: 1, explain: 'Unit tests are fastest, cheapest and most precise, so they form the wide base. E2E tests are slow and flaky, so they stay few.' });
quiz.push({ q: 'A test double that returns canned answers and is checked only through the RESULT of the code under test is a:', options: ['Mock', 'Stub', 'Spy', 'Dummy'], answer: 1, explain: 'Stubs supply canned data; the test asserts on the outcome. Mocks verify interactions; spies record calls.' });
quiz.push({ q: 'Why is a hand-written in-memory fake often preferred over a strict mock for repositories?', options: ['Fakes are always faster', 'Tests assert on state, so refactoring the implementation does not break them', 'Mockito cannot mock interfaces', 'Fakes need no code'], answer: 1, explain: 'A fake behaves like the real thing, so tests check outcomes rather than which methods were called.' });
quiz.push({ q: 'Why use Testcontainers with real Postgres instead of H2 for repository tests?', options: ['H2 is not free', 'H2 differs from Postgres (dialect, types, locking), so green tests may hide production bugs', 'Containers are always faster', 'H2 cannot run migrations'], answer: 1, explain: 'Testing against the same engine and version as production catches dialect and behaviour differences.' });
quiz.push({ q: 'What is the best way to keep a Testcontainers suite fast?', options: ['Start a new container per test method', 'Share one container per JVM and clean data between tests', 'Use Thread.sleep', 'Disable Ryuk'], answer: 1, explain: 'Container startup dominates; a shared container plus truncation or rollback keeps isolation and speed.' });
quiz.push({ q: 'In consumer-driven contract testing with Pact, who writes the first version of the contract?', options: ['The provider', 'The consumer, from its own tests', 'The QA team', 'The broker'], answer: 1, explain: 'The consumer records exactly what it needs in a consumer test; the provider then verifies it.' });
quiz.push({ q: 'What does `can-i-deploy` answer?', options: ['Whether code compiles', 'Whether this version is compatible with the verified contracts of the versions it will run with', 'Whether Docker is installed', 'Whether tests are flaky'], answer: 1, explain: 'The Pact Broker checks verification results for the relevant consumer/provider versions and environment.' });
quiz.push({ q: 'In hexagonal architecture, a REST controller is a:', options: ['Driven (secondary) adapter', 'Driving (primary) adapter', 'Domain service', 'Outbound port'], answer: 1, explain: 'It drives the application from outside by calling an inbound port (use case).' });
quiz.push({ q: 'Which dependency direction does the dependency rule demand?', options: ['Domain depends on the database adapter', 'Adapters depend on the application and domain; the core depends on nothing outside', 'Everything depends on everything', 'Controllers depend on repositories only'], answer: 1, explain: 'Source-code dependencies point inward; the JPA adapter implements an interface owned by the core.' });
quiz.push({ q: 'A bounded context is best described as:', options: ['A Docker container', 'A boundary inside which a model and its language have one precise meaning', 'A database schema', 'A Git repository'], answer: 1, explain: 'It is a boundary of meaning and ownership; it may map to a module or service but is not the same thing.' });
quiz.push({ q: 'You integrate with a messy legacy CRM and want your domain to stay clean. Which context-map pattern?', options: ['Conformist', 'Shared Kernel', 'Anti-Corruption Layer', 'Separate Ways'], answer: 2, explain: 'An ACL translates the foreign model at the border so legacy names and quirks never enter your domain.' });
quiz.push({ q: 'Which subdomain deserves the most custom modelling investment?', options: ['Generic (e.g. email sending)', 'Supporting (e.g. admin screens)', 'Core (your competitive edge)', 'None - always buy'], answer: 2, explain: 'Core subdomains differentiate the business; generic ones should be bought or reused behind a port.' });
quiz.push({ q: 'A provider renames a JSON field. Which test most cheaply catches the break BEFORE deployment?', options: ['Consumer unit test with a hand-written mock', 'Provider verification of the consumer\'s pact', 'Line coverage report', 'Manual smoke test next week'], answer: 1, explain: 'Provider verification replays the consumer contract against the real provider and fails when the field disappears.' });

/* ============================ INTERVIEW ============================ */
interview.push({ q: 'Explain the test pyramid and when you would deviate from it.', level: 'B',
  a: `<p>The pyramid says: many fast unit tests at the base, fewer integration tests in the middle, very few end-to-end tests at the top. The reason is economic: each step up is slower, flakier and harder to debug, so a bug should be caught by the cheapest test that can catch it. In practice I count by feedback time, not by dogma.</p><p>I deviate when the shape of the system demands it: a thin CRUD service with little logic benefits from a "trophy" with mostly integration tests against a real database; a microservice estate benefits from a honeycomb with contract tests at boundaries; a UI-heavy product needs more component tests. The anti-pattern to avoid is the ice-cream cone (lots of E2E, few unit tests).</p>`,
  followUps: ['How do you measure whether your suite has a healthy shape?', 'What stays E2E in your projects?'] });
interview.push({ q: 'What is the difference between a stub, a mock, a spy and a fake?', level: 'B',
  a: `<p>A <b>stub</b> returns canned answers so the code under test follows a certain path; you assert on the result. A <b>mock</b> has expectations built in (this method called once with these arguments) and fails if they are not met, so it checks interactions. A <b>spy</b> records calls (or wraps a real object) and you inspect them afterwards. A <b>fake</b> is a working but simplified implementation, such as an in-memory repository, so you assert on state. A <b>dummy</b> just fills a parameter. I prefer fakes and stubs for most tests and use mocks/spies only when the call itself is the behaviour, like sending exactly one email.</p>`,
  followUps: ['When does a mock make a test brittle?', 'How do you keep a fake faithful to the real implementation?'] });
interview.push({ q: 'How would you make code that uses the current time or random numbers testable?', level: 'B',
  a: `<p>Make the non-deterministic thing an explicit dependency instead of a hidden input. For time, inject a <code>java.time.Clock</code> (system clock in production, <code>Clock.fixed</code> in tests). For randomness or ids, inject a <code>Random</code> with a seed or an <code>IdGenerator</code> interface. For concurrency, inject an <code>Executor</code> that runs tasks on the calling thread in tests, and use Awaitility instead of sleeps when you must wait. The result is deterministic tests that behave identically at any time of day and on any machine.</p>`,
  followUps: ['What about static calls such as UUID.randomUUID()?', 'How do you test retry-with-backoff without waiting?'] });
interview.push({ q: 'Why use Testcontainers instead of an in-memory database like H2?', level: 'I',
  a: `<p>H2 is a different database from Postgres or MySQL. It has different SQL dialect details, data types (no <code>jsonb</code>), locking and isolation behaviour, function support and error messages. Tests can pass on H2 and fail in production. Testcontainers starts the real engine in Docker on a random port, runs the same Flyway migrations as production, and discards it afterwards, so you test the real SQL and constraints. Costs: Docker is required and startup takes seconds, which I mitigate with a shared singleton container, slice tests, tmpfs and cleaning data by truncation or rollback. I keep unit tests free of containers so they stay in milliseconds.</p>`,
  followUps: ['How would you run these tests in CI without Docker?', 'How do you test migrations against existing data?'] });
interview.push({ q: 'What is consumer-driven contract testing and when is it better than E2E?', level: 'I',
  a: `<p>The consumer states in its own tests exactly what it needs from a provider (fields, types, status codes). Pact turns that into a contract file shared via a broker. The provider's pipeline replays the requests against the real service in the right provider state and checks the responses. Neither side needs the other running, tests are fast and deterministic, and a failure names the consumer and field that would break. It beats E2E when many independently deployed services interact, because it replaces a slow shared environment with cheap pairwise checks, and <code>can-i-deploy</code> gates releases. It does not test business logic or semantics (cents vs dollars), so a few smoke E2E tests and monitoring remain.</p>`,
  followUps: ['How do you remove a field safely?', 'How do you contract-test events?'] });
interview.push({ q: 'Describe hexagonal architecture and what problem it solves.', level: 'I',
  a: `<p>The core holds domain and application logic. It exposes inbound ports (use cases) and defines outbound ports (interfaces for things it needs: repositories, payment gateways, event publishers). Adapters on the outside implement or call these ports: REST controllers, message listeners, JPA repositories, HTTP clients. All source-code dependencies point inward, achieved by dependency inversion: the core owns the interface, the adapter implements it. It solves tight coupling to frameworks and infrastructure: the core can be unit-tested with in-memory adapters, technologies can be swapped by writing one adapter, and business rules live in one place instead of controllers. The cost is more files and mapping, so I apply it where there is real logic or several integrations.</p>`,
  followUps: ['Where do transactions and validation go?', 'Is a JPA entity allowed in the domain?'] });
interview.push({ q: 'How does clean architecture differ from hexagonal, and are they compatible?', level: 'I',
  a: `<p>They share the same core principle: business rules at the centre, dependencies point inward, frameworks and databases are details. Hexagonal frames it as ports and adapters around one application core (inside versus outside, driving versus driven). Clean architecture (and onion) names the rings: entities, use cases, interface adapters, frameworks and drivers, and states the dependency rule explicitly. In practice they are compatible: use cases are the inbound ports, repositories and gateways are outbound ports, controllers and JPA classes are adapters. The labels differ more than the code. What matters is the enforceable rule, which I automate with ArchUnit.</p>`,
  followUps: ['How would you enforce the dependency rule?', 'When is this overkill?'] });
interview.push({ q: 'What is a bounded context and how do you find one?', level: 'I',
  a: `<p>A bounded context is a boundary within which a domain model and its ubiquitous language have one precise meaning, usually owned by one team. The same word, such as Customer or Trip, can mean different things in different contexts and each context keeps its own small model. I find boundaries by listening to the language (same word, different meaning), running event storming to group domain events, looking at team ownership and rates of change, and asking who is the source of truth for each piece of data. I then classify subdomains as core, supporting or generic. A context is a logical boundary; it may start as a module in a monolith and become a service later.</p>`,
  followUps: ['How big should a context be?', 'How do contexts share data?'] });
interview.push({ q: 'What is an anti-corruption layer and when do you use one?', level: 'I',
  a: `<p>An ACL is a translation boundary that stops a foreign model (legacy system, vendor API, another team's messy model) from leaking into your domain. It has a facade that talks to the foreign system, a translator that maps names, types and codes to your domain language (failing safe on unknown values), and a port defined by your domain. I use it when the upstream model is poor or unstable and I want to keep mine clean, in strangler-fig migrations, and around vendors. I skip it when the upstream model is good enough (Conformist) or both sides are friendly (Customer/Supplier). I test it with recorded payloads and protect it with timeouts, circuit breakers and caching.</p>`,
  followUps: ['How do you detect new legacy codes in production?', 'How do you retire the ACL after migration?'] });
interview.push({ q: 'Walk through the main context-map relationship patterns.', level: 'A',
  a: `<p>Partnership: two teams succeed or fail together and coordinate releases. Shared Kernel: a small shared model owned jointly; risky if it grows. Customer/Supplier: upstream commits to the downstream's needs and the customer influences the roadmap. Conformist: downstream adopts upstream's model unchanged, usually because it has no power or the model is fine. Anti-Corruption Layer: downstream translates the upstream model. Open Host Service with Published Language: upstream offers a stable, documented API/schema to many consumers. Separate Ways: no integration. Big Ball of Mud: a tangled region to fence off. Each arrow also has a direction (upstream influences downstream) and tells you where teams must coordinate and where they are free to move.</p>`,
  followUps: ['Which would you choose for a payment provider and why?', 'How do cycles on the map show up in practice?'] });
interview.push({ q: 'How would you design the test strategy for a microservice architecture with many independent teams?', level: 'A',
  a: `<p>I would avoid a shared end-to-end environment as a release gate. Each service owns fast unit tests with fakes at ports and Testcontainers integration tests for its infrastructure. Boundaries are covered by consumer-driven contracts (Pact for HTTP, message pacts or schema-registry compatibility for events) with <code>can-i-deploy</code> checked against what actually runs in production. A handful of synthetic E2E journeys run post-deploy and continuously in production with alerts, not as blocking gates. Production safety comes from progressive delivery (canary, flags, automatic rollback) and observability with SLOs. I manage flakiness actively with quarantine and ownership and track DORA metrics plus CI duration and escaped defects by layer to show the strategy works.</p>`,
  followUps: ['How do ephemeral environments fit?', 'How do you test event-driven flows?'] });
interview.push({ q: 'A team says "we mock everything and have 95% coverage, but production bugs keep happening". How do you diagnose and improve?', level: 'A',
  a: `<p>Coverage measures executed lines, not verified behaviour, and heavy mocking means tests repeat the implementation and the mocks encode assumptions. I would sample the escaped bugs and classify which layer could have caught each (SQL, serialization, wiring, cross-service contract, concurrency). Then: add integration tests with real dependencies via Testcontainers for persistence and messaging; replace repository mocks with fakes that share a contract test with the real adapter; add contract tests at service boundaries; run mutation testing (PIT) on core modules to find weak assertions; delete tests that only mirror code; and add a few end-to-end smoke tests plus production monitoring. Track escaped defects per layer to see improvement.</p>`,
  followUps: ['How does mutation testing work?', 'How do you review AI-generated tests?'] });
interview.push({ q: 'How do you enforce architectural decisions over time, especially with AI-generated code?', level: 'E',
  a: `<p>I turn decisions into executable checks and into written context. Executable: ArchUnit or Spring Modulith tests as fitness functions in the unit-test stage (domain free of frameworks, dependency direction, module api boundaries, no cycles), frozen baselines for legacy violations with a burn-down, dependency and licence scans, and contract tests at boundaries. Written: architecture decision records, a glossary per bounded context, and an instruction file (CLAUDE.md or AGENTS.md) that states the rules for coding assistants, plus examples of the preferred pattern. In review I look at structure and tests, not just whether the code runs. Humans own the boundaries; automation makes violations fail the build rather than rely on memory or goodwill.</p>`,
  followUps: ['What would you put in the instruction file for a coding agent?', 'How do you handle intentional exceptions to a rule?'] });

/* ============================ REGISTER ============================ */
registerModule({
  id: 'be11',
  title: 'Testing & Architecture',
  intro: `<p>This module is about building backends you can <b>change without fear</b>. First you learn how to test: the test pyramid, unit tests with test doubles (dummy, stub, spy, mock, fake), real-dependency integration tests with Testcontainers, and contract tests so independent services do not break each other. Then you learn how to <b>shape code so it is testable</b>: clean architecture and hexagonal ports and adapters keep business rules in the middle and frameworks on the outside. Finally, domain-driven design strategic patterns - bounded contexts, ubiquitous language, context maps and the anti-corruption layer - show how to draw boundaries in big systems and teams. It builds on layered Spring Boot services, data access and microservices; the same ideas are tested in nearly every senior backend interview.</p>`,
  goals: [
    'Choose the right test type (unit, integration, contract, E2E) for any scenario and explain the test pyramid, trophy and honeycomb shapes',
    'Write unit tests with hand-written fakes, stubs and spies, and know when a mock is justified',
    'Write a Testcontainers Postgres integration test and keep an integration suite fast and isolated',
    'Design a consumer-driven contract (Pact) for an API and roll out breaking changes with expand and contract',
    'Refactor a fat controller into hexagonal ports and adapters and enforce the dependency rule with ArchUnit',
    'Identify bounded contexts, draw a context map with the right relationship patterns, and design an anti-corruption layer for a legacy system'
  ],
  prereqs: `Backend modules 2 (Your First REST API) and 3 (Databases from Code), plus Microservices Patterns (module 10) is helpful. Comfortable reading Java and basic JUnit.`,
  hours: 14,
  topics: topics,
  practice: practice,
  quiz: quiz,
  interview: interview
});
})();
