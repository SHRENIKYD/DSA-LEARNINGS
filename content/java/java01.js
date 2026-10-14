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

  registerModule({
    id: 'java01',
    title: 'JDK, JRE, JVM & Java Basics',
    intro: R`<p>x</p>`,
    goals: [], prereqs: R`x`, hours: 9,
    topics: topics, practice: practice, quiz: quiz, interview: interview
  });
})();
