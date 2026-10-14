(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------------- tiny helpers shared by all visualizers ---------------- */
  // a class / service / object box (class diagrams, request flows)
  function B(id, label, x, y, w) { var n = { id: id, label: label, x: x, y: y, shape: 'box' }; if (w) n.w = w; return n; }
  // a circle node (people in a debt graph, states in a state machine)
  function N(id, label, x, y) { return { id: id, label: label, x: x, y: y }; }
  function G(label, nodes, edges, o) {
    o = o || {};
    return { type: 'graph', label: label, directed: o.undirected ? false : true, height: o.h || 60, nodes: nodes.slice(), edges: edges.map(function (e) { return e.slice(); }), hl: o.hl || {}, ehl: o.ehl || {}, tags: o.tags || {} };
  }
  function F(narr, parts) { return { narr: narr, parts: parts }; }
  function TXT(html, label) { var p = { type: 'text', html: html }; if (label) p.label = label; return p; }
  function CODE(label, code, hl) { return { type: 'code', label: label, lang: 'java', code: code, hl: hl || {} }; }
  function VARS(label, vals, hl) { var v = {}; for (var k in vals) v[k] = vals[k]; return { type: 'vars', label: label, vals: v, hl: hl || {} }; }
  function TABLE(label, columns, rows, hl) { return { type: 'table', label: label, columns: columns.slice(), rows: rows.map(function (r) { return r.slice(); }), hl: hl || {} }; }
  function QUEUE(label, items, hl, front, back) { var q = { type: 'queue', label: label, items: items.slice(), hl: hl || {} }; if (front) q.frontLabel = front; if (back) q.backLabel = back; return q; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function cap(s) { s = String(s).trim().toLowerCase(); return s.charAt(0).toUpperCase() + s.slice(1); }
  function rupees(n) { return (n < 0 ? '-₹' : '₹') + Math.abs(n); }

  // Build a class diagram one step at a time. Each step: {narr, add:[nodes], edges:[[u,v,label]], hl, tags, note, code, remove:[ids]}
  // New nodes / edges of a step glow green ('ok') unless step.cls says otherwise.
  function buildDiagram(label, steps, h) {
    var nodes = [], edges = [], frames = [];
    steps.forEach(function (st) {
      if (st.remove) {
        nodes = nodes.filter(function (n) { return st.remove.indexOf(n.id) < 0; });
        edges = edges.filter(function (e) { return st.remove.indexOf(e[0]) < 0 && st.remove.indexOf(e[1]) < 0; });
      }
      (st.add || []).forEach(function (n) { nodes.push(n); });
      (st.edges || []).forEach(function (e) { edges.push(e); });
      var hl = {}, ehl = {};
      (st.add || []).forEach(function (n) { hl[n.id] = st.cls || 'ok'; });
      (st.edges || []).forEach(function (e) { ehl[e[0] + '-' + e[1]] = st.cls || 'ok'; });
      if (st.hl) for (var k in st.hl) hl[k] = st.hl[k];
      if (st.ehl) for (var k2 in st.ehl) ehl[k2] = st.ehl[k2];
      var parts = [G(label, nodes, edges, { h: h || 60, hl: hl, ehl: ehl, tags: st.tags || {} })];
      if (st.code) parts.push(CODE('Java skeleton for this step', st.code, st.codeHl));
      if (st.table) parts.push(st.table);
      if (st.note) parts.push(TXT(st.note, 'Why this matters'));
      frames.push(F(st.narr, parts));
    });
    return frames;
  }

  // Walk a request through a box diagram edge by edge. path = [[u, v, cls?, narr, extraParts?]]
  function walkFlow(label, nodes, edges, path, h) {
    var frames = [], done = {}, hl = {};
    path.forEach(function (p) {
      var ehl = {};
      for (var k in done) ehl[k] = done[k];
      var key = p[0] + '-' + p[1];
      ehl[key] = p[2] || 'cur';
      var nhl = {};
      for (var k3 in hl) nhl[k3] = hl[k3];
      nhl[p[1]] = p[2] === 'bad' ? 'bad' : 'cur';
      var parts = [G(label, nodes, edges, { h: h || 60, hl: nhl, ehl: ehl })];
      (p[4] || []).forEach(function (x) { parts.push(x); });
      frames.push(F(p[3], parts));
      done[key] = p[2] === 'bad' ? 'bad' : 'done';
      hl[p[1]] = p[2] === 'bad' ? 'bad' : 'done';
    });
    return frames;
  }

  /* ======================= TOPIC 1: BOOKMYSHOW — DOMAIN & CLASS DESIGN ======================= */
  var BMS_MODEL = `// ================= BookMyShow core domain model (single file, compiles as-is) =================
// Money is ALWAYS in paise (long). 1 rupee = 100 paise. Never use double for money.

enum SeatType { REGULAR, PREMIUM, RECLINER }
enum SeatStatus { AVAILABLE, HELD, BOOKED }
enum BookingStatus { PENDING, CONFIRMED, CANCELLED, EXPIRED }

// ---------- Catalogue: things that almost never change ----------
final class Movie {
    final String id, title, language;
    final int durationMins;
    Movie(String id, String title, int durationMins, String language) {
        this.id = id; this.title = title; this.durationMins = durationMins; this.language = language;
    }
}

// A PHYSICAL chair. It exists exactly once, no matter how many shows run.
final class Seat {
    final String id;          // "B4"
    final int row, col;
    final SeatType type;
    Seat(String id, int row, int col, SeatType type) { this.id = id; this.row = row; this.col = col; this.type = type; }
}

final class Screen {           // an auditorium: Screen COMPOSES its seats
    final String id, name;
    final List<Seat> seats;
    Screen(String id, String name, List<Seat> seats) { this.id = id; this.name = name; this.seats = List.copyOf(seats); }
}

final class Theatre {          // a building in a city: Theatre COMPOSES its screens
    final String id, name, city;
    final List<Screen> screens = new ArrayList<>();
    Theatre(String id, String name, String city) { this.id = id; this.name = name; this.city = city; }
    void addScreen(Screen s) { screens.add(s); }
}

// ---------- Inventory: changes every second ----------
// A chair IN ONE SHOW. This is the thing we actually sell.
final class ShowSeat {
    final Seat seat;
    final long pricePaise;
    SeatStatus status = SeatStatus.AVAILABLE;
    String heldBy;             // userId while HELD or BOOKED
    Instant holdExpiresAt;     // only meaningful while HELD
    ShowSeat(Seat seat, long pricePaise) { this.seat = seat; this.pricePaise = pricePaise; }
}

// Pricing is a Strategy: weekend surge, recliner premium, festival pricing... all pluggable.
interface PricingStrategy { long price(Seat seat, Instant showStart); }

final class TieredPricing implements PricingStrategy {
    private static final ZoneId IST = ZoneId.of("Asia/Kolkata");
    public long price(Seat seat, Instant showStart) {
        long base = switch (seat.type) {
            case REGULAR -> 200_00;
            case PREMIUM -> 350_00;
            case RECLINER -> 600_00;
        };
        DayOfWeek d = showStart.atZone(IST).getDayOfWeek();
        boolean weekend = d == DayOfWeek.SATURDAY || d == DayOfWeek.SUNDAY;
        return weekend ? base * 120 / 100 : base;   // +20% on weekends
    }
}

// A Show = (Movie, Screen, start time). It OWNS one ShowSeat per physical Seat.
final class Show {
    final String id;
    final Movie movie;
    final Screen screen;
    final Instant start;
    final Map<String, ShowSeat> seats = new LinkedHashMap<>();
    Show(String id, Movie movie, Screen screen, Instant start, PricingStrategy pricing) {
        this.id = id; this.movie = movie; this.screen = screen; this.start = start;
        for (Seat s : screen.seats) seats.put(s.id, new ShowSeat(s, pricing.price(s, start)));
    }
    Instant end() { return start.plus(Duration.ofMinutes(movie.durationMins)); }
    List<ShowSeat> available() {
        return seats.values().stream().filter(x -> x.status == SeatStatus.AVAILABLE).toList();
    }
}

final class User {
    final String id, name;
    User(String id, String name) { this.id = id; this.name = name; }
}

final class Booking {
    final String id;
    final User user;
    final Show show;
    final List<ShowSeat> seats;
    final long amountPaise;
    BookingStatus status = BookingStatus.PENDING;
    Booking(String id, User user, Show show, List<ShowSeat> seats, long amountPaise) {
        this.id = id; this.user = user; this.show = show; this.seats = List.copyOf(seats); this.amountPaise = amountPaise;
    }
}

// ---------- Search: city -> shows, with an overlap guard per screen ----------
final class ShowCatalog {
    private final Map<String, List<Show>> showsByCity = new HashMap<>();
    private final Map<String, Theatre> theatreOfScreen = new HashMap<>();

    void addTheatre(Theatre t) { for (Screen s : t.screens) theatreOfScreen.put(s.id, t); }

    void addShow(Show show) {
        Theatre t = theatreOfScreen.get(show.screen.id);
        if (t == null) throw new IllegalArgumentException("unknown screen " + show.screen.id);
        for (Show other : showsByCity.getOrDefault(t.city, List.of())) {
            boolean sameScreen = other.screen == show.screen;
            boolean overlap = other.start.isBefore(show.end()) && show.start.isBefore(other.end());
            if (sameScreen && overlap) throw new IllegalStateException("overlaps show " + other.id);
        }
        showsByCity.computeIfAbsent(t.city, k -> new ArrayList<>()).add(show);
    }

    List<Movie> moviesIn(String city) {
        return showsByCity.getOrDefault(city, List.of()).stream().map(s -> s.movie).distinct().toList();
    }

    List<Show> showsOf(String city, String movieId) {
        return showsByCity.getOrDefault(city, List.of()).stream()
                .filter(s -> s.movie.id.equals(movieId))
                .sorted(Comparator.comparing((Show s) -> s.start))
                .toList();
    }
}

// ---------- Booking flow: depends on ABSTRACTIONS (Dependency Inversion) ----------
interface SeatLockProvider {                     // in-memory today, Redis / DB tomorrow
    boolean hold(Show show, List<ShowSeat> seats, User user);     // all-or-nothing
    boolean confirm(Show show, List<ShowSeat> seats, User user);  // HELD -> BOOKED if hold still valid
    void release(Show show, List<ShowSeat> seats, User user);     // HELD -> AVAILABLE
}

interface PaymentGateway {
    boolean charge(String userId, long amountPaise, String idempotencyKey);
    void refund(String idempotencyKey);
}

// Simple, correct, coarse: ONE monitor for everything. The next topic makes it per-show.
final class CoarseLockProvider implements SeatLockProvider {
    private final Clock clock;
    private final Duration ttl;
    CoarseLockProvider(Clock clock, Duration ttl) { this.clock = clock; this.ttl = ttl; }

    private boolean freeFor(ShowSeat s, User u, Instant now) {
        if (s.status == SeatStatus.AVAILABLE) return true;
        if (s.status == SeatStatus.BOOKED) return false;
        return now.isAfter(s.holdExpiresAt) || u.id.equals(s.heldBy);   // expired hold or my own hold
    }
    public synchronized boolean hold(Show show, List<ShowSeat> seats, User u) {
        Instant now = clock.instant();
        for (ShowSeat s : seats) if (!freeFor(s, u, now)) return false;      // phase 1: check ALL
        for (ShowSeat s : seats) {                                            // phase 2: take ALL
            s.status = SeatStatus.HELD; s.heldBy = u.id; s.holdExpiresAt = now.plus(ttl);
        }
        return true;
    }
    public synchronized boolean confirm(Show show, List<ShowSeat> seats, User u) {
        Instant now = clock.instant();
        for (ShowSeat s : seats)
            if (s.status != SeatStatus.HELD || !u.id.equals(s.heldBy) || now.isAfter(s.holdExpiresAt)) return false;
        for (ShowSeat s : seats) { s.status = SeatStatus.BOOKED; s.holdExpiresAt = null; }
        return true;
    }
    public synchronized void release(Show show, List<ShowSeat> seats, User u) {
        for (ShowSeat s : seats)
            if (s.status == SeatStatus.HELD && u.id.equals(s.heldBy)) { s.status = SeatStatus.AVAILABLE; s.heldBy = null; }
    }
}

final class BookingService {
    private final SeatLockProvider locks;
    private final PaymentGateway payments;
    private final Map<String, Booking> bookings = new ConcurrentHashMap<>();
    private final AtomicLong ids = new AtomicLong();

    BookingService(SeatLockProvider locks, PaymentGateway payments) { this.locks = locks; this.payments = payments; }

    // Step 1: user picks seats -> we HOLD them and create a PENDING booking
    Booking start(User u, Show show, List<String> seatIds) {
        List<ShowSeat> chosen = new ArrayList<>();
        for (String id : seatIds) {
            ShowSeat s = show.seats.get(id);
            if (s == null) throw new IllegalArgumentException("no seat " + id);
            chosen.add(s);
        }
        if (!locks.hold(show, chosen, u)) throw new IllegalStateException("some seats were just taken, pick again");
        long amount = chosen.stream().mapToLong(s -> s.pricePaise).sum();
        Booking b = new Booking("BK" + ids.incrementAndGet(), u, show, chosen, amount);
        bookings.put(b.id, b);
        return b;
    }

    // Step 2: payment -> confirm. The booking id doubles as the payment idempotency key.
    Booking pay(String bookingId) {
        Booking b = bookings.get(bookingId);
        if (b == null) throw new IllegalArgumentException("no booking " + bookingId);
        if (b.status != BookingStatus.PENDING) return b;                      // retry-safe
        if (!payments.charge(b.user.id, b.amountPaise, b.id)) {
            locks.release(b.show, b.seats, b.user);
            b.status = BookingStatus.CANCELLED;
            return b;
        }
        if (!locks.confirm(b.show, b.seats, b.user)) {                        // hold expired during payment
            payments.refund(b.id);
            b.status = BookingStatus.EXPIRED;
            return b;
        }
        b.status = BookingStatus.CONFIRMED;
        return b;
    }
}

public class BookMyShowDemo {
    public static void main(String[] args) {
        List<Seat> seats = new ArrayList<>();
        for (int r = 0; r < 3; r++)
            for (int c = 1; c <= 4; c++)
                seats.add(new Seat((char) ('A' + r) + "" + c, r, c, r == 2 ? SeatType.PREMIUM : SeatType.REGULAR));
        Screen audi1 = new Screen("SCR1", "Audi 1", seats);
        Theatre pvr = new Theatre("T1", "PVR Forum", "Bengaluru");
        pvr.addScreen(audi1);

        ShowCatalog catalog = new ShowCatalog();
        catalog.addTheatre(pvr);
        Movie movie = new Movie("M1", "Interstellar", 169, "English");
        Instant sat6pm = LocalDateTime.of(2026, 10, 17, 18, 0).atZone(ZoneId.of("Asia/Kolkata")).toInstant();
        Show evening = new Show("SH1", movie, audi1, sat6pm, new TieredPricing());
        catalog.addShow(evening);
        try {
            catalog.addShow(new Show("SH2", movie, audi1, sat6pm.plus(Duration.ofHours(1)), new TieredPricing()));
        } catch (IllegalStateException e) {
            System.out.println("Rejected: " + e.getMessage());           // same screen, overlapping time
        }

        PaymentGateway alwaysOk = new PaymentGateway() {
            public boolean charge(String userId, long amountPaise, String key) { return true; }
            public void refund(String key) { System.out.println("refund " + key); }
        };
        BookingService service = new BookingService(new CoarseLockProvider(Clock.systemUTC(), Duration.ofMinutes(10)), alwaysOk);
        Booking b = service.start(new User("u1", "Asha"), evening, List.of("C3", "C4"));
        System.out.println(b.id + " amount (paise) = " + b.amountPaise);   // 2 premium seats on a Saturday
        System.out.println(service.pay(b.id).status + ", free seats left = " + evening.available().size());
    }
}`;

  topics.push({
    title: 'BookMyShow I: Requirements, Entities & the Class Design',
    analogy: `<p>Think of a <b>hotel</b>. Room 204 is one physical room. But the hotel does not sell "room 204" — it sells "room 204 <i>for the night of 17 October</i>". The same room is sold again for the 18th, the 19th, and so on. A cinema is exactly the same. Seat <b>B4</b> in Audi 1 is one physical chair, but BookMyShow sells "B4 <i>for the 6 pm show</i>", then again "B4 for the 9:30 pm show". If you only remember this one idea — <b>the chair and the chair-in-a-show are two different things</b> — you have already beaten half the candidates in this interview.</p>`,
    explain: `<p><b>The question:</b> "Design BookMyShow" (or "a movie ticket booking system"). In a machine-coding / LLD round you have 60–90 minutes. You must show you can turn a fuzzy product into clean classes, then write working code for the hard part (seat booking). Use the same framework as the Parking Lot module: <b>clarify → entities → relationships → APIs → patterns → code → extensions</b>.</p>
<h4>Step 1 — Clarify requirements (2–5 minutes, out loud)</h4>
<ul>
<li><b>Functional:</b> list cities → movies in a city → theatres and show times → seat map → select seats → <b>hold</b> them for a few minutes → pay → booking confirmed (or released). Cancel a booking. Admin adds theatres, screens, movies and shows.</li>
<li><b>Non-functional:</b> <span class="c-r">never sell one seat twice</span> (the #1 rule), holds expire (e.g. 10 min), many people booking the same show at release time (high contention), pricing differs per seat type and per show.</li>
<li><b>Out of scope (say it!):</b> reviews, food ordering, recommendations, real payment integration.</li>
</ul>
<h4>Step 2 — Find the nouns (entities)</h4>
${H.table(['Entity', 'What it means in plain English', 'Changes how often?'], [
  ['<b>Movie</b>', 'The film itself: title, language, duration', 'Rarely'],
  ['<b>Theatre</b>', 'A building in a city (PVR Forum)', 'Rarely'],
  ['<b>Screen</b>', 'One auditorium inside a theatre (Audi 1)', 'Rarely'],
  ['<b>Seat</b>', 'One physical chair: row, column, type', 'Rarely'],
  ['<b>Show</b>', 'Movie + Screen + start time', 'Daily'],
  ['<b>ShowSeat</b>', H.c('y', 'A chair inside one show: status + price + who holds it'), H.c('r', 'Every second')],
  ['<b>Booking</b>', 'A user\'s order: show, seats, amount, status', 'Per order'],
  ['<b>User / Payment</b>', 'Who books, and how they pay', 'Per order']
])}
<p>Notice the split: <b>catalogue</b> objects (Movie, Theatre, Screen, Seat) are almost read-only. <b>Inventory</b> objects (ShowSeat, Booking) change all the time and are where all the concurrency pain lives. Keeping them separate is what makes the design scale.</p>
<h4>Step 3 — Relationships</h4>
<ul>
<li>Theatre <b>composes</b> Screens; Screen <b>composes</b> Seats (delete the theatre → screens go too).</li>
<li>Show <b>refers to</b> a Movie and a Screen (association — the movie lives on after the show).</li>
<li>Show <b>owns</b> one ShowSeat per Seat (composition, created when the show is scheduled).</li>
<li>Booking <b>refers to</b> a User, a Show and a list of ShowSeats.</li>
</ul>
<h4>Step 4 — Services &amp; patterns</h4>
<p><code>ShowCatalog</code> (search), <code>BookingService</code> (orchestrates hold → pay → confirm), <code>SeatLockProvider</code> (an <b>interface</b> so we can swap in-memory locks for Redis later — Dependency Inversion), <code>PricingStrategy</code> (Strategy pattern), <code>PaymentGateway</code> (interface, so tests use a fake). Notifications ("your ticket is confirmed") fit the Observer pattern.</p>`,
    clues: [
      '"Design BookMyShow / a movie ticket booking system / an event ticketing app"',
      '"The same screen runs 4 shows a day" → you need a per-show seat object (ShowSeat), not a status on Seat',
      '"Seat is held for 10 minutes while the user pays" → HELD state with an expiry time',
      '"Two users must never get the same seat" → concurrency + all-or-nothing hold (next topic)',
      '"Prices differ by seat type and weekend" → PricingStrategy',
      '"Later we want concerts and stand-up shows" → generalise Movie into an Event interface',
      '"Keep it testable / swap Redis later" → depend on interfaces (SeatLockProvider, PaymentGateway, Clock)'
    ],
    code: BMS_MODEL,
    codeTitle: 'BookMyShow domain model + booking flow (compilable Java 21)',
    viz: [{
      title: 'Build the BookMyShow class diagram step by step',
      gen: function () {
        return buildDiagram('BookMyShow class diagram', [
          { narr: 'Start with the obvious nouns from the requirements: <b>Movie</b> and <b>Theatre</b>. A theatre lives in a city.', add: [B('Movie', 'Movie', 12, 8), B('Theatre', 'Theatre (city)', 12, 34)] },
          { narr: 'A theatre <b>composes</b> screens (auditoriums), and each screen composes physical <b>Seat</b>s (row, col, type). These rarely change.', add: [B('Screen', 'Screen', 38, 34), B('Seat', 'Seat (physical)', 64, 34)], edges: [['Theatre', 'Screen', 'has 1..*'], ['Screen', 'Seat', 'has 1..*']] },
          { narr: '<span class="c-r">Naive trap:</span> put <code>status</code> on Seat. But Audi 1 runs a 9 am, 1 pm, 6 pm and 10 pm show — the same chair can be free at 9 am and sold at 6 pm. One status field cannot hold four answers. This is the "brute force" design that breaks on day one.', hl: { Seat: 'bad' }, tags: { Seat: 'status? ✖' }, note: 'A single <code>Seat.status</code> would make selling B4 for the 6 pm show also mark it sold for every other show of that screen.' },
          { narr: 'Fix: a <b>Show</b> = Movie + Screen + start time. The show is the thing people buy tickets for.', add: [B('Show', 'Show (time)', 38, 8)], edges: [['Show', 'Movie', 'plays'], ['Show', 'Screen', 'in']], hl: { Seat: '' } },
          { narr: 'The key class: <b>ShowSeat</b> = one physical seat inside one show. It holds <b>status</b> (AVAILABLE / HELD / BOOKED), <b>price</b> and <b>who holds it until when</b>. Created when the show is scheduled — one per seat.', add: [B('ShowSeat', 'ShowSeat', 64, 8)], edges: [['Show', 'ShowSeat', 'owns 1..*'], ['ShowSeat', 'Seat', 'wraps']], tags: { ShowSeat: 'status, price' } },
          { narr: 'A <b>Booking</b> belongs to a <b>User</b> and points at one Show and the ShowSeats chosen. Status: PENDING → CONFIRMED / CANCELLED / EXPIRED.', add: [B('Booking', 'Booking', 88, 8), B('User', 'User', 88, 34)], edges: [['Booking', 'ShowSeat', 'seats'], ['Booking', 'User', 'by']] },
          { narr: 'Services on top. <b>BookingService</b> orchestrates hold → pay → confirm. It depends on <b>interfaces</b> (SeatLockProvider, PaymentGateway), so in-memory locks can become Redis without touching it.', add: [B('BS', 'BookingService', 38, 55), B('SLP', '«interface» SeatLockProvider', 68, 55, 22), B('PG', '«interface» PaymentGateway', 92, 55, 16)], edges: [['BS', 'SLP', 'uses'], ['BS', 'PG', 'uses'], ['BS', 'Booking', 'creates']] },
          { narr: '<b>PricingStrategy</b> computes each ShowSeat price (seat type × weekend × festival). Finished: catalogue on the left/middle, inventory on the right, services at the bottom.', add: [B('PS', '«interface» PricingStrategy', 12, 55, 20)], edges: [['Show', 'PS', 'prices via']], note: 'Read the diagram top-to-bottom in the interview: "catalogue rarely changes, ShowSeat changes every second, BookingService protects ShowSeat."' }
        ], 66);
      }
    }, {
      title: 'One booking request travelling through the classes',
      input: 'success',
      inputLabel: 'Scenario: success | payment-fails | hold-expired',
      gen: function (input) {
        var mode = String(input || 'success').trim().toLowerCase();
        if (['success', 'payment-fails', 'hold-expired'].indexOf(mode) < 0) throw new Error('Type success, payment-fails or hold-expired');
        var nodes = [B('U', 'User app', 8, 30), B('BS', 'BookingService', 32, 30), B('SLP', 'SeatLockProvider', 60, 10), B('PG', 'PaymentGateway', 60, 50), B('SS', 'ShowSeats (B3,B4)', 90, 10), B('BK', 'Booking', 90, 50)];
        var edges = [['U', 'BS', 'start / pay'], ['BS', 'SLP', 'hold / confirm'], ['SLP', 'SS', 'status'], ['BS', 'PG', 'charge'], ['BS', 'BK', 'save']];
        var seatT = function (st) { return TABLE('ShowSeat rows', ['seat', 'status', 'heldBy', 'expires'], [['B3', st, st === 'AVAILABLE' ? '-' : 'asha', st === 'HELD' ? '18:10' : '-'], ['B4', st, st === 'AVAILABLE' ? '-' : 'asha', st === 'HELD' ? '18:10' : '-']], st === 'BOOKED' ? { 0: 'ok', 1: 'ok' } : st === 'HELD' ? { 0: 'cur', 1: 'cur' } : {}); };
        var path = [
          ['U', 'BS', 'cur', '18:00 — Asha taps B3, B4 and presses "Book". The app calls <code>BookingService.start(asha, show, [B3, B4])</code>.', [seatT('AVAILABLE')]],
          ['BS', 'SLP', 'cur', 'BookingService never flips seat status itself; it asks the <b>SeatLockProvider</b> to <b>hold</b> both seats, all-or-nothing.', [seatT('AVAILABLE')]],
          ['SLP', 'SS', 'ok', 'Both seats were AVAILABLE, so both become <b>HELD by asha until 18:10</b>. Other users now see them greyed out.', [seatT('HELD')]],
          ['BS', 'BK', 'ok', 'A <b>PENDING</b> Booking BK1 is saved with the total (sum of ShowSeat prices). Its id doubles as the payment <b>idempotency key</b>.', [seatT('HELD'), VARS('Booking BK1', { status: 'PENDING', amount: '₹700' }, { status: 'cur' })]],
          ['BS', 'PG', mode === 'payment-fails' ? 'bad' : 'ok', mode === 'payment-fails' ? 'The card is declined. <span class="c-r">charge() returns false.</span>' : '18:04 — Asha pays. <code>charge(asha, ₹700, "BK1")</code> succeeds. If the app retries, the same key means no double charge.', [seatT('HELD')]]
        ];
        var frames = walkFlow('Booking flow', nodes, edges, path, 60);
        if (mode === 'success') {
          frames.push(F('BookingService asks the provider to <b>confirm</b>: the hold still belongs to asha and has not expired → both seats become <b>BOOKED</b>; booking CONFIRMED.', [G('Booking flow', nodes, edges, { hl: { SS: 'ok', BK: 'ok' }, ehl: { 'BS-SLP': 'ok', 'SLP-SS': 'ok' } }), seatT('BOOKED'), VARS('Booking BK1', { status: 'CONFIRMED', amount: '₹700' }, { status: 'ok' })]));
          frames.push(F('Done. Notice who did what: catalogue classes never changed, only ShowSeat rows and the Booking row did. That is the whole design in one picture.', [seatT('BOOKED'), TXT('Order: <b>hold → charge → confirm</b>. Holding first means nobody else can grab the seats while the user is on the payment page.')]));
        } else if (mode === 'payment-fails') {
          frames.push(F('Payment failed, so the service calls <b>release</b>: seats go back to AVAILABLE immediately (no need to wait 10 minutes). Booking → CANCELLED.', [G('Booking flow', nodes, edges, { hl: { SS: 'ok', BK: 'bad' }, ehl: { 'BS-SLP': 'cur', 'SLP-SS': 'ok' } }), seatT('AVAILABLE'), VARS('Booking BK1', { status: 'CANCELLED' }, { status: 'bad' })]));
          frames.push(F('Lesson: every failure path must give the seats back. Releasing early is kinder than letting the hold silently expire.', [seatT('AVAILABLE'), TXT('Always write the <b>unhappy path</b> in the interview: declined card, timeout, app killed.')]));
        } else {
          frames.push(F('Asha was slow: the payment callback arrives at <b>18:12</b>, after the hold expired at 18:10. Someone else may already hold B3/B4. <b>confirm()</b> sees the hold is no longer valid → returns false.', [G('Booking flow', nodes, edges, { hl: { SS: 'bad' }, ehl: { 'BS-SLP': 'bad' } }), TABLE('ShowSeat rows', ['seat', 'status', 'heldBy', 'expires'], [['B3', 'HELD', 'ben', '18:21'], ['B4', 'HELD', 'ben', '18:21']], { 0: 'bad', 1: 'bad' })]));
          frames.push(F('So we <b>refund</b> asha (money taken, seats not delivered) and mark the booking EXPIRED. Never "steal" the seats back from Ben.', [VARS('Booking BK1', { status: 'EXPIRED', refund: 'issued' }, { status: 'bad', refund: 'ok' }), TXT('This is why <code>PaymentGateway</code> needs <code>refund()</code> and why charge uses an idempotency key.')]));
        }
        return frames;
      }
    }],
    examples: [
      { title: 'Why ShowSeat exists: one chair, four answers', html: `<p>Audi 1 runs four shows on Saturday. Seat B4 has a different fate in each:</p>${H.table(['Show', 'B4 status', 'B4 price'], [['09:00', H.c('g', 'AVAILABLE'), '₹240'], ['13:00', H.c('y', 'HELD (ravi, till 12:41)'), '₹240'], ['18:00', H.c('r', 'BOOKED (asha)'), '₹300'], ['22:00', H.c('g', 'AVAILABLE'), '₹300']])}<p>Four rows, four statuses, even different prices. That table <i>is</i> the ShowSeat collection. A <code>Seat.status</code> field would only have room for one of these values.</p>` },
      { title: 'Pricing as a Strategy (weekend + seat type)', html: `<p>Regular seat base ₹200, Saturday show → ₹200 × 1.2 = ₹240 = <b>24000 paise</b>. A recliner on a Tuesday → ₹600. Tomorrow product wants "festival pricing": write <code>FestivalPricing implements PricingStrategy</code>, pass it into <code>new Show(...)</code>. No existing class changes — Open/Closed in action.</p>`, code: `interface PricingStrategy { long price(String seatType, boolean weekend); }

final class FestivalPricing implements PricingStrategy {
    private final PricingStrategy base;     // decorate the normal pricing
    private final int surgePercent;
    FestivalPricing(PricingStrategy base, int surgePercent) { this.base = base; this.surgePercent = surgePercent; }
    public long price(String seatType, boolean weekend) {
        return base.price(seatType, weekend) * (100 + surgePercent) / 100;
    }
}

class PricingDemo {
    public static void main(String[] args) {
        PricingStrategy normal = (type, weekend) -> (type.equals("RECLINER") ? 600_00 : 200_00) * (weekend ? 120 : 100) / 100;
        PricingStrategy diwali = new FestivalPricing(normal, 25);
        System.out.println(normal.price("REGULAR", true));   // 24000 paise = Rs 240
        System.out.println(diwali.price("REGULAR", true));   // 30000 paise = Rs 300
    }
}` },
      { title: 'Rejecting overlapping shows on the same screen', html: `<p>Interstellar is 169 minutes. Show 1 runs 18:00 → 20:49. An admin tries to add Show 2 at 19:00 on the same screen. Two intervals [a1, b1) and [a2, b2) overlap exactly when <code>a1 &lt; b2 &amp;&amp; a2 &lt; b1</code>: 18:00 &lt; 21:49 and 19:00 &lt; 20:49 → ${H.c('r', 'overlap → reject')}. Real cinemas also add a 15-minute cleaning buffer — just extend <code>end()</code> by the buffer.</p>` },
      { title: 'Extending to concerts and stand-up comedy', html: `<p>Interviewer: "Now support concerts." Rename the idea: a <b>Show</b> plays an <b>Event</b>. Make <code>Movie</code> one implementation of <code>interface Event { String title(); Duration duration(); }</code>, add <code>Concert</code> and <code>StandUp</code>. Concerts often have <b>standing zones</b> with a capacity instead of numbered seats — model that as <code>ZoneInventory</code> with an atomic counter, behind the same <code>SeatLockProvider</code>-style interface. The booking flow does not change.</p>` }
    ],
    deepDive: `<p><b>Catalogue vs inventory is the real architecture.</b> Movie/Theatre/Screen/Seat are read 1000× more than written — cache them aggressively (even in the app's memory). ShowSeat is write-hot and must be the <i>single source of truth</i>; all concurrency control lives around it. In a database this is a <code>show_seat(show_id, seat_id, status, held_by, hold_expires_at, version)</code> table with primary key <code>(show_id, seat_id)</code>.</p>
<p><b>Money and time.</b> Store paise in <code>long</code> (or <code>BigDecimal</code> with scale 2) — <code>0.1 + 0.2 != 0.3</code> in double. Store show times as <code>Instant</code> (UTC) and convert to the theatre's <code>ZoneId</code> only for display and for rules like "weekend". Inject a <code>java.time.Clock</code> so tests can freeze or fast-forward time (crucial for testing hold expiry).</p>
<p><b>Lazily creating ShowSeats.</b> A 300-seat screen × 5 shows × 365 days = 547k rows a year per screen. That is fine for a DB, but some systems create ShowSeat rows only when the show opens for sale, or store a compact bitmap per show (1 bit per seat for "booked") plus a small map of active holds.</p>
<p><b>Booking state machine.</b> PENDING → CONFIRMED | CANCELLED | EXPIRED, and CONFIRMED → CANCELLED (refund). Encode allowed transitions explicitly; a late payment webhook on an EXPIRED booking must trigger a refund, never a confirm.</p>
<p><b>Idempotency.</b> Payment gateways retry webhooks and users double-tap. Use the booking id as the idempotency key for <code>charge</code>, and make <code>pay()</code> return early if the booking is no longer PENDING — that is why the code checks the status first.</p>
<p><b>Where the patterns are:</b> Strategy (pricing, refund policy), Observer (notifications, waitlist), Factory (creating ShowSeats from a Screen layout), Facade (BookingService hides lock + payment + persistence), Dependency Inversion (SeatLockProvider, PaymentGateway, Clock).</p>`,
    aiEra: `<p><b>What AI changes:</b> an assistant can spit out 15 entity classes with getters in seconds. That is no longer impressive in an interview — the <i>judgement</i> is: spotting the Seat vs ShowSeat split, keeping money in paise, putting concurrency behind an interface, and naming the failure paths (declined card, late webhook, expired hold).</p>
<p><b>Use AI as a partner:</b> <code>Here are my BookMyShow classes. List 10 requirements they cannot support yet and the smallest change for each.</code> or <code>Generate JUnit tests for BookingService using a fixed Clock — include hold expiry and a late payment callback.</code></p>
<p><b>Where AI goes wrong:</b> it often stores <code>status</code> directly on <code>Seat</code>, uses <code>double price</code>, forgets that holds expire, calls the payment gateway <i>before</i> holding seats, or writes a <code>synchronized</code> method on a Spring singleton and calls it "distributed safe". Always review the generated code against the invariants: one seat → at most one active owner per show.</p>
<p><b>What you must still own:</b> the requirement questions, the entity split, the state machine, and the ability to explain why your design will not double-sell under load.</p>`,
    problems: [{
      title: 'Suggest the Best Block of k Adjacent Seats',
      level: 'Medium', tags: ['bookmyshow', 'seat map', 'sliding window'], companies: ['BookMyShow', 'Paytm', 'Amazon'],
      statement: `<p>BookMyShow's "best available" button picks seats for you. Given a seat map for one show as <code>char[][]</code> (<code>'.'</code> = available, <code>'X'</code> = taken) and a group size <b>k</b>, return <code>{row, startCol}</code> of <b>k adjacent free seats in one row</b>. Prefer the row closest to the middle row (best view); among equally good rows, prefer the block whose centre is closest to the middle column. Return <code>null</code> if no block exists.</p>`,
      constraints: `1 ≤ rows, cols ≤ 500, 1 ≤ k ≤ cols`,
      example: `<p>Map (5 rows × 8 cols), k = 3:</p><pre>row0 ........
row1 XX..XXXX
row2 ..XX....
row3 ....X...
row4 ........</pre><p>Middle row is 2. Row 2 has free run cols 4..7 → blocks start 4 or 5. Middle column is 3.5: block 4..6 has centre 5 (distance 1.5), block 5..7 centre 6 (2.5). Answer ${H.c('g', '{2, 4}')}.</p>`,
      brute: { why: `<p>Naive: for every row and every start column, re-check all k cells → O(R·C·k). With k up to 500 that is 125M checks per click, and a <b>naive design</b> also scans rows in order 0..R and returns the first hit — the front row, which is the worst seat in the house.</p>`, code: `class BruteSuggest {
    static int[] firstFit(char[][] map, int k) {
        for (int r = 0; r < map.length; r++)
            for (int c = 0; c + k <= map[r].length; c++) {
                boolean ok = true;
                for (int j = c; j < c + k; j++) if (map[r][j] != '.') { ok = false; break; }
                if (ok) return new int[]{r, c};          // first fit = front row, bad seats
            }
        return null;
    }
}` },
      mcq: { q: 'How do you avoid re-checking k cells for every start position?', options: ['Keep a running count of consecutive free seats in the row', 'Sort the seats', 'Use a HashSet of taken seats', 'Binary search on k'], answer: 0, explain: 'A run counter resets on X and grows on "."; whenever run ≥ k, the block ending here is free — O(1) per cell.' },
      hints: [`<p>Hint 1: a block of k free seats ending at column c exists exactly when the number of consecutive '.' ending at c is at least k.</p>`, `<p>Hint 2: keep <code>run</code> per row; reset to 0 on 'X'. When <code>run ≥ k</code>, candidate start = c − k + 1. Score it.</p>`, `<p>Hint 3: score = |row − midRow| × cols + |blockCentre − midCol|. Multiplying the row distance by cols makes row preference always win over column preference. Track the minimum.</p>`],
      solution: {
        approach: `<p>One pass per row with a run counter (a tiny sliding window). Every valid block gets a score; keep the best. Row distance is weighted by the number of columns so that a better row always beats a better column.</p>`,
        code: `class SeatSuggester {
    /** returns {row, startCol} of the best k-block, or null */
    static int[] suggest(char[][] map, int k) {
        int rows = map.length, cols = map[0].length;
        double midRow = (rows - 1) / 2.0, midCol = (cols - 1) / 2.0;
        int[] best = null;
        double bestScore = Double.MAX_VALUE;
        for (int r = 0; r < rows; r++) {
            int run = 0;                                   // consecutive free seats ending at c
            for (int c = 0; c < cols; c++) {
                run = map[r][c] == '.' ? run + 1 : 0;
                if (run >= k) {
                    int start = c - k + 1;
                    double centre = start + (k - 1) / 2.0;
                    double score = Math.abs(r - midRow) * cols + Math.abs(centre - midCol);
                    if (score < bestScore) { bestScore = score; best = new int[]{r, start}; }
                }
            }
        }
        return best;
    }

    public static void main(String[] args) {
        String[] raw = {"........", "XX..XXXX", "..XX....", "....X...", "........"};
        char[][] map = new char[raw.length][];
        for (int i = 0; i < raw.length; i++) map[i] = raw[i].toCharArray();
        int[] ans = suggest(map, 3);
        System.out.println(ans[0] + "," + ans[1]);        // 2,4
    }
}`,
        complexity: `<p>O(R·C) time, O(1) extra space. For a 500×500 hall that is 250k steps — instant.</p>`,
        followUps: ['Allow blocks to wrap across an aisle? (No — model aisles as permanently taken cells.)', 'Return the top-3 suggestions using a small heap.', 'Hold the suggested seats atomically (combine with the next topic).']
      }
    }]
  });

  /* ======================= TOPIC 2: BOOKMYSHOW — CONCURRENT SEAT BOOKING ======================= */
  var BMS_LOCK = `// ===== Per-show locking with hold expiry (lock -> hold -> confirm). Self-contained, compiles as-is. =====
enum SeatState { AVAILABLE, HELD, BOOKED }

record HoldResult(boolean ok, String reason, Instant expiresAt) {}

final class SeatSlot {                       // one seat in one show (the "ShowSeat")
    final String seatId;
    SeatState state = SeatState.AVAILABLE;
    String owner;                            // user holding or owning it
    Instant holdUntil;                       // only for HELD
    SeatSlot(String seatId) { this.seatId = seatId; }

    // LAZY EXPIRY: an old hold is treated as free the moment anybody looks at it.
    boolean takeableBy(String user, Instant now) {
        return switch (state) {
            case AVAILABLE -> true;
            case BOOKED -> false;
            case HELD -> now.isAfter(holdUntil) || user.equals(owner);
        };
    }
}

final class ShowInventory {
    final String showId;
    final Map<String, SeatSlot> seats = new TreeMap<>();     // sorted -> deterministic order
    final ReentrantLock lock = new ReentrantLock(true);      // ONE lock per show (fair = FIFO-ish)
    ShowInventory(String showId, Collection<String> seatIds) {
        this.showId = showId;
        for (String id : seatIds) seats.put(id, new SeatSlot(id));
    }
}

final class SeatBookingService {
    private final Map<String, ShowInventory> shows = new ConcurrentHashMap<>();
    private final Clock clock;
    private final Duration holdTtl;

    SeatBookingService(Clock clock, Duration holdTtl) { this.clock = clock; this.holdTtl = holdTtl; }

    void addShow(String showId, Collection<String> seatIds) { shows.put(showId, new ShowInventory(showId, seatIds)); }

    private ShowInventory inv(String showId) {
        ShowInventory s = shows.get(showId);
        if (s == null) throw new IllegalArgumentException("unknown show " + showId);
        return s;
    }

    /** All-or-nothing hold. Two users on DIFFERENT shows never block each other. */
    HoldResult hold(String showId, String user, List<String> seatIds) {
        ShowInventory inv = inv(showId);
        inv.lock.lock();
        try {
            Instant now = clock.instant();
            for (String id : seatIds) {                              // phase 1: check every seat
                SeatSlot s = inv.seats.get(id);
                if (s == null) return new HoldResult(false, "no such seat " + id, null);
                if (!s.takeableBy(user, now)) return new HoldResult(false, id + " was just taken", null);
            }
            Instant until = now.plus(holdTtl);
            for (String id : seatIds) {                              // phase 2: take every seat
                SeatSlot s = inv.seats.get(id);
                s.state = SeatState.HELD; s.owner = user; s.holdUntil = until;
            }
            return new HoldResult(true, "held", until);
        } finally {
            inv.lock.unlock();                                       // ALWAYS in finally
        }
    }

    /** Payment succeeded: HELD -> BOOKED, but only if the hold is still mine and alive. */
    boolean confirm(String showId, String user, List<String> seatIds) {
        ShowInventory inv = inv(showId);
        inv.lock.lock();
        try {
            Instant now = clock.instant();
            for (String id : seatIds) {
                SeatSlot s = inv.seats.get(id);
                if (s == null || s.state != SeatState.HELD || !user.equals(s.owner) || now.isAfter(s.holdUntil)) return false;
            }
            for (String id : seatIds) { SeatSlot s = inv.seats.get(id); s.state = SeatState.BOOKED; s.holdUntil = null; }
            return true;
        } finally {
            inv.lock.unlock();
        }
    }

    /** User closed the app / payment failed: give seats back immediately. */
    void release(String showId, String user, List<String> seatIds) {
        ShowInventory inv = inv(showId);
        inv.lock.lock();
        try {
            for (String id : seatIds) {
                SeatSlot s = inv.seats.get(id);
                if (s != null && s.state == SeatState.HELD && user.equals(s.owner)) { s.state = SeatState.AVAILABLE; s.owner = null; s.holdUntil = null; }
            }
        } finally {
            inv.lock.unlock();
        }
    }

    /** Optional background sweeper (lazy expiry already keeps us correct; this just tidies the seat map). */
    int sweepExpired(String showId) {
        ShowInventory inv = inv(showId);
        inv.lock.lock();
        try {
            Instant now = clock.instant();
            int n = 0;
            for (SeatSlot s : inv.seats.values())
                if (s.state == SeatState.HELD && now.isAfter(s.holdUntil)) { s.state = SeatState.AVAILABLE; s.owner = null; s.holdUntil = null; n++; }
            return n;
        } finally {
            inv.lock.unlock();
        }
    }

    String stateOf(String showId, String seatId) { return inv(showId).seats.get(seatId).state.name(); }
}

public class RaceDemo {
    public static void main(String[] args) throws Exception {
        SeatBookingService svc = new SeatBookingService(Clock.systemUTC(), Duration.ofMinutes(10));
        svc.addShow("S1", List.of("B3", "B4", "B5"));

        // 1000 rounds of two users racing for the SAME seat at the same instant
        int doubleSold = 0;
        ExecutorService pool = Executors.newFixedThreadPool(2);
        for (int round = 0; round < 1000; round++) {
            svc.addShow("R" + round, List.of("B4"));
            String show = "R" + round;
            CountDownLatch go = new CountDownLatch(1);
            Future<HoldResult> a = pool.submit(() -> { go.await(); return svc.hold(show, "asha", List.of("B4")); });
            Future<HoldResult> b = pool.submit(() -> { go.await(); return svc.hold(show, "ben", List.of("B4")); });
            go.countDown();
            if (a.get().ok() && b.get().ok()) doubleSold++;
        }
        pool.shutdown();
        System.out.println("double-sold rounds = " + doubleSold);   // always 0
    }
}`;

  var BMS_CAS = `// ===== Lock-free alternative: one AtomicReference per seat + compare-and-set =====
final class CasSeat {
    // An IMMUTABLE snapshot. Changing state = swapping the whole snapshot atomically.
    record Snap(String status, String owner, long version) {}
    final String id;
    final AtomicReference<Snap> ref = new AtomicReference<>(new Snap("AVAILABLE", null, 0));
    CasSeat(String id) { this.id = id; }
}

final class CasBooking {
    /** Try to HOLD every seat; if any CAS loses, undo the ones we won (compensation). */
    static boolean holdAll(List<CasSeat> seats, String user) {
        List<CasSeat> won = new ArrayList<>();
        for (CasSeat s : seats) {
            CasSeat.Snap cur = s.ref.get();
            boolean free = cur.status().equals("AVAILABLE");
            if (!free || !s.ref.compareAndSet(cur, new CasSeat.Snap("HELD", user, cur.version() + 1))) {
                for (CasSeat w : won) {                               // roll back our partial grab
                    CasSeat.Snap mine = w.ref.get();
                    if (user.equals(mine.owner())) w.ref.compareAndSet(mine, new CasSeat.Snap("AVAILABLE", null, mine.version() + 1));
                }
                return false;
            }
            won.add(s);
        }
        return true;
    }

    public static void main(String[] args) {
        List<CasSeat> row = List.of(new CasSeat("B3"), new CasSeat("B4"), new CasSeat("B5"));
        System.out.println(holdAll(List.of(row.get(0), row.get(1)), "asha"));  // true
        System.out.println(holdAll(List.of(row.get(1), row.get(2)), "ben"));   // false: B4 taken
        System.out.println(row.get(2).ref.get().status());                       // AVAILABLE (rolled back)
    }
}`;

  topics.push({
    title: 'BookMyShow II: Concurrent Seat Booking (Lock → Hold → Confirm)',
    analogy: `<p>At a busy food court you grab a table by <b>putting your bag on a chair</b> while you go to order. Everyone else sees the bag and walks past — that is a <b>hold</b>. If you come back with food, you sit down — that is a <b>confirm</b>. If you never come back, after a while the cleaner moves the bag and the table is free again — that is <b>hold expiry</b>. Now imagine two people dropping a bag on the same chair at the <i>same moment</i>: somebody has to decide who was first. That "somebody" is the <b>lock</b>.</p>`,
    explain: `<p><b>The bug every naive design has: check-then-act.</b></p>
<pre>if (seat.status == AVAILABLE) {   // 1. check
    seat.status = BOOKED;          // 2. act
}</pre>
<p>Two threads (Asha's and Ben's requests) can both run line 1, both see AVAILABLE, and both run line 2. The seat is sold twice and two people fight in the cinema. The gap between "check" and "act" is called a <b>race window</b>. Every correct design closes that window by making check + act <b>one atomic step</b>.</p>
<h4>The three seat states</h4>
${H.table(['State', 'Meaning', 'Moves to'], [['<b>AVAILABLE</b>', 'Anyone can take it', 'HELD (user selects seats)'], ['<b>HELD</b>(user, until)', 'Reserved for one user while they pay (5–10 min)', 'BOOKED (payment ok) · AVAILABLE (cancel, failure, or time runs out)'], ['<b>BOOKED</b>', 'Sold. Final for this design', 'AVAILABLE only via an explicit cancellation + refund']])}
<h4>Ways to make check + act atomic (from simplest to most scalable)</h4>
<ol>
<li><b>One global lock</b> (<code>synchronized</code> on the service). Correct, but a blockbuster release in Mumbai blocks a quiet show in Pune. Throughput = one booking at a time for the whole country.</li>
<li><b>One lock per show</b> (<code>ReentrantLock</code> stored in the show's inventory). Shows never block each other; inside a show, holds take microseconds, so this is plenty. <span class="c-g">Best answer for an in-memory LLD round.</span></li>
<li><b>Per-seat atomic CAS</b> (<code>AtomicReference.compareAndSet</code>). No blocking at all, but multi-seat bookings need <b>roll-back</b> when one seat fails (all-or-nothing).</li>
<li><b>Database</b>: conditional update <code>UPDATE show_seat SET status='HELD' ... WHERE status='AVAILABLE' AND version=?</code> (optimistic) or <code>SELECT ... FOR UPDATE</code> (pessimistic), plus a unique constraint as the final safety net.</li>
<li><b>Distributed lock with TTL</b> (Redis <code>SET key value NX PX 600000</code>) when many app servers share the seat map — the TTL <i>is</i> the hold expiry.</li>
</ol>
<h4>All-or-nothing</h4>
<p>A family wants B3 + B4 together. If B4 is gone, holding only B3 is useless (and blocks others). So: <b>check every seat first, then take every seat</b>, all inside the same lock. With per-seat locks/CAS instead, always acquire in <b>sorted seat order</b> (prevents deadlock) and <b>roll back</b> partial grabs.</p>
<h4>Expiry: lazy vs sweeper</h4>
<p><b>Lazy</b>: a HELD seat whose <code>holdUntil</code> is in the past counts as free whenever anyone checks it — always correct, zero background threads. A <b>sweeper</b> (scheduled job) just tidies the seat map so other users see it green sooner. Use both.</p>`,
    clues: [
      '"Two users click the same seat at the same time" → race condition, check-then-act must become atomic',
      '"Seat is blocked for 10 minutes while paying" → HELD state + expiry timestamp (lazy expiry + sweeper)',
      '"User selects 4 seats together" → all-or-nothing hold; sorted lock order or single per-show lock',
      '"Payment confirmation can arrive late or twice" → confirm only if the hold is still yours; idempotent confirm; refund otherwise',
      '"Millions of users at ticket release" → per-show (or per-seat) locking, never one global lock',
      '"Multiple servers" → DB conditional update / optimistic version column / Redis SET NX PX'
    ],
    code: [BMS_LOCK, BMS_CAS, { lang: 'sql', code: `-- Optimistic locking in the database: the WHERE clause IS the "check", the UPDATE IS the "act".
CREATE TABLE show_seat (
  show_id TEXT, seat_id TEXT, status TEXT, held_by TEXT, version INTEGER,
  PRIMARY KEY (show_id, seat_id)
);
INSERT INTO show_seat VALUES ('S1', 'B4', 'AVAILABLE', NULL, 0);

-- Asha and Ben both READ version 0. Asha's update lands first:
UPDATE show_seat SET status = 'HELD', held_by = 'asha', version = version + 1
WHERE show_id = 'S1' AND seat_id = 'B4' AND status = 'AVAILABLE' AND version = 0;

-- Ben's identical update now matches ZERO rows (version is 1) -> app tells Ben "seat taken"
UPDATE show_seat SET status = 'HELD', held_by = 'ben', version = version + 1
WHERE show_id = 'S1' AND seat_id = 'B4' AND status = 'AVAILABLE' AND version = 0;

SELECT show_id, seat_id, status, held_by, version FROM show_seat;`, title: 'Same idea in SQL (runs in SQLite)' }],
    codeTitle: ['Per-show lock + hold expiry + race test (Java)', 'Lock-free CAS version with roll-back (Java)', 'Optimistic locking with a version column (SQL)'],
    viz: [{
      title: 'Seat map: Asha and Ben race for the same seats',
      input: 'B3 B4 | B4 B5 | pays',
      inputLabel: "Asha's seats | Ben's seats | what Asha does next: pays or timeout",
      gen: function (input) {
        var parts = String(input || '').split('|').map(function (s) { return s.trim(); });
        if (parts.length !== 3) throw new Error('Format: B3 B4 | B4 B5 | pays   (Asha seats | Ben seats | pays or timeout)');
        var parseSeats = function (s) {
          var t = s.toUpperCase().split(/[\s,]+/).filter(function (x) { return x; });
          if (!t.length || t.length > 6) throw new Error('Each user picks 1 to 6 seats, like B3 B4');
          t.forEach(function (x) { if (!/^[A-E][1-8]$/.test(x)) throw new Error('Seats are A1..E8 (rows A-E, columns 1-8). Bad: ' + x); });
          return t.filter(function (x, i) { return t.indexOf(x) === i; });
        };
        var asha = parseSeats(parts[0]), ben = parseSeats(parts[1]);
        var next = parts[2].toLowerCase();
        if (next !== 'pays' && next !== 'timeout') throw new Error('Third part must be pays or timeout');
        var ROWS = 'ABCDE', state = {};
        ['A1', 'A2', 'C5', 'C6', 'E1'].forEach(function (s) { state[s] = { st: 'BOOKED', by: 'old', until: 0 }; });
        var get = function (id) { return state[id] || { st: 'AVAILABLE' }; };
        var free = function (id, user, now) { var s = get(id); if (s.st === 'AVAILABLE') return true; if (s.st === 'BOOKED') return false; return now > s.until || s.by === user; };
        var grid = function (mark) {
          var rows = [], hl = {};
          for (var r = 0; r < 5; r++) {
            var row = [];
            for (var c = 1; c <= 8; c++) {
              var id = ROWS[r] + c, s = get(id), txt = '·';
              if (s.st === 'BOOKED') { txt = s.by === 'old' ? '✖' : '✔' + s.by.slice(0, 2); hl[r + ',' + (c - 1)] = s.by === 'old' ? 'done' : 'ok'; }
              else if (s.st === 'HELD') { txt = '⏳' + s.by.slice(0, 2); hl[r + ',' + (c - 1)] = s.by === 'Asha' ? 'cur' : 'win'; }
              if (mark && mark[id]) hl[r + ',' + (c - 1)] = mark[id];
              row.push(txt);
            }
            rows.push(row);
          }
          return { type: 'grid', label: 'Show S1 seat map  (· free, ⏳ held, ✔ booked, ✖ sold earlier)', rows: rows, rowHead: ROWS.split(''), colHead: ['1', '2', '3', '4', '5', '6', '7', '8'], hl: hl };
        };
        var tbl = function (now) {
          var rows = [];
          Object.keys(state).sort().forEach(function (id) { var s = state[id]; if (s.by !== 'old') rows.push([id, s.st, s.by, s.st === 'HELD' ? 't+' + s.until + ' min' + (now > s.until ? ' (expired)' : '') : '-']); });
          if (!rows.length) rows.push(['-', 'nothing held yet', '-', '-']);
          return TABLE('ShowSeat rows that changed', ['seat', 'status', 'owner', 'hold until'], rows);
        };
        var hold = function (user, seats, now) {
          for (var i = 0; i < seats.length; i++) if (!free(seats[i], user, now)) return seats[i];
          seats.forEach(function (id) { state[id] = { st: 'HELD', by: user, until: now + 10 }; });
          return null;
        };
        var confirm = function (user, seats, now) {
          for (var i = 0; i < seats.length; i++) { var s = get(seats[i]); if (s.st !== 'HELD' || s.by !== user || now > s.until) return seats[i]; }
          seats.forEach(function (id) { state[id] = { st: 'BOOKED', by: user, until: 0 }; });
          return null;
        };
        var lockCode = 'inv.lock.lock();\ntry {\n  for (id : seats) if (!takeable(id)) return FAIL;\n  for (id : seats) hold(id, user, now + TTL);\n  return OK;\n} finally { inv.lock.unlock(); }';
        var frames = [], mk = {};
        frames.push(F('Show S1, 18:00 (t = 0). Some seats were sold earlier (✖). <b>Asha</b> wants ' + asha.join(', ') + ' and <b>Ben</b> wants ' + ben.join(', ') + '. Both tap "Book" in the <b>same millisecond</b>. Hold time-to-live (TTL) = 10 minutes.', [grid(), QUEUE('Requests arriving at BookingService', ['Asha: hold ' + asha.join(','), 'Ben: hold ' + ben.join(',')], {}, 'first', 'last')]));
        frames.push(F('Both requests are for the <b>same show</b>, so they need the <b>same per-show lock</b>. Asha\'s thread wins the lock; Ben\'s thread <b>waits</b> (a few microseconds). A request for a different show would not wait at all.', [grid(), QUEUE('Waiting for show S1 lock', ['Ben'], { 0: 'cur' }), VARS('Lock owner', { 'S1.lock': 'Asha', TTL: '10 min', now: 't+0' }, { 'S1.lock': 'cur' }), CODE('Asha inside the lock', lockCode, { 1: 'ok' })]));
        asha.forEach(function (id) { mk[id] = free(id, 'Asha', 0) ? 'ok' : 'bad'; });
        frames.push(F('Phase 1 — <b>check every seat</b> Asha asked for: ' + asha.map(function (id) { return id + (mk[id] === 'ok' ? ' free ✔' : ' taken ✖'); }).join(', ') + '. Nothing has been changed yet.', [grid(mk), VARS('Lock owner', { 'S1.lock': 'Asha' }, {}), CODE('Asha inside the lock', lockCode, { 3: 'cur' })]));
        var badA = hold('Asha', asha, 0);
        if (badA) {
          frames.push(F('<span class="c-r">' + badA + ' is not free</span>, so Asha gets <b>nothing</b> (all-or-nothing). Holding only part of a family booking is useless and blocks others.', [grid(), tbl(0), CODE('Asha inside the lock', lockCode, { 3: 'bad' })]));
        } else {
          frames.push(F('Phase 2 — <b>take every seat</b>: ' + asha.join(', ') + ' become <b>HELD by Asha until t+10</b>. Then the lock is released in <code>finally</code>. Total time inside the lock: microseconds.', [grid(), tbl(0), CODE('Asha inside the lock', lockCode, { 4: 'ok', 6: 'ok' })]));
        }
        var mkB = {};
        ben.forEach(function (id) { mkB[id] = free(id, 'Ben', 0) ? 'ok' : 'bad'; });
        var badB = hold('Ben', ben, 0);
        if (badB) {
          frames.push(F('Ben\'s thread now gets the lock and checks his seats: <span class="c-r">' + badB + ' is HELD by Asha</span> (not expired). Ben gets <b>none</b> of his seats — ' + ben.filter(function (x) { return x !== badB; }).join(', ') + ' stay free for others. The app says "Sorry, ' + badB + ' was just taken, please pick again".', [grid(mkB), tbl(0), CODE('Ben inside the lock', lockCode, { 3: 'bad' })]));
        } else {
          frames.push(F('Ben\'s thread gets the lock. His seats do not overlap with anything taken, so <b>both users win</b>. The lock only made them take turns for a few microseconds.', [grid(), tbl(0), CODE('Ben inside the lock', lockCode, { 4: 'ok' })]));
        }
        if (next === 'pays') {
          var badC = badA ? 'not held' : confirm('Asha', asha, 3);
          frames.push(F('t+3 min: Asha\'s payment succeeds. <code>confirm()</code> takes the lock and checks: every seat still HELD by Asha and <code>now ≤ holdUntil</code> → ' + (badC ? '<span class="c-r">fails (' + badC + ')</span>' : '<span class="c-g">HELD → BOOKED</span>') + '.', [grid(), tbl(3), CODE('confirm()', 'for (id : seats)\n  if (state != HELD || owner != user || now > until) return false;\nfor (id : seats) state = BOOKED;', badC ? { 2: 'bad' } : { 3: 'ok' })]));
          if (badB) {
            var alt = [];
            for (var r = 0; r < 5 && alt.length < ben.length; r++) for (var c = 1; c <= 8 && alt.length < ben.length; c++) { var id = ROWS[r] + c; if (get(id).st === 'AVAILABLE') alt.push(id); }
            var badR = hold('Ben', alt, 4);
            frames.push(F('t+4 min: Ben picks again (' + alt.join(', ') + ') and ' + (badR ? 'fails again' : 'gets a clean hold') + '. Nobody was double-sold; Ben just had to choose different seats.', [grid(), tbl(4)]));
          }
        } else {
          frames.push(F('Asha opens the payment page… and gets distracted. The clock passes <b>t+10</b>. Nothing runs at that instant — no thread is needed. Her seats still say HELD in memory, but the <b>holdUntil time is in the past</b>.', [grid(), tbl(11), VARS('Clock', { now: 't+11 min' }, { now: 'cur' })]));
          var badR2 = hold('Ben', ben, 11);
          frames.push(F('t+11: Ben tries again. <b>Lazy expiry</b>: an expired hold counts as free, so ' + (badR2 ? 'Ben still fails on ' + badR2 + ' (sold earlier)' : 'Ben now holds ' + ben.join(', ')) + '. A background sweeper would also have turned expired seats green for everyone.', [grid(), tbl(11)]));
          var badLate = badA ? 'no hold' : confirm('Asha', asha, 12);
          frames.push(F('t+12: Asha\'s payment finally succeeds and the callback arrives. <code>confirm()</code> → ' + (badLate ? '<span class="c-r">false</span> (hold expired / now owned by Ben)' : 'true') + '. We <b>refund Asha</b>. We never take seats back from Ben.', [grid(), tbl(12), VARS('Booking (Asha)', { status: badLate ? 'EXPIRED' : 'CONFIRMED', refund: badLate ? 'yes' : 'no' }, { status: badLate ? 'bad' : 'ok' })]));
        }
        frames.push(F('Summary: one lock per show + check-all-then-take-all + expiry timestamps = <b>no seat is ever sold twice</b>, and unrelated shows never wait for each other.', [grid(), TXT('Invariant to say out loud: <b>for every (show, seat) there is at most one live owner</b> — either a HELD with holdUntil in the future, or BOOKED.')]));
        return frames;
      }
    }, {
      title: 'Naive check-then-act vs lock vs CAS',
      input: 'naive',
      inputLabel: 'Mode: naive | lock | cas',
      gen: function (input) {
        var mode = String(input || 'naive').trim().toLowerCase();
        if (['naive', 'lock', 'cas'].indexOf(mode) < 0) throw new Error('Type naive, lock or cas');
        var frames = [];
        if (mode === 'naive') {
          var code = 'if (seat.status == AVAILABLE) {\n    pay();\n    seat.status = BOOKED;\n    seat.owner = me;\n}';
          frames.push(F('The naive design (the "brute force"): read the status, then later write it. Seat B4 starts AVAILABLE. Two threads run this same code.', [CODE('BookingService.book() — naive', code), VARS('Seat B4 in memory', { status: 'AVAILABLE', owner: '-' })]));
          frames.push(F('Asha\'s thread runs line 1: status is AVAILABLE → she enters the if.', [CODE('Asha thread', code, { 1: 'cur' }), VARS('Seat B4 in memory', { status: 'AVAILABLE', owner: '-' }), VARS('What each thread saw', { asha: 'AVAILABLE', ben: '?' }, { asha: 'ok' })]));
          frames.push(F('<b>Context switch.</b> Before Asha writes anything, Ben\'s thread runs line 1. It also sees AVAILABLE. The race window is open.', [CODE('Ben thread', code, { 1: 'cur' }), VARS('Seat B4 in memory', { status: 'AVAILABLE', owner: '-' }), VARS('What each thread saw', { asha: 'AVAILABLE', ben: 'AVAILABLE' }, { ben: 'bad' })]));
          frames.push(F('Asha pays and writes BOOKED, owner = asha.', [CODE('Asha thread', code, { 3: 'ok', 4: 'ok' }), VARS('Seat B4 in memory', { status: 'BOOKED', owner: 'asha' }, { owner: 'ok' })]));
          frames.push(F('Ben pays and <span class="c-r">overwrites</span>: owner = ben. Both were charged; the database says Ben. Asha arrives with a valid-looking ticket. <b>Double booking.</b>', [CODE('Ben thread', code, { 3: 'bad', 4: 'bad' }), VARS('Seat B4 in memory', { status: 'BOOKED', owner: 'ben' }, { owner: 'bad' }), VARS('Money taken', { asha: '₹300', ben: '₹300' }, { asha: 'bad', ben: 'bad' })]));
          frames.push(F('Why it breaks: check and act are two separate steps, and paying sits between them (seconds!). Fix = make "check + mark HELD" atomic, and do the payment <b>after</b> holding. Try mode <b>lock</b> or <b>cas</b>.', [TXT('Also wrong: <code>volatile status</code>. Volatile makes each read/write visible, but does not make the read-then-write pair atomic.')]));
        } else if (mode === 'lock') {
          var lc = 'showLock.lock();\ntry {\n    if (seat.status != AVAILABLE) return FAIL;\n    seat.status = HELD; seat.owner = me;\n} finally { showLock.unlock(); }\npay();  // outside the lock';
          frames.push(F('Per-show <code>ReentrantLock</code>. The check and the write are inside the same critical section. Payment happens <b>outside</b> the lock (it is slow).', [CODE('Lock version', lc), VARS('Seat B4', { status: 'AVAILABLE', owner: '-' }), VARS('S1 lock', { owner: 'nobody', waiting: '-' })]));
          frames.push(F('Asha acquires the lock first. Ben tries <code>lock()</code> and is parked (waiting).', [CODE('Asha thread', lc, { 1: 'ok' }), VARS('S1 lock', { owner: 'asha', waiting: 'ben' }, { owner: 'cur', waiting: 'cur' })]));
          frames.push(F('Asha checks (AVAILABLE) and marks HELD, owner = asha, then unlocks in finally.', [CODE('Asha thread', lc, { 3: 'ok', 4: 'ok', 5: 'ok' }), VARS('Seat B4', { status: 'HELD', owner: 'asha' }, { status: 'cur' })]));
          frames.push(F('Ben now gets the lock, checks: status is HELD → returns FAIL immediately. He was never charged.', [CODE('Ben thread', lc, { 3: 'bad' }), VARS('Seat B4', { status: 'HELD', owner: 'asha' }), VARS('Result', { asha: 'holding, now paying', ben: 'seat taken, pick another' }, { ben: 'bad', asha: 'ok' })]));
          frames.push(F('Cost: threads for the <b>same show</b> take turns for a few microseconds. Threads for other shows use other locks and never wait.', [TXT('One global <code>synchronized</code> would also be correct but makes every show in the country wait in one line.')]));
        } else {
          var cc = 'Snap cur = seat.ref.get();\nif (!cur.status.equals("AVAILABLE")) return FAIL;\nSnap next = new Snap("HELD", me, cur.version + 1);\nif (!seat.ref.compareAndSet(cur, next)) return FAIL;\nreturn OK;';
          frames.push(F('Lock-free: each seat is an <code>AtomicReference</code> to an immutable snapshot (status, owner, version). <b>compareAndSet(expected, new)</b> swaps only if nobody changed it in between.', [CODE('CAS version', cc), VARS('B4 snapshot', { status: 'AVAILABLE', owner: '-', version: 0 })]));
          frames.push(F('Both threads read the same snapshot (version 0) — exactly like the naive version so far.', [CODE('both threads', cc, { 1: 'cur', 2: 'cur' }), VARS('What each thread holds as "expected"', { asha: 'v0 AVAILABLE', ben: 'v0 AVAILABLE' })]));
          frames.push(F('Asha\'s CAS runs first: memory still equals v0 → swap succeeds. Snapshot is now v1 HELD by asha.', [CODE('Asha thread', cc, { 4: 'ok' }), VARS('B4 snapshot', { status: 'HELD', owner: 'asha', version: 1 }, { owner: 'ok' })]));
          frames.push(F('Ben\'s CAS: he expects v0, but memory holds v1 → <span class="c-r">CAS fails</span>, nothing is overwritten. Ben gets "taken". The hardware did the check+write as one instruction.', [CODE('Ben thread', cc, { 4: 'bad' }), VARS('B4 snapshot', { status: 'HELD', owner: 'asha', version: 1 })]));
          frames.push(F('Multi-seat bookings with CAS need <b>roll-back</b>: if B3 succeeds but B4 fails, undo B3. That compensation logic is the price of going lock-free.', [TXT('Same idea in SQL: <code>UPDATE ... SET version = version + 1 WHERE version = 0</code> and check "rows updated == 1".')]));
        }
        return frames;
      }
    }],
    examples: [
      { title: 'Overlapping family bookings (all-or-nothing)', html: `<p>Asha wants B3, B4; Ben wants B4, B5. Lock order decides Asha first. Asha: check B3 ✔ B4 ✔ → hold both. Ben: check B4 ✖ → return immediately, <b>B5 untouched</b>. If we had held seat-by-seat without the "check all first" phase, Ben would be left holding B5 alone (useless) until his hold expired.</p>${H.table(['Seat', 'After Asha', 'After Ben'], [['B3', H.c('y', 'HELD asha'), H.c('y', 'HELD asha')], ['B4', H.c('y', 'HELD asha'), H.c('y', 'HELD asha')], ['B5', 'AVAILABLE', H.c('g', 'AVAILABLE (not grabbed)')]])}` },
      { title: 'Deadlock with per-seat locks, and the sorted-order fix', html: `<p>Suppose every seat has its own lock. Asha's thread locks B4 then wants B5; Ben's thread (who picked "B5, B4") locks B5 then wants B4. Each waits for the other forever: <b>deadlock</b>. Fix: always lock seats in a <b>global order</b> (sorted by seat id). Then both try B4 first; one waits, nobody holds what the other needs.</p>`, code: `class OrderedSeatLocks {
    private final Map<String, ReentrantLock> locks = new ConcurrentHashMap<>();

    boolean withSeats(List<String> seatIds, Runnable criticalSection) {
        List<String> sorted = new ArrayList<>(new TreeSet<>(seatIds));   // unique + sorted = global order
        List<ReentrantLock> taken = new ArrayList<>();
        try {
            for (String id : sorted) {
                ReentrantLock l = locks.computeIfAbsent(id, k -> new ReentrantLock());
                l.lock();
                taken.add(l);
            }
            criticalSection.run();
            return true;
        } finally {
            for (int i = taken.size() - 1; i >= 0; i--) taken.get(i).unlock();   // reverse order
        }
    }
}` },
      { title: 'Late payment callback after expiry', html: `<p>Hold until 18:10. Gateway webhook arrives at 18:12. Meanwhile Ben holds the same seats (lazy expiry let him). <code>confirm(asha)</code> checks <code>owner == asha &amp;&amp; now ≤ holdUntil</code> → false. Correct action: <b>refund Asha</b>, mark booking EXPIRED, notify her. Wrong action: "she paid, so give her the seats" — that steals from Ben and creates a double booking.</p>` },
      { title: 'Why not just a DB unique constraint?', html: `<p>A table <code>booking_seat(show_id, seat_id) UNIQUE</code> is a great <b>last line of defence</b>: a second insert fails. But it only protects the final BOOKED step — it cannot express a 10-minute HOLD that expires by itself. Production systems combine: hold in Redis/DB with expiry → pay → insert with unique constraint inside a transaction.</p>` }
    ],
    deepDive: `<p><b>Why per-show and not per-seat locks?</b> Inside one show the critical section is tiny (check + flip a few fields: microseconds). A per-show lock makes multi-seat atomicity trivial and cannot deadlock (one lock). Per-seat locks only pay off if a show has huge contention <i>and</i> long critical sections — rare in memory. At database level the trade-off flips: row-level locks are per-seat by nature, so you lock rows in sorted order (<code>SELECT ... WHERE seat_id IN (...) ORDER BY seat_id FOR UPDATE</code>).</p>
<p><b>Pessimistic vs optimistic.</b> Pessimistic (locks, <code>FOR UPDATE</code>) blocks others while you work — good when conflicts are common (blockbuster release). Optimistic (version column, CAS) never blocks but retries/fails on conflict — good when conflicts are rare (Tuesday matinee). For seat booking, a "fail fast, pick another seat" UX makes optimistic natural: there is nothing to retry, the seat is simply gone.</p>
<p><b>Fair locks and starvation.</b> <code>new ReentrantLock(true)</code> hands the lock out in arrival order; without fairness a hot thread can repeatedly barge in. Fairness costs throughput; for a booking queue, fairness matches user expectations.</p>
<p><b>Distributed reality.</b> With 50 app servers, a JVM lock protects nothing. Options: (1) DB as the single source of truth with conditional updates; (2) Redis <code>SET seat:S1:B4 asha NX PX 600000</code> per seat (multi-seat via a Lua script so all keys are set atomically), with a <b>fencing token</b> (version) checked at confirm time so a paused server cannot confirm a stale hold; (3) partition shows across servers so each show is owned by exactly one node (actor model) — then the in-memory per-show lock is correct again.</p>
<p><b>Virtual waiting room.</b> For mega-releases (cricket finals, Coldplay), systems put users in a queue <i>before</i> the seat map and admit a few thousand at a time — concurrency control at the front door, not just at the seat.</p>
<p><b>Testing concurrency:</b> use a <code>CountDownLatch</code> to release threads together, repeat thousands of rounds, assert the invariant (never two winners). Inject a <code>Clock</code> to test expiry without sleeping.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI writes lock boilerplate instantly, so interviewers now probe <i>reasoning</i>: "Where exactly is the race window? What happens if the server pauses for 30 s (GC) between hold and confirm? Why is your lock in finally?"</p>
<p><b>Use AI as a partner:</b> <code>Here is my SeatBookingService. Act as an adversarial scheduler: list interleavings of hold/confirm/release/expiry from two users that could break the invariant "one live owner per seat".</code> Then turn each interleaving into a deterministic test with a fake Clock.</p>
<p><b>Where AI goes wrong:</b> marks the field <code>volatile</code> and calls it thread-safe; uses <code>ConcurrentHashMap</code> but still does get-then-put (two steps); calls the payment gateway inside the lock (holding a lock across a network call); forgets to roll back partial CAS grabs; suggests <code>synchronized</code> as if it worked across multiple servers.</p>
<p><b>What you must still own:</b> naming the invariant, choosing the lock granularity, and explaining the expiry + late-callback behaviour. Those are judgement calls no autocomplete makes for you.</p>`,
    problems: [{
      title: 'Seat Hold Manager with Expiry (all-or-nothing, thread-safe)',
      level: 'Hard', tags: ['concurrency', 'locks', 'bookmyshow', 'expiry'], companies: ['BookMyShow', 'Flipkart', 'Uber', 'Atlassian'],
      statement: `<p>Implement <code>HoldManager</code> for many shows: <code>boolean hold(show, user, seats, nowMs)</code> holds <b>all</b> requested seats for <code>ttlMs</code> or none; <code>boolean confirm(show, user, seats, nowMs)</code> turns a live hold into a booking; expired holds must count as free <b>without</b> any background thread. Many threads call these methods concurrently. Holds on different shows must not block each other.</p>`,
      constraints: `up to 10<sup>4</sup> shows, ≤ 500 seats each, ≤ 10 seats per request, ttl = 600 000 ms`,
      example: `<p>ttl = 10 min. t=0: hold(S1, asha, [B3,B4]) → ${H.c('g', 'true')}. t=0: hold(S1, ben, [B4,B5]) → ${H.c('r', 'false')} (B4 held), B5 stays free. t=11 min: hold(S1, ben, [B4]) → ${H.c('g', 'true')} (asha's hold expired). t=12 min: confirm(S1, asha, [B3,B4]) → ${H.c('r', 'false')} → refund Asha.</p>`,
      brute: { why: `<p>Naive: a plain <code>HashMap</code> and check-then-act with no lock — two threads both see "free" and both hold (double booking), and a concurrent resize of the HashMap can even corrupt it. The "safe" brute fix — <code>synchronized</code> on every method — is correct but makes every show in the country queue behind one lock.</p>`, code: `class NaiveHoldManager {
    private final Map<String, String> owner = new HashMap<>();     // "show:seat" -> user
    boolean hold(String show, String user, List<String> seats) {
        for (String s : seats) if (owner.containsKey(show + ":" + s)) return false;   // CHECK
        for (String s : seats) owner.put(show + ":" + s, user);                       // ACT (race window!)
        return true;                                                                  // and holds never expire
    }
}` },
      mcq: { q: 'A hold expired 2 minutes ago and no sweeper has run. Ben asks for that seat. What should happen?', options: ['Treat the expired hold as free and give it to Ben', 'Reject Ben until the sweeper runs', 'Throw an exception', 'Extend the old hold'], answer: 0, explain: 'Lazy expiry: correctness never depends on a background job. Whoever looks at an expired hold may treat it as free.' },
      hints: [`<p>Hint 1: the state per seat is (status, owner, holdUntil). "Free for user u at time t" = AVAILABLE, or HELD with holdUntil &lt; t, or HELD by u.</p>`, `<p>Hint 2: keep <code>ConcurrentHashMap&lt;String, Show&gt;</code>; each Show has its own <code>ReentrantLock</code> and a plain map of seats. Lock → check all → take all → unlock in finally.</p>`, `<p>Hint 3: confirm must re-check owner and expiry under the same lock. Edge cases: unknown seat, duplicate seats in one request, re-holding your own seats (extend), confirm twice (second returns true idempotently if already BOOKED by you).</p>`],
      solution: {
        approach: `<p>Per-show lock + two-phase (check all, then take all) + timestamps for lazy expiry. <code>computeIfAbsent</code> creates show inventories atomically. All time comes in as a parameter (or a Clock) so tests are deterministic.</p>`,
        code: `class HoldManager {
    private static final class SeatRec { String status = "AVAILABLE"; String owner; long until; }
    private static final class ShowInv {
        final ReentrantLock lock = new ReentrantLock();
        final Map<String, SeatRec> seats = new HashMap<>();
    }
    private final Map<String, ShowInv> shows = new ConcurrentHashMap<>();
    private final long ttlMs;
    HoldManager(long ttlMs) { this.ttlMs = ttlMs; }

    void addShow(String show, List<String> seatIds) {
        ShowInv inv = shows.computeIfAbsent(show, k -> new ShowInv());
        inv.lock.lock();
        try { for (String s : seatIds) inv.seats.putIfAbsent(s, new SeatRec()); } finally { inv.lock.unlock(); }
    }

    private static boolean freeFor(SeatRec r, String user, long now) {
        if (r.status.equals("AVAILABLE")) return true;
        if (r.status.equals("BOOKED")) return false;
        return now > r.until || user.equals(r.owner);             // expired, or my own hold
    }

    boolean hold(String show, String user, List<String> seatIds, long now) {
        ShowInv inv = shows.get(show);
        if (inv == null) return false;
        Set<String> unique = new TreeSet<>(seatIds);
        inv.lock.lock();
        try {
            for (String s : unique) {
                SeatRec r = inv.seats.get(s);
                if (r == null || !freeFor(r, user, now)) return false;
            }
            for (String s : unique) {
                SeatRec r = inv.seats.get(s);
                r.status = "HELD"; r.owner = user; r.until = now + ttlMs;
            }
            return true;
        } finally {
            inv.lock.unlock();
        }
    }

    boolean confirm(String show, String user, List<String> seatIds, long now) {
        ShowInv inv = shows.get(show);
        if (inv == null) return false;
        inv.lock.lock();
        try {
            boolean allMineBooked = true;
            for (String s : seatIds) {
                SeatRec r = inv.seats.get(s);
                if (r == null || !user.equals(r.owner)) return false;
                if (!r.status.equals("BOOKED")) allMineBooked = false;
                if (r.status.equals("HELD") && now > r.until) return false;
            }
            if (allMineBooked) return true;                          // idempotent retry
            for (String s : seatIds) inv.seats.get(s).status = "BOOKED";
            return true;
        } finally {
            inv.lock.unlock();
        }
    }

    public static void main(String[] args) {
        HoldManager m = new HoldManager(600_000);
        m.addShow("S1", List.of("B3", "B4", "B5"));
        System.out.println(m.hold("S1", "asha", List.of("B3", "B4"), 0));          // true
        System.out.println(m.hold("S1", "ben", List.of("B4", "B5"), 0));           // false
        System.out.println(m.hold("S1", "ben", List.of("B4"), 660_000));           // true (expired)
        System.out.println(m.confirm("S1", "asha", List.of("B3", "B4"), 720_000)); // false -> refund
    }
}`,
        complexity: `<p>hold/confirm: O(k log k) for k requested seats (TreeSet), O(1) map lookups. Lock held only for those few operations. Memory O(total seats). Different shows run fully in parallel.</p>`,
        followUps: ['Add release(show, user, seats) and a sweeper that runs every 30 s.', 'Make it work across 20 servers (Redis Lua script or DB conditional updates).', 'Add a per-user limit: at most 10 seats held per show.']
      }
    }]
  });
  registerModule({ id: 'lld08', title: 'Case Studies: BookMyShow, Splitwise, Library Management', intro: '<p>tmp</p>', goals: [], prereqs: 'tmp', hours: 14, topics: topics, practice: practice, quiz: quiz, interview: interview });
})();
