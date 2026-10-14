(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  var R = String.raw;

  /* small helpers used only by the visualizers of this module */
  function clampInt(s, lo, hi, msg) {
    var t = String(s).trim();
    if (!/^-?\d+$/.test(t)) throw new Error(msg);
    var n = Number(t);
    if (n < lo || n > hi) throw new Error(msg);
    return n;
  }
  function toInt32(n) { return n | 0; }
  function hex(n, w) { var s = (n >>> 0).toString(16).toUpperCase(); while (s.length < w) s = '0' + s; return '0x' + s; }

  /* ======================================================================
     TOPIC 1 — Installing the JDK, compile vs run (javac / java)
     ====================================================================== */
  topics.push({
    title: 'Installing the JDK & Compile vs Run (javac → bytecode → java)',
    analogy: R`<p>Think of writing a <b>recipe in English</b> for a chef who only reads a special universal kitchen language. <b>javac</b> is the <b>translator</b>: it reads your English recipe (<code>Hello.java</code>), checks the grammar, and writes a translated card (<code>Hello.class</code>, called <b>bytecode</b>). <b>java</b> is the <b>chef</b> (the JVM) who reads that card and actually cooks. The translator works <i>once</i>, before dinner. The chef works <i>every time</i> someone orders. And because the card is in a universal language, any chef in any kitchen (Windows, macOS, Linux, a phone, a server) can cook it — that is the famous <b>"write once, run anywhere"</b>.</p>`,
    explain: R`<h4>Step 0 — Install a JDK (the toolbox)</h4>
<p>To <b>write</b> Java you need the <b>JDK</b> (Java Development Kit). It contains the translator <code>javac</code>, the runner <code>java</code>, and many helper tools. In 2026 the long-term-support (LTS) versions people use at work are <b>17, 21 and 25</b> (25 is the newest LTS, released September 2025). A new feature release ships every six months (26 in March 2026, 27 in September 2026).</p>
${H.table(['How to install', 'Command / where', 'Good for'], [
  ['Package manager (macOS)', '<code>brew install openjdk@21</code>', 'quick laptop setup'],
  ['Package manager (Linux)', '<code>sudo apt install openjdk-21-jdk</code>', 'servers, WSL'],
  ['Package manager (Windows)', '<code>winget install EclipseAdoptium.Temurin.21.JDK</code>', 'Windows laptops'],
  ['Version manager', '<code>sdk install java 21.0.5-tem</code> (SDKMAN!)', 'switching between many versions'],
  ['Vendor download', 'Eclipse Temurin, Amazon Corretto, Azul Zulu, Oracle JDK, Microsoft OpenJDK', 'all are builds of the same OpenJDK code']
])}
<p>After installing, check both tools. They should print the <b>same</b> version:</p>
<pre>java -version     # the runner
javac -version    # the translator (only exists in a JDK)</pre>
<p>Two environment variables matter: <code>PATH</code> (so your terminal finds <code>java</code>) and <code>JAVA_HOME</code> (so tools like Maven, Gradle and IDEs find the JDK folder).</p>
<h4>Step 1 — Compile: <code>javac Hello.java</code></h4>
<p><code>javac</code> reads your <b>source code</b> (text), checks it for mistakes (spelling, types, missing semicolons) and, if it is happy, writes <b>bytecode</b> into <code>Hello.class</code>. Bytecode is not machine code for your CPU — it is a compact instruction list for an imaginary computer called the <b>Java Virtual Machine</b>.</p>
<h4>Step 2 — Run: <code>java Hello</code></h4>
<p><code>java</code> starts a JVM, loads <code>Hello.class</code>, checks it is safe, finds <code>main</code> and runs it. Notice: you give <code>java</code> the <b>class name</b> (<code>Hello</code>), not the file name (<code>Hello.class</code>).</p>
${H.table(['', 'Compile time (javac)', 'Run time (java / JVM)'], [
  ['Input', '<code>Hello.java</code> (text you wrote)', '<code>Hello.class</code> (bytecode)'],
  ['Output', '<code>Hello.class</code>', 'whatever your program does'],
  ['How often', 'once per change', 'every time you start the program'],
  ['Typical errors', H.c('r', 'compile errors') + ': missing <code>;</code>, wrong type, unknown symbol', H.c('r', 'exceptions') + ': divide by zero, null, bad array index'],
  ['Who catches it', 'you, before shipping', 'your users, if you are unlucky']
])}
<h4>Shortcut — run source directly</h4>
<p>Since Java 11 you can type <code>java Hello.java</code>. The launcher compiles the file <b>in memory</b> and runs it, writing no <code>.class</code> file. Since Java 22 this even works for small programs split over several files. Great for scripts and learning; real projects still use a build tool (Maven/Gradle) that calls <code>javac</code> for you.</p>
<h4>The golden rule of file names</h4>
<p>A <code>public class Hello</code> <b>must</b> live in a file named exactly <code>Hello.java</code> (case-sensitive!). One file may contain several classes, but at most one <code>public</code> top-level class. Each class becomes its own <code>.class</code> file.</p>`,
    clues: [
      '"What is the difference between compile time and run time?" → javac checks syntax/types once; the JVM executes bytecode each run',
      '"Why is Java platform independent?" → source compiles to bytecode, and each OS has its own JVM that understands the same bytecode',
      '"error: class X is public, should be declared in a file named X.java" → the file-name rule for public classes',
      '"Error: Could not find or load main class" → wrong class name, wrong folder/package, or classpath (<code>-cp</code>) does not include the .class',
      '"UnsupportedClassVersionError ... class file version 65.0" → compiled with a newer JDK than the JVM running it (65 = Java 21)',
      '"Is Java compiled or interpreted?" → both: compiled to bytecode, then interpreted and JIT-compiled to machine code at run time'
    ],
    code: [R`
// File: Hello.java   (file name MUST match the public class name)
public class Hello {
    public static void main(String[] args) {
        // System.out is the standard output stream (your terminal)
        System.out.println("Hello, JVM!");
    }
}
// Terminal:
//   javac Hello.java   -> creates Hello.class (bytecode)
//   java Hello         -> starts the JVM, prints: Hello, JVM!
//   java Hello.java    -> (Java 11+) compile in memory and run, no .class written`, { lang: 'bash', code: R`# 1. Check what is installed (both should show the same major version)
java -version
javac -version

# 2. Compile into a separate output folder (keeps sources clean)
javac -d out src/Hello.java

# 3. Run: -cp (classpath) tells the JVM where to look for .class files
java -cp out Hello

# 4. Compile for an OLDER Java (e.g. your server runs Java 17)
javac --release 17 -d out src/Hello.java

# 5. Peek at the bytecode javac produced
javap -c -cp out Hello

# 6. Package and run as a jar (Main-Class goes into the manifest via -e)
jar --create --file app.jar -e Hello -C out .
java -jar app.jar`, title: 'Everyday JDK commands' }],
    codeTitle: ['Your first program', 'Terminal commands you will use daily'],
    viz: [{
      title: 'From Hello.java to a running program',
      input: 'Hello.java Hello',
      inputLabel: 'File name and public class name (try "Greet.java Hello" or "Hello Hello")',
      gen: function (input) {
        var t = String(input).trim().split(/\s+/);
        if (t.length !== 2) throw new Error('Type two words: a file name and a class name, e.g. "Hello.java Hello"');
        var file = t[0], cls = t[1];
        if (!/^[A-Za-z_$][\w$]*$/.test(cls)) throw new Error('Class name must be a Java identifier like Hello or MyApp');
        if (file.length > 30 || cls.length > 20) throw new Error('Keep names short (max 20 characters)');
        var src = 'public class ' + cls + ' {\n    public static void main(String[] args) {\n        System.out.println("Hello, JVM!");\n    }\n}';
        var nodes = [
          { id: 'S', label: file, x: 9, y: 12, shape: 'box' },
          { id: 'C', label: 'javac', x: 33, y: 12, shape: 'box' },
          { id: 'B', label: cls + '.class', x: 60, y: 12, shape: 'box' },
          { id: 'L', label: 'java launcher', x: 88, y: 12, shape: 'box' },
          { id: 'CL', label: 'ClassLoader', x: 88, y: 42, shape: 'box' },
          { id: 'V', label: 'Verifier', x: 62, y: 42, shape: 'box' },
          { id: 'I', label: 'Interpreter', x: 38, y: 42, shape: 'box' },
          { id: 'J', label: 'JIT', x: 38, y: 62, shape: 'box' },
          { id: 'O', label: 'CPU / OS', x: 10, y: 52, shape: 'box' }
        ];
        var edges = [['S', 'C', 'read'], ['C', 'B', 'write'], ['B', 'L', 'java ' + cls], ['L', 'CL', 'load'], ['CL', 'V', ''], ['V', 'I', ''], ['I', 'J', 'hot'], ['I', 'O', ''], ['J', 'O', 'native']];
        function g(hl, ehl, tags) { return { type: 'graph', label: 'Compile once, run many times', directed: true, height: 72, nodes: nodes, edges: edges, hl: hl, ehl: ehl || {}, tags: tags || {} }; }
        var frames = [];
        frames.push({ narr: 'You type source code into a text file called <b>' + file + '</b>. It is just text: the computer cannot run it yet.', parts: [g({ S: 'cur' }), { type: 'code', label: file, lang: 'java', code: src, hl: { 1: 'cur' } }] });
        if (!/\.java$/.test(file)) {
          frames.push({ narr: 'You run <code>javac ' + file + '</code>. javac only accepts files that end in <b>.java</b>, so it thinks <b>' + file + '</b> is a class name for annotation processing.', parts: [g({ S: 'bad', C: 'cur' }, { 'S-C': 'bad' })] });
          frames.push({ narr: '<span class="c-r">Real javac message:</span> <code>error: Class names, \'' + file + '\', are only accepted if annotation processing is explicitly requested</code>. Nothing is compiled.', parts: [{ type: 'text', label: 'Terminal', html: '<code>$ javac ' + file + '</code><br><span class="c-r">error: Class names, \'' + file + '\', are only accepted if annotation processing is explicitly requested</span><br>1 error' }, g({ C: 'bad' })] });
          frames.push({ narr: 'Fix: give javac the <b>file</b> (<code>javac ' + file + '.java</code>) and give java the <b>class</b> (<code>java ' + cls + '</code>). Memory trick: <b>javac eats files, java eats class names</b>.', parts: [{ type: 'table', label: 'Which tool takes what', columns: ['Tool', 'Argument', 'Example'], rows: [['javac', 'file name with .java', 'javac Hello.java'], ['java', 'class name, no extension', 'java Hello'], ['java (11+)', 'a .java file (source launch)', 'java Hello.java']], hl: { 0: 'ok' } }] });
          return frames;
        }
        var base = file.replace(/\.java$/, '');
        frames.push({ narr: 'You run <code>javac ' + file + '</code>. javac reads the text, splits it into tokens, builds a syntax tree and checks every type. It also checks the <b>file-name rule</b>: a public class must live in a file with the same name.', parts: [g({ S: 'done', C: 'cur' }, { 'S-C': 'cur' }), { type: 'code', label: file, lang: 'java', code: src, hl: { 1: base === cls ? 'ok' : 'bad' } }] });
        if (base !== cls) {
          frames.push({ narr: '<span class="c-r">Compile error!</span> The class is <b>' + cls + '</b> but the file is <b>' + file + '</b>. javac refuses and writes no .class file.', parts: [{ type: 'text', label: 'Terminal', html: '<code>$ javac ' + file + '</code><br><span class="c-r">' + file + ':1: error: class ' + cls + ' is public, should be declared in a file named ' + cls + '.java</span><br>1 error' }, g({ C: 'bad' }, { 'C-B': 'bad' })] });
          frames.push({ narr: 'Two easy fixes: rename the file to <b>' + cls + '.java</b>, or rename the class to <b>' + base + '</b>. (Removing the word <code>public</code> also works, because only <i>public</i> classes have this rule.) This is a <b>compile-time</b> error, so it can never reach your users.', parts: [{ type: 'table', label: 'Fix options', columns: ['Option', 'Result'], rows: [['mv ' + file + ' ' + cls + '.java', 'compiles'], ['class ' + base + ' { ... }', 'compiles'], ['drop "public"', 'compiles, class file still named ' + cls + '.class']], hl: { 0: 'ok' } }] });
          return frames;
        }
        frames.push({ narr: 'Success! javac writes <b>' + cls + '.class</b>: bytecode, a list of simple instructions for the JVM. The file starts with the magic number <code>0xCAFEBABE</code> and a version number (65 = Java 21).', parts: [g({ S: 'done', C: 'done', B: 'ok' }, { 'C-B': 'ok' }), { type: 'code', label: 'javap -c ' + cls + ' (bytecode of main)', lang: 'text', code: '0: getstatic     #7   // System.out\n3: ldc           #13  // "Hello, JVM!"\n5: invokevirtual #15  // println(String)\n8: return', hl: {} }] });
        frames.push({ narr: 'Now the <b>run</b> phase. You type <code>java ' + cls + '</code> (class name, no ".class"). The launcher starts a fresh JVM process.', parts: [g({ B: 'done', L: 'cur' }, { 'B-L': 'cur' })] });
        frames.push({ narr: 'The <b>ClassLoader</b> finds <b>' + cls + '.class</b> on the classpath and loads it. Core classes like <code>java.lang.Object</code>, <code>String</code> and <code>System</code> are loaded first by the bootstrap loader.', parts: [g({ L: 'done', CL: 'cur' }, { 'L-CL': 'cur' }), { type: 'set', label: 'Classes loaded so far', items: ['java.lang.Object', 'java.lang.String', 'java.lang.System', cls], hl: (function () { var o = {}; o[cls] = 'ok'; return o; })() }] });
        frames.push({ narr: 'The <b>Verifier</b> checks the bytecode is safe: no jumping into the middle of an instruction, no treating an int as an object, stack never overflows its declared size. Bad or tampered bytecode is rejected here with a <code>VerifyError</code>.', parts: [g({ CL: 'done', V: 'cur' }, { 'CL-V': 'cur' })] });
        frames.push({ narr: 'The <b>Interpreter</b> runs <code>main</code> one bytecode at a time: push <code>System.out</code>, push the string, call <code>println</code>. The OS shows the text in your terminal.', parts: [g({ V: 'done', I: 'cur', O: 'ok' }, { 'V-I': 'cur', 'I-O': 'ok' }), { type: 'code', label: 'executing', lang: 'java', code: src, hl: { 3: 'cur' } }, { type: 'text', label: 'Terminal', html: '<code>$ java ' + cls + '</code><br><b>Hello, JVM!</b>' }] });
        frames.push({ narr: 'In a long-running program, methods that run thousands of times become <b>hot</b>. The <b>JIT</b> (Just-In-Time compiler) turns them into real machine code for this exact CPU, so they run as fast as C++. That is why Java is "compiled <i>and</i> interpreted".', parts: [g({ I: 'done', J: 'sel', O: 'ok' }, { 'I-J': 'sel', 'J-O': 'ok' })] });
        frames.push({ narr: '<code>main</code> returns, no non-daemon threads are left, so the JVM exits with status <b>0</b> (success). Recap: <b>javac once</b> (source → bytecode), <b>java every run</b> (bytecode → load → verify → interpret/JIT).', parts: [g({ S: 'done', C: 'done', B: 'done', L: 'done', CL: 'done', V: 'done', I: 'done', J: 'done', O: 'done' }), { type: 'vars', label: 'Process', vals: { 'exit code': 0, 'files on disk': file + ', ' + cls + '.class' }, hl: { 'exit code': 'ok' } }] });
        return frames;
      }
    }, {
      title: 'Triage: compile error, runtime exception or silent bug?',
      gen: function () {
        var bugs = [
          ['int x = "5";', 'compile error', 'javac: incompatible types: String cannot be converted to int'],
          ['System.out.println(10 / 0);', 'runtime exception', 'JVM: ArithmeticException: / by zero'],
          ['int[] a = new int[3]; a[3] = 1;', 'runtime exception', 'JVM: ArrayIndexOutOfBoundsException: Index 3 out of bounds for length 3'],
          ['System.out.println("Hi")', 'compile error', 'javac: \';\' expected'],
          ['double avg = 7 / 2;', 'silent bug', 'runs fine, prints 3.0 instead of 3.5 (int division)'],
          ['int big = 50000 * 50000;', 'silent bug', 'runs fine, value is -1794967296 (overflow)']
        ];
        var frames = [], rows = [];
        frames.push({ narr: 'Every bug is caught at one of three moments. The earlier, the cheaper. Let us sort six classic beginner lines.', parts: [{ type: 'table', label: 'Bug sorting board', columns: ['Line', 'When it bites', 'Message'], rows: [] }] });
        bugs.forEach(function (b, i) {
          rows.push(b.slice());
          var hl = {}; hl[i] = b[1] === 'compile error' ? 'ok' : b[1] === 'runtime exception' ? 'cur' : 'bad';
          var why = b[1] === 'compile error' ? 'javac catches it before any .class file exists — the <b>best</b> kind of bug.' : b[1] === 'runtime exception' ? 'javac is happy (the types are fine) but the JVM throws an exception while running.' : 'Nobody complains! The program just computes the wrong answer. These are the most dangerous.';
          frames.push({ narr: '<code>' + H.esc(b[0]) + '</code> → <b>' + b[1] + '</b>. ' + why, parts: [{ type: 'code', label: 'Line under test', lang: 'java', code: b[0], hl: { 1: hl[i] } }, { type: 'table', label: 'Bug sorting board', columns: ['Line', 'When it bites', 'Message'], rows: rows.map(function (r) { return r.slice(); }), hl: hl }] });
        });
        frames.push({ narr: 'Lesson: Java\'s <b>static types</b> move many bugs to compile time. Overflow and integer division are <b>silent</b>, so you must learn them by heart (topics below).', parts: [{ type: 'bars', label: 'Count by category', values: [2, 2, 2], idxLabels: ['compile', 'runtime', 'silent'], hl: { 0: 'ok', 1: 'cur', 2: 'bad' } }] });
        return frames;
      }
    }],
    examples: [
      { title: 'Two classes in one file → two .class files', html: R`<p>A file may hold many classes but only <b>one public</b> top-level class. javac writes one <code>.class</code> per class (nested classes get names like <code>Outer$Inner.class</code>).</p><p>Compiling the file below with <code>javac Shop.java</code> creates <b>Shop.class</b> and <b>Item.class</b>. Running <code>java Shop</code> prints <code>Pen costs 20</code>.</p>`, code: R`
public class Shop {
    public static void main(String[] args) {
        Item pen = new Item("Pen", 20);
        System.out.println(pen.name + " costs " + pen.price);
    }
}
class Item {                 // not public -> allowed in Shop.java
    String name; int price;
    Item(String name, int price) { this.name = name; this.price = price; }
}` },
      { title: 'Compile for an older server with --release', html: R`<p>Your laptop has JDK 25, but production runs Java 17. If you compile normally and deploy, the server crashes with <code>UnsupportedClassVersionError: ... class file version 69.0, this version of the Java Runtime only recognizes class file versions up to 61.0</code>.</p>${H.table(['Java', '8', '11', '17', '21', '25'], [['class-file major version', '52', '55', '61', '65', '69']])}<p>Fix: <code>javac --release 17 ...</code>. It writes version-61 class files <b>and</b> refuses to let you call APIs that do not exist in Java 17. (Rule: <i>major = Java version + 44</i>.)</p>` },
      { title: 'Predict the output: what does java see?', html: R`<p>You compiled <code>Hello.java</code> into <code>out/</code>. Which commands work?</p>${H.table(['Command', 'Result'], [['<code>java -cp out Hello</code>', H.c('g', 'prints Hello, JVM!')], ['<code>java out/Hello</code>', H.c('r', 'Error: Could not find or load main class out/Hello')], ['<code>java -cp out Hello.class</code>', H.c('r', 'Could not find or load main class Hello.class')], ['<code>java src/Hello.java</code>', H.c('g', 'works (source-launch mode)')]])}<p>The JVM wants a <b>class name</b> plus a <b>classpath</b> telling it which folders/jars to search.</p>` },
      { title: 'JShell: a playground with no class and no main', html: R`<p>Type <code>jshell</code> (Java 9+) to get a REPL. Each line is compiled and run instantly — perfect for testing a casting or overflow question during interview prep.</p><pre>jshell&gt; 7 / 2
$1 ==&gt; 3
jshell&gt; (byte) 200
$2 ==&gt; -56
jshell&gt; /exit</pre>` }
    ],
    deepDive: R`<h4>What javac really does</h4>
<p>javac runs a pipeline: <b>parse</b> (tokens → syntax tree) → <b>enter</b> (record every class and member) → <b>attribute</b> (resolve names, check types, fold constants like <code>24 * 60</code> into <code>1440</code>) → <b>flow</b> (definite assignment: "variable might not have been initialized", unreachable code) → <b>desugar</b> (turn enhanced for-loops, string switch, lambdas, records into simpler forms) → <b>generate</b> bytecode. Very little optimization happens here; the JIT does the heavy optimization later with real run-time information.</p>
<h4>Inside a .class file</h4>
<p>Magic <code>0xCAFEBABE</code> → minor and major version → <b>constant pool</b> (every string literal, class name and method signature, referenced by index like <code>#13</code>) → access flags → this/super class → interfaces → fields → methods (each with a <code>Code</code> attribute holding bytecode, max stack depth and number of local slots) → attributes (source file name, line-number table used for stack traces). If the minor version is <code>0xFFFF</code> the class uses <b>preview</b> features and only runs with <code>--enable-preview</code>.</p>
<h4>Startup and modern ahead-of-time options</h4>
<p>A JVM starts by loading a few hundred JDK classes; Class Data Sharing (CDS) archives make that fast. Since JDK 24, Project Leyden's <b>AOT cache</b> (<code>-XX:AOTCache</code>) lets a training run record loaded/linked classes and method profiles so the next start is much faster. For instant start and tiny memory, <b>GraalVM native-image</b> compiles the whole app to a native executable ahead of time — at the cost of "closed world" limits on reflection and dynamic class loading.</p>
<h4>Production reality</h4>
<ul><li>Nobody calls javac by hand in a team: Maven or Gradle do it, and <b>toolchains</b> pin the exact JDK version so every laptop and CI machine builds the same bytes.</li>
<li>Always ship with an explicit <code>--release</code> (Maven: <code>maven.compiler.release</code>).</li>
<li>Exit codes matter for scripts and containers: <code>System.exit(1)</code> signals failure; an uncaught exception in <code>main</code> also ends with a non-zero code (1).</li>
<li>Default file encoding is <b>UTF-8 since JDK 18</b>, so source files with non-ASCII characters compile the same on every OS.</li></ul>`,
    aiEra: R`<p><b>What AI changes:</b> an assistant can generate a working <code>pom.xml</code>, Dockerfile or GitHub Actions workflow in seconds, and coding agents now run <code>javac</code>/<code>mvn</code> themselves and read the errors. Setup that used to take a beginner an afternoon takes minutes.</p>
<p><b>Use AI as a partner:</b> paste the <i>exact</i> compiler or launcher message and ask <code>Explain this javac error in plain English and list the 3 most likely causes</code>. Ask it to <code>generate a Gradle toolchain block that pins Java 21</code>. Ask for a <code>.sdkmanrc</code> so teammates get the same JDK.</p>
<p><b>Where AI goes wrong:</b> it was trained on years of Java 8 tutorials, so it may suggest installing a separate "JRE", using <code>-source 1.8 -target 1.8</code> instead of <code>--release</code>, or running <code>java Hello.class</code>. It also guesses versions — always confirm with <code>java -version</code> and <code>javac -version</code> on the real machine. When an agent "fixes" a build by downgrading the JDK or adding <code>--enable-preview</code> everywhere, push back.</p>
<p><b>What you must still own:</b> the mental model of compile time vs run time, reading a stack trace, knowing which JDK your service runs on, and understanding why bytecode lets the same jar run on every OS.</p>`,
    problems: [{
      title: 'Class-File Version Detector',
      level: 'Easy', tags: ['bytecode', 'bit manipulation', 'jvm'], companies: ['Oracle', 'Atlassian'],
      statement: R`<p>Every <code>.class</code> file starts with 8 bytes: 4 bytes of magic number <code>CA FE BA BE</code>, then 2 bytes of <b>minor</b> version, then 2 bytes of <b>major</b> version (big-endian: high byte first). Given the first 8 bytes as an <code>int[]</code> (each 0..255), return:</p>
<ul><li><code>"not a class file"</code> if the magic number is wrong,</li><li>otherwise <code>"Java N"</code> where <b>N = major − 44</b>, followed by <code>" (preview)"</code> if minor is <code>0xFFFF</code>.</li></ul>`,
      constraints: R`<code>bytes.length == 8</code>, <code>0 ≤ bytes[i] ≤ 255</code>, <code>49 ≤ major ≤ 100</code> when the magic is valid.`,
      example: R`${H.arr(['CA', 'FE', 'BA', 'BE', '00', '00', '00', '41'], { hl: { 0: 'y', 1: 'y', 2: 'y', 3: 'y', 6: 'g', 7: 'g' } })}<p>Magic OK. major = 0x00 · 256 + 0x41 = <b>65</b> → 65 − 44 = 21 → <span class="c-g"><b>"Java 21"</b></span>. With minor bytes <code>FF FF</code> the answer would be <code>"Java 21 (preview)"</code>.</p>`,
      brute: { why: R`<p>Build a hex string like <code>"CAFEBABE00000041"</code> with <code>String.format</code>, compare substrings and parse the last 4 hex digits. It works, but creates many temporary strings and hides the simple idea: <b>two bytes = high · 256 + low</b>.</p>`, code: R`
static String detectBrute(int[] b) {
    StringBuilder sb = new StringBuilder();
    for (int x : b) sb.append(String.format("%02X", x));   // "CAFEBABE00000041"
    String hex = sb.toString();
    if (!hex.startsWith("CAFEBABE")) return "not a class file";
    int minor = Integer.parseInt(hex.substring(8, 12), 16);
    int major = Integer.parseInt(hex.substring(12, 16), 16);
    return "Java " + (major - 44) + (minor == 0xFFFF ? " (preview)" : "");
}` },
      mcq: { q: 'Bytes 6 and 7 are <code>0x00</code> and <code>0x3D</code>. Which Java compiled it?', options: ['Java 61', 'Java 17', 'Java 21', 'Java 8'], answer: 1, explain: '0x3D = 61, and 61 − 44 = 17.' },
      hints: [R`<p>Hint 1: a 2-byte big-endian number is <code>high * 256 + low</code>, which is the same as <code>(high &lt;&lt; 8) | low</code>.</p>`, R`<p>Hint 2: build the 32-bit magic the same way: <code>(b0 &lt;&lt; 24) | (b1 &lt;&lt; 16) | (b2 &lt;&lt; 8) | b3</code> and compare with <code>0xCAFEBABE</code> (an int literal — it is negative in Java, and that is fine).</p>`, R`<p>Hint 3: recipe — compute magic; if it differs return "not a class file"; compute minor from bytes 4,5 and major from 6,7; answer "Java " + (major − 44), add " (preview)" when minor == 0xFFFF.</p>`],
      solution: {
        approach: R`<p>Combine bytes with shifts and OR. <code>0xCAFEBABE</code> does not fit in a positive int, so as an <code>int</code> literal it is a negative number; the magic we build also wraps to the same negative bit pattern, so <code>==</code> works perfectly.</p>`,
        code: R`
public class ClassVersion {
    static String detect(int[] b) {
        // Build the 32-bit magic: shifts place each byte in its slot
        int magic = (b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3];
        if (magic != 0xCAFEBABE) return "not a class file";   // same bit pattern
        int minor = (b[4] << 8) | b[5];                         // big-endian 2 bytes
        int major = (b[6] << 8) | b[7];
        return "Java " + (major - 44) + (minor == 0xFFFF ? " (preview)" : "");
    }
    public static void main(String[] args) {
        System.out.println(detect(new int[]{0xCA, 0xFE, 0xBA, 0xBE, 0, 0, 0, 65}));       // Java 21
        System.out.println(detect(new int[]{0xCA, 0xFE, 0xBA, 0xBE, 0xFF, 0xFF, 0, 69})); // Java 25 (preview)
        System.out.println(detect(new int[]{0x50, 0x4B, 3, 4, 0, 0, 0, 0}));              // not a class file (zip!)
    }
}`,
        dry: { head: ['step', 'expression', 'value'], rows: [['magic', '(0xCA&lt;&lt;24)|(0xFE&lt;&lt;16)|(0xBA&lt;&lt;8)|0xBE', '0xCAFEBABE ✔'], ['minor', '(0&lt;&lt;8)|0', '0'], ['major', '(0&lt;&lt;8)|65', '65'], ['answer', '"Java " + (65 − 44)', '<span class="c-g">"Java 21"</span>']] },
        complexity: R`<p>O(1) time and space — a fixed 8 bytes.</p>`,
        followUps: ['Read the 8 bytes from a real file with <code>DataInputStream.readInt()</code> and <code>readUnsignedShort()</code>.', 'Why does a .jar start with <code>50 4B</code> ("PK")?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 2 — JDK vs JRE vs JVM (and what is inside the JVM)
     ====================================================================== */
  topics.push({
    title: 'JDK vs JRE vs JVM — and What Lives Inside the JVM',
    analogy: R`<p>Picture a <b>restaurant</b>. The <b>JVM</b> is the <b>chef</b>: the one who actually cooks (executes bytecode). The <b>JRE</b> is the chef <b>plus a fully stocked pantry</b> — flour, spices, pans (the standard library: <code>String</code>, <code>ArrayList</code>, files, networking). That is everything needed to <i>serve</i> food. The <b>JDK</b> is the <b>whole restaurant including the recipe office</b>: the translator who writes recipe cards (<code>javac</code>), the inspector (<code>javap</code>), the packaging station (<code>jar</code>), the test kitchen (<code>jshell</code>). Customers only need a chef and a pantry; <b>cooks who invent new dishes</b> (developers) need the whole restaurant.</p>`,
    explain: R`<h4>The three boxes, inside each other</h4>
<p><b>JDK ⊃ JRE ⊃ JVM</b>. Each bigger box contains the smaller one plus extra things.</p>
${H.table(['Box', 'Stands for', 'Contains', 'Who needs it'], [
  ['<b>JVM</b>', 'Java Virtual Machine', 'class loader, bytecode verifier, interpreter, JIT compiler, garbage collector, memory areas', 'nobody installs it alone — it is the engine inside the others'],
  ['<b>JRE</b>', 'Java Runtime Environment', 'JVM + the standard class library (<code>java.base</code>, <code>java.sql</code>, ...) + launcher <code>java</code>', 'anyone who only <b>runs</b> Java programs'],
  ['<b>JDK</b>', 'Java Development Kit', 'JRE + developer tools: <code>javac</code>, <code>javap</code>, <code>jar</code>, <code>jshell</code>, <code>jlink</code>, <code>jdb</code>, <code>jcmd</code>, <code>jfr</code>', 'anyone who <b>writes</b> Java']
])}
<h4>Which part is platform-specific?</h4>
<p>Your <code>.class</code> files are the <b>same on every OS</b>. The <b>JVM is not</b>: there is a Windows JVM, a Linux-x64 JVM, a macOS-ARM JVM and so on. Each one knows how to turn the same bytecode into instructions for its own CPU and OS. Platform independence comes from <i>"one bytecode, many JVMs"</i>.</p>
<h4>2026 reality: "JRE" is mostly a concept now</h4>
<p>Since JDK 11, OpenJDK and Oracle no longer publish a separate JRE download. Developers install the JDK. For production you either ship a full JDK image or build a <b>tiny custom runtime</b> with <code>jlink</code> containing only the modules your app uses (often 40–60 MB instead of 300+ MB). Some vendors (e.g. Eclipse Temurin) still offer "JRE" builds, which are just pre-made jlink images.</p>
<h4>Inside the JVM — three big parts</h4>
<ol><li><b>Class loader subsystem</b> — finds <code>.class</code> files, loads them, links them (verify → prepare → resolve), then initializes them (runs <code>static</code> blocks).</li>
<li><b>Runtime data areas</b> (memory):
${H.table(['Area', 'Shared?', 'Holds'], [
  ['Heap', 'all threads', 'every object and array (<code>new ...</code>); cleaned by the garbage collector'],
  ['Metaspace (method area)', 'all threads', 'class metadata, method bytecode, constant pools (native memory since Java 8)'],
  ['JVM stack', 'one per thread', 'a <b>frame</b> per method call: local variables + operand stack'],
  ['PC register', 'one per thread', 'which bytecode instruction runs next'],
  ['Native method stack', 'one per thread', 'frames for C/C++ code called via JNI']
])}</li>
<li><b>Execution engine</b> — the <b>interpreter</b> (starts fast), the <b>JIT compilers</b> C1 and C2 (make hot code fast), and the <b>garbage collector</b> (G1 by default; ZGC for very low pauses).</li></ol>
<h4>The JVM is a stack machine</h4>
<p>Bytecode does not use CPU registers. Every instruction pushes values onto, or pops values from, a little <b>operand stack</b> in the current frame. <code>a + b * 4</code> becomes: push a, push b, push 4, multiply (pop 2, push 1), add (pop 2, push 1). Play with the second visualizer to see it.</p>`,
    clues: [
      '"Difference between JDK, JRE and JVM" → nested boxes: JVM runs bytecode, JRE = JVM + libraries, JDK = JRE + dev tools',
      '"Is the JVM platform independent?" → No! Bytecode is; the JVM is written separately for each OS/CPU',
      '"Where are objects stored vs local variables?" → objects on the heap, primitives/references of locals in the stack frame',
      '"Our Docker image is 400 MB" → jlink a minimal runtime / use a JRE-style base image',
      '"Name the parts of the JVM" → class loader, runtime data areas, execution engine (interpreter + JIT + GC)',
      '"StackOverflowError vs OutOfMemoryError" → one thread\'s stack frames vs the shared heap/metaspace'
    ],
    code: [R`
// Which JVM am I running on? These system properties answer it at run time.
public class WhoAmI {
    public static void main(String[] args) {
        System.out.println("Java version : " + System.getProperty("java.version"));
        System.out.println("Vendor       : " + System.getProperty("java.vendor"));
        System.out.println("JVM          : " + System.getProperty("java.vm.name"));
        System.out.println("OS / CPU     : " + System.getProperty("os.name") + " / " + System.getProperty("os.arch"));
        System.out.println("Runtime.version().feature() = " + Runtime.version().feature()); // e.g. 21

        Runtime rt = Runtime.getRuntime();
        System.out.println("CPUs visible : " + rt.availableProcessors());
        System.out.println("Max heap MB  : " + rt.maxMemory() / (1024 * 1024));
    }
}`, { lang: 'bash', code: R`# List the modules inside this runtime (java.base is always there)
java --list-modules | head

# Find which modules YOUR app needs
jdeps --print-module-deps --ignore-missing-deps app.jar      # e.g. java.base,java.sql

# Build a tiny custom runtime (a "JRE" made just for your app)
jlink --add-modules java.base,java.sql --strip-debug --no-header-files \
      --no-man-pages --output myruntime
./myruntime/bin/java -jar app.jar` , title: 'jlink: build your own small runtime' }],
    codeTitle: ['Ask the running JVM about itself', 'Make a custom runtime with jlink'],
    viz: [{
      title: 'JDK ⊃ JRE ⊃ JVM: who does what',
      gen: function () {
        var nodes = [
          { id: 'JDK', label: 'JDK = JRE + dev tools', x: 50, y: 5, shape: 'box', w: 40 },
          { id: 'javac', label: 'javac', x: 10, y: 20, shape: 'box' },
          { id: 'jar', label: 'jar', x: 10, y: 33, shape: 'box' },
          { id: 'jshell', label: 'jshell', x: 10, y: 46, shape: 'box' },
          { id: 'jlink', label: 'jlink', x: 10, y: 59, shape: 'box' },
          { id: 'JRE', label: 'JRE = JVM + class library', x: 55, y: 20, shape: 'box', w: 44 },
          { id: 'LIB', label: 'java.base, java.sql ...', x: 40, y: 34, shape: 'box' },
          { id: 'JVM', label: 'JVM', x: 77, y: 34, shape: 'box' },
          { id: 'CL', label: 'Class loader', x: 33, y: 52, shape: 'box' },
          { id: 'MEM', label: 'Heap + Stacks', x: 58, y: 52, shape: 'box' },
          { id: 'EX', label: 'Interp + JIT + GC', x: 85, y: 52, shape: 'box' }
        ];
        var edges = [['JDK', 'javac'], ['JDK', 'jar'], ['JDK', 'jshell'], ['JDK', 'jlink'], ['JDK', 'JRE'], ['JRE', 'LIB'], ['JRE', 'JVM'], ['JVM', 'CL'], ['JVM', 'MEM'], ['JVM', 'EX']];
        function g(hl, ehl, tags) { return { type: 'graph', label: 'The nested boxes', directed: true, height: 66, nodes: nodes, edges: edges, hl: hl, ehl: ehl || {}, tags: tags || {} }; }
        return [
          { narr: 'The big picture: the <b>JDK</b> is the outer box. Inside it sits the <b>JRE</b>, and inside the JRE sits the <b>JVM</b>.', parts: [g({ JDK: 'sel', JRE: 'win', JVM: 'cur' })] },
          { narr: '<b>Writing</b> code: you use JDK-only tools. <code>javac</code> compiles, <code>jar</code> packages, <code>jshell</code> experiments, <code>jlink</code> builds runtimes. None of these are needed to merely <i>run</i> a program.', parts: [g({ JDK: 'cur', javac: 'ok', jar: 'ok', jshell: 'ok', jlink: 'ok' }, { 'JDK-javac': 'ok', 'JDK-jar': 'ok', 'JDK-jshell': 'ok', 'JDK-jlink': 'ok' }, { javac: 'compile' })] },
          { narr: '<b>Running</b> code needs the JRE: the JVM plus the <b>class library</b>. When your code calls <code>"hi".toUpperCase()</code>, that method lives in <code>java.base</code>, not in your jar.', parts: [g({ JRE: 'cur', LIB: 'ok', JVM: 'ok' }, { 'JRE-LIB': 'ok', 'JRE-JVM': 'ok' })] },
          { narr: 'Step 1 inside the JVM: the <b>class loader</b> finds and loads <code>.class</code> files lazily — only when a class is first used.', parts: [g({ JVM: 'win', CL: 'cur' }, { 'JVM-CL': 'cur' }, { CL: 'load → link → init' })] },
          { narr: 'Step 2: <b>memory</b>. Objects go on the shared <b>heap</b>; each thread gets its own <b>stack</b> of method frames holding local variables.', parts: [g({ JVM: 'win', MEM: 'cur' }, { 'JVM-MEM': 'cur' }, { MEM: 'heap shared, stack per thread' })] },
          { narr: 'Step 3: the <b>execution engine</b> interprets bytecode, JIT-compiles hot methods into native code, and the <b>GC</b> frees objects nobody references any more.', parts: [g({ JVM: 'win', EX: 'cur' }, { 'JVM-EX': 'cur' }, { EX: 'G1 GC by default' })] },
          { narr: 'Who installs what in 2026? Developers: a <b>JDK</b>. Servers/containers: a JDK image or a slim <b>jlink</b> runtime. End users of desktop apps: the app bundles its own runtime (via <code>jpackage</code>).', parts: [{ type: 'table', label: 'Pick the box', columns: ['Person', 'Needs', 'Why'], rows: [['You, writing code', 'JDK', 'javac + tools'], ['Production server', 'JDK image or jlink runtime', 'only runs bytecode'], ['Desktop user', 'bundled runtime (jpackage)', 'no separate install'], ['CI pipeline', 'JDK (pinned version)', 'compiles and tests']], hl: { 0: 'sel' } }] }
        ];
      }
    }, {
      title: 'The JVM is a stack machine: int c = a + b * 4',
      input: '2 3',
      inputLabel: 'Values of a and b (two integers)',
      gen: function (input) {
        var t = String(input).trim().split(/[\s,]+/);
        if (t.length !== 2) throw new Error('Type two integers, e.g. "2 3"');
        var a = clampInt(t[0], -2147483648, 2147483647, 'a must be a whole number in int range');
        var b = clampInt(t[1], -2147483648, 2147483647, 'b must be a whole number in int range');
        var code = 'iload_0     // push a\niload_1     // push b\niconst_4    // push 4\nimul        // pop 2, push b*4\niadd        // pop 2, push a + (b*4)\nistore_2    // pop into c\niload_2     // push c\nireturn     // return top of stack';
        var src = { type: 'code', label: 'Java source', lang: 'java', code: 'static int calc(int a, int b) {\n    int c = a + b * 4;\n    return c;\n}', hl: { 2: 'cur' } };
        var frames = [], st = [], loc = [a, b, '?'];
        function snap(line, narr, cls) {
          var h = {}; h[line] = cls || 'cur';
          var sh = {}; if (st.length) sh[st.length - 1] = 'cur';
          frames.push({ narr: narr, parts: [{ type: 'code', label: 'Bytecode (javap -c)', lang: 'text', code: code, hl: h }, { type: 'stack', label: 'Operand stack', items: st.slice(), hl: sh }, { type: 'array', label: 'Local variable slots', values: loc.slice(), idxLabels: ['0: a', '1: b', '2: c'] }, src] });
        }
        frames.push({ narr: 'The method is called with a = <b>' + a + '</b>, b = <b>' + b + '</b>. The JVM creates a <b>frame</b>: local slots 0 and 1 hold the arguments, slot 2 is reserved for <code>c</code>. The operand stack starts empty.', parts: [{ type: 'stack', label: 'Operand stack', items: [] }, { type: 'array', label: 'Local variable slots', values: loc.slice(), idxLabels: ['0: a', '1: b', '2: c'] }, { type: 'stack', label: 'Thread call stack (frames)', items: ['main', 'calc(' + a + ', ' + b + ')'], hl: { 1: 'cur' } }, src] });
        st.push(a); snap(1, '<code>iload_0</code>: copy local slot 0 (a = ' + a + ') onto the stack. Loading <b>copies</b>; the local keeps its value.');
        st.push(b); snap(2, '<code>iload_1</code>: push b = ' + b + '.');
        st.push(4); snap(3, '<code>iconst_4</code>: push the constant 4. Small constants (-1..5) have their own one-byte instructions.');
        var y = st.pop(), x = st.pop(), p = Math.imul(x, y); st.push(p);
        snap(4, '<code>imul</code>: pop two values (' + x + ' and ' + y + '), multiply as 32-bit ints, push <b>' + p + '</b>. Multiplication happens first because javac already applied <b>precedence</b> when it chose the order of instructions.', 'ok');
        y = st.pop(); x = st.pop(); var s = (x + y) | 0; st.push(s);
        snap(5, '<code>iadd</code>: pop ' + x + ' and ' + y + ', push <b>' + s + '</b>' + ((x + y) !== s ? ' <span class="c-r">(overflowed and wrapped!)</span>' : '') + '.', 'ok');
        loc[2] = st.pop(); snap(6, '<code>istore_2</code>: pop the top into local slot 2. Now <code>c = ' + loc[2] + '</code> and the stack is empty again.', 'ok');
        st.push(loc[2]); snap(7, '<code>iload_2</code>: push c back so it can be returned.');
        var r = st.pop(); snap(8, '<code>ireturn</code>: pop <b>' + r + '</b> and hand it to the caller. This frame is destroyed; its locals vanish. That is why local variables need no garbage collection.', 'sel');
        frames.push({ narr: 'Back in <code>main</code>, the result <b>' + r + '</b> sits on main\'s operand stack. Every method call = push a frame, every return = pop it. Too many nested calls → <code>StackOverflowError</code>.', parts: [{ type: 'stack', label: 'Thread call stack (frames)', items: ['main'], hl: { 0: 'cur' } }, { type: 'vars', label: 'Result', vals: { 'calc(a, b)': r }, hl: { 'calc(a, b)': 'sel' } }] });
        return frames;
      }
    }],
    examples: [
      { title: 'Which one do I need?', html: R`${H.table(['Situation', 'Answer'], [['Learning Java, using IntelliJ / VS Code', 'JDK (the IDE needs javac)'], ['Running a Spring Boot jar on a VM', 'any Java runtime of the right version (JDK or jlink image)'], ['Building a container image', 'multi-stage: JDK to build, slim runtime to run'], ['Online judge / LeetCode', 'nothing — the site runs its own JVM']])}<p>Interview tip: say <b>"JDK to develop, a runtime to run, and the JVM is the engine inside both."</b></p>` },
      { title: 'Same jar, different JVMs', html: R`<p>Compile once on a Mac with Apple Silicon, copy <code>app.jar</code> to a Linux x64 server and a Windows laptop. All three run it. What differs is the JVM binary each machine installed (<code>java</code> for macOS-aarch64, linux-x64, windows-x64). The <b>bytecode never changes</b>.</p>${H.chips(['app.jar (bytecode)', 'JVM macOS-arm64', 'JVM Linux-x64', 'JVM Windows-x64'], { hl: { 0: 'g' } })}` },
      { title: 'Stack vs heap with a picture', html: R`<p>In the code below, <code>count</code> and the <i>reference</i> <code>names</code> live in <code>main</code>'s stack frame. The <code>ArrayList</code> object and its strings live on the heap.</p>${H.kv([['count (stack)', '2'], ['names (stack)', '→ @1a2b (heap address)'], ['@1a2b (heap)', 'ArrayList[ "Asha", "Ben" ]']], { label: 'Memory' })}`, code: R`
int count = 2;                                   // primitive: value stored in the frame
List<String> names = new ArrayList<>();          // reference in frame, object on heap
names.add("Asha");
names.add("Ben");
System.out.println(count + " " + names);         // 2 [Asha, Ben]` },
      { title: 'Predict the error: endless recursion', html: R`<p>Each call pushes a new frame onto the thread's stack. The stack is small (often 512 KB – 1 MB per thread), so this ends with <code>java.lang.StackOverflowError</code> after roughly ten thousand calls — it is an <b>Error</b>, not an exception you should normally catch.</p>`, code: R`
public class Boom {
    static int depth = 0;
    static void dive() { depth++; dive(); }      // no base case!
    public static void main(String[] args) {
        try { dive(); }
        catch (StackOverflowError e) { System.out.println("Overflowed at depth ~" + depth); }
    }
}` }
    ],
    deepDive: R`<h4>Class loading in detail</h4>
<p>Three built-in loaders form a chain: <b>bootstrap</b> (core <code>java.base</code>, written in native code), <b>platform</b> (other JDK modules) and <b>application/system</b> (your classpath). Loading uses <b>parent delegation</b>: a loader first asks its parent, so nobody can sneak in a fake <code>java.lang.String</code>. Then <b>linking</b>: <i>verify</i> (bytecode safety), <i>prepare</i> (allocate static fields with default values), <i>resolve</i> (turn symbolic names like <code>#15</code> into real pointers, usually lazily). Finally <b>initialization</b> runs <code>static</code> initializers — exactly once, thread-safely, on first active use.</p>
<h4>Frames and the operand stack</h4>
<p>javac computes for each method the <b>max stack depth</b> and the <b>number of local slots</b>; the JVM allocates exactly that per frame. <code>long</code> and <code>double</code> take <b>two</b> slots. Instance methods keep <code>this</code> in slot 0. The verifier proves at load time that every path keeps the stack consistent, so the interpreter can skip runtime checks.</p>
<h4>JIT: tiered compilation</h4>
<p>HotSpot starts every method in the interpreter (tier 0), compiles warm methods quickly with <b>C1</b> while collecting profiles (tiers 2–3), then recompiles hot ones with the optimizing <b>C2</b> (tier 4) using those profiles: inlining, escape analysis (objects that never leave a method may never touch the heap), loop unrolling, vectorization. If an assumption breaks (a new subclass is loaded), the JVM <b>deoptimizes</b> back to the interpreter. This is why Java benchmarks need warm-up (use JMH).</p>
<h4>Memory and GC in production</h4>
<ul><li><b>G1</b> is the default collector; <b>generational ZGC</b> (JDK 21+, the only ZGC mode since JDK 23) gives sub-millisecond pauses on huge heaps; <b>Parallel</b> maximizes throughput for batch jobs; <b>Serial</b> suits tiny containers.</li>
<li>The JVM is <b>container-aware</b>: it reads cgroup CPU/memory limits. Size the heap with <code>-XX:MaxRAMPercentage=75</code> rather than a fixed <code>-Xmx</code> that ignores the container.</li>
<li>Out-of-memory comes in flavours: <code>Java heap space</code>, <code>Metaspace</code> (too many classes — often a class-loader leak), <code>unable to create native thread</code>.</li>
<li>Other JVMs implement the same spec: Eclipse OpenJ9 (lower footprint), GraalVM (Graal JIT + native-image).</li></ul>`,
    aiEra: R`<p><b>What AI changes:</b> tools can read a GC log, a heap dump summary or a JFR recording and point at the suspicious allocation site in seconds. Container base-image choice (full JDK vs jlink vs distroless) is now a one-prompt decision.</p>
<p><b>Use AI as a partner:</b> <code>Here is my jdeps output; write the jlink command and a multi-stage Dockerfile</code>. <code>Summarize this GC log: pause times, allocation rate, is the heap too small?</code> Then verify with <code>jcmd &lt;pid&gt; GC.heap_info</code>.</p>
<p><b>Where AI goes wrong:</b> repeating outdated facts — "PermGen" (removed in Java 8), "download the JRE from java.com", recommending CMS (removed in JDK 14) or the non-generational ZGC flags. It also confuses "the JVM is platform independent" (wrong) with "bytecode is platform independent" (right). It happily suggests huge <code>-Xmx</code> values that make containers get OOM-killed.</p>
<p><b>What you must still own:</b> a correct mental picture of heap vs stack vs metaspace, what the class loader and JIT do, and the ability to explain a <code>StackOverflowError</code> or <code>OutOfMemoryError</code> from first principles in an interview — no AI is in the room.</p>`,
    problems: [{
      title: 'Run a Tiny JVM Stack Machine',
      level: 'Medium', tags: ['stack', 'simulation', 'jvm'], companies: ['Oracle', 'Amazon', 'Google'],
      statement: R`<p>Write an interpreter for a mini bytecode language. You get a <code>String[]</code> program and run it with an operand stack and 4 local slots (all start at 0). Instructions:</p>
<ul><li><code>iconst k</code> push integer k · <code>iload n</code> push local n · <code>istore n</code> pop into local n</li>
<li><code>iadd</code>, <code>isub</code>, <code>imul</code>: pop <b>right</b> first, then <b>left</b>, push <code>left op right</code> with normal Java <code>int</code> overflow</li>
<li><code>ireturn</code>: pop and return the top value.</li></ul>`,
      constraints: R`1 ≤ program length ≤ 1000; every program is valid and ends with <code>ireturn</code>; locals indexed 0..3.`,
      example: R`<p>Program: <code>iconst 7, istore 0, iload 0, iconst 2, isub, iconst 3, imul, ireturn</code></p>${H.table(['instr', 'stack after'], [['iconst 7', '[7]'], ['istore 0', '[] (local0 = 7)'], ['iload 0', '[7]'], ['iconst 2', '[7, 2]'], ['isub', '[5]'], ['iconst 3', '[5, 3]'], ['imul', '[15]'], ['ireturn', H.c('g', 'returns 15')]])}<p>Order matters for <code>isub</code>: right operand (2) is on top, so we compute 7 − 2, not 2 − 7.</p>`,
      brute: { why: R`<p>A tempting shortcut is to rebuild a text expression like <code>"(7-2)*3"</code> and evaluate it with a hand-written parser. That is far more code, and it re-solves a problem the stack already solves: postfix order means <b>no parsing and no precedence rules</b>. The brute version below uses an <code>ArrayList</code> as a stack and removes from the end — correct but clumsy and easy to get the pop order wrong.</p>`, code: R`
static int runBrute(String[] prog) {
    List<Integer> st = new ArrayList<>();
    int[] loc = new int[4];
    for (String line : prog) {
        String[] p = line.split(" ");
        if (p[0].equals("iconst")) st.add(Integer.parseInt(p[1]));
        else if (p[0].equals("iload")) st.add(loc[Integer.parseInt(p[1])]);
        else if (p[0].equals("istore")) loc[Integer.parseInt(p[1])] = st.remove(st.size() - 1);
        else if (p[0].equals("ireturn")) return st.remove(st.size() - 1);
        else {
            int r = st.remove(st.size() - 1), l = st.remove(st.size() - 1);
            if (p[0].equals("iadd")) st.add(l + r);
            else if (p[0].equals("isub")) st.add(l - r);
            else st.add(l * r);
        }
    }
    throw new IllegalStateException("no ireturn");
}` },
      mcq: { q: 'Stack is [10, 4] (4 on top). After <code>isub</code> the stack holds…', options: ['[6]', '[-6]', '[14]', '[10, 4]'], answer: 0, explain: 'Pop right = 4, then left = 10; push 10 − 4 = 6.' },
      hints: [R`<p>Hint 1: the operand stack is exactly a stack: <code>ArrayDeque&lt;Integer&gt;</code> with <code>push</code>/<code>pop</code>, or a plain <code>int[]</code> plus a top index (fastest, no boxing).</p>`, R`<p>Hint 2: for binary instructions pop <b>right</b> first, then <b>left</b>. Use a <code>switch</code> expression on the opcode string to keep it tidy.</p>`, R`<p>Hint 3: Java <code>int</code> arithmetic already wraps on overflow, so no special handling is needed. Recipe: split each line; switch on opcode; push/pop/store; return on ireturn.</p>`],
      solution: {
        approach: R`<p>Simulate exactly what the JVM does: an <code>int[]</code> as the operand stack with a <code>sp</code> (stack pointer), an <code>int[4]</code> for locals, and a <code>switch</code> on the opcode. No boxing, O(1) per instruction.</p>`,
        code: R`
public class MiniJvm {
    static int run(String[] prog) {
        int[] stack = new int[prog.length];   // never deeper than #instructions
        int sp = 0;                           // next free slot
        int[] local = new int[4];
        for (String line : prog) {
            String[] p = line.trim().split("\\s+");
            switch (p[0]) {
                case "iconst" -> stack[sp++] = Integer.parseInt(p[1]);
                case "iload"  -> stack[sp++] = local[Integer.parseInt(p[1])];
                case "istore" -> local[Integer.parseInt(p[1])] = stack[--sp];
                case "iadd", "isub", "imul" -> {
                    int right = stack[--sp];      // top of stack is the RIGHT operand
                    int left  = stack[--sp];
                    stack[sp++] = switch (p[0]) {
                        case "iadd" -> left + right;
                        case "isub" -> left - right;
                        default     -> left * right;   // wraps like real int
                    };
                }
                case "ireturn" -> { return stack[--sp]; }
                default -> throw new IllegalArgumentException("bad opcode: " + p[0]);
            }
        }
        throw new IllegalStateException("program ended without ireturn");
    }
    public static void main(String[] args) {
        String[] prog = {"iconst 7", "istore 0", "iload 0", "iconst 2", "isub", "iconst 3", "imul", "ireturn"};
        System.out.println(run(prog)); // 15
    }
}`,
        dry: { head: ['instr', 'sp before', 'stack after', 'locals'], rows: [['iconst 7', '0', '[7]', '[0,0,0,0]'], ['istore 0', '1', '[]', '[7,0,0,0]'], ['iload 0', '0', '[7]', '[7,0,0,0]'], ['iconst 2', '1', '[7,2]', '[7,0,0,0]'], ['isub', '2', '[5]', '[7,0,0,0]'], ['iconst 3', '1', '[5,3]', '[7,0,0,0]'], ['imul', '2', '[15]', '[7,0,0,0]'], ['ireturn', '1', '<span class="c-g">return 15</span>', '[7,0,0,0]']] },
        complexity: R`<p>O(P) time for P instructions, O(P) space for the stack (the JVM instead uses the max depth javac precomputed).</p>`,
        followUps: ['Add <code>goto n</code> and <code>ifeq n</code> so loops become possible — what changes?', 'How would you precompute the maximum stack depth like javac does?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 3 — The main method & command-line arguments
     ====================================================================== */
  topics.push({
    title: 'The main Method, Command-Line Arguments & Exit Codes',
    analogy: R`<p>The JVM is a delivery driver arriving at a big office building (your class). It does not wander around — it walks straight to the one door with the exact sign <b><code>public static void main(String[] args)</code></b>. <b>public</b> = the door faces the street, <b>static</b> = you can use it before anyone inside is hired (no object yet), <b>void</b> = the driver does not wait for a reply, and <b>args</b> = the envelope of notes the driver hands over (the words you typed after the class name).</p>`,
    explain: R`<h4>The classic signature, word by word</h4>
${H.table(['Word', 'Meaning', 'What breaks without it (Java 21 launcher)'], [
  ['<code>public</code>', 'visible from outside the class, so the launcher can call it', 'Error: Main method not found'],
  ['<code>static</code>', 'belongs to the class; no object has to be created first', 'Error: Main method is not static'],
  ['<code>void</code>', 'returns nothing; the exit code is set with <code>System.exit(n)</code>', 'Error: Main method must return a value of type void'],
  ['<code>main</code>', 'the exact name the launcher looks for (case-sensitive: <code>Main</code> will not do)', 'Error: Main method not found'],
  ['<code>String[] args</code>', 'the command-line words, as Strings', 'not found (unless Java 25 instance main, see below)']
])}
<p>Allowed variations: <code>String... args</code> (varargs), <code>String args[]</code> (C style), any parameter name (<code>String[] a</code>), adding <code>final</code>. You may also <b>overload</b> <code>main</code> with other parameters — the launcher simply ignores those.</p>
<h4>args — the words after the class name</h4>
<p><code>java Greet Asha 21</code> gives <code>args = {"Asha", "21"}</code>. Every argument is a <b>String</b>, even numbers, so convert with <code>Integer.parseInt(args[1])</code>. If you type nothing, <code>args</code> is an <b>empty array</b> (length 0), never <code>null</code>. Quotes group words: <code>java Echo "New York" 5</code> → 2 arguments.</p>
<h4>Exit codes — how a program reports success</h4>
${H.table(['How main ends', 'Exit code', 'Where the text goes'], [
  ['returns normally', '0 (success)', '—'],
  ['<code>System.exit(2)</code>', '2 (your choice; non-zero = failure)', '—'],
  ['uncaught exception', '1', 'stack trace on <b>System.err</b>'],
]) }
<p>Scripts, CI pipelines and Kubernetes read this number. Print normal output to <code>System.out</code> and errors to <code>System.err</code> so they can be redirected separately (<code>java App &gt; out.txt 2&gt; err.txt</code>).</p>
<h4>Modern Java: simpler main (Java 25)</h4>
<p>From <b>Java 25</b> (JEP 512, previewed since 21) a beginner program can be just:</p>
<pre>void main() {
    IO.println("Hello!");
}</pre>
<p>No class line, no <code>public</code>, no <code>static</code>, no <code>args</code>. This is a <b>compact source file</b>; the compiler wraps it in an implicit class. The launcher picks a <code>main</code> that takes <code>String[]</code> if there is one, otherwise one with no parameters; if <code>main</code> is not static, it creates an object first. Interviewers in 2026 still expect you to know the classic form — most production code and older JDKs use it.</p>`,
    clues: [
      '"Why is main static?" → the JVM must call it before any object of the class exists',
      '"Can we overload / make main final / synchronized?" → yes; the launcher only looks for the (String[]) form',
      '"What is args when no arguments are passed?" → an empty array, length 0, not null',
      '"Read a number from the command line" → <code>Integer.parseInt(args[i])</code>, guard with length check and NumberFormatException',
      '"Exit with a status code" → <code>System.exit(n)</code>; 0 = success',
      '"What happens if main throws?" → stack trace on stderr, exit code 1 (if no other non-daemon threads keep the JVM alive)'
    ],
    code: [R`
// File: Greet.java      Run:  java Greet Asha 21
public class Greet {
    public static void main(String[] args) {
        if (args.length < 2) {                                  // always validate input
            System.err.println("Usage: java Greet <name> <age>");
            System.exit(1);                                     // non-zero = failure
        }
        String name = args[0];                                  // first word
        int age;
        try {
            age = Integer.parseInt(args[1]);                    // "21" -> 21
        } catch (NumberFormatException e) {
            System.err.println("Age must be a whole number, got: " + args[1]);
            System.exit(2);
            return;                                             // keeps the compiler happy
        }
        System.out.println("Hi " + name + ", next year you'll be " + (age + 1));
    }   // returning normally -> exit code 0
}`, R`
// Reading input from the keyboard (stdin) instead of args
import java.util.Scanner;

public class AddTwo {
    public static void main(String[] args) {
        Scanner in = new Scanner(System.in);
        System.out.print("Enter two numbers: ");
        long a = in.nextLong(), b = in.nextLong();   // long avoids int overflow on big input
        System.out.println("Sum = " + (a + b));
    }
}`],
    codeTitle: ['Classic main with argument checks and exit codes', 'Reading from standard input with Scanner'],
    viz: {
      title: 'What happens when you type a java command',
      input: 'java Greet Asha 21',
      inputLabel: 'Command line (try "java Greet Asha", "java Greet Asha twenty")',
      gen: function (input) {
        var t = String(input).trim().split(/\s+/).filter(function (x) { return x; });
        if (!t.length) throw new Error('Type a command like: java Greet Asha 21');
        if (t[0] === 'java') t.shift();
        if (!t.length) throw new Error('Add a class name after java, e.g. java Greet Asha 21');
        var cls = t.shift(), args = t.slice(0, 6);
        if (!/^[A-Za-z_$][\w$]*$/.test(cls)) throw new Error('Class name must be an identifier, e.g. Greet');
        var code = 'public class ' + cls + ' {\n  public static void main(String[] args) {\n    if (args.length < 2) {\n      System.err.println("Usage: java ' + cls + ' <name> <age>");\n      System.exit(1);\n    }\n    String name = args[0];\n    int age = Integer.parseInt(args[1]);\n    System.out.println("Hi " + name + ", next year you\'ll be " + (age + 1));\n  }\n}';
        var frames = [];
        function C(line, cls2) { var h = {}; h[line] = cls2 || 'cur'; return { type: 'code', label: cls + '.java', lang: 'java', code: code, hl: h }; }
        var words = ['java', cls].concat(args);
        frames.push({ narr: 'Your shell splits the line on spaces into words. Word 1 starts the JVM, word 2 is the <b>class name</b>, everything after becomes <b>args</b>.', parts: [{ type: 'array', label: 'Words typed', values: words, hl: (function () { var o = { 0: 'done', 1: 'sel' }; for (var i = 2; i < words.length; i++) o[i] = 'ok'; return o; })() }] });
        frames.push({ narr: 'The launcher loads class <b>' + cls + '</b>, runs its static initializers, and looks for <code>public static void main(String[] args)</code>. It builds a <code>String[]</code> of length <b>' + args.length + '</b>' + (args.length ? '' : ' (empty, but not null!)') + '.', parts: [{ type: 'array', label: 'args (String[])', values: args.length ? args.map(function (a) { return '"' + a + '"'; }) : ['(empty)'], hl: args.length ? {} : { 0: 'done' } }, { type: 'stack', label: 'main thread call stack', items: ['main(args)'], hl: { 0: 'cur' } }, C(2)] });
        var short = args.length < 2;
        frames.push({ narr: 'Line 3 checks <code>args.length &lt; 2</code> → ' + args.length + ' &lt; 2 is <b>' + short + '</b>.' + (short ? ' Not enough input.' : ' Good, we have a name and an age.'), parts: [{ type: 'vars', label: 'main frame', vals: { 'args.length': args.length, 'args.length < 2': short }, hl: { 'args.length < 2': short ? 'bad' : 'ok' } }, C(3, short ? 'bad' : 'ok')] });
        if (short) {
          frames.push({ narr: 'Print a usage hint to <b>System.err</b> (the error stream), then <code>System.exit(1)</code>. Exit code 1 tells scripts "this failed".', parts: [{ type: 'text', label: 'Terminal (stderr)', html: '<span class="c-r">Usage: java ' + H.esc(cls) + ' &lt;name&gt; &lt;age&gt;</span>' }, C(5, 'bad'), { type: 'vars', label: 'Process', vals: { 'exit code': 1 }, hl: { 'exit code': 'bad' } }] });
          return frames;
        }
        frames.push({ narr: 'Line 7: <code>name = args[0]</code> → <b>"' + H.esc(args[0]) + '"</b>. Arrays start at index 0.', parts: [{ type: 'array', label: 'args', values: args.map(function (a) { return '"' + a + '"'; }), hl: { 0: 'cur' }, ptr: { 0: 'args[0]' } }, { type: 'vars', label: 'main frame', vals: { name: '"' + args[0] + '"' }, hl: { name: 'ok' } }, C(7)] });
        var ok = /^[+-]?\d{1,9}$/.test(args[1]);
        frames.push({ narr: 'Line 8: <code>Integer.parseInt("' + H.esc(args[1]) + '")</code>. Every argument is a String, so we must convert. ' + (ok ? 'It is a valid int → <b>' + parseInt(args[1], 10) + '</b>.' : '<span class="c-r">Not a valid int!</span>'), parts: [{ type: 'array', label: 'args', values: args.map(function (a) { return '"' + a + '"'; }), hl: { 1: ok ? 'ok' : 'bad' }, ptr: { 1: 'args[1]' } }, C(8, ok ? 'ok' : 'bad')] });
        if (!ok) {
          frames.push({ narr: 'parseInt throws <code>NumberFormatException</code>. Nobody catches it, so the JVM prints the stack trace to stderr and exits with code <b>1</b>. (Production code would catch it and print a friendly message.)', parts: [{ type: 'text', label: 'Terminal (stderr)', html: '<span class="c-r">Exception in thread "main" java.lang.NumberFormatException: For input string: "' + H.esc(args[1]) + '"<br>&nbsp;&nbsp;at java.base/java.lang.Integer.parseInt(Integer.java:...)<br>&nbsp;&nbsp;at ' + H.esc(cls) + '.main(' + H.esc(cls) + '.java:8)</span>' }, { type: 'stack', label: 'call stack when it blew up', items: ['main(args)', 'Integer.parseInt'], hl: { 1: 'bad' } }, { type: 'vars', label: 'Process', vals: { 'exit code': 1 }, hl: { 'exit code': 'bad' } }] });
          return frames;
        }
        var age = parseInt(args[1], 10);
        frames.push({ narr: 'Line 9 builds a String with <code>+</code>. Note the brackets: <code>(age + 1)</code> is maths (' + (age + 1) + '); without them Java would glue "' + age + '" and "1" into <b>"' + age + '1"</b>!', parts: [{ type: 'vars', label: 'main frame', vals: { name: '"' + args[0] + '"', age: age, 'age + 1': age + 1 }, hl: { 'age + 1': 'ok' } }, C(9, 'ok'), { type: 'text', label: 'Terminal (stdout)', html: '<b>Hi ' + H.esc(args[0]) + ', next year you\'ll be ' + (age + 1) + '</b>' }] });
        frames.push({ narr: (args.length > 2 ? 'Extra arguments (' + args.slice(2).map(function (a) { return '"' + H.esc(a) + '"'; }).join(', ') + ') were simply ignored. ' : '') + '<code>main</code> returns, its frame is popped, no other threads are running → JVM exits with code <b>0</b>.', parts: [{ type: 'stack', label: 'main thread call stack', items: [] }, { type: 'vars', label: 'Process', vals: { 'exit code': 0 }, hl: { 'exit code': 'ok' } }] });
        return frames;
      }
    },
    examples: [
      { title: 'Predict the output: quotes and empty args', html: R`<p>Program <code>Echo</code> prints <code>args.length</code> then each argument in brackets.</p>${H.table(['Command', 'Output'], [['<code>java Echo</code>', '0'], ['<code>java Echo a b</code>', '2 [a][b]'], ['<code>java Echo "a b" c</code>', '2 [a b][c]'], ['<code>java Echo ""</code>', '1 []']])}<p>An empty pair of quotes is a real (empty) argument.</p>`, code: R`
public class Echo {
    public static void main(String[] args) {
        System.out.print(args.length);
        for (String a : args) System.out.print(" [" + a + "]");
        System.out.println();
    }
}` },
      { title: 'Overloaded main — which one runs?', html: R`<p>The launcher only calls <code>main(String[])</code>. The <code>int</code> version is a normal method you can call yourself. Output: <code>launcher picked me</code> then <code>overload: 42</code>.</p>`, code: R`
public class Over {
    public static void main(String[] args) {
        System.out.println("launcher picked me");
        main(42);                                  // just an ordinary call
    }
    static void main(int x) { System.out.println("overload: " + x); }
}` },
      { title: 'Java 25 compact source file (JDK 25+)', html: R`<p>Save as <code>Hi.java</code> and run <code>java Hi.java</code> on JDK 25+. No class declaration; <code>IO.println</code> is a new helper in <code>java.lang</code>; all of <code>java.base</code> (e.g. <code>List</code>) is imported automatically. On JDK 21–24 this needs <code>--enable-preview</code> (and in 21 the name <code>IO</code> did not exist yet).</p>`, code: { lang: 'java', check: false, title: 'Requires JDK 25+', code: R`
// Hi.java  (compact source file, Java 25+)
void main() {
    String name = IO.readln("Your name? ");   // reads a line from the console
    List<String> langs = List.of("Java", "Kotlin");
    IO.println("Hi " + name + ", you know " + langs);
}` } },
      { title: 'Exit codes in a shell script', html: R`<p>CI systems stop the pipeline when a step returns non-zero. Your Java tool can participate:</p><pre>java -cp out Validator data.csv
echo "exit code: $?"      # 0 = valid, 3 = bad rows (your convention)</pre><p>Inside: <code>if (badRows &gt; 0) System.exit(3);</code>. Document your codes in <code>--help</code>.</p>` }
    ],
    deepDive: R`<h4>How the launcher really finds main</h4>
<p>The <code>java</code> binary (a small C program, libjli) creates the JVM, then calls an internal helper (<code>sun.launcher.LauncherHelper</code>) that loads your class with the application class loader and looks up <code>main</code> by reflection. Loading the class runs its <b>static initializers first</b> — so a <code>static { System.out.println("x"); }</code> block prints before <code>main</code> starts. In Java 25 the selection order is: a <code>main(String[])</code> if present, otherwise a <code>main()</code>; static preferred; instance <code>main</code> requires a non-private no-arg constructor, which the launcher calls.</p>
<h4>When does the JVM actually exit?</h4>
<p>Not when <code>main</code> returns, but when the <b>last non-daemon thread</b> ends. Start a thread that loops forever and your program never stops even after <code>main</code> finishes. <code>System.exit(n)</code> forces shutdown: it runs <b>shutdown hooks</b> (<code>Runtime.getRuntime().addShutdownHook(...)</code>) and then halts. <code>finally</code> blocks of the current thread do <b>not</b> run after <code>System.exit</code>. In containers, <code>SIGTERM</code> from Kubernetes triggers the same hooks — that is where graceful shutdown code lives.</p>
<h4>Argument plumbing in production</h4>
<ul><li>JVM options go <b>before</b> the class name, program args <b>after</b>: <code>java -Xmx512m -Dmode=prod App input.txt</code>. <code>-D</code> values are read with <code>System.getProperty("mode")</code>.</li>
<li>Very long command lines can be put in a file: <code>java @opts.txt App</code> (argument files, since Java 9).</li>
<li>Executable jars name the entry class in <code>META-INF/MANIFEST.MF</code> as <code>Main-Class: com.acme.App</code>.</li>
<li>Real CLIs use a parser library (picocli) for flags like <code>--verbose</code>; environment variables are read with <code>System.getenv("HOME")</code>.</li>
<li><code>args</code> encoding follows the OS; on Windows consoles non-ASCII arguments historically broke — another reason JDK 18 made UTF-8 the default charset.</li></ul>`,
    aiEra: R`<p><b>What AI changes:</b> boilerplate like argument parsing, <code>--help</code> text and picocli setup is generated instantly, and Java 25's tiny <code>void main()</code> makes Java nearly as quick as Python for AI-written scripts and agent tools.</p>
<p><b>Use AI as a partner:</b> <code>Generate a picocli command with --input and --dry-run flags and exit code 0/1/2 semantics</code>; <code>List edge cases for my argument parsing</code> (no args, extra args, quoted spaces, negative numbers, huge numbers). Then write the guard clauses yourself.</p>
<p><b>Where AI goes wrong:</b> mixing Java versions — writing <code>void main()</code> for a project pinned to Java 17, or using <code>IO.println</code> on JDK 21 where it does not exist; forgetting that <code>args</code> is never null; calling <code>System.exit</code> inside library code (which kills the whole app server); printing errors to stdout so they corrupt piped output.</p>
<p><b>What you must still own:</b> knowing <i>why</i> main is static, what the launcher does, how exit codes and stderr integrate with shells/CI, and choosing the right Java syntax for the JDK your team actually runs.</p>`,
    problems: [{
      title: 'Command-Line Calculator',
      level: 'Easy', tags: ['main', 'args', 'parsing'], companies: ['Infosys', 'TCS', 'Amazon'],
      statement: R`<p>Write <code>static String eval(String[] args)</code> for a program run as <code>java Calc 7 + 3</code>. Rules:</p>
<ul><li>Exactly 3 arguments: number, operator, number — else return <code>"usage: Calc a op b"</code>.</li>
<li>Operators: <code>+ - x /</code> (use <code>x</code> for multiply because <code>*</code> is expanded by the shell). Unknown operator → <code>"bad operator"</code>.</li>
<li>Numbers must be valid <code>long</code> values — else <code>"bad number"</code>. Division by zero → <code>"divide by zero"</code>.</li>
<li>Otherwise return the result as text (integer division).</li></ul>`,
      constraints: R`Arguments are arbitrary strings; numbers fit in <code>long</code> when valid.`,
      example: R`${H.table(['args', 'eval(args)'], [['{"7", "+", "3"}', H.c('g', '"10"')], ['{"7", "/", "2"}', H.c('g', '"3"') + ' (integer division)'], ['{"7", "x"}', H.c('r', '"usage: Calc a op b"')], ['{"7", "/", "0"}', H.c('r', '"divide by zero"')], ['{"seven", "+", "1"}', H.c('r', '"bad number"')]])}`,
      brute: { why: R`<p>A first try often skips validation: <code>Long.parseLong(args[0]) + ...</code> straight away. It "works" on happy input but crashes with <code>ArrayIndexOutOfBoundsException</code>, <code>NumberFormatException</code> or <code>ArithmeticException</code> on anything else — and an uncaught exception means an ugly stack trace and exit code 1 for the user.</p>`, code: R`
static String evalBrute(String[] args) {
    long a = Long.parseLong(args[0]);        // crashes if args is short or not a number
    long b = Long.parseLong(args[2]);
    if (args[1].equals("+")) return "" + (a + b);
    if (args[1].equals("-")) return "" + (a - b);
    if (args[1].equals("x")) return "" + (a * b);
    return "" + (a / b);                     // crashes on b == 0, accepts any operator
}` },
      mcq: { q: 'Why use <code>x</code> instead of <code>*</code> for multiply on the command line?', options: ['Java cannot parse *', 'The shell expands * into the list of file names', 'args cannot contain symbols', '* is reserved in Java'], answer: 1, explain: 'bash/zsh replace an unquoted * with every file name in the folder before Java even starts. You could also quote it: "*".' },
      hints: [R`<p>Hint 1: check <code>args.length != 3</code> first — guard clauses at the top keep the rest simple.</p>`, R`<p>Hint 2: wrap both <code>Long.parseLong</code> calls in one <code>try/catch (NumberFormatException e)</code>, then use a <code>switch</code> expression on the operator string.</p>`, R`<p>Hint 3: check division by zero <i>before</i> dividing. Recipe: length check → parse → zero check if "/" → switch(+,-,x,/) → default "bad operator".</p>`],
      solution: {
        approach: R`<p>Validate in the order the data arrives: count, numbers, operator-specific rules, then compute. Returning strings keeps <code>eval</code> testable; <code>main</code> prints and chooses the exit code.</p>`,
        code: R`
public class Calc {
    static String eval(String[] args) {
        if (args.length != 3) return "usage: Calc a op b";
        long a, b;
        try {
            a = Long.parseLong(args[0]);
            b = Long.parseLong(args[2]);
        } catch (NumberFormatException e) {
            return "bad number";
        }
        String op = args[1];
        if (op.equals("/") && b == 0) return "divide by zero";
        return switch (op) {
            case "+" -> String.valueOf(a + b);
            case "-" -> String.valueOf(a - b);
            case "x" -> String.valueOf(a * b);
            case "/" -> String.valueOf(a / b);     // integer division truncates toward zero
            default  -> "bad operator";
        };
    }
    public static void main(String[] args) {
        String out = eval(args);
        boolean ok = out.matches("-?\\d+");
        (ok ? System.out : System.err).println(out);
        System.exit(ok ? 0 : 1);
    }
}`,
        dry: { head: ['args', 'length ok?', 'a, b', 'op', 'result'], rows: [['7 + 3', 'yes', '7, 3', '+', '<span class="c-g">"10"</span>'], ['7 / 2', 'yes', '7, 2', '/', '<span class="c-g">"3"</span>'], ['7 / 0', 'yes', '7, 0', '/', '<span class="c-r">"divide by zero"</span>'], ['seven + 1', 'yes', 'parse fails', '—', '<span class="c-r">"bad number"</span>'], ['7 x', 'no', '—', '—', '<span class="c-r">"usage: ..."</span>']] },
        complexity: R`<p>O(L) time where L is the total length of the arguments (parsing), O(1) extra space.</p>`,
        followUps: ['Support decimals with <code>BigDecimal</code> — how do you avoid 0.1 + 0.2 problems?', 'Detect overflow in <code>a x b</code> using <code>Math.multiplyExact</code>.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 4 — Primitive types, ranges, literals & defaults
     ====================================================================== */
  topics.push({
    title: 'Primitive Types, Ranges, Literals & Defaults',
    analogy: R`<p>Primitive types are <b>boxes of fixed size</b> in a moving van. A <code>byte</code> is a shoebox, a <code>short</code> a small carton, an <code>int</code> a suitcase, a <code>long</code> a wardrobe box. A bigger box holds bigger numbers but costs more space. You must pick the box <i>before</i> packing — and if you squeeze a sofa (300) into a shoebox (<code>byte</code>, max 127), something gets cut off. <code>float</code> and <code>double</code> are different: they are like a <b>ruler with marks</b>; values between marks get rounded to the nearest mark.</p>`,
    explain: R`<h4>The eight primitive types</h4>
<p>Java has exactly <b>8 primitive types</b>. Everything else (String, arrays, your classes) is a <b>reference type</b>. Their sizes are fixed by the language spec — the same on every OS — unlike C, where <code>int</code> size depends on the platform.</p>
${H.table(['Type', 'Bits', 'Range', 'Field default', 'Literal example'], [
  ['<code>byte</code>', '8', '−128 … 127', '0', '<code>byte b = 100;</code>'],
  ['<code>short</code>', '16', '−32,768 … 32,767', '0', '<code>short s = 30_000;</code>'],
  ['<code>char</code>', '16', '0 … 65,535 (unsigned!)', "'\\u0000'", "<code>char c = 'A';</code>"],
  ['<code>int</code>', '32', '−2,147,483,648 … 2,147,483,647 (≈ ±2.1 × 10<sup>9</sup>)', '0', '<code>int n = 1_000_000;</code>'],
  ['<code>long</code>', '64', '≈ ±9.22 × 10<sup>18</sup>', '0L', '<code>long big = 10_000_000_000L;</code>'],
  ['<code>float</code>', '32', '≈ ±3.4 × 10<sup>38</sup>, ~7 significant digits', '0.0f', '<code>float f = 3.14f;</code>'],
  ['<code>double</code>', '64', '≈ ±1.8 × 10<sup>308</sup>, ~15–16 significant digits', '0.0', '<code>double d = 3.14;</code>'],
  ['<code>boolean</code>', 'not specified', '<code>true</code> / <code>false</code> only (no 0/1!)', 'false', '<code>boolean ok = true;</code>']
])}
<h4>Why the ranges look like that</h4>
<p>n bits give 2<sup>n</sup> different patterns. Signed integer types split them half negative, half non-negative (zero counts as non-negative), so the range is <b>−2<sup>n−1</sup> … 2<sup>n−1</sup> − 1</b>. For a byte: 2<sup>8</sup> = 256 patterns → −128 … 127. That is why the negative side is one bigger. <code>char</code> uses all 16 bits for non-negative values: 0 … 65,535.</p>
${H.bits(127, 8, { label: 'byte 127 (largest)', hl: { 7: 'y' } })}${H.bits(-128, 8, { label: 'byte −128 (smallest)', hl: { 7: 'r' } })}
<h4>Literals — how you write values</h4>
<ul><li>A whole number like <code>42</code> is an <b>int</b>. Add <code>L</code> for long: <code>42L</code>. <code>long x = 3000000000;</code> is a <span class="c-r">compile error</span> ("integer number too large") because the literal itself is an int.</li>
<li>A decimal like <code>3.14</code> is a <b>double</b>. <code>float f = 3.14;</code> is a <span class="c-r">compile error</span>; write <code>3.14f</code>.</li>
<li>Underscores for readability: <code>1_000_000</code>. Hex <code>0xFF</code> = 255, binary <code>0b1010</code> = 10, and the trap: <b>a leading 0 means octal</b>, so <code>010</code> = 8.</li>
<li>Get the limits from wrapper classes: <code>Integer.MAX_VALUE</code>, <code>Long.MIN_VALUE</code>, <code>Byte.MAX_VALUE</code>.</li></ul>
<h4>Defaults: fields yes, locals no</h4>
<p>Fields (and array elements) get default values automatically: 0, 0.0, <code>false</code>, <code>'\u0000'</code>, <code>null</code>. <b>Local variables do not</b> — reading one before assigning is a compile error: <i>"variable x might not have been initialized"</i>.</p>
<h4>Which one should I use?</h4>
<p><code>int</code> for counts and indexes, <code>long</code> for sums, timestamps (<code>System.currentTimeMillis()</code>) and anything that can pass 2 billion, <code>double</code> for measurements, <code>boolean</code> for flags. <code>byte</code> mostly for raw binary data (files, network). <b>Never</b> use <code>float</code>/<code>double</code> for money — use <code>long</code> cents or <code>BigDecimal</code>.</p>`,
    clues: [
      '"How many primitive types does Java have?" → 8: byte, short, char, int, long, float, double, boolean',
      '"Values up to 10<sup>18</sup>" / "sum of N ≤ 10<sup>5</sup> values each ≤ 10<sup>9</sup>" → total up to 10<sup>14</sup> → needs long',
      '"Why is byte range −128 to 127?" → 8 bits, two\'s complement, 256 patterns, one extra negative',
      '"0.1 + 0.2 != 0.3" / "currency" → binary floating point cannot store 0.1 exactly; use BigDecimal or long cents',
      '"variable might not have been initialized" → locals have no default values, fields do',
      '"Is Java\'s int size platform-dependent?" → no, fixed at 32 bits by the spec'
    ],
    code: [R`
public class Ranges {
    public static void main(String[] args) {
        System.out.println("byte   " + Byte.MIN_VALUE + " .. " + Byte.MAX_VALUE);       // -128 .. 127
        System.out.println("short  " + Short.MIN_VALUE + " .. " + Short.MAX_VALUE);     // -32768 .. 32767
        System.out.println("char   " + (int) Character.MIN_VALUE + " .. " + (int) Character.MAX_VALUE); // 0 .. 65535
        System.out.println("int    " + Integer.MIN_VALUE + " .. " + Integer.MAX_VALUE);
        System.out.println("long   " + Long.MIN_VALUE + " .. " + Long.MAX_VALUE);
        System.out.println("float  max " + Float.MAX_VALUE + ", smallest positive " + Float.MIN_VALUE);
        System.out.println("double max " + Double.MAX_VALUE);

        // Literals
        int hex = 0xFF, bin = 0b1010, oct = 010, million = 1_000_000;
        long big = 10_000_000_000L;          // L is required: the literal is bigger than int
        float f = 3.14f;                     // f is required: 3.14 alone is a double
        System.out.println(hex + " " + bin + " " + oct + " " + million + " " + big + " " + f);
        // 255 10 8 1000000 10000000000 3.14

        // Floating point is approximate
        System.out.println(0.1 + 0.2);       // 0.30000000000000004
        System.out.println(0.1f + 0.2f);     // 0.3 (float rounds to fewer digits when printed)
    }
}`, R`
// Fields get defaults; locals do not.
public class Defaults {
    static int count;          // 0
    static double ratio;       // 0.0
    static boolean ready;      // false
    static char letter;        // the NUL character, code 0 (invisible when printed)
    static String name;        // null (a reference type)

    public static void main(String[] args) {
        System.out.println(count + " " + ratio + " " + ready + " " + (int) letter + " " + name);
        // 0 0.0 false 0 null
        int local;
        // System.out.println(local);   // compile error: variable local might not have been initialized
        local = 7;
        System.out.println(local);       // fine now
        var inferred = 10L;              // var (Java 10+) infers long from the literal
        System.out.println(((Object) inferred).getClass().getSimpleName()); // Long (boxed for printing)
    }
}`],
    codeTitle: ['Ranges, literals and floating-point surprises', 'Default values and var'],
    viz: [{
      title: 'Which primitive boxes can hold this number?',
      input: '300',
      inputLabel: 'A number (try 127, 40000, -1, 3000000000, 16777217, 0.1)',
      gen: function (input) {
        var s = String(input).trim();
        var frames = [];
        if (/^-?\d+\.\d+$/.test(s)) {
          var x = Number(s), fx = Math.fround(x);
          frames.push({ narr: '<b>' + s + '</b> has a fractional part, so only <code>float</code> and <code>double</code> can hold it. Whole-number types would need a cast that chops off the decimals.', parts: [{ type: 'table', label: 'Integer types', columns: ['type', 'can hold ' + s + '?'], rows: [['byte', 'no'], ['short', 'no'], ['char', 'no'], ['int', 'no'], ['long', 'no']], hl: { 0: 'bad', 1: 'bad', 2: 'bad', 3: 'bad', 4: 'bad' } }] });
          frames.push({ narr: '<code>double</code> stores the nearest value it can with 53 binary digits. Printed with 20 digits it is <b>' + x.toPrecision(20) + '</b>. Java\'s <code>println</code> prints the shortest text that maps back to the same double, so you usually see <b>' + String(x) + '</b>.', parts: [{ type: 'vars', label: 'double', vals: { 'you wrote': s, 'actually stored': x.toPrecision(20) }, hl: { 'actually stored': x.toPrecision(20) === Number(s).toFixed(18) ? 'ok' : 'cur' } }] });
          frames.push({ narr: '<code>float</code> keeps only 24 binary digits (~7 decimal). Stored value: <b>' + fx.toPrecision(20) + '</b>. ' + (fx === x ? 'Exactly the same as the double here.' : 'Different from the double — that is why <code>' + s + 'f == ' + s + '</code> is <b>false</b> in Java.'), parts: [{ type: 'vars', label: 'float', vals: { 'you wrote': s + 'f', 'actually stored': fx.toPrecision(20) }, hl: { 'actually stored': fx === x ? 'ok' : 'bad' } }] });
          frames.push({ narr: 'Lesson: binary floating point cannot store most decimal fractions exactly (just like 1/3 in decimal is 0.333…). Fine for physics and graphics, <b>wrong for money</b>.', parts: [{ type: 'table', label: 'Decimal fractions in binary', columns: ['value', 'exact in double?'], rows: [['0.5', 'yes (1/2)'], ['0.25', 'yes (1/4)'], ['0.1', 'no'], [s, x.toPrecision(20).replace(/0+$/, '') === s.replace(/0+$/, '') ? 'yes' : 'no']], hl: { 3: 'sel' } }] });
          return frames;
        }
        if (!/^-?\d{1,30}$/.test(s)) throw new Error('Enter a whole number (up to 30 digits) or a decimal like 0.1');
        var n = BigInt(s);
        var types = [
          { t: 'byte', w: 8, lo: -128n, hi: 127n, signed: true },
          { t: 'short', w: 16, lo: -32768n, hi: 32767n, signed: true },
          { t: 'char', w: 16, lo: 0n, hi: 65535n, signed: false },
          { t: 'int', w: 32, lo: -2147483648n, hi: 2147483647n, signed: true },
          { t: 'long', w: 64, lo: -9223372036854775808n, hi: 9223372036854775807n, signed: true }
        ];
        var rows = [];
        frames.push({ narr: 'Let us try to pack <b>' + s + '</b> into each primitive box, smallest first. A box of n bits has 2<sup>n</sup> patterns.', parts: [{ type: 'bars', label: 'bits per type', values: [8, 16, 16, 32, 64, 32, 64], idxLabels: ['byte', 'short', 'char', 'int', 'long', 'float', 'double'] }] });
        types.forEach(function (ty) {
          var fits = n >= ty.lo && n <= ty.hi;
          var stored = ty.signed ? BigInt.asIntN(ty.w, n) : BigInt.asUintN(ty.w, n);
          rows.push([ty.t, ty.lo + ' … ' + ty.hi, fits ? 'yes' : 'no', fits ? String(n) : 'cast gives ' + stored]);
          var parts = [];
          if (ty.w <= 32) parts.push({ type: 'bits', label: ty.t + ' (' + ty.w + ' bits) — what a cast would store', value: Number(stored), width: ty.w, dec: String(stored), hl: ty.signed ? (function () { var o = {}; o[ty.w - 1] = 'sel'; return o; })() : {} });
          else parts.push({ type: 'text', label: 'long (64 bits)', html: 'stored value: <b>' + stored + '</b>' });
          parts.push({ type: 'table', label: 'Results so far', columns: ['type', 'range', 'fits?', 'value'], rows: rows.map(function (r) { return r.slice(); }), hl: (function () { var o = {}; o[rows.length - 1] = fits ? 'ok' : 'bad'; return o; })() });
          frames.push({ narr: '<code>' + ty.t + '</code>: range ' + ty.lo + ' … ' + ty.hi + '. ' + (fits ? '<span class="c-g">Fits!</span> Assigning it is safe' + (ty.t === 'long' ? ' (remember the <code>L</code> suffix if it is beyond int).' : '.') : '<span class="c-r">Does not fit.</span> <code>' + ty.t + ' v = ' + s + ';</code> is a compile error; forcing it with <code>(' + ty.t + ')</code> keeps only the low ' + ty.w + ' bits → <b>' + stored + '</b>.') + (ty.signed ? ' The purple bit is the <b>sign bit</b>.' : ' char has no sign bit — all 16 bits are value.'), parts: parts });
        });
        var num = Number(n), fl = Math.fround(num);
        var dExact = Number.isFinite(num) && BigInt(num) === n;
        var fExact = Number.isFinite(fl) && dExact && fl === num;
        rows.push(['float', '±3.4e38, 24-bit mantissa', fExact ? 'exact' : 'rounded', Number.isFinite(fl) ? String(BigInt(fl)) : 'Infinity']);
        rows.push(['double', '±1.8e308, 53-bit mantissa', dExact ? 'exact' : 'rounded', String(BigInt(num))]);
        frames.push({ narr: '<code>float</code>/<code>double</code> can hold huge magnitudes but only a limited number of significant binary digits. Whole numbers are exact in float only up to 2<sup>24</sup> = 16,777,216 and in double up to 2<sup>53</sup> ≈ 9 × 10<sup>15</sup>. Here: float is <b>' + (fExact ? 'exact' : 'rounded') + '</b>, double is <b>' + (dExact ? 'exact' : 'rounded') + '</b>.', parts: [{ type: 'table', label: 'Results', columns: ['type', 'range', 'fits?', 'value'], rows: rows.map(function (r) { return r.slice(); }), hl: { 5: fExact ? 'ok' : 'bad', 6: dExact ? 'ok' : 'bad' } }] });
        var best = null;
        for (var i = 0; i < types.length; i++) if (n >= types[i].lo && n <= types[i].hi && types[i].t !== 'char') { best = types[i].t; break; }
        frames.push({ narr: best ? 'Smallest signed integer type that holds <b>' + s + '</b>: <code>' + best + '</code>. In everyday code you would still use <code>int</code> (or <code>long</code> if it may exceed ~2.1 billion) — tiny types only save memory in big arrays.' : '<b>' + s + '</b> is beyond even <code>long</code>! Use <code>java.math.BigInteger</code>, which grows as large as memory allows.', parts: [{ type: 'vars', label: 'Verdict', vals: { value: s, 'smallest type': best || 'BigInteger' }, hl: { 'smallest type': 'sel' } }] });
        return frames;
      }
    }, {
      title: 'Stack vs heap: copying a primitive vs copying a reference',
      input: '5',
      inputLabel: 'Starting value of a',
      gen: function (input) {
        var a = clampInt(input, -1000000, 1000000, 'Enter a whole number between -1000000 and 1000000');
        var code = 'int a = ' + a + ';\nint b = a;          // copies the VALUE\nb++;\nint[] p = {1, 2};   // object lives on the heap\nint[] q = p;        // copies the REFERENCE\nq[0] = 99;\nSystem.out.println(a + " " + b + " " + p[0]);';
        function C(l) { var h = {}; h[l] = 'cur'; return { type: 'code', label: 'main', lang: 'java', code: code, hl: h }; }
        var f = [];
        f.push({ narr: '<code>int a = ' + a + '</code>: the stack frame of <code>main</code> gets a slot named a holding the actual number. Primitives store the <b>value itself</b>.', parts: [C(1), { type: 'vars', label: 'Stack frame (main)', vals: { a: a }, hl: { a: 'ok' } }, { type: 'map', label: 'Heap', entries: [] }] });
        f.push({ narr: '<code>int b = a</code>: Java <b>copies the value</b> ' + a + ' into a new slot. a and b are now independent twins.', parts: [C(2), { type: 'vars', label: 'Stack frame (main)', vals: { a: a, b: a }, hl: { b: 'ok' } }, { type: 'map', label: 'Heap', entries: [] }] });
        f.push({ narr: '<code>b++</code> changes only b. a is untouched — <b>' + a + '</b>.', parts: [C(3), { type: 'vars', label: 'Stack frame (main)', vals: { a: a, b: a + 1 }, hl: { b: 'cur', a: 'done' } }, { type: 'map', label: 'Heap', entries: [] }] });
        f.push({ narr: '<code>int[] p = {1, 2}</code>: arrays are objects, created on the <b>heap</b> at some address (say <b>@A1</b>). The stack slot p stores only that address — a <b>reference</b>.', parts: [C(4), { type: 'vars', label: 'Stack frame (main)', vals: { a: a, b: a + 1, p: '→ @A1' }, hl: { p: 'ok' } }, { type: 'map', label: 'Heap', entries: [['@A1', 'int[] {1, 2}']], hl: { '@A1': 'ok' } }] });
        f.push({ narr: '<code>int[] q = p</code>: copies the <b>reference</b> (@A1), not the array. Now two names point at the <b>same</b> object.', parts: [C(5), { type: 'vars', label: 'Stack frame (main)', vals: { a: a, b: a + 1, p: '→ @A1', q: '→ @A1' }, hl: { p: 'win', q: 'win' } }, { type: 'map', label: 'Heap', entries: [['@A1', 'int[] {1, 2}']], hl: { '@A1': 'win' } }] });
        f.push({ narr: '<code>q[0] = 99</code> follows the reference to @A1 and changes the shared array. Anyone holding @A1 — including p — sees 99.', parts: [C(6), { type: 'vars', label: 'Stack frame (main)', vals: { a: a, b: a + 1, p: '→ @A1', q: '→ @A1' }, hl: { q: 'cur' } }, { type: 'map', label: 'Heap', entries: [['@A1', 'int[] {99, 2}']], hl: { '@A1': 'bad' } }] });
        f.push({ narr: 'Output: <b>' + a + ' ' + (a + 1) + ' 99</b>. Rule of thumb: assignment always copies <i>what is in the box</i>. For primitives that is the value; for objects it is the address. (This is also why Java is always "pass-by-value".)', parts: [C(7), { type: 'text', label: 'Console', html: '<b>' + a + ' ' + (a + 1) + ' 99</b>' }] });
        return f;
      }
    }],
    examples: [
      { title: 'Predict the output: literal traps', html: R`<p>Output: <code>8 255 10 1000000</code>. The <b>leading zero</b> makes <code>010</code> an octal literal (1·8 + 0 = 8). Many bugs came from zero-padding numbers like ZIP codes.</p>`, code: R`
int a = 010, b = 0xFF, c = 0b1010, d = 1_000_000;
System.out.println(a + " " + b + " " + c + " " + d);
// int e = 08;                 // compile error: 8 is not an octal digit
// long f = 3000000000;        // compile error: integer number too large
long g = 3000000000L;          // OK with L
// float h = 1.5;              // compile error: possible lossy conversion from double to float
float h = 1.5f;                // OK` },
      { title: 'Money: double vs long cents vs BigDecimal', html: R`<p>Adding 10 cents ten times should be exactly 1.00. With <code>double</code> it is <code>0.9999999999999999</code>. Fixes: count cents in a <code>long</code>, or use <code>BigDecimal</code> built from a <b>String</b>.</p>${H.table(['Approach', 'Result'], [['double', H.c('r', '0.9999999999999999')], ['long cents', H.c('g', '100 cents')], ['BigDecimal("0.10")', H.c('g', '1.00')]])}`, code: R`
double d = 0;
for (int i = 0; i < 10; i++) d += 0.10;
System.out.println(d);                       // 0.9999999999999999

long cents = 0;
for (int i = 0; i < 10; i++) cents += 10;
System.out.println(cents + " cents");        // 100 cents

java.math.BigDecimal sum = java.math.BigDecimal.ZERO;
for (int i = 0; i < 10; i++) sum = sum.add(new java.math.BigDecimal("0.10"));
System.out.println(sum);                     // 1.00` },
      { title: 'Choosing types from constraints', html: R`${H.table(['Constraint in the question', 'Max value', 'Type'], [['N ≤ 10<sup>5</sup> (count)', '10<sup>5</sup>', 'int'], ['sum of N ≤ 10<sup>5</sup> values, each ≤ 10<sup>9</sup>', '10<sup>14</sup>', H.c('y', 'long')], ['product of two values ≤ 10<sup>9</sup>', '10<sup>18</sup>', H.c('y', 'long') + ' (just fits: max ≈ 9.2 × 10<sup>18</sup>)'], ['factorial of 25', '≈ 1.5 × 10<sup>25</sup>', H.c('r', 'BigInteger')], ['answer mod 10<sup>9</sup>+7', '&lt; 2<sup>30</sup>', 'int result, long intermediate']])}<p>Habit: before coding, estimate the biggest value every variable can reach.</p>` },
      { title: 'boolean is not a number', html: R`<p>Unlike C, Java will not convert between <code>boolean</code> and numbers. <code>if (1)</code> and <code>int x = true;</code> are compile errors. Convert explicitly: <code>int bit = flag ? 1 : 0;</code> and <code>boolean flag = (bit != 0);</code>.</p>`, code: R`
boolean flag = true;
int bit = flag ? 1 : 0;          // explicit conversion
boolean back = bit != 0;
System.out.println(bit + " " + back);   // 1 true` }
    ],
    deepDive: R`<h4>Two's complement in one picture</h4>
<p>For an n-bit signed type, the top bit has weight <b>−2<sup>n−1</sup></b> instead of +2<sup>n−1</sup>. For a byte: <code>1000 0001</code> = −128 + 1 = −127. To negate: flip all bits and add 1 (<code>-x == ~x + 1</code>). The beauty: the CPU's adder works the same for signed and unsigned numbers, and there is only one zero.</p>
<h4>IEEE 754 floating point</h4>
${H.table(['', 'sign', 'exponent', 'fraction (mantissa)', 'decimal precision'], [['float', '1', '8', '23 (+1 hidden)', '~7 digits'], ['double', '1', '11', '52 (+1 hidden)', '~15–17 digits']])}
<p>Value = (−1)<sup>sign</sup> × 1.fraction × 2<sup>exponent − bias</sup>. The gap between neighbouring doubles (<code>Math.ulp(x)</code>) grows with x: above 2<sup>53</sup> consecutive doubles differ by 2, so <code>(double) Long.MAX_VALUE</code> is rounded. Special values: <code>+Infinity</code>, <code>−Infinity</code>, <code>NaN</code> (not equal even to itself), <code>−0.0</code> (equal to 0.0 with <code>==</code>, different in <code>Double.compare</code> and <code>1/x</code>), and tiny <b>subnormals</b> down to <code>Double.MIN_VALUE</code> ≈ 4.9 × 10<sup>−324</sup> (careful: MIN_VALUE is the smallest <i>positive</i> double, not the most negative). Since Java 17 all floating-point maths is strict IEEE (the old <code>strictfp</code> keyword is now redundant), so results are identical on every platform.</p>
<h4>How the JVM actually stores them</h4>
<ul><li>On the operand stack and in local slots, <code>byte</code>, <code>short</code>, <code>char</code> and <code>boolean</code> are all widened to a 32-bit <code>int</code> slot. <code>long</code>/<code>double</code> take two slots. So a local <code>byte</code> saves no memory.</li>
<li>In <b>arrays and fields</b> sizes are real: <code>byte[1_000_000]</code> ≈ 1 MB, <code>int[1_000_000]</code> ≈ 4 MB, <code>boolean[]</code> uses 1 byte per element in HotSpot (use <code>BitSet</code> for 1 bit).</li>
<li>A boxed <code>Integer</code> costs ~16 bytes plus a 4–8 byte reference, versus 4 bytes for <code>int</code> — the reason <code>int[]</code> beats <code>List&lt;Integer&gt;</code> for big data. Project Valhalla (value classes) is the long-running effort to give user-defined types the same flat, header-free layout.</li>
<li>Writes to <code>long</code>/<code>double</code> fields are not guaranteed atomic on all JVMs unless the field is <code>volatile</code> (JLS 17.7) — a classic concurrency trivia point.</li></ul>`,
    aiEra: R`<p><b>What AI changes:</b> assistants instantly tell you "use long here" or "use BigDecimal for money" and can scan a codebase for <code>double price</code> fields. Copilots auto-complete the <code>L</code> and <code>f</code> suffixes.</p>
<p><b>Use AI as a partner:</b> <code>Given these constraints (N ≤ 2·10^5, values ≤ 10^9), list every variable that needs long and why</code>. <code>Find all places where money is stored as float/double in this module</code>. Ask for property-based tests with extreme values (MIN, MAX, 0, −1).</p>
<p><b>Where AI goes wrong:</b> it often writes <code>int sum</code> for sums of large arrays, uses <code>new BigDecimal(0.1)</code> (built from an already-wrong double — use the String constructor or <code>BigDecimal.valueOf</code>), compares doubles with <code>==</code>, or claims <code>boolean</code> is 1 bit. It may also invent ranges (e.g. char signed) — double-check against <code>Character.MAX_VALUE</code>.</p>
<p><b>What you must still own:</b> estimating value ranges from constraints in your head, knowing the 8 types and their sizes cold, and explaining why 0.1 + 0.2 ≠ 0.3 — classic first-round interview material.</p>`,
    problems: [{
      title: 'Smallest Integer Type That Fits',
      level: 'Easy', tags: ['primitives', 'ranges', 'BigInteger'], companies: ['Amazon', 'Wipro', 'Cognizant'],
      statement: R`<p>Given a whole number as a <code>String</code> (it may be very large or negative), return the name of the <b>smallest</b> signed Java integer type that can hold it: <code>"byte"</code>, <code>"short"</code>, <code>"int"</code>, <code>"long"</code>, or <code>"BigInteger"</code> if even long is too small.</p>`,
      constraints: R`The string matches <code>-?[0-9]+</code> with at most 100 digits (no leading <code>+</code>).`,
      example: R`${H.table(['input', 'output', 'why'], [['"127"', 'byte', 'byte max is 127'], ['"128"', 'short', 'one past byte max'], ['"-32769"', 'int', 'one below short min'], ['"9223372036854775808"', H.c('y', 'BigInteger'), 'Long.MAX_VALUE + 1']])}`,
      brute: { why: R`<p>Try <code>Byte.parseByte</code>, catch <code>NumberFormatException</code>, then try <code>Short.parseShort</code>, and so on. It works but uses exceptions for normal control flow — slow (each exception captures a stack trace) and hard to read.</p>`, code: R`
static String smallestBrute(String s) {
    try { Byte.parseByte(s); return "byte"; } catch (NumberFormatException e) { }
    try { Short.parseShort(s); return "short"; } catch (NumberFormatException e) { }
    try { Integer.parseInt(s); return "int"; } catch (NumberFormatException e) { }
    try { Long.parseLong(s); return "long"; } catch (NumberFormatException e) { }
    return "BigInteger";
}` },
      mcq: { q: 'A value fits in an n-bit signed type exactly when <code>BigInteger.bitLength()</code> is…', options: ['≤ n', '≤ n − 1', '&lt; 2<sup>n</sup>', '≥ n'], answer: 1, explain: 'bitLength counts bits excluding the sign bit. One of the n bits is the sign, so the value needs ≤ n − 1 others. E.g. 127 has bitLength 7 → byte; 128 has 8 → not byte.' },
      hints: [R`<p>Hint 1: <code>new BigInteger(s)</code> can hold any size, so parse <b>once</b> into it.</p>`, R`<p>Hint 2: <code>bitLength()</code> returns the minimal number of bits for the two's complement form, <b>excluding the sign bit</b>. −128 has bitLength 7, 128 has bitLength 8.</p>`, R`<p>Hint 3: compare bitLength against 7, 15, 31, 63 in increasing order. Recipe: b = bitLength; b ≤ 7 → byte; ≤ 15 → short; ≤ 31 → int; ≤ 63 → long; else BigInteger.</p>`],
      solution: {
        approach: R`<p>One parse into <code>BigInteger</code>, then compare <code>bitLength()</code> with type width − 1. No exceptions, works for any length.</p>`,
        code: R`
import java.math.BigInteger;

public class SmallestType {
    static String smallest(String s) {
        int bits = new BigInteger(s).bitLength();   // bits needed, sign bit excluded
        if (bits <= 7)  return "byte";
        if (bits <= 15) return "short";
        if (bits <= 31) return "int";
        if (bits <= 63) return "long";
        return "BigInteger";
    }
    public static void main(String[] args) {
        for (String s : new String[]{"127", "128", "-128", "-129", "-32769", "2147483648", "9223372036854775808"})
            System.out.println(s + " -> " + smallest(s));
        // 127 -> byte, 128 -> short, -128 -> byte, -129 -> short,
        // -32769 -> int, 2147483648 -> long, 9223372036854775808 -> BigInteger
    }
}`,
        dry: { head: ['s', 'bitLength', 'first width with bits ≤ w−1', 'answer'], rows: [['"127"', '7', '8 (7 ≤ 7)', 'byte'], ['"128"', '8', '16 (8 ≤ 15)', 'short'], ['"-128"', '7', '8', 'byte'], ['"2147483648"', '32', '64 (32 ≤ 63)', 'long'], ['"9223372036854775808"', '64', 'none', '<span class="c-y">BigInteger</span>']] },
        complexity: R`<p>O(D) for D digits (parsing; BigInteger parsing of very long strings is a bit worse than linear but D ≤ 100 here), O(D) space.</p>`,
        followUps: ['Also report whether it fits in <code>char</code> (0..65535).', 'Do it without BigInteger by comparing digit strings with the limits.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 5 — Type casting: widening, narrowing, promotion
     ====================================================================== */
  topics.push({
    title: 'Type Casting: Widening, Narrowing & Numeric Promotion',
    analogy: R`<p>Pouring water between glasses. Pouring a <b>small glass into a big jug</b> (byte → int) is always safe — Java does it for you silently. That is <b>widening</b>. Pouring a <b>big jug into a small glass</b> (int → byte) may spill, so Java makes you say "I know, pour anyway" with a <b>cast</b>: <code>(byte) jug</code>. Whatever does not fit simply spills on the floor — it is <b>not</b> rounded or clamped, the top part is just gone. That is <b>narrowing</b>.</p>`,
    explain: R`<h4>1. Widening — automatic and (mostly) safe</h4>
<p>Java converts a smaller type into a bigger one automatically:</p>
<p><b>byte → short → int → long → float → double</b>, and <b>char → int</b> (and onward).</p>
${H.table(['Code', 'What happens'], [['<code>int i = 100; long l = i;</code>', 'fine, value kept'], ['<code>long l = 5; double d = l;</code>', 'fine, d = 5.0'], ["<code>int code = 'A';</code>", 'fine, code = 65'], ['<code>float f = 16_777_217;</code>', H.c('y', 'compiles, but f = 1.6777216E7 — precision lost!')]])}
<p>The last row surprises people: int → float and long → float/double are called widening, but floats have only ~7 significant digits, so big integers get <b>rounded</b>.</p>
<h4>2. Narrowing — you must cast, and bits get chopped</h4>
${H.table(['Cast', 'Result', 'Why'], [
  ['<code>(int) 3.99</code>', '3', 'decimal part dropped (toward zero)'],
  ['<code>(int) -3.99</code>', '-3', 'toward zero, not down'],
  ['<code>(byte) 300</code>', H.c('r', '44'), '300 = 1_0010_1100; keep the low 8 bits 0010_1100 = 44'],
  ['<code>(byte) 200</code>', H.c('r', '-56'), 'low 8 bits 1100_1000; top bit is the sign → 200 − 256'],
  ['<code>(char) 65</code>', "'A'", 'char is just a 16-bit number'],
  ['<code>(int) 1e20</code>', 'Integer.MAX_VALUE', 'double → int <b>saturates</b> at the limits'],
  ['<code>(int) Double.NaN</code>', '0', 'special rule'],
  ['<code>(byte) 300.7</code>', '44', 'double → int (300) first, then int → byte']
])}
<h4>3. Numeric promotion — the rule that causes most compile errors</h4>
<p>Before doing <code>+ - * / %</code> (and comparisons, bitwise ops), Java promotes both operands:</p>
<ol><li>If either is <code>double</code> → both become double.</li><li>Else if either is <code>float</code> → float.</li><li>Else if either is <code>long</code> → long.</li><li>Else → <b>both become int</b> — even <code>byte + byte</code>!</li></ol>
<p>So <code>byte a = 1, b = 2; byte c = a + b;</code> is a <span class="c-r">compile error</span> (<i>possible lossy conversion from int to byte</i>). Fix: <code>byte c = (byte) (a + b);</code>.</p>
<h4>4. The two "secret casts"</h4>
<ul><li><b>Compound assignment</b> <code>+=, -=, *=, ...</code> hides a cast: <code>b += 1</code> means <code>b = (byte)(b + 1)</code>. So <code>int m = 10; m += 3.7;</code> compiles and gives <b>13</b>.</li>
<li><b>Compile-time constants</b> may narrow silently if they fit: <code>byte b = 10;</code> and <code>char c = 65;</code> are fine because 10 and 65 are constants in range. <code>final int k = 10; byte x = k;</code> also works; without <code>final</code> it does not.</li></ul>
<h4>5. Things you cannot cast</h4>
<p><code>boolean</code> ↔ numbers: never. <code>String</code> ↔ numbers: not by casting — use <code>Integer.parseInt("42")</code> and <code>String.valueOf(42)</code>.</p>`,
    clues: [
      '"possible lossy conversion from int to byte" → numeric promotion made it int; cast or use compound assignment',
      '"Why does b += 1 compile but b = b + 1 doesn\'t?" → compound assignment contains an implicit cast',
      '"(byte) 200 prints −56" → narrowing keeps low bits, top bit becomes the sign',
      '"Round to nearest" vs "cast" → <code>(int)</code> truncates toward zero; use Math.round / floor / ceil',
      '"Convert a large long timestamp to float" → widening can still lose precision (24-bit mantissa)',
      '"Ternary returns a different type than expected" → both branches go through numeric promotion'
    ],
    code: [R`
public class Casting {
    public static void main(String[] args) {
        // Widening: automatic
        byte small = 42;
        int  i = small;          // 42
        long l = i;              // 42
        double d = l;            // 42.0
        System.out.println(i + " " + l + " " + d);

        // Narrowing: explicit cast, bits are chopped
        System.out.println((byte) 300);      // 44
        System.out.println((byte) 200);      // -56
        System.out.println((short) 70000);   // 4464
        System.out.println((int) 3.99);      // 3
        System.out.println((int) -3.99);     // -3  (toward zero)
        System.out.println((int) 1e20);      // 2147483647 (saturates)
        System.out.println((char) 65);       // A

        // Promotion: byte + byte is int
        byte a = 10, b = 20;
        // byte c = a + b;                   // compile error: possible lossy conversion
        byte c = (byte) (a + b);             // OK: 30
        a += 5;                              // OK: hidden cast, a = 15
        System.out.println(c + " " + a);

        // Rounding is not casting
        System.out.println(Math.round(2.5) + " " + Math.round(-2.5) + " " + Math.floor(-2.5) + " " + Math.ceil(2.1));
        // 3 -2 -3.0 3.0   (Math.round = floor(x + 0.5))
    }
}`, R`
// Safe conversions that throw instead of silently corrupting data
public class SafeCasts {
    public static void main(String[] args) {
        long fits = 123L, tooBig = 3_000_000_000L;
        System.out.println(Math.toIntExact(fits));          // 123
        try {
            System.out.println(Math.toIntExact(tooBig));    // throws
        } catch (ArithmeticException e) {
            System.out.println("refused: " + e.getMessage()); // integer overflow
        }
        byte raw = (byte) 0xF0;                             // a byte read from a file: -16
        System.out.println(raw + " vs unsigned " + Byte.toUnsignedInt(raw)); // -16 vs unsigned 240
        System.out.println(Integer.parseInt("-42") + 1);    // String -> int: -41
        System.out.println(String.valueOf(42) + 1);         // int -> String: 421
    }
}`],
    codeTitle: ['Widening, narrowing, promotion and rounding', 'Safe, checked conversions'],
    viz: [{
      title: 'Narrowing cast: what (byte), (short) and (char) really keep',
      input: '300',
      inputLabel: 'An int value (try 200, 128, -1, 65601, 70000)',
      gen: function (input) {
        var x = clampInt(input, -2147483648, 2147483647, 'Enter a whole number in int range (-2147483648 … 2147483647)');
        var low8 = x & 0xFF, b = (x << 24) >> 24, s = (x << 16) >> 16, ch = x & 0xFFFF;
        var f = [];
        var hiAll = {}; for (var i = 0; i < 32; i++) hiAll[i] = i < 8 ? 'cur' : 'done';
        f.push({ narr: 'The int <b>' + x + '</b> occupies 32 bits (' + hex(x, 8) + '). A cast to <code>byte</code> will keep only the <b>lowest 8 bits</b> (amber). The other 24 are thrown away — no rounding, no clamping.', parts: [{ type: 'bits', label: 'int ' + x + ' (32 bits)', value: x, width: 32, hl: hiAll }] });
        var h8 = {}; h8[7] = 'sel';
        f.push({ narr: 'Low 8 bits as an unsigned number: <b>' + low8 + '</b>. But <code>byte</code> is signed: bit 7 (purple) is the <b>sign bit</b> worth −128 instead of +128. Here it is <b>' + ((low8 >> 7) & 1) + '</b>.', parts: [{ type: 'bits', label: 'kept bits', value: low8, width: 8, hl: h8, dec: low8 + ' if read as unsigned' }] });
        f.push({ narr: ((low8 >> 7) & 1) ? 'Sign bit is 1 → value = ' + low8 + ' − 256 = <b>' + b + '</b>. So <code>(byte) ' + x + '</code> is <b>' + b + '</b>.' : 'Sign bit is 0 → value = <b>' + b + '</b>. So <code>(byte) ' + x + '</code> is <b>' + b + '</b>.', parts: [{ type: 'bits', label: '(byte) ' + x, value: b, width: 8, hl: h8, dec: b }, { type: 'code', label: 'Java', lang: 'java', code: 'byte r = (byte) ' + x + ';\nSystem.out.println(r);   // ' + b, hl: { 2: 'ok' } }] });
        var h16 = {}; for (i = 0; i < 16; i++) h16[i] = 'cur'; h16[15] = 'sel';
        f.push({ narr: '<code>(short)</code> keeps the low <b>16</b> bits, again with a sign bit (bit 15): result <b>' + s + '</b>.', parts: [{ type: 'bits', label: '(short) ' + x, value: s, width: 16, hl: h16, dec: s }] });
        var hc16 = {}; for (i = 0; i < 16; i++) hc16[i] = 'ok';
        f.push({ narr: '<code>(char)</code> also keeps 16 bits but char is <b>unsigned</b>: no sign bit, so the result is <b>' + ch + '</b>' + (ch >= 32 && ch < 127 ? ' which prints as \'' + H.esc(String.fromCharCode(ch)) + '\'' : '') + '. Same bits as short, different meaning!', parts: [{ type: 'bits', label: '(char) ' + x + ' as a number', value: ch, width: 16, hl: hc16, dec: ch }] });
        var hs = {}; for (i = 8; i < 32; i++) hs[i] = 'sel'; for (i = 0; i < 8; i++) hs[i] = 'ok';
        f.push({ narr: 'Going back up: <code>int back = r;</code> (byte → int, widening). Java copies the sign bit into all 24 new top bits (<b>sign extension</b>, purple), so the value stays <b>' + b + '</b>. The original ' + x + ' is lost forever' + (b === x ? ' — except here it fit, so nothing was lost.' : '.'), parts: [{ type: 'bits', label: 'int back = (byte) ' + x, value: b, width: 32, hl: hs, dec: b }] });
        var u = b & 0xFF;
        f.push({ narr: 'Need the byte as 0..255 (e.g. reading a file)? Mask it: <code>r &amp; 0xFF</code> = <b>' + u + '</b> (or <code>Byte.toUnsignedInt(r)</code>). The mask clears the sign-extended bits.', parts: [{ type: 'bits', label: 'r & 0xFF', value: u, width: 32, hl: (function () { var o = {}; for (var k = 0; k < 8; k++) o[k] = 'ok'; return o; })(), dec: u }] });
        f.push({ narr: 'Summary for <b>' + x + '</b>. Narrowing = "keep the low bits, reinterpret". If the value fit in the target range, nothing changes.', parts: [{ type: 'table', label: 'Casts of ' + x, columns: ['expression', 'result', 'value preserved?'], rows: [['(byte) ' + x, String(b), b === x ? 'yes' : 'no'], ['(short) ' + x, String(s), s === x ? 'yes' : 'no'], ['(char) ' + x, String(ch), ch === x ? 'yes' : 'no'], ['(long) ' + x, String(x), 'yes (widening)']], hl: { 0: b === x ? 'ok' : 'bad', 1: s === x ? 'ok' : 'bad', 2: ch === x ? 'ok' : 'bad', 3: 'ok' } }] });
        return f;
      }
    }, {
      title: 'Binary numeric promotion: what type is a op b?',
      input: 'byte + short',
      inputLabel: 'type op type (types: byte short char int long float double)',
      gen: function (input) {
        var m = String(input).trim().match(/^(\w+)\s*([+\-*\/%])\s*(\w+)$/);
        var T = ['byte', 'short', 'char', 'int', 'long', 'float', 'double'];
        if (!m || T.indexOf(m[1]) < 0 || T.indexOf(m[3]) < 0) throw new Error('Format: type op type, e.g. "byte + short" or "int * long"');
        var A = m[1], op = m[2], B = m[3];
        var nodes = [
          { id: 'byte', label: 'byte', x: 8, y: 12, shape: 'box' }, { id: 'short', label: 'short', x: 24, y: 12, shape: 'box' },
          { id: 'char', label: 'char', x: 24, y: 32, shape: 'box' }, { id: 'int', label: 'int', x: 42, y: 22, shape: 'box' },
          { id: 'long', label: 'long', x: 58, y: 22, shape: 'box' }, { id: 'float', label: 'float', x: 74, y: 22, shape: 'box' },
          { id: 'double', label: 'double', x: 91, y: 22, shape: 'box' }
        ];
        var edges = [['byte', 'short'], ['short', 'int'], ['char', 'int'], ['int', 'long'], ['long', 'float'], ['float', 'double']];
        function g(hl, tags) { return { type: 'graph', label: 'Widening ladder (arrows = automatic)', directed: true, height: 42, nodes: nodes, edges: edges, hl: hl, tags: tags || {} }; }
        var base = {}; base[A] = 'cur'; base[B] = 'cur';
        var tg = {}; tg[A] = 'a'; tg[B] = (A === B ? 'a, b' : 'b');
        var f = [];
        f.push({ narr: 'We compute <code>a ' + H.esc(op) + ' b</code> where a is <b>' + A + '</b> and b is <b>' + B + '</b>. Java first promotes both operands to a common type using four rules, checked in order.', parts: [g(base, tg)] });
        var res = null, rules = [['double', 'Is either operand double?'], ['float', 'Is either operand float?'], ['long', 'Is either operand long?']];
        for (var i = 0; i < rules.length && !res; i++) {
          var hit = A === rules[i][0] || B === rules[i][0];
          var hl = Object.assign({}, base); hl[rules[i][0]] = hit ? 'ok' : 'done';
          f.push({ narr: 'Rule ' + (i + 1) + ': ' + rules[i][1] + ' → <b>' + (hit ? 'yes' : 'no') + '</b>.' + (hit ? ' Both become <b>' + rules[i][0] + '</b>.' : ''), parts: [g(hl, tg)] });
          if (hit) res = rules[i][0];
        }
        if (!res) {
          res = 'int';
          var hl2 = Object.assign({}, base); hl2['int'] = 'sel';
          f.push({ narr: 'Rule 4: otherwise <b>both become int</b>. ' + (A !== 'int' && B !== 'int' ? 'Yes — even though neither operand was an int! The JVM has no byte/short/char arithmetic instructions; it only has int, long, float and double versions.' : ''), parts: [g(hl2, tg)] });
        }
        var fin = {}; fin[res] = 'sel';
        var ok = res === A;
        f.push({ narr: 'Result type: <b>' + res + '</b>. Assigning it back to a <b>' + A + '</b> variable ' + (ok ? 'is fine.' : 'is a <span class="c-r">compile error</span> (possible lossy conversion from ' + res + ' to ' + A + '). Fix with an explicit cast or a compound assignment.'), parts: [g(fin, (function () { var o = {}; o[res] = 'result'; return o; })()), { type: 'code', label: 'Does it compile?', lang: 'java', code: A + ' r1 = a ' + op + ' b;' + (ok ? '                // OK' : '                // ERROR') + '\n' + A + ' r2 = (' + A + ') (a ' + op + ' b);       // OK: explicit cast\n' + (res === A || ['byte', 'short', 'char', 'int', 'long', 'float', 'double'].indexOf(res) >= 0 ? A + ' r3 = a; r3 ' + op + '= b;       // OK: hidden cast in ' + op + '=' : ''), hl: { 1: ok ? 'ok' : 'bad', 2: 'ok', 3: 'ok' } }] });
        f.push({ narr: 'Cheat sheet: the result type of an arithmetic operator is never smaller than <b>int</b>, and it is the wider of the two operand types otherwise. Memorise the four rules: <b>double → float → long → int</b>.', parts: [{ type: 'table', label: 'Binary numeric promotion examples', columns: ['expression', 'result type'], rows: [['byte + byte', 'int'], ['char + char', 'int'], ['short * long', 'long'], ['int / float', 'float'], ['long + double', 'double'], [A + ' ' + op + ' ' + B, res]], hl: { 5: 'sel' } }] });
        return f;
      }
    }],
    examples: [
      { title: 'Predict the output: the ternary type trap (X88)', html: R`<p>Both branches of <code>?:</code> are promoted to one type. In the first, <code>0</code> is a constant that fits in char, so the type stays <b>char</b> → prints <code>X</code>. In the second, <code>i</code> is an int <i>variable</i>, so the result is <b>int</b> → prints <code>88</code> (the code of 'X'). Output: <code>X88</code>.</p>`, code: R`
char x = 'X';
int i = 0;
System.out.print(true ? x : 0);     // X
System.out.println(false ? i : x);  // 88` },
      { title: 'Predict the output: compound assignment hides a cast', html: R`<p><code>m += 3.7</code> is <code>m = (int)(m + 3.7)</code> = (int) 13.7 = 13. <code>sh *= 10000</code> is <code>(short)(100000)</code> = 100000 − 131072 = −31072. Output: <code>13 -31072</code>. No warning, no error — a silent bug factory.</p>`, code: R`
int m = 10;
m += 3.7;
short sh = 10;
sh *= 10000;
System.out.println(m + " " + sh);   // 13 -31072` },
      { title: 'Widening that loses precision', html: R`<p>16,777,217 = 2<sup>24</sup> + 1 needs 25 significant bits; float has 24. Output: <code>1.6777216E7 true</code>. The same thing happens with <code>long</code> timestamps in nanoseconds stored as <code>double</code> beyond 2<sup>53</sup>.</p>`, code: R`
int big = 16_777_217;
float f = big;                       // widening, no cast needed... but rounded
System.out.println(f + " " + (f == 16_777_216f));` },
      { title: 'Constant narrowing works only in assignments', html: R`<p><code>byte b = 10;</code> compiles because 10 is a constant that fits. But passing <code>10</code> to a method that takes a <code>byte</code> does <b>not</b> compile — method calls do not allow implicit narrowing. You must write <code>take((byte) 10)</code>.</p>`, code: R`
public class ConstNarrow {
    static void take(byte b) { System.out.println("got " + b); }
    public static void main(String[] args) {
        byte ok = 10;                 // allowed: constant fits
        final int k = 20;
        byte alsoOk = k;              // allowed: k is a compile-time constant
        // take(10);                  // compile error: int cannot be converted to byte
        take((byte) 10);              // fine
        System.out.println(ok + alsoOk);  // 30 (byte + byte -> int)
    }
}` }
    ],
    deepDive: R`<h4>The JLS conversion contexts</h4>
<p>Java decides what conversions are allowed by <b>context</b>: <i>assignment</i> (widening, plus constant narrowing for byte/short/char, plus boxing/unboxing), <i>method invocation</i> (widening and boxing, but <b>no</b> constant narrowing — so overload resolution stays predictable), <i>casting</i> (almost anything numeric), <i>string</i> (anything with <code>+ ""</code>), and <i>numeric promotion</i> (unary and binary). A famous boxing trap: <code>Long x = 10;</code> fails (int cannot box to Long), while <code>long y = 10;</code> and <code>Long z = 10L;</code> work.</p>
<h4>Exact narrowing rules</h4>
<ul><li>Integer → smaller integer: discard high bits (two's complement truncation). Cost: zero — the CPU just reads the low register part.</li>
<li>float/double → int or long: NaN → 0; otherwise round <b>toward zero</b>; values beyond the range <b>saturate</b> to MIN/MAX. x86's <code>cvttsd2si</code> returns 0x80000000 on overflow, so HotSpot adds a fix-up path to implement Java's saturation.</li>
<li>float/double → byte/short/char: first to <b>int</b> (rules above), then int → small type. Hence <code>(byte) 1e20</code> = <code>(byte) Integer.MAX_VALUE</code> = −1, and <code>(char) -1.5</code> = <code>(char) -1</code> = 65535.</li>
<li>double → float: rounds to nearest float; too large → Infinity.</li></ul>
<h4>Unsigned helpers (Java has no unsigned int)</h4>
<p><code>Byte.toUnsignedInt</code>, <code>Integer.toUnsignedLong</code>, <code>Integer.toUnsignedString</code>, <code>Integer.divideUnsigned</code>, <code>Integer.compareUnsigned</code>, <code>Long.parseUnsignedLong</code>. The mask idiom <code>b &amp; 0xFF</code> is everywhere in I/O, hashing and networking code.</p>
<h4>Production reality</h4>
<ul><li>Database IDs as <code>long</code> cast to <code>int</code> work for years, then silently wrap at 2<sup>31</sup>. Use <code>Math.toIntExact</code>.</li>
<li>JSON numbers above 2<sup>53</sup> lose precision when parsed into <code>double</code> (and in JavaScript clients!) — send big IDs as strings.</li>
<li>Static analysis (ErrorProne, SpotBugs, IntelliJ inspections) flags <i>narrowing compound assignment</i> and <i>int multiplication cast to long</i> — keep them enabled in CI.</li></ul>`,
    aiEra: R`<p><b>What AI changes:</b> when javac says <i>possible lossy conversion</i>, an assistant will instantly "fix" it — almost always by inserting a cast. That makes the error disappear and can hide a real bug.</p>
<p><b>Use AI as a partner:</b> ask <code>Is this cast safe for every input? Give me a value that breaks it</code> instead of <code>fix the compile error</code>. Ask it to replace raw casts with <code>Math.toIntExact</code> where overflow should be an error, and to list every compound assignment that narrows.</p>
<p><b>Where AI goes wrong:</b> claiming <code>(int) 2.7</code> rounds to 3, that <code>(int)</code> on a negative double floors (it truncates toward zero), that widening is always lossless (long → double is not), or that <code>(int) "42"</code> works. It also tends to sprinkle <code>(long)</code> casts in the wrong place: <code>(long) (a * b)</code> casts <i>after</i> the overflow already happened.</p>
<p><b>What you must still own:</b> predicting the result of any cast at the bit level, the four promotion rules, and the judgment of whether a narrowing should truncate, round, clamp, or throw.</p>`,
    problems: [{
      title: 'Simulate (byte) Without Casting',
      level: 'Medium', tags: ['casting', 'bit manipulation', 'two\'s complement'], companies: ['Qualcomm', 'Nvidia', 'Google'],
      statement: R`<p>Implement <code>static int toByte(int x)</code> that returns exactly what <code>(byte) x</code> would give, but <b>without</b> using any cast to byte, short or char. Only arithmetic and bitwise operators are allowed.</p>`,
      constraints: R`<code>Integer.MIN_VALUE ≤ x ≤ Integer.MAX_VALUE</code>.`,
      example: R`${H.table(['x', 'binary (low 8 bits)', 'toByte(x)'], [['300', '0010 1100', '44'], ['200', H.c('p', '1') + '100 1000', '-56'], ['-1', H.c('p', '1') + '111 1111', '-1'], ['-129', '0111 1111', '127']])}<p>The purple bit is the sign: if it is 1, subtract 256.</p>`,
      brute: { why: R`<p>Arithmetic with <code>%</code>: <code>r = x % 256</code>, fix negative remainders, then subtract 256 if r ≥ 128. It works but needs two fix-ups because Java's <code>%</code> keeps the sign of the left operand — easy to get wrong for negative x.</p>`, code: R`
static int toByteBrute(int x) {
    int r = x % 256;            // -255 .. 255
    if (r < 0) r += 256;        // 0 .. 255
    if (r >= 128) r -= 256;     // -128 .. 127
    return r;
}` },
      mcq: { q: 'What does <code>(x &lt;&lt; 24) &gt;&gt; 24</code> do?', options: ['Always returns 0', 'Moves the low byte to the top, then arithmetic-shifts back, copying its sign bit', 'Same as x &amp; 0xFF', 'Overflows and throws'], answer: 1, explain: '<code>&lt;&lt; 24</code> puts bit 7 into the sign position; <code>&gt;&gt;</code> (signed shift) brings it back while copying that sign — exactly sign extension of the low byte.' },
      hints: [R`<p>Hint 1: <code>x &amp; 0xFF</code> gives the low 8 bits as a number 0..255.</p>`, R`<p>Hint 2: if that number is ≥ 128 the byte's sign bit is set, so its signed value is <code>n − 256</code>.</p>`, R`<p>Hint 3: a branch-free version: shift left 24 so bit 7 lands on bit 31, then signed-shift right 24 (sign extension). Test with 127, 128, 255, 256, −1, MIN_VALUE.</p>`],
      solution: {
        approach: R`<p>Mask to get the unsigned low byte, then reinterpret the top bit as −128. Or use the shift pair for a branch-free version — that is literally how the JVM's <code>i2b</code> instruction behaves.</p>`,
        code: R`
public class ToByte {
    static int toByte(int x) {
        int n = x & 0xFF;               // low 8 bits, 0..255
        return n >= 128 ? n - 256 : n;  // bit 7 is worth -128, not +128
    }
    static int toByteShift(int x) {
        return (x << 24) >> 24;         // sign-extend the low byte
    }
    public static void main(String[] args) {
        int[] tests = {300, 200, -1, -129, 127, 128, Integer.MIN_VALUE, Integer.MAX_VALUE};
        for (int t : tests) {
            int expected = (byte) t;    // only used to verify
            System.out.println(t + " -> " + toByte(t) + " " + toByteShift(t) + " " + (toByte(t) == expected));
        }
    }
}`,
        dry: { head: ['x', 'x &amp; 0xFF', '≥ 128?', 'result'], rows: [['300', '44', 'no', '44'], ['200', '200', 'yes', '200 − 256 = -56'], ['-1', '255', 'yes', '-1'], ['-129', '127', 'no', '127'], ['MIN_VALUE', '0', 'no', '0']] },
        complexity: R`<p>O(1) time and space.</p>`,
        followUps: ['Generalize to <code>toBits(x, n)</code> for any width 1..31.', 'Write <code>toChar(x)</code> — why is it just <code>x &amp; 0xFFFF</code>?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 6 — Operators, precedence & evaluation order
     ====================================================================== */
  topics.push({
    title: 'Operators: Arithmetic, ++/--, Logical, Bitwise, Shifts & Precedence',
    analogy: R`<p>An expression is like a <b>kitchen order ticket</b>. <b>Precedence</b> is the restaurant rule "desserts are plated after mains" — it decides which parts group together (<code>*</code> before <code>+</code>). <b>Evaluation order</b> is the waiter reading the ticket strictly <b>left to right</b>, collecting each ingredient in turn. And <code>x++</code> is a waiter who <b>writes down the old number on the ticket first</b>, then updates the stock count; <code>++x</code> updates the stock first and writes the new number.</p>`,
    explain: R`<h4>Arithmetic: + − * / %</h4>
${H.table(['Expression', 'Result', 'Rule'], [
  ['<code>7 / 2</code>', '3', 'int / int → int, fraction dropped (toward zero)'],
  ['<code>-7 / 2</code>', '-3', 'toward zero, not −4'],
  ['<code>7 % 3</code> / <code>-7 % 3</code>', '1 / -1', '<code>%</code> takes the sign of the <b>left</b> number'],
  ['<code>Math.floorMod(-7, 3)</code>', '2', 'always in 0..2 — use for clocks, circular arrays'],
  ['<code>7 / 2.0</code>', '3.5', 'one double makes it double maths'],
  ['<code>5 / 0</code>', H.c('r', 'ArithmeticException'), 'int division by zero throws'],
  ['<code>5.0 / 0</code>', 'Infinity', 'floating point never throws; <code>0.0 / 0</code> is NaN']
])}
<h4>Increment and decrement</h4>
<p><code>x++</code> (post): use the <b>old</b> value, then add 1. <code>++x</code> (pre): add 1, then use the <b>new</b> value. On a line of their own (<code>i++;</code>) they are identical. Inside expressions they differ:</p>
${H.table(['Code (x starts at 5)', 'y', 'x after'], [['<code>y = x++;</code>', '5', '6'], ['<code>y = ++x;</code>', '6', '6'], ['<code>x = x++;</code>', '—', H.c('r', '5 (unchanged!)')]])}
<h4>Comparison and logic</h4>
<ul><li><code>== != &lt; &gt; &lt;= &gt;=</code> give a <code>boolean</code>. For objects, <code>==</code> compares <b>references</b> (covered in the Strings module).</li>
<li><code>&amp;&amp;</code> and <code>||</code> <b>short-circuit</b>: the right side runs only if needed. <code>if (s != null &amp;&amp; s.length() &gt; 0)</code> is safe because the right side is skipped when s is null.</li>
<li><code>&amp;</code>, <code>|</code>, <code>^</code> on booleans evaluate <b>both</b> sides (no short circuit). <code>!</code> negates.</li></ul>
<h4>Bitwise and shifts (on int/long)</h4>
${H.table(['Op', 'Meaning', 'Example (8-bit view)'], [
  ['<code>&amp;</code>', '1 where both are 1', '1100 &amp; 1010 = 1000'],
  ['<code>|</code>', '1 where either is 1', '1100 | 1010 = 1110'],
  ['<code>^</code>', '1 where they differ', '1100 ^ 1010 = 0110'],
  ['<code>~</code>', 'flip every bit', '~5 = −6 (always −x − 1)'],
  ['<code>&lt;&lt; k</code>', 'shift left, fill 0 (×2<sup>k</sup>)', '3 &lt;&lt; 2 = 12'],
  ['<code>&gt;&gt; k</code>', 'shift right, copy the sign bit', '−8 &gt;&gt; 1 = −4'],
  ['<code>&gt;&gt;&gt; k</code>', 'shift right, fill 0 (unsigned)', '−8 &gt;&gt;&gt; 1 = 2147483644']
])}
<p>Shift distances are taken <b>mod 32</b> for int (mod 64 for long): <code>1 &lt;&lt; 32</code> is 1, not 0.</p>
<h4>String concatenation</h4>
<p><code>+</code> with a String on either side means "join as text", and it works <b>left to right</b>: <code>1 + 2 + "3"</code> = <code>"33"</code> but <code>"1" + 2 + 3</code> = <code>"123"</code>.</p>
<h4>Precedence (high → low) — the part you must remember</h4>
${H.table(['Level', 'Operators'], [['postfix', '<code>x++ x--</code>'], ['unary', '<code>++x --x + - ! ~ (cast)</code>'], ['multiplicative', '<code>* / %</code>'], ['additive', '<code>+ -</code>'], ['shift', '<code>&lt;&lt; &gt;&gt; &gt;&gt;&gt;</code>'], ['relational', '<code>&lt; &gt; &lt;= &gt;= instanceof</code>'], ['equality', '<code>== !=</code>'], ['bitwise', '<code>&amp;</code> then <code>^</code> then <code>|</code>'], ['logical', '<code>&amp;&amp;</code> then <code>||</code>'], ['ternary', '<code>?:</code>'], ['assignment', '<code>= += -= ...</code> (right to left)']])}
<p><b>Golden rule:</b> precedence decides <i>grouping</i>; operands are still <b>evaluated left to right</b>. When in doubt, add brackets — readers will thank you.</p>`,
    clues: [
      '"Predict the output" with <code>i++ + ++i</code> → evaluate operands left to right, tracking the variable after each step',
      '"i = i++" → the old value is saved, the increment is overwritten: i is unchanged',
      '"Avoid NullPointerException in a condition" → short-circuit <code>&amp;&amp;</code> with the null check first',
      '"Negative index / wrap around a circular buffer" → <code>Math.floorMod</code> instead of <code>%</code>',
      '"Check odd / power of two / divide by 2 fast" → <code>x &amp; 1</code>, <code>x &amp; (x − 1)</code>, <code>x &gt;&gt; 1</code>',
      '"Unsigned right shift" / "hash spreading" / "binary search mid" → <code>&gt;&gt;&gt;</code>'
    ],
    code: [R`
public class Ops {
    public static void main(String[] args) {
        // Arithmetic
        System.out.println(7 / 2 + " " + -7 / 2 + " " + 7 % 3 + " " + -7 % 3);   // 3 -3 1 -1
        System.out.println(Math.floorDiv(-7, 2) + " " + Math.floorMod(-7, 3));   // -4 2

        // ++ / --
        int x = 5;
        int a = x++;          // a = 5, x = 6
        int b = ++x;          // x = 7, b = 7
        System.out.println(a + " " + b + " " + x);                                // 5 7 7

        // Short-circuit protects us
        String s = null;
        if (s != null && s.length() > 3) System.out.println("long");
        else System.out.println("null or short");                                // null or short

        // Bitwise
        int n = 12;                                   // 1100
        System.out.println((n & 1) == 0 ? "even" : "odd");                       // even
        System.out.println((n & (n - 1)) == 0);       // power of two? false
        System.out.println(n << 2);                   // 48
        System.out.println(-8 >> 1);                  // -4
        System.out.println(-8 >>> 1);                 // 2147483644
        System.out.println(1 << 32);                  // 1 (shift distance 32 & 31 = 0)

        // String concatenation, left to right
        System.out.println(1 + 2 + "3" + 4 + 5);      // 3345
        System.out.println("sum: " + (4 + 5));        // sum: 9
    }
}`],
    codeTitle: ['Operators cheat-sheet in code'],
    viz: [{
      title: 'Why i = i++ leaves i unchanged (bytecode view)',
      input: '5',
      inputLabel: 'Starting value of i',
      gen: function (input) {
        var i0 = clampInt(input, -1000000, 1000000, 'Enter a whole number between -1000000 and 1000000');
        var code = 'iload_1      // push the CURRENT value of i\niinc 1, 1    // add 1 directly in local slot 1\nistore_1     // pop the saved value back into i';
        var f = [];
        function P(line, stack, i, narr, cls) { var h = {}; if (line) h[line] = cls || 'cur'; f.push({ narr: narr, parts: [{ type: 'code', label: 'Java', lang: 'java', code: 'int i = ' + i0 + ';\ni = i++;\nSystem.out.println(i);', hl: { 2: 'cur' } }, { type: 'code', label: 'Bytecode for  i = i++;', lang: 'text', code: code, hl: h }, { type: 'stack', label: 'Operand stack', items: stack }, { type: 'vars', label: 'Local slot 1', vals: { i: i }, hl: { i: cls === 'bad' ? 'bad' : (line === 2 ? 'ok' : '') } }] }); }
        P(0, [], i0, 'Start: <code>i = ' + i0 + '</code>. Java evaluates the <b>right side first</b>, then assigns. The right side is <code>i++</code> — "use the old value, then increment".');
        P(1, [i0], i0, '<code>iload_1</code>: the <b>old value ' + i0 + '</b> is pushed onto the operand stack. This is the value the expression <code>i++</code> will produce.');
        P(2, [i0], i0 + 1, '<code>iinc 1, 1</code>: the side effect happens — the local i becomes <b>' + (i0 + 1) + '</b>. But the stack still holds the old ' + i0 + '.', 'ok');
        P(3, [], i0, '<code>istore_1</code>: the assignment <code>i = ...</code> stores the stacked value <b>' + i0 + '</b> into i, <span class="c-r">overwriting the increment</span>.', 'bad');
        f.push({ narr: 'Compare <code>i = ++i</code>: bytecode is <code>iinc 1,1</code> → <code>iload_1</code> → <code>istore_1</code>. It increments first, then loads the new value, so i becomes ' + (i0 + 1) + '. And plain <code>i++;</code> is just <code>iinc</code>.', parts: [{ type: 'table', label: 'Three ways', columns: ['statement', 'bytecode', 'i after'], rows: [['i = i++;', 'iload, iinc, istore', String(i0)], ['i = ++i;', 'iinc, iload, istore', String(i0 + 1)], ['i++;', 'iinc', String(i0 + 1)]], hl: { 0: 'bad', 1: 'ok', 2: 'ok' } }] });
        f.push({ narr: 'Output: <b>' + i0 + '</b>. This is a top-10 Java interview puzzle. Real code should never write <code>i = i++</code> — linters (ErrorProne, SonarQube) flag it as a self-assignment bug.', parts: [{ type: 'text', label: 'Console', html: '<b>' + i0 + '</b>' }] });
        return f;
      }
    }, {
      title: 'Left-to-right evaluation: y = x++ + ++x * x--',
      input: '5',
      inputLabel: 'Starting value of x',
      gen: function (input) {
        var x = clampInt(input, -10000, 10000, 'Enter a whole number between -10000 and 10000');
        var x0 = x, f = [], vals = [];
        var code = 'int x = ' + x0 + ';\nint y = x++ + ++x * x--;\nSystem.out.println(y + " " + x);';
        function P(narr, hlv, extra) { f.push({ narr: narr, parts: [{ type: 'code', label: 'Java', lang: 'java', code: code, hl: { 2: 'cur' } }, { type: 'array', label: 'Operand values collected (left → right)', values: vals.length ? vals.slice() : ['—'], idxLabels: ['x++', '++x', 'x--'].slice(0, Math.max(1, vals.length)) , hl: hlv || {} }, { type: 'vars', label: 'Variable', vals: { x: x }, hl: { x: 'cur' } }].concat(extra || []) }); }
        P('Precedence groups it as <code>x++ + ((++x) * (x--))</code>. But Java still <b>evaluates the three operands left to right</b> before doing the arithmetic each needs.');
        vals.push(x); x++; P('Operand 1: <code>x++</code> → value <b>' + vals[0] + '</b> (old), then x becomes ' + x + '.', { 0: 'ok' });
        x++; vals.push(x); P('Operand 2: <code>++x</code> → x becomes ' + x + ' first, value <b>' + vals[1] + '</b>.', { 1: 'ok' });
        vals.push(x); x--; P('Operand 3: <code>x--</code> → value <b>' + vals[2] + '</b> (old), then x becomes ' + x + '.', { 2: 'ok' });
        var prod = Math.imul(vals[1], vals[2]);
        P('Now the operators, by precedence: multiplication first: ' + vals[1] + ' * ' + vals[2] + ' = <b>' + prod + '</b>.', { 1: 'sel', 2: 'sel' });
        var y = (vals[0] + prod) | 0;
        P('Then addition: ' + vals[0] + ' + ' + prod + ' = <b>' + y + '</b>. Prints <b>' + y + ' ' + x + '</b>.', { 0: 'sel', 1: 'sel', 2: 'sel' }, [{ type: 'text', label: 'Console', html: '<b>' + y + ' ' + x + '</b>' }]);
        f.push({ narr: 'A common wrong answer evaluates <code>++x * x--</code> before <code>x++</code> "because * binds tighter". No: precedence decides grouping, <b>not</b> the order in which operands are read. Java guarantees left-to-right (C/C++ do not — there this would be undefined behaviour!).', parts: [{ type: 'table', label: 'Right vs wrong mental model', columns: ['model', 'operands read', 'y'], rows: [['Java (left to right)', vals.join(', '), String(y)], ['"* first" (wrong)', 'evaluates ++x and x-- first', 'different']], hl: { 0: 'ok', 1: 'bad' } }] });
        return f;
      }
    }, {
      title: 'Shift lab: <<, >> and >>> on 32 bits',
      input: '-8 1',
      inputLabel: 'value and shift distance (e.g. "-8 1", "1 33", "96 4")',
      gen: function (input) {
        var t = String(input).trim().split(/[\s,]+/);
        if (t.length !== 2) throw new Error('Type a value and a distance, e.g. "-8 1"');
        var v = clampInt(t[0], -2147483648, 2147483647, 'value must be an int');
        var d = clampInt(t[1], 0, 200, 'distance must be 0..200');
        var e = d & 31, f = [];
        var sl = v << e, sr = v >> e, ur = v >>> e;
        var top = {}; for (var i = 31; i > 31 - e && i >= 0; i--) top[i] = 'sel';
        var bot = {}; for (i = 0; i < e; i++) bot[i] = 'sel';
        var sg = {}; sg[31] = 'cur';
        f.push({ narr: 'Value <b>' + v + '</b> in 32 bits. Bit 31 (amber) is the sign bit: <b>' + ((v >>> 31) & 1) + '</b>.', parts: [{ type: 'bits', label: 'v = ' + v, value: v, width: 32, hl: sg }] });
        f.push({ narr: 'Java uses only the low 5 bits of the distance for int: ' + d + ' &amp; 31 = <b>' + e + '</b>.' + (d !== e ? ' <span class="c-y">So shifting by ' + d + ' is the same as shifting by ' + e + '!</span>' : ''), parts: [{ type: 'bits', label: 'distance ' + d, value: d, width: 8, hl: { 0: 'ok', 1: 'ok', 2: 'ok', 3: 'ok', 4: 'ok', 5: 'done', 6: 'done', 7: 'done' } }, { type: 'vars', label: 'effective', vals: { 'distance & 31': e }, hl: { 'distance & 31': 'ok' } }] });
        f.push({ narr: '<code>v &lt;&lt; ' + e + '</code>: everything moves left, ' + e + ' zeros enter on the right (purple). Bits pushed past bit 31 are lost. Result <b>' + sl + '</b>' + (e && sl !== v * Math.pow(2, e) ? ' — not v × 2<sup>' + e + '</sup> because bits fell off (overflow).' : (e ? ' = v × 2<sup>' + e + '</sup>.' : '.')), parts: [{ type: 'bits', label: 'v << ' + e, value: sl, width: 32, hl: bot }] });
        var sgn = (v >>> 31) & 1;
        f.push({ narr: '<code>v &gt;&gt; ' + e + '</code> (signed / arithmetic): bits move right and the <b>sign bit is copied</b> into the ' + e + ' new top positions (' + sgn + 's). Result <b>' + sr + '</b> = floor(v / 2<sup>' + e + '</sup>).', parts: [{ type: 'bits', label: 'v >> ' + e, value: sr, width: 32, hl: top }] });
        f.push({ narr: '<code>v &gt;&gt;&gt; ' + e + '</code> (unsigned / logical): bits move right and <b>zeros</b> fill the top. ' + (sgn && e ? 'For a negative number this gives a big positive result: <b>' + (ur | 0) + '</b>.' : 'For non-negative numbers it equals &gt;&gt;: <b>' + (ur | 0) + '</b>.'), parts: [{ type: 'bits', label: 'v >>> ' + e, value: ur | 0, width: 32, hl: top, dec: ur | 0 }] });
        f.push({ narr: 'Summary. Uses: <code>&lt;&lt;</code> fast multiply by powers of two and building bit masks; <code>&gt;&gt;</code> divide rounding down; <code>&gt;&gt;&gt;</code> treat an int as unsigned (hashing, <code>(lo + hi) &gt;&gt;&gt; 1</code>).', parts: [{ type: 'table', label: 'Results', columns: ['expression', 'value'], rows: [['v << ' + d, String(sl)], ['v >> ' + d, String(sr)], ['v >>> ' + d, String(ur | 0)]], hl: { 2: 'sel' } }] });
        return f;
      }
    }],
    examples: [
      { title: 'Predict the output: concatenation order', html: R`<p>Left to right: <code>1 + 2</code> = 3 (both ints), then <code>3 + "3"</code> = "33", then "33" + 4 = "334", then "3345". The char line: <code>'a' + 'b'</code> is int maths (97 + 98). Output:</p><pre>3345
195
ab
a1</pre>`, code: R`
System.out.println(1 + 2 + "3" + 4 + 5);   // 3345
System.out.println('a' + 'b');             // 195
System.out.println("" + 'a' + 'b');        // ab
System.out.println("a" + 1);               // a1` },
      { title: 'Predict the output: side effects in compound assignment', html: R`<p><code>a += a++</code> saves the left value (5) first, then evaluates <code>a++</code> (5, a becomes 6), adds 5 + 5 = 10 and stores it — the increment is lost again. <code>k = k++ + ++k</code>: operands 5 then 7 → 12. Output: <code>10 12</code>.</p>`, code: R`
int a = 5;
a += a++;
int k = 5;
k = k++ + ++k;
System.out.println(a + " " + k);   // 10 12` },
      { title: 'Short-circuit vs non-short-circuit', html: R`<p>With <code>&amp;&amp;</code> the method <code>check()</code> is never called because the left side is false. With <code>&amp;</code> both sides run. Output: <code>calls = 1</code>. Use <code>&amp;&amp;</code>/<code>||</code> in conditions; use <code>&amp;</code>/<code>|</code> only for bits or when both sides must run.</p>`, code: R`
public class ShortCircuit {
    static int calls = 0;
    static boolean check() { calls++; return true; }
    public static void main(String[] args) {
        boolean r1 = false && check();   // check() skipped
        boolean r2 = false & check();    // check() runs
        System.out.println("calls = " + calls);
    }
}` },
      { title: 'Circular index with floorMod', html: R`<p>Moving left from index 0 in a ring of 5 seats should land on seat 4. <code>(0 - 1) % 5</code> = <span class="c-r">−1</span> (crash on an array!). <code>Math.floorMod(0 - 1, 5)</code> = <span class="c-g">4</span>. Equivalent manual trick: <code>((i % n) + n) % n</code>.</p>${H.arr(['A', 'B', 'C', 'D', 'E'], { hl: { 0: 'y', 4: 'g' }, ptr: { 0: 'i', 4: 'i−1' } })}`, code: R`
int n = 5, i = 0;
System.out.println((i - 1) % n);              // -1
System.out.println(Math.floorMod(i - 1, n));  // 4
System.out.println(((i - 1) % n + n) % n);    // 4` }
    ],
    deepDive: R`<h4>The precise evaluation rules (JLS §15.7)</h4>
<ul><li>The left operand of a binary operator is <b>fully evaluated</b> (including its side effects) before any part of the right operand.</li>
<li>For <code>a op= b</code>, the value of <code>a</code> is saved <b>before</b> <code>b</code> is evaluated — that is why <code>a += a++</code> loses the increment.</li>
<li>Method arguments are evaluated left to right; array index expressions before the right-hand side of an assignment: <code>arr[i] = i = 2</code> stores into the <b>old</b> <code>arr[i]</code>.</li>
<li>If the left operand throws, the right operand is never evaluated.</li></ul>
<p>Java made these rules strict on purpose; in C/C++ <code>i = i++ + ++i</code> is <i>undefined behaviour</i>.</p>
<h4>Division and remainder identities</h4>
<p>Java guarantees <code>(a / b) * b + (a % b) == a</code> for all ints (except b = 0). Division truncates toward zero, so the remainder carries the dividend's sign. <code>Math.floorDiv/floorMod</code> round toward −∞ instead; <code>Math.ceilDiv</code> (Java 18) toward +∞. Overflow corner: <code>Integer.MIN_VALUE / -1</code> = MIN_VALUE (no exception!) and <code>MIN_VALUE % -1</code> = 0.</p>
<h4>Precedence traps</h4>
<ul><li><code>if (flags &amp; MASK == 0)</code> parses as <code>flags &amp; (MASK == 0)</code> → compile error for ints. Write <code>(flags &amp; MASK) == 0</code>.</li>
<li><code>x &lt;&lt; 1 + 1</code> is <code>x &lt;&lt; 2</code> (additive binds tighter than shift).</li>
<li><code>"Total: " + a + b</code> concatenates; <code>"Total: " + (a + b)</code> adds.</li>
<li>The ternary is right-associative: <code>a ? b : c ? d : e</code> = <code>a ? b : (c ? d : e)</code>.</li></ul>
<h4>Performance notes</h4>
<p>Modern JITs turn <code>x / 8</code> into shifts with a sign correction and division by any constant into a multiply-by-reciprocal, so write the clear version. <code>%</code> by a power of two can be <code>x &amp; (n − 1)</code> <b>only for non-negative x</b> — that is how <code>HashMap</code> picks a bucket (after spreading the hash with <code>h ^ (h &gt;&gt;&gt; 16)</code>). String <code>+</code> in a single expression compiles to an efficient <code>invokedynamic</code> (StringConcatFactory, since Java 9); in loops, still use <code>StringBuilder</code>.</p>`,
    aiEra: R`<p><b>What AI changes:</b> LLMs can evaluate tricky expressions and explain them, and an agent can just run the snippet in <code>jshell</code> to get the ground truth. Output-prediction trivia matters less in day-to-day work.</p>
<p><b>Use AI as a partner:</b> generate drills — <code>Give me 10 Java predict-the-output questions about ++, compound assignment and string concatenation, answers hidden</code>. Then verify each answer in jshell, never by trusting the model.</p>
<p><b>Where AI goes wrong:</b> it frequently applies C/C++ intuition ("undefined behaviour", "depends on the compiler") to Java, mixes up <code>&gt;&gt;</code> and <code>&gt;&gt;&gt;</code> for negatives, forgets shift-distance masking (claims <code>1 &lt;&lt; 32 == 0</code>), and evaluates <code>i++ + ++i</code> wrongly when it reasons token by token. Treat any confident explanation of a side-effect puzzle as a hypothesis.</p>
<p><b>What you must still own:</b> interviewers still ask these puzzles to test precision. You must be able to trace evaluation left to right on a whiteboard, know when <code>%</code> goes negative, and write readable code (brackets, no side effects inside complex expressions) so humans and AI reviewers both get it right.</p>`,
    problems: [{
      title: 'Implement floorDiv and floorMod',
      level: 'Medium', tags: ['operators', 'division', 'math'], companies: ['Google', 'Microsoft', 'Bloomberg'],
      statement: R`<p>Java's <code>/</code> rounds toward zero and <code>%</code> follows the sign of the dividend. Implement <code>floorDiv(a, b)</code> (round toward −∞) and <code>floorMod(a, b)</code> (result has the sign of <code>b</code>) using only <code>/</code>, <code>%</code>, comparisons and bit operators — no <code>Math</code> calls, no <code>double</code>.</p>`,
      constraints: R`<code>b ≠ 0</code>; any int a, b. For <code>floorDiv(MIN_VALUE, -1)</code> return MIN_VALUE (same overflow as Java).`,
      example: R`${H.table(['a, b', 'a / b', 'a % b', 'floorDiv', 'floorMod'], [['7, 2', '3', '1', '3', '1'], ['-7, 2', '-3', '-1', H.c('g', '-4'), H.c('g', '1')], ['7, -2', '-3', '1', H.c('g', '-4'), H.c('g', '-1')], ['-8, 2', '-4', '0', '-4', '0']])}<p>Check: floorDiv · b + floorMod = a, e.g. (−4)·2 + 1 = −7.</p>`,
      brute: { why: R`<p>Convert to <code>double</code>, call <code>Math.floor(a / (double) b)</code>, cast back. It looks fine but doubles have only 53 bits of precision — for longs it breaks, it is slower, and it is banned by the problem. Another brute: loop subtracting b until crossing zero — O(|a|) time, 2 billion steps worst case.</p>`, code: R`
static int floorDivBrute(int a, int b) {
    return (int) Math.floor((double) a / b);   // ok for int, wrong idea for long
}
static int floorModBrute(int a, int b) {
    return a - floorDivBrute(a, b) * b;
}` },
      mcq: { q: 'When does <code>a / b</code> differ from <code>floorDiv(a, b)</code>?', options: ['Whenever a is negative', 'When the signs of a and b differ AND the division is not exact', 'When b is negative', 'Never for ints'], answer: 1, explain: 'Truncation and floor only disagree for a negative non-integer quotient: signs differ and remainder ≠ 0. Then floor is one less.' },
      hints: [R`<p>Hint 1: start from <code>q = a / b</code>. It is already correct when the quotient is positive or exact.</p>`, R`<p>Hint 2: the signs differ exactly when <code>(a ^ b) &lt; 0</code> (the XOR's sign bit is 1). If they differ and <code>a % b != 0</code>, subtract 1 from q.</p>`, R`<p>Hint 3: for floorMod: <code>m = a % b</code>; if m ≠ 0 and m's sign differs from b's (<code>(m ^ b) &lt; 0</code>), add b. Test (−7,2), (7,−2), (−8,2), (MIN_VALUE, −1).</p>`],
      solution: {
        approach: R`<p>Correct truncation into flooring with one adjustment, detected by an XOR sign test — exactly how the JDK implements <code>Math.floorDiv</code>/<code>floorMod</code>. No overflow except the inherent <code>MIN_VALUE / -1</code>.</p>`,
        code: R`
public class FloorOps {
    static int floorDiv(int a, int b) {
        int q = a / b;                          // truncates toward zero
        if ((a % b != 0) && ((a ^ b) < 0)) q--; // negative, inexact -> one lower
        return q;
    }
    static int floorMod(int a, int b) {
        int m = a % b;                          // sign of a
        if (m != 0 && ((m ^ b) < 0)) m += b;    // move into b's sign range
        return m;
    }
    public static void main(String[] args) {
        int[][] t = {{7, 2}, {-7, 2}, {7, -2}, {-8, 2}, {Integer.MIN_VALUE, -1}};
        for (int[] p : t) {
            int a = p[0], b = p[1];
            System.out.println(a + "," + b + " -> " + floorDiv(a, b) + " " + floorMod(a, b)
                + " (Math: " + Math.floorDiv(a, b) + " " + Math.floorMod(a, b) + ")");
        }
    }
}`,
        dry: { head: ['a, b', 'q = a/b', 'a%b', 'signs differ?', 'floorDiv', 'floorMod'], rows: [['-7, 2', '-3', '-1', 'yes', '-4', '-1 + 2 = 1'], ['7, -2', '-3', '1', 'yes', '-4', '1 + (-2) = -1'], ['-8, 2', '-4', '0', 'yes', '-4 (exact)', '0'], ['7, 2', '3', '1', 'no', '3', '1']] },
        complexity: R`<p>O(1) time and space.</p>`,
        followUps: ['Write <code>ceilDiv</code> the same way.', 'Why does <code>x &amp; (n − 1)</code> equal <code>floorMod(x, n)</code> for any int x when n is a power of two?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 7 — Integer overflow
     ====================================================================== */
  topics.push({
    title: 'Integer Overflow: Wrap-Around, Detection & Prevention',
    analogy: R`<p>An old car <b>odometer</b> with 6 digits shows 999,999 km. Drive one more kilometre and it shows <b>000,000</b> — it did not explode, it just <b>wrapped around</b>, and now it lies to you. Java's <code>int</code> is a 32-bit odometer with a twist: the moment it passes 2,147,483,647 it shows <b>−2,147,483,648</b>. No alarm, no exception — the car keeps driving with a wrong number. That silence is what makes overflow dangerous.</p>`,
    explain: R`<h4>What overflow is</h4>
<p>Every integer type has a fixed number of bits. When the true mathematical result does not fit, Java keeps only the low bits (like a cast) and carries on. The result is off by a multiple of 2<sup>32</sup> (for int) or 2<sup>64</sup> (for long).</p>
${H.table(['Expression', 'True value', 'Java int result'], [
  ['<code>Integer.MAX_VALUE + 1</code>', '2,147,483,648', H.c('r', '−2,147,483,648')],
  ['<code>Integer.MIN_VALUE − 1</code>', '−2,147,483,649', H.c('r', '2,147,483,647')],
  ['<code>1_000_000 * 1_000_000</code>', '10<sup>12</sup>', H.c('r', '−727,379,968')],
  ['<code>2_000_000_000 + 2_000_000_000</code>', '4 × 10<sup>9</sup>', H.c('r', '−294,967,296')],
  ['<code>Math.abs(Integer.MIN_VALUE)</code>', '2,147,483,648', H.c('r', '−2,147,483,648 (still negative!)')],
  ['<code>Integer.MIN_VALUE / -1</code>', '2,147,483,648', H.c('r', '−2,147,483,648 (no exception)')]
])}
<h4>Why no error?</h4>
<p>The CPU adds 32-bit numbers in one instruction and simply drops the carry. Java's spec says integer arithmetic <b>wraps</b> (it is defined behaviour, unlike C where signed overflow is undefined). Checking every operation would slow down every program, so Java gives you opt-in checks instead.</p>
<h4>The classic trap: the long on the left does not help</h4>
<pre>long bad  = 1_000_000 * 1_000_000;        // int * int overflows FIRST, then widens: -727379968
long good = 1_000_000L * 1_000_000;       // long * int -> long maths: 1000000000000
long good2 = (long) a * b;                // cast ONE operand before multiplying</pre>
<p>Java computes the right side with the operand types, and only afterwards widens the (already broken) result. The type of the variable you assign to does not matter.</p>
<h4>Your toolbox</h4>
${H.table(['Tool', 'Use when'], [
  ['<code>long</code> instead of <code>int</code>', 'sums, products, counters that can pass ~2.1 billion'],
  ['<code>(long) a * b</code>', 'multiplying two ints whose product can exceed int'],
  ['<code>Math.addExact / subtractExact / multiplyExact / incrementExact / negateExact / toIntExact / absExact</code>', 'overflow is a bug → throw <code>ArithmeticException</code> instead of lying'],
  ['pre-check: <code>a &gt; Integer.MAX_VALUE - b</code>', 'decide before adding (b ≥ 0)'],
  ['<code>BigInteger</code>', 'no upper limit (factorials, crypto)'],
  ['<code>lo + (hi - lo) / 2</code> or <code>(lo + hi) &gt;&gt;&gt; 1</code>', 'midpoint in binary search'],
  ['<code>Integer.compare(a, b)</code>', 'never <code>return a - b;</code> in a comparator']
])}
<h4>Quick limits to memorise</h4>
<p>int max ≈ <b>2.1 × 10<sup>9</sup></b> (10 digits). long max ≈ <b>9.2 × 10<sup>18</sup></b> (19 digits). 12! fits in int, 13! does not. 20! fits in long, 21! does not. 46,341² is the first square above int max.</p>`,
    clues: [
      '"Return 0 if the reversed integer overflows" / "assume a 32-bit environment" → check bounds before multiplying by 10',
      '"Answer may be large" / "values up to 10<sup>9</sup>" with sums or products → use long, cast before multiplying',
      '"Return the answer modulo 10<sup>9</sup> + 7" → keep intermediates in long and reduce after every multiply',
      '"Find the midpoint" in binary search on large ranges → <code>lo + (hi − lo) / 2</code>',
      '"Comparator sorts wrongly for negative numbers" → subtraction overflow; use Integer.compare',
      '"abs / negate of a negative number" → MIN_VALUE has no positive twin in int'
    ],
    code: [R`
public class Overflow {
    public static void main(String[] args) {
        int max = Integer.MAX_VALUE;
        System.out.println(max + 1);                       // -2147483648 (wrapped)
        System.out.println(1_000_000 * 1_000_000);         // -727379968
        long wrong = 1_000_000 * 1_000_000;                // overflow happens before widening
        long right = 1_000_000L * 1_000_000;               // 1000000000000
        System.out.println(wrong + " vs " + right);

        // Make overflow loud
        try {
            Math.addExact(max, 1);
        } catch (ArithmeticException e) {
            System.out.println("caught: " + e.getMessage()); // integer overflow
        }

        // Safe pre-check (for b >= 0)
        int a = 2_000_000_000, b = 500_000_000;
        if (a > Integer.MAX_VALUE - b) System.out.println("a + b would overflow");

        // Binary-search midpoint
        int lo = 2_000_000_000, hi = 2_100_000_000;
        System.out.println((lo + hi) / 2);         // -97483648  (bug!)
        System.out.println(lo + (hi - lo) / 2);    // 2050000000
        System.out.println((lo + hi) >>> 1);       // 2050000000 (treat the sum as unsigned)

        // abs of MIN_VALUE
        System.out.println(Math.abs(Integer.MIN_VALUE));   // -2147483648
    }
}`, R`
// The comparator bug: subtraction overflows for far-apart values
import java.util.*;

public class CompareBug {
    public static void main(String[] args) {
        Integer[] arr = {Integer.MIN_VALUE, 1, -5, Integer.MAX_VALUE};
        Integer[] copy = arr.clone();
        Arrays.sort(arr, (x, y) -> x - y);                 // BROKEN: MIN_VALUE - 1 overflows
        Arrays.sort(copy, Integer::compare);               // correct
        System.out.println(Arrays.toString(arr));          // order is wrong
        System.out.println(Arrays.toString(copy));         // [-2147483648, -5, 1, 2147483647]
    }
}`],
    codeTitle: ['Overflow in action and the fixes', 'Never compare with subtraction'],
    viz: [{
      title: 'Watch a 32-bit int overflow',
      input: '2147483647 + 1',
      inputLabel: 'a op b with op in + - * (both in int range)',
      gen: function (input) {
        var m = String(input).trim().match(/^(-?\d+)\s*([+\-*])\s*(-?\d+)$/);
        if (!m) throw new Error('Format: a op b, e.g. "2147483647 + 1" or "1000000 * 1000000"');
        var a = clampInt(m[1], -2147483648, 2147483647, 'a must be in int range'), op = m[2];
        var b = clampInt(m[3], -2147483648, 2147483647, 'b must be in int range');
        var A = BigInt(a), B = BigInt(b);
        var tr = op === '+' ? A + B : op === '-' ? A - B : A * B;
        var w = Number(BigInt.asIntN(32, tr));
        var over = BigInt(w) !== tr;
        var sg = { 31: 'sel' };
        var f = [];
        f.push({ narr: 'Two ints: a = <b>' + a + '</b>, b = <b>' + b + '</b>. Each is 32 bits; bit 31 (purple) is the sign.', parts: [{ type: 'bits', label: 'a', value: a, width: 32, hl: sg }, { type: 'bits', label: 'b', value: b, width: 32, hl: sg }] });
        f.push({ narr: 'The true mathematical answer of <code>a ' + op + ' b</code> is <b>' + tr + '</b>. int can only hold −2,147,483,648 … 2,147,483,647. ' + (over ? '<span class="c-r">It does not fit!</span>' : '<span class="c-g">It fits.</span>'), parts: [{ type: 'bars', label: 'true result vs int limits', values: [-2147483648, Number(tr) > 1e12 ? 1e12 : Number(tr) < -1e12 ? -1e12 : Number(tr), 2147483647], texts: ['MIN', String(tr), 'MAX'], idxLabels: ['int min', 'a ' + op + ' b', 'int max'], hl: { 1: over ? 'bad' : 'ok' } }] });
        if (over) {
          var k = (tr - BigInt(w)) / 4294967296n;
          f.push({ narr: 'The hardware keeps only the low 32 bits of the true result — it subtracts ' + (k < 0n ? '−' : '') + (k < 0n ? -k : k) + ' × 2<sup>32</sup> (4,294,967,296). Whatever lands in bit 31 is read as the sign.', parts: [{ type: 'vars', label: 'Wrap arithmetic', vals: { 'true result': String(tr), 'multiples of 2^32 dropped': String(k), 'kept': String(w) }, hl: { kept: 'bad' } }] });
        }
        f.push({ narr: 'Java result: <b>' + w + '</b>' + (over ? ' — <span class="c-r">silently wrong</span>, and the sign may even have flipped.' : ' — correct.'), parts: [{ type: 'bits', label: 'int result of a ' + op + ' b', value: w, width: 32, hl: sg }, { type: 'code', label: 'Java', lang: 'java', code: 'int r = ' + a + ' ' + op + ' ' + (b < 0 ? '(' + b + ')' : b) + ';\nSystem.out.println(r);   // ' + w, hl: { 2: over ? 'bad' : 'ok' } }] });
        var fn = op === '+' ? 'addExact' : op === '-' ? 'subtractExact' : 'multiplyExact';
        f.push({ narr: 'Option 1 — make it loud: <code>Math.' + fn + '(a, b)</code> ' + (over ? 'throws <code>ArithmeticException: integer overflow</code>. A crash is better than a wrong bank balance.' : 'returns ' + w + ' normally.'), parts: [{ type: 'code', label: 'Checked arithmetic', lang: 'java', code: 'int r = Math.' + fn + '(a, b);', hl: { 1: over ? 'bad' : 'ok' } }, { type: 'text', label: 'Result', html: over ? '<span class="c-r">java.lang.ArithmeticException: integer overflow</span>' : String(w) } ] });
        var lr = BigInt.asIntN(64, tr);
        f.push({ narr: 'Option 2 — use a bigger box: <code>(long) a ' + op + ' b</code> computes in 64 bits → <b>' + lr + '</b>' + (lr === tr ? ' (correct).' : ' (even long overflowed — use BigInteger).') + ' Cast <b>one operand before</b> the operation, not the result after.', parts: [{ type: 'table', label: 'Same numbers, three ways', columns: ['code', 'result'], rows: [['int r = a ' + op + ' b', String(w)], ['long r = (long) (a ' + op + ' b)', String(w) + ' (too late!)'], ['long r = (long) a ' + op + ' b', String(lr)]], hl: { 0: over ? 'bad' : 'ok', 1: over ? 'bad' : 'ok', 2: 'ok' } }] });
        return f;
      }
    }, {
      title: 'The int odometer: counting past MAX_VALUE',
      input: '2147483645 6',
      inputLabel: 'start value and number of +1 steps (max 12)',
      gen: function (input) {
        var t = String(input).trim().split(/[\s,]+/);
        if (t.length !== 2) throw new Error('Type a start value and a step count, e.g. "2147483645 6"');
        var v = clampInt(t[0], -2147483648, 2147483647, 'start must be an int');
        var n = clampInt(t[1], 3, 12, 'steps must be 3..12');
        var f = [], hist = [];
        for (var i = 0; i <= n; i++) {
          hist.push(v);
          var wrapped = i > 0 && v === -2147483648 && hist[i - 1] === 2147483647;
          var hl = {}; hl[31] = wrapped ? 'bad' : 'sel';
          f.push({ narr: i === 0 ? 'Start the odometer at <b>' + v + '</b>. Each step does <code>x++</code>.' : (wrapped ? '<span class="c-r">WRAP!</span> 0111…1 + 1 = 1000…0. The carry ran into the sign bit: MAX_VALUE + 1 = <b>MIN_VALUE</b>. No exception was thrown.' : 'Step ' + i + ': x = <b>' + v + '</b>.'), parts: [{ type: 'bits', label: 'x', value: v, width: 32, hl: hl }, { type: 'array', label: 'history', values: hist.slice(), hl: (function () { var o = {}; o[hist.length - 1] = wrapped ? 'bad' : 'cur'; return o; })() }] });
          v = (v + 1) | 0;
        }
        f.push({ narr: 'Real incidents caused by this exact wrap: a Boeing 787 power-unit counter (hundredths of a second, overflowing after ~248 days of uptime), YouTube\'s view counter for "Gangnam Style" (passed 2,147,483,647 in 2014 and was moved to 64-bit), and countless hash/ID bugs.', parts: [{ type: 'table', label: 'How long until a 32-bit counter wraps?', columns: ['counts per second', 'time to pass 2^31'], rows: [['1', '68 years'], ['100', '248 days'], ['1,000', '24.8 days'], ['1,000,000', '36 minutes']], hl: { 1: 'bad' } }] });
        return f;
      }
    }],
    examples: [
      { title: 'Predict the output: the "long division" puzzle', html: R`<p>Both constants are computed in <b>int</b> (all literals are ints) before being stored in a long. MICROS overflows to 500,654,080, so the division prints <code>5</code> instead of <code>1000</code>. Fix: make the first literal a long: <code>24L * 60 * 60 * 1000 * 1000</code>.</p>`, code: R`
final long MICROS_PER_DAY = 24 * 60 * 60 * 1000 * 1000;   // int overflow!
final long MILLIS_PER_DAY = 24 * 60 * 60 * 1000;
System.out.println(MICROS_PER_DAY / MILLIS_PER_DAY);       // 5
final long FIXED = 24L * 60 * 60 * 1000 * 1000;
System.out.println(FIXED / MILLIS_PER_DAY);                // 1000` },
      { title: 'Factorial: where each type gives up', html: R`${H.table(['n', 'n!', 'int result', 'long result'], [['12', '479,001,600', H.c('g', 'correct'), H.c('g', 'correct')], ['13', '6,227,020,800', H.c('r', '1,932,053,504'), H.c('g', 'correct')], ['20', '2,432,902,008,176,640,000', H.c('r', 'garbage'), H.c('g', 'correct')], ['21', '51,090,942,171,709,440,000', H.c('r', 'garbage'), H.c('r', '−4,249,290,049,419,214,848')]])}<p>Notice 13! in int is still <i>positive</i> — overflow does not always flip the sign, so "check if negative" is <b>not</b> a valid detector.</p>`, code: R`
static java.math.BigInteger factorial(int n) {
    java.math.BigInteger r = java.math.BigInteger.ONE;
    for (int i = 2; i <= n; i++) r = r.multiply(java.math.BigInteger.valueOf(i));
    return r;                       // exact for any n
}` },
      { title: 'Sum of a big array', html: R`<p>N = 10<sup>5</sup> values each up to 10<sup>9</sup> → total up to 10<sup>14</sup>. An <code>int</code> accumulator silently wraps; a <code>long</code> accumulator is correct. Same with streams: <code>IntStream.sum()</code> returns int (wraps), <code>asLongStream().sum()</code> or <code>mapToLong</code> is safe.</p>`, code: R`
int[] a = new int[100_000];
java.util.Arrays.fill(a, 1_000_000_000);
int badSum = 0;  long goodSum = 0;
for (int x : a) { badSum += x; goodSum += x; }
System.out.println(badSum + " vs " + goodSum);     // wrapped value vs 100000000000000
System.out.println(java.util.Arrays.stream(a).asLongStream().sum()); // 100000000000000` },
      { title: 'Modular arithmetic without overflow', html: R`<p>"Return the answer modulo 10<sup>9</sup> + 7": each value is &lt; 2<sup>30</sup>, so a product of two is &lt; 2<sup>60</sup> — fits in long. Reduce after <b>every</b> multiplication, otherwise the next one overflows.</p>`, code: R`
static long modPow(long base, long exp, long mod) {
    long result = 1;
    base %= mod;
    while (exp > 0) {
        if ((exp & 1) == 1) result = result * base % mod;   // < 2^60 before %
        base = base * base % mod;
        exp >>= 1;
    }
    return result;
}` }
    ],
    deepDive: R`<h4>Detecting overflow with bits</h4>
<p>For <code>r = a + b</code>, overflow happened <b>iff</b> a and b have the same sign and r has a different sign. In one line: <code>((a ^ r) &amp; (b ^ r)) &lt; 0</code>. That is exactly how <code>Math.addExact</code> is written. For subtraction: <code>((a ^ b) &amp; (a ^ r)) &lt; 0</code>. For multiplication, <code>multiplyExact(int,int)</code> does the product in long and checks <code>(int) r != r</code>; for longs it uses <code>Math.multiplyHigh</code> (the upper 64 bits of the 128-bit product). The JIT turns these into an add plus a "jump on overflow" (<code>jo</code>) instruction — practically free, so prefer them over hand-written checks.</p>
<h4>Asymmetry of two's complement</h4>
<p>There is one more negative number than positive: <code>-Integer.MIN_VALUE == Integer.MIN_VALUE</code>, <code>Math.abs(MIN_VALUE) &lt; 0</code>, <code>MIN_VALUE / -1 == MIN_VALUE</code>. Code that "normalizes" a hash with <code>Math.abs(h) % n</code> can therefore produce a negative index once in 4 billion — use <code>Math.floorMod(h, n)</code> or <code>(h &amp; 0x7fffffff) % n</code>. <code>Math.absExact</code> (Java 15) throws instead.</p>
<h4>The famous binary-search bug</h4>
<p><code>int mid = (low + high) / 2;</code> sat in textbooks and in <code>java.util.Arrays.binarySearch</code> for about nine years before Joshua Bloch's 2006 write-up: for arrays with more than 2<sup>30</sup> elements, <code>low + high</code> overflows to a negative index. The JDK fix is <code>(low + high) &gt;&gt;&gt; 1</code>: the sum's 32 bits are correct as an unsigned number, and an unsigned shift divides it correctly.</p>
<h4>Floating-point overflow is different</h4>
<p><code>Double.MAX_VALUE * 2</code> = <code>Infinity</code>, and tiny results underflow gradually to 0. No exception either — check with <code>Double.isFinite</code>. The Ariane 5 rocket (1996) was lost because a 64-bit float was converted to a 16-bit integer that could not hold it — a narrowing-conversion overflow.</p>
<h4>When wrapping is wanted</h4>
<p>Hash functions (<code>31 * h + c</code> in <code>String.hashCode</code>), checksums, random-number generators and ring-buffer sequence numbers rely on wrap-around intentionally. Compare sequence numbers with <code>a - b &lt; 0</code> (wrap-safe for nearby values) instead of <code>a &lt; b</code> — that is how <code>System.nanoTime()</code> differences must be compared.</p>`,
    aiEra: R`<p><b>What AI changes:</b> static analysers and AI reviewers are good at spotting the classic shapes: <code>int * int</code> assigned to long, subtraction comparators, <code>Math.abs(hash) % n</code>, int loop counters over long sizes. Ask for that review on every PR.</p>
<p><b>Use AI as a partner:</b> <code>Find every arithmetic expression in this file that could overflow for inputs up to 10^9 and propose the minimal fix</code>. <code>Generate boundary tests with MAX_VALUE, MIN_VALUE, -1 and 0 for this method</code> — then run them.</p>
<p><b>Where AI goes wrong:</b> generated solutions to "mod 10^9+7" problems often forget to reduce after a multiply; generated comparators still use <code>a - b</code>; "fixes" put the <code>(long)</code> cast around the whole product (too late). Some models claim Java throws on overflow (it does not) or that checking <code>result &lt; 0</code> detects it (13! shows it does not).</p>
<p><b>What you must still own:</b> estimating the maximum magnitude of every intermediate value from the constraints <i>before</i> coding. In interviews, saying "this sum can reach 10<sup>14</sup>, so I'll use long" earns visible points — and no assistant is there to say it for you.</p>`,
    problems: [{
      title: 'Reverse Integer (32-bit Safe)',
      level: 'Medium', tags: ['overflow', 'math', 'digits'], companies: ['Amazon', 'Apple', 'Bloomberg', 'Adobe'],
      statement: R`<p>Given a 32-bit signed int <code>x</code>, return x with its digits reversed. If reversing makes the value go outside [−2<sup>31</sup>, 2<sup>31</sup> − 1], return <b>0</b>. Assume the environment cannot store 64-bit integers — <b>no <code>long</code></b>.</p>`,
      constraints: R`−2<sup>31</sup> ≤ x ≤ 2<sup>31</sup> − 1.`,
      example: R`${H.table(['x', 'output', 'why'], [['123', '321', 'plain reversal'], ['-120', '-21', 'sign stays, trailing zero vanishes'], ['1534236469', H.c('r', '0'), '9646324351 &gt; 2147483647'], ['-2147483648', H.c('r', '0'), '−8463847412 &lt; MIN']])}`,
      brute: { why: R`<p>Reverse the digits as text (<code>new StringBuilder(...).reverse()</code>), then parse with <code>Long.parseLong</code> and range-check. It works, but it uses <code>long</code> (forbidden) and string allocation. Without long, <code>Integer.parseInt</code> on the reversed text throws on overflow — using exceptions as control flow.</p>`, code: R`
static int reverseBrute(int x) {
    String s = new StringBuilder(String.valueOf(Math.abs((long) x))).reverse().toString();
    long r = Long.parseLong(s) * (x < 0 ? -1 : 1);
    return (r > Integer.MAX_VALUE || r < Integer.MIN_VALUE) ? 0 : (int) r;
}` },
      mcq: { q: 'Before computing <code>rev * 10 + d</code> (positive case), which check prevents overflow?', options: ['rev * 10 + d &gt; MAX', 'rev &gt; MAX / 10 || (rev == MAX / 10 &amp;&amp; d &gt; 7)', 'rev &lt; 0', 'd &gt; 9'], answer: 1, explain: 'MAX = 2147483647, so MAX / 10 = 214748364 and the last digit is 7. Check before multiplying; the first option overflows while checking.' },
      hints: [R`<p>Hint 1: peel digits with <code>d = x % 10</code> and <code>x /= 10</code>. For negative x, Java gives negative digits — which is perfect: the reversed number builds up negative automatically.</p>`, R`<p>Hint 2: the danger is the step <code>rev = rev * 10 + d</code>. Check <b>before</b> it whether rev is already past <code>MAX / 10</code> (or below <code>MIN / 10</code>).</p>`, R`<p>Hint 3: edge digits — if <code>rev == MAX / 10</code> then d must be ≤ 7; if <code>rev == MIN / 10</code> then d must be ≥ −8. Recipe: loop while x ≠ 0: pop d, check bounds, push d.</p>`],
      solution: {
        approach: R`<p>Pop digits from x and push onto rev. Before each push, compare rev with <code>MAX_VALUE / 10</code> and <code>MIN_VALUE / 10</code> (214748364 and −214748364), with a last-digit tie-break. Negative x needs no special case because Java's <code>%</code> keeps the sign.</p>`,
        code: R`
public class ReverseInteger {
    static int reverse(int x) {
        int rev = 0;
        while (x != 0) {
            int d = x % 10;          // last digit (negative if x is negative)
            x /= 10;
            if (rev > Integer.MAX_VALUE / 10 || (rev == Integer.MAX_VALUE / 10 && d > 7)) return 0;
            if (rev < Integer.MIN_VALUE / 10 || (rev == Integer.MIN_VALUE / 10 && d < -8)) return 0;
            rev = rev * 10 + d;      // now guaranteed to fit
        }
        return rev;
    }
    public static void main(String[] args) {
        System.out.println(reverse(123));          // 321
        System.out.println(reverse(-120));         // -21
        System.out.println(reverse(1534236469));   // 0
        System.out.println(reverse(1463847412));   // 2147483641 (fits)
        System.out.println(reverse(Integer.MIN_VALUE)); // 0
    }
}`,
        dry: { head: ['x', 'd', 'rev before', 'safe?', 'rev after'], rows: [['123', '3', '0', 'yes', '3'], ['12', '2', '3', 'yes', '32'], ['1', '1', '32', 'yes', '321'], ['…(1534236469) step 10', '1', '964632435', '<span class="c-r">964632435 &gt; 214748364</span>', 'return 0']] },
        complexity: R`<p>O(log₁₀ |x|) ≤ 10 iterations, O(1) space.</p>`,
        followUps: ['Use <code>Math.multiplyExact</code>/<code>addExact</code> with try/catch instead — trade-offs?', 'Reverse the bits of an int instead of the digits (<code>Integer.reverse</code>).']
      }
    }]
  });

  /* ======================================================================
     TOPIC 8 — char, ASCII & Unicode
     ====================================================================== */
  topics.push({
    title: 'char, ASCII & Unicode (UTF-16, Code Points, Emoji)',
    analogy: R`<p>Imagine a gigantic <b>numbered catalogue</b> of every symbol humans write: 'A' is item 65, 'é' is 233, '☕' is 9,749, '😀' is 128,512. That catalogue is <b>Unicode</b>. A Java <code>char</code> is a <b>16-bit ticket</b> that can print numbers only up to 65,535. Most symbols fit on one ticket; for the newer, bigger numbers like emoji, Java staples <b>two special tickets</b> together (a <i>surrogate pair</i>). So "how many tickets?" (<code>length()</code>) and "how many symbols?" (<code>codePointCount</code>) can give different answers.</p>`,
    explain: R`<h4>A char is a number</h4>
<p><code>char</code> is a 16-bit <b>unsigned</b> integer (0 … 65,535) that Java prints as a character. That is why you can do maths with it:</p>
${H.table(['Expression', 'Result', 'Why'], [
  ["<code>(int) 'A'</code>", '65', 'the code of A'],
  ["<code>'a' + 1</code>", '98', 'char + int → int'],
  ["<code>(char) ('a' + 1)</code>", "'b'", 'cast back to char'],
  ["<code>'7' - '0'</code>", '7', 'digit character → its value'],
  ["<code>'c' - 'a'</code>", '2', 'letter → index 0..25 (for int[26] counters)'],
  ["<code>'a' - 'A'</code>", '32', 'lowercase is 32 above uppercase in ASCII'],
  ["<code>char c = 'a'; c++;</code>", "'b'", '++ and += hide a cast; <code>c = c + 1</code> does not compile']
])}
<h4>ASCII — the first 128 codes</h4>
${H.table(['Range', 'Characters'], [['48 … 57', "'0' … '9'"], ['65 … 90', "'A' … 'Z'"], ['97 … 122', "'a' … 'z'"], ['32', "space ' '"], ['10 / 9', "newline '\\n' / tab '\\t'"]])}
<p>Handy facts: digits, uppercase and lowercase letters are each <b>contiguous</b>, so <code>c &gt;= 'a' &amp;&amp; c &lt;= 'z'</code> tests a lowercase ASCII letter. For "any language" letters use <code>Character.isLetter(c)</code>.</p>
<h4>Unicode and UTF-16</h4>
<p>Unicode assigns every character a <b>code point</b> from U+0000 to U+10FFFF (over a million slots; about 150,000 used). Java strings store text as <b>UTF-16</b>:</p>
<ul><li>Code points up to U+FFFF (the <i>Basic Multilingual Plane</i>: Latin, Greek, Hindi, Chinese, '☕'…) take <b>one char</b>.</li>
<li>Code points above U+FFFF (most emoji like 😀, rare CJK, historic scripts) take <b>two chars</b>: a <i>high surrogate</i> (0xD800–0xDBFF) followed by a <i>low surrogate</i> (0xDC00–0xDFFF).</li></ul>
${H.table(['Text', 'length()', 'codePointCount', 'UTF-8 bytes'], [['"Hi"', '2', '2', '2'], ['"é"', '1', '1', '2'], ['"☕"', '1', '1', '3'], ['"😀"', H.c('r', '2'), '1', '4'], ['"👍🏽" (thumb + skin tone)', H.c('r', '4'), '2', '8']])}
<h4>Useful APIs</h4>
<ul><li><code>s.charAt(i)</code> — one UTF-16 unit (may be half an emoji!). <code>s.codePointAt(i)</code> — the full code point starting at i.</li>
<li><code>s.codePoints()</code> — an <code>IntStream</code> of real characters. <code>Character.toChars(cp)</code> / <code>new String(Character.toChars(cp))</code> — back to text.</li>
<li><code>Character.isLetter</code>, <code>isDigit</code>, <code>isWhitespace</code>, <code>isUpperCase</code>, <code>toUpperCase</code>, <code>getNumericValue</code> — all Unicode-aware; overloads take an <code>int</code> code point.</li></ul>
<h4>Escapes</h4>
<p><code>'\n'</code> newline, <code>'\t'</code> tab, <code>'\''</code> quote, <code>'\\'</code> backslash, <code>'\u0041'</code> = 'A' by its hex code. Java 15+ text blocks (<code>"""</code>) make multi-line strings easy.</p>`,
    clues: [
      '"Count frequency of lowercase letters" → <code>int[26]</code> indexed by <code>c - \'a\'</code>',
      '"Convert digit character to int" → <code>c - \'0\'</code> (or Character.getNumericValue for any script)',
      '"String contains emoji / international text" → length() counts UTF-16 units; use codePoints()',
      '"Toggle case" / "is uppercase" for ASCII → ranges or <code>c ^ 32</code>; for real text → Character methods',
      '"Why does char c = c + 1 not compile?" → char + int is int; use c++ or a cast',
      '"Encode as bytes for network / file" → char ≠ byte; specify UTF-8 explicitly'
    ],
    code: [R`
public class Chars {
    public static void main(String[] args) {
        char c = 'A';
        System.out.println((int) c);            // 65
        System.out.println(c + 1);              // 66 (int maths)
        System.out.println((char) (c + 1));     // B
        c++;                                    // OK: hidden cast
        System.out.println(c);                  // B

        // Letter counting with an int[26]
        String word = "banana";
        int[] freq = new int[26];
        for (char ch : word.toCharArray()) freq[ch - 'a']++;
        System.out.println("a=" + freq[0] + " b=" + freq[1] + " n=" + freq['n' - 'a']); // a=3 b=1 n=2

        // Digit characters to numbers
        String digits = "4096";
        int value = 0;
        for (int i = 0; i < digits.length(); i++) value = value * 10 + (digits.charAt(i) - '0');
        System.out.println(value + 1);          // 4097

        // Unicode awareness
        String s = "Hi\u2615\uD83D\uDE00";      // Hi, coffee, grinning face
        System.out.println(s.length());                         // 5  (UTF-16 units)
        System.out.println(s.codePointCount(0, s.length()));    // 4  (real characters)
        System.out.println(Integer.toHexString(s.codePointAt(3))); // 1f600
        s.codePoints().forEach(cp -> System.out.print(Character.getName(cp) + " | "));
        System.out.println();
    }
}`],
    codeTitle: ['char arithmetic, counting and Unicode in one program'],
    viz: [{
      title: 'Inside a Java String: chars vs code points',
      input: 'Hi☕😀',
      inputLabel: 'Any text (emoji welcome, max 16 UTF-16 units)',
      gen: function (input) {
        var s = String(input);
        if (!s.length) throw new Error('Type some text, e.g. Hi☕😀');
        if (s.length > 16) throw new Error('Keep it to 16 UTF-16 units or fewer');
        var units = [], labels = [];
        for (var i = 0; i < s.length; i++) { units.push(s.charCodeAt(i)); labels.push(String(i)); }
        function shown(k) { var u = units[k]; if (u >= 0xD800 && u <= 0xDBFF) return 'hi-sur'; if (u >= 0xDC00 && u <= 0xDFFF) return 'lo-sur'; if (u < 32) return '\\u' + u.toString(16); return String.fromCharCode(u); }
        var cells = units.map(function (_, k) { return shown(k); });
        var f = [], cps = [], utf8 = 0;
        f.push({ narr: 'Java stores <b>"' + H.esc(s) + '"</b> as <b>' + s.length + '</b> UTF-16 code units (chars). That is what <code>length()</code> returns.', parts: [{ type: 'array', label: 'char[] inside the String', values: cells, idxLabels: labels }, { type: 'array', label: 'hex value of each char', values: units.map(function (u) { return hex(u, 4); }), idxLabels: labels }] });
        i = 0;
        while (i < s.length) {
          var u = units[i], hl = {}, cp, kind, w;
          if (u >= 0xD800 && u <= 0xDBFF && i + 1 < s.length && units[i + 1] >= 0xDC00 && units[i + 1] <= 0xDFFF) {
            cp = (u - 0xD800) * 0x400 + (units[i + 1] - 0xDC00) + 0x10000; hl[i] = 'sel'; hl[i + 1] = 'sel'; w = 2;
            kind = 'a <b>surrogate pair</b>: high ' + hex(u, 4) + ' + low ' + hex(units[i + 1], 4) + ' → code point (' + hex(u, 4) + ' − 0xD800) × 0x400 + (' + hex(units[i + 1], 4) + ' − 0xDC00) + 0x10000 = <b>U+' + cp.toString(16).toUpperCase() + '</b> (' + cp + '). <code>charAt(' + i + ')</code> alone would give you only half of it!';
          } else {
            cp = u; hl[i] = 'cur'; w = 1;
            kind = (u >= 0xD800 && u <= 0xDFFF) ? 'an <b>unpaired surrogate</b> ' + hex(u, 4) + ' — half of a character with no partner. This is broken text (it prints as ?); it usually comes from cutting a String in the middle of an emoji.' : (u < 128 ? 'plain <b>ASCII</b>' : 'a single char in the Basic Multilingual Plane') + ': code point <b>U+' + cp.toString(16).toUpperCase().padStart(4, '0') + '</b> (' + cp + ').';
          }
          var b = cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
          utf8 += b;
          cps.push(String.fromCodePoint(cp));
          var parts = [{ type: 'array', label: 'chars', values: cells, idxLabels: labels, hl: hl, ptr: (function () { var o = {}; o[i] = 'i'; return o; })() }];
          parts.push({ type: 'bits', label: 'charAt(' + i + ') as 16 bits', value: u, width: 16, dec: u });
          parts.push({ type: 'vars', label: 'this character', vals: { 'code point': 'U+' + cp.toString(16).toUpperCase(), 'chars used': w, 'UTF-8 bytes': b }, hl: { 'chars used': w === 2 ? 'sel' : 'ok' } });
          parts.push({ type: 'set', label: 'code points so far', items: cps.slice() });
          f.push({ narr: 'Index ' + i + ': ' + kind + (w === 2 ? ' Loop with <code>i += Character.charCount(cp)</code> to jump over both halves.' : ''), parts: parts });
          i += w;
        }
        f.push({ narr: 'Totals: <code>length()</code> = <b>' + s.length + '</b>, <code>codePointCount</code> = <b>' + cps.length + '</b>, UTF-8 size = <b>' + utf8 + ' bytes</b>. Use code points when you count, reverse or truncate user-visible text.', parts: [{ type: 'table', label: 'Three ways to measure "' + H.esc(s) + '"', columns: ['measure', 'value', 'Java'], rows: [['UTF-16 units', String(s.length), 's.length()'], ['code points', String(cps.length), 's.codePointCount(0, s.length())'], ['UTF-8 bytes', String(utf8), 's.getBytes(UTF_8).length']], hl: { 1: 'sel' } }] });
        f.push({ narr: 'The safe loop pattern in Java: read a whole code point, handle it, then advance by <code>Character.charCount(cp)</code> (1 or 2). Or simply use <code>s.codePoints()</code>.', parts: [{ type: 'code', label: 'Iterate by code point', lang: 'java', code: 'for (int i = 0; i < s.length(); ) {\n    int cp = s.codePointAt(i);      // whole character\n    System.out.println(Character.getName(cp));\n    i += Character.charCount(cp);   // 1 or 2 chars\n}', hl: { 2: 'ok', 4: 'ok' } }] });
        return f;
      }
    }, {
      title: 'char arithmetic: Caesar cipher step by step',
      input: 'Zebra 3',
      inputLabel: 'word and shift (letters only in the word, shift 0..25)',
      gen: function (input) {
        var m = String(input).trim().match(/^(\S{1,10})\s+(\d{1,2})$/);
        if (!m) throw new Error('Format: word shift, e.g. "Zebra 3" (word up to 10 chars)');
        var w = m[1], k = Number(m[2]);
        if (k > 25) throw new Error('Shift must be 0..25');
        var out = [], f = [];
        var code = 'char base = Character.isUpperCase(c) ? \'A\' : \'a\';\nint idx = c - base;            // 0..25\nint moved = (idx + k) % 26;    // wrap around\nchar r = (char) (base + moved);';
        f.push({ narr: 'Shift every letter of <b>' + H.esc(w) + '</b> by <b>' + k + '</b>, wrapping z → a. All we need is the fact that chars are numbers.', parts: [{ type: 'array', label: 'input', values: w.split('') }, { type: 'code', label: 'per character', lang: 'java', code: code }] });
        for (var i = 0; i < w.length; i++) {
          var c = w.charCodeAt(i), ch = w[i];
          var up = c >= 65 && c <= 90, lo = c >= 97 && c <= 122;
          if (!up && !lo) { out.push(ch); f.push({ narr: '<b>' + H.esc(ch) + '</b> is not an ASCII letter, so it is copied unchanged.', parts: [{ type: 'array', label: 'input', values: w.split(''), hl: (function () { var o = {}; o[i] = 'done'; return o; })() }, { type: 'array', label: 'output', values: out.slice() }] }); continue; }
          var base = up ? 65 : 97, idx = c - base, mv = (idx + k) % 26, r = String.fromCharCode(base + mv);
          out.push(r);
          f.push({ narr: '\'' + ch + '\' = ' + c + '. base = \'' + String.fromCharCode(base) + '\' (' + base + '). idx = ' + c + ' − ' + base + ' = ' + idx + '. (' + idx + ' + ' + k + ') % 26 = ' + mv + (idx + k >= 26 ? ' <span class="c-y">(wrapped!)</span>' : '') + '. ' + base + ' + ' + mv + ' = ' + (base + mv) + ' → <b>\'' + r + '\'</b>.', parts: [{ type: 'array', label: 'input', values: w.split(''), hl: (function () { var o = {}; o[i] = 'cur'; return o; })() }, { type: 'vars', label: 'numbers behind the letters', vals: { c: c, base: base, idx: idx, moved: mv, 'r': '\'' + r + '\' (' + (base + mv) + ')' }, hl: { moved: idx + k >= 26 ? 'sel' : 'ok' } }, { type: 'code', label: 'per character', lang: 'java', code: code, hl: { 3: 'cur', 4: 'ok' } }, { type: 'array', label: 'output', values: out.slice(), hl: (function () { var o = {}; o[out.length - 1] = 'ok'; return o; })() }] });
        }
        f.push({ narr: 'Result: <b>' + H.esc(out.join('')) + '</b>. Decoding is the same with shift <b>' + ((26 - k) % 26) + '</b>. Note the cast <code>(char)</code>: <code>base + moved</code> is an int.', parts: [{ type: 'array', label: 'encrypted', values: out.slice(), hl: (function () { var o = {}; for (var q = 0; q < out.length; q++) o[q] = 'sel'; return o; })() }] });
        return f;
      }
    }],
    examples: [
      { title: 'Predict the output: char meets int and String', html: R`<p>A cast binds tighter than <code>+</code>, so <code>(char) 97 + 1</code> is <code>'a' + 1</code> = 98 (int). Output:</p><pre>98
b
a1
c</pre>`, code: R`
System.out.println((char) 97 + 1);      // 98
System.out.println((char) (97 + 1));    // b
System.out.println("" + (char) 97 + 1); // a1
char c = 'a';
c += 1;
c++;
System.out.println(c);                  // c` },
      { title: 'Toggle ASCII case with one XOR', html: R`<p>'A' = 0100 0001, 'a' = 0110 0001: they differ only in bit 5 (value 32). <code>c ^ 32</code> flips it. Works only for ASCII letters — for 'é' or 'ß' use <code>Character.toUpperCase</code> / <code>String.toUpperCase(Locale.ROOT)</code> ("Straße".toUpperCase() is "STRASSE", one letter becomes two!).</p>${H.bits(65, 8, { label: "'A'", hl: { 5: 'y' } })}${H.bits(97, 8, { label: "'a'", hl: { 5: 'y' } })}`, code: R`
String s = "Hello World";
StringBuilder sb = new StringBuilder();
for (char ch : s.toCharArray())
    sb.append(Character.isLetter(ch) && ch < 128 ? (char) (ch ^ 32) : ch);
System.out.println(sb);    // hELLO wORLD` },
      { title: 'Emoji break naive code', html: R`<p><code>substring(0, 1)</code> on "😀!" returns a lone high surrogate — an invalid half character that prints as <code>?</code>. Loop by code points instead.</p>`, code: R`
String s = "\uD83D\uDE00!";                    // grinning face + '!'
System.out.println(s.length());                // 3
String half = s.substring(0, 1);
System.out.println(Character.isHighSurrogate(half.charAt(0)));   // true: broken text
int firstEnd = s.offsetByCodePoints(0, 1);     // index after the first code point
System.out.println(s.substring(0, firstEnd).codePointCount(0, firstEnd)); // 1 whole emoji
for (int i = 0; i < s.length(); ) {
    int cp = s.codePointAt(i);
    System.out.println("U+" + Integer.toHexString(cp).toUpperCase());     // U+1F600, U+21
    i += Character.charCount(cp);
}` },
      { title: 'The unicode-escape trap', html: R`<p>javac converts <code>\uXXXX</code> escapes <b>before</b> it even looks for comments and strings. So <code>\u000a</code> (newline) inside a comment ends the comment, and the rest of the line becomes code! Similarly <code>char c = '\u000a';</code> is a compile error (it becomes a real line break inside the quotes) — write <code>'\n'</code>. This program prints <code>surprise</code>:</p>`, code: R`
public class Trap {
    public static void main(String[] args) {
        // the next escape is a newline: \u000a System.out.println("surprise");
    }
}` }
    ],
    deepDive: R`<h4>Why Java has 16-bit chars</h4>
<p>Java (1995) adopted Unicode when it was believed 65,536 code points would be enough (UCS-2). Unicode 2.0 (1996) expanded to 1,114,112 code points, and Java 5 (2004) added surrogate-pair support and the code-point APIs. Hence the split personality: <code>char</code> = UTF-16 code unit, <code>int</code> = code point.</p>
<h4>Grapheme clusters: what users call a "character"</h4>
<p>Even code points are not the end: "👍🏽" is thumbs-up + skin-tone modifier (2 code points, 4 chars); "é" can be one code point (U+00E9) or 'e' + combining accent (U+0065 U+0301); family emoji join several people with zero-width joiners. For cursor movement, truncation and "max 280 characters" rules, use <code>java.text.BreakIterator.getCharacterInstance()</code> or regex <code>\X</code>, and normalize with <code>java.text.Normalizer</code> (NFC) before comparing.</p>
<h4>How Strings are stored now (compact strings)</h4>
<p>Since Java 9, a <code>String</code> holds a <code>byte[]</code> plus a <i>coder</i> flag: if every char fits in Latin-1 (≤ 0xFF), it uses <b>1 byte per char</b>; otherwise 2 bytes per char (UTF-16). The API still behaves as UTF-16 — this is invisible except in memory savings (often ~40% of heap in string-heavy apps).</p>
<h4>chars vs bytes: encodings</h4>
<p>Files and networks carry <b>bytes</b>. Converting needs a charset: <code>s.getBytes(StandardCharsets.UTF_8)</code> and <code>new String(bytes, StandardCharsets.UTF_8)</code>. UTF-8 uses 1 byte for ASCII, 2 for most European/Middle-Eastern letters, 3 for the rest of the BMP (Hindi, CJK, '☕'), 4 for supplementary (emoji). Since JDK 18 the default charset is UTF-8 everywhere (JEP 400), ending the "works on Linux, garbled on Windows" era — but always pass the charset explicitly anyway.</p>
<h4>Unicode-aware gotchas</h4>
<ul><li><code>Character.isDigit('\u0663')</code> is true (Arabic-Indic three) and <code>Integer.parseInt</code> accepts such digits — validate with <code>[0-9]</code> if you need ASCII only.</li>
<li><code>toUpperCase()</code> without a locale is locale-sensitive: in Turkish, "i".toUpperCase() is "İ". Use <code>Locale.ROOT</code> for identifiers and protocol keywords.</li>
<li><code>String.length()</code> limits in databases/APIs may count bytes, UTF-16 units or code points — know which.</li></ul>`,
    aiEra: R`<p><b>What AI changes:</b> LLMs themselves read text as <b>tokens</b>, not characters, which is why they famously miscount letters in a word. Treat any character-level claim from a model ("this string has 12 characters") as unverified.</p>
<p><b>Use AI as a partner:</b> <code>Write JUnit tests for my truncate() with emoji, combining accents, Turkish i and CJK</code>; <code>Explain the UTF-8 bytes of this string</code>. Use it to look up Unicode properties and character names quickly — then confirm with <code>Character.getName(cp)</code>.</p>
<p><b>Where AI goes wrong:</b> generated string utilities almost always iterate with <code>charAt</code> and <code>length()</code>, which splits emoji; they use <code>c - 'a'</code> on input that may contain capitals or non-letters (negative index → crash); they call <code>toUpperCase()</code> without a locale; and they forget to specify UTF-8 when converting to bytes.</p>
<p><b>What you must still own:</b> knowing that char is a 16-bit number, the ASCII ranges, the difference between code units, code points and graphemes, and when each matters. Prompt and token limits, search indexes and username validation in AI products all hinge on exactly this.</p>`,
    problems: [{
      title: 'Reverse a String Without Breaking Emoji',
      level: 'Medium', tags: ['unicode', 'strings', 'two pointers'], companies: ['Meta', 'Apple', 'Twitter/X', 'Microsoft'],
      statement: R`<p>Reverse a string by <b>code points</b>: each Unicode character (including emoji outside the BMP) must stay intact. Do not use <code>StringBuilder.reverse()</code> — implement it yourself.</p>`,
      constraints: R`0 ≤ length ≤ 10<sup>5</sup> UTF-16 units; the input is well-formed (no unpaired surrogates).`,
      example: R`<p>Input <code>"ab😀"</code> = chars <code>['a', 'b', 0xD83D, 0xDE00]</code>.</p>${H.table(['approach', 'result'], [['reverse chars', H.c('r', "['\\uDE00', '\\uD83D', 'b', 'a'] → broken pair (prints ??ba)")], ['reverse code points', H.c('g', '"😀ba"')]])}`,
      brute: { why: R`<p>Swapping <code>char</code>s from both ends is the textbook reverse — but it puts the low surrogate before the high one, producing invalid UTF-16 that prints as <code>??</code>.</p>`, code: R`
static String reverseChars(String s) {
    char[] a = s.toCharArray();
    for (int i = 0, j = a.length - 1; i < j; i++, j--) {
        char t = a[i]; a[i] = a[j]; a[j] = t;     // splits surrogate pairs!
    }
    return new String(a);
}` },
      mcq: { q: 'How do you move to the next character when looping by code points?', options: ['i++', 'i += 2', 'i += Character.charCount(s.codePointAt(i))', 'i += s.codePointAt(i)'], answer: 2, explain: 'charCount returns 1 for BMP code points and 2 for supplementary ones.' },
      hints: [R`<p>Hint 1: <code>s.codePoints().toArray()</code> gives an <code>int[]</code> where every element is one whole character.</p>`, R`<p>Hint 2: reverse that int array (two pointers), then rebuild the String with <code>new String(int[] codePoints, 0, n)</code> or <code>StringBuilder.appendCodePoint</code>.</p>`, R`<p>Hint 3: without an extra int array: walk from the end — <code>cp = s.codePointBefore(i)</code>, append it, <code>i -= Character.charCount(cp)</code>. Test "", "a", "😀", "ab😀c😀".</p>`],
      solution: {
        approach: R`<p>Walk backwards by code point using <code>codePointBefore</code>, appending each whole character to a <code>StringBuilder</code>. Single pass, no surrogate maths by hand.</p>`,
        code: R`
public class ReverseCodePoints {
    static String reverse(String s) {
        StringBuilder sb = new StringBuilder(s.length());
        int i = s.length();
        while (i > 0) {
            int cp = s.codePointBefore(i);     // whole character ending at i
            sb.appendCodePoint(cp);
            i -= Character.charCount(cp);      // 1 or 2 chars
        }
        return sb.toString();
    }
    public static void main(String[] args) {
        String in = "ab\uD83D\uDE00c";         // a b grinning-face c
        String out = reverse(in);
        System.out.println(out.codePointCount(0, out.length()));      // 4
        out.codePoints().forEach(cp -> System.out.print(Integer.toHexString(cp) + " "));
        System.out.println();                                         // 63 1f600 62 61
        System.out.println(new StringBuilder(in).reverse().toString().equals(out)); // true: JDK also respects pairs
    }
}`,
        dry: { head: ['i', 'codePointBefore(i)', 'charCount', 'sb'], rows: [['5', "'c' (0x63)", '1', 'c'], ['4', 'U+1F600 (chars 2-3)', '2', 'c😀'], ['2', "'b'", '1', 'c😀b'], ['1', "'a'", '1', 'c😀ba'], ['0', '—', '—', '<span class="c-g">done</span>']] },
        complexity: R`<p>O(N) time, O(N) space for the output.</p>`,
        followUps: ['Make it keep grapheme clusters (👍🏽, flags, accented letters) intact using <code>BreakIterator</code>.', 'Reverse in place in a <code>char[]</code>: reverse all chars, then swap back each reversed surrogate pair.']
      }
    }]
  });

  /* ======================================================================
     PRACTICE — Easy
     ====================================================================== */
  practice.push({
    title: 'Celsius to Fahrenheit: Fix the Integer Division',
    level: 'Easy', tags: ['operators', 'casting', 'integer division'], companies: ['TCS', 'Infosys', 'Accenture'],
    statement: R`<p>A teammate wrote <code>return 9 / 5 * c + 32;</code> to convert an <code>int</code> Celsius value to Fahrenheit, and every result is off. Implement <code>static double toF(int c)</code> that returns the exact value of <code>c × 9 / 5 + 32</code> as a double.</p>`,
    constraints: R`−273 ≤ c ≤ 10<sup>6</sup>.`,
    example: R`${H.table(['c', 'buggy 9 / 5 * c + 32', 'correct'], [['100', H.c('r', '132'), H.c('g', '212.0')], ['37', H.c('r', '69'), H.c('g', '98.6')], ['-40', H.c('r', '-8'), H.c('g', '-40.0')]])}<p><code>9 / 5</code> is <b>int division = 1</b>, so the buggy code computes c + 32.</p>`,
    brute: { why: R`<p>The buggy version divides two ints first: 9 / 5 = 1. Moving the division later (<code>c * 9 / 5 + 32</code>) helps but still truncates: 37 → 333 / 5 = 66 → 98 instead of 98.6. Integer division throws away information as soon as it happens.</p>`, code: R`
static double toFBuggy(int c) {
    return 9 / 5 * c + 32;          // 9 / 5 == 1 -> returns c + 32 (widened to double)
}` },
    mcq: { q: 'Which expression gives 98.6 for c = 37?', options: ['c * 9 / 5 + 32', '(double) (c * 9 / 5) + 32', 'c * 9.0 / 5 + 32', '9 / 5 * (double) c + 32'], answer: 2, explain: 'Only option 3 makes the division a double division: 333.0 / 5 = 66.6. Option 2 casts after the int division already truncated; option 4 still computes 9 / 5 = 1 first.' },
    hints: [R`<p>Hint 1: in <code>a / b</code>, if both are ints, the fraction is dropped <i>at that moment</i>. Later casts cannot bring it back.</p>`, R`<p>Hint 2: make one operand a double <b>before</b> dividing: a literal <code>9.0</code> or a cast <code>(double) c</code>.</p>`, R`<p>Hint 3: recipe — <code>return c * 9.0 / 5 + 32;</code>. Test 100 → 212.0, −40 → −40.0, 37 → 98.6.</p>`],
    solution: {
      approach: R`<p>Promote to double before the division. Evaluation is left to right: <code>c * 9.0</code> is double, so <code>/ 5</code> is double division.</p>`,
      code: R`
public class Temperature {
    static double toF(int c) {
        return c * 9.0 / 5 + 32;    // 9.0 makes the whole chain double maths
    }
    public static void main(String[] args) {
        System.out.println(toF(100));   // 212.0
        System.out.println(toF(37));    // 98.6
        System.out.println(toF(-40));   // -40.0
    }
}`,
      dry: { head: ['c', 'c * 9.0', '/ 5', '+ 32'], rows: [['37', '333.0', '66.6', '98.6'], ['-40', '-360.0', '-72.0', '-40.0']] },
      complexity: R`<p>O(1) time and O(1) space — a fixed number of operations.</p>`,
      followUps: ['Round to one decimal place for display: <code>String.format("%.1f", f)</code>.', 'Why might <code>toF(x) == 98.6</code> be risky in general?']
    }
  });

  practice.push({
    title: 'Seat Label: char + int Is Not a String',
    level: 'Easy', tags: ['char', 'string concatenation', 'operators'], companies: ['Amazon', 'Booking.com'],
    statement: R`<p>A cinema labels seats by row letter and seat number: row <code>'C'</code>, seat <code>7</code> → <code>"C7"</code>. The current code <code>return row + seat + "";</code> returns <code>"74"</code>. Write <code>static String label(char row, int seat)</code> correctly, and <code>static char nextRow(char row)</code> returning the following row letter (assume row &lt; 'Z').</p>`,
    constraints: R`<code>'A' ≤ row ≤ 'Y'</code>, 1 ≤ seat ≤ 999.`,
    example: R`${H.table(['call', 'buggy', 'correct'], [["label('C', 7)", H.c('r', '"74"'), H.c('g', '"C7"')], ["label('A', 12)", H.c('r', '"77"'), H.c('g', '"A12"')], ["nextRow('C')", H.c('r', '68 (int)'), H.c('g', "'D'")]])}<p>'C' is 67; 67 + 7 = 74, then 74 + "" = "74".</p>`,
    brute: { why: R`<p><code>row + seat</code> is evaluated first, and char + int is <b>numeric</b> addition. The String only joins at the end, too late. Similarly <code>row + 1</code> is an int, not a char.</p>`, code: R`
static String labelBuggy(char row, int seat) {
    return row + seat + "";          // (67 + 7) + "" = "74"
}` },
    mcq: { q: "What does <code>'A' + 'B' + \"!\"</code> evaluate to?", options: ['"AB!"', '"131!"', '"A66!"', 'compile error'], answer: 1, explain: "'A' + 'B' = 65 + 66 = 131 (int), then 131 + \"!\" = \"131!\"." },
    hints: [R`<p>Hint 1: <code>+</code> is evaluated left to right; it only means "join text" once one side is already a String.</p>`, R`<p>Hint 2: start with a String: <code>"" + row + seat</code>, or <code>String.valueOf(row) + seat</code>, or <code>Character.toString(row) + seat</code>.</p>`, R`<p>Hint 3: for the next row, compute the int and cast back: <code>(char) (row + 1)</code>. Or use <code>row++</code> on a local copy, which casts implicitly.</p>`],
    solution: {
      approach: R`<p>Force string context from the first operand; cast arithmetic results back to <code>char</code>.</p>`,
      code: R`
public class Seats {
    static String label(char row, int seat) {
        return String.valueOf(row) + seat;   // "C" + 7 = "C7"
    }
    static char nextRow(char row) {
        return (char) (row + 1);             // 67 + 1 = 68 -> 'D'
    }
    public static void main(String[] args) {
        System.out.println(label('C', 7));    // C7
        System.out.println(label('A', 12));   // A12
        System.out.println(nextRow('C'));     // D
        System.out.println('C' + 7 + "");     // 74 (the bug)
    }
}`,
      dry: { head: ['expression', 'step 1', 'step 2', 'result'], rows: [["row + seat + \"\"", '67 + 7 = 74', '74 + ""', '"74"'], ['String.valueOf(row) + seat', '"C"', '"C" + 7', '"C7"']] },
      complexity: R`<p>O(1) time and space (the label is a tiny string).</p>`,
      followUps: ['Generate all labels A1..E10 with nested loops over <code>char</code> and <code>int</code>.', 'What prints for <code>System.out.println(\'C\' + "" + 7);</code>?']
    }
  });

  practice.push({
    title: 'Digit Sum That Survives Integer.MIN_VALUE',
    level: 'Easy', tags: ['operators', 'overflow', 'digits'], companies: ['Microsoft', 'Goldman Sachs'],
    statement: R`<p>Return the sum of the decimal digits of any <code>int n</code>, ignoring the sign. Your code must be correct for <code>Integer.MIN_VALUE</code> too.</p>`,
    constraints: R`−2<sup>31</sup> ≤ n ≤ 2<sup>31</sup> − 1.`,
    example: R`${H.table(['n', 'digit sum'], [['4096', '19'], ['-123', '6'], ['0', '0'], ['-2147483648', H.c('y', '47')]])}`,
    brute: { why: R`<p>The usual first step <code>n = Math.abs(n)</code> fails for MIN_VALUE: its absolute value does not fit in int, so <code>Math.abs</code> returns MIN_VALUE (still negative). Then <code>while (n &gt; 0)</code> never runs and the answer is 0.</p>`, code: R`
static int digitSumBrute(int n) {
    n = Math.abs(n);                 // MIN_VALUE stays negative!
    int s = 0;
    while (n > 0) { s += n % 10; n /= 10; }
    return s;                        // 0 for MIN_VALUE
}` },
    mcq: { q: 'What is <code>-123 % 10</code> in Java?', options: ['3', '-3', '7', '0'], answer: 1, explain: '% keeps the sign of the dividend: −123 = −12 × 10 + (−3).' },
    hints: [R`<p>Hint 1: you do not need to make n positive. Java's <code>%</code> on a negative number gives a negative digit (e.g. −3).</p>`, R`<p>Hint 2: loop while <code>n != 0</code> and add <code>Math.abs(n % 10)</code> — a single digit's absolute value is always safe.</p>`, R`<p>Hint 3: alternative: widen first, <code>long m = Math.abs((long) n)</code>. Test 0, −1, MIN_VALUE (47), MAX_VALUE (46).</p>`],
    solution: {
      approach: R`<p>Process the number with its sign; take the absolute value of each digit only. Never negates MIN_VALUE, so no overflow.</p>`,
      code: R`
public class DigitSum {
    static int digitSum(int n) {
        int s = 0;
        while (n != 0) {
            s += Math.abs(n % 10);   // digit in -9..9, abs is safe
            n /= 10;                 // truncates toward zero, reaches 0 from either side
        }
        return s;
    }
    public static void main(String[] args) {
        System.out.println(digitSum(4096));               // 19
        System.out.println(digitSum(-123));               // 6
        System.out.println(digitSum(Integer.MIN_VALUE));  // 47
        System.out.println(digitSum(Integer.MAX_VALUE));  // 46
    }
}`,
      dry: { head: ['n', 'n % 10', 'abs', 's'], rows: [['-123', '-3', '3', '3'], ['-12', '-2', '2', '5'], ['-1', '-1', '1', '6'], ['0', '—', '—', '<span class="c-g">6</span>']] },
      complexity: R`<p>O(number of digits) ≤ 10 iterations, O(1) space.</p>`,
      followUps: ['Return the digital root (repeat until one digit) in O(1) with <code>1 + (s − 1) % 9</code>.', 'Do the same for <code>long</code>.']
    }
  });

  practice.push({
    title: 'Alphabet Position Encoder',
    level: 'Easy', tags: ['char', 'ascii', 'strings'], companies: ['Codewars classic', 'Zoho'],
    statement: R`<p>Replace every English letter in a string by its position in the alphabet (a/A = 1 … z/Z = 26), separated by single spaces. Ignore every other character.</p>`,
    constraints: R`0 ≤ length ≤ 10<sup>5</sup>; ASCII input.`,
    example: R`<p><code>"Java 21!"</code> → <code>"10 1 22 1"</code> (J=10, a=1, v=22, a=1; digits, space and ! ignored).</p>${H.arr(['J', 'a', 'v', 'a', ' ', '2', '1', '!'], { hl: { 0: 'g', 1: 'g', 2: 'g', 3: 'g', 4: 'm', 5: 'm', 6: 'm', 7: 'm' } })}`,
    brute: { why: R`<p>Searching each character in a 26-letter string with <code>indexOf</code> works (O(26) per char) and needs two alphabets for upper/lower case. It ignores the key fact: letters are consecutive numbers, so the position is just a subtraction.</p>`, code: R`
static String encodeBrute(String s) {
    String lower = "abcdefghijklmnopqrstuvwxyz";
    StringBuilder sb = new StringBuilder();
    for (char c : s.toCharArray()) {
        int p = lower.indexOf(Character.toLowerCase(c));
        if (p >= 0) { if (sb.length() > 0) sb.append(' '); sb.append(p + 1); }
    }
    return sb.toString();
}` },
    mcq: { q: "Position of uppercase <code>c</code> is…", options: ["c - 'A'", "c - 'A' + 1", "c - 64 - 1", "(char) c"], answer: 1, explain: "'A' − 'A' = 0, so add 1 for 1-based positions. (c − 64 is equivalent, but magic numbers hurt readability.)" },
    hints: [R`<p>Hint 1: <code>'a'..'z'</code> are 97..122 and <code>'A'..'Z'</code> are 65..90 — two contiguous ranges.</p>`, R`<p>Hint 2: for a lowercase letter the position is <code>c - 'a' + 1</code>; for uppercase <code>c - 'A' + 1</code>. Or lowercase first with <code>c | 32</code> for ASCII letters.</p>`, R`<p>Hint 3: use a <code>StringBuilder</code> and add a space only before every number except the first. Empty input → empty output.</p>`],
    solution: {
      approach: R`<p>One pass. Range-check each char, subtract the base letter, append to a StringBuilder with separators.</p>`,
      code: R`
public class AlphabetPosition {
    static String encode(String s) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            int pos;
            if (c >= 'a' && c <= 'z') pos = c - 'a' + 1;
            else if (c >= 'A' && c <= 'Z') pos = c - 'A' + 1;
            else continue;                          // not a letter: skip
            if (sb.length() > 0) sb.append(' ');
            sb.append(pos);
        }
        return sb.toString();
    }
    public static void main(String[] args) {
        System.out.println(encode("Java 21!"));   // 10 1 22 1
        System.out.println(encode("Zz"));         // 26 26
        System.out.println("[" + encode("123") + "]");  // []
    }
}`,
      dry: { head: ['c', 'code', 'range', 'pos'], rows: [["'J'", '74', 'upper', '74 − 65 + 1 = 10'], ["'a'", '97', 'lower', '1'], ["'v'", '118', 'lower', '22'], ["'2'", '50', 'none', 'skip']] },
      complexity: R`<p>O(N) time, O(N) output.</p>`,
      followUps: ['Decode: turn "10 1 22 1" back into "java".', 'Make it Unicode-aware for accented letters — what should "é" map to?']
    }
  });

  /* ======================================================================
     PRACTICE — Medium
     ====================================================================== */
  practice.push({
    title: 'Overflow-Safe Average of Two Ints',
    level: 'Medium', tags: ['overflow', 'bit manipulation'], companies: ['Google', 'Nvidia', 'Jane Street'],
    statement: R`<p>Return <b>floor((a + b) / 2)</b> for any two ints, without using <code>long</code>, <code>double</code> or <code>BigInteger</code>.</p>`,
    constraints: R`−2<sup>31</sup> ≤ a, b ≤ 2<sup>31</sup> − 1.`,
    example: R`${H.table(['a, b', '(a + b) / 2 in Java', 'correct floor average'], [['2147483647, 2147483647', H.c('r', '-1'), H.c('g', '2147483647')], ['-3, 0', H.c('r', '-1 (truncated)'), H.c('g', '-2')], ['4, 7', '5', '5']])}`,
    brute: { why: R`<p><code>(a + b) / 2</code> overflows when the sum leaves int range, and <code>/</code> rounds toward zero instead of down for negative sums. <code>a + (b − a) / 2</code> fixes overflow only when a and b have the same sign (b − a itself can overflow).</p>`, code: R`
static int avgBrute(int a, int b) {
    return (a + b) / 2;      // overflows; also rounds toward zero
}` },
    mcq: { q: 'Why does <code>(a &amp; b) + ((a ^ b) &gt;&gt; 1)</code> work?', options: ['It is a random trick', 'a + b = 2·(a &amp; b) + (a ^ b): shared bits counted twice plus differing bits once, so halve each part separately', 'It uses unsigned arithmetic', 'It only works for positives'], answer: 1, explain: 'AND gives the carries (bits in both), XOR the bits in exactly one. Halving 2·(a&amp;b) is exact; halving (a^b) with &gt;&gt; floors. No intermediate exceeds the range.' },
    hints: [R`<p>Hint 1: binary addition: <code>a + b == 2 * (a &amp; b) + (a ^ b)</code> — the common bits are the carries.</p>`, R`<p>Hint 2: divide both parts by 2 separately: <code>(a &amp; b)</code> + <code>(a ^ b) &gt;&gt; 1</code>. The signed shift floors, which is exactly what we want.</p>`, R`<p>Hint 3: test (MAX, MAX), (MIN, MIN), (MIN, MAX) → −1, (−3, 0) → −2, (4, 7) → 5.</p>`],
    solution: {
      approach: R`<p>Split the sum into carry bits and non-carry bits; halve each without ever forming the full sum. The arithmetic shift <code>&gt;&gt;</code> gives floor division by 2 for negatives too.</p>`,
      code: R`
public class SafeAverage {
    static int floorAvg(int a, int b) {
        return (a & b) + ((a ^ b) >> 1);
    }
    public static void main(String[] args) {
        System.out.println(floorAvg(Integer.MAX_VALUE, Integer.MAX_VALUE)); // 2147483647
        System.out.println(floorAvg(Integer.MIN_VALUE, Integer.MIN_VALUE)); // -2147483648
        System.out.println(floorAvg(Integer.MIN_VALUE, Integer.MAX_VALUE)); // -1
        System.out.println(floorAvg(-3, 0));   // -2
        System.out.println(floorAvg(4, 7));    // 5
    }
}`,
      dry: { head: ['a, b', 'a &amp; b', 'a ^ b', '(a^b) &gt;&gt; 1', 'result'], rows: [['4, 7', '4', '3', '1', '5'], ['-3, 0', '0', '-3', '-2', '-2'], ['MAX, MAX', 'MAX', '0', '0', 'MAX']] },
      complexity: R`<p>O(1) time and O(1) space — a fixed number of operations.</p>`,
      followUps: ['Ceiling average: <code>(a | b) - ((a ^ b) &gt;&gt; 1)</code>. Why?', 'For non-negative ints, why is <code>(a + b) &gt;&gt;&gt; 1</code> enough?']
    }
  });

  practice.push({
    title: 'String to Integer (atoi) with Clamping',
    level: 'Medium', tags: ['overflow', 'parsing', 'char'], companies: ['Amazon', 'Microsoft', 'Meta', 'Uber'],
    statement: R`<p>Implement <code>myAtoi(String s)</code>: skip leading spaces, read an optional <code>+</code>/<code>-</code>, then read digits until a non-digit. Return the number, <b>clamped</b> to [−2<sup>31</sup>, 2<sup>31</sup> − 1]. If no digits are read, return 0. Do not use <code>long</code> or library parsers.</p>`,
    constraints: R`0 ≤ length ≤ 200; letters, digits, ' ', '+', '-', '.'.`,
    example: R`${H.table(['s', 'result'], [['"42"', '42'], ['"   -042abc"', '-42'], ['"words 99"', '0'], ['"91283472332"', H.c('y', '2147483647 (clamped)')], ['"-91283472332"', H.c('y', '-2147483648 (clamped)')], ['"+-12"', '0']])}`,
    brute: { why: R`<p>Extract the digit substring and call <code>Integer.parseInt</code> inside try/catch, clamping in the catch. It cannot tell whether a <code>NumberFormatException</code> came from overflow or from bad input, needs special handling of signs, and uses exceptions for control flow.</p>`, code: R`
static int atoiBrute(String s) {
    s = s.stripLeading();
    int i = 0;
    if (i < s.length() && (s.charAt(i) == '+' || s.charAt(i) == '-')) i++;
    int j = i;
    while (j < s.length() && Character.isDigit(s.charAt(j))) j++;
    if (j == i) return 0;
    String num = s.substring(0, j);
    try { return Integer.parseInt(num); }
    catch (NumberFormatException e) { return num.startsWith("-") ? Integer.MIN_VALUE : Integer.MAX_VALUE; }
}` },
    mcq: { q: 'Positive case: <code>res = 214748364</code>, next digit 8. What should happen?', options: ['res becomes 2147483648', 'clamp: return 2147483647', 'return 0', 'throw'], answer: 1, explain: 'res == MAX / 10 and digit 8 &gt; 7 means the next step exceeds MAX_VALUE → clamp.' },
    hints: [R`<p>Hint 1: three phases with one index: skip spaces, read sign, read digits with <code>c - '0'</code>.</p>`, R`<p>Hint 2: before <code>res = res * 10 + d</code> check <code>res &gt; (MAX - d) / 10</code> — if true, the next step overflows; return MAX or MIN depending on sign.</p>`, R`<p>Hint 3: build the positive magnitude and apply the sign at the end. MIN_VALUE's magnitude is MAX + 1, which clamping handles: for "-2147483648" the check fires and returns MIN.</p>`],
    solution: {
      approach: R`<p>Single scan with an overflow check before each multiply-add: <code>res &gt; (Integer.MAX_VALUE − d) / 10</code> is exact integer reasoning that never overflows.</p>`,
      code: R`
public class Atoi {
    static int myAtoi(String s) {
        int i = 0, n = s.length();
        while (i < n && s.charAt(i) == ' ') i++;          // 1. spaces
        int sign = 1;
        if (i < n && (s.charAt(i) == '+' || s.charAt(i) == '-')) {
            sign = s.charAt(i) == '-' ? -1 : 1;           // 2. sign
            i++;
        }
        int res = 0;
        while (i < n && s.charAt(i) >= '0' && s.charAt(i) <= '9') {   // 3. digits
            int d = s.charAt(i) - '0';
            if (res > (Integer.MAX_VALUE - d) / 10)       // res*10 + d would exceed MAX
                return sign == 1 ? Integer.MAX_VALUE : Integer.MIN_VALUE;
            res = res * 10 + d;
            i++;
        }
        return sign * res;
    }
    public static void main(String[] args) {
        String[] tests = {"42", "   -042abc", "words 99", "91283472332", "-91283472332", "+-12", "-2147483648", "2147483647"};
        for (String t : tests) System.out.println("\"" + t + "\" -> " + myAtoi(t));
    }
}`,
      dry: { head: ['char', 'd', 'check res &gt; (MAX−d)/10', 'res'], rows: [["' ' x3", '—', 'skip', '0'], ["'-'", '—', 'sign = −1', '0'], ["'0'", '0', '0 &gt; 214748364? no', '0'], ["'4'", '4', 'no', '4'], ["'2'", '2', 'no', '42'], ["'a'", '—', 'stop', '<span class="c-g">−42</span>']] },
      complexity: R`<p>O(N) time, O(1) space.</p>`,
      followUps: ['Why is "-2147483648" returned correctly even though its magnitude does not fit?', 'Support underscores like Java literals (1_000).']
    }
  });

  practice.push({
    title: 'Detect Overflow Before It Happens',
    level: 'Medium', tags: ['overflow', 'bit manipulation'], companies: ['Bloomberg', 'Citadel', 'Oracle'],
    statement: R`<p>Implement <code>static boolean addOverflows(int a, int b)</code> and <code>static boolean mulOverflows(int a, int b)</code> that report whether <code>a + b</code> / <code>a * b</code> would overflow 32-bit int. Do not call <code>Math.*Exact</code>, and do not catch exceptions.</p>`,
    constraints: R`Any int values.`,
    example: R`${H.table(['call', 'answer', 'why'], [['addOverflows(MAX, 1)', 'true', 'sum = 2<sup>31</sup>'], ['addOverflows(MIN, -1)', 'true', 'sum = −2<sup>31</sup> − 1'], ['addOverflows(MAX, MIN)', 'false', 'sum = −1'], ['mulOverflows(46341, 46341)', 'true', '2,147,488,281 &gt; MAX'], ['mulOverflows(-1, MIN)', 'true', '−MIN does not fit']])}`,
    brute: { why: R`<p>Check whether the result "looks wrong": <code>a &gt; 0 &amp;&amp; b &gt; 0 &amp;&amp; a + b &lt; 0</code>. That catches some addition cases but you must enumerate every sign combination, and for multiplication the wrapped product can have any sign (13! stays positive), so sign checks are useless there.</p>`, code: R`
static boolean addOverflowsBrute(int a, int b) {
    int r = a + b;
    return (a > 0 && b > 0 && r < 0) || (a < 0 && b < 0 && r >= 0);
}` },
    mcq: { q: '<code>((a ^ r) &amp; (b ^ r)) &lt; 0</code> with r = a + b is true exactly when…', options: ['a and b have different signs', 'r has a different sign from BOTH a and b', 'r is negative', 'a or b is zero'], answer: 1, explain: 'a ^ r is negative when a and r differ in sign; ANDing requires both to differ — only possible when a and b share a sign and the sum flipped it.' },
    hints: [R`<p>Hint 1: addition can only overflow when both operands have the same sign, and then the wrapped result has the opposite sign.</p>`, R`<p>Hint 2: "signs differ" in one operation: <code>(x ^ y) &lt; 0</code>. Combine for both operands with <code>&amp;</code>.</p>`, R`<p>Hint 3: for multiplication, compute the exact product in a <code>long</code> (fits: |a·b| ≤ 2<sup>62</sup>) and check <code>p != (int) p</code>.</p>`],
    solution: {
      approach: R`<p>Addition: the XOR sign test from the JDK's <code>addExact</code>. Multiplication: widen to long, which is exact for int × int, and check whether narrowing changes the value.</p>`,
      code: R`
public class OverflowCheck {
    static boolean addOverflows(int a, int b) {
        int r = a + b;                         // wraps silently
        return ((a ^ r) & (b ^ r)) < 0;        // r's sign differs from both a and b
    }
    static boolean mulOverflows(int a, int b) {
        long p = (long) a * b;                 // exact: |p| <= 2^62
        return p != (int) p;                   // narrowing changed it -> overflow
    }
    public static void main(String[] args) {
        System.out.println(addOverflows(Integer.MAX_VALUE, 1));          // true
        System.out.println(addOverflows(Integer.MIN_VALUE, -1));         // true
        System.out.println(addOverflows(Integer.MAX_VALUE, Integer.MIN_VALUE)); // false
        System.out.println(mulOverflows(46341, 46341));                  // true
        System.out.println(mulOverflows(46340, 46340));                  // false
        System.out.println(mulOverflows(-1, Integer.MIN_VALUE));         // true
    }
}`,
      dry: { head: ['a, b', 'r = a + b', 'a ^ r &lt; 0', 'b ^ r &lt; 0', 'overflow'], rows: [['MAX, 1', 'MIN', 'yes', 'yes', 'true'], ['MAX, MIN', '-1', 'yes', 'no', 'false'], ['5, -3', '2', 'no', 'yes', 'false']] },
      complexity: R`<p>O(1) time and O(1) space — a fixed number of operations.</p>`,
      followUps: ['Write <code>mulOverflows(long, long)</code> using <code>Math.multiplyHigh</code>.', 'Write <code>subOverflows</code> — which operands do you XOR?']
    }
  });

  practice.push({
    title: 'Number of 1 Bits (Treat int as Unsigned)',
    level: 'Medium', tags: ['bit manipulation', 'shifts'], companies: ['Apple', 'Qualcomm', 'Microsoft'],
    statement: R`<p>Given an <code>int n</code> that represents an <b>unsigned</b> 32-bit value, return the number of 1 bits (Hamming weight). Negative ints are just large unsigned numbers here, e.g. −3 = 0xFFFFFFFD has 31 ones.</p>`,
    constraints: R`Any 32-bit pattern.`,
    example: R`${H.bits(11, 8, { label: 'n = 11', hl: { 0: 'g', 1: 'g', 3: 'g' } })}<p>11 = 1011₂ → <b>3</b>. n = −3 → <b>31</b>. n = −1 → <b>32</b>.</p>`,
    brute: { why: R`<p>Converting to text with <code>Integer.toBinaryString(n)</code> and counting '1' characters is correct but allocates a String per call. The classic bug is the hand-written loop with <code>n &gt;&gt;= 1</code>: for negative n, the sign bit is copied in forever, n never reaches 0, and the loop never ends.</p>`, code: R`
static int bitsBrute(int n) {
    int count = 0;
    for (char c : Integer.toBinaryString(n).toCharArray())   // two's complement text for negatives
        if (c == '1') count++;
    return count;
}` },
    mcq: { q: 'Why does <code>while (n != 0) { c += n &amp; 1; n &gt;&gt;= 1; }</code> hang for n = −1?', options: ['−1 &amp; 1 is 0', '&gt;&gt; copies the sign bit, so −1 &gt;&gt; 1 is still −1', 'Java forbids shifting negatives', 'The loop is fine'], answer: 1, explain: 'Arithmetic shift fills with the sign bit; use &gt;&gt;&gt; to fill with zeros.' },
    hints: [R`<p>Hint 1: use the unsigned shift <code>n &gt;&gt;&gt;= 1</code> so zeros come in from the left and n eventually becomes 0.</p>`, R`<p>Hint 2: faster: <code>n &amp;= n - 1</code> clears the lowest set bit, so the loop runs once per 1 bit (Brian Kernighan's trick).</p>`, R`<p>Hint 3: in production call <code>Integer.bitCount(n)</code> — the JIT maps it to the CPU's POPCNT instruction. Test 0, 1, −1, MIN_VALUE.</p>`],
    solution: {
      approach: R`<p>Kernighan's loop: each <code>n &amp; (n − 1)</code> removes exactly one 1-bit, independent of sign. Runs at most 32 times.</p>`,
      code: R`
public class HammingWeight {
    static int hammingWeight(int n) {
        int count = 0;
        while (n != 0) {
            n &= n - 1;          // drop the lowest set bit
            count++;
        }
        return count;
    }
    static int viaUnsignedShift(int n) {
        int count = 0;
        while (n != 0) { count += n & 1; n >>>= 1; }   // >>> fills with zeros
        return count;
    }
    public static void main(String[] args) {
        int[] t = {11, -3, -1, Integer.MIN_VALUE, 0};
        for (int x : t)
            System.out.println(x + " -> " + hammingWeight(x) + " " + viaUnsignedShift(x) + " " + Integer.bitCount(x));
    }
}`,
      dry: { head: ['n (binary)', 'n − 1', 'n &amp; (n−1)', 'count'], rows: [['1011', '1010', '1010', '1'], ['1010', '1001', '1000', '2'], ['1000', '0111', '0000', '3 → stop']] },
      complexity: R`<p>O(number of 1 bits) ≤ 32, O(1) space.</p>`,
      followUps: ['Count bits for every number 0..n in O(n) with <code>dp[i] = dp[i &gt;&gt; 1] + (i &amp; 1)</code>.', 'Is a number a power of two? <code>n &gt; 0 &amp;&amp; (n &amp; (n − 1)) == 0</code>.']
    }
  });

  practice.push({
    title: 'Predict the Output, Then Untangle the Side Effects',
    level: 'Medium', tags: ['operators', 'evaluation order', 'output prediction'], companies: ['Infosys', 'Capgemini', 'Oracle'],
    statement: R`<p>Predict the exact output of the program below <b>without running it</b>. Then rewrite it so every line has at most one side effect and produces the same output.</p>
<pre>int x = 3;
int y = x++ * 2 + --x;
int z = x &lt;&lt; 2 &gt;&gt; 1;
boolean b = x &gt; 2 || ++x &gt; 0;
System.out.println(y + " " + z + " " + b + " " + x);</pre>`,
    constraints: R`Standard Java semantics (JLS): operands left to right, precedence for grouping, short-circuit for <code>||</code>.`,
    example: R`<p>Output: <code>${'9 6 true 3'}</code>.</p>${H.table(['step', 'x', 'value'], [['x++ (old value)', '4', '3'], ['× 2', '4', '6'], ['--x', '3', '3'], ['y = 6 + 3', '3', '9'], ['(3 &lt;&lt; 2) &gt;&gt; 1', '3', '12 → 6'], ['x &gt; 2 is true → ++x skipped', '3', 'true']])}`,
    brute: { why: R`<p>The original program is legal but hard to reason about: three different side effects on <code>x</code> hide inside expressions, and one (<code>++x</code>) silently never runs because of short-circuiting. Code reviewers and linters flag this style.</p>`, code: R`
int x = 3;
int y = x++ * 2 + --x;
int z = x << 2 >> 1;
boolean b = x > 2 || ++x > 0;
System.out.println(y + " " + z + " " + b + " " + x);   // 9 6 true 3` },
    mcq: { q: 'How is <code>x &lt;&lt; 2 &gt;&gt; 1</code> grouped?', options: ['x &lt;&lt; (2 &gt;&gt; 1)', '(x &lt;&lt; 2) &gt;&gt; 1', 'compile error', 'depends on the JVM'], answer: 1, explain: 'Shift operators share one precedence level and are left-associative.' },
    hints: [R`<p>Hint 1: trace a little table of x after each operand: <code>x++</code> yields 3 and makes x 4; <code>--x</code> makes x 3 and yields 3.</p>`, R`<p>Hint 2: <code>||</code> evaluates its right side only when the left is false. Here <code>x &gt; 2</code> is already true.</p>`, R`<p>Hint 3: in the rewrite, copy the "old value" to a temp before changing x, and drop the dead <code>++x</code> (it never executes) — or keep it in an explicit <code>if</code> to preserve meaning.</p>`],
    solution: {
      approach: R`<p>Make every read and write explicit and in order. Behaviour is identical, and the short-circuit becomes a visible <code>if</code>.</p>`,
      code: R`
public class Untangled {
    public static void main(String[] args) {
        int x = 3;
        int old = x;          // value produced by x++
        x = x + 1;            // side effect of x++      -> 4
        x = x - 1;            // --x                     -> 3
        int y = old * 2 + x;  // 3 * 2 + 3 = 9
        int z = (x << 2) >> 1;  // 12 >> 1 = 6
        boolean b = x > 2;
        if (!b) {             // the right side of || runs only when left is false
            x = x + 1;
            b = x > 0;
        }
        System.out.println(y + " " + z + " " + b + " " + x);   // 9 6 true 3
    }
}`,
      dry: { head: ['line', 'x', 'new value'], rows: [['old = x', '3', 'old = 3'], ['x = x + 1', '4', '—'], ['x = x − 1', '3', '—'], ['y', '3', '9'], ['z', '3', '6'], ['b', '3', 'true (if skipped)']] },
      complexity: R`<p>O(1) time and O(1) space — a fixed number of operations.</p>`,
      followUps: ['What if x starts at 1? (Now the right side of || runs.)', 'Replace <code>||</code> with <code>|</code> — what changes?']
    }
  });

  practice.push({
    title: 'Unicode-Aware Character Classifier',
    level: 'Medium', tags: ['unicode', 'char', 'code points'], companies: ['Google', 'Meta', 'Shopify'],
    statement: R`<p>Return <code>int[4]</code> = {letters, digits, whitespace, other} for a string, counting <b>code points</b> (so an emoji counts once). Letters and digits are Unicode-aware (Hindi, Arabic, accented letters count).</p>`,
    constraints: R`0 ≤ length ≤ 10<sup>5</sup> UTF-16 units; well-formed text.`,
    example: R`<p><code>"Hi 5😀!"</code> → letters 2 (H, i), digits 1, whitespace 1, other 2 (😀 and !) → <b>[2, 1, 1, 2]</b>. A char-based loop would report other = 3, because 😀 is two chars.</p>`,
    brute: { why: R`<p>Looping with <code>charAt</code> and ASCII ranges (<code>c &gt;= 'a' &amp;&amp; c &lt;= 'z'</code>) misses 'é', 'ß', 'अ', counts each emoji twice and classifies surrogate halves as "other" separately.</p>`, code: R`
static int[] classifyBrute(String s) {
    int[] r = new int[4];
    for (int i = 0; i < s.length(); i++) {
        char c = s.charAt(i);                                   // half an emoji at a time
        if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z')) r[0]++;
        else if (c >= '0' && c <= '9') r[1]++;
        else if (c == ' ') r[2]++;
        else r[3]++;
    }
    return r;
}` },
    mcq: { q: 'Which call correctly classifies a supplementary character like U+1D400 (𝐀, MATHEMATICAL BOLD CAPITAL A)?', options: ['Character.isLetter(s.charAt(i))', 'Character.isLetter(s.codePointAt(i))', "s.charAt(i) &gt;= 'A'", 'Character.isLetterOrDigit((char) cp)'], answer: 1, explain: 'The int overloads take a full code point. The char overloads see only a surrogate half (not a letter); casting to char truncates.' },
    hints: [R`<p>Hint 1: iterate with <code>s.codePoints()</code> (an IntStream) or with <code>codePointAt</code> + <code>Character.charCount</code>.</p>`, R`<p>Hint 2: use the <code>int</code> overloads: <code>Character.isLetter(cp)</code>, <code>isDigit(cp)</code>, <code>isWhitespace(cp)</code>.</p>`, R`<p>Hint 3: test with "", "é1 ", "😀😀", Devanagari "नमस्ते" (note: some of its code points are combining marks, which are not letters!).</p>`],
    solution: {
      approach: R`<p>Walk code points once and classify each with Unicode-aware <code>Character</code> methods.</p>`,
      code: R`
public class Classifier {
    static int[] classify(String s) {
        int[] r = new int[4];
        for (int i = 0; i < s.length(); ) {
            int cp = s.codePointAt(i);
            if (Character.isLetter(cp)) r[0]++;
            else if (Character.isDigit(cp)) r[1]++;
            else if (Character.isWhitespace(cp)) r[2]++;
            else r[3]++;
            i += Character.charCount(cp);          // skip both halves of a surrogate pair
        }
        return r;
    }
    public static void main(String[] args) {
        System.out.println(java.util.Arrays.toString(classify("Hi 5😀!")));  // [2, 1, 1, 2]
        System.out.println(java.util.Arrays.toString(classify("café ٣")));    // [4, 1, 1, 0]
    }
}`,
      dry: { head: ['i', 'code point', 'class', 'counts'], rows: [['0', "'H'", 'letter', '[1,0,0,0]'], ['1', "'i'", 'letter', '[2,0,0,0]'], ['2', "' '", 'space', '[2,0,1,0]'], ['3', "'5'", 'digit', '[2,1,1,0]'], ['4', 'U+1F600 (2 chars)', 'other', '[2,1,1,1]'], ['6', "'!'", 'other', '[2,1,1,2]']] },
      complexity: R`<p>O(N) time, O(1) extra space.</p>`,
      followUps: ['Count grapheme clusters instead of code points with <code>BreakIterator</code>.', 'Classify by <code>Character.UnicodeScript.of(cp)</code> (LATIN, DEVANAGARI, HAN…).']
    }
  });

  practice.push({
    title: 'Valid UTF-8',
    level: 'Medium', tags: ['bit manipulation', 'unicode', 'bytes'], companies: ['Google', 'Meta', 'Cloudflare'],
    statement: R`<p>Given <code>int[] data</code> where each element is one byte (only the low 8 bits matter), decide whether it is a valid UTF-8 sequence. A character is 1–4 bytes:</p>
${H.table(['bytes', 'pattern'], [['1', '0xxxxxxx'], ['2', '110xxxxx 10xxxxxx'], ['3', '1110xxxx 10xxxxxx 10xxxxxx'], ['4', '11110xxx 10xxxxxx 10xxxxxx 10xxxxxx']])}`,
    constraints: R`1 ≤ data.length ≤ 2 · 10<sup>4</sup>; 0 ≤ data[i] ≤ 255 (ignore higher bits if present).`,
    example: R`<p>[197, 130, 1] = 11000101 10000010 00000001 → a 2-byte char then a 1-byte char → <span class="c-g"><b>true</b></span>. [235, 140, 4] = 11101011 10001100 00000100 → a 3-byte lead needs two continuation bytes but the third byte is 0xxxxxxx → <span class="c-r"><b>false</b></span>.</p>`,
    brute: { why: R`<p>Convert every byte to an 8-character binary String with <code>Integer.toBinaryString</code> and padding, then compare prefixes with <code>startsWith("110")</code>. Correct but slow and allocation-heavy; masks do the same with one AND per byte.</p>`, code: R`
static boolean validUtf8Brute(int[] data) {
    int need = 0;
    for (int x : data) {
        String b = String.format("%8s", Integer.toBinaryString(x & 0xFF)).replace(' ', '0');
        if (need == 0) {
            if (b.startsWith("0")) need = 0;
            else if (b.startsWith("110")) need = 1;
            else if (b.startsWith("1110")) need = 2;
            else if (b.startsWith("11110")) need = 3;
            else return false;
        } else {
            if (!b.startsWith("10")) return false;
            need--;
        }
    }
    return need == 0;
}` },
    mcq: { q: 'Which test checks that byte b is a continuation byte (10xxxxxx)?', options: ['(b &amp; 0x80) == 0x80', '(b &amp; 0xC0) == 0x80', '(b &gt;&gt; 6) == 1', 'b &gt;= 128'], answer: 1, explain: 'Mask the top two bits (0xC0 = 11000000) and require them to be 10 (0x80).' },
    hints: [R`<p>Hint 1: keep a counter <code>need</code> = how many continuation bytes are still expected.</p>`, R`<p>Hint 2: when need is 0, classify the lead byte with masks: <code>(b &amp; 0x80) == 0</code> → 1 byte; <code>(b &amp; 0xE0) == 0xC0</code> → need 1; <code>(b &amp; 0xF0) == 0xE0</code> → need 2; <code>(b &amp; 0xF8) == 0xF0</code> → need 3; else invalid.</p>`, R`<p>Hint 3: when need &gt; 0, the byte must satisfy <code>(b &amp; 0xC0) == 0x80</code>. At the end, need must be 0 (no truncated character).</p>`],
    solution: {
      approach: R`<p>A tiny state machine driven by bit masks. Mask each input with <code>0xFF</code> first, exactly like reading signed Java bytes from a stream.</p>`,
      code: R`
public class ValidUtf8 {
    static boolean validUtf8(int[] data) {
        int need = 0;
        for (int x : data) {
            int b = x & 0xFF;                       // only the low 8 bits matter
            if (need == 0) {
                if ((b & 0x80) == 0) continue;      // 0xxxxxxx
                else if ((b & 0xE0) == 0xC0) need = 1;
                else if ((b & 0xF0) == 0xE0) need = 2;
                else if ((b & 0xF8) == 0xF0) need = 3;
                else return false;                  // 10xxxxxx or 11111xxx cannot start a char
            } else {
                if ((b & 0xC0) != 0x80) return false;
                need--;
            }
        }
        return need == 0;
    }
    public static void main(String[] args) {
        System.out.println(validUtf8(new int[]{197, 130, 1}));   // true
        System.out.println(validUtf8(new int[]{235, 140, 4}));   // false
        System.out.println(validUtf8(new int[]{0xF0, 0x9F, 0x98, 0x80}));  // true (grinning face)
    }
}`,
      dry: { head: ['byte', 'binary', 'need before', 'action'], rows: [['197', '11000101', '0', 'lead of 2 → need 1'], ['130', '10000010', '1', 'continuation → need 0'], ['1', '00000001', '0', 'ASCII'], ['end', '—', '0', '<span class="c-g">true</span>']] },
      complexity: R`<p>O(N) time, O(1) space.</p>`,
      followUps: ['Also reject overlong encodings (e.g. C0 80) and surrogates (ED A0 80) like a strict decoder.', 'Use <code>CharsetDecoder</code> with <code>CodingErrorAction.REPORT</code> to do this with the JDK.']
    }
  });

  /* ======================================================================
     PRACTICE — Hard
     ====================================================================== */
  practice.push({
    title: 'Divide Two Integers Without *, / or %',
    level: 'Hard', tags: ['overflow', 'bit manipulation', 'math'], companies: ['Meta', 'Microsoft', 'Amazon', 'Google'],
    statement: R`<p>Compute <code>dividend / divisor</code> truncated toward zero without using multiplication, division or mod. If the result overflows (only <code>MIN_VALUE / -1</code>), return <code>Integer.MAX_VALUE</code>. No <code>long</code>.</p>`,
    constraints: R`−2<sup>31</sup> ≤ dividend, divisor ≤ 2<sup>31</sup> − 1; divisor ≠ 0.`,
    example: R`${H.table(['dividend, divisor', 'result'], [['10, 3', '3'], ['7, -3', '-2'], ['-2147483648, -1', H.c('y', '2147483647 (clamped)')], ['-2147483648, 1', '-2147483648'], ['-2147483648, 2', '-1073741824']])}`,
    brute: { why: R`<p>Repeated subtraction counts how many times the divisor fits: up to 2<sup>31</sup> iterations for <code>MIN_VALUE / 1</code> — seconds of CPU. It also needs <code>Math.abs</code>, which breaks on MIN_VALUE.</p>`, code: R`
static int divideBrute(int dividend, int divisor) {
    if (dividend == Integer.MIN_VALUE && divisor == -1) return Integer.MAX_VALUE;
    boolean neg = (dividend < 0) ^ (divisor < 0);
    long a = Math.abs((long) dividend), b = Math.abs((long) divisor);   // cheats with long
    int q = 0;
    while (a >= b) { a -= b; q++; }                                     // O(quotient)
    return neg ? -q : q;
}` },
    mcq: { q: 'Why convert both numbers to <b>negative</b> instead of positive?', options: ['Negatives are faster', 'Every int has a negative counterpart, but MIN_VALUE has no positive one', 'Subtraction only works on negatives', 'To avoid using abs'], answer: 1, explain: 'The negative range is one larger, so working in negatives never overflows when "taking the absolute value".' },
    hints: [R`<p>Hint 1: handle <code>MIN_VALUE / -1</code> first. Then remember the result's sign with XOR and turn both numbers <b>negative</b>.</p>`, R`<p>Hint 2: instead of subtracting the divisor once, double it (<code>t += t</code>) while it still fits into what remains — exponential search, like long division in binary.</p>`, R`<p>Hint 3: guard the doubling with <code>t &gt;= (Integer.MIN_VALUE &gt;&gt; 1)</code> so <code>t + t</code> cannot overflow, and keep the quotient negative too. Recipe: while a ≤ b: find the largest doubled t ≥ a, subtract it, add its multiple.</p>`],
    solution: {
      approach: R`<p>Work entirely in the negative range (no overflow), and subtract the largest power-of-two multiple of the divisor each round. Each outer round removes at least half of what is left, giving O(log² N) total steps — at most ~31 × 31.</p>`,
      code: R`
public class Divide {
    static int divide(int dividend, int divisor) {
        if (dividend == Integer.MIN_VALUE && divisor == -1) return Integer.MAX_VALUE;
        boolean negative = (dividend < 0) ^ (divisor < 0);
        int a = dividend > 0 ? -dividend : dividend;   // both made negative: always safe
        int b = divisor > 0 ? -divisor : divisor;
        int q = 0;                                     // kept negative as well
        while (a <= b) {                               // |a| >= |b|
            int t = b, m = -1;
            while (t >= (Integer.MIN_VALUE >> 1) && a <= t + t) {
                t += t;                                // double the chunk
                m += m;                                // and its multiple
            }
            a -= t;
            q += m;
        }
        return negative ? q : -q;
    }
    public static void main(String[] args) {
        int[][] tests = {{10, 3}, {7, -3}, {Integer.MIN_VALUE, -1}, {Integer.MIN_VALUE, 1}, {Integer.MIN_VALUE, 2}, {Integer.MAX_VALUE, 1}, {-7, 2}, {1, 2}};
        for (int[] t : tests) {
            int expected = (t[0] == Integer.MIN_VALUE && t[1] == -1) ? Integer.MAX_VALUE : t[0] / t[1];
            System.out.println(t[0] + " / " + t[1] + " = " + divide(t[0], t[1]) + " " + (divide(t[0], t[1]) == expected));
        }
    }
}`,
      dry: { head: ['a', 'b', 'largest t (m)', 'a − t', 'q'], rows: [['−10', '−3', '−6 (−2)', '−4', '−2'], ['−4', '−3', '−3 (−1)', '−1', '−3'], ['−1', '−3', 'stop (a &gt; b)', '—', '−3 → result 3']] },
      complexity: R`<p>O(log² N) time (≤ ~1000 steps), O(1) space.</p>`,
      followUps: ['Make it O(log N) by precomputing the doubled values once and walking them from largest to smallest.', 'Where exactly would the positive-range version overflow?']
    }
  });

  practice.push({
    title: 'Multiply Two Longs Modulo m Without Overflow',
    level: 'Hard', tags: ['overflow', 'modular arithmetic', 'bit manipulation'], companies: ['Jane Street', 'Two Sigma', 'Google'],
    statement: R`<p>Return <code>(a × b) mod m</code> for non-negative longs where <b>m can be up to 10<sup>18</sup></b>. The product can reach 10<sup>36</sup>, far beyond long. Do not use <code>BigInteger</code> in the main solution.</p>`,
    constraints: R`1 ≤ m ≤ 10<sup>18</sup>; 0 ≤ a, b &lt; 2<sup>63</sup>.`,
    example: R`<p>a = 10<sup>18</sup> − 1, b = 10<sup>18</sup> − 2, m = 10<sup>18</sup> → (−1)(−2) mod m = <b>2</b>. The direct <code>a * b % m</code> overflows and prints garbage.</p>`,
    brute: { why: R`<p><code>a * b % m</code> works only while a·b &lt; 2<sup>63</sup> ≈ 9.2 × 10<sup>18</sup> — fine for m ≈ 10<sup>9</sup> (products &lt; 10<sup>18</sup>) but wrong for m ≈ 10<sup>18</sup>. Using BigInteger is correct but ~50× slower in hot loops (e.g. Miller–Rabin primality tests).</p>`, code: R`
static long mulModBrute(long a, long b, long m) {
    return (a % m) * (b % m) % m;        // overflows when the product exceeds 2^63
}` },
    mcq: { q: 'In "double-and-add", why is <code>a += a; if (a &gt;= m) a -= m;</code> safe for m ≤ 10<sup>18</sup>?', options: ['Because a is always 0', 'a &lt; m ≤ 10<sup>18</sup>, so 2a &lt; 2 × 10<sup>18</sup> &lt; 2<sup>63</sup>', 'Java checks overflow for longs', 'It is not safe'], answer: 1, explain: 'Every intermediate stays below 2m, which is below Long.MAX_VALUE ≈ 9.22 × 10<sup>18</sup>.' },
    hints: [R`<p>Hint 1: multiplication is repeated addition; binary exponentiation's cousin "binary multiplication" adds <code>a·2<sup>k</sup></code> for every set bit k of b.</p>`, R`<p>Hint 2: keep everything reduced mod m after each addition, so values stay below 2m and never overflow when m &lt; 2<sup>62</sup>.</p>`, R`<p>Hint 3: recipe — reduce a, b mod m; r = 0; while b &gt; 0: if b odd, r = (r + a) mod m; a = (2a) mod m; b &gt;&gt;= 1. Use subtraction instead of % for speed.</p>`],
    solution: {
      approach: R`<p>Double-and-add (Russian peasant multiplication) with modular reduction after each step: O(log b) additions, every intermediate &lt; 2m. A production alternative is <code>Math.multiplyHigh</code> to get the full 128-bit product and reduce it.</p>`,
      code: R`
import java.math.BigInteger;

public class MulMod {
    static long mulMod(long a, long b, long m) {
        a %= m;
        b %= m;
        long r = 0;
        while (b > 0) {
            if ((b & 1) == 1) {
                r += a;                 // r < m and a < m  ->  r + a < 2m < 2^63
                if (r >= m) r -= m;
            }
            a += a;                     // double a (mod m)
            if (a >= m) a -= m;
            b >>= 1;
        }
        return r;
    }
    public static void main(String[] args) {
        long m = 1_000_000_000_000_000_000L;
        long a = m - 1, b = m - 2;
        System.out.println(mulMod(a, b, m));                          // 2
        System.out.println(a * b % m);                                // garbage (overflow)
        System.out.println(BigInteger.valueOf(a).multiply(BigInteger.valueOf(b))
                .mod(BigInteger.valueOf(m)));                         // 2 (reference)
    }
}`,
      dry: { head: ['b (binary)', 'bit', 'r', 'a'], rows: [['101 (5), a=7, m=10', '1', '0+7 = 7', '14 → 4'], ['10', '0', '7', '8'], ['1', '1', '7+8 = 15 → 5', '16 → 6'], ['0', '—', '<span class="c-g">5 = 35 mod 10</span>', '—']] },
      complexity: R`<p>O(log b) ≤ 63 iterations, O(1) space.</p>`,
      followUps: ['Use it inside <code>modPow</code> for a deterministic Miller–Rabin primality test on 64-bit numbers.', 'Implement it with <code>Math.multiplyHigh</code> (Java 9) / <code>Math.unsignedMultiplyHigh</code> (Java 18).']
    }
  });

  practice.push({
    title: 'Encode a Code Point as UTF-8 Bytes',
    level: 'Hard', tags: ['unicode', 'casting', 'bit manipulation'], companies: ['Apple', 'Mozilla', 'Cloudflare'],
    statement: R`<p>Write <code>static byte[] encode(int cp)</code> returning the UTF-8 encoding of a Unicode code point as Java <code>byte</code>s (remember: Java bytes are <b>signed</b>, so 0xE2 is stored as −30). Throw <code>IllegalArgumentException</code> for values outside 0..0x10FFFF or in the surrogate range 0xD800..0xDFFF. Then use it to encode a whole String by code points.</p>`,
    constraints: R`Any int input; strings up to 10<sup>5</sup> chars.`,
    example: R`${H.table(['cp', 'char', 'UTF-8 (hex)', 'Java bytes'], [['0x41', 'A', '41', '[65]'], ['0xE9', 'é', 'C3 A9', '[-61, -87]'], ['0x20AC', '€', 'E2 82 AC', '[-30, -126, -84]'], ['0x1F600', '😀', 'F0 9F 98 80', '[-16, -97, -104, -128]']])}`,
    brute: { why: R`<p>Calling <code>new String(Character.toChars(cp)).getBytes(StandardCharsets.UTF_8)</code> gives the right bytes for valid input, but it hides the bit layout you are asked to implement, and for a surrogate code point it silently writes <code>?</code> (0x3F) instead of rejecting it.</p>`, code: R`
static byte[] encodeBrute(int cp) {
    return new String(Character.toChars(cp)).getBytes(java.nio.charset.StandardCharsets.UTF_8);
}` },
    mcq: { q: 'Encoding needs 3 bytes. Which expression builds the first byte?', options: ['(byte) (0xE0 | (cp &gt;&gt; 12))', '(byte) (cp &amp; 0x3F)', '(byte) (0xC0 | (cp &gt;&gt; 6))', '(byte) cp'], answer: 0, explain: '3-byte form is 1110xxxx 10xxxxxx 10xxxxxx: the top 4 of the 16 payload bits go into the lead byte after the 1110 marker (0xE0).' },
    hints: [R`<p>Hint 1: choose the length by range: &lt; 0x80 → 1, &lt; 0x800 → 2, &lt; 0x10000 → 3, else 4. Reject surrogates and values &gt; 0x10FFFF first.</p>`, R`<p>Hint 2: payload bits are cut into 6-bit groups from the right: <code>(cp &gt;&gt; 6k) &amp; 0x3F</code>, each OR-ed with the continuation marker <code>0x80</code>. The lead byte gets 0xC0, 0xE0 or 0xF0 OR-ed with the remaining high bits.</p>`, R`<p>Hint 3: values ≥ 128 become negative when cast to <code>byte</code> — that is expected. Verify against <code>getBytes(UTF_8)</code> for many code points, and print with <code>b &amp; 0xFF</code> to see hex.</p>`],
    solution: {
      approach: R`<p>Range-based length selection plus shifts and masks; the final <code>(byte)</code> casts keep the low 8 bits, which is exactly the byte we built. For strings, iterate by code point and append into a growable buffer.</p>`,
      code: R`
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

public class Utf8Encoder {
    static byte[] encode(int cp) {
        if (cp < 0 || cp > 0x10FFFF || (cp >= 0xD800 && cp <= 0xDFFF))
            throw new IllegalArgumentException("not a Unicode scalar value: " + cp);
        if (cp < 0x80) return new byte[]{(byte) cp};
        if (cp < 0x800) return new byte[]{
            (byte) (0xC0 | (cp >> 6)),
            (byte) (0x80 | (cp & 0x3F))};
        if (cp < 0x10000) return new byte[]{
            (byte) (0xE0 | (cp >> 12)),
            (byte) (0x80 | ((cp >> 6) & 0x3F)),
            (byte) (0x80 | (cp & 0x3F))};
        return new byte[]{
            (byte) (0xF0 | (cp >> 18)),
            (byte) (0x80 | ((cp >> 12) & 0x3F)),
            (byte) (0x80 | ((cp >> 6) & 0x3F)),
            (byte) (0x80 | (cp & 0x3F))};
    }
    static byte[] encode(String s) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        s.codePoints().forEach(cp -> out.writeBytes(encode(cp)));
        return out.toByteArray();
    }
    public static void main(String[] args) {
        System.out.println(Arrays.toString(encode(0x20AC)));        // [-30, -126, -84]
        System.out.println(Arrays.toString(encode(0x1F600)));       // [-16, -97, -104, -128]
        String text = "Aé€😀";
        System.out.println(Arrays.equals(encode(text), text.getBytes(StandardCharsets.UTF_8))); // true
        try { encode(0xD800); } catch (IllegalArgumentException e) { System.out.println("rejected surrogate"); }
    }
}`,
      dry: { head: ['cp = 0x20AC', 'expression', 'bits', 'byte'], rows: [['lead', '0xE0 | (cp &gt;&gt; 12)', '1110 0010', '0xE2 → −30'], ['mid', '0x80 | ((cp &gt;&gt; 6) &amp; 0x3F)', '1000 0010', '0x82 → −126'], ['last', '0x80 | (cp &amp; 0x3F)', '1010 1100', '0xAC → −84']] },
      complexity: R`<p>O(1) per code point; O(N) for a string.</p>`,
      followUps: ['Write the decoder (bytes → code points) including validation of overlong forms.', 'Why does Java\'s "modified UTF-8" (used in class files) encode U+0000 as C0 80?']
    }
  });

  practice.push({
    title: 'Parse a Signed Long in Any Radix (Overflow-Exact)',
    level: 'Hard', tags: ['overflow', 'parsing', 'char'], companies: ['Oracle', 'Bloomberg', 'Stripe'],
    statement: R`<p>Re-implement <code>Long.parseLong(s, radix)</code>: optional leading <code>+</code>/<code>-</code>, then one or more digits valid in the radix (2..36, letters a–z/A–Z for 10..35). Throw <code>NumberFormatException</code> for empty input, bad characters, a lone sign, or a value outside the long range. It must accept <code>"-9223372036854775808"</code> exactly. No BigInteger, no library parsing.</p>`,
    constraints: R`2 ≤ radix ≤ 36; length ≤ 100.`,
    example: R`${H.table(['s, radix', 'result'], [['"ff", 16', '255'], ['"-1010", 2', '-10'], ['"-9223372036854775808", 10', H.c('g', 'Long.MIN_VALUE')], ['"9223372036854775808", 10', H.c('r', 'NumberFormatException')], ['"+", 10', H.c('r', 'NumberFormatException')], ['"zz", 36', '1295']])}`,
    brute: { why: R`<p>Accumulating a <b>positive</b> result (<code>r = r * radix + d</code>) and negating at the end cannot represent MIN_VALUE's magnitude (2<sup>63</sup>), and detecting overflow after it happened is unreliable because the wrapped value can land anywhere.</p>`, code: R`
static long parseBrute(String s, int radix) {
    boolean neg = s.startsWith("-");
    int i = (neg || s.startsWith("+")) ? 1 : 0;
    long r = 0;
    for (; i < s.length(); i++) {
        int d = Character.digit(s.charAt(i), radix);
        if (d < 0) throw new NumberFormatException(s);
        r = r * radix + d;                       // silently wraps; MIN_VALUE unreachable
    }
    return neg ? -r : r;
}` },
    mcq: { q: 'Why does the JDK accumulate the value as a <b>negative</b> number?', options: ['Style preference', 'The negative range includes 2<sup>63</sup> in magnitude (MIN_VALUE), the positive range does not', 'Multiplying negatives is faster', 'To support the minus sign'], answer: 1, explain: 'Accumulating downward reaches MIN_VALUE exactly; positives are produced by negating at the end, which is safe for every value ≥ −MAX_VALUE.' },
    hints: [R`<p>Hint 1: let <code>limit</code> be <code>-Long.MAX_VALUE</code> for positives and <code>Long.MIN_VALUE</code> for negatives. Build <code>result</code> downward: <code>result = result * radix - d</code>.</p>`, R`<p>Hint 2: before multiplying, check <code>result &lt; limit / radix</code> (precomputed as <code>multmin</code>) → overflow. After multiplying, check <code>result &lt; limit + d</code> → subtracting d would pass the limit.</p>`, R`<p>Hint 3: <code>Character.digit(c, radix)</code> returns −1 for invalid characters. Return <code>neg ? result : -result</code>. Test "", "-", "+0", MAX, MIN, MAX+1, MIN−1, and radix 2/36.</p>`],
    solution: {
      approach: R`<p>The JDK algorithm: accumulate negatively against a sign-dependent limit, with two exact pre-checks per digit. No step can overflow, and MIN_VALUE is reachable.</p>`,
      code: R`
public class ParseLong {
    static long parse(String s, int radix) {
        if (s == null || s.isEmpty()) throw new NumberFormatException("empty");
        if (radix < 2 || radix > 36) throw new NumberFormatException("bad radix " + radix);
        int i = 0, n = s.length();
        boolean neg = false;
        long limit = -Long.MAX_VALUE;
        char first = s.charAt(0);
        if (first == '-' || first == '+') {
            if (n == 1) throw new NumberFormatException("lone sign");
            if (first == '-') { neg = true; limit = Long.MIN_VALUE; }
            i = 1;
        }
        long multmin = limit / radix;
        long result = 0;
        for (; i < n; i++) {
            int d = Character.digit(s.charAt(i), radix);
            if (d < 0 || result < multmin) throw new NumberFormatException("For input: \"" + s + "\"");
            result *= radix;                      // safe: result >= multmin
            if (result < limit + d) throw new NumberFormatException("For input: \"" + s + "\"");
            result -= d;                          // accumulate negatively
        }
        return neg ? result : -result;
    }
    public static void main(String[] args) {
        System.out.println(parse("ff", 16));                         // 255
        System.out.println(parse("-1010", 2));                       // -10
        System.out.println(parse("-9223372036854775808", 10));       // -9223372036854775808
        System.out.println(parse("zz", 36));                         // 1295
        for (String bad : new String[]{"9223372036854775808", "+", "", "12x"}) {
            try { parse(bad, 10); } catch (NumberFormatException e) { System.out.println("rejected [" + bad + "]"); }
        }
    }
}`,
      dry: { head: ['s = "-128", r=10', 'd', 'result before', 'checks', 'result after'], rows: [["'1'", '1', '0', 'ok', '−1'], ["'2'", '2', '−1', 'ok', '−12'], ["'8'", '8', '−12', 'ok', '−128'], ['end', '—', '−128', 'neg', '<span class="c-g">−128</span>']] },
      complexity: R`<p>O(N) time, O(1) space.</p>`,
      followUps: ['Add support for underscores between digits like Java literals.', 'Parse unsigned 64-bit values (<code>Long.parseUnsignedLong</code>) — what changes?']
    }
  });

  /* ======================================================================
     QUIZ
     ====================================================================== */
  quiz.push({ q: R`Which tool turns <code>Hello.java</code> into <code>Hello.class</code>, and which package must you install to get it?`, options: [R`<code>java</code>, from any JRE`, R`<code>javac</code>, from the JDK`, R`<code>javap</code>, from the JRE`, R`<code>jshell</code>, from the JVM`], answer: 1, explain: R`javac is the compiler and ships only with the JDK. <code>java</code> runs bytecode; <code>javap</code> disassembles it.` });
  quiz.push({ q: R`You compiled into <code>out/</code>. Which command runs the program?`, options: [R`<code>java out/Hello.class</code>`, R`<code>java -cp out Hello</code>`, R`<code>javac -run Hello</code>`, R`<code>java Hello.class -cp out</code>`], answer: 1, explain: R`The launcher takes a class name (no extension) and a classpath telling it where to look. Options must come before the class name.` });
  quiz.push({ q: R`Predict the output: <code>System.out.println(1 + 2 + "3" + 4 + 5);</code>`, options: ['15', '3345', '12345', '339'], answer: 1, explain: R`Left to right: 1 + 2 = 3 (ints), then "33", "334", "3345" (string concatenation from the first String onward).` });
  quiz.push({ q: R`Predict the output: <code>byte b = (byte) 200; System.out.println(b);</code>`, options: ['200', '127', '-56', 'compile error'], answer: 2, explain: R`200 = 1100 1000. In a signed byte the top bit is worth −128: −128 + 72 = −56 (or 200 − 256).` });
  quiz.push({ q: R`Predict the output: <code>int i = 5; i = i++; System.out.println(i);</code>`, options: ['5', '6', '4', 'undefined behaviour'], answer: 0, explain: R`<code>i++</code> yields the old value 5 and increments i to 6, then the assignment stores 5 back. Java defines this exactly — no undefined behaviour.` });
  quiz.push({ q: R`What is stored in <code>x</code>? <code>long x = 1_000_000 * 1_000_000;</code>`, options: ['1000000000000', '-727379968', 'compile error', 'ArithmeticException'], answer: 1, explain: R`Both literals are ints, so the multiplication is done in int and overflows <b>before</b> being widened to long. Write <code>1_000_000L * 1_000_000</code>.` });
  quiz.push({ q: R`Which line compiles?`, options: [R`<code>float f = 1.5;</code>`, R`<code>long l = 3000000000;</code>`, R`<code>byte b = 10; b += 5;</code>`, R`<code>char c = 'a'; c = c + 1;</code>`], answer: 2, explain: R`Compound assignment hides a cast. The others: 1.5 is a double; 3000000000 is too large for an int literal (needs L); <code>c + 1</code> is an int.` });
  quiz.push({ q: R`What does <code>Math.abs(Integer.MIN_VALUE)</code> return?`, options: ['2147483648', '2147483647', '-2147483648', 'throws ArithmeticException'], answer: 2, explain: R`+2<sup>31</sup> does not fit in int, so negation wraps back to MIN_VALUE. Use <code>Math.absExact</code> to get an exception instead.` });
  quiz.push({ q: R`What is <code>"😀".length()</code> (one 😀 emoji)?`, options: ['1', '2', '4', 'depends on the OS'], answer: 1, explain: R`😀 is U+1F600, above U+FFFF, so UTF-16 needs a surrogate pair: 2 chars. <code>codePointCount</code> would return 1.` });
  quiz.push({ q: R`Predict the output: <code>System.out.println('a' + 1);</code>`, options: ['b', 'a1', '98', 'compile error'], answer: 2, explain: R`char + int is numeric promotion to int: 97 + 1 = 98. You need <code>(char) ('a' + 1)</code> to print b.` });
  quiz.push({ q: R`Predict: <code>System.out.println(-7 / 2 + " " + -7 % 2);</code>`, options: ['-4 1', '-3 -1', '-3 1', '-4 -1'], answer: 1, explain: R`Division truncates toward zero (−3.5 → −3); the remainder takes the dividend's sign: −7 − (−3 × 2) = −1.` });
  quiz.push({ q: R`Predict: <code>int x = 010; System.out.println(x + 1);</code>`, options: ['11', '9', '1', 'compile error'], answer: 1, explain: R`A leading 0 makes an octal literal: 010 = 8. So 8 + 1 = 9.` });
  quiz.push({ q: R`Predict: <code>System.out.println(1 &lt;&lt; 33);</code>`, options: ['0', '8589934592', '2', 'compile error'], answer: 2, explain: R`For int, only the low 5 bits of the shift distance are used: 33 &amp; 31 = 1, so it is 1 &lt;&lt; 1 = 2.` });
  quiz.push({ q: R`Predict: <code>System.out.println(-1 &gt;&gt;&gt; 28);</code>`, options: ['-1', '15', '0', '268435455'], answer: 1, explain: R`−1 is 32 ones. Unsigned shift by 28 leaves the top 4 ones in the low positions: 1111₂ = 15. (<code>-1 &gt;&gt; 28</code> would still be −1.)` });
  quiz.push({ q: R`Predict: <code>char x = 'X'; int i = 0; System.out.print(true ? x : 0); System.out.print(false ? i : x);</code>`, options: ['XX', 'X88', '8888', '88X'], answer: 1, explain: R`In the first ternary, the constant 0 fits in char, so the type is char → X. In the second, i is an int variable, so binary numeric promotion makes it int → 88.` });
  quiz.push({ q: R`Inside a method, <code>int count = 3; int[] arr = new int[3];</code>. Where do they live?`, options: ['Both on the heap', 'Both in the stack frame', R`<code>count</code> and the reference <code>arr</code> in the stack frame; the array object on the heap`, 'In Metaspace'], answer: 2, explain: R`Locals (primitives and references) live in the method's frame; every object, including arrays, is allocated on the heap.` });
  quiz.push({ q: R`Predict: <code>System.out.println(0.1 + 0.2 == 0.3);</code>`, options: ['true', 'false', 'compile error', 'depends on the CPU'], answer: 1, explain: R`0.1 and 0.2 are not exactly representable in binary; their double sum is 0.30000000000000004. Since Java 17 all floating point is strict IEEE 754, so it is false on every CPU.` });
  quiz.push({ q: R`Your jar was built with JDK 25 (no <code>--release</code>) and the server runs Java 21. What happens?`, options: ['It runs fine', 'UnsupportedClassVersionError at startup', 'It runs in compatibility mode', 'javac refuses to compile'], answer: 1, explain: R`Class files carry a major version (69 for Java 25). A Java 21 JVM only understands up to 65. Compile with <code>--release 21</code>.` });

  /* ======================================================================
     INTERVIEW Q&A
     ====================================================================== */
  interview.push({ level: 'B', q: R`What is the difference between the JDK, the JRE and the JVM?`,
    a: R`<p>They are nested boxes. The <b>JVM</b> is the engine that loads, verifies and executes bytecode, manages memory and garbage collection. The <b>JRE</b> is the JVM plus the standard class library (<code>java.base</code> and friends) and the <code>java</code> launcher — everything needed to <i>run</i> a program. The <b>JDK</b> is the JRE plus development tools: <code>javac</code>, <code>jar</code>, <code>javap</code>, <code>jshell</code>, <code>jlink</code>, <code>jcmd</code>, debuggers and profilers — everything needed to <i>build</i> one. Modern nuance: since JDK 11 OpenJDK no longer publishes a separate JRE; you install a JDK for development and ship either a JDK image or a slim runtime created with <code>jlink</code>.</p>`,
    followUps: ['Which of the three is platform-specific?', 'How would you shrink the runtime inside a Docker image?', 'Can you run a .class file with only the JRE?'] });
  interview.push({ level: 'B', q: R`Why is Java called platform independent? Is the JVM itself platform independent?`,
    a: R`<p>javac compiles source code into <b>bytecode</b>, an instruction set for a virtual machine rather than for a real CPU. The same <code>.class</code>/<code>.jar</code> file runs anywhere a compatible JVM exists — "write once, run anywhere". The <b>JVM is not</b> platform independent: there are separate builds for Windows x64, Linux x64/aarch64, macOS aarch64 and so on, each translating bytecode into native instructions for its own OS and CPU. Fixed primitive sizes (int is always 32 bits) and strict IEEE floating point (since Java 17) also guarantee identical results across platforms. Caveats: native libraries via JNI, file paths and line separators can still break portability.</p>`,
    followUps: ['What is bytecode? Show an example with javap.', 'What can still make a Java program behave differently on Windows vs Linux?'] });
  interview.push({ level: 'B', q: R`Explain every word of <code>public static void main(String[] args)</code>. Can main be overloaded? What if it is missing?`,
    a: R`<p><b>public</b>: the launcher, which lives outside your class, must be able to call it. <b>static</b>: the JVM calls it before any object exists, so it must belong to the class. <b>void</b>: it returns nothing; the exit status is set by <code>System.exit(n)</code> or by how main ends (0 normally, 1 on an uncaught exception). <b>main</b>: the name the launcher searches for. <b>String[] args</b>: the command-line arguments (empty array, never null, when there are none). You may overload <code>main</code> with other parameter lists; the launcher only picks the <code>String[]</code> one. Without a valid main, Java 21 prints "Main method not found in class X". Since Java 25 (JEP 512) a compact source file can declare just <code>void main()</code> — the launcher accepts non-static, non-public, parameterless mains — but the classic form remains standard.</p>`,
    followUps: ['Why can\'t main simply return an int like in C?', 'What runs before main? (static initializers)', 'How do you read a JVM option like -Dmode=prod inside main?'] });
  interview.push({ level: 'B', q: R`List Java's primitive types with their sizes. Why is <code>char</code> 2 bytes?`,
    a: R`<p>byte 8 bits (−128..127), short 16 (−32,768..32,767), char 16 unsigned (0..65,535), int 32 (≈ ±2.1 × 10<sup>9</sup>), long 64 (≈ ±9.2 × 10<sup>18</sup>), float 32 (IEEE 754, ~7 significant digits), double 64 (~15–16 digits), boolean (true/false; size unspecified, typically 1 byte in arrays). Signed types use two's complement, hence one extra negative value. <code>char</code> is 16 bits because Java was designed in 1995 around Unicode, which then fit in 16 bits; today a char is a UTF-16 <b>code unit</b>, and characters above U+FFFF (emoji) need two chars. Fields get defaults (0, false, '\u0000'); local variables must be assigned before use.</p>`,
    followUps: ['How many bytes does a boolean[] of 1000 elements use?', 'When would you pick float over double?', 'Why is Byte.MIN_VALUE −128 but MAX_VALUE 127?'] });
  interview.push({ level: 'I', q: R`What happens when you compute <code>Integer.MAX_VALUE + 1</code>? How do you detect or prevent overflow?`,
    a: R`<p>It silently wraps to <code>Integer.MIN_VALUE</code> (−2,147,483,648). Java integer arithmetic is defined as two's complement modulo 2<sup>32</sup> (2<sup>64</sup> for long); no exception is thrown. Prevention: choose <code>long</code> when values can exceed ~2.1 × 10<sup>9</sup>; cast <b>one operand before</b> multiplying (<code>(long) a * b</code>); use <code>Math.addExact</code>, <code>multiplyExact</code>, <code>toIntExact</code>, <code>negateExact</code>, <code>absExact</code> to throw <code>ArithmeticException</code>; pre-check bounds (<code>a &gt; Integer.MAX_VALUE - b</code>); use <code>BigInteger</code> for unbounded values. Classic traps: <code>Math.abs(MIN_VALUE)</code> is negative, <code>(lo + hi) / 2</code> in binary search, comparators written as <code>a - b</code>.</p>`,
    followUps: ['Does checking "result &lt; 0" detect overflow? (No — 13! stays positive)', 'How does Math.addExact detect it internally?', 'What happens on floating-point overflow?'] });
  interview.push({ level: 'I', q: R`Explain widening vs narrowing conversions. Why does <code>byte b = 1; b = b + 1;</code> fail but <code>b += 1;</code> compile?`,
    a: R`<p><b>Widening</b> (byte → short → int → long → float → double, char → int) is automatic because the target can represent the range — though int/long → float and long → double may lose precision. <b>Narrowing</b> requires an explicit cast and keeps only the low bits (integers) or truncates toward zero and saturates (floating → integer). <code>b + 1</code> undergoes binary numeric promotion: byte, short and char operands are promoted to <b>int</b>, so the result is int and assigning it to a byte needs a cast. Compound assignment is specified as <code>b = (byte)(b + 1)</code> — it contains an implicit narrowing cast, which is convenient but can hide overflow (<code>short s = 10; s *= 10000;</code> gives −31072). Constant expressions that fit (<code>byte b = 10;</code>) may narrow implicitly in assignment context only.</p>`,
    followUps: ['What is (int) 3.99, (int) -3.99 and (int) Double.NaN?', 'Why can\'t you call a method taking a byte with the literal 10?', 'Predict: char x = \'X\'; System.out.print(false ? 0 : x) vs with an int variable.'] });
  interview.push({ level: 'I', q: R`Is Java compiled or interpreted?`,
    a: R`<p>Both. <b>javac</b> compiles source to platform-neutral bytecode ahead of time. At run time, HotSpot starts by <b>interpreting</b> bytecode (fast startup), profiles which methods and branches are hot, compiles them with the quick <b>C1</b> JIT, and later recompiles the hottest code with the optimizing <b>C2</b> JIT (tiered compilation). C2 uses runtime profiles for inlining, escape analysis, loop unrolling and vectorization, and can <b>deoptimize</b> if assumptions break. That is why long-running Java can rival C++ but benchmarks need warm-up (JMH). Other options: GraalVM native-image compiles ahead of time into a native binary; Project Leyden's AOT cache (JDK 24+) stores class-loading and profiling work from a training run to speed up startup.</p>`,
    followUps: ['What is deoptimization and when does it happen?', 'Why do microbenchmarks without warm-up lie?', 'Trade-offs of native-image vs JIT?'] });
  interview.push({ level: 'I', q: R`Why does <code>int i = 5; i = i++;</code> leave i at 5?`,
    a: R`<p>The right-hand side is evaluated completely before the assignment. <code>i++</code> evaluates to the <b>old</b> value (5) and, as a side effect, increments the variable to 6. Then the assignment stores the saved value 5 back into i, overwriting the increment. In bytecode it is <code>iload_1</code> (push 5), <code>iinc 1,1</code> (local becomes 6), <code>istore_1</code> (store 5). Java's evaluation order is fully specified (JLS §15.7: left operand before right, operands before the operation, the left side of a compound assignment saved first), so unlike C/C++ this is not undefined behaviour — it is deterministic but useless code that linters flag. Related: <code>a += a++</code> also loses the increment; <code>i = i++ + ++i</code> with i = 5 gives 12.</p>`,
    followUps: ['Predict int x = 5; int y = x++ + ++x * x--;', 'What does arr[i] = i = 2 do when i starts at 0?'] });
  interview.push({ level: 'I', q: R`Why is <code>0.1 + 0.2 != 0.3</code>, and how should money be represented in Java?`,
    a: R`<p><code>double</code> is IEEE 754 binary floating point with a 53-bit significand. Most decimal fractions (0.1 = 1/10) have infinite binary expansions, so they are rounded to the nearest representable value; the rounding errors of 0.1 and 0.2 add up to 0.30000000000000004, which is a different double from the one nearest to 0.3. For money use <b>BigDecimal</b> constructed from Strings or <code>BigDecimal.valueOf</code> (never <code>new BigDecimal(0.1)</code>), with an explicit scale and <code>RoundingMode</code>, or store integer <b>minor units</b> (cents) in a <code>long</code>. Compare doubles with a tolerance (<code>Math.abs(a - b) &lt; 1e-9</code>) or <code>Double.compare</code>, and remember NaN != NaN and −0.0 == 0.0.</p>`,
    followUps: ['Why does 0.1f + 0.2f print 0.3?', 'What does BigDecimal.equals vs compareTo do with 1.0 and 1.00?', 'Which rounding mode do banks typically use?'] });
  interview.push({ level: 'I', q: R`How does Java represent characters, and why can <code>"😀".length()</code> be 2? How do you process such strings correctly?`,
    a: R`<p>A <code>char</code> is a 16-bit unsigned UTF-16 <b>code unit</b>. Unicode code points range up to U+10FFFF; those above U+FFFF (most emoji, some CJK and historic scripts) are encoded as a <b>surrogate pair</b> of two chars, so <code>length()</code>, which counts chars, returns 2 for 😀. To process real characters use code-point APIs: <code>codePoints()</code>, <code>codePointAt</code>, <code>codePointCount</code>, <code>Character.charCount</code>, <code>appendCodePoint</code>, and the int overloads of <code>Character.isLetter</code> etc. For user-perceived characters (emoji with skin tones, flags, combining accents) use <code>BreakIterator</code> or regex <code>\X</code>, and normalize with <code>Normalizer</code>. When converting to bytes always specify a charset (UTF-8 is the default since JDK 18). Internally, compact strings store Latin-1 text with 1 byte per char.</p>`,
    followUps: ['How do you safely truncate a username to 20 "characters"?', 'Why might Character.isDigit accept non-ASCII digits, and when is that a problem?'] });
  interview.push({ level: 'A', q: R`Walk me through exactly what happens when you type <code>java -cp out com.acme.App input.txt</code>.`,
    a: R`<p>The native launcher parses JVM options (<code>-cp</code>), creates the JVM (heap, GC, JIT threads, CDS archive mapping) and starts the <b>main thread</b>. The application class loader finds <code>com/acme/App.class</code> under <code>out/</code> using parent delegation (bootstrap → platform → app). The class is <b>linked</b>: the verifier checks bytecode type-safety, static fields are prepared with defaults, symbolic references resolve lazily. Then <b>initialization</b> runs static initializers. The launcher looks up <code>main</code> (validating its signature) and invokes it with <code>args = {"input.txt"}</code>. Bytecode is interpreted, hot methods get JIT-compiled. When main returns, the JVM waits for all <b>non-daemon</b> threads, runs shutdown hooks and exits with status 0; an uncaught exception prints a stack trace to stderr and yields exit code 1; <code>System.exit(n)</code> forces exit with n.</p>`,
    followUps: ['What causes "Could not find or load main class"?', 'Why might the JVM not exit after main returns?', 'What do shutdown hooks guarantee under SIGKILL?'] });
  interview.push({ level: 'A', q: R`Describe the JVM's runtime memory areas. When do you get StackOverflowError vs OutOfMemoryError?`,
    a: R`<p>Shared by all threads: the <b>heap</b> (all objects and arrays, managed by the GC — generational in G1 and ZGC) and <b>Metaspace</b> (class metadata, method bytecode, constant pools; native memory since Java 8 replaced PermGen). Per thread: the <b>JVM stack</b> of frames (each with a local-variable array and an operand stack; long/double take two slots), the <b>PC register</b>, and the native method stack. There is also the JIT code cache and direct (off-heap) buffers. <b>StackOverflowError</b> happens when one thread's stack runs out of space — typically unbounded recursion; tune with <code>-Xss</code> only if recursion depth is legitimate. <b>OutOfMemoryError</b> comes in flavours: <i>Java heap space</i> (leak or undersized heap), <i>Metaspace</i> (class-loader leaks, runaway proxies), <i>unable to create native thread</i>, <i>Direct buffer memory</i>. Diagnose with heap dumps, <code>jcmd</code>, JFR and GC logs.</p>`,
    followUps: ['Which areas need garbage collection and which do not?', 'How does the JVM size the heap inside a container?', 'Can escape analysis keep an object off the heap?'] });
  interview.push({ level: 'A', q: R`Explain <code>&gt;&gt;</code> vs <code>&gt;&gt;&gt;</code>, and the famous binary-search midpoint bug.`,
    a: R`<p><code>&gt;&gt;</code> is the arithmetic (signed) right shift: it copies the sign bit into the vacated positions, so it divides by 2<sup>k</sup> rounding toward −∞ (−8 &gt;&gt; 1 = −4). <code>&gt;&gt;&gt;</code> is the logical (unsigned) shift: zeros come in, so negative numbers become large positives (−8 &gt;&gt;&gt; 1 = 2147483644). Shift distances are masked to 5 bits for int and 6 for long. The bug: <code>int mid = (low + high) / 2;</code> overflows when low + high exceeds 2<sup>31</sup> − 1 (arrays over ~1 billion elements), producing a negative index; it lived in <code>Arrays.binarySearch</code> until 2006. Fixes: <code>low + (high - low) / 2</code>, or <code>(low + high) &gt;&gt;&gt; 1</code> — the wrapped sum's bits are still correct as an unsigned 32-bit value, and the unsigned shift halves it correctly. Also note <code>byte b = -1; b &gt;&gt;&gt;= 4;</code> leaves b at −1 because of promotion to int and narrowing back.</p>`,
    followUps: ['Why is (lo + hi) >>> 1 wrong if lo and hi can be negative?', 'Where does HashMap use >>>?'] });
  interview.push({ level: 'E', q: R`A legacy service casts a <code>long</code> order ID to <code>int</code>. After two years, orders start colliding. Walk through diagnosis, fix and prevention.`,
    a: R`<p><b>Diagnosis:</b> IDs crossed 2<sup>31</sup> − 1 = 2,147,483,647; <code>(int) id</code> keeps the low 32 bits, so new IDs wrap to negative values or alias older ones (id and id + 2<sup>32</sup> map to the same int). Confirm by finding the first failing ID, checking it against 2<sup>31</sup>, and grepping for <code>(int)</code> casts, <code>intValue()</code>, int-typed DTO fields, DB columns declared <code>INT</code>, and caches keyed by int. <b>Fix:</b> widen end-to-end — Java fields to <code>long</code>, DB columns to <code>BIGINT</code> (online migration), API contracts to 64-bit (send as strings to JavaScript clients, which lose precision above 2<sup>53</sup>); replace remaining narrowing with <code>Math.toIntExact</code> so any future overflow fails loudly; repair collided data. <b>Prevention:</b> static analysis rules for narrowing casts and int multiplications widened to long, boundary tests seeded with IDs near 2<sup>31</sup> and 2<sup>32</sup>, capacity alarms at 70% of any counter's range, and reviewing type ranges in design docs.</p>`,
    followUps: ['How would you migrate an INT primary key to BIGINT with zero downtime?', 'Why can a JavaScript frontend corrupt 64-bit IDs?', 'Which other counters in a system typically overflow?'] });
  interview.push({ level: 'E', q: R`How would you package and run a Java 25 service in containers in 2026 for fast startup and low memory?`,
    a: R`<p>Build with a pinned toolchain and <code>--release</code>, run tests on the same JDK. For the image: a multi-stage build — JDK stage compiles, then <code>jdeps</code> + <code>jlink</code> create a trimmed runtime (only needed modules, <code>--strip-debug</code>), copied into a minimal base image; or use a vendor JRE-style image. Startup: enable application <b>Class Data Sharing</b> or, on JDK 24+, the Project Leyden <b>AOT cache</b> (<code>-XX:AOTCache</code>) created from a training run so classes come pre-loaded and pre-linked; for scale-to-zero functions consider <b>GraalVM native-image</b>, accepting closed-world limits on reflection and longer builds. Memory: rely on container awareness, set <code>-XX:MaxRAMPercentage</code>, choose G1 (default) or generational ZGC for latency, use virtual threads (Java 21+) to avoid thread-stack bloat. Observe with JFR, GC logs and <code>jcmd</code>; handle SIGTERM via shutdown hooks for graceful drain.</p>`,
    followUps: ['When is native-image the wrong choice?', 'How do you decide heap size vs container limit?', 'What does jdeps tell you that the pom.xml does not?'] });

  registerModule({
    id: 'java01',
    title: 'JDK, JRE, JVM & Java Basics',
    intro: R`<p>Welcome to Java! Before objects, collections or threads, every Java developer needs a rock-solid picture of <b>what happens between typing code and seeing output</b>, and of the small building blocks every line is made of. In this module you will install a JDK, compile with <code>javac</code> and run with <code>java</code>, open up the JVM to see the class loader, stack frames and JIT, and master the eight primitive types: their ranges, how casting chops bits, how operators really evaluate, why <code>int</code> silently overflows, and why <code>"😀".length()</code> is 2.</p>
<p>These topics are interview favourites precisely because they look easy: <i>"What does <code>i = i++</code> print?"</i>, <i>"JDK vs JRE vs JVM?"</i>, <i>"Why is <code>(byte) 200</code> −56?"</i>. Every topic has an everyday analogy, step-by-step visualizers (bytecode on an operand stack, bits being truncated, stack vs heap), predict-the-output examples, coding exercises from easy to hard, and a note on how AI assistants change — and do not change — what you need to know in 2026.</p>`,
    goals: [
      'Install a JDK, compile with <code>javac</code>, run with <code>java</code> (and <code>java File.java</code>), use <code>-cp</code>, <code>--release</code>, <code>javap</code> and <code>jshell</code>, and fix the common launcher errors',
      'Explain JDK vs JRE vs JVM and the JVM\'s insides (class loading, heap vs stack, interpreter + JIT + GC) clearly enough for an interview',
      'Write and explain <code>public static void main(String[] args)</code>, handle command-line arguments safely, and use exit codes and stderr properly (and know Java 25\'s simpler <code>void main()</code>)',
      'State the range of every primitive type, pick the right type from problem constraints, and predict the result of any widening, narrowing or promotion at the bit level',
      'Trace tricky expressions (<code>++</code>, compound assignment, shifts, short-circuit, string concatenation) left to right and get predict-the-output questions right',
      'Recognise, prevent and detect integer overflow (<code>long</code>, <code>Math.*Exact</code>, safe midpoints, comparators) and work correctly with <code>char</code>, Unicode code points and UTF-8'
    ],
    prereqs: R`None — this is the first Java module. Basic comfort with a terminal (opening it, changing folders) helps. Knowing binary numbers is useful but each topic re-explains the bits you need. Pairs well with DSA 1 (Java syntax for problem solving).`,
    hours: 10,
    topics: topics, practice: practice, quiz: quiz, interview: interview
  });
})();
