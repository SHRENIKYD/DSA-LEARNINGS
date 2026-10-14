# Interview Mastery — Beginner → Expert Curriculum
**13 tracks · 194 modules · 4 levels per track:** 🟢 Beginner → 🔵 Intermediate → 🟣 Advanced → 🔴 Expert

## How depth works (inside every topic)
Every topic is taught in four layers, so the same page carries you from zero to expert:
1. 🟢 **Start here**: real-world analogy, then plain-English explanation with small numbers, tables and pictures
2. 🔵 **How it really works**: the mechanics, step-by-step visualizer with narrator, annotated code
3. 🟣 **Expert deep dive**: internals, proofs/why it is correct, edge cases, performance trade-offs, how it is used in real production systems
4. 🤖 **New school (AI era)**: what AI changes here, prompts that make AI a study/work partner, where AI gets it wrong, what you must still own

Plus in every module:
- 🎯 goals, prerequisites and estimated hours
- 🔍 "Clues in the Question" (pattern recognition)
- 🧩 guided problems: colour-coded example → brute force → "What would you do?" question → 3 progressive hints → full solution, dry run and complexity
- 🏟 Practice Arena: 6–10 problems graded Easy → Medium → Hard

## Learning paths
| Goal | Duration | Route |
|---|---|---|
| **Complete path (zero → expert)** | 9–12 months | All tracks, in level order: every 🟢 → every 🔵 → every 🟣 → every 🔴 |
| **SDE-1 / new grad** | 12–16 weeks | 1 language (🟢🔵) · DSA 1–20 · SQL 1–9 · CS Core 1–6, 10–13 · LLD 1–7 · HLD 1–6 · Behavioral 1–4 |
| **SDE-2 / Senior** | 16–20 weeks | DSA 8–28 · LLD all · HLD all · SQL 10–15 · Backend or Frontend 🟣🔴 · Behavioral 5 |
| **Frontend specialist** | 14 weeks | JS/TS all · Frontend all · DSA 1–15 · HLD 1–9 · Behavioral |
| **Backend specialist** | 16 weeks | Java or Python all · Backend all · SQL all · HLD all · DSA 1–20 |
| **AI engineer** | 14 weeks | Python all · GenAI all · Backend 1–9 · HLD 1–13 · DSA 1–15 |

---

## 1. DSA + Math for CS (Java) — 28 modules
🟢 **Beginner**
1. Programming foundations for DSA: Java syntax for problem solving, fast I/O, arrays, strings, functions, how memory and references work
2. Math foundations & complexity: counting loop iterations, AP/GP, logarithms, Big-O/Ω/Θ, space complexity, the 10⁸ rule, constraint → complexity
3. Number theory basics: factors in O(√N), primes, sieve, GCD/LCM (Euclid with a visual proof), modulo rules, fast power, nCr, Pascal's triangle, pigeonhole principle
4. Bit manipulation: binary, 2's complement, operators, XOR tricks, bit i operations, Kernighan's trick, Single Number I/II/III, bitmask subsets
5. Arrays, prefix sums & carry forward: range queries, even/odd prefix sums, Kadane, contribution technique, rainwater, matrix spiral/rotate/search, 2D prefix sums
6. Two pointers & sliding window: 2-Sum/3-Sum, container with most water, same-direction pointers, fixed and variable windows
7. Sorting & intervals: elementary sorts, count/radix sort, merge sort plus inversions, quick sort plus quickselect, comparators, stability, merging intervals

🔵 **Intermediate**

