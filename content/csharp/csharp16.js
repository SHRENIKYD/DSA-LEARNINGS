(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------------- shared helpers for prose + visualizers ---------------- */
  function C(s) { return '<code>' + H.esc(s) + '</code>'; }
  function P(s) { return '<pre><code>' + H.esc(String(s).replace(/^\n+/, '').replace(/\s+$/, '')) + '</code></pre>'; }
  function note(label, html) { return { type: 'text', label: label, html: html }; }
  /* Build frames that step through a code listing: steps = [{ l: line|[lines], narr, v: vars, extra: [parts] }] */
  function codeFrames(code, steps, label) {
    return steps.map(function (s) {
      var hl = {};
      [].concat(s.l === undefined ? [] : s.l).forEach(function (n) { hl[n] = s.cls || 'cur'; });
      var parts = [{ type: 'code', label: label || 'Source (highlighted line = what runs now)', lang: 'csharp', code: code, hl: hl }];
      if (s.v) parts.push({ type: 'vars', label: s.vl || 'State', vals: s.v, hl: s.hv || {} });
      (s.extra || []).forEach(function (p) { parts.push(p); });
      return { narr: s.narr, parts: parts };
    });
  }
  /* Non-compilable framework code (xUnit, NUnit, Moq, EF Core, MSBuild XML) is shown with check: false. */
  function fw(code, title, lang) { var o = { lang: lang || 'csharp', check: false, code: code }; if (title) o.title = title; return o; }

  /* ======================================================================
     TOPIC 1 — xUnit and NUnit
     ====================================================================== */
  var T1_CODE = [
    'public class CalculatorTests : IClassFixture<DbFixture>, IDisposable',
    '{',
    '    public CalculatorTests(DbFixture db) { /* runs before EVERY test */ }',
    '',
    '    [Fact]',
    '    public void Add_TwoNumbers_ReturnsSum() => Assert.Equal(5, Calc.Add(2, 3));',
    '',
    '    [Theory]',
    '    [InlineData(1, 1, 2)]',
    '    [InlineData(-1, 1, 0)]',
    '    public void Add_Cases(int a, int b, int sum) => Assert.Equal(sum, Calc.Add(a, b));',
    '',
    '    public void Dispose() { /* runs after EVERY test */ }',
    '}'
  ].join('\n');
  topics.push({
    title: 'xUnit and NUnit: Facts, Theories, Fixtures and the Test Lifecycle',
    analogy: `<p>A driving examiner runs the same checklist for every candidate: start the car, check mirrors, park. Each candidate gets a <b>fresh car</b> (no leftovers from the previous person), the examiner writes <b>pass/fail per item</b>, and the test centre itself (the building, the track) is opened once in the morning and shared. In xUnit, each test gets a fresh instance of the test class (the fresh car), each assertion is a checklist item, and a class fixture is the shared test centre.</p>`,
    explain: `<p>A <b>unit test</b> is a small method that calls your code and <b>asserts</b> on the result. A test framework finds those methods (by attributes), runs them, catches assertion failures and reports pass/fail. In .NET the big three are <b>xUnit</b> (the default in <code>dotnet new xunit</code>, used by the .NET team itself), <b>NUnit</b> and <b>MSTest</b>. All of them run through the same host: <code>dotnet test</code> (VSTest, or the newer Microsoft.Testing.Platform).</p>
<h4>1. Arrange – Act – Assert</h4>
${P(`
[Fact]
public void Withdraw_MoreThanBalance_Throws()
{
    var account = new Account(balance: 100);                          // Arrange
    var ex = Assert.Throws<InvalidOperationException>(                  // Act + Assert
        () => account.Withdraw(150));
    Assert.Equal("insufficient funds", ex.Message);
}`)}
<p>Name tests <code>Method_Scenario_Expected</code> so a failing name already tells the story.</p>
<h4>2. xUnit vs NUnit vocabulary</h4>
${H.table(['Idea', 'xUnit', 'NUnit'], [
  ['a single test', C('[Fact]'), C('[Test]')],
  ['parameterised test', C('[Theory]') + ' + ' + C('[InlineData]') + ' / ' + C('[MemberData]') + ' / ' + C('[ClassData]'), C('[TestCase]') + ' / ' + C('[TestCaseSource]')],
  ['per-test setup', 'constructor', C('[SetUp]')],
  ['per-test teardown', C('IDisposable.Dispose') + ' / ' + C('IAsyncLifetime'), C('[TearDown]')],
  ['shared per class', C('IClassFixture<T>'), C('[OneTimeSetUp]') + ' / ' + C('[OneTimeTearDown]')],
  ['shared across classes', C('[Collection]') + ' + ' + C('ICollectionFixture<T>'), C('[SetUpFixture]') + ' (per namespace)'],
  ['skip', C('[Fact(Skip = "why")]'), C('[Ignore("why")]')],
  ['categories', C('[Trait("Category", "Unit")]'), C('[Category("Unit")]')],
  ['assertions', C('Assert.Equal(expected, actual)'), C('Assert.That(actual, Is.EqualTo(expected))') + ' (constraint model)']
])}
<h4>3. Lifecycle — the key interview difference</h4>
<ul>
<li><b>xUnit creates a new instance of the test class for every test</b>, so instance fields never leak between tests. Setup lives in the constructor, teardown in <code>Dispose</code>.</li>
<li><b>NUnit creates one instance per fixture class</b> by default and reuses it for all tests (unless <code>[FixtureLifeCycle(LifeCycle.InstancePerTestCase)]</code>), so fields set by one test can leak into the next — reset them in <code>[SetUp]</code>.</li>
<li>xUnit runs <b>test classes (collections) in parallel</b> by default and tests inside one class sequentially. NUnit runs sequentially unless you add <code>[Parallelizable]</code>.</li>
</ul>
<h4>4. Running</h4>
${P(`
dotnet test                                   # build + run every test project
dotnet test --filter "Category=Unit"          # trait / category filter
dotnet test --filter "FullyQualifiedName~Calc" # name contains
dotnet test --logger trx --results-directory ./TestResults`)}`,
    clues: ['"How do you structure a unit test?" — Arrange/Act/Assert, one behaviour per test', '"What is the difference between [Fact] and [Theory]?" — data-driven tests', '"Why did a field leak between my NUnit tests?" — one fixture instance per class', '"Set up a database once for all tests in a class" — IClassFixture / OneTimeSetUp', '"tests pass alone but fail together" — shared state, ordering, parallelism', '"run only the fast tests in CI" — traits/categories + dotnet test --filter'],
    code: [fw(`
// xUnit (package xunit + xunit.runner.visualstudio + Microsoft.NET.Test.Sdk)
public class PriceCalculatorTests
{
    private readonly PriceCalculator _sut = new();          // fresh per test (new instance per test)

    [Fact]
    public void Total_EmptyCart_IsZero() => Assert.Equal(0m, _sut.Total([]));

    [Theory]
    [InlineData(100, 0, 100)]
    [InlineData(100, 10, 90)]
    [InlineData(100, 100, 0)]
    public void Total_AppliesDiscount(decimal price, int pct, decimal expected)
        => Assert.Equal(expected, _sut.Total([price], discountPercent: pct));

    public static TheoryData<string, bool> Emails => new()
    {
        { "a@b.com", true },
        { "no-at-sign", false }
    };

    [Theory, MemberData(nameof(Emails))]
    public void IsValidEmail(string input, bool expected) => Assert.Equal(expected, Validator.IsEmail(input));
}

// NUnit equivalent
[TestFixture]
public class PriceCalculatorNUnitTests
{
    private PriceCalculator _sut = null!;
    [SetUp] public void SetUp() => _sut = new PriceCalculator();   // reset: ONE instance is shared

    [TestCase(100, 10, 90)]
    [TestCase(100, 100, 0)]
    public void Total_AppliesDiscount(decimal price, int pct, decimal expected)
        => Assert.That(_sut.Total([price], pct), Is.EqualTo(expected));
}`, 'xUnit and NUnit side by side (needs the test packages — not compiled here)'), { lang: 'csharp', run: true, title: 'What a framework does under the hood: discover, run, catch, report (runnable)', code: `
using System.Reflection;

// A test "framework" in 30 lines: find [MiniFact] methods, new instance per test, catch failures.
int passed = 0, failed = 0;
foreach (MethodInfo m in typeof(MathTests).GetMethods().Where(m => m.GetCustomAttribute<MiniFact>() is not null).OrderBy(m => m.Name))
{
    var instance = Activator.CreateInstance(typeof(MathTests))!;   // xUnit-style: fresh instance per test
    try { m.Invoke(instance, null); passed++; Console.WriteLine($"PASS {m.Name}"); }
    catch (TargetInvocationException e) { failed++; Console.WriteLine($"FAIL {m.Name}: {e.InnerException!.Message}"); }
}
Console.WriteLine($"passed={passed} failed={failed}");

[AttributeUsage(AttributeTargets.Method)] sealed class MiniFact : Attribute { }

static class Check
{
    public static void Equal<T>(T expected, T actual)
    {
        if (!EqualityComparer<T>.Default.Equals(expected, actual))
            throw new Exception($"expected {expected} but was {actual}");
    }
}

class MathTests
{
    private int _counter;                               // would leak between tests if the instance were shared
    [MiniFact] public void A_Add() { _counter++; Check.Equal(4, 2 + 2); Check.Equal(1, _counter); }
    [MiniFact] public void B_Counter_IsFresh() { _counter++; Check.Equal(1, _counter); }
    [MiniFact] public void C_Broken() => Check.Equal(10, 3 * 3);
}` }],
    codeTitle: ['xUnit and NUnit', 'A mini framework'],
    viz: {
      title: 'xUnit lifecycle: one fixture, a fresh class instance per test',
      gen: function () {
        return codeFrames(T1_CODE, [
          { l: 1, narr: 'The runner discovers the class. Because it implements ' + C('IClassFixture<DbFixture>') + ', xUnit creates <b>one</b> ' + C('DbFixture') + ' before the first test of the class.', v: { fixtures: 1, instances: 0, tests_run: 0 } },
          { l: 3, narr: 'Test 1: xUnit constructs a <b>new</b> ' + C('CalculatorTests') + ' and injects the shared fixture. The constructor is your per-test setup.', v: { fixtures: 1, instances: 1, tests_run: 0 }, hv: { instances: 'cur' } },
          { l: [5, 6], narr: C('[Fact]') + ' runs once. ' + C('Assert.Equal(5, ...)') + ' passes; a failure would throw an exception that the runner catches and reports.', v: { fixtures: 1, instances: 1, tests_run: 1 }, hv: { tests_run: 'ok' } },
          { l: 13, narr: 'After the test, ' + C('Dispose') + ' runs (per-test teardown) and the instance is thrown away.', v: { fixtures: 1, instances: 0, tests_run: 1 } },
          { l: [8, 9], narr: 'The ' + C('[Theory]') + ' expands into one test case per ' + C('[InlineData]') + '. Case (1, 1, 2): <b>another</b> new instance, then run.', v: { fixtures: 1, instances: 1, tests_run: 2 }, hv: { tests_run: 'ok' } },
          { l: [10, 11], narr: 'Case (-1, 1, 0): yet another instance. Three tests → three instances, one fixture. Instance fields can never leak between tests.', v: { fixtures: 1, instances: 1, tests_run: 3 }, hv: { tests_run: 'ok' } },
          { l: 1, narr: 'All tests of the class are done → the fixture is disposed. In NUnit, by contrast, <b>one</b> instance serves every test of the fixture unless you opt into InstancePerTestCase.', v: { fixtures: 0, instances: 0, tests_run: 3 }, extra: [{ type: 'table', label: 'Totals', columns: ['object', 'xUnit', 'NUnit (default)'], rows: [['fixture', '1', '1 (OneTimeSetUp)'], ['test class instances', '3', '1']] }] }
        ]);
      }
    },
    examples: [
      { title: 'Assert on exceptions and async code', html: `<p>${C('Assert.Throws<T>')} requires the <b>exact</b> type; ${C('Assert.ThrowsAny<T>')} accepts derived types. For async code, the test returns ${C('Task')} and uses ${C('await Assert.ThrowsAsync<T>(...)')} — never ${C('async void')} tests, the runner cannot observe them.</p>`, code: fw(`
[Fact]
public async Task Load_MissingId_ThrowsNotFound()
{
    var repo = new InMemoryRepo();
    await Assert.ThrowsAsync<KeyNotFoundException>(() => repo.LoadAsync(42));
}`) },
      { title: 'Shared expensive setup with a collection fixture', html: `<p>Several classes need the same database container. A <b>collection fixture</b> is created once per collection; classes in the same collection do <b>not</b> run in parallel with each other.</p>`, code: fw(`
[CollectionDefinition("db")]
public class DbCollection : ICollectionFixture<PostgresFixture> { }

[Collection("db")] public class OrderTests(PostgresFixture db)
{
    [Fact] public async Task CanConnect() => Assert.True(await db.PingAsync());
}
[Collection("db")] public class CustomerTests(PostgresFixture db)
{
    [Fact] public void UsesSameContainer() => Assert.NotNull(db.ConnectionString);
}`) },
      { title: 'Writing your own assert helper (plain C#)', html: `<p>Assertions are just methods that throw. Knowing that makes custom asserts and failure messages easy.</p>`, code: { lang: 'csharp', run: true, code: `
static void AssertSequenceEqual(int[] expected, int[] actual)
{
    for (int i = 0; i < Math.Min(expected.Length, actual.Length); i++)
        if (expected[i] != actual[i]) throw new Exception($"index {i}: expected {expected[i]} but was {actual[i]}");
    if (expected.Length != actual.Length) throw new Exception($"length: expected {expected.Length} but was {actual.Length}");
}
try { AssertSequenceEqual([1, 2, 3], [1, 2, 4]); } catch (Exception e) { Console.WriteLine(e.Message); }
AssertSequenceEqual([5], [5]);
Console.WriteLine("second assert passed");` } }
    ],
    deepDive: `<p><b>How discovery works.</b> ${C('Microsoft.NET.Test.Sdk')} turns the test project into an executable host; the adapter package (${C('xunit.runner.visualstudio')}, ${C('NUnit3TestAdapter')}) uses reflection over the built assembly to find attributed methods and expands theories into individual cases. ${C('dotnet test')} builds, launches the testhost process and streams results back. Newer stacks (xUnit v3, MSTest, NUnit with Microsoft.Testing.Platform) make the test project a plain console executable you can run directly.</p>
<p><b>Parallelism.</b> xUnit v2 puts each class into its own <i>test collection</i>; collections run in parallel (bounded by ${C('maxParallelThreads')}, default = processor count), tests inside a collection run sequentially. Static state, environment variables, the current directory and ${C('DateTime.Now')} are the usual parallel-test bugs. Turn parallelism off for a collection with ${C('[CollectionDefinition(DisableParallelization = true)]')} rather than globally.</p>
<p><b>Async lifecycle.</b> Constructors cannot await, so xUnit offers ${C('IAsyncLifetime')} (${C('InitializeAsync')}/${C('DisposeAsync')}) for both test classes and fixtures — this is how you start a container or migrate a database before tests.</p>
<p><b>Good tests</b> are fast, isolated, repeatable, self-validating and timely (F.I.R.S.T.). Test behaviour through public APIs, not private methods; one logical assertion per test; avoid logic (loops, ifs) in tests — use theories instead.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants generate test skeletons, theory data and edge cases in seconds, and can translate NUnit to xUnit mechanically. <b>Use AI as a partner:</b> <code>List the boundary cases this method's tests miss</code> is a great prompt. <b>Where AI goes wrong:</b> it writes tests that assert what the code currently does (locking in bugs), duplicates the implementation's logic inside the test, mixes xUnit and NUnit attributes, writes ${C('async void')} tests, and invents assertion methods that do not exist. <b>What you must still own:</b> deciding which behaviour matters, reading each assertion, and checking a new test fails when the code is broken (mutate the code once and watch it go red).</p>`,
    problems: [{
      title: 'Build a Mini Test Runner',
      level: 'Medium', tags: ['testing', 'exceptions', 'delegates'], companies: ['Microsoft', 'JetBrains', 'Thoughtworks'],
      statement: `<p>Each spec is ${C('"Name expected actual"')}. Turn every spec into a test: a delegate that parses both numbers with ${C('int.Parse')} and calls an assert that throws ${C('AssertFailedException')} when they differ. Run the tests in order and report one line per test, then a summary:</p>
<ul><li>${C('"PASS Name"')} when the delegate returns normally;</li>
<li>${C('"FAIL Name: expected E but was A"')} when the assertion fails;</li>
<li>${C('"FAIL Name: threw T"')} when anything else is thrown (T = exception type name, e.g. ${C('FormatException')});</li>
<li>${C('"SKIP Name"')} for names starting with ${C('Skip_')} (not executed);</li>
<li>finally ${C('"total=N passed=P failed=F skipped=S"')}.</li></ul>`,
      constraints: `0 ≤ specs ≤ 1000; names contain no spaces.`,
      example: `<p>${C('["A 1 1", "Skip_B 1 2", "C 0 7"]')} → ${H.c('g', '["PASS A", "SKIP Skip_B", "FAIL C: expected 0 but was 7", "total=3 passed=1 failed=1 skipped=1"]')} — a skipped test still counts in the total, as in every .NET runner.</p>`,
      brute: { why: `<p>Comparing the strings directly inside the loop works for this input but is not a test runner: there is no separation between the <b>test body</b> and the <b>runner</b>, and an unexpected exception in one test would crash the whole run. Real frameworks isolate each test in its own try/catch and classify the failure.</p>`, code: `
static class NaiveRunner
{
    public static List<string> Run(string[] specs)
    {
        var lines = new List<string>();
        foreach (var s in specs)
        {
            var p = s.Split(' ');
            lines.Add(int.Parse(p[1]) == int.Parse(p[2]) ? "PASS " + p[0] : "FAIL " + p[0]);   // crashes on bad input
        }
        return lines;
    }
}` },
      mcq: { q: 'Why does a runner distinguish assertion failures from other exceptions?', options: ['An assertion failure means the behaviour is wrong; any other exception usually means the test or setup itself broke', 'Other exceptions cannot be caught', 'Assertion failures are not exceptions', 'Only assertion failures fail the build'], answer: 0, explain: 'Both fail the test, but the message differs: "expected X but was Y" vs "threw NullReferenceException" points the developer to very different causes.' },
      hints: [`<p>Hint 1: represent a test as ${C('(string Name, Action Body)')}; the body captures the two strings and parses them <b>inside</b> the delegate, so a parse failure happens while the test runs.</p>`, `<p>Hint 2: define ${C('class AssertFailedException : Exception')}; catch it first, then catch ${C('Exception')} and report ${C('e.GetType().Name')}.</p>`, `<p>Hint 3: count skipped tests before executing anything; total = passed + failed + skipped. An empty input still prints the summary line.</p>`],
      tests: { sig: 'string[] -> string[]', fn: 'run', cases: [
        [[['A 1 1']], ['PASS A', 'total=1 passed=1 failed=0 skipped=0']],
        [[[]], ['total=0 passed=0 failed=0 skipped=0']],
        [[['A 1 2']], ['FAIL A: expected 1 but was 2', 'total=1 passed=0 failed=1 skipped=0']],
        [[['Skip_B 1 2', 'C 5 5']], ['SKIP Skip_B', 'PASS C', 'total=2 passed=1 failed=0 skipped=1']],
        [[['X -3 -3', 'Y 0 7', 'Z 7 0']], ['PASS X', 'FAIL Y: expected 0 but was 7', 'FAIL Z: expected 7 but was 0', 'total=3 passed=1 failed=2 skipped=0']],
        [[['Skip_Only 0 0']], ['SKIP Skip_Only', 'total=1 passed=0 failed=0 skipped=1']],
        [[['D 1 x', 'E 2 2']], ['FAIL D: threw FormatException', 'PASS E', 'total=2 passed=1 failed=1 skipped=0']]
      ] },
      solution: {
        approach: `<p>Separate <b>definition</b> from <b>execution</b>: build a list of named delegates, then run each inside its own try/catch. Catch the specific assertion exception before the general one so the report can say <i>why</i> a test failed.</p>`,
        code: `
public class AssertFailedException(string message) : Exception(message);

public static class Assert
{
    public static void Equal(int expected, int actual)
    {
        if (expected != actual) throw new AssertFailedException($"expected {expected} but was {actual}");
    }
}

public class Solution
{
    public static string[] Run(string[] specs)
    {
        var tests = new List<(string Name, Action Body)>();
        foreach (string spec in specs)
        {
            string[] p = spec.Split(' ');
            string e = p[1], a = p[2];
            tests.Add((p[0], () => Assert.Equal(int.Parse(e), int.Parse(a))));   // parse inside the test body
        }

        var report = new List<string>();
        int passed = 0, failed = 0, skipped = 0;
        foreach (var (name, body) in tests)
        {
            if (name.StartsWith("Skip_", StringComparison.Ordinal)) { skipped++; report.Add("SKIP " + name); continue; }
            try { body(); passed++; report.Add("PASS " + name); }
            catch (AssertFailedException ex) { failed++; report.Add($"FAIL {name}: {ex.Message}"); }
            catch (Exception ex) { failed++; report.Add($"FAIL {name}: threw {ex.GetType().Name}"); }
        }
        report.Add($"total={tests.Count} passed={passed} failed={failed} skipped={skipped}");
        return report.ToArray();
    }
}`,
        dry: { head: ['spec', 'what happens', 'line', 'p / f / s'], rows: [['D 1 x', 'int.Parse("x") throws inside the body', 'FAIL D: threw FormatException', '0 / 1 / 0'], ['E 2 2', 'Assert.Equal returns normally', 'PASS E', '1 / 1 / 0'], ['(end)', 'summary', 'total=2 passed=1 failed=1 skipped=0', '—']] },
        complexity: `<p>O(n) tests, each O(1). Exceptions are slow (microseconds) but only thrown for failing tests.</p>`,
        followUps: ['Add per-test timing and report the slowest test.', 'How would you run the tests in parallel and still print results in a stable order?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 2 — Test doubles, Moq and NSubstitute
     ====================================================================== */
  topics.push({
    title: 'Test Doubles: Stubs, Fakes, Mocks and Spies with Moq and NSubstitute',
    analogy: `<p>A film shoot uses stand-ins. A <b>cardboard cut-out</b> (dummy) just fills a seat. A <b>stunt double</b> who follows a script ("fall when pushed") is a stub. A <b>rehearsal actor</b> who really performs a simpler version of the role is a fake. And a <b>director's assistant with a clipboard</b>, ticking off "the hero must open the door exactly once", is a mock. You pick the stand-in by what the scene needs — not every scene needs the clipboard.</p>`,
    explain: `<p>A <b>test double</b> replaces a real dependency (database, email, clock, HTTP API) so a unit test is fast and deterministic. The vocabulary (from Gerard Meszaros) matters in interviews:</p>
${H.table(['Double', 'What it does', 'Typical C#'], [
  ['Dummy', 'passed but never used', C('null!') + ' or ' + C('Mock.Of<ILogger>()')],
  ['Stub', 'returns canned answers to <b>queries</b>', C('repo.Setup(r => r.Find(1)).Returns(order)')],
  ['Fake', 'a working lightweight implementation', 'an in-memory repository, ' + C('FakeTimeProvider')],
  ['Spy', 'records calls so the test can inspect them later', 'a hand-written class with a ' + C('List<string> Sent')],
  ['Mock', 'pre-programmed with expectations and <b>verifies</b> them', C('mock.Verify(m => m.Send(It.IsAny<Email>()), Times.Once)')]
])}
<h4>Moq vs NSubstitute</h4>
${P(`
// Moq: a Mock<T> wrapper; .Object is the double
var repo = new Mock<IOrderRepository>();
repo.Setup(r => r.Find(42)).Returns(new Order(42));
var sut = new OrderService(repo.Object);
sut.Cancel(42);
repo.Verify(r => r.Save(It.Is<Order>(o => o.Cancelled)), Times.Once());

// NSubstitute: the substitute IS the interface
var repo2 = Substitute.For<IOrderRepository>();
repo2.Find(42).Returns(new Order(42));
new OrderService(repo2).Cancel(42);
repo2.Received(1).Save(Arg.Is<Order>(o => o.Cancelled));`)}
<h4>Rules of thumb</h4>
<ul>
<li><b>Stub queries, mock commands.</b> Verify only calls that are the <i>observable outcome</i> (an email was sent, a message was published). Do not verify that a getter was called.</li>
<li><b>Don't mock what you don't own</b> (HttpClient, DbContext, SDK clients): wrap them behind your own interface or use a fake/integration test.</li>
<li><b>Prefer state over interaction</b>: asserting the final state with a fake survives refactoring; verifying exact call sequences breaks when the implementation changes.</li>
<li>Mocking libraries work through runtime proxies (Castle DynamicProxy), so they can only override <b>interfaces and virtual members</b> — not sealed classes, static methods or non-virtual members.</li>
<li>Time and randomness are dependencies too: inject ${C('TimeProvider')} (.NET 8) and use ${C('FakeTimeProvider')} from Microsoft.Extensions.TimeProvider.Testing.</li>
</ul>`,
    clues: ['"difference between a mock and a stub" — verification vs canned answers', '"how do you unit test code that sends emails / calls an API?" — inject an interface, use a double', '"Moq cannot mock this class" — sealed / non-virtual / static', '"tests break every time we refactor" — over-specified interaction tests', '"test code that depends on DateTime.Now" — TimeProvider + FakeTimeProvider', '"verify a method was called exactly once" — Times.Once / Received(1)'],
    code: [fw(`
public interface IEmailSender { Task SendAsync(string to, string subject); }
public interface IClock { DateTimeOffset UtcNow { get; } }

public class SignupService(IUserRepo users, IEmailSender email, TimeProvider time)
{
    public async Task<bool> SignUpAsync(string address)
    {
        if (await users.ExistsAsync(address)) return false;
        await users.AddAsync(new User(address, time.GetUtcNow()));
        await email.SendAsync(address, "Welcome!");
        return true;
    }
}

public class SignupServiceTests
{
    [Fact]
    public async Task NewUser_IsSavedAndWelcomed()
    {
        var users = new InMemoryUserRepo();                         // fake
        var email = new Mock<IEmailSender>();                        // mock
        var time = new FakeTimeProvider(new DateTimeOffset(2025, 1, 1, 0, 0, 0, TimeSpan.Zero));
        var sut = new SignupService(users, email.Object, time);

        Assert.True(await sut.SignUpAsync("a@b.com"));
        Assert.Equal(time.GetUtcNow(), users.Get("a@b.com")!.CreatedAt);   // state check on the fake
        email.Verify(e => e.SendAsync("a@b.com", "Welcome!"), Times.Once());  // interaction check
    }

    [Fact]
    public async Task ExistingUser_NoEmail()
    {
        var users = Substitute.For<IUserRepo>();
        users.ExistsAsync("a@b.com").Returns(true);                  // stub
        var email = Substitute.For<IEmailSender>();
        var sut = new SignupService(users, email, TimeProvider.System);

        Assert.False(await sut.SignUpAsync("a@b.com"));
        await email.DidNotReceive().SendAsync(Arg.Any<string>(), Arg.Any<string>());
    }
}`, 'Moq, NSubstitute and FakeTimeProvider in one test class (needs packages)'), { lang: 'csharp', run: true, title: 'Hand-written fake and spy — no library needed (runnable)', code: `
var repo = new InMemoryRepo();
var spy = new SpyEmail();
var svc = new Signup(repo, spy);
Console.WriteLine(svc.SignUp("a@b.com"));     // True
Console.WriteLine(svc.SignUp("a@b.com"));     // False: already exists
Console.WriteLine(string.Join(",", spy.Sent)); // a@b.com  (sent exactly once)

public interface IRepo { bool Exists(string email); void Add(string email); }
public interface IEmail { void Send(string to); }

public sealed class InMemoryRepo : IRepo          // fake: really works, just in memory
{
    private readonly HashSet<string> _users = new(StringComparer.OrdinalIgnoreCase);
    public bool Exists(string email) => _users.Contains(email);
    public void Add(string email) => _users.Add(email);
}

public sealed class SpyEmail : IEmail             // spy: records calls for later assertions
{
    public List<string> Sent { get; } = [];
    public void Send(string to) => Sent.Add(to);
}

public sealed class Signup(IRepo repo, IEmail email)
{
    public bool SignUp(string address)
    {
        if (repo.Exists(address)) return false;
        repo.Add(address);
        email.Send(address);
        return true;
    }
}` }],
    codeTitle: ['Libraries', 'By hand'],
    viz: {
      title: 'A mock records calls, then Verify compares them with expectations',
      gen: function () {
        var calls = [];
        var frames = [];
        var push = function (narr, hl) { frames.push({ narr: narr, parts: [{ type: 'queue', label: 'Recorded invocations on mock&lt;IEmailSender&gt;', items: calls.slice(), hl: hl || {}, frontLabel: 'first', backLabel: 'latest' }, { type: 'table', label: 'Expectations', columns: ['expectation', 'status'], rows: frames.length > 3 ? [['Send("a@b.com") Times.Once', calls.filter(function (c) { return c === 'Send(a@b.com)'; }).length === 1 ? 'satisfied' : 'violated'], ['Send(any) Times.AtMost(2)', calls.length <= 2 ? 'satisfied' : 'violated']] : [['Send("a@b.com") Times.Once', 'pending'], ['Send(any) Times.AtMost(2)', 'pending']] }] }); };
        push('A fresh ' + C('Mock<IEmailSender>') + ' has an empty invocation list. Unlike a stub, it will be <b>asked about its history</b> at the end.');
        calls.push('Send(a@b.com)'); push('The service under test sends the welcome email. Moq\'s proxy intercepts the call and records the method and arguments.', { 0: 'ok' });
        calls.push('Send(ops@b.com)'); push('A second call (a copy to the ops team). The proxy records it too — no expectation is checked yet.', { 1: 'ok' });
        push('Act is done. Now <b>Verify</b>: filter recorded calls by the expression ' + C('e => e.Send("a@b.com")') + ' → 1 match → Times.Once is satisfied.', { 0: 'cur' });
        calls.push('Send(a@b.com)'); push('Suppose a bug sends the welcome email twice: the same filter now finds 2 matches, so Verify throws ' + C('MockException') + ': "Expected invocation on the mock once, but was 2 times".', { 0: 'bad', 2: 'bad' });
        return frames;
      }
    },
    examples: [
      { title: 'Argument matchers', html: `<p>Moq: ${C('It.IsAny<T>()')}, ${C('It.Is<T>(predicate)')}, ${C('It.IsInRange')}. NSubstitute: ${C('Arg.Any<T>()')}, ${C('Arg.Is<T>(predicate)')}. Capture arguments with ${C('Callback<T>(x => captured = x)')} (Moq) or ${C('Arg.Do<T>(x => ...)')} (NSubstitute) when you need to assert on a complex object.</p>`, code: fw(`
Order? saved = null;
repo.Setup(r => r.Save(It.IsAny<Order>())).Callback<Order>(o => saved = o);
sut.Checkout(cart);
Assert.Equal(3, saved!.Lines.Count);`) },
      { title: 'Strict vs loose mocks', html: `<p>Moq's default ${C('MockBehavior.Loose')} returns defaults (${C('null')}, ${C('0')}, empty) for un-setup calls. ${C('MockBehavior.Strict')} throws for any call without a setup — safer for critical code but brittle. NSubstitute is always "loose" and returns auto-values (empty strings, substitutes for interfaces) — recursive mocks.</p>`, code: fw(`
var strict = new Mock<IPayment>(MockBehavior.Strict);
strict.Setup(p => p.Charge(100)).Returns(true);
strict.Object.Refund(5);   // throws MockException: no setup for Refund`) },
      { title: 'Why sealed classes cannot be mocked', html: `<p>A proxy is a generated <b>subclass</b> (or interface implementation) that overrides members to intercept them. A sealed class cannot be subclassed and non-virtual methods cannot be overridden, so the "mock" would call the real code. Extract an interface, or wrap the class.</p>`, code: { lang: 'csharp', run: true, code: `
var real = new Pricing();
Pricing proxy = new PricingProxy();               // what a mocking library generates at runtime
Console.WriteLine(proxy.Discount(100));           // 0 -> intercepted (virtual)
Console.WriteLine(proxy.Tax(100));                // 18 -> NOT intercepted (non-virtual)
Console.WriteLine(real.Discount(100));            // 10

public class Pricing
{
    public virtual int Discount(int amount) => amount / 10;
    public int Tax(int amount) => amount * 18 / 100;
}
public class PricingProxy : Pricing
{
    public override int Discount(int amount) => 0;   // canned answer
    public new int Tax(int amount) => -1;            // hides, does not override: base reference still calls real Tax
}` } }
    ],
    deepDive: `<p><b>How Moq works.</b> ${C('mock.Setup(x => x.Find(1))')} takes an <b>expression tree</b>, not a delegate; Moq inspects it to learn the method and argument matchers. ${C('mock.Object')} is a Castle DynamicProxy type generated at runtime with Reflection.Emit; each intercepted call is matched against setups (last matching setup wins) and appended to the invocation list that ${C('Verify')} queries. Because it relies on runtime code generation, classic mocking libraries do not work under Native AOT; source-generated alternatives exist.</p>
<p><b>London vs Chicago (classicist) schools.</b> Mockists isolate every class and verify interactions; classicists test a small cluster of real objects and use doubles only at awkward boundaries (I/O, time, randomness). Most experienced .NET teams lean classicist with fakes for repositories and mocks only for outbound side effects, because heavy mocking couples tests to implementation details.</p>
<p><b>Pitfalls:</b> mocking ${C('ILogger<T>')} extension methods (${C('LogInformation')} is an extension — verify the underlying ${C('Log')} call or use ${C('FakeLogger')}); mocking ${C('HttpClient')} (mock the ${C('HttpMessageHandler')} instead); async setups needing ${C('ReturnsAsync')}; ${C('Verify')} after Act forgetting ${C('VerifyNoOtherCalls')} when the absence of calls matters.</p>`,
    aiEra: `<p><b>What AI changes:</b> mock setup boilerplate is exactly what assistants write well, and they translate between Moq and NSubstitute reliably. <b>Use AI as a partner:</b> ask it to replace an over-mocked test with a fake-based state test and compare. <b>Where AI goes wrong:</b> it mocks everything including value objects, verifies every incidental call, mocks extension methods (which cannot be intercepted), sets up ${C('Returns')} on async methods instead of ${C('ReturnsAsync')}, and produces tests that pass even when the code under test is deleted. <b>What you must still own:</b> the boundary decision — which dependencies are real, which are faked, and which interactions are part of the contract.</p>`,
    problems: [{
      title: 'Hand-Written Mock with Times Verification',
      level: 'Medium', tags: ['mocks', 'verification', 'parsing'], companies: ['Microsoft', 'Stripe', 'Booking.com'],
      statement: `<p>A spy recorded the method names called on it, in order (${C('calls')}). Implement verification like Moq's ${C('Times')}: for each check ${C('"Method Kind [n]"')} output ${C('"ok"')} or ${C('"Expected Method K but was c"')}, where c is how many times Method was called and K is the check written back exactly as given (e.g. ${C('AtLeast 2')}). Kinds: ${C('Once')}, ${C('Never')}, ${C('AtLeastOnce')}, ${C('AtLeast n')}, ${C('AtMost n')}, ${C('Exactly n')}. Method names are case-sensitive.</p>`,
      constraints: `0 ≤ calls, checks ≤ 10<sup>4</sup>; 0 ≤ n ≤ 10<sup>4</sup>.`,
      example: `<p>calls ${C('["Send", "Log", "Send"]')}, checks ${C('["Send Once", "Log AtLeastOnce", "Save Never"]')} → ${H.c('g', '["Expected Send Once but was 2", "ok", "ok"]')}.</p>`,
      brute: { why: `<p>Counting by scanning the whole call list for every check costs O(calls × checks) — 10<sup>8</sup> at the limits. Count each method once into a dictionary, then every check is O(1).</p>`, code: `
static class ScanVerify
{
    public static int Count(string[] calls, string method) => calls.Count(c => c == method);   // O(calls) per check
}` },
      mcq: { q: 'Which Times expectation is the most robust for "an audit entry must be written"?', options: ['Times.AtLeastOnce (or Once if duplicates are a real bug)', 'Times.Exactly(7) copied from today\'s behaviour', 'No verification at all', 'Verify every call in the exact order'], answer: 0, explain: 'Verify the observable contract, not incidental details. Exact counts copied from current behaviour make tests brittle.' },
      hints: [`<p>Hint 1: one pass over ${C('calls')} builds ${C('Dictionary<string, int>')}; missing keys mean 0 (${C('GetValueOrDefault')}).</p>`, `<p>Hint 2: map each kind to a predicate on the count: Once → c == 1, Never → c == 0, AtLeastOnce → c ≥ 1, AtLeast n → c ≥ n, AtMost n → c ≤ n, Exactly n → c == n.</p>`, `<p>Hint 3: the failure message reuses the check text after the method name, so split only on the first space: ${C('check.Split(\' \', 2)')}.</p>`],
      tests: { sig: 'string[] string[] -> string[]', fn: 'verify', cases: [
        [[['Send', 'Log', 'Send'], ['Send Once', 'Log AtLeastOnce', 'Save Never']], ['Expected Send Once but was 2', 'ok', 'ok']],
        [[[], ['Send Never', 'Send Once']], ['ok', 'Expected Send Once but was 0']],
        [[['A', 'A', 'A'], ['A AtLeast 3', 'A AtLeast 4', 'A AtMost 3', 'A AtMost 2']], ['ok', 'Expected A AtLeast 4 but was 3', 'ok', 'Expected A AtMost 2 but was 3']],
        [[['Save'], ['Save Exactly 1', 'Save Exactly 0', 'save Never']], ['ok', 'Expected Save Exactly 0 but was 1', 'ok']],
        [[['X'], []], []],
        [[['B', 'C'], ['B AtLeastOnce', 'C Never', 'D AtMost 0']], ['ok', 'Expected C Never but was 1', 'ok']],
        [[['Q'], ['Q AtLeast 0', 'Z AtLeastOnce']], ['ok', 'Expected Z AtLeastOnce but was 0']]
      ] },
      solution: {
        approach: `<p>This is what ${C('Verify')} does internally: the mock has already recorded invocations; verification counts matching ones and applies the ${C('Times')} predicate. Count once, check many.</p>`,
        code: `
public class Solution
{
    public static string[] Verify(string[] calls, string[] checks)
    {
        var counts = new Dictionary<string, int>(StringComparer.Ordinal);
        foreach (string c in calls) counts[c] = counts.GetValueOrDefault(c) + 1;

        var result = new List<string>();
        foreach (string check in checks)
        {
            string[] parts = check.Split(' ', 2);          // "Send" + "AtLeast 2"
            string method = parts[0], times = parts[1];
            int count = counts.GetValueOrDefault(method);
            string[] t = times.Split(' ');
            int n = t.Length > 1 ? int.Parse(t[1]) : 0;
            bool ok = t[0] switch
            {
                "Once" => count == 1,
                "Never" => count == 0,
                "AtLeastOnce" => count >= 1,
                "AtLeast" => count >= n,
                "AtMost" => count <= n,
                "Exactly" => count == n,
                _ => throw new ArgumentException("unknown Times kind: " + t[0])
            };
            result.Add(ok ? "ok" : $"Expected {method} {times} but was {count}");
        }
        return result.ToArray();
    }
}`,
        dry: { head: ['check', 'count', 'predicate', 'output'], rows: [['Send Once', '2', '2 == 1 → false', 'Expected Send Once but was 2'], ['Log AtLeastOnce', '1', '1 ≥ 1 → true', 'ok'], ['Save Never', '0', '0 == 0 → true', 'ok']] },
        complexity: `<p>O(calls + checks) time, O(distinct methods) space.</p>`,
        followUps: ['Add argument matching: "Send(a@b.com) Once".', 'Implement VerifyNoOtherCalls: report any recorded method that no check mentioned.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 3 — Integration tests: WebApplicationFactory and Testcontainers
     ====================================================================== */
  topics.push({
    title: 'Integration Tests: WebApplicationFactory, Stub Handlers and Testcontainers',
    analogy: `<p>Unit tests check each car part on a bench. An integration test is a <b>test drive on a closed track</b>: the real engine, gearbox and brakes working together, but on a private road with cones instead of real traffic. ${'WebApplicationFactory'} is the closed track (your real app, hosted in memory), stub HTTP handlers are the cones standing in for other companies' services, and Testcontainers rents you a <b>real</b> database in a disposable box for the duration of the drive.</p>`,
    explain: `<p>Integration tests exercise several real components together: routing, model binding, filters, DI, serialization, EF Core and a real database. In ASP.NET Core the standard tool is <b>${C('WebApplicationFactory<TEntryPoint>')}</b> (package Microsoft.AspNetCore.Mvc.Testing): it boots your actual ${C('Program')} with an in-memory <b>TestServer</b> — no ports, no network — and hands you an ${C('HttpClient')} wired straight into the pipeline.</p>
${P(`
public class OrdersApiTests(WebApplicationFactory<Program> factory)
    : IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task Get_UnknownOrder_Returns404()
    {
        HttpClient client = factory.CreateClient();
        HttpResponseMessage res = await client.GetAsync("/orders/999");
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }
}`)}
<p>With top-level statements, make ${C('Program')} visible to the test project by adding ${C('public partial class Program { }')} at the end of Program.cs (or InternalsVisibleTo).</p>
<h4>Replacing services for a test</h4>
${P(`
var client = factory.WithWebHostBuilder(b => b.ConfigureTestServices(services =>
{
    services.RemoveAll<IPaymentGateway>();
    services.AddSingleton<IPaymentGateway, FakePaymentGateway>();
    services.AddHttpClient<IWeatherClient, WeatherClient>()
            .ConfigurePrimaryHttpMessageHandler(() => new StubHandler(HttpStatusCode.OK, "{\\"temp\\":21}"));
})).CreateClient();`)}
<h4>Real dependencies with Testcontainers</h4>
<p><b>Testcontainers for .NET</b> starts Docker containers from test code (${C('PostgreSqlBuilder')}, ${C('MsSqlBuilder')}, ${C('RedisBuilder')}…), waits until they are ready and exposes a connection string with a random host port. Start it once per fixture (${C('IAsyncLifetime')}), point the app at it, and dispose it at the end.</p>
${H.table(['Choice', 'Speed', 'Fidelity', 'Use for'], [
  ['Unit test with doubles', 'µs', 'low', 'logic, branches, edge cases'],
  ['WebApplicationFactory + fakes', 'ms', 'medium (real pipeline, fake I/O)', 'routing, auth, validation, serialization'],
  ['WebApplicationFactory + Testcontainers', '100s of ms (container start ~seconds once)', 'high (real DB engine)', 'queries, migrations, constraints, transactions'],
  ['End-to-end against a deployed env', 'seconds', 'highest', 'a few smoke tests only']
])}`,
    clues: ['"how do you test an ASP.NET Core endpoint end to end without deploying?" — WebApplicationFactory / TestServer', '"replace a service only in tests" — ConfigureTestServices', '"our tests use an in-memory DB but prod bugs come from SQL" — Testcontainers', '"how do you test code that calls a third-party HTTP API?" — stub HttpMessageHandler', '"test pyramid" / "testing trophy" — balance of unit, integration, e2e', '"tests are slow because each one starts a container" — share via fixtures'],
    code: [fw(`
public sealed class ApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _db = new PostgreSqlBuilder()
        .WithImage("postgres:16-alpine")
        .Build();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<DbContextOptions<ShopDb>>();
            services.AddDbContext<ShopDb>(o => o.UseNpgsql(_db.GetConnectionString()));
        });
    }

    public async Task InitializeAsync()
    {
        await _db.StartAsync();                                   // one container for the whole class/collection
        using var scope = Services.CreateScope();
        await scope.ServiceProvider.GetRequiredService<ShopDb>().Database.MigrateAsync();
    }

    public new async Task DisposeAsync() => await _db.DisposeAsync();
}

public class CheckoutTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task Checkout_CreatesOrder()
    {
        var client = factory.CreateClient();
        var res = await client.PostAsJsonAsync("/checkout", new { sku = "PEN", qty = 2 });
        res.EnsureSuccessStatusCode();
        var order = await res.Content.ReadFromJsonAsync<OrderDto>();
        Assert.Equal(2, order!.Qty);
    }
}`, 'WebApplicationFactory + Testcontainers (needs ASP.NET Core, Docker and packages)'), { lang: 'csharp', run: true, title: 'Stubbing outbound HTTP with a custom HttpMessageHandler (runnable, no network)', code: `
using System.Net;

var handler = new StubHandler(req => req.RequestUri!.AbsolutePath == "/rates/USD"
    ? new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("83.2") }
    : new HttpResponseMessage(HttpStatusCode.NotFound));
var client = new HttpClient(handler) { BaseAddress = new Uri("http://fx.test") };
var fx = new FxClient(client);

Console.WriteLine(await fx.RateAsync("USD"));   // 83.2
Console.WriteLine(await fx.RateAsync("XYZ"));   // -1 (handled 404)
Console.WriteLine(handler.Calls);               // 2 requests captured

public sealed class StubHandler(Func<HttpRequestMessage, HttpResponseMessage> respond) : HttpMessageHandler
{
    public int Calls { get; private set; }
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
    {
        Calls++;
        return Task.FromResult(respond(request));
    }
}

public sealed class FxClient(HttpClient http)
{
    public async Task<decimal> RateAsync(string currency)
    {
        var res = await http.GetAsync("/rates/" + currency);
        if (res.StatusCode == HttpStatusCode.NotFound) return -1;
        res.EnsureSuccessStatusCode();
        return decimal.Parse(await res.Content.ReadAsStringAsync(), System.Globalization.CultureInfo.InvariantCulture);
    }
}` }],
    codeTitle: ['Full-stack fixture', 'Stub handler'],
    viz: {
      title: 'A request through WebApplicationFactory: real pipeline, no network',
      gen: function () {
        var nodes = [
          { id: 'T', label: 'Test', x: 6, y: 30, shape: 'box' },
          { id: 'C', label: 'HttpClient', x: 24, y: 30, shape: 'box' },
          { id: 'S', label: 'TestServer', x: 42, y: 30, shape: 'box' },
          { id: 'P', label: 'Middleware + routing', x: 62, y: 30, shape: 'box', w: 20 },
          { id: 'E', label: 'Endpoint / DI', x: 82, y: 14, shape: 'box' },
          { id: 'D', label: 'Postgres (container)', x: 82, y: 48, shape: 'box', w: 20 }
        ];
        var edges = [['T', 'C'], ['C', 'S'], ['S', 'P'], ['P', 'E'], ['E', 'D']];
        var g = function (hl, ehl) { return { type: 'graph', directed: true, height: 60, nodes: nodes, edges: edges, hl: hl, ehl: ehl || {} }; };
        return [
          { narr: 'Fixture start: Testcontainers launches Postgres on a random port, then the factory builds the host from your real ' + C('Program') + ' with ' + C('ConfigureTestServices') + ' overrides.', parts: [g({ D: 'ok', S: 'ok' })] },
          { narr: 'The test calls ' + C('client.PostAsJsonAsync("/checkout", ...)') + '. The client\'s handler is the TestServer — no socket, no port, no TLS.', parts: [g({ T: 'cur', C: 'cur' }, { 'T-C': 'cur', 'C-S': 'cur' })] },
          { narr: 'The request goes through the <b>real</b> middleware: exception handling, auth, routing, model binding, validation. This is what unit tests cannot cover.', parts: [g({ P: 'cur' }, { 'S-P': 'cur' })] },
          { narr: 'The endpoint resolves services from the real DI container (with your test overrides) and EF Core talks to the <b>real</b> database engine — constraints, SQL translation and transactions behave as in production.', parts: [g({ E: 'cur', D: 'cur' }, { 'P-E': 'cur', 'E-D': 'cur' })] },
          { narr: 'The response flows back as a normal ' + C('HttpResponseMessage') + '; the test asserts status, headers and JSON body.', parts: [g({ T: 'ok' }), note('Assertions', C('201 Created') + ', ' + C('Location: /orders/17') + ', body ' + C('{"qty":2}'))] },
          { narr: 'Fixture dispose: the host shuts down and the container is removed. Each class (or collection) pays the container start-up cost once.', parts: [g({ D: 'done', S: 'done' })] }
        ];
      }
    },
    examples: [
      { title: 'Authenticated endpoints in tests', html: `<p>Register a test authentication handler that always succeeds with chosen claims, and make it the default scheme inside ${C('ConfigureTestServices')}. Tests then send a header such as ${C('Authorization: Test admin')} to pick a role.</p>`, code: fw(`
services.AddAuthentication("Test")
        .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>("Test", _ => { });
client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Test", "admin");`) },
      { title: 'Isolating data between tests', html: `<p>Shared containers mean shared data. Options: wrap each test in a transaction and roll back; give each test unique keys (GUIDs); or reset the database between tests with <b>Respawn</b>, which deletes rows in FK-safe order far faster than recreating the schema.</p>`, code: fw(`
private Respawner _respawner = null!;
public async Task InitializeAsync()
{
    await using var conn = new NpgsqlConnection(_db.GetConnectionString());
    await conn.OpenAsync();
    _respawner = await Respawner.CreateAsync(conn, new RespawnerOptions { DbAdapter = DbAdapter.Postgres });
}
public async Task ResetAsync(NpgsqlConnection conn) => await _respawner.ResetAsync(conn);`) },
      { title: 'Routing a stub handler by path (plain C#)', html: `<p>A tiny router turns a stub handler into a fake third-party API with several endpoints.</p>`, code: { lang: 'csharp', run: true, code: `
using System.Net;

var routes = new Dictionary<string, HttpStatusCode> { ["GET /health"] = HttpStatusCode.OK, ["POST /pay"] = HttpStatusCode.Accepted };
var client = new HttpClient(new Router(routes)) { BaseAddress = new Uri("http://api.test") };
Console.WriteLine((int)(await client.GetAsync("/health")).StatusCode);                     // 200
Console.WriteLine((int)(await client.PostAsync("/pay", new StringContent("{}"))).StatusCode); // 202
Console.WriteLine((int)(await client.GetAsync("/nope")).StatusCode);                       // 404

sealed class Router(Dictionary<string, HttpStatusCode> routes) : HttpMessageHandler
{
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage r, CancellationToken ct)
        => Task.FromResult(new HttpResponseMessage(routes.GetValueOrDefault(r.Method.Method + " " + r.RequestUri!.AbsolutePath, HttpStatusCode.NotFound)));
}` } }
    ],
    deepDive: `<p><b>TestServer internals.</b> The factory finds the entry point via ${C('Microsoft.Extensions.Hosting')} deferred host building: it runs ${C('Program.Main')} until ${C('builder.Build()')}, captures the host, applies your ${C('ConfigureWebHost')} changes and replaces Kestrel with ${C('TestServer')}. The ${C('HttpClient')} it creates uses an in-memory handler, so requests are function calls; cookies are handled if you use ${C('CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = true })')}. The content root is found from the test project's ${C('.deps.json')}, which is why the test project must reference the web project.</p>
<p><b>In-memory providers lie.</b> EF Core's InMemory provider is not a relational database: no transactions, no constraints, no SQL translation (LINQ that fails on SQL Server works in memory), case-sensitive string comparisons. SQLite in-memory is closer but still a different dialect. Microsoft's own guidance is to test against the production database engine — exactly what Testcontainers makes cheap.</p>
<p><b>Speed and CI.</b> Share one container per collection, reset data with Respawn, run test classes in parallel with separate databases, and pin image tags. CI runners need Docker (GitHub's Ubuntu runners have it). Testcontainers' Ryuk sidecar removes containers even if the test process crashes.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants scaffold a ${C('WebApplicationFactory')} fixture, a Testcontainers builder and JSON assertions quickly. <b>Use AI as a partner:</b> ask for the list of pipeline behaviours (auth failures, validation 400s, content negotiation) that only integration tests catch. <b>Where AI goes wrong:</b> it reaches for EF InMemory (hiding SQL bugs), starts a container per test, forgets ${C('public partial class Program')}, uses outdated ${C('TestServer')} + ${C('Startup')} patterns from ASP.NET Core 2, and hard-codes ports. <b>What you must still own:</b> the test boundary — what is real, what is faked — and the data-isolation strategy.</p>`,
    problems: [{
      title: 'Stub HTTP Handler: Route Requests to Status Codes',
      level: 'Medium', tags: ['HttpClient', 'stubs', 'routing'], companies: ['Microsoft', 'Shopify', 'Revolut'],
      statement: `<p>Write an ${C('HttpMessageHandler')} stub and use it through a real ${C('HttpClient')}. Routes are ${C('"METHOD /path status"')}. For every request ${C('"METHOD /path[?query]"')} send it through the client and return the status code: the first route whose method and path match wins; a known path with no matching method gives ${C('405')}; an unknown path gives ${C('404')}. Paths compare case-insensitively (as ASP.NET Core routing does) and the query string is ignored.</p>`,
      constraints: `0 ≤ routes, requests ≤ 1000; methods are upper-case; statuses 100–599.`,
      example: `<p>routes ${C('["GET /a 200", "POST /a 201"]')}, requests ${C('["GET /a", "DELETE /a", "GET /b"]')} → ${H.c('g', '[200, 405, 404]')}.</p>`,
      brute: { why: `<p>Calling a real test server for each case would work but needs network and is slow and flaky. Scanning all routes for each request is O(routes × requests); a dictionary keyed by path gives O(1) per request — and the real ${C('HttpClient')} still exercises your request-building code.</p>`, code: `
static class LinearRoutes
{
    public static int Find(string[] routes, string method, string path)
    {
        bool pathSeen = false;
        foreach (var r in routes)
        {
            var p = r.Split(' ');
            if (!string.Equals(p[1], path, StringComparison.OrdinalIgnoreCase)) continue;
            pathSeen = true;
            if (p[0] == method) return int.Parse(p[2]);
        }
        return pathSeen ? 405 : 404;
    }
}` },
      mcq: { q: 'Why stub HttpMessageHandler instead of mocking HttpClient?', options: ['HttpClient\'s methods are not virtual; the handler is the designed extension point, and the real client code still runs', 'HttpClient is sealed', 'Mocks cannot return Tasks', 'HttpMessageHandler is faster than HttpClient'], answer: 0, explain: 'GetAsync/PostAsync are non-virtual and all funnel into the handler\'s SendAsync — the seam built for tests and for DelegatingHandler pipelines.' },
      hints: [`<p>Hint 1: build ${C('Dictionary<string, Dictionary<string, int>>')} path → (method → status) with ${C('StringComparer.OrdinalIgnoreCase')} for paths; use ${C('TryAdd')} so the first route wins.</p>`, `<p>Hint 2: in ${C('SendAsync')} read ${C('request.Method.Method')} and ${C('request.RequestUri!.AbsolutePath')} — AbsolutePath already drops the query string.</p>`, `<p>Hint 3: give the client a ${C('BaseAddress')} like ${C('http://test')} and send ${C('new HttpRequestMessage(new HttpMethod(m), path)')}; block with ${C('GetAwaiter().GetResult()')} only because this is a console harness.</p>`],
      tests: { sig: 'string[] string[] -> int[]', fn: 'statuses', cases: [
        [[['GET /a 200', 'POST /a 201'], ['GET /a', 'POST /a', 'DELETE /a', 'GET /b']], [200, 201, 405, 404]],
        [[[], ['GET /']], [404]],
        [[['GET /x 500'], ['GET /x', 'GET /x']], [500, 500]],
        [[['GET /a 200'], []], []],
        [[['GET /Orders 200'], ['GET /orders', 'PUT /ORDERS']], [200, 405]],
        [[['GET /a 204'], ['GET /a?x=1&y=2']], [204]],
        [[['GET /a 200', 'GET /a 503'], ['GET /a']], [200]]
      ] },
      solution: {
        approach: `<p>The stub is a lookup table inside ${C('SendAsync')}. Everything above it — URI building, method, the client — is real code, which is the point of stubbing at the handler level.</p>`,
        code: `
using System.Net;

public sealed class RouteStub : HttpMessageHandler
{
    private readonly Dictionary<string, Dictionary<string, int>> _byPath = new(StringComparer.OrdinalIgnoreCase);

    public RouteStub(IEnumerable<string> routes)
    {
        foreach (string r in routes)
        {
            string[] p = r.Split(' ');
            if (!_byPath.TryGetValue(p[1], out var methods)) _byPath[p[1]] = methods = new Dictionary<string, int>();
            methods.TryAdd(p[0], int.Parse(p[2]));                 // first route wins
        }
    }

    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
    {
        string path = request.RequestUri!.AbsolutePath;           // query string excluded
        int status = !_byPath.TryGetValue(path, out var methods) ? 404
            : methods.TryGetValue(request.Method.Method, out int s) ? s : 405;
        return Task.FromResult(new HttpResponseMessage((HttpStatusCode)status));
    }
}

public class Solution
{
    public static int[] Statuses(string[] routes, string[] requests)
    {
        using var client = new HttpClient(new RouteStub(routes)) { BaseAddress = new Uri("http://test") };
        var result = new List<int>();
        foreach (string req in requests)
        {
            string[] p = req.Split(' ');
            using var msg = new HttpRequestMessage(new HttpMethod(p[0]), p[1]);
            using HttpResponseMessage res = client.SendAsync(msg).GetAwaiter().GetResult();
            result.Add((int)res.StatusCode);
        }
        return result.ToArray();
    }
}`,
        dry: { head: ['request', 'AbsolutePath', 'path known?', 'method known?', 'status'], rows: [['GET /a', '/a', 'yes', 'yes', '200'], ['DELETE /a', '/a', 'yes', 'no', '405'], ['GET /b', '/b', 'no', '—', '404'], ['GET /a?x=1&amp;y=2', '/a', 'yes', 'yes', '204 (route set 6)']] },
        complexity: `<p>O(routes + requests) average; each request goes through the client pipeline once.</p>`,
        followUps: ['Add a DelegatingHandler that retries 503s and test it with this stub.', 'Record every request so a test can assert on headers and bodies.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 4 — Testing EF Core
     ====================================================================== */
  topics.push({
    title: 'Testing EF Core: Providers, Change Tracking and Repositories',
    analogy: `<p>Practising a speech in front of a mirror is quick, but the mirror never coughs, never asks a hard question and never misunderstands your accent. The EF Core <b>InMemory</b> provider is the mirror: it accepts almost anything. <b>SQLite in-memory</b> is a friend listening — closer to the real audience but not the same crowd. A <b>real SQL Server/Postgres in a container</b> is a dress rehearsal in the actual hall. You rehearse logic in front of the mirror and the hard parts in the hall.</p>`,
    explain: `<p>Code that uses EF Core has two kinds of behaviour to test: <b>your logic</b> (which entities change, which rules apply) and <b>the database's behaviour</b> (SQL translation, constraints, transactions, concurrency). Pick the test double accordingly.</p>
${H.table(['Option', 'What is real', 'What lies', 'Verdict'], [
  ['Mock ' + C('DbContext') + ' / ' + C('DbSet'), 'nothing', 'LINQ provider, tracking, SaveChanges', 'avoid — mocking IQueryable is brittle'],
  [C('UseInMemoryDatabase'), 'change tracker, simple LINQ', 'no SQL, no constraints, no transactions, case-sensitive strings', 'discouraged by the EF team for anything but trivial logic'],
  ['SQLite ' + C('DataSource=:memory:'), 'relational: FKs, unique indexes, transactions, SQL', 'different dialect and types (no decimal ops, no schemas)', 'fast and decent'],
  ['Testcontainers (prod engine)', 'everything', 'nothing', 'best fidelity; seconds to start once'],
  ['Repository interface + fake', 'your service logic', 'the repository implementation itself', 'unit-test services; test repos against a real DB']
])}
<h4>The change tracker — what SaveChanges really does</h4>
${H.table(['Action', 'State before', 'State after', 'SQL at SaveChanges'], [
  [C('Add(e)'), 'Detached', 'Added', 'INSERT'],
  ['load via query', '—', 'Unchanged', 'none'],
  ['set a property', 'Unchanged', 'Modified', 'UPDATE (changed columns only)'],
  [C('Remove(e)'), 'Unchanged / Modified', 'Deleted', 'DELETE'],
  [C('Remove(e)'), '<b>Added</b>', '<b>Detached</b>', 'none — it never existed in the DB'],
  ['set a property', '<b>Added</b>', 'Added', 'still one INSERT']
])}
<p>After a successful ${C('SaveChanges')}, Added/Modified become Unchanged and Deleted become Detached; the method returns the number of state entries written.</p>`,
    clues: ['"should we use the InMemory provider for tests?" — know its limits', '"query works in tests but fails in production" — LINQ not translatable to SQL', '"how do you unit test a service that uses DbContext?" — repository/fake or real DB', '"SaveChanges returned 0" — entity not tracked or no changes', '"test optimistic concurrency" — needs a real provider + rowversion', '"tests interfere with each other\'s data" — per-test database or transaction rollback'],
    code: [fw(`
public class ShopDb(DbContextOptions<ShopDb> options) : DbContext(options)
{
    public DbSet<Product> Products => Set<Product>();
    protected override void OnModelCreating(ModelBuilder b)
        => b.Entity<Product>().HasIndex(p => p.Sku).IsUnique();
}

public class ProductRepoTests : IDisposable
{
    private readonly SqliteConnection _conn = new("DataSource=:memory:");
    private readonly ShopDb _db;

    public ProductRepoTests()
    {
        _conn.Open();                                         // the in-memory DB lives as long as the connection
        _db = new ShopDb(new DbContextOptionsBuilder<ShopDb>().UseSqlite(_conn).Options);
        _db.Database.EnsureCreated();
    }

    [Fact]
    public async Task DuplicateSku_IsRejected()
    {
        _db.Products.Add(new Product { Sku = "PEN" });
        _db.Products.Add(new Product { Sku = "PEN" });
        await Assert.ThrowsAsync<DbUpdateException>(() => _db.SaveChangesAsync());   // InMemory would NOT throw
    }

    [Fact]
    public void Tracker_ShowsPendingChanges()
    {
        var p = new Product { Sku = "INK" };
        _db.Add(p);
        Assert.Equal(EntityState.Added, _db.Entry(p).State);
        _db.Remove(p);
        Assert.Equal(EntityState.Detached, _db.Entry(p).State);    // removing an Added entity just forgets it
    }

    public void Dispose() { _db.Dispose(); _conn.Dispose(); }
}`, 'SQLite in-memory EF Core tests (needs EF Core packages)'), { lang: 'csharp', run: true, title: 'A miniature change tracker (runnable)', code: `
var t = new Tracker();
t.Load(1); t.Load(2);
t.Modify(1);              // Unchanged -> Modified
t.Add(3); t.Modify(3);    // stays Added
t.Delete(2);              // Unchanged -> Deleted
t.Add(4); t.Delete(4);    // Added -> Detached (no SQL)
Console.WriteLine(string.Join(", ", t.Pending()));
Console.WriteLine($"SaveChanges -> {t.Save()}");    // 3 (UPDATE 1, INSERT 3, DELETE 2)
Console.WriteLine($"SaveChanges -> {t.Save()}");    // 0

enum State { Added, Unchanged, Modified, Deleted }

sealed class Tracker
{
    private readonly SortedDictionary<int, State> _entries = new();
    public void Load(int id) => _entries.TryAdd(id, State.Unchanged);
    public void Add(int id) => _entries[id] = State.Added;
    public void Modify(int id) { if (_entries.TryGetValue(id, out var s) && s == State.Unchanged) _entries[id] = State.Modified; }
    public void Delete(int id)
    {
        if (!_entries.TryGetValue(id, out var s)) return;
        if (s == State.Added) _entries.Remove(id); else _entries[id] = State.Deleted;
    }
    public IEnumerable<string> Pending() => _entries.Where(e => e.Value != State.Unchanged).Select(e => $"{e.Key}:{e.Value}");
    public int Save()
    {
        int written = 0;
        foreach (var (id, s) in _entries.ToList())
        {
            if (s == State.Unchanged) continue;
            written++;
            if (s == State.Deleted) _entries.Remove(id); else _entries[id] = State.Unchanged;
        }
        return written;
    }
}` }],
    codeTitle: ['SQLite in-memory', 'Change tracker model'],
    viz: {
      title: 'Entity states through Add, Modify, Remove and SaveChanges',
      gen: function () {
        var rows = [];
        var frames = [];
        var snap = function (narr, hl, save) {
          var p = [{ type: 'table', label: 'ChangeTracker.Entries()', columns: ['entity', 'state'], rows: rows.map(function (r) { return r.slice(); }), hl: hl || {} }];
          if (save !== undefined) p.push({ type: 'vars', label: 'SaveChanges()', vals: { returned: save }, hl: { returned: 'ok' } });
          frames.push({ narr: narr, parts: p });
        };
        rows = [['Product 1', 'Unchanged'], ['Product 2', 'Unchanged']]; snap('Two products loaded by a query are tracked as <b>Unchanged</b>; EF keeps a snapshot of their original values.');
        rows[0][1] = 'Modified'; snap('Setting ' + C('p1.Price = 9') + ': at DetectChanges the snapshot differs → <b>Modified</b>. Only the Price column will be in the UPDATE.', { 0: 'cur' });
        rows.push(['Product 3', 'Added']); snap(C('db.Add(p3)') + ' → <b>Added</b>. Changing p3\'s properties now keeps it Added (still one INSERT).', { 2: 'ok' });
        rows[1][1] = 'Deleted'; snap(C('db.Remove(p2)') + ' → <b>Deleted</b>.', { 1: 'bad' });
        rows.push(['Product 4', 'Added']); snap(C('db.Add(p4)') + ' …', { 3: 'ok' });
        rows.pop(); snap('… then ' + C('db.Remove(p4)') + ': an Added entity that is removed becomes <b>Detached</b> — no row exists, so no SQL is needed.', {});
        rows = [['Product 1', 'Unchanged'], ['Product 3', 'Unchanged']]; snap('SaveChanges sends UPDATE p1, INSERT p3, DELETE p2 in one transaction and returns <b>3</b>. Survivors become Unchanged; p2 is Detached.', {}, 3);
        return frames;
      }
    },
    examples: [
      { title: 'A query that passes with InMemory and fails on SQL Server', html: `<p>InMemory evaluates LINQ with LINQ-to-Objects, so any C# method works. A real provider must translate to SQL and throws ${C('InvalidOperationException: could not be translated')} for a custom method in ${C('Where')}.</p>`, code: fw(`
static bool IsVip(Customer c) => c.Orders.Count > 10;
var vips = db.Customers.Where(c => IsVip(c)).ToList();     // InMemory: works; SQL providers: throws`) },
      { title: 'Testing the service, not EF: a fake repository', html: `<p>The service depends on ${C('IOrderRepository')}; tests use an in-memory fake, and the real EF repository gets its own integration tests against a real database.</p>`, code: { lang: 'csharp', run: true, code: `
var repo = new FakeOrderRepo();
var svc = new OrderService(repo);
svc.Place(1, 250m);
svc.Place(2, 50m);
Console.WriteLine(svc.TotalAbove(100m));   // 250

public record Order(int Id, decimal Total);
public interface IOrderRepository { void Add(Order o); IEnumerable<Order> All(); }
public sealed class FakeOrderRepo : IOrderRepository
{
    private readonly List<Order> _orders = [];
    public void Add(Order o) => _orders.Add(o);
    public IEnumerable<Order> All() => _orders;
}
public sealed class OrderService(IOrderRepository repo)
{
    public void Place(int id, decimal total) => repo.Add(new Order(id, total));
    public decimal TotalAbove(decimal min) => repo.All().Where(o => o.Total > min).Sum(o => o.Total);
}` } },
      { title: 'One database per test class, transaction per test', html: `<p>With a shared real database, open a transaction in the test constructor and roll it back in Dispose. Every test sees a clean database and nothing is committed. (Code under test that opens its own transactions needs savepoints or Respawn instead.)</p>`, code: fw(`
public OrderTests(DbFixture f)
{
    _db = f.CreateContext();
    _tx = _db.Database.BeginTransaction();
}
public void Dispose() { _tx.Rollback(); _db.Dispose(); }`) }
    ],
    deepDive: `<p><b>Why InMemory is discouraged.</b> The EF Core docs explicitly recommend against InMemory for testing: it has no relational behaviour, ignores transactions (${C('BeginTransaction')} warns or no-ops), does not enforce unique indexes or most constraints, and evaluates queries in memory. Tests go green while production fails. SQLite in-memory fixes most of this; keep the ${C('SqliteConnection')} open for the test's lifetime, because the database disappears when the last connection closes.</p>
<p><b>Change tracking details.</b> Snapshot change tracking compares current values with the original snapshot during ${C('DetectChanges')} (called automatically by SaveChanges, Entries and some queries). ${C('AsNoTracking()')} queries are not tracked, so modifying their results does nothing unless you ${C('Update')}/${C('Attach')} them. ${C('ExecuteUpdate')}/${C('ExecuteDelete')} (EF 7+) bypass the tracker entirely — tracked entities become stale. A common test bug: asserting with the same context that did the write, so the tracker returns cached entities instead of what the database stored — use a fresh context (or ${C('ChangeTracker.Clear()')}) to read back.</p>
<p><b>Migrations in tests.</b> ${C('EnsureCreated')} builds the schema from the model and bypasses migrations; ${C('Database.Migrate()')} applies the real migration history, which also tests the migrations themselves. Use ${C('Migrate')} against Testcontainers in CI.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants produce DbContext setups, seed data and SQLite fixtures quickly. <b>Use AI as a partner:</b> ask it to list the queries in a repository that might not translate to SQL, then prove each with a test against the real provider. <b>Where AI goes wrong:</b> it defaults to ${C('UseInMemoryDatabase')}, mocks ${C('DbSet<T>')} with fragile IQueryable setups, reads back with the same tracked context, and forgets that SQLite in-memory needs an open connection. <b>What you must still own:</b> which behaviours belong to the database (constraints, concurrency tokens, collation) and must be tested against the real engine.</p>`,
    problems: [{
      title: 'Simulate the EF Core Change Tracker',
      level: 'Medium', tags: ['EF Core', 'state machine', 'simulation'], companies: ['Microsoft', 'Siemens', 'JPMorgan'],
      statement: `<p>Process operations on entities by id and return the value of every ${C('"save"')}:</p>
<ul><li>${C('"load k"')} — start tracking k as Unchanged (ignored if already tracked);</li>
<li>${C('"add k"')} — track k as Added;</li>
<li>${C('"modify k"')} — Unchanged → Modified; Added and Modified stay as they are; untracked or Deleted: ignored;</li>
<li>${C('"delete k"')} — Added → no longer tracked; Unchanged/Modified → Deleted; untracked: ignored;</li>
<li>${C('"save"')} — count Added + Modified + Deleted entries, then Added/Modified → Unchanged and Deleted → untracked; output the count.</li></ul>`,
      constraints: `Up to 10<sup>5</sup> operations; ids fit in int.`,
      example: `<p>${C('["load 1", "load 2", "delete 1", "modify 2", "add 3", "save", "modify 3", "save"]')} → ${H.c('g', '[3, 1]')}: the first save writes DELETE 1, UPDATE 2, INSERT 3; then 3 is Unchanged, so modifying it makes one UPDATE.</p>`,
      brute: { why: `<p>Keeping a list of (id, state) pairs and scanning it for every operation is O(n) per op. A dictionary from id to state makes each operation O(1); save is O(tracked).</p>`, code: `
static class ListTracker
{
    public static int IndexOf(List<(int Id, string State)> entries, int id)
    {
        for (int i = 0; i < entries.Count; i++) if (entries[i].Id == id) return i;   // O(n) per lookup
        return -1;
    }
}` },
      mcq: { q: 'An entity is added and then removed before SaveChanges. What SQL does EF Core send for it?', options: ['None — it becomes Detached', 'An INSERT followed by a DELETE', 'A DELETE only', 'It throws InvalidOperationException'], answer: 0, explain: 'Removing an Added entity simply stops tracking it, since there is no row in the database yet.' },
      hints: [`<p>Hint 1: use ${C('Dictionary<int, State>')} with an ${C('enum State { Added, Unchanged, Modified, Deleted }')}; "untracked" = not in the dictionary.</p>`, `<p>Hint 2: write each operation as a small transition table; most of the bugs are in "delete of an Added entity" and "modify of an Added entity".</p>`, `<p>Hint 3: during save, do not remove from the dictionary while iterating it — collect the keys first (${C('.ToList()')}).</p>`],
      tests: { sig: 'string[] -> int[]', fn: 'saveCounts', cases: [
        [[['load 1', 'modify 1', 'save']], [1]],
        [[['add 1', 'modify 1', 'save', 'save']], [1, 0]],
        [[['add 1', 'delete 1', 'save']], [0]],
        [[['load 1', 'load 2', 'delete 1', 'modify 2', 'add 3', 'save', 'modify 3', 'save']], [3, 1]],
        [[[]], []],
        [[['modify 9', 'delete 9', 'save']], [0]],
        [[['load 1', 'delete 1', 'save', 'modify 1', 'save']], [1, 0]],
        [[['load 1', 'modify 1', 'modify 1', 'delete 1', 'save']], [1]],
        [[['load 5', 'load 5', 'add 6', 'add 7', 'save', 'delete 6', 'load 8', 'save']], [2, 1]]
      ] },
      solution: {
        approach: `<p>A dictionary is the identity map; the enum is the entity state. Each operation is a transition; save counts dirty entries and applies the post-save transitions.</p>`,
        code: `
public enum EntryState { Added, Unchanged, Modified, Deleted }

public class Solution
{
    public static int[] SaveCounts(string[] ops)
    {
        var tracked = new Dictionary<int, EntryState>();
        var saves = new List<int>();
        foreach (string op in ops)
        {
            string[] p = op.Split(' ');
            if (p[0] == "save")
            {
                int written = 0;
                foreach (var (id, state) in tracked.ToList())
                {
                    if (state == EntryState.Unchanged) continue;
                    written++;
                    if (state == EntryState.Deleted) tracked.Remove(id);
                    else tracked[id] = EntryState.Unchanged;
                }
                saves.Add(written);
                continue;
            }
            int k = int.Parse(p[1]);
            bool known = tracked.TryGetValue(k, out EntryState s);
            switch (p[0])
            {
                case "load": if (!known) tracked[k] = EntryState.Unchanged; break;
                case "add": tracked[k] = EntryState.Added; break;
                case "modify": if (known && s == EntryState.Unchanged) tracked[k] = EntryState.Modified; break;
                case "delete":
                    if (!known) break;
                    if (s == EntryState.Added) tracked.Remove(k);
                    else if (s != EntryState.Deleted) tracked[k] = EntryState.Deleted;
                    break;
            }
        }
        return saves.ToArray();
    }
}`,
        dry: { head: ['op', 'tracked after', 'save output'], rows: [['load 1, load 2', '1:U, 2:U', '—'], ['delete 1, modify 2', '1:D, 2:M', '—'], ['add 3', '1:D, 2:M, 3:A', '—'], ['save', '2:U, 3:U', '3'], ['modify 3, save', '2:U, 3:U', '1']] },
        complexity: `<p>O(1) average per operation; O(tracked) per save.</p>`,
        followUps: ['Add "attach k" (Unchanged) and "update k" (Modified even if untracked), like DbContext.Update.', 'Model property-level changes so an UPDATE lists only changed columns.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 5 — NuGet packages and versioning
     ====================================================================== */
  topics.push({
    title: 'NuGet Packages and Versioning: SemVer, Ranges, Resolution and Central Management',
    analogy: `<p>A recipe says "flour, at least 1 kg". The shop has 1 kg, 2 kg and 5 kg bags. A sensible cook buys the <b>smallest bag that satisfies the recipe</b> — that is NuGet's "lowest applicable version" rule. When two recipes in one dinner need flour, the cook buys one bag that satisfies both. And if the head chef (your project) writes "exactly 1 kg" while a sub-recipe wanted 2 kg, the head chef's word wins — but someone should shout "downgrade!".</p>`,
    explain: `<p>A <b>NuGet package</b> is a zip (${C('.nupkg')}) with compiled assemblies per target framework (${C('lib/net8.0/')}, ${C('lib/netstandard2.0/')}), a ${C('.nuspec')} manifest listing dependencies, and optionally build props/targets, analyzers and content. Projects declare ${C('<PackageReference Include="Serilog" Version="4.0.0" />')}; ${C('dotnet restore')} resolves the whole graph and writes ${C('obj/project.assets.json')}.</p>
<h4>Semantic Versioning 2.0</h4>
<p>${C('MAJOR.MINOR.PATCH[-prerelease][+build]')}: MAJOR = breaking changes, MINOR = new compatible features, PATCH = fixes. Prerelease versions sort <b>before</b> the release (${C('2.0.0-rc.1 < 2.0.0')}); build metadata is ignored for ordering. NuGet also accepts a 4th part (${C('1.2.3.4')}) for legacy reasons.</p>
<h4>Version ranges (NuGet notation)</h4>
${H.table(['Written', 'Meaning'], [
  [C('1.0'), '≥ 1.0 (a <b>minimum</b>, not "exactly")'],
  [C('[1.0]'), 'exactly 1.0'],
  [C('[1.0,2.0)'), '1.0 ≤ v &lt; 2.0'],
  [C('(1.0,)'), 'v &gt; 1.0'],
  [C('(,2.0]'), 'v ≤ 2.0'],
  [C('1.*') + ' / ' + C('1.2.*'), 'floating: the <b>highest</b> matching version']
])}
<h4>How restore chooses</h4>
<ul>
<li><b>Lowest applicable version</b>: for a range, NuGet picks the lowest version that satisfies it (builds are reproducible even when newer versions are published). Floating versions are the exception.</li>
<li><b>Direct dependency wins</b> (nearest wins): a version declared closer to the root of the graph beats deeper ones. If that is lower than a transitive requirement, you get <b>NU1605</b> (detected package downgrade), an error by default.</li>
<li><b>Cousin dependencies</b>: when different branches ask for different minimums of the same package at the same depth, NuGet picks the lowest version that satisfies all — the highest of the minimums.</li>
</ul>
<h4>Keeping versions under control</h4>
<ul>
<li><b>Central Package Management</b>: ${C('Directory.Packages.props')} with ${C('<ManagePackageVersionsCentrally>true</ManagePackageVersionsCentrally>')} and ${C('<PackageVersion Include="X" Version="1.2.3" />')}; projects use ${C('<PackageReference Include="X" />')} without a version.</li>
<li><b>Lock files</b>: ${C('<RestorePackagesWithLockFile>true</RestorePackagesWithLockFile>')} writes ${C('packages.lock.json')}; ${C('dotnet restore --locked-mode')} in CI fails if the graph would change.</li>
<li><b>Security</b>: ${C('dotnet list package --vulnerable --include-transitive')}, NuGet audit warnings (NU1901–NU1904) during restore, package source mapping to stop dependency confusion.</li>
</ul>`,
    clues: ['"Version 1.0 means exactly 1.0, right?" — no, it is a minimum', '"NU1605 detected package downgrade"', '"diamond dependency" / "two libraries need different versions of Newtonsoft.Json"', '"keep package versions consistent across 40 projects" — Central Package Management', '"builds are not reproducible" — lock files, avoid floating versions', '"is this a breaking change?" — SemVer major bump'],
    code: [fw(`
<!-- Directory.Packages.props (repo root) -->
<Project>
  <PropertyGroup>
    <ManagePackageVersionsCentrally>true</ManagePackageVersionsCentrally>
    <CentralPackageTransitivePinningEnabled>true</CentralPackageTransitivePinningEnabled>
  </PropertyGroup>
  <ItemGroup>
    <PackageVersion Include="Serilog" Version="4.0.0" />
    <PackageVersion Include="xunit" Version="2.9.0" />
    <PackageVersion Include="Moq" Version="[4.20.70]" />
  </ItemGroup>
</Project>

<!-- src/Api/Api.csproj -->
<ItemGroup>
  <PackageReference Include="Serilog" />
  <PackageReference Include="Polly" VersionOverride="8.4.0" />   <!-- explicit exception, visible in review -->
</ItemGroup>`, 'Central Package Management', 'html'), { lang: 'csharp', run: true, title: 'Comparing versions and picking the lowest applicable one (runnable)', code: `
var available = new[] { "1.0.0", "1.2.0", "1.10.0", "2.0.0" }.Select(Version.Parse).ToList();
available.Sort();                                   // numeric, so 1.10.0 > 1.2.0 (strings would say otherwise)
Console.WriteLine(string.Join(" < ", available));

// Range [1.1, 2.0): lowest applicable version
var min = new Version(1, 1); var max = new Version(2, 0);
Version? pick = available.FirstOrDefault(v => v >= min && v < max);
Console.WriteLine($"[1.1,2.0) -> {pick}");          // 1.2.0

Console.WriteLine(string.CompareOrdinal("1.10.0", "1.2.0") < 0);   // True: string comparison is wrong for versions` }],
    codeTitle: ['Central versions', 'Resolution in C#'],
    viz: {
      title: 'Restore resolves a dependency graph: nearest wins, then a downgrade warning',
      gen: function () {
        var nodes = [
          { id: 'App', label: 'App', x: 10, y: 30, shape: 'box' },
          { id: 'A', label: 'LibA 1.0', x: 40, y: 12, shape: 'box' },
          { id: 'B', label: 'LibB 3.1', x: 40, y: 48, shape: 'box' },
          { id: 'J', label: 'Json ?', x: 78, y: 30, shape: 'box' }
        ];
        var g = function (lbl, hl, ehl, edges) { var n = nodes.map(function (x) { return x.id === 'J' ? { id: 'J', label: lbl, x: 78, y: 30, shape: 'box' } : x; }); return { type: 'graph', directed: true, height: 60, nodes: n, edges: edges, hl: hl, ehl: ehl || {} }; };
        var e1 = [['App', 'A'], ['App', 'B'], ['A', 'J', '≥ 12.0'], ['B', 'J', '≥ 13.0']];
        var e2 = e1.concat([['App', 'J', '[12.0]']]);
        return [
          { narr: 'App references LibA and LibB directly. Both depend on Json: LibA needs ≥ 12.0, LibB needs ≥ 13.0. Available Json: 12.0, 13.0, 13.0.3.', parts: [g('Json ?', { App: 'cur' }, {}, e1)] },
          { narr: 'Both requirements sit at the same depth (cousins). NuGet picks the <b>lowest version satisfying all ranges</b>: max(12.0, 13.0) = <b>13.0</b>, not the newest 13.0.3.', parts: [g('Json 13.0', { J: 'ok' }, { 'A-J': 'cur', 'B-J': 'cur' }, e1)] },
          { narr: 'Now App adds a <b>direct</b> reference ' + C('Json [12.0]') + '. Direct dependencies are nearest to the root, so they win over transitive ones.', parts: [g('Json ?', { App: 'cur' }, { 'App-J': 'cur' }, e2)] },
          { narr: 'Result: Json 12.0 — lower than LibB\'s minimum 13.0. Restore reports <b>NU1605: Detected package downgrade</b> (an error by default), because LibB may call APIs that 12.0 lacks.', parts: [g('Json 12.0', { J: 'bad' }, { 'B-J': 'bad' }, e2)] },
          { narr: 'Fix: raise the direct reference to ≥ 13.0 (or remove it). With Central Package Management + transitive pinning, one ' + C('PackageVersion') + ' line controls the version for every project.', parts: [g('Json 13.0', { J: 'ok' }, {}, e2), note('Lesson', 'Nearest wins → lowest applicable → check for downgrades.')] }
        ];
      }
    },
    examples: [
      { title: 'SemVer decides upgrade risk', html: `<p>${C('4.2.1 → 4.2.2')}: safe fix. ${C('4.2 → 4.3')}: new APIs, should be compatible. ${C('4 → 5')}: read the breaking-changes list. ${C('5.0.0-preview.3')}: opt-in only — restore never picks prereleases for a stable range unless the range itself mentions a prerelease.</p>` },
      { title: 'Lock files in CI', html: `<p>Commit ${C('packages.lock.json')} and restore in locked mode so a transitive package update can never slip in silently.</p>`, code: fw(`
<PropertyGroup>
  <RestorePackagesWithLockFile>true</RestorePackagesWithLockFile>
  <RestoreLockedMode Condition="'$(CI)' == 'true'">true</RestoreLockedMode>
</PropertyGroup>`, null, 'html') },
      { title: 'Comparing prerelease versions (plain C#)', html: `<p>${C('System.Version')} has no prerelease support. Prerelease identifiers compare left to right: numbers numerically, text ordinally, numbers before text, and a shorter list first when all shared ones are equal.</p>`, code: { lang: 'csharp', run: true, code: `
int ComparePre(string a, string b)
{
    string[] x = a.Split('.'), y = b.Split('.');
    for (int i = 0; i < Math.Min(x.Length, y.Length); i++)
    {
        bool xn = int.TryParse(x[i], out int xv), yn = int.TryParse(y[i], out int yv);
        int c = xn && yn ? xv.CompareTo(yv) : xn ? -1 : yn ? 1 : string.CompareOrdinal(x[i], y[i]);
        if (c != 0) return Math.Sign(c);
    }
    return x.Length.CompareTo(y.Length);
}
Console.WriteLine(ComparePre("alpha", "alpha.1"));   // -1
Console.WriteLine(ComparePre("rc.2", "rc.10"));      // -1 (numeric)
Console.WriteLine(ComparePre("beta", "alpha"));      // 1` } }
    ],
    deepDive: `<p><b>Restore algorithm.</b> NuGet walks the graph from the project, applying "direct dependency wins" (a node closer to the root eclipses deeper nodes for the same id) and "cousin" resolution (lowest version satisfying all ranges at the competing level). If no single version satisfies the ranges you get NU1107 (version conflict); a direct reference forcing a lower version gives NU1605; a range with no available version at all gives NU1102. The final graph is in ${C('project.assets.json')}, which the compiler and ${C('dotnet list package --include-transitive')} read.</p>
<p><b>Binding at run time.</b> .NET (Core) loads exactly the assembly versions in ${C('.deps.json')}; there are no binding redirects as in .NET Framework. Two packages needing incompatible <b>major</b> versions of the same library cannot both be satisfied — one of them must be upgraded.</p>
<p><b>Authoring packages.</b> ${C('dotnet pack')} with ${C('<PackageId>')}, ${C('<Version>')}, ${C('<Authors>')}, ${C('<PackageReadmeFile>')}; multi-target with ${C('<TargetFrameworks>net8.0;netstandard2.0</TargetFrameworks>')}; enable SourceLink and deterministic builds for debuggable packages; use package validation (${C('<EnablePackageValidation>')}) to catch accidental breaking changes against a baseline version.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants can explain an NU1605/NU1107 error, read ${C('project.assets.json')} and propose a minimal set of version bumps. <b>Use AI as a partner:</b> paste the restore output and the dependency tree and ask which direct reference causes the downgrade. <b>Where AI goes wrong:</b> it suggests binding redirects (a .NET Framework fix), invents package versions that do not exist, treats ${C('Version="1.0"')} as exact, and "fixes" conflicts by adding floating versions that break reproducibility. <b>What you must still own:</b> upgrade policy, reading release notes for major bumps, and vulnerability triage.</p>`,
    problems: [{
      title: 'Resolve a NuGet Version Range',
      level: 'Medium', tags: ['versioning', 'parsing', 'NuGet'], companies: ['Microsoft', 'GitHub', 'JetBrains'],
      statement: `<p>Given the available versions of a package (${C('"major.minor.patch"')}) and a NuGet range, return the version restore would choose — the <b>lowest</b> version that satisfies the range — or ${C('"none"')}. Range forms: ${C('"1.1"')} (minimum, inclusive), ${C('"[1.0]"')} (exact), and interval notation ${C('[a,b]')}, ${C('(a,b)')}, mixed brackets, with an empty side meaning unbounded (${C('"(1.0,)"')}, ${C('"(,2.0]"')}). Range bounds may have 2 or 3 parts (missing parts are 0). Compare numerically.</p>`,
      constraints: `Up to 10<sup>4</sup> versions, given in any order; no prerelease labels.`,
      example: `<p>Available ${C('["1.0.0", "1.2.0", "1.10.0", "2.0.0"]')}: ${C('"(1.2,2.0)"')} → ${H.c('g', '"1.10.0"')} (1.10 &gt; 1.2 numerically); ${C('"1.1"')} → ${H.c('g', '"1.2.0"')}; ${C('"(2.0,)"')} → ${H.c('g', '"none"')}.</p>`,
      brute: { why: `<p>Sorting the version <b>strings</b> gives ${C('1.10.0 < 1.2.0')} — wrong. Parse into numbers (${C('System.Version')}) first. Sorting is also unnecessary: a single pass keeping the smallest satisfying version is O(n).</p>`, code: `
static class StringSortPick
{
    public static string Pick(string[] versions, string min)
        => versions.OrderBy(v => v, StringComparer.Ordinal).FirstOrDefault(v => string.CompareOrdinal(v, min) >= 0) ?? "none";   // ordinal compare: wrong for 1.10
}` },
      mcq: { q: 'A project has PackageReference Version="2.1". Versions 2.1.0, 2.4.0 and 3.0.0 exist. What does restore pick?', options: ['2.1.0 — the lowest version ≥ 2.1', '3.0.0 — the newest', '2.4.0 — the newest within major 2', 'It fails: 2.1 is ambiguous'], answer: 0, explain: 'A bare version is a minimum, and NuGet chooses the lowest applicable version so builds are stable.' },
      hints: [`<p>Hint 1: parse every version with ${C('Version.Parse')}; normalise 2-part bounds to 3 parts so ${C('2.0')} equals ${C('2.0.0')} (${C('new Version(2, 0)')} is <i>not</i> equal to ${C('new Version(2, 0, 0)')}).</p>`, `<p>Hint 2: turn the range into (lower, lowerInclusive, upper, upperInclusive) with nulls for unbounded sides; ${C('"[x]"')} is lower = upper = x, both inclusive; a bare ${C('x')} is lower = x inclusive, no upper.</p>`, `<p>Hint 3: scan once, keep the smallest version that satisfies both bounds; return ${C('"none"')} if nothing matched.</p>`],
      tests: { sig: 'string[] string -> string', fn: 'resolve', cases: [
        [[['1.0.0', '1.2.0', '1.10.0', '2.0.0'], '1.1'], '1.2.0'],
        [[['1.0.0', '1.2.0', '1.10.0', '2.0.0'], '[1.0,2.0)'], '1.0.0'],
        [[['1.0.0', '1.2.0', '1.10.0', '2.0.0'], '(1.2,2.0)'], '1.10.0'],
        [[['1.0.0', '1.2.0', '1.10.0', '2.0.0'], '[2.0]'], '2.0.0'],
        [[['1.0.0', '1.2.0', '1.10.0', '2.0.0'], '(2.0,)'], 'none'],
        [[['2.0.0', '1.10.0', '1.0.0', '1.2.0'], '(,1.0]'], '1.0.0'],
        [[['1.0.0', '1.2.0'], '[1.5]'], 'none'],
        [[[], '1.0'], 'none'],
        [[['3.1.4', '3.1.10', '3.2.0'], '(3.1.4,3.2.0]'], '3.1.10']
      ] },
      solution: {
        approach: `<p>Parse the range into two optional bounds with inclusivity flags, normalise all versions to three parts, then take the minimum satisfying version in one pass.</p>`,
        code: `
public class Solution
{
    static Version V(string s)
    {
        var v = Version.Parse(s.Contains('.') ? s : s + ".0");
        return new Version(v.Major, v.Minor, Math.Max(v.Build, 0));   // 2.0 -> 2.0.0
    }

    public static string Resolve(string[] available, string range)
    {
        Version? lo = null, hi = null;
        bool loInc = true, hiInc = true;
        if (range[0] == '[' || range[0] == '(')
        {
            loInc = range[0] == '[';
            hiInc = range[^1] == ']';
            string inner = range[1..^1];
            if (!inner.Contains(',')) { lo = hi = V(inner); }                 // [1.0] exact
            else
            {
                string[] p = inner.Split(',');
                if (p[0].Trim().Length > 0) lo = V(p[0].Trim());
                if (p[1].Trim().Length > 0) hi = V(p[1].Trim());
            }
        }
        else lo = V(range);                                                    // bare minimum

        Version? best = null;
        foreach (string s in available)
        {
            Version v = V(s);
            bool okLo = lo is null || (loInc ? v >= lo : v > lo);
            bool okHi = hi is null || (hiInc ? v <= hi : v < hi);
            if (okLo && okHi && (best is null || v < best)) best = v;
        }
        return best?.ToString() ?? "none";
    }
}`,
        dry: { head: ['version', '&gt; 1.2.0?', '&lt; 2.0.0?', 'best so far'], rows: [['1.0.0', 'no', 'yes', '—'], ['1.2.0', 'no (exclusive)', 'yes', '—'], ['1.10.0', 'yes', 'yes', '1.10.0'], ['2.0.0', 'yes', 'no (exclusive)', '1.10.0']] },
        complexity: `<p>O(n) time, O(1) extra space.</p>`,
        followUps: ['Add floating versions (1.*) which pick the HIGHEST match.', 'Support prerelease labels using SemVer precedence.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 6 — MSBuild, project files and the dotnet CLI
     ====================================================================== */
  topics.push({
    title: 'MSBuild, Project Files and the dotnet CLI',
    analogy: `<p>A project file is a <b>recipe card</b> read top to bottom by a very literal cook (MSBuild). First the cook reads every ingredient amount (<b>properties</b>) and ingredient list (<b>items</b>); a later line that says "sugar = 2 spoons" overrides an earlier "sugar = 1". Only after reading the whole card does the cook start the <b>steps</b> (targets) — and some steps say "do this after chopping". If the restaurant owner shouts an amount from the door (a <b>global property</b> like ${'-p:Configuration=Release'}), that shouted value beats whatever the card says.</p>`,
    explain: `<p>Every ${C('.csproj')} is an <b>MSBuild</b> file. SDK-style projects are tiny because ${C('<Project Sdk="Microsoft.NET.Sdk">')} imports hundreds of default properties, items and targets.</p>
${P(`
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
  </PropertyGroup>
  <ItemGroup>
    <PackageReference Include="Serilog" Version="4.0.0" />
    <ProjectReference Include="..\\Core\\Core.csproj" />
    <InternalsVisibleTo Include="Api.Tests" />
  </ItemGroup>
</Project>`)}
${H.table(['Concept', 'Syntax', 'Notes'], [
  ['Property (a scalar)', C('<Version>1.2.0</Version>') + ', read as ' + C('$(Version)'), 'last definition wins; global properties (' + C('-p:') + ') cannot be overridden by the project'],
  ['Item (a list)', C('<Compile Include="**/*.cs" />') + ', read as ' + C('@(Compile)'), 'metadata via ' + C('%(Identity)') + '; SDK globs include files automatically'],
  ['Condition', C('Condition="\'$(Configuration)\' == \'Release\'"'), 'string comparison is case-insensitive'],
  ['Target', C('<Target Name="Stamp" AfterTargets="Build">'), 'runs tasks; ordered by DependsOnTargets / BeforeTargets / AfterTargets'],
  ['Task', C('<Message Text="hi" />') + ', ' + C('<Copy>') + ', ' + C('<Exec>'), 'the unit of work inside a target'],
  ['Import', C('Directory.Build.props') + ' / ' + C('.targets'), 'auto-imported from parent folders: share settings across a repo']
])}
<h4>Evaluation order (the source of many surprises)</h4>
<ol><li>Environment variables and global properties are set.</li><li>All <b>properties</b> are evaluated in file order (imports inlined).</li><li>All <b>items</b> are evaluated.</li><li>Targets run (execution phase) — properties set inside targets only exist from then on.</li></ol>
<p>So ${C('Directory.Build.props')} (imported early) sets defaults the project can override, while ${C('Directory.Build.targets')} (imported late) can see and override the project's values.</p>
<h4>The dotnet CLI</h4>
${H.table(['Command', 'What it does'], [
  [C('dotnet new xunit -n Api.Tests'), 'create from a template'],
  [C('dotnet sln add') + ' / ' + C('dotnet add reference') + ' / ' + C('dotnet add package'), 'edit solution and project references'],
  [C('dotnet restore') + ' → ' + C('build') + ' → ' + C('test') + ' / ' + C('pack') + ' / ' + C('publish'), 'each implies the previous steps (use ' + C('--no-restore') + ' / ' + C('--no-build') + ' in CI)'],
  [C('dotnet publish -c Release -r linux-x64 --self-contained -p:PublishTrimmed=true'), 'deployable output; RID-specific, optional trimming / AOT'],
  [C('dotnet format') + ', ' + C('dotnet tool restore') + ', ' + C('dotnet list package --outdated'), 'style fixes, local tools from ' + C('dotnet-tools.json') + ', package hygiene'],
  [C('dotnet build -bl'), 'writes a binary log (msbuild.binlog) — open it in MSBuild Structured Log Viewer to debug builds']
])}`,
    clues: ['"where do I put settings shared by all projects?" — Directory.Build.props', '"my property is ignored" — evaluation order, later definition wins, global properties', '"run a step after build" — Target AfterTargets="Build"', '"why is CI slower than local?" — restore/build repeated; use --no-restore / --no-build', '"how do you debug a build?" — -bl binary log, -v:diag', '"self-contained vs framework-dependent publish"'],
    code: [fw(`
<!-- Directory.Build.props: imported BEFORE each project's body -->
<Project>
  <PropertyGroup>
    <LangVersion>latest</LangVersion>
    <Nullable>enable</Nullable>
    <AnalysisLevel>latest-recommended</AnalysisLevel>
    <TreatWarningsAsErrors Condition="'$(CI)' == 'true'">true</TreatWarningsAsErrors>
  </PropertyGroup>
</Project>

<!-- Api.csproj: a custom target that runs after Build -->
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <BuildStamp>$([System.DateTime]::UtcNow.ToString("yyyyMMddHHmm"))</BuildStamp>
  </PropertyGroup>
  <Target Name="PrintStamp" AfterTargets="Build">
    <Message Importance="high" Text="Built $(AssemblyName) $(Configuration) at $(BuildStamp)" />
  </Target>
</Project>`, 'Directory.Build.props and a custom target', 'html'), { lang: 'csharp', run: true, title: 'Last definition wins and $(Prop) expands at evaluation time (runnable model)', code: `
var props = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
var global = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase) { ["Configuration"] = "Release" };

void Set(string name, string value)
{
    if (global.ContainsKey(name)) return;                    // global properties cannot be overridden
    props[name] = Expand(value);                              // expanded NOW, with current values
}
string Expand(string v)
{
    var sb = new System.Text.StringBuilder();
    for (int i = 0; i < v.Length; i++)
    {
        if (v[i] == '$' && i + 1 < v.Length && v[i + 1] == '(')
        {
            int end = v.IndexOf(')', i);
            string name = v.Substring(i + 2, end - i - 2);
            sb.Append(global.GetValueOrDefault(name) ?? props.GetValueOrDefault(name) ?? "");
            i = end;
        }
        else sb.Append(v[i]);
    }
    return sb.ToString();
}

Set("OutDir", "bin/$(Configuration)/$(TargetFramework)/");   // TargetFramework not defined yet -> empty
Set("TargetFramework", "net8.0");
Set("Configuration", "Debug");                                 // ignored: global wins
Console.WriteLine(props["OutDir"]);                            // bin/Release//` }],
    codeTitle: ['Project files', 'Evaluation model'],
    viz: {
      title: 'Property evaluation, top to bottom, with a global property',
      gen: function () {
        var code = [
          '<!-- dotnet build -p:Configuration=Release -->',
          '<Configuration>Debug</Configuration>',
          '<OutDir>bin/$(Configuration)/$(Tfm)/</OutDir>',
          '<Tfm>net8.0</Tfm>',
          '<Optimize>false</Optimize>',
          '<Optimize Condition="\'$(Configuration)\'==\'release\'">true</Optimize>'
        ].join('\n');
        var f = function (line, vals, hl, narr) { return { narr: narr, parts: [{ type: 'code', label: 'Project file (evaluation pass)', lang: 'html', code: code, hl: line ? (function () { var o = {}; o[line] = 'cur'; return o; })() : {} }, { type: 'vars', label: 'Properties', vals: vals, hl: hl || {} }] }; };
        return [
          f(1, { Configuration: 'Release (global)' }, { Configuration: 'sel' }, 'Global properties from the command line are set first and are <b>read-only</b> for the project.'),
          f(2, { Configuration: 'Release (global)' }, { Configuration: 'bad' }, 'The project tries to set Configuration=Debug. Because a global property with that name exists, the assignment is ignored.'),
          f(3, { Configuration: 'Release (global)', OutDir: 'bin/Release//' }, { OutDir: 'cur' }, C('$(Configuration)') + ' and ' + C('$(Tfm)') + ' expand <b>now</b>. Tfm is not defined yet, so it expands to the empty string — a classic bug.'),
          f(4, { Configuration: 'Release (global)', OutDir: 'bin/Release//', Tfm: 'net8.0' }, { Tfm: 'ok' }, 'Tfm is defined after it was used. Moving this line above OutDir (or into Directory.Build.props) fixes it.'),
          f(5, { Configuration: 'Release (global)', OutDir: 'bin/Release//', Tfm: 'net8.0', Optimize: 'false' }, { Optimize: 'cur' }, 'Optimize=false.'),
          f(6, { Configuration: 'Release (global)', OutDir: 'bin/Release//', Tfm: 'net8.0', Optimize: 'true' }, { Optimize: 'ok' }, 'The condition compares strings case-insensitively: \'Release\' == \'release\' is true, so the later definition wins → Optimize=true.')
        ];
      }
    },
    examples: [
      { title: 'A test project, start to finish with the CLI', html: `<p>The whole workflow without an IDE: create a solution, a library and a test project, wire references and packages, then run the tests with coverage.</p>`, code: fw(`
dotnet new sln -n Shop
dotnet new classlib -n Shop.Core
dotnet new xunit -n Shop.Core.Tests
dotnet sln add Shop.Core Shop.Core.Tests
dotnet add Shop.Core.Tests reference Shop.Core
dotnet add Shop.Core.Tests package Moq
dotnet test --collect:"XPlat Code Coverage"`, null, 'bash') },
      { title: 'Directory.Build.targets sees the final values', html: `<p>A .targets file imported after the project body can react to what the project set, e.g. add a package only to test projects.</p>`, code: fw(`
<Project>
  <ItemGroup Condition="'$(IsTestProject)' == 'true'">
    <PackageReference Include="coverlet.collector" />
  </ItemGroup>
</Project>`, null, 'html') },
      { title: 'Case-insensitive conditions (plain C#)', html: `<p>MSBuild string comparisons in conditions ignore case; in C# use ${C('StringComparison.OrdinalIgnoreCase')} to mirror that.</p>`, code: { lang: 'csharp', run: true, code: `
string configuration = "Release";
bool optimize = string.Equals(configuration, "release", StringComparison.OrdinalIgnoreCase);
Console.WriteLine(optimize);                                           // True, like MSBuild's ==
Console.WriteLine(configuration == "release");                         // False: C# == is case-sensitive` } }
    ],
    deepDive: `<p><b>Two phases.</b> Evaluation computes all properties (pass 1, including imports in order), item definitions, items (pass 3, globs expanded) and then the execution phase runs targets. Property functions (${C('$([System.IO.Path]::Combine(...))')}) and item transforms (${C('@(Compile->\'%(Filename)\')')}) run during evaluation. Because items are evaluated after all properties, an item can use a property defined later in the file — but a property cannot use an item.</p>
<p><b>Target ordering.</b> Before a target runs, its ${C('DependsOnTargets')} run, then targets that list it in ${C('BeforeTargets')}; after it, targets listing it in ${C('AfterTargets')}. Each target runs at most once per build. Incremental builds skip targets whose ${C('Inputs')} are older than their ${C('Outputs')}.</p>
<p><b>Restore is special.</b> ${C('dotnet build')} runs restore as a separate evaluation first (${C('-restore')}), because restore can add imports (package props/targets) that change the project. The SDK's properties like ${C('IsTestProject')}, ${C('IsPackable')} and ${C('GenerateDocumentationFile')} are just MSBuild properties you can set or query (${C('dotnet msbuild -getProperty:TargetPath')} in .NET 8).</p>
<p><b>Reproducible CI:</b> ${C('global.json')} pins the SDK version; ${C('ContinuousIntegrationBuild=true')} gives deterministic paths; ${C('dotnet build -warnaserror')} and ${C('--no-incremental')} for clean release builds.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants write MSBuild targets, conditions and property functions that used to require digging through docs, and they explain binary logs well. <b>Use AI as a partner:</b> paste the relevant part of a binlog and ask why a property has its final value. <b>Where AI goes wrong:</b> it writes old non-SDK project files (packages.config, explicit Compile items), puts targets in .props files, uses properties that are defined later in evaluation, and forgets that global properties win. <b>What you must still own:</b> keeping project files small and conventional — every custom target is code someone must maintain.</p>`,
    problems: [{
      title: 'Evaluate MSBuild Properties',
      level: 'Medium', tags: ['MSBuild', 'parsing', 'simulation'], companies: ['Microsoft', 'Unity', 'Datadog'],
      statement: `<p>Simulate MSBuild's property evaluation. ${C('globals')} are ${C('"Name=Value"')} pairs from the command line. ${C('lines')} are evaluated top to bottom; each is ${C('"Name=Value"')} or ${C('"Name=Value|Other==Text"')} (applied only if the current value of Other equals Text, ignoring case). Before assigning, every ${C('$(X)')} in Value is replaced with X's current value (global first, else project, else empty). A line never changes a property that has a global value. Names are case-insensitive. Return the final value of ${C('query')} (empty string if undefined).</p>`,
      constraints: `Up to 1000 lines; values contain no ${C('|')}, ${C('=')} or nested ${C('$(')}.`,
      example: `<p>globals ${C('["Configuration=Release"]')}, lines ${C('["Configuration=Debug", "OutDir=bin/$(Configuration)/"]')}, query ${C('"OutDir"')} → ${H.c('g', '"bin/Release/"')} — the global wins and is used during expansion.</p>`,
      brute: { why: `<p>Expanding lazily at query time (storing raw strings and resolving ${C('$(X)')} at the end) gives the wrong answer when X changes after use: MSBuild expands at the moment the property is assigned. Re-scanning all lines for every lookup is also O(lines²).</p>`, code: `
static class LazyEval
{
    public static string Last(string[] lines, string name)
        => lines.Select(l => l.Split('=', 2)).LastOrDefault(p => p[0] == name)?[1] ?? "";   // no expansion, no conditions
}` },
      mcq: { q: 'A.props sets Tfm after OutDir uses $(Tfm). What is in OutDir?', options: ['The empty string where $(Tfm) appeared — properties expand when assigned', 'The later Tfm value — MSBuild resolves lazily', 'An evaluation error', 'The literal text $(Tfm)'], answer: 0, explain: 'Property values are expanded during the evaluation pass in file order; undefined properties expand to empty.' },
      hints: [`<p>Hint 1: two ${C('Dictionary<string, string>')} with ${C('StringComparer.OrdinalIgnoreCase')}: one for globals, one for project properties.</p>`, `<p>Hint 2: split each line on the first ${C('|')} to get the condition, then on the first ${C('=')}; the condition splits on ${C('==')}.</p>`, `<p>Hint 3: expand by scanning for ${C('$(')} and the next ${C(')')}; look the name up in globals, then project, else "". Skip assignment if the name is global.</p>`],
      tests: { sig: 'string[] string[] string -> string', fn: 'evaluate', cases: [
        [[[], ['Configuration=Debug', 'OutDir=bin/$(Configuration)/'], 'OutDir'], 'bin/Debug/'],
        [[['Configuration=Release'], ['Configuration=Debug', 'OutDir=bin/$(Configuration)/'], 'OutDir'], 'bin/Release/'],
        [[[], ['A=1', 'A=2'], 'A'], '2'],
        [[[], ['B=$(A)x', 'A=1'], 'B'], 'x'],
        [[[], ['Configuration=Release', 'Optimize=false', 'Optimize=true|Configuration==release'], 'Optimize'], 'true'],
        [[[], ['X=1'], 'Missing'], ''],
        [[['Configuration=Debug'], ['Configuration=Release', 'Optimize=true|Configuration==Release'], 'Optimize'], ''],
        [[[], ['A=a', 'A=$(A)$(A)', 'A=$(A)!'], 'a'], 'aa!'],
        [[['Configuration=Release'], [], 'configuration'], 'Release']
      ] },
      solution: {
        approach: `<p>Walk the lines once, exactly like the evaluation pass: check the condition against current values, expand references against current values, and refuse to overwrite global properties.</p>`,
        code: `
public class Solution
{
    public static string Evaluate(string[] globals, string[] lines, string query)
    {
        var global = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (string g in globals) { var kv = g.Split('=', 2); global[kv[0]] = kv[1]; }
        var props = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        string Get(string name) => global.TryGetValue(name, out var gv) ? gv : props.GetValueOrDefault(name, "");

        string Expand(string value)
        {
            var sb = new System.Text.StringBuilder();
            int i = 0;
            while (i < value.Length)
            {
                int start = value.IndexOf("$(", i, StringComparison.Ordinal);
                if (start < 0) { sb.Append(value, i, value.Length - i); break; }
                int end = value.IndexOf(')', start);
                sb.Append(value, i, start - i).Append(Get(value.Substring(start + 2, end - start - 2)));
                i = end + 1;
            }
            return sb.ToString();
        }

        foreach (string line in lines)
        {
            string[] byBar = line.Split('|', 2);
            if (byBar.Length == 2)
            {
                string[] cond = byBar[1].Split("==");
                if (!string.Equals(Get(cond[0]), cond[1], StringComparison.OrdinalIgnoreCase)) continue;
            }
            string[] kv = byBar[0].Split('=', 2);
            if (global.ContainsKey(kv[0])) continue;              // global properties are read-only
            props[kv[0]] = Expand(kv[1]);
        }
        return Get(query);
    }
}`,
        dry: { head: ['line', 'condition', 'expanded value', 'A'], rows: [['A=a', '—', 'a', 'a'], ['A=$(A)$(A)', '—', 'aa', 'aa'], ['A=$(A)!', '—', 'aa!', 'aa!'], ['query "a"', 'names ignore case', '—', 'aa!']] },
        complexity: `<p>O(total text length) time; O(properties) space.</p>`,
        followUps: ['Support TreatAsLocalProperty, which lets a project override a global property.', 'Add items and @(Item) expansion, evaluated after all properties.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 7 — Analyzers and code coverage
     ====================================================================== */
  var T7_CODE = [
    'static string Grade(int score)',
    '{',
    '    if (score < 0) throw new ArgumentOutOfRangeException(nameof(score));',
    '    if (score >= 90) return "A";',
    '    return score >= 50 ? "Pass" : "Fail";',
    '}',
    '',
    '// tests: Grade(95), Grade(70)'
  ].join('\n');
  topics.push({
    title: 'Analyzers and Code Coverage: Roslyn Rules, .editorconfig, Coverlet',
    analogy: `<p>A <b>spell-checker</b> underlines mistakes while you type — that is a Roslyn analyzer, reading your code as you write it. A <b>museum guard's clicker</b> counts which rooms visitors actually entered — that is code coverage, counting which lines your tests actually ran. A room nobody entered is definitely unchecked; but a visitor who walked through a room without looking at the paintings still counts as "covered". Coverage tells you what was <b>not</b> tested, never that something was tested <b>well</b>.</p>`,
    explain: `<h4>1. Roslyn analyzers</h4>
<p>Analyzers are plugins that run inside the compiler (and the IDE), inspect syntax trees and semantic models, and report <b>diagnostics</b> with an ID, a severity and often a code fix. Sources: the .NET SDK's built-in code-quality rules (${C('CAxxxx')}, e.g. CA1822 "mark members as static", CA2007 ConfigureAwait), code-style rules (${C('IDExxxx')}), nullable warnings (${C('CS86xx')}), and NuGet analyzer packages (xunit.analyzers, Meziantou.Analyzer, StyleCop.Analyzers, SonarAnalyzer).</p>
${H.table(['Severity', 'Build output', 'IDE'], [
  [C('error'), 'error — build fails', 'red squiggle'],
  [C('warning'), 'warning (an error with TreatWarningsAsErrors)', 'green squiggle'],
  [C('suggestion'), 'nothing', 'dots + light bulb'],
  [C('silent'), 'nothing', 'light bulb only'],
  [C('none'), 'nothing', 'disabled']
])}
${P(`
# .editorconfig
root = true
[*.cs]
dotnet_analyzer_diagnostic.severity = warning                     # every analyzer rule
dotnet_analyzer_diagnostic.category-Performance.severity = error  # a whole category
dotnet_diagnostic.CA1822.severity = suggestion                    # one rule (most specific wins)
dotnet_diagnostic.CA2007.severity = none                          # ConfigureAwait: not needed in ASP.NET Core apps`)}
<p>Project-level switches: ${C('<AnalysisLevel>latest-recommended</AnalysisLevel>')} (which rule set is on), ${C('<EnforceCodeStyleInBuild>true</EnforceCodeStyleInBuild>')} (IDE rules in the build), ${C('<TreatWarningsAsErrors>')}, ${C('<WarningsAsErrors>')} / ${C('<NoWarn>')} lists. Suppress a single occurrence with ${C('#pragma warning disable CA1822')} or ${C('[SuppressMessage]')} — with a justification.</p>
<h4>2. Code coverage</h4>
<p><b>Coverlet</b> (the ${C('coverlet.collector')} package is in the xUnit template) instruments the IL of your assemblies so every sequence point and branch increments a counter. Run ${C('dotnet test --collect:"XPlat Code Coverage"')}; it writes ${C('coverage.cobertura.xml')}; <b>ReportGenerator</b> turns that into HTML. Microsoft's own collector (${C('--collect "Code Coverage"')}, Microsoft.Testing.Extensions.CodeCoverage) is the alternative.</p>
${H.table(['Metric', 'Counts', 'Blind spot'], [
  ['Line (statement) coverage', 'lines executed at least once', C('return x > 0 ? a : b;') + ' is one line, two behaviours'],
  ['Branch coverage', 'outcomes of each decision (true/false, each switch arm)', 'combinations of conditions, data values'],
  ['Mutation score (Stryker.NET)', 'small code changes your tests detect', 'slow; the best measure of assertion quality']
])}`,
    clues: ['"enforce coding standards in CI" — analyzers + .editorconfig + TreatWarningsAsErrors', '"a warning is too noisy, how do you turn it off?" — severity in .editorconfig, scoped, justified', '"what coverage percentage should we require?" — trend and changed-lines coverage, not a magic number', '"100% coverage but bugs still ship" — coverage ≠ assertions; mutation testing', '"line vs branch coverage"', '"write a custom rule for our codebase" — DiagnosticAnalyzer + CodeFixProvider'],
    code: [fw(`
// A tiny custom analyzer: flag DateTime.Now (use TimeProvider instead). Lives in a netstandard2.0 project
// referencing Microsoft.CodeAnalysis.CSharp, packed as an analyzer.
[DiagnosticAnalyzer(LanguageNames.CSharp)]
public sealed class NoDateTimeNowAnalyzer : DiagnosticAnalyzer
{
    private static readonly DiagnosticDescriptor Rule = new(
        id: "SHOP001", title: "Do not use DateTime.Now",
        messageFormat: "Use TimeProvider instead of DateTime.{0}", category: "Reliability",
        defaultSeverity: DiagnosticSeverity.Warning, isEnabledByDefault: true);

    public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics => [Rule];

    public override void Initialize(AnalysisContext context)
    {
        context.ConfigureGeneratedCodeAnalysis(GeneratedCodeAnalysisFlags.None);
        context.EnableConcurrentExecution();
        context.RegisterSyntaxNodeAction(ctx =>
        {
            var access = (MemberAccessExpressionSyntax)ctx.Node;
            if (access.Name.Identifier.Text is not ("Now" or "UtcNow")) return;
            if (ctx.SemanticModel.GetSymbolInfo(access).Symbol?.ContainingType?.ToDisplayString() == "System.DateTime")
                ctx.ReportDiagnostic(Diagnostic.Create(Rule, access.GetLocation(), access.Name.Identifier.Text));
        }, SyntaxKind.SimpleMemberAccessExpression);
    }
}`, 'A custom Roslyn analyzer (needs Microsoft.CodeAnalysis packages)'), { lang: 'csharp', run: true, title: 'Line vs branch coverage by hand-made counters (runnable)', code: `
// What an instrumenter like Coverlet does: insert a counter increment at each line and each branch outcome.
var lineHits = new int[5];
var branchHits = new int[4];   // [score>=90 true, false, score>=50 true, false]

string Grade(int score)
{
    lineHits[0]++;
    if (score >= 90) { branchHits[0]++; lineHits[1]++; return "A"; }
    branchHits[1]++;
    lineHits[2]++;
    if (score >= 50) { branchHits[2]++; lineHits[3]++; return "Pass"; }
    branchHits[3]++; lineHits[4]++; return "Fail";
}

Console.WriteLine(Grade(95) + " " + Grade(70));
int lines = lineHits.Count(h => h > 0), branches = branchHits.Count(h => h > 0);
Console.WriteLine($"lines {lines}/{lineHits.Length}, branches {branches}/{branchHits.Length}");   // 4/5, 3/4
Console.WriteLine("Untested: the Fail path");` }],
    codeTitle: ['Custom analyzer', 'Coverage counters'],
    viz: {
      title: 'Line coverage vs branch coverage on the same tests',
      gen: function () {
        return codeFrames(T7_CODE, [
          { l: 8, narr: 'Two tests: ' + C('Grade(95)') + ' and ' + C('Grade(70)') + '. The instrumented build counts hits per line and per branch outcome.', v: { 'lines covered': '0/3', 'branches covered': '0/6' } },
          { l: [3, 4], narr: 'Grade(95): line 3 runs (score ≥ 0, so the throw branch is <b>not</b> taken), line 4 runs and returns "A".', v: { 'lines covered': '2/3', 'branches covered': '2/6' }, hv: { 'lines covered': 'ok' } },
          { l: [3, 4, 5], narr: 'Grade(70): lines 3, 4, 5 run; the ternary takes its <b>true</b> side ("Pass").', v: { 'lines covered': '3/3', 'branches covered': '4/6' }, hv: { 'lines covered': 'ok', 'branches covered': 'ok' } },
          { l: 5, cls: 'bad', narr: 'Line 5 shows as <b>covered</b> even though the "Fail" outcome never ran — line coverage cannot see inside one line.', v: { 'lines covered': '3/3', 'branches covered': '4/6' }, hv: { 'branches covered': 'bad' } },
          { l: 3, cls: 'bad', narr: 'The throw for negative scores never ran either, yet line 3 counts as covered. Line coverage says 100%; branch coverage reports 4/6: missing "score &lt; 0 true" and "score &gt;= 50 false".', v: { 'lines covered': '3/3 (100%)', 'branches covered': '4/6 (66.7%)' }, extra: [{ type: 'table', label: 'Tests to add', columns: ['input', 'covers'], rows: [['Grade(-1)', 'throw branch'], ['Grade(10)', 'Fail branch']] }] },
          { l: [3, 4, 5], cls: 'ok', narr: 'With Grade(-1) and Grade(10) added: 3/3 lines, 6/6 branches. Still, coverage only proves code <b>ran</b>; the assertions decide whether the tests are any good.', v: { 'lines covered': '3/3', 'branches covered': '6/6' }, hv: { 'lines covered': 'ok', 'branches covered': 'ok' } }
        ]);
      }
    },
    examples: [
      { title: 'Failing CI on coverage thresholds', html: `<p>Coverlet's MSBuild integration can fail the build under a threshold; many teams prefer a "no decrease" rule or diff coverage in PRs instead of a global number.</p>`, code: fw(`
dotnet test /p:CollectCoverage=true /p:CoverletOutputFormat=cobertura /p:Threshold=80 /p:ThresholdType=line
reportgenerator -reports:**/coverage.cobertura.xml -targetdir:coverage-report -reporttypes:Html`, null, 'bash') },
      { title: 'Excluding code from coverage honestly', html: `<p>${C('[ExcludeFromCodeCoverage]')} on generated code, DTOs or ${C('Program')} bootstrapping keeps reports meaningful. Using it to hide untested logic just moves the problem.</p>`, code: fw(`
[ExcludeFromCodeCoverage(Justification = "Composition root; covered by integration tests")]
public partial class Program { }`) },
      { title: 'Respecting an analyzer in plain C#', html: `<p>CA1822 suggests ${C('static')} for members that do not use instance state; CA1305 asks for an explicit culture. Both fixes are shown — the code compiles and runs identically.</p>`, code: { lang: 'csharp', run: true, code: `
using System.Globalization;

Console.WriteLine(Formatter.Price(1234.5m));   // 1,234.50 regardless of machine culture

static class Formatter
{
    public static string Price(decimal value) => value.ToString("N2", CultureInfo.InvariantCulture);   // CA1305 satisfied
}` } }
    ],
    deepDive: `<p><b>Analyzer mechanics.</b> A ${C('DiagnosticAnalyzer')} registers callbacks (syntax node, symbol, operation, compilation end) and runs concurrently inside csc; a ${C('CodeFixProvider')} offers edits in the IDE and ${C('dotnet format analyzers')}. Analyzer packages put DLLs under ${C('analyzers/dotnet/cs')} in the nupkg and are referenced with ${C('PrivateAssets="all"')} so they do not flow to consumers. Severity resolution: ${C('#pragma')}/${C('SuppressMessage')} for a location, then ${C('dotnet_diagnostic.ID.severity')}, then category, then the global ${C('dotnet_analyzer_diagnostic.severity')}, then the rule's default (driven by ${C('AnalysisLevel')}/${C('AnalysisMode')}). ${C('NoWarn')} removes a warning; ${C('TreatWarningsAsErrors')} promotes all remaining warnings. Expensive analyzers slow builds — measure with ${C('-p:ReportAnalyzer=true')} and a binlog.</p>
<p><b>Coverage mechanics.</b> Coverlet rewrites IL after build: each sequence point (from the PDB) gets a hit-counter slot; branches are IL conditional jumps, including compiler-generated ones (async state machines and iterators create branches you never wrote, which is why some tools filter them). Multiple test projects produce separate reports — merge them (ReportGenerator, or Coverlet's ${C('MergeWith')}). Coverage of 70–85% on business logic is typical for healthy code; chasing 100% invites tests without assertions.</p>
<p><b>Mutation testing</b> (Stryker.NET) flips operators, removes statements and changes constants, reruns tests, and reports how many mutants survived — the real measure of whether tests check behaviour.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI review bots now flag many issues analyzers used to own, and assistants write custom analyzers plus code fixes from a description. <b>Use AI as a partner:</b> generate tests for uncovered branches straight from the coverage report, then review each assertion. <b>Where AI goes wrong:</b> it "fixes" warnings with blanket ${C('#pragma warning disable')} or ${C('NoWarn')}, writes coverage-padding tests with no meaningful asserts, and suggests severities in the wrong .editorconfig section. <b>What you must still own:</b> the rule set your team enforces, the justification for each suppression, and whether new tests would fail if the code were wrong.</p>`,
    problems: [{
      title: 'Compute Line and Branch Coverage',
      level: 'Easy', tags: ['coverage', 'counting', 'formatting'], companies: ['Microsoft', 'SonarSource', 'Atlassian'],
      statement: `<p>${C('lineHits[i]')} is the hit count of line i, or -1 if the line is not executable (blank, brace, comment). ${C('branchHits[j]')} is the hit count of branch outcome j. Return ${C('"lines c/t (p%), branches c/t (p%)"')} where c = entries with hits &gt; 0, t = executable entries, p = percentage with one decimal (invariant culture), or ${C('n/a')} when t = 0.</p>`,
      constraints: `Up to 10<sup>6</sup> entries; hit counts up to 2<sup>31</sup> − 1.`,
      example: `<p>${C('[1, 0, -1, 5, 2]')}, ${C('[1, 0]')} → ${H.c('g', '"lines 3/4 (75.0%), branches 1/2 (50.0%)"')}.</p>`,
      brute: { why: `<p>Summing hit counts instead of counting non-zero entries gives nonsense (and overflows int for hot lines). Coverage asks "was it hit at least once?", so count entries &gt; 0 and use long math only if you need totals.</p>`, code: `
static class SumHits
{
    public static int Wrong(int[] hits) => hits.Where(h => h >= 0).Sum();   // a hit total, not coverage; can overflow
}` },
      mcq: { q: 'A method has 100% line coverage. Which statement is true?', options: ['Every line ran at least once, but some branch outcomes may never have run', 'Every branch outcome ran', 'The method has no bugs', 'Mutation testing would kill every mutant'], answer: 0, explain: 'One line can contain several outcomes (ternaries, &&, ||). Branch coverage and good assertions are separate questions.' },
      hints: [`<p>Hint 1: write one helper ${C('(int covered, int total) Count(int[] hits)')} and use it for both arrays; skip -1 entries in the line array.</p>`, `<p>Hint 2: percentage = 100.0 × covered / total, formatted with ${C('ToString("F1", CultureInfo.InvariantCulture)')} so a German machine does not print "75,0".</p>`, `<p>Hint 3: guard total = 0 → ${C('"n/a"')} before dividing.</p>`],
      tests: { sig: 'int[] int[] -> string', fn: 'coverage', cases: [
        [[[1, 0, -1, 5, 2], [1, 0]], 'lines 3/4 (75.0%), branches 1/2 (50.0%)'],
        [[[], []], 'lines 0/0 (n/a), branches 0/0 (n/a)'],
        [[[-1, -1], [3, 3]], 'lines 0/0 (n/a), branches 2/2 (100.0%)'],
        [[[0, 0, 0], []], 'lines 0/3 (0.0%), branches 0/0 (n/a)'],
        [[[1, 1, 0], [0, 0, 1]], 'lines 2/3 (66.7%), branches 1/3 (33.3%)'],
        [[[2147483647, 1], [0]], 'lines 2/2 (100.0%), branches 0/1 (0.0%)'],
        [[[1, 0, 0, 0, 0, 0, 0, 0], [1, 1, 1, 1, 1, 1, 0]], 'lines 1/8 (12.5%), branches 6/7 (85.7%)']
      ] },
      solution: {
        approach: `<p>Coverage is a ratio of <b>entries hit at least once</b> to <b>entries that could be hit</b>. Count both in one pass per array, then format carefully.</p>`,
        code: `
using System.Globalization;

public class Solution
{
    static (int Covered, int Total) Count(int[] hits)
    {
        int covered = 0, total = 0;
        foreach (int h in hits)
        {
            if (h < 0) continue;             // not executable
            total++;
            if (h > 0) covered++;
        }
        return (covered, total);
    }

    static string Pct((int Covered, int Total) c)
        => c.Total == 0 ? "n/a" : (100.0 * c.Covered / c.Total).ToString("F1", CultureInfo.InvariantCulture) + "%";

    public static string Coverage(int[] lineHits, int[] branchHits)
    {
        var l = Count(lineHits);
        var b = Count(branchHits);
        return $"lines {l.Covered}/{l.Total} ({Pct(l)}), branches {b.Covered}/{b.Total} ({Pct(b)})";
    }
}`,
        dry: { head: ['array', 'executable', 'hit', 'text'], rows: [['lines [1,0,-1,5,2]', '4 (skip -1)', '3', '75.0%'], ['branches [1,0]', '2', '1', '50.0%']] },
        complexity: `<p>O(n) time, O(1) space.</p>`,
        followUps: ['Merge two runs before computing coverage (sum hits per entry).', 'Report uncovered line ranges like "3-5, 9".']
      }
    }]
  });

  /* ======================================================================
     PRACTICE — Easy
     ====================================================================== */
  practice.push({
    title: 'Theory Display Names',
    level: 'Easy', tags: ['xUnit', 'theories', 'string formatting'], companies: ['Microsoft', 'Infosys', 'EPAM'],
    statement: `<p>xUnit shows each theory case as ${C('Method(a: 1, b: 2)')}. Given the method name, its parameter names and the data rows (comma-separated values), return one display name per row. A value that parses as an int is shown as that number; ${C('null')} stays ${C('null')}; anything else is shown in double quotes. If a row has the wrong number of values, return ${C('"Method: wrong argument count (expected E, got G)"')} for it.</p>`,
    constraints: `Up to 1000 rows; values contain no commas.`,
    example: `<p>${C('"Add"')}, ${C('["a", "b", "sum"]')}, ${C('["1,2,3"]')} → ${H.c('g', '["Add(a: 1, b: 2, sum: 3)"]')}.</p>`,
    brute: { why: `<p>Concatenating strings with ${C('+')} in nested loops allocates a new string per piece; ${C('string.Join')} over a projected sequence builds each name once and reads better.</p>`, code: `
static class ConcatNames
{
    public static string Name(string method, string[] names, string[] values)
    {
        string s = method + "(";
        for (int i = 0; i < names.Length; i++) s = s + names[i] + ": " + values[i] + (i + 1 < names.Length ? ", " : "");
        return s + ")";
    }
}` },
    mcq: { q: 'Why do readable theory display names matter?', options: ['A failing case is identified in the test report without re-running it in a debugger', 'They make the theory run faster', 'xUnit requires them to discover cases', 'They change the order of execution'], answer: 0, explain: 'When "Add(a: -1, b: 1, sum: 0)" fails, the report already tells you which data row broke.' },
    hints: [`<p>Hint 1: split each row with ${C('row.Split(\',\')')} and compare its length with the parameter count first.</p>`, `<p>Hint 2: format one value with ${C('int.TryParse')} → number text; ${C('"null"')} → null; else wrap in quotes.</p>`, `<p>Hint 3: ${C('string.Join(", ", names.Select((n, i) => $"{n}: {Fmt(vals[i])}"))')} builds the argument list.</p>`],
    tests: { sig: 'string string[] string[] -> string[]', fn: 'displayNames', cases: [
      [['Add', ['a', 'b', 'sum'], ['1,2,3', '-1,1,0']], ['Add(a: 1, b: 2, sum: 3)', 'Add(a: -1, b: 1, sum: 0)']],
      [['IsEmail', ['input', 'ok'], ['a@b.com,1']], ['IsEmail(input: "a@b.com", ok: 1)']],
      [['M', ['x'], []], []],
      [['M', ['x'], ['null']], ['M(x: null)']],
      [['M', ['x', 'y'], ['1']], ['M: wrong argument count (expected 2, got 1)']],
      [['Parse', ['s'], ['007', 'abc']], ['Parse(s: 7)', 'Parse(s: "abc")']],
      [['T', ['a', 'b'], ['1,2', '3,4,5']], ['T(a: 1, b: 2)', 'T: wrong argument count (expected 2, got 3)']]
    ] },
    solution: {
      approach: `<p>Validate the row length, format each value by its kind, and join ${C('name: value')} pairs.</p>`,
      code: `
public class Solution
{
    static string Fmt(string v) => int.TryParse(v, out int n) ? n.ToString() : v == "null" ? "null" : "\\"" + v + "\\"";

    public static string[] DisplayNames(string method, string[] names, string[] rows)
    {
        var result = new List<string>();
        foreach (string row in rows)
        {
            string[] vals = row.Split(',');
            if (vals.Length != names.Length)
            {
                result.Add($"{method}: wrong argument count (expected {names.Length}, got {vals.Length})");
                continue;
            }
            result.Add(method + "(" + string.Join(", ", names.Select((n, i) => n + ": " + Fmt(vals[i]))) + ")");
        }
        return result.ToArray();
    }
}`,
      dry: { head: ['row', 'values', 'display name'], rows: [['007', '[007] → int 7', 'Parse(s: 7)'], ['abc', '[abc] → text', 'Parse(s: "abc")']] },
      complexity: `<p>O(total characters).</p>`
    }
  });

  practice.push({
    title: 'Stub Returning a Sequence (NSubstitute Returns)',
    level: 'Easy', tags: ['stubs', 'NSubstitute', 'arrays'], companies: ['Microsoft', 'Wipro', 'Zalando'],
    statement: `<p>NSubstitute's ${C('sub.Next().Returns(1, 2, 3)')} returns the values in order on successive calls, and keeps returning the <b>last</b> value after that. Write a stub class with a ${C('Next()')} method that behaves like this, call it ${C('calls')} times and return the results. With no configured values it returns ${C('0')} (the default for int).</p>`,
    constraints: `0 ≤ values ≤ 1000; 0 ≤ calls ≤ 10<sup>5</sup>.`,
    example: `<p>${C('[1, 2, 3]')}, 5 calls → ${H.c('g', '[1, 2, 3, 3, 3]')}.</p>`,
    brute: { why: `<p>Copying the remaining values into a new queue on every call (or removing the first list element, O(n)) makes n calls O(n²). Keep an index that stops at the last element.</p>`, code: `
static class ShiftingStub
{
    public static int Next(List<int> values)
    {
        if (values.Count == 0) return 0;
        int v = values[0];
        if (values.Count > 1) values.RemoveAt(0);   // O(n) shift every call
        return v;
    }
}` },
    mcq: { q: 'When is a stub (canned answers) the right double, rather than a mock?', options: ['When the dependency answers a query and the test asserts on what the code does with the answer', 'When you must check a command was sent exactly once', 'When the dependency is a value object', 'Never — mocks are always better'], answer: 0, explain: 'Stubs feed inputs; mocks check outgoing interactions. A retry test, for example, stubs "fail, fail, succeed" and asserts on the result.' },
    hints: [`<p>Hint 1: store the values in an array and an index ${C('_i')}.</p>`, `<p>Hint 2: return ${C('values[_i]')} and advance ${C('_i')} only while it is below the last index.</p>`, `<p>Hint 3: handle an empty array first: always return 0.</p>`],
    tests: { sig: 'int[] int -> int[]', fn: 'returnsSequence', cases: [
      [[[1, 2, 3], 5], [1, 2, 3, 3, 3]],
      [[[], 3], [0, 0, 0]],
      [[[7], 2], [7, 7]],
      [[[1, 2], 0], []],
      [[[-1, 0, 5], 3], [-1, 0, 5]],
      [[[4, 9], 4], [4, 9, 9, 9]]
    ] },
    solution: {
      approach: `<p>An index into the configured values that sticks at the last one models the "last value repeats" rule in O(1) per call.</p>`,
      code: `
public sealed class SequenceStub(int[] values)
{
    private int _i;
    public int Next()
    {
        if (values.Length == 0) return 0;
        int v = values[_i];
        if (_i < values.Length - 1) _i++;
        return v;
    }
}

public class Solution
{
    public static int[] ReturnsSequence(int[] values, int calls)
    {
        var stub = new SequenceStub(values);
        var result = new int[calls];
        for (int c = 0; c < calls; c++) result[c] = stub.Next();
        return result;
    }
}`,
      dry: { head: ['call', '_i before', 'returned', '_i after'], rows: [['1', '0', '4', '1'], ['2', '1', '9', '1 (last)'], ['3', '1', '9', '1']] },
      complexity: `<p>O(calls) time, O(1) extra space per stub.</p>`
    }
  });

  practice.push({
    title: 'Collection Assert: First Mismatch Message',
    level: 'Easy', tags: ['assertions', 'arrays', 'messages'], companies: ['Microsoft', 'TCS', 'SAP'],
    statement: `<p>Write the message a good ${C('Assert.Equal(expected, actual)')} for int arrays would produce: ${C('"equal"')} if they match; otherwise the first index where they differ, ${C('"index i: expected e but was a"')}; if one is a prefix of the other, ${C('"length: expected n but was m"')}.</p>`,
    constraints: `Arrays up to 10<sup>6</sup> elements.`,
    example: `<p>${C('[1, 2, 3]')} vs ${C('[1, 2, 4]')} → ${H.c('g', '"index 2: expected 3 but was 4"')}; ${C('[1, 2, 3]')} vs ${C('[1, 2]')} → ${H.c('g', '"length: expected 3 but was 2"')}.</p>`,
    brute: { why: `<p>${C('string.Join(",", expected) == string.Join(",", actual)')} tells you only <i>whether</i> they differ, allocates two big strings, and gives a useless failure message. Walk both arrays once and stop at the first difference.</p>`, code: `
static class JoinCompare
{
    public static bool Same(int[] e, int[] a) => string.Join(",", e) == string.Join(",", a);
}` },
    mcq: { q: 'Why should Assert.Equal take the expected value first?', options: ['So the failure message labels "expected" and "actual" correctly', 'It is faster', 'The compiler requires it', 'It changes how equality is computed'], answer: 0, explain: 'Swapped arguments still fail correctly but print a misleading message; xunit.analyzers warns (xUnit2000) when a constant is passed as actual.' },
    hints: [`<p>Hint 1: loop to ${C('Math.Min(e.Length, a.Length)')} and return at the first differing index.</p>`, `<p>Hint 2: after the loop, compare the lengths.</p>`, `<p>Hint 3: two empty arrays are equal; an empty expected vs ${C('[5]')} is a length mismatch.</p>`],
    tests: { sig: 'int[] int[] -> string', fn: 'firstMismatch', cases: [
      [[[1, 2, 3], [1, 2, 4]], 'index 2: expected 3 but was 4'],
      [[[1, 2], [1, 2]], 'equal'],
      [[[], []], 'equal'],
      [[[1, 2, 3], [1, 2]], 'length: expected 3 but was 2'],
      [[[1], [2, 3]], 'index 0: expected 1 but was 2'],
      [[[], [5]], 'length: expected 0 but was 1'],
      [[[-5, 0], [-5, 0, 0]], 'length: expected 2 but was 3']
    ] },
    solution: {
      approach: `<p>Element-wise comparison over the shared prefix, then the length check — the same order xUnit uses so the most useful message wins.</p>`,
      code: `
public class Solution
{
    public static string FirstMismatch(int[] expected, int[] actual)
    {
        int n = Math.Min(expected.Length, actual.Length);
        for (int i = 0; i < n; i++)
            if (expected[i] != actual[i]) return $"index {i}: expected {expected[i]} but was {actual[i]}";
        return expected.Length == actual.Length ? "equal" : $"length: expected {expected.Length} but was {actual.Length}";
    }
}`,
      dry: { head: ['i', 'expected[i]', 'actual[i]', 'result'], rows: [['0', '1', '1', 'continue'], ['1', '2', '2', 'continue'], ['2', '3', '4', 'index 2: expected 3 but was 4']] },
      complexity: `<p>O(min(n, m)) time, O(1) space.</p>`
    }
  });

  /* ======================================================================
     PRACTICE — Medium
     ====================================================================== */
  practice.push({
    title: 'Evaluate a dotnet test --filter Expression',
    level: 'Medium', tags: ['parsing', 'dotnet test', 'boolean logic'], companies: ['Microsoft', 'GitHub', 'Thoughtworks'],
    statement: `<p>Each test is ${C('"FullyQualifiedName Key=Value Key=Value"')}. Properties: ${C('FullyQualifiedName')}, ${C('Name')} (the part after the last dot) and the traits. A filter is terms ${C('Prop=V')}, ${C('Prop!=V')}, ${C('Prop~V')} (contains), ${C('Prop!~V')} (does not contain), joined by ${C('&')} and ${C('|')}; in this exercise ${C('&')} binds tighter than ${C('|')} and there are no parentheses. Property names and values compare case-insensitively. A missing property makes ${C('=')} and ${C('~')} false and ${C('!=')} and ${C('!~')} true. Return the fully qualified names of matching tests in input order.</p>`,
    constraints: `Up to 10<sup>4</sup> tests and 50 terms.`,
    example: `<p>${C('"Priority=1|Category=Integration&Name=Get"')} matches tests with priority 1, plus integration tests named Get.</p>`,
    brute: { why: `<p>Re-parsing the filter string for every test repeats the same work 10<sup>4</sup> times. Parse once into an OR-of-ANDs list of terms, then evaluate each test with a property dictionary.</p>`, code: `
static class ReparseEachTime
{
    public static bool Match(string filter, Dictionary<string, string> props)
        => filter.Split('|').Any(g => g.Split('&').All(t => t.Contains('=') && props.GetValueOrDefault(t.Split('=')[0]) == t.Split('=')[1]));   // only '=' handled
}` },
    mcq: { q: 'Which command runs only the unit tests of classes whose names contain "Cart"?', options: ['dotnet test --filter "Category=Unit&amp;FullyQualifiedName~Cart"', 'dotnet test --only Cart', 'dotnet test -t Unit Cart', 'dotnet test Cart --category Unit'], answer: 0, explain: 'Trait filters and FullyQualifiedName~ (contains) combine with &amp;.' },
    hints: [`<p>Hint 1: split the filter on ${C('|')} into groups, each group on ${C('&')} into terms; parse each term into (prop, op, value) by finding the first ${C('!')}, ${C('=')} or ${C('~')}.</p>`, `<p>Hint 2: build a case-insensitive ${C('Dictionary')} per test: FullyQualifiedName, Name, then every trait.</p>`, `<p>Hint 3: a test matches if ANY group has ALL terms true; use ${C('Contains(v, StringComparison.OrdinalIgnoreCase)')} for ~.</p>`],
    tests: { sig: 'string string[] -> string[]', fn: 'matches', cases: [
      [['Category=Unit', ['Shop.CartTests.Add Category=Unit Priority=1', 'Shop.CartTests.Remove Category=Unit Priority=2', 'Shop.ApiTests.Get Category=Integration', 'Shop.MathTests.Div']], ['Shop.CartTests.Add', 'Shop.CartTests.Remove']],
      [['Category!=Unit', ['Shop.CartTests.Add Category=Unit Priority=1', 'Shop.CartTests.Remove Category=Unit Priority=2', 'Shop.ApiTests.Get Category=Integration', 'Shop.MathTests.Div']], ['Shop.ApiTests.Get', 'Shop.MathTests.Div']],
      [['FullyQualifiedName~CartTests&Priority=2', ['Shop.CartTests.Add Category=Unit Priority=1', 'Shop.CartTests.Remove Category=Unit Priority=2', 'Shop.ApiTests.Get Category=Integration', 'Shop.MathTests.Div']], ['Shop.CartTests.Remove']],
      [['Category=Integration|Name=Div', ['Shop.CartTests.Add Category=Unit Priority=1', 'Shop.CartTests.Remove Category=Unit Priority=2', 'Shop.ApiTests.Get Category=Integration', 'Shop.MathTests.Div']], ['Shop.ApiTests.Get', 'Shop.MathTests.Div']],
      [['Priority=1|Category=Integration&Name=Get', ['Shop.CartTests.Add Category=Unit Priority=1', 'Shop.CartTests.Remove Category=Unit Priority=2', 'Shop.ApiTests.Get Category=Integration', 'Shop.MathTests.Div']], ['Shop.CartTests.Add', 'Shop.ApiTests.Get']],
      [['FullyQualifiedName!~Shop', ['Shop.CartTests.Add Category=Unit Priority=1', 'Shop.MathTests.Div']], []],
      [['category=unit&priority!=1', ['Shop.CartTests.Add Category=Unit Priority=1', 'Shop.CartTests.Remove Category=Unit Priority=2', 'Shop.ApiTests.Get Category=Integration', 'Shop.MathTests.Div']], ['Shop.CartTests.Remove']],
      [['Name=Add', []], []]
    ] },
    solution: {
      approach: `<p>Parse once into disjunctive normal form (OR of AND groups), then evaluate each test against a property map. This mirrors how VSTest turns the filter into a condition tree.</p>`,
      code: `
public class Solution
{
    record Term(string Prop, string Op, string Value);

    static Term ParseTerm(string t)
    {
        int i = t.IndexOfAny(['!', '=', '~']);
        string op = t[i] == '!' ? t.Substring(i, 2) : t[i].ToString();
        return new Term(t[..i], op, t[(i + op.Length)..]);
    }

    static bool Eval(Term t, Dictionary<string, string> props)
    {
        bool has = props.TryGetValue(t.Prop, out string? v);
        bool eq = has && string.Equals(v, t.Value, StringComparison.OrdinalIgnoreCase);
        bool contains = has && v!.Contains(t.Value, StringComparison.OrdinalIgnoreCase);
        return t.Op switch { "=" => eq, "!=" => !eq, "~" => contains, "!~" => !contains, _ => false };
    }

    public static string[] Matches(string filter, string[] tests)
    {
        List<List<Term>> groups = filter.Split('|').Select(g => g.Split('&').Select(ParseTerm).ToList()).ToList();
        var result = new List<string>();
        foreach (string test in tests)
        {
            string[] parts = test.Split(' ');
            var props = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                ["FullyQualifiedName"] = parts[0],
                ["Name"] = parts[0][(parts[0].LastIndexOf('.') + 1)..]
            };
            foreach (string trait in parts.Skip(1)) { var kv = trait.Split('=', 2); props[kv[0]] = kv[1]; }
            if (groups.Any(g => g.All(t => Eval(t, props)))) result.Add(parts[0]);
        }
        return result.ToArray();
    }
}`,
      dry: { head: ['test', 'Priority=1', 'Category=Integration &amp; Name=Get', 'match'], rows: [['CartTests.Add', 'true', '—', 'yes'], ['CartTests.Remove', 'false', 'false', 'no'], ['ApiTests.Get', 'false (missing)', 'true &amp; true', 'yes'], ['MathTests.Div', 'false', 'false', 'no']] },
      complexity: `<p>O(filter) to parse, then O(tests × terms).</p>`
    }
  });

  practice.push({
    title: 'Compare Semantic Versions with Prerelease Labels',
    level: 'Medium', tags: ['SemVer', 'comparators', 'parsing'], companies: ['Microsoft', 'npm', 'JetBrains'],
    statement: `<p>Return -1, 0 or 1 comparing two SemVer 2.0 versions ${C('MAJOR.MINOR.PATCH[-pre][+build]')}: compare the three numbers numerically; a version with a prerelease is lower than the same version without one; prerelease identifiers (dot-separated) compare left to right — numeric ones numerically, alphanumeric ones ordinally, numeric &lt; alphanumeric, and if all shared identifiers are equal the shorter list is lower. Build metadata is ignored.</p>`,
    constraints: `Numbers fit in int; identifiers are non-empty.`,
    example: `<p>${C('1.0.0-alpha')} &lt; ${C('1.0.0-alpha.1')} &lt; ${C('1.0.0-alpha.beta')} &lt; ${C('1.0.0-beta')} &lt; ${C('1.0.0-rc.2')} &lt; ${C('1.0.0-rc.10')} &lt; ${C('1.0.0')}.</p>`,
    brute: { why: `<p>${C('string.Compare')} on the whole version gets ${C('1.10.0')} vs ${C('1.9.0')} and ${C('rc.10')} vs ${C('rc.2')} wrong, and ${C('System.Version.Parse')} throws on a prerelease label. The rules need a small hand-written comparer.</p>`, code: `
static class OrdinalVersions
{
    public static int Compare(string a, string b) => Math.Sign(string.CompareOrdinal(a, b));   // wrong for 1.10 vs 1.9
}` },
    mcq: { q: 'With the range "[1.0.0, 2.0.0)", will NuGet pick 1.5.0-beta if a stable 1.5.0 also exists?', options: ['No — prereleases are only considered when the range itself includes a prerelease bound', 'Yes — it is lower, so lowest-applicable picks it', 'Yes — prereleases are always preferred', 'It fails with NU1107'], answer: 0, explain: 'Stable ranges exclude prerelease versions; you opt in by writing a prerelease bound such as 1.5.0-beta.' },
    hints: [`<p>Hint 1: drop everything after ${C('+')}; split the rest at the first ${C('-')} into core and prerelease.</p>`, `<p>Hint 2: compare core parts with ${C('int.Parse')}; then handle "no prerelease beats prerelease".</p>`, `<p>Hint 3: for identifiers use ${C('int.TryParse')} on both; numeric vs text → numeric is lower; text vs text → ${C('string.CompareOrdinal')}; finally compare list lengths.</p>`],
    tests: { sig: 'string string -> int', fn: 'compare', cases: [
      [['1.0.0', '1.0.0'], 0],
      [['1.0.0-alpha', '1.0.0'], -1],
      [['1.10.0', '1.9.9'], 1],
      [['1.0.0-alpha.1', '1.0.0-alpha.beta'], -1],
      [['1.0.0-rc.10', '1.0.0-rc.2'], 1],
      [['1.0.0+build.5', '1.0.0+build.9'], 0],
      [['2.0.0-beta', '2.0.0-alpha.1'], 1],
      [['1.0.0-alpha', '1.0.0-alpha.1'], -1],
      [['0.9.9', '1.0.0-alpha'], -1]
    ] },
    solution: {
      approach: `<p>Normalise (strip build metadata), compare the numeric core, then apply the prerelease rules identifier by identifier.</p>`,
      code: `
public class Solution
{
    public static int Compare(string a, string b)
    {
        (int[] core, string[]? pre) Parse(string v)
        {
            int plus = v.IndexOf('+');
            if (plus >= 0) v = v[..plus];
            int dash = v.IndexOf('-');
            string core = dash >= 0 ? v[..dash] : v;
            string[]? pre = dash >= 0 ? v[(dash + 1)..].Split('.') : null;
            return (core.Split('.').Select(int.Parse).ToArray(), pre);
        }

        var (ca, pa) = Parse(a);
        var (cb, pb) = Parse(b);
        for (int i = 0; i < 3; i++)
            if (ca[i] != cb[i]) return ca[i] < cb[i] ? -1 : 1;
        if (pa is null || pb is null) return pa is null && pb is null ? 0 : pa is null ? 1 : -1;

        for (int i = 0; i < Math.Min(pa.Length, pb.Length); i++)
        {
            bool na = int.TryParse(pa[i], out int x), nb = int.TryParse(pb[i], out int y);
            int c = na && nb ? x.CompareTo(y) : na ? -1 : nb ? 1 : string.CompareOrdinal(pa[i], pb[i]);
            if (c != 0) return Math.Sign(c);
        }
        return Math.Sign(pa.Length.CompareTo(pb.Length));
    }
}`,
      dry: { head: ['a', 'b', 'deciding step', 'result'], rows: [['1.0.0-rc.10', '1.0.0-rc.2', 'rc = rc; 10 &gt; 2 numerically', '1'], ['1.0.0-alpha.1', '1.0.0-alpha.beta', '1 numeric vs beta text', '-1'], ['0.9.9', '1.0.0-alpha', 'major 0 &lt; 1', '-1']] },
      complexity: `<p>O(length of the version strings).</p>`
    }
  });

  practice.push({
    title: 'Detect Flaky Tests Across CI Runs',
    level: 'Medium', tags: ['CI', 'hash maps', 'sorting'], companies: ['Microsoft', 'Uber', 'LinkedIn'],
    statement: `<p>Each run is ${C('"Test=P,Test=F,..."')} (P = passed, F = failed). A test is <b>flaky</b> if it both passed and failed across the runs (with no code change). Return ${C('"Name passed/total"')} for every flaky test, sorted by name (ordinal).</p>`,
    constraints: `Up to 10<sup>4</sup> runs and 10<sup>5</sup> results in total.`,
    example: `<p>${C('["A=P,B=P", "A=F,B=P", "A=P,B=P"]')} → ${H.c('g', '["A 2/3"]')}: B always passes and is not flaky.</p>`,
    brute: { why: `<p>For each distinct test, re-scanning all runs costs O(tests × results). One pass that accumulates (passed, total) per test in a dictionary is linear.</p>`, code: `
static class Rescan
{
    public static int Passes(string[] runs, string name)
        => runs.SelectMany(r => r.Split(',')).Count(x => x == name + "=P");   // full scan per test
}` },
    mcq: { q: 'What is the best first response to a test identified as flaky?', options: ['Quarantine it (run but do not block) and fix the root cause — shared state, time, ordering, async waits', 'Add automatic retries everywhere and move on', 'Delete it', 'Increase the CI machine size'], answer: 0, explain: 'Retries hide real race conditions; flakiness usually comes from shared state, real clocks, parallelism or missing awaits.' },
    hints: [`<p>Hint 1: ${C('Dictionary<string, (int Passed, int Total)>')}; split runs on ${C(',')} then ${C('=')}.</p>`, `<p>Hint 2: flaky ⇔ 0 &lt; passed &lt; total.</p>`, `<p>Hint 3: sort keys with ${C('StringComparer.Ordinal')} before formatting.</p>`],
    tests: { sig: 'string[] -> string[]', fn: 'flaky', cases: [
      [[['A=P,B=P', 'A=F,B=P', 'A=P,B=P']], ['A 2/3']],
      [[[]], []],
      [[['X=F', 'X=F']], []],
      [[['B=P,A=F', 'A=P,B=F']], ['A 1/2', 'B 1/2']],
      [[['A=P']], []],
      [[['Z=P,Y=P', 'Z=F', 'Y=P,Z=P']], ['Z 2/3']]
    ] },
    solution: {
      approach: `<p>Aggregate pass and total counts per test, keep those strictly between "always fails" and "always passes", and sort.</p>`,
      code: `
public class Solution
{
    public static string[] Flaky(string[] runs)
    {
        var stats = new Dictionary<string, (int Passed, int Total)>();
        foreach (string run in runs)
            foreach (string result in run.Split(',', StringSplitOptions.RemoveEmptyEntries))
            {
                string[] kv = result.Split('=');
                var (p, t) = stats.GetValueOrDefault(kv[0]);
                stats[kv[0]] = (p + (kv[1] == "P" ? 1 : 0), t + 1);
            }
        return stats.Where(s => s.Value.Passed > 0 && s.Value.Passed < s.Value.Total)
                    .OrderBy(s => s.Key, StringComparer.Ordinal)
                    .Select(s => $"{s.Key} {s.Value.Passed}/{s.Value.Total}")
                    .ToArray();
    }
}`,
      dry: { head: ['run', 'Z', 'Y'], rows: [['Z=P,Y=P', '1/1', '1/1'], ['Z=F', '1/2', '1/1'], ['Y=P,Z=P', '2/3 → flaky', '2/2 → stable']] },
      complexity: `<p>O(R + T log T) for R results and T distinct tests.</p>`
    }
  });

  practice.push({
    title: 'Central Package Management Resolver',
    level: 'Medium', tags: ['NuGet', 'CPM', 'dictionaries'], companies: ['Microsoft', 'Bloomberg', 'Shopify'],
    statement: `<p>With Central Package Management on, ${C('Directory.Packages.props')} lists ${C('"Name=Version"')} entries. A project's references are ${C('"Name"')} (use the central version), ${C('"Name@V"')} (${C('VersionOverride="V"')}) or ${C('"Name=V"')} (a ${C('Version')} attribute, which CPM forbids). For each reference in order return ${C('"Name V"')}, or ${C('"Name NU1008"')} for a Version attribute, or ${C('"Name NU1010"')} when a plain reference has no central version. Package ids are case-insensitive; print the name as the reference writes it.</p>`,
    constraints: `Up to 10<sup>4</sup> entries each.`,
    example: `<p>central ${C('["A=1.0", "B=2.0"]')}, refs ${C('["B", "C", "A@0.9"]')} → ${H.c('g', '["B 2.0", "C NU1010", "A 0.9"]')}.</p>`,
    brute: { why: `<p>Searching the central list linearly for each reference is O(refs × central) and easy to get wrong on case. A case-insensitive dictionary makes each lookup O(1) and mirrors NuGet's id rules.</p>`, code: `
static class LinearCentral
{
    public static string? Find(string[] central, string name)
        => central.Select(c => c.Split('=')).FirstOrDefault(p => p[0] == name)?[1];   // case-sensitive: wrong for NuGet ids
}` },
    mcq: { q: 'What is the main benefit of Central Package Management?', options: ['One place defines each package version for every project, so versions cannot drift', 'Packages download faster', 'It removes the need for restore', 'It makes all packages prerelease-safe'], answer: 0, explain: 'Directory.Packages.props keeps a solution consistent; VersionOverride makes exceptions explicit and reviewable.' },
    hints: [`<p>Hint 1: load central versions into ${C('Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)')}.</p>`, `<p>Hint 2: check ${C('@')} first (override), then ${C('=')} (forbidden Version attribute), else a plain name.</p>`, `<p>Hint 3: a plain name that is missing centrally → NU1010.</p>`],
    tests: { sig: 'string[] string[] -> string[]', fn: 'resolve', cases: [
      [[['Serilog=4.0.0', 'Moq=4.20.70'], ['Serilog', 'Moq']], ['Serilog 4.0.0', 'Moq 4.20.70']],
      [[['Serilog=4.0.0'], ['Polly']], ['Polly NU1010']],
      [[['Serilog=4.0.0'], ['Serilog@3.1.1']], ['Serilog 3.1.1']],
      [[['Serilog=4.0.0'], ['Serilog=4.0.0']], ['Serilog NU1008']],
      [[[], []], []],
      [[['xunit=2.9.0'], ['XUnit']], ['XUnit 2.9.0']],
      [[['A=1.0', 'B=2.0'], ['B', 'C', 'A@0.9']], ['B 2.0', 'C NU1010', 'A 0.9']]
    ] },
    solution: {
      approach: `<p>A case-insensitive map from package id to central version, then classify each reference by its syntax.</p>`,
      code: `
public class Solution
{
    public static string[] Resolve(string[] central, string[] references)
    {
        var versions = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (string c in central) { var kv = c.Split('=', 2); versions[kv[0]] = kv[1]; }

        var result = new List<string>();
        foreach (string r in references)
        {
            int at = r.IndexOf('@'), eq = r.IndexOf('=');
            if (at >= 0) result.Add(r[..at] + " " + r[(at + 1)..]);                  // VersionOverride
            else if (eq >= 0) result.Add(r[..eq] + " NU1008");                         // Version attribute under CPM
            else result.Add(r + " " + (versions.TryGetValue(r, out var v) ? v : "NU1010"));
        }
        return result.ToArray();
    }
}`,
      dry: { head: ['reference', 'kind', 'output'], rows: [['B', 'plain, central 2.0', 'B 2.0'], ['C', 'plain, missing', 'C NU1010'], ['A@0.9', 'VersionOverride', 'A 0.9']] },
      complexity: `<p>O(central + references).</p>`
    }
  });

  practice.push({
    title: 'Merge Coverage Runs and List Uncovered Ranges',
    level: 'Medium', tags: ['coverage', 'arrays', 'ranges'], companies: ['Microsoft', 'SonarSource', 'Grab'],
    statement: `<p>Each run is an array of per-line hit counts (-1 = not executable; all runs have the same length and the same -1 positions). Merge the runs by summing hits, then return the uncovered executable lines (1-based) as ranges of consecutive line numbers, e.g. ${C('"2-4,8"')}; a non-executable line ends a range. Return ${C('"all covered"')} if there are none.</p>`,
    constraints: `Up to 100 runs of up to 10<sup>5</sup> lines.`,
    example: `<p>${C('[[1,0,0],[0,1,0]]')} → merged ${C('[1,1,0]')} → ${H.c('g', '"3"')}.</p>`,
    brute: { why: `<p>Listing each uncovered line separately ("2,3,4,8") is hard to read in a report; and re-merging per line by scanning all runs is fine but storing the merged array once keeps the range pass simple.</p>`, code: `
static class LineList
{
    public static string Lines(int[] merged)
        => string.Join(",", merged.Select((h, i) => (h, i)).Where(x => x.h == 0).Select(x => x.i + 1));   // no ranges
}` },
    mcq: { q: 'Why merge coverage from unit and integration test runs?', options: ['Each suite covers different code; the union shows what no test touches', 'Merging doubles the percentage', 'Coverlet requires a single report', 'It removes branch coverage'], answer: 0, explain: 'Separate reports undercount; tools like ReportGenerator merge multiple cobertura files into one view.' },
    hints: [`<p>Hint 1: merged[i] = -1 if run 0 has -1, else the sum over runs (use long if counts can be huge).</p>`, `<p>Hint 2: scan with a start index; extend while the next line is uncovered, close the range otherwise.</p>`, `<p>Hint 3: print ${C('"a"')} for a one-line range and ${C('"a-b"')} otherwise.</p>`],
    tests: { sig: 'int[][] -> string', fn: 'uncoveredRanges', cases: [
      [[[[1, 0, 0, 0, 1, 1, 1, 0]]], '2-4,8'],
      [[[[1, 0, 0], [0, 1, 0]]], '3'],
      [[[[1, 1], [0, 0]]], 'all covered'],
      [[[[0, -1, 0, 0]]], '1,3-4'],
      [[[[0, 0, 0]]], '1-3'],
      [[[[-1, -1]]], 'all covered'],
      [[[[0, 5, 0], [0, 0, 0], [0, 0, 1]]], '1']
    ] },
    solution: {
      approach: `<p>Merge into one array, then run-length encode the uncovered lines.</p>`,
      code: `
public class Solution
{
    public static string UncoveredRanges(int[][] runs)
    {
        int n = runs[0].Length;
        var uncovered = new bool[n];
        for (int i = 0; i < n; i++)
        {
            if (runs[0][i] < 0) continue;
            long sum = 0;
            foreach (int[] run in runs) sum += run[i];
            uncovered[i] = sum == 0;
        }

        var ranges = new List<string>();
        for (int i = 0; i < n; i++)
        {
            if (!uncovered[i]) continue;
            int start = i;
            while (i + 1 < n && uncovered[i + 1]) i++;
            ranges.Add(start == i ? $"{start + 1}" : $"{start + 1}-{i + 1}");
        }
        return ranges.Count == 0 ? "all covered" : string.Join(",", ranges);
    }
}`,
      dry: { head: ['line', 'merged hits', 'uncovered?', 'ranges'], rows: [['1', '0', 'yes', 'open 1'], ['2', '-1', 'n/a', 'close → "1"'], ['3', '0', 'yes', 'open 3'], ['4', '0', 'yes', 'close → "3-4"']] },
      complexity: `<p>O(runs × lines) time, O(lines) space.</p>`
    }
  });

  /* ======================================================================
     PRACTICE — Hard
     ====================================================================== */
  practice.push({
    title: 'NuGet Restore: Nearest Wins, Cousins and NU1605',
    level: 'Hard', tags: ['graphs', 'BFS', 'NuGet'], companies: ['Microsoft', 'GitHub', 'Amazon'],
    statement: `<p>A simplified restore. Edges are ${C('"Parent>Child@ver"')}: Parent (${C('Project')} or a package id) requires at least version ver of Child; each package has one node regardless of version. Only nodes reachable from ${C('Project')} count. For each package let d be its shortest distance from Project; its version is the <b>highest</b> of the versions required by edges from parents at distance d − 1 (nearest wins; among cousins at the same depth, the lowest version satisfying all is the highest minimum). If any reachable edge into the package requires a higher version than chosen, report a downgrade. Return ${C('"Name ver"')} for every package sorted by name (ordinal), then ${C('"NU1605 Name"')} lines sorted by name. Print versions as written in the winning edge.</p>`,
    constraints: `Up to 10<sup>4</sup> edges; versions are 2–4 numeric parts and use a consistent format per package.`,
    example: `<p>${C('["Project>A@1.0", "Project>C@1.0", "A>C@2.0"]')} → ${H.c('g', '["A 1.0", "C 1.0", "NU1605 C"]')}: the direct reference to C (depth 1) wins over A's requirement at depth 2, which is a downgrade.</p>`,
    brute: { why: `<p>Enumerating every path from Project to compute depths is exponential on diamond-shaped graphs. One BFS gives each node's shortest depth in O(V + E); a second pass over the edges picks versions and detects downgrades.</p>`, code: `
static class AllPaths
{
    public static void Walk(Dictionary<string, List<string>> g, string node, int depth, Dictionary<string, int> best)
    {
        if (best.TryGetValue(node, out int d) && d <= depth) return;
        best[node] = depth;
        foreach (string c in g.GetValueOrDefault(node, [])) Walk(g, c, depth + 1, best);   // revisits nodes many times
    }
}` },
    mcq: { q: 'Your app references Json 12.0 directly; a library you use needs Json ≥ 13.0. What happens at restore?', options: ['Json 12.0 is chosen (direct wins) and NU1605 "detected package downgrade" is reported', 'Json 13.0 is silently chosen', 'Both versions are loaded side by side', 'Restore picks the newest Json available'], answer: 0, explain: 'The direct dependency wins; because that is below a transitive minimum, NuGet reports NU1605, which is an error by default in SDK projects.' },
    hints: [`<p>Hint 1: parse edges into an adjacency list ${C('Dictionary<string, List<(string Child, string Ver)>>')}; BFS from ${C('"Project"')} for depths.</p>`, `<p>Hint 2: for each reachable edge Parent → Child: if depth[Parent] + 1 == depth[Child] it is a "nearest" edge — keep the maximum version (compare with ${C('Version.Parse')}, keep the original string).</p>`, `<p>Hint 3: second pass over all reachable edges: any required version greater than the chosen one → add the child to a downgrade set. Sort both outputs ordinally.</p>`],
    tests: { sig: 'string[] -> string[]', fn: 'restore', cases: [
      [[['Project>A@1.0', 'Project>C@1.0', 'A>C@2.0']], ['A 1.0', 'C 1.0', 'NU1605 C']],
      [[['Project>A@1.0', 'Project>B@1.0', 'A>C@1.0', 'B>C@2.0']], ['A 1.0', 'B 1.0', 'C 2.0']],
      [[[]], []],
      [[['Project>A@1.0', 'A>B@1.0', 'B>C@3.0', 'Project>C@3.5']], ['A 1.0', 'B 1.0', 'C 3.5']],
      [[['X>Y@1.0', 'Project>A@2.0']], ['A 2.0']],
      [[['Project>A@1.0', 'A>B@2.0', 'Project>C@1.0', 'C>D@1.0', 'D>B@5.0']], ['A 1.0', 'B 2.0', 'C 1.0', 'D 1.0', 'NU1605 B']],
      [[['Project>A@1.0', 'A>B@1.9', 'Project>C@1.0', 'C>B@1.10']], ['A 1.0', 'B 1.10', 'C 1.0']]
    ] },
    solution: {
      approach: `<p>BFS for shortest depth, then "nearest edges" decide the version (max among cousins), then every other reachable edge is checked against the decision to flag downgrades.</p>`,
      code: `
public class Solution
{
    public static string[] Restore(string[] edges)
    {
        var adj = new Dictionary<string, List<(string Child, string Ver)>>();
        foreach (string e in edges)
        {
            int gt = e.IndexOf('>'), at = e.IndexOf('@');
            string parent = e[..gt], child = e[(gt + 1)..at], ver = e[(at + 1)..];
            if (!adj.TryGetValue(parent, out var list)) adj[parent] = list = [];
            list.Add((child, ver));
        }

        var depth = new Dictionary<string, int> { ["Project"] = 0 };
        var queue = new Queue<string>();
        queue.Enqueue("Project");
        while (queue.Count > 0)
        {
            string p = queue.Dequeue();
            foreach (var (child, _) in adj.GetValueOrDefault(p, []))
                if (depth.TryAdd(child, depth[p] + 1)) queue.Enqueue(child);
        }

        var chosen = new Dictionary<string, string>();
        foreach (var (parent, list) in adj)
        {
            if (!depth.TryGetValue(parent, out int dp)) continue;            // unreachable parent
            foreach (var (child, ver) in list)
                if (depth[child] == dp + 1 && (!chosen.TryGetValue(child, out var cur) || Version.Parse(ver) > Version.Parse(cur)))
                    chosen[child] = ver;
        }

        var downgrades = new SortedSet<string>(StringComparer.Ordinal);
        foreach (var (parent, list) in adj)
        {
            if (!depth.ContainsKey(parent)) continue;
            foreach (var (child, ver) in list)
                if (Version.Parse(ver) > Version.Parse(chosen[child])) downgrades.Add(child);
        }

        return chosen.OrderBy(kv => kv.Key, StringComparer.Ordinal).Select(kv => kv.Key + " " + kv.Value)
                     .Concat(downgrades.Select(d => "NU1605 " + d)).ToArray();
    }
}`,
      dry: { head: ['package', 'depth', 'nearest edges', 'chosen', 'deeper edge'], rows: [['A', '1', 'Project→A 1.0', '1.0', '—'], ['C', '1', 'Project→C 1.0', '1.0', '—'], ['D', '2', 'C→D 1.0', '1.0', '—'], ['B', '2', 'A→B 2.0', '2.0', 'D→B 5.0 &gt; 2.0 → NU1605']] },
      complexity: `<p>O(V + E) for BFS and the two edge passes, plus O(V log V) for sorting.</p>`,
      followUps: ['Add version ranges with upper bounds and report NU1107 when cousins cannot be satisfied together.', 'How does CentralPackageTransitivePinningEnabled change the result?']
    }
  });

  practice.push({
    title: 'Analyzer Severity Resolution and Build Result',
    level: 'Hard', tags: ['analyzers', '.editorconfig', 'precedence'], companies: ['Microsoft', 'JetBrains', 'Morgan Stanley'],
    statement: `<p>Config entries: ${C('"ID=sev"')} (one rule), ${C('"category-Cat=sev"')} (a category), ${C('"all=sev"')} (every analyzer rule); order does not matter — the most specific entry wins: ID, then category, then all, then the diagnostic's default severity. Diagnostics are ${C('"ID Category default"')}, one per reported occurrence. Severities: error, warning, suggestion, silent, none. After resolution: a <b>warning</b> whose ID is in ${C('noWarn')} disappears; otherwise, with ${C('warnAsError')} it becomes an error. Errors are never affected by noWarn. Return ${C('"FAILED errors=E warnings=W"')} if E &gt; 0, else ${C('"OK warnings=W"')}.</p>`,
    constraints: `Up to 10<sup>5</sup> diagnostics and 10<sup>3</sup> config entries.`,
    example: `<p>config ${C('["category-Performance=error", "CA1822=suggestion"]')}, diagnostics ${C('["CA1822 Performance warning", "CA1825 Performance suggestion"]')} → ${H.c('g', '"FAILED errors=1 warnings=0"')}: CA1822 is downgraded by its own entry, CA1825 is raised by the category.</p>`,
    brute: { why: `<p>Applying config lines in file order ("last one wins") gives the wrong answer: .editorconfig specificity, not order, decides between an ID entry and a category entry. Three dictionaries (by ID, by category, global) give an O(1) lookup in precedence order.</p>`, code: `
static class LastWins
{
    public static string Severity(string[] config, string id, string def)
    {
        string sev = def;
        foreach (string c in config) if (c.StartsWith(id + "=") || c.StartsWith("all=")) sev = c.Split('=')[1];   // order-based: wrong
        return sev;
    }
}` },
    mcq: { q: 'An .editorconfig sets the Performance category to error and CA1822 (a Performance rule) to suggestion. What is CA1822\'s severity?', options: ['suggestion — the rule-ID entry is more specific than the category entry', 'error — categories win', 'whichever line comes last', 'warning — its default'], answer: 0, explain: 'dotnet_diagnostic.ID.severity beats dotnet_analyzer_diagnostic.category-X.severity, which beats the all-rules setting.' },
    hints: [`<p>Hint 1: three lookups — ${C('byId')}, ${C('byCategory')} (case-insensitive) and a nullable ${C('all')}.</p>`, `<p>Hint 2: resolve = byId ?? byCategory ?? all ?? default; then only "warning" is affected by NoWarn and WarnAsError, in that order.</p>`, `<p>Hint 3: count errors and warnings per occurrence; suggestion, silent and none never affect the build.</p>`],
    tests: { sig: 'string[] string[] bool string[] -> string', fn: 'build', cases: [
      [[[], ['CA1822 Performance warning'], false, []], 'OK warnings=1'],
      [[[], ['CA1822 Performance warning'], true, []], 'FAILED errors=1 warnings=0'],
      [[['CA1822=none'], ['CA1822 Performance warning', 'CA2007 Reliability warning'], true, []], 'FAILED errors=1 warnings=0'],
      [[['category-Performance=error', 'CA1822=suggestion'], ['CA1822 Performance warning', 'CA1825 Performance suggestion'], false, []], 'FAILED errors=1 warnings=0'],
      [[['all=warning'], ['IDE0005 Style silent', 'CA1000 Design suggestion'], false, ['IDE0005']], 'OK warnings=1'],
      [[[], [], true, []], 'OK warnings=0'],
      [[['CA2000=error'], ['CA2000 Reliability warning', 'CA2000 Reliability warning'], false, ['CA2000']], 'FAILED errors=2 warnings=0'],
      [[['category-Design=warning', 'all=none'], ['CA1000 Design suggestion', 'CA1822 Performance warning'], false, []], 'OK warnings=1'],
      [[['all=error'], ['CA1822 Performance warning'], true, ['CA1822']], 'FAILED errors=1 warnings=0']
    ] },
    solution: {
      approach: `<p>Model the precedence chain explicitly, then apply the build-level switches to the resolved severity. Keeping "resolve" and "apply switches" separate makes each rule testable.</p>`,
      code: `
public class Solution
{
    public static string Build(string[] config, string[] diagnostics, bool warnAsError, string[] noWarn)
    {
        var byId = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        var byCategory = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        string? all = null;
        foreach (string c in config)
        {
            var kv = c.Split('=', 2);
            if (kv[0].Equals("all", StringComparison.OrdinalIgnoreCase)) all = kv[1];
            else if (kv[0].StartsWith("category-", StringComparison.OrdinalIgnoreCase)) byCategory[kv[0]["category-".Length..]] = kv[1];
            else byId[kv[0]] = kv[1];
        }
        var suppressed = new HashSet<string>(noWarn, StringComparer.OrdinalIgnoreCase);

        int errors = 0, warnings = 0;
        foreach (string d in diagnostics)
        {
            string[] p = d.Split(' ');
            string sev = byId.GetValueOrDefault(p[0]) ?? byCategory.GetValueOrDefault(p[1]) ?? all ?? p[2];
            if (sev == "warning")
            {
                if (suppressed.Contains(p[0])) continue;      // NoWarn removes the warning
                sev = warnAsError ? "error" : "warning";
            }
            if (sev == "error") errors++;
            else if (sev == "warning") warnings++;
        }
        return errors > 0 ? $"FAILED errors={errors} warnings={warnings}" : $"OK warnings={warnings}";
    }
}`,
      dry: { head: ['diagnostic', 'ID entry', 'category entry', 'all', 'resolved', 'after switches'], rows: [['CA1822 Performance', 'suggestion', 'error', '—', 'suggestion', 'ignored'], ['CA1825 Performance', '—', 'error', '—', 'error', 'error (1)']] },
      complexity: `<p>O(config + diagnostics) with O(1) dictionary lookups.</p>`,
      followUps: ['Add WarningsAsErrors (a list of IDs promoted individually).', 'Add #pragma suppressions for specific line numbers.']
    }
  });

  practice.push({
    title: 'MSBuild Target Execution Order',
    level: 'Hard', tags: ['MSBuild', 'DFS', 'graphs'], companies: ['Microsoft', 'Unity', 'Epic Games'],
    statement: `<p>Targets are ${C('"Name|DependsOn|BeforeTargets|AfterTargets"')} (comma lists, possibly empty). To build target T: if T already ran (or is running), do nothing; otherwise mark it, build each of its DependsOn targets in order, then build every target that lists T in its BeforeTargets (in declaration order), then <b>run T</b>, then build every target that lists T in its AfterTargets (in declaration order). Return the order in which targets run when building ${C('entry')}. All referenced names are defined; there are no DependsOn cycles.</p>`,
    constraints: `Up to 2000 targets.`,
    example: `<p>${C('["Build|Restore,Compile||", "Restore|||", "Compile|||", "Lint||Compile|", "Stamp|||Build"]')}, entry ${C('"Build"')} → ${H.c('g', '["Restore", "Lint", "Compile", "Build", "Stamp"]')}.</p>`,
    brute: { why: `<p>Re-scanning every target's BeforeTargets/AfterTargets list each time a target is built is O(T²) overall for large SDK target graphs. Pre-computing reverse maps (target → targets that hook before/after it) makes each step O(1) per hook.</p>`, code: `
static class ScanHooks
{
    public static IEnumerable<string> Before(string[][] targets, string name)
        => targets.Where(t => t[2].Split(',').Contains(name)).Select(t => t[0]);   // full scan per target
}` },
    mcq: { q: 'You need a custom step to run after compilation in every build. Which is the idiomatic hook?', options: ['&lt;Target Name="X" AfterTargets="Build"&gt; (or AfterTargets="CoreCompile")', 'Override the Build target in the .csproj', 'Edit Microsoft.Common.targets', 'Add a post-build .bat file to the solution'], answer: 0, explain: 'AfterTargets/BeforeTargets inject steps without redefining SDK targets; overriding Build breaks the SDK pipeline.' },
    hints: [`<p>Hint 1: parse into a record per target and build two reverse maps: ${C('beforeOf[T]')} = targets listing T in BeforeTargets, ${C('afterOf[T]')} likewise, both in declaration order.</p>`, `<p>Hint 2: a recursive ${C('Run(name)')} with a ${C('HashSet<string> started')}: return if already started; add; Run each dependency; Run each of beforeOf; append name; Run each of afterOf.</p>`, `<p>Hint 3: mark the target <b>before</b> recursing so hooks that point back at it do not loop. Building Lint alone does not pull in Compile — BeforeTargets is a hook, not a dependency.</p>`],
    tests: { sig: 'string[] string -> string[]', fn: 'order', cases: [
      [[['Build|Restore,Compile||', 'Restore|||', 'Compile|||', 'Lint||Compile|', 'Stamp|||Build', 'Pack|Build||'], 'Build'], ['Restore', 'Lint', 'Compile', 'Build', 'Stamp']],
      [[['Build|Restore,Compile||', 'Restore|||', 'Compile|||', 'Lint||Compile|', 'Stamp|||Build', 'Pack|Build||'], 'Pack'], ['Restore', 'Lint', 'Compile', 'Build', 'Stamp', 'Pack']],
      [[['Build|Restore,Compile||', 'Restore|||', 'Compile|||', 'Lint||Compile|', 'Stamp|||Build', 'Pack|Build||'], 'Restore'], ['Restore']],
      [[['Build|Restore,Compile||', 'Restore|||', 'Compile|||', 'Lint||Compile|', 'Stamp|||Build', 'Pack|Build||'], 'Lint'], ['Lint']],
      [[['A|B,C||', 'B|C||', 'C|||'], 'A'], ['C', 'B', 'A']],
      [[['A|||', 'B|||A', 'C||A|', 'D|||B'], 'A'], ['C', 'A', 'B', 'D']],
      [[['X|||'], 'X'], ['X']]
    ] },
    solution: {
      approach: `<p>A depth-first walk that follows MSBuild's documented order: DependsOnTargets, then BeforeTargets hooks, then the target, then AfterTargets hooks — each target at most once per build.</p>`,
      code: `
public class Solution
{
    public static string[] Order(string[] targets, string entry)
    {
        var deps = new Dictionary<string, string[]>();
        var beforeOf = new Dictionary<string, List<string>>();
        var afterOf = new Dictionary<string, List<string>>();
        static string[] Names(string s) => s.Split(',', StringSplitOptions.RemoveEmptyEntries);

        foreach (string t in targets)
        {
            string[] p = t.Split('|');
            deps[p[0]] = Names(p[1]);
            foreach (string b in Names(p[2])) { if (!beforeOf.TryGetValue(b, out var l)) beforeOf[b] = l = []; l.Add(p[0]); }
            foreach (string a in Names(p[3])) { if (!afterOf.TryGetValue(a, out var l)) afterOf[a] = l = []; l.Add(p[0]); }
        }

        var started = new HashSet<string>();
        var order = new List<string>();
        void Run(string name)
        {
            if (!started.Add(name)) return;
            foreach (string d in deps[name]) Run(d);
            foreach (string b in beforeOf.GetValueOrDefault(name, [])) Run(b);
            order.Add(name);
            foreach (string a in afterOf.GetValueOrDefault(name, [])) Run(a);
        }
        Run(entry);
        return order.ToArray();
    }
}`,
      dry: { head: ['call', 'action', 'order so far'], rows: [['Run(Build)', 'deps: Restore, Compile', '[]'], ['Run(Restore)', 'no hooks → run', '[Restore]'], ['Run(Compile)', 'beforeOf: Lint → run Lint, then Compile', '[Restore, Lint, Compile]'], ['back in Build', 'run Build, then afterOf: Stamp', '[Restore, Lint, Compile, Build, Stamp]']] },
      complexity: `<p>O(targets + hook entries); recursion depth up to the longest dependency chain (2000 frames is safe on the 1 MB stack).</p>`,
      followUps: ['Add Condition attributes: a skipped target still triggers its Before/After hooks.', 'Detect DependsOn cycles and report MSB4006.']
    }
  });

  practice.push({
    title: 'Test Impact Analysis: Which Test Projects Must Run?',
    level: 'Hard', tags: ['graphs', 'reverse BFS', 'CI'], companies: ['Microsoft', 'Google', 'Atlassian'],
    statement: `<p>${C('projects')} are ${C('"Name=dir/"')}; ${C('refs')} are ${C('"P->Q"')} (P has a ProjectReference to Q). A changed file belongs to the project with the <b>longest</b> directory prefix; a file outside every project directory (e.g. ${C('Directory.Build.props')}) affects <b>all</b> projects. A project is affected if it changed or (transitively) references an affected project. Return the affected test projects (names ending in ${C('.Tests')}), sorted ordinally.</p>`,
    constraints: `Up to 5000 projects, 2·10<sup>4</sup> references, 10<sup>4</sup> files.`,
    example: `<p>Changing ${C('src/Core/Order.cs')} affects Core, then Api and Core.Tests (they reference Core), then Web and Api.Tests, then Web.Tests → ${H.c('g', '["Api.Tests", "Core.Tests", "Web.Tests"]')}.</p>`,
    brute: { why: `<p>For each test project, a DFS down its references looking for a changed project costs O(tests × (V + E)). Walking the <b>reversed</b> graph once from all changed projects (multi-source BFS) finds every affected project in O(V + E).</p>`, code: `
static class PerTestDfs
{
    public static bool Reaches(Dictionary<string, List<string>> refs, string from, HashSet<string> changed, HashSet<string> seen)
    {
        if (changed.Contains(from)) return true;
        if (!seen.Add(from)) return false;
        return refs.GetValueOrDefault(from, []).Any(q => Reaches(refs, q, changed, seen));   // repeated per test project
    }
}` },
    mcq: { q: 'Why does a change to Directory.Build.props force every test project to run?', options: ['It is imported by every project, so it can change how any of them builds', 'It contains the tests', 'NuGet restores it first', 'It is a convention with no technical reason'], answer: 0, explain: 'Repo-wide MSBuild imports (props, targets, Directory.Packages.props, global.json) affect all projects, so impact analysis must treat them as global changes.' },
    hints: [`<p>Hint 1: build the reverse adjacency: for "P->Q" add P to ${C('usedBy[Q]')}.</p>`, `<p>Hint 2: map each file to a project by the longest matching ${C('StartsWith')} prefix (ordinal); no match → mark every project as changed.</p>`, `<p>Hint 3: BFS from all changed projects over ${C('usedBy')}; collect visited names ending in ".Tests" and sort with ${C('StringComparer.Ordinal')}.</p>`],
    tests: { sig: 'string[] string[] string[] -> string[]', fn: 'affectedTests', cases: [
      [[['Core=src/Core/', 'Api=src/Api/', 'Web=src/Web/', 'Utils=src/Utils/', 'Gen=src/Core/Gen/', 'Api.Tests=tests/Api.Tests/', 'Core.Tests=tests/Core.Tests/', 'Web.Tests=tests/Web.Tests/', 'Utils.Tests=tests/Utils.Tests/', 'Gen.Tests=tests/Gen.Tests/'], ['Api->Core', 'Api.Tests->Api', 'Core.Tests->Core', 'Web->Api', 'Web.Tests->Web', 'Utils.Tests->Utils', 'Gen.Tests->Gen'], ['src/Core/Order.cs']], ['Api.Tests', 'Core.Tests', 'Web.Tests']],
      [[['Core=src/Core/', 'Api=src/Api/', 'Web=src/Web/', 'Utils=src/Utils/', 'Gen=src/Core/Gen/', 'Api.Tests=tests/Api.Tests/', 'Core.Tests=tests/Core.Tests/', 'Web.Tests=tests/Web.Tests/', 'Utils.Tests=tests/Utils.Tests/', 'Gen.Tests=tests/Gen.Tests/'], ['Api->Core', 'Api.Tests->Api', 'Core.Tests->Core', 'Web->Api', 'Web.Tests->Web', 'Utils.Tests->Utils', 'Gen.Tests->Gen'], ['src/Web/Program.cs']], ['Web.Tests']],
      [[['Core=src/Core/', 'Api=src/Api/', 'Web=src/Web/', 'Utils=src/Utils/', 'Gen=src/Core/Gen/', 'Api.Tests=tests/Api.Tests/', 'Core.Tests=tests/Core.Tests/', 'Web.Tests=tests/Web.Tests/', 'Utils.Tests=tests/Utils.Tests/', 'Gen.Tests=tests/Gen.Tests/'], ['Api->Core', 'Api.Tests->Api', 'Core.Tests->Core', 'Web->Api', 'Web.Tests->Web', 'Utils.Tests->Utils', 'Gen.Tests->Gen'], []], []],
      [[['Core=src/Core/', 'Api=src/Api/', 'Web=src/Web/', 'Utils=src/Utils/', 'Gen=src/Core/Gen/', 'Api.Tests=tests/Api.Tests/', 'Core.Tests=tests/Core.Tests/', 'Web.Tests=tests/Web.Tests/', 'Utils.Tests=tests/Utils.Tests/', 'Gen.Tests=tests/Gen.Tests/'], ['Api->Core', 'Api.Tests->Api', 'Core.Tests->Core', 'Web->Api', 'Web.Tests->Web', 'Utils.Tests->Utils', 'Gen.Tests->Gen'], ['tests/Api.Tests/OrderTests.cs']], ['Api.Tests']],
      [[['Core=src/Core/', 'Api=src/Api/', 'Web=src/Web/', 'Utils=src/Utils/', 'Gen=src/Core/Gen/', 'Api.Tests=tests/Api.Tests/', 'Core.Tests=tests/Core.Tests/', 'Web.Tests=tests/Web.Tests/', 'Utils.Tests=tests/Utils.Tests/', 'Gen.Tests=tests/Gen.Tests/'], ['Api->Core', 'Api.Tests->Api', 'Core.Tests->Core', 'Web->Api', 'Web.Tests->Web', 'Utils.Tests->Utils', 'Gen.Tests->Gen'], ['Directory.Build.props']], ['Api.Tests', 'Core.Tests', 'Gen.Tests', 'Utils.Tests', 'Web.Tests']],
      [[['Core=src/Core/', 'Api=src/Api/', 'Web=src/Web/', 'Utils=src/Utils/', 'Gen=src/Core/Gen/', 'Api.Tests=tests/Api.Tests/', 'Core.Tests=tests/Core.Tests/', 'Web.Tests=tests/Web.Tests/', 'Utils.Tests=tests/Utils.Tests/', 'Gen.Tests=tests/Gen.Tests/'], ['Api->Core', 'Api.Tests->Api', 'Core.Tests->Core', 'Web->Api', 'Web.Tests->Web', 'Utils.Tests->Utils', 'Gen.Tests->Gen'], ['src/Utils/A.cs', 'src/Api/B.cs']], ['Api.Tests', 'Utils.Tests', 'Web.Tests']],
      [[['Core=src/Core/', 'Api=src/Api/', 'Web=src/Web/', 'Utils=src/Utils/', 'Gen=src/Core/Gen/', 'Api.Tests=tests/Api.Tests/', 'Core.Tests=tests/Core.Tests/', 'Web.Tests=tests/Web.Tests/', 'Utils.Tests=tests/Utils.Tests/', 'Gen.Tests=tests/Gen.Tests/'], ['Api->Core', 'Api.Tests->Api', 'Core.Tests->Core', 'Web->Api', 'Web.Tests->Web', 'Utils.Tests->Utils', 'Gen.Tests->Gen'], ['src/Core/Gen/X.cs']], ['Gen.Tests']]
    ] },
    solution: {
      approach: `<p>Files → changed projects (longest prefix, or "everything" for repo-level files), then a multi-source BFS over the reversed reference graph, then filter and sort the test projects.</p>`,
      code: `
public class Solution
{
    public static string[] AffectedTests(string[] projects, string[] refs, string[] changedFiles)
    {
        var dirs = projects.Select(p => p.Split('=', 2)).Select(kv => (Name: kv[0], Dir: kv[1])).ToList();
        var usedBy = new Dictionary<string, List<string>>();
        foreach (string r in refs)
        {
            int arrow = r.IndexOf("->", StringComparison.Ordinal);
            string p = r[..arrow], q = r[(arrow + 2)..];
            if (!usedBy.TryGetValue(q, out var l)) usedBy[q] = l = [];
            l.Add(p);
        }

        var affected = new HashSet<string>();
        var queue = new Queue<string>();
        void Mark(string name) { if (affected.Add(name)) queue.Enqueue(name); }

        foreach (string file in changedFiles)
        {
            var owner = dirs.Where(d => file.StartsWith(d.Dir, StringComparison.Ordinal))
                            .OrderByDescending(d => d.Dir.Length).FirstOrDefault();
            if (owner.Name is null) dirs.ForEach(d => Mark(d.Name));          // repo-level file: everything
            else Mark(owner.Name);
        }

        while (queue.Count > 0)
            foreach (string user in usedBy.GetValueOrDefault(queue.Dequeue(), []))
                Mark(user);

        return affected.Where(n => n.EndsWith(".Tests", StringComparison.Ordinal))
                       .OrderBy(n => n, StringComparer.Ordinal).ToArray();
    }
}`,
      dry: { head: ['step', 'queue', 'affected'], rows: [['src/Core/Order.cs → Core', '[Core]', '{Core}'], ['pop Core → Api, Core.Tests', '[Api, Core.Tests]', '{Core, Api, Core.Tests}'], ['pop Api → Api.Tests, Web', '[Core.Tests, Api.Tests, Web]', '+ Api.Tests, Web'], ['pop Web → Web.Tests', '[…, Web.Tests]', '+ Web.Tests']] },
      complexity: `<p>O(files × projects) for prefix matching (a trie makes it O(path length)), O(V + E) for the BFS, O(k log k) to sort.</p>`,
      followUps: ['Also include changed .props files under a project directory as affecting only that project.', 'Go finer-grained: map changed files to the tests whose coverage touched them.']
    }
  });

  /* ======================================================================
     QUIZ (authored with the correct option first; rotated below)
     ====================================================================== */
  quiz.push(
    { q: 'How many instances of an xUnit test class are created for a class with 2 facts and a theory with 3 InlineData rows?', options: ['5 — one per test case', '1 — shared by all tests', '2 — one per attribute type', '3 — one per method'], answer: 0, explain: 'xUnit creates a new instance for every test case, so constructors act as per-test setup and fields never leak.' },
    { q: 'In NUnit (default settings), where should you reset a field that each test modifies?', options: ['In a [SetUp] method — one fixture instance is reused by all tests', 'In the constructor', 'In [OneTimeSetUp]', 'Nowhere — NUnit creates a fresh instance per test'], answer: 0, explain: 'NUnit shares one instance per fixture unless you opt into FixtureLifeCycle(LifeCycle.InstancePerTestCase).' },
    { q: 'Which double verifies that an interaction happened?', options: ['A mock', 'A stub', 'A dummy', 'A fake'], answer: 0, explain: 'Stubs return canned answers, fakes are working lightweight implementations, dummies are unused placeholders; mocks carry expectations that are verified.' },
    { q: 'Why can Moq not intercept a non-virtual method on a concrete class?', options: ['Its proxy is a generated subclass, and only virtual members can be overridden', 'Moq only supports static methods', 'Non-virtual methods are inlined at compile time by csc', 'It can, using Setup with It.IsAny'], answer: 0, explain: 'Castle DynamicProxy generates a subclass or interface implementation at runtime; non-virtual and sealed members cannot be overridden.' },
    { q: 'What does WebApplicationFactory&lt;Program&gt; use instead of Kestrel?', options: ['An in-memory TestServer — requests never touch the network', 'A random free TCP port on localhost', 'IIS Express', 'A Docker container'], answer: 0, explain: 'TestServer plugs into the same pipeline; the HttpClient from CreateClient sends requests to it in memory.' },
    { q: 'A unique index violation is NOT detected in your tests but fails in production. The tests most likely use…', options: ['The EF Core InMemory provider', 'SQLite in-memory', 'Testcontainers with SQL Server', 'A transaction rolled back per test'], answer: 0, explain: 'The InMemory provider is not relational and does not enforce unique indexes; relational providers do.' },
    { q: 'An entity is Added, then a property is changed, then SaveChanges runs. What SQL is generated for it?', options: ['One INSERT', 'An INSERT then an UPDATE', 'An UPDATE only', 'Nothing until DetectChanges is called manually'], answer: 0, explain: 'Modifying an Added entity keeps it Added; the INSERT contains the latest values.' },
    { q: 'A project has &lt;PackageReference Include="Lib" Version="2.0" /&gt;. Available: 1.9, 2.0, 2.3, 3.0. Restore picks…', options: ['2.0', '2.3', '3.0', 'It fails because 2.0 is not a range'], answer: 0, explain: 'A bare version is a minimum (≥ 2.0) and NuGet chooses the lowest applicable version.' },
    { q: 'Which SemVer ordering is correct?', options: ['1.0.0-alpha &lt; 1.0.0-alpha.1 &lt; 1.0.0-beta &lt; 1.0.0', '1.0.0 &lt; 1.0.0-alpha', '1.0.0-beta &lt; 1.0.0-alpha.1', '1.0.0+build.2 &gt; 1.0.0+build.1'], answer: 0, explain: 'Prereleases sort before the release; a longer identifier list is higher when the shared ones are equal; build metadata is ignored.' },
    { q: 'You run dotnet build -p:Configuration=Release and the project file says &lt;Configuration&gt;Debug&lt;/Configuration&gt;. The build uses…', options: ['Release — global properties cannot be overridden by the project', 'Debug — the project file is evaluated last', 'Both, building twice', 'Whichever is alphabetically first'], answer: 0, explain: 'Command-line properties are global and read-only during evaluation (unless the project declares TreatAsLocalProperty).' },
    { q: 'Where do you put build settings shared by every project in a repository?', options: ['Directory.Build.props at (or above) the projects\' folders', 'global.json', 'NuGet.config', 'The .sln file'], answer: 0, explain: 'MSBuild auto-imports the nearest Directory.Build.props early in evaluation; global.json pins the SDK version only.' },
    { q: 'An .editorconfig sets dotnet_analyzer_diagnostic.category-Performance.severity = error and dotnet_diagnostic.CA1822.severity = none. CA1822 (Performance) is…', options: ['Disabled — the rule-ID entry is more specific', 'An error — the category wins', 'A warning — its default', 'Whichever line appears later'], answer: 0, explain: 'Precedence: rule ID, then category, then all analyzers, then the default.' },
    { q: 'A method has 100% line coverage. What can you conclude?', options: ['Every line ran at least once during the tests — nothing about whether outcomes were asserted', 'All branches were taken', 'The method is bug-free', 'The tests would fail if the method were changed'], answer: 0, explain: 'Coverage measures execution, not verification. Branch coverage and mutation testing reveal more.' },
    { q: 'Which command collects coverage with the coverlet.collector package in an xUnit project?', options: ['dotnet test --collect:"XPlat Code Coverage"', 'dotnet coverage --xunit', 'dotnet build -coverage', 'dotnet test --coverage-only'], answer: 0, explain: 'The data collector writes coverage.cobertura.xml into the TestResults folder; ReportGenerator turns it into HTML.' }
  );

  /* ======================================================================
     INTERVIEW QUESTIONS
     ====================================================================== */
  interview.push(
    { level: 'B', q: 'What makes a good unit test? How do you structure and name one?', a: `<p>A good unit test checks <b>one behaviour</b> through the public API, is <b>fast</b> (milliseconds), <b>isolated</b> (no shared state, network, clock or file system), <b>repeatable</b> (same result every run, in any order and in parallel) and <b>self-validating</b> (asserts, no manual inspection). Structure it as Arrange–Act–Assert with a blank line between sections, keep logic (loops, ifs) out of tests by using theories, and name it ${C('Method_Scenario_ExpectedResult')} so the failure report reads like a specification. Assert on outcomes — return values, state, published messages — not on private details, so refactoring does not break tests. Finally, check that the test fails when the behaviour is broken: a test that cannot fail is noise.</p>`, followUps: ['How many asserts per test?', 'How do you test private methods?'] },
    { level: 'B', q: 'Compare xUnit and NUnit. Which would you pick for a new project?', a: `<p>Both are mature and run with ${C('dotnet test')}. <b>xUnit</b>: ${C('[Fact]')}/${C('[Theory]')}, a new test-class instance per test, constructor/${C('IDisposable')} for setup/teardown, ${C('IClassFixture')}/${C('ICollectionFixture')} for shared context, parallel test collections by default, no ${C('[SetUp]')} attributes by design, and it is the default template and what the .NET runtime repos use. <b>NUnit</b>: ${C('[Test]')}/${C('[TestCase]')}/${C('[TestCaseSource]')}, one fixture instance shared by default, ${C('[SetUp]')}/${C('[OneTimeSetUp]')} attributes, a rich constraint model (${C('Assert.That(x, Is.EqualTo(5))')}), opt-in parallelism, and features like ${C('[Values]')}/${C('[Combinatorial]')} and ${C('[Retry]')}. For a new .NET project I would pick xUnit because of isolation by default and ecosystem defaults — unless the team already knows NUnit well; consistency across a codebase matters more than the framework choice.</p>`, followUps: ['How do you share an expensive resource across test classes in xUnit?', 'What does IAsyncLifetime solve?'] },
    { level: 'I', q: 'Explain stubs, fakes, mocks and spies. When would you avoid mocks?', a: `<p>A <b>stub</b> returns canned data for queries; a <b>fake</b> is a working lightweight implementation (in-memory repository, ${C('FakeTimeProvider')}); a <b>spy</b> records calls for later inspection; a <b>mock</b> is configured with expectations and verified (${C('Verify(..., Times.Once)')}). I avoid mocks for queries and internal collaborators: verifying that a repository's ${C('Find')} was called couples the test to implementation and breaks on harmless refactors. I prefer state-based tests with fakes and keep mocks for outbound side effects that are the actual contract — an email sent, a message published, a payment charged. I also avoid mocking types I do not own (HttpClient, DbContext, SDK clients): wrap them behind my own interface or test them with integration tests. Over-mocked suites pass while the system is broken, because the mocks encode assumptions about how dependencies behave.</p>`, followUps: ['What is the London vs Chicago school of TDD?', 'How do you test code that uses DateTime.Now?'] },
    { level: 'I', q: 'How do you write integration tests for an ASP.NET Core API?', a: `<p>Use ${C('WebApplicationFactory<Program>')} from Microsoft.AspNetCore.Mvc.Testing: it boots the real app (DI, middleware, routing, model binding, filters, serialization) on an in-memory TestServer and gives an ${C('HttpClient')}. Make ${C('Program')} accessible with ${C('public partial class Program { }')}. Override dependencies in ${C('ConfigureTestServices')}: replace external HTTP APIs with stub ${C('HttpMessageHandler')}s, payment gateways with fakes, and authentication with a test scheme. For the database, prefer the real engine via <b>Testcontainers</b> (start once per fixture with ${C('IAsyncLifetime')}, apply migrations, reset data between tests with Respawn or transactions) over EF InMemory. Tests then assert on status codes, headers and JSON bodies. Share the factory via class/collection fixtures so startup costs are paid once, and keep end-to-end tests against deployed environments to a few smoke tests.</p>`, followUps: ['How would you test authorization policies?', 'How do you keep tests independent when they share a database?'] },
    { level: 'I', q: 'Should you use the EF Core InMemory provider for tests? What are the alternatives?', a: `<p>Generally no. InMemory is not a relational database: it does not enforce unique indexes, foreign keys or most constraints, ignores transactions, evaluates LINQ in memory (so queries that cannot be translated to SQL pass), and compares strings case-sensitively regardless of the database's collation. The EF Core team itself discourages it for testing. Alternatives: (1) <b>SQLite in-memory</b> — relational, fast, enforces constraints; keep the connection open; dialect differences remain (types, functions, schemas). (2) <b>The production engine in Testcontainers</b> — highest fidelity, a few seconds to start once per test run; also lets you test migrations with ${C('Database.Migrate()')}. (3) For unit-testing service logic, put a <b>repository or query interface</b> in front of EF and use a fake; then test the real repository against a real database. Avoid mocking ${C('DbSet<T>')} — IQueryable mocks are brittle and still not SQL.</p>`, followUps: ['How do you test optimistic concurrency?', 'Why read back with a fresh DbContext?'] },
    { level: 'A', q: 'Walk through how EF Core\'s change tracker decides what SaveChanges writes.', a: `<p>Every tracked entity has an ${C('EntityState')}: Detached, Added, Unchanged, Modified or Deleted. Queries track results as Unchanged and store a snapshot of original values; ${C('Add')} marks Added; ${C('Remove')} marks Deleted — except for an Added entity, which simply becomes Detached because no row exists. ${C('DetectChanges')} (called by SaveChanges) compares current property values to the snapshots and marks changed entities Modified with per-property flags, so an UPDATE lists only changed columns. Modifying an Added entity keeps it Added. SaveChanges orders the commands by dependencies (principals before dependents), wraps them in a transaction, propagates generated keys, then accepts changes: Added/Modified → Unchanged, Deleted → Detached; it returns the number of state entries written. ${C('AsNoTracking')} results are not tracked; ${C('Attach')}/${C('Update')} start tracking detached graphs; ${C('ExecuteUpdate')}/${C('ExecuteDelete')} bypass the tracker entirely, so tracked copies can be stale.</p>`, followUps: ['What does ChangeTracker.Clear() do and when is it useful in tests?', 'How do concurrency tokens fit in?'] },
    { level: 'B', q: 'How does NuGet choose a package version? Explain lowest applicable version and nearest wins.', a: `<p>A ${C('Version="1.2.0"')} attribute is a <b>minimum</b> (≥ 1.2.0), and ranges use interval notation (${C('[1.0,2.0)')}, ${C('[1.2.0]')} for exact). For each range NuGet picks the <b>lowest applicable</b> version, so a build does not change just because a newer package was published (floating versions like ${C('1.*')} are the exception and pick the highest). When the graph has several requirements for the same package, <b>direct dependency wins</b>: the declaration nearest to the project eclipses deeper ones. If the nearest declaration is lower than a transitive minimum, restore reports <b>NU1605</b> (package downgrade), an error by default. Requirements from cousin branches at the same level resolve to the lowest version that satisfies all of them; if none exists, NU1107. The result is recorded in ${C('project.assets.json')} and can be pinned in ${C('packages.lock.json')}.</p>`, followUps: ['How do you fix NU1605 properly?', 'What does CentralPackageTransitivePinningEnabled do?'] },
    { level: 'I', q: 'How do you keep package versions consistent and secure across a large solution?', a: `<p>Enable <b>Central Package Management</b>: ${C('Directory.Packages.props')} with ${C('ManagePackageVersionsCentrally')} and one ${C('PackageVersion')} per package; projects reference packages without versions, and rare exceptions use ${C('VersionOverride')} so they are visible in review. Optionally pin transitive packages centrally. Commit <b>lock files</b> and restore in locked mode in CI so the graph cannot change silently. Use <b>package source mapping</b> in NuGet.config so internal ids only come from the internal feed (prevents dependency confusion). Run <b>NuGet audit</b> (restore warnings NU1901–NU1904) and ${C('dotnet list package --vulnerable --include-transitive')}, and automate updates with Dependabot or Renovate, grouped by ecosystem, with tests gating merges. Follow SemVer when publishing your own packages and enable package validation to catch accidental breaking changes.</p>`, followUps: ['What is dependency confusion?', 'How do you handle a vulnerable transitive dependency?'] },
    { level: 'I', q: 'Explain MSBuild evaluation. Why might a property you set be ignored?', a: `<p>MSBuild works in two phases. <b>Evaluation</b>: environment and global properties are set, then all properties are evaluated top to bottom (imports inlined in place), then item definitions and items; ${C('$(Prop)')} is expanded at the moment of assignment and undefined properties expand to empty strings. <b>Execution</b>: targets run in dependency order. A property is "ignored" when: (1) a later definition overrides it — e.g. something in an SDK .targets file or ${C('Directory.Build.targets')} imported after your project body; (2) it is a <b>global property</b> passed with ${C('-p:')}, which the project cannot overwrite; (3) you used it in another property defined <b>before</b> yours; (4) a condition compared strings you expected to be case-sensitive (MSBuild comparisons are not); (5) you set it inside a target, so it only exists during execution, after items were already computed. Debug with ${C('dotnet build -bl')} and the Structured Log Viewer, or ${C('dotnet msbuild -getProperty:Name')}.</p>`, followUps: ['Directory.Build.props vs Directory.Build.targets?', 'How do you add a step after Build?'] },
    { level: 'B', q: 'What dotnet CLI commands would you use in a CI pipeline, and why in that order?', a: `<p>${C('dotnet --info')} (log the SDK, pinned by ${C('global.json')}); ${C('dotnet restore --locked-mode')} (once, fails if the dependency graph drifted); ${C('dotnet build -c Release --no-restore -warnaserror')} (compile everything once, analyzers as errors); ${C('dotnet test -c Release --no-build --collect:"XPlat Code Coverage" --logger trx')} (run tests without rebuilding, collect coverage and test results); ${C('dotnet format --verify-no-changes')} (style gate); then ${C('dotnet pack')} or ${C('dotnet publish -c Release --no-build')} for artifacts. Each command implicitly runs the previous steps, so the ${C('--no-restore')}/${C('--no-build')} flags avoid repeating work and make the pipeline faster and deterministic. Cache the NuGet folder keyed on lock files, and upload the binlog (${C('-bl')}) on failure for debugging.</p>`, followUps: ['How do you run only fast tests on every commit?', 'Self-contained vs framework-dependent publish?'] },
    { level: 'A', q: 'How do you introduce analyzers to a large existing codebase without stopping development?', a: `<p>Start from a baseline: set ${C('AnalysisLevel')} (e.g. ${C('latest-recommended')}) in ${C('Directory.Build.props')} and run a build to see the volume per rule. Configure severities in a root ${C('.editorconfig')}: enable high-value rules (correctness, security, async misuse, disposal) as warnings, disable or keep as suggestion noisy style rules. Fix or auto-fix (${C('dotnet format analyzers')}) rule by rule in focused PRs. Then turn on ${C('TreatWarningsAsErrors')} in CI (or ${C('WarningsAsErrors')} for specific IDs) so the count can only go down; new projects start strict. Suppress individual false positives with justifications (${C('[SuppressMessage(Justification = ...)]')}), never blanket ${C('NoWarn')}. Add third-party analyzers (xunit.analyzers, Meziantou) where they catch real bugs, write custom analyzers for team-specific rules (e.g. banning ${C('DateTime.Now')} via BannedApiAnalyzers), and watch build time with ${C('ReportAnalyzer')}.</p>`, followUps: ['How does severity precedence work in .editorconfig?', 'What does EnforceCodeStyleInBuild do?'] },
    { level: 'A', q: 'What coverage target would you set, and how do you measure test quality beyond coverage?', a: `<p>I avoid a single global number as a goal: teams hit it by writing assertion-free tests. I use coverage to <b>find untested code</b>: require that coverage does not drop, look at diff coverage on PRs (e.g. 80% of changed lines), and review uncovered branches in critical modules (payments, auth). Branch coverage matters more than line coverage, since one line can hide several outcomes. Coverlet collects it (${C('--collect:"XPlat Code Coverage"')}), ReportGenerator merges reports from unit and integration runs. To judge quality, run <b>mutation testing</b> (Stryker.NET) on core modules — surviving mutants show assertions that do not check behaviour. Other signals: flaky-test rate, escaped-defect analysis (which bugs reached production and which test level should have caught them), test run time, and whether tests break on refactoring (a sign of over-specification).</p>`, followUps: ['Why do async methods show odd branch coverage?', 'How does Stryker.NET work?'] },
    { level: 'E', q: 'Design the testing strategy and CI for a .NET microservice with a database, a message bus and two external APIs.', a: `<p><b>Layers:</b> unit tests for domain logic and handlers with fakes for repositories and ${C('TimeProvider')} (fast, most numerous); integration tests with ${C('WebApplicationFactory')} + Testcontainers for the database and the broker (RabbitMQ/Kafka containers) covering endpoints, migrations, transactions, outbox publishing and consumer idempotency; external APIs replaced by stub ${C('HttpMessageHandler')}s or WireMock.Net, plus <b>contract tests</b> (Pact) so stubs stay honest; a handful of smoke tests against a deployed environment. <b>Data isolation:</b> one container per collection, Respawn between tests, unique ids. <b>CI:</b> restore locked, build once with analyzers as errors, run unit tests on every push, integration tests in parallel jobs, publish coverage (diff coverage gate) and TRX results; quarantine flaky tests with an owner and deadline. <b>Tooling:</b> Central Package Management, Directory.Build.props for shared settings, Dependabot, NuGet audit, binlogs on failure. The goal is fast feedback for most changes and high fidelity where bugs actually live — I/O boundaries.</p>`, followUps: ['How do you test the outbox pattern?', 'How do you keep integration tests under 5 minutes?'] }
  );

  /* Spread correct answers across positions (authored with the correct option first). */
  function rotate(m, k) {
    var n = m.options.length; k = k % n;
    if (!k) return;
    m.options = m.options.slice(k).concat(m.options.slice(0, k));
    m.answer = (m.answer - k + n) % n;
  }
  quiz.forEach(function (q, i) { rotate(q, i * 3 + 1); });
  var mcqIdx = 0;
  topics.forEach(function (t) { (t.problems || []).forEach(function (p) { rotate(p.mcq, mcqIdx++ * 3 + 2); }); });
  practice.forEach(function (p) { rotate(p.mcq, mcqIdx++ * 3 + 2); });

  registerModule({
    id: 'csharp16',
    title: 'Testing & Tooling in .NET',
    lang: 'csharp',
    intro: `<p>Professional .NET work is not only writing C#: it is proving it works and building it reliably. This module covers the <b>testing</b> stack — xUnit and NUnit, test doubles with Moq and NSubstitute, integration tests with <b>WebApplicationFactory</b> and <b>Testcontainers</b>, and how to test EF Core honestly — and the <b>tooling</b> around it: NuGet packages and versioning, MSBuild and project files, the dotnet CLI, Roslyn analyzers and code coverage.</p>
<p>Framework code (xUnit, Moq, EF Core, MSBuild XML) is shown as reference; every exercise is plain C# 12 that compiles and passes tests: you build a mini test runner, a mock verifier, a stub HTTP handler, a change tracker, a version-range resolver, an MSBuild evaluator, a coverage counter and more — the mechanics behind the tools.</p>`,
    goals: [
      'Write idiomatic xUnit and NUnit tests (facts, theories, fixtures) and explain their lifecycle and parallelism differences',
      'Choose between stubs, fakes, spies and mocks; use Moq and NSubstitute without over-specifying interactions',
      'Build integration tests with WebApplicationFactory, ConfigureTestServices, stub HttpMessageHandlers and Testcontainers',
      'Test EF Core code against the right provider and reason about change-tracker states and SaveChanges',
      'Explain NuGet version ranges, lowest-applicable and nearest-wins resolution, NU1605, Central Package Management and lock files',
      'Read and write SDK-style project files, understand MSBuild evaluation and target order, and drive builds with the dotnet CLI',
      'Configure Roslyn analyzers with .editorconfig, and measure and interpret line, branch and mutation coverage'
    ],
    prereqs: `C# 14 and C# 15 (ASP.NET Core and EF Core) — this module tests and builds the kinds of applications built there. A .NET 8 SDK and Docker (for Testcontainers) to try the framework examples.`,
    hours: 16,
    langNotes: {
      csharp: `<p>Test frameworks discover tests by reflection, so test methods must be ${C('public')}; async tests return ${C('Task')}, never ${C('async void')}. Mocking libraries generate runtime proxies and can only intercept interfaces and ${C('virtual')} members, and do not work under Native AOT. ${C('HttpClient')} methods are non-virtual — stub the ${C('HttpMessageHandler')}. ${C('System.Version')} compares numerically but has no prerelease support, and ${C('new Version(2, 0)')} is not equal to ${C('new Version(2, 0, 0)')}. Format percentages with ${C('CultureInfo.InvariantCulture')}.</p>`
    },
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
