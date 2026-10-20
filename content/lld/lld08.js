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

        PaymentGateway gateway = new PaymentGateway() {
            public boolean charge(String userId, long amountPaise, String key) { return !userId.equals("u2"); }   // Ben's card is declined
            public void refund(String key) { System.out.println("refund " + key); }
        };
        BookingService service = new BookingService(new CoarseLockProvider(Clock.systemUTC(), Duration.ofMinutes(10)), gateway);
        Booking b = service.start(new User("u1", "Asha"), evening, List.of("C3", "C4"));
        System.out.println(b.id + " amount (paise) = " + b.amountPaise);   // 2 premium seats on a Saturday
        try {
            service.start(new User("u2", "Ben"), evening, List.of("C2", "C4"));   // C4 is held by Asha
        } catch (IllegalStateException e) {
            System.out.println("Rejected: " + e.getMessage());
        }
        System.out.println(service.pay(b.id).status + ", free seats left = " + evening.available().size());
        Booking declined = service.start(new User("u2", "Ben"), evening, List.of("C1", "C2"));
        System.out.println(service.pay(declined.id).status + ", free seats left = " + evening.available().size());   // seats went back
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
    code: [{ lang: 'java', code: BMS_MODEL, alt: [
      { lang: 'python', code: `import itertools
import threading
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from enum import Enum

# Money is ALWAYS in paise (int). 1 rupee = 100 paise. Never use float for money.
IST = timezone(timedelta(hours=5, minutes=30))   # India has no daylight saving, so a fixed offset is exact


class SeatType(Enum):
    REGULAR = "REGULAR"
    PREMIUM = "PREMIUM"
    RECLINER = "RECLINER"


class SeatStatus(Enum):
    AVAILABLE = "AVAILABLE"
    HELD = "HELD"
    BOOKED = "BOOKED"


class BookingStatus(Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    CANCELLED = "CANCELLED"
    EXPIRED = "EXPIRED"


# ---------- Catalogue: things that almost never change ----------
@dataclass(frozen=True)
class Movie:
    id: str
    title: str
    duration_mins: int
    language: str


@dataclass(frozen=True)
class Seat:                      # a PHYSICAL chair. It exists exactly once, no matter how many shows run.
    id: str                      # "B4"
    row: int
    col: int
    type: SeatType


@dataclass(frozen=True)
class Screen:                    # an auditorium: Screen COMPOSES its seats
    id: str
    name: str
    seats: tuple[Seat, ...]


@dataclass
class Theatre:                   # a building in a city: Theatre COMPOSES its screens
    id: str
    name: str
    city: str
    screens: list[Screen] = field(default_factory=list)

    def add_screen(self, s: Screen) -> None:
        self.screens.append(s)


# ---------- Inventory: changes every second ----------
@dataclass
class ShowSeat:                  # a chair IN ONE SHOW. This is the thing we actually sell.
    seat: Seat
    price_paise: int
    status: SeatStatus = SeatStatus.AVAILABLE
    held_by: str | None = None             # user id while HELD or BOOKED
    hold_expires_at: datetime | None = None   # only meaningful while HELD


# Pricing is a Strategy: weekend surge, recliner premium, festival pricing... all pluggable.
class PricingStrategy(ABC):
    @abstractmethod
    def price(self, seat: Seat, show_start: datetime) -> int: ...


class TieredPricing(PricingStrategy):
    _BASE = {SeatType.REGULAR: 200_00, SeatType.PREMIUM: 350_00, SeatType.RECLINER: 600_00}

    def price(self, seat: Seat, show_start: datetime) -> int:
        base = self._BASE[seat.type]
        weekend = show_start.astimezone(IST).weekday() >= 5      # Saturday = 5, Sunday = 6
        return base * 120 // 100 if weekend else base            # +20% on weekends


class Show:                      # A Show = (Movie, Screen, start time). It OWNS one ShowSeat per physical Seat.
    def __init__(self, id: str, movie: Movie, screen: Screen, start: datetime, pricing: PricingStrategy) -> None:
        self.id, self.movie, self.screen, self.start = id, movie, screen, start
        self.seats = {s.id: ShowSeat(s, pricing.price(s, start)) for s in screen.seats}

    @property
    def end(self) -> datetime:
        return self.start + timedelta(minutes=self.movie.duration_mins)

    def available(self) -> list[ShowSeat]:
        return [x for x in self.seats.values() if x.status is SeatStatus.AVAILABLE]


@dataclass(frozen=True)
class User:
    id: str
    name: str


@dataclass
class Booking:
    id: str
    user: User
    show: Show
    seats: list[ShowSeat]
    amount_paise: int
    status: BookingStatus = BookingStatus.PENDING


# ---------- Search: city -> shows, with an overlap guard per screen ----------
class ShowCatalog:
    def __init__(self) -> None:
        self._shows_by_city: dict[str, list[Show]] = {}
        self._theatre_of_screen: dict[str, Theatre] = {}

    def add_theatre(self, t: Theatre) -> None:
        for s in t.screens:
            self._theatre_of_screen[s.id] = t

    def add_show(self, show: Show) -> None:
        t = self._theatre_of_screen.get(show.screen.id)
        if t is None:
            raise ValueError(f"unknown screen {show.screen.id}")
        for other in self._shows_by_city.get(t.city, []):
            same_screen = other.screen is show.screen
            overlap = other.start < show.end and show.start < other.end
            if same_screen and overlap:
                raise RuntimeError(f"overlaps show {other.id}")
        self._shows_by_city.setdefault(t.city, []).append(show)

    def movies_in(self, city: str) -> list[Movie]:
        return list(dict.fromkeys(s.movie for s in self._shows_by_city.get(city, [])))

    def shows_of(self, city: str, movie_id: str) -> list[Show]:
        return sorted((s for s in self._shows_by_city.get(city, []) if s.movie.id == movie_id), key=lambda s: s.start)


# ---------- Booking flow: depends on ABSTRACTIONS (Dependency Inversion) ----------
class SeatLockProvider(ABC):      # in-memory today, Redis / DB tomorrow
    @abstractmethod
    def hold(self, show: Show, seats: list[ShowSeat], user: User) -> bool:
        """All-or-nothing."""

    @abstractmethod
    def confirm(self, show: Show, seats: list[ShowSeat], user: User) -> bool:
        """HELD -> BOOKED if the hold is still valid."""

    @abstractmethod
    def release(self, show: Show, seats: list[ShowSeat], user: User) -> None:
        """HELD -> AVAILABLE."""


class PaymentGateway(ABC):
    @abstractmethod
    def charge(self, user_id: str, amount_paise: int, idempotency_key: str) -> bool: ...

    @abstractmethod
    def refund(self, idempotency_key: str) -> None: ...


class Clock(ABC):
    @abstractmethod
    def now(self) -> datetime: ...


class SystemClock(Clock):
    def now(self) -> datetime:
        return datetime.now(timezone.utc)


# Simple, correct, coarse: ONE lock for everything. The next topic makes it per-show.
class CoarseLockProvider(SeatLockProvider):
    def __init__(self, clock: Clock, ttl: timedelta) -> None:
        self._clock, self._ttl = clock, ttl
        self._lock = threading.Lock()

    @staticmethod
    def _free_for(s: ShowSeat, u: User, now: datetime) -> bool:
        if s.status is SeatStatus.AVAILABLE:
            return True
        if s.status is SeatStatus.BOOKED:
            return False
        assert s.hold_expires_at is not None
        return now > s.hold_expires_at or u.id == s.held_by      # expired hold or my own hold

    def hold(self, show: Show, seats: list[ShowSeat], user: User) -> bool:
        with self._lock:
            now = self._clock.now()
            if not all(self._free_for(s, user, now) for s in seats):      # phase 1: check ALL
                return False
            for s in seats:                                                # phase 2: take ALL
                s.status, s.held_by, s.hold_expires_at = SeatStatus.HELD, user.id, now + self._ttl
            return True

    def confirm(self, show: Show, seats: list[ShowSeat], user: User) -> bool:
        with self._lock:
            now = self._clock.now()
            for s in seats:
                if s.status is not SeatStatus.HELD or s.held_by != user.id or (s.hold_expires_at and now > s.hold_expires_at):
                    return False
            for s in seats:
                s.status, s.hold_expires_at = SeatStatus.BOOKED, None
            return True

    def release(self, show: Show, seats: list[ShowSeat], user: User) -> None:
        with self._lock:
            for s in seats:
                if s.status is SeatStatus.HELD and s.held_by == user.id:
                    s.status, s.held_by = SeatStatus.AVAILABLE, None


class BookingService:
    def __init__(self, locks: SeatLockProvider, payments: PaymentGateway) -> None:
        self._locks, self._payments = locks, payments
        self._bookings: dict[str, Booking] = {}
        self._ids = itertools.count(1)

    def start(self, u: User, show: Show, seat_ids: list[str]) -> Booking:
        """Step 1: user picks seats -> we HOLD them and create a PENDING booking."""
        chosen = []
        for seat_id in seat_ids:
            seat = show.seats.get(seat_id)
            if seat is None:
                raise ValueError(f"no seat {seat_id}")
            chosen.append(seat)
        if not self._locks.hold(show, chosen, u):
            raise RuntimeError("some seats were just taken, pick again")
        amount = sum(s.price_paise for s in chosen)
        b = Booking(f"BK{next(self._ids)}", u, show, chosen, amount)
        self._bookings[b.id] = b
        return b

    def pay(self, booking_id: str) -> Booking:
        """Step 2: payment -> confirm. The booking id doubles as the payment idempotency key."""
        b = self._bookings.get(booking_id)
        if b is None:
            raise ValueError(f"no booking {booking_id}")
        if b.status is not BookingStatus.PENDING:
            return b                                                   # retry-safe
        if not self._payments.charge(b.user.id, b.amount_paise, b.id):
            self._locks.release(b.show, b.seats, b.user)
            b.status = BookingStatus.CANCELLED
            return b
        if not self._locks.confirm(b.show, b.seats, b.user):           # hold expired during payment
            self._payments.refund(b.id)
            b.status = BookingStatus.EXPIRED
            return b
        b.status = BookingStatus.CONFIRMED
        return b


class DemoGateway(PaymentGateway):
    def charge(self, user_id: str, amount_paise: int, idempotency_key: str) -> bool:
        return user_id != "u2"                                         # Ben's card is declined

    def refund(self, idempotency_key: str) -> None:
        print("refund", idempotency_key)


def main() -> None:
    seats = [Seat(f"{chr(ord('A') + r)}{c}", r, c, SeatType.PREMIUM if r == 2 else SeatType.REGULAR)
             for r in range(3) for c in range(1, 5)]
    audi1 = Screen("SCR1", "Audi 1", tuple(seats))
    pvr = Theatre("T1", "PVR Forum", "Bengaluru")
    pvr.add_screen(audi1)

    catalog = ShowCatalog()
    catalog.add_theatre(pvr)
    movie = Movie("M1", "Interstellar", 169, "English")
    sat_6pm = datetime(2026, 10, 17, 18, 0, tzinfo=IST)
    evening = Show("SH1", movie, audi1, sat_6pm, TieredPricing())
    catalog.add_show(evening)
    try:
        catalog.add_show(Show("SH2", movie, audi1, sat_6pm + timedelta(hours=1), TieredPricing()))
    except RuntimeError as e:
        print("Rejected:", e)                      # same screen, overlapping time

    service = BookingService(CoarseLockProvider(SystemClock(), timedelta(minutes=10)), DemoGateway())
    b = service.start(User("u1", "Asha"), evening, ["C3", "C4"])
    print(f"{b.id} amount (paise) = {b.amount_paise}")      # 2 premium seats on a Saturday
    try:
        service.start(User("u2", "Ben"), evening, ["C2", "C4"])        # C4 is held by Asha
    except RuntimeError as e:
        print("Rejected:", e)
    print(f"{service.pay(b.id).status.value}, free seats left = {len(evening.available())}")
    declined = service.start(User("u2", "Ben"), evening, ["C1", "C2"])
    print(f"{service.pay(declined.id).status.value}, free seats left = {len(evening.available())}")


if __name__ == "__main__":
    main()` },
      { lang: 'ts', code: `// Money is ALWAYS in paise (integers). 1 rupee = 100 paise. Never use fractions for money.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // India has no daylight saving, so a fixed offset is exact
const MINUTE_MS = 60_000;

type SeatType = "REGULAR" | "PREMIUM" | "RECLINER";
type SeatStatus = "AVAILABLE" | "HELD" | "BOOKED";
type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "EXPIRED";

// ---------- Catalogue: things that almost never change ----------
interface Movie { readonly id: string; readonly title: string; readonly durationMins: number; readonly language: string }

// A PHYSICAL chair. It exists exactly once, no matter how many shows run.
interface Seat { readonly id: string; readonly row: number; readonly col: number; readonly type: SeatType }

// An auditorium: Screen COMPOSES its seats.
interface Screen { readonly id: string; readonly name: string; readonly seats: readonly Seat[] }

// A building in a city: Theatre COMPOSES its screens.
class Theatre {
  readonly screens: Screen[] = [];
  constructor(readonly id: string, readonly name: string, readonly city: string) {}
  addScreen(s: Screen): void { this.screens.push(s); }
}

// ---------- Inventory: changes every second ----------
// A chair IN ONE SHOW. This is the thing we actually sell.
class ShowSeat {
  status: SeatStatus = "AVAILABLE";
  heldBy: string | null = null; // user id while HELD or BOOKED
  holdExpiresAt = 0; // epoch ms, only meaningful while HELD
  constructor(readonly seat: Seat, readonly pricePaise: number) {}
}

// Pricing is a Strategy: weekend surge, recliner premium, festival pricing... all pluggable.
interface PricingStrategy {
  price(seat: Seat, showStart: number): number;
}

class TieredPricing implements PricingStrategy {
  private static readonly BASE: Record<SeatType, number> = { REGULAR: 200_00, PREMIUM: 350_00, RECLINER: 600_00 };

  price(seat: Seat, showStart: number): number {
    const base = TieredPricing.BASE[seat.type];
    const day = new Date(showStart + IST_OFFSET_MS).getUTCDay(); // 0 = Sunday ... 6 = Saturday
    const weekend = day === 0 || day === 6;
    return weekend ? Math.floor((base * 120) / 100) : base; // +20% on weekends
  }
}

// A Show = (Movie, Screen, start time). It OWNS one ShowSeat per physical Seat.
class Show {
  readonly seats = new Map<string, ShowSeat>();
  constructor(readonly id: string, readonly movie: Movie, readonly screen: Screen, readonly start: number, pricing: PricingStrategy) {
    for (const s of screen.seats) this.seats.set(s.id, new ShowSeat(s, pricing.price(s, start)));
  }
  get end(): number { return this.start + this.movie.durationMins * MINUTE_MS; }
  available(): ShowSeat[] { return [...this.seats.values()].filter((x) => x.status === "AVAILABLE"); }
}

interface User { readonly id: string; readonly name: string }

class Booking {
  status: BookingStatus = "PENDING";
  constructor(readonly id: string, readonly user: User, readonly show: Show, readonly seats: readonly ShowSeat[], readonly amountPaise: number) {}
}

// ---------- Search: city -> shows, with an overlap guard per screen ----------
class ShowCatalog {
  private readonly showsByCity = new Map<string, Show[]>();
  private readonly theatreOfScreen = new Map<string, Theatre>();

  addTheatre(t: Theatre): void { for (const s of t.screens) this.theatreOfScreen.set(s.id, t); }

  addShow(show: Show): void {
    const t = this.theatreOfScreen.get(show.screen.id);
    if (t === undefined) throw new Error(\`unknown screen \${show.screen.id}\`);
    const shows = this.showsByCity.get(t.city) ?? [];
    for (const other of shows) {
      const sameScreen = other.screen === show.screen;
      const overlap = other.start < show.end && show.start < other.end;
      if (sameScreen && overlap) throw new Error(\`overlaps show \${other.id}\`);
    }
    this.showsByCity.set(t.city, [...shows, show]);
  }

  moviesIn(city: string): Movie[] {
    return [...new Set((this.showsByCity.get(city) ?? []).map((s) => s.movie))];
  }

  showsOf(city: string, movieId: string): Show[] {
    return (this.showsByCity.get(city) ?? []).filter((s) => s.movie.id === movieId).sort((a, b) => a.start - b.start);
  }
}

// ---------- Booking flow: depends on ABSTRACTIONS (Dependency Inversion) ----------
interface SeatLockProvider { // in-memory today, Redis / DB tomorrow
  hold(show: Show, seats: readonly ShowSeat[], user: User): boolean; // all-or-nothing
  confirm(show: Show, seats: readonly ShowSeat[], user: User): boolean; // HELD -> BOOKED if the hold is still valid
  release(show: Show, seats: readonly ShowSeat[], user: User): void; // HELD -> AVAILABLE
}

interface PaymentGateway {
  charge(userId: string, amountPaise: number, idempotencyKey: string): boolean;
  refund(idempotencyKey: string): void;
}

interface Clock { now(): number }

// Simple, correct, coarse: ONE monitor for everything. The next topic makes it per-show.
// (JS runs one call at a time, so these methods are already atomic; on threads this is a lock.)
class CoarseLockProvider implements SeatLockProvider {
  constructor(private readonly clock: Clock, private readonly ttlMs: number) {}

  private static freeFor(s: ShowSeat, u: User, now: number): boolean {
    if (s.status === "AVAILABLE") return true;
    if (s.status === "BOOKED") return false;
    return now > s.holdExpiresAt || u.id === s.heldBy; // expired hold or my own hold
  }

  hold(_show: Show, seats: readonly ShowSeat[], u: User): boolean {
    const now = this.clock.now();
    if (!seats.every((s) => CoarseLockProvider.freeFor(s, u, now))) return false; // phase 1: check ALL
    for (const s of seats) { s.status = "HELD"; s.heldBy = u.id; s.holdExpiresAt = now + this.ttlMs; } // phase 2: take ALL
    return true;
  }

  confirm(_show: Show, seats: readonly ShowSeat[], u: User): boolean {
    const now = this.clock.now();
    if (seats.some((s) => s.status !== "HELD" || s.heldBy !== u.id || now > s.holdExpiresAt)) return false;
    for (const s of seats) { s.status = "BOOKED"; s.holdExpiresAt = 0; }
    return true;
  }

  release(_show: Show, seats: readonly ShowSeat[], u: User): void {
    for (const s of seats) if (s.status === "HELD" && s.heldBy === u.id) { s.status = "AVAILABLE"; s.heldBy = null; }
  }
}

class BookingService {
  private readonly bookings = new Map<string, Booking>();
  private nextId = 1;

  constructor(private readonly locks: SeatLockProvider, private readonly payments: PaymentGateway) {}

  // Step 1: user picks seats -> we HOLD them and create a PENDING booking
  start(u: User, show: Show, seatIds: readonly string[]): Booking {
    const chosen = seatIds.map((id) => {
      const seat = show.seats.get(id);
      if (seat === undefined) throw new Error(\`no seat \${id}\`);
      return seat;
    });
    if (!this.locks.hold(show, chosen, u)) throw new Error("some seats were just taken, pick again");
    const amount = chosen.reduce((sum, s) => sum + s.pricePaise, 0);
    const b = new Booking(\`BK\${this.nextId++}\`, u, show, chosen, amount);
    this.bookings.set(b.id, b);
    return b;
  }

  // Step 2: payment -> confirm. The booking id doubles as the payment idempotency key.
  pay(bookingId: string): Booking {
    const b = this.bookings.get(bookingId);
    if (b === undefined) throw new Error(\`no booking \${bookingId}\`);
    if (b.status !== "PENDING") return b; // retry-safe
    if (!this.payments.charge(b.user.id, b.amountPaise, b.id)) {
      this.locks.release(b.show, b.seats, b.user);
      b.status = "CANCELLED";
      return b;
    }
    if (!this.locks.confirm(b.show, b.seats, b.user)) { // hold expired during payment
      this.payments.refund(b.id);
      b.status = "EXPIRED";
      return b;
    }
    b.status = "CONFIRMED";
    return b;
  }
}

const seats: Seat[] = [];
for (let r = 0; r < 3; r++) {
  for (let c = 1; c <= 4; c++) {
    seats.push({ id: \`\${String.fromCharCode(65 + r)}\${c}\`, row: r, col: c, type: r === 2 ? "PREMIUM" : "REGULAR" });
  }
}
const audi1: Screen = { id: "SCR1", name: "Audi 1", seats };
const pvr = new Theatre("T1", "PVR Forum", "Bengaluru");
pvr.addScreen(audi1);

const catalog = new ShowCatalog();
catalog.addTheatre(pvr);
const movie: Movie = { id: "M1", title: "Interstellar", durationMins: 169, language: "English" };
const sat6pm = Date.UTC(2026, 9, 17, 18, 0) - IST_OFFSET_MS; // 18:00 in India
const evening = new Show("SH1", movie, audi1, sat6pm, new TieredPricing());
catalog.addShow(evening);
try {
  catalog.addShow(new Show("SH2", movie, audi1, sat6pm + 60 * MINUTE_MS, new TieredPricing()));
} catch (e) {
  console.log("Rejected: " + (e as Error).message); // same screen, overlapping time
}

const gateway: PaymentGateway = {
  charge: (userId) => userId !== "u2", // Ben's card is declined
  refund: (key) => console.log("refund " + key),
};
const service = new BookingService(new CoarseLockProvider({ now: () => Date.now() }, 10 * MINUTE_MS), gateway);
const b = service.start({ id: "u1", name: "Asha" }, evening, ["C3", "C4"]);
console.log(\`\${b.id} amount (paise) = \${b.amountPaise}\`); // 2 premium seats on a Saturday
try {
  service.start({ id: "u2", name: "Ben" }, evening, ["C2", "C4"]); // C4 is held by Asha
} catch (e) {
  console.log("Rejected: " + (e as Error).message);
}
console.log(\`\${service.pay(b.id).status}, free seats left = \${evening.available().length}\`);
const declined = service.start({ id: "u2", name: "Ben" }, evening, ["C1", "C2"]);
console.log(\`\${service.pay(declined.id).status}, free seats left = \${evening.available().length}\`);` },
      { lang: 'cpp', code: `// Money is ALWAYS in paise (long long). 1 rupee = 100 paise. Never use double for money.
using Instant = chrono::sys_seconds;
constexpr chrono::minutes IST_OFFSET{330};            // India has no daylight saving, so a fixed offset is exact

enum class SeatType { Regular, Premium, Recliner };
enum class SeatStatus { Available, Held, Booked };
enum class BookingStatus { Pending, Confirmed, Cancelled, Expired };

string name(BookingStatus s) {
    switch (s) {
        case BookingStatus::Pending: return "PENDING";
        case BookingStatus::Confirmed: return "CONFIRMED";
        case BookingStatus::Cancelled: return "CANCELLED";
        case BookingStatus::Expired: return "EXPIRED";
    }
    return "?";
}

// ---------- Catalogue: things that almost never change ----------
struct Movie { string id, title; int durationMins; string language; };

// A PHYSICAL chair. It exists exactly once, no matter how many shows run.
struct Seat { string id; int row, col; SeatType type; };

// An auditorium: Screen COMPOSES its seats (it owns copies).
struct Screen { string id, name; vector<Seat> seats; };

// A building in a city: Theatre COMPOSES its screens.
struct Theatre {
    string id, name, city;
    vector<Screen> screens;
    void addScreen(Screen s) { screens.push_back(move(s)); }
};

// ---------- Inventory: changes every second ----------
// A chair IN ONE SHOW. This is the thing we actually sell.
struct ShowSeat {
    Seat seat;
    long long pricePaise;
    SeatStatus status = SeatStatus::Available;
    string heldBy;                    // user id while HELD or BOOKED
    Instant holdExpiresAt{};          // only meaningful while HELD
    ShowSeat(Seat seat, long long pricePaise) : seat(move(seat)), pricePaise(pricePaise) {}
};

// Pricing is a Strategy: weekend surge, recliner premium, festival pricing... all pluggable.
class PricingStrategy {
public:
    virtual ~PricingStrategy() = default;
    virtual long long price(const Seat& seat, Instant showStart) const = 0;
};

class TieredPricing : public PricingStrategy {
public:
    long long price(const Seat& seat, Instant showStart) const override {
        long long base = 0;
        switch (seat.type) {
            case SeatType::Regular: base = 200'00; break;
            case SeatType::Premium: base = 350'00; break;
            case SeatType::Recliner: base = 600'00; break;
        }
        chrono::weekday d{chrono::floor<chrono::days>(showStart + IST_OFFSET)};
        bool weekend = d == chrono::Saturday || d == chrono::Sunday;
        return weekend ? base * 120 / 100 : base;       // +20% on weekends
    }
};

// A Show = (Movie, Screen, start time). It OWNS one ShowSeat per physical Seat.
class Show {
public:
    string id;
    Movie movie;
    const Screen& screen;             // the screen outlives every show
    Instant start;
    map<string, ShowSeat> seats;      // ordered by seat id

    Show(string id, Movie movie, const Screen& screen, Instant start, const PricingStrategy& pricing)
        : id(move(id)), movie(move(movie)), screen(screen), start(start) {
        for (const auto& s : screen.seats) seats.emplace(s.id, ShowSeat(s, pricing.price(s, start)));
    }
    Instant end() const { return start + chrono::minutes{movie.durationMins}; }
    int availableCount() const {
        return count_if(seats.begin(), seats.end(), [](const auto& kv) { return kv.second.status == SeatStatus::Available; });
    }
};

struct User { string id, name; };

struct Booking {
    string id;
    User user;
    Show* show;
    vector<ShowSeat*> seats;
    long long amountPaise;
    BookingStatus status = BookingStatus::Pending;
};

// ---------- Search: city -> shows, with an overlap guard per screen ----------
class ShowCatalog {
    map<string, vector<Show*>> showsByCity;
    map<string, const Theatre*> theatreOfScreen;
public:
    void addTheatre(const Theatre& t) { for (const auto& s : t.screens) theatreOfScreen[s.id] = &t; }

    void addShow(Show& show) {
        auto it = theatreOfScreen.find(show.screen.id);
        if (it == theatreOfScreen.end()) throw invalid_argument("unknown screen " + show.screen.id);
        auto& shows = showsByCity[it->second->city];
        for (const Show* other : shows) {
            bool sameScreen = &other->screen == &show.screen;
            bool overlap = other->start < show.end() && show.start < other->end();
            if (sameScreen && overlap) throw runtime_error("overlaps show " + other->id);
        }
        shows.push_back(&show);
    }
};

// ---------- Booking flow: depends on ABSTRACTIONS (Dependency Inversion) ----------
class SeatLockProvider {              // in-memory today, Redis / DB tomorrow
public:
    virtual ~SeatLockProvider() = default;
    virtual bool hold(Show& show, const vector<ShowSeat*>& seats, const User& user) = 0;      // all-or-nothing
    virtual bool confirm(Show& show, const vector<ShowSeat*>& seats, const User& user) = 0;   // HELD -> BOOKED if valid
    virtual void release(Show& show, const vector<ShowSeat*>& seats, const User& user) = 0;   // HELD -> AVAILABLE
};

class PaymentGateway {
public:
    virtual ~PaymentGateway() = default;
    virtual bool charge(const string& userId, long long amountPaise, const string& idempotencyKey) = 0;
    virtual void refund(const string& idempotencyKey) = 0;
};

class Clock {
public:
    virtual ~Clock() = default;
    virtual Instant now() const = 0;
};

class SystemClock : public Clock {
public:
    Instant now() const override { return chrono::floor<chrono::seconds>(chrono::system_clock::now()); }
};

// Simple, correct, coarse: ONE mutex for everything. The next topic makes it per-show.
class CoarseLockProvider : public SeatLockProvider {
    const Clock& clock;
    chrono::seconds ttl;
    mutex lock;

    static bool freeFor(const ShowSeat& s, const User& u, Instant now) {
        if (s.status == SeatStatus::Available) return true;
        if (s.status == SeatStatus::Booked) return false;
        return now > s.holdExpiresAt || u.id == s.heldBy;     // expired hold or my own hold
    }
public:
    CoarseLockProvider(const Clock& clock, chrono::seconds ttl) : clock(clock), ttl(ttl) {}

    bool hold(Show&, const vector<ShowSeat*>& seats, const User& u) override {
        lock_guard<mutex> g(lock);
        Instant now = clock.now();
        for (auto* s : seats) if (!freeFor(*s, u, now)) return false;            // phase 1: check ALL
        for (auto* s : seats) {                                                  // phase 2: take ALL
            s->status = SeatStatus::Held; s->heldBy = u.id; s->holdExpiresAt = now + ttl;
        }
        return true;
    }
    bool confirm(Show&, const vector<ShowSeat*>& seats, const User& u) override {
        lock_guard<mutex> g(lock);
        Instant now = clock.now();
        for (auto* s : seats)
            if (s->status != SeatStatus::Held || s->heldBy != u.id || now > s->holdExpiresAt) return false;
        for (auto* s : seats) s->status = SeatStatus::Booked;
        return true;
    }
    void release(Show&, const vector<ShowSeat*>& seats, const User& u) override {
        lock_guard<mutex> g(lock);
        for (auto* s : seats)
            if (s->status == SeatStatus::Held && s->heldBy == u.id) { s->status = SeatStatus::Available; s->heldBy.clear(); }
    }
};

class BookingService {
    SeatLockProvider& locks;          // the composition root owns the collaborators
    PaymentGateway& payments;
    map<string, Booking> bookings;
    long long nextId = 1;
public:
    BookingService(SeatLockProvider& locks, PaymentGateway& payments) : locks(locks), payments(payments) {}

    // Step 1: user picks seats -> we HOLD them and create a PENDING booking
    Booking& start(const User& u, Show& show, const vector<string>& seatIds) {
        vector<ShowSeat*> chosen;
        for (const auto& id : seatIds) {
            auto it = show.seats.find(id);
            if (it == show.seats.end()) throw invalid_argument("no seat " + id);
            chosen.push_back(&it->second);
        }
        if (!locks.hold(show, chosen, u)) throw runtime_error("some seats were just taken, pick again");
        long long amount = 0;
        for (auto* s : chosen) amount += s->pricePaise;
        string id = "BK" + to_string(nextId++);
        return bookings[id] = Booking{id, u, &show, chosen, amount};
    }

    // Step 2: payment -> confirm. The booking id doubles as the payment idempotency key.
    Booking& pay(const string& bookingId) {
        auto it = bookings.find(bookingId);
        if (it == bookings.end()) throw invalid_argument("no booking " + bookingId);
        Booking& b = it->second;
        if (b.status != BookingStatus::Pending) return b;                       // retry-safe
        if (!payments.charge(b.user.id, b.amountPaise, b.id)) {
            locks.release(*b.show, b.seats, b.user);
            b.status = BookingStatus::Cancelled;
            return b;
        }
        if (!locks.confirm(*b.show, b.seats, b.user)) {                          // hold expired during payment
            payments.refund(b.id);
            b.status = BookingStatus::Expired;
            return b;
        }
        b.status = BookingStatus::Confirmed;
        return b;
    }
};

class DemoGateway : public PaymentGateway {
public:
    bool charge(const string& userId, long long, const string&) override { return userId != "u2"; }   // Ben's card is declined
    void refund(const string& key) override { cout << "refund " << key << "\\n"; }
};

int main() {
    vector<Seat> seats;
    for (int r = 0; r < 3; r++)
        for (int c = 1; c <= 4; c++)
            seats.push_back({string(1, char('A' + r)) + to_string(c), r, c, r == 2 ? SeatType::Premium : SeatType::Regular});
    Theatre pvr{"T1", "PVR Forum", "Bengaluru", {}};
    pvr.addScreen({"SCR1", "Audi 1", seats});
    const Screen& audi1 = pvr.screens[0];

    ShowCatalog catalog;
    catalog.addTheatre(pvr);
    Movie movie{"M1", "Interstellar", 169, "English"};
    Instant sat6pm = chrono::sys_days(chrono::year{2026} / chrono::October / 17) + chrono::hours{18} - IST_OFFSET;
    TieredPricing pricing;
    Show evening("SH1", movie, audi1, sat6pm, pricing);
    catalog.addShow(evening);
    Show clash("SH2", movie, audi1, sat6pm + chrono::hours{1}, pricing);
    try {
        catalog.addShow(clash);
    } catch (const runtime_error& e) {
        cout << "Rejected: " << e.what() << "\\n";         // same screen, overlapping time
    }

    SystemClock clock;
    CoarseLockProvider locks(clock, chrono::minutes{10});
    DemoGateway gateway;
    BookingService service(locks, gateway);
    Booking& b = service.start({"u1", "Asha"}, evening, {"C3", "C4"});
    cout << b.id << " amount (paise) = " << b.amountPaise << "\\n";      // 2 premium seats on a Saturday
    try {
        service.start({"u2", "Ben"}, evening, {"C2", "C4"});            // C4 is held by Asha
    } catch (const runtime_error& e) {
        cout << "Rejected: " << e.what() << "\\n";
    }
    cout << name(service.pay(b.id).status) << ", free seats left = " << evening.availableCount() << "\\n";
    Booking& declined = service.start({"u2", "Ben"}, evening, {"C1", "C2"});
    cout << name(service.pay(declined.id).status) << ", free seats left = " << evening.availableCount() << "\\n";
}` }
    ] }],
    codeTitle: 'BookMyShow domain model + booking flow (a complete program)',
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
}`, alt: [
          { lang: 'python', code: `from typing import Protocol


class PricingStrategy(Protocol):
    def price(self, seat_type: str, weekend: bool) -> int: ...


class FestivalPricing:
    """Decorates the normal pricing with a surge, without touching it."""

    def __init__(self, base: PricingStrategy, surge_percent: int) -> None:
        self._base = base
        self._surge_percent = surge_percent

    def price(self, seat_type: str, weekend: bool) -> int:
        return self._base.price(seat_type, weekend) * (100 + self._surge_percent) // 100


class NormalPricing:
    def price(self, seat_type: str, weekend: bool) -> int:
        base = 600_00 if seat_type == "RECLINER" else 200_00
        return base * (120 if weekend else 100) // 100


if __name__ == "__main__":
    normal = NormalPricing()
    diwali = FestivalPricing(normal, 25)
    print(normal.price("REGULAR", True))   # 24000 paise = Rs 240
    print(diwali.price("REGULAR", True))   # 30000 paise = Rs 300` },
          { lang: 'ts', code: `interface PricingStrategy {
  price(seatType: string, weekend: boolean): number;
}

class FestivalPricing implements PricingStrategy {
  // decorate the normal pricing
  constructor(private readonly base: PricingStrategy, private readonly surgePercent: number) {}
  price(seatType: string, weekend: boolean): number {
    return Math.floor((this.base.price(seatType, weekend) * (100 + this.surgePercent)) / 100);
  }
}

// An object literal satisfies the interface structurally: no class needed for a one-off strategy.
const normal: PricingStrategy = {
  price: (seatType, weekend) => ((seatType === "RECLINER" ? 600_00 : 200_00) * (weekend ? 120 : 100)) / 100,
};
const diwali = new FestivalPricing(normal, 25);
console.log(normal.price("REGULAR", true)); // 24000 paise = Rs 240
console.log(diwali.price("REGULAR", true)); // 30000 paise = Rs 300` },
          { lang: 'cpp', code: `class PricingStrategy {
public:
    virtual ~PricingStrategy() = default;
    virtual long long price(const string& seatType, bool weekend) const = 0;
};

class NormalPricing : public PricingStrategy {
public:
    long long price(const string& seatType, bool weekend) const override {
        return (seatType == "RECLINER" ? 600'00 : 200'00) * (weekend ? 120 : 100) / 100;
    }
};

class FestivalPricing : public PricingStrategy {
    const PricingStrategy& base;        // decorate the normal pricing; the caller keeps ownership
    int surgePercent;
public:
    FestivalPricing(const PricingStrategy& base, int surgePercent) : base(base), surgePercent(surgePercent) {}
    long long price(const string& seatType, bool weekend) const override {
        return base.price(seatType, weekend) * (100 + surgePercent) / 100;
    }
};

int main() {
    NormalPricing normal;
    FestivalPricing diwali(normal, 25);
    cout << normal.price("REGULAR", true) << "\\n";   // 24000 paise = Rs 240
    cout << diwali.price("REGULAR", true) << "\\n";   // 30000 paise = Rs 300
}` }
        ] },
      { title: 'Rejecting overlapping shows on the same screen', html: `<p>Interstellar is 169 minutes. Show 1 runs 18:00 → 20:49. An admin tries to add Show 2 at 19:00 on the same screen. Two intervals [a1, b1) and [a2, b2) overlap exactly when <code>a1 &lt; b2 &amp;&amp; a2 &lt; b1</code>: 18:00 &lt; 21:49 and 19:00 &lt; 20:49 → ${H.c('r', 'overlap → reject')}. Real cinemas also add a 15-minute cleaning buffer — just extend <code>end()</code> by the buffer.</p>` },
      { title: 'Extending to concerts and stand-up comedy', html: `<p>Interviewer: "Now support concerts." Rename the idea: a <b>Show</b> plays an <b>Event</b>. Make <code>Movie</code> one implementation of an <code>Event</code> interface (<code>title()</code> and <code>duration()</code>), add <code>Concert</code> and <code>StandUp</code>. Concerts often have <b>standing zones</b> with a capacity instead of numbered seats — model that as <code>ZoneInventory</code> with an atomic counter, behind the same <code>SeatLockProvider</code>-style interface. The booking flow does not change.</p>` }
    ],
    deepDive: `<p><b>Catalogue vs inventory is the real architecture.</b> Movie/Theatre/Screen/Seat are read 1000× more than written — cache them aggressively (even in the app's memory). ShowSeat is write-hot and must be the <i>single source of truth</i>; all concurrency control lives around it. In a database this is a <code>show_seat(show_id, seat_id, status, held_by, hold_expires_at, version)</code> table with primary key <code>(show_id, seat_id)</code>.</p>
<p><b>Money and time.</b> Store paise in a 64-bit integer (<code>long</code>, a Python <code>int</code>, <code>long long</code>), or a decimal type with scale 2 — <code>0.1 + 0.2 != 0.3</code> in binary floating point. Store show times as a UTC instant (<code>Instant</code>, an aware <code>datetime</code>, epoch milliseconds, a <code>chrono::time_point</code>) and convert to the theatre's time zone only for display and for rules like "weekend". Inject a clock (<code>java.time.Clock</code>, a function that returns now, an interface with <code>now()</code>) so tests can freeze or fast-forward time (crucial for testing hold expiry).</p>
<p><b>Lazily creating ShowSeats.</b> A 300-seat screen × 5 shows × 365 days = 547k rows a year per screen. That is fine for a DB, but some systems create ShowSeat rows only when the show opens for sale, or store a compact bitmap per show (1 bit per seat for "booked") plus a small map of active holds.</p>
<p><b>Booking state machine.</b> PENDING → CONFIRMED | CANCELLED | EXPIRED, and CONFIRMED → CANCELLED (refund). Encode allowed transitions explicitly; a late payment webhook on an EXPIRED booking must trigger a refund, never a confirm.</p>
<p><b>Idempotency.</b> Payment gateways retry webhooks and users double-tap. Use the booking id as the idempotency key for <code>charge</code>, and make <code>pay()</code> return early if the booking is no longer PENDING — that is why the code checks the status first.</p>
<p><b>Where the patterns are:</b> Strategy (pricing, refund policy), Observer (notifications, waitlist), Factory (creating ShowSeats from a Screen layout), Facade (BookingService hides lock + payment + persistence), Dependency Inversion (SeatLockProvider, PaymentGateway, Clock).</p>`,
    aiEra: `<p><b>What AI changes:</b> an assistant can spit out 15 entity classes with getters in seconds. That is no longer impressive in an interview — the <i>judgement</i> is: spotting the Seat vs ShowSeat split, keeping money in paise, putting concurrency behind an interface, and naming the failure paths (declined card, late webhook, expired hold).</p>
<p><b>Use AI as a partner:</b> <code>Here are my BookMyShow classes. List 10 requirements they cannot support yet and the smallest change for each.</code> or <code>Generate unit tests for BookingService using a fixed clock — include hold expiry and a late payment callback.</code></p>
<p><b>Where AI goes wrong:</b> it often stores <code>status</code> directly on <code>Seat</code>, uses <code>double price</code>, forgets that holds expire, calls the payment gateway <i>before</i> holding seats, or guards a method with an in-process lock on a singleton service and calls it "distributed safe". Always review the generated code against the invariants: one seat → at most one active owner per show.</p>
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
      mcq: { q: 'How do you avoid re-checking k cells for every start position?', options: ['Keep a running count of consecutive free seats in the row', 'Sort the seats', 'Use a hash set of taken seats', 'Binary search on k'], answer: 0, explain: 'A run counter resets on X and grows on "."; whenever run ≥ k, the block ending here is free — O(1) per cell.' },
      hints: [`<p>Hint 1: a block of k free seats ending at column c exists exactly when the number of consecutive '.' ending at c is at least k.</p>`, `<p>Hint 2: keep <code>run</code> per row; reset to 0 on 'X'. When <code>run ≥ k</code>, candidate start = c − k + 1. Score it.</p>`, `<p>Hint 3: score = |row − midRow| × cols + |blockCentre − midCol|. Multiplying the row distance by cols makes row preference always win over column preference. Track the minimum.</p>`],
      tests: { io: true, cases: [{ stdin: '', stdout: '2,4\n0,1\n0,0\nnone\nnone\n0,1\n' }] },
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

    static String show(int[] a) { return a == null ? "none" : a[0] + "," + a[1]; }

    public static void main(String[] args) {
        String[] raw = {"........", "XX..XXXX", "..XX....", "....X...", "........"};
        char[][] map = new char[raw.length][];
        for (int i = 0; i < raw.length; i++) map[i] = raw[i].toCharArray();
        System.out.println(show(suggest(map, 3)));        // 2,4  middle row wins
        System.out.println(show(suggest(map, 5)));        // 0,1  tie with row 4 and start 2: first found wins
        System.out.println(show(suggest(map, 8)));        // 0,0  only full rows fit
        System.out.println(show(suggest(map, 9)));        // none: wider than the hall
        char[][] broken = {"X.X.".toCharArray(), ".X.X".toCharArray()};
        System.out.println(show(suggest(broken, 2)));     // none: no two seats side by side
        System.out.println(show(suggest(broken, 1)));     // 0,1
    }
}`,
        alt: [
          { lang: 'python', code: `class SeatSuggester:
    @staticmethod
    def suggest(seat_map: list[str], k: int) -> tuple[int, int] | None:
        """Returns (row, start_col) of the best block of k free seats, or None."""
        rows, cols = len(seat_map), len(seat_map[0])
        mid_row, mid_col = (rows - 1) / 2, (cols - 1) / 2
        best: tuple[int, int] | None = None
        best_score = float("inf")
        for r, line in enumerate(seat_map):
            run = 0                                   # consecutive free seats ending at c
            for c, ch in enumerate(line):
                run = run + 1 if ch == "." else 0
                if run >= k:
                    start = c - k + 1
                    centre = start + (k - 1) / 2
                    score = abs(r - mid_row) * cols + abs(centre - mid_col)
                    if score < best_score:
                        best_score, best = score, (r, start)
        return best


def show(a: tuple[int, int] | None) -> str:
    return "none" if a is None else f"{a[0]},{a[1]}"


if __name__ == "__main__":
    hall = ["........", "XX..XXXX", "..XX....", "....X...", "........"]
    for k in (3, 5, 8, 9):
        print(show(SeatSuggester.suggest(hall, k)))
    broken = ["X.X.", ".X.X"]
    print(show(SeatSuggester.suggest(broken, 2)))
    print(show(SeatSuggester.suggest(broken, 1)))` },
          { lang: 'ts', code: `type Cell = readonly [row: number, startCol: number];

class SeatSuggester {
  /** Returns [row, startCol] of the best block of k free seats, or null. */
  static suggest(map: readonly string[], k: number): Cell | null {
    const rows = map.length, cols = map[0].length;
    const midRow = (rows - 1) / 2, midCol = (cols - 1) / 2;
    let best: Cell | null = null;
    let bestScore = Infinity;
    for (let r = 0; r < rows; r++) {
      let run = 0; // consecutive free seats ending at c
      for (let c = 0; c < cols; c++) {
        run = map[r][c] === "." ? run + 1 : 0;
        if (run >= k) {
          const start = c - k + 1;
          const centre = start + (k - 1) / 2;
          const score = Math.abs(r - midRow) * cols + Math.abs(centre - midCol);
          if (score < bestScore) { bestScore = score; best = [r, start]; }
        }
      }
    }
    return best;
  }
}

const show = (a: Cell | null): string => (a === null ? "none" : \`\${a[0]},\${a[1]}\`);

const hall = ["........", "XX..XXXX", "..XX....", "....X...", "........"];
for (const k of [3, 5, 8, 9]) console.log(show(SeatSuggester.suggest(hall, k)));
const broken = ["X.X.", ".X.X"];
console.log(show(SeatSuggester.suggest(broken, 2)));
console.log(show(SeatSuggester.suggest(broken, 1)));` },
          { lang: 'cpp', code: `class SeatSuggester {
public:
    // Returns {row, startCol} of the best block of k free seats, or nullopt.
    static optional<pair<int, int>> suggest(const vector<string>& map, int k) {
        int rows = map.size(), cols = map[0].size();
        double midRow = (rows - 1) / 2.0, midCol = (cols - 1) / 2.0;
        optional<pair<int, int>> best;
        double bestScore = numeric_limits<double>::max();
        for (int r = 0; r < rows; r++) {
            int run = 0;                                   // consecutive free seats ending at c
            for (int c = 0; c < cols; c++) {
                run = map[r][c] == '.' ? run + 1 : 0;
                if (run >= k) {
                    int start = c - k + 1;
                    double centre = start + (k - 1) / 2.0;
                    double score = abs(r - midRow) * cols + abs(centre - midCol);
                    if (score < bestScore) { bestScore = score; best = {r, start}; }
                }
            }
        }
        return best;
    }
};

string show(const optional<pair<int, int>>& a) {
    return a ? to_string(a->first) + "," + to_string(a->second) : "none";
}

int main() {
    vector<string> hall = {"........", "XX..XXXX", "..XX....", "....X...", "........"};
    for (int k : {3, 5, 8, 9}) cout << show(SeatSuggester::suggest(hall, k)) << "\\n";
    vector<string> broken = {"X.X.", ".X.X"};
    cout << show(SeatSuggester::suggest(broken, 2)) << "\\n";
    cout << show(SeatSuggester::suggest(broken, 1)) << "\\n";
}` }
        ],
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
<li><b>One global lock</b> (one mutex around the whole service). Correct, but a blockbuster release in Mumbai blocks a quiet show in Pune. Throughput = one booking at a time for the whole country.</li>
<li><b>One lock per show</b> (a mutex stored in the show's inventory: <code>ReentrantLock</code>, <code>threading.Lock</code>, <code>std::mutex</code>). Shows never block each other; inside a show, holds take microseconds, so this is plenty. <span class="c-g">Best answer for an in-memory LLD round.</span></li>
<li><b>Per-seat atomic CAS</b> (compare-and-set: <code>AtomicReference.compareAndSet</code>, <code>std::atomic::compare_exchange_strong</code>, <code>Atomics.compareExchange</code>). No blocking at all, but multi-seat bookings need <b>roll-back</b> when one seat fails (all-or-nothing).</li>
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
    code: [{ lang: 'java', code: BMS_LOCK, alt: [
      { lang: 'python', code: `import threading
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from enum import Enum


class SeatState(Enum):
    AVAILABLE = "AVAILABLE"
    HELD = "HELD"
    BOOKED = "BOOKED"


@dataclass(frozen=True)
class HoldResult:
    ok: bool
    reason: str
    expires_at: datetime | None


@dataclass
class SeatSlot:                     # one seat in one show (the "ShowSeat")
    seat_id: str
    state: SeatState = SeatState.AVAILABLE
    owner: str | None = None        # user holding or owning it
    hold_until: datetime | None = None   # only for HELD

    def takeable_by(self, user: str, now: datetime) -> bool:
        """LAZY EXPIRY: an old hold is treated as free the moment anybody looks at it."""
        if self.state is SeatState.AVAILABLE:
            return True
        if self.state is SeatState.BOOKED:
            return False
        assert self.hold_until is not None
        return now > self.hold_until or user == self.owner

    def free(self) -> None:
        self.state, self.owner, self.hold_until = SeatState.AVAILABLE, None, None


@dataclass
class ShowInventory:
    show_id: str
    seat_ids: list[str]
    lock: threading.Lock = field(default_factory=threading.Lock)   # ONE lock per show
    seats: dict[str, SeatSlot] = field(init=False)

    def __post_init__(self) -> None:
        self.seats = {sid: SeatSlot(sid) for sid in sorted(self.seat_ids)}   # sorted -> deterministic order


class SeatBookingService:
    def __init__(self, clock: Callable[[], datetime], hold_ttl: timedelta) -> None:
        self._shows: dict[str, ShowInventory] = {}
        self._clock, self._hold_ttl = clock, hold_ttl

    def add_show(self, show_id: str, seat_ids: list[str]) -> None:
        self._shows[show_id] = ShowInventory(show_id, seat_ids)

    def _inv(self, show_id: str) -> ShowInventory:
        inv = self._shows.get(show_id)
        if inv is None:
            raise ValueError(f"unknown show {show_id}")
        return inv

    def hold(self, show_id: str, user: str, seat_ids: list[str]) -> HoldResult:
        """All-or-nothing hold. Two users on DIFFERENT shows never block each other."""
        inv = self._inv(show_id)
        with inv.lock:                                           # released even if an exception is raised
            now = self._clock()
            for sid in seat_ids:                                 # phase 1: check every seat
                slot = inv.seats.get(sid)
                if slot is None:
                    return HoldResult(False, f"no such seat {sid}", None)
                if not slot.takeable_by(user, now):
                    return HoldResult(False, f"{sid} was just taken", None)
            until = now + self._hold_ttl
            for sid in seat_ids:                                 # phase 2: take every seat
                slot = inv.seats[sid]
                slot.state, slot.owner, slot.hold_until = SeatState.HELD, user, until
            return HoldResult(True, "held", until)

    def confirm(self, show_id: str, user: str, seat_ids: list[str]) -> bool:
        """Payment succeeded: HELD -> BOOKED, but only if the hold is still mine and alive."""
        inv = self._inv(show_id)
        with inv.lock:
            now = self._clock()
            for sid in seat_ids:
                slot = inv.seats.get(sid)
                if (slot is None or slot.state is not SeatState.HELD or slot.owner != user
                        or (slot.hold_until is not None and now > slot.hold_until)):
                    return False
            for sid in seat_ids:
                inv.seats[sid].state = SeatState.BOOKED
                inv.seats[sid].hold_until = None
            return True

    def release(self, show_id: str, user: str, seat_ids: list[str]) -> None:
        """User closed the app / payment failed: give seats back immediately."""
        inv = self._inv(show_id)
        with inv.lock:
            for sid in seat_ids:
                slot = inv.seats.get(sid)
                if slot is not None and slot.state is SeatState.HELD and slot.owner == user:
                    slot.free()

    def sweep_expired(self, show_id: str) -> int:
        """Optional background sweeper (lazy expiry already keeps us correct; this just tidies the seat map)."""
        inv = self._inv(show_id)
        with inv.lock:
            now = self._clock()
            expired = [s for s in inv.seats.values()
                       if s.state is SeatState.HELD and s.hold_until is not None and now > s.hold_until]
            for s in expired:
                s.free()
            return len(expired)

    def state_of(self, show_id: str, seat_id: str) -> str:
        return self._inv(show_id).seats[seat_id].state.value


def main() -> None:
    svc = SeatBookingService(lambda: datetime.now(timezone.utc), timedelta(minutes=10))
    svc.add_show("S1", ["B3", "B4", "B5"])

    # 1000 rounds of two users racing for the SAME seat at the same instant
    double_sold = 0
    with ThreadPoolExecutor(max_workers=2) as pool:
        for rnd in range(1000):
            show = f"R{rnd}"
            svc.add_show(show, ["B4"])
            go = threading.Barrier(2)

            def attempt(user: str, show: str = show, go: threading.Barrier = go) -> HoldResult:
                go.wait()
                return svc.hold(show, user, ["B4"])

            a, b = pool.submit(attempt, "asha"), pool.submit(attempt, "ben")
            if a.result().ok and b.result().ok:
                double_sold += 1
    print(f"double-sold rounds = {double_sold}")        # always 0


if __name__ == "__main__":
    main()` },
      { lang: 'ts', code: `type SeatState = "AVAILABLE" | "HELD" | "BOOKED";

interface HoldResult { readonly ok: boolean; readonly reason: string; readonly expiresAt: number | null }

interface Clock { now(): number } // epoch milliseconds

// One seat in one show (the "ShowSeat")
class SeatSlot {
  state: SeatState = "AVAILABLE";
  owner: string | null = null; // user holding or owning it
  holdUntil = 0; // only for HELD
  constructor(readonly seatId: string) {}

  // LAZY EXPIRY: an old hold is treated as free the moment anybody looks at it.
  takeableBy(user: string, now: number): boolean {
    switch (this.state) {
      case "AVAILABLE": return true;
      case "BOOKED": return false;
      case "HELD": return now > this.holdUntil || user === this.owner;
    }
  }

  free(): void { this.state = "AVAILABLE"; this.owner = null; this.holdUntil = 0; }
}

class ShowInventory {
  // sorted -> deterministic order
  readonly seats = new Map<string, SeatSlot>();
  constructor(readonly showId: string, seatIds: Iterable<string>) {
    for (const id of [...seatIds].sort()) this.seats.set(id, new SeatSlot(id));
  }
}

// JS runs one call at a time, so each method below is already atomic: there is no await between the
// check and the act. With Worker threads, or an await inside the critical section, you need a real lock.
class SeatBookingService {
  private readonly shows = new Map<string, ShowInventory>();

  constructor(private readonly clock: Clock, private readonly holdTtlMs: number) {}

  addShow(showId: string, seatIds: Iterable<string>): void { this.shows.set(showId, new ShowInventory(showId, seatIds)); }

  private inv(showId: string): ShowInventory {
    const s = this.shows.get(showId);
    if (s === undefined) throw new Error(\`unknown show \${showId}\`);
    return s;
  }

  /** All-or-nothing hold. Two users on DIFFERENT shows never interfere. */
  hold(showId: string, user: string, seatIds: readonly string[]): HoldResult {
    const inv = this.inv(showId);
    const now = this.clock.now();
    for (const id of seatIds) { // phase 1: check every seat
      const s = inv.seats.get(id);
      if (s === undefined) return { ok: false, reason: \`no such seat \${id}\`, expiresAt: null };
      if (!s.takeableBy(user, now)) return { ok: false, reason: \`\${id} was just taken\`, expiresAt: null };
    }
    const until = now + this.holdTtlMs;
    for (const id of seatIds) { // phase 2: take every seat
      const s = inv.seats.get(id) as SeatSlot;
      s.state = "HELD"; s.owner = user; s.holdUntil = until;
    }
    return { ok: true, reason: "held", expiresAt: until };
  }

  /** Payment succeeded: HELD -> BOOKED, but only if the hold is still mine and alive. */
  confirm(showId: string, user: string, seatIds: readonly string[]): boolean {
    const inv = this.inv(showId);
    const now = this.clock.now();
    for (const id of seatIds) {
      const s = inv.seats.get(id);
      if (s === undefined || s.state !== "HELD" || s.owner !== user || now > s.holdUntil) return false;
    }
    for (const id of seatIds) { const s = inv.seats.get(id) as SeatSlot; s.state = "BOOKED"; s.holdUntil = 0; }
    return true;
  }

  /** User closed the app / payment failed: give seats back immediately. */
  release(showId: string, user: string, seatIds: readonly string[]): void {
    const inv = this.inv(showId);
    for (const id of seatIds) {
      const s = inv.seats.get(id);
      if (s !== undefined && s.state === "HELD" && s.owner === user) s.free();
    }
  }

  /** Optional background sweeper (lazy expiry already keeps us correct; this just tidies the seat map). */
  sweepExpired(showId: string): number {
    const inv = this.inv(showId);
    const now = this.clock.now();
    let n = 0;
    for (const s of inv.seats.values()) if (s.state === "HELD" && now > s.holdUntil) { s.free(); n++; }
    return n;
  }

  stateOf(showId: string, seatId: string): SeatState { return (this.inv(showId).seats.get(seatId) as SeatSlot).state; }
}

async function main(): Promise<void> {
  const svc = new SeatBookingService({ now: () => Date.now() }, 10 * 60_000);
  svc.addShow("S1", ["B3", "B4", "B5"]);

  // 1000 rounds of two users racing for the SAME seat: both tasks start together and interleave at the await
  let doubleSold = 0;
  for (let round = 0; round < 1000; round++) {
    const show = \`R\${round}\`;
    svc.addShow(show, ["B4"]);
    const attempt = async (user: string): Promise<HoldResult> => {
      await Promise.resolve(); // let the other task run first, as a scheduler might
      return svc.hold(show, user, ["B4"]);
    };
    const [a, b] = await Promise.all([attempt("asha"), attempt("ben")]);
    if (a.ok && b.ok) doubleSold++;
  }
  console.log(\`double-sold rounds = \${doubleSold}\`); // always 0
}
void main();` },
      { lang: 'cpp', code: `enum class SeatState { Available, Held, Booked };

using Instant = chrono::system_clock::time_point;

struct HoldResult {
    bool ok;
    string reason;
    optional<Instant> expiresAt;
};

// One seat in one show (the "ShowSeat")
struct SeatSlot {
    string seatId;
    SeatState state = SeatState::Available;
    string owner;                       // user holding or owning it
    Instant holdUntil{};                // only for HELD

    // LAZY EXPIRY: an old hold is treated as free the moment anybody looks at it.
    bool takeableBy(const string& user, Instant now) const {
        switch (state) {
            case SeatState::Available: return true;
            case SeatState::Booked: return false;
            case SeatState::Held: return now > holdUntil || user == owner;
        }
        return false;
    }
    void free() { state = SeatState::Available; owner.clear(); holdUntil = Instant{}; }
};

struct ShowInventory {
    map<string, SeatSlot> seats;        // ordered -> deterministic order
    mutex lock;                         // ONE lock per show
    explicit ShowInventory(const vector<string>& seatIds) {
        for (const auto& id : seatIds) seats[id].seatId = id;
    }
};

class SeatBookingService {
    mutex showsLock;                    // guards the map of shows only
    unordered_map<string, unique_ptr<ShowInventory>> shows;
    function<Instant()> clock;
    chrono::seconds holdTtl;

    ShowInventory& inv(const string& showId) {
        lock_guard<mutex> g(showsLock);
        auto it = shows.find(showId);
        if (it == shows.end()) throw invalid_argument("unknown show " + showId);
        return *it->second;
    }

public:
    SeatBookingService(function<Instant()> clock, chrono::seconds holdTtl) : clock(move(clock)), holdTtl(holdTtl) {}

    void addShow(const string& showId, const vector<string>& seatIds) {
        auto fresh = make_unique<ShowInventory>(seatIds);
        lock_guard<mutex> g(showsLock);
        shows[showId] = move(fresh);
    }

    // All-or-nothing hold. Two users on DIFFERENT shows never block each other.
    HoldResult hold(const string& showId, const string& user, const vector<string>& seatIds) {
        ShowInventory& i = inv(showId);
        lock_guard<mutex> g(i.lock);                       // released on every exit path (RAII)
        Instant now = clock();
        for (const auto& id : seatIds) {                   // phase 1: check every seat
            auto it = i.seats.find(id);
            if (it == i.seats.end()) return {false, "no such seat " + id, nullopt};
            if (!it->second.takeableBy(user, now)) return {false, id + " was just taken", nullopt};
        }
        Instant until = now + holdTtl;
        for (const auto& id : seatIds) {                   // phase 2: take every seat
            SeatSlot& s = i.seats[id];
            s.state = SeatState::Held; s.owner = user; s.holdUntil = until;
        }
        return {true, "held", until};
    }

    // Payment succeeded: HELD -> BOOKED, but only if the hold is still mine and alive.
    bool confirm(const string& showId, const string& user, const vector<string>& seatIds) {
        ShowInventory& i = inv(showId);
        lock_guard<mutex> g(i.lock);
        Instant now = clock();
        for (const auto& id : seatIds) {
            auto it = i.seats.find(id);
            if (it == i.seats.end() || it->second.state != SeatState::Held || it->second.owner != user || now > it->second.holdUntil)
                return false;
        }
        for (const auto& id : seatIds) i.seats[id].state = SeatState::Booked;
        return true;
    }

    // User closed the app / payment failed: give seats back immediately.
    void release(const string& showId, const string& user, const vector<string>& seatIds) {
        ShowInventory& i = inv(showId);
        lock_guard<mutex> g(i.lock);
        for (const auto& id : seatIds) {
            auto it = i.seats.find(id);
            if (it != i.seats.end() && it->second.state == SeatState::Held && it->second.owner == user) it->second.free();
        }
    }

    // Optional background sweeper (lazy expiry already keeps us correct; this just tidies the seat map).
    int sweepExpired(const string& showId) {
        ShowInventory& i = inv(showId);
        lock_guard<mutex> g(i.lock);
        Instant now = clock();
        int n = 0;
        for (auto& [id, s] : i.seats)
            if (s.state == SeatState::Held && now > s.holdUntil) { s.free(); n++; }
        return n;
    }
};

int main() {
    SeatBookingService svc([] { return chrono::system_clock::now(); }, chrono::minutes{10});
    svc.addShow("S1", {"B3", "B4", "B5"});

    // 1000 rounds of two users racing for the SAME seat at the same instant
    int doubleSold = 0;
    for (int round = 0; round < 1000; round++) {
        string show = "R" + to_string(round);
        svc.addShow(show, {"B4"});
        latch go(1);
        HoldResult a{}, b{};
        {
            jthread ta([&] { go.wait(); a = svc.hold(show, "asha", {"B4"}); });
            jthread tb([&] { go.wait(); b = svc.hold(show, "ben", {"B4"}); });
            go.count_down();
        }                                                  // both threads are joined here
        if (a.ok && b.ok) doubleSold++;
    }
    cout << "double-sold rounds = " << doubleSold << "\\n";   // always 0
}` }
    ] }, { lang: 'java', code: BMS_CAS, alt: [
      { lang: 'python', code: `import threading
from dataclasses import dataclass, field
from typing import Generic, TypeVar

T = TypeVar("T")


class AtomicReference(Generic[T]):
    """CPython has no hardware CAS to call, so compare_and_set is emulated with a lock. Compares by identity."""

    def __init__(self, value: T) -> None:
        self._value = value
        self._lock = threading.Lock()

    def get(self) -> T:
        return self._value

    def compare_and_set(self, expected: T, new: T) -> bool:
        with self._lock:
            if self._value is not expected:
                return False
            self._value = new
            return True


@dataclass(frozen=True)
class Snap:
    """An IMMUTABLE snapshot. Changing state = swapping the whole snapshot atomically."""
    status: str
    owner: str | None
    version: int


@dataclass
class CasSeat:
    id: str
    ref: AtomicReference[Snap] = field(default_factory=lambda: AtomicReference(Snap("AVAILABLE", None, 0)))


class CasBooking:
    @staticmethod
    def hold_all(seats: list[CasSeat], user: str) -> bool:
        """Try to HOLD every seat; if any CAS loses, undo the ones we won (compensation)."""
        won: list[CasSeat] = []
        for s in seats:
            cur = s.ref.get()
            free = cur.status == "AVAILABLE"
            if not free or not s.ref.compare_and_set(cur, Snap("HELD", user, cur.version + 1)):
                for w in won:                                  # roll back our partial grab
                    mine = w.ref.get()
                    if mine.owner == user:
                        w.ref.compare_and_set(mine, Snap("AVAILABLE", None, mine.version + 1))
                return False
            won.append(s)
        return True


def main() -> None:
    row = [CasSeat("B3"), CasSeat("B4"), CasSeat("B5")]
    print(str(CasBooking.hold_all([row[0], row[1]], "asha")).lower())   # true
    print(str(CasBooking.hold_all([row[1], row[2]], "ben")).lower())    # false: B4 taken
    print(row[2].ref.get().status)                                      # AVAILABLE (rolled back)


if __name__ == "__main__":
    main()` },
      { lang: 'ts', code: `// Compare-and-set on a reference. JS has one thread, so this is a model of the idea; across Worker
// threads the same idea needs Atomics.compareExchange on a SharedArrayBuffer (see the seat-map problem).
class AtomicReference<T> {
  constructor(private value: T) {}
  get(): T { return this.value; }
  compareAndSet(expected: T, next: T): boolean {
    if (this.value !== expected) return false; // identity comparison, like Java's AtomicReference
    this.value = next;
    return true;
  }
}

// An IMMUTABLE snapshot. Changing state = swapping the whole snapshot atomically.
interface Snap { readonly status: string; readonly owner: string | null; readonly version: number }

class CasSeat {
  readonly ref = new AtomicReference<Snap>({ status: "AVAILABLE", owner: null, version: 0 });
  constructor(readonly id: string) {}
}

class CasBooking {
  /** Try to HOLD every seat; if any CAS loses, undo the ones we won (compensation). */
  static holdAll(seats: readonly CasSeat[], user: string): boolean {
    const won: CasSeat[] = [];
    for (const s of seats) {
      const cur = s.ref.get();
      const free = cur.status === "AVAILABLE";
      if (!free || !s.ref.compareAndSet(cur, { status: "HELD", owner: user, version: cur.version + 1 })) {
        for (const w of won) { // roll back our partial grab
          const mine = w.ref.get();
          if (mine.owner === user) w.ref.compareAndSet(mine, { status: "AVAILABLE", owner: null, version: mine.version + 1 });
        }
        return false;
      }
      won.push(s);
    }
    return true;
  }
}

const row = [new CasSeat("B3"), new CasSeat("B4"), new CasSeat("B5")];
console.log(CasBooking.holdAll([row[0], row[1]], "asha")); // true
console.log(CasBooking.holdAll([row[1], row[2]], "ben")); // false: B4 taken
console.log(row[2].ref.get().status); // AVAILABLE (rolled back)` },
      { lang: 'cpp', code: `// An IMMUTABLE snapshot. Changing state = swapping the whole snapshot atomically.
struct Snap {
    string status;
    string owner;           // empty = nobody
    long long version;
};

class CasSeat {
public:
    string id;
    // atomic<shared_ptr<const Snap>>: readers keep their snapshot alive while another thread swaps in a new one
    atomic<shared_ptr<const Snap>> ref{make_shared<const Snap>(Snap{"AVAILABLE", "", 0})};
    explicit CasSeat(string id) : id(move(id)) {}
};

class CasBooking {
public:
    // Try to HOLD every seat; if any CAS loses, undo the ones we won (compensation).
    static bool holdAll(const vector<CasSeat*>& seats, const string& user) {
        vector<CasSeat*> won;
        for (CasSeat* s : seats) {
            shared_ptr<const Snap> cur = s->ref.load();
            bool free = cur->status == "AVAILABLE";
            auto next = make_shared<const Snap>(Snap{"HELD", user, cur->version + 1});
            if (!free || !s->ref.compare_exchange_strong(cur, next)) {
                for (CasSeat* w : won) {                      // roll back our partial grab
                    shared_ptr<const Snap> mine = w->ref.load();
                    if (mine->owner == user)
                        w->ref.compare_exchange_strong(mine, make_shared<const Snap>(Snap{"AVAILABLE", "", mine->version + 1}));
                }
                return false;
            }
            won.push_back(s);
        }
        return true;
    }
};

int main() {
    CasSeat b3("B3"), b4("B4"), b5("B5");
    cout << boolalpha;
    cout << CasBooking::holdAll({&b3, &b4}, "asha") << "\\n";   // true
    cout << CasBooking::holdAll({&b4, &b5}, "ben") << "\\n";    // false: B4 taken
    cout << b5.ref.load()->status << "\\n";                      // AVAILABLE (rolled back)
}` }
    ] }, { lang: 'sql', code: `-- Optimistic locking in the database: the WHERE clause IS the "check", the UPDATE IS the "act".
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
    codeTitle: ['Per-show lock + hold expiry + race test', 'Lock-free CAS version with roll-back', 'Optimistic locking with a version column (SQL)'],
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
}`, alt: [
          { lang: 'python', code: `import threading
from collections.abc import Callable, Iterable


class OrderedSeatLocks:
    def __init__(self) -> None:
        self._locks: dict[str, threading.Lock] = {}
        self._guard = threading.Lock()

    def _lock_of(self, seat_id: str) -> threading.Lock:
        with self._guard:
            return self._locks.setdefault(seat_id, threading.Lock())

    def with_seats(self, seat_ids: Iterable[str], critical_section: Callable[[], None]) -> bool:
        ordered = sorted(set(seat_ids))                # unique + sorted = global order
        taken: list[threading.Lock] = []
        try:
            for seat_id in ordered:
                lock = self._lock_of(seat_id)
                lock.acquire()
                taken.append(lock)
            critical_section()
            return True
        finally:
            for lock in reversed(taken):               # reverse order
                lock.release()` },
          { lang: 'ts', code: `// JS has one thread, but async code can still deadlock: two tasks that await each other's seat locks.
class Mutex {
  private tail: Promise<void> = Promise.resolve();

  /** Resolves with a release function once every earlier holder has released. */
  lock(): Promise<() => void> {
    let release!: () => void;
    const next = new Promise<void>((resolve) => { release = resolve; });
    const previous = this.tail;
    this.tail = previous.then(() => next);
    return previous.then(() => release);
  }
}

class OrderedSeatLocks {
  private readonly locks = new Map<string, Mutex>();

  private lockOf(seatId: string): Mutex {
    let m = this.locks.get(seatId);
    if (m === undefined) { m = new Mutex(); this.locks.set(seatId, m); }
    return m;
  }

  async withSeats(seatIds: readonly string[], criticalSection: () => Promise<void> | void): Promise<boolean> {
    const sorted = [...new Set(seatIds)].sort(); // unique + sorted = global order
    const releases: (() => void)[] = [];
    try {
      for (const id of sorted) releases.push(await this.lockOf(id).lock());
      await criticalSection();
      return true;
    } finally {
      for (const release of releases.reverse()) release(); // reverse order
    }
  }
}` },
          { lang: 'cpp', code: `class OrderedSeatLocks {
    mutex guard;                                          // protects the map itself
    unordered_map<string, unique_ptr<mutex>> locks;

    mutex& lockOf(const string& seatId) {
        lock_guard<mutex> g(guard);
        auto& slot = locks[seatId];
        if (!slot) slot = make_unique<mutex>();
        return *slot;
    }

public:
    bool withSeats(const vector<string>& seatIds, const function<void()>& criticalSection) {
        set<string> sorted(seatIds.begin(), seatIds.end());    // unique + sorted = global order
        vector<unique_lock<mutex>> taken;                      // RAII: released on scope exit, even on exceptions
        for (const auto& id : sorted) taken.emplace_back(lockOf(id));
        criticalSection();
        return true;
    }
};` }
        ] },
      { title: 'Late payment callback after expiry', html: `<p>Hold until 18:10. Gateway webhook arrives at 18:12. Meanwhile Ben holds the same seats (lazy expiry let him). <code>confirm(asha)</code> checks <code>owner == asha &amp;&amp; now ≤ holdUntil</code> → false. Correct action: <b>refund Asha</b>, mark booking EXPIRED, notify her. Wrong action: "she paid, so give her the seats" — that steals from Ben and creates a double booking.</p>` },
      { title: 'Why not just a DB unique constraint?', html: `<p>A table <code>booking_seat(show_id, seat_id) UNIQUE</code> is a great <b>last line of defence</b>: a second insert fails. But it only protects the final BOOKED step — it cannot express a 10-minute HOLD that expires by itself. Production systems combine: hold in Redis/DB with expiry → pay → insert with unique constraint inside a transaction.</p>` }
    ],
    deepDive: `<p><b>Why per-show and not per-seat locks?</b> Inside one show the critical section is tiny (check + flip a few fields: microseconds). A per-show lock makes multi-seat atomicity trivial and cannot deadlock (one lock). Per-seat locks only pay off if a show has huge contention <i>and</i> long critical sections — rare in memory. At database level the trade-off flips: row-level locks are per-seat by nature, so you lock rows in sorted order (<code>SELECT ... WHERE seat_id IN (...) ORDER BY seat_id FOR UPDATE</code>).</p>
<p><b>Pessimistic vs optimistic.</b> Pessimistic (locks, <code>FOR UPDATE</code>) blocks others while you work — good when conflicts are common (blockbuster release). Optimistic (version column, CAS) never blocks but retries/fails on conflict — good when conflicts are rare (Tuesday matinee). For seat booking, a "fail fast, pick another seat" UX makes optimistic natural: there is nothing to retry, the seat is simply gone.</p>
<p><b>Fair locks and starvation.</b> A fair lock (Java's <code>new ReentrantLock(true)</code>) hands the lock out in arrival order; without fairness a hot thread can repeatedly barge in. Fairness costs throughput; for a booking queue, fairness matches user expectations.</p>
<p><b>Distributed reality.</b> With 50 app servers, a JVM lock protects nothing. Options: (1) DB as the single source of truth with conditional updates; (2) Redis <code>SET seat:S1:B4 asha NX PX 600000</code> per seat (multi-seat via a Lua script so all keys are set atomically), with a <b>fencing token</b> (version) checked at confirm time so a paused server cannot confirm a stale hold; (3) partition shows across servers so each show is owned by exactly one node (actor model) — then the in-memory per-show lock is correct again.</p>
<p><b>Virtual waiting room.</b> For mega-releases (cricket finals, Coldplay), systems put users in a queue <i>before</i> the seat map and admit a few thousand at a time — concurrency control at the front door, not just at the seat.</p>
<p><b>Testing concurrency:</b> use a start gate (<code>CountDownLatch</code>, <code>threading.Barrier</code>, <code>std::latch</code>) to release threads together, repeat thousands of rounds, assert the invariant (never two winners). Inject a clock to test expiry without sleeping.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI writes lock boilerplate instantly, so interviewers now probe <i>reasoning</i>: "Where exactly is the race window? What happens if the server pauses for 30 s (GC) between hold and confirm? Why is your lock in finally?"</p>
<p><b>Use AI as a partner:</b> <code>Here is my SeatBookingService. Act as an adversarial scheduler: list interleavings of hold/confirm/release/expiry from two users that could break the invariant "one live owner per seat".</code> Then turn each interleaving into a deterministic test with a fake clock.</p>
<p><b>Where AI goes wrong:</b> marks the field <code>volatile</code> (or <code>atomic</code>) and calls it thread-safe; uses a concurrent map but still does get-then-put (two steps); calls the payment gateway inside the lock (holding a lock across a network call); forgets to roll back partial CAS grabs; suggests an in-process lock as if it worked across multiple servers.</p>
<p><b>What you must still own:</b> naming the invariant, choosing the lock granularity, and explaining the expiry + late-callback behaviour. Those are judgement calls no autocomplete makes for you.</p>`,
    problems: [{
      title: 'Seat Hold Manager with Expiry (all-or-nothing, thread-safe)',
      level: 'Hard', tags: ['concurrency', 'locks', 'bookmyshow', 'expiry'], companies: ['BookMyShow', 'Flipkart', 'Uber', 'Atlassian'],
      statement: `<p>Implement <code>HoldManager</code> for many shows: <code>boolean hold(show, user, seats, nowMs)</code> holds <b>all</b> requested seats for <code>ttlMs</code> or none; <code>boolean confirm(show, user, seats, nowMs)</code> turns a live hold into a booking; expired holds must count as free <b>without</b> any background thread. Many threads call these methods concurrently. Holds on different shows must not block each other.</p>`,
      constraints: `up to 10<sup>4</sup> shows, ≤ 500 seats each, ≤ 10 seats per request, ttl = 600 000 ms`,
      example: `<p>ttl = 10 min. t=0: hold(S1, asha, [B3,B4]) → ${H.c('g', 'true')}. t=0: hold(S1, ben, [B4,B5]) → ${H.c('r', 'false')} (B4 held), B5 stays free. t=11 min: hold(S1, ben, [B4]) → ${H.c('g', 'true')} (asha's hold expired). t=12 min: confirm(S1, asha, [B3,B4]) → ${H.c('r', 'false')} → refund Asha.</p>`,
      brute: { why: `<p>Naive: a plain hash map and check-then-act with no lock — two threads both see "free" and both hold (double booking), and a concurrent resize of the map can even corrupt it. The "safe" brute fix — one lock around every method — is correct but makes every show in the country queue behind one lock.</p>`, code: `class NaiveHoldManager {
    private final Map<String, String> owner = new HashMap<>();     // "show:seat" -> user
    boolean hold(String show, String user, List<String> seats) {
        for (String s : seats) if (owner.containsKey(show + ":" + s)) return false;   // CHECK
        for (String s : seats) owner.put(show + ":" + s, user);                       // ACT (race window!)
        return true;                                                                  // and holds never expire
    }
}` },
      mcq: { q: 'A hold expired 2 minutes ago and no sweeper has run. Ben asks for that seat. What should happen?', options: ['Treat the expired hold as free and give it to Ben', 'Reject Ben until the sweeper runs', 'Throw an exception', 'Extend the old hold'], answer: 0, explain: 'Lazy expiry: correctness never depends on a background job. Whoever looks at an expired hold may treat it as free.' },
      hints: [`<p>Hint 1: the state per seat is (status, owner, holdUntil). "Free for user u at time t" = AVAILABLE, or HELD with holdUntil &lt; t, or HELD by u.</p>`, `<p>Hint 2: keep a thread-safe map of shows (<code>ConcurrentHashMap</code>, or a dict/unordered_map whose creation is guarded); each Show has its own lock and a plain map of seats. Lock → check all → take all → unlock in finally.</p>`, `<p>Hint 3: confirm must re-check owner and expiry under the same lock. Edge cases: unknown seat, duplicate seats in one request, re-holding your own seats (extend), confirm twice (second returns true idempotently if already BOOKED by you).</p>`],
      tests: { io: true, cases: [{ stdin: '', stdout: 'true\nfalse\ntrue\ntrue\nfalse\ntrue\ntrue\nfalse\nfalse\nfalse\ntrue\n' }] },
      solution: {
        approach: `<p>Per-show lock + two-phase (check all, then take all) + timestamps for lazy expiry. <code>computeIfAbsent</code> creates show inventories atomically. All time comes in as a parameter (or a clock) so tests are deterministic.</p>`,
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
}

class HoldManagerDemo {
    public static void main(String[] args) {
        HoldManager m = new HoldManager(600_000);
        m.addShow("S1", List.of("B3", "B4", "B5"));
        System.out.println(m.hold("S1", "asha", List.of("B3", "B4"), 0));          // true
        System.out.println(m.hold("S1", "ben", List.of("B4", "B5"), 0));           // false: B4 is asha's
        System.out.println(m.hold("S1", "ben", List.of("B5"), 0));                 // true: the failed request took nothing
        System.out.println(m.hold("S1", "ben", List.of("B4"), 660_000));           // true: asha's hold expired
        System.out.println(m.confirm("S1", "asha", List.of("B3", "B4"), 720_000)); // false -> refund
        System.out.println(m.confirm("S1", "ben", List.of("B4"), 720_000));        // true
        System.out.println(m.confirm("S1", "ben", List.of("B4"), 800_000));        // true: retry is idempotent
        System.out.println(m.hold("S1", "asha", List.of("B4"), 900_000));          // false: booked
        System.out.println(m.hold("S1", "asha", List.of("B9"), 900_000));          // false: no such seat
        System.out.println(m.hold("S9", "asha", List.of("B3"), 900_000));          // false: no such show
        System.out.println(m.hold("S1", "zoya", List.of("B5", "B5"), 900_000));    // true: duplicate seat counted once
    }
}`,
        alt: [
          { lang: 'python', code: `import threading
from dataclasses import dataclass, field
from enum import Enum


class Status(Enum):
    AVAILABLE = "AVAILABLE"
    HELD = "HELD"
    BOOKED = "BOOKED"


@dataclass
class SeatRec:
    status: Status = Status.AVAILABLE
    owner: str | None = None
    until: int = 0


@dataclass
class ShowInv:
    lock: threading.Lock = field(default_factory=threading.Lock)  # one lock per show
    seats: dict[str, SeatRec] = field(default_factory=dict)


class HoldManager:
    def __init__(self, ttl_ms: int) -> None:
        self._ttl_ms = ttl_ms
        self._shows: dict[str, ShowInv] = {}
        self._shows_lock = threading.Lock()      # guards only the creation of show inventories

    def add_show(self, show: str, seat_ids: list[str]) -> None:
        with self._shows_lock:
            inv = self._shows.setdefault(show, ShowInv())
        with inv.lock:
            for s in seat_ids:
                inv.seats.setdefault(s, SeatRec())

    @staticmethod
    def _free_for(r: SeatRec, user: str, now: int) -> bool:
        if r.status is Status.AVAILABLE:
            return True
        if r.status is Status.BOOKED:
            return False
        return now > r.until or user == r.owner  # expired, or my own hold

    def hold(self, show: str, user: str, seat_ids: list[str], now: int) -> bool:
        inv = self._shows.get(show)
        if inv is None:
            return False
        unique = sorted(set(seat_ids))
        with inv.lock:
            recs = [inv.seats.get(s) for s in unique]
            if any(r is None or not self._free_for(r, user, now) for r in recs):
                return False
            for r in recs:
                assert r is not None
                r.status, r.owner, r.until = Status.HELD, user, now + self._ttl_ms
            return True

    def confirm(self, show: str, user: str, seat_ids: list[str], now: int) -> bool:
        inv = self._shows.get(show)
        if inv is None:
            return False
        with inv.lock:
            recs: list[SeatRec] = []
            for s in seat_ids:
                r = inv.seats.get(s)
                if r is None or r.owner != user:
                    return False
                if r.status is Status.HELD and now > r.until:
                    return False
                recs.append(r)
            if all(r.status is Status.BOOKED for r in recs):
                return True                       # idempotent retry
            for r in recs:
                r.status = Status.BOOKED
            return True


def say(b: bool) -> None:
    print("true" if b else "false")


if __name__ == "__main__":
    m = HoldManager(600_000)
    m.add_show("S1", ["B3", "B4", "B5"])
    say(m.hold("S1", "asha", ["B3", "B4"], 0))
    say(m.hold("S1", "ben", ["B4", "B5"], 0))
    say(m.hold("S1", "ben", ["B5"], 0))
    say(m.hold("S1", "ben", ["B4"], 660_000))
    say(m.confirm("S1", "asha", ["B3", "B4"], 720_000))
    say(m.confirm("S1", "ben", ["B4"], 720_000))
    say(m.confirm("S1", "ben", ["B4"], 800_000))
    say(m.hold("S1", "asha", ["B4"], 900_000))
    say(m.hold("S1", "asha", ["B9"], 900_000))
    say(m.hold("S9", "asha", ["B3"], 900_000))
    say(m.hold("S1", "zoya", ["B5", "B5"], 900_000))` },
          { lang: 'ts', code: `type Status = "AVAILABLE" | "HELD" | "BOOKED";

interface SeatRec { status: Status; owner: string | null; until: number }

class HoldManager {
  private readonly shows = new Map<string, Map<string, SeatRec>>();

  constructor(private readonly ttlMs: number) {}

  // Methods have no await, so each call runs to completion before the next one starts:
  // the event loop gives the same atomicity a per-show lock gives on threads.
  addShow(show: string, seatIds: string[]): void {
    let seats = this.shows.get(show);
    if (seats === undefined) { seats = new Map(); this.shows.set(show, seats); }
    for (const s of seatIds) if (!seats.has(s)) seats.set(s, { status: "AVAILABLE", owner: null, until: 0 });
  }

  private static freeFor(r: SeatRec, user: string, now: number): boolean {
    if (r.status === "AVAILABLE") return true;
    if (r.status === "BOOKED") return false;
    return now > r.until || user === r.owner; // expired, or my own hold
  }

  hold(show: string, user: string, seatIds: string[], now: number): boolean {
    const seats = this.shows.get(show);
    if (seats === undefined) return false;
    const recs: SeatRec[] = [];
    for (const id of new Set(seatIds)) {
      const r = seats.get(id);
      if (r === undefined || !HoldManager.freeFor(r, user, now)) return false;
      recs.push(r);
    }
    for (const r of recs) { r.status = "HELD"; r.owner = user; r.until = now + this.ttlMs; }
    return true;
  }

  confirm(show: string, user: string, seatIds: string[], now: number): boolean {
    const seats = this.shows.get(show);
    if (seats === undefined) return false;
    const recs: SeatRec[] = [];
    for (const id of seatIds) {
      const r = seats.get(id);
      if (r === undefined || r.owner !== user) return false;
      if (r.status === "HELD" && now > r.until) return false;
      recs.push(r);
    }
    if (recs.every((r) => r.status === "BOOKED")) return true; // idempotent retry
    for (const r of recs) r.status = "BOOKED";
    return true;
  }
}

const m = new HoldManager(600_000);
m.addShow("S1", ["B3", "B4", "B5"]);
console.log(m.hold("S1", "asha", ["B3", "B4"], 0));
console.log(m.hold("S1", "ben", ["B4", "B5"], 0));
console.log(m.hold("S1", "ben", ["B5"], 0));
console.log(m.hold("S1", "ben", ["B4"], 660_000));
console.log(m.confirm("S1", "asha", ["B3", "B4"], 720_000));
console.log(m.confirm("S1", "ben", ["B4"], 720_000));
console.log(m.confirm("S1", "ben", ["B4"], 800_000));
console.log(m.hold("S1", "asha", ["B4"], 900_000));
console.log(m.hold("S1", "asha", ["B9"], 900_000));
console.log(m.hold("S9", "asha", ["B3"], 900_000));
console.log(m.hold("S1", "zoya", ["B5", "B5"], 900_000));` },
          { lang: 'cpp', code: `enum class Status { Available, Held, Booked };

struct SeatRec {
    Status status = Status::Available;
    string owner;
    long long until = 0;
};

struct ShowInv {
    mutex lock;                                  // one lock per show
    map<string, SeatRec> seats;
};

class HoldManager {
    long long ttlMs;
    mutex showsLock;                             // guards only the creation of inventories
    unordered_map<string, unique_ptr<ShowInv>> shows;

    ShowInv* find(const string& show) {
        lock_guard<mutex> g(showsLock);
        auto it = shows.find(show);
        return it == shows.end() ? nullptr : it->second.get();
    }
    static bool freeFor(const SeatRec& r, const string& user, long long now) {
        if (r.status == Status::Available) return true;
        if (r.status == Status::Booked) return false;
        return now > r.until || user == r.owner;  // expired, or my own hold
    }

public:
    explicit HoldManager(long long ttlMs) : ttlMs(ttlMs) {}

    void addShow(const string& show, const vector<string>& seatIds) {
        ShowInv* inv;
        {
            lock_guard<mutex> g(showsLock);
            auto& slot = shows[show];
            if (!slot) slot = make_unique<ShowInv>();
            inv = slot.get();
        }
        lock_guard<mutex> g(inv->lock);
        for (const auto& s : seatIds) inv->seats.try_emplace(s);
    }

    bool hold(const string& show, const string& user, const vector<string>& seatIds, long long now) {
        ShowInv* inv = find(show);
        if (!inv) return false;
        set<string> unique(seatIds.begin(), seatIds.end());
        lock_guard<mutex> g(inv->lock);
        for (const auto& s : unique) {
            auto it = inv->seats.find(s);
            if (it == inv->seats.end() || !freeFor(it->second, user, now)) return false;
        }
        for (const auto& s : unique) {
            SeatRec& r = inv->seats[s];
            r.status = Status::Held; r.owner = user; r.until = now + ttlMs;
        }
        return true;
    }

    bool confirm(const string& show, const string& user, const vector<string>& seatIds, long long now) {
        ShowInv* inv = find(show);
        if (!inv) return false;
        lock_guard<mutex> g(inv->lock);
        bool allBooked = true;
        for (const auto& s : seatIds) {
            auto it = inv->seats.find(s);
            if (it == inv->seats.end() || it->second.owner != user) return false;
            if (it->second.status != Status::Booked) allBooked = false;
            if (it->second.status == Status::Held && now > it->second.until) return false;
        }
        if (allBooked) return true;              // idempotent retry
        for (const auto& s : seatIds) inv->seats[s].status = Status::Booked;
        return true;
    }
};

int main() {
    cout << boolalpha;
    HoldManager m(600'000);
    m.addShow("S1", {"B3", "B4", "B5"});
    cout << m.hold("S1", "asha", {"B3", "B4"}, 0) << "\\n";
    cout << m.hold("S1", "ben", {"B4", "B5"}, 0) << "\\n";
    cout << m.hold("S1", "ben", {"B5"}, 0) << "\\n";
    cout << m.hold("S1", "ben", {"B4"}, 660'000) << "\\n";
    cout << m.confirm("S1", "asha", {"B3", "B4"}, 720'000) << "\\n";
    cout << m.confirm("S1", "ben", {"B4"}, 720'000) << "\\n";
    cout << m.confirm("S1", "ben", {"B4"}, 800'000) << "\\n";
    cout << m.hold("S1", "asha", {"B4"}, 900'000) << "\\n";
    cout << m.hold("S1", "asha", {"B9"}, 900'000) << "\\n";
    cout << m.hold("S9", "asha", {"B3"}, 900'000) << "\\n";
    cout << m.hold("S1", "zoya", {"B5", "B5"}, 900'000) << "\\n";
}` }
        ],
        complexity: `<p>hold/confirm: O(k log k) for k requested seats (sorted unique ids), O(1) map lookups. Lock held only for those few operations. Memory O(total seats). Different shows run fully in parallel.</p>`,
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
        if (sum != 10_000) throw new IllegalArgumentException("percentages add to " + String.format("%.2f", sum / 100.0) + "%, need 100%");
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

        // failure paths: nothing is recorded when an expense is rejected
        try { svc.addExpense("G1", "Dinner", "chen", 1000_00, SplitType.PERCENT, List.of("asha", "ben", "chen"), List.of(5000L, 3000L, 3000L)); }
        catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }
        try { svc.addExpense("G1", "Taxi", "ben", 300_00, SplitType.EXACT, List.of("ben", "chen"), List.of(100_00L, 190_00L)); }
        catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }
        try { svc.addExpense("G1", "Taxi", "dev", 300_00, SplitType.EQUAL, List.of("dev", "ben"), List.of()); }
        catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }
        System.out.println(goa.expenses.size() + " expenses recorded");

        svc.settleUp("G1", "ben", "asha", 333_33);           // ben pays asha back in full
        goa.sheet.describe().forEach(System.out::println);
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
    code: [{ lang: 'java', code: SW_MODEL, alt: [
      { lang: 'python', code: `import threading
from abc import ABC, abstractmethod
from collections.abc import Sequence
from dataclasses import dataclass, field
from enum import Enum

# Money in paise (int). Python ints never overflow, but they are still never floats for money.


class SplitType(Enum):
    EQUAL = "EQUAL"
    EXACT = "EXACT"
    PERCENT = "PERCENT"
    SHARES = "SHARES"


@dataclass(frozen=True)
class Split:
    user_id: str
    amount_paise: int


def by_weights(total: int, users: Sequence[str], weights: Sequence[int]) -> list[Split]:
    """Split total in proportion to weights. Leftover paise go to the largest rounding remainders,
    so the parts ALWAYS add up to the total exactly (no paisa created or lost)."""
    if len(users) != len(weights):
        raise ValueError("one weight per user")
    if any(w < 0 for w in weights):
        raise ValueError("negative weight")
    sum_w = sum(weights)
    if sum_w == 0:
        raise ValueError("weights add up to zero")
    amt = [total * w // sum_w for w in weights]
    order = sorted(range(len(users)), key=lambda i: (-(total * weights[i] % sum_w), i))
    for i in order[: total - sum(amt)]:
        amt[i] += 1
    return [Split(u, a) for u, a in zip(users, amt)]


class SplitStrategy(ABC):
    @abstractmethod
    def split(self, total: int, users: Sequence[str], values: Sequence[int]) -> list[Split]:
        """values: ignored for EQUAL, paise for EXACT, basis points for PERCENT (12.5% = 1250), weights for SHARES."""


class EqualSplit(SplitStrategy):
    def split(self, total: int, users: Sequence[str], values: Sequence[int]) -> list[Split]:
        return by_weights(total, users, [1] * len(users))


class ExactSplit(SplitStrategy):
    def split(self, total: int, users: Sequence[str], values: Sequence[int]) -> list[Split]:
        if len(values) != len(users):
            raise ValueError("one amount per user")
        if sum(values) != total:
            raise ValueError(f"exact amounts add to {sum(values)}, bill is {total}")
        return [Split(u, a) for u, a in zip(users, values)]


class PercentSplit(SplitStrategy):
    def split(self, total: int, users: Sequence[str], values: Sequence[int]) -> list[Split]:
        if sum(values) != 10_000:
            raise ValueError(f"percentages add to {sum(values) / 100:.2f}%, need 100%")
        return by_weights(total, users, values)


class ShareSplit(SplitStrategy):
    def split(self, total: int, users: Sequence[str], values: Sequence[int]) -> list[Split]:
        return by_weights(total, users, values)       # "Asha 2 shares, Ben 1 share"


@dataclass(frozen=True)
class Expense:
    id: str
    description: str
    paid_by: str
    total_paise: int
    type: SplitType
    splits: tuple[Split, ...]


def fmt_money(paise: int) -> str:
    a = abs(paise)
    return f"{'-' if paise < 0 else ''}Rs {a // 100}.{a % 100:02d}"


class BalanceSheet:
    """owes[a][b] = how much a owes b. Kept antisymmetric: owes[b][a] == -owes[a][b]."""

    def __init__(self) -> None:
        self._owes: dict[str, dict[str, int]] = {}

    def apply(self, e: Expense) -> None:
        for s in e.splits:
            if s.user_id != e.paid_by:                    # you never owe yourself
                self._add(s.user_id, e.paid_by, s.amount_paise)

    def settle(self, payer: str, receiver: str, amount: int) -> None:
        self._add(payer, receiver, -amount)

    def _add(self, debtor: str, creditor: str, amt: int) -> None:
        row = self._owes.setdefault(debtor, {})
        row[creditor] = row.get(creditor, 0) + amt
        back = self._owes.setdefault(creditor, {})
        back[debtor] = back.get(debtor, 0) - amt

    def owes(self, a: str, b: str) -> int:
        return self._owes.get(a, {}).get(b, 0)

    def net(self) -> dict[str, int]:
        """+ means "gets back", - means "owes overall". Sum over everyone is always 0."""
        out: dict[str, int] = {}
        for a in sorted(self._owes):
            for v in self._owes[a].values():
                out[a] = out.get(a, 0) - v
        return out

    def describe(self) -> list[str]:
        return [f"{a} owes {b} {fmt_money(v)}"
                for a in sorted(self._owes) for b, v in sorted(self._owes[a].items()) if v > 0]


@dataclass
class Group:
    id: str
    name: str
    members: set[str]
    expenses: list[Expense] = field(default_factory=list)
    sheet: BalanceSheet = field(default_factory=BalanceSheet)


class ExpenseService:
    def __init__(self) -> None:
        self._strategies: dict[SplitType, SplitStrategy] = {
            SplitType.EQUAL: EqualSplit(), SplitType.EXACT: ExactSplit(),
            SplitType.PERCENT: PercentSplit(), SplitType.SHARES: ShareSplit(),
        }
        self._groups: dict[str, Group] = {}
        self._next_id = 1
        self._lock = threading.Lock()

    def create_group(self, id: str, name: str, members: Sequence[str]) -> Group:
        g = Group(id, name, set(members))
        self._groups[id] = g
        return g

    def add_expense(self, group_id: str, desc: str, paid_by: str, total_paise: int, type: SplitType,
                    among: Sequence[str], values: Sequence[int]) -> Expense:
        with self._lock:
            g = self._groups.get(group_id)
            if g is None:
                raise ValueError(f"no group {group_id}")
            if total_paise <= 0:
                raise ValueError("amount must be positive")
            if paid_by not in g.members or not g.members.issuperset(among):
                raise ValueError("everyone must be in the group")
            if len(set(among)) != len(among):
                raise ValueError("duplicate participant")
            splits = self._strategies[type].split(total_paise, among, values)   # validates & computes
            e = Expense(f"E{self._next_id}", desc, paid_by, total_paise, type, tuple(splits))
            self._next_id += 1
            g.expenses.append(e)
            g.sheet.apply(e)
            return e

    def settle_up(self, group_id: str, payer: str, receiver: str, amount_paise: int) -> None:
        with self._lock:
            self._groups[group_id].sheet.settle(payer, receiver, amount_paise)


def fmt_net(net: dict[str, int]) -> str:
    return "{" + ", ".join(f"{k}={v}" for k, v in net.items()) + "}"


def main() -> None:
    svc = ExpenseService()
    goa = svc.create_group("G1", "Goa trip", ["asha", "ben", "chen"])
    trio = ["asha", "ben", "chen"]
    svc.add_expense("G1", "Hotel", "asha", 900_00, SplitType.EQUAL, trio, [])
    svc.add_expense("G1", "Scooters", "ben", 300_00, SplitType.EXACT, ["ben", "chen"], [100_00, 200_00])
    svc.add_expense("G1", "Dinner", "chen", 1000_00, SplitType.PERCENT, trio, [5000, 3000, 2000])
    svc.add_expense("G1", "Snacks", "asha", 100_00, SplitType.EQUAL, trio, [])
    for line in goa.sheet.describe():
        print(line)
    print(fmt_net(goa.sheet.net()))                      # values sum to 0

    # failure paths: nothing is recorded when an expense is rejected
    bad = [
        ("chen", 1000_00, SplitType.PERCENT, trio, [5000, 3000, 3000]),
        ("ben", 300_00, SplitType.EXACT, ["ben", "chen"], [100_00, 190_00]),
        ("dev", 300_00, SplitType.EQUAL, ["dev", "ben"], []),
    ]
    for paid_by, total, kind, among, values in bad:
        try:
            svc.add_expense("G1", "Taxi", paid_by, total, kind, among, values)
        except ValueError as e:
            print(e)
    print(f"{len(goa.expenses)} expenses recorded")

    svc.settle_up("G1", "ben", "asha", 333_33)           # ben pays asha back in full
    for line in goa.sheet.describe():
        print(line)


if __name__ == "__main__":
    main()` },
      { lang: 'ts', code: `// Money in paise (integers). JS Number is exact up to 2^53, plenty for paise.
type SplitType = "EQUAL" | "EXACT" | "PERCENT" | "SHARES";

interface Split { readonly userId: string; readonly amountPaise: number }

/** Split total in proportion to weights. Leftover paise go to the largest rounding remainders,
 *  so the parts ALWAYS add up to the total exactly (no paisa created or lost). */
function byWeights(total: number, users: readonly string[], weights: readonly number[]): Split[] {
  if (users.length !== weights.length) throw new Error("one weight per user");
  if (weights.some((w) => w < 0)) throw new Error("negative weight");
  const sumW = weights.reduce((a, b) => a + b, 0);
  if (sumW === 0) throw new Error("weights add up to zero");
  const amt = weights.map((w) => Math.floor((total * w) / sumW));
  const left = total - amt.reduce((a, b) => a + b, 0);
  const order = users.map((_, i) => i).sort((a, b) => ((total * weights[b]) % sumW) - ((total * weights[a]) % sumW) || a - b);
  for (const i of order.slice(0, left)) amt[i]++;
  return users.map((u, i) => ({ userId: u, amountPaise: amt[i] }));
}

interface SplitStrategy {
  /** values: ignored for EQUAL, paise for EXACT, basis points for PERCENT (12.5% = 1250), weights for SHARES */
  split(total: number, users: readonly string[], values: readonly number[]): Split[];
}

class EqualSplit implements SplitStrategy {
  split(total: number, users: readonly string[]): Split[] { return byWeights(total, users, users.map(() => 1)); }
}

class ExactSplit implements SplitStrategy {
  split(total: number, users: readonly string[], amounts: readonly number[]): Split[] {
    if (amounts.length !== users.length) throw new Error("one amount per user");
    const sum = amounts.reduce((a, b) => a + b, 0);
    if (sum !== total) throw new Error(\`exact amounts add to \${sum}, bill is \${total}\`);
    return users.map((u, i) => ({ userId: u, amountPaise: amounts[i] }));
  }
}

class PercentSplit implements SplitStrategy {
  split(total: number, users: readonly string[], basisPoints: readonly number[]): Split[] {
    const sum = basisPoints.reduce((a, b) => a + b, 0);
    if (sum !== 10_000) throw new Error(\`percentages add to \${(sum / 100).toFixed(2)}%, need 100%\`);
    return byWeights(total, users, basisPoints);
  }
}

class ShareSplit implements SplitStrategy {
  split(total: number, users: readonly string[], shares: readonly number[]): Split[] {
    return byWeights(total, users, shares); // "Asha 2 shares, Ben 1 share"
  }
}

interface Expense {
  readonly id: string;
  readonly description: string;
  readonly paidBy: string;
  readonly totalPaise: number;
  readonly type: SplitType;
  readonly splits: readonly Split[];
}

function fmtMoney(paise: number): string {
  const a = Math.abs(paise);
  return \`\${paise < 0 ? "-" : ""}Rs \${Math.floor(a / 100)}.\${String(a % 100).padStart(2, "0")}\`;
}

/** owes[a][b] = how much a owes b. Kept antisymmetric: owes[b][a] == -owes[a][b]. */
class BalanceSheet {
  private readonly owesMap = new Map<string, Map<string, number>>();

  apply(e: Expense): void {
    for (const s of e.splits) if (s.userId !== e.paidBy) this.add(s.userId, e.paidBy, s.amountPaise); // you never owe yourself
  }

  settle(payer: string, receiver: string, amount: number): void { this.add(payer, receiver, -amount); }

  private add(debtor: string, creditor: string, amt: number): void {
    this.bump(debtor, creditor, amt);
    this.bump(creditor, debtor, -amt);
  }

  private bump(a: string, b: string, delta: number): void {
    let row = this.owesMap.get(a);
    if (row === undefined) { row = new Map(); this.owesMap.set(a, row); }
    row.set(b, (row.get(b) ?? 0) + delta);
  }

  owes(a: string, b: string): number { return this.owesMap.get(a)?.get(b) ?? 0; }

  /** + means "gets back", - means "owes overall". Sum over everyone is always 0. */
  net(): Map<string, number> {
    const out = new Map<string, number>();
    for (const a of [...this.owesMap.keys()].sort()) {
      for (const v of (this.owesMap.get(a) as Map<string, number>).values()) out.set(a, (out.get(a) ?? 0) - v);
    }
    return out;
  }

  describe(): string[] {
    const lines: string[] = [];
    for (const a of [...this.owesMap.keys()].sort()) {
      const row = this.owesMap.get(a) as Map<string, number>;
      for (const b of [...row.keys()].sort()) {
        const v = row.get(b) as number;
        if (v > 0) lines.push(\`\${a} owes \${b} \${fmtMoney(v)}\`);
      }
    }
    return lines;
  }
}

class Group {
  readonly members: Set<string>;
  readonly expenses: Expense[] = [];
  readonly sheet = new BalanceSheet();
  constructor(readonly id: string, readonly name: string, members: Iterable<string>) { this.members = new Set(members); }
}

class ExpenseService {
  private readonly strategies: Record<SplitType, SplitStrategy> = {
    EQUAL: new EqualSplit(), EXACT: new ExactSplit(), PERCENT: new PercentSplit(), SHARES: new ShareSplit(),
  };
  private readonly groups = new Map<string, Group>();
  private nextId = 1;

  createGroup(id: string, name: string, members: Iterable<string>): Group {
    const g = new Group(id, name, members);
    this.groups.set(id, g);
    return g;
  }

  addExpense(groupId: string, desc: string, paidBy: string, totalPaise: number, type: SplitType,
             among: readonly string[], values: readonly number[]): Expense {
    const g = this.groups.get(groupId);
    if (g === undefined) throw new Error(\`no group \${groupId}\`);
    if (totalPaise <= 0) throw new Error("amount must be positive");
    if (!g.members.has(paidBy) || !among.every((u) => g.members.has(u))) throw new Error("everyone must be in the group");
    if (new Set(among).size !== among.length) throw new Error("duplicate participant");
    const splits = this.strategies[type].split(totalPaise, among, values); // validates & computes
    const e: Expense = { id: \`E\${this.nextId++}\`, description: desc, paidBy, totalPaise, type, splits };
    g.expenses.push(e);
    g.sheet.apply(e);
    return e;
  }

  settleUp(groupId: string, payer: string, receiver: string, amountPaise: number): void {
    (this.groups.get(groupId) as Group).sheet.settle(payer, receiver, amountPaise);
  }
}

const fmtNet = (m: Map<string, number>): string => \`{\${[...m].map(([k, v]) => \`\${k}=\${v}\`).join(", ")}}\`;

const svc = new ExpenseService();
const trio = ["asha", "ben", "chen"];
const goa = svc.createGroup("G1", "Goa trip", trio);
svc.addExpense("G1", "Hotel", "asha", 900_00, "EQUAL", trio, []);
svc.addExpense("G1", "Scooters", "ben", 300_00, "EXACT", ["ben", "chen"], [100_00, 200_00]);
svc.addExpense("G1", "Dinner", "chen", 1000_00, "PERCENT", trio, [5000, 3000, 2000]);
svc.addExpense("G1", "Snacks", "asha", 100_00, "EQUAL", trio, []);
for (const line of goa.sheet.describe()) console.log(line);
console.log(fmtNet(goa.sheet.net())); // values sum to 0

// failure paths: nothing is recorded when an expense is rejected
const bad: [string, number, SplitType, string[], number[]][] = [
  ["chen", 1000_00, "PERCENT", trio, [5000, 3000, 3000]],
  ["ben", 300_00, "EXACT", ["ben", "chen"], [100_00, 190_00]],
  ["dev", 300_00, "EQUAL", ["dev", "ben"], []],
];
for (const [paidBy, total, kind, among, values] of bad) {
  try {
    svc.addExpense("G1", "Taxi", paidBy, total, kind, among, values);
  } catch (e) {
    console.log((e as Error).message);
  }
}
console.log(\`\${goa.expenses.length} expenses recorded\`);

svc.settleUp("G1", "ben", "asha", 333_33); // ben pays asha back in full
for (const line of goa.sheet.describe()) console.log(line);` },
      { lang: 'cpp', code: `// Money in paise (long long). Never double for money.
enum class SplitType { Equal, Exact, Percent, Shares };

struct Split { string userId; long long amountPaise; };

// Split total in proportion to weights. Leftover paise go to the largest rounding remainders,
// so the parts ALWAYS add up to the total exactly (no paisa created or lost).
vector<Split> byWeights(long long total, const vector<string>& users, const vector<long long>& weights) {
    if (users.size() != weights.size()) throw invalid_argument("one weight per user");
    long long sumW = 0;
    for (long long w : weights) {
        if (w < 0) throw invalid_argument("negative weight");
        sumW += w;
    }
    if (sumW == 0) throw invalid_argument("weights add up to zero");
    size_t n = users.size();
    vector<long long> amt(n);
    long long given = 0;
    for (size_t i = 0; i < n; i++) { amt[i] = total * weights[i] / sumW; given += amt[i]; }
    vector<size_t> order(n);
    iota(order.begin(), order.end(), 0);
    sort(order.begin(), order.end(), [&](size_t a, size_t b) {
        long long ra = total * weights[a] % sumW, rb = total * weights[b] % sumW;
        return ra != rb ? ra > rb : a < b;
    });
    for (long long k = 0; k < total - given; k++) amt[order[k]]++;
    vector<Split> out;
    for (size_t i = 0; i < n; i++) out.push_back({users[i], amt[i]});
    return out;
}

class SplitStrategy {
public:
    virtual ~SplitStrategy() = default;
    // values: ignored for EQUAL, paise for EXACT, basis points for PERCENT (12.5% = 1250), weights for SHARES
    virtual vector<Split> split(long long total, const vector<string>& users, const vector<long long>& values) const = 0;
};

class EqualSplit : public SplitStrategy {
public:
    vector<Split> split(long long total, const vector<string>& users, const vector<long long>&) const override {
        return byWeights(total, users, vector<long long>(users.size(), 1));
    }
};

class ExactSplit : public SplitStrategy {
public:
    vector<Split> split(long long total, const vector<string>& users, const vector<long long>& amounts) const override {
        if (amounts.size() != users.size()) throw invalid_argument("one amount per user");
        long long sum = accumulate(amounts.begin(), amounts.end(), 0LL);
        if (sum != total) throw invalid_argument("exact amounts add to " + to_string(sum) + ", bill is " + to_string(total));
        vector<Split> out;
        for (size_t i = 0; i < users.size(); i++) out.push_back({users[i], amounts[i]});
        return out;
    }
};

class PercentSplit : public SplitStrategy {
public:
    vector<Split> split(long long total, const vector<string>& users, const vector<long long>& basisPoints) const override {
        long long sum = accumulate(basisPoints.begin(), basisPoints.end(), 0LL);
        if (sum != 10'000) {
            char buf[32];
            snprintf(buf, sizeof buf, "%.2f", sum / 100.0);
            throw invalid_argument(string("percentages add to ") + buf + "%, need 100%");
        }
        return byWeights(total, users, basisPoints);
    }
};

class ShareSplit : public SplitStrategy {
public:
    vector<Split> split(long long total, const vector<string>& users, const vector<long long>& shares) const override {
        return byWeights(total, users, shares);       // "Asha 2 shares, Ben 1 share"
    }
};

struct Expense {
    string id, description, paidBy;
    long long totalPaise;
    SplitType type;
    vector<Split> splits;
};

string fmtMoney(long long paise) {
    long long a = llabs(paise);
    char buf[48];
    snprintf(buf, sizeof buf, "%sRs %lld.%02lld", paise < 0 ? "-" : "", a / 100, a % 100);
    return buf;
}

// owes[a][b] = how much a owes b. Kept antisymmetric: owes[b][a] == -owes[a][b].
class BalanceSheet {
    map<string, map<string, long long>> owesMap;       // ordered, so output is deterministic

    void add(const string& debtor, const string& creditor, long long amt) {
        owesMap[debtor][creditor] += amt;
        owesMap[creditor][debtor] -= amt;
    }

public:
    void apply(const Expense& e) {
        for (const auto& s : e.splits)
            if (s.userId != e.paidBy) add(s.userId, e.paidBy, s.amountPaise);       // you never owe yourself
    }
    void settle(const string& payer, const string& receiver, long long amount) { add(payer, receiver, -amount); }

    long long owes(const string& a, const string& b) const {
        auto row = owesMap.find(a);
        if (row == owesMap.end()) return 0;
        auto cell = row->second.find(b);
        return cell == row->second.end() ? 0 : cell->second;
    }

    // + means "gets back", - means "owes overall". Sum over everyone is always 0.
    map<string, long long> net() const {
        map<string, long long> out;
        for (const auto& [a, row] : owesMap)
            for (const auto& [b, v] : row) out[a] -= v;
        return out;
    }

    vector<string> describe() const {
        vector<string> out;
        for (const auto& [a, row] : owesMap)
            for (const auto& [b, v] : row)
                if (v > 0) out.push_back(a + " owes " + b + " " + fmtMoney(v));
        return out;
    }
};

struct Group {
    string id, name;
    set<string> members;
    vector<Expense> expenses;
    BalanceSheet sheet;
};

class ExpenseService {
    map<SplitType, unique_ptr<SplitStrategy>> strategies;
    map<string, Group> groups;
    mutex lock;
    long long nextId = 1;

public:
    ExpenseService() {
        strategies[SplitType::Equal] = make_unique<EqualSplit>();
        strategies[SplitType::Exact] = make_unique<ExactSplit>();
        strategies[SplitType::Percent] = make_unique<PercentSplit>();
        strategies[SplitType::Shares] = make_unique<ShareSplit>();
    }

    Group& createGroup(const string& id, const string& name, const vector<string>& members) {
        Group& g = groups[id];
        g.id = id; g.name = name; g.members = set<string>(members.begin(), members.end());
        return g;
    }

    const Expense& addExpense(const string& groupId, const string& desc, const string& paidBy, long long totalPaise,
                              SplitType type, const vector<string>& among, const vector<long long>& values) {
        lock_guard<mutex> g(lock);
        auto it = groups.find(groupId);
        if (it == groups.end()) throw invalid_argument("no group " + groupId);
        Group& grp = it->second;
        if (totalPaise <= 0) throw invalid_argument("amount must be positive");
        bool everyoneIn = grp.members.count(paidBy) > 0 &&
                          all_of(among.begin(), among.end(), [&](const string& u) { return grp.members.count(u) > 0; });
        if (!everyoneIn) throw invalid_argument("everyone must be in the group");
        if (set<string>(among.begin(), among.end()).size() != among.size()) throw invalid_argument("duplicate participant");
        vector<Split> splits = strategies.at(type)->split(totalPaise, among, values);   // validates & computes
        grp.expenses.push_back({"E" + to_string(nextId++), desc, paidBy, totalPaise, type, move(splits)});
        grp.sheet.apply(grp.expenses.back());
        return grp.expenses.back();
    }

    void settleUp(const string& groupId, const string& payer, const string& receiver, long long amountPaise) {
        lock_guard<mutex> g(lock);
        groups.at(groupId).sheet.settle(payer, receiver, amountPaise);
    }
};

string fmtNet(const map<string, long long>& m) {
    string s = "{";
    for (const auto& [k, v] : m) s += (s.size() > 1 ? ", " : "") + k + "=" + to_string(v);
    return s + "}";
}

int main() {
    ExpenseService svc;
    vector<string> trio = {"asha", "ben", "chen"};
    Group& goa = svc.createGroup("G1", "Goa trip", trio);
    svc.addExpense("G1", "Hotel", "asha", 900'00, SplitType::Equal, trio, {});
    svc.addExpense("G1", "Scooters", "ben", 300'00, SplitType::Exact, {"ben", "chen"}, {100'00, 200'00});
    svc.addExpense("G1", "Dinner", "chen", 1000'00, SplitType::Percent, trio, {5000, 3000, 2000});
    svc.addExpense("G1", "Snacks", "asha", 100'00, SplitType::Equal, trio, {});
    for (const auto& line : goa.sheet.describe()) cout << line << "\\n";
    cout << fmtNet(goa.sheet.net()) << "\\n";                  // values sum to 0

    // failure paths: nothing is recorded when an expense is rejected
    struct Bad { string paidBy; long long total; SplitType type; vector<string> among; vector<long long> values; };
    vector<Bad> bad = {
        {"chen", 1000'00, SplitType::Percent, trio, {5000, 3000, 3000}},
        {"ben", 300'00, SplitType::Exact, {"ben", "chen"}, {100'00, 190'00}},
        {"dev", 300'00, SplitType::Equal, {"dev", "ben"}, {}},
    };
    for (const auto& b : bad) {
        try {
            svc.addExpense("G1", "Taxi", b.paidBy, b.total, b.type, b.among, b.values);
        } catch (const invalid_argument& e) {
            cout << e.what() << "\\n";
        }
    }
    cout << goa.expenses.size() << " expenses recorded\\n";

    svc.settleUp("G1", "ben", "asha", 333'33);                 // ben pays asha back in full
    for (const auto& line : goa.sheet.describe()) cout << line << "\\n";
}` }
    ] }],
    codeTitle: 'Splitwise core: strategies, exact paise, balance sheet (a complete program)',
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
        if (sum != 10_000) throw new IllegalArgumentException("must add to 100%, got " + String.format("%.2f", sum / 100.0) + "%");
        long[] out = new long[basisPoints.length];
        long given = 0;
        for (int i = 0; i < out.length; i++) { out[i] = totalPaise * basisPoints[i] / 10_000; given += out[i]; }
        out[0] += totalPaise - given;                 // simple leftover rule: first person absorbs it
        return out;
    }
    public static void main(String[] args) {
        System.out.println(Arrays.toString(split(1000_00, new long[]{5000, 3000, 2000})));   // [50000, 30000, 20000]
        System.out.println(Arrays.toString(split(100_00, new long[]{3333, 3333, 3334})));    // [3333, 3333, 3334]
        System.out.println(Arrays.toString(split(100, new long[]{3333, 3333, 3334})));       // [34, 33, 33]: first person absorbs the paisa
        try { split(1000_00, new long[]{5000, 3000, 3000}); }
        catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }           // must add to 100%, got 110.00%
    }
}`, alt: [
          { lang: 'python', code: `class PercentCheck:
    @staticmethod
    def split(total_paise: int, basis_points: list[int]) -> list[int]:
        total_bp = sum(basis_points)
        if total_bp != 10_000:
            raise ValueError(f"must add to 100%, got {total_bp / 100:.2f}%")
        out = [total_paise * bp // 10_000 for bp in basis_points]
        out[0] += total_paise - sum(out)              # simple leftover rule: first person absorbs it
        return out


if __name__ == "__main__":
    print(PercentCheck.split(1000_00, [5000, 3000, 2000]))
    print(PercentCheck.split(100_00, [3333, 3333, 3334]))
    print(PercentCheck.split(100, [3333, 3333, 3334]))
    try:
        PercentCheck.split(1000_00, [5000, 3000, 3000])
    except ValueError as e:
        print(e)` },
          { lang: 'ts', code: `class PercentCheck {
  static split(totalPaise: number, basisPoints: readonly number[]): number[] {
    const sum = basisPoints.reduce((a, b) => a + b, 0);
    if (sum !== 10_000) throw new Error(\`must add to 100%, got \${(sum / 100).toFixed(2)}%\`);
    const out = basisPoints.map((bp) => Math.floor((totalPaise * bp) / 10_000));
    out[0] += totalPaise - out.reduce((a, b) => a + b, 0); // simple leftover rule: first person absorbs it
    return out;
  }
}

console.log(\`[\${PercentCheck.split(1000_00, [5000, 3000, 2000]).join(", ")}]\`);
console.log(\`[\${PercentCheck.split(100_00, [3333, 3333, 3334]).join(", ")}]\`);
console.log(\`[\${PercentCheck.split(100, [3333, 3333, 3334]).join(", ")}]\`);
try {
  PercentCheck.split(1000_00, [5000, 3000, 3000]);
} catch (e) {
  console.log((e as Error).message);
}` },
          { lang: 'cpp', code: `class PercentCheck {
public:
    static vector<long long> split(long long totalPaise, const vector<long long>& basisPoints) {
        long long sum = accumulate(basisPoints.begin(), basisPoints.end(), 0LL);
        if (sum != 10'000) {
            char buf[32];
            snprintf(buf, sizeof buf, "%.2f", sum / 100.0);
            throw invalid_argument(string("must add to 100%, got ") + buf + "%");
        }
        vector<long long> out;
        for (long long bp : basisPoints) out.push_back(totalPaise * bp / 10'000);
        out[0] += totalPaise - accumulate(out.begin(), out.end(), 0LL);    // simple leftover rule: first person absorbs it
        return out;
    }
};

void show(const vector<long long>& v) {
    cout << "[";
    for (size_t i = 0; i < v.size(); i++) cout << (i ? ", " : "") << v[i];
    cout << "]\\n";
}

int main() {
    show(PercentCheck::split(1000'00, {5000, 3000, 2000}));
    show(PercentCheck::split(100'00, {3333, 3333, 3334}));
    show(PercentCheck::split(100, {3333, 3333, 3334}));
    try {
        PercentCheck::split(1000'00, {5000, 3000, 3000});
    } catch (const invalid_argument& e) {
        cout << e.what() << "\\n";
    }
}` }
        ] },
      { title: 'Payer not in the split', html: `<p>Asha buys movie tickets for Ben and Chen only: ₹600, participants {Ben, Chen}. Shares 300/300. Updates: Ben owes Asha 300, Chen owes Asha 300. Asha's "paid" = 600, "share" = 0, net = +600. A common bug is to always add the payer to the participants — then Asha would "owe herself" ₹200 and the others only ₹200 each.</p>` },
      { title: 'Netting in the pairwise ledger', html: `<p>Ben owes Asha ₹300 (hotel). Later Asha owes Ben ₹100 (scooter). Because we store <code>owes[Asha][Ben] = -owes[Ben][Asha]</code>, the second update does owes[Asha][Ben] += 100 → −300 + 100 = −200, i.e. ${H.c('g', 'Ben owes Asha ₹200')}. One number per pair, always already netted.</p>` }
    ],
    deepDive: `<p><b>Event log vs balance cache.</b> The expense list is the <i>source of truth</i> (an append-only event log). The BalanceSheet is a <b>materialised view</b> that can be rebuilt by replaying expenses. Editing an expense = apply the negative of the old one, then the new one (or store an <code>ExpenseVersion</code>). Deleting = apply the reverse. This is event sourcing in miniature and makes audits trivial.</p>
<p><b>Largest-remainder rounding</b> (Hamilton's method) gives each person floor(exact share) and hands leftover paise to the biggest fractional parts. It guarantees Σ = total and each share differs from the exact value by &lt; 1 paisa. Deterministic tie-breaking (by user order) keeps results reproducible across servers.</p>
<p><b>Multi-currency.</b> Store each expense in its own currency; keep balances per (pair, currency). Converting at expense time bakes in an exchange rate; converting at display time changes balances when rates move — product must choose. Never mix currencies in one <code>long</code>.</p>
<p><b>Concurrency.</b> Two people adding expenses to the same group at once both update the sheet: guard per group (a lock per group, or a DB transaction that inserts the expense and updates balance rows atomically). Use optimistic versioning on the group's balance row if contention is low.</p>
<p><b>Scale of the pairwise map.</b> A group of n people has at most n(n−1)/2 pairs — tiny. Across the app, store balances as rows <code>(group_id, user_a, user_b, amount)</code> with a canonical order (a &lt; b) and a sign, instead of two mirrored rows.</p>
<p><b>Validation order:</b> members exist → amount &gt; 0 → no duplicate participants → strategy-specific checks (exact sums, 100%) → only then mutate state. Never half-apply an expense.</p>`,
    aiEra: `<p><b>What AI changes:</b> generating the Expense/Split/strategy classes is instant with an assistant. Interviews now focus on the parts AI gets subtly wrong: exact money arithmetic, the payer-in-split edge case, keeping the ledger antisymmetric, and how edits/deletes keep balances correct.</p>
<p><b>Use AI as a partner:</b> <code>Write property-based tests for my BalanceSheet: after any random sequence of expenses and settlements, net values sum to 0 and owes[a][b] == -owes[b][a].</code> Invariant tests like these catch rounding bugs no example test finds.</p>
<p><b>Where AI goes wrong:</b> <code>double</code> or <code>float</code> for money; rounding each share on its own (<code>Math.round</code>, <code>round()</code>; the sum can be off by a paisa either way); a decimal type created from a binary float (<code>new BigDecimal(0.1)</code>, <code>Decimal(0.1)</code>); forgetting to skip the payer's own share; treating percentages as doubles that sum to 99.99999.</p>
<p><b>What you must still own:</b> the data model choice (event log + derived balances), the rounding policy, and explaining to the interviewer why the books always balance.</p>`,
    problems: [{
      title: 'Split a Bill Exactly by Shares (no paisa lost)',
      level: 'Easy', tags: ['splitwise', 'money', 'rounding'], companies: ['Splitwise', 'PhonePe', 'Razorpay'],
      statement: `<p>Given a bill in paise and a list of non-negative integer <b>shares</b> (weights), return each person's amount so that amounts are proportional to shares, every amount is a whole number of paise, each differs from its exact value by less than 1 paisa, and the amounts <b>sum exactly to the bill</b>. Leftover paise go to the largest fractional remainders; ties go to the earlier person.</p>`,
      constraints: `1 ≤ n ≤ 1000, total ≤ 10<sup>10</sup> paise, shares ≤ 10<sup>4</sup>, at least one share &gt; 0`,
      example: `<p>total = 1000 paise, shares = [1, 1, 1]: exact 333.33 each → floors 333, 333, 333 = 999 → 1 leftover → first person: ${H.c('g', '[334, 333, 333]')}.<br>total = 1000, shares = [2, 1]: exact 666.67, 333.33 → floors 666, 333 (= 999) → leftover goes to the bigger remainder (0.67) → ${H.c('g', '[667, 333]')}.</p>`,
      brute: { why: `<p>Naive: compute each amount with a floating-point number and a rounding call (<code>Math.round</code>, <code>round()</code>). With shares [1,1,1] and total 1000 every share rounds to 333 → sum 999 (a paisa lost). With total 1001 and [1,1] both round 500.5 → 501 → sum 1002 (a paisa created). The books silently stop balancing.</p>`, code: `class NaiveSplit {
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
      tests: { io: true, cases: [{ stdin: '', stdout: '[334, 333, 333]\n[667, 333]\n[501, 500]\n[2, 2, 2, 1]\n[0, 8, 0, 2]\n[0, 0]\nshares add up to zero\nnegative share\n' }] },
      solution: {
        approach: `<p>Largest-remainder (Hamilton) apportionment entirely in integer arithmetic. The remainder <code>total·s % S</code> compares fractional parts without any floating point.</p>`,
        code: `class ExactSplitter {
    static long[] split(long total, int[] shares) {
        long S = 0;
        for (int s : shares) {
            if (s < 0) throw new IllegalArgumentException("negative share");
            S += s;
        }
        if (S == 0) throw new IllegalArgumentException("shares add up to zero");
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

    static void show(long total, int... shares) {
        try {
            System.out.println(Arrays.toString(split(total, shares)));
        } catch (IllegalArgumentException e) {
            System.out.println(e.getMessage());
        }
    }

    public static void main(String[] args) {
        show(1000, 1, 1, 1);        // [334, 333, 333]
        show(1000, 2, 1);           // [667, 333]
        show(1001, 1, 1);           // [501, 500]
        show(7, 1, 1, 1, 1);        // [2, 2, 2, 1]
        show(10, 0, 3, 0, 1);       // [0, 8, 0, 2]: a tie goes to the earlier person
        show(0, 1, 2);              // [0, 0]
        show(5, 0, 0);              // shares add up to zero
        show(5, 1, -1);             // negative share
    }
}`,
        alt: [
          { lang: 'python', code: `class ExactSplitter:
    @staticmethod
    def split(total: int, shares: list[int]) -> list[int]:
        if any(s < 0 for s in shares):
            raise ValueError("negative share")
        weight = sum(shares)
        if weight == 0:
            raise ValueError("shares add up to zero")
        out = [total * s // weight for s in shares]
        # biggest fractional remainder first, then the earlier person
        order = sorted(range(len(shares)), key=lambda i: (-(total * shares[i] % weight), i))
        for i in order[: total - sum(out)]:
            out[i] += 1
        return out


def show(total: int, *shares: int) -> None:
    try:
        print(ExactSplitter.split(total, list(shares)))
    except ValueError as e:
        print(e)


if __name__ == "__main__":
    show(1000, 1, 1, 1)
    show(1000, 2, 1)
    show(1001, 1, 1)
    show(7, 1, 1, 1, 1)
    show(10, 0, 3, 0, 1)
    show(0, 1, 2)
    show(5, 0, 0)
    show(5, 1, -1)` },
          { lang: 'ts', code: `class ExactSplitter {
  static split(total: number, shares: readonly number[]): number[] {
    if (shares.some((s) => s < 0)) throw new Error("negative share");
    const weight = shares.reduce((a, b) => a + b, 0);
    if (weight === 0) throw new Error("shares add up to zero");
    const out = shares.map((s) => Math.floor((total * s) / weight));
    // biggest fractional remainder first, then the earlier person
    const order = shares
      .map((_, i) => i)
      .sort((a, b) => ((total * shares[b]) % weight) - ((total * shares[a]) % weight) || a - b);
    const left = total - out.reduce((x, y) => x + y, 0);
    for (const i of order.slice(0, left)) out[i]++;
    return out;
  }
}

function show(total: number, ...shares: number[]): void {
  try {
    console.log(\`[\${ExactSplitter.split(total, shares).join(", ")}]\`);
  } catch (e) {
    console.log((e as Error).message);
  }
}

show(1000, 1, 1, 1);
show(1000, 2, 1);
show(1001, 1, 1);
show(7, 1, 1, 1, 1);
show(10, 0, 3, 0, 1);
show(0, 1, 2);
show(5, 0, 0);
show(5, 1, -1);` },
          { lang: 'cpp', code: `class ExactSplitter {
public:
    static vector<long long> split(long long total, const vector<int>& shares) {
        long long weight = 0;
        for (int s : shares) {
            if (s < 0) throw invalid_argument("negative share");
            weight += s;
        }
        if (weight == 0) throw invalid_argument("shares add up to zero");
        int n = shares.size();
        vector<long long> out(n);
        long long given = 0;
        for (int i = 0; i < n; i++) { out[i] = total * shares[i] / weight; given += out[i]; }
        vector<int> order(n);
        iota(order.begin(), order.end(), 0);
        sort(order.begin(), order.end(), [&](int a, int b) {   // bigger remainder first, then earlier
            long long ra = total * shares[a] % weight, rb = total * shares[b] % weight;
            return ra != rb ? ra > rb : a < b;
        });
        for (long long k = 0; k < total - given; k++) out[order[k]]++;
        return out;
    }
};

void show(long long total, const vector<int>& shares) {
    try {
        auto parts = ExactSplitter::split(total, shares);
        cout << "[";
        for (size_t i = 0; i < parts.size(); i++) cout << (i ? ", " : "") << parts[i];
        cout << "]\\n";
    } catch (const invalid_argument& e) {
        cout << e.what() << "\\n";
    }
}

int main() {
    show(1000, {1, 1, 1});
    show(1000, {2, 1});
    show(1001, {1, 1});
    show(7, {1, 1, 1, 1});
    show(10, {0, 3, 0, 1});
    show(0, {1, 2});
    show(5, {0, 0});
    show(5, {1, -1});
}` }
        ],
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
        for (Transfer t : plan) System.out.println(t.from() + " pays " + t.to() + " " + t.amount());   // 3 transfers instead of 6
        System.out.println("exact minimum = " + minTransfers(net));

        // Greedy is NOT always optimal: +4 +3 -2 -2 -3 -> greedy 4 transfers, optimum 3 ({+3,-3}, {+4,-2,-2})
        Map<String, Long> tricky = new TreeMap<>(Map.of("a", 4L, "b", 3L, "x", -2L, "y", -2L, "z", -3L));
        System.out.println("greedy = " + greedy(tricky).size() + ", optimal = " + minTransfers(tricky));

        // already settled: nobody owes anything
        Map<String, Long> settled = new TreeMap<>(Map.of("a", 0L, "b", 0L));
        System.out.println("greedy = " + greedy(settled).size() + ", optimal = " + minTransfers(settled));
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
    code: [{ lang: 'java', code: SW_SIMPLIFY, alt: [
      { lang: 'python', code: `import heapq
from dataclasses import dataclass


@dataclass(frozen=True)
class Transfer:
    from_: str
    to: str
    amount: int


class DebtSimplifier:
    @staticmethod
    def net_of(debts: list[Transfer]) -> dict[str, int]:
        """Step 1: collapse any list of debts into one net number per person."""
        net: dict[str, int] = {}
        for d in debts:
            net[d.from_] = net.get(d.from_, 0) - d.amount       # debtor goes down
            net[d.to] = net.get(d.to, 0) + d.amount             # creditor goes up
        return dict(sorted(net.items()))

    @staticmethod
    def greedy(net: dict[str, int]) -> list[Transfer]:
        """Step 2 (greedy): biggest debtor pays biggest creditor, repeat. Each step zeroes at least one person."""
        names = list(net)
        # heapq is a min-heap: creditors store -amount (largest first), debtors store the negative balance
        # (most negative first); ties are broken by position in the sorted name list for determinism
        cred = [(-v, i) for i, name in enumerate(names) if (v := net[name]) > 0]
        debt = [(v, i) for i, name in enumerate(names) if (v := net[name]) < 0]
        heapq.heapify(cred)
        heapq.heapify(debt)
        out: list[Transfer] = []
        while cred and debt:
            c_neg, c = heapq.heappop(cred)
            d_neg, d = heapq.heappop(debt)
            amt = min(-c_neg, -d_neg)
            out.append(Transfer(names[d], names[c], amt))
            if -c_neg - amt > 0:
                heapq.heappush(cred, (c_neg + amt, c))
            if d_neg + amt < 0:
                heapq.heappush(debt, (d_neg + amt, d))
        return out

    @staticmethod
    def min_transfers(net: dict[str, int]) -> int:
        """Exact minimum number of transfers (NP-hard in general; fine for n <= ~20).
        Answer = (#non-zero people) - (max number of disjoint zero-sum groups)."""
        b = [v for v in net.values() if v != 0]
        n = len(b)
        if n == 0:
            return 0
        full = 1 << n
        total = [0] * full
        groups = [0] * full            # groups[mask] = max zero-sum groups that exactly cover mask
        for mask in range(1, full):
            low = (mask & -mask).bit_length() - 1
            total[mask] = total[mask & (mask - 1)] + b[low]
            best = max(groups[mask ^ (1 << i)] for i in range(n) if mask >> i & 1)
            groups[mask] = best + (1 if total[mask] == 0 else 0)
        return n - groups[full - 1]


def main() -> None:
    debts = [Transfer("ben", "asha", 300), Transfer("chen", "asha", 300), Transfer("chen", "ben", 150),
             Transfer("asha", "chen", 60), Transfer("dev", "ben", 100), Transfer("dev", "chen", 80)]
    net = DebtSimplifier.net_of(debts)
    print("net = {" + ", ".join(f"{k}={v}" for k, v in net.items()) + "}")
    for t in DebtSimplifier.greedy(net):                  # 3 transfers instead of 6
        print(f"{t.from_} pays {t.to} {t.amount}")
    print(f"exact minimum = {DebtSimplifier.min_transfers(net)}")

    # Greedy is NOT always optimal: +4 +3 -2 -2 -3 -> greedy 4 transfers, optimum 3 ({+3,-3}, {+4,-2,-2})
    tricky = {"a": 4, "b": 3, "x": -2, "y": -2, "z": -3}
    print(f"greedy = {len(DebtSimplifier.greedy(tricky))}, optimal = {DebtSimplifier.min_transfers(tricky)}")

    settled = {"a": 0, "b": 0}                            # already settled: nobody owes anything
    print(f"greedy = {len(DebtSimplifier.greedy(settled))}, optimal = {DebtSimplifier.min_transfers(settled)}")


if __name__ == "__main__":
    main()` },
      { lang: 'ts', code: `interface Transfer { readonly from: string; readonly to: string; readonly amount: number }

type Entry = [amount: number, index: number];

// Tiny binary heap: \`before(a, b)\` says a must come out first.
class Heap<T> {
  private readonly a: T[] = [];
  constructor(private readonly before: (x: T, y: T) => boolean) {}
  get size(): number { return this.a.length; }
  push(v: T): void {
    const a = this.a;
    a.push(v);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.before(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop(): T {
    const a = this.a, top = a[0], last = a.pop() as T;
    if (a.length > 0) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && this.before(a[l], a[m])) m = l;
        if (r < a.length && this.before(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

class DebtSimplifier {
  /** Step 1: collapse any list of debts into one net number per person. */
  static netOf(debts: readonly Transfer[]): Map<string, number> {
    const net = new Map<string, number>();
    for (const d of debts) {
      net.set(d.from, (net.get(d.from) ?? 0) - d.amount); // debtor goes down
      net.set(d.to, (net.get(d.to) ?? 0) + d.amount); // creditor goes up
    }
    return new Map([...net].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  }

  /** Step 2 (greedy): biggest debtor pays biggest creditor, repeat. Each step zeroes at least one person. */
  static greedy(net: ReadonlyMap<string, number>): Transfer[] {
    // creditors: largest positive first; debtors: most negative first; ties broken by position for determinism
    const cred = new Heap<Entry>((x, y) => (x[0] !== y[0] ? x[0] > y[0] : x[1] < y[1]));
    const debt = new Heap<Entry>((x, y) => (x[0] !== y[0] ? x[0] < y[0] : x[1] < y[1]));
    const names = [...net.keys()];
    names.forEach((name, i) => {
      const v = net.get(name) as number;
      if (v > 0) cred.push([v, i]);
      else if (v < 0) debt.push([v, i]);
    });
    const out: Transfer[] = [];
    while (cred.size > 0 && debt.size > 0) {
      const [cAmt, c] = cred.pop();
      const [dAmt, d] = debt.pop();
      const amt = Math.min(cAmt, -dAmt);
      out.push({ from: names[d], to: names[c], amount: amt });
      if (cAmt - amt > 0) cred.push([cAmt - amt, c]);
      if (dAmt + amt < 0) debt.push([dAmt + amt, d]);
    }
    return out;
  }

  /** Exact minimum number of transfers (NP-hard in general; fine for n <= ~20).
   *  Answer = (#non-zero people) - (max number of disjoint zero-sum groups). */
  static minTransfers(net: ReadonlyMap<string, number>): number {
    const b = [...net.values()].filter((v) => v !== 0);
    const n = b.length;
    if (n === 0) return 0;
    const full = 1 << n;
    const sum = new Array<number>(full).fill(0);
    const groups = new Array<number>(full).fill(0); // groups[mask] = max zero-sum groups that exactly cover mask
    for (let mask = 1; mask < full; mask++) {
      const low = 31 - Math.clz32(mask & -mask);
      sum[mask] = sum[mask & (mask - 1)] + b[low];
      let best = 0;
      for (let i = 0; i < n; i++) if ((mask >> i) & 1) best = Math.max(best, groups[mask ^ (1 << i)]);
      groups[mask] = best + (sum[mask] === 0 ? 1 : 0);
    }
    return n - groups[full - 1];
  }
}

const fmtNet = (m: ReadonlyMap<string, number>): string => \`{\${[...m].map(([k, v]) => \`\${k}=\${v}\`).join(", ")}}\`;

const debts: Transfer[] = [
  { from: "ben", to: "asha", amount: 300 }, { from: "chen", to: "asha", amount: 300 }, { from: "chen", to: "ben", amount: 150 },
  { from: "asha", to: "chen", amount: 60 }, { from: "dev", to: "ben", amount: 100 }, { from: "dev", to: "chen", amount: 80 },
];
const net = DebtSimplifier.netOf(debts);
console.log("net = " + fmtNet(net));
for (const t of DebtSimplifier.greedy(net)) console.log(\`\${t.from} pays \${t.to} \${t.amount}\`); // 3 transfers instead of 6
console.log(\`exact minimum = \${DebtSimplifier.minTransfers(net)}\`);

// Greedy is NOT always optimal: +4 +3 -2 -2 -3 -> greedy 4 transfers, optimum 3 ({+3,-3}, {+4,-2,-2})
const tricky = new Map([["a", 4], ["b", 3], ["x", -2], ["y", -2], ["z", -3]]);
console.log(\`greedy = \${DebtSimplifier.greedy(tricky).length}, optimal = \${DebtSimplifier.minTransfers(tricky)}\`);

const settled = new Map([["a", 0], ["b", 0]]); // already settled: nobody owes anything
console.log(\`greedy = \${DebtSimplifier.greedy(settled).length}, optimal = \${DebtSimplifier.minTransfers(settled)}\`);` },
      { lang: 'cpp', code: `struct Transfer { string from, to; long long amount; };

class DebtSimplifier {
public:
    // Step 1: collapse any list of debts into one net number per person (std::map keeps names sorted).
    static map<string, long long> netOf(const vector<Transfer>& debts) {
        map<string, long long> net;
        for (const auto& d : debts) {
            net[d.from] -= d.amount;     // debtor goes down
            net[d.to] += d.amount;       // creditor goes up
        }
        return net;
    }

    // Step 2 (greedy): biggest debtor pays biggest creditor, repeat. Each step zeroes at least one person.
    static vector<Transfer> greedy(const map<string, long long>& net) {
        using Entry = pair<long long, int>;          // (amount, index in the sorted name list)
        // priority_queue is a max-heap: "less" means "comes out later". Ties go to the smaller index.
        auto credLater = [](const Entry& x, const Entry& y) { return x.first != y.first ? x.first < y.first : x.second > y.second; };
        auto debtLater = [](const Entry& x, const Entry& y) { return x.first != y.first ? x.first > y.first : x.second > y.second; };
        priority_queue<Entry, vector<Entry>, decltype(credLater)> cred(credLater);
        priority_queue<Entry, vector<Entry>, decltype(debtLater)> debt(debtLater);
        vector<string> names;
        for (const auto& [name, v] : net) {
            int i = names.size();
            names.push_back(name);
            if (v > 0) cred.push({v, i});
            else if (v < 0) debt.push({v, i});
        }
        vector<Transfer> out;
        while (!cred.empty() && !debt.empty()) {
            auto [cAmt, c] = cred.top(); cred.pop();
            auto [dAmt, d] = debt.top(); debt.pop();
            long long amt = min(cAmt, -dAmt);
            out.push_back({names[d], names[c], amt});
            if (cAmt - amt > 0) cred.push({cAmt - amt, c});
            if (dAmt + amt < 0) debt.push({dAmt + amt, d});
        }
        return out;
    }

    // Exact minimum number of transfers (NP-hard in general; fine for n <= ~20).
    // Answer = (#non-zero people) - (max number of disjoint zero-sum groups).
    static int minTransfers(const map<string, long long>& net) {
        vector<long long> b;
        for (const auto& [name, v] : net)
            if (v != 0) b.push_back(v);
        int n = b.size();
        if (n == 0) return 0;
        int full = 1 << n;
        vector<long long> sum(full, 0);
        vector<int> groups(full, 0);       // groups[mask] = max zero-sum groups that exactly cover mask
        for (int mask = 1; mask < full; mask++) {
            sum[mask] = sum[mask & (mask - 1)] + b[countr_zero(static_cast<unsigned>(mask))];
            int best = 0;
            for (int i = 0; i < n; i++)
                if (mask >> i & 1) best = max(best, groups[mask ^ (1 << i)]);
            groups[mask] = best + (sum[mask] == 0 ? 1 : 0);
        }
        return n - groups[full - 1];
    }
};

string fmtNet(const map<string, long long>& m) {
    string s = "{";
    for (const auto& [k, v] : m) s += (s.size() > 1 ? ", " : "") + k + "=" + to_string(v);
    return s + "}";
}

int main() {
    vector<Transfer> debts = {{"ben", "asha", 300}, {"chen", "asha", 300}, {"chen", "ben", 150},
                              {"asha", "chen", 60}, {"dev", "ben", 100}, {"dev", "chen", 80}};
    auto net = DebtSimplifier::netOf(debts);
    cout << "net = " << fmtNet(net) << "\\n";
    for (const auto& t : DebtSimplifier::greedy(net))              // 3 transfers instead of 6
        cout << t.from << " pays " << t.to << " " << t.amount << "\\n";
    cout << "exact minimum = " << DebtSimplifier::minTransfers(net) << "\\n";

    // Greedy is NOT always optimal: +4 +3 -2 -2 -3 -> greedy 4 transfers, optimum 3 ({+3,-3}, {+4,-2,-2})
    map<string, long long> tricky = {{"a", 4}, {"b", 3}, {"x", -2}, {"y", -2}, {"z", -3}};
    cout << "greedy = " << DebtSimplifier::greedy(tricky).size() << ", optimal = " << DebtSimplifier::minTransfers(tricky) << "\\n";

    map<string, long long> settled = {{"a", 0}, {"b", 0}};          // already settled: nobody owes anything
    cout << "greedy = " << DebtSimplifier::greedy(settled).size() << ", optimal = " << DebtSimplifier::minTransfers(settled) << "\\n";
}` }
    ] }],
    codeTitle: 'DebtSimplifier: net balances → greedy plan → exact minimum (a complete program)',
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
        System.out.println(minTransfers(new long[]{5, -5}));              // 1
        System.out.println(minTransfers(new long[]{1, 2, -3}));           // 2: one group of three people
        System.out.println(minTransfers(new long[]{}));                   // 0
    }
}`, alt: [
          { lang: 'python', code: `class MinTransfersDemo:
    @staticmethod
    def min_transfers(b: list[int]) -> int:
        """dp over subsets: groups[mask] = max zero-sum groups exactly covering \`mask\`."""
        n = len(b)
        full = 1 << n
        total = [0] * full
        groups = [0] * full
        for mask in range(1, full):
            total[mask] = total[mask & (mask - 1)] + b[(mask & -mask).bit_length() - 1]
            best = max(groups[mask ^ (1 << i)] for i in range(n) if mask >> i & 1)
            groups[mask] = best + (1 if total[mask] == 0 else 0)
        return n - groups[full - 1]


if __name__ == "__main__":
    for balances in ([4, 3, -2, -2, -3], [5, -5], [1, 2, -3], []):
        print(MinTransfersDemo.min_transfers(balances))` },
          { lang: 'ts', code: `class MinTransfersDemo {
  // dp over subsets: groups[mask] = max zero-sum groups exactly covering \`mask\`
  static minTransfers(b: readonly number[]): number {
    const n = b.length, full = 1 << n;
    const sum = new Array<number>(full).fill(0);
    const groups = new Array<number>(full).fill(0);
    for (let mask = 1; mask < full; mask++) {
      sum[mask] = sum[mask & (mask - 1)] + b[31 - Math.clz32(mask & -mask)];
      let best = 0;
      for (let i = 0; i < n; i++) if ((mask >> i) & 1) best = Math.max(best, groups[mask ^ (1 << i)]);
      groups[mask] = best + (sum[mask] === 0 ? 1 : 0);
    }
    return n - groups[full - 1];
  }
}

for (const balances of [[4, 3, -2, -2, -3], [5, -5], [1, 2, -3], []]) console.log(MinTransfersDemo.minTransfers(balances));` },
          { lang: 'cpp', code: `class MinTransfersDemo {
public:
    // dp over subsets: groups[mask] = max zero-sum groups exactly covering \`mask\`
    static int minTransfers(const vector<long long>& b) {
        int n = b.size(), full = 1 << n;
        vector<long long> sum(full, 0);
        vector<int> groups(full, 0);
        for (int mask = 1; mask < full; mask++) {
            sum[mask] = sum[mask & (mask - 1)] + b[countr_zero(static_cast<unsigned>(mask))];
            int best = 0;
            for (int i = 0; i < n; i++)
                if (mask >> i & 1) best = max(best, groups[mask ^ (1 << i)]);
            groups[mask] = best + (sum[mask] == 0 ? 1 : 0);
        }
        return n - groups[full - 1];
    }
};

int main() {
    for (const vector<long long>& balances : vector<vector<long long>>{{4, 3, -2, -2, -3}, {5, -5}, {1, 2, -3}, {}})
        cout << MinTransfersDemo::minTransfers(balances) << "\\n";
}` }
        ] },
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
<p><b>Where AI goes wrong:</b> claims greedy is optimal; uses doubles so balances never reach exactly zero; forgets to collapse to nets first and "simplifies" edge by edge; mutates entries while they are inside a priority queue (breaking heap order) instead of poll → modify → re-add.</p>
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
      tests: { io: true, cases: [{ stdin: '', stdout: '1 pays 2 4000\n0 pays 2 3000\n--\nno transfers\n--\n2 pays 0 5\n3 pays 1 5\n--\nno transfers\n' }] },
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
    static void plan(int n, int[][] debts) {
        List<long[]> moves = settle(n, debts);
        if (moves.isEmpty()) System.out.println("no transfers");
        for (long[] t : moves) System.out.println(t[0] + " pays " + t[1] + " " + t[2]);
    }

    public static void main(String[] args) {
        plan(3, new int[][]{{0, 1, 1000}, {1, 2, 5000}, {0, 2, 2000}});   // 1 pays 2 4000, 0 pays 2 3000
        System.out.println("--");
        plan(3, new int[][]{{0, 1, 100}, {1, 2, 100}, {2, 0, 100}});      // a cycle cancels out
        System.out.println("--");
        plan(4, new int[][]{{2, 0, 5}, {3, 1, 5}});                        // ties: smaller id first
        System.out.println("--");
        plan(2, new int[][]{});                                            // nobody owes anything
    }
}`,
        alt: [
          { lang: 'python', code: `import heapq


class MinCashFlow:
    @staticmethod
    def settle(n: int, debts: list[tuple[int, int, int]]) -> list[tuple[int, int, int]]:
        """Returns (payer, receiver, amount) moves; debts are (debtor, creditor, amount)."""
        net = [0] * n
        for debtor, creditor, amount in debts:
            net[debtor] -= amount
            net[creditor] += amount
        # heapq is a min-heap, so store negated amounts: the biggest comes out first, smaller id on a tie
        cred = [(-v, i) for i, v in enumerate(net) if v > 0]
        debt = [(v, i) for i, v in enumerate(net) if v < 0]
        heapq.heapify(cred)
        heapq.heapify(debt)
        out: list[tuple[int, int, int]] = []
        while cred and debt:
            c_neg, c = heapq.heappop(cred)
            d_neg, d = heapq.heappop(debt)
            amt = min(-c_neg, -d_neg)
            out.append((d, c, amt))
            if -c_neg > amt:
                heapq.heappush(cred, (c_neg + amt, c))
            if -d_neg > amt:
                heapq.heappush(debt, (d_neg + amt, d))
        return out


def plan(n: int, debts: list[tuple[int, int, int]]) -> None:
    moves = MinCashFlow.settle(n, debts)
    if not moves:
        print("no transfers")
    for payer, receiver, amount in moves:
        print(f"{payer} pays {receiver} {amount}")


if __name__ == "__main__":
    plan(3, [(0, 1, 1000), (1, 2, 5000), (0, 2, 2000)])
    print("--")
    plan(3, [(0, 1, 100), (1, 2, 100), (2, 0, 100)])
    print("--")
    plan(4, [(2, 0, 5), (3, 1, 5)])
    print("--")
    plan(2, [])` },
          { lang: 'ts', code: `type Debt = readonly [debtor: number, creditor: number, amount: number];
type Move = readonly [payer: number, receiver: number, amount: number];
type Entry = [amount: number, id: number];

// Tiny binary heap: \`before(a, b)\` says a must come out first.
class Heap<T> {
  private readonly a: T[] = [];
  constructor(private readonly before: (x: T, y: T) => boolean) {}
  get size(): number { return this.a.length; }
  push(v: T): void {
    const a = this.a;
    a.push(v);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.before(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop(): T {
    const a = this.a, top = a[0], last = a.pop() as T;
    if (a.length > 0) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && this.before(a[l], a[m])) m = l;
        if (r < a.length && this.before(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

class MinCashFlow {
  /** debts are [debtor, creditor, amount]; returns [payer, receiver, amount] moves. */
  static settle(n: number, debts: readonly Debt[]): Move[] {
    const net: number[] = new Array(n).fill(0);
    for (const [debtor, creditor, amount] of debts) {
      net[debtor] -= amount;
      net[creditor] += amount;
    }
    const biggestFirst = (x: Entry, y: Entry): boolean => (x[0] !== y[0] ? x[0] > y[0] : x[1] < y[1]);
    const cred = new Heap<Entry>(biggestFirst);
    const debt = new Heap<Entry>(biggestFirst);
    net.forEach((v, i) => {
      if (v > 0) cred.push([v, i]);
      else if (v < 0) debt.push([-v, i]);
    });
    const out: Move[] = [];
    while (cred.size > 0 && debt.size > 0) {
      const [cAmt, c] = cred.pop();
      const [dAmt, d] = debt.pop();
      const amt = Math.min(cAmt, dAmt);
      out.push([d, c, amt]);
      if (cAmt > amt) cred.push([cAmt - amt, c]);
      if (dAmt > amt) debt.push([dAmt - amt, d]);
    }
    return out;
  }
}

function plan(n: number, debts: Debt[]): void {
  const moves = MinCashFlow.settle(n, debts);
  if (moves.length === 0) console.log("no transfers");
  for (const [payer, receiver, amount] of moves) console.log(\`\${payer} pays \${receiver} \${amount}\`);
}

plan(3, [[0, 1, 1000], [1, 2, 5000], [0, 2, 2000]]);
console.log("--");
plan(3, [[0, 1, 100], [1, 2, 100], [2, 0, 100]]);
console.log("--");
plan(4, [[2, 0, 5], [3, 1, 5]]);
console.log("--");
plan(2, []);` },
          { lang: 'cpp', code: `struct Move { int payer, receiver; long long amount; };

class MinCashFlow {
    // max-heap on amount; on a tie the smaller id comes out first
    struct Entry {
        long long amount; int id;
        bool operator<(const Entry& o) const { return amount != o.amount ? amount < o.amount : id > o.id; }
    };
public:
    // debts are {debtor, creditor, amount}
    static vector<Move> settle(int n, const vector<array<long long, 3>>& debts) {
        vector<long long> net(n, 0);
        for (const auto& [debtor, creditor, amount] : debts) { net[debtor] -= amount; net[creditor] += amount; }
        priority_queue<Entry> cred, debt;
        for (int i = 0; i < n; i++) {
            if (net[i] > 0) cred.push({net[i], i});
            else if (net[i] < 0) debt.push({-net[i], i});
        }
        vector<Move> out;
        while (!cred.empty() && !debt.empty()) {
            Entry c = cred.top(); cred.pop();
            Entry d = debt.top(); debt.pop();
            long long amt = min(c.amount, d.amount);
            out.push_back({d.id, c.id, amt});
            if (c.amount > amt) cred.push({c.amount - amt, c.id});
            if (d.amount > amt) debt.push({d.amount - amt, d.id});
        }
        return out;
    }
};

void plan(int n, const vector<array<long long, 3>>& debts) {
    auto moves = MinCashFlow::settle(n, debts);
    if (moves.empty()) cout << "no transfers\\n";
    for (const auto& m : moves) cout << m.payer << " pays " << m.receiver << " " << m.amount << "\\n";
}

int main() {
    plan(3, {{0, 1, 1000}, {1, 2, 5000}, {0, 2, 2000}});
    cout << "--\\n";
    plan(3, {{0, 1, 100}, {1, 2, 100}, {2, 0, 100}});
    cout << "--\\n";
    plan(4, {{2, 0, 5}, {3, 1, 5}});
    cout << "--\\n";
    plan(2, {});
}` }
        ],
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

        // failure paths: each one is refused and changes nothing
        lib.addMember(new Member("M2", "Dr. Rao", MemberType.FACULTY));
        Runnable[] refused = {
            () -> lib.checkout("M9", "BC-001", d1),                                 // unknown member M9
            () -> lib.checkout("M1", "BC-404", d1),                                 // unknown barcode BC-404
            () -> lib.returnItem("BC-003", d1),                                     // BC-003 is not on loan
        };
        for (Runnable r : refused) {
            try { r.run(); } catch (RuntimeException e) { System.out.println(e.getMessage()); }
        }
        LocalDate d2 = LocalDate.of(2026, 10, 21);
        System.out.println("due " + lib.checkout("M1", "BC-002", d2).dueOn);        // 2026-11-04
        try { lib.checkout("M2", "BC-002", d2); } catch (IllegalStateException e) { System.out.println(e.getMessage()); }   // this copy is LOANED
        for (int i = 0; i < 3; i++) {
            try { System.out.println("renewed to " + lib.renew("BC-002", d2.plusDays(i + 1)).dueOn); }   // 2026-11-18, 2026-12-02, then refused
            catch (IllegalStateException e) { System.out.println(e.getMessage()); }
        }
        lib.checkout("M2", "BC-003", d1);                                           // faculty: 30 days, due 2026-10-31
        try { lib.renew("BC-003", LocalDate.of(2026, 11, 2)); } catch (IllegalStateException e) { System.out.println(e.getMessage()); }   // overdue items cannot be renewed
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
    code: [{ lang: 'java', code: LIB_MODEL, alt: [
      { lang: 'python', code: `import threading
from dataclasses import dataclass, field
from datetime import date, timedelta
from enum import Enum


class ItemStatus(Enum):
    AVAILABLE = "AVAILABLE"
    LOANED = "LOANED"
    ON_HOLD = "ON_HOLD"
    LOST = "LOST"
    UNDER_REPAIR = "UNDER_REPAIR"


class MemberType(Enum):
    STUDENT = (5, 14)
    FACULTY = (10, 30)

    def __init__(self, max_books: int, loan_days: int) -> None:
        self.max_books = max_books
        self.loan_days = loan_days


@dataclass(frozen=True)
class Book:
    """The TITLE in the catalogue: one per ISBN, no matter how many copies exist."""
    isbn: str
    title: str
    subject: str
    authors: tuple[str, ...]


@dataclass(eq=False)
class BookItem:
    """A PHYSICAL copy with its own barcode, shelf and status. This is what gets lent."""
    barcode: str
    book: Book
    rack: str
    status: ItemStatus = ItemStatus.AVAILABLE


@dataclass(eq=False)
class Member:
    id: str
    name: str
    type: MemberType
    active: bool = True
    unpaid_fine_paise: int = 0
    loans: dict[str, "Loan"] = field(default_factory=dict)      # barcode -> active loan


@dataclass(eq=False)
class Loan:
    item: BookItem
    member: Member
    issued_on: date
    due_on: date
    returned_on: date | None = None
    renewals: int = 0

    def days_late(self, on: date) -> int:
        return max(0, (on - self.due_on).days)


class Catalog:
    """Search: an inverted index "word -> ISBNs" over title and author words."""

    def __init__(self) -> None:
        self._by_isbn: dict[str, Book] = {}
        self._by_barcode: dict[str, BookItem] = {}
        self._copies: dict[str, list[BookItem]] = {}
        self._index: dict[str, set[str]] = {}

    def add_book(self, b: Book) -> None:
        self._by_isbn[b.isbn] = b
        words = b.title.lower().split() + [w for a in b.authors for w in a.lower().split()]
        for w in words:
            self._index.setdefault(w, set()).add(b.isbn)

    def add_item(self, it: BookItem) -> None:
        if it.book.isbn not in self._by_isbn:
            raise ValueError("add the Book first")
        self._by_barcode[it.barcode] = it
        self._copies.setdefault(it.book.isbn, []).append(it)

    def search(self, query: str) -> list[Book]:
        """AND-search: every query word must match a title or author word."""
        result: set[str] | None = None
        for w in query.lower().split():
            hits = self._index.get(w, set())
            result = set(hits) if result is None else result & hits
        if result is None:
            return []
        return [self._by_isbn[isbn] for isbn in sorted(result)]

    def item(self, barcode: str) -> BookItem | None:
        return self._by_barcode.get(barcode)

    def available_copies(self, isbn: str) -> int:
        return sum(1 for i in self._copies.get(isbn, []) if i.status is ItemStatus.AVAILABLE)


class LibraryService:
    MAX_UNPAID_FINE = 100_00      # Rs 100
    FINE_PER_DAY = 10_00          # Rs 10 (topic 6 makes this a pluggable FinePolicy)
    MAX_RENEWALS = 2

    def __init__(self, catalog: Catalog) -> None:
        self._catalog = catalog
        self._members: dict[str, Member] = {}
        self._active_loans: dict[str, Loan] = {}        # barcode -> loan
        self._lock = threading.RLock()

    def add_member(self, m: Member) -> None:
        self._members[m.id] = m

    def _member(self, member_id: str) -> Member:
        m = self._members.get(member_id)
        if m is None:
            raise ValueError(f"unknown member {member_id}")
        return m

    def checkout(self, member_id: str, barcode: str, today: date) -> Loan:
        with self._lock:
            m = self._member(member_id)
            it = self._catalog.item(barcode)
            if it is None:
                raise ValueError(f"unknown barcode {barcode}")
            if not m.active:
                raise RuntimeError("membership inactive")
            if len(m.loans) >= m.type.max_books:
                raise RuntimeError(f"limit of {m.type.max_books} books reached")
            if m.unpaid_fine_paise > self.MAX_UNPAID_FINE:
                raise RuntimeError("please clear fines first")
            if it.status is not ItemStatus.AVAILABLE:
                raise RuntimeError(f"this copy is {it.status.value}")
            loan = Loan(it, m, today, today + timedelta(days=m.type.loan_days))
            it.status = ItemStatus.LOANED
            m.loans[barcode] = loan
            self._active_loans[barcode] = loan
            return loan

    def return_item(self, barcode: str, today: date) -> int:
        """Returns the fine charged (paise)."""
        with self._lock:
            loan = self._active_loans.pop(barcode, None)
            if loan is None:
                raise RuntimeError(f"{barcode} is not on loan")
            loan.returned_on = today
            del loan.member.loans[barcode]
            loan.item.status = ItemStatus.AVAILABLE          # topic 6: may become ON_HOLD for a waiting member
            fine = loan.days_late(today) * self.FINE_PER_DAY
            loan.member.unpaid_fine_paise += fine
            return fine

    def renew(self, barcode: str, today: date) -> Loan:
        with self._lock:
            loan = self._active_loans.get(barcode)
            if loan is None:
                raise RuntimeError(f"{barcode} is not on loan")
            if loan.days_late(today) > 0:
                raise RuntimeError("overdue items cannot be renewed")
            if loan.renewals >= self.MAX_RENEWALS:
                raise RuntimeError("renewal limit reached")
            loan.renewals += 1
            loan.due_on += timedelta(days=loan.member.type.loan_days)
            return loan

    def pay_fine(self, member_id: str, paise: int) -> None:
        with self._lock:
            m = self._member(member_id)
            m.unpaid_fine_paise = max(0, m.unpaid_fine_paise - paise)


def main() -> None:
    cat = Catalog()
    clean = Book("978-0132350884", "Clean Code", "Software", ("Robert Martin",))
    ddia = Book("978-1449373320", "Designing Data Intensive Applications", "Databases", ("Martin Kleppmann",))
    cat.add_book(clean)
    cat.add_book(ddia)
    cat.add_item(BookItem("BC-001", clean, "R1-S3"))
    cat.add_item(BookItem("BC-002", clean, "R1-S3"))
    cat.add_item(BookItem("BC-003", ddia, "R4-S1"))
    print(f"{len(cat.search('martin'))} books by a Martin")      # 2
    print(cat.search("clean martin")[0].title)                    # Clean Code

    lib = LibraryService(cat)
    lib.add_member(Member("M1", "Priya", MemberType.STUDENT))
    d1 = date(2026, 10, 1)
    loan = lib.checkout("M1", "BC-001", d1)
    print(f"due {loan.due_on.isoformat()}, copies left {cat.available_copies(clean.isbn)}")   # 2026-10-15, 1
    fine = lib.return_item("BC-001", date(2026, 10, 20))
    print(f"fine paise = {fine}")                                  # 5 days late -> 5000

    # failure paths: each one is refused and changes nothing
    lib.add_member(Member("M2", "Dr. Rao", MemberType.FACULTY))
    refused = [
        lambda: lib.checkout("M9", "BC-001", d1),
        lambda: lib.checkout("M1", "BC-404", d1),
        lambda: lib.return_item("BC-003", d1),
    ]
    for attempt in refused:
        try:
            attempt()
        except (ValueError, RuntimeError) as e:
            print(e)
    d2 = date(2026, 10, 21)
    print(f"due {lib.checkout('M1', 'BC-002', d2).due_on.isoformat()}")           # 2026-11-04
    try:
        lib.checkout("M2", "BC-002", d2)
    except RuntimeError as e:
        print(e)                                                                    # this copy is LOANED
    for i in range(3):
        try:
            print(f"renewed to {lib.renew('BC-002', d2 + timedelta(days=i + 1)).due_on.isoformat()}")
        except RuntimeError as e:
            print(e)
    lib.checkout("M2", "BC-003", d1)                                                # faculty: 30 days, due 2026-10-31
    try:
        lib.renew("BC-003", date(2026, 11, 2))
    except RuntimeError as e:
        print(e)


if __name__ == "__main__":
    main()` },
      { lang: 'ts', code: `class LocalDate {
  private constructor(readonly epochDay: number) {}
  static of(y: number, m: number, d: number): LocalDate { return new LocalDate(Date.UTC(y, m - 1, d) / 86_400_000); }
  plusDays(n: number): LocalDate { return new LocalDate(this.epochDay + n); }
  toString(): string { return new Date(this.epochDay * 86_400_000).toISOString().slice(0, 10); }
}

type ItemStatus = "AVAILABLE" | "LOANED" | "ON_HOLD" | "LOST" | "UNDER_REPAIR";

const MEMBER_TYPES = {
  STUDENT: { maxBooks: 5, loanDays: 14 },
  FACULTY: { maxBooks: 10, loanDays: 30 },
} as const;
type MemberType = keyof typeof MEMBER_TYPES;

// The TITLE in the catalogue: one per ISBN, no matter how many copies exist.
interface Book { readonly isbn: string; readonly title: string; readonly subject: string; readonly authors: readonly string[] }

// A PHYSICAL copy with its own barcode, shelf and status. This is what gets lent.
class BookItem {
  status: ItemStatus = "AVAILABLE";
  constructor(readonly barcode: string, readonly book: Book, readonly rack: string) {}
}

class Member {
  active = true;
  unpaidFinePaise = 0;
  readonly loans = new Map<string, Loan>(); // barcode -> active loan
  constructor(readonly id: string, readonly name: string, readonly type: MemberType) {}
}

class Loan {
  returnedOn: LocalDate | null = null;
  renewals = 0;
  constructor(readonly item: BookItem, readonly member: Member, readonly issuedOn: LocalDate, public dueOn: LocalDate) {}
  daysLate(on: LocalDate): number { return Math.max(0, on.epochDay - this.dueOn.epochDay); }
}

// Search: an inverted index "word -> ISBNs" over title and author words.
class Catalog {
  private readonly byIsbn = new Map<string, Book>();
  private readonly byBarcode = new Map<string, BookItem>();
  private readonly copies = new Map<string, BookItem[]>();
  private readonly index = new Map<string, Set<string>>();

  addBook(b: Book): void {
    this.byIsbn.set(b.isbn, b);
    const words = [...b.title.toLowerCase().split(" "), ...b.authors.flatMap((a) => a.toLowerCase().split(" "))];
    for (const w of words) {
      if (w.trim() === "") continue;
      let ids = this.index.get(w);
      if (ids === undefined) { ids = new Set(); this.index.set(w, ids); }
      ids.add(b.isbn);
    }
  }

  addItem(it: BookItem): void {
    if (!this.byIsbn.has(it.book.isbn)) throw new Error("add the Book first");
    this.byBarcode.set(it.barcode, it);
    this.copies.set(it.book.isbn, [...(this.copies.get(it.book.isbn) ?? []), it]);
  }

  /** AND-search: every query word must match a title or author word. */
  search(query: string): Book[] {
    const postings: Set<string>[] = [];
    for (const w of query.toLowerCase().split(" ")) {
      if (w.trim() === "") continue;
      postings.push(this.index.get(w) ?? new Set<string>());
    }
    if (postings.length === 0) return [];
    const [first, ...rest] = postings;
    const common = [...first].filter((isbn) => rest.every((s) => s.has(isbn)));
    return common.sort().map((isbn) => this.byIsbn.get(isbn) as Book);
  }

  item(barcode: string): BookItem | undefined { return this.byBarcode.get(barcode); }

  availableCopies(isbn: string): number {
    return (this.copies.get(isbn) ?? []).filter((i) => i.status === "AVAILABLE").length;
  }
}

class LibraryService {
  static readonly MAX_UNPAID_FINE = 100_00; // Rs 100
  static readonly FINE_PER_DAY = 10_00; // Rs 10 (topic 6 makes this a pluggable FinePolicy)
  static readonly MAX_RENEWALS = 2;

  private readonly members = new Map<string, Member>();
  private readonly activeLoans = new Map<string, Loan>(); // barcode -> loan

  constructor(private readonly catalog: Catalog) {}

  addMember(m: Member): void { this.members.set(m.id, m); }

  private member(id: string): Member {
    const m = this.members.get(id);
    if (m === undefined) throw new Error(\`unknown member \${id}\`);
    return m;
  }

  checkout(memberId: string, barcode: string, today: LocalDate): Loan {
    const m = this.member(memberId);
    const it = this.catalog.item(barcode);
    if (it === undefined) throw new Error(\`unknown barcode \${barcode}\`);
    const rules = MEMBER_TYPES[m.type];
    if (!m.active) throw new Error("membership inactive");
    if (m.loans.size >= rules.maxBooks) throw new Error(\`limit of \${rules.maxBooks} books reached\`);
    if (m.unpaidFinePaise > LibraryService.MAX_UNPAID_FINE) throw new Error("please clear fines first");
    if (it.status !== "AVAILABLE") throw new Error(\`this copy is \${it.status}\`);
    const loan = new Loan(it, m, today, today.plusDays(rules.loanDays));
    it.status = "LOANED";
    m.loans.set(barcode, loan);
    this.activeLoans.set(barcode, loan);
    return loan;
  }

  /** returns the fine charged (paise) */
  returnItem(barcode: string, today: LocalDate): number {
    const loan = this.activeLoans.get(barcode);
    if (loan === undefined) throw new Error(\`\${barcode} is not on loan\`);
    this.activeLoans.delete(barcode);
    loan.returnedOn = today;
    loan.member.loans.delete(barcode);
    loan.item.status = "AVAILABLE"; // topic 6: may become ON_HOLD for a waiting member
    const fine = loan.daysLate(today) * LibraryService.FINE_PER_DAY;
    loan.member.unpaidFinePaise += fine;
    return fine;
  }

  renew(barcode: string, today: LocalDate): Loan {
    const loan = this.activeLoans.get(barcode);
    if (loan === undefined) throw new Error(\`\${barcode} is not on loan\`);
    if (loan.daysLate(today) > 0) throw new Error("overdue items cannot be renewed");
    if (loan.renewals >= LibraryService.MAX_RENEWALS) throw new Error("renewal limit reached");
    loan.renewals++;
    loan.dueOn = loan.dueOn.plusDays(MEMBER_TYPES[loan.member.type].loanDays);
    return loan;
  }

  payFine(memberId: string, paise: number): void {
    const m = this.member(memberId);
    m.unpaidFinePaise = Math.max(0, m.unpaidFinePaise - paise);
  }
}

const cat = new Catalog();
const clean: Book = { isbn: "978-0132350884", title: "Clean Code", subject: "Software", authors: ["Robert Martin"] };
const ddia: Book = { isbn: "978-1449373320", title: "Designing Data Intensive Applications", subject: "Databases", authors: ["Martin Kleppmann"] };
cat.addBook(clean);
cat.addBook(ddia);
cat.addItem(new BookItem("BC-001", clean, "R1-S3"));
cat.addItem(new BookItem("BC-002", clean, "R1-S3"));
cat.addItem(new BookItem("BC-003", ddia, "R4-S1"));
console.log(\`\${cat.search("martin").length} books by a Martin\`); // 2
console.log(cat.search("clean martin")[0].title); // Clean Code

const lib = new LibraryService(cat);
lib.addMember(new Member("M1", "Priya", "STUDENT"));
const d1 = LocalDate.of(2026, 10, 1);
const loan = lib.checkout("M1", "BC-001", d1);
console.log(\`due \${loan.dueOn}, copies left \${cat.availableCopies(clean.isbn)}\`); // 2026-10-15, 1
const fine = lib.returnItem("BC-001", LocalDate.of(2026, 10, 20));
console.log(\`fine paise = \${fine}\`); // 5 days late -> 5000

// failure paths: each one is refused and changes nothing
lib.addMember(new Member("M2", "Dr. Rao", "FACULTY"));
const refused: (() => void)[] = [
  () => { lib.checkout("M9", "BC-001", d1); },
  () => { lib.checkout("M1", "BC-404", d1); },
  () => { lib.returnItem("BC-003", d1); },
];
for (const attempt of refused) {
  try {
    attempt();
  } catch (e) {
    console.log((e as Error).message);
  }
}
const d2 = LocalDate.of(2026, 10, 21);
console.log(\`due \${lib.checkout("M1", "BC-002", d2).dueOn}\`); // 2026-11-04
try {
  lib.checkout("M2", "BC-002", d2);
} catch (e) {
  console.log((e as Error).message); // this copy is LOANED
}
for (let i = 0; i < 3; i++) {
  try {
    console.log(\`renewed to \${lib.renew("BC-002", d2.plusDays(i + 1)).dueOn}\`);
  } catch (e) {
    console.log((e as Error).message);
  }
}
lib.checkout("M2", "BC-003", d1); // faculty: 30 days, due 2026-10-31
try {
  lib.renew("BC-003", LocalDate.of(2026, 11, 2));
} catch (e) {
  console.log((e as Error).message);
}` },
      { lang: 'cpp', code: `using Date = chrono::sys_days;

Date dateOf(int y, unsigned m, unsigned d) { return Date(chrono::year{y} / chrono::month{m} / chrono::day{d}); }

string str(Date d) {
    chrono::year_month_day ymd{d};
    char buf[16];
    snprintf(buf, sizeof buf, "%04d-%02u-%02u", int(ymd.year()), unsigned(ymd.month()), unsigned(ymd.day()));
    return buf;
}

enum class ItemStatus { Available, Loaned, OnHold, Lost, UnderRepair };

string name(ItemStatus s) {
    static const char* names[] = {"AVAILABLE", "LOANED", "ON_HOLD", "LOST", "UNDER_REPAIR"};
    return names[static_cast<int>(s)];
}

struct MemberType {
    int maxBooks, loanDays;
    static constexpr MemberType student() { return {5, 14}; }
    static constexpr MemberType faculty() { return {10, 30}; }
};

// The TITLE in the catalogue: one per ISBN, no matter how many copies exist.
struct Book { string isbn, title, subject; vector<string> authors; };

// A PHYSICAL copy with its own barcode, shelf and status. This is what gets lent.
struct BookItem {
    string barcode;
    const Book* book;
    string rack;
    ItemStatus status = ItemStatus::Available;
};

struct Loan;

struct Member {
    string id, name;
    MemberType type;
    bool active = true;
    long long unpaidFinePaise = 0;
    map<string, Loan*> loans;          // barcode -> active loan (the service owns the Loan objects)
    Member(string id, string name, MemberType type) : id(move(id)), name(move(name)), type(type) {}
};

struct Loan {
    BookItem* item;
    Member* member;
    Date issuedOn, dueOn;
    int renewals = 0;
    long long daysLate(Date on) const { return max(0LL, (long long)(on - dueOn).count()); }
};

vector<string> words(const string& text) {
    string lower = text;
    for (char& c : lower) c = tolower(static_cast<unsigned char>(c));
    istringstream in(lower);
    vector<string> out;
    for (string w; in >> w;) out.push_back(w);
    return out;
}

// Search: an inverted index "word -> ISBNs" over title and author words.
class Catalog {
    map<string, const Book*> byIsbn;
    map<string, BookItem*> byBarcode;
    map<string, vector<BookItem*>> copies;
    unordered_map<string, set<string>> index;

public:
    void addBook(const Book& b) {
        byIsbn[b.isbn] = &b;
        string all = b.title;
        for (const auto& a : b.authors) all += " " + a;
        for (const auto& w : words(all)) index[w].insert(b.isbn);
    }
    void addItem(BookItem& it) {
        if (!byIsbn.count(it.book->isbn)) throw invalid_argument("add the Book first");
        byBarcode[it.barcode] = &it;
        copies[it.book->isbn].push_back(&it);
    }
    // AND-search: every query word must match a title or author word.
    vector<const Book*> search(const string& query) const {
        optional<set<string>> result;
        for (const auto& w : words(query)) {
            auto it = index.find(w);
            set<string> hits = it == index.end() ? set<string>{} : it->second;
            if (!result) { result = hits; continue; }
            set<string> both;
            set_intersection(result->begin(), result->end(), hits.begin(), hits.end(), inserter(both, both.begin()));
            result = both;
        }
        vector<const Book*> out;
        if (result) for (const auto& isbn : *result) out.push_back(byIsbn.at(isbn));
        return out;
    }
    BookItem* item(const string& barcode) const {
        auto it = byBarcode.find(barcode);
        return it == byBarcode.end() ? nullptr : it->second;
    }
    long availableCopies(const string& isbn) const {
        auto it = copies.find(isbn);
        if (it == copies.end()) return 0;
        return count_if(it->second.begin(), it->second.end(), [](const BookItem* i) { return i->status == ItemStatus::Available; });
    }
};

class LibraryService {
    static constexpr long long MAX_UNPAID_FINE = 100'00;   // Rs 100
    static constexpr long long FINE_PER_DAY = 10'00;       // Rs 10 (topic 6 makes this a pluggable FinePolicy)
    static constexpr int MAX_RENEWALS = 2;

    Catalog& catalog;
    map<string, Member*> members;
    map<string, unique_ptr<Loan>> activeLoans;             // barcode -> loan, owned here
    recursive_mutex lock;

    Member& member(const string& id) {
        auto it = members.find(id);
        if (it == members.end()) throw invalid_argument("unknown member " + id);
        return *it->second;
    }

public:
    explicit LibraryService(Catalog& catalog) : catalog(catalog) {}
    void addMember(Member& m) { members[m.id] = &m; }

    const Loan& checkout(const string& memberId, const string& barcode, Date today) {
        lock_guard<recursive_mutex> g(lock);
        Member& m = member(memberId);
        BookItem* it = catalog.item(barcode);
        if (!it) throw invalid_argument("unknown barcode " + barcode);
        if (!m.active) throw runtime_error("membership inactive");
        if (static_cast<int>(m.loans.size()) >= m.type.maxBooks) throw runtime_error("limit of " + to_string(m.type.maxBooks) + " books reached");
        if (m.unpaidFinePaise > MAX_UNPAID_FINE) throw runtime_error("please clear fines first");
        if (it->status != ItemStatus::Available) throw runtime_error("this copy is " + name(it->status));
        auto loan = make_unique<Loan>(Loan{it, &m, today, today + chrono::days{m.type.loanDays}});
        it->status = ItemStatus::Loaned;
        m.loans[barcode] = loan.get();
        return *(activeLoans[barcode] = move(loan));
    }

    // returns the fine charged (paise)
    long long returnItem(const string& barcode, Date today) {
        lock_guard<recursive_mutex> g(lock);
        auto it = activeLoans.find(barcode);
        if (it == activeLoans.end()) throw runtime_error(barcode + " is not on loan");
        Loan& loan = *it->second;
        loan.member->loans.erase(barcode);
        loan.item->status = ItemStatus::Available;          // topic 6: may become ON_HOLD for a waiting member
        long long fine = loan.daysLate(today) * FINE_PER_DAY;
        loan.member->unpaidFinePaise += fine;
        activeLoans.erase(it);
        return fine;
    }

    const Loan& renew(const string& barcode, Date today) {
        lock_guard<recursive_mutex> g(lock);
        auto it = activeLoans.find(barcode);
        if (it == activeLoans.end()) throw runtime_error(barcode + " is not on loan");
        Loan& loan = *it->second;
        if (loan.daysLate(today) > 0) throw runtime_error("overdue items cannot be renewed");
        if (loan.renewals >= MAX_RENEWALS) throw runtime_error("renewal limit reached");
        loan.renewals++;
        loan.dueOn += chrono::days{loan.member->type.loanDays};
        return loan;
    }

    void payFine(const string& memberId, long long paise) {
        lock_guard<recursive_mutex> g(lock);
        Member& m = member(memberId);
        m.unpaidFinePaise = max(0LL, m.unpaidFinePaise - paise);
    }
};

int main() {
    Catalog cat;
    Book clean{"978-0132350884", "Clean Code", "Software", {"Robert Martin"}};
    Book ddia{"978-1449373320", "Designing Data Intensive Applications", "Databases", {"Martin Kleppmann"}};
    cat.addBook(clean);
    cat.addBook(ddia);
    BookItem bc1{"BC-001", &clean, "R1-S3"}, bc2{"BC-002", &clean, "R1-S3"}, bc3{"BC-003", &ddia, "R4-S1"};
    cat.addItem(bc1);
    cat.addItem(bc2);
    cat.addItem(bc3);
    cout << cat.search("martin").size() << " books by a Martin\\n";          // 2
    cout << cat.search("clean martin")[0]->title << "\\n";                    // Clean Code

    LibraryService lib(cat);
    Member priya("M1", "Priya", MemberType::student());
    lib.addMember(priya);
    Date d1 = dateOf(2026, 10, 1);
    const Loan& loan = lib.checkout("M1", "BC-001", d1);
    cout << "due " << str(loan.dueOn) << ", copies left " << cat.availableCopies(clean.isbn) << "\\n";   // 2026-10-15, 1
    long long fine = lib.returnItem("BC-001", dateOf(2026, 10, 20));
    cout << "fine paise = " << fine << "\\n";                                 // 5 days late -> 5000

    // failure paths: each one is refused and changes nothing
    Member rao("M2", "Dr. Rao", MemberType::faculty());
    lib.addMember(rao);
    vector<function<void()>> refused = {
        [&] { lib.checkout("M9", "BC-001", d1); },
        [&] { lib.checkout("M1", "BC-404", d1); },
        [&] { lib.returnItem("BC-003", d1); },
    };
    for (const auto& attempt : refused) {
        try {
            attempt();
        } catch (const exception& e) {
            cout << e.what() << "\\n";
        }
    }
    Date d2 = dateOf(2026, 10, 21);
    cout << "due " << str(lib.checkout("M1", "BC-002", d2).dueOn) << "\\n";   // 2026-11-04
    try {
        lib.checkout("M2", "BC-002", d2);
    } catch (const exception& e) {
        cout << e.what() << "\\n";                                            // this copy is LOANED
    }
    for (int i = 0; i < 3; i++) {
        try {
            string due = str(lib.renew("BC-002", d2 + chrono::days{i + 1}).dueOn);
            cout << "renewed to " << due << "\\n";
        } catch (const exception& e) {
            cout << e.what() << "\\n";
        }
    }
    lib.checkout("M2", "BC-003", d1);                                        // faculty: 30 days, due 2026-10-31
    try {
        lib.renew("BC-003", dateOf(2026, 11, 2));
    } catch (const exception& e) {
        cout << e.what() << "\\n";
    }
}` }
    ] }],
    codeTitle: 'Library core: Book vs BookItem, Catalog search, checkout / return / renew (a complete program)',
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
      { title: 'Due date and fine arithmetic', html: `<p>Issued 1 Oct, STUDENT → due 15 Oct. Returned 20 Oct: daysLate = epochDay(20 Oct) − epochDay(15 Oct) = <b>5</b>. Flat ₹10/day → <b>₹50</b> (5000 paise). Use a calendar-date type (<code>LocalDate</code>, <code>datetime.date</code>, <code>std::chrono::sys_days</code>; no time zone surprises at midnight) and day-count differences (<code>toEpochDay()</code>, <code>(b - a).days</code>) — never subtract day-of-month numbers (breaks across months).</p>`, code: `class DueDates {
    public static void main(String[] args) {
        LocalDate issued = LocalDate.of(2026, 10, 1);
        LocalDate due = issued.plusDays(14);                       // 2026-10-15
        LocalDate returned = LocalDate.of(2026, 11, 2);            // crosses a month boundary
        long late = Math.max(0, returned.toEpochDay() - due.toEpochDay());
        System.out.println(due + " late by " + late + " days");    // 18 days
        System.out.println("wrong way: " + (returned.getDayOfMonth() - due.getDayOfMonth()));  // -13 !
    }
}`, alt: [
          { lang: 'python', code: `from datetime import date, timedelta


class DueDates:
    @staticmethod
    def main() -> None:
        issued = date(2026, 10, 1)
        due = issued + timedelta(days=14)                          # 2026-10-15
        returned = date(2026, 11, 2)                               # crosses a month boundary
        late = max(0, (returned - due).days)
        print(f"{due.isoformat()} late by {late} days")            # 18 days
        print(f"wrong way: {returned.day - due.day}")              # -13 !


if __name__ == "__main__":
    DueDates.main()` },
          { lang: 'ts', code: `const DAY_MS = 86_400_000;

class DueDates {
  static main(): void {
    const issued = Date.UTC(2026, 9, 1); // months are 0-based in JS: 9 = October
    const due = issued + 14 * DAY_MS; // 2026-10-15
    const returned = Date.UTC(2026, 10, 2); // crosses a month boundary
    const late = Math.max(0, Math.round((returned - due) / DAY_MS));
    console.log(\`\${new Date(due).toISOString().slice(0, 10)} late by \${late} days\`); // 18 days
    console.log(\`wrong way: \${new Date(returned).getUTCDate() - new Date(due).getUTCDate()}\`); // -13 !
  }
}

DueDates.main();` },
          { lang: 'cpp', code: `class DueDates {
public:
    static void run() {
        using namespace chrono;
        sys_days issued = sys_days(year{2026} / October / 1);
        sys_days due = issued + days{14};                          // 2026-10-15
        sys_days returned = sys_days(year{2026} / November / 2);   // crosses a month boundary
        long long late = max(0LL, (long long)(returned - due).count());
        year_month_day d{due};
        printf("%04d-%02u-%02u late by %lld days\\n", int(d.year()), unsigned(d.month()), unsigned(d.day()), late);   // 18 days
        cout << "wrong way: " << int(unsigned(year_month_day{returned}.day())) - int(unsigned(d.day())) << "\\n";    // -13 !
    }
};

int main() { DueDates::run(); }` }
        ] },
      { title: 'Renewal blocked', html: `<p>Priya's loan is due 15 Oct. On 14 Oct she renews → renewals = 1, due = 29 Oct. On 30 Oct she tries again → ${H.c('r', 'rejected: overdue items cannot be renewed')} (she must return and pay ₹10). If another member had reserved the title, renewal would also be rejected — the reserver should get the next copy.</p>` },
      { title: 'Lost copy', html: `<p>A member reports BC-002 lost. Mark the BookItem <b>LOST</b> (never delete it — history and audit need it), close the Loan with a "lost" flag, and charge the replacement price via the FinePolicy. The <b>Book</b> still exists with its other copies; <code>availableCopies</code> just drops by one.</p>` }
    ],
    deepDive: `<p><b>Persistence model.</b> Tables: <code>book(isbn PK)</code>, <code>book_item(barcode PK, isbn FK, status, rack)</code>, <code>member(id PK, type, active)</code>, <code>loan(id PK, barcode FK, member_id FK, issued_on, due_on, returned_on, renewals)</code> with a <b>partial unique index</b> "one open loan per barcode" (<code>WHERE returned_on IS NULL</code>) as the database-level guard against double lending.</p>
<p><b>Concurrency.</b> Two librarians scanning the same copy at two desks is rare but possible (or a self-service kiosk and a desk). The in-memory service takes one lock; finer-grained: lock per member + per item in a fixed order (member first, then item) to avoid deadlock, or rely on the DB conditional update <code>UPDATE book_item SET status='LOANED' WHERE barcode=? AND status='AVAILABLE'</code>.</p>
<p><b>Time.</b> Libraries think in <b>dates</b>, not instants: use a calendar date in the library's zone, inject a clock to compute "today", and decide whether holidays extend due dates (a <code>HolidayCalendar</code> dependency).</p>
<p><b>Search at scale.</b> The in-memory inverted index is a toy Lucene/Elasticsearch: tokenisation, lower-casing, stemming ("designing" → "design"), stop words, ranking. In a real system the catalogue is indexed in a search engine and the lending tables live in a relational DB.</p>
<p><b>Why MemberType as an enum with fields?</b> Limits stay next to the type, so adding "ALUMNI(2, 7)" is one line. If limits must change at runtime (admin screen), move them to a <code>MembershipPolicy</code> loaded from config instead.</p>
<p><b>Audit trail.</b> Never overwrite: loans, fine payments and status changes are events. "Who damaged page 40?" is answered by the last loan before the copy was marked UNDER_REPAIR.</p>`,
    aiEra: `<p><b>What AI changes:</b> a library LLD is a classic training-data example, so an assistant will produce the standard class list immediately. The interviewer's real test is whether you <i>question</i> it: Book vs BookItem, where the rules live, what happens to reservations when a copy is returned, how fines are computed across month boundaries.</p>
<p><b>Use AI as a partner:</b> <code>Give me 15 edge-case scenarios for a library checkout/return/renew system (dates, limits, holds, lost books) as Given/When/Then.</code> Then turn them into unit tests with a fixed clock.</p>
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
      hints: [`<p>Hint 1: every rule has the same shape: look at (member, item, today) and either allow or give a reason. That is an interface with one method.</p>`, `<p>Hint 2: <code>interface LendingRule { Optional&lt;String&gt; violation(Member m, Item i, LocalDate today); }</code> (an optional or nullable reason) and a list of rules checked in order; the first reason found stops the chain.</p>`, `<p>Hint 3: only after the loop passes do you mutate (status → LOANED, add loan). Order cheap rules first; keep rules stateless so they are trivially testable and thread-safe.</p>`],
      tests: { io: true, cases: [{ stdin: '', stdout: 'REFUSED: reference books cannot be borrowed\nOK: Clean Code due 2026-10-15\nREFUSED: copy is LOANED\nmember(1 loans)\nREFUSED: membership inactive\nREFUSED: limit of 5 reached\nREFUSED: clear fines first\nOK: Refactoring due 2026-10-15\n' }] },
      solution: {
        approach: `<p>Chain of rules (a lightweight Chain of Responsibility / Specification pattern). The service owns an ordered list; new rules are registered, not coded into the method.</p>`,
        code: `final class Member { boolean active = true; int loans; int limit = 5; long finePaise; public String toString() { return "member(" + loans + " loans)"; } }
final class Item { String status = "AVAILABLE"; boolean reference; String title; Item(String t, boolean ref) { title = t; reference = ref; } public String toString() { return title; } }
record Loan(Item item, Member member, LocalDate due) {}
interface LendingRule { Optional<String> violation(Member m, Item i, LocalDate today); }

class RuleBasedLibrary {
    static final LendingRule ACTIVE = (m, i, d) -> m.active ? Optional.empty() : Optional.of("membership inactive");
    static final LendingRule LIMIT = (m, i, d) -> m.loans < m.limit ? Optional.empty() : Optional.of("limit of " + m.limit + " reached");
    static final LendingRule FINES = (m, i, d) -> m.finePaise <= 100_00 ? Optional.empty() : Optional.of("clear fines first");
    static final LendingRule AVAILABLE = (m, i, d) -> i.status.equals("AVAILABLE") ? Optional.empty() : Optional.of("copy is " + i.status);
    static final LendingRule NOT_REFERENCE = (m, i, d) -> i.reference ? Optional.of("reference books cannot be borrowed") : Optional.empty();

    private final List<LendingRule> rules = new ArrayList<>(List.of(ACTIVE, LIMIT, FINES, AVAILABLE));
    void register(LendingRule r) { rules.add(r); }

    /** A Loan, or the first failure reason. Mutates nothing unless every rule passes. */
    Object checkout(Member m, Item i, LocalDate today) {
        for (LendingRule r : rules) {
            Optional<String> v = r.violation(m, i, today);
            if (v.isPresent()) return v.get();
        }
        i.status = "LOANED";
        m.loans++;
        return new Loan(i, m, today.plusDays(14));
    }

    static void show(Object result) {
        if (result instanceof Loan l) System.out.println("OK: " + l.item() + " due " + l.due());
        else System.out.println("REFUSED: " + result);
    }

    public static void main(String[] args) {
        RuleBasedLibrary lib = new RuleBasedLibrary();
        lib.register(NOT_REFERENCE);                               // new policy, no edits to checkout()
        LocalDate today = LocalDate.of(2026, 10, 1);
        Member priya = new Member();
        Item dictionary = new Item("Oxford Dictionary", true), clean = new Item("Clean Code", false);
        show(lib.checkout(priya, dictionary, today));              // REFUSED: reference books cannot be borrowed
        show(lib.checkout(priya, clean, today));                   // OK: Clean Code due 2026-10-15
        show(lib.checkout(priya, clean, today));                   // REFUSED: copy is LOANED
        System.out.println(priya);                                 // member(1 loans): refusals changed nothing
        Member lapsed = new Member();
        lapsed.active = false;
        show(lib.checkout(lapsed, dictionary, today));             // REFUSED: membership inactive (first failing rule wins)
        Member full = new Member();
        full.loans = 5;
        show(lib.checkout(full, new Item("Refactoring", false), today));   // REFUSED: limit of 5 reached
        Member debtor = new Member();
        debtor.finePaise = 100_01;
        show(lib.checkout(debtor, new Item("Refactoring", false), today)); // REFUSED: clear fines first
        debtor.finePaise = 100_00;
        show(lib.checkout(debtor, new Item("Refactoring", false), today)); // OK: exactly Rs 100 is allowed
    }
}`,
        alt: [
          { lang: 'python', code: `from collections.abc import Callable
from dataclasses import dataclass
from datetime import date, timedelta


@dataclass
class Member:
    active: bool = True
    loans: int = 0
    limit: int = 5
    fine_paise: int = 0

    def __str__(self) -> str:
        return f"member({self.loans} loans)"


@dataclass
class Item:
    title: str
    reference: bool = False
    status: str = "AVAILABLE"

    def __str__(self) -> str:
        return self.title


@dataclass(frozen=True)
class Loan:
    item: Item
    member: Member
    due: date


# A rule returns the reason it refuses, or None when it is happy.
LendingRule = Callable[[Member, Item, date], str | None]

ACTIVE: LendingRule = lambda m, i, d: None if m.active else "membership inactive"
LIMIT: LendingRule = lambda m, i, d: None if m.loans < m.limit else f"limit of {m.limit} reached"
FINES: LendingRule = lambda m, i, d: None if m.fine_paise <= 100_00 else "clear fines first"
AVAILABLE: LendingRule = lambda m, i, d: None if i.status == "AVAILABLE" else f"copy is {i.status}"
NOT_REFERENCE: LendingRule = lambda m, i, d: "reference books cannot be borrowed" if i.reference else None


class RuleBasedLibrary:
    def __init__(self) -> None:
        self._rules: list[LendingRule] = [ACTIVE, LIMIT, FINES, AVAILABLE]

    def register(self, rule: LendingRule) -> None:
        self._rules.append(rule)

    def checkout(self, m: Member, i: Item, today: date) -> Loan | str:
        """A Loan, or the first failure reason. Mutates nothing unless every rule passes."""
        for rule in self._rules:
            reason = rule(m, i, today)
            if reason is not None:
                return reason
        i.status = "LOANED"
        m.loans += 1
        return Loan(i, m, today + timedelta(days=14))


def show(result: Loan | str) -> None:
    if isinstance(result, Loan):
        print(f"OK: {result.item} due {result.due.isoformat()}")
    else:
        print(f"REFUSED: {result}")


if __name__ == "__main__":
    lib = RuleBasedLibrary()
    lib.register(NOT_REFERENCE)  # new policy, no edits to checkout()
    today = date(2026, 10, 1)
    priya = Member()
    dictionary, clean = Item("Oxford Dictionary", True), Item("Clean Code")
    show(lib.checkout(priya, dictionary, today))
    show(lib.checkout(priya, clean, today))
    show(lib.checkout(priya, clean, today))
    print(priya)
    show(lib.checkout(Member(active=False), dictionary, today))
    show(lib.checkout(Member(loans=5), Item("Refactoring"), today))
    debtor = Member(fine_paise=100_01)
    show(lib.checkout(debtor, Item("Refactoring"), today))
    debtor.fine_paise = 100_00
    show(lib.checkout(debtor, Item("Refactoring"), today))` },
          { lang: 'ts', code: `class LocalDate {
  private constructor(private readonly epochDay: number) {}
  static of(y: number, m: number, d: number): LocalDate { return new LocalDate(Date.UTC(y, m - 1, d) / 86_400_000); }
  plusDays(n: number): LocalDate { return new LocalDate(this.epochDay + n); }
  toString(): string { return new Date(this.epochDay * 86_400_000).toISOString().slice(0, 10); }
}

class Member {
  active = true;
  loans = 0;
  limit = 5;
  finePaise = 0;
  toString(): string { return \`member(\${this.loans} loans)\`; }
}

class Item {
  status = "AVAILABLE";
  constructor(readonly title: string, readonly reference = false) {}
  toString(): string { return this.title; }
}

class Loan {
  constructor(readonly item: Item, readonly member: Member, readonly due: LocalDate) {}
}

// A rule returns the reason it refuses, or null when it is happy.
type LendingRule = (m: Member, i: Item, today: LocalDate) => string | null;

const ACTIVE: LendingRule = (m) => (m.active ? null : "membership inactive");
const LIMIT: LendingRule = (m) => (m.loans < m.limit ? null : \`limit of \${m.limit} reached\`);
const FINES: LendingRule = (m) => (m.finePaise <= 100_00 ? null : "clear fines first");
const AVAILABLE: LendingRule = (_m, i) => (i.status === "AVAILABLE" ? null : \`copy is \${i.status}\`);
const NOT_REFERENCE: LendingRule = (_m, i) => (i.reference ? "reference books cannot be borrowed" : null);

class RuleBasedLibrary {
  private readonly rules: LendingRule[] = [ACTIVE, LIMIT, FINES, AVAILABLE];

  register(rule: LendingRule): void { this.rules.push(rule); }

  /** A Loan, or the first failure reason. Mutates nothing unless every rule passes. */
  checkout(m: Member, i: Item, today: LocalDate): Loan | string {
    for (const rule of this.rules) {
      const reason = rule(m, i, today);
      if (reason !== null) return reason;
    }
    i.status = "LOANED";
    m.loans++;
    return new Loan(i, m, today.plusDays(14));
  }
}

function show(result: Loan | string): void {
  console.log(result instanceof Loan ? \`OK: \${result.item} due \${result.due}\` : \`REFUSED: \${result}\`);
}

const lib = new RuleBasedLibrary();
lib.register(NOT_REFERENCE); // new policy, no edits to checkout()
const today = LocalDate.of(2026, 10, 1);
const priya = new Member();
const dictionary = new Item("Oxford Dictionary", true), clean = new Item("Clean Code");
show(lib.checkout(priya, dictionary, today));
show(lib.checkout(priya, clean, today));
show(lib.checkout(priya, clean, today));
console.log(String(priya));
const lapsed = new Member();
lapsed.active = false;
show(lib.checkout(lapsed, dictionary, today));
const full = new Member();
full.loans = 5;
show(lib.checkout(full, new Item("Refactoring"), today));
const debtor = new Member();
debtor.finePaise = 100_01;
show(lib.checkout(debtor, new Item("Refactoring"), today));
debtor.finePaise = 100_00;
show(lib.checkout(debtor, new Item("Refactoring"), today));` },
          { lang: 'cpp', code: `using Date = chrono::sys_days;

Date dateOf(int y, unsigned m, unsigned d) { return Date(chrono::year{y} / chrono::month{m} / chrono::day{d}); }

string str(Date d) {
    chrono::year_month_day ymd{d};
    char buf[16];
    snprintf(buf, sizeof buf, "%04d-%02u-%02u", int(ymd.year()), unsigned(ymd.month()), unsigned(ymd.day()));
    return buf;
}

struct Member {
    bool active = true;
    int loans = 0;
    int limit = 5;
    long long finePaise = 0;
};

struct Item {
    string title;
    bool reference = false;
    string status = "AVAILABLE";
};

struct Loan {
    const Item* item;
    const Member* member;
    Date due;
};

// A rule returns the reason it refuses, or nullopt when it is happy.
using LendingRule = function<optional<string>(const Member&, const Item&, Date)>;

const LendingRule ACTIVE = [](const Member& m, const Item&, Date) -> optional<string> {
    if (m.active) return nullopt;
    return "membership inactive";
};
const LendingRule LIMIT = [](const Member& m, const Item&, Date) -> optional<string> {
    if (m.loans < m.limit) return nullopt;
    return "limit of " + to_string(m.limit) + " reached";
};
const LendingRule FINES = [](const Member& m, const Item&, Date) -> optional<string> {
    if (m.finePaise <= 100'00) return nullopt;
    return "clear fines first";
};
const LendingRule AVAILABLE = [](const Member&, const Item& i, Date) -> optional<string> {
    if (i.status == "AVAILABLE") return nullopt;
    return "copy is " + i.status;
};
const LendingRule NOT_REFERENCE = [](const Member&, const Item& i, Date) -> optional<string> {
    if (!i.reference) return nullopt;
    return "reference books cannot be borrowed";
};

class RuleBasedLibrary {
    vector<LendingRule> rules{ACTIVE, LIMIT, FINES, AVAILABLE};

public:
    void registerRule(LendingRule r) { rules.push_back(move(r)); }

    // A Loan, or the first failure reason. Mutates nothing unless every rule passes.
    variant<Loan, string> checkout(Member& m, Item& i, Date today) {
        for (const auto& rule : rules)
            if (auto reason = rule(m, i, today)) return *reason;
        i.status = "LOANED";
        m.loans++;
        return Loan{&i, &m, today + chrono::days{14}};
    }
};

void show(const variant<Loan, string>& result) {
    if (auto* loan = get_if<Loan>(&result)) cout << "OK: " << loan->item->title << " due " << str(loan->due) << "\\n";
    else cout << "REFUSED: " << get<string>(result) << "\\n";
}

int main() {
    RuleBasedLibrary lib;
    lib.registerRule(NOT_REFERENCE);   // new policy, no edits to checkout()
    Date today = dateOf(2026, 10, 1);
    Member priya;
    Item dictionary{"Oxford Dictionary", true}, clean{"Clean Code"};
    show(lib.checkout(priya, dictionary, today));
    show(lib.checkout(priya, clean, today));
    show(lib.checkout(priya, clean, today));
    cout << "member(" << priya.loans << " loans)\\n";
    Member lapsed;
    lapsed.active = false;
    show(lib.checkout(lapsed, dictionary, today));
    Member full;
    full.loans = 5;
    Item refactoring1{"Refactoring"}, refactoring2{"Refactoring"}, refactoring3{"Refactoring"};
    show(lib.checkout(full, refactoring1, today));
    Member debtor;
    debtor.finePaise = 100'01;
    show(lib.checkout(debtor, refactoring2, today));
    debtor.finePaise = 100'00;
    show(lib.checkout(debtor, refactoring3, today));
}` }
        ],
        complexity: `<p>O(R) per checkout for R rules (each O(1)). Rules are stateless functions → thread-safe and unit-testable in isolation.</p>`,
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
        System.out.println(desk.checkout(meena, ddia, d0.plusDays(28)));     // OK, due 2026-11-28 (faculty: 30 days)

        // failure paths
        Copy lost = new Copy("BC-7", "978-0", 100_00);
        lost.moveTo(CopyState.LOST);
        System.out.println(desk.checkout(ravi, lost, d0));                   // REFUSED: copy is LOST
        try { lost.moveTo(CopyState.LOANED); } catch (IllegalStateException e) { System.out.println(e.getMessage()); }   // BC-7: LOST -> LOANED is not allowed
        Patron lapsed = new Patron("zed", false);
        lapsed.active = false;
        System.out.println(desk.checkout(lapsed, new Copy("BC-8", "978-1", 100_00), d0));   // REFUSED: membership inactive
        ravi.finePaise = 100_01;
        System.out.println(desk.checkout(ravi, new Copy("BC-8", "978-1", 100_00), d0));     // REFUSED: clear fines above Rs 100 first
        System.out.println(res.reserve(ddia.isbn, "ravi") + " " + res.reserve(ddia.isbn, "ravi"));   // true false: no duplicate reservations
    }
}`;

  topics.push({
    title: 'Library Management II: Lending Rules, Fines, Reservations & Copy States',
    analogy: `<p>Think of the <b>pickup counter at a bakery</b> that bakes fresh bread a few times a day. People who pre-ordered are on a list; when a loaf comes out, the baker keeps it aside with the <b>first name on the list</b> and calls them. If they do not come within an hour, the loaf goes to the <b>next name</b>. If nobody is waiting, it goes on the open shelf for anyone. And if you are late collecting a loan from the bank, there is a late fee — small at first, bigger later, but never more than the loan itself. A library's reservation shelf and fine rules work exactly like this.</p>`,
    explain: `<p>Topic 5 built the skeleton. Now we make the <b>business rules</b> clean and extensible — this is where interviewers separate "it works" from "it is well designed".</p>
<h4>1. Lending rules as objects</h4>
<p><code>interface LendingRule { Optional&lt;String&gt; violation(Patron p, Copy c, LocalDate today); }</code> (the reason to refuse, or nothing). Each rule is a tiny class (or function): ActiveMember, LoanLimit, FineThreshold, CopyFreeForPatron, NotReferenceBook, AgeRestriction… The desk loops over an ordered list and stops at the first violation. New policy = new class (Open/Closed). This is a light <b>Chain of Responsibility</b> / <b>Specification</b> pattern.</p>
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
<p>Encoding this table (a map from state to the set of allowed next states: <code>EnumMap&lt;State, EnumSet&lt;State&gt;&gt;</code>, <code>dict[State, set[State]]</code>, <code>map&lt;State, set&lt;State&gt;&gt;</code>) makes illegal moves like LOST → LOANED throw immediately instead of silently corrupting data. For richer behaviour per state, upgrade to the full <b>State pattern</b> (covered in the next module).</p>`,
    clues: [
      '"Member can reserve a book that is currently issued" → FIFO waitlist per ISBN + ON_HOLD state',
      '"Notify the member when the book is available" → Observer (HoldListener: SMS, email, push)',
      '"Reserved book must be collected within 3 days" → hold expiry, then pass to the next waiter',
      '"Different fine rules for students and faculty / cap at book price" → FinePolicy strategy + decorator',
      '"Cannot renew if someone else reserved it" → renewal rule consults the reservation desk',
      '"Book can be lost, damaged, under repair" → explicit copy state machine with allowed transitions'
    ],
    code: [{ lang: 'java', code: LIB_RULES, alt: [
      { lang: 'python', code: `from abc import ABC, abstractmethod
from collections import deque
from collections.abc import Callable, Iterable
from dataclasses import dataclass
from datetime import date, timedelta
from enum import Enum


class CopyState(Enum):
    AVAILABLE = "AVAILABLE"
    LOANED = "LOANED"
    ON_HOLD = "ON_HOLD"
    LOST = "LOST"
    UNDER_REPAIR = "UNDER_REPAIR"

    def can_go(self, to: "CopyState") -> bool:
        return to in _NEXT[self]


_NEXT: dict[CopyState, set[CopyState]] = {
    CopyState.AVAILABLE: {CopyState.LOANED, CopyState.ON_HOLD, CopyState.UNDER_REPAIR, CopyState.LOST},
    CopyState.LOANED: {CopyState.AVAILABLE, CopyState.ON_HOLD, CopyState.LOST, CopyState.UNDER_REPAIR},
    CopyState.ON_HOLD: {CopyState.LOANED, CopyState.AVAILABLE, CopyState.ON_HOLD},   # ON_HOLD -> ON_HOLD = pass to next waiter
    CopyState.UNDER_REPAIR: {CopyState.AVAILABLE, CopyState.ON_HOLD, CopyState.LOST},
    CopyState.LOST: {CopyState.AVAILABLE},                                           # found again
}


@dataclass(eq=False)
class Copy:
    barcode: str
    isbn: str
    price_paise: int
    state: CopyState = CopyState.AVAILABLE
    hold_for: str | None = None          # patron id while ON_HOLD
    hold_until: date | None = None

    def move_to(self, to: CopyState) -> None:
        if not self.state.can_go(to):
            raise RuntimeError(f"{self.barcode}: {self.state.value} -> {to.value} is not allowed")
        self.state = to


@dataclass(eq=False)
class Patron:
    id: str
    faculty: bool
    active: bool = True
    loans: int = 0
    fine_paise: int = 0

    def limit(self) -> int:
        return 10 if self.faculty else 5


# ---------- Fines: Strategy (+ a Decorator for discounts) ----------
class FinePolicy(ABC):
    @abstractmethod
    def fine(self, days_late: int, copy: Copy, p: Patron) -> int: ...


class FlatFine(FinePolicy):
    def __init__(self, per_day: int) -> None:
        self._per_day = per_day

    def fine(self, days_late: int, copy: Copy, p: Patron) -> int:
        return days_late * self._per_day


class TieredCappedFine(FinePolicy):
    """First 7 late days Rs 2/day, then Rs 5/day, never more than the book's price."""

    def fine(self, days_late: int, copy: Copy, p: Patron) -> int:
        f = min(days_late, 7) * 2_00 + max(0, days_late - 7) * 5_00
        return min(f, copy.price_paise)


class FacultyHalfPrice(FinePolicy):
    """Decorator: wraps any other policy."""

    def __init__(self, inner: FinePolicy) -> None:
        self._inner = inner

    def fine(self, days_late: int, copy: Copy, p: Patron) -> int:
        f = self._inner.fine(days_late, copy, p)
        return f // 2 if p.faculty else f


# ---------- Lending rules: each one a tiny function that returns a reason to refuse, or None ----------
LendingRule = Callable[[Patron, Copy, date], str | None]


def active(p: Patron, c: Copy, d: date) -> str | None:
    return None if p.active else "membership inactive"


def limit(p: Patron, c: Copy, d: date) -> str | None:
    return None if p.loans < p.limit() else f"limit {p.limit()} reached"


def fines(p: Patron, c: Copy, d: date) -> str | None:
    return None if p.fine_paise <= 100_00 else "clear fines above Rs 100 first"


def copy_free(p: Patron, c: Copy, d: date) -> str | None:
    if c.state is CopyState.AVAILABLE:
        return None
    my_hold = c.state is CopyState.ON_HOLD and p.id == c.hold_for and c.hold_until is not None and d <= c.hold_until
    return None if my_hold else f"copy is {c.state.value}"


# ---------- Reservations: FIFO queue per title + Observer notifications ----------
HoldListener = Callable[[str, Copy, date], None]


class ReservationDesk:
    PICKUP_DAYS = 3

    def __init__(self) -> None:
        self._waitlist: dict[str, deque[str]] = {}      # isbn -> patron ids
        self._listeners: list[HoldListener] = []

    def subscribe(self, listener: HoldListener) -> None:
        self._listeners.append(listener)

    def reserve(self, isbn: str, patron_id: str) -> bool:
        q = self._waitlist.setdefault(isbn, deque())
        if patron_id in q:                               # no duplicate reservations
            return False
        q.append(patron_id)
        return True

    def has_waiters(self, isbn: str) -> bool:
        return bool(self._waitlist.get(isbn))

    def copy_freed(self, c: Copy, today: date) -> None:
        """A copy just became free: returned, repaired, or its previous hold expired."""
        q = self._waitlist.get(c.isbn)
        if not q:
            c.move_to(CopyState.AVAILABLE)
            c.hold_for = c.hold_until = None
            return
        nxt = q.popleft()
        c.move_to(CopyState.ON_HOLD)
        c.hold_for = nxt
        c.hold_until = today + timedelta(days=self.PICKUP_DAYS)
        for listener in self._listeners:
            listener(nxt, c, c.hold_until)

    def expire_holds(self, copies: Iterable[Copy], today: date) -> None:
        """Run once a day (or lazily on access): pass expired holds to the next person."""
        for c in copies:
            if c.state is CopyState.ON_HOLD and c.hold_until is not None and today > c.hold_until:
                self.copy_freed(c, today)


# ---------- The desk that ties it all together ----------
class LendingDesk:
    def __init__(self, fine_policy: FinePolicy, reservations: ReservationDesk) -> None:
        self._rules: list[LendingRule] = [active, limit, fines, copy_free]
        self._fine_policy = fine_policy
        self._reservations = reservations
        self._due_dates: dict[str, date] = {}            # barcode -> due date

    def checkout(self, p: Patron, c: Copy, today: date) -> str:
        for rule in self._rules:
            reason = rule(p, c, today)
            if reason is not None:
                return f"REFUSED: {reason}"
        c.move_to(CopyState.LOANED)
        c.hold_for = c.hold_until = None
        p.loans += 1
        due = today + timedelta(days=30 if p.faculty else 14)
        self._due_dates[c.barcode] = due
        return f"OK, due {due.isoformat()}"

    def give_back(self, p: Patron, c: Copy, today: date) -> int:
        due = self._due_dates.pop(c.barcode)
        late = max(0, (today - due).days)
        fine = self._fine_policy.fine(late, c, p)
        p.fine_paise += fine
        p.loans -= 1
        self._reservations.copy_freed(c, today)          # AVAILABLE, or ON_HOLD for the first waiter
        return fine

    def renew(self, p: Patron, c: Copy, today: date) -> bool:
        due = self._due_dates.get(c.barcode)
        if due is None or today > due or self._reservations.has_waiters(c.isbn):
            return False
        self._due_dates[c.barcode] = due + timedelta(days=30 if p.faculty else 14)
        return True


def main() -> None:
    res = ReservationDesk()
    res.subscribe(lambda who, copy, by: print(f"SMS to {who}: {copy.barcode} is held for you until {by.isoformat()}"))
    desk = LendingDesk(FacultyHalfPrice(TieredCappedFine()), res)

    ddia = Copy("BC-9", "978-1449373320", 300_00)
    priya, ravi, meena = Patron("priya", False), Patron("ravi", False), Patron("meena", True)
    d0 = date(2026, 10, 1)

    print(desk.checkout(priya, ddia, d0))                                    # OK, due 2026-10-15
    res.reserve(ddia.isbn, "ravi")
    res.reserve(ddia.isbn, "meena")
    print(f"renew? {str(desk.renew(priya, ddia, d0 + timedelta(days=10))).lower()}")   # false: people are waiting
    fine = desk.give_back(priya, ddia, d0 + timedelta(days=23))              # 9 days late -> 7*200 + 2*500 = 2400
    print(f"fine paise = {fine}, state = {ddia.state.value}")                # ON_HOLD for ravi
    print(desk.checkout(meena, ddia, d0 + timedelta(days=24)))               # REFUSED: held for ravi
    res.expire_holds([ddia], d0 + timedelta(days=27))                        # ravi never came -> meena
    print(desk.checkout(meena, ddia, d0 + timedelta(days=28)))               # OK, due 2026-11-28 (faculty: 30 days)

    # failure paths
    lost = Copy("BC-7", "978-0", 100_00)
    lost.move_to(CopyState.LOST)
    print(desk.checkout(ravi, lost, d0))                                     # REFUSED: copy is LOST
    try:
        lost.move_to(CopyState.LOANED)
    except RuntimeError as e:
        print(e)                                                              # BC-7: LOST -> LOANED is not allowed
    lapsed = Patron("zed", False, active=False)
    print(desk.checkout(lapsed, Copy("BC-8", "978-1", 100_00), d0))          # REFUSED: membership inactive
    ravi.fine_paise = 100_01
    print(desk.checkout(ravi, Copy("BC-8", "978-1", 100_00), d0))            # REFUSED: clear fines above Rs 100 first
    print(str(res.reserve(ddia.isbn, "ravi")).lower(), str(res.reserve(ddia.isbn, "ravi")).lower())   # true false


if __name__ == "__main__":
    main()` },
      { lang: 'ts', code: `class LocalDate {
  private constructor(private readonly epochDay: number) {}
  static of(y: number, m: number, d: number): LocalDate { return new LocalDate(Date.UTC(y, m - 1, d) / 86_400_000); }
  plusDays(n: number): LocalDate { return new LocalDate(this.epochDay + n); }
  daysUntil(o: LocalDate): number { return o.epochDay - this.epochDay; }
  isAfter(o: LocalDate): boolean { return this.epochDay > o.epochDay; }
  toString(): string { return new Date(this.epochDay * 86_400_000).toISOString().slice(0, 10); }
}

type CopyState = "AVAILABLE" | "LOANED" | "ON_HOLD" | "LOST" | "UNDER_REPAIR";

const NEXT: Record<CopyState, readonly CopyState[]> = {
  AVAILABLE: ["LOANED", "ON_HOLD", "UNDER_REPAIR", "LOST"],
  LOANED: ["AVAILABLE", "ON_HOLD", "LOST", "UNDER_REPAIR"],
  ON_HOLD: ["LOANED", "AVAILABLE", "ON_HOLD"], // ON_HOLD -> ON_HOLD = pass to next waiter
  UNDER_REPAIR: ["AVAILABLE", "ON_HOLD", "LOST"],
  LOST: ["AVAILABLE"], // found again
};

class Copy {
  state: CopyState = "AVAILABLE";
  holdFor: string | null = null; // patron id while ON_HOLD
  holdUntil: LocalDate | null = null;
  constructor(readonly barcode: string, readonly isbn: string, readonly pricePaise: number) {}

  moveTo(to: CopyState): void {
    if (!NEXT[this.state].includes(to)) throw new Error(\`\${this.barcode}: \${this.state} -> \${to} is not allowed\`);
    this.state = to;
  }
}

class Patron {
  active = true;
  loans = 0;
  finePaise = 0;
  constructor(readonly id: string, readonly faculty: boolean) {}
  limit(): number { return this.faculty ? 10 : 5; }
}

// ---------- Fines: Strategy (+ a Decorator for discounts) ----------
interface FinePolicy {
  fine(daysLate: number, copy: Copy, p: Patron): number;
}

class FlatFine implements FinePolicy {
  constructor(private readonly perDay: number) {}
  fine(d: number): number { return d * this.perDay; }
}

/** First 7 late days Rs 2/day, then Rs 5/day, never more than the book's price. */
class TieredCappedFine implements FinePolicy {
  fine(d: number, c: Copy): number {
    const f = Math.min(d, 7) * 2_00 + Math.max(0, d - 7) * 5_00;
    return Math.min(f, c.pricePaise);
  }
}

// decorator: wraps any other policy
class FacultyHalfPrice implements FinePolicy {
  constructor(private readonly inner: FinePolicy) {}
  fine(d: number, c: Copy, p: Patron): number {
    const f = this.inner.fine(d, c, p);
    return p.faculty ? Math.floor(f / 2) : f;
  }
}

// ---------- Lending rules: each one a tiny function that returns a reason to refuse, or null ----------
type LendingRule = (p: Patron, c: Copy, today: LocalDate) => string | null;

const Rules: Record<"ACTIVE" | "LIMIT" | "FINES" | "COPY_FREE", LendingRule> = {
  ACTIVE: (p) => (p.active ? null : "membership inactive"),
  LIMIT: (p) => (p.loans < p.limit() ? null : \`limit \${p.limit()} reached\`),
  FINES: (p) => (p.finePaise <= 100_00 ? null : "clear fines above Rs 100 first"),
  COPY_FREE: (p, c, d) => {
    if (c.state === "AVAILABLE") return null;
    const myHold = c.state === "ON_HOLD" && p.id === c.holdFor && c.holdUntil !== null && !d.isAfter(c.holdUntil);
    return myHold ? null : \`copy is \${c.state}\`;
  },
};

// ---------- Reservations: FIFO queue per title + Observer notifications ----------
type HoldListener = (patronId: string, copy: Copy, pickupBy: LocalDate) => void;

class ReservationDesk {
  static readonly PICKUP_DAYS = 3;
  private readonly waitlist = new Map<string, string[]>(); // isbn -> patron ids
  private readonly listeners: HoldListener[] = [];

  subscribe(l: HoldListener): void { this.listeners.push(l); }

  reserve(isbn: string, patronId: string): boolean {
    const q = this.waitlist.get(isbn) ?? [];
    this.waitlist.set(isbn, q);
    if (q.includes(patronId)) return false; // no duplicate reservations
    q.push(patronId);
    return true;
  }

  hasWaiters(isbn: string): boolean { return (this.waitlist.get(isbn)?.length ?? 0) > 0; }

  /** A copy just became free: returned, repaired, or its previous hold expired. */
  copyFreed(c: Copy, today: LocalDate): void {
    const next = this.waitlist.get(c.isbn)?.shift();
    if (next === undefined) {
      c.moveTo("AVAILABLE");
      c.holdFor = null;
      c.holdUntil = null;
      return;
    }
    c.moveTo("ON_HOLD");
    c.holdFor = next;
    const pickupBy = today.plusDays(ReservationDesk.PICKUP_DAYS);
    c.holdUntil = pickupBy;
    for (const l of this.listeners) l(next, c, pickupBy);
  }

  /** Run once a day (or lazily on access): pass expired holds to the next person. */
  expireHolds(copies: Iterable<Copy>, today: LocalDate): void {
    for (const c of copies) if (c.state === "ON_HOLD" && c.holdUntil !== null && today.isAfter(c.holdUntil)) this.copyFreed(c, today);
  }
}

// ---------- The desk that ties it all together ----------
class LendingDesk {
  private readonly rules: LendingRule[] = [Rules.ACTIVE, Rules.LIMIT, Rules.FINES, Rules.COPY_FREE];
  private readonly dueDates = new Map<string, LocalDate>(); // barcode -> due date

  constructor(private readonly finePolicy: FinePolicy, private readonly reservations: ReservationDesk) {}

  checkout(p: Patron, c: Copy, today: LocalDate): string {
    for (const rule of this.rules) {
      const reason = rule(p, c, today);
      if (reason !== null) return \`REFUSED: \${reason}\`;
    }
    c.moveTo("LOANED");
    c.holdFor = null;
    c.holdUntil = null;
    p.loans++;
    const due = today.plusDays(p.faculty ? 30 : 14);
    this.dueDates.set(c.barcode, due);
    return \`OK, due \${due}\`;
  }

  giveBack(p: Patron, c: Copy, today: LocalDate): number {
    const due = this.dueDates.get(c.barcode) as LocalDate;
    this.dueDates.delete(c.barcode);
    const late = Math.max(0, due.daysUntil(today));
    const fine = this.finePolicy.fine(late, c, p);
    p.finePaise += fine;
    p.loans--;
    this.reservations.copyFreed(c, today); // AVAILABLE, or ON_HOLD for the first waiter
    return fine;
  }

  renew(p: Patron, c: Copy, today: LocalDate): boolean {
    const due = this.dueDates.get(c.barcode);
    if (due === undefined || today.isAfter(due) || this.reservations.hasWaiters(c.isbn)) return false;
    this.dueDates.set(c.barcode, due.plusDays(p.faculty ? 30 : 14));
    return true;
  }
}

const res = new ReservationDesk();
res.subscribe((who, copy, by) => console.log(\`SMS to \${who}: \${copy.barcode} is held for you until \${by}\`));
const desk = new LendingDesk(new FacultyHalfPrice(new TieredCappedFine()), res);

const ddia = new Copy("BC-9", "978-1449373320", 300_00);
const priya = new Patron("priya", false), ravi = new Patron("ravi", false), meena = new Patron("meena", true);
const d0 = LocalDate.of(2026, 10, 1);

console.log(desk.checkout(priya, ddia, d0)); // OK, due 2026-10-15
res.reserve(ddia.isbn, "ravi");
res.reserve(ddia.isbn, "meena");
console.log(\`renew? \${desk.renew(priya, ddia, d0.plusDays(10))}\`); // false: people are waiting
const fine = desk.giveBack(priya, ddia, d0.plusDays(23)); // 9 days late -> 7*200 + 2*500 = 2400
console.log(\`fine paise = \${fine}, state = \${ddia.state}\`); // ON_HOLD for ravi
console.log(desk.checkout(meena, ddia, d0.plusDays(24))); // REFUSED: held for ravi
res.expireHolds([ddia], d0.plusDays(27)); // ravi never came -> meena
console.log(desk.checkout(meena, ddia, d0.plusDays(28))); // OK, due 2026-11-28 (faculty: 30 days)

// failure paths
const lost = new Copy("BC-7", "978-0", 100_00);
lost.moveTo("LOST");
console.log(desk.checkout(ravi, lost, d0)); // REFUSED: copy is LOST
try {
  lost.moveTo("LOANED");
} catch (e) {
  console.log((e as Error).message); // BC-7: LOST -> LOANED is not allowed
}
const lapsed = new Patron("zed", false);
lapsed.active = false;
console.log(desk.checkout(lapsed, new Copy("BC-8", "978-1", 100_00), d0)); // REFUSED: membership inactive
ravi.finePaise = 100_01;
console.log(desk.checkout(ravi, new Copy("BC-8", "978-1", 100_00), d0)); // REFUSED: clear fines above Rs 100 first
console.log(\`\${res.reserve(ddia.isbn, "ravi")} \${res.reserve(ddia.isbn, "ravi")}\`); // true false` },
      { lang: 'cpp', code: `using Date = chrono::sys_days;

Date dateOf(int y, unsigned m, unsigned d) { return Date(chrono::year{y} / chrono::month{m} / chrono::day{d}); }

string str(Date d) {
    chrono::year_month_day ymd{d};
    char buf[16];
    snprintf(buf, sizeof buf, "%04d-%02u-%02u", int(ymd.year()), unsigned(ymd.month()), unsigned(ymd.day()));
    return buf;
}

enum class CopyState { Available, Loaned, OnHold, Lost, UnderRepair };

string name(CopyState s) {
    static const char* names[] = {"AVAILABLE", "LOANED", "ON_HOLD", "LOST", "UNDER_REPAIR"};
    return names[static_cast<int>(s)];
}

bool canGo(CopyState from, CopyState to) {
    static const map<CopyState, set<CopyState>> next = {
        {CopyState::Available, {CopyState::Loaned, CopyState::OnHold, CopyState::UnderRepair, CopyState::Lost}},
        {CopyState::Loaned, {CopyState::Available, CopyState::OnHold, CopyState::Lost, CopyState::UnderRepair}},
        {CopyState::OnHold, {CopyState::Loaned, CopyState::Available, CopyState::OnHold}},   // ON_HOLD -> ON_HOLD = pass to next waiter
        {CopyState::UnderRepair, {CopyState::Available, CopyState::OnHold, CopyState::Lost}},
        {CopyState::Lost, {CopyState::Available}},                                           // found again
    };
    return next.at(from).count(to) > 0;
}

struct Copy {
    string barcode, isbn;
    long long pricePaise;
    CopyState state = CopyState::Available;
    string holdFor;                  // patron id while ON_HOLD
    optional<Date> holdUntil;

    Copy(string barcode, string isbn, long long pricePaise) : barcode(move(barcode)), isbn(move(isbn)), pricePaise(pricePaise) {}

    void moveTo(CopyState to) {
        if (!canGo(state, to)) throw runtime_error(barcode + ": " + name(state) + " -> " + name(to) + " is not allowed");
        state = to;
    }
};

struct Patron {
    string id;
    bool faculty;
    bool active = true;
    int loans = 0;
    long long finePaise = 0;
    Patron(string id, bool faculty) : id(move(id)), faculty(faculty) {}
    int limit() const { return faculty ? 10 : 5; }
};

// ---------- Fines: Strategy (+ a Decorator for discounts) ----------
class FinePolicy {
public:
    virtual ~FinePolicy() = default;
    virtual long long fine(long long daysLate, const Copy& copy, const Patron& p) const = 0;
};

class FlatFine : public FinePolicy {
    long long perDay;
public:
    explicit FlatFine(long long perDay) : perDay(perDay) {}
    long long fine(long long d, const Copy&, const Patron&) const override { return d * perDay; }
};

// First 7 late days Rs 2/day, then Rs 5/day, never more than the book's price.
class TieredCappedFine : public FinePolicy {
public:
    long long fine(long long d, const Copy& c, const Patron&) const override {
        long long f = min(d, 7LL) * 2'00 + max(0LL, d - 7) * 5'00;
        return min(f, c.pricePaise);
    }
};

// decorator: wraps any other policy and owns it
class FacultyHalfPrice : public FinePolicy {
    unique_ptr<FinePolicy> inner;
public:
    explicit FacultyHalfPrice(unique_ptr<FinePolicy> inner) : inner(move(inner)) {}
    long long fine(long long d, const Copy& c, const Patron& p) const override {
        long long f = inner->fine(d, c, p);
        return p.faculty ? f / 2 : f;
    }
};

// ---------- Lending rules: each one a tiny function that returns a reason to refuse, or nullopt ----------
using LendingRule = function<optional<string>(const Patron&, const Copy&, Date)>;

namespace Rules {
const LendingRule ACTIVE = [](const Patron& p, const Copy&, Date) -> optional<string> {
    if (p.active) return nullopt;
    return "membership inactive";
};
const LendingRule LIMIT = [](const Patron& p, const Copy&, Date) -> optional<string> {
    if (p.loans < p.limit()) return nullopt;
    return "limit " + to_string(p.limit()) + " reached";
};
const LendingRule FINES = [](const Patron& p, const Copy&, Date) -> optional<string> {
    if (p.finePaise <= 100'00) return nullopt;
    return "clear fines above Rs 100 first";
};
const LendingRule COPY_FREE = [](const Patron& p, const Copy& c, Date d) -> optional<string> {
    if (c.state == CopyState::Available) return nullopt;
    bool myHold = c.state == CopyState::OnHold && p.id == c.holdFor && c.holdUntil && d <= *c.holdUntil;
    if (myHold) return nullopt;
    return "copy is " + name(c.state);
};
}  // namespace Rules

// ---------- Reservations: FIFO queue per title + Observer notifications ----------
using HoldListener = function<void(const string&, const Copy&, Date)>;

class ReservationDesk {
    static constexpr int PICKUP_DAYS = 3;
    map<string, deque<string>> waitlist;          // isbn -> patron ids
    vector<HoldListener> listeners;

public:
    void subscribe(HoldListener l) { listeners.push_back(move(l)); }

    bool reserve(const string& isbn, const string& patronId) {
        auto& q = waitlist[isbn];
        if (find(q.begin(), q.end(), patronId) != q.end()) return false;       // no duplicate reservations
        q.push_back(patronId);
        return true;
    }

    bool hasWaiters(const string& isbn) const {
        auto it = waitlist.find(isbn);
        return it != waitlist.end() && !it->second.empty();
    }

    // A copy just became free: returned, repaired, or its previous hold expired.
    void copyFreed(Copy& c, Date today) {
        auto it = waitlist.find(c.isbn);
        if (it == waitlist.end() || it->second.empty()) {
            c.moveTo(CopyState::Available);
            c.holdFor.clear();
            c.holdUntil.reset();
            return;
        }
        string next = it->second.front();
        it->second.pop_front();
        c.moveTo(CopyState::OnHold);
        c.holdFor = next;
        c.holdUntil = today + chrono::days{PICKUP_DAYS};
        for (const auto& l : listeners) l(next, c, *c.holdUntil);
    }

    // Run once a day (or lazily on access): pass expired holds to the next person.
    void expireHolds(const vector<Copy*>& copies, Date today) {
        for (Copy* c : copies)
            if (c->state == CopyState::OnHold && c->holdUntil && today > *c->holdUntil) copyFreed(*c, today);
    }
};

// ---------- The desk that ties it all together ----------
class LendingDesk {
    vector<LendingRule> rules{Rules::ACTIVE, Rules::LIMIT, Rules::FINES, Rules::COPY_FREE};
    unique_ptr<FinePolicy> finePolicy;
    ReservationDesk& reservations;                // the composition root owns it
    map<string, Date> dueDates;                   // barcode -> due date
    mutex lock;

public:
    LendingDesk(unique_ptr<FinePolicy> finePolicy, ReservationDesk& reservations)
        : finePolicy(move(finePolicy)), reservations(reservations) {}

    string checkout(Patron& p, Copy& c, Date today) {
        lock_guard<mutex> g(lock);
        for (const auto& rule : rules)
            if (auto reason = rule(p, c, today)) return "REFUSED: " + *reason;
        c.moveTo(CopyState::Loaned);
        c.holdFor.clear();
        c.holdUntil.reset();
        p.loans++;
        Date due = today + chrono::days{p.faculty ? 30 : 14};
        dueDates.insert_or_assign(c.barcode, due);
        return "OK, due " + str(due);
    }

    long long giveBack(Patron& p, Copy& c, Date today) {
        lock_guard<mutex> g(lock);
        Date due = dueDates.at(c.barcode);
        dueDates.erase(c.barcode);
        long long late = max(0LL, (long long)(today - due).count());
        long long fine = finePolicy->fine(late, c, p);
        p.finePaise += fine;
        p.loans--;
        reservations.copyFreed(c, today);         // AVAILABLE, or ON_HOLD for the first waiter
        return fine;
    }

    bool renew(const Patron& p, const Copy& c, Date today) {
        lock_guard<mutex> g(lock);
        auto it = dueDates.find(c.barcode);
        if (it == dueDates.end() || today > it->second || reservations.hasWaiters(c.isbn)) return false;
        it->second += chrono::days{p.faculty ? 30 : 14};
        return true;
    }
};

int main() {
    cout << boolalpha;
    ReservationDesk res;
    res.subscribe([](const string& who, const Copy& copy, Date by) {
        cout << "SMS to " << who << ": " << copy.barcode << " is held for you until " << str(by) << "\\n";
    });
    LendingDesk desk(make_unique<FacultyHalfPrice>(make_unique<TieredCappedFine>()), res);

    Copy ddia("BC-9", "978-1449373320", 300'00);
    Patron priya("priya", false), ravi("ravi", false), meena("meena", true);
    Date d0 = dateOf(2026, 10, 1);

    cout << desk.checkout(priya, ddia, d0) << "\\n";                                   // OK, due 2026-10-15
    res.reserve(ddia.isbn, "ravi");
    res.reserve(ddia.isbn, "meena");
    cout << "renew? " << desk.renew(priya, ddia, d0 + chrono::days{10}) << "\\n";      // false: people are waiting
    long long fine = desk.giveBack(priya, ddia, d0 + chrono::days{23});               // 9 days late -> 7*200 + 2*500 = 2400
    cout << "fine paise = " << fine << ", state = " << name(ddia.state) << "\\n";       // ON_HOLD for ravi
    cout << desk.checkout(meena, ddia, d0 + chrono::days{24}) << "\\n";                // REFUSED: held for ravi
    res.expireHolds({&ddia}, d0 + chrono::days{27});                                   // ravi never came -> meena
    cout << desk.checkout(meena, ddia, d0 + chrono::days{28}) << "\\n";                // OK, due 2026-11-28 (faculty: 30 days)

    // failure paths
    Copy lost("BC-7", "978-0", 100'00);
    lost.moveTo(CopyState::Lost);
    cout << desk.checkout(ravi, lost, d0) << "\\n";                                    // REFUSED: copy is LOST
    try {
        lost.moveTo(CopyState::Loaned);
    } catch (const runtime_error& e) {
        cout << e.what() << "\\n";                                                      // BC-7: LOST -> LOANED is not allowed
    }
    Patron lapsed("zed", false);
    lapsed.active = false;
    Copy spare1("BC-8", "978-1", 100'00), spare2("BC-8", "978-1", 100'00);
    cout << desk.checkout(lapsed, spare1, d0) << "\\n";                                // REFUSED: membership inactive
    ravi.finePaise = 100'01;
    cout << desk.checkout(ravi, spare2, d0) << "\\n";                                  // REFUSED: clear fines above Rs 100 first
    bool first = res.reserve(ddia.isbn, "ravi");
    bool second = res.reserve(ddia.isbn, "ravi");
    cout << first << " " << second << "\\n";                                           // true false
}` }
    ] }],
    codeTitle: 'Rules, fine strategies, reservation queue + Observer, copy state machine (a complete program)',
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
      { title: 'Illegal transition caught by the state machine', html: `<p>A buggy admin script tries to check out a LOST copy. <code>copy.moveTo(LOANED)</code> looks up <code>NEXT.get(LOST) = {AVAILABLE}</code> → throws <code>IllegalStateException("BC-4: LOST -> LOANED is not allowed")</code>. The bug is caught at the exact line, instead of a phantom loan appearing in reports months later.</p>`, code: `enum S { AVAILABLE, LOANED, LOST }

class TransitionCheck {
    static final Map<S, Set<S>> NEXT = new EnumMap<>(Map.of(
        S.AVAILABLE, EnumSet.of(S.LOANED, S.LOST),
        S.LOANED, EnumSet.of(S.AVAILABLE, S.LOST),
        S.LOST, EnumSet.of(S.AVAILABLE)));

    static S move(S from, S to) {
        if (!NEXT.get(from).contains(to)) throw new IllegalStateException(from + " -> " + to + " is not allowed");
        return to;
    }
    public static void main(String[] args) {
        System.out.println(move(S.AVAILABLE, S.LOANED));                          // LOANED
        for (S[] step : new S[][]{{S.LOST, S.LOANED}, {S.AVAILABLE, S.AVAILABLE}, {S.LOANED, S.LOST}}) {
            try { System.out.println(move(step[0], step[1])); }
            catch (IllegalStateException e) { System.out.println(e.getMessage()); }   // LOST -> LOANED / AVAILABLE -> AVAILABLE are refused
        }
    }
}`, alt: [
          { lang: 'python', code: `from enum import Enum


class S(Enum):
    AVAILABLE = "AVAILABLE"
    LOANED = "LOANED"
    LOST = "LOST"


NEXT: dict[S, set[S]] = {
    S.AVAILABLE: {S.LOANED, S.LOST},
    S.LOANED: {S.AVAILABLE, S.LOST},
    S.LOST: {S.AVAILABLE},
}


def move(src: S, to: S) -> S:
    if to not in NEXT[src]:
        raise RuntimeError(f"{src.value} -> {to.value} is not allowed")
    return to


if __name__ == "__main__":
    print(move(S.AVAILABLE, S.LOANED).value)
    for src, dst in [(S.LOST, S.LOANED), (S.AVAILABLE, S.AVAILABLE), (S.LOANED, S.LOST)]:
        try:
            print(move(src, dst).value)
        except RuntimeError as e:
            print(e)` },
          { lang: 'ts', code: `type S = "AVAILABLE" | "LOANED" | "LOST";

const NEXT: Record<S, readonly S[]> = {
  AVAILABLE: ["LOANED", "LOST"],
  LOANED: ["AVAILABLE", "LOST"],
  LOST: ["AVAILABLE"],
};

function move(from: S, to: S): S {
  if (!NEXT[from].includes(to)) throw new Error(\`\${from} -> \${to} is not allowed\`);
  return to;
}

console.log(move("AVAILABLE", "LOANED"));
const steps: [S, S][] = [["LOST", "LOANED"], ["AVAILABLE", "AVAILABLE"], ["LOANED", "LOST"]];
for (const [from, to] of steps) {
  try {
    console.log(move(from, to));
  } catch (e) {
    console.log((e as Error).message);
  }
}` },
          { lang: 'cpp', code: `enum class S { Available, Loaned, Lost };

string name(S s) {
    switch (s) {
        case S::Available: return "AVAILABLE";
        case S::Loaned: return "LOANED";
        case S::Lost: return "LOST";
    }
    return "?";
}

const map<S, set<S>> NEXT = {
    {S::Available, {S::Loaned, S::Lost}},
    {S::Loaned, {S::Available, S::Lost}},
    {S::Lost, {S::Available}},
};

S move(S from, S to) {
    if (NEXT.at(from).count(to) == 0) throw runtime_error(name(from) + " -> " + name(to) + " is not allowed");
    return to;
}

int main() {
    cout << name(move(S::Available, S::Loaned)) << "\\n";
    for (auto [from, to] : vector<pair<S, S>>{{S::Lost, S::Loaned}, {S::Available, S::Available}, {S::Loaned, S::Lost}}) {
        try {
            cout << name(move(from, to)) << "\\n";
        } catch (const runtime_error& e) {
            cout << e.what() << "\\n";
        }
    }
}` }
        ] },
      { title: 'Observer: adding WhatsApp without touching the desk', html: `<p>The ReservationDesk only knows <code>List&lt;HoldListener&gt;</code>. SMS and email listeners exist today. Product wants WhatsApp → write <code>WhatsAppHoldListener implements HoldListener</code> and <code>subscribe()</code> it at startup. The desk, the rules and the fine logic are untouched. In production, the listener usually just publishes an event to a queue so a slow SMS provider never blocks the desk.</p>` }
    ],
    deepDive: `<p><b>Holds are per copy, reservations are per title.</b> A reservation says "I want <i>any</i> copy of ISBN X". When a specific copy frees up, it becomes ON_HOLD for the head of the queue. If two copies come back at once, the first two waiters each get one. Reserving a specific copy is almost never what users want.</p>
<p><b>Lazy vs scheduled expiry</b> (same idea as seat holds in BookMyShow): checking <code>today &gt; holdUntil</code> whenever the copy is touched keeps correctness; a nightly job moves expired holds forward and sends the next notification. Both should call the same <code>copyFreed()</code> so there is exactly one code path for "who gets it next".</p>
<p><b>Fairness edge cases:</b> a member with fines above the threshold reaches the head of the queue — skip them (and notify) or hold anyway and refuse at checkout? A member cancels a reservation while a copy is on hold for them → immediately pass it on. A member already at their loan limit → still allowed to reserve, but must return something before pickup. Decide and state the rules explicitly.</p>
<p><b>State pattern vs transition table.</b> A table is enough when states differ only in which moves are legal. When behaviour differs per state (e.g. <code>onReturn()</code> does different things in LOANED vs UNDER_REPAIR), give each state its own class implementing a <code>CopyStateBehaviour</code> interface. Both are valid; the table is shorter for interviews.</p>
<p><b>Money and history.</b> Fines are <b>ledger entries</b> (charged, waived, paid), not a single mutable number; <code>finePaise</code> on Patron is a cached balance of that ledger. Waivers need an audit trail (who waived, why).</p>
<p><b>Concurrency.</b> Return and checkout of the same copy can race at two desks; the desk methods take one lock here. With a database, the copy row's status update is the atomic step (<code>UPDATE ... WHERE status = 'ON_HOLD' AND hold_for = ?</code>).</p>`,
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
      tests: { io: true, cases: [{ stdin: '', stdout: 'true true false\ntrue false\nfalse\nC1 held for ravi until 8\nC1 held for meena until 12\nC3 held for zoya until 15\nopen shelf [C2, C3]\n' }] },
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
        System.out.println(s.reserve("ravi") + " " + s.reserve("meena") + " " + s.reserve("ravi"));   // true true false
        s.copyReturned("C1", 5);                 // held for ravi until day 8
        s.tick(8);                               // the window is inclusive: ravi still owns it
        s.tick(9);                               // ravi missed it -> meena
        System.out.println(s.pickUp("meena", "C1", 10) + " " + s.pickUp("ravi", "C1", 10));   // true false
        s.copyReturned("C2", 11);                // nobody waiting -> open shelf
        s.reserve("zoya");
        s.copyReturned("C3", 12);                // held for zoya until day 15
        s.tick(16);                              // zoya never came and the queue is empty -> open shelf
        System.out.println(s.pickUp("zoya", "C3", 16));   // false
        s.notifications.forEach(System.out::println);
        System.out.println("open shelf " + s.openShelf);
    }
}`,
        alt: [
          { lang: 'python', code: `from collections import deque


class HoldShelf:
    WINDOW = 3

    def __init__(self) -> None:
        self._queue: deque[str] = deque()
        self._queued: set[str] = set()
        self._hold_for: dict[str, str] = {}      # copy id -> patron
        self._hold_until: dict[str, int] = {}
        self.open_shelf: set[str] = set()
        self.notifications: list[str] = []

    def reserve(self, patron: str) -> bool:
        if patron in self._queued:
            return False
        self._queued.add(patron)
        self._queue.append(patron)
        return True

    def _assign(self, copy_id: str, day: int) -> None:
        if not self._queue:
            self.open_shelf.add(copy_id)
            return
        nxt = self._queue.popleft()
        self._queued.discard(nxt)
        self._hold_for[copy_id] = nxt
        self._hold_until[copy_id] = day + self.WINDOW
        self.notifications.append(f"{copy_id} held for {nxt} until {day + self.WINDOW}")

    def copy_returned(self, copy_id: str, day: int) -> None:
        self._assign(copy_id, day)

    def tick(self, day: int) -> None:
        expired = [c for c in sorted(self._hold_for) if day > self._hold_until[c]]
        for c in expired:
            del self._hold_for[c], self._hold_until[c]
            self._assign(c, day)

    def pick_up(self, patron: str, copy_id: str, day: int) -> bool:
        if self._hold_for.get(copy_id) != patron or day > self._hold_until[copy_id]:
            return False
        del self._hold_for[copy_id], self._hold_until[copy_id]
        return True


def lower(flag: bool) -> str:
    return "true" if flag else "false"


if __name__ == "__main__":
    s = HoldShelf()
    print(lower(s.reserve("ravi")), lower(s.reserve("meena")), lower(s.reserve("ravi")))
    s.copy_returned("C1", 5)
    s.tick(8)
    s.tick(9)
    print(lower(s.pick_up("meena", "C1", 10)), lower(s.pick_up("ravi", "C1", 10)))
    s.copy_returned("C2", 11)
    s.reserve("zoya")
    s.copy_returned("C3", 12)
    s.tick(16)
    print(lower(s.pick_up("zoya", "C3", 16)))
    for line in s.notifications:
        print(line)
    print("open shelf [" + ", ".join(sorted(s.open_shelf)) + "]")` },
          { lang: 'ts', code: `class HoldShelf {
  static readonly WINDOW = 3;
  private readonly queue: string[] = [];
  private readonly queued = new Set<string>();
  private readonly holdFor = new Map<string, string>(); // copy id -> patron
  private readonly holdUntil = new Map<string, number>();
  readonly openShelf = new Set<string>();
  readonly notifications: string[] = [];

  reserve(patron: string): boolean {
    if (this.queued.has(patron)) return false;
    this.queued.add(patron);
    this.queue.push(patron);
    return true;
  }

  private assign(copyId: string, day: number): void {
    const next = this.queue.shift(); // short waitlists: O(n) shift is fine here
    if (next === undefined) { this.openShelf.add(copyId); return; }
    this.queued.delete(next);
    this.holdFor.set(copyId, next);
    this.holdUntil.set(copyId, day + HoldShelf.WINDOW);
    this.notifications.push(\`\${copyId} held for \${next} until \${day + HoldShelf.WINDOW}\`);
  }

  copyReturned(copyId: string, day: number): void { this.assign(copyId, day); }

  tick(day: number): void {
    const expired = [...this.holdFor.keys()].sort().filter((c) => day > (this.holdUntil.get(c) ?? 0));
    for (const c of expired) {
      this.holdFor.delete(c);
      this.holdUntil.delete(c);
      this.assign(c, day);
    }
  }

  pickUp(patron: string, copyId: string, day: number): boolean {
    const until = this.holdUntil.get(copyId);
    if (this.holdFor.get(copyId) !== patron || until === undefined || day > until) return false;
    this.holdFor.delete(copyId);
    this.holdUntil.delete(copyId);
    return true;
  }
}

const s = new HoldShelf();
console.log(\`\${s.reserve("ravi")} \${s.reserve("meena")} \${s.reserve("ravi")}\`);
s.copyReturned("C1", 5);
s.tick(8);
s.tick(9);
console.log(\`\${s.pickUp("meena", "C1", 10)} \${s.pickUp("ravi", "C1", 10)}\`);
s.copyReturned("C2", 11);
s.reserve("zoya");
s.copyReturned("C3", 12);
s.tick(16);
console.log(s.pickUp("zoya", "C3", 16));
for (const line of s.notifications) console.log(line);
console.log(\`open shelf [\${[...s.openShelf].sort().join(", ")}]\`);` },
          { lang: 'cpp', code: `class HoldShelf {
    static constexpr int WINDOW = 3;
    deque<string> queue;
    set<string> queued;
    map<string, string> holdFor;             // copy id -> patron, ordered by copy id
    map<string, int> holdUntil;

    void assign(const string& copyId, int day) {
        if (queue.empty()) { openShelf.insert(copyId); return; }
        string next = queue.front();
        queue.pop_front();
        queued.erase(next);
        holdFor[copyId] = next;
        holdUntil[copyId] = day + WINDOW;
        notifications.push_back(copyId + " held for " + next + " until " + to_string(day + WINDOW));
    }

public:
    set<string> openShelf;
    vector<string> notifications;

    bool reserve(const string& patron) {
        if (!queued.insert(patron).second) return false;
        queue.push_back(patron);
        return true;
    }

    void copyReturned(const string& copyId, int day) { assign(copyId, day); }

    void tick(int day) {
        vector<string> expired;
        for (const auto& [copy, until] : holdUntil)
            if (day > until) expired.push_back(copy);
        for (const auto& c : expired) {
            holdFor.erase(c);
            holdUntil.erase(c);
            assign(c, day);
        }
    }

    bool pickUp(const string& patron, const string& copyId, int day) {
        auto it = holdFor.find(copyId);
        if (it == holdFor.end() || it->second != patron || day > holdUntil[copyId]) return false;
        holdFor.erase(it);
        holdUntil.erase(copyId);
        return true;
    }
};

int main() {
    cout << boolalpha;
    HoldShelf s;
    bool a = s.reserve("ravi"), b = s.reserve("meena"), c = s.reserve("ravi");
    cout << a << " " << b << " " << c << "\\n";
    s.copyReturned("C1", 5);
    s.tick(8);
    s.tick(9);
    bool x = s.pickUp("meena", "C1", 10), y = s.pickUp("ravi", "C1", 10);
    cout << x << " " << y << "\\n";
    s.copyReturned("C2", 11);
    s.reserve("zoya");
    s.copyReturned("C3", 12);
    s.tick(16);
    cout << s.pickUp("zoya", "C3", 16) << "\\n";
    for (const auto& line : s.notifications) cout << line << "\\n";
    cout << "open shelf [";
    bool first = true;
    for (const auto& c3 : s.openShelf) { cout << (first ? "" : ", ") << c3; first = false; }
    cout << "]\\n";
}` }
        ],
        complexity: `<p>reserve / pickUp O(1); copyReturned O(1); tick O(H) for H active holds (or O(log H) per expiry with a min-heap by deadline).</p>`,
        followUps: ['Use a priority queue (min-heap) by deadline so tick only touches expired holds.', 'Skip waiters who are blocked by fines and notify them.', 'Support cancel(patron) in O(1) (lazy deletion with the Set).']
      }
    }]
  });

  /* ======================= PRACTICE: EASY ======================= */
  practice.push({
    title: 'Library Late Fee: Tiered Rate with a Cap',
    level: 'Easy', tags: ['library', 'dates', 'money'], companies: ['Zoho', 'TCS', 'Infosys'],
    statement: `<p>Write <code>feePaise(due, returned, bookPricePaise)</code> (<code>due</code> and <code>returned</code> are calendar dates, the price is in paise). No fee if returned on or before the due date. Otherwise the first 7 late days cost ₹2/day, every later day costs ₹5/day, and the total never exceeds the book's price.</p>`,
    constraints: `Dates within 1900–2100; price ≤ ₹10<sup>5</sup>; return paise as long`,
    example: `<p>due 15 Oct, returned 24 Oct → 9 days late → 7×200 + 2×500 = ${H.c('g', '2400 paise')}.<br>due 28 Oct, returned 2 Nov → ${H.c('g', '5 days')} (crosses a month!) → 1000 paise.<br>due 1 Jan, returned 1 Apr, price ₹300 → raw ₹439 → ${H.c('y', 'capped at 30000')}.</p>`,
    brute: { why: `<p>Naive code subtracts day-of-month numbers (2 Nov − 28 Oct = −26 → "no fee") and forgets the cap, so a book lost for a year costs more than buying it. Both are classic date/money bugs.</p>`, code: `class NaiveFee {
    static long fee(LocalDate due, LocalDate returned) {
        int late = returned.getDayOfMonth() - due.getDayOfMonth();     // WRONG across months
        if (late <= 0) return 0;
        return late <= 7 ? late * 200L : 7 * 200L + (late - 7) * 500L;  // and no cap
    }
}` },
    mcq: { q: 'Which expression gives the number of days between two calendar dates correctly across months and years?', options: ['The difference of the two epoch-day counts (Java: b.toEpochDay() - a.toEpochDay())', 'b.getDayOfMonth() - a.getDayOfMonth()', 'Period.between(a, b).getDays()', 'b.getDayOfYear() - a.getDayOfYear()'], answer: 0, explain: 'Epoch days are a continuous count. Period.getDays() is only the "days" part of a y/m/d period, and day-of-year breaks across years.' },
    hints: [`<p>Hint 1: compute late days as a difference of epoch days and clamp at 0 with Math.max — one line handles every month and leap year.</p>`, `<p>Hint 2: split into two tiers: <code>min(d, 7)</code> days at 200 paise and <code>max(0, d − 7)</code> days at 500 paise.</p>`, `<p>Hint 3: finally <code>Math.min(fee, bookPrice)</code>. Keep everything in long paise; returned-early gives 0, not a negative fee.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: '2400\n1000\n30000\n0\n0\n1400\n1900\n1500\n' }] },
    solution: {
      approach: `<p>Epoch-day difference → two tiers → cap. Pure function, trivial to unit-test; in the full design it is one <code>FinePolicy</code> implementation.</p>`,
      code: `class LateFee {
    static long feePaise(LocalDate due, LocalDate returned, long bookPricePaise) {
        long d = Math.max(0, returned.toEpochDay() - due.toEpochDay());
        long fee = Math.min(d, 7) * 200 + Math.max(0, d - 7) * 500;
        return Math.min(fee, bookPricePaise);
    }
    public static void main(String[] args) {
        System.out.println(feePaise(LocalDate.of(2026, 10, 15), LocalDate.of(2026, 10, 24), 30000));  // 2400
        System.out.println(feePaise(LocalDate.of(2026, 10, 28), LocalDate.of(2026, 11, 2), 30000));   // 1000: crosses a month
        System.out.println(feePaise(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 4, 1), 30000));      // 30000: capped at the price
        System.out.println(feePaise(LocalDate.of(2026, 1, 10), LocalDate.of(2026, 1, 5), 30000));     // 0: early
        System.out.println(feePaise(LocalDate.of(2026, 10, 15), LocalDate.of(2026, 10, 15), 30000));  // 0: on the due date
        System.out.println(feePaise(LocalDate.of(2026, 10, 15), LocalDate.of(2026, 10, 22), 30000));  // 1400: day 7 is still Rs 2
        System.out.println(feePaise(LocalDate.of(2026, 10, 15), LocalDate.of(2026, 10, 23), 30000));  // 1900: day 8 costs Rs 5
        System.out.println(feePaise(LocalDate.of(2026, 10, 15), LocalDate.of(2026, 10, 24), 1500));   // 1500: cheap book
    }
}`,
      alt: [
        { lang: 'python', code: `from datetime import date


class LateFee:
    """Rs 2 per day for the first 7 late days, Rs 5 per day after that, never above the book's price."""

    @staticmethod
    def fee_paise(due: date, returned: date, book_price_paise: int) -> int:
        days = max(0, (returned - due).days)
        fee = min(days, 7) * 200 + max(0, days - 7) * 500
        return min(fee, book_price_paise)


if __name__ == "__main__":
    cases = [
        (date(2026, 10, 15), date(2026, 10, 24), 30000),
        (date(2026, 10, 28), date(2026, 11, 2), 30000),
        (date(2026, 1, 1), date(2026, 4, 1), 30000),
        (date(2026, 1, 10), date(2026, 1, 5), 30000),
        (date(2026, 10, 15), date(2026, 10, 15), 30000),
        (date(2026, 10, 15), date(2026, 10, 22), 30000),
        (date(2026, 10, 15), date(2026, 10, 23), 30000),
        (date(2026, 10, 15), date(2026, 10, 24), 1500),
    ]
    for due, returned, price in cases:
        print(LateFee.fee_paise(due, returned, price))` },
        { lang: 'ts', code: `class LocalDate {
  private constructor(readonly epochDay: number) {}
  static of(y: number, m: number, d: number): LocalDate { return new LocalDate(Date.UTC(y, m - 1, d) / 86_400_000); }
}

class LateFee {
  /** Rs 2 per day for the first 7 late days, Rs 5 per day after that, never above the book's price. */
  static feePaise(due: LocalDate, returned: LocalDate, bookPricePaise: number): number {
    const days = Math.max(0, returned.epochDay - due.epochDay);
    const fee = Math.min(days, 7) * 200 + Math.max(0, days - 7) * 500;
    return Math.min(fee, bookPricePaise);
  }
}

const cases: [LocalDate, LocalDate, number][] = [
  [LocalDate.of(2026, 10, 15), LocalDate.of(2026, 10, 24), 30000],
  [LocalDate.of(2026, 10, 28), LocalDate.of(2026, 11, 2), 30000],
  [LocalDate.of(2026, 1, 1), LocalDate.of(2026, 4, 1), 30000],
  [LocalDate.of(2026, 1, 10), LocalDate.of(2026, 1, 5), 30000],
  [LocalDate.of(2026, 10, 15), LocalDate.of(2026, 10, 15), 30000],
  [LocalDate.of(2026, 10, 15), LocalDate.of(2026, 10, 22), 30000],
  [LocalDate.of(2026, 10, 15), LocalDate.of(2026, 10, 23), 30000],
  [LocalDate.of(2026, 10, 15), LocalDate.of(2026, 10, 24), 1500],
];
for (const [due, returned, price] of cases) console.log(LateFee.feePaise(due, returned, price));` },
        { lang: 'cpp', code: `using Date = chrono::sys_days;

Date dateOf(int y, unsigned m, unsigned d) { return Date(chrono::year{y} / chrono::month{m} / chrono::day{d}); }

class LateFee {
public:
    // Rs 2 per day for the first 7 late days, Rs 5 per day after that, never above the book's price.
    static long long feePaise(Date due, Date returned, long long bookPricePaise) {
        long long days = max(0LL, (long long)(returned - due).count());
        long long fee = min(days, 7LL) * 200 + max(0LL, days - 7) * 500;
        return min(fee, bookPricePaise);
    }
};

int main() {
    struct Case { Date due, returned; long long price; };
    vector<Case> cases = {
        {dateOf(2026, 10, 15), dateOf(2026, 10, 24), 30000},
        {dateOf(2026, 10, 28), dateOf(2026, 11, 2), 30000},
        {dateOf(2026, 1, 1), dateOf(2026, 4, 1), 30000},
        {dateOf(2026, 1, 10), dateOf(2026, 1, 5), 30000},
        {dateOf(2026, 10, 15), dateOf(2026, 10, 15), 30000},
        {dateOf(2026, 10, 15), dateOf(2026, 10, 22), 30000},
        {dateOf(2026, 10, 15), dateOf(2026, 10, 23), 30000},
        {dateOf(2026, 10, 15), dateOf(2026, 10, 24), 1500},
    };
    for (const auto& c : cases) cout << LateFee::feePaise(c.due, c.returned, c.price) << "\\n";
}` }
      ],
      complexity: `<p>O(1) time and space.</p>`,
      followUps: ['Skip library holidays when counting late days.', 'Make the tiers configurable (list of (fromDay, rate)).', 'Faculty pay half — add a decorator.']
    }
  });

  practice.push({
    title: 'Splitwise: Net Balance of Every Friend',
    level: 'Easy', tags: ['splitwise', 'hashmap', 'money'], companies: ['Splitwise', 'PhonePe', 'Swiggy'],
    statement: `<p>Each expense is (payer, amountPaise, participants). It is split <b>equally</b> among participants; leftover paise go one each to the first participants in the list. Return each person's net balance: positive = should get money back, negative = owes. The balances must sum to exactly 0.</p>`,
    constraints: `≤ 10<sup>5</sup> expenses, ≤ 10<sup>3</sup> people, amounts ≤ 10<sup>9</sup> paise`,
    example: `<p>Asha pays 90000 for [Asha, Ben, Chen]; Ben pays 30000 for [Ben, Chen]; Chen pays 10000 for [Asha, Ben, Chen].<br>Shares: 30000 each; 15000 each; 3334, 3333, 3333.<br>Net: Asha ${H.c('g', '+56666')}, Ben ${H.c('r', '-18333')}, Chen ${H.c('r', '-38333')} → sum 0 ✔.</p>`,
    brute: { why: `<p>Naive: for each person, scan every expense and recompute their share with <code>double</code> (amount / n). That is O(people × expenses) and the shares of ₹100 / 3 add up to ₹99.99, so balances drift away from zero over time.</p>`, code: `class NaiveNet {
    record Exp(String payer, long amount, List<String> among) {}
    static Map<String, Double> net(Set<String> people, List<Exp> exps) {
        Map<String, Double> out = new HashMap<>();
        for (String p : people) {                       // O(P * E)
            double v = 0;
            for (Exp e : exps) {
                if (e.payer().equals(p)) v += e.amount();
                if (e.among().contains(p)) v -= (double) e.amount() / e.among().size();   // rounding drift
            }
            out.put(p, v);
        }
        return out;
    }
}` },
    mcq: { q: 'Asha pays ₹600 for Ben and Chen only (not herself). What is Asha\'s net from this expense?', options: ['+600', '+400', '+200', '0'], answer: 0, explain: 'Her share is 0 because she is not a participant: paid 600 − share 0 = +600.' },
    hints: [`<p>Hint 1: net = total paid − total share. You can add to the payer and subtract from each participant in a single pass over the expenses.</p>`, `<p>Hint 2: share = amount / n, and the first <code>amount % n</code> participants pay 1 extra paisa, so shares add up to the amount exactly.</p>`, `<p>Hint 3: use <code>Map&lt;String, Long&gt;</code> with <code>merge(key, delta, Long::sum)</code>. Assert at the end that the values sum to 0 — a free bug detector.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: '{asha=56666, ben=-18333, chen=-38333}\n0\n{asha=66, ben=-33, chen=-33}\n{}\nnobody to split among\n' }] },
    solution: {
      approach: `<p>One pass, exact integer shares, merge into a map. Every expense touches 1 + n entries.</p>`,
      code: `class NetBalances {
    record Exp(String payer, long amount, List<String> among) {}

    static Map<String, Long> net(List<Exp> exps) {
        Map<String, Long> net = new TreeMap<>();
        for (Exp e : exps) {
            int n = e.among().size();
            if (n == 0) throw new IllegalArgumentException("nobody to split among");
            long base = e.amount() / n, extra = e.amount() % n;
            net.merge(e.payer(), e.amount(), Long::sum);
            for (int i = 0; i < n; i++) net.merge(e.among().get(i), -(base + (i < extra ? 1 : 0)), Long::sum);
        }
        return net;
    }
}

class NetBalancesDemo {
    public static void main(String[] args) {
        List<NetBalances.Exp> exps = List.of(
            new NetBalances.Exp("asha", 90000, List.of("asha", "ben", "chen")),
            new NetBalances.Exp("ben", 30000, List.of("ben", "chen")),
            new NetBalances.Exp("chen", 10000, List.of("asha", "ben", "chen")));
        Map<String, Long> net = NetBalances.net(exps);
        System.out.println(net);                                                   // {asha=56666, ben=-18333, chen=-38333}
        System.out.println(net.values().stream().mapToLong(Long::longValue).sum()); // 0
        System.out.println(NetBalances.net(List.of(new NetBalances.Exp("asha", 100, List.of("asha", "ben", "chen")))));   // {asha=66, ben=-33, chen=-33}
        System.out.println(NetBalances.net(List.of()));                                         // {}
        try { NetBalances.net(List.of(new NetBalances.Exp("asha", 100, List.of()))); }
        catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }
    }
}`,
      alt: [
        { lang: 'python', code: `from dataclasses import dataclass


@dataclass(frozen=True)
class Exp:
    payer: str
    amount: int
    among: tuple[str, ...]


def net(exps: list[Exp]) -> dict[str, int]:
    """Net paise per person: positive = gets back, negative = owes. Sorted by name."""
    totals: dict[str, int] = {}
    for e in exps:
        n = len(e.among)
        if n == 0:
            raise ValueError("nobody to split among")
        base, extra = divmod(e.amount, n)
        totals[e.payer] = totals.get(e.payer, 0) + e.amount
        for i, person in enumerate(e.among):
            totals[person] = totals.get(person, 0) - (base + (1 if i < extra else 0))
    return dict(sorted(totals.items()))


def fmt(m: dict[str, int]) -> str:
    return "{" + ", ".join(f"{k}={v}" for k, v in m.items()) + "}"


if __name__ == "__main__":
    exps = [
        Exp("asha", 90000, ("asha", "ben", "chen")),
        Exp("ben", 30000, ("ben", "chen")),
        Exp("chen", 10000, ("asha", "ben", "chen")),
    ]
    balances = net(exps)
    print(fmt(balances))
    print(sum(balances.values()))
    print(fmt(net([Exp("asha", 100, ("asha", "ben", "chen"))])))
    print(fmt(net([])))
    try:
        net([Exp("asha", 100, ())])
    except ValueError as e:
        print(e)` },
        { lang: 'ts', code: `interface Exp { readonly payer: string; readonly amount: number; readonly among: readonly string[] }

/** Net paise per person: positive = gets back, negative = owes. Sorted by name. */
function net(exps: readonly Exp[]): Map<string, number> {
  const totals = new Map<string, number>();
  const add = (who: string, delta: number): void => { totals.set(who, (totals.get(who) ?? 0) + delta); };
  for (const e of exps) {
    const n = e.among.length;
    if (n === 0) throw new Error("nobody to split among");
    const base = Math.floor(e.amount / n), extra = e.amount % n;
    add(e.payer, e.amount);
    e.among.forEach((person, i) => add(person, -(base + (i < extra ? 1 : 0))));
  }
  return new Map([...totals].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

const fmt = (m: Map<string, number>): string => \`{\${[...m].map(([k, v]) => \`\${k}=\${v}\`).join(", ")}}\`;

const balances = net([
  { payer: "asha", amount: 90000, among: ["asha", "ben", "chen"] },
  { payer: "ben", amount: 30000, among: ["ben", "chen"] },
  { payer: "chen", amount: 10000, among: ["asha", "ben", "chen"] },
]);
console.log(fmt(balances));
console.log([...balances.values()].reduce((a, b) => a + b, 0));
console.log(fmt(net([{ payer: "asha", amount: 100, among: ["asha", "ben", "chen"] }])));
console.log(fmt(net([])));
try {
  net([{ payer: "asha", amount: 100, among: [] }]);
} catch (e) {
  console.log((e as Error).message);
}` },
        { lang: 'cpp', code: `struct Exp {
    string payer;
    long long amount;
    vector<string> among;
};

// Net paise per person: positive = gets back, negative = owes. std::map keeps names sorted.
map<string, long long> net(const vector<Exp>& exps) {
    map<string, long long> totals;
    for (const auto& e : exps) {
        long long n = e.among.size();
        if (n == 0) throw invalid_argument("nobody to split among");
        long long base = e.amount / n, extra = e.amount % n;
        totals[e.payer] += e.amount;
        for (long long i = 0; i < n; i++) totals[e.among[i]] -= base + (i < extra ? 1 : 0);
    }
    return totals;
}

string fmt(const map<string, long long>& m) {
    string s = "{";
    for (const auto& [k, v] : m) s += (s.size() > 1 ? ", " : "") + k + "=" + to_string(v);
    return s + "}";
}

int main() {
    auto balances = net({{"asha", 90000, {"asha", "ben", "chen"}},
                         {"ben", 30000, {"ben", "chen"}},
                         {"chen", 10000, {"asha", "ben", "chen"}}});
    cout << fmt(balances) << "\\n";
    long long sum = 0;
    for (const auto& [who, v] : balances) sum += v;
    cout << sum << "\\n";
    cout << fmt(net({{"asha", 100, {"asha", "ben", "chen"}}})) << "\\n";
    cout << fmt(net({})) << "\\n";
    try {
        net({{"asha", 100, {}}});
    } catch (const invalid_argument& e) {
        cout << e.what() << "\\n";
    }
}` }
      ],
      complexity: `<p>O(Σ participants) time, O(people) space.</p>`,
      followUps: ['Support EXACT and PERCENT splits via a SplitStrategy.', 'Return the pairwise "who owes whom" too.', 'Feed the result into the debt simplifier.']
    }
  });

  practice.push({
    title: 'BookMyShow: Ticket Price with Pluggable Pricing Rules',
    level: 'Easy', tags: ['bookmyshow', 'strategy', 'decorator'], companies: ['BookMyShow', 'Paytm Insider', 'Flipkart'],
    statement: `<p>Price one ticket: base price by seat type (REGULAR ₹200, PREMIUM ₹350, RECLINER ₹600), +20% on Saturday/Sunday, then a flat ₹30 convenience fee. Product will keep adding rules (festival surge, student discount, cap). Design it so a new rule is a new class, then compute the price for a Saturday PREMIUM seat.</p>`,
    constraints: `≤ 10 rules; money in paise`,
    example: `<p>PREMIUM on Saturday: 35000 → ×1.2 = 42000 → +3000 fee = ${H.c('g', '45000 paise (₹450)')}. REGULAR on Tuesday: 20000 + 3000 = ${H.c('g', '23000')}.</p>`,
    brute: { why: `<p>Naive: one method with nested if-else for seat type, weekend, festivals, coupons… Every new rule edits the same method, the order of rules is implicit, and nothing can be tested in isolation.</p>`, code: `class IfElsePricing {
    static long price(String type, DayOfWeek day, boolean festival, boolean student) {
        long p;
        if (type.equals("REGULAR")) p = 20000; else if (type.equals("PREMIUM")) p = 35000; else p = 60000;
        if (day == DayOfWeek.SATURDAY || day == DayOfWeek.SUNDAY) p = p * 120 / 100;
        if (festival) p = p * 125 / 100;                 // added in March
        if (student) p = p - 5000;                      // added in June... and the list keeps growing
        return p + 3000;
    }
}` },
    mcq: { q: 'Which pattern lets you stack "weekend surge" on top of "base price" and then "convenience fee" on top of that, in any combination?', options: ['Decorator', 'Singleton', 'Factory Method', 'Iterator'], answer: 0, explain: 'Each decorator wraps another Pricing and adjusts its result, so rules compose like layers.' },
    hints: [`<p>Hint 1: define <code>interface Pricing { long price(String seatType, DayOfWeek day); }</code> — the base table is one implementation.</p>`, `<p>Hint 2: each extra rule is a class that <b>wraps</b> another Pricing (Decorator): call the inner price, then adjust it.</p>`, `<p>Hint 3: compose at startup: <code>new ConvenienceFee(new WeekendSurge(new BasePrice(), 20), 3000)</code>. The order of wrapping is the order rules apply — make it explicit.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: '45000\n23000\n75000\n27600\nunknown seat type BALCONY\n' }] },
    solution: {
      approach: `<p>Strategy for the base price, Decorators for each adjustment. Adding a festival surge = one new decorator, wired in configuration.</p>`,
      code: `class TicketPricing {
    interface Pricing { long price(String seatType, DayOfWeek day); }

    static final class BasePrice implements Pricing {
        private final Map<String, Long> table = Map.of("REGULAR", 20000L, "PREMIUM", 35000L, "RECLINER", 60000L);
        public long price(String seatType, DayOfWeek day) {
            Long p = table.get(seatType);
            if (p == null) throw new IllegalArgumentException("unknown seat type " + seatType);
            return p;
        }
    }
    static final class WeekendSurge implements Pricing {
        private final Pricing inner; private final int percent;
        WeekendSurge(Pricing inner, int percent) { this.inner = inner; this.percent = percent; }
        public long price(String t, DayOfWeek d) {
            long p = inner.price(t, d);
            boolean weekend = d == DayOfWeek.SATURDAY || d == DayOfWeek.SUNDAY;
            return weekend ? p * (100 + percent) / 100 : p;
        }
    }
    static final class ConvenienceFee implements Pricing {
        private final Pricing inner; private final long fee;
        ConvenienceFee(Pricing inner, long fee) { this.inner = inner; this.fee = fee; }
        public long price(String t, DayOfWeek d) { return inner.price(t, d) + fee; }
    }
}

class TicketPricingDemo {
    public static void main(String[] args) {
        TicketPricing.Pricing pricing = new TicketPricing.ConvenienceFee(new TicketPricing.WeekendSurge(new TicketPricing.BasePrice(), 20), 3000);
        System.out.println(pricing.price("PREMIUM", DayOfWeek.SATURDAY));   // 45000
        System.out.println(pricing.price("REGULAR", DayOfWeek.TUESDAY));    // 23000
        System.out.println(pricing.price("RECLINER", DayOfWeek.SUNDAY));    // 75000
        // wrapping in the other order changes the answer: the surge now applies to the fee too
        TicketPricing.Pricing surgeOnFee = new TicketPricing.WeekendSurge(new TicketPricing.ConvenienceFee(new TicketPricing.BasePrice(), 3000), 20);
        System.out.println(surgeOnFee.price("REGULAR", DayOfWeek.SATURDAY)); // 27600
        try { pricing.price("BALCONY", DayOfWeek.MONDAY); }
        catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }
    }
}`,
      alt: [
        { lang: 'python', code: `from enum import Enum
from typing import Protocol


class DayOfWeek(Enum):
    MONDAY = 1
    TUESDAY = 2
    WEDNESDAY = 3
    THURSDAY = 4
    FRIDAY = 5
    SATURDAY = 6
    SUNDAY = 7


class Pricing(Protocol):
    def price(self, seat_type: str, day: DayOfWeek) -> int: ...


class BasePrice:
    _TABLE = {"REGULAR": 20000, "PREMIUM": 35000, "RECLINER": 60000}

    def price(self, seat_type: str, day: DayOfWeek) -> int:
        if seat_type not in self._TABLE:
            raise ValueError(f"unknown seat type {seat_type}")
        return self._TABLE[seat_type]


class WeekendSurge:
    def __init__(self, inner: Pricing, percent: int) -> None:
        self._inner, self._percent = inner, percent

    def price(self, seat_type: str, day: DayOfWeek) -> int:
        p = self._inner.price(seat_type, day)
        weekend = day in (DayOfWeek.SATURDAY, DayOfWeek.SUNDAY)
        return p * (100 + self._percent) // 100 if weekend else p


class ConvenienceFee:
    def __init__(self, inner: Pricing, fee: int) -> None:
        self._inner, self._fee = inner, fee

    def price(self, seat_type: str, day: DayOfWeek) -> int:
        return self._inner.price(seat_type, day) + self._fee


if __name__ == "__main__":
    pricing = ConvenienceFee(WeekendSurge(BasePrice(), 20), 3000)
    print(pricing.price("PREMIUM", DayOfWeek.SATURDAY))
    print(pricing.price("REGULAR", DayOfWeek.TUESDAY))
    print(pricing.price("RECLINER", DayOfWeek.SUNDAY))
    surge_on_fee = WeekendSurge(ConvenienceFee(BasePrice(), 3000), 20)
    print(surge_on_fee.price("REGULAR", DayOfWeek.SATURDAY))
    try:
        pricing.price("BALCONY", DayOfWeek.MONDAY)
    except ValueError as e:
        print(e)` },
        { lang: 'ts', code: `type DayOfWeek = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";

interface Pricing {
  price(seatType: string, day: DayOfWeek): number;
}

class BasePrice implements Pricing {
  private readonly table = new Map<string, number>([["REGULAR", 20000], ["PREMIUM", 35000], ["RECLINER", 60000]]);
  price(seatType: string, _day: DayOfWeek): number {
    const p = this.table.get(seatType);
    if (p === undefined) throw new Error(\`unknown seat type \${seatType}\`);
    return p;
  }
}

class WeekendSurge implements Pricing {
  constructor(private readonly inner: Pricing, private readonly percent: number) {}
  price(seatType: string, day: DayOfWeek): number {
    const p = this.inner.price(seatType, day);
    const weekend = day === "SATURDAY" || day === "SUNDAY";
    return weekend ? Math.floor((p * (100 + this.percent)) / 100) : p;
  }
}

class ConvenienceFee implements Pricing {
  constructor(private readonly inner: Pricing, private readonly fee: number) {}
  price(seatType: string, day: DayOfWeek): number { return this.inner.price(seatType, day) + this.fee; }
}

const pricing = new ConvenienceFee(new WeekendSurge(new BasePrice(), 20), 3000);
console.log(pricing.price("PREMIUM", "SATURDAY"));
console.log(pricing.price("REGULAR", "TUESDAY"));
console.log(pricing.price("RECLINER", "SUNDAY"));
const surgeOnFee = new WeekendSurge(new ConvenienceFee(new BasePrice(), 3000), 20);
console.log(surgeOnFee.price("REGULAR", "SATURDAY"));
try {
  pricing.price("BALCONY", "MONDAY");
} catch (e) {
  console.log((e as Error).message);
}` },
        { lang: 'cpp', code: `enum class DayOfWeek { Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday };

class Pricing {
public:
    virtual ~Pricing() = default;
    virtual long long price(const string& seatType, DayOfWeek day) const = 0;
};

class BasePrice : public Pricing {
    map<string, long long> table{{"REGULAR", 20000}, {"PREMIUM", 35000}, {"RECLINER", 60000}};
public:
    long long price(const string& seatType, DayOfWeek) const override {
        auto it = table.find(seatType);
        if (it == table.end()) throw invalid_argument("unknown seat type " + seatType);
        return it->second;
    }
};

// Decorators own the pricing they wrap.
class WeekendSurge : public Pricing {
    unique_ptr<Pricing> inner;
    int percent;
public:
    WeekendSurge(unique_ptr<Pricing> inner, int percent) : inner(move(inner)), percent(percent) {}
    long long price(const string& seatType, DayOfWeek day) const override {
        long long p = inner->price(seatType, day);
        bool weekend = day == DayOfWeek::Saturday || day == DayOfWeek::Sunday;
        return weekend ? p * (100 + percent) / 100 : p;
    }
};

class ConvenienceFee : public Pricing {
    unique_ptr<Pricing> inner;
    long long fee;
public:
    ConvenienceFee(unique_ptr<Pricing> inner, long long fee) : inner(move(inner)), fee(fee) {}
    long long price(const string& seatType, DayOfWeek day) const override { return inner->price(seatType, day) + fee; }
};

int main() {
    unique_ptr<Pricing> pricing = make_unique<ConvenienceFee>(
        make_unique<WeekendSurge>(make_unique<BasePrice>(), 20), 3000);
    cout << pricing->price("PREMIUM", DayOfWeek::Saturday) << "\\n";
    cout << pricing->price("REGULAR", DayOfWeek::Tuesday) << "\\n";
    cout << pricing->price("RECLINER", DayOfWeek::Sunday) << "\\n";
    WeekendSurge surgeOnFee(make_unique<ConvenienceFee>(make_unique<BasePrice>(), 3000), 20);
    cout << surgeOnFee.price("REGULAR", DayOfWeek::Saturday) << "\\n";
    try {
        pricing->price("BALCONY", DayOfWeek::Monday);
    } catch (const invalid_argument& e) {
        cout << e.what() << "\\n";
    }
}` }
      ],
      complexity: `<p>O(R) per price for R stacked rules; O(1) memory per rule.</p>`,
      followUps: ['Add a student discount that never goes below ₹100.', 'Show the user a price breakdown (each decorator adds a line item).', 'Load the decorator chain from configuration per city.']
    }
  });

  practice.push({
    title: 'Library Catalog Search by Title or Author Words',
    level: 'Easy', tags: ['library', 'inverted index', 'hashmap'], companies: ['Amazon', 'Zoho', 'Goodreads'],
    statement: `<p>Build a <code>Catalog</code> with <code>add(isbn, title, author)</code> and <code>search(query)</code> returning ISBNs (sorted) of books where <b>every</b> word of the query matches a whole word in the title or author, case-insensitive.</p>`,
    constraints: `≤ 10<sup>5</sup> books, ≤ 20 words per title, ≤ 10<sup>4</sup> queries`,
    example: `<p>Books: (1) "Clean Code" — Robert Martin; (2) "Designing Data Intensive Applications" — Martin Kleppmann; (3) "The Art of Computer Programming" — Donald Knuth.<br>search("martin") → ${H.c('g', '[1, 2]')}; search("clean martin") → ${H.c('g', '[1]')}; search("art") → ${H.c('g', '[3]')} (not "Martin"!).</p>`,
    brute: { why: `<p>Naive: for every query scan all books and check <code>title.contains(word)</code>. O(books × title length) per query, and substring matching gives wrong hits: "art" matches "M<b>art</b>in".</p>`, code: `class ScanSearch {
    record B(String isbn, String title, String author) {}
    static List<String> search(List<B> books, String q) {
        List<String> out = new ArrayList<>();
        for (B b : books) {
            String text = (b.title() + " " + b.author()).toLowerCase();
            boolean all = true;
            for (String w : q.toLowerCase().split(" ")) if (!text.contains(w)) all = false;   // substring bug
            if (all) out.add(b.isbn());
        }
        return out;
    }
}` },
    mcq: { q: 'Query "clean martin" should return books containing BOTH words. With an inverted index word → set of ISBNs, how do you combine the two sets?', options: ['Intersection', 'Union', 'Difference', 'Concatenate and sort'], answer: 0, explain: 'AND semantics = set intersection. OR semantics would be union.' },
    hints: [`<p>Hint 1: precompute at insert time: split title and author into lower-case words, and map each word to the set of ISBNs containing it.</p>`, `<p>Hint 2: for a query, look up each word's set and intersect them, starting from a copy of the first set (never mutate the index's own sets).</p>`, `<p>Hint 3: start with the smallest set to make intersection fastest; empty query → empty result; unknown word → empty result immediately.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: '[1, 2] [1] [3]\n[2]\n[1]\n[]\n[]\n' }] },
    solution: {
      approach: `<p>Inverted index (the core idea behind Lucene/Elasticsearch): O(words) indexing, and each query costs about the size of the smallest posting list.</p>`,
      code: `class CatalogIndex {
    private final Map<String, Set<String>> index = new HashMap<>();

    void add(String isbn, String title, String author) {
        for (String w : (title + " " + author).toLowerCase().split(" "))
            if (!w.isBlank()) index.computeIfAbsent(w, k -> new TreeSet<>()).add(isbn);
    }

    List<String> search(String query) {
        List<Set<String>> lists = new ArrayList<>();
        for (String w : query.toLowerCase().split(" ")) {
            if (w.isBlank()) continue;
            Set<String> hits = index.get(w);
            if (hits == null) return List.of();                 // a word nobody has -> no results
            lists.add(hits);
        }
        if (lists.isEmpty()) return List.of();
        lists.sort(Comparator.comparingInt(Set::size));         // smallest first
        Set<String> result = new TreeSet<>(lists.get(0));
        for (int i = 1; i < lists.size(); i++) result.retainAll(lists.get(i));
        return new ArrayList<>(result);
    }

    public static void main(String[] args) {
        CatalogIndex c = new CatalogIndex();
        c.add("1", "Clean Code", "Robert Martin");
        c.add("2", "Designing Data Intensive Applications", "Martin Kleppmann");
        c.add("3", "The Art of Computer Programming", "Donald Knuth");
        System.out.println(c.search("martin") + " " + c.search("clean martin") + " " + c.search("art"));   // [1, 2] [1] [3]
        System.out.println(c.search("MARTIN kleppmann"));    // [2]: case-insensitive, AND semantics
        System.out.println(c.search("code  clean"));         // [1]: extra spaces are ignored
        System.out.println(c.search("martin zzz"));          // []: one word nobody has
        System.out.println(c.search("   "));                 // []: blank query
    }
}`,
      alt: [
        { lang: 'python', code: `class CatalogIndex:
    """Inverted index: word -> ISBNs, over title and author words."""

    def __init__(self) -> None:
        self._index: dict[str, set[str]] = {}

    def add(self, isbn: str, title: str, author: str) -> None:
        for word in f"{title} {author}".lower().split():
            self._index.setdefault(word, set()).add(isbn)

    def search(self, query: str) -> list[str]:
        words = query.lower().split()
        if not words:
            return []
        postings: list[set[str]] = []
        for word in words:
            hits = self._index.get(word)
            if hits is None:
                return []                          # a word nobody has -> no results
            postings.append(hits)
        postings.sort(key=len)                     # intersect from the smallest set
        return sorted(set.intersection(*postings))


def fmt(isbns: list[str]) -> str:
    return "[" + ", ".join(isbns) + "]"


if __name__ == "__main__":
    c = CatalogIndex()
    c.add("1", "Clean Code", "Robert Martin")
    c.add("2", "Designing Data Intensive Applications", "Martin Kleppmann")
    c.add("3", "The Art of Computer Programming", "Donald Knuth")
    print(fmt(c.search("martin")), fmt(c.search("clean martin")), fmt(c.search("art")))
    print(fmt(c.search("MARTIN kleppmann")))
    print(fmt(c.search("code  clean")))
    print(fmt(c.search("martin zzz")))
    print(fmt(c.search("   ")))` },
        { lang: 'ts', code: `class CatalogIndex {
  /** Inverted index: word -> ISBNs, over title and author words. */
  private readonly index = new Map<string, Set<string>>();

  private static words(text: string): string[] {
    return text.toLowerCase().split(" ").filter((w) => w.trim() !== "");
  }

  add(isbn: string, title: string, author: string): void {
    for (const w of CatalogIndex.words(\`\${title} \${author}\`)) {
      let ids = this.index.get(w);
      if (ids === undefined) { ids = new Set(); this.index.set(w, ids); }
      ids.add(isbn);
    }
  }

  search(query: string): string[] {
    const lists: Set<string>[] = [];
    for (const w of CatalogIndex.words(query)) {
      const hits = this.index.get(w);
      if (hits === undefined) return []; // a word nobody has -> no results
      lists.push(hits);
    }
    if (lists.length === 0) return [];
    lists.sort((a, b) => a.size - b.size); // intersect from the smallest set
    const [first, ...rest] = lists;
    return [...first].filter((id) => rest.every((s) => s.has(id))).sort();
  }
}

const fmt = (ids: string[]): string => \`[\${ids.join(", ")}]\`;

const c = new CatalogIndex();
c.add("1", "Clean Code", "Robert Martin");
c.add("2", "Designing Data Intensive Applications", "Martin Kleppmann");
c.add("3", "The Art of Computer Programming", "Donald Knuth");
console.log(\`\${fmt(c.search("martin"))} \${fmt(c.search("clean martin"))} \${fmt(c.search("art"))}\`);
console.log(fmt(c.search("MARTIN kleppmann")));
console.log(fmt(c.search("code  clean")));
console.log(fmt(c.search("martin zzz")));
console.log(fmt(c.search("   ")));` },
        { lang: 'cpp', code: `class CatalogIndex {
    unordered_map<string, set<string>> index;   // word -> ISBNs (sorted)

    static vector<string> words(const string& text) {
        string lower = text;
        for (char& ch : lower) ch = tolower(static_cast<unsigned char>(ch));
        istringstream in(lower);
        vector<string> out;
        for (string w; in >> w;) out.push_back(w);
        return out;
    }

public:
    void add(const string& isbn, const string& title, const string& author) {
        for (const auto& w : words(title + " " + author)) index[w].insert(isbn);
    }

    vector<string> search(const string& query) const {
        vector<const set<string>*> lists;
        for (const auto& w : words(query)) {
            auto it = index.find(w);
            if (it == index.end()) return {};      // a word nobody has -> no results
            lists.push_back(&it->second);
        }
        if (lists.empty()) return {};
        sort(lists.begin(), lists.end(), [](auto* a, auto* b) { return a->size() < b->size(); });
        vector<string> result;
        for (const auto& id : *lists[0])           // intersect from the smallest set
            if (all_of(lists.begin() + 1, lists.end(), [&](auto* s) { return s->count(id) > 0; })) result.push_back(id);
        return result;
    }
};

string fmt(const vector<string>& ids) {
    string s = "[";
    for (size_t i = 0; i < ids.size(); i++) s += (i ? ", " : "") + ids[i];
    return s + "]";
}

int main() {
    CatalogIndex c;
    c.add("1", "Clean Code", "Robert Martin");
    c.add("2", "Designing Data Intensive Applications", "Martin Kleppmann");
    c.add("3", "The Art of Computer Programming", "Donald Knuth");
    cout << fmt(c.search("martin")) << " " << fmt(c.search("clean martin")) << " " << fmt(c.search("art")) << "\\n";
    cout << fmt(c.search("MARTIN kleppmann")) << "\\n";
    cout << fmt(c.search("code  clean")) << "\\n";
    cout << fmt(c.search("martin zzz")) << "\\n";
    cout << fmt(c.search("   ")) << "\\n";
}` }
      ],
      complexity: `<p>Indexing O(total words). Query O(k + m log m) where m is the smallest posting list size.</p>`,
      followUps: ['Prefix search ("mar" → Martin) with a sorted-map range query (<code>TreeMap.subMap</code>, <code>bisect</code>, <code>lower_bound</code>) or a trie.', 'Rank results (title match beats author match).', 'Ignore stop words like "the", "of".']
    }
  });

  /* ======================= PRACTICE: MEDIUM ======================= */
  practice.push({
    title: 'Splitwise: Pairwise Ledger with Automatic Netting',
    level: 'Medium', tags: ['splitwise', 'hashmap', 'design'], companies: ['Splitwise', 'Google Pay', 'CRED'],
    statement: `<p>Implement <code>record(debtor, creditor, paise)</code>, <code>owes(a, b)</code> (positive if a owes b, negative if b owes a, 0 if settled) and <code>debtsOf(user)</code> (all non-zero pairwise balances involving the user). Debts in opposite directions must cancel automatically. Store each pair <b>once</b>.</p>`,
    constraints: `≤ 10<sup>6</sup> records, ≤ 10<sup>5</sup> users; owes() must be O(1)`,
    example: `<p>record(Ben, Asha, 300) → owes(Ben, Asha) = 300. record(Asha, Ben, 100) → owes(Ben, Asha) = ${H.c('g', '200')}, owes(Asha, Ben) = ${H.c('g', '-200')}. record(Asha, Ben, 200) → ${H.c('g', '0')} and the pair disappears from debtsOf.</p>`,
    brute: { why: `<p>Naive: keep a list of every IOU and, on each query, scan the whole list summing both directions — O(records) per query, and the list grows forever. Another naive variant stores both <code>owes[a][b]</code> and <code>owes[b][a]</code> independently and forgets to update one, so they disagree.</p>`, code: `class ScanLedger {
    record IOU(String from, String to, long amt) {}
    private final List<IOU> all = new ArrayList<>();
    void record(String d, String c, long amt) { all.add(new IOU(d, c, amt)); }
    long owes(String a, String b) {                     // O(records) on EVERY query
        long s = 0;
        for (IOU i : all) {
            if (i.from().equals(a) && i.to().equals(b)) s += i.amt();
            if (i.from().equals(b) && i.to().equals(a)) s -= i.amt();
        }
        return s;
    }
}` },
    mcq: { q: 'You store each pair once under the key (min(a,b), max(a,b)) with value v meaning "min owes max v". How do you answer owes(max, min)?', options: ['Return -v', 'Return v', 'Return |v|', 'Look up a second key'], answer: 0, explain: 'Canonical ordering + sign: the reverse direction is just the negation.' },
    hints: [`<p>Hint 1: pick a canonical order for a pair (alphabetical). Store one signed number: positive means the smaller name owes the larger one.</p>`, `<p>Hint 2: record(d, c, x): if d &lt; c add +x to key (d, c), else add −x to key (c, d). owes(a, b) reads the key and flips the sign if a &gt; b.</p>`, `<p>Hint 3: remove the key when it becomes 0 so debtsOf stays small. Keep a per-user adjacency set (user → counterparties) to list a user's debts without scanning all pairs.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: '200 -200 [ben owes asha 200]\n[ben owes asha 200, asha owes chen 50]\n0 [asha owes chen 50]\n[]\ncannot owe yourself\namount must be positive\n' }] },
    solution: {
      approach: `<p>Canonical pair key with a signed amount gives automatic netting and O(1) queries; an adjacency map makes per-user listing proportional to that user's counterparties.</p>`,
      code: `class PairLedger {
    private final Map<String, Long> bal = new HashMap<>();                 // "a|b" with a < b
    private final Map<String, Set<String>> peers = new HashMap<>();

    private static String key(String a, String b) { return a + "|" + b; }

    void record(String debtor, String creditor, long amt) {
        if (debtor.equals(creditor)) throw new IllegalArgumentException("cannot owe yourself");
        if (amt <= 0) throw new IllegalArgumentException("amount must be positive");
        boolean ordered = debtor.compareTo(creditor) < 0;
        String lo = ordered ? debtor : creditor, hi = ordered ? creditor : debtor;
        long v = bal.merge(key(lo, hi), ordered ? amt : -amt, Long::sum);
        if (v == 0) {
            bal.remove(key(lo, hi));
            peers.getOrDefault(lo, new HashSet<>()).remove(hi);
            peers.getOrDefault(hi, new HashSet<>()).remove(lo);
        } else {
            peers.computeIfAbsent(lo, k -> new TreeSet<>()).add(hi);
            peers.computeIfAbsent(hi, k -> new TreeSet<>()).add(lo);
        }
    }

    long owes(String a, String b) {
        if (a.compareTo(b) < 0) return bal.getOrDefault(key(a, b), 0L);
        return -bal.getOrDefault(key(b, a), 0L);
    }

    List<String> debtsOf(String user) {
        List<String> out = new ArrayList<>();
        for (String p : peers.getOrDefault(user, Set.of())) {
            long v = owes(user, p);
            out.add(v > 0 ? user + " owes " + p + " " + v : p + " owes " + user + " " + (-v));
        }
        return out;
    }

    public static void main(String[] args) {
        PairLedger l = new PairLedger();
        l.record("ben", "asha", 300);
        l.record("asha", "ben", 100);
        System.out.println(l.owes("ben", "asha") + " " + l.owes("asha", "ben") + " " + l.debtsOf("asha"));   // 200 -200 [ben owes asha 200]
        l.record("asha", "chen", 50);
        System.out.println(l.debtsOf("asha"));         // [ben owes asha 200, asha owes chen 50]
        l.record("asha", "ben", 200);
        System.out.println(l.owes("ben", "asha") + " " + l.debtsOf("asha"));   // 0 [asha owes chen 50]: the settled pair vanished
        System.out.println(l.debtsOf("zed"));          // []
        try { l.record("asha", "asha", 10); } catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }
        try { l.record("asha", "ben", 0); } catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }
    }
}`,
      alt: [
        { lang: 'python', code: `class PairLedger:
    """Keeps one signed number per pair, so the two directions can never disagree."""

    def __init__(self) -> None:
        self._bal: dict[tuple[str, str], int] = {}     # (a, b) with a < b: what a owes b
        self._peers: dict[str, set[str]] = {}

    def record(self, debtor: str, creditor: str, amt: int) -> None:
        if debtor == creditor:
            raise ValueError("cannot owe yourself")
        if amt <= 0:
            raise ValueError("amount must be positive")
        ordered = debtor < creditor
        lo, hi = (debtor, creditor) if ordered else (creditor, debtor)
        v = self._bal.get((lo, hi), 0) + (amt if ordered else -amt)
        if v == 0:
            self._bal.pop((lo, hi), None)
            self._peers.get(lo, set()).discard(hi)
            self._peers.get(hi, set()).discard(lo)
        else:
            self._bal[(lo, hi)] = v
            self._peers.setdefault(lo, set()).add(hi)
            self._peers.setdefault(hi, set()).add(lo)

    def owes(self, a: str, b: str) -> int:
        if a < b:
            return self._bal.get((a, b), 0)
        return -self._bal.get((b, a), 0)

    def debts_of(self, user: str) -> list[str]:
        out = []
        for p in sorted(self._peers.get(user, ())):
            v = self.owes(user, p)
            out.append(f"{user} owes {p} {v}" if v > 0 else f"{p} owes {user} {-v}")
        return out


def fmt(items: list[str]) -> str:
    return "[" + ", ".join(items) + "]"


if __name__ == "__main__":
    ledger = PairLedger()
    ledger.record("ben", "asha", 300)
    ledger.record("asha", "ben", 100)
    print(ledger.owes("ben", "asha"), ledger.owes("asha", "ben"), fmt(ledger.debts_of("asha")))
    ledger.record("asha", "chen", 50)
    print(fmt(ledger.debts_of("asha")))
    ledger.record("asha", "ben", 200)
    print(ledger.owes("ben", "asha"), fmt(ledger.debts_of("asha")))
    print(fmt(ledger.debts_of("zed")))
    for debtor, creditor, amt in [("asha", "asha", 10), ("asha", "ben", 0)]:
        try:
            ledger.record(debtor, creditor, amt)
        except ValueError as e:
            print(e)` },
        { lang: 'ts', code: `class PairLedger {
  /** One signed number per pair, so the two directions can never disagree. */
  private readonly bal = new Map<string, number>(); // "a|b" with a < b: what a owes b
  private readonly peers = new Map<string, Set<string>>();

  private static key(a: string, b: string): string { return \`\${a}|\${b}\`; }

  record(debtor: string, creditor: string, amt: number): void {
    if (debtor === creditor) throw new Error("cannot owe yourself");
    if (amt <= 0) throw new Error("amount must be positive");
    const ordered = debtor < creditor;
    const [lo, hi] = ordered ? [debtor, creditor] : [creditor, debtor];
    const k = PairLedger.key(lo, hi);
    const v = (this.bal.get(k) ?? 0) + (ordered ? amt : -amt);
    if (v === 0) {
      this.bal.delete(k);
      this.peers.get(lo)?.delete(hi);
      this.peers.get(hi)?.delete(lo);
    } else {
      this.bal.set(k, v);
      this.link(lo, hi);
      this.link(hi, lo);
    }
  }

  private link(a: string, b: string): void {
    let set = this.peers.get(a);
    if (set === undefined) { set = new Set(); this.peers.set(a, set); }
    set.add(b);
  }

  owes(a: string, b: string): number {
    if (a < b) return this.bal.get(PairLedger.key(a, b)) ?? 0;
    const v = this.bal.get(PairLedger.key(b, a)) ?? 0;
    return v === 0 ? 0 : -v; // avoid -0
  }

  debtsOf(user: string): string[] {
    return [...(this.peers.get(user) ?? [])].sort().map((p) => {
      const v = this.owes(user, p);
      return v > 0 ? \`\${user} owes \${p} \${v}\` : \`\${p} owes \${user} \${-v}\`;
    });
  }
}

const fmt = (items: string[]): string => \`[\${items.join(", ")}]\`;

const ledger = new PairLedger();
ledger.record("ben", "asha", 300);
ledger.record("asha", "ben", 100);
console.log(\`\${ledger.owes("ben", "asha")} \${ledger.owes("asha", "ben")} \${fmt(ledger.debtsOf("asha"))}\`);
ledger.record("asha", "chen", 50);
console.log(fmt(ledger.debtsOf("asha")));
ledger.record("asha", "ben", 200);
console.log(\`\${ledger.owes("ben", "asha")} \${fmt(ledger.debtsOf("asha"))}\`);
console.log(fmt(ledger.debtsOf("zed")));
for (const [debtor, creditor, amt] of [["asha", "asha", 10], ["asha", "ben", 0]] as const) {
  try {
    ledger.record(debtor, creditor, amt);
  } catch (e) {
    console.log((e as Error).message);
  }
}` },
        { lang: 'cpp', code: `class PairLedger {
    // One signed number per pair, so the two directions can never disagree.
    map<pair<string, string>, long long> bal;      // (a, b) with a < b: what a owes b
    map<string, set<string>> peers;

public:
    void record(const string& debtor, const string& creditor, long long amt) {
        if (debtor == creditor) throw invalid_argument("cannot owe yourself");
        if (amt <= 0) throw invalid_argument("amount must be positive");
        bool ordered = debtor < creditor;
        const string& lo = ordered ? debtor : creditor;
        const string& hi = ordered ? creditor : debtor;
        long long v = (bal[{lo, hi}] += ordered ? amt : -amt);
        if (v == 0) {
            bal.erase({lo, hi});
            peers[lo].erase(hi);
            peers[hi].erase(lo);
        } else {
            peers[lo].insert(hi);
            peers[hi].insert(lo);
        }
    }

    long long owes(const string& a, const string& b) const {
        if (a < b) {
            auto it = bal.find({a, b});
            return it == bal.end() ? 0 : it->second;
        }
        auto it = bal.find({b, a});
        return it == bal.end() ? 0 : -it->second;
    }

    vector<string> debtsOf(const string& user) const {
        vector<string> out;
        auto it = peers.find(user);
        if (it == peers.end()) return out;
        for (const auto& p : it->second) {
            long long v = owes(user, p);
            out.push_back(v > 0 ? user + " owes " + p + " " + to_string(v) : p + " owes " + user + " " + to_string(-v));
        }
        return out;
    }
};

string fmt(const vector<string>& items) {
    string s = "[";
    for (size_t i = 0; i < items.size(); i++) s += (i ? ", " : "") + items[i];
    return s + "]";
}

int main() {
    PairLedger ledger;
    ledger.record("ben", "asha", 300);
    ledger.record("asha", "ben", 100);
    cout << ledger.owes("ben", "asha") << " " << ledger.owes("asha", "ben") << " " << fmt(ledger.debtsOf("asha")) << "\\n";
    ledger.record("asha", "chen", 50);
    cout << fmt(ledger.debtsOf("asha")) << "\\n";
    ledger.record("asha", "ben", 200);
    cout << ledger.owes("ben", "asha") << " " << fmt(ledger.debtsOf("asha")) << "\\n";
    cout << fmt(ledger.debtsOf("zed")) << "\\n";
    for (auto [debtor, creditor, amt] : vector<tuple<string, string, long long>>{{"asha", "asha", 10}, {"asha", "ben", 0}}) {
        try {
            ledger.record(debtor, creditor, amt);
        } catch (const invalid_argument& e) {
            cout << e.what() << "\\n";
        }
    }
}` }
      ],
      complexity: `<p>record / owes O(1) expected (plus O(log d) for the sorted peer set); debtsOf O(d) for d counterparties. Space O(non-zero pairs).</p>`,
      followUps: ['Make it thread-safe per pair (an atomic per-key merge, such as ConcurrentHashMap.merge, or one lock per pair).', 'Add per-group ledgers.', 'Persist as rows (user_lo, user_hi, amount).']
    }
  });

  practice.push({
    title: 'BookMyShow Admin: Schedule Shows Without Overlaps',
    level: 'Medium', tags: ['bookmyshow', 'treemap', 'intervals'], companies: ['BookMyShow', 'PVR INOX', 'Amazon'],
    statement: `<p>For each screen, <code>addShow(screenId, startMinute, durationMinutes)</code> must accept the show only if it does not overlap any existing show on that screen, including a <b>15-minute cleaning buffer</b> after every show. Return true/false. Different screens are independent.</p>`,
    constraints: `≤ 10<sup>5</sup> shows per screen; each call must be O(log n)`,
    example: `<p>Screen 1 has 600–770 (+15 buffer → busy until 785). addShow(1, 780, 120) → ${H.c('r', 'false')} (780 &lt; 785). addShow(1, 785, 120) → ${H.c('g', 'true')}. addShow(1, 500, 90) → busy 500–605, overlaps 600 → ${H.c('r', 'false')}.</p>`,
    brute: { why: `<p>Naive: scan every show on the screen and test overlap — O(n) per insert, and many naive versions forget the cleaning buffer or use <code>&lt;=</code> vs <code>&lt;</code> inconsistently, allowing a show to start before the previous one is cleaned.</p>`, code: `class ScanScheduler {
    private final Map<Integer, List<int[]>> shows = new HashMap<>();     // [start, endWithBuffer)
    boolean addShow(int screen, int start, int dur) {
        int end = start + dur + 15;
        for (int[] s : shows.computeIfAbsent(screen, k -> new ArrayList<>()))   // O(n)
            if (start < s[1] && s[0] < end) return false;
        shows.get(screen).add(new int[]{start, end});
        return true;
    }
}` },
    mcq: { q: 'Shows on a screen never overlap each other. To check a new interval [s, e), which existing shows do you need to look at?', options: ['Only the show starting just before s and the show starting just at/after s', 'All shows', 'Only the last show of the day', 'Only shows of the same movie'], answer: 0, explain: 'Non-overlapping intervals sorted by start: only the immediate predecessor and successor can collide.' },
    hints: [`<p>Hint 1: since a screen's shows never overlap, keep them sorted by start time in an ordered map <code>start → endWithBuffer</code> (<code>TreeMap</code>, <code>std::map</code>, or a sorted list with <code>bisect</code>).</p>`, `<p>Hint 2: the new busy interval is [s, s + dur + 15). Check <code>floorEntry(s)</code> (its end must be ≤ s) and <code>ceilingEntry(s)</code> (its start must be ≥ new end).</p>`, `<p>Hint 3: half-open intervals make "ends exactly when the next starts" legal. One ordered map per screen in a <code>Map&lt;screenId, OrderedMap&gt;</code>; lock per screen if admins edit concurrently.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: 'true\nfalse\ntrue\nfalse\ntrue\ntrue\nfalse\nfalse\ntrue\n' }] },
    solution: {
      approach: `<p>Sorted non-overlapping intervals in an ordered map: only two neighbours can conflict, so each insert is O(log n).</p>`,
      code: `class ShowScheduler {
    static final int BUFFER = 15;
    private final Map<Integer, TreeMap<Integer, Integer>> screens = new HashMap<>();   // start -> end (with buffer)

    boolean addShow(int screen, int start, int duration) {
        TreeMap<Integer, Integer> t = screens.computeIfAbsent(screen, k -> new TreeMap<>());
        int end = start + duration + BUFFER;
        Map.Entry<Integer, Integer> before = t.floorEntry(start);
        if (before != null && before.getValue() > start) return false;    // previous one still running/cleaning
        Map.Entry<Integer, Integer> after = t.ceilingEntry(start);
        if (after != null && after.getKey() < end) return false;          // we would run into the next one
        t.put(start, end);
        return true;
    }

    public static void main(String[] args) {
        ShowScheduler s = new ShowScheduler();
        System.out.println(s.addShow(1, 600, 170));   // true, busy until 785
        System.out.println(s.addShow(1, 780, 120));   // false: still cleaning
        System.out.println(s.addShow(1, 785, 120));   // true: starts exactly when the buffer ends
        System.out.println(s.addShow(1, 500, 90));    // false (busy until 605)
        System.out.println(s.addShow(2, 780, 120));   // true, other screen
        System.out.println(s.addShow(1, 400, 90));    // true: fits in the gap before 600
        System.out.println(s.addShow(1, 505, 95));    // false: its own buffer would run into 600
        System.out.println(s.addShow(1, 600, 10));    // false: same start
        System.out.println(s.addShow(1, 920, 60));    // true: after the last show's buffer
    }
}`,
      alt: [
        { lang: 'python', code: `from bisect import bisect_left, bisect_right, insort


class ShowScheduler:
    BUFFER = 15

    def __init__(self) -> None:
        # per screen: starts sorted, and the end (including the cleaning buffer) of each start
        self._starts: dict[int, list[int]] = {}
        self._ends: dict[int, dict[int, int]] = {}

    def add_show(self, screen: int, start: int, duration: int) -> bool:
        starts = self._starts.setdefault(screen, [])
        ends = self._ends.setdefault(screen, {})
        end = start + duration + self.BUFFER
        i = bisect_right(starts, start)              # starts[i-1] is the floor entry
        if i > 0 and ends[starts[i - 1]] > start:
            return False                             # previous one still running/cleaning
        j = bisect_left(starts, start)               # starts[j] is the ceiling entry
        if j < len(starts) and starts[j] < end:
            return False                             # we would run into the next one
        insort(starts, start)
        ends[start] = end
        return True


if __name__ == "__main__":
    s = ShowScheduler()
    for screen, start, duration in [(1, 600, 170), (1, 780, 120), (1, 785, 120), (1, 500, 90), (2, 780, 120),
                                    (1, 400, 90), (1, 505, 95), (1, 600, 10), (1, 920, 60)]:
        print("true" if s.add_show(screen, start, duration) else "false")` },
        { lang: 'ts', code: `class ShowScheduler {
  static readonly BUFFER = 15;
  // per screen: shows sorted by start; \`end\` already includes the cleaning buffer
  private readonly screens = new Map<number, { start: number; end: number }[]>();

  addShow(screen: number, start: number, duration: number): boolean {
    let shows = this.screens.get(screen);
    if (shows === undefined) { shows = []; this.screens.set(screen, shows); }
    const end = start + duration + ShowScheduler.BUFFER;
    // binary search: first show that starts at or after \`start\`
    let lo = 0, hi = shows.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (shows[mid].start < start) lo = mid + 1; else hi = mid;
    }
    if (lo < shows.length && shows[lo].start === start) return false; // same start
    if (lo > 0 && shows[lo - 1].end > start) return false;            // previous one still running/cleaning
    if (lo < shows.length && shows[lo].start < end) return false;     // we would run into the next one
    shows.splice(lo, 0, { start, end });
    return true;
  }
}

const s = new ShowScheduler();
const requests: [number, number, number][] = [
  [1, 600, 170], [1, 780, 120], [1, 785, 120], [1, 500, 90], [2, 780, 120],
  [1, 400, 90], [1, 505, 95], [1, 600, 10], [1, 920, 60],
];
for (const [screen, start, duration] of requests) console.log(s.addShow(screen, start, duration));` },
        { lang: 'cpp', code: `class ShowScheduler {
    static constexpr int BUFFER = 15;
    unordered_map<int, map<int, int>> screens;   // screen -> (start -> end including the cleaning buffer)

public:
    bool addShow(int screen, int start, int duration) {
        auto& shows = screens[screen];
        int end = start + duration + BUFFER;
        auto after = shows.lower_bound(start);                     // ceiling entry
        if (after != shows.end() && after->first == start) return false;
        if (after != shows.begin() && prev(after)->second > start) return false;   // previous one still running/cleaning
        if (after != shows.end() && after->first < end) return false;              // we would run into the next one
        shows[start] = end;
        return true;
    }
};

int main() {
    cout << boolalpha;
    ShowScheduler s;
    vector<array<int, 3>> requests = {{1, 600, 170}, {1, 780, 120}, {1, 785, 120}, {1, 500, 90}, {2, 780, 120},
                                      {1, 400, 90}, {1, 505, 95}, {1, 600, 10}, {1, 920, 60}};
    for (auto [screen, start, duration] : requests) cout << s.addShow(screen, start, duration) << "\\n";
}` }
      ],
      complexity: `<p>O(log n) per insert, O(n) space per screen.</p>`,
      followUps: ['Support removing / rescheduling a show (and what happens to existing bookings).', 'Find the earliest free slot of length L after time t.', 'Different buffer per screen size.']
    }
  });

  practice.push({
    title: 'BookMyShow: Cancellation Refund Policy by Time Before Show',
    level: 'Medium', tags: ['bookmyshow', 'strategy', 'treemap', 'money'], companies: ['BookMyShow', 'MakeMyTrip', 'redBus'],
    statement: `<p>Compute the refund when a user cancels. Tiers by time before the show: ≥ 24 h → 100% of ticket price; 4 h to 24 h → 50%; under 4 h → 0%. A ₹20 cancellation fee is deducted whenever a refund is given (never below 0). The convenience fee is never refunded. Tiers must be configurable per theatre chain.</p>`,
    constraints: `≤ 10 tiers; money in paise; times as UTC instants`,
    example: `<p>Ticket 40000 + fee 3000. Cancel 30 h before → 40000 − 2000 = ${H.c('g', '38000')}. 10 h before → 20000 − 2000 = ${H.c('g', '18000')}. 2 h before → ${H.c('r', '0')}.</p>`,
    brute: { why: `<p>Naive: hard-coded if-else on hours inside BookingService, with doubles for percentages. Changing tiers for one chain means editing and redeploying shared code, and boundary bugs (is exactly 24 h "≥ 24"?) creep in.</p>`, code: `class HardCodedRefund {
    static double refund(double ticket, double hoursBefore) {
        if (hoursBefore > 24) return ticket - 20;          // exactly 24h falls through!
        else if (hoursBefore > 4) return ticket * 0.5 - 20;
        return 0;
    }
}` },
    mcq: { q: 'Tiers are stored in an ordered map from "minutes before show" to percent: {0:0, 240:50, 1440:100}. A user cancels 600 minutes before. Which call finds the right tier?', options: ['floorEntry(600)', 'ceilingEntry(600)', 'firstEntry()', 'get(600)'], answer: 0, explain: 'floorEntry returns the largest threshold ≤ 600, i.e. 240 → 50%.' },
    hints: [`<p>Hint 1: make it a <code>RefundPolicy</code> interface so chains can plug different rules; the common case is a tiered table.</p>`, `<p>Hint 2: store tiers in an ordered map <code>minutesBefore → percent</code> (<code>TreeMap&lt;Long, Integer&gt;</code> and <code>floorEntry(minutesBefore)</code>; <code>bisect_right</code> on a sorted list; <code>std::map::upper_bound</code>). Compute minutes as the difference of the two instants (<code>Duration.between(now, showStart).toMinutes()</code>).</p>`, `<p>Hint 3: refund = ticket × percent / 100, minus the fee only if percent &gt; 0, clamped at 0. Cancelling after the show started → 0. Use long paise throughout.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: '38000\n38000\n18000\n18000\n0\n0\n0\n0\n' }] },
    solution: {
      approach: `<p>Strategy interface + an ordered-map tiered implementation. Boundaries are explicit ("≥ threshold") and configurable.</p>`,
      code: `class RefundCalc {
    interface RefundPolicy { long refund(long ticketPaise, Instant now, Instant showStart); }

    static final class TieredRefund implements RefundPolicy {
        private final TreeMap<Long, Integer> tiers = new TreeMap<>();   // minutesBefore threshold -> percent
        private final long feePaise;
        TieredRefund(Map<Long, Integer> tiers, long feePaise) { this.tiers.putAll(tiers); this.feePaise = feePaise; }
        public long refund(long ticket, Instant now, Instant showStart) {
            long minutes = Duration.between(now, showStart).toMinutes();
            if (minutes < 0) return 0;                                   // show already started
            Map.Entry<Long, Integer> tier = tiers.floorEntry(minutes);
            int pct = tier == null ? 0 : tier.getValue();
            if (pct == 0) return 0;
            return Math.max(0, ticket * pct / 100 - feePaise);
        }
    }
}

class RefundCalcDemo {
    public static void main(String[] args) {
        RefundCalc.RefundPolicy pvr = new RefundCalc.TieredRefund(Map.of(0L, 0, 240L, 50, 1440L, 100), 2000);
        Instant show = Instant.parse("2026-10-17T12:30:00Z");
        System.out.println(pvr.refund(40000, show.minus(Duration.ofHours(30)), show));   // 38000
        System.out.println(pvr.refund(40000, show.minus(Duration.ofHours(24)), show));   // 38000 (boundary)
        System.out.println(pvr.refund(40000, show.minus(Duration.ofHours(10)), show));   // 18000
        System.out.println(pvr.refund(40000, show.minus(Duration.ofHours(4)), show));    // 18000 (boundary)
        System.out.println(pvr.refund(40000, show.minus(Duration.ofMinutes(239)), show)); // 0: one minute short of 4 hours
        System.out.println(pvr.refund(40000, show.minus(Duration.ofHours(2)), show));    // 0
        System.out.println(pvr.refund(40000, show.plus(Duration.ofMinutes(10)), show));  // 0: show already started
        System.out.println(pvr.refund(1000, show.minus(Duration.ofHours(10)), show));    // 0: the fee eats a small refund
    }
}`,
      alt: [
        { lang: 'python', code: `from bisect import bisect_right
from datetime import datetime, timedelta, timezone
from typing import Protocol


class RefundPolicy(Protocol):
    def refund(self, ticket_paise: int, now: datetime, show_start: datetime) -> int: ...


class TieredRefund:
    """Percent refunded depends on how many minutes remain; a flat fee is kept."""

    def __init__(self, tiers: dict[int, int], fee_paise: int) -> None:
        self._thresholds = sorted(tiers)               # minutes-before thresholds
        self._percent = [tiers[t] for t in self._thresholds]
        self._fee = fee_paise

    def refund(self, ticket_paise: int, now: datetime, show_start: datetime) -> int:
        minutes = int((show_start - now).total_seconds() / 60)   # truncates toward zero
        if minutes < 0:
            return 0                                   # show already started
        i = bisect_right(self._thresholds, minutes) - 1          # floor entry
        pct = self._percent[i] if i >= 0 else 0
        if pct == 0:
            return 0
        return max(0, ticket_paise * pct // 100 - self._fee)


if __name__ == "__main__":
    pvr = TieredRefund({0: 0, 240: 50, 1440: 100}, 2000)
    show = datetime(2026, 10, 17, 12, 30, tzinfo=timezone.utc)
    for ticket, delta in [(40000, timedelta(hours=-30)), (40000, timedelta(hours=-24)), (40000, timedelta(hours=-10)),
                          (40000, timedelta(hours=-4)), (40000, timedelta(minutes=-239)), (40000, timedelta(hours=-2)),
                          (40000, timedelta(minutes=10)), (1000, timedelta(hours=-10))]:
        print(pvr.refund(ticket, show + delta, show))` },
        { lang: 'ts', code: `interface RefundPolicy {
  refund(ticketPaise: number, now: Date, showStart: Date): number;
}

class TieredRefund implements RefundPolicy {
  private readonly tiers: [minutes: number, percent: number][];

  /** tiers: minutes-before threshold -> percent refunded; a flat fee is kept. */
  constructor(tiers: Record<number, number>, private readonly feePaise: number) {
    this.tiers = Object.entries(tiers).map(([m, p]): [number, number] => [Number(m), p]).sort((a, b) => a[0] - b[0]);
  }

  refund(ticket: number, now: Date, showStart: Date): number {
    const minutes = Math.trunc((showStart.getTime() - now.getTime()) / 60_000);
    if (minutes < 0) return 0; // show already started
    let pct = 0; // floor entry: the last threshold <= minutes
    for (const [threshold, percent] of this.tiers) if (threshold <= minutes) pct = percent;
    if (pct === 0) return 0;
    return Math.max(0, Math.floor((ticket * pct) / 100) - this.feePaise);
  }
}

const minus = (d: Date, minutes: number): Date => new Date(d.getTime() - minutes * 60_000);

const pvr = new TieredRefund({ 0: 0, 240: 50, 1440: 100 }, 2000);
const show = new Date("2026-10-17T12:30:00Z");
const probes: [number, number][] = [
  [40000, 30 * 60], [40000, 24 * 60], [40000, 10 * 60], [40000, 4 * 60],
  [40000, 239], [40000, 2 * 60], [40000, -10], [1000, 10 * 60],
];
for (const [ticket, minutesBefore] of probes) console.log(pvr.refund(ticket, minus(show, minutesBefore), show));` },
        { lang: 'cpp', code: `using Instant = chrono::sys_seconds;

Instant at(int y, unsigned mo, unsigned d, int h, int mi) {
    return chrono::sys_days(chrono::year{y} / chrono::month{mo} / chrono::day{d}) + chrono::hours{h} + chrono::minutes{mi};
}

class RefundPolicy {
public:
    virtual ~RefundPolicy() = default;
    virtual long long refund(long long ticketPaise, Instant now, Instant showStart) const = 0;
};

class TieredRefund : public RefundPolicy {
    map<long long, int> tiers;                 // minutes-before threshold -> percent
    long long feePaise;
public:
    TieredRefund(map<long long, int> tiers, long long feePaise) : tiers(move(tiers)), feePaise(feePaise) {}

    long long refund(long long ticket, Instant now, Instant showStart) const override {
        long long minutes = chrono::duration_cast<chrono::minutes>(showStart - now).count();   // truncates toward zero
        if (minutes < 0) return 0;             // show already started
        auto it = tiers.upper_bound(minutes);  // floor entry = the one before upper_bound
        int pct = it == tiers.begin() ? 0 : prev(it)->second;
        if (pct == 0) return 0;
        return max(0LL, ticket * pct / 100 - feePaise);
    }
};

int main() {
    TieredRefund pvr({{0, 0}, {240, 50}, {1440, 100}}, 2000);
    Instant show = at(2026, 10, 17, 12, 30);
    vector<pair<long long, int>> probes = {{40000, 30 * 60}, {40000, 24 * 60}, {40000, 10 * 60}, {40000, 4 * 60},
                                           {40000, 239}, {40000, 2 * 60}, {40000, -10}, {1000, 10 * 60}};
    for (const auto& [ticket, minutesBefore] : probes)
        cout << pvr.refund(ticket, show - chrono::minutes{minutesBefore}, show) << "\\n";
}` }
      ],
      complexity: `<p>O(log T) per refund for T tiers; O(T) memory.</p>`,
      followUps: ['Release the seats back to inventory atomically with the refund.', 'Allow free cancellation within 10 minutes of booking.', 'Store the policy version on each booking so later policy changes do not affect old bookings.']
    }
  });

  practice.push({
    title: 'Library: Renewal Policy with Clear Reasons',
    level: 'Medium', tags: ['library', 'rules', 'dates'], companies: ['Oracle', 'Zoho', 'Wipro'],
    statement: `<p>Implement <code>renew(loan, today, waitersForTitle)</code> returning a result with either the new due date or a reason. Rules: not overdue; fewer than 2 renewals so far; nobody waiting for the title; member not blocked. A successful renewal extends from the <b>current due date</b> (not from today) by the loan period, so renewing early does not lose days but renewing repeatedly cannot exceed 3 periods total.</p>`,
    constraints: `dates as calendar dates; loan period 14 days for students, 30 for faculty`,
    example: `<p>Student loan due 15 Oct, renewals 0, no waiters. renew on 12 Oct → ${H.c('g', 'OK, new due 29 Oct')}. renew again 28 Oct → ${H.c('g', 'OK, due 12 Nov')}. Third time → ${H.c('r', '"renewal limit (2) reached"')}. If renewed on 16 Oct (overdue) → ${H.c('r', '"overdue — return and pay fine"')}.</p>`,
    brute: { why: `<p>Naive: <code>loan.due = today.plusDays(14)</code> with no checks. A member can renew forever, starve everybody on the waitlist, and renewing after the due date silently wipes the fine they owe.</p>`, code: `class NaiveRenew {
    static LocalDate renew(LocalDate today) { return today.plusDays(14); }   // forever, even if overdue or reserved
}` },
    mcq: { q: 'Why extend from the current due date instead of from today?', options: ['So renewing early neither loses nor gains extra days, and the total time is bounded', 'Because a calendar date cannot add days to today', 'To charge more fines', 'It makes no difference'], answer: 0, explain: 'From-due extension gives exactly one more period per renewal; from-today lets members chain renewals into arbitrarily long loans and penalises early renewers.' },
    hints: [`<p>Hint 1: return a small result type (record, dataclass, struct) with <code>ok</code>, <code>newDue</code> and <code>reason</code> — UIs need the reason, not just false.</p>`, `<p>Hint 2: check in order: blocked → overdue (<code>today.isAfter(due)</code>) → renewals ≥ 2 → waiters &gt; 0. Mutate only after all pass.</p>`, `<p>Hint 3: new due = due.plusDays(period). Renewing exactly on the due date is allowed (not after). Increment the renewal counter in the same step.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: 'renewed, due 2026-10-29\nrenewed, due 2026-11-12\nrefused: renewal limit (2) reached\nrefused: overdue - return and pay fine\nrenewed, due 2026-10-29\nrefused: 2 member(s) waiting for this title\nrefused: member is blocked\n' }] },
    solution: {
      approach: `<p>Ordered guard clauses returning reasons, then a single mutation. Each guard could also be a LendingRule-style object if the rule set grows.</p>`,
      code: `class RenewalPolicy {
    static final int MAX_RENEWALS = 2;
    static final class Loan { LocalDate due; int renewals; final int period; final boolean memberBlocked;
        Loan(LocalDate due, int period, boolean blocked) { this.due = due; this.period = period; this.memberBlocked = blocked; } }
    record Result(boolean ok, LocalDate newDue, String reason) {}

    static Result renew(Loan loan, LocalDate today, int waitersForTitle) {
        if (loan.memberBlocked) return new Result(false, null, "member is blocked");
        if (today.isAfter(loan.due)) return new Result(false, null, "overdue - return and pay fine");
        if (loan.renewals >= MAX_RENEWALS) return new Result(false, null, "renewal limit (" + MAX_RENEWALS + ") reached");
        if (waitersForTitle > 0) return new Result(false, null, waitersForTitle + " member(s) waiting for this title");
        loan.due = loan.due.plusDays(loan.period);
        loan.renewals++;
        return new Result(true, loan.due, "renewed");
    }
}

class RenewalPolicyDemo {
    static void show(RenewalPolicy.Result r) {
        System.out.println(r.ok() ? "renewed, due " + r.newDue() : "refused: " + r.reason());
    }

    public static void main(String[] args) {
        RenewalPolicy.Loan l = new RenewalPolicy.Loan(LocalDate.of(2026, 10, 15), 14, false);
        show(RenewalPolicy.renew(l, LocalDate.of(2026, 10, 12), 0));    // renewed, due 2026-10-29
        show(RenewalPolicy.renew(l, LocalDate.of(2026, 10, 28), 0));    // renewed, due 2026-11-12
        show(RenewalPolicy.renew(l, LocalDate.of(2026, 11, 1), 0));     // refused: renewal limit (2) reached
        RenewalPolicy.Loan late = new RenewalPolicy.Loan(LocalDate.of(2026, 10, 15), 14, false);
        show(RenewalPolicy.renew(late, LocalDate.of(2026, 10, 16), 0)); // refused: overdue - return and pay fine
        RenewalPolicy.Loan onDueDay = new RenewalPolicy.Loan(LocalDate.of(2026, 10, 15), 14, false);
        show(RenewalPolicy.renew(onDueDay, LocalDate.of(2026, 10, 15), 0));   // renewed, due 2026-10-29: the due day itself is still on time
        RenewalPolicy.Loan wanted = new RenewalPolicy.Loan(LocalDate.of(2026, 10, 15), 14, false);
        show(RenewalPolicy.renew(wanted, LocalDate.of(2026, 10, 12), 2));     // refused: 2 member(s) waiting for this title
        RenewalPolicy.Loan blocked = new RenewalPolicy.Loan(LocalDate.of(2026, 10, 15), 14, true);
        show(RenewalPolicy.renew(blocked, LocalDate.of(2026, 10, 20), 0));    // refused: member is blocked (checked before overdue)
    }
}`,
      alt: [
        { lang: 'python', code: `from dataclasses import dataclass
from datetime import date, timedelta

MAX_RENEWALS = 2


@dataclass
class Loan:
    due: date
    period: int
    member_blocked: bool
    renewals: int = 0


@dataclass(frozen=True)
class Result:
    ok: bool
    new_due: date | None
    reason: str


class RenewalPolicy:
    @staticmethod
    def renew(loan: Loan, today: date, waiters_for_title: int) -> Result:
        if loan.member_blocked:
            return Result(False, None, "member is blocked")
        if today > loan.due:
            return Result(False, None, "overdue - return and pay fine")
        if loan.renewals >= MAX_RENEWALS:
            return Result(False, None, f"renewal limit ({MAX_RENEWALS}) reached")
        if waiters_for_title > 0:
            return Result(False, None, f"{waiters_for_title} member(s) waiting for this title")
        loan.due += timedelta(days=loan.period)
        loan.renewals += 1
        return Result(True, loan.due, "renewed")


def show(r: Result) -> None:
    print(f"renewed, due {r.new_due}" if r.ok else f"refused: {r.reason}")


if __name__ == "__main__":
    renew = RenewalPolicy.renew
    loan = Loan(date(2026, 10, 15), 14, False)
    show(renew(loan, date(2026, 10, 12), 0))
    show(renew(loan, date(2026, 10, 28), 0))
    show(renew(loan, date(2026, 11, 1), 0))
    show(renew(Loan(date(2026, 10, 15), 14, False), date(2026, 10, 16), 0))
    show(renew(Loan(date(2026, 10, 15), 14, False), date(2026, 10, 15), 0))
    show(renew(Loan(date(2026, 10, 15), 14, False), date(2026, 10, 12), 2))
    show(renew(Loan(date(2026, 10, 15), 14, True), date(2026, 10, 20), 0))` },
        { lang: 'ts', code: `class LocalDate {
  private constructor(private readonly epochDay: number) {}
  static of(y: number, m: number, d: number): LocalDate { return new LocalDate(Date.UTC(y, m - 1, d) / 86_400_000); }
  plusDays(n: number): LocalDate { return new LocalDate(this.epochDay + n); }
  isAfter(o: LocalDate): boolean { return this.epochDay > o.epochDay; }
  toString(): string { return new Date(this.epochDay * 86_400_000).toISOString().slice(0, 10); }
}

const MAX_RENEWALS = 2;

class Loan {
  renewals = 0;
  constructor(public due: LocalDate, readonly period: number, readonly memberBlocked: boolean) {}
}

type Result = { ok: true; newDue: LocalDate } | { ok: false; reason: string };

class RenewalPolicy {
  static renew(loan: Loan, today: LocalDate, waitersForTitle: number): Result {
    if (loan.memberBlocked) return { ok: false, reason: "member is blocked" };
    if (today.isAfter(loan.due)) return { ok: false, reason: "overdue - return and pay fine" };
    if (loan.renewals >= MAX_RENEWALS) return { ok: false, reason: \`renewal limit (\${MAX_RENEWALS}) reached\` };
    if (waitersForTitle > 0) return { ok: false, reason: \`\${waitersForTitle} member(s) waiting for this title\` };
    loan.due = loan.due.plusDays(loan.period);
    loan.renewals++;
    return { ok: true, newDue: loan.due };
  }
}

function show(r: Result): void {
  console.log(r.ok ? \`renewed, due \${r.newDue}\` : \`refused: \${r.reason}\`);
}

const renew = RenewalPolicy.renew;
const d = LocalDate.of;
const loan = new Loan(d(2026, 10, 15), 14, false);
show(renew(loan, d(2026, 10, 12), 0));
show(renew(loan, d(2026, 10, 28), 0));
show(renew(loan, d(2026, 11, 1), 0));
show(renew(new Loan(d(2026, 10, 15), 14, false), d(2026, 10, 16), 0));
show(renew(new Loan(d(2026, 10, 15), 14, false), d(2026, 10, 15), 0));
show(renew(new Loan(d(2026, 10, 15), 14, false), d(2026, 10, 12), 2));
show(renew(new Loan(d(2026, 10, 15), 14, true), d(2026, 10, 20), 0));` },
        { lang: 'cpp', code: `using Date = chrono::sys_days;

Date dateOf(int y, unsigned m, unsigned d) { return Date(chrono::year{y} / chrono::month{m} / chrono::day{d}); }

string str(Date d) {
    chrono::year_month_day ymd{d};
    char buf[16];
    snprintf(buf, sizeof buf, "%04d-%02u-%02u", int(ymd.year()), unsigned(ymd.month()), unsigned(ymd.day()));
    return buf;
}

constexpr int MAX_RENEWALS = 2;

struct Loan {
    Date due;
    int period;
    bool memberBlocked;
    int renewals = 0;
};

struct Result {
    bool ok;
    optional<Date> newDue;
    string reason;
};

class RenewalPolicy {
public:
    static Result renew(Loan& loan, Date today, int waitersForTitle) {
        if (loan.memberBlocked) return {false, nullopt, "member is blocked"};
        if (today > loan.due) return {false, nullopt, "overdue - return and pay fine"};
        if (loan.renewals >= MAX_RENEWALS) return {false, nullopt, "renewal limit (" + to_string(MAX_RENEWALS) + ") reached"};
        if (waitersForTitle > 0) return {false, nullopt, to_string(waitersForTitle) + " member(s) waiting for this title"};
        loan.due += chrono::days{loan.period};
        loan.renewals++;
        return {true, loan.due, "renewed"};
    }
};

void show(const Result& r) {
    if (r.ok) cout << "renewed, due " << str(*r.newDue) << "\\n";
    else cout << "refused: " << r.reason << "\\n";
}

int main() {
    Loan loan{dateOf(2026, 10, 15), 14, false};
    show(RenewalPolicy::renew(loan, dateOf(2026, 10, 12), 0));
    show(RenewalPolicy::renew(loan, dateOf(2026, 10, 28), 0));
    show(RenewalPolicy::renew(loan, dateOf(2026, 11, 1), 0));
    Loan late{dateOf(2026, 10, 15), 14, false};
    show(RenewalPolicy::renew(late, dateOf(2026, 10, 16), 0));
    Loan onDueDay{dateOf(2026, 10, 15), 14, false};
    show(RenewalPolicy::renew(onDueDay, dateOf(2026, 10, 15), 0));
    Loan wanted{dateOf(2026, 10, 15), 14, false};
    show(RenewalPolicy::renew(wanted, dateOf(2026, 10, 12), 2));
    Loan blocked{dateOf(2026, 10, 15), 14, true};
    show(RenewalPolicy::renew(blocked, dateOf(2026, 10, 20), 0));
}` }
      ],
      complexity: `<p>O(1) time and O(1) extra space per renewal call.</p>`,
      followUps: ['Let faculty renew 3 times (policy per member type).', 'Allow renewal while overdue if the fine is paid at the same time.', 'Return all failing reasons at once.']
    }
  });

  practice.push({
    title: 'Splitwise: Edit and Delete Expenses Without Corrupting Balances',
    level: 'Medium', tags: ['splitwise', 'event sourcing', 'design'], companies: ['Splitwise', 'Razorpay', 'Atlassian'],
    statement: `<p>Implement <code>ExpenseBook</code> with <code>add(payer, amount, participants)</code> returning an id, <code>edit(id, payer, amount, participants)</code>, <code>delete(id)</code> and <code>net(user)</code>. Equal splits, exact paise. After any sequence of operations, balances must equal what you would get by replaying only the surviving (latest) versions of expenses.</p>`,
    constraints: `≤ 10<sup>5</sup> operations; net() O(1); edit/delete O(participants)`,
    example: `<p>add(Asha, 900, [Asha,Ben,Chen]) → id 1. net: Asha +600, Ben −300, Chen −300. edit(1, Asha, 600, [Asha,Ben]) → Asha ${H.c('g', '+300')}, Ben ${H.c('g', '−300')}, Chen ${H.c('g', '0')}. delete(1) → everyone 0.</p>`,
    brute: { why: `<p>Naive: on every edit/delete, wipe all balances and replay the entire history — O(expenses × participants) per change. Even worse naive: edit the stored expense in place without touching balances, so the books drift.</p>`, code: `class ReplayAll {
    record Exp(String payer, long amount, List<String> among) {}
    final Map<Integer, Exp> live = new HashMap<>();
    Map<String, Long> net() {                                       // O(E * P) on every read
        Map<String, Long> n = new HashMap<>();
        for (Exp e : live.values()) {
            n.merge(e.payer(), e.amount(), Long::sum);
            for (String p : e.among()) n.merge(p, -e.amount() / e.among().size(), Long::sum);   // also drops paise
        }
        return n;
    }
}` },
    mcq: { q: 'What is the cheapest correct way to apply an edit to an expense?', options: ['Apply the old version with sign −1, then the new version with sign +1', 'Recompute everything from scratch', 'Only apply the new version', 'Change the stored expense and ignore balances'], answer: 0, explain: 'Reversing the old effect and adding the new one touches only the participants of the two versions.' },
    hints: [`<p>Hint 1: write one function <code>apply(expense, sign)</code> that adds sign × amount to the payer and subtracts sign × share from each participant.</p>`, `<p>Hint 2: edit = apply(old, −1), store new, apply(new, +1). delete = apply(old, −1), remove. Shares must be computed deterministically so reversing cancels exactly.</p>`, `<p>Hint 3: keep the history of versions (append-only) for audit; the "live" map points to the latest version. Reject edits of deleted ids.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: '60000 -30000 -30000\n30000 -30000 0\nnobody to split among\n30000 -30000 0\n0 0 0\nno live expense 1\namount must be positive\nadd 1 asha 90000 [asha, ben, chen]\nedit 1 asha 90000 [asha, ben, chen] -> asha 60000 [asha, ben]\ndelete 1\n' }] },
    solution: {
      approach: `<p>Event-sourcing-lite: expenses are immutable versions; balances are a derived view updated by applying and reversing versions. Deterministic exact shares guarantee reversal is perfect.</p>`,
      code: `class ExpenseBook {
    record Exp(String payer, long amount, List<String> among) {
        @Override public String toString() { return payer + " " + amount + " " + among; }
    }
    private final Map<Integer, Exp> live = new HashMap<>();
    private final List<String> audit = new ArrayList<>();
    private final Map<String, Long> net = new HashMap<>();
    private int nextId = 1;

    private static Exp checked(String payer, long amount, List<String> among) {
        if (amount <= 0) throw new IllegalArgumentException("amount must be positive");
        if (among.isEmpty()) throw new IllegalArgumentException("nobody to split among");
        return new Exp(payer, amount, List.copyOf(among));
    }

    private void apply(Exp e, int sign) {
        int n = e.among().size();
        long base = e.amount() / n, extra = e.amount() % n;
        net.merge(e.payer(), sign * e.amount(), Long::sum);
        for (int i = 0; i < n; i++) net.merge(e.among().get(i), -sign * (base + (i < extra ? 1 : 0)), Long::sum);
    }

    int add(String payer, long amount, List<String> among) {
        Exp e = checked(payer, amount, among);
        int id = nextId++;
        live.put(id, e);
        apply(e, +1);
        audit.add("add " + id + " " + e);
        return id;
    }

    void edit(int id, String payer, long amount, List<String> among) {
        Exp old = live.get(id);
        if (old == null) throw new IllegalArgumentException("no live expense " + id);
        Exp now = checked(payer, amount, among);          // validate BEFORE touching the books
        apply(old, -1);
        apply(now, +1);
        live.put(id, now);
        audit.add("edit " + id + " " + old + " -> " + now);
    }

    void delete(int id) {
        Exp old = live.remove(id);
        if (old == null) throw new IllegalArgumentException("no live expense " + id);
        apply(old, -1);
        audit.add("delete " + id);
    }

    long net(String user) { return net.getOrDefault(user, 0L); }
    List<String> auditTrail() { return List.copyOf(audit); }
}

class ExpenseBookDemo {
    static String row(ExpenseBook b) { return b.net("asha") + " " + b.net("ben") + " " + b.net("chen"); }

    public static void main(String[] args) {
        ExpenseBook b = new ExpenseBook();
        int id = b.add("asha", 90000, List.of("asha", "ben", "chen"));
        System.out.println(row(b));                                      // 60000 -30000 -30000
        b.edit(id, "asha", 60000, List.of("asha", "ben"));
        System.out.println(row(b));                                      // 30000 -30000 0
        try { b.edit(id, "asha", 50000, List.of()); } catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }
        System.out.println(row(b));                                      // unchanged: the bad edit touched nothing
        b.delete(id);
        System.out.println(row(b));                                      // 0 0 0
        try { b.delete(id); } catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }
        try { b.add("asha", 0, List.of("asha")); } catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }
        b.auditTrail().forEach(System.out::println);
    }
}`,
      alt: [
        { lang: 'python', code: `from dataclasses import dataclass


@dataclass(frozen=True)
class Exp:
    payer: str
    amount: int
    among: tuple[str, ...]

    def __str__(self) -> str:
        return f"{self.payer} {self.amount} [{', '.join(self.among)}]"


class ExpenseBook:
    def __init__(self) -> None:
        self._live: dict[int, Exp] = {}
        self.audit: list[str] = []
        self._net: dict[str, int] = {}
        self._next_id = 1

    @staticmethod
    def _checked(payer: str, amount: int, among: list[str]) -> Exp:
        if amount <= 0:
            raise ValueError("amount must be positive")
        if not among:
            raise ValueError("nobody to split among")
        return Exp(payer, amount, tuple(among))

    def _apply(self, e: Exp, sign: int) -> None:
        base, extra = divmod(e.amount, len(e.among))
        self._net[e.payer] = self._net.get(e.payer, 0) + sign * e.amount
        for i, person in enumerate(e.among):
            share = base + (1 if i < extra else 0)
            self._net[person] = self._net.get(person, 0) - sign * share

    def add(self, payer: str, amount: int, among: list[str]) -> int:
        e = self._checked(payer, amount, among)
        expense_id = self._next_id
        self._next_id += 1
        self._live[expense_id] = e
        self._apply(e, +1)
        self.audit.append(f"add {expense_id} {e}")
        return expense_id

    def edit(self, expense_id: int, payer: str, amount: int, among: list[str]) -> None:
        old = self._live.get(expense_id)
        if old is None:
            raise ValueError(f"no live expense {expense_id}")
        new = self._checked(payer, amount, among)       # validate BEFORE touching the books
        self._apply(old, -1)
        self._apply(new, +1)
        self._live[expense_id] = new
        self.audit.append(f"edit {expense_id} {old} -> {new}")

    def delete(self, expense_id: int) -> None:
        old = self._live.pop(expense_id, None)
        if old is None:
            raise ValueError(f"no live expense {expense_id}")
        self._apply(old, -1)
        self.audit.append(f"delete {expense_id}")

    def net(self, user: str) -> int:
        return self._net.get(user, 0)


def row(b: ExpenseBook) -> str:
    return f"{b.net('asha')} {b.net('ben')} {b.net('chen')}"


if __name__ == "__main__":
    b = ExpenseBook()
    expense_id = b.add("asha", 90000, ["asha", "ben", "chen"])
    print(row(b))
    b.edit(expense_id, "asha", 60000, ["asha", "ben"])
    print(row(b))
    try:
        b.edit(expense_id, "asha", 50000, [])
    except ValueError as e:
        print(e)
    print(row(b))
    b.delete(expense_id)
    print(row(b))
    try:
        b.delete(expense_id)
    except ValueError as e:
        print(e)
    try:
        b.add("asha", 0, ["asha"])
    except ValueError as e:
        print(e)
    for line in b.audit:
        print(line)` },
        { lang: 'ts', code: `interface Exp { readonly payer: string; readonly amount: number; readonly among: readonly string[] }

const describe = (e: Exp): string => \`\${e.payer} \${e.amount} [\${e.among.join(", ")}]\`;

class ExpenseBook {
  private readonly live = new Map<number, Exp>();
  readonly audit: string[] = [];
  private readonly balance = new Map<string, number>();
  private nextId = 1;

  private static checked(payer: string, amount: number, among: readonly string[]): Exp {
    if (amount <= 0) throw new Error("amount must be positive");
    if (among.length === 0) throw new Error("nobody to split among");
    return { payer, amount, among: [...among] };
  }

  private bump(who: string, delta: number): void { this.balance.set(who, (this.balance.get(who) ?? 0) + delta); }

  private apply(e: Exp, sign: 1 | -1): void {
    const n = e.among.length;
    const base = Math.floor(e.amount / n), extra = e.amount % n;
    this.bump(e.payer, sign * e.amount);
    e.among.forEach((person, i) => this.bump(person, -sign * (base + (i < extra ? 1 : 0))));
  }

  add(payer: string, amount: number, among: readonly string[]): number {
    const e = ExpenseBook.checked(payer, amount, among);
    const id = this.nextId++;
    this.live.set(id, e);
    this.apply(e, 1);
    this.audit.push(\`add \${id} \${describe(e)}\`);
    return id;
  }

  edit(id: number, payer: string, amount: number, among: readonly string[]): void {
    const old = this.live.get(id);
    if (old === undefined) throw new Error(\`no live expense \${id}\`);
    const now = ExpenseBook.checked(payer, amount, among); // validate BEFORE touching the books
    this.apply(old, -1);
    this.apply(now, 1);
    this.live.set(id, now);
    this.audit.push(\`edit \${id} \${describe(old)} -> \${describe(now)}\`);
  }

  delete(id: number): void {
    const old = this.live.get(id);
    if (old === undefined) throw new Error(\`no live expense \${id}\`);
    this.live.delete(id);
    this.apply(old, -1);
    this.audit.push(\`delete \${id}\`);
  }

  net(user: string): number { return this.balance.get(user) ?? 0; }
}

const row = (b: ExpenseBook): string => \`\${b.net("asha")} \${b.net("ben")} \${b.net("chen")}\`;
const attempt = (action: () => void): void => {
  try {
    action();
  } catch (e) {
    console.log((e as Error).message);
  }
};

const b = new ExpenseBook();
const id = b.add("asha", 90000, ["asha", "ben", "chen"]);
console.log(row(b));
b.edit(id, "asha", 60000, ["asha", "ben"]);
console.log(row(b));
attempt(() => b.edit(id, "asha", 50000, []));
console.log(row(b));
b.delete(id);
console.log(row(b));
attempt(() => b.delete(id));
attempt(() => b.add("asha", 0, ["asha"]));
for (const line of b.audit) console.log(line);` },
        { lang: 'cpp', code: `struct Exp {
    string payer;
    long long amount;
    vector<string> among;

    string str() const {
        string s = payer + " " + to_string(amount) + " [";
        for (size_t i = 0; i < among.size(); i++) s += (i ? ", " : "") + among[i];
        return s + "]";
    }
};

class ExpenseBook {
    unordered_map<int, Exp> live;
    unordered_map<string, long long> balance;
    int nextId = 1;

    static Exp checked(const string& payer, long long amount, const vector<string>& among) {
        if (amount <= 0) throw invalid_argument("amount must be positive");
        if (among.empty()) throw invalid_argument("nobody to split among");
        return Exp{payer, amount, among};
    }

    void apply(const Exp& e, int sign) {
        long long n = e.among.size();
        long long base = e.amount / n, extra = e.amount % n;
        balance[e.payer] += sign * e.amount;
        for (long long i = 0; i < n; i++) balance[e.among[i]] -= sign * (base + (i < extra ? 1 : 0));
    }

public:
    vector<string> audit;

    int add(const string& payer, long long amount, const vector<string>& among) {
        Exp e = checked(payer, amount, among);
        int id = nextId++;
        apply(e, +1);
        audit.push_back("add " + to_string(id) + " " + e.str());
        live.emplace(id, move(e));
        return id;
    }

    void edit(int id, const string& payer, long long amount, const vector<string>& among) {
        auto it = live.find(id);
        if (it == live.end()) throw invalid_argument("no live expense " + to_string(id));
        Exp now = checked(payer, amount, among);       // validate BEFORE touching the books
        apply(it->second, -1);
        apply(now, +1);
        audit.push_back("edit " + to_string(id) + " " + it->second.str() + " -> " + now.str());
        it->second = move(now);
    }

    void erase(int id) {
        auto it = live.find(id);
        if (it == live.end()) throw invalid_argument("no live expense " + to_string(id));
        apply(it->second, -1);
        live.erase(it);
        audit.push_back("delete " + to_string(id));
    }

    long long net(const string& user) const {
        auto it = balance.find(user);
        return it == balance.end() ? 0 : it->second;
    }
};

string row(const ExpenseBook& b) {
    return to_string(b.net("asha")) + " " + to_string(b.net("ben")) + " " + to_string(b.net("chen"));
}

void attempt(const function<void()>& action) {
    try {
        action();
    } catch (const invalid_argument& e) {
        cout << e.what() << "\\n";
    }
}

int main() {
    ExpenseBook b;
    int id = b.add("asha", 90000, {"asha", "ben", "chen"});
    cout << row(b) << "\\n";
    b.edit(id, "asha", 60000, {"asha", "ben"});
    cout << row(b) << "\\n";
    attempt([&] { b.edit(id, "asha", 50000, {}); });
    cout << row(b) << "\\n";
    b.erase(id);
    cout << row(b) << "\\n";
    attempt([&] { b.erase(id); });
    attempt([&] { b.add("asha", 0, {"asha"}); });
    for (const auto& line : b.audit) cout << line << "\\n";
}` }
      ],
      complexity: `<p>add/edit/delete O(participants); net O(1); memory O(expenses + users + audit).</p>`,
      followUps: ['Concurrent edits of the same expense: use a version number (optimistic locking).', 'Rebuild balances from the audit log after a crash.', 'Show "Ben edited Dinner: ₹900 → ₹600" in the activity feed.']
    }
  });

  /* ======================= PRACTICE: HARD ======================= */
  practice.push({
    title: 'Lock-Free Multi-Seat Booking with CAS and Roll-Back',
    level: 'Hard', tags: ['bookmyshow', 'concurrency', 'cas', 'atomic'], companies: ['BookMyShow', 'Uber', 'Goldman Sachs'],
    statement: `<p>Seats of one show are an array of atomic integers (<code>AtomicIntegerArray</code>, <code>std::atomic&lt;int&gt;</code> cells, an <code>Int32Array</code> with <code>Atomics</code>; 0 = free, otherwise the user id holding it). Implement <code>boolean book(int user, int[] seats)</code> that takes <b>all</b> seats or none, <b>without locks</b>, safe for many threads. If it fails part-way, it must undo exactly the seats it took. Prove with a stress test that no seat is ever owned by two users and no seat is left half-booked.</p>`,
    constraints: `≤ 10<sup>4</sup> seats, ≤ 10 seats per request, 64 threads`,
    example: `<p>seats 3,4 free. Thread A: book(7, [3,4]); thread B: book(9, [4,5]) at the same time. Possible outcome: A wins 3 and 4 → ${H.c('g', 'true')}; B CAS on 4 fails → ${H.c('r', 'false')}, B had nothing to undo (it tries 4 before 5 because seats are sorted). Seat 5 stays ${H.c('g', 'free')}.</p>`,
    brute: { why: `<p>Naive: a plain <code>int[]</code> with "if all free then set all" — two threads both see "all free" and both write, so the later one silently overwrites the earlier one (double booking). It also has no memory visibility guarantees between threads.</p>`, code: `class NaiveSeats {
    final int[] owner;
    NaiveSeats(int n) { owner = new int[n]; }
    boolean book(int user, int[] seats) {
        for (int s : seats) if (owner[s] != 0) return false;   // CHECK
        for (int s : seats) owner[s] = user;                    // ACT (another thread can be between!)
        return true;
    }
}` },
    mcq: { q: 'Thread A got seat 3 via CAS but then fails on seat 4. What must it do?', options: ['compareAndSet(3, A, 0) to undo its own grab only', 'set(3, 0) unconditionally', 'Retry forever until 4 is free', 'Leave seat 3 held'], answer: 0, explain: 'A conditional undo only releases the seat if A still owns it; an unconditional set could wipe out a seat someone else legitimately owns later.' },
    hints: [`<p>Hint 1: <code>compareAndSet(i, 0, user)</code> is an atomic "take seat i only if free". It replaces the check-then-act pair with one hardware instruction.</p>`, `<p>Hint 2: sort the requested seats and drop duplicates; take them one by one; remember what you took. On the first failure, undo each taken seat with <code>compareAndSet(i, user, 0)</code> and return false.</p>`, `<p>Hint 3: stress test: N threads with a start gate (<code>CountDownLatch</code>, <code>std::latch</code>), random overlapping requests; afterwards check each seat's owner and that every successful request owns all its seats (no partial bookings remain).</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: 'true false 0\ntrue true 3\nfalse\nno seat 20\n0\nuser must be positive\ninvariant holds\n' }] },
    solution: {
      approach: `<p>Optimistic, lock-free all-or-nothing using per-seat CAS plus compensation (roll-back). Sorting gives a consistent acquisition order, so two overlapping requests collide on their first common seat rather than each grabbing half.</p>`,
      code: `class CasSeatMap {
    private final AtomicIntegerArray owner;                      // 0 = free, otherwise the user id (> 0)
    CasSeatMap(int n) { owner = new AtomicIntegerArray(n); }

    boolean book(int user, int[] seats) {
        if (user <= 0) throw new IllegalArgumentException("user must be positive");
        int[] order = Arrays.stream(seats).distinct().sorted().toArray();
        for (int s : order) if (s < 0 || s >= owner.length()) throw new IllegalArgumentException("no seat " + s);
        int taken = 0;
        for (int s : order) {
            if (!owner.compareAndSet(s, 0, user)) {              // lost the race (or already sold)
                for (int k = 0; k < taken; k++) owner.compareAndSet(order[k], user, 0);   // undo only ours
                return false;
            }
            taken++;
        }
        return true;
    }

    int ownerOf(int seat) { return owner.get(seat); }

    static void expectError(Runnable r) {
        try { r.run(); } catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }
    }

    public static void main(String[] args) throws Exception {
        CasSeatMap small = new CasSeatMap(20);
        System.out.println(small.book(1, new int[]{3, 4}) + " " + small.book(2, new int[]{2, 4}) + " " + small.ownerOf(2));   // true false 0: seat 2 was taken, then rolled back
        System.out.println(small.book(2, new int[]{5, 6}) + " " + small.book(3, new int[]{9, 7, 9, 8}) + " " + small.ownerOf(7));   // true true 3
        System.out.println(small.book(1, new int[]{3}));          // false: even your own seat is not free
        expectError(() -> small.book(1, new int[]{19, 20}));      // no seat 20 (nothing was taken)
        System.out.println(small.ownerOf(19));                    // 0
        expectError(() -> small.book(0, new int[]{1}));           // user must be positive

        CasSeatMap map = new CasSeatMap(20);
        int threads = 16;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch go = new CountDownLatch(1);
        List<Future<Boolean>> results = new ArrayList<>();
        int[][] reqs = new int[threads][];
        for (int t = 0; t < threads; t++) {
            final int user = t + 1;
            reqs[t] = new int[]{user % 10, (user * 7) % 10, 10 + user % 5};
            final int[] req = reqs[t];
            results.add(pool.submit(() -> { go.await(); return map.book(user, req); }));
        }
        go.countDown();
        int winnerSeats = 0;
        for (int t = 0; t < threads; t++) {
            boolean won = results.get(t).get();
            int[] distinct = Arrays.stream(reqs[t]).distinct().toArray();
            for (int s : distinct) {
                boolean mine = map.ownerOf(s) == t + 1;
                if (won != mine) throw new AssertionError("partial, stolen or leaked booking");
            }
            if (won) winnerSeats += distinct.length;
        }
        pool.shutdown();
        int owned = 0;
        for (int s = 0; s < 20; s++) if (map.ownerOf(s) != 0) owned++;
        System.out.println(owned == winnerSeats ? "invariant holds" : "LEAK");   // all-or-nothing under contention
    }
}`,
      alt: [
        { lang: 'python', code: `import threading


class AtomicIntArray:
    """CPython has no atomic integers, so compare-and-set is emulated with one lock."""

    def __init__(self, n: int) -> None:
        self._cells = [0] * n
        self._lock = threading.Lock()

    def __len__(self) -> int:
        return len(self._cells)

    def get(self, i: int) -> int:
        return self._cells[i]

    def compare_and_set(self, i: int, expected: int, new: int) -> bool:
        with self._lock:
            if self._cells[i] != expected:
                return False
            self._cells[i] = new
            return True


class CasSeatMap:
    def __init__(self, n: int) -> None:
        self._owner = AtomicIntArray(n)                # 0 = free, otherwise the user id (> 0)

    def book(self, user: int, seats: list[int]) -> bool:
        if user <= 0:
            raise ValueError("user must be positive")
        order = sorted(set(seats))
        for s in order:
            if s < 0 or s >= len(self._owner):
                raise ValueError(f"no seat {s}")
        taken: list[int] = []
        for s in order:
            if not self._owner.compare_and_set(s, 0, user):      # lost the race (or already sold)
                for t in taken:
                    self._owner.compare_and_set(t, user, 0)      # undo only ours
                return False
            taken.append(s)
        return True

    def owner_of(self, seat: int) -> int:
        return self._owner.get(seat)


def lower(flag: bool) -> str:
    return "true" if flag else "false"


def expect_error(action) -> None:
    try:
        action()
    except ValueError as e:
        print(e)


if __name__ == "__main__":
    small = CasSeatMap(20)
    print(lower(small.book(1, [3, 4])), lower(small.book(2, [2, 4])), small.owner_of(2))
    print(lower(small.book(2, [5, 6])), lower(small.book(3, [9, 7, 9, 8])), small.owner_of(7))
    print(lower(small.book(1, [3])))
    expect_error(lambda: small.book(1, [19, 20]))
    print(small.owner_of(19))
    expect_error(lambda: small.book(0, [1]))

    seat_map = CasSeatMap(20)
    threads = 16
    reqs = [[u % 10, (u * 7) % 10, 10 + u % 5] for u in range(1, threads + 1)]
    results = [False] * threads
    go = threading.Event()

    def worker(t: int) -> None:
        go.wait()
        results[t] = seat_map.book(t + 1, reqs[t])

    pool = [threading.Thread(target=worker, args=(t,)) for t in range(threads)]
    for th in pool:
        th.start()
    go.set()
    for th in pool:
        th.join()
    winner_seats = 0
    for t in range(threads):
        distinct = set(reqs[t])
        for s in distinct:
            if results[t] != (seat_map.owner_of(s) == t + 1):
                raise AssertionError("partial, stolen or leaked booking")
        if results[t]:
            winner_seats += len(distinct)
    owned = sum(1 for s in range(20) if seat_map.owner_of(s) != 0)
    print("invariant holds" if owned == winner_seats else "LEAK")` },
        { lang: 'ts', code: `class CasSeatMap {
  // Int32Array over a SharedArrayBuffer: Atomics.compareExchange is a real CAS, usable from worker threads.
  private readonly owner: Int32Array; // 0 = free, otherwise the user id (> 0)

  constructor(n: number) { this.owner = new Int32Array(new SharedArrayBuffer(4 * n)); }

  book(user: number, seats: readonly number[]): boolean {
    if (user <= 0) throw new Error("user must be positive");
    const order = [...new Set(seats)].sort((a, b) => a - b);
    for (const s of order) if (s < 0 || s >= this.owner.length) throw new Error(\`no seat \${s}\`);
    const taken: number[] = [];
    for (const s of order) {
      if (Atomics.compareExchange(this.owner, s, 0, user) !== 0) { // lost the race (or already sold)
        for (const t of taken) Atomics.compareExchange(this.owner, t, user, 0); // undo only ours
        return false;
      }
      taken.push(s);
    }
    return true;
  }

  ownerOf(seat: number): number { return Atomics.load(this.owner, seat); }
}

const expectError = (action: () => void): void => {
  try {
    action();
  } catch (e) {
    console.log((e as Error).message);
  }
};

const small = new CasSeatMap(20);
console.log(\`\${small.book(1, [3, 4])} \${small.book(2, [2, 4])} \${small.ownerOf(2)}\`);
console.log(\`\${small.book(2, [5, 6])} \${small.book(3, [9, 7, 9, 8])} \${small.ownerOf(7)}\`);
console.log(small.book(1, [3]));
expectError(() => small.book(1, [19, 20]));
console.log(small.ownerOf(19));
expectError(() => small.book(0, [1]));

// One JS thread: the 16 requests run one after another (a Worker pool could run them truly in parallel).
const seatMap = new CasSeatMap(20);
const threads = 16;
const reqs = Array.from({ length: threads }, (_, t) => [(t + 1) % 10, ((t + 1) * 7) % 10, 10 + ((t + 1) % 5)]);
const results = reqs.map((req, t) => seatMap.book(t + 1, req));
let winnerSeats = 0;
for (let t = 0; t < threads; t++) {
  const distinct = [...new Set(reqs[t])];
  for (const s of distinct) {
    if (results[t] !== (seatMap.ownerOf(s) === t + 1)) throw new Error("partial, stolen or leaked booking");
  }
  if (results[t]) winnerSeats += distinct.length;
}
let owned = 0;
for (let s = 0; s < 20; s++) if (seatMap.ownerOf(s) !== 0) owned++;
console.log(owned === winnerSeats ? "invariant holds" : "LEAK");` },
        { lang: 'cpp', code: `class CasSeatMap {
    unique_ptr<atomic<int>[]> owner;                 // 0 = free, otherwise the user id (> 0)
    int size;

public:
    explicit CasSeatMap(int n) : owner(make_unique<atomic<int>[]>(n)), size(n) {
        for (int i = 0; i < n; i++) owner[i] = 0;
    }

    bool book(int user, const vector<int>& seats) {
        if (user <= 0) throw invalid_argument("user must be positive");
        set<int> order(seats.begin(), seats.end());
        for (int s : order)
            if (s < 0 || s >= size) throw invalid_argument("no seat " + to_string(s));
        vector<int> taken;
        for (int s : order) {
            int expected = 0;
            if (!owner[s].compare_exchange_strong(expected, user)) {      // lost the race (or already sold)
                for (int t : taken) {
                    int mine = user;
                    owner[t].compare_exchange_strong(mine, 0);            // undo only ours
                }
                return false;
            }
            taken.push_back(s);
        }
        return true;
    }

    int ownerOf(int seat) const { return owner[seat].load(); }
};

void expectError(const function<void()>& action) {
    try {
        action();
    } catch (const invalid_argument& e) {
        cout << e.what() << "\\n";
    }
}

int main() {
    cout << boolalpha;
    CasSeatMap small(20);
    bool a = small.book(1, {3, 4}), b = small.book(2, {2, 4});
    cout << a << " " << b << " " << small.ownerOf(2) << "\\n";
    bool c = small.book(2, {5, 6}), d = small.book(3, {9, 7, 9, 8});
    cout << c << " " << d << " " << small.ownerOf(7) << "\\n";
    cout << small.book(1, {3}) << "\\n";
    expectError([&] { small.book(1, {19, 20}); });
    cout << small.ownerOf(19) << "\\n";
    expectError([&] { small.book(0, {1}); });

    CasSeatMap seatMap(20);
    const int threads = 16;
    vector<vector<int>> reqs;
    for (int u = 1; u <= threads; u++) reqs.push_back({u % 10, (u * 7) % 10, 10 + u % 5});
    vector<char> results(threads, 0);
    latch go(1);
    {
        vector<jthread> pool;
        for (int t = 0; t < threads; t++)
            pool.emplace_back([&, t] { go.wait(); results[t] = seatMap.book(t + 1, reqs[t]); });
        go.count_down();
    }                                               // jthreads join here
    int winnerSeats = 0;
    for (int t = 0; t < threads; t++) {
        set<int> distinct(reqs[t].begin(), reqs[t].end());
        for (int s : distinct)
            if ((results[t] != 0) != (seatMap.ownerOf(s) == t + 1)) throw logic_error("partial, stolen or leaked booking");
        if (results[t]) winnerSeats += distinct.size();
    }
    int owned = 0;
    for (int s = 0; s < 20; s++) owned += seatMap.ownerOf(s) != 0;
    cout << (owned == winnerSeats ? "invariant holds" : "LEAK") << "\\n";
}` }
      ],
      complexity: `<p>O(k log k) per request for k seats; no blocking. Under heavy contention requests fail fast instead of waiting, which matches the "seat taken, pick again" UX.</p>`,
      followUps: ['Add hold expiry: store (user, expiresAt) in an array of atomic references to immutable records.', 'Compare throughput with a per-show lock under 64 threads.', 'Why does sorting matter less for CAS than for locks (no deadlock possible) yet still help?']
    }
  });

  practice.push({
    title: 'Optimal Account Balancing (Exact Minimum Transfers)',
    level: 'Hard', tags: ['splitwise', 'backtracking', 'bitmask dp'], companies: ['Google', 'Uber', 'Splitwise', 'Airbnb'],
    statement: `<p>Given transactions <code>[from, to, amount]</code> (from gave money to to, so to now owes from — or think of it simply as a debt edge), return the <b>minimum number of transfers</b> needed to settle all debts. This is the exact version of "simplify debts" (LeetCode 465).</p>`,
    constraints: `1 ≤ transactions ≤ 8, ids &lt; 12, amounts ≤ 100 (so ≤ 12 non-zero people)`,
    example: `<p>[[0,1,10],[2,0,5]] → nets: 0: −10+5 = −5, 1: +10, 2: −5 → ${H.c('g', '2')} transfers.<br>[[0,1,10],[1,0,1],[1,2,5],[2,0,5]] → nets 0: −4, 1: +4, 2: 0 → ${H.c('g', '1')}.</p>`,
    brute: { why: `<p>Naive: settle every transaction separately (m transfers), or use greedy max-debtor/max-creditor, which is fast but <b>not optimal</b>: nets +4, +3, −2, −2, −3 give 4 greedy transfers while 3 suffice.</p>`, code: `class GreedyOnly {
    static int transfers(int[] net) {               // NOT always minimal
        PriorityQueue<Integer> pos = new PriorityQueue<>(Comparator.reverseOrder());
        PriorityQueue<Integer> neg = new PriorityQueue<>(Comparator.reverseOrder());
        for (int v : net) { if (v > 0) pos.add(v); else if (v < 0) neg.add(-v); }
        int count = 0;
        while (!pos.isEmpty()) {
            int p = pos.poll(), n = neg.poll(), m = Math.min(p, n);
            count++;
            if (p > m) pos.add(p - m);
            if (n > m) neg.add(n - m);
        }
        return count;
    }
}` },
    mcq: { q: 'The non-zero nets split into 2 disjoint groups that each sum to zero, with 7 people in total. What is the minimum number of transfers (assuming neither group can be split further)?', options: ['5', '6', '7', '2'], answer: 0, explain: 'A zero-sum group of k people needs k − 1 transfers: total = 7 − 2 = 5.' },
    hints: [`<p>Hint 1: collapse to nets and drop zeros. Now the answer depends only on that small array.</p>`, `<p>Hint 2: DFS: take the first non-zero person s; try settling them completely with each later person i of the opposite sign (<code>d[i] += d[s]</code>), recurse on s+1, undo. Count 1 per step.</p>`, `<p>Hint 3: prune — skip zeros, only pair opposite signs, and if a pairing makes d[i] exactly 0 it is a perfect match: no other choice can beat it, so break. Alternative: bitmask DP over subsets (n − max zero-sum groups).</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: '2\n1\n3\n0\n0\n' }] },
    solution: {
      approach: `<p>Backtracking over "who absorbs the first remaining balance", with the perfect-match prune. Equivalent to maximising the number of zero-sum groups; exponential but tiny for n ≤ 12.</p>`,
      code: `class OptimalBalancing {
    static int minTransfers(int[][] transactions) {
        Map<Integer, Integer> bal = new HashMap<>();
        for (int[] t : transactions) {
            bal.merge(t[0], -t[2], Integer::sum);
            bal.merge(t[1], t[2], Integer::sum);
        }
        int[] d = bal.values().stream().filter(v -> v != 0).mapToInt(Integer::intValue).toArray();
        return dfs(d, 0);
    }

    private static int dfs(int[] d, int s) {
        while (s < d.length && d[s] == 0) s++;
        if (s == d.length) return 0;
        int best = Integer.MAX_VALUE;
        for (int i = s + 1; i < d.length; i++) {
            if ((d[i] > 0) == (d[s] > 0) || d[i] == 0) continue;     // need opposite signs
            d[i] += d[s];                                            // s settles fully with i
            best = Math.min(best, 1 + dfs(d, s + 1));
            d[i] -= d[s];
            if (d[i] + d[s] == 0) break;                             // perfect match: optimal, stop
        }
        return best;
    }

    public static void main(String[] args) {
        System.out.println(minTransfers(new int[][]{{0, 1, 10}, {2, 0, 5}}));                          // 2
        System.out.println(minTransfers(new int[][]{{0, 1, 10}, {1, 0, 1}, {1, 2, 5}, {2, 0, 5}}));     // 1
        // nets a:+4 b:+3 x:-2 y:-2 z:-3  (greedy gives 4)
        System.out.println(minTransfers(new int[][]{{10, 0, 4}, {11, 1, 3}, {2, 10, 2}, {3, 10, 2}, {4, 11, 3}}));   // 3
        System.out.println(minTransfers(new int[][]{{0, 1, 5}, {1, 0, 5}}));                           // 0: the two debts cancel
        System.out.println(minTransfers(new int[][]{}));                                              // 0: nothing owed
    }
}`,
      alt: [
        { lang: 'python', code: `class OptimalBalancing:
    @staticmethod
    def min_transfers(transactions: list[tuple[int, int, int]]) -> int:
        """transactions are (payer, receiver, amount); returns the fewest transfers that settle everyone."""
        balance: dict[int, int] = {}
        for payer, receiver, amount in transactions:
            balance[payer] = balance.get(payer, 0) - amount
            balance[receiver] = balance.get(receiver, 0) + amount
        debts = [v for v in balance.values() if v != 0]

        def dfs(s: int) -> int:
            while s < len(debts) and debts[s] == 0:
                s += 1
            if s == len(debts):
                return 0
            best = float("inf")
            for i in range(s + 1, len(debts)):
                if (debts[i] > 0) == (debts[s] > 0) or debts[i] == 0:    # need opposite signs
                    continue
                debts[i] += debts[s]                                      # s settles fully with i
                best = min(best, 1 + dfs(s + 1))
                debts[i] -= debts[s]
                if debts[i] + debts[s] == 0:                              # perfect match: optimal, stop
                    break
            return int(best)

        return dfs(0)


if __name__ == "__main__":
    solve = OptimalBalancing.min_transfers
    print(solve([(0, 1, 10), (2, 0, 5)]))
    print(solve([(0, 1, 10), (1, 0, 1), (1, 2, 5), (2, 0, 5)]))
    print(solve([(10, 0, 4), (11, 1, 3), (2, 10, 2), (3, 10, 2), (4, 11, 3)]))
    print(solve([(0, 1, 5), (1, 0, 5)]))
    print(solve([]))` },
        { lang: 'ts', code: `type Transaction = readonly [payer: number, receiver: number, amount: number];

class OptimalBalancing {
  static minTransfers(transactions: readonly Transaction[]): number {
    const balance = new Map<number, number>();
    for (const [payer, receiver, amount] of transactions) {
      balance.set(payer, (balance.get(payer) ?? 0) - amount);
      balance.set(receiver, (balance.get(receiver) ?? 0) + amount);
    }
    const debts = [...balance.values()].filter((v) => v !== 0);
    return OptimalBalancing.dfs(debts, 0);
  }

  private static dfs(d: number[], start: number): number {
    let s = start;
    while (s < d.length && d[s] === 0) s++;
    if (s === d.length) return 0;
    let best = Infinity;
    for (let i = s + 1; i < d.length; i++) {
      if ((d[i] > 0) === (d[s] > 0) || d[i] === 0) continue; // need opposite signs
      d[i] += d[s]; // s settles fully with i
      best = Math.min(best, 1 + OptimalBalancing.dfs(d, s + 1));
      d[i] -= d[s];
      if (d[i] + d[s] === 0) break; // perfect match: optimal, stop
    }
    return best;
  }
}

const solve = (t: Transaction[]): number => OptimalBalancing.minTransfers(t);
console.log(solve([[0, 1, 10], [2, 0, 5]]));
console.log(solve([[0, 1, 10], [1, 0, 1], [1, 2, 5], [2, 0, 5]]));
console.log(solve([[10, 0, 4], [11, 1, 3], [2, 10, 2], [3, 10, 2], [4, 11, 3]]));
console.log(solve([[0, 1, 5], [1, 0, 5]]));
console.log(solve([]));` },
        { lang: 'cpp', code: `class OptimalBalancing {
    static int dfs(vector<int>& d, size_t s) {
        while (s < d.size() && d[s] == 0) s++;
        if (s == d.size()) return 0;
        int best = INT_MAX;
        for (size_t i = s + 1; i < d.size(); i++) {
            if ((d[i] > 0) == (d[s] > 0) || d[i] == 0) continue;     // need opposite signs
            d[i] += d[s];                                            // s settles fully with i
            best = min(best, 1 + dfs(d, s + 1));
            d[i] -= d[s];
            if (d[i] + d[s] == 0) break;                             // perfect match: optimal, stop
        }
        return best;
    }

public:
    // transactions are {payer, receiver, amount}
    static int minTransfers(const vector<array<int, 3>>& transactions) {
        unordered_map<int, int> balance;
        for (const auto& [payer, receiver, amount] : transactions) {
            balance[payer] -= amount;
            balance[receiver] += amount;
        }
        vector<int> debts;
        for (const auto& [person, v] : balance)
            if (v != 0) debts.push_back(v);
        return dfs(debts, 0);
    }
};

int main() {
    cout << OptimalBalancing::minTransfers({{0, 1, 10}, {2, 0, 5}}) << "\\n";
    cout << OptimalBalancing::minTransfers({{0, 1, 10}, {1, 0, 1}, {1, 2, 5}, {2, 0, 5}}) << "\\n";
    cout << OptimalBalancing::minTransfers({{10, 0, 4}, {11, 1, 3}, {2, 10, 2}, {3, 10, 2}, {4, 11, 3}}) << "\\n";
    cout << OptimalBalancing::minTransfers({{0, 1, 5}, {1, 0, 5}}) << "\\n";
    cout << OptimalBalancing::minTransfers({}) << "\\n";
}` }
      ],
      complexity: `<p>Worst case O(n!) without pruning; with pruning very fast for n ≤ 12. Bitmask DP alternative: O(2<sup>n</sup>·n) time, O(2<sup>n</sup>) space — predictable.</p>`,
      followUps: ['Also return the actual list of transfers.', 'Switch to greedy automatically when n > 20.', 'Prove that a zero-sum group of k people never needs fewer than k − 1 transfers.']
    }
  });

  practice.push({
    title: 'Sold-Out Show Waitlist: Hand Released Seats to the Next User',
    level: 'Hard', tags: ['bookmyshow', 'concurrency', 'observer', 'queue'], companies: ['BookMyShow', 'Ticketmaster', 'District'],
    statement: `<p>A show is sold out. Users can join a <b>waitlist</b> asking for n seats. Whenever seats come back (a hold expires or a booking is cancelled), offer them to the waitlist in <b>strict FIFO</b> order: if the head wants n seats and at least n are free, hold n for them (10-minute hold) and notify them; repeat; stop when the head does not fit. Thread-safe. Notifications must <b>not</b> be sent while holding the lock.</p>`,
    constraints: `≤ 10<sup>4</sup> seats, ≤ 10<sup>5</sup> waitlist entries, many threads`,
    example: `<p>Free seats: none. Waitlist: Ravi(2), Meena(1), Zoya(3). Asha cancels 2 seats {B3, B4} → Ravi gets B3, B4 held → ${H.c('g', '"Ravi: 2 seats held"')}. Ben cancels {C1} → Meena gets C1. Dev cancels {D1, D2} → Zoya needs 3, only 2 free → ${H.c('y', 'nothing yet')} (strict FIFO, no skipping).</p>`,
    brute: { why: `<p>Naive: release seats to the open seat map and let whoever refreshes first grab them — unfair to people who waited. Another naive version sends the SMS/push inside the locked section: one slow notification provider blocks every booking for the show.</p>`, code: `class NaiveRelease {
    private final Set<String> free = new TreeSet<>();
    synchronized void release(Collection<String> seats) {
        free.addAll(seats);                                   // waitlist ignored: first refresher wins
        sendPushToEveryone("seats available!");               // slow I/O while holding the lock
    }
    private void sendPushToEveryone(String msg) { System.out.println(msg); }
}` },
    mcq: { q: 'Why collect notifications inside the lock but send them after unlocking?', options: ['So slow I/O never blocks other threads booking the same show', 'Because notifications must be sent in random order', 'Locks cannot call methods', 'To make the notification faster'], answer: 0, explain: 'Keep critical sections tiny: decide who gets what under the lock, do I/O outside it.' },
    hints: [`<p>Hint 1: state = a sorted set of free seats (<code>TreeSet</code>, <code>std::set</code>, or a heap plus a set), a FIFO queue <code>waitlist</code> of <code>Request(user, n)</code>, one lock per show.</p>`, `<p>Hint 2: <code>release(seats)</code>: lock → add seats to free → while head exists and head.n ≤ free.size(): poll n seats (pollFirst), record a hold and a pending notification → unlock → send notifications.</p>`, `<p>Hint 3: <code>request(user, n)</code>: if the waitlist is empty and n seats are free, hold immediately; otherwise join the queue (do not let newcomers jump ahead of waiters). Holds that expire call <code>release</code> again — one code path.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: '[]\n[]\n[]\nravi: 2 seats held [B3, B4]\nmeena: 1 seats held [C1]\n[]\nzoya: 3 seats held [D1, D2, D3]\nlate: 1 seats held [E1]\n[E2]\ncount must be positive\n' }] },
    solution: {
      approach: `<p>Per-show lock protecting free seats + FIFO waitlist; a single <code>drain()</code> step decides assignments; notifications are collected and published after unlocking (Observer).</p>`,
      code: `class WaitlistedShow {
    record Request(String user, int count) {}
    interface Notifier { void seatsHeld(String user, List<String> seats); }

    private final ReentrantLock lock = new ReentrantLock();
    private final TreeSet<String> free = new TreeSet<>();
    private final Deque<Request> waitlist = new ArrayDeque<>();
    private final Map<String, List<String>> holds = new HashMap<>();
    private final Notifier notifier;

    WaitlistedShow(Collection<String> initiallyFree, Notifier notifier) { free.addAll(initiallyFree); this.notifier = notifier; }

    /** Returns held seats, or an empty list if the user was put on the waitlist. */
    List<String> request(String user, int count) {
        if (count <= 0) throw new IllegalArgumentException("count must be positive");
        lock.lock();
        try {
            if (waitlist.isEmpty() && free.size() >= count) return holdFor(user, count);
            waitlist.addLast(new Request(user, count));
            return List.of();
        } finally {
            lock.unlock();
        }
    }

    /** Called on cancellation or hold expiry. */
    void release(Collection<String> seats) {
        Map<String, List<String>> toNotify = new LinkedHashMap<>();
        lock.lock();
        try {
            free.addAll(seats);
            while (!waitlist.isEmpty() && waitlist.peekFirst().count() <= free.size()) {
                Request r = waitlist.pollFirst();
                toNotify.put(r.user(), holdFor(r.user(), r.count()));
            }
        } finally {
            lock.unlock();
        }
        toNotify.forEach(notifier::seatsHeld);                 // I/O outside the lock
    }

    private List<String> holdFor(String user, int count) {    // caller holds the lock
        List<String> got = new ArrayList<>();
        for (int i = 0; i < count; i++) got.add(free.pollFirst());
        holds.computeIfAbsent(user, k -> new ArrayList<>()).addAll(got);
        return got;
    }
}

class WaitlistedShowDemo {
    public static void main(String[] args) {
        WaitlistedShow show = new WaitlistedShow(List.of(), (u, s) -> System.out.println(u + ": " + s.size() + " seats held " + s));
        System.out.println(show.request("ravi", 2));    // [] - nothing free, on the waitlist
        System.out.println(show.request("meena", 1));   // []
        System.out.println(show.request("zoya", 3));    // []
        show.release(List.of("B3", "B4"));      // ravi: 2 seats held [B3, B4]
        show.release(List.of("C1"));            // meena: 1 seats held [C1]
        show.release(List.of("D1", "D2"));      // zoya needs 3 -> waits, no message
        System.out.println(show.request("late", 1));   // [] - must queue behind zoya
        show.release(List.of("D3"));            // zoya: 3 seats held [D1, D2, D3]
        show.release(List.of("E1", "E2"));      // late: 1 seats held [E1]
        System.out.println(show.request("nina", 1));   // [E2] - nobody waiting, so she gets a seat at once
        try { show.request("bad", 0); } catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }
    }
}`,
      alt: [
        { lang: 'python', code: `import heapq
import threading
from collections import deque
from collections.abc import Callable, Iterable
from dataclasses import dataclass


@dataclass(frozen=True)
class Request:
    user: str
    count: int


Notifier = Callable[[str, list[str]], None]


class WaitlistedShow:
    def __init__(self, initially_free: Iterable[str], notifier: Notifier) -> None:
        self._lock = threading.Lock()
        self._free_heap: list[str] = []          # smallest seat id first (a sorted-set stand-in)
        self._free: set[str] = set()
        self._waitlist: deque[Request] = deque()
        self._holds: dict[str, list[str]] = {}
        self._notifier = notifier
        for s in initially_free:
            self._add_free(s)

    def _add_free(self, seat: str) -> None:
        if seat not in self._free:
            self._free.add(seat)
            heapq.heappush(self._free_heap, seat)

    def request(self, user: str, count: int) -> list[str]:
        """Returns held seats, or an empty list if the user was put on the waitlist."""
        if count <= 0:
            raise ValueError("count must be positive")
        with self._lock:
            if not self._waitlist and len(self._free) >= count:
                return self._hold_for(user, count)
            self._waitlist.append(Request(user, count))
            return []

    def release(self, seats: Iterable[str]) -> None:
        """Called on cancellation or hold expiry."""
        to_notify: dict[str, list[str]] = {}
        with self._lock:
            for s in seats:
                self._add_free(s)
            while self._waitlist and self._waitlist[0].count <= len(self._free):
                r = self._waitlist.popleft()
                to_notify[r.user] = self._hold_for(r.user, r.count)
        for user, held in to_notify.items():     # I/O outside the lock
            self._notifier(user, held)

    def _hold_for(self, user: str, count: int) -> list[str]:   # caller holds the lock
        got = []
        for _ in range(count):
            seat = heapq.heappop(self._free_heap)
            self._free.remove(seat)
            got.append(seat)
        self._holds.setdefault(user, []).extend(got)
        return got


def fmt(seats: list[str]) -> str:
    return "[" + ", ".join(seats) + "]"


if __name__ == "__main__":
    show = WaitlistedShow([], lambda u, s: print(f"{u}: {len(s)} seats held {fmt(s)}"))
    print(fmt(show.request("ravi", 2)))
    print(fmt(show.request("meena", 1)))
    print(fmt(show.request("zoya", 3)))
    show.release(["B3", "B4"])
    show.release(["C1"])
    show.release(["D1", "D2"])
    print(fmt(show.request("late", 1)))
    show.release(["D3"])
    show.release(["E1", "E2"])
    print(fmt(show.request("nina", 1)))
    try:
        show.request("bad", 0)
    except ValueError as e:
        print(e)` },
        { lang: 'ts', code: `interface Request { readonly user: string; readonly count: number }

type Notifier = (user: string, seats: string[]) => void;

class WaitlistedShow {
  private free: string[] = []; // kept sorted, smallest seat id first
  private readonly waitlist: Request[] = [];
  private readonly holds = new Map<string, string[]>();

  // Single-threaded: every method runs to completion, so no lock is needed. The notifier runs after
  // all state is updated, so a slow or re-entrant listener cannot see half-finished work.
  constructor(initiallyFree: Iterable<string>, private readonly notifier: Notifier) {
    for (const s of initiallyFree) this.addFree(s);
  }

  private addFree(seat: string): void {
    if (this.free.includes(seat)) return;
    this.free.push(seat);
    this.free.sort();
  }

  /** Returns held seats, or an empty list if the user was put on the waitlist. */
  request(user: string, count: number): string[] {
    if (count <= 0) throw new Error("count must be positive");
    if (this.waitlist.length === 0 && this.free.length >= count) return this.holdFor(user, count);
    this.waitlist.push({ user, count });
    return [];
  }

  /** Called on cancellation or hold expiry. */
  release(seats: Iterable<string>): void {
    const toNotify = new Map<string, string[]>();
    for (const s of seats) this.addFree(s);
    while (this.waitlist.length > 0 && this.waitlist[0].count <= this.free.length) {
      const r = this.waitlist.shift() as Request;
      toNotify.set(r.user, this.holdFor(r.user, r.count));
    }
    for (const [user, held] of toNotify) this.notifier(user, held);
  }

  private holdFor(user: string, count: number): string[] {
    const got = this.free.splice(0, count);
    this.holds.set(user, [...(this.holds.get(user) ?? []), ...got]);
    return got;
  }
}

const fmt = (seats: string[]): string => \`[\${seats.join(", ")}]\`;

const show = new WaitlistedShow([], (u, s) => console.log(\`\${u}: \${s.length} seats held \${fmt(s)}\`));
console.log(fmt(show.request("ravi", 2)));
console.log(fmt(show.request("meena", 1)));
console.log(fmt(show.request("zoya", 3)));
show.release(["B3", "B4"]);
show.release(["C1"]);
show.release(["D1", "D2"]);
console.log(fmt(show.request("late", 1)));
show.release(["D3"]);
show.release(["E1", "E2"]);
console.log(fmt(show.request("nina", 1)));
try {
  show.request("bad", 0);
} catch (e) {
  console.log((e as Error).message);
}` },
        { lang: 'cpp', code: `struct Request {
    string user;
    int count;
};

class WaitlistedShow {
public:
    using Notifier = function<void(const string&, const vector<string>&)>;

private:
    mutex lock;
    set<string> free;                              // smallest seat id first
    deque<Request> waitlist;
    map<string, vector<string>> holds;
    Notifier notifier;

    vector<string> holdFor(const string& user, int count) {   // caller holds the lock
        vector<string> got;
        for (int i = 0; i < count; i++) {
            got.push_back(*free.begin());
            free.erase(free.begin());
        }
        auto& mine = holds[user];
        mine.insert(mine.end(), got.begin(), got.end());
        return got;
    }

public:
    WaitlistedShow(const vector<string>& initiallyFree, Notifier notifier)
        : free(initiallyFree.begin(), initiallyFree.end()), notifier(move(notifier)) {}

    // Returns held seats, or an empty list if the user was put on the waitlist.
    vector<string> request(const string& user, int count) {
        if (count <= 0) throw invalid_argument("count must be positive");
        lock_guard<mutex> g(lock);
        if (waitlist.empty() && static_cast<int>(free.size()) >= count) return holdFor(user, count);
        waitlist.push_back({user, count});
        return {};
    }

    // Called on cancellation or hold expiry.
    void release(const vector<string>& seats) {
        vector<pair<string, vector<string>>> toNotify;
        {
            lock_guard<mutex> g(lock);
            free.insert(seats.begin(), seats.end());
            while (!waitlist.empty() && waitlist.front().count <= static_cast<int>(free.size())) {
                Request r = waitlist.front();
                waitlist.pop_front();
                toNotify.emplace_back(r.user, holdFor(r.user, r.count));
            }
        }
        for (const auto& [user, held] : toNotify) notifier(user, held);   // I/O outside the lock
    }
};

string fmt(const vector<string>& seats) {
    string s = "[";
    for (size_t i = 0; i < seats.size(); i++) s += (i ? ", " : "") + seats[i];
    return s + "]";
}

int main() {
    WaitlistedShow show({}, [](const string& u, const vector<string>& s) {
        cout << u << ": " << s.size() << " seats held " << fmt(s) << "\\n";
    });
    cout << fmt(show.request("ravi", 2)) << "\\n";
    cout << fmt(show.request("meena", 1)) << "\\n";
    cout << fmt(show.request("zoya", 3)) << "\\n";
    show.release({"B3", "B4"});
    show.release({"C1"});
    show.release({"D1", "D2"});
    cout << fmt(show.request("late", 1)) << "\\n";
    show.release({"D3"});
    show.release({"E1", "E2"});
    cout << fmt(show.request("nina", 1)) << "\\n";
    try {
        show.request("bad", 0);
    } catch (const invalid_argument& e) {
        cout << e.what() << "\\n";
    }
}` }
      ],
      complexity: `<p>request O(n log S); release O((r + assigned) log S) for r released seats; lock held only for in-memory work.</p>`,
      followUps: ['Allow "skip-ahead": serve later small requests when the head does not fit — discuss fairness vs utilisation.', 'Expire waitlist entries after 1 hour.', 'Prefer adjacent seats when assigning (combine with the best-block finder).']
    }
  });

  practice.push({
    title: 'All-or-Nothing Multi-Book Checkout Under Contention',
    level: 'Hard', tags: ['library', 'concurrency', 'deadlock', 'locks'], companies: ['Microsoft', 'Oracle', 'Atlassian'],
    statement: `<p>Self-service kiosks let a member check out several copies at once. Implement <code>checkoutAll(member, barcodes)</code>: either every copy becomes LOANED to the member (and the member stays within their limit) or nothing changes. Many kiosks run concurrently; two members may request overlapping copies in different orders. The design must be <b>deadlock-free</b>.</p>`,
    constraints: `≤ 10<sup>5</sup> copies, ≤ 10 copies per request, limit 5 per member, many threads`,
    example: `<p>Kiosk 1: Priya requests [BC-2, BC-1]; kiosk 2: Rahul requests [BC-1, BC-2] at the same instant. Locking in request order → Priya holds BC-2 waits for BC-1, Rahul holds BC-1 waits for BC-2 → ${H.c('r', 'deadlock')}. Sorted locking → both go for BC-1 first; one wins all, the other gets ${H.c('y', '"BC-1 not available"')} with nothing changed.</p>`,
    brute: { why: `<p>Naive: lock copies in the order the member scanned them. Two kiosks with opposite scan orders deadlock forever. The other naive fix — one global lock for the whole library — is correct but turns every kiosk into a single queue.</p>`, code: `class ScanOrderLocks {
    final Map<String, Object> locks = new ConcurrentHashMap<>();
    void checkoutAll(List<String> barcodes, Runnable work) {
        lockInOrder(barcodes, 0, work);                       // scan order: deadlock-prone
    }
    private void lockInOrder(List<String> b, int i, Runnable work) {
        if (i == b.size()) { work.run(); return; }
        synchronized (locks.computeIfAbsent(b.get(i), k -> new Object())) { lockInOrder(b, i + 1, work); }
    }
}` },
    mcq: { q: 'Which single change removes the possibility of deadlock between kiosks?', options: ['Acquire the copy locks in one global order (sorted by barcode)', 'Use fair locks', 'Add Thread.sleep between locks', 'Make the fields volatile'], answer: 0, explain: 'Deadlock needs a cycle in the wait-for graph; a global acquisition order makes a cycle impossible.' },
    hints: [`<p>Hint 1: one lock per copy (created lazily in a map) plus one per member, since the member's loan count is also shared state.</p>`, `<p>Hint 2: global order: member lock first, then copy locks sorted by barcode. Inside: check member limit + every copy AVAILABLE, then mark all LOANED. Unlock in reverse order in finally.</p>`, `<p>Hint 3: deduplicate barcodes; validate unknown barcodes before locking; consider <code>tryLock(timeout)</code> so a stuck kiosk returns "busy, try again" instead of waiting forever.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: 'OK [BC-1, BC-2]\nBC-2 not available\nunknown copy BC-9\nlimit 5 exceeded\nOK [BC-3]\nBC-2 not available\nOK [BC-4]\nBC-1 not available | OK [BC-1, BC-2]\n' }] },
    solution: {
      approach: `<p>Fine-grained locks with a total order (member → copies sorted) to rule out deadlock, two-phase check-then-commit inside the locked region, reverse unlock in finally.</p>`,
      code: `class KioskCheckout {
    static final int LIMIT = 5;
    private final Map<String, String> status = new ConcurrentHashMap<>();       // barcode -> AVAILABLE | LOANED:member
    private final Map<String, Integer> loans = new ConcurrentHashMap<>();       // member -> count
    private final Map<String, ReentrantLock> locks = new ConcurrentHashMap<>();

    void addCopy(String barcode) { status.put(barcode, "AVAILABLE"); }
    private ReentrantLock lockOf(String key) { return locks.computeIfAbsent(key, k -> new ReentrantLock()); }

    String checkoutAll(String member, List<String> barcodes) {
        List<String> sorted = new ArrayList<>(new TreeSet<>(barcodes));
        for (String b : sorted) if (!status.containsKey(b)) return "unknown copy " + b;
        List<ReentrantLock> held = new ArrayList<>();
        try {
            ReentrantLock m = lockOf("member:" + member);           // 1) member first
            m.lock();
            held.add(m);
            for (String b : sorted) {                               // 2) copies in sorted order
                ReentrantLock l = lockOf("copy:" + b);
                l.lock();
                held.add(l);
            }
            int current = loans.getOrDefault(member, 0);
            if (current + sorted.size() > LIMIT) return "limit " + LIMIT + " exceeded";
            for (String b : sorted) if (!status.get(b).equals("AVAILABLE")) return b + " not available";
            for (String b : sorted) status.put(b, "LOANED:" + member);   // commit
            loans.put(member, current + sorted.size());
            return "OK " + sorted;
        } finally {
            for (int i = held.size() - 1; i >= 0; i--) held.get(i).unlock();
        }
    }

    public static void main(String[] args) throws Exception {
        KioskCheckout desk = new KioskCheckout();
        for (int i = 1; i <= 6; i++) desk.addCopy("BC-" + i);
        System.out.println(desk.checkoutAll("priya", List.of("BC-2", "BC-1")));   // OK [BC-1, BC-2]
        System.out.println(desk.checkoutAll("rahul", List.of("BC-2")));           // BC-2 not available
        System.out.println(desk.checkoutAll("rahul", List.of("BC-9")));           // unknown copy BC-9
        System.out.println(desk.checkoutAll("priya", List.of("BC-3", "BC-4", "BC-5", "BC-6")));   // limit 5 exceeded: 2 + 4 > 5
        System.out.println(desk.checkoutAll("rahul", List.of("BC-3", "BC-3")));   // OK [BC-3]: a repeated barcode counts once
        System.out.println(desk.checkoutAll("rahul", List.of("BC-4", "BC-2")));   // BC-2 not available: BC-4 is NOT taken
        System.out.println(desk.checkoutAll("sam", List.of("BC-4")));             // OK [BC-4]

        // Opposite scan orders on two kiosks: sorted locking means no deadlock and exactly one winner.
        KioskCheckout lib = new KioskCheckout();
        for (int i = 1; i <= 4; i++) lib.addCopy("BC-" + i);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        CountDownLatch go = new CountDownLatch(1);
        Future<String> a = pool.submit(() -> { go.await(); return lib.checkoutAll("priya", List.of("BC-2", "BC-1")); });
        Future<String> b = pool.submit(() -> { go.await(); return lib.checkoutAll("rahul", List.of("BC-1", "BC-2")); });
        go.countDown();
        List<String> both = new ArrayList<>(List.of(a.get(), b.get()));
        Collections.sort(both);
        System.out.println(String.join(" | ", both));          // BC-1 not available | OK [BC-1, BC-2]
        pool.shutdown();
    }
}`,
      alt: [
        { lang: 'python', code: `import threading


class KioskCheckout:
    LIMIT = 5

    def __init__(self) -> None:
        self._status: dict[str, str] = {}              # barcode -> AVAILABLE | LOANED:member
        self._loans: dict[str, int] = {}               # member -> count
        self._locks: dict[str, threading.Lock] = {}
        self._locks_guard = threading.Lock()

    def add_copy(self, barcode: str) -> None:
        self._status[barcode] = "AVAILABLE"

    def _lock_of(self, key: str) -> threading.Lock:
        with self._locks_guard:
            return self._locks.setdefault(key, threading.Lock())

    def checkout_all(self, member: str, barcodes: list[str]) -> str:
        ordered = sorted(set(barcodes))
        for b in ordered:
            if b not in self._status:
                return f"unknown copy {b}"
        # 1) the member first, 2) copies in sorted order: every caller uses the same global order
        locks = [self._lock_of(f"member:{member}")] + [self._lock_of(f"copy:{b}") for b in ordered]
        for lock in locks:
            lock.acquire()
        try:
            current = self._loans.get(member, 0)
            if current + len(ordered) > self.LIMIT:
                return f"limit {self.LIMIT} exceeded"
            for b in ordered:
                if self._status[b] != "AVAILABLE":
                    return f"{b} not available"
            for b in ordered:                          # commit
                self._status[b] = f"LOANED:{member}"
            self._loans[member] = current + len(ordered)
            return "OK [" + ", ".join(ordered) + "]"
        finally:
            for lock in reversed(locks):
                lock.release()


if __name__ == "__main__":
    desk = KioskCheckout()
    for i in range(1, 7):
        desk.add_copy(f"BC-{i}")
    print(desk.checkout_all("priya", ["BC-2", "BC-1"]))
    print(desk.checkout_all("rahul", ["BC-2"]))
    print(desk.checkout_all("rahul", ["BC-9"]))
    print(desk.checkout_all("priya", ["BC-3", "BC-4", "BC-5", "BC-6"]))
    print(desk.checkout_all("rahul", ["BC-3", "BC-3"]))
    print(desk.checkout_all("rahul", ["BC-4", "BC-2"]))
    print(desk.checkout_all("sam", ["BC-4"]))

    # Opposite scan orders on two kiosks: sorted locking means no deadlock and exactly one winner.
    lib = KioskCheckout()
    for i in range(1, 5):
        lib.add_copy(f"BC-{i}")
    answers: dict[str, str] = {}
    go = threading.Event()

    def kiosk(member: str, scan: list[str]) -> None:
        go.wait()
        answers[member] = lib.checkout_all(member, scan)

    pool = [threading.Thread(target=kiosk, args=("priya", ["BC-2", "BC-1"])),
            threading.Thread(target=kiosk, args=("rahul", ["BC-1", "BC-2"]))]
    for t in pool:
        t.start()
    go.set()
    for t in pool:
        t.join()
    print(" | ".join(sorted(answers.values())))` },
        { lang: 'ts', code: `class KioskCheckout {
  static readonly LIMIT = 5;
  private readonly status = new Map<string, string>(); // barcode -> AVAILABLE | LOANED:member
  private readonly loans = new Map<string, number>(); // member -> count

  addCopy(barcode: string): void { this.status.set(barcode, "AVAILABLE"); }

  // No locks: the whole method runs without an await, so no other call can interleave with it.
  // (With Worker threads you would need Atomics or a single owner thread for this state.)
  checkoutAll(member: string, barcodes: readonly string[]): string {
    const ordered = [...new Set(barcodes)].sort();
    for (const b of ordered) if (!this.status.has(b)) return \`unknown copy \${b}\`;
    const current = this.loans.get(member) ?? 0;
    if (current + ordered.length > KioskCheckout.LIMIT) return \`limit \${KioskCheckout.LIMIT} exceeded\`;
    for (const b of ordered) if (this.status.get(b) !== "AVAILABLE") return \`\${b} not available\`;
    for (const b of ordered) this.status.set(b, \`LOANED:\${member}\`); // commit
    this.loans.set(member, current + ordered.length);
    return \`OK [\${ordered.join(", ")}]\`;
  }
}

const desk = new KioskCheckout();
for (let i = 1; i <= 6; i++) desk.addCopy(\`BC-\${i}\`);
console.log(desk.checkoutAll("priya", ["BC-2", "BC-1"]));
console.log(desk.checkoutAll("rahul", ["BC-2"]));
console.log(desk.checkoutAll("rahul", ["BC-9"]));
console.log(desk.checkoutAll("priya", ["BC-3", "BC-4", "BC-5", "BC-6"]));
console.log(desk.checkoutAll("rahul", ["BC-3", "BC-3"]));
console.log(desk.checkoutAll("rahul", ["BC-4", "BC-2"]));
console.log(desk.checkoutAll("sam", ["BC-4"]));

// Two kiosks with opposite scan orders: whichever call runs first wins, the other is refused cleanly.
const lib = new KioskCheckout();
for (let i = 1; i <= 4; i++) lib.addCopy(\`BC-\${i}\`);
const answers = [lib.checkoutAll("priya", ["BC-2", "BC-1"]), lib.checkoutAll("rahul", ["BC-1", "BC-2"])];
console.log(answers.sort().join(" | "));` },
        { lang: 'cpp', code: `class KioskCheckout {
    static constexpr int LIMIT = 5;
    mutex guard;                                       // protects the maps' structure only
    map<string, string> status;                        // barcode -> AVAILABLE | LOANED:member
    map<string, int> loans;                            // member -> count
    map<string, unique_ptr<mutex>> locks;

    mutex& lockOf(const string& key) {
        lock_guard<mutex> g(guard);
        auto& slot = locks[key];
        if (!slot) slot = make_unique<mutex>();
        return *slot;
    }
    string& statusOf(const string& barcode) { lock_guard<mutex> g(guard); return status.at(barcode); }
    int& loansOf(const string& member) { lock_guard<mutex> g(guard); return loans[member]; }
    bool known(const string& barcode) { lock_guard<mutex> g(guard); return status.count(barcode) > 0; }

public:
    void addCopy(const string& barcode) { lock_guard<mutex> g(guard); status[barcode] = "AVAILABLE"; }

    string checkoutAll(const string& member, const vector<string>& barcodes) {
        set<string> ordered(barcodes.begin(), barcodes.end());      // unique and sorted: the global lock order
        for (const auto& b : ordered)
            if (!known(b)) return "unknown copy " + b;
        // 1) the member first, 2) copies in sorted order; every lock is released on scope exit (RAII)
        vector<unique_lock<mutex>> held;
        held.emplace_back(lockOf("member:" + member));
        for (const auto& b : ordered) held.emplace_back(lockOf("copy:" + b));
        int& current = loansOf(member);
        if (current + static_cast<int>(ordered.size()) > LIMIT) return "limit " + to_string(LIMIT) + " exceeded";
        for (const auto& b : ordered)
            if (statusOf(b) != "AVAILABLE") return b + " not available";
        string result = "OK [";
        for (const auto& b : ordered) {                              // commit
            statusOf(b) = "LOANED:" + member;
            result += (result.size() > 4 ? ", " : "") + b;
        }
        current += ordered.size();
        return result + "]";
    }
};

int main() {
    KioskCheckout desk;
    for (int i = 1; i <= 6; i++) desk.addCopy("BC-" + to_string(i));
    cout << desk.checkoutAll("priya", {"BC-2", "BC-1"}) << "\\n";
    cout << desk.checkoutAll("rahul", {"BC-2"}) << "\\n";
    cout << desk.checkoutAll("rahul", {"BC-9"}) << "\\n";
    cout << desk.checkoutAll("priya", {"BC-3", "BC-4", "BC-5", "BC-6"}) << "\\n";
    cout << desk.checkoutAll("rahul", {"BC-3", "BC-3"}) << "\\n";
    cout << desk.checkoutAll("rahul", {"BC-4", "BC-2"}) << "\\n";
    cout << desk.checkoutAll("sam", {"BC-4"}) << "\\n";

    // Opposite scan orders on two kiosks: sorted locking means no deadlock and exactly one winner.
    KioskCheckout lib;
    for (int i = 1; i <= 4; i++) lib.addCopy("BC-" + to_string(i));
    vector<string> answers(2);
    latch go(1);
    {
        jthread a([&] { go.wait(); answers[0] = lib.checkoutAll("priya", {"BC-2", "BC-1"}); });
        jthread b([&] { go.wait(); answers[1] = lib.checkoutAll("rahul", {"BC-1", "BC-2"}); });
        go.count_down();
    }
    sort(answers.begin(), answers.end());
    cout << answers[0] << " | " << answers[1] << "\\n";
}` }
      ],
      complexity: `<p>O(k log k) per request for k copies; lock hold time is a few map operations. No deadlock (total lock order); independent requests run in parallel.</p>`,
      followUps: ['Use tryLock with a timeout and return "busy" instead of blocking.', 'Do it in SQL: SELECT ... ORDER BY barcode FOR UPDATE.', 'Allow partial success when the member opts in ("give me whatever is available").']
    }
  });

  /* ======================= QUIZ ======================= */
  quiz.push(
    { q: 'In BookMyShow, where should the AVAILABLE / HELD / BOOKED status live?', options: ['On ShowSeat (a seat inside one show)', 'On Seat (the physical chair)', 'On Screen', 'On Movie'], answer: 0, explain: 'The same chair is sold separately for every show, so status must be per (show, seat). A Seat-level status breaks as soon as a screen runs two shows.' },
    { q: 'Two threads run <code>if (seat.status == AVAILABLE) seat.status = BOOKED;</code> at the same time. What is the bug called?', options: ['A check-then-act race condition', 'A deadlock', 'A memory leak', 'Starvation'], answer: 0, explain: 'Both can pass the check before either acts. The check and the write must be one atomic step (lock, CAS, or conditional UPDATE).' },
    { q: 'Why is "one lock per show" usually better than one lock (or synchronized method) for the whole booking service?', options: ['Bookings for different shows no longer wait for each other', 'It is the only way to make code compile', 'It works across many servers automatically', 'It removes the need for hold expiry'], answer: 0, explain: 'Contention is per show; a global lock serialises unrelated shows. Neither version is distributed — that needs a DB or Redis.' },
    { q: 'A seat hold expired 2 minutes ago and no sweeper has run yet. Ben asks for that seat. Correct behaviour?', options: ['Treat the expired hold as free and let Ben hold it (lazy expiry)', 'Reject Ben until the sweeper runs', 'Extend the old hold by 10 minutes', 'Throw an exception'], answer: 0, explain: 'Correctness must never depend on a background job; any reader treats holdUntil in the past as free.' },
    { q: 'With per-seat locks, Asha locks B4 then B5 while Ben locks B5 then B4. How do you prevent the resulting deadlock?', options: ['Acquire seat locks in a global sorted order', 'Use volatile fields', 'Increase the thread pool size', 'Catch the exception and retry'], answer: 0, explain: 'A global acquisition order makes a cycle in the wait-for graph impossible.' },
    { q: '₹100 split equally among 3 people in paise. Which result is correct?', options: ['3334, 3333, 3333', '3333, 3333, 3333', '3333.33 each (double)', '3334, 3334, 3333'], answer: 0, explain: 'Shares must sum to exactly 10000 paise; the 1 leftover paisa goes to one person.' },
    { q: 'Asha pays ₹900 split equally among Asha, Ben and Chen. What does the balance sheet record?', options: ['Ben owes Asha 300 and Chen owes Asha 300', 'Everyone owes Asha 300 including Asha', 'Ben and Chen owe Asha 450 each', 'Asha owes Ben and Chen 300 each'], answer: 0, explain: 'Each participant other than the payer owes the payer their share; Asha\'s own share creates no debt.' },
    { q: 'Greedy debt simplification (largest debtor pays largest creditor) on n people with non-zero balances uses at most how many transfers?', options: ['n − 1', 'n', 'n²', 'log n'], answer: 0, explain: 'Every step zeroes at least one person, and the final step zeroes two.' },
    { q: 'Is greedy debt simplification always optimal?', options: ['No — e.g. nets +4, +3, −2, −2, −3 need 3 transfers but greedy makes 4', 'Yes, always', 'Only when amounts are even', 'Only for 3 people'], answer: 0, explain: 'The exact problem (max number of zero-sum groups) is NP-hard; greedy is a fast approximation.' },
    { q: 'Why separate Book and BookItem in a library design?', options: ['A title has many physical copies, each with its own barcode, shelf, status and loan history', 'The language does not allow two fields in one class', 'To make search slower', 'Because ISBNs are not unique'], answer: 0, explain: 'A copy counter cannot tell you which copy is lost, damaged or with which member.' },
    { q: 'A returned copy has three people on the title\'s waitlist. What happens to the copy?', options: ['It becomes ON_HOLD for the first waiter with a pickup deadline, and they are notified', 'It goes back on the open shelf', 'It is loaned automatically to all three', 'It stays LOANED to the previous member'], answer: 0, explain: 'FIFO reservation queue + hold with expiry + Observer notification.' },
    { q: 'Adding "reference books cannot be borrowed" to a well-designed checkout should require…', options: ['A new LendingRule class registered in the rule list', 'Editing the if-else ladder in checkout()', 'Changing the Member class', 'A new database'], answer: 0, explain: 'Rules as objects keep checkout closed for modification and open for extension.' },
    { q: 'A payment webhook arrives after the seat hold expired and another user now holds the seats. What should the system do?', options: ['Refund the first user and mark the booking EXPIRED', 'Take the seats back from the second user', 'Confirm both bookings', 'Ignore the webhook and keep the money'], answer: 0, explain: 'confirm() must verify the hold is still yours and alive; otherwise refund. Never steal a valid hold.' }
  );

  /* ======================= INTERVIEW Q&A ======================= */
  interview.push(
    { q: 'Walk me through how you would start a "Design BookMyShow" machine-coding round.', level: 'I', a: `<p>First 5 minutes: <b>clarify</b> scope out loud — search by city, list shows, seat map, hold seats for N minutes, pay, confirm, cancel; non-functional: never double-sell, holds expire, high contention at release. Then list <b>entities</b> and split catalogue (Movie, Theatre, Screen, Seat) from inventory (Show, ShowSeat, Booking). Draw relationships, then define service APIs (<code>start(user, show, seats)</code>, <code>pay(bookingId)</code>). Choose patterns: SeatLockProvider interface (DIP), PricingStrategy, PaymentGateway interface, Observer for notifications. Then write code for the hardest part — the concurrent hold/confirm — and finish with extensions (concerts, waitlist, distributed locking).</p>`, followUps: ['Which part would you code first if you only had 45 minutes?', 'What would you leave out of scope and why?'] },
    { q: 'Why do you need a ShowSeat class? Isn\'t Seat enough?', level: 'B', a: `<p>A Seat is a physical chair and exists once. A screen runs several shows per day, and the same chair has a different status (and often price) in each show. If status lived on Seat, booking B4 for 6 pm would make B4 look booked for 9 am and 10 pm too. ShowSeat = (Show, Seat, status, price, heldBy, holdExpiresAt) is the unit of inventory we sell. In a database it is the <code>show_seat</code> table with primary key (show_id, seat_id) — and it is where all the concurrency control focuses.</p>`, followUps: ['How many ShowSeat rows does a year of shows create? Is that a problem?', 'Would you create them eagerly or lazily?'] },
    { q: 'How do you guarantee that two users never book the same seat?', level: 'A', a: `<p>Name the invariant: for every (show, seat) at most one live owner. Make "check free + mark HELD" atomic. In memory: a per-show lock (<code>ReentrantLock</code>, <code>std::mutex</code>, <code>threading.Lock</code>), check <b>all</b> requested seats, then take all, unlock in <code>finally</code>; or per-seat CAS with roll-back. In a DB: conditional update <code>UPDATE show_seat SET status='HELD', held_by=? WHERE show_id=? AND seat_id IN (...) AND status='AVAILABLE'</code> and check the affected row count, or <code>SELECT ... FOR UPDATE</code> in sorted order. With many servers, Redis <code>SET NX PX</code> (Lua for multi-seat) with a fencing token. Plus a unique constraint on confirmed bookings as the last safety net. Payment happens <b>after</b> the hold, outside any lock.</p>`, followUps: ['What happens if the server pauses (GC) for 30 seconds after holding?', 'Optimistic or pessimistic for a blockbuster release?'] },
    { q: 'How do seat holds expire? Do you need a background thread?', level: 'I', a: `<p>Store <code>holdUntil</code> on the seat. <b>Lazy expiry</b>: whenever anyone checks a seat, a HELD seat with holdUntil in the past counts as free — correctness needs no background thread. A <b>sweeper</b> (a scheduled task every ~30 s, or a DB job) only tidies the seat map so users see seats turn green sooner and can trigger waitlist offers. In Redis, the key TTL is the expiry. Always inject a clock so tests can fast-forward time instead of sleeping.</p>`, followUps: ['What happens to a confirm() call that arrives 1 second after expiry?', 'How do you notify waitlisted users when a hold expires?'] },
    { q: 'The payment succeeded but the hold expired before confirmation. What do you do?', level: 'A', a: `<p><code>confirm()</code> re-checks under the lock that every seat is still HELD by this user and not expired. If not, the booking moves to EXPIRED and we <b>refund</b> using the same idempotency key, then notify the user. We never "steal" seats back from someone who legitimately holds them now. To reduce this case: keep holds long enough for typical payments (8–10 min), extend the hold when the gateway reports "payment in progress", and make the webhook handler idempotent so retries cannot double-confirm or double-refund.</p>`, followUps: ['How does an idempotency key work with a payment gateway?', 'Could you confirm first and then charge?'] },
    { q: 'Design the Splitwise data model. How do you store balances?', level: 'I', a: `<p>Entities: User, Group, Expense (immutable: payer, total in paise, type, list of Split(user, paise)), SplitStrategy (Equal/Exact/Percent/Shares) and a BalanceSheet per group. The expense list is the source of truth; balances are a derived, incrementally-updated view. I keep <b>pairwise</b> balances with a canonical key (min user, max user) and a signed amount — one number per pair, automatically netted — and derive <b>net</b> per user (Σ = 0) for simplification. Edits apply the old expense with sign −1 and the new with +1; deletes apply −1. Money is <code>long</code> paise with largest-remainder rounding.</p>`, followUps: ['How would you support multiple currencies?', 'How do you rebuild balances after a bug?'] },
    { q: 'Why not use double for money? What do you use instead?', level: 'B', a: `<p>Binary floating point cannot represent most decimal fractions exactly: 0.1 + 0.2 = 0.30000000000000004, and ₹100/3 rounded three times gives ₹99.99. Errors accumulate and balances stop summing to zero. Use integer minor units (a 64-bit integer of paise) or a decimal type with an explicit scale and rounding mode (never build it from a binary float such as <code>new BigDecimal(0.1)</code>; use strings or integers). When splitting, compute floor shares and distribute the leftover units deterministically so the parts add up exactly.</p>`, followUps: ['How do you split ₹100 in ratio 1:1:1 exactly?', 'Where would a decimal type be preferable to integer paise?'] },
    { q: 'Explain debt simplification and its complexity.', level: 'A', a: `<p>First collapse all debts into one net balance per person — only nets matter. Greedy: max-heap of creditors, max-heap of debtors; the biggest debtor pays the biggest creditor min(c, d); push back remainders. Each step zeroes at least one person, so ≤ n − 1 transfers in O(n log n). It is not always optimal: the true minimum is n minus the maximum number of disjoint zero-sum subsets, an NP-hard partition-style problem, solvable exactly for small n with bitmask DP in O(2<sup>n</sup>·n) or pruned backtracking. Product-wise, simplification can make you pay a stranger, so it is a per-group toggle.</p>`, followUps: ['Give a counterexample where greedy is not optimal.', 'How would you restrict settlements to existing relationships?'] },
    { q: 'How do you add a new split type, e.g. "split by items on the bill"?', level: 'I', a: `<p>Add <code>ItemSplit implements SplitStrategy</code>: it takes item prices and who shared each item, splits each item equally among its sharers (exact paise), adds tax/tip proportionally, then sums per user and verifies the total equals the bill. Register it in the strategy map (a map from split type to strategy, or a registry). ExpenseService, Expense and BalanceSheet do not change — that is the Open/Closed principle paying off. The validation logic lives inside the strategy, so each type owns its rules.</p>`, followUps: ['Where does tax and tip rounding go?', 'How would the API accept the extra input?'] },
    { q: 'Library: walk me through checkout, including failures.', level: 'I', a: `<p>Look up member and copy (by barcode). Run ordered lending rules, each a small class: member active, below the type\'s loan limit, unpaid fines ≤ threshold, copy AVAILABLE or ON_HOLD for this member with a live hold, not a reference book. The first violation returns a reason and <b>nothing</b> changes. Only after all pass: copy → LOANED (via the state machine), create Loan(item, member, issuedOn, dueOn = today + loanDays), add to the member\'s active loans, and clear any hold. Concurrency: lock member then copy (fixed order) or a DB conditional update on the copy status.</p>`, followUps: ['How do you make it all-or-nothing for multiple books?', 'Where do holidays come into the due date?'] },
    { q: 'How do reservations work when a book is returned?', level: 'I', a: `<p>Reservations are per <b>title</b> (ISBN), FIFO. On return, <code>copyFreed(copy)</code> checks the queue: if empty → AVAILABLE; else the copy goes ON_HOLD for the first waiter with <code>holdUntil = today + 3</code>, and HoldListeners (SMS, email, push) are notified — Observer, ideally via an event queue so slow providers never block the desk. If the hold expires, the same <code>copyFreed</code> path passes it to the next waiter. While anyone is waiting, renewals of that title are refused so the queue moves.</p>`, followUps: ['What if the first waiter has unpaid fines?', 'Should two returned copies serve two waiters at once?'] },
    { q: 'How would you model fines so that rules can change easily?', level: 'I', a: `<p>A <code>FinePolicy</code> strategy: <code>long fine(long daysLate, Copy copy, Member m)</code>. Implementations: FlatFine, TieredCappedFine (₹2/day for 7 days, then ₹5/day, capped at the book price), LostBookFine. Variations stack as decorators (FacultyHalfPrice, HolidayWaiver). Late days are computed as differences of calendar-date day counts. Fines are recorded as ledger entries (charged, waived with reason, paid) rather than one mutable number, so audits and disputes are easy.</p>`, followUps: ['How would you compute late days skipping holidays?', 'Who may waive a fine and how is it recorded?'] },
    { q: 'What design patterns appear across these three case studies?', level: 'A', a: `<p><b>Strategy</b>: pricing, split types, settlement algorithms, fine policies, refund policies. <b>Observer</b>: booking confirmations, waitlist offers, hold notifications. <b>State / transition tables</b>: booking status, seat status, copy status. <b>Facade</b>: BookingService, ExpenseService, LibraryService hiding orchestration. <b>Decorator</b>: stacking price or fine adjustments. <b>Chain of responsibility / specification</b>: lending rules. <b>Dependency Inversion</b>: SeatLockProvider, PaymentGateway and a clock behind interfaces for testability. <b>Repository</b>: persistence behind interfaces. The common thread: isolate what changes (rules, algorithms, infrastructure) behind interfaces.</p>`, followUps: ['Which pattern would you remove if you had only 45 minutes?', 'Where can over-engineering hurt in a machine-coding round?'] },
    { q: 'How do you test a concurrent booking service?', level: 'E', a: `<p>(1) Deterministic unit tests with an injected clock for hold, confirm, expiry, late webhook, release. (2) Stress tests: N threads released together by a start gate requesting overlapping seats, thousands of rounds, then assert invariants: no seat with two owners, every successful request owns all its seats, failed requests own none. (3) Interleaving tools such as jcstress (JVM), ThreadSanitizer (C++) or controlled schedulers for specific races. (4) For DB-backed versions, run the same tests against a real database with parallel transactions. Invariant-based assertions catch bugs that example-based tests miss.</p>`, followUps: ['Why do stress tests sometimes pass even when code is racy?', 'How would you test the distributed (Redis) version?'] },
    { q: 'How does your in-memory BookMyShow design change when you run 50 app servers?', level: 'E', a: `<p>JVM locks protect nothing across servers, so the seat state moves to a shared store. Option A: the database is the source of truth — conditional updates or <code>FOR UPDATE</code> in sorted seat order, a hold_expires_at column, unique constraint on confirmed seats. Option B: Redis per-seat keys with <code>SET NX PX</code> (Lua script for multi-seat atomicity) as the hold layer, DB for confirmed bookings, fencing tokens checked at confirm. Option C: partition shows so each show is owned by exactly one node (actor per show); then in-memory locking is valid again, with failover. Add a virtual waiting room for mega-releases, and idempotency keys end to end.</p>`, followUps: ['What is a fencing token and why is a Redis lock alone not enough?', 'How do you rebalance show ownership when a node dies?'] }
  );

  registerModule({
    id: 'lld08',
    title: 'Case Studies: BookMyShow, Splitwise, Library Management',
    intro: `<p>This module is three full machine-coding case studies, the kind you get in a 60–90 minute LLD round at Flipkart, Uber, Atlassian, PhonePe or Amazon. For each one we go <b>requirements → entities → class diagram → core code → the hard part → extensions</b>:</p>
<ul>
<li><b>BookMyShow</b> — the Seat vs ShowSeat split, and <b>concurrent seat booking</b> done right: lock → hold (with expiry) → confirm, all-or-nothing, late payment callbacks, per-show locks, CAS and database versions.</li>
<li><b>Splitwise</b> — split strategies (equal, exact, percent, shares) with exact paise, a self-netting balance sheet, and <b>debt simplification</b> (greedy with heaps, why it is not always optimal, and the exact bitmask DP).</li>
<li><b>Library Management</b> — Book vs BookItem, catalog search, checkout/return/renew, lending rules as objects, fine strategies, reservations with pickup windows, and a copy state machine.</li>
</ul>
<p>Every topic has step-by-step visualizers (class diagrams growing box by box, a seat map where two users race, live balance tables, before/after debt graphs, the library checkout flow) and every design starts with the <b>naive version and exactly why it breaks</b>.</p>`,
    goals: [
      'Turn a vague product ("design BookMyShow / Splitwise / a library") into entities, relationships, services and a clean class diagram in under 15 minutes',
      'Implement concurrency-safe, all-or-nothing seat holds with expiry, and explain lock vs CAS vs database vs distributed options',
      'Split money exactly in paise, keep a self-netting balance sheet, and simplify debts with a greedy heap algorithm — and explain why the exact version is NP-hard',
      'Model lending rules, fines, reservations and item states so that each new business rule is a new class, not another if-else',
      'Use Strategy, Observer, Decorator, State tables and Dependency Inversion where they genuinely help, and defend each choice in an interview'
    ],
    prereqs: `LLD 1 (OOP Modelling &amp; UML), LLD 2 (SOLID), LLD 4–6 (Creational, Structural, Behavioral patterns) and LLD 7 (Interview Framework: Parking Lot &amp; Tic-Tac-Toe). Comfort with Java collections, <code>java.time</code>, and basic threads/locks (Java track concurrency module) helps for the booking topics.`,
    hours: 16,
    langNotes: {
      java: `<p><b>Interfaces and functional rules.</b> <code>SeatLockProvider</code>, <code>PaymentGateway</code>, <code>PricingStrategy</code> and <code>FinePolicy</code> are interfaces so tests pass fakes and Redis can replace memory later. A one-method interface such as <code>LendingRule</code> is also a lambda target, which is why the rule list can hold both classes and lambdas. Put <code>@Override</code> on every implementation. <b>Value objects.</b> Use <code>record</code> for <code>Split</code>, <code>Transfer</code>, <code>HoldResult</code> and <code>Loan</code>: <code>equals</code>, <code>hashCode</code> and <code>toString</code> come for free, and <code>List.copyOf</code> in constructors keeps them immutable. Entities with identity (<code>Show</code>, <code>BookItem</code>, <code>Member</code>) stay plain classes keyed by id. <b>Money and time.</b> <code>long</code> paise, never <code>double</code>; <code>int</code> overflows silently at about 2.1 billion. Use <code>LocalDate</code> and <code>toEpochDay()</code> for due dates, <code>Instant</code> for show times, and an injected <code>Clock</code> for expiry. <b>Concurrency.</b> Lock with <code>ReentrantLock</code> and always <code>unlock()</code> in <code>finally</code>; build per-show locks with <code>ConcurrentHashMap.computeIfAbsent</code> (get-then-put is two steps). <code>AtomicReference</code> and <code>AtomicIntegerArray</code> give compare-and-set; swap whole immutable snapshots, not fields. <b>Collections.</b> <code>PriorityQueue</code> is a min-heap (pass a comparator for max); <code>TreeMap.floorEntry</code> finds the interval before a start time; <code>EnumMap</code> and <code>EnumSet</code> hold the state-transition table.</p>`,
      python: `<p><b>Interfaces and rules.</b> Use <code>abc.ABC</code> with <code>@abstractmethod</code> for nominal interfaces (<code>SeatLockProvider</code>, <code>FinePolicy</code>), and <code>typing.Protocol</code> when any object with the right method should fit (<code>Pricing</code>, <code>RefundPolicy</code>). A one-method rule is just a <code>Callable</code>, so <code>LendingRule</code> becomes a function that returns a reason or <code>None</code>. <b>Value objects.</b> <code>@dataclass(frozen=True)</code> generates <code>__eq__</code> and <code>__hash__</code> for <code>Split</code>, <code>Transfer</code> and <code>Exp</code>; use a plain <code>@dataclass(eq=False)</code> for entities with identity so two copies are never "equal" by accident. <b>Enums.</b> <code>Enum</code> members can carry data (<code>MemberType.STUDENT = (5, 14)</code>); keep the state-transition table as a <code>dict[State, set[State]]</code>. <b>Money and time.</b> Integers never overflow, but money is still an <code>int</code> of paise, never a <code>float</code>. Use <code>datetime.date</code> subtraction (<code>(b - a).days</code>) for late days and a fixed <code>timezone(timedelta(hours=5, minutes=30))</code> for India, which has no daylight saving. <b>Concurrency.</b> The GIL does not make check-then-act atomic: hold a <code>threading.Lock</code> in a <code>with</code> block. There are no atomic integers, so compare-and-set is emulated with a lock around the compare and the write. <b>Collections.</b> <code>heapq</code> is a min-heap (store negated amounts for a max-heap); there is no sorted map or set in the standard library, so use <code>bisect</code> on a sorted list, or a heap plus a set; <code>sorted(range(n), key=lambda i: (-remainder[i], i))</code> gives the largest-remainder order with a stable tie-break.</p>`,
      js: `<p><b>TypeScript.</b> <b>Interfaces and unions.</b> An <code>interface</code> is erased at run time and types are structural, so any object with the right methods is a valid <code>PaymentGateway</code> or <code>PricingStrategy</code> (a fake can be an object literal). A rule is just a function type. Model results as a discriminated union (<code>{ ok: true; newDue } | { ok: false; reason }</code>) and states as a union of string literals; <code>Record&lt;State, readonly State[]&gt;</code> is the transition table. Turn on <code>strict</code> and <code>noImplicitOverride</code>. <b>Equality and immutability.</b> <code>===</code> and <code>Map</code> keys compare objects by identity, so key everything by string id and give value objects (<code>Split</code>, <code>Transfer</code>) plain fields; <code>readonly</code> exists only at compile time, so copy arrays in constructors. <b>Money and time.</b> <code>Number</code> is exact up to 2^53, plenty for paise, but there is no integer division: use <code>Math.floor(a / b)</code>. <code>Date.UTC</code> months are 0-based; count days as epoch milliseconds divided by 86,400,000. <b>Concurrency.</b> JavaScript runs one call at a time, so a method with no <code>await</code> between its check and its act is already atomic. Once an <code>await</code> sits inside the critical section (a payment call, I/O) you need a real mutex, a promise queue like the one in the ordered-lock example. Truly parallel code uses Worker threads with a <code>SharedArrayBuffer</code> and <code>Atomics.compareExchange</code>. <b>Collections.</b> There is no built-in heap: the greedy settlement uses a small <code>Heap</code> class with a comparator. <code>Array.prototype.sort</code> compares strings unless you pass a comparator; <code>Map</code> keeps insertion order, so sort keys when output must be deterministic.</p>`,
      cpp: `<p><b>Interfaces and ownership.</b> An interface is a class of pure virtual functions with a <b>virtual destructor</b>; mark implementations <code>override</code>. Decorators such as <code>FacultyHalfPrice</code> and <code>WeekendSurge</code> <b>own</b> what they wrap through a <code>std::unique_ptr</code>, while a service that only uses a collaborator (<code>BookingService</code> and its lock provider) takes a reference owned by the composition root in <code>main</code>. Use <code>std::shared_ptr</code> only when several owners really exist. Never pass a polymorphic object by value: it slices. Names such as <code>register</code>, <code>delete</code> and <code>default</code> are C++ keywords, so the rule-registering method is <code>registerRule</code>. <b>Value types.</b> Plain structs (<code>Split</code>, <code>Transfer</code>, <code>Loan</code>) copy cheaply; define <code>operator==</code> (or <code>= default</code> with <code>&lt;=&gt;</code>) when equality matters, and a <code>std::hash</code> specialisation before using one as an <code>unordered_map</code> key. <b>Money and time.</b> Signed overflow is undefined behaviour: use <code>long long</code> for paise, never <code>double</code>. <code>std::chrono::sys_days</code> subtracts to a day count and <code>sys_seconds</code> holds an instant, with no time zone library needed for a fixed offset. <b>Concurrency.</b> <code>std::lock_guard</code> and <code>std::unique_lock</code> release the mutex on every exit path (RAII). A <code>std::mutex</code> cannot be copied or moved, so keep per-show locks as <code>unique_ptr&lt;std::mutex&gt;</code> inside a map guarded by its own mutex. Compare-and-set is <code>compare_exchange_strong</code> on a <code>std::atomic</code>; for an immutable snapshot use <code>std::atomic&lt;std::shared_ptr&lt;const T&gt;&gt;</code>. Writing to a plain container from two threads is a data race even for different keys, because the container can rehash or rebalance. <b>Collections.</b> <code>std::priority_queue</code> is a max-heap (flip the comparator for a min-heap); <code>std::map</code> is ordered, so the "floor entry" is <code>prev(upper_bound(x))</code>; <code>std::variant</code> carries "a loan or a reason".</p>`
    },
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
