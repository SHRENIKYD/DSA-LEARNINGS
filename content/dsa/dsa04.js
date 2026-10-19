(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  // ---------- small shared helpers for the visualizers ----------
  function toInt(s, lo, hi, what) {
    var t = String(s === undefined || s === null ? '' : s).trim();
    if (!/^-?\d+$/.test(t)) throw new Error('Please type ' + what + ': one whole number between ' + lo + ' and ' + hi + '.');
    var v = parseInt(t, 10);
    if (v < lo || v > hi) throw new Error('The number must be between ' + lo + ' and ' + hi + ' so the switches fit on screen.');
    return v;
  }
  function toList(s, lo, hi, maxLen, what) {
    var t = String(s === undefined || s === null ? '' : s).trim();
    if (!t) throw new Error('Please type ' + what + ' separated by spaces.');
    var parts = t.split(/[\s,]+/);
    if (parts.length > maxLen) throw new Error('Please use at most ' + maxLen + ' numbers so the animation stays readable.');
    return parts.map(function (p) {
      if (!/^-?\d+$/.test(p)) throw new Error('"' + p + '" is not a whole number. Type ' + what + ' separated by spaces.');
      var v = parseInt(p, 10);
      if (v < lo || v > hi) throw new Error('Each number must be between ' + lo + ' and ' + hi + '.');
      return v;
    });
  }
  function one(k, cls) { var h = {}; h[k] = cls; return h; }
  function bin(v, w) {
    return w >= 32 ? (v >>> 0).toString(2).padStart(32, '0') : ((v & ((1 << w) - 1)) >>> 0).toString(2).padStart(w, '0');
  }
  function bitLen(v) { return v <= 0 ? 1 : v.toString(2).length; }
  function popcount(v) { var c = 0; while (v) { v &= v - 1; c++; } return c; }
  function diffHl(a, b, w, cls) { var h = {}; for (var i = 0; i < w; i++) if (((a >> i) & 1) !== ((b >> i) & 1)) h[i] = cls; return h; }
  function onesHl(v, w, cls) { var h = {}; for (var i = 0; i < w; i++) if ((v >> i) & 1) h[i] = cls; return h; }

  // ===================== TOPIC 1: Binary representation =====================
  topics.push({
    title: 'Binary Representation: Numbers as a Row of Light Switches',
    analogy: `<p>Picture a wall with a row of <b>light switches</b>. Each switch has a price tag stuck under it: the rightmost says <b>1</b>, the next says <b>2</b>, then <b>4</b>, <b>8</b>, <b>16</b>… (each tag is double the one to its right). To "show" a number, you switch ON exactly the switches whose tags add up to that number.</p>
      <p>Want to show 13? Turn on 8, 4 and 1 (8 + 4 + 1 = 13), leave 2 off. Reading the switches left to right as ON = 1, OFF = 0 gives <b>1101</b>. That is all binary is: a row of on/off switches with doubling price tags.</p>`,
    explain: `<p>Normal numbers (decimal) use 10 digits and each place is worth 10× the place to its right (1, 10, 100…). <b>Binary</b> uses only 2 digits, <b>0</b> and <b>1</b>, and each place is worth <b>2×</b> the place to its right. One binary digit is called a <b>bit</b>. We number bits from the right, starting at <b>bit 0</b>.</p>
      <h4>Binary → decimal: add up the ON switches</h4>
      ${H.table(['bit position', '3', '2', '1', '0'], [['worth (2<sup>pos</sup>)', '8', '4', '2', '1'], ['13 = 1101', '<span class="c-g">1</span>', '<span class="c-g">1</span>', '0', '<span class="c-g">1</span>'], ['add', '8', '4', '–', '1']])}
      ${H.bits(13, 4, { label: '13', hl: { 3: 'g', 2: 'g', 0: 'g' } })}
      <p>8 + 4 + 1 = <b>13</b>.</p>
      <h4>Decimal → binary: keep halving, write remainders</h4>
      <p>Divide by 2 again and again. The remainder (0 or 1) each time is the next bit, starting from bit 0. Read the remainders from bottom to top.</p>
      ${H.table(['n', 'n ÷ 2', 'remainder', 'becomes'], [['13', '6', '<span class="c-g">1</span>', 'bit 0'], ['6', '3', '0', 'bit 1'], ['3', '1', '<span class="c-g">1</span>', 'bit 2'], ['1', '0', '<span class="c-g">1</span>', 'bit 3']])}
      <p>Bottom to top: <b>1101</b>. Why does it work? <code>n % 2</code> tells you if the "1" switch is needed (odd numbers need it). Halving then slides every other switch one place to the right, so the next remainder tells you about the "2" switch, and so on.</p>
      <h4>Small numbers you should recognise instantly</h4>
      ${H.table(['decimal', 'binary', 'decimal', 'binary'], [['0', '0000', '8', '1000'], ['1', '0001', '9', '1001'], ['2', '0010', '10', '1010'], ['3', '0011', '11', '1011'], ['4', '0100', '12', '1100'], ['5', '0101', '13', '1101'], ['6', '0110', '14', '1110'], ['7', '0111', '15', '1111']])}
      <h4>Facts that matter in interviews</h4>
      <ul>
        <li>A 32-bit <code>int</code> (Java, C++, and the numbers JavaScript's bit operators work on) has <b>32</b> switches (bits 0..31). A 64-bit <code>long</code> / <code>long long</code> has <b>64</b>. Python ints have no fixed width: they grow as needed.</li>
        <li>A number N needs about <b>⌊log₂N⌋ + 1</b> bits. 10<sup>9</sup> needs only <b>30</b> bits (2<sup>30</sup> ≈ 1.07·10<sup>9</sup>). So "loop over every bit" is just ~30 steps, basically free.</li>
        <li><b>Powers of two</b> have exactly one switch ON: 1 = 1, 2 = 10, 4 = 100, 8 = 1000.</li>
        <li><b>2<sup>k</sup> − 1</b> is k switches all ON: 7 = 111, 15 = 1111. Handy as a "mask".</li>
        <li>Odd numbers always have bit 0 ON, even numbers have it OFF.</li>
        <li>Built-in helpers: Java <code>Integer.toBinaryString(13)</code> → "1101", <code>Integer.parseInt("1101", 2)</code> → 13, <code>Integer.bitCount(13)</code> → 3 switches ON. Python <code>bin(13)</code> → "0b1101", <code>int("1101", 2)</code>, <code>(13).bit_count()</code>. JavaScript <code>(13).toString(2)</code>, <code>parseInt("1101", 2)</code>. C++ <code>bitset&lt;8&gt;(13)</code>, <code>stoi("1101", nullptr, 2)</code>, <code>std::popcount</code>. The literal <code>0b1101</code> = 13 works in all four.</li>
      </ul>`,
    clues: [
      'The question says <b>"binary representation"</b>, "bits", "number of 1s", or "bit at position i" → think switches, not decimal digits.',
      '<code>A[i] ≤ 10<sup>9</sup></code> → every number fits in <b>30 bits</b>, so an outer loop "for each bit 0..30" costs only ×31.',
      'Answer involves <b>powers of two</b> (2, 4, 8, 1024…) or "2<sup>k</sup>" → only one bit is ON in such numbers.',
      '"For each bit position, count how many numbers have it" → solve the problem one bit column at a time, then add <code>count × 2<sup>bit</sup></code>.',
      'Tiny N like <code>N ≤ 20</code> next to "choose / any combination" → an int of N bits can describe a whole on/off choice (bitmask).'
    ],
    code: { lang: 'java', code: `
      class BinaryDemo {
          // Decimal -> binary by repeated halving.
          static String toBinary(int n) {
              if (n == 0) return "0";            // 0 has no ON switches
              StringBuilder sb = new StringBuilder();
              while (n > 0) {
                  sb.append(n % 2);              // remainder = the current lowest bit
                  n /= 2;                        // drop that bit (same as n >> 1 for n >= 0)
              }
              return sb.reverse().toString();    // remainders come out lowest bit first, so reverse
          }

          // Binary -> decimal: slide old value one place left (x2) and add the new bit.
          static int toDecimal(String s) {
              int val = 0;
              for (char ch : s.toCharArray()) {
                  val = val * 2 + (ch - '0');    // '1' - '0' = 1, '0' - '0' = 0
              }
              return val;
          }

          public static void main(String[] args) {
              System.out.println(toBinary(13));                 // 1101
              System.out.println(toDecimal("1101"));            // 13
              System.out.println(Integer.toBinaryString(13));   // built-in: 1101
              System.out.println(Integer.parseInt("1101", 2));  // built-in: 13
              System.out.println(0b1101);                       // binary literal: 13
              System.out.println(Integer.bitCount(13));         // 3 bits are ON
          }
      }`, alt: [{ lang: 'python', run: true, code: `def to_binary(n):
    if n == 0:
        return "0"                    # 0 has no ON switches
    bits = []
    while n > 0:
        bits.append(str(n % 2))       # remainder = the current lowest bit
        n //= 2                       # drop that bit
    return "".join(reversed(bits))    # remainders come out lowest bit first

def to_decimal(s):
    val = 0
    for ch in s:
        val = val * 2 + int(ch)       # slide left (x2) and add the new bit
    return val

print(to_binary(13))          # 1101
print(to_decimal("1101"))     # 13
print(bin(13))                # built-in: 0b1101
print(format(13, "b"))        # built-in without the prefix: 1101
print(int("1101", 2))         # built-in: 13
print(0b1101)                 # binary literal: 13
print((13).bit_count())       # 3 bits are ON (Python 3.10+)` },
  { lang: 'js', run: true, code: `function toBinary(n) {
  if (n === 0) return '0';            // 0 has no ON switches
  let s = '';
  while (n > 0) {
    s = (n % 2) + s;                  // remainder = the current lowest bit, put in front
    n = Math.floor(n / 2);            // drop that bit
  }
  return s;
}

function toDecimal(s) {
  let val = 0;
  for (const ch of s) val = val * 2 + Number(ch);   // slide left (x2) and add the new bit
  return val;
}

console.log(toBinary(13));            // 1101
console.log(toDecimal('1101'));       // 13
console.log((13).toString(2));        // built-in: 1101
console.log(parseInt('1101', 2));     // built-in: 13
console.log(0b1101);                  // binary literal: 13
// JS has no popcount built-in; see the Kernighan topic for a 3-line loop` },
  { lang: 'cpp', code: `#include <bits/stdc++.h>
using namespace std;

string toBinary(int n) {
    if (n == 0) return "0";               // 0 has no ON switches
    string s;
    while (n > 0) {
        s += char('0' + n % 2);           // remainder = the current lowest bit
        n /= 2;                           // drop that bit
    }
    reverse(s.begin(), s.end());          // remainders come out lowest bit first
    return s;
}

int toDecimal(const string& s) {
    int val = 0;
    for (char ch : s) val = val * 2 + (ch - '0');   // slide left (x2) and add the new bit
    return val;
}

int main() {
    cout << toBinary(13) << '\\n';              // 1101
    cout << toDecimal("1101") << '\\n';         // 13
    cout << bitset<8>(13) << '\\n';             // built-in, fixed width: 00001101
    cout << stoi("1101", nullptr, 2) << '\\n';  // built-in: 13
    cout << 0b1101 << '\\n';                    // binary literal: 13
    cout << popcount(13u) << '\\n';             // C++20 <bit>: 3 bits are ON
}` }] },
    codeTitle: 'Converting both ways (by hand and with built-ins)',
    examples: [
      {
        title: 'Decimal → binary by hand: 37',
        html: `<p>Halve and write the remainder each time (remainders are bits 0, 1, 2, … from the right):</p>
          ${H.table(['n', 'n ÷ 2', 'remainder', 'bit'], [['37', '18', '<span class="c-g">1</span>', '0'], ['18', '9', '0', '1'], ['9', '4', '<span class="c-g">1</span>', '2'], ['4', '2', '0', '3'], ['2', '1', '0', '4'], ['1', '0', '<span class="c-g">1</span>', '5']])}
          ${H.bits(37, 6, { label: '37', hl: { 5: 'g', 2: 'g', 0: 'g' } })}
          <p>Read bottom → top: <b>100101</b>. Check: 32 + 4 + 1 = 37 ✔.</p>`
      },
      {
        title: 'Binary → decimal with "double and add": 101101',
        html: `<p>Walk the bits from the <b>left</b>. Each step: double what you have (slide everything one place left), then add the new bit.</p>
          ${H.table(['bit read', 'value = value × 2 + bit'], [['1', '0 × 2 + 1 = 1'], ['0', '1 × 2 + 0 = 2'], ['1', '2 × 2 + 1 = 5'], ['1', '5 × 2 + 1 = 11'], ['0', '11 × 2 + 0 = 22'], ['1', '22 × 2 + 1 = <b>45</b>']])}
          <p>Check with place values: 32 + 8 + 4 + 1 = 45 ✔. This is exactly what <code>Integer.parseInt(s, 2)</code> does inside.</p>`,
        code: { lang: 'java', code: `System.out.println(Integer.parseInt("101101", 2)); // 45`, alt: [{ lang: 'python', run: true, code: `print(int("101101", 2))  # 45` },
  { lang: 'js', run: true, code: `console.log(parseInt('101101', 2)); // 45` },
  { lang: 'cpp', code: `cout << stoi("101101", nullptr, 2) << '\\n'; // 45` }] }
      },
      {
        title: 'How many bits does a number need? (int or long?)',
        html: `<p>A positive N needs <b>⌊log₂N⌋ + 1</b> bits. In code: Java <code>32 - Integer.numberOfLeadingZeros(n)</code>, Python <code>n.bit_length()</code>, JavaScript <code>32 - Math.clz32(n)</code>, C++ <code>std::bit_width(unsigned(n))</code>.</p>
          ${H.table(['N', 'bits needed', 'fits in'], [['255', '8', 'byte (unsigned) / int'], ['10<sup>5</sup>', '17', 'int'], ['10<sup>9</sup>', '30', 'int (max ≈ 2.1·10<sup>9</sup>)'], ['10<sup>18</sup>', '60', '<span class="c-y">long only</span> (max ≈ 9.2·10<sup>18</sup>)']])}
          <p>So when constraints say values up to 10<sup>9</sup>, a "for every bit" loop needs only 30 rounds; when sums can reach 10<sup>18</sup>, switch to <code>long</code>.</p>`,
        code: { lang: 'java', code: `int n = 1_000_000_000;
System.out.println(32 - Integer.numberOfLeadingZeros(n)); // 30`, alt: [{ lang: 'python', run: true, code: `n = 1_000_000_000
print(n.bit_length())  # 30` },
  { lang: 'js', run: true, code: `const n = 1000000000;
console.log(32 - Math.clz32(n)); // 30 (clz32 = count leading zeros of the 32-bit value)` },
  { lang: 'cpp', code: `unsigned n = 1'000'000'000;
cout << bit_width(n) << '\\n'; // 30 (C++20 <bit>)` }] }
      },
      {
        title: 'Hex is just binary in groups of 4',
        html: `<p>One hex digit = exactly 4 bits, so programmers write masks in hex: <code>0xF</code> = 1111, <code>0xFF</code> = 1111 1111 = 255, <code>0x55555555</code> = 0101…0101 (all even positions ON).</p>
          ${H.bits(0xA5, 8, { label: '0xA5', hl: { 7: 'b', 5: 'b', 2: 'y', 0: 'y' } })}
          <p><b>A</b> = 1010 (left four switches) and <b>5</b> = 0101 (right four switches), so 0xA5 = 1010 0101 = 165.</p>`
      }
    ],
    deepDive: `<h4>Why every number has exactly one binary form</h4>
      <p>Each place is worth more than <b>all the places to its right put together</b> (8 &gt; 4 + 2 + 1 = 7). So the leftmost needed switch is forced: if N ≥ 8 you must use the 8, otherwise you can never reach N. Repeat for the rest. That greedy argument proves the representation is unique, and it is the same reason "repeated halving" works.</p>
      <h4>Java details that bite</h4>
      <ul>
        <li><code>byte</code> is <b>signed</b> (−128..127). <code>(byte) 200</code> is −56. When reading raw bytes (files, network, images) use <code>b &amp; 0xFF</code> to get 0..255.</li>
        <li><code>char</code> is a 16-bit <b>unsigned</b> number, so <code>'a' + 1</code> is the int 98 and <code>c - 'a'</code> gives a bit index 0..25 — very handy for letter masks.</li>
        <li><code>Integer.toBinaryString</code> drops leading zeros. To print a fixed width: <code>String.format("%8s", Integer.toBinaryString(x &amp; 0xFF)).replace(' ', '0')</code>.</li>
        <li>Literals: <code>0b1010</code> (binary), <code>0x1F</code> (hex), <code>017</code> (octal! a leading 0 means base 8 — a classic trap), underscores allowed: <code>0b1010_0101</code>.</li>
      </ul>
      <h4>Production reality</h4>
      <p>Memory, network packets and file formats are all bytes. Byte <b>order</b> (endianness) decides which byte of an int is stored first: x86 and ARM are little-endian, network protocols and Java's <code>DataOutputStream</code>/<code>ByteBuffer</code> default are big-endian. Bit operators work on the <b>value</b>, so <code>&amp; | ^ &lt;&lt;</code> never care about endianness — only reading/writing raw bytes does.</p>`,
    aiEra: `<p><b>What AI changes:</b> nobody hand-converts big numbers at work any more — an assistant or <code>Integer.toBinaryString</code> does it instantly. But in an interview you must convert 0..31 in your head in seconds, because every bit trick is explained with small drawings on a whiteboard.</p>
      <p><b>Use AI as a partner:</b> ask <code>Make me a 20-question flash-card drill: decimal 0-63 to binary and back, answers hidden</code>, or <code>Explain why 10^9 fits in 30 bits using powers of two, no code</code>.</p>
      <p><b>Where AI goes wrong:</b> it often prints <code>Integer.toBinaryString(-5)</code> as "-101" (that is what Python's <code>bin(-5)</code> shows, not Java), forgets that leading zeros are dropped, or mixes up which end is bit 0. Always check with one tiny example you can do by hand.</p>
      <p><b>What you must still own:</b> instantly seeing "values ≤ 10<sup>9</sup> → 30 bits", knowing when you need <code>long</code>, and reading a bit pattern as switches with price tags.</p>`,
    viz: {
      title: 'Decimal → binary: keep halving, collect remainders',
      input: '13',
      inputLabel: 'A whole number from 0 to 1023',
      gen: function (input) {
        var n = toInt(input, 0, 1023, 'a number');
        var w = Math.max(4, bitLen(n));
        var frames = [], built = 0, cur = n, k = 0, rows = [];
        frames.push({
          narr: 'We want to write <b>' + n + '</b> using switches worth 1, 2, 4, 8, … The trick: divide by 2 again and again. Each remainder (0 or 1) tells us the next switch, starting from the <b>rightmost</b> one (bit 0).',
          parts: [{ type: 'vars', label: 'start', vals: { n: n } }, { type: 'bits', label: 'switches so far (all off)', value: 0, width: w, showDec: false }]
        });
        if (n === 0) {
          frames.push({ narr: 'n is already 0, so there is nothing to divide. Every switch stays <b>off</b>: 0 in binary is just 0.', parts: [{ type: 'bits', label: 'n = 0', value: 0, width: w, hl: one(0, 'cur') }] });
        }
        while (cur > 0) {
          var r = cur % 2, q = Math.floor(cur / 2);
          built |= (r << k);
          rows.push([String(cur), cur + ' ÷ 2 = ' + q, r ? '<span class="c-g">1</span>' : '0', 'bit ' + k]);
          var hl = {};
          for (var j = 0; j < k; j++) hl[j] = 'done';
          hl[k] = r ? 'ok' : 'cur';
          frames.push({
            narr: cur + ' is ' + (r ? '<b>odd</b>, so the remainder is <b>1</b> → switch ' + k + ' (worth ' + (1 << k) + ') goes <span class="c-g">ON</span>.' : '<b>even</b>, so the remainder is <b>0</b> → switch ' + k + ' (worth ' + (1 << k) + ') stays OFF.') +
              ' Then halve: ' + cur + ' ÷ 2 = <b>' + q + '</b> (throw away the remainder).' + (q === 0 ? ' We reached 0, so we stop.' : ' Halving slides every remaining switch one place right, so the next remainder is about the next switch.'),
            parts: [
              { type: 'vars', vals: { n: cur, 'n % 2': r, 'n / 2': q }, hl: { 'n % 2': r ? 'ok' : 'cur' } },
              { type: 'bits', label: 'switches filled so far', value: built, width: w, hl: hl, ptr: one(k, 'k'), showDec: false },
              { type: 'text', label: 'steps so far', html: H.table(['n', 'halve', 'remainder', 'goes to'], rows.slice()) }
            ]
          });
          cur = q; k++;
        }
        var s = bin(n, w), hlS = {}, terms = [], head = ['bit'], worth = ['worth'], sw = ['switch'];
        for (var b = w - 1; b >= 0; b--) {
          head.push(String(b)); worth.push(String(1 << b));
          if ((n >> b) & 1) { hlS[b] = 'sel'; terms.push(1 << b); sw.push('<span class="c-g">1</span>'); } else sw.push('0');
        }
        frames.push({
          narr: 'Read the remainders from the <b>last</b> one back to the first (bottom to top) and you get <b>' + s + '</b>. That is ' + n + ' written in binary.',
          parts: [{ type: 'bits', label: n + ' in binary', value: n, width: w, hl: hlS }]
        });
        frames.push({
          narr: 'Double-check by adding the price tags of the ON switches: ' + (terms.length ? terms.join(' + ') : '0') + ' = <b>' + n + '</b>. ✔ Same number, just written with switches.',
          parts: [
            { type: 'bits', label: n + ' in binary', value: n, width: w, hl: hlS },
            { type: 'text', label: 'place values', html: H.table(head, [worth, sw]) }
          ]
        });
        return frames;
      }
    }
  });

  // ===================== TOPIC 2: Two's complement =====================
  topics.push({
    title: "2's Complement: How Negative Numbers Live in Bits",
    analogy: `<p>Think of an old car <b>odometer</b> with only 3 wheels. It reads <b>000</b>. Now drive backwards by 1 km: the wheels roll back to <b>999</b>. So on this odometer, "999" really behaves like <b>−1</b>, "998" like −2, and so on. Add 1 to 999 and it rolls over to 000, exactly like −1 + 1 = 0.</p>
      <p>Computers do the same with switches. With 8 switches, 0000 0000 minus 1 rolls back to <b>1111 1111</b>, and that pattern <b>means −1</b>. That rolling-over idea is called <b>2's complement</b>.</p>`,
    explain: `<p>A computer has no minus sign key, only switches. Java, C++ (guaranteed since C++20) and JavaScript's bit operators all store integers using <b>2's complement</b>: the <b>leftmost</b> bit (bit 31 for int, bit 7 in our 8-bit drawings) is the <b>sign bit</b>. Its price tag is <b>negative</b>: in 8 bits it is worth <b>−128</b> instead of +128. All the other bits keep their normal positive values.</p>
      ${H.table(['8-bit pattern', 'sign bit worth', 'rest', 'value'], [['0000 0101', '0', '4 + 1', '<b>5</b>'], ['0111 1111', '0', '64+32+16+8+4+2+1', '<b>127</b> (largest)'], ['1111 1111', '<span class="c-r">−128</span>', '127', '<b>−1</b>'], ['1111 1011', '<span class="c-r">−128</span>', '123', '<b>−5</b>'], ['1000 0000', '<span class="c-r">−128</span>', '0', '<b>−128</b> (smallest)']])}
      <h4>The recipe: −x = ~x + 1 (flip every switch, then add 1)</h4>
      ${H.bits(5, 8, { label: 'x = 5', hl: {} })}
      ${H.bits(~5, 8, { label: '~x (flip all)', hl: { 7: 'y', 6: 'y', 5: 'y', 4: 'y', 3: 'y', 2: 'y', 1: 'y', 0: 'y' } })}
      ${H.bits(-5, 8, { label: '~x + 1 = −5', hl: { 0: 'g', 1: 'g' } })}
      <p>Check: −128 + 64 + 32 + 16 + 8 + 2 + 1 = <b>−5</b> ✔. And 5 + (−5) = 0000 0101 + 1111 1011 = <b>1</b> 0000 0000. The 9th bit falls off the edge (there are only 8 switches), leaving 0. So normal adding "just works" for negatives — that is why computers use this system.</p>
      <h4>Things that follow from it (and trap people)</h4>
      <ul>
        <li><code>~x == -x - 1</code> always. So <code>~5 = -6</code>, <code>~0 = -1</code>, <code>~(-1) = 0</code>.</li>
        <li><b>−1 is all ones</b>: 32 switches ON. <code>Integer.toBinaryString(-1)</code> prints 32 ones.</li>
        <li>int range is <b>−2<sup>31</sup> … 2<sup>31</sup> − 1</b> (−2,147,483,648 … 2,147,483,647). There is one more negative than positive.</li>
        <li>So <code>-Integer.MIN_VALUE == Integer.MIN_VALUE</code> and <code>Math.abs(Integer.MIN_VALUE)</code> is still negative! Use <code>long</code> if you might negate the minimum.</li>
        <li><code>Integer.MAX_VALUE + 1</code> silently becomes <code>Integer.MIN_VALUE</code> (the odometer rolls over).</li>
        <li><code>x &amp; -x</code> keeps only the <b>lowest ON switch</b> of x (because −x = ~x + 1 flips everything above it). Example: 12 = 1100, −12 = …0100, 12 &amp; −12 = 100 = 4. We use this in Single Number III.</li>
      </ul>`,
    clues: [
      'Input may contain <b>negative numbers</b> and you are using bit tricks → remember the sign bit is ON and there are 32 bits, not "just the visible ones".',
      '"<b>32-bit signed integer</b>", "overflow", "Integer.MIN_VALUE" in the statement → think 2\'s complement range −2<sup>31</sup> … 2<sup>31</sup> − 1.',
      '"Lowest set bit" / "rightmost 1" → <code>x &amp; -x</code> works because of 2\'s complement.',
      'Formula hints like <code>~x</code> or "bitwise NOT" → <code>~x = -x - 1</code>.',
      'Code reads bits <code>(x &gt;&gt; i) &amp; 1</code> for i = 0..31 on negatives → bit 31 is the sign bit and is 1 for negatives.'
    ],
    code: { lang: 'java', code: `
      class TwosComplementDemo {
          public static void main(String[] args) {
              int x = 5;
              int flipped = ~x;          // every bit flipped -> -6 (because ~x == -x - 1)
              int neg = ~x + 1;          // flip, then add 1 -> -5
              System.out.println(flipped);                        // -6
              System.out.println(neg);                            // -5
              System.out.println(neg == -x);                      // true
              System.out.println(Integer.toBinaryString(-5));     // 11111111111111111111111111111011
              System.out.println(Integer.toBinaryString(-1));     // 32 ones

              // The odometer rolls over:
              int big = Integer.MAX_VALUE;
              System.out.println(big + 1 == Integer.MIN_VALUE);   // true
              System.out.println(-Integer.MIN_VALUE);             // still -2147483648
              System.out.println(Math.abs((long) Integer.MIN_VALUE)); // 2147483648, safe in long

              // Lowest ON switch:
              int n = 12;                                         // 1100
              System.out.println(n & -n);                         // 4 (binary 100)
          }
      }`, alt: [{ lang: 'python', run: true, code: `x = 5
print(~x)                         # -6 (~x == -x - 1 holds in Python too)
print(~x + 1)                     # -5
print(~x + 1 == -x)               # True
print(bin(-5))                    # -0b101: Python shows a minus sign, not the bits
print(format(-5 & 0xFFFFFFFF, "032b"))  # 11111111111111111111111111111011 (mask to see 32 bits)
print(format(-1 & 0xFFFFFFFF, "032b"))  # 32 ones

def to_int32(v):                  # imitate a 32-bit int: keep 32 bits, then read bit 31 as the sign
    v &= 0xFFFFFFFF
    return v - (1 << 32) if v >= 1 << 31 else v

INT_MAX, INT_MIN = 2**31 - 1, -2**31
print(INT_MAX + 1)                # 2147483648: Python ints never roll over
print(to_int32(INT_MAX + 1) == INT_MIN)  # True: what a 32-bit int would do
print(abs(INT_MIN))               # 2147483648, no trap in Python

n = 12                            # 1100
print(n & -n)                     # 4 (binary 100)` },
  { lang: 'js', run: true, code: `const x = 5;
console.log(~x);                       // -6 (bitwise ops use 32-bit ints)
console.log(~x + 1);                   // -5
console.log(~x + 1 === -x);            // true
console.log((-5 >>> 0).toString(2));   // 11111111111111111111111111111011
console.log((-1 >>> 0).toString(2));   // 32 ones

// Numbers are doubles, so + does NOT roll over; | 0 forces the 32-bit wrap
const big = 2147483647;
console.log(big + 1);                  // 2147483648
console.log((big + 1) | 0);            // -2147483648
console.log(-(-2147483648) | 0);       // -2147483648, same trap as Java's -MIN_VALUE

const n = 12;                          // 1100
console.log(n & -n);                   // 4 (binary 100)` },
  { lang: 'cpp', code: `#include <bits/stdc++.h>
using namespace std;

int main() {
    int x = 5;
    cout << ~x << '\\n';                 // -6 (two's complement is guaranteed since C++20)
    cout << (~x + 1) << '\\n';           // -5
    cout << bitset<32>(-5) << '\\n';     // 11111111111111111111111111111011
    cout << bitset<32>(-1) << '\\n';     // 32 ones

    // INT_MAX + 1 on int is undefined behaviour (not a wrap!). Wrap on purpose with unsigned:
    int big = INT_MAX;
    cout << static_cast<int>(static_cast<unsigned>(big) + 1u) << '\\n';  // -2147483648
    cout << llabs(static_cast<long long>(INT_MIN)) << '\\n';            // 2147483648, safe in long long

    int n = 12;                         // 1100
    cout << (n & -n) << '\\n';           // 4 (binary 100)
}` }] },
    codeTitle: 'Seeing 2\'s complement in code',
    examples: [
      {
        title: 'Read a negative 8-bit pattern: 1111 0110',
        html: `${H.bits(-10, 8, { label: '1111 0110', hl: { 7: 'r' } })}
          <p><b>Way 1 (price tags):</b> sign bit worth −128, the rest 64 + 32 + 16 + 4 + 2 = 118 → −128 + 118 = <b>−10</b>.</p>
          <p><b>Way 2 (undo the recipe):</b> flip and add 1 to get the size: ~1111 0110 = 0000 1001 = 9, +1 = 10, so the value is <b>−10</b>. Both ways agree.</p>`
      },
      {
        title: 'Overflow: the odometer rolls over',
        html: `<p><code>Integer.MAX_VALUE</code> = 0111…1 (31 ones). Add 1 and the carry runs into the sign bit: 1000…0 = <code>Integer.MIN_VALUE</code>. Java does <b>not</b> warn you. JavaScript only wraps when you force 32 bits (<code>| 0</code>); in C++ signed overflow is undefined behaviour; Python ints never overflow at all.</p>
          ${H.table(['expression', 'result'], [['MAX_VALUE + 1', '<span class="c-r">−2147483648</span>'], ['Math.abs(MIN_VALUE)', '<span class="c-r">−2147483648</span> (still negative!)'], ['Math.addExact(MAX_VALUE, 1)', 'throws ArithmeticException'], ['(long) MAX_VALUE + 1', '<span class="c-g">2147483648</span>']])}
          <p>Rule of thumb: if a sum or product of ints can pass ~2·10<sup>9</sup>, cast to <code>long</code> <b>before</b> the operation.</p>`,
        code: { lang: 'java', code: `int big = Integer.MAX_VALUE;
System.out.println(big + 1);          // -2147483648
System.out.println((long) big + 1);   // 2147483648
try { Math.addExact(big, 1); } catch (ArithmeticException e) { System.out.println("overflow caught"); }`, alt: [{ lang: 'python', run: true, code: `big = 2**31 - 1
print(big + 1)                              # 2147483648: Python ints never overflow
print((big + 1 + 2**31) % 2**32 - 2**31)    # -2147483648: what a 32-bit int would hold` },
  { lang: 'js', run: true, code: `const big = 2147483647;
console.log(big + 1);          // 2147483648: a Number does not wrap
console.log((big + 1) | 0);    // -2147483648: | 0 squeezes it into 32 bits` },
  { lang: 'cpp', code: `int big = INT_MAX;
cout << static_cast<long long>(big) + 1 << '\\n';      // 2147483648
int r;
if (__builtin_add_overflow(big, 1, &r)) cout << "overflow caught\\n";   // GCC/Clang check; big + 1 itself is UB` }] }
      },
      {
        title: 'Signed bytes in Java: (byte) 200',
        html: `<p>200 = 1100 1000. Squeezed into a signed byte, bit 7 becomes the sign bit worth −128: −128 + 64 + 8 = <b>−56</b>. To get the "raw" 0..255 value back, AND with 0xFF: the int −56 is 1111…1100 1000, and <code>&amp; 0xFF</code> keeps only the last 8 switches → 200.</p>`,
        code: { lang: 'java', code: `byte b = (byte) 200;
System.out.println(b);          // -56
System.out.println(b & 0xFF);   // 200`, alt: [{ lang: 'python', run: true, code: `b = int.from_bytes(bytes([200]), "big", signed=True)   # read the byte as signed
print(b)          # -56
print(b & 0xFF)   # 200` },
  { lang: 'js', run: true, code: `const b = new Int8Array([200])[0];   // a signed byte
console.log(b);          // -56
console.log(b & 0xFF);   // 200` },
  { lang: 'cpp', code: `int8_t b = static_cast<int8_t>(200);
cout << int(b) << '\\n';        // -56
cout << (b & 0xFF) << '\\n';    // 200` }] }
      },
      {
        title: 'Widening copies the sign bit (sign extension)',
        html: `<p>Turning a byte −1 (1111 1111) into an int gives 32 ones (still −1), not 0000…1111 1111 (255). Java "smears" the sign bit into all the new places so the value stays the same. The same thing happens int → long. That is why <code>(long) x &amp; 0xFFFFFFFFL</code> is the standard way to read an int as unsigned (0..4294967295).</p>`,
        code: { lang: 'java', code: `int x = -1;
long asUnsigned = x & 0xFFFFFFFFL;
System.out.println(asUnsigned);                 // 4294967295
System.out.println(Integer.toUnsignedString(x)); // 4294967295`, alt: [{ lang: 'python', run: true, code: `x = -1
print(x & 0xFFFFFFFF)   # 4294967295: the 32 raw bits read as unsigned` },
  { lang: 'js', run: true, code: `const x = -1;
console.log(x >>> 0);   // 4294967295: >>> 0 reads the 32 bits as unsigned` },
  { lang: 'cpp', code: `int x = -1;
cout << static_cast<uint32_t>(x) << '\\n';   // 4294967295` }] }
      }
    ],
    deepDive: `<h4>Why 2's complement won</h4>
      <p>Older ideas were <b>sign-magnitude</b> (first bit = minus sign) and <b>1's complement</b> (−x = ~x). Both have <b>two zeros</b> (+0 and −0) and need special adding circuits. In 2's complement there is one zero and the <b>same adder</b> handles positive and negative numbers, because int arithmetic is simply arithmetic <b>modulo 2<sup>32</sup></b>: −1 and 2<sup>32</sup> − 1 are the same thing on a 32-switch odometer.</p>
      <h4>Proof of −x = ~x + 1</h4>
      <p><code>x + ~x</code> is all ones (every column has exactly one 1, no carries) = 2<sup>32</sup> − 1 ≡ −1. So <code>~x = −1 − x</code> and <code>~x + 1 = −x</code>. ∎</p>
      <h4>Detecting overflow without long</h4>
      <p>For <code>r = a + b</code>, overflow happens only when a and b have the same sign and r has the other sign: <code>((a ^ r) &amp; (b ^ r)) &lt; 0</code>. This is exactly how <code>Math.addExact</code> is written in the JDK.</p>
      <h4>Across languages</h4>
      <ul>
        <li><b>Java</b>: two's complement is guaranteed by the language spec; overflow wraps silently. Unsigned helpers: <code>Integer.toUnsignedLong</code>, <code>divideUnsigned</code>, <code>compareUnsigned</code>.</li>
        <li><b>C++20</b>: two's complement representation is now mandatory, but signed overflow is still <b>undefined behaviour</b> (the optimiser may assume it never happens). Use unsigned types when you want wrap-around.</li>
        <li><b>Python</b>: ints never overflow; a negative number behaves as if it had <b>infinitely many</b> 1s on the left. To imitate 32-bit, mask with <code>&amp; 0xFFFFFFFF</code> and convert back with <code>x - (1 &lt;&lt; 32) if x &gt;= 1 &lt;&lt; 31 else x</code>.</li>
      </ul>`,
    aiEra: `<p><b>What AI changes:</b> when you ask an assistant to translate bit-twiddling code between Java, C++ and Python, the sign/width difference is the number-one silent bug. Python has no fixed width, so an AI-translated "Sum of Two Integers" or "count bits" loop can run forever on negatives.</p>
      <p><b>Use AI as a partner:</b> <code>Write property tests for my function using 0, 1, -1, Integer.MAX_VALUE, Integer.MIN_VALUE and random ints</code>. Those five values catch most 2's complement mistakes.</p>
      <p><b>Where AI goes wrong:</b> claiming <code>Math.abs</code> is always non-negative, forgetting <code>-Integer.MIN_VALUE == Integer.MIN_VALUE</code>, using <code>int</code> for a product of two 10<sup>5</sup> values, and saying C++ signed overflow "wraps".</p>
      <p><b>What you must still own:</b> the odometer mental model, the recipe ~x + 1, and the reflex to ask "can this overflow?" for every sum and product in your solution.</p>`,
    viz: {
      title: 'Make −x from x: flip every switch, then add 1 (8 bits)',
      input: '5',
      inputLabel: 'x, a whole number from −127 to 127',
      gen: function (input) {
        var x = toInt(input, -127, 127, 'x');
        var nx = ~x, neg = -x, frames = [];
        var all = {}; for (var i = 0; i < 8; i++) all[i] = 'cur';
        frames.push({
          narr: 'Start with x = <b>' + x + '</b> in 8 switches. The leftmost switch (bit 7) is the <b>sign bit</b>: its price tag is −128 instead of +128. ' + (x < 0 ? 'It is ON here, so x is negative.' : 'It is OFF here, so x is not negative.'),
          parts: [{ type: 'bits', label: 'x', value: x, width: 8, hl: one(7, x < 0 ? 'bad' : 'sel') }]
        });
        frames.push({
          narr: 'Step 1: flip <b>every</b> switch. This is <code>~x</code> (bitwise NOT): each 0 becomes 1 and each 1 becomes 0. Notice ~x is always −x − 1, here <b>' + nx + '</b>. We are one short of −x, so…',
          parts: [{ type: 'bits', label: 'x', value: x, width: 8 }, { type: 'bits', label: '~x (all flipped)', value: nx, width: 8, hl: all }]
        });
        var t = 0; while (t < 8 && ((nx >> t) & 1)) t++;
        var changed = diffHl(nx, neg, 8, 'ok');
        frames.push({
          narr: 'Step 2: add 1. ' + (t === 0 ? 'Bit 0 of ~x is 0, so the +1 simply switches it ON. No carry needed.' : 'The lowest ' + t + ' switch' + (t > 1 ? 'es are' : ' is') + ' ON, so the +1 makes them roll over to 0 and the carry moves left' + (t < 8 ? ' until it lands on bit ' + t + ', which turns ON.' : ' and falls off the end.')) + ' Result: <b>' + neg + '</b> = −x. ✔',
          parts: [{ type: 'bits', label: '~x', value: nx, width: 8 }, { type: 'bits', label: '+ 1', value: 1, width: 8, hl: one(0, 'cur') }, { type: 'bits', label: '~x + 1 = −x', value: neg, width: 8, hl: changed }]
        });
        var rest = neg & 127, signOn = (neg & 128) !== 0;
        frames.push({
          narr: 'Read the value of the result: ' + (signOn ? 'the sign bit is ON, worth <b>−128</b>; the other switches add up to ' + rest + '. So −128 + ' + rest + ' = <b>' + neg + '</b>.' : 'the sign bit is OFF, so it is a plain positive sum: <b>' + neg + '</b>.') + ' That matches −x.',
          parts: [{ type: 'bits', label: '−x', value: neg, width: 8, hl: one(7, signOn ? 'bad' : 'sel') }, { type: 'vars', vals: { 'sign bit worth': signOn ? -128 : 0, 'other bits': rest, total: neg }, hl: { total: 'ok' } }]
        });
        frames.push({
          narr: 'Final check: x + (−x) should be 0. ' + (x === 0 ? '0 + 0 = 0, nothing to carry.' : 'Adding the patterns gives 1 0000 0000 (that is 256), but we only have 8 switches, so the 9th bit <b>falls off the edge</b> and we are left with 0000 0000 = 0.') + ' This is why computers use 2\'s complement: the normal adding circuit works for negatives too.',
          parts: [{ type: 'bits', label: 'x', value: x, width: 8 }, { type: 'bits', label: '−x', value: neg, width: 8 }, { type: 'bits', label: 'x + (−x), 8 bits kept', value: 0, width: 8, hl: all }]
        });
        return frames;
      }
    }
  });

  // ===================== TOPIC 3: Bitwise operators =====================
  topics.push({
    title: 'Bitwise Operators: &amp;, |, ^, ~, &lt;&lt;, &gt;&gt; and Java\'s &gt;&gt;&gt;',
    analogy: `<p>Put two switch panels one above the other and compare them <b>column by column</b>:</p>
      <ul>
        <li><b>AND (&amp;)</b> is a bank locker that needs <b>two keys</b>: the light is on only if <b>both</b> switches are on.</li>
        <li><b>OR (|)</b> is a house with <b>two doorbells</b>: the bell rings if <b>either</b> one is pressed.</li>
        <li><b>XOR (^)</b> is the <b>staircase light</b> with a switch at the top and bottom: flipping <b>exactly one</b> of them changes the light; flipping both cancels out. So XOR = "are they <b>different</b>?"</li>
        <li><b>NOT (~)</b> is a prankster who flips <b>every</b> switch on the panel.</li>
        <li><b>Shift left (&lt;&lt;)</b> is a row of people on a bench all sliding one seat left; a new empty seat (0) appears on the right. Each slide <b>doubles</b> the number. <b>Shift right (&gt;&gt;)</b> slides them right: the rightmost person falls off, and the number <b>halves</b>.</li>
      </ul>`,
    explain: `<h4>The truth table (one column at a time)</h4>
      ${H.table(['a', 'b', 'a &amp; b', 'a | b', 'a ^ b'], [['0', '0', '0', '0', '0'], ['0', '1', '0', '1', '<span class="c-g">1</span>'], ['1', '0', '0', '1', '<span class="c-g">1</span>'], ['1', '1', '<span class="c-g">1</span>', '1', '<span class="c-r">0</span>']])}
      <h4>Worked example with a = 12, b = 10</h4>
      ${H.bits(12, 4, { label: 'a = 12' })}
      ${H.bits(10, 4, { label: 'b = 10' })}
      ${H.bits(12 & 10, 4, { label: 'a &amp; b', hl: { 3: 'g' } })}
      ${H.bits(12 | 10, 4, { label: 'a | b', hl: { 3: 'g', 2: 'g', 1: 'g' } })}
      ${H.bits(12 ^ 10, 4, { label: 'a ^ b', hl: { 2: 'g', 1: 'g' } })}
      <p>&amp; keeps only columns where both are 1 (<b>8</b>). | keeps columns where at least one is 1 (<b>14</b>). ^ keeps columns where they differ (<b>6</b>). <code>~12</code> flips all 32 bits → <b>−13</b> (because ~x = −x − 1).</p>
      <h4>Shifts</h4>
      ${H.table(['expression', 'bits before', 'bits after', 'value', 'plain meaning'], [
        ['<code>3 &lt;&lt; 2</code>', '0000 0011', '0000 1100', '<b>12</b>', '3 × 2² (zeros come in on the right)'],
        ['<code>13 &gt;&gt; 1</code>', '0000 1101', '0000 0110', '<b>6</b>', '⌊13 ÷ 2⌋ (bit 0 falls off)'],
        ['<code>-16 &gt;&gt; 2</code>', '1111 0000', '1111 1100', '<b>−4</b>', 'sign bit is <b>copied</b> in from the left, stays negative'],
        ['<code>-7 &gt;&gt; 1</code>', '1111 1001', '1111 1100', '<b>−4</b>', 'rounds <b>down</b> (toward −∞), while −7 / 2 = −3 rounds toward 0'],
        ['<code>-16 &gt;&gt;&gt; 28</code>', '1111 … 0000 (32 bits)', '0000 … 1111', '<b>15</b>', '<b>zeros</b> come in from the left, sign is ignored']
      ])}
      <ul>
        <li><b>x &lt;&lt; k</b> = x · 2<sup>k</sup> (as long as nothing important falls off the left end — otherwise it overflows).</li>
        <li><b>x &gt;&gt; k</b> = ⌊x / 2<sup>k</sup>⌋. "Arithmetic" shift: it copies the sign bit, so negatives stay negative.</li>
        <li><b>x &gt;&gt;&gt; k</b> (Java and JavaScript; in C++ shift an <code>unsigned</code> value; in Python mask with <code>&amp; 0xFFFFFFFF</code> first, then use &gt;&gt;) = "unsigned" or "logical" shift: always fills with zeros. For non-negative x it is the same as &gt;&gt;. Use it when you treat the int as 32 raw switches (e.g. Reverse Bits) or for the overflow-safe middle <code>(lo + hi) &gt;&gt;&gt; 1</code>.</li>
        <li><b>Trap 1:</b> for <code>int</code>, Java only uses the last 5 bits of the shift amount, so <code>1 &lt;&lt; 32 == 1</code> and <code>1 &lt;&lt; 31</code> is negative. Use <code>1L &lt;&lt; k</code> for 64-bit masks. JavaScript behaves the same way (use BigInt past bit 31); in C++ a shift by 32 or more is undefined behaviour (use <code>1ULL &lt;&lt; k</code>); Python has no limit.</li>
        <li><b>Trap 2 (precedence):</b> <code>==</code> binds tighter than <code>&amp;</code>. Always write <code>(x &amp; 1) == 0</code> with brackets.</li>
        <li><b>Quick tricks:</b> <code>(x &amp; 1) == 1</code> → odd; <code>x &gt;&gt; 1</code> → halve; <code>1 &lt;&lt; k</code> → 2<sup>k</sup>; <code>(1 &lt;&lt; k) - 1</code> → k ones.</li>
      </ul>`,
    clues: [
      '"Multiply / divide by a <b>power of 2</b>" or "2<sup>k</sup>" → shifts <code>&lt;&lt;</code> and <code>&gt;&gt;</code>.',
      '"Treat as <b>unsigned 32-bit</b>", "reverse the bits", "count bits of a negative number" → use an unsigned shift (<code>&gt;&gt;&gt;</code> in Java/JavaScript, an unsigned type in C++, <code>&amp; 0xFFFFFFFF</code> then <code>&gt;&gt;</code> in Python) so zeros fill in and the loop ends.',
      '"Both / all have this property" → AND; "at least one / any" → OR; "differ / odd number of times / cancel" → XOR.',
      '"Check odd or even" with huge counts → <code>(n &amp; 1)</code> instead of <code>n % 2</code> (also safe for negatives).',
      '"Binary search with very large lo and hi" → <code>(lo + hi) &gt;&gt;&gt; 1</code> avoids the overflow of <code>lo + hi</code>.'
    ],
    code: { lang: 'java', code: `
      class OperatorsDemo {
          public static void main(String[] args) {
              int a = 12, b = 10;              // 1100 and 1010
              System.out.println(a & b);       // 8   (1000) both on
              System.out.println(a | b);       // 14  (1110) at least one on
              System.out.println(a ^ b);       // 6   (0110) different
              System.out.println(~a);          // -13 (every bit flipped)

              System.out.println(3 << 2);      // 12  = 3 * 4
              System.out.println(13 >> 1);     // 6   = floor(13 / 2)
              System.out.println(-16 >> 2);    // -4  sign bit copied in
              System.out.println(-7 >> 1);     // -4  rounds toward minus infinity
              System.out.println(-7 / 2);      // -3  division rounds toward zero
              System.out.println(-16 >>> 28);  // 15  zeros come in from the left

              System.out.println(1 << 32);     // 1 (shift amount uses only its last 5 bits!)
              System.out.println(1L << 32);    // 4294967296 (use long for big masks)

              int lo = 2_000_000_000, hi = 2_100_000_000;
              int mid = (lo + hi) >>> 1;       // lo + hi overflows, but >>> reads it as unsigned
              System.out.println(mid);         // 2050000000

              int x = 7;
              boolean odd = (x & 1) == 1;      // brackets needed: == binds tighter than &
              System.out.println(odd);         // true
          }
      }`, alt: [{ lang: 'python', run: true, code: `a, b = 12, 10                  # 1100 and 1010
print(a & b, a | b, a ^ b)     # 8 14 6
print(~a)                      # -13

print(3 << 2)                  # 12 = 3 * 4
print(13 >> 1)                 # 6
print(-16 >> 2)                # -4: >> keeps the sign, like Java
print(-7 >> 1)                 # -4: rounds toward minus infinity
print(-7 // 2)                 # -4: Python's // also floors (Java's -7 / 2 is -3)
print(int(-7 / 2))             # -3: truncate toward zero
print((-16 & 0xFFFFFFFF) >> 28)  # 15: no >>> in Python, so mask to 32 bits first

print(1 << 32)                 # 4294967296: no 32-bit limit, the shift is not taken mod 32

x = 7
print((x & 1) == 1)            # True (in Python & binds tighter than ==, but brackets are clearer)` },
  { lang: 'js', run: true, code: `const a = 12, b = 10;          // 1100 and 1010
console.log(a & b, a | b, a ^ b); // 8 14 6
console.log(~a);                // -13

console.log(3 << 2);            // 12
console.log(13 >> 1);           // 6
console.log(-16 >> 2);          // -4: sign bit copied in
console.log(-7 >> 1);           // -4: rounds toward minus infinity
console.log(Math.trunc(-7 / 2)); // -3: plain -7 / 2 is -3.5 in JS
console.log(-16 >>> 28);        // 15: zeros come in from the left

console.log(1 << 32);           // 1: shift count uses only its last 5 bits, like Java
console.log(2 ** 32);           // 4294967296: use ** or BigInt (1n << 32n) for big values

const lo = 2000000000, hi = 2100000000;
console.log((lo + hi) >>> 1);   // 2050000000 (the sum is exact as a Number; >>> reads it as unsigned)

const x = 7;
console.log((x & 1) === 1);     // true (brackets needed: === binds tighter than &)` },
  { lang: 'cpp', code: `#include <bits/stdc++.h>
using namespace std;

int main() {
    int a = 12, b = 10;                                // 1100 and 1010
    cout << (a & b) << ' ' << (a | b) << ' ' << (a ^ b) << '\\n';   // 8 14 6
    cout << ~a << '\\n';                                // -13

    cout << (3 << 2) << ' ' << (13 >> 1) << '\\n';      // 12 6
    cout << (-16 >> 2) << ' ' << (-7 >> 1) << '\\n';    // -4 -4 (arithmetic shift, guaranteed since C++20)
    cout << -7 / 2 << '\\n';                            // -3: division rounds toward zero
    cout << (static_cast<uint32_t>(-16) >> 28) << '\\n'; // 15: an unsigned shift is Java's >>>

    // 1 << 32 on a 32-bit int is undefined behaviour; use a 64-bit type
    cout << (1ULL << 32) << '\\n';                      // 4294967296

    int lo = 2000000000, hi = 2100000000;
    int mid = lo + (hi - lo) / 2;                      // lo + hi would overflow (undefined)
    cout << mid << '\\n';                               // 2050000000

    int x = 7;
    cout << boolalpha << ((x & 1) == 1) << '\\n';       // true (without brackets: x & (1 == 1))
}` }] },
    codeTitle: 'Every operator on small numbers',
    examples: [
      {
        title: 'Keep the last k bits = remainder by 2^k',
        html: `<p><code>n &amp; ((1 &lt;&lt; k) - 1)</code> keeps the lowest k switches. For non-negative n that equals <code>n % 2<sup>k</sup></code>.</p>
          ${H.bits(29, 8, { label: '29', hl: { 2: 'g', 0: 'g' } })}
          ${H.bits(7, 8, { label: '(1 &lt;&lt; 3) − 1 = 7', hl: { 2: 'y', 1: 'y', 0: 'y' } })}
          ${H.bits(5, 8, { label: '29 &amp; 7 = 5', hl: { 2: 'g', 0: 'g' } })}
          <p>And 29 % 8 = 5 ✔. Java's <code>HashMap</code> uses exactly this: table size is a power of two, bucket = <code>hash &amp; (size − 1)</code>.</p>`
      },
      {
        title: 'Unpack an RGB colour with &gt;&gt;&gt; and &amp; 0xFF',
        html: `<p>A colour packs three bytes into one int: <code>0x12AB34</code> → red 0x12, green 0xAB, blue 0x34. Slide the wanted byte down to the bottom, then cut away everything above it.</p>
          ${H.table(['channel', 'expression', 'value'], [['red', '(c &gt;&gt;&gt; 16) &amp; 0xFF', '18'], ['green', '(c &gt;&gt;&gt; 8) &amp; 0xFF', '171'], ['blue', 'c &amp; 0xFF', '52']])}
          <p>Packing goes the other way: <code>(r &lt;&lt; 16) | (g &lt;&lt; 8) | b</code>.</p>`,
        code: { lang: 'java', code: `int c = 0x12AB34;
int r = (c >>> 16) & 0xFF, g = (c >>> 8) & 0xFF, b = c & 0xFF;
System.out.println(r + " " + g + " " + b);              // 18 171 52
System.out.println(((r << 16) | (g << 8) | b) == c);    // true`, alt: [{ lang: 'python', run: true, code: `c = 0x12AB34
r, g, b = (c >> 16) & 0xFF, (c >> 8) & 0xFF, c & 0xFF   # c >= 0, so >> is safe
print(r, g, b)                                    # 18 171 52
print(((r << 16) | (g << 8) | b) == c)            # True` },
  { lang: 'js', run: true, code: `const c = 0x12AB34;
const r = (c >>> 16) & 0xFF, g = (c >>> 8) & 0xFF, b = c & 0xFF;
console.log(r, g, b);                             // 18 171 52
console.log(((r << 16) | (g << 8) | b) === c);    // true` },
  { lang: 'cpp', code: `uint32_t c = 0x12AB34;
uint32_t r = (c >> 16) & 0xFF, g = (c >> 8) & 0xFF, b = c & 0xFF;   // unsigned: >> fills with 0
cout << r << ' ' << g << ' ' << b << '\\n';                          // 18 171 52
cout << boolalpha << (((r << 16) | (g << 8) | b) == c) << '\\n';     // true` }] }
      },
      {
        title: 'The precedence trap: x &amp; 1 == 0',
        html: `<p>In Java <code>==</code> is evaluated <b>before</b> <code>&amp;</code>. So <code>x &amp; 1 == 0</code> means <code>x &amp; (1 == 0)</code> → int &amp; boolean → <span class="c-r">compile error</span>. In C++ and JavaScript it compiles and silently computes <code>x &amp; (1 == 0)</code> — a wrong answer with no warning. Python is the odd one out: there <code>&amp;</code> binds tighter than <code>==</code>, so it happens to work. Always bracket: <code>(x &amp; 1) == 0</code>.</p>
          ${H.table(['you write', 'Java reads it as', 'result'], [['x &amp; 1 == 0', 'x &amp; (1 == 0)', '<span class="c-r">does not compile</span>'], ['(x &amp; 1) == 0', '(x &amp; 1) == 0', '<span class="c-g">true for even x</span>']])}`
      },
      {
        title: '&amp;&amp; vs &amp; on booleans',
        html: `<p>On booleans, <code>&amp;</code> and <code>|</code> are also allowed but they <b>always evaluate both sides</b>. <code>&amp;&amp;</code> and <code>||</code> stop early. So <code>i &lt; n &amp;&amp; a[i] &gt; 0</code> is safe, but <code>i &lt; n &amp; a[i] &gt; 0</code> can throw <code>ArrayIndexOutOfBoundsException</code> when i == n.</p>`,
        code: { lang: 'java', code: `int[] a = {5};
int i = 1;
System.out.println(i < a.length && a[i] > 0); // false, right side skipped`, alt: [{ lang: 'python', run: true, code: `a = [5]
i = 1
print(i < len(a) and a[i] > 0)   # False, right side skipped (Python's & on bools does not short-circuit either)` },
  { lang: 'js', run: true, code: `const a = [5];
const i = 1;
console.log(i < a.length && a[i] > 0); // false, right side skipped` },
  { lang: 'cpp', code: `vector<int> a = {5};
size_t i = 1;
cout << boolalpha << (i < a.size() && a[i] > 0) << '\\n';   // false, a[1] is never read` }] }
      }
    ],
    deepDive: `<h4>How shifts really behave in Java</h4>
      <ul>
        <li>The shift amount is taken <b>mod 32</b> for int (only its low 5 bits) and <b>mod 64</b> for long (low 6 bits). So <code>x &lt;&lt; 33 == x &lt;&lt; 1</code> and <code>x &gt;&gt; -1 == x &gt;&gt; 31</code>.</li>
        <li><code>byte</code>, <code>short</code> and <code>char</code> are first <b>promoted to int</b>. <code>(byte) -16 &gt;&gt;&gt; 4</code> is computed on 32 bits (sign-extended), giving 268435455, not 15. Mask first: <code>(b &amp; 0xFF) &gt;&gt;&gt; 4</code>.</li>
        <li><code>b = b &lt;&lt; 1</code> does not compile for a byte (int result), but <code>b &lt;&lt;= 1</code> does (compound assignment hides a cast).</li>
        <li><code>x &gt;&gt; 1</code> rounds toward −∞; <code>x / 2</code> rounds toward 0. They differ only for negative odd x.</li>
      </ul>
      <h4>Hardware and speed</h4>
      <p>Each bitwise op is one CPU instruction taking about one cycle and operating on all 32/64 columns <b>in parallel</b>. Modern JIT compilers already rewrite <code>x * 8</code> into a shift and <code>x % 8</code> on non-negative values into a mask, so in normal code write the clear version. Use bit operators when the problem is <b>about bits</b> (flags, masks, sets) — not as a micro-optimisation.</p>
      <h4>Other languages</h4>
      <p>C/C++ have no <code>&gt;&gt;&gt;</code>: use unsigned types. JavaScript converts to 32-bit ints for bit ops and has <code>&gt;&gt;&gt;</code> (<code>-1 &gt;&gt;&gt; 0</code> is 4294967295). Python has no <code>&gt;&gt;&gt;</code> and unlimited width; <code>~x</code> is still <code>-x-1</code>.</p>`,
    aiEra: `<p><b>What AI changes:</b> autocompletion writes mask expressions in a blink, and reviewers increasingly read AI-written bit code rather than writing it. The skill moves from typing <code>(x &gt;&gt;&gt; 8) &amp; 0xFF</code> to <b>spotting</b> the one character that is wrong.</p>
      <p><b>Use AI as a partner:</b> paste a line and ask <code>Explain this expression column by column for x = -20 using 8-bit drawings</code>, or <code>Which of these shifts behave differently for negative inputs?</code>.</p>
      <p><b>Where AI goes wrong:</b> using <code>&gt;&gt;</code> where <code>&gt;&gt;&gt;</code> is needed (infinite loop on negatives), writing <code>1 &lt;&lt; k</code> for k ≥ 32 instead of <code>1L &lt;&lt; k</code>, dropping brackets around <code>&amp;</code> comparisons, and porting <code>&gt;&gt;&gt;</code> to Python as <code>&gt;&gt;</code>.</p>
      <p><b>What you must still own:</b> the truth table, the difference between the three shifts, and the precedence rule — these are asked directly in interviews and in code review.</p>`,
    viz: {
      title: 'Shift animation: watch the switches slide',
      input: '13 << 2',
      inputLabel: 'x op k  (op is <<, >> or >>>; try 13 << 2, -20 >> 2, -20 >>> 2)',
      gen: function (input) {
        var m = /^\s*(-?\d+)\s*(<<|>>>|>>)\s*(\d+)\s*$/.exec(String(input === undefined ? '' : input));
        if (!m) throw new Error('Type something like 13 << 2, -20 >> 2 or -20 >>> 2 (number, operator, shift count).');
        var x = parseInt(m[1], 10), op = m[2], k = parseInt(m[3], 10);
        if (x < -32768 || x > 32767) throw new Error('Please keep x between -32768 and 32767.');
        if (k < 1 || k > 31) throw new Error('Shift count k must be between 1 and 31.');
        var w = 16;
        if (op === '>>>' && x < 0) w = 32;
        if (op === '<<' && Math.abs(x * Math.pow(2, k)) > 32767) w = 32;
        var opHtml = op === '<<' ? '&lt;&lt;' : op === '>>' ? '&gt;&gt;' : '&gt;&gt;&gt;';
        var frames = [];
        frames.push({
          narr: 'We will compute <b>' + x + ' ' + opHtml + ' ' + k + '</b> one single slide at a time, using ' + w + ' switches' + (w === 32 ? ' (the full Java int, because the left end matters here)' : '') + '.',
          parts: [{ type: 'bits', label: 'x = ' + x, value: x, width: w }, { type: 'vars', vals: { x: x, op: op, k: k } }]
        });
        var rule = op === '<<' ? 'Shift <b>left</b>: every switch moves one place to the left, the leftmost one falls off, and a <b>0</b> enters at bit 0. Each slide doubles the value.'
          : op === '>>' ? 'Shift <b>right (arithmetic)</b>: every switch moves one place to the right, bit 0 falls off, and the <b>sign bit is copied</b> into the leftmost place (0 for positives, 1 for negatives). Each slide halves the value, rounding down.'
            : 'Shift <b>right (unsigned, Java\'s &gt;&gt;&gt;)</b>: every switch moves one place right, bit 0 falls off, and a <b>0</b> always enters on the left — even for negative numbers. That is the only difference from &gt;&gt;.';
        frames.push({ narr: rule, parts: [{ type: 'bits', label: 'x = ' + x, value: x, width: w, hl: op === '<<' ? one(w - 1, 'bad') : one(0, 'bad') }, { type: 'text', html: '<small>Red = the switch that will fall off on the first slide.</small>' }] });
        var v = x;
        for (var s = 1; s <= k; s++) {
          var nv, dropped, enter, hl = {};
          if (op === '<<') { dropped = (v >> (w - 1)) & 1; nv = v << 1; enter = 0; hl[0] = 'ok'; }
          else if (op === '>>') { dropped = v & 1; nv = v >> 1; enter = nv < 0 ? 1 : 0; hl[w - 1] = enter ? 'cur' : 'ok'; }
          else { dropped = v & 1; nv = (v >>> 1) | 0; enter = 0; hl[w - 1] = 'ok'; }
          var meaning = op === '<<' ? v + ' × 2 = ' + nv : '⌊' + v + ' ÷ 2⌋ = ' + nv;
          if (op === '<<' && nv !== v * 2) meaning = v + ' × 2 should be ' + (v * 2) + ' but it does not fit in an int, so it <b>overflows</b> to ' + nv;
          if (op === '>>>' && v < 0) meaning = 'the sign is gone, so the value jumps to the big positive ' + nv;
          frames.push({
            narr: 'Slide #' + s + ': a <b>' + dropped + '</b> falls off the ' + (op === '<<' ? 'left' : 'right') + ' end, a <b>' + enter + '</b> enters on the ' + (op === '<<' ? 'right' : 'left') + (op === '>>' && enter ? ' (copy of the sign bit, so it stays negative)' : '') + '. Value: ' + meaning + '.',
            parts: [{ type: 'bits', label: 'before', value: v, width: w }, { type: 'bits', label: 'after slide ' + s, value: nv, width: w, hl: hl }, { type: 'vars', vals: { slide: s + ' of ' + k, value: nv } }]
          });
          v = nv;
        }
        var formula = op === '<<' ? x + ' × 2<sup>' + k + '</sup>' : op === '>>' ? '⌊' + x + ' ÷ 2<sup>' + k + '</sup>⌋' : (x < 0 ? 'the 32 raw switches read as an unsigned number and shifted' : '⌊' + x + ' ÷ 2<sup>' + k + '</sup>⌋ (same as &gt;&gt; for non-negatives)');
        frames.push({
          narr: 'Done: <b>' + x + ' ' + opHtml + ' ' + k + ' = ' + v + '</b>, which is ' + formula + '. In Java you write it in one step; the machine does all ' + k + ' slides at once.',
          parts: [{ type: 'bits', label: 'x', value: x, width: w }, { type: 'bits', label: 'result', value: v, width: w, hl: onesHl(v, w, 'sel') }]
        });
        return frames;
      }
    }
  });

  // ===================== TOPIC 4: XOR properties =====================
  topics.push({
    title: 'XOR Properties: The Magic Cancel Button',
    analogy: `<p>Think of the <b>staircase light</b> again: one bulb, a switch at the bottom and a switch at the top. Every press of any switch <b>toggles</b> the bulb. Press the same switch twice → the bulb is back where it started, as if nothing happened. And it does not matter <b>in which order</b> people press the switches; only <b>how many times</b> (odd or even) counts.</p>
      <p>XOR is exactly that toggle. "Doing something twice undoes it" is the whole secret behind a big family of interview questions.</p>`,
    explain: `<p>XOR (<code>^</code>) gives 1 in a column when the two bits are <b>different</b>. You can also think of it as "add the bits but throw away the carry". From that, four rules follow:</p>
      ${H.table(['rule', 'in words', 'tiny proof with 5 = 101'], [
        ['<b>x ^ x = 0</b>', 'anything XOR itself cancels', '101 ^ 101 = 000'],
        ['<b>x ^ 0 = x</b>', 'XOR with 0 changes nothing', '101 ^ 000 = 101'],
        ['<b>a ^ b = b ^ a</b>', 'order of the two does not matter (commutative)', '101 ^ 011 = 011 ^ 101 = 110'],
        ['<b>(a ^ b) ^ c = a ^ (b ^ c)</b>', 'grouping does not matter (associative)', 'so you can XOR a whole list in any order']
      ])}
      <p>Put them together: in <code>a ^ b ^ a</code> we may reorder to <code>a ^ a ^ b</code> = <code>0 ^ b</code> = <b>b</b>. <span class="c-g">Every value that appears an even number of times vanishes; what remains is the XOR of the values that appear an odd number of times.</span></p>
      ${H.bits(5, 4, { label: 'a = 5' })}
      ${H.bits(3, 4, { label: 'b = 3' })}
      ${H.bits(5 ^ 3, 4, { label: 'a ^ b = 6', hl: { 2: 'y', 1: 'y' } })}
      ${H.bits(6 ^ 5, 4, { label: '(a ^ b) ^ a = 3 = b', hl: { 1: 'g', 0: 'g' } })}
      <h4>More useful facts</h4>
      <ul>
        <li><b>Undo rule:</b> if <code>a ^ b = c</code> then <code>a ^ c = b</code> and <code>b ^ c = a</code>. XOR is its own "undo" (used in encryption and in the swap trick below).</li>
        <li><b>Per column:</b> bit i of <code>a ^ b ^ c ^ …</code> is 1 exactly when an <b>odd</b> number of the values have bit i ON.</li>
        <li><b>Prefix XOR:</b> just like prefix sums, <code>xor(l..r) = px[r] ^ px[l-1]</code>, because the shared part <code>px[l-1]</code> cancels itself.</li>
        <li><b>XOR of 1..n</b> follows a 4-step pattern: n % 4 == 0 → n, 1 → 1, 2 → n + 1, 3 → 0. Example: 1^2^3 = 0, 1^2^3^4 = 4.</li>
        <li><b>Swap without a temp variable:</b> <code>a ^= b; b ^= a; a ^= b;</code> (cute, but never use it when a and b might be the <b>same variable</b> — it would zero it).</li>
        <li><b>a ^ b == 0</b> exactly when a == b. <b>Integer.bitCount(a ^ b)</b> = number of positions where they differ.</li>
      </ul>`,
    clues: [
      '"Every element appears <b>twice</b> except one" / "appears an even number of times" → XOR everything; pairs cancel.',
      '"Find the <b>missing</b> number" or "the <b>duplicate</b>" from a known range → XOR the expected range with the given values.',
      '"XOR of a <b>subarray / range</b>" or "count subarrays with XOR = K" → prefix XOR (like prefix sums, but with ^).',
      '"Toggle", "flip", "odd number of times", "parity" → XOR.',
      '"Number of positions where two numbers <b>differ</b>" → <code>bitCount(a ^ b)</code>.'
    ],
    code: { lang: 'java', code: `
      class XorFacts {
          // XOR of all numbers 1..n in O(1) using the repeating pattern of period 4.
          static int xorUpTo(int n) {
              switch (n % 4) {
                  case 0: return n;      // 1^2^3^4 = 4
                  case 1: return 1;      // 1^2^3^4^5 = 1
                  case 2: return n + 1;  // 1^2 = 3
                  default: return 0;     // 1^2^3 = 0
              }
          }

          // XOR of a[l..r] using a prefix XOR array (px[i] = a[0]^...^a[i-1]).
          static int rangeXor(int[] px, int l, int r) {
              return px[r + 1] ^ px[l];  // the common part a[0..l-1] cancels itself
          }

          public static void main(String[] args) {
              int a = 5, b = 3;
              System.out.println(a ^ a);       // 0  (x ^ x = 0)
              System.out.println(a ^ 0);       // 5  (x ^ 0 = x)
              System.out.println(a ^ b ^ a);   // 3  (the a's cancel)

              // swap without temp (only safe for two DIFFERENT variables)
              a ^= b;   // a = 5^3
              b ^= a;   // b = 3^(5^3) = 5
              a ^= b;   // a = (5^3)^5 = 3
              System.out.println(a + " " + b); // 3 5

              int[] arr = {4, 7, 1, 7};
              int[] px = new int[arr.length + 1];
              for (int i = 0; i < arr.length; i++) px[i + 1] = px[i] ^ arr[i];
              System.out.println(rangeXor(px, 1, 3)); // 7^1^7 = 1
              System.out.println(xorUpTo(4));         // 4
          }
      }`, alt: [{ lang: 'python', run: true, code: `from itertools import accumulate
from operator import xor

def xor_up_to(n):
    return [n, 1, n + 1, 0][n % 4]     # pattern of period 4

def range_xor(px, l, r):
    return px[r + 1] ^ px[l]           # the common prefix cancels itself

a, b = 5, 3
print(a ^ a, a ^ 0, a ^ b ^ a)         # 0 5 3

a ^= b; b ^= a; a ^= b                 # XOR swap (in Python just write a, b = b, a)
print(a, b)                            # 3 5

arr = [4, 7, 1, 7]
px = [0, *accumulate(arr, xor)]        # px[i] = arr[0] ^ ... ^ arr[i-1]
print(range_xor(px, 1, 3))             # 7^1^7 = 1
print(xor_up_to(4))                    # 4` },
  { lang: 'js', run: true, code: `function xorUpTo(n) {
  return [n, 1, n + 1, 0][n % 4];      // pattern of period 4
}

function rangeXor(px, l, r) {
  return px[r + 1] ^ px[l];            // the common prefix cancels itself
}

let a = 5, b = 3;
console.log(a ^ a, a ^ 0, a ^ b ^ a);  // 0 5 3

a ^= b; b ^= a; a ^= b;                // XOR swap (in JS: [a, b] = [b, a])
console.log(a, b);                     // 3 5

const arr = [4, 7, 1, 7];
const px = [0];
for (const x of arr) px.push(px[px.length - 1] ^ x);
console.log(rangeXor(px, 1, 3));       // 1
console.log(xorUpTo(4));               // 4` },
  { lang: 'cpp', code: `#include <bits/stdc++.h>
using namespace std;

int xorUpTo(int n) {
    switch (n % 4) {                   // pattern of period 4
        case 0: return n;
        case 1: return 1;
        case 2: return n + 1;
        default: return 0;
    }
}

int rangeXor(const vector<int>& px, int l, int r) {
    return px[r + 1] ^ px[l];          // the common prefix cancels itself
}

int main() {
    int a = 5, b = 3;
    cout << (a ^ a) << ' ' << (a ^ 0) << ' ' << (a ^ b ^ a) << '\\n';   // 0 5 3
    a ^= b; b ^= a; a ^= b;            // XOR swap (in real code: std::swap(a, b))
    cout << a << ' ' << b << '\\n';     // 3 5

    vector<int> arr = {4, 7, 1, 7}, px(arr.size() + 1, 0);
    for (size_t i = 0; i < arr.size(); ++i) px[i + 1] = px[i] ^ arr[i];
    cout << rangeXor(px, 1, 3) << '\\n'; // 1
    cout << xorUpTo(4) << '\\n';         // 4
}` }] },
    codeTitle: 'XOR rules in code: pattern, prefix XOR, swap',
    examples: [
      {
        title: 'Missing number in 0..n with XOR',
        html: `<p>nums = [3, 0, 1] holds n = 3 values from 0..3, one is missing. XOR all <b>indexes 0..n</b> together with all <b>values</b>: every present number appears twice (once as an index, once as a value) and cancels.</p>
          ${H.table(['source', 'numbers'], [['0..3', '0, 1, 2, 3'], ['nums', '3, 0, 1'], ['twins cancel', '0, 1, 3 → gone'], ['left over', '<span class="c-p">2</span>']])}
          <p>Answer <b>2</b>. Unlike the "sum formula" n(n+1)/2 − sum, XOR can never overflow.</p>`,
        code: { lang: 'java', code: `int[] nums = {3, 0, 1};
int x = nums.length;                       // start with n itself
for (int i = 0; i < nums.length; i++) x ^= i ^ nums[i];
System.out.println(x);                      // 2`, alt: [{ lang: 'python', run: true, code: `nums = [3, 0, 1]
x = len(nums)                  # start with n itself
for i, v in enumerate(nums):
    x ^= i ^ v
print(x)                       # 2` },
  { lang: 'js', run: true, code: `const nums = [3, 0, 1];
let x = nums.length;           // start with n itself
nums.forEach((v, i) => { x ^= i ^ v; });
console.log(x);                // 2` },
  { lang: 'cpp', code: `vector<int> nums = {3, 0, 1};
int x = nums.size();           // start with n itself
for (int i = 0; i < (int)nums.size(); ++i) x ^= i ^ nums[i];
cout << x << '\\n';             // 2` }] }
      },
      {
        title: 'XOR of 1..n without a loop',
        html: `<p>Running XOR of 1, 2, 3, … repeats a pattern every 4 numbers:</p>
          ${H.table(['n', '1 ^ … ^ n', 'n % 4', 'rule'], [['1', '1', '1', '1'], ['2', '3', '2', 'n + 1'], ['3', '0', '3', '0'], ['4', '4', '0', 'n'], ['5', '1', '1', '1'], ['6', '7', '2', 'n + 1'], ['7', '0', '3', '0'], ['8', '8', '0', 'n']])}
          <p>Why? Every even number 2m and the next one 2m + 1 differ only in bit 0, so each such pair XORs to 1. Two pairs make 1 ^ 1 = 0. So the answer only depends on n % 4.</p>`
      },
      {
        title: 'Range XOR with prefix XOR',
        html: `<p>Just like prefix sums: <code>px[i]</code> = XOR of the first i values. Then <code>xor(l..r) = px[r + 1] ^ px[l]</code> because the shared front part cancels itself.</p>
          ${H.arr([4, 7, 1, 7], { label: 'a', hl: { 1: 'b', 2: 'b', 3: 'b' } })}
          ${H.arr([0, 4, 3, 2, 5], { label: 'px', hl: { 1: 'y', 4: 'y' } })}
          <p>xor(1..3) = px[4] ^ px[1] = 5 ^ 4 = <b>1</b>, and directly 7 ^ 1 ^ 7 = 1 ✔.</p>`
      },
      {
        title: 'Find the extra letter (two strings)',
        html: `<p>t is s with one extra letter shuffled in: s = "abcd", t = "abcde". XOR every char of both strings — matched letters cancel, the extra one remains: <b>'e'</b>. Chars are just numbers in Java and C++, so XOR works directly; in Python use <code>ord</code>/<code>chr</code>, in JavaScript <code>charCodeAt</code>/<code>String.fromCharCode</code>.</p>`,
        code: { lang: 'java', code: `String s = "abcd", t = "abcde";
char x = 0;
for (char ch : (s + t).toCharArray()) x ^= ch;
System.out.println(x); // e`, alt: [{ lang: 'python', run: true, code: `from functools import reduce

s, t = "abcd", "abcde"
x = reduce(lambda acc, ch: acc ^ ord(ch), s + t, 0)   # chars become numbers with ord()
print(chr(x))                                         # e` },
  { lang: 'js', run: true, code: `const s = 'abcd', t = 'abcde';
let x = 0;
for (const ch of s + t) x ^= ch.charCodeAt(0);   // chars become numbers with charCodeAt
console.log(String.fromCharCode(x));             // e` },
  { lang: 'cpp', code: `string s = "abcd", t = "abcde";
char x = 0;
for (char ch : s + t) x ^= ch;   // a char is a small integer in C++
cout << x << '\\n';               // e` }] }
      }
    ],
    deepDive: `<h4>XOR is "addition without carry"</h4>
      <p>Per column, XOR is addition mod 2. That gives the useful identity <code>a + b = (a ^ b) + 2·(a &amp; b)</code>: XOR is the sum ignoring carries, and AND marks exactly where carries are born. Repeating this until the carry is 0 is how you add two numbers using only bit operators (a practice problem below), and it is how a hardware adder works.</p>
      <h4>Why order never matters (group view)</h4>
      <p>XOR is commutative, associative, has identity 0 and every value is its own inverse. Mathematicians call this an abelian group (in fact a vector space over GF(2)). Consequence: XOR-reduce can be split across threads or machines and combined in any order — <code>Arrays.stream(a).parallel().reduce(0, (x, y) -&gt; x ^ y)</code> is correct. A later module uses the vector-space view ("XOR basis") to find the maximum subset XOR.</p>
      <h4>Production uses</h4>
      <ul>
        <li><b>RAID-5 parity:</b> the parity disk stores D1 ^ D2 ^ D3. If D2 dies, D2 = parity ^ D1 ^ D3. Same "undo" rule as the missing number.</li>
        <li><b>Checksums and hashing:</b> mixing steps in hash functions use XOR with shifts (e.g. Java's <code>HashMap.hash</code> does <code>h ^ (h &gt;&gt;&gt; 16)</code> to spread high bits into the low bits used for the bucket index).</li>
        <li><b>Encryption:</b> stream ciphers XOR data with a key stream; XOR again with the same stream decrypts.</li>
      </ul>
      <h4>Swap trick caveats</h4>
      <p>The XOR swap is slower than a temp variable on modern CPUs (each step depends on the previous one) and destroys the value if both names point to the same memory (<code>a[i] ^= a[j]</code> when i == j). Know it, explain it, do not use it in production.</p>`,
    aiEra: `<p><b>What AI changes:</b> "XOR everything" solutions are the kind of trick an assistant suggests instantly. Your edge is knowing <b>when the trick is valid</b> — every other value must appear an even number of times — and proving it in one sentence.</p>
      <p><b>Use AI as a partner:</b> <code>Give me 5 problems that look like "XOR cancels pairs" but where XOR fails, and explain why</code>. Also <code>Turn this prefix-sum solution into a prefix-XOR solution and list what changes</code>.</p>
      <p><b>Where AI goes wrong:</b> applying XOR when values appear three times, using the sum formula and overflowing, forgetting to XOR n itself in Missing Number, and suggesting the swap trick on array elements with possibly equal indexes.</p>
      <p><b>What you must still own:</b> the four rules (x ^ x = 0, x ^ 0 = x, order free, self-undo) and the per-column parity view — they let you invent new XOR solutions instead of recalling them.</p>`,
    viz: {
      title: 'XOR swap: three toggles exchange two numbers',
      input: '5 9',
      inputLabel: 'two numbers a b (0 to 255)',
      gen: function (input) {
        var v = toList(input, 0, 255, 2, 'two numbers a and b');
        if (v.length !== 2) throw new Error('Please type exactly two numbers, like: 5 9');
        var a = v[0], b = v[1], A = a, B = b, w = Math.max(4, bitLen(Math.max(a, b))), frames = [];
        frames.push({
          narr: 'We will swap a = <b>' + A + '</b> and b = <b>' + B + '</b> without a spare box, using only XOR. The idea: XOR mixes the two, and XOR-ing again with one of them <b>un-mixes</b> (because x ^ x = 0).',
          parts: [{ type: 'bits', label: 'a', value: a, width: w }, { type: 'bits', label: 'b', value: b, width: w }]
        });
        var na = a ^ b;
        frames.push({
          narr: 'Step 1: <code>a = a ^ b</code>. Now a holds the "difference pattern": a 1 wherever ' + A + ' and ' + B + ' differ. a = <b>' + na + '</b>.',
          parts: [{ type: 'bits', label: 'a (now a^b)', value: na, width: w, hl: onesHl(na, w, 'cur') }, { type: 'bits', label: 'b', value: b, width: w }]
        });
        a = na;
        var nb = b ^ a;
        frames.push({
          narr: 'Step 2: <code>b = b ^ a</code> = ' + B + ' ^ (' + A + ' ^ ' + B + '). The two copies of ' + B + ' cancel, leaving <b>' + nb + '</b> — the original a! ' + (nb === A ? '✔' : ''),
          parts: [{ type: 'bits', label: 'a (still a^b)', value: a, width: w }, { type: 'bits', label: 'b (now original a)', value: nb, width: w, hl: diffHl(b, nb, w, 'ok') }]
        });
        b = nb;
        var na2 = a ^ b;
        frames.push({
          narr: 'Step 3: <code>a = a ^ b</code> = (' + A + ' ^ ' + B + ') ^ ' + A + '. The two copies of ' + A + ' cancel, leaving <b>' + na2 + '</b> — the original b!',
          parts: [{ type: 'bits', label: 'a (now original b)', value: na2, width: w, hl: diffHl(a, na2, w, 'ok') }, { type: 'bits', label: 'b', value: b, width: w }]
        });
        a = na2;
        frames.push({
          narr: 'Swapped: a = <b>' + a + '</b>, b = <b>' + b + '</b>. Every step used only the rules x ^ x = 0 and x ^ 0 = x. (Warning: if a and b were the <b>same variable</b>, step 1 would make it 0 and the value would be lost.)',
          parts: [{ type: 'bits', label: 'a', value: a, width: w, hl: onesHl(a, w, 'sel') }, { type: 'bits', label: 'b', value: b, width: w, hl: onesHl(b, w, 'sel') }, { type: 'vars', vals: { a: a, b: b } }]
        });
        return frames;
      }
    }
  });

  // ===================== TOPIC 5: Check / set / clear / toggle bit i =====================
  topics.push({
    title: 'Check, Set, Clear and Toggle the i-th Bit (Masks)',
    analogy: `<p>Imagine the switch panel is covered by a <b>cardboard stencil</b> with exactly one hole cut out, right over switch number <b>i</b>. That stencil is a <b>mask</b>. With it you can:</p>
      <ul>
        <li><b>Check</b>: peek through the hole — is that one switch on?</li>
        <li><b>Set</b>: push through the hole to turn it <b>on</b> (if already on, nothing changes).</li>
        <li><b>Clear</b>: push through the hole to force that switch <b>off</b> (if already off, nothing changes).</li>
        <li><b>Toggle</b>: flick it to the opposite state.</li>
      </ul>
      <p>Every other switch is protected by the cardboard, so nothing else changes.</p>`,
    explain: `<p>The mask with only bit i ON is <code>1 &lt;&lt; i</code>. Then each job is one operator:</p>
      ${H.table(['job', 'code', 'why it works'], [
        ['check bit i', '<code>(n &gt;&gt; i) &amp; 1</code> or <code>(n &amp; (1 &lt;&lt; i)) != 0</code>', '&amp; with the mask wipes every other column; what is left is nonzero only if bit i was ON'],
        ['set bit i (make 1)', '<code>n | (1 &lt;&lt; i)</code>', 'x | 1 = 1 and x | 0 = x: only column i is forced on'],
        ['clear bit i (make 0)', '<code>n &amp; ~(1 &lt;&lt; i)</code>', '~mask is all ones except column i; x &amp; 1 = x, x &amp; 0 = 0'],
        ['toggle bit i', '<code>n ^ (1 &lt;&lt; i)</code>', 'x ^ 1 flips, x ^ 0 keeps']
      ])}
      <h4>Example: n = 13 (1101)</h4>
      ${H.bits(13, 4, { label: 'n = 13', hl: { 2: 'y' } })}
      ${H.table(['operation', 'i = 1 (bit is 0)', 'i = 2 (bit is 1)'], [
        ['mask', '0010', '0100'],
        ['check', '1101 &amp; 0010 = 0000 → <b>OFF</b>', '1101 &amp; 0100 = 0100 → <b>ON</b>'],
        ['set', '1101 | 0010 = <span class="c-g">1111</span> = 15', '1101 | 0100 = 1101 = 13 (already on)'],
        ['clear', '1101 &amp; 1101 = 1101 = 13 (already off)', '1101 &amp; 1011 = <span class="c-r">1001</span> = 9'],
        ['toggle', '1101 ^ 0010 = <span class="c-g">1111</span> = 15', '1101 ^ 0100 = <span class="c-r">1001</span> = 9']
      ])}
      <h4>Common traps</h4>
      <ul>
        <li><code>(n &amp; (1 &lt;&lt; i)) == 1</code> is <b>wrong</b> for i &gt; 0 — the result is 2<sup>i</sup>, not 1. Compare with <code>!= 0</code>, or shift first: <code>(n &gt;&gt; i) &amp; 1</code>.</li>
        <li>For bit 31 the mask <code>1 &lt;&lt; 31</code> is negative; that is fine for &amp; | ^, just don't compare it with <code>&gt; 0</code>.</li>
        <li>For a <code>long</code>, write <code>1L &lt;&lt; i</code>; plain <code>1 &lt;&lt; 40</code> is an int and wraps to <code>1 &lt;&lt; 8</code>.</li>
        <li>Related one-liners: <code>n &amp; (n - 1)</code> clears the <b>lowest</b> ON bit, <code>n &amp; -n</code> keeps only the lowest ON bit, <code>n &amp; ((1 &lt;&lt; i) - 1)</code> keeps only bits below i.</li>
      </ul>`,
    clues: [
      '"Is the <b>i-th bit</b> set?", "turn on / turn off feature k", "flip bit k" → masks <code>1 &lt;&lt; k</code> with &amp;, |, &amp;~, ^.',
      '"<b>Flags</b>", "permissions", "which lights are on", "visited set of at most 30 items" → keep them in ONE int and use bit i per item.',
      '"Make the minimum number of bit <b>flips</b>" → compare numbers column by column with <code>(x &gt;&gt; i) &amp; 1</code>.',
      'State of <code>N ≤ 20</code> on/off items in DP (bitmask DP) → checking/setting bit i of the mask is the core move.',
      '"Odd / even" → just check bit 0: <code>(n &amp; 1)</code>.'
    ],
    code: { lang: 'java', code: `
      class BitOps {
          static boolean isSet(int n, int i)  { return ((n >> i) & 1) == 1; }  // peek through the hole
          static int setBit(int n, int i)     { return n | (1 << i); }         // force ON
          static int clearBit(int n, int i)   { return n & ~(1 << i); }        // force OFF
          static int toggleBit(int n, int i)  { return n ^ (1 << i); }         // flip

          public static void main(String[] args) {
              int n = 13;                                // 1101
              System.out.println(isSet(n, 1));           // false
              System.out.println(isSet(n, 2));           // true
              System.out.println(setBit(n, 1));          // 15 (1111)
              System.out.println(clearBit(n, 2));        // 9  (1001)
              System.out.println(toggleBit(n, 0));       // 12 (1100)

              long big = 0L;
              big |= 1L << 40;                           // long mask needs 1L
              System.out.println(Long.numberOfTrailingZeros(big)); // 40
          }
      }`, alt: [{ lang: 'python', run: true, code: `def is_set(n, i):    return ((n >> i) & 1) == 1   # peek through the hole
def set_bit(n, i):   return n | (1 << i)          # force ON
def clear_bit(n, i): return n & ~(1 << i)         # force OFF
def toggle_bit(n, i): return n ^ (1 << i)         # flip

n = 13                                            # 1101
print(is_set(n, 1))                               # False
print(is_set(n, 2))                               # True
print(set_bit(n, 1))                              # 15 (1111)
print(clear_bit(n, 2))                            # 9  (1001)
print(toggle_bit(n, 0))                           # 12 (1100)

big = 0
big |= 1 << 40                                    # no 1L needed: Python ints grow as needed
print((big & -big).bit_length() - 1)              # 40 (index of the lowest ON bit)` },
  { lang: 'js', run: true, code: `const isSet = (n, i) => ((n >> i) & 1) === 1;   // peek through the hole
const setBit = (n, i) => n | (1 << i);            // force ON
const clearBit = (n, i) => n & ~(1 << i);         // force OFF
const toggleBit = (n, i) => n ^ (1 << i);         // flip

const n = 13;                                     // 1101
console.log(isSet(n, 1));                         // false
console.log(isSet(n, 2));                         // true
console.log(setBit(n, 1));                        // 15 (1111)
console.log(clearBit(n, 2));                      // 9  (1001)
console.log(toggleBit(n, 0));                     // 12 (1100)

// Bitwise ops are 32-bit: 1 << 40 is really 1 << 8. Use BigInt past bit 31.
let big = 0n;
big |= 1n << 40n;
console.log(big.toString(2).length - 1);          // 40` },
  { lang: 'cpp', code: `#include <bits/stdc++.h>
using namespace std;

bool isSet(int n, int i)   { return (n >> i) & 1; }    // peek through the hole
int setBit(int n, int i)   { return n | (1 << i); }    // force ON
int clearBit(int n, int i) { return n & ~(1 << i); }   // force OFF
int toggleBit(int n, int i){ return n ^ (1 << i); }    // flip

int main() {
    int n = 13;                                        // 1101
    cout << boolalpha << isSet(n, 1) << ' ' << isSet(n, 2) << '\\n';   // false true
    cout << setBit(n, 1) << '\\n';                      // 15 (1111)
    cout << clearBit(n, 2) << '\\n';                    // 9  (1001)
    cout << toggleBit(n, 0) << '\\n';                   // 12 (1100)

    uint64_t big = 0;
    big |= 1ULL << 40;                                 // 64-bit mask needs 1ULL (1 << 40 is undefined)
    cout << countr_zero(big) << '\\n';                  // 40
}` }] },
    codeTitle: 'The four mask operations',
    examples: [
      {
        title: 'Permission flags in one int',
        html: `<p>READ = 1 (bit 0), WRITE = 2 (bit 1), EXEC = 4 (bit 2). A user with read + exec has <code>perms = READ | EXEC = 5</code> (101).</p>
          ${H.table(['action', 'expression', 'result'], [['can write?', '(5 &amp; WRITE) != 0', '<span class="c-r">false</span>'], ['grant write', '5 | WRITE', '7 (111)'], ['revoke exec', '7 &amp; ~EXEC', '3 (011)'], ['flip read', '3 ^ READ', '2 (010)']])}
          <p>This is the same idea as Linux <code>chmod 755</code>: 7 = rwx, 5 = r-x.</p>`,
        code: { lang: 'java', code: `final int READ = 1, WRITE = 2, EXEC = 4;
int perms = READ | EXEC;
System.out.println((perms & WRITE) != 0); // false
perms |= WRITE;                            // 7
perms &= ~EXEC;                            // 3
System.out.println(perms);                 // 3`, alt: [{ lang: 'python', run: true, code: `READ, WRITE, EXEC = 1, 2, 4
perms = READ | EXEC
print((perms & WRITE) != 0)   # False
perms |= WRITE                # 7
perms &= ~EXEC                # 3
print(perms)                  # 3` },
  { lang: 'js', run: true, code: `const READ = 1, WRITE = 2, EXEC = 4;
let perms = READ | EXEC;
console.log((perms & WRITE) !== 0); // false
perms |= WRITE;                     // 7
perms &= ~EXEC;                     // 3
console.log(perms);                 // 3` },
  { lang: 'cpp', code: `constexpr int READ = 1, WRITE = 2, EXEC = 4;
int perms = READ | EXEC;
cout << boolalpha << ((perms & WRITE) != 0) << '\\n';  // false
perms |= WRITE;                                        // 7
perms &= ~EXEC;                                        // 3
cout << perms << '\\n';                                 // 3` }] }
      },
      {
        title: 'Letters of a word as a 26-bit set',
        html: `<p>Give letter <code>c</code> the bit <code>c - 'a'</code>. "bad" → bits 1, 0, 3 → mask 1011 = 11. "feed" → bits 5, 4, 3 → mask 11 1000 = 56. Do the words share a letter? <code>11 &amp; 56 = 8 ≠ 0</code> → yes, they share 'd' (bit 3). One AND replaces a nested loop over the letters.</p>
          ${H.bits(11, 8, { label: 'bad', hl: { 3: 'r' } })}
          ${H.bits(56, 8, { label: 'feed', hl: { 3: 'r' } })}`,
        code: { lang: 'java', code: `int mask = 0;
for (char c : "bad".toCharArray()) mask |= 1 << (c - 'a');
System.out.println(mask); // 11`, alt: [{ lang: 'python', run: true, code: `mask = 0
for c in "bad":
    mask |= 1 << (ord(c) - ord("a"))
print(mask)  # 11` },
  { lang: 'js', run: true, code: `let mask = 0;
for (const c of 'bad') mask |= 1 << (c.charCodeAt(0) - 97);   // 97 = 'a'
console.log(mask); // 11` },
  { lang: 'cpp', code: `int mask = 0;
for (char c : string("bad")) mask |= 1 << (c - 'a');
cout << mask << '\\n'; // 11` }] }
      },
      {
        title: 'Set bit i to a given value v (0 or 1)',
        html: `<p>First clear it, then OR in the new value: <code>(n &amp; ~(1 &lt;&lt; i)) | (v &lt;&lt; i)</code>. For n = 13 (1101), i = 1, v = 1: clear → 1101, then | 0010 → <b>1111 = 15</b>. With v = 0 and i = 2: clear → 1001, | 0 → <b>9</b>. No if-statement needed.</p>`
      },
      {
        title: 'Clear all bits from i down to 0',
        html: `<p>Build a mask of the low i + 1 bits, <code>(1 &lt;&lt; (i + 1)) - 1</code>, flip it, and AND. n = 27 (11011), i = 2: low mask = 00111, ~ = …11000, 27 &amp; ~7 = 11000 = <b>24</b>. Opposite job — keep only the low bits — is <code>n &amp; ((1 &lt;&lt; (i + 1)) - 1)</code> = 011 = 3.</p>
          ${H.bits(27, 5, { label: '27', hl: { 2: 'r', 1: 'r', 0: 'r' } })}
          ${H.bits(24, 5, { label: '27 &amp; ~7', hl: { 4: 'g', 3: 'g' } })}`
      }
    ],
    deepDive: `<h4>One int = a set of up to 32 things</h4>
      <p>When the "universe" is small (≤ 32 or ≤ 64 items), an int/long is a perfect set: <b>add</b> = <code>|= 1 &lt;&lt; i</code>, <b>remove</b> = <code>&amp;= ~(1 &lt;&lt; i)</code>, <b>contains</b> = <code>(s &gt;&gt; i) &amp; 1</code>, <b>union</b> = <code>a | b</code>, <b>intersection</b> = <code>a &amp; b</code>, <b>difference</b> = <code>a &amp; ~b</code>, <b>size</b> = <code>Integer.bitCount(s)</code>, <b>subset test</b> = <code>(a &amp; b) == a</code>. Every operation is O(1) and the whole set is one machine word — it can be a HashMap key or a DP index.</p>
      <h4>The JDK does this for you</h4>
      <ul>
        <li><code>EnumSet</code> with ≤ 64 constants is a <b>single long</b> internally (RegularEnumSet); bigger enums use a long[] (JumboEnumSet).</li>
        <li><code>java.util.BitSet</code> is a growable long[] for millions of flags (sieve of Eratosthenes, visited arrays, Bloom filters).</li>
        <li>Feature flags, file permissions, TCP header flags (SYN, ACK, FIN) and graphics state are all bit masks.</li>
      </ul>
      <h4>Edge cases</h4>
      <ul>
        <li>Bit 31: <code>1 &lt;&lt; 31</code> is <code>Integer.MIN_VALUE</code>. Checking with <code>(n &amp; mask) != 0</code> works; <code>&gt; 0</code> fails.</li>
        <li>Indexes ≥ 32 need <code>long</code> and <code>1L &lt;&lt; i</code>; ≥ 64 need <code>BitSet</code>.</li>
        <li>In concurrent code, "read-modify-write" of a shared mask is not atomic: use <code>AtomicInteger.getAndUpdate(m -&gt; m | bit)</code> or <code>AtomicLong</code>.</li>
      </ul>`,
    aiEra: `<p><b>What AI changes:</b> AI writes <code>isSet/setBit/clearBit</code> helpers perfectly — they are the most common bit code on the internet. The interview value is in <b>choosing</b> a bitmask as the data structure ("visited set of ≤ 16 cities", "letters used by a word") and explaining why it beats a <code>HashSet</code>.</p>
      <p><b>Use AI as a partner:</b> <code>Here is my HashSet&lt;Character&gt; solution; rewrite it with a 26-bit mask and explain the trade-off</code>, then verify both on the same tests.</p>
      <p><b>Where AI goes wrong:</b> comparing <code>(n &amp; (1 &lt;&lt; i)) == 1</code>, using int masks for 40+ items, forgetting <code>~</code> when clearing, and suggesting a bitmask where the universe is huge (10<sup>5</sup> items — use BitSet or a boolean array).</p>
      <p><b>What you must still own:</b> the four mask moves without thinking, plus the set-algebra table (union, intersection, difference, subset) as one-liners.</p>`,
    viz: {
      title: 'Mask in action: check, set, clear, toggle bit i',
      input: '13 2',
      inputLabel: 'n (0 to 255) and bit index i (0 to 7)',
      gen: function (input) {
        var v = toList(input, 0, 255, 2, 'n and i');
        if (v.length !== 2) throw new Error('Please type two numbers: n and i, like: 13 2');
        var n = v[0], i = v[1];
        if (i > 7) throw new Error('i must be between 0 and 7 (we show 8 switches).');
        var mask = 1 << i, w = 8, on = (n >> i) & 1, frames = [];
        frames.push({
          narr: 'n = <b>' + n + '</b>. We care about switch <b>i = ' + i + '</b> (worth ' + mask + '). Right now it is ' + (on ? '<span class="c-g">ON</span>' : 'OFF') + '. We want to touch <b>only</b> that switch and leave the others alone.',
          parts: [{ type: 'bits', label: 'n', value: n, width: w, hl: one(i, 'cur'), ptr: one(i, 'i') }]
        });
        frames.push({
          narr: 'Build the stencil (mask): start with 1 and shift it left i = ' + i + ' times: <code>1 &lt;&lt; ' + i + '</code> = <b>' + mask + '</b>. Only switch ' + i + ' is ON in the mask.',
          parts: [{ type: 'bits', label: 'n', value: n, width: w, ptr: one(i, 'i') }, { type: 'bits', label: 'mask = 1 &lt;&lt; ' + i, value: mask, width: w, hl: one(i, 'sel') }]
        });
        var c = n & mask;
        frames.push({
          narr: '<b>CHECK</b>: <code>n &amp; mask</code> = ' + c + '. AND keeps a column only if both are 1, and the mask is 0 everywhere except column ' + i + '. ' + (c ? 'Result is nonzero → bit ' + i + ' is <span class="c-g">ON</span>.' : 'Result is 0 → bit ' + i + ' is OFF.'),
          parts: [{ type: 'bits', label: 'n', value: n, width: w }, { type: 'bits', label: 'mask', value: mask, width: w, hl: one(i, 'sel') }, { type: 'bits', label: 'n &amp; mask', value: c, width: w, hl: one(i, c ? 'ok' : 'cur') }]
        });
        var s = n | mask;
        frames.push({
          narr: '<b>SET</b>: <code>n | mask</code> = <b>' + s + '</b>. OR forces column ' + i + ' to 1 and copies every other column unchanged. ' + (on ? 'It was already ON, so n did not change.' : 'Switch ' + i + ' just turned ON (+' + mask + ').'),
          parts: [{ type: 'bits', label: 'n', value: n, width: w }, { type: 'bits', label: 'mask', value: mask, width: w, hl: one(i, 'sel') }, { type: 'bits', label: 'n | mask', value: s, width: w, hl: one(i, on ? 'cur' : 'ok') }]
        });
        var cl = n & ~mask;
        frames.push({
          narr: '<b>CLEAR</b>: first flip the mask, <code>~mask</code>, so it is all ones except a 0 at column ' + i + '. Then <code>n &amp; ~mask</code> = <b>' + cl + '</b>: columns with 1 in ~mask are copied, column ' + i + ' is forced to 0. ' + (on ? 'Switch ' + i + ' turned OFF (−' + mask + ').' : 'It was already OFF, so nothing changed.'),
          parts: [{ type: 'bits', label: 'n', value: n, width: w }, { type: 'bits', label: '~mask', value: ~mask, width: w, hl: one(i, 'bad'), dec: '~' + mask }, { type: 'bits', label: 'n &amp; ~mask', value: cl, width: w, hl: one(i, on ? 'bad' : 'cur') }]
        });
        var t = n ^ mask;
        frames.push({
          narr: '<b>TOGGLE</b>: <code>n ^ mask</code> = <b>' + t + '</b>. XOR with 1 flips, XOR with 0 keeps. So only switch ' + i + ' flips: ' + (on ? 'ON → OFF.' : 'OFF → ON.'),
          parts: [{ type: 'bits', label: 'n', value: n, width: w }, { type: 'bits', label: 'mask', value: mask, width: w, hl: one(i, 'sel') }, { type: 'bits', label: 'n ^ mask', value: t, width: w, hl: one(i, on ? 'bad' : 'ok') }]
        });
        frames.push({
          narr: 'Summary for n = ' + n + ', i = ' + i + '. Same mask, four different operators, four different jobs — and every other switch stayed exactly as it was.',
          parts: [{ type: 'text', html: H.table(['job', 'expression', 'result'], [['check', 'n &amp; mask', c ? 'nonzero → ON' : '0 → OFF'], ['set', 'n | mask', String(s)], ['clear', 'n &amp; ~mask', String(cl)], ['toggle', 'n ^ mask', String(t)]]) }]
        });
        return frames;
      }
    }
  });

  // ===================== TOPIC 6: Brian Kernighan =====================
  topics.push({
    title: 'Brian Kernighan\'s Trick: n &amp; (n − 1) Removes the Lowest Set Bit',
    analogy: `<p>A row of birthday candles, some lit, some not. Every time you blow, you put out exactly the <b>rightmost lit candle</b> — never wasting a breath on an unlit one. Count your breaths until everything is dark: that is the number of lit candles.</p>
      <p>The slow way is to walk past <b>every</b> candle (all 32 positions) and check each one. Kernighan's way only spends a breath per <b>lit</b> candle.</p>`,
    explain: `<p><b>What does n − 1 do to the bits?</b> Subtracting 1 has to "borrow" from the lowest 1: that lowest 1 becomes 0 and every 0 to its right becomes 1. Everything to the <b>left</b> of it stays the same.</p>
      ${H.bits(12, 4, { label: 'n = 12', hl: { 2: 'y' } })}
      ${H.bits(11, 4, { label: 'n − 1 = 11', hl: { 2: 'r', 1: 'r', 0: 'r' } })}
      ${H.bits(8, 4, { label: 'n &amp; (n − 1) = 8', hl: { 2: 'r' } })}
      <p>So <code>n &amp; (n - 1)</code> keeps the left part (same in both) and wipes the lowest 1 and everything right of it (they differ). <span class="c-g">Net effect: exactly one ON switch — the lowest — turns off.</span></p>
      <h4>Counting set bits</h4>
      ${H.table(['step', 'n (binary)', 'n − 1', 'n &amp; (n − 1)', 'count'], [['1', '101100 (44)', '101011', '<span class="c-r">101000</span> (40)', '1'], ['2', '101000 (40)', '100111', '<span class="c-r">100000</span> (32)', '2'], ['3', '100000 (32)', '011111', '<span class="c-r">000000</span> (0)', '3']])}
      <p>The loop ran <b>3</b> times for 44 — once per ON switch — not 32 times. For numbers with few ON bits that is a big saving; in the worst case (all 32 ON) it is the same as the simple loop.</p>
      <h4>Power of two in one line</h4>
      <p>A power of two (1, 2, 4, 8, …) has <b>exactly one</b> ON switch. Remove it with <code>n &amp; (n - 1)</code> and you get 0. Any other positive number still has a switch left. So: <code>n &gt; 0 &amp;&amp; (n &amp; (n - 1)) == 0</code>. (The <code>n &gt; 0</code> part throws out 0 and negatives.)</p>
      <h4>Sister trick</h4>
      <p><code>n &amp; -n</code> <b>keeps only</b> the lowest ON switch (12 &amp; −12 = 4). Kernighan <b>removes</b> it, this one <b>isolates</b> it. Built-ins: <code>Integer.bitCount(n)</code>, <code>Integer.lowestOneBit(n)</code>, <code>Integer.numberOfTrailingZeros(n)</code>.</p>`,
    clues: [
      '"Count the number of <b>1 bits</b>", "Hamming weight", "set bits" → Kernighan loop or <code>Integer.bitCount</code>.',
      '"Is n a <b>power of two</b>?" / "exactly one bit set" → <code>n &gt; 0 &amp;&amp; (n &amp; (n - 1)) == 0</code>.',
      '"Visit only the <b>ON bits</b> of a mask" (e.g. members of a subset) → repeat <code>m &amp;= m - 1</code>, use <code>m &amp; -m</code> to get each one.',
      '"How many bits differ between a and b" → <code>bitCount(a ^ b)</code> using this loop.',
      'Count bits for every number 0..n → <code>bits[i] = bits[i &amp; (i - 1)] + 1</code> (DP on the Kernighan step).'
    ],
    code: { lang: 'java', code: `
      class KernighanDemo {
          static int countBits(int n) {
              int count = 0;
              while (n != 0) {        // works for negatives too (32 ones in -1)
                  n &= (n - 1);       // switch off the lowest ON bit
                  count++;            // one breath per lit candle
              }
              return count;
          }
          public static void main(String[] args) {
              System.out.println(countBits(44));          // 3
              System.out.println(countBits(-1));          // 32
              System.out.println(Integer.bitCount(44));   // 3 (built-in)
              System.out.println(44 & -44);               // 4 (only the lowest ON bit kept)
          }
      }`, alt: [{ lang: 'python', run: true, code: `def count_bits(n):
    n &= 0xFFFFFFFF          # without this, a negative n never reaches 0
    count = 0
    while n:
        n &= n - 1           # switch off the lowest ON bit
        count += 1           # one breath per lit candle
    return count

print(count_bits(44))        # 3
print(count_bits(-1))        # 32
print((44).bit_count())      # 3 (built-in, Python 3.10+)
print(44 & -44)              # 4 (only the lowest ON bit kept)` },
  { lang: 'js', run: true, code: `function countBits(n) {
  let count = 0;
  while (n !== 0) {          // & works on 32-bit ints, so -1 ends after 32 rounds
    n &= n - 1;              // switch off the lowest ON bit
    count++;
  }
  return count;
}

console.log(countBits(44));  // 3
console.log(countBits(-1));  // 32
console.log(44 & -44);       // 4 (only the lowest ON bit kept)` },
  { lang: 'cpp', code: `#include <bits/stdc++.h>
using namespace std;

int countBits(uint32_t n) {    // unsigned: n - 1 never overflows
    int count = 0;
    while (n) {
        n &= n - 1;            // switch off the lowest ON bit
        ++count;
    }
    return count;
}

int main() {
    cout << countBits(44) << '\\n';    // 3
    cout << countBits(-1) << '\\n';    // 32 (-1 converts to 0xFFFFFFFF)
    cout << popcount(44u) << '\\n';    // 3 (C++20 <bit>)
    cout << (44 & -44) << '\\n';       // 4
}` }] },
    codeTitle: 'Kernighan loop',
    examples: [
      {
        title: 'Counting bits for every number 0..n (DP on n &amp; (n − 1))',
        html: `<p><code>i &amp; (i − 1)</code> is i with one fewer ON bit, and it is <b>smaller</b> than i, so its answer is already known: <code>bits[i] = bits[i &amp; (i − 1)] + 1</code>.</p>
          ${H.table(['i', 'binary', 'i &amp; (i − 1)', 'bits[i]'], [['0', '000', '–', '0'], ['1', '001', '0', '0 + 1 = 1'], ['2', '010', '0', '0 + 1 = 1'], ['3', '011', '2', '1 + 1 = 2'], ['4', '100', '0', '0 + 1 = 1'], ['5', '101', '4', '1 + 1 = 2'], ['6', '110', '4', '1 + 1 = 2'], ['7', '111', '6', '2 + 1 = 3']])}
          <p>O(n) total instead of O(n log n).</p>`,
        code: { lang: 'java', code: `int n = 7;
int[] bits = new int[n + 1];
for (int i = 1; i <= n; i++) bits[i] = bits[i & (i - 1)] + 1;
System.out.println(Arrays.toString(bits)); // [0, 1, 1, 2, 1, 2, 2, 3]`, alt: [{ lang: 'python', run: true, code: `n = 7
bits = [0] * (n + 1)
for i in range(1, n + 1):
    bits[i] = bits[i & (i - 1)] + 1
print(bits)  # [0, 1, 1, 2, 1, 2, 2, 3]` },
  { lang: 'js', run: true, code: `const n = 7;
const bits = new Array(n + 1).fill(0);
for (let i = 1; i <= n; i++) bits[i] = bits[i & (i - 1)] + 1;
console.log(bits); // [0, 1, 1, 2, 1, 2, 2, 3]` },
  { lang: 'cpp', code: `int n = 7;
vector<int> bits(n + 1, 0);
for (int i = 1; i <= n; ++i) bits[i] = bits[i & (i - 1)] + 1;
for (int b : bits) cout << b << ' ';   // 0 1 1 2 1 2 2 3` }] }
      },
      {
        title: 'Power of four',
        html: `<p>Powers of four (1, 4, 16, 64…) are powers of two whose single ON bit sits at an <b>even</b> position. The mask <code>0x55555555</code> = 0101…0101 has every even position ON.</p>
          ${H.table(['n', 'power of 2?', 'n &amp; 0x55555555', 'power of 4?'], [['16 (bit 4)', 'yes', '16 ≠ 0', '<span class="c-g">yes</span>'], ['8 (bit 3)', 'yes', '0', '<span class="c-r">no</span>'], ['12', 'no', '–', '<span class="c-r">no</span>']])}`,
        code: { lang: 'java', code: `int n = 16;
boolean powerOfFour = n > 0 && (n & (n - 1)) == 0 && (n & 0x55555555) != 0;
System.out.println(powerOfFour); // true`, alt: [{ lang: 'python', run: true, code: `n = 16
power_of_four = n > 0 and (n & (n - 1)) == 0 and (n & 0x55555555) != 0
print(power_of_four)  # True` },
  { lang: 'js', run: true, code: `const n = 16;
const powerOfFour = n > 0 && (n & (n - 1)) === 0 && (n & 0x55555555) !== 0;
console.log(powerOfFour); // true` },
  { lang: 'cpp', code: `int n = 16;
bool powerOfFour = n > 0 && (n & (n - 1)) == 0 && (n & 0x55555555) != 0;
cout << boolalpha << powerOfFour << '\\n'; // true` }] }
      },
      {
        title: 'Visit only the ON bits of a mask',
        html: `<p>m = 22 (10110). Repeat: <code>low = m &amp; -m</code> (isolate lowest ON bit), use it, then <code>m &amp;= m - 1</code> (remove it).</p>
          ${H.table(['m', 'm &amp; -m', 'bit index', 'm &amp; (m − 1)'], [['10110 (22)', '00010 (2)', '1', '10100 (20)'], ['10100 (20)', '00100 (4)', '2', '10000 (16)'], ['10000 (16)', '10000 (16)', '4', '0 → stop']])}
          <p>3 rounds for 3 ON bits. <code>Integer.numberOfTrailingZeros(low)</code> turns the isolated bit into its index.</p>`,
        code: { lang: 'java', code: `int m = 22;
while (m != 0) {
    int low = m & -m;
    System.out.print(Integer.numberOfTrailingZeros(low) + " "); // 1 2 4
    m &= m - 1;
}`, alt: [{ lang: 'python', run: true, code: `m = 22
while m:
    low = m & -m
    print(low.bit_length() - 1, end=" ")   # 1 2 4
    m &= m - 1
print()` },
  { lang: 'js', run: true, code: `let m = 22;
const out = [];
while (m !== 0) {
  const low = m & -m;
  out.push(31 - Math.clz32(low));   // index of the isolated bit
  m &= m - 1;
}
console.log(out.join(' '));         // 1 2 4` },
  { lang: 'cpp', code: `unsigned m = 22;
while (m) {
    unsigned low = m & (0u - m);          // unsigned negate is well defined
    cout << countr_zero(low) << ' ';      // 1 2 4
    m &= m - 1;
}` }] }
      },
      {
        title: 'Round up to the next power of two',
        html: `<p>Useful for hash table sizes and segment trees. <code>Integer.highestOneBit(x)</code> keeps only the top ON bit. For n &gt; 1: <code>Integer.highestOneBit(n − 1) &lt;&lt; 1</code>. n = 5 → highestOneBit(4) = 4 → <b>8</b>. n = 8 → highestOneBit(7) = 4 → <b>8</b> (already a power, stays). The "−1" is what keeps exact powers from doubling.</p>`
      }
    ],
    deepDive: `<h4>Proof that n &amp; (n − 1) removes exactly the lowest 1</h4>
      <p>Write n = <code>P 1 0…0</code> (some prefix P, then the lowest 1, then k zeros). Subtracting 1 borrows through the zeros: n − 1 = <code>P 0 1…1</code>. AND column by column: P &amp; P = P, 1 &amp; 0 = 0, and each 0 &amp; 1 = 0. Result <code>P 0 0…0</code>. ∎ The same picture shows <code>n &amp; -n</code> = <code>0…0 1 0…0</code>, because −n = ~n + 1 = <code>~P 1 0…0</code>.</p>
      <h4>How Integer.bitCount is O(1)</h4>
      <p>The JDK uses a "SWAR" (SIMD within a register) trick: add neighbouring bits in pairs, then pairs of pairs, then nibbles, in 5 steps: <code>i - ((i &gt;&gt;&gt; 1) &amp; 0x55555555)</code>, then <code>(i &amp; 0x33333333) + ((i &gt;&gt;&gt; 2) &amp; 0x33333333)</code>, and so on. On modern CPUs the JIT replaces the whole method with a single <code>POPCNT</code> instruction. Same for <code>numberOfTrailingZeros</code> (TZCNT) and <code>numberOfLeadingZeros</code> (LZCNT).</p>
      <h4>Where these tricks live in real systems</h4>
      <ul>
        <li><code>HashMap</code> keeps its capacity a power of two (<code>tableSizeFor</code> rounds up) so the bucket is <code>hash &amp; (n − 1)</code> instead of a slow modulo.</li>
        <li><b>Fenwick trees</b> (a later module) step through indexes with <code>i += i &amp; -i</code> and <code>i -= i &amp; -i</code>.</li>
        <li>Allocators and buffer pools use power-of-two sizes and alignment checks like <code>(addr &amp; (align − 1)) == 0</code>.</li>
      </ul>
      <h4>Complexity honesty</h4>
      <p>Kernighan's loop is O(number of 1s) ≤ 32 — "O(1)" for fixed-width ints. It only beats the 32-step scan when masks are sparse; in interviews, mention <code>Integer.bitCount</code> as the production answer.</p>`,
    aiEra: `<p><b>What AI changes:</b> any assistant will produce <code>n &gt; 0 &amp;&amp; (n &amp; (n - 1)) == 0</code> immediately. Interviewers know this, so they ask <b>why</b> it works, what happens for 0 and <code>Integer.MIN_VALUE</code>, and to extend it (power of four, counting bits for all n).</p>
      <p><b>Use AI as a partner:</b> <code>Walk me through n &amp; (n-1) for n = 40, 1, 0 and -8 as 8-bit drawings, then quiz me</code>. Ask it to generate a table of <code>i, bitCount(i)</code> and check your DP against it.</p>
      <p><b>Where AI goes wrong:</b> dropping the <code>n &gt; 0</code> guard, claiming Kernighan is always faster than <code>bitCount</code>, and using <code>while (n != 0) n &gt;&gt;= 1</code> which never ends for negative n.</p>
      <p><b>What you must still own:</b> the borrow picture of n − 1, the difference between "remove lowest" (<code>n &amp; (n − 1)</code>) and "isolate lowest" (<code>n &amp; -n</code>), and the edge cases.</p>`,
    viz: {
      title: 'Kernighan: each n & (n−1) blows out the rightmost lit switch',
      input: '44',
      inputLabel: 'n (0 to 65535)',
      gen: function (input) {
        var n = toInt(input, 0, 65535, 'n');
        var w = n <= 255 ? 8 : 16, frames = [], count = 0, cur = n;
        frames.push({
          narr: 'n = <b>' + n + '</b> has ' + popcount(n) + ' switch(es) ON. Instead of checking all ' + w + ' positions, we will remove one ON switch per step and count the steps.',
          parts: [{ type: 'bits', label: 'n', value: n, width: w, hl: onesHl(n, w, 'ok') }, { type: 'vars', vals: { count: 0 } }]
        });
        frames.push({
          narr: 'The rule: <code>n - 1</code> turns the <b>lowest 1</b> into 0 and all the 0s to its right into 1s. Everything left of it is untouched. So <code>n &amp; (n - 1)</code> keeps the left part and wipes out exactly that lowest 1.',
          parts: [{ type: 'text', html: H.bits(12, 4, { label: '12', hl: { 2: 'y' } }) + H.bits(11, 4, { label: '11', hl: { 2: 'r', 1: 'r', 0: 'r' } }) + H.bits(8, 4, { label: '12 &amp; 11', hl: { 2: 'r' } }) }]
        });
        if (n === 0) {
          frames.push({ narr: 'n is already 0: no switch is ON, so the <code>while (n != 0)</code> loop never runs.', parts: [{ type: 'bits', label: 'n', value: 0, width: w }, { type: 'vars', vals: { count: 0 } }] });
        }
        while (cur !== 0) {
          var low = 0; while (!((cur >> low) & 1)) low++;
          var m1 = cur - 1, nx = cur & m1;
          count++;
          var hlM = {}; for (var j = 0; j <= low; j++) hlM[j] = 'bad';
          frames.push({
            narr: 'Step ' + count + ': lowest ON switch of ' + cur + ' is bit <b>' + low + '</b>. ' + cur + ' − 1 = ' + m1 + ' flips bits 0..' + low + '. AND-ing them: ' + cur + ' &amp; ' + m1 + ' = <b>' + nx + '</b>. One switch gone → count = <b>' + count + '</b>.' + (nx === 0 ? ' n is now 0, so we stop.' : ''),
            parts: [
              { type: 'bits', label: 'n', value: cur, width: w, hl: one(low, 'cur'), ptr: one(low, 'low') },
              { type: 'bits', label: 'n − 1', value: m1, width: w, hl: hlM },
              { type: 'bits', label: 'n &amp; (n − 1)', value: nx, width: w, hl: one(low, 'bad') },
              { type: 'vars', vals: { count: count }, hl: { count: 'ok' } }
            ]
          });
          cur = nx;
        }
        frames.push({
          narr: 'Done: <b>' + n + '</b> has <b>' + count + '</b> set bit(s). The loop ran ' + count + ' time(s), not ' + w + '. ' + (n > 0 && (n & (n - 1)) === 0 ? 'Bonus: it ran only once, so ' + n + ' is a <b>power of two</b>.' : (n > 0 ? 'Bonus: it ran more than once, so ' + n + ' is <b>not</b> a power of two.' : '')),
          parts: [{ type: 'bits', label: 'original n', value: n, width: w, hl: onesHl(n, w, 'sel') }, { type: 'vars', vals: { 'set bits': count }, hl: { 'set bits': 'ok' } }]
        });
        return frames;
      }
    },
    problems: [
      {
        title: 'Count Set Bits (Number of 1 Bits)',
        level: 'Easy',
        tags: ['bits', 'Kernighan'],
        statement: `<p>Given an integer <code>n</code>, return how many bits are <b>1</b> in its 32-bit binary form (also called its <b>Hamming weight</b>). Treat negative numbers by their 2's complement bits (so −1 has 32 ones).</p>`,
        constraints: `−2<sup>31</sup> ≤ n ≤ 2<sup>31</sup> − 1. Asked up to 10<sup>5</sup> times, so make each call fast.`,
        example: `${H.bits(44, 8, { label: 'n = 44', hl: { 5: 'g', 3: 'g', 2: 'g' } })}<p>Output: <b>${H.c('p', '3')}</b> because 44 = 32 + 8 + 4, three switches ON (${H.c('g', 'bits 5, 3, 2')}).</p><p>n = −1 → output <b>32</b> (all switches ON in 2's complement).</p>`,
        brute: {
          why: `<p>Check all 32 positions one by one: <code>(n &gt;&gt;&gt; i) &amp; 1</code> for i = 0..31. It is correct and only 32 steps, but it looks at every switch even when only one is ON. The wasted work: checking positions that are OFF. (Careful: a version that loops <code>while (n != 0)</code> with <code>n &gt;&gt;= 1</code> never ends for negative n, because &gt;&gt; keeps copying the sign bit 1.)</p>`,
          code: `
            int countBitsBrute(int n) {
                int count = 0;
                for (int i = 0; i < 32; i++) {
                    if (((n >>> i) & 1) == 1) count++;  // look at every switch
                }
                return count;
            }`
        },
        mcq: {
          q: 'What does <code>n &amp; (n - 1)</code> do to n = 40 (101000)?',
          options: ['Turns off the lowest ON bit → 32 (100000)', 'Turns off the highest ON bit → 8 (001000)', 'Turns on the lowest OFF bit → 41', 'Divides n by 2 → 20'],
          answer: 0,
          explain: '40 − 1 = 39 = 100111. 101000 &amp; 100111 = 100000 = 32: the lowest 1 (bit 3) disappeared, the rest stayed.'
        },
        hints: [
          `<p><b>Aha:</b> <code>n - 1</code> flips the lowest 1 and everything to its right. So <code>n &amp; (n - 1)</code> removes exactly one ON bit. Count how many times you can do that before n becomes 0.</p>`,
          `<p>No data structure needed: just one <code>int count</code> and the loop <code>while (n != 0) { n &amp;= n - 1; count++; }</code>.</p>`,
          `<p>Traps: negative n is fine with this loop (−1 needs 32 rounds and <code>Integer.MIN_VALUE - 1</code> wraps to MAX, then MIN &amp; MAX = 0). In Python mask with <code>n &amp;= 0xFFFFFFFF</code> first; in C++ copy n into an <code>unsigned</code> so n − 1 cannot overflow. Do not use <code>n &gt;&gt;= 1</code> in a <code>while (n != 0)</code> loop for negatives (infinite). Recipe: count = 0 → while n ≠ 0: n = n &amp; (n − 1), count++ → return count.</p>`
        ],
        tests: { sig: 'int -> int', fn: 'hammingWeight', cases: [[[44], 3], [[0], 0], [[1], 1], [[-1], 32], [[-2147483648], 1], [[2147483647], 31], [[11], 3], [[-3], 31]] },
        solution: {
          approach: `<p>Brian Kernighan's loop: each round deletes the lowest ON bit, so the number of rounds equals the number of ON bits.</p>`,
          code: `
            class Solution {
                public int hammingWeight(int n) {
                    int count = 0;
                    while (n != 0) {
                        n = n & (n - 1);   // remove the lowest set bit
                        count++;           // we removed exactly one 1
                    }
                    return count;          // number of rounds = number of 1 bits
                }

                public static void main(String[] args) {
                    Solution s = new Solution();
                    System.out.println(s.hammingWeight(44));   // 3
                    System.out.println(s.hammingWeight(-1));   // 32
                }
            }`,
          alt: [
            { lang: 'python', code: `def hamming_weight(n):
    n &= 0xFFFFFFFF          # Python ints are unbounded: keep only the 32 bits
    count = 0
    while n:
        n &= n - 1           # remove the lowest set bit
        count += 1
    return count             # built-in: (n & 0xFFFFFFFF).bit_count()` },
            { lang: 'js', code: `function hammingWeight(n) {
  let count = 0;
  while (n !== 0) {
    n &= n - 1;            // & works on 32-bit ints, so -1 has 32 ones
    count++;
  }
  return count;
}` },
            { lang: 'cpp', code: `class Solution {
public:
    int hammingWeight(int n) {
        uint32_t u = static_cast<uint32_t>(n);  // unsigned: u - 1 never overflows
        int count = 0;
        while (u) {
            u &= u - 1;                         // remove the lowest set bit
            ++count;
        }
        return count;                           // built-in: std::popcount(u)
    }
};` }
          ],
          dry: {
            head: ['round', 'n before', 'n − 1', 'n &amp; (n − 1)', 'count'],
            rows: [
              ['1', '101100 (44)', '101011 (43)', '101000 (40)', '1'],
              ['2', '101000 (40)', '100111 (39)', '100000 (32)', '2'],
              ['3', '100000 (32)', '011111 (31)', '000000 (0)', '3'],
              ['end', '0', '–', '–', '<span class="c-p">return 3</span>']
            ]
          },
          complexity: `<p><b>Time O(k)</b> where k = number of 1 bits (at most 32), because every round removes one 1. <b>Space O(1)</b>: only a counter.</p>`
        }
      },
      {
        title: 'Power of Two',
        level: 'Easy',
        tags: ['bits', 'Kernighan'],
        statement: `<p>Given an integer <code>n</code>, return <code>true</code> if it is a power of two (n = 2<sup>x</sup> for some integer x ≥ 0), otherwise <code>false</code>. Try to do it without loops.</p>`,
        constraints: `−2<sup>31</sup> ≤ n ≤ 2<sup>31</sup> − 1`,
        example: `${H.bits(16, 8, { label: 'n = 16', hl: { 4: 'g' } })}<p>16 → <b>${H.c('g', 'true')}</b>: exactly one switch ON.</p>${H.bits(6, 8, { label: 'n = 6', hl: { 2: 'r', 1: 'r' } })}<p>6 → <b>${H.c('r', 'false')}</b>: two switches ON. Also 0 → false (no switch ON) and −8 → false (negative).</p>`,
        brute: {
          why: `<p>Keep dividing by 2 while n is even; at the end check if you reached 1. That takes up to 31 divisions. Not terrible, but it does repeated work: you are walking through every 0 bit just to find out whether there is more than one 1.</p>`,
          code: `
            boolean isPowerOfTwoBrute(int n) {
                if (n <= 0) return false;      // 0 and negatives are never powers of two
                while (n % 2 == 0) n /= 2;     // strip factors of 2
                return n == 1;                 // only a single 1 should remain
            }`
        },
        mcq: {
          q: 'Which check is correct for "n is a power of two"?',
          options: ['<code>(n &amp; (n - 1)) == 0</code>', '<code>n &gt; 0 &amp;&amp; (n &amp; (n - 1)) == 0</code>', '<code>n % 2 == 0</code>', '<code>(n &amp; 1) == 1</code>'],
          answer: 1,
          explain: 'Without <code>n &gt; 0</code>, n = 0 gives 0 &amp; (−1) = 0 and would wrongly say true (also Integer.MIN_VALUE). <code>n % 2 == 0</code> is true for 6, which is not a power of two.'
        },
        hints: [
          `<p><b>Aha:</b> powers of two look like 1, 10, 100, 1000 — <b>exactly one</b> switch is ON.</p>`,
          `<p>Kernighan's step <code>n &amp; (n - 1)</code> removes one ON switch. If the result is 0, there was exactly one. No loop, no extra memory.</p>`,
          `<p>Traps: 0 has zero ON switches and <code>0 &amp; -1 = 0</code> → would pass wrongly. <code>Integer.MIN_VALUE</code> (1 followed by 31 zeros) also has one ON switch but is negative. Recipe: return <code>n &gt; 0 &amp;&amp; (n &amp; (n - 1)) == 0</code>.</p>`
        ],
        tests: { sig: 'int -> bool', fn: 'isPowerOfTwo', cases: [[[16], true], [[6], false], [[0], false], [[1], true], [[-8], false], [[-2147483648], false], [[1073741824], true], [[2147483647], false], [[3], false]] },
        solution: {
          approach: `<p>One ON bit ⇔ removing the lowest ON bit leaves 0. Guard with n &gt; 0.</p>`,
          code: `
            class Solution {
                public boolean isPowerOfTwo(int n) {
                    // n > 0 rules out 0 and all negatives (incl. Integer.MIN_VALUE)
                    // n & (n - 1) removes the only ON bit of a power of two -> 0
                    return n > 0 && (n & (n - 1)) == 0;
                }

                public static void main(String[] args) {
                    Solution s = new Solution();
                    System.out.println(s.isPowerOfTwo(16)); // true
                    System.out.println(s.isPowerOfTwo(6));  // false
                    System.out.println(s.isPowerOfTwo(0));  // false
                }
            }`,
          alt: [
            { lang: 'python', code: `def is_power_of_two(n):
    # n > 0 rules out 0 and negatives; n & (n - 1) removes the only ON bit
    return n > 0 and n & (n - 1) == 0` },
            { lang: 'js', code: `function isPowerOfTwo(n) {
  // n > 0 rules out 0 and negatives; n & (n - 1) removes the only ON bit
  return n > 0 && (n & (n - 1)) === 0;
}` },
            { lang: 'cpp', code: `class Solution {
public:
    bool isPowerOfTwo(int n) {
        // n > 0 is checked first, so n - 1 can never overflow
        return n > 0 && (n & (n - 1)) == 0;   // C++20 also has std::has_single_bit
    }
};` }
          ],
          dry: {
            head: ['n', 'binary', 'n − 1', 'n &amp; (n − 1)', 'n &gt; 0', 'answer'],
            rows: [
              ['16', '10000', '01111', '0', 'yes', '<span class="c-g">true</span>'],
              ['6', '110', '101', '100 = 4', 'yes', '<span class="c-r">false</span>'],
              ['1', '1', '0', '0', 'yes', '<span class="c-g">true</span> (2<sup>0</sup>)'],
              ['0', '0', '−1 (all ones)', '0', '<span class="c-r">no</span>', '<span class="c-r">false</span>'],
              ['−8', '1…11000', '1…10111', '1…10000', '<span class="c-r">no</span>', '<span class="c-r">false</span>']
            ]
          },
          complexity: `<p><b>Time O(1)</b>: one subtraction, one AND, two comparisons — no loop at all. <b>Space O(1)</b>.</p>`
        }
      }
    ]
  });

  // ===================== TOPIC 7: Single Number I =====================
  topics.push({
    title: 'Single Number I: XOR Folding (Pairs Cancel Out)',
    analogy: `<p>You empty a laundry basket of socks onto the bed. Every sock has a twin… except one lonely sock. You could line them up and match them, but here is a lazier trick: keep <b>one hand</b> free. Pick up socks one at a time — if the twin is already in your hand, both go away; if not, hold it. At the end, your hand holds the lonely sock.</p>
      <p>XOR is that hand, but it does not even need to "search" for the twin: <code>x ^ x = 0</code> makes twins disappear automatically, in any order.</p>`,
    explain: `<p>Start with <code>res = 0</code> and XOR every number into it. Because XOR can be re-ordered freely (commutative + associative), the result is the same as if all twins were placed next to each other:</p>
      ${H.arr([4, 1, 2, 1, 2], { label: 'nums', hl: { 0: 'p', 1: 'b', 3: 'b', 2: 'y', 4: 'y' } })}
      <p>4 ^ 1 ^ 2 ^ 1 ^ 2 = 4 ^ ${H.c('b', '(1 ^ 1)')} ^ ${H.c('y', '(2 ^ 2)')} = 4 ^ 0 ^ 0 = ${H.c('p', '4')}</p>
      ${H.table(['i', 'nums[i]', 'res before', 'res after (binary)', 'res'], [['0', '4', '0', '100', '4'], ['1', '1', '4', '101', '5'], ['2', '2', '5', '111', '7'], ['3', '1', '7', '110', '6 (the 1s cancelled)'], ['4', '2', '6', '100', '<span class="c-p">4</span> (the 2s cancelled)']])}
      <p>Notice the middle values (5, 7, 6) look like nonsense — that is fine. They are "mixtures" that un-mix as each twin arrives. Column view: each bit of the answer is ON exactly when an <b>odd</b> number of the inputs have that bit ON, and the only "odd one" is the single number.</p>
      <p>Why it beats the usual tools: a HashMap of counts or a HashSet also work in O(N) but need O(N) extra memory; sorting needs O(N log N). XOR does it in <b>one pass with one int</b>.</p>`,
    clues: [
      '"Every element appears <b>twice</b> except for one" → XOR all.',
      '"Linear runtime and <b>constant extra space</b>" → rules out HashMap/sort, points to XOR.',
      '"Find the element that appears an <b>odd</b> number of times" → XOR all (even counts cancel).',
      'Values can be <b>negative</b> → still fine, XOR works on all 32 bits including the sign bit.'
    ],
    examples: [
      {
        title: 'Negative numbers work too',
        html: `<p>nums = [−3, 5, −3]. −3 ^ 5 is some strange negative number, but XOR-ing −3 again cancels it exactly: the result is <b>5</b>. XOR does not care about "sign" — it just compares 32 columns, and the sign bit is one more column.</p>`,
        code: { lang: 'java', code: `int res = 0;
for (int x : new int[]{-3, 5, -3}) res ^= x;
System.out.println(res); // 5`, alt: [{ lang: 'python', run: true, code: `res = 0
for x in [-3, 5, -3]:
    res ^= x          # negatives are fine: Python XORs them as if they had endless leading 1s
print(res)            # 5` },
  { lang: 'js', run: true, code: `let res = 0;
for (const x of [-3, 5, -3]) res ^= x;
console.log(res); // 5` },
  { lang: 'cpp', code: `int res = 0;
for (int x : {-3, 5, -3}) res ^= x;
cout << res << '\\n'; // 5` }] }
      },
      {
        title: 'The value that appears an odd number of times',
        html: `<p>nums = [7, 2, 7, 2, 7]. 7 appears 3 times, 2 appears twice. Pairs cancel: (7 ^ 7) ^ (2 ^ 2) ^ 7 = <b>7</b>. The general rule: XOR-all returns the XOR of all values with an <b>odd</b> count. If exactly one value has an odd count, you get that value.</p>
          ${H.arr([7, 2, 7, 2, 7], { label: 'nums', hl: { 0: 'p', 2: 'p', 4: 'p', 1: 'b', 3: 'b' } })}`
      },
      {
        title: 'Same idea with chars: find the extra letter',
        html: `<p>s = "abcd", t = "abcde" (t is s shuffled plus one letter). XOR all chars of both: every letter of s meets its twin in t. Result <b>'e'</b>. O(N) time, O(1) memory, no frequency array.</p>`
      },
      {
        title: 'HashSet version vs XOR version',
        html: `${H.table(['approach', 'time', 'extra space', 'note'], [['nested loops', 'O(N<sup>2</sup>)', 'O(1)', 'too slow for 3·10<sup>4</sup>'], ['sort, then scan pairs', 'O(N log N)', 'O(1)–O(N)', 'modifies input'], ['HashSet add/remove', 'O(N)', '<span class="c-r">O(N)</span>', 'breaks the space rule'], ['XOR fold', 'O(N)', '<span class="c-g">O(1)</span>', 'needs the "pairs" promise']])}
          <p>The HashSet trick (add if absent, remove if present) is literally a slow XOR — it toggles membership.</p>`,
        code: { lang: 'java', code: `Set<Integer> seen = new HashSet<>();
for (int x : new int[]{4, 1, 2, 1, 2}) if (!seen.add(x)) seen.remove(x);
System.out.println(seen); // [4]`, alt: [{ lang: 'python', run: true, code: `seen = set()
for x in [4, 1, 2, 1, 2]:
    seen ^= {x}        # symmetric difference = toggle membership, a slow XOR
print(seen)            # {4}` },
  { lang: 'js', run: true, code: `const seen = new Set();
for (const x of [4, 1, 2, 1, 2]) {
  if (seen.has(x)) seen.delete(x); else seen.add(x);   // toggle membership
}
console.log([...seen]); // [4]` },
  { lang: 'cpp', code: `unordered_set<int> seen;
for (int x : {4, 1, 2, 1, 2})
    if (!seen.insert(x).second) seen.erase(x);   // toggle membership
for (int x : seen) cout << x << '\\n';             // 4` }] }
      }
    ],
    deepDive: `<h4>Correctness proof (column view)</h4>
      <p>Pick any bit column b. Each twin pair adds 0 or 2 ON bits to that column, so the column's total parity equals the single number's bit b. XOR computes parity per column. Therefore every bit of the result equals the single number's bit. ∎ This proof also tells you exactly when the trick <b>breaks</b>: when other values do not appear an even number of times.</p>
      <h4>Invariant view</h4>
      <p>After processing a prefix, <code>res</code> = XOR of the values that have appeared an odd number of times in that prefix. Start: empty prefix, res = 0 ✔. Each step toggles one value's membership ✔. End: only the single number ✔.</p>
      <h4>Validation and robustness</h4>
      <p>XOR cannot <b>check</b> the promise. If the input is invalid (three singles, a triplet), it returns garbage silently. In production code that receives untrusted data, use a counting map or verify the answer with a second pass (count occurrences of res = 1).</p>
      <h4>Scaling out</h4>
      <p>Because XOR is associative and commutative, the job splits perfectly: each worker XORs its chunk, then the partial results are XORed together (a "reduce"). This works on streams too — memory stays one int no matter how many billions of numbers flow by.</p>`,
    aiEra: `<p><b>What AI changes:</b> this is the most famous bit-trick problem; an AI writes it in one line. Interviewers therefore use it as a <b>warm-up</b> and then pivot: "what if every number appears three times?", "what if two numbers are single?" — the next two topics.</p>
      <p><b>Use AI as a partner:</b> <code>Give me a broken input for XOR single-number and show what it returns</code>; <code>Prove XOR single-number correct with a per-bit parity argument in 3 sentences</code>.</p>
      <p><b>Where AI goes wrong:</b> starting from <code>nums[0]</code> and also XOR-ing it in the loop (cancels it), or recommending XOR for "appears three times" problems.</p>
      <p><b>What you must still own:</b> the parity proof, the invariant, and fast recognition of the clue "twice except one + O(1) space".</p>`,
    code: [{ lang: 'python', title: 'Same fold in Python (runnable)', run: true, code: `from functools import reduce
from operator import xor

nums = [4, 1, 2, 1, 2]
print(reduce(xor, nums, 0))  # 4

# negative values are fine too
print(reduce(xor, [-3, 5, -3], 0))  # 5`, alt: [
      { lang: 'java', code: `int[] nums = {4, 1, 2, 1, 2};
System.out.println(Arrays.stream(nums).reduce(0, (a, b) -> a ^ b));        // 4
System.out.println(Arrays.stream(new int[]{-3, 5, -3}).reduce(0, (a, b) -> a ^ b)); // 5` },
      { lang: 'js', run: true, code: `const nums = [4, 1, 2, 1, 2];
console.log(nums.reduce((a, b) => a ^ b, 0));          // 4
console.log([-3, 5, -3].reduce((a, b) => a ^ b, 0));   // 5` },
      { lang: 'cpp', code: `vector<int> nums = {4, 1, 2, 1, 2};
cout << accumulate(nums.begin(), nums.end(), 0, bit_xor<int>()) << '\\n';   // 4` }
    ] }],
    codeTitle: ['One-line XOR fold with reduce'],
    viz: {
      title: 'XOR folding: twins cancel, the single survives',
      input: '4 1 2 1 2',
      inputLabel: 'numbers 0..255, every value twice except one (max 15 numbers)',
      gen: function (input) {
        var a = toList(input, 0, 255, 15, 'numbers');
        var mx = 0; a.forEach(function (x) { if (x > mx) mx = x; });
        var w = Math.max(3, bitLen(mx)), res = 0, frames = [], odd = [];
        frames.push({
          narr: 'Start with <b>res = 0</b> (0 changes nothing under XOR). We will XOR every number into res. On the right we also track which values have been seen an <b>odd</b> number of times so far — that is exactly what res secretly "contains".',
          parts: [{ type: 'array', label: 'nums', values: a.slice() }, { type: 'bits', label: 'res', value: 0, width: w }, { type: 'set', label: 'values currently "inside" res (seen odd times)', items: [] }]
        });
        frames.push({
          narr: 'The two rules that make this work: <b>x ^ x = 0</b> (twins cancel) and <b>x ^ 0 = x</b> (0 changes nothing). And XOR does not care about order, so twins cancel even when they are far apart in the array.',
          parts: [{ type: 'text', html: H.table(['rule', 'example'], [['x ^ x = 0', '5 ^ 5 = 0'], ['x ^ 0 = x', '5 ^ 0 = 5'], ['order is free', '5 ^ 3 ^ 5 = 5 ^ 5 ^ 3 = 3']]) }, { type: 'code', label: 'the whole algorithm', lang: 'java', code: 'int res = 0;\nfor (int x : nums) res ^= x;\nreturn res;', hl: { 2: 'cur' } }]
        });
        for (var i = 0; i < a.length; i++) {
          var before = res; res ^= a[i];
          var k = odd.indexOf(a[i]), cancel = k >= 0, hlS = {};
          if (cancel) { odd.splice(k, 1); } else { odd.push(a[i]); hlS[String(a[i])] = 'ok'; }
          var ptr = {}; ptr[i] = 'i';
          var hlA = {}; for (var j = 0; j < i; j++) hlA[j] = 'done'; hlA[i] = 'cur';
          frames.push({
            narr: 'res = ' + before + ' ^ ' + a[i] + ' = <b>' + res + '</b>. ' + (cancel ? '<span class="c-r">' + a[i] + ' was already inside res</span>, so its twin cancels it out (x ^ x = 0): the changed switches are exactly the bits of ' + a[i] + ' flipping back.' : a[i] + ' is new, so it gets "mixed into" res. The switches that flipped are the ON bits of ' + a[i] + '.'),
            parts: [
              { type: 'array', label: 'nums', values: a.slice(), hl: hlA, ptr: ptr },
              { type: 'bits', label: 'res before', value: before, width: w },
              { type: 'bits', label: 'nums[' + i + '] = ' + a[i], value: a[i], width: w, hl: onesHl(a[i], w, 'cur') },
              { type: 'bits', label: 'res after', value: res, width: w, hl: diffHl(before, res, w, cancel ? 'bad' : 'ok') },
              { type: 'set', label: 'values currently "inside" res', items: odd.slice(), hl: hlS }
            ]
          });
        }
        frames.push({
          narr: odd.length === 1 && odd[0] === res ? 'All twins cancelled. Only <b>' + res + '</b> is left inside res — that is the single number. ✔' : 'Finished: res = <b>' + res + '</b>. The values seen an odd number of times were {' + odd.join(', ') + '}; with a valid input (all twins except one) only the single number would remain.',
          parts: [{ type: 'bits', label: 'answer', value: res, width: w, hl: onesHl(res, w, 'sel') }, { type: 'vars', vals: { answer: res }, hl: { answer: 'sel' } }]
        });
        return frames;
      }
    },
    problems: [
      {
        title: 'Single Number I',
        level: 'Easy',
        tags: ['XOR'],
        statement: `<p>You are given a non-empty integer array <code>nums</code>. Every element appears <b>exactly twice</b> except for one element, which appears <b>once</b>. Find that single element. You must use O(N) time and O(1) extra space.</p>`,
        constraints: `1 ≤ N ≤ 3·10<sup>4</sup>, −3·10<sup>4</sup> ≤ nums[i] ≤ 3·10<sup>4</sup>, N is odd.`,
        example: `${H.arr([4, 1, 2, 1, 2], { hl: { 0: 'p', 1: 'b', 3: 'b', 2: 'y', 4: 'y' } })}<p>Output: <b>${H.c('p', '4')}</b>. The ${H.c('b', 'two 1s')} cancel, the ${H.c('y', 'two 2s')} cancel, only 4 has no twin.</p>`,
        brute: {
          why: `<p>For each element, scan the whole array counting how often it appears; return the one with count 1. That is N × N = 9·10<sup>8</sup> comparisons for N = 3·10<sup>4</sup> — way too slow. The wasted work: we re-count the same values again and again. (A HashMap fixes the time but breaks the O(1) space rule.)</p>`,
          code: `
            int singleNumberBrute(int[] nums) {
                for (int i = 0; i < nums.length; i++) {
                    int count = 0;
                    for (int j = 0; j < nums.length; j++) {
                        if (nums[j] == nums[i]) count++;   // count copies of nums[i]
                    }
                    if (count == 1) return nums[i];        // no twin found
                }
                return -1;                                 // never happens for valid input
            }`
        },
        mcq: {
          q: 'What is <code>7 ^ 3 ^ 7</code>?',
          options: ['7', '0', '3', '4'],
          answer: 2,
          explain: 'Reorder: 7 ^ 7 ^ 3 = 0 ^ 3 = 3. The two 7s cancel no matter where they stand.'
        },
        hints: [
          `<p><b>Aha:</b> <code>x ^ x = 0</code> and <code>x ^ 0 = x</code>, and XOR can be re-ordered. So XOR-ing the whole array is the same as XOR-ing all twin pairs (each gives 0) and the single number.</p>`,
          `<p>No HashMap, no sort: keep a single <code>int res = 0</code> and do <code>res ^= x</code> for every x.</p>`,
          `<p>Traps: start res at <b>0</b>, not at nums[0] twice. Negatives are fine (XOR works on all 32 bits). N = 1 → the loop returns nums[0]. Recipe: res = 0 → for each x: res ^= x → return res.</p>`
        ],
        tests: { sig: 'int[] -> int', fn: 'singleNumber', cases: [[[[4, 1, 2, 1, 2]], 4], [[[1]], 1], [[[2, 2, 1]], 1], [[[-3, 5, -3]], 5], [[[30000, -30000, 30000]], -30000], [[[0, 7, 7]], 0], [[[-1, -1, -2]], -2]] },
        solution: {
          approach: `<p>Fold the array with XOR; all pairs vanish, the single number remains.</p>`,
          code: `
            class Solution {
                public int singleNumber(int[] nums) {
                    int res = 0;                 // 0 is the "empty hand"
                    for (int x : nums) {
                        res ^= x;                // twin pairs cancel: x ^ x = 0
                    }
                    return res;                  // only the unpaired value is left
                }

                public static void main(String[] args) {
                    System.out.println(new Solution().singleNumber(new int[]{4, 1, 2, 1, 2})); // 4
                }
            }`,
          alt: [
            { lang: 'python', code: `from functools import reduce
from operator import xor

def single_number(nums):
    # twin pairs cancel (x ^ x = 0); negatives are fine, no masking needed
    return reduce(xor, nums, 0)` },
            { lang: 'js', code: `function singleNumber(nums) {
  // twin pairs cancel (x ^ x = 0), the unpaired value is left
  return nums.reduce((res, x) => res ^ x, 0);
}` },
            { lang: 'cpp', code: `class Solution {
public:
    int singleNumber(const vector<int>& nums) {
        int res = 0;
        for (int x : nums) res ^= x;   // twin pairs cancel
        return res;
    }
};` }
          ],
          dry: {
            head: ['i', 'x', 'res before', 'res ^ x (binary)', 'res'],
            rows: [
              ['0', '4', '0 (000)', '000 ^ 100 = 100', '4'],
              ['1', '1', '4 (100)', '100 ^ 001 = 101', '5'],
              ['2', '2', '5 (101)', '101 ^ 010 = 111', '7'],
              ['3', '1', '7 (111)', '111 ^ 001 = 110', '6'],
              ['4', '2', '6 (110)', '110 ^ 010 = 100', '<span class="c-p">4</span>']
            ]
          },
          complexity: `<p><b>Time O(N)</b>: one pass, one XOR per element. <b>Space O(1)</b>: a single int, no matter how big the array is.</p>`
        }
      }
    ]
  });

  // ===================== TOPIC 8: Single Number II =====================
  topics.push({
    title: 'Single Number II: Count Each Bit Column, Take Mod 3',
    analogy: `<p>Now every value comes in a pack of <b>three</b> (triplets), except one that comes alone. The XOR "twins cancel" trick breaks: three copies XOR to the value itself, not 0.</p>
      <p>Think of a <b>school attendance register</b> with one column per subject (one column per bit). For each column, count how many students ticked it. Every triplet adds a multiple of 3 to a column. The lonely student adds just 1 — so any column whose total is <b>not</b> a multiple of 3 must belong to the lonely one. Like a turnstile counter that resets every 3 clicks: whatever is left on the counter is the lonely student's tick.</p>`,
    explain: `<p>Look at the bits <b>column by column</b> (bit 0, bit 1, …, bit 31). For each column count how many numbers have that bit ON, then take <code>count % 3</code>. Triplets contribute 0, 3, 6, … to every column, so the leftover (0 or 1) is exactly the single number's bit.</p>
      <p>Example <code>nums = [2, 2, 3, 2]</code>:</p>
      ${H.table(['number', 'bit 1', 'bit 0'], [['2', '1', '0'], ['2', '1', '0'], ['3', '1', '1'], ['2', '1', '0'], ['<b>count</b>', '4', '1'], ['<b>count % 3</b>', '<span class="c-p">1</span>', '<span class="c-p">1</span>']])}
      <p>Leftover bits: <b>11</b> = <span class="c-p">3</span>. ✔</p>
      <ul>
        <li>For the int range do this for all <b>32</b> columns. Bit 31 is the sign bit, so a negative single number comes out right automatically.</li>
        <li>This generalises: "every element appears <b>k</b> times except one" → use <code>count % k</code>.</li>
        <li>Cost: 32 passes × N = O(32·N) = O(N), with O(1) memory.</li>
      </ul>
      <p><b>Bonus (O(N), one pass):</b> the "ones / twos" trick keeps, for every column at the same time, a tiny counter that goes 0 → 1 → 2 → 0. <code>ones</code> holds the columns whose count % 3 == 1, <code>twos</code> those with count % 3 == 2. It is the same idea, just packed into two ints.</p>`,
    clues: [
      '"Every element appears <b>three times</b> except one" (or <b>k</b> times) → count bits per column, take % 3 (or % k).',
      '"Linear time, <b>constant space</b>" while XOR alone fails → think per-bit counting.',
      'Values are 32-bit ints (maybe negative) → loop bit = 0..31 and rebuild with <code>ans |= 1 &lt;&lt; bit</code>.',
      'Any "<b>per-bit</b> contribution / count" problem (sum of XORs, total Hamming distance) uses the same column-by-column view.'
    ],
    code: { lang: 'java', code: `
      class SingleNumberIIOnePass {
          // ones = columns whose count % 3 == 1, twos = columns whose count % 3 == 2
          public int singleNumber(int[] nums) {
              int ones = 0, twos = 0;
              for (int x : nums) {
                  ones = (ones ^ x) & ~twos;   // add x to "seen once" unless it was "seen twice"
                  twos = (twos ^ x) & ~ones;   // add x to "seen twice" unless it is now "seen once"
              }                                 // a third copy clears the column from both
              return ones;                     // the single number's bits are left in ones
          }
      }`, alt: [{ lang: 'python', code: `class SingleNumberIIOnePass:
    # ones = columns whose count % 3 == 1, twos = columns whose count % 3 == 2
    def single_number(self, nums):
        ones = twos = 0
        for x in nums:
            ones = (ones ^ x) & ~twos
            twos = (twos ^ x) & ~ones
        return ones   # Python keeps the sign: a negative single comes back negative` },
  { lang: 'js', code: `class SingleNumberIIOnePass {
  // ones = columns whose count % 3 == 1, twos = columns whose count % 3 == 2
  singleNumber(nums) {
    let ones = 0, twos = 0;
    for (const x of nums) {
      ones = (ones ^ x) & ~twos;
      twos = (twos ^ x) & ~ones;
    }
    return ones;
  }
}` },
  { lang: 'cpp', code: `class SingleNumberIIOnePass {
public:
    // ones = columns whose count % 3 == 1, twos = columns whose count % 3 == 2
    int singleNumber(const vector<int>& nums) {
        int ones = 0, twos = 0;
        for (int x : nums) {
            ones = (ones ^ x) & ~twos;
            twos = (twos ^ x) & ~ones;
        }
        return ones;
    }
};` }] },
    codeTitle: 'Bonus: one-pass ones/twos version',
    examples: [
      {
        title: 'A negative single number: [−4, 7, 7, 7]',
        html: `<p>−4 = …1111 1100. 7 = 0000 0111 (three times).</p>
          ${H.table(['column', 'from 7s', 'from −4', 'count', '% 3'], [['bit 0', '3', '0', '3', '0'], ['bit 1', '3', '0', '3', '0'], ['bit 2', '3', '1', '4', '<span class="c-p">1</span>'], ['bits 3..31', '0', '1', '1', '<span class="c-p">1</span>']])}
          <p>Rebuilt bits: 1…1100 = <b>−4</b>. Bit 31 (the sign bit) came out ON, so the answer is automatically negative — that is why the loop must run to 31.</p>`
      },
      {
        title: 'Generalise: every value k times except one',
        html: `<p>Every value appears <b>5</b> times except one: [9, 9, 9, 9, 9, 6]. Column counts of 9 (1001) are multiples of 5; 6 (0110) adds 1 to bits 1 and 2. Use <code>count % 5</code>: bits 1 and 2 survive → <b>6</b>. Just change the 3 into k.</p>`,
        code: { lang: 'java', code: `int[] nums = {9, 9, 9, 9, 9, 6};
int k = 5, ans = 0;
for (int bit = 0; bit < 32; bit++) {
    int cnt = 0;
    for (int x : nums) cnt += (x >> bit) & 1;
    if (cnt % k != 0) ans |= 1 << bit;
}
System.out.println(ans); // 6`, alt: [{ lang: 'python', run: true, code: `nums = [9, 9, 9, 9, 9, 6]
k, ans = 5, 0
for bit in range(32):
    cnt = sum((x >> bit) & 1 for x in nums)
    if cnt % k:
        ans |= 1 << bit
if ans >= 1 << 31:          # Python does not wrap: turn bit 31 back into a sign
    ans -= 1 << 32
print(ans)                  # 6` },
  { lang: 'js', run: true, code: `const nums = [9, 9, 9, 9, 9, 6];
const k = 5;
let ans = 0;
for (let bit = 0; bit < 32; bit++) {
  let cnt = 0;
  for (const x of nums) cnt += (x >> bit) & 1;
  if (cnt % k !== 0) ans |= 1 << bit;
}
console.log(ans); // 6` },
  { lang: 'cpp', code: `vector<int> nums = {9, 9, 9, 9, 9, 6};
int k = 5;
uint32_t ans = 0;
for (int bit = 0; bit < 32; ++bit) {
    int cnt = 0;
    for (int x : nums) cnt += (static_cast<uint32_t>(x) >> bit) & 1u;
    if (cnt % k != 0) ans |= 1u << bit;
}
cout << static_cast<int>(ans) << '\\n'; // 6` }] }
      },
      {
        title: 'Tracing the ones/twos trick on [2, 2, 3, 2]',
        html: `${H.table(['x', 'ones = (ones ^ x) &amp; ~twos', 'twos = (twos ^ x) &amp; ~ones', 'meaning'], [['start', '00', '00', 'all columns count 0'], ['2 (10)', '10', '00', 'bit 1 seen once'], ['2 (10)', '00', '10', 'bit 1 seen twice'], ['3 (11)', '01', '00', 'bit 1 third time → reset; bit 0 seen once'], ['2 (10)', '11', '00', 'bit 1 seen once (the single 3 has it)']])}
          <p>Return <code>ones</code> = 11 = <b>3</b> ✔. Each column carries a tiny counter 0 → 1 → 2 → 0 stored across two ints.</p>`
      },
      {
        title: 'Variation: others appear 3 times, one appears twice',
        html: `<p>[5, 5, 8, 8, 8]. Columns of 5 (101) get count 2, columns of 8 get 3. <code>count % 3</code> is 2 where 5 has a 1 and 0 elsewhere. Rule: set the bit when <code>count % 3 != 0</code> → <b>5</b>. The column idea adapts to any "multiple of k plus something" story.</p>`
      }
    ],
    deepDive: `<h4>Why ones/twos is a 2-bit counter</h4>
      <p>For a single column we want a counter that goes 0 → 1 → 2 → 0 on every ON bit. Store it in two bits (twos, ones): 00 → 01 → 10 → 00. Write the transition for an incoming bit x: <code>ones' = (ones ^ x) &amp; ~twos</code> moves 00→01 and 01→00 (to 10 via twos) and blocks the 10 state; <code>twos' = (twos ^ x) &amp; ~ones'</code> uses the <b>new</b> ones to move 01→10 and 10→00. Because &amp; ^ ~ work on all 32 columns at once, two ints simulate 32 independent counters. This is exactly how digital-logic designers build counters from truth tables.</p>
      <h4>Generalising</h4>
      <p>For "k times except one", per-column counting with <code>% k</code> is O(32·N) and always works. A one-pass version needs ⌈log₂k⌉ ints acting as a binary counter per column plus a "reset when equal to k" mask — powerful but error-prone; mention it, write the counting version.</p>
      <h4>Edge cases</h4>
      <ul>
        <li><code>(x &gt;&gt; bit) &amp; 1</code> is safe for negatives: the &amp; 1 discards the copied sign bits. Using <code>&gt;&gt;&gt;</code> is equally fine.</li>
        <li>For <code>long</code> inputs loop 64 columns and use <code>1L &lt;&lt; bit</code>.</li>
        <li>Counts never overflow: at most N ≤ 3·10<sup>4</sup> per column.</li>
      </ul>
      <h4>The per-bit view is a whole technique</h4>
      <p>"Sum of XOR over all pairs", "total Hamming distance", "AND/OR of all subarrays" — whenever operations act column by column, solve each column separately (often with counts of 0s and 1s) and add <code>contribution × 2<sup>bit</sup></code>.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants love to paste the ones/twos one-liner. It is correct, but few candidates can explain it — and the interviewer will ask. The counting version is easier to derive, explain and extend.</p>
      <p><b>Use AI as a partner:</b> <code>Derive the ones/twos update from a 3-state counter truth table, step by step</code>, then trace it yourself on [2, 2, 3, 2]. Ask for the k = 5 generalisation and check it against brute force.</p>
      <p><b>Where AI goes wrong:</b> looping bits 0..30 (loses negative answers), writing <code>ones = ones ^ x &amp; ~twos</code> without brackets (&amp; binds tighter than ^ in Java, C++, JavaScript and Python alike), and swapping the order of the two updates.</p>
      <p><b>What you must still own:</b> the column-count argument — it is the general tool; the two-int trick is a bonus.</p>`,
    viz: {
      title: 'Bit-count grid: total per column, then % 3',
      input: '5 3 5 6 3 5 3',
      inputLabel: 'numbers 0..255, every value 3 times except one (max 13 numbers)',
      gen: function (input) {
        var a = toList(input, 0, 255, 13, 'numbers');
        var cnt = {};
        a.forEach(function (x) { cnt[x] = (cnt[x] || 0) + 1; });
        var singles = Object.keys(cnt).filter(function (k) { return cnt[k] === 1; });
        var bad = Object.keys(cnt).filter(function (k) { return cnt[k] !== 1 && cnt[k] !== 3; });
        if (singles.length !== 1 || bad.length) throw new Error('Every value must appear exactly 3 times except one value that appears once, e.g. 5 3 5 6 3 5 3.');
        var mx = 0; a.forEach(function (x) { if (x > mx) mx = x; });
        var w = Math.max(3, bitLen(mx)), colHead = [], frames = [], counts = [];
        for (var b = w - 1; b >= 0; b--) { colHead.push('bit ' + b); counts.push(0); }
        var rows = [], rowHead = [];
        frames.push({
          narr: 'Make a grid: one <b>column per bit</b> (' + w + ' columns), one row per number. The bottom row will hold, for each column, how many numbers have that bit ON.',
          parts: [{ type: 'array', label: 'nums', values: a.slice() }, { type: 'grid', label: 'bit grid', colHead: colHead, rowHead: ['count'], rows: [counts.slice()] }]
        });
        for (var i = 0; i < a.length; i++) {
          var r = [], hl = {};
          for (var c = 0; c < w; c++) {
            var bit = (a[i] >> (w - 1 - c)) & 1;
            r.push(bit);
            if (bit) { counts[c]++; hl[i + ',' + c] = 'cur'; hl[(i + 1) + ',' + c] = 'ok'; }
          }
          rows.push(r); rowHead.push(String(a[i]));
          var ptr = {}; ptr[i] = 'i';
          frames.push({
            narr: 'Write ' + a[i] + ' = ' + bin(a[i], w) + ' as a row. Every column where it has a 1 (amber) adds 1 to that column\'s count (green).',
            parts: [{ type: 'array', label: 'nums', values: a.slice(), ptr: ptr, hl: one(i, 'cur') }, { type: 'grid', label: 'bit grid', colHead: colHead, rowHead: rowHead.concat(['count']), rows: rows.concat([counts.slice()]), hl: hl }]
          });
        }
        var mod = counts.map(function (x) { return x % 3; }), hlM = {}, ans = 0, n = a.length;
        mod.forEach(function (m, c) { if (m) { hlM[(n + 1) + ',' + c] = 'sel'; ans |= 1 << (w - 1 - c); } });
        frames.push({
          narr: 'Now take each count <b>% 3</b>. Triplets add 3 (or 0) to every column, so they vanish. Counts → [' + counts.join(', ') + '], remainders → [' + mod.join(', ') + ']. The remainders are exactly the bits of the lonely number.',
          parts: [{ type: 'grid', label: 'bit grid', colHead: colHead, rowHead: rowHead.concat(['count', '% 3']), rows: rows.concat([counts.slice(), mod.slice()]), hl: hlM }]
        });
        frames.push({
          narr: 'Read the % 3 row as a binary number: ' + mod.join('') + ' = <b>' + ans + '</b>. That is the single number (it appeared once, all others three times). ✔',
          parts: [{ type: 'bits', label: 'answer', value: ans, width: w, hl: onesHl(ans, w, 'sel') }, { type: 'vars', vals: { answer: ans }, hl: { answer: 'sel' } }]
        });
        return frames;
      }
    },
    problems: [
      {
        title: 'Single Number II',
        level: 'Medium',
        tags: ['bits', 'counting'],
        statement: `<p>Given an integer array <code>nums</code> where every element appears <b>three times</b> except for one, which appears <b>exactly once</b>, find that single element. Use O(N) time and O(1) extra space.</p>`,
        constraints: `1 ≤ N ≤ 3·10<sup>4</sup>, −2<sup>31</sup> ≤ nums[i] ≤ 2<sup>31</sup> − 1`,
        example: `${H.arr([2, 2, 3, 2], { hl: { 2: 'p', 0: 'b', 1: 'b', 3: 'b' } })}<p>Output: <b>${H.c('p', '3')}</b>. Bit columns: bit 1 is ON in all four numbers → 4 % 3 = 1; bit 0 is ON only in 3 → 1 % 3 = 1. Leftover bits 11 = 3.</p>`,
        brute: {
          why: `<p>Count each value with a <code>HashMap&lt;Integer, Integer&gt;</code> and return the key with count 1. It is O(N) time but O(N) extra space, which breaks the rule. Without a map, the double loop (count each value by scanning) is O(N<sup>2</sup>) ≈ 9·10<sup>8</sup>. And XOR alone fails because 3 copies of x XOR to x, not 0.</p>`,
          code: `
            int singleNumberBrute(int[] nums) {
                Map<Integer, Integer> freq = new HashMap<>();
                for (int x : nums) freq.put(x, freq.getOrDefault(x, 0) + 1);  // O(N) extra memory
                for (Map.Entry<Integer, Integer> e : freq.entrySet()) {
                    if (e.getValue() == 1) return e.getKey();
                }
                return -1;
            }`
        },
        mcq: {
          q: 'Why does XOR-ing everything fail for "every element appears three times"?',
          options: ['Because XOR does not work on negative numbers', 'Because x ^ x ^ x = x, so the triplets do not cancel', 'Because XOR is not commutative', 'It does not fail; XOR still works'],
          answer: 1,
          explain: 'Two copies cancel to 0, the third copy brings x back. You need a counter that resets every 3, i.e. count % 3 per bit.'
        },
        hints: [
          `<p><b>Aha:</b> look at one bit column. Each triplet adds 0 or 3 to that column's count. The single number adds 0 or 1. So <code>count % 3</code> is the single number's bit in that column.</p>`,
          `<p>Two loops: outer over bit positions 0..31, inner over the array counting <code>(x &gt;&gt; bit) &amp; 1</code>. If <code>count % 3 != 0</code>, switch that bit ON in the answer with <code>ans |= (1 &lt;&lt; bit)</code>.</p>`,
          `<p>Traps: go all the way to bit <b>31</b> so a negative answer gets its sign bit (in Python, which has no 32-bit wrap, subtract 2<sup>32</sup> when bit 31 is ON). Use <code>&gt;&gt;</code> then <code>&amp; 1</code> (the &amp; 1 removes any copied sign bits). Recipe: ans = 0; for bit 0..31 { cnt = 0; for x: cnt += (x &gt;&gt; bit) &amp; 1; if cnt % 3 ≠ 0: ans |= 1 &lt;&lt; bit } return ans.</p>`
        ],
        tests: { sig: 'int[] -> int', fn: 'singleNumber', cases: [[[[2, 2, 3, 2]], 3], [[[0, 1, 0, 1, 0, 1, 99]], 99], [[[-2, -2, 1, -2]], 1], [[[7]], 7], [[[-2147483648, 5, 5, 5]], -2147483648], [[[2147483647, 2147483647, 2147483647, -4]], -4], [[[-4, 7, 7, 7]], -4], [[[0, 0, 0, -1]], -1]] },
        solution: {
          approach: `<p>Count ON bits per column, keep columns where the count is not a multiple of 3.</p>`,
          code: `
            class Solution {
                public int singleNumber(int[] nums) {
                    int ans = 0;
                    for (int bit = 0; bit < 32; bit++) {          // every column incl. sign bit 31
                        int count = 0;
                        for (int x : nums) {
                            count += (x >> bit) & 1;              // is this column ON in x?
                        }
                        if (count % 3 != 0) {                     // triplets add multiples of 3
                            ans |= (1 << bit);                    // leftover 1 belongs to the single
                        }
                    }
                    return ans;
                }

                public static void main(String[] args) {
                    System.out.println(new Solution().singleNumber(new int[]{2, 2, 3, 2}));   // 3
                    System.out.println(new Solution().singleNumber(new int[]{-2, -2, 1, -2})); // 1
                }
            }`,
          alt: [
            { lang: 'python', code: `def single_number(nums):
    ans = 0
    for bit in range(32):
        count = sum((x >> bit) & 1 for x in nums)   # >> on a negative keeps the sign, & 1 reads one bit
        if count % 3:
            ans |= 1 << bit
    # Python has no 32-bit wrap: if bit 31 is ON, the answer is negative
    return ans - (1 << 32) if ans >= 1 << 31 else ans` },
            { lang: 'js', code: `function singleNumber(nums) {
  let ans = 0;
  for (let bit = 0; bit < 32; bit++) {
    let count = 0;
    for (const x of nums) count += (x >> bit) & 1;
    if (count % 3 !== 0) ans |= 1 << bit;   // 1 << 31 is negative in JS, which is what we want
  }
  return ans;                               // | keeps ans a signed 32-bit int
}` },
            { lang: 'cpp', code: `class Solution {
public:
    int singleNumber(const vector<int>& nums) {
        uint32_t ans = 0;                       // unsigned: 1u << 31 is well defined
        for (int bit = 0; bit < 32; ++bit) {
            int count = 0;
            for (int x : nums) count += (static_cast<uint32_t>(x) >> bit) & 1u;
            if (count % 3 != 0) ans |= 1u << bit;
        }
        return static_cast<int>(ans);           // C++20: wraps to the signed value
    }
};` }
          ],
          dry: {
            head: ['bit', 'bits of 2, 2, 3, 2', 'count', 'count % 3', 'ans'],
            rows: [
              ['0', '0, 0, 1, 0', '1', '1 → set bit 0', '1 (01)'],
              ['1', '1, 1, 1, 1', '4', '1 → set bit 1', '3 (11)'],
              ['2', '0, 0, 0, 0', '0', '0', '3'],
              ['3 … 31', 'all 0', '0', '0', '<span class="c-p">3</span>']
            ]
          },
          complexity: `<p><b>Time O(32·N) = O(N)</b>: 32 columns, each needs one pass over the array. <b>Space O(1)</b>: just count and ans. (The ones/twos version is a single pass, same big-O.)</p>`
        }
      }
    ]
  });

  // ===================== TOPIC 9: Single Number III =====================
  topics.push({
    title: 'Single Number III: Two Loners — XOR, Split by a Differing Bit, XOR Again',
    analogy: `<p>Back to the sock basket, but now <b>two</b> socks have no twin: one red, one blue. If you throw everything into the XOR "hand", you end up holding a weird <b>mixture</b> of red and blue — you cannot see either sock alone.</p>
      <p>The fix: find <b>one feature</b> where the two lonely socks differ (say, "has a stripe"). Sort the whole basket into two piles by that feature. Twins always land in the <b>same</b> pile (identical socks have identical features), and the two loners land in <b>different</b> piles. Now each pile is the easy "one loner" problem again.</p>`,
    explain: `<p>Every number appears <b>twice</b> except <b>two</b> numbers a and b (a ≠ b). Three moves:</p>
      <ol>
        <li><b>XOR everything.</b> Pairs cancel, so <code>xr = a ^ b</code>. Since a ≠ b, xr is not 0 — it has at least one ON bit, and every ON bit of xr is a column where a and b <b>differ</b>.</li>
        <li><b>Pick one differing column.</b> The easiest is the lowest ON bit: <code>diff = xr &amp; -xr</code> (2's complement trick from earlier).</li>
        <li><b>Split and fold.</b> XOR the numbers with that bit ON into <code>x</code>, the others into <code>y</code>. Twins share every bit, so each twin pair lands in the same pile and cancels. a and b land in different piles. So <code>x</code> and <code>y</code> are the two answers.</li>
      </ol>
      <p>Example <code>nums = [1, 2, 1, 3, 2, 5]</code>:</p>
      ${H.table(['step', 'work', 'result'], [['1. XOR all', '1^2^1^3^2^5 = 3 ^ 5', 'xr = 6 (110)'], ['2. lowest ON bit', '6 &amp; −6', 'diff = 2 (010)'], ['3a. bit 1 ON', '2, 3, 2', '2 ^ 3 ^ 2 = <span class="c-p">3</span>'], ['3b. bit 1 OFF', '1, 1, 5', '1 ^ 1 ^ 5 = <span class="c-p">5</span>']])}
      ${H.bits(3, 3, { label: '3', hl: { 1: 'y' } })}
      ${H.bits(5, 3, { label: '5', hl: { 1: 'y' } })}
      ${H.bits(6, 3, { label: 'xr = 3 ^ 5', hl: { 2: 'g', 1: 'g' } })}
      <p>Bits 1 and 2 differ between 3 and 5; we split on bit 1 (the lowest). Splitting on bit 2 would also work — <b>any</b> ON bit of xr is fine.</p>
      <p>Cost: two passes, O(N) time, O(1) extra space (three ints).</p>`,
    clues: [
      '"Exactly <b>two</b> elements appear only once and all the others appear exactly twice" → XOR all, split by a set bit of the result.',
      '"Find the <b>two missing</b> numbers" from 1..n (or "one missing and one repeated" with XOR) → same split technique after XOR-ing the range in.',
      '"O(N) time and <b>O(1) space</b>, return the two numbers in any order" → not a HashMap; the split trick.',
      'You have <code>a ^ b</code> and need a and b separately → "isolate a bit where they differ": <code>x &amp; -x</code>.',
      'Any problem that says "group the numbers by bit i" → twins always stay together, which is what makes group-wise XOR safe.'
    ],
    code: { lang: 'java', code: `
      class SingleNumberIIIDemo {
          static int[] twoSingles(int[] nums) {
              int xr = 0;
              for (int x : nums) xr ^= x;      // pairs cancel -> xr = a ^ b (not 0)
              int diff = xr & -xr;             // lowest bit where a and b differ
              int a = 0, b = 0;
              for (int x : nums) {
                  if ((x & diff) != 0) a ^= x; // pile 1: that bit ON
                  else b ^= x;                 // pile 2: that bit OFF
              }
              return new int[]{a, b};          // each pile held exactly one loner
          }
          public static void main(String[] args) {
              System.out.println(Arrays.toString(twoSingles(new int[]{1, 2, 1, 3, 2, 5}))); // [3, 5]
          }
      }`, alt: [{ lang: 'python', run: true, code: `def two_singles(nums):
    xr = 0
    for x in nums:
        xr ^= x                  # pairs cancel -> xr = a ^ b (not 0)
    diff = xr & -xr              # lowest bit where a and b differ
    a = b = 0
    for x in nums:
        if x & diff:
            a ^= x               # pile 1: that bit ON
        else:
            b ^= x               # pile 2: that bit OFF
    return [a, b]

print(two_singles([1, 2, 1, 3, 2, 5]))  # [3, 5]` },
  { lang: 'js', run: true, code: `function twoSingles(nums) {
  const xr = nums.reduce((acc, x) => acc ^ x, 0);   // a ^ b
  const diff = xr & -xr;                           // lowest bit where a and b differ
  let a = 0, b = 0;
  for (const x of nums) {
    if ((x & diff) !== 0) a ^= x; else b ^= x;
  }
  return [a, b];
}

console.log(twoSingles([1, 2, 1, 3, 2, 5])); // [3, 5]` },
  { lang: 'cpp', code: `#include <bits/stdc++.h>
using namespace std;

pair<int, int> twoSingles(const vector<int>& nums) {
    uint32_t xr = 0;
    for (int x : nums) xr ^= static_cast<uint32_t>(x);   // a ^ b
    uint32_t diff = xr & (0u - xr);                       // lowest differing bit, no signed overflow
    int a = 0, b = 0;
    for (int x : nums) {
        if (static_cast<uint32_t>(x) & diff) a ^= x;
        else b ^= x;
    }
    return {a, b};
}

int main() {
    auto [a, b] = twoSingles({1, 2, 1, 3, 2, 5});
    cout << a << ' ' << b << '\\n';   // 3 5
}` }] },
    codeTitle: 'Core pattern',
    examples: [
      {
        title: 'Two missing numbers from 1..n',
        html: `<p>n = 6, arr = [1, 3, 4, 6] (2 and 5 are missing). XOR every value 1..6 <b>and</b> every array value: present numbers appear twice and cancel, leaving 2 ^ 5 = 7 (111). Lowest ON bit = 1. Split all of 1..6 and arr by bit 0:</p>
          ${H.table(['pile', 'numbers XORed', 'result'], [['bit 0 ON', '1,3,5 (range) + 1,3 (arr)', '<span class="c-p">5</span>'], ['bit 0 OFF', '2,4,6 (range) + 4,6 (arr)', '<span class="c-p">2</span>']])}`,
        code: { lang: 'java', code: `int n = 6;
int[] arr = {1, 3, 4, 6};
int xr = 0;
for (int v = 1; v <= n; v++) xr ^= v;
for (int v : arr) xr ^= v;            // xr = 2 ^ 5
int diff = xr & -xr, a = 0, b = 0;
for (int v = 1; v <= n; v++) { if ((v & diff) != 0) a ^= v; else b ^= v; }
for (int v : arr) { if ((v & diff) != 0) a ^= v; else b ^= v; }
System.out.println(a + " " + b);     // 5 2`, alt: [{ lang: 'python', run: true, code: `n, arr = 6, [1, 3, 4, 6]
both = list(range(1, n + 1)) + arr
xr = 0
for v in both:
    xr ^= v                      # xr = 2 ^ 5
diff, a, b = xr & -xr, 0, 0
for v in both:
    if v & diff:
        a ^= v
    else:
        b ^= v
print(a, b)                      # 5 2` },
  { lang: 'js', run: true, code: `const n = 6, arr = [1, 3, 4, 6];
const both = [...Array.from({ length: n }, (_, i) => i + 1), ...arr];
const xr = both.reduce((acc, v) => acc ^ v, 0);   // 2 ^ 5
const diff = xr & -xr;
let a = 0, b = 0;
for (const v of both) { if (v & diff) a ^= v; else b ^= v; }
console.log(a, b);                                // 5 2` },
  { lang: 'cpp', code: `int n = 6;
vector<int> arr = {1, 3, 4, 6};
int xr = 0;
for (int v = 1; v <= n; ++v) xr ^= v;
for (int v : arr) xr ^= v;                 // xr = 2 ^ 5
int diff = xr & -xr, a = 0, b = 0;         // xr > 0 here, so -xr cannot overflow
for (int v = 1; v <= n; ++v) (v & diff ? a : b) ^= v;
for (int v : arr) (v & diff ? a : b) ^= v;
cout << a << ' ' << b << '\\n';             // 5 2` }] }
      },
      {
        title: 'Negative numbers and Integer.MIN_VALUE',
        html: `<p>nums = [0, Integer.MIN_VALUE]. xr = MIN_VALUE (only bit 31 ON). <code>xr &amp; -xr</code>: −MIN_VALUE is MIN_VALUE again, so diff = MIN_VALUE = bit 31 — still exactly the right single bit. Pile "bit 31 ON" gets MIN_VALUE, the other pile gets 0. The trick survives the scariest edge case because we never treat diff as a positive number; we only test <code>(x &amp; diff) != 0</code>.</p>`
      },
      {
        title: 'Why we must test != 0, not == 1',
        html: `<p>With diff = 4 (bit 2), <code>x &amp; diff</code> is either 0 or <b>4</b> — never 1. Writing <code>(x &amp; diff) == 1</code> puts every number in the same pile and returns [0, xr]. On [1, 2, 1, 3, 2, 5] with diff = 2 it would print [0, 6]: wrong. Always compare a masked value with <code>!= 0</code>.</p>`
      },
      {
        title: 'Splitting on the highest differing bit instead',
        html: `<p>Any ON bit of xr works. For [1, 2, 1, 3, 2, 5], xr = 6 and <code>Integer.highestOneBit(6) = 4</code> (bit 2). Pile bit 2 ON: 5 → <b>5</b>. Pile OFF: 1, 2, 1, 3, 2 → 2 ^ 3 ^ 2 = <b>3</b>. Same answers, different piles. The lowest bit is popular only because <code>x &amp; -x</code> is the shortest expression.</p>`
      }
    ],
    deepDive: `<h4>Proof</h4>
      <p>(1) After the first pass, xr = a ^ b because every other value appears exactly twice. (2) a ≠ b ⇒ xr ≠ 0 ⇒ some bit d is ON in xr ⇒ exactly one of a, b has bit d ON. (3) Every other value v appears twice and both copies have the same bit d, so both copies go to the same pile and cancel. (4) So pile ON contains exactly one loner and pile OFF the other. ∎</p>
      <h4>Edge cases and details</h4>
      <ul>
        <li><b>Overflow of -xr:</b> if xr == Integer.MIN_VALUE, <code>-xr</code> overflows back to MIN_VALUE, and <code>xr &amp; -xr</code> is still the correct single bit. <code>Integer.lowestOneBit(xr)</code> does the same thing and reads more clearly.</li>
        <li><b>Output order:</b> LeetCode accepts any order; if a sorted pair is required, swap at the end.</li>
        <li><b>Two passes are needed:</b> you cannot know the split bit before seeing all numbers. If the data is a one-shot stream, store it or use O(N) memory.</li>
      </ul>
      <h4>How far does the idea go?</h4>
      <p>Two loners: XOR + one split. <b>Three</b> loners with XOR is much harder (xr = a ^ b ^ c can even be 0), and interviewers usually expect a HashMap there. "One missing + one duplicate" in 1..n (Set Mismatch) also reduces to this: XOR range and array → missing ^ duplicate, split, then check which of the two actually appears in the array.</p>
      <h4>Pattern family</h4>
      <p>The step "from a combined value, find a <b>distinguishing bit</b> and partition" also appears in divide-and-conquer on bits (bitwise tries, radix-style partitioning) — a habit worth building early.</p>`,
    aiEra: `<p><b>What AI changes:</b> the code is 10 lines and every assistant knows it. What separates candidates is the <b>three-sentence proof</b> (why twins never split, why the loners must split) and handling <code>Integer.MIN_VALUE</code>.</p>
      <p><b>Use AI as a partner:</b> <code>Generate 10 random valid inputs plus one with Integer.MIN_VALUE, and a brute-force checker using HashMap</code>; run both and compare. Ask <code>What breaks if three numbers are single?</code> to probe your understanding.</p>
      <p><b>Where AI goes wrong:</b> writing <code>(x &amp; diff) == 1</code>, using <code>xr &amp; (xr - 1)</code> (that <b>removes</b> the lowest bit, the opposite of what you need), or returning without handling order requirements.</p>
      <p><b>What you must still own:</b> the split idea itself — it reappears in harder problems where no assistant has a memorised answer.</p>`,
    viz: {
      title: 'Two loners: XOR all, isolate a differing bit, split into two piles',
      input: '1 2 1 3 2 5',
      inputLabel: 'numbers 0..255; every value twice except exactly two values (max 14 numbers)',
      gen: function (input) {
        var a = toList(input, 0, 255, 14, 'numbers');
        var cnt = {};
        a.forEach(function (x) { cnt[x] = (cnt[x] || 0) + 1; });
        var keys = Object.keys(cnt);
        var singles = keys.filter(function (k) { return cnt[k] === 1; });
        var bad = keys.filter(function (k) { return cnt[k] !== 1 && cnt[k] !== 2; });
        if (singles.length !== 2 || bad.length) throw new Error('Every value must appear exactly twice except two values that appear once, e.g. 1 2 1 3 2 5.');
        var mx = 0; a.forEach(function (x) { if (x > mx) mx = x; });
        var w = Math.max(3, bitLen(mx)), frames = [], xr = 0;
        frames.push({
          narr: 'Every value has a twin except <b>two</b>. Plan: (1) XOR everything, (2) find a bit where the two loners differ, (3) split into two piles by that bit and XOR each pile.',
          parts: [{ type: 'array', label: 'nums', values: a.slice() }, { type: 'bits', label: 'xr', value: 0, width: w }]
        });
        for (var i = 0; i < a.length; i++) {
          var before = xr; xr ^= a[i];
          var hlA = {}; for (var j = 0; j < i; j++) hlA[j] = 'done'; hlA[i] = 'cur';
          frames.push({
            narr: 'Pass 1: xr = ' + before + ' ^ ' + a[i] + ' = <b>' + xr + '</b>.' + (i === a.length - 1 ? ' All twins cancelled, so xr now equals <b>loner1 ^ loner2</b>.' : ' Twins will cancel as they meet.'),
            parts: [{ type: 'array', label: 'nums', values: a.slice(), hl: hlA, ptr: one(i, 'i') }, { type: 'bits', label: 'xr', value: xr, width: w, hl: diffHl(before, xr, w, 'cur') }]
          });
        }
        var diff = xr & -xr, dpos = 0; while (!((diff >> dpos) & 1)) dpos++;
        frames.push({
          narr: 'xr = <b>' + xr + '</b> is not 0 because the two loners are different. Every ON bit of xr is a column where they differ. Take the lowest one: <code>xr &amp; -xr</code> = <b>' + diff + '</b> (bit ' + dpos + ').',
          parts: [{ type: 'bits', label: 'xr', value: xr, width: w, hl: onesHl(xr, w, 'ok') }, { type: 'bits', label: 'diff = xr &amp; -xr', value: diff, width: w, hl: one(dpos, 'sel'), ptr: one(dpos, 'split') }]
        });
        var g1 = 0, g0 = 0, p1 = [], p0 = [];
        for (var k = 0; k < a.length; k++) {
          var on = (a[k] & diff) !== 0, hl = {};
          if (on) { g1 ^= a[k]; p1.push(a[k]); } else { g0 ^= a[k]; p0.push(a[k]); }
          for (var q = 0; q <= k; q++) hl[q] = (a[q] & diff) ? 'sel' : 'ok';
          hl[k] = 'cur';
          frames.push({
            narr: 'Pass 2: ' + a[k] + ' has bit ' + dpos + ' ' + (on ? '<b>ON</b> → pile A (purple)' : '<b>OFF</b> → pile B (green)') + '. Twins always choose the same pile, so they will cancel inside it.',
            parts: [
              { type: 'array', label: 'nums', values: a.slice(), hl: hl, ptr: one(k, 'k') },
              { type: 'bits', label: a[k] + ' (check bit ' + dpos + ')', value: a[k], width: w, hl: one(dpos, on ? 'sel' : 'ok') },
              { type: 'vars', label: 'pile XORs', vals: { 'A (bit ON)': g1, 'B (bit OFF)': g0 }, hl: on ? { 'A (bit ON)': 'cur' } : { 'B (bit OFF)': 'cur' } },
              { type: 'text', label: 'piles so far', html: 'A: [' + p1.join(', ') + ']<br>B: [' + p0.join(', ') + ']' }
            ]
          });
        }
        frames.push({
          narr: 'Done. Pile A folds to <b>' + g1 + '</b>, pile B folds to <b>' + g0 + '</b>. These are the two loners. Check: ' + g1 + ' ^ ' + g0 + ' = ' + (g1 ^ g0) + ' = xr ✔.',
          parts: [{ type: 'bits', label: 'loner A', value: g1, width: w, hl: onesHl(g1, w, 'sel') }, { type: 'bits', label: 'loner B', value: g0, width: w, hl: onesHl(g0, w, 'ok') }, { type: 'vars', vals: { answer: '[' + g1 + ', ' + g0 + ']' }, hl: { answer: 'sel' } }]
        });
        return frames;
      }
    },
    problems: [
      {
        title: 'Single Number III',
        level: 'Medium',
        tags: ['XOR', 'bits', 'partition'],
        companies: ['Amazon', 'Google', 'Microsoft'],
        statement: `<p>Given an integer array <code>nums</code> in which <b>exactly two</b> elements appear only once and all the other elements appear exactly twice, return the two elements that appear once, in any order. Use O(N) time and O(1) extra space.</p>`,
        constraints: `2 ≤ N ≤ 3·10<sup>4</sup>, −2<sup>31</sup> ≤ nums[i] ≤ 2<sup>31</sup> − 1, exactly two values appear once.`,
        example: `${H.arr([1, 2, 1, 3, 2, 5], { hl: { 3: 'p', 5: 'p', 0: 'b', 2: 'b', 1: 'y', 4: 'y' } })}<p>Output: <b>${H.c('p', '[3, 5]')}</b> (or [5, 3]). ${H.c('b', '1s')} and ${H.c('y', '2s')} have twins; 3 and 5 do not.</p>`,
        brute: {
          why: `<p>Count every value in a <code>HashMap</code> and collect the keys with count 1. Correct and O(N) time, but O(N) extra memory — the problem forbids that. XOR-all alone gives only <code>a ^ b</code>, a mixture you cannot read directly. The wasted resource here is memory, not time.</p>`,
          code: `
            int[] singleNumberBrute(int[] nums) {
                Map<Integer, Integer> freq = new HashMap<>();
                for (int x : nums) freq.merge(x, 1, Integer::sum);   // O(N) extra space
                int[] res = new int[2];
                int k = 0;
                for (Map.Entry<Integer, Integer> e : freq.entrySet()) {
                    if (e.getValue() == 1) res[k++] = e.getKey();
                }
                return res;
            }`
        },
        mcq: {
          q: 'After XOR-ing all numbers you get xr = 6 (110). What does that tell you about the two loners?',
          options: ['Their sum is 6', 'One of them is 6', 'They are both even', 'They differ in bits 1 and 2, and agree in every other bit'],
          answer: 3,
          explain: 'xr = a ^ b, and XOR is 1 exactly where the bits differ. So a and b differ at bits 1 and 2 only. (3 and 5: 011 vs 101.)'
        },
        hints: [
          `<p><b>Aha:</b> XOR-all gives <code>a ^ b</code>, which is not 0. Any ON bit of it is a column where a and b <b>differ</b> — use it to separate them.</p>`,
          `<p>Isolate one such bit with <code>diff = xr &amp; -xr</code>. Make a second pass: numbers with <code>(x &amp; diff) != 0</code> go into one XOR accumulator, the rest into another. Twins always go to the same accumulator.</p>`,
          `<p>Traps: compare with <code>!= 0</code>, not <code>== 1</code>; <code>xr &amp; -xr</code> is fine even when xr is Integer.MIN_VALUE in Java and JavaScript (in C++ compute it on <code>unsigned</code>, because <code>-INT_MIN</code> overflows). Recipe: xr = XOR all → diff = xr &amp; −xr → a = b = 0 → for x: if (x &amp; diff) ≠ 0 then a ^= x else b ^= x → return [a, b].</p>`
        ],
        tests: { sig: 'int[] -> int[]', fn: 'singleNumber', cmp: 'set', cases: [[[[1, 2, 1, 3, 2, 5]], [3, 5]], [[[-1, 0]], [-1, 0]], [[[0, 1]], [0, 1]], [[[0, -2147483648]], [-2147483648, 0]], [[[2147483647, -2147483648, 4, 4]], [-2147483648, 2147483647]], [[[2, 1, 2, 3, 4, 1]], [3, 4]], [[[-5, -5, -7, 8, 9, 9]], [-7, 8]]] },
        solution: {
          approach: `<p>Fold everything to get a ^ b, split the array by one bit where a and b differ, and fold each half. Each half is "Single Number I".</p>`,
          code: `
            class Solution {
                public int[] singleNumber(int[] nums) {
                    int xr = 0;
                    for (int x : nums) xr ^= x;          // = a ^ b, guaranteed non-zero
                    int diff = xr & -xr;                 // lowest bit where a and b differ
                    int a = 0, b = 0;
                    for (int x : nums) {
                        if ((x & diff) != 0) a ^= x;     // pile with that bit ON
                        else b ^= x;                     // pile with that bit OFF
                    }
                    return new int[]{a, b};
                }

                public static void main(String[] args) {
                    int[] r = new Solution().singleNumber(new int[]{1, 2, 1, 3, 2, 5});
                    System.out.println(r[0] + " " + r[1]); // 3 5
                }
            }`,
          alt: [{ lang: 'python', code: `def single_number(nums):
    xr = 0
    for x in nums:
        xr ^= x            # a ^ b
    diff = xr & -xr        # lowest differing bit (works for Python's big ints too)
    a = b = 0
    for x in nums:
        if x & diff:
            a ^= x
        else:
            b ^= x
    return [a, b]

print(single_number([1, 2, 1, 3, 2, 5]))  # [3, 5]`, run: true },
            { lang: 'js', code: `function singleNumber(nums) {
  const xr = nums.reduce((acc, x) => acc ^ x, 0);   // a ^ b
  const diff = xr & -xr;                           // lowest differing bit (fine for -2^31 too)
  let a = 0, b = 0;
  for (const x of nums) {
    if ((x & diff) !== 0) a ^= x;                  // pile with that bit ON
    else b ^= x;                                   // pile with that bit OFF
  }
  return [a, b];
}` },
            { lang: 'cpp', code: `class Solution {
public:
    vector<int> singleNumber(const vector<int>& nums) {
        uint32_t xr = 0;
        for (int x : nums) xr ^= static_cast<uint32_t>(x);   // a ^ b
        uint32_t diff = xr & (0u - xr);   // unsigned negate: -INT_MIN would be undefined for int
        int a = 0, b = 0;
        for (int x : nums) {
            if (static_cast<uint32_t>(x) & diff) a ^= x;
            else b ^= x;
        }
        return {a, b};
    }
};` }],
          dry: {
            head: ['x', 'x &amp; diff (diff = 2)', 'pile', 'a', 'b'],
            rows: [
              ['(pass 1)', 'xr = 1^2^1^3^2^5 = 6', '–', '0', '0'],
              ['1', '0', 'B', '0', '1'],
              ['2', '2', 'A', '2', '1'],
              ['1', '0', 'B', '2', '0'],
              ['3', '2', 'A', '1', '0'],
              ['2', '2', 'A', '3', '0'],
              ['5', '0', 'B', '3', '<span class="c-p">5</span>']
            ]
          },
          complexity: `<p><b>Time O(N)</b>: two passes. <b>Space O(1)</b>: xr, diff, a, b.</p>`,
          followUps: ['Return the pair sorted ascending.', 'Solve "one missing and one duplicate in 1..n" (Set Mismatch) with the same split.', 'Why does the trick not extend directly to three single numbers?']
        }
      }
    ]
  });

  // ===================== TOPIC 10: Bitmask subset enumeration =====================
  topics.push({
    title: 'Bitmask Subset Enumeration: Every Combination by Counting',
    analogy: `<p>A pizza shop has 3 toppings: cheese, olives, mushrooms. Every possible order is a row of 3 tick boxes (yes/no). How do you list <b>every</b> order without missing or repeating one? Just <b>count in binary</b> from 000 to 111: each number is one tick-box pattern, and counting visits each pattern exactly once — like a binary odometer clicking forward.</p>
      <p>000 = plain pizza, 001 = cheese only, 010 = olives only, 011 = cheese + olives, … 111 = everything. 3 toppings → 2 × 2 × 2 = <b>8</b> orders.</p>`,
    explain: `<p>Give each of the n items a bit position: item j ↔ bit j. A <b>mask</b> (an int) then describes a subset: bit j ON means "item j is in". All masks from <code>0</code> to <code>(1 &lt;&lt; n) − 1</code> = all 2<sup>n</sup> subsets.</p>
      ${H.table(['mask', 'binary (c b a)', 'subset of [a, b, c]'], [['0', '000', '{ }'], ['1', '001', '{a}'], ['2', '010', '{b}'], ['3', '011', '{a, b}'], ['4', '100', '{c}'], ['5', '101', '{a, c}'], ['6', '110', '{b, c}'], ['7', '111', '{a, b, c}']])}
      <h4>The template</h4>
      <pre>for (int mask = 0; mask &lt; (1 &lt;&lt; n); mask++)      // every subset
    for (int j = 0; j &lt; n; j++)
        if ((mask &gt;&gt; j &amp; 1) == 1) → item j is in this subset</pre>
      <p>Cost: 2<sup>n</sup> masks × n checks = <b>O(n · 2<sup>n</sup>)</b>. With n = 20 that is about 2·10<sup>7</sup> — fine. With n = 30 it is 3·10<sup>10</sup> — far too slow. So the clue is a <b>tiny n</b> (≤ 20).</p>
      <h4>Submasks: the subsets of a subset</h4>
      <p>Sometimes you need every subset <b>of a given mask m</b> (e.g. "split this group into two teams"). The magic loop:</p>
      <pre>for (int s = m; s &gt; 0; s = (s - 1) &amp; m) { … }   // then handle s = 0 separately</pre>
      <p><code>s − 1</code> turns off the lowest ON bit of s and turns on everything below it; <code>&amp; m</code> throws away bits not in m. The result is the next smaller submask. For m = 1011: 1011 → 1010 → 1001 → 1000 → 0011 → 0010 → 0001 → (0). Each submask exactly once, in decreasing order.</p>
      <h4>Why bitmasks beat recursion here</h4>
      <ul>
        <li>No call stack, no list copying — one int describes the whole choice.</li>
        <li>The mask can be stored as a <b>DP index</b> or <b>HashMap key</b> ("set of visited cities" in bitmask DP, a later module).</li>
        <li>Set operations become single instructions: union <code>|</code>, intersection <code>&amp;</code>, size <code>bitCount</code>.</li>
      </ul>`,
    clues: [
      '<b>n ≤ 20</b> (or 15, 16, 18) and words like "any subset", "any combination", "choose some of" → enumerate 2<sup>n</sup> masks.',
      '"Return <b>all subsets</b> / the power set" → masks 0..2<sup>n</sup>−1.',
      '"Split into <b>two groups</b>" with tiny n → every mask is one group, its complement <code>full ^ mask</code> is the other.',
      '"For every subset, look at all of its sub-subsets" → submask loop <code>s = (s − 1) &amp; m</code>, total O(3<sup>n</sup>).',
      'n ≤ 40 with subset sums → <b>meet in the middle</b>: enumerate 2<sup>20</sup> masks of each half, then combine with sorting/binary search.',
      '"Visited set of at most 16–20 nodes" (TSP, shortest path visiting all nodes) → the visited set is a mask (bitmask DP).'
    ],
    code: [{ lang: 'java', code: `
      class SubsetMasks {
          // All subsets of nums using masks 0 .. 2^n - 1
          static List<List<Integer>> subsets(int[] nums) {
              int n = nums.length;
              List<List<Integer>> all = new ArrayList<>();
              for (int mask = 0; mask < (1 << n); mask++) {       // 2^n patterns
                  List<Integer> cur = new ArrayList<>();
                  for (int j = 0; j < n; j++) {
                      if (((mask >> j) & 1) == 1) cur.add(nums[j]); // bit j ON -> take item j
                  }
                  all.add(cur);
              }
              return all;
          }

          // Every submask of m, largest first, including 0 at the end
          static List<Integer> submasks(int m) {
              List<Integer> out = new ArrayList<>();
              for (int s = m; s > 0; s = (s - 1) & m) out.add(s);
              out.add(0);                                          // the empty submask
              return out;
          }

          public static void main(String[] args) {
              System.out.println(subsets(new int[]{1, 2, 3}));  // [[], [1], [2], [1, 2], [3], [1, 3], [2, 3], [1, 2, 3]]
              System.out.println(submasks(0b1011));              // [11, 10, 9, 8, 3, 2, 1, 0]
          }
      }`, alt: [{ lang: 'js', run: true, code: `function subsets(nums) {
  const all = [];
  for (let mask = 0; mask < (1 << nums.length); mask++) {   // 2^n patterns
    all.push(nums.filter((_, j) => (mask >> j) & 1));       // bit j ON -> take item j
  }
  return all;
}

function submasks(m) {
  const out = [];
  for (let s = m; s > 0; s = (s - 1) & m) out.push(s);
  out.push(0);                                              // the empty submask
  return out;
}

console.log(JSON.stringify(subsets([1, 2, 3]))); // [[],[1],[2],[1,2],[3],[1,3],[2,3],[1,2,3]]
console.log(submasks(0b1011));                   // [11, 10, 9, 8, 3, 2, 1, 0]` },
  { lang: 'cpp', code: `#include <bits/stdc++.h>
using namespace std;

vector<vector<int>> subsets(const vector<int>& nums) {
    int n = nums.size();
    vector<vector<int>> all;
    for (int mask = 0; mask < (1 << n); ++mask) {          // 2^n patterns
        vector<int> cur;
        for (int j = 0; j < n; ++j)
            if ((mask >> j) & 1) cur.push_back(nums[j]);   // bit j ON -> take item j
        all.push_back(cur);
    }
    return all;
}

vector<int> submasks(int m) {
    vector<int> out;
    for (int s = m; s > 0; s = (s - 1) & m) out.push_back(s);
    out.push_back(0);                                      // the empty submask
    return out;
}

int main() {
    cout << subsets({1, 2, 3}).size() << '\\n';             // 8
    for (int s : submasks(0b1011)) cout << s << ' ';       // 11 10 9 8 3 2 1 0
    cout << '\\n';
}` }, { lang: 'python', title: 'Same in Python (runnable)', run: true, code: `def subsets(nums):
    n = len(nums)
    return [[nums[j] for j in range(n) if mask >> j & 1] for mask in range(1 << n)]

def submasks(m):
    out, s = [], m
    while s > 0:
        out.append(s)
        s = (s - 1) & m
    return out + [0]

print(subsets([1, 2, 3]))
print(submasks(0b1011))  # [11, 10, 9, 8, 3, 2, 1, 0]` }] }],
    codeTitle: ['All subsets and all submasks'],
    examples: [
      {
        title: 'Subset sum by brute-force masks',
        html: `<p>nums = [3, 1, 4], target = 5. Try all 8 masks and add the chosen items:</p>
          ${H.table(['mask', 'binary', 'chosen', 'sum'], [['0', '000', '{ }', '0'], ['1', '001', '{3}', '3'], ['2', '010', '{1}', '1'], ['3', '011', '{3, 1}', '4'], ['4', '100', '{4}', '4'], ['5', '101', '{3, 4}', '7'], ['6', '110', '{1, 4}', '<span class="c-g">5 ✔</span>'], ['7', '111', '{3, 1, 4}', '8']])}
          <p>Mask 6 works: {1, 4}. With n ≤ 20 this "try everything" is perfectly acceptable.</p>`
      },
      {
        title: 'Split into two teams with minimum difference',
        html: `<p>Strengths [5, 2, 8, 3] (total 18). For each mask, team A = mask, team B = the complement <code>full ^ mask</code> (full = 1111). Difference = |2·sumA − total|. Mask 0101 → {5, 8} = 13 vs 5 → diff 8. Mask 0110 → {2, 8} = 10 vs 8 → diff <b>2</b>. Mask 0011 → {5, 2} = 7 vs 11 → diff 4. Best: <b>2</b>. Tip: masks m and full ^ m describe the same split, so you can stop at half.</p>`,
        code: { lang: 'java', code: `int[] s = {5, 2, 8, 3};
int n = s.length, total = 18, best = Integer.MAX_VALUE;
for (int mask = 0; mask < (1 << n); mask++) {
    int sumA = 0;
    for (int j = 0; j < n; j++) if ((mask >> j & 1) == 1) sumA += s[j];
    best = Math.min(best, Math.abs(2 * sumA - total));
}
System.out.println(best); // 2`, alt: [{ lang: 'python', run: true, code: `s = [5, 2, 8, 3]
n, total = len(s), sum(s)
best = min(abs(2 * sum(s[j] for j in range(n) if mask >> j & 1) - total) for mask in range(1 << n))
print(best)  # 2` },
  { lang: 'js', run: true, code: `const s = [5, 2, 8, 3];
const n = s.length, total = 18;
let best = Infinity;
for (let mask = 0; mask < (1 << n); mask++) {
  let sumA = 0;
  for (let j = 0; j < n; j++) if ((mask >> j) & 1) sumA += s[j];
  best = Math.min(best, Math.abs(2 * sumA - total));
}
console.log(best); // 2` },
  { lang: 'cpp', code: `vector<int> s = {5, 2, 8, 3};
int n = s.size(), total = 18, best = INT_MAX;
for (int mask = 0; mask < (1 << n); ++mask) {
    int sumA = 0;
    for (int j = 0; j < n; ++j) if ((mask >> j) & 1) sumA += s[j];
    best = min(best, abs(2 * sumA - total));
}
cout << best << '\\n'; // 2` }] }
      },
      {
        title: 'Submasks of 1011 step by step',
        html: `${H.table(['s', 's − 1', '(s − 1) &amp; 1011', 'next s'], [['1011 (11)', '1010', '1010', '10'], ['1010 (10)', '1001', '1001', '9'], ['1001 (9)', '1000', '1000', '8'], ['1000 (8)', '0111', '<span class="c-y">0011</span>', '3'], ['0011 (3)', '0010', '0010', '2'], ['0010 (2)', '0001', '0001', '1'], ['0001 (1)', '0000', '0000', 'stop (then add 0)']])}
          <p>Look at row 4: subtracting 1 from 1000 lit up bits 0..2, and <code>&amp; m</code> kept only bits 0 and 1 (bit 2 is not in m). That is how the loop "jumps" over bits that are not allowed.</p>`
      },
      {
        title: 'Count subsets with the maximum OR',
        html: `<p>nums = [3, 1]. Possible ORs: {3} → 3, {1} → 1, {3, 1} → 3. The maximum OR is the OR of everything = 3, reached by <b>2</b> subsets. With masks: compute OR for each non-empty mask and count those equal to the max. n ≤ 16 → 65,536 masks, trivial.</p>`
      }
    ],
    deepDive: `<h4>Why the submask loop is correct</h4>
      <p>Think of m's ON bits as a smaller number written with only those bits (m = 1011 has 3 usable bits, so 8 submasks). Inside that "compressed" view, <code>(s − 1) &amp; m</code> is exactly "subtract 1": the borrow turns off the lowest usable ON bit and turns on all usable bits below it, while <code>&amp; m</code> deletes the unusable ones. So the loop counts down from m to 0 in the compressed number system — every submask exactly once.</p>
      <h4>The 3<sup>n</sup> fact</h4>
      <p>Looping over all masks m and all their submasks s costs ∑ 2<sup>popcount(m)</sup> = <b>3<sup>n</sup></b>: each item is either outside m, in m but not s, or in s — three choices. n = 15 → 1.4·10<sup>7</sup> (fine); n = 20 → 3.5·10<sup>9</sup> (too slow). This is the cost of the classic "partition into groups" bitmask DP.</p>
      <h4>More enumeration tools</h4>
      <ul>
        <li><b>Supersets of m</b> within n bits: <code>for (s = m; s &lt; (1 &lt;&lt; n); s = (s + 1) | m)</code>.</li>
        <li><b>Only subsets of size k</b> (Gosper's hack): from a mask x, the next bigger mask with the same bit count is <code>c = x &amp; -x; r = x + c; next = (((r ^ x) &gt;&gt;&gt; 2) / c) | r</code>. Visits exactly C(n, k) masks.</li>
        <li><b>Gray code order</b> <code>i ^ (i &gt;&gt; 1)</code> visits all masks so that consecutive ones differ in exactly one bit — update a running sum by adding/removing one item instead of recomputing it.</li>
        <li><b>Incremental sums</b>: <code>sum[mask] = sum[mask &amp; (mask − 1)] + a[ctz(mask)]</code> fills all subset sums in O(2<sup>n</sup>) instead of O(n·2<sup>n</sup>).</li>
      </ul>
      <h4>Limits</h4>
      <p>An int mask holds 31 usable items (bit 31 makes the int negative, so loops like <code>mask &lt; (1 &lt;&lt; n)</code> break at n = 31); use <code>long</code> up to 63 — though 2<sup>n</sup> time kills you long before that. Memory for arrays indexed by mask: 2<sup>20</sup> ints = 4 MB, 2<sup>25</sup> = 128 MB.</p>`,
    aiEra: `<p><b>What AI changes:</b> generating subsets is boilerplate an assistant writes instantly — recursive or bitmask. The interview skill is <b>seeing</b> that n ≤ 20 makes brute force over subsets the intended solution, and estimating the cost (2<sup>n</sup>·n or 3<sup>n</sup>) out loud before coding.</p>
      <p><b>Use AI as a partner:</b> <code>For n = 15, 20, 25, 40, estimate 2^n·n and 3^n operations and tell me which approach fits 1 second</code>. Or ask it to convert your recursive subsets solution into the mask version and diff the outputs.</p>
      <p><b>Where AI goes wrong:</b> forgetting the empty submask (the loop stops at s &gt; 0), using <code>1 &lt;&lt; n</code> with n ≥ 31, and suggesting 2<sup>n</sup> enumeration for n = 40 (needs meet-in-the-middle).</p>
      <p><b>What you must still own:</b> the constraint → complexity reflex (n ≤ 20 → masks) and the submask loop by heart; they are the gateway to bitmask DP later in the course.</p>`,
    viz: [{
      title: 'Count from 0 to 2ⁿ − 1: each mask is one subset',
      input: 'a b c',
      inputLabel: 'items separated by spaces (1 to 4 items)',
      gen: function (input) {
        var items = String(input === undefined || input === null ? '' : input).trim().split(/[\s,]+/).filter(function (s) { return s.length; });
        if (!items.length) throw new Error('Type 1 to 4 items separated by spaces, like: a b c');
        if (items.length > 4) throw new Error('Use at most 4 items (that is already 16 subsets).');
        var n = items.length, total = 1 << n, frames = [], rows = [];
        frames.push({
          narr: n + ' items → each can be IN or OUT → 2<sup>' + n + '</sup> = <b>' + total + '</b> subsets. Item j is controlled by bit j. We simply count mask = 0, 1, 2, …, ' + (total - 1) + '.',
          parts: [{ type: 'array', label: 'items (index = bit)', values: items.slice() }, { type: 'bits', label: 'mask', value: 0, width: n }]
        });
        for (var mask = 0; mask < total; mask++) {
          var chosen = [], hlA = {}, hlB = {};
          for (var j = 0; j < n; j++) if ((mask >> j) & 1) { chosen.push(items[j]); hlA[j] = 'ok'; hlB[j] = 'ok'; }
          rows.push([String(mask), bin(mask, n), '{' + chosen.join(', ') + '}']);
          frames.push({
            narr: 'mask = <b>' + mask + '</b> = ' + bin(mask, n) + '. ' + (chosen.length ? 'ON bits pick: <b>{' + chosen.join(', ') + '}</b>.' : 'No bit is ON → the <b>empty</b> subset.') + (mask > 0 ? ' Going from ' + (mask - 1) + ' to ' + mask + ' is just "+1" — the binary odometer clicks.' : ''),
            parts: [
              { type: 'bits', label: 'mask', value: mask, width: n, hl: hlB },
              { type: 'array', label: 'items', values: items.slice(), hl: hlA },
              { type: 'set', label: 'this subset', items: chosen.slice() },
              { type: 'table', label: 'subsets so far', columns: ['mask', 'binary', 'subset'], rows: rows.slice(), hl: one(rows.length - 1, 'cur') }
            ]
          });
        }
        frames.push({
          narr: 'All <b>' + total + '</b> subsets listed, each exactly once, with no recursion. Cost: ' + total + ' masks × ' + n + ' bit checks. For n = 20 this is about 2·10<sup>7</sup> steps.',
          parts: [{ type: 'table', label: 'the power set', columns: ['mask', 'binary', 'subset'], rows: rows.slice() }]
        });
        return frames;
      }
    }, {
      title: 'Submask walk: s = (s − 1) & m',
      input: '11',
      inputLabel: 'mask m (1 to 255, at most 5 ON bits)',
      gen: function (input) {
        var m = toInt(input, 1, 255, 'a mask m');
        if (popcount(m) > 5) throw new Error('Pick m with at most 5 ON bits (32 submasks).');
        var w = Math.max(4, bitLen(m)), frames = [], seen = [];
        frames.push({
          narr: 'm = <b>' + m + '</b> = ' + bin(m, w) + ' has ' + popcount(m) + ' ON bits, so it has 2<sup>' + popcount(m) + '</sup> = <b>' + (1 << popcount(m)) + '</b> submasks (subsets of its ON bits). Start with s = m itself.',
          parts: [{ type: 'bits', label: 'm', value: m, width: w, hl: onesHl(m, w, 'win') }]
        });
        var s = m;
        while (s > 0) {
          seen.push(s);
          var nxt = (s - 1) & m;
          frames.push({
            narr: 'Visit s = <b>' + s + '</b> (' + bin(s, w) + '). Next: s − 1 = ' + bin(s - 1, w) + ' (lowest ON bit off, everything below it on), then <code>&amp; m</code> keeps only allowed bits → <b>' + nxt + '</b>.',
            parts: [
              { type: 'bits', label: 'm (allowed bits)', value: m, width: w, hl: onesHl(m, w, 'win') },
              { type: 'bits', label: 's (visit)', value: s, width: w, hl: onesHl(s, w, 'ok') },
              { type: 'bits', label: 's − 1', value: s - 1, width: w, hl: diffHl(s, s - 1, w, 'cur') },
              { type: 'bits', label: '(s − 1) &amp; m', value: nxt, width: w, hl: onesHl(nxt, w, 'sel') },
              { type: 'set', label: 'submasks visited', items: seen.slice(), hl: one(String(s), 'ok') }
            ]
          });
          s = nxt;
        }
        seen.push(0);
        frames.push({
          narr: 's became 0, so the loop condition <code>s &gt; 0</code> stops. Add the <b>empty</b> submask 0 by hand. Total: <b>' + seen.length + '</b> submasks, each once, from largest to smallest.',
          parts: [{ type: 'set', label: 'all submasks of ' + m, items: seen.slice(), hl: one('0', 'sel') }, { type: 'vars', vals: { count: seen.length, expected: 1 << popcount(m) }, hl: { count: 'ok' } }]
        });
        frames.push({
          narr: 'The whole loop in code. Remember the two details: the loop stops at <code>s &gt; 0</code>, so the empty submask 0 is handled separately; and over <b>all</b> masks m of n bits, this inner loop runs 3<sup>n</sup> times in total.',
          parts: [{ type: 'code', label: 'submask enumeration', lang: 'java', code: 'for (int s = m; s > 0; s = (s - 1) & m) {\n    visit(s);\n}\nvisit(0); // the empty submask', hl: { 1: 'cur', 4: 'ok' } }]
        });
        return frames;
      }
    }],
    problems: [
      {
        title: 'Subsets (Power Set) with Bitmasks',
        level: 'Medium',
        tags: ['bitmask', 'enumeration'],
        companies: ['Meta', 'Amazon', 'Bloomberg'],
        statement: `<p>Given an array <code>nums</code> of <b>distinct</b> integers, return all possible subsets (the power set). The answer must not contain duplicate subsets; any order is fine.</p>`,
        constraints: `1 ≤ n ≤ 10, −10 ≤ nums[i] ≤ 10, all values distinct.`,
        example: `${H.arr([1, 2, 3], { label: 'nums' })}<p>Output: ${H.c('p', '[[], [1], [2], [1,2], [3], [1,3], [2,3], [1,2,3]]')} — 2<sup>3</sup> = 8 subsets. Mask 5 = 101 picks indexes 0 and 2 → [1, 3].</p>`,
        brute: {
          why: `<p>A naive idea is nested loops: one loop for size-1 subsets, two nested loops for size-2, and so on — but the number of nested loops depends on n, so you cannot write it directly, and generating "combinations of each size" separately duplicates logic. The recursive pick/skip approach works (and is the backtracking module's topic), but it needs a call stack and list copying. The bitmask version flattens all of this into one counting loop.</p>`,
          code: `
            List<List<Integer>> subsetsRecursive(int[] nums) {
                List<List<Integer>> all = new ArrayList<>();
                build(nums, 0, new ArrayList<>(), all);
                return all;
            }
            void build(int[] nums, int i, List<Integer> cur, List<List<Integer>> all) {
                if (i == nums.length) { all.add(new ArrayList<>(cur)); return; }
                build(nums, i + 1, cur, all);          // skip nums[i]
                cur.add(nums[i]);
                build(nums, i + 1, cur, all);          // take nums[i]
                cur.remove(cur.size() - 1);            // undo
            }`
        },
        mcq: {
          q: 'With nums = [7, 8, 9], which subset does mask 6 represent?',
          options: ['[8, 9]', '[7, 8]', '[7, 9]', '[9]'],
          answer: 0,
          explain: '6 = 110: bit 1 and bit 2 are ON → indexes 1 and 2 → [8, 9]. Bit 0 (index 0, value 7) is OFF.'
        },
        hints: [
          `<p><b>Aha:</b> each subset is a yes/no choice per element — that is a row of n bits. All rows of n bits are the numbers 0 .. 2<sup>n</sup> − 1.</p>`,
          `<p>Outer loop <code>mask</code> from 0 to <code>(1 &lt;&lt; n) − 1</code>; inner loop j from 0 to n − 1 adds <code>nums[j]</code> when <code>(mask &gt;&gt; j) &amp; 1</code> is 1.</p>`,
          `<p>Edge cases: mask 0 gives the empty subset (must be included); n is small (≤ 10) so 1 &lt;&lt; n is safe. Recipe: result = [] → for mask in 0..2<sup>n</sup>−1: cur = [] → for j in 0..n−1: if bit j of mask is 1, add nums[j] → add cur to result.</p>`
        ],
        tests: { sig: 'int[] -> list<list<int>>', fn: 'subsets', cmp: 'sets', cases: [[[[1, 2, 3]], [[], [1], [2], [3], [1, 2], [1, 3], [2, 3], [1, 2, 3]]], [[[0]], [[], [0]]], [[[-1, 5]], [[], [-1], [5], [-1, 5]]], [[[4, -10, 10, 0]], [[], [4], [-10], [10], [0], [4, -10], [4, 10], [4, 0], [-10, 10], [-10, 0], [10, 0], [4, -10, 10], [4, -10, 0], [4, 10, 0], [-10, 10, 0], [4, -10, 10, 0]]], [[[1, 2, 3, 4, 5]], [[], [1], [2], [3], [4], [5], [1, 2], [1, 3], [1, 4], [1, 5], [2, 3], [2, 4], [2, 5], [3, 4], [3, 5], [4, 5], [1, 2, 3], [1, 2, 4], [1, 2, 5], [1, 3, 4], [1, 3, 5], [1, 4, 5], [2, 3, 4], [2, 3, 5], [2, 4, 5], [3, 4, 5], [1, 2, 3, 4], [1, 2, 3, 5], [1, 2, 4, 5], [1, 3, 4, 5], [2, 3, 4, 5], [1, 2, 3, 4, 5]]], [[[7, 8, 9]], [[], [7], [8], [9], [7, 8], [7, 9], [8, 9], [7, 8, 9]]]] },
        solution: {
          approach: `<p>Count masks from 0 to 2<sup>n</sup> − 1 and decode each mask's ON bits into a list. Every subset corresponds to exactly one mask, so there are no duplicates and nothing is missed.</p>`,
          code: `
            class Solution {
                public List<List<Integer>> subsets(int[] nums) {
                    int n = nums.length;
                    List<List<Integer>> result = new ArrayList<>(1 << n);
                    for (int mask = 0; mask < (1 << n); mask++) {     // one mask per subset
                        List<Integer> cur = new ArrayList<>();
                        for (int j = 0; j < n; j++) {
                            if (((mask >> j) & 1) == 1) {              // bit j ON -> take nums[j]
                                cur.add(nums[j]);
                            }
                        }
                        result.add(cur);
                    }
                    return result;
                }

                public static void main(String[] args) {
                    System.out.println(new Solution().subsets(new int[]{1, 2, 3}));
                }
            }`,
          alt: [
            { lang: 'python', code: `def subsets(nums):
    n = len(nums)
    # one mask per subset; bit j ON -> take nums[j]
    return [[nums[j] for j in range(n) if mask >> j & 1] for mask in range(1 << n)]` },
            { lang: 'js', code: `function subsets(nums) {
  const n = nums.length, result = [];
  for (let mask = 0; mask < (1 << n); mask++) {   // one mask per subset
    result.push(nums.filter((_, j) => (mask >> j) & 1));
  }
  return result;
}` },
            { lang: 'cpp', code: `class Solution {
public:
    vector<vector<int>> subsets(const vector<int>& nums) {
        int n = nums.size();
        vector<vector<int>> result;
        result.reserve(1 << n);
        for (int mask = 0; mask < (1 << n); ++mask) {   // one mask per subset
            vector<int> cur;
            for (int j = 0; j < n; ++j)
                if ((mask >> j) & 1) cur.push_back(nums[j]);
            result.push_back(move(cur));
        }
        return result;
    }
};` }
          ],
          dry: {
            head: ['mask', 'binary', 'bits ON', 'subset added'],
            rows: [
              ['0', '000', 'none', '[]'],
              ['1', '001', '0', '[1]'],
              ['2', '010', '1', '[2]'],
              ['3', '011', '0, 1', '[1, 2]'],
              ['4', '100', '2', '[3]'],
              ['5', '101', '0, 2', '[1, 3]'],
              ['6', '110', '1, 2', '[2, 3]'],
              ['7', '111', '0, 1, 2', '<span class="c-p">[1, 2, 3]</span>']
            ]
          },
          complexity: `<p><b>Time O(n · 2<sup>n</sup>)</b>: 2<sup>n</sup> masks, n bit checks each (and the output itself has that size). <b>Space O(n · 2<sup>n</sup>)</b> for the output, O(1) extra besides it.</p>`,
          followUps: ['Subsets II: the array has duplicates — how do you avoid duplicate subsets?', 'Return only subsets of size k (hint: filter with Integer.bitCount(mask) == k, or Gosper\'s hack).', 'Generate them in Gray-code order so consecutive subsets differ by one element.']
        }
      }
    ]
  });

  // ===================== PRACTICE (Easy → Medium → Hard) =====================
  practice.push({
    title: 'Missing Number',
    level: 'Easy',
    tags: ['XOR', 'math'],
    companies: ['Amazon', 'Microsoft', 'Apple'],
    statement: `<p>An array <code>nums</code> holds <b>n distinct</b> numbers taken from the range <code>0..n</code>. Exactly one number of the range is missing. Return it, using O(N) time and O(1) extra space.</p>`,
    constraints: `1 ≤ n ≤ 10<sup>4</sup>, 0 ≤ nums[i] ≤ n, all values distinct.`,
    example: `${H.arr([3, 0, 1], { label: 'nums' })}<p>n = 3, range 0..3. Output <b>${H.c('p', '2')}</b>: 0, 1 and 3 are present, 2 is not. With XOR: (0^1^2^3) ^ (3^0^1) — every present value meets its twin and cancels, leaving 2.</p>`,
    brute: {
      why: `<p>For every candidate v in 0..n, scan the whole array to see whether v is there: (n + 1) × n ≈ 10<sup>8</sup> comparisons for n = 10<sup>4</sup>. The wasted work: searching the array again for every candidate. A boolean "seen" array fixes the time but costs O(N) memory.</p>`,
      code: `
        int missingBrute(int[] nums) {
            int n = nums.length;
            for (int v = 0; v <= n; v++) {
                boolean found = false;
                for (int x : nums) if (x == v) { found = true; break; }  // linear search
                if (!found) return v;
            }
            return -1;
        }`
    },
    mcq: {
      q: 'Why is XOR safer than the formula n(n+1)/2 − sum(nums)?',
      options: ['XOR is always faster', 'XOR can never overflow, the sum can for large n', 'The formula is wrong for n = 1', 'XOR works on unsorted input, the formula does not'],
      answer: 1,
      explain: 'Both work on unsorted input and both are O(N). But n(n+1)/2 overflows int when n is about 65,536 or more; XOR results never exceed the bit width of the inputs.'
    },
    hints: [
      `<p><b>Aha:</b> if you XOR the full range 0..n with all array values, every present number appears twice and cancels. Only the missing one appears once.</p>`,
      `<p>Single int accumulator. Neat trick: start with <code>res = n</code> and in one loop do <code>res ^= i ^ nums[i]</code> — this covers indexes 0..n−1 plus n itself.</p>`,
      `<p>Edge cases: the missing number can be 0 or n — the XOR handles both. Recipe: res = n → for i in 0..n−1: res ^= i ^ nums[i] → return res.</p>`
    ],
    tests: { sig: 'int[] -> int', fn: 'missingNumber', cases: [[[[3, 0, 1]], 2], [[[0, 1]], 2], [[[9, 6, 4, 2, 3, 5, 7, 0, 1]], 8], [[[0]], 1], [[[1]], 0], [[[1, 2, 3, 4]], 0], [[[0, 1, 2, 3]], 4]] },
    solution: {
      approach: `<p>XOR the range and the array together; twins cancel and the missing number is left.</p>`,
      code: `
        class Solution {
            public int missingNumber(int[] nums) {
                int res = nums.length;               // include n itself
                for (int i = 0; i < nums.length; i++) {
                    res ^= i ^ nums[i];              // index i and value nums[i]
                }
                return res;                          // all present values cancelled
            }

            public static void main(String[] args) {
                System.out.println(new Solution().missingNumber(new int[]{3, 0, 1}));            // 2
                System.out.println(new Solution().missingNumber(new int[]{9,6,4,2,3,5,7,0,1})); // 8
            }
        }`,
      alt: [
        { lang: 'python', code: `def missing_number(nums):
    res = len(nums)                  # include n itself
    for i, x in enumerate(nums):
        res ^= i ^ x                 # index i and value x
    return res                       # all present values cancelled` },
        { lang: 'js', code: `function missingNumber(nums) {
  let res = nums.length;             // include n itself
  nums.forEach((x, i) => { res ^= i ^ x; });
  return res;
}` },
        { lang: 'cpp', code: `class Solution {
public:
    int missingNumber(const vector<int>& nums) {
        int res = nums.size();               // include n itself
        for (int i = 0; i < (int)nums.size(); ++i) res ^= i ^ nums[i];
        return res;
    }
};` }
      ],
      dry: {
        head: ['i', 'nums[i]', 'i ^ nums[i]', 'res'],
        rows: [['start', '–', '–', '3'], ['0', '3', '3', '3 ^ 3 = 0'], ['1', '0', '1', '0 ^ 1 = 1'], ['2', '1', '3', '1 ^ 3 = <span class="c-p">2</span>']]
      },
      complexity: `<p><b>Time O(N)</b>, <b>space O(1)</b>.</p>`,
      followUps: ['Two numbers are missing from 1..n — use the Single Number III split.', 'The array is sorted — can you do it in O(log N)? (binary search on nums[i] == i)']
    }
  });

  practice.push({
    title: 'Hamming Distance',
    level: 'Easy',
    tags: ['XOR', 'bit count'],
    companies: ['Meta', 'Adobe'],
    statement: `<p>The <b>Hamming distance</b> between two integers is the number of bit positions where their bits differ. Given <code>x</code> and <code>y</code>, return it.</p>`,
    constraints: `0 ≤ x, y ≤ 2<sup>31</sup> − 1`,
    example: `${H.bits(1, 4, { label: 'x = 1', hl: { 0: 'r' } })}${H.bits(4, 4, { label: 'y = 4', hl: { 2: 'r' } })}${H.bits(5, 4, { label: 'x ^ y', hl: { 2: 'g', 0: 'g' } })}<p>Output <b>${H.c('p', '2')}</b>: bits 0 and 2 differ. XOR marks every differing column with a 1; count the 1s.</p>`,
    brute: {
      why: `<p>Compare the two numbers column by column: for each of the 32 positions, extract both bits and compare. Correct and only 32 steps, but it does two extractions and a comparison per column — XOR does all 32 comparisons in <b>one</b> instruction, and <code>bitCount</code> counts in one more.</p>`,
      code: `
        int hammingBrute(int x, int y) {
            int d = 0;
            for (int i = 0; i < 32; i++) {
                if (((x >> i) & 1) != ((y >> i) & 1)) d++;   // compare column i
            }
            return d;
        }`
    },
    mcq: {
      q: 'Which expression gives the Hamming distance in Java?',
      options: ['<code>Integer.bitCount(x &amp; y)</code>', '<code>Integer.bitCount(x | y)</code>', '<code>Integer.bitCount(x ^ y)</code>', '<code>Math.abs(x - y)</code>'],
      answer: 2,
      explain: 'x ^ y has a 1 exactly in the differing columns; bitCount counts them. AND counts common ones, OR counts columns where at least one is 1.'
    },
    hints: [
      `<p><b>Aha:</b> "positions where bits differ" is the definition of XOR. So the differing positions are the ON bits of <code>x ^ y</code>.</p>`,
      `<p>Count ON bits of <code>x ^ y</code> with Kernighan's loop (<code>z &amp;= z - 1</code>) or a built-in popcount (<code>Integer.bitCount</code> / <code>int.bit_count</code> / <code>std::popcount</code>).</p>`,
      `<p>Edge cases: x == y → 0. Recipe: z = x ^ y → count = 0 → while z ≠ 0: z &amp;= z − 1, count++ → return count.</p>`
    ],
    tests: { sig: 'int int -> int', fn: 'hammingDistance', cases: [[[1, 4], 2], [[3, 1], 1], [[0, 0], 0], [[0, 2147483647], 31], [[2147483647, 2147483647], 0], [[7, 8], 4], [[1073741824, 1], 2]] },
    solution: {
      approach: `<p>XOR, then count set bits.</p>`,
      code: `
        class Solution {
            public int hammingDistance(int x, int y) {
                int z = x ^ y, count = 0;   // 1s mark differing columns
                while (z != 0) {
                    z &= z - 1;             // remove one differing column
                    count++;
                }
                return count;               // same as Integer.bitCount(x ^ y)
            }

            public static void main(String[] args) {
                System.out.println(new Solution().hammingDistance(1, 4)); // 2
            }
        }`,
      alt: [
        { lang: 'python', code: `def hamming_distance(x, y):
    return (x ^ y).bit_count()   # 1s mark differing columns (Python 3.10+; else bin(x ^ y).count("1"))` },
        { lang: 'js', code: `function hammingDistance(x, y) {
  let z = x ^ y, count = 0;      // 1s mark differing columns
  while (z !== 0) {
    z &= z - 1;                  // remove one differing column
    count++;
  }
  return count;
}` },
        { lang: 'cpp', code: `class Solution {
public:
    int hammingDistance(int x, int y) {
        return std::popcount(static_cast<uint32_t>(x ^ y));   // C++20 <bit>; __builtin_popcount before that
    }
};` }
      ],
      dry: {
        head: ['step', 'z (binary)', 'count'],
        rows: [['x ^ y', '101', '0'], ['z &amp;= z − 1', '100', '1'], ['z &amp;= z − 1', '000', '<span class="c-p">2</span>']]
      },
      complexity: `<p><b>Time O(number of differing bits) ≤ 32</b>, <b>space O(1)</b>.</p>`,
      followUps: ['Sum of Hamming distances over all pairs of an array (Total Hamming Distance).']
    }
  });

  practice.push({
    title: 'Number Complement',
    level: 'Easy',
    tags: ['masks', 'XOR'],
    companies: ['Cloudera', 'Amazon'],
    statement: `<p>The <b>complement</b> of a positive integer flips every bit of its binary representation <b>without leading zeros</b>. Given <code>num</code>, return its complement. (Note: the bitwise NOT <code>~num</code> also flips the leading zeros and gives a negative number in every language — not what we want.)</p>`,
    constraints: `1 ≤ num ≤ 2<sup>31</sup> − 1`,
    example: `${H.bits(5, 3, { label: 'num = 5' })}${H.bits(7, 3, { label: 'mask = 111', hl: { 2: 'y', 1: 'y', 0: 'y' } })}${H.bits(2, 3, { label: '5 ^ 7 = 2', hl: { 1: 'g' } })}<p>Output <b>${H.c('p', '2')}</b>: 101 → 010. XOR with an all-ones mask of the same length flips exactly the meaningful bits.</p>`,
    brute: {
      why: `<p>Convert to a binary string, flip each character, parse it back. It works, but it allocates strings and does character work for something that is a single XOR. Using <code>~num</code> directly is the classic wrong answer (−6 for 5).</p>`,
      code: `
        int complementBrute(int num) {
            String s = Integer.toBinaryString(num);
            StringBuilder sb = new StringBuilder();
            for (char c : s.toCharArray()) sb.append(c == '1' ? '0' : '1');  // flip each digit
            return Integer.parseInt(sb.toString(), 2);
        }`
    },
    mcq: {
      q: 'For num = 10 (1010), which mask must you XOR with?',
      options: ['7 (0111)', '−1 (all ones)', '8 (1000)', '15 (1111)'],
      answer: 3,
      explain: 'The mask must have the same length as num (4 bits) and be all ones: (highestOneBit(10) &lt;&lt; 1) − 1 = 16 − 1 = 15. 10 ^ 15 = 5 (0101).'
    },
    hints: [
      `<p><b>Aha:</b> XOR with 1 flips a bit. So XOR with a mask of all ones <b>exactly as long as num</b> flips just the meaningful bits.</p>`,
      `<p>Mask = <code>(Integer.highestOneBit(num) &lt;&lt; 1) − 1</code>. For num = 5: highestOneBit = 4, 8 − 1 = 7 = 111. Same idea elsewhere: Python <code>(1 &lt;&lt; num.bit_length()) - 1</code>, JavaScript <code>0xFFFFFFFF &gt;&gt;&gt; Math.clz32(num)</code>, C++ <code>(std::bit_floor(u) &lt;&lt; 1) - 1</code> on an unsigned u.</p>`,
      `<p>Edge case: num ≥ 2<sup>30</sup>: highestOneBit &lt;&lt; 1 = 2<sup>31</sup> overflows to MIN_VALUE, and MIN_VALUE − 1 = MAX_VALUE = 31 ones — still the right mask. Recipe: mask = (highestOneBit(num) &lt;&lt; 1) − 1 → return num ^ mask.</p>`
    ],
    tests: { sig: 'int -> int', fn: 'findComplement', cases: [[[5], 2], [[1], 0], [[10], 5], [[7], 0], [[8], 7], [[2147483647], 0], [[1073741824], 1073741823], [[1073741829], 1073741818]] },
    solution: {
      approach: `<p>Build an all-ones mask covering num's bit length and XOR.</p>`,
      code: `
        class Solution {
            public int findComplement(int num) {
                int mask = (Integer.highestOneBit(num) << 1) - 1;  // e.g. 5 -> 111
                return num ^ mask;                                 // flip only meaningful bits
            }

            public static void main(String[] args) {
                Solution s = new Solution();
                System.out.println(s.findComplement(5));                   // 2
                System.out.println(s.findComplement(1));                   // 0
                System.out.println(s.findComplement(Integer.MAX_VALUE));   // 0
            }
        }`,
      alt: [
        { lang: 'python', code: `def find_complement(num):
    mask = (1 << num.bit_length()) - 1   # e.g. 5 -> 111; no overflow in Python
    return num ^ mask` },
        { lang: 'js', code: `function findComplement(num) {
  // Math.clz32 counts leading zeros of the 32-bit value; >>> keeps the mask unsigned
  const mask = 0xFFFFFFFF >>> Math.clz32(num);   // e.g. 5 -> 111
  return num ^ mask;
}` },
        { lang: 'cpp', code: `class Solution {
public:
    int findComplement(int num) {
        uint32_t u = num;
        uint32_t mask = (std::bit_floor(u) << 1) - 1;   // unsigned, so 2^31 does not overflow
        return static_cast<int>(u ^ mask);
    }
};` }
      ],
      dry: {
        head: ['num', 'highestOneBit', 'mask', 'num ^ mask'],
        rows: [['5 (101)', '4', '7 (111)', '<span class="c-p">2</span> (010)'], ['10 (1010)', '8', '15 (1111)', '<span class="c-p">5</span> (0101)'], ['1 (1)', '1', '1', '<span class="c-p">0</span>']]
      },
      complexity: `<p><b>Time O(1)</b>, <b>space O(1)</b>.</p>`,
      followUps: ['Do it without Integer.highestOneBit (smear bits right: m |= m &gt;&gt; 1, m |= m &gt;&gt; 2, … up to 16).']
    }
  });

  practice.push({
    title: 'Counting Bits for 0..n',
    level: 'Easy',
    tags: ['DP', 'bit count'],
    companies: ['Amazon', 'Google'],
    statement: `<p>Given <code>n</code>, return an array <code>ans</code> of length n + 1 where <code>ans[i]</code> is the number of 1 bits in i. Aim for O(n) total, without calling a built-in popcount per number.</p>`,
    constraints: `0 ≤ n ≤ 10<sup>5</sup>`,
    example: `<p>n = 5 → ${H.arr([0, 1, 1, 2, 1, 2], { label: 'ans' })} because 0 = 0, 1 = 1, 2 = 10, 3 = 11, 4 = 100, 5 = 101.</p><p>Key link: ${H.c('b', 'ans[5] = ans[5 &gt;&gt; 1] + (5 &amp; 1) = ans[2] + 1 = 2')}.</p>`,
    brute: {
      why: `<p>Count bits of every number separately (loop over its bits): O(n log n) ≈ 1.7·10<sup>6</sup> steps — fast enough, but it throws away the fact that i's answer is almost the same as a smaller number's answer. The DP reuses that work.</p>`,
      code: `
        int[] countBitsBrute(int n) {
            int[] ans = new int[n + 1];
            for (int i = 0; i <= n; i++) {
                int x = i, c = 0;
                while (x != 0) { c += x & 1; x >>= 1; }   // look at every bit of i
                ans[i] = c;
            }
            return ans;
        }`
    },
    mcq: {
      q: 'Which recurrence is correct for the number of 1 bits?',
      options: ['ans[i] = ans[i − 1] + 1', 'ans[i] = 2 · ans[i &gt;&gt; 1]', 'ans[i] = ans[i &gt;&gt; 1] + (i &amp; 1)', 'ans[i] = ans[i &amp; (i − 1)] − 1'],
      answer: 2,
      explain: 'i &gt;&gt; 1 drops bit 0 and keeps all other bits, so ans[i] = ans[i &gt;&gt; 1] + (bit 0 of i). ans[i − 1] + 1 fails for i = 4 (ans[3] + 1 = 3, but 4 has one bit).'
    },
    hints: [
      `<p><b>Aha:</b> i and <code>i &gt;&gt; 1</code> share all bits except bit 0, and <code>i &gt;&gt; 1</code> is smaller — its answer is already computed.</p>`,
      `<p>One array, fill left to right: <code>ans[i] = ans[i &gt;&gt; 1] + (i &amp; 1)</code>. (Alternative: <code>ans[i] = ans[i &amp; (i − 1)] + 1</code>.)</p>`,
      `<p>Edge cases: n = 0 → [0]. Recipe: ans = new int[n + 1] → for i = 1..n: ans[i] = ans[i &gt;&gt; 1] + (i &amp; 1) → return ans.</p>`
    ],
    tests: { sig: 'int -> int[]', fn: 'countBits', cases: [[[5], [0, 1, 1, 2, 1, 2]], [[0], [0]], [[1], [0, 1]], [[2], [0, 1, 1]], [[8], [0, 1, 1, 2, 1, 2, 2, 3, 1]], [[16], [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4, 1]]] },
    solution: {
      approach: `<p>Bottom-up DP using the shift relation.</p>`,
      code: `
        class Solution {
            public int[] countBits(int n) {
                int[] ans = new int[n + 1];
                for (int i = 1; i <= n; i++) {
                    ans[i] = ans[i >> 1] + (i & 1);   // drop bit 0, then add it back
                }
                return ans;
            }

            public static void main(String[] args) {
                System.out.println(Arrays.toString(new Solution().countBits(5))); // [0, 1, 1, 2, 1, 2]
            }
        }`,
      alt: [
        { lang: 'python', code: `def count_bits(n):
    ans = [0] * (n + 1)
    for i in range(1, n + 1):
        ans[i] = ans[i >> 1] + (i & 1)   # drop bit 0, then add it back
    return ans` },
        { lang: 'js', code: `function countBits(n) {
  const ans = new Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) ans[i] = ans[i >> 1] + (i & 1);   // drop bit 0, add it back
  return ans;
}` },
        { lang: 'cpp', code: `class Solution {
public:
    vector<int> countBits(int n) {
        vector<int> ans(n + 1, 0);
        for (int i = 1; i <= n; ++i) ans[i] = ans[i >> 1] + (i & 1);   // drop bit 0, add it back
        return ans;
    }
};` }
      ],
      dry: {
        head: ['i', 'binary', 'i &gt;&gt; 1', 'i &amp; 1', 'ans[i]'],
        rows: [['1', '1', '0', '1', '0 + 1 = 1'], ['2', '10', '1', '0', '1 + 0 = 1'], ['3', '11', '1', '1', '1 + 1 = 2'], ['4', '100', '2', '0', '1 + 0 = 1'], ['5', '101', '2', '1', '1 + 1 = <span class="c-p">2</span>']]
      },
      complexity: `<p><b>Time O(n)</b>, <b>space O(1)</b> besides the output.</p>`,
      followUps: ['Sum of set bits over 1..n for n up to 10<sup>18</sup> (count per bit column with a formula).']
    }
  });

  practice.push({
    title: 'Reverse Bits',
    level: 'Easy',
    tags: ['shifts', 'unsigned'],
    companies: ['Apple', 'Airbnb'],
    statement: `<p>Reverse the bits of a 32-bit integer: bit 0 swaps with bit 31, bit 1 with bit 30, and so on. The input and output are <b>signed 32-bit</b> ints, so a result with bit 31 ON is returned as a negative number (for example 1 → −2147483648). Python has unbounded ints, so a Python solution must convert the 32-bit result back to its signed value.</p>`,
    constraints: `Input is any 32-bit pattern. Called many times → keep it fast.`,
    example: `<p>Input 00000010100101000001111010011100 (43261596)<br>Output 00111001011110000010100101000000 (<b>${H.c('p', '964176192')}</b>). Read the input backwards and you get the output.</p>`,
    brute: {
      why: `<p>Build a 32-character binary string with leading zeros, reverse it, and parse it back as unsigned. Works, but allocates strings and needs <code>Integer.parseUnsignedInt</code> for results ≥ 2<sup>31</sup> — slow when called millions of times.</p>`,
      code: `
        int reverseBrute(int n) {
            String s = String.format("%32s", Integer.toBinaryString(n)).replace(' ', '0');
            String r = new StringBuilder(s).reverse().toString();
            return Integer.parseUnsignedInt(r, 2);   // r can exceed Integer.MAX_VALUE
        }`
    },
    mcq: {
      q: 'Why must the loop use <code>n &gt;&gt;&gt;= 1</code> instead of <code>n &gt;&gt;= 1</code> if you loop while n ≠ 0?',
      options: ['&gt;&gt; is slower', '&gt;&gt; copies the sign bit, so a negative n never becomes 0', '&gt;&gt;&gt; also reverses the bits', 'There is no difference'],
      answer: 1,
      explain: 'For negative n, &gt;&gt; keeps shifting in 1s, so n stays negative forever. &gt;&gt;&gt; shifts in 0s. (With a fixed 32-iteration loop either works, since we read bit 0 each time.)'
    },
    hints: [
      `<p><b>Aha:</b> peel bits off the <b>right</b> end of n and push them onto the right end of the result — the first bit peeled ends up on the far left after 32 pushes.</p>`,
      `<p>Loop exactly 32 times: <code>res = (res &lt;&lt; 1) | (n &amp; 1); n &gt;&gt;&gt;= 1;</code>. (C++: do it on <code>uint32_t</code>. Python: start with <code>n &amp;= 0xFFFFFFFF</code>, use <code>&gt;&gt;</code>, and turn a result ≥ 2<sup>31</sup> back into a negative number.)</p>`,
      `<p>Edge case: always run all 32 iterations, even if n becomes 0 early — the remaining shifts are what move the bits already in res up to their correct high positions. Recipe: res = 0 → repeat 32: res = res &lt;&lt; 1 | (n &amp; 1), n &gt;&gt;&gt;= 1 → return res. Built-in: <code>Integer.reverse(n)</code>.</p>`
    ],
    tests: { sig: 'int -> int', fn: 'reverseBits', cases: [[[43261596], 964176192], [[-3], -1073741825], [[0], 0], [[1], -2147483648], [[-1], -1], [[-2147483648], 1], [[2147483647], -2], [[2], 1073741824]] },
    solution: {
      approach: `<p>Shift bits out of n from the right and into res from the right, 32 times.</p>`,
      code: `
        class Solution {
            public int reverseBits(int n) {
                int res = 0;
                for (int i = 0; i < 32; i++) {
                    res = (res << 1) | (n & 1);   // append n's lowest bit to res
                    n >>>= 1;                     // unsigned shift: zeros come in
                }
                return res;
            }

            public static void main(String[] args) {
                System.out.println(new Solution().reverseBits(43261596)); // 964176192
                System.out.println(Integer.reverse(43261596));            // same, built-in
            }
        }`,
      alt: [
        { lang: 'python', code: `def reverse_bits(n):
    n &= 0xFFFFFFFF                      # read the input as 32 raw bits
    res = 0
    for _ in range(32):
        res = (res << 1) | (n & 1)       # append n's lowest bit to res
        n >>= 1                          # n is non-negative now, so >> fills with 0
    return res - (1 << 32) if res >> 31 else res   # back to a signed 32-bit value` },
        { lang: 'js', code: `function reverseBits(n) {
  let res = 0;
  for (let i = 0; i < 32; i++) {
    res = (res << 1) | (n & 1);   // << and | keep res a signed 32-bit int
    n >>>= 1;                     // unsigned shift: zeros come in
  }
  return res;                     // use res >>> 0 if you want the unsigned value
}` },
        { lang: 'cpp', code: `class Solution {
public:
    int reverseBits(int n) {
        uint32_t u = n, res = 0;          // unsigned: >> always fills with 0
        for (int i = 0; i < 32; ++i) {
            res = (res << 1) | (u & 1u);
            u >>= 1;
        }
        return static_cast<int>(res);
    }
};` }
      ],
      dry: {
        head: ['iteration', 'n &amp; 1', 'res (low bits shown)', 'note'],
        rows: [['1', '0', '0', 'n = …11100 → bit 0 is 0'], ['2', '0', '00', ''], ['3', '1', '001', 'first 1 enters'], ['4', '1', '0011', ''], ['…', '…', '…', '32 rounds total'], ['32', '0', '<span class="c-p">964176192</span>', 'first bit read is now bit 31']]
      },
      complexity: `<p><b>Time O(32) = O(1)</b>, <b>space O(1)</b>. With a 256-entry byte lookup table you can do 4 lookups instead of 32 steps when called very often.</p>`,
      followUps: ['Reverse with divide and conquer: swap 16-bit halves, then 8-bit groups, … (5 mask steps).', 'Cache reversed bytes for a hot path.']
    }
  });

  practice.push({
    title: 'Sum of Two Integers Without + or −',
    level: 'Medium',
    tags: ['XOR', 'AND', 'carry'],
    companies: ['Meta', 'Hulu', 'Amazon'],
    statement: `<p>Return <code>a + b</code> without using the operators <code>+</code> or <code>-</code> (also no <code>++</code>/<code>--</code>). Negative numbers must work.</p>`,
    constraints: `−1000 ≤ a, b ≤ 1000 (but your method should work for any 32-bit int, wrapping like 32-bit signed addition: 2147483647 + 1 = −2147483648).`,
    example: `<p>a = 2 (010), b = 3 (011) → <b>${H.c('p', '5')}</b>.</p>${H.table(['round', 'a ^ b (sum without carry)', '(a &amp; b) &lt;&lt; 1 (carry)'], [['1', '001', '100'], ['2', '101', '000 → stop']])}<p>XOR adds each column ignoring carries; AND finds columns that produce a carry, shifted one place left. Repeat until no carry is left.</p>`,
    brute: {
      why: `<p>A ripple-carry adder: walk the 32 columns one at a time, compute the column's sum bit and carry with XOR/AND, and build the result. It is correct and always 32 steps, but it processes one column at a time. The optimal loop handles <b>all columns in parallel</b> each round and stops as soon as the carry dies (often after 1–2 rounds).</p>`,
      code: `
        int addBrute(int a, int b) {
            int res = 0, carry = 0;
            for (int i = 0; i < 32; i++) {
                int x = (a >> i) & 1, y = (b >> i) & 1;
                int s = x ^ y ^ carry;                       // sum bit of this column
                carry = (x & y) | (x & carry) | (y & carry); // carry into next column
                res |= s << i;
            }
            return res;
        }`
    },
    mcq: {
      q: 'What does <code>(a &amp; b) &lt;&lt; 1</code> represent when adding a and b?',
      options: ['The carries, moved to the column they are added into', 'The sum without carries', 'The difference a − b', 'Twice the larger number'],
      answer: 0,
      explain: 'A carry is born in a column where both bits are 1 (AND), and it is added to the next column on the left (shift by 1).'
    },
    hints: [
      `<p><b>Aha:</b> a + b = (a ^ b) + ((a &amp; b) &lt;&lt; 1). XOR is the sum without carries, the AND-shift is the carries. That is again an addition — so repeat.</p>`,
      `<p>Loop: <code>while (b != 0) { int carry = (a &amp; b) &lt;&lt; 1; a ^= b; b = carry; }</code>. Each round pushes carries at least one column left, so it ends within 32 rounds.</p>`,
      `<p>Negatives: in Java and with JavaScript's bit operators, ints wrap modulo 2<sup>32</sup>, so the loop works unchanged (a carry out of bit 31 just disappears). In C++ use <code>unsigned</code> so the wrap is well defined. In Python you must mask with 0xFFFFFFFF or it loops forever. Recipe: while b ≠ 0: carry = (a &amp; b) &lt;&lt; 1, a = a ^ b, b = carry → return a.</p>`
    ],
    tests: { sig: 'int int -> int', fn: 'getSum', cases: [[[2, 3], 5], [[-2, 3], 1], [[-5, -7], -12], [[0, 0], 0], [[1000, -1000], 0], [[-1000, -1000], -2000], [[2147483647, 1], -2147483648], [[-2147483648, -1], 2147483647], [[-1, 1], 0]] },
    solution: {
      approach: `<p>Repeat "sum without carry + carry" until there is no carry.</p>`,
      code: `
        class Solution {
            public int getSum(int a, int b) {
                while (b != 0) {
                    int carry = (a & b) << 1;   // columns that overflow, moved left
                    a = a ^ b;                  // add without carries
                    b = carry;                  // now add the carries
                }
                return a;
            }

            public static void main(String[] args) {
                Solution s = new Solution();
                System.out.println(s.getSum(2, 3));    // 5
                System.out.println(s.getSum(-2, 3));   // 1
                System.out.println(s.getSum(-5, -7));  // -12
            }
        }`,
      alt: [{ lang: 'python', run: true, code: `def get_sum(a, b):
    MASK, MAX = 0xFFFFFFFF, 0x7FFFFFFF
    while b & MASK:                      # keep everything inside 32 bits
        carry = ((a & b) << 1) & MASK
        a = (a ^ b) & MASK
        b = carry
    a &= MASK
    return a if a <= MAX else ~(a ^ MASK)  # convert back to a signed value

print(get_sum(2, 3), get_sum(-2, 3), get_sum(-5, -7))  # 5 1 -12` },
        { lang: 'js', code: `function getSum(a, b) {
  while (b !== 0) {
    const carry = (a & b) << 1;   // bitwise ops wrap at 32 bits, like Java
    a ^= b;                       // add without carries
    b = carry;
  }
  return a;
}` },
        { lang: 'cpp', code: `class Solution {
public:
    int getSum(int a, int b) {
        uint32_t x = a, y = b;          // unsigned: shifting a carry out of bit 31 is well defined
        while (y != 0) {
            uint32_t carry = (x & y) << 1;
            x ^= y;                     // add without carries
            y = carry;
        }
        return static_cast<int>(x);
    }
};` }],
      dry: {
        head: ['round', 'a', 'b', 'carry = (a &amp; b) &lt;&lt; 1', 'new a = a ^ b'],
        rows: [['1', '010 (2)', '011 (3)', '100 (4)', '001 (1)'], ['2', '001 (1)', '100 (4)', '000', '101 (5)'], ['end', '<span class="c-p">5</span>', '0', '–', '–']]
      },
      complexity: `<p><b>Time O(32) = O(1)</b> rounds at most (each round moves the lowest carry at least one column left). <b>Space O(1)</b>.</p>`,
      followUps: ['Subtract without − (add the 2\'s complement: a + (~b + 1)).', 'Multiply two ints with shifts and adds (Russian peasant multiplication).']
    }
  });

  practice.push({
    title: 'Bitwise AND of a Number Range',
    level: 'Medium',
    tags: ['common prefix', 'Kernighan'],
    companies: ['Amazon', 'Microsoft'],
    statement: `<p>Given <code>left ≤ right</code>, return the bitwise AND of <b>all</b> numbers in <code>[left, right]</code>, inclusive.</p>`,
    constraints: `0 ≤ left ≤ right ≤ 2<sup>31</sup> − 1`,
    example: `<p>left = 5, right = 7:</p>${H.bits(5, 3, { label: '5', hl: { 2: 'g' } })}${H.bits(6, 3, { label: '6', hl: { 2: 'g' } })}${H.bits(7, 3, { label: '7', hl: { 2: 'g' } })}<p>Output <b>${H.c('p', '4')}</b> (100). Only the shared left part (the common prefix "1") survives; any lower bit flips to 0 somewhere in the range.</p>`,
    brute: {
      why: `<p>AND every number from left to right. The range can contain 2·10<sup>9</sup> numbers → TLE. Worse, a loop <code>for (int i = left; i &lt;= right; i++)</code> with right = Integer.MAX_VALUE never ends (i overflows). The wasted work: once the result hits 0 nothing can change, and the answer only depends on the common prefix.</p>`,
      code: `
        int rangeAndBrute(int left, int right) {
            int res = left;
            for (long i = left; i <= right && res != 0; i++) {   // long avoids overflow
                res &= (int) i;
            }
            return res;
        }`
    },
    mcq: {
      q: 'Why does any bit below the common prefix of left and right become 0?',
      options: ['Because AND always returns 0 for ranges', 'Because right is always even', 'It does not; only bit 0 becomes 0', 'Between two numbers that differ there, the counter passes a number with that bit 0 (e.g. ...0111 → ...1000)'],
      answer: 3,
      explain: 'If left and right first differ at bit k, then the range crosses a point where bit k flips from 0 to 1 and all lower bits reset to 0 — so every bit ≤ k is 0 in some number of the range.'
    },
    hints: [
      `<p><b>Aha:</b> the answer is the <b>common binary prefix</b> of left and right, followed by zeros.</p>`,
      `<p>Option A: shift both right until they are equal, counting shifts, then shift back. Option B: <code>while (right &gt; left) right &amp;= right - 1;</code> — keep removing right's lowest 1 until it is not above left.</p>`,
      `<p>Edge cases: left == right → that number; left = 0 → 0. Recipe (B): while right &gt; left: right = right &amp; (right − 1) → return right.</p>`
    ],
    tests: { sig: 'int int -> int', fn: 'rangeBitwiseAnd', cases: [[[5, 7], 4], [[0, 0], 0], [[1, 2147483647], 0], [[12, 15], 12], [[2147483647, 2147483647], 2147483647], [[6, 6], 6], [[1073741824, 1073742824], 1073741824], [[26, 30], 24], [[0, 1], 0]] },
    solution: {
      approach: `<p>Strip the lowest set bits of right until it is ≤ left; what remains is the common prefix.</p>`,
      code: `
        class Solution {
            public int rangeBitwiseAnd(int left, int right) {
                while (right > left) {
                    right &= right - 1;   // drop right's lowest ON bit
                }
                return right;             // only the shared prefix is left
            }

            public static void main(String[] args) {
                Solution s = new Solution();
                System.out.println(s.rangeBitwiseAnd(5, 7));                    // 4
                System.out.println(s.rangeBitwiseAnd(1, Integer.MAX_VALUE));    // 0
            }
        }`,
      alt: [
        { lang: 'python', code: `def range_bitwise_and(left, right):
    while right > left:
        right &= right - 1   # drop right's lowest ON bit
    return right             # only the shared prefix is left` },
        { lang: 'js', code: `function rangeBitwiseAnd(left, right) {
  while (right > left) right &= right - 1;   // drop right's lowest ON bit
  return right;
}` },
        { lang: 'cpp', code: `class Solution {
public:
    int rangeBitwiseAnd(int left, int right) {
        while (right > left) right &= right - 1;   // right >= 1 here, so right - 1 is safe
        return right;
    }
};` }
      ],
      dry: {
        head: ['right', 'right &gt; left (5)?', 'right &amp; (right − 1)'],
        rows: [['7 (111)', 'yes', '6 (110)'], ['6 (110)', 'yes', '4 (100)'], ['4 (100)', '<span class="c-r">no</span> → stop', '<span class="c-p">return 4</span>']]
      },
      complexity: `<p><b>Time O(31)</b> at most (one bit removed per round), <b>space O(1)</b>.</p>`,
      followUps: ['Bitwise OR of a range (fill all bits below the first differing bit with 1s).']
    }
  });

  practice.push({
    title: 'Total Hamming Distance',
    level: 'Medium',
    tags: ['per-bit counting', 'contribution'],
    companies: ['Meta', 'Google'],
    statement: `<p>Return the sum of Hamming distances over <b>all pairs</b> (i &lt; j) of the array <code>nums</code>.</p>`,
    constraints: `1 ≤ N ≤ 10<sup>5</sup>, 0 ≤ nums[i] ≤ 10<sup>9</sup>. The answer can exceed int — return a long.`,
    example: `<p>nums = [4, 14, 2] → 0100, 1110, 0010.</p>${H.table(['bit', 'ones k', 'zeros N − k', 'pairs that differ k·(N − k)'], [['0', '0', '3', '0'], ['1', '2', '1', '2'], ['2', '2', '1', '2'], ['3', '1', '2', '2']])}<p>Total = <b>${H.c('p', '6')}</b>. (Pairwise: d(4,14) = 2, d(4,2) = 2, d(14,2) = 2.)</p>`,
    brute: {
      why: `<p>Compute <code>bitCount(a ^ b)</code> for every pair: N(N − 1)/2 ≈ 5·10<sup>9</sup> pairs for N = 10<sup>5</sup> → TLE. The wasted work: we re-compare the same columns for every pair, when each column's contribution only depends on <b>how many</b> 1s and 0s it has.</p>`,
      code: `
        long totalHammingBrute(int[] nums) {
            long total = 0;
            for (int i = 0; i < nums.length; i++)
                for (int j = i + 1; j < nums.length; j++)
                    total += Integer.bitCount(nums[i] ^ nums[j]);   // O(N^2) pairs
            return total;
        }`
    },
    mcq: {
      q: 'A bit column has k ones among N numbers. How many pairs differ in that column?',
      options: ['k · k', 'k · (N − k)', 'N − k', 'k(k − 1)/2'],
      answer: 1,
      explain: 'A pair differs in this column exactly when one number has 1 and the other has 0: choose one of the k ones and one of the N − k zeros.'
    },
    hints: [
      `<p><b>Aha:</b> think per column, not per pair. In one column, a pair contributes 1 exactly when it is a (1, 0) pair.</p>`,
      `<p>For each bit 0..30: count ones k with <code>(x &gt;&gt; bit) &amp; 1</code>, add <code>(long) k * (N - k)</code>.</p>`,
      `<p>Overflow: k·(N − k) can reach 2.5·10<sup>9</sup> per column — use a 64-bit integer (<code>long</code> / <code>long long</code>; Python ints and JavaScript Numbers are exact at this size). Recipe: total = 0 → for bit 0..30: k = count of numbers with that bit → total += k·(N − k) → return total.</p>`
    ],
    tests: { sig: 'int[] -> long', fn: 'totalHammingDistance', cases: [[[[4, 14, 2]], 6], [[[4, 14, 4]], 4], [[[7]], 0], [[[0, 0]], 0], [[[1000000000, 0]], 13], [[[1, 2, 3, 4, 5, 6, 7, 8]], 55]] },
    solution: {
      approach: `<p>Contribution technique on bits: each column contributes ones × zeros.</p>`,
      code: `
        class Solution {
            public long totalHammingDistance(int[] nums) {
                int n = nums.length;
                long total = 0;
                for (int bit = 0; bit < 31; bit++) {         // values ≤ 1e9 < 2^30
                    int ones = 0;
                    for (int x : nums) ones += (x >> bit) & 1;
                    total += (long) ones * (n - ones);       // (1,0) pairs in this column
                }
                return total;
            }

            public static void main(String[] args) {
                System.out.println(new Solution().totalHammingDistance(new int[]{4, 14, 2})); // 6
            }
        }`,
      alt: [
        { lang: 'python', code: `def total_hamming_distance(nums):
    n, total = len(nums), 0
    for bit in range(31):                         # values <= 1e9 < 2^30
        ones = sum((x >> bit) & 1 for x in nums)
        total += ones * (n - ones)                # (1,0) pairs in this column
    return total` },
        { lang: 'js', code: `function totalHammingDistance(nums) {
  const n = nums.length;
  let total = 0;                                  // stays far below 2^53, so Number is exact
  for (let bit = 0; bit < 31; bit++) {
    let ones = 0;
    for (const x of nums) ones += (x >> bit) & 1;
    total += ones * (n - ones);                   // (1,0) pairs in this column
  }
  return total;
}` },
        { lang: 'cpp', code: `class Solution {
public:
    long long totalHammingDistance(const vector<int>& nums) {
        long long n = nums.size(), total = 0;
        for (int bit = 0; bit < 31; ++bit) {
            long long ones = 0;
            for (int x : nums) ones += (x >> bit) & 1;   // x >= 0 here
            total += ones * (n - ones);                  // long long: no overflow
        }
        return total;
    }
};` }
      ],
      dry: {
        head: ['bit', 'bits of 4, 14, 2', 'ones', 'ones·(3 − ones)', 'total'],
        rows: [['0', '0, 0, 0', '0', '0', '0'], ['1', '0, 1, 1', '2', '2', '2'], ['2', '1, 1, 0', '2', '2', '4'], ['3', '0, 1, 0', '1', '2', '<span class="c-p">6</span>']]
      },
      complexity: `<p><b>Time O(31·N)</b>, <b>space O(1)</b>.</p>`,
      followUps: ['Sum of XOR over all pairs (same per-bit idea, multiply by 2<sup>bit</sup>).', 'Sum of AND over all pairs: C(k, 2) · 2<sup>bit</sup> per column.']
    }
  });

  practice.push({
    title: 'Minimum Flips to Make a OR b Equal to c',
    level: 'Medium',
    tags: ['per-bit case analysis'],
    companies: ['Microsoft', 'Amazon'],
    statement: `<p>Given positive integers a, b and c, return the minimum number of single-bit flips in a and b so that <code>(a | b) == c</code>.</p>`,
    constraints: `1 ≤ a, b, c ≤ 10<sup>9</sup>`,
    example: `<p>a = 2 (010), b = 6 (110), c = 5 (101).</p>${H.table(['bit', 'a', 'b', 'c', 'flips'], [['0', '0', '0', '1', '1 (turn one on)'], ['1', '1', '1', '0', '2 (turn both off)'], ['2', '0', '1', '1', '0']])}<p>Output <b>${H.c('p', '3')}</b>.</p>`,
    brute: {
      why: `<p>Try flipping subsets of bits and check the OR — exponential. A middle-ground brute is converting to 30-char strings and comparing characters, which is the same per-column idea with extra allocation. The real lesson: columns are <b>independent</b>, so solve each one with a tiny case table.</p>`,
      code: `
        int minFlipsStrings(int a, int b, int c) {
            String A = String.format("%30s", Integer.toBinaryString(a)).replace(' ', '0');
            String B = String.format("%30s", Integer.toBinaryString(b)).replace(' ', '0');
            String C = String.format("%30s", Integer.toBinaryString(c)).replace(' ', '0');
            int flips = 0;
            for (int i = 0; i < 30; i++) {
                if (C.charAt(i) == '1') { if (A.charAt(i) == '0' && B.charAt(i) == '0') flips++; }
                else flips += (A.charAt(i) - '0') + (B.charAt(i) - '0');
            }
            return flips;
        }`
    },
    mcq: {
      q: 'In a column where c has 0 and both a and b have 1, how many flips are needed?',
      options: ['1', '0', '2', 'It is impossible'],
      answer: 2,
      explain: 'For a | b to be 0 both bits must be 0, so both 1s must be flipped.'
    },
    hints: [
      `<p><b>Aha:</b> OR works column by column, and flipping a bit only affects its own column — so add up the cost of each column separately.</p>`,
      `<p>Per column with bits x, y, z: if z == 1 → cost 1 when x == y == 0, else 0. If z == 0 → cost x + y.</p>`,
      `<p>Loop 31 columns (or while any of a, b, c is non-zero, shifting right). Recipe: flips = 0 → for bit 0..30: x, y, z = bits → flips += z == 1 ? ((x | y) == 0 ? 1 : 0) : x + y → return flips.</p>`
    ],
    tests: { sig: 'int int int -> int', fn: 'minFlips', cases: [[[2, 6, 5], 3], [[4, 2, 7], 1], [[1, 2, 3], 0], [[1, 1, 1], 0], [[1000000000, 1000000000, 1], 27], [[8, 3, 5], 3], [[7, 7, 1], 4]] },
    solution: {
      approach: `<p>Independent per-bit case analysis.</p>`,
      code: `
        class Solution {
            public int minFlips(int a, int b, int c) {
                int flips = 0;
                for (int bit = 0; bit < 31; bit++) {
                    int x = (a >> bit) & 1, y = (b >> bit) & 1, z = (c >> bit) & 1;
                    if (z == 1) {
                        if ((x | y) == 0) flips += 1;   // need at least one 1
                    } else {
                        flips += x + y;                 // every 1 must go
                    }
                }
                return flips;
            }

            public static void main(String[] args) {
                System.out.println(new Solution().minFlips(2, 6, 5)); // 3
            }
        }`,
      alt: [
        { lang: 'python', code: `def min_flips(a, b, c):
    flips = 0
    for bit in range(31):
        x, y, z = (a >> bit) & 1, (b >> bit) & 1, (c >> bit) & 1
        if z:
            flips += 1 if (x | y) == 0 else 0     # need at least one 1
        else:
            flips += x + y                        # every 1 must go
    return flips` },
        { lang: 'js', code: `function minFlips(a, b, c) {
  let flips = 0;
  for (let bit = 0; bit < 31; bit++) {
    const x = (a >> bit) & 1, y = (b >> bit) & 1, z = (c >> bit) & 1;
    if (z === 1) flips += (x | y) === 0 ? 1 : 0;   // need at least one 1
    else flips += x + y;                            // every 1 must go
  }
  return flips;
}` },
        { lang: 'cpp', code: `class Solution {
public:
    int minFlips(int a, int b, int c) {
        // branch-free: columns where (a | b) != c, plus the extra flip when c is 0 but both are 1
        return std::popcount(static_cast<uint32_t>((a | b) ^ c))
             + std::popcount(static_cast<uint32_t>(a & b & ~c));
    }
};` }
      ],
      dry: {
        head: ['bit', 'x', 'y', 'z', 'add', 'flips'],
        rows: [['0', '0', '0', '1', '1', '1'], ['1', '1', '1', '0', '2', '3'], ['2', '0', '1', '1', '0', '<span class="c-p">3</span>']]
      },
      complexity: `<p><b>Time O(31)</b>, <b>space O(1)</b>. Branch-free version: <code>bitCount((a | b) ^ c) + bitCount(a &amp; b &amp; ~c)</code>.</p>`,
      followUps: ['Same question with AND instead of OR.', 'Explain the branch-free bitCount formula.']
    }
  });

  practice.push({
    title: 'Maximum Product of Word Lengths',
    level: 'Medium',
    tags: ['bitmask', 'letters as bits'],
    companies: ['Google', 'Amazon'],
    statement: `<p>Given an array of lowercase words, return the maximum value of <code>len(w1) · len(w2)</code> over pairs of words that share <b>no common letter</b>. Return 0 if no such pair exists.</p>`,
    constraints: `2 ≤ N ≤ 1000, 1 ≤ word length ≤ 1000.`,
    example: `<p>words = ["abcw", "baz", "foo", "bar", "xtfn", "abcdef"] → <b>${H.c('p', '16')}</b> from "abcw" × "xtfn" (4 × 4, no shared letter).</p>${H.bits(0b10000000000000000000111, 23, { label: 'abcw (bits a,b,c,w)', hl: { 22: 'g', 2: 'g', 1: 'g', 0: 'g' } })}`,
    brute: {
      why: `<p>For every pair, compare letters with two loops or a HashSet: N<sup>2</sup>/2 pairs × L letters ≈ 5·10<sup>5</sup> × 1000 = 5·10<sup>8</sup> operations → too slow. The wasted work: we rebuild letter information for each pair instead of summarising each word once.</p>`,
      code: `
        int maxProductBrute(String[] words) {
            int best = 0;
            for (int i = 0; i < words.length; i++)
                for (int j = i + 1; j < words.length; j++) {
                    boolean share = false;
                    for (char c : words[i].toCharArray())
                        if (words[j].indexOf(c) >= 0) { share = true; break; }   // O(L) scan
                    if (!share) best = Math.max(best, words[i].length() * words[j].length());
                }
            return best;
        }`
    },
    mcq: {
      q: 'Two words share no letter exactly when…',
      options: ['(mask1 &amp; mask2) == 0', '(mask1 | mask2) == 0', '(mask1 ^ mask2) == 0', 'mask1 != mask2'],
      answer: 0,
      explain: 'AND is non-zero exactly when some letter bit is ON in both masks. XOR == 0 would mean they use the same set of letters.'
    },
    hints: [
      `<p><b>Aha:</b> only <b>which</b> letters a word uses matters, and there are only 26 letters — a 26-bit mask per word.</p>`,
      `<p>Precompute <code>mask[i] |= 1 &lt;&lt; (c - 'a')</code> for each word. Then for each pair, one AND tells you if they share a letter.</p>`,
      `<p>Optimisation: words with the same mask — keep only the longest (a hash map mask → max length: <code>HashMap</code> / <code>dict</code> / <code>Map</code> / <code>unordered_map</code>). Recipe: build masks → for i &lt; j: if (mask[i] &amp; mask[j]) == 0, best = max(best, len[i]·len[j]) → return best.</p>`
    ],
    tests: { sig: 'string[] -> int', fn: 'maxProduct', cases: [[[['abcw', 'baz', 'foo', 'bar', 'xtfn', 'abcdef']], 16], [[['a', 'ab', 'abc', 'd', 'cd', 'bcd', 'abcd']], 4], [[['a', 'aa', 'aaa', 'aaaa']], 0], [[['a', 'b']], 1], [[['abc', 'abc']], 0], [[['zzzz', 'yyy', 'zy']], 12]] },
    solution: {
      approach: `<p>One 26-bit mask per word, then O(1) pair checks.</p>`,
      code: `
        class Solution {
            public int maxProduct(String[] words) {
                int n = words.length;
                int[] mask = new int[n];
                for (int i = 0; i < n; i++)
                    for (char c : words[i].toCharArray())
                        mask[i] |= 1 << (c - 'a');           // letter set of word i
                int best = 0;
                for (int i = 0; i < n; i++)
                    for (int j = i + 1; j < n; j++)
                        if ((mask[i] & mask[j]) == 0)          // no shared letter
                            best = Math.max(best, words[i].length() * words[j].length());
                return best;
            }

            public static void main(String[] args) {
                String[] w = {"abcw", "baz", "foo", "bar", "xtfn", "abcdef"};
                System.out.println(new Solution().maxProduct(w)); // 16
            }
        }`,
      alt: [
        { lang: 'python', code: `from itertools import combinations

def max_product(words):
    best = {}                                    # letter mask -> longest word with that mask
    for w in words:
        m = 0
        for ch in w:
            m |= 1 << (ord(ch) - ord('a'))
        best[m] = max(best.get(m, 0), len(w))
    return max((la * lb for (ma, la), (mb, lb) in combinations(best.items(), 2) if ma & mb == 0), default=0)` },
        { lang: 'js', code: `function maxProduct(words) {
  const masks = words.map((w) => {
    let m = 0;
    for (const ch of w) m |= 1 << (ch.charCodeAt(0) - 97);   // letter set of the word
    return m;
  });
  let best = 0;
  for (let i = 0; i < words.length; i++)
    for (let j = i + 1; j < words.length; j++)
      if ((masks[i] & masks[j]) === 0) best = Math.max(best, words[i].length * words[j].length);
  return best;
}` },
        { lang: 'cpp', code: `class Solution {
public:
    int maxProduct(const vector<string>& words) {
        int n = words.size();
        vector<int> mask(n, 0);
        for (int i = 0; i < n; ++i)
            for (char c : words[i]) mask[i] |= 1 << (c - 'a');   // letter set of word i
        int best = 0;
        for (int i = 0; i < n; ++i)
            for (int j = i + 1; j < n; ++j)
                if ((mask[i] & mask[j]) == 0)
                    best = max(best, (int)(words[i].size() * words[j].size()));
        return best;
    }
};` }
      ],
      dry: {
        head: ['pair', 'masks AND', 'disjoint?', 'product', 'best'],
        rows: [['abcw, baz', 'a,b shared', 'no', '–', '0'], ['abcw, foo', '0', 'yes', '12', '12'], ['abcw, xtfn', '0', 'yes', '16', '16'], ['baz, xtfn', '0', 'yes', '12', '16'], ['…', '…', '…', '…', '<span class="c-p">16</span>']]
      },
      complexity: `<p><b>Time O(total letters + N<sup>2</sup>)</b>, <b>space O(N)</b>.</p>`,
      followUps: ['Words may contain all 52 upper/lower letters — use a long mask.']
    }
  });

  practice.push({
    title: 'Gray Code',
    level: 'Medium',
    tags: ['XOR', 'shifts', 'sequence'],
    companies: ['Amazon', 'Google'],
    statement: `<p>An n-bit <b>Gray code</b> sequence lists all 2<sup>n</sup> numbers from 0 to 2<sup>n</sup> − 1, starting at 0, so that every two consecutive numbers (and the last and first) differ in <b>exactly one bit</b>. Return any valid sequence.</p>`,
    constraints: `1 ≤ n ≤ 16`,
    example: `<p>n = 2 → <b>${H.c('p', '[0, 1, 3, 2]')}</b> = 00, 01, 11, 10. Each step flips one bit, and 10 → 00 also flips one bit.</p>`,
    brute: {
      why: `<p>Backtracking: start at 0, try flipping each bit to reach an unvisited number, backtrack on dead ends. It works (Gray codes always exist) but explores many branches and needs a visited set of size 2<sup>n</sup>. The closed formula produces each code in O(1).</p>`,
      code: `
        List<Integer> grayBrute(int n) {
            List<Integer> path = new ArrayList<>();
            boolean[] seen = new boolean[1 << n];
            path.add(0); seen[0] = true;
            dfs(n, path, seen);
            return path;
        }
        boolean dfs(int n, List<Integer> path, boolean[] seen) {
            if (path.size() == (1 << n)) return true;
            int cur = path.get(path.size() - 1);
            for (int b = 0; b < n; b++) {
                int nxt = cur ^ (1 << b);                 // flip one bit
                if (!seen[nxt]) {
                    seen[nxt] = true; path.add(nxt);
                    if (dfs(n, path, seen)) return true;
                    seen[nxt] = false; path.remove(path.size() - 1);
                }
            }
            return false;
        }`
    },
    mcq: {
      q: 'What is the Gray code of i = 6 using g = i ^ (i &gt;&gt; 1)?',
      options: ['6 (110)', '3 (011)', '4 (100)', '5 (101)'],
      answer: 3,
      explain: '6 = 110, 6 &gt;&gt; 1 = 011, XOR = 101 = 5.'
    },
    hints: [
      `<p><b>Aha:</b> when you count i → i + 1, a block of low bits flips. XOR-ing i with its own shift cancels that block except one bit.</p>`,
      `<p>Formula: <code>gray(i) = i ^ (i &gt;&gt; 1)</code> for i = 0 .. 2<sup>n</sup> − 1.</p>`,
      `<p>Alternative "reflect" construction: take the (n−1)-bit list, then append it reversed with the top bit set. Recipe: res = [] → for i in 0..2<sup>n</sup>−1: res.add(i ^ (i &gt;&gt; 1)) → return res.</p>`
    ],
    tests: { sig: 'int -> list<int>', fn: 'grayCode', check: '(args, out) => { const n = args[0], size = 1 << n; if (!Array.isArray(out) || out.length !== size || out[0] !== 0 || new Set(out).size !== size) return false; const one = (x) => x !== 0 && (x & (x - 1)) === 0; return out.every((v, i) => Number.isInteger(v) && v >= 0 && v < size && one(v ^ out[(i + 1) % size])); }', cases: [[[1], [0, 1]], [[2], [0, 1, 3, 2]], [[3], [0, 1, 3, 2, 6, 7, 5, 4]], [[4], [0, 1, 3, 2, 6, 7, 5, 4, 12, 13, 15, 14, 10, 11, 9, 8]], [[5], [0, 1, 3, 2, 6, 7, 5, 4, 12, 13, 15, 14, 10, 11, 9, 8, 24, 25, 27, 26, 30, 31, 29, 28, 20, 21, 23, 22, 18, 19, 17, 16]], [[16], null]] },
    solution: {
      approach: `<p>Use the binary-reflected Gray code formula.</p>`,
      code: `
        class Solution {
            public List<Integer> grayCode(int n) {
                List<Integer> res = new ArrayList<>(1 << n);
                for (int i = 0; i < (1 << n); i++) {
                    res.add(i ^ (i >> 1));   // neighbours differ in exactly one bit
                }
                return res;
            }

            public static void main(String[] args) {
                System.out.println(new Solution().grayCode(3)); // [0, 1, 3, 2, 6, 7, 5, 4]
            }
        }`,
      alt: [
        { lang: 'python', code: `def gray_code(n):
    return [i ^ (i >> 1) for i in range(1 << n)]   # neighbours differ in exactly one bit` },
        { lang: 'js', code: `function grayCode(n) {
  return Array.from({ length: 1 << n }, (_, i) => i ^ (i >> 1));   // neighbours differ in one bit
}` },
        { lang: 'cpp', code: `class Solution {
public:
    vector<int> grayCode(int n) {
        vector<int> res(1 << n);
        for (int i = 0; i < (1 << n); ++i) res[i] = i ^ (i >> 1);   // neighbours differ in one bit
        return res;
    }
};` }
      ],
      dry: {
        head: ['i', 'i (bin)', 'i &gt;&gt; 1', 'gray', 'bit flipped from previous'],
        rows: [['0', '000', '000', '000 (0)', '–'], ['1', '001', '000', '001 (1)', 'bit 0'], ['2', '010', '001', '011 (3)', 'bit 1'], ['3', '011', '001', '010 (2)', 'bit 0'], ['4', '100', '010', '110 (6)', 'bit 2']]
      },
      complexity: `<p><b>Time O(2<sup>n</sup>)</b>, <b>space O(1)</b> besides the output.</p>`,
      followUps: ['Convert a Gray code back to its index (prefix XOR of shifts).', 'Use Gray order to enumerate subsets while updating a running sum by one element each step.']
    }
  });

  practice.push({
    title: 'XOR Queries of a Subarray',
    level: 'Medium',
    tags: ['prefix XOR'],
    companies: ['Amazon'],
    statement: `<p>Given an array <code>arr</code> and Q queries <code>[l, r]</code>, return for each query the XOR of <code>arr[l..r]</code>.</p>`,
    constraints: `1 ≤ N, Q ≤ 3·10<sup>4</sup>, 1 ≤ arr[i] ≤ 10<sup>9</sup>`,
    example: `<p>arr = [1, 3, 4, 8], queries [[0,1], [1,2], [0,3], [3,3]] → <b>${H.c('p', '[2, 7, 14, 8]')}</b>.</p>${H.arr([0, 1, 2, 6, 14], { label: 'px', hl: { 4: 'y', 0: 'y' } })}<p>Query [0, 3] = px[4] ^ px[0] = 14.</p>`,
    brute: {
      why: `<p>Loop over l..r for every query: up to Q × N = 9·10<sup>8</sup> operations. The wasted work: the same prefixes are XORed again for every query.</p>`,
      code: `
        int[] xorQueriesBrute(int[] arr, int[][] queries) {
            int[] ans = new int[queries.length];
            for (int q = 0; q < queries.length; q++) {
                int x = 0;
                for (int i = queries[q][0]; i <= queries[q][1]; i++) x ^= arr[i];   // O(N) per query
                ans[q] = x;
            }
            return ans;
        }`
    },
    mcq: {
      q: 'With px[i] = arr[0] ^ … ^ arr[i − 1], what is XOR(arr[l..r])?',
      options: ['px[r] − px[l]', 'px[r + 1] ^ px[l]', 'px[r] ^ px[l − 1] ^ arr[l]', 'px[r + 1] &amp; px[l]'],
      answer: 1,
      explain: 'px[r + 1] covers 0..r and px[l] covers 0..l−1. XOR-ing them cancels the shared part 0..l−1, leaving l..r. Unlike sums there is no subtraction: XOR is its own inverse.'
    },
    hints: [
      `<p><b>Aha:</b> exactly like prefix sums — but the "undo" operation for XOR is XOR itself.</p>`,
      `<p>Build <code>px</code> of length N + 1 with px[0] = 0, then each query is <code>px[r + 1] ^ px[l]</code>.</p>`,
      `<p>Edge case: l == r → px[r + 1] ^ px[r] = arr[r]. Recipe: px[i + 1] = px[i] ^ arr[i] → for each query: ans = px[r + 1] ^ px[l].</p>`
    ],
    tests: { sig: 'int[] int[][] -> int[]', fn: 'xorQueries', cases: [[[[1, 3, 4, 8], [[0, 1], [1, 2], [0, 3], [3, 3]]], [2, 7, 14, 8]], [[[4, 8, 2, 10], [[2, 3], [1, 3], [0, 0], [0, 3]]], [8, 0, 4, 4]], [[[5], [[0, 0]]], [5]], [[[1000000000, 1000000000], [[0, 1], [1, 1]]], [0, 1000000000]], [[[1, 1, 1, 1, 1], [[0, 4], [1, 4], [2, 2]]], [1, 0, 1]], [[[7, 3, 9], [[0, 2], [0, 0], [1, 2], [2, 2]]], [13, 7, 10, 9]]] },
    solution: {
      approach: `<p>Prefix XOR array, O(1) per query.</p>`,
      code: `
        class Solution {
            public int[] xorQueries(int[] arr, int[][] queries) {
                int n = arr.length;
                int[] px = new int[n + 1];
                for (int i = 0; i < n; i++) px[i + 1] = px[i] ^ arr[i];   // prefix XOR
                int[] ans = new int[queries.length];
                for (int q = 0; q < queries.length; q++) {
                    ans[q] = px[queries[q][1] + 1] ^ px[queries[q][0]];   // shared prefix cancels
                }
                return ans;
            }

            public static void main(String[] args) {
                int[][] qs = {{0, 1}, {1, 2}, {0, 3}, {3, 3}};
                System.out.println(Arrays.toString(new Solution().xorQueries(new int[]{1, 3, 4, 8}, qs))); // [2, 7, 14, 8]
            }
        }`,
      alt: [
        { lang: 'python', code: `from itertools import accumulate
from operator import xor

def xor_queries(arr, queries):
    px = [0, *accumulate(arr, xor)]                 # px[i] = arr[0] ^ ... ^ arr[i-1]
    return [px[r + 1] ^ px[l] for l, r in queries]  # shared prefix cancels` },
        { lang: 'js', code: `function xorQueries(arr, queries) {
  const px = new Int32Array(arr.length + 1);       // prefix XOR
  for (let i = 0; i < arr.length; i++) px[i + 1] = px[i] ^ arr[i];
  return queries.map(([l, r]) => px[r + 1] ^ px[l]);
}` },
        { lang: 'cpp', code: `class Solution {
public:
    vector<int> xorQueries(const vector<int>& arr, const vector<vector<int>>& queries) {
        vector<int> px(arr.size() + 1, 0);           // prefix XOR
        for (size_t i = 0; i < arr.size(); ++i) px[i + 1] = px[i] ^ arr[i];
        vector<int> ans;
        ans.reserve(queries.size());
        for (const auto& q : queries) ans.push_back(px[q[1] + 1] ^ px[q[0]]);
        return ans;
    }
};` }
      ],
      dry: {
        head: ['query', 'px[r + 1]', 'px[l]', 'answer'],
        rows: [['[0, 1]', 'px[2] = 2', 'px[0] = 0', '2'], ['[1, 2]', 'px[3] = 6', 'px[1] = 1', '7'], ['[0, 3]', 'px[4] = 14', 'px[0] = 0', '14'], ['[3, 3]', 'px[4] = 14', 'px[3] = 6', '<span class="c-p">8</span>']]
      },
      complexity: `<p><b>Time O(N + Q)</b>, <b>space O(N)</b>.</p>`,
      followUps: ['Count subarrays whose XOR equals K (prefix XOR + HashMap, like "subarray sum = K").', 'Count triplets i &lt; j ≤ k with XOR(i..j−1) == XOR(j..k).']
    }
  });

  practice.push({
    title: 'XOR Sum of All Pairs Bitwise AND',
    level: 'Hard',
    tags: ['XOR', 'AND', 'distributive law'],
    companies: ['Google'],
    statement: `<p>Given two arrays <code>arr1</code> and <code>arr2</code>, consider every pair (i, j) and the value <code>arr1[i] &amp; arr2[j]</code>. Return the XOR of all these N·M values.</p>`,
    constraints: `1 ≤ N, M ≤ 10<sup>5</sup>, 0 ≤ values ≤ 10<sup>9</sup>`,
    example: `<p>arr1 = [1, 2, 3], arr2 = [6, 5]. Pairs: 1&amp;6 = 0, 1&amp;5 = 1, 2&amp;6 = 2, 2&amp;5 = 0, 3&amp;6 = 2, 3&amp;5 = 1. XOR of all = <b>${H.c('p', '0')}</b>.</p><p>Shortcut: (1 ^ 2 ^ 3) &amp; (6 ^ 5) = 0 &amp; 3 = 0 ✔. Another: arr1 = [1, 2], arr2 = [3] → (1 ^ 2) &amp; 3 = <b>3</b>.</p>`,
    brute: {
      why: `<p>Compute all N·M ANDs and XOR them: up to 10<sup>10</sup> operations → hopeless. The wasted work: AND distributes over XOR (just like × over +), so the double sum collapses into one product.</p>`,
      code: `
        int xorSumBrute(int[] arr1, int[] arr2) {
            int res = 0;
            for (int a : arr1)
                for (int b : arr2)
                    res ^= a & b;          // N * M pairs
            return res;
        }`
    },
    mcq: {
      q: 'Which identity makes the O(N + M) solution work?',
      options: ['(a &amp; b) ^ (a | b) = 0', 'a ^ b = a + b', '(a<sub>1</sub> &amp; b) ^ (a<sub>2</sub> &amp; b) = (a<sub>1</sub> ^ a<sub>2</sub>) &amp; b', '(a &amp; b) | (a ^ b) = a &amp; b'],
      answer: 2,
      explain: 'Per bit, AND is multiplication and XOR is addition mod 2, and multiplication distributes over addition. So XOR over all pairs = (XOR of arr1) &amp; (XOR of arr2).'
    },
    hints: [
      `<p><b>Aha:</b> look at one bit column. A pair contributes a 1 there only if both numbers have that bit. The XOR of the column is the <b>parity</b> of the number of such pairs: (ones in arr1) × (ones in arr2), mod 2.</p>`,
      `<p>A product is odd exactly when both factors are odd. "Count of ones in arr1 is odd" is exactly bit b of <code>XOR(arr1)</code>. So answer bit b = bit b of XOR(arr1) AND bit b of XOR(arr2).</p>`,
      `<p>All columns at once: <code>return xor(arr1) &amp; xor(arr2)</code>. Recipe: x1 = XOR of arr1 → x2 = XOR of arr2 → return x1 &amp; x2.</p>`
    ],
    tests: { sig: 'int[] int[] -> int', fn: 'getXORSum', cases: [[[[1, 2, 3], [6, 5]], 0], [[[12], [4]], 4], [[[1, 2], [3]], 3], [[[0], [1000000000]], 0], [[[1000000000], [1000000000]], 1000000000], [[[5, 5], [7]], 0], [[[7, 1, 9, 4], [3, 8, 6]], 9]] },
    solution: {
      approach: `<p>Use the distributive law of AND over XOR (bitwise multiplication over addition mod 2).</p>`,
      code: `
        class Solution {
            public int getXORSum(int[] arr1, int[] arr2) {
                int x1 = 0, x2 = 0;
                for (int a : arr1) x1 ^= a;   // parity of ones per column in arr1
                for (int b : arr2) x2 ^= b;   // parity of ones per column in arr2
                return x1 & x2;               // odd * odd = odd, per column
            }

            public static void main(String[] args) {
                Solution s = new Solution();
                System.out.println(s.getXORSum(new int[]{1, 2, 3}, new int[]{6, 5})); // 0
                System.out.println(s.getXORSum(new int[]{1, 2}, new int[]{3}));       // 3
            }
        }`,
      alt: [
        { lang: 'python', code: `from functools import reduce
from operator import xor

def get_xor_sum(arr1, arr2):
    # per column: odd * odd = odd, so AND the two XOR-parities
    return reduce(xor, arr1, 0) & reduce(xor, arr2, 0)` },
        { lang: 'js', code: `function getXORSum(arr1, arr2) {
  const x1 = arr1.reduce((acc, a) => acc ^ a, 0);   // parity of ones per column
  const x2 = arr2.reduce((acc, b) => acc ^ b, 0);
  return x1 & x2;                                   // odd * odd = odd, per column
}` },
        { lang: 'cpp', code: `class Solution {
public:
    int getXORSum(const vector<int>& arr1, const vector<int>& arr2) {
        int x1 = accumulate(arr1.begin(), arr1.end(), 0, bit_xor<int>());   // parity per column
        int x2 = accumulate(arr2.begin(), arr2.end(), 0, bit_xor<int>());
        return x1 & x2;                                                     // odd * odd = odd
    }
};` }
      ],
      dry: {
        head: ['bit', 'ones in [1,2,3]', 'ones in [6,5]', 'pairs with both = product', 'parity'],
        rows: [['0', '2 (1, 3)', '1 (5)', '2', '0'], ['1', '2 (2, 3)', '1 (6)', '2', '0'], ['2', '0', '2 (6, 5)', '0', '0'], ['answer', 'x1 = 0', 'x2 = 3', '–', '<span class="c-p">0 &amp; 3 = 0</span>']]
      },
      complexity: `<p><b>Time O(N + M)</b>, <b>space O(1)</b>.</p>`,
      followUps: ['XOR of all pairwise sums (a[i] + b[j]) — why does the trick not apply? (+ does not distribute like AND.)', 'OR of all pairwise ANDs.']
    }
  });

  practice.push({
    title: 'Minimum One Bit Operations to Make Integers Zero',
    level: 'Hard',
    tags: ['Gray code', 'XOR', 'recursion'],
    companies: ['Expedia', 'Google'],
    statement: `<p>Turn n into 0 using these operations any number of times:</p><ul><li>Flip bit 0.</li><li>Flip bit i (i ≥ 1) if bit i − 1 is 1 and bits i − 2 … 0 are all 0.</li></ul><p>Return the minimum number of operations.</p>`,
    constraints: `0 ≤ n ≤ 10<sup>9</sup>`,
    example: `<p>n = 3 (11) → <b>${H.c('p', '2')}</b>: 11 → 01 (flip bit 1, allowed because bit 0 is 1) → 00 (flip bit 0). n = 6 (110) → <b>${H.c('p', '4')}</b>: 110 → 010 → 011 → 001 → 000.</p>`,
    brute: {
      why: `<p>BFS over states: each state has at most two moves, so BFS finds the shortest path. But n ≤ 10<sup>9</sup> means up to 2<sup>30</sup> states — 4 GB of distances. It is useful for checking small n and for <b>spotting the pattern</b>: the answers for n = 1, 2, 3, 4… are 1, 3, 2, 7, 6, 4, 5, … which is the inverse Gray code.</p>`,
      code: `
        int minOpsBrute(int n) {                         // BFS, only for small n
            if (n == 0) return 0;
            int bits = 32 - Integer.numberOfLeadingZeros(n);
            int[] dist = new int[1 << bits];
            Arrays.fill(dist, -1);
            ArrayDeque<Integer> q = new ArrayDeque<>();
            dist[n] = 0;
            q.add(n);
            while (!q.isEmpty()) {
                int s = q.poll();
                if (s == 0) return dist[s];
                int[] next = {s ^ 1, -1};                 // rule 1: flip bit 0
                int low = Integer.numberOfTrailingZeros(s); // rule 2 flips the bit just above the lowest 1
                if (low + 1 < bits) next[1] = s ^ (1 << (low + 1));
                for (int t : next) {
                    if (t >= 0 && dist[t] < 0) { dist[t] = dist[s] + 1; q.add(t); }
                }
            }
            return -1;
        }`
    },
    mcq: {
      q: 'Why is the answer for n = 2<sup>k</sup> equal to 2<sup>k+1</sup> − 1?',
      options: ['Because each bit costs exactly 2 moves', 'Because you must flip bit 0 k times', 'Clearing the top bit needs bit k−1 set first, which recursively costs the full sequence; the moves walk through every k+1-bit Gray code', 'It is a coincidence'],
      answer: 2,
      explain: 'The moves are exactly the steps of the binary-reflected Gray code. The number 2<sup>k</sup> = 100…0 is the Gray code of index 2<sup>k+1</sup> − 1, so reaching 0 takes that many steps.'
    },
    hints: [
      `<p><b>Aha:</b> the two allowed moves are exactly the moves between neighbours in the Gray code sequence 0, 1, 3, 2, 6, 7, 5, 4, … (from i to i + 1, Gray code flips bit 0 when i is even, otherwise the bit just left of the lowest 1).</p>`,
      `<p>So n sits at some position i in the Gray sequence (gray(i) = n), and the minimum number of moves to reach 0 (position 0) is i. Inverse Gray code: <code>i = n ^ (n &gt;&gt; 1) ^ (n &gt;&gt; 2) ^ …</code>.</p>`,
      `<p>Recursive view: if the top bit of n is k, f(n) = (2<sup>k+1</sup> − 1) − f(n ^ 2<sup>k</sup>). Recipe (iterative): ans = 0 → while n ≠ 0: ans ^= n, n &gt;&gt;= 1 → return ans.</p>`
    ],
    tests: { sig: 'int -> int', fn: 'minimumOneBitOperations', cases: [[[3], 2], [[6], 4], [[0], 0], [[1], 1], [[2], 3], [[4], 7], [[8], 15], [[1023], 682]] },
    solution: {
      approach: `<p>The state graph is a single path ordered by Gray code. The distance from n to 0 is n's index in that order, which is the prefix XOR of n's shifts.</p>`,
      code: `
        class Solution {
            public int minimumOneBitOperations(int n) {
                int ans = 0;
                while (n != 0) {
                    ans ^= n;      // inverse Gray code: XOR of n, n>>1, n>>2, ...
                    n >>= 1;
                }
                return ans;
            }

            public static void main(String[] args) {
                Solution s = new Solution();
                System.out.println(s.minimumOneBitOperations(3)); // 2
                System.out.println(s.minimumOneBitOperations(6)); // 4
            }
        }`,
      alt: [{ lang: 'python', run: true, code: `def minimum_one_bit_operations(n):
    # recursive form: top bit k costs 2^(k+1) - 1, minus the work already "done" by the rest
    if n == 0:
        return 0
    k = n.bit_length() - 1
    return (1 << (k + 1)) - 1 - minimum_one_bit_operations(n ^ (1 << k))

print([minimum_one_bit_operations(n) for n in range(9)])  # [0, 1, 3, 2, 7, 6, 4, 5, 15]` },
        { lang: 'js', code: `function minimumOneBitOperations(n) {
  let ans = 0;
  while (n !== 0) {
    ans ^= n;        // inverse Gray code: XOR of n, n>>1, n>>2, ...
    n >>>= 1;        // n >= 0, so >>> and >> agree here
  }
  return ans;
}` },
        { lang: 'cpp', code: `class Solution {
public:
    int minimumOneBitOperations(int n) {
        int ans = 0;
        for (; n != 0; n >>= 1) ans ^= n;   // inverse Gray code (n >= 0, so >> is safe)
        return ans;
    }
};` }],
      dry: {
        head: ['n', 'ans ^= n', 'ans', 'n &gt;&gt;= 1'],
        rows: [['110 (6)', '000 ^ 110', '110 (6)', '011'], ['011 (3)', '110 ^ 011', '101 (5)', '001'], ['001 (1)', '101 ^ 001', '100 (4)', '000'], ['0', 'stop', '<span class="c-p">4</span>', '–']]
      },
      complexity: `<p><b>Time O(log n)</b> (≤ 30 rounds), <b>space O(1)</b>.</p>`,
      followUps: ['Prove the state graph is a simple path (every state has at most two neighbours).', 'Compute the Gray code index in O(log log n) with shifts by 1, 2, 4, 8, 16.']
    }
  });

  practice.push({
    title: 'Triples with Bitwise AND Equal to Zero',
    level: 'Hard',
    tags: ['submask enumeration', 'counting'],
    companies: ['Flipkart', 'Google'],
    statement: `<p>Count ordered triples (i, j, k) — indexes may repeat — such that <code>nums[i] &amp; nums[j] &amp; nums[k] == 0</code>.</p>`,
    constraints: `1 ≤ N ≤ 1000, 0 ≤ nums[i] &lt; 2<sup>16</sup>`,
    example: `<p>nums = [2, 1, 3] → <b>${H.c('p', '12')}</b>. Pair ANDs (ordered): 0 appears 2×, 1 appears 3×, 2 appears 3×, 3 appears 1×. For z = 2 we need pair-AND x with x &amp; 2 = 0 → x ∈ {0, 1} → 5 triples; z = 1 → x ∈ {0, 2} → 5; z = 3 → x = 0 → 2. Total 12.</p>`,
    brute: {
      why: `<p>Three nested loops: N<sup>3</sup> = 10<sup>9</sup> AND operations — too slow. The wasted work: many pairs (i, j) produce the <b>same</b> AND value x (there are only 65,536 possible values), so we should group pairs by x.</p>`,
      code: `
        int countTripletsBrute(int[] nums) {
            int total = 0;
            for (int a : nums)
                for (int b : nums)
                    for (int c : nums)
                        if ((a & b & c) == 0) total++;   // N^3
            return total;
        }`
    },
    mcq: {
      q: 'For a fixed z, which pair-AND values x satisfy x &amp; z == 0?',
      options: ['Only x = 0', 'Exactly the submasks of ~z (within 16 bits)', 'All x smaller than z', 'All x with fewer bits than z'],
      answer: 1,
      explain: 'x &amp; z == 0 means x has no ON bit where z has one, i.e. x ⊆ complement(z). So enumerate submasks of (~z &amp; 0xFFFF) and add their pair counts.'
    },
    hints: [
      `<p><b>Aha:</b> split the triple into a pair and a single. Count how many ordered pairs give each AND value x (only 2<sup>16</sup> possible values; N<sup>2</sup> = 10<sup>6</sup> pairs).</p>`,
      `<p>For each z, the good x values are the submasks of <code>comp = ~z &amp; 0xFFFF</code>. Walk them with <code>s = (s - 1) &amp; comp</code>, adding <code>cnt[s]</code>, and don't forget s = 0.</p>`,
      `<p>Cost: N<sup>2</sup> + N × (submasks of comp) ≤ 10<sup>6</sup> + 1000 × 65,536 ≈ 6.6·10<sup>7</sup>. Recipe: cnt[x &amp; y]++ for all pairs → for z: s = comp; loop { total += cnt[s]; if s == 0 break; s = (s − 1) &amp; comp } → return total.</p>`
    ],
    tests: { sig: 'int[] -> int', fn: 'countTriplets', cases: [[[[2, 1, 3]], 12], [[[0, 0, 0]], 27], [[[1]], 0], [[[0]], 1], [[[65535, 1, 2]], 12], [[[65535]], 0], [[[1, 2, 4, 8]], 60], [[[3, 5, 6, 7]], 6]] },
    solution: {
      approach: `<p>Group pairs by their AND value, then for each third element sum the counts over all submasks of its complement.</p>`,
      code: `
        class Solution {
            public int countTriplets(int[] nums) {
                int[] cnt = new int[1 << 16];
                for (int x : nums)
                    for (int y : nums)
                        cnt[x & y]++;                      // ordered pairs by AND value
                int total = 0;
                for (int z : nums) {
                    int comp = ~z & 0xFFFF;                // bits z does NOT have
                    for (int s = comp; ; s = (s - 1) & comp) {
                        total += cnt[s];                   // pair-AND s is disjoint from z
                        if (s == 0) break;                 // include the empty submask, then stop
                    }
                }
                return total;
            }

            public static void main(String[] args) {
                System.out.println(new Solution().countTriplets(new int[]{2, 1, 3})); // 12
                System.out.println(new Solution().countTriplets(new int[]{0, 0, 0})); // 27
            }
        }`,
      alt: [
        { lang: 'python', code: `from collections import Counter

def count_triplets(nums):
    cnt = Counter(x & y for x in nums for y in nums)   # ordered pairs by AND value
    total = 0
    for z in nums:
        comp = ~z & 0xFFFF                              # bits z does NOT have (16-bit window)
        s = comp
        while True:
            total += cnt[s]                             # pair-AND s is disjoint from z
            if s == 0:
                break
            s = (s - 1) & comp
    return total` },
        { lang: 'js', code: `function countTriplets(nums) {
  const cnt = new Int32Array(1 << 16);
  for (const x of nums) for (const y of nums) cnt[x & y]++;   // ordered pairs by AND value
  let total = 0;
  for (const z of nums) {
    const comp = ~z & 0xFFFF;                                 // bits z does NOT have
    for (let s = comp; ; s = (s - 1) & comp) {
      total += cnt[s];
      if (s === 0) break;                                     // include the empty submask, then stop
    }
  }
  return total;
}` },
        { lang: 'cpp', code: `class Solution {
public:
    int countTriplets(const vector<int>& nums) {
        vector<int> cnt(1 << 16, 0);
        for (int x : nums)
            for (int y : nums) ++cnt[x & y];         // ordered pairs by AND value
        int total = 0;
        for (int z : nums) {
            int comp = ~z & 0xFFFF;                  // bits z does NOT have
            for (int s = comp; ; s = (s - 1) & comp) {
                total += cnt[s];
                if (s == 0) break;                   // include the empty submask, then stop
            }
        }
        return total;
    }
};` }
      ],
      dry: {
        head: ['z', 'needed: x &amp; z = 0', 'x values present', 'cnt sum', 'total'],
        rows: [['2 (10)', 'x ⊆ …01', '0, 1', '2 + 3 = 5', '5'], ['1 (01)', 'x ⊆ …10', '0, 2', '2 + 3 = 5', '10'], ['3 (11)', 'x ⊆ …00', '0', '2', '<span class="c-p">12</span>']]
      },
      complexity: `<p><b>Time O(N<sup>2</sup> + N · 2<sup>16</sup>)</b> worst case, <b>space O(2<sup>16</sup>)</b>. (A SOS-DP "sum over subsets" pass can make the second part O(16 · 2<sup>16</sup> + N) — an Expert-module idea.)</p>`,
      followUps: ['Count pairs (i, j) with nums[i] &amp; nums[j] == 0 using the same idea.', 'Replace the submask loop with SOS DP.']
    }
  });

  practice.push({
    title: 'Smallest Sufficient Team',
    level: 'Hard',
    tags: ['bitmask DP', 'set cover'],
    companies: ['Google', 'Amazon'],
    statement: `<p>A project needs the skills <code>req_skills</code>. Each person <code>people[i]</code> has a list of skills. Return the indexes of a <b>smallest</b> team whose combined skills cover every required skill (any valid smallest team is accepted; a solution is guaranteed).</p>`,
    constraints: `1 ≤ req_skills ≤ 16, 1 ≤ people ≤ 60, each person has ≤ 16 skills.`,
    example: `<p>req = [java, nodejs, reactjs], people = [[java], [nodejs], [nodejs, reactjs]] → <b>${H.c('p', '[0, 2]')}</b>.</p>${H.table(['person', 'skills', 'mask (react node java)'], [['0', 'java', '001'], ['1', 'nodejs', '010'], ['2', 'nodejs, reactjs', '110']])}<p>001 | 110 = 111 = all skills with 2 people.</p>`,
    brute: {
      why: `<p>Try every subset of people and keep the smallest that covers all skills: 2<sup>60</sup> subsets — impossible. The key observation: there are only 2<sup>16</sup> = 65,536 possible <b>skill sets</b>, so do DP over skill masks instead of people subsets. (The brute below only works for ≤ 20 people.)</p>`,
      code: `
        int smallestTeamSizeBrute(int[] personMask, int full) {   // personMask.length <= 20
            int n = personMask.length, best = Integer.MAX_VALUE;
            for (int team = 0; team < (1 << n); team++) {
                int skills = 0;
                for (int p = 0; p < n; p++) if (((team >> p) & 1) == 1) skills |= personMask[p];
                if (skills == full) best = Math.min(best, Integer.bitCount(team));
            }
            return best;
        }`
    },
    mcq: {
      q: 'What should the DP state be?',
      options: ['dp[person] = number of skills of that person', 'dp[i][j] = whether person i has skill j', 'dp[teamSize] = best skill mask', 'dp[skillMask] = smallest team whose skills union is exactly skillMask'],
      answer: 3,
      explain: 'The skill universe is tiny (16), so 2<sup>16</sup> skill masks is a small state space. Each person is a transition mask → mask | personMask.'
    },
    hints: [
      `<p><b>Aha:</b> map skills to bits (≤ 16) and each person to a skill mask. Now the question is: fewest masks whose OR is the full mask.</p>`,
      `<p>DP over skill masks: <code>size[mask]</code> = fewest people reaching exactly mask, <code>team[mask]</code> = those people as a 64-bit bitmask (people ≤ 60): <code>long</code> / <code>uint64_t</code>, a plain Python int, or a <code>BigInt</code> in JavaScript, because 32-bit JS bit operators cannot hold 60 bits. For each person p and each reachable mask: relax <code>mask | pm[p]</code>.</p>`,
      `<p>Start size[0] = 0, others ∞. Answer = team[full]; decode its ON bits into indexes. Recipe: for p in people: for mask in 0..full: if reachable and size[mask] + 1 &lt; size[mask | pm] → update size and team (team[mask] | 1L &lt;&lt; p).</p>`
    ],
    tests: { sig: 'string[] list<list<string>> -> int[]', fn: 'smallestSufficientTeam', check: '(args, out, expected) => { const [req, people] = args; if (!Array.isArray(out) || out.length !== expected.length || new Set(out).size !== out.length) return false; if (!out.every((i) => Number.isInteger(i) && i >= 0 && i < people.length)) return false; const have = new Set(); out.forEach((i) => people[i].forEach((s) => have.add(s))); return req.every((s) => have.has(s)); }', cases: [[[['java', 'nodejs', 'reactjs'], [['java'], ['nodejs'], ['nodejs', 'reactjs']]], [0, 2]], [[['algorithms', 'math', 'java', 'reactjs', 'csharp', 'aws'], [['algorithms', 'math', 'java'], ['algorithms', 'math', 'reactjs'], ['java', 'csharp', 'aws'], ['reactjs', 'csharp'], ['csharp', 'math'], ['aws', 'java']]], [1, 2]], [[['a'], [['a']]], [0]], [[['a', 'b'], [[], ['a'], ['b'], ['a', 'b']]], [3]], [[['a', 'b', 'c', 'd'], [['a'], ['b'], ['c'], ['d'], ['a', 'b'], ['c', 'd']]], [4, 5]], [[['x', 'y', 'z'], [['x'], ['y'], ['z']]], [0, 1, 2]]] },
    solution: {
      approach: `<p>Bitmask DP over the 2<sup>16</sup> skill sets, storing the team as a 64-bit people mask.</p>`,
      code: `
        class Solution {
            public int[] smallestSufficientTeam(String[] reqSkills, List<List<String>> people) {
                int m = reqSkills.length, full = (1 << m) - 1;
                Map<String, Integer> id = new HashMap<>();
                for (int i = 0; i < m; i++) id.put(reqSkills[i], i);
                int[] pm = new int[people.size()];
                for (int p = 0; p < people.size(); p++)
                    for (String s : people.get(p)) pm[p] |= 1 << id.get(s);   // person's skill mask

                int[] size = new int[1 << m];
                long[] team = new long[1 << m];
                Arrays.fill(size, Integer.MAX_VALUE);
                size[0] = 0;
                for (int p = 0; p < pm.length; p++) {
                    if (pm[p] == 0) continue;                                  // useless person
                    for (int mask = 0; mask <= full; mask++) {
                        if (size[mask] == Integer.MAX_VALUE) continue;         // not reachable
                        int nm = mask | pm[p];
                        if (size[mask] + 1 < size[nm]) {
                            size[nm] = size[mask] + 1;
                            team[nm] = team[mask] | (1L << p);                 // add person p
                        }
                    }
                }
                long t = team[full];
                int[] res = new int[Long.bitCount(t)];
                int k = 0;
                while (t != 0) {
                    res[k++] = Long.numberOfTrailingZeros(t);                  // index of lowest person
                    t &= t - 1;
                }
                return res;
            }

            public static void main(String[] args) {
                String[] req = {"java", "nodejs", "reactjs"};
                List<List<String>> people = List.of(List.of("java"), List.of("nodejs"), List.of("nodejs", "reactjs"));
                System.out.println(Arrays.toString(new Solution().smallestSufficientTeam(req, people))); // [0, 2]
            }
        }`,
      alt: [
        { lang: 'python', code: `def smallest_sufficient_team(req_skills, people):
    idx = {s: i for i, s in enumerate(req_skills)}
    full = (1 << len(req_skills)) - 1
    # dp: skill mask -> smallest team (as a people bitmask; Python ints have no 64-bit limit)
    dp = {0: 0}
    for p, skills in enumerate(people):
        pm = 0
        for s in skills:
            pm |= 1 << idx[s]
        if pm == 0:
            continue                                   # useless person
        for mask, team in list(dp.items()):            # snapshot: use person p once per pass
            nm, nt = mask | pm, team | (1 << p)
            if nm not in dp or nt.bit_count() < dp[nm].bit_count():
                dp[nm] = nt
    t = dp[full]
    return [i for i in range(len(people)) if t >> i & 1]` },
        { lang: 'js', code: `function smallestSufficientTeam(reqSkills, people) {
  const id = new Map(reqSkills.map((s, i) => [s, i]));
  const full = (1 << reqSkills.length) - 1;
  const size = new Array(full + 1).fill(Infinity);
  const team = new Array(full + 1).fill(0n);       // BigInt: up to 60 people do not fit in 32 bits
  size[0] = 0;
  people.forEach((skills, p) => {
    let pm = 0;
    for (const s of skills) pm |= 1 << id.get(s);
    if (pm === 0) return;                          // useless person
    for (let mask = 0; mask <= full; mask++) {
      if (size[mask] === Infinity) continue;       // not reachable
      const nm = mask | pm;
      if (size[mask] + 1 < size[nm]) {
        size[nm] = size[mask] + 1;
        team[nm] = team[mask] | (1n << BigInt(p)); // add person p
      }
    }
  });
  const res = [];
  for (let p = 0; p < people.length; p++) if ((team[full] >> BigInt(p)) & 1n) res.push(p);
  return res;
}` },
        { lang: 'cpp', code: `class Solution {
public:
    vector<int> smallestSufficientTeam(const vector<string>& reqSkills, const vector<vector<string>>& people) {
        int m = reqSkills.size(), full = (1 << m) - 1;
        unordered_map<string, int> id;
        for (int i = 0; i < m; ++i) id[reqSkills[i]] = i;
        vector<int> size(full + 1, INT_MAX);
        vector<uint64_t> team(full + 1, 0);              // people bitmask: 60 people fit in 64 bits
        size[0] = 0;
        for (int p = 0; p < (int)people.size(); ++p) {
            int pm = 0;
            for (const string& s : people[p]) pm |= 1 << id[s];
            if (pm == 0) continue;                       // useless person
            for (int mask = 0; mask <= full; ++mask) {
                if (size[mask] == INT_MAX) continue;     // not reachable
                int nm = mask | pm;
                if (size[mask] + 1 < size[nm]) {
                    size[nm] = size[mask] + 1;
                    team[nm] = team[mask] | (1ULL << p); // 1ULL: shifting a plain 1 past 31 is undefined
                }
            }
        }
        vector<int> res;
        for (uint64_t t = team[full]; t; t &= t - 1) res.push_back(std::countr_zero(t));
        return res;
    }
};` }
      ],
      dry: {
        head: ['person (mask)', 'updates', 'size[111]'],
        rows: [['0 (001)', '000 → 001 {0}', '∞'], ['1 (010)', '000 → 010 {1}; 001 → 011 {0,1}', '∞'], ['2 (110)', '000 → 110 {2}; 001 → 111 {0,2}; 011 → 111 size 3 (no)', '<span class="c-p">2 → [0, 2]</span>']]
      },
      complexity: `<p><b>Time O(P · 2<sup>S</sup>)</b> = 60 × 65,536 ≈ 4·10<sup>6</sup>. <b>Space O(2<sup>S</sup>)</b>.</p>`,
      followUps: ['Prune people whose skill mask is a subset of another person\'s mask.', 'Return the number of different smallest teams.']
    }
  });

  // ===================== QUIZ =====================
  quiz.push({
    q: 'What is 22 in binary?',
    options: ['10110', '10011', '11010', '10101'],
    answer: 0,
    explain: '22 = 16 + 4 + 2 → bits 4, 2, 1 ON → 10110. (11010 is 26, 10101 is 21, 10011 is 19.)'
  });
  quiz.push({
    q: 'In Java, what does <code>~7</code> evaluate to?',
    options: ['7', '−7', '−8', '248'],
    answer: 2,
    explain: '~x = −x − 1 in 2\'s complement, so ~7 = −8. (248 would be the answer if only 8 bits were flipped and read as unsigned.)'
  });
  quiz.push({
    q: 'Which expression is <b>true</b> in Java?',
    options: ['<code>-8 &gt;&gt; 1 == -4</code> and <code>-8 &gt;&gt;&gt; 1 &gt; 0</code>', '<code>-8 &gt;&gt; 1 &gt; 0</code>', '<code>-8 &gt;&gt;&gt; 1 == -4</code>', '<code>1 &lt;&lt; 32 == 0</code>'],
    answer: 0,
    explain: '&gt;&gt; copies the sign bit (−8 → −4); &gt;&gt;&gt; pushes in a 0, giving a large positive number. 1 &lt;&lt; 32 == 1 because the shift count is taken mod 32.'
  });
  quiz.push({
    q: 'Which one-liner clears (turns off) bit i of n?',
    options: ['<code>n | (1 &lt;&lt; i)</code>', '<code>n ^ (1 &lt;&lt; i)</code>', '<code>n &amp; ~(1 &lt;&lt; i)</code>', '<code>n &amp; (1 &lt;&lt; i)</code>'],
    answer: 2,
    explain: '~(1 &lt;&lt; i) is all ones except a 0 at position i; AND keeps everything else and forces bit i to 0. OR sets, XOR toggles, plain AND extracts.'
  });
  quiz.push({
    q: 'How many times does the loop <code>while (n != 0) { n &amp;= n - 1; c++; }</code> run for n = 168 (10101000)?',
    options: ['8', '3', '5', '4'],
    answer: 1,
    explain: 'Each round removes one ON bit; 10101000 has three ON bits, so 3 rounds.'
  });
  quiz.push({
    q: 'Which value makes <code>(n &amp; (n - 1)) == 0</code> true even though n is <b>not</b> a power of two?',
    options: ['16', '0', '1', '1024'],
    answer: 1,
    explain: '0 &amp; (−1) = 0, so the bare check wrongly accepts 0 (and also Integer.MIN_VALUE). That is why the full test is n &gt; 0 &amp;&amp; (n &amp; (n − 1)) == 0. 1 = 2<sup>0</sup> really is a power of two.'
  });
  quiz.push({
    q: 'nums = [5, 9, 5, 7, 9]. What does XOR-ing all elements return?',
    options: ['7', '5', '0', '35'],
    answer: 0,
    explain: 'The two 5s cancel and the two 9s cancel, leaving 7.'
  });
  quiz.push({
    q: 'In Single Number II (others appear 3 times), the bit counts per column are [4, 3, 7, 0] for bits 3, 2, 1, 0. What is the single number?',
    options: ['10', '11', '14', '6'],
    answer: 0,
    explain: 'Take each count mod 3: [1, 0, 1, 0] → bits 3 and 1 → 1010 = 10.'
  });
  quiz.push({
    q: 'Single Number III: after XOR-ing everything you get xr = 12 (1100). Which split bit does <code>xr &amp; -xr</code> choose?',
    options: ['8 (bit 3)', '4 (bit 2)', '12', '1 (bit 0)'],
    answer: 1,
    explain: 'x &amp; −x isolates the lowest ON bit. 1100 → 0100 = 4. Splitting on bit 3 would also be valid, but that is not what this expression gives.'
  });
  quiz.push({
    q: 'With items [p, q, r, s] mapped to bits 0..3, which subset does mask 10 represent?',
    options: ['{q, s}', '{p, r}', '{r, s}', '{p, q, s}'],
    answer: 0,
    explain: '10 = 1010 → bits 1 and 3 → q and s.'
  });
  quiz.push({
    q: 'How many submasks does m = 0b101101 have (including 0 and m itself)?',
    options: ['8', '16', '64', '45'],
    answer: 1,
    explain: 'm has 4 ON bits; each can be in or out → 2<sup>4</sup> = 16 submasks. The loop s = (s − 1) &amp; m visits 15 of them plus the 0 you add by hand.'
  });
  quiz.push({
    q: 'Constraints say N ≤ 20 and "choose any subset of the items". Roughly how much work is enumerating all subsets with an O(N) check each?',
    options: ['About 2·10<sup>7</sup> operations — fine', 'About 10<sup>12</sup> — too slow', 'About 400 operations', 'Impossible to enumerate'],
    answer: 0,
    explain: '2<sup>20</sup> ≈ 10<sup>6</sup> masks × 20 = 2·10<sup>7</sup>, well under the ~10<sup>8</sup> simple operations per second budget.'
  });
  quiz.push({
    q: 'What does <code>(byte) 0xF0 &gt;&gt;&gt; 4</code> evaluate to in Java?',
    options: ['15', '268435455', '−1', '240'],
    answer: 1,
    explain: '(byte) 0xF0 = −16; it is promoted to int (sign-extended to 0xFFFFFFF0) before the shift, and &gt;&gt;&gt; 4 gives 0x0FFFFFFF = 268435455. Mask first — ((b &amp; 0xFF) &gt;&gt;&gt; 4) = 15 — to get the "expected" answer.'
  });
  quiz.push({
    q: 'Which statement about <code>a + b</code> is always true for non-negative ints (no overflow)?',
    options: ['a + b = (a ^ b) + 2·(a &amp; b)', 'a + b = (a | b) − (a &amp; b)', 'a + b = a ^ b', 'a + b = 2·(a | b)'],
    answer: 0,
    explain: 'XOR is the sum without carries; a &amp; b marks the columns that produce a carry, which is worth twice its column. (Also true: a + b = (a | b) + (a &amp; b).)'
  });

  // ===================== INTERVIEW Q&A =====================
  interview.push({
    level: 'B',
    q: 'How are negative integers stored in Java, and why does <code>~x == -x - 1</code>?',
    a: `<p>Java ints use <b>32-bit 2's complement</b>: the top bit is worth −2<sup>31</sup> instead of +2<sup>31</sup>, and all other bits keep their normal positive weights. To negate, flip every bit and add 1 (−x = ~x + 1). Rearranging gives ~x = −x − 1. Intuition: x + ~x is all ones (no column has a carry), and all ones is −1, so ~x = −1 − x. The big benefits: there is a single zero, and the same adder circuit works for positive and negative numbers — arithmetic is just modulo 2<sup>32</sup>.</p>`,
    followUps: ['What is the range of an int and why is it asymmetric?', 'What does Math.abs(Integer.MIN_VALUE) return?', 'How would you read an int as an unsigned value?']
  });
  interview.push({
    level: 'B',
    q: 'Explain the difference between <code>&gt;&gt;</code> and <code>&gt;&gt;&gt;</code> in Java. When does it matter?',
    a: `<p><code>&gt;&gt;</code> is an <b>arithmetic</b> shift: it copies the sign bit into the vacated left positions, so negative numbers stay negative and the result is ⌊x / 2<sup>k</sup>⌋. <code>&gt;&gt;&gt;</code> is a <b>logical</b> shift: it always fills with 0, treating the int as 32 raw bits. They differ only for negative numbers. It matters when you loop until a number becomes 0 (a negative number with &gt;&gt; never reaches 0), when reversing or extracting bits/bytes of arbitrary patterns, and in the overflow-safe midpoint <code>(lo + hi) &gt;&gt;&gt; 1</code>.</p>`,
    followUps: ['What is -1 &gt;&gt;&gt; 28?', 'Why does C++ not have &gt;&gt;&gt;?', 'What happens with 1 &lt;&lt; 35 for an int?']
  });
  interview.push({
    level: 'B',
    q: 'How do you check, set, clear and toggle the i-th bit? What are the common mistakes?',
    a: `<p>Build the mask <code>1 &lt;&lt; i</code>. Check: <code>(n &gt;&gt; i) &amp; 1</code> or <code>(n &amp; mask) != 0</code>. Set: <code>n | mask</code>. Clear: <code>n &amp; ~mask</code>. Toggle: <code>n ^ mask</code>. Mistakes: comparing <code>(n &amp; mask) == 1</code> (the result is 2<sup>i</sup>, not 1), forgetting brackets because <code>==</code> binds tighter than <code>&amp;</code>, using <code>1 &lt;&lt; i</code> for i ≥ 32 when a long is needed (<code>1L &lt;&lt; i</code>), and checking bit 31 with <code>&gt; 0</code> (that mask is negative).</p>`,
    followUps: ['How do you set bit i to a given value v in one expression?', 'How do you clear all bits below i?']
  });
  interview.push({
    level: 'B',
    q: 'Why does <code>n &amp; (n - 1)</code> remove the lowest set bit, and what can you build with it?',
    a: `<p>Subtracting 1 borrows from the lowest 1: that bit becomes 0 and all zeros to its right become 1, while everything to the left is unchanged. AND-ing n with n − 1 keeps the unchanged left part and zeroes the lowest 1 and everything right of it. Uses: Kernighan's popcount (loop until 0, one round per ON bit), power-of-two test <code>n &gt; 0 &amp;&amp; (n &amp; (n − 1)) == 0</code>, counting bits for 0..n via <code>dp[i] = dp[i &amp; (i − 1)] + 1</code>, iterating only the ON bits of a mask, and the range-AND trick.</p>`,
    followUps: ['What does n &amp; -n do instead?', 'Is Kernighan faster than Integer.bitCount?', 'Test whether n is a power of four.']
  });
  interview.push({
    level: 'I',
    q: 'Single Number: every element appears twice except one. Walk me through the O(1)-space solution and prove it.',
    a: `<p>XOR all elements into an accumulator starting at 0. XOR is commutative and associative, x ^ x = 0 and x ^ 0 = x, so we can mentally regroup the twins together; each pair becomes 0 and only the single value remains. Per-column proof: in any bit column, each twin pair contributes 0 or 2 ones (even), so the parity of the column — which is exactly what XOR computes — equals the single number's bit. O(N) time, O(1) space. Limitation: XOR cannot validate the input; if the promise is broken it silently returns a wrong value.</p>`,
    followUps: ['What if every element appears three times except one?', 'What if two elements are single?', 'How would you parallelise it?']
  });
  interview.push({
    level: 'I',
    q: 'Single Number II: every element appears three times except one. Give two solutions.',
    a: `<p><b>Counting per bit:</b> for each of the 32 columns count how many numbers have that bit ON; take count % 3; a remainder of 1 means the single number has that bit. Rebuild with <code>ans |= 1 &lt;&lt; bit</code>. Loop through bit 31 so negative answers get their sign bit. O(32·N), O(1). <b>ones/twos:</b> keep two ints that act as a 2-bit counter (mod 3) for every column in parallel: <code>ones = (ones ^ x) &amp; ~twos; twos = (twos ^ x) &amp; ~ones;</code> — at the end ones holds the answer. Same complexity, one pass. The counting version generalises to any k by using % k.</p>`,
    followUps: ['Derive the ones/twos update from a state table.', 'Generalise to "k times except one that appears p times".']
  });
  interview.push({
    level: 'I',
    q: 'Single Number III: two elements appear once, the rest twice. Explain the partition trick and its edge cases.',
    a: `<p>XOR everything to get xr = a ^ b, which is non-zero because a ≠ b. Any ON bit of xr is a column where a and b differ; isolate the lowest one with <code>diff = xr &amp; -xr</code>. Second pass: XOR numbers with <code>(x &amp; diff) != 0</code> into one accumulator and the rest into another. Twins share every bit so they fall into the same group and cancel; a and b fall into different groups. Edge cases: compare with != 0 (not == 1); xr = Integer.MIN_VALUE is fine since <code>MIN &amp; -MIN</code> is still MIN, a single bit. O(N) time, O(1) space.</p>`,
    followUps: ['Find one missing and one duplicate number in 1..n using the same idea.', 'Why can\'t you easily extend it to three single numbers?']
  });
  interview.push({
    level: 'I',
    q: 'Generate all subsets of n items without recursion. What is the complexity, and when is it acceptable?',
    a: `<p>Map item j to bit j and count mask from 0 to 2<sup>n</sup> − 1; for each mask, include item j when <code>(mask &gt;&gt; j) &amp; 1</code> is 1. Each subset corresponds to exactly one mask, so nothing is missed or repeated. Complexity O(n · 2<sup>n</sup>) time and output size. Acceptable roughly for n ≤ 20 (≈ 2·10<sup>7</sup> operations). For n around 40 use meet-in-the-middle (two halves of 2<sup>20</sup>). Masks also double as compact set keys for memoisation and bitmask DP.</p>`,
    followUps: ['Enumerate all submasks of a mask — what is the total cost over all masks?', 'Enumerate only subsets of size k.', 'Generate subsets in Gray-code order.']
  });
  interview.push({
    level: 'A',
    q: 'Explain why the loop <code>for (s = m; s &gt; 0; s = (s - 1) &amp; m)</code> visits every submask of m exactly once, and why iterating submasks of all masks costs 3<sup>n</sup>.',
    a: `<p>Restrict attention to the ON positions of m and read them as a compressed number. Subtracting 1 from s turns off its lowest ON bit and turns on all bits below it; the <code>&amp; m</code> discards the bits not in m. In the compressed view this is exactly "decrement by 1", so the loop counts down from m (all chosen) to 0, hitting each of the 2<sup>popcount(m)</sup> submasks once (0 must be handled separately because the loop stops at s &gt; 0). Summed over all masks: each element is either not in m, in m but not in s, or in s — 3 choices per element — so the total is 3<sup>n</sup> (≈ 1.4·10<sup>7</sup> for n = 15, 3.5·10<sup>9</sup> for n = 20).</p>`,
    followUps: ['How do you iterate supersets of m?', 'What is SOS DP and when does it replace submask enumeration?']
  });
  interview.push({
    level: 'A',
    q: 'Add two integers without using + or −. Why does the loop terminate, including for negative numbers?',
    a: `<p>Use a + b = (a ^ b) + ((a &amp; b) &lt;&lt; 1): XOR is the sum without carries and the shifted AND is the carry vector. Replace a with the XOR and b with the carry, and repeat until the carry is 0. Each round, the lowest set bit of the carry moves at least one position left (a carry at column i can only create carries at columns &gt; i), so after at most 32 rounds the carry is shifted out of the int. In Java, ints wrap modulo 2<sup>32</sup>, so negative numbers just work. In Python, ints are unbounded, so you must mask with 0xFFFFFFFF each round and convert the final value back to signed, otherwise the loop never ends for negative sums.</p>`,
    followUps: ['Implement subtraction and multiplication with bit operations.', 'How does a hardware carry-lookahead adder speed this up?']
  });
  interview.push({
    level: 'A',
    q: 'You need to count, for each bit position, a property across all pairs (e.g. total Hamming distance or sum of XOR of all pairs). What technique do you use?',
    a: `<p>Use the <b>per-bit contribution technique</b>: bit operations act on columns independently, so solve each column alone. In a column with k ones among N numbers, the number of pairs that differ is k·(N − k) (each contributes 1 to the Hamming distance, or 2<sup>bit</sup> to the XOR sum); pairs where both are 1 are C(k, 2) (for AND sums). Total time O(B·N) with B ≈ 31 instead of O(N<sup>2</sup>). Watch overflow: k·(N − k) can exceed int for N ≥ ~10<sup>5</sup>, and multiplied by 2<sup>bit</sup> it can exceed long, so use long or a modulus as required.</p>`,
    followUps: ['Sum of XOR of all subarrays (prefix XOR + per-bit counts of parities).', 'Sum of AND of all subarrays.']
  });
  interview.push({
    level: 'E',
    q: 'Where do bit tricks matter in production systems, and when should you avoid them?',
    a: `<p>They matter where data is naturally a set of flags or where memory and cache density dominate: <code>EnumSet</code> (one long per set), <code>BitSet</code> for sieves and visited arrays, Bloom filters, roaring bitmaps in search engines and analytics databases, permission and feature flags, network protocol headers, power-of-two hash table indexing (<code>hash &amp; (n − 1)</code>), Fenwick trees, compression and checksums, and SIMD/popcount-heavy code such as similarity search on binary embeddings (Hamming distance on 64-bit chunks). Avoid them as micro-optimisations: the JIT already turns <code>x * 8</code> into a shift and <code>% 2<sup>k</sup></code> into a mask where it is safe, and clever XOR swaps or branch-free hacks hurt readability. Prefer named helpers (<code>Integer.bitCount</code>, <code>Long.numberOfTrailingZeros</code>) which compile to single CPU instructions.</p>`,
    followUps: ['How does a Bloom filter use bits, and what is its false-positive trade-off?', 'Why does HashMap spread the hash with h ^ (h &gt;&gt;&gt; 16)?']
  });
  interview.push({
    level: 'E',
    q: 'An AI assistant translated your Java bit-manipulation solution to Python and it hangs on some inputs. How do you debug it?',
    a: `<p>First suspect the <b>fixed-width assumption</b>. Java ints are 32-bit 2's complement and wrap; Python ints are unbounded, and a negative number behaves as if it had infinitely many leading 1s. Loops like <code>while n: n &gt;&gt;= 1</code> or the carry loop in "sum of two integers" never terminate for negatives. Also Java's <code>&gt;&gt;&gt;</code> has no Python equivalent — the translation probably used <code>&gt;&gt;</code>. Fix by masking with <code>&amp; 0xFFFFFFFF</code> where Java relies on wrap-around, emulate <code>&gt;&gt;&gt;</code> as <code>(x &amp; 0xFFFFFFFF) &gt;&gt; k</code>, and convert back to signed at the end. Then add tests with 0, −1, Integer.MIN_VALUE, Integer.MAX_VALUE and random values, comparing against the original Java output.</p>`,
    followUps: ['How do you convert a 32-bit unsigned value back to signed in Python?', 'Which other language pairs have similar pitfalls (JS, C++)?']
  });

  registerModule({
    id: 'dsa04',
    title: 'Bit Manipulation',
    intro: `<p>Every number inside a computer is just a row of <b>on/off switches</b>. Bit manipulation means working with those switches directly — and it turns some scary-looking problems into one-line answers. "Find the number without a twin" becomes a single XOR loop. "Is this a power of two?" becomes one AND. "List every combination of 20 items" becomes counting from 0 to 2<sup>20</sup>.</p>
      <p>In this module you will learn to read binary like a second language, understand how computers store negative numbers (2's complement), master every operator (<code>&amp; | ^ ~ &lt;&lt; &gt;&gt; &gt;&gt;&gt;</code>), use XOR's "cancel-out" superpower, flip individual bits with masks, count bits with Brian Kernighan's trick, crack the whole <b>Single Number I / II / III</b> family, and enumerate subsets with bitmasks — the gateway to bitmask DP later in the course.</p>
      <p>Interviewers love this topic because the solutions are short but the <b>reasoning</b> is precise: you must explain why the trick works, and you must not fall into the traps (sign bits, overflow, operator precedence). Every topic has a visualizer — type your own numbers and watch the switches flip.</p>`,
    goals: [
      'Convert between decimal and binary by hand, and estimate how many bits a value needs (10<sup>9</sup> → 30 bits, 10<sup>18</sup> → 60 bits)',
      'Explain 2\'s complement, predict <code>~x</code>, overflow and the difference between arithmetic and unsigned right shifts (<code>&gt;&gt;</code> vs <code>&gt;&gt;&gt;</code>, and their C++ and Python equivalents)',
      'Check, set, clear and toggle any bit with masks, and use an int as a compact set of up to 32 items',
      'Use <code>n &amp; (n − 1)</code> and <code>n &amp; -n</code> to count bits, test powers of two and isolate the lowest set bit',
      'Solve Single Number I, II and III in O(N) time and O(1) space and prove each solution correct',
      'Enumerate all subsets and all submasks with bitmasks, and recognise "N ≤ 20" as the clue for it'
    ],
    prereqs: `DSA 1 (Programming Foundations for DSA) for Java basics and DSA 2 (Math Foundations &amp; Time/Space Complexity) for powers of two, logarithms and the 10<sup>8</sup>-operations-per-second rule. DSA 3 (Number Theory) helps but is not required.`,
    hours: 10,
    langNotes: {
      java: `<p><b>Java:</b> <code>int</code> is exactly 32 bits and <code>long</code> 64 bits, both 2's complement, and overflow <b>wraps silently</b> (<code>Integer.MAX_VALUE + 1 == Integer.MIN_VALUE</code>, <code>Math.abs(Integer.MIN_VALUE)</code> is still negative). <code>&gt;&gt;</code> copies the sign bit, <code>&gt;&gt;&gt;</code> fills with zeros — use it for "treat as 32 raw bits" loops. The shift count is taken mod 32 for int (<code>1 &lt;&lt; 32 == 1</code>), so write <code>1L &lt;&lt; k</code> for 64-bit masks. <code>==</code> binds tighter than <code>&amp;</code>: always write <code>(x &amp; 1) == 0</code>. <code>byte</code> is signed: read raw bytes with <code>b &amp; 0xFF</code>. Built-ins compile to single CPU instructions: <code>Integer.bitCount</code>, <code>numberOfTrailingZeros</code>, <code>highestOneBit</code>, <code>reverse</code>.</p>`,
      python: `<p><b>Python:</b> ints are <b>unbounded</b> and never overflow, and a negative number acts as if it had infinitely many 1s on the left. So loops like <code>while n: n &gt;&gt;= 1</code> or the carry loop in "Sum of Two Integers" <b>never end</b> for negatives. Wherever 32-bit behaviour is intended, mask with <code>n &amp; 0xFFFFFFFF</code>, and convert back with <code>x - (1 &lt;&lt; 32) if x &gt;= 1 &lt;&lt; 31 else x</code>. There is no <code>&gt;&gt;&gt;</code>: mask first, then <code>&gt;&gt;</code>. <code>bin(-5)</code> prints <code>-0b101</code>, not the 2's complement bits. Handy built-ins: <code>int.bit_count()</code> (3.10+), <code>int.bit_length()</code>, <code>int(s, 2)</code>, <code>format(x, "032b")</code>. Unlike Java, <code>&amp;</code> binds tighter than <code>==</code>, but brackets still help readers.</p>`,
      js: `<p><b>JavaScript:</b> <code>Number</code> is a double, but every bitwise operator first converts its operands to a <b>signed 32-bit int</b>: <code>~</code> <code>&amp;</code> <code>|</code> <code>^</code> <code>&lt;&lt;</code> <code>&gt;&gt;</code> give signed results, and <code>&gt;&gt;&gt;</code> gives an unsigned one (<code>-1 &gt;&gt;&gt; 0</code> is 4294967295). Plain <code>+</code> does <b>not</b> wrap (<code>2147483647 + 1</code> is 2147483648); <code>| 0</code> forces the 32-bit wrap. Shift counts are taken mod 32 (<code>1 &lt;&lt; 32</code> is 1), so masks past bit 31 need <code>BigInt</code> (<code>1n &lt;&lt; 40n</code>), e.g. for a 60-person team mask. Numbers are exact only up to 2<sup>53</sup>. There is no popcount built-in; <code>Math.clz32</code> counts leading zeros. Like Java, <code>===</code> binds tighter than <code>&amp;</code>.</p>`,
      cpp: `<p><b>C++:</b> since C++20, <code>int</code> is guaranteed 2's complement and <code>&gt;&gt;</code> on a negative value is an arithmetic (sign-copying) shift, but <b>signed overflow is still undefined behaviour</b>: <code>INT_MAX + 1</code>, <code>-INT_MIN</code> and <code>x &amp; -x</code> on <code>INT_MIN</code> are bugs. Shifting by a negative amount or by ≥ the bit width (<code>1 &lt;&lt; 32</code>, <code>1 &lt;&lt; 40</code>) is also undefined. When you want wrap-around or a logical shift (Java's <code>&gt;&gt;&gt;</code>), use <code>uint32_t</code> / <code>uint64_t</code> and <code>1ULL &lt;&lt; k</code>. <code>==</code> binds tighter than <code>&amp;</code>, and <code>x &amp; 1 == 0</code> compiles silently to the wrong thing. <code>&lt;bit&gt;</code> gives <code>std::popcount</code>, <code>countr_zero</code>, <code>bit_width</code>, <code>bit_floor</code> (on unsigned types).</p>`
    },
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
