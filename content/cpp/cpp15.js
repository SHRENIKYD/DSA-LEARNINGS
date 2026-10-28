(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  var R = String.raw;   // C++ code is written with String.raw so "\n" stays a C++ escape

  /* ======================================================================
     Shared helpers for the visualizers of this module
     ====================================================================== */
  function note(html, label) { return { type: 'text', label: label || 'What is going on', html: html }; }
  function txt(input, def) { return String(input === undefined || input === null ? def : input).trim(); }
  function splitList(s, sep) { return s.split(sep).map(function (x) { return x.trim(); }).filter(Boolean); }

  /* ======================================================================
     TOPIC 1 — Unit tests with GoogleTest and Catch2
     ====================================================================== */
  topics.push({
    title: 'Unit Tests with GoogleTest & Catch2: How a Test Framework Really Works',
    analogy: `<p>A restaurant kitchen has a checklist pinned to the wall: "soup is hot", "salad has no nuts", "steak is medium". Each cook writes a line on the list when they create a dish (registration), and before service an inspector walks the whole list, tastes everything and writes ✓ or ✗ next to each line with a note like "expected hot, was lukewarm" (assertions and failure reports). Nobody has to remember which dishes exist: the list does. A C++ test framework is exactly this wall checklist — <code>TEST(...)</code> pins a line on it before <code>main</code> even starts, and <code>RUN_ALL_TESTS()</code> is the inspector.</p>`,
    explain: `<p><b>The plain idea:</b> a unit test is a small function that calls your code with known inputs and <b>checks</b> the result. A framework adds three things you would otherwise write by hand: <b>registration</b> (find every test automatically), <b>assertions</b> (compare values and print a helpful message when they differ) and a <b>runner</b> (run tests one by one, count failures, return a non-zero exit code so CI goes red).</p>
      ${H.table(['', 'GoogleTest 1.14+', 'Catch2 v3'], [
        ['define a test', '<code>TEST(Suite, Name) { ... }</code>', '<code>TEST_CASE("name", "[tag]") { ... }</code>'],
        ['non-fatal check', '<code>EXPECT_EQ(a, b)</code>, <code>EXPECT_TRUE</code>, <code>EXPECT_NEAR</code>', '<code>CHECK(a == b)</code> (expression decomposition prints both sides)'],
        ['fatal check (stop this test)', '<code>ASSERT_EQ(a, b)</code>', '<code>REQUIRE(a == b)</code>'],
        ['main()', 'link <code>GTest::gtest_main</code>', 'link <code>Catch2::Catch2WithMain</code>'],
        ['pick tests', '<code>--gtest_filter=Math.*-*Slow*</code>', '<code>./tests "[fast]" ~"[slow]"</code>'],
        ['shared setup', 'fixture class + <code>TEST_F</code>', '<code>SECTION</code>s re-run the enclosing code per leaf']
      ])}
      <p><b>EXPECT vs ASSERT</b> is the first interview question. <code>EXPECT_*</code> records a failure and <b>keeps going</b>, so one run shows every broken field. <code>ASSERT_*</code> records the failure and <b>returns from the current function</b> — use it when continuing would crash, e.g. <code>ASSERT_NE(p, nullptr)</code> before <code>p-&gt;size()</code>. Because it works by <code>return</code>, <code>ASSERT_*</code> only works inside functions returning <code>void</code>.</p>
      <p><b>How registration works without you calling anything:</b> <code>TEST(Math, Add)</code> expands to a class <code>Math_Add_Test</code> with a <code>TestBody()</code> method, plus a <b>static variable</b> whose initialiser calls <code>MakeAndRegisterTestInfo(...)</code>. Static initialisers run before <code>main</code>, so by the time <code>RUN_ALL_TESTS()</code> starts the registry already holds every test in every linked translation unit. (That is also why a test file that is not linked into the binary silently runs zero tests.)</p>
      <p><b>Catch2's party trick</b> is expression decomposition: <code>CHECK(a == b)</code> uses operator overloading (<code>Decomposer() &lt;= a == b</code>) to capture <code>a</code> and <code>b</code> separately, so the failure prints <code>CHECK( add(2, 2) == 5 ) with expansion: 4 == 5</code> without needing a separate macro per operator.</p>`,
    clues: [
      '"How does TEST() register itself?" → static object initialised before main adds to a global registry',
      '"EXPECT vs ASSERT" / "when do you stop a test early" → fatal vs non-fatal; ASSERT returns from the current function',
      '"test passes locally, CI runs 0 tests" → the test object file was not linked, or a filter excluded it',
      '"print both sides on failure" → assertion macros capture the expression text with #a and the values',
      '"Catch2 vs GoogleTest" → BDD-style sections and decomposed CHECK vs fixtures, mocks and the larger ecosystem',
      '"write a tiny test framework" in an interview → registry of (name, function) + failure counter + summary + exit code'
    ],
    code: [{ lang: 'cpp', check: false, title: 'GoogleTest: tests, fixtures-free style (link GTest::gtest_main)', code: R`
      #include <gtest/gtest.h>
      #include <vector>
      #include "stack.h"            // the code under test

      TEST(StackTest, StartsEmpty) {
          Stack<int> s;
          EXPECT_TRUE(s.empty());
          EXPECT_EQ(s.size(), 0u);
      }

      TEST(StackTest, PopReturnsLastPushed) {
          Stack<int> s;
          s.push(1);
          s.push(2);
          ASSERT_EQ(s.size(), 2u) << "push must grow the stack";   // stop here if this fails
          EXPECT_EQ(s.pop(), 2);
          EXPECT_EQ(s.pop(), 1);
      }

      TEST(StackTest, PopOnEmptyThrows) {
          Stack<int> s;
          EXPECT_THROW(s.pop(), std::out_of_range);
      }` }, { lang: 'cpp', check: false, title: 'Catch2 v3: the same tests with SECTIONs (link Catch2::Catch2WithMain)', code: R`
      #include <catch2/catch_test_macros.hpp>
      #include <stdexcept>
      #include "stack.h"

      TEST_CASE("stack basics", "[stack][fast]") {
          Stack<int> s;                       // re-created for EVERY leaf section
          REQUIRE(s.empty());

          SECTION("push then pop") {
              s.push(1);
              s.push(2);
              CHECK(s.pop() == 2);            // prints "2 == 2" style expansion on failure
              CHECK(s.pop() == 1);
          }
          SECTION("pop on empty throws") {
              CHECK_THROWS_AS(s.pop(), std::out_of_range);
          }
      }` }, R`
      // The core of every xUnit framework in ~40 lines: registry + assertion + runner.
      #include <cstdio>
      #include <functional>
      #include <string>
      #include <vector>

      struct TestCase { std::string name; std::function<void()> body; };
      std::vector<TestCase>& registry() { static std::vector<TestCase> r; return r; }   // function-local static: no init-order fiasco
      int& currentFailures() { static int f = 0; return f; }

      struct Registrar {                                   // its constructor runs during static initialisation
          Registrar(const char* name, void (*fn)()) { registry().push_back({name, fn}); }
      };

      #define TEST(suite, name)                                                   \
          static void suite##_##name##_body();                                   \
          static Registrar suite##_##name##_reg(#suite "." #name, &suite##_##name##_body); \
          static void suite##_##name##_body()

      #define EXPECT_EQ(a, b)                                                     \
          do {                                                                    \
              auto&& va_ = (a); auto&& vb_ = (b);                                 \
              if (!(va_ == vb_)) {                                                \
                  ++currentFailures();                                            \
                  std::printf("%s:%d: Failure: %s != %s\n", __FILE__, __LINE__, #a, #b); \
              }                                                                   \
          } while (0)

      int runAllTests() {
          int failedTests = 0;
          for (auto& t : registry()) {
              currentFailures() = 0;
              t.body();
              std::printf("[ %s ] %s\n", currentFailures() ? "FAILED" : "    OK", t.name.c_str());
              if (currentFailures()) ++failedTests;
          }
          std::printf("%zu tests, %d failed\n", registry().size(), failedTests);
          return failedTests ? 1 : 0;                       // non-zero exit code turns CI red
      }

      int add(int a, int b) { return a + b; }
      TEST(Math, AddSmall) { EXPECT_EQ(add(2, 2), 4); }
      TEST(Math, AddWrong) { EXPECT_EQ(add(2, 2), 5); }   // deliberately failing

      int main() { return runAllTests(); }`],
    codeTitle: ['GoogleTest basics', 'Catch2 v3 basics', 'Build your own: registration, EXPECT_EQ, runner'],
    viz: {
      title: 'Static registration, then RUN_ALL_TESTS',
      input: 'Math.AddSmall 4=4; Math.AddWrong 4=5 1=1; Str.Empty',
      inputLabel: 'Tests separated by ";" — name then checks actual=expected (0-4 checks each, up to 5 tests)',
      gen: function (input) {
        var specs = splitList(txt(input, 'Math.AddSmall 4=4; Math.AddWrong 4=5 1=1; Str.Empty'), ';');
        if (!specs.length || specs.length > 5) throw new Error('Give 1-5 tests, e.g. "Math.Add 4=4; Math.Bad 4=5"');
        var tests = specs.map(function (s) {
          var p = s.split(/\s+/), name = p.shift();
          if (!/^[A-Za-z_]\w*\.[A-Za-z_]\w*$/.test(name)) throw new Error('Name "' + name + '" must look like Suite.Name');
          if (p.length > 4) throw new Error('At most 4 checks per test');
          return { name: name, checks: p.map(function (c) { var m = c.match(/^(-?\d+)=(-?\d+)$/); if (!m) throw new Error('Check "' + c + '" must look like 4=5'); return [+m[1], +m[2]]; }) };
        });
        var frames = [], reg = [];
        frames.push({ narr: 'Before <code>main()</code> runs, the C++ runtime executes every <b>static initialiser</b>. Each <code>TEST(...)</code> macro created one static <code>Registrar</code> object, so the registry fills up by itself.', parts: [{ type: 'queue', label: 'registry (empty)', items: [] }, note('Order inside one .cpp file is declaration order; order <b>between</b> files is unspecified — one reason tests must never depend on each other.')] });
        tests.forEach(function (t) {
          reg.push(t.name);
          frames.push({ narr: 'Static init: <code>Registrar(&quot;' + t.name + '&quot;, &amp;body)</code> pushes the test into the registry.', parts: [{ type: 'queue', label: 'registry', items: reg.slice(), hl: (function () { var h = {}; h[reg.length - 1] = 'ok'; return h; })() }] });
        });
        var rows = [], failedTests = 0;
        tests.forEach(function (t, i) {
          var f = 0, lines = [];
          t.checks.forEach(function (c) { if (c[0] !== c[1]) { f++; lines.push('EXPECT_EQ failed: ' + c[0] + ' != ' + c[1]); } });
          if (f) failedTests++;
          rows.push([t.name, String(t.checks.length), String(f), f ? 'FAILED' : 'OK']);
          var hl = {}; hl[i] = f ? 'bad' : 'ok';
          frames.push({ narr: '<code>RUN_ALL_TESTS()</code> resets the failure counter and calls <b>' + t.name + '</b>. ' + (t.checks.length ? t.checks.length + ' EXPECT_EQ check(s) run; ' + (f ? '<span class="c-r">' + f + ' failed</span> but EXPECT keeps going, so every failure in this test is reported.' : '<span class="c-g">all passed</span>.') : 'It has no checks — a test with no assertions <b>passes</b>, which is why "assertion-free" tests are a code-review smell.'),
            parts: [{ type: 'table', label: 'runner output', columns: ['test', 'checks', 'failures', 'result'], rows: rows.map(function (r) { return r.slice(); }), hl: hl }].concat(lines.length ? [note(lines.join('<br>'), 'failure messages')] : []) });
        });
        frames.push({ narr: 'Summary: ' + (tests.length - failedTests) + '/' + tests.length + ' passed. The runner returns <b>' + (failedTests ? '1' : '0') + '</b> from <code>main</code>' + (failedTests ? ', so <code>ctest</code> and CI mark the build red.' : ', so CI stays green.'),
          parts: [{ type: 'vars', label: 'process result', vals: { tests: tests.length, failed: failedTests, exit_code: failedTests ? 1 : 0 }, hl: { exit_code: failedTests ? 'bad' : 'ok' } }] });
        return frames;
      }
    },
    examples: [
      { title: 'EXPECT vs ASSERT: which line runs?', html: `<p>In the test below, if <code>parse</code> returns an empty vector, <code>ASSERT_EQ</code> fails and <b>returns</b> immediately, so <code>v[0]</code> (which would be undefined behaviour) never runs. Had we written <code>EXPECT_EQ</code>, the test would continue into an out-of-bounds read. Rule: ASSERT for preconditions of later lines, EXPECT for independent facts.</p>`, code: { lang: 'cpp', check: false, code: R`
        TEST(Parser, SplitsOnComma) {
            std::vector<std::string> v = parse("a,b");
            ASSERT_EQ(v.size(), 2u);   // fatal: the next lines index v
            EXPECT_EQ(v[0], "a");      // non-fatal: both are reported if both are wrong
            EXPECT_EQ(v[1], "b");
        }` } },
      { title: 'ASSERT inside a helper does not stop the test', html: `<p>A classic trap: <code>ASSERT_*</code> returns from the <b>helper</b>, and the calling test keeps running. Wrap the call with <code>ASSERT_NO_FATAL_FAILURE(helper())</code>, or check <code>HasFatalFailure()</code> afterwards. Also, a helper with a non-void return type cannot use <code>ASSERT_*</code> at all (compile error), so helpers often return <code>::testing::AssertionResult</code> instead.</p>`, code: { lang: 'cpp', check: false, code: R`
        void checkHeader(const Packet& p) {
            ASSERT_EQ(p.magic, 0xCAFE);    // returns from checkHeader only
        }
        TEST(Packet, Decodes) {
            Packet p = decode(bytes);
            ASSERT_NO_FATAL_FAILURE(checkHeader(p));   // now the test stops too
            EXPECT_EQ(p.length, 12);
        }
        ::testing::AssertionResult IsEven(int n) {     // custom predicate with a good message
            if (n % 2 == 0) return ::testing::AssertionSuccess();
            return ::testing::AssertionFailure() << n << " is odd";
        }` } },
      { title: 'Comparing floats, strings and containers', html: `<p><code>EXPECT_EQ(0.1 + 0.2, 0.3)</code> fails. Use <code>EXPECT_DOUBLE_EQ</code> (within 4 ULPs), <code>EXPECT_NEAR(a, b, 1e-9)</code> (absolute tolerance) or Catch2's <code>Catch::Approx</code> / <code>WithinRel</code> matchers. Comparing C strings with <code>EXPECT_EQ</code> compares <b>pointers</b> — use <code>EXPECT_STREQ</code>, or compare <code>std::string</code>s. For containers, GoogleMock matchers give readable diffs: <code>EXPECT_THAT(v, ElementsAre(1, 2, 3))</code>, <code>UnorderedElementsAre</code>, <code>Contains</code>.</p>` },
      { title: 'Test discovery in CTest', html: `<p>In CMake, <code>include(GoogleTest)</code> + <code>gtest_discover_tests(my_tests)</code> runs the binary with <code>--gtest_list_tests</code> at build time and creates one CTest entry per test, so <code>ctest -j8 --output-on-failure</code> runs them in parallel processes and shows only failing output. Catch2 has <code>catch_discover_tests</code>. (The build-system details belong to the CMake module; here it is enough to know that each test becomes its own process.)</p>` }
    ],
    deepDive: `<p><b>Exit codes are the contract.</b> CI does not read your log; it reads the process exit status. <code>RUN_ALL_TESTS()</code> returns 0 only if every test passed, and you must <code>return</code> it from <code>main</code> (gtest_main does). Beware the silent green: a filter that matches nothing makes GoogleTest report "0 tests ran" and exit 0, so CI scripts should check the test count. Catch2 v3 is stricter — it returns a non-zero code when no test matched unless you pass <code>--allow-running-no-tests</code>.</p>
      <p><b>Test isolation.</b> GoogleTest creates a <b>new fixture object per test</b>, but global and static state survives between tests in the same process. Order dependence shows up as "passes alone, fails in the suite". Flush it out with <code>--gtest_shuffle --gtest_random_seed=N</code> and <code>--gtest_repeat=100</code>; Catch2 has <code>--order rand --rng-seed</code>. CTest-per-test discovery runs each test in its own process, which hides shared-state bugs locally but makes them reproducible in CI.</p>
      <p><b>Exceptions and noexcept.</b> An exception escaping a test body is caught by the framework and reported as a failure, with the <code>what()</code> text. But an exception escaping a <code>noexcept</code> function calls <code>std::terminate</code> and kills the whole binary — the remaining tests never run. That is a death, not a failure, and it is exactly what death tests (next topic) are for.</p>
      <p><b>What makes a good unit test:</b> fast (milliseconds), deterministic (seeded randomness, injected clock), one behaviour per test with a name that reads as a sentence (<code>PopOnEmptyThrows</code>), arrange-act-assert layout, and assertions on <b>observable behaviour</b>, not private state. Tests that need a network, a database or the filesystem are integration tests: keep them in a separate binary or label so the unit suite stays under a few seconds.</p>`,
    aiEra: `<p>AI assistants are very good at producing GoogleTest boilerplate: given a header, they will write a dozen <code>TEST</code>s in seconds. The danger is that those tests often <b>restate the implementation</b> ("expected value" computed by the same formula the code uses), so they pass when the code is wrong. They also love <code>EXPECT_TRUE(result)</code> with no message, which fails with "Value of: result, Actual: false" — useless at 2 a.m. <b>Your job:</b> pick the cases (boundaries, empty input, maximum sizes, error paths), work out expected values independently, choose EXPECT vs ASSERT deliberately, and run the generated suite with <code>--gtest_shuffle</code> and under sanitizers. A good habit is to break the implementation on purpose (flip a <code>&lt;</code>) and check that at least one AI-written test fails — a cheap manual mutation test.</p>`,
    problems: [{
      title: 'Build a Minimal TEST / EXPECT_EQ Framework', level: 'Medium', tags: ['test framework', 'registration', 'macros', 'std::function'], companies: ['Google', 'Bloomberg', 'Microsoft'],
      statement: `<p>Write the heart of an xUnit framework. <code>runSuite(names, checks)</code> must <b>register</b> one test per name into a registry (each test is a callable that, when run, performs <code>EXPECT_EQ(actual, expected)</code> on the consecutive pairs of <code>checks[i]</code>: <code>[a0, e0, a1, e1, ...]</code>), then <b>run</b> every registered test in registration order and return the report:</p><ul><li><code>"OK &lt;name&gt;"</code> if all its checks passed (a test with no checks passes);</li><li><code>"FAILED &lt;name&gt; (k)"</code> where k is the number of failed checks — EXPECT is non-fatal, so all checks run;</li><li>a final line <code>"p/n passed"</code>.</li></ul><p>Use a real registry of <code>{name, std::function&lt;void()&gt;}</code> and a failure counter that the EXPECT macro increments, as GoogleTest does.</p>`,
      constraints: `0 ≤ number of tests ≤ 1000; each checks[i] has even length ≤ 100; values fit in int.`,
      example: `<p>names = [Add.Small, Add.Big], checks = [[2,2,5,5],[7,8]] → ${H.c('g', 'OK Add.Small')}, ${H.c('r', 'FAILED Add.Big (1)')}, <b>1/2 passed</b>. Add.Big compared 7 with 8 once.</p>`,
      brute: { why: `<p>The naive version hard-codes the comparisons in one big function and stops at the first mismatch. It cannot list tests, cannot count failures per test, and a single failing check hides every later one — which is exactly the "fix one, find the next" loop a framework exists to avoid.</p>`, code: R`
        std::vector<std::string> runSuiteNaive(const std::vector<std::string>& names, const std::vector<std::vector<int>>& checks) {
            for (std::size_t i = 0; i < names.size(); ++i)
                for (std::size_t k = 0; k + 1 < checks[i].size(); k += 2)
                    if (checks[i][k] != checks[i][k + 1]) return {"FAILED " + names[i]};   // stops everything at the first failure
            return {"all passed"};
        }` },
      mcq: { q: 'Why does GoogleTest\'s <code>ASSERT_EQ</code> only work in functions returning void?', options: ['It works by executing <code>return;</code> after recording the failure', 'It throws an exception that only void functions can catch', 'It calls <code>std::abort</code>', 'It uses <code>longjmp</code>, which needs a void return'], answer: 0, explain: 'ASSERT_* expands to "record failure; return;". A bare return does not compile in a function that must return a value — hence AssertionResult helpers or ASSERT_NO_FATAL_FAILURE.' },
      hints: [`<p>Hint 1: Separate the three jobs: a registry (vector of name + callable), an assertion that only <i>records</i> (increments a counter, never returns), and a runner that resets the counter before each test.</p>`, `<p>Hint 2: Register lambdas that capture <code>checks[i]</code> by value. A <code>#define EXPECT_EQ(a, b)</code> wrapped in <code>do { ... } while (0)</code> evaluates each side once and increments the counter on mismatch.</p>`, `<p>Hint 3: Recipe: registry.clear(); for each i push {names[i], lambda}; then for each test: failures = 0; body(); push "OK name" or "FAILED name (failures)"; count passes; finally push "p/n passed". Edge cases: zero tests ("0/0 passed"), a test with no checks (passes).</p>`],
      tests: { sig: 'string[] int[][] -> string[]', fn: 'runSuite', cases: [[[["Add.Small","Add.Big"],[[2,2,5,5],[7,8]]],["OK Add.Small","FAILED Add.Big (1)","1/2 passed"]],[[[],[]],["0/0 passed"]],[[["Empty.NoChecks"],[[]]],["OK Empty.NoChecks","1/1 passed"]],[[["A.x"],[[1,2,3,4,5,5]]],["FAILED A.x (2)","0/1 passed"]],[[["S.a","S.b","S.c"],[[0,0],[-1,-1,4,4],[9,9]]],["OK S.a","OK S.b","OK S.c","3/3 passed"]],[[["T.neg"],[[-2147483648,-2147483648,2147483647,-2147483648]]],["FAILED T.neg (1)","0/1 passed"]],[[["P.1","P.2","P.3","P.4"],[[1,0],[2,0],[3,3],[4,0,5,0,6,0]]],["FAILED P.1 (1)","FAILED P.2 (1)","OK P.3","FAILED P.4 (3)","1/4 passed"]]] },
      solution: {
        approach: `<p>Model GoogleTest: a <b>registry</b> of <code>TestCase{name, std::function&lt;void()&gt;}</code>, an <code>EXPECT_EQ</code> macro that increments a per-test failure counter (non-fatal), and a <b>runner</b> that resets the counter, runs each body, and formats the line. Lambdas capture their data by value so the registry owns everything it needs.</p>`,
        code: R`
          #include <functional>
          #include <string>
          #include <vector>

          struct TestCase { std::string name; std::function<void()> body; };

          static std::vector<TestCase>& registry() { static std::vector<TestCase> r; return r; }
          static int& failures() { static int f = 0; return f; }

          // Non-fatal check: record and keep going (like EXPECT_EQ).
          #define MINI_EXPECT_EQ(a, b)                         \
              do {                                             \
                  auto&& lhs_ = (a);                           \
                  auto&& rhs_ = (b);                           \
                  if (!(lhs_ == rhs_)) ++failures();           \
              } while (0)

          std::vector<std::string> runSuite(const std::vector<std::string>& names, const std::vector<std::vector<int>>& checks) {
              registry().clear();
              for (std::size_t i = 0; i < names.size(); ++i) {
                  std::vector<int> c = checks[i];              // captured by value: the test owns its data
                  registry().push_back({names[i], [c] {
                      for (std::size_t k = 0; k + 1 < c.size(); k += 2) MINI_EXPECT_EQ(c[k], c[k + 1]);
                  }});
              }
              std::vector<std::string> report;
              int passed = 0;
              for (const TestCase& t : registry()) {
                  failures() = 0;                              // fresh counter per test
                  t.body();
                  if (failures() == 0) { report.push_back("OK " + t.name); ++passed; }
                  else report.push_back("FAILED " + t.name + " (" + std::to_string(failures()) + ")");
              }
              report.push_back(std::to_string(passed) + "/" + std::to_string(registry().size()) + " passed");
              return report;
          }`,
        dry: { head: ['step', 'registry', 'failures', 'report line'], rows: [
          ['register Add.Small, Add.Big', '[Add.Small, Add.Big]', '-', '-'],
          ['run Add.Small: 2==2, 5==5', '', '0', 'OK Add.Small'],
          ['run Add.Big: 7 vs 8', '', '1', 'FAILED Add.Big (1)'],
          ['summary', '', '', '1/2 passed']] },
        complexity: `<p>O(total checks) time, O(total checks) memory for the captured data.</p>`,
        followUps: ['How would you add ASSERT_EQ (fatal) without exceptions?', 'How would you register tests at static-initialisation time across several .cpp files, and why use a function-local static for the registry?', 'How would you add <code>--filter</code> support?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 2 — Fixtures, parameterised, typed and death tests
     ====================================================================== */
  topics.push({
    title: 'Fixtures, Parameterised, Typed & Death Tests',
    analogy: `<p>A driving school tests every student on the same route. Before each lesson the car is reset — mirrors adjusted, fuel topped up, odometer noted (<b>SetUp</b>); after each lesson it is cleaned (<b>TearDown</b>). The same route is driven in rain, at night and on ice (<b>parameterised</b> runs of one test), in a hatchback and an SUV (<b>typed</b> tests). And one exam checks that the airbag really fires in a crash — you deliberately crash a <i>separate</i> car, not the one with students in it (<b>death test</b>: a forked child process is allowed to die).</p>`,
    explain: `<p><b>Fixtures</b> share setup code. Derive from <code>::testing::Test</code>, put members and <code>SetUp()</code>/<code>TearDown()</code> in it, and write <code>TEST_F(FixtureName, Case)</code>. For <b>each</b> TEST_F GoogleTest constructs a fresh fixture object, calls <code>SetUp</code>, the body, <code>TearDown</code>, then destroys it — tests never see each other's member state. Expensive shared resources go in <code>static void SetUpTestSuite()</code> (once per suite) or a global <code>::testing::Environment</code>.</p>
      <p><b>Value-parameterised tests</b> run one body with many inputs:</p>
      ${H.table(['piece', 'what it does'], [
        ['<code>class AddTest : public ::testing::TestWithParam&lt;std::tuple&lt;int,int,int&gt;&gt; {};</code>', 'declares the parameter type'],
        ['<code>TEST_P(AddTest, Commutes) { auto [a, b, sum] = GetParam(); ... }</code>', 'the body, reading <code>GetParam()</code>'],
        ['<code>INSTANTIATE_TEST_SUITE_P(Small, AddTest, ::testing::Values(...));</code>', 'creates <code>Small/AddTest.Commutes/0</code>, <code>/1</code>, …'],
        ['<code>::testing::Combine(Values(1,2), Bool())</code>', 'cartesian product → 4 instances'],
        ['<code>Range(0, 10, 2)</code>, <code>ValuesIn(vec)</code>', 'generated parameter lists']
      ])}
      <p><b>Typed tests</b> run one body for several <i>types</i>: <code>TYPED_TEST_SUITE(QueueTest, ::testing::Types&lt;int, std::string&gt;)</code> and <code>TYPED_TEST(QueueTest, ...)</code> using <code>TypeParam</code> — perfect for testing a template container or several implementations of one interface. Catch2 has <code>TEMPLATE_TEST_CASE</code> and <code>GENERATE(1, 2, 3)</code> for values.</p>
      <p><b>Death tests</b> check that code <b>crashes or exits</b> as designed: <code>EXPECT_DEATH(stack.pop(), "pop on empty")</code> (dies with stderr matching the regex), <code>EXPECT_EXIT(f(), ::testing::ExitedWithCode(3), "")</code>, <code>::testing::KilledBySignal(SIGSEGV)</code>. GoogleTest forks (or re-executes the binary in "threadsafe" style) so the parent test process survives. Name death-test suites <code>*DeathTest</code> so they run first, before any threads are created.</p>`,
    clues: [
      '"same setup in every test" → fixture with SetUp/TearDown; new object per test',
      '"run this test for 50 inputs" / "table-driven test" → TEST_P + INSTANTIATE_TEST_SUITE_P (Values, ValuesIn, Combine)',
      '"test a template for several types" → TYPED_TEST / Catch2 TEMPLATE_TEST_CASE',
      '"verify an assert()/abort() fires" / "program must exit with code 3" → EXPECT_DEATH / EXPECT_EXIT',
      '"expensive database connection shared by tests" → SetUpTestSuite or a global Environment, not SetUp',
      '"test names like Prefix/Suite.Test/3" → that is a parameterised instance; /3 is the parameter index'
    ],
    code: [{ lang: 'cpp', check: false, title: 'Fixture + parameterised + death test (GoogleTest 1.14)', code: R`
      #include <gtest/gtest.h>
      #include <tuple>
      #include "bank.h"

      class AccountTest : public ::testing::Test {
       protected:
          static void SetUpTestSuite() { db_ = new FakeDb(); }        // once for the whole suite
          static void TearDownTestSuite() { delete db_; db_ = nullptr; }
          void SetUp() override { acct_ = std::make_unique<Account>(*db_, 100); }  // before EACH test
          void TearDown() override { db_->clear(); }                  // after EACH test
          static FakeDb* db_;
          std::unique_ptr<Account> acct_;
      };
      FakeDb* AccountTest::db_ = nullptr;

      TEST_F(AccountTest, DepositAddsToBalance) {
          acct_->deposit(50);
          EXPECT_EQ(acct_->balance(), 150);
      }

      // ---- value-parameterised: (start, withdraw, expectedOk) ----
      class WithdrawTest : public AccountTest,
                           public ::testing::WithParamInterface<std::tuple<int, int, bool>> {};

      TEST_P(WithdrawTest, RespectsBalance) {
          auto [start, amount, expectedOk] = GetParam();   // start is 100 for the fixture's account
          EXPECT_EQ(acct_->withdraw(amount), expectedOk);
      }
      INSTANTIATE_TEST_SUITE_P(Edges, WithdrawTest, ::testing::Values(
          std::make_tuple(100, 0, true), std::make_tuple(100, 100, true), std::make_tuple(100, 101, false)));

      // ---- death test: the suite name ends in DeathTest so it runs first ----
      TEST(AccountDeathTest, NegativeDepositAborts) {
          FakeDb db;
          Account a(db, 0);
          EXPECT_DEATH(a.deposit(-1), "amount must be positive");   // child process must die, stderr must match
      }` }, { lang: 'cpp', check: false, title: 'Typed tests and Catch2 generators', code: R`
      template <typename T> class QueueTest : public ::testing::Test { protected: Queue<T> q_; };
      using QueueTypes = ::testing::Types<int, std::string, std::unique_ptr<int>>;
      TYPED_TEST_SUITE(QueueTest, QueueTypes);
      TYPED_TEST(QueueTest, StartsEmpty) { EXPECT_TRUE(this->q_.empty()); }   // 'this->' needed in templates

      // Catch2 v3
      TEST_CASE("abs is non-negative", "[math]") {
          int x = GENERATE(-5, 0, 7, take(10, random(-1000, 1000)));   // runs the case once per value
          CHECK(std::abs(x) >= 0);
      }` }],
    codeTitle: ['Fixtures, TEST_P and EXPECT_DEATH', 'Typed tests and Catch2 GENERATE'],
    viz: {
      title: 'Expanding INSTANTIATE_TEST_SUITE_P with Combine, and the fixture lifecycle',
      input: 'Edges WithdrawTest RespectsBalance | 0,100 | true,false',
      inputLabel: 'Prefix Suite Test | axis1 values | axis2 values ... (1-3 axes, up to 4 values each)',
      gen: function (input) {
        var parts = txt(input, 'Edges WithdrawTest RespectsBalance | 0,100 | true,false').split('|').map(function (s) { return s.trim(); });
        var head = parts.shift().split(/\s+/);
        if (head.length !== 3) throw new Error('Start with: Prefix Suite Test, e.g. "Edges WithdrawTest RespectsBalance | 0,100 | true,false"');
        if (parts.length < 1 || parts.length > 3) throw new Error('Give 1-3 axes after "|"');
        var axes = parts.map(function (p) { var v = splitList(p, ','); if (!v.length || v.length > 4) throw new Error('Each axis needs 1-4 values'); return v; });
        var combos = [[]];
        axes.forEach(function (ax) { var n = []; combos.forEach(function (c) { ax.forEach(function (v) { n.push(c.concat([v])); }); }); combos = n; });
        var frames = [], names = [];
        frames.push({ narr: '<code>Combine(' + axes.map(function (a) { return 'Values(' + a.join(', ') + ')'; }).join(', ') + ')</code> builds the <b>cartesian product</b>: ' + axes.map(function (a) { return a.length; }).join(' × ') + ' = <b>' + combos.length + '</b> parameter tuples. The <b>last</b> axis varies fastest.',
          parts: [{ type: 'grid', label: 'axes', rows: axes.map(function (a) { return a.slice(); }), rowHead: axes.map(function (_, i) { return 'axis ' + (i + 1); }) }] });
        combos.forEach(function (c, k) {
          names.push(head[0] + '/' + head[1] + '.' + head[2] + '/' + k);
          var hl = {}; hl[k] = 'ok';
          if (k < 6) frames.push({ narr: 'Instance <b>/' + k + '</b> gets <code>GetParam() = ' + (c.length === 1 ? c[0] : '(' + c.join(', ') + ')') + '</code>. Its full name is what <code>--gtest_filter</code> and CTest see.',
            parts: [{ type: 'table', label: 'registered test instances', columns: ['full name', 'GetParam()'], rows: names.map(function (n, i) { return [n, combos[i].length === 1 ? combos[i][0] : '(' + combos[i].join(', ') + ')']; }), hl: hl }] });
        });
        if (combos.length > 6) frames.push({ narr: '…and so on: ' + combos.length + ' instances in total.', parts: [{ type: 'table', label: 'registered test instances', columns: ['full name', 'GetParam()'], rows: names.map(function (n, i) { return [n, combos[i].length === 1 ? combos[i][0] : '(' + combos[i].join(', ') + ')']; }) }] });
        var life = ['construct fixture', 'SetUp()', 'TestBody() with GetParam()', 'TearDown()', 'destroy fixture'];
        life.forEach(function (step, i) {
          var hl = {}; hl[i] = 'cur';
          frames.push({ narr: 'Lifecycle of <b>each</b> instance, step ' + (i + 1) + ': <b>' + step + '</b>. ' + (i === 0 ? 'A brand-new fixture object — members from the previous instance are gone.' : i === 4 ? 'Repeat for every one of the ' + combos.length + ' instances. <code>SetUpTestSuite</code> ran only once, before the first.' : ''),
            parts: [{ type: 'stack', label: 'per-test lifecycle', items: life.slice(), hl: hl }] });
        });
        return frames;
      }
    },
    examples: [
      { title: 'SetUp vs constructor, TearDown vs destructor', html: `<p>Both work for initialisation. Prefer the <b>constructor/destructor</b> for plain member setup (lets members be <code>const</code>, works with RAII). Use <code>SetUp</code> when the code can fail with an <code>ASSERT_*</code> (asserts cannot be used in constructors), or when it calls virtual functions. Use <code>TearDown</code> when cleanup may throw or needs asserts — destructors must not throw.</p>` },
      { title: 'Readable parameter names', html: `<p>By default instances are numbered <code>/0</code>, <code>/1</code>. Pass a name generator as the fourth argument so failures read <code>Edges/WithdrawTest.RespectsBalance/overdraft</code>:</p>`, code: { lang: 'cpp', check: false, code: R`
        INSTANTIATE_TEST_SUITE_P(Edges, WithdrawTest,
            ::testing::Values(std::make_tuple(100, 101, false), std::make_tuple(100, 100, true)),
            [](const ::testing::TestParamInfo<WithdrawTest::ParamType>& info) {
                return std::get<2>(info.param) ? "allowed_" + std::to_string(info.index)
                                               : "overdraft_" + std::to_string(info.index);   // only [A-Za-z0-9_]
            });` } },
      { title: 'Death tests and threads', html: `<p>Forking a process that already has threads copies only the calling thread, so the child may deadlock on a mutex held by a thread that no longer exists. GoogleTest warns "Death tests use fork(), which is unsafe particularly in a threaded context". Fixes: name the suite <code>*DeathTest</code> (run first), or set <code>GTEST_FLAG_SET(death_test_style, "threadsafe")</code>, which re-executes the binary to run only that one test. Death tests are also slower (a process per check) and are not supported on every platform — check <code>GTEST_HAS_DEATH_TEST</code>.</p>` },
      { title: 'What exactly does EXPECT_DEATH match?', html: `<p>The second argument is a regular expression matched against the child's <b>stderr</b>. <code>EXPECT_DEATH(f(), "")</code> accepts any death. The child must <b>die</b>: exit with a non-zero code or be killed by a signal; <code>exit(0)</code> is not a death. To check a specific code or signal, use <code>EXPECT_EXIT(f(), ::testing::ExitedWithCode(2), "usage")</code> or <code>::testing::KilledBySignal(SIGABRT)</code>. Under ASan, the child's crash prints an ASan report, which is still a death.</p>` }
    ],
    deepDive: `<p><b>Parameter generation happens at registration time.</b> <code>INSTANTIATE_TEST_SUITE_P</code> evaluates its generator during static initialisation (before <code>main</code>), so parameters cannot depend on command-line flags or anything set up in <code>main</code>. GoogleTest 1.10+ also fails a <code>TEST_P</code> suite that is never instantiated (opt out with <code>GTEST_ALLOW_UNINSTANTIATED_PARAMETERIZED_TEST</code>). <code>Combine</code> of several large lists explodes combinatorially — 5 axes × 10 values = 100 000 tests; prefer a curated list of edge-case tuples or a property-based approach.</p>
      <p><b>Catch2 SECTIONs are not fixtures.</b> Catch2 re-runs the whole <code>TEST_CASE</code> from the top once per leaf <code>SECTION</code>, executing only one path each time. The code before the sections is "setup", and it runs freshly for every path. Nested sections form a tree; each root-to-leaf path is one run. <code>GENERATE</code> multiplies runs the same way.</p>
      <p><b>How death tests run:</b> in the default "fast" style the framework <code>fork()</code>s; the child runs the statement and must die; the parent <code>waitpid()</code>s and inspects the wait status (exit code or signal) and the captured stderr. In "threadsafe" style the parent re-executes <code>/proc/self/exe</code> with <code>--gtest_internal_run_death_test</code> so the child starts single-threaded. Either way, side effects in the child (memory changes, files written) are not visible to the parent.</p>
      <p><b>Typed vs type-parameterised:</b> <code>TYPED_TEST</code> needs the type list up front; <code>TYPED_TEST_SUITE_P</code> + <code>REGISTER_TYPED_TEST_SUITE_P</code> + <code>INSTANTIATE_TYPED_TEST_SUITE_P</code> lets you write the tests once in a header (an interface conformance suite) and instantiate them for implementations defined later — great for "every <code>Allocator</code> must pass these 20 tests".</p>`,
    aiEra: `<p>Ask an assistant to "make these tests table-driven" and it will usually produce a correct <code>TEST_P</code> + <code>Values(...)</code> — a real productivity win. Watch for: tuples so long nobody can read them (use a small struct with named fields and a <code>PrintTo</code> overload so failures print readably); parameter lists that silently duplicate cases; and death tests generated for code paths that merely <i>throw</i> (use <code>EXPECT_THROW</code>). AI also tends to put expensive setup in <code>SetUp</code>, multiplying suite time by the number of instances. Review the instance count (<code>--gtest_list_tests | wc -l</code>) and suite runtime after any AI refactor.</p>`,
    problems: [{
      title: 'Parameterised Test Name Expander', level: 'Medium', tags: ['parameterised tests', 'cartesian product', 'Combine'], companies: ['Google', 'Nvidia', 'Arista'],
      statement: `<p>Simulate <code>INSTANTIATE_TEST_SUITE_P(prefix, suite, Combine(axes...))</code> for the tests <code>tests</code> of a value-parameterised suite. For each test (in order) and each combination of the axes (cartesian product, <b>last axis varies fastest</b>), output</p><pre>prefix/suite.test/k # GetParam() = P</pre><p>where k is the 0-based combination index and P is the single value if there is exactly one axis, otherwise <code>(v1, v2, ...)</code>. If <code>prefix</code> is empty, omit <code>prefix/</code>. Any empty axis (or no tests) produces no instances.</p>`,
      constraints: `1 ≤ axes ≤ 5, each axis ≤ 10 values, ≤ 20 tests.`,
      example: `<p>prefix Grid, suite ParseTest, tests [Ok], axes [["a","b"],[true,false]] → ${H.c('g', 'Grid/ParseTest.Ok/0 # GetParam() = (a, true)')}, /1 = (a, false), /2 = (b, true), /3 = (b, false).</p>`,
      brute: { why: `<p>Hard-coding nested loops works only for a fixed number of axes (two loops for two axes). As soon as a third axis appears you rewrite the code. The general approach builds the product iteratively, one axis at a time, or uses an odometer of indices.</p>`, code: R`
        std::vector<std::string> expandTwoAxes(const std::string& p, const std::string& s, const std::string& t,
                                               const std::vector<std::string>& a, const std::vector<std::string>& b) {
            std::vector<std::string> out;
            int k = 0;
            for (const auto& x : a)
                for (const auto& y : b)        // only ever handles exactly two axes
                    out.push_back(p + "/" + s + "." + t + "/" + std::to_string(k++) + " # GetParam() = (" + x + ", " + y + ")");
            return out;
        }` },
      mcq: { q: '<code>Combine(Values(1, 2, 3), Bool(), Values(\'a\', \'b\'))</code> creates how many instances per TEST_P?', options: ['12', '7', '6', '3'], answer: 0, explain: 'Cartesian product: 3 × 2 × 2 = 12.' },
      hints: [`<p>Hint 1: The product of axes can be built one axis at a time: start with one empty tuple, then for each axis replace every tuple t with t+v for each value v.</p>`, `<p>Hint 2: Appending the new axis innermost (for each old tuple, for each value) makes the last axis vary fastest — the same order as GoogleTest's Combine.</p>`, `<p>Hint 3: Format: join values with ", " in parentheses when there is more than one axis. The index k restarts at 0 for every test name. An empty axis makes the product empty — handle it naturally, no special case needed.</p>`],
      tests: { sig: 'string string string[] string[][] -> string[]', fn: 'expandParams', cases: [[["Ints","AddTest",["Commutes"],[["1","2","3"]]],["Ints/AddTest.Commutes/0 # GetParam() = 1","Ints/AddTest.Commutes/1 # GetParam() = 2","Ints/AddTest.Commutes/2 # GetParam() = 3"]],[["Grid","ParseTest",["Ok","Bad"],[["\"a\"","\"b\""],["true","false"]]],["Grid/ParseTest.Ok/0 # GetParam() = (\"a\", true)","Grid/ParseTest.Ok/1 # GetParam() = (\"a\", false)","Grid/ParseTest.Ok/2 # GetParam() = (\"b\", true)","Grid/ParseTest.Ok/3 # GetParam() = (\"b\", false)","Grid/ParseTest.Bad/0 # GetParam() = (\"a\", true)","Grid/ParseTest.Bad/1 # GetParam() = (\"a\", false)","Grid/ParseTest.Bad/2 # GetParam() = (\"b\", true)","Grid/ParseTest.Bad/3 # GetParam() = (\"b\", false)"]],[["","S",["T"],[["0"]]],["S.T/0 # GetParam() = 0"]],[["X","S",["T"],[["1","2"],[]]],[]],[["X","S",[],[["1"]]],[]],[["P","Q",["R"],[["a","b"],["c"],["d","e"]]],["P/Q.R/0 # GetParam() = (a, c, d)","P/Q.R/1 # GetParam() = (a, c, e)","P/Q.R/2 # GetParam() = (b, c, d)","P/Q.R/3 # GetParam() = (b, c, e)"]]] },
      solution: {
        approach: `<p>Build the cartesian product iteratively (each axis multiplies the list of partial tuples), then for each test emit one name per tuple with its index. This is exactly what <code>::testing::Combine</code> does with its generator of <code>std::tuple</code>s.</p>`,
        code: R`
          #include <string>
          #include <vector>

          std::vector<std::string> expandParams(const std::string& prefix, const std::string& suite,
                                                const std::vector<std::string>& tests,
                                                const std::vector<std::vector<std::string>>& axes) {
              std::vector<std::vector<std::string>> combos{{}};            // one empty tuple
              for (const auto& axis : axes) {
                  std::vector<std::vector<std::string>> next;
                  for (const auto& partial : combos)
                      for (const auto& v : axis) {                         // new axis innermost: varies fastest
                          auto t = partial;
                          t.push_back(v);
                          next.push_back(std::move(t));
                      }
                  combos = std::move(next);
              }
              auto show = [](const std::vector<std::string>& t) {
                  if (t.size() == 1) return t[0];
                  std::string s = "(";
                  for (std::size_t i = 0; i < t.size(); ++i) s += (i ? ", " : "") + t[i];
                  return s + ")";
              };
              std::vector<std::string> out;
              const std::string head = prefix.empty() ? suite : prefix + "/" + suite;
              for (const auto& test : tests)
                  for (std::size_t k = 0; k < combos.size(); ++k)
                      out.push_back(head + "." + test + "/" + std::to_string(k) + " # GetParam() = " + show(combos[k]));
              return out;
          }`,
        dry: { head: ['after axis', 'combos'], rows: [['start', '[()]'], ['["a","b"]', '[(a), (b)]'], ['[true,false]', '[(a,true), (a,false), (b,true), (b,false)]'], ['emit for Ok', 'Grid/ParseTest.Ok/0..3']] },
        complexity: `<p>O(T × Π|axis| × A) time and output size, where A is the number of axes — the output itself is that large.</p>`,
        followUps: ['How would you add a name generator so instances get readable names?', 'How would you choose a small covering subset instead of the full product (pairwise testing)?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 3 — GoogleMock
     ====================================================================== */
  topics.push({
    title: 'Mocking with GoogleMock: Seams, Expectations and Matchers',
    analogy: `<p>A flight simulator lets pilots practise engine failures without crashing a real plane. The cockpit is real; everything outside the window is fake but <b>scripted</b>: "at 3 000 ft, engine 2 will report fire; I expect the pilot to pull handle 2 exactly once." Afterwards the instructor checks the script against what really happened. A mock object is that simulator: your real code (the pilot) talks to a fake dependency that both <b>plays scripted answers</b> and <b>checks the calls</b> it received.</p>`,
    explain: `<p><b>The plain idea:</b> to unit-test code that talks to a database, network or clock, you replace the dependency with a fake you control. In C++ that needs a <b>seam</b> — a place where the dependency can be swapped:</p>
      ${H.table(['seam', 'how', 'cost'], [
        ['<b>interface + virtual</b> (most common)', 'code depends on <code>struct Mailer { virtual bool send(...) = 0; }</code>; tests pass a <code>MockMailer</code>', 'one virtual call; needs the code to accept the interface (constructor injection)'],
        ['<b>template parameter</b> ("hi-perf dependency injection")', '<code>template &lt;class Clock&gt; class Cache</code>; tests use <code>Cache&lt;FakeClock&gt;</code>', 'zero runtime cost; code must be a template'],
        ['<b>link seam</b>', 'link a different <code>.cpp</code> that defines the same free function', 'no code change; one fake per test binary'],
        ['<b>function object</b>', 'pass <code>std::function&lt;Time()&gt;</code>', 'simple for one function']
      ])}
      <p><b>GoogleMock</b> (part of GoogleTest) generates the fake for an interface: <code>MOCK_METHOD(bool, send, (const std::string&amp; to, const std::string&amp; body), (override));</code>. In the test you set <b>expectations</b> before exercising the code:</p>
      <ul><li><code>EXPECT_CALL(mailer, send("bob@x.com", _)).Times(1).WillOnce(Return(true));</code> — must be called exactly once with that first argument; returns true.</li>
      <li><b>Matchers</b> describe arguments: <code>_</code> (anything), <code>Eq(5)</code>, <code>Gt(0)</code>, <code>HasSubstr("err")</code>, <code>ElementsAre(1, 2)</code>, <code>Field(&amp;Order::id, 7)</code>, <code>AllOf(...)</code>.</li>
      <li><b>Cardinalities</b>: <code>Times(2)</code>, <code>AtLeast(1)</code>, <code>AtMost(3)</code>, <code>Between(1, 3)</code>; without <code>Times</code> it is inferred from the number of <code>WillOnce</code>s.</li>
      <li><b>Actions</b>: <code>Return(x)</code>, <code>ReturnRef</code>, <code>Throw(e)</code>, <code>SetArgReferee&lt;1&gt;(v)</code>, <code>Invoke(f)</code>, <code>DoAll(...)</code>; <code>ON_CALL(...).WillByDefault(...)</code> sets a default without making it an expectation.</li></ul>
      <p>Expectations are <b>verified when the mock is destroyed</b> (end of the test): any call count outside its cardinality is reported as a failure. Calls that match no expectation are "uninteresting" (a warning with <code>NaggyMock</code>, the default; silent with <code>NiceMock</code>; a failure with <code>StrictMock</code>).</p>`,
    clues: [
      '"how do you test code that sends emails / hits the DB / reads the clock" → seam + fake or mock',
      '"verify the function was called exactly once with these arguments" → EXPECT_CALL + matcher + Times',
      '"stub vs mock vs fake" → stub returns canned data, mock also verifies calls, fake is a working lightweight implementation',
      '"the class news its own dependency inside" → no seam; refactor to constructor injection first',
      '"Uninteresting mock function call" warning → NiceMock / StrictMock / add an EXPECT_CALL',
      '"zero-overhead mocking" / "no virtual functions allowed" → template-parameter injection'
    ],
    code: [{ lang: 'cpp', check: false, title: 'An interface, its GoogleMock and a test (link GTest::gmock_main)', code: R`
      #include <gmock/gmock.h>
      #include <gtest/gtest.h>
      #include <string>

      struct Mailer {                                      // the seam
          virtual ~Mailer() = default;
          virtual bool send(const std::string& to, const std::string& body) = 0;
      };

      class Signup {                                       // code under test: dependency injected
       public:
          explicit Signup(Mailer& m) : mailer_(m) {}
          bool registerUser(const std::string& email) {
              if (email.find('@') == std::string::npos) return false;
              return mailer_.send(email, "Welcome!");
          }
       private:
          Mailer& mailer_;
      };

      class MockMailer : public Mailer {
       public:
          MOCK_METHOD(bool, send, (const std::string& to, const std::string& body), (override));
      };

      using ::testing::_;
      using ::testing::HasSubstr;
      using ::testing::Return;
      using ::testing::StrictMock;

      TEST(SignupTest, SendsWelcomeMail) {
          StrictMock<MockMailer> mailer;                   // any unexpected call fails the test
          EXPECT_CALL(mailer, send("bob@x.com", HasSubstr("Welcome")))
              .Times(1)
              .WillOnce(Return(true));
          Signup s(mailer);
          EXPECT_TRUE(s.registerUser("bob@x.com"));
      }                                                    // expectations verified here, when mailer dies

      TEST(SignupTest, RejectsBadEmailWithoutSending) {
          StrictMock<MockMailer> mailer;
          EXPECT_CALL(mailer, send(_, _)).Times(0);
          Signup s(mailer);
          EXPECT_FALSE(s.registerUser("not-an-email"));
      }` }, R`
      // Template-parameter injection: a seam with zero runtime overhead, and a hand-written fake.
      #include <cstdint>
      #include <string>
      #include <unordered_map>

      struct SteadyClock { static std::int64_t nowMs(); };          // production clock (defined elsewhere)

      struct FakeClock {                                             // test double: time moves only when told
          static inline std::int64_t t = 0;
          static std::int64_t nowMs() { return t; }
      };

      template <class Clock>
      class TtlCache {
       public:
          explicit TtlCache(std::int64_t ttlMs) : ttl_(ttlMs) {}
          void put(const std::string& k, int v) { data_[k] = {v, Clock::nowMs() + ttl_}; }
          bool get(const std::string& k, int& out) const {
              auto it = data_.find(k);
              if (it == data_.end() || Clock::nowMs() >= it->second.expires) return false;
              out = it->second.value;
              return true;
          }
       private:
          struct Entry { int value; std::int64_t expires; };
          std::int64_t ttl_;
          std::unordered_map<std::string, Entry> data_;
      };

      bool demoExpiry() {
          TtlCache<FakeClock> c(100);
          FakeClock::t = 0;
          c.put("a", 1);
          int v = 0;
          bool fresh = c.get("a", v);           // true at t = 0
          FakeClock::t = 100;                    // jump time instantly: no sleep in tests
          bool expired = !c.get("a", v);        // true at t = 100
          return fresh && expired;
      }`],
    codeTitle: ['GoogleMock: MOCK_METHOD, EXPECT_CALL, matchers', 'Template injection + a fake clock (compiles)'],
    viz: {
      title: 'How a mock checks expectations (StrictMock semantics)',
      input: 'expect send 2; expect close 1; call send; call send; call send; call open',
      inputLabel: 'Commands separated by ";" — expect NAME N, call NAME (up to 14 commands)',
      gen: function (input) {
        var cmds = splitList(txt(input, 'expect send 2; expect close 1; call send; call send; call send; call open'), ';');
        if (!cmds.length || cmds.length > 14) throw new Error('Give 1-14 commands like "expect send 2; call send"');
        var exp = {}, cnt = {}, frames = [], log = [];
        function table() {
          var names = Object.keys(exp).concat(Object.keys(cnt)).filter(function (n, i, a) { return a.indexOf(n) === i; }).sort();
          return { type: 'table', label: 'expectations vs actual calls', columns: ['method', 'expected', 'called', 'status'], rows: names.map(function (n) {
            var e = exp[n], c = cnt[n] || 0;
            return [n, e === undefined ? '— (none)' : String(e), String(c), e === undefined ? (c ? 'unexpected' : '') : c > e ? 'over-saturated' : c < e ? 'not yet satisfied' : 'satisfied'];
          }) };
        }
        frames.push({ narr: 'The test creates <code>StrictMock&lt;MockMailer&gt;</code>. It starts with no expectations: any call right now would be an <b>unexpected call</b> failure.', parts: [table()] });
        cmds.forEach(function (c) {
          var m = c.match(/^(expect)\s+(\w+)\s+(\d+)$/) || c.match(/^(call)\s+(\w+)$/);
          if (!m) throw new Error('Unknown command "' + c + '". Use "expect NAME N" or "call NAME"');
          if (m[1] === 'expect') {
            exp[m[2]] = +m[3];
            frames.push({ narr: '<code>EXPECT_CALL(mock, ' + m[2] + '(_)).Times(' + m[3] + ')</code> — recorded <b>before</b> the code under test runs.', parts: [table()] });
          } else {
            cnt[m[2]] = (cnt[m[2]] || 0) + 1;
            var e = exp[m[2]], ok = e !== undefined && cnt[m[2]] <= e;
            log.push((ok ? '✓ ' : '✗ ') + m[2] + '()');
            frames.push({ narr: 'The code under test calls <code>' + m[2] + '()</code>. ' + (e === undefined ? '<span class="c-r">No expectation matches — StrictMock fails the test immediately ("Unexpected mock function call").</span>' : ok ? 'Call #' + cnt[m[2]] + ' of ' + e + ' allowed: the action (e.g. <code>Return(true)</code>) runs.' : '<span class="c-r">Call #' + cnt[m[2]] + ' exceeds Times(' + e + '): "Mock function called more times than expected — over-saturated".</span>'),
              parts: [table(), { type: 'queue', label: 'call log', items: log.slice(), hl: (function () { var h = {}; h[log.length - 1] = ok ? 'ok' : 'bad'; return h; })() }] });
          }
        });
        var problems = Object.keys(exp).filter(function (n) { return (cnt[n] || 0) !== exp[n]; }).map(function (n) { return n + ': expected ' + exp[n] + ', called ' + (cnt[n] || 0); });
        frames.push({ narr: 'End of the test: the mock is <b>destroyed</b> and verifies every expectation. ' + (problems.length ? '<span class="c-r">' + problems.length + ' unsatisfied or over-saturated expectation(s)</span> are reported as failures.' : '<span class="c-g">Every expectation was met.</span>'),
          parts: [table(), note(problems.length ? problems.join('<br>') : 'no verification failures', 'verification at destruction')] });
        return frames;
      }
    },
    examples: [
      { title: 'Stub, fake, mock, spy: say the right word', html: `${H.table(['double', 'what it does', 'example'], [['dummy', 'passed but never used', 'a null logger'], ['stub', 'returns canned answers, no checks', '<code>ON_CALL(db, get(_)).WillByDefault(Return(42))</code>'], ['fake', 'a real, simplified implementation', 'in-memory key-value store instead of Redis'], ['mock', 'canned answers <b>and</b> verifies calls', '<code>EXPECT_CALL(...).Times(1)</code>'], ['spy', 'real object that records calls for later asserts', 'wrapper counting <code>send()</code> calls']])}<p>Prefer fakes and stubs for queries ("what does the DB return?") and mocks only for <b>commands</b> whose side effect is the point ("an email must be sent exactly once").</p>` },
      { title: 'Ordering with InSequence', html: `<p>By default expectations can be satisfied in any order. To require "open, then write, then close", put them in a sequence. Also note the matching rule: GoogleMock searches expectations from the <b>newest to the oldest</b>, so put general expectations first and specific ones after.</p>`, code: { lang: 'cpp', check: false, code: R`
        {
            ::testing::InSequence seq;
            EXPECT_CALL(file, open("log.txt")).WillOnce(Return(true));
            EXPECT_CALL(file, write(_)).Times(AtLeast(1));
            EXPECT_CALL(file, close());
        }
        // Newest-first matching: the specific expectation must come AFTER the catch-all.
        EXPECT_CALL(db, query(_)).WillRepeatedly(Return(Rows{}));
        EXPECT_CALL(db, query(HasSubstr("users"))).WillOnce(Return(Rows{{"bob"}}));` } },
      { title: 'Mocking a non-virtual or third-party class', html: `<p>You cannot <code>MOCK_METHOD</code> a non-virtual function and have production code call the mock. Options: wrap the third-party class in your own small interface (an <b>adapter</b>, recommended — it also limits how much of the library leaks into your code), use template injection, or use a link seam. Mocking types you do not own directly couples tests to their API and breaks on every library upgrade.</p>` },
      { title: 'Over-mocking smell', html: `<p>A test with 15 <code>EXPECT_CALL</code>s that mirror the implementation line by line breaks on every refactor even when behaviour is unchanged. Signs: expecting calls on getters, <code>InSequence</code> everywhere, mocks returning mocks. Fix: test through the public behaviour, use fakes for collaborators, and mock only the boundary where the side effect matters.</p>` }
    ],
    deepDive: `<p><b>Destruction-time verification</b> has a sharp edge: if the mock is leaked (e.g. owned by a <code>shared_ptr</code> cycle or a singleton), it is never destroyed and its expectations are <b>never checked</b> — the test is green no matter what. GoogleMock reports leaked mocks at program exit when <code>--gmock_catch_leaked_mocks</code> is on (the default), and you can force an early check with <code>::testing::Mock::VerifyAndClearExpectations(&amp;mock)</code>.</p>
      <p><b>Matching algorithm:</b> on each call GoogleMock walks expectations newest-first and picks the first <b>active</b> one whose matchers accept the arguments. An expectation becomes inactive when it is retired (<code>.RetiresOnSaturation()</code>) or when a prerequisite in a sequence is unmet. If the newest matching expectation is already saturated, the call is an <b>over-saturation</b> failure — it does not fall through to older ones unless they are retired. This explains many "why did it pick that expectation?" puzzles.</p>
      <p><b>Threading:</b> mocks are thread-safe for calls, but expectations must be set before other threads call the mock. Combine with TSan to find races in the code under test, not in GoogleMock itself.</p>
      <p><b>Cost:</b> each <code>MOCK_METHOD</code> instantiates heavy templates; large mock headers noticeably slow compilation. Keep mocks in their own header, mock narrow interfaces (interface segregation), and do not mock value types.</p>`,
    aiEra: `<p>Mocks are the area where AI-written tests most often look impressive but prove little: an assistant will mock every collaborator, expect every call in implementation order, and assert on the mocked return values — a test that can only fail when someone refactors. Use AI to generate the <code>MOCK_METHOD</code> lines from an interface (pure boilerplate, it is good at that) and to suggest matchers, but decide yourself <b>which</b> interactions are part of the contract. A useful review question for any AI-generated mock test: "if I deleted the production code and returned the expected values directly, would this test still pass?"</p>`,
    problems: [{
      title: 'A Hand-Rolled Strict Mock Verifier', level: 'Medium', tags: ['mocking', 'expectations', 'design', 'GoogleMock'], companies: ['Google', 'Meta', 'Bloomberg'],
      statement: `<p>Implement the bookkeeping behind <code>StrictMock</code> + <code>EXPECT_CALL(...).Times(n)</code>:</p><ul><li><code>MockCalls()</code> — no expectations yet.</li><li><code>expectCall(name, times)</code> — expect method <code>name</code> to be called exactly <code>times</code> times in total (a later call for the same name replaces the number; calls already made still count).</li><li><code>call(name) → bool</code> — record one call; return <code>true</code> if the method has an expectation and this call is within its count, otherwise <code>false</code> (unexpected or over-saturated).</li><li><code>verify() → string[]</code> — problems sorted by method name: <code>"m: expected N, called K"</code> for each expected method with K ≠ N, and <code>"m: unexpected, called K"</code> for each method called without any expectation.</li></ul>`,
      constraints: `≤ 10<sup>4</sup> operations; names are short identifiers.`,
      example: `<p>expectCall(send, 2); call(send) → ${H.c('g', 'true')}; call(send) → ${H.c('g', 'true')}; call(send) → ${H.c('r', 'false')}; verify() → ["send: expected 2, called 3"].</p>`,
      brute: { why: `<p>Storing every call in a vector and recounting on each <code>call()</code> and <code>verify()</code> is O(calls) per operation and O(n²) overall. Two hash maps (expected count, actual count) make each call O(1) and verification O(m log m) for sorting m method names.</p>`, code: R`
        #include <string>
        #include <vector>
        struct MockCallsSlow {
            std::vector<std::pair<std::string, int>> expected;
            std::vector<std::string> calls;
            bool call(const std::string& n) {
                calls.push_back(n);
                int c = 0;
                for (const auto& x : calls) c += (x == n);          // recount everything on every call
                for (const auto& e : expected) if (e.first == n) return c <= e.second;
                return false;
            }
        };` },
      mcq: { q: 'With <code>EXPECT_CALL(m, f()).Times(2)</code>, the code calls <code>f()</code> once. When is the failure reported?', options: ['When the mock object is destroyed (or VerifyAndClearExpectations is called)', 'Immediately at the first call', 'Never — Times is only a hint', 'At the next EXPECT_CALL'], answer: 0, explain: 'Too few calls can only be known at the end, so GoogleMock verifies unsatisfied expectations when the mock is destroyed. Too many calls fail immediately.' },
      hints: [`<p>Hint 1: Two maps are enough: expected[name] and called[name]. A call is "allowed" iff the name is in expected and called[name] (after incrementing) ≤ expected[name].</p>`, `<p>Hint 2: Use an ordered map (<code>std::map</code>) for the call counts so verify() can iterate names in sorted order without a separate sort.</p>`, `<p>Hint 3: verify(): walk the union of names in order; if expected has it and counts differ → "expected N, called K"; if expected lacks it and K > 0 → "unexpected, called K". An expectation of 0 calls that is met produces nothing.</p>`],
      tests: { cls: 'MockCalls', sigs: { MockCalls: '', expectCall: 'string int -> void', call: 'string -> bool', verify: '-> string[]' }, cases: [
        { ops: ['MockCalls', 'expectCall', 'call', 'call', 'call', 'verify'], args: [[], ['send', 2], ['send'], ['send'], ['send'], []], out: [null, null, true, true, false, ['send: expected 2, called 3']] },
        { ops: ['MockCalls', 'expectCall', 'verify'], args: [[], ['close', 1], []], out: [null, null, ['close: expected 1, called 0']] },
        { ops: ['MockCalls', 'call', 'verify'], args: [[], ['open'], []], out: [null, false, ['open: unexpected, called 1']] },
        { ops: ['MockCalls', 'verify'], args: [[], []], out: [null, []] },
        { ops: ['MockCalls', 'expectCall', 'expectCall', 'call', 'call', 'call', 'call', 'verify'], args: [[], ['b', 1], ['a', 0], ['b'], ['a'], ['z'], ['z'], []], out: [null, null, null, true, false, false, false, ['a: expected 0, called 1', 'z: unexpected, called 2']] },
        { ops: ['MockCalls', 'expectCall', 'call', 'expectCall', 'call', 'verify'], args: [[], ['x', 1], ['x'], ['x', 2], ['x'], []], out: [null, null, true, null, true, []] },
        { ops: ['MockCalls', 'call', 'expectCall', 'call', 'verify'], args: [[], ['log'], ['log', 2], ['log'], []], out: [null, false, null, true, []] }
      ] },
      solution: {
        approach: `<p>Keep two sorted maps, <code>std::map&lt;string,int&gt; expected</code> and <code>called</code>. <code>call</code> increments and compares; <code>verify</code> walks the union of names in sorted order. This is GoogleMock's cardinality check without matchers.</p>`,
        code: R`
          #include <map>
          #include <string>
          #include <vector>

          class MockCalls {
           public:
              void expectCall(const std::string& name, int times) { expected_[name] = times; }

              bool call(const std::string& name) {
                  int c = ++called_[name];
                  auto it = expected_.find(name);
                  return it != expected_.end() && c <= it->second;   // false = unexpected or over-saturated
              }

              std::vector<std::string> verify() const {
                  std::map<std::string, int> names(called_.begin(), called_.end());
                  for (const auto& [n, _] : expected_) names.emplace(n, 0);   // emplace keeps existing counts
                  std::vector<std::string> problems;
                  for (const auto& [n, k] : names) {
                      auto it = expected_.find(n);
                      if (it == expected_.end()) {
                          if (k > 0) problems.push_back(n + ": unexpected, called " + std::to_string(k));
                      } else if (k != it->second) {
                          problems.push_back(n + ": expected " + std::to_string(it->second) + ", called " + std::to_string(k));
                      }
                  }
                  return problems;
              }

           private:
              std::map<std::string, int> expected_;
              std::map<std::string, int> called_;
          };`,
        dry: { head: ['op', 'expected', 'called', 'result'], rows: [['expectCall(send,2)', 'send:2', '', ''], ['call(send)', 'send:2', 'send:1', 'true'], ['call(send)', 'send:2', 'send:2', 'true'], ['call(send)', 'send:2', 'send:3', 'false (over-saturated)'], ['verify()', '', '', '["send: expected 2, called 3"]']] },
        complexity: `<p><code>call</code>: O(log m). <code>verify</code>: O(m log m) for m distinct names.</p>`,
        followUps: ['Add argument matchers: how would you store several expectations per method and pick the newest matching one?', 'How would you support InSequence ordering?', 'What happens to verification if the mock is leaked?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 4 — Sanitizers in depth + Valgrind
     ====================================================================== */
  function asanSim(ops) {
    var blocks = {}, order = [], reports = [], steps = [];
    ops.forEach(function (o) {
      var p = o.split(/\s+/), kind = p[0], name = p[1], r = null, vg = null;
      if (kind === 'alloc') {
        var n = parseInt(p[2], 10);
        if (!(n >= 1 && n <= 64)) throw new Error('alloc needs a size 1-64, e.g. "alloc p 10"');
        blocks[name] = { n: n, live: true }; order.push(name);
      } else if (kind === 'free') {
        var b = blocks[name];
        if (!b) { r = 'bad-free ' + name; vg = 'Invalid free() / delete / delete[] / realloc()'; }
        else if (!b.live) { r = 'double-free ' + name; vg = 'Invalid free() — Address is 0 bytes inside a block of size ' + b.n + " free'd"; }
        else b.live = false;
      } else if (kind === 'read' || kind === 'write') {
        var i = parseInt(p[2], 10), bb = blocks[name], K = kind.toUpperCase();
        if (isNaN(i)) throw new Error('"' + o + '" needs an index');
        if (!bb) { r = 'wild-access ' + K + ' ' + name + '[' + i + ']'; vg = 'Invalid ' + kind + ' of size 1 — Address is not stack\'d, malloc\'d or (recently) free\'d'; }
        else if (!bb.live) { r = 'heap-use-after-free ' + K + ' ' + name + '[' + i + ']'; vg = 'Invalid ' + kind + ' of size 1 — Address is ' + i + ' bytes inside a block of size ' + bb.n + " free'd"; }
        else if (i < 0 || i >= bb.n) { r = 'heap-buffer-overflow ' + K + ' ' + name + '[' + i + ']'; vg = 'Invalid ' + kind + ' of size 1 — Address is ' + (i < 0 ? (-i) + ' bytes before' : (i - bb.n) + ' bytes after') + ' a block of size ' + bb.n + " alloc'd"; }
      } else throw new Error('Unknown command "' + o + '". Use alloc NAME N, read NAME i, write NAME i, free NAME');
      if (r) reports.push(r);
      steps.push({ op: o, report: r, vg: vg, blocks: JSON.parse(JSON.stringify(blocks)) });
    });
    var leaks = [];
    var last = {}; order.forEach(function (n, k) { last[n] = k; });
    order.forEach(function (n, k) { if (last[n] === k && blocks[n].live) leaks.push('leak ' + n + ' ' + blocks[n].n); });
    return { steps: steps, reports: reports, leaks: leaks };
  }

  topics.push({
    title: 'Sanitizers in Depth & Valgrind: Choosing, Configuring and Reading Reports',
    analogy: `<p>A building has two kinds of safety inspection. The first is <b>built into the walls</b> during construction: smoke detectors in every room, wired in from day one — cheap to run, but you had to plan them before building (sanitizers: recompile with instrumentation). The second is an <b>inspector who visits an existing building</b> and follows every person around with a clipboard — no rebuilding needed, but everything happens 20–50× slower because each step is watched (Valgrind: runs your unchanged binary on a simulated CPU). Professionals use both, for different jobs.</p>`,
    explain: `<p>C++ 12 introduced the sanitizer family and how ASan's shadow memory works. Here we go further: <b>how to run them in a real project</b>, how to configure and suppress, and when Valgrind is still the right tool.</p>
      ${H.table(['need', 'tool', 'key flags / options'], [
        ['memory errors in tests (fast)', 'ASan + UBSan', '<code>-fsanitize=address,undefined -fno-omit-frame-pointer -g -O1</code>; <code>ASAN_OPTIONS=detect_leaks=1:abort_on_error=1:detect_stack_use_after_return=1</code>'],
        ['make UB fatal in CI', 'UBSan', '<code>-fno-sanitize-recover=undefined</code> or <code>UBSAN_OPTIONS=halt_on_error=1:print_stacktrace=1</code>'],
        ['data races, lock-order inversion', 'TSan (separate build)', '<code>-fsanitize=thread</code>; <code>TSAN_OPTIONS=second_deadlock_stack=1:history_size=7</code>'],
        ['uninitialised reads', 'MSan (Clang, everything instrumented incl. libc++)', '<code>-fsanitize=memory -fsanitize-memory-track-origins=2</code>'],
        ['leaks only, no slowdown during run', 'LSan standalone', '<code>-fsanitize=leak</code>'],
        ['binary you cannot rebuild / uninitialised reads without MSan', 'Valgrind Memcheck', '<code>valgrind --leak-check=full --show-leak-kinds=all --track-origins=yes --error-exitcode=1 ./app</code>'],
        ['heap profile / cache simulation / races', 'Valgrind Massif / Cachegrind / Helgrind, DRD', '<code>valgrind --tool=massif ./app</code>']
      ])}
      <p><b>Reading an ASan report in 4 steps:</b> (1) the headline names the bug class: <code>heap-buffer-overflow</code>, <code>heap-use-after-free</code>, <code>stack-use-after-scope</code>, <code>double-free</code>, <code>alloc-dealloc-mismatch</code> (<code>new[]</code> freed with <code>delete</code>); (2) <code>READ of size 4 ... #0 in f() file.cpp:12</code> — the bad access and its stack; (3) "0x... is located 0 bytes to the right of 40-byte region" — the geometry; (4) "allocated by thread T0 here" and, for UAF, "freed by thread T0 here" — the <b>history</b>. The bug is usually where the stacks from (2) and (4) disagree about who owns the memory.</p>
      <p><b>Valgrind's equivalent words:</b> "Invalid read of size 4 … Address 0x… is 0 bytes after a block of size 40 alloc'd" (overflow), "… inside a block of size 40 free'd" (use-after-free), "Conditional jump or move depends on uninitialised value(s)" (needs <code>--track-origins=yes</code> to see where it came from), and the leak summary: <b>definitely lost</b> (no pointer anywhere — a real leak), <b>indirectly lost</b> (only reachable from a lost block), <b>possibly lost</b> (only interior pointers), <b>still reachable</b> (globals still pointing at it at exit — often fine).</p>`,
    clues: [
      '"crash only in release / only on the customer machine" → ASan+UBSan build of the tests; Valgrind on the shipped binary',
      '"no source / third-party .so" → Valgrind (no recompilation) rather than sanitizers',
      '"definitely lost vs still reachable" → Valgrind leak kinds; only definitely/indirectly lost are real leaks',
      '"report points at std::vector internals" → read down the stack to the first frame in your code',
      '"false positive in a library we cannot fix" → suppression file / ignorelist, not disabling the sanitizer',
      '"can I combine ASan and TSan?" → no; separate CI jobs (ASan+UBSan, TSan, MSan)'
    ],
    code: [{ lang: 'bash', title: 'Running and configuring sanitizers and Valgrind', code: R`
      # ASan + UBSan test build (Clang or GCC)
      clang++ -std=c++20 -g -O1 -fno-omit-frame-pointer \
              -fsanitize=address,undefined -fno-sanitize-recover=undefined \
              tests.cpp -o tests_asan
      ASAN_OPTIONS=detect_leaks=1:abort_on_error=1:strict_string_checks=1:detect_stack_use_after_return=1 \
      UBSAN_OPTIONS=print_stacktrace=1 ./tests_asan

      # Suppress a known leak in a third-party library (LSan) and a race in vendored code (TSan)
      echo "leak:libthirdparty.so" > lsan.supp
      LSAN_OPTIONS=suppressions=lsan.supp ./tests_asan
      echo "race:vendor/legacy_cache.cpp" > tsan.supp
      TSAN_OPTIONS=suppressions=tsan.supp:halt_on_error=1 ./tests_tsan

      # Compile-time ignorelist: do not instrument a hot, audited function
      echo "fun:fast_hash*" > asan_ignore.txt
      clang++ -fsanitize=address -fsanitize-ignorelist=asan_ignore.txt ...

      # Valgrind on an unmodified debug binary (no sanitizer flags!)
      valgrind --leak-check=full --show-leak-kinds=definite,indirect \
               --track-origins=yes --error-exitcode=1 ./app_debug
      valgrind --tool=massif ./app && ms_print massif.out.*     # heap profile over time` },
    { lang: 'text', title: 'The same use-after-free, as ASan and as Valgrind report it', code: R`
      ==31337==ERROR: AddressSanitizer: heap-use-after-free on address 0x602000000010 at pc 0x55d4 bp 0x7ffd sp 0x7ffd
      READ of size 4 at 0x602000000010 thread T0
          #0 0x55d4 in Session::user() const session.cpp:42
          #1 0x55d5 in handle(Request const&) server.cpp:88
      0x602000000010 is located 0 bytes inside of 16-byte region [0x602000000010,0x602000000020)
      freed by thread T0 here:
          #0 0x7f12 in operator delete(void*)
          #1 0x55d6 in SessionCache::evict() cache.cpp:17
      previously allocated by thread T0 here:
          #0 0x7f13 in operator new(unsigned long)
          #1 0x55d7 in SessionCache::create() cache.cpp:9
      SUMMARY: AddressSanitizer: heap-use-after-free session.cpp:42 in Session::user() const

      ==4242== Invalid read of size 4
      ==4242==    at 0x109A4B: Session::user() const (session.cpp:42)
      ==4242==    by 0x109C10: handle(Request const&) (server.cpp:88)
      ==4242==  Address 0x4dd0c80 is 0 bytes inside a block of size 16 free'd
      ==4242==    at 0x484399B: operator delete(void*) (vg_replace_malloc.c:1051)
      ==4242==    by 0x109B22: SessionCache::evict() (cache.cpp:17)
      ==4242==  Block was alloc'd at
      ==4242==    at 0x4840F2F: operator new(unsigned long) (vg_replace_malloc.c:422)
      ==4242==    by 0x109B01: SessionCache::create() (cache.cpp:9)` }],
    codeTitle: ['Running, configuring and suppressing', 'One bug, two reports'],
    viz: {
      title: 'Heap block states and what ASan / Valgrind would report',
      input: 'alloc p 10; write p 9; write p 10; free p; read p 3; free p; alloc q 4',
      inputLabel: 'Commands separated by ";" — alloc NAME N, read NAME i, write NAME i, free NAME (up to 12)',
      gen: function (input) {
        var ops = splitList(txt(input, 'alloc p 10; write p 9; write p 10; free p; read p 3; free p; alloc q 4'), ';');
        if (!ops.length || ops.length > 12) throw new Error('Give 1-12 commands, e.g. "alloc p 10; write p 10; free p"');
        var sim = asanSim(ops), frames = [], reps = [];
        frames.push({ narr: 'We model the allocator the way ASan sees it: every block is <b>live</b> or <b>freed (in quarantine)</b>, and every access is checked against the block bounds. No real memory is touched.', parts: [note('Report kinds: heap-buffer-overflow, heap-use-after-free, double-free, bad-free (pointer never allocated), wild-access, and leaks at exit.')] });
        sim.steps.forEach(function (s) {
          if (s.report) reps.push(s.report);
          var entries = Object.keys(s.blocks).map(function (k) { return [k, s.blocks[k].n + ' bytes, ' + (s.blocks[k].live ? 'live' : 'freed (quarantine)')]; });
          var name = s.op.split(/\s+/)[1], hl = {}; hl[name] = s.report ? 'bad' : 'ok';
          frames.push({ narr: '<code>' + s.op + '</code> — ' + (s.report ? '<span class="c-r"><b>ASan: ' + s.report + '</b></span>. Valgrind would print: <i>' + s.vg + '</i>.' : 'fine: inside a live block (or a valid alloc/free).'),
            parts: [{ type: 'map', label: 'heap blocks', entries: entries, hl: hl }, { type: 'queue', label: 'reports so far', items: reps.slice(), hl: s.report ? (function () { var h = {}; h[reps.length - 1] = 'bad'; return h; })() : {} }] });
        });
        frames.push({ narr: 'Program exit: LeakSanitizer (and Valgrind\'s leak check) scan for blocks still allocated and unreachable. ' + (sim.leaks.length ? '<span class="c-r">' + sim.leaks.join(', ') + '</span> — Valgrind calls these "definitely lost" if no pointer to them remains.' : '<span class="c-g">No leaks.</span>'),
          parts: [{ type: 'queue', label: 'final report', items: reps.concat(sim.leaks), hl: {} }] });
        return frames;
      }
    },
    examples: [
      { title: 'stack-use-after-scope: a reference to a dead temporary', html: `<p>ASan (with <code>detect_stack_use_after_scope</code>, on by default in Clang) catches this, Valgrind does <b>not</b> — Valgrind only tracks the heap and cannot see stack-variable lifetimes:</p>`, code: R`
        #include <string>
        #include <string_view>
        std::string_view firstWord(std::string_view s) { return s.substr(0, s.find(' ')); }
        int lengthOfFirst() {
            std::string_view w;
            {
                std::string line = "hello world";
                w = firstWord(line);     // w points into line's buffer
            }                            // line destroyed here
            // Using w after this point reads dead memory: ASan reports stack-use-after-scope
            // (or heap-use-after-free for a long string), Valgrind sees nothing for SSO strings.
            return 0;
        }` },
      { title: 'container-overflow: inside capacity but past size()', html: `<p><code>std::vector&lt;int&gt; v; v.reserve(10); v.push_back(1); int x = v.data()[5];</code> reads inside the allocation (capacity 10) but past <code>size()</code>. Plain ASan cannot see it; libc++/libstdc++ <b>container annotations</b> poison the unused capacity, giving a <code>container-overflow</code> report. Use <code>-D_GLIBCXX_SANITIZE_VECTOR</code> (libstdc++) or libc++ with ASan, and note all code must be built the same way or false positives appear.</p>` },
      { title: 'MSan needs everything instrumented', html: `<p>MemorySanitizer tracks initialisedness bit by bit. A value written by an <b>uninstrumented</b> library (a prebuilt <code>libstdc++.so</code>, a system zlib) looks uninitialised, causing false positives. Real MSan setups build libc++ and all dependencies with <code>-fsanitize=memory</code> — which is why many teams use Valgrind's "Conditional jump depends on uninitialised value" check instead, or rely on <code>-ftrivial-auto-var-init=pattern</code> plus UBSan.</p>` },
      { title: 'Choosing per situation', html: `${H.table(['situation', 'first choice', 'why'], [['CI unit tests', 'ASan+UBSan job, TSan job', '2–5× slowdown, precise reports'], ['legacy binary, no build system access', 'Valgrind Memcheck', 'no recompilation'], ['production crash, low overhead', 'GWP-ASan / HWASan (Android, AArch64)', 'sampled or hardware-tagged, ~1–5% overhead'], ['memory growth over hours', 'Massif, heaptrack, jemalloc profiling', 'heap profile over time, not errors'], ['fuzzing', 'libFuzzer + ASan+UBSan', 'turns silent corruption into crashes']])}` }
    ],
    deepDive: `<p><b>What ASan cannot see.</b> Overflows that jump <b>over</b> the redzone into another valid block (<code>a[1000]</code> landing in a neighbour), reads of uninitialised memory (that is MSan), use-after-free after the block has left the quarantine (<code>quarantine_size_mb</code>, default 256 MB) and been reused, intra-object overflows (one struct field into the next), and anything in code that was not instrumented (prebuilt libraries — though calls to <code>memcpy</code>/<code>strlen</code> are intercepted). <code>detect_stack_use_after_return</code> moves locals to a fake heap stack so returned pointers to locals can be caught; it costs extra memory.</p>
      <p><b>Valgrind is a JIT.</b> It translates machine code into its IR (VEX), adds instrumentation, and re-JITs it; every memory byte has "addressable" (A) bits and every bit has "valid" (V) bits. That is why it can find uninitialised-value use without recompilation, why it is 20–50× slower, and why it serialises threads (one thread runs at a time). It also does not understand some newer instructions (e.g. some AVX-512 code) — the "unhandled instruction" error.</p>
      <p><b>TSan and lock-order inversion.</b> Besides races (happens-before with vector clocks), TSan builds a <b>lock-order graph</b>: an edge A→B each time a thread acquires B while holding A. A cycle means two code paths take the same locks in opposite orders — a <i>potential</i> deadlock even if this run did not hang. The report reads "WARNING: ThreadSanitizer: lock-order-inversion (potential deadlock)" with the stacks where each edge was created. You will build this detector in the practice arena.</p>
      <p><b>Production-grade options:</b> <code>-fsanitize=bounds</code>/<code>-fsanitize-trap</code> and hardened standard libraries (<code>_GLIBCXX_ASSERTIONS</code>, libc++ hardening modes) are cheap enough to ship; GWP-ASan samples a tiny fraction of allocations with guard pages; HWASan uses AArch64 top-byte tagging for ~2× memory and far less CPU than ASan.</p>`,
    aiEra: `<p>Paste an ASan report into an assistant and it will usually explain the headline correctly and point to the right line — a genuine time saver for long reports. Where it fails: it proposes the "make the report go away" fix (bigger buffer, an extra copy, a suppression entry) instead of fixing the <b>ownership</b> story the alloc/free stacks reveal; it may claim Valgrind and ASan can be run together (they cannot — ASan's shadow memory and Valgrind's JIT conflict) or that a TSan warning on a "benign" race is safe to ignore (a data race is UB). Keep the human step: read the three stacks, write down who owns the memory and when it dies, and only then accept a fix. Also ask AI to write a regression test that reproduces the report — then the sanitizer job keeps the bug dead.</p>`,
    problems: [{
      title: 'Shadow-Memory Model: Flag Use-After-Free and Out-of-Bounds', level: 'Medium', tags: ['ASan', 'simulation', 'use-after-free', 'hash map'], companies: ['Google', 'Apple', 'Microsoft'],
      statement: `<p>Simulate AddressSanitizer's heap checks over a list of operations on named pointers:</p><ul><li><code>alloc p N</code> — p now points at a new live block of N bytes (an older block of the same name is simply forgotten);</li><li><code>read p i</code> / <code>write p i</code> — access byte i;</li><li><code>free p</code>.</li></ul><p>Return the reports in order: <code>"heap-buffer-overflow READ|WRITE p[i]"</code> (live block, i &lt; 0 or i ≥ N), <code>"heap-use-after-free READ|WRITE p[i]"</code> (block freed; quarantine is unlimited), <code>"double-free p"</code>, <code>"bad-free p"</code> (never allocated), <code>"wild-access READ|WRITE p[i]"</code> (never allocated); then at exit <code>"leak p N"</code> for each name's <b>latest</b> block that is still live, in allocation order.</p>`,
      constraints: `≤ 10<sup>5</sup> operations; 1 ≤ N ≤ 10<sup>9</sup>; −10<sup>9</sup> ≤ i ≤ 10<sup>9</sup>.`,
      example: `<p>alloc p 10, write p 9, write p 10, free p, read p 3, free p → ${H.c('r', 'heap-buffer-overflow WRITE p[10]')}, ${H.c('r', 'heap-use-after-free READ p[3]')}, ${H.c('r', 'double-free p')}. Index 9 is the last valid byte; 10 is "0 bytes to the right".</p>`,
      brute: { why: `<p>A literal byte-level shadow array (one entry per byte, like the real tool) works for tiny sizes but N can be 10<sup>9</sup>. A block only needs its size and a live/freed flag: bounds are a comparison, and state is per block, not per byte.</p>`, code: R`
        #include <string>
        #include <vector>
        // Per-byte shadow: correct but allocates N entries per block (impossible for N = 1e9).
        struct ByteShadow {
            std::vector<signed char> shadow;               // 0 = addressable, -1 = redzone/freed
            void alloc(int n) { shadow.assign(n + 16, -1); for (int i = 8; i < 8 + n; ++i) shadow[i] = 0; }
            bool ok(int i) const { return i + 8 >= 0 && i + 8 < (int)shadow.size() && shadow[i + 8] == 0; }
        };` },
      mcq: { q: 'Why does real ASan keep freed blocks in a quarantine instead of reusing them immediately?', options: ['So a later access through a dangling pointer still hits poisoned memory and is reported', 'To make free() faster', 'To reduce memory usage', 'Because the C++ standard requires it'], answer: 0, explain: 'If the block were reused, the dangling access would land in a new live object and look valid. Quarantine delays reuse so use-after-free stays detectable.' },
      hints: [`<p>Hint 1: You do not need bytes — per name keep {size, live}. Use a hash map from name to block, plus a vector of names in allocation order for the leak list.</p>`, `<p>Hint 2: Order of checks for an access: unknown name → wild-access; freed → use-after-free (even if i is out of range); live but out of [0, N) → overflow.</p>`, `<p>Hint 3: For leaks, a name may be allocated several times; only its latest allocation counts, and it is listed at the position of that latest allocation. Use long long for N and i.</p>`],
      tests: { sig: 'string[] -> string[]', fn: 'asanModel', cases: [[[["alloc p 10","write p 9","write p 10","free p","read p 3","free p"]],["heap-buffer-overflow WRITE p[10]","heap-use-after-free READ p[3]","double-free p"]],[[["alloc a 4","read a -1","free a"]],["heap-buffer-overflow READ a[-1]"]],[[["alloc a 8","alloc b 2","free a"]],["leak b 2"]],[[["free q","read z 0"]],["bad-free q","wild-access READ z[0]"]],[[[]],[]],[[["alloc p 1","write p 0","free p","alloc p 2","write p 1","write p 2"]],["heap-buffer-overflow WRITE p[2]","leak p 2"]],[[["alloc x 16","free x","write x 0","read x 15","free x","free x"]],["heap-use-after-free WRITE x[0]","heap-use-after-free READ x[15]","double-free x","double-free x"]]] },
      solution: {
        approach: `<p>Keep <code>unordered_map&lt;string, Block{long long n; bool live; size_t order;}&gt;</code>. Each op is O(1): parse, look up, compare. At exit, collect live blocks, sort by allocation order, and emit leaks. This mirrors ASan's logic (redzone check + quarantine + LSan at exit) at block granularity.</p>`,
        code: R`
          #include <algorithm>
          #include <sstream>
          #include <string>
          #include <unordered_map>
          #include <vector>

          std::vector<std::string> asanModel(const std::vector<std::string>& ops) {
              struct Block { long long n; bool live; std::size_t order; };
              std::unordered_map<std::string, Block> blocks;
              std::vector<std::string> out;
              std::size_t seq = 0;
              for (const std::string& line : ops) {
                  std::istringstream in(line);
                  std::string op, name;
                  in >> op >> name;
                  if (op == "alloc") {
                      long long n = 0;
                      in >> n;
                      blocks[name] = {n, true, seq++};           // forget any older block with this name
                  } else if (op == "free") {
                      auto it = blocks.find(name);
                      if (it == blocks.end()) out.push_back("bad-free " + name);
                      else if (!it->second.live) out.push_back("double-free " + name);
                      else it->second.live = false;               // stays known: quarantine
                  } else {                                        // read / write
                      long long i = 0;
                      in >> i;
                      const std::string where = (op == "read" ? "READ " : "WRITE ") + name + "[" + std::to_string(i) + "]";
                      auto it = blocks.find(name);
                      if (it == blocks.end()) out.push_back("wild-access " + where);
                      else if (!it->second.live) out.push_back("heap-use-after-free " + where);
                      else if (i < 0 || i >= it->second.n) out.push_back("heap-buffer-overflow " + where);
                  }
              }
              std::vector<std::pair<std::size_t, std::string>> leaks;
              for (const auto& [name, b] : blocks)
                  if (b.live) leaks.push_back({b.order, "leak " + name + " " + std::to_string(b.n)});
              std::sort(leaks.begin(), leaks.end());
              for (auto& l : leaks) out.push_back(l.second);
              return out;
          }`,
        dry: { head: ['op', 'block p', 'report'], rows: [['alloc p 10', '10, live', ''], ['write p 9', '10, live', 'ok (9 < 10)'], ['write p 10', '10, live', 'heap-buffer-overflow WRITE p[10]'], ['free p', '10, freed', ''], ['read p 3', '10, freed', 'heap-use-after-free READ p[3]'], ['free p', '10, freed', 'double-free p']] },
        complexity: `<p>O(total input length) for the ops plus O(L log L) to sort L leaks.</p>`,
        followUps: ['How would you model a bounded quarantine (FIFO of freed bytes) so very old use-after-frees are missed, like real ASan?', 'How would you add alloc-dealloc-mismatch (new[] freed with delete)?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 5 — Static analysis and warnings as errors
     ====================================================================== */
  topics.push({
    title: 'Static Analysis: Warnings as Errors, clang-tidy and cppcheck',
    analogy: `<p>A spell-checker underlines mistakes while you type, before anyone reads the letter. It cannot tell whether your argument is convincing, and sometimes it underlines a correct name — but it catches hundreds of slips for free, every time. Compiler warnings and static analysers are the spell-checkers of C++: they read the code <b>without running it</b>. Sanitizers and tests need the bug to actually happen; static analysis can flag a path that no test ever took.</p>`,
    explain: `<p><b>Layer 1 — compiler warnings.</b> Free and fast. A good baseline for GCC/Clang:</p>
      <pre>-Wall -Wextra -Wpedantic -Wshadow -Wconversion -Wsign-conversion -Wnon-virtual-dtor -Wold-style-cast -Wcast-align -Wnull-dereference -Wdouble-promotion -Wformat=2 -Wimplicit-fallthrough</pre>
      <p><code>-Wall</code> is <b>not</b> "all warnings" — it is a historical set; <code>-Wextra</code> adds more; Clang also has <code>-Weverything</code> (useful for discovery, too noisy to enforce). MSVC: <code>/W4 /permissive-</code>. Then <b>warnings as errors</b>: <code>-Werror</code> (MSVC <code>/WX</code>) so a new warning breaks the build instead of scrolling past. Do it in CI and in your own targets, not in flags you export to users of a library (a new compiler version adds warnings and would break their build).</p>
      <p><b>Layer 2 — clang-tidy</b>: a Clang-based linter with hundreds of checks grouped by prefix: <code>bugprone-*</code> (use-after-move, suspicious memset, narrowing in loops), <code>cppcoreguidelines-*</code>, <code>modernize-*</code> (use <code>auto</code>, <code>nullptr</code>, range-for, <code>override</code>), <code>performance-*</code> (unnecessary copies, <code>std::move</code> of const), <code>readability-*</code>, <code>concurrency-*</code>, and <code>clang-analyzer-*</code> — the <b>Clang Static Analyzer</b>, which symbolically executes paths to find null dereferences, leaks and use-after-free across branches. It needs <code>compile_commands.json</code> to know each file's flags. Many checks offer <b>fix-its</b> (<code>--fix</code>).</p>
      <p><b>Layer 3 — other analysers:</b> <b>cppcheck</b> (no compiler needed, good at bounds and resource leaks, low false-positive policy), <b>GCC <code>-fanalyzer</code></b> (interprocedural, strongest for C), <b>include-what-you-use</b>, and commercial tools (Coverity, PVS-Studio, CodeQL for security queries).</p>
      ${H.table(['', 'finds', 'misses'], [['warnings', 'conversions, shadowing, unused, missing return, format strings', 'anything needing path reasoning'], ['clang-tidy', 'style + bug patterns + path-sensitive (analyzer) bugs', 'runtime values, cross-TU bugs (without CTU mode)'], ['sanitizers', 'what actually happened in a run', 'paths no test executes']])}`,
    clues: [
      '"enforce code quality in CI" / "prevent new warnings" → -Werror on project targets + clang-tidy with WarningsAsErrors',
      '"legacy code with 5 000 warnings" → baseline + ratchet: fail only on NEW warnings, burn down the old ones',
      '"bug happens on a path no test covers" → static analysis (Clang Static Analyzer, -fanalyzer)',
      '"use after std::move" / "copying a big object in a range-for" → clang-tidy bugprone-use-after-move, performance-for-range-copy',
      '"compile_commands.json" → what clang-tidy and clangd need to know each file\'s flags',
      '"is -Wall enough?" → no: add -Wextra, -Wshadow, -Wconversion; -Wall is a historical subset'
    ],
    code: [{ lang: 'yaml', title: '.clang-tidy at the repository root', code: R`
      # Enable families, then switch off the noisy ones explicitly.
      Checks: >
        -*,
        bugprone-*,
        -bugprone-easily-swappable-parameters,
        clang-analyzer-*,
        concurrency-*,
        cppcoreguidelines-*,
        -cppcoreguidelines-avoid-magic-numbers,
        modernize-*,
        -modernize-use-trailing-return-type,
        performance-*,
        readability-identifier-naming
      WarningsAsErrors: 'bugprone-*,clang-analyzer-*,performance-*'
      HeaderFilterRegex: '^(src|include)/'        # report issues in our headers, not third-party ones
      CheckOptions:
        - key: readability-identifier-naming.ClassCase
          value: CamelCase
        - key: performance-unnecessary-value-param.AllowedTypes
          value: 'std::shared_ptr'` }, { lang: 'bash', title: 'Running the analysers', code: R`
      # compile_commands.json comes from the build system (e.g. CMAKE_EXPORT_COMPILE_COMMANDS=ON)
      run-clang-tidy -p build -j 8 'src/.*'                 # whole project, parallel
      clang-tidy -p build src/cache.cpp --fix               # apply fix-its to one file
      git diff -U0 origin/main | clang-tidy-diff.py -p1 -path build   # only lines changed in this PR

      cppcheck --project=build/compile_commands.json --enable=warning,performance,portability \
               --inline-suppr --error-exitcode=1 --suppress=missingIncludeSystem
      g++ -fanalyzer -c src/parser.cpp                      # GCC's interprocedural analyser` },
    R`
      // What these tools flag. Each line below compiles, and each is a real bug pattern.
      #include <memory>
      #include <string>
      #include <utility>
      #include <vector>

      struct Base { virtual void f() {} };                  // -Wnon-virtual-dtor: deleting via Base* leaks Derived parts
      struct Derived : Base { std::vector<int> big; };

      int sumFirst(const std::vector<int>& v, int n) {
          int s = 0;
          for (int i = 0; i < n; ++i)                         // OK, but if n were v.size(): -Wsign-compare
              s += v[static_cast<std::size_t>(i)];
          return s;
      }

      std::size_t moved() {
          std::string a = "hello";
          std::string b = std::move(a);
          return a.size() + b.size();                         // bugprone-use-after-move: a is valid but unspecified
      }

      int shadow(int x) {
          int total = 0;
          for (int i = 0; i < x; ++i) {
              int total = i;                                  // -Wshadow: inner total hides the outer one
              (void)total;
          }
          return total;                                       // always 0 — the bug -Wshadow exists for
      }

      double average(const std::vector<int>& v) {
          long long s = 0;
          for (int x : v) s += x;
          return static_cast<double>(s) / static_cast<double>(v.size());   // analyzer: division by zero if empty
      }

      void copies(const std::vector<std::string>& names) {
          for (const auto name : names) (void)name;           // performance-for-range-copy: copies every string
      }`],
    codeTitle: ['.clang-tidy configuration', 'clang-tidy, cppcheck and -fanalyzer commands', 'Code the analysers flag'],
    viz: {
      title: 'Warnings ratchet: fail the build only on NEW warnings',
      input: 'a.cpp unused-variable, b.cpp sign-compare, b.cpp sign-compare | a.cpp unused-variable, b.cpp sign-compare, c.cpp shadow, b.cpp sign-compare, b.cpp sign-compare',
      inputLabel: 'baseline warnings | current warnings — each "file flag", comma-separated (≤ 8 per side)',
      gen: function (input) {
        var sides = txt(input, 'a.cpp unused-variable | a.cpp unused-variable, c.cpp shadow').split('|');
        if (sides.length !== 2) throw new Error('Use "baseline | current", e.g. "a.cpp unused | a.cpp unused, c.cpp shadow"');
        var base = splitList(sides[0], ','), cur = splitList(sides[1], ',');
        if (base.length > 8 || cur.length > 8) throw new Error('At most 8 warnings per side');
        var cnt = {}, frames = [], fresh = [];
        base.forEach(function (w) { cnt[w] = (cnt[w] || 0) + 1; });
        function budget() { return Object.keys(cnt).map(function (k) { return [k, String(cnt[k])]; }); }
        frames.push({ narr: 'The <b>baseline</b> is the list of known warnings checked into the repo (line numbers stripped, because unrelated edits shift lines). Each entry is a budget: how many of that (file, warning) pair we tolerate.', parts: [{ type: 'map', label: 'baseline budget', entries: budget() }] });
        cur.forEach(function (w, i) {
          var ok = cnt[w] > 0;
          if (ok) cnt[w]--; else fresh.push(w);
          var hl = {}; hl[i] = ok ? 'done' : 'bad';
          frames.push({ narr: 'Current build warning <code>' + w + '</code>: ' + (ok ? 'covered by the baseline budget — tolerated (but still debt).' : '<span class="c-r">no budget left — this is a NEW warning and fails the PR.</span>'),
            parts: [{ type: 'array', label: 'current warnings', values: cur.slice(), hl: hl }, { type: 'map', label: 'remaining budget', entries: budget(), hl: (function () { var h = {}; h[w] = ok ? 'ok' : 'bad'; return h; })() }] });
        });
        var spare = Object.keys(cnt).filter(function (k) { return cnt[k] > 0; });
        frames.push({ narr: (fresh.length ? '<span class="c-r">Build fails: ' + fresh.length + ' new warning(s).</span>' : '<span class="c-g">No new warnings — the PR passes.</span>') + (spare.length ? ' Some baseline entries were not seen: someone fixed them, so the baseline should <b>shrink</b> (that is the ratchet: it only ever goes down).' : ''),
          parts: [{ type: 'queue', label: 'new warnings (fail)', items: fresh }, { type: 'queue', label: 'fixed — remove from baseline', items: spare }] });
        return frames;
      }
    },
    examples: [
      { title: '-Werror in practice: where to put it', html: `<p>Turn warnings into errors <b>for your own targets in CI</b>, not globally for everyone who builds the project (packagers use newer compilers that add warnings). With CMake 3.24+ the switch <code>CMAKE_COMPILE_WARNING_AS_ERROR=ON</code> does this per build, and <code>--compile-no-warning-as-error</code> overrides it locally. Third-party headers should be included as <b>system</b> includes (<code>-isystem</code>) so their warnings do not fail your build.</p>` },
      { title: 'Suppressing one finding, honestly', html: `<p>False positives happen. Suppress <b>locally</b> with a reason, never by turning the check off globally:</p>`, code: { lang: 'cpp', check: false, code: R`
        // clang-tidy: one line, one check, with a justification
        auto* raw = reinterpret_cast<const Header*>(buf);  // NOLINT(cppcoreguidelines-pro-type-reinterpret-cast): wire format, checked size above

        // cppcheck inline suppression (needs --inline-suppr)
        // cppcheck-suppress knownConditionTrueFalse
        if (kDebug) log();

        // GCC/Clang: scoped diagnostic push/pop around a vendored header
        #pragma GCC diagnostic push
        #pragma GCC diagnostic ignored "-Wshadow"
        #include "vendor/old_lib.h"
        #pragma GCC diagnostic pop` } },
      { title: 'Path-sensitive analysis finds what tests miss', html: `<p>The Clang Static Analyzer explores paths symbolically. For <code>char* p = malloc(n); if (n &gt; 100) return -1; ... free(p);</code> it reports "Potential leak of memory pointed to by 'p'" on the early-return path — even if no test ever passes <code>n &gt; 100</code>. Its HTML output (<code>scan-build</code>) shows the path step by step: "Assuming 'n' is &gt; 100", "Returning; memory was not released".</p>` },
      { title: 'Only lint what changed', html: `<p>Running every clang-tidy check on a million-line codebase can take an hour. In PRs, run <code>clang-tidy-diff.py</code> on changed lines only, and run the full scan nightly. Cache results by file hash. Combine with a <b>ratchet</b> (the visualizer above) so the total count can only go down.</p>` }
    ],
    deepDive: `<p><b>Why warnings differ between compilers and optimisation levels.</b> Some GCC warnings (<code>-Wmaybe-uninitialized</code>, <code>-Wnull-dereference</code>, <code>-Wstringop-overflow</code>, <code>-Warray-bounds</code>) are computed by optimisation passes, so they appear only at <code>-O2</code> and change between GCC versions — including false positives after inlining. That is why CI should build with the same compiler versions and flags as release, and why a compiler upgrade is a planned task: new versions add warnings, and with <code>-Werror</code> the build breaks.</p>
      <p><b>Soundness vs precision.</b> No analyser can be both complete and free of false positives for C++ (Rice's theorem; pointers and aliasing make it worse). Tools pick a trade-off: compiler warnings and cppcheck aim for few false positives; the Clang Static Analyzer bounds loop unrolling and inlining depth, so it misses deep bugs; sound tools (Astrée, Polyspace) prove absence of runtime errors for restricted code, at a high false-positive cost — used in avionics and automotive (MISRA C++, AUTOSAR guidelines).</p>
      <p><b>Cross translation unit.</b> clang-tidy analyses one TU at a time; a null returned from a function in another <code>.cpp</code> is unknown. CTU mode (<code>clang-extdef-mapping</code> + analyzer CTU) and LTO-based tools help, at large cost. Practical approach: annotate contracts (<code>[[nodiscard]]</code>, <code>gsl::not_null</code>, <code>_Nonnull</code>) so per-TU analysis knows more.</p>
      <p><b>Lifetime analysis</b> is an active area: Clang's <code>-Wdangling</code>, <code>-Wreturn-stack-address</code>, <code>[[clang::lifetimebound]]</code> and GCC 14's <code>-Wdangling-reference</code> catch views and references that outlive their owners at compile time — a subset of what C++ 6 called use-after-free.</p>`,
    aiEra: `<p>AI coding tools are a new kind of static analyser: ask "review this diff for bugs" and you get comments on lifetime, overflow and exception-safety issues that no single clang-tidy check covers. But they are <b>not reproducible</b> (two runs, two answers), they miss things silently, and they cannot be a CI gate. The strong setup: deterministic tools (warnings, clang-tidy, cppcheck) as the gate, AI as a reviewer that explains findings and drafts fixes. AI is also excellent at the boring part — turning 300 <code>modernize-*</code> findings into a clean patch — but review every <code>--fix</code>-style mass change under the full test suite and sanitizers, because a "harmless" <code>auto</code> conversion can change a type (e.g. <code>auto x = vec.size() - 1</code> is unsigned).</p>`,
    problems: [{
      title: 'Warning Ratchet: Report Only New Warnings', level: 'Easy', tags: ['static analysis', 'CI', 'multiset', 'string parsing'], companies: ['Microsoft', 'Meta', 'Qualcomm'],
      statement: `<p>Legacy code has hundreds of warnings, so the team adopts a <b>ratchet</b>: the build fails only on warnings that are not in a checked-in baseline. Warnings look like <code>src/a.cpp:12:5: warning: unused variable 'x' [-Wunused-variable]</code>. Two warnings are "the same" if they have the same file and the same text after the line and column numbers (line numbers move when unrelated code changes). The baseline is a <b>multiset</b>: each entry excuses one occurrence. Return the current warnings that are not excused, in their original order and original text.</p>`,
      constraints: `≤ 10<sup>5</sup> warnings per list; every line has the form <code>file:line:col: text</code> (col may be missing).`,
      example: `<p>baseline [a.cpp:12:5 unused 'x'], current [a.cpp:14:5 unused 'x', b.cpp:3:10 sign-compare] → only the ${H.c('r', 'b.cpp sign-compare')} warning. The unused-variable warning moved from line 12 to 14 but is the same warning.</p>`,
      brute: { why: `<p>Comparing full lines fails: every unrelated edit shifts line numbers, so the whole baseline "breaks". Searching the baseline list for each warning is O(n·m). Normalise each warning to a key without line/column and use a hash map of counts.</p>`, code: R`
        #include <algorithm>
        #include <string>
        #include <vector>
        std::vector<std::string> newWarningsNaive(const std::vector<std::string>& base, const std::vector<std::string>& cur) {
            std::vector<std::string> out;
            for (const auto& w : cur)
                if (std::find(base.begin(), base.end(), w) == base.end()) out.push_back(w);   // line numbers break this
            return out;
        }` },
      mcq: { q: 'Why should the baseline be a multiset rather than a set?', options: ['Three identical warnings in one file excused by one baseline entry would hide two new ones', 'Sets cannot store strings', 'Multisets are faster', 'Compilers print each warning twice'], answer: 0, explain: 'If a file had one sign-compare and now has three, two are new. Counting occurrences catches them.' },
      hints: [`<p>Hint 1: Normalise: key = file + "|" + everything after "file:line:col:" (strip spaces). Use a regex or find the first two/three colons after the file name.</p>`, `<p>Hint 2: Count baseline keys in an <code>unordered_map&lt;string,int&gt;</code>. For each current warning, if its key has a positive count, decrement and skip; else report it.</p>`, `<p>Hint 3: Keep the current list's order and original text in the output. Handle "file:line: text" (no column) too. Empty lists return empty.</p>`],
      tests: { sig: 'string[] string[] -> string[]', fn: 'newWarnings', cases: [[[["src/a.cpp:12:5: warning: unused variable 'x' [-Wunused-variable]"],["src/a.cpp:14:5: warning: unused variable 'x' [-Wunused-variable]"]],[]],[[["src/a.cpp:12:5: warning: unused variable 'x' [-Wunused-variable]"],["src/a.cpp:14:5: warning: unused variable 'x' [-Wunused-variable]","src/b.cpp:3:10: warning: comparison of integer expressions of different signedness [-Wsign-compare]"]],["src/b.cpp:3:10: warning: comparison of integer expressions of different signedness [-Wsign-compare]"]],[[[],["src/b.cpp:40:1: warning: control reaches end of non-void function [-Wreturn-type]"]],["src/b.cpp:40:1: warning: control reaches end of non-void function [-Wreturn-type]"]],[[["src/a.cpp:12:5: warning: unused variable 'x' [-Wunused-variable]","src/b.cpp:3:10: warning: comparison of integer expressions of different signedness [-Wsign-compare]","src/b.cpp:40:1: warning: control reaches end of non-void function [-Wreturn-type]"],[]],[]],[[["src/b.cpp:3:10: warning: comparison of integer expressions of different signedness [-Wsign-compare]"],["src/b.cpp:3:10: warning: comparison of integer expressions of different signedness [-Wsign-compare]","src/b.cpp:9:10: warning: comparison of integer expressions of different signedness [-Wsign-compare]"]],["src/b.cpp:9:10: warning: comparison of integer expressions of different signedness [-Wsign-compare]"]],[[[],[]],[]],[[["src/b.cpp:40:1: warning: control reaches end of non-void function [-Wreturn-type]"],["src/c.cpp:40:1: warning: control reaches end of non-void function [-Wreturn-type]"]],["src/c.cpp:40:1: warning: control reaches end of non-void function [-Wreturn-type]"]]] },
      solution: {
        approach: `<p>Map each warning to a line-independent key with a regex <code>^([^:]+):\\d+(?::\\d+)?:\\s*(.*)$</code>, count baseline keys, then stream the current list, consuming budget or reporting. O(n + m) expected.</p>`,
        code: R`
          #include <regex>
          #include <string>
          #include <unordered_map>
          #include <vector>

          static std::string warningKey(const std::string& w) {
              static const std::regex re(R"(^([^:]+):\d+(?::\d+)?:\s*(.*)$)");
              std::smatch m;
              if (std::regex_match(w, m, re)) return m[1].str() + "|" + m[2].str();
              return w;                                            // unknown format: compare verbatim
          }

          std::vector<std::string> newWarnings(const std::vector<std::string>& baseline, const std::vector<std::string>& current) {
              std::unordered_map<std::string, int> budget;
              for (const auto& w : baseline) ++budget[warningKey(w)];
              std::vector<std::string> fresh;
              for (const auto& w : current) {
                  auto it = budget.find(warningKey(w));
                  if (it != budget.end() && it->second > 0) --it->second;   // excused by the baseline
                  else fresh.push_back(w);
              }
              return fresh;
          }`,
        dry: { head: ['current warning', 'key', 'budget before', 'result'], rows: [['a.cpp:14:5 unused x', 'a.cpp|unused x', '1', 'excused (budget 0)'], ['b.cpp:3:10 sign-compare', 'b.cpp|sign-compare', '0', 'NEW → reported']] },
        complexity: `<p>O(total characters) expected time with a hash map (regex matching is linear per line here).</p>`,
        followUps: ['How would you also report baseline entries that disappeared, so the baseline can shrink automatically?', 'Two warnings with the same text in the same file but different functions — how could you tell them apart without line numbers?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 6 — Fuzzing with libFuzzer
     ====================================================================== */
  function fuzzRun(target, seed, maxIters) {
    var st = seed >>> 0, corpus = [''], best = 0, events = [];
    function next() { st = (Math.imul(st, 1664525) + 1013904223) >>> 0; return st >>> 8; }
    function cov(s) { var k = 0; while (k < s.length && k < target.length && s[k] === target[k]) k++; return k; }
    for (var it = 1; it <= maxIters; it++) {
      var s = corpus[(it - 1) % corpus.length], parent = s;
      var op = next() % 3, pos = next() % (s.length + 1), ch = String.fromCharCode(65 + next() % 26), opName;
      if (op === 0 && s.length && pos < s.length) { s = s.slice(0, pos) + ch + s.slice(pos + 1); opName = 'ChangeByte'; }
      else if (op === 2 && s.length && pos < s.length) { s = s.slice(0, pos) + s.slice(pos + 1); opName = 'EraseByte'; }
      else { s = s.slice(0, pos) + ch + s.slice(pos); opName = 'InsertByte'; }
      var c = cov(s);
      if (c === target.length) { events.push({ it: it, s: s, parent: parent, op: opName, c: c, crash: true, corpus: corpus.slice() }); return events; }
      if (c > best) { best = c; corpus.push(s); events.push({ it: it, s: s, parent: parent, op: opName, c: c, crash: false, corpus: corpus.slice() }); }
    }
    return events;
  }

  topics.push({
    title: 'Fuzzing with libFuzzer: Coverage-Guided Bug Hunting',
    analogy: `<p>A safe-cracker with a stethoscope does not try all million combinations. She turns the dial and <b>listens</b>: when a click means "this digit is right", she keeps it and works on the next one. Random guessing alone would take forever; random guessing <b>plus feedback</b> opens the safe in minutes. A coverage-guided fuzzer is that safe-cracker: it mutates inputs at random, listens to the program's <b>coverage</b> (which branches ran), and keeps every input that reached somewhere new as a stepping stone for further mutations.</p>`,
    explain: `<p><b>Fuzzing</b> = feeding a program huge numbers of generated inputs and watching for crashes, hangs, sanitizer reports or failed assertions. <b>libFuzzer</b> (part of LLVM) is an in-process, coverage-guided fuzzer: you write one function, Clang instruments the code with coverage counters, and the fuzzer loop runs millions of inputs per minute in the same process.</p>
      <p><b>The fuzz target</b> is the whole API: <code>extern "C" int LLVMFuzzerTestOneInput(const uint8_t* data, size_t size)</code>. It must accept <b>any</b> bytes, be deterministic, not leak, not call <code>exit</code>, and return 0. Build with <code>clang++ -g -O1 -fsanitize=fuzzer,address,undefined target.cpp</code> (<code>-fsanitize=fuzzer</code> adds the coverage instrumentation and links libFuzzer's <code>main</code>).</p>
      <p><b>The loop</b> (simplified):</p>
      <ol><li>Load the seed <b>corpus</b> (a directory of example inputs).</li><li>Pick an input from the corpus and apply a few random <b>mutations</b>: flip/change/insert/erase bytes, copy parts, insert dictionary tokens, splice two inputs (cross-over), tweak integers, and replay bytes seen in comparisons (<code>-use_cmp</code>: if the code compares against <code>"FUZZ"</code>, the fuzzer learns to try it).</li><li>Run the target. If new coverage features appear (new edges, new hit-count buckets), <b>add the input to the corpus</b>.</li><li>If it crashed (signal, sanitizer report, timeout, OOM), write <code>crash-&lt;sha1&gt;</code> and stop.</li></ol>
      ${H.table(['flag', 'meaning'], [['<code>./fuzz corpus/ seeds/</code>', 'first dir is written to, others only read'], ['<code>-max_len=4096</code>', 'cap input size'], ['<code>-dict=json.dict</code>', 'tokens like <code>"true"</code>, <code>"{"</code> to insert'], ['<code>-jobs=8 -workers=8</code>', 'parallel fuzzing'], ['<code>-runs=N</code>, <code>-max_total_time=600</code>', 'stop conditions (CI)'], ['<code>./fuzz crash-abc</code>', 'replay one input — reproduce the bug'], ['<code>-minimize_crash=1 -runs=10000 crash-abc</code>', 'shrink the crashing input'], ['<code>-merge=1 small/ big/</code>', 'minimise a corpus, keeping coverage']])}`,
    clues: [
      '"parser / decoder / deserialiser of untrusted input" → fuzz it with ASan+UBSan',
      '"find inputs that crash" / "security review of file format code" → coverage-guided fuzzing (libFuzzer, AFL++, honggfuzz)',
      '"magic number / checksum blocks the fuzzer" → dictionary, -use_cmp, or a fuzz-only path that skips the checksum',
      '"the fuzzer found a crash; now what?" → reproduce with the crash file, minimise, add it as a unit test, fix',
      '"structured inputs (protobufs, ASTs)" → FuzzedDataProvider or libprotobuf-mutator',
      '"continuous fuzzing" → OSS-Fuzz / ClusterFuzzLite in CI'
    ],
    code: [{ lang: 'cpp', check: false, title: 'A libFuzzer target (build: clang++ -g -O1 -fsanitize=fuzzer,address,undefined)', code: R`
      #include <cstddef>
      #include <cstdint>
      #include <string_view>
      #include "config_parser.h"

      // Called millions of times with arbitrary bytes. Must never exit(), must be deterministic.
      extern "C" int LLVMFuzzerTestOneInput(const uint8_t* data, size_t size) {
          std::string_view text(reinterpret_cast<const char*>(data), size);
          auto cfg = parseConfig(text);              // ASan/UBSan turn silent bugs into crashes
          if (cfg) {
              std::string again = cfg->serialize();  // round-trip property: parse(serialize(x)) == x
              auto cfg2 = parseConfig(again);
              if (!cfg2 || *cfg2 != *cfg) __builtin_trap();   // a logic bug becomes a crash the fuzzer reports
          }
          return 0;
      }` }, { lang: 'cpp', check: false, title: 'Structured fuzzing with FuzzedDataProvider', code: R`
      #include <fuzzer/FuzzedDataProvider.h>
      #include "lru_cache.h"

      extern "C" int LLVMFuzzerTestOneInput(const uint8_t* data, size_t size) {
          FuzzedDataProvider fdp(data, size);
          LruCache<int, int> cache(fdp.ConsumeIntegralInRange<int>(1, 16));
          while (fdp.remaining_bytes() > 0) {
              int key = fdp.ConsumeIntegralInRange<int>(0, 31);
              switch (fdp.ConsumeIntegralInRange<int>(0, 2)) {         // the bytes choose an operation sequence
                  case 0: cache.put(key, fdp.ConsumeIntegral<int>()); break;
                  case 1: (void)cache.get(key); break;
                  case 2: cache.erase(key); break;
              }
              if (cache.size() > cache.capacity()) __builtin_trap();   // invariant check
          }
          return 0;
      }` }, { lang: 'bash', title: 'Running, reproducing, minimising', code: R`
      mkdir -p corpus && cp tests/data/*.cfg corpus/            # seed corpus: real examples
      ./config_fuzzer corpus/ -dict=cfg.dict -max_len=4096 -jobs=8 -max_total_time=600
      # ==1234== ERROR: AddressSanitizer: heap-buffer-overflow ...
      # artifact_prefix='./'; Test unit written to ./crash-5f1e9a...
      ./config_fuzzer crash-5f1e9a                               # reproduce deterministically
      ./config_fuzzer -minimize_crash=1 -runs=100000 crash-5f1e9a # shrink it
      ./config_fuzzer -merge=1 corpus_min/ corpus/               # keep only coverage-adding inputs` }],
    codeTitle: ['Fuzz target with a round-trip property', 'FuzzedDataProvider: fuzz an API, not bytes', 'libFuzzer workflow'],
    viz: {
      title: 'Coverage feedback: how a fuzzer "learns" a magic word',
      input: 'FUZZ 1',
      inputLabel: 'Magic word (A-Z, 1-5 letters) and a seed, e.g. "FUZZ 1"',
      gen: function (input) {
        var p = txt(input, 'FUZZ 1').toUpperCase().split(/\s+/);
        var word = p[0], seed = p.length > 1 ? parseInt(p[1], 10) : 1;
        if (!/^[A-Z]{1,5}$/.test(word)) throw new Error('The magic word must be 1-5 letters A-Z, e.g. "FUZZ 1"');
        if (isNaN(seed) || seed < 0 || seed > 1e9) throw new Error('Seed must be a number 0-1000000000');
        var ev = fuzzRun(word, seed, 200000), frames = [];
        var code = 'int parse(const std::string& s) {\n  if (s.size() > 0 && s[0] == \'' + word[0] + '\')' + (word.length > 1 ? '\n   if (s.size() > 1 && s[1] == \'' + word[1] + '\')' : '') + (word.length > 2 ? '\n    ...           // one branch per letter' : '') + '\n      crash();   // full match = bug\n  return 0;\n}';
        frames.push({ narr: 'The parser hides a crash behind ' + word.length + ' nested comparisons (one per letter of "' + word + '"). Pure random 1-letter-per-try guessing of the whole word needs about 26<sup>' + word.length + '</sup> = ' + Math.pow(26, word.length).toLocaleString() + ' tries. Coverage feedback turns it into ~' + word.length + ' small puzzles.',
          parts: [{ type: 'code', label: 'target', lang: 'cpp', code: code }, { type: 'queue', label: 'corpus', items: ['""'] }] });
        ev.forEach(function (e) {
          frames.push({ narr: 'Iteration <b>' + e.it + '</b>: mutate "' + e.parent + '" with <b>' + e.op + '</b> → "' + e.s + '". ' + (e.crash ? '<span class="c-r"><b>CRASH!</b> All ' + e.c + ' comparisons passed. libFuzzer writes crash-&lt;sha1&gt; and stops.</span>' : 'It matched <b>' + e.c + '</b> letter(s) — a branch never reached before, i.e. <span class="c-g">new coverage</span>. The input joins the corpus as a stepping stone.'),
            parts: [{ type: 'bars', label: 'matched prefix (coverage depth)', values: [e.c, word.length], texts: [String(e.c), String(word.length)], idxLabels: ['this input', 'needed'], hl: { 0: e.crash ? 'bad' : 'ok' } }, { type: 'queue', label: 'corpus', items: e.corpus.map(function (x) { return '"' + x + '"'; }), hl: e.crash ? {} : (function () { var h = {}; h[e.corpus.length - 1] = 'ok'; return h; })() }] });
        });
        if (!ev.length || !ev[ev.length - 1].crash) frames.push({ narr: 'No crash within 200 000 iterations for this seed — try another seed.', parts: [note('Real fuzzers run for hours or days; CI runs time-boxed sessions.')] });
        frames.push({ narr: 'Takeaway: without coverage feedback each iteration is an independent lottery ticket. With it, progress is <b>kept</b>. That is the whole idea of AFL and libFuzzer; dictionaries and comparison tracing (<code>-use_cmp</code>) make even big magic numbers easy.', parts: [note('Iterations needed here: ' + (ev.length && ev[ev.length - 1].crash ? ev[ev.length - 1].it : 'more than 200 000') + ' instead of ~' + Math.pow(26, word.length).toLocaleString() + '.')] });
        return frames;
      }
    },
    examples: [
      { title: 'From crash to regression test', html: `<p>The fuzzer reports <code>heap-buffer-overflow</code> in <code>readLength()</code> with <code>crash-5f1e9a</code> (7 bytes after minimisation: <code>05 00 00 00 41 42 43</code>). The length field says 5 but only 3 bytes follow. Fix the bounds check, then turn the input into a <b>unit test</b> (or keep it in a "regressions" corpus that CI replays with <code>./fuzzer regressions/*</code> — running a fuzz binary on files only replays them). The bug can never come back silently.</p>` },
      { title: 'Writing a good fuzz target', html: `<ul><li><b>Fast</b>: no logging, no sleeps; ideally &gt; 1 000 executions/s.</li><li><b>Deterministic</b>: same bytes → same path (seed any RNG from the data).</li><li><b>No global state</b> that accumulates across iterations (or reset it), no leaks — LSan runs at the end and leaks are reported as bugs.</li><li><b>Check properties</b>, not just crashes: round-trip, two implementations agree (differential fuzzing, e.g. your JSON parser vs a reference), invariants hold.</li><li>Keep the target narrow: one parser or API, not the whole app.</li></ul>` },
      { title: 'What libFuzzer reports besides crashes', html: `${H.table(['finding', 'trigger', 'flag'], [['crash / sanitizer error', 'signal or ASan/UBSan report', '(always)'], ['timeout', 'one input runs too long — e.g. quadratic regex, infinite loop', '<code>-timeout=10</code> (s)'], ['out-of-memory', 'RSS over the limit, e.g. allocation sized by an untrusted length field', '<code>-rss_limit_mb=2048</code>, <code>-malloc_limit_mb</code>'], ['leak', 'LSan at the end of an input', '<code>-detect_leaks=1</code>']])}<p>Timeouts and OOMs are real denial-of-service bugs in code that parses untrusted input.</p>` },
      { title: 'Fuzzing the libFuzzer target in unit tests', html: `<p>Even without fuzzing, the target can run in normal CI: link it with a tiny <code>main</code> that reads every file in the corpus directory and calls <code>LLVMFuzzerTestOneInput</code> on it (libFuzzer's <code>-runs=0</code> does the same). Compilers without libFuzzer (GCC, MSVC with partial support) can still build this "replay" mode, so the corpus doubles as a regression suite.</p>` }
    ],
    deepDive: `<p><b>Coverage signal.</b> <code>-fsanitize=fuzzer</code> enables SanitizerCoverage <code>trace-pc-guard</code>/<code>inline-8bit-counters</code>: a counter per edge of the control-flow graph. libFuzzer turns counters into <b>features</b> by bucketing hit counts (1, 2, 3, 4–7, 8–15, 16–31, 32–127, 128+), so an input that runs a loop 8 times instead of 3 is "new" even on the same edges. It also traces comparisons (<code>trace-cmp</code>) and records operands in a table of recent compares, letting mutations insert the exact constant the code compared against — that is how 4-byte magic numbers fall in seconds.</p>
      <p><b>Corpus management.</b> The corpus grows with every new feature; <code>-merge=1</code> re-runs all inputs and greedily keeps a small subset (smallest inputs first) that preserves the union of features — the corpus-merge problem in the practice arena. libFuzzer's <b>entropic</b> power schedule (default) prioritises inputs that recently found rare features.</p>
      <p><b>Limits.</b> Coverage-guided fuzzing struggles with checksums/CRCs (patch them out under <code>#ifdef FUZZING_BUILD_MODE_UNSAFE_FOR_PRODUCTION</code>), encryption, and deep state machines (use structure-aware fuzzing). It finds bugs on paths it reaches, not proofs of absence. And libFuzzer is in maintenance mode in LLVM — new feature work happens in <b>AFL++</b> and <b>Centipede/FuzzTest</b> (Google's <code>FUZZ_TEST</code> macro integrates fuzzing into GoogleTest), but all of them accept the same <code>LLVMFuzzerTestOneInput</code> target, so targets are portable.</p>
      <p><b>Property-based testing</b> (RapidCheck, FuzzTest) is the unit-test cousin: generate structured random values, check a property, and <b>shrink</b> failures to a minimal counterexample — the same idea as crash minimisation (delta debugging, also in the practice arena).</p>`,
    aiEra: `<p>LLMs have changed fuzzing in two concrete ways. First, <b>writing fuzz targets</b>: Google's OSS-Fuzz-Gen uses LLMs to generate harnesses for untested APIs and has found real vulnerabilities in projects that had none — the bottleneck was always "someone has to write the target", and AI is good at that boilerplate. Second, <b>seed corpora and dictionaries</b>: an assistant can produce realistic sample files and token lists for a format quickly. What still needs you: deciding which properties to check (a target that only looks for crashes misses logic bugs), making the target deterministic and leak-free, triaging duplicates, and fixing root causes. And remember that AI-written parsers are exactly the code that most needs fuzzing.</p>`,
    problems: [{
      title: 'A Mutation-Based Fuzzer Loop Over a Pure Parser', level: 'Hard', tags: ['fuzzing', 'coverage-guided', 'simulation', 'PRNG'], companies: ['Google', 'Microsoft', 'Trail of Bits'],
      statement: `<p>Implement a tiny coverage-guided fuzzer. The target parser "crashes" when its input <b>starts with</b> the magic string <code>target</code>; its coverage for input s is the length of the longest common prefix of s and target. Run this deterministic loop and return the iteration (1-based) at which a crashing input is generated, or −1 if none within <code>maxIters</code>:</p><ul><li>PRNG: 32-bit state = seed; <code>next()</code>: state = state × 1664525 + 1013904223 (mod 2<sup>32</sup>); return state &gt;&gt; 8.</li><li>Corpus starts as [""], best = 0. Iteration it picks <code>corpus[(it − 1) mod corpus.size()]</code>.</li><li>Draw, in this order: op = next() % 3, pos = next() % (len + 1), ch = 'A' + next() % 26.</li><li>op 0 and pos &lt; len: replace s[pos] by ch. op 2 and pos &lt; len: erase s[pos]. Otherwise insert ch at pos.</li><li>If coverage = |target| → return it. Else if coverage &gt; best → best = coverage, append the mutant to the corpus.</li></ul>`,
      constraints: `1 ≤ |target| ≤ 6, letters A–Z; 0 ≤ seed &lt; 2<sup>31</sup>; 1 ≤ maxIters ≤ 10<sup>6</sup>.`,
      example: `<p>target "A", seed 1: the corpus holds only "" so every mutation is an insertion of a random letter; the first time the letter is 'A' (iteration ${H.c('g', '35')} for this seed) the parser crashes.</p>`,
      brute: { why: `<p>A "dumb" fuzzer generates each input from scratch at random, ignoring coverage. To hit a 4-letter word it needs ~26<sup>4</sup> ≈ 457 000 tries on average; with feedback it keeps "F", then "FU", … and needs only a few hundred. The brute force is still worth knowing: it is how blackbox fuzzers work when no instrumentation is possible.</p>`, code: R`
        #include <cstdint>
        #include <string>
        int blackboxFuzz(const std::string& target, std::uint32_t seed, int maxIters) {
            std::uint32_t st = seed;
            for (int it = 1; it <= maxIters; ++it) {
                std::string s;
                for (std::size_t k = 0; k < target.size(); ++k) {
                    st = st * 1664525u + 1013904223u;
                    s += static_cast<char>('A' + (st >> 8) % 26);
                }
                if (s == target) return it;          // no learning: every try is independent
            }
            return -1;
        }` },
      mcq: { q: 'What makes coverage-guided fuzzing exponentially faster than blind random inputs on nested checks?', options: ['Inputs that reach new branches are saved and mutated further, so progress on each check is kept', 'It runs inputs in parallel', 'It uses symbolic execution to solve each branch', 'It tries inputs in lexicographic order'], answer: 0, explain: 'Saving inputs that reach new coverage turns one needle-in-a-haystack search into a chain of small independent searches.' },
      hints: [`<p>Hint 1: Use <code>std::uint32_t</code> for the state: unsigned overflow wraps modulo 2<sup>32</sup> by definition (signed overflow would be UB). Draw the three random numbers in separate statements so the order is fixed.</p>`, `<p>Hint 2: Copy the chosen corpus element before mutating — the corpus must not change. Compute coverage as a simple prefix-match loop.</p>`, `<p>Hint 3: Check the crash before the "new coverage" test, and return the iteration number immediately. The corpus index uses the corpus size at the start of the iteration.</p>`],
      tests: { sig: 'string int int -> int', fn: 'fuzz', cases: [[["FUZZ",1,1000000],244],[["FUZZ",7,1000000],244],[["A",1,1000],35],[["BUG",42,1000000],345],[["FUZZ",1,10],-1],[["HELLO",3,1000000],1950],[["Z",5,1],-1]] },
      solution: {
        approach: `<p>Exactly the libFuzzer loop with one mutation per iteration and "prefix length" as the coverage feature: pick a corpus entry round-robin, mutate, measure, keep it if it increases coverage, stop on crash.</p>`,
        code: R`
          #include <cstdint>
          #include <string>
          #include <vector>

          int fuzz(const std::string& target, int seed, int maxIters) {
              std::uint32_t state = static_cast<std::uint32_t>(seed);
              auto next = [&state]() -> std::uint32_t {
                  state = state * 1664525u + 1013904223u;     // unsigned: wraps mod 2^32, well defined
                  return state >> 8;
              };
              auto coverage = [&target](const std::string& s) {
                  std::size_t k = 0;
                  while (k < s.size() && k < target.size() && s[k] == target[k]) ++k;
                  return k;
              };
              std::vector<std::string> corpus{""};
              std::size_t best = 0;
              for (int it = 1; it <= maxIters; ++it) {
                  std::string s = corpus[static_cast<std::size_t>(it - 1) % corpus.size()];   // copy, then mutate
                  const std::uint32_t op = next() % 3;
                  const std::size_t pos = next() % (s.size() + 1);
                  const char ch = static_cast<char>('A' + next() % 26);
                  if (op == 0 && pos < s.size()) s[pos] = ch;                      // ChangeByte
                  else if (op == 2 && pos < s.size()) s.erase(pos, 1);             // EraseByte
                  else s.insert(s.begin() + static_cast<std::ptrdiff_t>(pos), ch); // InsertByte
                  const std::size_t c = coverage(s);
                  if (c == target.size()) return it;                              // crash found
                  if (c > best) { best = c; corpus.push_back(std::move(s)); }      // new coverage: keep it
              }
              return -1;
          }`,
        dry: { head: ['event', 'input', 'coverage', 'corpus'], rows: [['start', '-', '0', '[""]'], ['first "F…" mutant', '"F"', '1 (new)', '["", "F"]'], ['first "FU…" mutant', '"FU"', '2 (new)', '["", "F", "FU"]'], ['…', '"FUZ"', '3 (new)', '4 entries'], ['crash', '"FUZZ"', '4 = |target|', 'return it']] },
        complexity: `<p>O(maxIters × |target|) time; corpus size ≤ |target| + 1.</p>`,
        followUps: ['Add hit-count buckets so loops that run more times count as new coverage.', 'How would a dictionary or comparison tracing change the number of iterations?', 'Why does round-robin selection waste time on the empty input, and what do power schedules do instead?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 7 — Code coverage and Google Benchmark
     ====================================================================== */
  topics.push({
    title: 'Code Coverage & Google Benchmark: Measuring Tests and Speed',
    analogy: `<p>A city inspector checks which streets the snow-plough actually drove down last night by reading its GPS log. "92% of streets" sounds great — until you notice the 8% missed includes the hospital road. And a street that was "driven" is not necessarily clear: the plough may have had its blade up. <b>Coverage</b> is that GPS log for your tests: it tells you what code <b>ran</b>, not whether anything was <b>checked</b>. Its real value is the list of streets nobody visited.</p>`,
    explain: `<p><b>Coverage</b> records which parts of the program executed while the tests ran:</p>
      ${H.table(['metric', 'question', 'example gap'], [
        ['<b>line</b> (statement)', 'did this line run?', '<code>if (a &amp;&amp; b) x();</code> is "covered" even if b was never false'],
        ['<b>function</b>', 'was the function called?', 'coarse; good for finding dead code'],
        ['<b>branch</b>', 'did each outcome (true <i>and</i> false) of every decision happen?', 'catches the missing <code>else</code> path'],
        ['<b>MC/DC</b>', 'did each condition independently flip the decision?', 'required for avionics (DO-178C level A); Clang 18+ supports it']
      ])}
      <p><b>Two toolchains:</b> GCC's <b>gcov</b> (<code>--coverage</code> = <code>-fprofile-arcs -ftest-coverage</code>; writes <code>.gcda</code> files; summarise with <code>lcov</code>/<code>genhtml</code> or <code>gcovr</code>) and Clang's <b>source-based coverage</b> (<code>-fprofile-instr-generate -fcoverage-mapping</code>; run with <code>LLVM_PROFILE_FILE=t-%p.profraw</code>; then <code>llvm-profdata merge</code> and <code>llvm-cov report/show</code>). Clang's is more precise for macros, templates and short-circuit conditions. Build coverage at <code>-O0</code> so lines map cleanly.</p>
      <p><b>Google Benchmark</b> is the standard microbenchmark library (C++ 12 showed why naive timing lies). You write <code>static void BM_X(benchmark::State&amp; state) { for (auto _ : state) { ... } }</code> and <code>BENCHMARK(BM_X)</code>; the library picks the iteration count until timing is stable, reports time per iteration, supports <code>-&gt;Range(8, 8&lt;&lt;10)</code> / <code>-&gt;Args({...})</code> for input sizes, <code>-&gt;Complexity(benchmark::oN)</code> for big-O fitting, <code>state.SetItemsProcessed</code> for throughput, and <code>--benchmark_repetitions=10 --benchmark_report_aggregates_only=true</code> for <b>mean, median, stddev and CV</b>. <code>benchmark::DoNotOptimize(x)</code> and <code>benchmark::ClobberMemory()</code> stop the optimiser from deleting the measured work.</p>
      <p><b>Statistics matter more than the number:</b> run repetitions, report the <b>median</b> (robust to the one run where the OS interrupted you), look at the spread, and compare two versions with a test (<code>compare.py</code> in the benchmark repo runs a Mann-Whitney U test) instead of eyeballing a 3% difference that is within noise.</p>`,
    clues: [
      '"what does 90% coverage tell you?" → which code ran, not that it was checked; look at the uncovered list',
      '"line vs branch coverage" → branch needs both outcomes of every decision',
      '"coverage gate in CI" → patch/diff coverage on changed lines beats a global percentage',
      '"benchmark result varies run to run" → repetitions, median, CV, pinned CPU, fixed frequency',
      '"compare two implementations\' speed" → Google Benchmark + compare.py (U-test), not one run each',
      '"benchmark reports 0 ns" → DoNotOptimize / ClobberMemory; the work was optimised away'
    ],
    code: [{ lang: 'bash', title: 'Coverage with Clang source-based coverage and with gcov', code: R`
      # Clang
      clang++ -O0 -g -fprofile-instr-generate -fcoverage-mapping tests.cpp src/*.cpp -o tests_cov
      LLVM_PROFILE_FILE="cov-%p.profraw" ./tests_cov
      llvm-profdata merge -sparse cov-*.profraw -o tests.profdata
      llvm-cov report ./tests_cov -instr-profile=tests.profdata -show-branch-summary
      llvm-cov show ./tests_cov -instr-profile=tests.profdata -show-branches=count -format=html -output-dir=cov_html

      # GCC
      g++ -O0 -g --coverage tests.cpp src/*.cpp -o tests_gcov
      ./tests_gcov
      gcovr --branches --html-details cov.html --fail-under-line 80` }, { lang: 'cpp', check: false, title: 'Google Benchmark: sizes, throughput, complexity (link benchmark::benchmark_main)', code: R`
      #include <benchmark/benchmark.h>
      #include <algorithm>
      #include <numeric>
      #include <random>
      #include <vector>

      static void BM_Sort(benchmark::State& state) {
          const auto n = static_cast<std::size_t>(state.range(0));
          std::vector<int> data(n);
          std::mt19937 rng(42);                                    // fixed seed: same data every run
          for (auto& x : data) x = static_cast<int>(rng());
          for (auto _ : state) {
              state.PauseTiming();                                 // exclude the copy (has its own overhead!)
              std::vector<int> v = data;
              state.ResumeTiming();
              std::sort(v.begin(), v.end());
              benchmark::DoNotOptimize(v.data());
              benchmark::ClobberMemory();
          }
          state.SetItemsProcessed(state.iterations() * static_cast<int64_t>(n));
          state.SetComplexityN(state.range(0));
      }
      BENCHMARK(BM_Sort)->RangeMultiplier(4)->Range(1 << 10, 1 << 20)->Complexity(benchmark::oNLogN);

      // ./bench --benchmark_repetitions=10 --benchmark_report_aggregates_only=true
      // BM_Sort/1048576_median   62.1 ms   ... items_per_second=16.9M/s
      // BM_Sort/1048576_cv        1.3 %` }],
    codeTitle: ['Collecting coverage', 'A Google Benchmark with sizes and statistics'],
    viz: [{
      title: 'Branch coverage vs line coverage on one function',
      input: '3,0; 1,1; 0,0',
      inputLabel: 'One branch point per ";" — the hit count of each outcome, e.g. "3,0" = true taken 3×, false 0× (up to 6 points)',
      gen: function (input) {
        var pts = splitList(txt(input, '3,0; 1,1; 0,0'), ';');
        if (!pts.length || pts.length > 6) throw new Error('Give 1-6 branch points like "3,0; 1,1"');
        var counts = pts.map(function (p) { var v = splitList(p, ',').map(Number); if (v.length < 2 || v.length > 4 || v.some(function (x) { return !(x >= 0) || x !== Math.floor(x); })) throw new Error('Each point needs 2-4 non-negative whole counts, e.g. "3,0"'); return v; });
        var frames = [], tot = 0, cov = 0, full = 0, rows = [];
        frames.push({ narr: 'Each <b>branch point</b> (an <code>if</code>, loop condition, <code>?:</code>, <code>switch</code>) has 2+ outcomes. Line coverage only asks whether the line ran; branch coverage asks whether <b>every outcome</b> happened at least once.', parts: [note('Counts come from the instrumentation counters (gcov .gcda or Clang .profraw).')] });
        counts.forEach(function (c, i) {
          var k = c.filter(function (x) { return x > 0; }).length, lineRan = c.some(function (x) { return x > 0; });
          tot += c.length; cov += k; if (k === c.length) full++;
          rows.push(['point ' + (i + 1), c.join(' / '), lineRan ? 'yes' : 'no', k + '/' + c.length]);
          var hl = {}; hl[i] = k === c.length ? 'ok' : k ? 'cur' : 'bad';
          frames.push({ narr: 'Point ' + (i + 1) + ': outcome counts ' + c.join(', ') + '. ' + (k === c.length ? '<span class="c-g">Fully covered.</span>' : k ? 'The line is "covered" for line coverage, but <span class="c-y">' + (c.length - k) + ' outcome(s) never happened</span> — e.g. the error path was never tested.' : '<span class="c-r">Never reached at all.</span>'),
            parts: [{ type: 'table', label: 'branch report', columns: ['point', 'outcome counts', 'line ran?', 'outcomes hit'], rows: rows.map(function (r) { return r.slice(); }), hl: hl }, { type: 'vars', label: 'running totals', vals: { outcomes_hit: cov, outcomes_total: tot, fully_covered_points: full } }] });
        });
        var lines = counts.filter(function (c) { return c.some(function (x) { return x > 0; }); }).length;
        frames.push({ narr: 'Result: line coverage of these decisions = ' + lines + '/' + counts.length + ', but branch coverage = <b>' + cov + '/' + tot + ' (' + (100 * cov / tot).toFixed(2) + '%)</b>. The gap is exactly the untested <code>else</code> paths.',
          parts: [{ type: 'bars', label: 'line vs branch coverage (%)', values: [Math.round(100 * lines / counts.length), Math.round(100 * cov / tot)], idxLabels: ['line', 'branch'], texts: [Math.round(100 * lines / counts.length) + '%', Math.round(100 * cov / tot) + '%'], hl: { 1: 'sel' } }] });
        return frames;
      }
    }, {
      title: 'Benchmark repetitions: median, IQR fences and the outlier',
      input: '10.2, 10.4, 10.1, 10.3, 25.0, 10.2, 10.5',
      inputLabel: 'Repetition times in ms, comma-separated (3-12 numbers)',
      gen: function (input) {
        var v = splitList(txt(input, '10.2, 10.4, 10.1, 10.3, 25.0, 10.2, 10.5'), ',').map(Number);
        if (v.length < 3 || v.length > 12 || v.some(function (x) { return !isFinite(x) || x < 0; })) throw new Error('Give 3-12 non-negative numbers, e.g. "10, 11, 30, 10"');
        var s = v.slice().sort(function (a, b) { return a - b; }), n = s.length;
        function med(a) { var m = a.length; return m % 2 ? a[(m - 1) / 2] : (a[m / 2 - 1] + a[m / 2]) / 2; }
        var q1 = med(s.slice(0, Math.floor(n / 2))), q3 = med(s.slice(Math.ceil(n / 2))), iqr = q3 - q1, lo = q1 - 1.5 * iqr, hi = q3 + 1.5 * iqr;
        var mean = v.reduce(function (a, b) { return a + b; }, 0) / n, kept = s.filter(function (x) { return x >= lo && x <= hi; });
        var keptMean = kept.reduce(function (a, b) { return a + b; }, 0) / kept.length;
        var frames = [], r = function (x) { return Math.round(x * 100) / 100; };
        frames.push({ narr: 'Raw repetitions in run order. The <b>mean</b> is ' + r(mean) + ' ms — pulled up by any slow run (an interrupt, a page fault storm, a frequency drop).', parts: [{ type: 'bars', label: 'time per repetition (ms)', values: v.slice(), texts: v.map(String) }] });
        frames.push({ narr: 'Sort them. The <b>median</b> (middle value) is ' + r(med(s)) + ' ms: one crazy run cannot move it. Google Benchmark prints <code>_median</code> next to <code>_mean</code> with <code>--benchmark_repetitions</code>.', parts: [{ type: 'bars', label: 'sorted', values: s.slice(), texts: s.map(String), hl: (function () { var h = {}; if (n % 2) h[(n - 1) / 2] = 'sel'; else { h[n / 2 - 1] = 'sel'; h[n / 2] = 'sel'; } return h; })() }] });
        frames.push({ narr: 'Quartiles: Q1 = ' + r(q1) + ', Q3 = ' + r(q3) + ', IQR = ' + r(iqr) + '. Tukey fences: [' + r(lo) + ', ' + r(hi) + ']. Anything outside is an <b>outlier</b>.', parts: [{ type: 'vars', label: 'statistics', vals: { Q1: r(q1), median: r(med(s)), Q3: r(q3), IQR: r(iqr), low_fence: r(lo), high_fence: r(hi) } }] });
        var hl = {}; s.forEach(function (x, i) { hl[i] = x < lo || x > hi ? 'bad' : 'ok'; });
        frames.push({ narr: (n - kept.length) + ' outlier(s) removed. Mean of the rest = <b>' + r(keptMean) + ' ms</b> (vs raw mean ' + r(mean) + '). Report the median and the spread; investigate outliers rather than hiding them if they are frequent — they may be real tail latency.', parts: [{ type: 'bars', label: 'kept (green) vs outliers (red)', values: s.slice(), texts: s.map(String), hl: hl }] });
        return frames;
      }
    }],
    examples: [
      { title: '100% line coverage, untested bug', html: `<p><code>int safeDiv(int a, int b) { return b ? a / b : 0; }</code> with one test <code>safeDiv(6, 3)</code> has 100% line coverage, 50% branch coverage (b == 0 never tested), and the real bug <code>safeDiv(INT_MIN, -1)</code> (overflow, UB) is untouched by any metric. Coverage finds <b>untested code</b>; it cannot find <b>untested values</b>. Boundary-value tests, sanitizers and fuzzing cover that gap.</p>` },
      { title: 'Patch coverage beats a global number', html: `<p>A 400 000-line codebase at 71% coverage: a PR that adds 50 untested lines moves the global number by 0.01% — invisible. Tools like Codecov compute <b>patch coverage</b>: of the executable lines this PR changed, how many ran in tests? A rule like "patch coverage ≥ 80%" is actionable for every PR without demanding that old code be fixed first.</p>` },
      { title: 'Mutation testing: does anything check the covered code?', html: `<p>Mutation tools (Mull for C/C++, built on LLVM) make small changes — flip <code>&lt;</code> to <code>&lt;=</code>, replace <code>+</code> with <code>-</code>, delete a call — and rerun the tests. A mutant that survives means the covered code is not actually checked. The <b>mutation score</b> (killed/total) is a far better test-quality metric than coverage, but costs one test run per mutant, so teams run it on changed code only.</p>` },
      { title: 'Benchmark hygiene checklist', html: `<ul><li>Release flags (<code>-O2</code>/<code>-O3</code>, <code>-DNDEBUG</code>), same as production. Google Benchmark warns "Library was built as DEBUG".</li><li>Disable CPU frequency scaling / turbo for A/B runs, pin with <code>taskset</code>; the library warns "CPU scaling is enabled".</li><li>Realistic data sizes (does it fit in L1, L2, L3, or RAM?) — use <code>Range</code> to see the cliffs.</li><li>Repetitions + median + CV; treat differences under ~2× the CV as noise.</li><li>Keep results as JSON (<code>--benchmark_out=res.json</code>) and track trends over commits.</li></ul>` }
    ],
    deepDive: `<p><b>How coverage instrumentation works.</b> gcov places a counter on a <b>spanning-tree complement</b> of the control-flow graph's edges (Ball–Larus): counting only some edges is enough to reconstruct all block counts by flow conservation, which reduces overhead. Counters live in the binary and are dumped to <code>.gcda</code> at exit — so a crash or <code>_exit</code> loses them (call <code>__gcov_dump()</code> before exiting in death-test children). Clang's source-based coverage maps counters to <b>source regions</b> (not lines) via the coverage mapping section, which is why it reports <code>a &amp;&amp; b</code> sub-conditions and macro expansions correctly. Optimised builds merge and delete blocks, making line attribution unreliable — hence <code>-O0</code>.</p>
      <p><b>Concurrency and coverage:</b> counters are plain increments by default; with threads, counts can be lost (a race, harmless for "was it hit?"). <code>-fprofile-update=atomic</code> makes them exact at a cost. Merge results from many processes (CTest runs each test in its own process) with <code>LLVM_PROFILE_FILE=%p</code> / <code>%m</code> patterns or gcov's automatic accumulation.</p>
      <p><b>Benchmark statistics.</b> Timing noise is not Gaussian: it is skewed with a long right tail (interrupts, migrations, cache misses after context switches). That is why the median and quartiles are more honest than mean ± stddev, and why a single-number comparison misleads. For A/B decisions use many interleaved repetitions and a non-parametric test; for latency-sensitive services, benchmark the <b>tail</b> (p99) with realistic load rather than a tight loop, since a microbenchmark keeps everything hot in cache.</p>`,
    aiEra: `<p>AI can lift coverage numbers fast: ask for "tests to reach 90% coverage" and it will generate calls that execute every branch — often with weak or no assertions, so coverage rises while the mutation score does not. Treat coverage as a <b>map of what to think about</b>, and judge AI-written tests by mutation score or by deliberately breaking code. For benchmarks, AI often writes loops whose results are unused (0 ns), times the setup, or benchmarks unrealistic tiny inputs; it is, however, useful for producing the boilerplate of <code>BENCHMARK(...)-&gt;Args</code> matrices and for summarising a JSON results diff. Always ask "what would make this number wrong?" before trusting it.</p>`,
    problems: [{
      title: 'Branch-Coverage Calculator', level: 'Easy', tags: ['coverage', 'gcov', 'counting', 'formatting'], companies: ['Microsoft', 'Bloomberg', 'Qualcomm'],
      statement: `<p>A coverage tool gives you, for every branch point, the hit count of each of its outcomes (an <code>if</code> has 2, a <code>switch</code> may have more). Return a summary string:</p><pre>C/T (P%), F of B points fully covered</pre><p>where T is the total number of outcomes, C the number with a positive count, P = 100·C/T printed with exactly two decimals, B the number of branch points and F the number whose outcomes were all hit. If there are no outcomes at all, return <code>"no branches"</code>.</p>`,
      constraints: `0 ≤ points ≤ 10<sup>5</sup>, each with 2–8 outcome counts in [0, 10<sup>9</sup>].`,
      example: `<p>[[3,0],[1,1],[0,0]] → outcomes hit: 1 + 2 + 0 = 3 of 6 → ${H.c('g', '"3/6 (50.00%), 1 of 3 points fully covered"')}. Point 1's false outcome and both outcomes of point 3 were never tested.</p>`,
      brute: { why: `<p>Counting only "was the point reached" (any count &gt; 0) gives line-style coverage: [[3,0],[1,1],[0,0]] would look like 2/3 = 66.67% even though half the outcomes never happened. Branch coverage must count each outcome separately.</p>`, code: R`
        #include <string>
        #include <vector>
        std::string lineStyleCoverage(const std::vector<std::vector<int>>& counts) {
            int reached = 0;
            for (const auto& p : counts) {
                bool any = false;
                for (int c : p) any = any || c > 0;
                reached += any;                     // ignores untested outcomes
            }
            return std::to_string(reached) + "/" + std::to_string(counts.size());
        }` },
      mcq: { q: 'A function has 100% line coverage. Which statement must be true?', options: ['Every line executed at least once during the tests', 'Every if/else outcome was tested', 'The function has no bugs', 'Every line\'s result was checked by an assertion'], answer: 0, explain: 'Line coverage only says each line ran. Branch outcomes, values and assertions are separate questions.' },
      hints: [`<p>Hint 1: Three counters: total outcomes, outcomes with count &gt; 0, and points where every outcome is &gt; 0.</p>`, `<p>Hint 2: Format the percentage with <code>snprintf(buf, sizeof buf, "%.2f", 100.0 * c / t)</code> or <code>std::format("{:.2f}", ...)</code>.</p>`, `<p>Hint 3: Check for T == 0 before dividing (no points, or only empty points) and return "no branches".</p>`],
      tests: { sig: 'int[][] -> string', fn: 'branchCoverage', cases: [[[[[3,0],[1,1],[0,0]]],"3/6 (50.00%), 1 of 3 points fully covered"],[[[]],"no branches"],[[[[5,5]]],"2/2 (100.00%), 1 of 1 points fully covered"],[[[[0,0,0,7],[2,0]]],"2/6 (33.33%), 0 of 2 points fully covered"],[[[[1,0],[1,0],[1,0]]],"3/6 (50.00%), 0 of 3 points fully covered"],[[[[0,1],[4,4],[9,1],[0,0],[3,3]]],"7/10 (70.00%), 3 of 5 points fully covered"],[[[[0,0,0]]],"0/3 (0.00%), 0 of 1 points fully covered"]] },
      solution: {
        approach: `<p>One pass over all points: add the number of outcomes to T, the number of positive counts to C, and increment F when they are equal. Format with <code>%.2f</code>.</p>`,
        code: R`
          #include <cstdio>
          #include <string>
          #include <vector>

          std::string branchCoverage(const std::vector<std::vector<int>>& counts) {
              long long total = 0, covered = 0, full = 0;
              for (const auto& point : counts) {
                  long long hit = 0;
                  for (int c : point) hit += (c > 0);
                  total += static_cast<long long>(point.size());
                  covered += hit;
                  if (hit == static_cast<long long>(point.size())) ++full;
              }
              if (total == 0) return "no branches";
              char pct[32];
              std::snprintf(pct, sizeof pct, "%.2f", 100.0 * static_cast<double>(covered) / static_cast<double>(total));
              return std::to_string(covered) + "/" + std::to_string(total) + " (" + pct + "%), " +
                     std::to_string(full) + " of " + std::to_string(counts.size()) + " points fully covered";
          }`,
        dry: { head: ['point', 'counts', 'hit', 'C / T', 'F'], rows: [['1', '3, 0', '1', '1 / 2', '0'], ['2', '1, 1', '2', '3 / 4', '1'], ['3', '0, 0', '0', '3 / 6', '1'], ['result', '', '', '50.00%', '1 of 3']] },
        complexity: `<p>O(total outcomes) time, O(1) extra space.</p>`,
        followUps: ['How would you compute MC/DC for <code>if (a &amp;&amp; (b || c))</code> from per-condition test vectors?', 'How would you merge counts from two test runs?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 8 — Debugging with gdb/lldb, core dumps, and CI
     ====================================================================== */
  var SYMS = [[0x1000, 0x40, 'main'], [0x1040, 0x80, 'handle(Request const&)'], [0x10c0, 0x30, 'Session::user() const'], [0x1100, 0x60, 'parseHeader(char const*)']];
  topics.push({
    title: 'Debugging with gdb/lldb, Core Dumps & CI for C++ Projects',
    analogy: `<p>When a plane crashes, investigators do not ask the pilot to fly again; they recover the <b>black box</b> — a frozen record of the last moments: altitude, controls, voices. A <b>core dump</b> is your program's black box: a snapshot of its memory and registers at the instant it crashed, which a debugger can open hours later on another machine. And CI is the pre-flight checklist: every change is built and tested the same way, by a machine that never forgets a step.</p>`,
    explain: `<p><b>Debugger essentials</b> (gdb / lldb). Build with <code>-g</code> (and <code>-O0</code> or <code>-Og</code> for comfortable stepping).</p>
      ${H.table(['task', 'gdb', 'lldb'], [
        ['start with arguments', '<code>gdb --args ./app in.txt</code>, <code>run</code>', '<code>lldb -- ./app in.txt</code>, <code>run</code>'],
        ['breakpoint (conditional)', '<code>break parser.cpp:42 if n &gt; 100</code>', '<code>br set -f parser.cpp -l 42 -c "n &gt; 100"</code>'],
        ['step over / into / out', '<code>next</code> / <code>step</code> / <code>finish</code>', '<code>n</code> / <code>s</code> / <code>finish</code>'],
        ['call stack, select frame', '<code>bt</code>, <code>frame 2</code>', '<code>bt</code>, <code>frame select 2</code>'],
        ['inspect', '<code>print v</code>, <code>info locals</code>, <code>ptype s</code>', '<code>p v</code>, <code>frame variable</code>, <code>type lookup</code>'],
        ['stop when memory changes', '<code>watch obj-&gt;refcount</code>', '<code>watchpoint set variable obj-&gt;refcount</code>'],
        ['all threads\' stacks', '<code>thread apply all bt</code>', '<code>bt all</code>'],
        ['attach to running process', '<code>gdb -p PID</code>', '<code>lldb -p PID</code>']
      ])}
      <p>Pretty-printers make <code>std::vector</code>, <code>std::map</code> and <code>std::string</code> readable; a <b>watchpoint</b> (hardware-assisted, ~4 per CPU) is the fastest way to find "who overwrote this field?". <code>rr record ./app</code> + <code>rr replay</code> adds <b>reverse execution</b> (<code>reverse-continue</code> back to the watchpoint) — the best tool for bugs that happen once in 50 runs.</p>
      <p><b>Core dumps.</b> On a crash (SIGSEGV, SIGABRT…), the kernel can write the process image to disk. Enable with <code>ulimit -c unlimited</code>; where it goes is set by <code>/proc/sys/kernel/core_pattern</code> — on systemd distributions usually <b>systemd-coredump</b>: list with <code>coredumpctl list</code>, open with <code>coredumpctl gdb PID</code>. Otherwise <code>gdb ./app core</code>, then <code>bt</code>, <code>frame N</code>, <code>info locals</code>. You need the <b>exact same binary</b> plus its debug info: ship stripped binaries but keep <b>separate debug files</b> (<code>objcopy --only-keep-debug</code>, build-id, debuginfod servers) so production cores are debuggable.</p>
      <p><b>CI for a C++ project</b> is a matrix of builds, each catching a different class of bug: (1) format + clang-tidy; (2) Debug build + unit tests with <code>-Werror</code>; (3) ASan+UBSan tests; (4) TSan tests; (5) Release build + tests (UB that only shows at -O2); (6) several compilers (GCC, Clang, MSVC) and OSes; (7) coverage report; (8) a time-boxed fuzz run; (9) benchmarks on a dedicated machine, nightly. Cache compilation (ccache/sccache), shard tests (<code>GTEST_TOTAL_SHARDS</code>/<code>GTEST_SHARD_INDEX</code>, <code>ctest -j</code>), and upload crash artefacts (core files, crash inputs, logs).</p>`,
    clues: [
      '"program crashed in production, how do you debug?" → core dump + matching binary + debug symbols (build-id, debuginfod)',
      '"who overwrites this variable?" → hardware watchpoint (or ASan if it is out of bounds)',
      '"crashes once in 100 runs" → rr record/replay with reverse execution; run under stress/chaos; TSan',
      '"value optimised out" in gdb → -Og/-O0 debug build, or read registers/disassembly',
      '"set up CI for a C++ library" → matrix: compilers × build types × sanitizers, ccache, sharded tests, artefacts',
      '"program hangs" → attach gdb -p PID, thread apply all bt: look for two threads waiting on each other\'s locks'
    ],
    code: [{ lang: 'text', title: 'A gdb session on a core dump', code: R`
      $ ulimit -c unlimited && ./server
      Segmentation fault (core dumped)
      $ coredumpctl gdb                     # or: gdb ./server core.4242
      Core was generated by './server'.
      Program terminated with signal SIGSEGV, Segmentation fault.
      #0  0x000055555555a1b4 in Session::user (this=0x0) at session.cpp:42
      42        return user_;
      (gdb) bt
      #0  Session::user (this=0x0) at session.cpp:42
      #1  0x000055555555b2c0 in handle (req=...) at server.cpp:88
      #2  0x000055555555c010 in main () at main.cpp:20
      (gdb) frame 1
      #1  handle (req=...) at server.cpp:88
      88        auto name = cache.find(req.sid)->user();
      (gdb) print req.sid
      $1 = "expired-7f3a"
      (gdb) print cache.size()
      $2 = 0                               # find() returned nullptr for an evicted session: missing check
      (gdb) info threads                   # other threads at the moment of the crash
      (gdb) thread apply all bt` }, { lang: 'yaml', title: 'A CI matrix (GitHub Actions) for a CMake project', code: R`
      name: ci
      on: [push, pull_request]
      jobs:
        test:
          runs-on: ubuntu-24.04
          strategy:
            fail-fast: false
            matrix:
              include:
                - { name: gcc-debug,    cc: gcc-14,   cxx: g++-14,     type: Debug,          flags: "" }
                - { name: clang-asan,   cc: clang-18, cxx: clang++-18, type: Debug,          flags: "-fsanitize=address,undefined -fno-sanitize-recover=all -fno-omit-frame-pointer" }
                - { name: clang-tsan,   cc: clang-18, cxx: clang++-18, type: Debug,          flags: "-fsanitize=thread" }
                - { name: gcc-release,  cc: gcc-14,   cxx: g++-14,     type: RelWithDebInfo, flags: "" }
          name: ${'$'}{{ matrix.name }}
          steps:
            - uses: actions/checkout@v4
            - uses: hendrikmuhs/ccache-action@v1.2
            - name: configure
              run: >
                cmake -S . -B build -G Ninja -DCMAKE_BUILD_TYPE=${'$'}{{ matrix.type }}
                -DCMAKE_C_COMPILER=${'$'}{{ matrix.cc }} -DCMAKE_CXX_COMPILER=${'$'}{{ matrix.cxx }}
                -DCMAKE_CXX_FLAGS="${'$'}{{ matrix.flags }}" -DCMAKE_COMPILE_WARNING_AS_ERROR=ON
                -DCMAKE_CXX_COMPILER_LAUNCHER=ccache
            - run: cmake --build build -j
            - name: test
              env: { ASAN_OPTIONS: "detect_leaks=1", UBSAN_OPTIONS: "print_stacktrace=1", GTEST_COLOR: "yes" }
              run: ctest --test-dir build -j 4 --output-on-failure --repeat until-pass:2 --timeout 120
            - if: failure()
              uses: actions/upload-artifact@v4
              with:
                name: logs-${'$'}{{ matrix.name }}
                path: build/Testing/Temporary` }],
    codeTitle: ['Post-mortem debugging of a core dump', 'CI matrix: compilers × build types × sanitizers'],
    viz: {
      title: 'Symbolising a raw backtrace (what addr2line and gdb do)',
      input: '0x10d4 0x1078 0x1010',
      inputLabel: 'Return addresses from a crash, innermost first (hex, up to 6). Symbols: main 0x1000+0x40, handle 0x1040+0x80, Session::user 0x10c0+0x30, parseHeader 0x1100+0x60',
      gen: function (input) {
        var addrs = splitList(txt(input, '0x10d4 0x1078 0x1010'), /[\s,]+/).map(function (a) { var v = parseInt(a, 16); if (isNaN(v)) throw new Error('"' + a + '" is not a hex address like 0x10d4'); return v; });
        if (!addrs.length || addrs.length > 6) throw new Error('Give 1-6 addresses');
        var frames = [], resolved = [];
        var table = SYMS.map(function (s) { return [s[2], '0x' + s[0].toString(16), '0x' + (s[0] + s[1]).toString(16)]; });
        frames.push({ narr: 'A stripped binary\'s crash handler (or a minidump) gives only <b>raw return addresses</b>. The symbol table (from the unstripped binary or the separate debug file matched by <b>build-id</b>) maps address ranges to functions.', parts: [{ type: 'table', label: 'symbol table (sorted by start)', columns: ['function', 'start', 'end (exclusive)'], rows: table }, { type: 'stack', label: 'raw stack (top = crash site)', items: addrs.map(function (a) { return '0x' + a.toString(16); }).reverse() }] });
        addrs.forEach(function (a, i) {
          var hit = -1; SYMS.forEach(function (s, k) { if (a >= s[0] && a < s[0] + s[1]) hit = k; });
          var name = hit < 0 ? '??' : SYMS[hit][2] + '+0x' + (a - SYMS[hit][0]).toString(16);
          resolved.push('#' + i + ' ' + name);
          var hl = {}; if (hit >= 0) hl[hit] = 'ok';
          frames.push({ narr: 'Frame #' + i + ': 0x' + a.toString(16) + ' → ' + (hit < 0 ? '<span class="c-r">no symbol covers it (?? — wrong binary, JIT code, or a corrupted stack)</span>' : 'binary search finds <b>' + SYMS[hit][2] + '</b> (starts at 0x' + SYMS[hit][0].toString(16) + '), offset 0x' + (a - SYMS[hit][0]).toString(16) + '. With DWARF line tables, the offset also maps to file:line.'),
            parts: [{ type: 'table', label: 'symbol table', columns: ['function', 'start', 'end (exclusive)'], rows: table, hl: hl }, { type: 'queue', label: 'symbolised backtrace', items: resolved.slice(), hl: (function () { var h = {}; h[resolved.length - 1] = hit < 0 ? 'bad' : 'ok'; return h; })() }] });
        });
        frames.push({ narr: 'This is what gdb\'s <code>bt</code>, <code>addr2line -f -C -e app 0x10d4</code>, <code>llvm-symbolizer</code> and the sanitizers\' report printer do. Without the matching debug info every frame is <b>??</b> — keep debug files for every shipped build.', parts: [{ type: 'queue', label: 'final backtrace', items: resolved }] });
        return frames;
      }
    },
    examples: [
      { title: 'Finding a hang with gdb', html: `<p>The service stops responding. <code>gdb -p $(pidof server)</code>, then <code>thread apply all bt</code>: thread 3 is in <code>pthread_mutex_lock</code> called from <code>Cache::put</code> while holding <code>statsMutex</code>; thread 7 is in <code>pthread_mutex_lock</code> from <code>Stats::flush</code> while holding <code>cacheMutex</code>. Classic lock-order inversion — TSan would have warned in CI (<code>lock-order-inversion (potential deadlock)</code>). Fix: one global lock order, or <code>std::scoped_lock(a, b)</code>.</p>` },
      { title: 'Watchpoint: who corrupts the field?', html: `<p>A refcount becomes 0xdeadbeef. In gdb: <code>break Widget::Widget</code>, run, <code>watch -l this-&gt;refcount_</code> (<code>-l</code> = watch the address, so it survives leaving the scope), <code>continue</code>. The debugger stops at the exact instruction that writes the field, with a stack. If the writer is a <code>memcpy</code> from a neighbouring buffer, switch to ASan, which would report the overflow at the source.</p>` },
      { title: 'Death tests and core dumps in CI', html: `<p>A test binary that crashes in CI leaves you only the log. Make crashes debuggable: run tests with <code>ulimit -c unlimited</code>, collect cores (or use <code>catchsegv</code>-style handlers that print a symbolised backtrace via <code>backtrace()</code> or <b>cpptrace</b>/<b>Boost.Stacktrace</b>; C++23 has <code>std::stacktrace</code>), and upload them as artefacts together with the exact test binary. Sanitizer builds print symbolised stacks automatically when <code>llvm-symbolizer</code> is on the PATH.</p>`, code: { lang: 'cpp', check: false, code: R`
        #include <cstdio>
        #include <stacktrace>      // C++23: needs -lstdc++exp (GCC 14) or -lstdc++_libbacktrace (GCC 12-13)
        void logCrashContext() {
        #if defined(__cpp_lib_stacktrace)
            std::printf("%s\n", std::to_string(std::stacktrace::current()).c_str());
        #else
            std::printf("stacktrace not available in this standard library\n");
        #endif
        }` } },
      { title: 'Flaky tests: quarantine, do not ignore', html: `<p>A test that fails 1 time in 50 is either a test bug (timing, shared state, unseeded randomness) or a real race. Detect with <code>--gtest_repeat=1000 --gtest_shuffle</code> or <code>ctest --repeat until-fail:200</code> and under TSan. In CI, <code>--repeat until-pass:2</code> keeps the pipeline green, but log every retry and track flakiness per test; a quarantined test needs an owner and a deadline.</p>` }
    ],
    deepDive: `<p><b>Why optimised code is hard to debug:</b> at -O2 variables live in registers that are reused ("&lt;optimized out&gt;"), lines are reordered and merged, and inlined functions have no frame of their own (gdb shows them as inlined frames using DWARF inline info). <code>-Og</code> keeps most optimisations that do not hurt debugging; <code>-fno-omit-frame-pointer</code> makes stack walking reliable and cheap (many distributions now build with frame pointers for profiling). For production binaries, build <code>RelWithDebInfo</code> (-O2 -g), strip, and keep the debug file keyed by build-id.</p>
      <p><b>What is in a core file:</b> an ELF file with <code>PT_LOAD</code> segments (the process's writable memory, and optionally read-only mappings depending on <code>coredump_filter</code>), and <code>PT_NOTE</code> sections with registers of every thread, signal info and the auxiliary vector. The code pages usually are <b>not</b> included — the debugger reads them from the binary, which is why it must be the exact build. Cores of big processes are huge; production systems often use <b>minidumps</b> (Breakpad/Crashpad: stacks + a little memory) and symbolise on a server.</p>
      <p><b>Exit statuses.</b> When a test child process dies, the parent's <code>waitpid</code> status encodes it: normal exit → low 7 bits are 0 and the exit code is in bits 8–15; killed by signal → low 7 bits are the signal number, bit 7 = "core dumped". Shells show signal deaths as 128 + signal (139 = SIGSEGV). CTest, death tests and CI runners all decode this — you will decode it yourself in the practice arena.</p>
      <p><b>CI economics:</b> a C++ matrix can take an hour. Keep the PR path fast (incremental builds with ccache, only affected tests, clang-tidy on changed lines) and push slow jobs (full MSan, long fuzzing, full benchmark suite, exotic platforms) to nightly runs, with automatic bisection when they fail. Hermetic toolchains (containers, pinned compiler versions) keep "works on CI, fails locally" rare.</p>`,
    aiEra: `<p>AI assistants are now good debugging partners: paste a backtrace, the relevant frames' source and <code>info locals</code>, and they will often name the bug class (null after a failed lookup, iterator invalidation, lock inversion) and the next command to run. Some debuggers and IDEs integrate this directly. They cannot see your process's memory unless you show it, and they will confidently guess when the stack is corrupted or symbols are missing — "??" frames need symbols, not speculation. For CI, AI generates workflow YAML quickly; check that sanitizer jobs really set the flags on <b>both</b> compile and link, that failures are not swallowed (<code>continue-on-error</code>, <code>|| true</code>), and that caches are keyed on the compiler version.</p>`,
    problems: [{
      title: 'Symbolise a Raw Backtrace', level: 'Medium', tags: ['debugging', 'binary search', 'symbols', 'hex'], companies: ['Apple', 'Microsoft', 'Nvidia'],
      statement: `<p>A crash reporter sends raw return addresses. You have the symbol table: function i starts at <code>starts[i]</code>, has size <code>sizes[i]</code> bytes and is named <code>names[i]</code> (ranges do not overlap; input order is arbitrary). For each address (in order) return <code>"name+0xOFF"</code> (offset in lowercase hex, no leading zeros, <code>0x0</code> for zero) if some function satisfies start ≤ addr &lt; start + size, else <code>"??"</code>.</p>`,
      constraints: `≤ 10<sup>5</sup> symbols and addresses; values up to 2<sup>62</sup> (use 64-bit).`,
      example: `<p>main@4096 (104 bytes), parse@4200 (300), crash@4500 (16); addresses 4100, 4220, 4510, 4600 → ${H.c('g', 'main+0x4')}, parse+0x14, crash+0xa, ${H.c('r', '??')} (4600 is past crash's end at 4516).</p>`,
      brute: { why: `<p>Scanning all symbols for every address is O(S·A) — 10<sup>10</sup> steps at the limits. Sorting symbols by start once and binary-searching each address (the last start ≤ addr, then a size check) is O((S + A) log S), which is how addr2line and symbolizers work.</p>`, code: R`
        #include <string>
        #include <vector>
        std::vector<std::string> symbolizeSlow(const std::vector<long long>& starts, const std::vector<std::string>& names,
                                               const std::vector<long long>& sizes, const std::vector<long long>& addrs) {
            std::vector<std::string> out;
            for (long long a : addrs) {
                std::string r = "??";
                for (std::size_t i = 0; i < starts.size(); ++i)          // O(S) per address
                    if (a >= starts[i] && a < starts[i] + sizes[i]) r = names[i];
                out.push_back(r);
            }
            return out;
        }` },
      mcq: { q: 'gdb shows <code>?? ()</code> for every frame of a production core. Most likely cause?', options: ['The debugger does not have the matching binary/debug info for that build', 'The program was compiled with -O2', 'The core file is too large', 'The crash was in a different thread'], answer: 0, explain: 'Without the exact build\'s symbols (matched by build-id), addresses cannot be mapped to functions. Keep separate debug files or use debuginfod.' },
      hints: [`<p>Hint 1: Sort symbol indices by start address. For an address a, the only candidate is the symbol with the largest start ≤ a.</p>`, `<p>Hint 2: <code>std::upper_bound</code> on the sorted starts gives the first start &gt; a; step back one. If there is none, or a ≥ start + size, the answer is "??".</p>`, `<p>Hint 3: Format the offset with <code>std::snprintf(buf, n, "%llx", off)</code> or a stringstream with <code>std::hex</code>. Remember addresses equal to start + size are outside (end is exclusive).</p>`],
      tests: { sig: 'long[] string[] long[] long[] -> string[]', fn: 'symbolize', cases: [[[[4096,4200,4500],["main","parse","crash"],[104,300,16],[4100,4220,4510,4600]],["main+0x4","parse+0x14","crash+0xa","??"]],[[[],[],[],[1]],["??"]],[[[4500,4096],["b","a"],[10,10],[4096,4505,4106,4509]],["a+0x0","b+0x5","??","b+0x9"]],[[[0],["zero"],[1],[0,1]],["zero+0x0","??"]],[[[93824992235520],["_start"],[64],[93824992235583,93824992235584]],["_start+0x3f","??"]],[[[100,200],["f","g"],[50,50],[]],[]],[[[16,48],["x","y"],[16,16],[31,32,47,48,63,64]],["x+0xf","??","??","y+0x0","y+0xf","??"]]] },
      solution: {
        approach: `<p>Sort symbols by start; for each address use <code>upper_bound</code> to find the candidate, check the size, and format <code>name+0xoff</code>. O((S + A) log S).</p>`,
        code: R`
          #include <algorithm>
          #include <cstdio>
          #include <numeric>
          #include <string>
          #include <vector>

          std::vector<std::string> symbolize(const std::vector<long long>& starts, const std::vector<std::string>& names,
                                             const std::vector<long long>& sizes, const std::vector<long long>& addrs) {
              std::vector<std::size_t> idx(starts.size());
              std::iota(idx.begin(), idx.end(), 0);
              std::sort(idx.begin(), idx.end(), [&](std::size_t a, std::size_t b) { return starts[a] < starts[b]; });
              std::vector<long long> sorted;
              for (std::size_t i : idx) sorted.push_back(starts[i]);

              std::vector<std::string> out;
              out.reserve(addrs.size());
              for (long long a : addrs) {
                  auto it = std::upper_bound(sorted.begin(), sorted.end(), a);   // first start > a
                  if (it == sorted.begin()) { out.push_back("??"); continue; }
                  std::size_t k = idx[static_cast<std::size_t>(it - sorted.begin()) - 1];
                  if (a >= starts[k] + sizes[k]) { out.push_back("??"); continue; }   // past the end: a gap
                  char buf[32];
                  std::snprintf(buf, sizeof buf, "%llx", static_cast<unsigned long long>(a - starts[k]));
                  out.push_back(names[k] + "+0x" + buf);
              }
              return out;
          }`,
        dry: { head: ['addr', 'candidate (largest start ≤ addr)', 'in range?', 'output'], rows: [['4100', 'main@4096', '4100 < 4200 ✓', 'main+0x4'], ['4220', 'parse@4200', '✓', 'parse+0x14'], ['4510', 'crash@4500', '✓', 'crash+0xa'], ['4600', 'crash@4500', '4600 ≥ 4516 ✗', '??']] },
        complexity: `<p>O(S log S + A log S) time, O(S) extra space.</p>`,
        followUps: ['How do inlined functions change symbolisation (DWARF inline frames)?', 'Why do return addresses point one instruction past the call, and why do symbolizers subtract 1?']
      }
    }]
  });

  /* ======================================================================
     PRACTICE ARENA
     ====================================================================== */
  practice.push({
    title: 'Format an EXPECT_EQ Failure Message', level: 'Easy', tags: ['GoogleTest', 'assertions', 'string formatting'], companies: ['Google', 'Bloomberg', 'Adobe'],
    statement: `<p>Reproduce how GoogleTest prints a failed <code>EXPECT_EQ(e1, e2)</code>. Given the two expression texts and their values, return <code>""</code> if the values are equal; otherwise return these lines joined by <code>\\n</code>:</p><pre>Expected equality of these values:
  e1
    Which is: v1
  e2
    Which is: v2</pre><p>A <code>Which is:</code> line is <b>omitted</b> when the expression text is exactly the decimal text of its value (a literal like <code>5</code> needs no explanation).</p>`,
    constraints: `Expressions are non-empty, without newlines; values fit in 64-bit signed integers.`,
    example: `<p>EXPECT_EQ(add(2, 2), 5) with values 4 and 5 → <code>"Expected equality of these values:\\n  add(2, 2)\\n    Which is: 4\\n  5"</code>. The literal 5 explains itself.</p>`,
    brute: { why: `<p>Always printing both "Which is" lines is correct but noisy: <code>5 Which is: 5</code> adds nothing. The detail that makes a framework pleasant is deciding when extra lines carry information.</p>`, code: R`
      #include <string>
      std::string formatAlways(const std::string& e1, const std::string& e2, long long v1, long long v2) {
          if (v1 == v2) return "";
          return "Expected equality of these values:\n  " + e1 + "\n    Which is: " + std::to_string(v1) +
                 "\n  " + e2 + "\n    Which is: " + std::to_string(v2);
      }` },
    mcq: { q: 'How does an assertion macro get the text "add(2, 2)" of its argument?', options: ['The preprocessor stringizing operator #a', 'Run-time reflection on the call', 'Reading the source file at run time', 'The compiler stores every expression in debug info'], answer: 0, explain: 'Inside a macro, #a turns the argument tokens into a string literal at preprocessing time.' },
    hints: [`<p>Hint 1: Build the message from small parts: a header line, then one "operand block" per side.</p>`, `<p>Hint 2: One helper: part(expr, value) = "\\n  " + expr, plus "\\n    Which is: " + to_string(value) unless expr == to_string(value).</p>`, `<p>Hint 3: Equal values → empty string. Negative numbers: "-1" equals to_string(-1), so a literal -1 also needs no "Which is".</p>`],
    tests: { sig: 'string string long long -> string', fn: 'formatFailure', cases: [[["add(2, 2)","5",4,5],"Expected equality of these values:\n  add(2, 2)\n    Which is: 4\n  5"],[["x","y",3,3],""],[["v.size()","0",2,0],"Expected equality of these values:\n  v.size()\n    Which is: 2\n  0"],[["a","b",-1,1],"Expected equality of these values:\n  a\n    Which is: -1\n  b\n    Which is: 1"],[["7","seven()",7,8],"Expected equality of these values:\n  7\n  seven()\n    Which is: 8"],[["n","n",1,2],"Expected equality of these values:\n  n\n    Which is: 1\n  n\n    Which is: 2"],[["big","9000000000",9000000001,9000000000],"Expected equality of these values:\n  big\n    Which is: 9000000001\n  9000000000"]] },
    solution: {
      approach: `<p>Compose the header and two operand blocks; each block appends a <code>Which is</code> line only when the expression text differs from the value's decimal text.</p>`,
      code: R`
        #include <string>

        std::string formatFailure(const std::string& e1, const std::string& e2, long long v1, long long v2) {
            if (v1 == v2) return "";
            auto part = [](const std::string& expr, long long value) {
                std::string s = "\n  " + expr;
                const std::string text = std::to_string(value);
                if (expr != text) s += "\n    Which is: " + text;   // a literal explains itself
                return s;
            };
            return "Expected equality of these values:" + part(e1, v1) + part(e2, v2);
        }`,
      dry: { head: ['side', 'expr', 'value', 'Which is?'], rows: [['1', 'add(2, 2)', '4', 'yes'], ['2', '5', '5', 'no (literal)']] },
      complexity: `<p>O(length of the output).</p>`
    }
  });

  practice.push({
    title: 'EXPECT_DOUBLE_EQ: Compare Doubles in ULPs', level: 'Easy', tags: ['floating point', 'ULP', 'GoogleTest', 'bit manipulation'], companies: ['Nvidia', 'Two Sigma', 'MathWorks'],
    statement: `<p><code>EXPECT_DOUBLE_EQ(a, b)</code> passes when a and b are within <b>4 ULPs</b> (units in the last place). Implement <code>almostEqualUlps(a, b, maxUlps)</code> like GoogleTest's <code>FloatingPoint::AlmostEquals</code>: NaN is never equal; otherwise map each double's bits (sign-and-magnitude) to a <b>biased</b> unsigned integer — negative numbers to <code>~bits + 1</code>, non-negative to <code>bits | signBit</code> — and return whether the absolute difference is ≤ maxUlps. This makes +0 and −0 equal and lets the distance cross zero.</p>`,
    constraints: `a, b are finite doubles or NaN; 0 ≤ maxUlps ≤ 10<sup>6</sup>.`,
    example: `<p>0.1 + 0.2 = 0.30000000000000004 is ${H.c('g', '1 ULP')} from 0.3 → true with 4 ULPs, false with 0. The smallest negative and positive subnormals (−5e−324 and 5e−324) are 2 ULPs apart.</p>`,
    brute: { why: `<p><code>a == b</code> fails for 0.1 + 0.2 vs 0.3. A fixed absolute epsilon (<code>fabs(a - b) &lt; 1e-9</code>) is wrong at both ends: too loose for tiny numbers (1e-12 vs 2e-12 "equal") and too strict for huge ones (1e20 and its neighbour differ by 16384). ULPs scale with the magnitude automatically.</p>`, code: R`
      #include <cmath>
      bool almostEqualAbs(double a, double b) { return std::fabs(a - b) < 1e-9; }   // scale-blind` },
    mcq: { q: 'Why is <code>EXPECT_NEAR(x, 1e20, 1e-9)</code> almost certainly wrong?', options: ['Adjacent doubles near 1e20 differ by about 16384, so a 1e-9 tolerance requires bit-exact equality', 'EXPECT_NEAR does not accept large numbers', '1e20 overflows a double', 'The tolerance must be negative'], answer: 0, explain: 'Absolute tolerances do not scale. Near 1e20 the spacing between doubles is 2^14; use a relative tolerance or ULPs.' },
    hints: [`<p>Hint 1: Get the raw bits with <code>std::memcpy</code> into a <code>std::uint64_t</code> (or C++20 <code>std::bit_cast</code>) — not a pointer cast, which breaks strict aliasing.</p>`, `<p>Hint 2: If the sign bit is set, biased = ~bits + 1 (two's complement of the magnitude representation); else biased = bits | (1ull &lt;&lt; 63). Then ordered doubles map to ordered integers.</p>`, `<p>Hint 3: Distance = larger − smaller in unsigned arithmetic (no overflow). Check NaN first with std::isnan.</p>`],
    tests: { sig: 'double double int -> bool', fn: 'almostEqualUlps', cases: [[[1,1,4],true],[[0.30000000000000004,0.3,4],true],[[0.30000000000000004,0.3,0],false],[[1,1.0000000000000004,1],false],[[1,1.0000000000000004,2],true],[[1e-300,-1e-300,4],false],[[0,5e-324,4],true],[[-5e-324,5e-324,4],true],[[-5e-324,5e-324,1],false],[[100,100.00000001,4],false]] },
    solution: {
      approach: `<p>Convert both values to the biased integer representation in which consecutive doubles are consecutive integers, then compare the distance with maxUlps — the GoogleTest algorithm.</p>`,
      code: R`
        #include <cmath>
        #include <cstdint>
        #include <cstring>

        bool almostEqualUlps(double a, double b, int maxUlps) {
            if (std::isnan(a) || std::isnan(b)) return false;
            auto biased = [](double x) {
                std::uint64_t bits;
                std::memcpy(&bits, &x, sizeof bits);                  // well-defined type punning
                const std::uint64_t sign = std::uint64_t{1} << 63;
                return (bits & sign) ? ~bits + 1 : bits | sign;        // order-preserving map
            };
            const std::uint64_t x = biased(a), y = biased(b);
            const std::uint64_t dist = x > y ? x - y : y - x;
            return dist <= static_cast<std::uint64_t>(maxUlps);
        }`,
      dry: { head: ['value', 'biased (conceptually)', 'note'], rows: [['-5e-324', 'sign - 1', 'one step below -0'], ['+0 / -0', 'sign', 'both map here'], ['5e-324', 'sign + 1', 'distance from -5e-324 = 2']] },
      complexity: `<p>O(1) time and space: a few bit operations.</p>`
    }
  });

  practice.push({
    title: 'Implement --gtest_filter Matching', level: 'Easy', tags: ['wildcard matching', 'GoogleTest', 'strings'], companies: ['Google', 'Arista', 'Cisco'],
    statement: `<p>A GoogleTest filter has the form <code>POSITIVE[-NEGATIVE]</code>: the part before the first <code>-</code> is a <code>:</code>-separated list of patterns (empty means <code>*</code>), the part after it is a <code>:</code>-separated list of negative patterns. Patterns use <code>*</code> (any string, possibly empty) and <code>?</code> (exactly one character). A test name runs if it matches <b>some</b> positive pattern and <b>no</b> negative pattern. Return whether <code>name</code> runs.</p>`,
    constraints: `|filter|, |name| ≤ 1000; test names do not contain '-' or ':'.`,
    example: `<p>Filter <code>*-*Slow*</code>, name Net.SlowRetry → ${H.c('r', 'false')} (matches the negative pattern). Filter <code>Foo.?ar:Baz.*</code>, name Foo.ar → false: <code>?</code> needs exactly one character.</p>`,
    brute: { why: `<p>Converting each pattern to a <code>std::regex</code> works but is slow to build and easy to get wrong (dots in test names must be escaped). A direct wildcard matcher is short, linear-ish, and has no escaping problems. Naive recursion on <code>*</code> without memoisation can be exponential on patterns like <code>*a*a*a*b</code>.</p>`, code: R`
      #include <string>
      bool globRec(const char* p, const char* s) {                // exponential on adversarial patterns
          if (*p == '\0') return *s == '\0';
          if (*p == '*') return globRec(p + 1, s) || (*s && globRec(p, s + 1));
          return *s && (*p == '?' || *p == *s) && globRec(p + 1, s + 1);
      }` },
    mcq: { q: 'Which filter runs every test in suite Cache except those containing "Flaky"?', options: ['<code>Cache.*-*Flaky*</code>', '<code>Cache.*:-Flaky</code>', '<code>-Cache.*:*Flaky*</code>', '<code>Cache.*Flaky*</code>'], answer: 0, explain: 'Positive patterns come first, then "-" and the negative patterns. Patterns must match the whole name, so *Flaky* is needed.' },
    hints: [`<p>Hint 1: Split once at the first '-', then split each side on ':'. An empty positive side means "*".</p>`, `<p>Hint 2: Greedy wildcard matching: walk both strings; on '*' remember its position and the current name index; on mismatch, backtrack to just after the last '*' and let it absorb one more character.</p>`, `<p>Hint 3: After the name is consumed, the remaining pattern must be only '*'s. Result = any positive matches AND no negative matches.</p>`],
    tests: { sig: 'string string -> bool', fn: 'matchesFilter', cases: [[["*","A.b"],true],[["Math.*","Math.Add"],true],[["Math.*","Mathx.Add"],false],[["*-*Slow*","Net.SlowRetry"],false],[["-*Slow*","Net.Fast"],true],[["Foo.?ar:Baz.*","Foo.Bar"],true],[["Foo.?ar:Baz.*","Foo.ar"],false],[["Baz.*-Baz.Flaky:Baz.Old","Baz.Old"],false],[["","Any.Thing"],true],[["A.*","B.A.x"],false]] },
    solution: {
      approach: `<p>Parse the filter into positive and negative pattern lists, and match each with the classic greedy two-pointer wildcard algorithm (O(|p|·|s|) worst case, linear in practice).</p>`,
      code: R`
        #include <sstream>
        #include <string>
        #include <vector>

        static bool wildcard(const std::string& p, const std::string& s) {
            std::size_t i = 0, j = 0, star = std::string::npos, mark = 0;
            while (j < s.size()) {
                if (i < p.size() && (p[i] == '?' || p[i] == s[j])) { ++i; ++j; }
                else if (i < p.size() && p[i] == '*') { star = i++; mark = j; }        // '*' matches empty for now
                else if (star != std::string::npos) { i = star + 1; j = ++mark; }      // let '*' eat one more char
                else return false;
            }
            while (i < p.size() && p[i] == '*') ++i;
            return i == p.size();
        }

        static std::vector<std::string> splitColon(const std::string& s) {
            std::vector<std::string> out;
            std::stringstream ss(s);
            std::string item;
            while (std::getline(ss, item, ':')) out.push_back(item);
            return out;
        }

        bool matchesFilter(const std::string& filter, const std::string& name) {
            const std::size_t dash = filter.find('-');
            std::string pos = filter.substr(0, dash);
            const std::string neg = dash == std::string::npos ? "" : filter.substr(dash + 1);
            if (pos.empty()) pos = "*";
            bool any = false;
            for (const auto& p : splitColon(pos)) any = any || wildcard(p, name);
            if (!any) return false;
            for (const auto& p : splitColon(neg)) if (wildcard(p, name)) return false;
            return true;
        }`,
      dry: { head: ['filter', 'positive', 'negative', 'Net.SlowRetry'], rows: [['*-*Slow*', '[*] → match', '[*Slow*] → match', 'false'], ['-*Slow*', '[] → [*]', '[*Slow*]', 'Net.Fast → true']] },
      complexity: `<p>O(|filter| · |name|) worst case.</p>`
    }
  });

  practice.push({
    title: 'Decode a Child Process Wait Status', level: 'Medium', tags: ['death tests', 'core dumps', 'bit manipulation', 'POSIX'], companies: ['Apple', 'Red Hat', 'Microsoft'],
    statement: `<p>Death tests and CTest learn how a child process ended from the <code>waitpid</code> status integer (Linux encoding). Return:</p><ul><li><code>"exited N"</code> if the low 7 bits are 0 (N = bits 8–15) — <code>WIFEXITED</code>/<code>WEXITSTATUS</code>;</li><li><code>"stopped by signal N"</code> if the low 8 bits are <code>0x7f</code> (N = bits 8–15) — <code>WIFSTOPPED</code>;</li><li>otherwise <code>"killed by signal N"</code> with N = low 7 bits, plus <code>" (core dumped)"</code> if bit 7 (0x80) is set — <code>WIFSIGNALED</code>/<code>WCOREDUMP</code>.</li></ul>`,
    constraints: `0 ≤ status &lt; 2<sup>16</sup>.`,
    example: `<p>139 = 0x8B: low 7 bits = 11 (SIGSEGV), bit 7 set → ${H.c('r', '"killed by signal 11 (core dumped)"')}. 768 = 0x300 → "exited 3". Shells print the first as exit code 128 + 11 = 139, which is why the number looks familiar.</p>`,
    brute: { why: `<p>Treating the status as the exit code directly (<code>"exited " + status</code>) reports 256 for <code>exit(1)</code> and misses signals entirely — a classic bug in hand-written process runners. The status packs several fields into one integer.</p>`, code: R`
      #include <string>
      std::string decodeNaive(int status) { return "exited " + std::to_string(status); }   // 256 for exit(1)` },
    mcq: { q: 'A CI log shows a test exited with code 134. What happened?', options: ['It was killed by SIGABRT (128 + 6), e.g. an assert() or std::terminate', 'It returned 134 from main', 'It ran out of memory', 'It was killed by SIGKILL'], answer: 0, explain: 'Shells report signal deaths as 128 + signal number; 6 is SIGABRT, raised by abort(), failed assert() and std::terminate.' },
    hints: [`<p>Hint 1: Low byte layout: bits 0–6 = signal number (0 means normal exit), bit 7 = core-dump flag; bits 8–15 = exit code or stop signal.</p>`, `<p>Hint 2: Test in this order: (s &amp; 0x7f) == 0 → exited; (s &amp; 0xff) == 0x7f → stopped; else signalled.</p>`, `<p>Hint 3: Extract with shifts and masks: (s &gt;&gt; 8) &amp; 0xff, s &amp; 0x7f, s &amp; 0x80.</p>`],
    tests: { sig: 'int -> string', fn: 'decodeWaitStatus', cases: [[[0],"exited 0"],[[256],"exited 1"],[[768],"exited 3"],[[139],"killed by signal 11 (core dumped)"],[[11],"killed by signal 11"],[[134],"killed by signal 6 (core dumped)"],[[6],"killed by signal 6"],[[65280],"exited 255"],[[4991],"stopped by signal 19"],[[9],"killed by signal 9"]] },
    solution: {
      approach: `<p>Exactly the glibc macros: <code>WIFEXITED(s) = (s &amp; 0x7f) == 0</code>, <code>WIFSTOPPED(s) = (s &amp; 0xff) == 0x7f</code>, otherwise signalled; core flag 0x80.</p>`,
      code: R`
        #include <string>

        std::string decodeWaitStatus(int status) {
            const int low7 = status & 0x7f;
            const int high = (status >> 8) & 0xff;
            if (low7 == 0) return "exited " + std::to_string(high);                       // WIFEXITED
            if ((status & 0xff) == 0x7f) return "stopped by signal " + std::to_string(high); // WIFSTOPPED
            std::string s = "killed by signal " + std::to_string(low7);                     // WIFSIGNALED
            if (status & 0x80) s += " (core dumped)";                                       // WCOREDUMP
            return s;
        }`,
      dry: { head: ['status', 'hex', 'low7', 'result'], rows: [['768', '0x300', '0', 'exited 3'], ['139', '0x8b', '11', 'killed by signal 11 (core dumped)'], ['4991', '0x137f', '0x7f', 'stopped by signal 19']] },
      complexity: `<p>O(1) time and space: a few bit operations.</p>`
    }
  });

  practice.push({
    title: 'Lock-Order (Potential Deadlock) Detector Over a Trace', level: 'Medium', tags: ['TSan', 'deadlock', 'graph', 'cycle detection'], companies: ['Google', 'Meta', 'Jane Street'],
    statement: `<p>Like ThreadSanitizer's deadlock detector, build a <b>lock-order graph</b> from a trace of events <code>"T lock M"</code> / <code>"T unlock M"</code>: whenever thread T acquires M while holding locks H<sub>1</sub>…H<sub>k</sub>, add edges H<sub>i</sub> → M. Return <code>true</code> if the graph has a cycle (a potential deadlock, even if this run did not hang).</p>`,
    constraints: `≤ 10<sup>5</sup> events; the trace is well-formed (no unlock of an unheld lock, no recursive locking).`,
    example: `<p>T1: lock A, lock B, unlock B, unlock A; T2: lock B, lock A, … → edges A→B and B→A → ${H.c('r', 'true')}. The run finished fine because T1 finished before T2 started, but a different interleaving deadlocks.</p>`,
    brute: { why: `<p>Simulating every interleaving of the threads to see whether one deadlocks is exponential. The lock-order graph summarises all interleavings at once: a cycle is necessary for a lock-only deadlock, so checking it is linear (with some false positives, e.g. orders protected by a common "gate" lock).</p>`, code: R`
      #include <string>
      #include <vector>
      #include <sstream>
      // Only notices a deadlock that actually happened: some thread still holds locks at the end
      // because it blocked forever. A trace that completed proves nothing about other interleavings.
      bool observedDeadlock(const std::vector<std::string>& trace) {
          int held = 0;
          for (const auto& e : trace) {
              std::istringstream in(e);
              std::string t, op, m;
              in >> t >> op >> m;
              held += (op == "lock") ? 1 : -1;
          }
          return held > 0;                     // misses every potential deadlock
      }` },
    mcq: { q: 'Which change removes the potential deadlock between "lock A then B" and "lock B then A"?', options: ['Acquire both with std::scoped_lock(a, b), or always lock A before B', 'Make the mutexes recursive', 'Add a sleep between the two lock calls', 'Use try_lock once and ignore failure'], answer: 0, explain: 'A global order (or scoped_lock\'s deadlock-avoidance algorithm) breaks the cycle. Recursive mutexes and sleeps do not.' },
    hints: [`<p>Hint 1: Keep, per thread, the list of currently held locks. On "lock M", add an edge from every held lock to M, then push M. On "unlock M", remove M.</p>`, `<p>Hint 2: Store the graph as <code>map&lt;string, set&lt;string&gt;&gt;</code> to avoid duplicate edges.</p>`, `<p>Hint 3: Detect a cycle with DFS and three colours (white/grey/black): reaching a grey node means a back edge. Same-thread inversions (one thread A→B then later B→A) count too.</p>`],
    tests: { sig: 'string[] -> bool', fn: 'hasLockOrderInversion', cases: [[[["T1 lock A","T1 lock B","T1 unlock B","T1 unlock A","T2 lock B","T2 lock A","T2 unlock A","T2 unlock B"]],true],[[["T1 lock A","T1 lock B","T1 unlock B","T1 unlock A","T2 lock A","T2 lock B","T2 unlock B","T2 unlock A"]],false],[[[]],false],[[["T1 lock A","T1 unlock A","T2 lock B","T2 unlock B"]],false],[[["T1 lock A","T1 lock B","T1 unlock B","T1 unlock A","T2 lock B","T2 lock C","T2 unlock C","T2 unlock B","T3 lock C","T3 lock A","T3 unlock A","T3 unlock C"]],true],[[["T1 lock A","T1 lock B","T1 unlock B","T1 lock C","T1 unlock C","T1 unlock A"]],false],[[["T1 lock A","T1 lock B","T1 unlock B","T1 unlock A","T1 lock B","T1 lock A","T1 unlock A","T1 unlock B"]],true],[[["T1 lock A","T1 unlock A","T1 lock B","T1 unlock B","T2 lock B","T2 unlock B","T2 lock A","T2 unlock A"]],false]] },
    solution: {
      approach: `<p>Build edges held→acquired per thread, then run a colouring DFS over the graph. This is the core of TSan's and Helgrind's lock-order checks (they also keep the stacks where each edge was first seen, for the report).</p>`,
      code: R`
        #include <algorithm>
        #include <functional>
        #include <map>
        #include <set>
        #include <sstream>
        #include <string>
        #include <vector>

        bool hasLockOrderInversion(const std::vector<std::string>& trace) {
            std::map<std::string, std::vector<std::string>> held;          // thread -> locks held, in order
            std::map<std::string, std::set<std::string>> graph;            // lock -> locks acquired after it
            for (const auto& e : trace) {
                std::istringstream in(e);
                std::string t, op, m;
                in >> t >> op >> m;
                auto& h = held[t];
                if (op == "lock") {
                    for (const auto& x : h) if (x != m) graph[x].insert(m);
                    h.push_back(m);
                } else {
                    auto it = std::find(h.rbegin(), h.rend(), m);
                    if (it != h.rend()) h.erase(std::next(it).base());
                }
            }
            std::map<std::string, int> color;                              // 0 white, 1 grey, 2 black
            std::function<bool(const std::string&)> dfs = [&](const std::string& u) {
                color[u] = 1;
                for (const auto& v : graph[u]) {
                    if (color[v] == 1) return true;                        // back edge: cycle
                    if (color[v] == 0 && dfs(v)) return true;
                }
                color[u] = 2;
                return false;
            };
            std::vector<std::string> nodes;
            for (const auto& [u, _] : graph) nodes.push_back(u);
            for (const auto& u : nodes) if (color[u] == 0 && dfs(u)) return true;
            return false;
        }`,
      dry: { head: ['event', 'held(T)', 'new edge'], rows: [['T1 lock A', '[A]', '-'], ['T1 lock B', '[A, B]', 'A→B'], ['T2 lock B', '[B]', '-'], ['T2 lock A', '[B, A]', 'B→A → cycle']] },
      complexity: `<p>O(E·H + V + edges) where H is the maximum number of locks held at once.</p>`
    }
  });

  practice.push({
    title: 'Benchmark Statistics: Median, Quartiles and Outlier Removal', level: 'Medium', tags: ['benchmarking', 'statistics', 'sorting'], companies: ['Optiver', 'Citadel', 'Netflix'],
    statement: `<p>Summarise benchmark repetitions robustly. Sort the times; median = middle value (mean of the two middle values for even n). Q1 = median of the lower half, Q3 = median of the upper half, where for odd n the overall median is excluded from both halves (for n = 1, Q1 = Q3 = the value). Keep values within the Tukey fences [Q1 − 1.5·IQR, Q3 + 1.5·IQR] (inclusive), IQR = Q3 − Q1. Return <code>[median, Q1, Q3, mean of kept values, number removed]</code>.</p>`,
    constraints: `1 ≤ n ≤ 10<sup>5</sup>; times are non-negative.`,
    example: `<p>[10, 11, 12, 10, 11, 95] → sorted [10, 10, 11, 11, 12, 95]; median 11; Q1 = median[10, 10, 11] = 10; Q3 = median[11, 12, 95] = 12; fences [7, 15] → ${H.c('r', '95 removed')}; kept mean = 54/5 = 10.8 → [11, 10, 12, 10.8, 1].</p>`,
    brute: { why: `<p>Reporting the plain mean (24.83 here) lets one interrupted repetition quadruple the result. Mean ± standard deviation also assumes symmetric noise, but timing noise has a long right tail. Medians and quartiles are robust to that.</p>`, code: R`
      #include <numeric>
      #include <vector>
      double naiveMean(const std::vector<double>& v) { return std::accumulate(v.begin(), v.end(), 0.0) / static_cast<double>(v.size()); }` },
    mcq: { q: 'Two versions\' medians differ by 1.5% and each has a coefficient of variation of 4%. What should you conclude?', options: ['The difference is within noise; run more repetitions and use a statistical test before claiming a speed-up', 'Version B is 1.5% faster', 'Version A is faster', 'The benchmark is broken'], answer: 0, explain: 'A difference smaller than the run-to-run variation is not evidence. Google Benchmark\'s compare.py applies a Mann-Whitney U test for exactly this.' },
    hints: [`<p>Hint 1: Sort once. A helper median(first, last) over a sorted range handles both the overall median and the quartiles.</p>`, `<p>Hint 2: Lower half = s[0 .. n/2), upper half = s[ceil(n/2) .. n). For odd n this skips the middle element; for n = 1 use the single value for both.</p>`, `<p>Hint 3: Compute fences with doubles, keep values within them (inclusive), and divide the kept sum by the kept count (never zero: the median is always kept).</p>`],
    tests: { sig: 'double[] -> double[]', fn: 'benchSummary', cmp: 'float', cases: [[[[10,11,12,10,11,95]],[11,10,12,10.8,1]],[[[5]],[5,5,5,5,0]],[[[1,2]],[1.5,1,2,1.5,0]],[[[100,102,101,99,98,103,250,20]],[100.5,98.5,102.5,100.5,2]],[[[3,3,3,3]],[3,3,3,3,0]],[[[1,2,3,4,5,6,7,8,9]],[5,2.5,7.5,5,0]],[[[12.5,12.7,12.6,30.1,12.4,12.5,12.9]],[12.6,12.5,12.9,12.600000000000001,1]]] },
    solution: {
      approach: `<p>Sort, compute median and half-medians (Tukey's hinges), apply the 1.5·IQR fences, and average what remains. O(n log n).</p>`,
      code: R`
        #include <algorithm>
        #include <vector>

        std::vector<double> benchSummary(std::vector<double> t) {
            std::sort(t.begin(), t.end());
            const std::size_t n = t.size();
            auto median = [&t](std::size_t lo, std::size_t hi) {            // median of t[lo, hi)
                const std::size_t m = hi - lo;
                return m % 2 ? t[lo + m / 2] : (t[lo + m / 2 - 1] + t[lo + m / 2]) / 2.0;
            };
            const double med = median(0, n);
            const double q1 = n == 1 ? t[0] : median(0, n / 2);
            const double q3 = n == 1 ? t[0] : median((n + 1) / 2, n);
            const double iqr = q3 - q1, lo = q1 - 1.5 * iqr, hi = q3 + 1.5 * iqr;
            double sum = 0;
            std::size_t kept = 0;
            for (double x : t) if (x >= lo && x <= hi) { sum += x; ++kept; }
            return {med, q1, q3, sum / static_cast<double>(kept), static_cast<double>(n - kept)};
        }`,
      dry: { head: ['step', 'value'], rows: [['sorted', '10 10 11 11 12 95'], ['median', '11'], ['Q1 / Q3', '10 / 12'], ['fences', '[7, 15]'], ['kept mean, removed', '10.8, 1']] },
      complexity: `<p>O(n log n) time for the sort, O(1) extra (the input copy is sorted in place).</p>`
    }
  });

  practice.push({
    title: 'Aggregate a Leak Report by Allocation Stack', level: 'Medium', tags: ['Valgrind', 'LeakSanitizer', 'hash map', 'sorting'], companies: ['Amazon', 'Adobe', 'Bloomberg'],
    statement: `<p>LeakSanitizer and Valgrind group leaked blocks by the stack that allocated them. Given events <code>"alloc ID BYTES STACK"</code> and <code>"free ID"</code> (an ID can be reused after it is freed), find the blocks still allocated at the end and return one line per stack: <code>"B bytes in K blocks: STACK"</code>, sorted by B descending, then STACK ascending.</p>`,
    constraints: `≤ 10<sup>5</sup> events; BYTES up to 4·10<sup>9</sup> (sums need 64-bit); STACK has no spaces.`,
    example: `<p>alloc 1 64 main&gt;load, alloc 2 64 main&gt;load, alloc 3 10 main&gt;log, free 3 → ${H.c('r', '"128 bytes in 2 blocks: main>load"')}.</p>`,
    brute: { why: `<p>Printing one line per leaked block floods the report: a loop that leaks 10 000 identical nodes produces 10 000 lines. Grouping by stack shows one actionable line with the total — the same reason sanitizers print "Direct leak of 640000 byte(s) in 10000 object(s) allocated from: …".</p>`, code: R`
      #include <string>
      #include <unordered_map>
      #include <vector>
      std::vector<std::string> perBlock(const std::unordered_map<int, std::string>& live) {
          std::vector<std::string> out;
          for (const auto& [id, stack] : live) out.push_back("leak id " + std::to_string(id) + " at " + stack);
          return out;
      }` },
    mcq: { q: 'Valgrind reports "still reachable: 72,704 bytes in 1 blocks" at exit for a program that leaks nothing you know of. What is it typically?', options: ['A pool allocated once by the C++ runtime (e.g. libstdc++\'s emergency exception pool) still pointed to at exit', 'A definite leak in your code', 'A use-after-free', 'Valgrind\'s own memory'], answer: 0, explain: 'Still-reachable blocks have live pointers at exit. The 72,704-byte block is libstdc++\'s emergency EH pool — not a leak.' },
    hints: [`<p>Hint 1: First replay the events with a map ID → (bytes, stack); free erases the ID.</p>`, `<p>Hint 2: Then fold the remaining blocks into map stack → (total bytes, count) using long long totals.</p>`, `<p>Hint 3: Copy the groups into a vector and sort with a comparator: bytes descending, then stack ascending. Format each line.</p>`],
    tests: { sig: 'string[] -> string[]', fn: 'leakReport', cases: [[[["alloc 1 64 main>load","alloc 2 64 main>load","alloc 3 10 main>log","free 3"]],["128 bytes in 2 blocks: main>load"]],[[[]],[]],[[["alloc 1 8 a","free 1"]],[]],[[["alloc 1 5 x>y","alloc 2 100 z","alloc 3 5 x>y"]],["100 bytes in 1 blocks: z","10 bytes in 2 blocks: x>y"]],[[["alloc 1 16 b","alloc 2 16 a"]],["16 bytes in 1 blocks: a","16 bytes in 1 blocks: b"]],[[["alloc 1 4000000000 big","alloc 2 4000000000 big"]],["8000000000 bytes in 2 blocks: big"]],[[["alloc 1 7 s","free 1","alloc 1 9 t"]],["9 bytes in 1 blocks: t"]]] },
    solution: {
      approach: `<p>Two hash maps: live blocks by ID, then groups by stack; sort the groups. O(n + g log g).</p>`,
      code: R`
        #include <algorithm>
        #include <sstream>
        #include <string>
        #include <unordered_map>
        #include <vector>

        std::vector<std::string> leakReport(const std::vector<std::string>& events) {
            std::unordered_map<std::string, std::pair<long long, std::string>> live;   // id -> (bytes, stack)
            for (const auto& e : events) {
                std::istringstream in(e);
                std::string op, id;
                in >> op >> id;
                if (op == "alloc") {
                    long long bytes = 0;
                    std::string stack;
                    in >> bytes >> stack;
                    live[id] = {bytes, stack};
                } else {
                    live.erase(id);
                }
            }
            std::unordered_map<std::string, std::pair<long long, int>> groups;      // stack -> (bytes, blocks)
            for (const auto& [id, b] : live) { groups[b.second].first += b.first; ++groups[b.second].second; }
            std::vector<std::pair<std::string, std::pair<long long, int>>> v(groups.begin(), groups.end());
            std::sort(v.begin(), v.end(), [](const auto& a, const auto& b) {
                if (a.second.first != b.second.first) return a.second.first > b.second.first;
                return a.first < b.first;
            });
            std::vector<std::string> out;
            for (const auto& [stack, g] : v)
                out.push_back(std::to_string(g.first) + " bytes in " + std::to_string(g.second) + " blocks: " + stack);
            return out;
        }`,
      dry: { head: ['event', 'live blocks'], rows: [['alloc 1 64 main>load', '{1}'], ['alloc 2 64 main>load', '{1, 2}'], ['alloc 3 10 main>log', '{1, 2, 3}'], ['free 3', '{1, 2} → 128 bytes in 2 blocks: main>load']] },
      complexity: `<p>O(n) expected for the replay, O(g log g) to sort g groups.</p>`
    }
  });

  practice.push({
    title: 'Patch Coverage of a Pull Request', level: 'Medium', tags: ['coverage', 'CI', 'hash set'], companies: ['GitHub', 'Shopify', 'Atlassian'],
    statement: `<p>A CI gate checks <b>patch coverage</b>: among the lines changed by a PR that are <b>executable</b> (comments and blank lines are not), what percentage ran during the tests? Given the changed line numbers (may contain duplicates, any order), the executable lines and the covered lines of a file, return the percentage as a double. If no changed line is executable, return 100.</p>`,
    constraints: `≤ 10<sup>5</sup> lines in each list.`,
    example: `<p>changed [10, 11, 12, 13], executable [10, 11, 13], covered [10, 13] → line 12 is a comment; 2 of 3 executable changed lines ran → ${H.c('y', '66.666…%')}.</p>`,
    brute: { why: `<p>Dividing covered changed lines by <b>all</b> changed lines punishes comments and blank lines (here 2/4 = 50%). Searching each list linearly for every line is O(n·m); hash sets make each membership test O(1).</p>`, code: R`
      #include <algorithm>
      #include <vector>
      double patchNaive(const std::vector<int>& changed, const std::vector<int>& covered) {
          int c = 0;
          for (int l : changed) c += std::count(covered.begin(), covered.end(), l) > 0;   // ignores executability
          return changed.empty() ? 100.0 : 100.0 * c / static_cast<double>(changed.size());
      }` },
    mcq: { q: 'Why do many teams gate on patch coverage rather than total coverage?', options: ['It is actionable for each PR and does not punish new code for old untested code', 'It is always higher', 'Total coverage cannot be measured in C++', 'It makes tests run faster'], answer: 0, explain: 'A big codebase\'s total barely moves per PR; patch coverage asks exactly "did you test what you changed?".' },
    hints: [`<p>Hint 1: Put executable and covered lines into <code>unordered_set</code>s.</p>`, `<p>Hint 2: Deduplicate the changed lines (a set) and keep only executable ones.</p>`, `<p>Hint 3: Count how many of those are covered; return 100.0 * covered / total, or 100 when total is 0.</p>`],
    tests: { sig: 'int[] int[] int[] -> double', fn: 'patchCoverage', cmp: 'float', cases: [[[[10,11,12,13],[10,11,13],[10,13]],66.66666666666667],[[[],[1],[1]],100],[[[5,6],[1,2],[1]],100],[[[1,2,3,4],[1,2,3,4],[1,2,3,4]],100],[[[7,7,8],[7,8],[8]],50],[[[1,2,3],[1,2,3],[]],0],[[[3,1,2],[1,2,3],[2]],33.333333333333336]] },
    solution: {
      approach: `<p>Set membership: filter the unique changed lines to executable ones, count the covered subset, divide.</p>`,
      code: R`
        #include <unordered_set>
        #include <vector>

        double patchCoverage(const std::vector<int>& changed, const std::vector<int>& executable, const std::vector<int>& covered) {
            const std::unordered_set<int> exec(executable.begin(), executable.end());
            const std::unordered_set<int> cov(covered.begin(), covered.end());
            std::unordered_set<int> seen;
            int total = 0, hit = 0;
            for (int line : changed) {
                if (!exec.count(line) || !seen.insert(line).second) continue;   // not code, or a duplicate
                ++total;
                hit += cov.count(line) ? 1 : 0;
            }
            return total == 0 ? 100.0 : 100.0 * hit / total;
        }`,
      dry: { head: ['changed line', 'executable?', 'covered?'], rows: [['10', 'yes', 'yes'], ['11', 'yes', 'no'], ['12', 'no (comment)', '-'], ['13', 'yes', 'yes → 2/3']] },
      complexity: `<p>O(n) expected time and space.</p>`
    }
  });

  practice.push({
    title: 'Shard Tests Across CI Workers', level: 'Medium', tags: ['CI', 'sharding', 'greedy', 'scheduling'], companies: ['Google', 'Uber', 'Databricks'],
    statement: `<p>GoogleTest's built-in sharding (<code>GTEST_TOTAL_SHARDS</code>, <code>GTEST_SHARD_INDEX</code>) assigns test i to shard <code>i mod W</code> — round-robin, blind to durations. A smarter CI scheduler uses <b>LPT</b> (longest processing time first): sort durations descending and give each test to the currently least-loaded worker (lowest index on ties). Return <code>[LPT makespan, round-robin makespan]</code> where makespan = the busiest worker's total.</p>`,
    constraints: `0 ≤ n ≤ 10<sup>5</sup> tests, durations 1–10<sup>4</sup>; 1 ≤ W ≤ 100.`,
    example: `<p>durations [10,9,8,7,6,5,4,3,2,1], W = 3. Round-robin: shards get 10+7+4+1 = ${H.c('r', '22')}, 9+6+3 = 18, 8+5+2 = 15. LPT: ${H.c('g', '19')} (e.g. 10+5+4, 9+6+3+1, 8+7+2 → 19, 19, 17).</p>`,
    brute: { why: `<p>An optimal partition (minimum makespan) is NP-hard; trying all W<sup>n</sup> assignments is hopeless. LPT is a fast greedy with a proven bound (≤ 4/3 of optimal), which is why CI systems use it with historical timings.</p>`, code: R`
      #include <vector>
      int roundRobinOnly(const std::vector<int>& d, int w) {
          std::vector<int> load(w, 0);
          for (std::size_t i = 0; i < d.size(); ++i) load[i % w] += d[i];
          int best = 0;
          for (int x : load) best = x > best ? x : best;
          return best;
      }` },
    mcq: { q: 'With CTest, what is the simplest way to use historical test durations for scheduling?', options: ['ctest -j N: it records test costs and starts the longest tests first on later runs', 'Set GTEST_SHARD_INDEX by hand', 'Sort test files alphabetically', 'Run all tests in one process'], answer: 0, explain: 'CTest stores per-test costs (CTestCostData.txt) and schedules expensive tests first under -j, an LPT-like strategy.' },
    hints: [`<p>Hint 1: Round-robin is a single pass: load[i % W] += d[i].</p>`, `<p>Hint 2: For LPT, sort a copy descending. A min-heap of (load, worker index) gives the least-loaded worker with lowest index on ties.</p>`, `<p>Hint 3: The answer is the maximum load in each scheme; with no tests both are 0.</p>`],
    tests: { sig: 'int[] int -> int[]', fn: 'shardMakespan', cases: [[[[30,1,30,1,30,1],3],[31,31]],[[[5],4],[5,5]],[[[],2],[0,0]],[[[7,7,7,7],2],[14,14]],[[[10,9,8,7,6,5,4,3,2,1],3],[19,22]],[[[100,1,1,1],1],[103,103]],[[[2,2,3,3,4,4],2],[9,9]]] },
    solution: {
      approach: `<p>Round-robin by index; LPT with a min-heap keyed by (load, worker). O(n log n + n log W).</p>`,
      code: R`
        #include <algorithm>
        #include <functional>
        #include <queue>
        #include <vector>

        std::vector<int> shardMakespan(std::vector<int> d, int w) {
            std::vector<int> rr(w, 0);
            for (std::size_t i = 0; i < d.size(); ++i) rr[i % static_cast<std::size_t>(w)] += d[i];

            std::sort(d.begin(), d.end(), std::greater<int>());
            using Slot = std::pair<int, int>;                                   // (load, worker index)
            std::priority_queue<Slot, std::vector<Slot>, std::greater<Slot>> heap;
            for (int k = 0; k < w; ++k) heap.push({0, k});
            int lpt = 0;
            for (int x : d) {
                auto [load, k] = heap.top();
                heap.pop();
                load += x;
                lpt = std::max(lpt, load);
                heap.push({load, k});
            }
            return {lpt, *std::max_element(rr.begin(), rr.end())};
        }`,
      dry: { head: ['test (desc)', 'loads after (LPT)'], rows: [['10', '10, 0, 0'], ['9', '10, 9, 0'], ['8', '10, 9, 8'], ['7', '10, 9, 15'], ['…', 'final 19, 19, 17']] },
      complexity: `<p>O(n log n) for the sort plus O(n log W) heap operations.</p>`
    }
  });

  practice.push({
    title: 'Minimise a Crashing Input with Delta Debugging (ddmin)', level: 'Hard', tags: ['fuzzing', 'delta debugging', 'test-case reduction'], companies: ['Google', 'Microsoft', 'Mozilla'],
    statement: `<p>A fuzzer found a crashing input; shrink it like <code>-minimize_crash</code> / C-Reduce. The program crashes iff <code>needle</code> is a <b>subsequence</b> of the input. Run this deterministic ddmin variant and return the result:</p><ul><li>n = 2. While |s| ≥ 2: let L = |s|; for k = 0..n−1, chunk k is s[⌊kL/n⌋, ⌊(k+1)L/n⌋); try the <b>complement</b> (s with chunk k removed). The first complement that is shorter and still crashes replaces s; set n = max(n − 1, 2) and restart the while loop.</li><li>If no complement crashed: if n ≥ L stop; else n = min(2n, L).</li></ul>`,
    constraints: `1 ≤ |s| ≤ 2000; the initial s crashes.`,
    example: `<p>s = "xxbxxuxxgxx", needle "bug": halves "xxbxx" / "uxxgxx" — removing either loses a letter; with 4 chunks, removing "xx" (chunk 0) keeps the crash… repeating shrinks to ${H.c('g', '"bug"')}.</p>`,
    brute: { why: `<p>Removing one character at a time and retesting works but costs O(L²) tests from the start; ddmin removes big chunks first (halves, quarters, …), so typical inputs shrink in O(log L) rounds while large, and only fall back to single characters at the end.</p>`, code: R`
      #include <string>
      bool isSubseq(const std::string& n, const std::string& s) { std::size_t k = 0; for (char c : s) if (k < n.size() && c == n[k]) ++k; return k == n.size(); }
      std::string oneByOne(std::string s, const std::string& needle) {
          for (std::size_t i = 0; i < s.size();) {
              std::string t = s.substr(0, i) + s.substr(i + 1);
              if (isSubseq(needle, t)) s = t; else ++i;              // L tests per pass, from the very start
          }
          return s;
      }` },
    mcq: { q: 'After minimisation, what should you do with the crashing input?', options: ['Add it as a regression test / to the regression corpus, then fix the bug', 'Delete it once the bug is fixed', 'Add it to the fuzzer dictionary only', 'Nothing: the fuzzer will find it again'], answer: 0, explain: 'A minimised crash is a perfect regression test: small, readable and deterministic.' },
    hints: [`<p>Hint 1: Write <code>crashes(s)</code> as a subsequence check. Chunk bounds use integer division: a = k·L/n, b = (k+1)·L/n.</p>`, `<p>Hint 2: After a successful reduction restart with the new length and n = max(n − 1, 2); after a full round without success, double the granularity (capped at L).</p>`, `<p>Hint 3: Stop when n ≥ L and no single-character removal works, or when |s| &lt; 2. Skip empty chunks (they do not shorten s).</p>`],
    tests: { sig: 'string string -> string', fn: 'ddmin', cases: [[["xxbxxuxxgxx","bug"],"bug"],[["bug","bug"],"bug"],[["aaaaaaab","b"],"b"],[["b","b"],"b"],[["hello world","lw"],"lw"],[["FUZZFUZZ","FUZZ"],"FUZZ"],[["abcabcabc","cab"],"cab"]] },
    solution: {
      approach: `<p>Complement-only ddmin: test removing each of n chunks; on success keep the smaller input and coarsen; on failure refine. The result is 1-minimal: no single character can be removed.</p>`,
      code: R`
        #include <algorithm>
        #include <string>

        std::string ddmin(std::string s, const std::string& needle) {
            auto crashes = [&needle](const std::string& x) {
                std::size_t k = 0;
                for (char c : x) if (k < needle.size() && c == needle[k]) ++k;
                return k == needle.size();
            };
            std::size_t n = 2;
            while (s.size() >= 2) {
                const std::size_t L = s.size();
                bool reduced = false;
                for (std::size_t k = 0; k < n; ++k) {
                    const std::size_t a = k * L / n, b = (k + 1) * L / n;
                    if (a == b) continue;                                    // empty chunk
                    std::string c = s.substr(0, a) + s.substr(b);            // complement
                    if (crashes(c)) { s = std::move(c); n = std::max<std::size_t>(n - 1, 2); reduced = true; break; }
                }
                if (!reduced) {
                    if (n >= L) break;                                       // 1-minimal
                    n = std::min(2 * n, L);
                }
            }
            return s;
        }`,
      dry: { head: ['s', 'n', 'action'], rows: [['xxbxxuxxgxx (11)', '2', 'no half removable → n = 4'], ['xxbxxuxxgxx', '4', 'remove chunk 0 "xx" → n = 3'], ['bxxuxxgxx (9)', '3', '…continue'], ['bug', '-', '1-minimal']] },
      complexity: `<p>Worst case O(L²) crash tests, typically O(log L) rounds of large removals; each test here is O(L).</p>`
    }
  });

  practice.push({
    title: 'Happens-Before Race Detector with Vector Clocks', level: 'Hard', tags: ['TSan', 'vector clocks', 'data race', 'simulation'], companies: ['Google', 'Microsoft', 'Hudson River Trading'],
    statement: `<p>Implement the core of ThreadSanitizer over a trace of <code>"T read X"</code>, <code>"T write X"</code>, <code>"T lock M"</code>, <code>"T unlock M"</code>. Each thread t has a vector clock V<sub>t</sub> (initially V<sub>t</sub>[t] = 1, others 0); each lock has a clock L<sub>M</sub>.</p><ul><li>unlock M: L<sub>M</sub> = copy of V<sub>t</sub>, then V<sub>t</sub>[t] += 1.</li><li>lock M: V<sub>t</sub> = elementwise max(V<sub>t</sub>, L<sub>M</sub>).</li><li>access to X: record (t, V<sub>t</sub>[t], isWrite). It <b>races</b> with any earlier access (u, c, w) to X with u ≠ t, at least one of the two a write, and c &gt; V<sub>t</sub>[u] (the earlier access does not happen-before this one).</li></ul><p>Return the sorted list of variables involved in at least one race.</p>`,
    constraints: `≤ 2000 events, ≤ 10 threads.`,
    example: `<p>T1 lock m, T1 write x, T1 unlock m, T2 lock n, T2 read x → T2 took a <b>different</b> lock, so V<sub>T2</sub>[T1] = 0 &lt; 1 → ${H.c('r', '["x"]')}. With the same lock m, T2 would inherit T1's clock and there is no race.</p>`,
    brute: { why: `<p>Flagging every pair of conflicting accesses from different threads ignores synchronisation and reports every properly locked variable — all false positives. Lockset algorithms (Eraser) are cheaper but also over-report; happens-before with vector clocks reports only races that are real in some ordering consistent with this trace's synchronisation.</p>`, code: R`
      #include <set>
      #include <string>
      #include <vector>
      #include <map>
      #include <sstream>
      // Ignores locks entirely: every cross-thread conflict is "a race" (all false positives under locking).
      std::vector<std::string> racesNoSync(const std::vector<std::string>& trace) {
          std::map<std::string, std::vector<std::pair<std::string, bool>>> acc;
          std::set<std::string> out;
          for (const auto& e : trace) {
              std::istringstream in(e);
              std::string t, op, x;
              in >> t >> op >> x;
              if (op != "read" && op != "write") continue;
              for (const auto& [u, w] : acc[x]) if (u != t && (w || op == "write")) out.insert(x);
              acc[x].push_back({t, op == "write"});
          }
          return {out.begin(), out.end()};
      }` },
    mcq: { q: 'Why can TSan report a race that never misbehaved in the run?', options: ['It checks happens-before: two conflicting accesses not ordered by synchronisation are a race regardless of timing', 'It replays every possible interleaving', 'It uses random sampling', 'It reports all shared variables'], answer: 0, explain: 'A data race is defined by missing happens-before ordering, not by observed corruption; vector clocks detect that from one execution.' },
    hints: [`<p>Hint 1: Represent clocks as <code>map&lt;string,int&gt;</code> (missing = 0). Create a thread's clock with V[t] = 1 on its first event.</p>`, `<p>Hint 2: Store every access per variable (thread, epoch, write?). For a new access by t, compare each stored epoch c of thread u with V<sub>t</sub>[u].</p>`, `<p>Hint 3: Read-read pairs never race. Use a std::set for the result so it is sorted and unique.</p>`],
    tests: { sig: 'string[] -> string[]', fn: 'findRaces', cases: [[[["T1 write x","T2 write x"]],["x"]],[[["T1 lock m","T1 write x","T1 unlock m","T2 lock m","T2 write x","T2 unlock m"]],[]],[[["T1 read x","T2 read x"]],[]],[[[]],[]],[[["T1 write a","T1 write b","T1 lock m","T1 unlock m","T2 lock m","T2 unlock m","T2 read a","T3 read b"]],["b"]],[[["T1 lock m","T1 write x","T1 unlock m","T2 lock n","T2 read x","T2 unlock n"]],["x"]],[[["T1 read y","T2 write y","T1 write z","T1 write z"]],["y"]],[[["T1 write x","T1 lock m","T1 unlock m","T2 lock m","T2 unlock m","T2 write x","T3 read x"]],["x"]]] },
    solution: {
      approach: `<p>Maintain vector clocks per thread and per lock exactly as the statement says (release copies the clock and ticks, acquire joins). Keep full access histories (TSan keeps a bounded shadow of the last few accesses per 8 bytes instead).</p>`,
      code: R`
        #include <algorithm>
        #include <map>
        #include <set>
        #include <sstream>
        #include <string>
        #include <vector>

        std::vector<std::string> findRaces(const std::vector<std::string>& trace) {
            using Clock = std::map<std::string, int>;
            struct Access { std::string t; int epoch; bool write; };
            std::map<std::string, Clock> threads, locks;
            std::map<std::string, std::vector<Access>> history;
            std::set<std::string> racy;
            auto clockOf = [&threads](const std::string& t) -> Clock& {
                auto [it, inserted] = threads.try_emplace(t);
                if (inserted) it->second[t] = 1;
                return it->second;
            };
            for (const auto& e : trace) {
                std::istringstream in(e);
                std::string t, op, x;
                in >> t >> op >> x;
                Clock& v = clockOf(t);
                if (op == "lock") {
                    for (const auto& [u, c] : locks[x]) v[u] = std::max(v[u], c);   // acquire: join
                } else if (op == "unlock") {
                    locks[x] = v;                                                    // release: publish
                    ++v[t];
                } else {
                    const bool w = (op == "write");
                    for (const Access& a : history[x]) {
                        const auto it = v.find(a.t);
                        const int seen = it == v.end() ? 0 : it->second;
                        if (a.t != t && (w || a.write) && a.epoch > seen) racy.insert(x);
                    }
                    history[x].push_back({t, v[t], w});
                }
            }
            return {racy.begin(), racy.end()};
        }`,
      dry: { head: ['event', 'V(T1)', 'V(T2)', 'L(m)', 'race?'], rows: [['T1 lock m', '{T1:1}', '', '{}', ''], ['T1 write x', '{T1:1}', '', '{}', 'record (T1,1,W)'], ['T1 unlock m', '{T1:2}', '', '{T1:1}', ''], ['T2 lock m', '', '{T1:1,T2:1}', '', ''], ['T2 write x', '', '', '', '1 > V(T2)[T1]=1? no → no race']] },
      complexity: `<p>O(E · A · T) with full histories (A accesses per variable, T threads); real TSan bounds A by a small constant per memory word.</p>`
    }
  });

  practice.push({
    title: 'Corpus Merge: Keep the Smallest Inputs That Preserve Coverage', level: 'Hard', tags: ['fuzzing', 'greedy', 'set cover', 'libFuzzer'], companies: ['Google', 'Meta', 'Cloudflare'],
    statement: `<p>libFuzzer's <code>-merge=1</code> shrinks a corpus: it processes inputs from <b>smallest to largest</b> (ties by original index) and keeps an input only if it covers at least one feature not covered by inputs already kept. Given <code>features[i]</code> (feature ids reached by input i) and <code>sizes[i]</code>, return the indices of the kept inputs in increasing order.</p>`,
    constraints: `≤ 10<sup>4</sup> inputs, ≤ 10<sup>5</sup> features in total.`,
    example: `<p>features [[1,2],[2,3],[1,2,3]], sizes [10,10,5] → input 2 (size 5) alone covers {1,2,3}; inputs 0 and 1 add nothing → ${H.c('g', '[2]')}.</p>`,
    brute: { why: `<p>The truly minimal subset is a set-cover problem (NP-hard): trying all 2<sup>n</sup> subsets is impossible for real corpora with 100 000 files. The greedy size-ordered pass is linear in the total number of features and in practice shrinks corpora by 10–100×.</p>`, code: R`
      #include <vector>
      // Keeps everything that is non-empty: no shrinking at all.
      std::vector<int> keepAll(const std::vector<std::vector<int>>& f) {
          std::vector<int> out;
          for (int i = 0; i < static_cast<int>(f.size()); ++i) if (!f[i].empty()) out.push_back(i);
          return out;
      }` },
    mcq: { q: 'Why does merge process small inputs first?', options: ['Smaller inputs run faster and mutate more productively, so the kept corpus is both small and fast', 'Large inputs never add coverage', 'It is required for determinism only', 'libFuzzer cannot read large files'], answer: 0, explain: 'Among inputs with equal new coverage, the smaller one is cheaper to execute and to mutate, so it is preferred.' },
    hints: [`<p>Hint 1: Sort indices by (size, index) with a stable comparator.</p>`, `<p>Hint 2: Keep a hash set of seen features. An input is kept iff some feature of it is not yet in the set; then add all its features.</p>`, `<p>Hint 3: Inputs with no features are never kept. Sort the kept indices before returning.</p>`],
    tests: { sig: 'int[][] int[] -> int[]', fn: 'corpusMerge', cases: [[[[[1,2],[2,3],[1,2,3]],[10,10,5]],[2]],[[[],[]],[]],[[[[]],[1]],[]],[[[[1],[1],[1]],[3,2,1]],[2]],[[[[1,2],[3],[2,3],[4]],[1,1,1,100]],[0,1,3]],[[[[5],[5,6]],[1,1]],[0,1]],[[[[1,2,3],[1],[2],[3]],[9,1,1,1]],[1,2,3]]] },
    solution: {
      approach: `<p>Greedy pass in (size, index) order with a seen-feature set — libFuzzer's merge algorithm, minus the crash-resilient subprocess control.</p>`,
      code: R`
        #include <algorithm>
        #include <numeric>
        #include <unordered_set>
        #include <vector>

        std::vector<int> corpusMerge(const std::vector<std::vector<int>>& features, const std::vector<int>& sizes) {
            std::vector<int> order(features.size());
            std::iota(order.begin(), order.end(), 0);
            std::sort(order.begin(), order.end(), [&sizes](int a, int b) {
                return sizes[a] != sizes[b] ? sizes[a] < sizes[b] : a < b;
            });
            std::unordered_set<int> seen;
            std::vector<int> kept;
            for (int i : order) {
                const auto& f = features[static_cast<std::size_t>(i)];
                const bool adds = std::any_of(f.begin(), f.end(), [&seen](int x) { return !seen.count(x); });
                if (!adds) continue;
                kept.push_back(i);
                seen.insert(f.begin(), f.end());
            }
            std::sort(kept.begin(), kept.end());
            return kept;
        }`,
      dry: { head: ['input (by size)', 'features', 'new?', 'seen'], rows: [['2 (5)', '{1,2,3}', 'yes → keep', '{1,2,3}'], ['0 (10)', '{1,2}', 'no', '{1,2,3}'], ['1 (10)', '{2,3}', 'no', '{1,2,3}']] },
      complexity: `<p>O(n log n + total features) expected.</p>`
    }
  });

  /* ======================================================================
     QUIZ
     ====================================================================== */
  quiz.push(
    { q: 'A test checks <code>ASSERT_EQ(v.size(), 3u);</code> then reads <code>v[0]</code>, <code>v[1]</code>, <code>v[2]</code> with <code>EXPECT_EQ</code>. Why ASSERT first?', options: ['To make the test run faster', 'Because EXPECT_EQ cannot compare sizes', 'If the size is wrong, the test stops before indexing out of bounds', 'ASSERT failures are printed in red'], answer: 2, explain: 'ASSERT_* returns from the test function on failure, so later lines that depend on its condition never run. EXPECT_* would continue into undefined behaviour.' },
    { q: 'How does <code>TEST(Math, Add)</code> get registered without being called from <code>main</code>?', options: ['The linker scans for functions named *_Test', 'A static object\'s initialiser registers it before main runs', 'RUN_ALL_TESTS parses the source files', 'The compiler emits a special section that the OS loads'], answer: 1, explain: 'The macro defines a class plus a static variable whose initialisation calls MakeAndRegisterTestInfo; static initialisation happens before main.' },
    { q: 'In GoogleTest, how many fixture objects are created for a suite with 5 TEST_F tests?', options: ['5 — one fresh object per test', '1, shared by all tests', '2 — one for SetUp, one for TearDown', 'It depends on --gtest_repeat only'], answer: 0, explain: 'Each TEST_F gets its own fixture instance (constructor, SetUp, body, TearDown, destructor). Use SetUpTestSuite for shared expensive state.' },
    { q: '<code>INSTANTIATE_TEST_SUITE_P(P, S, Combine(Values(1, 2, 3), Bool()))</code> with two TEST_P tests registers how many test instances?', options: ['5', '6', '8', '12'], answer: 3, explain: 'Combine gives 3 × 2 = 6 parameter tuples, and each of the 2 TEST_P bodies is instantiated for each: 12.' },
    { q: 'Which statement about <code>EXPECT_DEATH(f(), "bad index")</code> is true?', options: ['f() runs in the test process and the exception is caught', 'f() runs in a child process that must die with stderr matching the regex', 'It passes if f() returns normally', 'It requires f() to throw std::runtime_error'], answer: 1, explain: 'Death tests fork (or re-exec) a child; the child must terminate abnormally (non-zero exit or signal) and its stderr must match.' },
    { q: 'Your code creates its <code>HttpClient</code> with <code>new</code> inside a member function. What must change before you can mock it?', options: ['Nothing: GoogleMock can intercept new', 'Mark HttpClient final', 'Introduce a seam: inject an interface (or template parameter) instead of constructing the dependency inside', 'Use StrictMock'], answer: 2, explain: 'Mocks replace dependencies only through a seam — constructor injection of an interface, a template parameter, or a link seam.' },
    { q: 'An <code>EXPECT_CALL(m, f()).Times(2)</code> is never satisfied, but the test still passes. Most likely cause?', options: ['The mock object was leaked, so its destructor (where verification happens) never ran', 'Times() is ignored without WillOnce', 'NiceMock suppresses all failures', 'Unsatisfied expectations are only warnings'], answer: 0, explain: 'Expectations are verified at mock destruction. A leaked mock is never verified — gmock reports leaked mocks at exit, and VerifyAndClearExpectations forces a check.' },
    { q: 'Which bug can Valgrind Memcheck find in an unmodified binary but AddressSanitizer cannot?', options: ['Heap buffer overflow', 'Use of an uninitialised value in a branch', 'Double free', 'Use after free'], answer: 1, explain: 'Memcheck tracks definedness bits for every value. ASan does not track initialisation — that needs MSan, which requires rebuilding everything.' },
    { q: 'Valgrind\'s leak summary lists "definitely lost", "indirectly lost", "possibly lost" and "still reachable". Which one most clearly means a real leak in your code?', options: ['still reachable', 'possibly lost', 'definitely lost', 'none of them'], answer: 2, explain: 'Definitely lost = no pointer to the block remains anywhere. Indirectly lost blocks are only reachable from lost blocks; still reachable usually means globals at exit.' },
    { q: 'What does <code>-Werror</code> do, and where should it be enabled?', options: ['Turns warnings into errors; enable it for your own targets in CI, not in flags exported to library users', 'Enables all warnings; use it everywhere', 'Makes errors print as warnings; use it for legacy code', 'Stops at the first error; use it only in release builds'], answer: 0, explain: 'Warnings-as-errors keeps new warnings from piling up. Exporting it to consumers breaks their builds when a newer compiler adds a warning.' },
    { q: 'In libFuzzer, what does the fuzzer do with a mutated input that reaches a new coverage feature but does not crash?', options: ['Discards it', 'Adds it to the corpus for further mutation', 'Reports it as a bug', 'Restarts the process'], answer: 1, explain: 'Inputs that increase coverage become stepping stones in the corpus; this feedback is what makes coverage-guided fuzzing effective.' },
    { q: 'A test suite has 100% line coverage for <code>int f(int a, int b) { return b ? a / b : 0; }</code>. Which is still possible?', options: ['A branch outcome or a bad value (b == 0, INT_MIN / -1) was never tested', 'A line that never ran', 'A compile error', 'Nothing — 100% line coverage proves correctness'], answer: 0, explain: 'Line coverage says each line ran. It says nothing about every branch outcome or about edge-case values.' },
    { q: 'You ran a Google Benchmark 10 times: 10.1, 10.2, 10.2, 10.3, 10.2, 10.1, 31.0, 10.3, 10.2, 10.2 ms. Which single number best represents typical performance?', options: ['The mean, 12.28 ms', 'The maximum, 31.0 ms', 'The median, 10.2 ms', 'The first run, 10.1 ms'], answer: 2, explain: 'The median ignores the one disturbed run. Report the spread too, and investigate whether such outliers are frequent.' },
    { q: 'gdb on a production core shows <code>#0 0x00005555... in ?? ()</code> for every frame. What is missing?', options: ['The -O0 flag', 'The matching binary / debug symbols for that exact build', 'A watchpoint', 'Thread information'], answer: 1, explain: 'Symbolisation needs the same build (matched by build-id) with debug info, e.g. from separate debug files or debuginfod.' },
    { q: 'A CI log says a test process was terminated with exit code 139. What happened?', options: ['main returned 139', 'It ran out of time', 'It was killed by SIGSEGV (128 + 11)', 'It was killed by SIGTERM'], answer: 2, explain: 'Shells and many CI runners report a signal death as 128 + signal number; SIGSEGV is 11.' }
  );

  /* ======================================================================
     INTERVIEW Q&A
     ====================================================================== */
  interview.push(
    { q: 'How does a C++ unit-test framework like GoogleTest discover and run tests?', level: 'I', a: `<p><code>TEST(Suite, Name)</code> expands to a class <code>Suite_Name_Test</code> deriving from <code>::testing::Test</code> with a <code>TestBody()</code> override, plus a static <code>TestInfo*</code> whose initialiser calls <code>MakeAndRegisterTestInfo</code> with a factory for the class. Static initialisers run before <code>main</code>, so by the time <code>RUN_ALL_TESTS()</code> is called, a global registry holds every test from every linked object file. The runner applies filters/sharding/shuffling, and for each test creates the object, calls <code>SetUp</code>, <code>TestBody</code>, <code>TearDown</code>, deletes it, and records results reported by assertion macros (which append to the current test's result; ASSERT also returns). It returns non-zero if anything failed, so CI sees the exit code. Gotchas: a test file not linked into the binary runs zero tests; static-init order across files is unspecified, so tests must not depend on each other.</p>`, followUps: ['How would you implement ASSERT without exceptions?', 'Why does GoogleTest use a function-local static for the registry?', 'How does gtest_discover_tests turn each test into a CTest entry?'] },
    { q: 'EXPECT vs ASSERT, fixtures vs SetUpTestSuite: how do you structure tests for a class with expensive dependencies?', level: 'B', a: `<p>EXPECT records and continues — use it for independent facts so one run shows all failures; ASSERT records and returns from the current function — use it when later lines depend on the condition (non-null pointer, correct size before indexing). For shared setup I use a fixture: per-test state in the constructor/SetUp (a fresh object per test keeps tests isolated); genuinely expensive, read-only resources (a loaded model, a test database schema) in <code>static SetUpTestSuite</code> or a global <code>Environment</code>, with per-test cleanup (transaction rollback, clearing tables) in TearDown. I avoid real external services in unit tests: inject interfaces and use fakes; real-dependency tests go to a separate, labelled integration suite.</p>`, followUps: ['Why can ASSERT not be used in a constructor or a non-void helper?', 'How do you detect hidden order dependencies between tests?'] },
    { q: 'When would you use parameterised, typed and death tests? Give an example of each.', level: 'I', a: `<p><b>Value-parameterised</b> (<code>TEST_P</code> + <code>INSTANTIATE_TEST_SUITE_P</code>): one behaviour checked over a table of inputs — e.g. a URL parser over 40 valid and invalid URLs, with a name generator so failures say which case. <b>Typed</b> (<code>TYPED_TEST</code>, or <code>TYPED_TEST_SUITE_P</code> for conformance suites): a template or interface with several implementations — e.g. every allocator or every <code>Queue&lt;T&gt;</code> for int, string and move-only types must pass the same 20 tests. <b>Death tests</b> (<code>EXPECT_DEATH</code>, <code>EXPECT_EXIT</code>): code that is supposed to terminate — a contract check that calls <code>abort()</code> on misuse, a CLI that must exit(2) on bad flags. They run in a forked or re-executed child; I name the suite <code>*DeathTest</code> so they run before threads exist and keep them few because each costs a process.</p>`, followUps: ['How does Catch2 do the same with GENERATE and TEMPLATE_TEST_CASE?', 'Why is fork() unsafe in a multithreaded test binary?'] },
    { q: 'Explain mocks vs stubs vs fakes. How do you make C++ code mockable, and when is mocking a bad idea?', level: 'I', a: `<p>A stub returns canned answers; a fake is a working simplified implementation (in-memory store); a mock additionally verifies interactions (calls, arguments, counts). In C++ you need a <b>seam</b>: depend on an abstract interface injected through the constructor (runtime polymorphism, what GoogleMock's <code>MOCK_METHOD</code> targets), on a template parameter (zero overhead, compile-time), or use a link seam. Mocking is a bad idea for value types and internal collaborators — tests that mirror the implementation call-by-call break on every refactor and pass when behaviour is wrong. I mock at boundaries where the interaction <i>is</i> the behaviour (an email must be sent once, a payment API called with the right amount), use fakes for queries, and prefer StrictMock only where unexpected calls are meaningful.</p>`, followUps: ['How does GoogleMock choose between two matching expectations?', 'How would you mock a non-virtual third-party class?'] },
    { q: 'Compare AddressSanitizer and Valgrind Memcheck. When would you pick each?', level: 'I', a: `<p><b>ASan</b> is compile-time instrumentation + runtime: shadow memory with redzones and a freed-memory quarantine; ~2× slowdown; finds heap/stack/global overflows, use-after-free/return/scope, double free, and leaks via LSan; needs recompiling (ideally everything). <b>Valgrind Memcheck</b> runs the unmodified binary on a synthetic CPU (dynamic binary translation), tracking addressability and definedness bits; 20–50× slower, serialises threads, cannot see stack-object lifetimes or overflows between stack variables, but finds <b>uninitialised-value use</b> without MSan and needs no rebuild. I use ASan+UBSan for every CI test run and fuzzing; Valgrind for third-party or legacy binaries I cannot rebuild, for uninitialised-read hunting when MSan is impractical, and its other tools (Massif heap profiling, Cachegrind). They cannot be combined in one run.</p>`, followUps: ['What can ASan miss?', 'Why does MSan need every library instrumented?'] },
    { q: 'How do ThreadSanitizer\'s race and deadlock detection work, and what are their limits?', level: 'A', a: `<p>Races: TSan instruments every memory access and synchronisation operation and maintains <b>vector clocks</b> per thread and per sync object (mutex unlock publishes the thread's clock, lock joins it; atomics with release/acquire do the same). Each 8-byte word has shadow cells holding the last few accesses (thread, epoch, read/write). An access races with a shadow entry from another thread if one is a write and that epoch is not ≤ the current thread's clock entry — i.e. no happens-before. So it reports races that did not visibly misbehave. Deadlocks: it maintains a lock-order graph (edge A→B when B is acquired while holding A) and reports a cycle as "lock-order-inversion (potential deadlock)". Limits: only executed paths; bounded history can miss old accesses; custom sync (inline asm, uninstrumented libraries) causes false positives unless annotated; 5–15× CPU and large memory; cannot combine with ASan/MSan.</p>`, followUps: ['How would you annotate a custom lock-free queue for TSan?', 'Why can a race on a bool flag be a real bug even on x86?'] },
    { q: 'You inherit a codebase with 4 000 compiler warnings and no static analysis. What is your plan?', level: 'A', a: `<p>1) Make the build reproducible and export <code>compile_commands.json</code>. 2) Pick a sensible warning set (<code>-Wall -Wextra -Wshadow -Wconversion</code>…), record the current warnings as a <b>baseline</b>, and add a CI <b>ratchet</b> that fails only on new warnings (keys without line numbers, counted as a multiset). 3) Enable <code>-Werror</code> immediately for new or clean directories. 4) Burn down by category, highest-value first: <code>-Wreturn-type</code>, format strings, uninitialised, sign-compare in bounds checks, shadowing; use automated fix-its for mechanical ones (<code>modernize-*</code>) in separate, test-covered PRs. 5) Add clang-tidy with a curated <code>bugprone-*</code>, <code>clang-analyzer-*</code>, <code>performance-*</code> set, run on changed lines in PRs and fully nightly. 6) Shrink the baseline every time a warning disappears; never allow broad suppressions — only <code>NOLINT(check): reason</code> on single lines.</p>`, followUps: ['Why do some GCC warnings appear only at -O2?', 'How would you treat third-party headers?'] },
    { q: 'What is coverage-guided fuzzing, and how would you add libFuzzer to a project that parses untrusted files?', level: 'A', a: `<p>A coverage-guided fuzzer mutates inputs, runs the target, and keeps inputs that reach new coverage features (edges and hit-count buckets) as seeds for further mutation; comparison tracing feeds constants from the code into mutations. Plan: write <code>LLVMFuzzerTestOneInput</code> that calls the parser on arbitrary bytes, plus property checks (round-trip, invariants, differential vs a reference) that <code>__builtin_trap()</code> on violation; build with <code>-fsanitize=fuzzer,address,undefined</code>; seed the corpus with real files and add a dictionary of format tokens; disable checksums under <code>FUZZING_BUILD_MODE_UNSAFE_FOR_PRODUCTION</code>; run in CI for a fixed time on every PR (ClusterFuzzLite) and continuously (OSS-Fuzz or an internal farm); store the minimised corpus in the repo or a bucket and replay it as a regression test in normal CI. Every crash gets minimised, turned into a unit test, fixed, and triaged for security impact.</p>`, followUps: ['How do you fuzz an API with a sequence of calls rather than a byte parser?', 'What do timeouts and OOMs found by a fuzzer usually mean?'] },
    { q: 'Line, branch and MC/DC coverage: what do they measure, and how should a team use coverage?', level: 'I', a: `<p>Line coverage: did each statement run. Branch coverage: did each outcome of each decision happen (both true and false of every if, every switch case). MC/DC: for every condition in a decision, a pair of tests shows that condition alone flipping the decision — required for the most critical avionics software; Clang 18+ can measure it. Coverage measures execution, not checking: 100% can coexist with no assertions. I use it to find untested code (the uncovered list is the useful output), gate PRs on <b>patch coverage</b> of changed lines rather than a global number, and complement it with mutation testing (Mull) to judge whether tests actually detect faults. Build coverage at -O0, merge profiles from all test processes, and exclude generated and third-party code.</p>`, followUps: ['Why is coverage of templates and macros tricky with gcov?', 'How would you compute MC/DC test pairs for (a && b) || c?'] },
    { q: 'How do you benchmark two implementations reliably in C++?', level: 'A', a: `<p>Use Google Benchmark (or nanobench): it chooses iteration counts, handles timing, and offers <code>DoNotOptimize</code>/<code>ClobberMemory</code> so the optimiser cannot delete the work. Benchmark realistic sizes and data distributions with <code>Range/Args</code> (cache-resident vs RAM-sized behave differently), seed any randomness, exclude setup (<code>PauseTiming</code> has overhead — better to prepare data outside the loop). Control the machine: release flags identical to production, CPU frequency scaling off, pinned cores, quiet system. Run repetitions (<code>--benchmark_repetitions=20</code>), look at median and CV, and compare with a statistical test (<code>compare.py</code> uses Mann-Whitney U) rather than one run each. Confirm the reason with <code>perf stat</code> counters, and validate in the real application — microbenchmarks keep everything hot in cache.</p>`, followUps: ['Why is the median preferred over the mean?', 'How would you track benchmark regressions across commits?'] },
    { q: 'A service crashed in production overnight. Walk me through debugging it from a core dump.', level: 'A', a: `<p>Get the core (systemd-coredump: <code>coredumpctl list</code>/<code>coredumpctl gdb</code>; otherwise core_pattern's path) and the <b>exact binary and debug info</b> for that build (build-id, separate debug files, debuginfod). Open <code>gdb ./server core</code>: <code>bt</code> for the crashing thread, <code>info threads</code> and <code>thread apply all bt</code> for context, <code>frame N</code>, <code>info locals</code>, <code>print</code> key objects with pretty-printers, <code>info registers</code>/<code>x/16gx $sp</code> if frames look corrupt. Form a hypothesis (null from a failed lookup, use-after-free, race), then reproduce it locally under ASan/TSan with the request that triggered it; write a failing regression test, fix, and add the sanitizer job or fuzz target that would have caught it. If the stack is garbage, suspect memory corruption and go straight to ASan or rr.</p>`, followUps: ['What is in a core file and what is not?', 'How do minidumps (Crashpad) differ from full cores?'] },
    { q: 'Design the CI pipeline for an open-source C++ library supporting GCC, Clang and MSVC.', level: 'E', a: `<p>Fast PR path (&lt; 15 min): clang-format check; clang-tidy on changed lines; a matrix of {GCC, Clang} × {Debug, Release} on Linux plus MSVC on Windows and Clang on macOS, all with warnings-as-errors on our targets; unit tests via <code>ctest -j --output-on-failure</code>; an ASan+UBSan job (<code>-fno-sanitize-recover=all</code>) and a TSan job; patch-coverage report; a 5-minute fuzz run on the parsers with the regression corpus replayed. Use ccache/sccache keyed on compiler version, pinned toolchain containers, and upload logs/cores/crash inputs as artefacts on failure. Nightly: full clang-tidy and static analysis, MSan with instrumented libc++, long fuzzing, benchmarks on a dedicated quiet machine with regression alerts, and builds against the oldest supported compiler and newest compiler versions. Flaky tests are retried at most once, tracked, and quarantined with owners. Releases build from tags with reproducible flags and keep debug symbols.</p>`, followUps: ['How do you keep the PR path fast as the project grows?', 'How do you test the installed package (find_package) in CI?'] },
    { q: 'How are AI coding assistants changing C++ testing and tooling, and where do you not trust them?', level: 'E', a: `<p>They are excellent at boilerplate: GoogleTest/Catch2 skeletons, <code>MOCK_METHOD</code> lines, parameter tables, CI YAML, fuzz harnesses (OSS-Fuzz-Gen found real bugs with LLM-written targets), explaining long sanitizer reports and suggesting gdb commands. I do not trust them to choose expected values (they often derive them from the implementation, so tests pass on wrong code), to decide what to mock (they over-mock), to "fix" sanitizer findings (they hide symptoms: bigger buffers, suppressions), or to claim a test suite is sufficient (coverage rises while mutation score does not). My guard rails: deterministic tools as gates (warnings, clang-tidy, sanitizers, fuzzing), mutation testing or deliberate fault injection on AI-written tests, human ownership of the oracle (expected values, invariants), and running every AI change through the full sanitizer matrix.</p>`, followUps: ['How would you measure whether AI-generated tests are any good?', 'Would you let an agent auto-apply clang-tidy fixes? Under what conditions?'] }
  );

  registerModule({
    id: 'cpp15',
    title: 'Testing, Sanitizers & Tooling in C++',
    intro: `<p>Writing C++ that works on your machine is the easy part. Professional C++ is about <b>proving</b> it works and <b>catching</b> what doesn't before users do: unit tests with <b>GoogleTest</b> and <b>Catch2</b>, mocks with <b>GoogleMock</b>, runtime bug detectors (<b>ASan, UBSan, TSan, MSan</b> and <b>Valgrind</b>), static analysis (<b>warnings as errors, clang-tidy, cppcheck</b>), <b>libFuzzer</b>, <b>coverage</b>, <b>Google Benchmark</b>, <b>gdb/lldb</b> with core dumps, and the <b>CI</b> pipeline that runs it all on every change.</p>
      <p>C++ 6 taught ownership and memory bugs, and C++ 12 showed how UB and sanitizers work inside. This module is the toolbox and the workflow around them. You will learn how a test framework works by building one, read real sanitizer and Valgrind reports, design a warnings ratchet, watch a fuzzer learn a magic word, compute branch coverage and robust benchmark statistics, symbolise a backtrace, and build the detectors behind TSan: lock-order inversion and vector-clock race detection.</p>
      <p>Interviewers at infrastructure, trading, browser, game and embedded companies ask exactly these questions ("how would you find this heap corruption?", "how do you test code that talks to a network?", "design CI for a C++ library"). In an age of AI-written code, these tools are how you trust code you did not write.</p>`,
    goals: [
      'Write GoogleTest and Catch2 tests with the right assertions, fixtures, parameterised, typed and death tests — and explain how registration and runners work',
      'Design seams for dependency injection and use GoogleMock expectations, matchers and cardinalities without over-mocking',
      'Choose between ASan, UBSan, TSan, MSan and Valgrind, configure and suppress them, and read their reports to the root cause',
      'Set up warnings-as-errors, clang-tidy and cppcheck in a legacy codebase with a baseline ratchet',
      'Write libFuzzer targets with property checks, and minimise, merge and replay corpora',
      'Measure line, branch and patch coverage, and produce trustworthy benchmark statistics with Google Benchmark',
      'Debug crashes and hangs with gdb/lldb and core dumps, and design a CI matrix for a multi-compiler C++ project'
    ],
    prereqs: `C++ 6 (Memory Management, RAII &amp; Smart Pointers) and C++ 14 (CMake, Build Systems &amp; Toolchains). C++ 11 (Concurrency) helps for the TSan parts and C++ 12 (Low-Level Performance &amp; UB) for sanitizer internals and benchmarking pitfalls.`,
    hours: 16,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