8. Hashing masterclass: HashMap internals, frequency/lookup patterns, prefix sum + hashing, sliding window + hashing, longest consecutive sequence
9. Strings: palindromes, StringBuilder, longest palindromic substring, Rabin-Karp, KMP/LPS, Z-algorithm
10. Binary search: classic, bounds, rotated array, peak, binary search on the answer (Aggressive Cows, Painter's Partition, Allocate Books)
11. Recursion & backtracking: call stack, recurrence trees, Hanoi, subsets, permutations, combination sum, N-Queens, Sudoku
12. Linked lists: singly/doubly lists, dummy node, Floyd's algorithm, reversal and K-group reversal, merge, LRU cache
13. Stacks & queues: parentheses, monotonic stack (NGE, stock span, histogram), queue via stacks, min stack, monotonic deque
14. Trees & BST: traversals, level order, views, height/diameter, balanced check, LCA, BST operations, validation, k-th smallest
15. Heaps & tries: heap internals, heapify, K-largest, merge K lists, running median, Trie, max XOR

🟣 **Advanced**

16. Greedy algorithms: exchange-argument proofs, activity selection, job sequencing, fractional knapsack, Huffman coding, gas station, where greedy fails
17. Dynamic programming I: memo → tabulation → space optimisation, climbing stairs, house robber, coin change, 0/1 and unbounded knapsack, LCS, edit distance, grid paths
18. Dynamic programming II: LIS (N log N), partition DP, interval DP (matrix chain, burst balloons), DP on trees, state-machine DP (stock problems)
19. Graphs I: representations, BFS/DFS, connected components, cycle detection, bipartite check, topological sort, DSU
20. Graphs II: Dijkstra, 0-1 BFS, Bellman-Ford, Floyd-Warshall, Prim, Kruskal, shortest-path variants

🔴 **Expert**

21. Range-query data structures: segment tree (lazy propagation), Fenwick tree, sparse table, sqrt decomposition, Mo's algorithm
22. Advanced graphs: SCC (Kosaraju/Tarjan), bridges and articulation points, Euler paths, LCA via binary lifting, max flow (Edmonds-Karp/Dinic), bipartite matching
23. Advanced DP: bitmask DP (TSP), digit DP, probability/expected-value DP, DP optimisations (convex hull trick, divide & conquer, Knuth)
24. Advanced strings: Manacher, suffix array + LCP, Aho-Corasick, double hashing, intro to suffix automaton
25. Advanced math: extended Euclid, modular inverse, Fermat's little theorem, CRT, Euler's totient, matrix exponentiation, inclusion-exclusion, Catalan numbers, Lucas' theorem, game theory (Nim, Sprague-Grundy)
26. Geometry, randomized & amortized analysis: orientation, convex hull, segment intersection, reservoir sampling, randomized algorithms, amortized analysis
27. Real-world data structure design: LFU cache, skip list, Bloom filter, consistent-hash ring, time-based KV store, iterator design
28. Interview mastery: the pattern-recognition master map, mixed timed problem sets, mock rounds, debugging under pressure

## 2. Java — 14 modules
🟢 1. JDK/JRE/JVM, setup, syntax, types, operators · 2. Control flow, methods, arrays, String basics · 3. Classes, objects, constructors, `static`, `this` · 4. OOP pillars: encapsulation, inheritance, polymorphism, abstraction, interfaces
🔵 5. Strings deep dive (immutability, pool, StringBuilder), wrapper classes, equals/hashCode · 6. Exceptions, files, I/O & NIO · 7. Collections framework in practice · 8. Generics (bounds, wildcards, erasure) · 9. Lambdas, streams, Optional
🟣 10. Collections internals (HashMap resize/treeify, TreeMap red-black tree, ConcurrentHashMap) · 11. Concurrency I: threads, `synchronized`, `volatile`, wait/notify, happens-before · 12. Concurrency II: executors, locks, atomics, CompletableFuture, virtual threads
🔴 13. JVM internals: class loading, bytecode, JIT, memory areas, garbage collectors (G1/ZGC), tuning, profiling · 14. Modern & expert Java: Java 17–21 features, reflection, annotations, JPMS modules, JMH benchmarking, output-prediction question bank

## 3. Python — 13 modules
🟢 1. Setup, syntax, types, I/O · 2. Control flow, functions, lists/dicts/sets/tuples · 3. Strings, files, modules, pip/venv · 4. OOP basics
🔵 5. Data structure internals and costs, comprehensions · 6. Closures, decorators, functools · 7. Iterators, generators, context managers · 8. Advanced OOP: dunder methods, MRO, dataclasses, properties, ABCs, `__slots__` · 9. Errors, type hints, pytest
🟣 10. Concurrency: the GIL, threading, multiprocessing, asyncio · 11. Interview toolkit: collections, heapq, bisect, itertools, lru_cache, Pythonic DSA
🔴 12. CPython internals: bytecode, reference counting, garbage collection, descriptors, metaclasses · 13. Performance & expert Python: profiling, vectorization, C extensions/Cython overview, packaging, gotchas bank

## 4. JavaScript & TypeScript — 14 modules
🟢 1. Syntax, types, operators, control flow · 2. Functions, arrays, objects · 3. JS in the browser vs Node: runtime overview
🔵 4. Scope, hoisting, TDZ, closures · 5. `this`, call/apply/bind, arrow functions · 6. Prototypes, classes, inheritance · 7. Async I: callbacks, promises · 8. Async II: event loop, microtasks, async/await, error handling · 9. ES6+: modules, iterators/generators, Map/Set/WeakMap, Proxy/Reflect
🟣 10. TypeScript fundamentals · 11. Advanced TypeScript: generics, conditional, mapped and template-literal types, type-level programming · 12. JS engine internals: V8, hidden classes, inline caches, GC, memory leaks
🔴 13. Functional programming and design patterns in JS, immutability, performance · 14. Machine coding: polyfills, debounce/throttle, deep clone, curry, event emitter, promise utilities, output-based question bank

## 5. C++ — 13 modules
🟢 1. Compilation model, syntax, types, I/O · 2. Control flow, functions, arrays, strings · 3. Pointers & references · 4. OOP basics
🔵 5. Advanced OOP: rule of 3/5/0, virtual functions/vtables, operator overloading · 6. Memory management: RAII, smart pointers · 7. STL containers · 8. STL algorithms, iterators, competitive-programming setup
🟣 9. Templates, SFINAE, concepts · 10. Modern C++11–20: move semantics, perfect forwarding, lambdas, constexpr, ranges · 11. Concurrency: threads, mutexes, atomics, memory ordering
🔴 12. Low-level performance: cache behaviour, alignment, undefined behaviour, compiler optimisations, profiling · 13. Expert idioms: CRTP, pimpl, type erasure, coroutines, plus a question bank

## 6. SQL + DBMS — 15 modules *(queries run live in the browser)*
🟢 1. Databases and the relational model · 2. SELECT/WHERE/ORDER BY/LIMIT, NULLs · 3. Aggregates, GROUP BY, HAVING, CASE · 4. JOINs (all types, self-join, anti-join)
🔵 5. Subqueries, CTEs, recursive CTEs · 6. Window functions · 7. DDL, constraints, ER modelling · 8. Normalization (1NF → BCNF), denormalization · 9. DML, UPSERT, views, stored procedures, triggers
🟣 10. Index internals: B+tree, hash, composite and covering indexes · 11. Query execution: EXPLAIN, join algorithms, statistics, query tuning · 12. Transactions: ACID, isolation levels and anomalies, locking, MVCC, deadlocks
🔴 13. Storage engines: pages, buffer pool, WAL, B-tree vs LSM-tree · 14. Distributed databases: replication, sharding, NoSQL families, NewSQL, CAP in practice · 15. Hard SQL interview bank: gaps & islands, sessionization, funnels, retention, pivoting, recursive queries

## 7. Low-Level Design (Java) — 12 modules
🟢 1. OOP modelling, UML class/sequence diagrams · 2. SOLID · 3. Clean code: DRY/KISS/YAGNI, composition over inheritance
🔵 4. Creational patterns · 5. Structural patterns · 6. Behavioral patterns · 7. LLD interview framework, Parking Lot, Tic-Tac-Toe
🟣 8. Case studies: BookMyShow, Splitwise, library management · 9. State-heavy designs: Elevator, Vending Machine, ATM · 10. Concurrency in LLD: thread-safe designs, rate limiter, producer-consumer, LRU/LFU cache
🔴 11. Extensible architecture: plugin systems, DDD tactical patterns (entities, aggregates, value objects), event sourcing at code level · 12. Expert case studies: logging framework, Kafka-like pub-sub, Chess, in-memory KV store with transactions

## 8. High-Level System Design — 16 modules
🟢 1. What system design is, client-server, how a request flows · 2. Scalability basics: vertical/horizontal, stateless services, load balancers · 3. Estimation and the HLD interview framework
🔵 4. DNS, CDN, proxies, L4/L7 · 5. SQL vs NoSQL choice, replication, partitioning, sharding · 6. Caching · 7. Consistent hashing and data distribution · 8. Messaging and streaming (queues, pub/sub, Kafka) · 9. APIs: REST/gRPC/GraphQL/WebSockets, API gateway, rate limiting
🟣 10. Distributed-systems theory: CAP, PACELC, consistency models, quorums, vector clocks, gossip · 11. Consensus and coordination: Raft/Paxos, leader election, distributed locks, 2PC, sagas · 12. Reliability and observability: SLOs, redundancy, circuit breakers, chaos engineering · 13. Storage systems: blob storage, search/inverted index, time-series, warehouses/lakes, batch vs stream processing
🔴 14. Case studies I: URL shortener, Pastebin, rate limiter, notification system, distributed KV store · 15. Case studies II: WhatsApp, news feed, Instagram, YouTube/Netflix, Google Drive · 16. Case studies III: Uber, Google Maps, ticket booking at scale, payment system, search autocomplete, ad-click aggregator

## 9. Frontend — 16 modules
🟢 1. How the web works · 2. HTML · 3. CSS basics · 4. DOM & events
🔵 5. CSS layout mastery: Flexbox, Grid, positioning, responsive design, animations · 6. Accessibility · 7. Browser APIs, storage, fetch · 8. React fundamentals · 9. React hooks · 10. State management & data fetching (Redux, Zustand, React Query)
🟣 11. Rendering pipeline and performance: CRP, reflow/repaint, Core Web Vitals · 12. React internals: Fiber, concurrent rendering, Suspense, Server Components, Next.js SSR/SSG/ISR · 13. Security and networking: CORS, XSS, CSRF, CSP, cookies · 14. Tooling and testing: bundlers, Vite/webpack, TypeScript, Jest/RTL/Playwright, CI
🔴 15. Frontend architecture: micro-frontends, design systems, monorepos, PWA/service workers, offline · 16. Frontend system design and machine-coding rounds

## 10. Backend — 16 modules
🟢 1. How backends work, HTTP basics · 2. Your first REST API (Spring Boot and Node) · 3. Databases from code: CRUD and ORM basics
🔵 4. HTTP deep dive and API design · 5. Auth: sessions, JWT, OAuth2/OIDC, password hashing, RBAC · 6. Spring Boot deep dive: DI, bean lifecycle, AOP, JPA/Hibernate, transactions · 7. Node.js deep dive: event loop, streams, clustering, worker threads · 8. Data access patterns: N+1, pooling, migrations, pagination
🟣 9. Caching and async processing: Redis, queues, jobs, idempotency · 10. Microservices patterns: saga, outbox, CQRS, gRPC, service mesh · 11. Testing and architecture: clean/hexagonal, DDD · 12. Performance and scalability: profiling, concurrency, backpressure
🔴 13. DevOps: Docker, Kubernetes, CI/CD, infrastructure as code · 14. Cloud architecture: core AWS services, serverless · 15. Security engineering: OWASP, secrets, zero trust · 16. Observability and production excellence: logs/metrics/traces, incidents, SRE

## 11. GenAI & Working With AI — 17 modules
🟢 1. AI, ML, DL and GenAI in plain English · 2. Using AI tools effectively (chat assistants, coding assistants) · 3. Math and Python for AI: vectors, matrices, probability intuition
🔵 4. ML foundations: training, loss, gradient descent, overfitting, evaluation · 5. Neural networks and backpropagation intuition · 6. How LLMs work: tokens, embeddings, transformers, attention · 7. Prompt engineering deep dive · 8. Embeddings and vector databases · 9. RAG end to end
**10. MCP: Model Context Protocol** (host/client/server, tools/resources/prompts, JSON-RPC lifecycle, stdio vs Streamable HTTP, building servers in Python and TypeScript, connecting them to Claude and IDEs, security: OAuth, tool poisoning, prompt injection)
🟣 11. Agents, tool use and multi-agent systems built on MCP · 12. Fine-tuning: SFT, LoRA/QLoRA, RLHF/DPO, when to fine-tune · 13. Evaluation, guardrails, hallucinations, prompt-injection security · 14. LLM system design and LLMOps: serving, cost, latency, caching, observability
🔴 15. Transformer internals: attention math, KV cache, quantization, scaling laws, mixture of experts · 16. AI-augmented engineering: coding-agent workflows, reviewing/testing AI code, spec-driven development, AI in interviews · 17. Future of software careers with AI: roles, skills, ethics, staying relevant

## 12. CS Core: Operating Systems + Computer Networks — 14 modules
🟢 1. What an OS does: kernel/user mode, system calls · 2. Processes and threads
🔵 3. CPU scheduling · 4. Synchronization: mutexes, semaphores, classic problems · 5. Deadlocks (Banker's algorithm) · 6. Memory management and virtual memory
🟣 7. File systems, I/O, storage · 8. Linux internals and the shell for engineers
🔴 9. Containers (namespaces, cgroups), virtualization, epoll/io_uring
🟢 10. Network basics: OSI/TCP-IP, devices · 🔵 11. IP, subnetting, routing, NAT · 12. TCP/UDP deep dive · 🟣 13. HTTP/1.1/2/3, TLS, DNS, WebSockets, "what happens when you type a URL" · 🔴 14. QUIC, BGP, load-balancing internals, network security and DDoS

## 13. Behavioral & Career — 6 modules
🟢 1. Product-company interview loops, resume/LinkedIn, STAR · 2. Behavioral bank I: teamwork, conflict, failure
🔵 3. Behavioral bank II: leadership, ownership, ambiguity, leadership principles · 4. Communicating in coding and design rounds
🟣 5. Senior/staff interviews: scope, influence, system-ownership stories
🔴 6. Offers, negotiation, career growth, career strategy in the AI era
