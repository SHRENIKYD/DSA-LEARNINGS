# Interview Mastery — Complete Curriculum (13 tracks · 118 modules)

## Every module contains
1. 🎯 **Learning-path header**: goals, prerequisites, estimated hours
2. ☕ **Old school, the real-world analogy first**: an everyday comparison, then a plain-English explanation with small numbers and tables
3. 🔍 **Clues in the question**: the phrases and constraints that tell you which technique to use
4. 🎬 **Step-by-step visualizers**: Previous / Next / Auto-Play / Reset, with a plain-English narrator for each step
5. 🧩 **Guided "solve it yourself" problems**: colour-coded example → brute force → "What would you do?" question → 3 progressive hints → full annotated solution, dry-run table and complexity
6. 🤖 **New school, working alongside AI**: what AI changes in this area, prompts that make AI a study partner, where AI goes wrong, and what you must still own yourself
7. 🏟 **Practice Arena**: 6–10 graded problems (Easy → Medium → Hard), each with 3 hints and a full solution

---

## Recommended learning path (≈ 26 weeks full / ≈ 12 weeks fast-track)
| Phase | Weeks | What to study |
|---|---|---|
| 0. Foundations | 1–3 | Pick **one** language track · DSA 1–3 (Math, Number Theory, Bits) · CS Core 1–2 |
| 1. Core DSA | 4–10 | DSA 4–12 (Arrays → Stacks & Queues) · SQL 1–5 |
| 2. Advanced DSA + Data | 11–15 | DSA 13–16 (Trees, Heaps, DP, Graphs) · SQL 6–10 · CS Core 3–8 |
| 3. Design | 16–20 | LLD 1–8 · HLD 1–10 |
| 4. Specialisation | 21–24 | Frontend **or** Backend · GenAI 1–10 (for everyone) |
| 5. Interview Ready | 25–26 | Behavioral 1–4 · mixed revision from the Practice Arenas · mock interviews |

---

## 1. DSA + Math for CS (Java) — 16 modules
**Part A: Math, Complexity & Bits**
1. **Math Foundations & Complexity**: counting loop iterations, AP/GP, logarithms as repeated halving, Big-O/Ω/Θ, space complexity, the 10⁸ ops/sec rule, constraint → allowed complexity
2. **Number Theory & Modular Arithmetic**: factors in O(√N), primes, Sieve of Eratosthenes, GCD/LCM (Euclid, with a visual proof), modulo rules, fast modular exponentiation, nCr, Pascal's triangle, pigeonhole principle
3. **Bit Manipulation**: binary, 2's complement, & | ^ ~ << >> >>>, XOR properties, check/set/clear/toggle bit i, Kernighan's trick, Single Number I/II/III, bitmask subsets

**Part B: Arrays, Two Pointers, Sliding Window & Sorting**

4. **Arrays, Prefix Sums & Carry Forward**: 1D/2D arrays, range sums in O(1), even/odd prefix sums, carry forward, Kadane's algorithm, contribution technique, prefix/suffix max (rainwater), spiral/rotate/sorted-matrix search, 2D prefix sums
5. **Two Pointers & Sliding Window**: 2-Sum sorted, 3-Sum, Container With Most Water, same-direction pointers, fixed and variable windows
6. **Sorting & Intervals**: bubble/selection/insertion, count & radix sort, merge sort and inversion count, quick sort and partitioning, Java comparators, stable vs unstable, merge intervals

**Part C: Hashing, Strings & Binary Search**

