# Adding tests and language implementations to a module

Goal: a learner who picks **Java, Python, JavaScript/TypeScript or C++** can finish the module without reading another language, and every solution is proven correct by tests in every language.

## What to add, per module

1. **`tests` on every problem.** This covers guided problems in `topics[i].problems` / `topics[i].problem`, and every `practice[k]`. Format (full reference in the header of `tools/solution-check.js`):
   ```js
   tests: { sig: 'int[] int -> int[]', fn: 'twoSum', cmp: 'set', cases: [
     [[[2, 7, 11, 15], 9], [0, 1]],      // [[args...], expected]
     [[[3, 3], 6], [0, 1]]
   ] }
   ```
   - **Types:** `int long double bool string char ListNode TreeNode void`, `T[]`, `T[][]`, `list<T>`. Use `list<...>` when the Java signature takes a `List`, and `T[]` when it takes an array.
     - Trees use LeetCode level order with `null` for missing children.
     - Write a `long` value above 2^53 as a string: `"9223372036854775807"`.
   - **Design problems** (a class with methods): use `{ cls, sigs, cases: [{ ops, args, out }] }`. The constructor's `out` entry is `null`, and so is every `void` method's.
   - **Programs that read stdin:** use `{ io: true, cases: [{ stdin, stdout }] }`.
   - **Problems whose answer is not code** (a proof, an estimate, a written design): use `{ skip: 'why' }`. Use this rarely.
   - **Choose `cmp` honestly:**
     - `exact` is the default;
     - `set` when the order of the list does not matter;
     - `sets` for a list of lists where both levels are order-free;
     - `float` for doubles;
     - `oneOf` when there are a few acceptable answers.
     - For many valid answers (any topological order, any valid path), use `check: '(args, out, expected) => boolean'`.
   - **In-place changes:**
     - For a `void` function that changes an argument, set `mutate: k`; the answer is argument k after the call.
     - For a function that returns a value and also changes an argument (remove duplicates in place, partition), set `both: k`; the output is `[returned value, argument k after the call]`, checked with a `check` function.
   - **Big inputs** (overflow and performance boundaries) must not be written out in full, because Java rejects methods over 64 KB. Use a generated value as an argument or expected value:
     - `{ $rep: 100000, n: 30000 }` gives 30000 copies; `{ $rep: 'a', n: 65000 }` for a string gives `'aaa…'`;
     - `{ $range: [0, 100000, 1] }` gives 0, 1, … 99999 (the step is optional and may be negative);
     - `{ $concat: [[5, 6], { $rep: -1, n: 70000 }, { $range: [10, 0, -2] }] }` joins parts; strings join the same way.
     Each language builds the value at run time. A `check` function receives the expanded arguments.
     Generated values also work for `ListNode` arguments (the list is built from the generated numbers).
     They **nest**:
     - a 300 × 100 grid is `{ $rep: { $range: [0, 100] }, n: 300 }`;
     - a generated row can sit inside a literal grid: `[[1, 2], { $range: [0, 3] }]`;
     - `$concat` parts may themselves be generated.
   - **Big design tests:**
     - In a design case, `ops`, `args` and `out` may be generated values, for example `ops: { $concat: [['MinStack'], { $rep: 'push', n: 5000 }, ['getMin']] }`, with `args` and `out` built the same way.
     - Write string operations as `$rep` or as arrays, not as bare strings inside `$concat`.
     - Java runs each case, and each block of 200 operations, in its own method, so a case can have thousands of operations.
   - **Inputs the format cannot describe** (a cycle, nodes shared between two lists, random pointers, a graph of objects): put a small builder in `tests.harness`, one per language, and point `fn` at it. The builder makes the input the way the judge would, calls the real solution and returns something comparable. It is test-only code and never appears in the learner's solution.
     ```js
     tests: { sig: 'int[] int -> bool', fn: 'cyc', harness: {
       java: 'class Check { static boolean cyc(int[] v, int pos) { /* build list, link tail to pos */ return new Solution().hasCycle(head); } }',
       python: 'def cyc(v, pos): ...', js: 'function cyc(v, pos) { ... }', cpp: 'bool cyc(vector<int> v, int pos) { ... }' },
       cases: [[[[3, 2, 0, -4], 1], true]] }
     ```
     In Java, put the helpers in their own class (for example `Check`) as static methods.
     In C++, write the builder as a free function; it may use `class Solution`. A `$rep` of a list or a `ListNode` builds a separate copy for every element.
   - Doubles with many digits are fine (`3.3333333333333335`); integers with 16+ digits are compared exactly.
   - **At least 6 cases per problem.** Include the statement's examples plus boundary cases: empty or smallest input, a single element, duplicates, negatives and zero, maximum-size values (overflow), and an already-sorted or reversed input where it matters.
   - Work out every expected value by hand, or with a separate brute-force run. **Never copy the expected value from the solution you are testing.**
