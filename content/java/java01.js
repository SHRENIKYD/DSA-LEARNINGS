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

  registerModule({
    id: 'java01',
    title: 'JDK, JRE, JVM & Java Basics',
    intro: R`<p>x</p>`,
    goals: [], prereqs: R`x`, hours: 9,
    topics: topics, practice: practice, quiz: quiz, interview: interview
  });
})();