7. **Hashing Masterclass**: HashMap internals (buckets, collisions, load factor, treeify), frequency map, lookup set, prefix sum + hashing (sum 0/K, longest, equal 0s/1s), sliding window + hashing (longest unique substring, min window substring), longest consecutive sequence
8. **String Algorithms**: Java strings, palindromes, StringBuilder, longest palindromic substring, Rabin-Karp rolling hash, KMP/LPS, Z-algorithm
9. **Binary Search**: classic search, first/last occurrence, rotated array, peak element, sqrt, binary search on the answer (Aggressive Cows, Painter's Partition, Allocate Books)

**Part D: Recursion, Linked Lists, Stacks & Queues**

10. **Recursion & Backtracking**: call stack, recurrence trees, Tower of Hanoi, subsets, permutations, Combination Sum, N-Queens, Sudoku
11. **Linked Lists**: singly/doubly lists, dummy node, Floyd cycle detection, middle node, reversal and K-group reversal, merge two sorted lists, LRU cache
12. **Stacks & Queues**: LIFO/FIFO, balanced parentheses, monotonic stack (NGE, stock span, histogram), queue using stacks, min stack, monotonic deque (sliding window max)

**Part E: Trees, Heaps, Greedy, DP & Graphs**

13. **Trees & BST**: traversals (recursive and iterative), level order, views, height, diameter, balanced check, LCA, BST insert/delete/validate, k-th smallest
14. **Heaps & Tries**: heap array layout, sift up/down, heapify, PriorityQueue, K largest, merge K lists, running median, Trie, max XOR pair
15. **Greedy & DP**: activity selection, fractional knapsack, Huffman coding; memo vs tabulation vs space-optimised; Climbing Stairs, House Robber, Coin Change, LIS, 0/1 and unbounded knapsack, LCS, Edit Distance, grid paths, DP on trees and intervals
16. **Graphs**: adjacency matrix/list, BFS (shortest path, multi-source), DFS (components, cycles), bipartite, topological sort (Kahn/DFS), Dijkstra, Bellman-Ford, Floyd-Warshall, Prim, Kruskal, DSU

## 2. Java — 8 modules
1. JDK/JRE/JVM, compilation, data types, operators, control flow, arrays
2. OOP in Java: classes, constructors, inheritance, polymorphism, abstraction, interfaces, records, `static`/`final`
3. Strings & immutability, the string pool, `equals`/`hashCode` contract, wrapper classes, autoboxing pitfalls
4. Collections internals: ArrayList, LinkedList, HashMap, TreeMap, LinkedHashMap, PriorityQueue, ConcurrentHashMap, fail-fast iterators
5. Generics (bounded types, wildcards, type erasure), exceptions (checked vs unchecked, try-with-resources), I/O
6. Functional & modern Java: lambdas, streams, Optional, Java 17–21 (records, sealed classes, pattern matching, virtual threads)
7. Multithreading & concurrency: threads, `synchronized`, `volatile`, locks, executors, CompletableFuture, deadlocks, the Java Memory Model
8. JVM internals: heap/stack/metaspace, garbage collectors, class loading, JIT, performance tuning, plus an output-prediction question bank

## 3. Python — 8 modules
1. Python data model, variables as references, mutability, basic types, control flow
2. Built-in data structures: list/dict/set/tuple internals and costs, comprehensions, slicing
3. Functions: args/kwargs, closures, decorators, iterators, generators, `yield`
4. OOP: classes, dunder methods, inheritance and MRO, dataclasses, properties, ABCs
5. Errors, context managers, modules/packages, type hints, virtual environments and pip
6. Concurrency: the GIL, threading, multiprocessing, asyncio
7. Interview toolkit: `collections`, `heapq`, `bisect`, `itertools`, `functools.lru_cache`, DSA idioms in Python
8. Internals: reference counting, garbage collection, memory, mutable default arguments and other gotchas, plus an output-prediction question bank

## 4. JavaScript & TypeScript — 8 modules
1. Types, coercion, `==` vs `===`, var/let/const, hoisting, the temporal dead zone
2. Functions, scope, closures, `this`, call/apply/bind, arrow functions
3. Objects, prototypes and the prototype chain, classes, inheritance
4. Async: event loop, call stack, microtasks vs macrotasks, callbacks, promises, async/await
5. Array/object methods, immutability, ES6+ features, ES modules
6. TypeScript: types, interfaces, generics, narrowing, utility types, `tsconfig`
7. Advanced TypeScript & JS patterns: mapped/conditional types, module and observer patterns
8. Machine-coding classics: polyfills (bind, Promise.all, map/reduce), debounce/throttle, deep clone, curry, event emitter, plus output-based questions

## 5. C++ — 8 modules
1. Compilation model, types, memory layout, I/O, control flow
2. Pointers vs references, arrays, `const` correctness
3. OOP: constructors/destructors, rule of 3/5/0, virtual functions, vtables, multiple inheritance
4. Memory management: new/delete, RAII, smart pointers (unique/shared/weak)
5. STL for interviews: vector, deque, map/unordered_map, set, priority_queue, algorithms, iterators
6. Templates and generic programming
7. Modern C++: move semantics, rvalue references, lambdas, auto, constexpr, `std::optional`/`variant`
8. Concurrency (thread, mutex, atomic, condition_variable), undefined behaviour, plus a question bank

## 6. SQL + DBMS — 10 modules *(runnable SQL playground in the browser)*
1. Relational model, SELECT/WHERE/ORDER BY/LIMIT, NULL handling
2. Aggregates, GROUP BY, HAVING, CASE
3. JOINs: inner/left/right/full/cross/self, anti-joins
4. Subqueries, correlated subqueries, CTEs, recursive CTEs
5. Window functions: ROW_NUMBER, RANK, DENSE_RANK, LAG/LEAD, running totals, frames
6. DDL, constraints, keys, ER modelling, normalization (1NF → BCNF), denormalization
7. Indexing and query optimization: B-trees, composite indexes, covering indexes, EXPLAIN
8. Transactions: ACID, isolation levels and anomalies, locking, MVCC, deadlocks
9. NoSQL vs SQL, data modelling for document/KV/column/graph stores, replication, sharding
10. SQL interview bank: Nth highest salary, top-N per group, consecutive days, gaps & islands, pivoting, duplicates

## 7. Low-Level Design (Java) — 8 modules
1. OOP principles, UML class and sequence diagrams
2. SOLID with before/after code, DRY/KISS/YAGNI, composition over inheritance
3. Creational patterns: Singleton, Factory, Abstract Factory, Builder, Prototype
4. Structural patterns: Adapter, Decorator, Facade, Proxy, Composite, Bridge
5. Behavioral patterns: Strategy, Observer, Command, State, Template Method, Chain of Responsibility, Iterator
6. LLD interview framework, case study: Parking Lot
7. Case studies: BookMyShow, Elevator system, Splitwise
8. Concurrency in LLD (thread-safe singleton, rate limiter, producer-consumer), case studies: Vending Machine, Snake & Ladder

## 8. High-Level System Design — 10 modules
1. HLD interview framework, back-of-envelope estimation
2. DNS, CDN, load balancers, reverse proxies, L4 vs L7
3. Databases at scale: replication, partitioning, sharding, consistent hashing
4. Caching: strategies, eviction policies, Redis, invalidation, thundering herd
5. CAP/PACELC, consistency models, consensus (Raft), distributed IDs
6. Messaging: queues vs pub/sub, Kafka, event-driven design, delivery guarantees
7. API design (REST/gRPC/GraphQL), rate limiting, API gateway, microservices vs monolith
8. Reliability & observability: redundancy, circuit breaker, retries/backoff, SLOs, monitoring
9. Case studies I: URL shortener, Pastebin, distributed rate limiter, notification system
10. Case studies II: WhatsApp/chat, news feed, YouTube/Netflix, Uber, search autocomplete

## 9. Frontend — 10 modules
1. How the web works, browser rendering pipeline, critical rendering path
2. Semantic HTML and accessibility (ARIA, keyboard support, screen readers)
3. CSS: box model, specificity, Flexbox, Grid, responsive design, stacking context
4. DOM, events (bubbling, capturing, delegation), browser storage APIs
5. React fundamentals: JSX, props/state, rendering, reconciliation, keys
6. React hooks deep dive and state management (Context, Redux/Zustand, server state)
7. Performance: Core Web Vitals, code splitting, lazy loading, memoization, virtualization
8. Networking and security for the frontend: fetch, CORS, cookies, XSS, CSRF, CSP
9. Tooling and testing: bundlers/Vite, Jest, React Testing Library, end-to-end tests
10. Frontend system design and machine coding: autocomplete, infinite feed, component library

## 10. Backend — 10 modules
1. HTTP deep dive, REST API design, status codes, idempotency, versioning
2. Authentication & authorization: sessions, JWT, OAuth2/OIDC, password hashing, RBAC
3. Spring Boot essentials: dependency injection, MVC, JPA, transactions
4. Node.js/Express essentials: event loop on the server, middleware, streams
5. Databases from the backend: ORMs, the N+1 problem, connection pooling, migrations
6. Caching, queues and background jobs in practice
7. Microservices patterns: saga, outbox, CQRS, gRPC, service discovery
8. Testing (unit/integration/contract) and clean/hexagonal architecture
9. DevOps for backend engineers: Docker, Kubernetes basics, CI/CD, core AWS services
10. Security (OWASP Top 10), logging, metrics, tracing, production readiness

## 11. GenAI & Working With AI — 10 modules
1. AI/ML foundations in plain English: training, loss, gradient descent intuition
2. How LLMs work: tokens, embeddings, transformers and attention, sampling/temperature
3. Prompt engineering: zero/few-shot, chain of thought, structured output, system prompts
4. Embeddings and vector databases: similarity search, ANN/HNSW
5. RAG end to end: chunking, retrieval, reranking, evaluation
6. Agents and tool use: function calling, ReAct, MCP, multi-agent systems
7. Prompting vs RAG vs fine-tuning, LoRA, evaluation, guardrails, hallucinations
8. LLM system design: chatbot/RAG at scale, cost, latency, caching
9. **Working alongside AI as an engineer**: coding-assistant workflows, reviewing and testing AI code, AI in interviews
10. **The future of software careers with AI**: what gets automated, which skills gain value, how to stay relevant, ethics

## 12. CS Core: OS + Computer Networks — 8 modules
1. Processes vs threads, process states, context switching, system calls
2. CPU scheduling: FCFS, SJF, Round Robin, priority scheduling
3. Synchronization: race conditions, mutex, semaphores, deadlock (Banker's algorithm), classic problems
4. Memory: paging, segmentation, virtual memory, TLB, page replacement (LRU/FIFO/Optimal)
5. File systems, I/O, Linux essentials for engineers
6. Networks: OSI vs TCP/IP, IP addressing, subnetting, routing
7. TCP vs UDP, 3-way handshake, flow and congestion control, HTTP/HTTPS/TLS
8. DNS, "what happens when you type a URL", sockets, WebSockets

## 13. Behavioral & Interview Strategy — 4 modules
1. How product-company interview loops work, resume, the STAR method
2. Behavioral question bank: conflict, failure, leadership, ownership, leadership principles
3. Communicating in coding and design rounds: clarify, think aloud, discuss trade-offs, test your code
4. Offers, negotiation, career growth, keeping your skills sharp in the AI era
