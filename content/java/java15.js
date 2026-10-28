(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------------- shared helpers for prose + visualizers ---------------- */
  function C(s) { return '<code>' + H.esc(s) + '</code>'; }
  function P(s) { return '<pre><code>' + H.esc(String(s).replace(/^\n+/, '').replace(/\s+$/, '')) + '</code></pre>'; }
  function note(label, html) { return { type: 'text', label: label, html: html }; }
  function xml(code, title) { return { lang: 'xml', check: false, code: code, title: title }; }
  function kts(code, title) { return { lang: 'text', check: false, code: code, title: title || 'build.gradle.kts (Gradle Kotlin DSL)' }; }
  function lib(code, title) { return { lang: 'java', check: false, code: code, title: title }; }
  function sh(code, title) { return { lang: 'bash', check: false, code: code, title: title }; }
  function tokens(input, re, hint) {
    var t = String(input === undefined ? '' : input).trim().split(re || /[\s,]+/).filter(function (x) { return x.length; });
    if (!t.length) throw new Error(hint || 'Please type something');
    return t;
  }

  var DEFAULT_LC = ['validate', 'initialize', 'generate-sources', 'process-sources', 'generate-resources', 'process-resources', 'compile', 'process-classes', 'generate-test-sources', 'process-test-sources', 'generate-test-resources', 'process-test-resources', 'test-compile', 'process-test-classes', 'test', 'prepare-package', 'package', 'pre-integration-test', 'integration-test', 'post-integration-test', 'verify', 'install', 'deploy'];
  var CLEAN_LC = ['pre-clean', 'clean', 'post-clean'];
  var JAR_BINDINGS = { 'process-resources': 'resources:resources', compile: 'compiler:compile', 'process-test-resources': 'resources:testResources', 'test-compile': 'compiler:testCompile', test: 'surefire:test', 'package': 'jar:jar', 'integration-test': 'failsafe:integration-test (if configured)', verify: 'failsafe:verify / jacoco:check (if configured)', install: 'install:install', deploy: 'deploy:deploy', clean: 'clean:clean' };

  /* ======================================================================
     TOPIC 1 — Maven: POM, coordinates, lifecycle, plugins, scopes
     ====================================================================== */
  topics.push({
    title: 'Maven Basics: the POM, Coordinates, Lifecycle Phases, Plugins & Scopes',
    analogy: `<p>Think of Maven as a <b>car assembly line</b> with fixed stations: inspect parts → weld the frame → paint → test drive → ship to the dealer. You never tell the factory <i>how</i> to weld; you only say "take this car up to the <b>test drive</b> station", and every earlier station runs in order. The <b>POM</b> (pom.xml) is the order form: which car (coordinates), which parts from suppliers (dependencies), and which special machines to bolt onto a station (plugins). Because every Maven project uses the <b>same stations</b>, any Java developer can walk into any Maven project and type ${C('mvn verify')}.</p>`,
    explain: `<p><b>Plain idea:</b> Maven is a build tool built on <b>convention over configuration</b>. Put code in ${C('src/main/java')}, tests in ${C('src/test/java')}, resources in ${C('src/main/resources')}, and Maven already knows how to compile, test and package it. You describe <i>what</i> the project is in ${C('pom.xml')}; Maven decides <i>how</i>.</p>
<h4>1. Coordinates (GAV) — the address of every artifact</h4>
${H.table(['Part', 'Example', 'Meaning'], [
  [C('groupId'), C('com.acme.payments'), 'organisation / reverse domain'],
  [C('artifactId'), C('payment-core'), 'module name (the jar name)'],
  [C('version'), C('2.4.1') + ' or ' + C('2.5.0-SNAPSHOT'), 'release (immutable) or SNAPSHOT (moving, re-downloaded)'],
  [C('packaging'), C('jar') + ' (default), ' + C('war') + ', ' + C('pom'), 'decides which plugins bind to the lifecycle'],
  [C('classifier'), C('sources') + ', ' + C('tests') + ', ' + C('linux-x86_64'), 'a side artifact of the same version']
])}
<h4>2. Three lifecycles, built from phases</h4>
<p>A <b>lifecycle</b> is an ordered list of <b>phases</b>. Running a phase runs <b>every earlier phase of the same lifecycle first</b>.</p>
<ul>
<li><b>clean</b>: ${C('pre-clean → clean → post-clean')}</li>
<li><b>default</b> (the main one, simplified): ${C('validate → compile → test-compile → test → package → integration-test → verify → install → deploy')} (23 phases in full)</li>
<li><b>site</b>: ${C('pre-site → site → post-site → site-deploy')}</li>
</ul>
<p>${C('mvn clean install')} = run the clean lifecycle up to ${C('clean')}, then the default lifecycle up to ${C('install')} (copy the jar to ${C('~/.m2/repository')}).</p>
<h4>3. Plugins and goals do the actual work</h4>
<p>A phase is just a name; <b>plugin goals bound to it</b> do the work. For ${C('jar')} packaging Maven binds ${C('compiler:compile')} to compile, ${C('surefire:test')} to test, ${C('jar:jar')} to package, ${C('install:install')} to install. You can also run a goal directly: ${C('mvn dependency:tree')} runs only that goal, no lifecycle.</p>
${H.table(['Phase', 'Default goal (jar)'], Object.keys(JAR_BINDINGS).filter(function (k) { return k !== 'clean'; }).map(function (k) { return [C(k), C(JAR_BINDINGS[k])]; }))}
<h4>4. Dependency scopes</h4>
${H.table(['Scope', 'Compile classpath', 'Test classpath', 'Runtime / packaged', 'Typical use'], [
  [C('compile') + ' (default)', '✔', '✔', '✔', 'Guava, Jackson'],
  [C('provided'), '✔', '✔', H.c('r', '✘ (container supplies it)'), 'Servlet API, Lombok'],
  [C('runtime'), H.c('r', '✘'), '✔', '✔', 'JDBC driver, SLF4J binding'],
  [C('test'), H.c('r', '✘'), '✔', H.c('r', '✘'), 'JUnit, Mockito, AssertJ'],
  [C('import'), '—', '—', '—', 'only in dependencyManagement, imports a BOM']
])}
<h4>5. Surefire vs Failsafe</h4>
<p><b>Surefire</b> runs unit tests (${C('*Test.java')}, ${C('Test*.java')}, ${C('*Tests.java')}, ${C('*TestCase.java')}) in the ${C('test')} phase and fails the build immediately. <b>Failsafe</b> runs integration tests (${C('*IT.java')}) in ${C('integration-test')} and only fails the build in ${C('verify')}, so ${C('post-integration-test')} can still stop servers and containers. That is why CI runs ${C('mvn verify')}, not ${C('mvn integration-test')}.</p>`,
    clues: ['"what does <code>mvn clean install</code> actually do?" → two lifecycles, every phase up to the named one', '"tests ran but the jar was not built" → phases stop at the one you name (<code>mvn test</code>)', '"servlet API in the WAR conflicts with Tomcat" → <code>provided</code> scope', '"JDBC driver only needed at runtime" → <code>runtime</code> scope', '"integration tests left the DB running" → Failsafe + <code>verify</code>, not <code>integration-test</code>', '"why is the build different on my machine?" → SNAPSHOT dependencies and an unpinned plugin version'],
    code: [xml(`<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>

  <!-- Coordinates: the unique address of this artifact -->
  <groupId>com.acme.payments</groupId>
  <artifactId>payment-core</artifactId>
  <version>2.5.0-SNAPSHOT</version>
  <packaging>jar</packaging>

  <properties>
    <maven.compiler.release>21</maven.compiler.release>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
  </properties>

  <dependencies>
    <dependency>                      <!-- compile scope (default) -->
      <groupId>com.fasterxml.jackson.core</groupId>
      <artifactId>jackson-databind</artifactId>
      <version>2.17.2</version>
    </dependency>
    <dependency>                      <!-- needed only when the app runs -->
      <groupId>org.postgresql</groupId>
      <artifactId>postgresql</artifactId>
      <version>42.7.4</version>
      <scope>runtime</scope>
    </dependency>
    <dependency>                      <!-- tests only, never shipped -->
      <groupId>org.junit.jupiter</groupId>
      <artifactId>junit-jupiter</artifactId>
      <version>5.11.3</version>
      <scope>test</scope>
    </dependency>
  </dependencies>

  <build>
    <plugins>
      <!-- Pin plugin versions: otherwise the build can change under you -->
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-surefire-plugin</artifactId>
        <version>3.5.2</version>
      </plugin>
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-failsafe-plugin</artifactId>
        <version>3.5.2</version>
        <executions>
          <execution>
            <goals><goal>integration-test</goal><goal>verify</goal></goals>
          </execution>
        </executions>
      </plugin>
    </plugins>
  </build>
</project>`, 'pom.xml — coordinates, scopes, pinned plugins'), sh(`mvn validate              # is the POM well formed?
mvn test                  # compile + run unit tests (Surefire), no jar
mvn package -DskipTests   # build the jar, compile tests but do not run them
mvn verify                # unit + integration tests + checks (what CI should run)
mvn clean install         # wipe target/, rebuild, copy jar into ~/.m2/repository
mvn dependency:tree       # run ONE plugin goal, no lifecycle
mvn -q help:effective-pom # the full POM after inheritance and defaults`, 'Everyday commands')],
    codeTitle: ['pom.xml', 'Commands'],
    viz: {
      title: 'Walk the lifecycle: which phases and goals run?',
      input: 'clean package',
      inputLabel: 'Maven command (phases or plugin:goal, e.g. "clean package" or "test dependency:tree")',
      gen: function (input) {
        var t = tokens(input, /\s+/, 'Type a command such as: clean package');
        if (t.length > 4) throw new Error('Use at most 4 phases/goals');
        var frames = [];
        frames.push({ narr: 'Maven reads the command left to right. Each word is either a <b>phase</b> (runs the whole lifecycle up to it) or a <b>plugin:goal</b> (runs just that goal).', parts: [{ type: 'array', label: 'default lifecycle (23 phases)', values: DEFAULT_LC, hl: {} }, { type: 'array', label: 'clean lifecycle', values: CLEAN_LC, hl: {} }] });
        t.forEach(function (w) {
          if (w.indexOf(':') >= 0) {
            frames.push({ narr: H.esc(w) + ' contains a colon, so it is a <b>plugin goal</b>. It runs once, by itself, with no earlier phases.', parts: [{ type: 'vars', label: 'goal', vals: { goal: w, phasesRun: 'none' }, hl: { goal: 'sel' } }] });
            return;
          }
          var L = DEFAULT_LC.indexOf(w) >= 0 ? DEFAULT_LC : CLEAN_LC.indexOf(w) >= 0 ? CLEAN_LC : null;
          if (!L) throw new Error('"' + w + '" is not a phase of the clean or default lifecycle');
          var end = L.indexOf(w), step = Math.max(1, Math.ceil((end + 1) / 6));
          for (var i = 0; i <= end; i += step) {
            var hl = {};
            for (var k = 0; k < i; k++) hl[k] = 'done';
            hl[i] = 'cur';
            var g = JAR_BINDINGS[L[i]];
            frames.push({ narr: 'Phase <b>' + L[i] + '</b> runs' + (g ? ' → goal ' + C(g) + ' does the work.' : ' (no goal bound for jar packaging, so nothing happens).') + ' Earlier phases always run before a later one.', parts: [{ type: 'array', label: L === CLEAN_LC ? 'clean lifecycle' : 'default lifecycle', values: L, hl: hl }, { type: 'vars', label: 'binding', vals: { phase: L[i], goal: g || '(none)' }, hl: { goal: g ? 'ok' : 'done' } }] });
          }
          var hl2 = {};
          for (var j = 0; j <= end; j++) hl2[j] = j === end ? 'sel' : 'ok';
          frames.push({ narr: 'Stopped at <b>' + w + '</b>. Later phases of this lifecycle (' + (L.slice(end + 1, end + 3).join(', ') || 'none') + '…) did <b>not</b> run.', parts: [{ type: 'array', label: 'phases run', values: L, hl: hl2 }] });
        });
        return frames;
      }
    },
    examples: [
      { title: 'mvn test does not produce a jar', html: `<p>${C('mvn test')} runs the default lifecycle up to ${C('test')}. ${C('package')} comes later, so ${C('target/*.jar')} is not created. Use ${C('mvn package')} (which also runs tests) or ${C('mvn verify')}.</p>` },
      { title: 'Skipping tests the right way', html: `<p>${C('-DskipTests')} compiles test classes but does not run them. ${C('-Dmaven.test.skip=true')} does not even compile them, which breaks modules that depend on a ${C('test-jar')}. Neither belongs in CI; skipping tests hides failures.</p>`, code: sh(`mvn package -DskipTests          # test-compile runs, surefire skips
mvn package -Dmaven.test.skip=true # test-compile skipped too
mvn test -Dtest=OrderServiceTest#refund*  # run one class / method pattern`, 'Selecting tests') },
      { title: 'provided scope for the Servlet API', html: `<p>A WAR deployed to Tomcat must compile against ${C('jakarta.servlet-api')}, but Tomcat already ships it. With ${C('compile')} scope the jar is copied into ${C('WEB-INF/lib')} and can clash with the container's copy. ${C('provided')} keeps it on the compile and test classpaths but out of the package.</p>`, code: xml(`<dependency>
  <groupId>jakarta.servlet</groupId>
  <artifactId>jakarta.servlet-api</artifactId>
  <version>6.0.0</version>
  <scope>provided</scope>
</dependency>`, 'provided scope') },
      { title: 'SNAPSHOT vs release', html: `<p>${C('1.4.0-SNAPSHOT')} means "work in progress". Maven checks remote repositories for a newer timestamped build (daily by default), so two builds on different days may get different code. A release like ${C('1.4.0')} never changes once deployed. Rule: never release an artifact that depends on a SNAPSHOT (the release plugin refuses).</p>` }
    ],
    deepDive: `<p><b>Effective POM and inheritance.</b> Every POM inherits from the <i>Super POM</i> (default directories, the central repository, default plugin bindings). A child POM with ${C('<parent>')} inherits dependencies, ${C('dependencyManagement')}, properties and plugin configuration. ${C('mvn help:effective-pom')} shows the final merged result and is the first thing to read when a build "does something weird".</p>
<p><b>Plugin versions:</b> if you don't pin them, Maven uses versions defined by the Super POM of your Maven version, so upgrading Maven silently changes your build. Pin them in ${C('pluginManagement')} and enforce with the Enforcer plugin's ${C('requirePluginVersions')} rule.</p>
<p><b>Repository order:</b> local ${C('~/.m2/repository')} → mirrors / repositories in ${C('settings.xml')} and the POM → Maven Central. Companies route everything through a proxy (Nexus, Artifactory) for speed, auditing and to survive Central outages. Credentials belong in ${C('settings.xml')}, never in the POM.</p>
<p><b>Speed:</b> ${C('mvn -T 1C verify')} builds independent modules in parallel (one thread per core); ${C('-o')} works offline; the Maven Daemon (${C('mvnd')}) keeps a warm JVM between builds. Maven 4 adds a separate build POM vs consumer POM and better reactor handling.</p>
<p><b>Reproducible builds:</b> set ${C('project.build.outputTimestamp')} so jar entries get fixed timestamps; then the same commit produces byte-identical jars, which lets you verify artifacts and cache them safely.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants produce a complete ${C('pom.xml')} in seconds, but they often invent plugin versions, mix ${C('javax')} and ${C('jakarta')} coordinates, or put JUnit in compile scope. Treat generated build files like code from a junior: run ${C('mvn -q help:effective-pom')}, ${C('mvn dependency:tree')} and ${C('mvn verify')} before trusting them, and check every coordinate on Maven Central (hallucinated artifacts are also a supply-chain risk: someone can publish a package with the invented name). Interviewers now ask you to <b>explain</b> a build, not to type one — knowing the lifecycle and scopes is what lets you review AI output quickly.</p>`,
    problems: [{
      title: 'Which Phases Does a Maven Command Run?',
      level: 'Easy', tags: ['Maven', 'lifecycle', 'simulation'], companies: ['TCS', 'Infosys', 'Amazon'],
      statement: `<p>Write ${C('String[] phasesFor(String command)')}. The command is one or more words separated by spaces. A word containing ${C(':')} is a plugin goal and is added to the output as it is. Any other word is a phase: add every phase of its lifecycle from the first one up to and including that word, in order. Lifecycles:</p>
<p><b>clean</b>: pre-clean, clean, post-clean.<br><b>default</b>: validate, initialize, generate-sources, process-sources, generate-resources, process-resources, compile, process-classes, generate-test-sources, process-test-sources, generate-test-resources, process-test-resources, test-compile, process-test-classes, test, prepare-package, package, pre-integration-test, integration-test, post-integration-test, verify, install, deploy.</p>
<p>If a word is neither a goal nor a known phase, return the single element ${C('"ERROR:<word>"')}.</p>`,
      constraints: `1 ≤ words ≤ 10; words are separated by one or more spaces.`,
      example: `<p>${C('"clean"')} → ${H.c('g', '[pre-clean, clean]')} (post-clean is later, so it does not run).<br>${C('"compile"')} → ${H.c('g', '[validate, initialize, generate-sources, process-sources, generate-resources, process-resources, compile]')}.<br>${C('"instal"')} → ${H.c('r', '[ERROR:instal]')} — a typo is rejected, just as Maven fails with "Unknown lifecycle phase".</p>`,
      brute: { why: `<p>Hard-coding one big ${C('if/else')} per phase works for three phases and becomes 26 copies of almost the same list. Every list repeats the ones before it, so a typo in one branch gives a wrong order that nothing catches.</p>`, code: `
class Brute {
    String[] phasesFor(String command) {
        if (command.equals("clean")) return new String[]{"pre-clean", "clean"};
        if (command.equals("validate")) return new String[]{"validate"};
        if (command.equals("initialize")) return new String[]{"validate", "initialize"};
        // one hand-written branch per phase and per combination of words: does not scale
        return new String[]{"ERROR:" + command};
    }
}` },
      mcq: { q: 'You run <code>mvn install</code>. Which phase does NOT run?', options: ['test', 'package', 'verify', 'deploy'], answer: 3, explain: 'A phase runs every earlier phase of its lifecycle. deploy comes after install, so it does not run.' },
      hints: [`<p>Hint 1: a lifecycle is just an ordered list. "Run up to phase X" means "take the prefix of the list ending at X".</p>`, `<p>Hint 2: keep two ${C('List<String>')} constants. For each word, find which list contains it and add ${C('list.subList(0, index + 1)')}.</p>`, `<p>Hint 3: split with ${C('trim().split("\\\\s+")')}; check for ${C(':')} first; return the error array as soon as a word is unknown.</p>`],
      tests: { sig: 'string -> string[]', fn: 'phasesFor', cases: [
        [['compile'], ['validate', 'initialize', 'generate-sources', 'process-sources', 'generate-resources', 'process-resources', 'compile']],
        [['clean install'], ['pre-clean', 'clean', 'validate', 'initialize', 'generate-sources', 'process-sources', 'generate-resources', 'process-resources', 'compile', 'process-classes', 'generate-test-sources', 'process-test-sources', 'generate-test-resources', 'process-test-resources', 'test-compile', 'process-test-classes', 'test', 'prepare-package', 'package', 'pre-integration-test', 'integration-test', 'post-integration-test', 'verify', 'install']],
        [['validate'], ['validate']],
        [['clean'], ['pre-clean', 'clean']],
        [['package dependency:tree'], ['validate', 'initialize', 'generate-sources', 'process-sources', 'generate-resources', 'process-resources', 'compile', 'process-classes', 'generate-test-sources', 'process-test-sources', 'generate-test-resources', 'process-test-resources', 'test-compile', 'process-test-classes', 'test', 'prepare-package', 'package', 'dependency:tree']],
        [['instal'], ['ERROR:instal']],
        [['  dependency:tree   help:effective-pom '], ['dependency:tree', 'help:effective-pom']],
        [['post-clean verify'], ['pre-clean', 'clean', 'post-clean', 'validate', 'initialize', 'generate-sources', 'process-sources', 'generate-resources', 'process-resources', 'compile', 'process-classes', 'generate-test-sources', 'process-test-sources', 'generate-test-resources', 'process-test-resources', 'test-compile', 'process-test-classes', 'test', 'prepare-package', 'package', 'pre-integration-test', 'integration-test', 'post-integration-test', 'verify']],
        [['clean bogus'], ['ERROR:bogus']]
      ] },
      solution: {
        approach: `<p>Store each lifecycle as an ordered list. For every word: a goal is copied as it is; a phase adds the <b>prefix</b> of its lifecycle that ends at it. This is exactly Maven's rule "a phase runs all earlier phases first".</p>`,
        code: `
class Solution {
    static final List<String> CLEAN = List.of("pre-clean", "clean", "post-clean");
    static final List<String> DEFAULT = List.of("validate", "initialize", "generate-sources",
        "process-sources", "generate-resources", "process-resources", "compile", "process-classes",
        "generate-test-sources", "process-test-sources", "generate-test-resources",
        "process-test-resources", "test-compile", "process-test-classes", "test", "prepare-package",
        "package", "pre-integration-test", "integration-test", "post-integration-test", "verify",
        "install", "deploy");

    String[] phasesFor(String command) {
        List<String> out = new ArrayList<>();
        for (String word : command.trim().split("\\\\s+")) {
            if (word.contains(":")) {           // plugin:goal runs alone
                out.add(word);
                continue;
            }
            List<String> lifecycle = DEFAULT.contains(word) ? DEFAULT
                                   : CLEAN.contains(word) ? CLEAN : null;
            if (lifecycle == null) return new String[]{"ERROR:" + word};
            out.addAll(lifecycle.subList(0, lifecycle.indexOf(word) + 1)); // every earlier phase first
        }
        return out.toArray(new String[0]);
    }
}`,
        dry: { head: ['word', 'kind', 'lifecycle', 'index', 'added'], rows: [
          ['clean', 'phase', 'clean', '1', 'pre-clean, clean'],
          ['package', 'phase', 'default', '16', 'validate … package (17 phases)'],
          ['dependency:tree', 'goal', '—', '—', 'dependency:tree'],
          ['instal', 'unknown', '—', '—', H.c('r', 'return [ERROR:instal]')]
        ] },
        complexity: `<p>O(W × L) time, where W is the number of words and L ≤ 23 is the lifecycle length (${C('indexOf')} and the prefix copy). O(output) extra space.</p>`,
        followUps: ['How would you add the site lifecycle?', 'Which goals are bound to each phase for war packaging?', 'Why does Maven run a phase twice if you type <code>mvn test test</code>?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 2 — Dependency resolution: transitive deps, conflicts, BOMs
     ====================================================================== */
  topics.push({
    title: 'Dependency Resolution: Transitive Dependencies, Conflicts, Exclusions & BOMs',
    analogy: `<p>Imagine planning a wedding where you invite friends, and each friend may bring a <b>plus-one</b>, who may bring their own plus-one. Two guests both bring someone called "Guava" — one brings Guava aged 20, the other Guava aged 32 — but there is only <b>one chair</b> with that name. Maven's rule: the guest <b>closest to you on the invitation chain</b> keeps the chair; if two are equally close, the one <b>invited first</b> wins. Gradle's rule is simpler: the <b>highest version</b> always gets the chair. A <b>BOM</b> is the seating chart the venue hands you in advance: "if anyone named Jackson shows up, it is version 2.17.2, full stop".</p>`,
    explain: `<p><b>Plain idea:</b> you declare a few <b>direct</b> dependencies; each of them has its own POM listing <b>its</b> dependencies, and so on. Maven downloads this whole graph (the <b>transitive closure</b>), but the classpath can hold only <b>one version</b> of each ${C('groupId:artifactId')}. Choosing that version is called <b>dependency mediation</b>.</p>
<h4>1. Maven: nearest wins, then first declaration</h4>
${H.table(['Path from your project', 'Depth', 'Result'], [
  [C('app → guava 32.1'), '1', H.c('g', 'wins: nearest')],
  [C('app → lib-a → guava 20.0'), '2', H.c('r', 'omitted for conflict')],
  [C('app → lib-b → x → guava 31.0'), '3', H.c('r', 'omitted')]
])}
<p>Equal depth? The dependency <b>declared first</b> in the POM wins. Note: Maven does <b>not</b> pick the highest version. It can select an <i>older</i> version than some library needs, and you find out at runtime as ${C('NoSuchMethodError')} or ${C('ClassNotFoundException')}.</p>
<h4>2. Gradle: highest version wins</h4>
<p>Gradle collects every requested version of a module and picks the <b>highest</b> (with rich versions: ${C('strictly')}, ${C('require')}, ${C('prefer')}, ${C('reject')}). ${C('./gradlew dependencies')} shows ${C('20.0 -> 32.1-jre')} where upgrades happened; ${C('dependencyInsight --dependency guava')} explains why.</p>
<h4>3. Tools to take control</h4>
<ul>
<li><b>Direct declaration</b>: declare the version yourself at depth 1 — nearest wins, so you win.</li>
<li><b>${C('<dependencyManagement>')}</b>: pins the version of a module <b>wherever it appears</b> in the graph (direct or transitive) without adding it as a dependency. Child modules then declare the dependency without a version.</li>
<li><b>BOM</b> (Bill of Materials): a ${C('pom')}-packaged artifact that only contains ${C('dependencyManagement')}. Import it with ${C('<type>pom</type><scope>import</scope>')} (Maven) or ${C('implementation(platform("..."))')} (Gradle). Examples: ${C('spring-boot-dependencies')}, ${C('jackson-bom')}, ${C('junit-bom')}.</li>
<li><b>Exclusions</b>: cut a transitive edge (e.g. remove ${C('commons-logging')} from Spring and use ${C('jcl-over-slf4j')}).</li>
<li><b>${C('<optional>true</optional>')}</b>: "I use this, but my users don't get it transitively."</li>
<li><b>Enforcer</b> ${C('dependencyConvergence')}: fail the build if two paths ask for different versions; ${C('requireUpperBoundDeps')}: fail if the chosen version is lower than one somebody asked for.</li>
</ul>
<h4>4. Scope propagation in one line</h4>
<p>A transitive dependency's scope is the "narrower" of the two: your ${C('test')} dependency's ${C('compile')} dependencies become ${C('test')} for you; ${C('provided')} and ${C('test')} dependencies of your dependencies are <b>not</b> inherited at all.</p>`,
    clues: ['"NoSuchMethodError at runtime but it compiles" → version conflict: an older transitive version won', '"which version of Jackson ends up on the classpath?" → nearest wins (Maven) / highest wins (Gradle)', '"keep 20 microservices on the same library versions" → BOM / platform', '"remove a library a dependency drags in" → exclusions', '"fail the build when versions disagree" → Enforcer dependencyConvergence / Gradle failOnVersionConflict', '"<code>mvn dependency:tree -Dverbose</code>" → see omitted-for-conflict entries'],
    code: [xml(`<!-- Parent POM: pin versions once, children omit <version> -->
<dependencyManagement>
  <dependencies>
    <!-- Import a BOM: every Jackson module gets 2.17.2, even transitively -->
    <dependency>
      <groupId>com.fasterxml.jackson</groupId>
      <artifactId>jackson-bom</artifactId>
      <version>2.17.2</version>
      <type>pom</type>
      <scope>import</scope>
    </dependency>
    <dependency>
      <groupId>org.junit</groupId>
      <artifactId>junit-bom</artifactId>
      <version>5.11.3</version>
      <type>pom</type>
      <scope>import</scope>
    </dependency>
    <!-- Pin a transitive library that two dependencies disagree on -->
    <dependency>
      <groupId>com.google.guava</groupId>
      <artifactId>guava</artifactId>
      <version>33.3.1-jre</version>
    </dependency>
  </dependencies>
</dependencyManagement>

<dependencies>
  <dependency>
    <groupId>com.fasterxml.jackson.core</groupId>
    <artifactId>jackson-databind</artifactId>   <!-- no version: from the BOM -->
  </dependency>
  <dependency>
    <groupId>org.springframework</groupId>
    <artifactId>spring-context</artifactId>
    <version>6.1.14</version>
    <exclusions>                                  <!-- cut one transitive edge -->
      <exclusion>
        <groupId>commons-logging</groupId>
        <artifactId>commons-logging</artifactId>
      </exclusion>
    </exclusions>
  </dependency>
</dependencies>`, 'dependencyManagement, BOM import and exclusions'), sh(`mvn dependency:tree -Dverbose -Dincludes=com.google.guava
# [INFO] com.acme:app:jar:1.0
# [INFO] +- com.acme:lib-a:jar:1.0:compile
# [INFO] |  \\- (com.google.guava:guava:jar:20.0:compile - omitted for conflict with 32.1-jre)
# [INFO] \\- com.google.guava:guava:jar:32.1-jre:compile
mvn dependency:analyze      # used-but-undeclared and declared-but-unused dependencies`, 'Inspecting the graph')],
    codeTitle: ['pom.xml', 'Inspecting'],
    viz: {
      title: 'Maven mediation: nearest wins, then first declaration',
      input: 'app>lib-a>guava:20.0, app>lib-b>x>guava:31.0, app>guava:32.1, app>lib-a>jackson:2.15, app>lib-c>jackson:2.17',
      inputLabel: 'Comma-separated paths from the root; the last item is artifact:version',
      gen: function (input) {
        var paths = tokens(input, /\s*,\s*/, 'Example: app>lib-a>guava:20.0, app>guava:32.1');
        if (paths.length > 10) throw new Error('Use at most 10 paths');
        var rows = paths.map(function (p, i) {
          var parts = p.split('>'), last = parts[parts.length - 1], c = last.lastIndexOf(':');
          if (parts.length < 2 || c <= 0) throw new Error('Each path looks like app>lib>artifact:version');
          return { i: i, path: p, art: last.slice(0, c), ver: last.slice(c + 1), depth: parts.length - 1 };
        });
        var cols = ['#', 'path', 'artifact', 'version', 'depth', 'decision'];
        var dec = rows.map(function () { return '?'; });
        var tab = function () { return { type: 'table', label: 'candidates (in declaration order)', columns: cols, rows: rows.map(function (r, k) { return [String(r.i + 1), r.path, r.art, r.ver, String(r.depth), dec[k]]; }) }; };
        var frames = [{ narr: 'Maven sees every path to every artifact. It must keep exactly <b>one version per artifact</b>.', parts: [tab()] }];
        var best = {};
        rows.forEach(function (r, k) {
          var b = best[r.art], why;
          if (!b) { best[r.art] = r; dec[k] = 'winner (first seen)'; why = 'First time we see <b>' + H.esc(r.art) + '</b>: it is the current winner.'; }
          else if (r.depth < b.depth) { dec[b.i] = 'omitted (farther)'; best[r.art] = r; dec[k] = 'winner (nearer)'; why = 'Depth ' + r.depth + ' &lt; ' + b.depth + ': this path is <b>nearer</b>, so ' + H.esc(r.ver) + ' replaces ' + H.esc(b.ver) + '.'; }
          else { dec[k] = r.depth === b.depth ? 'omitted (declared later)' : 'omitted (farther)'; why = r.depth === b.depth ? 'Same depth as the current winner, but declared <b>later</b>: first declaration wins.' : 'Depth ' + r.depth + ' is farther than ' + b.depth + ': omitted for conflict.'; }
          var hl = {}; hl[k] = dec[k].indexOf('winner') === 0 ? 'ok' : 'bad';
          var t = tab(); t.hl = hl;
          frames.push({ narr: why, parts: [t] });
        });
        frames.push({ narr: 'Final classpath: one version per artifact. Notice Maven never compared version <i>numbers</i> — Gradle would pick the highest instead.', parts: [{ type: 'map', label: 'resolved', entries: Object.keys(best).sort().map(function (a) { return [a, best[a].ver]; }) }] });
        return frames;
      }
    },
    examples: [
      { title: 'The classic NoSuchMethodError', html: `<p>${C('lib-b')} calls ${C('ImmutableList.toImmutableList()')} (Guava 21+). ${C('lib-a')} brings Guava 20 at depth 2, ${C('lib-b')} brings Guava 31 at depth 2, and ${C('lib-a')} is declared first, so <b>Guava 20 wins</b>. Your own code would fail to compile against 20, but if the call sits inside ${C('lib-b')} (compiled long ago against 31), everything builds. When ${C('lib-b')} runs that call: ${H.c('r', 'NoSuchMethodError')}. Fix: pin Guava in ${C('dependencyManagement')} or declare it directly.</p>` },
      { title: 'Gradle picks the highest — and you can still force', html: `<p>Same graph in Gradle: 20.0 and 31.0 are requested, <b>31.0</b> is selected. To downgrade or lock a version, use a strict constraint.</p>`, code: kts(`dependencies {
    implementation(platform("com.fasterxml.jackson:jackson-bom:2.17.2"))  // BOM
    implementation("com.fasterxml.jackson.core:jackson-databind")        // version from the platform
    implementation("com.google.guava:guava") {
        version { strictly("33.3.1-jre") }   // nobody may move it up or down
    }
    constraints {
        implementation("org.yaml:snakeyaml:2.3") { because("CVE fix for older 1.x") }
    }
}
configurations.all { resolutionStrategy.failOnVersionConflict() }   // like Maven Enforcer`) },
      { title: 'Exclusion vs dependencyManagement', html: `<p>An <b>exclusion</b> removes the module from one path (it may still arrive by another path). <b>dependencyManagement</b> does not remove anything; it changes which <i>version</i> is used everywhere. To ban a library completely, use the Enforcer ${C('bannedDependencies')} rule.</p>` },
      { title: 'Shading: the last resort', html: `<p>When two libraries truly need incompatible major versions of the same dependency (e.g. Guava 19 and 33), the Maven Shade plugin can <b>relocate</b> one copy into a different package (${C('com.google.common')} → ${C('shaded.com.google.common')}) inside your fat jar. It works, but makes jars bigger and stack traces confusing — prefer upgrading.</p>` }
    ],
    deepDive: `<p><b>How Maven really resolves:</b> Maven Resolver (formerly Aether) builds the graph breadth-first, collecting each node's POM, then applies <i>conflict resolution</i> (nearest-wins), then <i>scope selection</i>, then filters by exclusions and optional flags. Children of a losing node are dropped too, which is why removing one dependency can change unrelated versions.</p>
<p><b>Version ranges</b> like ${C('[1.2,2.0)')} exist but make builds non-reproducible: tomorrow's release can change today's build. Most teams ban them. Gradle offers <b>dependency locking</b> (${C('--write-locks')} creates ${C('gradle.lockfile')}) to freeze dynamic versions.</p>
<p><b>Gradle module metadata</b> (${C('.module')} files) carries <i>variants</i> (api vs runtime, Java version, platform) and <i>capabilities</i>; two modules declaring the same capability (e.g. ${C('log4j-over-slf4j')} vs ${C('log4j')}) are detected as a conflict even with different names.</p>
<p><b>Spring Boot:</b> its parent POM / dependency-management plugin imports ${C('spring-boot-dependencies')}, a BOM with hundreds of versions tested together. Overriding one is a property change (${C('<jackson-bom.version>')}) — but you leave the tested set.</p>
<p><b>Security:</b> most vulnerable code ships transitively. ${C('mvn dependency:tree')}, OWASP Dependency-Check, GitHub Dependabot or Snyk find a vulnerable transitive version; the fix is usually a ${C('dependencyManagement')} pin (Maven) or a ${C('constraints')} block (Gradle) until the direct dependency upgrades.</p>`,
    aiEra: `<p><b>What AI changes:</b> pasting a ${C('NoSuchMethodError')} and the output of ${C('mvn dependency:tree -Dverbose')} into an assistant usually gets you the right diagnosis in seconds — <b>if you give it the tree</b>. Without it the model guesses versions. Assistants also tend to "fix" conflicts by adding exclusions everywhere; the cleaner fix is usually a single BOM or pin. Automated dependency bots (Dependabot, Renovate) now open upgrade PRs daily, which only works if your test suite is good enough to trust a green build — which is the rest of this module.</p>`,
    problems: [{
      title: 'Nearest-Wins Dependency Mediation',
      level: 'Medium', tags: ['Maven', 'dependency mediation', 'hash map'], companies: ['Amazon', 'Atlassian', 'JPMorgan'],
      statement: `<p>Each string is one path in a dependency graph, from your project to an artifact, for example ${C('"app>lib-a>guava:20.0"')}. The last element is ${C('artifact:version')} (split at the <b>last</b> colon); its depth is the number of ${C('>')} characters. Paths are given in declaration order.</p>
<p>Write ${C('String[] resolve(String[] paths)')} that applies Maven's rule: for each artifact keep the version from the path with the <b>smallest depth</b>; on a tie, keep the one that appears <b>first</b>. Return ${C('"artifact:version"')} strings sorted by artifact name.</p>`,
      constraints: `0 ≤ paths ≤ 10<sup>4</sup>; every path has at least one ${C('>')}.`,
      example: `<p>${C('["app>lib-b>x>guava:31.0", "app>lib-a>guava:20.0"]')} → ${H.c('g', '["guava:20.0"]')}. Depth 2 beats depth 3, even though 31.0 is newer and declared first. Maven does not compare version numbers.</p>`,
      brute: { why: `<p>For every artifact, scan all paths again to find the minimum depth, then scan again to find the first path with that depth. That is O(n²) for n paths, and it re-parses every string many times.</p>`, code: `
class Brute {
    String[] resolve(String[] paths) {
        TreeMap<String, String> out = new TreeMap<>();
        for (String p : paths) {
            String last = p.substring(p.lastIndexOf('>') + 1);
            String art = last.substring(0, last.lastIndexOf(':'));
            if (out.containsKey(art)) continue;
            int best = Integer.MAX_VALUE; String ver = null;
            for (String q : paths) {                     // rescan everything for this artifact
                String l2 = q.substring(q.lastIndexOf('>') + 1);
                int c = l2.lastIndexOf(':');
                int depth = (int) q.chars().filter(ch -> ch == '>').count();
                if (l2.substring(0, c).equals(art) && depth < best) { best = depth; ver = l2.substring(c + 1); }
            }
            out.put(art, ver);
        }
        List<String> r = new ArrayList<>();
        out.forEach((a, v) -> r.add(a + ":" + v));
        return r.toArray(new String[0]);
    }
}` },
      mcq: { q: 'app → lib-a → log 1.0 (declared first) and app → lib-b → log 2.0. Which version does Maven pick?', options: ['2.0, the highest', '1.0, the first declared at equal depth', 'Both are put on the classpath', 'The build fails'], answer: 1, explain: 'Both are at depth 2, so the first declaration wins. Maven never compares version numbers during mediation (unless you add the Enforcer upper-bound rule).' },
      hints: [`<p>Hint 1: you only need, per artifact, the best (depth, position) seen so far. One pass is enough.</p>`, `<p>Hint 2: keep a ${C('Map<String, Integer>')} of best depth and a ${C('TreeMap<String, String>')} of chosen version. Replace only when the new depth is <b>strictly</b> smaller — that keeps the first declaration on ties.</p>`, `<p>Hint 3: depth = count of ${C('>')}; split the last segment at ${C('lastIndexOf(\':\')')}; the TreeMap gives sorted output for free; empty input returns an empty array.</p>`],
      tests: { sig: 'string[] -> string[]', fn: 'resolve', cases: [
        [[['app>guava:32.1', 'app>lib-a>guava:20.0']], ['guava:32.1']],
        [[['app>lib-a>guava:20.0', 'app>lib-b>guava:31.0']], ['guava:20.0']],
        [[['app>lib-b>x>guava:31.0', 'app>lib-a>guava:20.0']], ['guava:20.0']],
        [[[]], []],
        [[['app>a:1']], ['a:1']],
        [[['app>lib-a>jackson:2.15', 'app>lib-a>guava:20.0', 'app>lib-b>jackson:2.17', 'app>guava:19.0']], ['guava:19.0', 'jackson:2.15']],
        [[['app>x>y>z>log:1.2', 'app>p>q>log:2.0', 'app>r>s>t>log:3.0']], ['log:2.0']],
        [[['app>m>org.slf4j/api:2.0.13', 'app>slf4j:1.7']], ['org.slf4j/api:2.0.13', 'slf4j:1.7']]
      ] },
      solution: {
        approach: `<p>One pass in declaration order. For each artifact remember the best depth; overwrite only on a <b>strictly smaller</b> depth so ties keep the earlier path. A ${C('TreeMap')} keeps the output sorted.</p>`,
        code: `
class Solution {
    String[] resolve(String[] paths) {
        Map<String, Integer> bestDepth = new HashMap<>();
        TreeMap<String, String> chosen = new TreeMap<>();      // sorted by artifact
        for (String p : paths) {
            int depth = 0;
            for (int i = 0; i < p.length(); i++) if (p.charAt(i) == '>') depth++;
            String last = p.substring(p.lastIndexOf('>') + 1);
            int colon = last.lastIndexOf(':');
            String artifact = last.substring(0, colon), version = last.substring(colon + 1);
            Integer best = bestDepth.get(artifact);
            if (best == null || depth < best) {                 // strictly nearer, ties keep the first
                bestDepth.put(artifact, depth);
                chosen.put(artifact, version);
            }
        }
        List<String> out = new ArrayList<>();
        for (Map.Entry<String, String> e : chosen.entrySet()) out.add(e.getKey() + ":" + e.getValue());
        return out.toArray(new String[0]);
    }
}`,
        dry: { head: ['path', 'artifact', 'depth', 'best before', 'action'], rows: [
          ['app>lib-a>jackson:2.15', 'jackson', '2', '—', H.c('g', 'take 2.15')],
          ['app>lib-a>guava:20.0', 'guava', '2', '—', H.c('g', 'take 20.0')],
          ['app>lib-b>jackson:2.17', 'jackson', '2', '2', H.c('r', 'tie: keep 2.15')],
          ['app>guava:19.0', 'guava', '1', '2', H.c('g', 'nearer: take 19.0')]
        ] },
        complexity: `<p>O(total characters + k log k) where k is the number of distinct artifacts (TreeMap). O(k) extra space.</p>`,
        followUps: ['Change it to Gradle semantics (highest version wins)', 'How would dependencyManagement change the result?', 'Why does Maven also drop the children of a losing node?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 3 — Gradle and multi-module builds
     ====================================================================== */
  var GRADLE_G = ['build:assemble,check', 'assemble:jar', 'jar:classes', 'check:test', 'test:classes,testClasses', 'testClasses:classes', 'classes:compileJava,processResources'];
  topics.push({
    title: 'Gradle & Multi-Module Builds: Task Graphs, Configurations, Caching, Reactor',
    analogy: `<p>Maven is a <b>fixed assembly line</b>; Gradle is a <b>kitchen with a recipe graph</b>. "Serve dinner" depends on "cook pasta" and "make sauce"; "make sauce" depends on "chop tomatoes". The chef works out the order from the arrows and does each step <b>once</b>. A smart chef also remembers: "the tomatoes are the same as yesterday and the chopped bowl is still in the fridge" — so chopping is <b>skipped</b> (up-to-date) or the bowl is fetched from a shared fridge (<b>build cache</b>). A multi-module build is a restaurant with several kitchens that hand dishes to each other in the right order.</p>`,
    explain: `<p><b>Plain idea:</b> Gradle builds a <b>directed acyclic graph (DAG) of tasks</b> and runs only the tasks needed for what you asked, each once, skipping work whose inputs have not changed.</p>
<h4>1. Three build phases</h4>
<ol><li><b>Initialization</b>: read ${C('settings.gradle.kts')}, decide which projects (modules) take part.</li>
<li><b>Configuration</b>: run every ${C('build.gradle.kts')} script, create and configure tasks, wire ${C('dependsOn')} edges. Keep this phase cheap — no network calls or heavy work here.</li>
<li><b>Execution</b>: run the requested tasks and their dependencies in graph order.</li></ol>
<h4>2. The java plugin's task graph</h4>
<p>${C('build → assemble + check')}; ${C('assemble → jar → classes → compileJava + processResources')}; ${C('check → test → classes + testClasses')}. ${C('./gradlew build -x test')} removes ${C('test')} from the graph.</p>
<h4>3. Incremental builds and caching</h4>
<ul><li><b>UP-TO-DATE</b>: a task declares inputs and outputs; if both fingerprints match the last run, it is skipped.</li>
<li><b>FROM-CACHE</b>: the <b>build cache</b> (local or remote) stores outputs by a hash of inputs; any machine with the same inputs reuses them — CI warms it, laptops read it.</li>
<li><b>Configuration cache</b>: caches the configured task graph, so the configuration phase is skipped on repeat builds.</li>
<li><b>Gradle daemon</b>: a warm background JVM, so builds start fast.</li></ul>
<h4>4. Dependency configurations (java-library plugin)</h4>
${H.table(['Configuration', 'Compile classpath', 'Runtime classpath', 'Leaks to consumers?'], [
  [C('api'), '✔', '✔', H.c('y', '✔ compile + runtime')],
  [C('implementation'), '✔', '✔', H.c('g', 'runtime only (hidden at compile time)')],
  [C('compileOnly'), '✔', '✘', '✘ (like Maven provided)'],
  [C('runtimeOnly'), '✘', '✔', 'runtime only (like Maven runtime)'],
  [C('testImplementation'), 'tests only', 'tests only', '✘ (like Maven test)']
])}
<p>Prefer ${C('implementation')}: changing a hidden dependency does not force consumers to recompile, and consumers cannot accidentally depend on it.</p>
<h4>5. Multi-module builds</h4>
<p><b>Maven reactor:</b> a parent POM with ${C('<packaging>pom</packaging>')} lists ${C('<modules>')}; Maven sorts modules so each is built after the modules it depends on. Useful flags: ${C('-pl core')} (only this module), ${C('-am')} (also make what it needs), ${C('-amd')} (also make what depends on it), ${C('-rf :web')} (resume from a failed module).</p>
<p><b>Gradle multi-project:</b> ${C('settings.gradle.kts')} has ${C('include("core", "web")')}; ${C('web')} uses ${C('implementation(project(":core"))')}. Share build logic with <b>convention plugins</b> (in ${C('build-logic')} or ${C('buildSrc')}) and versions with a <b>version catalog</b> (${C('gradle/libs.versions.toml')}).</p>
<h4>6. Maven vs Gradle in one table</h4>
${H.table(['', 'Maven', 'Gradle'], [
  ['Model', 'fixed lifecycle of phases', 'DAG of tasks'],
  ['Build file', 'declarative XML', 'Kotlin / Groovy DSL (code)'],
  ['Conflicts', 'nearest wins', 'highest wins'],
  ['Incremental / cache', 'limited (extensions exist)', 'built in: up-to-date, build cache'],
  ['Strength', 'predictable, every project looks the same', 'fast, flexible, Android standard'],
  ['Wrapper', C('mvnw'), C('gradlew') + ' (pins the Gradle version)']
])}`,
    clues: ['"the build takes 20 minutes, most modules did not change" → incremental build, build cache, -pl/-am', '"what is the difference between api and implementation?" → leakage to consumers\' compile classpath', '"same Gradle version for every developer and CI" → the wrapper (gradlew + gradle-wrapper.properties)', '"build only the payments module and what it needs" → <code>mvn -pl payments -am</code>', '"share versions across 30 modules" → parent POM / BOM / version catalog', '"task ran even though nothing changed" → undeclared or unstable inputs/outputs'],
    code: [kts(`// settings.gradle.kts
rootProject.name = "shop"
include("core", "web")

// gradle/libs.versions.toml (version catalog)
// [versions]  junit = "5.11.3"
// [libraries] junit-bom = { module = "org.junit:junit-bom", version.ref = "junit" }

// core/build.gradle.kts
plugins { \`java-library\` }
java { toolchain { languageVersion = JavaLanguageVersion.of(21) } }
repositories { mavenCentral() }
dependencies {
    api("com.fasterxml.jackson.core:jackson-annotations:2.17.2")   // part of core's public API
    implementation("com.google.guava:guava:33.3.1-jre")             // internal detail
    testImplementation(platform(libs.junit.bom))
    testImplementation("org.junit.jupiter:junit-jupiter")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}
tasks.test { useJUnitPlatform() }                                  // run JUnit 5 tests

// web/build.gradle.kts
plugins { application }
dependencies { implementation(project(":core")) }                  // module dependency`, 'Gradle multi-project (Kotlin DSL)'), xml(`<!-- parent pom.xml -->
<groupId>com.acme</groupId>
<artifactId>shop-parent</artifactId>
<version>1.0.0-SNAPSHOT</version>
<packaging>pom</packaging>
<modules>
  <module>core</module>
  <module>web</module>     <!-- web depends on core: the reactor builds core first -->
</modules>`, 'Maven reactor parent'), sh(`./gradlew build --scan          # build + a shareable report of every task
./gradlew :web:test --tests '*Checkout*'
./gradlew build -x test           # exclude a task from the graph
./gradlew dependencies --configuration runtimeClasspath
mvn -pl web -am verify            # web plus everything it needs
mvn -rf :web verify               # resume after a failure in web`, 'Commands')],
    codeTitle: ['Gradle', 'Maven reactor', 'Commands'],
    viz: {
      title: 'Gradle task graph: what runs for ./gradlew build ?',
      input: 'build -x test',
      inputLabel: 'Tasks to run, optionally with -x <task> (java plugin graph)',
      gen: function (input) {
        var t = tokens(input, /\s+/, 'Example: build -x test');
        var req = [], ex = {};
        for (var i = 0; i < t.length; i++) { if (t[i] === '-x') { if (!t[i + 1]) throw new Error('-x needs a task name'); ex[t[++i]] = 1; } else req.push(t[i]); }
        var g = {}; GRADLE_G.forEach(function (d) { var p = d.split(':'); g[p[0]] = p[1].split(','); });
        var names = ['build', 'assemble', 'check', 'jar', 'test', 'classes', 'testClasses', 'compileJava', 'processResources'];
        req.forEach(function (r) { if (names.indexOf(r) < 0) throw new Error('Known tasks: ' + names.join(', ')); });
        var pos = { build: [50, 5], assemble: [25, 18], check: [75, 18], jar: [25, 31], test: [75, 31], testClasses: [85, 44], classes: [45, 44], compileJava: [30, 57], processResources: [62, 57] };
        var nodes = names.map(function (n) { return { id: n, label: n, x: pos[n][0], y: pos[n][1], shape: 'box' }; });
        var edges = []; Object.keys(g).forEach(function (a) { g[a].forEach(function (b) { edges.push([a, b]); }); });
        var st = {}, done = [], frames = [];
        function graph(cur) {
          var hl = {}, tags = {};
          done.forEach(function (d, k) { hl[d] = 'ok'; tags[d] = '#' + (k + 1); });
          Object.keys(ex).forEach(function (e) { hl[e] = 'bad'; tags[e] = 'excluded'; });
          if (cur) hl[cur] = 'cur';
          return { type: 'graph', label: 'task graph (arrow = dependsOn)', directed: true, height: 64, nodes: nodes, edges: edges, hl: hl, tags: tags };
        }
        frames.push({ narr: 'Configuration phase built this DAG. You asked for <b>' + H.esc(req.join(', ')) + '</b>' + (Object.keys(ex).length ? ' and excluded <b>' + H.esc(Object.keys(ex).join(', ')) + '</b>' : '') + '. Gradle runs dependencies before the task, each task at most once.', parts: [graph(null)] });
        function visit(n) {
          if (ex[n] || st[n]) return;
          st[n] = 1;
          frames.push({ narr: 'Visit <b>' + n + '</b>: first make sure its dependencies (' + ((g[n] || []).join(', ') || 'none') + ') have run.', parts: [graph(n)] });
          (g[n] || []).forEach(visit);
          done.push(n);
          frames.push({ narr: '<b>' + n + '</b> executes (#' + done.length + '). ' + (n === 'test' ? 'Test results are cached too: unchanged code + unchanged tests → UP-TO-DATE next time.' : 'If its inputs had not changed it would be UP-TO-DATE and skipped.'), parts: [graph(null)] });
        }
        req.forEach(visit);
        frames.push({ narr: 'Execution order: ' + done.join(' → ') + '. Anything grey was not needed.', parts: [graph(null), { type: 'array', label: 'order', values: done, hl: {} }] });
        return frames;
      }
    },
    examples: [
      { title: 'api vs implementation: the recompile ripple', html: `<p>${C('core')} uses Guava internally (${C('implementation')}). ${C('web')} depends on ${C('core')}. Upgrading Guava recompiles ${C('core')} but <b>not</b> ${C('web')}, because Guava is not on web's compile classpath. With ${C('api')} it would be, and every consumer would recompile — and could start calling Guava directly, making the dependency impossible to remove later.</p>` },
      { title: 'Declaring inputs/outputs for a custom task', html: `<p>A custom task without declared inputs/outputs can never be UP-TO-DATE or cached. Annotate them (or use ${C('inputs.file')} / ${C('outputs.dir')}).</p>`, code: kts(`abstract class GenerateVersion : DefaultTask() {
    @get:Input abstract val version: Property<String>
    @get:OutputFile abstract val out: RegularFileProperty
    @TaskAction fun run() { out.get().asFile.writeText("VERSION=" + version.get()) }
}
tasks.register<GenerateVersion>("generateVersion") {
    version = project.version.toString()
    out = layout.buildDirectory.file("version.properties")
}`, 'Cacheable custom task') },
      { title: 'Reactor order with -am / -amd', html: `<p>Modules: ${C('core')}, ${C('payments → core')}, ${C('web → payments')}, ${C('admin → core')}. ${C('mvn -pl payments -am')} builds ${H.c('g', 'core, payments')}. ${C('mvn -pl payments -amd')} builds ${H.c('g', 'payments, web')}. ${C('mvn -pl core -amd')} builds all four modules: ${H.c('g', 'core, payments, web, admin')} (in a valid order).</p>` },
      { title: 'The wrapper is part of the repository', html: `<p>Commit ${C('gradlew')}, ${C('gradlew.bat')} and ${C('gradle/wrapper/gradle-wrapper.properties')} (and the wrapper jar). CI and every developer then run exactly the Gradle version in ${C('distributionUrl')}; add ${C('distributionSha256Sum')} so a tampered download fails. Maven has the same idea with ${C('mvnw')}.</p>` }
    ],
    deepDive: `<p><b>Task avoidance:</b> use ${C('tasks.register')} (lazy) instead of ${C('tasks.create')} (eager), and ${C('Provider')}/${C('Property')} values instead of reading values at configuration time; otherwise every build configures hundreds of tasks it will never run. The configuration cache enforces this discipline.</p>
<p><b>Ordering without dependency:</b> ${C('mustRunAfter')} / ${C('shouldRunAfter')} order two tasks <i>if both</i> are in the graph without forcing either to run; ${C('finalizedBy')} runs a cleanup task even after failure (stop a server after integration tests).</p>
<p><b>Why builds are slow, in order of usual impact:</b> (1) tests (parallelise with ${C('maxParallelForks')} / Surefire ${C('forkCount')}, but watch shared state); (2) no build cache on CI; (3) expensive configuration; (4) too many ${C('api')} dependencies causing recompile ripples; (5) annotation processors that are not incremental. Build Scans / Develocity show where the time goes.</p>
<p><b>Monorepo scale:</b> Maven ${C('-T 1C')} parallel reactor and Gradle ${C('--parallel')} build independent modules at once; very large repos move to Bazel or Pants for remote execution, but the DAG + content-hash ideas are the same.</p>
<p><b>Java toolchains:</b> ${C('java.toolchain')} (Gradle) and ${C('maven-toolchains-plugin')} compile with a fixed JDK independent of whatever JDK runs the build tool, and ${C('--release 21')} prevents accidental use of newer APIs.</p>`,
    aiEra: `<p><b>What AI changes:</b> models write Gradle scripts in a mix of Groovy and Kotlin DSL and of old (${C('compile')}, ${C('testCompile')} — removed in Gradle 7) and new configurations. Ask for "Kotlin DSL, Gradle 8, java-library, version catalog" explicitly and run ${C('./gradlew help --warning-mode all')} to surface deprecations. AI is very good at reading a Build Scan or ${C('--profile')} report and pointing to the slowest tasks — use it as a build-performance analyst, but verify that a "fix" keeps inputs and outputs declared, or you trade speed for wrong cached results.</p>`,
    problems: [{
      title: 'Task Execution Order with dependsOn and -x',
      level: 'Medium', tags: ['Gradle', 'DAG', 'DFS', 'topological sort'], companies: ['Google', 'Gradle', 'LinkedIn'],
      statement: `<p>Each entry of ${C('deps')} is ${C('"task:dep1,dep2"')} (a task with no dependencies may be written ${C('"task:"')} or not listed at all). ${C('requested')} lists tasks in command-line order; an entry ${C('"!name"')} means ${C('-x name')}: that task is excluded and is never visited.</p>
<p>Write ${C('String[] taskOrder(String[] deps, String[] requested)')}. Visit requested tasks in order with a depth-first search: before running a task, visit its dependencies in the listed order; every task runs once. Return the run order, or ${C('["CYCLE"]')} if a cycle is reached.</p>`,
      constraints: `≤ 10<sup>3</sup> tasks; task names contain no ${C(':')}, ${C(',')} or ${C('!')}.`,
      example: `<p>Java plugin graph, ${C('["build", "!test"]')} → ${H.c('g', '[compileJava, processResources, classes, jar, assemble, check, build]')}. ${C('check')} still runs, but its only dependency ${C('test')} is excluded, so ${C('testClasses')} is never needed either.</p>`,
      brute: { why: `<p>Repeat "find any task whose dependencies have all run" by scanning the whole list each round. That is O(V²) and it cannot tell <i>which</i> tasks are needed — it runs the whole graph, not just the part reachable from the request.</p>`, code: `
class Brute {
    String[] taskOrder(String[] deps, String[] requested) {
        Map<String, List<String>> g = new LinkedHashMap<>();
        for (String d : deps) {
            int c = d.indexOf(':');
            String rest = d.substring(c + 1);
            g.put(d.substring(0, c), rest.isEmpty() ? List.of() : List.of(rest.split(",")));
        }
        List<String> done = new ArrayList<>();
        boolean progress = true;
        while (progress) {                                   // O(V) rounds of O(V) scans
            progress = false;
            for (var e : g.entrySet())
                if (!done.contains(e.getKey()) && done.containsAll(e.getValue())) { done.add(e.getKey()); progress = true; }
        }
        return done.toArray(new String[0]);                   // runs everything, ignores the request
    }
}` },
      mcq: { q: 'Why does Gradle need the graph to be acyclic?', options: ['To save memory', 'With a cycle there is no order in which every task runs after its dependencies', 'Because Kotlin forbids cycles', 'It does not; cycles are allowed'], answer: 1, explain: 'A topological order exists only for a DAG. Gradle reports "Circular dependency between the following tasks" at graph-building time.' },
      hints: [`<p>Hint 1: this is a DFS post-order: a task is appended after all of its dependencies.</p>`, `<p>Hint 2: use three states per task — unvisited, visiting (on the current path), done. Meeting a "visiting" task means a cycle.</p>`, `<p>Hint 3: parse with ${C('indexOf(\':\')')} so ${C('"w:"')} gives an empty list; collect ${C('!name')} into an excluded set first; skip excluded and done tasks at the top of the DFS.</p>`],
      tests: { sig: 'string[] string[] -> string[]', fn: 'taskOrder', cases: [
        [[GRADLE_G, ['build']], ['compileJava', 'processResources', 'classes', 'jar', 'assemble', 'testClasses', 'test', 'check', 'build']],
        [[GRADLE_G, ['jar']], ['compileJava', 'processResources', 'classes', 'jar']],
        [[GRADLE_G, ['build', '!test']], ['compileJava', 'processResources', 'classes', 'jar', 'assemble', 'check', 'build']],
        [[GRADLE_G, ['test', 'jar']], ['compileJava', 'processResources', 'classes', 'testClasses', 'test', 'jar']],
        [[['a:b', 'b:a'], ['a']], ['CYCLE']],
        [[[], ['hello']], ['hello']],
        [[['a:a'], ['a']], ['CYCLE']],
        [[GRADLE_G, ['clean', 'build']], ['clean', 'compileJava', 'processResources', 'classes', 'jar', 'assemble', 'testClasses', 'test', 'check', 'build']],
        [[['x:y', 'y:z', 'z:x', 'w:'], ['w']], ['w']]
      ] },
      solution: {
        approach: `<p>Build an adjacency map, then DFS from each requested task. Post-order (append after the children) gives a valid execution order; a "visiting" mark detects cycles; excluded tasks are treated as already handled.</p>`,
        code: `
class Solution {
    private Map<String, List<String>> graph;
    private Map<String, Integer> state;          // 1 = visiting, 2 = done
    private Set<String> excluded;
    private List<String> order;
    private boolean cycle;

    String[] taskOrder(String[] deps, String[] requested) {
        graph = new HashMap<>();
        for (String d : deps) {
            int c = d.indexOf(':');
            String rest = d.substring(c + 1);
            graph.put(d.substring(0, c), rest.isEmpty() ? List.of() : Arrays.asList(rest.split(",")));
        }
        excluded = new HashSet<>();
        for (String r : requested) if (r.startsWith("!")) excluded.add(r.substring(1));
        state = new HashMap<>();
        order = new ArrayList<>();
        cycle = false;
        for (String r : requested) if (!r.startsWith("!")) visit(r);
        return cycle ? new String[]{"CYCLE"} : order.toArray(new String[0]);
    }

    private void visit(String task) {
        if (cycle || excluded.contains(task)) return;
        Integer s = state.get(task);
        if (s != null) { if (s == 1) cycle = true; return; }   // back edge = cycle
        state.put(task, 1);
        for (String dep : graph.getOrDefault(task, List.of())) visit(dep);
        state.put(task, 2);
        order.add(task);                                          // after all dependencies
    }
}`,
        dry: { head: ['call', 'state change', 'order so far'], rows: [
          ['visit(build)', 'build = visiting', '[]'],
          ['visit(assemble) → jar → classes', 'all visiting', '[]'],
          ['compileJava, processResources', 'done', '[compileJava, processResources]'],
          ['back in classes, jar, assemble', 'done', '[…, classes, jar, assemble]'],
          ['visit(check) → test is excluded', 'check done', '[…, assemble, check]'],
          ['back in build', 'done', '[…, check, build]']
        ] },
        complexity: `<p>O(V + E) — each task and edge is processed once. O(V) for the maps and the recursion stack.</p>`,
        followUps: ['Return the cycle path instead of just "CYCLE"', 'How would mustRunAfter change the algorithm?', 'Which tasks could run in parallel?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 4 — JUnit 5: architecture, lifecycle, nested tests
     ====================================================================== */
  var LIFE_CODE = [
    'class CartTest {',
    '  @BeforeAll static void startDb() { }',
    '  CartTest() { }                  // constructor',
    '  @BeforeEach void freshCart() { }',
    '  @Test void addsItem() { }',
    '  @Test @Disabled void slowOne() { }',
    '  @Test void removesItem() { }',
    '  @AfterEach void clear() { }',
    '  @AfterAll static void stopDb() { }',
    '}'].join('\n');
  topics.push({
    title: 'JUnit 5 (Jupiter): Architecture, Test Lifecycle, Nested Tests & Assertions',
    analogy: `<p>A test class is like a <b>cooking class</b> with many students. Before the class starts, the teacher turns on the ovens <b>once</b> (${C('@BeforeAll')}). Each student gets a <b>fresh, clean workstation</b> (a new test instance) and sets out ingredients (${C('@BeforeEach')}), cooks one dish (${C('@Test')}), then washes up (${C('@AfterEach')}). At the end the teacher turns the ovens off once (${C('@AfterAll')}). Because every student starts from a clean station, one student's burnt pan cannot ruin the next student's dish — that is <b>test isolation</b>.</p>`,
    explain: `<p><b>Plain idea:</b> a unit test is a small method that sets up a situation, calls your code, and checks the result. JUnit finds these methods, runs them in a controlled lifecycle and reports pass/fail. Most tests follow <b>Arrange → Act → Assert</b> (also called Given-When-Then).</p>
<h4>1. JUnit 5 = three parts</h4>
${H.table(['Part', 'Role'], [
  ['<b>JUnit Platform</b>', 'launches test engines; used by IDEs, Maven Surefire, Gradle'],
  ['<b>JUnit Jupiter</b>', 'the new programming model: ' + C('org.junit.jupiter.api.*') + ' annotations, assertions, extensions'],
  ['<b>JUnit Vintage</b>', 'an engine that runs old JUnit 3/4 tests on the Platform during migration']
])}
<h4>2. Lifecycle annotations</h4>
${H.table(['Annotation', 'Runs', 'Notes'], [
  [C('@BeforeAll'), 'once, before all tests', 'must be ' + C('static') + ' unless PER_CLASS'],
  [C('@BeforeEach'), 'before every test', 'fresh fixtures'],
  [C('@Test'), 'the test itself', 'no ' + C('public') + ' needed in JUnit 5'],
  [C('@AfterEach'), 'after every test, even if it failed', 'clean up'],
  [C('@AfterAll'), 'once, at the end', C('static') + ' unless PER_CLASS']
])}
<p><b>Default: a new instance of the test class per test method</b> (${C('Lifecycle.PER_METHOD')}). Fields are therefore reset for every test. ${C('@TestInstance(Lifecycle.PER_CLASS)')} shares one instance (allows non-static ${C('@BeforeAll')}, but state can leak between tests).</p>
<h4>3. Organising tests</h4>
<ul><li>${C('@DisplayName("refund fails when order is shipped")')} — readable names in reports.</li>
<li>${C('@Nested')} — a non-static inner class groups tests for one situation ("when cart is empty"); the outer ${C('@BeforeEach')} runs before the inner one.</li>
<li>${C('@Tag("slow")')} + build-tool filters; ${C('@Disabled("JIRA-123")')} with a reason; ${C('@Timeout(2)')}; ${C('@RepeatedTest(5)')}.</li>
<li>Test order is deterministic but intentionally not obvious; never rely on it (${C('@TestMethodOrder')} exists for rare cases).</li></ul>
<h4>4. Core assertions</h4>
${H.table(['Assertion', 'Use'], [
  [C('assertEquals(expected, actual)'), 'expected first! (AssertJ avoids this trap)'],
  [C('assertTrue / assertFalse / assertNull'), 'simple conditions'],
  [C('assertThrows(X.class, () -> ...)'), 'returns the exception so you can check its message'],
  [C('assertAll(() -> ..., () -> ...)'), 'runs every check and reports <b>all</b> failures together'],
  [C('assertTimeout(ofMillis(100), () -> ...)'), 'fails if the code is too slow'],
  [C('assumeTrue(cond)'), 'skips (aborts) the test instead of failing — e.g. only on Linux']
])}
<h4>5. JUnit 4 → 5 cheat sheet</h4>
${H.table(['JUnit 4', 'JUnit 5'], [
  [C('@Before / @After'), C('@BeforeEach / @AfterEach')],
  [C('@BeforeClass / @AfterClass'), C('@BeforeAll / @AfterAll')],
  [C('@Ignore'), C('@Disabled')],
  [C('@Test(expected = X.class)'), C('assertThrows(X.class, ...)')],
  [C('@RunWith') + ', ' + C('@Rule'), C('@ExtendWith') + ' (one extension model)'],
  [C('@Category'), C('@Tag')]
])}`,
    clues: ['"tests pass alone but fail together" → shared static state / PER_CLASS leaking state / order dependence', '"why must @BeforeAll be static?" → no instance exists yet in PER_METHOD', '"check several fields and see every failure" → assertAll / AssertJ SoftAssertions', '"verify an exception and its message" → assertThrows returns the exception', '"run only on CI Linux agents" → assumptions, @EnabledOnOs, @EnabledIfEnvironmentVariable', '"migrating from JUnit 4" → Vintage engine + @ExtendWith replaces @RunWith/@Rule'],
    code: [lib(`import org.junit.jupiter.api.*;
import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Shopping cart")
class CartTest {
    private Cart cart;                       // new CartTest instance per test → never shared

    @BeforeEach
    void setUp() { cart = new Cart(); }      // Arrange: a fresh cart for every test

    @Test
    @DisplayName("total of two items")
    void totalsItems() {
        cart.add("pen", 2, 150);             // Act
        cart.add("book", 1, 1200);
        assertEquals(1500, cart.totalCents()); // Assert (expected first)
    }

    @Test
    void rejectsNegativeQuantity() {
        var ex = assertThrows(IllegalArgumentException.class, () -> cart.add("pen", -1, 150));
        assertEquals("quantity must be > 0", ex.getMessage());
    }

    @Nested
    @DisplayName("when a discount code is applied")
    class WithDiscount {
        @BeforeEach
        void applyCode() { cart.add("book", 1, 1000); cart.apply("SAVE10"); } // runs after the outer setUp

        @Test
        void reducesTotal() {
            assertAll(
                () -> assertEquals(900, cart.totalCents()),
                () -> assertTrue(cart.hasDiscount()),
                () -> assertEquals("SAVE10", cart.discountCode()));
        }
    }
}`, 'JUnit 5 test class (needs junit-jupiter on the test classpath)'), {
      title: 'The same ideas in plain Java: a tiny test runner', code: `
public class MiniRunner {
    interface Check { void run() throws Exception; }

    static int passed = 0, failed = 0;

    static void test(String name, Runnable beforeEach, Check body) {
        beforeEach.run();                                  // fresh fixture per test
        try {
            body.run();
            passed++;
            System.out.println("PASS " + name);
        } catch (AssertionError | Exception e) {
            failed++;
            System.out.println("FAIL " + name + ": " + e.getMessage());
        }
    }

    static void assertEquals(Object expected, Object actual) {
        if (!Objects.equals(expected, actual))
            throw new AssertionError("expected <" + expected + "> but was <" + actual + ">");
    }

    static List<Integer> list;

    public static void main(String[] args) {
        Runnable fresh = () -> list = new ArrayList<>();
        test("add one", fresh, () -> { list.add(5); assertEquals(1, list.size()); });
        test("starts empty", fresh, () -> assertEquals(0, list.size()));   // passes: fixture was reset
        test("wrong on purpose", fresh, () -> assertEquals(2, list.size()));
        System.out.println(passed + " passed, " + failed + " failed");
    }
}` }],
    codeTitle: ['JUnit 5', 'Plain-Java mini runner'],
    viz: {
      title: 'JUnit lifecycle: who runs when?',
      input: 'PER_METHOD',
      inputLabel: 'PER_METHOD or PER_CLASS',
      gen: function (input) {
        var mode = String(input || '').trim().toUpperCase();
        if (mode !== 'PER_METHOD' && mode !== 'PER_CLASS') throw new Error('Type PER_METHOD or PER_CLASS');
        var ev = [], frames = [], inst = 0;
        function f(line, e, narr) { if (e) ev.push(e); var hl = {}; hl[line] = e && e.indexOf('SKIP') === 0 ? 'bad' : 'cur'; frames.push({ narr: narr, parts: [{ type: 'code', label: 'CartTest', lang: 'java', code: LIFE_CODE, hl: hl }, { type: 'stack', label: 'events so far (newest on top)', items: ev.slice() }, { type: 'vars', label: 'state', vals: { mode: mode, instancesCreated: inst } }] }); }
        if (mode === 'PER_CLASS') { inst++; f(3, 'new CartTest #1', 'PER_CLASS: JUnit creates <b>one</b> instance up front and reuses it for every test.'); }
        f(2, 'beforeAll', '@BeforeAll runs once.' + (mode === 'PER_METHOD' ? ' No instance exists yet, which is why it must be <b>static</b>.' : ' With PER_CLASS it may be an instance method.'));
        [['addsItem', 5], ['slowOne', 6], ['removesItem', 7]].forEach(function (t) {
          if (t[0] === 'slowOne') { f(t[1], 'SKIP slowOne', '@Disabled test: JUnit reports it as skipped. No instance, no @BeforeEach, no @AfterEach.'); return; }
          if (mode === 'PER_METHOD') { inst++; f(3, 'new CartTest #' + inst, 'PER_METHOD (default): a <b>brand-new instance</b> for ' + t[0] + ', so fields from the previous test are gone.'); }
          f(4, 'beforeEach', '@BeforeEach prepares fresh fixtures for ' + t[0] + '.');
          f(t[1], t[0], 'The test body runs: Arrange, Act, Assert.');
          f(8, 'afterEach', '@AfterEach runs even if the test failed — perfect for cleanup.');
        });
        f(9, 'afterAll', '@AfterAll runs once at the end. Instances created: <b>' + inst + '</b>' + (mode === 'PER_CLASS' ? ' — state in fields is shared between tests, so be careful.' : ' — one per executed test.'));
        return frames;
      }
    },
    examples: [
      { title: 'Why the test passed alone but failed in the suite', html: `<p>${C('static List<String> seen = new ArrayList<>()')} in a test class is shared by every test instance. Test A adds an item, test B asserts the list is empty: B passes alone, fails after A. Fix: make it an instance field initialised in ${C('@BeforeEach')}. Same trap with singletons, static caches, system properties, the default ${C('Locale')} and ${C('TimeZone')}.</p>` },
      { title: 'assertThrows returns the exception', html: `<p>Check the type <i>and</i> the message, and keep the lambda tiny so the exception cannot come from the setup code by accident.</p>`, code: `
class Wallet {
    private long cents;
    void withdraw(long amount) {
        if (amount > cents) throw new IllegalStateException("insufficient funds: " + cents);
        cents -= amount;
    }
}
class WalletCheck {
    static String check() {
        Wallet w = new Wallet();
        try {
            w.withdraw(500);                         // what assertThrows does for you
            return "no exception";
        } catch (IllegalStateException e) {
            return e.getMessage();                   // "insufficient funds: 0"
        }
    }
}` },
      { title: 'Assumptions skip, assertions fail', html: `<p>${C('assumeTrue(System.getenv("CI") != null)')} at the top of a test makes it <b>aborted / skipped</b> on laptops, not red. Use it for environment preconditions, never to hide a real failure. Declarative versions: ${C('@EnabledOnOs(LINUX)')}, ${C('@EnabledIfEnvironmentVariable(named = "CI", matches = "true")')}, ${C('@EnabledForJreRange(min = JRE.JAVA_21)')}.</p>` },
      { title: 'Extensions replace runners and rules', html: `<p>JUnit 4 allowed only one ${C('@RunWith')}, so Spring and Mockito runners could not be combined. JUnit 5 lets you stack ${C('@ExtendWith(MockitoExtension.class)')} with ${C('@ExtendWith(SpringExtension.class)')}. Extensions hook into lifecycle callbacks, parameter resolution (${C('@TempDir Path dir')}, ${C('TestInfo')}) and exception handling.</p>` }
    ],
    deepDive: `<p><b>What makes a good unit test (F.I.R.S.T.):</b> Fast (milliseconds), Independent (any order, any subset), Repeatable (no real clock, network, randomness without a seed), Self-validating (pass/fail, no reading logs), Timely (written with the code). Inject a ${C('java.time.Clock')} instead of calling ${C('LocalDate.now()')}, and a ${C('Random')} with a seed.</p>
<p><b>Parallel execution:</b> ${C('junit.jupiter.execution.parallel.enabled=true')} in ${C('junit-platform.properties')}; then shared static state becomes a race, and ${C('@ResourceLock')} / ${C('@Isolated')} protect tests that touch a shared resource.</p>
<p><b>What to test:</b> behaviour through the public API, not private methods. If a private method seems to need its own tests, it probably wants to be its own class. One logical concept per test; the test name states the scenario and expectation (${C('refund_whenOrderShipped_throws')}).</p>
<p><b>Discovery and engines:</b> the Platform's ${C('Launcher')} discovers tests via engines (Jupiter, Vintage, also Cucumber, Spock, jqwik). Surefire 2.22+ and Gradle's ${C('useJUnitPlatform()')} talk to the Platform; forgetting ${C('useJUnitPlatform()')} in Gradle is the classic "0 tests ran, build green" bug.</p>
<p><b>Test smells:</b> logic (loops, ifs) inside tests, sleeping to wait for async work (use Awaitility), assertions in ${C('@AfterEach')}, giant shared fixtures, and tests that assert on log output instead of behaviour.</p>`,
    aiEra: `<p><b>What AI changes:</b> generating tests is one of the most popular AI uses, and the trap is <b>tests that mirror the implementation</b>: the model reads your code and asserts whatever it currently does, bugs included. Write (or at least name) the cases yourself from the <i>requirements</i> — happy path, boundaries, invalid input, failure of each dependency — then let AI fill in the boilerplate. Check generated tests by breaking the code on purpose: a test that still passes is useless. Mutation testing (PIT) automates exactly that check.</p>`,
    problems: [{
      title: 'Simulate the JUnit 5 Lifecycle',
      level: 'Easy', tags: ['JUnit 5', 'lifecycle', 'simulation'], companies: ['Infosys', 'Wipro', 'Accenture', 'Amazon'],
      statement: `<p>A test class has the lifecycle methods ${C('@BeforeAll')}, ${C('@BeforeEach')}, ${C('@AfterEach')} and ${C('@AfterAll')} and the given test methods in execution order. A name starting with ${C('-')} is ${C('@Disabled')}. Write ${C('String[] lifecycle(String[] tests, boolean perClass)')} returning the events JUnit performs:</p>
<ul><li>${C('"new"')} — a test instance is created: once before ${C('beforeAll')} when ${C('perClass')} is true; otherwise once before each <b>enabled</b> test (after ${C('beforeAll')}).</li>
<li>${C('"beforeAll"')}, then for each enabled test ${C('"beforeEach"')}, the test name, ${C('"afterEach"')}; for a disabled test only ${C('"skip:<name>"')} (name without the dash); finally ${C('"afterAll"')}.</li></ul>`,
      constraints: `1 ≤ tests ≤ 100; at least one test is enabled.`,
      example: `<p>${C('["a", "-b"], false')} → ${H.c('g', '[beforeAll, new, beforeEach, a, afterEach, skip:b, afterAll]')}. With ${C('true')}: ${H.c('g', '[new, beforeAll, beforeEach, a, afterEach, skip:b, afterAll]')}.</p>`,
      brute: { why: `<p>Writing the expected event list by hand for every class size is not a solution; and the common wrong model — "one instance for the whole class" — gives the PER_CLASS answer for the default mode, which is exactly the misunderstanding interviewers probe.</p>`, code: `
class Brute {
    String[] lifecycle(String[] tests, boolean perClass) {
        List<String> ev = new ArrayList<>(List.of("new", "beforeAll"));   // wrong for the default mode
        for (String t : tests) { ev.add("beforeEach"); ev.add(t); ev.add("afterEach"); } // ignores @Disabled
        ev.add("afterAll");
        return ev.toArray(new String[0]);
    }
}` },
      mcq: { q: 'In the default lifecycle, a test class has 4 enabled @Test methods. How many instances are created?', options: ['1', '4', '5', '0 — tests are static'], answer: 1, explain: 'Lifecycle.PER_METHOD creates a new instance per test method, so 4. This is what keeps tests isolated from each other\'s field values.' },
      hints: [`<p>Hint 1: the only difference between the modes is <b>where</b> ${C('"new"')} appears.</p>`, `<p>Hint 2: loop over the tests; a leading ${C('-')} means "skipped": emit only ${C('skip:name')}, and do not create an instance for it.</p>`, `<p>Hint 3: recipe — if perClass add "new"; add "beforeAll"; for each test: disabled → skip, else (perMethod → "new") + beforeEach + name + afterEach; add "afterAll".</p>`],
      tests: { sig: 'string[] bool -> string[]', fn: 'lifecycle', cases: [
        [[['a', '-b'], false], ['beforeAll', 'new', 'beforeEach', 'a', 'afterEach', 'skip:b', 'afterAll']],
        [[['a', '-b'], true], ['new', 'beforeAll', 'beforeEach', 'a', 'afterEach', 'skip:b', 'afterAll']],
        [[['only'], false], ['beforeAll', 'new', 'beforeEach', 'only', 'afterEach', 'afterAll']],
        [[['t1', 't2', 't3'], false], ['beforeAll', 'new', 'beforeEach', 't1', 'afterEach', 'new', 'beforeEach', 't2', 'afterEach', 'new', 'beforeEach', 't3', 'afterEach', 'afterAll']],
        [[['t1', 't2', 't3'], true], ['new', 'beforeAll', 'beforeEach', 't1', 'afterEach', 'beforeEach', 't2', 'afterEach', 'beforeEach', 't3', 'afterEach', 'afterAll']],
        [[['-x', '-y', 'z'], false], ['beforeAll', 'skip:x', 'skip:y', 'new', 'beforeEach', 'z', 'afterEach', 'afterAll']],
        [[['-x', 'z', '-y'], true], ['new', 'beforeAll', 'skip:x', 'beforeEach', 'z', 'afterEach', 'skip:y', 'afterAll']]
      ] },
      solution: {
        approach: `<p>Emit events in JUnit's order. PER_CLASS creates the single instance before ${C('@BeforeAll')}; PER_METHOD creates one per enabled test. Disabled tests never reach the instance or the per-test callbacks.</p>`,
        code: `
class Solution {
    String[] lifecycle(String[] tests, boolean perClass) {
        List<String> ev = new ArrayList<>();
        if (perClass) ev.add("new");                  // one shared instance
        ev.add("beforeAll");
        for (String t : tests) {
            if (t.startsWith("-")) {                  // @Disabled: reported as skipped, nothing runs
                ev.add("skip:" + t.substring(1));
                continue;
            }
            if (!perClass) ev.add("new");             // default: fresh instance per test
            ev.add("beforeEach");
            ev.add(t);
            ev.add("afterEach");
        }
        ev.add("afterAll");
        return ev.toArray(new String[0]);
    }
}`,
        dry: { head: ['step', 'test', 'perClass = false emits'], rows: [
          ['start', '—', 'beforeAll'],
          ['1', 'a', 'new, beforeEach, a, afterEach'],
          ['2', '-b', 'skip:b'],
          ['end', '—', 'afterAll']
        ] },
        complexity: `<p>O(n) time and output size for n tests.</p>`,
        followUps: ['Where do the events of a @Nested class go?', 'What happens to afterEach when the test throws?', 'Why can PER_CLASS make tests order-dependent?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 5 — Parameterized tests and AssertJ
     ====================================================================== */
  topics.push({
    title: 'Parameterized Tests & Fluent Assertions with AssertJ',
    analogy: `<p>A parameterized test is a <b>vending-machine inspector</b> with a clipboard of rows: "insert 1 coin → nothing", "insert 2 coins → soda", "insert 5 coins → soda + 3 coins change". The <b>procedure</b> is written once; the clipboard supplies the <b>rows</b>. Each row gets its own tick or cross, so you see exactly which case broke. AssertJ is the inspector's <b>detailed report form</b>: instead of "wrong", it says "expected [soda, coin, coin, coin] but was [soda, coin]: missing [coin]".</p>`,
    explain: `<p><b>Plain idea:</b> when five tests differ only in input and expected output, write <b>one</b> test method and feed it a table of cases. Each row runs as a separate test invocation in the report.</p>
<h4>1. Argument sources (junit-jupiter-params)</h4>
${H.table(['Source', 'Example', 'Good for'], [
  [C('@ValueSource'), C('@ValueSource(ints = {1, 3, 5})'), 'one argument'],
  [C('@CsvSource'), C('@CsvSource({"2024, true", "1900, false"})'), 'small tables inline'],
  [C('@CsvFileSource'), C('@CsvFileSource(resources = "/rates.csv", numLinesToSkip = 1)'), 'big tables in a file'],
  [C('@MethodSource'), C('@MethodSource("orders")') + ' → ' + C('static Stream<Arguments> orders()'), 'objects, complex setup'],
  [C('@EnumSource'), C('@EnumSource(value = Status.class, names = {"PAID", "SHIPPED"})'), 'every enum constant'],
  [C('@NullAndEmptySource'), 'with ' + C('@ValueSource(strings = {" ", "\\t"})'), 'blank-input edge cases'],
  [C('@ArgumentsSource'), 'a custom ' + C('ArgumentsProvider'), 'reusable generators']
])}
<p>Name each invocation with ${C('@ParameterizedTest(name = "{0} is leap: {1}")')}. ${C('@CsvSource')} details: values are trimmed, ${C("''")} is an empty string, an empty unquoted value is ${C('null')}, single quotes protect commas. Implicit conversion turns ${C('"2024-02-29"')} into a ${C('LocalDate')} parameter.</p>
<h4>2. AssertJ: fluent, discoverable, great messages</h4>
${H.table(['Goal', 'AssertJ'], [
  ['equality', C('assertThat(total).isEqualTo(1500)')],
  ['strings', C('assertThat(name).startsWith("Ada").contains("Love").hasSize(12)')],
  ['ordered list', C('assertThat(ids).containsExactly(3, 1, 2)')],
  ['any order', C('assertThat(ids).containsExactlyInAnyOrder(1, 2, 3)')],
  ['field of each element', C('assertThat(users).extracting(User::name).contains("ann", "bob")')],
  ['exceptions', C('assertThatThrownBy(() -> pay(-1)).isInstanceOf(IllegalArgumentException.class).hasMessageContaining("negative")')],
  ['whole object graph', C('assertThat(actual).usingRecursiveComparison().ignoringFields("id").isEqualTo(expected)')],
  ['all failures at once', C('SoftAssertions.assertSoftly(s -> { s.assertThat(a).isEqualTo(1); s.assertThat(b).isTrue(); })')],
  ['describe the check', C('assertThat(balance).as("balance after refund").isEqualTo(0)')]
])}
<p>Why teams prefer it over plain ${C('assertEquals')}: the <b>actual value comes first</b> (no swapped expected/actual), your IDE autocompletes only the assertions valid for that type, and failure messages show the difference.</p>`,
    clues: ['"the same test copy-pasted with different numbers" → @ParameterizedTest', '"test every enum value / every boundary" → @EnumSource / @CsvSource rows at boundaries', '"cases need objects, not strings" → @MethodSource returning Stream&lt;Arguments&gt;', '"which element of the list was wrong?" → AssertJ collection assertions', '"compare two DTOs except the generated id" → usingRecursiveComparison().ignoringFields', '"see all failing fields in one run" → SoftAssertions / assertAll'],
    code: [lib(`import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;
import static org.assertj.core.api.Assertions.*;

class LeapYearTest {
    @ParameterizedTest(name = "{0} → leap = {1}")
    @CsvSource({
        "2024, true",     // divisible by 4
        "2023, false",
        "1900, false",    // divisible by 100 but not 400
        "2000, true",     // divisible by 400
    })
    void leapYears(int year, boolean expected) {
        assertThat(Years.isLeap(year)).isEqualTo(expected);
    }

    static Stream<Arguments> orders() {          // objects that CSV cannot express
        return Stream.of(
            Arguments.of(new Order(List.of(100, 250)), 350),
            Arguments.of(new Order(List.of()), 0));
    }

    @ParameterizedTest
    @MethodSource("orders")
    void totals(Order order, int expected) {
        assertThat(order.total()).as("total of %s", order).isEqualTo(expected);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" ", "\\t"})
    void blankNamesRejected(String name) {
        assertThatThrownBy(() -> new Customer(name))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("name");
    }
}`, 'JUnit 5 params + AssertJ (needs junit-jupiter-params and assertj-core)'), {
      title: 'Table-driven testing in plain Java', code: `
public class TableDriven {
    static boolean isLeap(int y) { return (y % 4 == 0 && y % 100 != 0) || y % 400 == 0; }

    record Case(int year, boolean expected) { }

    public static void main(String[] args) {
        List<Case> cases = List.of(new Case(2024, true), new Case(2023, false),
                                   new Case(1900, false), new Case(2000, true));
        int failures = 0;
        for (Case c : cases) {                               // one "invocation" per row
            boolean actual = isLeap(c.year());
            String status = actual == c.expected() ? "PASS" : "FAIL";
            if (actual != c.expected()) failures++;
            System.out.println(status + " [" + c.year() + " -> " + c.expected() + "] actual=" + actual);
        }
        System.out.println(failures == 0 ? "all rows passed" : failures + " row(s) failed");
    }
}` }],
    codeTitle: ['JUnit + AssertJ', 'Plain Java'],
    viz: {
      title: 'One test method, many rows: watch each invocation',
      input: '2024:true, 2023:false, 1900:true, 2000:true, 2100:false',
      inputLabel: 'year:expectedLeap rows (one is deliberately wrong: 1900 is not leap)',
      gen: function (input) {
        var rows = tokens(input, /\s*,\s*/, 'Example: 2024:true, 1900:false');
        if (rows.length > 12) throw new Error('Use at most 12 rows');
        var data = rows.map(function (r) {
          var m = r.match(/^(-?\d+)\s*:\s*(true|false)$/i);
          if (!m) throw new Error('Each row looks like 2024:true');
          return { y: +m[1], e: m[2].toLowerCase() === 'true' };
        });
        var res = data.map(function () { return 'pending'; });
        function tbl(hl) { return { type: 'table', label: '@CsvSource rows → invocations', columns: ['#', 'year', 'expected', 'actual', 'result'], rows: data.map(function (d, i) { var a = (d.y % 4 === 0 && d.y % 100 !== 0) || d.y % 400 === 0; return [String(i + 1), String(d.y), String(d.e), res[i] === 'pending' ? '' : String(a), res[i]]; }), hl: hl }; }
        var frames = [{ narr: 'JUnit expands the single method <code>leapYears(int, boolean)</code> into <b>' + data.length + '</b> separate invocations, one per row.', parts: [tbl({})] }];
        var fails = 0;
        data.forEach(function (d, i) {
          var a = (d.y % 4 === 0 && d.y % 100 !== 0) || d.y % 400 === 0, ok = a === d.e;
          res[i] = ok ? 'PASS' : 'FAIL'; if (!ok) fails++;
          var hl = {}; hl[i] = ok ? 'ok' : 'bad';
          frames.push({ narr: 'Invocation [' + (i + 1) + '] ' + d.y + ': isLeap returns <b>' + a + '</b>, expected ' + d.e + '. ' + (ok ? 'Pass.' : 'Fail — AssertJ would say: <code>expected: ' + d.e + ' but was: ' + a + '</code>. The other rows still run.'), parts: [tbl(hl)] });
        });
        frames.push({ narr: (fails ? fails + ' row(s) failed, each reported separately with its own name — you know exactly which case is wrong (here, maybe the expectation itself).' : 'All rows passed.'), parts: [tbl({}), { type: 'vars', label: 'summary', vals: { invocations: data.length, failed: fails } }] });
        return frames;
      }
    },
    examples: [
      { title: 'Boundary rows beat random rows', html: `<p>For "free shipping from 50.00", the rows that matter are ${C('49.99 → false')}, ${C('50.00 → true')}, ${C('50.01 → true')}, plus ${C('0')} and a negative amount. Ten random amounts in the middle add nothing. Pick rows by <b>equivalence classes</b> and <b>boundaries</b>.</p>` },
      { title: 'containsExactly vs containsExactlyInAnyOrder vs contains', html: `${H.table(['Actual [1, 2, 3]', 'Result'], [[C('contains(3, 1)'), H.c('g', 'pass (subset, any order)')], [C('containsExactly(1, 2, 3)'), H.c('g', 'pass')], [C('containsExactly(3, 2, 1)'), H.c('r', 'fail (order)')], [C('containsExactlyInAnyOrder(3, 2, 1)'), H.c('g', 'pass')], [C('containsOnly(1, 2, 3, 3)'), H.c('g', 'pass (ignores duplicates)')]])}` },
      { title: 'Soft assertions in a tiny class', html: `<p>Hard assertions stop at the first failure. Soft assertions <b>collect</b> failures and throw once at the end, so you see every broken field of a response in one run.</p>`, code: `
class Soft {
    private final List<String> errors = new ArrayList<>();

    Soft check(String what, Object expected, Object actual) {
        if (!Objects.equals(expected, actual))
            errors.add(what + ": expected " + expected + " but was " + actual);
        return this;                                   // fluent
    }

    void assertAll() {
        if (!errors.isEmpty()) throw new AssertionError(String.join("\\n", errors));
    }
}` },
      { title: 'Recursive comparison for DTOs', html: `<p>${C('assertThat(saved).usingRecursiveComparison().ignoringFields("id", "createdAt").isEqualTo(expected)')} compares field by field, even nested objects, without needing ${C('equals()')} on the class. Much better than ten separate ${C('assertEquals')} lines that you forget to update when a field is added.</p>` }
    ],
    deepDive: `<p><b>Parameter resolution:</b> arguments are matched to parameters by position; extra method parameters can be resolved by extensions (${C('TestInfo')}, ${C('@TempDir')}) but must come <i>after</i> the indexed arguments. ${C('ArgumentsAccessor')} or a custom ${C('@AggregateWith')} turn a row into an object.</p>
<p><b>Property-based testing</b> is the next step: instead of hand-picked rows, a library (jqwik on the JUnit Platform) generates hundreds of random inputs from a spec ("for all lists, sort(sort(x)) == sort(x)") and <b>shrinks</b> a failure to the smallest counter-example. Great for parsers, serializers and pure functions.</p>
<p><b>Dynamic tests:</b> ${C('@TestFactory')} returns a ${C('Stream<DynamicTest>')} built at runtime, e.g. one test per JSON fixture file in a folder.</p>
<p><b>AssertJ vs Hamcrest vs Truth:</b> Hamcrest (${C('assertThat(x, is(equalTo(5)))')}) uses composable matchers and is still common with older Spring code and Mockito's ${C('argThat')}; Google Truth is similar to AssertJ. Pick one per codebase. AssertJ also has ${C('assertThat(future).succeedsWithin(...)')}, ${C('assertThat(optional).contains(...)')}, and generated custom assertions for your domain types.</p>
<p><b>Trap:</b> ${C('assertThat(x)')} with no assertion after it checks nothing — and compiles. Static analysis (Error Prone, SonarLint) flags it.</p>`,
    aiEra: `<p><b>What AI changes:</b> parameterized tables are perfect for AI help: describe the rule ("leap year", "tax brackets"), ask for <b>boundary and equivalence-class rows with a comment explaining each</b>, and review the table — reviewing 12 rows is much faster than reviewing 12 test methods. Watch for rows whose <i>expected</i> value was computed by running your code (that just freezes bugs) and for duplicated classes that add no coverage. Converting a legacy suite from JUnit 4 + Hamcrest to JUnit 5 + AssertJ is also a classic, mostly mechanical AI or OpenRewrite migration — still run the suite and compare test counts before and after.</p>`,
    problems: [{
      title: 'Soft Assertions: Report Every Mismatch',
      level: 'Easy', tags: ['assertions', 'arrays', 'testing'], companies: ['Amazon', 'Walmart', 'ThoughtWorks'],
      statement: `<p>Write ${C('String[] softCheck(int[] expected, int[] actual)')} that compares two arrays like a soft assertion and returns <b>all</b> failure messages instead of stopping at the first:</p>
<ul><li>If the lengths differ, first add ${C('"size: expected E but was A"')}.</li>
<li>Then for every index ${C('i')} present in both arrays where the values differ, add ${C('"[i] expected E but was A"')}, in index order.</li></ul>
<p>Return an empty array when everything matches.</p>`,
      constraints: `0 ≤ lengths ≤ 10<sup>5</sup>; values fit in int.`,
      example: `<p>expected ${C('[1, 2, 3]')}, actual ${C('[1, 5, 3, 4]')} → ${H.c('r', '["size: expected 3 but was 4", "[1] expected 2 but was 5"]')}. A hard assertion would have reported only the size and hidden the wrong value at index 1.</p>`,
      brute: { why: `<p>A "hard" version throws at the first difference. You fix it, rerun, hit the next one, and so on — one CI round trip per bug. It also cannot report the size difference and the value differences together.</p>`, code: `
class Brute {
    String[] softCheck(int[] expected, int[] actual) {
        if (expected.length != actual.length)
            return new String[]{"size: expected " + expected.length + " but was " + actual.length};
        for (int i = 0; i < expected.length; i++)
            if (expected[i] != actual[i]) return new String[]{"[" + i + "] expected " + expected[i] + " but was " + actual[i]};
        return new String[0];                         // stops at the first problem
    }
}` },
      mcq: { q: 'What is the main benefit of soft assertions (assertAll / SoftAssertions)?', options: ['Tests run faster', 'All failed checks are reported together instead of stopping at the first', 'Failures become warnings', 'They retry flaky checks'], answer: 1, explain: 'They still fail the test, but only after evaluating every check, so one run shows every broken field.' },
      hints: [`<p>Hint 1: collect messages in a ${C('List<String>')} and never return early.</p>`, `<p>Hint 2: compare lengths first; then loop only up to ${C('Math.min(expected.length, actual.length)')}.</p>`, `<p>Hint 3: format exactly ${C('"[" + i + "] expected " + e + " but was " + a')}; convert the list with ${C('toArray(new String[0])')}.</p>`],
      tests: { sig: 'int[] int[] -> string[]', fn: 'softCheck', cases: [
        [[[1, 2, 3], [1, 5, 3, 4]], ['size: expected 3 but was 4', '[1] expected 2 but was 5']],
        [[[1, 2, 3], [1, 2, 3]], []],
        [[[], []], []],
        [[[], [7]], ['size: expected 0 but was 1']],
        [[[4, 5], [6, 7]], ['[0] expected 4 but was 6', '[1] expected 5 but was 7']],
        [[[-1, 0, 2147483647], [-1, 0]], ['size: expected 3 but was 2']],
        [[[9], [-2147483648]], ['[0] expected 9 but was -2147483648']],
        [[{ $rep: 1, n: 100000 }, { $rep: 1, n: 100000 }], []]
      ] },
      solution: {
        approach: `<p>Check the size, then walk the common prefix and record each difference. Collecting instead of throwing is the whole idea behind ${C('assertAll')} and AssertJ ${C('SoftAssertions')}.</p>`,
        code: `
class Solution {
    String[] softCheck(int[] expected, int[] actual) {
        List<String> errors = new ArrayList<>();
        if (expected.length != actual.length)
            errors.add("size: expected " + expected.length + " but was " + actual.length);
        int n = Math.min(expected.length, actual.length);
        for (int i = 0; i < n; i++)
            if (expected[i] != actual[i])
                errors.add("[" + i + "] expected " + expected[i] + " but was " + actual[i]);
        return errors.toArray(new String[0]);           // empty = all checks passed
    }
}`,
        dry: { head: ['check', 'expected', 'actual', 'message'], rows: [
          ['size', '3', '4', H.c('r', 'size: expected 3 but was 4')],
          ['[0]', '1', '1', '—'],
          ['[1]', '2', '5', H.c('r', '[1] expected 2 but was 5')],
          ['[2]', '3', '3', '—']
        ] },
        complexity: `<p>O(min(n, m)) comparisons plus the size of the messages; O(k) extra space for k failures.</p>`,
        followUps: ['How does AssertJ show a diff for strings?', 'Turn this into a fluent Soft class with check(...).check(...).assertAll()', 'When would a hard assertion be better?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 6 — Test doubles and Mockito
     ====================================================================== */
  topics.push({
    title: 'Test Doubles & Mockito: Mocks, Stubs, Spies, Argument Captors & Verification',
    analogy: `<p>Film sets use <b>stand-ins</b>. A <b>dummy</b> is a mannequin that just fills a seat. A <b>stub</b> is an extra who says one scripted line when asked. A <b>fake</b> is a cardboard city that really works for the scene (a working in-memory database). A <b>spy</b> is the real actor wearing a hidden microphone that records everything said. A <b>mock</b> is an actor who checks the script: "the director was supposed to call me <i>twice</i> with the word <i>action</i>" — and complains if that didn't happen. You use stand-ins because the real star (a payment provider, an email server) is expensive, slow or dangerous to hire for every rehearsal.</p>`,
    explain: `<p><b>Plain idea:</b> a unit test should test <b>one unit</b>. When that unit talks to a database, an HTTP API or the clock, you replace those collaborators with <b>test doubles</b> so the test is fast, repeatable and can simulate failures ("the payment provider times out").</p>
<h4>1. The five doubles (Gerard Meszaros' names)</h4>
${H.table(['Double', 'What it does', 'Checks interactions?', 'Example'], [
  ['<b>Dummy</b>', 'passed but never used', 'no', C('null') + ' or ' + C('mock(Logger.class)') + ' to satisfy a constructor'],
  ['<b>Stub</b>', 'returns canned answers', 'no (state-based test)', C('when(repo.find(1)).thenReturn(user)')],
  ['<b>Fake</b>', 'a real, simplified implementation', 'no', 'in-memory ' + C('HashMap') + ' repository, H2'],
  ['<b>Spy</b>', 'wraps a real object, records calls', 'yes', C('spy(new ArrayList<>())')],
  ['<b>Mock</b>', 'pre-programmed with expectations, verified after', 'yes (behaviour-based)', C('verify(mailer).send(any())')]
])}
<h4>2. Mockito in five moves</h4>
<ol><li><b>Create</b>: ${C('@Mock PaymentGateway gateway;')} with ${C('@ExtendWith(MockitoExtension.class)')}, or ${C('mock(PaymentGateway.class)')}. Unstubbed methods return defaults: ${C('null')}, ${C('0')}, ${C('false')}, empty collections, ${C('Optional.empty()')}.</li>
<li><b>Inject</b>: ${C('@InjectMocks OrderService service;')} builds the class under test with the mocks (constructor injection preferred).</li>
<li><b>Stub</b>: ${C('when(gateway.charge(eq("u1"), anyLong())).thenReturn(Receipt.ok())')}; chain ${C('.thenReturn(a, b)')} for consecutive calls (the last value repeats), ${C('.thenThrow(new TimeoutException())')}, ${C('.thenAnswer(inv -> ...)')}.</li>
<li><b>Act</b>: call the real method on the class under test.</li>
<li><b>Verify</b>: ${C('verify(gateway).charge("u1", 500)')}, ${C('verify(mailer, never()).send(any())')}, ${C('verify(x, times(2))')}, ${C('atLeastOnce()')}, ${C('inOrder(a, b).verify(...)')}, ${C('verifyNoMoreInteractions(gateway)')}.</li></ol>
<h4>3. Argument captors and matchers</h4>
<p>${C('ArgumentCaptor<Email> captor = ArgumentCaptor.forClass(Email.class); verify(mailer).send(captor.capture()); assertThat(captor.getValue().to()).isEqualTo("ann@x.com");')} — capture what was passed, then assert on it. <b>Matcher rule:</b> if one argument uses a matcher (${C('any()')}, ${C('eq()')}, ${C('argThat()')}), <b>all</b> arguments must — otherwise ${C('InvalidUseOfMatchersException')}.</p>
<h4>4. Spies and the doReturn trap</h4>
<p>${C('when(spy.get(0)).thenReturn("x")')} <b>calls the real</b> ${C('get(0)')} while stubbing — on an empty list that throws ${C('IndexOutOfBoundsException')}. Use ${C('doReturn("x").when(spy).get(0)')}. The ${C('doXxx')} family is also how you stub <b>void</b> methods: ${C('doThrow(new IOException()).when(file).close()')}.</p>
<h4>5. Strictness</h4>
<p>With ${C('MockitoExtension')} the default is <b>strict stubs</b>: a stubbing that the test never uses fails with ${C('UnnecessaryStubbingException')}, and a stub called with different arguments reports a potential mismatch. This keeps tests honest and small. ${C('lenient()')} relaxes one stubbing.</p>`,
    clues: ['"the service calls an external payment API" → mock / stub the gateway interface', '"check what email was sent" → ArgumentCaptor', '"make sure we never charge twice" → verify(gateway, times(1)) / never()', '"stub a void method to throw" → doThrow().when(mock).method()', '"partially mock a real object" → spy + doReturn', '"UnnecessaryStubbingException" → strict stubs: remove the unused when()', '"InvalidUseOfMatchersException" → mixing raw values and matchers'],
    code: [lib(`import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.assertj.core.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class CheckoutServiceTest {
    @Mock PaymentGateway gateway;            // collaborator: slow, costs money → mock
    @Mock Mailer mailer;
    @InjectMocks CheckoutService service;     // real class under test, built with the mocks
    @Captor ArgumentCaptor<Email> emailCaptor;

    @Test
    void chargesOnceAndSendsReceipt() {
        when(gateway.charge("u1", 500)).thenReturn(Receipt.ok("tx-9"));   // stub

        service.checkout("u1", 500);                                       // act

        verify(gateway, times(1)).charge("u1", 500);                        // verify
        verify(mailer).send(emailCaptor.capture());                         // capture
        assertThat(emailCaptor.getValue().body()).contains("tx-9");
        verifyNoMoreInteractions(gateway);
    }

    @Test
    void noEmailWhenPaymentFails() {
        when(gateway.charge(anyString(), anyLong())).thenThrow(new GatewayTimeout());

        assertThatThrownBy(() -> service.checkout("u1", 500)).isInstanceOf(CheckoutFailed.class);
        verify(mailer, never()).send(any());
    }

    @Test
    void retriesOnceThenSucceeds() {
        when(gateway.charge(anyString(), anyLong()))
            .thenThrow(new GatewayTimeout())                 // 1st call
            .thenReturn(Receipt.ok("tx-10"));                // 2nd and later calls
        service.checkout("u2", 100);
        verify(gateway, times(2)).charge("u2", 100);
    }
}`, 'Mockito + JUnit 5 (needs mockito-junit-jupiter)'), {
      title: 'Hand-written stub, fake and mock in plain Java (what Mockito generates for you)', code: `
interface PaymentGateway { String charge(String user, long cents); }
interface Mailer { void send(String to, String body); }

class CheckoutService {
    private final PaymentGateway gateway;
    private final Mailer mailer;
    CheckoutService(PaymentGateway g, Mailer m) { gateway = g; mailer = m; }   // constructor injection

    String checkout(String user, long cents) {
        String tx = gateway.charge(user, cents);
        mailer.send(user, "paid " + cents + " tx=" + tx);
        return tx;
    }
}

class RecordingMailer implements Mailer {                  // a hand-made mock / spy
    final List<String> sent = new ArrayList<>();
    public void send(String to, String body) { sent.add(to + "|" + body); }
}

class CheckoutDemo {
    public static void main(String[] args) {
        PaymentGateway stub = (user, cents) -> "tx-42";       // stub: canned answer
        RecordingMailer mailer = new RecordingMailer();
        String tx = new CheckoutService(stub, mailer).checkout("ann", 500);
        System.out.println(tx.equals("tx-42") && mailer.sent.equals(List.of("ann|paid 500 tx=tx-42"))
            ? "PASS: charged and emailed once" : "FAIL " + mailer.sent);
    }
}` }],
    codeTitle: ['Mockito', 'Plain-Java doubles'],
    viz: {
      title: 'Inside a Mockito mock: stubs, invocation log, verify',
      input: 'charge u1 500, charge u2 70, refund u1 500, charge u1 500',
      inputLabel: 'Calls made by the code under test: method user amount, comma-separated',
      gen: function (input) {
        var calls = tokens(input, /\s*,\s*/, 'Example: charge u1 500, refund u1 500').map(function (c) {
          var p = c.split(/\s+/);
          if (p.length !== 3 || !/^\d+$/.test(p[2])) throw new Error('Each call looks like: charge u1 500');
          return p;
        });
        if (calls.length > 10) throw new Error('At most 10 calls');
        var log = [], frames = [];
        var stubs = [['charge(any, any)', '"OK"'], ['refund(any, any)', '(not stubbed → null)']];
        frames.push({ narr: '<code>mock(PaymentGateway.class)</code> creates a subclass/proxy whose every method records the call and looks up a stubbed answer. <code>when(gw.charge(anyString(), anyLong())).thenReturn("OK")</code> adds one stubbing.', parts: [{ type: 'map', label: 'stubbings', entries: stubs }, { type: 'queue', label: 'invocation log', items: [] }] });
        calls.forEach(function (c, i) {
          log.push(c.join(' '));
          var ans = c[0] === 'charge' ? '"OK"' : (c[0] === 'refund' ? 'null' : 'default (null/0/false)');
          frames.push({ narr: 'The code under test calls <code>' + H.esc(c[0] + '("' + c[1] + '", ' + c[2] + ')') + '</code>. The mock <b>records</b> it and returns ' + ans + '. No real money moves.', parts: [{ type: 'map', label: 'stubbings', entries: stubs, hl: c[0] === 'charge' ? { 'charge(any, any)': 'ok' } : {} }, { type: 'queue', label: 'invocation log', items: log.slice(), hl: (function () { var h = {}; h[i] = 'cur'; return h; })() }] });
        });
        var charges = calls.filter(function (c) { return c[0] === 'charge'; });
        var hl = {}; calls.forEach(function (c, i) { hl[i] = c[0] === 'charge' ? 'ok' : 'done'; });
        frames.push({ narr: '<code>verify(gw, times(2)).charge(anyString(), anyLong())</code> counts matching entries in the log: <b>' + charges.length + '</b> → ' + (charges.length === 2 ? H.c('g', 'pass') : H.c('r', 'fail: "Wanted 2 times but was ' + charges.length + '"')) + '.', parts: [{ type: 'queue', label: 'invocation log', items: log.slice(), hl: hl }] });
        frames.push({ narr: 'An <code>ArgumentCaptor&lt;Long&gt;</code> used in <code>verify(gw, atLeastOnce()).charge(anyString(), captor.capture())</code> collects every amount: <code>getAllValues()</code> = [' + charges.map(function (c) { return c[2]; }).join(', ') + '], <code>getValue()</code> = the last one.', parts: [{ type: 'array', label: 'captor.getAllValues()', values: charges.map(function (c) { return +c[2]; }), hl: {} }] });
        var users = {}; charges.forEach(function (c) { users[c[1]] = (users[c[1]] || 0) + 1; });
        var dup = Object.keys(users).filter(function (u) { return users[u] > 1; });
        frames.push({ narr: dup.length ? 'Behaviour check that catches a real bug: user ' + H.esc(dup.join(', ')) + ' was charged more than once. <code>verify(gw, times(1)).charge(eq("' + H.esc(dup[0]) + '"), anyLong())</code> would fail here.' : 'Every user was charged at most once: <code>verify(gw, times(1)).charge(eq(user), anyLong())</code> passes for each.', parts: [{ type: 'map', label: 'charges per user', entries: Object.keys(users).map(function (u) { return [u, users[u]]; }), hl: dup.length ? (function () { var h = {}; dup.forEach(function (d) { h[d] = 'bad'; }); return h; })() : {} }] });
        return frames;
      }
    },
    examples: [
      { title: 'State vs behaviour verification', html: `<p><b>State</b>: call the code, then check the result or the fake's contents (${C('assertThat(fakeRepo.findAll()).hasSize(1)')}). <b>Behaviour</b>: check that a collaborator was called (${C('verify(mailer).send(...)')}). Prefer state checks; verify interactions only when the interaction <i>is</i> the requirement (an email is sent, a payment is charged exactly once, a cache is not hit twice).</p>` },
      { title: 'Don\'t mock what you don\'t own', html: `<p>Mocking ${C('RestTemplate')}, ${C('JdbcTemplate')} or the AWS SDK directly couples tests to their call details and lets wrong assumptions pass. Wrap them behind your own small interface (${C('PaymentGateway')}), mock <b>that</b> in unit tests, and test the wrapper itself against the real thing (WireMock, Testcontainers).</p>` },
      { title: 'Mocking static and final', html: `<p>Mockito 5 uses the inline mock maker by default, so final classes and methods can be mocked, and ${C('try (MockedStatic<UUID> m = mockStatic(UUID.class)) { ... }')} mocks a static method inside the block. Treat the need as a design smell: inject a ${C('Clock')} or an ${C('IdGenerator')} instead.</p>`, code: `
interface IdGenerator { String next(); }

class Orders {
    private final IdGenerator ids;
    private final Clock clock;
    Orders(IdGenerator ids, Clock clock) { this.ids = ids; this.clock = clock; }

    String create() { return ids.next() + "@" + LocalDate.now(clock); }   // no static calls to mock
}

class OrdersCheck {
    static String run() {
        Clock fixed = Clock.fixed(Instant.parse("2026-01-15T10:00:00Z"), ZoneOffset.UTC);
        return new Orders(() -> "ord-1", fixed).create();                  // "ord-1@2026-01-15"
    }
}` },
      { title: 'Over-mocking makes tests useless', html: `<p>A test that mocks 6 collaborators and verifies 12 calls re-states the implementation. Any refactor breaks it, while real bugs (wrong SQL, wrong JSON mapping) slip through because the mocks agree with whatever the code does. Signs: ${C('when')} chains returning mocks returning mocks (${C('RETURNS_DEEP_STUBS')}), verifying getters, mocking value objects or lists.</p>` }
    ],
    deepDive: `<p><b>How Mockito works:</b> it generates a subclass (or, with the inline mock maker, instruments the class bytecode via a Java agent using ByteBuddy). Every call goes to a handler that records the invocation and looks up the most recent matching stubbing. ${C('when(mock.foo())')} works because ${C('mock.foo()')} runs first, records "last invocation", and ${C('when')} turns that last invocation into a stubbing — which is also why argument matchers must be used for all or none: they are pushed on a hidden stack during that call.</p>
<p><b>Stubbing order:</b> later stubbings for the same arguments override earlier ones; a more general later stubbing (${C('any()')}) overrides a specific earlier one. Put general stubs first, specific ones after.</p>
<p><b>Classicist (Chicago) vs mockist (London) TDD:</b> classicists use real objects and fakes, mocking only at system edges; mockists mock every collaborator and design via interactions. Most teams today are classicist-leaning: mock I/O boundaries, use real domain objects.</p>
<p><b>Fakes age better than mocks:</b> an in-memory ${C('UserRepository')} implementing the same interface can be reused by hundreds of tests, and a shared <i>contract test</i> runs against both the fake and the real JPA repository to guarantee they behave the same.</p>
<p><b>Spring:</b> ${C('@MockitoBean')} (Spring Framework 6.2+, replacing Spring Boot's ${C('@MockBean')}) puts a mock into the application context; every distinct set of mock beans creates a new cached context, so overusing it slows suites dramatically.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI-generated tests are often <b>mock-heavy</b>: they mock every dependency and verify every call, producing tests that pass by construction and break on every refactor. When you review them, ask: "if I introduce a real bug in this method, does a test fail?" and "if I refactor without changing behaviour, does a test fail?" — the right answers are yes and no. Prompt for "state-based tests with an in-memory fake repository; mock only the payment gateway" to steer the output. AI is excellent at writing the fake itself and the contract test that keeps it honest.</p>`,
    problems: [{
      title: 'Build a Recording Spy with Captor and In-Order Verification',
      level: 'Medium', tags: ['Mockito', 'spy', 'design', 'hash map'], companies: ['Amazon', 'Goldman Sachs', 'Zalando'],
      statement: `<p>Implement ${C('class CallRecorder')} — the core of a mock:</p>
<ul><li>${C('void record(String method, String arg)')} logs one call.</li>
<li>${C('int times(String method)')} — how many calls to that method (like ${C('verify(m, times(n))')}).</li>
<li>${C('List<String> captured(String method)')} — every argument passed to that method, in call order (like ${C('ArgumentCaptor.getAllValues()')}); empty list if never called.</li>
<li>${C('boolean verifyInOrder(String[] methods)')} — true if the methods were called in this relative order, other calls in between allowed (like Mockito ${C('InOrder')}). Each listed call must match a <b>different, later</b> call than the previous one. An empty array is true.</li></ul>`,
      constraints: `Up to 10<sup>4</sup> operations.`,
      example: `<p>record(charge, 500), record(email, ann), record(charge, 70) → ${C('times("charge")')} = ${H.c('g', '2')}, ${C('captured("charge")')} = ${H.c('g', '[500, 70]')}, ${C('verifyInOrder([charge, email])')} = ${H.c('g', 'true')}, ${C('verifyInOrder([email, email])')} = ${H.c('r', 'false')} (only one email call).</p>`,
      brute: { why: `<p>Storing only a counter per method loses the arguments (no captor) and the order (no in-order verification). Rescanning a flat log for every query works but costs O(n) per ${C('times')}/${C('captured')} call.</p>`, code: `
class CallRecorderBrute {
    private final Map<String, Integer> counts = new HashMap<>();
    void record(String method, String arg) { counts.merge(method, 1, Integer::sum); }
    int times(String method) { return counts.getOrDefault(method, 0); }
    List<String> captured(String method) { return new ArrayList<>(); }       // arguments were never stored
    boolean verifyInOrder(String[] methods) { return true; }                // order was never stored
}` },
      mcq: { q: 'Calls: a, b, a. Which InOrder verification fails?', options: ['a then b', 'b then a', 'a then a', 'b then b'], answer: 3, explain: 'There is only one call to b, and each verified call must consume a different, later invocation.' },
      hints: [`<p>Hint 1: keep two structures — a full call log in order (for ordering) and a ${C('Map<String, List<String>>')} of arguments per method (for counts and captors).</p>`, `<p>Hint 2: ${C('times')} is the size of the argument list. ${C('captured')} returns a copy so callers cannot change your state.</p>`, `<p>Hint 3: in-order is a subsequence check — walk the log with one pointer and the expected array with another; advance the expected pointer on a match.</p>`],
      tests: { cls: 'CallRecorder', sigs: { CallRecorder: '', record: 'string string -> void', times: 'string -> int', captured: 'string -> list<string>', verifyInOrder: 'string[] -> bool' }, cases: [
        { ops: ['CallRecorder', 'record', 'record', 'record', 'times', 'captured', 'verifyInOrder', 'verifyInOrder'], args: [[], ['charge', '500'], ['email', 'ann'], ['charge', '70'], ['charge'], ['charge'], [['charge', 'email']], [['email', 'email']]], out: [null, null, null, null, 2, ['500', '70'], true, false] },
        { ops: ['CallRecorder', 'times', 'captured', 'verifyInOrder'], args: [[], ['x'], ['x'], [[]]], out: [null, 0, [], true] },
        { ops: ['CallRecorder', 'record', 'record', 'record', 'verifyInOrder', 'verifyInOrder', 'verifyInOrder', 'verifyInOrder'], args: [[], ['a', '1'], ['b', '2'], ['a', '3'], [['a', 'b']], [['b', 'a']], [['a', 'a']], [['b', 'b']]], out: [null, null, null, null, true, true, true, false] },
        { ops: ['CallRecorder', 'record', 'record', 'captured', 'times', 'verifyInOrder'], args: [[], ['save', ''], ['save', ''], ['save'], ['save'], [['save', 'save', 'save']]], out: [null, null, null, ['', ''], 2, false] },
        { ops: ['CallRecorder', 'record', 'verifyInOrder', 'verifyInOrder', 'times'], args: [[], ['open', 'f'], [['close']], [['open']], ['close']], out: [null, null, false, true, 0] },
        { ops: ['CallRecorder', 'record', 'record', 'record', 'record', 'verifyInOrder', 'captured'], args: [[], ['open', 'a'], ['write', 'x'], ['write', 'y'], ['close', 'a'], [['open', 'write', 'close']], ['write']], out: [null, null, null, null, null, true, ['x', 'y']] },
        { ops: { $concat: [['CallRecorder'], { $rep: 'record', n: 3000 }, ['times', 'verifyInOrder']] }, args: { $concat: [[[]], { $rep: ['ping', 'p'], n: 3000 }, [['ping'], [['ping', 'ping']]]] }, out: { $concat: [[null], { $rep: null, n: 3000 }, [3000, true]] } }
      ] },
      solution: {
        approach: `<p>Store every call in an ordered log plus a per-method argument list. Counts and captors read the map in O(1); in-order verification is a greedy subsequence match over the log (taking the earliest possible match is always safe).</p>`,
        code: `
class CallRecorder {
    private final List<String> log = new ArrayList<>();                   // method names in call order
    private final Map<String, List<String>> args = new HashMap<>();       // method -> captured args

    void record(String method, String arg) {
        log.add(method);
        args.computeIfAbsent(method, k -> new ArrayList<>()).add(arg);
    }

    int times(String method) {
        return args.getOrDefault(method, List.of()).size();
    }

    List<String> captured(String method) {
        return new ArrayList<>(args.getOrDefault(method, List.of()));      // defensive copy
    }

    boolean verifyInOrder(String[] methods) {
        int want = 0;
        for (int i = 0; i < log.size() && want < methods.length; i++)
            if (log.get(i).equals(methods[want])) want++;                  // greedy earliest match
        return want == methods.length;
    }
}`,
        dry: { head: ['operation', 'log', 'args map', 'result'], rows: [
          ['record(charge, 500)', '[charge]', '{charge=[500]}', '—'],
          ['record(email, ann)', '[charge, email]', '{charge=[500], email=[ann]}', '—'],
          ['record(charge, 70)', '[charge, email, charge]', '{charge=[500, 70], …}', '—'],
          ['verifyInOrder([email, email])', 'match email at 1, no later email', '—', H.c('r', 'false')]
        ] },
        complexity: `<p>${C('record')}, ${C('times')}: O(1) amortised. ${C('captured')}: O(k) for the copy. ${C('verifyInOrder')}: O(n) over the log. Space O(n).</p>`,
        followUps: ['Add verifyNoMoreInteractions()', 'Support atLeast(n) and never()', 'How does Mockito match arguments with any() and eq()?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 7 — Integration tests with Testcontainers, coverage with JaCoCo
     ====================================================================== */
  topics.push({
    title: 'Integration Testing with Testcontainers & Code Coverage with JaCoCo',
    analogy: `<p>Unit tests with mocks are like <b>rehearsing a play in an empty room</b>: fast, but you never learn that the real stage door sticks. <b>Testcontainers</b> rents a <b>real stage</b> for one afternoon — a real PostgreSQL, Kafka or Redis in a throw-away Docker container — and tears it down afterwards. <b>JaCoCo</b> is the stage manager with a <b>floor map and a highlighter</b>: every spot an actor stepped on gets marked. A map with unmarked corners tells you where nobody rehearsed; but a fully marked map does not prove the actors said the right lines.</p>`,
    explain: `<p><b>Plain idea:</b> some bugs only appear with the real thing: SQL that PostgreSQL rejects, a JSON column, a Kafka serializer, a transaction isolation surprise. Integration tests run your code against real dependencies; coverage tells you which code your tests executed.</p>
<h4>1. The test pyramid</h4>
${H.table(['Layer', 'Share', 'Speed', 'What it catches'], [
  ['Unit (JUnit + Mockito/fakes)', '~70%', 'ms', 'logic, edge cases'],
  ['Integration (Testcontainers, WireMock, @DataJpaTest)', '~20%', 'seconds', 'SQL, mappings, serialization, config'],
  ['End-to-end (whole system, UI/API)', '~10%', 'minutes', 'wiring between services, critical user journeys']
])}
<h4>2. Testcontainers in practice</h4>
<ul><li>${C('@Testcontainers')} on the class + ${C('@Container static PostgreSQLContainer<?> db = new PostgreSQLContainer<>("postgres:16-alpine");')} — a <b>static</b> field starts once per class; an instance field starts once per test (slow).</li>
<li>Read the random host port with ${C('db.getJdbcUrl()')}; never hard-code 5432 (parallel builds would clash).</li>
<li>Spring Boot 3.1+: ${C('@ServiceConnection')} wires the container into the datasource automatically; before that, ${C('@DynamicPropertySource')}.</li>
<li><b>Singleton container pattern</b>: start one container in a base class's static block, shared by all test classes in the JVM — huge speed-up. A sidecar called <b>Ryuk</b> removes containers even if the JVM crashes.</li>
<li>Pin image tags (${C('postgres:16.4')}), use the same major version as production, and run integration tests with <b>Failsafe</b> (${C('*IT')}) in ${C('mvn verify')}.</li></ul>
<h4>3. JaCoCo: how coverage is measured</h4>
<p>JaCoCo attaches a <b>Java agent</b> (${C('prepare-agent')} goal sets ${C('argLine')} for Surefire) that instruments classes as they load, adding probes. After the tests, ${C('jacoco.exec')} holds which probes fired; ${C('report')} creates HTML/XML; ${C('check')} fails the build below a threshold.</p>
${H.table(['Counter', 'Meaning'], [
  ['INSTRUCTION', 'bytecode instructions executed — the finest grain'],
  ['BRANCH', 'each outcome of ' + C('if') + ' / ' + C('switch') + ' / ' + C('&&') + ' — ' + C('if (a && b)') + ' has 4 branches'],
  ['LINE', 'a line counts as covered if at least one of its instructions ran (green / yellow partial / red)'],
  ['METHOD, CLASS', 'executed at least once'],
  ['COMPLEXITY', 'cyclomatic complexity: minimum number of paths to cover']
])}
<p><b>Line coverage lies most:</b> ${C('return a > 0 ? x : y;')} is one fully green line even if ${C('a > 0')} was never false. <b>Branch coverage</b> is the better gate. Neither checks your assertions: a test with no assertions still produces coverage. <b>Mutation testing</b> (PIT) changes your code (${C('>')} → ${C('>=')}) and checks that some test fails.</p>`,
    clues: ['"tests pass with H2 but production PostgreSQL fails" → Testcontainers with the real database', '"integration tests are slow" → static/singleton containers, reuse, run in verify with Failsafe', '"enforce 80% coverage in CI" → jacoco:check with a BRANCH or LINE rule', '"100% coverage but bugs still ship" → coverage ≠ assertions → mutation testing', '"test the HTTP client against the real API contract" → WireMock / contract tests', '"multi-module coverage report" → jacoco report-aggregate'],
    code: [lib(`import org.junit.jupiter.api.*;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.*;
import java.sql.*;
import static org.assertj.core.api.Assertions.*;

@Testcontainers
class OrderRepositoryIT {                              // *IT → run by Failsafe in mvn verify

    @Container                                         // static → one container for the whole class
    static PostgreSQLContainer<?> db = new PostgreSQLContainer<>("postgres:16.4-alpine");

    OrderRepository repo;

    @BeforeEach
    void setUp() throws SQLException {
        var ds = new org.postgresql.ds.PGSimpleDataSource();
        ds.setUrl(db.getJdbcUrl());                     // random free host port
        ds.setUser(db.getUsername());
        ds.setPassword(db.getPassword());
        repo = new OrderRepository(ds);
        repo.migrate();                                 // run Flyway / schema scripts
        repo.deleteAll();                               // isolation: clean data per test
    }

    @Test
    void upsertKeepsOneRowPerOrderId() {                // ON CONFLICT is PostgreSQL syntax: H2 would not catch a mistake
        repo.upsert(new Order("o-1", 500));
        repo.upsert(new Order("o-1", 700));
        assertThat(repo.findAll()).extracting(Order::cents).containsExactly(700);
    }
}`, 'Testcontainers integration test (needs Docker + testcontainers deps)'), xml(`<plugin>
  <groupId>org.jacoco</groupId>
  <artifactId>jacoco-maven-plugin</artifactId>
  <version>0.8.12</version>
  <executions>
    <execution><id>agent</id><goals><goal>prepare-agent</goal></goals></execution>
    <execution><id>report</id><phase>verify</phase><goals><goal>report</goal></goals></execution>
    <execution>
      <id>check</id>
      <goals><goal>check</goal></goals>
      <configuration>
        <rules>
          <rule>
            <element>BUNDLE</element>
            <limits>
              <limit><counter>BRANCH</counter><value>COVEREDRATIO</value><minimum>0.75</minimum></limit>
              <limit><counter>LINE</counter><value>COVEREDRATIO</value><minimum>0.80</minimum></limit>
            </limits>
          </rule>
        </rules>
        <excludes><exclude>**/generated/**</exclude></excludes>
      </configuration>
    </execution>
  </executions>
</plugin>`, 'JaCoCo coverage gate in pom.xml'), kts(`plugins { java; jacoco }
tasks.test { useJUnitPlatform(); finalizedBy(tasks.jacocoTestReport) }
tasks.jacocoTestCoverageVerification {
    violationRules { rule { limit { counter = "BRANCH"; minimum = "0.75".toBigDecimal() } } }
}
tasks.check { dependsOn(tasks.jacocoTestCoverageVerification) }`, 'JaCoCo in Gradle')],
    codeTitle: ['Testcontainers', 'JaCoCo (Maven)', 'JaCoCo (Gradle)'],
    viz: {
      title: 'Line vs branch coverage on one small method',
      input: '50, 150, -5',
      inputLabel: 'Amounts passed by your tests to shippingFee(amount), comma-separated',
      gen: function (input) {
        var vals = tokens(input, /\s*,\s*/, 'Example: 50, 150').map(function (v) { if (!/^-?\d+$/.test(v)) throw new Error('Whole numbers only, e.g. 50, 150, -5'); return +v; });
        if (vals.length > 8) throw new Error('At most 8 tests');
        var code = ['int shippingFee(int amount) {', '  if (amount < 0) throw new IllegalArgumentException();', '  if (amount >= 100) return 0;', '  return amount > 50 ? 5 : 8;', '}'].join('\n');
        var hits = { 2: 0, 3: 0, 4: 0 }, br = { 'L2 true': 0, 'L2 false': 0, 'L3 true': 0, 'L3 false': 0, 'L4 >50': 0, 'L4 <=50': 0 };
        var bars = function () { return { type: 'bars', label: 'hits on lines 2, 3, 4', values: [hits[2], hits[3], hits[4]], idxLabels: ['L2', 'L3', 'L4'] }; };
        var frames = [{ narr: 'JaCoCo has instrumented <code>shippingFee</code> with probes. Lines 2-4 hold the code (<b>3 lines</b>) and there are <b>6 branches</b>: two ifs and one ternary, each with a true and a false outcome.', parts: [{ type: 'code', label: 'class under test', lang: 'java', code: code, hl: {} }, bars()] }];
        vals.forEach(function (a) {
          var hl = { 2: 'cur' }, out;
          hits[2]++;
          if (a < 0) { br['L2 true']++; out = 'throws'; }
          else {
            br['L2 false']++; hits[3]++; hl[3] = 'cur';
            if (a >= 100) { br['L3 true']++; out = '0'; }
            else { br['L3 false']++; hits[4]++; hl[4] = 'cur'; if (a > 50) { br['L4 >50']++; out = '5'; } else { br['L4 <=50']++; out = '8'; } }
          }
          frames.push({ narr: 'Test calls <code>shippingFee(' + a + ')</code> → ' + out + '. Probes on the executed lines and branches fire.', parts: [{ type: 'code', label: 'executed lines', lang: 'java', code: code, hl: hl }, bars(), { type: 'map', label: 'branch outcomes taken', entries: Object.keys(br).map(function (k) { return [k, br[k]]; }), hl: (function () { var h = {}; Object.keys(br).forEach(function (k) { h[k] = br[k] ? 'ok' : 'bad'; }); return h; })() }] });
        });
        var lc = [2, 3, 4].filter(function (i) { return hits[i] > 0; }).length;
        var bc = Object.keys(br).filter(function (k) { return br[k] > 0; }).length;
        var missed = Object.keys(br).filter(function (k) { return !br[k]; });
        frames.push({ narr: 'Report: line coverage <b>' + lc + '/3 = ' + (lc * 100 / 3).toFixed(1) + '%</b>, branch coverage <b>' + bc + '/6 = ' + (bc * 100 / 6).toFixed(1) + '%</b>.' + (missed.length ? ' Missed branches: ' + missed.join(', ') + '. A line can be "green" while one of its outcomes never ran — that is why branch coverage is the better gate.' : ' Every branch ran. Coverage still cannot tell whether your tests <i>asserted</i> the right fee.'), parts: [{ type: 'vars', label: 'jacoco summary', vals: { LINE: lc + '/3', BRANCH: bc + '/6' }, hl: { BRANCH: bc === 6 ? 'ok' : 'bad' } }] });
        return frames;
      }
    },
    examples: [
      { title: 'Why not H2 for repository tests?', html: `<p>H2 in "PostgreSQL mode" still differs: no ${C('jsonb')}, different ${C('ON CONFLICT')} support, different locking, case rules and error codes. A query can pass on H2 and fail in production. Testcontainers starts the <b>same engine and major version</b> as production in a few seconds, and the image is cached after the first pull.</p>` },
      { title: 'WireMock for HTTP dependencies', html: `<p>For an external REST API, run WireMock (as a library or a container) and stub ${C('GET /rates/EUR')} → ${C('200 {"rate": 1.08}')}, and also ${C('503')}, slow responses and malformed JSON. Your real HTTP client, timeouts, retries and JSON mapping are exercised — far more than mocking ${C('HttpClient')}.</p>` },
      { title: 'Coverage without a single assertion', html: `<p>This test gives 100% line coverage of ${C('discount')} and catches nothing:</p>`, code: `
class Pricing {
    static int discount(int cents, boolean vip) {
        if (vip) return cents * 90 / 100;
        return cents;
    }
}
class UselessTest {
    static void coversEverything() {
        Pricing.discount(1000, true);     // executed...
        Pricing.discount(1000, false);    // ...but nothing is asserted: coverage 100%, protection 0%
    }
}` },
      { title: 'Choosing a threshold', html: `<p>Common practice: 70–80% branch coverage on <b>new code</b> (diff coverage in SonarQube) rather than a hard global number. Exclude generated code, DTOs and ${C('main')} methods. Never write tests just to hit the number; review uncovered <b>branches</b> to find untested error handling.</p>` }
    ],
    deepDive: `<p><b>Testcontainers internals:</b> it talks to the Docker API (Docker Desktop, Colima, Podman, or Testcontainers Cloud), pulls the image, starts the container with random port mappings, and waits using a <b>wait strategy</b> (log message, port listening, HTTP health check) before the test starts. ${C('withReuse(true)')} plus ${C('testcontainers.reuse.enable=true')} keeps containers between local runs for fast feedback (not on CI).</p>
<p><b>Data isolation between tests:</b> truncate tables in ${C('@BeforeEach')}, run each test in a rolled-back transaction (Spring's ${C('@Transactional')} on tests — but then code that commits or uses another thread behaves differently), or use unique ids per test. Never depend on test order.</p>
<p><b>JaCoCo details:</b> on-the-fly instrumentation needs the agent on the forked test JVM; if you override Surefire's ${C('argLine')} without ${C('@{argLine}')}, the agent is dropped and coverage is silently 0%. Kotlin/Lombok-generated code is filtered automatically in recent versions. ${C('report-aggregate')} (Maven) or the ${C('jacoco-report-aggregation')} plugin (Gradle) combine modules so tests in ${C('web')} count for code in ${C('core')}.</p>
<p><b>Mutation testing:</b> PIT generates mutants (negate conditionals, change boundaries, remove calls, return null) and runs the tests that cover each mutant; the <b>mutation score</b> (killed / total) measures how well tests <i>detect</i> changes. It is slower, so teams run it on changed classes in pull requests.</p>
<p><b>Flaky tests:</b> the usual causes are time (use ${C('Clock')}), ordering, shared data, async without proper waiting (Awaitility instead of ${C('sleep')}), and real network. Quarantine and fix them; retries hide real race conditions.</p>`,
    aiEra: `<p><b>What AI changes:</b> "raise coverage to 80%" is the kind of goal AI agents can hit quickly — and badly, with assertion-free tests that execute lines. Measure what matters: branch coverage on changed code <b>plus</b> mutation score, and review AI tests for real assertions. On the bright side, AI makes integration tests cheaper to write: it can produce the Testcontainers setup, seed data and WireMock stubs from an OpenAPI spec, and explain a red JaCoCo report line by line. Because AI-written production code increases, the safety net of real-dependency integration tests matters more, not less.</p>`,
    problems: [{
      title: 'JaCoCo-Style Coverage Gate',
      level: 'Medium', tags: ['coverage', 'JaCoCo', 'arithmetic', 'formatting'], companies: ['Microsoft', 'SAP', 'Atlassian'],
      statement: `<p>Write ${C('String coverageGate(int[] lineHits, int[] branchCovered, int[] branchTotal, int minLine, int minBranch)')}.</p>
<ul><li>${C('lineHits[i]')} is how often executable line ${C('i')} ran; a line is covered if its count is &gt; 0.</li>
<li>${C('branchCovered[j]')} / ${C('branchTotal[j]')} are the covered and total branches of decision point ${C('j')}.</li>
<li>Line % = covered lines / lines, branch % = sum of covered / sum of totals; a counter with total 0 counts as 100%.</li>
<li>PASS when line % ≥ ${C('minLine')} <b>and</b> branch % ≥ ${C('minBranch')}, compared exactly (no rounding).</li></ul>
<p>Return ${C('"lines X% branches Y% PASS"')} or ${C('FAIL')}, with X and Y formatted to one decimal (half-up).</p>`,
      constraints: `0 ≤ lines, decision points ≤ 10<sup>5</sup>; 0 ≤ covered ≤ total ≤ 64; 0 ≤ thresholds ≤ 100.`,
      example: `<p>lineHits ${C('[1, 1, 0]')}, branches ${C('[2, 1] / [2, 2]')}, thresholds 67 / 75 → lines 2/3 = 66.67%, branches 3/4 = 75% → ${H.c('r', '"lines 66.7% branches 75.0% FAIL"')}. The display rounds 66.67 to 66.7, but the comparison uses the exact ratio, so 66.67 &lt; 67 fails.</p>`,
      brute: { why: `<p>Comparing the <b>rounded</b> or floating percentages (${C('66.7 >= 66.7')}) gives wrong answers at the boundary and depends on floating-point error; JaCoCo compares the exact covered ratio against the minimum.</p>`, code: `
class Brute {
    String coverageGate(int[] lineHits, int[] branchCovered, int[] branchTotal, int minLine, int minBranch) {
        double covered = 0;
        for (int h : lineHits) if (h > 0) covered++;
        double linePct = covered / lineHits.length * 100;            // NaN when there are no lines
        double brPct = 0, c = 0, t = 0;
        for (int i = 0; i < branchTotal.length; i++) { c += branchCovered[i]; t += branchTotal[i]; }
        brPct = c / t * 100;
        boolean pass = Math.round(linePct) >= minLine && Math.round(brPct) >= minBranch; // rounding hides failures
        return "lines " + linePct + "% branches " + brPct + "% " + (pass ? "PASS" : "FAIL");
    }
}` },
      mcq: { q: '<code>if (a &amp;&amp; b) x(); else y();</code> — a test suite with a=true,b=true and a=false. Branch coverage of the condition?', options: ['100%', '75%', '50%', '25%'], answer: 1, explain: 'There are 4 branches (a true/false, b true/false). a=true,b=true covers a-true and b-true; a=false covers a-false. b-false never ran: 3/4 = 75%.' },
      hints: [`<p>Hint 1: count with integers: covered lines, total lines, covered branches, total branches.</p>`, `<p>Hint 2: exact comparison without floating point: ${C('covered * 100 >= min * total')} (use ${C('long')}). A total of 0 always passes.</p>`, `<p>Hint 3: format with ${C('BigDecimal.valueOf(covered * 100).divide(BigDecimal.valueOf(total), 1, RoundingMode.HALF_UP)')} to get one decimal half-up without binary rounding surprises.</p>`],
      tests: { sig: 'int[] int[] int[] int int -> string', fn: 'coverageGate', cases: [
        [[[3, 0, 1, 1], [1], [2], 75, 50], 'lines 75.0% branches 50.0% PASS'],
        [[[3, 0, 1, 1], [1], [2], 80, 50], 'lines 75.0% branches 50.0% FAIL'],
        [[[], [], [], 80, 80], 'lines 100.0% branches 100.0% PASS'],
        [[[0, 0, 0], [], [], 0, 0], 'lines 0.0% branches 100.0% PASS'],
        [[[1, 1, 0], [2, 1], [2, 2], 66, 75], 'lines 66.7% branches 75.0% PASS'],
        [[[1, 1, 0], [2, 1], [2, 2], 67, 75], 'lines 66.7% branches 75.0% FAIL'],
        [[[5, 5, 5, 5, 5, 5, 0], [0, 0], [2, 4], 80, 1], 'lines 85.7% branches 0.0% FAIL'],
        [[[1, 0, 0, 0, 0, 0, 0, 0], [1], [8], 12, 12], 'lines 12.5% branches 12.5% PASS'],
        [[{ $rep: 1, n: 100000 }, { $rep: 64, n: 100000 }, { $rep: 64, n: 100000 }, 100, 100], 'lines 100.0% branches 100.0% PASS']
      ] },
      solution: {
        approach: `<p>Count with integers, compare with cross-multiplication (exact), and format with ${C('BigDecimal')} half-up. Treat empty counters as fully covered, as JaCoCo does for a missing counter.</p>`,
        code: `
class Solution {
    String coverageGate(int[] lineHits, int[] branchCovered, int[] branchTotal, int minLine, int minBranch) {
        long linesCovered = 0, lines = lineHits.length;
        for (int h : lineHits) if (h > 0) linesCovered++;
        long brCovered = 0, brTotal = 0;
        for (int i = 0; i < branchTotal.length; i++) { brCovered += branchCovered[i]; brTotal += branchTotal[i]; }
        boolean pass = meets(linesCovered, lines, minLine) && meets(brCovered, brTotal, minBranch);
        return "lines " + pct(linesCovered, lines) + "% branches " + pct(brCovered, brTotal) + "% "
            + (pass ? "PASS" : "FAIL");
    }

    private boolean meets(long covered, long total, int min) {
        return total == 0 || covered * 100 >= (long) min * total;    // exact, no floating point
    }

    private String pct(long covered, long total) {
        if (total == 0) return "100.0";
        return BigDecimal.valueOf(covered * 100)
                .divide(BigDecimal.valueOf(total), 1, RoundingMode.HALF_UP).toPlainString();
    }
}`,
        dry: { head: ['counter', 'covered / total', 'exact check', 'display'], rows: [
          ['LINE', '2 / 3', '200 ≥ 67 × 3 = 201? no', '66.7'],
          ['BRANCH', '3 / 4', '300 ≥ 75 × 4 = 300? yes', '75.0'],
          ['result', '—', 'line fails', H.c('r', 'FAIL')]
        ] },
        complexity: `<p>O(L + B) time for L lines and B decision points; O(1) extra space.</p>`,
        followUps: ['Add an instruction counter and a per-class rule', 'Why gate on new-code coverage instead of the whole project?', 'How would mutation score change the gate?']
      }
    }]
  });

  /* ======================================================================
     PRACTICE ARENA — Easy
     ====================================================================== */
  practice.push({
    title: 'Parse Maven Coordinates',
    level: 'Easy', tags: ['Maven', 'strings', 'parsing'], companies: ['TCS', 'Cognizant', 'Oracle'],
    statement: `<p>A Maven coordinate string has one of three shapes: ${C('groupId:artifactId:version')}, ${C('groupId:artifactId:packaging:version')} or ${C('groupId:artifactId:packaging:classifier:version')}. Write ${C('String[] parse(String coord)')} returning ${C('[groupId, artifactId, packaging, classifier, version]')}, with packaging ${C('"jar"')} and classifier ${C('""')} when missing. Return an empty array for any other number of parts or if any part is empty.</p>`,
    constraints: `0 ≤ length ≤ 200.`,
    example: `<p>${C('"io.netty:netty-transport-native-epoll:jar:linux-x86_64:4.1.114.Final"')} → ${H.c('g', '[io.netty, netty-transport-native-epoll, jar, linux-x86_64, 4.1.114.Final]')}. ${C('"a::1"')} → ${H.c('r', '[]')} (empty artifactId).</p>`,
    brute: { why: `<p>Using ${C('split(":")')} without a limit silently drops trailing empty strings, so ${C('"g:a:"')} looks like a valid 2-part string instead of a 3-part one with an empty version; and guessing positions with ${C('indexOf')} chains breaks for the 5-part form.</p>`, code: `
class Brute {
    String[] parse(String coord) {
        String[] p = coord.split(":");               // drops trailing empties
        if (p.length == 3) return new String[]{p[0], p[1], "jar", "", p[2]};
        return new String[0];                         // forgets the 4- and 5-part forms
    }
}` },
    mcq: { q: 'In <code>io.netty:netty-transport-native-epoll:jar:linux-x86_64:4.1.114.Final</code>, what is <code>linux-x86_64</code>?', options: ['The version', 'The classifier — a side artifact of the same version', 'The groupId', 'The scope'], answer: 1, explain: 'Classifiers distinguish artifacts built from the same POM and version: native builds per OS, -sources, -javadoc, -tests.' },
    hints: [`<p>Hint 1: the number of parts decides the shape; the version is always the <b>last</b> part.</p>`, `<p>Hint 2: use ${C('split(":", -1)')} so empty parts are kept, then reject if any part is empty.</p>`, `<p>Hint 3: switch on the length 3 / 4 / 5 and fill defaults ${C('"jar"')} and ${C('""')}.</p>`],
    tests: { sig: 'string -> string[]', fn: 'parse', cases: [
      [['org.junit.jupiter:junit-jupiter:5.11.3'], ['org.junit.jupiter', 'junit-jupiter', 'jar', '', '5.11.3']],
      [['com.acme:bom:pom:1.0'], ['com.acme', 'bom', 'pom', '', '1.0']],
      [['io.netty:netty-transport-native-epoll:jar:linux-x86_64:4.1.114.Final'], ['io.netty', 'netty-transport-native-epoll', 'jar', 'linux-x86_64', '4.1.114.Final']],
      [['guava'], []],
      [['a::1'], []],
      [['a:b:c:d:e:f'], []],
      [[''], []],
      [['g:a:'], []],
      [['g:a:1.0-SNAPSHOT'], ['g', 'a', 'jar', '', '1.0-SNAPSHOT']]
    ] },
    solution: {
      approach: `<p>Split keeping empty parts, validate, then map the three legal shapes onto the five fields.</p>`,
      code: `
class Solution {
    String[] parse(String coord) {
        String[] p = coord.split(":", -1);                     // -1 keeps trailing empty parts
        if (p.length < 3 || p.length > 5) return new String[0];
        for (String s : p) if (s.isEmpty()) return new String[0];
        String packaging = p.length >= 4 ? p[2] : "jar";
        String classifier = p.length == 5 ? p[3] : "";
        return new String[]{p[0], p[1], packaging, classifier, p[p.length - 1]};
    }
}`,
      complexity: `<p>O(n) in the string length.</p>`
    }
  });

  practice.push({
    title: 'Which Classpaths Does a Maven Scope Reach?',
    level: 'Easy', tags: ['Maven', 'scopes', 'switch'], companies: ['Infosys', 'Capgemini', 'Deloitte'],
    statement: `<p>Write ${C('String[] classpaths(String scope)')} returning which of the classpaths ${C('compile')}, ${C('test')}, ${C('runtime')} (in that order) contain a dependency of that Maven scope. ${C('import')} affects no classpath (it only imports a BOM). Unknown scopes (scopes are lowercase) return ${C('["ERROR"]')}.</p>`,
    constraints: `Scope is a short string.`,
    example: `<p>${C('"provided"')} → ${H.c('g', '[compile, test]')} (not runtime: the server provides it). ${C('"runtime"')} → ${H.c('g', '[test, runtime]')}: you cannot write code against a JDBC driver class, but tests and the running app load it.</p>`,
    brute: { why: `<p>A chain of ${C('if')} statements per scope and per classpath (15 checks) is easy to get wrong — the classic mistake is forgetting that runtime-scoped dependencies are on the <b>test</b> classpath.</p>`, code: `
class Brute {
    String[] classpaths(String scope) {
        List<String> r = new ArrayList<>();
        if (scope.equals("compile") || scope.equals("provided")) r.add("compile");
        if (scope.equals("test")) r.add("test");                 // bug: misses compile/provided/runtime/system
        if (scope.equals("compile") || scope.equals("runtime")) r.add("runtime");
        return r.toArray(new String[0]);
    }
}` },
    mcq: { q: 'Which scope should a JDBC driver usually have?', options: ['compile', 'provided', 'runtime', 'test'], answer: 2, explain: 'Code talks to the java.sql interfaces; the driver is only loaded when the app (or a test) runs. runtime scope prevents accidental compile-time coupling to driver classes.' },
    hints: [`<p>Hint 1: draw the table: rows = scopes, columns = compile / test / runtime.</p>`, `<p>Hint 2: a ${C('switch')} expression returning a ${C('String[]')} per scope is the cleanest.</p>`, `<p>Hint 3: compile → all three; provided and system → compile, test; runtime → test, runtime; test → test; import → empty; default → ERROR.</p>`],
    tests: { sig: 'string -> string[]', fn: 'classpaths', cases: [
      [['compile'], ['compile', 'test', 'runtime']],
      [['provided'], ['compile', 'test']],
      [['runtime'], ['test', 'runtime']],
      [['test'], ['test']],
      [['system'], ['compile', 'test']],
      [['import'], []],
      [['Compile'], ['ERROR']],
      [[''], ['ERROR']]
    ] },
    solution: {
      approach: `<p>Encode the scope table directly with a switch expression; the table is the knowledge being tested.</p>`,
      code: `
class Solution {
    String[] classpaths(String scope) {
        return switch (scope) {
            case "compile" -> new String[]{"compile", "test", "runtime"};
            case "provided", "system" -> new String[]{"compile", "test"};   // container / JDK supplies it at runtime
            case "runtime" -> new String[]{"test", "runtime"};              // not visible to your source code
            case "test" -> new String[]{"test"};
            case "import" -> new String[0];                                 // BOM import only
            default -> new String[]{"ERROR"};
        };
    }
}`,
      complexity: `<p>O(1) — a constant-size lookup table.</p>`
    }
  });

  practice.push({
    title: 'Surefire or Failsafe? Classify a Test Class Name',
    level: 'Easy', tags: ['Maven', 'Surefire', 'Failsafe', 'strings'], companies: ['ThoughtWorks', 'Amazon', 'ING'],
    statement: `<p>By default Surefire runs classes named ${C('Test*')}, ${C('*Test')}, ${C('*Tests')} or ${C('*TestCase')}; Failsafe runs ${C('IT*')}, ${C('*IT')} or ${C('*ITCase')} (case-sensitive). Write ${C('String runner(String className)')} returning ${C('"surefire"')}, ${C('"failsafe"')}, ${C('"both"')} or ${C('"none"')}.</p>`,
    constraints: `1 ≤ length ≤ 100; a simple class name.`,
    example: `<p>${C('"OrderRepositoryIT"')} → ${H.c('g', 'failsafe')}. ${C('"TestUtils"')} → ${H.c('y', 'surefire')} — a helper class picked up as a test by accident! ${C('"ITTest"')} → ${H.c('r', 'both')}: it would run twice.</p>`,
    brute: { why: `<p>Checking only ${C('endsWith("Test")')} misses three Surefire patterns and all of Failsafe's, and returns early so it can never report "both".</p>`, code: `
class Brute {
    String runner(String className) {
        if (className.endsWith("Test")) return "surefire";
        if (className.endsWith("IT")) return "failsafe";
        return "none";
    }
}` },
    mcq: { q: 'Why does CI typically run <code>mvn verify</code> rather than <code>mvn integration-test</code>?', options: ['verify is faster', 'Failsafe fails the build in verify, after post-integration-test has cleaned up', 'integration-test skips unit tests', 'They are identical'], answer: 1, explain: 'Failsafe records failures during integration-test and only fails in verify, so post-integration-test (stop servers/containers) always runs.' },
    hints: [`<p>Hint 1: compute two booleans independently — matchesSurefire and matchesFailsafe.</p>`, `<p>Hint 2: use ${C('startsWith')} / ${C('endsWith')}; the checks are case-sensitive.</p>`, `<p>Hint 3: combine: both → "both", only one → its name, neither → "none".</p>`],
    tests: { sig: 'string -> string', fn: 'runner', cases: [
      [['OrderServiceTest'], 'surefire'],
      [['OrderRepositoryIT'], 'failsafe'],
      [['TestUtils'], 'surefire'],
      [['PaymentTests'], 'surefire'],
      [['LegacyTestCase'], 'surefire'],
      [['ITCheckout'], 'failsafe'],
      [['CheckoutITCase'], 'failsafe'],
      [['OrderService'], 'none'],
      [['ITTest'], 'both'],
      [['Contest'], 'none'],
      [['IT'], 'failsafe']
    ] },
    solution: {
      approach: `<p>Evaluate both pattern sets independently, then combine. Real projects avoid the "both"/helper surprises by naming helpers ${C('*Fixtures')} or ${C('*Support')}.</p>`,
      code: `
class Solution {
    String runner(String n) {
        boolean surefire = n.startsWith("Test") || n.endsWith("Test") || n.endsWith("Tests") || n.endsWith("TestCase");
        boolean failsafe = n.startsWith("IT") || n.endsWith("IT") || n.endsWith("ITCase");
        if (surefire && failsafe) return "both";
        if (surefire) return "surefire";
        return failsafe ? "failsafe" : "none";
    }
}`,
      complexity: `<p>O(n) for the prefix/suffix checks.</p>`
    }
  });

  /* ======================================================================
     PRACTICE ARENA — Medium
     ====================================================================== */
  practice.push({
    title: 'Compare Maven Versions (ComparableVersion, simplified)',
    level: 'Medium', tags: ['Maven', 'versions', 'comparator', 'parsing'], companies: ['Sonatype', 'JFrog', 'Google'],
    statement: `<p>Write ${C('int compare(String a, String b)')} returning -1, 0 or 1 using these rules (a simplified Maven ${C('ComparableVersion')}):</p>
<ol><li>Lower-case the version, split on ${C('.')} and ${C('-')}, then split each piece further where letters and digits meet (${C('rc1')} → ${C('rc')}, ${C('1')}).</li>
<li>Remove trailing items equal to the number 0 or to a release qualifier (${C('""')}, ${C('ga')}, ${C('final')}, ${C('release')}), repeatedly.</li>
<li>Compare item by item. A missing item counts as ${C('0')} when the other item is a number, and as ${C('""')} (release) when it is a qualifier.</li>
<li>Number vs number: numerically (they may exceed ${C('long')}). Number vs qualifier: the number is greater.</li>
<li>Qualifier order: ${C('alpha')} &lt; ${C('beta')} &lt; ${C('milestone')} &lt; ${C('rc')} = ${C('cr')} &lt; ${C('snapshot')} &lt; release (${C('""')}, ${C('ga')}, ${C('final')}, ${C('release')}) &lt; ${C('sp')} &lt; any other qualifier; other qualifiers compare alphabetically.</li></ol>`,
    constraints: `Versions up to 100 characters, non-empty.`,
    example: `<p>${C('1.0-SNAPSHOT')} vs ${C('1.0')} → ${H.c('g', '-1')} (snapshot comes before the release). ${C('2.0')} vs ${C('10.0')} → ${H.c('g', '-1')} (numeric, not text). ${C('1.0.0')} vs ${C('1')} → ${H.c('g', '0')}. ${C('1.0.1')} vs ${C('1.0-sp')} → ${H.c('g', '1')}.</p>`,
    brute: { why: `<p>${C('a.compareTo(b)')} compares text: ${C('"10.0" < "2.0"')} and ${C('"1.0" < "1.0-SNAPSHOT"')} — both wrong. Many real outages started with a string-sorted "latest version".</p>`, code: `
class Brute {
    int compare(String a, String b) {
        return Integer.signum(a.compareTo(b));     // lexicographic: "10.0" < "2.0"
    }
}` },
    mcq: { q: 'Which is the newest according to Maven ordering?', options: ['1.0-SNAPSHOT', '1.0-rc1', '1.0', '1.0-beta'], answer: 2, explain: 'Qualifiers sort beta < rc < snapshot < release. The plain release 1.0 is newest of these.' },
    hints: [`<p>Hint 1: turn each version into a list of items, each either a ${C('BigInteger')} or a qualifier string, then compare lists.</p>`, `<p>Hint 2: a rank function maps qualifiers to 0..7; only rank-7 ("unknown") qualifiers need alphabetical comparison.</p>`, `<p>Hint 3: pad the shorter list using the "missing item" rule; strip trailing zeros/release items first so ${C('1.0.0')} equals ${C('1')}.</p>`],
    tests: { sig: 'string string -> int', fn: 'compare', cases: [
      [['1.0-SNAPSHOT', '1.0'], -1],
      [['2.0', '10.0'], -1],
      [['1.0.0', '1'], 0],
      [['1.0-final', '1'], 0],
      [['1-beta', '1-alpha'], 1],
      [['1.0-RC1', '1.0-cr1'], 0],
      [['1.0-rc1', '1.0-rc2'], -1],
      [['1.0.1', '1.0-sp'], 1],
      [['1.0-foo', '1.0-sp'], 1],
      [['1.0-bar', '1.0-foo'], -1],
      [['1.12345678901234567890', '1.9'], 1],
      [['1.0-alpha', '1.0-milestone-1'], -1]
    ] },
    solution: {
      approach: `<p>Tokenise into typed items, normalise trailing "nothing" items, then compare pairwise with a rank table. ${C('BigInteger')} handles date-like or huge numeric segments.</p>`,
      code: `
class Solution {
    private static final Map<String, Integer> RANK = Map.of(
        "alpha", 0, "beta", 1, "milestone", 2, "rc", 3, "cr", 3, "snapshot", 4,
        "", 5, "ga", 5, "final", 5, "release", 5);

    int compare(String a, String b) {
        List<Object> x = items(a), y = items(b);
        for (int i = 0; i < Math.max(x.size(), y.size()); i++) {
            Object p = i < x.size() ? x.get(i) : null, q = i < y.size() ? y.get(i) : null;
            if (p == null) p = q instanceof BigInteger ? BigInteger.ZERO : "";
            if (q == null) q = p instanceof BigInteger ? BigInteger.ZERO : "";
            int c = compareItem(p, q);
            if (c != 0) return c;
        }
        return 0;
    }

    private List<Object> items(String v) {
        List<Object> out = new ArrayList<>();
        for (String piece : v.toLowerCase().split("[.-]")) {
            if (piece.isEmpty()) { out.add(""); continue; }
            int i = 0;
            while (i < piece.length()) {                       // split where letters meet digits
                int j = i;
                boolean digit = Character.isDigit(piece.charAt(i));
                while (j < piece.length() && Character.isDigit(piece.charAt(j)) == digit) j++;
                String t = piece.substring(i, j);
                out.add(digit ? new BigInteger(t) : t);
                i = j;
            }
        }
        while (!out.isEmpty()) {                               // 1.0.0 == 1, 1-final == 1
            Object last = out.get(out.size() - 1);
            if (BigInteger.ZERO.equals(last) || (last instanceof String s && RANK.getOrDefault(s, -1) == 5)) out.remove(out.size() - 1);
            else break;
        }
        return out;
    }

    private int compareItem(Object p, Object q) {
        if (p instanceof BigInteger m && q instanceof BigInteger n) return Integer.signum(m.compareTo(n));
        if (p instanceof BigInteger) return 1;                 // number beats qualifier
        if (q instanceof BigInteger) return -1;
        String s = (String) p, t = (String) q;
        int rs = RANK.getOrDefault(s, s.equals("sp") ? 6 : 7), rt = RANK.getOrDefault(t, t.equals("sp") ? 6 : 7);
        if (rs != rt) return rs < rt ? -1 : 1;
        return rs == 7 ? Integer.signum(s.compareTo(t)) : 0;
    }
}`,
      complexity: `<p>O(n) for tokenising and comparing versions of length n.</p>`,
      followUps: ['Why does Maven consider 1.0-SNAPSHOT older than 1.0?', 'How does Gradle order versions differently (e.g. "dev" and "rc")?']
    }
  });

  practice.push({
    title: 'Does a Version Satisfy a Maven Range?',
    level: 'Medium', tags: ['Maven', 'version ranges', 'parsing', 'intervals'], companies: ['JFrog', 'Red Hat', 'Uber'],
    statement: `<p>Write ${C('boolean inRange(String range, String version)')} for Maven range syntax with numeric dotted versions (compare numerically segment by segment; missing segments are 0, so ${C('1.5.0')} equals ${C('1.5')}).</p>
<ul><li>${C('[1.0,2.0)')} — ${C('[')} / ${C(']')} inclusive, ${C('(')} / ${C(')')} exclusive; an empty side is unbounded (${C('(,1.5]')}, ${C('[1.0,)')}).</li>
<li>${C('[1.2]')} — exactly 1.2.</li>
<li>Several sets separated by commas, e.g. ${C('(,1.0],[1.2,)')}, mean "any of them".</li></ul>`,
    constraints: `Range string ≤ 200 chars and always well-formed; versions have 1–6 numeric segments of up to 9 digits.`,
    example: `<p>${C('"(,1.0],[1.2,)"')}, ${C('"1.1"')} → ${H.c('r', 'false')} — 1.1 falls in the excluded gap (a typical way to skip a broken release). ${C('"[1.10,1.9]"')}, ${C('"1.9.5"')} → ${H.c('r', 'false')}: the range is empty because 1.10 &gt; 1.9 numerically.</p>`,
    brute: { why: `<p>Splitting the whole string on ${C(',')} breaks multi-set ranges (commas appear both inside and between sets), and comparing versions as strings gets ${C('1.10')} vs ${C('1.9')} wrong.</p>`, code: `
class Brute {
    boolean inRange(String range, String version) {
        String[] p = range.substring(1, range.length() - 1).split(",");   // breaks on multiple sets
        return p.length == 2 && version.compareTo(p[0]) >= 0 && version.compareTo(p[1]) < 0; // text compare
    }
}` },
    mcq: { q: 'Why do most teams avoid version ranges in production builds?', options: ['Maven does not support them', 'The resolved version can change when a new release is published, making builds non-reproducible', 'They are slower to download', 'They only work with SNAPSHOTs'], answer: 1, explain: 'A range is resolved against the repository at build time, so the same commit can build with different dependency versions on different days.' },
    hints: [`<p>Hint 1: first extract each set with a regex like ${C('[\\[(][^\\])]*[\\])]')}; then handle each set independently.</p>`, `<p>Hint 2: a set without a comma is an exact match; otherwise split into lower and upper bound, either may be empty.</p>`, `<p>Hint 3: write a numeric ${C('cmp(a, b)')} that pads missing segments with 0; check lower bound with ${C('>=')} or ${C('>')} depending on the bracket, upper with ${C('<=')} or ${C('<')}.</p>`],
    tests: { sig: 'string string -> bool', fn: 'inRange', cases: [
      [['[1.0,2.0)', '1.5'], true],
      [['[1.0,2.0)', '2.0'], false],
      [['[1.0,2.0)', '1.0'], true],
      [['(1.0,2.0)', '1.0'], false],
      [['(,1.5]', '1.5.0'], true],
      [['(,1.5]', '1.6'], false],
      [['[1.2]', '1.2'], true],
      [['[1.2]', '1.2.1'], false],
      [['[1.0,)', '99.1'], true],
      [['(,1.0],[1.2,)', '1.1'], false],
      [['(,1.0],[1.2,)', '1.3'], true],
      [['[1.10,1.9]', '1.9.5'], false]
    ] },
    solution: {
      approach: `<p>Regex out each bracketed set, evaluate it as an interval (or exact match), and return true if any set contains the version. Versions compare numerically per segment.</p>`,
      code: `
class Solution {
    private static final java.util.regex.Pattern SET = java.util.regex.Pattern.compile("[\\\\[(][^\\\\])]*[\\\\])]");

    boolean inRange(String range, String version) {
        java.util.regex.Matcher m = SET.matcher(range);
        while (m.find()) {
            String s = m.group();
            char lo = s.charAt(0), hi = s.charAt(s.length() - 1);
            String body = s.substring(1, s.length() - 1);
            int comma = body.indexOf(',');
            if (comma < 0) {                                         // [1.2] exact
                if (cmp(body, version) == 0) return true;
                continue;
            }
            String low = body.substring(0, comma).trim(), high = body.substring(comma + 1).trim();
            boolean ok = true;
            if (!low.isEmpty()) { int c = cmp(version, low); ok = lo == '[' ? c >= 0 : c > 0; }
            if (ok && !high.isEmpty()) { int c = cmp(version, high); ok = hi == ']' ? c <= 0 : c < 0; }
            if (ok) return true;
        }
        return false;
    }

    private int cmp(String a, String b) {
        String[] x = a.split("\\\\."), y = b.split("\\\\.");
        for (int i = 0; i < Math.max(x.length, y.length); i++) {
            long p = i < x.length ? Long.parseLong(x[i]) : 0, q = i < y.length ? Long.parseLong(y[i]) : 0;
            if (p != q) return p < q ? -1 : 1;
        }
        return 0;
    }
}`,
      complexity: `<p>O(r + s × v) for range length r, s sets and version length v.</p>`
    }
  });

  practice.push({
    title: 'Consecutive Stubbing: thenReturn(a, b) and thenThrow',
    level: 'Medium', tags: ['Mockito', 'stubbing', 'exceptions', 'design'], companies: ['Amazon', 'PayPal', 'Booking.com'],
    statement: `<p>Mockito's ${C('when(x.call()).thenReturn("a", "b")')} answers ${C('a')}, then ${C('b')}, then ${C('b')} forever: the <b>last answer repeats</b>. Build that behaviour: a class ${C('SequenceStub')} constructed with an answer list, whose ${C('String call()')} returns the next answer; an answer starting with ${C('!')} means "throw ${C('IllegalStateException')} with the rest as message". With no answers, ${C('call()')} returns ${C('null')} (Mockito's default for a String).</p>
<p>Write ${C('String[] simulate(String[] answers, int calls)')} that calls a new stub ${C('calls')} times and records each result as the value, ${C('"null"')} for null, or ${C('"threw:<message>"')}.</p>`,
    constraints: `0 ≤ answers ≤ 100, 0 ≤ calls ≤ 10<sup>4</sup>.`,
    example: `<p>${C('["!timeout", "ok"]')}, 4 calls → ${H.c('g', '[threw:timeout, ok, ok, ok]')} — exactly how you test "retry once after a timeout".</p>`,
    brute: { why: `<p>Indexing ${C('answers[i]')} directly fails with ${C('ArrayIndexOutOfBoundsException')} after the list runs out, and cycling with ${C('i % n')} is wrong too: Mockito repeats only the <b>last</b> answer, it does not wrap around.</p>`, code: `
class Brute {
    String[] simulate(String[] answers, int calls) {
        String[] out = new String[calls];
        for (int i = 0; i < calls; i++) out[i] = answers[i % answers.length];   // wraps (wrong), crashes when empty, never throws
        return out;
    }
}` },
    mcq: { q: '<code>when(m.next()).thenReturn(1, 2, 3)</code>. What does the 5th call return?', options: ['1', '3', '0', 'It throws'], answer: 1, explain: 'After the configured answers are used up, the last one keeps being returned.' },
    hints: [`<p>Hint 1: keep an index that stops advancing at the last answer: ${C('Math.min(i, n - 1)')}.</p>`, `<p>Hint 2: the stub throws; ${C('simulate')} is the "test" that catches and records it.</p>`, `<p>Hint 3: handle the empty list first (return null), then check the ${C('!')} prefix.</p>`],
    tests: { sig: 'string[] int -> string[]', fn: 'simulate', cases: [
      [[['!timeout', 'ok'], 4], ['threw:timeout', 'ok', 'ok', 'ok']],
      [[['a', 'b'], 3], ['a', 'b', 'b']],
      [[[], 2], ['null', 'null']],
      [[['x'], 0], []],
      [[['ok', '!down'], 3], ['ok', 'threw:down', 'threw:down']],
      [[['!'], 1], ['threw:']],
      [[['1', '2', '3'], 2], ['1', '2']],
      [[['v'], 10000], { $rep: 'v', n: 10000 }]
    ] },
    solution: {
      approach: `<p>A tiny stateful stub with a clamped index; the driver catches exceptions like a test would with ${C('assertThrows')}.</p>`,
      code: `
class SequenceStub {
    private final String[] answers;
    private int calls = 0;

    SequenceStub(String[] answers) { this.answers = answers; }

    String call() {
        if (answers.length == 0) return null;                              // unstubbed default
        String a = answers[Math.min(calls++, answers.length - 1)];         // last answer repeats
        if (a.startsWith("!")) throw new IllegalStateException(a.substring(1));
        return a;
    }
}

class Solution {
    String[] simulate(String[] answers, int calls) {
        SequenceStub stub = new SequenceStub(answers);
        String[] out = new String[calls];
        for (int i = 0; i < calls; i++) {
            try {
                String r = stub.call();
                out[i] = r == null ? "null" : r;
            } catch (IllegalStateException e) {
                out[i] = "threw:" + e.getMessage();
            }
        }
        return out;
    }
}`,
      complexity: `<p>O(calls) time, O(calls) output.</p>`
    }
  });

  practice.push({
    title: 'Argument Matchers: Which Stubbing Answers?',
    level: 'Medium', tags: ['Mockito', 'matchers', 'strings'], companies: ['Google', 'Spotify', 'Revolut'],
    statement: `<p>Each stubbing is ${C('"matcher=>value"')} (split at the <b>first</b> ${C('=>')}), in the order they were written. Matchers: ${C('any')} (matches everything, including null), ${C('anyString')} (any non-null string), ${C('isNull')}, ${C('eq:X')}, ${C('startsWith:X')}, ${C('contains:X')} (the last three never match null). The argument ${C('"<null>"')} stands for ${C('null')}.</p>
<p>Write ${C('String answer(String[] stubs, String arg)')}: like Mockito, the <b>most recently written</b> matching stubbing wins. Return ${C('"(null)"')} when nothing matches (an unstubbed call).</p>`,
    constraints: `0 ≤ stubs ≤ 1000.`,
    example: `<p>${C('["eq:vip=>B", "any=>A"]')}, ${C('"vip"')} → ${H.c('y', 'A')}: the later, more general ${C('any')} stubbing overrides the specific one — a common Mockito surprise. Swap the order and you get ${H.c('g', 'B')}.</p>`,
    brute: { why: `<p>Scanning from the first stubbing and returning the first match implements "first wins", which is the opposite of Mockito; and treating ${C('anyString')} like ${C('any')} hides the Mockito 2+ rule that ${C('anyString()')} does not match null.</p>`, code: `
class Brute {
    String answer(String[] stubs, String arg) {
        for (String s : stubs) {                                  // first wins: wrong order
            String m = s.substring(0, s.indexOf("=>"));
            if (m.equals("any") || m.equals("anyString") || m.equals("eq:" + arg)) return s.substring(s.indexOf("=>") + 2);
        }
        return "(null)";
    }
}` },
    mcq: { q: 'Mockito 5: <code>when(svc.find(anyString())).thenReturn(x)</code>, then the code calls <code>svc.find(null)</code>. Result?', options: ['x', 'null — anyString() does not match null', 'NullPointerException', 'UnnecessaryStubbingException is always thrown'], answer: 1, explain: 'Since Mockito 2, anyString() and the other typed any(Class) matchers reject null; use any() or isNull() to match null. (With strict stubs the mismatch is also reported as a potential stubbing problem.)' },
    hints: [`<p>Hint 1: iterate from the <b>last</b> stubbing to the first and return the first match.</p>`, `<p>Hint 2: split the matcher at the first ${C(':')} into a name and an operand; split the stubbing at the first ${C('=>')} so values may contain ${C('=>')}.</p>`, `<p>Hint 3: compute ${C('isNull = arg.equals("<null>")')} once; every matcher except ${C('any')} and ${C('isNull')} requires a non-null argument.</p>`],
    tests: { sig: 'string[] string -> string', fn: 'answer', cases: [
      [[['any=>A', 'eq:vip=>B'], 'vip'], 'B'],
      [[['eq:vip=>B', 'any=>A'], 'vip'], 'A'],
      [[['anyString=>S'], '<null>'], '(null)'],
      [[['any=>A'], '<null>'], 'A'],
      [[[], 'x'], '(null)'],
      [[['isNull=>N', 'startsWith:ord-=>O'], 'ord-7'], 'O'],
      [[['isNull=>N', 'startsWith:ord-=>O'], '<null>'], 'N'],
      [[['contains:@=>email', 'eq:x=>X'], 'a@b.c'], 'email'],
      [[['eq:a=>1=>2'], 'a'], '1=>2']
    ] },
    solution: {
      approach: `<p>Walk the stubbings backwards (latest wins), parse each matcher, and apply null-safety rules per matcher type.</p>`,
      code: `
class Solution {
    String answer(String[] stubs, String arg) {
        boolean isNull = arg.equals("<null>");
        for (int i = stubs.length - 1; i >= 0; i--) {             // most recent stubbing first
            int k = stubs[i].indexOf("=>");
            String matcher = stubs[i].substring(0, k), value = stubs[i].substring(k + 2);
            int c = matcher.indexOf(':');
            String name = c < 0 ? matcher : matcher.substring(0, c);
            String x = c < 0 ? "" : matcher.substring(c + 1);
            boolean ok = switch (name) {
                case "any" -> true;
                case "anyString" -> !isNull;
                case "isNull" -> isNull;
                case "eq" -> !isNull && arg.equals(x);
                case "startsWith" -> !isNull && arg.startsWith(x);
                case "contains" -> !isNull && arg.contains(x);
                default -> false;
            };
            if (ok) return value;
        }
        return "(null)";                                             // unstubbed: default answer
    }
}`,
      complexity: `<p>O(total length of the stubbings) in the worst case.</p>`
    }
  });

  practice.push({
    title: 'Select Tests by Tags (groups / excludedGroups)',
    level: 'Medium', tags: ['JUnit 5', '@Tag', 'filtering', 'sets'], companies: ['Netflix', 'Atlassian', 'Shopify'],
    statement: `<p>Each test is ${C('"name:tag1,tag2"')} (${C('"name:"')} has no tags). Write ${C('String[] select(String[] tests, String[] include, String[] exclude)')} returning the names that run, in order: a test runs if (${C('include')} is empty <b>or</b> it has at least one included tag) <b>and</b> it has no excluded tag. Exclusion always wins.</p>`,
    constraints: `0 ≤ tests ≤ 10<sup>4</sup>; each test has ≤ 10 tags.`,
    example: `<p>Tests ${C('fastSum:fast')}, ${C('dbSave:db,slow')}, ${C('apiCall:slow,net')}, ${C('plain:')}, ${C('parse:fast,parser')}; include ${C('[fast, db]')}, exclude ${C('[slow]')} → ${H.c('g', '[fastSum, parse]')}. ${C('dbSave')} is included by ${C('db')} but excluded by ${C('slow')}.</p>`,
    brute: { why: `<p>Checking each tag against each list with nested loops over arrays is O(t × (i + e)) per test, and it is easy to let an include short-circuit before the exclude check.</p>`, code: `
class Brute {
    String[] select(String[] tests, String[] include, String[] exclude) {
        List<String> out = new ArrayList<>();
        for (String t : tests) {
            String tags = t.substring(t.indexOf(':') + 1);
            boolean in = include.length == 0;
            for (String i : include) if (Arrays.asList(tags.split(",")).contains(i)) { in = true; }
            if (in) { out.add(t.substring(0, t.indexOf(':'))); continue; }   // bug: exclude never checked
        }
        return out.toArray(new String[0]);
    }
}` },
    mcq: { q: 'With Surefire <code>&lt;groups&gt;fast&lt;/groups&gt;</code> and <code>&lt;excludedGroups&gt;slow&lt;/excludedGroups&gt;</code>, does a test tagged both fast and slow run?', options: ['Yes, include wins', 'No, exclusion wins', 'It runs twice', 'Only on CI'], answer: 1, explain: 'A test must match the include filter and must not match any exclude filter. JUnit tag expressions like "fast &amp; !slow" say the same thing.' },
    hints: [`<p>Hint 1: put ${C('include')} and ${C('exclude')} into ${C('HashSet')}s for O(1) lookups.</p>`, `<p>Hint 2: for each test, compute ${C('anyIncluded')} and ${C('anyExcluded')} in one pass over its tags.</p>`, `<p>Hint 3: run iff ${C('(include.isEmpty() || anyIncluded) && !anyExcluded')}; ${C('"name:"')} has zero tags (check for an empty string before splitting).</p>`],
    tests: { sig: 'string[] string[] string[] -> string[]', fn: 'select', cases: [
      [[['fastSum:fast', 'dbSave:db,slow', 'apiCall:slow,net', 'plain:', 'parse:fast,parser'], [], []], ['fastSum', 'dbSave', 'apiCall', 'plain', 'parse']],
      [[['fastSum:fast', 'dbSave:db,slow', 'apiCall:slow,net', 'plain:', 'parse:fast,parser'], ['fast'], []], ['fastSum', 'parse']],
      [[['fastSum:fast', 'dbSave:db,slow', 'apiCall:slow,net', 'plain:', 'parse:fast,parser'], [], ['slow']], ['fastSum', 'plain', 'parse']],
      [[['fastSum:fast', 'dbSave:db,slow', 'apiCall:slow,net', 'plain:', 'parse:fast,parser'], ['fast', 'db'], ['slow']], ['fastSum', 'parse']],
      [[['fastSum:fast', 'dbSave:db,slow', 'apiCall:slow,net', 'plain:', 'parse:fast,parser'], ['nothing'], []], []],
      [[[], ['fast'], []], []],
      [[['fastSum:fast', 'dbSave:db,slow', 'apiCall:slow,net', 'plain:', 'parse:fast,parser'], [], ['fast', 'slow', 'net', 'db', 'parser']], ['plain']]
    ] },
    solution: {
      approach: `<p>Hash sets for the filters and one pass over each test's tags. This is exactly how Surefire/Gradle translate ${C('groups')} / ${C('includeTags')} and ${C('excludedGroups')} / ${C('excludeTags')} into a JUnit Platform tag filter.</p>`,
      code: `
class Solution {
    String[] select(String[] tests, String[] include, String[] exclude) {
        Set<String> inc = new HashSet<>(Arrays.asList(include)), exc = new HashSet<>(Arrays.asList(exclude));
        List<String> out = new ArrayList<>();
        for (String t : tests) {
            int c = t.indexOf(':');
            String tagPart = t.substring(c + 1);
            boolean anyIn = false, anyEx = false;
            if (!tagPart.isEmpty())
                for (String tag : tagPart.split(",")) {
                    if (inc.contains(tag)) anyIn = true;
                    if (exc.contains(tag)) anyEx = true;
                }
            if ((inc.isEmpty() || anyIn) && !anyEx) out.add(t.substring(0, c));   // exclusion wins
        }
        return out.toArray(new String[0]);
    }
}`,
      complexity: `<p>O(total tags + |include| + |exclude|).</p>`
    }
  });

  practice.push({
    title: 'Parse a @CsvSource Row',
    level: 'Medium', tags: ['JUnit 5', 'parameterized', 'parsing', 'state machine'], companies: ['JetBrains', 'Microsoft', 'Zoho'],
    statement: `<p>Write ${C('String[] parseRow(String row)')} using the ${C('@CsvSource')} conventions: fields are separated by commas outside quotes; the quote character is ${C("'")}. A quoted field keeps its text exactly (spaces included), and ${C("''")} inside quotes is one literal quote; spaces around a quoted field are ignored. An unquoted field is trimmed, and an empty unquoted field is ${C('null')}, returned as ${C('"<null>"')}. ${C("''")} on its own is the empty string.</p>`,
    constraints: `1 ≤ length ≤ 10<sup>4</sup>; quotes are balanced.`,
    example: `<p>${C("'lemon, lime', 0xF1")} → ${H.c('g', '["lemon, lime", "0xF1"]')}; ${C("a,,b")} → ${H.c('g', '["a", "&lt;null&gt;", "b"]')}; ${C("'it''s', ok")} → ${H.c('g', `["it's", "ok"]`)}.</p>`,
    brute: { why: `<p>${C('row.split(",")')} cuts ${C("'lemon, lime'")} into two fields, keeps the quotes, and drops a trailing empty field (${C('"a,".split(",")')} has length 1).</p>`, code: `
class Brute {
    String[] parseRow(String row) {
        String[] p = row.split(",");                   // ignores quotes, drops trailing empty field
        for (int i = 0; i < p.length; i++) p[i] = p[i].trim();
        return p;
    }
}` },
    mcq: { q: `In <code>@CsvSource({"apple, ", "'', 2"})</code>, what are the first arguments of the two rows?`, options: ['"apple" and null', '"apple" and ""', 'null and ""', '"apple " and "\'\'"'], answer: 1, explain: 'Unquoted values are trimmed ("apple"); a quoted empty value is the empty string. (The empty second field of row 1 would be null.)' },
    hints: [`<p>Hint 1: scan character by character with an index; a field starts after skipping spaces.</p>`, `<p>Hint 2: if the field starts with a quote, copy characters until a closing quote that is not doubled; then skip to the next comma.</p>`, `<p>Hint 3: otherwise read up to the next comma, trim, and map empty to ${C('"<null>"')}. After a field, a comma means another field follows — even at the end of the row.</p>`],
    tests: { sig: 'string -> string[]', fn: 'parseRow', cases: [
      [['apple, 1'], ['apple', '1']],
      [["'lemon, lime', 0xF1"], ['lemon, lime', '0xF1']],
      [["'', x"], ['', 'x']],
      [[' , x'], ['<null>', 'x']],
      [["'  spaced  '"], ['  spaced  ']],
      [["'it''s', ok"], ["it's", 'ok']],
      [['a,,b'], ['a', '<null>', 'b']],
      [['a,'], ['a', '<null>']],
      [['x'], ['x']],
      [['  New York  ,NY'], ['New York', 'NY']]
    ] },
    solution: {
      approach: `<p>A small hand-written state machine: one loop per field, two branches (quoted / unquoted). No regex can handle doubled quotes and empty-vs-null cleanly.</p>`,
      code: `
class Solution {
    String[] parseRow(String row) {
        List<String> fields = new ArrayList<>();
        int i = 0, n = row.length();
        while (true) {
            while (i < n && row.charAt(i) == ' ') i++;                 // leading spaces
            String value;
            if (i < n && row.charAt(i) == '\\'') {                     // quoted field
                StringBuilder sb = new StringBuilder();
                i++;
                while (i < n) {
                    char ch = row.charAt(i);
                    if (ch == '\\'') {
                        if (i + 1 < n && row.charAt(i + 1) == '\\'') { sb.append('\\''); i += 2; continue; }
                        i++;                                           // closing quote
                        break;
                    }
                    sb.append(ch);
                    i++;
                }
                value = sb.toString();
                while (i < n && row.charAt(i) != ',') i++;             // spaces after the quote
            } else {                                                   // unquoted field
                int start = i;
                while (i < n && row.charAt(i) != ',') i++;
                String s = row.substring(start, i).trim();
                value = s.isEmpty() ? "<null>" : s;
            }
            fields.add(value);
            if (i < n && row.charAt(i) == ',') { i++; continue; }      // another field follows
            break;
        }
        return fields.toArray(new String[0]);
    }
}`,
      complexity: `<p>O(n) time in a single pass over the row; O(n) for the output strings.</p>`
    }
  });

  /* ======================================================================
     PRACTICE ARENA — Hard
     ====================================================================== */
  practice.push({
    title: 'Incremental Build: EXECUTED or UP-TO-DATE?',
    level: 'Hard', tags: ['Gradle', 'incremental build', 'DAG', 'DFS'], companies: ['Gradle', 'Google', 'Meta'],
    statement: `<p>Same task format as the guided Gradle problem (${C('"task:dep1,dep2"')}). ${C('changed')} lists tasks whose own inputs changed (source files, properties). ${C('sameOutput')} lists tasks that, if they run, produce byte-identical output to last time (e.g. a comment-only change compiles to the same bytecode).</p>
<p>Write ${C('String[] incremental(String[] deps, String[] changed, String[] sameOutput, String[] requested)')}. Visit requested tasks with DFS post-order (dependencies first, in listed order, each task once). A task is ${C('EXECUTED')} if it is in ${C('changed')} or any dependency's <b>output changed</b>; otherwise ${C('UP-TO-DATE')}. A task's output changed if it executed and is not in ${C('sameOutput')}. Return ${C('"task:STATUS"')} in run order, or ${C('["CYCLE"]')}.</p>`,
    constraints: `≤ 10<sup>3</sup> tasks.`,
    example: `<p>Java graph, ${C('changed = [compileJava]')}, ${C('sameOutput = [compileJava]')}, request ${C('build')} → only ${H.c('y', 'compileJava:EXECUTED')}; every other task ${H.c('g', 'UP-TO-DATE')}, because Gradle fingerprints <b>outputs</b>, and identical class files do not invalidate ${C('jar')} or ${C('test')}.</p>`,
    brute: { why: `<p>"Rerun everything downstream of a changed task" (what a timestamp-based tool like old ${C('make')} effectively does) runs ${C('jar')}, ${C('test')} and more after a comment-only change. Correct but slow — and it ignores the output-fingerprint rule that makes Gradle fast.</p>`, code: `
class Brute {
    String[] incremental(String[] deps, String[] changed, String[] sameOutput, String[] requested) {
        Map<String, List<String>> g = new HashMap<>();
        for (String d : deps) { int c = d.indexOf(':'); String r = d.substring(c + 1); g.put(d.substring(0, c), r.isEmpty() ? List.of() : List.of(r.split(","))); }
        Set<String> dirty = new HashSet<>(Arrays.asList(changed));
        boolean grew = true;
        while (grew) {                                   // propagate dirtiness, ignoring sameOutput
            grew = false;
            for (var e : g.entrySet())
                if (!dirty.contains(e.getKey()) && e.getValue().stream().anyMatch(dirty::contains)) { dirty.add(e.getKey()); grew = true; }
        }
        return dirty.toArray(new String[0]);               // no order, no statuses
    }
}` },
    mcq: { q: 'A task declares no outputs. What can Gradle do with it?', options: ['Cache it forever', 'Never consider it UP-TO-DATE — it always runs', 'Skip it every time', 'Run it only once per day'], answer: 1, explain: 'Up-to-date checks compare input AND output fingerprints. With no declared outputs Gradle cannot know whether the work can be skipped, so it runs every time.' },
    hints: [`<p>Hint 1: the DFS from the guided problem already gives the order; compute the status when a task finishes (post-order), since all its dependencies are known by then.</p>`, `<p>Hint 2: keep a map ${C('outputChanged')}; ${C('executed = changed.contains(t) || any dep has outputChanged')}.</p>`, `<p>Hint 3: ${C('outputChanged[t] = executed && !sameOutput.contains(t)')}; keep the visiting/done states to detect cycles.</p>`],
    tests: { sig: 'string[] string[] string[] string[] -> string[]', fn: 'incremental', cases: [
      [[GRADLE_G, ['compileJava'], [], ['build']], ['compileJava:EXECUTED', 'processResources:UP-TO-DATE', 'classes:EXECUTED', 'jar:EXECUTED', 'assemble:EXECUTED', 'testClasses:EXECUTED', 'test:EXECUTED', 'check:EXECUTED', 'build:EXECUTED']],
      [[GRADLE_G, [], [], ['build']], ['compileJava:UP-TO-DATE', 'processResources:UP-TO-DATE', 'classes:UP-TO-DATE', 'jar:UP-TO-DATE', 'assemble:UP-TO-DATE', 'testClasses:UP-TO-DATE', 'test:UP-TO-DATE', 'check:UP-TO-DATE', 'build:UP-TO-DATE']],
      [[GRADLE_G, ['compileJava'], ['compileJava'], ['build']], ['compileJava:EXECUTED', 'processResources:UP-TO-DATE', 'classes:UP-TO-DATE', 'jar:UP-TO-DATE', 'assemble:UP-TO-DATE', 'testClasses:UP-TO-DATE', 'test:UP-TO-DATE', 'check:UP-TO-DATE', 'build:UP-TO-DATE']],
      [[GRADLE_G, ['testClasses'], [], ['build']], ['compileJava:UP-TO-DATE', 'processResources:UP-TO-DATE', 'classes:UP-TO-DATE', 'jar:UP-TO-DATE', 'assemble:UP-TO-DATE', 'testClasses:EXECUTED', 'test:EXECUTED', 'check:EXECUTED', 'build:EXECUTED']],
      [[GRADLE_G, ['processResources'], ['classes'], ['build']], ['compileJava:UP-TO-DATE', 'processResources:EXECUTED', 'classes:EXECUTED', 'jar:UP-TO-DATE', 'assemble:UP-TO-DATE', 'testClasses:UP-TO-DATE', 'test:UP-TO-DATE', 'check:UP-TO-DATE', 'build:UP-TO-DATE']],
      [[['a:b', 'b:a'], [], [], ['a']], ['CYCLE']],
      [[GRADLE_G, ['x'], [], ['jar']], ['compileJava:UP-TO-DATE', 'processResources:UP-TO-DATE', 'classes:UP-TO-DATE', 'jar:UP-TO-DATE']],
      [[GRADLE_G, ['compileJava'], ['classes'], ['test']], ['compileJava:EXECUTED', 'processResources:UP-TO-DATE', 'classes:EXECUTED', 'testClasses:UP-TO-DATE', 'test:UP-TO-DATE']]
    ] },
    solution: {
      approach: `<p>DFS post-order with three-colour cycle detection. At finish time, a task's status depends only on its own ${C('changed')} flag and its dependencies' ${C('outputChanged')} flags, which are already final.</p>`,
      code: `
class Solution {
    private Map<String, List<String>> graph;
    private Map<String, Integer> state;
    private Map<String, Boolean> outputChanged;
    private Set<String> changed, same;
    private List<String> result;
    private boolean cycle;

    String[] incremental(String[] deps, String[] changedTasks, String[] sameOutput, String[] requested) {
        graph = new HashMap<>();
        for (String d : deps) {
            int c = d.indexOf(':');
            String rest = d.substring(c + 1);
            graph.put(d.substring(0, c), rest.isEmpty() ? List.of() : Arrays.asList(rest.split(",")));
        }
        changed = new HashSet<>(Arrays.asList(changedTasks));
        same = new HashSet<>(Arrays.asList(sameOutput));
        state = new HashMap<>();
        outputChanged = new HashMap<>();
        result = new ArrayList<>();
        cycle = false;
        for (String r : requested) visit(r);
        return cycle ? new String[]{"CYCLE"} : result.toArray(new String[0]);
    }

    private void visit(String t) {
        if (cycle) return;
        Integer s = state.get(t);
        if (s != null) { if (s == 1) cycle = true; return; }
        state.put(t, 1);
        List<String> ds = graph.getOrDefault(t, List.of());
        for (String d : ds) visit(d);
        if (cycle) return;
        state.put(t, 2);
        boolean run = changed.contains(t);
        for (String d : ds) run |= outputChanged.getOrDefault(d, false);   // an input (= upstream output) changed
        outputChanged.put(t, run && !same.contains(t));                    // identical output stops the ripple
        result.add(t + ":" + (run ? "EXECUTED" : "UP-TO-DATE"));
    }
}`,
      complexity: `<p>O(V + E) time, O(V) space.</p>`,
      followUps: ['Add FROM-CACHE: an executed task whose input hash is in a cache map', 'Why does Gradle hash outputs rather than compare timestamps?']
    }
  });

  practice.push({
    title: 'Resolve a dependency:tree with Pruning and dependencyManagement',
    level: 'Hard', tags: ['Maven', 'BFS', 'trees', 'dependency mediation'], companies: ['Sonatype', 'Amazon', 'Morgan Stanley'],
    statement: `<p>${C('tree')} is a pre-order listing of the unresolved dependency tree, one node per line as ${C('"depth artifact:version"')} (depth 1 = direct dependency; a node's children follow it with depth + 1). ${C('managed')} holds ${C('dependencyManagement')} pins ${C('"artifact:version"')}.</p>
<p>Write ${C('String[] resolve(String[] tree, String[] managed)')} using Maven's semantics: process nodes breadth-first (level by level, left to right). The first time an artifact is met it <b>wins</b> (nearest, then first declared) and gets the managed version if there is one, else its own; its children are queued. A node whose artifact was already resolved <b>loses</b>, and its whole subtree is ignored. Return ${C('"artifact:version"')} sorted by artifact.</p>`,
    constraints: `≤ 10<sup>4</sup> lines, depth ≤ 50.`,
    example: `<p>Tree: lib-a → guava 20.0, commons 1.1; lib-b → guava 31.0 → failureaccess 1.0.2; lib-b → jackson 2.15; jackson 2.17 (direct). Result: ${H.c('g', 'commons:1.1, guava:20.0, jackson:2.17, lib-a:1.0, lib-b:2.0')}. ${H.c('r', 'failureaccess')} disappears: it was only reachable through the losing guava 31.0 — the reason upgrading one library can make a class vanish.</p>`,
    brute: { why: `<p>Taking each artifact's minimum depth over <b>all</b> lines ignores pruning: it would keep ${C('failureaccess')} (it is in the listing) even though its parent lost. Real Maven drops the loser's subtree.</p>`, code: `
class Brute {
    String[] resolve(String[] tree, String[] managed) {
        TreeMap<String, String> best = new TreeMap<>();
        Map<String, Integer> depth = new HashMap<>();
        for (String line : tree) {
            int sp = line.indexOf(' '), d = Integer.parseInt(line.substring(0, sp));
            String av = line.substring(sp + 1);
            int c = av.lastIndexOf(':');
            String a = av.substring(0, c);
            if (!depth.containsKey(a) || d < depth.get(a)) { depth.put(a, d); best.put(a, av.substring(c + 1)); }
        }
        List<String> r = new ArrayList<>();
        best.forEach((a, v) -> r.add(a + ":" + v));    // no pruning, managed versions ignored
        return r.toArray(new String[0]);
    }
}` },
    mcq: { q: 'dependencyManagement pins guava to 33.0, and guava only appears transitively. What happens?', options: ['Nothing — it only affects direct dependencies', 'Every guava node in the graph uses 33.0', 'guava is added as a direct dependency', 'The build fails'], answer: 1, explain: 'dependencyManagement controls the version wherever the artifact appears, but does not add it to the graph by itself.' },
    hints: [`<p>Hint 1: rebuild the tree from the pre-order lines with a stack: pop until the top has a smaller depth; that node is the parent.</p>`, `<p>Hint 2: BFS with a queue of nodes, starting from the depth-1 nodes in order. Use a ${C('TreeMap<String, String>')} of resolved artifacts.</p>`, `<p>Hint 3: when you dequeue a node whose artifact is already resolved, do <b>not</b> enqueue its children. Otherwise resolve it (managed version first) and enqueue its children in order.</p>`],
    tests: { sig: 'string[] string[] -> string[]', fn: 'resolve', cases: [
      [[['1 lib-a:1.0', '2 guava:20.0', '2 commons:1.1', '1 lib-b:2.0', '2 guava:31.0', '3 failureaccess:1.0.2', '2 jackson:2.15', '1 jackson:2.17'], []], ['commons:1.1', 'guava:20.0', 'jackson:2.17', 'lib-a:1.0', 'lib-b:2.0']],
      [[['1 lib-a:1.0', '2 guava:20.0', '2 commons:1.1', '1 lib-b:2.0', '2 guava:31.0', '3 failureaccess:1.0.2', '2 jackson:2.15', '1 jackson:2.17'], ['guava:33.0']], ['commons:1.1', 'guava:33.0', 'jackson:2.17', 'lib-a:1.0', 'lib-b:2.0']],
      [[['1 lib-a:1.0', '2 guava:20.0', '2 commons:1.1', '1 lib-b:2.0', '2 guava:31.0', '3 failureaccess:1.0.2', '2 jackson:2.15', '1 jackson:2.17', '1 lib-c:1.0', '2 x:1', '3 y:1', '4 failureaccess:1.0.1'], []], ['commons:1.1', 'failureaccess:1.0.1', 'guava:20.0', 'jackson:2.17', 'lib-a:1.0', 'lib-b:2.0', 'lib-c:1.0', 'x:1', 'y:1']],
      [[[], []], []],
      [[['1 a:1'], ['a:2', 'zzz:9']], ['a:2']],
      [[['1 p:1', '2 q:1', '3 r:1', '1 s:1', '2 r:2', '3 t:1'], []], ['p:1', 'q:1', 'r:2', 's:1', 't:1']],
      [[['1 lib-a:1.0', '2 guava:20.0', '2 commons:1.1', '1 lib-b:2.0', '2 guava:31.0', '3 failureaccess:1.0.2', '2 jackson:2.15', '1 jackson:2.17', '1 lib-c:1.0', '2 x:1', '3 y:1', '4 failureaccess:1.0.1'], ['failureaccess:1.0.2', 'x:2']], ['commons:1.1', 'failureaccess:1.0.2', 'guava:20.0', 'jackson:2.17', 'lib-a:1.0', 'lib-b:2.0', 'lib-c:1.0', 'x:2', 'y:1']]
    ] },
    solution: {
      approach: `<p>Rebuild the tree with a depth stack, then BFS. BFS order is exactly "nearest first, then declaration order", and skipping a loser's children implements Maven's pruning. Managed versions are applied at resolution time.</p>`,
      code: `
class Solution {
    static final class Node {
        final int depth; final String artifact, version;
        final List<Node> kids = new ArrayList<>();
        Node(int d, String a, String v) { depth = d; artifact = a; version = v; }
    }

    String[] resolve(String[] tree, String[] managed) {
        Map<String, String> pins = new HashMap<>();
        for (String m : managed) { int c = m.lastIndexOf(':'); pins.put(m.substring(0, c), m.substring(c + 1)); }

        List<Node> roots = new ArrayList<>();
        Deque<Node> stack = new ArrayDeque<>();
        for (String line : tree) {                                   // pre-order -> tree
            int sp = line.indexOf(' ');
            String av = line.substring(sp + 1);
            int c = av.lastIndexOf(':');
            Node n = new Node(Integer.parseInt(line.substring(0, sp)), av.substring(0, c), av.substring(c + 1));
            while (!stack.isEmpty() && stack.peek().depth >= n.depth) stack.pop();
            (stack.isEmpty() ? roots : stack.peek().kids).add(n);
            stack.push(n);
        }

        TreeMap<String, String> resolved = new TreeMap<>();
        Deque<Node> queue = new ArrayDeque<>(roots);
        while (!queue.isEmpty()) {                                   // BFS = nearest first
            Node n = queue.poll();
            if (resolved.containsKey(n.artifact)) continue;          // loser: prune its subtree
            resolved.put(n.artifact, pins.getOrDefault(n.artifact, n.version));
            queue.addAll(n.kids);
        }
        List<String> out = new ArrayList<>();
        resolved.forEach((a, v) -> out.add(a + ":" + v));
        return out.toArray(new String[0]);
    }
}`,
      complexity: `<p>O(n + k log k) for n lines and k resolved artifacts; O(n) space.</p>`,
      followUps: ['Add exclusions: "lib-b!guava" removes guava below lib-b', 'Print the conflict report Maven shows with -Dverbose']
    }
  });

  practice.push({
    title: 'Maven Reactor Order with -pl, -am and -amd',
    level: 'Hard', tags: ['Maven', 'multi-module', 'topological sort', 'graphs'], companies: ['LinkedIn', 'Salesforce', 'Adobe'],
    statement: `<p>${C('modules')} lists the reactor in POM declaration order as ${C('"name:dep1,dep2"')} (dependencies on other modules). Write ${C('String[] reactor(String[] modules, String[] selected, boolean alsoMake, boolean alsoMakeDependents)')}:</p>
<ul><li>Any unknown selected module → ${C('["ERROR:<name>"]')}. A cycle anywhere in the modules → ${C('["CYCLE"]')}.</li>
<li>Build set: all modules if ${C('selected')} is empty; otherwise the selected ones, plus (${C('-am')}) every module they transitively depend on, plus (${C('-amd')}) every module that transitively depends on a selected module.</li>
<li>Order: repeatedly take the <b>first module in declaration order</b> that is in the set, not yet built, and whose dependencies inside the set are all built.</li></ul>`,
    constraints: `≤ 500 modules.`,
    example: `<p>Modules ${C('core')}, ${C('payments→core')}, ${C('web→payments,auth')}, ${C('auth→core')}, ${C('admin→core')}, ${C('tools')}. Build all → ${H.c('g', '[core, payments, auth, web, admin, tools]')}: ${C('web')} is declared before ${C('auth')} but must wait for it. ${C('-pl payments -amd')} → ${H.c('g', '[payments, web]')}.</p>`,
    brute: { why: `<p>Building in declaration order fails as soon as a module is declared before one of its dependencies (${C('web')} before ${C('auth')}), and building everything ignores ${C('-pl')} — the whole point of the flags is to build a small slice of a 200-module repo.</p>`, code: `
class Brute {
    String[] reactor(String[] modules, String[] selected, boolean alsoMake, boolean alsoMakeDependents) {
        List<String> out = new ArrayList<>();
        for (String m : modules) out.add(m.substring(0, m.indexOf(':')));   // declaration order, all modules
        return out.toArray(new String[0]);
    }
}` },
    mcq: { q: '<code>mvn -pl core -amd install</code> — what is built?', options: ['Only core', 'core and everything that depends on it', 'core and everything it depends on', 'The whole reactor'], answer: 1, explain: '-amd (also-make-dependents) adds downstream modules: after changing core, rebuild and test everything that uses it.' },
    hints: [`<p>Hint 1: parse into a dependency map and also detect cycles on the whole graph with DFS colouring first.</p>`, `<p>Hint 2: ${C('-am')} is a DFS/BFS along dependency edges from the selected modules; ${C('-amd')} is the same along reversed edges.</p>`, `<p>Hint 3: for the order, loop: scan modules in declaration order, build the first ready one, restart the scan. O(n²) scans are fine for 500 modules (or use Kahn's algorithm with a priority queue on declaration index).</p>`],
    tests: { sig: 'string[] string[] bool bool -> string[]', fn: 'reactor', cases: [
      [[['core:', 'payments:core', 'web:payments,auth', 'auth:core', 'admin:core', 'tools:'], [], false, false], ['core', 'payments', 'auth', 'web', 'admin', 'tools']],
      [[['core:', 'payments:core', 'web:payments,auth', 'auth:core', 'admin:core', 'tools:'], ['payments'], true, false], ['core', 'payments']],
      [[['core:', 'payments:core', 'web:payments,auth', 'auth:core', 'admin:core', 'tools:'], ['payments'], false, true], ['payments', 'web']],
      [[['core:', 'payments:core', 'web:payments,auth', 'auth:core', 'admin:core', 'tools:'], ['core'], false, true], ['core', 'payments', 'auth', 'web', 'admin']],
      [[['core:', 'payments:core', 'web:payments,auth', 'auth:core', 'admin:core', 'tools:'], ['web'], true, false], ['core', 'payments', 'auth', 'web']],
      [[['core:', 'payments:core', 'web:payments,auth', 'auth:core', 'admin:core', 'tools:'], ['web'], false, false], ['web']],
      [[['core:', 'payments:core', 'web:payments,auth', 'auth:core', 'admin:core', 'tools:'], ['nope'], true, false], ['ERROR:nope']],
      [[['a:b', 'b:a', 'c:'], ['c'], false, false], ['CYCLE']],
      [[['core:', 'payments:core', 'web:payments,auth', 'auth:core', 'admin:core', 'tools:'], ['auth', 'tools'], true, false], ['core', 'auth', 'tools']],
      [[['core:', 'payments:core', 'web:payments,auth', 'auth:core', 'admin:core', 'tools:'], ['auth'], true, true], ['core', 'auth', 'web']]
    ] },
    solution: {
      approach: `<p>Validate, detect cycles, expand the selection along dependency edges (${C('-am')}) and reverse edges (${C('-amd')}), then repeatedly pick the first ready module in declaration order (a stable topological sort). Modules outside the set are assumed to come from the repository.</p>`,
      code: `
class Solution {
    private Map<String, List<String>> deps;
    private Map<String, Integer> color;

    String[] reactor(String[] modules, String[] selected, boolean alsoMake, boolean alsoMakeDependents) {
        List<String> names = new ArrayList<>();
        deps = new HashMap<>();
        for (String m : modules) {
            int c = m.indexOf(':');
            String rest = m.substring(c + 1);
            names.add(m.substring(0, c));
            deps.put(m.substring(0, c), rest.isEmpty() ? List.of() : Arrays.asList(rest.split(",")));
        }
        for (String s : selected) if (!deps.containsKey(s)) return new String[]{"ERROR:" + s};
        color = new HashMap<>();
        for (String n : names) if (hasCycle(n)) return new String[]{"CYCLE"};

        Set<String> set = new HashSet<>(selected.length == 0 ? names : Arrays.asList(selected));
        if (selected.length > 0 && alsoMake) {                          // upstream closure
            Deque<String> work = new ArrayDeque<>(Arrays.asList(selected));
            while (!work.isEmpty())
                for (String d : deps.get(work.pop())) if (deps.containsKey(d) && set.add(d)) work.push(d);
        }
        if (selected.length > 0 && alsoMakeDependents) {               // downstream closure
            Set<String> seen = new HashSet<>(Arrays.asList(selected));
            Deque<String> work = new ArrayDeque<>(Arrays.asList(selected));
            while (!work.isEmpty()) {
                String x = work.pop();
                for (String n : names)
                    if (deps.get(n).contains(x) && seen.add(n)) { set.add(n); work.push(n); }
            }
        }

        List<String> order = new ArrayList<>();
        Set<String> built = new HashSet<>();
        while (order.size() < set.size()) {
            for (String n : names) {                                     // first ready module wins
                if (!set.contains(n) || built.contains(n)) continue;
                boolean ready = true;
                for (String d : deps.get(n)) if (set.contains(d) && !built.contains(d)) { ready = false; break; }
                if (ready) { built.add(n); order.add(n); break; }
            }
        }
        return order.toArray(new String[0]);
    }

    private boolean hasCycle(String n) {
        Integer c = color.get(n);
        if (c != null) return c == 1;
        color.put(n, 1);
        for (String d : deps.getOrDefault(n, List.of())) if (hasCycle(d)) return true;
        color.put(n, 2);
        return false;
    }
}`,
      complexity: `<p>O(n² + n·E) with the simple rescanning loop for n modules (fine for a reactor); Kahn's algorithm with a priority queue on declaration index makes it O((n + E) log n).</p>`,
      followUps: ['What does -rf :web do after a failure?', 'How does -T 1C decide which modules can build in parallel?']
    }
  });

  /* ======================================================================
     QUIZ
     ====================================================================== */
  quiz.push(
    { q: `You run ${C('mvn package')}. Which phase does <b>not</b> run?`, options: ['compile', 'test', 'install', 'test-compile'], answer: 2, explain: `A phase runs all earlier phases of its lifecycle. install comes after package, so it does not run; test and test-compile come before package and do.` },
    { q: `Which dependency scope puts a library on the compile and test classpaths but keeps it <b>out of the packaged WAR</b>?`, options: ['compile', 'runtime', 'provided', 'test'], answer: 2, explain: `provided means "the container supplies it at runtime" — typical for the Servlet API. runtime is the opposite (not for compiling).` },
    { q: `Path 1: app → lib-a → guava 20 (lib-a declared first). Path 2: app → lib-b → guava 31. Which Guava does Maven choose by default?`, options: ['31, the highest', '20, first declaration at equal depth', 'Both', 'The build fails'], answer: 1, explain: `Maven's mediation is "nearest wins", and on equal depth "first declaration wins". It never compares version numbers unless you add the Enforcer upper-bound rule.` },
    { q: `Same graph built with Gradle. Which version is selected?`, options: ['20', '31', 'Both', 'Gradle asks interactively'], answer: 1, explain: `Gradle's default conflict resolution picks the highest requested version (unless a strict constraint or platform says otherwise).` },
    { q: `What does importing a BOM (${C('<type>pom</type><scope>import</scope>')}) actually do?`, options: ['Adds every library in the BOM to your classpath', 'Merges its dependencyManagement versions into yours, without adding dependencies', 'Downloads sources jars', 'Replaces your parent POM'], answer: 1, explain: `A BOM only supplies versions. You still declare the dependencies you use, without a version.` },
    { q: `In a Gradle ${C('java-library')}, module core declares Guava with ${C('implementation')}. Module web depends on core. Is Guava on web's <b>compile</b> classpath?`, options: ['Yes', 'No — only on web\'s runtime classpath', 'Only in tests', 'Only if web also declares it with api'], answer: 1, explain: `implementation dependencies are hidden from consumers at compile time but still shipped at runtime. That is why changing them does not force consumers to recompile.` },
    { q: `In JUnit 5's default lifecycle, why must ${C('@BeforeAll')} methods be static?`, options: ['For speed', 'Because no test instance exists yet — one instance is created per test method', 'Because JUnit uses reflection', 'They don\'t; that was JUnit 4 only'], answer: 1, explain: `Lifecycle.PER_METHOD creates a new instance for every test, so a once-per-class method cannot belong to any instance. With @TestInstance(PER_CLASS) it may be non-static.` },
    { q: `What is the difference between ${C('assumeTrue(false)')} and ${C('assertTrue(false)')} in a test?`, options: ['None', 'The assumption aborts (skips) the test; the assertion fails it', 'The assumption fails the whole class', 'assumeTrue only works in @BeforeAll'], answer: 1, explain: `Assumptions express preconditions about the environment; when they don't hold, the test is reported as aborted/skipped, not failed.` },
    { q: `AssertJ: actual list is [1, 2, 3]. Which assertion <b>fails</b>?`, options: [C('contains(3, 1)'), C('containsExactlyInAnyOrder(3, 2, 1)'), C('containsExactly(3, 2, 1)'), C('hasSize(3)')], answer: 2, explain: `containsExactly checks the elements and their order. The others ignore order (contains also allows a subset).` },
    { q: `${C('List<String> spy = spy(new ArrayList<>()); when(spy.get(0)).thenReturn("x");')} What happens?`, options: ['Works fine', 'IndexOutOfBoundsException — when() calls the real get(0) on the empty list', 'Returns null', 'Compilation error'], answer: 1, explain: `With spies, when(spy.method()) invokes the real method first. Use doReturn("x").when(spy).get(0) instead.` },
    { q: `${C('when(repo.find(eq("u1"), 5))')} throws InvalidUseOfMatchersException. Why?`, options: ['eq() is deprecated', 'Matchers were mixed with a raw value: all arguments must be matchers if one is', '5 must be a long', 'find must be stubbed with doReturn'], answer: 1, explain: `Write eq("u1"), eq(5) — or use raw values for both arguments. Matchers are recorded on a hidden stack and must line up with every parameter.` },
    { q: `Which double is a <b>working, simplified implementation</b> such as an in-memory repository?`, options: ['Dummy', 'Stub', 'Fake', 'Mock'], answer: 2, explain: `A fake really works (a HashMap-backed repository), just not suitable for production. Stubs return canned answers; mocks verify interactions.` },
    { q: `A Testcontainers ${C('@Container')} is declared as a non-static field. What is the effect?`, options: ['Same as static', 'A new container starts for every test method — slow', 'It never starts', 'It is shared across all test classes'], answer: 1, explain: `Instance fields follow the test instance lifecycle (one per test). Static fields start once per class; the singleton pattern shares one per JVM.` },
    { q: `${C('return a > 0 ? x : y;')} — tests only call it with a = 5. JaCoCo reports…`, options: ['Line 100%, branch 50%', 'Line 50%, branch 50%', 'Line 100%, branch 100%', 'Line 0%'], answer: 0, explain: `The line executed, so it counts as covered (shown yellow: partially covered). Only one of the two branch outcomes ran.` },
    { q: `A test suite has 95% line coverage but a mutation score of 40%. What does that most likely mean?`, options: ['The tests are excellent', 'Many tests execute code without asserting enough to catch changes', 'JaCoCo is misconfigured', 'Mutation testing is broken'], answer: 1, explain: `Coverage measures what ran; mutation score measures whether tests notice when the code is changed. Low mutation score = weak assertions.` }
  );

  /* ======================================================================
     INTERVIEW Q&A
     ====================================================================== */
  interview.push(
    { q: `Explain the Maven build lifecycle. What exactly happens when you run ${C('mvn clean install')}?`, level: 'B', a: `<p>Maven has three built-in lifecycles — <b>clean</b>, <b>default</b> and <b>site</b> — each an ordered list of phases. Invoking a phase runs every earlier phase of the same lifecycle. ${C('clean install')} first runs ${C('pre-clean, clean')} (deletes ${C('target/')}), then the default lifecycle from ${C('validate')} through ${C('compile, test-compile, test, package, integration-test, verify')} to ${C('install')}, which copies the artifact and POM into ${C('~/.m2/repository')} so other local projects can use it. Phases do nothing by themselves; plugin goals bound to them do the work (for jar packaging: compiler:compile, surefire:test, jar:jar, install:install). ${C('deploy')} (upload to Nexus/Artifactory) is not run.</p>`, followUps: ['Why is <code>mvn clean install</code> often unnecessary in CI? (verify is enough; install pollutes the local repo)', 'How do you run a single plugin goal?', 'How are goals bound for war packaging?'] },
    { q: `What are Maven dependency scopes, and when would you use provided vs runtime?`, level: 'B', a: `<p><b>compile</b> (default): everywhere and packaged. <b>provided</b>: needed to compile and test, but the runtime environment supplies it — Servlet/Jakarta EE APIs in an app server, Lombok (annotation processor). <b>runtime</b>: not needed to compile, needed to run — JDBC drivers, an SLF4J backend; it stops code from depending on implementation classes. <b>test</b>: JUnit, Mockito, AssertJ, Testcontainers — never shipped. <b>system</b> (deprecated style, a local jar path) and <b>import</b> (only for BOMs in dependencyManagement). Scopes also propagate: a compile dependency of your test dependency becomes test scope for you, and provided/test dependencies of your dependencies are not inherited.</p>`, followUps: ['What is the Gradle equivalent of provided?', 'Why is putting JUnit in compile scope harmful?'] },
    { q: `How does Maven resolve version conflicts between transitive dependencies, and how do you take control?`, level: 'I', a: `<p>Maven applies <b>nearest wins</b>: the version on the shortest path from your project is chosen; on a tie, the <b>first declared</b> wins. It does not choose the highest version, so a library can end up with an older version than it was compiled against → ${C('NoSuchMethodError')}/${C('NoClassDefFoundError')} at runtime. To diagnose: ${C('mvn dependency:tree -Dverbose')} shows "omitted for conflict with". To control: (1) pin the version in ${C('dependencyManagement')} (applies wherever it appears), ideally via a <b>BOM</b>; (2) declare it directly (depth 1 wins); (3) use ${C('<exclusions>')} to cut a path; (4) add the <b>Enforcer</b> plugin with ${C('dependencyConvergence')} or ${C('requireUpperBoundDeps')} so future conflicts fail the build instead of production.</p>`, followUps: ['How does Gradle differ (highest wins, strictly, failOnVersionConflict)?', 'When would you shade a dependency?', 'What happens to the children of a losing node?'] },
    { q: `What is a BOM and why do Spring Boot and Jackson publish one?`, level: 'I', a: `<p>A Bill of Materials is a ${C('pom')}-packaged artifact containing only ${C('<dependencyManagement>')}: a list of module versions that are tested to work together. Importing it (${C('scope import')} in Maven, ${C('platform()')} in Gradle) lets you declare ${C('jackson-databind')}, ${C('jackson-datatype-jsr310')}, etc. <b>without versions</b>, and guarantees they are aligned — mixing Jackson 2.15 core with 2.17 databind is a classic runtime failure. Spring Boot's ${C('spring-boot-dependencies')} BOM aligns hundreds of libraries; overriding one version means leaving the tested set, so do it deliberately (often for a CVE). Companies publish an internal platform BOM so all microservices upgrade together.</p>`, followUps: ['Parent POM vs BOM import: what is inherited by each?', 'How do you override one version from the Spring Boot BOM?'] },
    { q: `Maven vs Gradle: how do they differ, and how would you choose?`, level: 'I', a: `<p><b>Maven</b>: declarative XML, a fixed lifecycle, convention over configuration; every project looks the same, which is great for large organisations and onboarding; extending it means writing plugins. <b>Gradle</b>: a DAG of tasks configured with a Kotlin/Groovy DSL; flexible and fast thanks to <b>incremental builds</b>, the <b>build cache</b> (local and remote), the configuration cache and the daemon; it is the Android standard. Conflict resolution differs (nearest vs highest). Gradle separates ${C('api')}/${C('implementation')} so consumers see less. Choose Maven for simple, standard services and teams that value predictability; Gradle for large multi-module or polyglot builds where build time matters, or when custom build logic is needed. Either way: use the wrapper, pin versions, keep build logic out of ad-hoc scripts (convention plugins / parent POMs).</p>`, followUps: ['What makes a Gradle task cacheable?', 'How would you speed up a slow Maven build?'] },
    { q: `How do you structure and speed up a large multi-module build?`, level: 'A', a: `<p><b>Structure</b>: a parent POM (or Gradle convention plugins + a version catalog) for shared configuration and versions; a BOM for external libraries; modules with clear direction (api → core → adapters → app), no cycles; ${C('implementation')} over ${C('api')} to limit recompile ripples. <b>Speed</b>: build only what changed — Maven ${C('-pl X -am')} in PRs (or ${C('-amd')} to test dependents), Gradle's task graph does this automatically; parallel module builds (${C('mvn -T 1C')}, ${C('--parallel')}); remote build cache on CI so developers reuse outputs; fork tests in parallel; split slow integration tests into a separate stage; keep configuration cheap; use Build Scans/Develocity to find hot spots. Also avoid ${C('mvn clean')} by default — it throws away incremental state.</p>`, followUps: ['What does -rf do?', 'How do you detect a module cycle early?', 'When would you move to Bazel?'] },
    { q: `Describe the JUnit 5 architecture and test lifecycle. How does it differ from JUnit 4?`, level: 'B', a: `<p>JUnit 5 = <b>Platform</b> (launcher API used by IDEs and build tools), <b>Jupiter</b> (new annotations, assertions, extension model) and <b>Vintage</b> (runs JUnit 3/4 tests). Lifecycle: ${C('@BeforeAll')} once (static by default), then for each test a <b>new instance</b>, ${C('@BeforeEach')}, the ${C('@Test')}, ${C('@AfterEach')} (even on failure), and finally ${C('@AfterAll')}. ${C('@TestInstance(PER_CLASS)')} reuses one instance. Differences from JUnit 4: renamed annotations (${C('@Before')} → ${C('@BeforeEach')}, ${C('@Ignore')} → ${C('@Disabled')}), ${C('assertThrows')} instead of ${C('@Test(expected)')}, ${C('@ExtendWith')} (composable) instead of a single ${C('@RunWith')} plus ${C('@Rule')}, ${C('@Nested')}, ${C('@DisplayName')}, ${C('@Tag')}, built-in parameterized tests, Java 8+ lambdas (${C('assertAll')}), and test classes/methods no longer need to be public.</p>`, followUps: ['How does @Nested change the order of @BeforeEach calls?', 'Why might a test pass alone and fail in the suite?'] },
    { q: `When do you use parameterized tests, and which argument sources do you know?`, level: 'I', a: `<p>When several cases share the same arrange-act-assert shape and differ only in data — validation rules, calculators, parsers, mapping tables. Each row becomes its own invocation in the report, so one bad row is easy to spot. Sources: ${C('@ValueSource')} (single literal argument), ${C('@CsvSource')} / ${C('@CsvFileSource')} (tables; trimmed values, ${C("''")} = empty, empty = null), ${C('@MethodSource')} (a static factory returning ${C('Stream<Arguments>')} for objects), ${C('@EnumSource')}, ${C('@NullAndEmptySource')}, and custom ${C('@ArgumentsSource')}. I pick rows by <b>equivalence classes and boundaries</b> (49.99/50.00/50.01), give the test a ${C('name')} pattern, and avoid logic inside the test that switches on the row — if rows need different assertions, they are different tests.</p>`, followUps: ['How would you test 500 cases stored in a CSV?', 'What is property-based testing and when is it better?'] },
    { q: `Explain the different test doubles. When would you use a fake instead of a mock?`, level: 'I', a: `<p><b>Dummy</b>: fills a parameter, never used. <b>Stub</b>: returns canned answers (state verification). <b>Fake</b>: a working lightweight implementation (in-memory repository, fake clock). <b>Spy</b>: real object that records calls. <b>Mock</b>: records calls and is verified against expectations (behaviour verification). I prefer <b>fakes</b> for collaborators used by many tests with real behaviour (repositories, caches): tests read naturally ("save then find"), they survive refactoring, and a shared contract test keeps the fake and real implementation consistent. I use <b>mocks</b> at true boundaries where the interaction <i>is</i> the requirement — charge the card exactly once, publish an event, never email on failure — or to simulate failures (timeouts) that are hard to trigger otherwise.</p>`, followUps: ['What is the London vs Chicago school of TDD?', 'Why "don\'t mock types you don\'t own"?'] },
    { q: `Walk me through testing a service with Mockito: stubbing, verifying and capturing arguments.`, level: 'I', a: `<p>Annotate the class with ${C('@ExtendWith(MockitoExtension.class)')}; declare ${C('@Mock PaymentGateway gateway')}, ${C('@Mock Mailer mailer')} and ${C('@InjectMocks CheckoutService service')} (constructor injection). <b>Stub</b>: ${C('when(gateway.charge("u1", 500)).thenReturn(Receipt.ok("tx"))')}; consecutive answers with ${C('thenThrow(...).thenReturn(...)')} for retry logic; ${C('doThrow')} for void methods. <b>Act</b>: ${C('service.checkout("u1", 500)')}. <b>Verify</b>: ${C('verify(gateway, times(1)).charge("u1", 500)')}, ${C('verify(mailer, never()).send(any())')} on the failure path, ${C('inOrder')} when sequence matters. <b>Capture</b>: ${C('ArgumentCaptor<Email> c; verify(mailer).send(c.capture()); assertThat(c.getValue().body()).contains("tx")')}. Strict stubs flag unused stubbings, keeping tests minimal. Assert on the returned value first; verify only meaningful interactions.</p>`, followUps: ['What does UnnecessaryStubbingException mean?', 'How do you mock a static method, and should you?', 'Why can a later any() stubbing override an earlier specific one?'] },
    { q: `What is a Mockito spy, when is it useful, and what are its pitfalls?`, level: 'A', a: `<p>A spy wraps a real object: unstubbed methods run the real code, and all calls are recorded for verification. Useful for legacy code where you need to stub one expensive method of a class you cannot easily split, or to verify a call on a real collaborator. Pitfalls: ${C('when(spy.m())')} calls the real ${C('m()')} during stubbing (side effects, exceptions) — use ${C('doReturn(x).when(spy).m()')}; the spy is a <b>copy</b> of the original instance, so the original object does not see stubbing; self-calls inside the real object go through the spy only when the spy is the receiver; and heavy spying usually signals a class with too many responsibilities — refactoring (extract the expensive part behind an interface) is the better long-term fix.</p>`, followUps: ['spy vs partial mock with CALLS_REAL_METHODS', 'How would you refactor to avoid the spy?'] },
    { q: `Why use Testcontainers instead of H2 or mocks for repository tests? How do you keep these tests fast?`, level: 'I', a: `<p>H2 and mocks verify that your code agrees with <i>your assumptions</i>, not with PostgreSQL: dialect differences (${C('jsonb')}, ${C('ON CONFLICT')}, window functions), constraints, isolation levels, migrations and driver behaviour all differ. Testcontainers starts the same engine and version as production in Docker, gives a random port, waits until it is ready and cleans up (Ryuk). To keep it fast: <b>static</b> containers per class or the <b>singleton container</b> pattern per JVM; Spring Boot 3.1+ ${C('@ServiceConnection')} and context caching; reuse locally (${C('withReuse(true)')}); clean data per test with truncation instead of restarting; pin small images (${C('alpine')}); run them as ${C('*IT')} with Failsafe in ${C('mvn verify')}, possibly in a parallel CI stage.</p>`, followUps: ['How do you run Testcontainers in CI without Docker-in-Docker?', 'How do you isolate data between tests?'] },
    { q: `How does JaCoCo measure coverage, which metric would you gate on, and is 100% coverage a good goal?`, level: 'A', a: `<p>JaCoCo's Java agent (${C('prepare-agent')}, which sets Surefire's ${C('argLine')}) instruments bytecode on the fly with probes; after the run, ${C('jacoco.exec')} is turned into reports with counters for instructions, <b>branches</b>, lines, methods, classes and complexity. ${C('jacoco:check')} or Gradle's ${C('jacocoTestCoverageVerification')} fails the build below a threshold. I gate on <b>branch coverage of new/changed code</b> (e.g. 75–80%), because a line can be "covered" while one of its branches never ran, and global targets punish legacy code. 100% is not a good goal: it pushes people to test getters and write assertion-free tests, while coverage says nothing about assertion quality. Complement it with mutation testing (PIT) on critical modules and code review of the tests themselves.</p>`, followUps: ['Why might coverage suddenly drop to 0% after editing the Surefire config?', 'How do you aggregate coverage in a multi-module build?'] },
    { q: `Design the testing strategy and CI pipeline for a Spring Boot payment microservice.`, level: 'E', a: `<p><b>Pyramid</b>: fast unit tests for domain logic (fees, state machine, idempotency) with JUnit 5 + AssertJ, parameterized for rule tables, fakes for repositories, Mockito only at the gateway boundary (verify "charged exactly once", failure paths). <b>Slices/integration</b>: ${C('@DataJpaTest')} + Testcontainers PostgreSQL for repositories and Flyway migrations; WireMock for the payment provider (timeouts, 5xx, malformed JSON); Kafka via Testcontainers for event publishing; consumer-driven <b>contract tests</b> (Pact / Spring Cloud Contract) with callers. A few <b>end-to-end</b> smoke tests after deploy. <b>Pipeline</b>: ${C('mvn -B verify')} (Surefire then Failsafe), JaCoCo branch gate on changed code, PIT on the payments package, dependency checks (Enforcer convergence, OWASP/Dependabot), reproducible builds with the wrapper and pinned plugins, build cache, and flaky-test quarantine. Fail fast: unit stage in minutes, integration stage in parallel.</p>`, followUps: ['How would you test idempotency under concurrent retries?', 'Where do contract tests run, and who owns them?', 'What would you do with a flaky integration test?'] }
  );

  registerModule({
    id: 'java15',
    title: 'Build Tools & Testing: Maven, Gradle, JUnit 5 & Mockito',
    intro: `<p>Writing Java is half the job; <b>building and proving it works</b> is the other half — and it is what separates "it works on my machine" from production-ready code. This module covers the professional toolchain every Java team uses: <b>Maven</b> and <b>Gradle</b> (lifecycles, task graphs, dependency scopes, conflict resolution, BOMs and multi-module builds), <b>JUnit 5</b> (lifecycle, nested and parameterized tests, assertions with <b>AssertJ</b>), <b>Mockito</b> (mocks, stubs, spies, argument captors, verification) and the other test doubles, real-dependency integration tests with <b>Testcontainers</b>, and coverage with <b>JaCoCo</b>.</p>
<p>Each topic starts with an everyday analogy, animates the mechanism (watch a lifecycle run phase by phase, Maven pick the "nearest" Guava, Gradle walk its task graph, JUnit create test instances, a mock record calls, JaCoCo light up branches) and goes deep into production trade-offs. Build-tool and framework code is shown as reference (it needs Maven/Gradle and the libraries); every exercise is plain Java that you can run and test — you will implement the very rules these tools apply: lifecycle phases, nearest-wins mediation, task ordering, version comparison, soft assertions, argument matchers, in-order verification and coverage gates.</p>`,
    goals: [
      'Explain what <code>mvn clean install</code> and <code>./gradlew build</code> really run, choose correct dependency scopes / configurations, and read a POM or build.gradle.kts with confidence',
      'Diagnose dependency conflicts (nearest-wins vs highest-wins), fix them with dependencyManagement, BOMs, exclusions or constraints, and enforce convergence',
      'Structure multi-module builds (reactor, -pl/-am/-amd, convention plugins, version catalogs) and make them fast with incremental builds and caching',
      'Write clean JUnit 5 tests: lifecycle, @Nested, @ParameterizedTest sources, assertThrows/assertAll and fluent AssertJ assertions',
      'Use Mockito correctly — stubs, mocks, spies, argument captors, verification, strict stubs — and choose fakes over mocks where they age better',
      'Add Testcontainers integration tests and a JaCoCo branch-coverage gate, and explain why coverage is not test quality'
    ],
    prereqs: `Java 7 (Collections Framework in Practice) and Java 8 (Generics) — you will read generic signatures like ${C('ArgumentCaptor<Email>')} and use maps, sets and lists throughout. Comfortable writing classes, interfaces and lambdas. Installing Maven/Gradle, Docker or the test libraries is optional: every exercise is plain Java.`,
    hours: 14,
    topics: topics, practice: practice, quiz: quiz, interview: interview
  });
})();
