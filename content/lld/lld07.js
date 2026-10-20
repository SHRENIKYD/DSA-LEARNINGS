(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- tiny helpers shared by every visualizer in this module ---------- */
  // a class / component box for class diagrams and flow diagrams
  function B(id, label, x, y, w) { var n = { id: id, label: label, x: x, y: y, shape: 'box' }; if (w) n.w = w; return n; }
  // a directed diagram: edge [u, v, label] means "u has / uses / calls v"
  function G(label, nodes, edges, o) {
    o = o || {};
    return { type: 'graph', label: label, directed: true, height: o.h || 60, nodes: nodes, edges: edges, hl: o.hl || {}, ehl: o.ehl || {}, tags: o.tags || {} };
  }
  function CODE(label, code, hl) { return { type: 'code', label: label, lang: 'java', code: code, hl: hl || {} }; }
  function TXT(html, label) { var p = { type: 'text', html: html }; if (label) p.label = label; return p; }
  function VARS(label, vals, hl) { return { type: 'vars', label: label, vals: vals, hl: hl || {} }; }
  function TABLE(label, columns, rows, hl) { return { type: 'table', label: label, columns: columns, rows: rows, hl: hl || {} }; }
  function F(narr, parts) { return { narr: narr, parts: parts }; }
  function one(k, v) { var r = {}; r[k] = v; return r; }
  function many(keys, v) { var r = {}; keys.forEach(function (k) { r[k] = v; }); return r; }
  function words(input, hint, max) {
    var w = String(input === undefined ? '' : input).trim().toLowerCase().split(/[\s,;]+/).filter(function (s) { return s.length; });
    if (!w.length) throw new Error(hint);
    if (w.length > max) throw new Error('Use at most ' + max + ' items. ' + hint);
    return w;
  }
  /* ---------- Java sources (compiled and run while authoring) ---------- */
  var J = {
    ParkingLotDemo: "import java.time.Duration;\nimport java.time.Instant;\nimport java.util.*;\nimport java.util.concurrent.atomic.AtomicLong;\n\n// ===================== 1. Value types (enums + records) =====================\n\n/** Physical size of a spot painted on the floor. */\nenum SpotType { SMALL, COMPACT, LARGE }\n\n/** Kind of vehicle. Each type knows which spot sizes it fits, best fit first. */\nenum VehicleType {\n    BIKE(SpotType.SMALL, SpotType.COMPACT, SpotType.LARGE),\n    CAR(SpotType.COMPACT, SpotType.LARGE),\n    TRUCK(SpotType.LARGE);\n\n    private final List<SpotType> fits;\n    VehicleType(SpotType... fits) { this.fits = List.of(fits); }\n\n    /** Spot types this vehicle may use, in order of preference (smallest that fits first). */\n    List<SpotType> fits() { return fits; }\n}\n\n/** A vehicle is pure data: a number plate and a type. Immutable, so a record is perfect. */\nrecord Vehicle(String plate, VehicleType type) {\n    Vehicle {\n        Objects.requireNonNull(plate, \"plate\");\n        Objects.requireNonNull(type, \"type\");\n    }\n}\n\n/** What the driver gets back at the exit gate. */\nrecord Receipt(String ticketId, String plate, long minutesParked, long amount) { }\n\n// ===================== 2. Core entities =====================\n\n/** One painted rectangle on one floor. Knows its own state: free or holding a vehicle. */\nclass ParkingSpot {\n    private final String id;          // e.g. \"F0-S3\"\n    private final int floor;\n    private final SpotType type;\n    private Vehicle vehicle;          // null means free\n\n    ParkingSpot(String id, int floor, SpotType type) {\n        this.id = id; this.floor = floor; this.type = type;\n    }\n\n    boolean isFree() { return vehicle == null; }\n\n    void assign(Vehicle v) {\n        if (!isFree()) throw new IllegalStateException(\"Spot \" + id + \" already taken\");\n        if (!v.type().fits().contains(type)) throw new IllegalArgumentException(v.type() + \" cannot use \" + type);\n        vehicle = v;\n    }\n\n    void release() { vehicle = null; }\n\n    String id() { return id; }\n    int floor() { return floor; }\n    SpotType type() { return type; }\n    Vehicle vehicle() { return vehicle; }\n}\n\n/** A floor is just an ordered group of spots. */\nclass ParkingFloor {\n    private final int number;\n    private final List<ParkingSpot> spots = new ArrayList<>();\n\n    ParkingFloor(int number, SpotType... layout) {\n        this.number = number;\n        for (int i = 0; i < layout.length; i++) {\n            spots.add(new ParkingSpot(\"F\" + number + \"-S\" + i, number, layout[i]));\n        }\n    }\n\n    int number() { return number; }\n    List<ParkingSpot> spots() { return Collections.unmodifiableList(spots); }\n}\n\n/** Issued at the entry gate; the \"receipt of a promise\" that links a vehicle to a spot and a start time. */\nclass Ticket {\n    private final String id;\n    private final Vehicle vehicle;\n    private final ParkingSpot spot;\n    private final Instant entryTime;\n\n    Ticket(String id, Vehicle vehicle, ParkingSpot spot, Instant entryTime) {\n        this.id = id; this.vehicle = vehicle; this.spot = spot; this.entryTime = entryTime;\n    }\n\n    String id() { return id; }\n    Vehicle vehicle() { return vehicle; }\n    ParkingSpot spot() { return spot; }\n    Instant entryTime() { return entryTime; }\n}\n\n// ===================== 3. Strategies (the parts that change) =====================\n\n/** HOW we choose a spot. Swap implementations without touching ParkingLot (Strategy pattern). */\ninterface SpotAllocationStrategy {\n    Optional<ParkingSpot> findSpot(List<ParkingFloor> floors, VehicleType type);\n}\n\n/** Lowest floor first; on each floor, the smallest spot type that fits; then lowest index. */\nclass NearestFirstStrategy implements SpotAllocationStrategy {\n    @Override\n    public Optional<ParkingSpot> findSpot(List<ParkingFloor> floors, VehicleType type) {\n        for (ParkingFloor floor : floors) {\n            for (SpotType wanted : type.fits()) {\n                for (ParkingSpot s : floor.spots()) {\n                    if (s.isFree() && s.type() == wanted) return Optional.of(s);\n                }\n            }\n        }\n        return Optional.empty();\n    }\n}\n\n/** HOW MUCH we charge. Another Strategy: weekend pricing, flat pricing, etc. plug in here. */\ninterface PricingStrategy {\n    long fee(Ticket ticket, Instant exitTime);\n}\n\n/** Rate per started hour, by vehicle type. Minimum one hour. */\nclass HourlyPricing implements PricingStrategy {\n    private final Map<VehicleType, Long> ratePerHour;\n\n    HourlyPricing(Map<VehicleType, Long> ratePerHour) { this.ratePerHour = Map.copyOf(ratePerHour); }\n\n    @Override\n    public long fee(Ticket t, Instant exitTime) {\n        long minutes = Duration.between(t.entryTime(), exitTime).toMinutes();\n        long hours = Math.max(1, (minutes + 59) / 60);           // ceil, at least 1 hour\n        return hours * ratePerHour.get(t.vehicle().type());\n    }\n}\n\n/** Where \"now\" comes from. Injected so tests and demos can control time (Dependency Inversion). */\ninterface TimeSource { Instant now(); }\n\nclass FakeTime implements TimeSource {\n    private Instant now = Instant.parse(\"2026-01-01T09:00:00Z\");\n    public Instant now() { return now; }\n    void advance(Duration d) { now = now.plus(d); }\n}\n\n// ===================== 4. The facade the gates talk to =====================\n\nclass ParkingLotFullException extends RuntimeException {\n    ParkingLotFullException(VehicleType t) { super(\"No free spot for \" + t); }\n}\n\nclass ParkingLot {\n    private final List<ParkingFloor> floors;\n    private final SpotAllocationStrategy allocation;\n    private final PricingStrategy pricing;\n    private final TimeSource clock;\n    private final Map<String, Ticket> activeTickets = new HashMap<>();\n    private final Set<String> platesInside = new HashSet<>();\n    private final AtomicLong ticketSeq = new AtomicLong(1);\n\n    ParkingLot(List<ParkingFloor> floors, SpotAllocationStrategy allocation,\n               PricingStrategy pricing, TimeSource clock) {\n        this.floors = List.copyOf(floors);\n        this.allocation = allocation;\n        this.pricing = pricing;\n        this.clock = clock;\n    }\n\n    /** Entry flow: find spot -> occupy it -> issue ticket. synchronized so two gates never get the same spot. */\n    public synchronized Ticket park(Vehicle v) {\n        if (platesInside.contains(v.plate())) throw new IllegalStateException(v.plate() + \" is already inside\");\n        ParkingSpot spot = allocation.findSpot(floors, v.type())\n                .orElseThrow(() -> new ParkingLotFullException(v.type()));\n        spot.assign(v);\n        Ticket t = new Ticket(\"T\" + ticketSeq.getAndIncrement(), v, spot, clock.now());\n        activeTickets.put(t.id(), t);\n        platesInside.add(v.plate());\n        return t;\n    }\n\n    /** Exit flow: look up ticket -> price it -> free the spot -> close the ticket. */\n    public synchronized Receipt unpark(String ticketId) {\n        Ticket t = activeTickets.remove(ticketId);\n        if (t == null) throw new NoSuchElementException(\"Unknown or already used ticket \" + ticketId);\n        Instant exit = clock.now();\n        long amount = pricing.fee(t, exit);\n        t.spot().release();\n        platesInside.remove(t.vehicle().plate());\n        long minutes = Duration.between(t.entryTime(), exit).toMinutes();\n        return new Receipt(t.id(), t.vehicle().plate(), minutes, amount);\n    }\n\n    /** For the display board at the entrance. */\n    public synchronized Map<SpotType, Integer> freeSpots() {\n        Map<SpotType, Integer> free = new EnumMap<>(SpotType.class);\n        for (SpotType st : SpotType.values()) free.put(st, 0);\n        for (ParkingFloor f : floors)\n            for (ParkingSpot s : f.spots())\n                if (s.isFree()) free.merge(s.type(), 1, Integer::sum);\n        return free;\n    }\n}\n\n// ===================== 5. Gates: thin, they only talk to the lot =====================\n\nclass EntryGate {\n    private final ParkingLot lot;\n    EntryGate(ParkingLot lot) { this.lot = lot; }\n    Ticket enter(Vehicle v) { return lot.park(v); }\n}\n\nclass ExitGate {\n    private final ParkingLot lot;\n    ExitGate(ParkingLot lot) { this.lot = lot; }\n    Receipt exit(String ticketId) { return lot.unpark(ticketId); }\n}\n\n// ===================== 6. Demo (what you show the interviewer at the end) =====================\n\npublic class ParkingLotDemo {\n    public static void main(String[] args) {\n        FakeTime time = new FakeTime();\n        List<ParkingFloor> floors = List.of(\n                new ParkingFloor(0, SpotType.SMALL, SpotType.COMPACT, SpotType.COMPACT, SpotType.LARGE),\n                new ParkingFloor(1, SpotType.SMALL, SpotType.COMPACT, SpotType.LARGE, SpotType.LARGE));\n        ParkingLot lot = new ParkingLot(floors, new NearestFirstStrategy(),\n                new HourlyPricing(Map.of(VehicleType.BIKE, 10L, VehicleType.CAR, 20L, VehicleType.TRUCK, 50L)),\n                time);\n        EntryGate in = new EntryGate(lot);\n        ExitGate out = new ExitGate(lot);\n\n        Ticket t1 = in.enter(new Vehicle(\"KA-01-1111\", VehicleType.CAR));\n        Ticket t2 = in.enter(new Vehicle(\"KA-02-2222\", VehicleType.BIKE));\n        Ticket t3 = in.enter(new Vehicle(\"KA-03-3333\", VehicleType.TRUCK));\n        System.out.println(t1.id() + \" -> \" + t1.spot().id());   // T1 -> F0-S1\n        System.out.println(t2.id() + \" -> \" + t2.spot().id());   // T2 -> F0-S0\n        System.out.println(t3.id() + \" -> \" + t3.spot().id());   // T3 -> F0-S3\n        System.out.println(\"Free: \" + lot.freeSpots());          // {SMALL=1, COMPACT=2, LARGE=2}\n\n        try {\n            in.enter(new Vehicle(\"KA-01-1111\", VehicleType.CAR)); // the same plate cannot be inside twice\n        } catch (IllegalStateException e) {\n            System.out.println(e.getMessage());\n        }\n\n        time.advance(Duration.ofMinutes(150));                  // 2h30m later\n        Receipt r = out.exit(t1.id());\n        System.out.println(\"Receipt \" + r.ticketId() + \" \" + r.plate() + \" \" + r.minutesParked() + \" min, amount \" + r.amount()); // 3 started hours x 20 = 60\n\n        try {\n            out.exit(t1.id());                                  // same ticket twice\n        } catch (NoSuchElementException e) {\n            System.out.println(\"Rejected: \" + e.getMessage());\n        }\n\n        Ticket t4 = in.enter(new Vehicle(\"KA-04-4444\", VehicleType.TRUCK));\n        Ticket t5 = in.enter(new Vehicle(\"KA-05-5555\", VehicleType.TRUCK));\n        System.out.println(t4.id() + \" -> \" + t4.spot().id());   // T4 -> F1-S2\n        System.out.println(t5.id() + \" -> \" + t5.spot().id());   // T5 -> F1-S3\n        try {\n            in.enter(new Vehicle(\"KA-06-6666\", VehicleType.TRUCK)); // all three LARGE spots are taken\n        } catch (ParkingLotFullException e) {\n            System.out.println(e.getMessage());\n        }\n    }\n}",
    TicTacToeDemo: "import java.util.*;\n\n// ===================== 1. Small value types =====================\n\n/** A move is just data: who played where. */\nrecord Move(int row, int col, Player player) { }\n\nenum GameStatus { IN_PROGRESS, WON, DRAW }\n\n// ===================== 2. Players (Strategy: how a move is chosen) =====================\n\n/** Anything that can pick a move: a human at a keyboard, a scripted test, a bot. */\ninterface Player {\n    String name();\n    char symbol();\n    int[] chooseMove(Board board);      // returns {row, col}\n}\n\n/** Plays a fixed list of moves. Perfect for demos and unit tests (no Scanner needed). */\nclass ScriptedPlayer implements Player {\n    private final String name;\n    private final char symbol;\n    private final Deque<int[]> moves = new ArrayDeque<>();\n\n    ScriptedPlayer(String name, char symbol, int[]... script) {\n        this.name = name; this.symbol = symbol;\n        moves.addAll(Arrays.asList(script));\n    }\n    public String name() { return name; }\n    public char symbol() { return symbol; }\n    public int[] chooseMove(Board board) {\n        if (moves.isEmpty()) throw new IllegalStateException(name + \" ran out of scripted moves\");\n        return moves.poll();\n    }\n}\n\n// ===================== 3. Board: owns cells and validation only =====================\n\nclass Board {\n    static final char EMPTY = '.';\n    private final int n;\n    private final char[][] cells;\n    private int filled = 0;\n\n    Board(int n) {\n        if (n < 3) throw new IllegalArgumentException(\"Board must be at least 3x3\");\n        this.n = n;\n        cells = new char[n][n];\n        for (char[] row : cells) Arrays.fill(row, EMPTY);\n    }\n\n    int size() { return n; }\n    boolean isFull() { return filled == n * n; }\n    char at(int r, int c) { return cells[r][c]; }\n\n    boolean isValid(int r, int c) {\n        return r >= 0 && r < n && c >= 0 && c < n && cells[r][c] == EMPTY;\n    }\n\n    void place(int r, int c, char symbol) {\n        if (!isValid(r, c)) throw new IllegalArgumentException(\"Illegal move (\" + r + \",\" + c + \")\");\n        cells[r][c] = symbol;\n        filled++;\n    }\n\n    void print() {\n        for (char[] row : cells) System.out.println(new String(row));\n    }\n}\n\n// ===================== 4. Win detection: its own class, O(1) per move =====================\n\n/** Rule for \"who won?\". Separate interface so \"4 in a row\" or \"corners win\" variants plug in. */\ninterface WinningStrategy {\n    boolean isWinningMove(Board board, Move move, int playerIndex);\n}\n\n/**\n * Keeps a counter per (player, row), (player, col), and both diagonals.\n * A player wins when any counter reaches n. Each move costs O(1) instead of rescanning O(n^2).\n */\nclass CounterWinningStrategy implements WinningStrategy {\n    private final int n;\n    private final int[][] rows, cols;\n    private final int[] diag, anti;\n\n    CounterWinningStrategy(int n, int players) {\n        this.n = n;\n        rows = new int[players][n];\n        cols = new int[players][n];\n        diag = new int[players];\n        anti = new int[players];\n    }\n\n    @Override\n    public boolean isWinningMove(Board board, Move m, int p) {\n        int r = m.row(), c = m.col();\n        if (++rows[p][r] == n) return true;\n        if (++cols[p][c] == n) return true;\n        if (r == c && ++diag[p] == n) return true;\n        return r + c == n - 1 && ++anti[p] == n;\n    }\n}\n\n// ===================== 5. Game: turn order + status (the orchestrator) =====================\n\nclass Game {\n    private final Board board;\n    private final List<Player> players;\n    private final WinningStrategy rules;\n    private final List<Move> history = new ArrayList<>();\n    private int turn = 0;\n    private GameStatus status = GameStatus.IN_PROGRESS;\n    private Player winner;\n\n    Game(int n, List<Player> players) {\n        if (players.size() < 2) throw new IllegalArgumentException(\"Need at least 2 players\");\n        Set<Character> symbols = new HashSet<>();\n        for (Player p : players)\n            if (!symbols.add(p.symbol())) throw new IllegalArgumentException(\"Duplicate symbol \" + p.symbol());\n        this.board = new Board(n);\n        this.players = List.copyOf(players);\n        this.rules = new CounterWinningStrategy(n, players.size());\n    }\n\n    /** Apply one move for the player whose turn it is. Returns the new status. */\n    GameStatus makeMove(int r, int c) {\n        if (status != GameStatus.IN_PROGRESS) throw new IllegalStateException(\"Game is over: \" + status);\n        Player p = players.get(turn);\n        board.place(r, c, p.symbol());                  // throws on illegal move; turn does not advance\n        Move m = new Move(r, c, p);\n        history.add(m);\n        if (rules.isWinningMove(board, m, turn)) {\n            status = GameStatus.WON;\n            winner = p;\n        } else if (board.isFull()) {\n            status = GameStatus.DRAW;\n        } else {\n            turn = (turn + 1) % players.size();\n        }\n        return status;\n    }\n\n    /** Drive the game by asking each Player for a move until it ends. */\n    void play() {\n        while (status == GameStatus.IN_PROGRESS) {\n            int[] rc = players.get(turn).chooseMove(board);\n            makeMove(rc[0], rc[1]);\n        }\n    }\n\n    GameStatus status() { return status; }\n    Optional<Player> winner() { return Optional.ofNullable(winner); }\n    List<Move> history() { return Collections.unmodifiableList(history); }\n    Board board() { return board; }\n}\n\n// ===================== 6. Demo =====================\n\npublic class TicTacToeDemo {\n    public static void main(String[] args) {\n        Player alice = new ScriptedPlayer(\"Alice\", 'X', new int[]{0, 0}, new int[]{1, 1}, new int[]{2, 2});\n        Player bob = new ScriptedPlayer(\"Bob\", 'O', new int[]{0, 1}, new int[]{0, 2});\n        Game game = new Game(3, List.of(alice, bob));\n        game.play();\n        game.board().print();\n        // XOO\n        // .X.\n        // ..X\n        System.out.println(game.status() + \" winner=\" + game.winner().map(Player::name).orElse(\"none\"));\n        System.out.println(\"Moves played: \" + game.history().size());   // 5\n\n        // Failure paths: each one is refused by exactly one class, and the game state stays valid.\n        Game g2 = new Game(3, List.of(new ScriptedPlayer(\"A\", 'X'), new ScriptedPlayer(\"B\", 'O')));\n        g2.makeMove(0, 0);\n        try { g2.makeMove(0, 0); } catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }  // occupied\n        g2.makeMove(1, 1);                                  // still B's turn: the refused move did not advance it\n        g2.board().print();\n        // board now: X.. / .O. / ...\n        try { game.makeMove(1, 0); } catch (IllegalStateException e) { System.out.println(e.getMessage()); }   // game already won\n        try { new Game(3, List.of(alice, new ScriptedPlayer(\"Cy\", 'X'))); }\n        catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }                              // same symbol twice\n        try { new Game(2, List.of(alice, bob)); } catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }\n        try { new Game(3, List.of(new ScriptedPlayer(\"A\", 'X', new int[]{0, 0}), new ScriptedPlayer(\"B\", 'O'))).play(); }\n        catch (IllegalStateException e) { System.out.println(e.getMessage()); }                                 // B has no moves\n    }\n}",
    g1_brute: "// BRUTE FORCE: one class, maps of strings, status as magic text.\n// It \"works\" for the demo, but every new rule means editing this one class.\nclass LibrarySystem {\n    private final Map<String, String> bookStatus = new HashMap<>();   // isbn -> \"FREE\" or memberId\n    private final Map<String, Integer> borrowedCount = new HashMap<>(); // memberId -> count\n\n    void addBook(String isbn) { bookStatus.put(isbn, \"FREE\"); }\n\n    String borrow(String memberId, String isbn) {\n        if (!bookStatus.containsKey(isbn)) return \"NO_SUCH_BOOK\";\n        if (!bookStatus.get(isbn).equals(\"FREE\")) return \"TAKEN\";\n        int count = borrowedCount.getOrDefault(memberId, 0);\n        if (count >= 3) return \"LIMIT\";                // rule hard-coded in the middle of the flow\n        bookStatus.put(isbn, memberId);\n        borrowedCount.put(memberId, count + 1);\n        return \"OK\";\n    }\n\n    String giveBack(String memberId, String isbn) {\n        if (!memberId.equals(bookStatus.get(isbn))) return \"NOT_YOURS\";\n        bookStatus.put(isbn, \"FREE\");\n        borrowedCount.merge(memberId, -1, Integer::sum);\n        return \"OK\";\n    }\n}\n",
    g1_sol: "import java.time.LocalDate;\n\n// ---- Entities: nouns from the requirements ----\nrecord Book(String isbn, String title) { }\n\nclass Member {\n    private final String id;\n    private final String name;\n    private final List<Loan> activeLoans = new ArrayList<>();\n    Member(String id, String name) { this.id = id; this.name = name; }\n    String id() { return id; }\n    String name() { return name; }\n    List<Loan> activeLoans() { return activeLoans; }\n}\n\n/** A Loan is the \"ticket\" of a library: it links a member, a book and dates. */\nclass Loan {\n    private final Member member;\n    private final Book book;\n    private final LocalDate due;\n    Loan(Member member, Book book, LocalDate due) { this.member = member; this.book = book; this.due = due; }\n    Member member() { return member; }\n    Book book() { return book; }\n    LocalDate due() { return due; }\n    boolean isOverdue(LocalDate today) { return today.isAfter(due); }\n}\n\n// ---- The rule that will change (premium members, students...) sits behind an interface ----\ninterface LendingPolicy {\n    int maxBooks(Member m);\n    int loanDays(Member m);\n}\n\nclass StandardPolicy implements LendingPolicy {\n    public int maxBooks(Member m) { return 3; }\n    public int loanDays(Member m) { return 14; }\n}\n\n// ---- Facade with the public APIs we agreed on in step 3 ----\nclass Library {\n    private final Map<String, Book> catalog = new HashMap<>();\n    private final Map<String, Loan> loanByIsbn = new HashMap<>();\n    private final LendingPolicy policy;\n\n    Library(LendingPolicy policy) { this.policy = policy; }\n\n    void addBook(Book b) { catalog.put(b.isbn(), b); }\n\n    Loan borrow(Member m, String isbn, LocalDate today) {\n        Book b = catalog.get(isbn);\n        if (b == null) throw new NoSuchElementException(\"No book \" + isbn);\n        if (loanByIsbn.containsKey(isbn)) throw new IllegalStateException(b.title() + \" is already lent out\");\n        if (m.activeLoans().size() >= policy.maxBooks(m))\n            throw new IllegalStateException(m.name() + \" reached the limit of \" + policy.maxBooks(m));\n        Loan loan = new Loan(m, b, today.plusDays(policy.loanDays(m)));\n        loanByIsbn.put(isbn, loan);\n        m.activeLoans().add(loan);\n        return loan;\n    }\n\n    void giveBack(Member m, String isbn) {\n        Loan loan = loanByIsbn.get(isbn);\n        if (loan == null || loan.member() != m) throw new IllegalStateException(\"This member does not hold \" + isbn);\n        loanByIsbn.remove(isbn);\n        m.activeLoans().remove(loan);\n    }\n\n    List<Loan> overdue(LocalDate today) {\n        List<Loan> out = new ArrayList<>();\n        for (Loan l : loanByIsbn.values()) if (l.isOverdue(today)) out.add(l);\n        return out;\n    }\n}\n\n/** Next quarter's change is one new class, not an edit to Library. */\nclass PremiumPolicy implements LendingPolicy {\n    public int maxBooks(Member m) { return 10; }\n    public int loanDays(Member m) { return 30; }\n}\n\npublic class LibraryDemo {\n    static void attempt(Runnable action) {                      // shows the failure paths\n        try { action.run(); } catch (RuntimeException e) { System.out.println(e.getMessage()); }\n    }\n\n    public static void main(String[] args) {\n        Library lib = new Library(new StandardPolicy());\n        lib.addBook(new Book(\"111\", \"Clean Code\"));\n        lib.addBook(new Book(\"222\", \"Refactoring\"));\n        lib.addBook(new Book(\"333\", \"Effective Java\"));\n        lib.addBook(new Book(\"444\", \"Domain-Driven Design\"));\n        Member asha = new Member(\"M1\", \"Asha\");\n        Member ravi = new Member(\"M2\", \"Ravi\");\n        LocalDate day1 = LocalDate.of(2026, 1, 1);\n        Loan l = lib.borrow(asha, \"111\", day1);\n        System.out.println(\"Due \" + l.due());                                   // 2026-01-15\n        System.out.println(\"Overdue on Jan 20: \" + lib.overdue(day1.plusDays(19)).size()); // 1\n        attempt(() -> lib.borrow(ravi, \"111\", day1));                           // already lent out\n        attempt(() -> lib.borrow(ravi, \"999\", day1));                           // unknown ISBN\n        lib.giveBack(asha, \"111\");\n        System.out.println(\"Overdue after return: \" + lib.overdue(day1.plusDays(19)).size()); // 0\n        lib.borrow(asha, \"111\", day1); lib.borrow(asha, \"222\", day1); lib.borrow(asha, \"333\", day1);\n        System.out.println(asha.name() + \" holds \" + asha.activeLoans().size() + \" books\");\n        attempt(() -> lib.borrow(asha, \"444\", day1));                           // limit of 3\n        attempt(() -> lib.giveBack(ravi, \"111\"));                               // Ravi never had it\n        Library vip = new Library(new PremiumPolicy());\n        vip.addBook(new Book(\"111\", \"Clean Code\"));\n        System.out.println(\"Premium due \" + vip.borrow(ravi, \"111\", day1).due()); // 2026-01-31\n    }\n}",
    g2_brute: "// THE GOD CLASS: everything about the parking lot lives in one place.\n// Spots are parallel arrays, vehicle types are strings, prices are magic numbers.\npublic class ParkingLotApp {\n    static String[] spotSize = {\"S\", \"M\", \"M\", \"L\"};   // S=bike, M=car, L=truck\n    static String[] spotPlate = new String[4];          // null = free\n    static long[] spotSince = new long[4];              // entry hour\n\n    static int park(String plate, String type, long hour) {\n        for (int i = 0; i < spotSize.length; i++) {\n            if (spotPlate[i] != null) continue;\n            if (type.equals(\"BIKE\") || (type.equals(\"CAR\") && !spotSize[i].equals(\"S\"))\n                    || (type.equals(\"TRUCK\") && spotSize[i].equals(\"L\"))) {\n                spotPlate[i] = plate;\n                spotSince[i] = hour;\n                return i;                               // the \"ticket\" is just an index\n            }\n        }\n        return -1;                                      // full (or wrong type string, who knows)\n    }\n\n    static long leave(int spot, String type, long hour) {\n        long hours = Math.max(1, hour - spotSince[spot]);\n        long fee;\n        if (type.equals(\"BIKE\")) fee = hours * 10;      // pricing tangled into exit logic\n        else if (type.equals(\"CAR\")) fee = hours * 20;\n        else fee = hours * 50;\n        spotPlate[spot] = null;                         // no check that the right car leaves\n        return fee;\n    }\n\n    public static void main(String[] args) {\n        int t = park(\"KA-01\", \"CAR\", 9);\n        System.out.println(\"Car at spot \" + t + \", pays \" + leave(t, \"CAR\", 12));\n    }\n}\n",
    g2_sol: "// The same behaviour, split by responsibility. Each class has one reason to change.\nenum SpotSize { S, M, L }\n\nenum VType {\n    BIKE(10, SpotSize.S, SpotSize.M, SpotSize.L), CAR(20, SpotSize.M, SpotSize.L), TRUCK(50, SpotSize.L);\n    final long rate;                       // rupees per hour (data, not if-else)\n    final List<SpotSize> fits;\n    VType(long rate, SpotSize... fits) { this.rate = rate; this.fits = List.of(fits); }\n}\n\nclass Spot {\n    final int id; final SpotSize size; String plate;\n    Spot(int id, SpotSize size) { this.id = id; this.size = size; }\n    boolean free() { return plate == null; }\n}\n\nrecord Ticket(int id, String plate, VType type, Spot spot, long entryHour) { }\n\ninterface Allocator { Optional<Spot> pick(List<Spot> spots, VType t); }\ninterface Pricer { long fee(Ticket t, long exitHour); }\n\nclass FirstFit implements Allocator {\n    public Optional<Spot> pick(List<Spot> spots, VType t) {\n        for (SpotSize want : t.fits)\n            for (Spot s : spots) if (s.free() && s.size == want) return Optional.of(s);\n        return Optional.empty();\n    }\n}\n\nclass PerHour implements Pricer {\n    public long fee(Ticket t, long exitHour) { return Math.max(1, exitHour - t.entryHour()) * t.type().rate; }\n}\n\nclass Lot {\n    private final List<Spot> spots; private final Allocator alloc; private final Pricer pricer;\n    private final Map<Integer, Ticket> open = new HashMap<>();\n    private int nextId = 1;\n    Lot(List<Spot> spots, Allocator a, Pricer p) { this.spots = spots; this.alloc = a; this.pricer = p; }\n\n    synchronized Ticket park(String plate, VType type, long hour) {\n        Spot s = alloc.pick(spots, type).orElseThrow(() -> new IllegalStateException(\"Full for \" + type));\n        s.plate = plate;\n        Ticket t = new Ticket(nextId++, plate, type, s, hour);\n        open.put(t.id(), t);\n        return t;\n    }\n\n    synchronized long leave(int ticketId, long hour) {\n        Ticket t = open.remove(ticketId);\n        if (t == null) throw new IllegalArgumentException(\"Bad ticket \" + ticketId);\n        t.spot().plate = null;\n        return pricer.fee(t, hour);\n    }\n}\n\n/** Weekend pricing is one more Pricer wrapped around the normal one. Lot is untouched. */\nclass WeekendPricing implements Pricer {\n    private final Pricer inner;\n    WeekendPricing(Pricer inner) { this.inner = inner; }\n    public long fee(Ticket t, long exitHour) { return inner.fee(t, exitHour) * 3 / 2; }   // 1.5x\n}\n\npublic class RefactoredDemo {\n    static List<Spot> layout() {\n        return List.of(new Spot(0, SpotSize.S), new Spot(1, SpotSize.M), new Spot(2, SpotSize.M), new Spot(3, SpotSize.L));\n    }\n\n    public static void main(String[] args) {\n        Lot lot = new Lot(layout(), new FirstFit(), new PerHour());\n        Ticket t = lot.park(\"KA-01\", VType.CAR, 9);\n        System.out.println(\"Car at spot \" + t.spot().id + \", pays \" + lot.leave(t.id(), 12)); // spot 1, pays 60\n        Ticket bike = lot.park(\"KA-02\", VType.BIKE, 10);\n        System.out.println(\"Bike at spot \" + bike.spot().id);                 // smallest fitting spot: 0\n        Ticket truck = lot.park(\"KA-03\", VType.TRUCK, 10);\n        System.out.println(\"Truck at spot \" + truck.spot().id);               // only LARGE fits: 3\n        try { lot.park(\"KA-04\", VType.TRUCK, 10); } catch (IllegalStateException e) { System.out.println(e.getMessage()); }\n        try { lot.leave(99, 11); } catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }\n        System.out.println(\"Bike pays \" + lot.leave(bike.id(), 10));          // same hour still bills 1 hour: 10\n        Lot weekend = new Lot(layout(), new FirstFit(), new WeekendPricing(new PerHour()));\n        Ticket w = weekend.park(\"KA-05\", VType.CAR, 9);\n        System.out.println(\"Weekend car pays \" + weekend.leave(w.id(), 12)); // 60 * 1.5 = 90\n    }\n}",
    g3_brute: "// BRUTE: one method, one hand-written branch per vehicle type, fit rules copy-pasted.\n// Adding a new strategy means copying the whole method; adding EV means editing every branch.\nclass SpotFinder {\n    // layout[floor][i] is \"S\", \"M\" or \"L\"; taken[floor][i] marks occupied spots\n    static String find(String[][] layout, boolean[][] taken, String vehicle) {\n        for (int f = 0; f < layout.length; f++) {\n            if (vehicle.equals(\"BIKE\")) {\n                for (int i = 0; i < layout[f].length; i++) if (!taken[f][i] && layout[f][i].equals(\"S\")) return f + \"-\" + i;\n                for (int i = 0; i < layout[f].length; i++) if (!taken[f][i] && layout[f][i].equals(\"M\")) return f + \"-\" + i;\n                for (int i = 0; i < layout[f].length; i++) if (!taken[f][i] && layout[f][i].equals(\"L\")) return f + \"-\" + i;\n            } else if (vehicle.equals(\"CAR\")) {\n                for (int i = 0; i < layout[f].length; i++) if (!taken[f][i] && layout[f][i].equals(\"M\")) return f + \"-\" + i;\n                for (int i = 0; i < layout[f].length; i++) if (!taken[f][i] && layout[f][i].equals(\"L\")) return f + \"-\" + i;\n            } else if (vehicle.equals(\"TRUCK\")) {\n                for (int i = 0; i < layout[f].length; i++) if (!taken[f][i] && layout[f][i].equals(\"L\")) return f + \"-\" + i;\n            }\n        }\n        return \"FULL\";\n    }\n}\n",
    g3_sol: "enum SpotType { SMALL, COMPACT, LARGE }\n\nenum VehicleType {\n    BIKE(SpotType.SMALL, SpotType.COMPACT, SpotType.LARGE),\n    CAR(SpotType.COMPACT, SpotType.LARGE),\n    TRUCK(SpotType.LARGE);\n    private final List<SpotType> fits;\n    VehicleType(SpotType... f) { fits = List.of(f); }\n    List<SpotType> fits() { return fits; }          // the ONLY place fit rules live\n}\n\nclass Spot {\n    final int floor, index; final SpotType type; boolean taken;\n    Spot(int floor, int index, SpotType type) { this.floor = floor; this.index = index; this.type = type; }\n    String id() { return floor + \"-\" + index; }\n}\n\ninterface SpotAllocationStrategy {\n    Optional<Spot> find(List<List<Spot>> floors, VehicleType v);\n}\n\n/** Stay as low as possible (less driving); on a floor, use the smallest spot that fits. */\nclass NearestFirst implements SpotAllocationStrategy {\n    public Optional<Spot> find(List<List<Spot>> floors, VehicleType v) {\n        for (List<Spot> floor : floors)\n            for (SpotType want : v.fits())\n                for (Spot s : floor) if (!s.taken && s.type == want) return Optional.of(s);\n        return Optional.empty();\n    }\n}\n\n/** Protect big spots: try the smallest fitting type on EVERY floor before using a bigger type. */\nclass BestFitFirst implements SpotAllocationStrategy {\n    public Optional<Spot> find(List<List<Spot>> floors, VehicleType v) {\n        for (SpotType want : v.fits())\n            for (List<Spot> floor : floors)\n                for (Spot s : floor) if (!s.taken && s.type == want) return Optional.of(s);\n        return Optional.empty();\n    }\n}\n\npublic class AllocationDemo {\n    static List<List<Spot>> build(String... floors) {\n        List<List<Spot>> out = new ArrayList<>();\n        for (int f = 0; f < floors.length; f++) {\n            List<Spot> row = new ArrayList<>();\n            for (int i = 0; i < floors[f].length(); i++) {\n                char c = floors[f].charAt(i);\n                row.add(new Spot(f, i, c == 'S' ? SpotType.SMALL : c == 'M' ? SpotType.COMPACT : SpotType.LARGE));\n            }\n            out.add(row);\n        }\n        return out;\n    }\n\n    static void show(String strategy, String vehicle, Optional<Spot> spot) {\n        System.out.println(strategy + (spot.isPresent() ? \" puts the \" + vehicle + \" at \" + spot.get().id()\n                                                        : \" has no spot for the \" + vehicle));\n    }\n\n    public static void main(String[] args) {\n        Map<String, SpotAllocationStrategy> strategies = new LinkedHashMap<>();\n        strategies.put(\"NearestFirst\", new NearestFirst());\n        strategies.put(\"BestFitFirst\", new BestFitFirst());\n        strategies.forEach((name, st) -> {\n            show(name, \"car\", st.find(build(\"SL\", \"SM\"), VehicleType.CAR));    // floor 0 has no COMPACT, floor 1 does\n            show(name, \"bike\", st.find(build(\"LM\", \"SL\"), VehicleType.BIKE));  // floor 0 has no SMALL, floor 1 does\n            show(name, \"car\", st.find(build(\"S\"), VehicleType.CAR));           // nothing fits a car\n        });\n        // NearestFirst: car 0-1 (LARGE on floor 0: less walking), bike 0-1 (COMPACT on floor 0)\n        // BestFitFirst: car 1-1 (COMPACT on floor 1: keeps LARGE for trucks), bike 1-0 (the SMALL spot)\n    }\n}",
    g4_brute: "// BRUTE: the fee rules are an if-else ladder buried inside the exit method.\nclass ExitCounter {\n    static long fee(String type, long minutes, boolean lostTicket) {\n        if (lostTicket) return 500;\n        long hours = (minutes + 59) / 60;\n        long fee;\n        if (type.equals(\"CAR\")) {\n            if (hours <= 2) fee = 30; else fee = 30 + (hours - 2) * 20;\n            if (fee > 200) fee = 200;\n        } else if (type.equals(\"BIKE\")) {\n            if (hours <= 2) fee = 10; else fee = 10 + (hours - 2) * 5;\n            if (fee > 60) fee = 60;\n        } else {\n            fee = hours * 100;                        // trucks: someone forgot the cap here\n        }\n        return fee;\n    }\n}\n",
    g4_sol: "import java.time.Duration;\n\n/** Every pricing rule is a PricingStrategy; rules are combined by wrapping (Decorator). */\ninterface PricingStrategy { long fee(Duration parked); }\n\n/** First block of time costs a flat amount, then a rate per started hour. */\nclass SlabPricing implements PricingStrategy {\n    private final long firstHours, firstBlock, perHourAfter;\n    SlabPricing(long firstHours, long firstBlock, long perHourAfter) {\n        this.firstHours = firstHours; this.firstBlock = firstBlock; this.perHourAfter = perHourAfter;\n    }\n    public long fee(Duration parked) {\n        long hours = Math.max(1, (parked.toMinutes() + 59) / 60);   // started hours, at least 1\n        return hours <= firstHours ? firstBlock : firstBlock + (hours - firstHours) * perHourAfter;\n    }\n}\n\n/** Decorator: caps whatever the wrapped strategy charges, per started 24-hour day. */\nclass DailyCap implements PricingStrategy {\n    private final PricingStrategy inner; private final long capPerDay;\n    DailyCap(PricingStrategy inner, long capPerDay) { this.inner = inner; this.capPerDay = capPerDay; }\n    public long fee(Duration parked) {\n        long fullDays = parked.toHours() / 24;\n        Duration rest = parked.minusHours(fullDays * 24);\n        boolean exactDays = fullDays > 0 && rest.isZero();            // 24h, 48h...: no extra day to bill\n        long restFee = exactDays ? 0 : Math.min(capPerDay, inner.fee(rest));\n        return fullDays * capPerDay + restFee;\n    }\n}\n\nenum VehicleType { BIKE, CAR, TRUCK }\n\n/** One place that maps a vehicle type to its rule chain. New type = one new line here. */\nclass Tariff {\n    private final Map<VehicleType, PricingStrategy> rules = new EnumMap<>(VehicleType.class);\n    private final long lostTicketPenalty;\n    Tariff(long lostTicketPenalty) {\n        this.lostTicketPenalty = lostTicketPenalty;\n        rules.put(VehicleType.BIKE, new DailyCap(new SlabPricing(2, 10, 5), 60));\n        rules.put(VehicleType.CAR, new DailyCap(new SlabPricing(2, 30, 20), 200));\n        rules.put(VehicleType.TRUCK, new DailyCap(new SlabPricing(1, 100, 100), 800));\n    }\n    long fee(VehicleType t, Duration parked, boolean lostTicket) {\n        long normal = rules.get(t).fee(parked);\n        return lostTicket ? Math.max(normal, lostTicketPenalty) : normal;\n    }\n}\n\npublic class TariffDemo {\n    static void show(String label, long fee) { System.out.println(label + \" -> \" + fee); }\n\n    public static void main(String[] args) {\n        Tariff tariff = new Tariff(500);\n        show(\"car 90 min\", tariff.fee(VehicleType.CAR, Duration.ofMinutes(90), false));      // 30 (inside first 2h)\n        show(\"car 250 min\", tariff.fee(VehicleType.CAR, Duration.ofMinutes(250), false));    // 5h -> 30 + 3*20 = 90\n        show(\"car 30 h\", tariff.fee(VehicleType.CAR, Duration.ofHours(30), false));          // 200 + fee(6h)=110 -> 310\n        show(\"car 1 h lost ticket\", tariff.fee(VehicleType.CAR, Duration.ofHours(1), true)); // lost ticket -> 500\n        show(\"car 24 h\", tariff.fee(VehicleType.CAR, Duration.ofHours(24), false));          // exactly one capped day: 200\n        show(\"car 47 h 59 min\", tariff.fee(VehicleType.CAR, Duration.ofMinutes(47 * 60 + 59), false)); // 200 + capped rest 200\n        show(\"car 0 min\", tariff.fee(VehicleType.CAR, Duration.ZERO, false));                // minimum charge: one block\n        show(\"bike 5 h\", tariff.fee(VehicleType.BIKE, Duration.ofHours(5), false));          // 10 + 3*5 = 25\n        show(\"bike 12 h\", tariff.fee(VehicleType.BIKE, Duration.ofHours(12), false));        // 10 + 10*5 = 60, cap 60\n        show(\"truck 3 h\", tariff.fee(VehicleType.TRUCK, Duration.ofHours(3), false));        // 100 + 2*100 = 300\n    }\n}",
    g5_brute: "// BRUTE: after every move, rescan every row, column and both diagonals: O(n^2) per move.\nclass TicTacToeBrute {\n    private final int n;\n    private final int[][] board;\n    TicTacToeBrute(int n) { this.n = n; board = new int[n][n]; }\n\n    /** player is 1 or 2. Returns the winner (1 or 2) or 0 if nobody has won yet. */\n    int move(int row, int col, int player) {\n        board[row][col] = player;\n        for (int r = 0; r < n; r++) {                    // every row\n            boolean all = true;\n            for (int c = 0; c < n; c++) all &= board[r][c] == player;\n            if (all) return player;\n        }\n        for (int c = 0; c < n; c++) {                    // every column\n            boolean all = true;\n            for (int r = 0; r < n; r++) all &= board[r][c] == player;\n            if (all) return player;\n        }\n        boolean d = true, a = true;                      // both diagonals\n        for (int i = 0; i < n; i++) { d &= board[i][i] == player; a &= board[i][n - 1 - i] == player; }\n        return d || a ? player : 0;\n    }\n}\n",
    g5_sol: "/**\n * O(1) per move. Player 1 adds +1, player 2 adds -1 to the counters of the row, column\n * and (if on them) diagonals. A line belongs entirely to one player exactly when its\n * counter reaches +n or -n, because a mixed line can never reach the extreme.\n */\nclass TicTacToe {\n    private final int n;\n    private final int[] rows, cols;\n    private int diag, anti;\n\n    TicTacToe(int n) { this.n = n; rows = new int[n]; cols = new int[n]; }\n\n    int move(int row, int col, int player) {\n        int add = player == 1 ? 1 : -1;\n        rows[row] += add;\n        cols[col] += add;\n        if (row == col) diag += add;\n        if (row + col == n - 1) anti += add;\n        int target = add * n;                            // +n for player 1, -n for player 2\n        if (rows[row] == target || cols[col] == target || diag == target || anti == target) return player;\n        return 0;\n    }\n}\n\npublic class Lc348Demo {\n    /** Plays the moves on a fresh n x n game and returns every move() result on one line. */\n    static String play(int n, int[][] moves) {\n        TicTacToe t = new TicTacToe(n);\n        StringJoiner out = new StringJoiner(\" \");\n        for (int[] m : moves) out.add(String.valueOf(t.move(m[0], m[1], m[2])));\n        return out.toString();\n    }\n\n    public static void main(String[] args) {\n        // row 2 = 1,1,1 -> player 1 wins on the last move\n        System.out.println(play(3, new int[][]{{0, 0, 1}, {0, 2, 2}, {2, 2, 1}, {1, 1, 2}, {2, 0, 1}, {1, 0, 2}, {2, 1, 1}}));\n        // anti-diagonal (0,2) (1,1) (2,0) -> player 2 wins\n        System.out.println(play(3, new int[][]{{0, 0, 1}, {0, 2, 2}, {0, 1, 1}, {1, 1, 2}, {1, 0, 1}, {2, 0, 2}}));\n        // 4x4: column 0 -> player 1 wins after four cells\n        System.out.println(play(4, new int[][]{{0, 0, 1}, {0, 1, 2}, {1, 0, 1}, {1, 1, 2}, {2, 0, 1}, {2, 1, 2}, {3, 0, 1}}));\n        // full board with no line: nobody wins\n        System.out.println(play(3, new int[][]{{0, 0, 1}, {0, 1, 2}, {0, 2, 1}, {1, 2, 2}, {1, 0, 1}, {2, 0, 2}, {1, 1, 1}, {2, 2, 2}, {2, 1, 1}}));\n        // 1x1: the only move wins\n        System.out.println(play(1, new int[][]{{0, 0, 1}}));\n    }\n}",
    g6_brute: "// BRUTE: copy the whole board before every move so undo can restore it.\n// Works, but costs O(n^2) memory per move and the win-check state is not restored with it.\nclass SnapshotGame {\n    private char[][] board;\n    private final Deque<char[][]> history = new ArrayDeque<>();\n    SnapshotGame(int n) { board = new char[n][n]; for (char[] r : board) Arrays.fill(r, '.'); }\n\n    void play(int r, int c, char s) {\n        char[][] copy = new char[board.length][];\n        for (int i = 0; i < board.length; i++) copy[i] = board[i].clone();   // full deep copy, every move\n        history.push(copy);\n        board[r][c] = s;\n    }\n\n    void undo() { if (!history.isEmpty()) board = history.pop(); }\n}\n",
    g6_sol: "/** Command pattern: each move knows how to do AND undo itself. */\ninterface Command { void execute(); void undo(); }\n\nclass Board3 {\n    final int n; final char[][] cells; final int[][] rows, cols; final int[] diag, anti;\n    Board3(int n) {\n        this.n = n; cells = new char[n][n];\n        for (char[] r : cells) Arrays.fill(r, '.');\n        rows = new int[2][n]; cols = new int[2][n]; diag = new int[2]; anti = new int[2];\n    }\n    /** delta = +1 to place, -1 to remove. Always updates ALL counters so undo is exact. */\n    void apply(int r, int c, int p, char sym, int delta) {\n        cells[r][c] = delta > 0 ? sym : '.';\n        rows[p][r] += delta; cols[p][c] += delta;\n        if (r == c) diag[p] += delta;\n        if (r + c == n - 1) anti[p] += delta;\n    }\n    boolean wins(int r, int c, int p) {\n        return rows[p][r] == n || cols[p][c] == n || (r == c && diag[p] == n) || (r + c == n - 1 && anti[p] == n);\n    }\n}\n\nclass MoveCommand implements Command {\n    private final Board3 b; private final int r, c, p; private final char sym;\n    MoveCommand(Board3 b, int r, int c, int p, char sym) { this.b = b; this.r = r; this.c = c; this.p = p; this.sym = sym; }\n    public void execute() { b.apply(r, c, p, sym, +1); }\n    public void undo() { b.apply(r, c, p, sym, -1); }\n    boolean wins() { return b.wins(r, c, p); }\n}\n\nclass UndoableGame {\n    private final Board3 board;\n    private final Deque<MoveCommand> undoStack = new ArrayDeque<>(), redoStack = new ArrayDeque<>();\n    private final char[] symbols = {'X', 'O'};\n    private int turn = 0; private boolean over = false;\n    UndoableGame(int n) { board = new Board3(n); }\n\n    String play(int r, int c) {\n        if (over) throw new IllegalStateException(\"game over - undo first\");\n        if (board.cells[r][c] != '.') throw new IllegalArgumentException(\"occupied\");\n        MoveCommand m = new MoveCommand(board, r, c, turn, symbols[turn]);\n        m.execute();\n        undoStack.push(m);\n        redoStack.clear();                                    // a new move kills the redo branch\n        if (m.wins()) { over = true; return symbols[turn] + \" wins\"; }\n        turn ^= 1;\n        return \"ok\";\n    }\n\n    boolean undo() {\n        if (undoStack.isEmpty()) return false;\n        MoveCommand m = undoStack.pop();\n        m.undo();\n        redoStack.push(m);\n        if (over) over = false; else turn ^= 1;          // winner's turn stays with them after undo\n        return true;\n    }\n\n    boolean redo() {\n        if (redoStack.isEmpty()) return false;\n        MoveCommand m = redoStack.pop();\n        m.execute();\n        undoStack.push(m);\n        if (m.wins()) over = true; else turn ^= 1;\n        return true;\n    }\n\n    String row(int r) { return new String(board.cells[r]); }\n}\n\npublic class UndoDemo {\n    static String tryPlay(UndoableGame g, int r, int c) {         // result, or the reason the move was refused\n        try { return g.play(r, c); } catch (RuntimeException e) { return e.getMessage(); }\n    }\n\n    static UndoableGame xWinsOnTop() {                             // X completes row 0 on the fifth move\n        UndoableGame g = new UndoableGame(3);\n        g.play(0, 0); g.play(1, 0); g.play(0, 1); g.play(1, 1);\n        System.out.println(g.play(0, 2));                          // X wins\n        return g;\n    }\n\n    public static void main(String[] args) {\n        UndoableGame g = xWinsOnTop();\n        System.out.println(tryPlay(g, 2, 2));                      // game over - undo first\n        g.undo();                                                  // take back the winning move\n        System.out.println(g.row(0));                              // XX.\n        System.out.println(g.play(2, 2));                          // ok  (X plays elsewhere instead)\n        System.out.println(g.redo());                              // false: redo branch was cleared\n        System.out.println(g.undo() + \" \" + g.undo());             // true true: takes back X(2,2) and O(1,1)\n        System.out.println(g.redo() + \" \" + g.row(1));             // true OO.: O(1,1) is back\n        System.out.println(tryPlay(g, 0, 0));                      // occupied\n        System.out.println(new UndoableGame(3).undo());            // false: nothing to undo\n\n        UndoableGame h = xWinsOnTop();                             // X wins\n        h.undo();\n        System.out.println(h.redo() + \" \" + h.row(0));             // true XXX: redo re-opens the win\n        System.out.println(tryPlay(h, 2, 2));                      // game over - undo first\n    }\n}",
    p01_brute: "// BRUTE: string comparisons scattered wherever a fit check is needed.\nclass FitCheck {\n    static boolean canPark(String vehicle, String spot) {\n        if (vehicle.equals(\"BIKE\")) return true;\n        if (vehicle.equals(\"CAR\")) return spot.equals(\"COMPACT\") || spot.equals(\"LARGE\");\n        if (vehicle.equals(\"TRUCK\")) return spot.equals(\"LARGE\");\n        return false;                                    // typo \"Car\" silently returns false\n    }\n}\n",
    p01_sol: "/** Spot sizes are ordered: SMALL < COMPACT < LARGE. ordinal() gives that order for free. */\nenum SpotType { SMALL, COMPACT, LARGE }\n\n/** Each vehicle states the smallest spot it needs. Any spot at least that big fits. */\nenum VehicleType {\n    BIKE(SpotType.SMALL), CAR(SpotType.COMPACT), TRUCK(SpotType.LARGE), BUS(SpotType.LARGE);\n    private final SpotType minSpot;\n    VehicleType(SpotType minSpot) { this.minSpot = minSpot; }\n\n    boolean canPark(SpotType spot) { return spot.ordinal() >= minSpot.ordinal(); }\n\n    /** All fitting spot types, smallest first: the preference order for allocation. */\n    List<SpotType> fits() {\n        List<SpotType> out = new ArrayList<>();\n        for (SpotType s : SpotType.values()) if (canPark(s)) out.add(s);\n        return out;\n    }\n}\n\npublic class FitDemo {\n    static List<SpotType> fitsOf(String vehicle) {\n        try {\n            return VehicleType.valueOf(vehicle).fits();\n        } catch (IllegalArgumentException e) {\n            System.out.println(\"unknown vehicle \" + vehicle);\n            return List.of();\n        }\n    }\n\n    public static void main(String[] args) {\n        System.out.println(VehicleType.CAR.canPark(SpotType.SMALL));   // false\n        System.out.println(VehicleType.CAR.canPark(SpotType.LARGE));   // true\n        System.out.println(VehicleType.BIKE.fits());                   // [SMALL, COMPACT, LARGE]\n        System.out.println(fitsOf(\"TRUCK\"));                           // [LARGE]\n        System.out.println(fitsOf(\"BUS\"));                             // [LARGE]: the one-line addition\n        System.out.println(VehicleType.BUS.canPark(SpotType.COMPACT)); // false\n        System.out.println(VehicleType.CAR.fits());                    // [COMPACT, LARGE]\n        System.out.println(fitsOf(\"PLANE\"));                           // unknown vehicle PLANE, then []\n    }\n}",
    p02_brute: "// BRUTE: rebuild the whole board every move and check all 8 lines.\nclass WinnerBrute {\n    static String tictactoe(int[][] moves) {\n        char[][] b = new char[3][3];\n        for (int i = 0; i < moves.length; i++) b[moves[i][0]][moves[i][1]] = i % 2 == 0 ? 'X' : 'O';\n        for (char p : new char[]{'X', 'O'}) {\n            for (int i = 0; i < 3; i++) {\n                if (b[i][0] == p && b[i][1] == p && b[i][2] == p) return p == 'X' ? \"A\" : \"B\";\n                if (b[0][i] == p && b[1][i] == p && b[2][i] == p) return p == 'X' ? \"A\" : \"B\";\n            }\n            if (b[0][0] == p && b[1][1] == p && b[2][2] == p) return p == 'X' ? \"A\" : \"B\";\n            if (b[0][2] == p && b[1][1] == p && b[2][0] == p) return p == 'X' ? \"A\" : \"B\";\n        }\n        return moves.length == 9 ? \"Draw\" : \"Pending\";\n    }\n}\n",
    p02_sol: "class Solution {\n    /** LeetCode 1275. A = first player (+1), B = second player (-1). Counters per line. */\n    public String tictactoe(int[][] moves) {\n        int n = 3;\n        int[] rows = new int[n], cols = new int[n];\n        int diag = 0, anti = 0;\n        for (int i = 0; i < moves.length; i++) {\n            int r = moves[i][0], c = moves[i][1];\n            int add = i % 2 == 0 ? 1 : -1;\n            rows[r] += add; cols[c] += add;\n            if (r == c) diag += add;\n            if (r + c == n - 1) anti += add;\n            if (Math.abs(rows[r]) == n || Math.abs(cols[c]) == n || Math.abs(diag) == n || Math.abs(anti) == n)\n                return add == 1 ? \"A\" : \"B\";\n        }\n        return moves.length == n * n ? \"Draw\" : \"Pending\";\n    }\n\n    public static void main(String[] args) {\n        Solution s = new Solution();\n        System.out.println(s.tictactoe(new int[][]{{0, 0}, {2, 0}, {1, 1}, {2, 1}, {2, 2}}));          // A: main diagonal\n        System.out.println(s.tictactoe(new int[][]{{0, 0}, {1, 1}, {0, 1}, {0, 2}, {1, 0}, {2, 0}})); // B: anti-diagonal\n        System.out.println(s.tictactoe(new int[][]{{0, 0}, {1, 1}}));                                  // Pending\n        System.out.println(s.tictactoe(new int[][]{{0, 0}, {2, 2}, {2, 0}, {1, 0}, {1, 2}, {2, 1}, {0, 1}, {0, 2}, {1, 1}})); // Draw\n        System.out.println(s.tictactoe(new int[][]{{1, 2}, {1, 0}, {2, 0}, {1, 1}, {0, 0}, {2, 1}, {0, 1}, {2, 2}, {0, 2}})); // A wins on move 9, not a draw\n        System.out.println(s.tictactoe(new int[][]{{0, 0}, {0, 2}, {1, 1}, {2, 2}, {2, 0}, {2, 1}, {0, 1}, {1, 2}}));         // B wins on move 8\n        System.out.println(s.tictactoe(new int[][]{{0, 0}, {2, 2}, {2, 0}, {1, 0}, {1, 2}, {2, 1}, {0, 1}, {0, 2}}));         // 8 moves, nobody yet: Pending\n        System.out.println(s.tictactoe(new int[][]{{1, 1}}));                                          // Pending\n    }\n}",
    p03_brute: "// BRUTE: count free spots by scanning every spot each time the board refreshes.\nclass BoardScan {\n    static Map<String, Integer> freeCounts(String[] types, boolean[] taken) {\n        Map<String, Integer> m = new TreeMap<>();\n        for (int i = 0; i < types.length; i++) if (!taken[i]) m.merge(types[i], 1, Integer::sum);\n        return m;                                        // O(total spots) per refresh, many refreshes per second\n    }\n}\n",
    p03_sol: "enum SpotType { SMALL, COMPACT, LARGE }\n\n/** Observer: anyone who wants to hear about spots changing. */\ninterface SpotListener { void onOccupied(SpotType t); void onFreed(SpotType t); }\n\n/** The display board keeps running counters, so reading them is O(1). */\nclass DisplayBoard implements SpotListener {\n    private final Map<SpotType, Integer> free = new EnumMap<>(SpotType.class);\n    DisplayBoard(Map<SpotType, Integer> initial) { free.putAll(initial); }\n    public void onOccupied(SpotType t) { free.merge(t, -1, Integer::sum); }\n    public void onFreed(SpotType t) { free.merge(t, 1, Integer::sum); }\n    String show() {                                       // explicit format, same text in every language\n        StringJoiner sj = new StringJoiner(\", \", \"{\", \"}\");\n        for (SpotType t : SpotType.values()) sj.add(t + \"=\" + free.get(t));\n        return sj.toString();\n    }\n}\n\n/** A second, unrelated subscriber: the lot code did not change to support it. */\nclass EventLog implements SpotListener {\n    private final List<String> lines = new ArrayList<>();\n    public void onOccupied(SpotType t) { lines.add(\"occupied \" + t); }\n    public void onFreed(SpotType t) { lines.add(\"freed \" + t); }\n    String text() { return String.join(\", \", lines); }\n}\n\n/** The lot publishes events; it does not know or care who listens (screens, apps, analytics). */\nclass Lot {\n    private final SpotType[] types; private final boolean[] taken;\n    private final List<SpotListener> listeners = new ArrayList<>();\n    Lot(SpotType... types) { this.types = types; this.taken = new boolean[types.length]; }\n    void subscribe(SpotListener l) { listeners.add(l); }\n    Map<SpotType, Integer> counts() {\n        Map<SpotType, Integer> m = new EnumMap<>(SpotType.class);\n        for (SpotType t : SpotType.values()) m.put(t, 0);\n        for (int i = 0; i < types.length; i++) if (!taken[i]) m.merge(types[i], 1, Integer::sum);\n        return m;\n    }\n    void occupy(int i) { if (taken[i]) throw new IllegalStateException(\"taken\"); taken[i] = true; listeners.forEach(l -> l.onOccupied(types[i])); }\n    void free(int i) { if (!taken[i]) throw new IllegalStateException(\"already free\"); taken[i] = false; listeners.forEach(l -> l.onFreed(types[i])); }\n}\n\npublic class DisplayDemo {\n    public static void main(String[] args) {\n        Lot lot = new Lot(SpotType.SMALL, SpotType.COMPACT, SpotType.COMPACT, SpotType.LARGE);\n        DisplayBoard board = new DisplayBoard(lot.counts());   // seed once with a scan\n        EventLog log = new EventLog();\n        lot.subscribe(board);\n        lot.subscribe(log);\n        lot.occupy(1); lot.occupy(3);\n        System.out.println(board.show());                       // {SMALL=1, COMPACT=1, LARGE=0}\n        lot.free(3);\n        System.out.println(board.show());                       // {SMALL=1, COMPACT=1, LARGE=1}\n        try { lot.occupy(1); } catch (IllegalStateException e) { System.out.println(e.getMessage()); }   // taken\n        try { lot.free(0); } catch (IllegalStateException e) { System.out.println(e.getMessage()); }     // already free\n        System.out.println(board.show());                       // unchanged: failed calls publish nothing\n        System.out.println(\"log: \" + log.text());\n    }\n}",
    p04_brute: "// BRUTE: a mode string decides the formula; every new tariff edits this switch.\nclass FeeCalc {\n    static long fee(String mode, long minutes) {\n        switch (mode) {\n            case \"FLAT\": return 100;\n            case \"HOURLY\": return Math.max(1, (minutes + 59) / 60) * 40;\n            case \"WEEKEND\": return Math.max(1, (minutes + 59) / 60) * 60;   // copy-paste with a new number\n            default: throw new IllegalArgumentException(mode);\n        }\n    }\n}\n",
    p04_sol: "/** Strategy pattern: a functional interface, so simple tariffs can even be lambdas. */\n@FunctionalInterface\ninterface PricingStrategy { long fee(long minutes); }\n\nclass FlatPricing implements PricingStrategy {\n    private final long amount;\n    FlatPricing(long amount) { this.amount = amount; }\n    public long fee(long minutes) { return amount; }\n}\n\nclass HourlyPricing implements PricingStrategy {\n    private final long perHour;\n    HourlyPricing(long perHour) { this.perHour = perHour; }\n    public long fee(long minutes) { return Math.max(1, (minutes + 59) / 60) * perHour; }\n}\n\n/** The context: it holds a strategy and can be switched at runtime (e.g. on weekends). */\nclass FeeCalculator {\n    private PricingStrategy strategy;\n    FeeCalculator(PricingStrategy s) { setStrategy(s); }\n    void setStrategy(PricingStrategy s) {\n        if (s == null) throw new IllegalArgumentException(\"strategy required\");\n        strategy = s;\n    }\n    long charge(long minutes) {\n        if (minutes < 0) throw new IllegalArgumentException(\"minutes must not be negative\");\n        return strategy.fee(minutes);\n    }\n}\n\npublic class PricingDemo {\n    public static void main(String[] args) {\n        FeeCalculator calc = new FeeCalculator(new HourlyPricing(40));\n        System.out.println(\"hourly(61) = \" + calc.charge(61));      // 2 started hours -> 80\n        System.out.println(\"hourly(0) = \" + calc.charge(0));        // at least one hour -> 40\n        calc.setStrategy(new FlatPricing(100));\n        System.out.println(\"flat(61) = \" + calc.charge(61));        // 100\n        calc.setStrategy(m -> m <= 15 ? 0 : 50);                    // \"first 15 minutes free\" as a lambda\n        System.out.println(\"promo(10) = \" + calc.charge(10));       // 0\n        System.out.println(\"promo(16) = \" + calc.charge(16));       // 50\n        try { calc.setStrategy(null); } catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }\n        try { calc.charge(-5); } catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }\n    }\n}",
    p05_brute: "// BRUTE: play every possible game from the empty board, remember every board we can reach,\n// then check membership. Only 5,478 legal 3x3 positions exist, so it runs, but it does not scale to N x N.\nclass ValidBrute {\n    private final Set<String> reachable = new HashSet<>();\n\n    boolean validTicTacToe(String[] board) {\n        dfs(new char[]{'.', '.', '.', '.', '.', '.', '.', '.', '.'}, 'X');\n        return reachable.contains(String.join(\"\", board).replace(' ', '.'));\n    }\n\n    private void dfs(char[] b, char turn) {\n        String key = new String(b);\n        if (!reachable.add(key)) return;\n        if (won(b, 'X') || won(b, 'O')) return;          // nobody moves after a win\n        for (int i = 0; i < 9; i++) if (b[i] == '.') {\n            b[i] = turn;\n            dfs(b, turn == 'X' ? 'O' : 'X');\n            b[i] = '.';\n        }\n    }\n\n    private boolean won(char[] b, char p) {\n        int[][] lines = {{0,1,2},{3,4,5},{6,7,8},{0,3,6},{1,4,7},{2,5,8},{0,4,8},{2,4,6}};\n        for (int[] l : lines) if (b[l[0]] == p && b[l[1]] == p && b[l[2]] == p) return true;\n        return false;\n    }\n}\n",
    p05_sol: "class Solution {\n    /** LeetCode 794: can this board appear in a real game where X moves first? */\n    public boolean validTicTacToe(String[] board) {\n        int x = 0, o = 0;\n        for (String row : board)\n            for (char ch : row.toCharArray()) { if (ch == 'X') x++; else if (ch == 'O') o++; }\n        if (o > x || x - o > 1) return false;           // turns alternate, X first\n        boolean xWin = wins(board, 'X'), oWin = wins(board, 'O');\n        if (xWin && oWin) return false;                 // the game would have stopped earlier\n        if (xWin && x != o + 1) return false;           // X just moved, so X has one extra\n        if (oWin && x != o) return false;               // O just moved, so counts are equal\n        return true;\n    }\n\n    private boolean wins(String[] b, char p) {\n        for (int i = 0; i < 3; i++) {\n            if (b[i].charAt(0) == p && b[i].charAt(1) == p && b[i].charAt(2) == p) return true;\n            if (b[0].charAt(i) == p && b[1].charAt(i) == p && b[2].charAt(i) == p) return true;\n        }\n        return (b[0].charAt(0) == p && b[1].charAt(1) == p && b[2].charAt(2) == p)\n            || (b[0].charAt(2) == p && b[1].charAt(1) == p && b[2].charAt(0) == p);\n    }\n\n    public static void main(String[] args) {\n        Solution s = new Solution();\n        System.out.println(s.validTicTacToe(new String[]{\"O  \", \"   \", \"   \"}));   // false: O moved first\n        System.out.println(s.validTicTacToe(new String[]{\"XOX\", \" X \", \"   \"}));   // false: X has 2 extra\n        System.out.println(s.validTicTacToe(new String[]{\"XXX\", \"   \", \"OOO\"}));   // false: both won\n        System.out.println(s.validTicTacToe(new String[]{\"XOX\", \"O O\", \"XOX\"}));   // true: full-looking, no line\n        System.out.println(s.validTicTacToe(new String[]{\"   \", \"   \", \"   \"}));   // true: empty board\n        System.out.println(s.validTicTacToe(new String[]{\"XXX\", \"OO \", \"O  \"}));   // false: X won but counts are equal: O moved after the win\n        System.out.println(s.validTicTacToe(new String[]{\"XXX\", \"OO \", \"   \"}));   // true: X won on its last move\n        System.out.println(s.validTicTacToe(new String[]{\"XXO\", \"XO \", \"O  \"}));   // true: O won on its last move\n        System.out.println(s.validTicTacToe(new String[]{\"XXO\", \"XO \", \"O X\"}));   // false: O won but X moved again\n        System.out.println(s.validTicTacToe(new String[]{\"XOO\", \"XO \", \"XX \"}));   // true: X wins with a column\n        System.out.println(s.validTicTacToe(new String[]{\"XOX\", \"XOO\", \"OXX\"}));   // true: full board, nobody won\n    }\n}",
    p06_brute: "// BRUTE: after each drop, scan every cell in every direction: O(rows * cols) per move.\nclass ConnectFourBrute {\n    static boolean anyWin(char[][] g, char p) {\n        int R = g.length, C = g[0].length;\n        int[][] dirs = {{0, 1}, {1, 0}, {1, 1}, {1, -1}};\n        for (int r = 0; r < R; r++)\n            for (int c = 0; c < C; c++)\n                for (int[] d : dirs) {\n                    int k = 0;\n                    while (k < 4) {\n                        int rr = r + d[0] * k, cc = c + d[1] * k;\n                        if (rr < 0 || rr >= R || cc < 0 || cc >= C || g[rr][cc] != p) break;\n                        k++;\n                    }\n                    if (k == 4) return true;\n                }\n        return false;\n    }\n}\n",
    p06_sol: "/** Connect Four: gravity drop + check only the 4 lines through the new disc. */\nclass ConnectFour {\n    private final int rows, cols, k;\n    private final char[][] grid;\n    private final int[] height;                   // next free row per column, counted from the bottom\n    private int moves = 0;\n\n    ConnectFour(int rows, int cols, int k) {\n        this.rows = rows; this.cols = cols; this.k = k;\n        grid = new char[rows][cols];\n        for (char[] r : grid) Arrays.fill(r, '.');\n        height = new int[cols];\n    }\n\n    /** Drops a disc; returns \"WIN\", \"DRAW\" or \"OK\". Throws on a full or bad column. */\n    String drop(int col, char p) {\n        if (col < 0 || col >= cols || height[col] == rows) throw new IllegalArgumentException(\"Column \" + col + \" is not playable\");\n        int r = rows - 1 - height[col]++;         // row 0 is the top, so discs fall to the largest row\n        grid[r][col] = p;\n        moves++;\n        int[][] dirs = {{0, 1}, {1, 0}, {1, 1}, {1, -1}};\n        for (int[] d : dirs) {\n            int count = 1 + run(r, col, d[0], d[1], p) + run(r, col, -d[0], -d[1], p);\n            if (count >= k) return \"WIN\";\n        }\n        return moves == rows * cols ? \"DRAW\" : \"OK\";\n    }\n\n    /** How many same discs continue from (r,c) in direction (dr,dc), not counting (r,c). */\n    private int run(int r, int c, int dr, int dc, char p) {\n        int n = 0;\n        for (int rr = r + dr, cc = c + dc; rr >= 0 && rr < rows && cc >= 0 && cc < cols && grid[rr][cc] == p; rr += dr, cc += dc) n++;\n        return n;\n    }\n\n    /** Red and Yellow alternate through the columns; returns every result on one line. */\n    static String play(ConnectFour g, int... cols) {\n        StringJoiner out = new StringJoiner(\" \");\n        for (int i = 0; i < cols.length; i++) out.add(g.drop(cols[i], i % 2 == 0 ? 'R' : 'Y'));\n        return out.toString();\n    }\n\n    public static void main(String[] args) {\n        // red completes a diagonal (5,0) (4,1) (3,2) (2,3) on the last drop\n        System.out.println(play(new ConnectFour(6, 7, 4), 0, 1, 1, 2, 2, 3, 2, 3, 3, 6, 3));\n        // red stacks column 0 while yellow stacks column 1: vertical win on a 4x4 board\n        System.out.println(play(new ConnectFour(4, 4, 4), 0, 1, 0, 1, 0, 1, 0));\n        // bottom row 0,1,2,3 for red: horizontal win\n        System.out.println(play(new ConnectFour(6, 7, 4), 0, 0, 1, 1, 2, 2, 3));\n        // 2x2 board, 3 in a row is impossible: the fourth disc ends in a draw\n        ConnectFour small = new ConnectFour(2, 2, 3);\n        System.out.println(play(small, 0, 1, 0, 1));\n        for (int col : new int[]{0, 7, -1}) {                 // full column, past the edge, before the edge\n            try { small.drop(col, 'R'); } catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }\n        }\n    }\n}",
    p07_brute: "// BRUTE: rescan the whole R x C board for K-in-a-row after every move: O(R*C*K) per move.\nclass GomokuBrute {\n    static boolean wins(char[][] b, char p, int k) {\n        int R = b.length, C = b[0].length;\n        for (int r = 0; r < R; r++)\n            for (int c = 0; c < C; c++) {\n                if (b[r][c] != p) continue;\n                int[][] dirs = {{0, 1}, {1, 0}, {1, 1}, {1, -1}};\n                for (int[] d : dirs) {\n                    int len = 0;\n                    for (int rr = r, cc = c; rr >= 0 && rr < R && cc >= 0 && cc < C && b[rr][cc] == p; rr += d[0], cc += d[1]) len++;\n                    if (len >= k) return true;\n                }\n            }\n        return false;\n    }\n}\n",
    p07_sol: "/** Rules are a strategy, so \"3 in a row on 3x3\" and \"5 in a row on 15x15\" share one Game class. */\ninterface WinRule { boolean isWin(char[][] b, int r, int c); }\n\n/** K in a row in any of 4 directions, counted outward from the last move only: O(K) per move. */\nclass KInARow implements WinRule {\n    private final int k;\n    KInARow(int k) { this.k = k; }\n    public boolean isWin(char[][] b, int r, int c) {\n        char p = b[r][c];\n        int[][] dirs = {{0, 1}, {1, 0}, {1, 1}, {1, -1}};\n        for (int[] d : dirs) {\n            int count = 1;\n            for (int s = -1; s <= 1; s += 2) {             // walk both ways along the line\n                int rr = r + s * d[0], cc = c + s * d[1];\n                while (rr >= 0 && rr < b.length && cc >= 0 && cc < b[0].length && b[rr][cc] == p && count < k) {\n                    count++; rr += s * d[0]; cc += s * d[1];\n                }\n            }\n            if (count >= k) return true;\n        }\n        return false;\n    }\n}\n\nclass GridGame {\n    private final char[][] b; private final WinRule rule; private final char[] players; private int turn;\n    GridGame(int rows, int cols, WinRule rule, char... players) {\n        b = new char[rows][cols]; for (char[] row : b) Arrays.fill(row, '.');\n        this.rule = rule; this.players = players;\n    }\n    /** Returns the winner symbol, or '.' if the game goes on. */\n    char play(int r, int c) {\n        if (r < 0 || r >= b.length || c < 0 || c >= b[0].length) throw new IllegalArgumentException(\"outside the board\");\n        if (b[r][c] != '.') throw new IllegalArgumentException(\"occupied\");\n        char p = players[turn];\n        b[r][c] = p;\n        if (rule.isWin(b, r, c)) return p;\n        turn = (turn + 1) % players.length;\n        return '.';\n    }\n\n    /** Plays the moves in order and returns the last result: a winner symbol, or '.' while the game goes on. */\n    static char playAll(GridGame g, int[]... moves) {\n        char last = '.';\n        for (int[] m : moves) last = g.play(m[0], m[1]);\n        return last;\n    }\n\n    public static void main(String[] args) {\n        // Gomoku: X builds row 7 from column 3 to 7 while O plays far away\n        GridGame gomoku = new GridGame(15, 15, new KInARow(5), 'X', 'O');\n        char w = playAll(gomoku, new int[]{7, 3}, new int[]{0, 0}, new int[]{7, 4}, new int[]{0, 1}, new int[]{7, 5},\n                new int[]{0, 2}, new int[]{7, 6}, new int[]{0, 3}, new int[]{7, 7});\n        System.out.println(\"Winner: \" + w);                                   // Winner: X\n        // the same class plays 3x3 tic-tac-toe: only the rule object differs\n        GridGame ttt = new GridGame(3, 3, new KInARow(3), 'X', 'O');\n        System.out.println(\"Winner: \" + playAll(ttt, new int[]{0, 0}, new int[]{1, 0}, new int[]{1, 1}, new int[]{2, 0}, new int[]{2, 2}));\n        // three players on 4x4, three in a row wins\n        GridGame three = new GridGame(4, 4, new KInARow(3), 'A', 'B', 'C');\n        System.out.println(\"Winner: \" + playAll(three, new int[]{0, 0}, new int[]{3, 3}, new int[]{3, 0}, new int[]{0, 1},\n                new int[]{2, 3}, new int[]{2, 0}, new int[]{0, 2}));          // Winner: A\n        // a game still running, then the two refused moves\n        GridGame open = new GridGame(3, 3, new KInARow(3), 'X', 'O');\n        char r = playAll(open, new int[]{0, 0}, new int[]{1, 1}, new int[]{0, 1}, new int[]{1, 0});\n        System.out.println(r == '.' ? \"nobody yet\" : \"Winner: \" + r);          // nobody yet\n        for (int[] bad : new int[][]{{0, 0}, {3, 0}}) {\n            try { open.play(bad[0], bad[1]); } catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }\n        }\n    }\n}",
    p08_brute: "// BRUTE: one global list of reservations; every request scans all of them for every spot.\nclass ReservationsBrute {\n    record Res(int spot, int start, int end) { }\n    private final List<Res> all = new ArrayList<>();\n    private final int spots;\n    ReservationsBrute(int spots) { this.spots = spots; }\n\n    int reserve(int start, int end) {\n        for (int s = 0; s < spots; s++) {\n            boolean clash = false;\n            for (Res r : all) if (r.spot() == s && start < r.end() && r.start() < end) { clash = true; break; }\n            if (!clash) { all.add(new Res(s, start, end)); return s; }\n        }\n        return -1;                                     // O(spots * total reservations) per request\n    }\n}\n",
    p08_sol: "/** Each spot keeps its own calendar: start -> end, sorted, with no overlaps (half-open [start, end)). */\nclass SpotCalendar {\n    final String spotId;\n    private final TreeMap<Integer, Integer> booked = new TreeMap<>();\n    SpotCalendar(String spotId) { this.spotId = spotId; }\n\n    /** Free if the booking just before ends by `start` and the one just after starts at or after `end`. */\n    boolean isFree(int start, int end) {\n        Map.Entry<Integer, Integer> before = booked.floorEntry(start);\n        if (before != null && before.getValue() > start) return false;\n        Integer after = booked.ceilingKey(start);\n        return after == null || after >= end;\n    }\n    void book(int start, int end) { booked.put(start, end); }\n    void cancel(int start) { booked.remove(start); }\n}\n\nrecord Reservation(String id, String spotId, int start, int end) { }\n\nclass ReservationService {\n    private final Map<String, List<SpotCalendar>> calendarsByType = new HashMap<>();\n    private final Map<String, Reservation> byId = new HashMap<>();\n    private final Map<String, SpotCalendar> calendarById = new HashMap<>();\n    private int seq = 1;\n\n    void addSpot(String type, String spotId) {\n        SpotCalendar cal = new SpotCalendar(spotId);\n        calendarsByType.computeIfAbsent(type, k -> new ArrayList<>()).add(cal);\n        calendarById.put(spotId, cal);\n    }\n\n    synchronized Optional<Reservation> reserve(String type, int start, int end) {\n        if (start >= end) throw new IllegalArgumentException(\"start must be before end\");\n        for (SpotCalendar cal : calendarsByType.getOrDefault(type, List.of())) {\n            if (cal.isFree(start, end)) {\n                cal.book(start, end);\n                Reservation r = new Reservation(\"R\" + seq++, cal.spotId, start, end);\n                byId.put(r.id(), r);\n                return Optional.of(r);\n            }\n        }\n        return Optional.empty();\n    }\n\n    synchronized boolean cancel(String reservationId) {\n        Reservation r = byId.remove(reservationId);\n        if (r == null) return false;\n        calendarById.get(r.spotId()).cancel(r.start());\n        return true;\n    }\n\n    static String show(Optional<Reservation> r) {\n        return r.map(x -> x.id() + \" \" + x.spotId() + \" [\" + x.start() + \",\" + x.end() + \")\").orElse(\"none\");\n    }\n\n    public static void main(String[] args) {\n        ReservationService svc = new ReservationService();\n        svc.addSpot(\"CAR\", \"A1\"); svc.addSpot(\"CAR\", \"A2\");\n        System.out.println(show(svc.reserve(\"CAR\", 9, 12)));    // R1 on A1\n        System.out.println(show(svc.reserve(\"CAR\", 10, 11)));   // R2 on A2 (A1 busy 9-12)\n        System.out.println(show(svc.reserve(\"CAR\", 11, 13)));   // R3 on A2: its [10,11) ends exactly at 11\n        System.out.println(show(svc.reserve(\"CAR\", 12, 14)));   // R4 on A1: [9,12) and [12,14) touch, no overlap\n        System.out.println(\"cancel R2: \" + svc.cancel(\"R2\"));\n        System.out.println(show(svc.reserve(\"CAR\", 10, 11)));   // R5 on A2 (the freed 10-11 gap)\n        System.out.println(show(svc.reserve(\"CAR\", 9, 12)));    // none: both spots overlap this window\n        System.out.println(show(svc.reserve(\"CAR\", 13, 15)));   // R6 on A2: back-to-back after [11,13)\n        System.out.println(show(svc.reserve(\"TRUCK\", 9, 10)));  // none: no TRUCK spots exist\n        System.out.println(\"cancel R2 again: \" + svc.cancel(\"R2\")); // false: already cancelled\n        try { svc.reserve(\"CAR\", 5, 5); } catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }\n    }\n}",
    p09_brute: "// BRUTE: subclass explosion. Every combination of features becomes a new class.\nclass HourlyFee { long fee(long hours, double kwh) { return hours * 20; } }\nclass HourlyWithCharging extends HourlyFee { long fee(long hours, double kwh) { return super.fee(hours, kwh) + Math.round(kwh * 15); } }\nclass HourlyWithValet extends HourlyFee { long fee(long hours, double kwh) { return super.fee(hours, kwh) + 100; } }\nclass HourlyWithChargingAndValet extends HourlyWithCharging { long fee(long hours, double kwh) { return super.fee(hours, kwh) + 100; } }\n// ...and again for FlatFee, WeekendFee, and every new add-on: classes = pricings x 2^addons\n",
    p09_sol: "/** What we know about one stay when we price it. */\nrecord Stay(long hours, double kwhCharged, boolean valet) {\n    Stay {\n        if (hours < 0 || kwhCharged < 0) throw new IllegalArgumentException(\"stay values must not be negative\");\n    }\n}\n\ninterface Pricing { long fee(Stay s); String describe(); }\n\nclass Hourly implements Pricing {\n    private final long rate;\n    Hourly(long rate) { this.rate = rate; }\n    public long fee(Stay s) { return Math.max(1, s.hours()) * rate; }\n    public String describe() { return \"hourly@\" + rate; }\n}\n\n/** Decorator base: wraps another Pricing and adds something on top. */\nabstract class PricingAddOn implements Pricing {\n    protected final Pricing inner;\n    PricingAddOn(Pricing inner) { this.inner = inner; }\n}\n\nclass ChargingAddOn extends PricingAddOn {\n    private final double perKwh;\n    ChargingAddOn(Pricing inner, double perKwh) { super(inner); this.perKwh = perKwh; }\n    public long fee(Stay s) { return inner.fee(s) + Math.round(s.kwhCharged() * perKwh); }\n    public String describe() { return inner.describe() + \" + charging@\" + String.format(Locale.ROOT, \"%.1f\", perKwh) + \"/kWh\"; }\n}\n\nclass ValetAddOn extends PricingAddOn {\n    private final long valetFee;\n    ValetAddOn(Pricing inner, long valetFee) { super(inner); this.valetFee = valetFee; }\n    public long fee(Stay s) { return inner.fee(s) + (s.valet() ? valetFee : 0); }\n    public String describe() { return inner.describe() + \" + valet\"; }\n}\n\nenum SpotKind { REGULAR, EV }\n\n/** Picks the pricing chain by spot kind: an EV spot simply gets one more wrapper. */\nclass PricingFactory {\n    static Pricing forSpot(SpotKind kind) {\n        Pricing p = new ValetAddOn(new Hourly(20), 100);\n        return kind == SpotKind.EV ? new ChargingAddOn(p, 15.0) : p;\n    }\n}\n\npublic class EvDemo {\n    public static void main(String[] args) {\n        Pricing ev = PricingFactory.forSpot(SpotKind.EV);\n        Pricing regular = PricingFactory.forSpot(SpotKind.REGULAR);\n        System.out.println(ev.describe());                                   // hourly@20 + valet + charging@15.0/kWh\n        System.out.println(ev.fee(new Stay(3, 10.0, false)));                // 60 + 150 = 210\n        System.out.println(regular.fee(new Stay(3, 0, true)));               // 60 + 100 = 160\n        System.out.println(ev.fee(new Stay(2, 1.5, true)));                  // 40 + 100 + round(22.5) = 163 (half rounds up)\n        System.out.println(regular.describe());                              // hourly@20 + valet\n        System.out.println(ev.fee(new Stay(0, 0, false)));                   // a stay bills at least one hour: 20\n        try { new Stay(-1, 0, false); } catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }\n    }\n}",
    p10_brute: "// BRUTE: for every arriving car, scan every spot and compute its distance to this gate.\nclass NearestBrute {\n    static int nearest(int[][] dist, boolean[] taken, int gate) {\n        int best = -1;\n        for (int s = 0; s < taken.length; s++)\n            if (!taken[s] && (best == -1 || dist[gate][s] < dist[gate][best])) best = s;\n        return best;                                   // O(spots) per car, per gate\n    }\n}\n",
    p10_sol: "/** Strategy: choose a spot for an arriving vehicle at a given gate. */\ninterface GateAwareStrategy {\n    int allocate(int gate);          // returns spot id or -1\n    void release(int spot);\n}\n\n/**\n * One min-heap of spots per gate, ordered by distance from that gate.\n * A freed spot is pushed back into every heap that does not already hold it. Spots taken via\n * another gate stay in this heap as stale entries and are skipped when popped (lazy deletion).\n */\nclass NearestToGate implements GateAwareStrategy {\n    private final int[][] dist;                      // dist[gate][spot]\n    private final boolean[] taken;\n    private final boolean[][] queued;                // queued[gate][spot]: spot is already in that gate's heap\n    private final List<PriorityQueue<Integer>> heaps = new ArrayList<>();\n\n    NearestToGate(int[][] dist) {\n        this.dist = dist;\n        int spots = dist[0].length;\n        taken = new boolean[spots];\n        queued = new boolean[dist.length][spots];\n        for (int g = 0; g < dist.length; g++) {\n            final int gate = g;\n            PriorityQueue<Integer> pq = new PriorityQueue<>(Comparator.comparingInt((Integer s) -> dist[gate][s]).thenComparingInt(s -> s));\n            for (int s = 0; s < spots; s++) { pq.add(s); queued[g][s] = true; }\n            heaps.add(pq);\n        }\n    }\n\n    public synchronized int allocate(int gate) {\n        PriorityQueue<Integer> pq = heaps.get(gate);\n        while (!pq.isEmpty()) {\n            int s = pq.poll();\n            queued[gate][s] = false;\n            if (!taken[s]) { taken[s] = true; return s; }   // stale entries are simply dropped\n        }\n        return -1;\n    }\n\n    public synchronized void release(int spot) {\n        if (!taken[spot]) throw new IllegalStateException(\"Spot \" + spot + \" is not taken\");\n        taken[spot] = false;\n        for (int g = 0; g < heaps.size(); g++)\n            if (!queued[g][spot]) { heaps.get(g).add(spot); queued[g][spot] = true; }   // never twice in one heap\n    }\n\n    synchronized int pending(int gate) { return heaps.get(gate).size(); }\n\n    public static void main(String[] args) {\n        int[][] dist = {{1, 2, 3, 4}, {4, 3, 2, 1}};       // gate 0 is near spot 0, gate 1 near spot 3\n        NearestToGate st = new NearestToGate(dist);\n        System.out.println(st.allocate(0));               // 0\n        System.out.println(st.allocate(1));               // 3\n        System.out.println(st.allocate(1));               // 2\n        st.release(3);\n        System.out.println(st.allocate(1));               // 3 again\n        System.out.println(st.allocate(0));               // 1\n        System.out.println(st.allocate(0));               // -1: every spot is taken\n        st.release(0);\n        System.out.println(st.allocate(1));               // 0: spot 1 is a stale entry in gate 1's heap and is skipped\n        st.release(0);\n        try { st.release(0); } catch (IllegalStateException e) { System.out.println(e.getMessage()); }\n\n        NearestToGate busy = new NearestToGate(dist);\n        for (int i = 0; i < 1000; i++) busy.release(busy.allocate(1));   // churn through gate 1 only\n        System.out.println(\"gate 0 heap holds \" + busy.pending(0) + \" entries\");   // still 4, not 1004\n\n        NearestToGate ties = new NearestToGate(new int[][]{{5, 5, 5}});  // equal distances: smaller id first\n        System.out.println(ties.allocate(0) + \" \" + ties.allocate(0) + \" \" + ties.allocate(0) + \" \" + ties.allocate(0));  // 0 1 2 -1\n    }\n}",
    p11_brute: "// BRUTE (and BROKEN): check-then-act with no locking. Two gates can both see spot 7 as free\n// and both write their car into it. Wrapping park() in one global lock fixes correctness\n// but makes every gate wait for every other gate.\nclass RacyLot {\n    private final String[] spots;\n    RacyLot(int n) { spots = new String[n]; }\n\n    int park(String plate) {\n        for (int i = 0; i < spots.length; i++) {\n            if (spots[i] == null) {          // CHECK  <- another thread can run here\n                spots[i] = plate;            // ACT    <- and both \"win\" the same spot\n                return i;\n            }\n        }\n        return -1;\n    }\n}\n",
    p11_sol: "enum SpotType { SMALL, COMPACT, LARGE }\n\nclass Spot {\n    final int id; final SpotType type;\n    final AtomicReference<String> plate = new AtomicReference<>();   // null = free\n    Spot(int id, SpotType type) { this.id = id; this.type = type; }\n}\n\n/**\n * Lock-free allocation: free spots per type live in a concurrent queue.\n * poll() hands each spot to exactly ONE thread, so two gates can never receive the same spot.\n * The CAS on the spot is a second safety net (and catches bugs like double release).\n */\nclass ConcurrentLot {\n    private final Map<SpotType, ConcurrentLinkedQueue<Spot>> free = new EnumMap<>(SpotType.class);\n    private final ConcurrentHashMap<String, Spot> byPlate = new ConcurrentHashMap<>();\n    private final Set<String> inside = ConcurrentHashMap.newKeySet();   // plates that hold or are getting a spot\n\n    ConcurrentLot(List<Spot> spots) {\n        for (SpotType t : SpotType.values()) free.put(t, new ConcurrentLinkedQueue<>());\n        for (Spot s : spots) free.get(s.type).add(s);\n    }\n\n    Optional<Spot> park(String plate, SpotType type) {\n        if (!inside.add(plate)) throw new IllegalStateException(plate + \" already inside\"); // atomic claim\n        Spot s = free.get(type).poll();                      // atomic hand-off\n        if (s == null) { inside.remove(plate); return Optional.empty(); }\n        if (!s.plate.compareAndSet(null, plate)) throw new IllegalStateException(\"corrupted spot \" + s.id);\n        byPlate.put(plate, s);\n        return Optional.of(s);\n    }\n\n    void leave(String plate) {\n        Spot s = byPlate.remove(plate);                      // only one thread can remove a key\n        if (s == null) throw new NoSuchElementException(plate + \" is not inside\");\n        if (!s.plate.compareAndSet(plate, null)) throw new IllegalStateException(\"double release \" + s.id);\n        free.get(s.type).add(s);                             // publish AFTER clearing the spot\n        inside.remove(plate);\n    }\n\n    int parkedCount() { return byPlate.size(); }\n}\n\npublic class ConcurrentDemo {\n    public static void main(String[] args) throws Exception {\n        List<Spot> spots = new ArrayList<>();\n        for (int i = 0; i < 500; i++) spots.add(new Spot(i, SpotType.COMPACT));\n        ConcurrentLot lot = new ConcurrentLot(spots);\n        AtomicInteger ok = new AtomicInteger();\n        Set<Integer> used = ConcurrentHashMap.newKeySet();\n        AtomicInteger dup = new AtomicInteger();\n        ConcurrentLinkedQueue<String> parked = new ConcurrentLinkedQueue<>();\n\n        ExecutorService gates = Executors.newFixedThreadPool(8);    // 8 entry gates\n        for (int g = 0; g < 8; g++) {\n            final int gate = g;\n            gates.submit(() -> {\n                for (int i = 0; i < 125; i++) {                     // 1000 cars for 500 spots\n                    final String plate = \"G\" + gate + \"-\" + i;\n                    lot.park(plate, SpotType.COMPACT).ifPresent(s -> {\n                        ok.incrementAndGet();\n                        parked.add(plate);\n                        if (!used.add(s.id)) dup.incrementAndGet();\n                    });\n                }\n            });\n        }\n        gates.shutdown();\n        gates.awaitTermination(10, TimeUnit.SECONDS);\n        System.out.println(\"parked=\" + ok.get() + \" duplicates=\" + dup.get() + \" inside=\" + lot.parkedCount());\n        // parked=500 duplicates=0 inside=500\n\n        System.out.println(\"full lot refuses: \" + lot.park(\"LATE\", SpotType.COMPACT).isEmpty());   // true\n        try { lot.leave(\"NOPE\"); } catch (NoSuchElementException e) { System.out.println(e.getMessage()); }\n        lot.leave(parked.peek());                                                // one car (any) drives out\n        System.out.println(\"inside=\" + lot.parkedCount());                       // 499\n        System.out.println(\"LATE parked: \" + lot.park(\"LATE\", SpotType.COMPACT).isPresent());   // true: it took the freed spot\n        try { lot.park(\"LATE\", SpotType.COMPACT); } catch (IllegalStateException e) { System.out.println(e.getMessage()); }\n        System.out.println(\"inside=\" + lot.parkedCount());                       // 500\n    }\n}",
    p12_brute: "// BRUTE: a bot that takes the first empty cell. It \"plays\", but any human beats it.\nclass FirstFreeBot {\n    static int[] choose(char[][] b) {\n        for (int r = 0; r < 3; r++)\n            for (int c = 0; c < 3; c++)\n                if (b[r][c] == '.') return new int[]{r, c};\n        throw new IllegalStateException(\"board full\");\n    }\n}\n",
    p12_sol: "/** The same Player interface the game already uses: a bot is just another strategy. */\ninterface Player { char symbol(); int[] chooseMove(char[][] board); }\n\n/** Minimax with alpha-beta pruning: never loses at 3x3 tic-tac-toe. */\nclass MinimaxBot implements Player {\n    private final char me, them;\n    MinimaxBot(char me, char them) { this.me = me; this.them = them; }\n    public char symbol() { return me; }\n\n    public int[] chooseMove(char[][] b) {\n        int best = Integer.MIN_VALUE; int[] move = null;\n        for (int r = 0; r < 3; r++)\n            for (int c = 0; c < 3; c++) {\n                if (b[r][c] != '.') continue;\n                b[r][c] = me;\n                int score = minimax(b, false, 1, Integer.MIN_VALUE, Integer.MAX_VALUE);\n                b[r][c] = '.';\n                if (score > best) { best = score; move = new int[]{r, c}; }\n            }\n        if (move == null) throw new IllegalStateException(\"board is full\");\n        return move;\n    }\n\n    /** Score from the bot's view: +10 - depth for a win (win sooner is better), depth - 10 for a loss. */\n    private int minimax(char[][] b, boolean myTurn, int depth, int alpha, int beta) {\n        if (wins(b, me)) return 10 - depth;\n        if (wins(b, them)) return depth - 10;\n        if (full(b)) return 0;\n        int best = myTurn ? Integer.MIN_VALUE : Integer.MAX_VALUE;\n        for (int r = 0; r < 3; r++)\n            for (int c = 0; c < 3; c++) {\n                if (b[r][c] != '.') continue;\n                b[r][c] = myTurn ? me : them;\n                int s = minimax(b, !myTurn, depth + 1, alpha, beta);\n                b[r][c] = '.';\n                if (myTurn) { best = Math.max(best, s); alpha = Math.max(alpha, s); }\n                else { best = Math.min(best, s); beta = Math.min(beta, s); }\n                if (beta <= alpha) return best;            // prune: opponent will never allow this line\n            }\n        return best;\n    }\n\n    static boolean wins(char[][] b, char p) {\n        for (int i = 0; i < 3; i++)\n            if ((b[i][0] == p && b[i][1] == p && b[i][2] == p) || (b[0][i] == p && b[1][i] == p && b[2][i] == p)) return true;\n        return (b[0][0] == p && b[1][1] == p && b[2][2] == p) || (b[0][2] == p && b[1][1] == p && b[2][0] == p);\n    }\n    static boolean full(char[][] b) {\n        for (char[] row : b) for (char ch : row) if (ch == '.') return false;\n        return true;\n    }\n}\n\n/** A weak player that takes the first empty cell: it plugs into the same interface. */\nclass FirstFreePlayer implements Player {\n    private final char me;\n    FirstFreePlayer(char me) { this.me = me; }\n    public char symbol() { return me; }\n    public int[] chooseMove(char[][] b) {\n        for (int r = 0; r < 3; r++) for (int c = 0; c < 3; c++) if (b[r][c] == '.') return new int[]{r, c};\n        throw new IllegalStateException(\"board is full\");\n    }\n}\n\npublic class BotDemo {\n    static char[][] board(String... rows) {\n        char[][] b = new char[3][];\n        for (int i = 0; i < 3; i++) b[i] = rows[i].toCharArray();\n        return b;\n    }\n\n    /** The existing game loop: ask each Player in turn. It cannot tell a human from a bot. */\n    static String play(Player x, Player o) {\n        char[][] b = board(\"...\", \"...\", \"...\");\n        Player[] turn = {x, o};\n        for (int i = 0; i < 9; i++) {\n            Player p = turn[i % 2];\n            int[] m = p.chooseMove(b);\n            b[m[0]][m[1]] = p.symbol();\n            if (MinimaxBot.wins(b, p.symbol())) return String.valueOf(p.symbol());\n        }\n        return \"draw\";\n    }\n\n    public static void main(String[] args) {\n        int[] m = new MinimaxBot('O', 'X').chooseMove(board(\"XX.\", \"OO.\", \"...\"));\n        System.out.println(m[0] + \",\" + m[1]);             // 1,2 : win now rather than block\n        int[] m2 = new MinimaxBot('O', 'X').chooseMove(board(\"XX.\", \".O.\", \"...\"));\n        System.out.println(m2[0] + \",\" + m2[1]);           // 0,2 : must block X\n        System.out.println(play(new MinimaxBot('X', 'O'), new MinimaxBot('O', 'X')));       // draw: perfect play\n        System.out.println(play(new MinimaxBot('X', 'O'), new FirstFreePlayer('O')));       // X: the bot beats a weak player\n        System.out.println(play(new FirstFreePlayer('X'), new MinimaxBot('O', 'X')));       // O: and it wins from the second seat\n        try { new MinimaxBot('O', 'X').chooseMove(board(\"XOX\", \"XOO\", \"OXX\")); }\n        catch (IllegalStateException e) { System.out.println(e.getMessage()); }              // board is full\n    }\n}",
    p13_brute: "// BRUTE: main() with a giant if-else on the command word and linear scans everywhere.\nclass ParkingCli {\n    static String[] plate, colour;\n\n    static void run(String line) {\n        String[] p = line.split(\" \");\n        if (p[0].equals(\"create_parking_lot\")) {\n            plate = new String[Integer.parseInt(p[1])]; colour = new String[plate.length];\n            System.out.println(\"Created a parking lot with \" + plate.length + \" slots\");\n        } else if (p[0].equals(\"park\")) {\n            for (int i = 0; i < plate.length; i++)          // O(n) scan for the nearest slot\n                if (plate[i] == null) { plate[i] = p[1]; colour[i] = p[2]; System.out.println(\"Allocated slot number: \" + (i + 1)); return; }\n            System.out.println(\"Sorry, parking lot is full\");\n        } else if (p[0].equals(\"leave\")) {\n            int s = Integer.parseInt(p[1]) - 1; plate[s] = null; colour[s] = null;\n            System.out.println(\"Slot number \" + (s + 1) + \" is free\");\n        } else if (p[0].equals(\"registration_numbers_for_cars_with_colour\")) {\n            StringJoiner j = new StringJoiner(\", \");\n            for (int i = 0; i < plate.length; i++) if (p[1].equals(colour[i])) j.add(plate[i]);\n            System.out.println(j.length() == 0 ? \"Not found\" : j.toString());\n        } else {\n            System.out.println(\"Unknown command\");        // every new command grows this ladder\n        }\n    }\n}\n",
    p13_sol: "record Car(String plate, String colour) { }\n\n/** Domain: knows nothing about text commands. Nearest free slot = smallest number, kept in a TreeSet. */\nclass Garage {\n    private final Car[] slots;\n    private final TreeSet<Integer> freeSlots = new TreeSet<>();\n    private final Map<String, Integer> slotByPlate = new HashMap<>();\n    private final Map<String, TreeSet<Integer>> slotsByColour = new HashMap<>();\n\n    Garage(int n) { slots = new Car[n + 1]; for (int i = 1; i <= n; i++) freeSlots.add(i); }\n    int capacity() { return slots.length - 1; }\n\n    OptionalInt park(Car car) {\n        if (slotByPlate.containsKey(car.plate())) throw new IllegalStateException(car.plate() + \" already parked\");\n        if (freeSlots.isEmpty()) return OptionalInt.empty();\n        int s = freeSlots.pollFirst();                                   // O(log n) nearest slot\n        slots[s] = car;\n        slotByPlate.put(car.plate(), s);\n        slotsByColour.computeIfAbsent(car.colour().toLowerCase(), k -> new TreeSet<>()).add(s);\n        return OptionalInt.of(s);\n    }\n\n    boolean leave(int s) {\n        if (s < 1 || s > capacity() || slots[s] == null) return false;\n        Car car = slots[s];\n        slots[s] = null;\n        freeSlots.add(s);\n        slotByPlate.remove(car.plate());\n        slotsByColour.get(car.colour().toLowerCase()).remove(s);\n        return true;\n    }\n\n    List<Integer> slotsWithColour(String colour) { return new ArrayList<>(slotsByColour.getOrDefault(colour.toLowerCase(), new TreeSet<>())); }\n    Car carAt(int s) { return slots[s]; }\n    Optional<Integer> slotOf(String plate) { return Optional.ofNullable(slotByPlate.get(plate)); }\n}\n\n/** Command pattern: each text command is one small class. A new command = one new class + one map entry. */\ninterface CliCommand { String execute(String[] args, Session session); }\n\n/** Holds the garage once it is created, so commands can share it. */\nclass Session { Garage garage; }\n\n/** Defensive parsing helpers shared by the commands. */\nfinal class Cli {\n    static int number(String text) {\n        try { return Integer.parseInt(text); }\n        catch (NumberFormatException e) { throw new IllegalArgumentException(\"not a number: \" + text); }\n    }\n}\n\nclass CreateCmd implements CliCommand {\n    public String execute(String[] a, Session s) {\n        int n = Cli.number(a[0]);\n        if (n < 1) throw new IllegalArgumentException(\"capacity must be at least 1\");\n        s.garage = new Garage(n);\n        return \"Created a parking lot with \" + n + \" slots\";\n    }\n}\n\nclass ParkCmd implements CliCommand {\n    public String execute(String[] a, Session s) {\n        OptionalInt slot = s.garage.park(new Car(a[0], a[1]));\n        return slot.isPresent() ? \"Allocated slot number: \" + slot.getAsInt() : \"Sorry, parking lot is full\";\n    }\n}\n\nclass LeaveCmd implements CliCommand {\n    public String execute(String[] a, Session s) {\n        int slot = Cli.number(a[0]);\n        return s.garage.leave(slot) ? \"Slot number \" + slot + \" is free\" : \"Slot \" + slot + \" is already empty\";\n    }\n}\n\nclass PlatesByColourCmd implements CliCommand {\n    public String execute(String[] a, Session s) {\n        List<String> plates = new ArrayList<>();\n        for (int slot : s.garage.slotsWithColour(a[0])) plates.add(s.garage.carAt(slot).plate());\n        return plates.isEmpty() ? \"Not found\" : String.join(\", \", plates);\n    }\n}\n\nclass SlotForPlateCmd implements CliCommand {\n    public String execute(String[] a, Session s) {\n        return s.garage.slotOf(a[0]).map(String::valueOf).orElse(\"Not found\");\n    }\n}\n\nclass Interpreter {\n    private final Map<String, CliCommand> commands = new HashMap<>();\n    private final Map<String, Integer> arity = new HashMap<>();\n    private final Session session = new Session();\n\n    Interpreter() {\n        register(\"create_parking_lot\", 1, new CreateCmd());\n        register(\"park\", 2, new ParkCmd());\n        register(\"leave\", 1, new LeaveCmd());\n        register(\"registration_numbers_for_cars_with_colour\", 1, new PlatesByColourCmd());\n        register(\"slot_number_for_registration_number\", 1, new SlotForPlateCmd());\n    }\n\n    void register(String name, int args, CliCommand c) { commands.put(name, c); arity.put(name, args); }\n\n    String handle(String line) {\n        String[] parts = line.trim().split(\" +\");\n        CliCommand cmd = commands.get(parts[0]);\n        if (cmd == null) return \"Unknown command: \" + parts[0];\n        if (parts.length - 1 != arity.get(parts[0])) return \"Usage: \" + parts[0] + \" needs \" + arity.get(parts[0]) + \" argument(s)\";\n        if (session.garage == null && !(cmd instanceof CreateCmd)) return \"Create a parking lot first\";\n        try {\n            return cmd.execute(Arrays.copyOfRange(parts, 1, parts.length), session);\n        } catch (RuntimeException e) {\n            return \"Error: \" + e.getMessage();                 // one bad line never kills the program\n        }\n    }\n\n    /** The program: read one command per line until the input ends, print one answer per command. */\n    public static void main(String[] args) throws IOException {\n        Interpreter it = new Interpreter();\n        BufferedReader in = new BufferedReader(new InputStreamReader(System.in));\n        for (String line = in.readLine(); line != null; line = in.readLine())\n            if (!line.isBlank()) System.out.println(it.handle(line));\n    }\n}",
    p14_brute: "// BRUTE: the game prints straight to the console and keeps no history.\n// Spectators? Copy-paste println calls. Replay? Impossible: past states are gone.\nclass LoudGame {\n    char[][] b = new char[4][4];\n    char[] syms = {'X', 'O', 'Z'};\n    int turn = 0;\n    void play(int r, int c) {\n        b[r][c] = syms[turn];\n        System.out.println(\"Player \" + syms[turn] + \" played \" + r + \",\" + c);    // UI glued into the model\n        System.out.println(\"[TV screen] \" + syms[turn] + \" -> \" + r + \",\" + c);    // second \"spectator\", copy-pasted\n        turn = (turn + 1) % 3;\n    }\n}\n",
    p14_sol: "/** Events are facts that happened. The list of events IS the game (event sourcing, lite). */\nsealed interface GameEvent permits MovePlayed, GameWon, GameDrawn { }\nrecord MovePlayed(int seq, char symbol, int row, int col) implements GameEvent { }\nrecord GameWon(char symbol) implements GameEvent { }\nrecord GameDrawn() implements GameEvent { }\n\n/** Observer: spectators, loggers, a scoreboard... the game does not know which. */\ninterface GameListener { void on(GameEvent e); }\n\nclass MultiGame {\n    private final int n; private final char[] symbols; private final char[][] board;\n    private final int[][] rows, cols; private final int[] diag, anti;\n    private final List<GameEvent> log = new ArrayList<>();\n    private final List<GameListener> listeners = new ArrayList<>();\n    private int turn = 0, moves = 0; private boolean over = false;\n\n    /** P players on an (P+1) x (P+1) board, needing a full line to win. */\n    MultiGame(char... symbols) {\n        this.symbols = symbols; this.n = symbols.length + 1;\n        board = new char[n][n]; for (char[] r : board) Arrays.fill(r, '.');\n        rows = new int[symbols.length][n]; cols = new int[symbols.length][n];\n        diag = new int[symbols.length]; anti = new int[symbols.length];\n    }\n\n    void subscribe(GameListener l) { listeners.add(l); }\n    private void emit(GameEvent e) { log.add(e); for (GameListener l : listeners) l.on(e); }\n\n    void play(int r, int c) {\n        if (over) throw new IllegalStateException(\"game over\");\n        if (r < 0 || r >= n || c < 0 || c >= n || board[r][c] != '.') throw new IllegalArgumentException(\"illegal move\");\n        int p = turn;\n        board[r][c] = symbols[p]; moves++;\n        emit(new MovePlayed(moves, symbols[p], r, c));\n        boolean win = ++rows[p][r] == n | ++cols[p][c] == n\n                | (r == c && ++diag[p] == n) | (r + c == n - 1 && ++anti[p] == n);   // non-short-circuit: update all\n        if (win) { over = true; emit(new GameWon(symbols[p])); }\n        else if (moves == n * n) { over = true; emit(new GameDrawn()); }\n        else turn = (turn + 1) % symbols.length;\n    }\n\n    List<GameEvent> events() { return List.copyOf(log); }\n    int size() { return n; }\n\n    /** Rebuild the board as it looked after `upTo` moves, purely from the event log. */\n    static char[][] replay(List<GameEvent> events, int n, int upTo) {\n        char[][] b = new char[n][n]; for (char[] r : b) Arrays.fill(r, '.');\n        for (GameEvent e : events)\n            if (e instanceof MovePlayed m && m.seq() <= upTo) b[m.row()][m.col()] = m.symbol();\n        return b;\n    }\n}\n\nclass Spectator implements GameListener {\n    private final String name; final List<String> seen = new ArrayList<>();\n    Spectator(String name) { this.name = name; }\n    public void on(GameEvent e) {\n        String line = switch (e) {\n            case MovePlayed m -> m.symbol() + \" plays \" + m.row() + \",\" + m.col();\n            case GameWon w -> w.symbol() + \" WINS\";\n            case GameDrawn d -> \"draw\";\n        };\n        seen.add(name + \": \" + line);\n    }\n}\n\npublic class ReplayDemo {\n    static String rows(char[][] b) {                       // \"XX../O.../..../....\" one string per board\n        StringJoiner sj = new StringJoiner(\"/\");\n        for (char[] row : b) sj.add(new String(row));\n        return sj.toString();\n    }\n\n    static String tryPlay(MultiGame g, int r, int c) {     // the reason a move was refused, or \"ok\"\n        try { g.play(r, c); return \"ok\"; } catch (RuntimeException e) { return e.getMessage(); }\n    }\n\n    public static void main(String[] args) {\n        MultiGame g = new MultiGame('X', 'O', 'Z');            // 3 players, 4x4 board\n        Spectator tv = new Spectator(\"TV\");\n        g.subscribe(tv);\n        int[][] moves = {{0,0},{1,0},{2,0},{0,1},{1,1},{2,1},{0,2},{1,2},{2,2},{0,3}};\n        for (int[] m : moves) g.play(m[0], m[1]);\n        System.out.println(tv.seen.get(tv.seen.size() - 1));  // TV: X WINS  (row 0 complete)\n        System.out.println(tv.seen.size());                   // 11: ten moves and the win\n        System.out.println(rows(MultiGame.replay(g.events(), g.size(), 3)));    // X.../O.../Z.../....\n        System.out.println(rows(MultiGame.replay(g.events(), g.size(), 10)));   // XXXX/OOO./ZZZ./....\n        System.out.println(tryPlay(g, 3, 3));                 // game over\n\n        MultiGame d = new MultiGame('X', 'O');                // 2 players, 3x3: a full board with no line\n        Spectator board = new Spectator(\"BOARD\");\n        d.subscribe(board);\n        int[][] draw = {{0,0},{0,1},{0,2},{1,2},{1,0},{2,0},{1,1},{2,2},{2,1}};\n        for (int[] m : draw) d.play(m[0], m[1]);\n        System.out.println(board.seen.get(board.seen.size() - 1));   // BOARD: draw\n        System.out.println(board.seen.size());                // 10: nine moves and the draw\n        System.out.println(tryPlay(d, 2, 2));                 // game over\n\n        MultiGame e = new MultiGame('X', 'O');\n        e.play(0, 0);\n        System.out.println(tryPlay(e, 0, 0));                 // illegal move: occupied\n        System.out.println(tryPlay(e, 3, 0));                 // illegal move: outside the 3x3 board\n    }\n}",
    t1_skeleton: "import java.time.LocalTime;\n\n// The framework applied to a NEW problem: \"Design a meeting-room booker\".\n// Step 1 (clarify): rooms have capacity; book a slot for N people; no overlaps; cancel allowed.\n// Step 2 (entities): Room, Booking.     Step 3 (APIs): book(...), cancel(...), bookingsFor(room).\n// Step 4 (diagram): Scheduler has Rooms, Room has Bookings.     Step 5 (patterns): Strategy for choosing a room.\n// Step 6 (extensibility): new selection rule = new class; nothing else changes.\n\nrecord Room(String name, int capacity) { }\n\nrecord Booking(String id, Room room, LocalTime start, LocalTime end, int people) {\n    boolean overlaps(LocalTime s, LocalTime e) { return s.isBefore(end) && start.isBefore(e); }   // half-open\n}\n\n/** Step 5: the rule most likely to change, behind an interface. */\ninterface RoomSelectionStrategy {\n    Optional<Room> choose(List<Room> candidates, int people);\n}\n\n/** Smallest room that is big enough: keeps big rooms free for big meetings. */\nclass SmallestFitStrategy implements RoomSelectionStrategy {\n    public Optional<Room> choose(List<Room> candidates, int people) {\n        return candidates.stream().filter(r -> r.capacity() >= people).min(Comparator.comparingInt(Room::capacity));\n    }\n}\n\n/** Step 3: the public API. Callers depend on this, not on the implementation. */\ninterface MeetingScheduler {\n    Optional<Booking> book(int people, LocalTime start, LocalTime end);\n    boolean cancel(String bookingId);\n    List<Booking> bookingsFor(Room room);\n}\n\nclass InMemoryScheduler implements MeetingScheduler {\n    private final List<Room> rooms;\n    private final RoomSelectionStrategy strategy;\n    private final Map<Room, List<Booking>> bookings = new HashMap<>();\n    private int seq = 1;\n\n    InMemoryScheduler(List<Room> rooms, RoomSelectionStrategy strategy) {\n        this.rooms = List.copyOf(rooms); this.strategy = strategy;\n        for (Room r : rooms) bookings.put(r, new ArrayList<>());\n    }\n\n    public synchronized Optional<Booking> book(int people, LocalTime start, LocalTime end) {\n        if (!start.isBefore(end)) throw new IllegalArgumentException(\"start must be before end\");\n        List<Room> free = new ArrayList<>();\n        for (Room r : rooms)\n            if (bookings.get(r).stream().noneMatch(b -> b.overlaps(start, end))) free.add(r);\n        return strategy.choose(free, people).map(room -> {\n            Booking b = new Booking(\"B\" + seq++, room, start, end, people);\n            bookings.get(room).add(b);\n            return b;\n        });\n    }\n\n    public synchronized boolean cancel(String id) {\n        for (List<Booking> list : bookings.values()) if (list.removeIf(b -> b.id().equals(id))) return true;\n        return false;\n    }\n\n    public synchronized List<Booking> bookingsFor(Room room) { return List.copyOf(bookings.get(room)); }\n}\n\npublic class SchedulerDemo {\n    public static void main(String[] args) {\n        Room small = new Room(\"Huddle\", 4), big = new Room(\"Board\", 12);\n        MeetingScheduler s = new InMemoryScheduler(List.of(big, small), new SmallestFitStrategy());\n        System.out.println(s.book(3, LocalTime.of(10, 0), LocalTime.of(11, 0)).map(b -> b.room().name()).orElse(\"none\")); // Huddle\n        System.out.println(s.book(3, LocalTime.of(10, 30), LocalTime.of(11, 0)).map(b -> b.room().name()).orElse(\"none\")); // Board\n        System.out.println(s.book(3, LocalTime.of(10, 30), LocalTime.of(11, 0)).map(b -> b.room().name()).orElse(\"none\")); // none\n    }\n}",
    t2_god: "// ANTI-EXAMPLE: the \"God class\". Every requirement landed in the same file.\n// Read the comments marked SMELL: each one is a point an interviewer deducts.\npublic class ParkingLotGod {\n    // SMELL 1: parallel arrays instead of a ParkingSpot object\n    static String[] size = {\"S\", \"M\", \"M\", \"L\", \"L\"};\n    static String[] who = new String[5];\n    static long[] since = new long[5];\n    // SMELL 2: money and payment state live next to spot state\n    static long cashInDrawer = 0;\n    static int ticketCounter = 0;\n\n    public static void main(String[] args) {\n        handle(\"IN CAR KA-01 9\");\n        handle(\"IN TRUCK KA-77 9\");\n        handle(\"OUT 1 12 CASH\");\n        handle(\"SHOW\");\n    }\n\n    // SMELL 3: one method parses input, applies rules, prices, takes payment and prints\n    static void handle(String cmd) {\n        String[] p = cmd.split(\" \");\n        if (p[0].equals(\"IN\")) {\n            for (int i = 0; i < size.length; i++) {\n                // SMELL 4: fit rules hard-coded as string comparisons, duplicated elsewhere\n                boolean fits = p[1].equals(\"BIKE\") || (p[1].equals(\"CAR\") && !size[i].equals(\"S\")) || (p[1].equals(\"TRUCK\") && size[i].equals(\"L\"));\n                if (who[i] == null && fits) {\n                    who[i] = p[2] + \"/\" + p[1];             // SMELL 5: type smuggled inside a string\n                    since[i] = Long.parseLong(p[3]);\n                    ticketCounter++;\n                    System.out.println(\"Ticket \" + ticketCounter + \" spot \" + i);\n                    return;\n                }\n            }\n            System.out.println(\"FULL\");\n        } else if (p[0].equals(\"OUT\")) {\n            int spot = Integer.parseInt(p[1]);\n            String type = who[spot].split(\"/\")[1];\n            long hrs = Math.max(1, Long.parseLong(p[2]) - since[spot]);\n            long fee = type.equals(\"BIKE\") ? hrs * 10 : type.equals(\"CAR\") ? hrs * 20 : hrs * 50;   // SMELL 6: pricing inline\n            if (p[3].equals(\"CASH\")) cashInDrawer += fee;                                          // SMELL 7: payment inline\n            else System.out.println(\"Calling card gateway...\");\n            who[spot] = null;\n            System.out.println(\"Paid \" + fee);\n        } else if (p[0].equals(\"SHOW\")) {\n            int free = 0;\n            for (String w : who) if (w == null) free++;\n            System.out.println(\"Free spots: \" + free + \", cash: \" + cashInDrawer);   // SMELL 8: UI inside domain\n        }\n    }\n}",
    t4_flow: "import java.time.Duration;\nimport java.time.Instant;\n\n// Focus: the TICKET LIFECYCLE across entry -> payment -> exit, with events for display boards.\n\nenum TicketStatus { ACTIVE, PAID, EXITED }        // a tiny state machine\nenum PaymentMode { CASH, CARD, UPI }\n\n/** Strategy for HOW money is collected. A real one would call a gateway; here they just succeed. */\ninterface PaymentProcessor { boolean charge(String ticketId, long amount); }\nclass CashProcessor implements PaymentProcessor { public boolean charge(String id, long amt) { return true; } }\nclass UpiProcessor implements PaymentProcessor { public boolean charge(String id, long amt) { return amt > 0; } }\n\n/** Observer for screens at the entrance and on each floor. */\ninterface ParkingListener { void spotTaken(String spotId); void spotFreed(String spotId); }\n\nclass FlowTicket {\n    final String id, spotId; final Instant entry; TicketStatus status = TicketStatus.ACTIVE; long paid;\n    FlowTicket(String id, String spotId, Instant entry) { this.id = id; this.spotId = spotId; this.entry = entry; }\n\n    /** Only legal transitions are allowed; anything else is a bug or fraud. */\n    void moveTo(TicketStatus next) {\n        boolean ok = (status == TicketStatus.ACTIVE && next == TicketStatus.PAID)\n                  || (status == TicketStatus.PAID && next == TicketStatus.EXITED);\n        if (!ok) throw new IllegalStateException(\"Ticket \" + id + \": \" + status + \" -> \" + next + \" not allowed\");\n        status = next;\n    }\n}\n\nclass ParkingFlow {\n    private final Deque<String> freeSpots;\n    private final Map<String, FlowTicket> tickets = new HashMap<>();\n    private final Map<PaymentMode, PaymentProcessor> processors = new EnumMap<>(PaymentMode.class);\n    private final List<ParkingListener> listeners = new ArrayList<>();\n    private final long ratePerHour;\n    private int seq = 1;\n\n    ParkingFlow(List<String> spots, long ratePerHour) {\n        this.freeSpots = new ArrayDeque<>(spots); this.ratePerHour = ratePerHour;\n        processors.put(PaymentMode.CASH, new CashProcessor());\n        processors.put(PaymentMode.UPI, new UpiProcessor());\n    }\n\n    void addListener(ParkingListener l) { listeners.add(l); }\n\n    /** ENTRY GATE: take nearest spot, issue ticket, tell the screens. */\n    synchronized FlowTicket enter(Instant now) {\n        String spot = freeSpots.pollFirst();\n        if (spot == null) throw new IllegalStateException(\"Lot full\");\n        FlowTicket t = new FlowTicket(\"T\" + seq++, spot, now);\n        tickets.put(t.id, t);\n        listeners.forEach(l -> l.spotTaken(spot));\n        return t;\n    }\n\n    /** PAY STATION: price the stay and collect money. Spot is NOT freed yet (car still inside). */\n    synchronized long pay(String ticketId, Instant now, PaymentMode mode) {\n        FlowTicket t = find(ticketId);\n        long hours = Math.max(1, (Duration.between(t.entry, now).toMinutes() + 59) / 60);\n        long amount = hours * ratePerHour;\n        PaymentProcessor p = processors.get(mode);\n        if (p == null) throw new UnsupportedOperationException(mode + \" not accepted here\");\n        if (!p.charge(t.id, amount)) throw new IllegalStateException(\"Payment declined\");\n        t.moveTo(TicketStatus.PAID);\n        t.paid = amount;\n        return amount;\n    }\n\n    /** EXIT GATE: barrier opens only for PAID tickets; then the spot is released. */\n    synchronized void exit(String ticketId) {\n        FlowTicket t = find(ticketId);\n        t.moveTo(TicketStatus.EXITED);              // throws if not paid\n        freeSpots.addFirst(t.spotId);               // nearest-first reuse\n        listeners.forEach(l -> l.spotFreed(t.spotId));\n    }\n\n    private FlowTicket find(String id) {\n        FlowTicket t = tickets.get(id);\n        if (t == null) throw new NoSuchElementException(\"No ticket \" + id);\n        return t;\n    }\n}\n\npublic class FlowDemo {\n    public static void main(String[] args) {\n        ParkingFlow lot = new ParkingFlow(List.of(\"A1\", \"A2\"), 40);\n        lot.addListener(new ParkingListener() {\n            public void spotTaken(String s) { System.out.println(\"[screen] \" + s + \" taken\"); }\n            public void spotFreed(String s) { System.out.println(\"[screen] \" + s + \" free\"); }\n        });\n        Instant nine = Instant.parse(\"2026-01-01T09:00:00Z\");\n        FlowTicket t = lot.enter(nine);                                            // [screen] A1 taken\n        try { lot.exit(t.id); } catch (IllegalStateException e) { System.out.println(e.getMessage()); } // not paid yet\n        System.out.println(\"Paid \" + lot.pay(t.id, nine.plusSeconds(95 * 60), PaymentMode.UPI)); // 2 hours -> 80\n        lot.exit(t.id);                                                            // [screen] A1 free\n    }\n}",
    t6_extend: "// Extension points in one place. Each follow-up question from the interviewer maps to\n// ONE new class plugged into an existing interface; the Game class itself never changes.\n\ninterface Player { char symbol(); int[] next(char[][] board); }                  // follow-up: \"add a bot\"\ninterface WinRule { boolean wins(char[][] b, int r, int c); }                     // follow-up: \"K in a row\"\ninterface GameListener { void moved(char who, int r, int c); void ended(String result); }  // \"add a scoreboard\"\n\nclass ScriptedPlayer implements Player {\n    private final char sym; private final Deque<int[]> script;\n    ScriptedPlayer(char sym, int[]... moves) { this.sym = sym; script = new ArrayDeque<>(List.of(moves)); }\n    public char symbol() { return sym; }\n    public int[] next(char[][] b) { return script.poll(); }\n}\n\n/** Follow-up answer #1: a bot is just another Player. Seeded Random => reproducible tests. */\nclass RandomBot implements Player {\n    private final char sym; private final Random rnd;\n    RandomBot(char sym, long seed) { this.sym = sym; rnd = new Random(seed); }\n    public char symbol() { return sym; }\n    public int[] next(char[][] b) {\n        List<int[]> free = new ArrayList<>();\n        for (int r = 0; r < b.length; r++) for (int c = 0; c < b.length; c++) if (b[r][c] == '.') free.add(new int[]{r, c});\n        return free.get(rnd.nextInt(free.size()));\n    }\n}\n\n/** Follow-up answer #2: \"K in a row\" on a bigger board. Checks only lines through the last move. */\nclass KInARow implements WinRule {\n    private final int k;\n    KInARow(int k) { this.k = k; }\n    public boolean wins(char[][] b, int r, int c) {\n        int[][] dirs = {{0, 1}, {1, 0}, {1, 1}, {1, -1}};\n        for (int[] d : dirs) {\n            int count = 1;\n            for (int s = -1; s <= 1; s += 2)\n                for (int rr = r + s * d[0], cc = c + s * d[1];\n                     rr >= 0 && rr < b.length && cc >= 0 && cc < b.length && b[rr][cc] == b[r][c];\n                     rr += s * d[0], cc += s * d[1]) count++;\n            if (count >= k) return true;\n        }\n        return false;\n    }\n}\n\n/** Builder: many optional knobs without a 7-argument constructor. */\nclass Game {\n    private final char[][] board; private final List<Player> players; private final WinRule rule;\n    private final List<GameListener> listeners;\n\n    private Game(Builder b) {\n        board = new char[b.size][b.size];\n        for (char[] row : board) Arrays.fill(row, '.');\n        players = List.copyOf(b.players); rule = b.rule == null ? new KInARow(b.size) : b.rule;\n        listeners = List.copyOf(b.listeners);\n    }\n\n    static Builder builder() { return new Builder(); }\n\n    static class Builder {\n        private int size = 3; private final List<Player> players = new ArrayList<>();\n        private WinRule rule; private final List<GameListener> listeners = new ArrayList<>();\n        Builder size(int n) { size = n; return this; }\n        Builder player(Player p) { players.add(p); return this; }\n        Builder rule(WinRule r) { rule = r; return this; }\n        Builder listener(GameListener l) { listeners.add(l); return this; }\n        Game build() {\n            if (players.size() < 2) throw new IllegalStateException(\"need 2+ players\");\n            return new Game(this);\n        }\n    }\n\n    String play() {\n        int cells = board.length * board.length;\n        for (int moves = 0, turn = 0; moves < cells; moves++, turn = (turn + 1) % players.size()) {\n            Player p = players.get(turn);\n            int[] m = p.next(board);\n            if (m == null || board[m[0]][m[1]] != '.') throw new IllegalStateException(p.symbol() + \" made an illegal move\");\n            board[m[0]][m[1]] = p.symbol();\n            for (GameListener l : listeners) l.moved(p.symbol(), m[0], m[1]);\n            if (rule.wins(board, m[0], m[1])) { String res = p.symbol() + \" wins\"; listeners.forEach(l -> l.ended(res)); return res; }\n        }\n        listeners.forEach(l -> l.ended(\"draw\"));\n        return \"draw\";\n    }\n}\n\n/** Follow-up answer #3: a scoreboard that just listens. */\nclass Scoreboard implements GameListener {\n    final Map<String, Integer> results = new TreeMap<>();\n    public void moved(char who, int r, int c) { }\n    public void ended(String result) { results.merge(result, 1, Integer::sum); }\n}\n\npublic class ExtendDemo {\n    public static void main(String[] args) {\n        Scoreboard score = new Scoreboard();\n        String r1 = Game.builder().size(4).rule(new KInARow(3))\n                .player(new ScriptedPlayer('X', new int[]{0, 0}, new int[]{1, 1}, new int[]{2, 2}))\n                .player(new ScriptedPlayer('O', new int[]{0, 3}, new int[]{1, 3}))\n                .listener(score).build().play();\n        System.out.println(r1);                                   // X wins (3 in a row on 4x4)\n        for (int i = 0; i < 20; i++)\n            Game.builder().player(new RandomBot('X', i)).player(new RandomBot('O', 100 + i)).listener(score).build().play();\n        int total = score.results.values().stream().mapToInt(Integer::intValue).sum();\n        System.out.println(\"games recorded: \" + total);           // 21\n        try { Game.builder().player(new ScriptedPlayer('X')).build(); }\n        catch (IllegalStateException e) { System.out.println(e.getMessage()); }   // need 2+ players\n        try { Game.builder().player(new ScriptedPlayer('X', new int[]{0, 0})).player(new ScriptedPlayer('O')).build().play(); }\n        catch (IllegalStateException e) { System.out.println(e.getMessage()); }   // O has no move to make\n    }\n}"
  };

  /* ---------- Python, TypeScript and C++ versions of the Java sources above (each one run and compared with the Java output) ---------- */
  var ALT = {
    g1_sol: [
      { lang: 'python', code: `from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Callable


# ---- Entities: nouns from the requirements ----
@dataclass(frozen=True)
class Book:
    isbn: str
    title: str


class Member:
    def __init__(self, member_id: str, name: str) -> None:
        self.id = member_id
        self.name = name
        self.active_loans: list["Loan"] = []


@dataclass(frozen=True)
class Loan:
    """A Loan is the "ticket" of a library: it links a member, a book and dates."""
    member: Member
    book: Book
    due: date

    def is_overdue(self, today: date) -> bool:
        return today > self.due


# ---- The rule that will change sits behind an interface ----
class LendingPolicy(ABC):
    @abstractmethod
    def max_books(self, member: Member) -> int: ...

    @abstractmethod
    def loan_days(self, member: Member) -> int: ...


class StandardPolicy(LendingPolicy):
    def max_books(self, member: Member) -> int:
        return 3

    def loan_days(self, member: Member) -> int:
        return 14


class PremiumPolicy(LendingPolicy):
    """Next quarter's change is one new class, not an edit to Library."""

    def max_books(self, member: Member) -> int:
        return 10

    def loan_days(self, member: Member) -> int:
        return 30


# ---- Facade with the public APIs we agreed on in step 3 ----
class Library:
    def __init__(self, policy: LendingPolicy) -> None:
        self._catalog: dict[str, Book] = {}
        self._loan_by_isbn: dict[str, Loan] = {}
        self._policy = policy

    def add_book(self, book: Book) -> None:
        self._catalog[book.isbn] = book

    def borrow(self, member: Member, isbn: str, today: date) -> Loan:
        book = self._catalog.get(isbn)
        if book is None:
            raise LookupError(f"No book {isbn}")
        if isbn in self._loan_by_isbn:
            raise RuntimeError(f"{book.title} is already lent out")
        limit = self._policy.max_books(member)
        if len(member.active_loans) >= limit:
            raise RuntimeError(f"{member.name} reached the limit of {limit}")
        loan = Loan(member, book, today + timedelta(days=self._policy.loan_days(member)))
        self._loan_by_isbn[isbn] = loan
        member.active_loans.append(loan)
        return loan

    def give_back(self, member: Member, isbn: str) -> None:
        loan = self._loan_by_isbn.get(isbn)
        if loan is None or loan.member is not member:
            raise RuntimeError(f"This member does not hold {isbn}")
        del self._loan_by_isbn[isbn]
        member.active_loans.remove(loan)

    def overdue(self, today: date) -> list[Loan]:
        return [loan for loan in self._loan_by_isbn.values() if loan.is_overdue(today)]


def attempt(action: Callable[[], object]) -> None:  # shows the failure paths
    try:
        action()
    except (LookupError, RuntimeError) as e:
        print(e.args[0])


def main() -> None:
    lib = Library(StandardPolicy())
    lib.add_book(Book("111", "Clean Code"))
    lib.add_book(Book("222", "Refactoring"))
    lib.add_book(Book("333", "Effective Java"))
    lib.add_book(Book("444", "Domain-Driven Design"))
    asha = Member("M1", "Asha")
    ravi = Member("M2", "Ravi")
    day1 = date(2026, 1, 1)
    loan = lib.borrow(asha, "111", day1)
    print("Due", loan.due.isoformat())  # 2026-01-15
    print("Overdue on Jan 20:", len(lib.overdue(day1 + timedelta(days=19))))  # 1
    attempt(lambda: lib.borrow(ravi, "111", day1))  # already lent out
    attempt(lambda: lib.borrow(ravi, "999", day1))  # unknown ISBN
    lib.give_back(asha, "111")
    print("Overdue after return:", len(lib.overdue(day1 + timedelta(days=19))))  # 0
    for isbn in ("111", "222", "333"):
        lib.borrow(asha, isbn, day1)
    print(f"{asha.name} holds {len(asha.active_loans)} books")
    attempt(lambda: lib.borrow(asha, "444", day1))  # limit of 3
    attempt(lambda: lib.give_back(ravi, "111"))  # Ravi never had it
    vip = Library(PremiumPolicy())
    vip.add_book(Book("111", "Clean Code"))
    print("Premium due", vip.borrow(ravi, "111", day1).due.isoformat())  # 2026-01-31


if __name__ == "__main__":
    main()` },
      { lang: 'ts', code: `// ---- Entities: nouns from the requirements ----
interface Book {
  readonly isbn: string;
  readonly title: string;
}

class Member {
  readonly activeLoans: Loan[] = [];
  constructor(readonly id: string, readonly name: string) {}
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** A Loan is the "ticket" of a library: it links a member, a book and dates. */
class Loan {
  constructor(readonly member: Member, readonly book: Book, readonly due: Date) {}
  isOverdue(today: Date): boolean {
    return today.getTime() > this.due.getTime();
  }
}

// ---- The rule that will change sits behind an interface ----
interface LendingPolicy {
  maxBooks(m: Member): number;
  loanDays(m: Member): number;
}

class StandardPolicy implements LendingPolicy {
  maxBooks(_m: Member): number { return 3; }
  loanDays(_m: Member): number { return 14; }
}

/** Next quarter's change is one new class, not an edit to Library. */
class PremiumPolicy implements LendingPolicy {
  maxBooks(_m: Member): number { return 10; }
  loanDays(_m: Member): number { return 30; }
}

function plusDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY_MS);
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ---- Facade with the public APIs we agreed on in step 3 ----
class Library {
  private readonly catalog = new Map<string, Book>();
  private readonly loanByIsbn = new Map<string, Loan>();

  constructor(private readonly policy: LendingPolicy) {}

  addBook(b: Book): void {
    this.catalog.set(b.isbn, b);
  }

  borrow(m: Member, isbn: string, today: Date): Loan {
    const b = this.catalog.get(isbn);
    if (b === undefined) throw new Error(\`No book \${isbn}\`);
    if (this.loanByIsbn.has(isbn)) throw new Error(\`\${b.title} is already lent out\`);
    const limit = this.policy.maxBooks(m);
    if (m.activeLoans.length >= limit) throw new Error(\`\${m.name} reached the limit of \${limit}\`);
    const loan = new Loan(m, b, plusDays(today, this.policy.loanDays(m)));
    this.loanByIsbn.set(isbn, loan);
    m.activeLoans.push(loan);
    return loan;
  }

  giveBack(m: Member, isbn: string): void {
    const loan = this.loanByIsbn.get(isbn);
    if (loan === undefined || loan.member !== m) throw new Error(\`This member does not hold \${isbn}\`);
    this.loanByIsbn.delete(isbn);
    m.activeLoans.splice(m.activeLoans.indexOf(loan), 1);
  }

  overdue(today: Date): Loan[] {
    return [...this.loanByIsbn.values()].filter((l) => l.isOverdue(today));
  }
}

function attempt(action: () => unknown): void { // shows the failure paths
  try {
    action();
  } catch (e) {
    console.log((e as Error).message);
  }
}

const lib = new Library(new StandardPolicy());
lib.addBook({ isbn: "111", title: "Clean Code" });
lib.addBook({ isbn: "222", title: "Refactoring" });
lib.addBook({ isbn: "333", title: "Effective Java" });
lib.addBook({ isbn: "444", title: "Domain-Driven Design" });
const asha = new Member("M1", "Asha");
const ravi = new Member("M2", "Ravi");
const day1 = new Date(Date.UTC(2026, 0, 1));
const loan = lib.borrow(asha, "111", day1);
console.log("Due " + iso(loan.due)); // 2026-01-15
console.log("Overdue on Jan 20: " + lib.overdue(plusDays(day1, 19)).length); // 1
attempt(() => lib.borrow(ravi, "111", day1)); // already lent out
attempt(() => lib.borrow(ravi, "999", day1)); // unknown ISBN
lib.giveBack(asha, "111");
console.log("Overdue after return: " + lib.overdue(plusDays(day1, 19)).length); // 0
for (const isbn of ["111", "222", "333"]) lib.borrow(asha, isbn, day1);
console.log(\`\${asha.name} holds \${asha.activeLoans.length} books\`);
attempt(() => lib.borrow(asha, "444", day1)); // limit of 3
attempt(() => lib.giveBack(ravi, "111")); // Ravi never had it
const vip = new Library(new PremiumPolicy());
vip.addBook({ isbn: "111", title: "Clean Code" });
console.log("Premium due " + iso(vip.borrow(ravi, "111", day1).due)); // 2026-01-31` },
      { lang: 'cpp', code: `// ---- Entities: nouns from the requirements ----
struct Book {
    string isbn, title;
};

using Day = chrono::sys_days;

string iso(Day d) {
    chrono::year_month_day ymd{d};
    char buf[16];
    snprintf(buf, sizeof buf, "%04d-%02u-%02u", int(ymd.year()), unsigned(ymd.month()), unsigned(ymd.day()));
    return buf;
}

class Loan;

class Member {
public:
    Member(string id, string name) : id_(move(id)), name_(move(name)) {}
    const string& name() const { return name_; }
    vector<const Loan*>& activeLoans() { return activeLoans_; }

private:
    string id_, name_;
    vector<const Loan*> activeLoans_;  // non-owning: Library owns the loans
};

/** A Loan is the "ticket" of a library: it links a member, a book and dates. */
class Loan {
public:
    Loan(Member& m, const Book& b, Day due) : member_(&m), book_(&b), due_(due) {}
    Member* member() const { return member_; }
    const Book& book() const { return *book_; }
    Day due() const { return due_; }
    bool isOverdue(Day today) const { return today > due_; }

private:
    Member* member_;
    const Book* book_;
    Day due_;
};

// ---- The rule that will change sits behind an interface ----
class LendingPolicy {
public:
    virtual ~LendingPolicy() = default;
    virtual int maxBooks(const Member& m) const = 0;
    virtual int loanDays(const Member& m) const = 0;
};

class StandardPolicy : public LendingPolicy {
public:
    int maxBooks(const Member&) const override { return 3; }
    int loanDays(const Member&) const override { return 14; }
};

/** Next quarter's change is one new class, not an edit to Library. */
class PremiumPolicy : public LendingPolicy {
public:
    int maxBooks(const Member&) const override { return 10; }
    int loanDays(const Member&) const override { return 30; }
};

// ---- Facade with the public APIs we agreed on in step 3 ----
class Library {
public:
    explicit Library(const LendingPolicy& policy) : policy_(policy) {}

    void addBook(Book b) { catalog_[b.isbn] = move(b); }

    const Loan& borrow(Member& m, const string& isbn, Day today) {
        auto it = catalog_.find(isbn);
        if (it == catalog_.end()) throw out_of_range("No book " + isbn);
        if (loanByIsbn_.count(isbn)) throw runtime_error(it->second.title + " is already lent out");
        int limit = policy_.maxBooks(m);
        if (int(m.activeLoans().size()) >= limit)
            throw runtime_error(m.name() + " reached the limit of " + to_string(limit));
        auto loan = make_unique<Loan>(m, it->second, today + chrono::days(policy_.loanDays(m)));
        const Loan& ref = *loan;
        m.activeLoans().push_back(&ref);
        loanByIsbn_[isbn] = move(loan);
        return ref;
    }

    void giveBack(Member& m, const string& isbn) {
        auto it = loanByIsbn_.find(isbn);
        if (it == loanByIsbn_.end() || it->second->member() != &m)
            throw runtime_error("This member does not hold " + isbn);
        auto& mine = m.activeLoans();
        mine.erase(find(mine.begin(), mine.end(), it->second.get()));
        loanByIsbn_.erase(it);
    }

    vector<const Loan*> overdue(Day today) const {
        vector<const Loan*> out;
        for (const auto& [isbn, loan] : loanByIsbn_)
            if (loan->isOverdue(today)) out.push_back(loan.get());
        return out;
    }

private:
    map<string, Book> catalog_;
    map<string, unique_ptr<Loan>> loanByIsbn_;
    const LendingPolicy& policy_;
};

void attempt(const function<void()>& action) {  // shows the failure paths
    try {
        action();
    } catch (const exception& e) {
        cout << e.what() << "\\n";
    }
}

int main() {
    StandardPolicy standard;
    Library lib(standard);
    lib.addBook({"111", "Clean Code"});
    lib.addBook({"222", "Refactoring"});
    lib.addBook({"333", "Effective Java"});
    lib.addBook({"444", "Domain-Driven Design"});
    Member asha("M1", "Asha"), ravi("M2", "Ravi");
    Day day1 = chrono::year{2026} / 1 / 1;
    const Loan& loan = lib.borrow(asha, "111", day1);
    cout << "Due " << iso(loan.due()) << "\\n";                                        // 2026-01-15
    cout << "Overdue on Jan 20: " << lib.overdue(day1 + chrono::days(19)).size() << "\\n";  // 1
    attempt([&] { lib.borrow(ravi, "111", day1); });  // already lent out
    attempt([&] { lib.borrow(ravi, "999", day1); });  // unknown ISBN
    lib.giveBack(asha, "111");
    cout << "Overdue after return: " << lib.overdue(day1 + chrono::days(19)).size() << "\\n";  // 0
    for (const char* isbn : {"111", "222", "333"}) lib.borrow(asha, isbn, day1);
    cout << asha.name() << " holds " << asha.activeLoans().size() << " books\\n";
    attempt([&] { lib.borrow(asha, "444", day1); });  // limit of 3
    attempt([&] { lib.giveBack(ravi, "111"); });      // Ravi never had it
    PremiumPolicy premium;
    Library vip(premium);
    vip.addBook({"111", "Clean Code"});
    cout << "Premium due " << iso(vip.borrow(ravi, "111", day1).due()) << "\\n";  // 2026-01-31
}` }
    ],
    g2_sol: [
      { lang: 'python', code: `import threading
from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum


# The same behaviour, split by responsibility. Each class has one reason to change.
class SpotSize(Enum):
    S = "S"
    M = "M"
    L = "L"


class VType(Enum):
    # (rupees per hour, spot sizes that fit, smallest first): data, not if-else
    BIKE = (10, (SpotSize.S, SpotSize.M, SpotSize.L))
    CAR = (20, (SpotSize.M, SpotSize.L))
    TRUCK = (50, (SpotSize.L,))

    @property
    def rate(self) -> int:
        return self.value[0]

    @property
    def fits(self) -> tuple[SpotSize, ...]:
        return self.value[1]


class Spot:
    def __init__(self, spot_id: int, size: SpotSize) -> None:
        self.id = spot_id
        self.size = size
        self.plate: str | None = None

    def free(self) -> bool:
        return self.plate is None


@dataclass(frozen=True)
class Ticket:
    id: int
    plate: str
    type: VType
    spot: Spot
    entry_hour: int


class Allocator(ABC):
    @abstractmethod
    def pick(self, spots: list[Spot], t: VType) -> Spot | None: ...


class Pricer(ABC):
    @abstractmethod
    def fee(self, t: Ticket, exit_hour: int) -> int: ...


class FirstFit(Allocator):
    def pick(self, spots: list[Spot], t: VType) -> Spot | None:
        for want in t.fits:
            for s in spots:
                if s.free() and s.size is want:
                    return s
        return None


class PerHour(Pricer):
    def fee(self, t: Ticket, exit_hour: int) -> int:
        return max(1, exit_hour - t.entry_hour) * t.type.rate


class Lot:
    def __init__(self, spots: list[Spot], alloc: Allocator, pricer: Pricer) -> None:
        self._spots = spots
        self._alloc = alloc
        self._pricer = pricer
        self._open: dict[int, Ticket] = {}
        self._next_id = 1
        self._lock = threading.Lock()

    def park(self, plate: str, vtype: VType, hour: int) -> Ticket:
        with self._lock:
            spot = self._alloc.pick(self._spots, vtype)
            if spot is None:
                raise RuntimeError(f"Full for {vtype.name}")
            spot.plate = plate
            ticket = Ticket(self._next_id, plate, vtype, spot, hour)
            self._next_id += 1
            self._open[ticket.id] = ticket
            return ticket

    def leave(self, ticket_id: int, hour: int) -> int:
        with self._lock:
            ticket = self._open.pop(ticket_id, None)
            if ticket is None:
                raise ValueError(f"Bad ticket {ticket_id}")
            ticket.spot.plate = None
            return self._pricer.fee(ticket, hour)


class WeekendPricing(Pricer):
    """Weekend pricing is one more Pricer wrapped around the normal one. Lot is untouched."""

    def __init__(self, inner: Pricer) -> None:
        self._inner = inner

    def fee(self, t: Ticket, exit_hour: int) -> int:
        return self._inner.fee(t, exit_hour) * 3 // 2  # 1.5x


def layout() -> list[Spot]:
    return [Spot(0, SpotSize.S), Spot(1, SpotSize.M), Spot(2, SpotSize.M), Spot(3, SpotSize.L)]


def main() -> None:
    lot = Lot(layout(), FirstFit(), PerHour())
    t = lot.park("KA-01", VType.CAR, 9)
    print(f"Car at spot {t.spot.id}, pays {lot.leave(t.id, 12)}")  # spot 1, pays 60
    bike = lot.park("KA-02", VType.BIKE, 10)
    print(f"Bike at spot {bike.spot.id}")  # smallest fitting spot: 0
    truck = lot.park("KA-03", VType.TRUCK, 10)
    print(f"Truck at spot {truck.spot.id}")  # only LARGE fits: 3
    try:
        lot.park("KA-04", VType.TRUCK, 10)
    except RuntimeError as e:
        print(e)
    try:
        lot.leave(99, 11)
    except ValueError as e:
        print(e)
    print(f"Bike pays {lot.leave(bike.id, 10)}")  # same hour still bills 1 hour: 10
    weekend = Lot(layout(), FirstFit(), WeekendPricing(PerHour()))
    w = weekend.park("KA-05", VType.CAR, 9)
    print(f"Weekend car pays {weekend.leave(w.id, 12)}")  # 60 * 1.5 = 90


if __name__ == "__main__":
    main()` },
      { lang: 'ts', code: `// The same behaviour, split by responsibility. Each class has one reason to change.
type SpotSize = "S" | "M" | "L";

interface VehicleKind {
  readonly name: string;
  readonly rate: number; // rupees per hour (data, not if-else)
  readonly fits: readonly SpotSize[]; // smallest first
}

const VType = {
  BIKE: { name: "BIKE", rate: 10, fits: ["S", "M", "L"] },
  CAR: { name: "CAR", rate: 20, fits: ["M", "L"] },
  TRUCK: { name: "TRUCK", rate: 50, fits: ["L"] },
} as const satisfies Record<string, VehicleKind>;

class Spot {
  plate: string | null = null;
  constructor(readonly id: number, readonly size: SpotSize) {}
  free(): boolean {
    return this.plate === null;
  }
}

interface Ticket {
  readonly id: number;
  readonly plate: string;
  readonly type: VehicleKind;
  readonly spot: Spot;
  readonly entryHour: number;
}

interface Allocator {
  pick(spots: Spot[], t: VehicleKind): Spot | undefined;
}

interface Pricer {
  fee(t: Ticket, exitHour: number): number;
}

class FirstFit implements Allocator {
  pick(spots: Spot[], t: VehicleKind): Spot | undefined {
    for (const want of t.fits) {
      const hit = spots.find((s) => s.free() && s.size === want);
      if (hit) return hit;
    }
    return undefined;
  }
}

class PerHour implements Pricer {
  fee(t: Ticket, exitHour: number): number {
    return Math.max(1, exitHour - t.entryHour) * t.type.rate;
  }
}

class Lot {
  private readonly open = new Map<number, Ticket>();
  private nextId = 1;

  constructor(private readonly spots: Spot[], private readonly alloc: Allocator, private readonly pricer: Pricer) {}

  park(plate: string, type: VehicleKind, hour: number): Ticket {
    const spot = this.alloc.pick(this.spots, type);
    if (!spot) throw new Error(\`Full for \${type.name}\`);
    spot.plate = plate;
    const t: Ticket = { id: this.nextId++, plate, type, spot, entryHour: hour };
    this.open.set(t.id, t);
    return t;
  }

  leave(ticketId: number, hour: number): number {
    const t = this.open.get(ticketId);
    if (!t) throw new Error(\`Bad ticket \${ticketId}\`);
    this.open.delete(ticketId);
    t.spot.plate = null;
    return this.pricer.fee(t, hour);
  }
}

/** Weekend pricing is one more Pricer wrapped around the normal one. Lot is untouched. */
class WeekendPricing implements Pricer {
  constructor(private readonly inner: Pricer) {}
  fee(t: Ticket, exitHour: number): number {
    return Math.floor((this.inner.fee(t, exitHour) * 3) / 2); // 1.5x
  }
}

function layout(): Spot[] {
  return [new Spot(0, "S"), new Spot(1, "M"), new Spot(2, "M"), new Spot(3, "L")];
}

function message(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

const lot = new Lot(layout(), new FirstFit(), new PerHour());
const t = lot.park("KA-01", VType.CAR, 9);
console.log(\`Car at spot \${t.spot.id}, pays \${lot.leave(t.id, 12)}\`); // spot 1, pays 60
const bike = lot.park("KA-02", VType.BIKE, 10);
console.log(\`Bike at spot \${bike.spot.id}\`); // smallest fitting spot: 0
const truck = lot.park("KA-03", VType.TRUCK, 10);
console.log(\`Truck at spot \${truck.spot.id}\`); // only LARGE fits: 3
try { lot.park("KA-04", VType.TRUCK, 10); } catch (e) { console.log(message(e)); }
try { lot.leave(99, 11); } catch (e) { console.log(message(e)); }
console.log(\`Bike pays \${lot.leave(bike.id, 10)}\`); // same hour still bills 1 hour: 10
const weekend = new Lot(layout(), new FirstFit(), new WeekendPricing(new PerHour()));
const w = weekend.park("KA-05", VType.CAR, 9);
console.log(\`Weekend car pays \${weekend.leave(w.id, 12)}\`); // 60 * 1.5 = 90` },
      { lang: 'cpp', code: `enum class SpotSize { S, M, L };

// Each vehicle type is data: hourly rate and the spot sizes that fit, smallest first.
struct VType {
    string name;
    long long rate;
    vector<SpotSize> fits;
    static const VType BIKE, CAR, TRUCK;
};
const VType VType::BIKE{"BIKE", 10, {SpotSize::S, SpotSize::M, SpotSize::L}};
const VType VType::CAR{"CAR", 20, {SpotSize::M, SpotSize::L}};
const VType VType::TRUCK{"TRUCK", 50, {SpotSize::L}};

struct Spot {
    int id;
    SpotSize size;
    optional<string> plate;
    bool free() const { return !plate.has_value(); }
};

struct Ticket {
    int id;
    string plate;
    const VType* type;
    Spot* spot;
    long long entryHour;
};

class Allocator {
public:
    virtual ~Allocator() = default;
    virtual Spot* pick(vector<Spot>& spots, const VType& t) const = 0;
};

class Pricer {
public:
    virtual ~Pricer() = default;
    virtual long long fee(const Ticket& t, long long exitHour) const = 0;
};

class FirstFit : public Allocator {
public:
    Spot* pick(vector<Spot>& spots, const VType& t) const override {
        for (SpotSize want : t.fits)
            for (Spot& s : spots)
                if (s.free() && s.size == want) return &s;
        return nullptr;
    }
};

class PerHour : public Pricer {
public:
    long long fee(const Ticket& t, long long exitHour) const override {
        return max(1LL, exitHour - t.entryHour) * t.type->rate;
    }
};

class Lot {
public:
    Lot(vector<Spot> spots, unique_ptr<Allocator> alloc, unique_ptr<Pricer> pricer)
        : spots_(move(spots)), alloc_(move(alloc)), pricer_(move(pricer)) {}

    Ticket park(const string& plate, const VType& type, long long hour) {
        lock_guard<mutex> guard(mu_);
        Spot* s = alloc_->pick(spots_, type);
        if (!s) throw runtime_error("Full for " + type.name);
        s->plate = plate;
        Ticket t{nextId_++, plate, &type, s, hour};
        open_[t.id] = t;
        return t;
    }

    long long leave(int ticketId, long long hour) {
        lock_guard<mutex> guard(mu_);
        auto it = open_.find(ticketId);
        if (it == open_.end()) throw invalid_argument("Bad ticket " + to_string(ticketId));
        Ticket t = it->second;
        open_.erase(it);
        t.spot->plate.reset();
        return pricer_->fee(t, hour);
    }

private:
    vector<Spot> spots_;  // never resized, so Ticket::spot pointers stay valid
    unique_ptr<Allocator> alloc_;
    unique_ptr<Pricer> pricer_;
    map<int, Ticket> open_;
    int nextId_ = 1;
    mutex mu_;
};

/** Weekend pricing is one more Pricer wrapped around the normal one. Lot is untouched. */
class WeekendPricing : public Pricer {
public:
    explicit WeekendPricing(unique_ptr<Pricer> inner) : inner_(move(inner)) {}
    long long fee(const Ticket& t, long long exitHour) const override { return inner_->fee(t, exitHour) * 3 / 2; }  // 1.5x

private:
    unique_ptr<Pricer> inner_;
};

vector<Spot> layout() {
    return {{0, SpotSize::S, nullopt}, {1, SpotSize::M, nullopt}, {2, SpotSize::M, nullopt}, {3, SpotSize::L, nullopt}};
}

int main() {
    Lot lot(layout(), make_unique<FirstFit>(), make_unique<PerHour>());
    Ticket t = lot.park("KA-01", VType::CAR, 9);
    cout << "Car at spot " << t.spot->id << ", pays " << lot.leave(t.id, 12) << "\\n";  // spot 1, pays 60
    Ticket bike = lot.park("KA-02", VType::BIKE, 10);
    cout << "Bike at spot " << bike.spot->id << "\\n";  // smallest fitting spot: 0
    Ticket truck = lot.park("KA-03", VType::TRUCK, 10);
    cout << "Truck at spot " << truck.spot->id << "\\n";  // only LARGE fits: 3
    try { lot.park("KA-04", VType::TRUCK, 10); } catch (const runtime_error& e) { cout << e.what() << "\\n"; }
    try { lot.leave(99, 11); } catch (const invalid_argument& e) { cout << e.what() << "\\n"; }
    cout << "Bike pays " << lot.leave(bike.id, 10) << "\\n";  // same hour still bills 1 hour: 10
    Lot weekend(layout(), make_unique<FirstFit>(), make_unique<WeekendPricing>(make_unique<PerHour>()));
    Ticket w = weekend.park("KA-05", VType::CAR, 9);
    cout << "Weekend car pays " << weekend.leave(w.id, 12) << "\\n";  // 60 * 1.5 = 90
}` }
    ],
    g3_sol: [
      { lang: 'python', code: `from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import IntEnum


class SpotType(IntEnum):
    SMALL = 0
    COMPACT = 1
    LARGE = 2


class VehicleType(IntEnum):
    BIKE = 0
    CAR = 1
    TRUCK = 2

    @property
    def fits(self) -> tuple[SpotType, ...]:  # the ONLY place fit rules live
        return _FITS[self]


_FITS = {
    VehicleType.BIKE: (SpotType.SMALL, SpotType.COMPACT, SpotType.LARGE),
    VehicleType.CAR: (SpotType.COMPACT, SpotType.LARGE),
    VehicleType.TRUCK: (SpotType.LARGE,),
}


@dataclass
class Spot:
    floor: int
    index: int
    type: SpotType
    taken: bool = False

    @property
    def id(self) -> str:
        return f"{self.floor}-{self.index}"


class SpotAllocationStrategy(ABC):
    @abstractmethod
    def find(self, floors: list[list[Spot]], v: VehicleType) -> Spot | None: ...


class NearestFirst(SpotAllocationStrategy):
    """Stay as low as possible (less driving); on a floor, use the smallest spot that fits."""

    def find(self, floors: list[list[Spot]], v: VehicleType) -> Spot | None:
        for floor in floors:
            for want in v.fits:
                for s in floor:
                    if not s.taken and s.type is want:
                        return s
        return None


class BestFitFirst(SpotAllocationStrategy):
    """Protect big spots: try the smallest fitting type on EVERY floor before using a bigger type."""

    def find(self, floors: list[list[Spot]], v: VehicleType) -> Spot | None:
        for want in v.fits:
            for floor in floors:
                for s in floor:
                    if not s.taken and s.type is want:
                        return s
        return None


def build(*floors: str) -> list[list[Spot]]:
    kinds = {"S": SpotType.SMALL, "M": SpotType.COMPACT, "L": SpotType.LARGE}
    return [[Spot(f, i, kinds[c]) for i, c in enumerate(row)] for f, row in enumerate(floors)]


def show(strategy: str, vehicle: str, spot: Spot | None) -> None:
    if spot is None:
        print(f"{strategy} has no spot for the {vehicle}")
    else:
        print(f"{strategy} puts the {vehicle} at {spot.id}")


def main() -> None:
    strategies: dict[str, SpotAllocationStrategy] = {"NearestFirst": NearestFirst(), "BestFitFirst": BestFitFirst()}
    for name, st in strategies.items():
        show(name, "car", st.find(build("SL", "SM"), VehicleType.CAR))  # floor 0 has no COMPACT, floor 1 does
        show(name, "bike", st.find(build("LM", "SL"), VehicleType.BIKE))  # floor 0 has no SMALL, floor 1 does
        show(name, "car", st.find(build("S"), VehicleType.CAR))  # nothing fits a car
    # NearestFirst: car 0-1 (LARGE on floor 0: less walking), bike 0-1 (COMPACT on floor 0)
    # BestFitFirst: car 1-1 (COMPACT on floor 1: keeps LARGE for trucks), bike 1-0 (the SMALL spot)


if __name__ == "__main__":
    main()` },
      { lang: 'ts', code: `enum SpotType { SMALL, COMPACT, LARGE }

enum VehicleType { BIKE, CAR, TRUCK }

// The ONLY place fit rules live.
const FITS: Record<VehicleType, readonly SpotType[]> = {
  [VehicleType.BIKE]: [SpotType.SMALL, SpotType.COMPACT, SpotType.LARGE],
  [VehicleType.CAR]: [SpotType.COMPACT, SpotType.LARGE],
  [VehicleType.TRUCK]: [SpotType.LARGE],
};

class Spot {
  taken = false;
  constructor(readonly floor: number, readonly index: number, readonly type: SpotType) {}
  id(): string {
    return \`\${this.floor}-\${this.index}\`;
  }
}

interface SpotAllocationStrategy {
  find(floors: Spot[][], v: VehicleType): Spot | undefined;
}

/** Stay as low as possible (less driving); on a floor, use the smallest spot that fits. */
class NearestFirst implements SpotAllocationStrategy {
  find(floors: Spot[][], v: VehicleType): Spot | undefined {
    for (const floor of floors)
      for (const want of FITS[v]) {
        const hit = floor.find((s) => !s.taken && s.type === want);
        if (hit) return hit;
      }
    return undefined;
  }
}

/** Protect big spots: try the smallest fitting type on EVERY floor before using a bigger type. */
class BestFitFirst implements SpotAllocationStrategy {
  find(floors: Spot[][], v: VehicleType): Spot | undefined {
    for (const want of FITS[v])
      for (const floor of floors) {
        const hit = floor.find((s) => !s.taken && s.type === want);
        if (hit) return hit;
      }
    return undefined;
  }
}

function build(...floors: string[]): Spot[][] {
  const kinds: Record<string, SpotType> = { S: SpotType.SMALL, M: SpotType.COMPACT, L: SpotType.LARGE };
  return floors.map((row, f) => [...row].map((c, i) => new Spot(f, i, kinds[c])));
}

function show(strategy: string, vehicle: string, spot: Spot | undefined): void {
  console.log(spot ? \`\${strategy} puts the \${vehicle} at \${spot.id()}\` : \`\${strategy} has no spot for the \${vehicle}\`);
}

const strategies = new Map<string, SpotAllocationStrategy>([
  ["NearestFirst", new NearestFirst()],
  ["BestFitFirst", new BestFitFirst()],
]);
for (const [name, st] of strategies) {
  show(name, "car", st.find(build("SL", "SM"), VehicleType.CAR)); // floor 0 has no COMPACT, floor 1 does
  show(name, "bike", st.find(build("LM", "SL"), VehicleType.BIKE)); // floor 0 has no SMALL, floor 1 does
  show(name, "car", st.find(build("S"), VehicleType.CAR)); // nothing fits a car
}
// NearestFirst: car 0-1 (LARGE on floor 0: less walking), bike 0-1 (COMPACT on floor 0)
// BestFitFirst: car 1-1 (COMPACT on floor 1: keeps LARGE for trucks), bike 1-0 (the SMALL spot)` },
      { lang: 'cpp', code: `enum class SpotType { Small, Compact, Large };
enum class VehicleType { Bike, Car, Truck };

// The ONLY place fit rules live.
const vector<SpotType>& fits(VehicleType v) {
    static const map<VehicleType, vector<SpotType>> table = {
        {VehicleType::Bike, {SpotType::Small, SpotType::Compact, SpotType::Large}},
        {VehicleType::Car, {SpotType::Compact, SpotType::Large}},
        {VehicleType::Truck, {SpotType::Large}},
    };
    return table.at(v);
}

struct Spot {
    int floor, index;
    SpotType type;
    bool taken = false;
    string id() const { return to_string(floor) + "-" + to_string(index); }
};

using Floors = vector<vector<Spot>>;

class SpotAllocationStrategy {
public:
    virtual ~SpotAllocationStrategy() = default;
    virtual const Spot* find(const Floors& floors, VehicleType v) const = 0;
};

/** Stay as low as possible (less driving); on a floor, use the smallest spot that fits. */
class NearestFirst : public SpotAllocationStrategy {
public:
    const Spot* find(const Floors& floors, VehicleType v) const override {
        for (const auto& floor : floors)
            for (SpotType want : fits(v))
                for (const Spot& s : floor)
                    if (!s.taken && s.type == want) return &s;
        return nullptr;
    }
};

/** Protect big spots: try the smallest fitting type on EVERY floor before using a bigger type. */
class BestFitFirst : public SpotAllocationStrategy {
public:
    const Spot* find(const Floors& floors, VehicleType v) const override {
        for (SpotType want : fits(v))
            for (const auto& floor : floors)
                for (const Spot& s : floor)
                    if (!s.taken && s.type == want) return &s;
        return nullptr;
    }
};

Floors build(const vector<string>& floors) {
    Floors out;
    for (int f = 0; f < int(floors.size()); f++) {
        vector<Spot> row;
        for (int i = 0; i < int(floors[f].size()); i++) {
            char c = floors[f][i];
            row.push_back({f, i, c == 'S' ? SpotType::Small : c == 'M' ? SpotType::Compact : SpotType::Large});
        }
        out.push_back(move(row));
    }
    return out;
}

void show(const string& strategy, const string& vehicle, const Spot* spot) {
    if (spot) cout << strategy << " puts the " << vehicle << " at " << spot->id() << "\\n";
    else cout << strategy << " has no spot for the " << vehicle << "\\n";
}

int main() {
    vector<pair<string, unique_ptr<SpotAllocationStrategy>>> strategies;
    strategies.emplace_back("NearestFirst", make_unique<NearestFirst>());
    strategies.emplace_back("BestFitFirst", make_unique<BestFitFirst>());
    for (const auto& [name, st] : strategies) {
        Floors a = build({"SL", "SM"}), b = build({"LM", "SL"}), c = build({"S"});
        show(name, "car", st->find(a, VehicleType::Car));    // floor 0 has no COMPACT, floor 1 does
        show(name, "bike", st->find(b, VehicleType::Bike));  // floor 0 has no SMALL, floor 1 does
        show(name, "car", st->find(c, VehicleType::Car));    // nothing fits a car
    }
    // NearestFirst: car 0-1 (LARGE on floor 0: less walking), bike 0-1 (COMPACT on floor 0)
    // BestFitFirst: car 1-1 (COMPACT on floor 1: keeps LARGE for trucks), bike 1-0 (the SMALL spot)
}` }
    ],
    g4_sol: [
      { lang: 'python', code: `from abc import ABC, abstractmethod
from datetime import timedelta
from enum import Enum


class PricingStrategy(ABC):
    """Every pricing rule is a PricingStrategy; rules are combined by wrapping (Decorator)."""

    @abstractmethod
    def fee(self, parked: timedelta) -> int: ...


class SlabPricing(PricingStrategy):
    """First block of time costs a flat amount, then a rate per started hour."""

    def __init__(self, first_hours: int, first_block: int, per_hour_after: int) -> None:
        self._first_hours = first_hours
        self._first_block = first_block
        self._per_hour_after = per_hour_after

    def fee(self, parked: timedelta) -> int:
        minutes = parked // timedelta(minutes=1)
        hours = max(1, (minutes + 59) // 60)  # started hours, at least 1
        if hours <= self._first_hours:
            return self._first_block
        return self._first_block + (hours - self._first_hours) * self._per_hour_after


class DailyCap(PricingStrategy):
    """Decorator: caps whatever the wrapped strategy charges, per started 24-hour day."""

    def __init__(self, inner: PricingStrategy, cap_per_day: int) -> None:
        self._inner = inner
        self._cap = cap_per_day

    def fee(self, parked: timedelta) -> int:
        full_days, rest = divmod(parked, timedelta(days=1))
        exact_days = full_days > 0 and rest == timedelta(0)  # 24h, 48h...: no extra day to bill
        rest_fee = 0 if exact_days else min(self._cap, self._inner.fee(rest))
        return full_days * self._cap + rest_fee


class VehicleType(Enum):
    BIKE = "BIKE"
    CAR = "CAR"
    TRUCK = "TRUCK"


class Tariff:
    """One place that maps a vehicle type to its rule chain. New type = one new line here."""

    def __init__(self, lost_ticket_penalty: int) -> None:
        self._lost = lost_ticket_penalty
        self._rules: dict[VehicleType, PricingStrategy] = {
            VehicleType.BIKE: DailyCap(SlabPricing(2, 10, 5), 60),
            VehicleType.CAR: DailyCap(SlabPricing(2, 30, 20), 200),
            VehicleType.TRUCK: DailyCap(SlabPricing(1, 100, 100), 800),
        }

    def fee(self, t: VehicleType, parked: timedelta, lost_ticket: bool) -> int:
        normal = self._rules[t].fee(parked)
        return max(normal, self._lost) if lost_ticket else normal


def show(label: str, fee: int) -> None:
    print(f"{label} -> {fee}")


def main() -> None:
    tariff = Tariff(500)
    mins = lambda m: timedelta(minutes=m)  # noqa: E731
    hrs = lambda h: timedelta(hours=h)  # noqa: E731
    show("car 90 min", tariff.fee(VehicleType.CAR, mins(90), False))  # 30 (inside first 2h)
    show("car 250 min", tariff.fee(VehicleType.CAR, mins(250), False))  # 5h -> 30 + 3*20 = 90
    show("car 30 h", tariff.fee(VehicleType.CAR, hrs(30), False))  # 200 + fee(6h)=110 -> 310
    show("car 1 h lost ticket", tariff.fee(VehicleType.CAR, hrs(1), True))  # lost ticket -> 500
    show("car 24 h", tariff.fee(VehicleType.CAR, hrs(24), False))  # exactly one capped day: 200
    show("car 47 h 59 min", tariff.fee(VehicleType.CAR, mins(47 * 60 + 59), False))  # 200 + capped rest 200
    show("car 0 min", tariff.fee(VehicleType.CAR, timedelta(0), False))  # minimum charge: one block
    show("bike 5 h", tariff.fee(VehicleType.BIKE, hrs(5), False))  # 10 + 3*5 = 25
    show("bike 12 h", tariff.fee(VehicleType.BIKE, hrs(12), False))  # 10 + 10*5 = 60, cap 60
    show("truck 3 h", tariff.fee(VehicleType.TRUCK, hrs(3), False))  # 100 + 2*100 = 300


if __name__ == "__main__":
    main()` },
      { lang: 'ts', code: `const MINUTES_PER_DAY = 24 * 60;

/** Every pricing rule is a PricingStrategy; rules are combined by wrapping (Decorator). */
interface PricingStrategy {
  fee(parkedMinutes: number): number;
}

/** First block of time costs a flat amount, then a rate per started hour. */
class SlabPricing implements PricingStrategy {
  constructor(
    private readonly firstHours: number,
    private readonly firstBlock: number,
    private readonly perHourAfter: number,
  ) {}

  fee(parkedMinutes: number): number {
    const hours = Math.max(1, Math.ceil(parkedMinutes / 60)); // started hours, at least 1
    return hours <= this.firstHours ? this.firstBlock : this.firstBlock + (hours - this.firstHours) * this.perHourAfter;
  }
}

/** Decorator: caps whatever the wrapped strategy charges, per started 24-hour day. */
class DailyCap implements PricingStrategy {
  constructor(private readonly inner: PricingStrategy, private readonly capPerDay: number) {}

  fee(parkedMinutes: number): number {
    const fullDays = Math.floor(parkedMinutes / MINUTES_PER_DAY);
    const rest = parkedMinutes - fullDays * MINUTES_PER_DAY;
    const exactDays = fullDays > 0 && rest === 0; // 24h, 48h...: no extra day to bill
    const restFee = exactDays ? 0 : Math.min(this.capPerDay, this.inner.fee(rest));
    return fullDays * this.capPerDay + restFee;
  }
}

type VehicleType = "BIKE" | "CAR" | "TRUCK";

/** One place that maps a vehicle type to its rule chain. New type = one new line here. */
class Tariff {
  private readonly rules: Record<VehicleType, PricingStrategy> = {
    BIKE: new DailyCap(new SlabPricing(2, 10, 5), 60),
    CAR: new DailyCap(new SlabPricing(2, 30, 20), 200),
    TRUCK: new DailyCap(new SlabPricing(1, 100, 100), 800),
  };

  constructor(private readonly lostTicketPenalty: number) {}

  fee(t: VehicleType, parkedMinutes: number, lostTicket: boolean): number {
    const normal = this.rules[t].fee(parkedMinutes);
    return lostTicket ? Math.max(normal, this.lostTicketPenalty) : normal;
  }
}

const show = (label: string, fee: number): void => console.log(\`\${label} -> \${fee}\`);
const hours = (h: number): number => h * 60;

const tariff = new Tariff(500);
show("car 90 min", tariff.fee("CAR", 90, false)); // 30 (inside first 2h)
show("car 250 min", tariff.fee("CAR", 250, false)); // 5h -> 30 + 3*20 = 90
show("car 30 h", tariff.fee("CAR", hours(30), false)); // 200 + fee(6h)=110 -> 310
show("car 1 h lost ticket", tariff.fee("CAR", hours(1), true)); // lost ticket -> 500
show("car 24 h", tariff.fee("CAR", hours(24), false)); // exactly one capped day: 200
show("car 47 h 59 min", tariff.fee("CAR", 47 * 60 + 59, false)); // 200 + capped rest 200
show("car 0 min", tariff.fee("CAR", 0, false)); // minimum charge: one block
show("bike 5 h", tariff.fee("BIKE", hours(5), false)); // 10 + 3*5 = 25
show("bike 12 h", tariff.fee("BIKE", hours(12), false)); // 10 + 10*5 = 60, cap 60
show("truck 3 h", tariff.fee("TRUCK", hours(3), false)); // 100 + 2*100 = 300` },
      { lang: 'cpp', code: `using Minutes = chrono::minutes;

/** Every pricing rule is a PricingStrategy; rules are combined by wrapping (Decorator). */
class PricingStrategy {
public:
    virtual ~PricingStrategy() = default;
    virtual long long fee(Minutes parked) const = 0;
};

/** First block of time costs a flat amount, then a rate per started hour. */
class SlabPricing : public PricingStrategy {
public:
    SlabPricing(long long firstHours, long long firstBlock, long long perHourAfter)
        : firstHours_(firstHours), firstBlock_(firstBlock), perHourAfter_(perHourAfter) {}

    long long fee(Minutes parked) const override {
        long long minutes = parked.count();
        long long hours = max(1LL, (minutes + 59) / 60);  // started hours, at least 1
        return hours <= firstHours_ ? firstBlock_ : firstBlock_ + (hours - firstHours_) * perHourAfter_;
    }

private:
    long long firstHours_, firstBlock_, perHourAfter_;
};

/** Decorator: caps whatever the wrapped strategy charges, per started 24-hour day. */
class DailyCap : public PricingStrategy {
public:
    DailyCap(unique_ptr<PricingStrategy> inner, long long capPerDay) : inner_(move(inner)), cap_(capPerDay) {}

    long long fee(Minutes parked) const override {
        long long fullDays = parked.count() / (24 * 60);
        Minutes rest = parked - Minutes(fullDays * 24 * 60);
        bool exactDays = fullDays > 0 && rest.count() == 0;  // 24h, 48h...: no extra day to bill
        long long restFee = exactDays ? 0 : min(cap_, inner_->fee(rest));
        return fullDays * cap_ + restFee;
    }

private:
    unique_ptr<PricingStrategy> inner_;
    long long cap_;
};

enum class VehicleType { Bike, Car, Truck };

/** One place that maps a vehicle type to its rule chain. New type = one new line here. */
class Tariff {
public:
    explicit Tariff(long long lostTicketPenalty) : lost_(lostTicketPenalty) {
        rules_[VehicleType::Bike] = make_unique<DailyCap>(make_unique<SlabPricing>(2, 10, 5), 60);
        rules_[VehicleType::Car] = make_unique<DailyCap>(make_unique<SlabPricing>(2, 30, 20), 200);
        rules_[VehicleType::Truck] = make_unique<DailyCap>(make_unique<SlabPricing>(1, 100, 100), 800);
    }

    long long fee(VehicleType t, Minutes parked, bool lostTicket) const {
        long long normal = rules_.at(t)->fee(parked);
        return lostTicket ? max(normal, lost_) : normal;
    }

private:
    map<VehicleType, unique_ptr<PricingStrategy>> rules_;
    long long lost_;
};

void show(const string& label, long long fee) { cout << label << " -> " << fee << "\\n"; }

int main() {
    Tariff tariff(500);
    auto hrs = [](int h) { return Minutes(h * 60); };
    show("car 90 min", tariff.fee(VehicleType::Car, Minutes(90), false));        // 30 (inside first 2h)
    show("car 250 min", tariff.fee(VehicleType::Car, Minutes(250), false));      // 5h -> 30 + 3*20 = 90
    show("car 30 h", tariff.fee(VehicleType::Car, hrs(30), false));              // 200 + fee(6h)=110 -> 310
    show("car 1 h lost ticket", tariff.fee(VehicleType::Car, hrs(1), true));     // lost ticket -> 500
    show("car 24 h", tariff.fee(VehicleType::Car, hrs(24), false));              // exactly one capped day: 200
    show("car 47 h 59 min", tariff.fee(VehicleType::Car, Minutes(47 * 60 + 59), false));  // 200 + capped rest 200
    show("car 0 min", tariff.fee(VehicleType::Car, Minutes(0), false));          // minimum charge: one block
    show("bike 5 h", tariff.fee(VehicleType::Bike, hrs(5), false));              // 10 + 3*5 = 25
    show("bike 12 h", tariff.fee(VehicleType::Bike, hrs(12), false));            // 10 + 10*5 = 60, cap 60
    show("truck 3 h", tariff.fee(VehicleType::Truck, hrs(3), false));            // 100 + 2*100 = 300
}` }
    ],
    g5_sol: [
      { lang: 'python', code: `class TicTacToe:
    """O(1) per move. Player 1 adds +1, player 2 adds -1 to the counters of the row, column
    and (if on them) diagonals. A line belongs entirely to one player exactly when its
    counter reaches +n or -n, because a mixed line can never reach the extreme."""

    def __init__(self, n: int) -> None:
        self._n = n
        self._rows = [0] * n
        self._cols = [0] * n
        self._diag = 0
        self._anti = 0

    def move(self, row: int, col: int, player: int) -> int:
        add = 1 if player == 1 else -1
        self._rows[row] += add
        self._cols[col] += add
        if row == col:
            self._diag += add
        if row + col == self._n - 1:
            self._anti += add
        target = add * self._n  # +n for player 1, -n for player 2
        if target in (self._rows[row], self._cols[col], self._diag, self._anti):
            return player
        return 0


def play(n: int, moves: list[tuple[int, int, int]]) -> str:
    """Plays the moves on a fresh n x n game and returns every move() result on one line."""
    t = TicTacToe(n)
    return " ".join(str(t.move(r, c, p)) for r, c, p in moves)


def main() -> None:
    # row 2 = 1,1,1 -> player 1 wins on the last move
    print(play(3, [(0, 0, 1), (0, 2, 2), (2, 2, 1), (1, 1, 2), (2, 0, 1), (1, 0, 2), (2, 1, 1)]))
    # anti-diagonal (0,2) (1,1) (2,0) -> player 2 wins
    print(play(3, [(0, 0, 1), (0, 2, 2), (0, 1, 1), (1, 1, 2), (1, 0, 1), (2, 0, 2)]))
    # 4x4: column 0 -> player 1 wins after four cells
    print(play(4, [(0, 0, 1), (0, 1, 2), (1, 0, 1), (1, 1, 2), (2, 0, 1), (2, 1, 2), (3, 0, 1)]))
    # full board with no line: nobody wins
    print(play(3, [(0, 0, 1), (0, 1, 2), (0, 2, 1), (1, 2, 2), (1, 0, 1), (2, 0, 2), (1, 1, 1), (2, 2, 2), (2, 1, 1)]))
    # 1x1: the only move wins
    print(play(1, [(0, 0, 1)]))


if __name__ == "__main__":
    main()` },
      { lang: 'ts', code: `/**
 * O(1) per move. Player 1 adds +1, player 2 adds -1 to the counters of the row, column
 * and (if on them) diagonals. A line belongs entirely to one player exactly when its
 * counter reaches +n or -n, because a mixed line can never reach the extreme.
 */
class TicTacToe {
  private readonly rows: number[];
  private readonly cols: number[];
  private diag = 0;
  private anti = 0;

  constructor(private readonly n: number) {
    this.rows = new Array<number>(n).fill(0);
    this.cols = new Array<number>(n).fill(0);
  }

  move(row: number, col: number, player: 1 | 2): number {
    const add = player === 1 ? 1 : -1;
    this.rows[row] += add;
    this.cols[col] += add;
    if (row === col) this.diag += add;
    if (row + col === this.n - 1) this.anti += add;
    const target = add * this.n; // +n for player 1, -n for player 2
    if (this.rows[row] === target || this.cols[col] === target || this.diag === target || this.anti === target) {
      return player;
    }
    return 0;
  }
}

type Move = readonly [row: number, col: number, player: 1 | 2];

/** Plays the moves on a fresh n x n game and returns every move() result on one line. */
function play(n: number, moves: Move[]): string {
  const t = new TicTacToe(n);
  return moves.map(([r, c, p]) => String(t.move(r, c, p))).join(" ");
}

// row 2 = 1,1,1 -> player 1 wins on the last move
console.log(play(3, [[0, 0, 1], [0, 2, 2], [2, 2, 1], [1, 1, 2], [2, 0, 1], [1, 0, 2], [2, 1, 1]]));
// anti-diagonal (0,2) (1,1) (2,0) -> player 2 wins
console.log(play(3, [[0, 0, 1], [0, 2, 2], [0, 1, 1], [1, 1, 2], [1, 0, 1], [2, 0, 2]]));
// 4x4: column 0 -> player 1 wins after four cells
console.log(play(4, [[0, 0, 1], [0, 1, 2], [1, 0, 1], [1, 1, 2], [2, 0, 1], [2, 1, 2], [3, 0, 1]]));
// full board with no line: nobody wins
console.log(play(3, [[0, 0, 1], [0, 1, 2], [0, 2, 1], [1, 2, 2], [1, 0, 1], [2, 0, 2], [1, 1, 1], [2, 2, 2], [2, 1, 1]]));
// 1x1: the only move wins
console.log(play(1, [[0, 0, 1]]));` },
      { lang: 'cpp', code: `/**
 * O(1) per move. Player 1 adds +1, player 2 adds -1 to the counters of the row, column
 * and (if on them) diagonals. A line belongs entirely to one player exactly when its
 * counter reaches +n or -n, because a mixed line can never reach the extreme.
 */
class TicTacToe {
public:
    explicit TicTacToe(int n) : n_(n), rows_(n, 0), cols_(n, 0) {}

    int move(int row, int col, int player) {
        int add = player == 1 ? 1 : -1;
        rows_[row] += add;
        cols_[col] += add;
        if (row == col) diag_ += add;
        if (row + col == n_ - 1) anti_ += add;
        int target = add * n_;  // +n for player 1, -n for player 2
        if (rows_[row] == target || cols_[col] == target || diag_ == target || anti_ == target) return player;
        return 0;
    }

private:
    int n_;
    vector<int> rows_, cols_;
    int diag_ = 0, anti_ = 0;
};

/** Plays the moves on a fresh n x n game and returns every move() result on one line. */
string play(int n, const vector<array<int, 3>>& moves) {
    TicTacToe t(n);
    string out;
    for (const auto& [r, c, p] : moves) out += (out.empty() ? "" : " ") + to_string(t.move(r, c, p));
    return out;
}

int main() {
    // row 2 = 1,1,1 -> player 1 wins on the last move
    cout << play(3, {{0, 0, 1}, {0, 2, 2}, {2, 2, 1}, {1, 1, 2}, {2, 0, 1}, {1, 0, 2}, {2, 1, 1}}) << "\\n";
    // anti-diagonal (0,2) (1,1) (2,0) -> player 2 wins
    cout << play(3, {{0, 0, 1}, {0, 2, 2}, {0, 1, 1}, {1, 1, 2}, {1, 0, 1}, {2, 0, 2}}) << "\\n";
    // 4x4: column 0 -> player 1 wins after four cells
    cout << play(4, {{0, 0, 1}, {0, 1, 2}, {1, 0, 1}, {1, 1, 2}, {2, 0, 1}, {2, 1, 2}, {3, 0, 1}}) << "\\n";
    // full board with no line: nobody wins
    cout << play(3, {{0, 0, 1}, {0, 1, 2}, {0, 2, 1}, {1, 2, 2}, {1, 0, 1}, {2, 0, 2}, {1, 1, 1}, {2, 2, 2}, {2, 1, 1}}) << "\\n";
    // 1x1: the only move wins
    cout << play(1, {{0, 0, 1}}) << "\\n";
}` }
    ],
    g6_sol: [
      { lang: 'python', code: `from abc import ABC, abstractmethod


class Command(ABC):
    """Command pattern: each move knows how to do AND undo itself."""

    @abstractmethod
    def execute(self) -> None: ...

    @abstractmethod
    def undo(self) -> None: ...


class Board3:
    def __init__(self, n: int) -> None:
        self.n = n
        self.cells = [["."] * n for _ in range(n)]
        self.rows = [[0] * n for _ in range(2)]
        self.cols = [[0] * n for _ in range(2)]
        self.diag = [0, 0]
        self.anti = [0, 0]

    def apply(self, r: int, c: int, p: int, sym: str, delta: int) -> None:
        """delta = +1 to place, -1 to remove. Always updates ALL counters so undo is exact."""
        self.cells[r][c] = sym if delta > 0 else "."
        self.rows[p][r] += delta
        self.cols[p][c] += delta
        if r == c:
            self.diag[p] += delta
        if r + c == self.n - 1:
            self.anti[p] += delta

    def wins(self, r: int, c: int, p: int) -> bool:
        n = self.n
        return (self.rows[p][r] == n or self.cols[p][c] == n
                or (r == c and self.diag[p] == n) or (r + c == n - 1 and self.anti[p] == n))


class MoveCommand(Command):
    def __init__(self, board: Board3, r: int, c: int, p: int, sym: str) -> None:
        self._b, self._r, self._c, self._p, self._sym = board, r, c, p, sym

    def execute(self) -> None:
        self._b.apply(self._r, self._c, self._p, self._sym, +1)

    def undo(self) -> None:
        self._b.apply(self._r, self._c, self._p, self._sym, -1)

    def wins(self) -> bool:
        return self._b.wins(self._r, self._c, self._p)


class UndoableGame:
    SYMBOLS = "XO"

    def __init__(self, n: int) -> None:
        self._board = Board3(n)
        self._undo_stack: list[MoveCommand] = []
        self._redo_stack: list[MoveCommand] = []
        self._turn = 0
        self._over = False

    def play(self, r: int, c: int) -> str:
        if self._over:
            raise RuntimeError("game over - undo first")
        if self._board.cells[r][c] != ".":
            raise ValueError("occupied")
        m = MoveCommand(self._board, r, c, self._turn, self.SYMBOLS[self._turn])
        m.execute()
        self._undo_stack.append(m)
        self._redo_stack.clear()  # a new move kills the redo branch
        if m.wins():
            self._over = True
            return f"{self.SYMBOLS[self._turn]} wins"
        self._turn ^= 1
        return "ok"

    def undo(self) -> bool:
        if not self._undo_stack:
            return False
        m = self._undo_stack.pop()
        m.undo()
        self._redo_stack.append(m)
        if self._over:  # winner's turn stays with them after undo
            self._over = False
        else:
            self._turn ^= 1
        return True

    def redo(self) -> bool:
        if not self._redo_stack:
            return False
        m = self._redo_stack.pop()
        m.execute()
        self._undo_stack.append(m)
        if m.wins():
            self._over = True
        else:
            self._turn ^= 1
        return True

    def row(self, r: int) -> str:
        return "".join(self._board.cells[r])


def yes(b: bool) -> str:
    return "true" if b else "false"


def try_play(g: UndoableGame, r: int, c: int) -> str:  # result, or the reason the move was refused
    try:
        return g.play(r, c)
    except (RuntimeError, ValueError) as e:
        return str(e)


def x_wins_on_top() -> UndoableGame:  # X completes row 0 on the fifth move
    g = UndoableGame(3)
    g.play(0, 0)
    g.play(1, 0)
    g.play(0, 1)
    g.play(1, 1)
    print(g.play(0, 2))  # X wins
    return g


def main() -> None:
    g = x_wins_on_top()
    print(try_play(g, 2, 2))  # game over - undo first
    g.undo()  # take back the winning move
    print(g.row(0))  # XX.
    print(g.play(2, 2))  # ok  (X plays elsewhere instead)
    print(yes(g.redo()))  # false: redo branch was cleared
    first = g.undo()
    print(yes(first), yes(g.undo()))  # true true: takes back X(2,2) and O(1,1)
    print(yes(g.redo()), g.row(1))  # true OO.: O(1,1) is back
    print(try_play(g, 0, 0))  # occupied
    print(yes(UndoableGame(3).undo()))  # false: nothing to undo

    h = x_wins_on_top()  # X wins
    h.undo()
    print(yes(h.redo()), h.row(0))  # true XXX: redo re-opens the win
    print(try_play(h, 2, 2))  # game over - undo first


if __name__ == "__main__":
    main()` },
      { lang: 'ts', code: `/** Command pattern: each move knows how to do AND undo itself. */
interface Command {
  execute(): void;
  undo(): void;
}

class Board3 {
  readonly cells: string[][];
  private readonly rows: number[][];
  private readonly cols: number[][];
  private readonly diag = [0, 0];
  private readonly anti = [0, 0];

  constructor(readonly n: number) {
    this.cells = Array.from({ length: n }, () => new Array<string>(n).fill("."));
    this.rows = [new Array<number>(n).fill(0), new Array<number>(n).fill(0)];
    this.cols = [new Array<number>(n).fill(0), new Array<number>(n).fill(0)];
  }

  /** delta = +1 to place, -1 to remove. Always updates ALL counters so undo is exact. */
  apply(r: number, c: number, p: number, sym: string, delta: number): void {
    this.cells[r][c] = delta > 0 ? sym : ".";
    this.rows[p][r] += delta;
    this.cols[p][c] += delta;
    if (r === c) this.diag[p] += delta;
    if (r + c === this.n - 1) this.anti[p] += delta;
  }

  wins(r: number, c: number, p: number): boolean {
    const n = this.n;
    return this.rows[p][r] === n || this.cols[p][c] === n
      || (r === c && this.diag[p] === n) || (r + c === n - 1 && this.anti[p] === n);
  }
}

class MoveCommand implements Command {
  constructor(
    private readonly b: Board3,
    private readonly r: number,
    private readonly c: number,
    private readonly p: number,
    private readonly sym: string,
  ) {}
  execute(): void { this.b.apply(this.r, this.c, this.p, this.sym, +1); }
  undo(): void { this.b.apply(this.r, this.c, this.p, this.sym, -1); }
  wins(): boolean { return this.b.wins(this.r, this.c, this.p); }
}

class UndoableGame {
  private readonly board: Board3;
  private readonly undoStack: MoveCommand[] = [];
  private readonly redoStack: MoveCommand[] = [];
  private readonly symbols = ["X", "O"];
  private turn = 0;
  private over = false;

  constructor(n: number) {
    this.board = new Board3(n);
  }

  play(r: number, c: number): string {
    if (this.over) throw new Error("game over - undo first");
    if (this.board.cells[r][c] !== ".") throw new Error("occupied");
    const m = new MoveCommand(this.board, r, c, this.turn, this.symbols[this.turn]);
    m.execute();
    this.undoStack.push(m);
    this.redoStack.length = 0; // a new move kills the redo branch
    if (m.wins()) {
      this.over = true;
      return \`\${this.symbols[this.turn]} wins\`;
    }
    this.turn ^= 1;
    return "ok";
  }

  undo(): boolean {
    const m = this.undoStack.pop();
    if (!m) return false;
    m.undo();
    this.redoStack.push(m);
    if (this.over) this.over = false; // winner's turn stays with them after undo
    else this.turn ^= 1;
    return true;
  }

  redo(): boolean {
    const m = this.redoStack.pop();
    if (!m) return false;
    m.execute();
    this.undoStack.push(m);
    if (m.wins()) this.over = true;
    else this.turn ^= 1;
    return true;
  }

  row(r: number): string {
    return this.board.cells[r].join("");
  }
}

function tryPlay(g: UndoableGame, r: number, c: number): string { // result, or the reason the move was refused
  try {
    return g.play(r, c);
  } catch (e) {
    return (e as Error).message;
  }
}

function xWinsOnTop(): UndoableGame { // X completes row 0 on the fifth move
  const g = new UndoableGame(3);
  g.play(0, 0); g.play(1, 0); g.play(0, 1); g.play(1, 1);
  console.log(g.play(0, 2)); // X wins
  return g;
}

const g = xWinsOnTop();
console.log(tryPlay(g, 2, 2)); // game over - undo first
g.undo(); // take back the winning move
console.log(g.row(0)); // XX.
console.log(g.play(2, 2)); // ok  (X plays elsewhere instead)
console.log(g.redo()); // false: redo branch was cleared
console.log(\`\${g.undo()} \${g.undo()}\`); // true true: takes back X(2,2) and O(1,1)
console.log(\`\${g.redo()} \${g.row(1)}\`); // true OO.: O(1,1) is back
console.log(tryPlay(g, 0, 0)); // occupied
console.log(new UndoableGame(3).undo()); // false: nothing to undo

const h = xWinsOnTop(); // X wins
h.undo();
console.log(\`\${h.redo()} \${h.row(0)}\`); // true XXX: redo re-opens the win
console.log(tryPlay(h, 2, 2)); // game over - undo first` },
      { lang: 'cpp', code: `/** Command pattern: each move knows how to do AND undo itself. */
class Command {
public:
    virtual ~Command() = default;
    virtual void execute() = 0;
    virtual void undo() = 0;
};

class Board3 {
public:
    explicit Board3(int n)
        : n_(n), cells_(n, string(n, '.')), rows_(2, vector<int>(n, 0)), cols_(2, vector<int>(n, 0)), diag_(2, 0), anti_(2, 0) {}

    /** delta = +1 to place, -1 to remove. Always updates ALL counters so undo is exact. */
    void apply(int r, int c, int p, char sym, int delta) {
        cells_[r][c] = delta > 0 ? sym : '.';
        rows_[p][r] += delta;
        cols_[p][c] += delta;
        if (r == c) diag_[p] += delta;
        if (r + c == n_ - 1) anti_[p] += delta;
    }

    bool wins(int r, int c, int p) const {
        return rows_[p][r] == n_ || cols_[p][c] == n_ || (r == c && diag_[p] == n_) || (r + c == n_ - 1 && anti_[p] == n_);
    }

    const string& row(int r) const { return cells_[r]; }
    char at(int r, int c) const { return cells_[r][c]; }

private:
    int n_;
    vector<string> cells_;
    vector<vector<int>> rows_, cols_;
    vector<int> diag_, anti_;
};

class MoveCommand : public Command {
public:
    MoveCommand(Board3& b, int r, int c, int p, char sym) : b_(b), r_(r), c_(c), p_(p), sym_(sym) {}
    void execute() override { b_.apply(r_, c_, p_, sym_, +1); }
    void undo() override { b_.apply(r_, c_, p_, sym_, -1); }
    bool wins() const { return b_.wins(r_, c_, p_); }

private:
    Board3& b_;
    int r_, c_, p_;
    char sym_;
};

class UndoableGame {
public:
    explicit UndoableGame(int n) : board_(n) {}

    string play(int r, int c) {
        if (over_) throw logic_error("game over - undo first");
        if (board_.at(r, c) != '.') throw invalid_argument("occupied");
        auto m = make_unique<MoveCommand>(board_, r, c, turn_, symbols_[turn_]);
        m->execute();
        bool won = m->wins();
        undoStack_.push_back(move(m));
        redoStack_.clear();  // a new move kills the redo branch
        if (won) {
            over_ = true;
            return string(1, symbols_[turn_]) + " wins";
        }
        turn_ ^= 1;
        return "ok";
    }

    bool undo() {
        if (undoStack_.empty()) return false;
        auto m = move(undoStack_.back());
        undoStack_.pop_back();
        m->undo();
        redoStack_.push_back(move(m));
        if (over_) over_ = false;  // winner's turn stays with them after undo
        else turn_ ^= 1;
        return true;
    }

    bool redo() {
        if (redoStack_.empty()) return false;
        auto m = move(redoStack_.back());
        redoStack_.pop_back();
        m->execute();
        bool won = m->wins();
        undoStack_.push_back(move(m));
        if (won) over_ = true;
        else turn_ ^= 1;
        return true;
    }

    const string& row(int r) const { return board_.row(r); }

private:
    Board3 board_;
    vector<unique_ptr<MoveCommand>> undoStack_, redoStack_;
    array<char, 2> symbols_{'X', 'O'};
    int turn_ = 0;
    bool over_ = false;
};

string yes(bool b) { return b ? "true" : "false"; }

string tryPlay(UndoableGame& g, int r, int c) {  // result, or the reason the move was refused
    try {
        return g.play(r, c);
    } catch (const exception& e) {
        return e.what();
    }
}

UndoableGame xWinsOnTop() {  // X completes row 0 on the fifth move
    UndoableGame g(3);
    g.play(0, 0); g.play(1, 0); g.play(0, 1); g.play(1, 1);
    cout << g.play(0, 2) << "\\n";  // X wins
    return g;
}

int main() {
    UndoableGame g = xWinsOnTop();
    cout << tryPlay(g, 2, 2) << "\\n";  // game over - undo first
    g.undo();                          // take back the winning move
    cout << g.row(0) << "\\n";          // XX.
    cout << g.play(2, 2) << "\\n";      // ok  (X plays elsewhere instead)
    cout << yes(g.redo()) << "\\n";     // false: redo branch was cleared
    string first = yes(g.undo());
    cout << first << " " << yes(g.undo()) << "\\n";  // true true: takes back X(2,2) and O(1,1)
    bool back = g.redo();
    cout << yes(back) << " " << g.row(1) << "\\n";   // true OO.: O(1,1) is back
    cout << tryPlay(g, 0, 0) << "\\n";               // occupied
    cout << yes(UndoableGame(3).undo()) << "\\n";    // false: nothing to undo

    UndoableGame h = xWinsOnTop();  // X wins
    h.undo();
    bool again = h.redo();
    cout << yes(again) << " " << h.row(0) << "\\n";  // true XXX: redo re-opens the win
    cout << tryPlay(h, 2, 2) << "\\n";               // game over - undo first
}` }
    ],
    p01_sol: [
      { lang: 'python', code: `from enum import IntEnum


class SpotType(IntEnum):
    """Spot sizes are ordered: SMALL < COMPACT < LARGE. IntEnum gives that order for free."""
    SMALL = 0
    COMPACT = 1
    LARGE = 2


class VehicleType(IntEnum):
    """Each vehicle states the smallest spot it needs. Any spot at least that big fits."""
    BIKE = 0
    CAR = 1
    TRUCK = 2
    BUS = 3

    @property
    def min_spot(self) -> SpotType:
        return _MIN_SPOT[self]

    def can_park(self, spot: SpotType) -> bool:
        return spot >= self.min_spot

    def fits(self) -> list[SpotType]:
        """All fitting spot types, smallest first: the preference order for allocation."""
        return [s for s in SpotType if self.can_park(s)]


_MIN_SPOT = {
    VehicleType.BIKE: SpotType.SMALL,
    VehicleType.CAR: SpotType.COMPACT,
    VehicleType.TRUCK: SpotType.LARGE,
    VehicleType.BUS: SpotType.LARGE,  # adding a vehicle is one line
}


def show(spots: list[SpotType]) -> str:
    return "[" + ", ".join(s.name for s in spots) + "]"


def fits_of(vehicle: str) -> list[SpotType]:
    try:
        return VehicleType[vehicle].fits()
    except KeyError:
        print(f"unknown vehicle {vehicle}")
        return []


def main() -> None:
    print(str(VehicleType.CAR.can_park(SpotType.SMALL)).lower())  # false
    print(str(VehicleType.CAR.can_park(SpotType.LARGE)).lower())  # true
    print(show(VehicleType.BIKE.fits()))  # [SMALL, COMPACT, LARGE]
    print(show(fits_of("TRUCK")))  # [LARGE]
    print(show(fits_of("BUS")))  # [LARGE]: the one-line addition
    print(str(VehicleType.BUS.can_park(SpotType.COMPACT)).lower())  # false
    print(show(VehicleType.CAR.fits()))  # [COMPACT, LARGE]
    print(show(fits_of("PLANE")))  # unknown vehicle PLANE, then []


if __name__ == "__main__":
    main()` },
      { lang: 'ts', code: `/** Spot sizes are ordered: SMALL < COMPACT < LARGE. A numeric enum gives that order for free. */
enum SpotType { SMALL, COMPACT, LARGE }

/** Each vehicle states the smallest spot it needs. Any spot at least that big fits. */
const MIN_SPOT = {
  BIKE: SpotType.SMALL,
  CAR: SpotType.COMPACT,
  TRUCK: SpotType.LARGE,
  BUS: SpotType.LARGE, // adding a vehicle is one line
} as const;

type VehicleType = keyof typeof MIN_SPOT;

function canPark(v: VehicleType, spot: SpotType): boolean {
  return spot >= MIN_SPOT[v];
}

/** All fitting spot types, smallest first: the preference order for allocation. */
function fits(v: VehicleType): SpotType[] {
  const all = [SpotType.SMALL, SpotType.COMPACT, SpotType.LARGE];
  return all.filter((s) => canPark(v, s));
}

function isVehicle(name: string): name is VehicleType {
  return Object.prototype.hasOwnProperty.call(MIN_SPOT, name);
}

function show(spots: SpotType[]): string {
  return "[" + spots.map((s) => SpotType[s]).join(", ") + "]";
}

function fitsOf(vehicle: string): SpotType[] {
  if (!isVehicle(vehicle)) {
    console.log(\`unknown vehicle \${vehicle}\`);
    return [];
  }
  return fits(vehicle);
}

console.log(canPark("CAR", SpotType.SMALL)); // false
console.log(canPark("CAR", SpotType.LARGE)); // true
console.log(show(fits("BIKE"))); // [SMALL, COMPACT, LARGE]
console.log(show(fitsOf("TRUCK"))); // [LARGE]
console.log(show(fitsOf("BUS"))); // [LARGE]: the one-line addition
console.log(canPark("BUS", SpotType.COMPACT)); // false
console.log(show(fits("CAR"))); // [COMPACT, LARGE]
console.log(show(fitsOf("PLANE"))); // unknown vehicle PLANE, then []` },
      { lang: 'cpp', code: `/** Spot sizes are ordered: SMALL < COMPACT < LARGE. Enum order gives the comparison for free. */
enum class SpotType { Small, Compact, Large };

const char* name(SpotType s) {
    switch (s) {
        case SpotType::Small: return "SMALL";
        case SpotType::Compact: return "COMPACT";
        case SpotType::Large: return "LARGE";
    }
    return "?";
}

/** Each vehicle states the smallest spot it needs. Any spot at least that big fits. */
const map<string, SpotType> MIN_SPOT = {
    {"BIKE", SpotType::Small},
    {"CAR", SpotType::Compact},
    {"TRUCK", SpotType::Large},
    {"BUS", SpotType::Large},  // adding a vehicle is one line
};

bool canPark(const string& vehicle, SpotType spot) { return spot >= MIN_SPOT.at(vehicle); }

/** All fitting spot types, smallest first: the preference order for allocation. */
vector<SpotType> fits(const string& vehicle) {
    vector<SpotType> out;
    for (SpotType s : {SpotType::Small, SpotType::Compact, SpotType::Large})
        if (canPark(vehicle, s)) out.push_back(s);
    return out;
}

string show(const vector<SpotType>& spots) {
    string out = "[";
    for (size_t i = 0; i < spots.size(); i++) out += (i ? ", " : "") + string(name(spots[i]));
    return out + "]";
}

vector<SpotType> fitsOf(const string& vehicle) {
    if (!MIN_SPOT.count(vehicle)) {
        cout << "unknown vehicle " << vehicle << "\\n";
        return {};
    }
    return fits(vehicle);
}

int main() {
    cout << boolalpha;
    cout << canPark("CAR", SpotType::Small) << "\\n";   // false
    cout << canPark("CAR", SpotType::Large) << "\\n";   // true
    cout << show(fits("BIKE")) << "\\n";                // [SMALL, COMPACT, LARGE]
    cout << show(fitsOf("TRUCK")) << "\\n";             // [LARGE]
    cout << show(fitsOf("BUS")) << "\\n";               // [LARGE]: the one-line addition
    cout << canPark("BUS", SpotType::Compact) << "\\n"; // false
    cout << show(fits("CAR")) << "\\n";                 // [COMPACT, LARGE]
    cout << show(fitsOf("PLANE")) << "\\n";             // unknown vehicle PLANE, then []
}` }
    ],
    p02_sol: [
      { lang: 'python', code: `class Solution:
    def tictactoe(self, moves: list[list[int]]) -> str:
        """LeetCode 1275. A = first player (+1), B = second player (-1). Counters per line."""
        n = 3
        rows, cols = [0] * n, [0] * n
        diag = anti = 0
        for i, (r, c) in enumerate(moves):
            add = 1 if i % 2 == 0 else -1
            rows[r] += add
            cols[c] += add
            if r == c:
                diag += add
            if r + c == n - 1:
                anti += add
            if n in (abs(rows[r]), abs(cols[c]), abs(diag), abs(anti)):
                return "A" if add == 1 else "B"
        return "Draw" if len(moves) == n * n else "Pending"


def main() -> None:
    s = Solution()
    print(s.tictactoe([[0, 0], [2, 0], [1, 1], [2, 1], [2, 2]]))  # A: main diagonal
    print(s.tictactoe([[0, 0], [1, 1], [0, 1], [0, 2], [1, 0], [2, 0]]))  # B: anti-diagonal
    print(s.tictactoe([[0, 0], [1, 1]]))  # Pending
    print(s.tictactoe([[0, 0], [2, 2], [2, 0], [1, 0], [1, 2], [2, 1], [0, 1], [0, 2], [1, 1]]))  # Draw
    print(s.tictactoe([[1, 2], [1, 0], [2, 0], [1, 1], [0, 0], [2, 1], [0, 1], [2, 2], [0, 2]]))  # A wins on move 9, not a draw
    print(s.tictactoe([[0, 0], [0, 2], [1, 1], [2, 2], [2, 0], [2, 1], [0, 1], [1, 2]]))  # B wins on move 8
    print(s.tictactoe([[0, 0], [2, 2], [2, 0], [1, 0], [1, 2], [2, 1], [0, 1], [0, 2]]))  # 8 moves, nobody yet: Pending
    print(s.tictactoe([[1, 1]]))  # Pending


if __name__ == "__main__":
    main()` },
      { lang: 'ts', code: `class Solution {
  /** LeetCode 1275. A = first player (+1), B = second player (-1). Counters per line. */
  tictactoe(moves: number[][]): string {
    const n = 3;
    const rows: number[] = new Array<number>(n).fill(0);
    const cols: number[] = new Array<number>(n).fill(0);
    let diag = 0;
    let anti = 0;
    for (let i = 0; i < moves.length; i++) {
      const [r, c] = moves[i];
      const add = i % 2 === 0 ? 1 : -1;
      rows[r] += add;
      cols[c] += add;
      if (r === c) diag += add;
      if (r + c === n - 1) anti += add;
      if (Math.abs(rows[r]) === n || Math.abs(cols[c]) === n || Math.abs(diag) === n || Math.abs(anti) === n) {
        return add === 1 ? "A" : "B";
      }
    }
    return moves.length === n * n ? "Draw" : "Pending";
  }
}

const s = new Solution();
console.log(s.tictactoe([[0, 0], [2, 0], [1, 1], [2, 1], [2, 2]])); // A: main diagonal
console.log(s.tictactoe([[0, 0], [1, 1], [0, 1], [0, 2], [1, 0], [2, 0]])); // B: anti-diagonal
console.log(s.tictactoe([[0, 0], [1, 1]])); // Pending
console.log(s.tictactoe([[0, 0], [2, 2], [2, 0], [1, 0], [1, 2], [2, 1], [0, 1], [0, 2], [1, 1]])); // Draw
console.log(s.tictactoe([[1, 2], [1, 0], [2, 0], [1, 1], [0, 0], [2, 1], [0, 1], [2, 2], [0, 2]])); // A wins on move 9, not a draw
console.log(s.tictactoe([[0, 0], [0, 2], [1, 1], [2, 2], [2, 0], [2, 1], [0, 1], [1, 2]])); // B wins on move 8
console.log(s.tictactoe([[0, 0], [2, 2], [2, 0], [1, 0], [1, 2], [2, 1], [0, 1], [0, 2]])); // 8 moves, nobody yet: Pending
console.log(s.tictactoe([[1, 1]])); // Pending` },
      { lang: 'cpp', code: `class Solution {
public:
    /** LeetCode 1275. A = first player (+1), B = second player (-1). Counters per line. */
    string tictactoe(const vector<vector<int>>& moves) {
        const int n = 3;
        array<int, n> rows{}, cols{};
        int diag = 0, anti = 0;
        for (int i = 0; i < int(moves.size()); i++) {
            int r = moves[i][0], c = moves[i][1];
            int add = i % 2 == 0 ? 1 : -1;
            rows[r] += add;
            cols[c] += add;
            if (r == c) diag += add;
            if (r + c == n - 1) anti += add;
            if (abs(rows[r]) == n || abs(cols[c]) == n || abs(diag) == n || abs(anti) == n) return add == 1 ? "A" : "B";
        }
        return int(moves.size()) == n * n ? "Draw" : "Pending";
    }
};

int main() {
    Solution s;
    cout << s.tictactoe({{0, 0}, {2, 0}, {1, 1}, {2, 1}, {2, 2}}) << "\\n";  // A: main diagonal
    cout << s.tictactoe({{0, 0}, {1, 1}, {0, 1}, {0, 2}, {1, 0}, {2, 0}}) << "\\n";  // B: anti-diagonal
    cout << s.tictactoe({{0, 0}, {1, 1}}) << "\\n";  // Pending
    cout << s.tictactoe({{0, 0}, {2, 2}, {2, 0}, {1, 0}, {1, 2}, {2, 1}, {0, 1}, {0, 2}, {1, 1}}) << "\\n";  // Draw
    cout << s.tictactoe({{1, 2}, {1, 0}, {2, 0}, {1, 1}, {0, 0}, {2, 1}, {0, 1}, {2, 2}, {0, 2}}) << "\\n";  // A wins on move 9, not a draw
    cout << s.tictactoe({{0, 0}, {0, 2}, {1, 1}, {2, 2}, {2, 0}, {2, 1}, {0, 1}, {1, 2}}) << "\\n";  // B wins on move 8
    cout << s.tictactoe({{0, 0}, {2, 2}, {2, 0}, {1, 0}, {1, 2}, {2, 1}, {0, 1}, {0, 2}}) << "\\n";  // 8 moves, nobody yet: Pending
    cout << s.tictactoe({{1, 1}}) << "\\n";  // Pending
}` }
    ],
    p03_sol: [
      { lang: 'python', code: `from abc import ABC, abstractmethod
from enum import Enum


class SpotType(Enum):
    SMALL = 0
    COMPACT = 1
    LARGE = 2


class SpotListener(ABC):
    """Observer: anyone who wants to hear about spots changing."""

    @abstractmethod
    def on_occupied(self, t: SpotType) -> None: ...

    @abstractmethod
    def on_freed(self, t: SpotType) -> None: ...


class DisplayBoard(SpotListener):
    """The display board keeps running counters, so reading them is O(1)."""

    def __init__(self, initial: dict[SpotType, int]) -> None:
        self._free = dict(initial)

    def on_occupied(self, t: SpotType) -> None:
        self._free[t] -= 1

    def on_freed(self, t: SpotType) -> None:
        self._free[t] += 1

    def show(self) -> str:
        return "{" + ", ".join(f"{t.name}={self._free[t]}" for t in SpotType) + "}"


class EventLog(SpotListener):
    """A second, unrelated subscriber: the lot code did not change to support it."""

    def __init__(self) -> None:
        self._lines: list[str] = []

    def on_occupied(self, t: SpotType) -> None:
        self._lines.append(f"occupied {t.name}")

    def on_freed(self, t: SpotType) -> None:
        self._lines.append(f"freed {t.name}")

    def text(self) -> str:
        return ", ".join(self._lines)


class Lot:
    """The lot publishes events; it does not know or care who listens."""

    def __init__(self, *types: SpotType) -> None:
        self._types = types
        self._taken = [False] * len(types)
        self._listeners: list[SpotListener] = []

    def subscribe(self, listener: SpotListener) -> None:
        self._listeners.append(listener)

    def counts(self) -> dict[SpotType, int]:
        counts = {t: 0 for t in SpotType}
        for t, taken in zip(self._types, self._taken):
            if not taken:
                counts[t] += 1
        return counts

    def occupy(self, i: int) -> None:
        if self._taken[i]:
            raise RuntimeError("taken")
        self._taken[i] = True
        for listener in self._listeners:
            listener.on_occupied(self._types[i])

    def free(self, i: int) -> None:
        if not self._taken[i]:
            raise RuntimeError("already free")
        self._taken[i] = False
        for listener in self._listeners:
            listener.on_freed(self._types[i])


def main() -> None:
    lot = Lot(SpotType.SMALL, SpotType.COMPACT, SpotType.COMPACT, SpotType.LARGE)
    board = DisplayBoard(lot.counts())  # seed once with a scan
    log = EventLog()
    lot.subscribe(board)
    lot.subscribe(log)
    lot.occupy(1)
    lot.occupy(3)
    print(board.show())  # {SMALL=1, COMPACT=1, LARGE=0}
    lot.free(3)
    print(board.show())  # {SMALL=1, COMPACT=1, LARGE=1}
    for action in (lambda: lot.occupy(1), lambda: lot.free(0)):  # taken, then already free
        try:
            action()
        except RuntimeError as e:
            print(e)
    print(board.show())  # unchanged: failed calls publish nothing
    print("log:", log.text())


if __name__ == "__main__":
    main()` },
      { lang: 'ts', code: `enum SpotType { SMALL, COMPACT, LARGE }

const ALL_TYPES = [SpotType.SMALL, SpotType.COMPACT, SpotType.LARGE];

/** Observer: anyone who wants to hear about spots changing. */
interface SpotListener {
  onOccupied(t: SpotType): void;
  onFreed(t: SpotType): void;
}

/** The display board keeps running counters, so reading them is O(1). */
class DisplayBoard implements SpotListener {
  private readonly free: Map<SpotType, number>;

  constructor(initial: Map<SpotType, number>) {
    this.free = new Map(initial);
  }

  onOccupied(t: SpotType): void { this.free.set(t, (this.free.get(t) ?? 0) - 1); }
  onFreed(t: SpotType): void { this.free.set(t, (this.free.get(t) ?? 0) + 1); }

  show(): string {
    return "{" + ALL_TYPES.map((t) => \`\${SpotType[t]}=\${this.free.get(t)}\`).join(", ") + "}";
  }
}

/** A second, unrelated subscriber: the lot code did not change to support it. */
class EventLog implements SpotListener {
  private readonly lines: string[] = [];
  onOccupied(t: SpotType): void { this.lines.push(\`occupied \${SpotType[t]}\`); }
  onFreed(t: SpotType): void { this.lines.push(\`freed \${SpotType[t]}\`); }
  text(): string { return this.lines.join(", "); }
}

/** The lot publishes events; it does not know or care who listens. */
class Lot {
  private readonly taken: boolean[];
  private readonly listeners: SpotListener[] = [];
  private readonly types: SpotType[];

  constructor(...types: SpotType[]) {
    this.types = types;
    this.taken = types.map(() => false);
  }

  subscribe(l: SpotListener): void { this.listeners.push(l); }

  counts(): Map<SpotType, number> {
    const m = new Map<SpotType, number>(ALL_TYPES.map((t) => [t, 0]));
    this.types.forEach((t, i) => {
      if (!this.taken[i]) m.set(t, (m.get(t) ?? 0) + 1);
    });
    return m;
  }

  occupy(i: number): void {
    if (this.taken[i]) throw new Error("taken");
    this.taken[i] = true;
    this.listeners.forEach((l) => l.onOccupied(this.types[i]));
  }

  free(i: number): void {
    if (!this.taken[i]) throw new Error("already free");
    this.taken[i] = false;
    this.listeners.forEach((l) => l.onFreed(this.types[i]));
  }
}

const lot = new Lot(SpotType.SMALL, SpotType.COMPACT, SpotType.COMPACT, SpotType.LARGE);
const board = new DisplayBoard(lot.counts()); // seed once with a scan
const log = new EventLog();
lot.subscribe(board);
lot.subscribe(log);
lot.occupy(1);
lot.occupy(3);
console.log(board.show()); // {SMALL=1, COMPACT=1, LARGE=0}
lot.free(3);
console.log(board.show()); // {SMALL=1, COMPACT=1, LARGE=1}
for (const action of [() => lot.occupy(1), () => lot.free(0)]) { // taken, then already free
  try {
    action();
  } catch (e) {
    console.log((e as Error).message);
  }
}
console.log(board.show()); // unchanged: failed calls publish nothing
console.log("log: " + log.text());` },
      { lang: 'cpp', code: `enum class SpotType { Small, Compact, Large };
constexpr array<SpotType, 3> ALL_TYPES = {SpotType::Small, SpotType::Compact, SpotType::Large};

const char* name(SpotType t) {
    switch (t) {
        case SpotType::Small: return "SMALL";
        case SpotType::Compact: return "COMPACT";
        case SpotType::Large: return "LARGE";
    }
    return "?";
}

/** Observer: anyone who wants to hear about spots changing. */
class SpotListener {
public:
    virtual ~SpotListener() = default;
    virtual void onOccupied(SpotType t) = 0;
    virtual void onFreed(SpotType t) = 0;
};

/** The display board keeps running counters, so reading them is O(1). */
class DisplayBoard : public SpotListener {
public:
    explicit DisplayBoard(map<SpotType, int> initial) : free_(move(initial)) {}
    void onOccupied(SpotType t) override { free_[t]--; }
    void onFreed(SpotType t) override { free_[t]++; }
    string show() const {
        string out = "{";
        for (size_t i = 0; i < ALL_TYPES.size(); i++)
            out += string(i ? ", " : "") + name(ALL_TYPES[i]) + "=" + to_string(free_.at(ALL_TYPES[i]));
        return out + "}";
    }

private:
    map<SpotType, int> free_;
};

/** A second, unrelated subscriber: the lot code did not change to support it. */
class EventLog : public SpotListener {
public:
    void onOccupied(SpotType t) override { lines_.push_back(string("occupied ") + name(t)); }
    void onFreed(SpotType t) override { lines_.push_back(string("freed ") + name(t)); }
    string text() const {
        string out;
        for (size_t i = 0; i < lines_.size(); i++) out += (i ? ", " : "") + lines_[i];
        return out;
    }

private:
    vector<string> lines_;
};

/** The lot publishes events; it does not know or care who listens (listeners are not owned). */
class Lot {
public:
    explicit Lot(vector<SpotType> types) : types_(move(types)), taken_(types_.size(), false) {}

    void subscribe(SpotListener& l) { listeners_.push_back(&l); }

    map<SpotType, int> counts() const {
        map<SpotType, int> m;
        for (SpotType t : ALL_TYPES) m[t] = 0;
        for (size_t i = 0; i < types_.size(); i++)
            if (!taken_[i]) m[types_[i]]++;
        return m;
    }

    void occupy(size_t i) {
        if (taken_[i]) throw runtime_error("taken");
        taken_[i] = true;
        for (auto* l : listeners_) l->onOccupied(types_[i]);
    }

    void free(size_t i) {
        if (!taken_[i]) throw runtime_error("already free");
        taken_[i] = false;
        for (auto* l : listeners_) l->onFreed(types_[i]);
    }

private:
    vector<SpotType> types_;
    vector<bool> taken_;
    vector<SpotListener*> listeners_;
};

int main() {
    Lot lot({SpotType::Small, SpotType::Compact, SpotType::Compact, SpotType::Large});
    DisplayBoard board(lot.counts());  // seed once with a scan
    EventLog log;
    lot.subscribe(board);
    lot.subscribe(log);
    lot.occupy(1);
    lot.occupy(3);
    cout << board.show() << "\\n";  // {SMALL=1, COMPACT=1, LARGE=0}
    lot.free(3);
    cout << board.show() << "\\n";  // {SMALL=1, COMPACT=1, LARGE=1}
    try { lot.occupy(1); } catch (const runtime_error& e) { cout << e.what() << "\\n"; }  // taken
    try { lot.free(0); } catch (const runtime_error& e) { cout << e.what() << "\\n"; }    // already free
    cout << board.show() << "\\n";  // unchanged: failed calls publish nothing
    cout << "log: " << log.text() << "\\n";
}` }
    ],
    p04_sol: [
      { lang: 'python', code: `from abc import ABC, abstractmethod
from typing import Callable


class PricingStrategy(ABC):
    """Strategy pattern: one method, so simple tariffs can even be plain functions."""

    @abstractmethod
    def fee(self, minutes: int) -> int: ...


class FlatPricing(PricingStrategy):
    def __init__(self, amount: int) -> None:
        self._amount = amount

    def fee(self, minutes: int) -> int:
        return self._amount


class HourlyPricing(PricingStrategy):
    def __init__(self, per_hour: int) -> None:
        self._per_hour = per_hour

    def fee(self, minutes: int) -> int:
        return max(1, (minutes + 59) // 60) * self._per_hour


class FunctionPricing(PricingStrategy):
    """Adapter: wraps any function minutes -> fee, the Python version of a Java lambda."""

    def __init__(self, fn: Callable[[int], int]) -> None:
        self._fn = fn

    def fee(self, minutes: int) -> int:
        return self._fn(minutes)


class FeeCalculator:
    """The context: it holds a strategy and can be switched at runtime (e.g. on weekends)."""

    def __init__(self, strategy: PricingStrategy) -> None:
        self.set_strategy(strategy)

    def set_strategy(self, strategy: PricingStrategy | None) -> None:
        if strategy is None:
            raise ValueError("strategy required")
        self._strategy = strategy

    def charge(self, minutes: int) -> int:
        if minutes < 0:
            raise ValueError("minutes must not be negative")
        return self._strategy.fee(minutes)


def main() -> None:
    calc = FeeCalculator(HourlyPricing(40))
    print("hourly(61) =", calc.charge(61))  # 2 started hours -> 80
    print("hourly(0) =", calc.charge(0))  # at least one hour -> 40
    calc.set_strategy(FlatPricing(100))
    print("flat(61) =", calc.charge(61))  # 100
    calc.set_strategy(FunctionPricing(lambda m: 0 if m <= 15 else 50))  # "first 15 minutes free"
    print("promo(10) =", calc.charge(10))  # 0
    print("promo(16) =", calc.charge(16))  # 50
    for action in (lambda: calc.set_strategy(None), lambda: calc.charge(-5)):
        try:
            action()
        except ValueError as e:
            print(e)


if __name__ == "__main__":
    main()` },
      { lang: 'ts', code: `/** Strategy pattern: a one-method interface, so simple tariffs can be object literals with an arrow function. */
interface PricingStrategy {
  fee(minutes: number): number;
}

class FlatPricing implements PricingStrategy {
  constructor(private readonly amount: number) {}
  fee(_minutes: number): number { return this.amount; }
}

class HourlyPricing implements PricingStrategy {
  constructor(private readonly perHour: number) {}
  fee(minutes: number): number { return Math.max(1, Math.ceil(minutes / 60)) * this.perHour; }
}

/** The context: it holds a strategy and can be switched at runtime (e.g. on weekends). */
class FeeCalculator {
  private strategy!: PricingStrategy;

  constructor(s: PricingStrategy | null) {
    this.setStrategy(s);
  }

  setStrategy(s: PricingStrategy | null): void {
    if (s === null) throw new Error("strategy required");
    this.strategy = s;
  }

  charge(minutes: number): number {
    if (minutes < 0) throw new Error("minutes must not be negative");
    return this.strategy.fee(minutes);
  }
}

const calc = new FeeCalculator(new HourlyPricing(40));
console.log("hourly(61) = " + calc.charge(61)); // 2 started hours -> 80
console.log("hourly(0) = " + calc.charge(0)); // at least one hour -> 40
calc.setStrategy(new FlatPricing(100));
console.log("flat(61) = " + calc.charge(61)); // 100
calc.setStrategy({ fee: (m) => (m <= 15 ? 0 : 50) }); // "first 15 minutes free" as an inline strategy
console.log("promo(10) = " + calc.charge(10)); // 0
console.log("promo(16) = " + calc.charge(16)); // 50
for (const action of [() => calc.setStrategy(null), () => calc.charge(-5)]) {
  try {
    action();
  } catch (e) {
    console.log((e as Error).message);
  }
}` },
      { lang: 'cpp', code: `/** Strategy pattern: one virtual method; simple tariffs can wrap a lambda. */
class PricingStrategy {
public:
    virtual ~PricingStrategy() = default;
    virtual long long fee(long long minutes) const = 0;
};

class FlatPricing : public PricingStrategy {
public:
    explicit FlatPricing(long long amount) : amount_(amount) {}
    long long fee(long long) const override { return amount_; }

private:
    long long amount_;
};

class HourlyPricing : public PricingStrategy {
public:
    explicit HourlyPricing(long long perHour) : perHour_(perHour) {}
    long long fee(long long minutes) const override { return max(1LL, (minutes + 59) / 60) * perHour_; }

private:
    long long perHour_;
};

/** Adapter: any callable minutes -> fee becomes a strategy (the C++ version of a Java lambda). */
class LambdaPricing : public PricingStrategy {
public:
    explicit LambdaPricing(function<long long(long long)> fn) : fn_(move(fn)) {}
    long long fee(long long minutes) const override { return fn_(minutes); }

private:
    function<long long(long long)> fn_;
};

/** The context: it owns its current strategy and can switch it at runtime (e.g. on weekends). */
class FeeCalculator {
public:
    explicit FeeCalculator(unique_ptr<PricingStrategy> s) { setStrategy(move(s)); }

    void setStrategy(unique_ptr<PricingStrategy> s) {
        if (!s) throw invalid_argument("strategy required");
        strategy_ = move(s);
    }

    long long charge(long long minutes) const {
        if (minutes < 0) throw invalid_argument("minutes must not be negative");
        return strategy_->fee(minutes);
    }

private:
    unique_ptr<PricingStrategy> strategy_;
};

int main() {
    FeeCalculator calc(make_unique<HourlyPricing>(40));
    cout << "hourly(61) = " << calc.charge(61) << "\\n";  // 2 started hours -> 80
    cout << "hourly(0) = " << calc.charge(0) << "\\n";    // at least one hour -> 40
    calc.setStrategy(make_unique<FlatPricing>(100));
    cout << "flat(61) = " << calc.charge(61) << "\\n";    // 100
    calc.setStrategy(make_unique<LambdaPricing>([](long long m) { return m <= 15 ? 0 : 50; }));  // "first 15 minutes free"
    cout << "promo(10) = " << calc.charge(10) << "\\n";   // 0
    cout << "promo(16) = " << calc.charge(16) << "\\n";   // 50
    try { calc.setStrategy(nullptr); } catch (const invalid_argument& e) { cout << e.what() << "\\n"; }
    try { calc.charge(-5); } catch (const invalid_argument& e) { cout << e.what() << "\\n"; }
}` }
    ],
    p05_sol: [
      { lang: 'python', code: `class Solution:
    def validTicTacToe(self, board: list[str]) -> bool:
        """LeetCode 794: can this board appear in a real game where X moves first?"""
        x = sum(row.count("X") for row in board)
        o = sum(row.count("O") for row in board)
        if o > x or x - o > 1:  # turns alternate, X first
            return False
        x_win, o_win = self._wins(board, "X"), self._wins(board, "O")
        if x_win and o_win:  # the game would have stopped earlier
            return False
        if x_win and x != o + 1:  # X just moved, so X has one extra
            return False
        if o_win and x != o:  # O just moved, so counts are equal
            return False
        return True

    @staticmethod
    def _wins(b: list[str], p: str) -> bool:
        lines = [list(row) for row in b] + [[b[r][c] for r in range(3)] for c in range(3)]
        lines.append([b[i][i] for i in range(3)])
        lines.append([b[i][2 - i] for i in range(3)])
        return any(line == [p, p, p] for line in lines)


def main() -> None:
    s = Solution()
    print(str(s.validTicTacToe(["O  ", "   ", "   "])).lower())  # false: O moved first
    print(str(s.validTicTacToe(["XOX", " X ", "   "])).lower())  # false: X has 2 extra
    print(str(s.validTicTacToe(["XXX", "   ", "OOO"])).lower())  # false: both won
    print(str(s.validTicTacToe(["XOX", "O O", "XOX"])).lower())  # true: full-looking, no line
    print(str(s.validTicTacToe(["   ", "   ", "   "])).lower())  # true: empty board
    print(str(s.validTicTacToe(["XXX", "OO ", "O  "])).lower())  # false: X won but counts are equal: O moved after the win
    print(str(s.validTicTacToe(["XXX", "OO ", "   "])).lower())  # true: X won on its last move
    print(str(s.validTicTacToe(["XXO", "XO ", "O  "])).lower())  # true: O won on its last move
    print(str(s.validTicTacToe(["XXO", "XO ", "O X"])).lower())  # false: O won but X moved again
    print(str(s.validTicTacToe(["XOO", "XO ", "XX "])).lower())  # true: X wins with a column
    print(str(s.validTicTacToe(["XOX", "XOO", "OXX"])).lower())  # true: full board, nobody won


if __name__ == "__main__":
    main()` },
      { lang: 'ts', code: `class Solution {
  /** LeetCode 794: can this board appear in a real game where X moves first? */
  validTicTacToe(board: string[]): boolean {
    let x = 0;
    let o = 0;
    for (const row of board) {
      for (const ch of row) {
        if (ch === "X") x++;
        else if (ch === "O") o++;
      }
    }
    if (o > x || x - o > 1) return false; // turns alternate, X first
    const xWin = this.wins(board, "X");
    const oWin = this.wins(board, "O");
    if (xWin && oWin) return false; // the game would have stopped earlier
    if (xWin && x !== o + 1) return false; // X just moved, so X has one extra
    if (oWin && x !== o) return false; // O just moved, so counts are equal
    return true;
  }

  private wins(b: string[], p: string): boolean {
    for (let i = 0; i < 3; i++) {
      if (b[i][0] === p && b[i][1] === p && b[i][2] === p) return true;
      if (b[0][i] === p && b[1][i] === p && b[2][i] === p) return true;
    }
    return (b[0][0] === p && b[1][1] === p && b[2][2] === p)
      || (b[0][2] === p && b[1][1] === p && b[2][0] === p);
  }
}

const s = new Solution();
console.log(s.validTicTacToe(["O  ", "   ", "   "])); // false: O moved first
console.log(s.validTicTacToe(["XOX", " X ", "   "])); // false: X has 2 extra
console.log(s.validTicTacToe(["XXX", "   ", "OOO"])); // false: both won
console.log(s.validTicTacToe(["XOX", "O O", "XOX"])); // true: full-looking, no line
console.log(s.validTicTacToe(["   ", "   ", "   "])); // true: empty board
console.log(s.validTicTacToe(["XXX", "OO ", "O  "])); // false: X won but counts are equal: O moved after the win
console.log(s.validTicTacToe(["XXX", "OO ", "   "])); // true: X won on its last move
console.log(s.validTicTacToe(["XXO", "XO ", "O  "])); // true: O won on its last move
console.log(s.validTicTacToe(["XXO", "XO ", "O X"])); // false: O won but X moved again
console.log(s.validTicTacToe(["XOO", "XO ", "XX "])); // true: X wins with a column
console.log(s.validTicTacToe(["XOX", "XOO", "OXX"])); // true: full board, nobody won` },
      { lang: 'cpp', code: `class Solution {
public:
    /** LeetCode 794: can this board appear in a real game where X moves first? */
    bool validTicTacToe(const vector<string>& board) {
        int x = 0, o = 0;
        for (const string& row : board) {
            x += count(row.begin(), row.end(), 'X');
            o += count(row.begin(), row.end(), 'O');
        }
        if (o > x || x - o > 1) return false;  // turns alternate, X first
        bool xWin = wins(board, 'X'), oWin = wins(board, 'O');
        if (xWin && oWin) return false;        // the game would have stopped earlier
        if (xWin && x != o + 1) return false;  // X just moved, so X has one extra
        if (oWin && x != o) return false;      // O just moved, so counts are equal
        return true;
    }

private:
    static bool wins(const vector<string>& b, char p) {
        for (int i = 0; i < 3; i++) {
            if (b[i][0] == p && b[i][1] == p && b[i][2] == p) return true;
            if (b[0][i] == p && b[1][i] == p && b[2][i] == p) return true;
        }
        return (b[0][0] == p && b[1][1] == p && b[2][2] == p) || (b[0][2] == p && b[1][1] == p && b[2][0] == p);
    }
};

int main() {
    Solution s;
    cout << boolalpha << s.validTicTacToe({"O  ", "   ", "   "}) << "\\n";  // false: O moved first
    cout << boolalpha << s.validTicTacToe({"XOX", " X ", "   "}) << "\\n";  // false: X has 2 extra
    cout << boolalpha << s.validTicTacToe({"XXX", "   ", "OOO"}) << "\\n";  // false: both won
    cout << boolalpha << s.validTicTacToe({"XOX", "O O", "XOX"}) << "\\n";  // true: full-looking, no line
    cout << boolalpha << s.validTicTacToe({"   ", "   ", "   "}) << "\\n";  // true: empty board
    cout << boolalpha << s.validTicTacToe({"XXX", "OO ", "O  "}) << "\\n";  // false: X won but counts are equal: O moved after the win
    cout << boolalpha << s.validTicTacToe({"XXX", "OO ", "   "}) << "\\n";  // true: X won on its last move
    cout << boolalpha << s.validTicTacToe({"XXO", "XO ", "O  "}) << "\\n";  // true: O won on its last move
    cout << boolalpha << s.validTicTacToe({"XXO", "XO ", "O X"}) << "\\n";  // false: O won but X moved again
    cout << boolalpha << s.validTicTacToe({"XOO", "XO ", "XX "}) << "\\n";  // true: X wins with a column
    cout << boolalpha << s.validTicTacToe({"XOX", "XOO", "OXX"}) << "\\n";  // true: full board, nobody won
}` }
    ],
    p06_sol: [
      { lang: 'python', code: `class ConnectFour:
    """Connect Four: gravity drop + check only the 4 lines through the new disc."""

    DIRECTIONS = ((0, 1), (1, 0), (1, 1), (1, -1))

    def __init__(self, rows: int, cols: int, k: int) -> None:
        self._rows, self._cols, self._k = rows, cols, k
        self._grid = [["."] * cols for _ in range(rows)]
        self._height = [0] * cols  # next free row per column, counted from the bottom
        self._moves = 0

    def drop(self, col: int, p: str) -> str:
        """Drops a disc; returns "WIN", "DRAW" or "OK". Raises on a full or bad column."""
        if col < 0 or col >= self._cols or self._height[col] == self._rows:
            raise ValueError(f"Column {col} is not playable")
        r = self._rows - 1 - self._height[col]  # row 0 is the top, so discs fall to the largest row
        self._height[col] += 1
        self._grid[r][col] = p
        self._moves += 1
        for dr, dc in self.DIRECTIONS:
            count = 1 + self._run(r, col, dr, dc, p) + self._run(r, col, -dr, -dc, p)
            if count >= self._k:
                return "WIN"
        return "DRAW" if self._moves == self._rows * self._cols else "OK"

    def _run(self, r: int, c: int, dr: int, dc: int, p: str) -> int:
        """How many same discs continue from (r,c) in direction (dr,dc), not counting (r,c)."""
        n = 0
        r, c = r + dr, c + dc
        while 0 <= r < self._rows and 0 <= c < self._cols and self._grid[r][c] == p:
            n += 1
            r, c = r + dr, c + dc
        return n


def play(g: ConnectFour, *cols: int) -> str:
    """Red and Yellow alternate through the columns; returns every result on one line."""
    return " ".join(g.drop(col, "R" if i % 2 == 0 else "Y") for i, col in enumerate(cols))


def main() -> None:
    # red completes a diagonal (5,0) (4,1) (3,2) (2,3) on the last drop
    print(play(ConnectFour(6, 7, 4), 0, 1, 1, 2, 2, 3, 2, 3, 3, 6, 3))
    # red stacks column 0 while yellow stacks column 1: vertical win on a 4x4 board
    print(play(ConnectFour(4, 4, 4), 0, 1, 0, 1, 0, 1, 0))
    # bottom row 0,1,2,3 for red: horizontal win
    print(play(ConnectFour(6, 7, 4), 0, 0, 1, 1, 2, 2, 3))
    # 2x2 board, 3 in a row is impossible: the fourth disc ends in a draw
    small = ConnectFour(2, 2, 3)
    print(play(small, 0, 1, 0, 1))
    for col in (0, 7, -1):  # full column, past the edge, before the edge
        try:
            small.drop(col, "R")
        except ValueError as e:
            print(e)


if __name__ == "__main__":
    main()` },
      { lang: 'ts', code: `type Result = "WIN" | "DRAW" | "OK";

/** Connect Four: gravity drop + check only the 4 lines through the new disc. */
class ConnectFour {
  private static readonly DIRECTIONS: ReadonlyArray<readonly [number, number]> = [[0, 1], [1, 0], [1, 1], [1, -1]];
  private readonly grid: string[][];
  private readonly height: number[]; // next free row per column, counted from the bottom
  private moves = 0;

  constructor(private readonly rows: number, private readonly cols: number, private readonly k: number) {
    this.grid = Array.from({ length: rows }, () => new Array<string>(cols).fill("."));
    this.height = new Array<number>(cols).fill(0);
  }

  /** Drops a disc; returns "WIN", "DRAW" or "OK". Throws on a full or bad column. */
  drop(col: number, p: string): Result {
    if (col < 0 || col >= this.cols || this.height[col] === this.rows) {
      throw new Error(\`Column \${col} is not playable\`);
    }
    const r = this.rows - 1 - this.height[col]++; // row 0 is the top, so discs fall to the largest row
    this.grid[r][col] = p;
    this.moves++;
    for (const [dr, dc] of ConnectFour.DIRECTIONS) {
      const count = 1 + this.run(r, col, dr, dc, p) + this.run(r, col, -dr, -dc, p);
      if (count >= this.k) return "WIN";
    }
    return this.moves === this.rows * this.cols ? "DRAW" : "OK";
  }

  /** How many same discs continue from (r,c) in direction (dr,dc), not counting (r,c). */
  private run(r: number, c: number, dr: number, dc: number, p: string): number {
    let n = 0;
    for (let rr = r + dr, cc = c + dc; rr >= 0 && rr < this.rows && cc >= 0 && cc < this.cols && this.grid[rr][cc] === p; rr += dr, cc += dc) n++;
    return n;
  }
}

/** Red and Yellow alternate through the columns; returns every result on one line. */
function play(g: ConnectFour, ...cols: number[]): string {
  return cols.map((col, i) => g.drop(col, i % 2 === 0 ? "R" : "Y")).join(" ");
}

// red completes a diagonal (5,0) (4,1) (3,2) (2,3) on the last drop
console.log(play(new ConnectFour(6, 7, 4), 0, 1, 1, 2, 2, 3, 2, 3, 3, 6, 3));
// red stacks column 0 while yellow stacks column 1: vertical win on a 4x4 board
console.log(play(new ConnectFour(4, 4, 4), 0, 1, 0, 1, 0, 1, 0));
// bottom row 0,1,2,3 for red: horizontal win
console.log(play(new ConnectFour(6, 7, 4), 0, 0, 1, 1, 2, 2, 3));
// 2x2 board, 3 in a row is impossible: the fourth disc ends in a draw
const small = new ConnectFour(2, 2, 3);
console.log(play(small, 0, 1, 0, 1));
for (const col of [0, 7, -1]) { // full column, past the edge, before the edge
  try {
    small.drop(col, "R");
  } catch (e) {
    console.log((e as Error).message);
  }
}` },
      { lang: 'cpp', code: `/** Connect Four: gravity drop + check only the 4 lines through the new disc. */
class ConnectFour {
public:
    ConnectFour(int rows, int cols, int k)
        : rows_(rows), cols_(cols), k_(k), grid_(rows, string(cols, '.')), height_(cols, 0) {}

    /** Drops a disc; returns "WIN", "DRAW" or "OK". Throws on a full or bad column. */
    string drop(int col, char p) {
        if (col < 0 || col >= cols_ || height_[col] == rows_)
            throw invalid_argument("Column " + to_string(col) + " is not playable");
        int r = rows_ - 1 - height_[col]++;  // row 0 is the top, so discs fall to the largest row
        grid_[r][col] = p;
        moves_++;
        for (auto [dr, dc] : DIRECTIONS) {
            int count = 1 + run(r, col, dr, dc, p) + run(r, col, -dr, -dc, p);
            if (count >= k_) return "WIN";
        }
        return moves_ == rows_ * cols_ ? "DRAW" : "OK";
    }

private:
    static constexpr array<pair<int, int>, 4> DIRECTIONS{{{0, 1}, {1, 0}, {1, 1}, {1, -1}}};

    /** How many same discs continue from (r,c) in direction (dr,dc), not counting (r,c). */
    int run(int r, int c, int dr, int dc, char p) const {
        int n = 0;
        for (int rr = r + dr, cc = c + dc; rr >= 0 && rr < rows_ && cc >= 0 && cc < cols_ && grid_[rr][cc] == p; rr += dr, cc += dc) n++;
        return n;
    }

    int rows_, cols_, k_;
    vector<string> grid_;
    vector<int> height_;  // next free row per column, counted from the bottom
    int moves_ = 0;
};

/** Red and Yellow alternate through the columns; returns every result on one line. */
string play(ConnectFour& g, const vector<int>& cols) {
    string out;
    for (size_t i = 0; i < cols.size(); i++) out += (i ? " " : "") + g.drop(cols[i], i % 2 == 0 ? 'R' : 'Y');
    return out;
}

int main() {
    ConnectFour a(6, 7, 4), b(4, 4, 4), c(6, 7, 4);
    // red completes a diagonal (5,0) (4,1) (3,2) (2,3) on the last drop
    cout << play(a, {0, 1, 1, 2, 2, 3, 2, 3, 3, 6, 3}) << "\\n";
    // red stacks column 0 while yellow stacks column 1: vertical win on a 4x4 board
    cout << play(b, {0, 1, 0, 1, 0, 1, 0}) << "\\n";
    // bottom row 0,1,2,3 for red: horizontal win
    cout << play(c, {0, 0, 1, 1, 2, 2, 3}) << "\\n";
    // 2x2 board, 3 in a row is impossible: the fourth disc ends in a draw
    ConnectFour small(2, 2, 3);
    cout << play(small, {0, 1, 0, 1}) << "\\n";
    for (int col : {0, 7, -1}) {  // full column, past the edge, before the edge
        try { small.drop(col, 'R'); } catch (const invalid_argument& e) { cout << e.what() << "\\n"; }
    }
}` }
    ],
    p07_sol: [
      { lang: 'python', code: `from abc import ABC, abstractmethod

Board = list[list[str]]


class WinRule(ABC):
    """Rules are a strategy, so "3 in a row on 3x3" and "5 in a row on 15x15" share one Game class."""

    @abstractmethod
    def is_win(self, b: Board, r: int, c: int) -> bool: ...


class KInARow(WinRule):
    """K in a row in any of 4 directions, counted outward from the last move only: O(K) per move."""

    DIRECTIONS = ((0, 1), (1, 0), (1, 1), (1, -1))

    def __init__(self, k: int) -> None:
        self._k = k

    def is_win(self, b: Board, r: int, c: int) -> bool:
        p = b[r][c]
        rows, cols = len(b), len(b[0])
        for dr, dc in self.DIRECTIONS:
            count = 1
            for s in (-1, 1):  # walk both ways along the line
                rr, cc = r + s * dr, c + s * dc
                while 0 <= rr < rows and 0 <= cc < cols and b[rr][cc] == p and count < self._k:
                    count += 1
                    rr, cc = rr + s * dr, cc + s * dc
            if count >= self._k:
                return True
        return False


class GridGame:
    def __init__(self, rows: int, cols: int, rule: WinRule, *players: str) -> None:
        self._b: Board = [["."] * cols for _ in range(rows)]
        self._rule = rule
        self._players = players
        self._turn = 0

    def play(self, r: int, c: int) -> str:
        """Returns the winner symbol, or '.' if the game goes on."""
        if not (0 <= r < len(self._b) and 0 <= c < len(self._b[0])):
            raise ValueError("outside the board")
        if self._b[r][c] != ".":
            raise ValueError("occupied")
        p = self._players[self._turn]
        self._b[r][c] = p
        if self._rule.is_win(self._b, r, c):
            return p
        self._turn = (self._turn + 1) % len(self._players)
        return "."


def play_all(g: GridGame, *moves: tuple[int, int]) -> str:
    """Plays the moves in order and returns the last result: a winner symbol, or '.' while the game goes on."""
    last = "."
    for r, c in moves:
        last = g.play(r, c)
    return last


def main() -> None:
    # Gomoku: X builds row 7 from column 3 to 7 while O plays far away
    gomoku = GridGame(15, 15, KInARow(5), "X", "O")
    w = play_all(gomoku, (7, 3), (0, 0), (7, 4), (0, 1), (7, 5), (0, 2), (7, 6), (0, 3), (7, 7))
    print("Winner:", w)  # Winner: X
    # the same class plays 3x3 tic-tac-toe: only the rule object differs
    ttt = GridGame(3, 3, KInARow(3), "X", "O")
    print("Winner:", play_all(ttt, (0, 0), (1, 0), (1, 1), (2, 0), (2, 2)))
    # three players on 4x4, three in a row wins
    three = GridGame(4, 4, KInARow(3), "A", "B", "C")
    print("Winner:", play_all(three, (0, 0), (3, 3), (3, 0), (0, 1), (2, 3), (2, 0), (0, 2)))  # Winner: A
    # a game still running, then the two refused moves
    open_game = GridGame(3, 3, KInARow(3), "X", "O")
    r = play_all(open_game, (0, 0), (1, 1), (0, 1), (1, 0))
    print("nobody yet" if r == "." else f"Winner: {r}")  # nobody yet
    for bad in ((0, 0), (3, 0)):
        try:
            open_game.play(*bad)
        except ValueError as e:
            print(e)


if __name__ == "__main__":
    main()` },
      { lang: 'ts', code: `type Board = string[][];

/** Rules are a strategy, so "3 in a row on 3x3" and "5 in a row on 15x15" share one Game class. */
interface WinRule {
  isWin(b: Board, r: number, c: number): boolean;
}

/** K in a row in any of 4 directions, counted outward from the last move only: O(K) per move. */
class KInARow implements WinRule {
  private static readonly DIRECTIONS: ReadonlyArray<readonly [number, number]> = [[0, 1], [1, 0], [1, 1], [1, -1]];

  constructor(private readonly k: number) {}

  isWin(b: Board, r: number, c: number): boolean {
    const p = b[r][c];
    for (const [dr, dc] of KInARow.DIRECTIONS) {
      let count = 1;
      for (const s of [-1, 1]) { // walk both ways along the line
        let rr = r + s * dr;
        let cc = c + s * dc;
        while (rr >= 0 && rr < b.length && cc >= 0 && cc < b[0].length && b[rr][cc] === p && count < this.k) {
          count++;
          rr += s * dr;
          cc += s * dc;
        }
      }
      if (count >= this.k) return true;
    }
    return false;
  }
}

class GridGame {
  private readonly b: Board;
  private readonly players: string[];
  private turn = 0;

  constructor(rows: number, cols: number, private readonly rule: WinRule, ...players: string[]) {
    this.b = Array.from({ length: rows }, () => new Array<string>(cols).fill("."));
    this.players = players;
  }

  /** Returns the winner symbol, or '.' if the game goes on. */
  play(r: number, c: number): string {
    if (r < 0 || r >= this.b.length || c < 0 || c >= this.b[0].length) throw new Error("outside the board");
    if (this.b[r][c] !== ".") throw new Error("occupied");
    const p = this.players[this.turn];
    this.b[r][c] = p;
    if (this.rule.isWin(this.b, r, c)) return p;
    this.turn = (this.turn + 1) % this.players.length;
    return ".";
  }
}

/** Plays the moves in order and returns the last result: a winner symbol, or '.' while the game goes on. */
function playAll(g: GridGame, ...moves: Array<readonly [number, number]>): string {
  let last = ".";
  for (const [r, c] of moves) last = g.play(r, c);
  return last;
}

// Gomoku: X builds row 7 from column 3 to 7 while O plays far away
const gomoku = new GridGame(15, 15, new KInARow(5), "X", "O");
const w = playAll(gomoku, [7, 3], [0, 0], [7, 4], [0, 1], [7, 5], [0, 2], [7, 6], [0, 3], [7, 7]);
console.log("Winner: " + w); // Winner: X
// the same class plays 3x3 tic-tac-toe: only the rule object differs
const ttt = new GridGame(3, 3, new KInARow(3), "X", "O");
console.log("Winner: " + playAll(ttt, [0, 0], [1, 0], [1, 1], [2, 0], [2, 2]));
// three players on 4x4, three in a row wins
const three = new GridGame(4, 4, new KInARow(3), "A", "B", "C");
console.log("Winner: " + playAll(three, [0, 0], [3, 3], [3, 0], [0, 1], [2, 3], [2, 0], [0, 2])); // Winner: A
// a game still running, then the two refused moves
const running = new GridGame(3, 3, new KInARow(3), "X", "O");
const r = playAll(running, [0, 0], [1, 1], [0, 1], [1, 0]);
console.log(r === "." ? "nobody yet" : "Winner: " + r); // nobody yet
for (const [br, bc] of [[0, 0], [3, 0]]) {
  try {
    running.play(br, bc);
  } catch (e) {
    console.log((e as Error).message);
  }
}` },
      { lang: 'cpp', code: `using Board = vector<string>;

/** Rules are a strategy, so "3 in a row on 3x3" and "5 in a row on 15x15" share one Game class. */
class WinRule {
public:
    virtual ~WinRule() = default;
    virtual bool isWin(const Board& b, int r, int c) const = 0;
};

/** K in a row in any of 4 directions, counted outward from the last move only: O(K) per move. */
class KInARow : public WinRule {
public:
    explicit KInARow(int k) : k_(k) {}

    bool isWin(const Board& b, int r, int c) const override {
        char p = b[r][c];
        int rows = b.size(), cols = b[0].size();
        for (auto [dr, dc] : {pair{0, 1}, pair{1, 0}, pair{1, 1}, pair{1, -1}}) {
            int count = 1;
            for (int s = -1; s <= 1; s += 2) {  // walk both ways along the line
                int rr = r + s * dr, cc = c + s * dc;
                while (rr >= 0 && rr < rows && cc >= 0 && cc < cols && b[rr][cc] == p && count < k_) {
                    count++;
                    rr += s * dr;
                    cc += s * dc;
                }
            }
            if (count >= k_) return true;
        }
        return false;
    }

private:
    int k_;
};

class GridGame {
public:
    GridGame(int rows, int cols, unique_ptr<WinRule> rule, string players)
        : b_(rows, string(cols, '.')), rule_(move(rule)), players_(move(players)) {}

    /** Returns the winner symbol, or '.' if the game goes on. */
    char play(int r, int c) {
        if (r < 0 || r >= int(b_.size()) || c < 0 || c >= int(b_[0].size())) throw invalid_argument("outside the board");
        if (b_[r][c] != '.') throw invalid_argument("occupied");
        char p = players_[turn_];
        b_[r][c] = p;
        if (rule_->isWin(b_, r, c)) return p;
        turn_ = (turn_ + 1) % players_.size();
        return '.';
    }

private:
    Board b_;
    unique_ptr<WinRule> rule_;
    string players_;  // one symbol per player
    size_t turn_ = 0;
};

/** Plays the moves in order and returns the last result: a winner symbol, or '.' while the game goes on. */
char playAll(GridGame& g, const vector<pair<int, int>>& moves) {
    char last = '.';
    for (auto [r, c] : moves) last = g.play(r, c);
    return last;
}

int main() {
    // Gomoku: X builds row 7 from column 3 to 7 while O plays far away
    GridGame gomoku(15, 15, make_unique<KInARow>(5), "XO");
    char w = playAll(gomoku, {{7, 3}, {0, 0}, {7, 4}, {0, 1}, {7, 5}, {0, 2}, {7, 6}, {0, 3}, {7, 7}});
    cout << "Winner: " << w << "\\n";  // Winner: X
    // the same class plays 3x3 tic-tac-toe: only the rule object differs
    GridGame ttt(3, 3, make_unique<KInARow>(3), "XO");
    cout << "Winner: " << playAll(ttt, {{0, 0}, {1, 0}, {1, 1}, {2, 0}, {2, 2}}) << "\\n";
    // three players on 4x4, three in a row wins
    GridGame three(4, 4, make_unique<KInARow>(3), "ABC");
    cout << "Winner: " << playAll(three, {{0, 0}, {3, 3}, {3, 0}, {0, 1}, {2, 3}, {2, 0}, {0, 2}}) << "\\n";  // Winner: A
    // a game still running, then the two refused moves
    GridGame open(3, 3, make_unique<KInARow>(3), "XO");
    char r = playAll(open, {{0, 0}, {1, 1}, {0, 1}, {1, 0}});
    if (r == '.') cout << "nobody yet\\n";  // nobody yet
    else cout << "Winner: " << r << "\\n";
    for (auto [br, bc] : vector<pair<int, int>>{{0, 0}, {3, 0}}) {
        try { open.play(br, bc); } catch (const invalid_argument& e) { cout << e.what() << "\\n"; }
    }
}` }
    ],
    p08_sol: [
      { lang: 'python', code: `import threading
from bisect import bisect_left, bisect_right, insort
from dataclasses import dataclass


class SpotCalendar:
    """Each spot keeps its own calendar: start -> end, sorted, with no overlaps (half-open [start, end))."""

    def __init__(self, spot_id: str) -> None:
        self.spot_id = spot_id
        self._starts: list[int] = []  # sorted
        self._end_of: dict[int, int] = {}

    def is_free(self, start: int, end: int) -> bool:
        """Free if the booking just before ends by \`start\` and the one just after starts at or after \`end\`."""
        i = bisect_right(self._starts, start)  # bookings starting at or before \`start\` are [0, i)
        if i > 0 and self._end_of[self._starts[i - 1]] > start:
            return False
        j = bisect_left(self._starts, start)
        return j == len(self._starts) or self._starts[j] >= end

    def book(self, start: int, end: int) -> None:
        insort(self._starts, start)
        self._end_of[start] = end

    def cancel(self, start: int) -> None:
        self._starts.remove(start)
        del self._end_of[start]


@dataclass(frozen=True)
class Reservation:
    id: str
    spot_id: str
    start: int
    end: int


class ReservationService:
    def __init__(self) -> None:
        self._calendars_by_type: dict[str, list[SpotCalendar]] = {}
        self._by_id: dict[str, Reservation] = {}
        self._calendar_by_id: dict[str, SpotCalendar] = {}
        self._seq = 1
        self._lock = threading.Lock()

    def add_spot(self, spot_type: str, spot_id: str) -> None:
        cal = SpotCalendar(spot_id)
        self._calendars_by_type.setdefault(spot_type, []).append(cal)
        self._calendar_by_id[spot_id] = cal

    def reserve(self, spot_type: str, start: int, end: int) -> Reservation | None:
        if start >= end:
            raise ValueError("start must be before end")
        with self._lock:
            for cal in self._calendars_by_type.get(spot_type, []):
                if cal.is_free(start, end):
                    cal.book(start, end)
                    r = Reservation(f"R{self._seq}", cal.spot_id, start, end)
                    self._seq += 1
                    self._by_id[r.id] = r
                    return r
            return None

    def cancel(self, reservation_id: str) -> bool:
        with self._lock:
            r = self._by_id.pop(reservation_id, None)
            if r is None:
                return False
            self._calendar_by_id[r.spot_id].cancel(r.start)
            return True


def show(r: Reservation | None) -> str:
    return "none" if r is None else f"{r.id} {r.spot_id} [{r.start},{r.end})"


def main() -> None:
    svc = ReservationService()
    svc.add_spot("CAR", "A1")
    svc.add_spot("CAR", "A2")
    print(show(svc.reserve("CAR", 9, 12)))  # R1 on A1
    print(show(svc.reserve("CAR", 10, 11)))  # R2 on A2 (A1 busy 9-12)
    print(show(svc.reserve("CAR", 11, 13)))  # R3 on A2: its [10,11) ends exactly at 11
    print(show(svc.reserve("CAR", 12, 14)))  # R4 on A1: [9,12) and [12,14) touch, no overlap
    print("cancel R2:", str(svc.cancel("R2")).lower())
    print(show(svc.reserve("CAR", 10, 11)))  # R5 on A2 (the freed 10-11 gap)
    print(show(svc.reserve("CAR", 9, 12)))  # none: both spots overlap this window
    print(show(svc.reserve("CAR", 13, 15)))  # R6 on A2: back-to-back after [11,13)
    print(show(svc.reserve("TRUCK", 9, 10)))  # none: no TRUCK spots exist
    print("cancel R2 again:", str(svc.cancel("R2")).lower())  # false: already cancelled
    try:
        svc.reserve("CAR", 5, 5)
    except ValueError as e:
        print(e)


if __name__ == "__main__":
    main()` },
      { lang: 'ts', code: `/** Each spot keeps its own calendar: sorted bookings with no overlaps (half-open [start, end)). */
class SpotCalendar {
  private readonly booked: Array<{ start: number; end: number }> = []; // sorted by start

  constructor(readonly spotId: string) {}

  /** Index of the first booking whose start is >= t. */
  private lowerBound(t: number): number {
    let lo = 0;
    let hi = this.booked.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.booked[mid].start < t) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  /** Free if the booking just before ends by \`start\` and the one just after starts at or after \`end\`. */
  isFree(start: number, end: number): boolean {
    const i = this.lowerBound(start);
    if (i < this.booked.length && this.booked[i].start === start) return false; // same start: overlap
    if (i > 0 && this.booked[i - 1].end > start) return false;
    return i === this.booked.length || this.booked[i].start >= end;
  }

  book(start: number, end: number): void {
    this.booked.splice(this.lowerBound(start), 0, { start, end });
  }

  cancel(start: number): void {
    const i = this.lowerBound(start);
    if (i < this.booked.length && this.booked[i].start === start) this.booked.splice(i, 1);
  }
}

interface Reservation {
  readonly id: string;
  readonly spotId: string;
  readonly start: number;
  readonly end: number;
}

class ReservationService {
  private readonly calendarsByType = new Map<string, SpotCalendar[]>();
  private readonly byId = new Map<string, Reservation>();
  private readonly calendarById = new Map<string, SpotCalendar>();
  private seq = 1;

  addSpot(type: string, spotId: string): void {
    const cal = new SpotCalendar(spotId);
    const list = this.calendarsByType.get(type) ?? [];
    list.push(cal);
    this.calendarsByType.set(type, list);
    this.calendarById.set(spotId, cal);
  }

  reserve(type: string, start: number, end: number): Reservation | undefined {
    if (start >= end) throw new Error("start must be before end");
    for (const cal of this.calendarsByType.get(type) ?? []) {
      if (cal.isFree(start, end)) {
        cal.book(start, end);
        const r: Reservation = { id: \`R\${this.seq++}\`, spotId: cal.spotId, start, end };
        this.byId.set(r.id, r);
        return r;
      }
    }
    return undefined;
  }

  cancel(reservationId: string): boolean {
    const r = this.byId.get(reservationId);
    if (!r) return false;
    this.byId.delete(reservationId);
    this.calendarById.get(r.spotId)?.cancel(r.start);
    return true;
  }
}

function show(r: Reservation | undefined): string {
  return r ? \`\${r.id} \${r.spotId} [\${r.start},\${r.end})\` : "none";
}

const svc = new ReservationService();
svc.addSpot("CAR", "A1");
svc.addSpot("CAR", "A2");
console.log(show(svc.reserve("CAR", 9, 12))); // R1 on A1
console.log(show(svc.reserve("CAR", 10, 11))); // R2 on A2 (A1 busy 9-12)
console.log(show(svc.reserve("CAR", 11, 13))); // R3 on A2: its [10,11) ends exactly at 11
console.log(show(svc.reserve("CAR", 12, 14))); // R4 on A1: [9,12) and [12,14) touch, no overlap
console.log("cancel R2: " + svc.cancel("R2"));
console.log(show(svc.reserve("CAR", 10, 11))); // R5 on A2 (the freed 10-11 gap)
console.log(show(svc.reserve("CAR", 9, 12))); // none: both spots overlap this window
console.log(show(svc.reserve("CAR", 13, 15))); // R6 on A2: back-to-back after [11,13)
console.log(show(svc.reserve("TRUCK", 9, 10))); // none: no TRUCK spots exist
console.log("cancel R2 again: " + svc.cancel("R2")); // false: already cancelled
try {
  svc.reserve("CAR", 5, 5);
} catch (e) {
  console.log((e as Error).message);
}` },
      { lang: 'cpp', code: `/** Each spot keeps its own calendar: start -> end, sorted, with no overlaps (half-open [start, end)). */
class SpotCalendar {
public:
    explicit SpotCalendar(string spotId) : spotId_(move(spotId)) {}
    const string& spotId() const { return spotId_; }

    /** Free if the booking just before ends by \`start\` and the one just after starts at or after \`end\`. */
    bool isFree(int start, int end) const {
        auto after = booked_.lower_bound(start);                // first booking starting at or after \`start\`
        if (after != booked_.end() && after->first == start) return false;
        if (after != booked_.begin() && prev(after)->second > start) return false;
        return after == booked_.end() || after->first >= end;
    }
    void book(int start, int end) { booked_[start] = end; }
    void cancel(int start) { booked_.erase(start); }

private:
    string spotId_;
    map<int, int> booked_;
};

struct Reservation {
    string id, spotId;
    int start, end;
};

class ReservationService {
public:
    void addSpot(const string& type, const string& spotId) {
        auto cal = make_unique<SpotCalendar>(spotId);
        calendarById_[spotId] = cal.get();
        calendarsByType_[type].push_back(move(cal));
    }

    optional<Reservation> reserve(const string& type, int start, int end) {
        if (start >= end) throw invalid_argument("start must be before end");
        lock_guard<mutex> guard(mu_);
        auto it = calendarsByType_.find(type);
        if (it == calendarsByType_.end()) return nullopt;
        for (auto& cal : it->second) {
            if (cal->isFree(start, end)) {
                cal->book(start, end);
                Reservation r{"R" + to_string(seq_++), cal->spotId(), start, end};
                byId_[r.id] = r;
                return r;
            }
        }
        return nullopt;
    }

    bool cancel(const string& reservationId) {
        lock_guard<mutex> guard(mu_);
        auto it = byId_.find(reservationId);
        if (it == byId_.end()) return false;
        calendarById_.at(it->second.spotId)->cancel(it->second.start);
        byId_.erase(it);
        return true;
    }

private:
    map<string, vector<unique_ptr<SpotCalendar>>> calendarsByType_;  // owns the calendars
    map<string, SpotCalendar*> calendarById_;                        // non-owning lookup
    map<string, Reservation> byId_;
    int seq_ = 1;
    mutex mu_;
};

string show(const optional<Reservation>& r) {
    if (!r) return "none";
    return r->id + " " + r->spotId + " [" + to_string(r->start) + "," + to_string(r->end) + ")";
}

int main() {
    ReservationService svc;
    svc.addSpot("CAR", "A1");
    svc.addSpot("CAR", "A2");
    cout << boolalpha;
    cout << show(svc.reserve("CAR", 9, 12)) << "\\n";   // R1 on A1
    cout << show(svc.reserve("CAR", 10, 11)) << "\\n";  // R2 on A2 (A1 busy 9-12)
    cout << show(svc.reserve("CAR", 11, 13)) << "\\n";  // R3 on A2: its [10,11) ends exactly at 11
    cout << show(svc.reserve("CAR", 12, 14)) << "\\n";  // R4 on A1: [9,12) and [12,14) touch, no overlap
    cout << "cancel R2: " << svc.cancel("R2") << "\\n";
    cout << show(svc.reserve("CAR", 10, 11)) << "\\n";  // R5 on A2 (the freed 10-11 gap)
    cout << show(svc.reserve("CAR", 9, 12)) << "\\n";   // none: both spots overlap this window
    cout << show(svc.reserve("CAR", 13, 15)) << "\\n";  // R6 on A2: back-to-back after [11,13)
    cout << show(svc.reserve("TRUCK", 9, 10)) << "\\n"; // none: no TRUCK spots exist
    cout << "cancel R2 again: " << svc.cancel("R2") << "\\n";  // false: already cancelled
    try { svc.reserve("CAR", 5, 5); } catch (const invalid_argument& e) { cout << e.what() << "\\n"; }
}` }
    ],
    p09_sol: [
      { lang: 'python', code: `import math
from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum


@dataclass(frozen=True)
class Stay:
    """What we know about one stay when we price it."""
    hours: int
    kwh_charged: float
    valet: bool

    def __post_init__(self) -> None:
        if self.hours < 0 or self.kwh_charged < 0:
            raise ValueError("stay values must not be negative")


class Pricing(ABC):
    @abstractmethod
    def fee(self, s: Stay) -> int: ...

    @abstractmethod
    def describe(self) -> str: ...


class Hourly(Pricing):
    def __init__(self, rate: int) -> None:
        self._rate = rate

    def fee(self, s: Stay) -> int:
        return max(1, s.hours) * self._rate

    def describe(self) -> str:
        return f"hourly@{self._rate}"


class PricingAddOn(Pricing, ABC):
    """Decorator base: wraps another Pricing and adds something on top."""

    def __init__(self, inner: Pricing) -> None:
        self._inner = inner


class ChargingAddOn(PricingAddOn):
    def __init__(self, inner: Pricing, per_kwh: float) -> None:
        super().__init__(inner)
        self._per_kwh = per_kwh

    def fee(self, s: Stay) -> int:
        # half rounds up like Java's Math.round (Python's round() rounds half to even)
        return self._inner.fee(s) + math.floor(s.kwh_charged * self._per_kwh + 0.5)

    def describe(self) -> str:
        return f"{self._inner.describe()} + charging@{self._per_kwh:.1f}/kWh"


class ValetAddOn(PricingAddOn):
    def __init__(self, inner: Pricing, valet_fee: int) -> None:
        super().__init__(inner)
        self._valet_fee = valet_fee

    def fee(self, s: Stay) -> int:
        return self._inner.fee(s) + (self._valet_fee if s.valet else 0)

    def describe(self) -> str:
        return f"{self._inner.describe()} + valet"


class SpotKind(Enum):
    REGULAR = "REGULAR"
    EV = "EV"


def pricing_for_spot(kind: SpotKind) -> Pricing:
    """Picks the pricing chain by spot kind: an EV spot simply gets one more wrapper."""
    p: Pricing = ValetAddOn(Hourly(20), 100)
    return ChargingAddOn(p, 15.0) if kind is SpotKind.EV else p


def main() -> None:
    ev = pricing_for_spot(SpotKind.EV)
    regular = pricing_for_spot(SpotKind.REGULAR)
    print(ev.describe())  # hourly@20 + valet + charging@15.0/kWh
    print(ev.fee(Stay(3, 10.0, False)))  # 60 + 150 = 210
    print(regular.fee(Stay(3, 0, True)))  # 60 + 100 = 160
    print(ev.fee(Stay(2, 1.5, True)))  # 40 + 100 + round(22.5) = 163 (half rounds up)
    print(regular.describe())  # hourly@20 + valet
    print(ev.fee(Stay(0, 0, False)))  # a stay bills at least one hour: 20
    try:
        Stay(-1, 0, False)
    except ValueError as e:
        print(e)


if __name__ == "__main__":
    main()` },
      { lang: 'ts', code: `/** What we know about one stay when we price it. */
class Stay {
  constructor(readonly hours: number, readonly kwhCharged: number, readonly valet: boolean) {
    if (hours < 0 || kwhCharged < 0) throw new Error("stay values must not be negative");
  }
}

interface Pricing {
  fee(s: Stay): number;
  describe(): string;
}

class Hourly implements Pricing {
  constructor(private readonly rate: number) {}
  fee(s: Stay): number { return Math.max(1, s.hours) * this.rate; }
  describe(): string { return \`hourly@\${this.rate}\`; }
}

/** Decorator base: wraps another Pricing and adds something on top. */
abstract class PricingAddOn implements Pricing {
  constructor(protected readonly inner: Pricing) {}
  abstract fee(s: Stay): number;
  abstract describe(): string;
}

class ChargingAddOn extends PricingAddOn {
  constructor(inner: Pricing, private readonly perKwh: number) {
    super(inner);
  }
  fee(s: Stay): number { return this.inner.fee(s) + Math.round(s.kwhCharged * this.perKwh); }
  describe(): string { return \`\${this.inner.describe()} + charging@\${this.perKwh.toFixed(1)}/kWh\`; }
}

class ValetAddOn extends PricingAddOn {
  constructor(inner: Pricing, private readonly valetFee: number) {
    super(inner);
  }
  fee(s: Stay): number { return this.inner.fee(s) + (s.valet ? this.valetFee : 0); }
  describe(): string { return \`\${this.inner.describe()} + valet\`; }
}

type SpotKind = "REGULAR" | "EV";

/** Picks the pricing chain by spot kind: an EV spot simply gets one more wrapper. */
function pricingForSpot(kind: SpotKind): Pricing {
  const p: Pricing = new ValetAddOn(new Hourly(20), 100);
  return kind === "EV" ? new ChargingAddOn(p, 15.0) : p;
}

const ev = pricingForSpot("EV");
const regular = pricingForSpot("REGULAR");
console.log(ev.describe()); // hourly@20 + valet + charging@15.0/kWh
console.log(ev.fee(new Stay(3, 10.0, false))); // 60 + 150 = 210
console.log(regular.fee(new Stay(3, 0, true))); // 60 + 100 = 160
console.log(ev.fee(new Stay(2, 1.5, true))); // 40 + 100 + round(22.5) = 163 (half rounds up)
console.log(regular.describe()); // hourly@20 + valet
console.log(ev.fee(new Stay(0, 0, false))); // a stay bills at least one hour: 20
try {
  new Stay(-1, 0, false);
} catch (e) {
  console.log((e as Error).message);
}` },
      { lang: 'cpp', code: `/** What we know about one stay when we price it. */
class Stay {
public:
    Stay(long long hours, double kwhCharged, bool valet) : hours_(hours), kwh_(kwhCharged), valet_(valet) {
        if (hours < 0 || kwhCharged < 0) throw invalid_argument("stay values must not be negative");
    }
    long long hours() const { return hours_; }
    double kwhCharged() const { return kwh_; }
    bool valet() const { return valet_; }

private:
    long long hours_;
    double kwh_;
    bool valet_;
};

class Pricing {
public:
    virtual ~Pricing() = default;
    virtual long long fee(const Stay& s) const = 0;
    virtual string describe() const = 0;
};

class Hourly : public Pricing {
public:
    explicit Hourly(long long rate) : rate_(rate) {}
    long long fee(const Stay& s) const override { return max(1LL, s.hours()) * rate_; }
    string describe() const override { return "hourly@" + to_string(rate_); }

private:
    long long rate_;
};

/** Decorator base: owns another Pricing and adds something on top. */
class PricingAddOn : public Pricing {
protected:
    explicit PricingAddOn(unique_ptr<Pricing> inner) : inner_(move(inner)) {}
    unique_ptr<Pricing> inner_;
};

class ChargingAddOn : public PricingAddOn {
public:
    ChargingAddOn(unique_ptr<Pricing> inner, double perKwh) : PricingAddOn(move(inner)), perKwh_(perKwh) {}
    long long fee(const Stay& s) const override { return inner_->fee(s) + llround(s.kwhCharged() * perKwh_); }
    string describe() const override {
        ostringstream out;
        out << inner_->describe() << " + charging@" << fixed << setprecision(1) << perKwh_ << "/kWh";
        return out.str();
    }

private:
    double perKwh_;
};

class ValetAddOn : public PricingAddOn {
public:
    ValetAddOn(unique_ptr<Pricing> inner, long long valetFee) : PricingAddOn(move(inner)), valetFee_(valetFee) {}
    long long fee(const Stay& s) const override { return inner_->fee(s) + (s.valet() ? valetFee_ : 0); }
    string describe() const override { return inner_->describe() + " + valet"; }

private:
    long long valetFee_;
};

enum class SpotKind { Regular, Ev };

/** Picks the pricing chain by spot kind: an EV spot simply gets one more wrapper. */
unique_ptr<Pricing> pricingForSpot(SpotKind kind) {
    unique_ptr<Pricing> p = make_unique<ValetAddOn>(make_unique<Hourly>(20), 100);
    if (kind == SpotKind::Ev) return make_unique<ChargingAddOn>(move(p), 15.0);
    return p;
}

int main() {
    auto ev = pricingForSpot(SpotKind::Ev);
    auto regular = pricingForSpot(SpotKind::Regular);
    cout << ev->describe() << "\\n";                        // hourly@20 + valet + charging@15.0/kWh
    cout << ev->fee(Stay(3, 10.0, false)) << "\\n";         // 60 + 150 = 210
    cout << regular->fee(Stay(3, 0, true)) << "\\n";        // 60 + 100 = 160
    cout << ev->fee(Stay(2, 1.5, true)) << "\\n";           // 40 + 100 + round(22.5) = 163 (half rounds up)
    cout << regular->describe() << "\\n";                   // hourly@20 + valet
    cout << ev->fee(Stay(0, 0, false)) << "\\n";            // a stay bills at least one hour: 20
    try { Stay bad(-1, 0, false); } catch (const invalid_argument& e) { cout << e.what() << "\\n"; }
}` }
    ],
    p10_sol: [
      { lang: 'python', code: `import heapq
import threading
from abc import ABC, abstractmethod


class GateAwareStrategy(ABC):
    """Strategy: choose a spot for an arriving vehicle at a given gate."""

    @abstractmethod
    def allocate(self, gate: int) -> int:
        """Returns a spot id or -1."""

    @abstractmethod
    def release(self, spot: int) -> None: ...


class NearestToGate(GateAwareStrategy):
    """One min-heap of spots per gate, ordered by (distance from that gate, spot id).

    A freed spot is pushed back into every heap that does not already hold it. Spots taken via
    another gate stay in this heap as stale entries and are skipped when popped (lazy deletion).
    """

    def __init__(self, dist: list[list[int]]) -> None:
        self._dist = dist
        spots = len(dist[0])
        self._taken = [False] * spots
        self._queued = [[True] * spots for _ in dist]  # queued[gate][spot]: spot is already in that gate's heap
        self._heaps = [sorted((row[s], s) for s in range(spots)) for row in dist]  # a sorted list is a valid heap
        self._lock = threading.Lock()

    def allocate(self, gate: int) -> int:
        with self._lock:
            heap = self._heaps[gate]
            while heap:
                _, s = heapq.heappop(heap)
                self._queued[gate][s] = False
                if not self._taken[s]:  # stale entries are simply dropped
                    self._taken[s] = True
                    return s
            return -1

    def release(self, spot: int) -> None:
        with self._lock:
            if not self._taken[spot]:
                raise RuntimeError(f"Spot {spot} is not taken")
            self._taken[spot] = False
            for g, heap in enumerate(self._heaps):
                if not self._queued[g][spot]:  # never twice in one heap
                    heapq.heappush(heap, (self._dist[g][spot], spot))
                    self._queued[g][spot] = True

    def pending(self, gate: int) -> int:
        with self._lock:
            return len(self._heaps[gate])


def main() -> None:
    dist = [[1, 2, 3, 4], [4, 3, 2, 1]]  # gate 0 is near spot 0, gate 1 near spot 3
    st = NearestToGate(dist)
    print(st.allocate(0))  # 0
    print(st.allocate(1))  # 3
    print(st.allocate(1))  # 2
    st.release(3)
    print(st.allocate(1))  # 3 again
    print(st.allocate(0))  # 1
    print(st.allocate(0))  # -1: every spot is taken
    st.release(0)
    print(st.allocate(1))  # 0: spot 1 is a stale entry in gate 1's heap and is skipped
    st.release(0)
    try:
        st.release(0)
    except RuntimeError as e:
        print(e)

    busy = NearestToGate(dist)
    for _ in range(1000):  # churn through gate 1 only
        busy.release(busy.allocate(1))
    print(f"gate 0 heap holds {busy.pending(0)} entries")  # still 4, not 1004

    ties = NearestToGate([[5, 5, 5]])  # equal distances: smaller id first
    print(" ".join(str(ties.allocate(0)) for _ in range(4)))  # 0 1 2 -1


if __name__ == "__main__":
    main()` },
      { lang: 'ts', code: `/** Small binary min-heap ordered by a comparator. */
class MinHeap<T> {
  private readonly items: T[] = [];

  constructor(private readonly less: (a: T, b: T) => boolean) {}

  get size(): number { return this.items.length; }

  push(x: T): void {
    const a = this.items;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }

  pop(): T | undefined {
    const a = this.items;
    if (a.length === 0) return undefined;
    const top = a[0];
    const last = a.pop() as T;
    if (a.length > 0) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (r < a.length && this.less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

/** Strategy: choose a spot for an arriving vehicle at a given gate. */
interface GateAwareStrategy {
  allocate(gate: number): number; // returns spot id or -1
  release(spot: number): void;
}

/**
 * One min-heap of spots per gate, ordered by distance from that gate (ties: smaller id).
 * A freed spot is pushed back into every heap that does not already hold it. Spots taken via
 * another gate stay in this heap as stale entries and are skipped when popped (lazy deletion).
 */
class NearestToGate implements GateAwareStrategy {
  private readonly taken: boolean[];
  private readonly queued: boolean[][]; // queued[gate][spot]: spot is already in that gate's heap
  private readonly heaps: MinHeap<number>[];

  constructor(private readonly dist: number[][]) {
    const spots = dist[0].length;
    this.taken = new Array<boolean>(spots).fill(false);
    this.queued = dist.map(() => new Array<boolean>(spots).fill(true));
    this.heaps = dist.map((row) => {
      const heap = new MinHeap<number>((a, b) => row[a] < row[b] || (row[a] === row[b] && a < b));
      for (let s = 0; s < spots; s++) heap.push(s);
      return heap;
    });
  }

  allocate(gate: number): number {
    const heap = this.heaps[gate];
    for (let s = heap.pop(); s !== undefined; s = heap.pop()) {
      this.queued[gate][s] = false;
      if (!this.taken[s]) { // stale entries are simply dropped
        this.taken[s] = true;
        return s;
      }
    }
    return -1;
  }

  release(spot: number): void {
    if (!this.taken[spot]) throw new Error(\`Spot \${spot} is not taken\`);
    this.taken[spot] = false;
    this.heaps.forEach((heap, g) => {
      if (!this.queued[g][spot]) { // never twice in one heap
        heap.push(spot);
        this.queued[g][spot] = true;
      }
    });
  }

  pending(gate: number): number {
    return this.heaps[gate].size;
  }
}

const dist = [[1, 2, 3, 4], [4, 3, 2, 1]]; // gate 0 is near spot 0, gate 1 near spot 3
const st = new NearestToGate(dist);
console.log(st.allocate(0)); // 0
console.log(st.allocate(1)); // 3
console.log(st.allocate(1)); // 2
st.release(3);
console.log(st.allocate(1)); // 3 again
console.log(st.allocate(0)); // 1
console.log(st.allocate(0)); // -1: every spot is taken
st.release(0);
console.log(st.allocate(1)); // 0: spot 1 is a stale entry in gate 1's heap and is skipped
st.release(0);
try {
  st.release(0);
} catch (e) {
  console.log((e as Error).message);
}

const busy = new NearestToGate(dist);
for (let i = 0; i < 1000; i++) busy.release(busy.allocate(1)); // churn through gate 1 only
console.log(\`gate 0 heap holds \${busy.pending(0)} entries\`); // still 4, not 1004

const ties = new NearestToGate([[5, 5, 5]]); // equal distances: smaller id first
console.log([ties.allocate(0), ties.allocate(0), ties.allocate(0), ties.allocate(0)].join(" ")); // 0 1 2 -1` },
      { lang: 'cpp', code: `/** Strategy: choose a spot for an arriving vehicle at a given gate. */
class GateAwareStrategy {
public:
    virtual ~GateAwareStrategy() = default;
    virtual int allocate(int gate) = 0;  // returns spot id or -1
    virtual void release(int spot) = 0;
};

/**
 * One min-heap of spots per gate, ordered by (distance from that gate, spot id).
 * A freed spot is pushed back into every heap that does not already hold it. Spots taken via
 * another gate stay in this heap as stale entries and are skipped when popped (lazy deletion).
 */
class NearestToGate : public GateAwareStrategy {
public:
    explicit NearestToGate(vector<vector<int>> dist) : dist_(move(dist)) {
        int spots = dist_[0].size();
        taken_.assign(spots, false);
        queued_.assign(dist_.size(), vector<bool>(spots, true));  // queued_[gate][spot]: already in that gate's heap
        heaps_.resize(dist_.size());
        for (size_t g = 0; g < dist_.size(); g++)
            for (int s = 0; s < spots; s++) heaps_[g].push({dist_[g][s], s});
    }

    int allocate(int gate) override {
        lock_guard<mutex> guard(mu_);
        auto& heap = heaps_[gate];
        while (!heap.empty()) {
            int s = heap.top().second;
            heap.pop();
            queued_[gate][s] = false;
            if (!taken_[s]) {  // stale entries are simply dropped
                taken_[s] = true;
                return s;
            }
        }
        return -1;
    }

    void release(int spot) override {
        lock_guard<mutex> guard(mu_);
        if (!taken_[spot]) throw runtime_error("Spot " + to_string(spot) + " is not taken");
        taken_[spot] = false;
        for (size_t g = 0; g < heaps_.size(); g++) {
            if (!queued_[g][spot]) {  // never twice in one heap
                heaps_[g].push({dist_[g][spot], spot});
                queued_[g][spot] = true;
            }
        }
    }

    size_t pending(int gate) {
        lock_guard<mutex> guard(mu_);
        return heaps_[gate].size();
    }

private:
    using Entry = pair<int, int>;  // (distance, spot id): the pair order breaks ties by id
    vector<vector<int>> dist_;
    vector<bool> taken_;
    vector<vector<bool>> queued_;
    vector<priority_queue<Entry, vector<Entry>, greater<Entry>>> heaps_;
    mutex mu_;
};

int main() {
    vector<vector<int>> dist = {{1, 2, 3, 4}, {4, 3, 2, 1}};  // gate 0 is near spot 0, gate 1 near spot 3
    NearestToGate st(dist);
    cout << st.allocate(0) << "\\n";  // 0
    cout << st.allocate(1) << "\\n";  // 3
    cout << st.allocate(1) << "\\n";  // 2
    st.release(3);
    cout << st.allocate(1) << "\\n";  // 3 again
    cout << st.allocate(0) << "\\n";  // 1
    cout << st.allocate(0) << "\\n";  // -1: every spot is taken
    st.release(0);
    cout << st.allocate(1) << "\\n";  // 0: spot 1 is a stale entry in gate 1's heap and is skipped
    st.release(0);
    try { st.release(0); } catch (const runtime_error& e) { cout << e.what() << "\\n"; }

    NearestToGate busy(dist);
    for (int i = 0; i < 1000; i++) busy.release(busy.allocate(1));  // churn through gate 1 only
    cout << "gate 0 heap holds " << busy.pending(0) << " entries\\n";  // still 4, not 1004

    NearestToGate ties({{5, 5, 5}});  // equal distances: smaller id first
    int a = ties.allocate(0), b = ties.allocate(0), c = ties.allocate(0), d = ties.allocate(0);
    cout << a << " " << b << " " << c << " " << d << "\\n";  // 0 1 2 -1
}` }
    ],
    p11_sol: [
      { lang: 'python', code: `import queue
import threading
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from enum import Enum


class SpotType(Enum):
    SMALL = 0
    COMPACT = 1
    LARGE = 2


class AtomicRef:
    """A tiny compare-and-set cell (Python has no AtomicReference)."""

    def __init__(self) -> None:
        self._value: str | None = None
        self._lock = threading.Lock()

    def compare_and_set(self, expected: str | None, new: str | None) -> bool:
        with self._lock:
            if self._value != expected:
                return False
            self._value = new
            return True


@dataclass(eq=False)
class Spot:
    id: int
    type: SpotType
    plate: AtomicRef = field(default_factory=AtomicRef)  # empty = free


class ConcurrentLot:
    """Free spots per type live in a thread-safe queue.

    get_nowait() hands each spot to exactly ONE thread, so two gates can never receive the same spot.
    The compare-and-set on the spot is a second safety net (and catches bugs like double release).
    """

    def __init__(self, spots: list[Spot]) -> None:
        self._free: dict[SpotType, queue.SimpleQueue[Spot]] = {t: queue.SimpleQueue() for t in SpotType}
        for s in spots:
            self._free[s.type].put(s)
        self._by_plate: dict[str, Spot] = {}
        self._inside: set[str] = set()  # plates that hold or are getting a spot
        self._lock = threading.Lock()  # guards the two collections above, never held while waiting

    def park(self, plate: str, spot_type: SpotType) -> Spot | None:
        with self._lock:  # atomic claim
            if plate in self._inside:
                raise RuntimeError(f"{plate} already inside")
            self._inside.add(plate)
        try:
            s = self._free[spot_type].get_nowait()  # atomic hand-off
        except queue.Empty:
            with self._lock:
                self._inside.discard(plate)
            return None
        if not s.plate.compare_and_set(None, plate):
            raise RuntimeError(f"corrupted spot {s.id}")
        with self._lock:
            self._by_plate[plate] = s
        return s

    def leave(self, plate: str) -> None:
        with self._lock:
            s = self._by_plate.pop(plate, None)  # only one thread can remove a key
        if s is None:
            raise LookupError(f"{plate} is not inside")
        if not s.plate.compare_and_set(plate, None):
            raise RuntimeError(f"double release {s.id}")
        self._free[s.type].put(s)  # publish AFTER clearing the spot
        with self._lock:
            self._inside.discard(plate)

    def parked_count(self) -> int:
        with self._lock:
            return len(self._by_plate)


def main() -> None:
    lot = ConcurrentLot([Spot(i, SpotType.COMPACT) for i in range(500)])
    used: set[int] = set()
    parked: list[str] = []
    dup = 0
    tally = threading.Lock()

    def gate(g: int) -> None:
        nonlocal dup
        for i in range(125):  # 1000 cars for 500 spots
            plate = f"G{g}-{i}"
            s = lot.park(plate, SpotType.COMPACT)
            if s is not None:
                with tally:
                    parked.append(plate)
                    if s.id in used:
                        dup += 1
                    used.add(s.id)

    with ThreadPoolExecutor(max_workers=8) as gates:  # 8 entry gates
        for f in [gates.submit(gate, g) for g in range(8)]:
            f.result()
    print(f"parked={len(parked)} duplicates={dup} inside={lot.parked_count()}")  # parked=500 duplicates=0 inside=500

    print("full lot refuses:", str(lot.park("LATE", SpotType.COMPACT) is None).lower())  # true
    try:
        lot.leave("NOPE")
    except LookupError as e:
        print(e.args[0])
    lot.leave(parked[0])  # one car (any) drives out
    print(f"inside={lot.parked_count()}")  # 499
    print("LATE parked:", str(lot.park("LATE", SpotType.COMPACT) is not None).lower())  # true: it took the freed spot
    try:
        lot.park("LATE", SpotType.COMPACT)
    except RuntimeError as e:
        print(e)
    print(f"inside={lot.parked_count()}")  # 500


if __name__ == "__main__":
    main()` },
      { lang: 'ts', code: `enum SpotType { SMALL, COMPACT, LARGE }

class Spot {
  plate: string | null = null; // null = free
  constructor(readonly id: number, readonly type: SpotType) {}

  /** Compare-and-set. JavaScript runs one callback at a time, so no lock is needed here. */
  compareAndSet(expected: string | null, next: string | null): boolean {
    if (this.plate !== expected) return false;
    this.plate = next;
    return true;
  }
}

/**
 * Free spots per type live in a queue. shift() hands each spot to exactly ONE caller, so two gates
 * can never receive the same spot. The compare-and-set on the spot is a second safety net.
 * JavaScript has no shared-memory threads: each call below runs to completion before another
 * starts (there is no \`await\` inside), which is what makes check-then-act atomic here.
 */
class ConcurrentLot {
  private readonly free = new Map<SpotType, Spot[]>();
  private readonly byPlate = new Map<string, Spot>();
  private readonly inside = new Set<string>(); // plates that hold or are getting a spot

  constructor(spots: Spot[]) {
    for (const t of [SpotType.SMALL, SpotType.COMPACT, SpotType.LARGE]) this.free.set(t, []);
    for (const s of spots) this.free.get(s.type)?.push(s);
  }

  park(plate: string, type: SpotType): Spot | undefined {
    if (this.inside.has(plate)) throw new Error(\`\${plate} already inside\`); // atomic claim
    this.inside.add(plate);
    const s = this.free.get(type)?.shift(); // atomic hand-off
    if (!s) {
      this.inside.delete(plate);
      return undefined;
    }
    if (!s.compareAndSet(null, plate)) throw new Error(\`corrupted spot \${s.id}\`);
    this.byPlate.set(plate, s);
    return s;
  }

  leave(plate: string): void {
    const s = this.byPlate.get(plate);
    if (!s) throw new Error(\`\${plate} is not inside\`);
    this.byPlate.delete(plate);
    if (!s.compareAndSet(plate, null)) throw new Error(\`double release \${s.id}\`);
    this.free.get(s.type)?.push(s); // publish AFTER clearing the spot
    this.inside.delete(plate);
  }

  parkedCount(): number {
    return this.byPlate.size;
  }
}

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0)); // lets other gates run

async function main(): Promise<void> {
  const spots: Spot[] = [];
  for (let i = 0; i < 500; i++) spots.push(new Spot(i, SpotType.COMPACT));
  const lot = new ConcurrentLot(spots);
  const used = new Set<number>();
  const parked: string[] = [];
  let dup = 0;

  const gate = async (g: number): Promise<void> => {
    for (let i = 0; i < 125; i++) { // 1000 cars for 500 spots
      const plate = \`G\${g}-\${i}\`;
      const s = lot.park(plate, SpotType.COMPACT);
      if (s) {
        parked.push(plate);
        if (used.has(s.id)) dup++;
        used.add(s.id);
      }
      if (i % 5 === 0) await tick(); // gates interleave between cars
    }
  };
  await Promise.all(Array.from({ length: 8 }, (_, g) => gate(g))); // 8 entry gates
  console.log(\`parked=\${parked.length} duplicates=\${dup} inside=\${lot.parkedCount()}\`); // parked=500 duplicates=0 inside=500

  console.log("full lot refuses: " + (lot.park("LATE", SpotType.COMPACT) === undefined)); // true
  try {
    lot.leave("NOPE");
  } catch (e) {
    console.log((e as Error).message);
  }
  lot.leave(parked[0]); // one car (any) drives out
  console.log(\`inside=\${lot.parkedCount()}\`); // 499
  console.log("LATE parked: " + (lot.park("LATE", SpotType.COMPACT) !== undefined)); // true: it took the freed spot
  try {
    lot.park("LATE", SpotType.COMPACT);
  } catch (e) {
    console.log((e as Error).message);
  }
  console.log(\`inside=\${lot.parkedCount()}\`); // 500
}

void main();` },
      { lang: 'cpp', code: `enum class SpotType { Small, Compact, Large };

struct Spot {
    int id;
    SpotType type;
    atomic<bool> occupied{false};
    string plate;  // written only by the thread that owns the spot
    Spot(int id, SpotType type) : id(id), type(type) {}
};

/** Thread-safe FIFO: pop() hands each element to exactly ONE thread. */
template <class T>
class SafeQueue {
public:
    void push(T x) {
        lock_guard<mutex> guard(mu_);
        items_.push_back(x);
    }
    optional<T> pop() {
        lock_guard<mutex> guard(mu_);
        if (items_.empty()) return nullopt;
        T x = items_.front();
        items_.pop_front();
        return x;
    }

private:
    mutex mu_;
    deque<T> items_;
};

/**
 * Free spots per type live in a SafeQueue, so two gates can never receive the same spot.
 * The compare-and-swap on the spot is a second safety net (and catches bugs like double release).
 */
class ConcurrentLot {
public:
    explicit ConcurrentLot(vector<unique_ptr<Spot>>& spots) {
        for (auto& s : spots) free_[s->type].push(s.get());
    }

    Spot* park(const string& plate, SpotType type) {
        {
            lock_guard<mutex> guard(mu_);  // atomic claim
            if (!inside_.insert(plate).second) throw logic_error(plate + " already inside");
        }
        optional<Spot*> got = free_[type].pop();  // atomic hand-off
        if (!got) {
            lock_guard<mutex> guard(mu_);
            inside_.erase(plate);
            return nullptr;
        }
        Spot* s = *got;
        bool expected = false;
        if (!s->occupied.compare_exchange_strong(expected, true)) throw logic_error("corrupted spot " + to_string(s->id));
        s->plate = plate;
        lock_guard<mutex> guard(mu_);
        byPlate_[plate] = s;
        return s;
    }

    void leave(const string& plate) {
        Spot* s = nullptr;
        {
            lock_guard<mutex> guard(mu_);
            auto it = byPlate_.find(plate);  // only one thread can remove a key
            if (it == byPlate_.end()) throw out_of_range(plate + " is not inside");
            s = it->second;
            byPlate_.erase(it);
        }
        s->plate.clear();
        if (!s->occupied.exchange(false)) throw logic_error("double release " + to_string(s->id));
        free_[s->type].push(s);  // publish AFTER clearing the spot
        lock_guard<mutex> guard(mu_);
        inside_.erase(plate);
    }

    size_t parkedCount() {
        lock_guard<mutex> guard(mu_);
        return byPlate_.size();
    }

private:
    map<SpotType, SafeQueue<Spot*>> free_;  // fixed after construction
    map<string, Spot*> byPlate_;
    set<string> inside_;  // plates that hold or are getting a spot
    mutex mu_;
};

int main() {
    vector<unique_ptr<Spot>> spots;
    for (int i = 0; i < 500; i++) spots.push_back(make_unique<Spot>(i, SpotType::Compact));
    ConcurrentLot lot(spots);
    set<int> used;
    vector<string> parked;
    int dup = 0;
    mutex tally;

    vector<thread> gates;  // 8 entry gates
    for (int g = 0; g < 8; g++) {
        gates.emplace_back([&, g] {
            for (int i = 0; i < 125; i++) {  // 1000 cars for 500 spots
                string plate = "G" + to_string(g) + "-" + to_string(i);
                if (Spot* s = lot.park(plate, SpotType::Compact)) {
                    lock_guard<mutex> guard(tally);
                    parked.push_back(plate);
                    if (!used.insert(s->id).second) dup++;
                }
            }
        });
    }
    for (auto& t : gates) t.join();
    cout << "parked=" << parked.size() << " duplicates=" << dup << " inside=" << lot.parkedCount() << "\\n";  // parked=500 duplicates=0 inside=500

    cout << boolalpha;
    cout << "full lot refuses: " << (lot.park("LATE", SpotType::Compact) == nullptr) << "\\n";  // true
    try { lot.leave("NOPE"); } catch (const out_of_range& e) { cout << e.what() << "\\n"; }
    lot.leave(parked.front());  // one car (any) drives out
    cout << "inside=" << lot.parkedCount() << "\\n";  // 499
    cout << "LATE parked: " << (lot.park("LATE", SpotType::Compact) != nullptr) << "\\n";  // true: it took the freed spot
    try { lot.park("LATE", SpotType::Compact); } catch (const logic_error& e) { cout << e.what() << "\\n"; }
    cout << "inside=" << lot.parkedCount() << "\\n";  // 500
}` }
    ],
    p12_sol: [
      { lang: 'python', code: `from abc import ABC, abstractmethod

Board = list[list[str]]


class Player(ABC):
    """The same Player interface the game already uses: a bot is just another strategy."""

    @abstractmethod
    def symbol(self) -> str: ...

    @abstractmethod
    def choose_move(self, board: Board) -> tuple[int, int]: ...


def wins(b: Board, p: str) -> bool:
    lines = [row for row in b] + [[b[r][c] for r in range(3)] for c in range(3)]
    lines.append([b[i][i] for i in range(3)])
    lines.append([b[i][2 - i] for i in range(3)])
    return any(line == [p, p, p] for line in lines)


def full(b: Board) -> bool:
    return all(cell != "." for row in b for cell in row)


class MinimaxBot(Player):
    """Minimax with alpha-beta pruning: never loses at 3x3 tic-tac-toe."""

    def __init__(self, me: str, them: str) -> None:
        self._me, self._them = me, them

    def symbol(self) -> str:
        return self._me

    def choose_move(self, b: Board) -> tuple[int, int]:
        best, move = -(10**9), None
        for r in range(3):
            for c in range(3):
                if b[r][c] != ".":
                    continue
                b[r][c] = self._me
                score = self._minimax(b, False, 1, -(10**9), 10**9)
                b[r][c] = "."
                if score > best:
                    best, move = score, (r, c)
        if move is None:
            raise RuntimeError("board is full")
        return move

    def _minimax(self, b: Board, my_turn: bool, depth: int, alpha: int, beta: int) -> int:
        """Score from the bot's view: +10 - depth for a win (win sooner is better), depth - 10 for a loss."""
        if wins(b, self._me):
            return 10 - depth
        if wins(b, self._them):
            return depth - 10
        if full(b):
            return 0
        best = -(10**9) if my_turn else 10**9
        for r in range(3):
            for c in range(3):
                if b[r][c] != ".":
                    continue
                b[r][c] = self._me if my_turn else self._them
                s = self._minimax(b, not my_turn, depth + 1, alpha, beta)
                b[r][c] = "."
                if my_turn:
                    best = max(best, s)
                    alpha = max(alpha, s)
                else:
                    best = min(best, s)
                    beta = min(beta, s)
                if beta <= alpha:  # prune: opponent will never allow this line
                    return best
        return best


class FirstFreePlayer(Player):
    """A weak player that takes the first empty cell: it plugs into the same interface."""

    def __init__(self, me: str) -> None:
        self._me = me

    def symbol(self) -> str:
        return self._me

    def choose_move(self, b: Board) -> tuple[int, int]:
        for r in range(3):
            for c in range(3):
                if b[r][c] == ".":
                    return r, c
        raise RuntimeError("board is full")


def board(*rows: str) -> Board:
    return [list(row) for row in rows]


def play(x: Player, o: Player) -> str:
    """The existing game loop: ask each Player in turn. It cannot tell a human from a bot."""
    b = board("...", "...", "...")
    turn = (x, o)
    for i in range(9):
        p = turn[i % 2]
        r, c = p.choose_move(b)
        b[r][c] = p.symbol()
        if wins(b, p.symbol()):
            return p.symbol()
    return "draw"


def main() -> None:
    r, c = MinimaxBot("O", "X").choose_move(board("XX.", "OO.", "..."))
    print(f"{r},{c}")  # 1,2 : win now rather than block
    r, c = MinimaxBot("O", "X").choose_move(board("XX.", ".O.", "..."))
    print(f"{r},{c}")  # 0,2 : must block X
    print(play(MinimaxBot("X", "O"), MinimaxBot("O", "X")))  # draw: perfect play
    print(play(MinimaxBot("X", "O"), FirstFreePlayer("O")))  # X: the bot beats a weak player
    print(play(FirstFreePlayer("X"), MinimaxBot("O", "X")))  # O: and it wins from the second seat
    try:
        MinimaxBot("O", "X").choose_move(board("XOX", "XOO", "OXX"))
    except RuntimeError as e:
        print(e)  # board is full


if __name__ == "__main__":
    main()` },
      { lang: 'ts', code: `type Board = string[][];
type Move = readonly [row: number, col: number];

/** The same Player interface the game already uses: a bot is just another strategy. */
interface Player {
  symbol(): string;
  chooseMove(board: Board): Move;
}

function wins(b: Board, p: string): boolean {
  for (let i = 0; i < 3; i++) {
    if ((b[i][0] === p && b[i][1] === p && b[i][2] === p) || (b[0][i] === p && b[1][i] === p && b[2][i] === p)) return true;
  }
  return (b[0][0] === p && b[1][1] === p && b[2][2] === p) || (b[0][2] === p && b[1][1] === p && b[2][0] === p);
}

function full(b: Board): boolean {
  return b.every((row) => row.every((cell) => cell !== "."));
}

/** Minimax with alpha-beta pruning: never loses at 3x3 tic-tac-toe. */
class MinimaxBot implements Player {
  constructor(private readonly me: string, private readonly them: string) {}

  symbol(): string { return this.me; }

  chooseMove(b: Board): Move {
    let best = -Infinity;
    let move: Move | null = null;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (b[r][c] !== ".") continue;
        b[r][c] = this.me;
        const score = this.minimax(b, false, 1, -Infinity, Infinity);
        b[r][c] = ".";
        if (score > best) {
          best = score;
          move = [r, c];
        }
      }
    }
    if (move === null) throw new Error("board is full");
    return move;
  }

  /** Score from the bot's view: +10 - depth for a win (win sooner is better), depth - 10 for a loss. */
  private minimax(b: Board, myTurn: boolean, depth: number, alpha: number, beta: number): number {
    if (wins(b, this.me)) return 10 - depth;
    if (wins(b, this.them)) return depth - 10;
    if (full(b)) return 0;
    let best = myTurn ? -Infinity : Infinity;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (b[r][c] !== ".") continue;
        b[r][c] = myTurn ? this.me : this.them;
        const s = this.minimax(b, !myTurn, depth + 1, alpha, beta);
        b[r][c] = ".";
        if (myTurn) {
          best = Math.max(best, s);
          alpha = Math.max(alpha, s);
        } else {
          best = Math.min(best, s);
          beta = Math.min(beta, s);
        }
        if (beta <= alpha) return best; // prune: opponent will never allow this line
      }
    }
    return best;
  }
}

/** A weak player that takes the first empty cell: it plugs into the same interface. */
class FirstFreePlayer implements Player {
  constructor(private readonly me: string) {}
  symbol(): string { return this.me; }
  chooseMove(b: Board): Move {
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) if (b[r][c] === ".") return [r, c];
    }
    throw new Error("board is full");
  }
}

const board = (...rows: string[]): Board => rows.map((row) => [...row]);

/** The existing game loop: ask each Player in turn. It cannot tell a human from a bot. */
function play(x: Player, o: Player): string {
  const b = board("...", "...", "...");
  const turn = [x, o];
  for (let i = 0; i < 9; i++) {
    const p = turn[i % 2];
    const [r, c] = p.chooseMove(b);
    b[r][c] = p.symbol();
    if (wins(b, p.symbol())) return p.symbol();
  }
  return "draw";
}

const m1 = new MinimaxBot("O", "X").chooseMove(board("XX.", "OO.", "..."));
console.log(\`\${m1[0]},\${m1[1]}\`); // 1,2 : win now rather than block
const m2 = new MinimaxBot("O", "X").chooseMove(board("XX.", ".O.", "..."));
console.log(\`\${m2[0]},\${m2[1]}\`); // 0,2 : must block X
console.log(play(new MinimaxBot("X", "O"), new MinimaxBot("O", "X"))); // draw: perfect play
console.log(play(new MinimaxBot("X", "O"), new FirstFreePlayer("O"))); // X: the bot beats a weak player
console.log(play(new FirstFreePlayer("X"), new MinimaxBot("O", "X"))); // O: and it wins from the second seat
try {
  new MinimaxBot("O", "X").chooseMove(board("XOX", "XOO", "OXX"));
} catch (e) {
  console.log((e as Error).message); // board is full
}` },
      { lang: 'cpp', code: `using Board = array<array<char, 3>, 3>;
using Move = pair<int, int>;

Board makeBoard(const array<string, 3>& rows) {
    Board b{};
    for (int r = 0; r < 3; r++)
        for (int c = 0; c < 3; c++) b[r][c] = rows[r][c];
    return b;
}

bool wins(const Board& b, char p) {
    for (int i = 0; i < 3; i++) {
        if ((b[i][0] == p && b[i][1] == p && b[i][2] == p) || (b[0][i] == p && b[1][i] == p && b[2][i] == p)) return true;
    }
    return (b[0][0] == p && b[1][1] == p && b[2][2] == p) || (b[0][2] == p && b[1][1] == p && b[2][0] == p);
}

bool full(const Board& b) {
    for (const auto& row : b)
        for (char cell : row)
            if (cell == '.') return false;
    return true;
}

/** The same Player interface the game already uses: a bot is just another strategy. */
class Player {
public:
    virtual ~Player() = default;
    virtual char symbol() const = 0;
    virtual Move chooseMove(Board& board) const = 0;
};

/** Minimax with alpha-beta pruning: never loses at 3x3 tic-tac-toe. */
class MinimaxBot : public Player {
public:
    MinimaxBot(char me, char them) : me_(me), them_(them) {}
    char symbol() const override { return me_; }

    Move chooseMove(Board& b) const override {
        int best = INT_MIN;
        optional<Move> move;
        for (int r = 0; r < 3; r++)
            for (int c = 0; c < 3; c++) {
                if (b[r][c] != '.') continue;
                b[r][c] = me_;
                int score = minimax(b, false, 1, INT_MIN, INT_MAX);
                b[r][c] = '.';
                if (score > best) {
                    best = score;
                    move = Move{r, c};
                }
            }
        if (!move) throw runtime_error("board is full");
        return *move;
    }

private:
    /** Score from the bot's view: +10 - depth for a win (win sooner is better), depth - 10 for a loss. */
    int minimax(Board& b, bool myTurn, int depth, int alpha, int beta) const {
        if (wins(b, me_)) return 10 - depth;
        if (wins(b, them_)) return depth - 10;
        if (full(b)) return 0;
        int best = myTurn ? INT_MIN : INT_MAX;
        for (int r = 0; r < 3; r++)
            for (int c = 0; c < 3; c++) {
                if (b[r][c] != '.') continue;
                b[r][c] = myTurn ? me_ : them_;
                int s = minimax(b, !myTurn, depth + 1, alpha, beta);
                b[r][c] = '.';
                if (myTurn) {
                    best = max(best, s);
                    alpha = max(alpha, s);
                } else {
                    best = min(best, s);
                    beta = min(beta, s);
                }
                if (beta <= alpha) return best;  // prune: opponent will never allow this line
            }
        return best;
    }

    char me_, them_;
};

/** A weak player that takes the first empty cell: it plugs into the same interface. */
class FirstFreePlayer : public Player {
public:
    explicit FirstFreePlayer(char me) : me_(me) {}
    char symbol() const override { return me_; }
    Move chooseMove(Board& b) const override {
        for (int r = 0; r < 3; r++)
            for (int c = 0; c < 3; c++)
                if (b[r][c] == '.') return {r, c};
        throw runtime_error("board is full");
    }

private:
    char me_;
};

/** The existing game loop: ask each Player in turn. It cannot tell a human from a bot. */
string play(const Player& x, const Player& o) {
    Board b = makeBoard({"...", "...", "..."});
    const Player* turn[2] = {&x, &o};
    for (int i = 0; i < 9; i++) {
        const Player& p = *turn[i % 2];
        auto [r, c] = p.chooseMove(b);
        b[r][c] = p.symbol();
        if (wins(b, p.symbol())) return string(1, p.symbol());
    }
    return "draw";
}

int main() {
    Board b1 = makeBoard({"XX.", "OO.", "..."});
    auto [r1, c1] = MinimaxBot('O', 'X').chooseMove(b1);
    cout << r1 << "," << c1 << "\\n";  // 1,2 : win now rather than block
    Board b2 = makeBoard({"XX.", ".O.", "..."});
    auto [r2, c2] = MinimaxBot('O', 'X').chooseMove(b2);
    cout << r2 << "," << c2 << "\\n";  // 0,2 : must block X
    cout << play(MinimaxBot('X', 'O'), MinimaxBot('O', 'X')) << "\\n";  // draw: perfect play
    cout << play(MinimaxBot('X', 'O'), FirstFreePlayer('O')) << "\\n";  // X: the bot beats a weak player
    cout << play(FirstFreePlayer('X'), MinimaxBot('O', 'X')) << "\\n";  // O: and it wins from the second seat
    try {
        Board fullBoard = makeBoard({"XOX", "XOO", "OXX"});
        MinimaxBot('O', 'X').chooseMove(fullBoard);
    } catch (const runtime_error& e) {
        cout << e.what() << "\\n";  // board is full
    }
}` }
    ],
    p13_sol: [
      { lang: 'python', code: `import heapq
import sys
from abc import ABC, abstractmethod
from bisect import bisect_left, insort
from dataclasses import dataclass


@dataclass(frozen=True)
class Car:
    plate: str
    colour: str


class Garage:
    """Domain: knows nothing about text commands. Nearest free slot = smallest number, kept in a heap."""

    def __init__(self, n: int) -> None:
        self._slots: list[Car | None] = [None] * (n + 1)  # slot numbers start at 1
        self._free: list[int] = list(range(1, n + 1))  # already a valid min-heap
        self._slot_by_plate: dict[str, int] = {}
        self._slots_by_colour: dict[str, list[int]] = {}  # each list kept sorted

    @property
    def capacity(self) -> int:
        return len(self._slots) - 1

    def park(self, car: Car) -> int | None:
        if car.plate in self._slot_by_plate:
            raise RuntimeError(f"{car.plate} already parked")
        if not self._free:
            return None
        s = heapq.heappop(self._free)  # O(log n) nearest slot
        self._slots[s] = car
        self._slot_by_plate[car.plate] = s
        insort(self._slots_by_colour.setdefault(car.colour.lower(), []), s)
        return s

    def leave(self, s: int) -> bool:
        if s < 1 or s > self.capacity or self._slots[s] is None:
            return False
        car = self._slots[s]
        assert car is not None
        self._slots[s] = None
        heapq.heappush(self._free, s)
        del self._slot_by_plate[car.plate]
        slots = self._slots_by_colour[car.colour.lower()]
        del slots[bisect_left(slots, s)]
        return True

    def slots_with_colour(self, colour: str) -> list[int]:
        return list(self._slots_by_colour.get(colour.lower(), []))

    def car_at(self, s: int) -> Car:
        car = self._slots[s]
        assert car is not None
        return car

    def slot_of(self, plate: str) -> int | None:
        return self._slot_by_plate.get(plate)


class Session:
    """Holds the garage once it is created, so commands can share it."""

    def __init__(self) -> None:
        self.garage: Garage | None = None


def number(text: str) -> int:
    """Defensive parsing helper shared by the commands."""
    try:
        return int(text)
    except ValueError:
        raise ValueError(f"not a number: {text}") from None


class CliCommand(ABC):
    """Command pattern: each text command is one small class. A new command = one new class + one map entry."""

    @abstractmethod
    def execute(self, args: list[str], session: Session) -> str: ...


class CreateCmd(CliCommand):
    def execute(self, args: list[str], session: Session) -> str:
        n = number(args[0])
        if n < 1:
            raise ValueError("capacity must be at least 1")
        session.garage = Garage(n)
        return f"Created a parking lot with {n} slots"


class ParkCmd(CliCommand):
    def execute(self, args: list[str], session: Session) -> str:
        assert session.garage is not None
        slot = session.garage.park(Car(args[0], args[1]))
        return "Sorry, parking lot is full" if slot is None else f"Allocated slot number: {slot}"


class LeaveCmd(CliCommand):
    def execute(self, args: list[str], session: Session) -> str:
        assert session.garage is not None
        slot = number(args[0])
        return f"Slot number {slot} is free" if session.garage.leave(slot) else f"Slot {slot} is already empty"


class PlatesByColourCmd(CliCommand):
    def execute(self, args: list[str], session: Session) -> str:
        assert session.garage is not None
        g = session.garage
        plates = [g.car_at(slot).plate for slot in g.slots_with_colour(args[0])]
        return ", ".join(plates) if plates else "Not found"


class SlotForPlateCmd(CliCommand):
    def execute(self, args: list[str], session: Session) -> str:
        assert session.garage is not None
        slot = session.garage.slot_of(args[0])
        return "Not found" if slot is None else str(slot)


class Interpreter:
    def __init__(self) -> None:
        self._commands: dict[str, tuple[CliCommand, int]] = {}  # name -> (command, argument count)
        self._session = Session()
        self.register("create_parking_lot", 1, CreateCmd())
        self.register("park", 2, ParkCmd())
        self.register("leave", 1, LeaveCmd())
        self.register("registration_numbers_for_cars_with_colour", 1, PlatesByColourCmd())
        self.register("slot_number_for_registration_number", 1, SlotForPlateCmd())

    def register(self, name: str, arity: int, cmd: CliCommand) -> None:
        self._commands[name] = (cmd, arity)

    def handle(self, line: str) -> str:
        parts = line.split()
        entry = self._commands.get(parts[0])
        if entry is None:
            return f"Unknown command: {parts[0]}"
        cmd, arity = entry
        if len(parts) - 1 != arity:
            return f"Usage: {parts[0]} needs {arity} argument(s)"
        if self._session.garage is None and not isinstance(cmd, CreateCmd):
            return "Create a parking lot first"
        try:
            return cmd.execute(parts[1:], self._session)
        except (ValueError, RuntimeError) as e:
            return f"Error: {e}"  # one bad line never kills the program


def main() -> None:
    """The program: read one command per line until the input ends, print one answer per command."""
    interpreter = Interpreter()
    for line in sys.stdin:
        if line.strip():
            print(interpreter.handle(line))


if __name__ == "__main__":
    main()` },
      { lang: 'ts', code: `declare const require: (module: string) => { readFileSync(fd: number, encoding: string): string };

interface Car {
  readonly plate: string;
  readonly colour: string;
}

/** Small binary min-heap of numbers. */
class MinHeap {
  private readonly a: number[] = [];

  get size(): number { return this.a.length; }

  push(x: number): void {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0 && a[i] < a[(i - 1) >> 1]) {
      const p = (i - 1) >> 1;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }

  pop(): number | undefined {
    const a = this.a;
    if (a.length === 0) return undefined;
    const top = a[0];
    const last = a.pop() as number;
    if (a.length > 0) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        let m = i;
        if (l < a.length && a[l] < a[m]) m = l;
        if (l + 1 < a.length && a[l + 1] < a[m]) m = l + 1;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

/** Index of the first element >= x in a sorted array. */
function lowerBound(a: number[], x: number): number {
  let lo = 0;
  let hi = a.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (a[mid] < x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Domain: knows nothing about text commands. Nearest free slot = smallest number, kept in a heap. */
class Garage {
  private readonly slots: Array<Car | undefined>; // slot numbers start at 1
  private readonly free = new MinHeap();
  private readonly slotByPlate = new Map<string, number>();
  private readonly slotsByColour = new Map<string, number[]>(); // each array kept sorted

  constructor(n: number) {
    this.slots = new Array<Car | undefined>(n + 1).fill(undefined);
    for (let i = 1; i <= n; i++) this.free.push(i);
  }

  capacity(): number { return this.slots.length - 1; }

  park(car: Car): number | undefined {
    if (this.slotByPlate.has(car.plate)) throw new Error(\`\${car.plate} already parked\`);
    const s = this.free.pop(); // O(log n) nearest slot
    if (s === undefined) return undefined;
    this.slots[s] = car;
    this.slotByPlate.set(car.plate, s);
    const key = car.colour.toLowerCase();
    const list = this.slotsByColour.get(key) ?? [];
    list.splice(lowerBound(list, s), 0, s);
    this.slotsByColour.set(key, list);
    return s;
  }

  leave(s: number): boolean {
    const car = this.slots[s];
    if (s < 1 || s > this.capacity() || car === undefined) return false;
    this.slots[s] = undefined;
    this.free.push(s);
    this.slotByPlate.delete(car.plate);
    const list = this.slotsByColour.get(car.colour.toLowerCase()) ?? [];
    list.splice(lowerBound(list, s), 1);
    return true;
  }

  slotsWithColour(colour: string): number[] { return [...(this.slotsByColour.get(colour.toLowerCase()) ?? [])]; }
  carAt(s: number): Car { return this.slots[s] as Car; }
  slotOf(plate: string): number | undefined { return this.slotByPlate.get(plate); }
}

/** Holds the garage once it is created, so commands can share it. */
class Session {
  garage: Garage | undefined;
}

/** Defensive parsing helper shared by the commands. */
function number(text: string): number {
  if (!/^[+-]?\\d+$/.test(text)) throw new Error(\`not a number: \${text}\`);
  return parseInt(text, 10);
}

/** Command pattern: each text command is one small object. A new command = one new class + one register() line. */
interface CliCommand {
  execute(args: string[], session: Session): string;
}

function need(session: Session): Garage {
  if (!session.garage) throw new Error("Create a parking lot first");
  return session.garage;
}

class CreateCmd implements CliCommand {
  execute(a: string[], s: Session): string {
    const n = number(a[0]);
    if (n < 1) throw new Error("capacity must be at least 1");
    s.garage = new Garage(n);
    return \`Created a parking lot with \${n} slots\`;
  }
}

class ParkCmd implements CliCommand {
  execute(a: string[], s: Session): string {
    const slot = need(s).park({ plate: a[0], colour: a[1] });
    return slot === undefined ? "Sorry, parking lot is full" : \`Allocated slot number: \${slot}\`;
  }
}

class LeaveCmd implements CliCommand {
  execute(a: string[], s: Session): string {
    const slot = number(a[0]);
    return need(s).leave(slot) ? \`Slot number \${slot} is free\` : \`Slot \${slot} is already empty\`;
  }
}

class PlatesByColourCmd implements CliCommand {
  execute(a: string[], s: Session): string {
    const g = need(s);
    const plates = g.slotsWithColour(a[0]).map((slot) => g.carAt(slot).plate);
    return plates.length === 0 ? "Not found" : plates.join(", ");
  }
}

class SlotForPlateCmd implements CliCommand {
  execute(a: string[], s: Session): string {
    const slot = need(s).slotOf(a[0]);
    return slot === undefined ? "Not found" : String(slot);
  }
}

class Interpreter {
  private readonly commands = new Map<string, { cmd: CliCommand; arity: number }>();
  private readonly session = new Session();

  constructor() {
    this.register("create_parking_lot", 1, new CreateCmd());
    this.register("park", 2, new ParkCmd());
    this.register("leave", 1, new LeaveCmd());
    this.register("registration_numbers_for_cars_with_colour", 1, new PlatesByColourCmd());
    this.register("slot_number_for_registration_number", 1, new SlotForPlateCmd());
  }

  register(name: string, arity: number, cmd: CliCommand): void {
    this.commands.set(name, { cmd, arity });
  }

  handle(line: string): string {
    const parts = line.trim().split(/ +/);
    const entry = this.commands.get(parts[0]);
    if (!entry) return \`Unknown command: \${parts[0]}\`;
    if (parts.length - 1 !== entry.arity) return \`Usage: \${parts[0]} needs \${entry.arity} argument(s)\`;
    if (this.session.garage === undefined && !(entry.cmd instanceof CreateCmd)) return "Create a parking lot first";
    try {
      return entry.cmd.execute(parts.slice(1), this.session);
    } catch (e) {
      return \`Error: \${(e as Error).message}\`; // one bad line never kills the program
    }
  }
}

// The program: read one command per line until the input ends, print one answer per command.
const interpreter = new Interpreter();
for (const line of require("fs").readFileSync(0, "utf8").split("\\n")) {
  if (line.trim() !== "") console.log(interpreter.handle(line));
}` },
      { lang: 'cpp', code: `struct Car {
    string plate, colour;
};

string lower(string s) {
    transform(s.begin(), s.end(), s.begin(), [](unsigned char c) { return tolower(c); });
    return s;
}

/** Domain: knows nothing about text commands. Nearest free slot = smallest number, kept in a set. */
class Garage {
public:
    explicit Garage(int n) : slots_(n + 1) {  // slot numbers start at 1
        for (int i = 1; i <= n; i++) free_.insert(i);
    }

    int capacity() const { return int(slots_.size()) - 1; }

    optional<int> park(const Car& car) {
        if (slotByPlate_.count(car.plate)) throw runtime_error(car.plate + " already parked");
        if (free_.empty()) return nullopt;
        int s = *free_.begin();  // O(log n) nearest slot
        free_.erase(free_.begin());
        slots_[s] = car;
        slotByPlate_[car.plate] = s;
        slotsByColour_[lower(car.colour)].insert(s);
        return s;
    }

    bool leave(int s) {
        if (s < 1 || s > capacity() || !slots_[s]) return false;
        const Car car = *slots_[s];
        slots_[s].reset();
        free_.insert(s);
        slotByPlate_.erase(car.plate);
        slotsByColour_[lower(car.colour)].erase(s);
        return true;
    }

    vector<int> slotsWithColour(const string& colour) const {
        auto it = slotsByColour_.find(lower(colour));
        if (it == slotsByColour_.end()) return {};
        return {it->second.begin(), it->second.end()};
    }

    const Car& carAt(int s) const { return *slots_[s]; }

    optional<int> slotOf(const string& plate) const {
        auto it = slotByPlate_.find(plate);
        if (it == slotByPlate_.end()) return nullopt;
        return it->second;
    }

private:
    vector<optional<Car>> slots_;
    set<int> free_;
    unordered_map<string, int> slotByPlate_;
    unordered_map<string, set<int>> slotsByColour_;
};

/** Holds the garage once it is created, so commands can share it. */
struct Session {
    unique_ptr<Garage> garage;
};

/** Defensive parsing helper shared by the commands. */
int number(const string& text) {
    try {
        size_t used = 0;
        int v = stoi(text, &used);
        if (used != text.size()) throw invalid_argument("trailing");
        return v;
    } catch (const logic_error&) {  // invalid_argument and out_of_range
        throw invalid_argument("not a number: " + text);
    }
}

/** Command pattern: each text command is one small class. A new command = one new class + one register() line. */
class CliCommand {
public:
    virtual ~CliCommand() = default;
    virtual string execute(const vector<string>& args, Session& session) const = 0;
};

class CreateCmd : public CliCommand {
public:
    string execute(const vector<string>& a, Session& s) const override {
        int n = number(a[0]);
        if (n < 1) throw invalid_argument("capacity must be at least 1");
        s.garage = make_unique<Garage>(n);
        return "Created a parking lot with " + to_string(n) + " slots";
    }
};

class ParkCmd : public CliCommand {
public:
    string execute(const vector<string>& a, Session& s) const override {
        auto slot = s.garage->park({a[0], a[1]});
        return slot ? "Allocated slot number: " + to_string(*slot) : "Sorry, parking lot is full";
    }
};

class LeaveCmd : public CliCommand {
public:
    string execute(const vector<string>& a, Session& s) const override {
        int slot = number(a[0]);
        return s.garage->leave(slot) ? "Slot number " + to_string(slot) + " is free"
                                     : "Slot " + to_string(slot) + " is already empty";
    }
};

class PlatesByColourCmd : public CliCommand {
public:
    string execute(const vector<string>& a, Session& s) const override {
        string out;
        for (int slot : s.garage->slotsWithColour(a[0])) out += (out.empty() ? "" : ", ") + s.garage->carAt(slot).plate;
        return out.empty() ? "Not found" : out;
    }
};

class SlotForPlateCmd : public CliCommand {
public:
    string execute(const vector<string>& a, Session& s) const override {
        auto slot = s.garage->slotOf(a[0]);
        return slot ? to_string(*slot) : "Not found";
    }
};

class Interpreter {
public:
    Interpreter() {
        add("create_parking_lot", 1, make_unique<CreateCmd>());
        add("park", 2, make_unique<ParkCmd>());
        add("leave", 1, make_unique<LeaveCmd>());
        add("registration_numbers_for_cars_with_colour", 1, make_unique<PlatesByColourCmd>());
        add("slot_number_for_registration_number", 1, make_unique<SlotForPlateCmd>());
    }

    void add(const string& name, int arity, unique_ptr<CliCommand> cmd) { commands_[name] = {arity, move(cmd)}; }

    string handle(const string& line) {
        istringstream in(line);
        vector<string> parts;
        for (string word; in >> word;) parts.push_back(word);
        auto it = commands_.find(parts[0]);
        if (it == commands_.end()) return "Unknown command: " + parts[0];
        auto& [arity, cmd] = it->second;
        if (int(parts.size()) - 1 != arity)
            return "Usage: " + parts[0] + " needs " + to_string(arity) + " argument(s)";
        if (!session_.garage && !dynamic_cast<CreateCmd*>(cmd.get())) return "Create a parking lot first";
        try {
            return cmd->execute(vector<string>(parts.begin() + 1, parts.end()), session_);
        } catch (const exception& e) {
            return string("Error: ") + e.what();  // one bad line never kills the program
        }
    }

private:
    map<string, pair<int, unique_ptr<CliCommand>>> commands_;
    Session session_;
};

// The program: read one command per line until the input ends, print one answer per command.
int main() {
    Interpreter interpreter;
    string line;
    while (getline(cin, line)) {
        if (line.find_first_not_of(" \\t\\r") != string::npos) cout << interpreter.handle(line) << "\\n";
    }
}` }
    ],
    p14_sol: [
      { lang: 'python', code: `from abc import ABC, abstractmethod
from dataclasses import dataclass


# Events are facts that happened. The list of events IS the game (event sourcing, lite).
@dataclass(frozen=True)
class MovePlayed:
    seq: int
    symbol: str
    row: int
    col: int


@dataclass(frozen=True)
class GameWon:
    symbol: str


@dataclass(frozen=True)
class GameDrawn:
    pass


GameEvent = MovePlayed | GameWon | GameDrawn


class GameListener(ABC):
    """Observer: spectators, loggers, a scoreboard... the game does not know which."""

    @abstractmethod
    def on(self, e: GameEvent) -> None: ...


class MultiGame:
    def __init__(self, *symbols: str) -> None:
        """P players on an (P+1) x (P+1) board, needing a full line to win."""
        self._symbols = symbols
        self._n = len(symbols) + 1
        self._board = [["."] * self._n for _ in range(self._n)]
        p = len(symbols)
        self._rows = [[0] * self._n for _ in range(p)]
        self._cols = [[0] * self._n for _ in range(p)]
        self._diag = [0] * p
        self._anti = [0] * p
        self._log: list[GameEvent] = []
        self._listeners: list[GameListener] = []
        self._turn = 0
        self._moves = 0
        self._over = False

    def subscribe(self, listener: GameListener) -> None:
        self._listeners.append(listener)

    def _emit(self, e: GameEvent) -> None:
        self._log.append(e)
        for listener in self._listeners:
            listener.on(e)

    def play(self, r: int, c: int) -> None:
        n = self._n
        if self._over:
            raise RuntimeError("game over")
        if not (0 <= r < n and 0 <= c < n) or self._board[r][c] != ".":
            raise ValueError("illegal move")
        p = self._turn
        self._board[r][c] = self._symbols[p]
        self._moves += 1
        self._emit(MovePlayed(self._moves, self._symbols[p], r, c))
        self._rows[p][r] += 1
        self._cols[p][c] += 1
        if r == c:
            self._diag[p] += 1
        if r + c == n - 1:
            self._anti[p] += 1
        win = n in (self._rows[p][r], self._cols[p][c]) or (r == c and self._diag[p] == n) or (r + c == n - 1 and self._anti[p] == n)
        if win:
            self._over = True
            self._emit(GameWon(self._symbols[p]))
        elif self._moves == n * n:
            self._over = True
            self._emit(GameDrawn())
        else:
            self._turn = (self._turn + 1) % len(self._symbols)

    def events(self) -> list[GameEvent]:
        return list(self._log)

    @property
    def size(self) -> int:
        return self._n

    @staticmethod
    def replay(events: list[GameEvent], n: int, up_to: int) -> list[list[str]]:
        """Rebuild the board as it looked after \`up_to\` moves, purely from the event log."""
        b = [["."] * n for _ in range(n)]
        for e in events:
            if isinstance(e, MovePlayed) and e.seq <= up_to:
                b[e.row][e.col] = e.symbol
        return b


class Spectator(GameListener):
    def __init__(self, name: str) -> None:
        self._name = name
        self.seen: list[str] = []

    def on(self, e: GameEvent) -> None:
        match e:
            case MovePlayed(_, symbol, row, col):
                line = f"{symbol} plays {row},{col}"
            case GameWon(symbol):
                line = f"{symbol} WINS"
            case GameDrawn():
                line = "draw"
        self.seen.append(f"{self._name}: {line}")


def rows(b: list[list[str]]) -> str:  # "XX../O.../..../...." one string per board
    return "/".join("".join(row) for row in b)


def try_play(g: MultiGame, r: int, c: int) -> str:  # the reason a move was refused, or "ok"
    try:
        g.play(r, c)
        return "ok"
    except (RuntimeError, ValueError) as e:
        return str(e)


def main() -> None:
    g = MultiGame("X", "O", "Z")  # 3 players, 4x4 board
    tv = Spectator("TV")
    g.subscribe(tv)
    for r, c in [(0, 0), (1, 0), (2, 0), (0, 1), (1, 1), (2, 1), (0, 2), (1, 2), (2, 2), (0, 3)]:
        g.play(r, c)
    print(tv.seen[-1])  # TV: X WINS  (row 0 complete)
    print(len(tv.seen))  # 11: ten moves and the win
    print(rows(MultiGame.replay(g.events(), g.size, 3)))  # X.../O.../Z.../....
    print(rows(MultiGame.replay(g.events(), g.size, 10)))  # XXXX/OOO./ZZZ./....
    print(try_play(g, 3, 3))  # game over

    d = MultiGame("X", "O")  # 2 players, 3x3: a full board with no line
    board = Spectator("BOARD")
    d.subscribe(board)
    for r, c in [(0, 0), (0, 1), (0, 2), (1, 2), (1, 0), (2, 0), (1, 1), (2, 2), (2, 1)]:
        d.play(r, c)
    print(board.seen[-1])  # BOARD: draw
    print(len(board.seen))  # 10: nine moves and the draw
    print(try_play(d, 2, 2))  # game over

    e = MultiGame("X", "O")
    e.play(0, 0)
    print(try_play(e, 0, 0))  # illegal move: occupied
    print(try_play(e, 3, 0))  # illegal move: outside the 3x3 board


if __name__ == "__main__":
    main()` },
      { lang: 'ts', code: `// Events are facts that happened. The list of events IS the game (event sourcing, lite).
type GameEvent =
  | { readonly kind: "moved"; readonly seq: number; readonly symbol: string; readonly row: number; readonly col: number }
  | { readonly kind: "won"; readonly symbol: string }
  | { readonly kind: "drawn" };

/** Observer: spectators, loggers, a scoreboard... the game does not know which. */
interface GameListener {
  on(e: GameEvent): void;
}

class MultiGame {
  private readonly n: number;
  private readonly board: string[][];
  private readonly rows: number[][];
  private readonly cols: number[][];
  private readonly diag: number[];
  private readonly anti: number[];
  private readonly log: GameEvent[] = [];
  private readonly listeners: GameListener[] = [];
  private turn = 0;
  private moves = 0;
  private over = false;

  /** P players on an (P+1) x (P+1) board, needing a full line to win. */
  constructor(private readonly symbols: string[]) {
    const p = symbols.length;
    this.n = p + 1;
    this.board = Array.from({ length: this.n }, () => new Array<string>(this.n).fill("."));
    this.rows = Array.from({ length: p }, () => new Array<number>(this.n).fill(0));
    this.cols = Array.from({ length: p }, () => new Array<number>(this.n).fill(0));
    this.diag = new Array<number>(p).fill(0);
    this.anti = new Array<number>(p).fill(0);
  }

  subscribe(l: GameListener): void { this.listeners.push(l); }

  private emit(e: GameEvent): void {
    this.log.push(e);
    for (const l of this.listeners) l.on(e);
  }

  play(r: number, c: number): void {
    const n = this.n;
    if (this.over) throw new Error("game over");
    if (r < 0 || r >= n || c < 0 || c >= n || this.board[r][c] !== ".") throw new Error("illegal move");
    const p = this.turn;
    this.board[r][c] = this.symbols[p];
    this.moves++;
    this.emit({ kind: "moved", seq: this.moves, symbol: this.symbols[p], row: r, col: c });
    this.rows[p][r]++;
    this.cols[p][c]++;
    if (r === c) this.diag[p]++;
    if (r + c === n - 1) this.anti[p]++;
    const win = this.rows[p][r] === n || this.cols[p][c] === n
      || (r === c && this.diag[p] === n) || (r + c === n - 1 && this.anti[p] === n);
    if (win) {
      this.over = true;
      this.emit({ kind: "won", symbol: this.symbols[p] });
    } else if (this.moves === n * n) {
      this.over = true;
      this.emit({ kind: "drawn" });
    } else {
      this.turn = (this.turn + 1) % this.symbols.length;
    }
  }

  events(): readonly GameEvent[] { return [...this.log]; }
  size(): number { return this.n; }

  /** Rebuild the board as it looked after \`upTo\` moves, purely from the event log. */
  static replay(events: readonly GameEvent[], n: number, upTo: number): string[][] {
    const b = Array.from({ length: n }, () => new Array<string>(n).fill("."));
    for (const e of events) if (e.kind === "moved" && e.seq <= upTo) b[e.row][e.col] = e.symbol;
    return b;
  }
}

class Spectator implements GameListener {
  readonly seen: string[] = [];
  constructor(private readonly who: string) {}

  on(e: GameEvent): void {
    let line: string;
    switch (e.kind) {
      case "moved": line = \`\${e.symbol} plays \${e.row},\${e.col}\`; break;
      case "won": line = \`\${e.symbol} WINS\`; break;
      case "drawn": line = "draw"; break;
    }
    this.seen.push(\`\${this.who}: \${line}\`);
  }
}

const rows = (b: string[][]): string => b.map((row) => row.join("")).join("/"); // "XX../O.../..../...."

function tryPlay(g: MultiGame, r: number, c: number): string { // the reason a move was refused, or "ok"
  try {
    g.play(r, c);
    return "ok";
  } catch (e) {
    return (e as Error).message;
  }
}

const g = new MultiGame(["X", "O", "Z"]); // 3 players, 4x4 board
const tv = new Spectator("TV");
g.subscribe(tv);
for (const [r, c] of [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2], [0, 3]]) g.play(r, c);
console.log(tv.seen[tv.seen.length - 1]); // TV: X WINS  (row 0 complete)
console.log(tv.seen.length); // 11: ten moves and the win
console.log(rows(MultiGame.replay(g.events(), g.size(), 3))); // X.../O.../Z.../....
console.log(rows(MultiGame.replay(g.events(), g.size(), 10))); // XXXX/OOO./ZZZ./....
console.log(tryPlay(g, 3, 3)); // game over

const d = new MultiGame(["X", "O"]); // 2 players, 3x3: a full board with no line
const board = new Spectator("BOARD");
d.subscribe(board);
for (const [r, c] of [[0, 0], [0, 1], [0, 2], [1, 2], [1, 0], [2, 0], [1, 1], [2, 2], [2, 1]]) d.play(r, c);
console.log(board.seen[board.seen.length - 1]); // BOARD: draw
console.log(board.seen.length); // 10: nine moves and the draw
console.log(tryPlay(d, 2, 2)); // game over

const e = new MultiGame(["X", "O"]);
e.play(0, 0);
console.log(tryPlay(e, 0, 0)); // illegal move: occupied
console.log(tryPlay(e, 3, 0)); // illegal move: outside the 3x3 board` },
      { lang: 'cpp', code: `// Events are facts that happened. The list of events IS the game (event sourcing, lite).
struct MovePlayed { int seq; char symbol; int row, col; };
struct GameWon { char symbol; };
struct GameDrawn {};
using GameEvent = variant<MovePlayed, GameWon, GameDrawn>;

/** Observer: spectators, loggers, a scoreboard... the game does not know which. */
class GameListener {
public:
    virtual ~GameListener() = default;
    virtual void on(const GameEvent& e) = 0;
};

class MultiGame {
public:
    /** P players on an (P+1) x (P+1) board, needing a full line to win. */
    explicit MultiGame(string symbols)
        : symbols_(move(symbols)), n_(int(symbols_.size()) + 1), board_(n_, string(n_, '.')),
          rows_(symbols_.size(), vector<int>(n_, 0)), cols_(symbols_.size(), vector<int>(n_, 0)),
          diag_(symbols_.size(), 0), anti_(symbols_.size(), 0) {}

    void subscribe(GameListener& l) { listeners_.push_back(&l); }  // non-owning

    void play(int r, int c) {
        if (over_) throw logic_error("game over");
        if (r < 0 || r >= n_ || c < 0 || c >= n_ || board_[r][c] != '.') throw invalid_argument("illegal move");
        size_t p = turn_;
        board_[r][c] = symbols_[p];
        moves_++;
        emit(MovePlayed{moves_, symbols_[p], r, c});
        bool win = (++rows_[p][r] == n_) | (++cols_[p][c] == n_)
                 | (r == c && ++diag_[p] == n_) | (r + c == n_ - 1 && ++anti_[p] == n_);  // non-short-circuit: update all
        if (win) {
            over_ = true;
            emit(GameWon{symbols_[p]});
        } else if (moves_ == n_ * n_) {
            over_ = true;
            emit(GameDrawn{});
        } else {
            turn_ = (turn_ + 1) % symbols_.size();
        }
    }

    const vector<GameEvent>& events() const { return log_; }
    int size() const { return n_; }

    /** Rebuild the board as it looked after \`upTo\` moves, purely from the event log. */
    static vector<string> replay(const vector<GameEvent>& events, int n, int upTo) {
        vector<string> b(n, string(n, '.'));
        for (const auto& e : events)
            if (const auto* m = get_if<MovePlayed>(&e); m && m->seq <= upTo) b[m->row][m->col] = m->symbol;
        return b;
    }

private:
    void emit(const GameEvent& e) {
        log_.push_back(e);
        for (auto* l : listeners_) l->on(e);
    }

    string symbols_;
    int n_;
    vector<string> board_;
    vector<vector<int>> rows_, cols_;
    vector<int> diag_, anti_;
    vector<GameEvent> log_;
    vector<GameListener*> listeners_;
    size_t turn_ = 0;
    int moves_ = 0;
    bool over_ = false;
};

class Spectator : public GameListener {
public:
    explicit Spectator(string name) : name_(move(name)) {}
    vector<string> seen;

    void on(const GameEvent& e) override {
        string line = visit(
            [](const auto& ev) -> string {
                using T = decay_t<decltype(ev)>;
                if constexpr (is_same_v<T, MovePlayed>)
                    return string(1, ev.symbol) + " plays " + to_string(ev.row) + "," + to_string(ev.col);
                else if constexpr (is_same_v<T, GameWon>)
                    return string(1, ev.symbol) + " WINS";
                else
                    return "draw";
            },
            e);
        seen.push_back(name_ + ": " + line);
    }

private:
    string name_;
};

string rows(const vector<string>& b) {  // "XX../O.../..../...." one string per board
    string out;
    for (size_t i = 0; i < b.size(); i++) out += (i ? "/" : "") + b[i];
    return out;
}

string tryPlay(MultiGame& g, int r, int c) {  // the reason a move was refused, or "ok"
    try {
        g.play(r, c);
        return "ok";
    } catch (const exception& e) {
        return e.what();
    }
}

int main() {
    MultiGame g("XOZ");  // 3 players, 4x4 board
    Spectator tv("TV");
    g.subscribe(tv);
    for (auto [r, c] : vector<pair<int, int>>{{0, 0}, {1, 0}, {2, 0}, {0, 1}, {1, 1}, {2, 1}, {0, 2}, {1, 2}, {2, 2}, {0, 3}}) g.play(r, c);
    cout << tv.seen.back() << "\\n";  // TV: X WINS  (row 0 complete)
    cout << tv.seen.size() << "\\n";  // 11: ten moves and the win
    cout << rows(MultiGame::replay(g.events(), g.size(), 3)) << "\\n";   // X.../O.../Z.../....
    cout << rows(MultiGame::replay(g.events(), g.size(), 10)) << "\\n";  // XXXX/OOO./ZZZ./....
    cout << tryPlay(g, 3, 3) << "\\n";  // game over

    MultiGame d("XO");  // 2 players, 3x3: a full board with no line
    Spectator board("BOARD");
    d.subscribe(board);
    for (auto [r, c] : vector<pair<int, int>>{{0, 0}, {0, 1}, {0, 2}, {1, 2}, {1, 0}, {2, 0}, {1, 1}, {2, 2}, {2, 1}}) d.play(r, c);
    cout << board.seen.back() << "\\n";  // BOARD: draw
    cout << board.seen.size() << "\\n";  // 10: nine moves and the draw
    cout << tryPlay(d, 2, 2) << "\\n";   // game over

    MultiGame e("XO");
    e.play(0, 0);
    cout << tryPlay(e, 0, 0) << "\\n";  // illegal move: occupied
    cout << tryPlay(e, 3, 0) << "\\n";  // illegal move: outside the 3x3 board
}` }
    ],
    t1_skeleton: [
      { lang: 'python', code: `from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import time

# The framework applied to a NEW problem: "Design a meeting-room booker".
# Step 1 (clarify): rooms have capacity; book a slot for N people; no overlaps; cancel allowed.
# Step 2 (entities): Room, Booking.     Step 3 (APIs): book(...), cancel(...), bookings_for(room).
# Step 4 (diagram): Scheduler has Rooms, Room has Bookings.     Step 5 (patterns): Strategy for choosing a room.
# Step 6 (extensibility): new selection rule = new class; nothing else changes.


@dataclass(frozen=True)
class Room:
    name: str
    capacity: int


@dataclass(frozen=True)
class Booking:
    id: str
    room: Room
    start: time
    end: time
    people: int

    def overlaps(self, s: time, e: time) -> bool:  # half-open
        return s < self.end and self.start < e


class RoomSelectionStrategy(ABC):
    """Step 5: the rule most likely to change, behind an interface."""

    @abstractmethod
    def choose(self, candidates: list[Room], people: int) -> Room | None: ...


class SmallestFitStrategy(RoomSelectionStrategy):
    """Smallest room that is big enough: keeps big rooms free for big meetings."""

    def choose(self, candidates: list[Room], people: int) -> Room | None:
        fitting = [r for r in candidates if r.capacity >= people]
        return min(fitting, key=lambda r: r.capacity, default=None)


class MeetingScheduler(ABC):
    """Step 3: the public API. Callers depend on this, not on the implementation."""

    @abstractmethod
    def book(self, people: int, start: time, end: time) -> Booking | None: ...

    @abstractmethod
    def cancel(self, booking_id: str) -> bool: ...

    @abstractmethod
    def bookings_for(self, room: Room) -> list[Booking]: ...


class InMemoryScheduler(MeetingScheduler):
    def __init__(self, rooms: list[Room], strategy: RoomSelectionStrategy) -> None:
        self._rooms = list(rooms)
        self._strategy = strategy
        self._bookings: dict[Room, list[Booking]] = {r: [] for r in rooms}
        self._seq = 1

    def book(self, people: int, start: time, end: time) -> Booking | None:
        if not start < end:
            raise ValueError("start must be before end")
        free = [r for r in self._rooms if not any(b.overlaps(start, end) for b in self._bookings[r])]
        room = self._strategy.choose(free, people)
        if room is None:
            return None
        booking = Booking(f"B{self._seq}", room, start, end, people)
        self._seq += 1
        self._bookings[room].append(booking)
        return booking

    def cancel(self, booking_id: str) -> bool:
        for bookings in self._bookings.values():
            for b in bookings:
                if b.id == booking_id:
                    bookings.remove(b)
                    return True
        return False

    def bookings_for(self, room: Room) -> list[Booking]:
        return list(self._bookings[room])


def main() -> None:
    small, big = Room("Huddle", 4), Room("Board", 12)
    s = InMemoryScheduler([big, small], SmallestFitStrategy())
    for start, end in [(time(10, 0), time(11, 0)), (time(10, 30), time(11, 0)), (time(10, 30), time(11, 0))]:
        booking = s.book(3, start, end)
        print(booking.room.name if booking else "none")  # Huddle, Board, none


if __name__ == "__main__":
    main()` },
      { lang: 'ts', code: `// The framework applied to a NEW problem: "Design a meeting-room booker".
// Step 1 (clarify): rooms have capacity; book a slot for N people; no overlaps; cancel allowed.
// Step 2 (entities): Room, Booking.     Step 3 (APIs): book(...), cancel(...), bookingsFor(room).
// Step 4 (diagram): Scheduler has Rooms, Room has Bookings.     Step 5 (patterns): Strategy for choosing a room.
// Step 6 (extensibility): new selection rule = new class; nothing else changes.

/** Time of day as minutes after midnight. */
type TimeOfDay = number;
const timeOf = (h: number, m: number): TimeOfDay => h * 60 + m;

interface Room {
  readonly name: string;
  readonly capacity: number;
}

class Booking {
  constructor(
    readonly id: string,
    readonly room: Room,
    readonly start: TimeOfDay,
    readonly end: TimeOfDay,
    readonly people: number,
  ) {}
  overlaps(s: TimeOfDay, e: TimeOfDay): boolean { return s < this.end && this.start < e; } // half-open
}

/** Step 5: the rule most likely to change, behind an interface. */
interface RoomSelectionStrategy {
  choose(candidates: Room[], people: number): Room | undefined;
}

/** Smallest room that is big enough: keeps big rooms free for big meetings. */
class SmallestFitStrategy implements RoomSelectionStrategy {
  choose(candidates: Room[], people: number): Room | undefined {
    return candidates
      .filter((r) => r.capacity >= people)
      .reduce<Room | undefined>((best, r) => (best === undefined || r.capacity < best.capacity ? r : best), undefined);
  }
}

/** Step 3: the public API. Callers depend on this, not on the implementation. */
interface MeetingScheduler {
  book(people: number, start: TimeOfDay, end: TimeOfDay): Booking | undefined;
  cancel(bookingId: string): boolean;
  bookingsFor(room: Room): Booking[];
}

class InMemoryScheduler implements MeetingScheduler {
  private readonly rooms: Room[];
  private readonly bookings = new Map<Room, Booking[]>();
  private seq = 1;

  constructor(rooms: Room[], private readonly strategy: RoomSelectionStrategy) {
    this.rooms = [...rooms];
    for (const r of rooms) this.bookings.set(r, []);
  }

  book(people: number, start: TimeOfDay, end: TimeOfDay): Booking | undefined {
    if (!(start < end)) throw new Error("start must be before end");
    const free = this.rooms.filter((r) => !(this.bookings.get(r) ?? []).some((b) => b.overlaps(start, end)));
    const room = this.strategy.choose(free, people);
    if (room === undefined) return undefined;
    const booking = new Booking(\`B\${this.seq++}\`, room, start, end, people);
    this.bookings.get(room)?.push(booking);
    return booking;
  }

  cancel(id: string): boolean {
    for (const list of this.bookings.values()) {
      const i = list.findIndex((b) => b.id === id);
      if (i >= 0) {
        list.splice(i, 1);
        return true;
      }
    }
    return false;
  }

  bookingsFor(room: Room): Booking[] { return [...(this.bookings.get(room) ?? [])]; }
}

const small: Room = { name: "Huddle", capacity: 4 };
const big: Room = { name: "Board", capacity: 12 };
const s: MeetingScheduler = new InMemoryScheduler([big, small], new SmallestFitStrategy());
console.log(s.book(3, timeOf(10, 0), timeOf(11, 0))?.room.name ?? "none"); // Huddle
console.log(s.book(3, timeOf(10, 30), timeOf(11, 0))?.room.name ?? "none"); // Board
console.log(s.book(3, timeOf(10, 30), timeOf(11, 0))?.room.name ?? "none"); // none` },
      { lang: 'cpp', code: `// The framework applied to a NEW problem: "Design a meeting-room booker".
// Step 1 (clarify): rooms have capacity; book a slot for N people; no overlaps; cancel allowed.
// Step 2 (entities): Room, Booking.     Step 3 (APIs): book(...), cancel(...), bookingsFor(room).
// Step 4 (diagram): Scheduler has Rooms, Room has Bookings.     Step 5 (patterns): Strategy for choosing a room.
// Step 6 (extensibility): new selection rule = new class; nothing else changes.

using TimeOfDay = chrono::minutes;  // minutes after midnight

struct Room {
    string name;
    int capacity;
    bool operator==(const Room&) const = default;
};

struct Booking {
    string id;
    Room room;
    TimeOfDay start, end;
    int people;
    bool overlaps(TimeOfDay s, TimeOfDay e) const { return s < end && start < e; }  // half-open
};

/** Step 5: the rule most likely to change, behind an interface. */
class RoomSelectionStrategy {
public:
    virtual ~RoomSelectionStrategy() = default;
    virtual optional<Room> choose(const vector<Room>& candidates, int people) const = 0;
};

/** Smallest room that is big enough: keeps big rooms free for big meetings. */
class SmallestFitStrategy : public RoomSelectionStrategy {
public:
    optional<Room> choose(const vector<Room>& candidates, int people) const override {
        optional<Room> best;
        for (const Room& r : candidates)
            if (r.capacity >= people && (!best || r.capacity < best->capacity)) best = r;
        return best;
    }
};

/** Step 3: the public API. Callers depend on this, not on the implementation. */
class MeetingScheduler {
public:
    virtual ~MeetingScheduler() = default;
    virtual optional<Booking> book(int people, TimeOfDay start, TimeOfDay end) = 0;
    virtual bool cancel(const string& bookingId) = 0;
    virtual vector<Booking> bookingsFor(const Room& room) const = 0;
};

class InMemoryScheduler : public MeetingScheduler {
public:
    InMemoryScheduler(vector<Room> rooms, unique_ptr<RoomSelectionStrategy> strategy)
        : rooms_(move(rooms)), strategy_(move(strategy)) {
        for (const Room& r : rooms_) bookings_[r.name];
    }

    optional<Booking> book(int people, TimeOfDay start, TimeOfDay end) override {
        lock_guard<mutex> guard(mu_);
        if (!(start < end)) throw invalid_argument("start must be before end");
        vector<Room> free;
        for (const Room& r : rooms_) {
            const auto& list = bookings_[r.name];
            if (none_of(list.begin(), list.end(), [&](const Booking& b) { return b.overlaps(start, end); })) free.push_back(r);
        }
        auto room = strategy_->choose(free, people);
        if (!room) return nullopt;
        Booking b{"B" + to_string(seq_++), *room, start, end, people};
        bookings_[room->name].push_back(b);
        return b;
    }

    bool cancel(const string& id) override {
        lock_guard<mutex> guard(mu_);
        for (auto& [name, list] : bookings_) {
            auto it = find_if(list.begin(), list.end(), [&](const Booking& b) { return b.id == id; });
            if (it != list.end()) {
                list.erase(it);
                return true;
            }
        }
        return false;
    }

    vector<Booking> bookingsFor(const Room& room) const override {
        lock_guard<mutex> guard(mu_);
        auto it = bookings_.find(room.name);
        return it == bookings_.end() ? vector<Booking>{} : it->second;
    }

private:
    vector<Room> rooms_;
    unique_ptr<RoomSelectionStrategy> strategy_;
    map<string, vector<Booking>> bookings_;
    int seq_ = 1;
    mutable mutex mu_;
};

int main() {
    Room small{"Huddle", 4}, big{"Board", 12};
    unique_ptr<MeetingScheduler> s = make_unique<InMemoryScheduler>(vector<Room>{big, small}, make_unique<SmallestFitStrategy>());
    for (auto [start, end] : vector<pair<TimeOfDay, TimeOfDay>>{{600min, 660min}, {630min, 660min}, {630min, 660min}}) {
        auto booking = s->book(3, start, end);
        cout << (booking ? booking->room.name : "none") << "\\n";  // Huddle, Board, none
    }
}` }
    ],
    t2_god: [
      { lang: 'python', code: `# ANTI-EXAMPLE: the "God class". Every requirement landed in the same file.
# Read the comments marked SMELL: each one is a point an interviewer deducts.

# SMELL 1: parallel lists instead of a ParkingSpot object
size = ["S", "M", "M", "L", "L"]
who: list[str | None] = [None] * 5
since = [0] * 5
# SMELL 2: money and payment state live next to spot state
cash_in_drawer = 0
ticket_counter = 0


# SMELL 3: one function parses input, applies rules, prices, takes payment and prints
def handle(cmd: str) -> None:
    global cash_in_drawer, ticket_counter
    p = cmd.split(" ")
    if p[0] == "IN":
        for i in range(len(size)):
            # SMELL 4: fit rules hard-coded as string comparisons, duplicated elsewhere
            fits = p[1] == "BIKE" or (p[1] == "CAR" and size[i] != "S") or (p[1] == "TRUCK" and size[i] == "L")
            if who[i] is None and fits:
                who[i] = p[2] + "/" + p[1]  # SMELL 5: type smuggled inside a string
                since[i] = int(p[3])
                ticket_counter += 1
                print(f"Ticket {ticket_counter} spot {i}")
                return
        print("FULL")
    elif p[0] == "OUT":
        spot = int(p[1])
        kind = (who[spot] or "").split("/")[1]
        hrs = max(1, int(p[2]) - since[spot])
        fee = hrs * 10 if kind == "BIKE" else hrs * 20 if kind == "CAR" else hrs * 50  # SMELL 6: pricing inline
        if p[3] == "CASH":  # SMELL 7: payment inline
            cash_in_drawer += fee
        else:
            print("Calling card gateway...")
        who[spot] = None
        print(f"Paid {fee}")
    elif p[0] == "SHOW":
        free = sum(1 for w in who if w is None)
        print(f"Free spots: {free}, cash: {cash_in_drawer}")  # SMELL 8: UI inside domain


if __name__ == "__main__":
    handle("IN CAR KA-01 9")
    handle("IN TRUCK KA-77 9")
    handle("OUT 1 12 CASH")
    handle("SHOW")` },
      { lang: 'ts', code: `// ANTI-EXAMPLE: the "God class". Every requirement landed in the same file.
// Read the comments marked SMELL: each one is a point an interviewer deducts.

// SMELL 1: parallel arrays instead of a ParkingSpot object
const size: string[] = ["S", "M", "M", "L", "L"];
const who: Array<string | null> = new Array<string | null>(5).fill(null);
const since: number[] = new Array<number>(5).fill(0);
// SMELL 2: money and payment state live next to spot state
let cashInDrawer = 0;
let ticketCounter = 0;

// SMELL 3: one function parses input, applies rules, prices, takes payment and prints
function handle(cmd: string): void {
  const p = cmd.split(" ");
  if (p[0] === "IN") {
    for (let i = 0; i < size.length; i++) {
      // SMELL 4: fit rules hard-coded as string comparisons, duplicated elsewhere
      const fits = p[1] === "BIKE" || (p[1] === "CAR" && size[i] !== "S") || (p[1] === "TRUCK" && size[i] === "L");
      if (who[i] === null && fits) {
        who[i] = p[2] + "/" + p[1]; // SMELL 5: type smuggled inside a string
        since[i] = parseInt(p[3], 10);
        ticketCounter++;
        console.log("Ticket " + ticketCounter + " spot " + i);
        return;
      }
    }
    console.log("FULL");
  } else if (p[0] === "OUT") {
    const spot = parseInt(p[1], 10);
    const type = (who[spot] ?? "").split("/")[1];
    const hrs = Math.max(1, parseInt(p[2], 10) - since[spot]);
    const fee = type === "BIKE" ? hrs * 10 : type === "CAR" ? hrs * 20 : hrs * 50; // SMELL 6: pricing inline
    if (p[3] === "CASH") cashInDrawer += fee; // SMELL 7: payment inline
    else console.log("Calling card gateway...");
    who[spot] = null;
    console.log("Paid " + fee);
  } else if (p[0] === "SHOW") {
    const free = who.filter((w) => w === null).length;
    console.log("Free spots: " + free + ", cash: " + cashInDrawer); // SMELL 8: UI inside domain
  }
}

handle("IN CAR KA-01 9");
handle("IN TRUCK KA-77 9");
handle("OUT 1 12 CASH");
handle("SHOW");` },
      { lang: 'cpp', code: `// ANTI-EXAMPLE: the "God class". Every requirement landed in the same file.
// Read the comments marked SMELL: each one is a point an interviewer deducts.

// SMELL 1: parallel arrays instead of a ParkingSpot object
string sizes[5] = {"S", "M", "M", "L", "L"};
string who[5];  // empty = free
long long since[5];
// SMELL 2: money and payment state live next to spot state
long long cashInDrawer = 0;
int ticketCounter = 0;

vector<string> split(const string& s, char sep) {
    vector<string> out;
    string part;
    istringstream in(s);
    while (getline(in, part, sep)) out.push_back(part);
    return out;
}

// SMELL 3: one function parses input, applies rules, prices, takes payment and prints
void handle(const string& cmd) {
    vector<string> p = split(cmd, ' ');
    if (p[0] == "IN") {
        for (int i = 0; i < 5; i++) {
            // SMELL 4: fit rules hard-coded as string comparisons, duplicated elsewhere
            bool fits = p[1] == "BIKE" || (p[1] == "CAR" && sizes[i] != "S") || (p[1] == "TRUCK" && sizes[i] == "L");
            if (who[i].empty() && fits) {
                who[i] = p[2] + "/" + p[1];  // SMELL 5: type smuggled inside a string
                since[i] = stoll(p[3]);
                ticketCounter++;
                cout << "Ticket " << ticketCounter << " spot " << i << "\\n";
                return;
            }
        }
        cout << "FULL\\n";
    } else if (p[0] == "OUT") {
        int spot = stoi(p[1]);
        string type = split(who[spot], '/')[1];
        long long hrs = max(1LL, stoll(p[2]) - since[spot]);
        long long fee = type == "BIKE" ? hrs * 10 : type == "CAR" ? hrs * 20 : hrs * 50;  // SMELL 6: pricing inline
        if (p[3] == "CASH") cashInDrawer += fee;                                        // SMELL 7: payment inline
        else cout << "Calling card gateway...\\n";
        who[spot].clear();
        cout << "Paid " << fee << "\\n";
    } else if (p[0] == "SHOW") {
        int free = count_if(begin(who), end(who), [](const string& w) { return w.empty(); });
        cout << "Free spots: " << free << ", cash: " << cashInDrawer << "\\n";  // SMELL 8: UI inside domain
    }
}

int main() {
    handle("IN CAR KA-01 9");
    handle("IN TRUCK KA-77 9");
    handle("OUT 1 12 CASH");
    handle("SHOW");
}` }
    ],
    ParkingLotDemo: [
      { lang: 'python', code: `import itertools
import threading
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from enum import Enum


# ===================== 1. Value types (enums + dataclasses) =====================
class SpotType(Enum):
    """Physical size of a spot painted on the floor."""
    SMALL = 0
    COMPACT = 1
    LARGE = 2


class VehicleType(Enum):
    """Kind of vehicle. Each type knows which spot sizes it fits, best fit first."""
    BIKE = (SpotType.SMALL, SpotType.COMPACT, SpotType.LARGE)
    CAR = (SpotType.COMPACT, SpotType.LARGE)
    TRUCK = (SpotType.LARGE,)

    @property
    def fits(self) -> tuple[SpotType, ...]:
        """Spot types this vehicle may use, in order of preference (smallest that fits first)."""
        return self.value


@dataclass(frozen=True)
class Vehicle:
    """A vehicle is pure data: a number plate and a type. Immutable, so a frozen dataclass is perfect."""
    plate: str
    type: VehicleType


@dataclass(frozen=True)
class Receipt:
    """What the driver gets back at the exit gate."""
    ticket_id: str
    plate: str
    minutes_parked: int
    amount: int


# ===================== 2. Core entities =====================
class ParkingSpot:
    """One painted rectangle on one floor. Knows its own state: free or holding a vehicle."""

    def __init__(self, spot_id: str, floor: int, spot_type: SpotType) -> None:
        self.id = spot_id  # e.g. "F0-S3"
        self.floor = floor
        self.type = spot_type
        self.vehicle: Vehicle | None = None  # None means free

    def is_free(self) -> bool:
        return self.vehicle is None

    def assign(self, v: Vehicle) -> None:
        if not self.is_free():
            raise RuntimeError(f"Spot {self.id} already taken")
        if self.type not in v.type.fits:
            raise ValueError(f"{v.type.name} cannot use {self.type.name}")
        self.vehicle = v

    def release(self) -> None:
        self.vehicle = None


class ParkingFloor:
    """A floor is just an ordered group of spots."""

    def __init__(self, number: int, *layout: SpotType) -> None:
        self.number = number
        self.spots = [ParkingSpot(f"F{number}-S{i}", number, t) for i, t in enumerate(layout)]


@dataclass(frozen=True)
class Ticket:
    """Issued at the entry gate; links a vehicle to a spot and a start time."""
    id: str
    vehicle: Vehicle
    spot: ParkingSpot
    entry_time: datetime


# ===================== 3. Strategies (the parts that change) =====================
class SpotAllocationStrategy(ABC):
    """HOW we choose a spot. Swap implementations without touching ParkingLot (Strategy pattern)."""

    @abstractmethod
    def find_spot(self, floors: list[ParkingFloor], vtype: VehicleType) -> ParkingSpot | None: ...


class NearestFirstStrategy(SpotAllocationStrategy):
    """Lowest floor first; on each floor, the smallest spot type that fits; then lowest index."""

    def find_spot(self, floors: list[ParkingFloor], vtype: VehicleType) -> ParkingSpot | None:
        for floor in floors:
            for wanted in vtype.fits:
                for s in floor.spots:
                    if s.is_free() and s.type is wanted:
                        return s
        return None


class PricingStrategy(ABC):
    """HOW MUCH we charge. Another Strategy: weekend pricing, flat pricing, etc. plug in here."""

    @abstractmethod
    def fee(self, ticket: Ticket, exit_time: datetime) -> int: ...


class HourlyPricing(PricingStrategy):
    """Rate per started hour, by vehicle type. Minimum one hour."""

    def __init__(self, rate_per_hour: dict[VehicleType, int]) -> None:
        self._rate = dict(rate_per_hour)

    def fee(self, t: Ticket, exit_time: datetime) -> int:
        minutes = (exit_time - t.entry_time) // timedelta(minutes=1)
        hours = max(1, (minutes + 59) // 60)  # ceil, at least 1 hour
        return hours * self._rate[t.vehicle.type]


class TimeSource(ABC):
    """Where "now" comes from. Injected so tests and demos can control time (Dependency Inversion)."""

    @abstractmethod
    def now(self) -> datetime: ...


class FakeTime(TimeSource):
    def __init__(self) -> None:
        self._now = datetime(2026, 1, 1, 9, 0, tzinfo=timezone.utc)

    def now(self) -> datetime:
        return self._now

    def advance(self, d: timedelta) -> None:
        self._now += d


# ===================== 4. The facade the gates talk to =====================
class ParkingLotFullException(RuntimeError):
    def __init__(self, t: VehicleType) -> None:
        super().__init__(f"No free spot for {t.name}")


class ParkingLot:
    def __init__(self, floors: list[ParkingFloor], allocation: SpotAllocationStrategy,
                 pricing: PricingStrategy, clock: TimeSource) -> None:
        self._floors = list(floors)
        self._allocation = allocation
        self._pricing = pricing
        self._clock = clock
        self._active_tickets: dict[str, Ticket] = {}
        self._plates_inside: set[str] = set()
        self._ticket_seq = itertools.count(1)
        self._lock = threading.RLock()

    def park(self, v: Vehicle) -> Ticket:
        """Entry flow: find spot -> occupy it -> issue ticket. Locked so two gates never get the same spot."""
        with self._lock:
            if v.plate in self._plates_inside:
                raise RuntimeError(f"{v.plate} is already inside")
            spot = self._allocation.find_spot(self._floors, v.type)
            if spot is None:
                raise ParkingLotFullException(v.type)
            spot.assign(v)
            t = Ticket(f"T{next(self._ticket_seq)}", v, spot, self._clock.now())
            self._active_tickets[t.id] = t
            self._plates_inside.add(v.plate)
            return t

    def unpark(self, ticket_id: str) -> Receipt:
        """Exit flow: look up ticket -> price it -> free the spot -> close the ticket."""
        with self._lock:
            t = self._active_tickets.pop(ticket_id, None)
            if t is None:
                raise LookupError(f"Unknown or already used ticket {ticket_id}")
            exit_time = self._clock.now()
            amount = self._pricing.fee(t, exit_time)
            t.spot.release()
            self._plates_inside.discard(t.vehicle.plate)
            minutes = (exit_time - t.entry_time) // timedelta(minutes=1)
            return Receipt(t.id, t.vehicle.plate, minutes, amount)

    def free_spots(self) -> dict[SpotType, int]:
        """For the display board at the entrance."""
        with self._lock:
            free = {st: 0 for st in SpotType}
            for f in self._floors:
                for s in f.spots:
                    if s.is_free():
                        free[s.type] += 1
            return free


# ===================== 5. Gates: thin, they only talk to the lot =====================
class EntryGate:
    def __init__(self, lot: ParkingLot) -> None:
        self._lot = lot

    def enter(self, v: Vehicle) -> Ticket:
        return self._lot.park(v)


class ExitGate:
    def __init__(self, lot: ParkingLot) -> None:
        self._lot = lot

    def exit(self, ticket_id: str) -> Receipt:
        return self._lot.unpark(ticket_id)


# ===================== 6. Demo (what you show the interviewer at the end) =====================
def main() -> None:
    clock = FakeTime()
    floors = [
        ParkingFloor(0, SpotType.SMALL, SpotType.COMPACT, SpotType.COMPACT, SpotType.LARGE),
        ParkingFloor(1, SpotType.SMALL, SpotType.COMPACT, SpotType.LARGE, SpotType.LARGE),
    ]
    lot = ParkingLot(floors, NearestFirstStrategy(),
                     HourlyPricing({VehicleType.BIKE: 10, VehicleType.CAR: 20, VehicleType.TRUCK: 50}), clock)
    gate_in, gate_out = EntryGate(lot), ExitGate(lot)

    t1 = gate_in.enter(Vehicle("KA-01-1111", VehicleType.CAR))
    t2 = gate_in.enter(Vehicle("KA-02-2222", VehicleType.BIKE))
    t3 = gate_in.enter(Vehicle("KA-03-3333", VehicleType.TRUCK))
    print(f"{t1.id} -> {t1.spot.id}")  # T1 -> F0-S1
    print(f"{t2.id} -> {t2.spot.id}")  # T2 -> F0-S0
    print(f"{t3.id} -> {t3.spot.id}")  # T3 -> F0-S3
    free = lot.free_spots()
    print("Free: {" + ", ".join(f"{st.name}={n}" for st, n in free.items()) + "}")  # {SMALL=1, COMPACT=2, LARGE=2}

    try:
        gate_in.enter(Vehicle("KA-01-1111", VehicleType.CAR))  # the same plate cannot be inside twice
    except RuntimeError as e:
        print(e)

    clock.advance(timedelta(minutes=150))  # 2h30m later
    r = gate_out.exit(t1.id)
    print(f"Receipt {r.ticket_id} {r.plate} {r.minutes_parked} min, amount {r.amount}")  # 3 started hours x 20 = 60

    try:
        gate_out.exit(t1.id)  # same ticket twice
    except LookupError as e:
        print("Rejected:", e.args[0])

    t4 = gate_in.enter(Vehicle("KA-04-4444", VehicleType.TRUCK))
    t5 = gate_in.enter(Vehicle("KA-05-5555", VehicleType.TRUCK))
    print(f"{t4.id} -> {t4.spot.id}")  # T4 -> F1-S2
    print(f"{t5.id} -> {t5.spot.id}")  # T5 -> F1-S3
    try:
        gate_in.enter(Vehicle("KA-06-6666", VehicleType.TRUCK))  # all three LARGE spots are taken
    except ParkingLotFullException as e:
        print(e)


if __name__ == "__main__":
    main()` },
      { lang: 'ts', code: `// ===================== 1. Value types (enums + readonly interfaces) =====================

/** Physical size of a spot painted on the floor. */
enum SpotType { SMALL, COMPACT, LARGE }

/** Kind of vehicle. Each type knows which spot sizes it fits, best fit first. */
enum VehicleType { BIKE, CAR, TRUCK }

/** Spot types a vehicle may use, in order of preference (smallest that fits first). */
const FITS: Record<VehicleType, readonly SpotType[]> = {
  [VehicleType.BIKE]: [SpotType.SMALL, SpotType.COMPACT, SpotType.LARGE],
  [VehicleType.CAR]: [SpotType.COMPACT, SpotType.LARGE],
  [VehicleType.TRUCK]: [SpotType.LARGE],
};

/** A vehicle is pure data: a number plate and a type. Immutable. */
interface Vehicle {
  readonly plate: string;
  readonly type: VehicleType;
}

/** What the driver gets back at the exit gate. */
interface Receipt {
  readonly ticketId: string;
  readonly plate: string;
  readonly minutesParked: number;
  readonly amount: number;
}

// ===================== 2. Core entities =====================

/** One painted rectangle on one floor. Knows its own state: free or holding a vehicle. */
class ParkingSpot {
  vehicle: Vehicle | undefined; // undefined means free

  constructor(readonly id: string, readonly floor: number, readonly type: SpotType) {} // id e.g. "F0-S3"

  isFree(): boolean { return this.vehicle === undefined; }

  assign(v: Vehicle): void {
    if (!this.isFree()) throw new Error(\`Spot \${this.id} already taken\`);
    if (!FITS[v.type].includes(this.type)) throw new Error(\`\${VehicleType[v.type]} cannot use \${SpotType[this.type]}\`);
    this.vehicle = v;
  }

  release(): void { this.vehicle = undefined; }
}

/** A floor is just an ordered group of spots. */
class ParkingFloor {
  readonly spots: ParkingSpot[];
  constructor(readonly number: number, ...layout: SpotType[]) {
    this.spots = layout.map((t, i) => new ParkingSpot(\`F\${number}-S\${i}\`, number, t));
  }
}

/** Issued at the entry gate; links a vehicle to a spot and a start time. */
interface Ticket {
  readonly id: string;
  readonly vehicle: Vehicle;
  readonly spot: ParkingSpot;
  readonly entryTime: Date;
}

// ===================== 3. Strategies (the parts that change) =====================

/** HOW we choose a spot. Swap implementations without touching ParkingLot (Strategy pattern). */
interface SpotAllocationStrategy {
  findSpot(floors: ParkingFloor[], type: VehicleType): ParkingSpot | undefined;
}

/** Lowest floor first; on each floor, the smallest spot type that fits; then lowest index. */
class NearestFirstStrategy implements SpotAllocationStrategy {
  findSpot(floors: ParkingFloor[], type: VehicleType): ParkingSpot | undefined {
    for (const floor of floors) {
      for (const wanted of FITS[type]) {
        const hit = floor.spots.find((s) => s.isFree() && s.type === wanted);
        if (hit) return hit;
      }
    }
    return undefined;
  }
}

/** HOW MUCH we charge. Another Strategy: weekend pricing, flat pricing, etc. plug in here. */
interface PricingStrategy {
  fee(ticket: Ticket, exitTime: Date): number;
}

/** Rate per started hour, by vehicle type. Minimum one hour. */
class HourlyPricing implements PricingStrategy {
  constructor(private readonly ratePerHour: Readonly<Record<VehicleType, number>>) {}

  fee(t: Ticket, exitTime: Date): number {
    const minutes = Math.floor((exitTime.getTime() - t.entryTime.getTime()) / 60000);
    const hours = Math.max(1, Math.floor((minutes + 59) / 60)); // ceil, at least 1 hour
    return hours * this.ratePerHour[t.vehicle.type];
  }
}

/** Where "now" comes from. Injected so tests and demos can control time (Dependency Inversion). */
interface TimeSource {
  now(): Date;
}

class FakeTime implements TimeSource {
  private current = new Date("2026-01-01T09:00:00Z");
  now(): Date { return this.current; }
  advanceMinutes(m: number): void { this.current = new Date(this.current.getTime() + m * 60000); }
}

// ===================== 4. The facade the gates talk to =====================

class ParkingLotFullException extends Error {
  constructor(t: VehicleType) {
    super(\`No free spot for \${VehicleType[t]}\`);
  }
}

class ParkingLot {
  private readonly floors: ParkingFloor[];
  private readonly activeTickets = new Map<string, Ticket>();
  private readonly platesInside = new Set<string>();
  private ticketSeq = 1;

  constructor(
    floors: ParkingFloor[],
    private readonly allocation: SpotAllocationStrategy,
    private readonly pricing: PricingStrategy,
    private readonly clock: TimeSource,
  ) {
    this.floors = [...floors];
  }

  /** Entry flow: find spot -> occupy it -> issue ticket. (No await inside, so two gates never interleave.) */
  park(v: Vehicle): Ticket {
    if (this.platesInside.has(v.plate)) throw new Error(\`\${v.plate} is already inside\`);
    const spot = this.allocation.findSpot(this.floors, v.type);
    if (!spot) throw new ParkingLotFullException(v.type);
    spot.assign(v);
    const t: Ticket = { id: \`T\${this.ticketSeq++}\`, vehicle: v, spot, entryTime: this.clock.now() };
    this.activeTickets.set(t.id, t);
    this.platesInside.add(v.plate);
    return t;
  }

  /** Exit flow: look up ticket -> price it -> free the spot -> close the ticket. */
  unpark(ticketId: string): Receipt {
    const t = this.activeTickets.get(ticketId);
    if (!t) throw new Error(\`Unknown or already used ticket \${ticketId}\`);
    this.activeTickets.delete(ticketId);
    const exit = this.clock.now();
    const amount = this.pricing.fee(t, exit);
    t.spot.release();
    this.platesInside.delete(t.vehicle.plate);
    const minutesParked = Math.floor((exit.getTime() - t.entryTime.getTime()) / 60000);
    return { ticketId: t.id, plate: t.vehicle.plate, minutesParked, amount };
  }

  /** For the display board at the entrance. */
  freeSpots(): Map<SpotType, number> {
    const free = new Map<SpotType, number>([[SpotType.SMALL, 0], [SpotType.COMPACT, 0], [SpotType.LARGE, 0]]);
    for (const f of this.floors) {
      for (const s of f.spots) if (s.isFree()) free.set(s.type, (free.get(s.type) ?? 0) + 1);
    }
    return free;
  }
}

// ===================== 5. Gates: thin, they only talk to the lot =====================

class EntryGate {
  constructor(private readonly lot: ParkingLot) {}
  enter(v: Vehicle): Ticket { return this.lot.park(v); }
}

class ExitGate {
  constructor(private readonly lot: ParkingLot) {}
  exit(ticketId: string): Receipt { return this.lot.unpark(ticketId); }
}

// ===================== 6. Demo (what you show the interviewer at the end) =====================

function message(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

const time = new FakeTime();
const floors = [
  new ParkingFloor(0, SpotType.SMALL, SpotType.COMPACT, SpotType.COMPACT, SpotType.LARGE),
  new ParkingFloor(1, SpotType.SMALL, SpotType.COMPACT, SpotType.LARGE, SpotType.LARGE),
];
const lot = new ParkingLot(floors, new NearestFirstStrategy(),
  new HourlyPricing({ [VehicleType.BIKE]: 10, [VehicleType.CAR]: 20, [VehicleType.TRUCK]: 50 }), time);
const gateIn = new EntryGate(lot);
const gateOut = new ExitGate(lot);

const t1 = gateIn.enter({ plate: "KA-01-1111", type: VehicleType.CAR });
const t2 = gateIn.enter({ plate: "KA-02-2222", type: VehicleType.BIKE });
const t3 = gateIn.enter({ plate: "KA-03-3333", type: VehicleType.TRUCK });
console.log(\`\${t1.id} -> \${t1.spot.id}\`); // T1 -> F0-S1
console.log(\`\${t2.id} -> \${t2.spot.id}\`); // T2 -> F0-S0
console.log(\`\${t3.id} -> \${t3.spot.id}\`); // T3 -> F0-S3
const free = [...lot.freeSpots()].map(([st, n]) => \`\${SpotType[st]}=\${n}\`).join(", ");
console.log(\`Free: {\${free}}\`); // {SMALL=1, COMPACT=2, LARGE=2}

try {
  gateIn.enter({ plate: "KA-01-1111", type: VehicleType.CAR }); // the same plate cannot be inside twice
} catch (e) {
  console.log(message(e));
}

time.advanceMinutes(150); // 2h30m later
const r = gateOut.exit(t1.id);
console.log(\`Receipt \${r.ticketId} \${r.plate} \${r.minutesParked} min, amount \${r.amount}\`); // 3 started hours x 20 = 60

try {
  gateOut.exit(t1.id); // same ticket twice
} catch (e) {
  console.log("Rejected: " + message(e));
}

const t4 = gateIn.enter({ plate: "KA-04-4444", type: VehicleType.TRUCK });
const t5 = gateIn.enter({ plate: "KA-05-5555", type: VehicleType.TRUCK });
console.log(\`\${t4.id} -> \${t4.spot.id}\`); // T4 -> F1-S2
console.log(\`\${t5.id} -> \${t5.spot.id}\`); // T5 -> F1-S3
try {
  gateIn.enter({ plate: "KA-06-6666", type: VehicleType.TRUCK }); // all three LARGE spots are taken
} catch (e) {
  console.log(message(e));
}` },
      { lang: 'cpp', code: `// ===================== 1. Value types (enums + structs) =====================

/** Physical size of a spot painted on the floor. */
enum class SpotType { Small, Compact, Large };

/** Kind of vehicle. */
enum class VehicleType { Bike, Car, Truck };

const char* name(SpotType t) {
    switch (t) {
        case SpotType::Small: return "SMALL";
        case SpotType::Compact: return "COMPACT";
        case SpotType::Large: return "LARGE";
    }
    return "?";
}

const char* name(VehicleType t) {
    switch (t) {
        case VehicleType::Bike: return "BIKE";
        case VehicleType::Car: return "CAR";
        case VehicleType::Truck: return "TRUCK";
    }
    return "?";
}

/** Spot types a vehicle may use, in order of preference (smallest that fits first). */
const vector<SpotType>& fits(VehicleType t) {
    static const map<VehicleType, vector<SpotType>> table = {
        {VehicleType::Bike, {SpotType::Small, SpotType::Compact, SpotType::Large}},
        {VehicleType::Car, {SpotType::Compact, SpotType::Large}},
        {VehicleType::Truck, {SpotType::Large}},
    };
    return table.at(t);
}

/** A vehicle is pure data: a number plate and a type. */
struct Vehicle {
    string plate;
    VehicleType type;
};

/** What the driver gets back at the exit gate. */
struct Receipt {
    string ticketId, plate;
    long long minutesParked, amount;
};

// ===================== 2. Core entities =====================

/** One painted rectangle on one floor. Knows its own state: free or holding a vehicle. */
class ParkingSpot {
public:
    ParkingSpot(string id, int floor, SpotType type) : id_(move(id)), floor_(floor), type_(type) {}

    bool isFree() const { return !vehicle_.has_value(); }

    void assign(const Vehicle& v) {
        if (!isFree()) throw logic_error("Spot " + id_ + " already taken");
        const auto& ok = fits(v.type);
        if (find(ok.begin(), ok.end(), type_) == ok.end())
            throw invalid_argument(string(name(v.type)) + " cannot use " + name(type_));
        vehicle_ = v;
    }

    void release() { vehicle_.reset(); }

    const string& id() const { return id_; }
    SpotType type() const { return type_; }

private:
    string id_;  // e.g. "F0-S3"
    int floor_;
    SpotType type_;
    optional<Vehicle> vehicle_;  // empty means free
};

/** A floor is just an ordered group of spots. */
class ParkingFloor {
public:
    ParkingFloor(int number, const vector<SpotType>& layout) : number_(number) {
        for (size_t i = 0; i < layout.size(); i++)
            spots_.emplace_back("F" + to_string(number) + "-S" + to_string(i), number, layout[i]);
    }
    vector<ParkingSpot>& spots() { return spots_; }

private:
    int number_;
    vector<ParkingSpot> spots_;  // never resized after construction, so pointers to spots stay valid
};

/** Issued at the entry gate; links a vehicle to a spot (non-owning: the floors own spots) and a start time. */
struct Ticket {
    string id;
    Vehicle vehicle;
    ParkingSpot* spot;
    chrono::sys_seconds entryTime;
};

// ===================== 3. Strategies (the parts that change) =====================

/** HOW we choose a spot. Swap implementations without touching ParkingLot (Strategy pattern). */
class SpotAllocationStrategy {
public:
    virtual ~SpotAllocationStrategy() = default;
    virtual ParkingSpot* findSpot(vector<ParkingFloor>& floors, VehicleType type) const = 0;
};

/** Lowest floor first; on each floor, the smallest spot type that fits; then lowest index. */
class NearestFirstStrategy : public SpotAllocationStrategy {
public:
    ParkingSpot* findSpot(vector<ParkingFloor>& floors, VehicleType type) const override {
        for (auto& floor : floors)
            for (SpotType wanted : fits(type))
                for (auto& s : floor.spots())
                    if (s.isFree() && s.type() == wanted) return &s;
        return nullptr;
    }
};

/** HOW MUCH we charge. Another Strategy: weekend pricing, flat pricing, etc. plug in here. */
class PricingStrategy {
public:
    virtual ~PricingStrategy() = default;
    virtual long long fee(const Ticket& ticket, chrono::sys_seconds exitTime) const = 0;
};

long long minutesBetween(chrono::sys_seconds from, chrono::sys_seconds to) {
    return chrono::duration_cast<chrono::minutes>(to - from).count();
}

/** Rate per started hour, by vehicle type. Minimum one hour. */
class HourlyPricing : public PricingStrategy {
public:
    explicit HourlyPricing(map<VehicleType, long long> ratePerHour) : rate_(move(ratePerHour)) {}
    long long fee(const Ticket& t, chrono::sys_seconds exitTime) const override {
        long long hours = max(1LL, (minutesBetween(t.entryTime, exitTime) + 59) / 60);  // ceil, at least 1 hour
        return hours * rate_.at(t.vehicle.type);
    }

private:
    map<VehicleType, long long> rate_;
};

/** Where "now" comes from. Injected so tests and demos can control time (Dependency Inversion). */
class TimeSource {
public:
    virtual ~TimeSource() = default;
    virtual chrono::sys_seconds now() const = 0;
};

class FakeTime : public TimeSource {
public:
    chrono::sys_seconds now() const override { return now_; }
    void advance(chrono::minutes d) { now_ += d; }

private:
    chrono::sys_seconds now_ = chrono::sys_days{chrono::year{2026} / 1 / 1} + chrono::hours(9);
};

// ===================== 4. The facade the gates talk to =====================

class ParkingLotFullException : public runtime_error {
public:
    explicit ParkingLotFullException(VehicleType t) : runtime_error(string("No free spot for ") + name(t)) {}
};

class ParkingLot {
public:
    ParkingLot(vector<ParkingFloor> floors, unique_ptr<SpotAllocationStrategy> allocation,
               unique_ptr<PricingStrategy> pricing, const TimeSource& clock)
        : floors_(move(floors)), allocation_(move(allocation)), pricing_(move(pricing)), clock_(clock) {}

    /** Entry flow: find spot -> occupy it -> issue ticket. Locked so two gates never get the same spot. */
    Ticket park(const Vehicle& v) {
        lock_guard<recursive_mutex> guard(mu_);
        if (platesInside_.count(v.plate)) throw logic_error(v.plate + " is already inside");
        ParkingSpot* spot = allocation_->findSpot(floors_, v.type);
        if (!spot) throw ParkingLotFullException(v.type);
        spot->assign(v);
        Ticket t{"T" + to_string(ticketSeq_++), v, spot, clock_.now()};
        activeTickets_.emplace(t.id, t);
        platesInside_.insert(v.plate);
        return t;
    }

    /** Exit flow: look up ticket -> price it -> free the spot -> close the ticket. */
    Receipt unpark(const string& ticketId) {
        lock_guard<recursive_mutex> guard(mu_);
        auto it = activeTickets_.find(ticketId);
        if (it == activeTickets_.end()) throw out_of_range("Unknown or already used ticket " + ticketId);
        Ticket t = it->second;
        activeTickets_.erase(it);
        auto exitTime = clock_.now();
        long long amount = pricing_->fee(t, exitTime);
        t.spot->release();
        platesInside_.erase(t.vehicle.plate);
        return {t.id, t.vehicle.plate, minutesBetween(t.entryTime, exitTime), amount};
    }

    /** For the display board at the entrance. */
    map<SpotType, int> freeSpots() {
        lock_guard<recursive_mutex> guard(mu_);
        map<SpotType, int> free = {{SpotType::Small, 0}, {SpotType::Compact, 0}, {SpotType::Large, 0}};
        for (auto& f : floors_)
            for (auto& s : f.spots())
                if (s.isFree()) free[s.type()]++;
        return free;
    }

private:
    vector<ParkingFloor> floors_;
    unique_ptr<SpotAllocationStrategy> allocation_;
    unique_ptr<PricingStrategy> pricing_;
    const TimeSource& clock_;
    map<string, Ticket> activeTickets_;
    set<string> platesInside_;
    int ticketSeq_ = 1;
    recursive_mutex mu_;
};

// ===================== 5. Gates: thin, they only talk to the lot =====================

class EntryGate {
public:
    explicit EntryGate(ParkingLot& lot) : lot_(lot) {}
    Ticket enter(const Vehicle& v) { return lot_.park(v); }

private:
    ParkingLot& lot_;
};

class ExitGate {
public:
    explicit ExitGate(ParkingLot& lot) : lot_(lot) {}
    Receipt exit(const string& ticketId) { return lot_.unpark(ticketId); }

private:
    ParkingLot& lot_;
};

// ===================== 6. Demo (what you show the interviewer at the end) =====================

int main() {
    FakeTime time;
    vector<ParkingFloor> floors;
    floors.emplace_back(0, vector<SpotType>{SpotType::Small, SpotType::Compact, SpotType::Compact, SpotType::Large});
    floors.emplace_back(1, vector<SpotType>{SpotType::Small, SpotType::Compact, SpotType::Large, SpotType::Large});
    ParkingLot lot(move(floors), make_unique<NearestFirstStrategy>(),
                   make_unique<HourlyPricing>(map<VehicleType, long long>{{VehicleType::Bike, 10}, {VehicleType::Car, 20}, {VehicleType::Truck, 50}}),
                   time);
    EntryGate in(lot);
    ExitGate out(lot);

    Ticket t1 = in.enter({"KA-01-1111", VehicleType::Car});
    Ticket t2 = in.enter({"KA-02-2222", VehicleType::Bike});
    Ticket t3 = in.enter({"KA-03-3333", VehicleType::Truck});
    cout << t1.id << " -> " << t1.spot->id() << "\\n";  // T1 -> F0-S1
    cout << t2.id << " -> " << t2.spot->id() << "\\n";  // T2 -> F0-S0
    cout << t3.id << " -> " << t3.spot->id() << "\\n";  // T3 -> F0-S3
    auto free = lot.freeSpots();
    cout << "Free: {SMALL=" << free[SpotType::Small] << ", COMPACT=" << free[SpotType::Compact]
         << ", LARGE=" << free[SpotType::Large] << "}\\n";  // {SMALL=1, COMPACT=2, LARGE=2}

    try { in.enter({"KA-01-1111", VehicleType::Car}); } catch (const logic_error& e) { cout << e.what() << "\\n"; }  // same plate twice

    time.advance(chrono::minutes(150));  // 2h30m later
    Receipt r = out.exit(t1.id);
    cout << "Receipt " << r.ticketId << " " << r.plate << " " << r.minutesParked << " min, amount " << r.amount << "\\n";  // 3 started hours x 20 = 60

    try { out.exit(t1.id); } catch (const out_of_range& e) { cout << "Rejected: " << e.what() << "\\n"; }  // same ticket twice

    Ticket t4 = in.enter({"KA-04-4444", VehicleType::Truck});
    Ticket t5 = in.enter({"KA-05-5555", VehicleType::Truck});
    cout << t4.id << " -> " << t4.spot->id() << "\\n";  // T4 -> F1-S2
    cout << t5.id << " -> " << t5.spot->id() << "\\n";  // T5 -> F1-S3
    try { in.enter({"KA-06-6666", VehicleType::Truck}); } catch (const ParkingLotFullException& e) { cout << e.what() << "\\n"; }  // all LARGE taken
}` }
    ],
    t4_flow: [
      { lang: 'python', code: `from abc import ABC, abstractmethod
from collections import deque
from datetime import datetime, timedelta, timezone
from enum import Enum


class TicketStatus(Enum):  # a tiny state machine
    ACTIVE = "ACTIVE"
    PAID = "PAID"
    EXITED = "EXITED"


class PaymentMode(Enum):
    CASH = "CASH"
    CARD = "CARD"
    UPI = "UPI"


class PaymentProcessor(ABC):
    """Strategy for HOW money is collected. A real one would call a gateway; here they just succeed."""

    @abstractmethod
    def charge(self, ticket_id: str, amount: int) -> bool: ...


class CashProcessor(PaymentProcessor):
    def charge(self, ticket_id: str, amount: int) -> bool:
        return True


class UpiProcessor(PaymentProcessor):
    def charge(self, ticket_id: str, amount: int) -> bool:
        return amount > 0


class ParkingListener(ABC):
    """Observer for screens at the entrance and on each floor."""

    @abstractmethod
    def spot_taken(self, spot_id: str) -> None: ...

    @abstractmethod
    def spot_freed(self, spot_id: str) -> None: ...


class FlowTicket:
    def __init__(self, ticket_id: str, spot_id: str, entry: datetime) -> None:
        self.id = ticket_id
        self.spot_id = spot_id
        self.entry = entry
        self.status = TicketStatus.ACTIVE
        self.paid = 0

    def move_to(self, nxt: TicketStatus) -> None:
        """Only legal transitions are allowed; anything else is a bug or fraud."""
        ok = (self.status is TicketStatus.ACTIVE and nxt is TicketStatus.PAID) or (
            self.status is TicketStatus.PAID and nxt is TicketStatus.EXITED
        )
        if not ok:
            raise RuntimeError(f"Ticket {self.id}: {self.status.name} -> {nxt.name} not allowed")
        self.status = nxt


class ParkingFlow:
    def __init__(self, spots: list[str], rate_per_hour: int) -> None:
        self._free_spots = deque(spots)
        self._tickets: dict[str, FlowTicket] = {}
        self._processors: dict[PaymentMode, PaymentProcessor] = {
            PaymentMode.CASH: CashProcessor(),
            PaymentMode.UPI: UpiProcessor(),
        }
        self._listeners: list[ParkingListener] = []
        self._rate = rate_per_hour
        self._seq = 1

    def add_listener(self, listener: ParkingListener) -> None:
        self._listeners.append(listener)

    def enter(self, now: datetime) -> FlowTicket:
        """ENTRY GATE: take nearest spot, issue ticket, tell the screens."""
        if not self._free_spots:
            raise RuntimeError("Lot full")
        spot = self._free_spots.popleft()
        ticket = FlowTicket(f"T{self._seq}", spot, now)
        self._seq += 1
        self._tickets[ticket.id] = ticket
        for listener in self._listeners:
            listener.spot_taken(spot)
        return ticket

    def pay(self, ticket_id: str, now: datetime, mode: PaymentMode) -> int:
        """PAY STATION: price the stay and collect money. Spot is NOT freed yet (car still inside)."""
        t = self._find(ticket_id)
        minutes = (now - t.entry) // timedelta(minutes=1)
        hours = max(1, (minutes + 59) // 60)
        amount = hours * self._rate
        processor = self._processors.get(mode)
        if processor is None:
            raise NotImplementedError(f"{mode.name} not accepted here")
        if not processor.charge(t.id, amount):
            raise RuntimeError("Payment declined")
        t.move_to(TicketStatus.PAID)
        t.paid = amount
        return amount

    def exit(self, ticket_id: str) -> None:
        """EXIT GATE: barrier opens only for PAID tickets; then the spot is released."""
        t = self._find(ticket_id)
        t.move_to(TicketStatus.EXITED)  # raises if not paid
        self._free_spots.appendleft(t.spot_id)  # nearest-first reuse
        for listener in self._listeners:
            listener.spot_freed(t.spot_id)

    def _find(self, ticket_id: str) -> FlowTicket:
        t = self._tickets.get(ticket_id)
        if t is None:
            raise LookupError(f"No ticket {ticket_id}")
        return t


class ScreenBoard(ParkingListener):
    def spot_taken(self, spot_id: str) -> None:
        print(f"[screen] {spot_id} taken")

    def spot_freed(self, spot_id: str) -> None:
        print(f"[screen] {spot_id} free")


def main() -> None:
    lot = ParkingFlow(["A1", "A2"], 40)
    lot.add_listener(ScreenBoard())
    nine = datetime(2026, 1, 1, 9, 0, tzinfo=timezone.utc)
    t = lot.enter(nine)  # [screen] A1 taken
    try:
        lot.exit(t.id)  # not paid yet
    except RuntimeError as e:
        print(e)
    print("Paid", lot.pay(t.id, nine + timedelta(minutes=95), PaymentMode.UPI))  # 2 hours -> 80
    lot.exit(t.id)  # [screen] A1 free


if __name__ == "__main__":
    main()` },
      { lang: 'ts', code: `type TicketStatus = "ACTIVE" | "PAID" | "EXITED"; // a tiny state machine
type PaymentMode = "CASH" | "CARD" | "UPI";

/** Strategy for HOW money is collected. A real one would call a gateway; here they just succeed. */
interface PaymentProcessor {
  charge(ticketId: string, amount: number): boolean;
}

class CashProcessor implements PaymentProcessor {
  charge(_id: string, _amt: number): boolean { return true; }
}

class UpiProcessor implements PaymentProcessor {
  charge(_id: string, amt: number): boolean { return amt > 0; }
}

/** Observer for screens at the entrance and on each floor. */
interface ParkingListener {
  spotTaken(spotId: string): void;
  spotFreed(spotId: string): void;
}

class FlowTicket {
  status: TicketStatus = "ACTIVE";
  paid = 0;
  constructor(readonly id: string, readonly spotId: string, readonly entry: Date) {}

  /** Only legal transitions are allowed; anything else is a bug or fraud. */
  moveTo(next: TicketStatus): void {
    const ok = (this.status === "ACTIVE" && next === "PAID") || (this.status === "PAID" && next === "EXITED");
    if (!ok) throw new Error(\`Ticket \${this.id}: \${this.status} -> \${next} not allowed\`);
    this.status = next;
  }
}

class ParkingFlow {
  private readonly freeSpots: string[];
  private readonly tickets = new Map<string, FlowTicket>();
  private readonly processors = new Map<PaymentMode, PaymentProcessor>([
    ["CASH", new CashProcessor()],
    ["UPI", new UpiProcessor()],
  ]);
  private readonly listeners: ParkingListener[] = [];
  private seq = 1;

  constructor(spots: string[], private readonly ratePerHour: number) {
    this.freeSpots = [...spots];
  }

  addListener(l: ParkingListener): void { this.listeners.push(l); }

  /** ENTRY GATE: take nearest spot, issue ticket, tell the screens. */
  enter(now: Date): FlowTicket {
    const spot = this.freeSpots.shift();
    if (spot === undefined) throw new Error("Lot full");
    const t = new FlowTicket(\`T\${this.seq++}\`, spot, now);
    this.tickets.set(t.id, t);
    this.listeners.forEach((l) => l.spotTaken(spot));
    return t;
  }

  /** PAY STATION: price the stay and collect money. Spot is NOT freed yet (car still inside). */
  pay(ticketId: string, now: Date, mode: PaymentMode): number {
    const t = this.find(ticketId);
    const minutes = Math.floor((now.getTime() - t.entry.getTime()) / 60000);
    const hours = Math.max(1, Math.floor((minutes + 59) / 60));
    const amount = hours * this.ratePerHour;
    const p = this.processors.get(mode);
    if (!p) throw new Error(\`\${mode} not accepted here\`);
    if (!p.charge(t.id, amount)) throw new Error("Payment declined");
    t.moveTo("PAID");
    t.paid = amount;
    return amount;
  }

  /** EXIT GATE: barrier opens only for PAID tickets; then the spot is released. */
  exit(ticketId: string): void {
    const t = this.find(ticketId);
    t.moveTo("EXITED"); // throws if not paid
    this.freeSpots.unshift(t.spotId); // nearest-first reuse
    this.listeners.forEach((l) => l.spotFreed(t.spotId));
  }

  private find(id: string): FlowTicket {
    const t = this.tickets.get(id);
    if (!t) throw new Error(\`No ticket \${id}\`);
    return t;
  }
}

const lot = new ParkingFlow(["A1", "A2"], 40);
lot.addListener({
  spotTaken: (s) => console.log(\`[screen] \${s} taken\`),
  spotFreed: (s) => console.log(\`[screen] \${s} free\`),
});
const nine = new Date("2026-01-01T09:00:00Z");
const t = lot.enter(nine); // [screen] A1 taken
try {
  lot.exit(t.id); // not paid yet
} catch (e) {
  console.log((e as Error).message);
}
console.log("Paid " + lot.pay(t.id, new Date(nine.getTime() + 95 * 60000), "UPI")); // 2 hours -> 80
lot.exit(t.id); // [screen] A1 free` },
      { lang: 'cpp', code: `enum class TicketStatus { Active, Paid, Exited };  // a tiny state machine
enum class PaymentMode { Cash, Card, Upi };

const char* name(TicketStatus s) {
    switch (s) {
        case TicketStatus::Active: return "ACTIVE";
        case TicketStatus::Paid: return "PAID";
        case TicketStatus::Exited: return "EXITED";
    }
    return "?";
}

/** Strategy for HOW money is collected. A real one would call a gateway; here they just succeed. */
class PaymentProcessor {
public:
    virtual ~PaymentProcessor() = default;
    virtual bool charge(const string& ticketId, long long amount) const = 0;
};
class CashProcessor : public PaymentProcessor {
public:
    bool charge(const string&, long long) const override { return true; }
};
class UpiProcessor : public PaymentProcessor {
public:
    bool charge(const string&, long long amount) const override { return amount > 0; }
};

/** Observer for screens at the entrance and on each floor. */
class ParkingListener {
public:
    virtual ~ParkingListener() = default;
    virtual void spotTaken(const string& spotId) = 0;
    virtual void spotFreed(const string& spotId) = 0;
};

using Instant = chrono::sys_seconds;

struct FlowTicket {
    string id, spotId;
    Instant entry;
    TicketStatus status = TicketStatus::Active;
    long long paid = 0;

    /** Only legal transitions are allowed; anything else is a bug or fraud. */
    void moveTo(TicketStatus next) {
        bool ok = (status == TicketStatus::Active && next == TicketStatus::Paid) ||
                  (status == TicketStatus::Paid && next == TicketStatus::Exited);
        if (!ok) throw logic_error("Ticket " + id + ": " + name(status) + " -> " + name(next) + " not allowed");
        status = next;
    }
};

class ParkingFlow {
public:
    ParkingFlow(const vector<string>& spots, long long ratePerHour)
        : freeSpots_(spots.begin(), spots.end()), ratePerHour_(ratePerHour) {
        processors_[PaymentMode::Cash] = make_unique<CashProcessor>();
        processors_[PaymentMode::Upi] = make_unique<UpiProcessor>();
    }

    void addListener(ParkingListener& l) { listeners_.push_back(&l); }  // non-owning

    /** ENTRY GATE: take nearest spot, issue ticket, tell the screens. */
    FlowTicket& enter(Instant now) {
        lock_guard<mutex> guard(mu_);
        if (freeSpots_.empty()) throw logic_error("Lot full");
        string spot = freeSpots_.front();
        freeSpots_.pop_front();
        string id = "T" + to_string(seq_++);
        FlowTicket& t = tickets_.emplace(id, FlowTicket{id, spot, now}).first->second;
        for (auto* l : listeners_) l->spotTaken(spot);
        return t;
    }

    /** PAY STATION: price the stay and collect money. Spot is NOT freed yet (car still inside). */
    long long pay(const string& ticketId, Instant now, PaymentMode mode) {
        lock_guard<mutex> guard(mu_);
        FlowTicket& t = find(ticketId);
        long long minutes = chrono::duration_cast<chrono::minutes>(now - t.entry).count();
        long long hours = max(1LL, (minutes + 59) / 60);
        long long amount = hours * ratePerHour_;
        auto it = processors_.find(mode);
        if (it == processors_.end()) throw runtime_error("payment mode not accepted here");
        if (!it->second->charge(t.id, amount)) throw logic_error("Payment declined");
        t.moveTo(TicketStatus::Paid);
        t.paid = amount;
        return amount;
    }

    /** EXIT GATE: barrier opens only for PAID tickets; then the spot is released. */
    void exit(const string& ticketId) {
        lock_guard<mutex> guard(mu_);
        FlowTicket& t = find(ticketId);
        t.moveTo(TicketStatus::Exited);  // throws if not paid
        freeSpots_.push_front(t.spotId);  // nearest-first reuse
        for (auto* l : listeners_) l->spotFreed(t.spotId);
    }

private:
    FlowTicket& find(const string& id) {
        auto it = tickets_.find(id);
        if (it == tickets_.end()) throw out_of_range("No ticket " + id);
        return it->second;
    }

    deque<string> freeSpots_;
    map<string, FlowTicket> tickets_;  // map nodes never move, so returned references stay valid
    map<PaymentMode, unique_ptr<PaymentProcessor>> processors_;
    vector<ParkingListener*> listeners_;
    long long ratePerHour_;
    int seq_ = 1;
    mutex mu_;
};

class ScreenBoard : public ParkingListener {
public:
    void spotTaken(const string& s) override { cout << "[screen] " << s << " taken\\n"; }
    void spotFreed(const string& s) override { cout << "[screen] " << s << " free\\n"; }
};

int main() {
    ParkingFlow lot({"A1", "A2"}, 40);
    ScreenBoard screen;
    lot.addListener(screen);
    Instant nine = chrono::sys_days{chrono::year{2026} / 1 / 1} + chrono::hours(9);
    FlowTicket& t = lot.enter(nine);  // [screen] A1 taken
    try { lot.exit(t.id); } catch (const logic_error& e) { cout << e.what() << "\\n"; }  // not paid yet
    cout << "Paid " << lot.pay(t.id, nine + chrono::minutes(95), PaymentMode::Upi) << "\\n";  // 2 hours -> 80
    lot.exit(t.id);  // [screen] A1 free
}` }
    ],
    TicTacToeDemo: [
      { lang: 'python', code: `from abc import ABC, abstractmethod
from collections import deque
from dataclasses import dataclass
from enum import Enum


# ===================== 1. Small value types =====================
class GameStatus(Enum):
    IN_PROGRESS = "IN_PROGRESS"
    WON = "WON"
    DRAW = "DRAW"


# ===================== 2. Players (Strategy: how a move is chosen) =====================
class Player(ABC):
    """Anything that can pick a move: a human at a keyboard, a scripted test, a bot."""

    @abstractmethod
    def name(self) -> str: ...

    @abstractmethod
    def symbol(self) -> str: ...

    @abstractmethod
    def choose_move(self, board: "Board") -> tuple[int, int]: ...  # returns (row, col)


@dataclass(frozen=True)
class Move:
    """A move is just data: who played where."""
    row: int
    col: int
    player: Player


class ScriptedPlayer(Player):
    """Plays a fixed list of moves. Perfect for demos and unit tests (no input() needed)."""

    def __init__(self, name: str, symbol: str, *script: tuple[int, int]) -> None:
        self._name = name
        self._symbol = symbol
        self._moves = deque(script)

    def name(self) -> str:
        return self._name

    def symbol(self) -> str:
        return self._symbol

    def choose_move(self, board: "Board") -> tuple[int, int]:
        if not self._moves:
            raise RuntimeError(f"{self._name} ran out of scripted moves")
        return self._moves.popleft()


# ===================== 3. Board: owns cells and validation only =====================
class Board:
    EMPTY = "."

    def __init__(self, n: int) -> None:
        if n < 3:
            raise ValueError("Board must be at least 3x3")
        self._n = n
        self._cells = [[self.EMPTY] * n for _ in range(n)]
        self._filled = 0

    @property
    def size(self) -> int:
        return self._n

    def is_full(self) -> bool:
        return self._filled == self._n * self._n

    def at(self, r: int, c: int) -> str:
        return self._cells[r][c]

    def is_valid(self, r: int, c: int) -> bool:
        return 0 <= r < self._n and 0 <= c < self._n and self._cells[r][c] == self.EMPTY

    def place(self, r: int, c: int, symbol: str) -> None:
        if not self.is_valid(r, c):
            raise ValueError(f"Illegal move ({r},{c})")
        self._cells[r][c] = symbol
        self._filled += 1

    def print(self) -> None:
        for row in self._cells:
            print("".join(row))


# ===================== 4. Win detection: its own class, O(1) per move =====================
class WinningStrategy(ABC):
    """Rule for "who won?". Separate interface so "4 in a row" or "corners win" variants plug in."""

    @abstractmethod
    def is_winning_move(self, board: Board, move: Move, player_index: int) -> bool: ...


class CounterWinningStrategy(WinningStrategy):
    """Keeps a counter per (player, row), (player, col), and both diagonals.
    A player wins when any counter reaches n. Each move costs O(1) instead of rescanning O(n^2)."""

    def __init__(self, n: int, players: int) -> None:
        self._n = n
        self._rows = [[0] * n for _ in range(players)]
        self._cols = [[0] * n for _ in range(players)]
        self._diag = [0] * players
        self._anti = [0] * players

    def is_winning_move(self, board: Board, m: Move, p: int) -> bool:
        r, c, n = m.row, m.col, self._n
        self._rows[p][r] += 1
        if self._rows[p][r] == n:
            return True
        self._cols[p][c] += 1
        if self._cols[p][c] == n:
            return True
        if r == c:
            self._diag[p] += 1
            if self._diag[p] == n:
                return True
        if r + c == n - 1:
            self._anti[p] += 1
            return self._anti[p] == n
        return False


# ===================== 5. Game: turn order + status (the orchestrator) =====================
class Game:
    def __init__(self, n: int, players: list[Player]) -> None:
        if len(players) < 2:
            raise ValueError("Need at least 2 players")
        seen: set[str] = set()
        for p in players:
            if p.symbol() in seen:
                raise ValueError(f"Duplicate symbol {p.symbol()}")
            seen.add(p.symbol())
        self._board = Board(n)
        self._players = list(players)
        self._rules: WinningStrategy = CounterWinningStrategy(n, len(players))
        self._history: list[Move] = []
        self._turn = 0
        self._status = GameStatus.IN_PROGRESS
        self._winner: Player | None = None

    def make_move(self, r: int, c: int) -> GameStatus:
        """Apply one move for the player whose turn it is. Returns the new status."""
        if self._status is not GameStatus.IN_PROGRESS:
            raise RuntimeError(f"Game is over: {self._status.name}")
        p = self._players[self._turn]
        self._board.place(r, c, p.symbol())  # raises on illegal move; turn does not advance
        m = Move(r, c, p)
        self._history.append(m)
        if self._rules.is_winning_move(self._board, m, self._turn):
            self._status = GameStatus.WON
            self._winner = p
        elif self._board.is_full():
            self._status = GameStatus.DRAW
        else:
            self._turn = (self._turn + 1) % len(self._players)
        return self._status

    def play(self) -> None:
        """Drive the game by asking each Player for a move until it ends."""
        while self._status is GameStatus.IN_PROGRESS:
            r, c = self._players[self._turn].choose_move(self._board)
            self.make_move(r, c)

    @property
    def status(self) -> GameStatus:
        return self._status

    @property
    def winner(self) -> Player | None:
        return self._winner

    @property
    def history(self) -> list[Move]:
        return list(self._history)

    @property
    def board(self) -> Board:
        return self._board


# ===================== 6. Demo =====================
def main() -> None:
    alice = ScriptedPlayer("Alice", "X", (0, 0), (1, 1), (2, 2))
    bob = ScriptedPlayer("Bob", "O", (0, 1), (0, 2))
    game = Game(3, [alice, bob])
    game.play()
    game.board.print()
    # XOO
    # .X.
    # ..X
    winner = game.winner.name() if game.winner else "none"
    print(f"{game.status.name} winner={winner}")
    print(f"Moves played: {len(game.history)}")  # 5

    # Failure paths: each one is refused by exactly one class, and the game state stays valid.
    g2 = Game(3, [ScriptedPlayer("A", "X"), ScriptedPlayer("B", "O")])
    g2.make_move(0, 0)
    try:
        g2.make_move(0, 0)  # occupied
    except ValueError as e:
        print(e)
    g2.make_move(1, 1)  # still B's turn: the refused move did not advance it
    g2.board.print()
    # board now: X.. / .O. / ...
    try:
        game.make_move(1, 0)  # game already won
    except RuntimeError as e:
        print(e)
    try:
        Game(3, [alice, ScriptedPlayer("Cy", "X")])  # same symbol twice
    except ValueError as e:
        print(e)
    try:
        Game(2, [alice, bob])
    except ValueError as e:
        print(e)
    try:
        Game(3, [ScriptedPlayer("A", "X", (0, 0)), ScriptedPlayer("B", "O")]).play()  # B has no moves
    except RuntimeError as e:
        print(e)


if __name__ == "__main__":
    main()` },
      { lang: 'ts', code: `// ===================== 1. Small value types =====================

type GameStatus = "IN_PROGRESS" | "WON" | "DRAW";

// ===================== 2. Players (Strategy: how a move is chosen) =====================

/** Anything that can pick a move: a human at a keyboard, a scripted test, a bot. */
interface Player {
  name(): string;
  symbol(): string;
  chooseMove(board: Board): [number, number]; // returns [row, col]
}

/** A move is just data: who played where. */
interface Move {
  readonly row: number;
  readonly col: number;
  readonly player: Player;
}

/** Plays a fixed list of moves. Perfect for demos and unit tests (no prompt needed). */
class ScriptedPlayer implements Player {
  private readonly moves: Array<[number, number]>;

  constructor(private readonly who: string, private readonly sym: string, ...script: Array<[number, number]>) {
    this.moves = [...script];
  }

  name(): string { return this.who; }
  symbol(): string { return this.sym; }
  chooseMove(_board: Board): [number, number] {
    const next = this.moves.shift();
    if (!next) throw new Error(\`\${this.who} ran out of scripted moves\`);
    return next;
  }
}

// ===================== 3. Board: owns cells and validation only =====================

class Board {
  static readonly EMPTY = ".";
  private readonly cells: string[][];
  private filled = 0;

  constructor(private readonly n: number) {
    if (n < 3) throw new Error("Board must be at least 3x3");
    this.cells = Array.from({ length: n }, () => new Array<string>(n).fill(Board.EMPTY));
  }

  size(): number { return this.n; }
  isFull(): boolean { return this.filled === this.n * this.n; }
  at(r: number, c: number): string { return this.cells[r][c]; }

  isValid(r: number, c: number): boolean {
    return r >= 0 && r < this.n && c >= 0 && c < this.n && this.cells[r][c] === Board.EMPTY;
  }

  place(r: number, c: number, symbol: string): void {
    if (!this.isValid(r, c)) throw new Error(\`Illegal move (\${r},\${c})\`);
    this.cells[r][c] = symbol;
    this.filled++;
  }

  print(): void {
    for (const row of this.cells) console.log(row.join(""));
  }
}

// ===================== 4. Win detection: its own class, O(1) per move =====================

/** Rule for "who won?". Separate interface so "4 in a row" or "corners win" variants plug in. */
interface WinningStrategy {
  isWinningMove(board: Board, move: Move, playerIndex: number): boolean;
}

/**
 * Keeps a counter per (player, row), (player, col), and both diagonals.
 * A player wins when any counter reaches n. Each move costs O(1) instead of rescanning O(n^2).
 */
class CounterWinningStrategy implements WinningStrategy {
  private readonly rows: number[][];
  private readonly cols: number[][];
  private readonly diag: number[];
  private readonly anti: number[];

  constructor(private readonly n: number, players: number) {
    this.rows = Array.from({ length: players }, () => new Array<number>(n).fill(0));
    this.cols = Array.from({ length: players }, () => new Array<number>(n).fill(0));
    this.diag = new Array<number>(players).fill(0);
    this.anti = new Array<number>(players).fill(0);
  }

  isWinningMove(_board: Board, m: Move, p: number): boolean {
    const { row: r, col: c } = m;
    if (++this.rows[p][r] === this.n) return true;
    if (++this.cols[p][c] === this.n) return true;
    if (r === c && ++this.diag[p] === this.n) return true;
    return r + c === this.n - 1 && ++this.anti[p] === this.n;
  }
}

// ===================== 5. Game: turn order + status (the orchestrator) =====================

class Game {
  private readonly board: Board;
  private readonly players: Player[];
  private readonly rules: WinningStrategy;
  private readonly moveLog: Move[] = [];
  private turn = 0;
  private currentStatus: GameStatus = "IN_PROGRESS";
  private winnerPlayer: Player | undefined;

  constructor(n: number, players: Player[]) {
    if (players.length < 2) throw new Error("Need at least 2 players");
    const symbols = new Set<string>();
    for (const p of players) {
      if (symbols.has(p.symbol())) throw new Error(\`Duplicate symbol \${p.symbol()}\`);
      symbols.add(p.symbol());
    }
    this.board = new Board(n);
    this.players = [...players];
    this.rules = new CounterWinningStrategy(n, players.length);
  }

  /** Apply one move for the player whose turn it is. Returns the new status. */
  makeMove(r: number, c: number): GameStatus {
    if (this.currentStatus !== "IN_PROGRESS") throw new Error(\`Game is over: \${this.currentStatus}\`);
    const p = this.players[this.turn];
    this.board.place(r, c, p.symbol()); // throws on illegal move; turn does not advance
    const m: Move = { row: r, col: c, player: p };
    this.moveLog.push(m);
    if (this.rules.isWinningMove(this.board, m, this.turn)) {
      this.currentStatus = "WON";
      this.winnerPlayer = p;
    } else if (this.board.isFull()) {
      this.currentStatus = "DRAW";
    } else {
      this.turn = (this.turn + 1) % this.players.length;
    }
    return this.currentStatus;
  }

  /** Drive the game by asking each Player for a move until it ends. */
  play(): void {
    while (this.currentStatus === "IN_PROGRESS") {
      const [r, c] = this.players[this.turn].chooseMove(this.board);
      this.makeMove(r, c);
    }
  }

  status(): GameStatus { return this.currentStatus; }
  winner(): Player | undefined { return this.winnerPlayer; }
  history(): readonly Move[] { return this.moveLog; }
  getBoard(): Board { return this.board; }
}

// ===================== 6. Demo =====================

function message(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

const alice = new ScriptedPlayer("Alice", "X", [0, 0], [1, 1], [2, 2]);
const bob = new ScriptedPlayer("Bob", "O", [0, 1], [0, 2]);
const game = new Game(3, [alice, bob]);
game.play();
game.getBoard().print();
// XOO
// .X.
// ..X
console.log(\`\${game.status()} winner=\${game.winner()?.name() ?? "none"}\`);
console.log(\`Moves played: \${game.history().length}\`); // 5

// Failure paths: each one is refused by exactly one class, and the game state stays valid.
const g2 = new Game(3, [new ScriptedPlayer("A", "X"), new ScriptedPlayer("B", "O")]);
g2.makeMove(0, 0);
try { g2.makeMove(0, 0); } catch (e) { console.log(message(e)); } // occupied
g2.makeMove(1, 1); // still B's turn: the refused move did not advance it
g2.getBoard().print();
// board now: X.. / .O. / ...
try { game.makeMove(1, 0); } catch (e) { console.log(message(e)); } // game already won
try { new Game(3, [alice, new ScriptedPlayer("Cy", "X")]); } catch (e) { console.log(message(e)); } // same symbol twice
try { new Game(2, [alice, bob]); } catch (e) { console.log(message(e)); }
try { new Game(3, [new ScriptedPlayer("A", "X", [0, 0]), new ScriptedPlayer("B", "O")]).play(); } catch (e) { console.log(message(e)); } // B has no moves` },
      { lang: 'cpp', code: `// ===================== 1. Small value types =====================

enum class GameStatus { InProgress, Won, Draw };

const char* name(GameStatus s) {
    switch (s) {
        case GameStatus::InProgress: return "IN_PROGRESS";
        case GameStatus::Won: return "WON";
        case GameStatus::Draw: return "DRAW";
    }
    return "?";
}

class Board;

// ===================== 2. Players (Strategy: how a move is chosen) =====================

/** Anything that can pick a move: a human at a keyboard, a scripted test, a bot. */
class Player {
public:
    virtual ~Player() = default;
    virtual string name() const = 0;
    virtual char symbol() const = 0;
    virtual pair<int, int> chooseMove(const Board& board) = 0;  // returns {row, col}
};

/** A move is just data: who played where. */
struct Move {
    int row, col;
    shared_ptr<Player> player;
};

/** Plays a fixed list of moves. Perfect for demos and unit tests (no stdin needed). */
class ScriptedPlayer : public Player {
public:
    ScriptedPlayer(string name, char symbol, vector<pair<int, int>> script = {})
        : name_(move(name)), symbol_(symbol), moves_(script.begin(), script.end()) {}

    string name() const override { return name_; }
    char symbol() const override { return symbol_; }
    pair<int, int> chooseMove(const Board&) override {
        if (moves_.empty()) throw logic_error(name_ + " ran out of scripted moves");
        auto m = moves_.front();
        moves_.pop_front();
        return m;
    }

private:
    string name_;
    char symbol_;
    deque<pair<int, int>> moves_;
};

// ===================== 3. Board: owns cells and validation only =====================

class Board {
public:
    static constexpr char EMPTY = '.';

    explicit Board(int n) : n_(n) {
        if (n < 3) throw invalid_argument("Board must be at least 3x3");
        cells_.assign(n, string(n, EMPTY));
    }

    int size() const { return n_; }
    bool isFull() const { return filled_ == n_ * n_; }
    char at(int r, int c) const { return cells_[r][c]; }

    bool isValid(int r, int c) const { return r >= 0 && r < n_ && c >= 0 && c < n_ && cells_[r][c] == EMPTY; }

    void place(int r, int c, char symbol) {
        if (!isValid(r, c)) throw invalid_argument("Illegal move (" + to_string(r) + "," + to_string(c) + ")");
        cells_[r][c] = symbol;
        filled_++;
    }

    void print() const {
        for (const string& row : cells_) cout << row << "\\n";
    }

private:
    int n_;
    vector<string> cells_;
    int filled_ = 0;
};

// ===================== 4. Win detection: its own class, O(1) per move =====================

/** Rule for "who won?". Separate interface so "4 in a row" or "corners win" variants plug in. */
class WinningStrategy {
public:
    virtual ~WinningStrategy() = default;
    virtual bool isWinningMove(const Board& board, const Move& move, int playerIndex) = 0;
};

/**
 * Keeps a counter per (player, row), (player, col), and both diagonals.
 * A player wins when any counter reaches n. Each move costs O(1) instead of rescanning O(n^2).
 */
class CounterWinningStrategy : public WinningStrategy {
public:
    CounterWinningStrategy(int n, int players)
        : n_(n), rows_(players, vector<int>(n, 0)), cols_(players, vector<int>(n, 0)), diag_(players, 0), anti_(players, 0) {}

    bool isWinningMove(const Board&, const Move& m, int p) override {
        int r = m.row, c = m.col;
        if (++rows_[p][r] == n_) return true;
        if (++cols_[p][c] == n_) return true;
        if (r == c && ++diag_[p] == n_) return true;
        return r + c == n_ - 1 && ++anti_[p] == n_;
    }

private:
    int n_;
    vector<vector<int>> rows_, cols_;
    vector<int> diag_, anti_;
};

// ===================== 5. Game: turn order + status (the orchestrator) =====================

class Game {
public:
    Game(int n, vector<shared_ptr<Player>> players) : board_(validated(n, players)), players_(move(players)) {
        rules_ = make_unique<CounterWinningStrategy>(n, int(players_.size()));
    }

    /** Apply one move for the player whose turn it is. Returns the new status. */
    GameStatus makeMove(int r, int c) {
        if (status_ != GameStatus::InProgress) throw logic_error(string("Game is over: ") + name(status_));
        auto p = players_[turn_];
        board_.place(r, c, p->symbol());  // throws on illegal move; turn does not advance
        Move m{r, c, p};
        history_.push_back(m);
        if (rules_->isWinningMove(board_, m, turn_)) {
            status_ = GameStatus::Won;
            winner_ = p;
        } else if (board_.isFull()) {
            status_ = GameStatus::Draw;
        } else {
            turn_ = (turn_ + 1) % int(players_.size());
        }
        return status_;
    }

    /** Drive the game by asking each Player for a move until it ends. */
    void play() {
        while (status_ == GameStatus::InProgress) {
            auto [r, c] = players_[turn_]->chooseMove(board_);
            makeMove(r, c);
        }
    }

    GameStatus status() const { return status_; }
    shared_ptr<Player> winner() const { return winner_; }
    const vector<Move>& history() const { return history_; }
    const Board& board() const { return board_; }

private:
    /** Checks the players before the board is built; returns the board size. */
    static int validated(int n, const vector<shared_ptr<Player>>& players) {
        if (players.size() < 2) throw invalid_argument("Need at least 2 players");
        set<char> symbols;
        for (const auto& p : players)
            if (!symbols.insert(p->symbol()).second) throw invalid_argument(string("Duplicate symbol ") + p->symbol());
        return n;
    }

    Board board_;
    vector<shared_ptr<Player>> players_;
    unique_ptr<WinningStrategy> rules_;
    vector<Move> history_;
    int turn_ = 0;
    GameStatus status_ = GameStatus::InProgress;
    shared_ptr<Player> winner_;
};

// ===================== 6. Demo =====================

int main() {
    auto alice = make_shared<ScriptedPlayer>("Alice", 'X', vector<pair<int, int>>{{0, 0}, {1, 1}, {2, 2}});
    auto bob = make_shared<ScriptedPlayer>("Bob", 'O', vector<pair<int, int>>{{0, 1}, {0, 2}});
    Game game(3, {alice, bob});
    game.play();
    game.board().print();
    // XOO
    // .X.
    // ..X
    cout << name(game.status()) << " winner=" << (game.winner() ? game.winner()->name() : "none") << "\\n";
    cout << "Moves played: " << game.history().size() << "\\n";  // 5

    // Failure paths: each one is refused by exactly one class, and the game state stays valid.
    Game g2(3, {make_shared<ScriptedPlayer>("A", 'X'), make_shared<ScriptedPlayer>("B", 'O')});
    g2.makeMove(0, 0);
    try { g2.makeMove(0, 0); } catch (const invalid_argument& e) { cout << e.what() << "\\n"; }  // occupied
    g2.makeMove(1, 1);  // still B's turn: the refused move did not advance it
    g2.board().print();
    // board now: X.. / .O. / ...
    try { game.makeMove(1, 0); } catch (const logic_error& e) { cout << e.what() << "\\n"; }  // game already won
    try { Game(3, {alice, make_shared<ScriptedPlayer>("Cy", 'X')}); } catch (const invalid_argument& e) { cout << e.what() << "\\n"; }  // same symbol twice
    try { Game(2, {alice, bob}); } catch (const invalid_argument& e) { cout << e.what() << "\\n"; }
    try {
        Game(3, {make_shared<ScriptedPlayer>("A", 'X', vector<pair<int, int>>{{0, 0}}), make_shared<ScriptedPlayer>("B", 'O')}).play();
    } catch (const logic_error& e) { cout << e.what() << "\\n"; }  // B has no moves
}` }
    ],
    t6_extend: [
      { lang: 'python', code: `import random
from abc import ABC, abstractmethod
from collections import Counter, deque

# Extension points in one place. Each follow-up question from the interviewer maps to
# ONE new class plugged into an existing interface; the Game class itself never changes.

Board = list[list[str]]


class Player(ABC):  # follow-up: "add a bot"
    @abstractmethod
    def symbol(self) -> str: ...

    @abstractmethod
    def next(self, board: Board) -> tuple[int, int] | None: ...


class WinRule(ABC):  # follow-up: "K in a row"
    @abstractmethod
    def wins(self, b: Board, r: int, c: int) -> bool: ...


class GameListener(ABC):  # follow-up: "add a scoreboard"
    @abstractmethod
    def moved(self, who: str, r: int, c: int) -> None: ...

    @abstractmethod
    def ended(self, result: str) -> None: ...


class ScriptedPlayer(Player):
    def __init__(self, sym: str, *moves: tuple[int, int]) -> None:
        self._sym = sym
        self._script = deque(moves)

    def symbol(self) -> str:
        return self._sym

    def next(self, board: Board) -> tuple[int, int] | None:
        return self._script.popleft() if self._script else None


class RandomBot(Player):
    """Follow-up answer #1: a bot is just another Player. Seeded Random => reproducible tests."""

    def __init__(self, sym: str, seed: int) -> None:
        self._sym = sym
        self._rnd = random.Random(seed)

    def symbol(self) -> str:
        return self._sym

    def next(self, board: Board) -> tuple[int, int] | None:
        free = [(r, c) for r, row in enumerate(board) for c, cell in enumerate(row) if cell == "."]
        return self._rnd.choice(free)


class KInARow(WinRule):
    """Follow-up answer #2: "K in a row" on a bigger board. Checks only lines through the last move."""

    DIRECTIONS = ((0, 1), (1, 0), (1, 1), (1, -1))

    def __init__(self, k: int) -> None:
        self._k = k

    def wins(self, b: Board, r: int, c: int) -> bool:
        n = len(b)
        for dr, dc in self.DIRECTIONS:
            count = 1
            for s in (-1, 1):
                rr, cc = r + s * dr, c + s * dc
                while 0 <= rr < n and 0 <= cc < n and b[rr][cc] == b[r][c]:
                    count += 1
                    rr, cc = rr + s * dr, cc + s * dc
            if count >= self._k:
                return True
        return False


class Game:
    """Built with a Builder: many optional knobs without a 7-argument constructor."""

    def __init__(self, builder: "Game.Builder") -> None:
        self._board = [["."] * builder.size_ for _ in range(builder.size_)]
        self._players = list(builder.players_)
        self._rule = builder.rule_ or KInARow(builder.size_)
        self._listeners = list(builder.listeners_)

    @staticmethod
    def builder() -> "Game.Builder":
        return Game.Builder()

    class Builder:
        def __init__(self) -> None:
            self.size_ = 3
            self.players_: list[Player] = []
            self.rule_: WinRule | None = None
            self.listeners_: list[GameListener] = []

        def size(self, n: int) -> "Game.Builder":
            self.size_ = n
            return self

        def player(self, p: Player) -> "Game.Builder":
            self.players_.append(p)
            return self

        def rule(self, r: WinRule) -> "Game.Builder":
            self.rule_ = r
            return self

        def listener(self, l: GameListener) -> "Game.Builder":
            self.listeners_.append(l)
            return self

        def build(self) -> "Game":
            if len(self.players_) < 2:
                raise RuntimeError("need 2+ players")
            return Game(self)

    def play(self) -> str:
        cells = len(self._board) ** 2
        for moves in range(cells):
            p = self._players[moves % len(self._players)]
            m = p.next(self._board)
            if m is None or self._board[m[0]][m[1]] != ".":
                raise RuntimeError(f"{p.symbol()} made an illegal move")
            self._board[m[0]][m[1]] = p.symbol()
            for l in self._listeners:
                l.moved(p.symbol(), m[0], m[1])
            if self._rule.wins(self._board, m[0], m[1]):
                result = f"{p.symbol()} wins"
                for l in self._listeners:
                    l.ended(result)
                return result
        for l in self._listeners:
            l.ended("draw")
        return "draw"


class Scoreboard(GameListener):
    """Follow-up answer #3: a scoreboard that just listens."""

    def __init__(self) -> None:
        self.results: Counter[str] = Counter()

    def moved(self, who: str, r: int, c: int) -> None:
        pass

    def ended(self, result: str) -> None:
        self.results[result] += 1


def main() -> None:
    score = Scoreboard()
    r1 = (Game.builder().size(4).rule(KInARow(3))
          .player(ScriptedPlayer("X", (0, 0), (1, 1), (2, 2)))
          .player(ScriptedPlayer("O", (0, 3), (1, 3)))
          .listener(score).build().play())
    print(r1)  # X wins (3 in a row on 4x4)
    for i in range(20):
        Game.builder().player(RandomBot("X", i)).player(RandomBot("O", 100 + i)).listener(score).build().play()
    print("games recorded:", sum(score.results.values()))  # 21
    try:
        Game.builder().player(ScriptedPlayer("X")).build()
    except RuntimeError as e:
        print(e)  # need 2+ players
    try:
        Game.builder().player(ScriptedPlayer("X", (0, 0))).player(ScriptedPlayer("O")).build().play()
    except RuntimeError as e:
        print(e)  # O has no move to make


if __name__ == "__main__":
    main()` },
      { lang: 'ts', code: `// Extension points in one place. Each follow-up question from the interviewer maps to
// ONE new class plugged into an existing interface; the Game class itself never changes.

type Board = string[][];
type Cell = readonly [row: number, col: number];

interface Player { // follow-up: "add a bot"
  symbol(): string;
  next(board: Board): Cell | undefined;
}

interface WinRule { // follow-up: "K in a row"
  wins(b: Board, r: number, c: number): boolean;
}

interface GameListener { // follow-up: "add a scoreboard"
  moved(who: string, r: number, c: number): void;
  ended(result: string): void;
}

class ScriptedPlayer implements Player {
  private readonly script: Cell[];
  constructor(private readonly sym: string, ...moves: Cell[]) {
    this.script = [...moves];
  }
  symbol(): string { return this.sym; }
  next(_b: Board): Cell | undefined { return this.script.shift(); }
}

/** Follow-up answer #1: a bot is just another Player. Seeded generator => reproducible tests. */
class RandomBot implements Player {
  private state: number;
  constructor(private readonly sym: string, seed: number) {
    this.state = (seed * 2654435761 + 12345) >>> 0;
  }
  symbol(): string { return this.sym; }

  private nextInt(bound: number): number { // small linear congruential generator
    this.state = (Math.imul(this.state, 1664525) + 1013904223) >>> 0;
    return Math.floor((this.state / 4294967296) * bound);
  }

  next(b: Board): Cell | undefined {
    const free: Cell[] = [];
    b.forEach((row, r) => row.forEach((cell, c) => { if (cell === ".") free.push([r, c]); }));
    return free[this.nextInt(free.length)];
  }
}

/** Follow-up answer #2: "K in a row" on a bigger board. Checks only lines through the last move. */
class KInARow implements WinRule {
  private static readonly DIRECTIONS: ReadonlyArray<Cell> = [[0, 1], [1, 0], [1, 1], [1, -1]];
  constructor(private readonly k: number) {}

  wins(b: Board, r: number, c: number): boolean {
    for (const [dr, dc] of KInARow.DIRECTIONS) {
      let count = 1;
      for (const s of [-1, 1]) {
        for (let rr = r + s * dr, cc = c + s * dc;
             rr >= 0 && rr < b.length && cc >= 0 && cc < b.length && b[rr][cc] === b[r][c];
             rr += s * dr, cc += s * dc) count++;
      }
      if (count >= this.k) return true;
    }
    return false;
  }
}

/** Builder: many optional knobs without a 7-argument constructor. */
class Game {
  private readonly board: Board;
  private readonly players: Player[];
  private readonly rule: WinRule;
  private readonly listeners: GameListener[];

  private constructor(b: GameBuilder) {
    this.board = Array.from({ length: b.sizeOf }, () => new Array<string>(b.sizeOf).fill("."));
    this.players = [...b.playerList];
    this.rule = b.winRule ?? new KInARow(b.sizeOf);
    this.listeners = [...b.listenerList];
  }

  static builder(): GameBuilder { return new GameBuilder(); }

  /** Only the builder may call this (TypeScript has no friend classes). */
  static create(b: GameBuilder): Game { return new Game(b); }

  play(): string {
    const cells = this.board.length * this.board.length;
    for (let moves = 0; moves < cells; moves++) {
      const p = this.players[moves % this.players.length];
      const m = p.next(this.board);
      if (m === undefined || this.board[m[0]][m[1]] !== ".") throw new Error(\`\${p.symbol()} made an illegal move\`);
      this.board[m[0]][m[1]] = p.symbol();
      for (const l of this.listeners) l.moved(p.symbol(), m[0], m[1]);
      if (this.rule.wins(this.board, m[0], m[1])) {
        const res = \`\${p.symbol()} wins\`;
        this.listeners.forEach((l) => l.ended(res));
        return res;
      }
    }
    this.listeners.forEach((l) => l.ended("draw"));
    return "draw";
  }
}

class GameBuilder {
  sizeOf = 3;
  readonly playerList: Player[] = [];
  winRule: WinRule | undefined;
  readonly listenerList: GameListener[] = [];

  size(n: number): this { this.sizeOf = n; return this; }
  player(p: Player): this { this.playerList.push(p); return this; }
  rule(r: WinRule): this { this.winRule = r; return this; }
  listener(l: GameListener): this { this.listenerList.push(l); return this; }
  build(): Game {
    if (this.playerList.length < 2) throw new Error("need 2+ players");
    return Game.create(this);
  }
}

/** Follow-up answer #3: a scoreboard that just listens. */
class Scoreboard implements GameListener {
  readonly results = new Map<string, number>();
  moved(_who: string, _r: number, _c: number): void {}
  ended(result: string): void { this.results.set(result, (this.results.get(result) ?? 0) + 1); }
}

const score = new Scoreboard();
const r1 = Game.builder().size(4).rule(new KInARow(3))
  .player(new ScriptedPlayer("X", [0, 0], [1, 1], [2, 2]))
  .player(new ScriptedPlayer("O", [0, 3], [1, 3]))
  .listener(score).build().play();
console.log(r1); // X wins (3 in a row on 4x4)
for (let i = 0; i < 20; i++) {
  Game.builder().player(new RandomBot("X", i)).player(new RandomBot("O", 100 + i)).listener(score).build().play();
}
let total = 0;
for (const n of score.results.values()) total += n;
console.log("games recorded: " + total); // 21
try {
  Game.builder().player(new ScriptedPlayer("X")).build();
} catch (e) {
  console.log((e as Error).message); // need 2+ players
}
try {
  Game.builder().player(new ScriptedPlayer("X", [0, 0])).player(new ScriptedPlayer("O")).build().play();
} catch (e) {
  console.log((e as Error).message); // O has no move to make
}` },
      { lang: 'cpp', code: `// Extension points in one place. Each follow-up question from the interviewer maps to
// ONE new class plugged into an existing interface; the Game class itself never changes.

using Board = vector<string>;
using Cell = pair<int, int>;

class Player {  // follow-up: "add a bot"
public:
    virtual ~Player() = default;
    virtual char symbol() const = 0;
    virtual optional<Cell> next(const Board& board) = 0;
};

class WinRule {  // follow-up: "K in a row"
public:
    virtual ~WinRule() = default;
    virtual bool wins(const Board& b, int r, int c) const = 0;
};

class GameListener {  // follow-up: "add a scoreboard"
public:
    virtual ~GameListener() = default;
    virtual void moved(char who, int r, int c) = 0;
    virtual void ended(const string& result) = 0;
};

class ScriptedPlayer : public Player {
public:
    ScriptedPlayer(char sym, vector<Cell> moves = {}) : sym_(sym), script_(moves.begin(), moves.end()) {}
    char symbol() const override { return sym_; }
    optional<Cell> next(const Board&) override {
        if (script_.empty()) return nullopt;
        Cell m = script_.front();
        script_.pop_front();
        return m;
    }

private:
    char sym_;
    deque<Cell> script_;
};

/** Follow-up answer #1: a bot is just another Player. Seeded engine => reproducible tests. */
class RandomBot : public Player {
public:
    RandomBot(char sym, unsigned seed) : sym_(sym), rnd_(seed) {}
    char symbol() const override { return sym_; }
    optional<Cell> next(const Board& b) override {
        vector<Cell> free;
        for (int r = 0; r < int(b.size()); r++)
            for (int c = 0; c < int(b.size()); c++)
                if (b[r][c] == '.') free.push_back({r, c});
        return free[uniform_int_distribution<size_t>(0, free.size() - 1)(rnd_)];
    }

private:
    char sym_;
    mt19937 rnd_;
};

/** Follow-up answer #2: "K in a row" on a bigger board. Checks only lines through the last move. */
class KInARow : public WinRule {
public:
    explicit KInARow(int k) : k_(k) {}
    bool wins(const Board& b, int r, int c) const override {
        int n = b.size();
        for (auto [dr, dc] : {Cell{0, 1}, Cell{1, 0}, Cell{1, 1}, Cell{1, -1}}) {
            int count = 1;
            for (int s = -1; s <= 1; s += 2)
                for (int rr = r + s * dr, cc = c + s * dc; rr >= 0 && rr < n && cc >= 0 && cc < n && b[rr][cc] == b[r][c];
                     rr += s * dr, cc += s * dc)
                    count++;
            if (count >= k_) return true;
        }
        return false;
    }

private:
    int k_;
};

/** Builder: many optional knobs without a 7-argument constructor. */
class Game {
public:
    class Builder {
    public:
        Builder& size(int n) { size_ = n; return *this; }
        Builder& player(unique_ptr<Player> p) { players_.push_back(move(p)); return *this; }
        Builder& rule(unique_ptr<WinRule> r) { rule_ = move(r); return *this; }
        Builder& listener(GameListener& l) { listeners_.push_back(&l); return *this; }  // non-owning
        Game build() {
            if (players_.size() < 2) throw logic_error("need 2+ players");
            return Game(*this);
        }

    private:
        friend class Game;
        int size_ = 3;
        vector<unique_ptr<Player>> players_;
        unique_ptr<WinRule> rule_;
        vector<GameListener*> listeners_;
    };

    static Builder builder() { return Builder(); }

    string play() {
        int cells = board_.size() * board_.size();
        for (int moves = 0; moves < cells; moves++) {
            Player& p = *players_[moves % players_.size()];
            optional<Cell> m = p.next(board_);
            if (!m || board_[m->first][m->second] != '.') throw logic_error(string(1, p.symbol()) + " made an illegal move");
            board_[m->first][m->second] = p.symbol();
            for (auto* l : listeners_) l->moved(p.symbol(), m->first, m->second);
            if (rule_->wins(board_, m->first, m->second)) {
                string res = string(1, p.symbol()) + " wins";
                for (auto* l : listeners_) l->ended(res);
                return res;
            }
        }
        for (auto* l : listeners_) l->ended("draw");
        return "draw";
    }

private:
    explicit Game(Builder& b)
        : board_(b.size_, string(b.size_, '.')), players_(move(b.players_)),
          rule_(b.rule_ ? move(b.rule_) : make_unique<KInARow>(b.size_)), listeners_(b.listeners_) {}

    Board board_;
    vector<unique_ptr<Player>> players_;
    unique_ptr<WinRule> rule_;
    vector<GameListener*> listeners_;
};

/** Follow-up answer #3: a scoreboard that just listens. */
class Scoreboard : public GameListener {
public:
    map<string, int> results;
    void moved(char, int, int) override {}
    void ended(const string& result) override { results[result]++; }
};

int main() {
    Scoreboard score;
    string r1 = Game::builder().size(4).rule(make_unique<KInARow>(3))
                    .player(make_unique<ScriptedPlayer>('X', vector<Cell>{{0, 0}, {1, 1}, {2, 2}}))
                    .player(make_unique<ScriptedPlayer>('O', vector<Cell>{{0, 3}, {1, 3}}))
                    .listener(score).build().play();
    cout << r1 << "\\n";  // X wins (3 in a row on 4x4)
    for (int i = 0; i < 20; i++)
        Game::builder().player(make_unique<RandomBot>('X', i)).player(make_unique<RandomBot>('O', 100 + i)).listener(score).build().play();
    int total = 0;
    for (const auto& [result, n] : score.results) total += n;
    cout << "games recorded: " << total << "\\n";  // 21
    try { Game::builder().player(make_unique<ScriptedPlayer>('X')).build(); } catch (const logic_error& e) { cout << e.what() << "\\n"; }  // need 2+ players
    try {
        Game::builder().player(make_unique<ScriptedPlayer>('X', vector<Cell>{{0, 0}})).player(make_unique<ScriptedPlayer>('O')).build().play();
    } catch (const logic_error& e) { cout << e.what() << "\\n"; }  // O has no move to make
}` }
    ]
  };

  /* =====================================================================
     TOPIC 1 — THE LLD INTERVIEW FRAMEWORK
     ===================================================================== */
  var FW_STEPS = [
    { id: 'C', label: '1 Clarify', pct: 10, x: 10, y: 14, what: 'Ask questions, write down functional + non-functional requirements and what is OUT of scope.' },
    { id: 'E', label: '2 Entities', pct: 8, x: 36, y: 14, what: 'Underline the nouns: they become classes, enums or records. Verbs become methods.' },
    { id: 'A', label: '3 APIs', pct: 8, x: 62, y: 14, what: 'Write the public method signatures the outside world calls. Inputs, outputs, errors.' },
    { id: 'D', label: '4 Class diagram', pct: 12, x: 88, y: 14, what: 'Boxes for classes, arrows for has-a / is-a / uses, multiplicities like 1..*.' },
    { id: 'P', label: '5 Patterns', pct: 7, x: 88, y: 46, what: 'Find the parts most likely to change and put each one behind an interface (Strategy, Observer, Factory...).' },
    { id: 'K', label: '6 Code', pct: 45, x: 56, y: 46, what: 'Write the core classes first, then the main flows, then a small demo driver that proves it works.' },
    { id: 'X', label: '7 Extend + test', pct: 10, x: 22, y: 46, what: 'Walk through one follow-up ("add EV spots") and show it is ONE new class, not edits everywhere.' }
  ];
  var FW_EDGES = [['C', 'E'], ['E', 'A'], ['A', 'D'], ['D', 'P'], ['P', 'K'], ['K', 'X'], ['X', 'C', 'new requirement']];
  var FW_OUT = {
    parking: {
      name: 'Parking Lot',
      C: [['Functional', 'park, unpark, pay, show free spots per type'], ['Scope', 'multi-floor; bike / car / truck; hourly pricing'], ['Non-functional', 'many gates at once: no double allocation'], ['Out of scope', 'online booking, number-plate cameras']],
      E: [['Classes', 'ParkingLot, ParkingFloor, ParkingSpot, Ticket, Vehicle, EntryGate, ExitGate'], ['Enums', 'SpotType, VehicleType'], ['Value objects', 'Receipt (record)']],
      A: [['park', 'Ticket park(Vehicle v) throws ParkingLotFullException'], ['unpark', 'Receipt unpark(String ticketId)'], ['board', 'Map<SpotType,Integer> freeSpots()']],
      D: [['Composition', 'Lot ◆— Floor ◆— Spot (spots die with the floor)'], ['Association', 'Ticket → Vehicle, Ticket → Spot'], ['Dependency', 'Lot uses AllocationStrategy, PricingStrategy']],
      P: [['Strategy', 'how to pick a spot; how to price'], ['Observer', 'display boards listen for spot changes'], ['Factory', 'build floors from a layout config']],
      K: [['Order', 'enums → Spot → Floor → Ticket → strategies → ParkingLot → main()'], ['Concurrency', 'synchronized park/unpark (or per-type queues)'], ['Demo', 'park 3 vehicles, advance clock, unpark, print receipt']],
      X: [['Follow-up', 'EV spots with charging fee'], ['Answer', 'new SpotType + ChargingAddOn decorator'], ['Edited classes', '0 core classes changed']]
    },
    tictactoe: {
      name: 'Tic-Tac-Toe',
      C: [['Functional', 'two players alternate, detect win / draw, reject illegal moves'], ['Scope', 'N×N board, 2+ players, human or bot'], ['Non-functional', 'win check fast even for large N'], ['Out of scope', 'networking, UI graphics']],
      E: [['Classes', 'Game, Board, Player, Move'], ['Enums', 'GameStatus (IN_PROGRESS, WON, DRAW)'], ['Rules', 'WinningStrategy']],
      A: [['move', 'GameStatus makeMove(int r, int c)'], ['play', 'void play() — asks each Player for moves'], ['query', 'Optional<Player> winner(), List<Move> history()']],
      D: [['Composition', 'Game ◆— Board'], ['Aggregation', 'Game ◇— Player (players exist outside a game)'], ['Dependency', 'Game uses WinningStrategy']],
      P: [['Strategy', 'Player (human / bot), WinningStrategy (N in a row / K in a row)'], ['Command', 'Move objects enable undo / replay'], ['Builder', 'configure size, players, rules']],
      K: [['Order', 'Board → WinningStrategy (O(1) counters) → Player → Game → main()'], ['Validation', 'out of range, occupied cell, game already over'], ['Demo', 'scripted players; print board and winner']],
      X: [['Follow-up', 'undo the last move'], ['Answer', 'MoveCommand with execute()/undo() + undo stack'], ['Edited classes', 'Game gains undo(); rules reverse counters']]
    },
    library: {
      name: 'Library',
      C: [['Functional', 'borrow, return, list overdue loans'], ['Scope', 'max 3 books per member, 14-day loans'], ['Non-functional', 'correct counts if two desks lend at once'], ['Out of scope', 'fines payment, e-books']],
      E: [['Classes', 'Library, Book, Member, Loan'], ['Rules', 'LendingPolicy'], ['Value objects', 'Book (record)']],
      A: [['borrow', 'Loan borrow(Member m, String isbn, LocalDate today)'], ['return', 'void giveBack(Member m, String isbn)'], ['report', 'List<Loan> overdue(LocalDate today)']],
      D: [['Association', 'Loan → Member, Loan → Book'], ['Aggregation', 'Library ◇— Book'], ['Dependency', 'Library uses LendingPolicy']],
      P: [['Strategy', 'LendingPolicy (standard / premium / student)'], ['Observer', 'notify member when a reserved book returns'], ['Repository', 'swap in-memory maps for a DB later']],
      K: [['Order', 'Book → Member → Loan → LendingPolicy → Library → main()'], ['Validation', 'unknown ISBN, already lent, limit reached'], ['Demo', 'borrow, jump 19 days, list overdue']],
      X: [['Follow-up', 'premium members borrow 10 books'], ['Answer', 'PremiumPolicy implements LendingPolicy'], ['Edited classes', '0 — inject a different policy']]
    }
  };

  topics.push({
    title: 'The LLD Interview Framework: From Vague Prompt to Extensible Code',
    analogy: `<p>Think of an architect asked to "design a house". A good architect does not start laying bricks. First they ask: <i>how many people live here, any elderly parents, budget, one floor or two?</i> Then they list the rooms, decide which doors connect which rooms, draw the floor plan, choose standard fittings (a socket is a socket everywhere), and only then call the builders. They also leave space for a future extra bedroom.</p>
      <p>An LLD (Low-Level Design) interview is exactly that, but the "house" is a set of classes. The steps are always the same: <b>clarify → entities → APIs → class diagram → patterns → code → extend</b>.</p>`,
    explain: `<p><b>What the interviewer is really testing.</b> In an LLD or "machine coding" round you get a short, vague prompt: <i>"Design a parking lot"</i>. Nobody expects a perfect product in 45–90 minutes. They want to see <b>how you think</b>: do you ask the right questions, turn requirements into clean classes, give each class one job, and write code that survives the next requirement without a rewrite?</p>
      <p><b>The 7-step framework</b> (memorise it like a checklist; the visualizer below shows it as a loop):</p>
      ${H.table(['#', 'Step', 'What you produce', 'Rough time (45 min round)'], [
        ['1', '<b>Clarify requirements</b>', 'A short written list: must-have features, scale/concurrency needs, and what is out of scope', '4–5 min'],
        ['2', '<b>Identify entities</b>', 'Nouns → classes / enums / records. Verbs → methods', '3–4 min'],
        ['3', '<b>Define APIs</b>', 'Public method signatures: <code>Ticket park(Vehicle v)</code>', '3–4 min'],
        ['4', '<b>Class diagram</b>', 'Boxes + arrows: has-a, is-a, uses; multiplicity 1, 0..1, 1..*', '5–6 min'],
        ['5', '<b>Choose patterns</b>', 'Interfaces around the parts most likely to change', '3 min'],
        ['6', '<b>Write the code</b>', 'Core classes, main flows, a <code>main()</code> demo', '20 min'],
        ['7', '<b>Extend + test</b>', 'One follow-up handled by adding a class; edge cases checked', '4–5 min']
      ])}
      <p><b>Step 1 in detail — the questions to ask.</b> ${H.chips(['Who are the actors?', 'What are the core use cases?', 'What types/variants exist?', 'How is money/time/score computed?', 'Concurrency: many users at once?', 'Persistence needed or in-memory?', 'What is out of scope?'], { label: 'Clarifying checklist' })} Write the answers down where the interviewer can see them. This list becomes your contract and saves you from building features nobody asked for.</p>
      <p><b>Step 2 — nouns and verbs.</b> Read the requirements aloud and underline nouns: <i>lot, floor, spot, vehicle, ticket, gate, payment</i>. Each noun that has <b>its own data or behaviour</b> becomes a class; a noun with a fixed set of values (bike/car/truck) becomes an <code>enum</code>; a noun that is pure, unchanging data becomes an immutable value type (<code>record</code> in Java, a frozen <code>@dataclass</code> in Python, a <code>readonly</code> interface in TypeScript, a <code>struct</code> in C++). Verbs (<i>park, pay, exit</i>) become methods on the class that owns the data they touch.</p>
      <p><b>Step 3 — APIs before internals.</b> Decide what callers see: method names, parameters, return types and failure cases (exceptions or an optional result: <code>Optional</code> / <code>None</code> / <code>undefined</code> / <code>std::optional</code>). This forces clarity and lets you discuss behaviour before writing 200 lines.</p>
      <p><b>Steps 4–5 — diagram, then patterns.</b> Draw the boxes. Then ask "what will change most?" — pricing rules, spot choice, win rules, player types. Each answer gets an interface (usually <b>Strategy</b>). Do not force patterns for show; one well-placed interface beats five pointless ones.</p>
      <p><b>Steps 6–7 — code and prove extensibility.</b> Write compilable code in dependency order (enums → small classes → service), finish with a <code>main()</code> that exercises the happy path and one failure. Then take a follow-up and show the change is a new class plugged into an existing interface (the Open/Closed principle in action).</p>`,
    clues: [
      '"Design a ___" with no numbers or scale given → an LLD / OOD round: start with clarifying questions, not code',
      '"Machine coding round", "90 minutes", "runnable code" (Flipkart, Swiggy, Uber, PhonePe style) → working <code>main()</code> + clean classes + extensibility matter more than UI',
      '"How would you add ___ later?" → they are checking Open/Closed: answer with "a new class implementing an existing interface"',
      '"Multiple entry gates", "many users at the same time" → a concurrency requirement hidden in the prompt; mention locking in step 1',
      '"Keep it simple, in-memory is fine" → no database classes; use maps and lists behind a repository-like class',
      '"Walk me through your classes" → they want the diagram (step 4) before code: entities, relationships, multiplicities'
    ],
    code: J.t1_skeleton,
    alt: ALT.t1_skeleton,
    codeTitle: 'The framework applied to a brand-new prompt (meeting-room booker), fully compilable',
    viz: {
      title: 'The 7-step framework as a loop (with time budget)',
      input: 'parking 45',
      inputLabel: 'Problem (parking | tictactoe | library) and interview minutes (30–120)',
      gen: function (input) {
        var w = words(input, 'Format: parking 45   (problem then minutes)', 2);
        var key = w[0].replace(/[^a-z]/g, '');
        if (key === 'tic' || key === 'ttt') key = 'tictactoe';
        if (key === 'parkinglot') key = 'parking';
        var data = FW_OUT[key];
        if (!data) throw new Error('Problem must be parking, tictactoe or library');
        var mins = w.length > 1 ? parseInt(w[1], 10) : 45;
        if (isNaN(mins) || mins < 30 || mins > 120) throw new Error('Minutes must be a number between 30 and 120');
        var nodes = FW_STEPS.map(function (s) { return B(s.id, s.label, s.x, s.y); });
        var budget = [], used = 0;
        FW_STEPS.forEach(function (s, i) {
          var m = i === FW_STEPS.length - 1 ? mins - used : Math.max(1, Math.round(mins * s.pct / 100));
          budget.push(m); used += m;
        });
        var frames = [];
        frames.push(F('Prompt: <b>"Design a ' + data.name + '"</b> in a ' + mins + '-minute round. Resist the urge to type code. Seven steps, in order, each producing something the interviewer can see.', [
          G('LLD interview loop', nodes, FW_EDGES, { h: 60 }),
          VARS('Clock', { minutesTotal: mins, minutesUsed: 0, stepsDone: 0 })
        ]));
        var start = 0;
        FW_STEPS.forEach(function (s, i) {
          var hl = {}, ehl = {}, tags = {};
          for (var j = 0; j < i; j++) { hl[FW_STEPS[j].id] = 'done'; tags[FW_STEPS[j].id] = budget[j] + 'm ✓'; }
          hl[s.id] = 'cur'; tags[s.id] = budget[i] + ' min';
          if (i > 0) ehl[FW_STEPS[i - 1].id + '-' + s.id] = 'ok';
          var end = start + budget[i];
          frames.push(F('<b>Step ' + (i + 1) + ' — ' + s.label.replace(/^\d+ /, '') + '</b> (minute ' + start + '–' + end + '). ' + s.what, [
            G('LLD interview loop', nodes, FW_EDGES, { h: 60, hl: hl, ehl: ehl, tags: tags }),
            TABLE('What you write on the board for ' + data.name, ['Item', 'Content'], data[s.id], one(0, 'ok')),
            VARS('Clock', { minutesTotal: mins, minutesUsed: end, stepsDone: i + 1 }, { minutesUsed: 'cur' })
          ]));
          start = end;
        });
        var allHl = many(FW_STEPS.map(function (s) { return s.id; }), 'ok');
        frames.push(F('Done — and notice the <b>loop-back arrow</b>. Every follow-up ("add EV spots", "add undo") restarts at step 1 in miniature: clarify it, find the entity it touches, and plug in a class. A design that absorbs the follow-up with a <span class="c-g">new class</span> instead of <span class="c-r">edits everywhere</span> is what earns "strong hire".', [
          G('LLD interview loop', nodes, FW_EDGES, { h: 60, hl: allHl, ehl: { 'X-C': 'cur' }, tags: { X: 'repeat' } }),
          TABLE('Time budget used', ['Step', 'Minutes'], FW_STEPS.map(function (s, i) { return [s.label, budget[i]]; }), one(5, 'sel'))
        ]));
        return frames;
      }
    },
    examples: [
      {
        title: 'Weak start vs strong start (first 2 minutes of "Design a Parking Lot")',
        html: `${H.table(['Candidate', 'First words', 'Interviewer\'s note'], [
          [H.c('r', 'Weak'), '"OK so I will make a class ParkingLot with a main method and an array..."', 'Jumped to code; no idea of vehicle types, pricing or gates. Will rewrite later.'],
          [H.c('g', 'Strong'), '"Before I design, a few questions: how many floors? which vehicle types? is pricing hourly? can several gates issue tickets at once? is online booking in scope?"', 'Drove the requirements; already spotted the concurrency trap.']
        ])}<p>The strong candidate spent 90 seconds and now has a written scope. Everything after this is easier.</p>`
      },
      {
        title: 'Nouns → classes, verbs → methods (worked on one sentence)',
        html: `<p>Requirement: <i>"A <u>driver</u> takes a <u>ticket</u> at the <u>entry gate</u>; the <u>system</u> assigns the nearest free <u>spot</u> that fits the <u>vehicle</u>; at the <u>exit gate</u> the driver <b>pays</b> by the <u>hour</u>."</i></p>
          ${H.table(['Word', 'Decision', 'Why'], [
            ['driver', H.c('m', 'not a class'), 'no data or behaviour we need; the Vehicle stands in for them'],
            ['ticket', H.c('g', 'class Ticket'), 'has id, entry time, spot, vehicle'],
            ['entry gate / exit gate', H.c('g', 'class EntryGate, ExitGate'), 'thin classes that call the lot'],
            ['spot', H.c('g', 'class ParkingSpot'), 'has state (free / taken) and rules'],
            ['vehicle', H.c('g', 'record Vehicle + enum VehicleType'), 'plain data, fixed set of kinds'],
            ['nearest free … that fits', H.c('b', 'interface SpotAllocationStrategy'), 'a rule that will change'],
            ['pays by the hour', H.c('b', 'interface PricingStrategy'), 'pricing changes every season'],
            ['assigns / pays', H.c('y', 'methods park(), unpark()'), 'verbs live on the class that owns the data']
          ])}`
      },
      {
        title: 'APIs first: the contract written before any internals',
        html: `<p>For Tic-Tac-Toe, write the public surface on the board before anything else:</p>
          ${H.table(['Method', 'Returns', 'Fails when'], [
            ['<code>Game(int n, List&lt;Player&gt; players)</code>', 'new game', 'n &lt; 3, fewer than 2 players, duplicate symbols'],
            ['<code>GameStatus makeMove(int r, int c)</code>', 'IN_PROGRESS / WON / DRAW', 'cell out of range or occupied; game already over'],
            ['<code>Optional&lt;Player&gt; winner()</code>', 'winner if any', 'never (empty while playing)'],
            ['<code>List&lt;Move&gt; history()</code>', 'read-only list', 'never']
          ])}<p>The interviewer can now challenge behaviour ("what if someone plays after the game ends?") before you have written a single loop.</p>`
      },
      {
        title: 'Same framework, brand-new problem: meeting rooms (see the code above)',
        html: `<p>The reference code applies all seven steps to a problem you have never practised. Steps 1–5 are the comments at the top; the <code>RoomSelectionStrategy</code> is the step-5 interface; the step-7 follow-up "pick the room nearest my desk" is just a new strategy class.</p>
          ${H.kv([['Entities', 'Room, Booking'], ['API', 'book / cancel / bookingsFor'], ['Pattern', 'Strategy'], ['Follow-up cost', '1 new class']], { label: 'Framework output' })}`
      }
    ],
    deepDive: `<p><b>How rounds are actually scored.</b> Most companies use a rubric with four or five columns: <i>requirements gathering</i>, <i>object modelling</i> (right entities, right responsibilities), <i>code quality</i> (naming, small methods, no duplication, compiles), <i>extensibility</i> (can a follow-up be added cheaply) and <i>communication</i>. A working but monolithic solution often scores lower than a slightly incomplete but well-modelled one, because the second one shows the skill the job needs.</p>
      <p><b>Machine coding vs whiteboard LLD.</b> In a 90–120 minute machine-coding round (common at Indian product companies) you must produce <b>runnable</b> code, usually with a command-line or a <code>main()</code> driver; the evaluator will run edge cases. In a 45-minute LLD round the diagram and key classes matter more; code can be partial. Ask which one it is in step 1.</p>
      <p><b>Choosing class vs enum vs record vs interface.</b> ${H.table(['Use', 'When', 'Example'], [
        ['<code>enum</code>', 'fixed, known set of values; may carry data', 'VehicleType, GameStatus'],
        ['<code>record</code>', 'immutable data carrier; equality by value', 'Vehicle, Move, Receipt'],
        ['<code>class</code>', 'has mutable state + behaviour + invariants', 'ParkingSpot, Board, Game'],
        ['<code>interface</code>', 'behaviour that varies; plug-in point', 'PricingStrategy, Player']
      ])} A common trap: making <code>Car</code>, <code>Bike</code>, <code>Truck</code> subclasses that add no behaviour. If subclasses only differ by a constant, an enum with fields is simpler and still extensible.</p>
      <p><b>Invariants.</b> Strong designs state and protect rules: "a spot holds at most one vehicle", "a ticket is used once", "nobody moves after the game ends". Each invariant should be enforced in exactly one place (usually the class that owns the data), with a clear exception.</p>
      <p><b>Concurrency in step 1, not step 7.</b> If the prompt has several gates, counters or users, say early: "park/unpark must be atomic; I will start with one lock on the lot (<code>synchronized</code> in Java, a mutex elsewhere) and discuss finer-grained locking later." This shows senior judgement without derailing the round.</p>
      <p><b>Time traps.</b> Writing getters/setters for every field, building a fancy console menu, or adding persistence nobody asked for. Write only what the use cases need, then a demo.</p>`,
    aiEra: `<p><b>What AI changes:</b> an AI assistant can spit out a "parking lot" in your language of choice in seconds, so interviewers increasingly care about the parts AI is weakest at: <i>asking the right clarifying questions</i>, <i>defending trade-offs</i>, and <i>adapting the design live</i> when a follow-up arrives. Some companies now run "AI-allowed" design rounds where you may use a coding assistant but must explain and modify every line.</p>
      <p><b>Use AI as a partner:</b> before practice, ask <code>Give me 10 clarifying questions an interviewer expects for "design a food delivery app" LLD, don't design it</code>; after writing your design, ask <code>List 5 follow-up requirements that would break this class diagram</code>. In real work, ask it to draft boilerplate (records, enums, builders) once <i>you</i> have fixed the entities and APIs.</p>
      <p><b>Where AI goes wrong:</b> it over-engineers (a Singleton ParkingLot, five abstract classes, a factory for everything), invents requirements, skips concurrency, and produces code where pricing logic leaks into the gate classes. It rarely asks what is out of scope.</p>
      <p><b>What you must still own:</b> the requirement list, the choice of what goes behind an interface, the invariants, and the ability to explain why each class exists. If you cannot defend a class in one sentence, delete it.</p>`,
    problems: [{
      title: 'Framework Drill: Library Book Checkout',
      level: 'Easy', tags: ['framework', 'entities', 'strategy'], companies: ['Amazon', 'Microsoft', 'Flipkart'],
      statement: `<p>Apply the 7-step framework to a small library. Members borrow and return books; a member may hold at most <b>3</b> books; loans last <b>14 days</b>; the librarian can list overdue loans. The interviewer warns: <i>"next quarter, premium members get different limits"</i>. Produce entities, APIs and working code.</p>`,
      constraints: `In-memory only. Up to 10<sup>5</sup> books and members. Dates use your language's date type (<code>LocalDate</code> / <code>datetime.date</code> / <code>Date</code> / <code>std::chrono</code>). Borrowing an already-lent book or exceeding the limit must fail with a clear exception.`,
      example: `<p>Asha borrows <code>111</code> on ${H.c('b', '2026-01-01')} → due ${H.c('g', '2026-01-15')}. On 2026-01-20, <code>overdue()</code> returns ${H.c('r', '1 loan')}. After she returns it, ${H.c('g', '0 loans')}. Asha trying a 4th book → ${H.c('r', 'an error: reached the limit of 3')}.</p>`,
      brute: { why: `<p>A single <code>LibrarySystem</code> class with two maps and string statuses ("FREE" / memberId). It passes a demo, but the limit 3 is hard-coded mid-method, there is no Loan object so "overdue" cannot even be computed (no due date stored), and the premium-member follow-up means editing the core method. Errors come back as magic strings that callers must remember.</p>`, code: J.g1_brute },
      mcq: { q: 'The interviewer says "premium members will have different limits". Where should that rule live?', options: ['Inside <code>borrow()</code> as an if-else on member type', 'In a <code>LendingPolicy</code> interface injected into Library', 'In the <code>Book</code> class', 'In a static constant'], answer: 1, explain: 'A rule that is announced to change goes behind an interface. A new PremiumPolicy class plugs in; Library never changes.' },
      hints: [
        `<p>Hint 1: underline nouns in the prompt — book, member, loan, library, limit. Which of them has its <i>own data</i>? A loan has a member, a book and a due date: it deserves a class.</p>`,
        `<p>Hint 2: the limit and the loan length are the "will change" part. Put both behind <code>interface LendingPolicy { int maxBooks(Member m); int loanDays(Member m); }</code>.</p>`,
        `<p>Hint 3: APIs: <code>borrow(member, isbn, today)</code>, <code>giveBack(member, isbn)</code>, <code>overdue(today)</code>. Keep a <code>Map&lt;isbn, Loan&gt;</code> for active loans; validate: unknown ISBN, already lent, limit reached, returning someone else's book.</p>`
      ],
      tests: { io: true, cases: [{ stdin: "", stdout: "Due 2026-01-15\nOverdue on Jan 20: 1\nClean Code is already lent out\nNo book 999\nOverdue after return: 0\nAsha holds 3 books\nAsha reached the limit of 3\nThis member does not hold 111\nPremium due 2026-01-31\n" }] },
      solution: {
        approach: `<p><b>Entities:</b> <code>Book</code> (immutable value type), <code>Member</code>, <code>Loan</code>, <code>Library</code> (facade). <b>Pattern:</b> Strategy via <code>LendingPolicy</code>. <b>Flow:</b> borrow validates → creates Loan with due date from policy → indexes it by ISBN and on the member. Overdue is a filter over active loans. Passing <code>today</code> in (instead of reading the clock inside, for example <code>LocalDate.now()</code>) keeps the code testable.</p>`,
        code: J.g1_sol,
        alt: ALT.g1_sol,
        complexity: `<p>borrow / giveBack: O(1) map work plus O(k) list removal where k ≤ 3 loans per member. overdue: O(active loans). Space O(books + loans).</p>`,
        followUps: ['Premium members: 10 books, 30 days — write <code>PremiumPolicy</code>', 'Reservations queue: notify the next member when a book returns (Observer)', 'Fines: who computes them — Loan, Library or a FinePolicy?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 2 — THE BRUTE FORCE: ONE PROCEDURAL GOD CLASS
     ===================================================================== */
  var GOD_VIZ_CODE = [
    'class ParkingLot {',
    '  String[] size, who; long[] since;',
    '  int park(String type, String plate, long h) {',
    '    for (int i = 0; i < size.length; i++) {',
    '      boolean fits = type.equals("BIKE")',
    '        || (type.equals("CAR") && !size[i].equals("S"))',
    '        || (type.equals("TRUCK") && size[i].equals("L"));',
    '      if (who[i] == null && fits) { who[i] = plate; since[i] = h; return i; }',
    '    }',
    '    return -1;',
    '  }',
    '  long leave(int i, String type, long h) {',
    '    long hrs = Math.max(1, h - since[i]);',
    '    long fee = type.equals("BIKE") ? hrs * 10',
    '             : type.equals("CAR") ? hrs * 20 : hrs * 50;',
    '    who[i] = null;',
    '    System.out.println("Paid " + fee);',
    '    return fee;',
    '  }',
    '}'
  ].join('\n');
  var GOD_SMELLS = { 2: 'bad', 5: 'bad', 6: 'bad', 7: 'bad', 10: 'bad', 14: 'bad', 15: 'bad', 17: 'bad' };
  var OO_BASE_NODES = [
    B('Lot', 'ParkingLot', 50, 8), B('Spot', 'ParkingSpot', 14, 28), B('Tkt', 'Ticket', 50, 28),
    B('Alloc', '«I» AllocationStrategy', 22, 50), B('Price', '«I» PricingStrategy', 74, 50), B('VT', 'enum VehicleType', 84, 28)
  ];
  var OO_BASE_EDGES = [['Lot', 'Spot', '1..*'], ['Lot', 'Tkt', 'active'], ['Lot', 'Alloc', 'uses'], ['Lot', 'Price', 'uses'], ['Tkt', 'VT']];
  var CHANGE_REQS = {
    ev: { title: 'Add EV spots: only electric cars may use them, plus a charging fee', god: [2, 3, 5, 6, 7, 12, 14, 15], node: B('New', 'ChargingAddOn', 74, 70), edge: ['New', 'Price', 'wraps'], also: 'one new constant EV in SpotType', pattern: 'Decorator over PricingStrategy' },
    weekend: { title: 'Weekend prices are 1.5×', god: [12, 13, 14, 15], node: B('New', 'WeekendPricing', 74, 70), edge: ['New', 'Price', 'implements'], also: 'nothing else', pattern: 'Strategy' },
    display: { title: 'Show free-spot counts on a screen at the entrance', god: [8, 16, 17], node: B('New', 'DisplayBoard', 50, 70), edge: ['Lot', 'New', 'notifies'], also: 'Lot calls listeners (2 lines)', pattern: 'Observer' },
    nearest: { title: 'Allocate the spot nearest to the entry gate, not the first in the array', god: [4, 5, 6, 7, 8], node: B('New', 'NearestToGate', 22, 70), edge: ['New', 'Alloc', 'implements'], also: 'nothing else', pattern: 'Strategy' },
    upi: { title: 'Accept UPI as well as cash', god: [12, 16, 17, 18], node: B('New', 'UpiProcessor', 50, 70), edge: ['Lot', 'New', 'pays via'], also: 'a PaymentProcessor interface (first time only)', pattern: 'Strategy' }
  };

  topics.push({
    title: 'The Brute Force: A Single Procedural "God Class" and Why Interviewers Reject It',
    analogy: `<p>Picture a small restaurant where one person takes orders, cooks, washes dishes, handles the cash and answers the phone. On a quiet Tuesday it works. On a busy Saturday — or the day the owner says "let's add home delivery" — everything collapses, because every new job lands on the same overloaded person.</p>
      <p>A <b>God class</b> is that one person: a single class (often all <code>static</code>) that parses input, stores state in parallel arrays, applies rules, computes prices and prints output. It runs, but it cannot grow.</p>`,
    explain: `<p><b>What the brute force looks like.</b> Asked to "design a parking lot", many candidates write one class with arrays like <code>String[] who</code> and <code>long[] since</code>, an <code>if (type.equals("CAR"))</code> ladder for fit rules, another ladder for prices, and console printing in the middle of business logic. It is the design equivalent of a nested-loop brute force in DSA: <b>correct for the sample, terrible for change</b>.</p>
      ${H.table(['Smell', 'In the God class', 'Why it hurts'], [
        ['Primitive obsession', 'Vehicle type is a <code>String</code>; a spot is an index into 3 arrays', '"Car" vs "CAR" typo compiles and silently fails; no place to put spot behaviour'],
        ['Shotgun surgery', 'Fit rules and prices are if-else ladders', 'One new vehicle type = edits in many methods'],
        ['Low cohesion', 'Parsing, rules, pricing, payment, printing in one class', 'Every change risks breaking unrelated features'],
        ['Hidden invariants', 'Nothing stops leaving a free spot twice or paying with someone else\'s ticket', 'Bugs surface in production, not at compile time'],
        ['Untestable', '<code>static</code> state + console I/O + real clock', 'Cannot unit-test pricing without parking a car'],
        ['No concurrency story', 'check-then-act on shared arrays', 'Two gates can assign the same spot']
      ])}
      <p><b>Why interviewers reject it even if it runs.</b> The LLD rubric does not reward "it prints the right answer". It rewards <i>object modelling</i>, <i>separation of responsibilities</i> and <i>extensibility</i>. The moment the interviewer asks a follow-up ("add EV spots", "weekend pricing", "a display board"), the God class needs edits in five places while a modelled design needs one new class. That difference — visible in under a minute — is the whole signal of the round.</p>
      <p><b>When is a single class actually fine?</b> A throwaway script, a coding (DSA) round, or a prototype you will delete tomorrow. Saying this out loud is a plus: "for a script I would write this; for a system that will grow, here is the design."</p>
      <p><b>How to refactor (the same steps work on any God class):</b> ${H.chips(['strings → enums', 'parallel arrays → objects', 'if-ladders → data in enums or Strategy', 'println → return values / listeners', 'static state → instances', 'real clock → injected TimeSource'], { label: 'Refactoring moves' })}</p>`,
    clues: [
      '"Just make it work first" in a design round is a trap — you will be judged on the structure, so say what a quick version would be, then model properly',
      'Your code has <code>if (type.equals("CAR"))</code> in more than one method → shotgun surgery; replace with enum data or Strategy',
      'Three arrays indexed by the same <code>i</code> (<code>who[i]</code>, <code>since[i]</code>, <code>size[i]</code>) → they want to be one object',
      'printing to the console inside business logic → mixing UI and domain; return values or publish events instead',
      'Interviewer asks "how would you test the fee calculation alone?" → they spotted untestable, tangled code',
      'Everything is <code>static</code> → no way to run two lots, inject fakes, or test in isolation'
    ],
    code: J.t2_god,
    alt: ALT.t2_god,
    codeTitle: 'The God class, annotated with every smell an interviewer will mark (compiles and runs — that is the point)',
    viz: {
      title: 'Change requests: God class edits vs modelled design additions',
      input: 'ev weekend display',
      inputLabel: 'Change requests (ev | weekend | display | nearest | upi), space separated',
      gen: function (input) {
        var reqs = words(input, 'Enter change requests like: ev weekend display', 5);
        reqs.forEach(function (r) { if (!CHANGE_REQS[r]) throw new Error('Unknown request "' + r + '". Use ev, weekend, display, nearest or upi'); });
        var frames = [], godEdits = 0, ooNew = 0, ooEdits = 0, tally = [];
        frames.push(F('Here is a typical brute-force answer. Red lines are smells: strings for types, parallel arrays, rules and prices as if-else ladders, printing inside logic. It works for the demo — now watch what each follow-up costs.', [
          CODE('God class (brute force)', GOD_VIZ_CODE, GOD_SMELLS),
          G('Modelled design (same behaviour)', OO_BASE_NODES, OO_BASE_EDGES, { h: 80 })
        ]));
        reqs.forEach(function (r) {
          var cr = CHANGE_REQS[r], hl = {};
          cr.god.forEach(function (ln) { hl[ln] = 'bad'; });
          godEdits += cr.god.length;
          frames.push(F('Follow-up: <b>' + cr.title + '</b>. In the God class you must edit <span class="c-r">' + cr.god.length + ' lines</span> spread across both methods — every one a chance to break parking or billing for existing cars.', [
            CODE('God class: lines that must change', GOD_VIZ_CODE, hl),
            VARS('Running cost', { godLinesEdited: godEdits, ooClassesAdded: ooNew, ooCoreClassesEdited: ooEdits }, { godLinesEdited: 'bad' })
          ]));
          ooNew += 1;
          var nodes = OO_BASE_NODES.concat([cr.node]);
          var ghl = many(OO_BASE_NODES.map(function (n) { return n.id; }), 'done');
          ghl.New = 'ok';
          var touched = cr.edge[0] === 'New' ? cr.edge[1] : cr.edge[0];
          ghl[touched] = 'cur';
          frames.push(F('Same follow-up in the modelled design: add <span class="c-g">' + cr.node.label + '</span> (' + cr.pattern + ') and plug it into <b>' + touched + '</b>. Also needed: ' + cr.also + '. Existing classes keep working untouched — that is the Open/Closed principle paying off.', [
            G('Modelled design: one new class', nodes, OO_BASE_EDGES.concat([cr.edge]), { h: 80, hl: ghl, ehl: one(cr.edge[0] + '-' + cr.edge[1], 'ok'), tags: { New: 'NEW' } }),
            VARS('Running cost', { godLinesEdited: godEdits, ooClassesAdded: ooNew, ooCoreClassesEdited: ooEdits }, { ooClassesAdded: 'ok' })
          ]));
          tally.push([r, cr.god.length + ' lines edited', '1 class added', cr.pattern]);
        });
        frames.push(F('Scoreboard. The God class pays for every follow-up with risky edits to shared code; the modelled design pays with small, new, independently testable classes. This is exactly what an interviewer measures when they ask "how would you extend this?"', [
          TABLE('Cost of change', ['Request', 'God class', 'Modelled design', 'Pattern'], tally.concat([['TOTAL', godEdits + ' lines', ooNew + ' classes, 0 rewrites', '']]), one(tally.length, 'sel'))
        ]));
        return frames;
      }
    },
    examples: [
      {
        title: 'Same feature, two shapes: adding a BUS',
        html: `${H.table(['Design', 'What changes for "buses need 2 adjacent LARGE spots"'], [
          [H.c('r', 'God class'), 'New string "BUS" in the fit ladder, new branch in the price ladder, the loop must now look at <code>i</code> and <code>i+1</code>, <code>who[]</code> must store the bus twice, <code>leave()</code> must free two indexes — five edits in two methods'],
          [H.c('g', 'Modelled'), '<code>BUS</code> in VehicleType with its rate; a <code>MultiSpotAllocation</code> strategy that returns a list of spots; Ticket holds <code>List&lt;ParkingSpot&gt;</code>. ParkingLot, gates and pricing are untouched']
        ])}`
      },
      {
        title: 'Testing pricing alone',
        html: `<p>God class: to test "3 hours of car costs 60" you must call <code>handle("IN CAR ...")</code>, then <code>handle("OUT ...")</code>, then parse console output. Modelled: <code>new HourlyPricing(rates).fee(ticket, exitTime)</code> — one line, no lot, no console, no real clock.</p>
          ${H.kv([['God class test', '3 commands + output parsing'], ['Modelled test', '1 method call']], { label: 'Effort' })}`
      },
      {
        title: 'The honest answer when asked "why not one class?"',
        html: `<p>${H.c('g', '"For a 50-line script I would. But you told me this lot gets more vehicle types, new pricing and display boards. With one class every change touches parking, billing and printing at once. Splitting by responsibility means pricing changes only touch PricingStrategy, and I can unit-test each piece."')}</p><p>This shows you know the trade-off rather than following OOP as a religion.</p>`
      },
      {
        title: 'Refactoring a God class live (guided problem below)',
        html: `<p>Some interviews hand you the God class and say "improve this". Work in safe steps: (1) introduce enums for strings, (2) wrap parallel arrays into <code>Spot</code>, (3) move fit rules into the enum, (4) extract <code>Pricer</code>, (5) make <code>Lot</code> an instance with injected strategies, (6) keep the original <code>main()</code> output identical — that is your regression test.</p>`,
        code: J.g2_sol,
        alt: ALT.g2_sol
      }
    ],
    deepDive: `<p><b>Coupling and cohesion, measured.</b> Cohesion asks "do the members of this class work on the same data for the same purpose?" In the God class, <code>cashInDrawer</code> and <code>size[]</code> never interact — low cohesion. Coupling asks "how many things must change together?" — the fit ladder and the price ladder both switch on the same type string, so they are coupled through a magic value. Good designs have <b>high cohesion inside classes, low coupling between them</b>.</p>
      <p><b>Why procedural is not "wrong".</b> Procedural code with data structures is perfectly valid (Linux kernel, many high-performance systems). The issue is <i>unmanaged</i> change: in OOP interviews, the expectation is that variation points are explicit. A procedural design with a table of rules (data-driven) can also be extensible — e.g. a <code>Map&lt;VehicleType, Rule&gt;</code> — and mentioning that shows depth.</p>
      <p><b>Over-correction is also penalised.</b> The opposite failure is the "pattern zoo": Abstract factories for one product, a Singleton ParkingLot (global state, hard to test, breaks with two lots), Visitor where a switch would do. Rule of thumb: add an interface only where the requirements <i>name</i> a variation or the interviewer hints at one.</p>
      <p><b>Static state and tests.</b> Static fields survive between tests in the same JVM, so test order starts to matter. Instances with constructor injection (<code>new ParkingLot(floors, strategy, pricing, clock)</code>) give every test a fresh world.</p>
      <p><b>Concurrency failure of the God class.</b> <code>if (who[i] == null) who[i] = plate;</code> is a classic <i>check-then-act</i> race. Two threads can both see null. Even guarding it with one global lock (<code>synchronized</code> on a static method in Java) serialises the whole class — every gate waits for every other. The modelled design lets you choose: lot-level lock, per-floor locks, or lock-free per-type queues.</p>`,
    aiEra: `<p><b>What AI changes:</b> ask a code assistant for "a parking lot program" with no further context and you will often get exactly this God class — a console-input loop, arrays and if-else ladders — because it is the shortest thing that runs. Recognising and refactoring that output is now a core skill.</p>
      <p><b>Use AI as a partner:</b> paste a God class and ask <code>List every responsibility in this class, one per line, and suggest which class should own it</code>. Then you decide the split. Ask <code>Write characterization tests that pin the current console output</code> before refactoring, so you can refactor safely.</p>
      <p><b>Where AI goes wrong:</b> when asked to "make it OOP", it may create classes that are just data bags while all logic stays in a <code>Manager</code> class (an anaemic model — the God class in disguise), or add patterns with no requirement behind them.</p>
      <p><b>What you must still own:</b> deciding the responsibilities, the variation points and the invariants. AI can move code; it cannot know which rules your business expects to change.</p>`,
    problems: [{
      title: 'Refactor the God-Class Parking Lot',
      level: 'Medium', tags: ['refactoring', 'SRP', 'strategy', 'enum'], companies: ['Flipkart', 'Swiggy', 'PhonePe'],
      statement: `<p>You are given a working, single-class parking program (parallel arrays, type strings, inline pricing). Refactor it into a clean design <b>without changing its observable behaviour</b>: the demo must still print <code>Car at spot 1, pays 60</code>. Then show how "weekend pricing" would be added.</p>`,
      constraints: `Keep the same rules: bikes fit any spot, cars fit M or L, trucks only L; price per hour 10 / 20 / 50, minimum 1 hour. Tickets must not be reusable.`,
      example: `<p>Spots ${H.arr(['S', 'M', 'M', 'L'])} Car enters at hour 9 → ${H.c('g', 'spot 1')} (first M). Leaves at 12 → ${H.c('b', '3 h × 20 = 60')}. Leaving again with the same ticket → ${H.c('r', 'IllegalArgumentException')} (the brute force silently "frees" the spot twice).</p>`,
      brute: { why: `<p>The original: everything static, rules duplicated as string comparisons, a ticket is just an array index (anyone can "leave" any spot), and pricing is tangled into <code>leave()</code>. Adding a vehicle type means editing both the fit check and the price ladder.</p>`, code: J.g2_brute },
      mcq: { q: 'What is the FIRST safe step when refactoring a God class you did not write?', options: ['Rename everything to nicer names', 'Pin its current behaviour with a test or a demo whose output you record', 'Split it into ten classes at once', 'Add a Singleton'], answer: 1, explain: 'Characterization tests (or a recorded demo output) let you refactor in small steps and prove nothing broke.' },
      hints: [
        `<p>Hint 1: the type strings and their rules ("CAR fits M or L, costs 20") are data. Put them in an <code>enum VType</code> with a rate and a list of fitting sizes.</p>`,
        `<p>Hint 2: the three parallel arrays describe one thing — a spot. Make <code>class Spot { id, size, plate }</code>. A ticket becomes a small immutable value type <code>Ticket(id, plate, type, spot, entryHour)</code> (a <code>record</code> in Java).</p>`,
        `<p>Hint 3: extract <code>Allocator</code> and <code>Pricer</code> interfaces; <code>Lot</code> takes them in its constructor, keeps a <code>Map&lt;Integer, Ticket&gt;</code> of open tickets and removes on leave (so reuse fails). Weekend pricing = a new <code>Pricer</code>.</p>`
      ],
      tests: { io: true, cases: [{ stdin: "", stdout: "Car at spot 1, pays 60\nBike at spot 0\nTruck at spot 3\nFull for TRUCK\nBad ticket 99\nBike pays 10\nWeekend car pays 90\n" }] },
      solution: {
        approach: `<p>Move data-like rules into the enum, wrap arrays into objects, extract the two variation points (allocation and pricing) as interfaces, and make the lot an instance with constructor injection. Behaviour is identical for the demo, but each future change now has an obvious home: new type → enum constant; new tariff → new Pricer; new allocation → new Allocator.</p>`,
        code: J.g2_sol,
        alt: ALT.g2_sol,
        complexity: `<p>Same as before: park O(spots × fitting sizes) with first-fit; leave O(1). The win is in change cost, not runtime.</p>`,
        followUps: ['Write <code>WeekendPricer</code> that multiplies another Pricer by 1.5 (Decorator)', 'Make allocation O(1) with a free-spot queue per size', 'Where would you put a display board that shows free counts?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 3 — PARKING LOT: REQUIREMENTS → ENTITIES → CLASS DIAGRAM → CODE
     ===================================================================== */
  var PL_NODES = {
    In: B('In', 'EntryGate', 12, 7), Lot: B('Lot', 'ParkingLot', 40, 7), Alloc: B('Alloc', '«I» AllocationStrategy', 80, 7),
    Out: B('Out', 'ExitGate', 12, 26), Floor: B('Floor', 'ParkingFloor', 40, 26), Price: B('Price', '«I» PricingStrategy', 80, 26),
    Tkt: B('Tkt', 'Ticket', 12, 45), Spot: B('Spot', 'ParkingSpot', 40, 45), Time: B('Time', '«I» TimeSource', 80, 45),
    ST: B('ST', 'enum SpotType', 12, 64), Veh: B('Veh', 'record Vehicle', 40, 64), Disp: B('Disp', 'DisplayBoard', 80, 64),
    VT: B('VT', 'enum VehicleType', 60, 82)
  };
  var PL_BUILD = [
    { add: ['Lot'], edges: [], why: 'Start with the <b>facade</b>: the one object the outside world talks to. Requirement: "a parking lot that vehicles can enter and leave".', row: ['ParkingLot', 'floors, active tickets, strategies', 'park(), unpark(), freeSpots()'] },
    { add: ['Floor'], edges: [['Lot', 'Floor', '1..*']], why: '"The lot has <b>multiple floors</b>." Composition (◆): floors are created with the lot and do not exist without it.', row: ['ParkingFloor', 'number, spots', 'spots()'] },
    { add: ['Spot'], edges: [['Floor', 'Spot', '1..*']], why: '"Each floor has many <b>spots</b>." A spot has state (free / taken) and protects the rule "at most one vehicle", so it is a real class, not an array slot.', row: ['ParkingSpot', 'id, floor, type, vehicle', 'isFree(), assign(v), release()'] },
    { add: ['ST'], edges: [['Spot', 'ST', 'type']], why: '"Spots are <b>small, compact or large</b>." A fixed set of values → <code>enum SpotType</code>.', row: ['SpotType (enum)', 'SMALL, COMPACT, LARGE', '—'] },
    { add: ['Veh', 'VT'], edges: [['Spot', 'Veh', '0..1'], ['Veh', 'VT'], ['VT', 'ST', 'fits']], why: '"<b>Bikes, cars, trucks</b>; each fits certain spot sizes." Vehicle is pure data → <code>record</code>. The fit rule is data on the enum (<code>CAR fits COMPACT, LARGE</code>), so there is no if-else anywhere.', row: ['Vehicle (record) + VehicleType (enum)', 'plate, type / fits list', 'fits()'] },
    { add: ['Tkt'], edges: [['Tkt', 'Spot'], ['Tkt', 'Veh'], ['Lot', 'Tkt', 'active *']], why: '"The driver gets a <b>ticket</b> at entry." A ticket links vehicle + spot + entry time — the evidence needed at exit. Association (plain arrow): it refers to, but does not own, the spot.', row: ['Ticket', 'id, vehicle, spot, entryTime', 'getters only (immutable)'] },
    { add: ['In', 'Out'], edges: [['In', 'Lot', 'park()'], ['Out', 'Lot', 'unpark()']], why: '"Multiple <b>entry and exit gates</b>." Gates are thin: they call the lot. Keeping logic out of gates means 1 gate or 20 gates use the same code — but it also means park() must be thread-safe.', row: ['EntryGate / ExitGate', 'lot reference', 'enter(v), exit(ticketId)'] },
    { add: ['Alloc'], edges: [['Lot', 'Alloc', 'uses']], why: '"Assign the <b>nearest</b> free spot" — and the interviewer may change "nearest" later. A rule that may change → <b>Strategy</b> interface. NearestFirst today; BestFit or NearestToGate tomorrow.', row: ['SpotAllocationStrategy (interface)', '—', 'findSpot(floors, type)'] },
    { add: ['Price'], edges: [['Lot', 'Price', 'uses']], why: '"Charge <b>per hour by vehicle type</b>." Pricing changes constantly (weekends, caps, EV charging) → second Strategy. The lot never contains a price formula.', row: ['PricingStrategy (interface)', '—', 'fee(ticket, exitTime)'] },
    { add: ['Time'], edges: [['Lot', 'Time', 'now()']], why: 'Hidden requirement: <b>testability</b>. Fees depend on time; injecting a <code>TimeSource</code> (Dependency Inversion) lets the demo and tests move the clock forward 2.5 hours instantly.', row: ['TimeSource (interface)', '—', 'now()'] },
    { add: ['Disp'], edges: [['Lot', 'Disp', 'notifies']], why: '"Show free spots per type at the entrance." The board <b>listens</b> for spot changes (Observer) and keeps counters, instead of scanning every spot on every refresh.', row: ['DisplayBoard (listener)', 'free count per type', 'onOccupied(), onFreed()'] }
  ];

  topics.push({
    title: 'Parking Lot, Part 1: Requirements, Entities, Class Diagram and Full Design in Code',
    analogy: `<p>Think of a shopping-mall car park. At the boom barrier a machine hands you a <b>ticket</b> and a screen says <i>"Level 2: 14 car spaces free"</i>. Painted lines mark <b>spots</b> of different sizes on several <b>floors</b>. When you leave, you pay at the <b>exit</b> by the hour, and the barrier lifts.</p>
      <p>Every physical thing you just noticed — barrier, ticket, screen, floor, painted spot, your car, the price board — is a candidate class. Designing the software is mostly about <b>noticing these things carefully and deciding who is responsible for what</b>.</p>`,
    explain: `<p><b>Step 1 — Clarified requirements</b> (agree on these out loud before drawing anything):</p>
      ${H.table(['Type', 'Requirement'], [
        ['Functional', 'Multiple floors; each floor has spots of type SMALL, COMPACT, LARGE'],
        ['Functional', 'Vehicles: BIKE (any spot), CAR (compact or large), TRUCK (large only)'],
        ['Functional', 'Entry: assign a fitting spot and issue a ticket. Exit: compute fee, free the spot'],
        ['Functional', 'Hourly pricing per vehicle type; minimum one hour; partial hours round up'],
        ['Functional', 'Display free spots per type'],
        ['Non-functional', 'Several gates work at the same time: never give one spot to two vehicles'],
        ['Out of scope', 'Online reservations, camera plate reading, monthly passes (good follow-ups!)']
      ])}
      <p><b>Step 2 — Entities</b> (nouns): ParkingLot, ParkingFloor, ParkingSpot, Vehicle, Ticket, EntryGate, ExitGate, DisplayBoard. Fixed value sets: <code>SpotType</code>, <code>VehicleType</code>. Pure data: <code>Vehicle</code>, <code>Receipt</code> as records.</p>
      <p><b>Step 3 — APIs</b> (what gates call):</p>
      ${H.table(['API', 'Returns', 'Errors'], [
        ['<code>Ticket park(Vehicle v)</code>', 'ticket with spot + entry time', '<code>ParkingLotFullException</code>; vehicle already inside'],
        ['<code>Receipt unpark(String ticketId)</code>', 'minutes parked + amount', 'unknown or already-used ticket'],
        ['<code>Map&lt;SpotType,Integer&gt; freeSpots()</code>', 'free count per type', '—']
      ])}
      <p><b>Step 4 — Class diagram.</b> The visualizer builds it one entity at a time, each tied to the sentence of the requirements that created it. Read the arrows as: <b>◆ composition</b> (Lot owns Floors, Floor owns Spots — they live and die together), <b>plain association</b> (Ticket refers to a Spot and a Vehicle), <b>uses</b> (Lot depends on strategy interfaces).</p>
      <p><b>Step 5 — Patterns, chosen for a reason:</b> ${H.kv([['Strategy', 'SpotAllocationStrategy, PricingStrategy — the two rules most likely to change'], ['Facade', 'ParkingLot hides floors/spots from the gates'], ['Observer', 'DisplayBoard reacts to spot events'], ['Dependency Inversion', 'TimeSource injected, so time is controllable in tests']], { label: 'Why each pattern' })}</p>
      <p><b>Deliberately NOT used:</b> Singleton for ParkingLot (it would block having two lots and make tests share state), and subclasses <code>Car extends Vehicle</code> (they would carry no behaviour — an enum with fit data is simpler).</p>
      <p><b>Step 6 — The code</b> below is complete and compiles as one file. Read it top to bottom in the same order you would write it in an interview: value types → entities → strategies → the facade → gates → demo.</p>`,
    clues: [
      '"Design a parking lot / garage / parking system" → the canonical LLD question; expect follow-ups on pricing, spot types and concurrency',
      '"Different vehicle sizes" → enum with fit rules (data), not an if-else ladder',
      '"Nearest spot", "first available" → allocation Strategy; mention per-type free lists or a min-heap for speed',
      '"Multiple entry gates" → park() must be atomic: one lock (synchronized / mutex), per-floor locks, or concurrent queues',
      '"Display board", "show availability" → Observer with counters, not a full scan per refresh',
      '"Hourly / daily / weekend pricing" → PricingStrategy, possibly decorated (cap, surcharge)'
    ],
    code: J.ParkingLotDemo,
    alt: ALT.ParkingLotDemo,
    codeTitle: 'Complete Parking Lot design (one file, compiles and runs; pick your language in the tabs)',
    viz: {
      title: 'Parking-lot class diagram, built entity by entity',
      gen: function () {
        var frames = [], present = [], edges = [], rows = [];
        frames.push(F('We start from the written requirements, not from a blank class. Each step below adds <b>one entity</b> and the arrows it needs, and quotes the requirement that justified it. If you cannot point to a requirement, the class should not exist.', [
          TXT('<b>Requirements:</b> multi-floor lot · spot types SMALL / COMPACT / LARGE · bikes, cars, trucks · ticket at entry · hourly fee at exit · nearest fitting spot · display free counts · several gates at once.', 'Step 1 output'),
          TABLE('Nouns found', ['Noun', 'Becomes'], [['lot, floor, spot', 'classes'], ['bike / car / truck', 'enum VehicleType'], ['small / compact / large', 'enum SpotType'], ['ticket', 'class'], ['gate', 'classes'], ['fee, nearest', 'strategies'], ['display', 'listener']])
        ]));
        PL_BUILD.forEach(function (st, k) {
          st.add.forEach(function (id) { present.push(id); });
          edges = edges.concat(st.edges);
          rows.push(st.row);
          var nodes = present.map(function (id) { return PL_NODES[id]; });
          var hl = many(present, 'done'), ehl = {};
          st.add.forEach(function (id) { hl[id] = 'ok'; });
          st.edges.forEach(function (e) { ehl[e[0] + '-' + e[1]] = 'ok'; });
          frames.push(F('<b>+ ' + st.add.map(function (id) { return PL_NODES[id].label; }).join(' + ') + '</b> — ' + st.why, [
            G('Class diagram (' + present.length + ' types so far)', nodes, edges, { h: 90, hl: hl, ehl: ehl, tags: many(st.add, 'new') }),
            TABLE('Entity · attributes · behaviour', ['Type', 'Holds', 'Does'], rows.slice(), one(rows.length - 1, 'ok'))
          ]));
        });
        var all = many(present, 'ok');
        all.Alloc = 'sel'; all.Price = 'sel';
        frames.push(F('The finished diagram. Purple boxes are the <b>variation points</b> (interfaces). Notice the direction of dependencies: everything points <i>into</i> the stable core; gates know only the lot; the lot knows only interfaces for rules. That is why follow-ups become new classes instead of edits.', [
          G('Final class diagram', present.map(function (id) { return PL_NODES[id]; }), edges, { h: 90, hl: all }),
          TABLE('Relationship cheat-sheet', ['Arrow', 'Meaning', 'Example'], [['◆ 1..*', 'composition: owns, same lifetime', 'Lot → Floor → Spot'], ['→ 0..1', 'association: refers to', 'Spot → Vehicle, Ticket → Spot'], ['uses', 'dependency on an interface', 'Lot → AllocationStrategy'], ['notifies', 'observer', 'Lot → DisplayBoard']])
        ]));
        return frames;
      }
    },
    examples: [
      {
        title: 'Why an enum with data beats Car/Bike/Truck subclasses here',
        html: `${H.table(['Option', 'Pros', 'Cons'], [
          ['<code>abstract class Vehicle</code> + <code>Car</code>, <code>Bike</code>, <code>Truck</code>', 'textbook-looking; room for type-specific behaviour', 'subclasses usually carry only a constant; new type = new file + maybe new fit logic'],
          ['<code>enum VehicleType</code> with <code>fits()</code> data + <code>record Vehicle</code>', 'fit rules in one place; adding BUS is one line; easy to iterate over all types', 'if types later need very different behaviour, you may move to classes']
        ])}<p>Say both options and pick one with a reason — that is what the interviewer is listening for.</p>`
      },
      {
        title: 'Dry run of the demo in the code',
        html: `<p>Layout: F0 = ${H.arr(['S', 'C', 'C', 'L'])} F1 = ${H.arr(['S', 'C', 'L', 'L'])}</p>
          ${H.table(['Action', 'Strategy reasoning', 'Result'], [
            ['park CAR', 'F0: COMPACT first → S1 free', H.c('g', 'T1 → F0-S1')],
            ['park BIKE', 'F0: SMALL first → S0 free', H.c('g', 'T2 → F0-S0')],
            ['park TRUCK', 'F0: LARGE → S3 free', H.c('g', 'T3 → F0-S3')],
            ['freeSpots()', 'scan: SMALL F1-S0; COMPACT F0-S2, F1-S1; LARGE F1-S2, F1-S3', '{SMALL=1, COMPACT=2, LARGE=2}'],
            ['+150 min, unpark T1', 'ceil(150/60) = 3 h × 20', H.c('b', 'amount 60')],
            ['unpark T1 again', 'ticket removed from activeTickets', H.c('r', 'rejected')]
          ])}`
      },
      {
        title: 'Where does each rule live? (responsibility map)',
        html: `${H.table(['Rule', 'Owner', 'Why there'], [
          ['a spot holds ≤ 1 vehicle', 'ParkingSpot.assign()', 'it owns the vehicle field'],
          ['a car may use COMPACT or LARGE', 'VehicleType.fits()', 'it is data about the type'],
          ['which free spot to choose', 'SpotAllocationStrategy', 'it changes independently'],
          ['how much to charge', 'PricingStrategy', 'it changes independently'],
          ['a ticket is used once', 'ParkingLot (activeTickets.remove)', 'the lot owns the ticket registry'],
          ['same plate cannot enter twice', 'ParkingLot (platesInside)', 'needs a lot-wide view']
        ])}`
      },
      {
        title: 'Five-minute version for a 45-minute round',
        html: `<p>If time is short, write: the two enums, <code>ParkingSpot</code>, <code>Ticket</code>, the two strategy <b>interfaces</b> with one implementation each, and <code>ParkingLot.park/unpark</code>. Skip gates and display board, but <i>say</i> where they plug in. Interviewers prefer 6 clean classes over 12 half-finished ones.</p>
          ${H.chips(['SpotType', 'VehicleType', 'ParkingSpot', 'Ticket', 'AllocationStrategy', 'PricingStrategy', 'ParkingLot'], { label: 'Minimum viable design' })}`
      }
    ],
    deepDive: `<p><b>Composition vs aggregation vs association in this design.</b> Lot ◆ Floor ◆ Spot is composition: the spots are built by the floor constructor from a layout and never move between floors. Ticket → Spot is association: a ticket points at a spot it does not own; when the ticket is closed the spot lives on. Game ◇ Player (next topic) is aggregation: players exist outside the game. Using the right arrow in the diagram is a cheap way to look precise.</p>
      <p><b>Choosing data structures for speed.</b> The reference <code>NearestFirstStrategy</code> scans: O(floors × types × spots per floor) per park — fine for a few thousand spots. At 50,000 spots and peak traffic, keep a <b>free list per (floor, type)</b> (e.g. a deque, or a sorted set or min-heap of spot numbers to keep "nearest" order: <code>TreeSet</code> / <code>heapq</code> / <code>std::set</code>) for O(1)/O(log n) allocation; freeing a spot pushes it back. Mention this as the "scale" follow-up rather than writing it first.</p>
      <p><b>Thread safety.</b> <code>park</code> and <code>unpark</code> hold one lock on the lot (<code>synchronized</code> / <code>threading.Lock</code> / <code>std::mutex</code>): simple and correct, but it serialises all gates. Options as load grows: (1) a lock per floor, choosing floors in a fixed order to avoid deadlock; (2) per-type thread-safe queue of free spots (<code>ConcurrentLinkedQueue</code> / <code>queue.SimpleQueue</code> / a mutex-guarded deque) whose pop hands each spot to exactly one thread (practice problem); (3) in a real distributed system, the database row or a Redis atomic op becomes the lock. Always identify the <i>check-then-act</i> (find free → assign) as the critical section.</p>
      <p><b>Money and time.</b> Use integer minor units (paise/cents in a 64-bit integer: <code>long</code> / <code>long long</code>) or a decimal type (<code>BigDecimal</code> / <code>decimal.Decimal</code>) — never a binary floating-point number for money. Use a UTC timestamp and a duration type (<code>Instant</code> / <code>Duration</code>, <code>datetime</code> / <code>timedelta</code>, <code>std::chrono</code>) for time; inject the clock. Rounding policy ("any started hour is charged") must be explicit and tested at boundaries: 60 minutes → 1 hour, 61 → 2.</p>
      <p><b>Persistence later.</b> Keep <code>activeTickets</code> behind a small repository interface if the interviewer mentions restarts: in-memory map today, JDBC tomorrow, no change to the lot.</p>
      <p><b>Immutability.</b> Ticket and Vehicle are immutable (read-only fields: <code>final</code> / frozen dataclass / <code>readonly</code> / <code>const</code>), so they can be shared across threads and stored in maps safely. Only ParkingSpot has mutable state, and it is always changed under the lot's lock.</p>`,
    aiEra: `<p><b>What AI changes:</b> "Parking lot" is one of the most common prompts on the internet, so AI tools reproduce a standard design instantly — and interviewers know it. Expect deeper probes: "why is park locked?", "what if two gates read the same free spot?", "how does your design change at 50,000 spots?".</p>
      <p><b>Use AI as a partner:</b> after drawing your own diagram, ask <code>Critique this class diagram for a parking lot: which responsibilities are misplaced?</code> or <code>Generate unit tests for boundary fees: 0, 59, 60, 61 minutes</code>. Use it to produce boilerplate records and enums once your entity list is final.</p>
      <p><b>Where AI goes wrong:</b> Singleton ParkingLot by default, <code>double</code> for money, the clock read deep inside pricing (<code>LocalDateTime.now()</code>, <code>datetime.now()</code>: untestable), fit rules duplicated in several places, and no protection against using one ticket twice.</p>
      <p><b>What you must still own:</b> the requirement list, the invariants, the concurrency story and the reasoning behind every arrow in the diagram. In AI-allowed rounds, you will be asked to change it live — you can only do that quickly if the structure is yours.</p>`,
    problems: [{
      title: 'Spot Allocation: Model Fits and Pluggable Strategies',
      level: 'Medium', tags: ['strategy', 'enum', 'parking lot'], companies: ['Amazon', 'Uber', 'Goldman Sachs'],
      statement: `<p>Model spot types and vehicle types so that the "which spots fit" rule lives in exactly one place. Then implement two interchangeable allocation strategies: <b>NearestFirst</b> (lowest floor first; on that floor the smallest fitting type) and <b>BestFitFirst</b> (smallest fitting type anywhere, then lowest floor — protects large spots for trucks).</p>`,
      constraints: `Floors ≤ 50, spots per floor ≤ 1000. Bikes fit SMALL, COMPACT, LARGE (in that preference); cars COMPACT, LARGE; trucks LARGE. Return empty when nothing fits.`,
      example: `<p>Floor 0 = ${H.arr(['S', 'L'])} Floor 1 = ${H.arr(['S', 'M'])} A car arrives.</p><p>NearestFirst → ${H.c('y', '0-1 (LARGE on floor 0)')}: less driving. BestFitFirst → ${H.c('g', '1-1 (COMPACT on floor 1)')}: keeps the large spot for a truck.</p>`,
      brute: { why: `<p>One method with a hand-written branch per vehicle type and the fit rules copy-pasted into each branch. A second strategy means copying the whole method; adding a vehicle type means editing every copy.</p>`, code: J.g3_brute },
      mcq: { q: 'Where should "a CAR can use COMPACT or LARGE" be stored?', options: ['In every strategy class', 'In the VehicleType enum as data', 'In ParkingLot.park()', 'In the Spot constructor'], answer: 1, explain: 'It is a fact about the vehicle type. Storing it once on the enum means all strategies share it and a new type is one line.' },
      hints: [
        `<p>Hint 1: both strategies loop over the same three things (floors, fitting types, spots); they only differ in <b>loop order</b>. That is a sign the rule is data and the order is the strategy.</p>`,
        `<p>Hint 2: <code>enum VehicleType { CAR(SpotType.COMPACT, SpotType.LARGE) ... List&lt;SpotType&gt; fits() }</code> and <code>interface SpotAllocationStrategy { Optional&lt;Spot&gt; find(floors, type); }</code>.</p>`,
        `<p>Hint 3: NearestFirst = for floor → for type in fits → for spot. BestFitFirst = for type in fits → for floor → for spot. Return an empty optional (<code>Optional.empty()</code> / <code>None</code> / <code>undefined</code> / <code>std::nullopt</code>) instead of null; the caller turns it into a "lot full" exception.</p>`
      ],
      tests: { io: true, cases: [{ stdin: "", stdout: "NearestFirst puts the car at 0-1\nNearestFirst puts the bike at 0-1\nNearestFirst has no spot for the car\nBestFitFirst puts the car at 1-1\nBestFitFirst puts the bike at 1-0\nBestFitFirst has no spot for the car\n" }] },
      solution: {
        approach: `<p>Put fit preferences on the enum; define a strategy interface; write two tiny implementations that differ only in loop nesting. The ParkingLot receives a strategy through its constructor, so switching policy is configuration, not code change.</p>`,
        code: J.g3_sol,
        alt: ALT.g3_sol,
        complexity: `<p>Both strategies: O(F × T × S) worst case per allocation (F floors, T fitting types ≤ 3, S spots per floor). With free lists per (floor, type), O(F × T).</p>`,
        followUps: ['Add <code>NearestToGate</code> using distances from the gate the car entered', 'Make allocation O(1) with a free-spot deque per (floor, type)', 'Reserve 10% of LARGE spots for trucks only — strategy or decorator?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 4 — PARKING LOT: PARK / UNPARK FLOW, PRICING, CONCURRENCY
     ===================================================================== */
  var PF_LAYOUT = [['S', 'C', 'C', 'L'], ['S', 'C', 'L', 'L']];
  var PF_TYPE = { S: 'SMALL', C: 'COMPACT', L: 'LARGE' };
  var PF_FITS = { bike: ['S', 'C', 'L'], car: ['C', 'L'], truck: ['L'] };
  var PF_RATE = { bike: 10, car: 20, truck: 50 };
  var PF_NODES = [B('In', 'EntryGate', 10, 8), B('Out', 'ExitGate', 10, 30), B('Lot', 'ParkingLot', 35, 19),
    B('Alloc', 'AllocationStrategy', 64, 8), B('Price', 'PricingStrategy', 64, 30), B('Spot', 'ParkingSpot', 89, 19)];
  var PF_EDGES = [['In', 'Lot', 'park'], ['Out', 'Lot', 'unpark'], ['Lot', 'Alloc', 'findSpot'], ['Lot', 'Price', 'fee'], ['Lot', 'Spot', 'assign / release']];

  function pfFlow(kind) {
    if (kind === 'park') return G('Call flow', PF_NODES, PF_EDGES, { h: 38, hl: { In: 'cur', Lot: 'ok', Alloc: 'ok', Spot: 'ok' }, ehl: { 'In-Lot': 'ok', 'Lot-Alloc': 'ok', 'Lot-Spot': 'ok' } });
    if (kind === 'full') return G('Call flow', PF_NODES, PF_EDGES, { h: 38, hl: { In: 'cur', Lot: 'bad', Alloc: 'bad' }, ehl: { 'In-Lot': 'ok', 'Lot-Alloc': 'bad' }, tags: { Alloc: 'empty' } });
    if (kind === 'unpark') return G('Call flow', PF_NODES, PF_EDGES, { h: 38, hl: { Out: 'cur', Lot: 'ok', Price: 'ok', Spot: 'sel' }, ehl: { 'Out-Lot': 'ok', 'Lot-Price': 'ok', 'Lot-Spot': 'sel' } });
    if (kind === 'reject') return G('Call flow', PF_NODES, PF_EDGES, { h: 38, hl: { Out: 'cur', Lot: 'bad' }, ehl: { 'Out-Lot': 'bad' }, tags: { Lot: 'no ticket' } });
    return G('Call flow', PF_NODES, PF_EDGES, { h: 38 });
  }
  function pfClock(h) { var d = Math.floor(h / 24), hh = h % 24; return (d ? 'day ' + (d + 1) + ' ' : '') + (hh < 10 ? '0' : '') + hh + ':00'; }

  topics.push({
    title: 'Parking Lot, Part 2: The Park / Unpark Flow, Ticket Lifecycle, Pricing and Concurrency',
    analogy: `<p>A hotel cloakroom: you hand over your coat, the attendant hangs it on the first suitable free hook and gives you a numbered token. When you come back, the token is the <i>only</i> thing that matters — it tells them which hook, and once your coat is returned the token is dead. If two attendants grab the same empty hook for two coats at once, there is chaos.</p>
      <p>Parking is the same three-beat flow: <b>find a hook (spot) → hand a token (ticket) → redeem it exactly once (exit and pay)</b>, with care when several attendants (gates) work at once.</p>`,
    explain: `<p><b>Entry flow — <code>park(vehicle)</code></b>, step by step:</p>
      ${H.table(['#', 'Step', 'Who does it', 'Can fail?'], [
        ['1', 'Gate receives the vehicle and calls <code>lot.park(v)</code>', 'EntryGate', '—'],
        ['2', 'Reject if the same plate is already inside', 'ParkingLot', H.c('r', 'IllegalStateException')],
        ['3', 'Ask the strategy for a fitting free spot', 'SpotAllocationStrategy', H.c('r', 'empty → ParkingLotFullException')],
        ['4', 'Mark the spot taken (validates fit and emptiness again)', 'ParkingSpot.assign()', 'only if there is a bug'],
        ['5', 'Create the ticket with id, spot, vehicle, entry time', 'ParkingLot + TimeSource', '—'],
        ['6', 'Register the ticket; notify display boards', 'ParkingLot', '—']
      ])}
      <p><b>Exit flow — <code>unpark(ticketId)</code></b>:</p>
      ${H.table(['#', 'Step', 'Who does it'], [
        ['1', 'Look up and <b>remove</b> the active ticket (so it can never be used twice)', 'ParkingLot'],
        ['2', 'Compute the fee from entry time to now', 'PricingStrategy'],
        ['3', 'Collect payment (cash / card / UPI)', 'PaymentProcessor (strategy)'],
        ['4', 'Release the spot and notify listeners', 'ParkingSpot + observers'],
        ['5', 'Return a receipt; barrier opens', 'ExitGate']
      ])}
      <p><b>The ticket lifecycle is a tiny state machine:</b> ${H.arr(['ACTIVE', 'PAID', 'EXITED'], { hl: { 0: 'y', 1: 'b', 2: 'g' } })} Only ACTIVE → PAID → EXITED is legal. A real mall separates "pay at the machine" from "exit at the barrier", so the exit gate must check the state — the reference code for this topic enforces it in one method, <code>moveTo()</code>.</p>
      <p><b>Pricing worked example</b> (car, ₹20 per started hour, minimum 1 hour):</p>
      ${H.table(['Minutes parked', 'Started hours = ⌈min / 60⌉', 'Fee'], [['10', 'max(1, 1) = 1', '₹20'], ['60', '1', '₹20'], ['61', '2', '₹40'], ['150', '3', '₹60']])}
      <p><b>Concurrency in one sentence:</b> step 3 + step 4 of entry is a <i>check-then-act</i> ("is it free? then take it"), so it must be atomic. The simplest correct answer is one lock around <code>park</code>/<code>unpark</code> (<code>synchronized</code> / <code>threading.Lock</code> / <code>std::mutex</code>); the scalable answer is a thread-safe free-spot queue per type whose pop hands each spot to exactly one thread.</p>
      <p>Play with the visualizer: type your own sequence of arrivals, waits and exits, and watch the spot grid, the active-ticket map and the call flow change at each step.</p>`,
    clues: [
      '"Issue a ticket at entry and charge at exit" → ticket = the key linking vehicle, spot and time; remove it on exit so it cannot be reused',
      '"Pay at a machine, then exit" → ticket state machine ACTIVE → PAID → EXITED (State pattern if it grows)',
      '"Several entry gates" or "concurrent requests" → the find-then-assign step is a race; make it atomic',
      '"Lost ticket" → penalty fee + look up by plate; requires a plate → ticket index',
      '"Partial hours", "first 2 hours flat", "daily cap" → pricing rules as composable strategies / decorators',
      '"Real-time availability" → events to listeners (Observer) instead of polling every spot'
    ],
    code: J.t4_flow,
    alt: ALT.t4_flow,
    codeTitle: 'Entry → payment → exit with a ticket state machine, payment strategies and display listeners',
    viz: {
      title: 'Park and unpark, step by step, on a 2-floor lot',
      input: 'car bike truck car +2h out:1 truck truck car +1h out:3 truck truck',
      inputLabel: 'Events: car | bike | truck | +Nh (wait N hours) | out:N (exit with ticket TN)',
      gen: function (input) {
        var toks = words(input, 'Example: car bike truck +2h out:1', 24);
        var occ = PF_LAYOUT.map(function (row) { return row.map(function () { return null; }); });
        var tickets = {}, order = [], seq = 1, clock = 9, revenue = 0, frames = [];
        function grid(hl) {
          return { type: 'grid', label: 'Spots (S = SMALL, C = COMPACT, L = LARGE)', rowHead: ['Floor 0', 'Floor 1'], colHead: ['spot 0', 'spot 1', 'spot 2', 'spot 3'],
            rows: PF_LAYOUT.map(function (row, f) { return row.map(function (t, i) { var o = occ[f][i]; return o ? t + ' · ' + o.id + ' ' + o.v : t + ' · free'; }); }), hl: hl || {} };
        }
        function ticketMap(hlKey, cls) {
          var hl = {}; if (hlKey) hl[hlKey] = cls;
          return { type: 'map', label: 'activeTickets', entries: order.map(function (id) { var t = tickets[id]; return [id, t.v + ' @ F' + t.f + '-S' + t.i + ' since ' + pfClock(t.entry)]; }), hl: hl };
        }
        function free() {
          var c = { S: 0, C: 0, L: 0 };
          PF_LAYOUT.forEach(function (row, f) { row.forEach(function (t, i) { if (!occ[f][i]) c[t]++; }); });
          return c;
        }
        function vars(hlName) {
          var c = free();
          return VARS('Lot state', { clock: pfClock(clock), revenue: '₹' + revenue, freeSMALL: c.S, freeCOMPACT: c.C, freeLARGE: c.L }, hlName ? one(hlName, 'cur') : {});
        }
        frames.push(F('An empty lot: 2 floors × 4 spots. Strategy = <b>NearestFirst</b> (lowest floor first; on a floor, the smallest spot type that fits). Pricing = per started hour: bike ₹10, car ₹20, truck ₹50. The clock starts at 09:00.', [grid(), pfFlow('idle'), vars()]));
        toks.forEach(function (tk) {
          var veh = tk === 'c' ? 'car' : tk === 'b' ? 'bike' : tk === 't' ? 'truck' : tk;
          var wait = /^\+(\d+)h?$/.exec(tk), out = /^(?:out:?|-)t?(\d+)$/.exec(tk);
          if (PF_FITS[veh]) {
            var chosen = null, checked = {};
            for (var f = 0; f < PF_LAYOUT.length && !chosen; f++) {
              for (var k = 0; k < PF_FITS[veh].length && !chosen; k++) {
                for (var i = 0; i < PF_LAYOUT[f].length; i++) {
                  if (PF_LAYOUT[f][i] !== PF_FITS[veh][k]) continue;
                  if (occ[f][i]) { checked[f + ',' + i] = 'bad'; continue; }
                  chosen = [f, i]; break;
                }
              }
            }
            if (!chosen) {
              PF_LAYOUT.forEach(function (row, ff) { row.forEach(function (t, ii) { if (PF_FITS[veh].indexOf(t) >= 0) checked[ff + ',' + ii] = 'bad'; }); });
              frames.push(F('A <b>' + veh + '</b> arrives, but every spot it fits (' + PF_FITS[veh].map(function (t) { return PF_TYPE[t]; }).join(', ') + ') is taken. The strategy returns <code>Optional.empty()</code> and <code>park()</code> throws <span class="c-r">ParkingLotFullException</span>. No ticket, no state change — the display board would already show 0 for this type.', [grid(checked), pfFlow('full'), ticketMap(), vars()]));
              return;
            }
            var id = 'T' + seq++;
            occ[chosen[0]][chosen[1]] = { id: id, v: veh };
            tickets[id] = { v: veh, f: chosen[0], i: chosen[1], entry: clock };
            order.push(id);
            checked[chosen[0] + ',' + chosen[1]] = 'ok';
            var skipped = Object.keys(checked).length - 1;
            frames.push(F('A <b>' + veh + '</b> arrives at the entry gate. NearestFirst checks ' + (chosen[0] === 0 ? 'floor 0' : 'floors 0–' + chosen[0]) + ' for ' + PF_FITS[veh].map(function (t) { return PF_TYPE[t]; }).join(' → ') + (skipped ? ' (red = fitting but already taken)' : '') + ' and picks <span class="c-g">F' + chosen[0] + '-S' + chosen[1] + ' (' + PF_TYPE[PF_LAYOUT[chosen[0]][chosen[1]]] + ')</span>. <code>spot.assign()</code> runs, ticket <b>' + id + '</b> is issued at ' + pfClock(clock) + '.', [grid(checked), pfFlow('park'), ticketMap(id, 'ok'), vars()]));
          } else if (wait) {
            var hrs = parseInt(wait[1], 10);
            if (hrs < 1 || hrs > 48) throw new Error('Waits must be between +1h and +48h');
            clock += hrs;
            frames.push(F('Time passes: <b>+' + hrs + ' hour' + (hrs > 1 ? 's' : '') + '</b>. Nothing in the lot changes, but every active ticket is now worth more. (In code this is <code>FakeTime.advance()</code> — the injected TimeSource is what makes this testable.)', [grid(), pfFlow('idle'), ticketMap(), vars('clock')]));
          } else if (out) {
            var tid = 'T' + out[1], t = tickets[tid];
            if (!t) {
              frames.push(F('Exit gate receives ticket <b>' + tid + '</b>, but it is not in <code>activeTickets</code> (never issued, or already used). <code>unpark()</code> throws <span class="c-r">NoSuchElementException</span> and the barrier stays down. Removing tickets on exit is what blocks reuse fraud.', [grid(), pfFlow('reject'), ticketMap(), vars()]));
              return;
            }
            var hours = Math.max(1, clock - t.entry), fee = hours * PF_RATE[t.v];
            delete tickets[tid];
            order.splice(order.indexOf(tid), 1);
            occ[t.f][t.i] = null;
            revenue += fee;
            frames.push(F('Exit with <b>' + tid + '</b> (' + t.v + ', in since ' + pfClock(t.entry) + '). Ticket removed first, then PricingStrategy: max(1, ' + (clock - t.entry) + ') h × ₹' + PF_RATE[t.v] + ' = <span class="c-b">₹' + fee + '</span>. Spot <span class="c-p">F' + t.f + '-S' + t.i + '</span> is released and becomes the nearest candidate again.', [grid(one(t.f + ',' + t.i, 'sel')), pfFlow('unpark'), ticketMap(), vars('revenue')]));
          } else {
            throw new Error('Unknown event "' + tk + '". Use car, bike, truck, +2h or out:1');
          }
        });
        frames.push(F('End of the script. Revenue <b>₹' + revenue + '</b>, ' + order.length + ' vehicle(s) still inside. Notice what never happened: no if-else on vehicle type inside ParkingLot, no price formula in the gate, and no spot ever held two vehicles.', [grid(), ticketMap(), vars()]));
        return frames;
      }
    },
    examples: [
      {
        title: 'Trace of the default visualizer script',
        html: `${H.table(['Event', 'Decision', 'Result'], [
          ['car, bike, truck, car', 'F0: C→S1, S→S0, L→S3, C→S2', 'T1..T4 on floor 0'],
          ['+2h, out:1', 'car 2 h × ₹20', H.c('b', '₹40, F0-S1 free')],
          ['truck', 'F0 has no free LARGE → floor 1', H.c('g', 'T5 → F1-S2')],
          ['truck', 'F1-S3', 'T6'],
          ['car', 'F0-S1 is free again (nearest!)', 'T7 → F0-S1'],
          ['+1h, out:3', 'truck in since 09:00 → 3 h × ₹50', H.c('b', '₹150')],
          ['truck, truck', 'first takes F0-S3; second finds all LARGE taken', H.c('r', 'ParkingLotFullException')]
        ])}`
      },
      {
        title: 'Why remove the ticket BEFORE releasing the spot',
        html: `<p>If <code>unpark</code> first frees the spot and then crashes before removing the ticket, the same ticket could be used again while another car now sits in that spot. Ordering the steps "remove ticket → price → release spot" (all under one lock) keeps every intermediate state safe. In a database this whole block is one transaction.</p>
          ${H.chips(['remove ticket', 'compute fee', 'collect payment', 'release spot', 'notify'], { label: 'Safe order' })}`
      },
      {
        title: 'The pay-then-exit split (code above)',
        html: `${H.table(['Call', 'Ticket state before', 'Result'], [
          ['exit(T1) right after entering', 'ACTIVE', H.c('r', 'IllegalStateException: ACTIVE → EXITED not allowed')],
          ['pay(T1, +95 min, UPI)', 'ACTIVE', H.c('g', 'PAID, ₹80 (2 started hours × 40)')],
          ['exit(T1)', 'PAID', H.c('g', 'EXITED, spot A1 freed, screen notified')],
          ['pay(T1) again', 'EXITED', H.c('r', 'rejected')]
        ])}`
      },
      {
        title: 'Two gates, one free spot: the race made visible',
        html: `${H.table(['Time', 'Gate A thread', 'Gate B thread'], [
          ['t1', 'strategy finds F0-S2 free', ''],
          ['t2', '', 'strategy finds F0-S2 free'],
          ['t3', 'assign(car A) ✔', ''],
          ['t4', '', H.c('r', 'assign(car B) → second car in same spot (without lock)')]
        ])}<p>With a lock around <code>park()</code> (<code>synchronized</code> in Java), t2 cannot start until t3 finishes, so B sees the spot as taken. <code>ParkingSpot.assign()</code> also re-checks <code>isFree()</code> and throws — a second line of defence.</p>`
      }
    ],
    deepDive: `<p><b>Lock granularity choices.</b> ${H.table(['Approach', 'Throughput', 'Complexity', 'Notes'], [
        ['One lock on ParkingLot (<code>synchronized</code> / <code>threading.Lock</code> / <code>std::mutex</code>)', 'low under load', 'trivial', 'perfect for the interview default'],
        ['One lock per floor (<code>ReentrantLock</code> / <code>threading.Lock</code> / <code>std::mutex</code>)', 'medium', 'medium', 'strategy must lock floors in a fixed order to avoid deadlock'],
        ['Concurrent free queue per spot type', 'high', 'medium', 'the pop (<code>ConcurrentLinkedQueue.poll()</code>, <code>queue.SimpleQueue.get_nowait()</code>, or a mutex-guarded deque) is atomic; "nearest" becomes approximate'],
        ['Compare-and-set on the spot (<code>AtomicReference</code> / <code>std::atomic</code>)', 'high', 'medium', 'retry another spot on CAS failure'],
        ['Distributed (DB row lock / Redis)', 'scales across servers', 'high', 'each gate is a separate machine']
      ])}</p>
      <p><b>Idempotency at the gate.</b> Barrier hardware may resend "vehicle arrived" after a timeout. Use the plate (or a request id) to make <code>park</code> idempotent: if the plate already holds an active ticket, return that ticket instead of a new spot. The reference design throws; mention the idempotent alternative as a production improvement.</p>
      <p><b>Lost tickets.</b> Keep an index <code>plate → ticket</code>. Lost-ticket pricing is usually <code>max(normal fee, penalty)</code> — see the guided problem. Never let a lost ticket be cheaper than a found one, or people will "lose" tickets.</p>
      <p><b>Time edge cases.</b> Clock changes (daylight saving) are why a UTC instant (<code>Instant</code> / timezone-aware <code>datetime</code> / <code>std::chrono::system_clock</code>) beats a local date-time for durations. Midnight crossings matter for daily caps. Stays longer than 24 h need per-day caps applied per started day, not once.</p>
      <p><b>Events and eventual consistency.</b> Display boards updated by events can briefly disagree with reality (an event in flight). That is acceptable for a sign; it is <i>not</i> acceptable for allocation, which must read the authoritative state under the lock.</p>
      <p><b>Payments fail.</b> In real systems payment is a remote call that can time out. Do not hold the lot lock while calling a payment gateway; compute the fee, release the lock, charge, then mark the ticket PAID. If the gateway is unsure, the ticket stays ACTIVE and the driver retries — idempotency keys prevent double charges.</p>`,
    aiEra: `<p><b>What AI changes:</b> generating the happy-path flow is trivial for an assistant; the interview value has moved to <i>failure paths</i>: double exits, lost tickets, payment timeouts, two gates racing. Those are exactly the questions modern interviewers ask after you show working code.</p>
      <p><b>Use AI as a partner:</b> <code>List every way the park/unpark flow can fail and which class should detect each failure</code>, or <code>Write a multi-threaded test that parks 1000 cars from 8 threads into 500 spots and asserts no spot is used twice</code>. Run it — AI-written concurrency tests are a great way to catch your own races.</p>
      <p><b>Where AI goes wrong:</b> holding a lock across a payment call, sharing a plain hash map between threads without synchronisation, computing fees with <code>double</code>, or rounding hours down. It often frees the spot before invalidating the ticket.</p>
      <p><b>What you must still own:</b> the order of operations, the atomicity boundary, and the state machine. Be able to draw the race timeline from the examples on a whiteboard without help.</p>`,
    problems: [{
      title: 'Exit Flow: Slab Pricing, Daily Cap and Lost Tickets',
      level: 'Medium', tags: ['strategy', 'decorator', 'pricing'], companies: ['Amazon', 'Walmart', 'Paytm'],
      statement: `<p>Implement exit pricing: cars pay <b>₹30 for the first 2 hours</b>, then <b>₹20 per started hour</b>, capped at <b>₹200 per 24-hour day</b>; bikes and trucks have their own numbers. A <b>lost ticket</b> costs <code>max(normal fee, ₹500)</code>. New tariffs must be addable without editing existing ones.</p>`,
      constraints: `Durations up to 30 days. Money as <code>long</code> rupees. Partial hours round up; minimum 1 hour.`,
      example: `<p>Car 90 min → ${H.c('g', '₹30')} (inside the first block). Car 250 min = 5 started hours → ${H.c('g', '30 + 3×20 = ₹90')}. Car 30 h → day 1 capped ${H.c('b', '₹200')} + remaining 6 h = ${H.c('b', '₹110')} → ${H.c('g', '₹310')}. Lost ticket after 1 h → ${H.c('r', '₹500')}.</p>`,
      brute: { why: `<p>One <code>fee()</code> method with an if-else ladder per vehicle type, each repeating the slab arithmetic with different numbers. The cap is copy-pasted (and forgotten for trucks), multi-day stays are wrong (the cap is applied once, not per day), and adding a weekend tariff means another branch in every type.</p>`, code: J.g4_brute },
      mcq: { q: 'You need "₹200 cap per day" on top of ANY tariff. Which pattern composes best?', options: ['Inheritance: CappedSlabPricing extends SlabPricing', 'Decorator: DailyCap wraps any PricingStrategy', 'A boolean flag capEnabled in every strategy', 'Singleton PriceManager'], answer: 1, explain: 'A decorator implements the same interface and wraps another strategy, so the cap works on slab, hourly or flat pricing without new subclasses.' },
      hints: [
        `<p>Hint 1: separate "what does N hours cost?" (slab rule) from "never more than X per day" (cap rule). They change independently, so they are different classes.</p>`,
        `<p>Hint 2: <code>interface PricingStrategy { long fee(Duration d); }</code>; <code>SlabPricing</code> implements it; <code>DailyCap</code> also implements it and holds an inner strategy.</p>`,
        `<p>Hint 3: for a cap per started day: fullDays = hours / 24 → fullDays × cap + min(cap, inner.fee(remainder)). Lost ticket = <code>Math.max(normal, penalty)</code> in one place (a Tariff class mapping vehicle type → rule chain).</p>`
      ],
      tests: { io: true, cases: [{ stdin: "", stdout: "car 90 min -> 30\ncar 250 min -> 90\ncar 30 h -> 310\ncar 1 h lost ticket -> 500\ncar 24 h -> 200\ncar 47 h 59 min -> 400\ncar 0 min -> 30\nbike 5 h -> 25\nbike 12 h -> 60\ntruck 3 h -> 300\n" }] },
      solution: {
        approach: `<p>Model each rule as a <code>PricingStrategy</code>: <code>SlabPricing</code> for the hourly tariff and <code>DailyCap</code> as a decorator. A <code>Tariff</code> maps each <code>VehicleType</code> to its chain and applies the lost-ticket rule. A stay of exactly 24 h, 48 h, ... pays only its capped days, while a zero-length stay still pays the minimum first block. A weekend surcharge would be one more decorator — zero edits to existing classes.</p>`,
        code: J.g4_sol,
        alt: ALT.g4_sol,
        complexity: `<p>O(1) per fee calculation (a few arithmetic operations per decorator layer). Space O(vehicle types).</p>`,
        followUps: ['Add a <code>WeekendSurcharge</code> decorator (×1.5 on Saturday/Sunday entries)', 'Monthly pass holders pay 0 — where does that check go?', 'How would you show the driver an itemised receipt (slab, cap, penalty lines)?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 5 — TIC-TAC-TOE: FULL DESIGN + O(1) WIN DETECTION
     ===================================================================== */
  var TTT_COUNTER_CODE = [
    'int add = (player == X) ? +1 : -1;',
    'rows[r] += add;',
    'cols[c] += add;',
    'if (r == c) diag += add;',
    'if (r + c == n - 1) anti += add;',
    'int target = add * n;',
    'if (rows[r] == target || cols[c] == target',
    '    || diag == target || anti == target) return WON;',
    'return board.isFull() ? DRAW : IN_PROGRESS;'
  ].join('\n');

  topics.push({
    title: 'Tic-Tac-Toe: Full Object Design and O(1) Win Detection',
    analogy: `<p>Imagine a referee at a tic-tac-toe tournament who, after every move, walks around the whole board checking all eight lines. Tiring. A smarter referee keeps a <b>tally sheet</b>: one box per row, per column and per diagonal. When X plays in row 1, she adds a tick to "row 1 — X". The moment any box hits 3 ticks for one player, she blows the whistle. She never re-reads the board.</p>
      <p>That tally sheet is the O(1) win check. The rest of the design is about giving each role its own object: the <b>board</b> holds marks, the <b>players</b> choose moves, the <b>rules</b> decide wins, and the <b>game</b> keeps turn order.</p>`,
    explain: `<p><b>Step 1 — Clarify.</b> Board size: always 3×3 or N×N? Two players or more? Human only, or bots too? Should illegal moves be rejected or re-asked? Undo? (Answering "N×N, 2+ players, pluggable bots, reject illegal moves" makes the design interesting without bloating it.)</p>
      <p><b>Step 2–3 — Entities and APIs.</b></p>
      ${H.table(['Type', 'Kind', 'Responsibility', 'Key API'], [
        ['<code>Board</code>', 'class', 'cells, bounds and emptiness checks, "is full"', '<code>place(r, c, symbol)</code>, <code>isValid(r, c)</code>'],
        ['<code>Player</code>', 'interface', 'chooses a move (human, scripted, bot)', '<code>int[] chooseMove(Board b)</code>'],
        ['<code>Move</code>', 'record', 'who played where (history, undo, replay)', '—'],
        ['<code>WinningStrategy</code>', 'interface', 'decides if the last move wins', '<code>isWinningMove(board, move, p)</code>'],
        ['<code>GameStatus</code>', 'enum', 'IN_PROGRESS / WON / DRAW', '—'],
        ['<code>Game</code>', 'class', 'turn order, status, history; orchestrates', '<code>makeMove(r, c)</code>, <code>play()</code>, <code>winner()</code>']
      ])}
      <p><b>Step 4 — Diagram in words:</b> Game ◆ Board (composition), Game ◇ Player (aggregation — players exist outside one game), Game → WinningStrategy (uses), Game ◆ List&lt;Move&gt; (history).</p>
      <p><b>The win check, three ways:</b></p>
      ${H.table(['Approach', 'Work per move', 'N = 3', 'N = 1000'], [
        ['Rescan all rows, cols, diagonals', 'O(N²)', '9 cells', '1,000,000 cells'],
        ['Scan only the row, col and diagonals of the last move', 'O(N)', '~12 cells', '~4,000 cells'],
        [H.c('g', 'Counters per row / col / diagonal'), H.c('g', 'O(1)'), '4 additions', '4 additions']
      ])}
      <p><b>How the counters work (2 players):</b> X adds <b>+1</b>, O adds <b>−1</b> to <code>rows[r]</code>, <code>cols[c]</code>, and to <code>diag</code> if <code>r == c</code>, and <code>anti</code> if <code>r + c == n − 1</code>. A line is all-X exactly when its counter is <b>+n</b> and all-O when it is <b>−n</b>, because any O in the line pulls the sum below +n. For 3+ players, keep a separate counter array per player (the reference code does this).</p>
      <p>Worked example on 3×3: X plays (1,1) → rows[1]=1, cols[1]=1, diag=1, anti=1 (the centre is on both diagonals). Later X plays (0,2) → anti=2 and (2,0) → anti=3 = n → <b>X wins</b>, detected with four additions.</p>
      ${H.arr(['X', 'O', 'X', '·', 'X', '·', 'X', '·', '·'], { label: 'board row-major', hl: { 2: 'g', 4: 'g', 6: 'g' } })}`,
    clues: [
      '"Design Tic-Tac-Toe" / LeetCode 348 → counters per row/col/diagonal, O(1) per move',
      '"N × N board" or "large board" → never rescan; update counters or check only lines through the last move',
      '"Allow a computer player" → <code>Player</code> as an interface (Strategy); bot = minimax implementation',
      '"Undo last move" → keep a history of <code>Move</code> objects (Command pattern) and make counter updates reversible',
      '"K in a row" (Gomoku, Connect Four) → counters do not work directly; walk outward from the last move in 4 directions, O(K)',
      '"Validate a given board" (LeetCode 794) → reason with counts of X and O plus who has a line'
    ],
    code: J.TicTacToeDemo,
    alt: ALT.TicTacToeDemo,
    codeTitle: 'Complete N×N Tic-Tac-Toe (players as strategies, O(1) counter-based win check, history)',
    viz: {
      title: 'Tic-tac-toe board with live win-detection counters',
      input: '1,1 0,0 0,2 1,1 0,1 2,0',
      inputLabel: 'Moves "row,col" in turn order (X first). Optional first token n=4 for a 4×4 board.',
      gen: function (input) {
        var toks = String(input === undefined ? '' : input).trim().toLowerCase().replace(/\s*,\s*/g, ',').split(/[\s;]+/).filter(function (t) { return t.length; });
        if (!toks.length) throw new Error('Enter moves like: 1,1 0,0 0,2');
        if (toks.length > 40) throw new Error('Use at most 40 moves');
        var n = 3;
        if (/^n=\d+$/.test(toks[0])) { n = parseInt(toks.shift().slice(2), 10); }
        if (n < 3 || n > 6) throw new Error('Board size n must be between 3 and 6');
        if (!toks.length) throw new Error('Add at least one move like 1,1');
        var board = [], r, c;
        for (r = 0; r < n; r++) { board.push([]); for (c = 0; c < n; c++) board[r].push('·'); }
        var rows = [], cols = [], diag = 0, anti = 0, turn = 0, filled = 0, status = 'IN_PROGRESS', frames = [];
        for (var k = 0; k < n; k++) { rows.push(0); cols.push(0); }
        var SYM = ['X', 'O'];
        var idx = []; for (k = 0; k < n; k++) idx.push(String(k));
        function gridPart(hl, label) { return { type: 'grid', label: label || 'Board', rowHead: idx, colHead: idx, rows: board.map(function (row) { return row.slice(); }), hl: hl || {} }; }
        function counters(rh, ch) {
          return [
            { type: 'array', label: 'rows[] (X +1, O −1)', values: rows.slice(), hl: rh === undefined ? {} : one(rh, 'cur') },
            { type: 'array', label: 'cols[]', values: cols.slice(), hl: ch === undefined ? {} : one(ch, 'cur') }
          ];
        }
        frames.push(F('Empty ' + n + '×' + n + ' board. Instead of rescanning after each move, we keep <b>' + (2 * n + 2) + ' counters</b>: one per row, one per column, and two diagonals. A counter reaching <b>+' + n + '</b> means X owns that whole line; <b>−' + n + '</b> means O does.', [gridPart()].concat(counters(), [VARS('Diagonals and status', { diag: diag, anti: anti, target: '±' + n, status: status }), CODE('Per-move work: O(1)', TTT_COUNTER_CODE)])));
        for (var m = 0; m < toks.length; m++) {
          var mm = /^(\d+),(\d+)$/.exec(toks[m]);
          if (!mm) throw new Error('Bad move "' + toks[m] + '". Use row,col like 0,2');
          if (status !== 'IN_PROGRESS') {
            frames.push(F('Move ' + toks[m] + ' ignored: the game is already <b>' + status + '</b>. <code>makeMove()</code> throws <span class="c-r">IllegalStateException("Game is over")</span> — an invariant enforced in one place.', [gridPart()]));
            break;
          }
          r = parseInt(mm[1], 10); c = parseInt(mm[2], 10);
          var sym = SYM[turn];
          if (r >= n || c >= n || board[r][c] !== '·') {
            var why = (r >= n || c >= n) ? 'outside the board' : 'already taken by ' + board[r][c];
            frames.push(F('<b>' + sym + '</b> tries (' + r + ',' + c + ') — ' + why + '. <code>Board.place()</code> throws <span class="c-r">IllegalArgumentException</span>; the turn does <b>not</b> pass and no counter changes. ' + sym + ' must choose again.', [gridPart(r < n && c < n ? one(r + ',' + c, 'bad') : {})].concat(counters(), [VARS('Diagonals and status', { diag: diag, anti: anti, turn: sym, status: status }, { turn: 'bad' })])));
            continue;
          }
          var add = turn === 0 ? 1 : -1;
          board[r][c] = sym; filled++;
          rows[r] += add; cols[c] += add;
          var onD = r === c, onA = r + c === n - 1;
          if (onD) diag += add;
          if (onA) anti += add;
          var target = add * n, line = null;
          if (rows[r] === target) line = { kind: 'row ' + r, cells: idx.map(function (q) { return r + ',' + q; }) };
          else if (cols[c] === target) line = { kind: 'column ' + c, cells: idx.map(function (q) { return q + ',' + c; }) };
          else if (onD && diag === target) line = { kind: 'main diagonal', cells: idx.map(function (q) { return q + ',' + q; }) };
          else if (onA && anti === target) line = { kind: 'anti-diagonal', cells: idx.map(function (q) { return q + ',' + (n - 1 - q); }) };
          var codeHl = { 1: 'cur', 2: 'ok', 3: 'ok' };
          if (onD) codeHl[4] = 'ok';
          if (onA) codeHl[5] = 'ok';
          var touched = 'rows[' + r + ']=' + rows[r] + ', cols[' + c + ']=' + cols[c] + (onD ? ', diag=' + diag : '') + (onA ? ', anti=' + anti : '');
          if (line) {
            status = 'WON';
            codeHl[7] = 'sel'; codeHl[8] = 'sel';
            frames.push(F('<b>' + sym + '</b> plays (' + r + ',' + c + '): ' + touched + '. The ' + line.kind + ' counter hit <b>' + target + '</b> = ' + (add > 0 ? '+' : '−') + 'n, so every cell in it is ' + sym + '. <span class="c-g">' + sym + ' WINS</span> — found with ' + (2 + (onD ? 1 : 0) + (onA ? 1 : 0)) + ' additions and no board scan.', [gridPart(many(line.cells, 'sel'), 'Board — winning line')].concat(counters(r, c), [VARS('Diagonals and status', { diag: diag, anti: anti, target: target, status: status, winner: sym }, { status: 'ok', winner: 'ok' }), CODE('Per-move work: O(1)', TTT_COUNTER_CODE, codeHl)])));
          } else if (filled === n * n) {
            status = 'DRAW';
            codeHl[9] = 'sel';
            frames.push(F('<b>' + sym + '</b> plays (' + r + ',' + c + '): ' + touched + '. No counter reached ±' + n + ' and the board is full → <span class="c-y">DRAW</span>.', [gridPart(one(r + ',' + c, 'ok'))].concat(counters(r, c), [VARS('Diagonals and status', { diag: diag, anti: anti, status: status }, { status: 'cur' }), CODE('Per-move work: O(1)', TTT_COUNTER_CODE, codeHl)])));
          } else {
            frames.push(F('<b>' + sym + '</b> plays (' + r + ',' + c + '): update ' + touched + (onD && onA ? ' (the centre lies on <i>both</i> diagonals)' : '') + '. No counter equals ' + target + ', so the game goes on and the turn passes to ' + SYM[1 - turn] + '.', [gridPart(one(r + ',' + c, 'ok'))].concat(counters(r, c), [VARS('Diagonals and status', { diag: diag, anti: anti, target: target, next: SYM[1 - turn], status: status }, { next: 'cur' }), CODE('Per-move work: O(1)', TTT_COUNTER_CODE, codeHl)])));
            turn = 1 - turn;
          }
        }
        if (status === 'IN_PROGRESS') frames.push(F('Moves ran out with the game still <b>IN_PROGRESS</b>. Add more moves to finish it — or try <code>n=4</code> as the first token to see that nothing in the design changes for a bigger board.', [gridPart()].concat(counters())));
        return frames;
      }
    },
    examples: [
      {
        title: 'Dry run of the demo game in the code (X wins on the main diagonal)',
        html: `${H.table(['Move', 'Player', 'rows', 'cols', 'diag', 'anti', 'Result'], [
          ['(0,0)', 'X', '[1,0,0]', '[1,0,0]', '1', '0', 'continue'],
          ['(0,1)', 'O', '[0,0,0]', '[1,-1,0]', '1', '0', 'continue'],
          ['(1,1)', 'X', '[0,1,0]', '[1,0,0]', '2', '1', 'continue'],
          ['(0,2)', 'O', '[-1,1,0]', '[1,0,-1]', '2', '0', 'continue'],
          ['(2,2)', 'X', '[-1,1,1]', '[1,0,0]', H.c('g', '3'), '0', H.c('g', 'diag = +3 → X wins')]
        ])}<p>(In the code each player keeps its own counter arrays, which also works for 3+ players; the ±1 trick shown here is the 2-player shortcut.)</p>`
      },
      {
        title: 'Why a mixed line can never look like a win',
        html: `<p>Row 0 holds X, O, X → counter = +1 −1 +1 = <b>+1</b>. To reach +3 all three entries must be +1, i.e. all X. In general a line with any O has sum ≤ n − 2. So <code>counter == ±n</code> is exactly "the whole line belongs to one player" — no false positives.</p>
          ${H.arr(['X(+1)', 'O(−1)', 'X(+1)'], { label: 'row 0', hl: { 1: 'r' } })}`
      },
      {
        title: 'Validation lives in exactly one place',
        html: `${H.table(['Bad input', 'Caught by', 'Effect'], [
          ['(3,1) on 3×3', '<code>Board.isValid()</code>', 'exception; turn does not advance'],
          ['occupied cell', '<code>Board.isValid()</code>', 'exception; turn does not advance'],
          ['move after game over', '<code>Game.makeMove()</code> status check', 'IllegalStateException'],
          ['two players both "X"', '<code>Game</code> constructor', 'IllegalArgumentException'],
          ['board 2×2', '<code>Board</code> constructor', 'IllegalArgumentException']
        ])}`
      },
      {
        title: 'The same design for 3 players on 4×4',
        html: `<p>Nothing in <code>Game</code> mentions "2" or "3": players come in a list, turn is <code>(turn + 1) % players.size()</code>, and <code>CounterWinningStrategy</code> sizes its counters as <code>[players][n]</code>. A practice problem below adds spectators and replay on top of exactly this shape.</p>
          ${H.kv([['Board', 'new Board(4)'], ['Players', 'List.of(x, o, z)'], ['Counters', 'int[3][4] rows, cols']], { label: 'Config' })}`
      }
    ],
    deepDive: `<p><b>Why <code>Player</code> is an interface, not a class that reads the console.</b> Reading console input (<code>Scanner</code> / <code>input()</code> / <code>std::cin</code>) inside the model makes the game untestable and ties it to a console. With <code>chooseMove(Board)</code>, a <code>ConsolePlayer</code>, a <code>ScriptedPlayer</code> (tests), a <code>MinimaxBot</code> and a <code>NetworkPlayer</code> are all equal citizens. The <code>Game</code> stays unaware of where moves come from.</p>
      <p><b>Short-circuit trap in counter updates.</b> <code>if (++rows[p][r] == n) return true;</code> returns before incrementing the column and diagonal counters. That is fine when a win ends the game, but <b>wrong</b> if you later add undo (counters drift). For reversible designs, update all counters first, then test — the undo guided problem shows this.</p>
      <p><b>Draw detection.</b> "Board full" is the simplest draw rule. An expert follow-up: detect an <i>inevitable</i> draw early — a line is "dead" once it contains two different symbols; when all 2n+2 lines are dead, no one can win. Track a per-line set of symbols present (or a bitmask) in O(1) per move.</p>
      <p><b>K-in-a-row generalisation.</b> When the win needs K &lt; N in a row (Gomoku: 5 on 15×15), whole-line counters no longer work. Walk outward from the last move in 4 directions and count consecutive same symbols, O(K) per move — still independent of board size.</p>
      <p><b>Immutability and history.</b> <code>Move</code> as a record makes history safe to expose. <code>Game.history()</code> returns an unmodifiable view so callers cannot rewrite the past. History enables replay, undo, and network sync (send moves, not boards).</p>
      <p><b>Game theory note.</b> 3×3 tic-tac-toe has 5,478 legal positions and is a forced draw with perfect play — which is why a minimax bot (practice problem) never loses and why interviewers like it as a "plug in an AI player" follow-up.</p>`,
    aiEra: `<p><b>What AI changes:</b> an assistant will produce a working 3×3 console game instantly — usually with console input read inside the game loop, a hard-coded 3, and an 8-line win check. Interviewers now jump straight to "make it N×N with 3 players and a bot" to see whether the structure bends or breaks.</p>
      <p><b>Use AI as a partner:</b> <code>Generate 10 tricky tic-tac-toe move sequences: illegal moves, wins on the last cell, anti-diagonal wins on 4x4</code>, then run them through your design. Ask it to write the minimax bot <i>after</i> you have defined the <code>Player</code> interface, so it fits your design rather than dictating one.</p>
      <p><b>Where AI goes wrong:</b> forgets that the centre lies on both diagonals, checks the anti-diagonal with <code>r == n - c</code> (off by one), lets the turn advance after an illegal move, or detects a draw before checking a win on the final move.</p>
      <p><b>What you must still own:</b> the responsibility split (Board vs Game vs rules vs players), the O(1) argument and its proof, and the invariants. Be ready to explain why a mixed line can never reach ±n.</p>`,
    problems: [{
      title: 'Design Tic-Tac-Toe: O(1) per Move (LeetCode 348)',
      level: 'Medium', tags: ['design', 'counting', 'matrix'], companies: ['Google', 'Microsoft', 'Amazon', 'Meta'],
      statement: `<p>Design a class <code>TicTacToe(int n)</code> with <code>int move(int row, int col, int player)</code> where player is 1 or 2. Moves are guaranteed valid (empty cell, game not over). Return the winning player's number if this move wins, otherwise 0. Aim for better than O(n²) per move.</p>`,
      constraints: `2 ≤ n ≤ 100; player ∈ {1, 2}; at most n² calls; every move is on an empty cell.`,
      example: `<p>n = 3: moves (0,0,1) (0,2,2) (2,2,1) (1,1,2) (2,0,1) (1,0,2) (2,1,1) → outputs ${H.c('m', '0 0 0 0 0 0')} ${H.c('g', '1')}. The last move completes row 2 = 1, 1, 1 → rows[2] reaches +3.</p>`,
      brute: { why: `<p>Store the board and, after each move, rescan every row, column and both diagonals: O(n²) per move and O(n⁴) for a whole game. For n = 100 that is 10,000 cells per move. Even the "check only the last move's lines" improvement is O(n).</p>`, code: J.g5_brute },
      mcq: { q: 'Player 1 adds +1 and player 2 adds −1 to rows[r]. Why does rows[r] == n prove row r is all player 1?', options: ['Because n is odd', 'Because any player-2 cell lowers the sum below n, and the row has only n cells', 'Because rows are checked left to right', 'It does not prove it'], answer: 1, explain: 'Each of the n cells contributes at most +1; reaching exactly n needs every cell to be +1, i.e. player 1.' },
      hints: [
        `<p>Hint 1: you never need to know <i>which</i> cells are in a row — only whether one player owns all of them. A running sum can tell you that.</p>`,
        `<p>Hint 2: arrays <code>rows[n]</code>, <code>cols[n]</code> and two ints <code>diag</code>, <code>anti</code>. Player 1 adds +1, player 2 adds −1.</p>`,
        `<p>Hint 3: a cell is on the main diagonal if <code>row == col</code>, on the anti-diagonal if <code>row + col == n − 1</code> (the centre of an odd board is on both). After updating, compare each touched counter with <code>±n</code>.</p>`
      ],
      tests: { io: true, cases: [{ stdin: "", stdout: "0 0 0 0 0 0 1\n0 0 0 0 0 2\n0 0 0 0 0 0 1\n0 0 0 0 0 0 0 0 0\n1\n" }] },
      solution: {
        approach: `<p>Keep 2n + 2 running sums. Each move updates at most 4 of them and compares them with the target (+n or −n). No board needed at all — that is the surprising part interviewers enjoy.</p>`,
        code: J.g5_sol,
        alt: ALT.g5_sol,
        complexity: `<p>Time O(1) per move. Space O(n) for the counters (no O(n²) board).</p>`,
        followUps: ['Support 3+ players (counter arrays per player)', 'Detect an inevitable draw early', 'Make it K-in-a-row on an R×C board — why do counters stop working?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 6 — EXTENSIBILITY: FOLLOW-UPS, PATTERNS, MACHINE-CODING ROUNDS
     ===================================================================== */
  var EXT_BASE = {
    ttt: {
      name: 'Tic-Tac-Toe',
      nodes: [B('Game', 'Game', 45, 8), B('Board', 'Board', 12, 28), B('Player', '«I» Player', 45, 28), B('Win', '«I» WinningStrategy', 80, 28),
        B('Human', 'HumanPlayer', 34, 48), B('Counter', 'CounterWinStrategy', 86, 48)],
      edges: [['Game', 'Board', 'owns'], ['Game', 'Player', '2..*'], ['Game', 'Win', 'uses'], ['Human', 'Player', 'implements'], ['Counter', 'Win', 'implements']]
    },
    pl: {
      name: 'Parking Lot',
      nodes: [B('Lot', 'ParkingLot', 45, 8), B('Alloc', '«I» AllocationStrategy', 16, 28), B('Spot', 'ParkingSpot', 47, 28), B('Price', '«I» PricingStrategy', 80, 28),
        B('Nearest', 'NearestFirst', 16, 48), B('ST', 'enum SpotType', 47, 48), B('Hourly', 'HourlyPricing', 88, 48)],
      edges: [['Lot', 'Alloc', 'uses'], ['Lot', 'Spot', '1..*'], ['Lot', 'Price', 'uses'], ['Nearest', 'Alloc', 'implements'], ['Spot', 'ST'], ['Hourly', 'Price', 'implements']]
    }
  };
  var EXT_REQS = {
    bot: { base: 'ttt', req: '"Let me play against the computer."', axis: 'who chooses moves', touch: 'Player', node: B('New', 'MinimaxBot', 55, 66), edge: ['New', 'Player', 'implements'], pattern: 'Strategy', added: 1, edited: 0,
      code: 'class MinimaxBot implements Player {\n  public int[] chooseMove(Board b) {\n    // try every free cell, score it with minimax,\n    // return the best one\n    return bestMove(b);\n  }\n}' },
    kinarow: { base: 'ttt', req: '"Now play 5-in-a-row on a 15×15 board."', axis: 'what counts as a win', touch: 'Win', node: B('New', 'KInARowStrategy', 62, 66), edge: ['New', 'Win', 'implements'], pattern: 'Strategy', added: 1, edited: 0,
      code: 'class KInARowStrategy implements WinningStrategy {\n  public boolean isWinningMove(Board b, Move m, int p) {\n    // walk 4 directions from the last move,\n    // count same symbols: O(K)\n    return longestRunThrough(b, m) >= k;\n  }\n}' },
    undo: { base: 'ttt', req: '"Add undo for the last move."', axis: 'reversing history', touch: 'Game', node: B('New', 'MoveCommand', 12, 48), edge: ['Game', 'New', 'undo stack'], pattern: 'Command', added: 1, edited: 1,
      code: 'class MoveCommand implements Command {\n  public void execute() { board.apply(r, c, p, +1); }\n  public void undo()    { board.apply(r, c, p, -1); }\n}\n// Game: Deque<MoveCommand> history; undo() pops one' },
    scoreboard: { base: 'ttt', req: '"Show a live scoreboard and log every move." (Scoreboard implements a new GameListener interface)', axis: 'who reacts to game events', touch: 'Game', node: B('New', 'Scoreboard', 12, 66), edge: ['Game', 'New', 'notifies'], pattern: 'Observer', added: 2, edited: 1,
      code: 'interface GameListener {\n  void moved(char who, int r, int c);\n  void ended(String result);\n}\nclass Scoreboard implements GameListener { /* counts wins */ }' },
    ev: { base: 'pl', req: '"Add EV spots with a per-kWh charging fee."', axis: 'how money is computed', touch: 'Price', node: B('New', 'ChargingAddOn', 66, 66), edge: ['New', 'Price', 'wraps'], pattern: 'Decorator', added: 1, edited: 1,
      code: 'class ChargingAddOn implements PricingStrategy {\n  private final PricingStrategy inner;\n  public long fee(Ticket t, Instant out) {\n    return inner.fee(t, out) + kwh(t) * perKwh;\n  }\n}\n// + EV constant in enum SpotType (data, not logic)' },
    weekend: { base: 'pl', req: '"Weekends cost 1.5×."', axis: 'how money is computed', touch: 'Price', node: B('New', 'WeekendSurcharge', 66, 66), edge: ['New', 'Price', 'wraps'], pattern: 'Decorator', added: 1, edited: 0,
      code: 'class WeekendSurcharge implements PricingStrategy {\n  private final PricingStrategy inner;\n  public long fee(Ticket t, Instant out) {\n    long base = inner.fee(t, out);\n    return isWeekend(t) ? base * 3 / 2 : base;\n  }\n}' },
    gates: { base: 'pl', req: '"Give each driver the spot nearest to the gate they entered."', axis: 'which spot to choose', touch: 'Alloc', node: B('New', 'NearestToGate', 36, 66), edge: ['New', 'Alloc', 'implements'], pattern: 'Strategy', added: 1, edited: 0,
      code: 'class NearestToGate implements SpotAllocationStrategy {\n  // one min-heap of free spots per gate,\n  // ordered by distance; lazy deletion\n  public Optional<ParkingSpot> findSpot(floors, type)\n  // -> poll the heap of the entry gate\n}' },
    reserve: { base: 'pl', req: '"Allow booking a spot in advance for a time window."', axis: 'spot availability over time', touch: 'Spot', node: B('New', 'ReservationService', 24, 66), edge: ['New', 'Spot', 'calendar per spot'], pattern: 'new service + interval TreeMap', added: 2, edited: 1,
      code: 'class SpotCalendar {\n  TreeMap<Integer, Integer> booked; // start -> end\n  boolean isFree(int s, int e) { /* floor + ceiling */ }\n}\n// ParkingLot.park() honours a reservation id' }
  };

  topics.push({
    title: 'Extending the Design: Follow-ups, Patterns that Earn Their Place, and Machine-Coding Rounds',
    analogy: `<p>A well-designed kitchen has <b>standard sockets</b>. When you buy a new air-fryer you plug it in — you do not rewire the house. A badly designed kitchen has every appliance hard-wired into the wall; a new toaster means calling an electrician and switching off the fridge.</p>
      <p>Interfaces in your design are those sockets. The follow-up questions at the end of an LLD round ("add a bot", "add EV spots", "add undo") are the interviewer handing you a new appliance to see whether you have sockets or wires.</p>`,
    explain: `<p><b>The extensibility checklist.</b> For every follow-up, answer three questions out loud:</p>
      ${H.table(['Question', 'Example: "add a computer player"', 'Example: "weekend pricing"'], [
        ['1. What is the <b>axis of change</b>?', 'who chooses moves', 'how money is computed'],
        ['2. Which existing <b>abstraction</b> absorbs it?', '<code>Player</code> interface', '<code>PricingStrategy</code>'],
        ['3. What is the <b>change set</b>?', '+1 class (MinimaxBot), 0 edits', '+1 decorator, 0 edits']
      ])}
      <p>If question 2 has no answer, you found a missing abstraction — introduce it now (that is fine and shows judgement), then plug the feature in.</p>
      <p><b>Patterns mapped to follow-ups</b> you will meet in these two problems:</p>
      ${H.table(['Follow-up', 'Pattern', 'Why it fits'], [
        ['bot player, new allocation rule, new tariff', '<b>Strategy</b>', 'swap an algorithm behind one interface'],
        ['weekend surcharge, daily cap, EV charging on top of a tariff', '<b>Decorator</b>', 'stack behaviours without subclass explosion'],
        ['undo / redo / replay', '<b>Command</b> (+ history)', 'each move knows how to execute and undo itself'],
        ['display board, scoreboard, audit log', '<b>Observer</b>', 'many listeners, publisher does not know them'],
        ['ticket ACTIVE → PAID → EXITED, game IN_PROGRESS → WON', '<b>State</b>', 'behaviour depends on state; illegal transitions rejected'],
        ['configuring size, players, rules', '<b>Builder</b>', 'many optional parameters, readable setup'],
        ['creating spots/floors from a layout file', '<b>Factory</b>', 'hide construction details'],
        ['CLI commands in machine coding', '<b>Command</b> map', 'new command = new class + 1 registration']
      ])}
      <p><b>Patterns that usually do NOT earn their place here:</b> Singleton (blocks multiple lots/games and parallel tests — prefer one instance created in <code>main</code> and passed in), Abstract Factory (one product family only), Visitor (too heavy for a few types).</p>
      <p><b>The machine-coding round</b> (60–120 minutes, runnable code, often evaluated by running it):</p>
      ${H.table(['Minute', 'Do this'], [
        ['0–10', 'Read the problem twice; list commands/use cases; ask about input format and edge cases'],
        ['10–20', 'Entities + interfaces on paper; decide in-memory structures (maps, sorted sets or heaps, queues)'],
        ['20–70', 'Code models → services → command parser → <code>main()</code>; run after every feature'],
        ['70–85', 'Edge cases: invalid commands, full lot, duplicates, empty results; never crash on bad input'],
        ['85–90', 'Clean names, remove dead code, explain extension points in a short note']
      ])}
      <p>Evaluators look for: <b>it runs</b>, correct output for their hidden test file, separation of input parsing from domain logic, no God class, and readable code. The visualizer shows several follow-ups plugged into both designs.</p>`,
    clues: [
      '"How would you add ___?" → name the axis of change, the abstraction that absorbs it, and the exact change set (+N classes, M edits)',
      '"Undo", "replay", "history" → Command objects stored in a stack or log',
      '"Notify", "display", "subscribe", "real-time board" → Observer',
      '"On top of", "plus a surcharge", "and also cap it" → Decorator over the existing strategy',
      '"Machine coding", "input from a file of commands", "output must match" → parser → Command map → domain services; never let one bad line crash the run',
      '"Configurable board size / players / rules" → Builder or a config object, not a 7-argument constructor'
    ],
    code: J.t6_extend,
    alt: ALT.t6_extend,
    codeTitle: 'Three follow-ups (bot, K-in-a-row, scoreboard) plugged into one Game via interfaces + a Builder',
    viz: {
      title: 'Plugging follow-up requirements into the design',
      input: 'bot kinarow undo ev weekend',
      inputLabel: 'Follow-ups: bot | kinarow | undo | scoreboard | ev | weekend | gates | reserve',
      gen: function (input) {
        var reqs = words(input, 'Try: bot kinarow undo ev', 8);
        reqs.forEach(function (r) { if (!EXT_REQS[r]) throw new Error('Unknown follow-up "' + r + '". Use bot, kinarow, undo, scoreboard, ev, weekend, gates or reserve'); });
        var frames = [], added = 0, edited = 0, rows = [];
        frames.push(F('Two finished designs. Every <b>«I»</b> box is a socket — an interface where new behaviour can plug in. Each follow-up below gets three questions: <i>what is the axis of change? which socket absorbs it? what is the change set?</i>', [
          G('Tic-Tac-Toe design', EXT_BASE.ttt.nodes, EXT_BASE.ttt.edges, { h: 56, hl: { Player: 'sel', Win: 'sel' } }),
          G('Parking Lot design', EXT_BASE.pl.nodes, EXT_BASE.pl.edges, { h: 56, hl: { Alloc: 'sel', Price: 'sel' } })
        ]));
        reqs.forEach(function (r) {
          var x = EXT_REQS[r], base = EXT_BASE[x.base];
          var hl = many(base.nodes.map(function (n) { return n.id; }), 'done');
          hl[x.touch] = 'cur';
          frames.push(F('<b>' + base.name + ' follow-up:</b> ' + x.req + ' Axis of change: <b>' + x.axis + '</b>. Which existing box owns that decision? → <span class="c-y">' + base.nodes.filter(function (n) { return n.id === x.touch; })[0].label + '</span>.', [
            G(base.name + ': find the socket', base.nodes, base.edges, { h: 56, hl: hl, tags: one(x.touch, 'absorbs it') })
          ]));
          added += x.added; edited += x.edited;
          var hl2 = many(base.nodes.map(function (n) { return n.id; }), 'done');
          hl2.New = 'ok'; hl2[x.touch] = x.edited ? 'cur' : 'done';
          var maxY = x.node.y > 66 ? 90 : 76;
          frames.push(F('Plug in <span class="c-g">' + x.node.label + '</span> (' + x.pattern + '). Change set: <b>+' + x.added + ' class' + (x.added > 1 ? 'es' : '') + '</b>, <b>' + x.edited + ' existing class' + (x.edited === 1 ? '' : 'es') + ' edited</b>' + (x.edited ? ' — honest note: this follow-up needs a small hook in the owner class the first time (a history stack / listener list), after which similar features are free.' : ' — the existing classes are not touched at all.'), [
            G(base.name + ': after the change', base.nodes.concat([x.node]), base.edges.concat([x.edge]), { h: maxY, hl: hl2, ehl: one(x.edge[0] + '-' + x.edge[1], 'ok'), tags: { New: 'NEW' } }),
            CODE('The new code (sketch)', x.code, { 1: 'ok' }),
            VARS('Running change cost', { classesAdded: added, classesEdited: edited }, { classesAdded: 'ok' })
          ]));
          rows.push([r, base.name, x.pattern, '+' + x.added, String(x.edited)]);
        });
        frames.push(F('Summary. Most follow-ups were <b>pure additions</b>. The few edits were one-time hooks (an undo stack, a listener list). This table is exactly the answer an interviewer hopes to hear when they ask "how extensible is your design?"', [
          TABLE('Follow-up scorecard', ['Request', 'Design', 'Pattern', 'Classes added', 'Classes edited'], rows.concat([['TOTAL', '', '', '+' + added, String(edited)]]), one(rows.length, 'sel'))
        ]));
        return frames;
      }
    },
    examples: [
      {
        title: 'Follow-up answered well vs badly: "add a computer player"',
        html: `${H.table(['Answer', 'What the interviewer hears'], [
          [H.c('r', '"I\'ll add an isComputer flag to Game and an if in the loop."'), 'Game now knows about bots; next "network player" adds another flag. Closed for extension.'],
          [H.c('g', '"Player is already an interface. MinimaxBot implements chooseMove(). Game is unchanged; I pass the bot in the players list."'), 'Clean Strategy usage; zero edits; testable bot in isolation.']
        ])}`
      },
      {
        title: 'Decorator vs subclass for stacking pricing rules',
        html: `<p>Tariffs: hourly or flat. Add-ons: EV charging, valet, weekend surcharge. With subclasses you need a class per combination: 2 × 2<sup>3</sup> = <b>16 classes</b>. With decorators you need <b>2 + 3 = 5</b> and compose at runtime:</p>
          ${H.chips(['new WeekendSurcharge(', 'new ChargingAddOn(', 'new HourlyPricing(20)', '))'], { label: 'composition' })}
          <p>The practice problem "EV Charging Add-on" builds exactly this.</p>`
      },
      {
        title: 'A mini machine-coding problem, scoped in 2 minutes',
        html: `<p>Prompt: <i>"Build a parking-lot CLI: create_parking_lot N, park PLATE COLOUR, leave SLOT, status, registration_numbers_for_cars_with_colour C, slot_number_for_registration_number P."</i></p>
          ${H.table(['Decision', 'Choice'], [
            ['nearest free slot', 'sorted set or min-heap of free slots (<code>TreeSet</code> + <code>pollFirst()</code>, <code>heapq</code>, <code>std::set</code>) → take the smallest, O(log n)'],
            ['colour queries', '<code>Map&lt;colour, sorted set of slots&gt;</code> — sorted output for free'],
            ['plate lookup', '<code>Map&lt;plate, slot&gt;</code>'],
            ['commands', 'Command map: name → handler class; unknown command prints an error, never crashes'],
            ['domain vs I/O', '<code>Garage</code> knows nothing about text; handlers translate']
          ])}<p>Full solution in the Hard practice problem "Machine Coding: Parking Lot Command Interpreter".</p>`
      },
      {
        title: 'Undo done right (guided problem below)',
        html: `<p>Snapshots (copy the whole board each move) cost O(n²) memory per move. A <code>MoveCommand</code> stores only (row, col, player) and reverses its own counter updates: O(1) per move. Rule: a new move after undo clears the redo stack — otherwise redo would resurrect a future that no longer exists.</p>
          ${H.table(['Action', 'undo stack', 'redo stack'], [['play A, B, C', '[A, B, C]', '[]'], ['undo', '[A, B]', '[C]'], ['play D', '[A, B, D]', H.c('r', '[] (C discarded)')]])}`
      }
    ],
    deepDive: `<p><b>Open/Closed is a budget, not a law.</b> No design is closed against every change. You choose which axes to protect based on the requirements and the interviewer's hints. Protecting the wrong axis (say, abstracting the board's storage format) costs complexity and buys nothing. Say explicitly: "I expect pricing and allocation to change, so those are interfaces; the floor layout is configuration."</p>
      <p><b>Configuration over code.</b> Many "extensions" are really data: rates per vehicle type, spot layout per floor, board size, K. Put these in constructors/config objects (or enum fields) instead of new classes. Reserve new classes for new <i>behaviour</i>.</p>
      <p><b>Dependency injection by hand.</b> In interviews, wire everything in <code>main()</code>: <code>new ParkingLot(floors, new NearestFirstStrategy(), new DailyCap(new HourlyPricing(rates), 200), clock)</code>. This "composition root" is where all decisions about concrete classes live; the rest of the code depends on interfaces. Mention that Spring or Guice does the same in production.</p>
      <p><b>Event sourcing lite.</b> Storing moves (or parking events) as an append-only log gives undo, replay, audit and debugging for free: current state = fold over the events. The Hard practice problem builds a replayable multi-player game this way. Trade-off: rebuilding state can be slow — add periodic snapshots.</p>
      <p><b>Testing extensibility.</b> A good sign: every new strategy can be unit-tested without constructing a whole lot or game. If testing <code>WeekendSurcharge</code> needs a <code>ParkingLot</code>, the abstraction leaks.</p>
      <p><b>Machine-coding failure modes.</b> (1) Spending 40 minutes on input parsing; (2) no runnable state at minute 60; (3) one huge <code>Main</code> with a switch; (4) crashing on the first malformed line; (5) mutable public fields everywhere. Fix: get an end-to-end thin slice running first (create + park + leave), then widen.</p>`,
    aiEra: `<p><b>What AI changes:</b> many companies now allow AI tools in machine-coding rounds or take-homes, and judge you on <i>direction</i>: did you define the interfaces, did you catch the assistant's mistakes, can you extend the code live? Follow-up questions are where human design judgement shows most clearly.</p>
      <p><b>Use AI as a partner:</b> give it your interfaces and ask <code>Implement a WeekendSurcharge decorator for this PricingStrategy interface, with unit tests for Friday 23:59 and Saturday 00:00 entries</code>. Ask <code>Which of my classes would need edits to support reservations?</code> to stress-test your Open/Closed claims.</p>
      <p><b>Where AI goes wrong:</b> it adds features by editing the central class (flags and if-else), creates subclasses for every combination, or introduces patterns with no requirement behind them. In CLI machine-coding it often mixes parsing with domain logic in one method.</p>
      <p><b>What you must still own:</b> the axes of change, the composition root, and the honest change-set accounting ("+1 class, 0 edits"). The interviewer will ask you to make the change live — it is your structure that makes that fast.</p>`,
    problems: [{
      title: 'Add Undo / Redo to Tic-Tac-Toe with the Command Pattern',
      level: 'Medium', tags: ['command', 'stack', 'undo'], companies: ['Microsoft', 'Adobe', 'Atlassian'],
      statement: `<p>Extend Tic-Tac-Toe with <code>undo()</code> and <code>redo()</code>. Undo must restore the board, the turn, the game-over flag <b>and</b> the O(1) win-check counters exactly. A new move after an undo clears the redo history. Undo of a winning move re-opens the game.</p>`,
      constraints: `n ≤ 100, up to n² moves. undo/redo must be O(1). Return <code>false</code> when there is nothing to undo/redo.`,
      example: `<p>X(0,0) O(1,0) X(0,1) O(1,1) X(0,2) → ${H.c('g', 'X wins')}. <code>undo()</code> → row 0 becomes ${H.c('y', 'XX.')} and the game is open, still X to move. X plays (2,2) → ${H.c('b', 'ok')}. <code>redo()</code> → ${H.c('r', 'false')} (the redo branch was discarded).</p>`,
      brute: { why: `<p>Copy the whole board before each move and pop a snapshot on undo. It restores the cells, but costs O(n²) time and memory per move, and it does <b>not</b> restore the counters, turn or game-over flag — after an undo the win check is silently wrong unless you rescan everything.</p>`, code: J.g6_brute },
      mcq: { q: 'Why must the counter-update code avoid early returns once undo exists?', options: ['Early returns are slower', 'If the row check returns before the column/diagonal counters are incremented, undo (which decrements all of them) leaves counters wrong', 'The language forbids it', 'It breaks redo only'], answer: 1, explain: 'execute() and undo() must be exact mirrors. Update every counter, then check for a win.' },
      hints: [
        `<p>Hint 1: a move is fully described by (row, col, player). If applying it is "+1 to some counters and write a symbol", undoing it is "−1 to the same counters and clear the cell".</p>`,
        `<p>Hint 2: <code>interface Command { void execute(); void undo(); }</code>; <code>MoveCommand</code> calls <code>board.apply(r, c, p, sym, +1 / −1)</code>. Keep two <code>Deque&lt;MoveCommand&gt;</code>: undo and redo.</p>`,
        `<p>Hint 3: play → execute, push undo, clear redo. undo → pop, undo(), push redo, then fix turn/over: if the game was over, re-open it and keep the turn with the winner; otherwise flip the turn back. redo mirrors this.</p>`
      ],
      tests: { io: true, cases: [{ stdin: "", stdout: "X wins\ngame over - undo first\nXX.\nok\nfalse\ntrue true\ntrue OO.\noccupied\nfalse\nX wins\ntrue XXX\ngame over - undo first\n" }] },
      solution: {
        approach: `<p>Each move becomes a <code>MoveCommand</code> that can apply or reverse itself in O(1). The game keeps undo/redo stacks. All counters are updated unconditionally (no early return), which makes reversal exact. Turn and game-over handling live in <code>UndoableGame</code>, the one class that owns turn order.</p>`,
        code: J.g6_sol,
        alt: ALT.g6_sol,
        complexity: `<p>play / undo / redo: O(1) time. Memory O(moves) — a few ints per move instead of an n×n snapshot.</p>`,
        followUps: ['Limit undo to the last 3 moves (bounded deque)', 'Undo in a networked game: who is allowed to undo?', 'Replace stacks with an event log + cursor to support "jump to move k"']
      }
    }]
  });

  /* =====================================================================
     PRACTICE — EASY
     ===================================================================== */
  practice.push({
    title: 'Vehicle–Spot Fit Rules with an Ordered Enum',
    level: 'Easy', tags: ['enum', 'modelling', 'parking lot'], companies: ['Amazon', 'Flipkart'],
    statement: `<p>Model spot sizes and vehicle types so that <code>canPark(spotType)</code> works for every vehicle, and <code>fits()</code> lists the usable spot types smallest-first. Adding a new vehicle type (e.g. BUS needing LARGE) must be a one-line change.</p>`,
    constraints: `Spot sizes are ordered SMALL &lt; COMPACT &lt; LARGE. A vehicle fits any spot at least as big as its minimum.`,
    example: `<p><code>CAR.canPark(SMALL)</code> → ${H.c('r', 'false')}; <code>CAR.canPark(LARGE)</code> → ${H.c('g', 'true')}; <code>BIKE.fits()</code> → ${H.c('b', '[SMALL, COMPACT, LARGE]')}; <code>TRUCK.fits()</code> → ${H.c('b', '[LARGE]')}.</p>`,
    brute: { why: `<p>String comparisons in a static helper: <code>"Car"</code> vs <code>"CAR"</code> silently returns false, the rule is duplicated wherever someone needs it, and a new type means editing an if-chain.</p>`, code: J.p01_brute },
    mcq: { q: 'Which representation turns "a vehicle fits any spot at least as big as X" into one comparison?', options: ['A hash map from vehicle name to a list of spot names', 'Enums whose declaration order is the size order, compared by their numeric order (<code>ordinal()</code> in Java, an <code>IntEnum</code> in Python, a numeric <code>enum</code> in TypeScript, enum order in C++)', 'A switch statement per vehicle', 'Subclasses Car, Bike, Truck'], answer: 1, explain: 'Declaring SMALL, COMPACT, LARGE in order makes the numeric order of the enum a size rank (<code>ordinal()</code> in Java, the <code>IntEnum</code> value in Python); fit = spot rank ≥ minimum rank.' },
    hints: [
      `<p>Hint 1: the rule is really "minimum size" — each vehicle needs one number (its smallest acceptable spot); everything else follows.</p>`,
      `<p>Hint 2: give <code>VehicleType</code> a constructor field <code>SpotType minSpot</code>; compare their numeric order (<code>ordinal()</code> in Java, an <code>IntEnum</code> in Python, a numeric <code>enum</code> in TypeScript, enum order in C++), or give SpotType an explicit <code>rank</code> field if you fear reordering.</p>`,
      `<p>Hint 3: <code>fits()</code> = iterate <code>SpotType.values()</code> (already in size order) and keep those where <code>canPark</code> is true. Adding BUS = <code>BUS(SpotType.LARGE)</code>.</p>`
    ],
    tests: { io: true, cases: [{ stdin: "", stdout: "false\ntrue\n[SMALL, COMPACT, LARGE]\n[LARGE]\n[LARGE]\nfalse\n[COMPACT, LARGE]\nunknown vehicle PLANE\n[]\n" }] },
    solution: {
      approach: `<p>Two enums. SpotType declares sizes in ascending order. VehicleType stores its minimum spot; <code>canPark</code> compares ranks; <code>fits()</code> derives the preference list. All rules live in one place, typos are compile errors, and new types are one line.</p>`,
      code: J.p01_sol,
      alt: ALT.p01_sol,
      complexity: `<p>canPark O(1); fits() O(#spot types) — tiny and could be cached in a field.</p>`,
      followUps: ['Why might relying on the declaration order of an enum (<code>ordinal()</code> in Java) be fragile? Add an explicit rank field', 'Motorbikes may share a COMPACT spot two at a time — how does the model change?', 'Add HANDICAPPED spots that only permit-holders can use']
    }
  });

  practice.push({
    title: 'Find the Winner of a Tic-Tac-Toe Game (LeetCode 1275)',
    level: 'Easy', tags: ['simulation', 'counting', 'tic-tac-toe'], companies: ['Amazon', 'Zoho', 'Apple'],
    statement: `<p>Given a list of moves on a 3×3 board (A plays first as X, then B as O, alternating), return <code>"A"</code> or <code>"B"</code> if that player wins, <code>"Draw"</code> if all 9 cells are filled with no winner, or <code>"Pending"</code> otherwise. All moves are valid and the game stops at a win.</p>`,
    constraints: `1 ≤ moves.length ≤ 9; moves[i] = [row, col]; 0 ≤ row, col ≤ 2; no repeated cells.`,
    example: `<p>moves = [[0,0],[2,0],[1,1],[2,1],[2,2]] → A has (0,0), (1,1), (2,2) = main diagonal → ${H.c('g', '"A"')}. moves = [[0,0],[1,1]] → ${H.c('y', '"Pending"')}.</p>`,
    brute: { why: `<p>Rebuild the board and check all 8 lines for both players. Fine for 3×3 (it is "easy"), but it is O(n²) and does not stop at the winning move — in an interview, show you know the O(1)-per-move counter version.</p>`, code: J.p02_brute },
    mcq: { q: 'Move index i (0-based) belongs to which player?', options: ['A if i is odd', 'A if i is even', 'Whoever has fewer marks', 'Cannot tell'], answer: 1, explain: 'A moves first: indices 0, 2, 4, ... are A; 1, 3, 5, ... are B.' },
    hints: [
      `<p>Hint 1: player of move i = A if i % 2 == 0. You can decide the winner the moment their counter reaches 3.</p>`,
      `<p>Hint 2: use rows[3], cols[3], diag, anti with +1 for A and −1 for B, exactly like LeetCode 348.</p>`,
      `<p>Hint 3: after the loop, no winner: return "Draw" if moves.length == 9 else "Pending". Remember the centre updates both diagonals.</p>`
    ],
    tests: { io: true, cases: [{ stdin: "", stdout: "A\nB\nPending\nDraw\nA\nB\nPending\nPending\n" }] },
    solution: {
      approach: `<p>Replay the moves while maintaining ±1 counters; return as soon as any touched counter has absolute value 3. This is the same win-detection component as the full design, used standalone.</p>`,
      code: J.p02_sol,
      alt: ALT.p02_sol,
      complexity: `<p>O(m) time for m moves with O(1) per move; O(n) space for the counters.</p>`,
      followUps: ['Generalise to n×n and k players', 'Return the winning line cells as well', 'Detect an illegal move list (cell played twice) without a board']
    }
  });

  practice.push({
    title: 'Display Board with O(1) Free-Spot Counts (Observer)',
    level: 'Easy', tags: ['observer', 'counters', 'parking lot'], companies: ['Amazon', 'Ola'],
    statement: `<p>The entrance screen shows free spots per type and refreshes many times a second. Instead of scanning every spot on each refresh, make the lot <b>publish</b> "occupied" and "freed" events and let the display board keep counters. The lot must not depend on the concrete board class (screens, a mobile app and analytics may all subscribe).</p>`,
    constraints: `Up to 10<sup>5</sup> spots; board reads must be O(1); occupying a taken spot or freeing a free spot is an error.`,
    example: `<p>Spots ${H.arr(['SMALL', 'COMPACT', 'COMPACT', 'LARGE'])} occupy(1), occupy(3) → board ${H.c('b', '{SMALL=1, COMPACT=1, LARGE=0}')}; free(3) → ${H.c('g', '{SMALL=1, COMPACT=1, LARGE=1}')}.</p>`,
    brute: { why: `<p>Recount on every refresh: O(total spots) per read. With 10<sup>5</sup> spots and several screens refreshing 10× per second, that is millions of wasted checks per second — and the lot code ends up calling the screen directly.</p>`, code: J.p03_brute },
    mcq: { q: 'Why should ParkingLot depend on a <code>SpotListener</code> interface instead of <code>DisplayBoard</code>?', options: ['Interfaces are faster', 'So any number of different subscribers can be added without changing the lot (Dependency Inversion + Observer)', 'The language requires it', 'To make DisplayBoard a Singleton'], answer: 1, explain: 'The publisher knows only the interface; new subscribers (app, analytics) plug in with zero edits.' },
    hints: [
      `<p>Hint 1: a count changes only when a spot is occupied or freed — update it at that moment instead of recomputing later.</p>`,
      `<p>Hint 2: <code>interface SpotListener { void onOccupied(SpotType t); void onFreed(SpotType t); }</code>; the lot keeps a list of listeners and calls them after each change.</p>`,
      `<p>Hint 3: seed the board once with a full scan at startup, then apply deltas. Validate double occupy / double free in the lot so listeners never see bogus events.</p>`
    ],
    tests: { io: true, cases: [{ stdin: "", stdout: "{SMALL=1, COMPACT=1, LARGE=0}\n{SMALL=1, COMPACT=1, LARGE=1}\ntaken\nalready free\n{SMALL=1, COMPACT=1, LARGE=1}\nlog: occupied COMPACT, occupied LARGE, freed LARGE\n" }] },
    solution: {
      approach: `<p>Observer pattern: the lot publishes events; the board maintains a map of counters keyed by spot type (<code>EnumMap</code> / <code>dict</code> / <code>Map</code> / <code>std::map</code>) updated in O(1). Reading is a map lookup. The lot has no idea what a screen is.</p>`,
      code: J.p03_sol,
      alt: ALT.p03_sol,
      complexity: `<p>Event O(listeners); read O(1). One initial O(spots) scan.</p>`,
      followUps: ['Make listener calls asynchronous so a slow screen cannot block parking', 'Per-floor boards: filter events by floor', 'What if an event is lost? Periodic reconciliation scan']
    }
  });

  practice.push({
    title: 'Flat, Hourly and Lambda Tariffs with the Strategy Pattern',
    level: 'Easy', tags: ['strategy', 'functional interface', 'pricing'], companies: ['Paytm', 'Swiggy'],
    statement: `<p>A fee calculator must support flat pricing, hourly pricing, and ad-hoc promotions ("first 15 minutes free"), switchable at runtime (e.g. on weekends). Design it so a new tariff never edits the calculator.</p>`,
    constraints: `Minutes 0 ≤ m ≤ 10<sup>6</sup>; hourly charges per started hour with a minimum of 1 hour.`,
    example: `<p>Hourly ₹40, 61 min → 2 started hours → ${H.c('g', '₹80')}. Switch to flat ₹100 → ${H.c('g', '₹100')}. Promotion lambda <code>m -&gt; m &lt;= 15 ? 0 : 50</code>, 10 min → ${H.c('g', '₹0')}.</p>`,
    brute: { why: `<p>A <code>switch</code> on a mode string with copy-pasted formulas. Each new tariff (weekend, festival, promo) adds a case to the same method; a typo in the mode string is a runtime crash.</p>`, code: J.p04_brute },
    mcq: { q: 'Marking <code>PricingStrategy</code> with <code>@FunctionalInterface</code> buys you…', options: ['Faster execution', 'The ability to pass small tariffs as lambdas, plus a compile error if someone adds a second abstract method', 'Automatic thread safety', 'Nothing'], answer: 1, explain: 'One abstract method → lambdas allowed; the annotation enforces it.' },
    hints: [
      `<p>Hint 1: the varying part is a function minutes → amount. That is exactly what a one-method interface describes.</p>`,
      `<p>Hint 2: <code>FlatPricing</code> and <code>HourlyPricing</code> implement it; <code>FeeCalculator</code> holds one and offers <code>setStrategy()</code>.</p>`,
      `<p>Hint 3: started hours = <code>(m + 59) / 60</code> (integer division: <code>//</code> in Python, <code>Math.floor</code> or <code>Math.ceil</code> in TypeScript), then at least 1 via <code>max(1, ...)</code>. Test 0, 59, 60, 61 minutes.</p>`
    ],
    tests: { io: true, cases: [{ stdin: "", stdout: "hourly(61) = 80\nhourly(0) = 40\nflat(61) = 100\npromo(10) = 0\npromo(16) = 50\nstrategy required\nminutes must not be negative\n" }] },
    solution: {
      approach: `<p>Classic Strategy: the calculator (context) delegates to a pluggable strategy. Simple tariffs can be lambdas; complex ones are classes. Runtime switching is a setter (or better, chosen by a factory based on the entry date).</p>`,
      code: J.p04_sol,
      alt: ALT.p04_sol,
      complexity: `<p>O(1) time and O(1) extra space per charge; switching strategy is O(1).</p>`,
      followUps: ['Choose the strategy automatically from the entry date (a factory)', 'Combine strategies: min(hourly, flat) as a composite', 'Make FeeCalculator immutable and thread-safe']
    }
  });

  /* =====================================================================
     PRACTICE — MEDIUM
     ===================================================================== */
  practice.push({
    title: 'Valid Tic-Tac-Toe State (LeetCode 794)',
    level: 'Medium', tags: ['game rules', 'invariants', 'tic-tac-toe'], companies: ['Microsoft', 'Google'],
    statement: `<p>Given a 3×3 board as 3 strings of <code>'X'</code>, <code>'O'</code> and <code>' '</code>, return true if it can occur during a valid game: X moves first, players alternate, and nobody moves after someone wins.</p>`,
    constraints: `board.length == 3; each row has length 3; characters are 'X', 'O' or ' '.`,
    example: `<p>${H.c('r', '["O  ","   ","   "]')} → false (O cannot move first). ${H.c('r', '["XXX","   ","OOO"]')} → false (both cannot win). ${H.c('g', '["XOX","O O","XOX"]')} → true (5 X, 4 O, no winner).</p>`,
    brute: { why: `<p>Generate every reachable position by DFS from the empty board (5,478 positions) and test membership. Correct and fast for 3×3, but it explores the whole game tree, and the idea collapses for larger boards — the interviewer wants the invariants.</p>`, code: J.p05_brute },
    mcq: { q: 'X has three in a row. What must be true of the counts for the board to be valid?', options: ['x == o', 'x == o + 1', 'o == x + 1', 'Anything'], answer: 1, explain: 'X just made the winning move, so X has played exactly one more time than O.' },
    hints: [
      `<p>Hint 1: think about what each move changes: counts of X and O, and possibly a winning line. Write down the invariants a real game must satisfy.</p>`,
      `<p>Hint 2: count rule: <code>o ≤ x ≤ o + 1</code>. Win rules: not both win; if X wins then x == o + 1; if O wins then x == o.</p>`,
      `<p>Hint 3: write a <code>wins(board, p)</code> helper checking 3 rows, 3 cols, 2 diagonals. (Two X lines at once is fine — one move can complete two lines.)</p>`
    ],
    tests: { io: true, cases: [{ stdin: "", stdout: "false\nfalse\nfalse\ntrue\ntrue\nfalse\ntrue\ntrue\nfalse\ntrue\ntrue\n" }] },
    solution: {
      approach: `<p>Validate the invariants instead of searching: turn-order count constraints plus the "game stops at a win" constraints. These are exactly the invariants your <code>Game</code> class enforces at runtime, used here in reverse.</p>`,
      code: J.p05_sol,
      alt: ALT.p05_sol,
      complexity: `<p>O(1) for a fixed 3×3 board (O(n²) for n×n).</p>`,
      followUps: ['Generalise to n×n with K players', 'Return the move sequence that produces the board', 'Which invariant becomes an exception inside your Game class?']
    }
  });

  practice.push({
    title: 'Connect Four: Gravity Drops and Local Win Checks',
    level: 'Medium', tags: ['game design', 'matrix', 'directions'], companies: ['Amazon', 'Uber', 'Microsoft'],
    statement: `<p>Design Connect Four on an R×C grid: <code>drop(col, symbol)</code> places a disc in the lowest empty cell of that column and returns <code>"WIN"</code>, <code>"DRAW"</code> or <code>"OK"</code>. A win is K or more same discs in a row horizontally, vertically or diagonally. Reject full or invalid columns.</p>`,
    constraints: `4 ≤ R, C ≤ 100; K ≤ min(R, C); up to R × C drops.`,
    example: `<p>6×7, K = 4. Drops by column, alternating R/Y: 0,1,1,2,2,3,2,3,3,6,3 → red discs at (5,0), (4,1), (3,2), (2,3) → ${H.c('g', '"WIN"')} on the last drop (a rising diagonal).</p>`,
    brute: { why: `<p>After each drop, scan every cell in 4 directions: O(R × C × K) per move. Most of that work re-checks lines that could not have changed — only lines through the new disc can create a win.</p>`, code: J.p06_brute },
    mcq: { q: 'How do you find the landing row of a drop in O(1)?', options: ['Scan the column from the top', 'Keep <code>height[col]</code> = number of discs in the column', 'Binary search', 'You cannot'], answer: 1, explain: 'The next disc lands at row rows − 1 − height[col]; increment height after placing.' },
    hints: [
      `<p>Hint 1: a new win must include the disc just dropped, so only inspect the 4 lines through it.</p>`,
      `<p>Hint 2: for direction (dr, dc), count same discs going forward and backward from the new disc: total = 1 + run(+d) + run(−d).</p>`,
      `<p>Hint 3: keep <code>height[]</code> per column for O(1) landing and full-column checks; draw when moves == R × C.</p>`
    ],
    tests: { io: true, cases: [{ stdin: "", stdout: "OK OK OK OK OK OK OK OK OK OK WIN\nOK OK OK OK OK OK WIN\nOK OK OK OK OK OK WIN\nOK OK OK DRAW\nColumn 0 is not playable\nColumn 7 is not playable\nColumn -1 is not playable\n" }] },
    solution: {
      approach: `<p>Board + per-column heights make drops O(1). Win detection walks outward from the last disc in 4 directions, so each move costs O(K) regardless of board size. The same <code>run()</code> helper powers K-in-a-row games generally.</p>`,
      code: J.p06_sol,
      alt: ALT.p06_sol,
      complexity: `<p>drop: O(K) time; space O(R × C).</p>`,
      followUps: ['Pop-out variant: remove a bottom disc (heights and wins both change)', 'Plug the win check in as a WinningStrategy', 'Add a bot that blocks immediate threats']
    }
  });

  practice.push({
    title: 'K-in-a-Row on an R×C Board with a Pluggable Win Rule',
    level: 'Medium', tags: ['strategy', 'game design', 'gomoku'], companies: ['Google', 'Adobe'],
    statement: `<p>Write a <code>GridGame</code> that supports any board size, any number of players and any win rule. Implement the rule <code>KInARow(k)</code> (Gomoku: 5 in a row on 15×15) so it checks only the lines through the last move. The game class must not change when a new rule is added.</p>`,
    constraints: `R, C ≤ 1000; 3 ≤ k ≤ 10; players 2–4.`,
    example: `<p>15×15, k = 5. X plays (7,3), (7,4), (7,5), (7,6), (7,7) while O plays elsewhere → ${H.c('g', 'Winner: X')} after X's 5th move. Counters per whole line would not work: the row has 15 cells but only 5 are needed.</p>`,
    brute: { why: `<p>Rescan the whole board after each move: O(R × C × k). On a 1000×1000 board that is billions of operations over a game.</p>`, code: J.p07_brute },
    mcq: { q: 'Why can\'t the O(1) row/column counters from Tic-Tac-Toe detect 5-in-a-row on 15×15?', options: ['They can', 'A counter tells you how many marks a player has in the whole row, not whether they are consecutive', 'Counters overflow', 'Diagonals do not exist'], answer: 1, explain: 'Five X marks scattered across a 15-cell row reach count 5 without being a win.' },
    hints: [
      `<p>Hint 1: a win must pass through the last move. Check 4 directions from it: horizontal, vertical, two diagonals.</p>`,
      `<p>Hint 2: <code>interface WinRule { boolean isWin(char[][] b, int r, int c); }</code> — the game asks the rule after each move.</p>`,
      `<p>Hint 3: count = 1 + same cells walking +d + same cells walking −d, stop early once count reaches k. That bounds work by O(k).</p>`
    ],
    tests: { io: true, cases: [{ stdin: "", stdout: "Winner: X\nWinner: X\nWinner: A\nnobody yet\noccupied\noutside the board\n" }] },
    solution: {
      approach: `<p>Strategy for rules; the game keeps turn order and delegates the win question. <code>KInARow</code> counts consecutive same symbols through the last move in both senses of 4 directions, capped at k.</p>`,
      code: J.p07_sol,
      alt: ALT.p07_sol,
      complexity: `<p>O(k) per move; O(R × C) space for the board.</p>`,
      followUps: ['"Exactly 5" (overlines of 6 do not count) — how does the rule change?', 'Swap in tic-tac-toe rules with zero game changes', 'Infinite board: store cells in a hash map of coordinates (<code>HashMap</code> / <code>dict</code> / <code>Map</code> / <code>unordered_map</code>)']
    }
  });

  practice.push({
    title: 'Parking Reservations with a Per-Spot Interval Calendar',
    level: 'Medium', tags: ['treemap', 'intervals', 'parking lot'], companies: ['Uber', 'Booking.com', 'Amazon'],
    statement: `<p>Add advance bookings: <code>reserve(type, start, end)</code> returns a reservation on some spot of that type free for the whole half-open window <code>[start, end)</code>, or empty. <code>cancel(id)</code> frees it. Overlapping bookings on one spot are forbidden; back-to-back ([9,12) then [12,14)) is allowed.</p>`,
    constraints: `Up to 10<sup>4</sup> spots and 10<sup>5</sup> reservations; times are integers (hours); start &lt; end.`,
    example: `<p>Spots A1, A2. reserve 9–12 → ${H.c('g', 'A1')}; 10–11 → ${H.c('g', 'A2')}; 11–13 → ${H.c('g', 'A2')} (A2's booking ends exactly at 11); 12–14 → ${H.c('g', 'A1')}; cancel R2, then 10–11 → ${H.c('g', 'A2')} again.</p>`,
    brute: { why: `<p>A single list of every reservation, scanned once per spot per request: O(spots × reservations). At 10<sup>4</sup> × 10<sup>5</sup> that is 10<sup>9</sup> checks per request.</p>`, code: J.p08_brute },
    mcq: { q: 'Bookings on a spot are non-overlapping and sorted by start. To test [s, e), which neighbours must you check?', options: ['All bookings', 'Only the booking with the greatest start ≤ s and the booking with the smallest start ≥ s', 'Only the first and last', 'None'], answer: 1, explain: 'Non-overlapping sorted intervals: only the immediate predecessor and successor can collide (a sorted map: <code>TreeMap.floorEntry</code> / <code>ceilingKey</code>, <code>bisect</code> on sorted starts, <code>std::map::lower_bound</code>).' },
    hints: [
      `<p>Hint 1: give every spot its own sorted calendar; then a free-check only looks at that spot's neighbours of <code>start</code>.</p>`,
      `<p>Hint 2: a sorted map start → end (<code>TreeMap&lt;Integer, Integer&gt;</code> / <code>bisect</code> over sorted starts / <code>std::map</code>). The booking at or before <code>s</code> (<code>floorEntry(s)</code>) must end ≤ s; the next start at or after <code>s</code> (<code>ceilingKey(s)</code>) must be ≥ e (or absent).</p>`,
      `<p>Hint 3: keep indexes <code>type → calendars</code> and <code>reservationId → reservation</code> for O(log n) cancel. Make reserve/cancel atomic with one lock (two apps can book at once).</p>`
    ],
    tests: { io: true, cases: [{ stdin: "", stdout: "R1 A1 [9,12)\nR2 A2 [10,11)\nR3 A2 [11,13)\nR4 A1 [12,14)\ncancel R2: true\nR5 A2 [10,11)\nnone\nR6 A2 [13,15)\nnone\ncancel R2 again: false\nstart must be before end\n" }] },
    solution: {
      approach: `<p>A <code>SpotCalendar</code> per spot holds disjoint intervals in a sorted map; a <code>ReservationService</code> tries spots of the requested type and books the first free one. ParkingLot can later check reservations at entry — the existing allocation code is untouched.</p>`,
      code: J.p08_sol,
      alt: ALT.p08_sol,
      complexity: `<p>reserve: O(S × log B) for S spots of the type and B bookings per spot; cancel O(log B).</p>`,
      followUps: ['No-shows: release a reservation 15 minutes after start (scheduled task)', 'Prefer the spot whose gaps fit best (minimise fragmentation)', 'How does ParkingLot.park() honour a reservation id at the gate?']
    }
  });

  practice.push({
    title: 'EV Charging and Valet Add-ons with the Decorator Pattern',
    level: 'Medium', tags: ['decorator', 'factory', 'pricing'], companies: ['Tesla', 'Ather', 'Amazon'],
    statement: `<p>Pricing now has a base tariff plus optional add-ons: <b>EV charging</b> (per kWh) and <b>valet</b> (flat fee when used). Any combination must be possible, and adding a new add-on must not create new combination classes. EV spots automatically include the charging add-on.</p>`,
    constraints: `Stays up to 72 h; energy up to 100 kWh; money as long rupees (round charging to the nearest rupee).`,
    example: `<p>EV spot, 3 h, 10 kWh, no valet: hourly ₹20 × 3 = 60, + 10 × 15 = 150 → ${H.c('g', '₹210')}. Regular spot, 3 h, valet: 60 + 100 → ${H.c('g', '₹160')}. <code>describe()</code> → ${H.c('b', 'hourly@20 + valet + charging@15.0/kWh')}.</p>`,
    brute: { why: `<p>Subclass explosion: HourlyWithCharging, HourlyWithValet, HourlyWithChargingAndValet, then the same again for flat and weekend tariffs. Classes = tariffs × 2<sup>add-ons</sup> — 3 tariffs and 3 add-ons already need 24 classes.</p>`, code: J.p09_brute },
    mcq: { q: 'With 3 base tariffs and 3 optional add-ons, how many classes do decorators need?', options: ['24', '6', '9', '3'], answer: 1, explain: '3 base classes + 3 decorator classes; combinations are built at runtime by wrapping.' },
    hints: [
      `<p>Hint 1: an add-on "is a" pricing (same interface) and "has a" pricing (the one it adds to). That double relationship is the Decorator signature.</p>`,
      `<p>Hint 2: <code>abstract class PricingAddOn implements Pricing { protected final Pricing inner; }</code>; each add-on returns <code>inner.fee(s) + extra</code>.</p>`,
      `<p>Hint 3: a small factory decides the chain by spot kind: regular = valet(hourly); EV = charging(valet(hourly)). Pass usage data in a <code>Stay</code> record so the interface stays stable.</p>`
    ],
    tests: { io: true, cases: [{ stdin: "", stdout: "hourly@20 + valet + charging@15.0/kWh\n210\n160\n163\nhourly@20 + valet\n20\nstay values must not be negative\n" }] },
    solution: {
      approach: `<p>Base tariffs implement <code>Pricing</code>; add-ons wrap another <code>Pricing</code>. A factory composes chains per spot kind. New add-on = one class; nothing else changes. <code>describe()</code> shows the chain — handy for itemised receipts.</p>`,
      code: J.p09_sol,
      alt: ALT.p09_sol,
      complexity: `<p>O(d) per fee for d decorator layers (tiny). Classes grow linearly with features.</p>`,
      followUps: ['Itemised receipt: each layer appends a line item', 'Does decorator order matter? (cap then surcharge vs surcharge then cap)', 'Idle fee: EV stays plugged in after charging completes']
    }
  });

  practice.push({
    title: 'Nearest Spot to the Entry Gate with Per-Gate Heaps',
    level: 'Medium', tags: ['priority queue', 'strategy', 'lazy deletion'], companies: ['Amazon', 'Google', 'Uber'],
    statement: `<p>A lot has G entry gates and S spots; <code>dist[g][s]</code> is the walking distance from gate g to spot s. Implement a <code>GateAwareStrategy</code>: <code>allocate(gate)</code> returns the free spot nearest that gate (ties → smaller id), <code>release(spot)</code> frees it. Make allocation faster than scanning all spots.</p>`,
    constraints: `G ≤ 20, S ≤ 10<sup>5</sup>, up to 10<sup>6</sup> operations.`,
    example: `<p>dist = gate0 ${H.arr([1, 2, 3, 4])} gate1 ${H.arr([4, 3, 2, 1])}. allocate(0) → ${H.c('g', '0')}; allocate(1) → ${H.c('g', '3')}; allocate(1) → ${H.c('g', '2')}; release(3); allocate(1) → ${H.c('g', '3')}; allocate(0) → ${H.c('g', '1')}.</p>`,
    brute: { why: `<p>For every arriving car, scan all S spots and compute the minimum distance: O(S) per allocation — 10<sup>5</sup> × 10<sup>6</sup> operations is far too slow.</p>`, code: J.p10_brute },
    mcq: { q: 'A spot taken through gate 0 still sits in gate 1\'s heap. What is the cheapest correct handling?', options: ['Remove it from every heap immediately (O(S) each)', 'Lazy deletion: when gate 1 pops it later, see it is taken and pop again', 'Ignore it — double allocation is fine', 'Rebuild all heaps'], answer: 1, explain: 'Lazy deletion keeps operations O(log S) amortised; stale entries are skipped when popped.' },
    hints: [
      `<p>Hint 1: each gate needs its own ordering of spots, so keep one min-heap per gate keyed by that gate's distance.</p>`,
      `<p>Hint 2: removing an arbitrary element from a binary heap (<code>PriorityQueue</code> / <code>heapq</code> / <code>std::priority_queue</code>) is O(S). Instead, leave it and skip it when it surfaces (check a shared <code>taken[]</code>).</p>`,
      `<p>Hint 3: release pushes the spot back into every gate's heap. Synchronize allocate/release (or use one lock) because gates run concurrently.</p>`
    ],
    tests: { io: true, cases: [{ stdin: "", stdout: "0\n3\n2\n3\n1\n-1\n0\nSpot 0 is not taken\ngate 0 heap holds 4 entries\n0 1 2 -1\n" }] },
    solution: {
      approach: `<p>G heaps over the same spots with different comparators, a shared <code>taken[]</code> array and lazy deletion. The class plugs into ParkingLot as just another allocation strategy — the lot never learns about gates or heaps.</p>`,
      code: J.p10_sol,
      alt: ALT.p10_sol,
      complexity: `<p>allocate: O(log S) amortised (stale pops are paid for by earlier pushes); release: O(G log S). Space O(G × S) for heap entries: each spot is queued at most once per heap, even after many releases.</p>`,
      followUps: ['The solution queues each spot at most once per heap (a per-gate flag), so heaps never exceed S entries; what would a periodic rebuild buy instead?', 'Combine with spot types: one heap per (gate, type)', 'Make it lock-free per gate — what breaks?']
    }
  });

  /* =====================================================================
     PRACTICE — HARD
     ===================================================================== */
  practice.push({
    title: 'Concurrent Parking Lot: Many Gates, Zero Double Allocation',
    level: 'Hard', tags: ['concurrency', 'CAS', 'concurrent queue'], companies: ['Uber', 'Goldman Sachs', 'Amazon'],
    statement: `<p>Eight entry gates run on eight threads and call <code>park(plate, type)</code> at the same time; exit gates call <code>leave(plate)</code>. Guarantee: no spot is ever given to two vehicles, a plate cannot be inside twice, and gates should not all queue behind a single global lock. Prove it with a stress test.</p>`,
    constraints: `Up to 10<sup>5</sup> spots and 64 gate threads. park/leave should be lock-free or fine-grained. Return empty when no spot of that type is free.`,
    example: `<p>500 COMPACT spots, 8 threads × 125 cars = 1000 arrivals → ${H.c('g', 'parked=500 duplicates=0 inside=500')}. With the racy version the same test occasionally prints ${H.c('r', 'duplicates &gt; 0')} — and only occasionally, which is what makes races dangerous.</p>`,
    brute: { why: `<p>Check-then-act on a shared array: two threads both read <code>spots[i] == null</code> and both write. Wrapping everything in one lock (<code>synchronized</code>, a mutex) fixes correctness but serialises every gate. The interviewer wants you to name the race, fix it, then improve throughput.</p>`, code: J.p11_brute },
    mcq: { q: 'Why is the pop of a thread-safe queue (<code>ConcurrentLinkedQueue.poll()</code> in Java) enough to stop two gates getting the same free spot?', options: ['It is synchronized internally on the whole lot', 'It atomically removes the head: each element is returned to at most one caller', 'It sorts spots by distance', 'It blocks until a spot is free'], answer: 1, explain: 'The pop is atomic (<code>poll()</code> uses CAS; a mutex-guarded deque pops under its lock), so exactly one thread wins each element; the losing thread gets the next one or nothing.' },
    hints: [
      `<p>Hint 1: the dangerous moment is "find a free spot" + "mark it taken". Make that one atomic operation instead of two steps.</p>`,
      `<p>Hint 2: keep free spots in a thread-safe queue per type (<code>ConcurrentLinkedQueue</code> / <code>queue.SimpleQueue</code> / a mutex-guarded deque) — the pop is the atomic hand-off. Claim the plate atomically too (adding to a concurrent set reports whether it was already present).</p>`,
      `<p>Hint 3: on leave: remove the plate's mapping (only one thread can), clear the spot with a CAS, <i>then</i> offer it back to the queue — publishing before clearing would let another gate grab a dirty spot. Stress-test with an executor and a set of seen spot ids.</p>`
    ],
    tests: { io: true, cases: [{ stdin: "", stdout: "parked=500 duplicates=0 inside=500\nfull lot refuses: true\nNOPE is not inside\ninside=499\nLATE parked: true\nLATE already inside\ninside=500\n" }] },
    solution: {
      approach: `<p>Per-type lock-free free-lists give O(1) atomic allocation; a compare-and-set cell on each spot (<code>AtomicReference</code> / <code>std::atomic</code>) double-checks invariants; a concurrent plate set prevents duplicate entries; a concurrent map plate → spot serves the exit. No global lock — gates only contend on the queue head of the same type. Trade-off: "nearest" becomes FIFO order unless you use per-floor queues.</p>`,
      code: J.p11_sol,
      alt: ALT.p11_sol,
      complexity: `<p>park / leave: O(1) expected, lock-free. Memory O(spots + vehicles inside).</p>`,
      followUps: ['Keep "nearest first" under concurrency (per-floor queues, try floors in order)', 'Spread the lot over 3 servers — where does atomicity live now?', 'Add a fair waiting queue when the lot is full (BlockingQueue with timeout)']
    }
  });

  practice.push({
    title: 'Unbeatable Tic-Tac-Toe Bot as a Player Strategy (Minimax + Alpha-Beta)',
    level: 'Hard', tags: ['minimax', 'game tree', 'strategy'], companies: ['Google', 'Meta', 'DeepMind'],
    statement: `<p>Implement <code>MinimaxBot implements Player</code> so it plugs into the existing game without any change to <code>Game</code>. The bot must never lose on 3×3: take a win when available, block the opponent's win, and prefer faster wins / slower losses.</p>`,
    constraints: `3×3 board; the bot may be X or O; respond within a few milliseconds.`,
    example: `<p>Board ${H.c('b', 'XX. / OO. / ...')}, bot = O → plays ${H.c('g', '(1,2)')} — winning now beats blocking. Board ${H.c('b', 'XX. / .O. / ...')}, bot = O → plays ${H.c('g', '(0,2)')} — the only move that does not lose.</p>`,
    brute: { why: `<p>A "first free cell" bot. It fits the interface but loses to any human in a few moves. (Plain minimax without pruning is also acceptable for 3×3 — at most 9! ≈ 362,880 leaves — but alpha-beta is the expected upgrade and is essential for bigger boards.)</p>`, code: J.p12_brute },
    mcq: { q: 'Why score a win as <code>10 − depth</code> rather than a flat +10?', options: ['To avoid integer overflow', 'So the bot prefers the fastest win (and the slowest loss) among equally winning lines', 'Depth is required by alpha-beta', 'It makes no difference'], answer: 1, explain: 'Without depth, a win in 1 and a win in 5 look the same and the bot may "play with its food" and dither.' },
    hints: [
      `<p>Hint 1: assume both sides play perfectly. The bot maximises the score, the opponent minimises it; recurse over every free cell.</p>`,
      `<p>Hint 2: terminal scores: bot wins → 10 − depth; opponent wins → depth − 10; full board → 0. Place, recurse, then undo the move on the same array (no copies).</p>`,
      `<p>Hint 3: alpha-beta: keep the best score each side can already guarantee; when <code>beta ≤ alpha</code>, the remaining siblings cannot change the decision — return early.</p>`
    ],
    tests: { io: true, cases: [{ stdin: "", stdout: "1,2\n0,2\ndraw\nX\nO\nboard is full\n" }] },
    solution: {
      approach: `<p>The bot is just another implementation of the <code>Player</code> strategy, so the game loop does not change. Minimax with alpha-beta explores the game tree with in-place make/undo moves; depth-adjusted scores choose the quickest win.</p>`,
      code: J.p12_sol,
      alt: ALT.p12_sol,
      complexity: `<p>Worst case O(b<sup>d</sup>) with b ≤ 9, d ≤ 9; alpha-beta reduces it toward O(b<sup>d/2</sup>) with good move ordering. Memo by board string (transposition table) collapses 3×3 to its 5,478 positions.</p>`,
      followUps: ['Add a transposition table (a hash map of board → score)', 'Difficulty levels: depth limit or random blunders', 'Why does full minimax not scale to 15×15 Gomoku? (heuristics, MCTS)']
    }
  });

  practice.push({
    title: 'Machine Coding: Parking Lot Command Interpreter',
    level: 'Hard', tags: ['machine coding', 'command pattern', 'treeset'], companies: ['Gojek', 'Flipkart', 'Swiggy', 'PhonePe'],
    statement: `<p>The classic 90-minute round. Build a program that reads commands and prints exact outputs:</p>
      ${H.table(['Command', 'Output'], [
        ['<code>create_parking_lot 6</code>', 'Created a parking lot with 6 slots'],
        ['<code>park KA-01-HH-1234 White</code>', 'Allocated slot number: 1 (nearest = lowest number) / Sorry, parking lot is full'],
        ['<code>leave 4</code>', 'Slot number 4 is free'],
        ['<code>registration_numbers_for_cars_with_colour White</code>', 'plates in slot order, comma separated, or Not found'],
        ['<code>slot_number_for_registration_number KA-01-HH-3141</code>', 'slot or Not found']
      ])}
      <p>Bad lines must print an error, never crash. New commands must be addable without touching the existing ones.</p>`,
    constraints: `Up to 10<sup>5</sup> slots and 10<sup>6</sup> commands; colour matching case-insensitive; outputs must match exactly. Commands arrive one per line on standard input and blank lines are skipped.`,
    example: `<p>create 3; park ×3 → ${H.c('g', 'slots 1, 2, 3')}; 4th park → ${H.c('r', 'Sorry, parking lot is full')}; leave 2 → ${H.c('b', 'Slot number 2 is free')}; park → ${H.c('g', 'Allocated slot number: 2')} (lowest free); colour White → ${H.c('g', 'KA-01-HH-1234, KA-01-BB-0001')}; <code>fly_away now</code> → ${H.c('r', 'Unknown command: fly_away')}.</p>`,
    brute: { why: `<p>Everything in one class with an if-else ladder over the command word and linear scans for the nearest slot and colour queries: O(n) per park and query, no validation (a missing argument throws), and each new command grows the ladder. It may pass the sample but fails the evaluator's large hidden input and the code-quality rubric.</p>`, code: J.p13_brute },
    mcq: { q: 'Which structure gives "nearest free slot" in O(log n) and supports freeing any slot?', options: ['ArrayList scanned from the start', 'A sorted set or min-heap of free slots (<code>TreeSet</code> + <code>pollFirst()</code>, <code>heapq</code>, <code>std::set</code>)', 'HashSet&lt;Integer&gt;', 'Stack&lt;Integer&gt;'], answer: 1, explain: 'A sorted set keeps the smallest free slot first; add() on leave and pollFirst() on park are both O(log n). (A min-heap also works.)' },
    hints: [
      `<p>Hint 1: separate three layers: text parsing, command handlers, and the domain (<code>Garage</code>) that knows nothing about strings like "park".</p>`,
      `<p>Hint 2: domain indexes: a sorted set (or min-heap) of free slots, <code>Map&lt;plate, slot&gt;</code>, <code>Map&lt;colour, sorted slots&gt;</code> (sorted output for free). <code>TreeSet</code> / <code>heapq</code> + <code>bisect</code> / <code>std::set</code> all work.</p>`,
      `<p>Hint 3: <code>Map&lt;String, CliCommand&gt;</code> + an arity table; check "lot created" and argument counts before dispatching; wrap execution in try/catch so one bad line prints an error and the run continues. Drive it from a list of lines (or stdin) in <code>main()</code>.</p>`
    ],
    tests: { io: true, cases: [{ stdin: "create_parking_lot 3\npark KA-01-HH-1234 White\npark KA-01-HH-9999 Black\npark KA-01-BB-0001 White\npark KA-01-HH-7777 Red\nleave 2\npark KA-01-HH-7777 Red\nregistration_numbers_for_cars_with_colour White\nslot_number_for_registration_number KA-01-HH-7777\nfly_away now\n", stdout: "Created a parking lot with 3 slots\nAllocated slot number: 1\nAllocated slot number: 2\nAllocated slot number: 3\nSorry, parking lot is full\nSlot number 2 is free\nAllocated slot number: 2\nKA-01-HH-1234, KA-01-BB-0001\n2\nUnknown command: fly_away\n" }, { stdin: "park KA-01-HH-1234 White\ncreate_parking_lot x\ncreate_parking_lot 0\ncreate_parking_lot 2\n\npark KA-01-HH-1234 White\npark KA-01-HH-1234 Black\npark KA-01-HH-1234\npark KA-02-AA-0001 white\nregistration_numbers_for_cars_with_colour WHITE\nregistration_numbers_for_cars_with_colour Green\nslot_number_for_registration_number ZZ-99\nleave 9\nleave 1\nleave 1\nslot_number_for_registration_number KA-01-HH-1234\nleave abc\n  park   KA-03  Blue\n", stdout: "Create a parking lot first\nError: not a number: x\nError: capacity must be at least 1\nCreated a parking lot with 2 slots\nAllocated slot number: 1\nError: KA-01-HH-1234 already parked\nUsage: park needs 2 argument(s)\nAllocated slot number: 2\nKA-01-HH-1234, KA-02-AA-0001\nNot found\nNot found\nSlot 9 is already empty\nSlot number 1 is free\nSlot 1 is already empty\nNot found\nError: not a number: abc\nAllocated slot number: 1\n" }] },
    solution: {
      approach: `<p>Command pattern for the CLI (one small class per command, registered in a map), a clean <code>Garage</code> domain with the right indexes, and defensive parsing. This is exactly what machine-coding evaluators score: runs on their input, O(log n) operations, no God class, and a new command is one class + one <code>register()</code> line.</p>`,
      code: J.p13_sol,
      alt: ALT.p13_sol,
      complexity: `<p>park / leave: O(log n); colour query O(k) for k matches; plate lookup O(1). Memory O(n).</p>`,
      followUps: ['Add <code>status</code> printing a table of slot, plate, colour', 'Read commands from a file path given as an argument', 'Add multi-level lots without changing any command class']
    }
  });

  practice.push({
    title: 'Multiplayer Tic-Tac-Toe with Spectators and Replay (Observer + Event Log)',
    level: 'Hard', tags: ['observer', 'event sourcing', 'sealed interfaces'], companies: ['Microsoft', 'Zynga', 'Atlassian'],
    statement: `<p>Support P players on a (P+1)×(P+1) board (a full line wins). Spectators (TV screen, logger, scoreboard) must receive every event without the game knowing their classes. Every game must be <b>replayable</b>: rebuild the board as it looked after any move k from stored history alone.</p>`,
    constraints: `2 ≤ P ≤ 8; win check O(1) per move; replay O(moves); events are immutable.`,
    example: `<p>Players X, O, Z on 4×4. Moves (0,0) (1,0) (2,0) (0,1) (1,1) (2,1) (0,2) (1,2) (2,2) (0,3) → TV sees ${H.c('g', 'X WINS')} (row 0). <code>replay(events, 4, 3)</code> → ${H.c('b', 'X... / O... / Z... / ....')}.</p>`,
    brute: { why: `<p>The game prints directly ("Player X played…") and copy-pastes a second println for the TV. No history is stored, so replay is impossible, and every new spectator means editing <code>play()</code>.</p>`, code: J.p14_brute },
    mcq: { q: 'Why model events as a closed set of immutable types (a Java <b>sealed</b> interface of records, a TypeScript discriminated union, a C++ <code>std::variant</code>)?', options: ['Records are faster', 'The compiler knows every event type, so a <code>switch</code> / <code>match</code> / <code>std::visit</code> over events can be checked for exhaustiveness, and events are immutable', 'Sealed classes are required for Observer', 'To prevent subclassing Game'], answer: 1, explain: 'A closed set of immutable facts (sealed + records in Java, a discriminated union in TypeScript, <code>std::variant</code> in C++, frozen dataclasses in Python): pattern-matching switches must handle each one, and the compiler or type checker flags a missing case.' },
    hints: [
      `<p>Hint 1: anything that happened (move, win, draw) is a fact — store it as an immutable event in an append-only list.</p>`,
      `<p>Hint 2: <code>emit(e)</code> appends to the log and calls every <code>GameListener</code>. Spectators never touch game state; they only read events.</p>`,
      `<p>Hint 3: per-player counter arrays <code>[P][n]</code> keep the win check O(1) — update all counters (non-short-circuit <code>|</code>) before deciding. Replay = start from an empty board and apply MovePlayed events with seq ≤ k.</p>`
    ],
    tests: { io: true, cases: [{ stdin: "", stdout: "TV: X WINS\n11\nX.../O.../Z.../....\nXXXX/OOO./ZZZ./....\ngame over\nBOARD: draw\n10\ngame over\nillegal move\nillegal move\n" }] },
    solution: {
      approach: `<p>The game state changes only by emitting events; listeners (Observer) receive them; the event log doubles as history for replay (event sourcing, lite). A closed event hierarchy of immutable types (sealed records, a discriminated union, <code>std::variant</code>) gives immutability and exhaustive <code>switch</code> handling in spectators.</p>`,
      code: J.p14_sol,
      alt: ALT.p14_sol,
      complexity: `<p>play: O(1) + O(listeners); replay to move k: O(events). Memory O(events).</p>`,
      followUps: ['Persist events to a file and resume a game after a crash', 'Snapshot every 50 moves to speed up replay', 'Run listeners asynchronously so a slow spectator cannot stall the game']
    }
  });

  /* =====================================================================
     QUIZ
     ===================================================================== */
  quiz.push({ q: 'An interviewer says "Design a parking lot." What should your first two minutes produce?', options: ['A ParkingLot class with a main method', 'A written list of clarified requirements: vehicle types, floors, pricing, concurrency, out-of-scope items', 'A UML diagram of every possible class', 'A database schema'], answer: 1, explain: 'Clarifying requirements first fixes the scope; every later step (entities, APIs, patterns) depends on it.' });
  quiz.push({ q: 'Which noun from "drivers get a ticket at the gate" most clearly deserves its own class?', options: ['driver', 'ticket', 'gate (as a String)', 'at'], answer: 1, explain: 'A ticket has its own data (id, vehicle, spot, entry time) and lifecycle; the driver usually has no data the system needs.' });
  quiz.push({ q: 'Vehicle types BIKE, CAR, TRUCK differ only in which spots they fit and their hourly rate. The simplest extensible model is…', options: ['Abstract class Vehicle with three empty subclasses', 'An enum VehicleType with fields for fit list and rate', 'Three String constants', 'A Singleton VehicleRegistry'], answer: 1, explain: 'When variants differ only by data, an enum with fields keeps rules in one place; a new type is one line.' });
  quiz.push({ q: 'Why is a Singleton ParkingLot usually a poor choice in an LLD interview?', options: ['Singletons cannot have methods', 'It hides a global dependency, prevents multiple lots and makes tests share state', 'The language forbids it', 'It is slower'], answer: 1, explain: 'Create one instance in main() and inject it; the "only one" constraint is a deployment decision, not a class property.' });
  quiz.push({ q: 'Two entry gates call park() at the same moment and both get spot F0-S2. What is the root cause?', options: ['A bad allocation strategy', 'A check-then-act race: finding a free spot and marking it taken are not atomic', 'Using enums', 'Pricing logic'], answer: 1, explain: 'Make find+assign one atomic step: one lock around park() (synchronized / mutex), per-floor locks, or a concurrent free queue whose pop is atomic.' });
  quiz.push({ q: 'In unpark(), which order is safest?', options: ['release spot → compute fee → remove ticket', 'remove ticket → compute fee → release spot', 'compute fee → release spot → keep ticket for audit as active', 'any order'], answer: 1, explain: 'Removing the ticket first makes reuse impossible even if a later step fails; the spot is released last.' });
  quiz.push({ q: 'A car parks for 61 minutes at ₹20 per started hour (minimum 1 hour). The fee is…', options: ['₹20', '₹40', '₹20.33', '₹60'], answer: 1, explain: 'Started hours = ⌈61/60⌉ = 2 → 2 × 20 = ₹40.' });
  quiz.push({ q: 'On an n×n tic-tac-toe board with counters (X = +1, O = −1), X wins when…', options: ['any counter is positive', 'a touched row, column or diagonal counter equals +n', 'the sum of all counters is n', 'n moves have been made'], answer: 1, explain: 'Only a line fully owned by X can reach +n; any O in it lowers the sum.' });
  quiz.push({ q: 'Cell (1,1) on a 3×3 board updates which counters?', options: ['rows[1] and cols[1] only', 'rows[1], cols[1], diag and anti', 'diag only', 'anti only'], answer: 1, explain: 'The centre satisfies both r == c and r + c == n − 1, so it lies on both diagonals.' });
  quiz.push({ q: 'The interviewer asks to add a computer opponent. In a good design this is…', options: ['a new flag isComputer in Game', 'a new class implementing the existing Player interface; Game unchanged', 'a subclass of Board', 'impossible without rewriting Game'], answer: 1, explain: 'Player is a Strategy; a bot is another implementation. Zero edits to Game is the Open/Closed principle in action.' });
  quiz.push({ q: 'You need "₹200 daily cap" and "weekend 1.5×" on top of any tariff, in any combination. Best fit?', options: ['Subclass per combination', 'Decorators wrapping a PricingStrategy', 'A static utility with boolean flags', 'Observer'], answer: 1, explain: 'Decorators implement the same interface and wrap another strategy, so features stack without class explosion.' });
  quiz.push({ q: 'Which is the strongest reason interviewers reject a single-class procedural solution that produces correct output?', options: ['It uses too few lines', 'Follow-up requirements force edits across tangled code; responsibilities and invariants are not modelled', 'Procedural code cannot compile', 'It does not use inheritance'], answer: 1, explain: 'The LLD rubric scores modelling, separation of concerns and extensibility, not just output.' });
  quiz.push({ q: 'Undo is added with MoveCommand objects. Why must execute() update ALL counters before checking for a win?', options: ['For speed', 'So undo(), which reverses every counter, restores an exact previous state', 'Because of language rules', 'It is not necessary'], answer: 1, explain: 'An early return would skip some increments; the matching decrements in undo would then corrupt the counters.' });
  // vary the position of the correct option so it is not always the second one
  (function () {
    var shifts = [0, 2, 1, 3, 2, 0, 3, 1, 2, 0, 3, 1, 2];
    quiz.forEach(function (q, i) {
      var s = shifts[i % shifts.length] % q.options.length;
      if (!s) return;
      var correct = q.options[q.answer];
      for (var k = 0; k < s; k++) q.options.unshift(q.options.pop());
      q.answer = q.options.indexOf(correct);
    });
  })();

  /* =====================================================================
     INTERVIEW Q&A
     ===================================================================== */
  interview.push({ level: 'B', q: 'Walk me through how you approach any LLD interview question.',
    a: `<p>I use seven steps and keep them visible. <b>1. Clarify</b>: actors, use cases, variants, scale/concurrency, out of scope — written down. <b>2. Entities</b>: nouns become classes, enums or records; verbs become methods on the class that owns the data. <b>3. APIs</b>: public signatures with inputs, outputs and failure cases. <b>4. Class diagram</b>: relationships and multiplicities. <b>5. Patterns</b>: interfaces only where the requirements say something will vary. <b>6. Code</b>: dependency order, then a <code>main()</code> demo. <b>7. Extend</b>: take one follow-up and show it is a new class, not edits everywhere. I timebox: about a quarter of the round on steps 1–5, half on code.</p>`,
    followUps: ['What do you cut when only 10 minutes remain?', 'How does the framework change for a 90-minute machine-coding round?'] });
  interview.push({ level: 'B', q: 'What clarifying questions would you ask for "Design a parking lot"?',
    a: `<p>How many floors and spots; which spot sizes and vehicle types, and which fits where; how pricing works (hourly, slabs, caps, per type); how many entry/exit gates and whether they operate concurrently; payment modes; whether we need a display of free spots; whether reservations, monthly passes, EV charging or lost tickets are in scope; and whether it is in-memory or persisted. I also ask what is explicitly out of scope, so I do not build features nobody needs.</p>`,
    followUps: ['Which answer changes your design the most?', 'What would you assume if the interviewer says "your call"?'] });
  interview.push({ level: 'B', q: 'Why not just write the parking lot as one class with arrays? It works.',
    a: `<p>It works for the demo but fails the purpose of the round. Types as strings and parallel arrays mean rules are duplicated as if-else ladders (fit rules, prices), so a new vehicle type or tariff needs edits in several methods — shotgun surgery. Printing, pricing and payment are tangled, so nothing can be tested alone. There is no place to enforce invariants like "a ticket is used once", and check-then-act on shared arrays races under multiple gates. A modelled design turns each of those follow-ups into one new class.</p>`,
    followUps: ['When IS a single class acceptable?', 'How would you refactor it safely if you inherited it?'] });
  interview.push({ level: 'I', q: 'Which design patterns did you use in the parking lot, and why each one?',
    a: `<p><b>Strategy</b> for spot allocation and for pricing — the two rules the business will change most. <b>Facade</b>: <code>ParkingLot</code> is the single entry point for gates, hiding floors and spots. <b>Observer</b> for display boards reacting to spot changes with O(1) counters. <b>Decorator</b> when pricing rules stack (daily cap, weekend surcharge, EV charging). <b>Dependency Inversion</b> via an injected <code>TimeSource</code> so fees are testable. I deliberately avoided Singleton (global state, hard to test) and vehicle subclasses that would carry no behaviour.</p>`,
    followUps: ['Would you use the State pattern for tickets?', 'Where would a Factory help?'] });
  interview.push({ level: 'I', q: 'How do you prevent two gates from assigning the same spot?',
    a: `<p>The race is check-then-act: "find a free spot" followed by "mark it taken". It must be atomic. Simplest: one lock around <code>park</code>/<code>unpark</code> (<code>synchronized</code> / <code>threading.Lock</code> / <code>std::mutex</code>) — correct but serialises gates. Better: per-floor locks (acquired in a fixed order), or a per-type thread-safe queue of free spots whose pop atomically hands a spot to exactly one thread, plus a compare-and-set on the spot as a safety net. Across multiple servers, the atomic step moves into the database (row lock / conditional update) or Redis. I would also make <code>ParkingSpot.assign()</code> re-check emptiness and throw.</p>`,
    followUps: ['How do you keep "nearest spot" ordering with a lock-free queue?', 'What deadlock risk do per-floor locks add?'] });
  interview.push({ level: 'I', q: 'How would you model the ticket lifecycle and payment?',
    a: `<p>A ticket moves ACTIVE → PAID → EXITED. I keep the status on the ticket and allow only legal transitions in one method that throws otherwise, so "exit without paying" and "pay twice" are impossible. Payment is a <code>PaymentProcessor</code> strategy (cash, card, UPI). I never hold the lot lock while calling a remote payment gateway: compute the fee, release the lock, charge with an idempotency key, then mark PAID. If transitions or behaviour per state grow (grace periods, refunds), I would move to the State pattern.</p>`,
    followUps: ['What happens if the gateway times out?', 'How do you handle a lost ticket?'] });
  interview.push({ level: 'I', q: 'Explain your O(1) win check for N×N Tic-Tac-Toe and prove it is correct.',
    a: `<p>Keep counters for each row, each column, and the two diagonals. With two players, X adds +1 and O adds −1 to the row, column and (if applicable) diagonal counters of the cell played. A line of n cells reaches +n only if every cell contributes +1, i.e. all X; any O lowers the maximum possible sum to n − 2. So <code>counter == ±n</code> exactly means a full line for one player. Each move touches at most four counters: O(1) time, O(n) space. For 3+ players, keep separate counter arrays per player and test for n.</p>`,
    followUps: ['Why does it break for K-in-a-row with K &lt; N?', 'How do you support undo with counters?'] });
  interview.push({ level: 'I', q: 'How did you split responsibilities in Tic-Tac-Toe?',
    a: `<p><code>Board</code> owns cells and validates moves (bounds, empty). <code>Player</code> is an interface that chooses moves, so humans, scripted test players and bots are interchangeable. <code>WinningStrategy</code> decides whether the last move won, so rule variants plug in. <code>Game</code> orchestrates: turn order, status (an enum), history of <code>Move</code> records, and the invariant "no moves after the game ends". No class reads the console (<code>System.in</code> / <code>input()</code> / <code>std::cin</code>) except a console player, which keeps the model testable.</p>`,
    followUps: ['Where does the draw check go and why?', 'How would you add a networked player?'] });
  interview.push({ level: 'A', q: 'Add undo/redo to Tic-Tac-Toe. What changes?',
    a: `<p>Each move becomes a <code>MoveCommand</code> with <code>execute()</code> and <code>undo()</code> that apply ±1 to exactly the same counters and set/clear the cell — so counter updates must not short-circuit. <code>Game</code> keeps an undo deque and a redo deque: play → execute, push to undo, clear redo; undo → pop, reverse, push to redo, and fix turn/game-over (undoing a winning move re-opens the game with the same player to move). This is O(1) per operation versus O(n²) for board snapshots. The only edit to existing code is the history hook in <code>Game</code>.</p>`,
    followUps: ['Why must a new move clear the redo stack?', 'How would you limit undo to the last 3 moves?'] });
  interview.push({ level: 'A', q: 'The interviewer adds "EV spots with charging fees" at minute 40. Walk through your change.',
    a: `<p>Axis of change: spot kind and how money is computed. I add an <code>EV</code> value to <code>SpotType</code> (data) and teach the fit rules that only EV-capable vehicles may use it — or keep EV as an attribute so other cars can still use EV spots when the lot is full, which I would clarify. Pricing: a <code>ChargingAddOn</code> decorator wraps the existing <code>PricingStrategy</code> and adds kWh × rate; a small factory wraps it only for EV spots. <code>ParkingLot</code>, gates and allocation stay untouched. Change set: one enum constant, one or two new classes, zero edits to core flow.</p>`,
    followUps: ['How do you measure kWh — whose responsibility is it?', 'What about an idle fee after charging ends?'] });
  interview.push({ level: 'A', q: 'How would you scale the parking design to 50,000 spots and peak traffic?',
    a: `<p>Replace scanning allocation with indexes: a free list per (floor, spot type) — a sorted set or heap if "nearest" order matters, or a deque if any spot will do — giving O(log n) or O(1) allocation. Display boards use event-driven counters, not scans. Use finer locks (per floor/type) or lock-free queues so gates do not serialise. Keep tickets in a concurrent map and add a plate → ticket index for lost tickets. If the lot spans servers, move the authoritative state and atomic allocation into a database or Redis and keep the same interfaces in front.</p>`,
    followUps: ['What is your bottleneck now?', 'How do you make park() idempotent if a gate retries?'] });
  interview.push({ level: 'E', q: 'How do you decide which parts of a design get interfaces and which stay concrete?',
    a: `<p>I add an interface where the requirements or the interviewer name a variation (pricing, allocation, players, win rules), where I need a seam for testing (time, payment gateway, storage), or where several implementations already exist. Everything else stays concrete and simple; variants that differ only by data go into enums or configuration. Each interface has a cost — indirection and more files — so I want to be able to say in one sentence which future change it absorbs. Over-abstracting (factories for one product, Singleton managers) is penalised as much as a God class.</p>`,
    followUps: ['Give an example of an interface you would remove from a typical AI-generated design', 'How does this relate to YAGNI?'] });
  interview.push({ level: 'E', q: 'You are in a 90-minute machine-coding round and at minute 60 nothing runs yet. What do you do?',
    a: `<p>Stop widening and get a thin vertical slice running end to end: create, the single most important operation (park), and its inverse (leave), wired from input to output with the real domain classes — even if other commands are missing. Evaluators run the code; a running subset with clean structure beats a complete but non-compiling design. Then add commands one by one, running after each. In the last 10 minutes: error handling for bad input so nothing crashes, remove dead code, and leave a short note on extension points and known gaps.</p>`,
    followUps: ['What do you sacrifice first: tests, validation, or features?', 'How do you avoid spending 30 minutes on input parsing?'] });

  registerModule({
    id: 'lld07',
    title: 'LLD Interview Framework: Parking Lot & Tic-Tac-Toe',
    intro: `<p>This is the module where everything from the earlier LLD modules (OOP modelling, SOLID, clean code, design patterns) turns into <b>interview performance</b>. You will learn a repeatable 7-step framework — <b>clarify → entities → APIs → class diagram → patterns → code → extend</b> — and then apply it, slowly and completely, to the two most-asked LLD problems: <b>Parking Lot</b> and <b>Tic-Tac-Toe</b>.</p>
      <p>You will also see the "brute force" of design — the single God class that dumps everything into one file — and learn exactly why interviewers reject it even when it runs. Every design ends in complete, compilable code (Java shown first, with Python, TypeScript and C++ versions in the tabs), and every topic has an animated visualizer: the framework as a loop, the parking-lot class diagram built entity by entity, cars parking and leaving on a live spot grid, and a tic-tac-toe board detecting wins in O(1). Finish with extend-the-design follow-ups and mini machine-coding problems like the ones asked at Amazon, Flipkart, Uber and Swiggy.</p>`,
    goals: [
      'Run any LLD round with the 7-step framework, and know how many minutes to give each step in a 45- or 90-minute round',
      'Turn a vague prompt into entities, enums, records and interfaces, then into a class diagram with correct relationships and multiplicities',
      'Write a complete, thread-aware Parking Lot in code (Java, Python, TypeScript or C++): spot allocation strategy, ticket lifecycle, pricing strategy, display-board observer',
      'Write a complete N×N Tic-Tac-Toe with O(1) win detection, pluggable players (human/bot) and undo via the Command pattern',
      'Explain why a single-class procedural solution fails the rubric, and refactor one into a clean design',
      'Handle extend-the-design follow-ups (EV spots, reservations, K-in-a-row, replay, multiple gates) by adding classes instead of editing old ones'
    ],
    prereqs: `LLD 1 (OOP Modelling &amp; UML), LLD 2 (SOLID Principles), LLD 3 (Clean Code) and at least skim LLD 4–6 (Creational, Structural and Behavioral patterns — especially Strategy, Observer, Command, Factory, Builder, Decorator). Comfortable Java: interfaces, enums with fields, records, collections, basic <code>synchronized</code>.`,
    hours: 14,
    langNotes: {
      java: `<p><b>Interfaces vs abstract classes.</b> Every moving part here is an <code>interface</code> (<code>SpotAllocationStrategy</code>, <code>PricingStrategy</code>, <code>Player</code>, <code>GameListener</code>). A one-method interface can be a lambda (<code>@FunctionalInterface</code> turns a second abstract method into a compile error). Use an <code>abstract class</code> only for shared state, such as the decorator base <code>PricingAddOn</code>. An <code>enum</code> can carry data and behaviour (<code>VehicleType</code> and its fit list), and a <code>sealed interface</code> of <code>record</code>s models a closed set of events that a <code>switch</code> must cover. <b>Equality and hashing.</b> A <code>record</code> gets <code>equals</code> and <code>hashCode</code> from its fields, so <code>Vehicle</code>, <code>Move</code> and <code>Room</code> work as map keys; a plain class must override both or it compares by identity. <b>Immutability.</b> <code>final</code> fields, <code>record</code>s, <code>List.copyOf</code> and <code>List.of</code>; <code>Collections.unmodifiableList</code> is only a view. <b>Concurrency.</b> <code>synchronized</code> on <code>park</code> and <code>unpark</code> makes find-then-assign atomic; for no global lock use <code>ConcurrentLinkedQueue.poll()</code> (hands each element to one thread), <code>ConcurrentHashMap.newKeySet().add</code> (atomic claim) and <code>AtomicReference.compareAndSet</code>. <b>Numbers and time.</b> Money in <code>long</code> (an <code>int</code> overflow wraps silently), <code>Instant</code> and <code>Duration</code> for time, <code>Math.round</code> rounds .5 up. <code>PriorityQueue</code> is a min-heap.</p>`,
      python: `<p><b>Interfaces vs abstract classes.</b> Use <code>abc.ABC</code> with <code>@abstractmethod</code> (the body can be <code>...</code>) for the strategies and listeners; a base class cannot be instantiated until every abstract method is implemented. A one-method strategy can be a plain function, wrapped in a tiny adapter (<code>FunctionPricing</code>) when the code expects the interface. <code>IntEnum</code> gives the ordered <code>SpotType</code> (<code>SMALL &lt; COMPACT &lt; LARGE</code>) and a union of frozen dataclasses with <code>match</code> models the events. <b>Equality and hashing.</b> <code>@dataclass(frozen=True)</code> generates <code>__eq__</code> and <code>__hash__</code>, so <code>Room</code> and <code>Vehicle</code> work as dict keys; defining <code>__eq__</code> alone removes <code>__hash__</code>, and <code>@dataclass(eq=False)</code> keeps identity for objects such as <code>Spot</code>. <b>Immutability.</b> Frozen dataclasses and tuples; a leading underscore only asks callers to keep out. <b>Concurrency.</b> The GIL does not make check-then-act atomic: guard it with <code>threading.Lock</code> (or <code>RLock</code> when methods call each other). <code>queue.SimpleQueue.get_nowait()</code> hands each spot to one thread, and <code>collections.deque</code> appends and pops are atomic, but a <code>heapq</code> list is not thread-safe. <b>Numbers and time.</b> Integers never overflow; <code>//</code> is floor division and <code>timedelta // timedelta(minutes=1)</code> counts minutes. <code>round()</code> rounds half to even, so use <code>math.floor(x + 0.5)</code> to match Java's <code>Math.round</code>. <code>heapq</code> is a min-heap and compares tuples, so <code>(distance, id)</code> breaks ties by id.</p>`,
      js: `<p><b>TypeScript.</b> <b>Interfaces vs abstract classes.</b> An <code>interface</code> exists only at compile time, and types are structural, so an object literal such as <code>{ fee: (m) =&gt; ... }</code> is a valid strategy or listener. Use an <code>abstract class</code> for shared state (the decorator base <code>PricingAddOn</code>). Events are a discriminated union (<code>kind: "moved" | "won" | "drawn"</code>) and a <code>switch</code> on <code>kind</code> is checked for exhaustiveness. <b>Equality and hashing.</b> <code>===</code> compares identity, and <code>Map</code> and <code>Set</code> keyed by an object use identity too: key by a string (the plate, the spot id) or write an <code>equals</code> method. <b>Immutability.</b> <code>readonly</code> and <code>ReadonlyArray</code> are compile-time only; <code>Object.freeze</code> enforces at run time, and <code>#field</code> is truly private. <b>Concurrency.</b> There are no shared-memory threads: each callback runs to completion, so check-then-act is atomic as long as there is no <code>await</code> between the check and the act. The 8-gate stress test uses async tasks that yield with <code>setTimeout</code>. <b>Numbers and time.</b> <code>number</code> is a double, exact for integers up to 2<sup>53</sup>, which is fine for paise; divide with <code>Math.floor</code> or <code>Math.ceil</code>. <code>Math.round</code> rounds .5 up like Java. <code>Date</code> counts milliseconds. There is no built-in heap, so the solutions include a small <code>MinHeap</code>, and <code>Array.shift()</code> is O(n). Avoid globals that clash with DOM names (<code>open</code>, <code>name</code>, <code>Event</code>, <code>Location</code>) when type-checking.</p>`,
      cpp: `<p><b>Interfaces vs abstract classes.</b> An interface is a class of pure virtual functions (<code>= 0</code>) with a <b>virtual destructor</b> (<code>virtual ~Player() = default;</code>); mark overrides with <code>override</code>. A one-method strategy can wrap a <code>std::function</code> or lambda (<code>LambdaPricing</code>), and <code>std::variant</code> with <code>std::visit</code> models a closed set of events. <b>Equality and hashing.</b> <code>bool operator==(const Room&amp;) const = default;</code> compares all members; a <code>std::map</code> key also needs <code>operator&lt;</code>, and an <code>unordered_map</code> key needs a <code>std::hash</code>. <b>Immutability.</b> <code>const</code> members and <code>const</code> methods, and return <code>const T&amp;</code> instead of copying a collection. <b>Ownership and lifetimes.</b> The lot owns its strategies in <code>std::unique_ptr</code> (moved in through the constructor); listeners, spots and loans are non-owning pointers or references that must not outlive their owner. A <code>Ticket</code> holds a pointer into a <code>std::vector&lt;ParkingSpot&gt;</code>, which is safe only because that vector is never resized; <code>std::map</code> nodes also keep their address. Use <code>std::shared_ptr</code> only where an object really has several owners (a <code>Player</code> shared by <code>Game</code> and its <code>Move</code> history). <b>Concurrency.</b> Guard shared state with <code>std::mutex</code> and <code>std::lock_guard</code> (RAII releases on every path), use <code>std::recursive_mutex</code> when public methods call each other, and join every <code>std::thread</code>. There is no lock-free queue in the standard library: a mutex-guarded <code>std::deque</code> hands each spot to one thread, and <code>std::atomic&lt;bool&gt;::compare_exchange_strong</code> is the safety net. A data race is undefined behaviour. <b>Numbers and time.</b> Signed overflow is undefined, so use <code>long long</code> for money; integer division truncates toward zero; <code>std::llround</code> rounds .5 away from zero (same as Java for positives); use <code>std::chrono</code> for time. <code>std::priority_queue</code> is a max-heap, so pass <code>greater&lt;&gt;</code> for a min-heap.</p>`
    },
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