2. **Implementations** in `solution.alt` (keep the Java one in `solution.code` as it is):
   - DSA: `{ lang: 'python', code }`, `{ lang: 'js', code }`, `{ lang: 'cpp', code }`.
   - LLD: `{ lang: 'python', code }`, `{ lang: 'ts', code }`, `{ lang: 'cpp', code }`.
   - **Naming:**
     - Java, JS and C++ use the same function name as the Java method.
     - Python uses snake_case (`twoSum` becomes `two_sum`); if it differs, set `tests.names.python`.
     - Design classes keep the same class and method names in every language.
   - **Shape:**
     - Python: a top-level function, or `class Solution` with the method.
     - JS: a top-level `function`, or `class Solution`.
     - C++: `class Solution { public: ... };` or a free function. `#include <bits/stdc++.h>` and `using namespace std;` are provided.
     - `ListNode` and `TreeNode` are provided in all four languages with the LeetCode fields (`val`, `next`, `left`, `right`). Do not redefine them unless the lesson teaches the definition.
   - **Write idiomatic code for each language.** It should not read as Java translated line by line:
     - Python uses `collections`, `heapq`, `bisect`, comprehensions;
     - JS uses `Map`, `Set`, typed loops;
     - C++ uses the STL and references.
   - If an existing Python version fails a test, fix it.
3. **Topic code**: every lesson code block in `topics[i].code` (and `examples[j].code`) that is Java gets `alt: [{ lang: 'python', code }, { lang: 'js', code }, { lang: 'cpp', code }]` (TypeScript instead of JS for LLD). Keep each block's title, and keep `run: true` only on code that runs standalone and prints. Python and JS runnable code is executed by the validator.
4. **`langNotes`** on the module: one short HTML paragraph per language (`java`, `python`, `js`, `cpp`), covering only what matters for this module's topics:
   - **Recursion limits:**
     - Python: 1000 frames by default. Use iteration, or `sys.setrecursionlimit` together with `threading.stack_size` for deep DFS.
     - Java: about 10k frames.
     - JS: about 10k frames.
     - C++: about an 8 MB stack.
   - **Integers:**
     - Java `int` overflow wraps silently, so use `long`.
     - Python integers never overflow.
     - JS `Number` is exact only to 2^53; past that use `BigInt`. `%` keeps the sign of the dividend, and `|0` truncates to 32 bits.
     - C++ signed overflow is undefined behaviour, so use `long long`.
   - **Complexity traps:**
     - `list.pop(0)` and `array.shift()` are O(n), so use `deque` or an index;
     - JS `sort()` compares strings unless you pass a comparator;
     - string building in loops;
     - `HashMap` vs `TreeMap` / `dict` vs `SortedList` / `Map` vs a sorted array;
     - C++ `map` is O(log n), `unordered_map` is O(1) on average.
   - **Heaps:**
     - Java `PriorityQueue` is a min-heap.
     - Python `heapq` is min only, so negate for a max-heap.
     - C++ `priority_queue` is a max-heap.
     - **JS has no built-in heap.** Each JS solution that needs one includes a small `MinHeap` class (`push`, `pop`, `peek`, `size`, with a comparator), written the same way across the module.
5. **Language-neutral wording**: where explanations, hints or approaches say "in Java" for a general idea, reword them so they apply to any language, or name the equivalent in each language ("a hash map: `HashMap` / `dict` / `Map` / `unordered_map`"). Do not edit `prereqs`; it is generated from the path data.

## Stacks and recursion limits

The checker runs every language with its **default** stack and recursion limit, as a learner's machine does: Java's default thread stack, Node's default stack, Python's limit of 1000 frames, and C++'s 8 MB stack. A solution that crashes at the stated maximum input is a bug, so fix it in that language. Use an iterative version, an explicit stack, or a recursion that is only O(log n) deep. In Python you may instead raise the limit inside the solution (`sys.setrecursionlimit`) when depth is guaranteed small enough, and explain it in `langNotes`.

## Rules

- Edit only your module file. Do not change ids, the order or number of topics, problems, quiz or interview items, or any text that is not listed above. (Progress tracking depends on positions.)
- If a Java reference solution fails a test whose expected value you have verified independently, **fix the Java solution**. Record each fix (problem, what was wrong) in your final report, because these are the syllabus faults we are repairing.
- If a problem's statement, constraints or example output is wrong or ambiguous, fix it and record it.
- No placeholders, TODOs or ellipses in code. Keep comments short.
- Work problem by problem: add the tests and implementations, then run `node tools/solution-check.js content/<track>/<id>.js --only <index>`.

