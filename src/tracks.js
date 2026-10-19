var LEVELS = {
  B: { name: 'Beginner', icon: '🟢', color: 'g' },
  I: { name: 'Intermediate', icon: '🔵', color: 'b' },
  A: { name: 'Advanced', icon: '🟣', color: 'p' },
  E: { name: 'Expert', icon: '🔴', color: 'r' }
};

var TRACKS = [
  {
    id: 'dsa', title: 'DSA + Math for CS', short: 'DSA', icon: 'DSA', lang: 'java', code: 'required', dry: true,
    desc: 'From counting loop iterations to segment trees, max-flow and advanced DP — every pattern explained with analogies, visualizers and graded problems in Java.',
    modules: [
      ['B', 'Programming Foundations for DSA', 'Java syntax for problem solving, fast input/output (Scanner vs BufferedReader), primitive vs reference types, arrays and strings basics, methods, how memory/stack/heap and references work, reading constraints, writing your first brute-force solutions.'],
      ['B', 'Math Foundations & Time/Space Complexity', 'Counting loop iterations, Arithmetic & Geometric Progressions (AP/GP), logarithms as repeated division by 2, Big-O/Ω/Θ in plain English, space complexity and recursion stack, estimating TLE from constraints (10^8 ops/sec rule) with a constraint → allowed-complexity table.'],
      ['B', 'Number Theory & Modular Arithmetic', 'Factors in O(√N), prime check, Sieve of Eratosthenes, GCD & LCM (Euclidean algorithm with visual proof), modulo rules ((a+b)%m, (a-b+m)%m, (a*b)%m), fast modular exponentiation, nCr, Pascal’s triangle, Pigeonhole principle.'],
      ['B', 'Bit Manipulation', 'Binary representation, 2’s complement, & | ^ ~ << >> >>>, XOR properties, check/set/clear/toggle i-th bit, Brian Kernighan set-bit count, power of two, Single Number I/II/III, bitmask subset enumeration.'],
      ['B', 'Arrays, Prefix Sums & Carry Forward', '1D/2D arrays, range sum in O(1) via prefix sums, even/odd index prefix sums, carry forward (count pairs, leaders), Kadane’s algorithm, contribution technique (sum of all subarray sums), prefix/suffix max (trapping rain water), spiral traversal, rotate matrix, row-column sorted search, 2D prefix sums.'],
      ['B', 'Two Pointers & Sliding Window', 'Opposite-direction pointers (2-Sum sorted, 3-Sum, Container With Most Water), same-direction pointers (remove duplicates, move zeroes, pair difference K), fixed-size window (max sum of size K), variable-size window (smallest subarray with sum ≥ K) and the grow/shrink template.'],
      ['B', 'Sorting Algorithms & Intervals', 'Bubble/selection/insertion intuition, count sort & radix sort, merge sort + inversion count, quick sort partitioning (Lomuto/Hoare) + quickselect, custom comparators in Java, stability, merge overlapping intervals, insert interval, meeting rooms.'],
      ['I', 'Hashing Masterclass (HashSet & HashMap)', 'HashMap/HashSet internals (hash function, hashCode/equals, buckets, chaining, treeify, load factor, rehash, O(1) avg vs O(N) worst), frequency map (first non-repeating, anagrams), lookup set (2-Sum unsorted, distinct elements in every window), prefix sum + hashing (subarray sum 0, count subarrays sum K, longest subarray sum 0/K, equal 0s and 1s), sliding window + hashing (longest substring without repeats, minimum window substring), longest consecutive sequence.'],
      ['I', 'String Algorithms', 'Java strings (immutability, char arithmetic), palindromes, StringBuilder efficiency, longest palindromic substring (expand around center), polynomial rolling hash / Rabin-Karp, KMP with LPS array, Z-algorithm.'],
      ['I', 'Binary Search', 'Classic binary search (overflow-safe mid, invariants, templates), first & last occurrence (lower/upper bound), search in rotated sorted array, peak element, integer sqrt, binary search on answer space (Aggressive Cows, Painter’s Partition, Allocate Books, Koko bananas) and the monotonic feasibility idea.'],
      ['I', 'Recursion & Backtracking', 'Call stack frames, base/recursive case, recurrence trees and solving common recurrences, Tower of Hanoi, subsets/subsequences (pick/not-pick), permutations (swap and used[], duplicates), combination sum, N-Queens, Sudoku solver, the choose–explore–unchoose template.'],
      ['I', 'Linked Lists', 'Singly & doubly linked lists, insert/delete, dummy node trick, fast & slow pointers (Floyd cycle detection + cycle start, middle node), in-place reversal (iterative/recursive), K-group reversal, merge two sorted lists, remove Nth from end, LRU cache (HashMap + DLL).'],
      ['I', 'Stacks & Queues', 'Stack LIFO vs queue FIFO in Java (ArrayDeque), balanced parentheses, monotonic stack (next greater element, stock span, largest rectangle in histogram), min stack, queue using stacks, infix/postfix evaluation, monotonic deque (sliding window maximum).'],
      ['I', 'Trees & Binary Search Trees', 'Terminology, preorder/inorder/postorder (recursive + iterative), level order BFS, left/right/top/bottom views, height, diameter, balanced check, LCA (binary tree + BST), BST search/insert/delete, validate BST, k-th smallest in BST, construct from traversals.'],
      ['I', 'Heaps (PriorityQueue) & Tries', 'Min/max heap array representation, sift-up/sift-down, heapify O(N), heap sort, Java PriorityQueue + comparators, K largest/smallest, merge K sorted lists, running median (two heaps), Trie insert/search/prefix, maximum XOR pair with binary trie.'],
      ['A', 'Greedy Algorithms', 'Greedy choice property and exchange-argument proofs, activity selection, job sequencing with deadlines, fractional knapsack, Huffman coding, minimum platforms, gas station, jump game, when greedy fails (coin change counterexample).'],
      ['A', 'Dynamic Programming I', 'Overlapping subproblems + optimal substructure, memoization vs tabulation vs space optimization, climbing stairs, house robber, coin change (min coins + number of ways), 0/1 knapsack, unbounded knapsack, longest common subsequence, edit distance, grid paths (obstacles, min path sum).'],
      ['A', 'Dynamic Programming II', 'LIS in O(N^2) and O(N log N), partition DP (palindrome partitioning, word break), interval DP (matrix chain multiplication, burst balloons), DP on trees (house robber III, max path sum), state-machine DP (buy/sell stock with cooldown/fee/k transactions), DP on subsequences/strings patterns.'],
      ['A', 'Graphs I: Traversals, Cycles, Topological Sort & DSU', 'Adjacency matrix vs list, BFS (shortest path in unweighted graph, multi-source BFS rotten oranges), DFS (connected components, islands), cycle detection undirected/directed, bipartite coloring, topological sort (Kahn + DFS), Disjoint Set Union with path compression and union by rank.'],
      ['A', 'Graphs II: Shortest Paths & Minimum Spanning Trees', 'Dijkstra with PriorityQueue, 0-1 BFS, Bellman-Ford with negative cycle detection, Floyd-Warshall, Prim’s MST, Kruskal’s MST with DSU, shortest-path variants (K stops, min effort, multi-criteria).'],
      ['E', 'Range Query Data Structures', 'Segment tree (build, point update, range query, lazy propagation for range updates), Fenwick tree / BIT, sparse table for RMQ, sqrt decomposition, Mo’s algorithm for offline queries, choosing the right structure.'],
      ['E', 'Advanced Graph Algorithms', 'Strongly connected components (Kosaraju, Tarjan), bridges & articulation points (low-link), Euler path/circuit (Hierholzer), LCA with binary lifting, max flow (Ford-Fulkerson, Edmonds-Karp, Dinic), min cut, bipartite matching.'],
      ['E', 'Advanced Dynamic Programming', 'Bitmask DP (TSP, assignment), digit DP, probability & expected-value DP, DP with data structures, DP optimizations (convex hull trick, divide & conquer optimization, Knuth optimization), SOS DP intro.'],
      ['E', 'Advanced String Algorithms', 'Manacher’s algorithm, suffix array + LCP (Kasai), Aho-Corasick multi-pattern search, double hashing and anti-hash tests, suffix automaton intro, applications (distinct substrings, longest repeated substring).'],
      ['E', 'Advanced Mathematics for Algorithms', 'Extended Euclid, modular inverse (Fermat + ext. Euclid), Euler’s totient, Chinese Remainder Theorem, matrix exponentiation (Fibonacci in log N), inclusion-exclusion, Catalan numbers, Lucas theorem, probability basics, game theory (Nim, Sprague-Grundy).'],
      ['E', 'Geometry, Randomized & Amortized Analysis', 'Orientation/cross product, segment intersection, convex hull (Graham/Andrew monotone chain), polygon area (shoelace), reservoir sampling, randomized quickselect/shuffle, amortized analysis (dynamic array, union-find, monotonic stack), skip lists.'],
      ['E', 'Real-World Data Structure Design', 'LFU cache, LRU variants, skip list, Bloom filter, consistent-hash ring, time-based key-value store, design iterators (peeking, flatten), hit counter, autocomplete system — trade-offs and complexity.'],
      ['E', 'Interview Mastery: Pattern Recognition & Mock Rounds', 'Master pattern map (clue → technique), how to approach an unseen problem, mixed timed problem sets, debugging under pressure, communicating trade-offs, common mistakes, final revision checklists.']
    ]
  },
  {
    id: 'java', title: 'Java', short: 'Java', icon: 'JAVA', lang: 'java', code: 'required', dry: true,
    desc: 'Java from first program to JVM internals, concurrency and modern Java 21 — with output-prediction questions interviewers love.',
    modules: [
      ['B', 'JDK, JRE, JVM & Java Basics', 'Installing JDK, compile vs run (javac/java), JDK vs JRE vs JVM, main method, primitive types and ranges, type casting, operators, integer overflow, char/Unicode.'],
      ['B', 'Control Flow, Methods, Arrays & String Basics', 'if/switch (incl. switch expressions), loops, break/continue/labels, methods and pass-by-value, overloading, varargs, 1D/2D arrays, Arrays utility, basic String methods.'],
      ['B', 'Classes, Objects, Constructors, static & this', 'Defining classes, object creation and references, constructors and chaining, this, static fields/methods/blocks, initialization order, access modifiers, packages.'],
      ['B', 'OOP Pillars in Java', 'Encapsulation, inheritance, super, method overriding rules, polymorphism (compile-time vs runtime), abstract classes, interfaces (default/static methods), final, composition vs inheritance, Object class methods.'],
      ['I', 'Strings Deep Dive, Wrapper Classes, equals & hashCode', 'String immutability and pool, ==, equals, intern, StringBuilder vs StringBuffer, wrapper classes, autoboxing/unboxing pitfalls (Integer cache), equals/hashCode contract, Comparable vs Comparator.'],
      ['I', 'Exceptions, Files & I/O', 'Exception hierarchy, checked vs unchecked, try/catch/finally, try-with-resources, custom exceptions, best practices, java.io vs java.nio, reading/writing files, serialization basics.'],
      ['I', 'Collections Framework in Practice', 'List/Set/Map/Queue/Deque hierarchy, ArrayList vs LinkedList, HashSet/LinkedHashSet/TreeSet, HashMap/LinkedHashMap/TreeMap, PriorityQueue, ArrayDeque, iterators and fail-fast, Collections utilities, choosing the right collection.'],
      ['I', 'Generics', 'Generic classes/methods, bounded types, wildcards (? extends / ? super, PECS), type erasure and its consequences, generic arrays, raw types.'],
      ['I', 'Lambdas, Streams & Optional', 'Functional interfaces, lambdas, method references, Stream API (map/filter/reduce/collect/groupingBy/flatMap), lazy evaluation, parallel streams caveats, Optional best practices.'],
      ['A', 'Collections Internals', 'ArrayList growth, HashMap internals (hashing, buckets, resize, treeification), LinkedHashMap access order (LRU), TreeMap red-black tree, PriorityQueue binary heap, ConcurrentHashMap design, CopyOnWriteArrayList.'],
      ['A', 'Concurrency I: Threads & the Java Memory Model', 'Thread lifecycle, Runnable vs Thread, synchronized and intrinsic locks, volatile, happens-before, visibility vs atomicity, wait/notify, race conditions, deadlock/livelock/starvation.'],
      ['A', 'Concurrency II: java.util.concurrent', 'ExecutorService and thread pools, Callable/Future, ReentrantLock/ReadWriteLock, Semaphore/CountDownLatch/CyclicBarrier, atomics and CAS, BlockingQueue producer-consumer, CompletableFuture, virtual threads (Java 21).'],
      ['E', 'JVM Internals & Performance', 'Class loading and delegation, bytecode basics, JIT (C1/C2, inlining, escape analysis), memory areas (heap, stack, metaspace), GC algorithms (Serial, Parallel, G1, ZGC), GC tuning, memory leaks, profiling tools (jstack, jmap, JFR).'],
      ['E', 'Modern & Expert Java + Output Question Bank', 'Java 17–21 features (records, sealed classes, pattern matching, text blocks, switch patterns), reflection, annotations and processors, JPMS modules, JMH benchmarking, tricky output-prediction questions.']
    ]
  },
  {
    id: 'py', title: 'Python', short: 'Python', icon: 'PY', lang: 'python', code: 'required', dry: true,
    desc: 'Python from basics to CPython internals, asyncio and interview-grade idioms — runnable examples in your browser.',
    modules: [
      ['B', 'Python Setup, Syntax, Types & I/O', 'Installing Python, REPL, variables as names bound to objects, int/float/str/bool/None, dynamic typing, input/print/f-strings, operators, integer precision.'],
      ['B', 'Control Flow, Functions & Core Collections', 'if/for/while, range, enumerate/zip, functions, default and keyword args, lists/tuples/dicts/sets basics, slicing, unpacking.'],
      ['B', 'Strings, Files, Modules & Packages', 'String methods and formatting, bytes vs str, reading/writing files, with statement, modules, packages, __name__ == "__main__", pip and virtual environments.'],
      ['B', 'OOP Basics in Python', 'Classes, __init__, self, instance vs class attributes, methods, inheritance, super(), polymorphism and duck typing, @staticmethod/@classmethod.'],
      ['I', 'Data Structure Internals & Comprehensions', 'list (dynamic array) costs, dict/set hash tables (ordering, collisions), tuple immutability, comprehensions (list/dict/set/generator), copying (shallow vs deep), Big-O of common operations.'],
      ['I', 'Closures, Decorators & functools', 'First-class functions, scopes (LEGB), closures, nonlocal, *args/**kwargs, decorators with arguments, functools.wraps/partial/lru_cache/reduce.'],
      ['I', 'Iterators, Generators & Context Managers', 'Iterable vs iterator protocol, generators and yield, yield from, generator pipelines, itertools, context managers (__enter__/__exit__, contextlib).'],
      ['I', 'Advanced OOP: Dunder Methods, MRO & Dataclasses', 'Magic methods (__repr__, __eq__, __hash__, __lt__, __len__, __getitem__), operator overloading, MRO and C3 linearization, properties, dataclasses, ABCs, __slots__.'],
      ['I', 'Errors, Type Hints & Testing', 'Exception hierarchy, raising and custom exceptions, EAFP vs LBYL, type hints, typing module, mypy, unittest vs pytest, fixtures and mocking.'],
      ['A', 'Concurrency: GIL, Threads, Processes & asyncio', 'The GIL and why, threading for I/O, multiprocessing for CPU, concurrent.futures, asyncio event loop, async/await, tasks, gather, async pitfalls.'],
      ['A', 'Python Interview Toolkit & Pythonic DSA', 'collections (Counter, defaultdict, deque, OrderedDict), heapq, bisect, itertools, functools.lru_cache, sorting with keys, recursion limits, idiomatic DSA solutions in Python.'],
      ['E', 'CPython Internals', 'Bytecode and dis, the evaluation loop, object model (PyObject), reference counting, cyclic GC, small-int and string interning, descriptors, metaclasses, import system.'],
      ['E', 'Performance & Expert Python + Gotchas Bank', 'Profiling (cProfile, timeit), vectorization with NumPy, memory optimization, C extensions/Cython/PyPy overview, packaging (pyproject), mutable default args and other gotchas, output-prediction questions.']
    ]
  },
  {
    id: 'js', title: 'JavaScript & TypeScript', short: 'JS / TS', icon: 'JS', lang: 'js', code: 'required', dry: true,
    desc: 'JavaScript from zero to engine internals plus TypeScript type-level mastery — run JS snippets live and conquer polyfill/machine-coding rounds.',
    modules: [
      ['B', 'JavaScript Basics: Syntax, Types & Operators', 'Running JS (browser console, Node), let/const/var basics, primitive types, typeof, strings/template literals, numbers and NaN/Infinity, operators, truthy/falsy, control flow.'],
      ['B', 'Functions, Arrays & Objects', 'Function declarations/expressions/arrows, parameters/default/rest, arrays and core methods (push, slice, splice, map, filter, reduce, find, sort), objects, destructuring, spread, JSON.'],
      ['B', 'JavaScript Runtimes: Browser vs Node', 'What a JS engine and runtime are, browser APIs vs Node APIs, the global object, script vs module, npm basics, debugging with DevTools.'],
      ['I', 'Scope, Hoisting, TDZ & Closures', 'Global/function/block scope, lexical scope, hoisting of var/function/let/const, temporal dead zone, closures and practical uses (counters, memoize, once), closure-in-loop bug.'],
      ['I', 'this, call/apply/bind & Arrow Functions', 'The 4 binding rules of this (default, implicit, explicit, new), arrow functions and lexical this, call/apply/bind, losing this in callbacks, strict mode.'],
      ['I', 'Prototypes, Classes & Inheritance', 'Prototype chain, __proto__ vs prototype, Object.create, constructor functions, ES6 classes, extends/super, private fields, static members, instanceof.'],
      ['I', 'Async I: Callbacks & Promises', 'Synchronous vs asynchronous, callbacks and callback hell, Promise states, then/catch/finally chaining, Promise.all/allSettled/race/any, error propagation.'],
      ['I', 'Async II: Event Loop, Microtasks & async/await', 'Call stack, Web APIs, task (macrotask) queue, microtask queue, event loop order, setTimeout vs Promise vs queueMicrotask, async/await under the hood, error handling, output-order puzzles.'],
      ['I', 'Modern JS: Modules, Iterators, Generators, Map/Set, Proxy', 'ES modules vs CommonJS, iterators and Symbol.iterator, generators, Map/Set/WeakMap/WeakSet, Symbol, Proxy and Reflect, optional chaining, nullish coalescing.'],
      ['A', 'TypeScript Fundamentals', 'Why TypeScript, type annotations and inference, interfaces vs type aliases, unions/intersections, literal types, narrowing and type guards, enums, generics basics, tsconfig and strict mode.'],
      ['A', 'Advanced TypeScript: Type-Level Programming', 'Generic constraints, keyof/typeof/indexed access, conditional types and infer, mapped types, template literal types, utility types (Partial, Pick, Omit, Record, ReturnType) and implementing them, declaration files.'],
      ['A', 'JS Engine Internals: V8, Memory & GC', 'Parsing, Ignition interpreter and TurboFan JIT, hidden classes and inline caches, deoptimization, heap/stack, generational garbage collection, common memory leaks and how to find them.'],
      ['E', 'Functional Programming, Patterns & Performance in JS', 'Pure functions, immutability, composition/pipe, currying, memoization, module/observer/singleton/factory patterns in JS, performance techniques (debounce vs throttle, avoiding layout thrash).'],
      ['E', 'Machine Coding & Polyfills + Output Question Bank', 'Polyfills (bind, call, map, filter, reduce, Promise.all, Promise.race), debounce, throttle, deep clone, deep equal, curry, flatten, event emitter, retry with backoff, LRU in JS, tricky output-based questions.']
    ]
  },
  {
    id: 'cpp', title: 'C++', short: 'C++', icon: 'C++', lang: 'cpp', code: 'required', dry: true,
    desc: 'C++ from compilation basics to move semantics, templates, memory ordering and expert idioms.',
    modules: [
      ['B', 'Compilation Model, Syntax, Types & I/O', 'Preprocessor/compiler/linker, header vs source, main, fundamental types and sizes, signed/unsigned, cin/cout and fast I/O, namespaces.'],
      ['B', 'Control Flow, Functions, Arrays & Strings', 'Conditions and loops, functions, pass by value/reference, default args, overloading, C arrays vs std::array/vector, std::string basics.'],
      ['B', 'Pointers & References', 'Addresses, pointers, pointer arithmetic, nullptr, references vs pointers, const pointers vs pointer to const, arrays decaying to pointers, dangling pointers.'],
      ['B', 'OOP Basics in C++', 'Classes and structs, access specifiers, constructors/destructors, initializer lists, this, static members, inheritance basics, friend.'],
      ['I', 'Advanced OOP: Rule of 3/5/0, Virtual & Operators', 'Copy constructor/assignment, destructor, rule of 3/5/0, shallow vs deep copy, virtual functions, vtables/vptr, pure virtual and abstract classes, virtual destructors, object slicing, operator overloading.'],
      ['I', 'Memory Management, RAII & Smart Pointers', 'Stack vs heap, new/delete, memory leaks, RAII, unique_ptr, shared_ptr (control block, ref count), weak_ptr and cycles, make_unique/make_shared, custom deleters.'],
      ['I', 'STL Containers', 'vector (capacity, reallocation, iterator invalidation), deque, list, set/map (red-black tree), unordered_set/unordered_map (hashing), priority_queue, stack/queue adapters, choosing containers.'],
      ['I', 'STL Algorithms, Iterators & Competitive Setup', 'Iterator categories, sort/stable_sort/custom comparators, lower_bound/upper_bound, accumulate, next_permutation, unique/erase idiom, lambdas in algorithms, competitive programming template.'],
      ['A', 'Templates, SFINAE & Concepts', 'Function/class templates, specialization, variadic templates, type traits, SFINAE and enable_if, C++20 concepts and requires clauses.'],
      ['A', 'Modern C++: Move Semantics to Ranges', 'lvalues/rvalues, rvalue references, std::move, move constructor/assignment, perfect forwarding, lambdas and captures, auto/decltype, constexpr, structured bindings, optional/variant/any, ranges.'],
      ['A', 'Concurrency in C++', 'std::thread, join/detach, mutex/lock_guard/unique_lock, condition_variable, atomics, memory orders (relaxed, acquire/release, seq_cst), data races, futures/async.'],
      ['E', 'Low-Level Performance & Undefined Behavior', 'Cache lines and locality, struct alignment/padding, branch prediction, inlining, compiler optimizations, undefined behavior catalogue, sanitizers, profiling.'],
      ['E', 'Expert Idioms + Question Bank', 'CRTP, pimpl, type erasure, copy-and-swap, RAII guards, coroutines (C++20) basics, ABI concerns, tricky interview questions and output prediction.']
    ]
  },
  {
    id: 'sql', title: 'SQL + DBMS', short: 'SQL', icon: 'SQL', lang: 'sql', code: 'required', dry: false,
    desc: 'SQL from your first SELECT to window functions, index internals, MVCC and distributed databases — with a live SQL playground in the browser.',
    modules: [
      ['B', 'Databases & the Relational Model', 'What a database/DBMS is, tables/rows/columns, keys (primary, foreign, candidate), relationships (1-1, 1-N, N-N), SQL language categories (DDL/DML/DQL/DCL/TCL), creating your first tables.'],
      ['B', 'SELECT, WHERE, ORDER BY, LIMIT & NULLs', 'Selecting columns, aliases, WHERE with comparison/logical operators, IN, BETWEEN, LIKE, IS NULL, three-valued logic, ORDER BY, LIMIT/OFFSET, DISTINCT, logical query processing order.'],
      ['B', 'Aggregates, GROUP BY, HAVING & CASE', 'COUNT/SUM/AVG/MIN/MAX, COUNT(*) vs COUNT(col), GROUP BY rules, HAVING vs WHERE, CASE expressions, conditional aggregation, COALESCE/NULLIF.'],
      ['B', 'JOINs', 'Inner, left, right, full outer, cross, self joins, join conditions vs filters, anti-join and semi-join (NOT EXISTS / EXISTS), joining multiple tables, duplicate-row pitfalls.'],
      ['I', 'Subqueries, CTEs & Recursive CTEs', 'Scalar/row/table subqueries, correlated subqueries, IN vs EXISTS, CTEs (WITH), recursive CTEs (hierarchies, number series), readability and performance.'],
      ['I', 'Window Functions', 'OVER/PARTITION BY/ORDER BY, ROW_NUMBER/RANK/DENSE_RANK, LAG/LEAD, running totals, moving averages, frames (ROWS vs RANGE), NTILE, FIRST_VALUE/LAST_VALUE, top-N per group.'],
      ['I', 'DDL, Constraints & ER Modelling', 'Data types, CREATE/ALTER/DROP, constraints (PK, FK, UNIQUE, CHECK, NOT NULL, DEFAULT), cascading actions, ER diagrams, modelling a real schema (e-commerce).'],
      ['I', 'Normalization & Denormalization', 'Anomalies, functional dependencies, 1NF, 2NF, 3NF, BCNF with worked decompositions, lossless join, when to denormalize, star schema basics.'],
      ['I', 'DML, UPSERT, Views, Procedures & Triggers', 'INSERT/UPDATE/DELETE patterns, INSERT ... ON CONFLICT (upsert), views and materialized views, stored procedures/functions, triggers, pros and cons.'],
      ['A', 'Index Internals', 'How a B+tree index works, clustered vs non-clustered, hash indexes, composite indexes and left-prefix rule, covering indexes, selectivity, when indexes hurt.'],
      ['A', 'Query Execution & Optimization', 'Query planner, EXPLAIN / EXPLAIN QUERY PLAN, scans vs seeks, join algorithms (nested loop, hash, merge), statistics, sargable predicates, query rewriting.'],
      ['A', 'Transactions, Isolation & Concurrency Control', 'ACID, isolation levels (read uncommitted → serializable), anomalies (dirty read, non-repeatable read, phantom, lost update, write skew), locking (2PL, row/table locks), MVCC, deadlocks.'],
      ['E', 'Storage Engines Internals', 'Pages and records, buffer pool, write-ahead log and recovery (ARIES idea), B-tree vs LSM-tree (memtable, SSTables, compaction), InnoDB vs RocksDB, column stores.'],
      ['E', 'Distributed Databases & NoSQL', 'Replication (leader-follower, multi-leader, leaderless), sharding strategies, NoSQL families (document, key-value, wide-column, graph), CAP/PACELC in practice, NewSQL (Spanner, CockroachDB), choosing a database.'],
      ['E', 'Hard SQL Interview Problem Bank', 'Nth highest salary, top-N per group, consecutive days/streaks, gaps & islands, sessionization, funnels and retention cohorts, median, pivot/unpivot, recursive hierarchy queries, duplicate removal.']
    ]
  },
  {
    id: 'lld', title: 'Low-Level Design', short: 'LLD', icon: 'LLD', lang: 'java', code: 'required', dry: false,
    desc: 'Object-oriented design from SOLID to design patterns and full machine-coding case studies (Parking Lot, BookMyShow, Splitwise, Elevator, Chess…).',
    modules: [
      ['B', 'OOP Modelling & UML', 'Thinking in objects, identifying entities/attributes/behaviours from requirements, class relationships (association, aggregation, composition, inheritance), UML class and sequence diagrams.'],
      ['B', 'SOLID Principles', 'Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion — each with a bad design, the smell, and a refactored Java design.'],
      ['B', 'Clean Code & Design Principles', 'DRY, KISS, YAGNI, composition over inheritance, coupling vs cohesion, Law of Demeter, naming, small functions, code smells and refactoring.'],
      ['I', 'Creational Design Patterns', 'Singleton (thread-safe variants), Factory Method, Abstract Factory, Builder, Prototype, Object Pool — when to use, Java implementations, pitfalls.'],
      ['I', 'Structural Design Patterns', 'Adapter, Decorator, Facade, Proxy, Composite, Bridge, Flyweight — with real-world examples and Java code.'],
      ['I', 'Behavioral Design Patterns', 'Strategy, Observer, Command, State, Template Method, Chain of Responsibility, Iterator, Mediator, Memento, Visitor.'],
      ['I', 'LLD Interview Framework: Parking Lot & Tic-Tac-Toe', 'Clarifying requirements, identifying entities, defining APIs, class diagram, choosing patterns, writing extensible code; full Parking Lot and Tic-Tac-Toe designs.'],
      ['A', 'Case Studies: BookMyShow, Splitwise, Library Management', 'Seat booking with concurrency, expense splitting and simplification of debts, library lending rules — full class designs and core code.'],
      ['A', 'State-Heavy Designs: Elevator, Vending Machine, ATM', 'State pattern in depth, elevator scheduling strategies, vending machine states and inventory, ATM transaction flows.'],
      ['A', 'Concurrency in LLD', 'Thread-safe designs, synchronized collections, rate limiter (token bucket, sliding window) implementation, producer-consumer, thread-safe LRU/LFU cache, concurrent booking.'],
      ['E', 'Extensible Architecture & DDD Tactical Patterns', 'Plugin architectures, dependency injection, hexagonal architecture at class level, DDD entities/value objects/aggregates/repositories/domain events, event sourcing in code.'],
      ['E', 'Expert Case Studies: Logger, Pub-Sub, Chess, KV Store', 'Logging framework (levels, appenders, chain of responsibility), Kafka-like pub-sub queue, Chess (move validation), in-memory key-value store with transactions and TTL.']
    ]
  },
  {
    id: 'hld', title: 'High-Level System Design', short: 'HLD', icon: 'HLD', lang: 'text', code: 'optional', dry: false,
    desc: 'System design from client-server basics to consensus, distributed storage and 16 expert case studies — animated request flows for every concept.',
    modules: [
      ['B', 'What is System Design? Client-Server & Request Flow', 'Clients, servers, IP/DNS at a glance, request/response lifecycle, monolith basics, functional vs non-functional requirements, latency vs throughput, availability.'],
      ['B', 'Scalability Basics', 'Vertical vs horizontal scaling, stateless services, session handling, load balancers (round robin, least connections), single points of failure, read replicas intro.'],
      ['B', 'Estimation & the HLD Interview Framework', 'Back-of-envelope math (QPS, storage, bandwidth, powers of 2, latency numbers), requirements → API → data model → high-level design → deep dives → trade-offs.'],
      ['I', 'DNS, CDN, Proxies & Load Balancing', 'DNS resolution and caching, CDN push vs pull, forward vs reverse proxy, L4 vs L7 load balancers, health checks, sticky sessions, global load balancing.'],
      ['I', 'Databases at Scale: Choice, Replication & Sharding', 'SQL vs NoSQL decision, replication (sync/async), read replicas, partitioning (range, hash, list), sharding challenges (hot keys, resharding, cross-shard queries).'],
      ['I', 'Caching', 'Cache-aside, read/write-through, write-back, eviction (LRU/LFU/TTL), Redis/Memcached, cache invalidation, thundering herd/stampede, cache penetration, multi-level caches.'],
      ['I', 'Consistent Hashing & Data Distribution', 'Why modulo hashing breaks, hash ring, virtual nodes, replication on the ring, rendezvous hashing, real uses (Dynamo, Cassandra, CDNs).'],
      ['I', 'Messaging & Streaming', 'Queues vs pub/sub, Kafka architecture (topics, partitions, consumer groups, offsets), delivery guarantees, ordering, dead-letter queues, backpressure, event-driven design.'],
      ['I', 'APIs, Gateways & Rate Limiting', 'REST vs gRPC vs GraphQL vs WebSockets/SSE, API gateway responsibilities, rate-limiting algorithms (token bucket, leaky bucket, fixed/sliding window), pagination, idempotency keys.'],
      ['A', 'Distributed Systems Theory', 'CAP and PACELC, consistency models (strong, linearizable, eventual, causal, read-your-writes), quorums (R+W>N), vector clocks, gossip protocols, failure detection.'],
      ['A', 'Consensus, Coordination & Distributed Transactions', 'Raft (leader election, log replication), Paxos intuition, ZooKeeper/etcd, distributed locks and fencing tokens, 2PC/3PC, sagas, outbox, exactly-once myths.'],
      ['A', 'Reliability & Observability', 'Redundancy, failover, timeouts, retries with exponential backoff + jitter, circuit breakers, bulkheads, SLIs/SLOs/error budgets, logs/metrics/traces, chaos engineering.'],
      ['A', 'Storage & Data Processing Systems', 'Blob/object storage, search engines (inverted index, Elasticsearch), time-series databases, data warehouses/lakes, batch (MapReduce/Spark) vs stream processing (Flink), lambda/kappa architecture.'],
      ['E', 'Case Studies I: URL Shortener, Pastebin, Rate Limiter, Notifications, KV Store', 'Full designs with requirements, estimates, APIs, data models, architecture diagrams, deep dives and trade-offs.'],
      ['E', 'Case Studies II: WhatsApp, News Feed, Instagram, YouTube/Netflix, Google Drive', 'Real-time messaging, fan-out on write vs read, media storage and transcoding, adaptive streaming, file sync and chunking.'],
      ['E', 'Case Studies III: Uber, Google Maps, Ticket Booking, Payments, Autocomplete, Ad Click Aggregator', 'Geospatial indexing (geohash, quadtree), routing, seat-locking at scale, payment idempotency and ledgers, typeahead with tries, streaming aggregation.']
    ]
  },
  {
    id: 'fe', title: 'Frontend Engineering', short: 'Frontend', icon: 'FE', lang: 'js', code: 'required', dry: false,
    desc: 'HTML, CSS, DOM and React from first page to Fiber internals, performance, security and frontend system design.',
    modules: [
      ['B', 'How the Web Works', 'Browsers, servers, URLs, HTTP request/response, HTML/CSS/JS roles, how a page loads, DevTools tour.'],
      ['B', 'HTML Fundamentals', 'Document structure, semantic elements, forms and inputs, links/images/media, tables, meta tags and SEO basics, validation.'],
      ['B', 'CSS Basics', 'Selectors, cascade, specificity, inheritance, box model, units, colors and typography, display/inline/block, basic positioning.'],
      ['B', 'DOM & Events', 'DOM tree, querying and manipulating elements, events, bubbling and capturing, event delegation, preventDefault/stopPropagation, forms handling.'],
      ['I', 'CSS Layout Mastery & Responsive Design', 'Flexbox in depth, CSS Grid in depth, positioning and stacking context (z-index), media queries, mobile-first, transitions and animations, CSS variables.'],
      ['I', 'Accessibility (a11y)', 'Why accessibility matters, semantic HTML first, ARIA roles/states, keyboard navigation and focus management, color contrast, screen readers, WCAG basics.'],
      ['I', 'Browser APIs, Storage & Networking', 'fetch and AbortController, localStorage/sessionStorage/IndexedDB/cookies, Intersection/Mutation/Resize Observers, Web Workers, history API.'],
      ['I', 'React Fundamentals', 'Components, JSX, props, state, rendering and re-rendering, lists and keys, conditional rendering, controlled forms, lifting state up, composition.'],
      ['I', 'React Hooks Deep Dive', 'useState, useEffect (dependencies, cleanup), useRef, useMemo, useCallback, useReducer, useContext, custom hooks, rules of hooks, stale closures.'],
      ['I', 'State Management & Data Fetching', 'Local vs global vs server state, Context pitfalls, Redux Toolkit, Zustand, React Query/SWR (caching, invalidation), optimistic updates, form libraries.'],
      ['A', 'Rendering Pipeline & Web Performance', 'Critical rendering path, DOM/CSSOM/render tree, layout/paint/composite, reflow vs repaint, Core Web Vitals (LCP, INP, CLS), code splitting, lazy loading, image optimization, virtualization.'],
      ['A', 'React Internals & Rendering Strategies', 'Virtual DOM and reconciliation, Fiber architecture, batching, concurrent rendering, Suspense, transitions, Server Components, CSR vs SSR vs SSG vs ISR (Next.js), hydration.'],
      ['A', 'Frontend Security & Networking', 'Same-origin policy, CORS, cookies (SameSite, HttpOnly, Secure), XSS (stored/reflected/DOM) and prevention, CSRF, CSP, clickjacking, auth token storage, HTTPS/HTTP2/3 for FE.'],
      ['A', 'Tooling, Build & Testing', 'npm/pnpm, bundlers (webpack, Vite, esbuild), transpiling, tree shaking, TypeScript in FE, linting/formatting, unit tests (Jest/Vitest), React Testing Library, E2E (Playwright), CI.'],
      ['E', 'Frontend Architecture at Scale', 'Micro-frontends, module federation, design systems and component libraries, monorepos, PWAs and service workers, offline-first, internationalization, feature flags.'],
      ['E', 'Frontend System Design & Machine Coding', 'Framework (requirements, components, state, API, performance, a11y), designs: autocomplete, infinite news feed, image carousel, chat UI, Google Sheets-like grid; machine-coding round strategy.']
    ]
  },
  {
    id: 'be', title: 'Backend Engineering', short: 'Backend', icon: 'BE', lang: 'java', code: 'optional', dry: false,
    desc: 'Backend from your first REST API to microservices, Kubernetes, cloud, security and production excellence (Spring Boot, Node.js and Python with FastAPI).',
    modules: [
      ['B', 'How Backends Work & HTTP Basics', 'Client-server, what a backend does, HTTP methods/status codes/headers, JSON, statelessness, web servers vs app servers.'],
      ['B', 'Your First REST API (Spring Boot & Node.js)', 'Project setup, routing/controllers, request/response bodies, validation, error handling, layered architecture (controller-service-repository), testing with curl/Postman.'],
      ['B', 'Databases from Code: CRUD & ORM Basics', 'Connecting to a database, SQL from code, prepared statements and SQL injection, ORM basics (JPA/Hibernate, Prisma/Sequelize), entities and repositories.'],
      ['I', 'HTTP Deep Dive & API Design', 'REST resource modelling, idempotency, PUT vs PATCH, status code choice, versioning, pagination/filtering/sorting, HATEOAS, OpenAPI, caching headers (ETag, Cache-Control).'],
      ['I', 'Authentication & Authorization', 'Password hashing (bcrypt/argon2), sessions vs JWT, refresh tokens, OAuth2 flows, OpenID Connect, SSO, RBAC/ABAC, API keys, MFA.'],
      ['I', 'Spring Boot Deep Dive', 'IoC/DI, bean scopes and lifecycle, auto-configuration, AOP, Spring MVC request flow, Spring Data JPA, @Transactional propagation and pitfalls, profiles and configuration.'],
      ['I', 'Node.js Deep Dive', 'Event loop phases in Node, libuv thread pool, streams and backpressure, EventEmitter, clustering, worker threads, Express/Fastify middleware, error handling.'],
      ['I', 'Data Access Patterns', 'N+1 queries, eager vs lazy loading, connection pooling (HikariCP), migrations (Flyway/Liquibase), pagination (offset vs keyset), optimistic vs pessimistic locking, read replicas from code.'],
      ['A', 'Caching & Asynchronous Processing', 'Redis data structures and patterns, cache invalidation in apps, message queues (RabbitMQ, Kafka, SQS) from code, background jobs, retries, idempotent consumers, scheduled jobs.'],
      ['A', 'Microservices Patterns', 'Decomposition, API gateway, service discovery, synchronous (REST/gRPC) vs async communication, saga, transactional outbox, CQRS, event sourcing, service mesh.'],
      ['A', 'Testing & Architecture', 'Test pyramid, unit/integration/contract/E2E tests, mocking, Testcontainers, clean architecture, hexagonal (ports & adapters), DDD strategic patterns (bounded contexts).'],
      ['A', 'Performance & Scalability Engineering', 'Profiling, thread pools and concurrency, async/non-blocking I/O, backpressure, load testing, connection limits, horizontal scaling, graceful degradation.'],
      ['E', 'DevOps: Docker, Kubernetes, CI/CD & IaC', 'Containers and images, Dockerfile best practices, Kubernetes (pods, deployments, services, ingress, config/secrets, autoscaling), CI/CD pipelines, blue-green/canary, Terraform basics.'],
      ['E', 'Cloud Architecture', 'AWS core (EC2, S3, RDS, DynamoDB, SQS/SNS, Lambda, API Gateway, VPC, IAM), serverless trade-offs, multi-AZ/multi-region, cost awareness, well-architected pillars.'],
      ['E', 'Security Engineering', 'OWASP Top 10 in depth, input validation, secrets management, TLS/mTLS, zero trust, rate limiting/abuse prevention, supply-chain security, audit logging.'],
      ['E', 'Observability & Production Excellence', 'Structured logging, metrics (RED/USE), distributed tracing (OpenTelemetry), alerting, incident response, postmortems, SRE practices, feature flags and safe deploys.'],
      ['I', 'Python Backend I: FastAPI Fundamentals', 'Project layout, routing, path/query/body parameters, Pydantic models and validation, response models, status codes and error handlers, dependency injection, async vs sync endpoints, OpenAPI docs, running with Uvicorn.'],
      ['I', 'Python Backend II: Databases with SQLAlchemy & Alembic', 'Engine, sessions and the unit of work, ORM models and relationships, queries in SQLAlchemy 2.0 style, N+1 and eager loading, transactions, Alembic migrations, connection pooling, repository pattern, async database access.'],
      ['I', 'Python Backend III: Auth, Security & Configuration', 'Password hashing (argon2/bcrypt), OAuth2 password flow with JWT in FastAPI, scopes and roles, CORS, settings from environment with pydantic-settings, secrets handling, rate limiting, input validation and the OWASP checks for Python APIs.'],
      ['A', 'Python Backend IV: Testing & Quality for APIs', 'pytest fixtures and parametrize, TestClient and httpx AsyncClient, test databases and transactions per test, factories, mocking external services, contract tests, coverage, type checking with mypy, linting and formatting with ruff, CI pipelines.'],
      ['A', 'Python Backend V: Async Workers, Caching & Deployment', 'Background tasks, task queues (Celery, RQ, arq), Redis caching patterns, idempotent jobs and retries, Docker images for Python apps, Gunicorn/Uvicorn workers, structured logging and metrics, Django overview and when to choose it.'],
    ]
  },
  {
    id: 'ai', title: 'GenAI & Working With AI', short: 'GenAI', icon: 'AI', lang: 'python', code: 'optional', dry: false,
    desc: 'From “what is AI?” to transformer internals, RAG, agents, fine-tuning, LLMOps — and how to thrive as an engineer alongside AI.',
    modules: [
      ['B', 'AI, ML, Deep Learning & GenAI in Plain English', 'History and definitions, supervised/unsupervised/reinforcement learning, what a model is, training vs inference, what generative AI does, limits and myths.'],
      ['B', 'Using AI Tools Effectively', 'Chat assistants and coding assistants, good vs bad prompts, iterating with AI, verifying outputs, privacy and company policies, AI for learning DSA and system design.'],
      ['B', 'Math & Python for AI', 'Vectors, dot product, matrices, matrix multiplication intuition, probability and distributions, softmax, NumPy basics, data handling with pandas.'],
      ['I', 'Machine Learning Foundations', 'Features and labels, train/validation/test, loss functions, gradient descent intuition, overfitting/underfitting, regularization, evaluation metrics (accuracy, precision, recall, F1, ROC).'],
      ['I', 'Neural Networks & Deep Learning Basics', 'Perceptron, layers and activations, forward pass, backpropagation intuition, optimizers, embeddings, CNN/RNN at a glance, why transformers won.'],
      ['I', 'How LLMs Work', 'Tokenization (BPE), embeddings, self-attention, transformer blocks, next-token prediction, pre-training vs instruction tuning, context window, temperature/top-p sampling.'],
      ['I', 'Prompt Engineering Deep Dive', 'System/user roles, zero/few-shot, chain-of-thought, structured output (JSON), delimiters, prompt templates, self-consistency, prompt chaining, evaluating prompts.'],
      ['I', 'Embeddings & Vector Databases', 'What embeddings capture, cosine similarity, semantic search, ANN indexes (HNSW, IVF), vector DBs (pgvector, Pinecone, FAISS), hybrid search.'],
      ['I', 'RAG End to End', 'Why RAG, ingestion and chunking strategies, embedding and indexing, retrieval, reranking, prompt assembly, citations, evaluating RAG (faithfulness, recall), advanced RAG patterns.'],
      ['I', 'MCP — Model Context Protocol', 'What MCP is and why it exists (the “USB-C for AI” idea), MCP vs plain function calling vs plugins, architecture (host, client, server), primitives (tools, resources, prompts) and client features (sampling, roots, elicitation), JSON-RPC messages and lifecycle (initialize, capability negotiation, list/call), transports (stdio vs Streamable HTTP), building an MCP server in Python and TypeScript SDKs, connecting servers to Claude/IDEs, real servers (GitHub, filesystem, databases), security (auth/OAuth, least privilege, tool poisoning and prompt injection, user consent), debugging with MCP Inspector.'],
      ['A', 'Agents, Tool Use & Multi-Agent Systems', 'Function/tool calling, ReAct loop, planning, memory, agents built on MCP servers, multi-agent orchestration, agent failure modes, evaluation of agents, human-in-the-loop.'],
      ['A', 'Fine-Tuning & Alignment', 'Prompting vs RAG vs fine-tuning decision, supervised fine-tuning, LoRA/QLoRA, RLHF and DPO intuition, dataset curation, catastrophic forgetting.'],
      ['A', 'Evaluation, Guardrails & AI Security', 'LLM evals (golden sets, LLM-as-judge), hallucination mitigation, guardrails, prompt injection and jailbreaks, data leakage, PII handling, responsible AI.'],
      ['A', 'LLM System Design & LLMOps', 'Designing a chatbot/RAG product at scale, model selection, latency and cost optimization, caching (semantic cache), streaming, rate limits, observability, A/B testing prompts.'],
      ['E', 'Transformer Internals Deep Dive', 'Attention math (Q, K, V, scaling, masking), multi-head attention, positional encodings (RoPE), KV cache, quantization, scaling laws, mixture of experts, long-context techniques.'],
      ['E', 'AI-Augmented Software Engineering', 'Working with coding agents day to day, spec-driven development, reviewing and testing AI-written code, AI for debugging/refactoring/docs, AI in interviews (what is allowed, what is tested), productivity without skill atrophy.'],
      ['E', 'The Future of Software Careers with AI', 'What gets automated vs what gains value, T-shaped skills, system thinking and product sense, ethics and regulation, building a learning habit, career roadmap for the next 5 years.'],
      ['B', 'Linear Algebra for Machine Learning', 'Vectors, dot products and cosine similarity, matrices as transformations, matrix multiplication, transpose and inverse, linear systems, eigenvectors intuition, SVD and PCA, how embeddings and attention use these ideas, all in plain Python.'],
      ['B', 'Probability & Statistics for Machine Learning', 'Random variables, distributions (Bernoulli, binomial, normal), expectation and variance, Bayes rule, conditional probability, sampling, confidence intervals, hypothesis tests and A/B tests, entropy and cross-entropy, softmax probabilities.'],
      ['I', 'Calculus & Optimization for Machine Learning', 'Derivatives and the chain rule, partial derivatives and gradients, gradient descent and learning rates, loss functions (MSE, cross-entropy), backpropagation by hand, momentum and Adam, overfitting and regularisation, convexity intuition.'],
    ]
  },
  {
    id: 'cs', title: 'CS Core: OS + Networks', short: 'CS Core', icon: 'CS', lang: 'cpp', code: 'optional', dry: false,
    desc: 'Operating systems and computer networks from first principles to containers, io_uring, QUIC and BGP.',
    modules: [
      ['B', 'What an Operating System Does', 'Role of the OS, kernel vs user mode, system calls, interrupts, booting, monolithic vs microkernel, OS services.'],
      ['B', 'Processes & Threads', 'Process vs program, PCB, process states, fork/exec, threads vs processes, user vs kernel threads, context switching cost, IPC basics.'],
      ['I', 'CPU Scheduling', 'Scheduling goals, FCFS, SJF/SRTF, priority, round robin, multilevel feedback queues, Gantt charts, waiting/turnaround time calculations, Linux CFS.'],
      ['I', 'Synchronization', 'Critical section, race conditions, Peterson’s solution, mutex, semaphores (binary/counting), monitors, producer-consumer, readers-writers, dining philosophers.'],
      ['I', 'Deadlocks', 'Coffman conditions, resource allocation graphs, prevention, avoidance (Banker’s algorithm), detection and recovery, livelock and starvation.'],
      ['I', 'Memory Management & Virtual Memory', 'Logical vs physical addresses, paging, page tables, TLB, segmentation, virtual memory and demand paging, page faults, page replacement (FIFO, LRU, Optimal), thrashing.'],
      ['A', 'File Systems, I/O & Storage', 'Files and directories, inodes, allocation methods, journaling, disk scheduling, RAID, buffering/caching, blocking vs non-blocking I/O, DMA.'],
      ['A', 'Linux Internals & Shell for Engineers', 'Processes and signals, permissions, file descriptors, pipes and redirection, essential commands, /proc, systemd, debugging tools (strace, top, lsof, netstat/ss).'],
      ['E', 'Containers, Virtualization & High-Performance I/O', 'Hypervisors, VMs vs containers, namespaces and cgroups, union filesystems, select/poll/epoll, io_uring, zero-copy.'],
      ['B', 'Networking Basics: OSI & TCP/IP', 'Why layers, OSI 7 layers vs TCP/IP 4 layers, encapsulation, devices (hub, switch, router), MAC vs IP, ports, packets and frames.'],
      ['I', 'IP Addressing, Subnetting, Routing & NAT', 'IPv4/IPv6, CIDR, subnet masks and subnet math, routing tables, static vs dynamic routing, ARP, DHCP, NAT and private IPs.'],
      ['I', 'TCP & UDP Deep Dive', 'UDP use-cases, TCP 3-way handshake and teardown, sequence/ack numbers, flow control (sliding window), congestion control (slow start, AIMD), retransmission, TIME_WAIT.'],
      ['A', 'Application Layer: HTTP, TLS, DNS, WebSockets', 'HTTP/1.1 vs HTTP/2 vs HTTP/3, keep-alive, TLS handshake and certificates, DNS resolution in depth, WebSockets/SSE, what happens when you type a URL.'],
      ['E', 'Advanced Networking: QUIC, BGP, Load Balancing & Security', 'QUIC internals, BGP and internet routing, anycast, load balancer internals (ECMP, consistent hashing), firewalls, VPNs, DDoS mitigation.']
    ]
  },
  {
    id: 'devops', title: 'Cloud & DevOps', short: 'DevOps', icon: 'OPS', lang: 'bash', code: 'optional', dry: false,
    desc: 'From Linux and networking to Terraform, Kubernetes, observability and multi-region architecture: the path from cloud support to DevOps, SRE and cloud architect roles.',
    modules: [
      ['B', 'Linux for the Cloud', 'Filesystem layout and navigation, permissions and ownership (chmod, chown, umask), users and groups, processes and services (ps, top, kill, systemctl), text tools (grep, sed, awk, cut, sort), package managers, SSH and keys.'],
      ['B', 'Bash Scripting for Operations', 'Variables, quoting, exit codes, conditionals and loops, functions, arguments, pipes and redirection, set -euo pipefail, traps, cron jobs, log rotation scripts, writing safe idempotent scripts.'],
      ['B', 'Networking for Cloud Engineers', 'TCP/IP model in practice, DNS records and resolution, HTTP/HTTPS and TLS certificates, ports, CIDR and subnet maths, public vs private networks, NAT, firewalls and security groups, troubleshooting with dig, curl, ss and traceroute.'],
      ['B', 'Git & Collaboration Workflows', 'Commits, branches, merging and rebasing, resolving conflicts, pull requests and code review, GitHub and GitLab basics, tags and releases, .gitignore and secrets hygiene, trunk-based vs Git flow.'],
      ['B', 'Cloud Fundamentals I: Compute & Storage', 'Regions and availability zones, the shared responsibility model, virtual machines (EC2, Azure VMs), images and instance types, object storage (S3, Blob), block vs file storage, pricing and the free tier, AWS first with Azure equivalents.'],
      ['B', 'Cloud Fundamentals II: Identity & Networks', 'IAM users, groups, roles and policies, least privilege, MFA and access keys, VPC/VNet design, subnets, route tables, internet and NAT gateways, security groups vs network ACLs, a two-tier network from scratch.'],
      ['I', 'Python for Automation', 'Scripts with argparse and logging, calling REST APIs, JSON and YAML handling, AWS automation with boto3 (pagination, waiters, error handling), idempotency, testing scripts, packaging a CLI, a short look at Go for tooling.'],
      ['I', 'Containers with Docker', 'Images vs containers, writing Dockerfiles, layers and caching, multi-stage builds, small and secure images, volumes and networks, docker-compose for local stacks, registries, debugging containers.'],
      ['I', 'Infrastructure as Code with Terraform', 'Declarative infrastructure, providers and resources, variables and outputs, state and remote backends with locking, plan and apply, modules, workspaces and environments, importing resources, drift and policy checks.'],
      ['I', 'Configuration Management with Ansible', 'Inventory, ad-hoc commands, playbooks, tasks and handlers, idempotent modules, variables and facts, templates with Jinja2, roles and Galaxy, vault for secrets, Ansible vs Terraform.'],
      ['I', 'CI/CD Pipelines', 'Continuous integration and delivery, GitHub Actions workflows, jobs and runners, caching and artifacts, GitLab CI and Jenkins equivalents, environments and approvals, blue-green and canary deploys, rollbacks, pipeline security.'],
      ['I', 'Managed Cloud Services', 'Managed databases (RDS/PostgreSQL), backups and read replicas, load balancers (ALB/NLB), auto-scaling groups and health checks, serverless functions (Lambda, Azure Functions), queues and events, choosing managed vs self-hosted.'],
      ['A', 'Kubernetes Core', 'Cluster architecture, Pods, ReplicaSets and Deployments, Services and Ingress controllers, ConfigMaps and Secrets, probes, resource requests and limits, namespaces, kubectl workflows, running locally with kind or minikube.'],
      ['A', 'Helm & Day-2 Kubernetes Operations', 'Helm charts, values and releases, upgrades and rollbacks, HorizontalPodAutoscaler, rolling updates, StatefulSets and persistent volumes, RBAC, network policies, cluster upgrades and troubleshooting.'],
      ['A', 'Observability & Monitoring', 'Metrics, logs and traces, Prometheus scraping and PromQL, Grafana dashboards, alerting rules and on-call, the ELK/EFK stack, OpenTelemetry, SLIs and SLOs, commercial tools such as Datadog.'],
      ['A', 'DevSecOps & Cloud Security', 'Secrets management with HashiCorp Vault, static analysis and dependency scanning in pipelines, container image scanning, least-privilege IAM design, security groups and network segmentation, audit logs, compliance basics.'],
      ['E', 'Advanced Cloud Architecture', 'Microservices on the cloud, service meshes (Istio), disaster recovery strategies (backup and restore, pilot light, warm standby, multi-site), RTO and RPO, multi-region deployments, cost optimisation, the Well-Architected Framework.'],
      ['E', 'SRE Practice & Capstone', 'Error budgets, incident response and postmortems, capacity planning, toil reduction, chaos engineering, a capstone that provisions and runs a three-tier app end to end, DevOps and SRE interview preparation.'],
    ]
  },
  {
    id: 'beh', title: 'Behavioral & Career', short: 'Behavioral', icon: 'BEH', lang: 'text', code: 'optional', dry: false,
    desc: 'Crack the rounds that are not about code: STAR stories, leadership principles, interview communication, senior-level signals and negotiation.',
    modules: [
      ['B', 'Interview Loops, Resume & the STAR Method', 'How product-company loops work (OA, phone screen, onsite rounds), what each round measures, resume that passes screening, LinkedIn, the STAR/CARL frameworks, building a story bank.'],
      ['B', 'Behavioral Bank I: Teamwork, Conflict & Failure', 'Tell me about yourself, conflict with a teammate, disagreement with manager, biggest failure, handling feedback — with weak vs strong sample answers.'],
      ['I', 'Behavioral Bank II: Leadership, Ownership & Ambiguity', 'Leadership without authority, ownership, dealing with ambiguity, prioritization, customer obsession, Amazon Leadership Principles mapping.'],
      ['I', 'Communication in Coding & Design Rounds', 'Clarifying questions, thinking aloud, stating brute force first, discussing trade-offs, testing your code, handling hints, time management, design-round communication.'],
      ['A', 'Senior & Staff-Level Interviews', 'Scope and impact signals, influence across teams, technical strategy stories, mentoring, handling production incidents, project retrospectives.'],
      ['E', 'Offers, Negotiation & Career Growth in the AI Era', 'Evaluating offers (base, bonus, equity), negotiation scripts, handling multiple offers, career ladders, staying relevant with AI, continuous learning plan.']
    ]
  }
];

(function () {
  TRACKS.forEach(function (t) {
    t.modules = t.modules.map(function (m, i) {
      return { id: t.id + (i + 1 < 10 ? '0' : '') + (i + 1), num: i + 1, level: m[0], title: m[1], scope: m[2] };
    });
  });
})();
