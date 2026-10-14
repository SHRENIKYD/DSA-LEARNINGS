(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------------- shared helpers for prose + visualizers ---------------- */
  // C('List<T>') -> inline code with < > escaped; P(`...`) -> escaped code block for prose.
  function C(s) { return '<code>' + H.esc(s) + '</code>'; }
  function P(s) { return '<pre><code>' + H.esc(String(s).replace(/^\n+/, '').replace(/\s+$/, '')) + '</code></pre>'; }
  function one(k, cls) { var h = {}; h[k] = cls; return h; }
  function note(label, html) { return { type: 'text', label: label, html: html }; }
  function kvParse(input, defs) {
    // parses "a=1 b=2 c=x,y" into an object, falling back to defaults
    var o = {}, k;
    for (k in defs) o[k] = defs[k];
    String(input || '').replace(/([a-zA-Z]+)\s*=\s*([^\s]+)/g, function (_, key, val) { o[key] = val; return ''; });
    return o;
  }
  function num(v, lo, hi, name) {
    var n = Number(v);
    if (!isFinite(n) || Math.floor(n) !== n) throw new Error(name + ' must be a whole number');
    if (n < lo || n > hi) throw new Error(name + ' must be between ' + lo + ' and ' + hi);
    return n;
  }

  /* ======================================================================
     TOPIC 1 — Class loading, linking, initialization & parent delegation
     ====================================================================== */
  topics.push({
    title: 'Class Loading: Loaders, Delegation & the Load → Link → Init Lifecycle',
    analogy: `<p>Imagine a big company where a junior employee gets a request: <i>"Find me the file called <b>Invoice</b>."</i> The rule of the company is: <b>ask your boss first</b>. The junior asks the manager, the manager asks the director. The director checks the company vault (the official, trusted files). Only if the director says "not here" does the manager check the department cabinet, and only if <i>that</i> fails does the junior search their own desk. This way nobody can sneak a fake "Payroll" file onto their desk and have it replace the official one. That chain of asking-your-boss-first is exactly Java's <b>parent delegation model</b> for class loaders.</p>`,
    explain: `<p>Your ${C('.java')} files are compiled into ${C('.class')} files (bytecode). When the program runs, the JVM does <b>not</b> load every class up front. It loads each class <b>lazily</b> — the first time the code actually needs it. The part of the JVM that finds the bytes of a class and turns them into a usable ${C('Class')} object is called a <b>class loader</b>.</p>
<h4>1. The three built-in class loaders (Java 9+)</h4>
${H.table(['Loader', 'Loads what', 'getClassLoader() returns', 'Example classes'], [
  ['<b>Bootstrap</b>', 'Core platform modules such as ' + C('java.base') + ' (written in C++ inside the JVM)', H.c('y', C('null')), C('String') + ', ' + C('ArrayList') + ', ' + C('Thread')],
  ['<b>Platform</b> (was "Extension" before Java 9)', 'Other Java SE / JDK modules', 'platform loader', C('java.sql.Driver') + ', ' + C('java.net.http.HttpClient')],
  ['<b>Application</b> (a.k.a. "system")', 'Your classpath / module path (your jars, your code)', 'app loader', 'your ' + C('com.shop.Cart') + ', libraries'],
  ['<b>Custom</b> (optional)', 'Anything you decide: plugins, hot reload, encrypted jars, generated code', 'your loader', 'Tomcat web apps, OSGi bundles, IDE plugins']
])}
<h4>2. Parent delegation in one sentence</h4>
<p>When a loader is asked for a class it: <b>(1)</b> checks its own cache of already-loaded classes, <b>(2)</b> asks its <b>parent</b> to load it, and <b>(3)</b> only if the parent fails, tries to find it itself. The chain is App → Platform → Bootstrap.</p>
${P(`
// Simplified version of java.lang.ClassLoader.loadClass(...)
protected Class<?> loadClass(String name, boolean resolve) throws ClassNotFoundException {
    synchronized (getClassLoadingLock(name)) {
        Class<?> c = findLoadedClass(name);            // 1. already loaded by me?
        if (c == null) {
            try {
                c = parent != null ? parent.loadClass(name)          // 2. ask parent
                                   : findBootstrapClassOrNull(name); //    (top = bootstrap)
            } catch (ClassNotFoundException e) { /* parent could not find it */ }
            if (c == null) c = findClass(name);        // 3. my own search
        }
        if (resolve) resolveClass(c);
        return c;
    }
}`)}
<p><b>Why delegate?</b> Two reasons: <b>security</b> (nobody can ship their own fake ${C('java.lang.String')} and have it used, because the bootstrap loader always wins) and <b>consistency</b> (there is exactly one ${C('String')} class in the whole JVM, so every library agrees on what a String is).</p>
<h4>3. The lifecycle of a class: Load → Link → Initialize</h4>
${H.table(['Phase', 'What happens', 'Plain English'], [
  ['<b>Loading</b>', 'Find the bytes, parse the class file, create the ' + C('Class') + ' object, store class metadata in <b>Metaspace</b>', '"Bring the recipe card into the kitchen."'],
  ['<b>Linking: Verify</b>', 'Bytecode verifier checks the code is safe (types on the stack line up, no jumping into the middle of an instruction)', '"Check the recipe is not dangerous."'],
  ['<b>Linking: Prepare</b>', 'Allocate static fields and set them to <b>default values</b> (0, false, null)', '"Lay out empty bowls."'],
  ['<b>Linking: Resolve</b>', 'Turn symbolic references ("call Cart.add") into direct references. Usually lazy (on first use).', '"Look up page numbers referenced in the recipe."'],
  ['<b>Initialization</b>', 'Run ' + C('<clinit>') + ': static field initializers + static blocks, top to bottom, exactly once, thread-safely', '"Actually fill the bowls."']
])}
<h4>4. What triggers initialization?</h4>
<ul><li>${H.c('g', 'Triggers')}: ${C('new Foo()')}, calling a static method, reading/writing a non-constant static field, ${C('Class.forName("Foo")')}, initializing a subclass (parent first), reflection that invokes code, being the main class.</li>
<li>${H.c('r', 'Does NOT trigger')}: ${C('Foo.class')} literal, declaring ${C('Foo[] arr = new Foo[10]')}, reading a <b>compile-time constant</b> (${C('static final int MAX = 10')} is copied into the caller by javac), ${C('ClassLoader.loadClass("Foo")')} (loads but does not initialize).</li></ul>
<h4>5. Two errors people mix up</h4>
${H.table(['', 'ClassNotFoundException', 'NoClassDefFoundError'], [
  ['Type', 'Checked <b>exception</b>', '<b>Error</b> (LinkageError)'],
  ['When', 'You asked by <b>name</b> at runtime (' + C('Class.forName') + ', ' + C('loadClass') + ') and nobody found it', 'The class <b>was there at compile time</b> but is missing at runtime, or its static init failed earlier'],
  ['Typical cause', 'Wrong JDBC driver name, plugin jar not on path', 'Jar missing from deployment, version conflict, ' + C('ExceptionInInitializerError') + ' earlier ("Could not initialize class X")']
])}`,
    clues: [
      '"Why does <code>String.class.getClassLoader()</code> return null?" → bootstrap loader',
      '"Two copies of the same class, ClassCastException: <b>Cart cannot be cast to Cart</b>" → same name, different loaders',
      '"Plugin system / hot reload / app server isolating web apps" → custom class loader, child-first',
      '"ClassNotFoundException vs NoClassDefFoundError" → lookup by name vs missing-at-runtime/failed init',
      '"When is a static block executed?" / "lazy singleton without synchronized" → class initialization rules (holder idiom)',
      '"Metaspace keeps growing after every redeploy" → class loader leak (classes unload only with their loader)'
    ],
    code: [`
// A tiny custom class loader that defines classes from an in-memory map of bytes.
// Real uses: plugins, code generated at runtime, classes fetched from a database.
class InMemoryClassLoader extends ClassLoader {
    private final Map<String, byte[]> classes;

    InMemoryClassLoader(Map<String, byte[]> classes, ClassLoader parent) {
        super("in-memory", parent);          // named loaders show up nicely in stack traces (Java 9+)
        this.classes = classes;
    }

    // We only override findClass(): loadClass() keeps the parent-first delegation for us.
    @Override
    protected Class<?> findClass(String name) throws ClassNotFoundException {
        byte[] bytes = classes.get(name);
        if (bytes == null) throw new ClassNotFoundException(name);
        // defineClass parses + verifies the bytes and creates the Class object (stored in Metaspace)
        return defineClass(name, bytes, 0, bytes.length);
    }

    public static void main(String[] args) throws Exception {
        ClassLoader app = InMemoryClassLoader.class.getClassLoader();
        System.out.println("String loader   = " + String.class.getClassLoader());          // null = bootstrap
        System.out.println("my loader       = " + app.getName());                            // app
        System.out.println("its parent      = " + app.getParent().getName());                // platform
        InMemoryClassLoader mine = new InMemoryClassLoader(new HashMap<>(), app);
        // Parent delegation: "java.util.ArrayList" is found by bootstrap, never by us
        System.out.println("ArrayList via mine = " + mine.loadClass("java.util.ArrayList").getClassLoader());
    }
}`, `
// Initialization order demo: what prints and when?
class Config {
    static final int MAX = 10;                 // compile-time constant: inlined, no init needed to read it
    static int port = readPort();              // runs during <clinit>
    static { System.out.println("Config <clinit> runs, port=" + port); }
    static int readPort() { System.out.println("readPort()"); return 8080; }
}
class InitDemo {
    public static void main(String[] args) {
        System.out.println("MAX = " + Config.MAX);     // does NOT initialize Config
        Config[] many = new Config[3];                 // does NOT initialize Config
        System.out.println("array made, length " + many.length);
        System.out.println("port = " + Config.port);   // FIRST real use: readPort(), static block, then prints
    }
}`],
    codeTitle: ['Custom class loader that keeps parent-first delegation', 'When does a class get initialized?'],
    viz: [{
      title: 'Parent delegation: who actually loads this class?',
      input: 'com.shop.Cart',
      inputLabel: 'Class name (try java.lang.String, java.sql.Driver, com.shop.Cart, com.ghost.Nope)',
      gen: function (input) {
        var name = String(input || '').trim();
        if (!/^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$/.test(name)) throw new Error('Enter a fully-qualified class name like com.shop.Cart');
        if (name.length > 60) throw new Error('Keep the class name under 60 characters');
        var owner;
        if (/^com\.ghost\./.test(name) || /Nope$/.test(name)) owner = 'NONE';
        else if (/^(java\.sql\.|javax\.sql\.|java\.net\.http\.|java\.sql$)/.test(name)) owner = 'PLAT';
        else if (/^(java|javax|jdk\.internal|sun)\./.test(name)) owner = 'BOOT';
        else owner = 'APP';
        var nodes = [
          { id: 'REQ', label: 'your code: new ' + name.split('.').pop() + '()', x: 12, y: 58, shape: 'box', w: 22 },
          { id: 'APP', label: 'App loader', x: 45, y: 58, shape: 'box' },
          { id: 'PLAT', label: 'Platform loader', x: 45, y: 34, shape: 'box' },
          { id: 'BOOT', label: 'Bootstrap (C++)', x: 45, y: 10, shape: 'box' },
          { id: 'S_BOOT', label: 'java.base & core modules', x: 85, y: 10, shape: 'box', w: 26 },
          { id: 'S_PLAT', label: 'java.sql, java.net.http …', x: 85, y: 34, shape: 'box', w: 26 },
          { id: 'S_APP', label: 'classpath: app.jar, libs', x: 85, y: 58, shape: 'box', w: 26 }
        ];
        var edges = [['REQ', 'APP', 'load'], ['APP', 'PLAT', 'ask parent'], ['PLAT', 'BOOT', 'ask parent'], ['BOOT', 'S_BOOT', 'search'], ['PLAT', 'S_PLAT', 'search'], ['APP', 'S_APP', 'search']];
        function g(hl, ehl, tags) { return { type: 'graph', label: 'Class loader hierarchy (parent arrows point up)', directed: true, height: 70, nodes: nodes, edges: edges, hl: hl, ehl: ehl || {}, tags: tags || {} }; }
        function v(step, result) { return { type: 'vars', label: 'State', vals: { requested: name, step: step, result: result }, hl: { result: 'cur' } }; }
        var F = [];
        F.push({ narr: 'Your code needs <b>' + name + '</b> for the first time. The JVM asks the loader of the <i>current</i> class (the App loader) to load it.', parts: [g({ REQ: 'cur', APP: 'cur' }, { 'REQ-APP': 'cur' }), v('loadClass("' + name + '")', '?')] });
        F.push({ narr: 'Step 1 — App loader checks its own cache with <code>findLoadedClass</code>. First time → not there. It does <b>not</b> search the classpath yet: the rule is <b>ask your parent first</b>.', parts: [g({ APP: 'cur' }, {}, { APP: 'cache: miss' }), v('findLoadedClass → null', '?')] });
        F.push({ narr: 'Step 2 — App delegates up to the <b>Platform</b> loader, which also asks its parent first.', parts: [g({ APP: 'done', PLAT: 'cur' }, { 'APP-PLAT': 'cur' }), v('Platform.loadClass', '?')] });
        F.push({ narr: 'Step 3 — Platform delegates to the <b>Bootstrap</b> loader, the root. It is written in native code and represented as <code>null</code> in Java.', parts: [g({ PLAT: 'done', BOOT: 'cur' }, { 'PLAT-BOOT': 'cur' }), v('Bootstrap search', '?')] });
        if (owner === 'BOOT') {
          F.push({ narr: 'Bootstrap searches the core modules and <span class="c-g">finds it</span>. It defines the class, so <code>' + name + '.class.getClassLoader()</code> returns <b>null</b>. Your classpath was never even looked at — that is why nobody can override core classes.', parts: [g({ BOOT: 'ok', S_BOOT: 'ok' }, { 'BOOT-S_BOOT': 'ok' }, { BOOT: 'defines it' }), v('found in java.base', 'Class defined by bootstrap')] });
        } else {
          F.push({ narr: 'Bootstrap searches core modules: <span class="c-r">not found</span>. It returns null, and control comes back down to Platform.', parts: [g({ BOOT: 'bad', S_BOOT: 'bad' }, { 'BOOT-S_BOOT': 'bad' }), v('bootstrap → null', '?')] });
          if (owner === 'PLAT') {
            F.push({ narr: 'Platform loader searches its own modules and <span class="c-g">finds it</span>. Defining loader = <b>platform</b>.', parts: [g({ PLAT: 'ok', S_PLAT: 'ok', BOOT: 'done' }, { 'PLAT-S_PLAT': 'ok' }, { PLAT: 'defines it' }), v('found in platform module', 'Class defined by platform')] });
          } else {
            F.push({ narr: 'Platform loader searches its modules: <span class="c-r">not found</span>. Back down to the App loader.', parts: [g({ PLAT: 'bad', S_PLAT: 'bad', BOOT: 'done' }, { 'PLAT-S_PLAT': 'bad' }), v('platform → not found', '?')] });
            if (owner === 'APP') {
              F.push({ narr: 'Finally the App loader calls its own <code>findClass</code> and searches the <b>classpath</b>: <span class="c-g">found</span> in app.jar. Bytes are parsed, verified, and the <code>Class</code> object is created (metadata goes into Metaspace).', parts: [g({ APP: 'ok', S_APP: 'ok', PLAT: 'done', BOOT: 'done' }, { 'APP-S_APP': 'ok' }, { APP: 'defines it' }), v('found on classpath', 'Class defined by app loader')] });
            } else {
              F.push({ narr: 'App loader searches the classpath too: <span class="c-r">nothing</span>. Everyone failed → <b>ClassNotFoundException</b> (if you asked by name) or <b>NoClassDefFoundError</b> (if compiled code referenced it directly).', parts: [g({ APP: 'bad', S_APP: 'bad', PLAT: 'done', BOOT: 'done' }, { 'APP-S_APP': 'bad' }, { APP: 'gives up' }), v('all loaders failed', 'ClassNotFoundException')] });
              F.push({ narr: 'Fix: check the jar is really on the runtime classpath (<code>java -cp</code> / Maven scope), check spelling, and run with <code>-verbose:class</code> or <code>-Xlog:class+load</code> to see what IS being loaded.', parts: [note('Debug checklist', '<ul><li><code>java -Xlog:class+load=info -cp app.jar Main</code></li><li><code>mvn dependency:tree</code> — is the jar <code>provided</code>/<code>test</code> scoped?</li><li>Inside containers: is the jar actually copied into the image?</li></ul>')] });
              return F;
            }
          }
        }
        F.push({ narr: 'The class is now cached by its <b>defining loader</b>. Its identity in the JVM is the pair <b>(name, defining loader)</b>. Next request for the same name is answered instantly by <code>findLoadedClass</code> — no walk up the tree.', parts: [g({ REQ: 'ok', APP: 'ok' }, { 'REQ-APP': 'ok' }, { APP: 'cache: hit' }), v('second request', 'cache hit, same Class object')] });
        F.push({ narr: 'Then the class is <b>linked</b> (verify → prepare → resolve) and, on first active use, <b>initialized</b> (static initializers run once). See the next visualizer for that part.', parts: [note('Remember', 'Delegation decides <b>who</b> loads. Linking and initialization decide <b>when the code inside becomes ready</b>.')] });
        return F;
      }
    }, {
      title: 'Load → Verify → Prepare → Resolve → Initialize, step by step',
      gen: function () {
        var code = 'class Config {\n  static final int MAX = 10;      // constant\n  static int port = 8080;\n  static List<String> hosts = new ArrayList<>();\n  static {\n    hosts.add("db-1");\n  }\n}';
        function f(narr, hl, vals, vh, phase) {
          return { narr: narr, parts: [
            { type: 'code', label: 'Config.java', lang: 'java', code: code, hl: hl },
            { type: 'array', label: 'Lifecycle', values: ['Load', 'Verify', 'Prepare', 'Resolve', 'Init'], hl: phase },
            { type: 'vars', label: 'Static fields of Config', vals: vals, hl: vh }
          ] };
        }
        return [
          f('Nothing has happened yet: the class is just bytes inside a jar. The JVM loads classes <b>lazily</b>.', {}, { MAX: '—', port: '—', hosts: '—' }, {}, {}),
          f('<b>Load</b>: a loader finds <code>Config.class</code>, parses it and creates the <code>Class</code> object. Method bytecode, constant pool and field layout go into <b>Metaspace</b> (native memory).', { 1: 'cur' }, { MAX: '—', port: '—', hosts: '—' }, {}, { 0: 'cur' }),
          f('<b>Verify</b>: the bytecode verifier proves the code is type-safe (stack depths match, no bad casts at the bytecode level). Corrupt or hostile bytes fail here with <code>VerifyError</code>.', {}, { MAX: '—', port: '—', hosts: '—' }, {}, { 0: 'done', 1: 'cur' }),
          f('<b>Prepare</b>: memory for static fields is allocated and set to <b>default values</b> — 0 and null — not your values yet! (<code>MAX</code> is a ConstantValue attribute and is already 10.)', { 2: 'cur', 3: 'cur', 4: 'cur' }, { MAX: 10, port: 0, hosts: 'null' }, { port: 'cur', hosts: 'cur' }, { 0: 'done', 1: 'done', 2: 'cur' }),
          f('<b>Resolve</b>: symbolic references like "class java.util.ArrayList" or "method List.add" are turned into direct pointers. HotSpot does this lazily, the first time each instruction runs.', { 4: 'cur', 6: 'cur' }, { MAX: 10, port: 0, hosts: 'null' }, {}, { 0: 'done', 1: 'done', 2: 'done', 3: 'cur' }),
          f('<b>Initialize</b> (on first active use, e.g. reading <code>Config.port</code>): the compiler-generated <code>&lt;clinit&gt;</code> method runs the static initializers <b>in source order</b>. First <code>port = 8080</code>…', { 3: 'ok' }, { MAX: 10, port: 8080, hosts: 'null' }, { port: 'ok' }, { 0: 'done', 1: 'done', 2: 'done', 3: 'done', 4: 'cur' }),
          f('…then <code>hosts = new ArrayList&lt;&gt;()</code>, then the static block adds "db-1". The JVM holds an init lock: if two threads race, one runs <code>&lt;clinit&gt;</code> and the other waits. That is why the <b>holder idiom</b> singleton is thread-safe without <code>synchronized</code>.', { 4: 'ok', 5: 'ok', 6: 'ok' }, { MAX: 10, port: 8080, hosts: '[db-1]' }, { hosts: 'ok' }, { 0: 'done', 1: 'done', 2: 'done', 3: 'done', 4: 'ok' }),
          f('If <code>&lt;clinit&gt;</code> throws, the caller gets <code>ExceptionInInitializerError</code>, the class is marked <b>erroneous</b>, and every later use throws <code>NoClassDefFoundError: Could not initialize class Config</code>. Always look for the <b>first</b> error in the log.', { 5: 'bad' }, { MAX: 10, port: 8080, hosts: 'erroneous?' }, { hosts: 'bad' }, { 4: 'bad' })
        ];
      }
    }],
    examples: [
      { title: 'Printing the loader chain', html: `<p>${C('String.class.getClassLoader()')} prints <b>null</b> because the bootstrap loader is native and has no Java object. ${C('java.sql.Driver.class.getClassLoader()')} prints the platform loader, and your own class prints ${C('jdk.internal.loader.ClassLoaders$AppClassLoader')}. Interviewers love the "why null?" question.</p>`, code: `
System.out.println(String.class.getClassLoader());              // null  (bootstrap)
System.out.println(java.sql.Driver.class.getClassLoader().getName()); // platform
ClassLoader app = ClassLoader.getSystemClassLoader();
System.out.println(app.getName() + " -> parent " + app.getParent().getName()); // app -> parent platform` },
      { title: '"Cart cannot be cast to Cart" — same name, two loaders', html: `<p>An app server loads ${C('com.shop.Cart')} once for web app A and once for web app B with two different loaders. The JVM sees two <b>different</b> classes, because class identity is <b>(fully-qualified name + defining loader)</b>. Passing a Cart from A into code from B gives ${C('ClassCastException: class com.shop.Cart cannot be cast to class com.shop.Cart')} — the error message even prints both loader names in modern JDKs. Fix: put shared types (the API) in a <b>common parent loader</b> so both apps see the same Class object.</p>` },
      { title: 'Lazy, thread-safe singleton with the holder idiom', html: `<p>The nested ${C('Holder')} class is not initialized until ${C('getInstance()')} first touches ${C('Holder.INSTANCE')}. Class initialization is guaranteed by the JVM to run once, under a lock — so no ${C('volatile')} or double-checked locking is needed.</p>`, code: `
class Registry {
    private Registry() { System.out.println("Registry created"); }
    private static class Holder {                 // not initialized until first use
        static final Registry INSTANCE = new Registry();
    }
    static Registry getInstance() { return Holder.INSTANCE; }   // triggers Holder.<clinit> once
}` },
      { title: 'NoClassDefFoundError that is really an init failure', html: `<p>Log line 1: ${C('ExceptionInInitializerError ... Caused by: NumberFormatException: For input string: ""')} — a static field parsed an empty env variable. Log line 5000: ${C('NoClassDefFoundError: Could not initialize class com.shop.Settings')}. People search for the missing jar for hours. The real bug is line 1: the class exists, but its ${C('<clinit>')} failed once and the JVM refuses to retry.</p>` },
      { title: 'Thread context class loader (TCCL) — breaking delegation on purpose', html: `<p>${C('ServiceLoader')}, JDBC and JNDI live in the JDK (loaded high up), but they must find implementations that live in <b>your</b> jars (loaded lower down). A parent cannot see its children's classes, so these frameworks use ${C('Thread.currentThread().getContextClassLoader()')} — a "look down" escape hatch. Frameworks (Spring, Tomcat) set the TCCL per web app; forgetting to reset it in a thread pool is a classic source of "class not found only in production".</p>` }
    ],
    deepDive: `<p><b>Class identity and loader constraints.</b> HotSpot keys every class by (name, defining loader). When class A from loader L1 calls a method on B that mentions type T, the JVM records a <i>loader constraint</i> that T must resolve to the same Class in both loaders; violating it gives a ${C('LinkageError: loader constraint violation')}. This is what stops "type confusion" attacks between loaders.</p>
<p><b>Initiating vs defining loader.</b> The loader you asked is the <i>initiating</i> loader; the one that called ${C('defineClass')} is the <i>defining</i> loader. ${C('getClassLoader()')} returns the defining one. Delegation means the initiating loader is often not the defining loader.</p>
<p><b>Parallel-capable loaders.</b> Old loaders synchronized on the loader itself, causing contention and even deadlocks between loaders that delegate to each other. Since Java 7 a loader can call ${C('ClassLoader.registerAsParallelCapable()')} and locks per class name via ${C('getClassLoadingLock(name)')}.</p>
<p><b>Child-first loaders.</b> Tomcat's WebappClassLoader and many plugin systems check their own jars <i>before</i> the parent (except for ${C('java.*')} which must stay parent-first) so each app can bundle its own library versions. OSGi and JPMS layers take this further with explicit graphs of who can see which package.</p>
<p><b>Class unloading.</b> A class can only be unloaded when its <b>defining loader</b> becomes unreachable — meaning no instance of any of its classes, no ${C('Class')} object, and no reference to the loader remain. That is why one stray reference (a ThreadLocal value, a JDBC driver registered in ${C('DriverManager')}, a shutdown hook, a static cache in a parent loader) pins an entire web app's classes and leaks Metaspace on every redeploy.</p>
<p><b>Startup cost and CDS.</b> Loading + verifying thousands of classes dominates startup. <b>Class Data Sharing</b> (CDS, on by default for JDK classes) memory-maps a pre-parsed archive; AppCDS extends it to your classes. JDK 24's JEP 483 (Project Leyden) added an <b>AOT cache</b> that stores classes already loaded and linked, and JDK 25 adds AOT method profiles, cutting warm-up further. Verification can be skipped for trusted archived classes, which is part of the speed-up.</p>
<p><b>Hidden classes</b> (Java 15+, ${C('Lookup.defineHiddenClass')}) are what lambdas and dynamic proxies use now: they are not discoverable by name, can be unloaded independently, and replaced the internal ${C('Unsafe.defineAnonymousClass')}.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants can instantly explain a stack trace like ${C('LinkageError: loader constraint violation')} or generate a working custom class loader. Ask: <i>"Here is my mvn dependency:tree and the NoClassDefFoundError. Which two jars provide this class and which loader wins?"</i> — that saves real time.</p>
<p><b>Where AI goes wrong:</b> it often suggests overriding ${C('loadClass')} in a way that breaks parent-first for ${C('java.*')} (instant ${C('SecurityException: Prohibited package name')}), confuses ClassNotFoundException with NoClassDefFoundError, or recommends the long-gone Extension mechanism and ${C('-Djava.ext.dirs')} (removed in Java 9). It also tends to suggest "add the jar" when the real cause is a failed static initializer earlier in the log.</p>
<p><b>What you still own:</b> knowing the delegation rules, reading ${C('-Xlog:class+load')} output, reasoning about which loader defines a type in a multi-loader app (Spring Boot fat jars, app servers, Gradle plugins), and spotting loader leaks during redeploys. Agentic coding tools that hot-reload code (dev servers, notebooks, plugin sandboxes for AI tools) are built on exactly these mechanics.</p>`,
    problems: [{
      title: 'Child-First Plugin Class Loader',
      level: 'Medium', tags: ['class loading', 'delegation', 'plugins'], companies: ['Atlassian', 'JetBrains', 'Oracle'],
      statement: `<p>Your host application uses <b>Jackson 2.15</b>. A plugin bundles <b>Jackson 2.17</b> and needs its own version. With the default parent-first loader, the plugin always gets the host's 2.15 classes and crashes with ${C('NoSuchMethodError')}.</p><p>Write ${C('PluginClassLoader')} that loads classes from a ${C('Map<String, byte[]>')} (the plugin jar's contents) using <b>child-first</b> order for plugin classes, but <b>parent-first</b> for ${C('java.')}, ${C('javax.')}, ${C('jdk.')}, ${C('sun.')} and the shared host API package ${C('com.host.api.')} (so host and plugin agree on the API types).</p>`,
      constraints: `Must be thread-safe (two threads may load the same class). Must not define a class twice. Must fall back to the parent if the plugin does not contain the class.`,
      example: `<p>Requests in order:</p>${H.table(['loadClass(name)', 'Rule', 'Who defines it'], [[C('java.lang.String'), 'parent-first prefix', H.c('b', 'bootstrap')], [C('com.fasterxml.jackson.databind.ObjectMapper'), 'child-first, plugin has it', H.c('g', 'plugin loader (2.17)')], [C('com.host.api.Plugin'), 'parent-first prefix', H.c('b', 'host app loader')], [C('org.slf4j.Logger'), 'child-first, plugin lacks it → parent', H.c('y', 'host app loader')]])}<p>Why: the plugin wins for its own libraries, but API types must be the <b>same Class object</b> in host and plugin or casts fail.</p>`,
      brute: { why: `<p>Just use a normal ${C('URLClassLoader')} with the host loader as parent. It is parent-first: the host's Jackson 2.15 is found first, the plugin's 2.17 is never used, and the plugin calls a method that does not exist in 2.15 → ${C('NoSuchMethodError')} at runtime.</p>`, code: `
import java.net.*;
class NaivePluginLoading {
    static ClassLoader forPlugin(URL pluginJar, ClassLoader host) {
        // Parent-first: host's copy of every shared library always wins.
        return new URLClassLoader(new URL[] { pluginJar }, host);
    }
}` },
      mcq: { q: 'Why must <code>com.host.api.*</code> stay parent-first even in a child-first loader?', options: ['So the host and plugin share ONE Class object for the API types; otherwise casting a plugin object to the host interface fails', 'Because the JVM forbids child-first for any package', 'To make class loading faster', 'Because API classes are always loaded by bootstrap'], answer: 0, explain: 'Class identity = name + defining loader. If the plugin defines its own copy of the Plugin interface, the host cannot cast the plugin object to ITS Plugin interface.' },
      hints: [`<p>Hint 1: Override ${C('loadClass(String, boolean)')}, not only ${C('findClass')}. ${C('findClass')} alone keeps parent-first order.</p>`, `<p>Hint 2: Always check ${C('findLoadedClass(name)')} first, and wrap the logic in ${C('synchronized (getClassLoadingLock(name))')} so two threads cannot define the same class twice (that throws ${C('LinkageError: duplicate class definition')}).</p>`, `<p>Hint 3: Recipe — cached? return it. Parent-first prefix? ask parent. Else try ${C('findClass')} (your map), and if that throws ${C('ClassNotFoundException')}, fall back to the parent. Finally ${C('resolveClass')} if asked.</p>`],
      solution: {
        approach: `<p>Invert the order only for non-shared packages. Keep the per-name lock and the cache check from the JDK implementation, then decide parent-first or child-first by prefix. Register the loader as parallel-capable so the per-name locks are used instead of locking the whole loader.</p>`,
        code: `
class PluginClassLoader extends ClassLoader {
    static { ClassLoader.registerAsParallelCapable(); }     // lock per class name, not per loader

    private static final List<String> PARENT_FIRST =
            List.of("java.", "javax.", "jdk.", "sun.", "com.host.api.");
    private final Map<String, byte[]> pluginClasses;          // class name -> bytecode from the plugin jar

    PluginClassLoader(Map<String, byte[]> pluginClasses, ClassLoader parent) {
        super("plugin", Objects.requireNonNull(parent));
        this.pluginClasses = Map.copyOf(pluginClasses);
    }

    @Override
    protected Class<?> loadClass(String name, boolean resolve) throws ClassNotFoundException {
        synchronized (getClassLoadingLock(name)) {
            Class<?> c = findLoadedClass(name);               // 1. already defined by us?
            if (c == null) {
                if (isParentFirst(name)) {
                    c = getParent().loadClass(name);          // 2a. shared/JDK types: parent wins
                } else {
                    try {
                        c = findClass(name);                  // 2b. child-first: plugin's own copy
                    } catch (ClassNotFoundException notInPlugin) {
                        c = getParent().loadClass(name);      // 3. fall back to the host
                    }
                }
            }
            if (resolve) resolveClass(c);
            return c;
        }
    }

    @Override
    protected Class<?> findClass(String name) throws ClassNotFoundException {
        byte[] bytes = pluginClasses.get(name);
        if (bytes == null) throw new ClassNotFoundException(name);
        return defineClass(name, bytes, 0, bytes.length);
    }

    private static boolean isParentFirst(String name) {
        for (String prefix : PARENT_FIRST) if (name.startsWith(prefix)) return true;
        return false;
    }
}`,
        dry: { head: ['request', 'cached?', 'parent-first?', 'action', 'defined by'], rows: [
          ['java.lang.String', 'no', 'yes (java.)', 'parent.loadClass', 'bootstrap'],
          ['…jackson…ObjectMapper', 'no', 'no', 'findClass → bytes found → defineClass', H.c('g', 'plugin')],
          ['…jackson…ObjectMapper (again)', H.c('g', 'yes'), '—', 'return cached', 'plugin'],
          ['com.host.api.Plugin', 'no', 'yes (com.host.api.)', 'parent.loadClass', 'host app loader'],
          ['org.slf4j.Logger', 'no', 'no', 'findClass throws → parent.loadClass', H.c('y', 'host app loader')]
        ] },
        complexity: `<p>Each lookup is O(P) for the prefix check (P = 5 prefixes) plus a hash lookup; defining a class is O(size of bytecode) once. Memory: the byte map can be dropped after all classes are defined in a long-lived plugin.</p>`,
        followUps: ['How would you unload the plugin and verify Metaspace is reclaimed?', 'How does JPMS (ModuleLayer) solve the same problem without custom loaders?', 'What breaks if the plugin bundles its own copy of the host API jar?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 2 — Bytecode basics: the stack machine, javap, invoke* opcodes
     ====================================================================== */
  topics.push({
    title: 'Bytecode Basics: The JVM as a Stack Machine (javap, opcodes, invoke*)',
    analogy: `<p>Think of an old-fashioned calculator that uses a <b>stack of plates</b>. To compute <b>3 × 4 + 2</b> you put plate "3" on the pile, then plate "4", press <b>×</b> (it takes the top two plates off and puts back "12"), put plate "2" on top, press <b>+</b> (takes "12" and "2", puts back "14"). Nobody ever names a "register" — everything happens on top of the pile. Java bytecode is a list of instructions for exactly this kind of plate-stack calculator, plus a numbered row of drawers (local variables) to keep values in.</p>`,
    explain: `<p><b>Bytecode</b> is what ${C('javac')} produces: a compact, portable instruction set stored in ${C('.class')} files. Each instruction is one byte (an <b>opcode</b>, hence "byte-code") plus optional operands. The same ${C('.class')} runs on any OS because the JVM, not the CPU, understands it.</p>
<h4>1. The two work areas of every method call (a "frame")</h4>
<ul><li><b>Local variable array</b> — numbered slots. For an instance method, slot 0 is ${C('this')}; then parameters; then locals. ${C('long')} and ${C('double')} take <b>two</b> slots.</li>
<li><b>Operand stack</b> — the pile of plates. Instructions pop inputs and push results. Its maximum depth (${C('max_stack')}) is computed by javac and checked by the verifier.</li></ul>
<h4>2. See it yourself with javap</h4>
${P(`
static int calc(int a, int b) {        // javac Calc.java && javap -c Calc
    int c = a * b + 2;
    return c;
}
// Output of javap -c:
//  0: iload_0      push local 0 (a)
//  1: iload_1      push local 1 (b)
//  2: imul         pop 2, push a*b
//  3: iconst_2     push the constant 2
//  4: iadd         pop 2, push a*b+2
//  5: istore_2     pop into local 2 (c)
//  6: iload_2      push c
//  7: ireturn      return top of stack`)}
<p>The first letter is the <b>type prefix</b>: ${C('i')} int, ${C('l')} long, ${C('f')} float, ${C('d')} double, ${C('a')} reference (address). So ${C('aload_0')} pushes ${C('this')}, ${C('lstore')} stores a long, ${C('areturn')} returns an object.</p>
<h4>3. The opcodes you should recognise</h4>
${H.table(['Group', 'Opcodes', 'Meaning'], [
  ['Load/store', C('iload, aload, istore, astore'), 'move between locals and the stack'],
  ['Constants', C('iconst_0..5, bipush, sipush, ldc'), 'push small ints / pool constants (strings, big numbers)'],
  ['Math', C('iadd, isub, imul, idiv, irem, iinc'), 'arithmetic (' + C('iinc') + ' changes a local directly, no stack)'],
  ['Objects', C('new, dup, getfield, putfield, getstatic, checkcast, instanceof'), 'create objects, read fields, casts'],
  ['Branching', C('ifeq, if_icmpge, goto, tableswitch, lookupswitch'), 'loops and if/switch'],
  ['Calls', C('invokestatic, invokevirtual, invokeinterface, invokespecial, invokedynamic'), 'the five ways to call code'],
  ['Return/throw', C('ireturn, areturn, return, athrow'), 'leave the method']
])}
<h4>4. The five invoke instructions</h4>
${H.table(['Instruction', 'Used for', 'Dispatch'], [
  [C('invokestatic'), 'static methods', 'fixed target, no receiver'],
  [C('invokespecial'), 'constructors ' + C('<init>') + ', ' + C('super.foo()') + ', (older) private methods', 'fixed target'],
  [C('invokevirtual'), 'normal instance methods on a class type', 'dynamic: looks up the receiver\'s class (vtable)'],
  [C('invokeinterface'), 'calls through an interface type', 'dynamic: itable search'],
  [C('invokedynamic'), 'lambdas, string concatenation (Java 9+), records\' toString/equals, pattern-matching switch', 'a bootstrap method links the call site at first execution']
])}
<p><b>Why care?</b> Bytecode explains "tricky output" questions (${C('i = i++')}), why ${C('+')} string concatenation in a loop is slow (or not), what autoboxing really costs (${C('Integer.valueOf')} calls appear), and what the JIT has to work with.</p>`,
    clues: [
      '"What does <code>i = i++</code> print?" → read the bytecode: iload, iinc, istore',
      '"Is string concatenation with + slow?" → invokedynamic StringConcatFactory (Java 9+) vs StringBuilder in a loop',
      '"How are lambdas implemented?" → invokedynamic + LambdaMetafactory, not anonymous inner classes',
      '"Difference between invokevirtual and invokeinterface / invokespecial" → dispatch rules',
      '"Unsupported class file major version 65" → compiled with a newer JDK than the runtime (65 = Java 21)',
      '"Bytecode instrumentation / agents / ASM / ByteBuddy" → modifying class bytes at load time'
    ],
    code: [`
// Compile and inspect:  javac Demo.java  &&  javap -c -p Demo
class Demo {
    int counter;

    int next() { return ++counter; }       // aload_0, dup, getfield, iconst_1, iadd, dup_x1, putfield, ireturn

    static String greet(String name, int n) {
        return "Hi " + name + " #" + n;    // Java 9+: ONE invokedynamic makeConcatWithConstants, no StringBuilder
    }

    static int sum(List<Integer> xs) {
        int s = 0;
        for (int x : xs) s += x;            // invokeinterface Iterator.next + checkcast Integer + invokevirtual intValue (unboxing)
        return s;
    }

    public static void main(String[] args) {
        Runnable r = () -> System.out.println("lambda");   // invokedynamic -> LambdaMetafactory.metafactory
        r.run();                                           // invokeinterface Runnable.run
        System.out.println(greet("asha", 7));              // invokestatic Demo.greet
        System.out.println(sum(List.of(1, 2, 3)));         // invokestatic List.of (interface static) + Demo.sum
    }
}`, { lang: 'bash', title: 'Useful javap commands', code: `javac Demo.java
javap -c Demo                 # disassemble public/package methods
javap -c -p Demo              # include private members (and lambda bodies lambda$main$0)
javap -v Demo                 # verbose: constant pool, max_stack, max_locals, major version
javap -v Demo | grep major    # "major version: 65" means compiled for Java 21` }],
    codeTitle: ['Source that produces interesting bytecode', 'Inspecting bytecode'],
    viz: [{
      title: 'Run bytecode by hand: operand stack + local variables',
      input: 'a=3 b=4',
      inputLabel: 'Arguments for calc(a, b) = a * b + 2 (e.g. a=3 b=4)',
      gen: function (input) {
        var o = kvParse(input, { a: 3, b: 4 });
        var a = num(o.a, -1000, 1000, 'a'), b = num(o.b, -1000, 1000, 'b');
        var code = '0: iload_0\n1: iload_1\n2: imul\n3: iconst_2\n4: iadd\n5: istore_2\n6: iload_2\n7: ireturn';
        var src = { type: 'code', label: 'Source', lang: 'java', code: 'static int calc(int a, int b) {\n  int c = a * b + 2;\n  return c;\n}', hl: { 2: 'cur' } };
        var steps = [
          { l: 0, st: [], loc: { '0 (a)': a, '1 (b)': b, '2 (c)': '?' }, narr: 'A new <b>frame</b> is pushed for <code>calc</code>. Parameters are copied into local slots 0 and 1. Slot 2 (c) is reserved but not yet assigned. The operand stack is empty.' },
          { l: 1, st: [a], loc: { '0 (a)': a, '1 (b)': b, '2 (c)': '?' }, hv: '0 (a)', narr: '<code>iload_0</code>: copy local 0 (a = ' + a + ') onto the stack. The local keeps its value — load means <i>copy</i>.' },
          { l: 2, st: [a, b], loc: { '0 (a)': a, '1 (b)': b, '2 (c)': '?' }, hv: '1 (b)', narr: '<code>iload_1</code>: push b = ' + b + '. Two plates on the pile now.' },
          { l: 3, st: [a * b], loc: { '0 (a)': a, '1 (b)': b, '2 (c)': '?' }, narr: '<code>imul</code>: pop two ints, push their product ' + a + ' × ' + b + ' = <b>' + (a * b) + '</b>. No operand names needed — the stack <i>is</i> the operand.' },
          { l: 4, st: [a * b, 2], loc: { '0 (a)': a, '1 (b)': b, '2 (c)': '?' }, narr: '<code>iconst_2</code>: push the constant 2. Small ints −1..5 have their own one-byte opcodes (<code>iconst_m1</code>…<code>iconst_5</code>); bigger ones use <code>bipush</code>/<code>sipush</code>/<code>ldc</code>.' },
          { l: 5, st: [a * b + 2], loc: { '0 (a)': a, '1 (b)': b, '2 (c)': '?' }, narr: '<code>iadd</code>: pop two, push ' + (a * b) + ' + 2 = <b>' + (a * b + 2) + '</b>. (Integer overflow wraps silently here, just like in Java source.)' },
          { l: 6, st: [], loc: { '0 (a)': a, '1 (b)': b, '2 (c)': a * b + 2 }, hv: '2 (c)', narr: '<code>istore_2</code>: pop the top into local 2. Now <b>c = ' + (a * b + 2) + '</b> and the stack is empty again. max_stack for this method = 2.' },
          { l: 7, st: [a * b + 2], loc: { '0 (a)': a, '1 (b)': b, '2 (c)': a * b + 2 }, hv: '2 (c)', narr: '<code>iload_2</code>: push c back. (javac does not optimise away the store/load pair — the JIT will, later.)' },
          { l: 8, st: [], loc: { '0 (a)': a, '1 (b)': b, '2 (c)': a * b + 2 }, narr: '<code>ireturn</code>: pop the int and hand it to the caller\'s operand stack. This frame is discarded. Result = <b>' + (a * b + 2) + '</b>.' }
        ];
        return steps.map(function (s) {
          var hl = {}; hl[s.l] = 'cur';
          var vh = {}; if (s.hv) vh[s.hv] = 'ok';
          return { narr: s.narr, parts: [src, { type: 'code', label: 'Bytecode (javap -c)', lang: 'text', code: code, hl: hl }, { type: 'stack', label: 'Operand stack (top = right)', items: s.st, hl: s.st.length ? one(s.st.length - 1, 'cur') : {} }, { type: 'vars', label: 'Local variable slots', vals: s.loc, hl: vh }] };
        });
      }
    }, {
      title: 'The famous trap: i = i++ versus i = ++i',
      input: 'i=5',
      inputLabel: 'Starting value of i',
      gen: function (input) {
        var i0 = num(kvParse(input, { i: 5 }).i, -100, 100, 'i');
        var F = [], code1 = 'iload_1      // push OLD value of i\niinc 1, 1    // local i += 1 (stack untouched!)\nistore_1     // overwrite i with OLD value';
        var code2 = 'iinc 1, 1    // local i += 1 first\niload_1      // push NEW value\nistore_1     // store it back';
        function fr(narr, c, label, line, st, iv, cls) {
          return { narr: narr, parts: [{ type: 'code', label: label, lang: 'text', code: c, hl: line ? one(line, cls || 'cur') : {} }, { type: 'stack', label: 'Operand stack', items: st }, { type: 'vars', label: 'Local slot 1', vals: { i: iv }, hl: { i: cls || 'cur' } }] };
        }
        F.push(fr('Start: <code>int i = ' + i0 + '; i = i++;</code> — javac turns the right-hand side into these three instructions.', code1, 'i = i++;', 0, [], i0));
        F.push(fr('<code>iload_1</code>: the <b>old</b> value ' + i0 + ' is copied onto the operand stack. Post-increment means "use the old value".', code1, 'i = i++;', 1, [i0], i0));
        F.push(fr('<code>iinc 1, 1</code>: the local variable itself becomes ' + (i0 + 1) + '. Note the stack still holds the old ' + i0 + '.', code1, 'i = i++;', 2, [i0], i0 + 1, 'ok'));
        F.push(fr('<code>istore_1</code>: the assignment <code>i = …</code> pops the old ' + i0 + ' and <span class="c-r">overwrites</span> the incremented local. Final i = <b>' + i0 + '</b>. The increment was lost!', code1, 'i = i++;', 3, [], i0, 'bad'));
        F.push(fr('Now <code>i = ++i;</code> with i = ' + i0 + '. Pre-increment: <code>iinc</code> runs first.', code2, 'i = ++i;', 1, [], i0 + 1, 'ok'));
        F.push(fr('<code>iload_1</code> pushes the <b>new</b> value ' + (i0 + 1) + '.', code2, 'i = ++i;', 2, [i0 + 1], i0 + 1));
        F.push(fr('<code>istore_1</code> stores ' + (i0 + 1) + ' back — same value. Final i = <b>' + (i0 + 1) + '</b>. Lesson: never assign a variable to its own post-increment; just write <code>i++;</code>.', code2, 'i = ++i;', 3, [], i0 + 1, 'ok'));
        return F;
      }
    }],
    examples: [
      { title: 'Constructor call = new, dup, invokespecial', html: `<p>${C('Point p = new Point(1, 2);')} compiles to: ${C('new Point')} (allocate, push ref), ${C('dup')} (we need the ref twice: once to call the constructor, once to store), ${C('iconst_1')}, ${C('iconst_2')}, ${C('invokespecial Point.<init>(II)V')} (consumes one copy), ${C('astore_1')} (stores the other). That ${C('dup')} is why an object can be allocated but not yet constructed — a fact that matters for double-checked locking without ${C('volatile')}.</p>` },
      { title: 'switch on int: tableswitch vs lookupswitch', html: `<p>Dense cases (1,2,3,4) compile to ${C('tableswitch')}: an O(1) jump table indexed by value. Sparse cases (1, 100, 5000) compile to ${C('lookupswitch')}: a sorted key list searched in O(log n). A ${C('switch')} on a String first switches on ${C('hashCode()')} then calls ${C('equals')}. Pattern-matching switch (Java 21) uses ${C('invokedynamic')} with ${C('SwitchBootstraps.typeSwitch')}.</p>` },
      { title: 'Autoboxing is visible in bytecode', html: `<p>${C('List<Integer> xs; xs.add(5);')} becomes ${C('iconst_5; invokestatic Integer.valueOf; invokeinterface List.add')}. And ${C('int x = xs.get(0);')} becomes ${C('invokeinterface List.get; checkcast Integer; invokevirtual Integer.intValue')}. Every hidden call is a potential allocation (for values outside −128..127) and a potential ${C('NullPointerException')}.</p>`, code: `
List<Integer> xs = new ArrayList<>();
xs.add(5);                 // Integer.valueOf(5)  -> cached instance
xs.add(1000);              // Integer.valueOf(1000) -> NEW object each time (outside the cache)
int first = xs.get(0);     // checkcast Integer + intValue()
System.out.println(first + xs.get(1));` },
      { title: 'try/finally duplicates the finally block', html: `<p>javac copies the ${C('finally')} code onto <b>every</b> exit path (normal return, each catch, the exception path) and records an exception table entry: "if anything between offsets 0 and 12 throws, jump to 20". So a big finally block grows bytecode size several times — relevant because the JIT refuses to inline methods above certain bytecode sizes.</p>` },
      { title: '"Unsupported class file major version"', html: `<p>Every class file starts with magic ${C('0xCAFEBABE')} then a version. Java 8 = 52, 11 = 55, 17 = 61, <b>21 = 65</b>, 25 = 69. If you compile with JDK 21 and run on a Java 17 runtime you get ${C('UnsupportedClassVersionError ... class file version 65.0, this version only recognizes up to 61.0')}. Fix: run on a newer JDK or compile with ${C('javac --release 17')}.</p>` }
    ],
    deepDive: `<p><b>The verifier.</b> Since Java 7 class files carry a ${C('StackMapTable')} that declares the types on the stack and in locals at every branch target. The verifier type-checks in a single linear pass instead of the old slow type-inference verifier. This is why bytecode generators (ASM, ByteBuddy) need ${C('COMPUTE_FRAMES')}.</p>
<p><b>invokedynamic</b> (Java 7, used by javac since Java 8). The first time a call site runs, the JVM calls a <i>bootstrap method</i> which returns a ${C('CallSite')} bound to a ${C('MethodHandle')}; later executions jump straight to the target and the JIT can inline through it. Lambdas use ${C('LambdaMetafactory')} to spin a hidden class implementing the functional interface; non-capturing lambdas become singletons. String concatenation since JDK 9 (JEP 280) uses ${C('StringConcatFactory')}, letting the JDK improve concat strategy without recompiling your code. ${C('ConstantDynamic')} (condy, Java 11) does the same for lazily computed constants.</p>
<p><b>Nestmates</b> (Java 11): private members of inner classes used to need synthetic ${C('access$000')} bridge methods; now the JVM lets nestmates call each other's privates directly with ${C('invokevirtual')}/${C('invokeinterface')}.</p>
<p><b>Bytecode is not what runs hot.</b> The interpreter executes it, but hot methods are compiled to machine code by the JIT, which sees through store/load pairs, boxing and virtual calls. So micro-optimising bytecode by hand rarely matters; bytecode <i>size</i> does matter (inlining thresholds such as ${C('MaxInlineSize=35')} bytes and ${C('FreqInlineSize=325')} bytes), and methods above 8000 bytes (${C('HugeMethodLimit')}) are not compiled at all by default.</p>
<p><b>Class-File API.</b> JDK 24 finalized ${C('java.lang.classfile')} (JEP 484), a standard API to read, write and transform class files, so agents and frameworks no longer have to bundle a version of ASM that must keep up with every new class-file version.</p>
<p><b>Java agents.</b> ${C('-javaagent:agent.jar')} gives a ${C('premain')} an ${C('Instrumentation')} object; a ${C('ClassFileTransformer')} can rewrite bytes as classes load. APM tools (OpenTelemetry Java agent, Datadog), mocking libraries and coverage tools (JaCoCo) all work this way.</p>`,
    aiEra: `<p><b>What AI changes:</b> you can paste ${C('javap -c')} output into an assistant and ask "explain this line by line" or "why is there a checkcast here?" — a great tutor for learning the instruction set. AI can also draft ByteBuddy/ASM transformers and Java agents quickly.</p>
<p><b>Where AI goes wrong:</b> it often claims Java string concatenation "always compiles to StringBuilder" (true only before Java 9), invents opcodes, miscounts slots for ${C('long')}/${C('double')}, or reasons about performance from bytecode without considering the JIT. Generated agents frequently forget ${C('COMPUTE_FRAMES')} and fail with ${C('VerifyError')}.</p>
<p><b>What you still own:</b> reading javap output well enough to settle output-prediction questions, knowing which invoke instruction and dispatch cost applies, understanding that bytecode generation is a security and correctness boundary (the verifier), and checking AI claims with a quick ${C('javap')} run instead of trusting them.</p>`,
    problems: [{
      title: 'Build a Mini JVM: Interpret Stack Bytecode',
      level: 'Medium', tags: ['bytecode', 'stack machine', 'simulation'], companies: ['Oracle', 'Google', 'Uber'],
      statement: `<p>Write ${C('int run(String[] program, int[] args)')} that interprets a tiny subset of JVM bytecode. Each line is one instruction: ${C('iconst N')}, ${C('iload K')}, ${C('istore K')}, ${C('iadd')}, ${C('isub')}, ${C('imul')}, ${C('iinc K D')}, ${C('if_icmpgt T')} (pop b, pop a, jump to line T if a &gt; b), ${C('goto T')}, ${C('ireturn')}. Locals start with ${C('args')} in slots 0.. and have 8 slots total.</p>`,
      constraints: `Program ≤ 1000 lines, ≤ 10<sup>6</sup> executed instructions, stack depth ≤ 64. Throw an exception for unknown opcodes, stack underflow or falling off the end without ireturn.`,
      example: `<p>Sum 1..n with n = 4 in slot 0:</p>${P(`
0: iconst 0
1: istore 1      // sum = 0
2: iconst 1
3: istore 2      // i = 1
4: iload 2
5: iload 0
6: if_icmpgt 13  // if i > n jump to end
7: iload 1
8: iload 2
9: iadd
10: istore 1     // sum += i
11: iinc 2 1     // i++
12: goto 4
13: iload 1
14: ireturn`)}<p>Output ${H.c('g', '10')} because the loop adds 1+2+3+4 and exits when i becomes 5.</p>`,
      brute: { why: `<p>A tempting shortcut is to convert the program back to Java source text and evaluate it with an expression library, or to recursively re-scan the whole program for each jump label. That is slow, fragile, and misses the point: a JVM interpreter is a <b>fetch–decode–execute loop</b> with a program counter. The naive version below re-parses every line on every execution, wasting work inside loops.</p>`, code: `
class SlowMiniJvm {
    // Re-splits the instruction text every time it executes: O(len) string work per step.
    static int run(String[] program, int[] args) {
        int[] locals = new int[8];
        System.arraycopy(args, 0, locals, 0, args.length);
        Deque<Integer> st = new ArrayDeque<>();
        int pc = 0;
        while (true) {
            String[] p = program[pc].trim().split(" +");
            if (p[0].equals("ireturn")) return st.pop();
            if (p[0].equals("iconst")) st.push(Integer.parseInt(p[1]));
            else if (p[0].equals("iload")) st.push(locals[Integer.parseInt(p[1])]);
            else if (p[0].equals("istore")) locals[Integer.parseInt(p[1])] = st.pop();
            else if (p[0].equals("iadd")) st.push(st.pop() + st.pop());
            else if (p[0].equals("isub")) { int b = st.pop(); st.push(st.pop() - b); }
            else if (p[0].equals("imul")) st.push(st.pop() * st.pop());
            else if (p[0].equals("iinc")) locals[Integer.parseInt(p[1])] += Integer.parseInt(p[2]);
            else if (p[0].equals("goto")) { pc = Integer.parseInt(p[1]); continue; }
            else if (p[0].equals("if_icmpgt")) { int b = st.pop(), a = st.pop(); if (a > b) { pc = Integer.parseInt(p[1]); continue; } }
            pc++;
        }
    }
}` },
      mcq: { q: 'For <code>isub</code>, the stack holds [a, b] with b on top. What must the interpreter push?', options: ['a − b (pop b first, then a)', 'b − a', 'a + b', 'It depends on the JIT'], answer: 0, explain: 'Operands are pushed left to right, so the right operand is on top. Pop b, pop a, push a − b. Getting this order wrong is the classic interpreter bug.' },
      hints: [`<p>Hint 1: An interpreter is just ${C('while (true) { fetch instruction at pc; decode; execute; pc++ }')}. Jumps set pc and skip the increment.</p>`, `<p>Hint 2: <b>Decode once</b>: pre-parse every line into an int opcode and int operands (arrays), so the hot loop does no string work — this is exactly what real JVMs do (bytecode is already binary).</p>`, `<p>Hint 3: Use an ${C('int[]')} as the operand stack with a ${C('sp')} index (no boxing). Check underflow (sp == 0 before pop), overflow (sp == 64), and count steps to stop infinite loops.</p>`],
      solution: {
        approach: `<p>Pre-decode into parallel arrays (opcode, arg1, arg2), then run a tight switch loop on primitives — the same "decode once, dispatch fast" idea the HotSpot template interpreter uses. Jumps assign pc directly. The order of pops for non-commutative operations mirrors the JVM spec.</p>`,
        code: `
class MiniJvm {
    static final int ICONST = 0, ILOAD = 1, ISTORE = 2, IADD = 3, ISUB = 4, IMUL = 5,
                     IINC = 6, IF_ICMPGT = 7, GOTO = 8, IRETURN = 9;

    static int run(String[] program, int[] args) {
        int n = program.length;
        int[] op = new int[n], x = new int[n], y = new int[n];
        for (int i = 0; i < n; i++) {                       // ---- decode once ----
            String[] p = program[i].trim().split(" +");
            op[i] = switch (p[0]) {
                case "iconst" -> ICONST;   case "iload" -> ILOAD;   case "istore" -> ISTORE;
                case "iadd" -> IADD;       case "isub" -> ISUB;     case "imul" -> IMUL;
                case "iinc" -> IINC;       case "if_icmpgt" -> IF_ICMPGT;
                case "goto" -> GOTO;       case "ireturn" -> IRETURN;
                default -> throw new IllegalArgumentException("line " + i + ": unknown opcode " + p[0]);
            };
            if (p.length > 1) x[i] = Integer.parseInt(p[1]);
            if (p.length > 2) y[i] = Integer.parseInt(p[2]);
        }
        int[] locals = new int[8];
        System.arraycopy(args, 0, locals, 0, args.length);
        int[] stack = new int[64];
        int sp = 0, pc = 0;
        for (long steps = 0; steps < 1_000_000; steps++) {     // ---- execute ----
            if (pc < 0 || pc >= n) throw new IllegalStateException("fell off the code at pc=" + pc);
            switch (op[pc]) {
                case ICONST -> stack[sp++] = x[pc];
                case ILOAD -> stack[sp++] = locals[x[pc]];
                case ISTORE -> locals[x[pc]] = pop(stack, sp--);
                case IADD -> { int b = pop(stack, sp--), a = pop(stack, sp--); stack[sp++] = a + b; }
                case ISUB -> { int b = pop(stack, sp--), a = pop(stack, sp--); stack[sp++] = a - b; }
                case IMUL -> { int b = pop(stack, sp--), a = pop(stack, sp--); stack[sp++] = a * b; }
                case IINC -> locals[x[pc]] += y[pc];
                case IF_ICMPGT -> {
                    int b = pop(stack, sp--), a = pop(stack, sp--);
                    if (a > b) { pc = x[pc]; continue; }
                }
                case GOTO -> { pc = x[pc]; continue; }
                case IRETURN -> { return pop(stack, sp--); }
                default -> throw new IllegalStateException("bad opcode");
            }
            pc++;
        }
        throw new IllegalStateException("step limit exceeded (infinite loop?)");
    }

    // sp is the current size; the caller decrements it in the same expression.
    private static int pop(int[] stack, int sp) {
        if (sp == 0) throw new IllegalStateException("operand stack underflow");
        return stack[sp - 1];
    }

    public static void main(String[] args) {
        String[] sumTo = { "iconst 0", "istore 1", "iconst 1", "istore 2", "iload 2", "iload 0",
                "if_icmpgt 13", "iload 1", "iload 2", "iadd", "istore 1", "iinc 2 1", "goto 4",
                "iload 1", "ireturn" };
        System.out.println(run(sumTo, new int[] { 4 }));   // 10
    }
}`,
        dry: { head: ['pc', 'instruction', 'stack after', 'locals [n, sum, i]'], rows: [
          ['0–3', 'init sum=0, i=1', '[]', '[4, 0, 1]'],
          ['4–6', 'iload 2, iload 0, if_icmpgt (1 &gt; 4? no)', '[]', '[4, 0, 1]'],
          ['7–12', 'sum += i; i++; goto 4', '[]', '[4, 1, 2]'],
          ['…', 'loop for i = 2, 3, 4', '[]', '[4, 10, 5]'],
          ['6', 'if_icmpgt (5 &gt; 4? <b>yes</b>) → jump 13', '[]', '[4, 10, 5]'],
          ['13–14', 'iload 1, ireturn', H.c('g', 'returns 10'), '[4, 10, 5]']
        ] },
        complexity: `<p>Decoding O(L) for L lines; execution O(S) for S executed instructions with O(1) work each (no string parsing in the loop). Memory O(L) for the decoded arrays + fixed 64-slot stack.</p>`,
        followUps: ['Add <code>invokestatic</code> with a call stack of frames', 'How would a JIT speed this loop up (template interpreter, threaded code)?', 'Add a verifier pass that rejects stack underflow before running']
      }
    }]
  });

registerModule({ id: 'java13', title: 'JVM Internals & Performance', intro: '<p>x</p>', goals: [], prereqs: 'x', hours: 1, topics: topics, practice: practice, quiz: quiz, interview: interview }); })();
