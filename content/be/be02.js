(function () {
var topics = [], practice = [], quiz = [], interview = [];

/* ============================================================
   TOPIC 1 — Project setup & your first endpoint
   ============================================================ */
topics.push({
  title: 'Project Setup & Your First Endpoint (Spring Boot and Express)',
  analogy: `<p>Opening a <b>restaurant</b>. First you rent a building and turn on the lights (that is the <b>server process</b> listening on a port). Then you hang a menu on the wall (the <b>routes</b>). Then you hire a waiter who reads each order slip and carries it to the right cook (the <b>framework</b>: Spring MVC or Express). Setting up a project is just "rent the building, hang the menu, hire the waiter". Your first endpoint is the first dish on the menu: <i>"GET /hello → say hi"</i>.</p>`,
  explain: `<p>A <b>REST API</b> is a program that waits for HTTP requests and answers with data (usually JSON). A <b>framework</b> does the boring parts for you: opening the network port, parsing the raw HTTP text, finding the right function for each URL, and turning your return value into a response. You only write the function that says <i>what</i> to answer.</p>
  <p>We build the same API twice, side by side, so you see that the ideas are identical and only the spelling changes:</p>
  ${H.table(['Idea', 'Spring Boot (Java)', 'Express (Node.js)'], [
    ['Create the project', 'start.spring.io (Initializr) or <code>curl</code> it', '<code>npm init -y</code> then <code>npm i express</code>'],
    ['Entry point', '<code>@SpringBootApplication</code> class with <code>main</code>', '<code>app.js</code> that creates <code>express()</code>'],
    ['Default port', '<b>8080</b> (change: <code>server.port</code>)', 'whatever you pass to <code>listen()</code> - we use <b>3000</b>'],
    ['"This function handles GET /hello"', '<code>@GetMapping("/hello")</code> on a method', '<code>app.get("/hello", handler)</code>'],
    ['Return JSON', 'return an object/record - Jackson converts it', '<code>res.json(obj)</code>'],
    ['Build/run', '<code>./mvnw spring-boot:run</code>', '<code>node --watch app.js</code>'],
    ['Config file', '<code>application.yml</code>', '<code>.env</code> / <code>process.env</code>']
  ])}
  <p><b>The 5 steps of every first API:</b> (1) generate the project, (2) add the "web" dependency, (3) write one function and map it to a method + path, (4) start it, (5) call it with <code>curl</code> and look at the status code, headers and body. If step 5 shows <code>200</code> and the JSON you expected, you have a working backend.</p>
  <p><b>Folder layout you will end up with</b> (we grow it topic by topic):</p>
  <pre>spring-books/                         express-books/
  src/main/java/com/example/books/      src/
    BooksApplication.java                 app.js          (create app, mount routes)
    web/BookController.java               routes/books.js (controller)
    service/BookService.java              services/bookService.js
    repo/BookRepository.java              repos/bookRepo.js
  src/main/resources/application.yml    package.json</pre>
  <p><b>Everyday English for the jargon:</b> <b>endpoint</b> = one URL + method pair you can call. <b>Handler</b> = the function that runs for it. <b>Dependency</b> = a library your project downloads. <b>Port</b> = the numbered door on your computer that the server listens at.</p>`,
  clues: [
    '"Build a simple REST API / CRUD API for X" - the first backend take-home or machine-coding round',
    '"Expose an endpoint that returns JSON" - you need a controller/route + JSON serialisation',
    '"Spring Boot app does not start: port 8080 already in use" - one port, one process',
    '"Works on my machine but not in Docker" - the server bound to <code>localhost</code> instead of <code>0.0.0.0</code>, or the port is hardcoded',
    '"Should we use Spring Boot or Node here?" - team skills, CPU-heavy vs I/O-heavy, ecosystem; both are fine for CRUD'
  ],
  code: [
    { lang: 'bash', title: 'Step 1 - generate each project from the terminal', check: false, code: `# --- Spring Boot: ask start.spring.io for a zip with the web + validation starters ---
curl https://start.spring.io/starter.zip \\
  -d type=maven-project -d language=java -d javaVersion=21 \\
  -d groupId=com.example -d artifactId=books -d name=books \\
  -d dependencies=web,validation \\
  -o books.zip
unzip books.zip -d spring-books && cd spring-books
./mvnw spring-boot:run          # starts embedded Tomcat on http://localhost:8080

# --- Express: a folder, a package.json, one dependency ---
mkdir express-books && cd express-books
npm init -y
npm install express             # Express 5 is the default "latest" now
npm pkg set type=module         # lets us use import/export instead of require()
node --watch app.js             # restarts automatically when you save` },
    { lang: 'java', title: 'Spring Boot - the smallest API (2 tiny classes)', check: false, code: `package com.example.books;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@SpringBootApplication            // = "this is the app; scan this package for components"
public class BooksApplication {
    public static void main(String[] args) {
        SpringApplication.run(BooksApplication.class, args);   // start Tomcat on port 8080
    }
}

@RestController                   // = controller whose return values become the response BODY
class HelloController {

    @GetMapping("/hello")         // GET /hello  or  GET /hello?name=Asha
    public Map<String, String> hello(@RequestParam(defaultValue = "world") String name) {
        // A Map becomes JSON automatically: {"message":"Hello, Asha!"}
        return Map.of("message", "Hello, " + name + "!");
    }
}` },
    { lang: 'js', title: 'Express - the same API (one file)', check: false, code: `import express from 'express';

const app = express();                       // the "waiter" object
const PORT = process.env.PORT || 3000;       // never hardcode; let the environment choose

// GET /hello  or  GET /hello?name=Asha
app.get('/hello', (req, res) => {
  const name = req.query.name || 'world';    // query string -> req.query
  res.json({ message: 'Hello, ' + name + '!' });   // sets Content-Type: application/json and status 200
});

app.listen(PORT, () => console.log('Listening on http://localhost:' + PORT));` }
  ],
  codeTitle: ['Project setup', 'Spring Boot: first endpoint', 'Express: first endpoint'],
  viz: {
    title: 'Journey of one request: client -> router -> controller -> service -> repository',
    input: 'GET /api/books/2',
    inputLabel: 'Request line (METHOD /path). Try POST /api/books, DELETE /api/books/1, GET /nope',
    gen: function (input) {
      var m = String(input).trim().match(/^(GET|POST|PUT|DELETE)\s+(\/\S*)$/i);
      if (!m) throw new Error('Type a request like: GET /api/books/2');
      var method = m[1].toUpperCase(), path = m[2];
      var one = /^\/api\/books\/(\d+)$/.exec(path), all = path === '/api/books';
      var ctl = null, svc = null, rep = null, status = '404 Not Found', note = '';
      if (all && method === 'GET') { ctl = 'listBooks()'; svc = 'findAll()'; rep = 'store.values()'; status = '200 OK'; note = 'a JSON array of all books'; }
      else if (all && method === 'POST') { ctl = 'createBook(body)'; svc = 'create(request)'; rep = 'store.put(newId, book)'; status = '201 Created'; note = 'the new book + Location header'; }
      else if (one && method === 'GET') { ctl = 'getBook(id=' + one[1] + ')'; svc = 'findById(' + one[1] + ')'; rep = 'store.get(' + one[1] + ')'; status = one[1] === '9' ? '404 Not Found' : '200 OK'; note = one[1] === '9' ? 'an error body (no such book)' : 'the book as JSON'; }
      else if (one && method === 'PUT') { ctl = 'updateBook(id=' + one[1] + ', body)'; svc = 'update(' + one[1] + ', request)'; rep = 'store.put(' + one[1] + ', book)'; status = '200 OK'; note = 'the updated book'; }
      else if (one && method === 'DELETE') { ctl = 'deleteBook(id=' + one[1] + ')'; svc = 'delete(' + one[1] + ')'; rep = 'store.remove(' + one[1] + ')'; status = '204 No Content'; note = 'nothing (empty body)'; }
      else if (all || one) { status = '405 Method Not Allowed'; note = 'path exists but not for this method'; }
      function g(hl, ehl, tags) {
        return { type: 'graph', directed: true, height: 62, label: 'Layers of the backend',
          nodes: [
            { id: 'C', label: 'Client (curl)', x: 12, y: 12, shape: 'box', w: 17 },
            { id: 'R', label: 'Router', x: 42, y: 12, shape: 'box', w: 17 },
            { id: 'K', label: 'Controller', x: 75, y: 12, shape: 'box', w: 17 },
            { id: 'D', label: 'In-memory Map', x: 12, y: 48, shape: 'box', w: 19 },
            { id: 'P', label: 'Repository', x: 42, y: 48, shape: 'box', w: 17 },
            { id: 'S', label: 'Service', x: 75, y: 48, shape: 'box', w: 17 }
          ],
          edges: [['C', 'R', 'HTTP'], ['R', 'K', 'match'], ['K', 'S', 'call'], ['S', 'P', 'call'], ['P', 'D', 'read/write']],
          hl: hl || {}, ehl: ehl || {}, tags: tags || {} };
      }
      var reqVars = { method: method, path: path };
      var frames = [];
      frames.push({ narr: 'You type <code>curl -X ' + method + ' localhost:8080' + path + '</code>. The request is just <b>text</b> sent over the network. Nothing has reached our code yet.', parts: [g({ C: 'cur' }, {}, { C: 'sends' }), { type: 'vars', label: 'The request line', vals: reqVars }] });
      frames.push({ narr: 'The web server (Tomcat / Node) accepted the connection and handed the parsed request to the <b>router</b>. The router owns the <b>route table</b>: "which handler matches this method + path?"', parts: [g({ C: 'done', R: 'cur' }, { 'C-R': 'ok' }, { R: 'looking...' }), { type: 'vars', label: 'The request line', vals: reqVars }] });
      if (!ctl) {
        frames.push({ narr: 'No route matches. The router answers by itself - <b>our controller never runs</b>: <span class="c-r">' + status + '</span> (' + note + ').', parts: [g({ C: 'done', R: 'bad' }, { 'C-R': 'ok' }, { R: status.slice(0, 3) }), { type: 'vars', label: 'Response', vals: { status: status, body: '{"error":"..."}' }, hl: { status: 'bad' } }] });
        frames.push({ narr: 'The client prints the error. Lesson: a typo in the path or method gives 404/405 <b>before</b> any of your code runs - check the route table first.', parts: [g({ C: 'bad', R: 'done' }, {}, { C: status.slice(0, 3) })] });
        return frames;
      }
      frames.push({ narr: 'Route matched! The router calls the controller method <code>' + ctl + '</code>. The controller only deals with HTTP: read path/body, pick the status code.', parts: [g({ R: 'done', K: 'cur' }, { 'R-K': 'ok' }, { K: ctl }), { type: 'vars', label: 'Request line', vals: reqVars, hl: { path: 'ok' } }] });
      frames.push({ narr: 'The controller does <b>no thinking</b>. It passes plain values to the service: <code>' + svc + '</code>. The service owns the business rules (is the title valid? does the book exist?).', parts: [g({ K: 'done', S: 'cur' }, { 'K-S': 'ok' }, { S: svc })] });
      frames.push({ narr: 'The service asks the repository to touch the data: <code>' + rep + '</code>. The repository is the only class that knows <i>where</i> data lives (a Map now, a database in the next module).', parts: [g({ S: 'done', P: 'cur', D: 'win' }, { 'S-P': 'ok', 'P-D': 'ok' }, { P: rep })] });
      frames.push({ narr: 'The answer walks back up the same road: repository -> service -> controller. The controller picks the status: <b>' + status + '</b> and the framework serialises ' + note + ' into the body.', parts: [g({ D: 'done', P: 'done', S: 'done', K: 'sel', R: 'sel' }, {}, { K: status.slice(0, 3), R: 'writes response' }), { type: 'vars', label: 'Response', vals: { status: status, body: note }, hl: { status: status.charAt(0) === '2' ? 'ok' : 'bad' } }] });
      frames.push({ narr: 'Back at the client: curl prints the status and the body. One request, one trip through four small classes - each with <b>one job</b>. That is the layered architecture you will build in this module.', parts: [g({ C: 'sel' }, {}, { C: status.slice(0, 3) })] });
      return frames;
    }
  },
  examples: [
    { title: 'Run it and call it (both stacks)', html: `<p>Start either server, then in another terminal:</p>${H.table(['Command', 'Expected'], [['<code>curl -i localhost:8080/hello</code> (Spring)', '<code>200</code> + <code>{"message":"Hello, world!"}</code>'], ['<code>curl -i "localhost:3000/hello?name=Asha"</code> (Express)', '<code>200</code> + <code>{"message":"Hello, Asha!"}</code>'], ['<code>curl -i localhost:3000/nope</code>', '<code>404</code> - no route matched']])}<p>The <code>-i</code> flag shows the status line and headers; always look at them, not just the body.</p>`,
      code: { lang: 'bash', check: false, code: `curl -i localhost:8080/hello
curl -i "localhost:3000/hello?name=Asha"
curl -i localhost:3000/nope` } },
    { title: 'What the raw HTTP exchange really looks like', html: `<p>Frameworks hide this text, but it is all that travels over the wire. Reading it removes the magic: the <b>request line</b> has the method and path, then headers, a blank line, then the (optional) body.</p>`,
      code: { lang: 'http', code: `GET /hello?name=Asha HTTP/1.1
Host: localhost:3000
Accept: application/json

HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Content-Length: 31

{"message":"Hello, Asha!"}` } },
    { title: 'Changing the port the clean way', html: `<p>Hardcoding a port is a bug waiting for deployment day (cloud platforms inject the port). Read it from configuration, with a sensible default for your laptop. In Spring that is a property; in Node an environment variable.</p>`,
      code: [{ lang: 'yaml', code: `# src/main/resources/application.yml
server:
  port: 8081          # override at run time: SERVER_PORT=9000 ./mvnw spring-boot:run` }, { lang: 'bash', check: false, code: `PORT=4000 node app.js      # Express reads process.env.PORT` }] },
    { title: 'Common first-day errors', html: `${H.table(['Symptom', 'Likely cause', 'Fix'], [['<code>Port 8080 was already in use</code>', 'an old server still running', 'stop it, or change the port'], ['<code>404</code> on a URL you "defined"', 'controller class not in a scanned package / route not mounted', 'keep controllers under the main class package; check <code>app.use</code>'], ['<code>Cannot find module \'express\'</code>', 'forgot <code>npm install</code>', 'run it in the project folder'], ['browser downloads / shows blank JSON', 'returned a string not an object', 'return an object / use <code>res.json</code>']])}` }
  ],
  deepDive: `<p><b>What <code>@SpringBootApplication</code> really is.</b> It is three annotations in one: <code>@Configuration</code> (this class can define beans), <code>@EnableAutoConfiguration</code> (look at the jars on the classpath and configure sensible defaults - web starter present means "start Tomcat + Spring MVC + Jackson"), and <code>@ComponentScan</code> (find <code>@RestController</code>, <code>@Service</code>, ... in this package <i>and below</i>). That last bit explains the classic "404 on my controller": a controller in a sibling package is never scanned. We go deep on this in the Spring Boot Deep Dive module.</p>
  <p><b>Embedded server.</b> Old Java apps were WAR files deployed into a separately installed Tomcat. Spring Boot flips it: your app is a normal <code>main</code> that starts Tomcat <i>inside</i> itself, and you ship one "fat jar" (<code>java -jar books.jar</code>). That makes containers trivial. Node works the same way - your script <i>is</i> the server.</p>
  <p><b>Threading difference you should know early.</b> Tomcat uses a pool of threads (default about 200): each request occupies one thread until it finishes, so blocking calls are fine and CPU work scales across cores. Node runs your JavaScript on <b>one thread</b> with an event loop: waiting on the network is free, but a long CPU loop blocks every other request. Both are fine for CRUD; the difference matters under load (see the Node and Performance modules).</p>
  <p><b>Express 5.</b> Express 5 is now the default on npm. The change that matters most to you: a rejected promise or thrown error inside an <code>async</code> handler is passed to the error handler automatically (in Express 4 you had to wrap or call <code>next(err)</code> yourself). Path syntax is also stricter (wildcards must be named, e.g. <code>/*splat</code>).</p>
  <p><b>Production reality.</b> Bind to <code>0.0.0.0</code> inside containers (binding to <code>127.0.0.1</code> makes the port unreachable from outside the container); expose a <code>/health</code> endpoint for load balancers; handle <code>SIGTERM</code> so in-flight requests finish before shutdown (<code>server.shutdown=graceful</code> in Spring, <code>server.close()</code> in Node); never commit <code>.env</code> or real keys - use placeholders like <code>DB_PASSWORD=&lt;set-in-secret-manager&gt;</code>.</p>`,
  aiEra: `<p><b>What AI changes:</b> an assistant can scaffold a whole Spring or Express project in seconds - controllers, pom/package.json, even a Dockerfile. The typing is no longer the skill; <i>knowing what the scaffold must contain</i> is.</p>
  <p><b>Use AI as a partner:</b> <code>Generate a Spring Boot 3 + Java 21 skeleton with web and validation only. Then explain every file it created, one line each.</code> Then delete anything you cannot explain. Ask it: <code>What would break if my controller lived outside the main class package?</code></p>
  <p><b>Where AI goes wrong:</b> it mixes versions (<code>javax.validation</code> from old Spring vs <code>jakarta.validation</code> in Spring Boot 3+), invents annotations, adds ten dependencies you do not need (Lombok, Security) which then change behaviour (Spring Security locks every endpoint with a 401!), or writes Express 4 patterns in an Express 5 project. It also loves to put sample passwords into config files - replace them with placeholders and environment variables.</p>
  <p><b>What you must still own:</b> run the app, call it with <code>curl -i</code>, and read the status line. Never paste real credentials or production URLs into a prompt.</p>`,
  problems: [{
    title: 'Add a Health Endpoint to Both Servers', level: 'Easy', tags: ['setup', 'routing', 'json'], lang: 'java',
    statement: `<p>Load balancers and Kubernetes ask your service "are you alive?" every few seconds. Add <code>GET /health</code> to <b>both</b> the Spring Boot and the Express app. It must return HTTP <code>200</code> with JSON <code>{"status":"UP"}</code> and the current server time in ISO format under <code>time</code>. Show the curl command that proves it.</p>`,
    constraints: `Method GET only. No authentication. Response must be JSON with <code>Content-Type: application/json</code>. Must answer in well under 100 ms and never touch a database.`,
    example: `<p>Request: <code>curl -i localhost:8080/health</code></p>${H.table(['Part', 'Value'], [['Status', '<span class="c-g">200 OK</span>'], ['Content-Type', 'application/json'], ['Body', '<code>{"status":"UP","time":"2026-10-15T09:30:00Z"}</code>']])}<p>Why: the status code tells machines "healthy" even if they never read the body; the body is for humans.</p>`,
    brute: { why: `<p>A beginner returns a plain string <code>"UP"</code> with no JSON, or reuses a business endpoint (like <code>GET /api/books</code>) as the health check. That endpoint hits the database, so a slow DB makes the whole service look dead and gets it restarted in a loop. A health endpoint should be cheap and separate.</p>` },
    mcq: { q: 'Why should /health avoid calling the database in a basic liveness check?', options: ['A slow database would make the process look dead and trigger needless restarts', 'JSON cannot contain database rows', 'GET endpoints cannot use databases'], answer: 0, explain: 'Liveness answers "is the process running?". Dependency checks belong in a separate readiness check.' },
    hints: [
      `<p>Hint 1: a health check is just an ordinary GET route that returns a tiny fixed object. No special framework magic needed.</p>`,
      `<p>Hint 2: Spring - a method with <code>@GetMapping("/health")</code> returning a <code>Map</code> or record. Express - <code>app.get("/health", ...)</code> calling <code>res.json</code>.</p>`,
      `<p>Hint 3: get the time with <code>Instant.now().toString()</code> in Java and <code>new Date().toISOString()</code> in JS. Test with <code>curl -i</code> and check status <code>200</code> and the JSON content type.</p>`
    ],
    solution: {
      approach: `<p>Add one cheap route to each app that returns a constant status plus the current time. Use ISO-8601 UTC (<code>Instant.now()</code> / <code>toISOString()</code>) because it sorts and parses everywhere. Return an object so the framework sets the JSON content type for you. Keep it free of database calls; later add <code>/ready</code> for dependency checks, or use Spring Boot Actuator (<code>/actuator/health</code>) which does this properly in production.</p>`,
      code: { lang: 'java', check: false, code: `@RestController
class HealthController {
    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "UP", "time", java.time.Instant.now().toString());
    }
}` },
      alt: [{ lang: 'js', check: false, code: `app.get('/health', (req, res) => {
  res.json({ status: 'UP', time: new Date().toISOString() });
});` }],
      complexity: `<p>O(1) time and memory - it reads the clock and builds a two-field object.</p>`,
      followUps: ['Add a separate <code>/ready</code> that checks the database connection.', 'What status code should a failing readiness check return? (503 Service Unavailable.)']
    }
  }]
});

/* ============================================================
   TOPIC 2 — Routing & controllers
   ============================================================ */
topics.push({
  title: 'Routing & Controllers: Matching a Request to a Handler',
  analogy: `<p>Think of the <b>reception desk of a big office building</b>. A visitor says "I'm here to <i>collect</i> a parcel for flat 42". The receptionist runs a finger down a list: <i>collect parcel → desk B</i>, <i>drop parcel → desk C</i>, <i>complaints → desk D</i>. The <b>route table</b> is that list: each line is a verb (<b>method</b>) plus an address pattern (<b>path</b>) pointing to a desk (<b>handler</b>). The <b>controller</b> is the person at the desk: they only listen to the visitor, fill the form and hand it on - they do not cook the parcel themselves.</p>`,
  explain: `<p>A <b>route</b> = HTTP method + path pattern + handler. When a request arrives the framework asks: <i>which route matches both the method and the path?</i></p>
  ${H.table(['Method', 'Path pattern', 'Meaning', 'Handler'], [
    ['GET', '<code>/api/books</code>', 'list books (optional <code>?author=</code>)', '<code>list()</code>'],
    ['POST', '<code>/api/books</code>', 'create a book', '<code>create()</code>'],
    ['GET', '<code>/api/books/{id}</code>', 'get one', '<code>get()</code>'],
    ['PUT', '<code>/api/books/{id}</code>', 'replace one', '<code>update()</code>'],
    ['DELETE', '<code>/api/books/{id}</code>', 'remove one', '<code>remove()</code>']
  ])}
  <p><b>Three places data can hide in a request</b> - memorise them, they are asked in every API interview:</p>
  ${H.table(['Where', 'Example', 'Use for', 'Spring', 'Express'], [
    ['<b>Path variable</b>', '<code>/books/<b>42</b></code>', 'identify <i>which</i> resource', '<code>@PathVariable long id</code>', '<code>req.params.id</code>'],
    ['<b>Query string</b>', '<code>/books?<b>author=Orwell</b>&amp;page=2</code>', 'filter, sort, paginate (optional things)', '<code>@RequestParam</code>', '<code>req.query.author</code>'],
    ['<b>Body</b>', '<code>{"title":"Dune"}</code>', 'the data to create/change', '<code>@RequestBody</code>', '<code>req.body</code> (after <code>express.json()</code>)'],
    ['<b>Header</b>', '<code>Authorization: Bearer &lt;token&gt;</code>', 'metadata, auth, content type', '<code>@RequestHeader</code>', '<code>req.get("...")</code>']
  ])}
  <p><b>Matching rules in plain words.</b> (1) The path must fit the pattern; <code>{id}</code>/<code>:id</code> matches one segment (no slashes). (2) The method must be the same. (3) Path fits but method does not → <span class="c-y">405 Method Not Allowed</span>. (4) Nothing fits → <span class="c-r">404 Not Found</span>. (5) In <b>Express the first matching route wins</b>, so order matters; <b>Spring picks the most specific</b> pattern, so <code>/books/search</code> beats <code>/books/{id}</code> regardless of order.</p>
  <p><b>What a controller should do:</b> read the request, call <i>one</i> service method, choose the status code, return the body. <b>What it should not do:</b> loop over data, apply business rules, or touch a database. If your controller has an <code>if</code> about the business ("price over 100 needs approval") it belongs in the service.</p>
  <p><b>Naming rules for URLs:</b> use <b>plural nouns</b> (<code>/books</code>, not <code>/getBooks</code>); the HTTP method is the verb. Nest only when ownership is real: <code>/authors/7/books</code>.</p>`,
  clues: [
    '"Design the endpoints for X" - list method + path + status for each (the route table)',
    '"GET /books/search returns a 404 / treats \'search\' as an id" - route order bug in Express (specific before generic)',
    '"Got 405 instead of 404" - path exists but the verb is wrong; read the <code>Allow</code> header',
    '"Where do I put filters like author and page?" - query parameters, not the path and not the body',
    '"Controller is 300 lines" - business logic leaked into the web layer'
  ],
  code: [
    { lang: 'java', title: 'Spring Boot - BookController routes', check: false, code: `package com.example.books.web;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/books")            // prefix shared by every method below
public class BookController {

    private final BookService service;   // injected by Spring (constructor injection)

    public BookController(BookService service) { this.service = service; }

    @GetMapping                          // GET /api/books?author=Orwell
    public List<Book> list(@RequestParam(required = false) String author) {
        return service.findAll(author);
    }

    @GetMapping("/{id}")                 // GET /api/books/42  (id converted String -> long for you)
    public Book get(@PathVariable long id) {
        return service.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)  // 201 instead of the default 200
    public Book create(@RequestBody BookRequest body) {
        return service.create(body);
    }

    @PutMapping("/{id}")
    public Book update(@PathVariable long id, @RequestBody BookRequest body) {
        return service.update(id, body);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)   // 204: success, nothing to send back
    public void remove(@PathVariable long id) {
        service.delete(id);
    }
}` },
    { lang: 'js', title: 'Express - routes/books.js (the controller)', check: false, code: `import { Router } from 'express';
import * as service from '../services/bookService.js';

const router = Router();                       // a mini-app that only knows /books routes

router.get('/', (req, res) => {                // GET /api/books?author=Orwell
  res.json(service.findAll(req.query.author));
});

router.get('/:id', (req, res) => {             // GET /api/books/42
  res.json(service.findById(Number(req.params.id)));   // params are always STRINGS -> convert
});

router.post('/', (req, res) => {
  const created = service.create(req.body);    // needs app.use(express.json()) first
  res.status(201).json(created);
});

router.put('/:id', (req, res) => {
  res.json(service.update(Number(req.params.id), req.body));
});

router.delete('/:id', (req, res) => {
  service.remove(Number(req.params.id));
  res.status(204).end();                       // no body
});

export default router;

// in app.js:  app.use(express.json());  app.use('/api/books', router);` },
    { lang: 'js', run: true, title: 'Plain JS model of a router (runs in your browser)', code: `// A tiny router that shows what Express/Spring do internally.
function compile(pattern) {
  var names = [];
  // ":id" becomes a capture group that matches ONE path segment
  var src = pattern.replace(/:([a-zA-Z]+)/g, function (_, name) { names.push(name); return '([^/]+)'; });
  return { names: names, re: new RegExp('^' + src + '$') };
}

function Router() { this.routes = []; }
Router.prototype.add = function (method, pattern, handler) {
  var c = compile(pattern);
  this.routes.push({ method: method, pattern: pattern, names: c.names, re: c.re, handler: handler });
};
Router.prototype.match = function (method, url) {
  var parts = url.split('?');
  var path = parts[0];
  var query = {};
  (parts[1] || '').split('&').filter(Boolean).forEach(function (kv) {
    var p = kv.split('=');
    query[p[0]] = decodeURIComponent(p[1] || '');
  });
  var allowed = [];
  for (var i = 0; i < this.routes.length; i++) {          // first match wins (Express style)
    var r = this.routes[i];
    var m = r.re.exec(path);
    if (!m) continue;                                      // path does not fit
    if (r.method !== method) { allowed.push(r.method); continue; }   // path fits, verb wrong
    var params = {};
    r.names.forEach(function (n, k) { params[n] = m[k + 1]; });
    return { status: 200, handler: r.handler, params: params, query: query };
  }
  if (allowed.length) return { status: 405, allow: allowed.join(', ') };
  return { status: 404 };
};

var router = new Router();
router.add('GET', '/api/books', 'list');
router.add('POST', '/api/books', 'create');
router.add('GET', '/api/books/search', 'search');      // specific route FIRST
router.add('GET', '/api/books/:id', 'get');
router.add('PUT', '/api/books/:id', 'update');
router.add('DELETE', '/api/books/:id', 'remove');

[['GET', '/api/books?author=Orwell'], ['GET', '/api/books/42'], ['GET', '/api/books/search'],
 ['PATCH', '/api/books/42'], ['GET', '/api/movies']].forEach(function (rq) {
  console.log(rq[0] + ' ' + rq[1] + ' -> ' + JSON.stringify(router.match(rq[0], rq[1])));
});` }
  ],
  codeTitle: ['Spring controller', 'Express router', 'Router model (runnable)'],
  viz: {
    title: 'Route table matching: which row wins?',
    input: 'GET /api/books/42',
    inputLabel: 'Request (METHOD /path). Try PATCH /api/books/42, DELETE /api/books/7, GET /api/movies',
    gen: function (input) {
      var mm = String(input).trim().match(/^([A-Za-z]+)\s+(\/\S*)$/);
      if (!mm) throw new Error('Type a request like: GET /api/books/42');
      var method = mm[1].toUpperCase(), path = mm[2].split('?')[0];
      var routes = [
        ['GET', '/api/books', 'list()'], ['POST', '/api/books', 'create()'],
        ['GET', '/api/books/:id', 'get(id)'], ['PUT', '/api/books/:id', 'update(id)'],
        ['DELETE', '/api/books/:id', 'remove(id)'], ['GET', '/health', 'health()']
      ];
      function rx(p) { return new RegExp('^' + p.replace(/:[a-z]+/g, '([^/]+)') + '$'); }
      var cols = ['#', 'Method', 'Pattern', 'Path fits?', 'Verb fits?', 'Verdict'];
      var state = routes.map(function (r, i) { return [String(i + 1), r[0], r[1], '', '', 'waiting']; });
      var hl = {}, frames = [], allowed = [], found = -1, params = {};
      function table() { return { type: 'table', label: 'Route table (checked top to bottom)', columns: cols, rows: state.map(function (r) { return r.slice(); }), hl: JSON.parse(JSON.stringify(hl)) }; }
      frames.push({ narr: 'The router holds this <b>route table</b>. The request <code>' + method + ' ' + path + '</code> arrives. It will test the rows <b>from the top</b> - first full match wins (Express style).', parts: [table(), { type: 'vars', label: 'Request', vals: { method: method, path: path } }] });
      for (var i = 0; i < routes.length; i++) {
        var m = rx(routes[i][1]).exec(path);
        hl[i] = 'cur'; state[i][3] = '...'; state[i][4] = '...'; state[i][5] = 'testing';
        frames.push({ narr: 'Testing row ' + (i + 1) + ': pattern <code>' + routes[i][1] + '</code>. First the <b>path</b>, then the <b>verb</b>.', parts: [table()] });
        if (!m) {
          state[i][3] = 'no'; state[i][4] = '-'; state[i][5] = 'skip'; hl[i] = 'bad';
          frames.push({ narr: 'The path <code>' + path + '</code> does not fit <code>' + routes[i][1] + '</code>. Move on to the next row.', parts: [table()] });
          continue;
        }
        state[i][3] = 'yes';
        if (routes[i][0] !== method) {
          state[i][4] = 'no'; state[i][5] = 'path ok, verb wrong'; hl[i] = 'bad'; allowed.push(routes[i][0]);
          frames.push({ narr: 'Path fits but this row is for <b>' + routes[i][0] + '</b>, not <b>' + method + '</b>. Remember it (for a possible 405) and keep looking.', parts: [table()] });
          continue;
        }
        state[i][4] = 'yes'; state[i][5] = 'MATCH'; hl[i] = 'sel'; found = i;
        var names = (routes[i][1].match(/:[a-z]+/g) || []), cap = m.slice(1);
        names.forEach(function (n, k) { params[n.slice(1)] = cap[k]; });
        frames.push({ narr: 'Path and verb both fit. <b>Row ' + (i + 1) + ' wins</b> - the router will call <code>' + routes[i][2] + '</code>' + (names.length ? ' with the captured path variable(s).' : '.') + ' Rows below are never checked.', parts: [table(), { type: 'vars', label: 'Captured by the router', vals: names.length ? params : { params: '(none)' }, hl: names.length ? { id: 'ok' } : {} }] });
        for (var j = i + 1; j < routes.length; j++) hl[j] = 'done';
        break;
      }
      if (found < 0) {
        var is405 = allowed.length > 0;
        frames.push({ narr: is405
          ? 'No row matched both. But the path existed for <b>' + allowed.join(', ') + '</b>, so the right answer is <span class="c-y">405 Method Not Allowed</span> with header <code>Allow: ' + allowed.join(', ') + '</code>.'
          : 'No row fits the path at all, so the answer is <span class="c-r">404 Not Found</span>. Your controller code was never called.', parts: [table(), { type: 'vars', label: 'Response', vals: { status: is405 ? '405' : '404', allow: is405 ? allowed.join(', ') : '-' }, hl: { status: 'bad' } }] });
      } else {
        frames.push({ narr: 'Done: the controller method runs and returns <b>200</b> (or 201/204 for create/delete). Routing is only a lookup - fast and boring, exactly how it should be.', parts: [table()] });
      }
      return frames;
    }
  },
  examples: [
    { title: 'Path variable vs query string', html: `<p>Rule of thumb: the <b>path</b> says <i>which thing</i>, the <b>query</b> says <i>how to view the list</i>. Both of these are valid, and they mean different things:</p>${H.table(['URL', 'Reads as'], [['<code>GET /books/42</code>', 'the one book whose id is 42'], ['<code>GET /books?author=Orwell&amp;page=2</code>', 'the list of books, filtered by author, second page'], ['<code>GET /books/42?fields=title</code>', 'book 42, but only the title field']])}`,
      code: { lang: 'bash', check: false, code: `curl "localhost:8080/api/books?author=Orwell"
curl localhost:8080/api/books/42
# quote the URL when it has & or ? so the shell does not eat them` } },
    { title: 'The order bug in Express', html: `<p>Express checks routes in the order you register them. If <code>/books/:id</code> comes first, then <code>GET /books/search</code> matches it with <code>id = "search"</code> and your search handler never runs (and your service looks up book "search" - NaN!). Fix: register the specific route first. Spring does not have this bug because it ranks patterns by specificity.</p>`,
      code: { lang: 'js', check: false, code: `// WRONG order
router.get('/:id', getOne);        // 'search' is captured as id
router.get('/search', search);     // never reached

// RIGHT order
router.get('/search', search);     // specific first
router.get('/:id', getOne);        // generic last` } },
    { title: 'Typed path variables and bad input', html: `<p>In Spring <code>@PathVariable long id</code> converts the text for you; sending <code>/books/abc</code> fails the conversion and Spring answers <span class="c-r">400</span> by itself. In Express <code>req.params.id</code> is always a string, so <code>Number("abc")</code> gives <code>NaN</code> - you must check it yourself or you will query the repository with garbage.</p>`,
      code: { lang: 'js', check: false, code: `router.param('id', (req, res, next, raw) => {   // runs for every route containing :id
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: 'id must be a positive integer' });
  }
  req.bookId = id;                                // store the clean value
  next();
});` } },
    { title: 'Many routes, one file: grouping with a base path', html: `<p>Both frameworks let you declare the shared prefix once (<code>@RequestMapping("/api/books")</code> or <code>app.use("/api/books", router)</code>). Benefit: when you add versioning later (<code>/api/v1/books</code>) you change one line, not twenty.</p>` }
  ],
  deepDive: `<p><b>How Spring MVC finds the handler.</b> Every request first reaches the <code>DispatcherServlet</code> (the "front controller"). It asks a <code>HandlerMapping</code> (the route table, built at startup from your annotations) for the best match; then a <code>HandlerAdapter</code> calls your method, resolving each parameter (path variable, JSON body, header) with <i>argument resolvers</i>; after your method returns, <i>return-value handlers</i> and <code>HttpMessageConverter</code>s (Jackson) write the response. Knowing these names lets you debug "why was my parameter null?" quickly.</p>
  <p><b>Express internals.</b> An Express app is a <b>stack of functions</b> (middleware). Each route is just a function in the stack with a pattern check in front. <code>app.use(express.json())</code> is a function that reads the body stream and fills <code>req.body</code>; a route is a function that matches the path. That is why registering <code>express.json()</code> <i>after</i> your routes leaves <code>req.body</code> as <code>undefined</code> - the stack runs top to bottom.</p>
  <p><b>Content negotiation.</b> The router also considers headers: Spring can map two methods to the same path by <code>consumes</code>/<code>produces</code> (e.g. JSON vs XML). A wrong <code>Content-Type</code> on POST gives <span class="c-r">415 Unsupported Media Type</span>; an <code>Accept</code> header the server cannot satisfy gives <span class="c-r">406</span>.</p>
  <p><b>Trailing slashes, case, encoding.</b> <code>/books/</code> vs <code>/books</code> are different strings. Spring 6 no longer matches the trailing slash by default; Express matches it unless <code>strict routing</code> is on. Paths are case-sensitive in Spring, case-insensitive by default in Express. Percent-encoded characters (<code>%20</code>) are decoded before matching - one reason path-based security checks must happen <i>after</i> normalisation.</p>
  <p><b>Performance.</b> Route lookup is microseconds (Spring uses a pre-built tree of patterns; Express walks a list, so thousands of routes slow it slightly - not a real-world concern). Your time goes in the handler, not the router.</p>`,
  aiEra: `<p><b>What AI changes:</b> assistants generate full controllers from a one-line description. They are good at the boilerplate of mappings. The risk is silent <i>design</i> mistakes baked into the route table.</p>
  <p><b>Use AI as a partner:</b> paste your route table and ask <code>Review these endpoints for REST naming, wrong status codes and route-order conflicts. Give a table of problems only.</code> Or ask it to generate the curl command for every route, then run them.</p>
  <p><b>Where AI goes wrong:</b> verb-style URLs (<code>/getAllBooks</code>, <code>/deleteBook?id=3</code>), using POST for everything, returning 200 with an error message in the body, forgetting that Express path params are strings, and registering generic routes before specific ones. It also happily generates <code>@CrossOrigin("*")</code> on every controller - a security decision you should make on purpose.</p>
  <p><b>What you must still own:</b> the API contract. The route table is a promise to every client; changing it later breaks them. Draw it on paper first, then let AI type it.</p>`,
  problems: [{
    title: 'Find the Routing Bug', level: 'Medium', tags: ['express', 'routing', 'order'], lang: 'js',
    statement: `<p>Your Express service has these routes registered in this order: <code>GET /api/books/:id</code>, <code>GET /api/books/search</code>, <code>GET /api/books/:id/reviews</code>. Users report that <code>GET /api/books/search?q=dune</code> returns <code>404 {"error":"Book not found"}</code> while <code>GET /api/books/7/reviews</code> works. Explain exactly why and fix it. Then explain how the same code behaves in Spring Boot.</p>`,
    constraints: `You may only reorder or rename routes - no changes to clients. The fix must also handle <code>GET /api/books/abc</code> with a clear 400.`,
    example: `<p>Request <code>GET /api/books/search?q=dune</code></p>${H.table(['Step', 'What happens'], [['Row 1 <code>/api/books/:id</code>', '<span class="c-r">matches</span> with id = "search" - first match wins'], ['Handler', 'looks up book "search" -> not found -> 404'], ['Row 2 <code>/search</code>', 'never reached']])}`,
    brute: { why: `<p>The "fix" most people try first is adding an <code>if (req.params.id === 'search') next()</code> inside the id handler. It works but spreads routing knowledge into handlers, and every new literal path (<code>/export</code>, <code>/stats</code>) needs another special case. Fix the <i>order</i>, not the handler.</p>` },
    mcq: { q: 'In Express, which ordering makes /api/books/search work?', options: ['Register /search before /:id', 'Register /:id before /search', 'Order never matters', 'Use POST instead of GET'], answer: 0, explain: 'Express tests routes top to bottom and the first match wins, so literal paths must come before parameterised ones.' },
    hints: [
      `<p>Hint 1: compare the pattern <code>/api/books/:id</code> with the path <code>/api/books/search</code>. Does <code>:id</code> accept the text "search"?</p>`,
      `<p>Hint 2: Express walks the registered routes in order and stops at the first match. So which row catches the request first?</p>`,
      `<p>Hint 3: put every literal route above every parameterised sibling. Add a numeric check (<code>router.param</code> or a small middleware) so <code>abc</code> returns 400, not 404.</p>`
    ],
    solution: {
      approach: `<p><b>Why it breaks:</b> <code>:id</code> matches any single segment, including the word "search". Because Express uses first-match-wins, row 1 captures the request and the service looks up a book whose id is "search", finds nothing, and the error handler produces 404. <code>/:id/reviews</code> has an extra segment so it can never be confused - which is why it works.</p>
      <p><b>Fix:</b> register literal routes first (<code>/search</code>), then <code>/:id</code>, then nested ones. Add a small validator for the id so non-numeric ids return a clean <span class="c-r">400</span> instead of a misleading 404.</p>
      <p><b>In Spring:</b> not a bug. Spring MVC collects all matching patterns and picks the most specific one, so <code>@GetMapping("/search")</code> beats <code>@GetMapping("/{id}")</code> no matter which method is declared first. Passing <code>abc</code> to <code>@PathVariable long id</code> gives a type-mismatch 400 automatically.</p>`,
      code: { lang: 'js', check: false, code: `router.get('/search', searchBooks);              // literal first
router.get('/:id', parseId, getBook);            // then the generic one
router.get('/:id/reviews', parseId, listReviews);

function parseId(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'id must be a positive integer' });
  req.bookId = id;
  next();
}` },
      complexity: `<p>Routing is O(number of routes) per request in Express; negligible for typical services.</p>`,
      followUps: ['How would you version the API so <code>/api/v2/books</code> can change safely?', 'What changes if the path is <code>/api/books/search/</code> with a trailing slash?']
    }
  }]
});

/* ============================================================
   TOPIC 3 — Request & response bodies, CRUD
   ============================================================ */
topics.push({
  title: 'Request & Response Bodies: JSON, DTOs and CRUD Status Codes',
  analogy: `<p>Sending a <b>parcel</b>. The <b>address label</b> on the outside is the URL and method (<i>where</i> and <i>what to do</i>). The <b>box</b> is the body (the actual stuff). The <b>delivery slip</b> you get back says "delivered" (<code>201 Created</code>) or "address not found" (<code>404</code>), and may include a new <b>tracking number</b> (the <code>Location</code> header). A <b>DTO</b> is the neat shipping box you pack for the customer - you do not ship them your whole warehouse shelf (the database row) with internal price tags still stuck on it.</p>`,
  explain: `<p><b>JSON</b> is the text format for the body: <code>{"title":"Dune","author":"Frank Herbert","year":1965}</code>. Keys are quoted strings; values are strings, numbers, true/false, null, arrays or objects. The framework turns JSON text into an object (<i>deserialise</i>) on the way in, and an object into JSON (<i>serialise</i>) on the way out. Spring uses <b>Jackson</b>; Express uses <code>express.json()</code> to read and <code>res.json()</code> to write.</p>
  <p><b>Tell the server what you send.</b> The request header <code>Content-Type: application/json</code> says "my body is JSON". Without it Express leaves <code>req.body</code> empty and Spring answers <span class="c-r">415 Unsupported Media Type</span>. In curl that is <code>-H "Content-Type: application/json"</code>.</p>
  <p><b>CRUD = the four things you do with data.</b> Memorise this table - it is the heart of every REST interview:</p>
  ${H.table(['Action', 'Request', 'Success status', 'Response body', 'Safe to repeat?'], [
    ['<b>C</b>reate', '<code>POST /books</code> + body', '<span class="c-g">201 Created</span> + <code>Location: /books/3</code>', 'the new book (with its id)', 'No - repeats create duplicates'],
    ['<b>R</b>ead list', '<code>GET /books</code>', '<span class="c-g">200 OK</span>', 'array (maybe empty <code>[]</code>)', 'Yes'],
    ['<b>R</b>ead one', '<code>GET /books/3</code>', '<span class="c-g">200 OK</span> / <span class="c-r">404</span>', 'the book / error', 'Yes'],
    ['<b>U</b>pdate', '<code>PUT /books/3</code> + full body', '<span class="c-g">200 OK</span> (or 204)', 'updated book', 'Yes (same result)'],
    ['<b>D</b>elete', '<code>DELETE /books/3</code>', '<span class="c-g">204 No Content</span>', 'none', 'Yes (end state same)']
  ])}
  <p><b>DTO (Data Transfer Object)</b> = a small class that describes exactly what goes over the wire. Use two: <code>BookRequest</code> (what clients may send: title, author, year - <i>no id</i>, the server makes ids) and <code>Book</code>/<code>BookResponse</code> (what we send back: id plus the fields). Why not reuse the database entity? Because entities carry things clients must never see or set (<code>passwordHash</code>, <code>role</code>, <code>createdBy</code>), and because changing a database column would silently change your public API.</p>
  <p><b>Status code families in one line:</b> <span class="c-g">2xx</span> it worked, <span class="c-y">3xx</span> go elsewhere, <span class="c-r">4xx</span> <i>you</i> (the client) did something wrong, <span class="c-p">5xx</span> <i>we</i> (the server) broke. Pick the most specific one - a <code>200</code> with <code>{"error":"not found"}</code> inside is a lie that breaks every client and monitoring tool.</p>
  <p><b>Choose the error body shape once.</b> Our API uses the same JSON for every error: <code>{"status":404,"error":"Not Found","message":"Book 9 does not exist"}</code>. Clients then write one error parser. (There is also a standard called <i>Problem Details</i>, RFC 9457, which Spring supports via <code>ProblemDetail</code>.)</p>`,
  clues: [
    '"Create returns what? 200 or 201?" - 201 Created with a Location header pointing to the new resource',
    '"Client sends JSON but req.body is undefined / Spring says 415" - missing Content-Type header or missing <code>express.json()</code>',
    '"Do not expose internal fields like passwordHash" - use DTOs, never return the entity',
    '"Delete succeeded - what do we return?" - 204 No Content (empty body)',
    '"Is PUT idempotent?" - yes: same request twice leaves the same state; POST is not'
  ],
  code: [
    { lang: 'java', title: 'Spring Boot - DTOs as records + controller returning ResponseEntity', check: false, code: `// Request DTO: what a client may send. No id! The server owns ids.
public record BookRequest(String title, String author, Integer year) {}

// Response DTO: what we send back.
public record Book(Long id, String title, String author, Integer year) {}

@RestController
@RequestMapping("/api/books")
public class BookController {
    private final BookService service;
    public BookController(BookService service) { this.service = service; }

    @PostMapping
    public ResponseEntity<Book> create(@RequestBody BookRequest body) {
        Book saved = service.create(body);
        // 201 Created + Location header: "the new thing lives at /api/books/3"
        URI location = URI.create("/api/books/" + saved.id());
        return ResponseEntity.created(location).body(saved);
    }

    @PutMapping("/{id}")
    public Book replace(@PathVariable long id, @RequestBody BookRequest body) {
        return service.update(id, body);      // 200 + updated JSON
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();   // 204, empty body
    }
}` },
    { lang: 'js', title: 'Express - the same bodies and status codes', check: false, code: `import express from 'express';
const app = express();
app.use(express.json());          // parse JSON bodies into req.body. Put it BEFORE the routes!

// Pick only the fields we allow. Never spread req.body straight into your data.
function toDto(b) {
  return { title: b.title, author: b.author, year: b.year };
}

app.post('/api/books', (req, res) => {
  const saved = service.create(toDto(req.body));
  res.status(201)                                   // Created
     .location('/api/books/' + saved.id)            // Location header
     .json(saved);
});

app.put('/api/books/:id', (req, res) => {
  res.json(service.update(Number(req.params.id), toDto(req.body)));   // 200
});

app.delete('/api/books/:id', (req, res) => {
  service.remove(Number(req.params.id));
  res.status(204).end();                            // 204, no body
});` },
    { lang: 'json', title: 'A request body and the matching response body', code: `{
  "id": 3,
  "title": "Dune",
  "author": "Frank Herbert",
  "year": 1965
}` }
  ],
  codeTitle: ['Spring: DTOs + status codes', 'Express: same behaviour', 'Response JSON'],
  viz: {
    title: 'In-memory repository state after every CRUD call',
    input: 'POST Dune,Herbert; POST Emma,Austen; PUT 1 Dune Messiah,Herbert; DELETE 2; GET 9; POST Ulysses,Joyce',
    inputLabel: 'Calls separated by ; - POST title,author | PUT id title,author | DELETE id | GET id',
    gen: function (input) {
      var calls = String(input).split(';').map(function (s) { return s.trim(); }).filter(Boolean);
      if (!calls.length) throw new Error('Type at least one call, e.g. POST Dune,Herbert');
      if (calls.length > 9) throw new Error('Use at most 9 calls');
      var store = [], nextId = 1, frames = [];
      function tbl(hl) { return { type: 'table', label: 'Repository (the Map: id -> book)', columns: ['id', 'title', 'author'], rows: store.length ? store.map(function (b) { return [b.id, b.title, b.author]; }) : [['(empty)', '', '']], hl: hl || {} }; }
      frames.push({ narr: 'The repository starts <b>empty</b>. The next id the server will hand out is <b>1</b>. Watch the table change after each call - this is "the database" for now.', parts: [tbl(), { type: 'vars', vals: { nextId: 1, size: 0 } }] });
      calls.forEach(function (c) {
        var m = /^(POST|PUT|DELETE|GET)\s*(.*)$/i.exec(c);
        if (!m) throw new Error('Cannot read "' + c + '". Use POST title,author | PUT id title,author | DELETE id | GET id');
        var verb = m[1].toUpperCase(), rest = m[2].trim(), status, body, hl = {};
        function idx(id) { for (var i = 0; i < store.length; i++) if (store[i].id === id) return i; return -1; }
        if (verb === 'POST') {
          var pa = rest.split(','); var b = { id: nextId++, title: (pa[0] || '').trim(), author: (pa[1] || '').trim() };
          store.push(b); hl[store.length - 1] = 'ok'; status = '201 Created'; body = '{"id":' + b.id + ',"title":"' + b.title + '"} + Location: /api/books/' + b.id;
          frames.push({ narr: '<b>POST</b> has no id in the URL - the server <b>creates</b> a row and assigns id <b>' + b.id + '</b>. Status <span class="c-g">201 Created</span>, and the Location header tells the client where it lives.', parts: [tbl(hl), { type: 'vars', label: 'Request -> Response', vals: { call: c, status: status, body: body, nextId: nextId }, hl: { status: 'ok' } }] });
        } else {
          var sp = rest.match(/^(\d+)\s*(.*)$/);
          if (!sp) throw new Error('"' + c + '" needs an id, e.g. ' + verb + ' 1');
          var id = Number(sp[1]), at = idx(id);
          if (verb === 'GET') {
            if (at < 0) { status = '404 Not Found'; body = '{"message":"Book ' + id + ' does not exist"}'; }
            else { status = '200 OK'; body = '{"id":' + id + ',"title":"' + store[at].title + '"}'; hl[at] = 'sel'; }
            frames.push({ narr: '<b>GET ' + id + '</b>: a read never changes the table. ' + (at < 0 ? 'No row has that id, so <span class="c-r">404 Not Found</span> with an error body.' : 'The row is found and returned with <span class="c-g">200 OK</span>.'), parts: [tbl(hl), { type: 'vars', label: 'Request -> Response', vals: { call: c, status: status, body: body }, hl: { status: at < 0 ? 'bad' : 'ok' } }] });
          } else if (verb === 'PUT') {
            var pb = sp[2].split(',');
            if (at < 0) { status = '404 Not Found'; body = '{"message":"Book ' + id + ' does not exist"}'; }
            else { store[at] = { id: id, title: (pb[0] || '').trim(), author: (pb[1] || '').trim() }; status = '200 OK'; body = JSON.stringify(store[at]); hl[at] = 'cur'; }
            frames.push({ narr: '<b>PUT ' + id + '</b> <i>replaces</i> the whole row. ' + (at < 0 ? 'Row ' + id + ' is not there: <span class="c-r">404</span>.' : 'Same id, new fields. Sending the same PUT again gives the same table - that is <b>idempotent</b>.'), parts: [tbl(hl), { type: 'vars', label: 'Request -> Response', vals: { call: c, status: status, body: body }, hl: { status: at < 0 ? 'bad' : 'ok' } }] });
          } else {
            if (at < 0) { status = '404 Not Found'; body = '{"message":"Book ' + id + ' does not exist"}'; }
            else { hl[at] = 'bad'; status = '204 No Content'; body = '(empty)'; }
            frames.push({ narr: '<b>DELETE ' + id + '</b>: ' + (at < 0 ? 'nothing to delete - <span class="c-r">404</span> (many APIs return 204 here too, because the end state is the same).' : 'the row (red) is about to disappear. Success is <span class="c-g">204 No Content</span> - no body.'), parts: [tbl(hl), { type: 'vars', label: 'Request -> Response', vals: { call: c, status: status, body: body }, hl: { status: at < 0 ? 'bad' : 'ok' } }] });
            if (at >= 0) { store.splice(at, 1); frames.push({ narr: 'The row is gone. Note the ids of the other rows do <b>not</b> change, and the id ' + id + ' is <b>never reused</b>.', parts: [tbl(), { type: 'vars', vals: { size: store.length, nextId: nextId } }] }); }
          }
        }
      });
      frames.push({ narr: 'End of script: ' + store.length + ' book(s) left. In the next module this Map is replaced by a real database, but the controller and service code barely change.', parts: [tbl(), { type: 'vars', vals: { size: store.length, nextId: nextId } }] });
      return frames;
    }
  },
  examples: [
    { title: 'POST - create a book (request and response on the wire)', html: `<p>Notice three things in the response: status <b>201</b>, a <b>Location</b> header, and a body that includes the new <b>id</b> the client could not have known.</p>`,
      code: { lang: 'http', code: `POST /api/books HTTP/1.1
Host: localhost:8080
Content-Type: application/json

{"title":"Dune","author":"Frank Herbert","year":1965}

HTTP/1.1 201 Created
Location: /api/books/3
Content-Type: application/json

{"id":3,"title":"Dune","author":"Frank Herbert","year":1965}` } },
    { title: 'Why DTOs: the leaking-field bug', html: `<p>An API returns the database entity directly. One day someone adds <code>passwordHash</code> to <code>User</code>. The next deploy, <code>GET /users/1</code> returns every user's password hash to the whole internet - with no code change in the controller! A DTO makes the contract explicit: only fields you list can leave.</p>`,
      code: { lang: 'java', code: `// Entity (internal, has secrets)
record UserEntity(long id, String email, String passwordHash, String role) {}

// DTO (public contract): only what clients may see
record UserResponse(long id, String email) {
    static UserResponse from(UserEntity e) { return new UserResponse(e.id(), e.email()); }
}` } },
    { title: 'Malformed JSON and wrong Content-Type', html: `<p>Two client mistakes you will see daily:</p>${H.table(['Client sends', 'Spring', 'Express'], [['Broken JSON <code>{"title":}</code>', '<span class="c-r">400</span> (HttpMessageNotReadableException)', '<span class="c-r">400</span> from the body parser (SyntaxError)'], ['Valid JSON, <code>Content-Type: text/plain</code>', '<span class="c-r">415</span>', 'body ignored: <code>req.body</code> is <code>undefined</code> or <code>{}</code> -> your code must check']])}<p>Handle both in the global error handler (next topic) so clients get a clean JSON error, not an HTML stack trace.</p>`,
      code: { lang: 'bash', check: false, code: `# broken JSON -> 400
curl -i -X POST localhost:8080/api/books -H "Content-Type: application/json" -d '{"title":}'
# missing header -> 415 (Spring) / empty body (Express)
curl -i -X POST localhost:8080/api/books -d '{"title":"Dune"}'` } },
    { title: 'PUT vs PATCH in one minute', html: `<p><b>PUT</b> = "replace the whole thing with what I send" (send all fields; missing ones become null). <b>PATCH</b> = "change only these fields". Our Books API uses PUT for simplicity; the HTTP Deep Dive module covers PATCH (JSON Merge Patch) and why a half-filled PUT is a classic data-loss bug.</p>` }
  ],
  deepDive: `<p><b>How Jackson maps JSON to Java.</b> For a <code>record</code> or class, Jackson calls the constructor/setters with matching JSON keys (case-sensitive). Unknown keys are <i>ignored</i> by Spring Boot by default (it configures <code>FAIL_ON_UNKNOWN_PROPERTIES=false</code>), so a typo like <code>"titel"</code> silently leaves <code>title = null</code> - which is exactly why validation (next topic) is not optional. Numbers into <code>Integer</code> accept <code>1965</code> but reject <code>"abc"</code> with a 400. Dates: use ISO-8601 strings and <code>Instant</code>/<code>LocalDate</code>; avoid epoch numbers unless documented.</p>
  <p><b>Mass assignment.</b> In Express, <code>Object.assign(book, req.body)</code> or <code>repo.save(req.body)</code> lets a client set <i>any</i> field, including <code>id</code>, <code>role</code> or <code>isAdmin</code>. That is the "mass assignment" vulnerability (OWASP API Top 10). Always copy a whitelist of fields (as <code>toDto</code> does) - the DTO is a security boundary, not just tidiness.</p>
  <p><b>Body size and shape limits.</b> <code>express.json()</code> rejects bodies over 100 kb by default (<span class="c-r">413</span>); raise it deliberately with <code>{limit:'1mb'}</code>. Spring has <code>spring.servlet.multipart</code> and server limits. A server that accepts unlimited JSON is a denial-of-service waiting to happen. Also watch deeply nested JSON and huge arrays.</p>
  <p><b>Null vs missing vs empty.</b> <code>{"year":null}</code>, <code>{}</code> and <code>{"year":0}</code> are three different statements. Decide per field what each means and validate accordingly; PATCH semantics depend on telling "missing" from "null".</p>
  <p><b>IDs.</b> Sequential integers (what our Map hands out) are easy but guessable: <code>/books/4</code> invites someone to try <code>/books/5</code>. For private resources use UUIDs or check ownership on every read. Big numbers: JavaScript cannot represent integers above 2<sup>53</sup> exactly, so a 64-bit database id sent as a JSON number can be corrupted in a browser - send very large ids as strings.</p>
  <p><b>Idempotency of POST.</b> Network retries make "create" dangerous: client times out, retries, you now have two books. Production APIs accept an <code>Idempotency-Key</code> header (covered in HTTP Deep Dive).</p>`,
  aiEra: `<p><b>What AI changes:</b> AI is excellent at generating DTO classes, JSON examples and curl commands from a spec - hours of typing in seconds. It can also convert a JSON sample into records and back.</p>
  <p><b>Use AI as a partner:</b> <code>Here is my Book entity. Generate a request DTO and a response DTO, and list which fields must never be client-settable and why.</code> Or paste a JSON error from your API and ask it to suggest what status code should have been returned.</p>
  <p><b>Where AI goes wrong:</b> it often returns the entity directly "to keep it simple", spreads <code>req.body</code> into the model (mass assignment), uses 200 for everything, returns 201 with no <code>Location</code>, or produces <code>PUT</code> endpoints that do partial updates. It may also invent Jackson annotations that do not exist.</p>
  <p><b>What you must still own:</b> the contract. Decide which fields are public, which are read-only, and which status code each outcome gets - then check the AI's code against that table, not against vibes.</p>`,
  problems: [{
    title: 'Pick the Status Code for Each Outcome', level: 'Easy', tags: ['status codes', 'crud', 'http'], lang: 'java',
    statement: `<p>For the Books API, write the correct <b>status code</b> and (if any) <b>important header</b> for each outcome: (a) a new book created, (b) the book list is empty, (c) the book id does not exist, (d) delete succeeded, (e) the JSON body is broken, (f) the client sent a title that is too long, (g) the service crashed with a NullPointerException, (h) PUT on a path that exists only for GET.</p>`,
    constraints: `Use the most specific standard status. Do not return 200 for errors. One short reason per answer.`,
    example: `${H.table(['Outcome', 'Status', 'Why'], [['(a) created', '<span class="c-g">201</span> + Location', 'new resource exists at a new URL'], ['(b) empty list', '<span class="c-g">200</span> with <code>[]</code>', 'the list resource exists; it is just empty'], ['(c) unknown id', '<span class="c-r">404</span>', 'the thing asked for is not there']])}`,
    brute: { why: `<p>Beginners return <code>200</code> with an error message in the body for everything, or <code>500</code> for every failure. Monitoring then cannot tell client mistakes from real outages: every typo in a URL pages the on-call engineer, and real crashes hide among "OK" responses.</p>` },
    mcq: { q: 'A client asks GET /books and there are no books. What is correct?', options: ['200 OK with an empty array', '404 Not Found', '204 No Content', '500 Internal Server Error'], answer: 0, explain: 'The collection exists; it just has zero items. 404 is for a missing resource, not an empty collection.' },
    hints: [
      `<p>Hint 1: first decide who is at fault. Client mistake means 4xx; server mistake means 5xx; success means 2xx.</p>`,
      `<p>Hint 2: within 4xx, separate "I cannot read your request" (400), "the thing does not exist" (404), "the verb is not allowed here" (405), "your data is the wrong shape" (400 or 422).</p>`,
      `<p>Hint 3: crashes you did not expect are always 500 with a safe generic message (the stack trace stays in the logs, never in the response).</p>`
    ],
    solution: {
      approach: `<p>(a) <b>201 Created</b> with <code>Location: /api/books/{id}</code>. (b) <b>200 OK</b> and <code>[]</code> - an empty list is still a valid list. (c) <b>404 Not Found</b> with the standard error JSON. (d) <b>204 No Content</b> and no body. (e) <b>400 Bad Request</b> - the server cannot even parse the body. (f) <b>400 Bad Request</b> (some teams use <b>422 Unprocessable Content</b> for "well-formed but semantically invalid"); include the list of field errors. (g) <b>500 Internal Server Error</b> with a generic message and a correlation id; log the stack trace server-side. (h) <b>405 Method Not Allowed</b> with an <code>Allow: GET</code> header.</p>
      <p>The principle: <b>4xx</b> tells the client "fix your request, retrying unchanged is pointless", <b>5xx</b> tells everyone "our bug; retrying later may work". Dashboards and alerts depend on this split.</p>`,
      complexity: `<p>Not an algorithm - the cost is one switch in your error handler and one status per success path.</p>`,
      followUps: ['When would 409 Conflict be better than 400?', 'Why is 401 vs 403 a common interview trap?']
    }
  }]
});

/* ============================================================
   TOPIC 4 — Validation
   ============================================================ */
topics.push({
  title: 'Validation: Never Trust the Client (400 Bad Request)',
  analogy: `<p>The <b>security desk at an airport</b>. Every passenger (request) walks through the same checks before reaching the gate (your business code): passport present? name matches ticket? bag under the weight limit? A good officer does <b>not</b> stop at the first problem and send you back - they tell you everything wrong at once ("passport expired <i>and</i> bag too heavy") so you can fix it in one trip. And a flight is never allowed to leave with a passenger nobody checked, no matter how nice they look.</p>`,
  explain: `<p><b>Rule #1 of backend work: every byte from outside is untrusted.</b> A browser form can be bypassed with curl. A mobile app can be reverse-engineered. Even your own frontend has bugs. So the server must check every input - the client-side checks are only a courtesy for the user.</p>
  <p><b>What to check</b> (the four questions):</p>
  ${H.table(['Question', 'Example rule', 'Spring annotation', 'Hand-written (JS)'], [
    ['Is it <b>there</b>?', 'title required', '<code>@NotBlank</code> / <code>@NotNull</code>', '<code>v === undefined || v.trim() === ""</code>'],
    ['Is it the right <b>type</b>?', 'year is a whole number', 'Jackson types + <code>Integer</code>', '<code>Number.isInteger(v)</code>'],
    ['Is it the right <b>size</b>?', 'title at most 100 chars', '<code>@Size(max = 100)</code>', '<code>v.length &lt;= 100</code>'],
    ['Is it in the right <b>range / format</b>?', 'year between 1000 and 2026', '<code>@Min(1000) @Max(2026)</code>, <code>@Pattern</code>, <code>@Email</code>', 'comparison / regex']
  ])}
  <p><b>Collect all errors, then answer once.</b> Return <span class="c-r">400 Bad Request</span> with one entry per bad field:</p>
  <pre>{ "status": 400, "error": "Validation failed",
  "details": [ {"field":"title","message":"must not be blank"},
               {"field":"year","message":"must be at most 2026"} ] }</pre>
  <p><b>Two kinds of "wrong"</b> - keep them apart:</p>
  ${H.table(['Kind', 'Question', 'Where', 'Status'], [
    ['<b>Input validation</b> (shape)', 'Is this request well-formed on its own?', 'controller / DTO (<code>@Valid</code>)', '<span class="c-r">400</span>'],
    ['<b>Business rule</b> (state)', 'Is it allowed given what already exists?', 'service layer', '<span class="c-r">409 Conflict</span> / <span class="c-r">422</span> / 404']
  ])}
  <p>"Title is blank" needs only the request: shape check, 400. "A book with this ISBN already exists" needs the database: business rule, 409 - and it belongs in the <b>service</b>.</p>
  <p><b>In Spring:</b> put constraint annotations on the request record, add <code>@Valid</code> before <code>@RequestBody</code>, add the <code>validation</code> starter. If any rule fails, Spring throws <code>MethodArgumentNotValidException</code> before your method body runs. <b>In Express:</b> nothing is built in. Write a small validator (we do below) or use a library (<b>zod</b>, <b>ajv</b>, <b>joi</b>, <b>express-validator</b>) and call it first in the handler or as middleware.</p>`,
  clues: [
    '"Return 400 with a list of what is wrong" - collect all field errors, do not fail fast',
    '"Required field missing / title blank / year negative" - bean validation annotations or a schema',
    '"What is the difference between 400 and 409/422?" - malformed/invalid input vs valid input that conflicts with existing state',
    '"Never trust the client" / "frontend already validates" - server-side validation is mandatory',
    '"Mass assignment / extra fields in the body" - whitelist fields and reject or ignore unknown ones'
  ],
  code: [
    { lang: 'java', title: 'Spring Boot - declarative validation on the request record', check: false, code: `import jakarta.validation.constraints.*;   // Spring Boot 3+ uses jakarta.*, older used javax.*

public record BookRequest(

        @NotBlank(message = "title is required")
        @Size(max = 100, message = "title must be at most 100 characters")
        String title,

        @NotBlank(message = "author is required")
        @Size(max = 60, message = "author must be at most 60 characters")
        String author,

        @NotNull(message = "year is required")
        @Min(value = 1000, message = "year must be at least 1000")
        @Max(value = 2026, message = "year must be at most 2026")
        Integer year
) {}

@PostMapping
public ResponseEntity<Book> create(@Valid @RequestBody BookRequest body) {   // @Valid triggers the checks
    // If we get here, body is already valid.
    Book saved = service.create(body);
    return ResponseEntity.created(URI.create("/api/books/" + saved.id())).body(saved);
}

// Validating path/query values too: put @Validated on the controller class
@GetMapping
public List<Book> list(@RequestParam(defaultValue = "1") @Min(1) int page) {
    return service.findPage(page);
}` },
    { lang: 'js', title: 'Express - a hand-written validator used in the route', check: false, code: `// validators/book.js
export function validateBook(body) {
  const errors = [];                                  // collect, do not throw at the first problem
  const b = body && typeof body === 'object' ? body : {};

  if (typeof b.title !== 'string' || b.title.trim() === '') {
    errors.push({ field: 'title', message: 'title is required' });
  } else if (b.title.length > 100) {
    errors.push({ field: 'title', message: 'title must be at most 100 characters' });
  }
  if (typeof b.author !== 'string' || b.author.trim() === '') {
    errors.push({ field: 'author', message: 'author is required' });
  }
  if (!Number.isInteger(b.year)) {
    errors.push({ field: 'year', message: 'year must be a whole number' });
  } else if (b.year < 1000 || b.year > 2026) {
    errors.push({ field: 'year', message: 'year must be between 1000 and 2026' });
  }
  return errors;
}

// routes/books.js
router.post('/', (req, res) => {
  const errors = validateBook(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ status: 400, error: 'Validation failed', details: errors });
  }
  res.status(201).json(service.create(req.body));
});` },
    { lang: 'js', run: true, title: 'Runnable model: collect ALL validation errors', code: `// Rules are data: [field, test, message]. The engine runs every rule and collects failures.
var rules = [
  ['title',  function (v) { return typeof v === 'string' && v.trim() !== ''; }, 'title is required'],
  ['title',  function (v) { return typeof v !== 'string' || v.length <= 100; }, 'title must be at most 100 characters'],
  ['author', function (v) { return typeof v === 'string' && v.trim() !== ''; }, 'author is required'],
  ['year',   function (v) { return Number.isInteger(v); }, 'year must be a whole number'],
  ['year',   function (v) { return !Number.isInteger(v) || (v >= 1000 && v <= 2026); }, 'year must be between 1000 and 2026']
];

function validate(body) {
  var b = body && typeof body === 'object' ? body : {};
  var errors = [];
  rules.forEach(function (r) {
    if (!r[1](b[r[0]])) errors.push({ field: r[0], message: r[2] });   // keep going: collect everything
  });
  return errors;
}

function handlePost(body) {
  var errors = validate(body);
  if (errors.length) return { status: 400, error: 'Validation failed', details: errors };
  return { status: 201, book: { id: 1, title: body.title, author: body.author, year: body.year } };
}

console.log(JSON.stringify(handlePost({ title: 'Dune', author: 'Frank Herbert', year: 1965 })));
console.log(JSON.stringify(handlePost({ title: '  ', year: 3000 }), null, 2));
console.log(JSON.stringify(handlePost('not an object')));` }
  ],
  codeTitle: ['Spring: @Valid + constraints', 'Express: hand-written validator', 'Validator model (runnable)'],
  viz: {
    title: 'Validation errors being collected, then returned as one 400',
    input: 'title=;author=Frank Herbert;year=3000',
    inputLabel: 'Fields as name=value separated by ; (leave a value empty to test "required"). Try year=abc',
    gen: function (input) {
      var body = {};
      String(input).split(';').forEach(function (kv) {
        var i = kv.indexOf('='); if (i < 0) return;
        body[kv.slice(0, i).trim()] = kv.slice(i + 1).trim();
      });
      var rules = [
        ['title', 'required (not blank)', function (v) { return v !== undefined && v !== ''; }],
        ['title', 'max 100 chars', function (v) { return !v || v.length <= 100; }],
        ['author', 'required (not blank)', function (v) { return v !== undefined && v !== ''; }],
        ['year', 'whole number', function (v) { return /^-?\d+$/.test(v || ''); }],
        ['year', 'between 1000 and 2026', function (v) { return !/^-?\d+$/.test(v || '') || (Number(v) >= 1000 && Number(v) <= 2026); }]
      ];
      var rows = [], errs = [], hl = {}, frames = [];
      function rt() { return { type: 'table', label: 'Rules checked so far', columns: ['field', 'rule', 'value', 'result'], rows: rows.map(function (r) { return r.slice(); }), hl: JSON.parse(JSON.stringify(hl)) }; }
      function et() { return { type: 'table', label: 'Error list (collected)', columns: ['field', 'message'], rows: errs.length ? errs.map(function (e) { return e.slice(); }) : [['(none yet)', '']], hl: errs.length ? { 0: 'bad' } : {} }; }
      frames.push({ narr: 'The request body is parsed into fields. We will run <b>every</b> rule and <b>collect</b> failures instead of stopping at the first one.', parts: [{ type: 'vars', label: 'Parsed body', vals: { title: body.title === undefined ? '(missing)' : '"' + body.title + '"', author: body.author === undefined ? '(missing)' : '"' + body.author + '"', year: body.year === undefined ? '(missing)' : '"' + body.year + '"' } }, et()] });
      rules.forEach(function (r) {
        var v = body[r[0]], ok = r[2](v), idx = rows.length;
        var msg = r[0] + ' ' + (r[1] === 'required (not blank)' ? 'is required' : r[1] === 'max 100 chars' ? 'must be at most 100 characters' : r[1] === 'whole number' ? 'must be a whole number' : 'must be between 1000 and 2026');
        rows.push([r[0], r[1], v === undefined ? '(missing)' : '"' + v + '"', ok ? 'PASS' : 'FAIL']);
        hl[idx] = ok ? 'ok' : 'bad';
        if (!ok) errs.push([r[0], msg]);
        frames.push({ narr: 'Rule <b>' + r[0] + ': ' + r[1] + '</b> on value ' + (v === undefined ? '<i>missing</i>' : '<code>' + H.esc(v) + '</code>') + ' - ' + (ok ? '<span class="c-g">passes</span>.' : '<span class="c-r">fails</span>; add "' + msg + '" to the error list and <b>keep going</b>.'), parts: [rt(), et(), { type: 'vars', vals: { errors: errs.length } , hl: { errors: errs.length ? 'bad' : 'ok' } }] });
      });
      if (!errs.length) {
        frames.push({ narr: 'No errors. The controller continues into the service: the request is <b>valid</b>. Next stop is <span class="c-g">201 Created</span> (assuming no business-rule conflict).', parts: [rt(), et(), { type: 'vars', vals: { status: '201 Created' }, hl: { status: 'ok' } }] });
      } else {
        frames.push({ narr: 'All rules done: <b>' + errs.length + '</b> problem(s). The service is <b>never called</b>. We answer once with <span class="c-r">400 Bad Request</span> and the whole list, so the client can fix everything in one go.', parts: [et(), { type: 'text', label: 'Response body', html: '<pre>' + H.esc(JSON.stringify({ status: 400, error: 'Validation failed', details: errs.map(function (e) { return { field: e[0], message: e[1] }; }) }, null, 1)) + '</pre>' }, { type: 'vars', vals: { status: '400 Bad Request' }, hl: { status: 'bad' } }] });
      }
      return frames;
    }
  },
  examples: [
    { title: 'curl proof: one request, three errors', html: `<p>Send a body with a blank title, no author and an impossible year. A good API answers <b>once</b> with all three problems.</p>`,
      code: [{ lang: 'bash', check: false, code: `curl -i -X POST localhost:8080/api/books \\
  -H "Content-Type: application/json" \\
  -d '{"title":"  ","year":3000}'` }, { lang: 'json', title: 'Expected 400 body', code: `{
  "status": 400,
  "error": "Validation failed",
  "details": [
    { "field": "title", "message": "title is required" },
    { "field": "author", "message": "author is required" },
    { "field": "year", "message": "year must be at most 2026" }
  ]
}` }] },
    { title: 'Validation vs business rule: duplicate ISBN', html: `<p>Is "ISBN already exists" a validation error? No - the request on its own is fine; it clashes with <i>data we already hold</i>. That check needs the repository, so it lives in the <b>service</b> and answers <span class="c-r">409 Conflict</span>. A common bug is checking it in the controller "because it is validation" - then a second entry point (a batch import, a queue consumer) forgets the check.</p>`,
      code: { lang: 'java', check: false, code: `// BookService
public Book create(BookRequest req) {
    if (repo.existsByIsbn(req.isbn())) {
        throw new DuplicateIsbnException(req.isbn());   // mapped to 409 by the error handler
    }
    return repo.save(new Book(null, req.title(), req.author(), req.year()));
}` } },
    { title: 'Using a schema library in Express (zod)', html: `<p>Hand-written validators get long. Libraries describe the shape once and give you parsing <i>and</i> type conversion. The pattern is the same: parse; if it fails, collect issues and return 400; if it passes, use the clean data.</p>`,
      code: { lang: 'js', check: false, code: `import { z } from 'zod';

const BookSchema = z.object({
  title: z.string().trim().min(1, 'title is required').max(100),
  author: z.string().trim().min(1, 'author is required').max(60),
  year: z.number().int().min(1000).max(2026)
}).strict();                                  // reject unknown fields (stops mass assignment)

export function validateBody(schema) {        // reusable middleware
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.issues.map(i => ({ field: i.path.join('.'), message: i.message }));
      return res.status(400).json({ status: 400, error: 'Validation failed', details });
    }
    req.body = result.data;                   // cleaned, trimmed, typed
    next();
  };
}
// router.post('/', validateBody(BookSchema), createBook);` } },
    { title: 'Edge cases a thorough validator remembers', html: `${H.table(['Input', 'Gotcha', 'Defence'], [['<code>"title": 123</code>', 'a number, not a string', 'check the <i>type</i> before the length'], ['<code>"year": "1965"</code>', 'string that looks like a number', 'decide: reject or convert, but be consistent'], ['<code>"title": "   "</code>', 'blank is not empty', 'trim before checking'], ['body is <code>null</code>, <code>[]</code> or missing', 'not an object at all', 'guard first, then read fields'], ['10 MB title', 'denial of service', 'body size limit + max length'], ['extra field <code>"role":"admin"</code>', 'mass assignment', 'whitelist / strict schema']])}` }
  ],
  deepDive: `<p><b>How Bean Validation works.</b> The annotations (<code>@NotBlank</code>...) only <i>describe</i> rules. At runtime a <code>Validator</code> (Hibernate Validator is the reference implementation) reflects over the object, runs each constraint, and returns a set of violations. Spring's <code>@Valid</code> on a parameter triggers it right after Jackson builds the object, and throws <code>MethodArgumentNotValidException</code> holding a <code>BindingResult</code> with one <code>FieldError</code> per violation - exactly the list you turn into the 400 body in the error-handling topic. For records, constraints go on the record components.</p>
  <p><b>Custom constraints.</b> When a rule is reused ("valid ISBN-13 with check digit"), write an annotation plus a <code>ConstraintValidator</code>. Cross-field rules ("endDate after startDate") use a class-level constraint or an <code>@AssertTrue</code> method. Groups (<code>@Validated(OnCreate.class)</code>) let create and update share one DTO with different rules - but two DTOs are usually clearer.</p>
  <p><b>Fail fast or collect?</b> Collecting all errors is friendlier for forms and rarely costs anything. Fail fast is right for expensive checks (a database lookup) - run cheap shape checks first, and only if they pass run costly ones. Never run a database query on input that already failed shape validation.</p>
  <p><b>Validation is not sanitisation and not escaping.</b> Validating that a title is under 100 characters does <i>not</i> make it safe to put into HTML or SQL. Output must be escaped for its destination (HTML encoding, parameterised queries - next module). Defence in depth means validate on input <i>and</i> encode on output.</p>
  <p><b>Allow-lists beat block-lists.</b> "Reject titles containing <code>&lt;script&gt;</code>" will be bypassed; "titles may contain letters, digits, spaces and these 10 punctuation marks" is robust. Be careful with regexes: a badly written pattern on user input can take exponential time (ReDoS) - keep patterns simple and inputs length-capped <i>before</i> the regex runs.</p>
  <p><b>Error messages are a contract.</b> Keep <code>field</code> names equal to the JSON keys the client sent so forms can highlight the right box; add a stable machine-readable <code>code</code> (<code>"TITLE_REQUIRED"</code>) if you support multiple languages. Do not echo raw input back unescaped, and never include internal class names in messages.</p>`,
  aiEra: `<p><b>What AI changes:</b> AI can read your DTO and list every edge case in seconds, and generate exhaustive validation tests (a table of 30 bad inputs). That makes thorough validation cheap - there is no longer an excuse for "I'll add it later".</p>
  <p><b>Use AI as a partner:</b> <code>Here is my BookRequest record. Produce a table of invalid inputs (type, size, range, null, blank, unicode, huge) with the expected error message for each.</code> Then turn that table into real tests.</p>
  <p><b>Where AI goes wrong:</b> it validates only the happy-path fields it can see, forgets <code>@Valid</code> on the parameter (so every annotation is silently ignored!), uses <code>javax.validation</code> imports in a Spring Boot 3 project (compile error), checks business rules in the controller, or writes a regex with catastrophic backtracking. It also tends to fail fast, returning only the first error.</p>
  <p><b>Also remember:</b> when you build features that accept AI-model output (summaries, extracted fields), validate that output exactly like user input - schema, length, allowed values - because a model can return malformed or malicious text.</p>
  <p><b>What you must still own:</b> deciding the rules and their limits, and proving each one with a test that sends a bad value and expects a 400.</p>`,
  problems: [{
    title: 'Add Validation That Reports Every Error', level: 'Medium', tags: ['validation', '400', 'spring', 'express'], lang: 'java',
    statement: `<p>Your <code>POST /api/books</code> currently accepts anything. Add validation: <code>title</code> required and at most 100 chars, <code>author</code> required, <code>year</code> a whole number between 1000 and 2026. When the body is invalid the API must answer <code>400</code> with <i>all</i> problems in one response using the shape <code>{status, error, details:[{field, message}]}</code>, and must <b>not</b> call the service. Give the Spring and the Express solution and the curl command that proves it.</p>`,
    constraints: `Reject unknown types (e.g. title as a number). Do not stop at the first error. Messages must name the field. Service code must stay free of HTTP concerns.`,
    example: `<p>Body <code>{"title":"","year":"x"}</code> gives:</p>${H.table(['field', 'message'], [['title', 'title is required'], ['author', 'author is required'], ['year', 'year must be a whole number']])}<p>Three errors, one 400.</p>`,
    brute: { why: `<p>The naive version throws at the first failing <code>if</code> (<code>if (!title) return res.status(400)...</code>). A user with three mistakes needs three round trips, and each if-block is copy-pasted into every endpoint that accepts a book (create and update), so the rules drift apart over time.</p>` },
    mcq: { q: 'Where should the rule "year between 1000 and 2026" live?', options: ['On the request DTO / a validator called before the service', 'Only in the browser JavaScript', 'In the SQL database only', 'Inside the repository class'], answer: 0, explain: 'Shape rules belong at the edge (DTO/validator) so invalid data never reaches the service; the browser check is only a courtesy and the DB constraint is the last safety net.' },
    hints: [
      `<p>Hint 1: validation is a function from "body" to "list of errors". Empty list means valid. Write that function before touching the routes.</p>`,
      `<p>Hint 2: Spring - constraint annotations on the record plus <code>@Valid</code> on the parameter, then an exception handler that reads the field errors. Express - an array <code>errors</code> you push to in every rule, never returning early.</p>`,
      `<p>Hint 3: check the type before the value (<code>typeof</code>/<code>Number.isInteger</code>) so a number given as title does not crash <code>.trim()</code>. Test with: valid body, empty body <code>{}</code>, wrong types, and a 200-character title.</p>`
    ],
    solution: {
      approach: `<p><b>Plan:</b> treat validation as a pure function <code>body -> errors[]</code>, call it first, and answer 400 if the list is non-empty. In <b>Spring</b> put the constraints on <code>BookRequest</code>, add <code>@Valid</code>, and write one <code>@ExceptionHandler(MethodArgumentNotValidException)</code> that maps each <code>FieldError</code> to <code>{field, message}</code> (shown in the next topic). In <b>Express</b> write <code>validateBook(body)</code> that pushes to an array for each broken rule, and return <code>res.status(400).json({...details})</code> if it has entries; otherwise call the service.</p>
      <p><b>Why it is correct:</b> every rule runs, so all errors are reported; the service is only reached with data that already satisfies the shape rules; the type is tested before the value, so wrong types produce an error rather than an exception (which would wrongly be a 500).</p>
      <p><b>Prove it:</b> five curl commands - valid (201), empty body (400, 3 errors), wrong types (400), long title (400), unknown extra field (ignored or 400 by policy).</p>`,
      code: { lang: 'js', check: false, code: `router.post('/', (req, res) => {
  const errors = validateBook(req.body);           // [] when valid
  if (errors.length) {
    return res.status(400).json({ status: 400, error: 'Validation failed', details: errors });
  }
  return res.status(201).json(service.create(req.body));
});` },
      alt: [{ lang: 'java', check: false, code: `@PostMapping
public ResponseEntity<Book> create(@Valid @RequestBody BookRequest body) {
    return ResponseEntity.status(201).body(service.create(body));
}` }],
      complexity: `<p>O(number of rules) per request - microseconds. The saved cost is the database round trips avoided for bad input.</p>`,
      followUps: ['How would you make the same rules apply to PUT?', 'How do you validate query parameters like page and size?']
    }
  }]
});

/* ============================================================
   TOPIC 5 — Error handling
   ============================================================ */
topics.push({
  title: 'Error Handling: Exceptions to Clean HTTP Errors (Global Handler)',
  analogy: `<p>A <b>hospital emergency room</b>. Anyone in the building can shout "Emergency!" (throw an exception) - the cleaner, the nurse, the lab. They do <b>not</b> each phone the patient's family. Instead the alarm travels up to <b>one triage desk</b> that decides: "broken arm → Ward 3, family gets a calm note", "unknown cause → critical, family gets a polite generic message, doctors get the full chart". Your <b>global error handler</b> is that triage desk: one place that turns any exception into the right status code and a safe, consistent message, while the full details go only to the staff (your logs).</p>`,
  explain: `<p>Without a plan, errors reach the client as ugly stack traces (HTML pages with class names - a gift to attackers), random status codes, or hanging requests. The plan has four parts:</p>
  <ol>
    <li><b>Throw meaningful exceptions from the service</b>: <code>BookNotFoundException</code>, <code>DuplicateIsbnException</code>. They carry <i>what happened</i>, not an HTTP code - the service does not know HTTP exists.</li>
    <li><b>Catch them in one global place</b>: Spring <code>@RestControllerAdvice</code>; Express <b>error-handling middleware</b> with four arguments <code>(err, req, res, next)</code> registered <i>last</i>.</li>
    <li><b>Map each exception type to a status + a consistent JSON body.</b></li>
    <li><b>Hide the unexpected</b>: anything you did not plan for becomes <span class="c-p">500</span> with a generic message; the full stack trace is logged on the server with a request id.</li>
  </ol>
  ${H.table(['Exception', 'Meaning', 'Status', 'Client sees'], [
    ['<code>BookNotFoundException</code>', 'id does not exist', '<span class="c-r">404</span>', '"Book 9 does not exist"'],
    ['validation failure', 'bad input fields', '<span class="c-r">400</span>', 'list of field errors'],
    ['<code>DuplicateIsbnException</code>', 'clashes with existing data', '<span class="c-r">409</span>', '"ISBN already exists"'],
    ['unreadable JSON', 'cannot parse the body', '<span class="c-r">400</span>', '"Malformed JSON request"'],
    ['anything else (a bug)', 'our fault: NPE, DB down...', '<span class="c-p">500</span>', '"Something went wrong" + id (<b>no details</b>)']
  ])}
  <p><b>One error shape for everyone:</b> <code>{"status":404,"error":"Not Found","message":"Book 9 does not exist","path":"/api/books/9"}</code>. Always the same keys, so clients need one parser.</p>
  <p><b>Also needed:</b> a <b>404 handler for unknown routes</b> (in Express a normal middleware after all routes that makes a 404 error; Spring does it for you) and handling of <b>async errors</b> (Express 5 forwards rejected promises to the handler automatically; Express 4 needs <code>try/catch + next(err)</code>).</p>
  <p><b>The golden rules:</b> never leak stack traces, SQL or file paths to clients; never swallow an exception (an empty <code>catch</code> turns a bug into mystery behaviour); log once, at the handler; and use <b>4xx for client mistakes, 5xx for server faults</b> so alerts only fire for real problems.</p>`,
  clues: [
    '"Return a consistent error format across the API" - one global handler + one ErrorResponse shape',
    '"Users see a stack trace / Whitelabel Error Page" - missing global handler; never expose internals',
    '"404 vs 500 for a missing id" - missing resource is a client-facing 404; unexpected crash is 500',
    '"Express async route crashes the process / request hangs" - unhandled rejection; Express 5 handles it, Express 4 needs try/catch + next(err)',
    '"Where do you log the exception?" - once, in the handler, with a correlation id the client also receives'
  ],
  code: [
    { lang: 'java', title: 'Spring Boot - custom exceptions + @RestControllerAdvice', check: false, code: `// 1) Domain exceptions: no HTTP in them
public class BookNotFoundException extends RuntimeException {
    public BookNotFoundException(long id) { super("Book " + id + " does not exist"); }
}
public class DuplicateIsbnException extends RuntimeException {
    public DuplicateIsbnException(String isbn) { super("A book with ISBN " + isbn + " already exists"); }
}

// 2) One shape for every error
public record ErrorResponse(int status, String error, String message, String path, List<FieldIssue> details) {
    public record FieldIssue(String field, String message) {}
}

// 3) The triage desk
@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(BookNotFoundException.class)
    public ResponseEntity<ErrorResponse> notFound(BookNotFoundException ex, HttpServletRequest req) {
        return build(HttpStatus.NOT_FOUND, ex.getMessage(), req, null);
    }

    @ExceptionHandler(DuplicateIsbnException.class)
    public ResponseEntity<ErrorResponse> conflict(DuplicateIsbnException ex, HttpServletRequest req) {
        return build(HttpStatus.CONFLICT, ex.getMessage(), req, null);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)       // thrown when @Valid fails
    public ResponseEntity<ErrorResponse> invalid(MethodArgumentNotValidException ex, HttpServletRequest req) {
        List<ErrorResponse.FieldIssue> issues = ex.getBindingResult().getFieldErrors().stream()
                .map(f -> new ErrorResponse.FieldIssue(f.getField(), f.getDefaultMessage()))
                .toList();
        return build(HttpStatus.BAD_REQUEST, "Validation failed", req, issues);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)       // broken JSON
    public ResponseEntity<ErrorResponse> unreadable(HttpMessageNotReadableException ex, HttpServletRequest req) {
        return build(HttpStatus.BAD_REQUEST, "Malformed JSON request", req, null);
    }

    @ExceptionHandler(Exception.class)                              // the safety net: bugs
    public ResponseEntity<ErrorResponse> unexpected(Exception ex, HttpServletRequest req) {
        log.error("Unhandled error on {} {}", req.getMethod(), req.getRequestURI(), ex);   // full detail: server log only
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "Something went wrong", req, null);  // safe text for the client
    }

    private ResponseEntity<ErrorResponse> build(HttpStatus s, String msg, HttpServletRequest req,
                                                List<ErrorResponse.FieldIssue> details) {
        return ResponseEntity.status(s)
                .body(new ErrorResponse(s.value(), s.getReasonPhrase(), msg, req.getRequestURI(), details));
    }
}` },
    { lang: 'js', title: 'Express - AppError + 404 handler + error middleware', check: false, code: `// errors.js
export class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;          // the HTTP status this error maps to
    this.details = details;        // optional list of field issues
  }
}
export const notFound = (id) => new AppError(404, 'Book ' + id + ' does not exist');
export const conflict = (isbn) => new AppError(409, 'A book with ISBN ' + isbn + ' already exists');

// app.js  -- order is everything: routes first, then 404, then the error handler LAST
app.use('/api/books', booksRouter);

app.use((req, res, next) => {                      // reaches here only if no route matched
  next(new AppError(404, 'No route for ' + req.method + ' ' + req.originalUrl));
});

app.use((err, req, res, next) => {                 // FOUR parameters = error handler
  if (res.headersSent) return next(err);           // too late to change the response; let Express close it

  // body-parser puts status 400 on malformed JSON errors
  const status = err instanceof AppError ? err.status : (err.type === 'entity.parse.failed' ? 400 : 500);

  if (status >= 500) {
    console.error('Unhandled error on ' + req.method + ' ' + req.originalUrl, err);   // full detail: logs only
  }
  res.status(status).json({
    status,
    error: status === 500 ? 'Internal Server Error' : (err instanceof AppError ? err.message : 'Bad Request'),
    message: status === 500 ? 'Something went wrong' : err.message,   // never leak internals on 500
    path: req.originalUrl,
    details: err.details
  });
});

// Express 5: an async handler that throws or rejects reaches the handler above automatically.
router.get('/:id', async (req, res) => {
  res.json(await service.findById(Number(req.params.id)));   // throws AppError(404) -> handled
});` },
    { lang: 'js', run: true, title: 'Runnable model: exception -> status -> response', code: `// The "triage desk" in plain JS: map thrown errors to HTTP responses.
class AppError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function errorHandler(err, path) {
  if (err instanceof AppError) {
    return { status: err.status, body: { status: err.status, message: err.message, path: path } };
  }
  if (err instanceof SyntaxError) {
    return { status: 400, body: { status: 400, message: 'Malformed JSON request', path: path } };
  }
  // Unknown = a bug. Full detail to the log, generic text to the client.
  console.log('  [server log only] ' + err.stack.split('\\n')[0]);
  return { status: 500, body: { status: 500, message: 'Something went wrong', path: path } };
}

function handle(path, work) {
  try { return { status: 200, body: work() }; }      // happy path
  catch (e) { return errorHandler(e, path); }         // every exception ends up here
}

var books = { 1: 'Dune' };
function findById(id) {
  if (!books[id]) throw new AppError(404, 'Book ' + id + ' does not exist');
  return { id: id, title: books[id] };
}

console.log(JSON.stringify(handle('/api/books/1', function () { return findById(1); })));
console.log(JSON.stringify(handle('/api/books/9', function () { return findById(9); })));
console.log(JSON.stringify(handle('/api/books', function () { return JSON.parse('{"title":'); })));
console.log(JSON.stringify(handle('/api/books/2', function () { return null.title; })));` }
  ],
  codeTitle: ['Spring: @RestControllerAdvice', 'Express: error middleware', 'Error mapping model (runnable)'],
  viz: {
    title: 'An exception travels up and is mapped to an HTTP error response',
    input: 'not-found',
    inputLabel: 'Scenario: not-found | validation | conflict | bad-json | bug',
    gen: function (input) {
      var sc = String(input).trim().toLowerCase();
      var S = {
        'not-found': { thrown: 'BookNotFoundException(9)', at: 'BookService.findById', row: 0, status: '404 Not Found', msg: 'Book 9 does not exist', log: false },
        'validation': { thrown: 'MethodArgumentNotValidException', at: 'Spring @Valid (before controller body)', row: 1, status: '400 Bad Request', msg: 'Validation failed + field list', log: false },
        'conflict': { thrown: 'DuplicateIsbnException', at: 'BookService.create', row: 2, status: '409 Conflict', msg: 'ISBN already exists', log: false },
        'bad-json': { thrown: 'HttpMessageNotReadableException', at: 'JSON parser (before controller)', row: 3, status: '400 Bad Request', msg: 'Malformed JSON request', log: false },
        'bug': { thrown: 'NullPointerException', at: 'BookRepository.save', row: 4, status: '500 Internal Server Error', msg: 'Something went wrong (generic!)', log: true }
      };
      var s = S[sc];
      if (!s) throw new Error('Use one of: not-found, validation, conflict, bad-json, bug');
      var map = [
        ['BookNotFoundException', '404 Not Found'], ['MethodArgumentNotValidException', '400 Bad Request'],
        ['DuplicateIsbnException', '409 Conflict'], ['HttpMessageNotReadableException', '400 Bad Request'],
        ['Exception (anything else)', '500 Internal Server Error']
      ];
      var chain = [s.at + '  [throw ' + s.thrown + ']', 'BookController method', 'DispatcherServlet / Express router', '@RestControllerAdvice / error middleware'];
      function q(pos) { var hl = {}; for (var i = 0; i < chain.length; i++) hl[i] = i < pos ? 'done' : (i === pos ? 'cur' : ''); return { type: 'queue', label: 'Exception travelling up the call chain', items: chain, frontLabel: 'where thrown', backLabel: 'global handler', hl: hl }; }
      function mt(sel) { var hl = {}; if (sel !== null) hl[sel] = 'sel'; return { type: 'table', label: 'Handler mapping: exception type -> HTTP status', columns: ['exception type', 'status'], rows: map, hl: hl }; }
      var frames = [];
      frames.push({ narr: 'A request is running. Somewhere deep, something goes wrong: <b>' + s.thrown + '</b> is thrown in <code>' + s.at + '</code>. The code there does <b>not</b> build a response - it just raises the alarm.', parts: [q(0)] });
      frames.push({ narr: 'No <code>catch</code> in the service, so the exception <b>unwinds</b> to the caller: the controller. It has no <code>try/catch</code> either (controllers should stay thin).', parts: [q(1)] });
      frames.push({ narr: 'It reaches the framework (DispatcherServlet in Spring, the router in Express). The normal "return the result" path is abandoned; the framework now looks for an <b>error handler</b>.', parts: [q(2)] });
      frames.push({ narr: 'The <b>global handler</b> receives it. Time to decide the status code by looking at the <i>type</i> of the exception.', parts: [q(3), mt(null)] });
      frames.push({ narr: 'Match found: <code>' + s.thrown.replace(/\(.*\)/, '') + '</code> maps to <b>' + s.status + '</b>.' + (s.log ? ' This is an <i>unplanned</i> exception, so the handler falls to the safety net.' : ''), parts: [mt(s.row)] });
      if (s.log) frames.push({ narr: '<span class="c-p">Unexpected = a bug.</span> The handler writes the <b>full stack trace to the server log</b> (with a request id) but sends the client only a generic message. Leaking <code>NullPointerException at BookRepository.java:42</code> would help attackers.', parts: [mt(s.row), { type: 'vars', label: 'Where the details go', vals: { 'server log': 'full stack trace + requestId', 'client response': 'generic message only' }, hl: { 'server log': 'cur', 'client response': 'ok' } }] });
      frames.push({ narr: 'The handler builds the one-shape JSON error and writes it. Status <b>' + s.status + '</b>, message "' + s.msg + '". The client gets a clean, predictable response instead of a stack trace.', parts: [{ type: 'vars', label: 'HTTP response', vals: { status: s.status, 'Content-Type': 'application/json', message: s.msg }, hl: { status: s.status.charAt(0) === '5' ? 'bad' : 'cur' } }, { type: 'text', label: 'Body', html: '<pre>' + H.esc(JSON.stringify({ status: Number(s.status.slice(0, 3)), error: s.status.slice(4), message: s.msg, path: '/api/books/9' }, null, 1)) + '</pre>' }] });
      return frames;
    }
  },
  examples: [
    { title: 'The same 404 in both stacks (curl view)', html: `<p>Whatever framework you use, the client must see exactly the same shape:</p>`,
      code: [{ lang: 'bash', check: false, code: `curl -i localhost:8080/api/books/999
curl -i localhost:3000/api/books/999` }, { lang: 'json', title: 'Both return', code: `{
  "status": 404,
  "error": "Not Found",
  "message": "Book 999 does not exist",
  "path": "/api/books/999"
}` }] },
    { title: 'Express 4 vs 5: async errors', html: `<p>In Express 4, an error thrown <i>after an <code>await</code></i> was never caught: the request hung and the process could crash with an unhandled rejection. Express 5 forwards rejected promises to your error handler. If you still support Express 4, wrap handlers or use a tiny helper.</p>`,
      code: { lang: 'js', check: false, code: `// Express 4 style helper (harmless in Express 5)
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get('/:id', wrap(async (req, res) => {
  res.json(await service.findById(Number(req.params.id)));
}));` } },
    { title: 'Spring Boot 3: ProblemDetail (standard error format)', html: `<p>Spring 6 / Boot 3 can return the standard <b>Problem Details</b> JSON (RFC 9457: <code>type</code>, <code>title</code>, <code>status</code>, <code>detail</code>, <code>instance</code>). Use it if clients expect the standard; keep your own record if you need extra fields. Either way: <b>one</b> shape.</p>`,
      code: { lang: 'java', check: false, code: `@ExceptionHandler(BookNotFoundException.class)
public ProblemDetail notFound(BookNotFoundException ex) {
    ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
    pd.setTitle("Book not found");
    return pd;                       // Content-Type: application/problem+json
}` } },
    { title: 'Common mistakes (spot them)', html: `${H.table(['Mistake', 'Why it hurts', 'Fix'], [['<code>catch (Exception e) {}</code>', 'bug disappears silently', 'let it propagate or log + rethrow'], ['<code>res.status(200).json({error})</code>', 'monitoring thinks all is fine', 'real 4xx/5xx status'], ['<code>res.status(500).json(err)</code>', 'leaks stack and internals', 'generic message, log details'], ['error middleware registered before routes', 'never runs', 'register last'], ['3-parameter error middleware', 'Express treats it as normal middleware', 'must have exactly 4 params'], ['logging at every layer', 'one error, five log lines', 'log once, in the handler']])}` }
  ],
  deepDive: `<p><b>How Spring finds the handler.</b> When a controller throws, <code>DispatcherServlet</code> asks its list of <code>HandlerExceptionResolver</code>s. <code>ExceptionHandlerExceptionResolver</code> looks through your <code>@ControllerAdvice</code> beans for the <b>most specific</b> <code>@ExceptionHandler</code> whose declared type matches the thrown exception (so a handler for <code>BookNotFoundException</code> beats one for <code>RuntimeException</code>, which beats <code>Exception</code>). If none matches, the error goes to Boot's <code>/error</code> page (the "Whitelabel" page, or JSON for API clients) - the thing you replaced.</p>
  <p><b>Checked vs unchecked.</b> In Spring, runtime (unchecked) exceptions roll back <code>@Transactional</code> methods by default; checked exceptions do not unless configured. That is a strong reason to make domain exceptions extend <code>RuntimeException</code>: a "not found" or "conflict" in the middle of a transaction then correctly rolls it back.</p>
  <p><b>Express error flow.</b> <code>next(err)</code> (or a thrown error in sync code) makes Express skip all remaining <i>normal</i> middleware and jump to the next middleware with <b>four</b> parameters. You can have several error middlewares (log, then map, then fallback); each calls <code>next(err)</code> to pass it on. The signature is how Express tells them apart, so an unused <code>next</code> parameter must stay in the list. If headers were already sent (streaming), you cannot change the status - delegate to the default handler with <code>next(err)</code>.</p>
  <p><b>Correlation ids.</b> Generate (or accept) an id per request (<code>X-Request-Id</code>), put it in every log line and in the 500 response body. When a customer reports "it said something went wrong", support asks for the id and you find the exact stack trace in seconds. This is the seed of the observability module.</p>
  <p><b>Retry-friendly design.</b> Clients and gateways retry <code>5xx</code> and timeouts but should not retry <code>4xx</code>. For overload use <span class="c-p">503</span> with <code>Retry-After</code>; for rate limits use <span class="c-r">429</span>. A wrong status code can cause retry storms (a 500 for a validation error makes clients hammer you).</p>
  <p><b>Process-level safety.</b> In Node, install handlers for <code>unhandledRejection</code>/<code>uncaughtException</code> that log and then exit so the orchestrator restarts a clean process - after an uncaught exception, program state is unreliable. In Java, uncaught exceptions in other threads (schedulers, async tasks) are not seen by <code>@ControllerAdvice</code>; they need their own handling.</p>
  <p><b>Security angle.</b> Error responses are a classic information leak (OWASP "Security Misconfiguration"): stack traces, SQL fragments, library versions, internal hostnames. Also keep messages from distinguishing "user does not exist" from "wrong password" on login endpoints.</p>`,
  aiEra: `<p><b>What AI changes:</b> AI assistants can read a stack trace and explain the root cause in seconds, and can generate a complete exception-handler class. Your logs and error messages are now also read by AI tools (log analysers, on-call copilots), so clear, structured errors with ids help the machines as well as humans.</p>
  <p><b>Use AI as a partner:</b> paste a <i>sanitised</i> stack trace and ask <code>What is the most likely root cause and what is one experiment to confirm it?</code> Ask it to review your handler: <code>List every exception type this API can produce that is not mapped, and what status each should get.</code></p>
  <p><b>Where AI goes wrong:</b> it writes <code>catch (Exception e) { return ResponseEntity.ok(e.getMessage()); }</code>, returns raw <code>e.toString()</code> to clients, registers Express error middleware with three parameters, puts the handler before the routes, and handles every exception as 400 or 500 only. It may also suggest logging full request bodies, which leaks personal data.</p>
  <p><b>Privacy rule for AI debugging:</b> before pasting logs into a chat tool, remove tokens, emails, passwords and customer data; use placeholders such as <code>&lt;redacted&gt;</code>.</p>
  <p><b>What you must still own:</b> the mapping table (which failure means which status) and the rule "never leak internals". The AI can type the handler; it cannot know your product's error contract.</p>`,
  problems: [{
    title: 'Build the Global Error Handler', level: 'Medium', tags: ['error handling', 'exceptions', 'spring', 'express'], lang: 'java',
    statement: `<p>Your Books API currently returns Whitelabel/HTML stack traces. Add a global error handler to <b>both</b> stacks so that: unknown book id gives <code>404</code>, duplicate ISBN gives <code>409</code>, validation failure gives <code>400</code> with field details, broken JSON gives <code>400</code>, unknown route gives <code>404</code>, and any other exception gives <code>500</code> with a <i>generic</i> message while the real error is logged. All responses use the same JSON shape. List the curl command that triggers each case.</p>`,
    constraints: `No try/catch in controllers. The service must not import any HTTP classes. The 500 response must never contain a stack trace, class name or SQL.`,
    example: `${H.table(['curl', 'Status', 'message'], [['<code>GET /api/books/999</code>', '404', 'Book 999 does not exist'], ['<code>POST</code> with <code>{"title":}</code>', '400', 'Malformed JSON request'], ['<code>GET /api/boooks</code>', '404', 'No route for GET /api/boooks'], ['trigger a NullPointerException', '500', 'Something went wrong']])}`,
    brute: { why: `<p>The naive way is a <code>try/catch</code> in every controller method that builds its own error response. Ten endpoints means ten slightly different error formats (one forgets a status, one leaks <code>e.getMessage()</code>), and a new exception type needs ten edits. Duplicated handling is where inconsistent and leaky errors come from.</p>` },
    mcq: { q: 'In Express, what makes a middleware function an error handler?', options: ['It has four parameters (err, req, res, next)', 'Its name ends with "Error"', 'It is registered with app.error()', 'It returns a rejected promise'], answer: 0, explain: 'Express recognises error-handling middleware purely by arity: exactly four declared parameters. It must also be registered after all routes.' },
    hints: [
      `<p>Hint 1: errors should be <i>thrown</i> as typed exceptions (<code>BookNotFound</code>, <code>Duplicate</code>) from the service and caught in <b>one</b> place.</p>`,
      `<p>Hint 2: Spring - <code>@RestControllerAdvice</code> with one <code>@ExceptionHandler</code> per type plus a catch-all <code>Exception</code>. Express - an <code>AppError</code> class with a <code>status</code>, a 404 middleware after routes, and a four-argument handler last.</p>`,
      `<p>Hint 3: in the catch-all, log the exception (with a request id) and return only a generic message. Test each case with curl, especially the 500: force one with a temporary <code>throw new Error("boom")</code> and confirm the response has no stack.</p>`
    ],
    solution: {
      approach: `<p><b>Design:</b> exceptions carry meaning, one handler maps meaning to HTTP. In <b>Spring</b>: create <code>BookNotFoundException</code> and <code>DuplicateIsbnException</code> (both <code>RuntimeException</code>), an <code>ErrorResponse</code> record, and a <code>@RestControllerAdvice</code> with handlers for those two, for <code>MethodArgumentNotValidException</code> (map <code>FieldError</code>s to details), for <code>HttpMessageNotReadableException</code> (400), and a catch-all <code>Exception</code> that logs with <code>log.error(msg, ex)</code> and returns 500 with the text "Something went wrong". Spring already answers 404 for unknown routes, but through the same advice you can customise it by enabling <code>spring.mvc.throw-exception-if-no-handler-found</code>.</p>
      <p>In <b>Express</b>: an <code>AppError(status, message, details)</code> class; routes registered; then a catch-all middleware calling <code>next(new AppError(404, ...))</code>; then the four-argument handler registered last. It maps <code>AppError</code> to its status, <code>err.type === 'entity.parse.failed'</code> to 400, everything else to 500 (logging the original). Express 5 forwards async errors automatically.</p>
      <p><b>Verification:</b> run the curl list above; for the 500 case confirm the body has no "at ..." lines and the server log has the stack. Also check <code>Content-Type: application/json</code> on every error, including the 404 for unknown routes.</p>`,
      code: { lang: 'js', check: false, code: `app.use('/api/books', booksRouter);
app.use((req, res, next) => next(new AppError(404, 'No route for ' + req.method + ' ' + req.originalUrl)));
app.use((err, req, res, next) => {
  const status = err instanceof AppError ? err.status : err.type === 'entity.parse.failed' ? 400 : 500;
  if (status === 500) console.error(err);                       // details stay on the server
  res.status(status).json({
    status,
    message: status === 500 ? 'Something went wrong' : (err.type === 'entity.parse.failed' ? 'Malformed JSON request' : err.message),
    path: req.originalUrl, details: err.details
  });
});` },
      complexity: `<p>O(1) per error: a type check and a response. The win is consistency and zero duplicated try/catch.</p>`,
      followUps: ['Add a requestId to every log line and to the 500 response.', 'What changes if the error happens after the response has started streaming?']
    }
  }]
});

/* ============================================================
   TOPIC 6 — Layered architecture
   ============================================================ */
topics.push({
  title: 'Layered Architecture: Controller, Service, Repository',
  analogy: `<p>A <b>restaurant</b> again, now with proper jobs. The <b>waiter</b> (controller) talks to customers: takes the order, says "that's not on the menu", brings the plate. The waiter never cooks. The <b>chef</b> (service) knows the recipes and the rules: "no nuts in this dish", "we can't make that twice". The chef never walks to the dining room. The <b>pantry keeper</b> (repository) is the only person who knows which shelf holds the flour. If you replace the pantry with a bigger warehouse tomorrow (swap Map for a database), the chef and the waiter do not change at all.</p>`,
  explain: `<p>Splitting code into <b>layers</b> means each class has one reason to change. The classic backend split has three:</p>
  ${H.table(['Layer', 'Job (one sentence)', 'Knows about', 'Must NOT know about'], [
    ['<b>Controller</b> (web / routes)', 'translate HTTP into method calls and results back into HTTP', 'URLs, status codes, JSON, headers, DTOs', 'business rules, SQL, the database'],
    ['<b>Service</b> (business logic)', 'enforce the rules of the application', 'domain objects, rules, transactions, other services', 'HTTP (no <code>req</code>/<code>res</code>/<code>ResponseEntity</code>)'],
    ['<b>Repository</b> (data access)', 'save and fetch data', 'the storage technology (Map, SQL, Mongo)', 'HTTP and business rules']
  ])}
  <p><b>Direction of calls is one way:</b> Controller → Service → Repository. Never upward. Data flows back up as return values and exceptions.</p>
  <p><b>Why bother for a tiny CRUD app?</b></p>
  <ul>
    <li><b>Swap storage without a rewrite.</b> Today <code>InMemoryBookRepository</code> (a Map). Next module: JPA/Prisma + a real database. Controller and service stay untouched.</li>
    <li><b>Testable.</b> You can test the service with a fake repository in milliseconds - no server, no database.</li>
    <li><b>Reusable.</b> The same service can be called by a REST controller, a message-queue consumer and a scheduled job.</li>
    <li><b>Readable.</b> New teammates know exactly where to look: "rule about duplicates?" → service.</li>
  </ul>
  <p><b>Where does each decision go?</b> "Is the JSON well-formed?" - framework. "Is the title blank?" - validation at the edge (controller/DTO). "Does the book exist? Is it a duplicate?" - service. "How do I find a row by id?" - repository. A quick test: <i>if this rule must also hold when the same operation is called from a cron job, it belongs in the service.</i></p>
  <p><b>Wiring it together (dependency injection in one sentence):</b> the controller does not create the service with <code>new</code>; it <i>receives</i> it through its constructor. Spring does that automatically (<code>@Service</code>, <code>@Repository</code>, constructor injection). In Express you do it by hand: import the service module, or pass dependencies into a factory function <code>createBooksRouter(service)</code>.</p>
  <p><b>Fat controller = the #1 smell.</b> If your controller has loops, <code>if</code>s about business facts, or talks to a Map/DB, move that code down a layer. Below, we refactor exactly that.</p>`,
  clues: [
    '"Separate concerns" / "where does this logic belong?" - controller (HTTP) vs service (rules) vs repository (storage)',
    '"We want to switch from in-memory to PostgreSQL later" - hide storage behind a repository interface',
    '"How do you unit-test the business logic without HTTP?" - service with a fake/in-memory repository',
    '"Controller has 200 lines and talks to the database" - fat controller; extract a service',
    '"Business logic in the repository / HTTP codes in the service" - layer leak'
  ],
  code: [
    { lang: 'java', title: 'Plain Java (compiles and runs): service + repository + a mini "controller"', code: `import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicLong;

// ---------- Domain ----------
record Book(Long id, String title, String author, int year) {}

// ---------- Domain exceptions: say WHAT happened, know nothing about HTTP ----------
class BookNotFoundException extends RuntimeException {
    BookNotFoundException(long id) { super("Book " + id + " does not exist"); }
}
class DuplicateBookException extends RuntimeException {
    DuplicateBookException(String title) { super("Book '" + title + "' already exists"); }
}
class ValidationException extends RuntimeException {
    final List<String> errors;
    ValidationException(List<String> errors) { super("Validation failed"); this.errors = errors; }
}

// ---------- Repository: the ONLY place that knows how data is stored ----------
interface BookRepository {
    Book save(Book book);                       // insert (id == null) or replace
    Optional<Book> findById(long id);
    List<Book> findAll();
    boolean deleteById(long id);
    boolean existsByTitle(String title);
}

class InMemoryBookRepository implements BookRepository {
    private final Map<Long, Book> store = new ConcurrentHashMap<>();
    private final AtomicLong sequence = new AtomicLong();       // hands out 1, 2, 3 ...

    public Book save(Book b) {
        long id = (b.id() == null) ? sequence.incrementAndGet() : b.id();
        Book saved = new Book(id, b.title(), b.author(), b.year());
        store.put(id, saved);
        return saved;
    }
    public Optional<Book> findById(long id) { return Optional.ofNullable(store.get(id)); }
    public List<Book> findAll() {
        List<Book> all = new ArrayList<>(store.values());
        all.sort(Comparator.comparing(Book::id));               // stable order for the API
        return all;
    }
    public boolean deleteById(long id) { return store.remove(id) != null; }
    public boolean existsByTitle(String title) {
        return store.values().stream().anyMatch(x -> x.title().equalsIgnoreCase(title));
    }
}

// ---------- Service: the business rules ----------
class BookService {
    private final BookRepository repo;                          // depends on the INTERFACE
    BookService(BookRepository repo) { this.repo = repo; }

    Book create(String title, String author, Integer year) {
        List<String> errors = new ArrayList<>();
        if (title == null || title.isBlank()) errors.add("title is required");
        else if (title.length() > 100) errors.add("title must be at most 100 characters");
        if (author == null || author.isBlank()) errors.add("author is required");
        if (year == null || year < 1000 || year > 2026) errors.add("year must be between 1000 and 2026");
        if (!errors.isEmpty()) throw new ValidationException(errors);          // collect ALL, then throw once

        if (repo.existsByTitle(title.trim())) throw new DuplicateBookException(title.trim());   // business rule
        return repo.save(new Book(null, title.trim(), author.trim(), year));
    }
    Book get(long id) { return repo.findById(id).orElseThrow(() -> new BookNotFoundException(id)); }
    List<Book> list() { return repo.findAll(); }
    Book update(long id, String title, String author, Integer year) {
        get(id);                                                // 404 if missing
        return repo.save(new Book(id, title, author, year));
    }
    void delete(long id) { if (!repo.deleteById(id)) throw new BookNotFoundException(id); }
}

// ---------- A tiny "controller": turns exceptions into status codes ----------
class MiniController {
    private final BookService service;
    MiniController(BookService service) { this.service = service; }

    String post(String title, String author, Integer year) {
        try {
            Book b = service.create(title, author, year);
            return "201 Created " + b;
        } catch (ValidationException e) {
            return "400 " + e.errors;
        } catch (DuplicateBookException e) {
            return "409 " + e.getMessage();
        }
    }
    String get(long id) {
        try { return "200 OK " + service.get(id); }
        catch (BookNotFoundException e) { return "404 " + e.getMessage(); }
    }
}

class LayersDemo {
    public static void main(String[] args) {
        MiniController api = new MiniController(new BookService(new InMemoryBookRepository()));
        System.out.println(api.post("Dune", "Frank Herbert", 1965));   // 201
        System.out.println(api.post("Dune", "Someone", 2000));         // 409 duplicate
        System.out.println(api.post("", null, 3000));                  // 400 with 3 errors
        System.out.println(api.get(1));                                // 200
        System.out.println(api.get(9));                                // 404
    }
}` },
    { lang: 'java', title: 'Spring Boot - the same layers with annotations', check: false, code: `@Repository
class InMemoryBookRepository implements BookRepository { /* the Map-based class above */ }

@Service                                  // Spring creates ONE instance and injects it where needed
class BookService {
    private final BookRepository repo;
    BookService(BookRepository repo) { this.repo = repo; }      // constructor injection (no new!)
    /* create/get/update/delete exactly as in the plain-Java version */
}

@RestController
@RequestMapping("/api/books")
class BookController {
    private final BookService service;
    BookController(BookService service) { this.service = service; }

    @GetMapping("/{id}")
    Book get(@PathVariable long id) { return service.get(id); }   // thin: delegate and return
}` },
    { lang: 'js', title: 'Express - three small modules (controller / service / repository)', check: false, code: `// repos/bookRepo.js  --- only place that knows the data lives in a Map
const store = new Map();
let seq = 0;
export const bookRepo = {
  save(book) {
    const id = book.id ?? ++seq;
    const saved = { ...book, id };
    store.set(id, saved);
    return saved;
  },
  findById: (id) => store.get(id),                    // undefined when missing
  findAll: () => [...store.values()],
  deleteById: (id) => store.delete(id),
  existsByTitle: (t) => [...store.values()].some(b => b.title.toLowerCase() === t.toLowerCase())
};

// services/bookService.js  --- business rules, no req/res
import { AppError } from '../errors.js';
export function createBookService(repo) {             // dependency injected -> easy to fake in tests
  return {
    create(dto) {
      if (repo.existsByTitle(dto.title)) throw new AppError(409, "Book '" + dto.title + "' already exists");
      return repo.save({ title: dto.title.trim(), author: dto.author.trim(), year: dto.year });
    },
    get(id) {
      const b = repo.findById(id);
      if (!b) throw new AppError(404, 'Book ' + id + ' does not exist');
      return b;
    },
    list: () => repo.findAll(),
    remove(id) { if (!repo.deleteById(id)) throw new AppError(404, 'Book ' + id + ' does not exist'); }
  };
}

// routes/books.js  --- HTTP only
export function createBooksRouter(service) {
  const router = Router();
  router.get('/:id', (req, res) => res.json(service.get(Number(req.params.id))));
  router.post('/', validateBody(BookSchema), (req, res) => res.status(201).json(service.create(req.body)));
  return router;
}

// app.js  --- wiring by hand
const service = createBookService(bookRepo);
app.use('/api/books', createBooksRouter(service));` },
    { lang: 'js', run: true, title: 'Runnable model: three layers in 40 lines of plain JS', code: `// Repository: storage only
function makeRepo() {
  var store = {}, seq = 0;
  return {
    save: function (b) { var id = b.id || ++seq; store[id] = { id: id, title: b.title, author: b.author }; return store[id]; },
    find: function (id) { return store[id]; },
    all: function () { return Object.keys(store).map(function (k) { return store[k]; }); }
  };
}
// Service: rules only (throws plain errors with a "kind", no HTTP words)
function makeService(repo) {
  return {
    create: function (dto) {
      if (!dto.title) { var e = new Error('title is required'); e.kind = 'invalid'; throw e; }
      return repo.save(dto);
    },
    get: function (id) {
      var b = repo.find(id);
      if (!b) { var e2 = new Error('Book ' + id + ' does not exist'); e2.kind = 'missing'; throw e2; }
      return b;
    }
  };
}
// Controller: HTTP only (maps results and error kinds to status codes)
function makeController(service) {
  var STATUS = { invalid: 400, missing: 404 };
  function run(fn, okStatus) {
    try { return { status: okStatus, body: fn() }; }
    catch (e) { return { status: STATUS[e.kind] || 500, body: { message: e.message } }; }
  }
  return {
    post: function (body) { return run(function () { return service.create(body); }, 201); },
    get: function (id) { return run(function () { return service.get(id); }, 200); }
  };
}

var api = makeController(makeService(makeRepo()));
console.log(JSON.stringify(api.post({ title: 'Dune', author: 'Herbert' })));
console.log(JSON.stringify(api.post({ author: 'Nobody' })));
console.log(JSON.stringify(api.get(1)));
console.log(JSON.stringify(api.get(7)));` }
  ],
  codeTitle: ['Plain Java layers (compiles)', 'Spring Boot layers', 'Express layers', 'Layers in plain JS (runnable)'],
  viz: {
    title: 'Controller -> Service -> Repository: which layer stops the request?',
    input: 'create-duplicate',
    inputLabel: 'Scenario: create-ok | create-invalid | create-duplicate | get-missing | crash',
    gen: function (input) {
      var sc = String(input).trim().toLowerCase();
      var S = {
        'create-ok': { title: 'POST valid book', stop: null, status: '201 Created', who: 'nobody - all checks pass' },
        'create-invalid': { title: 'POST with blank title', stop: 'K', status: '400 Bad Request', who: 'Controller / DTO validation' },
        'create-duplicate': { title: 'POST a title that already exists', stop: 'S', status: '409 Conflict', who: 'Service (business rule)' },
        'get-missing': { title: 'GET id 9 (not in the Map)', stop: 'S', status: '404 Not Found', who: 'Service (repository returned empty)' },
        'crash': { title: 'Repository hits a bug (NullPointerException)', stop: 'P', status: '500 Internal Server Error', who: 'Repository bug, caught by the global handler' }
      };
      var s = S[sc];
      if (!s) throw new Error('Use: create-ok, create-invalid, create-duplicate, get-missing, crash');
      var rules = {
        K: 'Controller: parse JSON, run @Valid, pick status code',
        S: 'Service: does the book exist? duplicate? business rules',
        P: 'Repository: read/write the store, nothing else'
      };
      function g(hl, ehl, tags) {
        return { type: 'graph', directed: true, height: 40, label: 'One request through the layers',
          nodes: [
            { id: 'C', label: 'Client', x: 8, y: 20, shape: 'box', w: 12 },
            { id: 'K', label: 'Controller', x: 32, y: 20, shape: 'box', w: 17 },
            { id: 'S', label: 'Service', x: 57, y: 20, shape: 'box', w: 14 },
            { id: 'P', label: 'Repository', x: 80, y: 20, shape: 'box', w: 17 },
            { id: 'D', label: 'Map', x: 80, y: 5, shape: 'box', w: 10 }
          ],
          edges: [['C', 'K', 'HTTP'], ['K', 'S', 'call'], ['S', 'P', 'call'], ['P', 'D', 'get/put']],
          hl: hl, ehl: ehl, tags: tags || {} };
      }
      function tbl(rowSel) { return { type: 'table', label: 'Who owns which decision', columns: ['layer', 'responsibility'], rows: [['Controller', rules.K], ['Service', rules.S], ['Repository', rules.P]], hl: rowSel === undefined ? {} : (function () { var o = {}; o[rowSel] = 'sel'; return o; })() }; }
      var frames = [];
      frames.push({ narr: 'Scenario: <b>' + s.title + '</b>. Each layer has one job (table below). We follow the request and see <i>which layer</i> is responsible for the outcome.', parts: [g({ C: 'cur' }, {}, { C: 'request' }), tbl()] });
      frames.push({ narr: 'The request arrives at the <b>controller</b>: it parses the JSON into a DTO and runs the shape validation.', parts: [g({ K: 'cur' }, { 'C-K': 'ok' }), tbl(0)] });
      if (s.stop === 'K') {
        frames.push({ narr: 'Validation fails right here: title is blank. The controller answers <span class="c-r">' + s.status + '</span> itself. The service and repository <b>never run</b> - cheap and safe.', parts: [g({ K: 'bad', C: 'done' }, { 'C-K': 'ok' }, { K: '400' }), tbl(0)] });
        frames.push({ narr: 'Responsibility: <b>' + s.who + '</b>. Input shape is checked at the edge so inner layers can assume clean data.', parts: [g({ C: 'sel' }, {}, { C: '400' }), tbl(0)] });
        return frames;
      }
      frames.push({ narr: 'Input is valid. The controller calls <code>service.' + (sc === 'get-missing' ? 'get(9)' : 'create(dto)') + '</code> - plain Java arguments, no HTTP objects.', parts: [g({ K: 'done', S: 'cur' }, { 'C-K': 'ok', 'K-S': 'ok' }), tbl(1)] });
      if (sc === 'create-duplicate') {
        frames.push({ narr: 'The service asks the repository: <code>existsByTitle("Dune")</code>.', parts: [g({ S: 'cur', P: 'cur' }, { 'K-S': 'ok', 'S-P': 'ok' }, { P: 'exists?' }), tbl(2)] });
        frames.push({ narr: 'Answer: <b>true</b>. That is a <i>business rule</i> ("no duplicate titles"), so the <b>service</b> throws <code>DuplicateBookException</code>. The controller/handler maps it to <span class="c-r">' + s.status + '</span>.', parts: [g({ S: 'bad', K: 'done', P: 'done' }, { 'K-S': 'ok' }, { S: 'throws' }), tbl(1)] });
      } else if (sc === 'get-missing') {
        frames.push({ narr: 'The service asks the repository: <code>findById(9)</code>.', parts: [g({ S: 'cur', P: 'cur', D: 'win' }, { 'K-S': 'ok', 'S-P': 'ok', 'P-D': 'ok' }, { P: 'findById(9)' }), tbl(2)] });
        frames.push({ narr: 'The repository returns <i>empty</i> - it does not decide if that is an error. The <b>service</b> decides "missing means 404" and throws <code>BookNotFoundException</code>. Result: <span class="c-r">' + s.status + '</span>.', parts: [g({ S: 'bad', P: 'done', D: 'done' }, { 'K-S': 'ok' }, { S: 'throws 404' }), tbl(1)] });
      } else if (sc === 'crash') {
        frames.push({ narr: 'The service passes the new book down to the repository.', parts: [g({ S: 'done', P: 'cur', D: 'win' }, { 'K-S': 'ok', 'S-P': 'ok', 'P-D': 'ok' }, { P: 'save()' }), tbl(2)] });
        frames.push({ narr: 'Boom: an unexpected <code>NullPointerException</code>. No layer planned for it, so it bubbles up to the <b>global error handler</b>, which logs it and returns a generic <span class="c-r">' + s.status + '</span>.', parts: [g({ P: 'bad', S: 'done', K: 'done' }, { 'K-S': 'ok', 'S-P': 'ok' }, { P: 'NPE' }), tbl(2)] });
      } else {
        frames.push({ narr: 'The service checks the rules (no duplicate) and asks the repository to <code>save</code>.', parts: [g({ S: 'cur', P: 'cur', D: 'win' }, { 'K-S': 'ok', 'S-P': 'ok', 'P-D': 'ok' }, { P: 'save()' }), tbl(2)] });
        frames.push({ narr: 'The Map stores the book with a new id. The saved object travels back up; the controller picks <span class="c-g">' + s.status + '</span>.', parts: [g({ D: 'ok', P: 'done', S: 'done', K: 'sel' }, {}, { K: '201' }), tbl(0)] });
      }
      frames.push({ narr: 'Final answer to the client: <b>' + s.status + '</b>. Deciding party: <b>' + s.who + '</b>. Because the layers are separate, you can find the owner of any outcome in seconds.', parts: [g({ C: 'sel' }, {}, { C: s.status.slice(0, 3) }), { type: 'vars', vals: { status: s.status, 'decided by': s.who }, hl: { status: s.status.charAt(0) === '2' ? 'ok' : 'bad' } }] });
      return frames;
    }
  },
  examples: [
    { title: 'Before: the fat controller (do not do this)', html: `<p>Everything in one method. It validates, checks duplicates, talks to the Map and builds the HTTP response. You cannot reuse it, you cannot test it without HTTP, and swapping the Map for a database means rewriting every endpoint.</p>`,
      code: { lang: 'java', check: false, code: `@PostMapping
public ResponseEntity<?> create(@RequestBody Map<String, Object> body) {
    String title = (String) body.get("title");
    if (title == null || title.isBlank()) return ResponseEntity.badRequest().body("title required");
    for (Book b : BOOKS.values()) {                          // data access + business rule in the web layer
        if (b.title().equalsIgnoreCase(title)) return ResponseEntity.status(409).body("duplicate");
    }
    long id = NEXT_ID++;
    BOOKS.put(id, new Book(id, title, (String) body.get("author"), (Integer) body.get("year")));
    return ResponseEntity.status(201).body(BOOKS.get(id));
}` } },
    { title: 'After: thin controller, rules in the service', html: `<p>Same behaviour, but each piece is small and has a clear owner. The controller is four lines; the duplicate check moved to the service; the Map moved behind the repository.</p>`,
      code: { lang: 'java', check: false, code: `@PostMapping
public ResponseEntity<Book> create(@Valid @RequestBody BookRequest body) {
    Book saved = service.create(body);                       // rules + storage happen below
    return ResponseEntity.created(URI.create("/api/books/" + saved.id())).body(saved);
}` } },
    { title: 'Swapping storage: the payoff', html: `<p>Because the service depends on the <code>BookRepository</code> <i>interface</i>, tomorrow's database version is one new class and one changed line of wiring. Nothing else is touched. That is the payoff of the layering you just built.</p>`,
      code: { lang: 'java', check: false, code: `@Repository
class JpaBookRepository implements BookRepository {     // next module: same methods, real database
    private final BookJpaDao dao;
    JpaBookRepository(BookJpaDao dao) { this.dao = dao; }
    public Optional<Book> findById(long id) { return dao.findById(id); }
    /* ... */
}` } },
    { title: 'Testing a service with a fake repository (no server)', html: `<p>The unit test builds the service with the in-memory repository and checks behaviour directly - no HTTP, no port, runs in a millisecond.</p>`,
      code: { lang: 'java', code: `class ServiceCheck {
    public static void main(String[] args) {
        BookService service = new BookService(new InMemoryBookRepository());
        service.create("Dune", "Frank Herbert", 1965);
        try {
            service.create("dune", "Other", 2000);          // same title, different case
            System.out.println("FAIL: duplicate accepted");
        } catch (DuplicateBookException expected) {
            System.out.println("PASS: duplicate rejected -> " + expected.getMessage());
        }
    }
}

record Book(Long id, String title, String author, int year) {}
class DuplicateBookException extends RuntimeException { DuplicateBookException(String t) { super("Book '" + t + "' already exists"); } }
interface BookRepository { Book save(Book b); boolean existsByTitle(String t); }
class InMemoryBookRepository implements BookRepository {
    private final List<Book> rows = new ArrayList<>();
    public Book save(Book b) { Book s = new Book((long) rows.size() + 1, b.title(), b.author(), b.year()); rows.add(s); return s; }
    public boolean existsByTitle(String t) { return rows.stream().anyMatch(r -> r.title().equalsIgnoreCase(t)); }
}
class BookService {
    private final BookRepository repo;
    BookService(BookRepository repo) { this.repo = repo; }
    Book create(String t, String a, int y) {
        if (repo.existsByTitle(t.trim())) throw new DuplicateBookException(t.trim());
        return repo.save(new Book(null, t.trim(), a, y));
    }
}` } }
  ],
  deepDive: `<p><b>Dependency direction and the Dependency Inversion Principle.</b> The service depends on an <i>interface</i> (<code>BookRepository</code>) that it owns; the implementation (<code>JpaBookRepository</code>) depends on the interface, not the other way round. That is why you can swap storage and why a fake repository works in tests. Later modules push this further into hexagonal architecture ("ports and adapters").</p>
  <p><b>Where do transactions live?</b> On the <b>service</b> methods (<code>@Transactional</code>), because a business operation ("transfer money") may touch several repositories and must succeed or fail as a whole. Putting transactions on the controller keeps the database transaction open while the response is serialised (slow); putting them in each repository makes it impossible to make two repository calls atomic.</p>
  <p><b>DTO vs domain object mapping.</b> The controller speaks DTOs; the service speaks domain objects. Mapping code (MapStruct, hand-written <code>toDto</code>) lives at the boundary. Yes, it is "boilerplate", but it is what allows the database schema and the public JSON to change independently.</p>
  <p><b>Anaemic vs rich domain.</b> Our service holds all rules and <code>Book</code> is a bag of data (an <i>anaemic</i> model). Fine for CRUD. When rules get complex, move behaviour into domain objects (<code>order.cancel()</code>) - the DDD material in the Architecture module.</p>
  <p><b>Common layering mistakes.</b> (1) "Pass-through" services that only forward calls - acceptable early, but a sign rules live elsewhere. (2) Repositories returning DTOs, or services returning <code>ResponseEntity</code> - layer leaks. (3) Controllers calling repositories directly "just for reads" - then rules like soft-delete visibility are skipped. (4) Circular dependencies between services - extract a third service. (5) Package-by-layer vs package-by-feature: large codebases usually group by feature (<code>books/</code> with its controller, service, repo) so related code stays together.</p>
  <p><b>Concurrency note.</b> Our in-memory repository uses <code>ConcurrentHashMap</code> and <code>AtomicLong</code> because a web server handles many requests at once on different threads. A plain <code>HashMap</code> and <code>int nextId++</code> would lose updates or hand the same id twice. The check-then-act in <code>create</code> (exists, then save) is still racy under load - a real database fixes it with a <b>unique constraint</b>; remember that business-rule checks are advisory, constraints are the truth.</p>
  <p><b>Singletons and state.</b> Spring services are singletons shared by all requests, so never keep per-request data in fields. Express modules are also loaded once - module-level variables are shared across requests (our <code>store</code> is deliberately one of those).</p>`,
  aiEra: `<p><b>What AI changes:</b> asking an assistant to "build a CRUD API" often gives you a working but <b>fat controller</b> - everything in one file. AI is also very good at the <i>refactor</i>: "extract a service and a repository interface from this controller" is a task it does reliably. Your skill is knowing the target shape so you can steer it.</p>
  <p><b>Use AI as a partner:</b> <code>Review this controller. List every line that is business logic or data access and say which layer it belongs in. Do not rewrite yet.</code> Then ask for the refactor, then run your curl script before and after to prove behaviour did not change.</p>
  <p><b>Where AI goes wrong:</b> it creates pass-through layers that add files but no clarity, puts <code>@Transactional</code> on controllers, lets services return <code>ResponseEntity</code>, makes the repository throw HTTP exceptions, or wires beans with field injection. When asked for tests it may mock everything so thoroughly that the test proves nothing.</p>
  <p><b>What you must still own:</b> the dependency direction (controller → service → repository, never reverse) and where each rule lives. A good review question for any AI-written class: "what is the one reason this class would change?"</p>`,
  problems: [{
    title: 'Refactor a Fat Controller into Three Layers', level: 'Medium', tags: ['layered architecture', 'refactoring', 'service', 'repository'], lang: 'java',
    statement: `<p>This Express handler validates, checks duplicates, generates ids, stores data in a global array and builds the response. Refactor it into controller, service and repository. Behaviour (status codes and bodies) must not change. Explain what moved where, and show how you would unit-test the duplicate rule without starting the server.</p>`,
    constraints: `The service must not reference <code>req</code>, <code>res</code> or any status code numbers. The repository must not contain business rules. Controller methods stay under ~10 lines.`,
    example: `${H.table(['Line in the fat handler', 'Belongs in'], [['<code>req.body.title</code>, <code>res.status(201)</code>', 'controller'], ['<code>books.some(b =&gt; b.title === title)</code> then 409', 'service decides (409), repository answers "exists?"'], ['<code>nextId++</code>, <code>books.push(...)</code>', 'repository']])}`,
    brute: { why: `<p>Leaving everything in the handler "because it works". Each new endpoint copies the duplicate check, so the rule drifts (one endpoint compares case-insensitively, another not). Testing it needs a running server and HTTP calls, so nobody writes tests. Moving to a database means editing every handler.</p>`, code: { lang: 'js', check: false, code: `const books = []; let nextId = 1;
app.post('/books', (req, res) => {
  if (!req.body.title) return res.status(400).json({ message: 'title required' });
  if (books.some(b => b.title.toLowerCase() === req.body.title.toLowerCase()))
    return res.status(409).json({ message: 'duplicate' });
  const book = { id: nextId++, ...req.body };
  books.push(book);
  res.status(201).json(book);
});` } },
    mcq: { q: 'Where should the rule "no two books with the same title" live?', options: ['In the service', 'In the controller', 'In the HTTP client', 'In the router config'], answer: 0, explain: 'It is a business rule that must hold no matter who calls the operation (REST, queue, cron), so it belongs in the service. The repository supplies the existsByTitle query; a database unique constraint backs it up.' },
    hints: [
      `<p>Hint 1: sort every line into three buckets: "about HTTP" (req/res/status), "about rules" (is this allowed?), "about storage" (array, ids).</p>`,
      `<p>Hint 2: create <code>bookRepo</code> with <code>save/existsByTitle</code>, <code>createBookService(repo)</code> that throws <code>AppError</code>s, and a route that only calls the service. Pass the repo into the service rather than importing a global.</p>`,
      `<p>Hint 3: for the test, build <code>createBookService(fakeRepo)</code> with a repo whose <code>existsByTitle</code> returns true and assert that <code>create</code> throws a 409 <code>AppError</code>. No server involved.</p>`
    ],
    solution: {
      approach: `<p><b>Repository</b> (storage): owns the array and the id counter; exposes <code>save</code> and <code>existsByTitle</code>. <b>Service</b> (rules): <code>create(dto)</code> checks <code>repo.existsByTitle</code> and throws <code>AppError(409, ...)</code>, otherwise saves. <b>Controller</b> (HTTP): runs shape validation (400), calls <code>service.create</code>, and sends <code>201</code> with the result; the global error handler turns the 409 <code>AppError</code> into JSON. The service never mentions <code>res</code>; the repository never mentions 409.</p>
      <p><b>Behaviour check:</b> run the same curl script before and after (valid -> 201, duplicate -> 409, blank -> 400) and diff the outputs; they must be identical.</p>
      <p><b>Unit test without a server:</b> inject a fake repository (<code>existsByTitle: () =&gt; true</code>) into <code>createBookService</code> and assert the call throws an error with <code>status === 409</code>; inject one returning false and assert it returns the saved book. Because dependencies are passed in, no mocking framework is even needed.</p>`,
      code: { lang: 'js', check: false, code: `// repo
export const bookRepo = { /* store, seq, save, existsByTitle as shown above */ };
// service
export const createBookService = (repo) => ({
  create(dto) {
    if (repo.existsByTitle(dto.title)) throw new AppError(409, 'duplicate');
    return repo.save({ title: dto.title, author: dto.author, year: dto.year });
  }
});
// controller
router.post('/', validateBody(BookSchema), (req, res) => res.status(201).json(service.create(req.body)));` },
      complexity: `<p>Same runtime behaviour: O(n) duplicate scan for the Map version (a database unique index makes it O(log n)). The refactor changes structure, not speed.</p>`,
      followUps: ['Where would you put @Transactional and why?', 'How would a unique database index replace the in-memory duplicate check?']
    }
  }]
});

/* ============================================================
   TOPIC 7 — Testing with curl / Postman
   ============================================================ */
topics.push({
  title: 'Testing Your API: curl, Postman and Automated Tests',
  analogy: `<p>Before opening a restaurant you do a <b>soft opening</b>: friends come, order every dish, try to break things ("what if I ask for no salt <i>and</i> double salt?"), and you watch what comes out of the kitchen. <b>curl</b> is you ordering by hand, one dish at a time. <b>Postman</b> is a clipboard of saved orders you can replay. <b>Automated tests</b> are a robot waiter that replays the whole menu every time you change a recipe - and shouts when something that used to work now fails.</p>`,
  explain: `<p>You cannot trust an API you have not called. The workflow for every endpoint: <b>happy path, then every way it can fail.</b> For each endpoint test: success, not found, bad input, wrong method, and (later) missing auth.</p>
  <p><b>curl in 6 flags</b> (it is on every Mac, Linux and modern Windows):</p>
  ${H.table(['Flag', 'Meaning', 'Example'], [
    ['<code>-X</code>', 'HTTP method (GET is default; POST is implied by <code>-d</code>)', '<code>-X PUT</code>'],
    ['<code>-H</code>', 'add a header', '<code>-H "Content-Type: application/json"</code>'],
    ['<code>-d</code>', 'request body (single-quote JSON so the shell leaves it alone)', '<code>-d \'{"title":"Dune"}\'</code>'],
    ['<code>-i</code>', 'show response status line + headers', '<code>curl -i URL</code>'],
    ['<code>-s</code>', 'silent: hide the progress meter (good in scripts)', '<code>curl -s URL</code>'],
    ['<code>-w</code>', 'print extra info, e.g. just the status code', '<code>-w "%{http_code}"</code>']
  ])}
  <p><b>Postman</b> (or Bruno, Insomnia, Thunder Client, or <code>.http</code> files in VS Code / IntelliJ) gives you a click-and-replay UI: save requests in a <b>collection</b>, use <b>variables</b> like <code>{{baseUrl}}</code> so the same collection works against local and staging, and write small <b>test scripts</b> that assert the status and body. Share the collection in git so the whole team has the same "manual test suite".</p>
  <p><b>The test checklist for our Books API</b> (write it as curl commands, in this order, so each one builds on the last):</p>
  <ol>
    <li><code>GET /api/books</code> → <span class="c-g">200</span> <code>[]</code></li>
    <li><code>POST</code> valid book → <span class="c-g">201</span> + <code>Location</code></li>
    <li><code>POST</code> invalid book → <span class="c-r">400</span> + field errors</li>
    <li><code>POST</code> broken JSON → <span class="c-r">400</span></li>
    <li><code>GET /api/books/1</code> → <span class="c-g">200</span>; <code>GET /api/books/999</code> → <span class="c-r">404</span></li>
    <li><code>PUT /api/books/1</code> → <span class="c-g">200</span>; <code>PUT /api/books/999</code> → <span class="c-r">404</span></li>
    <li><code>DELETE /api/books/1</code> → <span class="c-g">204</span>; again → <span class="c-r">404</span></li>
    <li>wrong method / unknown route → <span class="c-r">405</span> / <span class="c-r">404</span></li>
  </ol>
  <p><b>From manual to automatic.</b> Typing curl is great for exploring, but a test you run by hand is a test you will skip. Turn the checklist into code: <b>MockMvc / @WebMvcTest</b> (Spring) or <b>supertest</b> (Express) call your app in-process, in milliseconds, with no port. These run on every commit in CI. The test pyramid (later module) says: many fast unit tests of the service, some API tests like these, very few full end-to-end tests.</p>
  <p><b>Never put real secrets in saved requests.</b> Use variables (<code>$TOKEN</code>, <code>{{token}}</code>) and keep real values in your shell or a Postman environment that is <i>not</i> committed.</p>`,
  clues: [
    '"How would you test this endpoint?" - happy path + each failure mode, with expected status codes',
    '"Prove the API returns 404 / 400 / 201" - show the curl with <code>-i</code> and the status line',
    '"Share your API tests with the team" - Postman/Bruno collection or <code>.http</code> files in git',
    '"Run API tests in CI without a running server" - MockMvc / supertest (in-process)',
    '"Test passes locally but not in CI" - tests depend on leftover data or order; each test must set up its own state'
  ],
  code: [
    { lang: 'bash', title: 'A complete curl walk-through of the Books API', check: false, code: `BASE=http://localhost:8080/api/books      # change to http://localhost:3000/api/books for Express

# 1. list is empty
curl -i $BASE

# 2. create (201 + Location header)
curl -i -X POST $BASE \\
  -H "Content-Type: application/json" \\
  -d '{"title":"Dune","author":"Frank Herbert","year":1965}'

# 3. invalid body (400 with all field errors)
curl -i -X POST $BASE \\
  -H "Content-Type: application/json" \\
  -d '{"title":"","year":3000}'

# 4. broken JSON (400)
curl -i -X POST $BASE -H "Content-Type: application/json" -d '{"title":}'

# 5. read one: found (200) and missing (404)
curl -i $BASE/1
curl -i $BASE/999

# 6. replace (200) and replace missing (404)
curl -i -X PUT $BASE/1 -H "Content-Type: application/json" \\
  -d '{"title":"Dune Messiah","author":"Frank Herbert","year":1969}'
curl -i -X PUT $BASE/999 -H "Content-Type: application/json" \\
  -d '{"title":"x","author":"y","year":2000}'

# 7. delete (204), then delete again (404)
curl -i -X DELETE $BASE/1
curl -i -X DELETE $BASE/1

# 8. wrong method (405)
curl -i -X PATCH $BASE/1` },
    { lang: 'bash', title: 'A tiny smoke-test script that checks status codes automatically', check: false, code: `#!/usr/bin/env bash
# usage: ./smoke.sh http://localhost:8080
BASE=\${1:-http://localhost:8080}/api/books
fail=0

# expect <name> <expected-status> <curl args...>   -> prints PASS/FAIL using only the status code
expect() {
  name=$1; want=$2; shift 2
  got=$(curl -s -o /dev/null -w "%{http_code}" "$@")
  if [ "$got" = "$want" ]; then echo "PASS  $name ($got)"; else echo "FAIL  $name wanted $want got $got"; fail=1; fi
}

JSON='Content-Type: application/json'
expect "list"            200 $BASE
expect "create"          201 -X POST $BASE -H "$JSON" -d '{"title":"Smoke","author":"Bot","year":2020}'
expect "create invalid"  400 -X POST $BASE -H "$JSON" -d '{"title":""}'
expect "get missing"     404 $BASE/999999
expect "wrong method"    405 -X PATCH $BASE/1
exit $fail` },
    { lang: 'java', title: 'Spring Boot - API test with MockMvc (no real server)', check: false, code: `@WebMvcTest(BookController.class)             // loads only the web layer
class BookControllerTest {

    @Autowired MockMvc mvc;
    @MockitoBean BookService service;         // fake the layer below (Spring Boot 3.4+; older: @MockBean)

    @Test
    void createReturns201AndLocation() throws Exception {
        when(service.create(any())).thenReturn(new Book(1L, "Dune", "Frank Herbert", 1965));

        mvc.perform(post("/api/books")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\\"title\\":\\"Dune\\",\\"author\\":\\"Frank Herbert\\",\\"year\\":1965}"))
           .andExpect(status().isCreated())
           .andExpect(header().string("Location", "/api/books/1"))
           .andExpect(jsonPath("$.title").value("Dune"));
    }

    @Test
    void blankTitleReturns400WithFieldErrors() throws Exception {
        mvc.perform(post("/api/books")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\\"title\\":\\"\\",\\"author\\":\\"X\\",\\"year\\":2000}"))
           .andExpect(status().isBadRequest())
           .andExpect(jsonPath("$.details[0].field").value("title"));
    }
}` },
    { lang: 'js', title: 'Express - API test with supertest + node:test', check: false, code: `import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';       // export the app WITHOUT calling listen()

test('POST /api/books creates a book', async () => {
  const app = createApp();                        // fresh in-memory state per test
  const res = await request(app)
    .post('/api/books')
    .send({ title: 'Dune', author: 'Frank Herbert', year: 1965 });
  assert.equal(res.status, 201);
  assert.equal(res.headers.location, '/api/books/1');
  assert.equal(res.body.title, 'Dune');
});

test('blank title is a 400 with field details', async () => {
  const res = await request(createApp()).post('/api/books').send({ title: '', author: 'X', year: 2000 });
  assert.equal(res.status, 400);
  assert.equal(res.body.details[0].field, 'title');
});

test('unknown id is a 404', async () => {
  const res = await request(createApp()).get('/api/books/999');
  assert.equal(res.status, 404);
});` }
  ],
  codeTitle: ['curl walk-through', 'Smoke test script', 'Spring MockMvc tests', 'Express supertest tests'],
  viz: {
    title: 'Running a curl test suite: expected vs actual status, repository state',
    input: 'create, create-bad, list, get, get-missing, update, delete, delete-again, no-header',
    inputLabel: 'Steps in order: create | create-bad | list | get | get-missing | update | delete | delete-again | no-header',
    gen: function (input) {
      var steps = String(input).split(/[,;\s]+/).map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);
      var known = { 'create': 1, 'create-bad': 1, 'list': 1, 'get': 1, 'get-missing': 1, 'update': 1, 'delete': 1, 'delete-again': 1, 'no-header': 1 };
      if (!steps.length) throw new Error('Give at least one step');
      if (steps.length > 10) throw new Error('Use at most 10 steps');
      steps.forEach(function (s) { if (!known[s]) throw new Error('Unknown step "' + s + '". Use: ' + Object.keys(known).join(', ')); });
      var store = [], nextId = 1, results = [], frames = [];
      function repoT(hl) { return { type: 'table', label: 'In-memory repository', columns: ['id', 'title'], rows: store.length ? store.map(function (b) { return [b.id, b.title]; }) : [['(empty)', '']], hl: hl || {} }; }
      function resT(hl) { return { type: 'table', label: 'Test results', columns: ['#', 'step', 'curl', 'expected', 'actual', 'verdict'], rows: results.map(function (r) { return r.slice(); }), hl: hl || {} }; }
      frames.push({ narr: 'We run the checklist like a script: every step sends one <code>curl</code>, compares the <b>actual</b> status with the <b>expected</b> one, and records PASS/FAIL. The repository starts empty.', parts: [repoT(), { type: 'vars', vals: { steps: steps.length, passed: 0 } }] });
      var passed = 0;
      steps.forEach(function (s, n) {
        var curl, want, got, note, hl = {};
        function find(id) { for (var i = 0; i < store.length; i++) if (store[i].id === id) return i; return -1; }
        if (s === 'create') { curl = 'POST /books {"title":"Dune"}'; want = 201; store.push({ id: nextId, title: 'Dune' }); hl[store.length - 1] = 'ok'; nextId++; got = 201; note = 'A valid body creates a row and returns 201.'; }
        else if (s === 'create-bad') { curl = 'POST /books {"title":""}'; want = 400; got = 400; note = 'Blank title fails validation. Notice the table does NOT change - invalid data never reaches storage.'; }
        else if (s === 'list') { curl = 'GET /books'; want = 200; got = 200; note = 'Listing always works, even when empty (200 with []).'; }
        else if (s === 'get') { curl = 'GET /books/1'; want = find(1) >= 0 ? 200 : 404; got = want; if (find(1) >= 0) hl[find(1)] = 'sel'; note = want === 200 ? 'Book 1 exists, so 200.' : 'Book 1 does not exist (yet or any more), so 404.'; }
        else if (s === 'get-missing') { curl = 'GET /books/999'; want = 404; got = 404; note = 'A missing id is a 404 with the standard error body.'; }
        else if (s === 'update') { curl = 'PUT /books/1 {"title":"Dune Messiah"}'; var i1 = find(1); want = i1 >= 0 ? 200 : 404; got = want; if (i1 >= 0) { store[i1].title = 'Dune Messiah'; hl[i1] = 'cur'; } note = want === 200 ? 'Replaced the row; same id, new title.' : 'Nothing to update: 404.'; }
        else if (s === 'delete') { curl = 'DELETE /books/1'; var i2 = find(1); want = i2 >= 0 ? 204 : 404; got = want; if (i2 >= 0) { hl[i2] = 'bad'; } note = want === 204 ? 'The row is removed; success is 204 with an empty body.' : 'Already gone: 404.'; }
        else if (s === 'delete-again') { curl = 'DELETE /books/1 (again)'; var i3 = find(1); want = 404; got = i3 >= 0 ? 204 : 404; if (i3 >= 0) { hl[i3] = 'bad'; } note = got === 404 ? 'Second delete finds nothing: 404. The end state is the same - idempotent.' : 'It still existed, so this delete succeeded. (Put a delete before this step to see the 404.)'; }
        else { curl = 'POST /books (no Content-Type)'; want = 415; got = 415; note = 'Without the JSON header, Spring answers 415 Unsupported Media Type (Express would see an empty body and answer 400).'; }
        results.push([String(n + 1), s, curl, String(want), String(got), got === want ? 'PASS' : 'FAIL']);
        if (got === want) passed++;
        var rhl = {}; rhl[results.length - 1] = got === want ? 'ok' : 'bad';
        frames.push({ narr: '<b>Step ' + (n + 1) + ' - ' + s + '.</b> ' + note, parts: [resT(rhl), repoT(hl), { type: 'vars', vals: { sent: curl, expected: want, actual: got }, hl: { actual: got === want ? 'ok' : 'bad' } }] });
        if (s === 'delete' || (s === 'delete-again' && got === 204)) {
          store = store.filter(function (b) { return b.id !== 1; });
          frames.push({ narr: 'The deleted row is now gone from the repository.', parts: [resT(rhl), repoT(), { type: 'vars', vals: { size: store.length } }] });
        }
      });
      frames.push({ narr: 'Suite finished: <b>' + passed + ' / ' + steps.length + '</b> passed. Every green row is a promise your API keeps; wire the same checks into CI (MockMvc / supertest) so a refactor cannot silently break one.', parts: [resT(), repoT(), { type: 'vars', vals: { passed: passed, total: steps.length }, hl: { passed: passed === steps.length ? 'ok' : 'bad' } }] });
      return frames;
    }
  },
  examples: [
    { title: 'Reading a curl -i response like a pro', html: `<p>Read the output in this order: (1) status line, (2) <code>Content-Type</code>, (3) <code>Location</code> or other special headers, (4) body. Many bugs are visible in the first two lines alone - e.g. a <code>200</code> with <code>Content-Type: text/html</code> means your handler returned a page, not JSON.</p>`,
      code: { lang: 'http', code: `HTTP/1.1 201 Created
Location: /api/books/1
Content-Type: application/json
Content-Length: 70

{"id":1,"title":"Dune","author":"Frank Herbert","year":1965}` } },
    { title: 'Postman: variables and a test script', html: `<p>In Postman set a collection variable <code>baseUrl</code> and use <code>{{baseUrl}}/api/books</code>. In the <b>Tests</b> tab of the create request, assert and also save the new id for later requests:</p>`,
      code: { lang: 'js', check: false, code: `pm.test("201 Created", () => pm.response.to.have.status(201));
pm.test("has Location header", () => pm.response.to.have.header("Location"));

const body = pm.response.json();
pm.test("title echoed back", () => pm.expect(body.title).to.eql("Dune"));
pm.collectionVariables.set("bookId", body.id);     // later requests use {{bookId}}` } },
    { title: 'A shareable environment file (placeholders only)', html: `<p>Commit the shape, never real values. Anything secret is a placeholder the developer fills locally.</p>`,
      code: { lang: 'json', title: 'books.postman_environment.json (shape)', code: `{
  "name": "local",
  "values": [
    { "key": "baseUrl", "value": "http://localhost:8080", "enabled": true },
    { "key": "token", "value": "<set-locally-not-committed>", "enabled": true }
  ]
}` } },
    { title: 'The .http file: tests that live next to your code', html: `<p>VS Code (REST Client) and IntelliJ run plain-text <code>.http</code> files. They diff nicely in git and need no account - handy for small teams.</p>`,
      code: { lang: 'http', code: `### create a book
POST http://localhost:8080/api/books
Content-Type: application/json

{"title":"Dune","author":"Frank Herbert","year":1965}

### read it
GET http://localhost:8080/api/books/1` } }
  ],
  deepDive: `<p><b>What makes a good API test.</b> Independent (does not rely on another test's leftovers), repeatable (same result every run), fast, and focused on one behaviour. The classic flaky pattern in curl scripts is depending on id <code>1</code> existing - which breaks the moment a previous run left data behind. Better: create the resource in the test, capture its id from the <code>Location</code> header or body, then use that id.</p>
  <p><b>Test levels, in plain words.</b> <i>Unit</i>: service with a fake repository (no Spring, no HTTP). <i>Slice / API</i>: <code>@WebMvcTest</code> or supertest - checks routing, JSON, validation and error mapping, with the layers below mocked or in-memory. <i>Integration</i>: real database in a container (Testcontainers). <i>End-to-end</i>: deployed system. This module's API tests sit in the middle; we deliberately made the repository swappable so they are easy.</p>
  <p><b>Spring test details.</b> <code>@WebMvcTest</code> boots only controllers, advice, converters and validation - not services or repositories - so it needs the service mocked (<code>@MockitoBean</code> since Spring Boot 3.4; <code>@MockBean</code> before). <code>@SpringBootTest</code> + <code>@AutoConfigureMockMvc</code> boots everything. Use <code>jsonPath</code> for body assertions. Failing to import <code>spring-boot-starter-test</code> is the usual first error.</p>
  <p><b>Express test details.</b> The trick that makes Express testable is exporting the app (or a <code>createApp()</code> factory) separately from <code>app.listen()</code>. supertest binds to an ephemeral port itself. A factory gives each test a fresh in-memory repository. Node 20+ ships a built-in test runner (<code>node --test</code>), so no Jest is required for this.</p>
  <p><b>curl gotchas.</b> Quotes: JSON in single quotes on macOS/Linux, but Windows <code>cmd</code> needs double quotes with escaped inner quotes (or use PowerShell/Git Bash). Always quote URLs containing <code>&amp;</code> or <code>?</code>. <code>-d</code> sets <code>Content-Type: application/x-www-form-urlencoded</code> by default, so for JSON you must add the header yourself. Use <code>--data @body.json</code> for large payloads, <code>-v</code> to see TLS and request headers, <code>--fail-with-body</code> to make scripts exit non-zero on 4xx/5xx.</p>
  <p><b>Beyond status codes: contract testing.</b> Later modules introduce OpenAPI schemas and consumer-driven contract tests so the shape of every response is checked automatically, and load testing (k6, JMeter) to see how the API behaves under traffic. For now: every endpoint, every status you documented, at least one test each.</p>`,
  aiEra: `<p><b>What AI changes:</b> AI can generate a full test suite - MockMvc tests, supertest tests, a Postman collection, or a bash smoke script - from your controller code in seconds. It can also invent adversarial inputs (huge strings, unicode, SQL-looking text) you would not think of. Test <i>writing</i> got cheap; test <i>trust</i> did not.</p>
  <p><b>Use AI as a partner:</b> <code>Here is my controller. List every response this endpoint can produce (status + body shape), then generate one curl command per case.</code> Or <code>Review my tests: which behaviours are not covered?</code> Also useful: ask it to turn a curl command into a Postman request or a supertest call.</p>
  <p><b>Where AI goes wrong:</b> tests that mock the thing under test so they always pass, assertions that only check <code>status 200</code> (not the body), tests copied from the implementation (they encode the bug), snapshot tests that nobody reads, and fabricated endpoints that do not exist in your API. It may also paste example API keys or tokens into scripts - replace them with variables.</p>
  <p><b>Quick sanity rule:</b> after generating a test, <i>break the code on purpose</i> (change a status code) and confirm the test fails. A test that cannot fail is decoration.</p>
  <p><b>What you must still own:</b> the list of behaviours that matter. Write the checklist yourself; let AI do the typing; then verify by mutation.</p>`,
  problems: [{
    title: 'Write the curl Suite for Every Endpoint', level: 'Easy', tags: ['curl', 'testing', 'status codes'], lang: 'java',
    statement: `<p>Write a bash script of curl commands that tests your Books API with at least: list empty, create valid, create invalid (400), create with broken JSON (400), get existing, get missing (404), update existing, update missing (404), delete existing (204), delete again (404), and one wrong-method call (405). For each, print PASS or FAIL by comparing the status code. The script must work against either the Spring (8080) or Express (3000) server by changing one variable.</p>`,
    constraints: `Use only curl and bash. No hardcoded ids that depend on earlier runs (capture the id from the create response). No real secrets in the script. Exit code non-zero if any check fails.`,
    example: `${H.table(['Step', 'Expected', 'Output'], [['create valid', '201', '<span class="c-g">PASS create (201)</span>'], ['get missing', '404', '<span class="c-g">PASS get missing (404)</span>'], ['delete again', '404', '<span class="c-r">FAIL delete again wanted 404 got 204</span> (bug: delete is not checking existence)']])}`,
    brute: { why: `<p>Running curl commands by hand and eyeballing the output. It works once, then nobody repeats it after the next change, and a regression ships. Also hand-typed ids (<code>/books/1</code>) break the second time because the data from the first run is still there.</p>` },
    mcq: { q: 'Which curl flags print only the HTTP status code (for scripts)?', options: ['-s -o /dev/null -w "%{http_code}"', '-i -X GET', '-v -d', '-L -k'], answer: 0, explain: '-s hides progress, -o /dev/null discards the body, and -w prints a format string, here the numeric status code. Perfect for comparing with an expected value.' },
    hints: [
      `<p>Hint 1: write a helper function <code>expect name want args...</code> that runs curl and compares the status code with <code>want</code>.</p>`,
      `<p>Hint 2: to avoid hardcoded ids, create a book with <code>curl -s -X POST ... </code>, extract the id from the JSON (<code>jq -r .id</code>, or a sed expression), and reuse it in later commands.</p>`,
      `<p>Hint 3: remember <code>-H "Content-Type: application/json"</code> on every request with a body; track a <code>fail</code> variable and <code>exit $fail</code> at the end so CI notices.</p>`
    ],
    solution: {
      approach: `<p>Define <code>BASE</code> at the top so switching servers is one edit. Write an <code>expect</code> function: it takes a name, the wanted status and the curl arguments, runs <code>curl -s -o /dev/null -w "%{http_code}"</code>, and prints PASS/FAIL while recording failures in a variable. Create a book first with <code>curl -s -X POST</code> and read its <code>id</code> from the JSON using <code>jq</code> (or sed if jq is not installed); then use that id for the get/update/delete steps. Delete the same id twice to test 204 then 404. Finish with <code>exit $fail</code> so a CI job fails when any check fails. Make each check independent where possible so one failure does not hide the others.</p>
      <p>Run it against Spring and then Express: both must print identical PASS lines. Any difference reveals an inconsistency in your error handling (for example Express answering 400 where Spring answers 415), which is exactly why testing both stacks side by side is useful.</p>`,
      code: { lang: 'bash', check: false, code: `BASE=\${BASE:-http://localhost:8080/api/books}
fail=0
expect() { name=$1; want=$2; shift 2
  got=$(curl -s -o /dev/null -w "%{http_code}" "$@")
  [ "$got" = "$want" ] && echo "PASS $name ($got)" || { echo "FAIL $name wanted $want got $got"; fail=1; }; }

J='Content-Type: application/json'
ID=$(curl -s -X POST $BASE -H "$J" -d '{"title":"T","author":"A","year":2000}' | jq -r .id)
expect "get existing" 200 $BASE/$ID
expect "delete"       204 -X DELETE $BASE/$ID
expect "delete again" 404 -X DELETE $BASE/$ID
exit $fail` },
      complexity: `<p>Each check is one HTTP call; the whole suite runs in well under a second locally.</p>`,
      followUps: ['Convert the script into supertest or MockMvc tests.', 'How would you also assert on the response body, not just the status?']
    }
  }]
});

/* ============================================================
   PRACTICE (Easy -> Medium -> Hard)
   ============================================================ */
practice.push({
  title: 'Greeting Endpoint with a Query Parameter', level: 'Easy', tags: ['routing', 'query params'], companies: ['TCS', 'Infosys'], lang: 'java',
  statement: `<p>Add <code>GET /api/greet</code> to both stacks. It reads an optional query parameter <code>name</code> and returns JSON <code>{"greeting":"Hello, NAME!"}</code>. If <code>name</code> is missing use "world". If <code>name</code> is longer than 30 characters, answer <code>400</code> with a clear message.</p>`,
  constraints: `Query parameter, not path variable. Response Content-Type must be JSON. No external libraries beyond the web framework.`,
  example: `${H.table(['Request', 'Status', 'Body'], [['<code>GET /api/greet</code>', '200', '<code>{"greeting":"Hello, world!"}</code>'], ['<code>GET /api/greet?name=Asha</code>', '200', '<code>{"greeting":"Hello, Asha!"}</code>'], ['<code>?name=</code> + 31 letters', '<span class="c-r">400</span>', 'message about length']])}`,
  brute: { why: `<p>Putting the name in the path (<code>/greet/Asha</code>) makes "no name" a different route and forces two handlers. A query parameter is optional by nature, which is exactly what "optional input" means in HTTP.</p>` },
  mcq: { q: 'Which part of a request is the right place for an OPTIONAL filter value like name?', options: ['Query string', 'Request line method', 'Response header', 'Path segment that identifies a resource'], answer: 0, explain: 'The query string carries optional modifiers (filters, paging). Path segments identify which resource you are talking about.' },
  hints: [
    `<p>Hint 1: in Spring the query value comes from <code>@RequestParam</code>; in Express from <code>req.query.name</code>.</p>`,
    `<p>Hint 2: give the parameter a default ("world") so a missing value is not an error. Only a too-long value is an error.</p>`,
    `<p>Hint 3: for the 400 return the same JSON error shape you use everywhere: status, error, message. Test with curl including a 31-character name.</p>`
  ],
  solution: {
    approach: `<p>Read the optional parameter with a default value, check the length, and either return the greeting object or an error object with status 400. In Spring use <code>@RequestParam(defaultValue = "world")</code> and throw a small exception (mapped to 400 by the global handler) or return a <code>ResponseEntity</code>. In Express read <code>req.query.name</code>, fall back to "world", and call <code>res.status(400).json(...)</code> when the length exceeds 30. Remember that <code>req.query.name</code> can also be an array (<code>?name=a&amp;name=b</code>) or an object - check <code>typeof name === 'string'</code> before using <code>.length</code>, otherwise a crafted URL turns into a 500.</p>`,
    code: { lang: 'js', check: false, code: `app.get('/api/greet', (req, res) => {
  const name = req.query.name === undefined ? 'world' : req.query.name;
  if (typeof name !== 'string' || name.length > 30) {
    return res.status(400).json({ status: 400, message: 'name must be a string of at most 30 characters' });
  }
  res.json({ greeting: 'Hello, ' + name + '!' });
});` },
    alt: [{ lang: 'java', check: false, code: `@GetMapping("/api/greet")
public Map<String, String> greet(@RequestParam(defaultValue = "world") String name) {
    if (name.length() > 30) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "name must be at most 30 characters");
    return Map.of("greeting", "Hello, " + name + "!");
}` }],
    complexity: `<p>O(length of name) for the length check; constant memory.</p>`,
    followUps: ['What happens with ?name=a&amp;name=b in Express and in Spring?', 'How would you escape the name if you later render it in HTML?']
  }
});

practice.push({
  title: 'Design the Route Table for a Library API', level: 'Easy', tags: ['rest', 'design', 'routing'], companies: ['Wipro', 'Cognizant'], lang: 'java',
  statement: `<p>A library wants an API for <b>books</b> and <b>members</b>. Members can borrow and return books. Write the route table (method, path, success status, what it returns) for: list/create/read/update/delete books, list/create members, borrow a book, return a book, and list a member's borrowed books.</p>`,
  constraints: `Plural nouns, no verbs in paths where a method already says it. Give the success status for each. Exactly one place for the borrow action.`,
  example: `${H.table(['Method', 'Path', 'Status'], [['GET', '/books', '200'], ['POST', '/books', '201'], ['GET', '/members/7/loans', '200']])}<p>Why: <code>loans</code> is a noun for the relationship, so borrowing is "create a loan".</p>`,
  brute: { why: `<p>Verb-style URLs like <code>/borrowBook</code>, <code>/returnBook?id=3</code> turn the API into remote procedure calls. Every new action invents a new URL shape, caching and tooling cannot reason about it, and clients cannot guess endpoints.</p>` },
  mcq: { q: 'Which design models "borrowing a book" most RESTfully?', options: ['POST /members/7/loans with {bookId}', 'GET /borrowBook?member=7&book=3', 'PUT /borrow/7/3', 'POST /doBorrow'], answer: 0, explain: 'A loan is a resource. Creating one is POST to the loans collection (201 Created); returning it is a state change on that loan.' },
  hints: [
    `<p>Hint 1: list the nouns first (book, member, loan). Each noun gets a plural collection path.</p>`,
    `<p>Hint 2: an action between two things becomes a new resource: a "loan" links a member and a book, so borrowing = create a loan.</p>`,
    `<p>Hint 3: returning a book either updates the loan (<code>PATCH /loans/{id}</code> with <code>returned: true</code>) or deletes it - pick one, document it, and give errors: 404 unknown ids, 409 if the book is already on loan.</p>`
  ],
  solution: {
    approach: `<p><b>Books:</b> <code>GET /books</code> 200, <code>POST /books</code> 201, <code>GET /books/{id}</code> 200/404, <code>PUT /books/{id}</code> 200/404, <code>DELETE /books/{id}</code> 204/404. <b>Members:</b> <code>GET /members</code> 200, <code>POST /members</code> 201. <b>Loans</b> (the relationship): <code>POST /members/{memberId}/loans</code> with body <code>{"bookId":3}</code> returns 201 and a Location of the new loan, or 409 if the book is already on loan, or 404 if member/book is missing. <code>PATCH /loans/{loanId}</code> with <code>{"returned":true}</code> (or <code>POST /loans/{id}/return</code> if your team accepts one action-style endpoint) returns 200. <code>GET /members/{memberId}/loans</code> lists a member's loans, optionally <code>?status=active</code>.</p>
    <p>The key idea is that every action is expressed as creating or changing a noun, so the standard methods and status codes keep their meaning, and clients can learn the API from a handful of patterns.</p>`,
    complexity: `<p>Design question - no runtime cost. The cost of a bad design is paid later in breaking changes.</p>`,
    followUps: ['How would you add pagination to GET /books?', 'How would you version this API?']
  }
});

practice.push({
  title: 'Spot the Wrong Status Codes', level: 'Easy', tags: ['status codes', 'http', 'review'], companies: ['Accenture'], lang: 'java',
  statement: `<p>A teammate's API behaves as follows. Name the better status for each and say why: (1) POST creates a book and returns <code>200</code>; (2) GET unknown id returns <code>200 {"error":"not found"}</code>; (3) validation failure returns <code>500</code>; (4) DELETE returns <code>200 {}</code> with an empty object; (5) wrong JSON content type returns <code>400</code> "bad"; (6) a NullPointerException returns <code>400</code>.</p>`,
  constraints: `One-line reason per item. Mention whether a client should retry.`,
  example: `${H.table(['Behaviour', 'Better', 'Reason'], [['(1) POST create returns 200', '201 + Location', 'a new resource exists at a new URL']])}`,
  brute: { why: `<p>"As long as the body explains it, the status code does not matter." Wrong: load balancers, retry logic, caches, SDKs and monitoring read only the status code. A 200 that hides an error is invisible to all of them.</p>` },
  mcq: { q: 'A NullPointerException in your service should become…', options: ['500, with details logged server-side', '400, because the user caused it', '200 with an error message', '404'], answer: 0, explain: 'An unexpected exception is a server fault. 4xx would blame the client and tell them not to retry, hiding a real bug from alerts.' },
  hints: [
    `<p>Hint 1: ask "who is at fault?" - the client (4xx), the server (5xx), or nobody (2xx)?</p>`,
    `<p>Hint 2: missing resources are 404, unreadable or invalid input is 400 (or 422), successful empty responses are 204.</p>`,
    `<p>Hint 3: remember the retry rule - clients may retry 5xx (maybe the server recovers) but should not retry 4xx unchanged.</p>`
  ],
  solution: {
    approach: `<p>(1) <b>201 Created</b> plus a <code>Location</code> header, because a new resource now exists. (2) <b>404 Not Found</b>; returning 200 with an error body fools monitoring, caches and every client that checks <code>response.ok</code>. (3) <b>400</b> (or 422) with the list of field errors: the client sent bad data, and a 500 would page the on-call engineer for a user typo and cause useless retries. (4) <b>204 No Content</b> with no body, since there is nothing to say; some APIs return the deleted representation with 200, but an empty object is the worst of both. (5) <b>415 Unsupported Media Type</b>, which tells the client precisely what to fix (the Content-Type), instead of a vague 400. (6) <b>500 Internal Server Error</b> with a generic message and the stack trace only in server logs; it is our bug, not the client's.</p>
    <p>Takeaway: pick codes by blame and by what an automated client should do next, not by what looks friendly in a browser.</p>`,
    complexity: `<p>Review exercise - no runtime cost.</p>`,
    followUps: ['When is 422 better than 400?', 'What should a client do on 503 with Retry-After?']
  }
});

practice.push({
  title: 'Why Is req.body undefined?', level: 'Easy', tags: ['express', 'debugging', 'json'], companies: ['Flipkart'], lang: 'js',
  statement: `<p>This Express app prints <code>undefined</code> for <code>req.body</code> even though you send JSON with curl. List every reason that can cause it and give the fixed code.</p><pre>const app = express();
app.post('/api/books', (req, res) =&gt; { console.log(req.body); res.sendStatus(201); });
app.use(express.json());</pre>`,
  constraints: `Find at least two independent causes (one is in the code, one is in the curl command).`,
  example: `<p>Command: <code>curl -X POST localhost:3000/api/books -d '{"title":"Dune"}'</code></p><p>Result: <code>undefined</code>. Two bugs hide here: middleware order, and a missing header.</p>`,
  brute: { why: `<p>Adding random things like <code>bodyParser</code>, <code>app.use(cors())</code> or reinstalling packages. Without knowing the request flow (middleware runs top to bottom; the body is only parsed when the Content-Type matches), you try fixes blindly.</p>` },
  mcq: { q: 'In Express, where must app.use(express.json()) be placed to affect a route?', options: ['Before the route is registered', 'After all routes', 'Anywhere, order is irrelevant', 'Inside the listen callback'], answer: 0, explain: 'Express runs middleware and routes in registration order. A route registered before the parser sees an unparsed body.' },
  hints: [
    `<p>Hint 1: Express processes functions in the order you register them. Which one reads the body stream?</p>`,
    `<p>Hint 2: <code>express.json()</code> only parses a body when the request says <code>Content-Type: application/json</code>. What does <code>curl -d</code> send by default?</p>`,
    `<p>Hint 3: the fix has two parts - move <code>app.use(express.json())</code> above the routes, and add <code>-H "Content-Type: application/json"</code> to the curl command. Also guard against an absent body in the handler.</p>`
  ],
  solution: {
    approach: `<p><b>Cause 1 (code):</b> the route is registered before <code>express.json()</code>, so when the request reaches the handler nobody has parsed the body yet. Middleware order is execution order. <b>Cause 2 (client):</b> <code>curl -d</code> defaults to <code>Content-Type: application/x-www-form-urlencoded</code>, which <code>express.json()</code> deliberately ignores, so even with the right order <code>req.body</code> would stay empty (<code>undefined</code> in Express 5, <code>{}</code> in Express 4). <b>Cause 3 (rare):</b> body larger than the limit gives 413, and invalid JSON gives a 400 - those are errors, not undefined. Fix: register the JSON parser first, send the header, and in handlers treat <code>req.body</code> defensively (<code>const body = req.body ?? {}</code>), returning 400 when required fields are missing.</p>`,
    code: { lang: 'js', check: false, code: `const app = express();
app.use(express.json());                                   // 1) parser BEFORE routes
app.post('/api/books', (req, res) => {
  const body = req.body ?? {};                             // 3) never assume it exists
  if (!body.title) return res.status(400).json({ message: 'title is required' });
  res.sendStatus(201);
});
// 2) curl -X POST localhost:3000/api/books -H "Content-Type: application/json" -d '{"title":"Dune"}'` },
    complexity: `<p>No algorithmic cost; the parser reads the body once, bounded by the size limit.</p>`,
    followUps: ['How do you accept form posts as well?', 'What does 413 Payload Too Large mean here?']
  }
});

practice.push({
  title: 'Todo CRUD API in Both Stacks', level: 'Medium', tags: ['crud', 'spring boot', 'express', 'layers'], companies: ['Zoho', 'Swiggy'], lang: 'java',
  statement: `<p>Build a Todo API with fields <code>id</code>, <code>text</code> (1-200 chars), <code>done</code> (boolean, default false). Endpoints: <code>GET /api/todos?done=true|false</code> (optional filter), <code>POST</code>, <code>GET /{id}</code>, <code>PUT /{id}</code>, <code>PATCH /{id}/done</code> (toggle), <code>DELETE /{id}</code>. Use controller/service/repository layers, validation (400 with all errors), a global error handler (404 for unknown id) and give the curl commands.</p>`,
  constraints: `In-memory storage. Thread-safe id generation. No business logic in controllers. Consistent JSON error shape. Query filter <code>done</code> must reject values other than true/false with 400.`,
  example: `${H.table(['curl', 'Status'], [['<code>POST /api/todos {"text":"Buy milk"}</code>', '201, done=false'], ['<code>POST /api/todos {"text":""}</code>', '400, text is required'], ['<code>GET /api/todos?done=maybe</code>', '400'], ['<code>PATCH /api/todos/1/done</code>', '200, done=true'], ['<code>GET /api/todos/99</code>', '404']])}`,
  brute: { why: `<p>All routes in one file, with a global array, copy-pasted validation and <code>try/catch</code> in every handler. It runs, but adding a database means rewriting everything, errors have different shapes per endpoint, and nothing can be unit tested without HTTP.</p>` },
  mcq: { q: 'GET /api/todos?done=maybe should return…', options: ['400 Bad Request', '200 with all todos', '404 Not Found', '500'], answer: 0, explain: 'The parameter is present but not a valid boolean; this is a client input error, so 400 with a clear message.' },
  hints: [
    `<p>Hint 1: copy the Books structure: <code>Todo</code> record, <code>TodoRepository</code> interface + in-memory implementation, <code>TodoService</code>, <code>TodoController</code>.</p>`,
    `<p>Hint 2: validation of the body is a DTO/validator job; validation of the <code>done</code> query value is also at the edge - parse "true"/"false" strictly and fail otherwise. "Not found" is a service decision.</p>`,
    `<p>Hint 3: the toggle endpoint reads the current todo, flips <code>done</code>, saves, returns 200. Make it atomic if you care about two simultaneous toggles (a lock or <code>compute</code> on the map entry).</p>`
  ],
  solution: {
    approach: `<p><b>Structure:</b> repository (Map + AtomicLong), service (<code>create</code>, <code>list(Boolean done)</code>, <code>get</code>, <code>update</code>, <code>toggle</code>, <code>delete</code>, throwing <code>NotFoundException</code> for unknown ids), controller (thin), validator for <code>text</code> (1-200 chars, trimmed), global handler mapping NotFound to 404, validation to 400, everything else to 500. <b>Filter:</b> parse <code>done</code> in the controller: absent means null (no filter), "true"/"false" map to booleans, anything else raises a 400. <b>Toggle:</b> <code>repo.findById</code> then save <code>done = !done</code>; use <code>ConcurrentHashMap.compute</code> to make read-modify-write atomic. <b>Verification:</b> run the curl list: create (201), invalid (400 with message), list with filter, patch (200), get missing (404), delete (204), delete again (404).</p>
    <p>Running the same script against both stacks must give identical statuses; differences point to inconsistent error handling, usually the unknown-route 404 or broken-JSON case.</p>`,
    code: { lang: 'java', title: 'Plain-Java core: repository + service with atomic toggle', code: `record Todo(long id, String text, boolean done) {}

class TodoNotFoundException extends RuntimeException {
    TodoNotFoundException(long id) { super("Todo " + id + " does not exist"); }
}

class TodoService {
    private final Map<Long, Todo> store = new ConcurrentHashMap<>();
    private final AtomicLong seq = new AtomicLong();

    Todo create(String text) {
        if (text == null || text.trim().isEmpty() || text.length() > 200) {
            throw new IllegalArgumentException("text must be 1-200 characters");
        }
        long id = seq.incrementAndGet();
        Todo t = new Todo(id, text.trim(), false);
        store.put(id, t);
        return t;
    }

    List<Todo> list(Boolean done) {                       // null means "no filter"
        List<Todo> out = new ArrayList<>();
        for (Todo t : store.values()) if (done == null || t.done() == done) out.add(t);
        out.sort(Comparator.comparingLong(Todo::id));
        return out;
    }

    Todo toggle(long id) {
        // compute() runs atomically for this key, so two toggles cannot interleave
        Todo updated = store.computeIfPresent(id, (k, t) -> new Todo(t.id(), t.text(), !t.done()));
        if (updated == null) throw new TodoNotFoundException(id);
        return updated;
    }

    void delete(long id) { if (store.remove(id) == null) throw new TodoNotFoundException(id); }
}` },
    complexity: `<p>Create/get/toggle/delete are O(1) on the map; list is O(n log n) because of sorting for a stable order. Memory O(n).</p>`,
    followUps: ['Add pagination to GET /api/todos.', 'Replace the Map with a database table and describe what changes.']
  }
});

practice.push({
  title: 'Filter, Sort and Paginate GET /books', level: 'Medium', tags: ['query params', 'pagination', 'validation'], companies: ['Amazon'], lang: 'java',
  statement: `<p>Extend <code>GET /api/books</code> with query parameters: <code>author</code> (exact, case-insensitive), <code>page</code> (1-based, default 1), <code>size</code> (default 10, max 50), <code>sort</code> (<code>title</code> or <code>year</code>, default <code>title</code>). Return the page items plus metadata <code>{items, page, size, total}</code>. Invalid parameters must give 400.</p>`,
  constraints: `size above 50 is rejected (not silently capped) so clients notice. page less than 1 is a 400. Unknown sort field is a 400, never passed to storage unchecked.`,
  example: `<p><code>GET /api/books?author=orwell&amp;page=2&amp;size=2&amp;sort=year</code></p>${H.table(['Step', 'Result'], [['filter author = orwell', '5 books'], ['sort by year', 'ordered'], ['skip (page-1)*size = 2, take 2', 'books #3 and #4'], ['response', '<code>{items:[2], page:2, size:2, total:5}</code>']])}`,
  brute: { why: `<p>Returning every book and letting the client filter. With 1 million rows that is a huge response, wasted bandwidth and memory, and a denial-of-service opportunity. Also blindly using <code>sort</code> as a column name later becomes SQL injection.</p>` },
  mcq: { q: 'Why validate sort against an allow-list?', options: ['Unchecked sort text can reach the database query and enable injection or errors', 'Sorting is slower otherwise', 'JSON cannot contain sort', 'It is required by HTTP'], answer: 0, explain: 'Allow-list the permitted fields; never splice client text into queries or property lookups.' },
  hints: [
    `<p>Hint 1: split the work in order: filter, then sort, then skip/limit - and compute <code>total</code> after filtering but before slicing.</p>`,
    `<p>Hint 2: parse and validate all four parameters first (collect errors), only then call the service. Use an allow-list map for sort fields.</p>`,
    `<p>Hint 3: the formula is <code>from = (page-1)*size</code>, <code>to = min(from+size, total)</code>. Page past the end returns an empty <code>items</code> with a correct <code>total</code>, not an error.</p>`
  ],
  solution: {
    approach: `<p>Validate at the edge and collect errors: page integer at least 1, size integer 1-50, sort in <code>{title, year}</code>. In the service: stream the repository's books, filter by author (case-insensitive) when given, sort with a comparator chosen from the allow-list (add id as a tie-breaker so paging is stable), compute total, then skip/limit. Return a page object. Keep page logic in the service so a queue consumer or CLI could reuse it. For a real database push all of it into the query (<code>WHERE</code>, <code>ORDER BY</code>, <code>LIMIT/OFFSET</code>) - the Data Access module compares offset with keyset pagination, which avoids slow deep pages.</p>`,
    code: { lang: 'java', code: `record Book(long id, String title, String author, int year) {}
record Page<T>(List<T> items, int page, int size, int total) {}

class BookQuery {
    private static final Map<String, Comparator<Book>> SORTS = Map.of(
        "title", Comparator.comparing(Book::title, String.CASE_INSENSITIVE_ORDER),
        "year", Comparator.comparingInt(Book::year));              // allow-list: only these two

    static Page<Book> find(List<Book> all, String author, int page, int size, String sort) {
        if (page < 1) throw new IllegalArgumentException("page must be at least 1");
        if (size < 1 || size > 50) throw new IllegalArgumentException("size must be between 1 and 50");
        Comparator<Book> cmp = SORTS.get(sort);
        if (cmp == null) throw new IllegalArgumentException("sort must be title or year");

        List<Book> filtered = all.stream()
                .filter(b -> author == null || b.author().equalsIgnoreCase(author))
                .sorted(cmp.thenComparingLong(Book::id))            // tie-breaker keeps pages stable
                .collect(Collectors.toList());
        int from = Math.min((page - 1) * size, filtered.size());
        int to = Math.min(from + size, filtered.size());
        return new Page<>(filtered.subList(from, to), page, size, filtered.size());
    }
}` },
    complexity: `<p>In memory: O(n log n) for the sort per request. With a database index on the sort column it becomes O(page size) for the first pages and O(offset) for deep offset pages.</p>`,
    followUps: ['Why is offset pagination slow for page 100000?', 'How do you add a Link header with next/prev pages?']
  }
});

practice.push({
  title: 'Custom Validation: ISBN-13 Check Digit', level: 'Medium', tags: ['validation', 'custom rule', 'java'], companies: ['Goldman Sachs'], lang: 'java',
  statement: `<p>Books carry an ISBN-13 such as <code>978-0-306-40615-7</code>. Write a validator that accepts hyphens/spaces, requires exactly 13 digits and a correct check digit (digits multiplied alternately by 1 and 3 must sum to a multiple of 10). Show how it plugs in as a Spring constraint and into the Express validator, and which status a bad ISBN gets.</p>`,
  constraints: `Null or blank is handled separately (required rule). No regex-only solution: the checksum must be verified. O(length).`,
  example: `${H.table(['Input', 'Valid?', 'Why'], [['978-0-306-40615-7', '<span class="c-g">yes</span>', 'weighted sum 100 -> multiple of 10'], ['978-0-306-40615-6', '<span class="c-r">no</span>', 'check digit wrong (sum 99)'], ['978-0-306-4061', '<span class="c-r">no</span>', 'only 11 digits']])}`,
  brute: { why: `<p>A regex like <code>\\d{13}</code> accepts any 13 digits, including typos. Typos are exactly what the check digit exists to catch; accepting them stores garbage that fails later at a partner system.</p>`, code: { lang: 'java', code: `class BruteIsbn { static boolean ok(String s) { return s != null && s.replace("-", "").matches("\\\\d{13}"); } }` } },
  mcq: { q: 'The ISBN checksum weights alternate…', options: ['1, 3, 1, 3, ...', '2, 4, 2, 4, ...', '1, 2, 3, 4, ...', '10, 9, 8, ...'], answer: 0, explain: 'ISBN-13 (like EAN-13) multiplies digits alternately by 1 and 3; the total must be divisible by 10.' },
  hints: [
    `<p>Hint 1: first normalise: remove hyphens and spaces, then everything left must be exactly 13 digit characters.</p>`,
    `<p>Hint 2: loop over indices 0..12; weight is 1 for even index and 3 for odd index; add digit times weight.</p>`,
    `<p>Hint 3: valid when the sum modulo 10 equals 0. Test with a known valid ISBN, the same with one digit changed, wrong length, letters, and null.</p>`
  ],
  solution: {
    approach: `<p>Normalise, check length and characters, then compute the weighted sum. Place the function in a small <code>IsbnValidator</code> class (pure, no framework) so the service, a constraint validator and tests can all call it. In Spring wrap it as a custom annotation <code>@Isbn13</code> with a <code>ConstraintValidator&lt;Isbn13, String&gt;</code> that returns true for null (leaving "required" to <code>@NotBlank</code>). In Express call it from <code>validateBook</code> and push a <code>{field:'isbn', message:'isbn is not a valid ISBN-13'}</code> error. A bad ISBN is malformed input, so <span class="c-r">400</span> with the field detail. Uniqueness of the ISBN is a different rule: the service checks it and answers 409.</p>`,
    code: { lang: 'java', code: `class IsbnValidator {
    static boolean isValid(String raw) {
        if (raw == null) return false;
        String s = raw.replace("-", "").replace(" ", "");
        if (s.length() != 13) return false;
        int sum = 0;
        for (int i = 0; i < 13; i++) {
            char c = s.charAt(i);
            if (c < '0' || c > '9') return false;
            sum += (c - '0') * (i % 2 == 0 ? 1 : 3);          // weights 1,3,1,3,...
        }
        return sum % 10 == 0;
    }

    public static void main(String[] args) {
        System.out.println(isValid("978-0-306-40615-7"));    // true
        System.out.println(isValid("978-0-306-40615-6"));    // false
        System.out.println(isValid("978-0-306-4061"));       // false
    }
}` },
    alt: [{ lang: 'java', check: false, code: `@Target(FIELD) @Retention(RUNTIME) @Constraint(validatedBy = Isbn13Validator.class)
public @interface Isbn13 { String message() default "isbn is not a valid ISBN-13"; Class<?>[] groups() default {}; Class<? extends Payload>[] payload() default {}; }

public class Isbn13Validator implements ConstraintValidator<Isbn13, String> {
    public boolean isValid(String value, ConstraintValidatorContext ctx) {
        return value == null || IsbnValidator.isValid(value);   // null is @NotBlank's job
    }
}` }],
    complexity: `<p>O(1) for fixed length 13 (O(n) in the raw input length for normalising); constant memory.</p>`,
    followUps: ['How does ISBN-10 differ?', 'Where do you enforce uniqueness and why not in the validator?']
  }
});

practice.push({
  title: 'Request ID in Every Log Line and Error Response', level: 'Medium', tags: ['middleware', 'filters', 'logging', 'error handling'], companies: ['Uber', 'Atlassian'], lang: 'java',
  statement: `<p>Support wants to find the logs for one failed request quickly. Add a <b>request id</b>: accept the incoming <code>X-Request-Id</code> header or generate a new one, return it in the response header, include it in every log line for that request, and include it in the JSON body of every error response. Show the Spring and Express versions.</p>`,
  constraints: `Generate ids with a UUID (not sequential). Incoming ids longer than 64 chars or with odd characters are replaced (never trust headers blindly). Must work for async handlers.`,
  example: `<p>Request: <code>GET /api/books/999</code> -> response header <code>X-Request-Id: 7c1e...</code> and body <code>{"status":404,"message":"Book 999 does not exist","requestId":"7c1e..."}</code>. Server log lines for that request all start with <code>[7c1e...]</code>.</p>`,
  brute: { why: `<p>Logging "error happened" with no identifier. When 50 requests fail per minute, nobody can tell which log line belongs to the customer who complained, so debugging means guesswork and wide log searches by timestamp.</p>` },
  mcq: { q: 'Why validate an incoming X-Request-Id header before using it?', options: ['It is client-controlled and could carry huge or malicious text into logs', 'Headers are always numeric', 'The header is mandatory in HTTP', 'UUIDs cannot be sent in headers'], answer: 0, explain: 'Anything from the client is untrusted. Accept only a short safe pattern, otherwise generate your own; this also prevents log injection (newlines in the value).' },
  hints: [
    `<p>Hint 1: this is cross-cutting work that applies to every request, so it belongs in a filter (Spring) or a middleware (Express), not in controllers.</p>`,
    `<p>Hint 2: Spring - a <code>OncePerRequestFilter</code> that puts the id in the logging <code>MDC</code> and clears it in <code>finally</code>. Express - middleware that stores the id on <code>res.locals</code> (and <code>AsyncLocalStorage</code> if loggers need it).</p>`,
    `<p>Hint 3: the global error handler reads the id and adds it to the body. Always clear MDC / leave the async context at the end so ids do not leak between requests on reused threads.</p>`
  ],
  solution: {
    approach: `<p>Create one component that runs first for every request: read <code>X-Request-Id</code>; accept it only if it matches a safe pattern (alphanumerics and dashes, max 64 chars), otherwise generate a UUID. Set it on the response header immediately, so even a crash response carries it. In Spring put it in the SLF4J <code>MDC</code> so the log pattern <code>%X{requestId}</code> prints it automatically, and remove it in a <code>finally</code> block (threads are pooled and reused, so a leftover id would be attached to someone else's request). In Express, set <code>res.locals.requestId</code> and, for logging deep in services without passing it around, run the rest of the request inside <code>AsyncLocalStorage.run</code>. The global error handler from the error-handling topic adds <code>requestId</code> to its JSON, which is what a user can quote to support.</p>
    <p>When requests call other services, forward the same header; that is the first step towards distributed tracing, covered in the Observability module.</p>`,
    code: { lang: 'js', check: false, code: `import { randomUUID } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';

export const als = new AsyncLocalStorage();
const SAFE = /^[A-Za-z0-9-]{1,64}$/;

export function requestId(req, res, next) {
  const incoming = req.get('X-Request-Id');
  const id = incoming && SAFE.test(incoming) ? incoming : randomUUID();
  res.setHeader('X-Request-Id', id);
  res.locals.requestId = id;
  als.run({ id }, next);                         // everything after this sees the same id
}
export const log = (msg) => console.log('[' + (als.getStore()?.id ?? '-') + '] ' + msg);

// in the error handler:  res.status(status).json({ ..., requestId: res.locals.requestId })` },
    alt: [{ lang: 'java', check: false, code: `@Component
class RequestIdFilter extends OncePerRequestFilter {
    private static final Pattern SAFE = Pattern.compile("^[A-Za-z0-9-]{1,64}$");

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String incoming = req.getHeader("X-Request-Id");
        String id = (incoming != null && SAFE.matcher(incoming).matches()) ? incoming : UUID.randomUUID().toString();
        MDC.put("requestId", id);                 // log pattern: [%X{requestId}] %msg
        res.setHeader("X-Request-Id", id);
        try { chain.doFilter(req, res); }
        finally { MDC.remove("requestId"); }      // threads are reused: always clean up
    }
}` }],
    complexity: `<p>O(1) per request; one regex test and one UUID generation (microseconds).</p>`,
    followUps: ['How do you forward the id to downstream HTTP calls?', 'What is the W3C traceparent header and how does it relate?']
  }
});

practice.push({
  title: 'Swap the Repository and Add a Logging Decorator', level: 'Medium', tags: ['layers', 'interfaces', 'decorator', 'dependency injection'], companies: ['Thoughtworks'], lang: 'java',
  statement: `<p>Your <code>BookService</code> uses a <code>BookRepository</code> interface. Without changing the service, add a <code>LoggingBookRepository</code> that wraps any repository and records every call (method name and argument) into a list, to prove the wiring is swappable. Then show how you would wire it in Spring and Express.</p>`,
  constraints: `The service class must not change. The decorator must implement the same interface and delegate every method. Show a runnable demo.`,
  example: `<p>Calling <code>service.create("Dune","Herbert",1965)</code> with the decorated repository produces the calls list <code>[existsByTitle(Dune), save(Dune)]</code>, and the book is stored as before.</p>`,
  brute: { why: `<p>Editing the service to add <code>System.out.println</code> in every method. That mixes logging with business rules, has to be repeated for each repository operation, and removing it later means touching the service again.</p>` },
  mcq: { q: 'What makes the decorator possible without touching the service?', options: ['The service depends on an interface, not a concrete class', 'The service is static', 'Java forbids inheritance', 'The service uses reflection'], answer: 0, explain: 'Because BookService only knows BookRepository, any implementation - including a wrapper around another repository - can be injected.' },
  hints: [
    `<p>Hint 1: the decorator holds a reference to another <code>BookRepository</code> (the delegate) and implements the same methods.</p>`,
    `<p>Hint 2: each method first records the call in a list, then returns <code>delegate.method(...)</code>.</p>`,
    `<p>Hint 3: wire it by constructing <code>new BookService(new LoggingBookRepository(new InMemoryBookRepository()))</code>. In Spring use <code>@Primary</code> on the decorator or a <code>@Bean</code> method; in Express wrap the object in a function that logs.</p>`
  ],
  solution: {
    approach: `<p>The decorator pattern: a class that <i>is a</i> repository and <i>has a</i> repository. It keeps the real work in the delegate and adds behaviour around it (logging, metrics, caching, retries). Because <code>BookService</code> depends only on the interface it never knows. In Spring you register the real repository as a bean and expose the decorated one as <code>@Primary</code>, or use AOP for cross-cutting concerns; in Express you wrap the repo object (e.g. loop over its functions and return logged versions). This is the same idea that later powers caching layers and transaction proxies.</p>`,
    code: { lang: 'java', code: `record Book(Long id, String title, String author, int year) {}

interface BookRepository {
    Book save(Book b);
    boolean existsByTitle(String title);
}

class InMemoryBookRepository implements BookRepository {
    private final List<Book> rows = new ArrayList<>();
    public Book save(Book b) { Book s = new Book((long) rows.size() + 1, b.title(), b.author(), b.year()); rows.add(s); return s; }
    public boolean existsByTitle(String t) { return rows.stream().anyMatch(r -> r.title().equalsIgnoreCase(t)); }
}

// The decorator: same interface, wraps another one
class LoggingBookRepository implements BookRepository {
    private final BookRepository delegate;
    final List<String> calls = new ArrayList<>();
    LoggingBookRepository(BookRepository delegate) { this.delegate = delegate; }

    public Book save(Book b) { calls.add("save(" + b.title() + ")"); return delegate.save(b); }
    public boolean existsByTitle(String t) { calls.add("existsByTitle(" + t + ")"); return delegate.existsByTitle(t); }
}

class BookService {                                           // unchanged, knows only the interface
    private final BookRepository repo;
    BookService(BookRepository repo) { this.repo = repo; }
    Book create(String title, String author, int year) {
        if (repo.existsByTitle(title)) throw new IllegalStateException("duplicate");
        return repo.save(new Book(null, title, author, year));
    }
}

class DecoratorDemo {
    public static void main(String[] args) {
        LoggingBookRepository logged = new LoggingBookRepository(new InMemoryBookRepository());
        BookService service = new BookService(logged);
        System.out.println(service.create("Dune", "Frank Herbert", 1965));
        System.out.println(logged.calls);                      // [existsByTitle(Dune), save(Dune)]
    }
}` },
    complexity: `<p>Adds O(1) per call (one list append). The architectural benefit is zero change to the service.</p>`,
    followUps: ['How would Spring AOP achieve the same without writing the decorator?', 'How would you decorate with a cache and what invalidation problem appears?']
  }
});

practice.push({
  title: 'Unit-Test a Service With a Fake Repository', level: 'Medium', tags: ['testing', 'service layer', 'fakes'], companies: ['Paytm', 'Microsoft'], lang: 'java',
  statement: `<p>Write tests (plain Java with a tiny assertion helper is fine) proving: (1) a valid book is saved and gets an id; (2) an invalid book throws a <code>ValidationException</code> listing <i>all</i> problems and <b>never calls the repository</b>; (3) a duplicate title throws and does not save a second row.</p>`,
  constraints: `No HTTP, no Spring, no mocking library. Use a hand-written fake repository that counts saves. Each test must be independent.`,
  example: `<p>Test 2 input: title blank, author null, year 3000. Expected: exception with 3 errors and <code>repo.saveCount == 0</code>.</p>`,
  brute: { why: `<p>Only testing through HTTP with curl or a running server. It is slow, needs ports and a database, and a failing test could be a routing problem, a JSON problem or a rule problem - you cannot tell which layer broke.</p>` },
  mcq: { q: 'Why assert saveCount == 0 for invalid input?', options: ['It proves invalid data never reaches storage', 'It speeds up the test', 'It is required by JUnit', 'Fakes cannot count calls'], answer: 0, explain: 'The behaviour that matters is not just throwing, but that nothing was persisted. A counting fake makes that visible.' },
  hints: [
    `<p>Hint 1: a fake repository is a tiny real implementation (a list) plus counters. It is simpler and more reliable than a mock that returns canned answers.</p>`,
    `<p>Hint 2: create a new service and fake in each test so tests cannot affect each other.</p>`,
    `<p>Hint 3: use a helper like <code>check(condition, message)</code> that prints PASS/FAIL and a final count, so you can run it with just <code>main</code>.</p>`
  ],
  solution: {
    approach: `<p>Build the service against the <code>BookRepository</code> interface, inject a <code>FakeRepo</code> with <code>saveCount</code>, and exercise the three behaviours. For test 2 catch <code>ValidationException</code> and assert its error list has three entries and that <code>saveCount</code> is zero. For test 3 create the same title twice (different case) and assert the second call throws <code>DuplicateBookException</code> and that the total number of rows is still one. Using fakes instead of mocks keeps tests focused on observable behaviour rather than on which methods were called in which order, so refactoring the service internals does not break them.</p>
    <p>These tests run in milliseconds, so they can run on every save; the HTTP-level tests (MockMvc/supertest) then only need to prove routing, serialisation and error mapping, not every rule.</p>`,
    code: { lang: 'java', code: `record Book(Long id, String title, String author, int year) {}
class ValidationException extends RuntimeException {
    final List<String> errors;
    ValidationException(List<String> e) { super("invalid"); errors = e; }
}
class DuplicateBookException extends RuntimeException { DuplicateBookException() { super("duplicate"); } }

interface BookRepository { Book save(Book b); boolean existsByTitle(String t); }

class FakeRepo implements BookRepository {
    final List<Book> rows = new ArrayList<>();
    int saveCount = 0;
    public Book save(Book b) { saveCount++; Book s = new Book((long) rows.size() + 1, b.title(), b.author(), b.year()); rows.add(s); return s; }
    public boolean existsByTitle(String t) { return rows.stream().anyMatch(r -> r.title().equalsIgnoreCase(t)); }
}

class BookService {
    private final BookRepository repo;
    BookService(BookRepository repo) { this.repo = repo; }
    Book create(String title, String author, Integer year) {
        List<String> errors = new ArrayList<>();
        if (title == null || title.isBlank()) errors.add("title is required");
        if (author == null || author.isBlank()) errors.add("author is required");
        if (year == null || year < 1000 || year > 2026) errors.add("year out of range");
        if (!errors.isEmpty()) throw new ValidationException(errors);
        if (repo.existsByTitle(title.trim())) throw new DuplicateBookException();
        return repo.save(new Book(null, title.trim(), author.trim(), year));
    }
}

class ServiceTests {
    static int failures = 0;
    static void check(boolean ok, String name) { System.out.println((ok ? "PASS " : "FAIL ") + name); if (!ok) failures++; }

    public static void main(String[] args) {
        // 1) valid book is saved
        FakeRepo r1 = new FakeRepo();
        Book b = new BookService(r1).create("Dune", "Frank Herbert", 1965);
        check(b.id() == 1L && r1.saveCount == 1, "valid book saved with id 1");

        // 2) invalid input: all errors reported, nothing saved
        FakeRepo r2 = new FakeRepo();
        try {
            new BookService(r2).create(" ", null, 3000);
            check(false, "invalid input should throw");
        } catch (ValidationException e) {
            check(e.errors.size() == 3 && r2.saveCount == 0, "3 errors collected and repo untouched");
        }

        // 3) duplicate (different case) rejected, still one row
        FakeRepo r3 = new FakeRepo();
        BookService s3 = new BookService(r3);
        s3.create("Dune", "A", 1965);
        try {
            s3.create("dune", "B", 2000);
            check(false, "duplicate should throw");
        } catch (DuplicateBookException e) {
            check(r3.rows.size() == 1, "duplicate rejected, one row remains");
        }
        System.out.println(failures == 0 ? "ALL PASSED" : failures + " FAILED");
    }
}` },
    complexity: `<p>Each test is O(1)-ish; the whole suite runs in milliseconds with no I/O.</p>`,
    followUps: ['When would a mock be better than a fake?', 'What belongs in an HTTP-level test instead?']
  }
});

practice.push({
  title: 'Make the In-Memory Repository Safe Under Concurrency', level: 'Hard', tags: ['concurrency', 'repository', 'race condition', 'java'], companies: ['Google', 'Amazon'], lang: 'java',
  statement: `<p>The repository below uses a plain <code>HashMap</code> and <code>int nextId++</code>, and the service checks "title exists?" before saving. Under 8 concurrent requests creating the same title you can get duplicate ids, lost updates, even exceptions, and two copies of the same title. Explain each race and write a thread-safe repository where exactly one of N simultaneous creates of the same title succeeds.</p>`,
  constraints: `No external libraries. Use only java.util.concurrent. The uniqueness decision must be a single atomic operation, not "check then save". Prove it with a multi-threaded demo.`,
  example: `<p>8 threads call <code>insertIfTitleFree("Dune", ...)</code> at once. Correct result: <b>1 success, 7 empty results</b>, map size 1. The unsafe version often shows 2 to 8 successes.</p>`,
  brute: { why: `<p>Making every method <code>synchronized</code> works but serialises all requests through one lock, and still leaves "check in service, save in repository" as two separate steps if the service does the check outside the lock. Locking in the wrong place gives slowness without correctness.</p>`, code: { lang: 'java', code: `class UnsafeRepo {
    private final Map<Long, String> byId = new HashMap<>();   // not thread-safe
    private int next = 1;                                      // next++ is read-modify-write
    boolean exists(String t) { return byId.containsValue(t); }
    long save(String t) { long id = next++; byId.put(id, t); return id; }
}` } },
  mcq: { q: 'Which operation makes "claim this title if free" atomic?', options: ['ConcurrentHashMap.putIfAbsent(key, value)', 'containsKey then put', 'Two separate synchronized methods', 'Thread.sleep before saving'], answer: 0, explain: 'putIfAbsent checks and inserts as one indivisible step, so exactly one thread wins. check-then-act leaves a gap where others can slip in.' },
  hints: [
    `<p>Hint 1: name the races: (1) <code>next++</code> is three steps (read, add, write), so two threads can get the same id; (2) HashMap is not safe for concurrent writes; (3) check-then-save lets two threads both pass the check.</p>`,
    `<p>Hint 2: use <code>AtomicLong</code> for ids and <code>ConcurrentHashMap</code> for storage. For uniqueness keep a second map from normalised title to id and claim it with <code>putIfAbsent</code>.</p>`,
    `<p>Hint 3: whoever wins <code>putIfAbsent</code> goes on to store the row; losers return empty (the service turns that into 409). Note a losing thread may burn an id - gaps are fine; ids only need to be unique.</p>`
  ],
  solution: {
    approach: `<p><b>The three races:</b> (a) <code>next++</code> is not atomic, so two requests can read the same value and hand out the same id; (b) <code>HashMap</code> corrupts or loses entries under concurrent writes (in old JDKs it could even loop forever on resize); (c) the service's "exists then save" is a classic check-then-act race, since two threads can both see "not exists" before either saves, producing duplicates.</p>
    <p><b>The fix:</b> push the uniqueness decision into one atomic repository operation. Generate ids with <code>AtomicLong.incrementAndGet()</code>, store rows in a <code>ConcurrentHashMap</code>, and claim the normalised title with <code>putIfAbsent</code> in a title index. The thread that gets <code>null</code> back owns the title and inserts the row; others receive "already taken". This is lock-free and scales across cores. In production the same guarantee comes from a <b>unique index in the database</b> (the insert fails with a constraint violation, which the service maps to 409) - application-level checks alone are never enough once you run more than one server instance, because each instance has its own memory.</p>`,
    code: { lang: 'java', code: `record Book(long id, String title, String author) {}

class SafeBookRepository {
    private final Map<Long, Book> byId = new ConcurrentHashMap<>();
    private final Map<String, Long> titleIndex = new ConcurrentHashMap<>();   // normalised title -> id
    private final AtomicLong sequence = new AtomicLong();

    /** Atomically claims the title. Returns empty if someone else already has it. */
    Optional<Book> insertIfTitleFree(String title, String author) {
        String key = title.trim().toLowerCase();
        long id = sequence.incrementAndGet();                  // unique even under contention
        if (titleIndex.putIfAbsent(key, id) != null) {
            return Optional.empty();                           // lost the race (an id may be skipped: fine)
        }
        Book b = new Book(id, title.trim(), author);
        byId.put(id, b);
        return Optional.of(b);
    }
    int size() { return byId.size(); }
}

class RaceDemo {
    public static void main(String[] args) throws Exception {
        SafeBookRepository repo = new SafeBookRepository();
        ExecutorService pool = Executors.newFixedThreadPool(8);
        AtomicInteger successes = new AtomicInteger();
        CountDownLatch startGun = new CountDownLatch(1);
        List<Future<?>> futures = new ArrayList<>();
        for (int i = 0; i < 8; i++) {
            final int n = i;
            futures.add(pool.submit(() -> {
                try { startGun.await(); } catch (InterruptedException e) { return; }
                if (repo.insertIfTitleFree("Dune", "author-" + n).isPresent()) successes.incrementAndGet();
            }));
        }
        startGun.countDown();                                   // release all threads at the same moment
        for (Future<?> f : futures) f.get();
        pool.shutdown();
        System.out.println("successes=" + successes.get() + " size=" + repo.size());   // successes=1 size=1
    }
}` },
    complexity: `<p>O(1) expected per operation, lock-free on the hot path. Memory O(n) for two maps.</p>`,
    followUps: ['Why is a unique database index still needed with multiple app instances?', 'What happens to the skipped ids and does that matter?']
  }
});

practice.push({
  title: 'Optimistic Concurrency on PUT with ETag and If-Match', level: 'Hard', tags: ['http', 'concurrency', 'etag', 'put'], companies: ['Stripe', 'Atlassian'], lang: 'js',
  statement: `<p>Two editors load book 1, both change it, and the second <code>PUT</code> silently overwrites the first (lost update). Design the fix with HTTP: <code>GET</code> returns an <code>ETag</code>; <code>PUT</code> must send <code>If-Match</code>; if it no longer matches, answer <code>412 Precondition Failed</code>; if the header is missing, answer <code>428 Precondition Required</code>. Implement it in Express and describe the Spring equivalent.</p>`,
  constraints: `ETag must change whenever the book changes. Comparison must be exact on the opaque string. The check and the update must happen atomically (no gap between compare and write).`,
  example: `${H.table(['Step', 'Request', 'Result'], [['1', 'GET /books/1', '200, ETag: "v3"'], ['2', 'A: PUT If-Match "v3"', '200, ETag: "v4"'], ['3', 'B: PUT If-Match "v3"', '<span class="c-r">412</span> - B is editing stale data'], ['4', 'B: PUT with no If-Match', '<span class="c-r">428</span>']])}`,
  brute: { why: `<p>"Last write wins": every PUT just overwrites. It is simple, but editor A's changes vanish without anyone being told. With locks held across user think-time (pessimistic locking) you instead block users for minutes. Optimistic checking is cheap and keeps the system responsive.</p>` },
  mcq: { q: 'A PUT arrives with If-Match "v3" but the stored version is now "v4". Correct response?', options: ['412 Precondition Failed', '409 with a silent overwrite', '200 OK, apply anyway', '404 Not Found'], answer: 0, explain: 'If-Match is a precondition. When it fails the server must not apply the change and answers 412 so the client can refetch and merge.' },
  hints: [
    `<p>Hint 1: give each book a <code>version</code> number that increases on every successful update; the ETag can simply be that version in quotes.</p>`,
    `<p>Hint 2: in PUT, read <code>req.get('If-Match')</code>; missing means 428; present but different from the current ETag means 412; equal means proceed and bump the version.</p>`,
    `<p>Hint 3: the compare and the write must be one atomic step inside the repository (single-threaded Node makes a synchronous in-memory update safe; with a database use <code>UPDATE ... WHERE id = ? AND version = ?</code> and check the affected-row count).</p>`
  ],
  solution: {
    approach: `<p>Add a <code>version</code> field (starts at 1). <b>GET</b> sets <code>ETag: "&lt;version&gt;"</code>. <b>PUT</b>: no <code>If-Match</code> header gives <span class="c-r">428 Precondition Required</span>; a header that differs from the current ETag gives <span class="c-r">412 Precondition Failed</span> with the current ETag so the client can refetch; a match applies the update, increments the version and returns 200 with the new ETag. The client on 412 shows "someone else changed this - review their changes", then retries with the fresh ETag.</p>
    <p><b>Atomicity:</b> the compare and the write must not be separable. In Node, a synchronous in-memory update has no gap. With SQL use a conditional update: <code>UPDATE books SET ..., version = version + 1 WHERE id = ? AND version = ?</code>; zero rows updated means someone else won, so respond 412 (or 409). In Spring/JPA put <code>@Version</code> on the entity and handle <code>ObjectOptimisticLockingFailureException</code>; Spring's <code>ShallowEtagHeaderFilter</code> can add ETags for GET caching, but for update protection you compare If-Match yourself or use the version column.</p>
    <p>Trade-off: optimistic control assumes conflicts are rare; if they are common, redesign the resource (finer-grained PATCH or per-field updates) instead of retrying forever.</p>`,
    code: { lang: 'js', check: false, code: `router.get('/:id', (req, res) => {
  const b = service.get(Number(req.params.id));
  res.set('ETag', '"' + b.version + '"').json(b);
});

router.put('/:id', (req, res) => {
  const ifMatch = req.get('If-Match');
  if (!ifMatch) return res.status(428).json({ message: 'If-Match header is required' });

  const current = service.get(Number(req.params.id));
  if (ifMatch !== '"' + current.version + '"') {
    return res.status(412).set('ETag', '"' + current.version + '"')
              .json({ message: 'Book was modified; refetch and retry' });
  }
  const saved = service.update(current.id, { ...req.body, version: current.version + 1 });  // atomic in-memory
  res.set('ETag', '"' + saved.version + '"').json(saved);
});` },
    complexity: `<p>O(1) extra work per request: one header compare and a version increment.</p>`,
    followUps: ['How do ETags also help GET caching (If-None-Match -> 304)?', 'When would you pick pessimistic locking instead?']
  }
});

practice.push({
  title: 'Idempotent POST with an Idempotency-Key', level: 'Hard', tags: ['idempotency', 'post', 'reliability', 'express'], companies: ['Stripe', 'PayPal', 'Razorpay'], lang: 'js',
  statement: `<p>A mobile client times out on <code>POST /api/orders</code> and retries, creating two orders. Implement an <code>Idempotency-Key</code> header: the first request with a key does the work and stores the response; a retry with the same key returns the <b>same status and body</b> without creating anything; the same key with a <i>different</i> body is rejected with 422. Handle two requests with the same key arriving at the same time.</p>`,
  constraints: `Keys expire after 24 hours. The stored response includes status and body. In-memory store is fine for the exercise, but explain what a multi-server deployment needs.`,
  example: `${H.table(['Request', 'Key', 'Result'], [['POST {item:A}', 'k1', '201 order #1 created'], ['POST {item:A} (retry)', 'k1', '201 order #1 (same body, no new order)'], ['POST {item:B}', 'k1', '<span class="c-r">422</span> key reused with different payload'], ['POST {item:C}', 'k2', '201 order #2']])}`,
  brute: { why: `<p>De-duplicating by body ("same item within 5 seconds is a duplicate") blocks legitimate repeat purchases and still misses duplicates that arrive later. The server cannot know the client's intent; only a client-generated key says "this is the same attempt".</p>` },
  mcq: { q: 'Which HTTP methods are idempotent by definition, so retries are safe?', options: ['GET, PUT, DELETE', 'POST and PATCH', 'Only GET', 'None of them'], answer: 0, explain: 'GET, PUT and DELETE are defined as idempotent. POST is not, which is why POST creation needs an Idempotency-Key for safe retries.' },
  hints: [
    `<p>Hint 1: the client generates a unique key (UUID) per logical attempt and sends it in a header; retries reuse the same key.</p>`,
    `<p>Hint 2: store, per key: a hash of the request body, a state (in-progress or done) and the final status plus body. On a repeat: same hash and done means replay; different hash means 422.</p>`,
    `<p>Hint 3: concurrency - claim the key atomically before doing the work (in-memory: set it synchronously; in Redis: <code>SET key value NX EX 86400</code>; in SQL: a unique constraint on the key). A second request that finds "in progress" returns 409 (or waits).</p>`
  ],
  solution: {
    approach: `<p><b>Flow:</b> (1) Require the header on POST orders (400 if missing, or skip the protection by design). (2) Hash the body. (3) Atomically try to <i>claim</i> the key with state "in progress" and the hash. (4) If the claim fails: the stored hash differs, so answer <span class="c-r">422</span>; state is "in progress", so answer <span class="c-r">409</span> ("request still processing, retry shortly"); state is "done", so replay the stored status and body (add an <code>Idempotent-Replayed: true</code> header). (5) If the claim succeeds: run the service, save status and body with state "done", and respond. (6) If the work throws, delete the claim (or store the error) so the client can retry.</p>
    <p><b>Multiple servers:</b> in-process memory is not shared, so use Redis (<code>SET NX EX</code>) or a database table with a unique key; the claim must be atomic in that shared store. Expire entries (24 h) so the table does not grow forever. Note the subtle failure: the server creates the order, crashes before saving the stored response; on retry the key says "in progress" forever. Fix by making the order insert and the key update one database transaction, or by recording the key together with the order.</p>`,
    code: { lang: 'js', check: false, code: `import { createHash } from 'node:crypto';
const keys = new Map();   // key -> { hash, state, status, body, expires }

export function idempotent(handler) {
  return async (req, res) => {
    const key = req.get('Idempotency-Key');
    if (!key) return res.status(400).json({ message: 'Idempotency-Key header is required' });
    const hash = createHash('sha256').update(JSON.stringify(req.body ?? {})).digest('hex');

    const seen = keys.get(key);
    if (seen && seen.expires > Date.now()) {
      if (seen.hash !== hash) return res.status(422).json({ message: 'Key reused with a different payload' });
      if (seen.state === 'in-progress') return res.status(409).json({ message: 'Request still processing' });
      return res.status(seen.status).set('Idempotent-Replayed', 'true').json(seen.body);
    }
    keys.set(key, { hash, state: 'in-progress', expires: Date.now() + 24 * 3600 * 1000 });  // claim (sync = atomic in Node)
    try {
      const { status, body } = await handler(req);
      Object.assign(keys.get(key), { state: 'done', status, body });
      res.status(status).json(body);
    } catch (e) {
      keys.delete(key);                          // let the client retry after a failure
      throw e;
    }
  };
}` },
    complexity: `<p>O(1) per request plus hashing the body (linear in body size). Storage grows with unique keys per 24 hours.</p>`,
    followUps: ['How would you do this with Redis SET NX?', 'Should failed requests (4xx) be stored too? Discuss.']
  }
});

practice.push({
  title: 'Design the Error Contract for a Whole Team', level: 'Hard', tags: ['design', 'error handling', 'api contract', 'rfc 9457'], companies: ['Atlassian', 'Shopify'], lang: 'java',
  statement: `<p>Eight teams build services that all expose REST APIs. Clients are mobile apps and partner systems, and today every service reports errors differently. Write the <b>error contract</b> all services must follow: JSON shape, status code policy, validation errors, machine-readable codes, correlation id, what is never allowed in a message, retry guidance, and how you roll it out and test it.</p>`,
  constraints: `Must support multiple languages in messages, partial failures in batch calls, and be compatible with a published standard. Must be enforceable with a shared library and contract tests.`,
  example: `${H.table(['Field', 'Example', 'Purpose'], [['type', '<code>https://api.example.com/errors/validation</code>', 'stable error type (RFC 9457)'], ['status', '<code>400</code>', 'mirrors HTTP status'], ['code', '<code>BOOK_TITLE_REQUIRED</code>', 'machine-readable, never translated'], ['detail', '"title is required"', 'human text, may be localised'], ['requestId', '<code>7c1e...</code>', 'support / tracing']])}`,
  brute: { why: `<p>Each team picks its own: one returns <code>{"error":"bad"}</code>, another <code>{"message":...}</code>, another an HTML page; some leak stack traces. Clients write a parser per service, mobile apps break when a team changes wording, and alerts cannot tell client errors from outages.</p>` },
  mcq: { q: 'Why include a machine-readable code besides the human message?', options: ['Messages change or get translated; clients need a stable value to branch on', 'It makes JSON smaller', 'HTTP requires it', 'It replaces the status code'], answer: 0, explain: 'A stable code lets client logic and dashboards depend on something that will not change when wording or language does.' },
  hints: [
    `<p>Hint 1: start from the standard - Problem Details (RFC 9457) - and extend it only where you must (code, requestId, errors list).</p>`,
    `<p>Hint 2: define the status policy: 400 or 422 for validation, 401 vs 403, 404, 409, 429 with Retry-After, 500 generic, 503 with Retry-After. Say who retries what.</p>`,
    `<p>Hint 3: make it enforceable: a shared library (Spring starter / npm package) that implements the handler, plus contract tests and a lint rule on OpenAPI files. Specify safety rules (no stack traces, no SQL, no PII in messages).</p>`
  ],
  solution: {
    approach: `<p><b>Shape (Problem Details, <code>application/problem+json</code>):</b> <code>type</code> (stable URI), <code>title</code> (short, constant per type), <code>status</code>, <code>detail</code> (human text, localisable via Accept-Language), <code>instance</code> (the request path), plus extensions <code>code</code> (UPPER_SNAKE, never translated, never reused), <code>requestId</code> (also in the <code>X-Request-Id</code> header), and <code>errors</code> (for validation: array of <code>{field, code, message}</code> with JSON-pointer-like field names matching the request).</p>
    <p><b>Status policy:</b> 400 malformed/invalid input (choose one of 400/422 and use it everywhere), 401 not authenticated, 403 authenticated but not allowed, 404 missing (also used instead of 403 when existence should be hidden), 409 conflicts and duplicate keys, 412/428 preconditions, 429 with <code>Retry-After</code>, 500 for unexpected faults with a generic detail, 503 with <code>Retry-After</code> for overload/maintenance. Clients may retry 429/503/timeouts with backoff and jitter, never 4xx otherwise.</p>
    <p><b>Safety rules:</b> never include stack traces, class names, SQL, file paths, internal hostnames or personal data; do not distinguish "user not found" from "wrong password"; log the full exception server-side keyed by requestId. <b>Batch calls:</b> return 207-style per-item results or a top-level 200 with an <code>errors</code> array per item, so one bad item does not hide the others.</p>
    <p><b>Rollout:</b> ship a shared library implementing the handler for Spring (<code>@RestControllerAdvice</code> + <code>ProblemDetail</code>) and Node (middleware), a registry of error codes in git, and OpenAPI components for the error schema. Enforce through contract tests in CI (every documented error response validates against the schema), a lint rule, and a migration plan: new endpoints must comply, old ones get both shapes behind a version/Accept header until clients move. Measure adoption with a gateway metric (share of 4xx/5xx responses with the new content type).</p>`,
    complexity: `<p>Design exercise. The ongoing cost is governance: the code registry and the shared library are what keep eight teams consistent.</p>`,
    followUps: ['How would you version the error contract without breaking existing clients?', 'How do you localise messages without changing the codes?']
  }
});

practice.push({
  title: 'Review AI-Generated Code: Find the Layering and Validation Bugs', level: 'Hard', tags: ['code review', 'ai', 'security', 'layered architecture'], companies: ['Google', 'Meta'], lang: 'java',
  statement: `<p>An assistant generated this Express endpoint. Find at least eight problems covering validation, layering, status codes, error handling, security and secrets, and rewrite it correctly.</p><pre>const DB_PASSWORD = "&lt;pasted-real-password&gt;";   // used later
const books = [];
app.post('/addBook', (req, res) =&gt; {
  try {
    const book = Object.assign({ id: books.length + 1 }, req.body);
    books.push(book);
    res.status(200).send(book);
  } catch (e) {
    res.status(200).send(e.stack);
  }
});
app.get('/getBook', (req, res) =&gt; {
  res.send(books.find(b =&gt; b.id == req.query.id) || { error: 'not found' });
});</pre>`,
  constraints: `Name each issue, say why it matters, and show the corrected design (routes, status codes, layers, validation, error handler). Do not hardcode any secret.`,
  example: `${H.table(['Issue', 'Fix'], [['<code>/addBook</code> verb path', '<code>POST /api/books</code>'], ['<code>res.status(200)</code> for create', '201 + Location'], ['<code>e.stack</code> in response', 'generic 500, log server-side']])}`,
  brute: { why: `<p>Accepting generated code because it ran once with curl. It "works" while hiding eight defects: mass assignment, ids reused after deletes, errors returned as 200, stack traces leaked, and a hardcoded password that will end up in git history.</p>` },
  mcq: { q: 'What is the problem with Object.assign({id}, req.body)?', options: ['The client can overwrite id or any other field (mass assignment)', 'It is too slow', 'It copies nothing', 'It only works with arrays'], answer: 0, explain: 'req.body is attacker-controlled. Spreading it into your model lets clients set fields they should never control, including the id (later: role, isAdmin).' },
  hints: [
    `<p>Hint 1: go layer by layer: routes and verbs, input handling, business logic, storage, errors, secrets. Write a defect for each place you see a smell.</p>`,
    `<p>Hint 2: look for lies: statuses that claim success, ids that can collide, error text that reveals internals, loose equality (<code>==</code>) on user input.</p>`,
    `<p>Hint 3: a secret in source is a defect even if unused - it lives in git history forever; load configuration from the environment and keep placeholders in examples.</p>`
  ],
  solution: {
    approach: `<p><b>Defects:</b> (1) verb-style paths <code>/addBook</code>, <code>/getBook</code> instead of <code>POST /api/books</code>, <code>GET /api/books/:id</code>. (2) No <code>express.json()</code>, so <code>req.body</code> is undefined in Express 5 and <code>Object.assign</code> silently does nothing useful. (3) No validation: any shape, wrong types, huge values. (4) Mass assignment via <code>Object.assign</code>: client can set or overwrite <code>id</code> and any field. (5) Id from <code>books.length + 1</code> collides after a delete (two books with the same id). (6) Create returns 200 instead of 201 plus <code>Location</code>. (7) <code>catch</code> returns <code>e.stack</code> with status 200: leaks internals and hides failures from monitoring. (8) Not-found returned as 200 with an error body; should be 404. (9) <code>==</code> loose comparison and an id taken from the query string, unvalidated (<code>?id=1abc</code>, arrays). (10) Hardcoded <code>DB_PASSWORD</code> in source: a secret in git history; read from the environment or a secret manager. (11) Everything in the route: no controller/service/repository separation, no tests possible without HTTP. (12) No global error handler or unknown-route 404.</p>
    <p><b>Corrected design:</b> <code>app.use(express.json({limit:'100kb'}))</code>; routes under <code>/api/books</code>; a validator that whitelists <code>title</code>, <code>author</code>, <code>year</code> (collecting all errors, 400); a service with the duplicate rule and <code>NotFound</code>; a repository owning a Map and a monotonically increasing counter (never reuse ids); creation returns 201 with Location; the global error handler maps domain errors to 404/409, validation to 400 and everything else to a generic 500 with the stack only in logs; configuration comes from <code>process.env</code> with placeholders such as <code>DB_PASSWORD=&lt;from-secret-manager&gt;</code> in documentation.</p>`,
    code: { lang: 'js', check: false, code: `app.use(express.json({ limit: '100kb' }));
app.post('/api/books', (req, res) => {
  const errors = validateBook(req.body);                 // whitelist + collect all errors
  if (errors.length) return res.status(400).json({ status: 400, error: 'Validation failed', details: errors });
  const saved = bookService.create(pick(req.body, ['title', 'author', 'year']));   // no mass assignment
  res.status(201).location('/api/books/' + saved.id).json(saved);
});
app.get('/api/books/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ status: 400, message: 'id must be a positive integer' });
  res.json(bookService.get(id));                         // throws AppError(404) -> global handler
});
// secrets: const dbPassword = process.env.DB_PASSWORD;   // set outside the code` },
    complexity: `<p>Review exercise. The corrected endpoints are O(1) per request in memory.</p>`,
    followUps: ['Which of these defects would an automated scanner (SAST) catch, and which need a human?', 'How would you prompt an AI assistant so it avoids these mistakes?']
  }
});

/* ============================================================
   QUIZ
   ============================================================ */
quiz.push({ q: 'A client creates a resource with POST /api/books. Which response is most correct?', options: ['201 Created with a Location header and the new resource', '200 OK with the text "done"', '204 No Content', '302 Found'], answer: 0, explain: '201 means a new resource exists; Location tells the client where. Returning the new representation (with its server-generated id) saves a follow-up GET.' });
quiz.push({ q: 'In Express, a request GET /api/books/search is handled by the route /api/books/:id registered first. Why?', options: [':id matches any single segment and the first matching route wins', 'Express sorts routes alphabetically', 'search is a reserved word', 'GET routes ignore order'], answer: 0, explain: 'Express tests routes in registration order. The parameter pattern matches "search", so the specific route must be registered first.' });
quiz.push({ q: 'What must a controller NOT do in a layered design?', options: ['Contain business rules or talk to the database', 'Choose the HTTP status code', 'Parse the request body', 'Call a service method'], answer: 0, explain: 'The controller translates HTTP to method calls and back. Rules belong in the service and storage in the repository.' });
quiz.push({ q: 'A request body fails three validation rules. What is the best API behaviour?', options: ['Return 400 once with all three errors', 'Return 400 with only the first error', 'Return 500', 'Silently fix the data and return 200'], answer: 0, explain: 'Collecting all errors lets the client fix everything in one round trip. 400 (or 422) is right because the client sent bad data.' });
quiz.push({ q: 'Which statement about HTTP status code families is correct?', options: ['4xx means the client should change the request; 5xx means the server failed', '5xx means the client sent bad data', '2xx means the server crashed', '3xx means validation failed'], answer: 0, explain: '4xx = client error (do not retry unchanged); 5xx = server error (retry may help). Alerts and retry logic rely on this split.' });
quiz.push({ q: 'How does Express recognise an error-handling middleware?', options: ['It declares exactly four parameters (err, req, res, next)', 'Its filename contains "error"', 'It is registered with app.catch()', 'It returns a Promise'], answer: 0, explain: 'Arity is the signal: four parameters. It also has to be registered after the routes it should protect.' });
quiz.push({ q: 'Spring Boot: you added @NotBlank to a record field but invalid JSON still reaches your method. What is the most likely cause?', options: ['@Valid is missing on the @RequestBody parameter', 'Records cannot have annotations', 'The constructor is private', 'JSON is not supported by records'], answer: 0, explain: 'Constraint annotations only describe rules; @Valid on the parameter is what triggers validation and the MethodArgumentNotValidException.' });
quiz.push({ q: 'Why should an unexpected exception produce a generic 500 message instead of e.getMessage()?', options: ['Internal details (classes, SQL, paths) help attackers and confuse users', 'Generic messages are faster to send', 'HTTP forbids long bodies', 'getMessage() is always null'], answer: 0, explain: 'Log the full exception server-side with a request id; the client gets a safe generic message and the id to quote to support.' });
quiz.push({ q: 'Which is a business rule (belongs in the service) rather than input validation?', options: ['A book with the same ISBN must not already exist', 'Title must not be blank', 'Year must be a number', 'JSON must be well-formed'], answer: 0, explain: 'Uniqueness depends on stored data, so it is decided in the service (and enforced by a database constraint). The others are about the shape of the input alone.' });
quiz.push({ q: 'What is the main benefit of the service depending on a BookRepository interface?', options: ['You can swap the in-memory implementation for a database or a fake in tests without changing the service', 'It makes the code run faster', 'Interfaces are required by Spring', 'It removes the need for a service'], answer: 0, explain: 'Depending on an abstraction (dependency inversion) decouples rules from storage technology and makes unit tests easy.' });
quiz.push({ q: 'curl -X POST localhost:8080/api/books -d \'{"title":"Dune"}\' returns 415 from Spring. What is missing?', options: ['-H "Content-Type: application/json"', '-X PUT', 'a trailing slash', 'the -i flag'], answer: 0, explain: 'curl -d defaults to application/x-www-form-urlencoded. Spring cannot read JSON from that, so it answers 415 Unsupported Media Type.' });
quiz.push({ q: 'Which approach prevents "mass assignment" in a POST handler?', options: ['Copy only whitelisted fields (a DTO) from the body', 'Object.assign(model, req.body)', 'Accept any JSON and trust the frontend', 'Use GET instead of POST'], answer: 0, explain: 'A DTO or whitelist decides which fields clients may set. Spreading the whole body lets them set ids, roles and flags.' });
quiz.push({ q: 'PUT /books/3 is sent twice with the same body. Which is true?', options: ['The second call leaves the same state as the first (idempotent)', 'The second call creates a second book', 'It must return 201 both times', 'It is rejected by HTTP'], answer: 0, explain: 'PUT replaces the resource at a known URL, so repeating it yields the same end state. POST creation is the non-idempotent one.' });

/* ============================================================
   INTERVIEW
   ============================================================ */
interview.push({ level: 'B', q: `Walk me through what happens when a client calls <code>GET /api/books/5</code> on your Spring Boot or Express app.`,
  a: `<p>The client opens a TCP connection and sends the HTTP request text. The embedded server (Tomcat, or Node's HTTP server) parses it and hands it to the framework. The <b>router</b> looks through its route table for a row matching both the method and the path pattern <code>/api/books/{id}</code> and captures <code>id = 5</code>. The <b>controller</b> method runs: it converts the id to a number and calls <code>service.findById(5)</code>. The <b>service</b> asks the <b>repository</b>, which reads from storage (a Map now, a database later). If nothing is found the service throws a not-found exception, otherwise it returns the book. The controller returns it, the framework serialises the object to JSON, sets <code>Content-Type: application/json</code> and status 200, and writes the response. If an exception was thrown, the global error handler maps it to 404 and the standard error body.</p>`,
  followUps: ['Where would a filter or middleware (logging, auth) sit in this flow?', 'What changes if the request body is invalid JSON?'] });
interview.push({ level: 'B', q: `What is the difference between a path variable, a query parameter and a request body? When do you use each?`,
  a: `<p>A <b>path variable</b> identifies <i>which</i> resource (<code>/books/42</code>) and is required for that route. A <b>query parameter</b> is an optional modifier on a collection or view: filtering, sorting, paging (<code>?author=Orwell&amp;page=2</code>). The <b>body</b> carries the data you are creating or replacing (JSON), used with POST/PUT/PATCH. Headers carry metadata such as content type and credentials. Rules of thumb: do not put sensitive data in the URL (it ends up in logs and browser history); do not put a resource identity in the query string; and GET requests should not rely on a body. In Spring these are <code>@PathVariable</code>, <code>@RequestParam</code>, <code>@RequestBody</code>; in Express <code>req.params</code>, <code>req.query</code>, <code>req.body</code>.</p>`,
  followUps: ['Why is a password in a query string a bad idea?', 'How do you pass many filters cleanly?'] });
interview.push({ level: 'B', q: `Explain controller, service and repository. Why not put everything in the controller?`,
  a: `<p>The <b>controller</b> handles HTTP only: reads path/query/body, calls one service method, chooses the status code and returns the body. The <b>service</b> holds business rules (is it a duplicate? is the user allowed?) and coordinates repositories and transactions, with no knowledge of HTTP. The <b>repository</b> hides how data is stored and offers methods like <code>findById</code> and <code>save</code>. Putting everything in the controller makes it impossible to reuse the logic (queue consumer, scheduled job), forces every test to go through HTTP, scatters rules across endpoints so they drift, and ties you to one storage technology. With layers, changing from an in-memory Map to PostgreSQL touches only the repository, and rule tests run in milliseconds with a fake repository.</p>`,
  followUps: ['Where does @Transactional go and why?', 'What is a fat controller and how do you fix it?'] });
interview.push({ level: 'B', q: `Which status codes would you use for create, read, update, delete and not-found, and why?`,
  a: `<p>Create: <b>201 Created</b> with a <code>Location</code> header and the new resource. Read: <b>200 OK</b>; a missing resource is <b>404 Not Found</b>; an empty list is still 200 with <code>[]</code>. Update with PUT: <b>200 OK</b> with the updated resource (or 204 if you return nothing), 404 if the id does not exist. Delete: <b>204 No Content</b>, and a second delete of the same id is 404 (or 204 if you choose a fully idempotent style - be consistent). Client mistakes are <b>400</b> (invalid input), 401/403 (auth), 405 (wrong method), 409 (conflict), 415 (wrong content type). Server faults are <b>500</b>. The reason all this matters: clients, caches, retry logic and monitoring act on the status code, not the body, so a 200 that hides an error breaks them all.</p>`,
  followUps: ['When would you use 422 instead of 400?', 'Should DELETE of a missing id be 404 or 204?'] });
interview.push({ level: 'I', q: `How do you implement validation in Spring Boot and in Express? What do you return when it fails?`,
  a: `<p>In <b>Spring</b> you put Bean Validation annotations (<code>@NotBlank</code>, <code>@Size</code>, <code>@Min</code>, <code>@Max</code>) on the request DTO and add <code>@Valid</code> on the <code>@RequestBody</code> parameter; failure throws <code>MethodArgumentNotValidException</code> before the method runs, and a <code>@RestControllerAdvice</code> maps the field errors to the response. In <b>Express</b> nothing is built in, so you either write a function returning an array of errors or use a schema library (zod, ajv, joi) in a middleware that runs before the handler. On failure return <b>400</b> (or 422) with a consistent body listing <i>every</i> problem as <code>{field, message}</code>, collected rather than fail-fast, and never call the service with invalid data. Keep input-shape validation at the edge and business rules (duplicates, state) in the service where they return 409/404. Also whitelist fields to prevent mass assignment and cap sizes to avoid abuse.</p>`,
  followUps: ['Why is client-side validation not enough?', 'How do you validate query parameters and path variables in Spring?'] });
interview.push({ level: 'I', q: `Design a global error-handling strategy for a REST API. How does it differ between Spring and Express?`,
  a: `<p>Services throw meaningful domain exceptions (<code>BookNotFound</code>, <code>DuplicateIsbn</code>) that do not know about HTTP. One central component maps exception types to a status and a single JSON error shape (status, error, message, path, optional details, requestId). Unexpected exceptions become a generic 500 with the stack trace logged server-side only. In <b>Spring</b> that is a <code>@RestControllerAdvice</code> with <code>@ExceptionHandler</code> methods; Spring chooses the most specific matching handler, and Boot 3 can return <code>ProblemDetail</code> (RFC 9457). In <b>Express</b> it is error-handling middleware with four arguments registered last, plus a catch-all 404 middleware after the routes; Express 5 forwards errors from async handlers automatically, while Express 4 needs <code>next(err)</code> or a wrapper. Also: log once with a correlation id, never leak internals, use 4xx for client mistakes and 5xx for faults, and test every mapped case.</p>`,
  followUps: ['What is the correlation id for?', 'What happens if the error occurs after the response has started streaming?'] });
interview.push({ level: 'I', q: `Your Express route /api/books/search always returns "Book not found". What is wrong and how do you fix it?`,
  a: `<p>Almost certainly <code>router.get('/:id', ...)</code> is registered before <code>router.get('/search', ...)</code>. Express checks routes in registration order and stops at the first match; <code>:id</code> matches any single path segment, including the word "search", so the id handler runs with <code>id = "search"</code> and the service reports not found. Fix by registering literal routes before parameterised ones (<code>/search</code> then <code>/:id</code>). Also validate the id (a positive integer) so a real typo gives a clear 400 rather than a confusing 404. Spring does not have the issue because it picks the most specific matching pattern regardless of declaration order. To prevent regressions add a test for <code>GET /search</code>.</p>`,
  followUps: ['How can the same problem show up with nested routes?', 'How would you restrict :id to digits in the pattern?'] });
interview.push({ level: 'I', q: `What is a DTO and why not return your database entity from the controller?`,
  a: `<p>A DTO (data transfer object) is a class that describes exactly what crosses the API boundary. Returning the entity directly couples the public JSON to the database schema: renaming a column changes the API; adding a field (<code>passwordHash</code>, <code>internalNotes</code>) leaks it instantly with no controller change; lazy-loaded relationships can trigger extra queries or serialisation errors. Request DTOs also stop clients from setting fields they must not control (id, role, createdBy) - the mass-assignment vulnerability. Use separate request and response DTOs, and map at the boundary by hand or with MapStruct. It is a few extra classes, but it gives you a stable, intentional contract and a security boundary.</p>`,
  followUps: ['What is mass assignment and how did it appear in famous breaches?', 'How do you avoid mapping boilerplate?'] });
interview.push({ level: 'I', q: `Why is it important that the service depends on a repository interface? Show how you would unit test the service.`,
  a: `<p>The service should know <i>what</i> data operations it needs, not <i>how</i> they are done. Depending on an interface follows the dependency inversion principle: the implementation (in-memory, JPA, Mongo) can change without touching business code, and in tests you inject a simple fake. A good unit test builds the service with a fake repository (a hand-written class holding a list and counting calls), then asserts behaviour: valid input saves and returns an id; invalid input throws a validation exception listing all errors and the repository's save count stays at zero; a duplicate throws a conflict exception and does not add a row. No Spring context, no HTTP and no database are required, so the tests run in milliseconds. HTTP concerns (routing, JSON, status mapping) are checked separately with MockMvc or supertest.</p>`,
  followUps: ['Fake vs mock vs stub - when each?', 'What does the unit test not prove that an integration test does?'] });
interview.push({ level: 'A', q: `Two users edit the same book at once. How do you prevent lost updates in a REST API?`,
  a: `<p>Use <b>optimistic concurrency</b>. The resource carries a version (or hash) exposed as an <code>ETag</code> on GET. The client must send it back in <code>If-Match</code> on PUT/PATCH/DELETE. The server compares it with the current version and applies the change only if it matches, incrementing the version in the same atomic step - with SQL: <code>UPDATE ... SET version = version + 1 WHERE id = ? AND version = ?</code> and check that one row changed (JPA <code>@Version</code> does this). A mismatch returns <b>412 Precondition Failed</b> (missing header: 428 Precondition Required) and the client refetches, shows or merges the other change, and retries. This keeps the system responsive because nobody holds a lock while a human thinks. Pessimistic locks make sense only for short critical sections. If conflicts are frequent, redesign with finer-grained updates (PATCH of specific fields) or domain-level commands.</p>`,
  followUps: ['How does ETag also support caching?', 'Why must the compare and the write be a single atomic operation?'] });
interview.push({ level: 'A', q: `A mobile client retries POST /orders after a timeout and the customer is charged twice. How do you make creation safe to retry?`,
  a: `<p>POST is not idempotent, so add an <b>idempotency key</b>: the client generates a UUID per logical attempt and sends it as <code>Idempotency-Key</code>. The server atomically claims the key (Redis <code>SET NX EX</code>, or a unique constraint in a database table) storing the request hash and state "in progress". On completion it saves the status and body. A retry with the same key and same payload returns the stored response without redoing the work; the same key with a different payload gets 422; a request that arrives while the first is still running gets 409 (or waits). The claim and the business write should be in one transaction, otherwise a crash between "order created" and "response stored" leaves a key stuck "in progress". Keys expire after a window (e.g. 24 hours). Payment providers such as Stripe use exactly this pattern. Also design the underlying operation to be naturally idempotent where possible (e.g. unique order reference).</p>`,
  followUps: ['Where should the key store live in a multi-instance deployment?', 'Should error responses be stored and replayed?'] });
interview.push({ level: 'A', q: `Your in-memory repository passes tests but loses data and duplicates ids in production under load. What is going on?`,
  a: `<p>Concurrency. A web server handles requests on many threads at once, and the repository state is shared. Typical bugs: a plain <code>HashMap</code> mutated by several threads (lost or corrupted entries), <code>nextId++</code> as a non-atomic read-modify-write (duplicate ids), and check-then-act logic ("exists? then save") that lets two requests both pass the check. Fixes: thread-safe structures (<code>ConcurrentHashMap</code>, <code>AtomicLong</code>), atomic compound operations (<code>putIfAbsent</code>, <code>compute</code>), or confined state. More importantly, in-memory state does not survive restarts and is not shared between multiple instances behind a load balancer, so each instance has a different "database". The real fix is a shared database with transactions and unique constraints, which is the point of the next module: application-level checks are advisory, constraints are the truth.</p>`,
  followUps: ['Why does Node avoid some of these races but not all of them?', 'How does a unique index solve the duplicate problem across instances?'] });
interview.push({ level: 'A', q: `How would you design the error response format for 8 teams so clients can handle errors uniformly?`,
  a: `<p>Standardise on Problem Details (RFC 9457, <code>application/problem+json</code>) with a small set of agreed extensions: a stable machine-readable <code>code</code> (never translated or reused), a <code>requestId</code> that also appears in the <code>X-Request-Id</code> header, and an <code>errors</code> array of <code>{field, code, message}</code> for validation. Define the status policy once (400 vs 422, 401 vs 403, 404, 409, 412/428, 429 and 503 with <code>Retry-After</code>, generic 500) and the retry guidance (retry 429/503/timeouts with backoff and jitter, never other 4xx). Prohibit stack traces, SQL, internal hosts and personal data in messages. Enforce with a shared library per language (Spring starter, npm package), an error-code registry in git, OpenAPI error schemas and contract tests in CI, and measure adoption at the gateway. Roll out new endpoints first, then migrate old ones behind versioning.</p>`,
  followUps: ['How do you localise messages without breaking clients?', 'How do batch endpoints report partial failure?'] });
interview.push({ level: 'E', q: `AI tools can generate a whole CRUD service. What do you check before you merge it, and what do you refuse to delegate?`,
  a: `<p>I treat generated code like a pull request from a fast junior: it compiles but may be wrong in ways that matter. I check: layering (controllers thin, rules in the service, repository behind an interface), validation on every input with all errors reported and a whitelist against mass assignment, correct status codes (201 plus Location, 204, 404 instead of 200-with-error), one consistent error shape with a global handler and no leaked internals, concurrency and idempotency of the data operations, secrets coming from the environment (never hardcoded or pasted into prompts), and tests that fail when I deliberately break the behaviour. I also check versions - modern Spring Boot uses <code>jakarta.*</code>, Express 5 differs from 4 - and that every dependency is real and needed. I do not delegate the API contract (routes, status codes, error taxonomy), security decisions (auth, CORS, rate limits), data-ownership rules, or the final judgment on trade-offs. I use AI to draft, to enumerate edge cases, and to write tests, then verify by running curl and the test suite.</p>`,
  followUps: ['How do you prompt an assistant to follow your team conventions?', 'How would you test that generated tests are meaningful (mutation testing)?'] });

registerModule({
  id: 'be02',
  title: 'Your First REST API (Spring Boot & Node.js)',
  intro: `<p>Time to build something real. In this module you create a complete <b>Books/Todo CRUD API</b> twice - once with <b>Spring Boot</b> (Java) and once with <b>Express</b> (Node.js) - and you see that the ideas are the same in both. You learn how a request is routed to a controller, how JSON bodies and status codes work, how to <b>validate</b> input and answer <code>400</code>, how a <b>global error handler</b> turns exceptions into clean responses, and how to split code into <b>controller → service → repository</b> layers. You finish by testing every endpoint with <b>curl</b> and <b>Postman</b>, then with automated tests. We use an in-memory repository so you focus on the web layer; the next module swaps in a real database.</p>`,
  goals: [
    'Create and run a REST API in both Spring Boot and Express and call it with curl',
    'Map methods and paths to handlers, and read path variables, query parameters and JSON bodies',
    'Return the correct status codes for create, read, update, delete and error cases',
    'Validate input, collect <b>all</b> errors and answer <code>400</code> with a consistent JSON body',
    'Build a global error handler (<code>@RestControllerAdvice</code> / error middleware) so no stack trace ever leaks',
    'Organise code into controller, service and repository layers and unit-test the service with a fake repository',
    'Write a curl suite and automated API tests (MockMvc / supertest) for every endpoint'
  ],
  prereqs: `Backend module 1 (How Backends Work &amp; HTTP Basics). Basic Java (classes, interfaces, collections) and basic JavaScript (functions, objects, async). No framework experience needed.`,
  hours: 12,
  topics: topics,
  quiz: quiz,
  interview: interview,
  practice: practice
});
})();