## Done means

```
node tools/validate.js content/<track>/<id>.js --code   # PASSED
node tools/solution-check.js content/<track>/<id>.js --require java,python,js,cpp   # 0 failing (LLD: java,python,ts,cpp)
```

Then report:
- the counts;
- every Java, Python, statement or example fix, with the reason;
- any problem marked `skip`, with the reason.

## LLD modules (design programs)

LLD solutions are complete programs: classes plus a `main` demo that prints results. Test them in program mode:

```js
tests: { io: true, cases: [{ stdin: '', stdout: 'circle 12.57\nsquare 9.00\n...' }] }
```

- Every language's implementation (`python`, `ts`, `cpp`) is a complete program. It defines the same design (interfaces/protocols/abstract classes, the same class names and responsibilities) and runs **the same demo, printing exactly the same lines** as the Java version.
- Format numbers explicitly in every language, for example two decimals (`String.format("%.2f")`, `f"{x:.2f}"`, `x.toFixed(2)`, `fixed << setprecision(2)`), so the outputs match. You may change the Java demo's print format to make that possible.
- Add a second case only when the program reads stdin.
- The design must be idiomatic per language:
  - Python: `abc.ABC` or `typing.Protocol`, `@dataclass`, `__eq__`/`__hash__` where equality matters.
  - TypeScript: `interface`, classes, composition, discriminated unions where natural.
  - C++: abstract base classes with virtual destructors, `unique_ptr`/`shared_ptr` ownership, RAII, `override`.
- `langNotes` for LLD covers interfaces vs abstract classes, equality and hashing, immutability, ownership and lifetimes (C++), and composition idioms per language.
- Required languages: `--require java,python,ts,cpp`.
- Lessons from LLD 1:
  - Write the expected stdout by hand from the design's logic, then compare it with the Java run.
  - Extend short demos so they also print failure paths, such as a rejected payment or an unknown item.
  - The Java set-up already imports `java.util.*`, `java.util.function.*`, `java.util.stream.*`, `java.util.concurrent.*` (with `atomic` and `locks`), `java.time.*`, `java.math.*` and `java.io.*`.
  - The main class is the innermost class that contains `main`. Comments and strings are ignored when finding it.
  - Program mode does not type-check TypeScript. Type-check it yourself with `npx tsc --strict --noEmit --target es2022 --lib es2022`, and avoid class names that clash with DOM types (for example `Location`) or with C++ keywords (`delete`, `new`, `default`).
  - Python abstract methods may use `...` as their body.

## Language-track modules (Java, Python, JS/TS, C++)

These tracks teach one language, so a problem is tested **only in that language**. Do not add other-language alternatives.

- **Required language:**
  - `java*`: `--require java`.
  - `py*`: `--require python`.
  - `js*`: `--require js`, except for the TypeScript modules, which use `--require ts`.
  - `cpp*`: `--require cpp`.
- **Existing alternatives:** an existing alternative in another language (for example the Python versions in some Java modules) must pass the same tests. Fix it if it fails.
- **Choose the mode that tests what the problem teaches:**
  - **Function mode** for a function or method.
  - **Design mode** for a class with methods.
  - **Program mode** (`io`) when the solution is a whole program with `main`, or the point is what it prints.
  - A `check` function when many outputs are valid.
- **Language-feature problems** (generics, iterators, decorators, closures, move semantics, async):
  - Test the observable behaviour: return values, printed output, or exceptions caught and reported as values.
  - Tests may call the feature through a small `tests.harness` builder, as in the DSA modules. For example, the builder calls a decorated function three times and returns the call count.
- **TypeScript type-level answers** (utility types, conditional and mapped types, `.d.ts` declarations) are tested with `tests: { types: [...] }`. Each entry is compiled with the solution under `--strict`, and every entry must type-check.
  - Positive checks use `Expect<Equal<...>>`, for example `'type _1 = Expect<Equal<First<[3, 2]>, 3>>'`. `Equal` and `Expect` are provided.
  - Negative checks use `'// @ts-expect-error\nconst bad: PartialBy<User, "id"> = {}'`. An unused `@ts-expect-error` is an error, so a too-loose type also fails.
  - Give at least 6 entries, mixing positive and negative checks.
