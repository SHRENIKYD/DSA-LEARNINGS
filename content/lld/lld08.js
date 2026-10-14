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
          frames.push(F(badA ? 'Asha holds nothing (her request failed), so we simply move the clock to <b>t+11</b> to see what expiry does.' : 'Asha opens the payment page… and gets distracted. The clock passes <b>t+10</b>. Nothing runs at that instant — no thread is needed. Her seats still say HELD in memory, but the <b>holdUntil time is in the past</b>.', [grid(), tbl(11), VARS('Clock', { now: 't+11 min' }, { now: 'cur' })]));
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

  /* ======================= TOPIC 3: SPLITWISE — EXPENSES, SPLITS & BALANCES ======================= */
  var SW_MODEL = `// ================= Splitwise core (compiles as-is). Money in paise (long). =================
enum SplitType { EQUAL, EXACT, PERCENT, SHARES }

record Split(String userId, long amountPaise) {}

interface SplitStrategy {
    /** values: ignored for EQUAL, paise for EXACT, basis points for PERCENT (12.5% = 1250), weights for SHARES */
    List<Split> split(long totalPaise, List<String> users, List<Long> values);
}

final class Splits {
    private Splits() {}
    /** Split total in proportion to weights. Leftover paise go to the largest rounding remainders,
     *  so the parts ALWAYS add up to the total exactly (no paisa created or lost). */
    static List<Split> byWeights(long total, List<String> users, List<Long> weights) {
        if (users.size() != weights.size()) throw new IllegalArgumentException("one weight per user");
        long sumW = 0;
        for (long w : weights) { if (w < 0) throw new IllegalArgumentException("negative weight"); sumW += w; }
        if (sumW == 0) throw new IllegalArgumentException("weights add up to zero");
        final long sw = sumW;
        int n = users.size();
        long[] amt = new long[n];
        long given = 0;
        for (int i = 0; i < n; i++) { amt[i] = total * weights.get(i) / sw; given += amt[i]; }
        Integer[] order = new Integer[n];
        for (int i = 0; i < n; i++) order[i] = i;
        Arrays.sort(order, Comparator.comparingLong((Integer i) -> -(total * weights.get(i) % sw)).thenComparingInt(i -> i));
        for (long k = 0; k < total - given; k++) amt[order[(int) k]]++;
        List<Split> out = new ArrayList<>();
        for (int i = 0; i < n; i++) out.add(new Split(users.get(i), amt[i]));
        return out;
    }
}

final class EqualSplit implements SplitStrategy {
    public List<Split> split(long total, List<String> users, List<Long> ignored) {
        return Splits.byWeights(total, users, Collections.nCopies(users.size(), 1L));
    }
}

final class ExactSplit implements SplitStrategy {
    public List<Split> split(long total, List<String> users, List<Long> amounts) {
        if (amounts.size() != users.size()) throw new IllegalArgumentException("one amount per user");
        long sum = amounts.stream().mapToLong(Long::longValue).sum();
        if (sum != total) throw new IllegalArgumentException("exact amounts add to " + sum + ", bill is " + total);
        List<Split> out = new ArrayList<>();
        for (int i = 0; i < users.size(); i++) out.add(new Split(users.get(i), amounts.get(i)));
        return out;
    }
}

final class PercentSplit implements SplitStrategy {
    public List<Split> split(long total, List<String> users, List<Long> basisPoints) {
        long sum = basisPoints.stream().mapToLong(Long::longValue).sum();
        if (sum != 10_000) throw new IllegalArgumentException("percentages add to " + sum / 100.0 + "%, need 100%");
        return Splits.byWeights(total, users, basisPoints);
    }
}

final class ShareSplit implements SplitStrategy {
    public List<Split> split(long total, List<String> users, List<Long> shares) {
        return Splits.byWeights(total, users, shares);     // "Asha 2 shares, Ben 1 share"
    }
}

final class Expense {
    final String id, description, paidBy;
    final long totalPaise;
    final SplitType type;
    final List<Split> splits;
    Expense(String id, String description, String paidBy, long totalPaise, SplitType type, List<Split> splits) {
        this.id = id; this.description = description; this.paidBy = paidBy;
        this.totalPaise = totalPaise; this.type = type; this.splits = List.copyOf(splits);
    }
}

/** owes[a][b] = how much a owes b. Kept antisymmetric: owes[b][a] == -owes[a][b]. */
final class BalanceSheet {
    private final Map<String, Map<String, Long>> owes = new TreeMap<>();

    void apply(Expense e) {
        for (Split s : e.splits)
            if (!s.userId().equals(e.paidBy)) add(s.userId(), e.paidBy, s.amountPaise());   // you never owe yourself
    }
    void settle(String payer, String receiver, long amount) { add(payer, receiver, -amount); }

    private void add(String debtor, String creditor, long amt) {
        owes.computeIfAbsent(debtor, k -> new TreeMap<>()).merge(creditor, amt, Long::sum);
        owes.computeIfAbsent(creditor, k -> new TreeMap<>()).merge(debtor, -amt, Long::sum);
    }
    long owes(String a, String b) { return owes.getOrDefault(a, Map.of()).getOrDefault(b, 0L); }

    /** + means "gets back", - means "owes overall". Sum over everyone is always 0. */
    Map<String, Long> net() {
        Map<String, Long> net = new TreeMap<>();
        owes.forEach((a, row) -> row.forEach((b, v) -> net.merge(a, -v, Long::sum)));
        return net;
    }
    List<String> describe() {
        List<String> out = new ArrayList<>();
        owes.forEach((a, row) -> row.forEach((b, v) -> { if (v > 0) out.add(a + " owes " + b + " " + Money.fmt(v)); }));
        return out;
    }
}

final class Money {
    static String fmt(long paise) {
        long a = Math.abs(paise);
        return (paise < 0 ? "-" : "") + "Rs " + a / 100 + "." + String.format("%02d", a % 100);
    }
}

final class Group {
    final String id, name;
    final Set<String> members = new TreeSet<>();
    final List<Expense> expenses = new ArrayList<>();
    final BalanceSheet sheet = new BalanceSheet();
    Group(String id, String name, Collection<String> members) { this.id = id; this.name = name; this.members.addAll(members); }
}

final class ExpenseService {
    private final Map<SplitType, SplitStrategy> strategies = new EnumMap<>(SplitType.class);
    private final Map<String, Group> groups = new HashMap<>();
    private long nextId = 1;

    ExpenseService() {
        strategies.put(SplitType.EQUAL, new EqualSplit());
        strategies.put(SplitType.EXACT, new ExactSplit());
        strategies.put(SplitType.PERCENT, new PercentSplit());
        strategies.put(SplitType.SHARES, new ShareSplit());
    }

    Group createGroup(String id, String name, Collection<String> members) {
        Group g = new Group(id, name, members);
        groups.put(id, g);
        return g;
    }

    synchronized Expense addExpense(String groupId, String desc, String paidBy, long totalPaise,
                                    SplitType type, List<String> among, List<Long> values) {
        Group g = groups.get(groupId);
        if (g == null) throw new IllegalArgumentException("no group " + groupId);
        if (totalPaise <= 0) throw new IllegalArgumentException("amount must be positive");
        if (!g.members.contains(paidBy) || !g.members.containsAll(among)) throw new IllegalArgumentException("everyone must be in the group");
        if (new HashSet<>(among).size() != among.size()) throw new IllegalArgumentException("duplicate participant");
        List<Split> splits = strategies.get(type).split(totalPaise, among, values);   // validates & computes
        Expense e = new Expense("E" + nextId++, desc, paidBy, totalPaise, type, splits);
        g.expenses.add(e);
        g.sheet.apply(e);
        return e;
    }

    synchronized void settleUp(String groupId, String payer, String receiver, long amountPaise) {
        groups.get(groupId).sheet.settle(payer, receiver, amountPaise);
    }
}

public class SplitwiseDemo {
    public static void main(String[] args) {
        ExpenseService svc = new ExpenseService();
        Group goa = svc.createGroup("G1", "Goa trip", List.of("asha", "ben", "chen"));
        svc.addExpense("G1", "Hotel", "asha", 900_00, SplitType.EQUAL, List.of("asha", "ben", "chen"), List.of());
        svc.addExpense("G1", "Scooters", "ben", 300_00, SplitType.EXACT, List.of("ben", "chen"), List.of(100_00L, 200_00L));
        svc.addExpense("G1", "Dinner", "chen", 1000_00, SplitType.PERCENT, List.of("asha", "ben", "chen"), List.of(5000L, 3000L, 2000L));
        svc.addExpense("G1", "Snacks", "asha", 100_00, SplitType.EQUAL, List.of("asha", "ben", "chen"), List.of());
        goa.sheet.describe().forEach(System.out::println);
        System.out.println(goa.sheet.net());               // values sum to 0
    }
}`;

  topics.push({
    title: 'Splitwise I: Expenses, Split Strategies & the Balance Sheet',
    analogy: `<p>Every neighbourhood shop in India has a <b>khata</b> — a notebook where the shopkeeper writes "Sharma ji: ₹340 due". Nobody settles every single purchase; the notebook keeps a <i>running balance</i> and you pay it off once a month. Splitwise is a shared khata for friends on a trip: every time someone pays for the group, the notebook records who owes whom. And just like the shopkeeper writes amounts in exact rupees and paise (never "about ₹33.33"), our code must never lose a paisa.</p>`,
    explain: `<p><b>The question:</b> "Design Splitwise" — users, groups, add an expense split in different ways, show who owes whom, settle up. (Debt simplification is the next topic.)</p>
<h4>Requirements to clarify</h4>
<ul>
<li>Split types: <b>EQUAL</b> (₹900 among 3), <b>EXACT</b> (Ben ₹100, Chen ₹200), <b>PERCENT</b> (50/30/20), <b>SHARES</b> (Asha 2 shares, Ben 1).</li>
<li>The payer may or may not be part of the split ("I paid for your movie tickets, not mine").</li>
<li>Show: each user's total balance, each pairwise balance ("Ben owes Asha ₹300"), a group's balances.</li>
<li>Settle up: record a payment from one user to another.</li>
<li>Rules: amounts must add up exactly; percentages must total 100%.</li>
</ul>
<h4>Entities</h4>
${H.table(['Class', 'Responsibility'], [['<b>User</b>', 'id, name, contact'], ['<b>Group</b>', 'members + its expenses + its balance sheet'], ['<b>Expense</b>', 'who paid, total, type, list of Splits (immutable once created)'], ['<b>Split</b>', '(user, amount in paise) — the computed share'], ['<b>SplitStrategy</b>', 'interface: EqualSplit, ExactSplit, PercentSplit, ShareSplit — validate input and compute splits'], ['<b>BalanceSheet</b>', 'running pairwise balances, updated on every expense / settlement'], ['<b>ExpenseService</b>', 'facade: validates, picks the strategy, records the expense, updates the sheet']])}
<h4>The core update rule (memorise this)</h4>
<p>For an expense paid by <b>P</b>, for every split (user U, amount a) with U ≠ P: <b>U owes P a more</b>. Store it both ways: <code>owes[U][P] += a</code> and <code>owes[P][U] -= a</code>. Example: Asha pays ₹900 for Asha, Ben, Chen → Ben owes Asha ₹300, Chen owes Asha ₹300 (Asha's own ₹300 share creates nothing).</p>
<h4>Two views of the same data</h4>
<ul>
<li><b>Pairwise</b> (<code>Map&lt;user, Map&lt;user, long&gt;&gt;</code>): "Ben owes Asha ₹300" — what the app shows on a friend's page.</li>
<li><b>Net</b> (<code>Map&lt;user, long&gt;</code>): "Asha gets back ₹600 overall" — the input to debt simplification. Sum of all nets is always <b>0</b>: money is only moved, never created.</li>
</ul>
<h4>Money: the paisa problem</h4>
<p>₹100 split 3 ways is 33.33 + 33.33 + 33.33 = 99.99. One paisa vanished. Store money as <code>long</code> paise, compute floor shares (3333 each = 9999), then hand the leftover 1 paisa to someone (largest remainder first). Now the shares are 3334, 3333, 3333 = 10000 exactly.</p>`,
    clues: [
      '"Design Splitwise / expense sharing / group bill splitting"',
      '"Split equally, by exact amount, by percentage, by shares" → SplitStrategy (Strategy pattern) + validation per type',
      '"Show who owes whom" → pairwise balance map; "show my total balance" → net map',
      '"Amounts must add up exactly" / "₹100 among 3" → paise in long + remainder distribution',
      '"Payer not included in the split" → skip only the payer\'s own split, not the payer',
      '"Add a new split type later" → Open/Closed: new strategy class, no change to ExpenseService'
    ],
    code: SW_MODEL,
    codeTitle: 'Splitwise core: strategies, exact paise, balance sheet (compilable Java 21)',
    viz: [{
      title: 'Build the Splitwise class diagram step by step',
      gen: function () {
        return buildDiagram('Splitwise class diagram', [
          { narr: 'Nouns from the requirements: <b>User</b> and <b>Group</b> (a trip, a flat). A group has many members.', add: [B('User', 'User', 10, 10), B('Group', 'Group', 10, 40)], edges: [['Group', 'User', 'members *']] },
          { narr: 'An <b>Expense</b> belongs to a group: who paid, how much, which split type. It is <b>immutable</b> once created (edits create a new version).', add: [B('Expense', 'Expense', 38, 40)], edges: [['Group', 'Expense', 'has *'], ['Expense', 'User', 'paidBy']] },
          { narr: '<span class="c-r">Naive design:</span> <code>double amount</code> and compute each share on the fly as <code>amount / n</code>. ₹100 / 3 = 33.333… and the three shares add to ₹99.99. The books never balance, and every screen recomputes from scratch.', hl: { Expense: 'bad' }, tags: { Expense: 'double ✖' }, note: 'Store computed <b>Split</b> objects in paise, once, at creation time. History stays reproducible even if the split rules change later.' },
          { narr: 'Fix: an Expense <b>composes</b> a list of <b>Split</b>(user, paise). Computed once, guaranteed to add up to the total.', add: [B('Split', 'Split (user, paise)', 66, 40)], edges: [['Expense', 'Split', 'splits 1..*']], hl: { Expense: '' }, tags: { Expense: 'long paise' } },
          { narr: 'Who computes the splits? A <b>SplitStrategy</b> interface with one class per type. Adding "split by item" later = one new class (Open/Closed).', add: [B('SS', '«interface» SplitStrategy', 66, 12, 20), B('EQ', 'Equal', 52, 0, 10), B('EX', 'Exact', 66, 0, 10), B('PC', 'Percent', 80, 0, 10), B('SH', 'Shares', 93, 0, 9)], edges: [['EQ', 'SS', 'impl'], ['EX', 'SS', 'impl'], ['PC', 'SS', 'impl'], ['SH', 'SS', 'impl'], ['SS', 'Split', 'creates']] },
          { narr: 'A <b>BalanceSheet</b> per group keeps the running pairwise balances <code>owes[a][b]</code>. Every expense <b>applies</b> its splits; every settle-up subtracts.', add: [B('BS', 'BalanceSheet', 38, 62)], edges: [['Group', 'BS', 'has 1'], ['BS', 'Expense', 'applies']] },
          { narr: '<b>ExpenseService</b> is the facade: validate members → pick strategy from an EnumMap → create Expense → update sheet. The <b>DebtSimplifier</b> reads net balances (next topic).', add: [B('ES', 'ExpenseService', 10, 62), B('DS', 'DebtSimplifier', 70, 62)], edges: [['ES', 'Group', 'manages'], ['ES', 'SS', 'uses'], ['DS', 'BS', 'reads net']], note: 'Pattern summary: Strategy (split types), Facade (ExpenseService), and later Strategy again for simplification algorithms.' }
        ], 70);
      }
    }, {
      title: 'Balance sheet: watch balances change expense by expense',
      input: 'Asha 900 Asha,Ben,Chen; Ben 300 Ben,Chen; Chen 120 Asha,Chen; Asha 100 Asha,Ben,Chen',
      inputLabel: 'Expenses (equal split): payer amount participants; …',
      gen: function (input) {
        var exps = String(input || '').split(';').map(function (s) { return s.trim(); }).filter(function (s) { return s; });
        if (!exps.length) throw new Error('Format: Asha 900 Asha,Ben,Chen; Ben 300 Ben,Chen');
        if (exps.length > 6) throw new Error('Use at most 6 expenses');
        var people = [], parsed = [];
        exps.forEach(function (e) {
          var t = e.split(/\s+/);
          if (t.length !== 3) throw new Error('Each expense: payer amount p1,p2,…  e.g. Ben 300 Ben,Chen');
          var amt = Number(t[1]);
          if (!isFinite(amt) || amt <= 0 || Math.floor(amt) !== amt || amt > 100000) throw new Error('Amount must be a whole number of rupees between 1 and 100000');
          var among = t[2].split(',').map(cap).filter(function (x) { return x; });
          if (!among.length) throw new Error('Give at least one participant');
          var payer = cap(t[0]);
          [payer].concat(among).forEach(function (p) { if (people.indexOf(p) < 0) people.push(p); });
          parsed.push({ payer: payer, amt: amt, among: among.filter(function (x, i) { return among.indexOf(x) === i; }) });
        });
        if (people.length > 6) throw new Error('Use at most 6 people');
        var paid = {}, share = {}, owes = {};
        people.forEach(function (p) { paid[p] = 0; share[p] = 0; owes[p] = {}; people.forEach(function (q) { owes[p][q] = 0; }); });
        var netRows = function (hlSet) {
          var hl = {};
          var rows = people.map(function (p, i) { var n = paid[p] - share[p]; if (hlSet && hlSet.indexOf(p) >= 0) hl[i] = 'cur'; return [p, rupees(paid[p]), rupees(share[p]), n > 0 ? 'gets back ' + rupees(n) : n < 0 ? 'owes ' + rupees(-n) : 'settled']; });
          return TABLE('Net balance per person (paid − share)', ['person', 'paid', 'share', 'net'], rows, hl);
        };
        var pairMap = function (newKeys) {
          var entries = [], hl = {};
          people.forEach(function (a) { people.forEach(function (b) { if (owes[a][b] > 0) { var k = a + ' owes ' + b; entries.push([k, rupees(owes[a][b])]); if (newKeys && newKeys.indexOf(k) >= 0) hl[k] = 'ok'; } }); });
          if (!entries.length) entries.push(['nobody owes anybody', '-']);
          return { type: 'map', label: 'Pairwise ledger owes[a][b] (only positive side shown)', entries: entries, hl: hl };
        };
        var frames = [F('Start: everyone has paid ₹0 and owes ₹0. We will apply ' + parsed.length + ' expense(s), each split <b>equally</b>. Rule: for every participant U ≠ payer P, <b>U owes P their share</b>.', [netRows(), pairMap()])];
        parsed.forEach(function (e, idx) {
          var n = e.among.length, base = Math.floor(e.amt / n), rem = e.amt % n;
          var shares = e.among.map(function (p, i) { return [p, base + (i < rem ? 1 : 0)]; });
          frames.push(F('Expense ' + (idx + 1) + ': <b>' + e.payer + '</b> pays ' + rupees(e.amt) + ' for ' + e.among.join(', ') + '. Equal split: ' + e.amt + ' ÷ ' + n + ' = ' + base + (rem ? ' remainder ' + rem + ' → the first ' + rem + ' person(s) pay ₹1 extra so the shares add up <b>exactly</b>' : ' exactly') + '.', [TABLE('Split computed by EqualSplit', ['participant', 'share', 'creates debt?'], shares.map(function (s) { return [s[0], rupees(s[1]), s[0] === e.payer ? 'no (own share)' : s[0] + ' owes ' + e.payer]; }), {}), VARS('Check', { total: rupees(e.amt), 'sum of shares': rupees(shares.reduce(function (a, s) { return a + s[1]; }, 0)) }, { 'sum of shares': 'ok' })]));
          paid[e.payer] += e.amt;
          var touched = [e.payer], newKeys = [];
          shares.forEach(function (s) {
            share[s[0]] += s[1];
            if (touched.indexOf(s[0]) < 0) touched.push(s[0]);
            if (s[0] !== e.payer) { owes[s[0]][e.payer] += s[1]; owes[e.payer][s[0]] -= s[1]; }
          });
          people.forEach(function (a) { people.forEach(function (b) { if (owes[a][b] > 0 && (a === e.payer || b === e.payer)) newKeys.push(a + ' owes ' + b); }); });
          frames.push(F('Apply it: ' + e.payer + '\'s "paid" grows by ' + rupees(e.amt) + '; each participant\'s "share" grows. Pairwise entries involving ' + e.payer + ' are updated (and <b>netted</b>: if they already owed each other the other way, it cancels).', [netRows(touched), pairMap(newKeys)]));
        });
        var tot = people.reduce(function (a, p) { return a + paid[p] - share[p]; }, 0);
        frames.push(F('Final check: the net column always sums to <b>' + rupees(tot) + '</b>. Positive people are creditors, negative people are debtors. This net map is exactly what the debt simplifier (next topic) consumes.', [netRows(), pairMap(), TXT('Invariant: <b>Σ net = 0</b> and <b>owes[a][b] = −owes[b][a]</b>. If either ever fails, there is a bug.')]));
        return frames;
      }
    }],
    examples: [
      { title: '₹100 among 3 people — where does the paisa go?', html: `<p>10000 paise ÷ 3 = 3333 rem 1. Floor shares: 3333, 3333, 3333 (= 9999). Leftover 1 paisa → the person with the largest rounding remainder (all equal → first in list).</p>${H.table(['Person', 'Exact share', 'Floor', 'Final'], [['Asha', '3333.33', '3333', H.c('g', '3334')], ['Ben', '3333.33', '3333', '3333'], ['Chen', '3333.33', '3333', '3333']])}<p>Sum = 10000 ✔. With doubles you get 33.33 × 3 = 99.99 ✖.</p>` },
      { title: 'Percent split with validation', html: `<p>Dinner ₹1000, split 50% / 30% / 20%. Store percentages as <b>basis points</b> (1% = 100) so 12.5% is the exact integer 1250. Check Σ = 10000. Shares: 50000, 30000, 20000 paise. If the user enters 50/30/30 → ${H.c('r', 'reject: "percentages add to 110%"')}. Validation lives inside the strategy, so each split type owns its own rules.</p>`, code: `class PercentCheck {
    static long[] split(long totalPaise, long[] basisPoints) {
        long sum = 0;
        for (long b : basisPoints) sum += b;
        if (sum != 10_000) throw new IllegalArgumentException("must add to 100%, got " + sum / 100.0 + "%");
        long[] out = new long[basisPoints.length];
        long given = 0;
        for (int i = 0; i < out.length; i++) { out[i] = totalPaise * basisPoints[i] / 10_000; given += out[i]; }
        out[0] += totalPaise - given;                 // simple leftover rule: first person absorbs it
        return out;
    }
    public static void main(String[] args) {
        System.out.println(Arrays.toString(split(1000_00, new long[]{5000, 3000, 2000})));
        System.out.println(Arrays.toString(split(100_00, new long[]{3333, 3333, 3334})));
    }
}` },
      { title: 'Payer not in the split', html: `<p>Asha buys movie tickets for Ben and Chen only: ₹600, participants {Ben, Chen}. Shares 300/300. Updates: Ben owes Asha 300, Chen owes Asha 300. Asha's "paid" = 600, "share" = 0, net = +600. A common bug is to always add the payer to the participants — then Asha would "owe herself" ₹200 and the others only ₹200 each.</p>` },
      { title: 'Netting in the pairwise ledger', html: `<p>Ben owes Asha ₹300 (hotel). Later Asha owes Ben ₹100 (scooter). Because we store <code>owes[Asha][Ben] = -owes[Ben][Asha]</code>, the second update does owes[Asha][Ben] += 100 → −300 + 100 = −200, i.e. ${H.c('g', 'Ben owes Asha ₹200')}. One number per pair, always already netted.</p>` }
    ],
    deepDive: `<p><b>Event log vs balance cache.</b> The expense list is the <i>source of truth</i> (an append-only event log). The BalanceSheet is a <b>materialised view</b> that can be rebuilt by replaying expenses. Editing an expense = apply the negative of the old one, then the new one (or store an <code>ExpenseVersion</code>). Deleting = apply the reverse. This is event sourcing in miniature and makes audits trivial.</p>
<p><b>Largest-remainder rounding</b> (Hamilton's method) gives each person floor(exact share) and hands leftover paise to the biggest fractional parts. It guarantees Σ = total and each share differs from the exact value by &lt; 1 paisa. Deterministic tie-breaking (by user order) keeps results reproducible across servers.</p>
<p><b>Multi-currency.</b> Store each expense in its own currency; keep balances per (pair, currency). Converting at expense time bakes in an exchange rate; converting at display time changes balances when rates move — product must choose. Never mix currencies in one <code>long</code>.</p>
<p><b>Concurrency.</b> Two people adding expenses to the same group at once both update the sheet: guard per group (a lock per group, or <code>synchronized</code> on the group, or a DB transaction that inserts the expense and updates balance rows atomically). Use optimistic versioning on the group's balance row if contention is low.</p>
<p><b>Scale of the pairwise map.</b> A group of n people has at most n(n−1)/2 pairs — tiny. Across the app, store balances as rows <code>(group_id, user_a, user_b, amount)</code> with a canonical order (a &lt; b) and a sign, instead of two mirrored rows.</p>
<p><b>Validation order:</b> members exist → amount &gt; 0 → no duplicate participants → strategy-specific checks (exact sums, 100%) → only then mutate state. Never half-apply an expense.</p>`,
    aiEra: `<p><b>What AI changes:</b> generating the Expense/Split/strategy classes is instant with an assistant. Interviews now focus on the parts AI gets subtly wrong: exact money arithmetic, the payer-in-split edge case, keeping the ledger antisymmetric, and how edits/deletes keep balances correct.</p>
<p><b>Use AI as a partner:</b> <code>Write property-based tests for my BalanceSheet: after any random sequence of expenses and settlements, net values sum to 0 and owes[a][b] == -owes[b][a].</code> Invariant tests like these catch rounding bugs no example test finds.</p>
<p><b>Where AI goes wrong:</b> <code>double</code> or <code>float</code> for money; rounding each share with <code>Math.round</code> (sum can be off by a paisa either way); <code>BigDecimal</code> created from a double (<code>new BigDecimal(0.1)</code>); forgetting to skip the payer's own share; treating percentages as doubles that sum to 99.99999.</p>
<p><b>What you must still own:</b> the data model choice (event log + derived balances), the rounding policy, and explaining to the interviewer why the books always balance.</p>`,
    problems: [{
      title: 'Split a Bill Exactly by Shares (no paisa lost)',
      level: 'Easy', tags: ['splitwise', 'money', 'rounding'], companies: ['Splitwise', 'PhonePe', 'Razorpay'],
      statement: `<p>Given a bill in paise and a list of non-negative integer <b>shares</b> (weights), return each person's amount so that amounts are proportional to shares, every amount is a whole number of paise, each differs from its exact value by less than 1 paisa, and the amounts <b>sum exactly to the bill</b>. Leftover paise go to the largest fractional remainders; ties go to the earlier person.</p>`,
      constraints: `1 ≤ n ≤ 1000, total ≤ 10<sup>10</sup> paise, shares ≤ 10<sup>4</sup>, at least one share &gt; 0`,
      example: `<p>total = 1000 paise, shares = [1, 1, 1]: exact 333.33 each → floors 333, 333, 333 = 999 → 1 leftover → first person: ${H.c('g', '[334, 333, 333]')}.<br>total = 1000, shares = [2, 1]: exact 666.67, 333.33 → floors 666, 333 (= 999) → leftover goes to the bigger remainder (0.67) → ${H.c('g', '[667, 333]')}.</p>`,
      brute: { why: `<p>Naive: compute each amount with <code>double</code> and <code>Math.round</code>. With shares [1,1,1] and total 1000 every share rounds to 333 → sum 999 (a paisa lost). With total 1001 and [1,1] both round 500.5 → 501 → sum 1002 (a paisa created). The books silently stop balancing.</p>`, code: `class NaiveSplit {
    static long[] split(long total, int[] shares) {
        double sum = 0;
        for (int s : shares) sum += s;
        long[] out = new long[shares.length];
        for (int i = 0; i < shares.length; i++) out[i] = Math.round(total * shares[i] / sum);   // may not add up!
        return out;
    }
}` },
      mcq: { q: '1000 paise split [2, 1]. Floors are 666 and 333. Who gets the leftover paisa?', options: ['The first person (remainder 0.67)', 'The second person (remainder 0.33)', 'Nobody, keep 999', 'Split it 0.5/0.5'], answer: 0, explain: 'Largest remainder wins: 666.67 has fractional part .67 > .33, so it rounds up to 667.' },
      hints: [`<p>Hint 1: use integers only. Exact share i = total × s<sub>i</sub> / S. Its floor is <code>total * s[i] / S</code>, and its fractional part is proportional to <code>total * s[i] % S</code>.</p>`, `<p>Hint 2: leftover = total − Σ floors is always less than n. Sort indices by remainder (descending, then index) and add 1 paisa to the first <i>leftover</i> of them.</p>`, `<p>Hint 3: edge cases — shares with 0 get 0 (remainder 0, never chosen unless all others exhausted, which cannot happen); use <code>long</code> for total × share; deterministic tie-break keeps results stable.</p>`],
      solution: {
        approach: `<p>Largest-remainder (Hamilton) apportionment entirely in integer arithmetic. The remainder <code>total·s % S</code> compares fractional parts without any floating point.</p>`,
        code: `class ExactSplitter {
    static long[] split(long total, int[] shares) {
        long S = 0;
        for (int s : shares) S += s;
        int n = shares.length;
        long[] out = new long[n];
        long given = 0;
        for (int i = 0; i < n; i++) { out[i] = total * shares[i] / S; given += out[i]; }
        final long sum = S;
        Integer[] idx = new Integer[n];
        for (int i = 0; i < n; i++) idx[i] = i;
        Arrays.sort(idx, (a, b) -> {
            long ra = total * shares[a] % sum, rb = total * shares[b] % sum;
            return ra != rb ? Long.compare(rb, ra) : Integer.compare(a, b);   // bigger remainder first, then earlier
        });
        for (int k = 0; k < total - given; k++) out[idx[k]]++;
        return out;
    }
    public static void main(String[] args) {
        System.out.println(Arrays.toString(split(1000, new int[]{1, 1, 1})));   // [334, 333, 333]
        System.out.println(Arrays.toString(split(1000, new int[]{2, 1})));      // [667, 333]
        System.out.println(Arrays.toString(split(1001, new int[]{1, 1})));      // [501, 500]
    }
}`,
        complexity: `<p>O(n log n) for the sort, O(n) space. All arithmetic exact in <code>long</code>.</p>`,
        followUps: ['Make tie-breaking fair over many expenses (rotate who absorbs leftovers).', 'Support percentages with two decimals (basis points).', 'Prove each amount is within 1 paisa of the exact value.']
      }
    }]
  });

  /* ======================= TOPIC 4: SPLITWISE — SIMPLIFYING DEBTS ======================= */
  var SW_SIMPLIFY = `// ===== Debt simplification: greedy (fast, at most n-1 transfers) + exact minimum (bitmask DP) =====
record Transfer(String from, String to, long amount) {}

final class DebtSimplifier {

    /** Step 1: collapse any list of debts into one net number per person. */
    static Map<String, Long> netOf(List<Transfer> debts) {
        Map<String, Long> net = new TreeMap<>();
        for (Transfer d : debts) {
            net.merge(d.from(), -d.amount(), Long::sum);   // debtor goes down
            net.merge(d.to(), d.amount(), Long::sum);       // creditor goes up
        }
        return net;
    }

    /** Step 2 (greedy): biggest debtor pays biggest creditor, repeat. Each step zeroes at least one person. */
    static List<Transfer> greedy(Map<String, Long> net) {
        // creditors: largest positive first; debtors: most negative first; ties broken by name for determinism
        PriorityQueue<long[]> cred = new PriorityQueue<>((x, y) -> x[0] != y[0] ? Long.compare(y[0], x[0]) : Long.compare(x[1], y[1]));
        PriorityQueue<long[]> debt = new PriorityQueue<>((x, y) -> x[0] != y[0] ? Long.compare(x[0], y[0]) : Long.compare(x[1], y[1]));
        List<String> names = new ArrayList<>(net.keySet());
        for (int i = 0; i < names.size(); i++) {
            long v = net.get(names.get(i));
            if (v > 0) cred.add(new long[]{v, i});
            else if (v < 0) debt.add(new long[]{v, i});
        }
        List<Transfer> out = new ArrayList<>();
        while (!cred.isEmpty() && !debt.isEmpty()) {
            long[] c = cred.poll(), d = debt.poll();
            long amt = Math.min(c[0], -d[0]);
            out.add(new Transfer(names.get((int) d[1]), names.get((int) c[1]), amt));
            if (c[0] - amt > 0) cred.add(new long[]{c[0] - amt, c[1]});
            if (d[0] + amt < 0) debt.add(new long[]{d[0] + amt, d[1]});
        }
        return out;
    }

    /** Exact minimum number of transfers (NP-hard in general; fine for n <= ~20).
     *  Answer = (#non-zero people) - (max number of disjoint zero-sum groups). */
    static int minTransfers(Map<String, Long> net) {
        long[] b = net.values().stream().mapToLong(Long::longValue).filter(v -> v != 0).toArray();
        int n = b.length, full = 1 << n;
        long[] sum = new long[full];
        int[] groups = new int[full];          // groups[mask] = max zero-sum groups that exactly cover mask
        for (int mask = 1; mask < full; mask++) {
            int low = Integer.numberOfTrailingZeros(mask);
            sum[mask] = sum[mask & (mask - 1)] + b[low];
            int best = 0;
            for (int i = 0; i < n; i++)
                if ((mask >> i & 1) == 1) best = Math.max(best, groups[mask ^ (1 << i)]);
            groups[mask] = best + (sum[mask] == 0 ? 1 : 0);
        }
        return n == 0 ? 0 : n - groups[full - 1];
    }

    public static void main(String[] args) {
        List<Transfer> debts = List.of(
            new Transfer("ben", "asha", 300), new Transfer("chen", "asha", 300), new Transfer("chen", "ben", 150),
            new Transfer("asha", "chen", 60), new Transfer("dev", "ben", 100), new Transfer("dev", "chen", 80));
        Map<String, Long> net = netOf(debts);
        System.out.println("net = " + net);                       // {asha=540, ben=-50, chen=-310, dev=-180}
        List<Transfer> plan = greedy(net);
        plan.forEach(System.out::println);                        // 3 transfers instead of 6
        System.out.println("exact minimum = " + minTransfers(net));

        // Greedy is NOT always optimal: +4 +3 -2 -2 -3 -> greedy 4 transfers, optimum 3 ({+3,-3}, {+4,-2,-2})
        Map<String, Long> tricky = new TreeMap<>(Map.of("a", 4L, "b", 3L, "x", -2L, "y", -2L, "z", -3L));
        System.out.println("greedy = " + greedy(tricky).size() + ", optimal = " + minTransfers(tricky));
    }
}`;

  topics.push({
    title: 'Splitwise II: Simplifying Debts (who pays whom, in the fewest transfers)',
    analogy: `<p>Ben owes Asha ₹100, and Asha owes Chen ₹100. Should Ben pay Asha so that Asha can pay Chen? That is two UPI transfers and Asha is just a middle-man. Simpler: <b>Ben pays Chen ₹100 directly</b> and Asha is done. It is like a chain of passing a parcel through friends' hands when the sender could just hand it to the receiver. Debt simplification removes the middle-men: only the <b>final position</b> of each person (how much they are up or down overall) matters, not the path the IOUs took.</p>`,
    explain: `<p><b>Goal:</b> given all debts in a group, produce a list of payments so that everyone ends at zero, using as <b>few transfers</b> as possible — without changing how much anyone pays or receives in total.</p>
<h4>Step 1 — Only the net balance matters</h4>
<p>For each debt "X owes Y a": <code>net[X] −= a</code>, <code>net[Y] += a</code>. Positive net = <b>creditor</b> (should receive), negative = <b>debtor</b> (should pay). Sum of nets = 0. Two very different debt graphs with the same nets need exactly the same settlement.</p>
${H.table(['Debts (6 IOUs)', 'Net after collapsing'], [['Ben→Asha 300, Chen→Asha 300, Chen→Ben 150, Asha→Chen 60, Dev→Ben 100, Dev→Chen 80', 'Asha ' + H.c('g', '+540') + ', Ben ' + H.c('r', '−50') + ', Chen ' + H.c('r', '−310') + ', Dev ' + H.c('r', '−180')]])}
<h4>Step 2 — Greedy: largest debtor pays largest creditor</h4>
<ol>
<li>Put creditors in a max-heap by amount, debtors in a max-heap by amount owed.</li>
<li>Pop the top of each. Transfer <code>m = min(credit, debt)</code>. At least one of the two becomes zero.</li>
<li>Push back whoever still has a non-zero balance. Repeat until heaps are empty.</li>
</ol>
<p>Here: Chen pays Asha 310 → Dev pays Asha 180 → Ben pays Asha 50. <b>3 transfers instead of 6.</b> Because every step zeroes at least one person and the last step zeroes two, greedy uses <b>at most n − 1</b> transfers for n non-zero people. It runs in O(n log n).</p>
<h4>Step 3 — Is greedy optimal? No (and the exact problem is NP-hard)</h4>
<p>Nets +4, +3, −2, −2, −3. Greedy: −3 pays +4 (left +1), −2 pays +3 (left +1), −2 pays +1, … → <b>4</b> transfers. Optimal: {+3, −3} settle among themselves (1 transfer) and {+4, −2, −2} (2 transfers) → <b>3</b>. In general, min transfers = <b>n − (maximum number of disjoint zero-sum groups)</b>, because a group of k people that sums to zero needs k − 1 transfers. Finding the max number of zero-sum groups is a partition-type problem (NP-hard), solvable for small groups (n ≤ 20) with bitmask DP in O(2<sup>n</sup>·n).</p>
<h4>Design placement</h4>
<p>Make it a <b>Strategy</b>: <code>interface SettlementStrategy { List&lt;Transfer&gt; plan(Map&lt;String, Long&gt; net); }</code> with <code>GreedySettlement</code>, <code>ExactSettlement</code> (small groups), and <code>PairwiseSettlement</code> (no simplification — some users dislike paying strangers). The group setting "simplify debts: on/off" picks the strategy.</p>`,
    clues: [
      '"Minimise the number of transactions to settle up" / "simplify debts" → collapse to net balances first',
      '"Optimal account balancing" (LeetCode 465), n ≤ 12 → exact bitmask DP / backtracking',
      '"Large group, good-enough answer, fast" → greedy max-creditor vs max-debtor with two heaps, ≤ n − 1 transfers',
      '"Nobody should pay or receive a different total" → any plan that zeroes every net is valid',
      '"Cash flow minimisation among friends / banks" → same problem (classic GfG)',
      '"Users do not want to pay strangers" → constrain transfers to existing edges (a flow problem) or turn simplification off'
    ],
    code: SW_SIMPLIFY,
    codeTitle: 'DebtSimplifier: net balances → greedy plan → exact minimum (compilable Java)',
    viz: {
      title: 'Simplify debts: before graph → net table → greedy → after graph',
      input: 'Ben>Asha 300, Chen>Asha 300, Chen>Ben 150, Asha>Chen 60, Dev>Ben 100, Dev>Chen 80',
      inputLabel: 'Debts: Debtor>Creditor amount, … (max 10 debts, 6 people)',
      gen: function (input) {
        var items = String(input || '').split(',').map(function (s) { return s.trim(); }).filter(function (s) { return s; });
        if (!items.length) throw new Error('Format: Ben>Asha 300, Chen>Ben 150');
        if (items.length > 10) throw new Error('Use at most 10 debts');
        var people = [], debts = [];
        items.forEach(function (it) {
          var m = /^([A-Za-z]+)\s*>\s*([A-Za-z]+)\s+(\d+)$/.exec(it);
          if (!m) throw new Error('Each debt looks like Ben>Asha 300 (Ben owes Asha ₹300). Bad: ' + it);
          var a = cap(m[1]), b = cap(m[2]), amt = Number(m[3]);
          if (a === b) throw new Error(a + ' cannot owe themselves');
          if (amt <= 0 || amt > 1000000) throw new Error('Amounts must be 1..1000000');
          [a, b].forEach(function (p) { if (people.indexOf(p) < 0) people.push(p); });
          debts.push([a, b, amt]);
        });
        if (people.length > 6) throw new Error('Use at most 6 people');
        var pos = {};
        people.forEach(function (p, i) { var ang = -Math.PI / 2 + 2 * Math.PI * i / people.length; pos[p] = N(p, p, Math.round(50 + 34 * Math.cos(ang)), Math.round(30 + 24 * Math.sin(ang))); });
        var nodes = people.map(function (p) { return pos[p]; });
        var mergeEdges = function (list) { var m = {}, out = []; list.forEach(function (d) { var k = d[0] + '-' + d[1]; if (m[k] === undefined) { m[k] = out.length; out.push([d[0], d[1], d[2]]); } else out[m[k]][2] += d[2]; }); return out; };
        var before = mergeEdges(debts);
        var net = {};
        people.forEach(function (p) { net[p] = 0; });
        var netTable = function (hlP, label) {
          var hl = {};
          var rows = people.map(function (p, i) { if (hlP && hlP.indexOf(p) >= 0) hl[i] = 'cur'; var v = net[p]; return [p, (v > 0 ? '+' : '') + v, v > 0 ? 'creditor (receives)' : v < 0 ? 'debtor (pays)' : 'settled']; });
          return TABLE(label || 'Net balance', ['person', 'net ₹', 'role'], rows, hl);
        };
        var frames = [];
        frames.push(F('The group\'s raw IOUs: <b>' + before.length + ' separate debts</b> (an arrow X → Y means X owes Y). Settling each one directly needs ' + before.length + ' UPI transfers, and some people both pay and receive.', [G('Before: raw debts', nodes, before, { h: 60, ehl: paintAll(before, 'cur') }), VARS('Transfers needed', { naive: before.length }, { naive: 'bad' })]));
        debts.forEach(function (d, i) {
          net[d[0]] -= d[2]; net[d[1]] += d[2];
          if (i < 6 || i === debts.length - 1) {
            var eh = {}; eh[d[0] + '-' + d[1]] = 'cur';
            frames.push(F('Collapse debt ' + (i + 1) + ': ' + d[0] + ' owes ' + d[1] + ' ₹' + d[2] + ' → net[' + d[0] + '] −= ' + d[2] + ', net[' + d[1] + '] += ' + d[2] + '.', [G('Before: raw debts', nodes, before, { h: 60, ehl: eh, hl: (function () { var h = {}; h[d[0]] = 'bad'; h[d[1]] = 'ok'; return h; })() }), netTable([d[0], d[1]])]));
          }
        });
        var total = people.reduce(function (a, p) { return a + net[p]; }, 0);
        var cred = people.filter(function (p) { return net[p] > 0; }), debt = people.filter(function (p) { return net[p] < 0; });
        var sortHeaps = function () {
          cred.sort(function (a, b) { return net[b] - net[a] || (a < b ? -1 : 1); });
          debt.sort(function (a, b) { return net[a] - net[b] || (a < b ? -1 : 1); });
        };
        sortHeaps();
        var heapTables = function () {
          return [TABLE('Creditor max-heap', ['who', 'to receive'], cred.length ? cred.map(function (p) { return [p, '₹' + net[p]]; }) : [['(empty)', '-']], cred.length ? { 0: 'sel' } : {}),
            TABLE('Debtor max-heap', ['who', 'to pay'], debt.length ? debt.map(function (p) { return [p, '₹' + (-net[p])]; }) : [['(empty)', '-']], debt.length ? { 0: 'sel' } : {})];
        };
        frames.push(F('Net balances sum to <b>' + total + '</b> (always 0). Only these numbers matter now — the original arrows can be forgotten. Put creditors and debtors into two max-heaps.', [netTable(null, 'Final net balances')].concat(heapTables())));
        var after = [], nz = cred.length + debt.length;
        var guard = 0;
        while (cred.length && debt.length && guard++ < 20) {
          var c = cred[0], d = debt[0], amt = Math.min(net[c], -net[d]);
          after.push([d, c, amt]);
          net[c] -= amt; net[d] += amt;
          var eh2 = {}; eh2[d + '-' + c] = 'ok';
          var hl2 = {}; hl2[d] = net[d] === 0 ? 'done' : 'cur'; hl2[c] = net[c] === 0 ? 'done' : 'cur';
          frames.push(F('Pop the top of each heap: biggest debtor <b>' + d + '</b> pays biggest creditor <b>' + c + '</b> min(' + (net[c] + amt) + ', ' + (-(net[d] - amt)) + ') = <b>₹' + amt + '</b>. ' + (net[c] === 0 && net[d] === 0 ? 'Both are now settled.' : (net[c] === 0 ? c : d) + ' is settled; the other goes back into its heap with the remainder.'), [G('After: simplified plan', nodes, after, { h: 60, ehl: eh2, hl: hl2 }), netTable([c, d])]));
          cred = cred.filter(function (p) { return net[p] > 0; });
          debt = debt.filter(function (p) { return net[p] < 0; });
          sortHeaps();
        }
        frames.push(F('Done: <b>' + after.length + ' transfer(s)</b> instead of ' + before.length + '. Everyone pays or receives exactly their net amount. Greedy guarantees ≤ n − 1 = ' + Math.max(0, nz - 1) + ' transfers for ' + nz + ' non-zero people (each step settles at least one person).', [G('After: simplified plan', nodes, after, { h: 60, ehl: paintAll(after, 'ok') }), VARS('Transfers', { before: before.length, after: after.length }, { after: 'ok', before: 'bad' })]));
        frames.push(F('Caveat: greedy is fast but not always the absolute minimum. Nets +4, +3, −2, −2, −3 → greedy makes 4 transfers, while the best plan makes 3 ({+3, −3} and {+4, −2, −2} settle separately). The exact answer = non-zero people − max number of zero-sum groups, solved with bitmask DP for small groups.', [TABLE('Greedy vs optimal on a tricky case', ['plan', 'transfers'], [['greedy: z→a 3, x→b 2, y→a 1, y→b 1', '4'], ['optimal: z→b 3, x→a 2, y→a 2', '3']], { 1: 'ok' })]));
        return frames;
      }
    },
    examples: [
      { title: 'Cycle: everyone owes the next person ₹50', html: `<p>A→B 50, B→C 50, C→A 50. Nets: A = −50 + 50 = 0, B = 0, C = 0. ${H.c('g', 'Zero transfers needed')} — the three IOUs cancel out completely. A naive "settle each debt" design would move ₹150 around for nothing.</p>` },
      { title: 'Chain: A owes B, B owes C', html: `<p>A→B 100, B→C 100. Nets: A −100, B 0, C +100. Greedy: A pays C 100. One transfer, B is not involved at all. This is the classic "remove the middle-man" case shown in Splitwise's onboarding.</p>` },
      { title: 'Where greedy is not optimal (and the exact fix)', html: `<p>Nets a:+4, b:+3, x:−2, y:−2, z:−3 (sum 0).</p>${H.table(['Approach', 'Plan', 'Count'], [['Greedy', 'z→a 3, x→b 2, y→a 1, y→b 1', H.c('r', '4')], ['Exact (zero-sum groups)', '{b, z}: z→b 3 · {a, x, y}: x→a 2, y→a 2', H.c('g', '3')]])}<p>Two zero-sum groups → 5 people − 2 groups = 3 transfers. The bitmask DP finds the maximum number of such groups.</p>`, code: `class MinTransfersDemo {
    // dp over subsets: groups[mask] = max zero-sum groups exactly covering 'mask'
    static int minTransfers(long[] b) {
        int n = b.length, full = 1 << n;
        long[] sum = new long[full];
        int[] groups = new int[full];
        for (int mask = 1; mask < full; mask++) {
            sum[mask] = sum[mask & (mask - 1)] + b[Integer.numberOfTrailingZeros(mask)];
            int best = 0;
            for (int i = 0; i < n; i++) if ((mask >> i & 1) == 1) best = Math.max(best, groups[mask ^ (1 << i)]);
            groups[mask] = best + (sum[mask] == 0 ? 1 : 0);
        }
        return n - groups[full - 1];
    }
    public static void main(String[] args) {
        System.out.println(minTransfers(new long[]{4, 3, -2, -2, -3}));   // 3
    }
}` },
      { title: 'Constraint: only pay people you already owe', html: `<p>Some groups dislike "pay Chen, whom you never met". Then the settlement may only use <b>existing edges</b> (and their directions). That turns the problem into a <b>flow</b> problem: reduce flow along cycles (cycle cancelling) without creating new edges. Splitwise's own "simplify debts" setting is per-group and off by default for exactly this reason.</p>` }
    ],
    deepDive: `<p><b>Why greedy is bounded by n − 1.</b> Each iteration zeroes at least one person (the smaller of the two balances). With n non-zero people there can be at most n − 1 iterations before the last two cancel together (the last transfer zeroes both, since the totals sum to zero).</p>
<p><b>Why the exact problem is hard.</b> A zero-sum group of size k can always be settled with k − 1 transfers, and no group can do better than that if it contains no smaller zero-sum subgroup. So minimising transfers ⇔ <b>maximising the number of disjoint zero-sum subsets</b> — a generalisation of the PARTITION problem, NP-hard. The subset DP is O(2<sup>n</sup>·n); a DFS with pruning (skip zeros, only pair with opposite signs, skip duplicate values) also works well for n ≤ 12–15.</p>
<p><b>Correctness of the DP.</b> Order people one by one; every time the running prefix sum hits zero, a group closes. <code>groups[mask]</code> = best over "which person was added last". The recurrence <code>max over i of groups[mask − i] + [sum(mask) == 0]</code> captures exactly that.</p>
<p><b>Product reality.</b> Simplification changes <i>who</i> you pay, which surprises users; show "simplified from 6 to 3 payments" and let them toggle it. Recompute on every expense (cheap: O(n log n)). For very large groups (a 200-person office), greedy is the only practical choice; prefer stable tie-breaking so the plan does not reshuffle wildly after every small expense.</p>
<p><b>Precision.</b> Do all of this on <code>long</code> paise. Floating-point nets like 0.0000001 will never "hit zero" and break both the greedy stop condition and the DP's zero-sum test.</p>
<p><b>Multi-currency:</b> simplify per currency independently, or convert to one currency first (a product decision).</p>`,
    aiEra: `<p><b>What AI changes:</b> "minimise transactions" is a famous problem — an assistant will instantly produce the greedy or the LeetCode 465 DFS. Interviewers therefore ask the follow-ups: is greedy optimal (no), why is the exact version hard, what bound does greedy give, how do you test it?</p>
<p><b>Use AI as a partner:</b> <code>Generate 1000 random net-balance vectors (n ≤ 8, sum 0) and compare my greedy against a brute-force exact solver; print any case where greedy is worse.</code> That is how you discover the +4 +3 −2 −2 −3 counterexample yourself.</p>
<p><b>Where AI goes wrong:</b> claims greedy is optimal; uses doubles so balances never reach exactly zero; forgets to collapse to nets first and "simplifies" edge by edge; mutates entries while they are inside a PriorityQueue (breaking heap order) instead of poll → modify → re-add.</p>
<p><b>What you must still own:</b> the reduction to net balances, the n − 1 bound argument, the counterexample, and the product trade-off (fewer payments vs paying strangers).</p>`,
    problems: [{
      title: 'Minimize Cash Flow Among Friends',
      level: 'Medium', tags: ['splitwise', 'greedy', 'heap'], companies: ['Splitwise', 'Amazon', 'Goldman Sachs', 'Uber'],
      statement: `<p>You are given a list of debts <code>[from, to, amount]</code> among n friends (ids 0..n−1). Return a list of settlements <code>[from, to, amount]</code> such that, after applying them instead of the original debts, every friend pays or receives exactly the same total as before, using <b>at most n − 1</b> settlements. Use the "largest debtor pays largest creditor" rule; break ties by smaller id.</p>`,
      constraints: `1 ≤ n ≤ 10<sup>5</sup>, ≤ 2·10<sup>5</sup> debts, amounts ≤ 10<sup>9</sup>`,
      example: `<p>n = 3, debts = [[0,1,1000],[1,2,5000],[0,2,2000]]. Nets: 0 → −3000, 1 → 1000 − 5000 = −4000, 2 → +7000. Settlements: ${H.c('g', '[1,2,4000], [0,2,3000]')} — 2 transfers instead of 3.</p>`,
      brute: { why: `<p>Naive design: replay every debt as its own payment (m transfers, people both pay and receive), or only net each <i>pair</i> (still up to n(n−1)/2 transfers). Both ignore that money is fungible — only each person's final net matters.</p>`, code: `class PairwiseOnly {
    // nets each PAIR only: still O(n^2) transfers in the worst case
    static List<long[]> settle(int n, int[][] debts) {
        long[][] owe = new long[n][n];
        for (int[] d : debts) { owe[d[0]][d[1]] += d[2]; owe[d[1]][d[0]] -= d[2]; }
        List<long[]> out = new ArrayList<>();
        for (int i = 0; i < n; i++)
            for (int j = 0; j < n; j++)
                if (owe[i][j] > 0) out.add(new long[]{i, j, owe[i][j]});
        return out;
    }
}` },
      mcq: { q: 'After collapsing to nets, Ben is −300 and Chen is +300 (nobody else non-zero). How many transfers?', options: ['1', '2', '0', 'Depends on the original debts'], answer: 0, explain: 'Only nets matter: Ben pays Chen 300. The original debt graph is irrelevant once nets are known.' },
      hints: [`<p>Hint 1: compute <code>net[i]</code> = received − paid over all debts. The settlement only has to zero every net.</p>`, `<p>Hint 2: two priority queues — creditors by largest positive net, debtors by most negative net. Pop one of each, transfer the min, push back any remainder.</p>`, `<p>Hint 3: every round zeroes at least one person, so ≤ n − 1 rounds. Use <code>long</code> nets (sum of up to 2·10<sup>5</sup> × 10<sup>9</sup>). Skip people whose net is already 0.</p>`],
      solution: {
        approach: `<p>Collapse to nets in O(m), then greedy with two heaps in O(n log n). Ties by id make the output deterministic.</p>`,
        code: `class MinCashFlow {
    static List<long[]> settle(int n, int[][] debts) {
        long[] net = new long[n];
        for (int[] d : debts) { net[d[0]] -= d[2]; net[d[1]] += d[2]; }
        // entries: {amount, id}
        PriorityQueue<long[]> cred = new PriorityQueue<>((a, b) -> a[0] != b[0] ? Long.compare(b[0], a[0]) : Long.compare(a[1], b[1]));
        PriorityQueue<long[]> debt = new PriorityQueue<>((a, b) -> a[0] != b[0] ? Long.compare(b[0], a[0]) : Long.compare(a[1], b[1]));
        for (int i = 0; i < n; i++) {
            if (net[i] > 0) cred.add(new long[]{net[i], i});
            else if (net[i] < 0) debt.add(new long[]{-net[i], i});
        }
        List<long[]> out = new ArrayList<>();
        while (!cred.isEmpty() && !debt.isEmpty()) {
            long[] c = cred.poll(), d = debt.poll();
            long amt = Math.min(c[0], d[0]);
            out.add(new long[]{d[1], c[1], amt});
            if (c[0] > amt) cred.add(new long[]{c[0] - amt, c[1]});
            if (d[0] > amt) debt.add(new long[]{d[0] - amt, d[1]});
        }
        return out;
    }
    public static void main(String[] args) {
        int[][] debts = {{0, 1, 1000}, {1, 2, 5000}, {0, 2, 2000}};
        for (long[] t : settle(3, debts)) System.out.println(t[0] + " pays " + t[1] + " " + t[2]);
    }
}`,
        complexity: `<p>O(m + n log n) time, O(n) space. Transfers ≤ n − 1.</p>`,
        followUps: ['Return the exact minimum for n ≤ 15 (bitmask DP).', 'Only allow transfers along existing debt edges.', 'Update the plan incrementally after one new expense.']
      }
    }]
  });

  // paints every edge of a list with one highlight class (used by the debt graph)
  function paintAll(edges, cls) { var r = {}; edges.forEach(function (e) { r[e[0] + '-' + e[1]] = cls; }); return r; }

  /* ======================= TOPIC 5: LIBRARY — CATALOG, COPIES, MEMBERS, CHECKOUT ======================= */
  var LIB_MODEL = `// ================= Library Management core (compiles as-is) =================
enum ItemStatus { AVAILABLE, LOANED, ON_HOLD, LOST, UNDER_REPAIR }

enum MemberType {
    STUDENT(5, 14), FACULTY(10, 30);
    final int maxBooks, loanDays;
    MemberType(int maxBooks, int loanDays) { this.maxBooks = maxBooks; this.loanDays = loanDays; }
}

// The TITLE in the catalogue: one per ISBN, no matter how many copies exist.
final class Book {
    final String isbn, title, subject;
    final List<String> authors;
    Book(String isbn, String title, String subject, List<String> authors) {
        this.isbn = isbn; this.title = title; this.subject = subject; this.authors = List.copyOf(authors);
    }
}

// A PHYSICAL copy with its own barcode, shelf and status. This is what gets lent.
final class BookItem {
    final String barcode;
    final Book book;
    final String rack;
    ItemStatus status = ItemStatus.AVAILABLE;
    BookItem(String barcode, Book book, String rack) { this.barcode = barcode; this.book = book; this.rack = rack; }
}

final class Member {
    final String id, name;
    final MemberType type;
    boolean active = true;
    long unpaidFinePaise;
    final Map<String, Loan> loans = new LinkedHashMap<>();       // barcode -> active loan
    Member(String id, String name, MemberType type) { this.id = id; this.name = name; this.type = type; }
}

final class Loan {
    final BookItem item;
    final Member member;
    final LocalDate issuedOn;
    LocalDate dueOn;
    LocalDate returnedOn;
    int renewals;
    Loan(BookItem item, Member member, LocalDate issuedOn, LocalDate dueOn) {
        this.item = item; this.member = member; this.issuedOn = issuedOn; this.dueOn = dueOn;
    }
    long daysLate(LocalDate on) { return Math.max(0, on.toEpochDay() - dueOn.toEpochDay()); }
}

// Search: an inverted index "word -> ISBNs" over title and author words.
final class Catalog {
    private final Map<String, Book> byIsbn = new HashMap<>();
    private final Map<String, BookItem> byBarcode = new HashMap<>();
    private final Map<String, List<BookItem>> copies = new HashMap<>();
    private final Map<String, Set<String>> index = new HashMap<>();

    void addBook(Book b) {
        byIsbn.put(b.isbn, b);
        List<String> words = new ArrayList<>(List.of(b.title.toLowerCase().split(" ")));
        for (String a : b.authors) words.addAll(List.of(a.toLowerCase().split(" ")));
        for (String w : words) if (!w.isBlank()) index.computeIfAbsent(w, k -> new TreeSet<>()).add(b.isbn);
    }
    void addItem(BookItem it) {
        if (!byIsbn.containsKey(it.book.isbn)) throw new IllegalArgumentException("add the Book first");
        byBarcode.put(it.barcode, it);
        copies.computeIfAbsent(it.book.isbn, k -> new ArrayList<>()).add(it);
    }
    /** AND-search: every query word must match a title or author word. */
    List<Book> search(String query) {
        Set<String> result = null;
        for (String w : query.toLowerCase().split(" ")) {
            if (w.isBlank()) continue;
            Set<String> hits = index.getOrDefault(w, Set.of());
            if (result == null) result = new TreeSet<>(hits); else result.retainAll(hits);
        }
        if (result == null) return List.of();
        return result.stream().map(byIsbn::get).toList();
    }
    Optional<BookItem> item(String barcode) { return Optional.ofNullable(byBarcode.get(barcode)); }
    long availableCopies(String isbn) {
        return copies.getOrDefault(isbn, List.of()).stream().filter(i -> i.status == ItemStatus.AVAILABLE).count();
    }
}

final class LibraryService {
    static final long MAX_UNPAID_FINE = 100_00;    // Rs 100
    static final long FINE_PER_DAY = 10_00;        // Rs 10 (topic 6 makes this a pluggable FinePolicy)
    static final int MAX_RENEWALS = 2;

    private final Catalog catalog;
    private final Map<String, Member> members = new HashMap<>();
    private final Map<String, Loan> activeLoans = new HashMap<>();   // barcode -> loan

    LibraryService(Catalog catalog) { this.catalog = catalog; }
    void addMember(Member m) { members.put(m.id, m); }

    private Member member(String id) {
        Member m = members.get(id);
        if (m == null) throw new IllegalArgumentException("unknown member " + id);
        return m;
    }

    synchronized Loan checkout(String memberId, String barcode, LocalDate today) {
        Member m = member(memberId);
        BookItem it = catalog.item(barcode).orElseThrow(() -> new IllegalArgumentException("unknown barcode " + barcode));
        if (!m.active) throw new IllegalStateException("membership inactive");
        if (m.loans.size() >= m.type.maxBooks) throw new IllegalStateException("limit of " + m.type.maxBooks + " books reached");
        if (m.unpaidFinePaise > MAX_UNPAID_FINE) throw new IllegalStateException("please clear fines first");
        if (it.status != ItemStatus.AVAILABLE) throw new IllegalStateException("this copy is " + it.status);
        Loan loan = new Loan(it, m, today, today.plusDays(m.type.loanDays));
        it.status = ItemStatus.LOANED;
        m.loans.put(barcode, loan);
        activeLoans.put(barcode, loan);
        return loan;
    }

    /** returns the fine charged (paise) */
    synchronized long returnItem(String barcode, LocalDate today) {
        Loan loan = activeLoans.remove(barcode);
        if (loan == null) throw new IllegalStateException(barcode + " is not on loan");
        loan.returnedOn = today;
        loan.member.loans.remove(barcode);
        loan.item.status = ItemStatus.AVAILABLE;            // topic 6: may become ON_HOLD for a waiting member
        long fine = loan.daysLate(today) * FINE_PER_DAY;
        loan.member.unpaidFinePaise += fine;
        return fine;
    }

    synchronized Loan renew(String barcode, LocalDate today) {
        Loan loan = activeLoans.get(barcode);
        if (loan == null) throw new IllegalStateException(barcode + " is not on loan");
        if (loan.daysLate(today) > 0) throw new IllegalStateException("overdue items cannot be renewed");
        if (loan.renewals >= MAX_RENEWALS) throw new IllegalStateException("renewal limit reached");
        loan.renewals++;
        loan.dueOn = loan.dueOn.plusDays(loan.member.type.loanDays);
        return loan;
    }

    synchronized void payFine(String memberId, long paise) {
        Member m = member(memberId);
        m.unpaidFinePaise = Math.max(0, m.unpaidFinePaise - paise);
    }
}

public class LibraryDemo {
    public static void main(String[] args) {
        Catalog cat = new Catalog();
        Book clean = new Book("978-0132350884", "Clean Code", "Software", List.of("Robert Martin"));
        Book ddia = new Book("978-1449373320", "Designing Data Intensive Applications", "Databases", List.of("Martin Kleppmann"));
        cat.addBook(clean);
        cat.addBook(ddia);
        cat.addItem(new BookItem("BC-001", clean, "R1-S3"));
        cat.addItem(new BookItem("BC-002", clean, "R1-S3"));
        cat.addItem(new BookItem("BC-003", ddia, "R4-S1"));
        System.out.println(cat.search("martin").size() + " books by a Martin");     // 2
        System.out.println(cat.search("clean martin").get(0).title);                // Clean Code

        LibraryService lib = new LibraryService(cat);
        lib.addMember(new Member("M1", "Priya", MemberType.STUDENT));
        LocalDate d1 = LocalDate.of(2026, 10, 1);
        Loan loan = lib.checkout("M1", "BC-001", d1);
        System.out.println("due " + loan.dueOn + ", copies left " + cat.availableCopies(clean.isbn));  // 2026-10-15, 1
        long fine = lib.returnItem("BC-001", LocalDate.of(2026, 10, 20));
        System.out.println("fine paise = " + fine);                                 // 5 days late -> 5000
    }
}`;

  topics.push({
    title: 'Library Management I: Catalog, Copies, Members & the Checkout Flow',
    analogy: `<p>A <b>recipe</b> and the <b>cakes</b> baked from it are different things. The recipe "Chocolate Truffle" is written once; the bakery may have five actual cakes on the shelf, one of which is already sold and one dropped on the floor. A library works the same way: the <b>Book</b> (title, author, ISBN) is the recipe in the catalogue; each <b>BookItem</b> is a physical copy with its own barcode sticker, its own shelf, and its own story (on loan to Priya, being repaired, lost). And your <b>library card</b> is like a credit card with a limit: at most 5 books at a time, 14 days each.</p>`,
    explain: `<p><b>The question:</b> "Design a Library Management System" — a very common LLD round because it is all about <b>business rules</b>: limits, due dates, fines, renewals, reservations.</p>
<h4>Requirements (clarify out loud)</h4>
<ul>
<li>Search the catalogue by title, author, subject, ISBN.</li>
<li>Members borrow copies: <b>student</b> up to 5 books for 14 days, <b>faculty</b> up to 10 for 30 days.</li>
<li>Return a book; charge a <b>fine</b> if late. Members with unpaid fines above ₹100 cannot borrow.</li>
<li>Renew a loan (max 2 times, not if overdue, not if someone else reserved the title).</li>
<li>Reserve a title that has no free copy; get notified when a copy is held for you (topic 6).</li>
<li>Librarians add/remove books and copies, block members, mark copies lost/damaged.</li>
</ul>
<h4>The key modelling decision: Book vs BookItem</h4>
${H.table(['', 'Book (title)', 'BookItem (copy)'], [['Identity', 'ISBN', 'Barcode'], ['How many', 'One per title', 'Many per title'], ['Has status?', H.c('r', 'No'), H.c('g', 'Yes: AVAILABLE / LOANED / ON_HOLD / LOST / UNDER_REPAIR')], ['Has a shelf?', 'No', 'Yes (rack R1-S3)'], ['Search works on', H.c('g', 'this'), '—'], ['Loans point to', '—', H.c('g', 'this')]])}
<p>The <b>naive</b> design is a single <code>Book</code> class with <code>int copiesAvailable</code>. It looks fine until you ask: <i>which</i> copy does Priya have? Which copy is damaged? Where is it shelved? Who had copy #2 when the page was torn? A counter cannot answer any of that.</p>
<h4>Other entities</h4>
<ul>
<li><b>Member</b> (type decides limits) and <b>Librarian</b> — both are accounts; a Librarian gets admin operations.</li>
<li><b>Loan</b> — (BookItem, Member, issuedOn, dueOn, returnedOn, renewals). The lending history is a list of Loans.</li>
<li><b>Reservation</b> — (Book, Member, createdAt, status). Reserves a <i>title</i>, not a specific copy.</li>
<li><b>Catalog</b> — indexes for search (inverted index word → ISBNs, map barcode → item).</li>
<li><b>LibraryService</b> — facade for checkout / return / renew / reserve; delegates rules to <b>LendingRule</b>s and fines to a <b>FinePolicy</b> (topic 6).</li>
</ul>
<h4>The checkout flow</h4>
<p>Find member → find copy by barcode → run the rules (active? under limit? fines OK? copy available or on hold for this member?) → mark copy LOANED → create Loan with due date = today + loanDays → return the Loan (print the slip). If any rule fails, <b>nothing</b> changes.</p>`,
    clues: [
      '"Design a library management system" / "book lending system"',
      '"A library has multiple copies of the same book" → split Book (title, ISBN) from BookItem (copy, barcode, status)',
      '"Member can borrow at most 5 books for 14 days" → limits on MemberType (enum with fields) or a policy object',
      '"Search by title, author, subject" → Catalog with inverted index / maps',
      '"Fine for late returns", "block members with unpaid fines" → FinePolicy + a rule in the checkout chain',
      '"Track who borrowed which copy" → Loan entity (history), not a field on the book'
    ],
    code: LIB_MODEL,
    codeTitle: 'Library core: Book vs BookItem, Catalog search, checkout / return / renew (compilable Java)',
    viz: [{
      title: 'Build the Library class diagram step by step',
      gen: function () {
        return buildDiagram('Library class diagram', [
          { narr: '<span class="c-r">Naive start:</span> one class <b>Book</b> with <code>int copiesAvailable</code>. Checkout = <code>copiesAvailable--</code>. Simple… until someone asks "which copy did Priya take, and where is it shelved?"', add: [B('BookN', 'Book (title, copies: int)', 20, 30, 24)], cls: 'bad', note: 'A counter loses identity. You cannot mark one copy as damaged, find it on a shelf, or know who had it last.' },
          { narr: 'Split it. <b>Book</b> = the title in the catalogue (ISBN, title, authors, subject). <b>BookItem</b> = a physical copy with a barcode, rack and <b>status</b>.', remove: ['BookN'], add: [B('Book', 'Book (ISBN)', 15, 10), B('Item', 'BookItem (barcode, status)', 15, 40, 22)], edges: [['Item', 'Book', 'copy of']] },
          { narr: 'A <b>Catalog</b> owns the indexes: ISBN → Book, barcode → BookItem, and an inverted index word → ISBNs for search.', add: [B('Cat', 'Catalog (search)', 45, 10)], edges: [['Cat', 'Book', 'indexes'], ['Cat', 'Item', 'by barcode']] },
          { narr: '<b>Member</b> with a <b>MemberType</b> enum that carries the limits (STUDENT: 5 books / 14 days, FACULTY: 10 / 30). Putting the numbers on the enum keeps rules in one place.', add: [B('Mem', 'Member', 74, 40), B('MT', 'MemberType (limits)', 74, 62)], edges: [['Mem', 'MT', 'is a']] },
          { narr: 'A <b>Loan</b> connects one BookItem to one Member with dates (issued, due, returned) and a renewal count. History = list of loans; nothing is overwritten.', add: [B('Loan', 'Loan (due, returned)', 48, 40)], edges: [['Loan', 'Item', 'of'], ['Loan', 'Mem', 'to']] },
          { narr: 'A <b>Reservation</b> is for a <b>title</b> (Book), not a copy — any copy that comes back can satisfy it. Queue per ISBN, first come first served.', add: [B('Res', 'Reservation', 48, 62)], edges: [['Res', 'Book', 'for title'], ['Res', 'Mem', 'by']] },
          { narr: '<b>LibraryService</b> is the facade (checkout, return, renew, reserve). It delegates "may this member borrow this copy?" to a list of <b>LendingRule</b>s and "how much is the fine?" to a <b>FinePolicy</b> — both Strategy-style interfaces (topic 6).', add: [B('LS', 'LibraryService', 74, 10), B('LR', '«interface» LendingRule', 92, 26, 15), B('FP', '«interface» FinePolicy', 92, 54, 15)], edges: [['LS', 'Cat', 'finds'], ['LS', 'Loan', 'creates'], ['LS', 'LR', 'checks'], ['LS', 'FP', 'asks']], note: 'Read it in the interview as: "catalogue on the left, people on the right, Loan and Reservation in the middle joining them, services on top."' }
        ], 68);
      }
    }, {
      title: 'Checkout flow: one request through the rule checks',
      input: 'ok',
      inputLabel: 'Scenario: ok | limit | fine | loaned | inactive',
      gen: function (input) {
        var sc = String(input || 'ok').trim().toLowerCase();
        var allowed = ['ok', 'limit', 'fine', 'loaned', 'inactive'];
        if (allowed.indexOf(sc) < 0) throw new Error('Type one of: ' + allowed.join(', '));
        var mem = { name: 'Priya (STUDENT)', active: sc === 'inactive' ? 'false' : 'true', loans: sc === 'limit' ? '5 / 5' : '2 / 5', fines: sc === 'fine' ? '₹140' : '₹20' };
        var item = sc === 'loaned' ? 'LOANED (to Rahul, due 18 Oct)' : 'AVAILABLE';
        var nodes = [B('K', 'Kiosk / Librarian', 8, 30), B('LS', 'LibraryService', 30, 30), B('CAT', 'Catalog', 30, 6), B('R1', 'member active?', 56, 4), B('R2', 'under loan limit?', 56, 20), B('R3', 'fines ≤ ₹100?', 56, 36), B('R4', 'copy available?', 56, 52), B('BI', 'BookItem BC-001', 84, 52), B('LN', 'Loan', 84, 20)];
        var edges = [['K', 'LS', 'checkout(M1, BC-001)'], ['LS', 'CAT', 'find'], ['LS', 'R1'], ['R1', 'R2'], ['R2', 'R3'], ['R3', 'R4'], ['R4', 'BI', 'mark LOANED'], ['BI', 'LN', 'new Loan']];
        var mv = function (h) { return VARS('Member M1', mem, h || {}); };
        var iv = function (st, h) { return VARS('BookItem BC-001 "Clean Code"', { status: st, rack: 'R1-S3' }, h || {}); };
        var path = [
          ['K', 'LS', 'cur', 'Priya scans her card (M1) and the barcode sticker of a copy of <i>Clean Code</i> (BC-001). The kiosk calls <code>checkout("M1", "BC-001", today)</code>.', [mv(), iv(item)]],
          ['LS', 'CAT', 'ok', 'The service looks up the copy by barcode in the Catalog (O(1) map). Unknown barcode → error before anything else.', [iv(item, { status: 'cur' })]]
        ];
        var checks = [
          ['LS', 'R1', 'inactive', 'Rule 1: is the membership active (not expired, not blocked)?', { active: 'bad' }, 'Membership inactive → rejected. Renew the card at the desk.'],
          ['R1', 'R2', 'limit', 'Rule 2: is Priya below the STUDENT limit of 5 books on loan?', { loans: 'bad' }, 'Already 5 of 5 books → rejected. Return one first.'],
          ['R2', 'R3', 'fine', 'Rule 3: are unpaid fines at or below ₹100?', { fines: 'bad' }, 'Unpaid fines ₹140 > ₹100 → rejected. Pay at the desk.'],
          ['R3', 'R4', 'loaned', 'Rule 4: is <b>this copy</b> AVAILABLE (or ON_HOLD for Priya)?', null, 'This copy is LOANED to Rahul (it was probably mis-shelved). Suggest another copy or a reservation.']
        ];
        var failed = false;
        checks.forEach(function (c) {
          if (failed) return;
          var fail = sc === c[2];
          var extra = c[2] === 'loaned' ? [iv(item, fail ? { status: 'bad' } : { status: 'ok' })] : [mv(fail ? c[4] : {})];
          path.push([c[0], c[1], fail ? 'bad' : 'ok', c[3] + (fail ? ' <span class="c-r">' + c[5] + '</span>' : ' <span class="c-g">Yes → next rule.</span>'), extra]);
          if (fail) failed = true;
        });
        if (!failed) {
          path.push(['R4', 'BI', 'ok', 'All rules passed. Now (and only now) we change state: BookItem BC-001 → <b>LOANED</b>.', [iv('LOANED', { status: 'ok' })]]);
          path.push(['BI', 'LN', 'ok', 'Create a <b>Loan</b>: issued 1 Oct, due 1 Oct + 14 days = <b>15 Oct</b>. Add it to Priya\'s active loans (3 / 5). Print the slip.', [VARS('Loan L-77', { item: 'BC-001', member: 'M1', issued: '2026-10-01', due: '2026-10-15', renewals: 0 }, { due: 'ok' }), VARS('Member M1', { name: mem.name, active: 'true', loans: '3 / 5', fines: '₹20' }, { loans: 'ok' })]]);
        }
        var frames = walkFlow('Checkout request', nodes, edges, path, 62);
        frames.push(F(failed ? 'Because a rule failed <b>before</b> any state changed, nothing needs rolling back: the copy, the member and the loan list are untouched. That is the "validate first, mutate last" rule.' : 'Success. Order matters: cheap member checks first, then the copy check, then mutate. Each rule is a separate class, so adding "reference books cannot be borrowed" is one new rule, not an edit to a giant if-else.', [TXT(H.table(['Rule', 'Class', 'Failure message'], [['active', 'ActiveMemberRule', 'membership inactive'], ['limit', 'LoanLimitRule', 'limit reached'], ['fines', 'FineThresholdRule', 'clear fines first'], ['copy', 'ItemAvailableRule', 'copy is LOANED / ON_HOLD for someone else']]), 'Rules as separate classes (topic 6)')]));
        return frames;
      }
    }],
    examples: [
      { title: 'Search with an inverted index', html: `<p>Index: "clean" → {978-0132350884}, "martin" → {978-0132350884, 978-1449373320}, "designing" → {978-1449373320}. Query "clean martin" = intersection of the two sets → <b>Clean Code</b>. Each word lookup is O(1); intersection costs the size of the smaller set. Scanning every book's title with <code>contains()</code> is the naive O(total books × title length) approach.</p>${H.kv([['clean', '{0884}'], ['martin', '{0884, 3320}'], ['designing', '{3320}']], { label: 'word → ISBNs' })}` },
      { title: 'Due date and fine arithmetic', html: `<p>Issued 1 Oct, STUDENT → due 15 Oct. Returned 20 Oct: daysLate = epochDay(20 Oct) − epochDay(15 Oct) = <b>5</b>. Flat ₹10/day → <b>₹50</b> (5000 paise). Use <code>LocalDate</code> (no time zone surprises at midnight) and <code>toEpochDay()</code> differences — never subtract day-of-month numbers (breaks across months).</p>`, code: `class DueDates {
    public static void main(String[] args) {
        LocalDate issued = LocalDate.of(2026, 10, 1);
        LocalDate due = issued.plusDays(14);                       // 2026-10-15
        LocalDate returned = LocalDate.of(2026, 11, 2);            // crosses a month boundary
        long late = Math.max(0, returned.toEpochDay() - due.toEpochDay());
        System.out.println(due + " late by " + late + " days");    // 18 days
        System.out.println("wrong way: " + (returned.getDayOfMonth() - due.getDayOfMonth()));  // -13 !
    }
}` },
      { title: 'Renewal blocked', html: `<p>Priya's loan is due 15 Oct. On 14 Oct she renews → renewals = 1, due = 29 Oct. On 30 Oct she tries again → ${H.c('r', 'rejected: overdue items cannot be renewed')} (she must return and pay ₹10). If another member had reserved the title, renewal would also be rejected — the reserver should get the next copy.</p>` },
      { title: 'Lost copy', html: `<p>A member reports BC-002 lost. Mark the BookItem <b>LOST</b> (never delete it — history and audit need it), close the Loan with a "lost" flag, and charge the replacement price via the FinePolicy. The <b>Book</b> still exists with its other copies; <code>availableCopies</code> just drops by one.</p>` }
    ],
    deepDive: `<p><b>Persistence model.</b> Tables: <code>book(isbn PK)</code>, <code>book_item(barcode PK, isbn FK, status, rack)</code>, <code>member(id PK, type, active)</code>, <code>loan(id PK, barcode FK, member_id FK, issued_on, due_on, returned_on, renewals)</code> with a <b>partial unique index</b> "one open loan per barcode" (<code>WHERE returned_on IS NULL</code>) as the database-level guard against double lending.</p>
<p><b>Concurrency.</b> Two librarians scanning the same copy at two desks is rare but possible (or a self-service kiosk and a desk). The in-memory service uses <code>synchronized</code>; finer-grained: lock per member + per item in a fixed order (member first, then item) to avoid deadlock, or rely on the DB conditional update <code>UPDATE book_item SET status='LOANED' WHERE barcode=? AND status='AVAILABLE'</code>.</p>
<p><b>Time.</b> Libraries think in <b>dates</b>, not instants: use <code>LocalDate</code> in the library's zone, inject a <code>Clock</code> to compute "today", and decide whether holidays extend due dates (a <code>HolidayCalendar</code> dependency).</p>
<p><b>Search at scale.</b> The in-memory inverted index is a toy Lucene/Elasticsearch: tokenisation, lower-casing, stemming ("designing" → "design"), stop words, ranking. In a real system the catalogue is indexed in a search engine and the lending tables live in a relational DB.</p>
<p><b>Why MemberType as an enum with fields?</b> Limits stay next to the type, so adding "ALUMNI(2, 7)" is one line. If limits must change at runtime (admin screen), move them to a <code>MembershipPolicy</code> loaded from config instead.</p>
<p><b>Audit trail.</b> Never overwrite: loans, fine payments and status changes are events. "Who damaged page 40?" is answered by the last loan before the copy was marked UNDER_REPAIR.</p>`,
    aiEra: `<p><b>What AI changes:</b> a library LLD is a classic training-data example, so an assistant will produce the standard class list immediately. The interviewer's real test is whether you <i>question</i> it: Book vs BookItem, where the rules live, what happens to reservations when a copy is returned, how fines are computed across month boundaries.</p>
<p><b>Use AI as a partner:</b> <code>Give me 15 edge-case scenarios for a library checkout/return/renew system (dates, limits, holds, lost books) as Given/When/Then.</code> Then turn them into JUnit tests with a fixed Clock.</p>
<p><b>Where AI goes wrong:</b> one Book class with a copy counter; computing late days with <code>getDayOfMonth()</code> subtraction; mutating state before all checks pass; deleting lost items; putting every rule in one 80-line <code>checkout</code> method.</p>
<p><b>What you must still own:</b> the entity split, the "validate first, mutate last" discipline, and a clean place for each business rule so the next rule is a new class rather than another <code>if</code>.</p>`,
    problems: [{
      title: 'Checkout with Pluggable Lending Rules',
      level: 'Medium', tags: ['library', 'strategy', 'chain of responsibility', 'open-closed'], companies: ['Amazon', 'Microsoft', 'Zoho'],
      statement: `<p>Implement <code>checkout(member, item, today)</code> that returns either a Loan or the <b>first</b> failure reason. The rules (in order): membership active; loans below the member type's limit; unpaid fine ≤ ₹100; item AVAILABLE; and a new rule product just added: <b>reference books cannot be borrowed</b>. Adding a rule must not require editing <code>checkout</code>.</p>`,
      constraints: `≤ 20 rules, each rule O(1)`,
      example: `<p>Member Priya (active, 2/5 loans, fine ₹20), item "Oxford Dictionary" (reference = true, AVAILABLE). Rules run in order: active ✔, limit ✔, fine ✔, available ✔, reference ✖ → ${H.c('r', '"reference books cannot be borrowed"')}. No state changes.</p>`,
      brute: { why: `<p>Naive: one method with a growing if-else ladder. Every new policy (holidays, VIP members, reference books, age-restricted titles) edits the same method, breaks Open/Closed, and makes the rules impossible to unit-test one by one.</p>`, code: `class MonolithCheckout {
    static String checkout(boolean active, int loans, int limit, long fine, String status, boolean reference) {
        if (!active) return "membership inactive";
        else if (loans >= limit) return "limit reached";
        else if (fine > 100_00) return "clear fines first";
        else if (!status.equals("AVAILABLE")) return "copy is " + status;
        else if (reference) return "reference books cannot be borrowed";   // every new rule = edit here
        return "OK";
    }
}` },
      mcq: { q: 'Product adds "members under 18 cannot borrow adult titles". With the rule-list design, what changes?', options: ['Write a new AgeRestrictionRule class and register it', 'Edit checkout() and add an if', 'Change the Member constructor', 'Subclass LibraryService'], answer: 0, explain: 'Rules are objects in a list; adding behaviour = adding a class (Open/Closed).' },
      hints: [`<p>Hint 1: every rule has the same shape: look at (member, item, today) and either allow or give a reason. That is an interface with one method.</p>`, `<p>Hint 2: <code>interface LendingRule { Optional&lt;String&gt; violation(Member m, Item i, LocalDate today); }</code> and a <code>List&lt;LendingRule&gt;</code> checked in order; the first non-empty Optional stops the chain.</p>`, `<p>Hint 3: only after the loop passes do you mutate (status → LOANED, add loan). Order cheap rules first; keep rules stateless so they are trivially testable and thread-safe.</p>`],
      solution: {
        approach: `<p>Chain of rules (a lightweight Chain of Responsibility / Specification pattern). The service owns an ordered list; new rules are registered, not coded into the method.</p>`,
        code: `class RuleBasedLibrary {
    static final class Member { boolean active = true; int loans; int limit = 5; long finePaise; public String toString() { return "member(" + loans + " loans)"; } }
    static final class Item { String status = "AVAILABLE"; boolean reference; String title; Item(String t, boolean ref) { title = t; reference = ref; } public String toString() { return title; } }
    record Loan(Item item, Member member, LocalDate due) {}

    interface LendingRule { Optional<String> violation(Member m, Item i, LocalDate today); }

    static final LendingRule ACTIVE = (m, i, d) -> m.active ? Optional.empty() : Optional.of("membership inactive");
    static final LendingRule LIMIT = (m, i, d) -> m.loans < m.limit ? Optional.empty() : Optional.of("limit of " + m.limit + " reached");
    static final LendingRule FINES = (m, i, d) -> m.finePaise <= 100_00 ? Optional.empty() : Optional.of("clear fines first");
    static final LendingRule AVAILABLE = (m, i, d) -> i.status.equals("AVAILABLE") ? Optional.empty() : Optional.of("copy is " + i.status);
    static final LendingRule NOT_REFERENCE = (m, i, d) -> i.reference ? Optional.of("reference books cannot be borrowed") : Optional.empty();

    private final List<LendingRule> rules = new ArrayList<>(List.of(ACTIVE, LIMIT, FINES, AVAILABLE));
    void register(LendingRule r) { rules.add(r); }

    /** Left = failure reason, or a Loan. Mutates nothing unless every rule passes. */
    Object checkout(Member m, Item i, LocalDate today) {
        for (LendingRule r : rules) {
            Optional<String> v = r.violation(m, i, today);
            if (v.isPresent()) return v.get();
        }
        i.status = "LOANED";
        m.loans++;
        return new Loan(i, m, today.plusDays(14));
    }

    public static void main(String[] args) {
        RuleBasedLibrary lib = new RuleBasedLibrary();
        lib.register(NOT_REFERENCE);                               // new policy, no edits to checkout()
        Member priya = new Member();
        System.out.println(lib.checkout(priya, new Item("Oxford Dictionary", true), LocalDate.of(2026, 10, 1)));
        System.out.println(lib.checkout(priya, new Item("Clean Code", false), LocalDate.of(2026, 10, 1)));
    }
}`,
        complexity: `<p>O(R) per checkout for R rules (each O(1)). Rules are stateless lambdas → thread-safe and unit-testable in isolation.</p>`,
        followUps: ['Return ALL violations instead of the first (for a nicer UI).', 'Load the rule list per member type from config.', 'Make the item-availability check atomic under concurrency.']
      }
    }]
  });

  /* ======================= TOPIC 6: LIBRARY — RULES, FINES, RESERVATIONS, STATES ======================= */
  var LIB_RULES = `// ===== Library lending rules, fine policies, reservations (Observer) and a copy state machine =====
enum CopyState {
    AVAILABLE, LOANED, ON_HOLD, LOST, UNDER_REPAIR;

    private static final Map<CopyState, Set<CopyState>> NEXT = new EnumMap<>(CopyState.class);
    static {
        NEXT.put(AVAILABLE, EnumSet.of(LOANED, ON_HOLD, UNDER_REPAIR, LOST));
        NEXT.put(LOANED, EnumSet.of(AVAILABLE, ON_HOLD, LOST, UNDER_REPAIR));
        NEXT.put(ON_HOLD, EnumSet.of(LOANED, AVAILABLE, ON_HOLD));      // ON_HOLD -> ON_HOLD = pass to next waiter
        NEXT.put(UNDER_REPAIR, EnumSet.of(AVAILABLE, ON_HOLD, LOST));
        NEXT.put(LOST, EnumSet.of(AVAILABLE));                          // found again
    }
    boolean canGo(CopyState to) { return NEXT.get(this).contains(to); }
}

final class Copy {
    final String barcode, isbn;
    final long pricePaise;
    CopyState state = CopyState.AVAILABLE;
    String holdFor;                 // patron id while ON_HOLD
    LocalDate holdUntil;
    Copy(String barcode, String isbn, long pricePaise) { this.barcode = barcode; this.isbn = isbn; this.pricePaise = pricePaise; }
    void moveTo(CopyState to) {
        if (!state.canGo(to)) throw new IllegalStateException(barcode + ": " + state + " -> " + to + " is not allowed");
        state = to;
    }
}

final class Patron {
    final String id;
    final boolean faculty;
    boolean active = true;
    int loans;
    long finePaise;
    Patron(String id, boolean faculty) { this.id = id; this.faculty = faculty; }
    int limit() { return faculty ? 10 : 5; }
}

// ---------- Fines: Strategy (+ a Decorator for discounts) ----------
interface FinePolicy { long fine(long daysLate, Copy copy, Patron p); }

final class FlatFine implements FinePolicy {
    private final long perDay;
    FlatFine(long perDay) { this.perDay = perDay; }
    public long fine(long d, Copy c, Patron p) { return d * perDay; }
}

/** First 7 late days Rs 2/day, then Rs 5/day, never more than the book's price. */
final class TieredCappedFine implements FinePolicy {
    public long fine(long d, Copy c, Patron p) {
        long f = Math.min(d, 7) * 2_00 + Math.max(0, d - 7) * 5_00;
        return Math.min(f, c.pricePaise);
    }
}

final class FacultyHalfPrice implements FinePolicy {      // decorator: wraps any other policy
    private final FinePolicy inner;
    FacultyHalfPrice(FinePolicy inner) { this.inner = inner; }
    public long fine(long d, Copy c, Patron p) { long f = inner.fine(d, c, p); return p.faculty ? f / 2 : f; }
}

// ---------- Lending rules: each one a tiny class ----------
interface LendingRule { Optional<String> violation(Patron p, Copy c, LocalDate today); }

final class Rules {
    private Rules() {}
    static final LendingRule ACTIVE = (p, c, d) -> p.active ? Optional.empty() : Optional.of("membership inactive");
    static final LendingRule LIMIT = (p, c, d) -> p.loans < p.limit() ? Optional.empty() : Optional.of("limit " + p.limit() + " reached");
    static final LendingRule FINES = (p, c, d) -> p.finePaise <= 100_00 ? Optional.empty() : Optional.of("clear fines above Rs 100 first");
    static final LendingRule COPY_FREE = (p, c, d) -> {
        if (c.state == CopyState.AVAILABLE) return Optional.empty();
        boolean myHold = c.state == CopyState.ON_HOLD && p.id.equals(c.holdFor) && !d.isAfter(c.holdUntil);
        return myHold ? Optional.empty() : Optional.of("copy is " + c.state);
    };
}

// ---------- Reservations: FIFO queue per title + Observer notifications ----------
interface HoldListener { void onHoldPlaced(String patronId, Copy copy, LocalDate pickupBy); }

final class ReservationDesk {
    static final int PICKUP_DAYS = 3;
    private final Map<String, Deque<String>> waitlist = new HashMap<>();   // isbn -> patron ids
    private final List<HoldListener> listeners = new ArrayList<>();

    void subscribe(HoldListener l) { listeners.add(l); }

    boolean reserve(String isbn, String patronId) {
        Deque<String> q = waitlist.computeIfAbsent(isbn, k -> new ArrayDeque<>());
        if (q.contains(patronId)) return false;                         // no duplicate reservations
        q.addLast(patronId);
        return true;
    }

    boolean hasWaiters(String isbn) { return !waitlist.getOrDefault(isbn, new ArrayDeque<>()).isEmpty(); }

    /** A copy just became free: returned, repaired, or its previous hold expired. */
    void copyFreed(Copy c, LocalDate today) {
        Deque<String> q = waitlist.get(c.isbn);
        String next = q == null ? null : q.pollFirst();
        if (next == null) {
            c.moveTo(CopyState.AVAILABLE);
            c.holdFor = null; c.holdUntil = null;
            return;
        }
        c.moveTo(CopyState.ON_HOLD);
        c.holdFor = next;
        c.holdUntil = today.plusDays(PICKUP_DAYS);
        for (HoldListener l : listeners) l.onHoldPlaced(next, c, c.holdUntil);
    }

    /** Run once a day (or lazily on access): pass expired holds to the next person. */
    void expireHolds(Collection<Copy> copies, LocalDate today) {
        for (Copy c : copies)
            if (c.state == CopyState.ON_HOLD && today.isAfter(c.holdUntil)) copyFreed(c, today);
    }
}

// ---------- The desk that ties it all together ----------
final class LendingDesk {
    private final List<LendingRule> rules = new ArrayList<>(List.of(Rules.ACTIVE, Rules.LIMIT, Rules.FINES, Rules.COPY_FREE));
    private final FinePolicy finePolicy;
    private final ReservationDesk reservations;
    private final Map<String, LocalDate> dueDates = new HashMap<>();     // barcode -> due date

    LendingDesk(FinePolicy finePolicy, ReservationDesk reservations) { this.finePolicy = finePolicy; this.reservations = reservations; }

    synchronized String checkout(Patron p, Copy c, LocalDate today) {
        for (LendingRule r : rules) {
            Optional<String> v = r.violation(p, c, today);
            if (v.isPresent()) return "REFUSED: " + v.get();
        }
        c.moveTo(CopyState.LOANED);
        c.holdFor = null; c.holdUntil = null;
        p.loans++;
        LocalDate due = today.plusDays(p.faculty ? 30 : 14);
        dueDates.put(c.barcode, due);
        return "OK, due " + due;
    }

    synchronized long giveBack(Patron p, Copy c, LocalDate today) {
        LocalDate due = dueDates.remove(c.barcode);
        long late = Math.max(0, today.toEpochDay() - due.toEpochDay());
        long fine = finePolicy.fine(late, c, p);
        p.finePaise += fine;
        p.loans--;
        reservations.copyFreed(c, today);          // AVAILABLE, or ON_HOLD for the first waiter
        return fine;
    }

    synchronized boolean renew(Patron p, Copy c, LocalDate today) {
        LocalDate due = dueDates.get(c.barcode);
        if (due == null || today.isAfter(due) || reservations.hasWaiters(c.isbn)) return false;
        dueDates.put(c.barcode, due.plusDays(p.faculty ? 30 : 14));
        return true;
    }
}

public class LibraryRulesDemo {
    public static void main(String[] args) {
        ReservationDesk res = new ReservationDesk();
        res.subscribe((who, copy, by) -> System.out.println("SMS to " + who + ": " + copy.barcode + " is held for you until " + by));
        LendingDesk desk = new LendingDesk(new FacultyHalfPrice(new TieredCappedFine()), res);

        Copy ddia = new Copy("BC-9", "978-1449373320", 300_00);
        Patron priya = new Patron("priya", false), ravi = new Patron("ravi", false), meena = new Patron("meena", true);
        LocalDate d0 = LocalDate.of(2026, 10, 1);

        System.out.println(desk.checkout(priya, ddia, d0));                  // OK, due 2026-10-15
        res.reserve(ddia.isbn, "ravi");
        res.reserve(ddia.isbn, "meena");
        System.out.println("renew? " + desk.renew(priya, ddia, d0.plusDays(10)));   // false: people are waiting
        long fine = desk.giveBack(priya, ddia, d0.plusDays(23));             // 9 days late -> 7*200 + 2*500 = 2400
        System.out.println("fine paise = " + fine + ", state = " + ddia.state);     // ON_HOLD for ravi
        System.out.println(desk.checkout(meena, ddia, d0.plusDays(24)));     // REFUSED: held for ravi
        res.expireHolds(List.of(ddia), d0.plusDays(27));                     // ravi never came -> meena
        System.out.println(desk.checkout(meena, ddia, d0.plusDays(28)));     // OK
    }
}`;

  topics.push({
    title: 'Library Management II: Lending Rules, Fines, Reservations & Copy States',
    analogy: `<p>Think of the <b>pickup counter at a bakery</b> that bakes fresh bread a few times a day. People who pre-ordered are on a list; when a loaf comes out, the baker keeps it aside with the <b>first name on the list</b> and calls them. If they do not come within an hour, the loaf goes to the <b>next name</b>. If nobody is waiting, it goes on the open shelf for anyone. And if you are late collecting a loan from the bank, there is a late fee — small at first, bigger later, but never more than the loan itself. A library's reservation shelf and fine rules work exactly like this.</p>`,
    explain: `<p>Topic 5 built the skeleton. Now we make the <b>business rules</b> clean and extensible — this is where interviewers separate "it works" from "it is well designed".</p>
<h4>1. Lending rules as objects</h4>
<p><code>interface LendingRule { Optional&lt;String&gt; violation(Patron p, Copy c, LocalDate today); }</code>. Each rule is a tiny class (or lambda): ActiveMember, LoanLimit, FineThreshold, CopyFreeForPatron, NotReferenceBook, AgeRestriction… The desk loops over an ordered list and stops at the first violation. New policy = new class (Open/Closed). This is a light <b>Chain of Responsibility</b> / <b>Specification</b> pattern.</p>
<h4>2. Fines as a Strategy (with a Decorator)</h4>
${H.table(['Policy', 'Rule', '9 days late, book ₹300'], [['FlatFine(₹10)', '₹10 × days', '₹90'], ['TieredCappedFine', 'days 1–7: ₹2/day, then ₹5/day, max = book price', '7×2 + 2×5 = <b>₹24</b>'], ['FacultyHalfPrice(Tiered)', 'decorator: halves any inner policy for faculty', '₹12 for faculty, ₹24 for students']])}
<h4>3. Reservations: a FIFO queue per <i>title</i></h4>
<ul>
<li><code>Map&lt;isbn, Deque&lt;patronId&gt;&gt;</code>. Reserve = add to the back (no duplicates).</li>
<li>When <b>any</b> copy of that title is freed (returned or repaired), the first waiter gets it: copy → <b>ON_HOLD</b>(for = Ravi, until = today + 3 days), and Ravi is notified (<b>Observer</b>: SMS/email/push listeners).</li>
<li>Ravi does not come within 3 days → the hold <b>expires</b> → the copy passes to the next waiter (ON_HOLD → ON_HOLD), or becomes AVAILABLE if the queue is empty.</li>
<li>While people are waiting, <b>renewals are refused</b> — otherwise one person could keep a popular book forever.</li>
</ul>
<h4>4. Copy states as an explicit state machine</h4>
${H.table(['From', 'Allowed to'], [['AVAILABLE', 'LOANED, ON_HOLD, UNDER_REPAIR, LOST'], ['LOANED', 'AVAILABLE (no queue), ON_HOLD (queue), LOST, UNDER_REPAIR (returned damaged)'], ['ON_HOLD', 'LOANED (picked up), ON_HOLD (next waiter), AVAILABLE (queue empty)'], ['UNDER_REPAIR', 'AVAILABLE, ON_HOLD, LOST'], ['LOST', 'AVAILABLE (found)']])}
<p>Encoding this table (an <code>EnumMap&lt;State, EnumSet&lt;State&gt;&gt;</code>) makes illegal moves like LOST → LOANED throw immediately instead of silently corrupting data. For richer behaviour per state, upgrade to the full <b>State pattern</b> (covered in the next module).</p>`,
    clues: [
      '"Member can reserve a book that is currently issued" → FIFO waitlist per ISBN + ON_HOLD state',
      '"Notify the member when the book is available" → Observer (HoldListener: SMS, email, push)',
      '"Reserved book must be collected within 3 days" → hold expiry, then pass to the next waiter',
      '"Different fine rules for students and faculty / cap at book price" → FinePolicy strategy + decorator',
      '"Cannot renew if someone else reserved it" → renewal rule consults the reservation desk',
      '"Book can be lost, damaged, under repair" → explicit copy state machine with allowed transitions'
    ],
    code: LIB_RULES,
    codeTitle: 'Rules, fine strategies, reservation queue + Observer, copy state machine (compilable Java)',
    viz: {
      title: 'A returned copy: fine → hold queue → pickup or expiry',
      input: 'late=9; waitlist=Ravi,Meena,Zoya; pickup=no,yes',
      inputLabel: 'late=days late; waitlist=names in order; pickup=yes/no per waiter',
      gen: function (input) {
        var cfg = { late: 9, waitlist: [], pickup: [] };
        String(input || '').split(';').map(function (s) { return s.trim(); }).filter(function (s) { return s; }).forEach(function (kv) {
          var m = /^(late|waitlist|pickup)\s*=\s*(.*)$/i.exec(kv);
          if (!m) throw new Error('Format: late=9; waitlist=Ravi,Meena; pickup=no,yes');
          var k = m[1].toLowerCase(), v = m[2].trim();
          if (k === 'late') { var n = Number(v); if (!isFinite(n) || n < 0 || n > 120 || Math.floor(n) !== n) throw new Error('late must be a whole number 0..120'); cfg.late = n; }
          else if (k === 'waitlist') cfg.waitlist = v ? v.split(',').map(cap).filter(function (x) { return x; }) : [];
          else cfg.pickup = v ? v.split(',').map(function (x) { var t = x.trim().toLowerCase(); if (t !== 'yes' && t !== 'no') throw new Error('pickup values are yes or no'); return t; }) : [];
        });
        if (cfg.waitlist.length > 5) throw new Error('At most 5 people on the waitlist');
        var nodes = [B('AV', 'AVAILABLE', 12, 30), B('LO', 'LOANED', 50, 6), B('OH', 'ON_HOLD', 88, 30), B('UR', 'UNDER_REPAIR', 50, 56), B('LS', 'LOST', 12, 56)];
        var edges = [['AV', 'LO', 'checkout'], ['LO', 'AV', 'return, no queue'], ['LO', 'OH', 'return, queue'], ['OH', 'LO', 'picked up'], ['OH', 'AV', 'expired, queue empty'], ['AV', 'UR', 'damaged'], ['UR', 'AV', 'repaired'], ['LO', 'LS', 'reported lost'], ['LS', 'AV', 'found']];
        var sm = function (cur, edgeKey, cls) { var hl = {}; hl[cur] = 'cur'; var eh = {}; if (edgeKey) eh[edgeKey] = cls || 'ok'; return G('Copy BC-9 state machine', nodes, edges, { h: 62, hl: hl, ehl: eh }); };
        var q = cfg.waitlist.slice();
        var frames = [];
        frames.push(F('Copy BC-9 of <i>Designing Data-Intensive Applications</i> (price ₹300) is <b>LOANED</b> to Priya, due 15 Oct. ' + (q.length ? q.length + ' people reserved the title meanwhile.' : 'Nobody reserved it.'), [sm('LO'), QUEUE('Reservation queue for this ISBN', q.length ? q : ['(empty)'], {}, 'next', 'last')]));
        var perDay = [], total = 0;
        for (var d = 1; d <= Math.min(cfg.late, 30); d++) perDay.push(d <= 7 ? 2 : 5);
        for (var d2 = 1; d2 <= cfg.late; d2++) total += d2 <= 7 ? 2 : 5;
        var capped = Math.min(total, 300);
        var tier1 = Math.min(cfg.late, 7), tier2 = Math.max(0, cfg.late - 7);
        frames.push(F('Priya returns it <b>' + cfg.late + ' day(s) late</b>. The desk asks the <b>FinePolicy</b> (TieredCapped): first 7 days ₹2/day, after that ₹5/day, never above the book price.', [perDay.length ? { type: 'bars', label: 'Fine charged per late day (₹)' + (cfg.late > 30 ? ' — first 30 days shown' : ''), values: perDay, hl: (function () { var h = {}; perDay.forEach(function (v, i) { h[i] = v === 2 ? 'ok' : 'cur'; }); return h; })() } : TXT('Returned on time — no bars to draw.'), TABLE('Fine calculation', ['tier', 'days', 'rate', 'amount'], [['days 1–7', String(tier1), '₹2', '₹' + tier1 * 2], ['day 8+', String(tier2), '₹5', '₹' + tier2 * 5], ['total', '', '', '₹' + total], ['cap (book price)', '', '', '₹300'], ['<b>charged</b>', '', '', '<b>₹' + capped + '</b>']], { 4: 'sel' })]));
        if (!q.length) {
          frames.push(F('Return → the ReservationDesk sees an <b>empty queue</b>, so the copy goes <b>LOANED → AVAILABLE</b> and back on the shelf.', [sm('AV', 'LO-AV'), QUEUE('Reservation queue', ['(empty)'])]));
          frames.push(F('Anyone may now borrow it. Try adding a waitlist in the input (e.g. waitlist=Ravi,Meena; pickup=no,yes) to see holds.', [sm('AV'), TXT('With nobody waiting, renewals would also be allowed.')]));
          return frames;
        }
        var day = 0, who = q.shift();
        frames.push(F('Return → the queue is not empty, so the copy does <b>not</b> go to the open shelf. It moves <b>LOANED → ON_HOLD</b> for <b>' + who + '</b> until day +3, and every HoldListener fires (SMS, email, app push) — the <b>Observer</b> pattern.', [sm('OH', 'LO-OH'), QUEUE('Reservation queue', q.length ? q : ['(empty)'], {}, 'next', 'last'), VARS('Copy BC-9', { state: 'ON_HOLD', holdFor: who, holdUntil: 'day +3' }, { holdFor: 'cur' }), TXT('📱 "Hi ' + who + ', your reserved book is waiting at the desk until day +3."', 'Notification sent')]));
        var i = 0, picked = false;
        while (true) {
          var answer = cfg.pickup[i] || 'yes';
          if (answer === 'yes') {
            frames.push(F('<b>' + who + '</b> comes to the desk on day +' + (day + 1) + '. Rule <code>COPY_FREE</code> passes because the copy is ON_HOLD <b>for this patron</b> and the hold is still valid. ON_HOLD → <b>LOANED</b>.', [sm('LO', 'OH-LO'), QUEUE('Reservation queue', q.length ? q : ['(empty)']), VARS('Copy BC-9', { state: 'LOANED', borrower: who, holdFor: '-' }, { state: 'ok' })]));
            picked = true;
            break;
          }
          day += 4;
          var nxt = q.shift();
          if (nxt) {
            frames.push(F('<b>' + who + '</b> never comes. On day +' + day + ' the daily job (or the next access, lazily) sees <code>today &gt; holdUntil</code> → the hold expires and passes to <b>' + nxt + '</b>: ON_HOLD → ON_HOLD with a fresh 3-day window and a new notification.', [sm('OH'), QUEUE('Reservation queue', q.length ? q : ['(empty)'], {}, 'next', 'last'), VARS('Copy BC-9', { state: 'ON_HOLD', holdFor: nxt, expired: who }, { holdFor: 'cur', expired: 'bad' })]));
            who = nxt;
            i++;
          } else {
            frames.push(F('<b>' + who + '</b> never comes, and the queue is now <b>empty</b>. The hold expires: ON_HOLD → <b>AVAILABLE</b>. The book goes back to the open shelf.', [sm('AV', 'OH-AV'), QUEUE('Reservation queue', ['(empty)']), VARS('Copy BC-9', { state: 'AVAILABLE', holdFor: '-' }, { state: 'ok' })]));
            break;
          }
        }
        frames.push(F(picked ? 'Done. Notice what we never did: hand the copy to whoever walked in first, or let it sit on the hold shelf forever. Queue + expiry + notifications make it fair and keep books moving.' : 'Done. Every waiter got a fair chance; an unclaimed book never stays stuck on the hold shelf.', [TXT(H.table(['Concern', 'Pattern / class'], [['Is the patron allowed?', 'LendingRule list'], ['How much is the fine?', 'FinePolicy strategy (+ decorator)'], ['Who gets the copy next?', 'ReservationDesk FIFO queue'], ['Tell the patron', 'HoldListener observers'], ['Which moves are legal?', 'CopyState transition table']]), 'Who owns what')]));
        return frames;
      }
    },
    examples: [
      { title: 'Tiered fine with a cap, worked out', html: `<p>Book price ₹300. Late 9 days: 7×₹2 + 2×₹5 = <b>₹24</b>. Late 70 days: 7×2 + 63×5 = 14 + 315 = ₹329 → capped at ${H.c('g', '₹300')} (we would rather the member just buy a replacement). Faculty with the <code>FacultyHalfPrice</code> decorator: ₹12 and ₹150.</p>${H.table(['Days late', 'Raw', 'Charged (student)', 'Charged (faculty)'], [['0', '₹0', '₹0', '₹0'], ['5', '₹10', '₹10', '₹5'], ['9', '₹24', '₹24', '₹12'], ['70', '₹329', '₹300', '₹150']])}` },
      { title: 'Renewal refused because of a reservation', html: `<p>Priya's loan is due 15 Oct; Ravi reserved the title on 5 Oct. On 10 Oct Priya tries to renew → <code>reservations.hasWaiters(isbn)</code> is true → ${H.c('r', 'refused')}. Without this rule, a popular title could be renewed forever and the queue would never move.</p>` },
      { title: 'Illegal transition caught by the state machine', html: `<p>A buggy admin script tries to check out a LOST copy. <code>copy.moveTo(LOANED)</code> looks up <code>NEXT.get(LOST) = {AVAILABLE}</code> → throws <code>IllegalStateException("BC-4: LOST -> LOANED is not allowed")</code>. The bug is caught at the exact line, instead of a phantom loan appearing in reports months later.</p>`, code: `class TransitionCheck {
    enum S { AVAILABLE, LOANED, LOST }
    static final Map<S, Set<S>> NEXT = new EnumMap<>(Map.of(
        S.AVAILABLE, EnumSet.of(S.LOANED, S.LOST),
        S.LOANED, EnumSet.of(S.AVAILABLE, S.LOST),
        S.LOST, EnumSet.of(S.AVAILABLE)));

    static S move(S from, S to) {
        if (!NEXT.get(from).contains(to)) throw new IllegalStateException(from + " -> " + to + " is not allowed");
        return to;
    }
    public static void main(String[] args) {
        System.out.println(move(S.AVAILABLE, S.LOANED));
        try { move(S.LOST, S.LOANED); } catch (IllegalStateException e) { System.out.println(e.getMessage()); }
    }
}` },
      { title: 'Observer: adding WhatsApp without touching the desk', html: `<p>The ReservationDesk only knows <code>List&lt;HoldListener&gt;</code>. SMS and email listeners exist today. Product wants WhatsApp → write <code>WhatsAppHoldListener implements HoldListener</code> and <code>subscribe()</code> it at startup. The desk, the rules and the fine logic are untouched. In production, the listener usually just publishes an event to a queue so a slow SMS provider never blocks the desk.</p>` }
    ],
    deepDive: `<p><b>Holds are per copy, reservations are per title.</b> A reservation says "I want <i>any</i> copy of ISBN X". When a specific copy frees up, it becomes ON_HOLD for the head of the queue. If two copies come back at once, the first two waiters each get one. Reserving a specific copy is almost never what users want.</p>
<p><b>Lazy vs scheduled expiry</b> (same idea as seat holds in BookMyShow): checking <code>today &gt; holdUntil</code> whenever the copy is touched keeps correctness; a nightly job moves expired holds forward and sends the next notification. Both should call the same <code>copyFreed()</code> so there is exactly one code path for "who gets it next".</p>
<p><b>Fairness edge cases:</b> a member with fines above the threshold reaches the head of the queue — skip them (and notify) or hold anyway and refuse at checkout? A member cancels a reservation while a copy is on hold for them → immediately pass it on. A member already at their loan limit → still allowed to reserve, but must return something before pickup. Decide and state the rules explicitly.</p>
<p><b>State pattern vs transition table.</b> A table is enough when states differ only in which moves are legal. When behaviour differs per state (e.g. <code>onReturn()</code> does different things in LOANED vs UNDER_REPAIR), give each state its own class implementing a <code>CopyStateBehaviour</code> interface. Both are valid; the table is shorter for interviews.</p>
<p><b>Money and history.</b> Fines are <b>ledger entries</b> (charged, waived, paid), not a single mutable number; <code>finePaise</code> on Patron is a cached balance of that ledger. Waivers need an audit trail (who waived, why).</p>
<p><b>Concurrency.</b> Return and checkout of the same copy can race at two desks; the desk methods are <code>synchronized</code> here. With a database, the copy row's status update is the atomic step (<code>UPDATE ... WHERE status = 'ON_HOLD' AND hold_for = ?</code>).</p>`,
    aiEra: `<p><b>What AI changes:</b> an assistant will happily generate a fine calculator or a reservation queue. What it rarely does unprompted is connect the pieces: renewals consulting reservations, holds expiring and moving on, illegal transitions being rejected, fines capped at the book price. Your value is the <b>system of rules</b>, not one rule.</p>
<p><b>Use AI as a partner:</b> <code>Here is my CopyState transition table. Generate a test that tries EVERY (from, to) pair and asserts exactly the allowed ones succeed.</code> And: <code>List policies a real university library has that my LendingRule list does not cover.</code></p>
<p><b>Where AI goes wrong:</b> notifying listeners synchronously inside a lock (a slow SMS API freezes checkouts); recursion when a hold expires and the next waiter is also expired; reserving a specific copy instead of a title; using <code>Period.between(...).getDays()</code> for late days (ignores months).</p>
<p><b>What you must still own:</b> the exact rule set agreed with the "product owner" (the interviewer), and a design where each new rule is a new class.</p>`,
    problems: [{
      title: 'Reservation Queue with a Pickup Window',
      level: 'Medium', tags: ['library', 'queue', 'observer', 'expiry'], companies: ['Amazon', 'Oracle', 'Infosys'],
      statement: `<p>Implement <code>HoldShelf</code> for one title with several copies: <code>reserve(patron, day)</code>, <code>copyReturned(copyId, day)</code>, <code>tick(day)</code> (expire holds older than 3 days and pass them on), <code>pickUp(patron, copyId, day)</code> (true only if that copy is on hold for that patron and not expired). Return the list of notifications sent ("copyId held for patron until day X"). FIFO fairness; no duplicate reservations.</p>`,
      constraints: `≤ 10<sup>4</sup> reservations, ≤ 100 copies, days are integers`,
      example: `<p>reserve(Ravi,1), reserve(Meena,2). copyReturned(C1, 5) → ${H.c('y', 'C1 held for Ravi until 8')}. tick(9): Ravi's hold expired → ${H.c('y', 'C1 held for Meena until 12')}. pickUp(Meena, C1, 10) → ${H.c('g', 'true')}. pickUp(Ravi, C1, 10) → ${H.c('r', 'false')}.</p>`,
      brute: { why: `<p>Naive: no queue — a returned copy goes straight to the open shelf and whoever walks in first gets it (unfair to people who reserved weeks ago). The other naive version holds forever with no expiry, so a single no-show blocks the book indefinitely.</p>`, code: `class NaiveShelf {
    private final Set<String> onShelf = new HashSet<>();
    void copyReturned(String copyId) { onShelf.add(copyId); }        // reservations ignored
    boolean pickUp(String anyone, String copyId) { return onShelf.remove(copyId); }   // first come wins
}` },
      mcq: { q: 'Ravi\'s hold expired and Meena is next in the queue. What state change happens to the copy?', options: ['ON_HOLD (Ravi) → ON_HOLD (Meena) with a new pickup deadline', 'ON_HOLD → AVAILABLE', 'ON_HOLD → LOANED to Meena', 'Nothing until Ravi cancels'], answer: 0, explain: 'The copy stays on the hold shelf but is re-assigned to the next waiter, who gets a fresh window and a notification.' },
      hints: [`<p>Hint 1: two structures — a FIFO <code>Deque&lt;String&gt;</code> of waiting patrons, and a map <code>copyId → (patron, until)</code> of active holds.</p>`, `<p>Hint 2: write ONE method <code>assign(copyId, day)</code>: pop the next waiter; if none, the copy goes to the open shelf; else record the hold and add a notification. Both <code>copyReturned</code> and expiry in <code>tick</code> call it.</p>`, `<p>Hint 3: in <code>tick</code>, collect expired copy ids first, then reassign (do not modify the map while iterating it). Reject duplicate reservations with a Set mirror of the queue.</p>`],
      solution: {
        approach: `<p>FIFO queue + hold map + one shared "assign next" path used by both returns and expiries. Notifications are collected (an Observer would publish them).</p>`,
        code: `class HoldShelf {
    static final int WINDOW = 3;
    private final Deque<String> queue = new ArrayDeque<>();
    private final Set<String> queued = new HashSet<>();
    private final Map<String, String> holdFor = new TreeMap<>();      // copyId -> patron
    private final Map<String, Integer> holdUntil = new HashMap<>();
    private final Set<String> openShelf = new TreeSet<>();
    final List<String> notifications = new ArrayList<>();

    boolean reserve(String patron) {
        if (!queued.add(patron)) return false;
        queue.addLast(patron);
        return true;
    }

    private void assign(String copyId, int day) {
        String next = queue.pollFirst();
        if (next == null) { openShelf.add(copyId); return; }
        queued.remove(next);
        holdFor.put(copyId, next);
        holdUntil.put(copyId, day + WINDOW);
        notifications.add(copyId + " held for " + next + " until " + (day + WINDOW));
    }

    void copyReturned(String copyId, int day) { assign(copyId, day); }

    void tick(int day) {
        List<String> expired = new ArrayList<>();
        for (String c : holdFor.keySet()) if (day > holdUntil.get(c)) expired.add(c);
        for (String c : expired) { holdFor.remove(c); holdUntil.remove(c); assign(c, day); }
    }

    boolean pickUp(String patron, String copyId, int day) {
        if (!patron.equals(holdFor.get(copyId)) || day > holdUntil.get(copyId)) return false;
        holdFor.remove(copyId);
        holdUntil.remove(copyId);
        return true;
    }

    public static void main(String[] args) {
        HoldShelf s = new HoldShelf();
        s.reserve("ravi");
        s.reserve("meena");
        s.copyReturned("C1", 5);
        s.tick(9);
        System.out.println(s.pickUp("meena", "C1", 10) + " " + s.pickUp("ravi", "C1", 10));
        s.notifications.forEach(System.out::println);
    }
}`,
        complexity: `<p>reserve / pickUp O(1); copyReturned O(1); tick O(H) for H active holds (or O(log H) per expiry with a min-heap by deadline).</p>`,
        followUps: ['Use a PriorityQueue by deadline so tick only touches expired holds.', 'Skip waiters who are blocked by fines and notify them.', 'Support cancel(patron) in O(1) (lazy deletion with the Set).']
      }
    }]
  });
  registerModule({ id: 'lld08', title: 'Case Studies: BookMyShow, Splitwise, Library Management', intro: '<p>tmp</p>', goals: [], prereqs: 'tmp', hours: 14, topics: topics, practice: practice, quiz: quiz, interview: interview });
})();
