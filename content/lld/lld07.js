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
    ParkingLotDemo: "import java.time.Duration;\nimport java.time.Instant;\nimport java.util.*;\nimport java.util.concurrent.atomic.AtomicLong;\n\n// ===================== 1. Value types (enums + records) =====================\n\n/** Physical size of a spot painted on the floor. */\nenum SpotType { SMALL, COMPACT, LARGE }\n\n/** Kind of vehicle. Each type knows which spot sizes it fits, best fit first. */\nenum VehicleType {\n    BIKE(SpotType.SMALL, SpotType.COMPACT, SpotType.LARGE),\n    CAR(SpotType.COMPACT, SpotType.LARGE),\n    TRUCK(SpotType.LARGE);\n\n    private final List<SpotType> fits;\n    VehicleType(SpotType... fits) { this.fits = List.of(fits); }\n\n    /** Spot types this vehicle may use, in order of preference (smallest that fits first). */\n    List<SpotType> fits() { return fits; }\n}\n\n/** A vehicle is pure data: a number plate and a type. Immutable, so a record is perfect. */\nrecord Vehicle(String plate, VehicleType type) {\n    Vehicle {\n        Objects.requireNonNull(plate, \"plate\");\n        Objects.requireNonNull(type, \"type\");\n    }\n}\n\n/** What the driver gets back at the exit gate. */\nrecord Receipt(String ticketId, String plate, long minutesParked, long amount) { }\n\n// ===================== 2. Core entities =====================\n\n/** One painted rectangle on one floor. Knows its own state: free or holding a vehicle. */\nclass ParkingSpot {\n    private final String id;          // e.g. \"F0-S3\"\n    private final int floor;\n    private final SpotType type;\n    private Vehicle vehicle;          // null means free\n\n    ParkingSpot(String id, int floor, SpotType type) {\n        this.id = id; this.floor = floor; this.type = type;\n    }\n\n    boolean isFree() { return vehicle == null; }\n\n    void assign(Vehicle v) {\n        if (!isFree()) throw new IllegalStateException(\"Spot \" + id + \" already taken\");\n        if (!v.type().fits().contains(type)) throw new IllegalArgumentException(v.type() + \" cannot use \" + type);\n        vehicle = v;\n    }\n\n    void release() { vehicle = null; }\n\n    String id() { return id; }\n    int floor() { return floor; }\n    SpotType type() { return type; }\n    Vehicle vehicle() { return vehicle; }\n}\n\n/** A floor is just an ordered group of spots. */\nclass ParkingFloor {\n    private final int number;\n    private final List<ParkingSpot> spots = new ArrayList<>();\n\n    ParkingFloor(int number, SpotType... layout) {\n        this.number = number;\n        for (int i = 0; i < layout.length; i++) {\n            spots.add(new ParkingSpot(\"F\" + number + \"-S\" + i, number, layout[i]));\n        }\n    }\n\n    int number() { return number; }\n    List<ParkingSpot> spots() { return Collections.unmodifiableList(spots); }\n}\n\n/** Issued at the entry gate; the \"receipt of a promise\" that links a vehicle to a spot and a start time. */\nclass Ticket {\n    private final String id;\n    private final Vehicle vehicle;\n    private final ParkingSpot spot;\n    private final Instant entryTime;\n\n    Ticket(String id, Vehicle vehicle, ParkingSpot spot, Instant entryTime) {\n        this.id = id; this.vehicle = vehicle; this.spot = spot; this.entryTime = entryTime;\n    }\n\n    String id() { return id; }\n    Vehicle vehicle() { return vehicle; }\n    ParkingSpot spot() { return spot; }\n    Instant entryTime() { return entryTime; }\n}\n\n// ===================== 3. Strategies (the parts that change) =====================\n\n/** HOW we choose a spot. Swap implementations without touching ParkingLot (Strategy pattern). */\ninterface SpotAllocationStrategy {\n    Optional<ParkingSpot> findSpot(List<ParkingFloor> floors, VehicleType type);\n}\n\n/** Lowest floor first; on each floor, the smallest spot type that fits; then lowest index. */\nclass NearestFirstStrategy implements SpotAllocationStrategy {\n    @Override\n    public Optional<ParkingSpot> findSpot(List<ParkingFloor> floors, VehicleType type) {\n        for (ParkingFloor floor : floors) {\n            for (SpotType wanted : type.fits()) {\n                for (ParkingSpot s : floor.spots()) {\n                    if (s.isFree() && s.type() == wanted) return Optional.of(s);\n                }\n            }\n        }\n        return Optional.empty();\n    }\n}\n\n/** HOW MUCH we charge. Another Strategy: weekend pricing, flat pricing, etc. plug in here. */\ninterface PricingStrategy {\n    long fee(Ticket ticket, Instant exitTime);\n}\n\n/** Rate per started hour, by vehicle type. Minimum one hour. */\nclass HourlyPricing implements PricingStrategy {\n    private final Map<VehicleType, Long> ratePerHour;\n\n    HourlyPricing(Map<VehicleType, Long> ratePerHour) { this.ratePerHour = Map.copyOf(ratePerHour); }\n\n    @Override\n    public long fee(Ticket t, Instant exitTime) {\n        long minutes = Duration.between(t.entryTime(), exitTime).toMinutes();\n        long hours = Math.max(1, (minutes + 59) / 60);           // ceil, at least 1 hour\n        return hours * ratePerHour.get(t.vehicle().type());\n    }\n}\n\n/** Where \"now\" comes from. Injected so tests and demos can control time (Dependency Inversion). */\ninterface TimeSource { Instant now(); }\n\nclass FakeTime implements TimeSource {\n    private Instant now = Instant.parse(\"2026-01-01T09:00:00Z\");\n    public Instant now() { return now; }\n    void advance(Duration d) { now = now.plus(d); }\n}\n\n// ===================== 4. The facade the gates talk to =====================\n\nclass ParkingLotFullException extends RuntimeException {\n    ParkingLotFullException(VehicleType t) { super(\"No free spot for \" + t); }\n}\n\nclass ParkingLot {\n    private final List<ParkingFloor> floors;\n    private final SpotAllocationStrategy allocation;\n    private final PricingStrategy pricing;\n    private final TimeSource clock;\n    private final Map<String, Ticket> activeTickets = new HashMap<>();\n    private final Set<String> platesInside = new HashSet<>();\n    private final AtomicLong ticketSeq = new AtomicLong(1);\n\n    ParkingLot(List<ParkingFloor> floors, SpotAllocationStrategy allocation,\n               PricingStrategy pricing, TimeSource clock) {\n        this.floors = List.copyOf(floors);\n        this.allocation = allocation;\n        this.pricing = pricing;\n        this.clock = clock;\n    }\n\n    /** Entry flow: find spot -> occupy it -> issue ticket. synchronized so two gates never get the same spot. */\n    public synchronized Ticket park(Vehicle v) {\n        if (platesInside.contains(v.plate())) throw new IllegalStateException(v.plate() + \" is already inside\");\n        ParkingSpot spot = allocation.findSpot(floors, v.type())\n                .orElseThrow(() -> new ParkingLotFullException(v.type()));\n        spot.assign(v);\n        Ticket t = new Ticket(\"T\" + ticketSeq.getAndIncrement(), v, spot, clock.now());\n        activeTickets.put(t.id(), t);\n        platesInside.add(v.plate());\n        return t;\n    }\n\n    /** Exit flow: look up ticket -> price it -> free the spot -> close the ticket. */\n    public synchronized Receipt unpark(String ticketId) {\n        Ticket t = activeTickets.remove(ticketId);\n        if (t == null) throw new NoSuchElementException(\"Unknown or already used ticket \" + ticketId);\n        Instant exit = clock.now();\n        long amount = pricing.fee(t, exit);\n        t.spot().release();\n        platesInside.remove(t.vehicle().plate());\n        long minutes = Duration.between(t.entryTime(), exit).toMinutes();\n        return new Receipt(t.id(), t.vehicle().plate(), minutes, amount);\n    }\n\n    /** For the display board at the entrance. */\n    public synchronized Map<SpotType, Integer> freeSpots() {\n        Map<SpotType, Integer> free = new EnumMap<>(SpotType.class);\n        for (SpotType st : SpotType.values()) free.put(st, 0);\n        for (ParkingFloor f : floors)\n            for (ParkingSpot s : f.spots())\n                if (s.isFree()) free.merge(s.type(), 1, Integer::sum);\n        return free;\n    }\n}\n\n// ===================== 5. Gates: thin, they only talk to the lot =====================\n\nclass EntryGate {\n    private final ParkingLot lot;\n    EntryGate(ParkingLot lot) { this.lot = lot; }\n    Ticket enter(Vehicle v) { return lot.park(v); }\n}\n\nclass ExitGate {\n    private final ParkingLot lot;\n    ExitGate(ParkingLot lot) { this.lot = lot; }\n    Receipt exit(String ticketId) { return lot.unpark(ticketId); }\n}\n\n// ===================== 6. Demo (what you show the interviewer at the end) =====================\n\npublic class ParkingLotDemo {\n    public static void main(String[] args) {\n        FakeTime time = new FakeTime();\n        List<ParkingFloor> floors = List.of(\n                new ParkingFloor(0, SpotType.SMALL, SpotType.COMPACT, SpotType.COMPACT, SpotType.LARGE),\n                new ParkingFloor(1, SpotType.SMALL, SpotType.COMPACT, SpotType.LARGE, SpotType.LARGE));\n        ParkingLot lot = new ParkingLot(floors, new NearestFirstStrategy(),\n                new HourlyPricing(Map.of(VehicleType.BIKE, 10L, VehicleType.CAR, 20L, VehicleType.TRUCK, 50L)),\n                time);\n        EntryGate in = new EntryGate(lot);\n        ExitGate out = new ExitGate(lot);\n\n        Ticket t1 = in.enter(new Vehicle(\"KA-01-1111\", VehicleType.CAR));\n        Ticket t2 = in.enter(new Vehicle(\"KA-02-2222\", VehicleType.BIKE));\n        Ticket t3 = in.enter(new Vehicle(\"KA-03-3333\", VehicleType.TRUCK));\n        System.out.println(t1.id() + \" -> \" + t1.spot().id());   // T1 -> F0-S1\n        System.out.println(t2.id() + \" -> \" + t2.spot().id());   // T2 -> F0-S0\n        System.out.println(t3.id() + \" -> \" + t3.spot().id());   // T3 -> F0-S3\n        System.out.println(\"Free: \" + lot.freeSpots());          // {SMALL=1, COMPACT=2, LARGE=2}\n\n        time.advance(Duration.ofMinutes(150));                  // 2h30m later\n        Receipt r = out.exit(t1.id());\n        System.out.println(r);                                  // 3 started hours x 20 = 60\n\n        try {\n            out.exit(t1.id());                                  // same ticket twice\n        } catch (NoSuchElementException e) {\n            System.out.println(\"Rejected: \" + e.getMessage());\n        }\n    }\n}\n",
    TicTacToeDemo: "import java.util.*;\n\n// ===================== 1. Small value types =====================\n\n/** A move is just data: who played where. */\nrecord Move(int row, int col, Player player) { }\n\nenum GameStatus { IN_PROGRESS, WON, DRAW }\n\n// ===================== 2. Players (Strategy: how a move is chosen) =====================\n\n/** Anything that can pick a move: a human at a keyboard, a scripted test, a bot. */\ninterface Player {\n    String name();\n    char symbol();\n    int[] chooseMove(Board board);      // returns {row, col}\n}\n\n/** Plays a fixed list of moves. Perfect for demos and unit tests (no Scanner needed). */\nclass ScriptedPlayer implements Player {\n    private final String name;\n    private final char symbol;\n    private final Deque<int[]> moves = new ArrayDeque<>();\n\n    ScriptedPlayer(String name, char symbol, int[]... script) {\n        this.name = name; this.symbol = symbol;\n        moves.addAll(Arrays.asList(script));\n    }\n    public String name() { return name; }\n    public char symbol() { return symbol; }\n    public int[] chooseMove(Board board) {\n        if (moves.isEmpty()) throw new IllegalStateException(name + \" ran out of scripted moves\");\n        return moves.poll();\n    }\n}\n\n// ===================== 3. Board: owns cells and validation only =====================\n\nclass Board {\n    static final char EMPTY = '.';\n    private final int n;\n    private final char[][] cells;\n    private int filled = 0;\n\n    Board(int n) {\n        if (n < 3) throw new IllegalArgumentException(\"Board must be at least 3x3\");\n        this.n = n;\n        cells = new char[n][n];\n        for (char[] row : cells) Arrays.fill(row, EMPTY);\n    }\n\n    int size() { return n; }\n    boolean isFull() { return filled == n * n; }\n    char at(int r, int c) { return cells[r][c]; }\n\n    boolean isValid(int r, int c) {\n        return r >= 0 && r < n && c >= 0 && c < n && cells[r][c] == EMPTY;\n    }\n\n    void place(int r, int c, char symbol) {\n        if (!isValid(r, c)) throw new IllegalArgumentException(\"Illegal move (\" + r + \",\" + c + \")\");\n        cells[r][c] = symbol;\n        filled++;\n    }\n\n    void print() {\n        for (char[] row : cells) System.out.println(new String(row));\n    }\n}\n\n// ===================== 4. Win detection: its own class, O(1) per move =====================\n\n/** Rule for \"who won?\". Separate interface so \"4 in a row\" or \"corners win\" variants plug in. */\ninterface WinningStrategy {\n    boolean isWinningMove(Board board, Move move, int playerIndex);\n}\n\n/**\n * Keeps a counter per (player, row), (player, col), and both diagonals.\n * A player wins when any counter reaches n. Each move costs O(1) instead of rescanning O(n^2).\n */\nclass CounterWinningStrategy implements WinningStrategy {\n    private final int n;\n    private final int[][] rows, cols;\n    private final int[] diag, anti;\n\n    CounterWinningStrategy(int n, int players) {\n        this.n = n;\n        rows = new int[players][n];\n        cols = new int[players][n];\n        diag = new int[players];\n        anti = new int[players];\n    }\n\n    @Override\n    public boolean isWinningMove(Board board, Move m, int p) {\n        int r = m.row(), c = m.col();\n        if (++rows[p][r] == n) return true;\n        if (++cols[p][c] == n) return true;\n        if (r == c && ++diag[p] == n) return true;\n        return r + c == n - 1 && ++anti[p] == n;\n    }\n}\n\n// ===================== 5. Game: turn order + status (the orchestrator) =====================\n\nclass Game {\n    private final Board board;\n    private final List<Player> players;\n    private final WinningStrategy rules;\n    private final List<Move> history = new ArrayList<>();\n    private int turn = 0;\n    private GameStatus status = GameStatus.IN_PROGRESS;\n    private Player winner;\n\n    Game(int n, List<Player> players) {\n        if (players.size() < 2) throw new IllegalArgumentException(\"Need at least 2 players\");\n        Set<Character> symbols = new HashSet<>();\n        for (Player p : players)\n            if (!symbols.add(p.symbol())) throw new IllegalArgumentException(\"Duplicate symbol \" + p.symbol());\n        this.board = new Board(n);\n        this.players = List.copyOf(players);\n        this.rules = new CounterWinningStrategy(n, players.size());\n    }\n\n    /** Apply one move for the player whose turn it is. Returns the new status. */\n    GameStatus makeMove(int r, int c) {\n        if (status != GameStatus.IN_PROGRESS) throw new IllegalStateException(\"Game is over: \" + status);\n        Player p = players.get(turn);\n        board.place(r, c, p.symbol());                  // throws on illegal move; turn does not advance\n        Move m = new Move(r, c, p);\n        history.add(m);\n        if (rules.isWinningMove(board, m, turn)) {\n            status = GameStatus.WON;\n            winner = p;\n        } else if (board.isFull()) {\n            status = GameStatus.DRAW;\n        } else {\n            turn = (turn + 1) % players.size();\n        }\n        return status;\n    }\n\n    /** Drive the game by asking each Player for a move until it ends. */\n    void play() {\n        while (status == GameStatus.IN_PROGRESS) {\n            int[] rc = players.get(turn).chooseMove(board);\n            makeMove(rc[0], rc[1]);\n        }\n    }\n\n    GameStatus status() { return status; }\n    Optional<Player> winner() { return Optional.ofNullable(winner); }\n    List<Move> history() { return Collections.unmodifiableList(history); }\n    Board board() { return board; }\n}\n\n// ===================== 6. Demo =====================\n\npublic class TicTacToeDemo {\n    public static void main(String[] args) {\n        Player alice = new ScriptedPlayer(\"Alice\", 'X', new int[]{0, 0}, new int[]{1, 1}, new int[]{2, 2});\n        Player bob = new ScriptedPlayer(\"Bob\", 'O', new int[]{0, 1}, new int[]{0, 2});\n        Game game = new Game(3, List.of(alice, bob));\n        game.play();\n        game.board().print();\n        // XOO\n        // .X.\n        // ..X\n        System.out.println(game.status() + \" winner=\" + game.winner().map(Player::name).orElse(\"none\"));\n        System.out.println(\"Moves played: \" + game.history().size());   // 5\n    }\n}\n",
    g1_brute: "// BRUTE FORCE: one class, maps of strings, status as magic text.\n// It \"works\" for the demo, but every new rule means editing this one class.\nclass LibrarySystem {\n    private final Map<String, String> bookStatus = new HashMap<>();   // isbn -> \"FREE\" or memberId\n    private final Map<String, Integer> borrowedCount = new HashMap<>(); // memberId -> count\n\n    void addBook(String isbn) { bookStatus.put(isbn, \"FREE\"); }\n\n    String borrow(String memberId, String isbn) {\n        if (!bookStatus.containsKey(isbn)) return \"NO_SUCH_BOOK\";\n        if (!bookStatus.get(isbn).equals(\"FREE\")) return \"TAKEN\";\n        int count = borrowedCount.getOrDefault(memberId, 0);\n        if (count >= 3) return \"LIMIT\";                // rule hard-coded in the middle of the flow\n        bookStatus.put(isbn, memberId);\n        borrowedCount.put(memberId, count + 1);\n        return \"OK\";\n    }\n\n    String giveBack(String memberId, String isbn) {\n        if (!memberId.equals(bookStatus.get(isbn))) return \"NOT_YOURS\";\n        bookStatus.put(isbn, \"FREE\");\n        borrowedCount.merge(memberId, -1, Integer::sum);\n        return \"OK\";\n    }\n}\n",
    g1_sol: "import java.time.LocalDate;\n\n// ---- Entities: nouns from the requirements ----\nrecord Book(String isbn, String title) { }\n\nclass Member {\n    private final String id;\n    private final String name;\n    private final List<Loan> activeLoans = new ArrayList<>();\n    Member(String id, String name) { this.id = id; this.name = name; }\n    String id() { return id; }\n    String name() { return name; }\n    List<Loan> activeLoans() { return activeLoans; }\n}\n\n/** A Loan is the \"ticket\" of a library: it links a member, a book and dates. */\nclass Loan {\n    private final Member member;\n    private final Book book;\n    private final LocalDate due;\n    Loan(Member member, Book book, LocalDate due) { this.member = member; this.book = book; this.due = due; }\n    Member member() { return member; }\n    Book book() { return book; }\n    LocalDate due() { return due; }\n    boolean isOverdue(LocalDate today) { return today.isAfter(due); }\n}\n\n// ---- The rule that will change (premium members, students...) sits behind an interface ----\ninterface LendingPolicy {\n    int maxBooks(Member m);\n    int loanDays(Member m);\n}\n\nclass StandardPolicy implements LendingPolicy {\n    public int maxBooks(Member m) { return 3; }\n    public int loanDays(Member m) { return 14; }\n}\n\n// ---- Facade with the public APIs we agreed on in step 3 ----\nclass Library {\n    private final Map<String, Book> catalog = new HashMap<>();\n    private final Map<String, Loan> loanByIsbn = new HashMap<>();\n    private final LendingPolicy policy;\n\n    Library(LendingPolicy policy) { this.policy = policy; }\n\n    void addBook(Book b) { catalog.put(b.isbn(), b); }\n\n    Loan borrow(Member m, String isbn, LocalDate today) {\n        Book b = catalog.get(isbn);\n        if (b == null) throw new NoSuchElementException(\"No book \" + isbn);\n        if (loanByIsbn.containsKey(isbn)) throw new IllegalStateException(b.title() + \" is already lent out\");\n        if (m.activeLoans().size() >= policy.maxBooks(m))\n            throw new IllegalStateException(m.name() + \" reached the limit of \" + policy.maxBooks(m));\n        Loan loan = new Loan(m, b, today.plusDays(policy.loanDays(m)));\n        loanByIsbn.put(isbn, loan);\n        m.activeLoans().add(loan);\n        return loan;\n    }\n\n    void giveBack(Member m, String isbn) {\n        Loan loan = loanByIsbn.get(isbn);\n        if (loan == null || loan.member() != m) throw new IllegalStateException(\"This member does not hold \" + isbn);\n        loanByIsbn.remove(isbn);\n        m.activeLoans().remove(loan);\n    }\n\n    List<Loan> overdue(LocalDate today) {\n        List<Loan> out = new ArrayList<>();\n        for (Loan l : loanByIsbn.values()) if (l.isOverdue(today)) out.add(l);\n        return out;\n    }\n}\n\npublic class LibraryDemo {\n    public static void main(String[] args) {\n        Library lib = new Library(new StandardPolicy());\n        lib.addBook(new Book(\"111\", \"Clean Code\"));\n        lib.addBook(new Book(\"222\", \"Refactoring\"));\n        Member asha = new Member(\"M1\", \"Asha\");\n        LocalDate day1 = LocalDate.of(2026, 1, 1);\n        Loan l = lib.borrow(asha, \"111\", day1);\n        System.out.println(\"Due \" + l.due());                                   // 2026-01-15\n        System.out.println(\"Overdue on Jan 20: \" + lib.overdue(day1.plusDays(19)).size()); // 1\n        lib.giveBack(asha, \"111\");\n        System.out.println(\"Overdue after return: \" + lib.overdue(day1.plusDays(19)).size()); // 0\n    }\n}\n",
    g2_brute: "// THE GOD CLASS: everything about the parking lot lives in one place.\n// Spots are parallel arrays, vehicle types are strings, prices are magic numbers.\npublic class ParkingLotApp {\n    static String[] spotSize = {\"S\", \"M\", \"M\", \"L\"};   // S=bike, M=car, L=truck\n    static String[] spotPlate = new String[4];          // null = free\n    static long[] spotSince = new long[4];              // entry hour\n\n    static int park(String plate, String type, long hour) {\n        for (int i = 0; i < spotSize.length; i++) {\n            if (spotPlate[i] != null) continue;\n            if (type.equals(\"BIKE\") || (type.equals(\"CAR\") && !spotSize[i].equals(\"S\"))\n                    || (type.equals(\"TRUCK\") && spotSize[i].equals(\"L\"))) {\n                spotPlate[i] = plate;\n                spotSince[i] = hour;\n                return i;                               // the \"ticket\" is just an index\n            }\n        }\n        return -1;                                      // full (or wrong type string, who knows)\n    }\n\n    static long leave(int spot, String type, long hour) {\n        long hours = Math.max(1, hour - spotSince[spot]);\n        long fee;\n        if (type.equals(\"BIKE\")) fee = hours * 10;      // pricing tangled into exit logic\n        else if (type.equals(\"CAR\")) fee = hours * 20;\n        else fee = hours * 50;\n        spotPlate[spot] = null;                         // no check that the right car leaves\n        return fee;\n    }\n\n    public static void main(String[] args) {\n        int t = park(\"KA-01\", \"CAR\", 9);\n        System.out.println(\"Car at spot \" + t + \", pays \" + leave(t, \"CAR\", 12));\n    }\n}\n",
    g2_sol: "// The same behaviour, split by responsibility. Each class has one reason to change.\nenum SpotSize { S, M, L }\n\nenum VType {\n    BIKE(10, SpotSize.S, SpotSize.M, SpotSize.L), CAR(20, SpotSize.M, SpotSize.L), TRUCK(50, SpotSize.L);\n    final long rate;                       // rupees per hour (data, not if-else)\n    final List<SpotSize> fits;\n    VType(long rate, SpotSize... fits) { this.rate = rate; this.fits = List.of(fits); }\n}\n\nclass Spot {\n    final int id; final SpotSize size; String plate;\n    Spot(int id, SpotSize size) { this.id = id; this.size = size; }\n    boolean free() { return plate == null; }\n}\n\nrecord Ticket(int id, String plate, VType type, Spot spot, long entryHour) { }\n\ninterface Allocator { Optional<Spot> pick(List<Spot> spots, VType t); }\ninterface Pricer { long fee(Ticket t, long exitHour); }\n\nclass FirstFit implements Allocator {\n    public Optional<Spot> pick(List<Spot> spots, VType t) {\n        for (SpotSize want : t.fits)\n            for (Spot s : spots) if (s.free() && s.size == want) return Optional.of(s);\n        return Optional.empty();\n    }\n}\n\nclass PerHour implements Pricer {\n    public long fee(Ticket t, long exitHour) { return Math.max(1, exitHour - t.entryHour()) * t.type().rate; }\n}\n\nclass Lot {\n    private final List<Spot> spots; private final Allocator alloc; private final Pricer pricer;\n    private final Map<Integer, Ticket> open = new HashMap<>();\n    private int nextId = 1;\n    Lot(List<Spot> spots, Allocator a, Pricer p) { this.spots = spots; this.alloc = a; this.pricer = p; }\n\n    synchronized Ticket park(String plate, VType type, long hour) {\n        Spot s = alloc.pick(spots, type).orElseThrow(() -> new IllegalStateException(\"Full for \" + type));\n        s.plate = plate;\n        Ticket t = new Ticket(nextId++, plate, type, s, hour);\n        open.put(t.id(), t);\n        return t;\n    }\n\n    synchronized long leave(int ticketId, long hour) {\n        Ticket t = open.remove(ticketId);\n        if (t == null) throw new IllegalArgumentException(\"Bad ticket \" + ticketId);\n        t.spot().plate = null;\n        return pricer.fee(t, hour);\n    }\n}\n\npublic class RefactoredDemo {\n    public static void main(String[] args) {\n        List<Spot> spots = List.of(new Spot(0, SpotSize.S), new Spot(1, SpotSize.M), new Spot(2, SpotSize.M), new Spot(3, SpotSize.L));\n        Lot lot = new Lot(spots, new FirstFit(), new PerHour());\n        Ticket t = lot.park(\"KA-01\", VType.CAR, 9);\n        System.out.println(\"Car at spot \" + t.spot().id + \", pays \" + lot.leave(t.id(), 12)); // spot 1, pays 60\n    }\n}\n",
    g3_brute: "// BRUTE: one method, one hand-written branch per vehicle type, fit rules copy-pasted.\n// Adding a new strategy means copying the whole method; adding EV means editing every branch.\nclass SpotFinder {\n    // layout[floor][i] is \"S\", \"M\" or \"L\"; taken[floor][i] marks occupied spots\n    static String find(String[][] layout, boolean[][] taken, String vehicle) {\n        for (int f = 0; f < layout.length; f++) {\n            if (vehicle.equals(\"BIKE\")) {\n                for (int i = 0; i < layout[f].length; i++) if (!taken[f][i] && layout[f][i].equals(\"S\")) return f + \"-\" + i;\n                for (int i = 0; i < layout[f].length; i++) if (!taken[f][i] && layout[f][i].equals(\"M\")) return f + \"-\" + i;\n                for (int i = 0; i < layout[f].length; i++) if (!taken[f][i] && layout[f][i].equals(\"L\")) return f + \"-\" + i;\n            } else if (vehicle.equals(\"CAR\")) {\n                for (int i = 0; i < layout[f].length; i++) if (!taken[f][i] && layout[f][i].equals(\"M\")) return f + \"-\" + i;\n                for (int i = 0; i < layout[f].length; i++) if (!taken[f][i] && layout[f][i].equals(\"L\")) return f + \"-\" + i;\n            } else if (vehicle.equals(\"TRUCK\")) {\n                for (int i = 0; i < layout[f].length; i++) if (!taken[f][i] && layout[f][i].equals(\"L\")) return f + \"-\" + i;\n            }\n        }\n        return \"FULL\";\n    }\n}\n",
    g3_sol: "enum SpotType { SMALL, COMPACT, LARGE }\n\nenum VehicleType {\n    BIKE(SpotType.SMALL, SpotType.COMPACT, SpotType.LARGE),\n    CAR(SpotType.COMPACT, SpotType.LARGE),\n    TRUCK(SpotType.LARGE);\n    private final List<SpotType> fits;\n    VehicleType(SpotType... f) { fits = List.of(f); }\n    List<SpotType> fits() { return fits; }          // the ONLY place fit rules live\n}\n\nclass Spot {\n    final int floor, index; final SpotType type; boolean taken;\n    Spot(int floor, int index, SpotType type) { this.floor = floor; this.index = index; this.type = type; }\n    String id() { return floor + \"-\" + index; }\n}\n\ninterface SpotAllocationStrategy {\n    Optional<Spot> find(List<List<Spot>> floors, VehicleType v);\n}\n\n/** Stay as low as possible (less driving); on a floor, use the smallest spot that fits. */\nclass NearestFirst implements SpotAllocationStrategy {\n    public Optional<Spot> find(List<List<Spot>> floors, VehicleType v) {\n        for (List<Spot> floor : floors)\n            for (SpotType want : v.fits())\n                for (Spot s : floor) if (!s.taken && s.type == want) return Optional.of(s);\n        return Optional.empty();\n    }\n}\n\n/** Protect big spots: try the smallest fitting type on EVERY floor before using a bigger type. */\nclass BestFitFirst implements SpotAllocationStrategy {\n    public Optional<Spot> find(List<List<Spot>> floors, VehicleType v) {\n        for (SpotType want : v.fits())\n            for (List<Spot> floor : floors)\n                for (Spot s : floor) if (!s.taken && s.type == want) return Optional.of(s);\n        return Optional.empty();\n    }\n}\n\npublic class AllocationDemo {\n    static List<List<Spot>> build(String... floors) {\n        List<List<Spot>> out = new ArrayList<>();\n        for (int f = 0; f < floors.length; f++) {\n            List<Spot> row = new ArrayList<>();\n            for (int i = 0; i < floors[f].length(); i++) {\n                char c = floors[f].charAt(i);\n                row.add(new Spot(f, i, c == 'S' ? SpotType.SMALL : c == 'M' ? SpotType.COMPACT : SpotType.LARGE));\n            }\n            out.add(row);\n        }\n        return out;\n    }\n\n    public static void main(String[] args) {\n        for (SpotAllocationStrategy st : List.of(new NearestFirst(), new BestFitFirst())) {\n            List<List<Spot>> lot = build(\"SL\", \"SM\");      // floor 0 has no COMPACT, floor 1 does\n            Spot s = st.find(lot, VehicleType.CAR).orElseThrow();\n            System.out.println(st.getClass().getSimpleName() + \" puts the car at \" + s.id());\n        }\n        // NearestFirst puts the car at 0-1  (LARGE on floor 0: less walking)\n        // BestFitFirst puts the car at 1-1  (COMPACT on floor 1: keeps LARGE for trucks)\n    }\n}\n",
    g4_brute: "// BRUTE: the fee rules are an if-else ladder buried inside the exit method.\nclass ExitCounter {\n    static long fee(String type, long minutes, boolean lostTicket) {\n        if (lostTicket) return 500;\n        long hours = (minutes + 59) / 60;\n        long fee;\n        if (type.equals(\"CAR\")) {\n            if (hours <= 2) fee = 30; else fee = 30 + (hours - 2) * 20;\n            if (fee > 200) fee = 200;\n        } else if (type.equals(\"BIKE\")) {\n            if (hours <= 2) fee = 10; else fee = 10 + (hours - 2) * 5;\n            if (fee > 60) fee = 60;\n        } else {\n            fee = hours * 100;                        // trucks: someone forgot the cap here\n        }\n        return fee;\n    }\n}\n",
    g4_sol: "import java.time.Duration;\n\n/** Every pricing rule is a PricingStrategy; rules are combined by wrapping (Decorator). */\ninterface PricingStrategy { long fee(Duration parked); }\n\n/** First block of time costs a flat amount, then a rate per started hour. */\nclass SlabPricing implements PricingStrategy {\n    private final long firstHours, firstBlock, perHourAfter;\n    SlabPricing(long firstHours, long firstBlock, long perHourAfter) {\n        this.firstHours = firstHours; this.firstBlock = firstBlock; this.perHourAfter = perHourAfter;\n    }\n    public long fee(Duration parked) {\n        long hours = Math.max(1, (parked.toMinutes() + 59) / 60);   // started hours, at least 1\n        return hours <= firstHours ? firstBlock : firstBlock + (hours - firstHours) * perHourAfter;\n    }\n}\n\n/** Decorator: caps whatever the wrapped strategy charges, per started 24-hour day. */\nclass DailyCap implements PricingStrategy {\n    private final PricingStrategy inner; private final long capPerDay;\n    DailyCap(PricingStrategy inner, long capPerDay) { this.inner = inner; this.capPerDay = capPerDay; }\n    public long fee(Duration parked) {\n        long fullDays = parked.toHours() / 24;\n        Duration rest = parked.minusHours(fullDays * 24);\n        long restFee = rest.isZero() ? 0 : Math.min(capPerDay, inner.fee(rest));\n        return fullDays * capPerDay + restFee;\n    }\n}\n\nenum VehicleType { BIKE, CAR, TRUCK }\n\n/** One place that maps a vehicle type to its rule chain. New type = one new line here. */\nclass Tariff {\n    private final Map<VehicleType, PricingStrategy> rules = new EnumMap<>(VehicleType.class);\n    private final long lostTicketPenalty;\n    Tariff(long lostTicketPenalty) {\n        this.lostTicketPenalty = lostTicketPenalty;\n        rules.put(VehicleType.BIKE, new DailyCap(new SlabPricing(2, 10, 5), 60));\n        rules.put(VehicleType.CAR, new DailyCap(new SlabPricing(2, 30, 20), 200));\n        rules.put(VehicleType.TRUCK, new DailyCap(new SlabPricing(1, 100, 100), 800));\n    }\n    long fee(VehicleType t, Duration parked, boolean lostTicket) {\n        long normal = rules.get(t).fee(parked);\n        return lostTicket ? Math.max(normal, lostTicketPenalty) : normal;\n    }\n}\n\npublic class TariffDemo {\n    public static void main(String[] args) {\n        Tariff tariff = new Tariff(500);\n        System.out.println(tariff.fee(VehicleType.CAR, Duration.ofMinutes(90), false));  // 30 (inside first 2h)\n        System.out.println(tariff.fee(VehicleType.CAR, Duration.ofMinutes(250), false)); // 5h -> 30 + 3*20 = 90\n        System.out.println(tariff.fee(VehicleType.CAR, Duration.ofHours(30), false));    // 200 + fee(6h)=110 -> 310\n        System.out.println(tariff.fee(VehicleType.CAR, Duration.ofHours(1), true));      // lost ticket -> 500\n    }\n}\n",
    g5_brute: "// BRUTE: after every move, rescan every row, column and both diagonals: O(n^2) per move.\nclass TicTacToeBrute {\n    private final int n;\n    private final int[][] board;\n    TicTacToeBrute(int n) { this.n = n; board = new int[n][n]; }\n\n    /** player is 1 or 2. Returns the winner (1 or 2) or 0 if nobody has won yet. */\n    int move(int row, int col, int player) {\n        board[row][col] = player;\n        for (int r = 0; r < n; r++) {                    // every row\n            boolean all = true;\n            for (int c = 0; c < n; c++) all &= board[r][c] == player;\n            if (all) return player;\n        }\n        for (int c = 0; c < n; c++) {                    // every column\n            boolean all = true;\n            for (int r = 0; r < n; r++) all &= board[r][c] == player;\n            if (all) return player;\n        }\n        boolean d = true, a = true;                      // both diagonals\n        for (int i = 0; i < n; i++) { d &= board[i][i] == player; a &= board[i][n - 1 - i] == player; }\n        return d || a ? player : 0;\n    }\n}\n",
    g5_sol: "/**\n * O(1) per move. Player 1 adds +1, player 2 adds -1 to the counters of the row, column\n * and (if on them) diagonals. A line belongs entirely to one player exactly when its\n * counter reaches +n or -n, because a mixed line can never reach the extreme.\n */\nclass TicTacToe {\n    private final int n;\n    private final int[] rows, cols;\n    private int diag, anti;\n\n    TicTacToe(int n) { this.n = n; rows = new int[n]; cols = new int[n]; }\n\n    int move(int row, int col, int player) {\n        int add = player == 1 ? 1 : -1;\n        rows[row] += add;\n        cols[col] += add;\n        if (row == col) diag += add;\n        if (row + col == n - 1) anti += add;\n        int target = add * n;                            // +n for player 1, -n for player 2\n        if (rows[row] == target || cols[col] == target || diag == target || anti == target) return player;\n        return 0;\n    }\n}\n\npublic class Lc348Demo {\n    public static void main(String[] args) {\n        TicTacToe t = new TicTacToe(3);\n        int[][] moves = {{0, 0, 1}, {0, 2, 2}, {2, 2, 1}, {1, 1, 2}, {2, 0, 1}, {1, 0, 2}, {2, 1, 1}};\n        for (int[] m : moves) System.out.print(t.move(m[0], m[1], m[2]) + \" \");\n        System.out.println();                            // 0 0 0 0 0 0 1  (row 2 = 1,1,1)\n    }\n}\n",
    g6_brute: "// BRUTE: copy the whole board before every move so undo can restore it.\n// Works, but costs O(n^2) memory per move and the win-check state is not restored with it.\nclass SnapshotGame {\n    private char[][] board;\n    private final Deque<char[][]> history = new ArrayDeque<>();\n    SnapshotGame(int n) { board = new char[n][n]; for (char[] r : board) Arrays.fill(r, '.'); }\n\n    void play(int r, int c, char s) {\n        char[][] copy = new char[board.length][];\n        for (int i = 0; i < board.length; i++) copy[i] = board[i].clone();   // full deep copy, every move\n        history.push(copy);\n        board[r][c] = s;\n    }\n\n    void undo() { if (!history.isEmpty()) board = history.pop(); }\n}\n",
    g6_sol: "/** Command pattern: each move knows how to do AND undo itself. */\ninterface Command { void execute(); void undo(); }\n\nclass Board3 {\n    final int n; final char[][] cells; final int[][] rows, cols; final int[] diag, anti;\n    Board3(int n) {\n        this.n = n; cells = new char[n][n];\n        for (char[] r : cells) Arrays.fill(r, '.');\n        rows = new int[2][n]; cols = new int[2][n]; diag = new int[2]; anti = new int[2];\n    }\n    /** delta = +1 to place, -1 to remove. Always updates ALL counters so undo is exact. */\n    void apply(int r, int c, int p, char sym, int delta) {\n        cells[r][c] = delta > 0 ? sym : '.';\n        rows[p][r] += delta; cols[p][c] += delta;\n        if (r == c) diag[p] += delta;\n        if (r + c == n - 1) anti[p] += delta;\n    }\n    boolean wins(int r, int c, int p) {\n        return rows[p][r] == n || cols[p][c] == n || (r == c && diag[p] == n) || (r + c == n - 1 && anti[p] == n);\n    }\n}\n\nclass MoveCommand implements Command {\n    private final Board3 b; private final int r, c, p; private final char sym;\n    MoveCommand(Board3 b, int r, int c, int p, char sym) { this.b = b; this.r = r; this.c = c; this.p = p; this.sym = sym; }\n    public void execute() { b.apply(r, c, p, sym, +1); }\n    public void undo() { b.apply(r, c, p, sym, -1); }\n    boolean wins() { return b.wins(r, c, p); }\n}\n\nclass UndoableGame {\n    private final Board3 board;\n    private final Deque<MoveCommand> undo = new ArrayDeque<>(), redo = new ArrayDeque<>();\n    private final char[] symbols = {'X', 'O'};\n    private int turn = 0; private boolean over = false;\n    UndoableGame(int n) { board = new Board3(n); }\n\n    String play(int r, int c) {\n        if (over) throw new IllegalStateException(\"game over - undo first\");\n        if (board.cells[r][c] != '.') throw new IllegalArgumentException(\"occupied\");\n        MoveCommand m = new MoveCommand(board, r, c, turn, symbols[turn]);\n        m.execute();\n        undo.push(m);\n        redo.clear();                                    // a new move kills the redo branch\n        if (m.wins()) { over = true; return symbols[turn] + \" wins\"; }\n        turn ^= 1;\n        return \"ok\";\n    }\n\n    boolean undo() {\n        if (undo.isEmpty()) return false;\n        MoveCommand m = undo.pop();\n        m.undo();\n        redo.push(m);\n        if (over) over = false; else turn ^= 1;          // winner's turn stays with them after undo\n        return true;\n    }\n\n    boolean redo() {\n        if (redo.isEmpty()) return false;\n        MoveCommand m = redo.pop();\n        m.execute();\n        undo.push(m);\n        if (m.wins()) over = true; else turn ^= 1;\n        return true;\n    }\n\n    String row(int r) { return new String(board.cells[r]); }\n}\n\npublic class UndoDemo {\n    public static void main(String[] args) {\n        UndoableGame g = new UndoableGame(3);\n        g.play(0, 0); g.play(1, 0); g.play(0, 1); g.play(1, 1);\n        System.out.println(g.play(0, 2));                // X wins\n        g.undo();                                        // take back the winning move\n        System.out.println(g.row(0));                    // XX.\n        System.out.println(g.play(2, 2));                // ok  (X plays elsewhere instead)\n        System.out.println(g.redo());                    // false: redo branch was cleared\n    }\n}\n",
    p01_brute: "// BRUTE: string comparisons scattered wherever a fit check is needed.\nclass FitCheck {\n    static boolean canPark(String vehicle, String spot) {\n        if (vehicle.equals(\"BIKE\")) return true;\n        if (vehicle.equals(\"CAR\")) return spot.equals(\"COMPACT\") || spot.equals(\"LARGE\");\n        if (vehicle.equals(\"TRUCK\")) return spot.equals(\"LARGE\");\n        return false;                                    // typo \"Car\" silently returns false\n    }\n}\n",
    p01_sol: "/** Spot sizes are ordered: SMALL < COMPACT < LARGE. ordinal() gives that order for free. */\nenum SpotType { SMALL, COMPACT, LARGE }\n\n/** Each vehicle states the smallest spot it needs. Any spot at least that big fits. */\nenum VehicleType {\n    BIKE(SpotType.SMALL), CAR(SpotType.COMPACT), TRUCK(SpotType.LARGE), BUS(SpotType.LARGE);\n    private final SpotType minSpot;\n    VehicleType(SpotType minSpot) { this.minSpot = minSpot; }\n\n    boolean canPark(SpotType spot) { return spot.ordinal() >= minSpot.ordinal(); }\n\n    /** All fitting spot types, smallest first: the preference order for allocation. */\n    List<SpotType> fits() {\n        List<SpotType> out = new ArrayList<>();\n        for (SpotType s : SpotType.values()) if (canPark(s)) out.add(s);\n        return out;\n    }\n}\n\npublic class FitDemo {\n    public static void main(String[] args) {\n        System.out.println(VehicleType.CAR.canPark(SpotType.SMALL));   // false\n        System.out.println(VehicleType.CAR.canPark(SpotType.LARGE));   // true\n        System.out.println(VehicleType.BIKE.fits());                   // [SMALL, COMPACT, LARGE]\n        System.out.println(VehicleType.valueOf(\"TRUCK\").fits());       // [LARGE]\n    }\n}\n",
    p02_brute: "// BRUTE: rebuild the whole board every move and check all 8 lines.\nclass WinnerBrute {\n    static String tictactoe(int[][] moves) {\n        char[][] b = new char[3][3];\n        for (int i = 0; i < moves.length; i++) b[moves[i][0]][moves[i][1]] = i % 2 == 0 ? 'X' : 'O';\n        for (char p : new char[]{'X', 'O'}) {\n            for (int i = 0; i < 3; i++) {\n                if (b[i][0] == p && b[i][1] == p && b[i][2] == p) return p == 'X' ? \"A\" : \"B\";\n                if (b[0][i] == p && b[1][i] == p && b[2][i] == p) return p == 'X' ? \"A\" : \"B\";\n            }\n            if (b[0][0] == p && b[1][1] == p && b[2][2] == p) return p == 'X' ? \"A\" : \"B\";\n            if (b[0][2] == p && b[1][1] == p && b[2][0] == p) return p == 'X' ? \"A\" : \"B\";\n        }\n        return moves.length == 9 ? \"Draw\" : \"Pending\";\n    }\n}\n",
    p02_sol: "class Solution {\n    /** LeetCode 1275. A = first player (+1), B = second player (-1). Counters per line. */\n    public String tictactoe(int[][] moves) {\n        int n = 3;\n        int[] rows = new int[n], cols = new int[n];\n        int diag = 0, anti = 0;\n        for (int i = 0; i < moves.length; i++) {\n            int r = moves[i][0], c = moves[i][1];\n            int add = i % 2 == 0 ? 1 : -1;\n            rows[r] += add; cols[c] += add;\n            if (r == c) diag += add;\n            if (r + c == n - 1) anti += add;\n            if (Math.abs(rows[r]) == n || Math.abs(cols[c]) == n || Math.abs(diag) == n || Math.abs(anti) == n)\n                return add == 1 ? \"A\" : \"B\";\n        }\n        return moves.length == n * n ? \"Draw\" : \"Pending\";\n    }\n\n    public static void main(String[] args) {\n        Solution s = new Solution();\n        System.out.println(s.tictactoe(new int[][]{{0, 0}, {2, 0}, {1, 1}, {2, 1}, {2, 2}}));          // A\n        System.out.println(s.tictactoe(new int[][]{{0, 0}, {1, 1}, {0, 1}, {0, 2}, {1, 0}, {2, 0}})); // B\n        System.out.println(s.tictactoe(new int[][]{{0, 0}, {1, 1}}));                                  // Pending\n    }\n}\n",
    p03_brute: "// BRUTE: count free spots by scanning every spot each time the board refreshes.\nclass BoardScan {\n    static Map<String, Integer> freeCounts(String[] types, boolean[] taken) {\n        Map<String, Integer> m = new TreeMap<>();\n        for (int i = 0; i < types.length; i++) if (!taken[i]) m.merge(types[i], 1, Integer::sum);\n        return m;                                        // O(total spots) per refresh, many refreshes per second\n    }\n}\n",
    p03_sol: "enum SpotType { SMALL, COMPACT, LARGE }\n\n/** Observer: anyone who wants to hear about spots changing. */\ninterface SpotListener { void onOccupied(SpotType t); void onFreed(SpotType t); }\n\n/** The display board keeps running counters, so reading them is O(1). */\nclass DisplayBoard implements SpotListener {\n    private final Map<SpotType, Integer> free = new EnumMap<>(SpotType.class);\n    DisplayBoard(Map<SpotType, Integer> initial) { free.putAll(initial); }\n    public void onOccupied(SpotType t) { free.merge(t, -1, Integer::sum); }\n    public void onFreed(SpotType t) { free.merge(t, 1, Integer::sum); }\n    String show() { return free.toString(); }\n}\n\n/** The lot publishes events; it does not know or care who listens (screens, apps, analytics). */\nclass Lot {\n    private final SpotType[] types; private final boolean[] taken;\n    private final List<SpotListener> listeners = new ArrayList<>();\n    Lot(SpotType... types) { this.types = types; this.taken = new boolean[types.length]; }\n    void subscribe(SpotListener l) { listeners.add(l); }\n    Map<SpotType, Integer> counts() {\n        Map<SpotType, Integer> m = new EnumMap<>(SpotType.class);\n        for (SpotType t : SpotType.values()) m.put(t, 0);\n        for (int i = 0; i < types.length; i++) if (!taken[i]) m.merge(types[i], 1, Integer::sum);\n        return m;\n    }\n    void occupy(int i) { if (taken[i]) throw new IllegalStateException(\"taken\"); taken[i] = true; listeners.forEach(l -> l.onOccupied(types[i])); }\n    void free(int i) { if (!taken[i]) throw new IllegalStateException(\"already free\"); taken[i] = false; listeners.forEach(l -> l.onFreed(types[i])); }\n}\n\npublic class DisplayDemo {\n    public static void main(String[] args) {\n        Lot lot = new Lot(SpotType.SMALL, SpotType.COMPACT, SpotType.COMPACT, SpotType.LARGE);\n        DisplayBoard board = new DisplayBoard(lot.counts());   // seed once with a scan\n        lot.subscribe(board);\n        lot.occupy(1); lot.occupy(3);\n        System.out.println(board.show());                       // {SMALL=1, COMPACT=1, LARGE=0}\n        lot.free(3);\n        System.out.println(board.show());                       // {SMALL=1, COMPACT=1, LARGE=1}\n    }\n}\n",
    p04_brute: "// BRUTE: a mode string decides the formula; every new tariff edits this switch.\nclass FeeCalc {\n    static long fee(String mode, long minutes) {\n        switch (mode) {\n            case \"FLAT\": return 100;\n            case \"HOURLY\": return Math.max(1, (minutes + 59) / 60) * 40;\n            case \"WEEKEND\": return Math.max(1, (minutes + 59) / 60) * 60;   // copy-paste with a new number\n            default: throw new IllegalArgumentException(mode);\n        }\n    }\n}\n",
    p04_sol: "/** Strategy pattern: a functional interface, so simple tariffs can even be lambdas. */\n@FunctionalInterface\ninterface PricingStrategy { long fee(long minutes); }\n\nclass FlatPricing implements PricingStrategy {\n    private final long amount;\n    FlatPricing(long amount) { this.amount = amount; }\n    public long fee(long minutes) { return amount; }\n}\n\nclass HourlyPricing implements PricingStrategy {\n    private final long perHour;\n    HourlyPricing(long perHour) { this.perHour = perHour; }\n    public long fee(long minutes) { return Math.max(1, (minutes + 59) / 60) * perHour; }\n}\n\n/** The context: it holds a strategy and can be switched at runtime (e.g. on weekends). */\nclass FeeCalculator {\n    private PricingStrategy strategy;\n    FeeCalculator(PricingStrategy s) { strategy = s; }\n    void setStrategy(PricingStrategy s) { strategy = s; }\n    long charge(long minutes) { return strategy.fee(minutes); }\n}\n\npublic class PricingDemo {\n    public static void main(String[] args) {\n        FeeCalculator calc = new FeeCalculator(new HourlyPricing(40));\n        System.out.println(calc.charge(61));          // 2 started hours -> 80\n        calc.setStrategy(new FlatPricing(100));\n        System.out.println(calc.charge(61));          // 100\n        calc.setStrategy(m -> m <= 15 ? 0 : 50);      // \"first 15 minutes free\" as a lambda\n        System.out.println(calc.charge(10));          // 0\n    }\n}\n",
    p05_brute: "// BRUTE: play every possible game from the empty board, remember every board we can reach,\n// then check membership. Only 5,478 legal 3x3 positions exist, so it runs, but it does not scale to N x N.\nclass ValidBrute {\n    private final Set<String> reachable = new HashSet<>();\n\n    boolean validTicTacToe(String[] board) {\n        dfs(new char[]{'.', '.', '.', '.', '.', '.', '.', '.', '.'}, 'X');\n        return reachable.contains(String.join(\"\", board).replace(' ', '.'));\n    }\n\n    private void dfs(char[] b, char turn) {\n        String key = new String(b);\n        if (!reachable.add(key)) return;\n        if (won(b, 'X') || won(b, 'O')) return;          // nobody moves after a win\n        for (int i = 0; i < 9; i++) if (b[i] == '.') {\n            b[i] = turn;\n            dfs(b, turn == 'X' ? 'O' : 'X');\n            b[i] = '.';\n        }\n    }\n\n    private boolean won(char[] b, char p) {\n        int[][] lines = {{0,1,2},{3,4,5},{6,7,8},{0,3,6},{1,4,7},{2,5,8},{0,4,8},{2,4,6}};\n        for (int[] l : lines) if (b[l[0]] == p && b[l[1]] == p && b[l[2]] == p) return true;\n        return false;\n    }\n}\n",
    p05_sol: "class Solution {\n    /** LeetCode 794: can this board appear in a real game where X moves first? */\n    public boolean validTicTacToe(String[] board) {\n        int x = 0, o = 0;\n        for (String row : board)\n            for (char ch : row.toCharArray()) { if (ch == 'X') x++; else if (ch == 'O') o++; }\n        if (o > x || x - o > 1) return false;           // turns alternate, X first\n        boolean xWin = wins(board, 'X'), oWin = wins(board, 'O');\n        if (xWin && oWin) return false;                 // the game would have stopped earlier\n        if (xWin && x != o + 1) return false;           // X just moved, so X has one extra\n        if (oWin && x != o) return false;               // O just moved, so counts are equal\n        return true;\n    }\n\n    private boolean wins(String[] b, char p) {\n        for (int i = 0; i < 3; i++) {\n            if (b[i].charAt(0) == p && b[i].charAt(1) == p && b[i].charAt(2) == p) return true;\n            if (b[0].charAt(i) == p && b[1].charAt(i) == p && b[2].charAt(i) == p) return true;\n        }\n        return (b[0].charAt(0) == p && b[1].charAt(1) == p && b[2].charAt(2) == p)\n            || (b[0].charAt(2) == p && b[1].charAt(1) == p && b[2].charAt(0) == p);\n    }\n\n    public static void main(String[] args) {\n        Solution s = new Solution();\n        System.out.println(s.validTicTacToe(new String[]{\"O  \", \"   \", \"   \"}));   // false: O moved first\n        System.out.println(s.validTicTacToe(new String[]{\"XOX\", \" X \", \"   \"}));   // false: X has 2 extra\n        System.out.println(s.validTicTacToe(new String[]{\"XXX\", \"   \", \"OOO\"}));   // false: both won\n        System.out.println(s.validTicTacToe(new String[]{\"XOX\", \"O O\", \"XOX\"}));   // true\n    }\n}\n",
    p06_brute: "// BRUTE: after each drop, scan every cell in every direction: O(rows * cols) per move.\nclass ConnectFourBrute {\n    static boolean anyWin(char[][] g, char p) {\n        int R = g.length, C = g[0].length;\n        int[][] dirs = {{0, 1}, {1, 0}, {1, 1}, {1, -1}};\n        for (int r = 0; r < R; r++)\n            for (int c = 0; c < C; c++)\n                for (int[] d : dirs) {\n                    int k = 0;\n                    while (k < 4) {\n                        int rr = r + d[0] * k, cc = c + d[1] * k;\n                        if (rr < 0 || rr >= R || cc < 0 || cc >= C || g[rr][cc] != p) break;\n                        k++;\n                    }\n                    if (k == 4) return true;\n                }\n        return false;\n    }\n}\n",
    p06_sol: "/** Connect Four: gravity drop + check only the 4 lines through the new disc. */\nclass ConnectFour {\n    private final int rows, cols, k;\n    private final char[][] grid;\n    private final int[] height;                   // next free row per column, counted from the bottom\n    private int moves = 0;\n\n    ConnectFour(int rows, int cols, int k) {\n        this.rows = rows; this.cols = cols; this.k = k;\n        grid = new char[rows][cols];\n        for (char[] r : grid) Arrays.fill(r, '.');\n        height = new int[cols];\n    }\n\n    /** Drops a disc; returns \"WIN\", \"DRAW\" or \"OK\". Throws on a full or bad column. */\n    String drop(int col, char p) {\n        if (col < 0 || col >= cols || height[col] == rows) throw new IllegalArgumentException(\"Column \" + col + \" is not playable\");\n        int r = rows - 1 - height[col]++;         // row 0 is the top, so discs fall to the largest row\n        grid[r][col] = p;\n        moves++;\n        int[][] dirs = {{0, 1}, {1, 0}, {1, 1}, {1, -1}};\n        for (int[] d : dirs) {\n            int count = 1 + run(r, col, d[0], d[1], p) + run(r, col, -d[0], -d[1], p);\n            if (count >= k) return \"WIN\";\n        }\n        return moves == rows * cols ? \"DRAW\" : \"OK\";\n    }\n\n    /** How many same discs continue from (r,c) in direction (dr,dc), not counting (r,c). */\n    private int run(int r, int c, int dr, int dc, char p) {\n        int n = 0;\n        for (int rr = r + dr, cc = c + dc; rr >= 0 && rr < rows && cc >= 0 && cc < cols && grid[rr][cc] == p; rr += dr, cc += dc) n++;\n        return n;\n    }\n\n    public static void main(String[] args) {\n        ConnectFour g = new ConnectFour(6, 7, 4);\n        int[] cols = {0, 1, 1, 2, 2, 3, 2, 3, 3, 6, 3};\n        String res = \"\";\n        for (int i = 0; i < cols.length; i++) res = g.drop(cols[i], i % 2 == 0 ? 'R' : 'Y');\n        System.out.println(res);                  // WIN (red completes a diagonal 0,1,2,3)\n    }\n}\n",
    p07_brute: "// BRUTE: rescan the whole R x C board for K-in-a-row after every move: O(R*C*K) per move.\nclass GomokuBrute {\n    static boolean wins(char[][] b, char p, int k) {\n        int R = b.length, C = b[0].length;\n        for (int r = 0; r < R; r++)\n            for (int c = 0; c < C; c++) {\n                if (b[r][c] != p) continue;\n                int[][] dirs = {{0, 1}, {1, 0}, {1, 1}, {1, -1}};\n                for (int[] d : dirs) {\n                    int len = 0;\n                    for (int rr = r, cc = c; rr >= 0 && rr < R && cc >= 0 && cc < C && b[rr][cc] == p; rr += d[0], cc += d[1]) len++;\n                    if (len >= k) return true;\n                }\n            }\n        return false;\n    }\n}\n",
    p07_sol: "/** Rules are a strategy, so \"3 in a row on 3x3\" and \"5 in a row on 15x15\" share one Game class. */\ninterface WinRule { boolean isWin(char[][] b, int r, int c); }\n\n/** K in a row in any of 4 directions, counted outward from the last move only: O(K) per move. */\nclass KInARow implements WinRule {\n    private final int k;\n    KInARow(int k) { this.k = k; }\n    public boolean isWin(char[][] b, int r, int c) {\n        char p = b[r][c];\n        int[][] dirs = {{0, 1}, {1, 0}, {1, 1}, {1, -1}};\n        for (int[] d : dirs) {\n            int count = 1;\n            for (int s = -1; s <= 1; s += 2) {             // walk both ways along the line\n                int rr = r + s * d[0], cc = c + s * d[1];\n                while (rr >= 0 && rr < b.length && cc >= 0 && cc < b[0].length && b[rr][cc] == p && count < k) {\n                    count++; rr += s * d[0]; cc += s * d[1];\n                }\n            }\n            if (count >= k) return true;\n        }\n        return false;\n    }\n}\n\nclass GridGame {\n    private final char[][] b; private final WinRule rule; private final char[] players; private int turn;\n    GridGame(int rows, int cols, WinRule rule, char... players) {\n        b = new char[rows][cols]; for (char[] row : b) Arrays.fill(row, '.');\n        this.rule = rule; this.players = players;\n    }\n    /** Returns the winner symbol, or '.' if the game goes on. */\n    char play(int r, int c) {\n        if (b[r][c] != '.') throw new IllegalArgumentException(\"occupied\");\n        char p = players[turn];\n        b[r][c] = p;\n        if (rule.isWin(b, r, c)) return p;\n        turn = (turn + 1) % players.length;\n        return '.';\n    }\n\n    public static void main(String[] args) {\n        GridGame g = new GridGame(15, 15, new KInARow(5), 'X', 'O');\n        char w = '.';\n        for (int i = 0; i < 5 && w == '.'; i++) {\n            w = g.play(7, 3 + i);                         // X builds a row\n            if (w == '.') w = g.play(0, i);               // O plays far away\n        }\n        System.out.println(\"Winner: \" + w);               // Winner: X\n    }\n}\n",
    p08_brute: "// BRUTE: one global list of reservations; every request scans all of them for every spot.\nclass ReservationsBrute {\n    record Res(int spot, int start, int end) { }\n    private final List<Res> all = new ArrayList<>();\n    private final int spots;\n    ReservationsBrute(int spots) { this.spots = spots; }\n\n    int reserve(int start, int end) {\n        for (int s = 0; s < spots; s++) {\n            boolean clash = false;\n            for (Res r : all) if (r.spot() == s && start < r.end() && r.start() < end) { clash = true; break; }\n            if (!clash) { all.add(new Res(s, start, end)); return s; }\n        }\n        return -1;                                     // O(spots * total reservations) per request\n    }\n}\n",
    p08_sol: "/** Each spot keeps its own calendar: start -> end, sorted, with no overlaps (half-open [start, end)). */\nclass SpotCalendar {\n    final String spotId;\n    private final TreeMap<Integer, Integer> booked = new TreeMap<>();\n    SpotCalendar(String spotId) { this.spotId = spotId; }\n\n    /** Free if the booking just before ends by `start` and the one just after starts at or after `end`. */\n    boolean isFree(int start, int end) {\n        Map.Entry<Integer, Integer> before = booked.floorEntry(start);\n        if (before != null && before.getValue() > start) return false;\n        Integer after = booked.ceilingKey(start);\n        return after == null || after >= end;\n    }\n    void book(int start, int end) { booked.put(start, end); }\n    void cancel(int start) { booked.remove(start); }\n}\n\nrecord Reservation(String id, String spotId, int start, int end) { }\n\nclass ReservationService {\n    private final Map<String, List<SpotCalendar>> calendarsByType = new HashMap<>();\n    private final Map<String, Reservation> byId = new HashMap<>();\n    private final Map<String, SpotCalendar> calendarById = new HashMap<>();\n    private int seq = 1;\n\n    void addSpot(String type, String spotId) {\n        SpotCalendar cal = new SpotCalendar(spotId);\n        calendarsByType.computeIfAbsent(type, k -> new ArrayList<>()).add(cal);\n        calendarById.put(spotId, cal);\n    }\n\n    synchronized Optional<Reservation> reserve(String type, int start, int end) {\n        if (start >= end) throw new IllegalArgumentException(\"start must be before end\");\n        for (SpotCalendar cal : calendarsByType.getOrDefault(type, List.of())) {\n            if (cal.isFree(start, end)) {\n                cal.book(start, end);\n                Reservation r = new Reservation(\"R\" + seq++, cal.spotId, start, end);\n                byId.put(r.id(), r);\n                return Optional.of(r);\n            }\n        }\n        return Optional.empty();\n    }\n\n    synchronized boolean cancel(String reservationId) {\n        Reservation r = byId.remove(reservationId);\n        if (r == null) return false;\n        calendarById.get(r.spotId()).cancel(r.start());\n        return true;\n    }\n\n    public static void main(String[] args) {\n        ReservationService svc = new ReservationService();\n        svc.addSpot(\"CAR\", \"A1\"); svc.addSpot(\"CAR\", \"A2\");\n        System.out.println(svc.reserve(\"CAR\", 9, 12));   // R1 on A1\n        System.out.println(svc.reserve(\"CAR\", 10, 11));  // R2 on A2 (A1 busy 9-12)\n        System.out.println(svc.reserve(\"CAR\", 11, 13));  // R3 on A2: its [10,11) ends exactly at 11\n        System.out.println(svc.reserve(\"CAR\", 12, 14));  // R4 on A1: [9,12) and [12,14) touch, no overlap\n        svc.cancel(\"R2\");\n        System.out.println(svc.reserve(\"CAR\", 10, 11));  // R5 on A2 (the freed 10-11 gap)\n    }\n}\n",
    p09_brute: "// BRUTE: subclass explosion. Every combination of features becomes a new class.\nclass HourlyFee { long fee(long hours, double kwh) { return hours * 20; } }\nclass HourlyWithCharging extends HourlyFee { long fee(long hours, double kwh) { return super.fee(hours, kwh) + Math.round(kwh * 15); } }\nclass HourlyWithValet extends HourlyFee { long fee(long hours, double kwh) { return super.fee(hours, kwh) + 100; } }\nclass HourlyWithChargingAndValet extends HourlyWithCharging { long fee(long hours, double kwh) { return super.fee(hours, kwh) + 100; } }\n// ...and again for FlatFee, WeekendFee, and every new add-on: classes = pricings x 2^addons\n",
    p09_sol: "/** What we know about one stay when we price it. */\nrecord Stay(long hours, double kwhCharged, boolean valet) { }\n\ninterface Pricing { long fee(Stay s); String describe(); }\n\nclass Hourly implements Pricing {\n    private final long rate;\n    Hourly(long rate) { this.rate = rate; }\n    public long fee(Stay s) { return Math.max(1, s.hours()) * rate; }\n    public String describe() { return \"hourly@\" + rate; }\n}\n\n/** Decorator base: wraps another Pricing and adds something on top. */\nabstract class PricingAddOn implements Pricing {\n    protected final Pricing inner;\n    PricingAddOn(Pricing inner) { this.inner = inner; }\n}\n\nclass ChargingAddOn extends PricingAddOn {\n    private final double perKwh;\n    ChargingAddOn(Pricing inner, double perKwh) { super(inner); this.perKwh = perKwh; }\n    public long fee(Stay s) { return inner.fee(s) + Math.round(s.kwhCharged() * perKwh); }\n    public String describe() { return inner.describe() + \" + charging@\" + perKwh + \"/kWh\"; }\n}\n\nclass ValetAddOn extends PricingAddOn {\n    private final long valetFee;\n    ValetAddOn(Pricing inner, long valetFee) { super(inner); this.valetFee = valetFee; }\n    public long fee(Stay s) { return inner.fee(s) + (s.valet() ? valetFee : 0); }\n    public String describe() { return inner.describe() + \" + valet\"; }\n}\n\nenum SpotKind { REGULAR, EV }\n\n/** Picks the pricing chain by spot kind: an EV spot simply gets one more wrapper. */\nclass PricingFactory {\n    static Pricing forSpot(SpotKind kind) {\n        Pricing p = new ValetAddOn(new Hourly(20), 100);\n        return kind == SpotKind.EV ? new ChargingAddOn(p, 15.0) : p;\n    }\n}\n\npublic class EvDemo {\n    public static void main(String[] args) {\n        Pricing ev = PricingFactory.forSpot(SpotKind.EV);\n        System.out.println(ev.describe());                                   // hourly@20 + valet + charging@15.0/kWh\n        System.out.println(ev.fee(new Stay(3, 10.0, false)));                // 60 + 150 = 210\n        System.out.println(PricingFactory.forSpot(SpotKind.REGULAR).fee(new Stay(3, 0, true))); // 60 + 100 = 160\n    }\n}\n",
    p10_brute: "// BRUTE: for every arriving car, scan every spot and compute its distance to this gate.\nclass NearestBrute {\n    static int nearest(int[][] dist, boolean[] taken, int gate) {\n        int best = -1;\n        for (int s = 0; s < taken.length; s++)\n            if (!taken[s] && (best == -1 || dist[gate][s] < dist[gate][best])) best = s;\n        return best;                                   // O(spots) per car, per gate\n    }\n}\n",
    p10_sol: "/** Strategy: choose a spot for an arriving vehicle at a given gate. */\ninterface GateAwareStrategy {\n    int allocate(int gate);          // returns spot id or -1\n    void release(int spot);\n}\n\n/**\n * One min-heap of spots per gate, ordered by distance from that gate.\n * A freed spot is pushed back into every gate's heap. Spots taken via another gate stay\n * in this heap as stale entries and are skipped when popped (lazy deletion).\n */\nclass NearestToGate implements GateAwareStrategy {\n    private final int[][] dist;                      // dist[gate][spot]\n    private final boolean[] taken;\n    private final List<PriorityQueue<Integer>> heaps = new ArrayList<>();\n\n    NearestToGate(int[][] dist) {\n        this.dist = dist;\n        int spots = dist[0].length;\n        taken = new boolean[spots];\n        for (int g = 0; g < dist.length; g++) {\n            final int gate = g;\n            PriorityQueue<Integer> pq = new PriorityQueue<>(Comparator.comparingInt((Integer s) -> dist[gate][s]).thenComparingInt(s -> s));\n            for (int s = 0; s < spots; s++) pq.add(s);\n            heaps.add(pq);\n        }\n    }\n\n    public synchronized int allocate(int gate) {\n        PriorityQueue<Integer> pq = heaps.get(gate);\n        while (!pq.isEmpty()) {\n            int s = pq.poll();\n            if (!taken[s]) { taken[s] = true; return s; }   // stale entries are simply dropped\n        }\n        return -1;\n    }\n\n    public synchronized void release(int spot) {\n        if (!taken[spot]) throw new IllegalStateException(\"Spot \" + spot + \" is not taken\");\n        taken[spot] = false;\n        for (PriorityQueue<Integer> pq : heaps) pq.add(spot);\n    }\n\n    public static void main(String[] args) {\n        int[][] dist = {{1, 2, 3, 4}, {4, 3, 2, 1}};       // gate 0 is near spot 0, gate 1 near spot 3\n        NearestToGate st = new NearestToGate(dist);\n        System.out.println(st.allocate(0));               // 0\n        System.out.println(st.allocate(1));               // 3\n        System.out.println(st.allocate(1));               // 2\n        st.release(3);\n        System.out.println(st.allocate(1));               // 3 again\n        System.out.println(st.allocate(0));               // 1\n    }\n}\n",
    p11_brute: "// BRUTE (and BROKEN): check-then-act with no locking. Two gates can both see spot 7 as free\n// and both write their car into it. Wrapping park() in one global lock fixes correctness\n// but makes every gate wait for every other gate.\nclass RacyLot {\n    private final String[] spots;\n    RacyLot(int n) { spots = new String[n]; }\n\n    int park(String plate) {\n        for (int i = 0; i < spots.length; i++) {\n            if (spots[i] == null) {          // CHECK  <- another thread can run here\n                spots[i] = plate;            // ACT    <- and both \"win\" the same spot\n                return i;\n            }\n        }\n        return -1;\n    }\n}\n",
    p11_sol: "enum SpotType { SMALL, COMPACT, LARGE }\n\nclass Spot {\n    final int id; final SpotType type;\n    final AtomicReference<String> plate = new AtomicReference<>();   // null = free\n    Spot(int id, SpotType type) { this.id = id; this.type = type; }\n}\n\n/**\n * Lock-free allocation: free spots per type live in a concurrent queue.\n * poll() hands each spot to exactly ONE thread, so two gates can never receive the same spot.\n * The CAS on the spot is a second safety net (and catches bugs like double release).\n */\nclass ConcurrentLot {\n    private final Map<SpotType, ConcurrentLinkedQueue<Spot>> free = new EnumMap<>(SpotType.class);\n    private final ConcurrentHashMap<String, Spot> byPlate = new ConcurrentHashMap<>();\n    private final Set<String> inside = ConcurrentHashMap.newKeySet();   // plates that hold or are getting a spot\n\n    ConcurrentLot(List<Spot> spots) {\n        for (SpotType t : SpotType.values()) free.put(t, new ConcurrentLinkedQueue<>());\n        for (Spot s : spots) free.get(s.type).add(s);\n    }\n\n    Optional<Spot> park(String plate, SpotType type) {\n        if (!inside.add(plate)) throw new IllegalStateException(plate + \" already inside\"); // atomic claim\n        Spot s = free.get(type).poll();                      // atomic hand-off\n        if (s == null) { inside.remove(plate); return Optional.empty(); }\n        if (!s.plate.compareAndSet(null, plate)) throw new IllegalStateException(\"corrupted spot \" + s.id);\n        byPlate.put(plate, s);\n        return Optional.of(s);\n    }\n\n    void leave(String plate) {\n        Spot s = byPlate.remove(plate);                      // only one thread can remove a key\n        if (s == null) throw new NoSuchElementException(plate + \" is not inside\");\n        if (!s.plate.compareAndSet(plate, null)) throw new IllegalStateException(\"double release \" + s.id);\n        free.get(s.type).add(s);                             // publish AFTER clearing the spot\n        inside.remove(plate);\n    }\n\n    int parkedCount() { return byPlate.size(); }\n}\n\npublic class ConcurrentDemo {\n    public static void main(String[] args) throws Exception {\n        List<Spot> spots = new ArrayList<>();\n        for (int i = 0; i < 500; i++) spots.add(new Spot(i, SpotType.COMPACT));\n        ConcurrentLot lot = new ConcurrentLot(spots);\n        AtomicInteger ok = new AtomicInteger();\n        Set<Integer> used = ConcurrentHashMap.newKeySet();\n        AtomicInteger dup = new AtomicInteger();\n\n        ExecutorService gates = Executors.newFixedThreadPool(8);    // 8 entry gates\n        for (int g = 0; g < 8; g++) {\n            final int gate = g;\n            gates.submit(() -> {\n                for (int i = 0; i < 125; i++) {                     // 1000 cars for 500 spots\n                    lot.park(\"G\" + gate + \"-\" + i, SpotType.COMPACT).ifPresent(s -> {\n                        ok.incrementAndGet();\n                        if (!used.add(s.id)) dup.incrementAndGet();\n                    });\n                }\n            });\n        }\n        gates.shutdown();\n        gates.awaitTermination(10, TimeUnit.SECONDS);\n        System.out.println(\"parked=\" + ok.get() + \" duplicates=\" + dup.get() + \" inside=\" + lot.parkedCount());\n        // parked=500 duplicates=0 inside=500\n    }\n}\n",
    p12_brute: "// BRUTE: a bot that takes the first empty cell. It \"plays\", but any human beats it.\nclass FirstFreeBot {\n    static int[] choose(char[][] b) {\n        for (int r = 0; r < 3; r++)\n            for (int c = 0; c < 3; c++)\n                if (b[r][c] == '.') return new int[]{r, c};\n        throw new IllegalStateException(\"board full\");\n    }\n}\n",
    p12_sol: "/** The same Player interface the game already uses: a bot is just another strategy. */\ninterface Player { char symbol(); int[] chooseMove(char[][] board); }\n\n/** Minimax with alpha-beta pruning: never loses at 3x3 tic-tac-toe. */\nclass MinimaxBot implements Player {\n    private final char me, them;\n    MinimaxBot(char me, char them) { this.me = me; this.them = them; }\n    public char symbol() { return me; }\n\n    public int[] chooseMove(char[][] b) {\n        int best = Integer.MIN_VALUE; int[] move = null;\n        for (int r = 0; r < 3; r++)\n            for (int c = 0; c < 3; c++) {\n                if (b[r][c] != '.') continue;\n                b[r][c] = me;\n                int score = minimax(b, false, 1, Integer.MIN_VALUE, Integer.MAX_VALUE);\n                b[r][c] = '.';\n                if (score > best) { best = score; move = new int[]{r, c}; }\n            }\n        return move;\n    }\n\n    /** Score from the bot's view: +10 - depth for a win (win sooner is better), depth - 10 for a loss. */\n    private int minimax(char[][] b, boolean myTurn, int depth, int alpha, int beta) {\n        if (wins(b, me)) return 10 - depth;\n        if (wins(b, them)) return depth - 10;\n        if (full(b)) return 0;\n        int best = myTurn ? Integer.MIN_VALUE : Integer.MAX_VALUE;\n        for (int r = 0; r < 3; r++)\n            for (int c = 0; c < 3; c++) {\n                if (b[r][c] != '.') continue;\n                b[r][c] = myTurn ? me : them;\n                int s = minimax(b, !myTurn, depth + 1, alpha, beta);\n                b[r][c] = '.';\n                if (myTurn) { best = Math.max(best, s); alpha = Math.max(alpha, s); }\n                else { best = Math.min(best, s); beta = Math.min(beta, s); }\n                if (beta <= alpha) return best;            // prune: opponent will never allow this line\n            }\n        return best;\n    }\n\n    static boolean wins(char[][] b, char p) {\n        for (int i = 0; i < 3; i++)\n            if ((b[i][0] == p && b[i][1] == p && b[i][2] == p) || (b[0][i] == p && b[1][i] == p && b[2][i] == p)) return true;\n        return (b[0][0] == p && b[1][1] == p && b[2][2] == p) || (b[0][2] == p && b[1][1] == p && b[2][0] == p);\n    }\n    static boolean full(char[][] b) {\n        for (char[] row : b) for (char ch : row) if (ch == '.') return false;\n        return true;\n    }\n}\n\npublic class BotDemo {\n    public static void main(String[] args) {\n        char[][] b = {\"XX.\".toCharArray(), \"OO.\".toCharArray(), \"...\".toCharArray()};\n        int[] m = new MinimaxBot('O', 'X').chooseMove(b);\n        System.out.println(m[0] + \",\" + m[1]);             // 1,2 : win now rather than block\n        char[][] b2 = {\"XX.\".toCharArray(), \".O.\".toCharArray(), \"...\".toCharArray()};\n        int[] m2 = new MinimaxBot('O', 'X').chooseMove(b2);\n        System.out.println(m2[0] + \",\" + m2[1]);           // 0,2 : must block X\n    }\n}\n",
    p13_brute: "// BRUTE: main() with a giant if-else on the command word and linear scans everywhere.\nclass ParkingCli {\n    static String[] plate, colour;\n\n    static void run(String line) {\n        String[] p = line.split(\" \");\n        if (p[0].equals(\"create_parking_lot\")) {\n            plate = new String[Integer.parseInt(p[1])]; colour = new String[plate.length];\n            System.out.println(\"Created a parking lot with \" + plate.length + \" slots\");\n        } else if (p[0].equals(\"park\")) {\n            for (int i = 0; i < plate.length; i++)          // O(n) scan for the nearest slot\n                if (plate[i] == null) { plate[i] = p[1]; colour[i] = p[2]; System.out.println(\"Allocated slot number: \" + (i + 1)); return; }\n            System.out.println(\"Sorry, parking lot is full\");\n        } else if (p[0].equals(\"leave\")) {\n            int s = Integer.parseInt(p[1]) - 1; plate[s] = null; colour[s] = null;\n            System.out.println(\"Slot number \" + (s + 1) + \" is free\");\n        } else if (p[0].equals(\"registration_numbers_for_cars_with_colour\")) {\n            StringJoiner j = new StringJoiner(\", \");\n            for (int i = 0; i < plate.length; i++) if (p[1].equals(colour[i])) j.add(plate[i]);\n            System.out.println(j.length() == 0 ? \"Not found\" : j.toString());\n        } else {\n            System.out.println(\"Unknown command\");        // every new command grows this ladder\n        }\n    }\n}\n",
    p13_sol: "record Car(String plate, String colour) { }\n\n/** Domain: knows nothing about text commands. Nearest free slot = smallest number, kept in a TreeSet. */\nclass Garage {\n    private final Car[] slots;\n    private final TreeSet<Integer> freeSlots = new TreeSet<>();\n    private final Map<String, Integer> slotByPlate = new HashMap<>();\n    private final Map<String, TreeSet<Integer>> slotsByColour = new HashMap<>();\n\n    Garage(int n) { slots = new Car[n + 1]; for (int i = 1; i <= n; i++) freeSlots.add(i); }\n    int capacity() { return slots.length - 1; }\n\n    OptionalInt park(Car car) {\n        if (slotByPlate.containsKey(car.plate())) throw new IllegalStateException(car.plate() + \" already parked\");\n        if (freeSlots.isEmpty()) return OptionalInt.empty();\n        int s = freeSlots.pollFirst();                                   // O(log n) nearest slot\n        slots[s] = car;\n        slotByPlate.put(car.plate(), s);\n        slotsByColour.computeIfAbsent(car.colour().toLowerCase(), k -> new TreeSet<>()).add(s);\n        return OptionalInt.of(s);\n    }\n\n    boolean leave(int s) {\n        if (s < 1 || s > capacity() || slots[s] == null) return false;\n        Car car = slots[s];\n        slots[s] = null;\n        freeSlots.add(s);\n        slotByPlate.remove(car.plate());\n        slotsByColour.get(car.colour().toLowerCase()).remove(s);\n        return true;\n    }\n\n    List<Integer> slotsWithColour(String colour) { return new ArrayList<>(slotsByColour.getOrDefault(colour.toLowerCase(), new TreeSet<>())); }\n    Car carAt(int s) { return slots[s]; }\n    Optional<Integer> slotOf(String plate) { return Optional.ofNullable(slotByPlate.get(plate)); }\n}\n\n/** Command pattern: each text command is one small class. A new command = one new class + one map entry. */\ninterface CliCommand { String execute(String[] args, Session session); }\n\n/** Holds the garage once it is created, so commands can share it. */\nclass Session { Garage garage; }\n\nclass CreateCmd implements CliCommand {\n    public String execute(String[] a, Session s) {\n        s.garage = new Garage(Integer.parseInt(a[0]));\n        return \"Created a parking lot with \" + a[0] + \" slots\";\n    }\n}\n\nclass ParkCmd implements CliCommand {\n    public String execute(String[] a, Session s) {\n        OptionalInt slot = s.garage.park(new Car(a[0], a[1]));\n        return slot.isPresent() ? \"Allocated slot number: \" + slot.getAsInt() : \"Sorry, parking lot is full\";\n    }\n}\n\nclass LeaveCmd implements CliCommand {\n    public String execute(String[] a, Session s) {\n        int slot = Integer.parseInt(a[0]);\n        return s.garage.leave(slot) ? \"Slot number \" + slot + \" is free\" : \"Slot \" + slot + \" is already empty\";\n    }\n}\n\nclass PlatesByColourCmd implements CliCommand {\n    public String execute(String[] a, Session s) {\n        List<String> plates = new ArrayList<>();\n        for (int slot : s.garage.slotsWithColour(a[0])) plates.add(s.garage.carAt(slot).plate());\n        return plates.isEmpty() ? \"Not found\" : String.join(\", \", plates);\n    }\n}\n\nclass SlotForPlateCmd implements CliCommand {\n    public String execute(String[] a, Session s) {\n        return s.garage.slotOf(a[0]).map(String::valueOf).orElse(\"Not found\");\n    }\n}\n\nclass Interpreter {\n    private final Map<String, CliCommand> commands = new HashMap<>();\n    private final Map<String, Integer> arity = new HashMap<>();\n    private final Session session = new Session();\n\n    Interpreter() {\n        register(\"create_parking_lot\", 1, new CreateCmd());\n        register(\"park\", 2, new ParkCmd());\n        register(\"leave\", 1, new LeaveCmd());\n        register(\"registration_numbers_for_cars_with_colour\", 1, new PlatesByColourCmd());\n        register(\"slot_number_for_registration_number\", 1, new SlotForPlateCmd());\n    }\n\n    void register(String name, int args, CliCommand c) { commands.put(name, c); arity.put(name, args); }\n\n    String handle(String line) {\n        String[] parts = line.trim().split(\" +\");\n        CliCommand cmd = commands.get(parts[0]);\n        if (cmd == null) return \"Unknown command: \" + parts[0];\n        if (parts.length - 1 != arity.get(parts[0])) return \"Usage: \" + parts[0] + \" needs \" + arity.get(parts[0]) + \" argument(s)\";\n        if (session.garage == null && !(cmd instanceof CreateCmd)) return \"Create a parking lot first\";\n        try {\n            return cmd.execute(Arrays.copyOfRange(parts, 1, parts.length), session);\n        } catch (RuntimeException e) {\n            return \"Error: \" + e.getMessage();                 // one bad line never kills the program\n        }\n    }\n\n    public static void main(String[] args) {\n        Interpreter it = new Interpreter();\n        String[] script = {\n            \"create_parking_lot 3\", \"park KA-01-HH-1234 White\", \"park KA-01-HH-9999 Black\",\n            \"park KA-01-BB-0001 White\", \"park KA-01-HH-7777 Red\", \"leave 2\",\n            \"park KA-01-HH-7777 Red\", \"registration_numbers_for_cars_with_colour White\",\n            \"slot_number_for_registration_number KA-01-HH-7777\", \"fly_away now\"\n        };\n        for (String line : script) System.out.println(it.handle(line));\n    }\n}\n",
    p14_brute: "// BRUTE: the game prints straight to the console and keeps no history.\n// Spectators? Copy-paste println calls. Replay? Impossible: past states are gone.\nclass LoudGame {\n    char[][] b = new char[4][4];\n    char[] syms = {'X', 'O', 'Z'};\n    int turn = 0;\n    void play(int r, int c) {\n        b[r][c] = syms[turn];\n        System.out.println(\"Player \" + syms[turn] + \" played \" + r + \",\" + c);    // UI glued into the model\n        System.out.println(\"[TV screen] \" + syms[turn] + \" -> \" + r + \",\" + c);    // second \"spectator\", copy-pasted\n        turn = (turn + 1) % 3;\n    }\n}\n",
    p14_sol: "/** Events are facts that happened. The list of events IS the game (event sourcing, lite). */\nsealed interface GameEvent permits MovePlayed, GameWon, GameDrawn { }\nrecord MovePlayed(int seq, char symbol, int row, int col) implements GameEvent { }\nrecord GameWon(char symbol) implements GameEvent { }\nrecord GameDrawn() implements GameEvent { }\n\n/** Observer: spectators, loggers, a scoreboard... the game does not know which. */\ninterface GameListener { void on(GameEvent e); }\n\nclass MultiGame {\n    private final int n; private final char[] symbols; private final char[][] board;\n    private final int[][] rows, cols; private final int[] diag, anti;\n    private final List<GameEvent> log = new ArrayList<>();\n    private final List<GameListener> listeners = new ArrayList<>();\n    private int turn = 0, moves = 0; private boolean over = false;\n\n    /** P players on an (P+1) x (P+1) board, needing a full line to win. */\n    MultiGame(char... symbols) {\n        this.symbols = symbols; this.n = symbols.length + 1;\n        board = new char[n][n]; for (char[] r : board) Arrays.fill(r, '.');\n        rows = new int[symbols.length][n]; cols = new int[symbols.length][n];\n        diag = new int[symbols.length]; anti = new int[symbols.length];\n    }\n\n    void subscribe(GameListener l) { listeners.add(l); }\n    private void emit(GameEvent e) { log.add(e); for (GameListener l : listeners) l.on(e); }\n\n    void play(int r, int c) {\n        if (over) throw new IllegalStateException(\"game over\");\n        if (r < 0 || r >= n || c < 0 || c >= n || board[r][c] != '.') throw new IllegalArgumentException(\"illegal move\");\n        int p = turn;\n        board[r][c] = symbols[p]; moves++;\n        emit(new MovePlayed(moves, symbols[p], r, c));\n        boolean win = ++rows[p][r] == n | ++cols[p][c] == n\n                | (r == c && ++diag[p] == n) | (r + c == n - 1 && ++anti[p] == n);   // non-short-circuit: update all\n        if (win) { over = true; emit(new GameWon(symbols[p])); }\n        else if (moves == n * n) { over = true; emit(new GameDrawn()); }\n        else turn = (turn + 1) % symbols.length;\n    }\n\n    List<GameEvent> events() { return List.copyOf(log); }\n    int size() { return n; }\n\n    /** Rebuild the board as it looked after `upTo` moves, purely from the event log. */\n    static char[][] replay(List<GameEvent> events, int n, int upTo) {\n        char[][] b = new char[n][n]; for (char[] r : b) Arrays.fill(r, '.');\n        for (GameEvent e : events)\n            if (e instanceof MovePlayed m && m.seq() <= upTo) b[m.row()][m.col()] = m.symbol();\n        return b;\n    }\n}\n\nclass Spectator implements GameListener {\n    private final String name; final List<String> seen = new ArrayList<>();\n    Spectator(String name) { this.name = name; }\n    public void on(GameEvent e) {\n        String line = switch (e) {\n            case MovePlayed m -> m.symbol() + \" plays \" + m.row() + \",\" + m.col();\n            case GameWon w -> w.symbol() + \" WINS\";\n            case GameDrawn d -> \"draw\";\n        };\n        seen.add(name + \": \" + line);\n    }\n}\n\npublic class ReplayDemo {\n    public static void main(String[] args) {\n        MultiGame g = new MultiGame('X', 'O', 'Z');            // 3 players, 4x4 board\n        Spectator tv = new Spectator(\"TV\");\n        g.subscribe(tv);\n        int[][] moves = {{0,0},{1,0},{2,0},{0,1},{1,1},{2,1},{0,2},{1,2},{2,2},{0,3}};\n        for (int[] m : moves) g.play(m[0], m[1]);\n        System.out.println(tv.seen.get(tv.seen.size() - 1));  // TV: X WINS  (row 0 complete)\n        char[][] mid = MultiGame.replay(g.events(), g.size(), 3);\n        System.out.println(new String(mid[0]) + \"/\" + new String(mid[1]) + \"/\" + new String(mid[2])); // X.../O.../Z...\n    }\n}\n",
    t1_skeleton: "import java.time.LocalTime;\n\n// The framework applied to a NEW problem: \"Design a meeting-room booker\".\n// Step 1 (clarify): rooms have capacity; book a slot for N people; no overlaps; cancel allowed.\n// Step 2 (entities): Room, Booking.     Step 3 (APIs): book(...), cancel(...), bookingsFor(room).\n// Step 4 (diagram): Scheduler has Rooms, Room has Bookings.     Step 5 (patterns): Strategy for choosing a room.\n// Step 6 (extensibility): new selection rule = new class; nothing else changes.\n\nrecord Room(String name, int capacity) { }\n\nrecord Booking(String id, Room room, LocalTime start, LocalTime end, int people) {\n    boolean overlaps(LocalTime s, LocalTime e) { return s.isBefore(end) && start.isBefore(e); }   // half-open\n}\n\n/** Step 5: the rule most likely to change, behind an interface. */\ninterface RoomSelectionStrategy {\n    Optional<Room> choose(List<Room> candidates, int people);\n}\n\n/** Smallest room that is big enough: keeps big rooms free for big meetings. */\nclass SmallestFitStrategy implements RoomSelectionStrategy {\n    public Optional<Room> choose(List<Room> candidates, int people) {\n        return candidates.stream().filter(r -> r.capacity() >= people).min(Comparator.comparingInt(Room::capacity));\n    }\n}\n\n/** Step 3: the public API. Callers depend on this, not on the implementation. */\ninterface MeetingScheduler {\n    Optional<Booking> book(int people, LocalTime start, LocalTime end);\n    boolean cancel(String bookingId);\n    List<Booking> bookingsFor(Room room);\n}\n\nclass InMemoryScheduler implements MeetingScheduler {\n    private final List<Room> rooms;\n    private final RoomSelectionStrategy strategy;\n    private final Map<Room, List<Booking>> bookings = new HashMap<>();\n    private int seq = 1;\n\n    InMemoryScheduler(List<Room> rooms, RoomSelectionStrategy strategy) {\n        this.rooms = List.copyOf(rooms); this.strategy = strategy;\n        for (Room r : rooms) bookings.put(r, new ArrayList<>());\n    }\n\n    public synchronized Optional<Booking> book(int people, LocalTime start, LocalTime end) {\n        if (!start.isBefore(end)) throw new IllegalArgumentException(\"start must be before end\");\n        List<Room> free = new ArrayList<>();\n        for (Room r : rooms)\n            if (bookings.get(r).stream().noneMatch(b -> b.overlaps(start, end))) free.add(r);\n        return strategy.choose(free, people).map(room -> {\n            Booking b = new Booking(\"B\" + seq++, room, start, end, people);\n            bookings.get(room).add(b);\n            return b;\n        });\n    }\n\n    public synchronized boolean cancel(String id) {\n        for (List<Booking> list : bookings.values()) if (list.removeIf(b -> b.id().equals(id))) return true;\n        return false;\n    }\n\n    public synchronized List<Booking> bookingsFor(Room room) { return List.copyOf(bookings.get(room)); }\n}\n\npublic class SchedulerDemo {\n    public static void main(String[] args) {\n        Room small = new Room(\"Huddle\", 4), big = new Room(\"Board\", 12);\n        MeetingScheduler s = new InMemoryScheduler(List.of(big, small), new SmallestFitStrategy());\n        System.out.println(s.book(3, LocalTime.of(10, 0), LocalTime.of(11, 0)).map(b -> b.room().name()).orElse(\"none\")); // Huddle\n        System.out.println(s.book(3, LocalTime.of(10, 30), LocalTime.of(11, 0)).map(b -> b.room().name()).orElse(\"none\")); // Board\n        System.out.println(s.book(3, LocalTime.of(10, 30), LocalTime.of(11, 0)).map(b -> b.room().name()).orElse(\"none\")); // none\n    }\n}\n",
    t2_god: "// ANTI-EXAMPLE: the \"God class\". Every requirement landed in the same file.\n// Read the comments marked SMELL: each one is a point an interviewer deducts.\npublic class ParkingLotGod {\n    // SMELL 1: parallel arrays instead of a ParkingSpot object\n    static String[] size = {\"S\", \"M\", \"M\", \"L\", \"L\"};\n    static String[] who = new String[5];\n    static long[] since = new long[5];\n    // SMELL 2: money and payment state live next to spot state\n    static long cashInDrawer = 0;\n    static int ticketCounter = 0;\n\n    public static void main(String[] args) {\n        handle(\"IN CAR KA-01 9\");\n        handle(\"IN TRUCK KA-77 9\");\n        handle(\"OUT 1 12 CASH\");\n        handle(\"SHOW\");\n    }\n\n    // SMELL 3: one method parses input, applies rules, prices, takes payment and prints\n    static void handle(String cmd) {\n        String[] p = cmd.split(\" \");\n        if (p[0].equals(\"IN\")) {\n            for (int i = 0; i < size.length; i++) {\n                // SMELL 4: fit rules hard-coded as string comparisons, duplicated elsewhere\n                boolean fits = p[1].equals(\"BIKE\") || (p[1].equals(\"CAR\") && !size[i].equals(\"S\")) || (p[1].equals(\"TRUCK\") && size[i].equals(\"L\"));\n                if (who[i] == null && fits) {\n                    who[i] = p[2] + \"/\" + p[1];             // SMELL 5: type smuggled inside a string\n                    since[i] = Long.parseLong(p[3]);\n                    ticketCounter++;\n                    System.out.println(\"Ticket \" + ticketCounter + \" spot \" + i);\n                    return;\n                }\n            }\n            System.out.println(\"FULL\");\n        } else if (p[0].equals(\"OUT\")) {\n            int spot = Integer.parseInt(p[1]);\n            String type = who[spot].split(\"/\")[1];\n            long hrs = Math.max(1, Long.parseLong(p[2]) - since[spot]);\n            long fee = type.equals(\"BIKE\") ? hrs * 10 : type.equals(\"CAR\") ? hrs * 20 : hrs * 50;   // SMELL 6: pricing inline\n            if (p[3].equals(\"CASH\")) cashInDrawer += fee;                                          // SMELL 7: payment inline\n            else System.out.println(\"Calling card gateway...\");\n            who[spot] = null;\n            System.out.println(\"Paid \" + fee);\n        } else if (p[0].equals(\"SHOW\")) {\n            int free = 0;\n            for (String w : who) if (w == null) free++;\n            System.out.println(\"Free spots: \" + free + \", cash: \" + cashInDrawer);   // SMELL 8: UI inside domain\n        }\n    }\n}\n",
    t4_flow: "import java.time.Duration;\nimport java.time.Instant;\n\n// Focus: the TICKET LIFECYCLE across entry -> payment -> exit, with events for display boards.\n\nenum TicketStatus { ACTIVE, PAID, EXITED }        // a tiny state machine\nenum PaymentMode { CASH, CARD, UPI }\n\n/** Strategy for HOW money is collected. A real one would call a gateway; here they just succeed. */\ninterface PaymentProcessor { boolean charge(String ticketId, long amount); }\nclass CashProcessor implements PaymentProcessor { public boolean charge(String id, long amt) { return true; } }\nclass UpiProcessor implements PaymentProcessor { public boolean charge(String id, long amt) { return amt > 0; } }\n\n/** Observer for screens at the entrance and on each floor. */\ninterface ParkingListener { void spotTaken(String spotId); void spotFreed(String spotId); }\n\nclass FlowTicket {\n    final String id, spotId; final Instant entry; TicketStatus status = TicketStatus.ACTIVE; long paid;\n    FlowTicket(String id, String spotId, Instant entry) { this.id = id; this.spotId = spotId; this.entry = entry; }\n\n    /** Only legal transitions are allowed; anything else is a bug or fraud. */\n    void moveTo(TicketStatus next) {\n        boolean ok = (status == TicketStatus.ACTIVE && next == TicketStatus.PAID)\n                  || (status == TicketStatus.PAID && next == TicketStatus.EXITED);\n        if (!ok) throw new IllegalStateException(\"Ticket \" + id + \": \" + status + \" -> \" + next + \" not allowed\");\n        status = next;\n    }\n}\n\nclass ParkingFlow {\n    private final Deque<String> freeSpots;\n    private final Map<String, FlowTicket> tickets = new HashMap<>();\n    private final Map<PaymentMode, PaymentProcessor> processors = new EnumMap<>(PaymentMode.class);\n    private final List<ParkingListener> listeners = new ArrayList<>();\n    private final long ratePerHour;\n    private int seq = 1;\n\n    ParkingFlow(List<String> spots, long ratePerHour) {\n        this.freeSpots = new ArrayDeque<>(spots); this.ratePerHour = ratePerHour;\n        processors.put(PaymentMode.CASH, new CashProcessor());\n        processors.put(PaymentMode.UPI, new UpiProcessor());\n    }\n\n    void addListener(ParkingListener l) { listeners.add(l); }\n\n    /** ENTRY GATE: take nearest spot, issue ticket, tell the screens. */\n    synchronized FlowTicket enter(Instant now) {\n        String spot = freeSpots.pollFirst();\n        if (spot == null) throw new IllegalStateException(\"Lot full\");\n        FlowTicket t = new FlowTicket(\"T\" + seq++, spot, now);\n        tickets.put(t.id, t);\n        listeners.forEach(l -> l.spotTaken(spot));\n        return t;\n    }\n\n    /** PAY STATION: price the stay and collect money. Spot is NOT freed yet (car still inside). */\n    synchronized long pay(String ticketId, Instant now, PaymentMode mode) {\n        FlowTicket t = find(ticketId);\n        long hours = Math.max(1, (Duration.between(t.entry, now).toMinutes() + 59) / 60);\n        long amount = hours * ratePerHour;\n        PaymentProcessor p = processors.get(mode);\n        if (p == null) throw new UnsupportedOperationException(mode + \" not accepted here\");\n        if (!p.charge(t.id, amount)) throw new IllegalStateException(\"Payment declined\");\n        t.moveTo(TicketStatus.PAID);\n        t.paid = amount;\n        return amount;\n    }\n\n    /** EXIT GATE: barrier opens only for PAID tickets; then the spot is released. */\n    synchronized void exit(String ticketId) {\n        FlowTicket t = find(ticketId);\n        t.moveTo(TicketStatus.EXITED);              // throws if not paid\n        freeSpots.addFirst(t.spotId);               // nearest-first reuse\n        listeners.forEach(l -> l.spotFreed(t.spotId));\n    }\n\n    private FlowTicket find(String id) {\n        FlowTicket t = tickets.get(id);\n        if (t == null) throw new NoSuchElementException(\"No ticket \" + id);\n        return t;\n    }\n}\n\npublic class FlowDemo {\n    public static void main(String[] args) {\n        ParkingFlow lot = new ParkingFlow(List.of(\"A1\", \"A2\"), 40);\n        lot.addListener(new ParkingListener() {\n            public void spotTaken(String s) { System.out.println(\"[screen] \" + s + \" taken\"); }\n            public void spotFreed(String s) { System.out.println(\"[screen] \" + s + \" free\"); }\n        });\n        Instant nine = Instant.parse(\"2026-01-01T09:00:00Z\");\n        FlowTicket t = lot.enter(nine);                                            // [screen] A1 taken\n        try { lot.exit(t.id); } catch (IllegalStateException e) { System.out.println(e.getMessage()); } // not paid yet\n        System.out.println(\"Paid \" + lot.pay(t.id, nine.plusSeconds(95 * 60), PaymentMode.UPI)); // 2 hours -> 80\n        lot.exit(t.id);                                                            // [screen] A1 free\n    }\n}\n",
    t6_extend: "// Extension points in one place. Each follow-up question from the interviewer maps to\n// ONE new class plugged into an existing interface; the Game class itself never changes.\n\ninterface Player { char symbol(); int[] next(char[][] board); }                  // follow-up: \"add a bot\"\ninterface WinRule { boolean wins(char[][] b, int r, int c); }                     // follow-up: \"K in a row\"\ninterface GameListener { void moved(char who, int r, int c); void ended(String result); }  // \"add a scoreboard\"\n\nclass ScriptedPlayer implements Player {\n    private final char sym; private final Deque<int[]> script;\n    ScriptedPlayer(char sym, int[]... moves) { this.sym = sym; script = new ArrayDeque<>(List.of(moves)); }\n    public char symbol() { return sym; }\n    public int[] next(char[][] b) { return script.poll(); }\n}\n\n/** Follow-up answer #1: a bot is just another Player. Seeded Random => reproducible tests. */\nclass RandomBot implements Player {\n    private final char sym; private final Random rnd;\n    RandomBot(char sym, long seed) { this.sym = sym; rnd = new Random(seed); }\n    public char symbol() { return sym; }\n    public int[] next(char[][] b) {\n        List<int[]> free = new ArrayList<>();\n        for (int r = 0; r < b.length; r++) for (int c = 0; c < b.length; c++) if (b[r][c] == '.') free.add(new int[]{r, c});\n        return free.get(rnd.nextInt(free.size()));\n    }\n}\n\n/** Follow-up answer #2: \"K in a row\" on a bigger board. Checks only lines through the last move. */\nclass KInARow implements WinRule {\n    private final int k;\n    KInARow(int k) { this.k = k; }\n    public boolean wins(char[][] b, int r, int c) {\n        int[][] dirs = {{0, 1}, {1, 0}, {1, 1}, {1, -1}};\n        for (int[] d : dirs) {\n            int count = 1;\n            for (int s = -1; s <= 1; s += 2)\n                for (int rr = r + s * d[0], cc = c + s * d[1];\n                     rr >= 0 && rr < b.length && cc >= 0 && cc < b.length && b[rr][cc] == b[r][c];\n                     rr += s * d[0], cc += s * d[1]) count++;\n            if (count >= k) return true;\n        }\n        return false;\n    }\n}\n\n/** Builder: many optional knobs without a 7-argument constructor. */\nclass Game {\n    private final char[][] board; private final List<Player> players; private final WinRule rule;\n    private final List<GameListener> listeners;\n\n    private Game(Builder b) {\n        board = new char[b.size][b.size];\n        for (char[] row : board) Arrays.fill(row, '.');\n        players = List.copyOf(b.players); rule = b.rule == null ? new KInARow(b.size) : b.rule;\n        listeners = List.copyOf(b.listeners);\n    }\n\n    static Builder builder() { return new Builder(); }\n\n    static class Builder {\n        private int size = 3; private final List<Player> players = new ArrayList<>();\n        private WinRule rule; private final List<GameListener> listeners = new ArrayList<>();\n        Builder size(int n) { size = n; return this; }\n        Builder player(Player p) { players.add(p); return this; }\n        Builder rule(WinRule r) { rule = r; return this; }\n        Builder listener(GameListener l) { listeners.add(l); return this; }\n        Game build() {\n            if (players.size() < 2) throw new IllegalStateException(\"need 2+ players\");\n            return new Game(this);\n        }\n    }\n\n    String play() {\n        int cells = board.length * board.length;\n        for (int moves = 0, turn = 0; moves < cells; moves++, turn = (turn + 1) % players.size()) {\n            Player p = players.get(turn);\n            int[] m = p.next(board);\n            if (m == null || board[m[0]][m[1]] != '.') throw new IllegalStateException(p.symbol() + \" made an illegal move\");\n            board[m[0]][m[1]] = p.symbol();\n            for (GameListener l : listeners) l.moved(p.symbol(), m[0], m[1]);\n            if (rule.wins(board, m[0], m[1])) { String res = p.symbol() + \" wins\"; listeners.forEach(l -> l.ended(res)); return res; }\n        }\n        listeners.forEach(l -> l.ended(\"draw\"));\n        return \"draw\";\n    }\n}\n\n/** Follow-up answer #3: a scoreboard that just listens. */\nclass Scoreboard implements GameListener {\n    final Map<String, Integer> results = new TreeMap<>();\n    public void moved(char who, int r, int c) { }\n    public void ended(String result) { results.merge(result, 1, Integer::sum); }\n}\n\npublic class ExtendDemo {\n    public static void main(String[] args) {\n        Scoreboard score = new Scoreboard();\n        String r1 = Game.builder().size(4).rule(new KInARow(3))\n                .player(new ScriptedPlayer('X', new int[]{0, 0}, new int[]{1, 1}, new int[]{2, 2}))\n                .player(new ScriptedPlayer('O', new int[]{0, 3}, new int[]{1, 3}))\n                .listener(score).build().play();\n        System.out.println(r1);                                   // X wins (3 in a row on 4x4)\n        for (int i = 0; i < 20; i++)\n            Game.builder().player(new RandomBot('X', i)).player(new RandomBot('O', 100 + i)).listener(score).build().play();\n        int total = score.results.values().stream().mapToInt(Integer::intValue).sum();\n        System.out.println(\"games recorded: \" + total);           // 21\n    }\n}\n"
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
      <p>An LLD (Low-Level Design) interview is exactly that, but the "house" is a set of Java classes. The steps are always the same: <b>clarify → entities → APIs → class diagram → patterns → code → extend</b>.</p>`,
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
      <p><b>Step 2 — nouns and verbs.</b> Read the requirements aloud and underline nouns: <i>lot, floor, spot, vehicle, ticket, gate, payment</i>. Each noun that has <b>its own data or behaviour</b> becomes a class; a noun with a fixed set of values (bike/car/truck) becomes an <code>enum</code>; a noun that is pure, unchanging data becomes a <code>record</code>. Verbs (<i>park, pay, exit</i>) become methods on the class that owns the data they touch.</p>
      <p><b>Step 3 — APIs before internals.</b> Decide what callers see: method names, parameters, return types and failure cases (exceptions or <code>Optional</code>). This forces clarity and lets you discuss behaviour before writing 200 lines.</p>
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
      <p><b>Concurrency in step 1, not step 7.</b> If the prompt has several gates, counters or users, say early: "park/unpark must be atomic; I will start with <code>synchronized</code> on the lot and discuss finer-grained locking later." This shows senior judgement without derailing the round.</p>
      <p><b>Time traps.</b> Writing getters/setters for every field, building a fancy console menu, or adding persistence nobody asked for. Write only what the use cases need, then a demo.</p>`,
    aiEra: `<p><b>What AI changes:</b> an AI assistant can spit out a "parking lot in Java" in seconds, so interviewers increasingly care about the parts AI is weakest at: <i>asking the right clarifying questions</i>, <i>defending trade-offs</i>, and <i>adapting the design live</i> when a follow-up arrives. Some companies now run "AI-allowed" design rounds where you may use a coding assistant but must explain and modify every line.</p>
      <p><b>Use AI as a partner:</b> before practice, ask <code>Give me 10 clarifying questions an interviewer expects for "design a food delivery app" LLD, don't design it</code>; after writing your design, ask <code>List 5 follow-up requirements that would break this class diagram</code>. In real work, ask it to draft boilerplate (records, enums, builders) once <i>you</i> have fixed the entities and APIs.</p>
      <p><b>Where AI goes wrong:</b> it over-engineers (a Singleton ParkingLot, five abstract classes, a factory for everything), invents requirements, skips concurrency, and produces code where pricing logic leaks into the gate classes. It rarely asks what is out of scope.</p>
      <p><b>What you must still own:</b> the requirement list, the choice of what goes behind an interface, the invariants, and the ability to explain why each class exists. If you cannot defend a class in one sentence, delete it.</p>`,
    problems: [{
      title: 'Framework Drill: Library Book Checkout',
      level: 'Easy', tags: ['framework', 'entities', 'strategy'], companies: ['Amazon', 'Microsoft', 'Flipkart'],
      statement: `<p>Apply the 7-step framework to a small library. Members borrow and return books; a member may hold at most <b>3</b> books; loans last <b>14 days</b>; the librarian can list overdue loans. The interviewer warns: <i>"next quarter, premium members get different limits"</i>. Produce entities, APIs and working Java code.</p>`,
      constraints: `In-memory only. Up to 10<sup>5</sup> books and members. Dates are <code>LocalDate</code>. Borrowing an already-lent book or exceeding the limit must fail with a clear exception.`,
      example: `<p>Asha borrows <code>111</code> on ${H.c('b', '2026-01-01')} → due ${H.c('g', '2026-01-15')}. On 2026-01-20, <code>overdue()</code> returns ${H.c('r', '1 loan')}. After she returns it, ${H.c('g', '0 loans')}. Asha trying a 4th book → ${H.c('r', 'IllegalStateException: reached the limit of 3')}.</p>`,
      brute: { why: `<p>A single <code>LibrarySystem</code> class with two maps and string statuses ("FREE" / memberId). It passes a demo, but the limit 3 is hard-coded mid-method, there is no Loan object so "overdue" cannot even be computed (no due date stored), and the premium-member follow-up means editing the core method. Errors come back as magic strings that callers must remember.</p>`, code: J.g1_brute },
      mcq: { q: 'The interviewer says "premium members will have different limits". Where should that rule live?', options: ['Inside <code>borrow()</code> as an if-else on member type', 'In a <code>LendingPolicy</code> interface injected into Library', 'In the <code>Book</code> class', 'In a static constant'], answer: 1, explain: 'A rule that is announced to change goes behind an interface. A new PremiumPolicy class plugs in; Library never changes.' },
      hints: [
        `<p>Hint 1: underline nouns in the prompt — book, member, loan, library, limit. Which of them has its <i>own data</i>? A loan has a member, a book and a due date: it deserves a class.</p>`,
        `<p>Hint 2: the limit and the loan length are the "will change" part. Put both behind <code>interface LendingPolicy { int maxBooks(Member m); int loanDays(Member m); }</code>.</p>`,
        `<p>Hint 3: APIs: <code>borrow(member, isbn, today)</code>, <code>giveBack(member, isbn)</code>, <code>overdue(today)</code>. Keep a <code>Map&lt;isbn, Loan&gt;</code> for active loans; validate: unknown ISBN, already lent, limit reached, returning someone else's book.</p>`
      ],
      solution: {
        approach: `<p><b>Entities:</b> <code>Book</code> (record), <code>Member</code>, <code>Loan</code>, <code>Library</code> (facade). <b>Pattern:</b> Strategy via <code>LendingPolicy</code>. <b>Flow:</b> borrow validates → creates Loan with due date from policy → indexes it by ISBN and on the member. Overdue is a filter over active loans. Passing <code>today</code> in (instead of calling <code>LocalDate.now()</code> inside) keeps the code testable.</p>`,
        code: J.g1_sol,
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
    explain: `<p><b>What the brute force looks like.</b> Asked to "design a parking lot", many candidates write one class with arrays like <code>String[] who</code> and <code>long[] since</code>, an <code>if (type.equals("CAR"))</code> ladder for fit rules, another ladder for prices, and <code>System.out.println</code> in the middle of business logic. It is the design equivalent of a nested-loop brute force in DSA: <b>correct for the sample, terrible for change</b>.</p>
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
      '<code>System.out.println</code> inside business logic → mixing UI and domain; return values or publish events instead',
      'Interviewer asks "how would you test the fee calculation alone?" → they spotted untestable, tangled code',
      'Everything is <code>static</code> → no way to run two lots, inject fakes, or test in isolation'
    ],
    code: J.t2_god,
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
        code: J.g2_sol
      }
    ],
    deepDive: `<p><b>Coupling and cohesion, measured.</b> Cohesion asks "do the members of this class work on the same data for the same purpose?" In the God class, <code>cashInDrawer</code> and <code>size[]</code> never interact — low cohesion. Coupling asks "how many things must change together?" — the fit ladder and the price ladder both switch on the same type string, so they are coupled through a magic value. Good designs have <b>high cohesion inside classes, low coupling between them</b>.</p>
      <p><b>Why procedural is not "wrong".</b> Procedural code with data structures is perfectly valid (Linux kernel, many high-performance systems). The issue is <i>unmanaged</i> change: in OOP interviews, the expectation is that variation points are explicit. A procedural design with a table of rules (data-driven) can also be extensible — e.g. a <code>Map&lt;VehicleType, Rule&gt;</code> — and mentioning that shows depth.</p>
      <p><b>Over-correction is also penalised.</b> The opposite failure is the "pattern zoo": Abstract factories for one product, a Singleton ParkingLot (global state, hard to test, breaks with two lots), Visitor where a switch would do. Rule of thumb: add an interface only where the requirements <i>name</i> a variation or the interviewer hints at one.</p>
      <p><b>Static state and tests.</b> Static fields survive between tests in the same JVM, so test order starts to matter. Instances with constructor injection (<code>new ParkingLot(floors, strategy, pricing, clock)</code>) give every test a fresh world.</p>
      <p><b>Concurrency failure of the God class.</b> <code>if (who[i] == null) who[i] = plate;</code> is a classic <i>check-then-act</i> race. Two threads can both see null. Even adding <code>synchronized</code> to a static method locks the whole class — every gate waits for every other. The modelled design lets you choose: lot-level lock, per-floor locks, or lock-free per-type queues.</p>`,
    aiEra: `<p><b>What AI changes:</b> ask a code assistant for "a parking lot program" with no further context and you will often get exactly this God class — a <code>Scanner</code> loop, arrays and if-else ladders — because it is the shortest thing that runs. Recognising and refactoring that output is now a core skill.</p>
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
        `<p>Hint 2: the three parallel arrays describe one thing — a spot. Make <code>class Spot { id, size, plate }</code>. A ticket becomes a <code>record Ticket(id, plate, type, spot, entryHour)</code>.</p>`,
        `<p>Hint 3: extract <code>Allocator</code> and <code>Pricer</code> interfaces; <code>Lot</code> takes them in its constructor, keeps a <code>Map&lt;Integer, Ticket&gt;</code> of open tickets and removes on leave (so reuse fails). Weekend pricing = a new <code>Pricer</code>.</p>`
      ],
      solution: {
        approach: `<p>Move data-like rules into the enum, wrap arrays into objects, extract the two variation points (allocation and pricing) as interfaces, and make the lot an instance with constructor injection. Behaviour is identical for the demo, but each future change now has an obvious home: new type → enum constant; new tariff → new Pricer; new allocation → new Allocator.</p>`,
        code: J.g2_sol,
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
    title: 'Parking Lot, Part 1: Requirements, Entities, Class Diagram and Full Java Design',
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
      '"Multiple entry gates" → park() must be atomic: synchronized, per-floor locks, or concurrent queues',
      '"Display board", "show availability" → Observer with counters, not a full scan per refresh',
      '"Hourly / daily / weekend pricing" → PricingStrategy, possibly decorated (cap, surcharge)'
    ],
    code: J.ParkingLotDemo,
    codeTitle: 'Complete Parking Lot design (Java 21, one file, compiles and runs)',
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
      <p><b>Choosing data structures for speed.</b> The reference <code>NearestFirstStrategy</code> scans: O(floors × types × spots per floor) per park — fine for a few thousand spots. At 50,000 spots and peak traffic, keep a <b>free list per (floor, type)</b> (e.g. <code>ArrayDeque</code> or a <code>TreeSet</code> of spot numbers to keep "nearest" order) for O(1)/O(log n) allocation; freeing a spot pushes it back. Mention this as the "scale" follow-up rather than writing it first.</p>
      <p><b>Thread safety.</b> <code>park</code> and <code>unpark</code> are <code>synchronized</code> on the lot: simple and correct, but it serialises all gates. Options as load grows: (1) a lock per floor, choosing floors in a fixed order to avoid deadlock; (2) per-type <code>ConcurrentLinkedQueue</code> of free spots where <code>poll()</code> hands each spot to exactly one thread (practice problem); (3) in a real distributed system, the database row or a Redis atomic op becomes the lock. Always identify the <i>check-then-act</i> (find free → assign) as the critical section.</p>
      <p><b>Money and time.</b> Use integer minor units (<code>long</code> paise/cents) or <code>BigDecimal</code> — never <code>double</code> for money. Use <code>Instant</code> for timestamps and <code>Duration</code> for differences; inject the clock. Rounding policy ("any started hour is charged") must be explicit and tested at boundaries: 60 minutes → 1 hour, 61 → 2.</p>
      <p><b>Persistence later.</b> Keep <code>activeTickets</code> behind a small repository interface if the interviewer mentions restarts: in-memory map today, JDBC tomorrow, no change to the lot.</p>
      <p><b>Immutability.</b> Ticket and Vehicle are immutable (final fields / records), so they can be shared across threads and stored in maps safely. Only ParkingSpot has mutable state, and it is always changed under the lot's lock.</p>`,
    aiEra: `<p><b>What AI changes:</b> "Parking lot in Java" is one of the most common prompts on the internet, so AI tools reproduce a standard design instantly — and interviewers know it. Expect deeper probes: "why is park synchronized?", "what if two gates read the same free spot?", "how does your design change at 50,000 spots?".</p>
      <p><b>Use AI as a partner:</b> after drawing your own diagram, ask <code>Critique this class diagram for a parking lot: which responsibilities are misplaced?</code> or <code>Generate JUnit tests for boundary fees: 0, 59, 60, 61 minutes</code>. Use it to produce boilerplate records and enums once your entity list is final.</p>
      <p><b>Where AI goes wrong:</b> Singleton ParkingLot by default, <code>double</code> for money, <code>LocalDateTime.now()</code> called deep inside pricing (untestable), fit rules duplicated in several places, and no protection against using one ticket twice.</p>
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
        `<p>Hint 3: NearestFirst = for floor → for type in fits → for spot. BestFitFirst = for type in fits → for floor → for spot. Return <code>Optional.empty()</code> instead of null; the caller turns it into a "lot full" exception.</p>`
      ],
      solution: {
        approach: `<p>Put fit preferences on the enum; define a strategy interface; write two tiny implementations that differ only in loop nesting. The ParkingLot receives a strategy through its constructor, so switching policy is configuration, not code change.</p>`,
        code: J.g3_sol,
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
      <p><b>Concurrency in one sentence:</b> step 3 + step 4 of entry is a <i>check-then-act</i> ("is it free? then take it"), so it must be atomic. The simplest correct answer is <code>synchronized</code> on <code>park</code>/<code>unpark</code>; the scalable answer is a concurrent free-spot queue per type where <code>poll()</code> hands each spot to exactly one thread.</p>
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
        ])}<p>With <code>synchronized park()</code>, t2 cannot start until t3 finishes, so B sees the spot as taken. <code>ParkingSpot.assign()</code> also re-checks <code>isFree()</code> and throws — a second line of defence.</p>`
      }
    ],
    deepDive: `<p><b>Lock granularity choices.</b> ${H.table(['Approach', 'Throughput', 'Complexity', 'Notes'], [
        ['<code>synchronized</code> on ParkingLot', 'low under load', 'trivial', 'perfect for the interview default'],
        ['ReentrantLock per floor', 'medium', 'medium', 'strategy must lock floors in a fixed order to avoid deadlock'],
        ['Concurrent free queue per spot type', 'high', 'medium', '<code>poll()</code> is atomic; "nearest" becomes approximate'],
        ['CAS on spot (<code>AtomicReference</code>)', 'high', 'medium', 'retry another spot on CAS failure'],
        ['Distributed (DB row lock / Redis)', 'scales across servers', 'high', 'each gate is a separate machine']
      ])}</p>
      <p><b>Idempotency at the gate.</b> Barrier hardware may resend "vehicle arrived" after a timeout. Use the plate (or a request id) to make <code>park</code> idempotent: if the plate already holds an active ticket, return that ticket instead of a new spot. The reference design throws; mention the idempotent alternative as a production improvement.</p>
      <p><b>Lost tickets.</b> Keep an index <code>plate → ticket</code>. Lost-ticket pricing is usually <code>max(normal fee, penalty)</code> — see the guided problem. Never let a lost ticket be cheaper than a found one, or people will "lose" tickets.</p>
      <p><b>Time edge cases.</b> Clock changes (daylight saving) are why <code>Instant</code> (UTC) beats <code>LocalDateTime</code> for durations. Midnight crossings matter for daily caps. Stays longer than 24 h need per-day caps applied per started day, not once.</p>
      <p><b>Events and eventual consistency.</b> Display boards updated by events can briefly disagree with reality (an event in flight). That is acceptable for a sign; it is <i>not</i> acceptable for allocation, which must read the authoritative state under the lock.</p>
      <p><b>Payments fail.</b> In real systems payment is a remote call that can time out. Do not hold the lot lock while calling a payment gateway; compute the fee, release the lock, charge, then mark the ticket PAID. If the gateway is unsure, the ticket stays ACTIVE and the driver retries — idempotency keys prevent double charges.</p>`,
    aiEra: `<p><b>What AI changes:</b> generating the happy-path flow is trivial for an assistant; the interview value has moved to <i>failure paths</i>: double exits, lost tickets, payment timeouts, two gates racing. Those are exactly the questions modern interviewers ask after you show working code.</p>
      <p><b>Use AI as a partner:</b> <code>List every way the park/unpark flow can fail and which class should detect each failure</code>, or <code>Write a multi-threaded test that parks 1000 cars from 8 threads into 500 spots and asserts no spot is used twice</code>. Run it — AI-written concurrency tests are a great way to catch your own races.</p>
      <p><b>Where AI goes wrong:</b> holding a lock across a payment call, using <code>HashMap</code> from several threads without synchronisation, computing fees with <code>double</code>, or rounding hours down. It often frees the spot before invalidating the ticket.</p>
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
      solution: {
        approach: `<p>Model each rule as a <code>PricingStrategy</code>: <code>SlabPricing</code> for the hourly tariff and <code>DailyCap</code> as a decorator. A <code>Tariff</code> maps each <code>VehicleType</code> to its chain and applies the lost-ticket rule. A weekend surcharge would be one more decorator — zero edits to existing classes.</p>`,
        code: J.g4_sol,
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
    deepDive: `<p><b>Why <code>Player</code> is an interface, not a class with a <code>Scanner</code>.</b> Reading from <code>System.in</code> inside the model makes the game untestable and ties it to a console. With <code>chooseMove(Board)</code>, a <code>ConsolePlayer</code>, a <code>ScriptedPlayer</code> (tests), a <code>MinimaxBot</code> and a <code>NetworkPlayer</code> are all equal citizens. The <code>Game</code> stays unaware of where moves come from.</p>
      <p><b>Short-circuit trap in counter updates.</b> <code>if (++rows[p][r] == n) return true;</code> returns before incrementing the column and diagonal counters. That is fine when a win ends the game, but <b>wrong</b> if you later add undo (counters drift). For reversible designs, update all counters first, then test — the undo guided problem shows this.</p>
      <p><b>Draw detection.</b> "Board full" is the simplest draw rule. An expert follow-up: detect an <i>inevitable</i> draw early — a line is "dead" once it contains two different symbols; when all 2n+2 lines are dead, no one can win. Track a per-line set of symbols present (or a bitmask) in O(1) per move.</p>
      <p><b>K-in-a-row generalisation.</b> When the win needs K &lt; N in a row (Gomoku: 5 on 15×15), whole-line counters no longer work. Walk outward from the last move in 4 directions and count consecutive same symbols, O(K) per move — still independent of board size.</p>
      <p><b>Immutability and history.</b> <code>Move</code> as a record makes history safe to expose. <code>Game.history()</code> returns an unmodifiable view so callers cannot rewrite the past. History enables replay, undo, and network sync (send moves, not boards).</p>
      <p><b>Game theory note.</b> 3×3 tic-tac-toe has 5,478 legal positions and is a forced draw with perfect play — which is why a minimax bot (practice problem) never loses and why interviewers like it as a "plug in an AI player" follow-up.</p>`,
    aiEra: `<p><b>What AI changes:</b> an assistant will produce a working 3×3 console game instantly — usually with a <code>Scanner</code> inside the game loop, a hard-coded 3, and an 8-line win check. Interviewers now jump straight to "make it N×N with 3 players and a bot" to see whether the structure bends or breaks.</p>
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
      solution: {
        approach: `<p>Keep 2n + 2 running sums. Each move updates at most 4 of them and compares them with the target (+n or −n). No board needed at all — that is the surprising part interviewers enjoy.</p>`,
        code: J.g5_sol,
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
        ['10–20', 'Entities + interfaces on paper; decide in-memory structures (maps, TreeSet, queues)'],
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
            ['nearest free slot', '<code>TreeSet&lt;Integer&gt;</code> of free slots → <code>pollFirst()</code> O(log n)'],
            ['colour queries', '<code>Map&lt;colour, TreeSet&lt;slot&gt;&gt;</code> — sorted output for free'],
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
      mcq: { q: 'Why must the counter-update code avoid early returns once undo exists?', options: ['Early returns are slower', 'If the row check returns before the column/diagonal counters are incremented, undo (which decrements all of them) leaves counters wrong', 'Java forbids it', 'It breaks redo only'], answer: 1, explain: 'execute() and undo() must be exact mirrors. Update every counter, then check for a win.' },
      hints: [
        `<p>Hint 1: a move is fully described by (row, col, player). If applying it is "+1 to some counters and write a symbol", undoing it is "−1 to the same counters and clear the cell".</p>`,
        `<p>Hint 2: <code>interface Command { void execute(); void undo(); }</code>; <code>MoveCommand</code> calls <code>board.apply(r, c, p, sym, +1 / −1)</code>. Keep two <code>Deque&lt;MoveCommand&gt;</code>: undo and redo.</p>`,
        `<p>Hint 3: play → execute, push undo, clear redo. undo → pop, undo(), push redo, then fix turn/over: if the game was over, re-open it and keep the turn with the winner; otherwise flip the turn back. redo mirrors this.</p>`
      ],
      solution: {
        approach: `<p>Each move becomes a <code>MoveCommand</code> that can apply or reverse itself in O(1). The game keeps undo/redo stacks. All counters are updated unconditionally (no early return), which makes reversal exact. Turn and game-over handling live in <code>UndoableGame</code>, the one class that owns turn order.</p>`,
        code: J.g6_sol,
        complexity: `<p>play / undo / redo: O(1) time. Memory O(moves) — a few ints per move instead of an n×n snapshot.</p>`,
        followUps: ['Limit undo to the last 3 moves (bounded deque)', 'Undo in a networked game: who is allowed to undo?', 'Replace stacks with an event log + cursor to support "jump to move k"']
      }
    }]
  });

  registerModule({
    id: 'lld07',
    title: 'LLD Interview Framework: Parking Lot & Tic-Tac-Toe',
    intro: `<p>This is the module where everything from the earlier LLD modules (OOP modelling, SOLID, clean code, design patterns) turns into <b>interview performance</b>. You will learn a repeatable 7-step framework — <b>clarify → entities → APIs → class diagram → patterns → code → extend</b> — and then apply it, slowly and completely, to the two most-asked LLD problems: <b>Parking Lot</b> and <b>Tic-Tac-Toe</b>.</p>
      <p>You will also see the "brute force" of design — the single God class that dumps everything into one file — and learn exactly why interviewers reject it even when it runs. Every design ends in complete, compilable Java 21 code, and every topic has an animated visualizer: the framework as a loop, the parking-lot class diagram built entity by entity, cars parking and leaving on a live spot grid, and a tic-tac-toe board detecting wins in O(1). Finish with extend-the-design follow-ups and mini machine-coding problems like the ones asked at Amazon, Flipkart, Uber and Swiggy.</p>`,
    goals: [
      'Run any LLD round with the 7-step framework, and know how many minutes to give each step in a 45- or 90-minute round',
      'Turn a vague prompt into entities, enums, records and interfaces, then into a class diagram with correct relationships and multiplicities',
      'Write a complete, thread-aware Parking Lot in Java: spot allocation strategy, ticket lifecycle, pricing strategy, display-board observer',
      'Write a complete N×N Tic-Tac-Toe with O(1) win detection, pluggable players (human/bot) and undo via the Command pattern',
      'Explain why a single-class procedural solution fails the rubric, and refactor one into a clean design',
      'Handle extend-the-design follow-ups (EV spots, reservations, K-in-a-row, replay, multiple gates) by adding classes instead of editing old ones'
    ],
    prereqs: `LLD 1 (OOP Modelling &amp; UML), LLD 2 (SOLID Principles), LLD 3 (Clean Code) and at least skim LLD 4–6 (Creational, Structural and Behavioral patterns — especially Strategy, Observer, Command, Factory, Builder, Decorator). Comfortable Java: interfaces, enums with fields, records, collections, basic <code>synchronized</code>.`,
    hours: 14,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