- **Which implementation runs:** the main solution is always tested, even with `check: false`; for a main solution, that flag only tells the validator it cannot compile it, as with PostgreSQL-only SQL. An alternative marked `check: false` is illustrative and is not run, for example a MongoDB pipeline. To test an alternative instead of the main solution, set `tests.alt: k` to the alternative's index. An example is the pure-Python version when the main one needs NumPy.
- **Second versions of a method:** when a solution also teaches another version (an idiomatic one-liner next to the loop, a sorting version next to the hash-set one), list it in `tests.also` so it runs the same cases: `also: ['isAnagramCount']` for every language, or `also: { java: ['removeEvensIdiomatic'], python: ['is_leap_one_line'] }` per language. The name is looked up in a same-language alternative first, then in the main code; a Java alternative written as a bare method is wrapped in a class to run.
- **C++ programs with their own `main`:** function and design tests rename the lesson's `int main(` to `lesson_main__`. A whole demo program can therefore still be tested function by function with many cases. Use program mode only when the point is what `main` prints.
- **Concurrency, time and randomness:** make the result deterministic.
  - Join every thread before checking.
  - Check invariants such as totals, counts and ordering guarantees, not interleavings.
  - Seed random generators, or check properties of the result.
  - Never sleep to "wait long enough".
- **When to use `skip`:** only when the answer cannot run in a plain process. Examples:
  - a browser DOM or a real network;
  - a GUI;
  - a build tool or an external service;
  - output that is an explanation.

  Give the specific reason, for example `{ skip: 'needs a browser DOM (document.querySelector)' }`.
- **Cases and expected values:**
  - Use at least 6 cases, including the boundary cases listed above.
  - Expected values are worked out independently, never copied from the solution under test.
- **Fixes:** a wrong solution, statement or example is fixed and recorded, exactly as for DSA.
- **Done means:**

  ```
  node tools/validate.js content/<track>/<id>.js --code                 # PASSED
  node tools/solution-check.js content/<track>/<id>.js --require <lang>   # 0 failing
  ```

## SQL modules

SQL solutions run on the **same sql.js (SQLite) build the site uses**, against the module's lab database: `solution.code.db`, whose schema is in `databases[db]`. They can also run on PostgreSQL 16 in a throwaway cluster.

```js
tests: { cmp: 'exact', engine: 'sqlite', cases: [
  { cols: ['name', 'price'], rows: [['Running_Shoes', 4999], ['Mechanical Keyboard', 3499]] },
  { setup: "UPDATE products SET price = NULL WHERE id = 3", rows: [...] },        // change the data first
  { after: "SELECT COUNT(*) FROM orders WHERE status = 'paid'", rows: [[42]] },   // check state after DML/DDL
  { after: "INSERT INTO passport VALUES (1, 'P-2')", error: 'UNIQUE|duplicate' }    // a constraint must reject this
] }
```

- **What runs, in order:**
  1. the schema;
  2. the case's `setup`;
  3. the solution;
  4. the case's `after`, if there is one.
- **What is compared:** the last result set, from `after` when it is given, otherwise from the solution.
  - `result: k` picks an earlier result set instead (0 is the first, -1 the last). Only statements that return at least one row count, as in the site's SQL runner.
  - `rows` are compared in order with `cmp: 'exact'` (the default). Use exact whenever the statement asks for an order.
  - Use `cmp: 'set'` when it does not.
  - `cols` is optional and case-insensitive.
  - Numbers allow a 1e-6 relative difference.
  - Booleans match 1/0 (SQLite) and t/f (PostgreSQL).
- **Expected errors:** `error` is a case-insensitive regex that the error message must match. It works for both engines, for example `'UNIQUE|duplicate key'`.
- **Engines:**
  - `engine: 'both'` runs SQLite and PostgreSQL. Use it when the statement promises the same answer on both.
  - `engine: 'postgres'` is for PostgreSQL-only features, such as `FOR UPDATE SKIP LOCKED`, `DISTINCT ON`, `LATERAL` or `jsonb`.
  - PostgreSQL loads the same schema with SQLite `PRAGMA` lines removed. Use `tests.pg` if the schema still does not load there.
- **No database:** problems with no `db` (schema design, normalisation) start from an empty database. Test them with `after` queries:
  - valid rows are accepted;
  - invalid rows fail with `error`;
  - the expected tables and columns exist (for example `SELECT name FROM pragma_table_info('t')`).
- **Expected rows** come from the data and the statement, worked out independently. You may check them with a different query of your own, never with the solution.
- **`check`:** `'(rows, cols, c) => boolean'` is available for answers with many valid forms, such as a query plan that must mention `USING INDEX`.
- **Required language:** `--require sql`. A problem whose solution is not SQL (Python, JSON or text) is tested in its own language if it is code. Otherwise it is skipped with the reason.
- **Concurrency:** a problem that needs two concurrent sessions (deadlocks, isolation anomalies) cannot be checked by one script. Skip it with that reason, unless a single-session check proves the point.

## Commands

```
node tools/solution-check.js content/dsa/<id>.js --require java,python,js,cpp
node tools/solution-check.js content/lld/<id>.js --require java,python,ts,cpp
```
