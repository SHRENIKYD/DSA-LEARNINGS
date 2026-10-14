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

  /* ======================================================================
     TOPIC 3 — JIT: interpreter, tiered C1/C2, inlining, escape analysis, deopt
     ====================================================================== */
  topics.push({
    title: 'The JIT Compiler: Tiered C1/C2, Inlining, Escape Analysis & Deoptimization',
    analogy: `<p>A new cook in a restaurant reads the recipe card <b>line by line</b> for every order — slow but works immediately (the <b>interpreter</b>). After making the same pasta 200 times, she writes herself a quick cheat-sheet (the <b>C1</b> compiler: fast to produce, decent speed) and keeps notes on what customers actually order. After 5,000 orders she studies those notes and builds a fully optimised station: sauces pre-mixed, steps merged, "everyone orders it without onions, so skip that step" (the <b>C2</b> compiler, using profile data). If one day a customer <i>does</i> ask for onions, she throws away the optimised station for that dish, goes back to the recipe card, and later rebuilds (<b>deoptimization</b>).</p>`,
    explain: `<p>The JVM starts by <b>interpreting</b> bytecode: easy to start, but maybe 10–50× slower than machine code. Meanwhile it <b>counts</b> how often each method is called and how often loops spin. Methods that turn out to be <b>hot</b> are compiled to native machine code <b>Just-In-Time</b> (JIT) — while the program runs.</p>
<h4>1. Tiered compilation (default since Java 8)</h4>
${H.table(['Tier', 'Who', 'Speed of code', 'Purpose'], [
  ['0', 'Interpreter', 'slowest', 'run immediately, gather counts'],
  ['1', 'C1, no profiling', 'good', 'trivial methods (getters) that would not benefit from C2'],
  ['2', 'C1, light profiling', 'good', 'used when C2 is busy'],
  ['3', 'C1 + full profiling', 'good (a bit slower than 1/2)', 'collect types seen, branch counts, call targets'],
  ['4', '<b>C2</b> (the "server" compiler)', H.c('g', 'fastest'), 'aggressive, speculative optimisation using the profile']
])}
<p>The usual path is <b>0 → 3 → 4</b>. Rough default triggers: ~200 calls to reach tier 3, ~5,000+ calls (or many loop back-edges) to reach tier 4. Compilation happens on <b>background compiler threads</b>; the method keeps running interpreted until the new code is installed.</p>
<h4>2. The big optimisations (in order of importance)</h4>
<ol><li><b>Inlining</b> — copy the body of a called method into the caller. Removes call overhead and, more importantly, lets every other optimisation see across method boundaries. Small methods (≤ 35 bytes of bytecode) are always candidates; hot methods up to ~325 bytes.</li>
<li><b>Speculation from the profile</b> — "this ${C('Shape s')} has only ever been a ${C('Circle')}" → inline ${C('Circle.area()')} directly behind a cheap type check (a <b>guard</b>). Called <b>monomorphic</b> (1 type) / <b>bimorphic</b> (2 types) inlining. With 3+ types the site is <b>megamorphic</b> and falls back to a virtual call.</li>
<li><b>Escape analysis</b> — if an object never leaves the method (not returned, not stored in a field, not passed to un-inlined code), the JIT can skip the heap allocation entirely (<b>scalar replacement</b>: the fields become local registers) and remove locks on it (<b>lock elision</b>).</li>
<li><b>Loop optimisations</b> — range-check elimination, unrolling, vectorisation with SIMD instructions (auto-vectorisation; or explicitly via the incubating Vector API).</li>
<li><b>Dead code elimination, constant folding, intrinsics</b> — e.g. ${C('Math.sqrt')}, ${C('System.arraycopy')}, ${C('String.indexOf')} map straight to special CPU instructions.</li></ol>
<h4>3. Deoptimization</h4>
<p>Speculation can be wrong. When a guard fails (a ${C('Square')} finally shows up), the compiled code hits an <b>uncommon trap</b>: the JVM rebuilds the interpreter frame from the compiled frame, continues in the interpreter, marks the code "not entrant", and later recompiles with the new knowledge. You see it as ${C('made not entrant')} in ${C('-XX:+PrintCompilation')}.</p>
${P(`
java -XX:+PrintCompilation Main
#  ms   id  tier  method
   95   12    3    com.shop.Price::total (42 bytes)
  410   57    4    com.shop.Price::total (42 bytes)
  412   12    3    com.shop.Price::total (42 bytes)   made not entrant   <- tier 3 version retired
 2100   57    4    com.shop.Price::total (42 bytes)   made not entrant   <- deopt: speculation failed`)}
<h4>4. Why you should care</h4>
<ul><li><b>Warm-up</b>: the first seconds/minutes of a service are slow. Latency SLOs, autoscaling and benchmarks must account for it.</li>
<li><b>Benchmarks lie</b> without JMH: the JIT removes code whose result is unused and compiles mid-measurement.</li>
<li><b>Code shape matters</b>: small methods, monomorphic hot calls and non-escaping temporary objects are cheap.</li></ul>`,
    clues: [
      '"Why is the first request slow and later ones fast?" → interpreter + JIT warm-up',
      '"My microbenchmark says the loop takes 0 ns" → dead code elimination; use JMH and Blackhole',
      '"Is creating small objects in a hot loop expensive?" → escape analysis / scalar replacement / TLAB bump allocation',
      '"Interface call with many implementations got slow" → megamorphic call site, no inlining',
      '"C1 vs C2", "what is OSR", "what does made not entrant mean" → tiered compilation and deopt',
      '"Fast startup for serverless/CLI" → TieredStopAtLevel=1, CDS/AOT cache (Leyden), GraalVM native image'
    ],
    code: [`
// A hot method the JIT will inline, speculate on, and scalar-replace.
interface Shape { double area(); }
record Circle(double r) implements Shape { public double area() { return Math.PI * r * r; } }
record Square(double s) implements Shape { public double area() { return s * s; } }

class JitDemo {
    // Monomorphic while only Circles arrive: C2 inlines Circle.area() behind a type guard.
    static double total(Shape[] shapes) {
        double sum = 0;
        for (Shape s : shapes) sum += s.area();
        return sum;
    }

    // 'p' never escapes this method: escape analysis lets C2 skip the allocation entirely.
    static double distance(double x, double y) {
        record Point(double x, double y) {}
        Point p = new Point(x, y);
        return Math.sqrt(p.x() * p.x() + p.y() * p.y());
    }

    public static void main(String[] args) {
        Shape[] circles = new Shape[1000];
        for (int i = 0; i < circles.length; i++) circles[i] = new Circle(i % 10);
        double acc = 0;
        for (int round = 0; round < 20_000; round++) acc += total(circles);  // gets hot -> tier 3 -> tier 4
        circles[0] = new Square(2);                                          // new type -> guard fails -> deopt
        acc += total(circles);
        for (int i = 0; i < 1_000_000; i++) acc += distance(i, i + 1);
        System.out.println(acc > 0);   // use the result so the JIT cannot delete the work
    }
}`, { lang: 'bash', title: 'JIT diagnostics flags', code: `java -XX:+PrintCompilation Main                       # every compile: tier, size, "made not entrant"
java -XX:+UnlockDiagnosticVMOptions -XX:+PrintInlining Main   # inlining decisions: "inline (hot)", "too big", "megamorphic"
java -XX:TieredStopAtLevel=1 Main                       # C1 only: faster startup, lower peak (CLIs, short jobs)
java -XX:-DoEscapeAnalysis Main                         # turn EA off to measure its effect
java -XX:ReservedCodeCacheSize=512m Main                # bigger code cache (watch for "CodeCache is full")
jcmd <pid> Compiler.codecache                           # code cache usage at runtime` }],
    codeTitle: ['Code the JIT loves (and one change it hates)', 'Seeing what the JIT does'],
    viz: [{
      title: 'Tiered compilation timeline: interpreter → C1 → C2 → deopt → recompile',
      input: 'calls=9000 tier3=200 tier4=5000 newTypeAt=6500',
      inputLabel: 'calls, tier3 / tier4 thresholds, newTypeAt (0 = never a new type)',
      gen: function (input) {
        var o = kvParse(input, { calls: 9000, tier3: 200, tier4: 5000, newTypeAt: 6500 });
        var calls = num(o.calls, 10, 1000000, 'calls'), t3 = num(o.tier3, 1, 100000, 'tier3'), t4 = num(o.tier4, 2, 500000, 'tier4'), nt = num(o.newTypeAt, 0, 1000000, 'newTypeAt');
        if (t3 >= t4) throw new Error('tier3 must be smaller than tier4');
        var nodes = [
          { id: 'T0', label: 'Tier 0 interpreter', x: 12, y: 15, shape: 'box', w: 20 },
          { id: 'T3', label: 'Tier 3 C1 + profiling', x: 45, y: 15, shape: 'box', w: 22 },
          { id: 'T4', label: 'Tier 4 C2 optimized', x: 82, y: 15, shape: 'box', w: 22 },
          { id: 'DEOPT', label: 'uncommon trap → deopt', x: 60, y: 48, shape: 'box', w: 26 }
        ];
        var edges = [['T0', 'T3', '~' + t3 + ' calls'], ['T3', 'T4', '~' + t4 + ' calls'], ['T4', 'DEOPT', 'guard fails'], ['DEOPT', 'T0', 'back to interpreter']];
        var cost = { T0: 60, T3: 12, T4: 2 }, history = [], labels = [];
        var F = [];
        function push(at, tier, narr, ehl, profile, extra) {
          history.push(cost[tier]); labels.push(String(at));
          var hl = {}; hl[tier] = tier === 'T4' ? 'ok' : 'cur';
          var parts = [
            { type: 'graph', label: 'Where does Shape.area() execute?', directed: true, height: 60, nodes: nodes, edges: edges, hl: hl, ehl: ehl || {} },
            { type: 'vars', label: 'JVM bookkeeping for total()', vals: { 'calls so far': at, 'running as': tier === 'T0' ? 'interpreted bytecode' : tier === 'T3' ? 'C1 code (profiling)' : 'C2 code', 'type profile at s.area()': profile }, hl: { 'running as': 'cur' } },
            { type: 'bars', label: 'Approx. ns per call (illustrative)', values: history.slice(), idxLabels: labels.slice() }
          ];
          (extra || []).forEach(function (p) { parts.push(p); });
          F.push({ narr: narr, parts: parts });
        }
        push(1, 'T0', 'Call #1: no machine code exists, so the <b>interpreter</b> runs the bytecode. Each method has an invocation counter and a back-edge (loop) counter.', {}, '{}');
        push(Math.min(t3 - 1, calls), 'T0', 'Still interpreted. Cheap to start, slow to run. Counting continues; nothing is compiled for code that runs once (startup code, config parsing).', {}, '{}');
        if (calls < t3) { push(calls, 'T0', 'Program ends before the method became hot. It never left the interpreter — that is fine for cold code.', {}, '{}'); return F; }
        push(t3, 'T3', 'Threshold reached (~' + t3 + ' calls): the method is queued for <b>C1</b>. A background compiler thread produces machine code with <b>profiling counters</b> built in. It is installed and the next call jumps to it.', { 'T0-T3': 'ok' }, '{Circle: ' + t3 + '}');
        if (calls < t4) { push(calls, 'T3', 'Program ends while running C1 code. Peak C2 performance was never reached — typical for short-lived jobs, which is why serverless cares about warm-up.', {}, '{Circle: ' + calls + '}'); return F; }
        push(Math.floor((t3 + t4) / 2), 'T3', 'C1 code is ~5× faster than interpreting, and it records: receiver types at every call site, branch taken/not-taken counts, null checks seen. So far every receiver is a <b>Circle</b>.', {}, '{Circle: ' + Math.floor((t3 + t4) / 2) + '}');
        push(t4, 'T4', '~' + t4 + ' calls: the method is hot enough for <b>C2</b>. Using the profile, C2 <b>speculates</b>: "s is always a Circle" → inline <code>Circle.area()</code> behind one cheap class-check guard, unroll the loop, keep values in registers.', { 'T3-T4': 'ok' }, '{Circle: ' + t4 + '} → monomorphic', [note('C2 compiled code (pseudo)', '<code>if (s.klass != Circle) uncommon_trap();<br>sum += PI * s.r * s.r;   // inlined, no call</code>')]);
        if (nt > t4 && nt <= calls) {
          push(nt, 'T4', 'Call #' + nt + ': a <b>Square</b> arrives. The guard <span class="c-r">fails</span> → <b>uncommon trap</b>.', { 'T4-DEOPT': 'bad' }, '{Circle, Square}', [note('What the JVM does', 'Rebuilds an interpreter frame from the compiled frame\'s registers, resumes in the interpreter, and marks the C2 code <b>"made not entrant"</b>.')]);
          push(nt + 1, 'T0', '<b>Deoptimized</b>: we are back in the interpreter for this method — a visible latency blip. Profiling restarts with the new type information.', { 'DEOPT-T0': 'bad' }, '{Circle, Square}');
          var rc = Math.min(calls, nt + Math.max(t3, Math.floor((t4 - t3) / 3)));
          push(rc, 'T4', 'Recompiled by C2 with the updated profile: now <b>bimorphic</b> — two inlined bodies behind two guards. Still fast. A <i>third</i> type would make the site <b>megamorphic</b> (real virtual call, no inlining).', { 'T0-T3': 'ok', 'T3-T4': 'ok' }, '{Circle, Square} → bimorphic');
        }
        push(calls, 'T4', 'Steady state at call #' + calls + ': C2 code runs most of the time. Total compile work happened on background threads, but the <b>warm-up</b> phase (left bars) is real latency your users felt.', {}, 'stable');
        return F;
      }
    }, {
      title: 'Inlining + escape analysis: how an allocation disappears',
      gen: function () {
        var src = 'static double dist(double x, double y) {\n  Point p = new Point(x, y);\n  return Math.sqrt(p.x() * p.x() + p.y() * p.y());\n}';
        var s2 = 'static double dist(double x, double y) {\n  Point p = new Point(x, y);      // ctor inlined\n  return Math.sqrt(p.x * p.x + p.y * p.y); // getters inlined\n}';
        var s3 = 'static double dist(double x, double y) {\n  double px = x, py = y;          // object replaced by its fields\n  return Math.sqrt(px * px + py * py);\n}';
        var s4 = 'dist:  ; x in xmm0, y in xmm1\n  mulsd  xmm0, xmm0\n  mulsd  xmm1, xmm1\n  addsd  xmm0, xmm1\n  sqrtsd xmm0, xmm0      ; Math.sqrt is an intrinsic\n  ret';
        function f(narr, code, lbl, hl, heap, hh) { return { narr: narr, parts: [{ type: 'code', label: lbl, lang: lbl.indexOf('machine') >= 0 ? 'text' : 'java', code: code, hl: hl }, { type: 'vars', label: 'Per call', vals: heap, hl: hh || {} }] }; }
        return [
          f('Original code: every call allocates a <code>Point</code> on the heap (fast TLAB bump, but it still fills Eden and costs GC work later).', src, 'Source', { 2: 'cur' }, { 'heap allocations': 1, 'calls': 3, 'bytes allocated': '~32' }, { 'heap allocations': 'bad' }),
          f('Step 1 — <b>Inlining</b>: the constructor and the accessor methods are tiny (a few bytes of bytecode), so C2 copies their bodies into <code>dist</code>. Now the optimiser can see <i>everything</i> that happens to <code>p</code>.', s2, 'After inlining', { 2: 'cur', 3: 'cur' }, { 'heap allocations': 1, 'calls': 0, 'bytes allocated': '~32' }, { calls: 'ok' }),
          f('Step 2 — <b>Escape analysis</b> asks: does <code>p</code> leave this method? Not returned, not stored in a field or array, not passed to a non-inlined call, not synchronized on by others. Answer: <span class="c-g">NoEscape</span>.', s2, 'After inlining', { 2: 'ok' }, { 'p escapes?': 'no', 'heap allocations': 1 }, { 'p escapes?': 'ok' }),
          f('Step 3 — <b>Scalar replacement</b>: the object is replaced by its fields as plain local values (registers). No <code>new</code>, no header, no GC pressure.', s3, 'After scalar replacement', { 2: 'ok', 3: 'ok' }, { 'heap allocations': 0, 'bytes allocated': 0 }, { 'heap allocations': 'ok', 'bytes allocated': 'ok' }),
          f('Step 4 — the final machine code is four SIMD-register instructions. <code>Math.sqrt</code> is an <b>intrinsic</b>: replaced by the CPU\'s <code>sqrtsd</code>.', s4, 'Generated machine code (x86-64, simplified)', { 2: 'cur', 3: 'cur', 4: 'cur', 5: 'cur' }, { 'heap allocations': 0, 'instructions': 5 }, { instructions: 'ok' }),
          f('What breaks it: store <code>p</code> in a field or a list, return it, pass it to a method too big to inline, or let it flow to a megamorphic call. Then <code>p</code> "escapes" and the allocation is back. EA also only runs in C2 — during warm-up the allocations happen.', 'static List<Point> seen = new ArrayList<>();\nstatic double dist(double x, double y) {\n  Point p = new Point(x, y);\n  seen.add(p);            // ESCAPES: stored globally\n  return Math.sqrt(p.x() * p.x() + p.y() * p.y());\n}', 'Escaping version', { 4: 'bad' }, { 'p escapes?': 'yes (GlobalEscape)', 'heap allocations': 1 }, { 'p escapes?': 'bad' })
        ];
      }
    }],
    examples: [
      { title: 'The microbenchmark that measures nothing', html: `<p>A loop computing ${C('Math.log(i)')} whose result is never used runs in "0 ns" after warm-up — C2 proved the result is dead and deleted the loop. And measuring the first 1,000 iterations measures the <b>interpreter</b>. JMH fixes both: warm-up iterations, forked JVMs, and ${C('Blackhole.consume(x)')} to keep results alive.</p>`, code: `
// Wrong: result unused -> dead code elimination; no warm-up -> measures interpreter
long t0 = System.nanoTime();
for (int i = 1; i < 1_000_000; i++) Math.log(i);
System.out.println((System.nanoTime() - t0) + " ns  <- meaningless number");` },
      { title: 'On-Stack Replacement (OSR): a long loop in main', html: `<p>${C('main')} is called once, so the invocation counter never gets hot. But its loop runs 100 million times. The back-edge counter triggers an <b>OSR compilation</b>: the JVM compiles the method with a special entry point at the loop header and switches the <i>running</i> frame to compiled code mid-loop. In ${C('PrintCompilation')} output, OSR compiles are marked with ${C('%')}.</p>` },
      { title: 'Megamorphic call site slowdown', html: `<p>A hot loop calls ${C('handler.handle(event)')} where ${C('handler')} is an interface with 1 implementation in tests but 6 in production. In tests the call is inlined (monomorphic); in production it is megamorphic, inlining stops, escape analysis around it fails, and throughput drops 2–5× in that loop. Fixes: split loops by type, use a ${C('switch')} over a sealed hierarchy (each branch statically known), or accept the cost if it is not the bottleneck.</p>` },
      { title: 'Choosing JIT settings for a CLI tool vs a server', html: `${H.table(['Workload', 'Choice', 'Why'], [['CLI that runs 300 ms', C('-XX:TieredStopAtLevel=1') + ' + CDS/AOT cache', 'C2 never pays off; startup dominates'], ['Long-running API server', 'defaults (tiered C1+C2)', 'peak throughput matters'], ['Serverless with strict cold-start', 'AOT cache (JDK 24+) or GraalVM native image', 'skip warm-up entirely'], ['Container with 1 CPU', 'beware: few compiler threads', 'JIT competes with your app for CPU']])}` }
    ],
    deepDive: `<p><b>Why C2 is speculative.</b> Java has virtual calls everywhere and class loading can change the class hierarchy at any time. C2 uses <b>Class Hierarchy Analysis</b> (CHA): if only one class implements a method <i>right now</i>, it inlines without even a guard, and registers a <b>dependency</b>. If a new subclass is loaded later, every compiled method depending on that assumption is deoptimized. Speculation + cheap guards + deopt is the core trick that makes a dynamic language fast.</p>
<p><b>Inlining heuristics.</b> ${C('MaxInlineSize')} (35 bytes) for any call, ${C('FreqInlineSize')} (325 bytes) for hot calls, ${C('MaxInlineLevel')} (15 since JDK 14) for depth, and an overall node budget. Already-compiled big callees are often not inlined (${C('InlineSmallCode')}). ${C('-XX:+PrintInlining')} explains each decision: "too big", "hot method too big", "callee is too large", "megamorphic".</p>
<p><b>Escape analysis limits.</b> HotSpot's C2 EA is intra-procedural after inlining, and scalar replacement fails for objects that merge at control-flow joins (e.g. ${C('p = cond ? new P(1) : new P(2)')} — improved in recent JDKs) or arrays with non-constant indexes. Objects that escape only to a lock can still get <b>lock elision</b>. GraalVM's compiler has a stronger <b>partial escape analysis</b> which allocates only on the branch where the object actually escapes.</p>
<p><b>Allocation is already cheap.</b> Even without EA, a heap allocation is a pointer bump in the thread's <b>TLAB</b> (thread-local allocation buffer) — ~10 instructions. The real cost is GC work later and cache misses, which is why removing allocations in very hot paths still pays.</p>
<p><b>Code cache.</b> Compiled code lives in the code cache (segmented since JDK 9: non-method, profiled, non-profiled; default reserve 240 MB with tiered). If it fills, the JIT stops compiling ("CodeCache is full. Compiler has been disabled") and performance silently degrades — monitor it in large apps.</p>
<p><b>Deopt storms and safepoints.</b> Deoptimizing requires stopping at a safepoint or handshake. Repeated deopt/recompile cycles ("deopt storm", visible in JFR as ${C('jdk.Deoptimization')} events) waste CPU; HotSpot caps recompilations per method (${C('PerMethodRecompilationCutoff')}) and then gives up optimising that method.</p>
<p><b>The 2026 landscape.</b> HotSpot C2 remains the default peak compiler. Graal (in Oracle GraalVM) is an alternative JIT written in Java and the basis of <b>native image</b> AOT compilation. OpenJDK's Project Leyden delivered the AOT cache (JDK 24, JEP 483) and AOT method profiling (JDK 25, JEP 515) so the JVM starts with classes linked and profiles ready, shortening warm-up without giving up the JIT.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants can read ${C('PrintCompilation')}/${C('PrintInlining')} logs or JFR compilation events and summarise "which hot methods failed to inline and why" in seconds. They also write correct JMH harnesses quickly — a big improvement over hand-rolled ${C('System.nanoTime')} loops.</p>
<p><b>Where AI goes wrong:</b> it repeats folklore — "make methods final for speed" (C2 already uses CHA; final rarely matters), "object pooling is faster than new" (usually false on modern JVMs, and it defeats escape analysis and generational GC), "Java is interpreted so it is slow". It may also suggest ancient flags like ${C('-server')} or ${C('-XX:+AggressiveOpts')} (removed). And it loves to micro-optimise code that is not hot.</p>
<p><b>What you still own:</b> deciding whether a hot path is actually hot (profile first), designing benchmarks that survive the JIT, recognising warm-up in latency graphs after deploys, and choosing between JIT, AOT cache and native image for a workload. When an AI suggests a performance change, demand a JMH number before and after.</p>`,
    problems: [{
      title: 'Inline Cache Simulator: Count the Deoptimizations',
      level: 'Medium', tags: ['JIT', 'inline cache', 'simulation'], companies: ['Oracle', 'Azul', 'Netflix'],
      statement: `<p>A call site ${C('shape.area()')} sees a sequence of receiver classes. The site is compiled by C2 after the first ${C('c')} calls using the types seen so far: ≤ 2 types → guarded inlining of exactly those types; 3+ types → <b>megamorphic</b> virtual call (no guards, never deoptimizes). After compilation, a receiver not in the inlined set triggers a <b>deoptimization</b>; the site is immediately recompiled with the updated type set. Return the number of deoptimizations and the final shape (${C('MONOMORPHIC')}, ${C('BIMORPHIC')}, ${C('MEGAMORPHIC')}).</p>`,
      constraints: `1 ≤ receivers ≤ 10<sup>5</sup>, 1 ≤ c ≤ receivers length. Class names are short strings.`,
      example: `<p>receivers = [C, C, C, S, C, T, S], c = 3</p>${H.table(['call', 'type', 'compiled set', 'event'], [['1-3', 'C', '— (profiling)', 'compile after call 3 → {C} mono'], ['4', 'S', '{C}', H.c('r', 'DEOPT #1') + ' → recompile {C,S} bi'], ['5', 'C', '{C,S}', 'ok'], ['6', 'T', '{C,S}', H.c('r', 'DEOPT #2') + ' → 3 types → mega'], ['7', 'S', 'mega', 'virtual call, ok']])}<p>Output: ${H.c('g', '2 deopts, MEGAMORPHIC')}.</p>`,
      brute: { why: `<p>Recompute the full set of distinct types from the start of the array at every call (O(N) per call → O(N<sup>2</sup>)). It gives the right answer but re-scans history the JVM already summarised in its profile. With 10<sup>5</sup> calls that is 10<sup>10</sup> steps.</p>`, code: `
class InlineCacheBrute {
    static String simulate(String[] r, int c) {
        int deopts = 0; Set<String> compiled = null;
        for (int i = 0; i < r.length; i++) {
            Set<String> seenSoFar = new HashSet<>();
            for (int j = 0; j <= i; j++) seenSoFar.add(r[j]);          // O(i) re-scan every call
            if (i + 1 == c) compiled = seenSoFar;                        // first compile
            else if (compiled != null && compiled.size() <= 2 && !compiled.contains(r[i])) {
                deopts++; compiled = seenSoFar;                          // recompile with full history
            }
        }
        int k = compiled == null ? 0 : compiled.size();
        return deopts + " " + (k <= 1 ? "MONOMORPHIC" : k == 2 ? "BIMORPHIC" : "MEGAMORPHIC");
    }
}` },
      mcq: { q: 'Why does a megamorphic site never deoptimize in this model?', options: ['It uses a real virtual/interface dispatch (vtable/itable), which handles any receiver without speculation', 'Because the JVM stops loading new classes', 'Because megamorphic code is interpreted', 'Because C1 takes over'], answer: 0, explain: 'There is no type guard to fail: the call is dispatched dynamically. You lose inlining, but you never hit an uncommon trap at that site.' },
      hints: [`<p>Hint 1: The JVM keeps a <b>running</b> profile; you can too. Maintain one ${C('Set')} of seen types as you go — no re-scanning.</p>`, `<p>Hint 2: Separate "what has been seen" (profile) from "what the compiled code assumes" (compiled set). Deopt happens only when compiled code exists, is not megamorphic, and the receiver is outside the compiled set.</p>`, `<p>Hint 3: Recipe — for each call i: add type to seen. If i+1 == c: compiled = copy(seen). Else if compiled != null and compiled.size() ≤ 2 and type not in compiled: deopts++, compiled = copy(seen). Classify by compiled.size() at the end (or seen.size() if never compiled).</p>`],
      solution: {
        approach: `<p>One pass with a running profile set (like the JVM's receiver-type profile) and a separate snapshot representing the compiled code's assumptions. Each step is O(1) average; snapshots are copied only on compile/deopt, and the snapshot never exceeds 3 elements before becoming megamorphic.</p>`,
        code: `
class InlineCacheSim {
    static String simulate(String[] receivers, int compileAt) {
        Set<String> seen = new LinkedHashSet<>();     // running type profile
        Set<String> compiled = null;                  // assumptions baked into C2 code
        int deopts = 0;
        for (int i = 0; i < receivers.length; i++) {
            String type = receivers[i];
            seen.add(type);
            if (i + 1 == compileAt) {
                compiled = new HashSet<>(seen);       // first C2 compile uses the profile
            } else if (compiled != null && compiled.size() <= 2 && !compiled.contains(type)) {
                deopts++;                             // guard failed: uncommon trap
                compiled = new HashSet<>(seen);       // recompile with updated profile
            }
        }
        int k = (compiled == null ? seen : compiled).size();
        String shape = k <= 1 ? "MONOMORPHIC" : k == 2 ? "BIMORPHIC" : "MEGAMORPHIC";
        return deopts + " " + shape;
    }

    public static void main(String[] args) {
        System.out.println(simulate(new String[] { "C", "C", "C", "S", "C", "T", "S" }, 3)); // 2 MEGAMORPHIC
        System.out.println(simulate(new String[] { "C", "C", "C", "C" }, 2));                // 0 MONOMORPHIC
    }
}`,
        dry: { head: ['i', 'type', 'seen', 'compiled', 'deopts'], rows: [
          ['0', 'C', '{C}', '—', '0'], ['2', 'C', '{C}', '{C} (compile)', '0'], ['3', 'S', '{C,S}', H.c('r', '{C,S} (recompile)'), '1'],
          ['4', 'C', '{C,S}', '{C,S}', '1'], ['5', 'T', '{C,S,T}', H.c('r', '{C,S,T} mega'), '2'], ['6', 'S', '{C,S,T}', 'mega (no guard)', H.c('g', '2')]
        ] },
        complexity: `<p>O(N) time with O(1) average set operations; O(T) space for T distinct types. Snapshots are copied at most a few times because the compiled set can grow only to 3 before becoming megamorphic.</p>`,
        followUps: ['Model PerMethodRecompilationCutoff: stop optimising after k deopts', 'How would CHA (only one implementor loaded) change the model?', 'Why does a sealed interface + switch avoid this problem?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 4 — JVM memory areas: heap, stacks, metaspace, code cache, native
     ====================================================================== */
  topics.push({
    title: 'JVM Memory Areas: Heap, Thread Stacks, Metaspace, Code Cache & Native Memory',
    analogy: `<p>Picture an office building. Each employee (a <b>thread</b>) has a personal <b>notepad</b> on their desk — they scribble the numbers for the task they are doing right now and tear the page off when the task is done (the <b>stack</b>). The big shared <b>warehouse</b> in the basement holds every actual product the company owns; notes on a notepad only say "item is on shelf 42" (the <b>heap</b>, with references). The <b>library of manuals</b> describing how each product type works lives in a separate archive room (<b>Metaspace</b>). The janitor (<b>GC</b>) only cleans the warehouse — notepads clean themselves.</p>`,
    explain: `<p>When you run ${C('java -Xmx4g -jar app.jar')}, the JVM process uses several memory regions. Some are <b>shared</b> by all threads, some are <b>private</b> to each thread.</p>
${H.table(['Area', 'Shared?', 'Holds', 'Sized by', 'When full'], [
  ['<b>Heap</b>', 'shared', 'All objects and arrays; String pool (since Java 7); static field values (they live with the Class mirror object)', C('-Xms') + ' / ' + C('-Xmx'), C('OutOfMemoryError: Java heap space')],
  ['<b>JVM stack</b> (one per thread)', H.c('b', 'private'), 'Frames: local variables (primitives + references), operand stack, return address', C('-Xss') + ' (default ~1 MB on 64-bit Linux)', C('StackOverflowError')],
  ['<b>PC register</b>', H.c('b', 'private'), 'Address of the current bytecode instruction', 'tiny', '—'],
  ['<b>Native method stack</b>', H.c('b', 'private'), 'Frames of C/C++ code called via JNI / FFM', 'OS thread stack', 'crash / StackOverflowError'],
  ['<b>Metaspace</b>', 'shared', 'Class metadata: methods, bytecode, runtime constant pool, field layouts (replaced PermGen in Java 8)', C('-XX:MaxMetaspaceSize') + ' (unlimited by default!)', C('OutOfMemoryError: Metaspace')],
  ['<b>Code cache</b>', 'shared', 'JIT-compiled machine code', C('-XX:ReservedCodeCacheSize') + ' (240 MB)', 'JIT stops compiling (warning in log)'],
  ['<b>Direct / native memory</b>', 'shared', 'DirectByteBuffers, memory segments (FFM API), GC bookkeeping, thread stacks, JIT working memory', C('-XX:MaxDirectMemorySize') + ', OS limits', C('OutOfMemoryError: Direct buffer memory') + ' or OOM-killer']
])}
<h4>Where does each thing live? A simple rule</h4>
${P(`
class Shop {
    static int orders = 0;             // value lives with the Shop Class mirror (on the heap); metadata in Metaspace
    void sell() {
        int qty = 2;                   // primitive local  -> this thread's stack frame
        Cart cart = new Cart();        // reference 'cart' -> stack;   the Cart object -> heap
        String name = "pen";           // reference -> stack;  "pen" literal -> String pool (heap)
        cart.add(name, qty);           // new frame for add() pushed on the stack
    }                                  // frame popped: qty, cart, name vanish; the Cart object
}                                      // stays on the heap until GC finds it unreachable`)}
<p><b>Common myth:</b> "primitives live on the stack, objects on the heap". Better: <b>local variables</b> live in stack frames (and a reference is a local too); <b>fields</b> live inside their object on the heap — so an ${C('int')} field of an object is on the heap. And the JIT may keep a non-escaping object entirely in registers (escape analysis).</p>
<h4>Total memory ≠ -Xmx</h4>
<p>Container sizing rule of thumb: <b>process RSS ≈ heap + metaspace + code cache + (threads × stack size) + direct buffers + GC overhead + malloc arenas</b>. A service with ${C('-Xmx4g')}, 400 threads and Netty direct buffers can easily use 5.5–6 GB. Give the container headroom, or the Linux OOM-killer ends the process with no Java stack trace at all (exit code 137).</p>
<h4>The OutOfMemoryError family</h4>
${H.table(['Message', 'Area', 'Usual cause'], [
  [C('Java heap space'), 'heap', 'leak or genuinely too small heap / huge load'],
  [C('GC overhead limit exceeded'), 'heap', '&gt;98% time in GC recovering &lt;2% heap (Parallel GC) — effectively a leak'],
  [C('Metaspace'), 'metaspace', 'class loader leak, endless dynamic proxies / generated classes'],
  [C('Direct buffer memory'), 'native', 'NIO buffers not released, Netty misconfiguration'],
  [C('unable to create native thread'), 'OS', 'too many threads, ulimit / container pid limit'],
  [C('Requested array size exceeds VM limit'), 'heap', 'array longer than ~Integer.MAX_VALUE − 8']
])}`,
    clues: [
      '"Where are local variables / objects / static fields stored?" → stack vs heap vs Metaspace',
      '"StackOverflowError on a deep tree / long linked list recursion" → convert to iteration or raise <code>-Xss</code>',
      '"Container killed with exit code 137 but heap looks fine" → native memory (threads, direct buffers, metaspace) outside <code>-Xmx</code>',
      '"PermGen vs Metaspace" → Java 8 change; metadata moved to native memory',
      '"OutOfMemoryError: Metaspace after several redeploys" → class loader leak',
      '"Heap bigger than 32 GB got slower / holds less" → compressed oops cliff'
    ],
    code: [`
import java.lang.management.*;

// Print the JVM's own view of its memory areas (works on any JDK 9+).
class MemoryAreas {
    public static void main(String[] args) {
        Runtime rt = Runtime.getRuntime();
        System.out.printf("heap: used=%d MB committed=%d MB max=%d MB%n",
                (rt.totalMemory() - rt.freeMemory()) >> 20, rt.totalMemory() >> 20, rt.maxMemory() >> 20);
        for (MemoryPoolMXBean pool : ManagementFactory.getMemoryPoolMXBeans()) {
            MemoryUsage u = pool.getUsage();
            // Typical pool names with G1: "G1 Eden Space", "G1 Survivor Space", "G1 Old Gen",
            // "Metaspace", "Compressed Class Space", "CodeHeap 'profiled nmethods'", ...
            System.out.printf("%-35s %-8s used=%6d KB%n", pool.getName(), pool.getType(), u.getUsed() >> 10);
        }
        System.out.println("threads alive: " + ManagementFactory.getThreadMXBean().getThreadCount());
    }
}`, { lang: 'bash', title: 'Native Memory Tracking: see ALL areas, not just the heap', code: `java -XX:NativeMemoryTracking=summary -Xmx1g -jar app.jar &
jcmd <pid> VM.native_memory summary
#  Java Heap (reserved=1048576KB, committed=262144KB)
#  Class     (reserved=1056768KB, committed=10240KB)    <- metaspace + compressed class space
#  Thread    (reserved=410000KB,  committed=410000KB)   <- 400 threads x ~1 MB stacks
#  Code      (reserved=247808KB,  committed=17000KB)    <- code cache
#  GC        (reserved=60000KB,   committed=60000KB)    <- remembered sets, mark bitmaps
#  Internal / Other / Symbol / Arena ...                <- direct buffers show under Other` }],
    codeTitle: ['Inspecting memory pools from inside the JVM', 'Native Memory Tracking'],
    viz: [{
      title: 'Follow a program: what goes on the stack, the heap and Metaspace',
      gen: function () {
        var code = 'class Shop {\n  static int orders = 0;\n  public static void main(String[] a) {\n    int qty = 2;\n    Cart cart = new Cart();\n    cart.add("pen", qty);\n    orders++;\n  }\n}\nclass Cart {\n  List<String> items = new ArrayList<>();\n  void add(String n, int q) {\n    for (int i = 0; i < q; i++) items.add(n);\n  }\n}';
        function f(narr, line, stack, heap, meta, hh, extra) {
          var parts = [
            { type: 'code', label: 'Shop.java', lang: 'java', code: code, hl: line ? (typeof line === 'object' ? line : one(line, 'cur')) : {} },
            { type: 'stack', label: 'main thread: JVM stack (top = right)', items: stack, hl: stack.length ? one(stack.length - 1, 'cur') : {} },
            { type: 'map', label: 'Heap (shared, GC-managed)', entries: heap, hl: hh || {} },
            { type: 'set', label: 'Metaspace (class metadata)', items: meta }
          ];
          (extra || []).forEach(function (p) { parts.push(p); });
          return { narr: narr, parts: parts };
        }
        return [
          f('<code>java Shop</code>: the app class loader loads <b>Shop</b>; its metadata (methods, bytecode, constant pool) goes into <b>Metaspace</b>. The <code>Class</code> mirror object and the static field <code>orders = 0</code> are on the heap.', 2, [], [['Shop.class mirror', 'orders=0']], ['Shop'], { 'Shop.class mirror': 'ok' }),
          f('<code>main</code> is invoked: a <b>frame</b> is pushed on the main thread\'s stack, holding slot 0 = args and room for locals.', 3, ['main(args)'], [['Shop.class mirror', 'orders=0'], ['String[] @a1', 'args (empty)']], ['Shop']),
          f('<code>int qty = 2</code>: a primitive local — stored directly in main\'s frame. No heap involved.', 4, ['main: qty=2'], [['Shop.class mirror', 'orders=0'], ['String[] @a1', 'args (empty)']], ['Shop']),
          f('<code>new Cart()</code>: first use of Cart → load it (Metaspace). The object is allocated on the <b>heap</b> (in Eden, via a thread-local TLAB bump). Its field <code>items</code> points to a new ArrayList, also on the heap. The local <code>cart</code> holds only a <b>reference</b>.', 5, ['main: qty=2, cart→@c7'], [['Shop.class mirror', 'orders=0'], ['String[] @a1', 'args (empty)'], ['Cart @c7', 'items→@L9'], ['ArrayList @L9', 'size=0']], ['Shop', 'Cart', 'ArrayList (bootstrap)'], { 'Cart @c7': 'ok', 'ArrayList @L9': 'ok' }),
          f('<code>cart.add("pen", qty)</code>: a new frame for <code>add</code> is pushed on top. Its locals: <code>this</code>=@c7, <code>n</code>→"pen" (the literal is in the <b>String pool</b> on the heap), <code>q</code>=2 (a <i>copy</i> — Java is pass-by-value).', { 6: 'cur', 12: 'cur' }, ['main: qty=2, cart→@c7', 'add: this→@c7, n→@s1, q=2'], [['Shop.class mirror', 'orders=0'], ['Cart @c7', 'items→@L9'], ['ArrayList @L9', 'size=0'], ['"pen" @s1 (pool)', 'String']], ['Shop', 'Cart', 'ArrayList (bootstrap)'], { '"pen" @s1 (pool)': 'ok' }),
          f('The loop runs: <code>i</code> lives in add\'s frame; <code>items.add(n)</code> pushes yet another frame (ArrayList.add), stores the <b>reference</b> to "pen" twice in the list\'s backing array (heap).', 13, ['main: qty=2, cart→@c7', 'add: this, n, q=2, i=1', 'ArrayList.add(e)'], [['Shop.class mirror', 'orders=0'], ['Cart @c7', 'items→@L9'], ['ArrayList @L9', 'size=2 → [@s1, @s1]'], ['"pen" @s1 (pool)', 'String']], ['Shop', 'Cart', 'ArrayList (bootstrap)'], { 'ArrayList @L9': 'cur' }),
          f('<code>add</code> returns: its frame is popped instantly — <code>n</code>, <code>q</code>, <code>i</code> disappear with no GC work. Stack memory is reclaimed by moving a pointer.', 6, ['main: qty=2, cart→@c7'], [['Shop.class mirror', 'orders=0'], ['Cart @c7', 'items→@L9'], ['ArrayList @L9', 'size=2'], ['"pen" @s1 (pool)', 'String']], ['Shop', 'Cart', 'ArrayList (bootstrap)']),
          f('<code>orders++</code>: a <b>static</b> field — getstatic/putstatic on the Shop class, value stored with the Class mirror on the heap, shared by every thread (so this needs synchronization in concurrent code!).', 7, ['main: qty=2, cart→@c7'], [['Shop.class mirror', 'orders=1'], ['Cart @c7', 'items→@L9'], ['ArrayList @L9', 'size=2'], ['"pen" @s1 (pool)', 'String']], ['Shop', 'Cart', 'ArrayList (bootstrap)'], { 'Shop.class mirror': 'ok' }),
          f('<code>main</code> returns: its frame is popped. Now nothing on any stack references Cart @c7 — the Cart and its ArrayList are <span class="c-r">unreachable</span> and will be reclaimed by the next GC that scans this region. Metaspace entries stay until the class loader dies.', 8, [], [['Shop.class mirror', 'orders=1'], ['Cart @c7', 'unreachable'], ['ArrayList @L9', 'unreachable'], ['"pen" @s1 (pool)', 'String']], ['Shop', 'Cart', 'ArrayList (bootstrap)'], { 'Cart @c7': 'bad', 'ArrayList @L9': 'bad' })
        ];
      }
    }, {
      title: 'Stack frames pile up: when does StackOverflowError happen?',
      input: 'n=7 stackFrames=5',
      inputLabel: 'n = recursion depth of depth(n); stackFrames = how many frames fit (models -Xss)',
      gen: function (input) {
        var o = kvParse(input, { n: 7, stackFrames: 5 });
        var n = num(o.n, 1, 30, 'n'), cap = num(o.stackFrames, 2, 30, 'stackFrames');
        var code = 'static int depth(int n) {\n  if (n == 0) return 0;      // base case\n  return 1 + depth(n - 1);  // pushes a NEW frame\n}';
        var F = [], st = [];
        F.push({ narr: 'Each call needs a frame (locals + operand stack + bookkeeping). The thread stack has room for about <b>' + cap + '</b> frames here (real JVM: ~10,000–20,000 small frames with the default 1 MB <code>-Xss</code>).', parts: [{ type: 'code', label: 'Recursive code', lang: 'java', code: code, hl: {} }, { type: 'stack', label: 'Thread stack (' + cap + ' frames capacity)', items: [] }, { type: 'vars', label: 'Stack use', vals: { used: 0, capacity: cap } }] });
        for (var k = n; k >= 0; k--) {
          if (st.length === cap) {
            F.push({ narr: 'Trying to push <code>depth(' + k + ')</code> but the stack is full → <span class="c-r"><b>StackOverflowError</b></span>. The JVM detects this with guard pages at the end of the stack. It is an <i>Error</i>, and the stack trace will show the same line repeated ~1024 times.', parts: [{ type: 'code', label: 'Recursive code', lang: 'java', code: code, hl: { 3: 'bad' } }, { type: 'stack', label: 'Thread stack (FULL)', items: st.slice(), hl: one(st.length - 1, 'bad') }, { type: 'vars', label: 'Stack use', vals: { used: st.length, capacity: cap }, hl: { used: 'bad' } }] });
            F.push({ narr: 'Fixes: (1) rewrite recursion as a loop with an explicit <code>ArrayDeque</code> stack on the heap (best), (2) raise <code>-Xss</code> or create a <code>new Thread(group, task, name, stackSizeBytes)</code> with a bigger stack for that one job, (3) make sure the base case is actually reachable (most SOEs are infinite-recursion bugs, e.g. <code>equals</code> calling itself or bidirectional <code>toString</code>).', parts: [note('Iterative version', '<code>int d = 0; while (n-- &gt; 0) d++; return d;</code> — O(1) stack, no limit.')] });
            return F;
          }
          st.push('depth(' + k + ')');
          F.push({ narr: 'Call <code>depth(' + k + ')</code>: push frame #' + st.length + '. ' + (k === 0 ? 'Base case reached.' : 'n ≠ 0, so it must call itself again before it can return.'), parts: [{ type: 'code', label: 'Recursive code', lang: 'java', code: code, hl: one(k === 0 ? 2 : 3, 'cur') }, { type: 'stack', label: 'Thread stack (' + cap + ' frames capacity)', items: st.slice(), hl: one(st.length - 1, 'cur') }, { type: 'vars', label: 'Stack use', vals: { used: st.length, capacity: cap }, hl: { used: st.length === cap ? 'bad' : 'cur' } }] });
        }
        while (st.length) {
          var top = st.pop();
          F.push({ narr: top + ' returns ' + (n - st.length) + ' to its caller; its frame is popped.', parts: [{ type: 'code', label: 'Recursive code', lang: 'java', code: code, hl: { 3: 'ok' } }, { type: 'stack', label: 'Thread stack', items: st.slice() }, { type: 'vars', label: 'Stack use', vals: { used: st.length, capacity: cap } }] });
        }
        F.push({ narr: 'Done: depth(' + n + ') = <b>' + n + '</b>, peak stack use ' + (n + 1) + ' of ' + cap + ' frames. Increase n above ' + (cap - 1) + ' to see the overflow.', parts: [{ type: 'vars', label: 'Result', vals: { result: n, peakFrames: n + 1 }, hl: { result: 'ok' } }] });
        return F;
      }
    }],
    examples: [
      { title: 'Object size and compressed oops', html: `<p>On a 64-bit JVM with a heap under ~32 GB, references are <b>compressed</b> to 4 bytes. An object has a 12-byte header (8-byte mark word + 4-byte class pointer) padded to a multiple of 8. So ${C('new Object()')} = 16 bytes, an ${C('Integer')} = 16 bytes (12 header + 4 value), and ${C('new int[10]')} = 16 header + 40 = 56 bytes. With <b>compact object headers</b> (JDK 25, ${C('-XX:+UseCompactObjectHeaders')}) the header shrinks to 8 bytes, saving 10–20% heap in object-heavy apps.</p>${H.table(['Heap', 'Reference size', 'Effect'], [['31 GB', '4 bytes (compressed)', 'fits more objects'], ['34 GB', '8 bytes', H.c('r', 'may hold FEWER objects than 31 GB!')]])}` },
      { title: 'Metaspace OOM from generated classes', html: `<p>A service creates a new ${C('GroovyClassLoader')} (or CGLIB proxy, or JSON serializer per request with a new loader) for every rule evaluation. Each loader defines new classes; the loaders are cached in a map and never released. Heap is fine, but Metaspace grows by MBs per minute → ${C('OutOfMemoryError: Metaspace')}. Fix: reuse one loader / cache the generated class, and set ${C('-XX:MaxMetaspaceSize')} so the failure is fast and visible instead of eating the container's memory.</p>` },
      { title: 'unable to create native thread', html: `<p>A legacy service creates a ${C('new Thread')} per incoming request. Under a spike it reaches the container's pid limit (or ${C('ulimit -u')}), and ${C('Thread.start()')} fails with ${C('OutOfMemoryError: unable to create native thread')} — even though heap is half empty. Fix: a bounded thread pool, or virtual threads (Java 21), which keep their stacks as heap objects and cost only hundreds of bytes when parked.</p>`, code: `
// Virtual threads: 100k concurrent tasks without 100k OS stacks
try (ExecutorService ex = Executors.newVirtualThreadPerTaskExecutor()) {
    for (int i = 0; i < 100_000; i++) {
        ex.submit(() -> { Thread.sleep(10); return 1; });
    }
}   // close() waits for all tasks
System.out.println("done");` },
      { title: 'Exit code 137 with a "small" heap', html: `<p>Pod limit 2 GiB, ${C('-Xmx1800m')}. Heap use is only 1.2 GB, yet the pod is OOM-killed. NMT shows: metaspace 180 MB, 250 threads × 1 MB stacks = 250 MB, code cache 60 MB, direct buffers 200 MB, GC structures 70 MB. Total ≈ 2.5 GB. Fix: ${C('-XX:MaxRAMPercentage=70')} instead of a hard-coded Xmx, cap direct memory, reduce threads.</p>` }
    ],
    deepDive: `<p><b>What is in a frame exactly.</b> Local variable array (size ${C('max_locals')}), operand stack (size ${C('max_stack')}), a pointer to the method's runtime constant pool, and return info. In compiled code, frames are machine frames sized by the JIT and many locals live in registers. The JVM maps interpreter and compiled frames to each other during deoptimization and for stack walking (exceptions, ${C('StackWalker')}, profilers).</p>
<p><b>Static fields moved.</b> Before Java 8, class metadata and statics lived in <b>PermGen</b> inside the Java heap with a fixed max (${C('-XX:MaxPermSize')}), and interned Strings were there until Java 7. Java 7 moved the String pool to the heap; Java 8 removed PermGen and put metadata in native <b>Metaspace</b> while static field values went into the ${C('java.lang.Class')} mirror on the heap. "Compressed class space" (default 1 GB reserve) is the part of Metaspace that holds class structures addressed by the compressed class pointer.</p>
<p><b>TLABs.</b> Each thread gets a private chunk of Eden (a Thread-Local Allocation Buffer). Allocation = bump a pointer within your TLAB, no locking. When it fills, the thread grabs a new TLAB. Large objects or full TLABs take a slower shared path. JFR's ${C('jdk.ObjectAllocationOutsideTLAB')} and ${C('jdk.ObjectAllocationSample')} events show who allocates most.</p>
<p><b>Stack sizing trade-off.</b> ${C('-Xss')} is reserved per platform thread (virtual memory) but committed lazily, so 1 MB × 1000 threads is mostly reservation; deep recursions commit it. Too small: SOE in libraries with deep call chains (template engines, regex backtracking — ${C('java.util.regex')} recursion on huge inputs is a classic). Virtual threads store their frames in heap "stack chunks" while unmounted, which is why millions are feasible.</p>
<p><b>Off-heap.</b> ${C('ByteBuffer.allocateDirect')} memory is freed only when the small buffer object is GC'd (a Cleaner runs) — so a big young generation can delay native frees and cause "Direct buffer memory" errors. The Foreign Function &amp; Memory API (final in Java 22) gives ${C('Arena')}-scoped segments with deterministic ${C('close()')}, the modern replacement for ${C('Unsafe')} off-heap tricks.</p>
<p><b>Containers.</b> Since JDK 10 (and 8u191) the JVM reads cgroup limits (${C('UseContainerSupport')}, on by default). With no ${C('-Xmx')}, max heap = ${C('MaxRAMPercentage')} (default <b>25%</b>) of the container limit — often far too small for a dedicated service; 60–75% is typical, leaving room for native areas.</p>`,
    aiEra: `<p><b>What AI changes:</b> paste an ${C('NMT summary')}, a ${C('jcmd GC.heap_info')} output, or a Kubernetes OOMKilled event into an assistant and it can quickly total the areas and point at the suspicious one. It can also draft container memory budgets ("given limit 4 GiB and 300 threads, propose Xmx/MaxRAMPercentage/MaxMetaspaceSize").</p>
<p><b>Where AI goes wrong:</b> it repeats the "primitives on stack, objects on heap" myth, still mentions PermGen and ${C('-XX:MaxPermSize')} for modern JDKs (ignored since Java 8), treats ${C('-Xmx')} as total process memory, and suggests ${C('-Xss')} increases for what is really infinite recursion.</p>
<p><b>What you still own:</b> the mental model of which area overflowed (the error message tells you), budgeting total RSS for containers, choosing iteration over recursion for unbounded inputs, and verifying with real measurements (NMT, ${C('/proc/<pid>/status')}, container metrics) before changing flags in production.</p>`,
    problems: [{
      title: 'Iterative DFS to Survive a Million-Node Chain',
      level: 'Medium', tags: ['stack', 'recursion', 'StackOverflowError', 'graphs'], companies: ['Google', 'Meta', 'Amazon'],
      statement: `<p>Given a directed graph as adjacency lists (${C('int[][] adj')}) and a start node, return how many nodes are reachable. The graph can be a <b>single chain of 10<sup>6</sup> nodes</b> (0→1→2→…). A recursive DFS crashes with ${C('StackOverflowError')} on the default 1 MB thread stack. Write a version that cannot overflow the stack.</p>`,
      constraints: `1 ≤ N ≤ 10<sup>6</sup>, total edges ≤ 2·10<sup>6</sup>. Must use O(N) heap memory and O(1) call-stack depth.`,
      example: `<p>adj = [[1,2],[3],[3],[],[0]], start = 0 → reachable {0,1,2,3} → ${H.c('g', '4')}. Node 4 points <i>to</i> 0 but nothing reaches 4.</p><p>Chain of 10<sup>6</sup>: recursive version needs 10<sup>6</sup> frames → ${H.c('r', 'StackOverflowError')} at roughly depth 10–20k; iterative returns ${H.c('g', '1000000')}.</p>`,
      brute: { why: `<p>Classic recursive DFS. Correct on small graphs, but call depth equals the longest path. Every frame costs ~50–100 bytes of the thread stack, so a 10<sup>6</sup>-long chain needs ~100 MB of stack. The default is 1 MB → crash. Raising ${C('-Xss')} just moves the cliff.</p>`, code: `
class RecursiveReach {
    static int count(int[][] adj, int start) {
        boolean[] seen = new boolean[adj.length];
        return dfs(adj, start, seen);
    }
    static int dfs(int[][] adj, int u, boolean[] seen) {
        if (seen[u]) return 0;
        seen[u] = true;
        int c = 1;
        for (int v : adj[u]) c += dfs(adj, v, seen);   // depth = path length -> StackOverflowError
        return c;
    }
}` },
      mcq: { q: 'Where does the explicit ArrayDeque stack store its data?', options: ['On the heap — limited by -Xmx, not -Xss', 'On the thread stack', 'In Metaspace', 'In the code cache'], answer: 0, explain: 'The deque is an ordinary object with a backing array on the heap. Heap is usually GBs, the thread stack ~1 MB, so moving the "to-do list" to the heap removes the depth limit.' },
      hints: [`<p>Hint 1: Recursion stores "what to do next" on the <b>call stack</b>. You can store the same thing in a data structure on the <b>heap</b>.</p>`, `<p>Hint 2: Use ${C('ArrayDeque<Integer>')} (or an ${C('int[]')} with a top index to avoid boxing) as an explicit stack. Mark a node seen when you <b>push</b> it, so each node is pushed at most once.</p>`, `<p>Hint 3: Recipe — push start, mark seen. While stack not empty: pop u, count++, for each neighbour v not seen: mark, push. The explicit stack size is at most N; call depth stays 1.</p>`],
      solution: {
        approach: `<p>Replace the implicit call stack with an explicit array-based stack on the heap. Marking at push time guarantees O(N) pushes. Using a primitive ${C('int[]')} avoids boxing 10<sup>6</sup> Integers (which would allocate ~16 MB of garbage).</p>`,
        code: `
class IterativeReach {
    static int count(int[][] adj, int start) {
        int n = adj.length;
        boolean[] seen = new boolean[n];
        int[] stack = new int[n];            // each node pushed at most once -> n slots suffice
        int top = 0, reached = 0;
        stack[top++] = start;
        seen[start] = true;
        while (top > 0) {
            int u = stack[--top];
            reached++;
            for (int v : adj[u]) {
                if (!seen[v]) {
                    seen[v] = true;          // mark on push, not on pop
                    stack[top++] = v;
                }
            }
        }
        return reached;
    }

    public static void main(String[] args) {
        int n = 1_000_000;
        int[][] chain = new int[n][];
        for (int i = 0; i < n; i++) chain[i] = i + 1 < n ? new int[] { i + 1 } : new int[0];
        System.out.println(count(chain, 0));                                        // 1000000, no SOE
        System.out.println(count(new int[][] { {1, 2}, {3}, {3}, {}, {0} }, 0));    // 4
    }
}`,
        dry: { head: ['step', 'pop u', 'stack after pushes', 'seen', 'reached'], rows: [
          ['init', '—', '[0]', '{0}', '0'], ['1', '0', '[1, 2]', '{0,1,2}', '1'], ['2', '2', '[1, 3]', '{0,1,2,3}', '2'],
          ['3', '3', '[1]', 'same', '3'], ['4', '1', '[] (3 already seen)', 'same', H.c('g', '4')]
        ] },
        complexity: `<p>Time O(N + E). Heap O(N) for ${C('seen')} and the stack array (~5 MB for 10<sup>6</sup> nodes). Call-stack depth O(1) — immune to ${C('StackOverflowError')}.</p>`,
        followUps: ['Produce a post-order (e.g. topological sort) iteratively — what extra state do you push?', 'When is running the recursive version in a thread with a 512 MB stack acceptable?', 'Would virtual threads change the stack limit?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 5 — GC fundamentals: reachability, mark/sweep/compact/copy, generations
     ====================================================================== */
  topics.push({
    title: 'Garbage Collection Fundamentals: GC Roots, Mark–Sweep–Compact & Generations (Eden, Survivor, Old)',
    analogy: `<p>Think of a hotel with a <b>guest register</b> at the front desk (the <b>GC roots</b>). Housekeeping does not ask each room "are you still needed?". Instead it starts from the register, follows every "guest → their luggage → luggage tags → linked rooms" chain, and puts a sticker on every room it reaches. Any room without a sticker is cleaned out — even two empty rooms whose doors point at each other. And because most guests check out after one night, the hotel keeps a cheap, quickly-cleaned <b>day-guest wing</b> (Eden) and moves long-stay guests to the quiet <b>residents' wing</b> (Old) that is cleaned rarely.</p>`,
    explain: `<p><b>Garbage collection</b> (GC) automatically frees heap objects your program can no longer reach. You never call ${C('free')}; the JVM finds dead objects for you.</p>
<h4>1. "Reachable" is the only rule</h4>
<p>An object is <b>live</b> if there is a chain of references to it from a <b>GC root</b>. Roots are:</p>
<ul><li>local variables and operands in every thread's stack frames,</li><li>static fields of loaded classes,</li><li>active threads themselves, JNI references, objects used as locks (monitors),</li><li>some JVM internals (class loaders of loaded classes, the String table…).</li></ul>
<p>Everything else is <b>garbage</b> — even groups of objects that point at each other in a cycle. That is why Java uses <b>tracing</b>, not reference counting (which can never free cycles).</p>
<h4>2. The three basic moves</h4>
${H.table(['Technique', 'How', 'Good', 'Bad'], [
  ['<b>Mark–Sweep</b>', 'mark live objects, then free the unmarked ones in place', 'no copying', 'leaves holes → <b>fragmentation</b>; allocation needs free-lists'],
  ['<b>Mark–Compact</b>', 'mark, then slide live objects together', 'no fragmentation, bump-pointer allocation', 'moving + updating references is slow on big heaps'],
  ['<b>Copying</b> (evacuation)', 'copy live objects to an empty space; the old space is wiped in one go', 'cost ∝ <b>live</b> objects only, compacts for free', 'needs spare space to copy into']
])}
<h4>3. The generational hypothesis</h4>
<p>"<b>Most objects die young.</b>" Request objects, iterators, temporary Strings and DTOs live for microseconds. So HotSpot splits the heap:</p>
${H.table(['Space', 'Role', 'Collected by'], [
  ['<b>Eden</b>', 'every new object is born here (in TLABs)', 'minor / young GC (copying)'],
  ['<b>Survivor S0 / S1</b>', 'two small spaces; objects that survived a young GC bounce between them, aging by 1 each time', 'minor GC'],
  ['<b>Old (tenured)</b>', 'objects that survived enough GCs (age ≥ tenuring threshold, max 15) get <b>promoted</b> here', 'major / mixed / full GC (rarer, bigger)']
])}
<p>A <b>minor GC</b> copies the few live objects out of Eden + the "from" survivor into the "to" survivor (age +1) or into Old (if old enough or if the survivor is full). Then Eden and "from" are wiped wholesale. Because ~90%+ of Eden is dead, this is fast — work is proportional to the <i>survivors</i>, not to Eden's size.</p>
<h4>4. Stop-the-world and safepoints</h4>
<p>Some GC phases need the application threads paused (<b>stop-the-world</b>, STW) at a <b>safepoint</b> — a point where every thread's references are known. Modern collectors (G1, ZGC, Shenandoah) do most marking concurrently with your threads and keep pauses short; the next topic compares them.</p>
<h4>5. You cannot force it (and should not try)</h4>
<p>${C('System.gc()')} is only a <i>hint</i> (often a full STW GC, or ignored with ${C('-XX:+DisableExplicitGC')}). ${C('finalize()')} is deprecated for removal (JEP 421) — use ${C('try-with-resources')} or ${C('java.lang.ref.Cleaner')} instead.</p>`,
    clues: [
      '"How does Java handle circular references?" → tracing from GC roots, cycles are collected',
      '"What are GC roots?" → stacks, statics, threads, JNI handles, monitors',
      '"Why are short-lived objects cheap?" → Eden + copying collection, cost ∝ survivors',
      '"Minor vs major vs full GC", "eden / survivor / tenured", "tenuring threshold"',
      '"Old generation fills up quickly although objects are short-lived" → premature promotion (survivor overflow)',
      '"Does setting obj = null help?" → only if that reference was the last path from a root (rarely needed for locals)'
    ],
    code: [`
// Demonstrates that tracing GC collects cycles, using a WeakReference as a probe.
import java.lang.ref.*;

class CycleDemo {
    static class Node { Node other; byte[] payload = new byte[1024]; }

    public static void main(String[] args) throws InterruptedException {
        Node a = new Node(), b = new Node();
        a.other = b; b.other = a;                        // a <-> b cycle
        WeakReference<Node> probe = new WeakReference<>(a);
        a = null; b = null;                              // drop the only ROOT references
        // Reference counting would keep both alive forever (each has count 1).
        for (int i = 0; i < 10 && probe.get() != null; i++) {
            System.gc();                                 // a hint; fine for a demo, never in production code
            Thread.sleep(50);
        }
        System.out.println("cycle collected? " + (probe.get() == null));   // true on HotSpot collectors
    }
}`, { lang: 'bash', title: 'Watch generations in action', code: `java -Xmx256m -Xmn64m -XX:+UseSerialGC -Xlog:gc,gc+age=trace App
# [gc,age] Desired survivor size 3342336 bytes, new threshold 15 (max threshold 15)
# [gc,age] - age   1:    1048576 bytes,    1048576 total
# [gc,age] - age   2:     524288 bytes,    1572864 total
# [gc     ] GC(3) Pause Young (Allocation Failure) 58M->9M(247M) 3.211ms
#   58M before, 9M after: ~85% of the young objects were already dead` }],
    codeTitle: ['Cycles are garbage too', 'Seeing ages and minor GCs in the log'],
    viz: [{
      title: 'Mark phase: trace from GC roots, everything unmarked is garbage',
      input: 'roots=A,F edges=A>B,B>C,C>A,D>E,E>D,F>G,H>F',
      inputLabel: 'roots=… edges=X>Y,… (single letters, up to 12 objects)',
      gen: function (input) {
        var o = kvParse(input, { roots: 'A,F', edges: 'A>B,B>C,C>A,D>E,E>D,F>G,H>F' });
        var roots = String(o.roots).split(',').filter(Boolean), es = String(o.edges).split(',').filter(Boolean);
        var ids = [], adj = {}, edges = [];
        function add(x) { if (!/^[A-Za-z]$/.test(x)) throw new Error('Object names must be single letters, e.g. edges=A>B,B>C'); if (ids.indexOf(x) < 0) { ids.push(x); adj[x] = []; } }
        roots.forEach(add);
        es.forEach(function (e) { var p = e.split('>'); if (p.length !== 2) throw new Error('Write edges like A>B'); add(p[0]); add(p[1]); adj[p[0]].push(p[1]); edges.push([p[0], p[1]]); });
        if (ids.length > 12) throw new Error('Use at most 12 objects');
        var nodes = [{ id: 'ROOTS', label: 'GC roots', x: 50, y: 6, shape: 'box', w: 18 }];
        ids.forEach(function (id, i) { var ang = 2 * Math.PI * i / ids.length; nodes.push({ id: id, label: id, x: Math.round(50 + 36 * Math.cos(ang)), y: Math.round(42 + 26 * Math.sin(ang)) }); });
        var allEdges = roots.map(function (r) { return ['ROOTS', r]; }).concat(edges);
        var marked = {}, F = [], queue = [];
        function snap(narr, cur, ehl, extra) {
          var hl = { ROOTS: 'sel' };
          ids.forEach(function (id) { if (marked[id]) hl[id] = 'ok'; });
          if (cur) hl[cur] = 'cur';
          var parts = [{ type: 'graph', label: 'Heap object graph', directed: true, height: 74, nodes: nodes, edges: allEdges, hl: hl, ehl: ehl || {} }, { type: 'queue', label: 'Mark worklist (grey objects)', items: queue.slice() }, { type: 'set', label: 'Marked (live)', items: ids.filter(function (x) { return marked[x]; }) }];
          (extra || []).forEach(function (p) { parts.push(p); });
          F.push({ narr: narr, parts: parts });
        }
        snap('The heap has ' + ids.length + ' objects. Roots (stack locals, statics, threads) point directly at <b>' + roots.join(', ') + '</b>. GC begins by assuming <b>everything is dead</b> (white).');
        roots.forEach(function (r) { if (!marked[r]) { marked[r] = true; queue.push(r); } });
        var ehl0 = {}; roots.forEach(function (r) { ehl0['ROOTS-' + r] = 'ok'; });
        snap('Scan the roots: mark ' + roots.join(', ') + ' and put them in the worklist ("grey" = reached but children not scanned yet).', null, ehl0);
        while (queue.length) {
          var u = queue.shift(), ehl = {}, newly = [];
          adj[u].forEach(function (v) { ehl[u + '-' + v] = marked[v] ? 'done' : 'ok'; if (!marked[v]) { marked[v] = true; queue.push(v); newly.push(v); } });
          snap('Scan <b>' + u + '</b>: follow its fields. ' + (adj[u].length ? (newly.length ? 'Newly marked: <b>' + newly.join(', ') + '</b>.' : 'Its targets are already marked — no extra work, this is how cycles stop the tracer from looping forever.') : 'It has no outgoing references.') + ' ' + u + ' is now <b>black</b> (fully scanned).', u, ehl);
        }
        var dead = ids.filter(function (x) { return !marked[x]; });
        var hlDead = {}; dead.forEach(function (d) { hlDead[d] = 'bad'; });
        ids.forEach(function (id) { if (marked[id]) hlDead[id] = 'ok'; });
        hlDead.ROOTS = 'sel';
        F.push({ narr: 'Worklist empty → marking done. Unmarked objects: <b>' + (dead.length ? dead.join(', ') : 'none') + '</b>. ' + (dead.length ? 'They are garbage even if they point at each other or at live objects (e.g. H→F does not keep H alive: references only keep their <i>targets</i> alive).' : 'Everything is reachable.'), parts: [{ type: 'graph', label: 'Result: green = live, red = garbage', directed: true, height: 74, nodes: nodes, edges: allEdges, hl: hlDead }, { type: 'set', label: 'Garbage to reclaim', items: dead, hl: dead.reduce(function (a, d) { a[d] = 'bad'; return a; }, {}) }] });
        F.push({ narr: 'Now the collector reclaims memory: a <b>sweeper</b> frees the red objects in place (leaving holes), a <b>compactor</b> slides the green ones together, or a <b>copying</b> collector had already copied the green ones elsewhere and wipes the whole old area. Cost of marking ∝ <b>live</b> objects + references.', parts: [{ type: 'array', label: 'Heap before (by address)', values: ids, hl: ids.reduce(function (a, d, i) { a[i] = marked[d] ? 'g' : 'r'; return a; }, {}) }, { type: 'array', label: 'Heap after compaction', values: ids.filter(function (x) { return marked[x]; }).concat(dead.map(function () { return '·'; })), hl: ids.filter(function (x) { return marked[x]; }).reduce(function (a, d, i) { a[i] = 'g'; return a; }, {}) }] });
        return F;
      }
    }, {
      title: 'Generational heap: objects age through minor GCs (Eden → Survivor → Old)',
      input: 'eden=4 surv=2 tenure=2 old=8 life=0,1,0,3,0,0,5,1,0,2,0,0,1,4,0,0,0,2,0,0',
      inputLabel: 'eden/surv/old capacities, tenure threshold, life = how many GCs each new object survives',
      gen: function (input) {
        var o = kvParse(input, { eden: 4, surv: 2, tenure: 2, old: 8, life: '0,1,0,3,0,0,5,1,0,2,0,0,1,4,0,0,0,2,0,0' });
        var E = num(o.eden, 2, 8, 'eden'), S = num(o.surv, 1, 6, 'surv'), T = num(o.tenure, 1, 15, 'tenure'), O = num(o.old, 2, 12, 'old');
        var L = String(o.life).split(',').map(function (x) { return num(x, 0, 20, 'each life value'); });
        if (L.length > 30) throw new Error('Use at most 30 objects');
        var W = Math.max(E, S, O), eden = [], from = [], to = [], old = [], F = [], gcs = 0, promoted = 0, premature = 0;
        function cell(ob) { return ob ? ob.name + ' a' + ob.age + (ob.dead ? ' †' : '') : ''; }
        function row(arr) { var r = []; for (var i = 0; i < W; i++) r.push(i < arr.length ? cell(arr[i]) : ''); return r; }
        function frame(narr, hl, extraVars) {
          var vals = { 'minor GCs': gcs, promoted: promoted, 'premature promotions': premature };
          F.push({ narr: narr, parts: [
            { type: 'grid', label: 'Heap spaces (name aAge; † = dead but still occupying Old)', rowHead: ['Eden (' + E + ')', 'Survivor FROM (' + S + ')', 'Survivor TO (' + S + ')', 'Old (' + O + ')'], colHead: Array.apply(null, Array(W)).map(function (_, i) { return String(i); }), rows: [row(eden), row(from), row(to), row(old)], hl: hl || {} },
            { type: 'vars', label: 'Counters', vals: extraVars ? Object.assign(vals, extraVars) : vals }
          ] });
        }
        function fullGC() {
          var before = old.length;
          old = old.filter(function (ob) { return !ob.dead; });
          frame('<b>Old is full → FULL / major GC</b> (long stop-the-world in Serial/Parallel; G1 tries to avoid this with concurrent marking + mixed GCs). It removes ' + (before - old.length) + ' dead object(s) from Old.', {}, { 'full GCs': 1 });
          if (old.length >= O) { frame('<span class="c-r">Old is still full of LIVE objects → OutOfMemoryError: Java heap space.</span> Either the live set really is bigger than the heap, or there is a leak.'); return false; }
          return true;
        }
        function minor() {
          gcs++;
          var hl = {};
          eden.forEach(function (ob, i) { hl['0,' + i] = ob.left > 0 ? 'ok' : 'bad'; });
          from.forEach(function (ob, i) { hl['1,' + i] = ob.left > 0 ? 'ok' : 'bad'; });
          var liveN = eden.concat(from).filter(function (ob) { return ob.left > 0; }).length;
          frame('<b>Eden is full</b> → minor GC #' + gcs + ' (stop-the-world, but short). Trace from roots: <span class="c-g">green</span> objects are still reachable, <span class="c-r">red</span> are dead. Only ' + liveN + ' of ' + (eden.length + from.length) + ' are alive — most objects die young.', hl);
          to = []; var hl2 = {}, notes = [];
          old.forEach(function (ob) { if (!ob.dead) { if (ob.left <= 0) ob.dead = true; else ob.left--; } });
          var movers = eden.concat(from);
          for (var i = 0; i < movers.length; i++) {
            var ob = movers[i];
            if (ob.left <= 0) continue;
            ob.left--; ob.age++;
            if (ob.age >= T || to.length >= S) {
              if (old.length >= O && !fullGC()) return false;
              if (ob.age < T) { premature++; notes.push(ob.name + ' (survivor full!)'); ob.prem = true; } else notes.push(ob.name + ' (age ' + ob.age + ')');
              promoted++; old.push(ob); hl2['3,' + (old.length - 1)] = ob.prem ? 'bad' : 'sel';
            } else { to.push(ob); hl2['2,' + (to.length - 1)] = 'ok'; }
          }
          eden = []; from = [];
          frame('Copy phase: live objects get <b>age +1</b> and are copied to Survivor TO, or <b>promoted</b> to Old when age ≥ ' + T + '. ' + (notes.length ? 'Promoted: ' + notes.join(', ') + '. ' : '') + (premature ? '<span class="c-r">Red in Old = premature promotion</span>: survivor overflowed, so short-lived objects polluted Old. ' : '') + 'Eden and FROM are now wiped in one step.', hl2);
          from = to; to = [];
          var hl3 = {}; from.forEach(function (ob, i) { hl3['1,' + i] = 'win'; });
          frame('The survivors swap roles: TO becomes the new FROM (the "S0/S1 ping-pong"). Eden is empty and allocation continues with a fresh bump pointer.', hl3);
          return true;
        }
        frame('Empty heap. Every object you <code>new</code> is born in <b>Eden</b>. Each object\'s <i>life</i> value says how many GCs it will survive before becoming unreachable.');
        for (var i = 0; i < L.length; i++) {
          if (eden.length >= E && !minor()) return F;
          var ob = { name: 'o' + (i + 1), left: L[i], age: 0 };
          eden.push(ob);
          var h = {}; h['0,' + (eden.length - 1)] = 'cur';
          frame('<code>new</code> → <b>' + ob.name + '</b> allocated in Eden by bumping the TLAB pointer (fast, no locking). It will survive ' + L[i] + ' GC(s).', h);
        }
        frame('Done. ' + gcs + ' minor GCs, ' + promoted + ' promotions (' + premature + ' premature). Notice the GC work was proportional to the <b>few survivors</b>, not to the number of allocations (' + L.length + '). Try <code>surv=1</code> to see premature promotion, or a large life value to see tenuring.');
        return F;
      }
    }],
    examples: [
      { title: 'Why "obj = null" rarely matters', html: `<p>Inside a method, once a local is no longer used, the JIT's liveness analysis already treats it as dead — it is not a root anymore even before the method returns. Nulling helps only for long-lived references: a field in a long-lived object, a slot in your own array-based stack (${C('elements[--size] = null;')} in a hand-written stack — Effective Java's "obsolete references" example), or a static.</p>`, code: `
class MyStack {
    private Object[] elements = new Object[16];
    private int size;
    void push(Object o) { if (size == elements.length) elements = Arrays.copyOf(elements, size * 2); elements[size++] = o; }
    Object pop() {
        Object o = elements[--size];
        elements[size] = null;      // without this, the array keeps the popped object reachable (a leak)
        return o;
    }
}` },
      { title: 'Reading a young GC line', html: `<p>${C('GC(42) Pause Young (Normal) (G1 Evacuation Pause) 1530M->212M(4096M) 11.4ms')}: before the pause 1530 MB was used, after it 212 MB; total heap committed 4096 MB; pause 11.4 ms. About 1.3 GB of garbage was reclaimed by copying only the survivors. If "after" keeps creeping up across hours of young GCs, Old is filling — a promotion or leak problem.</p>` },
      { title: 'Premature promotion in a batch job', html: `<p>A job loads 200 MB of rows per batch and keeps them for ~3 seconds. Survivor spaces are 30 MB each, so most rows overflow straight into Old after one young GC, then die there. Old fills with garbage → frequent major GCs. Fixes: bigger young generation (${C('-Xmn')} or let G1 size it), process smaller batches, or stream rows instead of materialising them.</p>` },
      { title: 'Cleaner instead of finalize', html: `<p>Finalizers ran at unpredictable times on one thread, resurrected objects and slowed GC. Modern code uses try-with-resources for deterministic release, and ${C('Cleaner')} only as a safety net.</p>`, code: `
import java.lang.ref.Cleaner;
class NativeBuffer implements AutoCloseable {
    private static final Cleaner CLEANER = Cleaner.create();
    private final Cleaner.Cleanable cleanable;
    NativeBuffer() {
        long handle = 42L;                                   // pretend native handle
        // The cleanup action must NOT reference 'this', or the object can never become unreachable.
        cleanable = CLEANER.register(this, () -> System.out.println("free handle " + handle));
    }
    @Override public void close() { cleanable.clean(); }   // deterministic path; runs at most once
}` }
    ],
    deepDive: `<p><b>Tri-colour marking.</b> White = not yet seen, grey = reached but fields not scanned, black = fully scanned. Marking is done when no grey objects remain. Concurrent collectors must preserve the invariant "no black object points to a white object" while the application keeps mutating references — they use <b>write barriers</b> (G1's SATB: snapshot-at-the-beginning records the <i>old</i> value of overwritten references) or <b>load barriers</b> (ZGC) to avoid losing live objects.</p>
<p><b>Card tables and remembered sets.</b> A minor GC must find Old→Young references without scanning all of Old. Every reference store into Old runs a tiny <b>write barrier</b> that marks a 512-byte <b>card</b> dirty; the minor GC scans only dirty cards as extra roots. G1 generalises this to per-region <b>remembered sets</b>. This is why storing references into old objects (e.g. huge long-lived caches being constantly updated) makes young GCs slower.</p>
<p><b>Tenuring is adaptive.</b> ${C('MaxTenuringThreshold')} (default 15, the object header has 4 age bits) is an upper bound; HotSpot computes the actual threshold each GC so that survivors fill at most ${C('TargetSurvivorRatio')} (50%) of a survivor space. Objects larger than a limit may be allocated directly in Old (Serial/Parallel with ${C('PretenureSizeThreshold')}; G1 "humongous" objects ≥ half a region).</p>
<p><b>Throughput, latency, footprint — pick two.</b> Every collector trades these. Bigger heaps mean fewer GCs (throughput) but, for STW collectors, longer full pauses (latency). Concurrent collectors cut pauses by spending extra CPU and memory on barriers and concurrent threads. Allocation <i>rate</i> (MB/s) and <i>live set</i> size are the two numbers that decide everything.</p>
<p><b>Reference types.</b> ${C('SoftReference')} (cleared under memory pressure — tempting for caches, but makes GC behaviour unpredictable), ${C('WeakReference')} (cleared at the next GC that finds the referent only weakly reachable — used by ${C('WeakHashMap')}), ${C('PhantomReference')} (post-mortem cleanup; basis of ${C('Cleaner')}). Each adds work to reference processing during GC.</p>
<p><b>Safepoint bias.</b> STW phases require all threads at a safepoint. A thread in a long counted loop without safepoint polls used to delay everyone ("time to safepoint"); modern HotSpot uses loop strip mining and thread-local handshakes to keep this short, but it still appears in logs as the gap between "safepoint begin" and "at safepoint".</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants are good at turning raw GC logs into a story ("young GCs every 400 ms, 30% of survivors promoted early, old occupancy rises 2%/min") and at drawing the reachability chain from a heap-dump excerpt. Tools like GCeasy and JDK Mission Control's automated analysis increasingly come with AI summaries.</p>
<p><b>Where AI goes wrong:</b> claiming Java uses reference counting, saying ${C('System.gc()')} "frees memory immediately", suggesting finalizers, or recommending ${C('-XX:+UseConcMarkSweepGC')} (CMS was removed in JDK 14). It also confuses "GC freed little" with "GC is broken" when the live set simply is large.</p>
<p><b>What you still own:</b> the reachability mental model (it explains every leak), knowing the generational trade-offs well enough to judge a suggested flag, and validating any change with before/after GC logs under realistic load. AI explanations should be checked against the actual log lines.</p>`,
    problems: [{
      title: 'Find the Garbage: Simulate the Mark Phase',
      level: 'Medium', tags: ['GC', 'graph traversal', 'BFS'], companies: ['Amazon', 'Microsoft', 'Oracle'],
      statement: `<p>The heap has ${C('n')} objects numbered 0..n−1. ${C('refs[i]')} lists the objects that object i points to. ${C('roots')} lists the objects referenced directly by GC roots. Return the <b>sorted list of garbage objects</b> (unreachable from any root). Then explain why a reference-counting collector would free a different set.</p>`,
      constraints: `1 ≤ n ≤ 10<sup>6</sup>, total references ≤ 3·10<sup>6</sup>. Cycles allowed. Self-references allowed.`,
      example: `<p>n = 6, refs = [[1], [2], [0], [4], [3], [5]], roots = [0]</p>${H.table(['object', 'reachable?', 'why'], [['0,1,2', H.c('g', 'yes'), 'root → 0 → 1 → 2 → 0'], ['3,4', H.c('r', 'no'), 'cycle 3 ↔ 4, nobody from a root points in'], ['5', H.c('r', 'no'), 'only points to itself']])}<p>Output ${H.c('g', '[3, 4, 5]')}. Reference counting would free <b>nothing</b>: every object has count ≥ 1.</p>`,
      brute: { why: `<p>For each object, run a separate search from the roots to see whether it is reachable: n searches × O(n + E) each = O(n·(n+E)) — 10<sup>12</sup> operations. Real collectors do <b>one</b> traversal that marks everything reachable.</p>`, code: `
class GarbageBrute {
    static List<Integer> garbage(int n, int[][] refs, int[] roots) {
        List<Integer> out = new ArrayList<>();
        for (int target = 0; target < n; target++) {
            boolean[] seen = new boolean[n];               // fresh search per object: O(n * (n + E))
            Deque<Integer> st = new ArrayDeque<>();
            for (int r : roots) { st.push(r); seen[r] = true; }
            boolean found = false;
            while (!st.isEmpty() && !found) {
                int u = st.pop();
                if (u == target) found = true;
                for (int v : refs[u]) if (!seen[v]) { seen[v] = true; st.push(v); }
            }
            if (!found) out.add(target);
        }
        return out;
    }
}` },
      mcq: { q: 'Object X is referenced only by object Y, and Y is garbage. Is X garbage?', options: ['Yes — incoming references from garbage do not count; only paths from roots matter', 'No — it has a reference so it is live', 'Only if X is in the old generation', 'Only after finalize() runs'], answer: 0, explain: 'Liveness is reachability from roots. A reference from a dead object does not make anything live.' },
      hints: [`<p>Hint 1: Garbage = complement of "reachable from roots". Compute reachable <b>once</b> with a single BFS/DFS seeded with <b>all</b> roots.</p>`, `<p>Hint 2: Use a ${C('boolean[] marked')} (that is literally the GC's mark bitmap) and an explicit ${C('int[]')} worklist so a 10<sup>6</sup>-long chain does not overflow the stack.</p>`, `<p>Hint 3: Recipe — mark every root, push it. Pop u, for each v in refs[u] not marked: mark, push. Finally scan 0..n−1 and collect unmarked indices (already sorted).</p>`],
      solution: {
        approach: `<p>Exactly the mark phase of a tracing collector: one multi-source traversal over the object graph using a mark bitmap and an explicit worklist (grey set). The sweep phase is a linear scan of the bitmap. Cycles are handled naturally because marked objects are never pushed again.</p>`,
        code: `
class MarkPhase {
    static List<Integer> garbage(int n, int[][] refs, int[] roots) {
        boolean[] marked = new boolean[n];          // the "mark bitmap"
        int[] work = new int[n];                    // grey worklist; each object pushed at most once
        int top = 0;
        for (int r : roots) if (!marked[r]) { marked[r] = true; work[top++] = r; }
        while (top > 0) {
            int u = work[--top];                    // u becomes black once its fields are scanned
            for (int v : refs[u]) {
                if (!marked[v]) { marked[v] = true; work[top++] = v; }
            }
        }
        List<Integer> dead = new ArrayList<>();     // "sweep": everything unmarked is garbage
        for (int i = 0; i < n; i++) if (!marked[i]) dead.add(i);
        return dead;
    }

    public static void main(String[] args) {
        int[][] refs = { {1}, {2}, {0}, {4}, {3}, {5} };
        System.out.println(garbage(6, refs, new int[] { 0 }));   // [3, 4, 5]
    }
}`,
        dry: { head: ['step', 'pop', 'newly marked', 'worklist', 'marked set'], rows: [
          ['roots', '—', '0', '[0]', '{0}'], ['1', '0', '1', '[1]', '{0,1}'], ['2', '1', '2', '[2]', '{0,1,2}'],
          ['3', '2', '— (0 already marked: cycle stops here)', '[]', '{0,1,2}'], ['sweep', '—', '—', '—', H.c('r', 'garbage = [3,4,5]')]
        ] },
        complexity: `<p>O(n + E) time, O(n) extra memory (bitmap + worklist). Real collectors parallelise this with work-stealing queues across GC threads and run it concurrently using barriers.</p>`,
        followUps: ['How would a concurrent marker stay correct if the program moves a reference while you trace?', 'Add generations: how do you find old→young references without scanning old? (card table)', 'Return the size of garbage in bytes given object sizes']
      }
    }]
  });

  /* ======================================================================
     TOPIC 6 — GC algorithms: Serial, Parallel, G1, ZGC (+ Shenandoah, Epsilon)
     ====================================================================== */
  topics.push({
    title: 'GC Algorithms Compared: Serial, Parallel, G1, ZGC (and Shenandoah, Epsilon)',
    analogy: `<p>Four ways to clean a busy restaurant. <b>Serial</b>: one cleaner, and all customers must leave while he cleans — fine for a tiny café. <b>Parallel</b>: a team of cleaners, customers still leave, but the cleaning is over faster — best when you only care about total meals served per day. <b>G1</b>: the floor is divided into tables; during short planned breaks the team cleans the <i>dirtiest</i> tables first and stops before the break runs over. <b>ZGC</b>: cleaners work <i>while customers eat</i>, moving plates around carefully; customers are interrupted only for a blink. You pay with more staff (CPU) and a bit more space.</p>`,
    explain: `<p>All HotSpot collectors share the ideas from the previous topic (tracing, generations, copying/compaction). They differ in <b>how much work happens while your threads are stopped</b>, and how they split the heap.</p>
${H.table(['Collector', 'Flag', 'Threads', 'Pauses', 'Best for'], [
  ['<b>Serial</b>', C('-XX:+UseSerialGC'), '1 GC thread, all STW', 'young: short; full: long (∝ live set)', 'tiny heaps (&lt; ~100s of MB), 1-CPU containers, CLIs'],
  ['<b>Parallel</b>', C('-XX:+UseParallelGC'), 'many GC threads, all STW', 'young: short; full: long but parallel', 'batch jobs, max <b>throughput</b>, pauses OK'],
  ['<b>G1</b> (default since Java 9)', C('-XX:+UseG1GC'), 'parallel STW evacuation + concurrent marking', 'aims for a <b>target</b> (default 200 ms), typically 5–100 ms', 'general-purpose services, heaps 2–64 GB'],
  ['<b>ZGC</b> (generational)', C('-XX:+UseZGC'), 'almost everything concurrent', H.c('g', 'sub-millisecond') + ', independent of heap size', 'latency-critical services, huge heaps (up to 16 TB)'],
  ['<b>Shenandoah</b>', C('-XX:+UseShenandoahGC'), 'concurrent marking + concurrent compaction', 'low ms, independent of heap size', 'low-latency alternative (OpenJDK builds from Red Hat, Amazon…)'],
  ['<b>Epsilon</b>', C('-XX:+UseEpsilonGC') + ' (experimental)', 'none', 'never collects — OOM when full', 'benchmarks, ultra-short jobs, GC-overhead experiments']
])}
<h4>How the JVM picks by default</h4>
<p>On a "server-class" machine (≥ 2 CPUs and ≥ ~1.8 GB of memory visible — container limits count) the default is <b>G1</b>; otherwise <b>Serial</b>. That surprises people: a container limited to 1 CPU silently gets Serial GC.</p>
<h4>G1 in five sentences</h4>
<ol><li>The heap is cut into ~2048 equal <b>regions</b> (1–32 MB each); each region is dynamically Eden, Survivor, Old, Humongous or free.</li>
<li><b>Young GCs</b> evacuate (copy) live objects out of all Eden/Survivor regions, in parallel, stop-the-world.</li>
<li>When old occupancy crosses the (adaptive) <b>IHOP</b> threshold (starts at 45%), a <b>concurrent marking</b> cycle computes how much live data each old region has.</li>
<li><b>Mixed GCs</b> then evacuate young regions plus the old regions with the most garbage — "<b>Garbage-First</b>" — choosing how many so the pause stays under ${C('-XX:MaxGCPauseMillis')}.</li>
<li>Objects ≥ half a region are <b>humongous</b>: allocated directly in contiguous old regions. If evacuation cannot keep up, G1 falls back to a (parallel) <b>Full GC</b> — the thing to avoid.</li></ol>
<h4>ZGC in four sentences</h4>
<ol><li>Marking, relocation (moving objects) and reference fixing all run <b>concurrently</b> with your threads.</li>
<li>It uses <b>coloured pointers</b> (metadata bits inside each 64-bit reference) and <b>load barriers</b>: every time your code loads a reference from the heap, a tiny check makes sure it points to the object's current location.</li>
<li>Pauses only scan thread stacks/roots — <b>well under 1 ms</b>, whether the heap is 1 GB or 4 TB.</li>
<li>Since JDK 21 it is <b>generational</b> (default mode from JDK 23; the old non-generational mode was removed in JDK 24), which cut its CPU and memory overhead a lot.</li></ol>
<h4>History you should know for interviews</h4>
<p><b>CMS</b> (Concurrent Mark Sweep) was the old low-pause collector: concurrent marking but no compaction, so it fragmented and eventually did long full GCs. Deprecated in Java 9, <b>removed in Java 14</b>. The default was Parallel in Java 8, G1 from Java 9.</p>`,
    clues: [
      '"Which GC would you choose for a trading / ad-bidding / p99-sensitive service?" → ZGC (or Shenandoah)',
      '"Nightly batch job, only total runtime matters" → Parallel GC (throughput)',
      '"Default GC? What does MaxGCPauseMillis do?" → G1 and its pause-time goal',
      '"Heap of 200 GB" / "pauses must not grow with heap size" → ZGC',
      '"Container with 1 CPU and 512 MB" → JVM picks Serial; often the right call',
      '"Humongous allocation", "to-space exhausted", "mixed GC", "IHOP" → G1 internals'
    ],
    code: [{ lang: 'bash', title: 'Selecting and observing each collector', code: `java -XX:+UseSerialGC   -Xmx256m -Xlog:gc -jar cli.jar
java -XX:+UseParallelGC -Xmx16g  -Xlog:gc -jar batch.jar
java -XX:+UseG1GC -XX:MaxGCPauseMillis=100 -Xmx8g -Xlog:gc*:file=gc.log:time,uptime,level,tags -jar api.jar
java -XX:+UseZGC        -Xmx32g  -Xlog:gc -jar latency-critical.jar      # generational by default on JDK 23+
java -XX:+UseShenandoahGC -Xmx8g -Xlog:gc -jar app.jar                     # needs a build that includes it

java -XX:+PrintFlagsFinal -version | grep -E "Use.*GC |MaxGCPauseMillis|G1HeapRegionSize"   # what did ergonomics pick?
jcmd <pid> VM.flags                                                        # flags of a running JVM` }, `
import java.lang.management.*;

// Which collector is this JVM running, and how much time has it spent collecting?
class WhichGc {
    public static void main(String[] args) {
        for (GarbageCollectorMXBean gc : ManagementFactory.getGarbageCollectorMXBeans()) {
            // G1: "G1 Young Generation", "G1 Concurrent GC", "G1 Old Generation"
            // ZGC: "ZGC Minor Cycles"/"ZGC Major Cycles" and pause beans; Parallel: "PS Scavenge", "PS MarkSweep"
            System.out.printf("%-28s collections=%d time=%d ms%n", gc.getName(), gc.getCollectionCount(), gc.getCollectionTime());
        }
        System.out.println("JVM: " + System.getProperty("java.vm.name") + " " + Runtime.version());
    }
}`],
    codeTitle: ['Flags', 'Detecting the collector at runtime'],
    viz: [{
      title: 'G1 regions: young GC, humongous objects, concurrent marking, mixed GC',
      gen: function () {
        var R = 4, Cn = 8;
        function blank() { var g = []; for (var r = 0; r < R; r++) { var row = []; for (var c = 0; c < Cn; c++) row.push('·'); g.push(row); } return g; }
        function put(g, list, val) { list.forEach(function (k) { var p = k.split(','); g[+p[0]][+p[1]] = val; }); }
        function hl(list, cls) { var h = {}; list.forEach(function (k) { h[k] = cls; }); return h; }
        function f(narr, g, h, vars) { return { narr: narr, parts: [{ type: 'grid', label: 'G1 heap: 32 regions (E=eden S=survivor O=old with live % H=humongous ·=free)', rowHead: ['0', '1', '2', '3'], colHead: ['0', '1', '2', '3', '4', '5', '6', '7'], rows: g.map(function (r) { return r.slice(); }), hl: h || {} }, { type: 'vars', label: 'G1 state', vals: vars }] }; }
        var F = [], g = blank();
        F.push(f('G1 divides the heap into equal <b>regions</b> (here 32; real heaps ~2048 regions of 1–32 MB). No fixed young/old boundary: any free region can become anything.', g, {}, { phase: 'idle', 'old occupancy': '0%', 'pause target': '200 ms' }));
        var eden = ['0,0', '0,1', '0,2', '0,3', '0,4', '0,5'];
        put(g, eden, 'E');
        F.push(f('The application allocates into <b>Eden regions</b> (6 here). G1 sizes the young generation dynamically so that a young pause fits the pause target.', g, hl(eden, 'cur'), { phase: 'mutator running', 'eden regions': 6 }));
        put(g, eden, '·'); put(g, ['1,0'], 'S'); put(g, ['2,0', '2,1'], 'O 90%');
        F.push(f('<b>Young GC</b> (stop-the-world, parallel): live objects from all 6 Eden regions are <b>evacuated</b> (copied) into 1 Survivor region; old-enough ones go to Old regions. All 6 Eden regions become free at once. Pause ≈ 8 ms because only survivors are copied.', g, Object.assign(hl(['1,0'], 'ok'), hl(['2,0', '2,1'], 'sel')), { phase: 'young GC (STW)', pause: '8 ms', 'freed regions': 6 }));
        var olds = ['2,0', '2,1', '2,2', '2,3', '2,4', '2,5', '2,6', '2,7', '3,0', '3,1'];
        var lives = ['90%', '85%', '30%', '10%', '60%', '5%', '75%', '20%', '95%', '40%'];
        olds.forEach(function (k, i) { put(g, [k], 'O ' + lives[i]); });
        put(g, ['0,0', '0,1', '0,2', '0,3'], 'E'); put(g, ['1,0'], '·'); put(g, ['1,1'], 'S');
        F.push(f('Many young GCs later, promoted objects have filled <b>10 Old regions</b>. The percentages are what each region\'s live data <i>will</i> turn out to be — G1 does not know them yet.', g, hl(olds, 'win'), { phase: 'mutator running', 'old occupancy': '10/32 regions = 31%' }));
        put(g, ['3,3', '3,4', '3,5'], 'H');
        F.push(f('<code>new byte[40 MB]</code> with 16 MB regions: anything ≥ half a region is <b>humongous</b>. It gets 3 <b>contiguous</b> regions directly in Old (never copied). Lots of humongous allocations fragment the heap and trigger early marking — a classic G1 tuning issue (fix: bigger <code>G1HeapRegionSize</code> or smaller objects).', g, hl(['3,3', '3,4', '3,5'], 'bad'), { phase: 'humongous allocation', 'old occupancy': '13/32 = 41%' }));
        put(g, ['3,2'], 'O 50%');
        F.push(f('Old occupancy crosses <b>IHOP</b> (InitiatingHeapOccupancyPercent, adaptive, starts at 45%) → G1 starts a <b>concurrent marking cycle</b>. The initial mark piggybacks on a young pause; then marking runs <i>alongside</i> the application using SATB write barriers.', g, hl(olds.concat(['3,2']), 'cur'), { phase: 'concurrent mark (app keeps running)', 'old occupancy': '14/32 = 44% + H' }));
        F.push(f('<b>Remark</b> (short STW) finishes marking; <b>Cleanup</b> computes exact live bytes per region and immediately frees regions that are 100% garbage (and dead humongous objects). Now G1 knows each region\'s liveness.', g, Object.assign(hl(['2,3', '2,5'], 'ok'), hl(['2,0', '3,0'], 'bad')), { phase: 'remark + cleanup', 'most garbage': '2,5 (5% live), 2,3 (10%), 2,7 (20%)' }));
        var cset = ['2,5', '2,3', '2,7', '2,2'];
        F.push(f('<b>Mixed GC</b>: the collection set = all young regions + the old regions with the <b>most garbage first</b> (5%, 10%, 20%, 30% live). G1 predicts the copy cost per region and adds regions only while the predicted pause stays under the target. Regions above 85% live (G1MixedGCLiveThresholdPercent) are not worth copying.', g, Object.assign(hl(cset, 'sel'), hl(['0,0', '0,1', '0,2', '0,3', '1,1'], 'cur')), { phase: 'mixed GC (STW)', 'collection set': 'young + 4 old', 'predicted pause': '42 ms ≤ 200 ms' }));
        put(g, cset, '·'); put(g, ['0,0', '0,1', '0,2', '0,3'], '·'); put(g, ['1,1'], '·'); put(g, ['1,2'], 'S'); put(g, ['1,3'], 'O 100%');
        F.push(f('After the mixed GC: the 4 garbage-heavy old regions were compacted into <b>one</b> fully-live region (1,3); 4 + 5 regions freed. Several mixed GCs usually follow until the remaining candidates are not worth it. Old space was compacted <b>incrementally</b>, never with a long full GC.', g, Object.assign(hl(['1,3'], 'ok'), hl(['1,2'], 'ok')), { phase: 'mutator running', 'old occupancy': 'down ~25%' }));
        F.push(f('Failure mode: if allocation outruns this (no free region to evacuate into → "to-space exhausted" / evacuation failure), G1 does a <b>Full GC</b>: stop-the-world mark-compact of the whole heap (parallel since JDK 10, still seconds on big heaps). Seeing <code>Pause Full</code> in the log is your signal to tune or fix allocation.', g, {}, { 'log line to fear': 'Pause Full (G1 Compaction Pause)' }));
        return F;
      }
    }, {
      title: 'Pause times vs heap size: which collector fits your SLO?',
      input: 'heapGB=16 liveGB=6 cpus=8',
      inputLabel: 'heapGB, liveGB (data still alive after GC), cpus',
      gen: function (input) {
        var o = kvParse(input, { heapGB: 16, liveGB: 6, cpus: 8 });
        var heap = num(o.heapGB, 1, 4096, 'heapGB'), live = num(o.liveGB, 0, 4096, 'liveGB'), cpus = num(o.cpus, 1, 256, 'cpus');
        if (live >= heap) throw new Error('liveGB must be smaller than heapGB (otherwise: OutOfMemoryError)');
        // Illustrative order-of-magnitude model: ~1 s of single-threaded full-GC work per GB of live data.
        var serial = Math.round(live * 1000), par = Math.round(live * 1000 / Math.max(1, cpus * 0.7));
        var g1 = Math.min(200, Math.max(10, Math.round(20 + live * 4))), zgc = 0.5;
        var names = ['Serial full', 'Parallel full', 'G1 typical', 'ZGC typical'], vals = [serial, par, g1, zgc];
        function bars(n) { return { type: 'bars', label: 'Worst routine pause (ms, illustrative)', values: vals.slice(0, n), idxLabels: names.slice(0, n), texts: vals.slice(0, n).map(function (v) { return v >= 1000 ? (v / 1000).toFixed(1) + ' s' : v + ' ms'; }), hl: one(n - 1, 'cur') }; }
        var F = [];
        F.push({ narr: 'Heap ' + heap + ' GB with ' + live + ' GB live after GC, ' + cpus + ' CPUs. Rule of thumb used here (illustrative!): one thread needs ~1 s to mark/compact 1 GB of live objects. The <b>live set</b>, not the heap size, drives full-GC cost.', parts: [{ type: 'vars', label: 'Workload', vals: { heapGB: heap, liveGB: live, cpus: cpus, 'free headroom GB': heap - live } }] });
        F.push({ narr: '<b>Serial</b>: one thread, application stopped. Young GCs are fine, but a full GC of ' + live + ' GB live ≈ <b>' + (serial / 1000).toFixed(1) + ' s</b> pause. Acceptable for a CLI, unacceptable for an API.', parts: [bars(1)] });
        F.push({ narr: '<b>Parallel</b>: same stop-the-world model, ' + cpus + ' GC threads → full GC ≈ <b>' + (par >= 1000 ? (par / 1000).toFixed(1) + ' s' : par + ' ms') + '</b>. Highest throughput (least total CPU spent on GC, no barriers), so it wins for batch jobs.', parts: [bars(2)] });
        F.push({ narr: '<b>G1</b>: incremental — it collects young + a few old regions per pause and does marking concurrently, aiming at <code>MaxGCPauseMillis</code>. Typical pauses here ≈ <b>' + g1 + ' ms</b>. Pays ~5–10% throughput for barriers and remembered sets.', parts: [bars(3)] });
        F.push({ narr: '<b>ZGC</b>: marking and moving objects happen concurrently; pauses only touch roots → <b>&lt; 1 ms</b> regardless of ' + heap + ' GB heap. Costs: extra CPU for concurrent GC threads + load barriers, and it needs headroom: if allocation outruns the concurrent cycle, threads get <i>allocation stalls</i>.', parts: [bars(4)] });
        F.push({ narr: 'Decision summary. Note full GCs are what the collector does in the <i>worst</i> case; a well-tuned G1 rarely does them, and ZGC has no traditional full GC at all.', parts: [{ type: 'table', label: 'Pick by goal', columns: ['Goal', 'Choose', 'Why'], rows: [['max throughput, pauses OK', 'Parallel', 'no concurrent overhead'], ['balanced default, heap ≤ ~64 GB', 'G1', 'predictable pauses, good throughput'], ['p99.9 latency, big heap', 'ZGC (gen.)', 'sub-ms pauses'], ['1 CPU / tiny heap', 'Serial', 'no thread coordination cost']], hl: live >= 16 ? { 2: 'sel' } : { 1: 'sel' } }] });
        return F;
      }
    }, {
      title: 'Why concurrent marking needs barriers: the lost-object problem',
      gen: function () {
        var nodes = [{ id: 'R', label: 'root', x: 10, y: 30, shape: 'box' }, { id: 'A', label: 'A', x: 38, y: 12 }, { id: 'B', label: 'B', x: 38, y: 48 }, { id: 'C', label: 'C', x: 75, y: 48 }];
        function g(edges, hl, ehl) { return { type: 'graph', label: 'Black = scanned (sel), grey = in worklist (cur), white = not reached', directed: true, height: 60, nodes: nodes, edges: edges, hl: hl, ehl: ehl || {} }; }
        return [
          { narr: 'Concurrent marking in progress. <b>A</b> is already scanned (black). <b>B</b> is reached but not scanned (grey). <b>C</b> is reachable only through B (white).', parts: [g([['R', 'A'], ['R', 'B'], ['B', 'C']], { R: 'sel', A: 'sel', B: 'cur' })] },
          { narr: 'The application (running at the same time) executes <code>A.f = C;</code> — a black object now points to a white one. The marker will never rescan A.', parts: [g([['R', 'A'], ['R', 'B'], ['B', 'C'], ['A', 'C']], { R: 'sel', A: 'sel', B: 'cur' }, { 'A-C': 'cur' })] },
          { narr: 'Then it executes <code>B.g = null;</code> — the only grey path to C disappears. When the marker scans B it finds nothing. C stays white…', parts: [g([['R', 'A'], ['R', 'B'], ['A', 'C']], { R: 'sel', A: 'sel', B: 'sel' }, { 'A-C': 'cur' })] },
          { narr: '…and would be <span class="c-r">freed while still reachable through A</span> → memory corruption. Both conditions were needed: black→white store AND removal of the last grey→white path.', parts: [g([['R', 'A'], ['R', 'B'], ['A', 'C']], { R: 'sel', A: 'sel', B: 'sel', C: 'bad' }, { 'A-C': 'bad' })] },
          { narr: '<b>G1 / Shenandoah fix (SATB write barrier)</b>: before overwriting <code>B.g</code>, the barrier records the <i>old</i> value (C) in a queue; the marker treats it as live. "Snapshot-at-the-beginning": anything live when marking started survives this cycle.', parts: [g([['R', 'A'], ['R', 'B'], ['A', 'C']], { R: 'sel', A: 'sel', B: 'sel', C: 'ok' }, { 'A-C': 'ok' }), note('Write barrier (pseudo)', '<code>if (marking) satbQueue.add(B.g);  B.g = null;</code>')] },
          { narr: '<b>ZGC fix (load barrier + coloured pointers)</b>: whenever the app <i>loads</i> a reference (e.g. reads C to store it in A), the barrier checks the pointer colour and marks/remaps it if needed. The app can never get hold of an unmarked or stale pointer. Both approaches cost a few instructions per access — the price of concurrent GC.', parts: [g([['R', 'A'], ['R', 'B'], ['A', 'C']], { R: 'sel', A: 'sel', B: 'sel', C: 'ok' }), note('Load barrier (pseudo)', '<code>ref = obj.field; if (ref.color != good) ref = slowPath(ref);</code>')] }
        ];
      }
    }],
    examples: [
      { title: 'Ad-bidding service with a 50 ms budget', html: `<p>Each bid must answer within 50 ms; G1 young pauses of 30–80 ms at p99 eat the whole budget. Switching to <b>generational ZGC</b> with the same 24 GB heap drops max pauses below 1 ms. CPU use rises ~5–10% and the heap needs headroom (ZGC must finish a cycle before allocation fills the heap). Net: SLO met, two extra cores per node.</p>` },
      { title: 'Nightly ETL: Parallel beats G1', html: `<p>A 3-hour batch job with a 40 GB heap doesn't care about pauses. Switching from G1 to Parallel removes write-barrier and remembered-set overhead and finishes ~8% faster. Throughput collectors are a legit choice — "lowest pause" is not "best".</p>` },
      { title: 'G1 log lines decoded', html: `${H.table(['Log line', 'Meaning'], [[C('Pause Young (Normal) (G1 Evacuation Pause)'), 'regular young GC'], [C('Pause Young (Concurrent Start) (G1 Humongous Allocation)'), 'young GC that also starts marking, triggered by a humongous allocation'], [C('Concurrent Mark Cycle'), 'background marking (app keeps running)'], [C('Pause Remark') + ' / ' + C('Pause Cleanup'), 'short STW phases ending marking'], [C('Pause Young (Mixed)'), 'young + some old regions'], [C('To-space exhausted'), 'evacuation failure — no room to copy into'], [C('Pause Full (G1 Compaction Pause)'), H.c('r', 'the fallback you want to eliminate')]])}` },
      { title: 'Small container, surprise collector', html: `<p>A pod limited to 1 CPU and 1 GiB: ${C('java -XX:+PrintFlagsFinal -version | grep Use')} shows ${C('UseSerialGC = true')}. For a small heap with one core that is actually efficient. If you need concurrent GC there, give the pod ≥ 2 CPUs (G1/ZGC need threads to run beside your code) rather than forcing G1 onto a single core.</p>` }
    ],
    deepDive: `<p><b>G1 pause prediction.</b> G1 keeps decaying averages of costs (copy cost per byte, remembered-set scanning per card, fixed overheads) and uses them to size the young generation and choose how many old regions go into each mixed collection set. ${C('MaxGCPauseMillis')} is a <i>goal</i>, not a guarantee; setting it very low (e.g. 10 ms) shrinks the young gen, increases GC frequency and promotion, and can reduce throughput sharply.</p>
<p><b>Remembered sets and refinement.</b> Each region tracks which other regions point into it, so it can be evacuated without scanning the whole heap. Post-write barriers enqueue dirty cards; concurrent refinement threads update remembered sets. Workloads that write many cross-region references (big mutable graphs, caches) pay here — JDK 20+ reworked G1's remembered sets to cut their memory, and recent releases keep reducing barrier cost.</p>
<p><b>ZGC internals.</b> Coloured pointers store metadata bits (marked, remapped…) in each reference; generational ZGC uses store barriers too, to track young→old relationships. Because the pointer itself carries metadata, ZGC cannot use compressed oops, so references are 8 bytes — some memory overhead versus G1 on heaps under 32 GB. Relocation uses forwarding tables per page; whichever thread (GC or app) touches a moved object first fixes the reference ("self-healing"). Allocation stalls happen when the app allocates faster than ZGC can reclaim — fix with more heap headroom or more concurrent GC threads (${C('-XX:ConcGCThreads')}).</p>
<p><b>Shenandoah</b> also compacts concurrently, originally via Brooks forwarding pointers in every object, now via load-reference barriers. Its generational mode became experimental in JDK 24 and product in JDK 25. It is included in most OpenJDK distributions (but not Oracle's builds).</p>
<p><b>Parallel's adaptive sizing</b> targets ${C('GCTimeRatio')} (default 99 → aim for ≤ 1% time in GC) and can shrink/grow generations automatically; ${C('-XX:-UseAdaptiveSizePolicy')} pins sizes when you want manual control.</p>
<p><b>Throughput cost of barriers.</b> Serial/Parallel use only a cheap card-marking write barrier. G1 adds SATB pre-barriers and region-crossing post-barriers; ZGC adds load barriers. That is why the "fastest" collector for raw throughput is still Parallel, and why benchmark comparisons must measure the metric you care about (throughput, p99, footprint).</p>`,
    aiEra: `<p><b>What AI changes:</b> given a GC log and an SLO, an assistant can draft a sensible comparison plan ("run 30 minutes each with G1 at 200 ms, G1 at 50 ms, generational ZGC; compare p99 latency, CPU, RSS") and parse the resulting logs into a table. That makes evidence-based collector choices much cheaper than they used to be.</p>
<p><b>Where AI goes wrong:</b> its training data contains a decade of CMS tuning advice (${C('-XX:+UseConcMarkSweepGC')}, ${C('CMSInitiatingOccupancyFraction')}) which fails to start on JDK 14+; it may recommend ${C('-XX:+ZGenerational')} (needed only on JDK 21–22, obsolete later) or claim ZGC is "experimental" (production since JDK 15). It also tends to pick ZGC for everything, ignoring CPU cost and small-heap cases.</p>
<p><b>What you still own:</b> knowing which metric matters for <i>your</i> service, reading the log well enough to see whether pauses are GC work or time-to-safepoint, and testing under production-like load. Treat AI flag suggestions as hypotheses to measure, not configurations to paste.</p>`,
    problems: [{
      title: 'G1 Collection-Set Picker (Garbage-First under a Pause Budget)',
      level: 'Hard', tags: ['GC', 'greedy', 'G1', 'simulation'], companies: ['Oracle', 'Netflix', 'LinkedIn'],
      statement: `<p>Model G1's mixed-GC choice. Each old region i has ${C('live[i]')} MB of live data (region size ${C('R')} MB). Copying costs ${C('c')} ms per live MB; the young part of the pause costs ${C('youngMs')}. Regions with live &gt; 85% of R are never candidates. Pick old regions in order of <b>most reclaimable space first</b> (ties: lower index), adding each only while ${C('youngMs + c × (sum of chosen live)')} ≤ ${C('targetMs')}; stop at the first candidate that does not fit (like G1, which stops adding once the budget is used). Return the chosen region indices and the predicted pause.</p>`,
      constraints: `1 ≤ regions ≤ 10<sup>5</sup>, 0 ≤ live[i] ≤ R ≤ 512, 0 &lt; c ≤ 10, youngMs &lt; targetMs ≤ 1000.`,
      example: `<p>R = 16, live = [15, 2, 8, 0, 5, 14], c = 2 ms/MB, youngMs = 10, targetMs = 40.</p>${H.table(['region', 'live MB', 'garbage MB', 'candidate?'], [['0', '15', '1', H.c('r', 'no (93.75% live)')], ['3', '0', '16', 'yes'], ['1', '2', '14', 'yes'], ['4', '5', '11', 'yes'], ['2', '8', '8', 'yes'], ['5', '14', '2', H.c('r', 'no (87.5%)')]])}<p>Order 3, 1, 4, 2. Costs: 10 → +0 = 10 → +4 = 14 → +10 = 24 → +16 = 40 ✓. Output ${H.c('g', '[3, 1, 4, 2], pause 40 ms')}.</p>`,
      brute: { why: `<p>Try every subset of candidate regions and keep the one reclaiming the most space within budget (a knapsack). Exponential (2<sup>n</sup>) or pseudo-polynomial in budget — far too slow to run inside a GC pause, and G1 must decide in microseconds. The greedy "garbage-first" order is G1's practical heuristic.</p>`, code: `
class CsetBrute {
    // Exhaustive search over subsets: only feasible for n <= 20.
    static long bestReclaim(int R, int[] live, double c, double youngMs, double targetMs) {
        int n = live.length; long best = 0;
        for (int mask = 0; mask < (1 << n); mask++) {
            double cost = youngMs; long reclaim = 0; boolean ok = true;
            for (int i = 0; i < n; i++) if ((mask >> i & 1) == 1) {
                if (live[i] * 100 > 85 * R) { ok = false; break; }
                cost += c * live[i]; reclaim += R - live[i];
            }
            if (ok && cost <= targetMs) best = Math.max(best, reclaim);
        }
        return best;
    }
}` },
      mcq: { q: 'Why does G1 skip regions that are, say, 95% live?', options: ['Copying them costs a lot of pause time but frees almost nothing', 'They contain humongous objects', 'They are pinned by JNI', 'They belong to the young generation'], answer: 0, explain: 'Evacuation cost ∝ live bytes; benefit ∝ garbage bytes. A 95% live region is the worst ratio, so G1MixedGCLiveThresholdPercent (85) filters them out.' },
      hints: [`<p>Hint 1: "Garbage-first" = sort candidates by reclaimable bytes (R − live) descending. Less live data also means cheaper copying — the same order is best on both axes.</p>`, `<p>Hint 2: Filter first (${C('live * 100 <= 85 * R')}, integer math avoids floating-point surprises), then sort indices with a comparator on (garbage desc, index asc).</p>`, `<p>Hint 3: Walk the sorted list keeping ${C('pause = youngMs')}; if ${C('pause + c*live[i] <= targetMs')} add it, else <b>stop</b>. Return the chosen list and the final pause.</p>`],
      solution: {
        approach: `<p>Filter out expensive regions, sort by garbage descending (stable by index), and greedily add while the predicted pause fits — exactly G1's per-region cost prediction loop, simplified to one cost coefficient. Because garbage = R − live, sorting by garbage is also sorting by copy cost ascending, so each step adds the cheapest remaining region.</p>`,
        code: `
class G1CsetPicker {
    record Choice(List<Integer> regions, double pauseMs) {}

    static Choice pick(int R, int[] live, double costPerMb, double youngMs, double targetMs) {
        List<Integer> candidates = new ArrayList<>();
        for (int i = 0; i < live.length; i++) {
            if ((long) live[i] * 100 <= 85L * R) candidates.add(i);      // G1MixedGCLiveThresholdPercent = 85
        }
        candidates.sort(Comparator.<Integer>comparingInt(i -> R - live[i]).reversed()   // most garbage first
                                  .thenComparingInt(i -> i));                          // stable tie-break
        List<Integer> chosen = new ArrayList<>();
        double pause = youngMs;                                           // young regions are always collected
        for (int i : candidates) {
            double next = pause + costPerMb * live[i];
            if (next > targetMs) break;                                   // budget used up: stop
            pause = next;
            chosen.add(i);
        }
        return new Choice(chosen, pause);
    }

    public static void main(String[] args) {
        Choice c = pick(16, new int[] { 15, 2, 8, 0, 5, 14 }, 2.0, 10.0, 40.0);
        System.out.println(c.regions() + " pause=" + c.pauseMs() + " ms");   // [3, 1, 4, 2] pause=40.0 ms
    }
}`,
        dry: { head: ['region (sorted)', 'live', 'cost add', 'pause after', 'decision'], rows: [
          ['3', '0', '0', '10', H.c('g', 'take')], ['1', '2', '4', '14', H.c('g', 'take')], ['4', '5', '10', '24', H.c('g', 'take')], ['2', '8', '16', '40', H.c('g', 'take (= target)')], ['—', '—', '—', '40', 'no candidates left']
        ] },
        complexity: `<p>O(n log n) for sorting candidates, O(n) for the scan; O(n) extra memory. Real G1 pre-sorts candidates once after marking and then takes a prefix for each of several mixed GCs.</p>`,
        followUps: ['Spread candidates over G1MixedGCCountTarget (8) mixed GCs — how many per pause minimum?', 'Model remembered-set scan cost per region in addition to copy cost', 'Why might G1 still include an expensive region (pinned, or to meet a minimum)?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 7 — GC tuning: goals, metrics, logs, heap sizing, common fixes
     ====================================================================== */
  topics.push({
    title: 'GC Tuning: Goals, Metrics, GC Logs, Heap Sizing & the Usual Fixes',
    analogy: `<p>Tuning a GC is like setting up rubbish collection for a busy office. First decide what matters: <b>fewest interruptions</b> (latency), <b>least money spent on cleaners</b> (throughput), or <b>smallest bins</b> (footprint). Then <b>measure</b>: how fast is rubbish produced (allocation rate)? How much stuff is genuinely kept (live set)? Only then change things — bigger bins (heap), emptying the small bins more often (young gen), or simply <i>producing less rubbish</i> (fixing allocation-heavy code), which usually beats every other fix.</p>`,
    explain: `<p><b>Rule 1: don't tune blind.</b> Most "GC problems" are fixed by right-sizing the heap or by reducing allocation; exotic flags are rarely needed. Modern defaults (G1, ergonomics) are good.</p>
<h4>1. Pick the goal (you get two of three)</h4>
${H.table(['Goal', 'Metric', 'Typical target'], [['Latency', 'p99 / max pause, % of requests delayed by GC', 'p99 pause &lt; 50 ms (G1) or &lt; 1 ms (ZGC)'], ['Throughput', '% time NOT in GC', '&gt; 95–99%'], ['Footprint', 'RSS / heap committed', 'fits container with headroom']])}
<h4>2. Measure the 5 numbers that matter</h4>
<ol><li><b>Allocation rate</b> (MB/s created in Eden). Drives young-GC frequency.</li>
<li><b>Promotion rate</b> (MB/s moved to Old). Drives old-gen growth and mixed/full GCs.</li>
<li><b>Live set</b> (old occupancy right after a full or mixed GC). The heap must comfortably exceed it.</li>
<li><b>Pause times</b> (distribution, not average) and <b>GC frequency</b>.</li>
<li><b>GC CPU</b> (concurrent threads count too).</li></ol>
${P(`
# Production-grade GC logging (JDK 9+ unified logging), rotated, near-zero overhead
-Xlog:gc*,safepoint:file=/var/log/app/gc.log:time,uptime,level,tags:filecount=10,filesize=50m
# Plus: always capture evidence when it dies
-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/dumps/ -XX:+ExitOnOutOfMemoryError`)}
<h4>3. Heap sizing rules of thumb</h4>
<ul><li>Total heap ≈ <b>3–4 × live set</b> for G1/Parallel; ZGC wants extra headroom for concurrent work (allocation continues during the cycle).</li>
<li>Production servers: set ${C('-Xms')} = ${C('-Xmx')} (no resize pauses, predictable RSS), optionally ${C('-XX:+AlwaysPreTouch')} to fault pages in at startup.</li>
<li>Containers: prefer ${C('-XX:MaxRAMPercentage=60..75')} over hard-coded ${C('-Xmx')}, leaving room for Metaspace, thread stacks, direct buffers. Default is only 25%!</li>
<li>With G1, do <b>not</b> pin the young size (${C('-Xmn')}, ${C('NewRatio')}): it disables G1's pause-goal-driven young sizing.</li></ul>
<h4>4. Symptom → likely cause → fix</h4>
${H.table(['Symptom (in the log)', 'Likely cause', 'First fix'], [
  ['Young GCs every ~100 ms', 'very high allocation rate / tiny young gen', 'profile allocations (JFR); bigger heap'],
  ['Young pauses long', 'many survivors, large remembered sets, too many GC threads competing for CPU', 'reduce long-lived temp data; check CPU quota'],
  ['Old grows after each young GC then drops', 'premature promotion of medium-lived objects', 'more young/survivor space, shorter object lifetimes'],
  ['Old grows and NEVER drops (even after full GC)', H.c('r', 'memory leak'), 'heap dump + MAT (next topic)'],
  [C('G1 Humongous Allocation') + ' everywhere', 'big arrays ≥ half a region', C('-XX:G1HeapRegionSize=32m') + ' or smaller buffers'],
  [C('Pause Full') + ' in G1', 'evacuation failure, marking started too late, metaspace, ' + C('System.gc()'), 'more heap / lower IHOP / fix explicit GC'],
  ['ZGC ' + C('Allocation Stall'), 'allocation outpaces concurrent GC', 'more heap headroom, more ' + C('ConcGCThreads')],
  ['Pause logs short but app freezes', 'time-to-safepoint, swapping, CPU throttling', 'check ' + C('safepoint') + ' logs, disable swap, container CPU limits']
])}
<h4>5. The tuning loop</h4>
<p><b>Goal → baseline under realistic load → one change → re-measure → keep or revert.</b> Change one knob at a time, run long enough to include several old-gen cycles, and compare percentiles, not averages.</p>`,
    clues: [
      '"p99 latency spikes every few minutes" → read GC logs: mixed/full GCs, humongous, time-to-safepoint',
      '"Service OOMs only under peak load" → heap too small for live set + headroom, or allocation burst',
      '"What heap size would you set for this service?" → measure live set, 3–4×, container headroom',
      '"High CPU but low request rate" → GC thrashing (heap nearly full of live data)',
      '"Xms vs Xmx", "MaxRAMPercentage", "MaxGCPauseMillis", "IHOP" → tuning knobs interviewers expect',
      '"After upgrading from Java 8, GC behaviour changed" → default switched Parallel → G1'
    ],
    code: [{ lang: 'bash', title: 'A sensible production launch line (G1, container)', code: `java \\
  -XX:MaxRAMPercentage=70 -XX:InitialRAMPercentage=70 \\
  -XX:+UseG1GC -XX:MaxGCPauseMillis=100 \\
  -Xlog:gc*,safepoint:file=/var/log/app/gc.log:time,uptime,level,tags:filecount=10,filesize=50m \\
  -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/dumps \\
  -XX:+ExitOnOutOfMemoryError \\
  -XX:StartFlightRecording=disk=true,maxage=6h,settings=default \\
  -jar app.jar` }, `
import java.lang.management.*;

// Measure allocation rate and GC overhead from inside the app (e.g. expose as metrics).
class GcMetrics {
    public static void main(String[] args) throws Exception {
        long gcTimeBefore = totalGcMillis();
        long t0 = System.nanoTime();
        long checksum = 0;
        for (int i = 0; i < 5_000_000; i++) {              // allocation-heavy workload
            String s = "order-" + i;                       // temporary objects die young
            checksum += s.length();
        }
        double secs = (System.nanoTime() - t0) / 1e9;
        long gcMs = totalGcMillis() - gcTimeBefore;
        System.out.printf("ran %.2f s, GC %d ms -> %.1f%% time in GC (checksum %d)%n",
                secs, gcMs, 100.0 * gcMs / (secs * 1000), checksum);
    }
    static long totalGcMillis() {
        long sum = 0;
        for (GarbageCollectorMXBean gc : ManagementFactory.getGarbageCollectorMXBeans()) {
            sum += Math.max(0, gc.getCollectionTime());   // -1 means "undefined" for some beans
        }
        return sum;
    }
}`],
    codeTitle: ['Launch flags', 'GC overhead from MXBeans'],
    viz: [{
      title: 'Heap sawtooth: how allocation rate, young size and promotion drive GC',
      input: 'alloc=500 young=1000 survive=15 live=700 old=3000 secs=24',
      inputLabel: 'alloc MB/s, young MB, survive % promoted per young GC, live MB, old MB, seconds',
      gen: function (input) {
        var o = kvParse(input, { alloc: 500, young: 1000, survive: 15, live: 700, old: 3000, secs: 24 });
        var A = num(o.alloc, 1, 20000, 'alloc'), Y = num(o.young, 16, 100000, 'young'), P = num(o.survive, 0, 100, 'survive'), LV = num(o.live, 0, 100000, 'live'), OC = num(o.old, 32, 200000, 'old'), T = num(o.secs, 4, 40, 'secs');
        if (LV >= OC) throw new Error('live must be smaller than old (otherwise the heap cannot even hold the live set)');
        var ihop = Math.round(OC * 0.45), yu = 0, ou = LV, F = [], used = [], labels = [], ygc = 0, mixed = 0, full = 0;
        var gcEvery = (Y / A).toFixed(2), promoRate = (A * P / 100).toFixed(0);
        F.push({ narr: 'Setup: allocation ' + A + ' MB/s into a ' + Y + ' MB young gen → a young GC every <b>' + gcEvery + ' s</b>. Each young GC promotes ' + P + '% → promotion rate ≈ <b>' + promoRate + ' MB/s</b>. Old starts with the ' + LV + ' MB live set; marking starts at IHOP = 45% of ' + OC + ' = ' + ihop + ' MB.', parts: [{ type: 'vars', label: 'Model', vals: { 'young GC interval s': gcEvery, 'promotion MB/s': promoRate, 'live set MB': LV, 'IHOP MB': ihop } }] });
        for (var s = 1; s <= T; s++) {
          yu += A; var events = [];
          while (yu >= Y) { yu -= Y; ygc++; ou += Y * P / 100; events.push('young GC'); }
          if (ou > OC) { full++; ou = LV; events.push('<span class="c-r">FULL GC</span>'); }
          else if (ou >= ihop) { mixed++; ou = LV + (ou - LV) * 0.15; events.push('marking + mixed GCs'); }
          used.push(Math.round(yu + ou)); labels.push(s + 's');
          var hl = {}; if (events.length) hl[used.length - 1] = events.join('').indexOf('FULL') >= 0 ? 'bad' : (events.join('').indexOf('mixed') >= 0 ? 'sel' : 'cur');
          F.push({ narr: 't = ' + s + ' s: ' + (events.length ? events.length > 3 ? events.length + ' events (' + ygc + ' young GCs so far)' + (events.join(' ').indexOf('mixed') >= 0 ? ' incl. marking + mixed GCs' : '') + (events.join(' ').indexOf('FULL') >= 0 ? ' and a <span class="c-r">FULL GC</span>' : '') : events.join(', ') : 'no GC — Eden filling at ' + A + ' MB/s') + '. Old = ' + Math.round(ou) + ' MB.', parts: [
            { type: 'bars', label: 'Heap used after each second (MB): young + old', values: used.slice(), idxLabels: labels.slice(), hl: hl },
            { type: 'vars', label: 'Counters', vals: { 'young used MB': Math.round(yu), 'old used MB': Math.round(ou), 'young GCs': ygc, 'mixed cycles': mixed, 'full GCs': full }, hl: full ? { 'full GCs': 'bad' } : {} }
          ] });
        }
        var toIhop = P > 0 ? ((ihop - LV) / (A * P / 100)).toFixed(1) : '∞';
        F.push({ narr: 'Reading the result: old gen reaches IHOP every ~<b>' + toIhop + ' s</b> because of promotion. Levers: (1) <b>allocate less</b> (fewer young GCs, fewer promotions), (2) bigger young gen → fewer GCs <i>and</i> more time for objects to die before promotion, (3) bigger old/total heap → rarer marking cycles, (4) shorter object lifetimes (don\'t hold request data in caches). Try <code>alloc=3000 survive=60 old=1500</code> to provoke full GCs (promotion outruns marking), or <code>live=1300</code> to see marking run almost constantly.', parts: [{ type: 'table', label: 'What-if', columns: ['Change', 'Effect'], rows: [['alloc ÷ 2', 'young GC interval × 2, promotion ÷ 2'], ['young × 2', 'half as many young GCs; often lower survive %'], ['old × 2', 'marking cycles much rarer'], ['survive ↑ (medium-lived data)', 'old fills fast → mixed/full GCs']] }] });
        return F;
      }
    }, {
      title: 'A real tuning session, step by step (G1 humongous allocations)',
      gen: function () {
        function f(narr, rows, hl, extra) { var p = [{ type: 'table', label: 'Tuning notebook', columns: ['Step', 'Evidence / action', 'Result'], rows: rows, hl: hl || {} }]; (extra || []).forEach(function (x) { p.push(x); }); return { narr: narr, parts: p }; }
        var r = [['Goal', 'p99 latency &lt; 120 ms for /search', 'currently 450 ms']];
        var frames = [f('Start with a <b>measurable goal</b>, not "GC is slow". The SLO is p99 &lt; 120 ms; we are at 450 ms.', r.slice(), { 0: 'cur' })];
        r.push(['Baseline', 'GC log: Pause Young (Concurrent Start) (G1 Humongous Allocation) ~every 3 s; pauses 60–180 ms', 'GC correlates with spikes']);
        frames.push(f('<b>Baseline under real load</b>: GC log lines with "G1 Humongous Allocation" line up with the latency spikes in the dashboard.', r.slice(), { 1: 'cur' }, [note('Log excerpt', '<code>GC(812) Pause Young (Concurrent Start) (G1 Humongous Allocation) 3010M-&gt;2650M(6144M) 142.6ms</code>')]));
        r.push(['Hypothesis', 'heap 6 GB → region size 4 MB → objects ≥ 2 MB are humongous. JFR allocation samples: 3 MB byte[] from the JSON response buffer', 'cause found']);
        frames.push(f('<b>Hypothesis from evidence</b>: JFR\'s allocation profiling points at 3 MB <code>byte[]</code> response buffers. With 4 MB regions, ≥ 2 MB is humongous → each one takes a whole region, triggers marking early, fragments the heap.', r.slice(), { 2: 'cur' }));
        r.push(['Change #1', '-XX:G1HeapRegionSize=16m (threshold becomes 8 MB)', 'p99 450 → 160 ms']);
        frames.push(f('<b>One change at a time</b>: raise region size so 3 MB buffers are ordinary young objects. Re-run the same load test.', r.slice(), { 3: 'ok' }));
        r.push(['Change #2 (code)', 'stream the JSON response instead of building a 3 MB byte[]', 'p99 160 → 85 ms, alloc rate −40%']);
        frames.push(f('<b>Fix the root cause in code</b>: streaming removes the big allocation entirely. Allocation rate drops 40% — fewer young GCs too. This beat every flag.', r.slice(), { 4: 'ok' }));
        r.push(['Verify', '24 h canary: no Full GC, no humongous-triggered marking, p99 85 ms', 'goal met; keep both changes']);
        frames.push(f('<b>Verify over a long window</b> (several marking cycles, daily peak). Document the flag with the reason so nobody deletes it — or better, revert the flag later if the code fix alone suffices.', r.slice(), { 5: 'sel' }));
        return frames;
      }
    }],
    examples: [
      { title: 'Sizing a heap from the live set', html: `<p>After several mixed GCs the old gen settles at <b>1.5 GB</b> (live set). Rule of thumb 3–4× → heap 4.5–6 GB. Choose 6 GB: ${C('-Xms6g -Xmx6g')}. Container: 6 GB heap + ~300 MB metaspace/code cache + 200 threads × 1 MB + 256 MB direct buffers + GC overhead ≈ 7.2 GB → request an 8 GiB pod (or use ${C('MaxRAMPercentage=75')} on 8 GiB).</p>` },
      { title: 'Why "-XX:MaxGCPauseMillis=10" made things worse', html: `<p>A team set a 10 ms pause goal on G1 with a 16 GB heap. G1 shrank Eden to hit it → young GCs every 50 ms, survivors overflowed, promotion skyrocketed, old filled, marking ran nonstop and eventually <b>Full GC</b>s of 4 s appeared. The goal must be achievable; for sub-10 ms needs, use ZGC instead of squeezing G1.</p>` },
      { title: 'Computing GC overhead from a log', html: `<p>In a 10-minute window: 1,200 young pauses averaging 12 ms (14.4 s) + 20 mixed pauses of 40 ms (0.8 s) = 15.2 s paused out of 600 s → <b>2.5% overhead, 97.5% throughput</b>. p99 pause comes from the distribution, e.g. 38 ms. Concurrent marking CPU is extra and appears in CPU metrics, not in pause time.</p>`, code: `
double[] pausesMs = { 12, 11, 13, 40, 12, 14, 38, 12 };
double total = Arrays.stream(pausesMs).sum();
double windowMs = 600_000;
System.out.printf("throughput = %.2f%%%n", 100 * (1 - total / windowMs));` },
      { title: 'The container that thrashed', html: `<p>A 2 GiB pod ran with defaults: max heap = 25% = 512 MB, while the live set was 450 MB. GC ran continuously (heap almost full of live data), CPU at 100%, latency terrible, but never an OOM. Setting ${C('-XX:MaxRAMPercentage=70')} (≈1.4 GB heap) cut GC CPU from 60% to 3%. "Heap too small" usually looks like <b>high CPU</b>, not like an error.</p>` }
    ],
    deepDive: `<p><b>Little's law for heaps.</b> Memory held by in-flight work ≈ allocation rate per request × requests/s × request duration. A slow downstream (requests last 2 s instead of 50 ms) multiplies the live set by 40 — and the GC "suddenly" struggles. GC symptoms are often load or latency symptoms upstream.</p>
<p><b>Young-gen sizing trade-off.</b> A bigger young gen means fewer young GCs and more objects dying before promotion, but each young pause copies whatever is live at that moment. Because cost ∝ survivors (not Eden size), growing Eden is usually cheap — until medium-lived data (sessions, batches, in-flight requests) makes survivors large. G1 adapts young size between ${C('G1NewSizePercent')} (5%) and ${C('G1MaxNewSizePercent')} (60%) to meet the pause goal.</p>
<p><b>IHOP and evacuation failures.</b> G1's adaptive IHOP learns how long marking takes and how fast old fills, and starts marking just in time. If marking finishes too late, there is no free space to evacuate into → "to-space exhausted" → expensive failure handling → maybe a Full GC. Remedies: more heap, ${C('G1ReservePercent')} (default 10%), more ${C('ConcGCThreads')}, or lowering ${C('InitiatingHeapOccupancyPercent')} with adaptive IHOP off for very spiky apps.</p>
<p><b>Pauses that are not GC.</b> Logs with ${C('-Xlog:safepoint')} show "Reaching safepoint" time; long values mean some thread did not reach a safepoint quickly (huge array copies, counted loops, JNI). Other stop-the-world causes: biased-lock revocation (biased locking was removed in JDK 18), deoptimization, class redefinition, thread dumps. And OS issues: swapping, transparent huge page compaction stalls, CPU throttling from CFS quotas in containers — all look like "GC pauses" from the outside.</p>
<p><b>Allocation reduction techniques.</b> Avoid boxing in hot paths (primitive collections, ${C('IntStream')}), reuse ${C('StringBuilder')}s only within a thread, stream instead of materialising, size collections up front, avoid ${C('String.format')} in hot logs (use parameterised logging guarded by level), and prefer records/value-like classes that escape analysis can scalar-replace. JFR's allocation profiling (${C('jdk.ObjectAllocationSample')}) points straight at the top allocation sites.</p>
<p><b>Footprint tricks.</b> ${C('-XX:+UseCompactObjectHeaders')} (JDK 25) shrinks headers; ${C('-XX:+UseStringDeduplication')} (G1, also others in newer JDKs) dedupes identical String backing arrays; ${C('SoftMaxHeapSize')} lets ZGC/G1 aim lower than Xmx and return memory; G1 uncommits idle memory periodically (${C('G1PeriodicGCInterval')}).</p>`,
    aiEra: `<p><b>What AI changes:</b> GC log analysis used to need specialist tools or experts. Now you can feed a log (or the summary from GCeasy / JDK Mission Control) to an assistant and get allocation rate, promotion rate, live set and pause percentiles in a minute, plus hypotheses. AIOps platforms correlate GC events with latency automatically.</p>
<p><b>Where AI goes wrong:</b> it produces long "magic flag lists" copied from old blog posts (${C('-XX:+UseParNewGC')}, ${C('-XX:+CMSParallelRemarkEnabled')}, ${C('-XX:PermSize')}) that crash modern JVMs or do nothing; it recommends setting ${C('-Xmn')} with G1; it averages pauses instead of using percentiles; and it rarely asks what the goal is.</p>
<p><b>What you still own:</b> stating the goal, demanding evidence (logs, JFR) before changes, the "one change at a time" discipline, and the judgement that a code change (less allocation) beats a flag. Use AI to read and summarise; use your load tests to decide.</p>`,
    problems: [{
      title: 'GC Log Analyzer: Throughput, Max and p99 Pause, Allocation Rate',
      level: 'Medium', tags: ['GC logs', 'parsing', 'percentiles'], companies: ['Datadog', 'Amazon', 'Atlassian'],
      statement: `<p>You get unified-logging GC lines like ${C('[12.345s][info][gc] GC(7) Pause Young (Normal) (G1 Evacuation Pause) 812M->120M(2048M) 9.876ms')}. Lines without "Pause" (concurrent phases) must be ignored for pause stats. Compute: total pause ms, max pause, p99 pause (nearest-rank), throughput % over the window [first uptime, last uptime], and average allocation rate in MB/s (heap growth between consecutive pauses: before<sub>i</sub> − after<sub>i−1</sub>).</p>`,
      constraints: `Up to 10<sup>6</sup> lines; pause values in ms with decimals; heap sizes in M. Use O(n log n) at most.`,
      example: `${P(`
[1.000s][info][gc] GC(0) Pause Young (Normal) (G1 Evacuation Pause) 300M->50M(1024M) 10.000ms
[2.000s][info][gc] GC(1) Concurrent Mark Cycle 5.000ms
[3.000s][info][gc] GC(2) Pause Young (Normal) (G1 Evacuation Pause) 450M->60M(1024M) 20.000ms`)}<p>Pauses: 10, 20 → total ${H.c('g', '30 ms')}, max ${H.c('g', '20')}, p99 ${H.c('g', '20')}. Window 2 s = 2000 ms → throughput 1 − 30/2000 = ${H.c('g', '98.5%')}. Allocation between pauses: 450 − 50 = 400 MB in 2 s → ${H.c('g', '200 MB/s')}. The concurrent line is ignored: the app was running during it.</p>`,
      brute: { why: `<p>A quick script that greps "ms" and averages every number it finds. It counts concurrent phases as pauses, reports an <b>average</b> (hides the 1-in-100 long pause users actually feel), and ignores the time window, so throughput is wrong. Averages of pauses are the most common GC-analysis mistake.</p>`, code: `
class NaiveGcStats {
    static double averagePause(List<String> lines) {
        double sum = 0; int n = 0;
        for (String line : lines) {
            if (line.endsWith("ms")) {                          // also matches concurrent phases!
                String last = line.substring(line.lastIndexOf(' ') + 1);
                sum += Double.parseDouble(last.substring(0, last.length() - 2));
                n++;
            }
        }
        return n == 0 ? 0 : sum / n;                            // average hides the tail
    }
}` },
      mcq: { q: 'Why report p99 pause instead of the average?', options: ['Latency SLOs are about the tail; one 2 s pause per minute can hide inside a 15 ms average', 'Averages are harder to compute', 'p99 is always smaller', 'The JVM only logs p99'], answer: 0, explain: 'Users feel the slow requests. A few long pauses barely move the mean but dominate p99/p99.9 latency.' },
      hints: [`<p>Hint 1: Parse without regexes: uptime is between the first ${C('[')} and ${C('s]')}; the pause is the last token minus ${C('ms')}; the heap transition is the token containing ${C('->')}.</p>`, `<p>Hint 2: Keep a list of pauses for percentiles; sort once at the end. Nearest-rank p99 = sorted[ceil(0.99 × n) − 1].</p>`, `<p>Hint 3: For allocation, remember the previous pause's "after" value; for each new pause add (before − prevAfter) to a running total, then divide by (lastUptime − firstUptime). Guard against n = 0.</p>`],
      solution: {
        approach: `<p>Single pass: filter "Pause" lines, extract uptime, before/after/pause by plain string operations, accumulate totals and the previous "after" for allocation; sort pauses once for the percentile. Throughput uses the observed wall-clock window.</p>`,
        code: `
class GcLogAnalyzer {
    record Stats(double totalMs, double maxMs, double p99Ms, double throughputPct, double allocMBps) {}

    static Stats analyze(List<String> lines) {
        List<Double> pauses = new ArrayList<>();
        double first = -1, last = -1, allocMb = 0;
        long prevAfter = -1;
        for (String line : lines) {
            if (!line.contains(" Pause ")) continue;                    // skip concurrent phases
            double uptime = Double.parseDouble(line.substring(line.indexOf('[') + 1, line.indexOf("s]")));
            String lastTok = line.substring(line.lastIndexOf(' ') + 1);
            double pause = Double.parseDouble(lastTok.substring(0, lastTok.length() - 2));
            long before = -1, after = -1;
            for (String tok : line.split(" ")) {
                int arrow = tok.indexOf("->");
                if (arrow > 0) {                                        // e.g. 812M->120M(2048M)
                    before = Long.parseLong(tok.substring(0, arrow - 1));
                    after = Long.parseLong(tok.substring(arrow + 2, tok.indexOf('M', arrow + 2)));
                }
            }
            if (first < 0) first = uptime;
            last = uptime;
            pauses.add(pause);
            if (prevAfter >= 0 && before >= 0) allocMb += Math.max(0, before - prevAfter);
            if (after >= 0) prevAfter = after;
        }
        if (pauses.isEmpty()) return new Stats(0, 0, 0, 100, 0);
        Collections.sort(pauses);
        double total = 0;
        for (double p : pauses) total += p;
        double p99 = pauses.get((int) Math.ceil(0.99 * pauses.size()) - 1);
        double windowMs = (last - first) * 1000;
        double throughput = windowMs > 0 ? 100 * (1 - total / windowMs) : 100;
        double alloc = last > first ? allocMb / (last - first) : 0;
        return new Stats(total, pauses.get(pauses.size() - 1), p99, throughput, alloc);
    }

    public static void main(String[] args) {
        List<String> log = List.of(
            "[1.000s][info][gc] GC(0) Pause Young (Normal) (G1 Evacuation Pause) 300M->50M(1024M) 10.000ms",
            "[2.000s][info][gc] GC(1) Concurrent Mark Cycle 5.000ms",
            "[3.000s][info][gc] GC(2) Pause Young (Normal) (G1 Evacuation Pause) 450M->60M(1024M) 20.000ms");
        System.out.println(analyze(log));   // total 30, max 20, p99 20, throughput 98.5, alloc 200.0
    }
}`,
        dry: { head: ['line', 'pause?', 'before→after', 'pause ms', 'alloc added'], rows: [
          ['1', 'yes', '300→50', '10', '— (first)'], ['2', H.c('m', 'no (concurrent)'), '—', '—', '—'], ['3', 'yes', '450→60', '20', '450 − 50 = 400'], ['end', '—', '—', 'total 30, p99 20', H.c('g', '400 MB / 2 s = 200 MB/s')]
        ] },
        complexity: `<p>O(n·L) parsing (L = line length) + O(p log p) to sort p pauses; O(p) memory. For huge logs, a streaming quantile sketch (HdrHistogram, t-digest) gives p99 in O(1) memory.</p>`,
        followUps: ['Compute pause percentiles per GC type (young / mixed / full)', 'Detect the leak signature: old occupancy after each mixed GC trending up', 'Compute promotion rate if the log has young/old breakdowns (gc+heap=debug)']
      }
    }]
  });

registerModule({ id: 'java13', title: 'JVM Internals & Performance', intro: '<p>x</p>', goals: [], prereqs: 'x', hours: 1, topics: topics, practice: practice, quiz: quiz, interview: interview }); })();
