/* Learning order: prerequisites, language preparation, career routes and projects.
   Difficulty (level B/I/A/E in tracks.js) is a badge only; order comes from these prerequisites.
   'prep:dsa', 'prep:lld' and 'prep:conc' are resolved per language through PREP, so DSA and LLD never assume one language. */
var PATHS = (function () {
  var NEEDS = {
    // DSA (language-neutral; prep:dsa = your language's basics + collections)
    dsa01: ['prep:dsa'], dsa02: ['dsa01'], dsa03: ['dsa01', 'dsa02'], dsa04: ['dsa01', 'dsa02'], dsa05: ['dsa01', 'dsa02'],
    dsa06: ['dsa02', 'dsa05'], dsa07: ['dsa02', 'dsa05', 'dsa06'], dsa08: ['dsa02', 'dsa05', 'dsa06'], dsa09: ['dsa03', 'dsa06', 'dsa08'],
    dsa10: ['dsa02', 'dsa05', 'dsa07'], dsa11: ['dsa01', 'dsa02'], dsa12: ['dsa06', 'dsa08', 'dsa11'], dsa13: ['dsa05', 'dsa06'],
    dsa14: ['dsa11', 'dsa13'], dsa15: ['dsa07', 'dsa08', 'dsa14'], dsa16: ['dsa07', 'dsa15'], dsa17: ['dsa02', 'dsa05', 'dsa11'],
    dsa18: ['dsa10', 'dsa14', 'dsa17'], dsa19: ['dsa08', 'dsa11', 'dsa13', 'dsa14'], dsa20: ['dsa15', 'dsa19'],
    dsa21: ['dsa04', 'dsa05', 'dsa10', 'dsa14'], dsa22: ['dsa19', 'dsa20'], dsa23: ['dsa17', 'dsa18', 'dsa13'],
    dsa24: ['dsa09', 'dsa10', 'dsa13', 'dsa15'], dsa25: ['dsa03', 'dsa04', 'dsa17'], dsa26: ['dsa07', 'dsa10', 'dsa13', 'dsa15', 'dsa19'],
    dsa27: ['dsa08', 'dsa12', 'dsa14', 'dsa15'], dsa28: ['dsa06', 'dsa08', 'dsa10', 'dsa14', 'dsa16', 'dsa17', 'dsa20'],
    // Java
    java02: ['java01'], java03: ['java02'], java04: ['java03'], java05: ['java04'], java06: ['java04', 'java05'], java07: ['java05'],
    java08: ['java07'], java09: ['java07', 'java08'], java10: ['java07', 'java08'], java11: ['java04', 'java09'], java12: ['java11'],
    java13: ['java10', 'java12'], java14: ['java09', 'java13'],
    // C#
    csharp02: ['csharp01'], csharp03: ['csharp02'], csharp04: ['csharp03'], csharp05: ['csharp04'], csharp06: ['csharp05'],
    csharp07: ['csharp04', 'csharp06'], csharp08: ['csharp03', 'csharp07'], csharp09: ['csharp06', 'csharp07'], csharp10: ['csharp08', 'csharp09'],
    csharp11: ['csharp05', 'csharp06'], csharp12: ['csharp08', 'csharp11'], csharp13: ['csharp10', 'csharp12'],
    // Python
    py02: ['py01'], py03: ['py02'], py04: ['py02'], py05: ['py02', 'py04'], py06: ['py02', 'py04'], py07: ['py05', 'py06'],
    py08: ['py04', 'py05', 'py06'], py09: ['py06', 'py07', 'py08'], py10: ['py07', 'py09'], py11: ['py05', 'py06', 'py07'],
    py12: ['py05', 'py08'], py13: ['py08', 'py12'],
    // JavaScript / TypeScript
    js02: ['js01'], js03: ['js02'], js04: ['js02', 'js03'], js05: ['js04'], js06: ['js02', 'js05'], js07: ['js04'], js08: ['js07'],
    js09: ['js06', 'js08'], js10: ['js06', 'js09'], js11: ['js10'], js12: ['js04', 'js06', 'js08'], js13: ['js05', 'js08'], js14: ['js08', 'js13'],
    // C++
    cpp02: ['cpp01'], cpp03: ['cpp02'], cpp04: ['cpp03'], cpp05: ['cpp04'], cpp06: ['cpp03', 'cpp05'], cpp07: ['cpp03'],
    cpp08: ['cpp07'], cpp09: ['cpp05', 'cpp08'], cpp10: ['cpp06', 'cpp09'], cpp11: ['cpp06', 'cpp10'], cpp12: ['cpp06', 'cpp11'], cpp13: ['cpp10', 'cpp11'],
    // SQL
    sql02: ['sql01'], sql03: ['sql02'], sql04: ['sql03'], sql05: ['sql04'], sql06: ['sql05'], sql07: ['sql01', 'sql04'], sql08: ['sql07'],
    sql09: ['sql06', 'sql07'], sql10: ['sql04', 'sql07'], sql11: ['sql06', 'sql10'], sql12: ['sql09', 'sql10'], sql13: ['sql10', 'sql12'],
    sql14: ['sql12', 'sql13'], sql15: ['sql06', 'sql11'],
    // LLD (prep:lld = your language's classes, interfaces, equality, generics)
    lld01: ['prep:lld'], lld02: ['lld01'], lld03: ['lld02'], lld04: ['lld03'], lld05: ['lld04'], lld06: ['lld05'], lld07: ['lld06'],
    lld08: ['lld07'], lld09: ['lld07'], lld10: ['lld08', 'prep:conc'], lld11: ['lld06', 'lld10'], lld12: ['lld10', 'lld11'],
    // HLD
    hld02: ['hld01'], hld03: ['hld02'], hld04: ['hld02'], hld05: ['hld02'], hld06: ['hld05'], hld07: ['hld05', 'hld06'], hld08: ['hld02'],
    hld09: ['hld04'], hld10: ['hld05', 'hld07'], hld11: ['hld10'], hld12: ['hld04', 'hld08'], hld13: ['hld05', 'hld08'],
    hld14: ['hld03', 'hld06', 'hld07', 'hld09'], hld15: ['hld08', 'hld13', 'hld14'], hld16: ['hld10', 'hld11', 'hld14'],
    // Frontend
    fe02: ['fe01'], fe03: ['fe02'], fe04: ['fe02', 'fe03', 'js02'], fe05: ['fe03'], fe06: ['fe02', 'fe04'], fe07: ['fe04', 'js08'],
    fe08: ['fe04', 'js06'], fe09: ['fe08', 'js04'], fe10: ['fe07', 'fe09'], fe11: ['fe05', 'fe07'], fe12: ['fe09'], fe13: ['fe07'],
    fe14: ['fe08'], fe15: ['fe10', 'fe14'], fe16: ['fe10', 'fe11', 'fe15'],
    fe17: ['fe04', 'js06', 'js10'], fe18: ['fe17'], fe19: ['fe18', 'js08'], fe20: ['fe19', 'fe07'],
    // Backend (Spring Boot, Node.js, Python)
    be02: ['be01'], be03: ['be02', 'sql04'], be04: ['be01'], be05: ['be04'], be06: ['be03', 'be05', 'java09'], be07: ['be04', 'js08'],
    be08: ['be03', 'sql10'], be09: ['be08'], be10: ['be09'], be11: ['be04'], be12: ['be09'], be13: ['be10'], be14: ['be13'], be15: ['be05'],
    be16: ['be13'], be17: ['be04', 'py06', 'py09'], be18: ['be17', 'sql07', 'sql09'], be19: ['be05', 'be17'], be20: ['be17', 'py09'],
    be21: ['be18', 'be19'],
    // GenAI
    ai02: ['ai01'], ai03: ['ai01'], ai04: ['ai03'], ai05: ['ai04'], ai06: ['ai05'], ai07: ['ai02'], ai08: ['ai06'], ai09: ['ai07', 'ai08'],
    ai10: ['ai07'], ai11: ['ai09', 'ai10'], ai12: ['ai05', 'ai06'], ai13: ['ai09'], ai14: ['ai09', 'ai13'], ai15: ['ai05', 'ai06', 'ai18', 'ai20'],
    ai16: ['ai02'], ai17: ['ai02'], ai18: ['ai03'], ai19: ['ai03'], ai20: ['ai18'],
    // CS Core
    cs02: ['cs01'], cs03: ['cs02'], cs04: ['cs02'], cs05: ['cs04'], cs06: ['cs02'], cs07: ['cs06'], cs08: ['cs02'], cs09: ['cs06', 'cs08'],
    cs11: ['cs10'], cs12: ['cs10'], cs13: ['cs12'], cs14: ['cs12', 'cs13'],
    // Behavioral
    beh02: ['beh01'], beh03: ['beh02'], beh04: ['beh01'], beh05: ['beh03'], beh06: ['beh01'],
    // Cloud & DevOps
    devops02: ['devops01'], devops03: ['devops01'], devops05: ['devops01', 'devops03'], devops06: ['devops05'],
    devops07: ['devops02', 'py03'], devops08: ['devops01', 'devops02'], devops09: ['devops04', 'devops06'], devops10: ['devops01', 'devops02'],
    devops11: ['devops04', 'devops08'], devops12: ['devops06'], devops13: ['devops03', 'devops08'], devops14: ['devops13'],
    devops15: ['devops13'], devops16: ['devops06', 'devops11'], devops17: ['devops12', 'devops14'], devops18: ['devops15', 'devops16', 'devops17']
  };
  var RECS = {
    dsa03: ['dsa05'], dsa04: ['dsa03'], dsa05: ['dsa04'], dsa08: ['dsa04'], dsa13: ['dsa12'], dsa14: ['dsa08'], dsa15: ['dsa04', 'dsa12'],
    dsa16: ['dsa05', 'dsa11'], dsa17: ['dsa16'], dsa18: ['dsa11'], dsa20: ['dsa17'], dsa21: ['dsa11', 'dsa15'], dsa22: ['dsa04', 'dsa11'],
    dsa23: ['dsa03', 'dsa04', 'dsa21'], dsa24: ['dsa03', 'dsa21'], dsa25: ['dsa02'], dsa26: ['dsa03', 'dsa12'], dsa27: ['dsa10', 'dsa13'],
    dsa28: ['dsa18', 'dsa19', 'dsa21', 'dsa22', 'dsa23', 'dsa24', 'dsa25', 'dsa26', 'dsa27'],
    java01: ['dsa01'], java06: ['java02'], java10: ['java05'], java11: ['java07', 'java10'], java13: ['java10'],
    py03: ['py01'], py10: ['py06'], py11: ['dsa08', 'dsa13', 'dsa15'], py13: ['py10'],
    js06: ['js04'], js08: ['js03'], js11: ['js07'], js14: ['js02', 'js09'],
    cpp05: ['cpp06'], cpp07: ['cpp05', 'cpp06'], cpp09: ['cpp02', 'cpp03'],
    sql06: ['dsa05', 'dsa06'], sql08: ['sql03', 'sql05'], sql15: ['sql10'],
    lld02: ['prep:lld'], lld06: ['lld02'], lld11: ['lld02'],
    hld04: ['cs13'], hld05: ['sql10', 'sql12'], hld06: ['be09'], hld08: ['be09'], hld09: ['be04'], hld12: ['be16'], hld14: ['dsa08'],
    fe13: ['cs13'], fe09: ['js05'],
    be01: ['cs13'], be02: ['java04', 'js07'], be04: ['be02', 'be17'], be09: ['hld06'], be10: ['hld09'], be11: ['be06', 'be07'], be12: ['java12'], be13: ['cs09'],
    be14: ['hld05'], be16: ['hld12'], be18: ['be08'], be21: ['be09', 'devops08'],
    ai03: ['py02'], ai04: ['ai18', 'ai19'], ai05: ['ai18', 'ai20'], ai06: ['ai18'], ai07: ['ai06'], ai08: ['ai18'], ai10: ['be04'],
    ai13: ['ai11'], ai14: ['hld06'], ai16: ['ai11'], ai18: ['py02'], ai19: ['py02'], ai20: ['ai19'],
    cs08: ['cs07'], cs12: ['cs11'],
    devops01: ['cs01', 'cs08'], devops02: ['cs08'], devops03: ['cs10', 'cs11', 'cs13'], devops04: ['devops01'], devops07: ['py02'], devops08: ['cs09'],
    devops12: ['hld04', 'hld05'], devops15: ['hld12', 'be16'], devops16: ['be15'], devops17: ['hld10', 'be10', 'be14'], devops18: ['beh01']
  };
  var PREP = {
    java: { name: 'Java', dsa: ['java01', 'java02', 'java05', 'java07'], lld: ['java03', 'java04', 'java05', 'java08'], conc: ['java11', 'java12'] },
    python: { name: 'Python', dsa: ['py01', 'py02', 'py05'], lld: ['py04', 'py08', 'py09'], conc: ['py10'] },
    js: { name: 'JavaScript / TypeScript', dsa: ['js01', 'js02'], lld: ['js06', 'js10', 'js11'], conc: ['js07', 'js08'] },
    cpp: { name: 'C++', dsa: ['cpp01', 'cpp02', 'cpp03', 'cpp07', 'cpp08'], lld: ['cpp04', 'cpp05', 'cpp06'], conc: ['cpp11'] },
    csharp: { name: 'C#', dsa: ['csharp01', 'csharp02', 'csharp05', 'csharp06'], lld: ['csharp03', 'csharp04', 'csharp07'], conc: ['csharp09', 'csharp10'] }
  };
  /* Routes. stages: ordered groups; each module is core unless listed in rec (recommended) or opt (optional).
     langs: languages the route can be followed in. 'prep:*' entries expand to the chosen language's modules. */
  var ROUTES = [
    { id: 'sde', name: 'Interview / SDE foundations', langs: ['java', 'python', 'js', 'cpp', 'csharp'], blurb: 'The classic product-company loop: your language, core DSA, SQL and CS basics, low-level design, an introduction to system design and mock rounds.',
      stages: [
        { name: 'Your language', mods: ['prep:dsa'] },
        { name: 'Core DSA', mods: ['dsa01', 'dsa02', 'dsa03', 'dsa04', 'dsa05', 'dsa06', 'dsa07', 'dsa08', 'dsa09', 'dsa10', 'dsa11', 'dsa12', 'dsa13', 'dsa14', 'dsa15', 'dsa16', 'dsa17', 'dsa18', 'dsa19', 'dsa20'], opt: ['dsa03', 'dsa09'], project: 'sde-p1' },
        { name: 'SQL and CS fundamentals', mods: ['sql01', 'sql02', 'sql03', 'sql04', 'sql05', 'sql06', 'cs01', 'cs02', 'cs04', 'cs06', 'cs10', 'cs12', 'cs13'], rec: ['cs04', 'cs06'], behavioral: ['beh01', 'beh02'] },
        { name: 'Low-level design', mods: ['prep:lld', 'lld01', 'lld02', 'lld03', 'lld04', 'lld05', 'lld06', 'lld07'], project: 'sde-p2' },
        { name: 'Introductory system design', mods: ['hld01', 'hld02', 'hld03', 'hld04', 'hld05', 'hld06'] },
        { name: 'Mocks and interviews', mods: ['dsa28', 'beh03', 'beh04'], behavioral: ['beh04'] }
      ],
      extensions: ['dsa21', 'dsa22', 'dsa23', 'dsa24', 'dsa25', 'dsa26', 'dsa27', 'lld08', 'lld09', 'hld07', 'hld08', 'hld09', 'sql10', 'sql11', 'sql12'] },
    { id: 'pyback', name: 'Python backend', langs: ['python'], blurb: 'Python first, then DSA, SQL, HTTP and APIs, FastAPI with SQLAlchemy, testing and security, and system design.',
      stages: [
        { name: 'Python', mods: ['py01', 'py02', 'py03', 'py04', 'py05', 'py06', 'py07', 'py08', 'py09'] },
        { name: 'Core DSA', mods: ['dsa01', 'dsa02', 'dsa05', 'dsa06', 'dsa07', 'dsa08', 'dsa10', 'dsa11', 'dsa13', 'dsa14', 'dsa15'], project: 'py-p1' },
        { name: 'SQL', mods: ['sql01', 'sql02', 'sql03', 'sql04', 'sql05', 'sql06', 'sql07', 'sql08', 'sql09'] },
        { name: 'HTTP and APIs', mods: ['cs10', 'cs13', 'be01', 'be04'] },
        { name: 'Backend development in Python', mods: ['be17', 'be18', 'be21'], project: 'py-p2', behavioral: ['beh01', 'beh02'] },
        { name: 'Testing and security', mods: ['be05', 'be19', 'be20', 'be15'], rec: ['be15'] },
        { name: 'System design', mods: ['hld01', 'hld02', 'hld03', 'hld04', 'hld05', 'hld06', 'hld08', 'hld09'], project: 'py-p3', behavioral: ['beh04'] }
      ],
      extensions: ['py10', 'py11', 'be09', 'be16', 'hld12', 'devops08', 'devops11'] },
    { id: 'frontend', name: 'Frontend', langs: ['js'], blurb: 'JavaScript, then TypeScript, HTML/CSS and the browser, React, and the testing, accessibility and performance work that separates seniors.',
      stages: [
        { name: 'JavaScript', mods: ['js01', 'js02', 'js03', 'js04', 'js05', 'js06', 'js07', 'js08', 'js09'] },
        { name: 'TypeScript', mods: ['js10', 'js11'] },
        { name: 'HTML, CSS and browser fundamentals', mods: ['fe01', 'fe02', 'fe03', 'fe04', 'fe05', 'fe07'], project: 'fe-p1' },
        { name: 'A frontend framework (React)', mods: ['fe08', 'fe09', 'fe10'], project: 'fe-p2', behavioral: ['beh01', 'beh02'] },
        { name: 'Testing, accessibility and performance', mods: ['fe06', 'fe11', 'fe14', 'fe13'], rec: ['fe13'] },
        { name: 'Architecture and interviews', mods: ['fe15', 'fe16', 'dsa01', 'dsa02', 'dsa05', 'dsa06', 'dsa08', 'dsa13'], rec: ['dsa01', 'dsa02', 'dsa05', 'dsa06', 'dsa08', 'dsa13'], project: 'fe-p3', behavioral: ['beh04'] }
      ],
      extensions: ['js12', 'js13', 'js14', 'fe12', 'fe17', 'fe18', 'fe19', 'fe20', 'hld01', 'hld04', 'hld06'] },
    { id: 'javaback', name: 'Java backend', langs: ['java'], blurb: 'Java, core DSA and SQL, Spring Boot backends, concurrency, then low-level and high-level design.',
      stages: [
        { name: 'Java', mods: ['java01', 'java02', 'java03', 'java04', 'java05', 'java06', 'java07', 'java08', 'java09'] },
        { name: 'Core DSA and SQL', mods: ['dsa01', 'dsa02', 'dsa05', 'dsa06', 'dsa07', 'dsa08', 'dsa10', 'dsa11', 'dsa12', 'dsa13', 'dsa14', 'dsa15', 'dsa17', 'dsa19', 'sql01', 'sql02', 'sql03', 'sql04', 'sql05', 'sql06', 'sql07', 'sql09', 'sql10'], project: 'jb-p1' },
        { name: 'Backend development', mods: ['be01', 'be02', 'be03', 'be04', 'be05', 'be06', 'be08', 'be09', 'be11'], project: 'jb-p2', behavioral: ['beh01', 'beh02'] },
        { name: 'Concurrency', mods: ['java10', 'java11', 'java12'] },
        { name: 'LLD and HLD', mods: ['lld01', 'lld02', 'lld03', 'lld04', 'lld05', 'lld06', 'lld07', 'lld08', 'lld10', 'hld01', 'hld02', 'hld03', 'hld04', 'hld05', 'hld06', 'hld07', 'hld08', 'hld09', 'hld12'], project: 'jb-p3', behavioral: ['beh03', 'beh04'] }
      ],
      extensions: ['java13', 'java14', 'be10', 'be12', 'be13', 'be16', 'sql11', 'sql12', 'hld10', 'hld14'] },
    { id: 'aiapp', name: 'AI application development', langs: ['python'], blurb: 'Python, the maths that ML actually uses, ML and LLM foundations, evaluation, retrieval and tools, then deployment and safety.',
      stages: [
        { name: 'Python', mods: ['py01', 'py02', 'py03', 'py04', 'py05', 'py06', 'py07', 'py09'] },
        { name: 'Essential maths', mods: ['ai03', 'ai18', 'ai19', 'ai20'] },
        { name: 'ML and LLM foundations', mods: ['ai01', 'ai02', 'ai04', 'ai05', 'ai06', 'ai07'], project: 'ai-p1' },
        { name: 'Evaluation', mods: ['ai13'] },
        { name: 'Retrieval and tools', mods: ['ai08', 'ai09', 'ai10', 'ai11'], project: 'ai-p2', behavioral: ['beh01', 'beh02'] },
        { name: 'Deployment and safety', mods: ['be01', 'be04', 'be17', 'ai14'], project: 'ai-p3', behavioral: ['beh04'] }
      ],
      extensions: ['ai12', 'ai15', 'ai16', 'ai17', 'py10', 'be18', 'be20', 'hld06'] },
    { id: 'systems', name: 'C++ / systems', langs: ['cpp'], blurb: 'C++, DSA in C++, memory and ownership, operating systems and concurrency, networking, and systems projects.',
      stages: [
        { name: 'C++', mods: ['cpp01', 'cpp02', 'cpp03', 'cpp04', 'cpp05', 'cpp07', 'cpp08'] },
        { name: 'DSA', mods: ['dsa01', 'dsa02', 'dsa04', 'dsa05', 'dsa06', 'dsa07', 'dsa08', 'dsa10', 'dsa11', 'dsa12', 'dsa13', 'dsa14', 'dsa15', 'dsa17', 'dsa19'], project: 'cpp-p1' },
        { name: 'Memory and ownership', mods: ['cpp06', 'cpp09', 'cpp10', 'cpp12'], project: 'cpp-p2' },
        { name: 'Operating systems and concurrency', mods: ['cs01', 'cs02', 'cs03', 'cs04', 'cs05', 'cs06', 'cs07', 'cs08', 'cpp11'], behavioral: ['beh01', 'beh02'] },
        { name: 'Networking and systems projects', mods: ['cs10', 'cs11', 'cs12', 'cs13', 'cs09'], project: 'cpp-p3', behavioral: ['beh04'] }
      ],
      extensions: ['cpp13', 'cs14', 'dsa20', 'dsa21', 'lld10', 'hld10'] },
    { id: 'devops', name: 'Cloud & DevOps', langs: ['python'], blurb: 'From Linux and networking to Terraform, Kubernetes, observability and multi-region architecture: cloud support to DevOps, SRE and cloud architect.',
      stages: [
        { name: 'Phase 1: The foundation', mods: ['devops01', 'devops02', 'devops03', 'devops04', 'devops05', 'devops06'], project: 'ops-p1', behavioral: ['beh01'] },
        { name: 'Phase 2: Automation and provisioning', mods: ['py01', 'py02', 'py03', 'devops07', 'devops08', 'devops09', 'devops10', 'devops11', 'devops12'], project: 'ops-p2', behavioral: ['beh02'] },
        { name: 'Phase 3: Orchestration, scale and observability', mods: ['devops13', 'devops14', 'devops15', 'devops16', 'devops17', 'devops18'], project: 'ops-p3', behavioral: ['beh04'] }
      ],
      extensions: ['cs08', 'cs09', 'cs11', 'cs13', 'hld04', 'hld12', 'be13', 'be14', 'be16'] }
  ];
  var PROJECTS = {
    'sde-p1': { name: 'Problem-solving portfolio', hours: 12, brief: 'Solve and write up 15 mixed problems (5 easy, 7 medium, 3 hard) without topic labels, with brute force, optimised solution, complexity and tests for each.', rubric: ['15 problems are solved and written up: 5 easy, 7 medium, 3 hard, picked without looking at topic labels', 'Every write-up has a brute-force solution and an optimised one that give the same answers on the same sample input', 'Tests for every problem cover empty, single-element and largest-size input, and all of them pass', 'Time and space complexity is stated for both solutions, with a sentence of reasoning, not just the result', 'Every write-up names the clue in the problem statement that pointed to the pattern, such as sorted input, a k-th element or overlapping ranges', 'You re-solved the 3 hardest problems from a blank file a week later without looking at your notes'] },
    'sde-p2': { name: 'Parking lot or library system', hours: 14, brief: 'Design and implement a parking lot (or library) in your language: requirements, class diagram, the core classes, and a demo run.', rubric: ['A written requirements list has at least 5 functional requirements and 2 things the system will not do', 'The class diagram shows each entity, its one responsibility and its relationships, and no class does more than one job', 'Adding a new kind of vehicle or item, or a new pricing or fine rule, means adding a class and not editing existing ones', 'The main flows (park and leave, or borrow and return) run end to end, including the full-lot or unavailable-book case', 'Automated tests or a demo script cover the happy path and at least 2 failure cases', 'Invalid actions, such as an unknown ticket or returning something twice, are rejected with a clear message and do not crash'] },
    'py-p1': { name: 'CLI data tool', hours: 10, brief: 'A command-line tool that reads a CSV, answers three queries using the right data structures, and has pytest tests.', rubric: ['Running with --help (argparse) documents every argument and subcommand with a short description', 'Three queries return the right answers on a small CSV whose results you worked out by hand', 'Each query uses the structure that fits it (dict for grouping, heapq for top-k, deque for a sliding window) and a comment says why', 'The file is read row by row, so a 100,000-row file does not need to fit in one list', 'pytest tests cover an empty file, a missing column, a malformed row and a non-numeric value', 'Bad input exits with a non-zero status and a one-line message, never a traceback'] },
    'py-p2': { name: 'Task API with FastAPI', hours: 18, brief: 'A tasks API with FastAPI, SQLAlchemy and Alembic: CRUD, validation, pagination, and a migration history.', rubric: ['Create, read, update, delete and list endpoints all work and return the right status codes (201, 200, 204, 404)', 'Pydantic models reject bad input with a 422 for every field, for example an empty title or an unknown status', 'The list endpoint paginates with a limit and offset, caps the limit, and returns the total count', 'Each request gets its own database session through a dependency, and it is always closed', 'Alembic holds at least 2 migrations; upgrade head builds the schema from an empty database and downgrade -1 works', 'The generated OpenAPI docs show every endpoint with a request and response example'] },
    'py-p3': { name: 'Production-ready API', hours: 20, brief: 'Add JWT auth, tests with coverage over 80%, a background job, Docker image and a short design doc with scaling notes.', rubric: ['Login returns a JWT; protected routes return 401 without a valid or with an expired token; passwords are hashed with argon2 or bcrypt and never logged or returned', 'A test proves one user cannot read or change another user’s tasks', 'The test suite reports coverage of at least 80%, and CI runs tests and lint on every push', 'A background job (for example a due-date reminder) runs outside the request and its failures are logged or retried', 'The Docker image builds from a clean checkout, runs as a non-root user, and takes all secrets from environment variables', 'A design doc of one to two pages covers caching, failure modes and how you would scale the service 10 times'] },
    'fe-p1': { name: 'Accessible landing page', hours: 10, brief: 'A responsive landing page with semantic HTML, CSS layout, a form with validation, and a Lighthouse accessibility score of 95 or more.', rubric: ['The layout works from 320 px to 1440 px with no horizontal scrolling at any width', 'The page uses header, nav, main and footer landmarks, exactly one h1, and no skipped heading levels', 'Everything can be used with the keyboard alone: visible focus, logical tab order and a skip link', 'Every form field has a label, and each validation error is shown as text and linked to its field with aria-describedby', 'A saved Lighthouse report shows an accessibility score of 95 or more', 'Images reserve their space so layout shift stays under 0.1, and text contrast is at least 4.5:1'] },
    'fe-p2': { name: 'React data app', hours: 16, brief: 'A React app that fetches, caches and paginates data from a public API, with loading and error states and TypeScript types.', rubric: ['Data from a public API appears with loading, empty and error states, and the error state has a retry button', 'Typing fast in the search box never shows results for an older query (cancel or ignore out-of-order responses)', 'Pages you have already seen come back from a cache instead of being fetched again', 'Pagination handles the first page, the last page and a page with no results', 'The API layer is typed with TypeScript strict mode, with no any at the boundary', 'Component tests cover the loading, success, error and search flows'] },
    'fe-p3': { name: 'Frontend system design write-up', hours: 10, brief: 'Design an autocomplete or news feed: components, state, API contract, caching, performance budget and accessibility.', rubric: ['Requirements list functional needs and non-functional needs with numbers, such as response time and number of items', 'A component tree and data-flow diagram show where each piece of state lives and who changes it', 'The API contract gives request and response shapes, pagination and error cases', 'A performance budget gives numbers for JavaScript size, largest contentful paint and input delay, and a caching plan explains what is cached where', 'An accessibility plan covers keyboard use, roles and screen-reader announcements for the component', 'At least 3 trade-offs each name the option you rejected and why'] },
    'jb-p1': { name: 'Algorithms with tests', hours: 10, brief: 'Implement 12 mixed problems in Java with JUnit tests, including boundary cases and a benchmark of two approaches.', rubric: ['12 problems are solved, each in its own class with a short statement of the problem', 'JUnit tests for each problem cover empty, single-element, duplicate and largest-size input, and all pass', 'Time and space complexity is stated for each solution with a sentence of reasoning', 'A benchmark compares two approaches on at least 4 input sizes, using JMH or warmed-up repeated runs rather than one timing', 'A table or chart of the benchmark is explained in terms of the Big-O of each approach', 'One command (mvn test or gradle test) runs everything from a clean checkout'] },
    'jb-p2': { name: 'Spring Boot service', hours: 20, brief: 'A Spring Boot REST service with JPA, Flyway migrations, validation, authentication, and integration tests with Testcontainers.', rubric: ['REST endpoints use request and response DTOs, and entities are never returned directly', 'Bean validation covers every request DTO, and errors come back as one consistent JSON shape with status 400', 'Flyway migrations are the only way the schema changes, and the app starts against an empty database', 'Service methods that change several rows are transactional, and one test proves a failure rolls everything back', 'All endpoints except the public ones require authentication, with 401 and 403 cases tested', 'Integration tests run against a real database with Testcontainers and cover a happy path and an error path'] },
    'jb-p3': { name: 'Concurrent booking system', hours: 18, brief: 'Design and build a seat-booking system that is correct under concurrent requests, with an LLD diagram and an HLD scaling plan.', rubric: ['A load test of at least 200 concurrent requests for 10 seats never double-books, checked by a database query afterwards', 'The README names the strategy (pessimistic lock, optimistic version or unique constraint) and why you chose it', 'A request that loses the race gets a clear 409 response, not a 500', 'Held seats that are never paid for are released after a timeout', 'An LLD class diagram shows each class and its responsibility', 'An HLD document gives a capacity estimate (requests per second, storage) and a scaling plan that names what breaks first'] },
    'ai-p1': { name: 'Classifier from scratch', hours: 12, brief: 'Train a logistic-regression classifier in plain Python with gradient descent, evaluate it, and compare with a library model.', rubric: ['Logistic regression with gradient descent is written without an ML library, and its gradients match a numerical gradient to within 1e-5', 'Data is split into training and validation sets before any fitting, and scaling uses training data only', 'Accuracy, precision, recall and a confusion matrix are reported on held-out data', 'You tried at least 3 learning rates and wrote down what each did to the loss curve', 'A scikit-learn model is trained on the same split and its metrics sit next to yours with a short explanation of any gap', 'A learning curve of training against validation score is drawn, with a written explanation of overfitting or underfitting'] },
    'ai-p2': { name: 'RAG assistant over your notes', hours: 18, brief: 'Chunk, embed and retrieve your own documents, answer questions with citations, and measure answer quality on a golden set.', rubric: ['Documents are chunked with a stated size and overlap, and each chunk keeps its source file and position', 'A golden set of at least 20 questions records which passage answers each one', 'Recall at k (k=3 and k=5) is reported, and you changed one setting, such as chunk size or embedding model, and compared', 'Every answer cites its sources, and the assistant says it does not know when nothing relevant is retrieved (tested)', 'Answer quality on the golden set is scored with a stated rubric and shown in a results table', 'At least 3 prompt-injection cases, such as an instruction hidden in a document, are tested and the results are written up'] },
    'ai-p3': { name: 'Deployed AI service', hours: 16, brief: 'Wrap the assistant in a FastAPI service with streaming, rate limits, logging of prompts and costs, and guardrails.', rubric: ['The endpoint streams tokens as they are produced, and a small client shows it working', 'A per-key rate limit returns 429 with a Retry-After header, and a test proves it', 'Every request logs prompt tokens, completion tokens, estimated cost and latency, without logging secrets', 'Guardrails limit input length, refuse out-of-scope requests and check the output, each with a test', 'An evaluation on the golden set runs in CI and fails the build when quality drops below a threshold', 'A provider timeout or error returns a clean error response and never hangs the request'] },
    'cpp-p1': { name: 'Competitive toolkit', hours: 10, brief: 'A tested C++ header with fast I/O, a DSU, a segment tree and Dijkstra, plus 10 problems solved with it.', rubric: ['One header holds fast I/O, a DSU, a segment tree and Dijkstra', 'The header compiles with -Wall -Wextra -Wpedantic and zero warnings', 'Each structure has unit tests that compare it with a brute-force version on random small inputs', 'All tests run clean under AddressSanitizer and UndefinedBehaviorSanitizer', '10 problems are solved with the header, each passing a judge or your own tests', 'Comments give the time complexity of every public operation'] },
    'cpp-p2': { name: 'Memory allocator', hours: 16, brief: 'A fixed-size pool allocator with RAII wrappers, benchmarks against new/delete, and tests under AddressSanitizer.', rubric: ['The pool hands out fixed-size blocks with O(1) allocate and free using a free list', 'An RAII wrapper returns its block automatically, cannot be copied and can be moved', 'An exhausted pool, a double free and a pointer from outside the pool each have defined, tested behaviour', 'Tests run under AddressSanitizer with no leaks and no double frees', 'A benchmark against new and delete covers at least 2 allocation patterns with 1 million or more operations, in a results table', 'A short ownership note says who owns each block, the lifetime rules and whether the pool is thread-safe'] },
    'cpp-p3': { name: 'Multithreaded HTTP server', hours: 24, brief: 'A small HTTP/1.1 server with a thread pool, keep-alive and graceful shutdown, load-tested with wrk or ab.', rubric: ['GET and HEAD are parsed correctly, with 400 for malformed requests, 404 for missing files and 405 for other methods', 'A fixed-size thread pool with a work queue serves connections; there is no thread per connection', 'Keep-alive follows the Connection header and idle connections time out', 'SIGINT or SIGTERM stops accepting, finishes in-flight requests and joins every thread', 'A run under ThreadSanitizer with load shows no data races', 'wrk or ab results at 3 concurrency levels come with an analysis of the bottleneck'] },
    'ops-p1': { name: 'Static site on the cloud', hours: 10, brief: 'Host a static site on object storage behind a CDN with your own DNS name and HTTPS, using least-privilege IAM, then tear it down.', rubric: ['The site is served over HTTPS through a CDN with a valid certificate on your own domain, and HTTP redirects to HTTPS', 'The storage bucket is private and only the CDN can read it; nobody has public write access', 'The IAM user or role has only the permissions it needs, and no root access keys exist', 'A DNS lookup (dig or nslookup) output showing your name pointing at the CDN is saved', 'A budget alert is set and its threshold is written down', 'Teardown steps are documented, you ran them, and you confirmed nothing is still billing'] },
    'ops-p2': { name: 'Containerised app with CI and IaC', hours: 20, brief: 'Containerise a small app, build and test it in GitHub Actions, and provision a two-tier VPC deployment with Terraform and Ansible.', rubric: ['The Dockerfile builds from a clean checkout, uses a pinned small base image and runs as a non-root user', 'On merge the pipeline builds, tests, scans the image, pushes it and deploys, and a failing test blocks the deploy', 'Terraform builds a two-tier VPC (public and private subnets) from nothing, with remote state and locking', 'At least one reusable Terraform module takes variables, and no secret is written in the code', 'The Ansible playbook configures the hosts, and a second run reports 0 changed', 'The app is reachable through a load balancer while the database is not reachable from the internet, shown with a test'] },
    'ops-p3': { name: 'Kubernetes platform with observability', hours: 30, brief: 'Deploy the app to Kubernetes with Helm, autoscaling, Prometheus and Grafana dashboards, alerts, Vault secrets and a disaster-recovery runbook.', rubric: ['The Helm chart sets resource requests and limits and liveness and readiness probes', 'The autoscaler adds pods during a load test and removes them afterwards, shown with output or a graph', 'Prometheus scrapes the app, and a Grafana dashboard shows latency, traffic, errors and saturation', 'An SLO is defined with numbers, and burn-rate alerts fire in a test and reach a receiver', 'Secrets come from Vault or an external secrets store, and a scan such as gitleaks finds none in Git', 'A restore drill from backup finishes within the stated RTO, with the measured time and a disaster-recovery runbook'] }
  };
  /* Framework-specific modules: every topic is written for these languages only. In My path mode a learner whose language
     is not listed sees a one-line reveal instead of the topics (src/engine.js); links always open them. */
  var LANG_ONLY = {
    be02: { langs: ['java', 'js'], label: 'Spring Boot and Express' }, be06: { langs: ['java'], label: 'Java/Spring' },
    be07: { langs: ['js'], label: 'Node.js' }, be17: { langs: ['python'], label: 'Python/FastAPI' },
    be18: { langs: ['python'], label: 'Python/SQLAlchemy' }, be19: { langs: ['python'], label: 'Python' },
    be20: { langs: ['python'], label: 'Python/pytest' }, be21: { langs: ['python'], label: 'Python/FastAPI' }
  };
  var REVISION = 0.15;
  function resolve(id, lang) {
    if (id.indexOf('prep:') !== 0) return [id];
    var p = PREP[lang || 'java'] || PREP.java;
    return (p[id.slice(5)] || []).slice();
  }
  function needs(id, lang) { var out = []; (NEEDS[id] || []).forEach(function (x) { resolve(x, lang).forEach(function (y) { if (out.indexOf(y) < 0) out.push(y); }); }); return out; }
  function recs(id, lang) { var out = []; (RECS[id] || []).forEach(function (x) { resolve(x, lang).forEach(function (y) { if (out.indexOf(y) < 0) out.push(y); }); }); return out; }
  /* A route expanded for one language: ordered unique modules, each tagged core / rec / opt, with prep stages filled in
     and every missing prerequisite pulled in just before the module that needs it. */
  function plan(routeId, lang) {
    var R = ROUTES.filter(function (r) { return r.id === routeId; })[0];
    if (!R) return null;
    lang = R.langs.indexOf(lang) >= 0 ? lang : R.langs[0];
    var seen = {}, list = [];
    function add(id, kind, stage, visiting) {
      if (seen[id]) { if (kind === 'core' && seen[id].kind !== 'core') seen[id].kind = 'core'; return; }
      visiting = visiting || {};
      if (visiting[id]) return;
      visiting[id] = true;
      needs(id, lang).forEach(function (n) { add(n, kind === 'opt' ? 'opt' : 'core', stage, visiting); });
      seen[id] = { id: id, kind: kind, stage: stage };
      list.push(seen[id]);
    }
    R.stages.forEach(function (st, si) {
      st.mods.forEach(function (m) {
        var kind = (st.opt || []).indexOf(m) >= 0 ? 'opt' : (st.rec || []).indexOf(m) >= 0 ? 'rec' : 'core';
        resolve(m, lang).forEach(function (x) { add(x, kind, si); });
      });
    });
    var ext = [];
    (R.extensions || []).forEach(function (m) { resolve(m, lang).forEach(function (x) { if (!seen[x]) ext.push(x); }); });
    return { route: R, lang: lang, items: list, extensions: ext };
  }
  /* hours: { moduleId: hours }. Returns totals for the schedule table. */
  function schedule(routeId, lang, hours) {
    var p = plan(routeId, lang);
    if (!p) return null;
    var core = 0, rec = 0, opt = 0, ext = 0, proj = 0;
    p.items.forEach(function (it) { var h = hours[it.id] || 0; if (it.kind === 'core') core += h; else if (it.kind === 'rec') rec += h; else opt += h; });
    p.extensions.forEach(function (id) { ext += hours[id] || 0; });
    p.route.stages.forEach(function (st) { if (st.project && PROJECTS[st.project]) proj += PROJECTS[st.project].hours; });
    var revision = Math.round((core + rec) * REVISION);
    var total = core + rec + revision + proj;
    var weeks = {};
    [5, 10, 20, 40].forEach(function (w) { weeks[w] = Math.ceil(total / w); });
    var extWeeks = {};
    [5, 10, 20, 40].forEach(function (w) { extWeeks[w] = Math.ceil((opt + ext) * (1 + REVISION) / w); });
    return { core: core, rec: rec, opt: opt, ext: ext, projects: proj, revision: revision, total: total, weeks: weeks, extWeeks: extWeeks, plan: p };
  }
  return { NEEDS: NEEDS, RECS: RECS, PREP: PREP, ROUTES: ROUTES, PROJECTS: PROJECTS, LANG_ONLY: LANG_ONLY, REVISION: REVISION, resolve: resolve, needs: needs, recs: recs, plan: plan, schedule: schedule };
})();
if (typeof module !== 'undefined') module.exports = PATHS;
