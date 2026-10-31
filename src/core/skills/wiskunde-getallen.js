// Wiskunde, domein A: Getallen en rekenregels (volwassenen).
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Elke vraag rekent zijn antwoord exact uit (gehele getallen en breuken als teller/noemer).
// Alle vier de keuzes hebben hetzelfde antwoordtype en een verschillende WAARDE: een foute
// keuze is nooit gelijkwaardig aan het goede antwoord (dus geen 6/9 naast 2/3).
// De tip (stappen) gebruikt de getallen van de vraag; die staat in terms[0].

import { rnd, shuffle } from "./helpers.js";
import { createSkills } from "./flow.js";

var MIN   = "−";
var TIMES = "×";
var NB    = "\u00a0";
var SQRT  = "√";
var SUP   = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "-": "⁻" };

// ─────────────────────────────────────────────────────────────────
// EXACTE GETALLEN (rationaal: teller n, noemer d > 0, vereenvoudigd)
// ─────────────────────────────────────────────────────────────────

function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = b; b = a % b; a = t; } return a || 1; }
function R(n, d) {
  if (d === undefined) d = 1;
  if (d < 0) { n = -n; d = -d; }
  var g = gcd(n, d);
  return { n: n / g, d: d / g };
}
function add(a, b) { return R(a.n * b.d + b.n * a.d, a.d * b.d); }
function sub(a, b) { return R(a.n * b.d - b.n * a.d, a.d * b.d); }
function mul(a, b) { return R(a.n * b.n, a.d * b.d); }
function div(a, b) { return R(a.n * b.d, a.d * b.n); }
function same(a, b) { return a.n * b.d === b.n * a.d; }
function cmp(a, b) { return a.n * b.d - b.n * a.d; }

// ─────────────────────────────────────────────────────────────────
// NOTATIE
// ─────────────────────────────────────────────────────────────────

// Geheel getal: minteken als "−", groepjes van drie met een vaste spatie vanaf 10 000
function int(x) {
  var s = String(Math.abs(x));
  if (s.length > 4) s = s.replace(/\B(?=(\d{3})+(?!\d))/g, NB);
  return (x < 0 ? MIN : "") + s;
}
// Breuk (of geheel getal als de noemer 1 is)
function frac(r) { return r.d === 1 ? int(r.n) : (r.n < 0 ? MIN : "") + Math.abs(r.n) + "/" + r.d; }
// Kommagetal uit een breuk met een eindige decimale ontwikkeling
function dec(r) {
  var neg = r.n < 0, n = Math.abs(r.n), d = r.d, k = 0;
  while (d % 2 === 0 || d % 5 === 0) {
    if (d % 10 === 0) { d /= 10; k++; }
    else if (d % 2 === 0) { n *= 5; d /= 2; k++; }
    else { n *= 2; d /= 5; k++; }
  }
  if (d !== 1) return null;
  var s = String(n);
  if (k > 0) {
    while (s.length <= k) s = "0" + s;
    s = s.slice(0, s.length - k) + "," + s.slice(s.length - k);
    s = s.replace(/0+$/, "").replace(/,$/, "");
  }
  return (neg ? MIN : "") + s;
}
function sup(k) { return String(k).split("").map(function(c) { return SUP[c]; }).join(""); }
function neg(x) { return x < 0 ? "(" + int(x) + ")" : int(x); }
function euro(x) { return "€" + NB + int(x); }

// ─────────────────────────────────────────────────────────────────
// KEUZES: vier verschillende waarden, het goede antwoord precies één keer
// cands: lijst foute waarden (typische denkfouten eerst), fmt: waarde -> tekst (null = overslaan)
// ─────────────────────────────────────────────────────────────────

function choose(ans, cands, fmt, fill) {
  var vals = [ans], out = [fmt(ans)];
  function tryAdd(v) {
    if (out.length >= 4 || v === null || v === undefined) return;
    for (var i = 0; i < vals.length; i++) { if (same(vals[i], v)) return; }
    var t = fmt(v);
    if (t === null || out.indexOf(t) !== -1) return;
    vals.push(v); out.push(t);
  }
  cands.forEach(tryAdd);
  for (var k = 1; k < 40 && out.length < 4 && fill; k++) { fill(k).forEach(tryAdd); }
  if (out.length < 4) return null;
  return { answer: out[0], choices: shuffle(out) };
}
function near(a) { return function(k) { return [add(a, R(k)), sub(a, R(k))]; }; }
// Zelfde, maar zonder negatieve of nul-waarden (voor vaardigheden zonder negatieve getallen)
function nearPos(a) { return function(k) { return [add(a, R(k)), sub(a, R(k))].filter(function(v) { return v.n > 0; }); }; }
function pickOne(list) { return list[rnd(0, list.length - 1)]; }

// Vraag samenstellen; steps = de uitgewerkte stappen met de getallen van deze vraag
function Q(question, c, steps, extra) {
  if (!c) return null;
  var q = { question: question, answer: c.answer, choices: c.choices, terms: [steps] };
  if (extra) { for (var k in extra) q[k] = extra[k]; }
  return q;
}
// Probeer tot een geldige vraag ontstaat (de generator stopt altijd)
function retry(fn) { for (var i = 0; i < 200; i++) { var q = fn(); if (q) return q; } throw new Error("geen geldige vraag"); }
function nz(min, max) { var x = 0; while (x === 0) x = rnd(min, max); return x; }

// ─────────────────────────────────────────────────────────────────
// GENERATORS PER VAARDIGHEID
// ─────────────────────────────────────────────────────────────────

var GEN = {};

// 1. Vergelijken en ordenen: vier verschillende gehele getallen, minstens twee negatief
GEN.wg01 = function(sub2) {
  var xs = [];
  while (xs.length < 4) { var x = rnd(-20, 20); if (xs.indexOf(x) === -1) xs.push(x); }
  if (xs.filter(function(v) { return v < 0; }).length < 2) return null;
  var sorted = xs.slice().sort(function(a, b) { return a - b; });
  var small = sub2 === 0, ans = small ? sorted[0] : sorted[3];
  return Q("Welk getal is het " + (small ? "kleinst" : "grootst") + "?\n" + xs.map(int).join(", "),
    choose(R(ans), xs.filter(function(v) { return v !== ans; }).map(function(v) { return R(v); }), function(r) { return frac(r); }),
    "Op de getallenlijn: " + sorted.map(int).join(" < ") + ". Het " + (small ? "kleinste" : "grootste") + " is " + int(ans) + ".");
};

// 2. Optellen met negatieve getallen
GEN.wg02 = function() {
  var a = nz(-20, 20), b = nz(-20, 20);
  if (a > 0 && b > 0) return null;
  var s = a + b;
  var dir = b > 0 ? "rechts" : "links";
  return Q(int(a) + " + " + neg(b) + " =",
    choose(R(s), [R(-s), R(a - b), R(b - a), R(-a - b + 2 * b)], frac, near(R(s))),
    "Begin bij " + int(a) + " en ga " + Math.abs(b) + " naar " + dir + ": " + int(a) + " + " + neg(b) + " = " + int(s) + ".");
};

// 3. Aftrekken met negatieve getallen: a − (−b) en −a − b
GEN.wg03 = function(sub2) {
  var a, b, s, q, st;
  if (sub2 === 0) {
    a = nz(-15, 15); b = rnd(1, 15); s = a + b;
    q = int(a) + " " + MIN + " (" + MIN + b + ") =";
    st = "Min een negatief getal is plus: " + int(a) + " " + MIN + " (" + MIN + b + ") = " + int(a) + " + " + b + " = " + int(s) + ".";
    return Q(q, choose(R(s), [R(a - b), R(-s), R(-a - b)], frac, near(R(s))), st);
  }
  a = rnd(1, 15); b = rnd(1, 15); s = -a - b;
  q = MIN + a + " " + MIN + " " + b + " =";
  st = "Begin bij " + MIN + a + " en ga nog " + b + " naar links: " + int(s) + ".";
  return Q(q, choose(R(s), [R(-a + b), R(a + b), R(a - b)], frac, near(R(s))), st);
};

// 4. Keer en delen met negatieve getallen (tekenregels)
GEN.wg04 = function(sub2) {
  var a = nz(-12, 12), b = nz(-12, 12);
  if (a > 0 && b > 0) return null;
  if (Math.abs(a) === 1 || Math.abs(b) === 1) return null;
  var p = a * b;
  var sign = (a < 0) !== (b < 0) ? "één min geeft min" : "twee keer min geeft plus";
  if (sub2 === 0) {
    return Q(neg(a) + " " + TIMES + " " + neg(b) + " =", choose(R(p), [R(-p), R(a + b), R(a - b)], frac, near(R(p))),
      Math.abs(a) + " " + TIMES + " " + Math.abs(b) + " = " + Math.abs(p) + "; " + sign + ": " + int(p) + ".");
  }
  return Q(neg(p) + " : " + neg(a) + " =", choose(R(b), [R(-b), R(p + a), R(p - a)], frac, near(R(b))),
    Math.abs(p) + " : " + Math.abs(a) + " = " + Math.abs(b) + "; " + sign + ": " + int(b) + ".");
};

// 5. Keer en delen vóór plus en min
GEN.wg05 = function(sub2) {
  var a = rnd(2, 20), b = rnd(2, 9), c = rnd(2, 9), r, q, wrong;
  if (sub2 === 0) { r = a + b * c; q = a + " + " + b + " " + TIMES + " " + c + " ="; wrong = [(a + b) * c, a + b + c, a * b + c]; }
  else { if (a < b * c) a += b * c; r = a - b * c; q = a + " " + MIN + " " + b + " " + TIMES + " " + c + " ="; wrong = [(a - b) * c, a - b - c, a - b + c]; }
  return Q(q, choose(R(r), wrong.map(function(v) { return R(v); }), frac, nearPos(R(r))),
    "Eerst de keersom: " + b + " " + TIMES + " " + c + " = " + (b * c) + ". Dan " + (sub2 === 0 ? a + " + " + (b * c) : a + " " + MIN + " " + (b * c)) + " = " + int(r) + ".");
};

// 6. Van links naar rechts (plus/min, keer/delen zijn gelijkwaardig)
GEN.wg06 = function(sub2) {
  var a, b, c, r, q, w, st;
  if (sub2 === 0) {
    b = rnd(3, 15); c = rnd(2, 9); a = rnd(b + 1, 30); r = a - b + c;
    q = a + " " + MIN + " " + b + " + " + c + " ="; w = [a - (b + c), a + b + c, a - b - c];
    st = "Van links naar rechts: " + a + " " + MIN + " " + b + " = " + (a - b) + ", dan + " + c + " = " + r + ".";
  } else {
    b = rnd(2, 6); c = rnd(2, 5); var k = rnd(2, 6) * c; a = b * k; r = (a / b) * c;
    q = a + " : " + b + " " + TIMES + " " + c + " =";
    w = [a % (b * c) === 0 ? a / (b * c) : null, a * b * c, (a / b) + c];
    st = "Van links naar rechts: " + a + " : " + b + " = " + (a / b) + ", dan " + TIMES + " " + c + " = " + r + ".";
  }
  return Q(q, choose(R(r), w.map(function(v) { return v === null ? null : R(v); }), frac, nearPos(R(r))), st);
};

// 7. Haakjes eerst
GEN.wg07 = function(sub2) {
  var a = rnd(2, 12), b = rnd(2, 12), c = rnd(2, 9), r, q, w, st;
  if (sub2 === 0) { r = (a + b) * c; q = "(" + a + " + " + b + ") " + TIMES + " " + c + " ="; w = [a + b * c, a * c + b, a + b + c];
    st = "Eerst tussen de haakjes: " + a + " + " + b + " = " + (a + b) + ". Dan " + TIMES + " " + c + " = " + r + "."; }
  else { if (b <= c) b = c + rnd(1, 6); r = a * (b - c); q = a + " " + TIMES + " (" + b + " " + MIN + " " + c + ") ="; w = [a * b - c, a * b + c, a + b - c];
    st = "Eerst tussen de haakjes: " + b + " " + MIN + " " + c + " = " + (b - c) + ". Dan " + a + " " + TIMES + " " + (b - c) + " = " + r + "."; }
  return Q(q, choose(R(r), w.map(function(v) { return R(v); }), frac, nearPos(R(r))), st);
};

// 8. Rekenvolgorde met negatieve getallen: −a + b × (−c)
GEN.wg08 = function() {
  var a = rnd(1, 12), b = rnd(2, 9), c = rnd(2, 9), r = -a - b * c;
  return Q(MIN + a + " + " + b + " " + TIMES + " (" + MIN + c + ") =",
    choose(R(r), [R((-a + b) * -c), R(-a + b * c), R(a - b * c)], frac, near(R(r))),
    "Eerst de keersom: " + b + " " + TIMES + " (" + MIN + c + ") = " + int(-b * c) + ". Dan " + MIN + a + " + " + neg(-b * c) + " = " + int(r) + ".");
};

// 9. Wisselen en groeperen (slim rekenen)
GEN.wg09 = function(sub2) {
  if (sub2 === 0) {
    var pair = pickOne([[25, 4], [50, 2], [20, 5], [125, 8]]), m = rnd(3, 19);
    if (m === pair[0] || m === pair[1]) return null;
    var r = pair[0] * pair[1] * m;
    return Q(pair[0] + " " + TIMES + " " + m + " " + TIMES + " " + pair[1] + " =",
      choose(R(r), [R(pair[0] * m), R(r * 10), R(pair[0] * pair[1] + m)], frac, nearPos(R(r))),
      "Wissel en groepeer: " + pair[0] + " " + TIMES + " " + pair[1] + " = " + (pair[0] * pair[1]) + ", dan " + TIMES + " " + m + " = " + int(r) + ".");
  }
  var a = rnd(11, 89), cc = rnd(1, 9) * 10 - a % 10, b = rnd(11, 89);
  if (cc <= 0 || (a + cc) % 10 !== 0) return null;
  var s = a + b + cc;
  return Q(a + " + " + b + " + " + cc + " =", choose(R(s), [R(s - 10), R(s + 10), R(a + b)], frac, nearPos(R(s))),
    "Groepeer: " + a + " + " + cc + " = " + (a + cc) + ", dan + " + b + " = " + s + ".");
};

// 10. Haakjes uitwerken: a × (b ± c) = a × b ± ?   (alle keuzes zijn een product x × y)
GEN.wg10 = function(sub2) {
  var a = rnd(2, 9), b = rnd(2, 12), c = rnd(2, 9);
  if (a === b || b === c || a === c) return null;
  var op = sub2 === 0 ? "+" : MIN;
  var prods = [[a, c], [b, c], [a, b], [c, c]];
  var vals = prods.map(function(p) { return R(p[0] * p[1]); });
  var fmt = function(r) { for (var i = 0; i < vals.length; i++) { if (same(vals[i], r)) return prods[i][0] + " " + TIMES + " " + prods[i][1]; } return null; };
  return Q(a + " " + TIMES + " (" + b + " " + op + " " + c + ") = " + a + " " + TIMES + " " + b + " " + op + " ?",
    choose(vals[0], vals.slice(1), fmt),
    "De " + a + " gaat keer allebei de getallen tussen de haakjes: " + a + " " + TIMES + " " + b + " " + op + " " + a + " " + TIMES + " " + c + ".");
};

// 11. Gemeenschappelijke factor buiten haakjes: a × b + a × c = a × (b + c)
GEN.wg11 = function() {
  var a = rnd(2, 9), tot = pickOne([10, 20, 30, 50, 100]), b = rnd(2, tot - 2), c = tot - b;
  if (b === c) return null;
  var r = a * tot;
  return Q(a + " " + TIMES + " " + b + " + " + a + " " + TIMES + " " + c + " =",
    choose(R(r), [R(a * b + c), R(a + b + c), R(r + a)], frac, nearPos(R(r))),
    "Allebei keer " + a + ": " + a + " " + TIMES + " (" + b + " + " + c + ") = " + a + " " + TIMES + " " + tot + " = " + r + ".");
};

// 12. Breuk vereenvoudigen (antwoord = onvereenvoudigbare breuk; geen gelijkwaardige afleiders)
GEN.wg12 = function() {
  var q = rnd(3, 12), p = rnd(1, q - 1), k = rnd(2, 9);
  if (gcd(p, q) !== 1) return null;
  var n = p * k, d = q * k, ans = R(p, q);
  return Q(n + "/" + d + " =",
    choose(ans, [R(p, d), R(q, p), R(n, q), R(p + 1, q), R(p, q + 1)], frac, function(j) { return [R(p + j, q + j), R(p, q + j + 1)]; }),
    "Deel teller en noemer door " + k + ": " + n + " : " + k + " = " + p + " en " + d + " : " + k + " = " + q + ". Dus " + p + "/" + q + ".");
};

// 13. Breuken vergelijken: vier breuken met verschillende waarden
GEN.wg13 = function(sub2) {
  var fs = [];
  while (fs.length < 4) {
    var d = rnd(2, 12), n = rnd(1, d - 1), f = R(n, d), dup = false;
    for (var i = 0; i < fs.length; i++) { if (same(fs[i], f)) dup = true; }
    if (!dup) fs.push(f);
  }
  var sorted = fs.slice().sort(cmp), big = sub2 === 0, ans = big ? sorted[3] : sorted[0];
  return Q("Welke breuk is het " + (big ? "grootst" : "kleinst") + "?\n" + fs.map(frac).join(", "),
    choose(ans, fs.filter(function(f) { return !same(f, ans); }), frac),
    "Als kommagetal (ongeveer): " + sorted.map(function(f) { return frac(f) + " ≈ " + (Math.round(f.n / f.d * 100) / 100).toString().replace(".", ","); }).join(", ") + ". Het " + (big ? "grootst" : "kleinst") + " is " + frac(ans) + ".");
};

// 14. Breuken optellen en aftrekken (ongelijke noemers)
GEN.wg14 = function(sub2) {
  var b = rnd(2, 9), d = rnd(2, 9);
  if (b === d) return null;
  var x = R(rnd(1, b - 1), b), y = R(rnd(1, d - 1), d);
  if (x.d === y.d) return null;
  if (sub2 === 1 && cmp(x, y) <= 0) return null;
  var a = x.n, c = y.n; b = x.d; d = y.d;
  var plus = sub2 === 0, r = plus ? add(x, y) : sub(x, y), op = plus ? "+" : MIN;
  var L = b * d / gcd(b, d);
  return Q(frac(x) + " " + op + " " + frac(y) + " =",
    choose(r, [R(plus ? a + c : a - c, b + d), R(plus ? a + c : a - c, b * d), R(plus ? a * c : a - c, L)], frac, nearPos(r)),
    "Maak gelijknamig (noemer " + L + "): " + (a * L / b) + "/" + L + " " + op + " " + (c * L / d) + "/" + L + " = " + (plus ? a * L / b + c * L / d : a * L / b - c * L / d) + "/" + L + (r.d !== L ? " = " + frac(r) : "") + ".");
};

// 15. Breuken vermenigvuldigen
GEN.wg15 = function() {
  var b = rnd(2, 9), d = rnd(2, 9), a = rnd(1, b - 1), c = rnd(1, d - 1), x = R(a, b), y = R(c, d), r = mul(x, y);
  if (same(x, y)) return null;
  return Q(frac(x) + " " + TIMES + " " + frac(y) + " =",
    choose(r, [R(x.n + y.n, x.d + y.d), R(x.n * y.d, x.d * y.n), R(x.n * y.n, x.d + y.d)], frac, function(k) { return [R(r.n + k, r.d), R(r.n, r.d + k)]; }),
    "Teller keer teller en noemer keer noemer: " + (x.n * y.n) + "/" + (x.d * y.d) + (r.n !== x.n * y.n ? " = " + frac(r) : "") + ".");
};

// 16. Delen door een breuk: keer het omgekeerde
GEN.wg16 = function() {
  var b = rnd(2, 9), d = rnd(2, 9), a = rnd(1, b - 1), c = rnd(1, d - 1), x = R(a, b), y = R(c, d), r = div(x, y);
  if (same(x, y)) return null;
  return Q(frac(x) + " : " + frac(y) + " =",
    choose(r, [mul(x, y), div(y, x), R(x.n * y.n, x.d * y.d * 2)], frac, function(k) { return [R(r.n + k, r.d), R(r.n, r.d + k)]; }),
    "Delen door " + frac(y) + " is keer " + y.d + "/" + y.n + ": " + frac(x) + " " + TIMES + " " + y.d + "/" + y.n + " = " + (x.n * y.d) + "/" + (x.d * y.n) + (r.n !== x.n * y.d || r.d !== x.d * y.n ? " = " + frac(r) : "") + ".");
};

// 17. Omrekenen: breuk -> kommagetal, kommagetal -> procent, procent -> breuk
GEN.wg17 = function(sub3) {
  var d = pickOne([2, 4, 5, 8, 10, 20, 25]), n = rnd(1, d - 1), f = R(n, d);
  if (f.d !== d) return null;
  if (sub3 === 0) {
    return Q(n + "/" + d + " = ? (kommagetal)", choose(f, [R(d, n * 10), R(n, 10), R(Math.round(n / d * 100), 1000)], function(r) { return r.d === 1 ? null : dec(r); }, nearPos(f)),
      n + " : " + d + " = " + dec(f) + ".");
  }
  var pct = function(r) { var v = mul(r, R(100)); var t = dec(v); return t === null ? null : t + "%"; };
  if (sub3 === 1) {
    return Q(dec(f) + " = ?%", choose(f, [R(f.n, f.d * 10), R(f.n * 10, f.d), R(f.n, f.d * 100)], pct, function(k) { return [add(f, R(k, 100)), sub(f, R(k, 100))]; }),
      dec(f) + " " + TIMES + " 100 = " + pct(f) + ".");
  }
  return Q(pct(f) + " = ? (breuk)", choose(f, [R(f.n, f.d * 10), R(f.d - f.n, f.d), R(f.n + 1, f.d + 1)], frac, function(k) { return [R(f.n + k, f.d), R(f.n, f.d + k)]; }),
    pct(f) + " = " + mul(f, R(100)).n + "/100 = " + frac(f) + ".");
};

// 18. Percentage van een getal
GEN.wg18 = function() {
  var p = pickOne([5, 10, 15, 20, 25, 30, 40, 50, 60, 75]), N = rnd(2, 40) * 20, r = R(p * N, 100);
  if (r.d !== 1) return null;
  return Q(p + "% van " + int(N) + " =", choose(r, [R(r.n * 10), R(N - r.n), R(N + r.n)], frac, nearPos(r)),
    "1% van " + int(N) + " is " + dec(R(N, 100)) + ". " + p + "% is " + p + " " + TIMES + " " + dec(R(N, 100)) + " = " + int(r.n) + ".");
};

// 19. Hoeveel procent is het deel van het geheel?
GEN.wg19 = function() {
  var p = pickOne([5, 10, 20, 25, 40, 50, 60, 75, 80]), tot = rnd(2, 30) * 4, part = R(p * tot, 100);
  if (part.d !== 1 || part.n === tot) return null;
  var pctFmt = function(r) { return r.d === 1 && r.n > 0 && r.n <= 100 ? r.n + "%" : null; };
  return Q(int(part.n) + " van " + int(tot) + " = ?%", choose(R(p), [R(part.n), R(100 - p), R(p * 2)], pctFmt, nearPos(R(p))),
    int(part.n) + " : " + int(tot) + " = " + dec(R(part.n, tot)) + ", " + TIMES + " 100 = " + p + "%.");
};

// 20. Verhoudingstabel: a : b = k·a : ?
GEN.wg20 = function() {
  var a = rnd(2, 9), b = rnd(2, 12), k = rnd(2, 9);
  if (a === b) return null;
  var r = k * b;
  return Q(a + " : " + b + " = " + (k * a) + " : ?", choose(R(r), [R(b + k * a - a), R(k * a * b), R(r + k)], frac, nearPos(R(r))),
    "Van " + a + " naar " + (k * a) + " is " + TIMES + " " + k + ". Dus ook " + b + " " + TIMES + " " + k + " = " + r + ".");
};

// 21. Evenredigheid: q stuks kosten € P; wat kosten r stuks?
GEN.wg21 = function() {
  var unit = rnd(2, 12), q = rnd(2, 8), r = rnd(2, 12);
  if (q === r) return null;
  var P = unit * q, ans = unit * r, item = pickOne([["kg", "kost", "kosten"], ["meter", "kost", "kosten"], ["kaartjes", "kosten", "kosten"]]);
  return Q(q + " " + item[0] + " " + item[1] + " " + euro(P) + ". Wat " + item[2] + " " + r + " " + item[0] + "?",
    choose(R(ans), [R(P + r - q), R(P * r), R(ans + unit)], function(x) { return x.d === 1 && x.n > 0 ? euro(x.n) : null; }, nearPos(R(ans))),
    "1 " + (item[0] === "kaartjes" ? "kaartje" : item[0]) + " kost " + euro(P) + " : " + q + " = " + euro(unit) + ". Dus " + r + " " + TIMES + " " + euro(unit) + " = " + euro(ans) + ".");
};

// 22. Kwadraat en derdemacht
GEN.wg22 = function(sub2) {
  var a, e, v;
  if (sub2 === 0) { a = rnd(2, 15); e = 2; } else { a = rnd(2, 6); e = 3; }
  v = Math.pow(a, e);
  return Q(a + sup(e) + " =", choose(R(v), [R(a * e), R(a + e), R(Math.pow(a, e - 1))], frac, nearPos(R(v))),
    a + sup(e) + " = " + (e === 2 ? a + " " + TIMES + " " + a : a + " " + TIMES + " " + a + " " + TIMES + " " + a) + " = " + v + " (niet " + a + " " + TIMES + " " + e + ").");
};

// 23. Machten van 10
GEN.wg23 = function(sub2) {
  var m = rnd(2, 4), n = rnd(1, 3), e = m + n, ans = R(Math.pow(10, e));
  if (sub2 === 0) {
    return Q("10" + sup(m) + " " + TIMES + " 10" + sup(n) + " =", choose(ans, [m * n <= 7 ? R(Math.pow(10, m * n)) : null, R(Math.pow(10, e - 1)), R(Math.pow(10, e - 2)), R(Math.pow(10, e + 1))], function(r) { return r.n > 10000000 ? null : frac(r); }),
      "Tel de exponenten op: 10" + sup(m) + " " + TIMES + " 10" + sup(n) + " = 10" + sup(e) + " = " + int(ans.n) + ".");
  }
  return Q("10" + sup(e) + " =", choose(ans, [R(10 * e), R(Math.pow(10, e - 1)), R(Math.pow(10, e + 1)), R(Math.pow(10, e - 2))], function(r) { return r.n > 10000000 ? null : frac(r); }),
    "10" + sup(e) + " is een 1 met " + e + " nullen: " + int(ans.n) + ".");
};

// 24. Nul-exponent en negatieve exponent
GEN.wg24 = function(sub2) {
  var a = rnd(2, 9);
  if (sub2 === 0) return Q(a + sup(0) + " =", choose(R(1), [R(0), R(a), R(-1)], frac), "Elk getal (behalve 0) tot de macht 0 is 1. Dus " + a + sup(0) + " = 1.");
  var n = rnd(1, 3), v = Math.pow(a, n), ans = R(1, v);
  return Q(a + sup("-" + n) + " =", choose(ans, [R(-v), R(-a * n), R(v)], frac, function(k) { return [R(1, v + k)]; }),
    "Een negatieve exponent is 1 gedeeld door de macht: " + a + sup("-" + n) + " = 1/" + a + sup(n) + " = 1/" + v + ".");
};

// 25. Rekenregels voor machten: schrijf als één macht (antwoord en keuzes zijn machten)
GEN.wg25 = function(sub3) {
  var g = pickOne([2, 3, 5]), m = rnd(2, 6), n = rnd(2, 5), e, q, w, st;
  var pw = function(base, ex) { return { b: base, e: ex, v: R(Math.pow(base, ex)) }; };
  if (sub3 === 0) { e = m + n; q = g + sup(m) + " " + TIMES + " " + g + sup(n) + " ="; w = [pw(g, m * n), pw(g * g, e), pw(g * g, m * n)]; st = "Zelfde grondtal: tel de exponenten op. " + m + " + " + n + " = " + e + ", dus " + g + sup(e) + "."; }
  else if (sub3 === 1) { if (m < n + 2) m = n + rnd(2, 4); e = m - n; q = g + sup(m) + " : " + g + sup(n) + " ="; w = [pw(g, Math.round(m / n) === m / n ? m / n : m * n), pw(g, m + n), pw(g, m * n), pw(g, e + 1)]; st = "Zelfde grondtal: trek de exponenten af. " + m + " " + MIN + " " + n + " = " + e + ", dus " + g + sup(e) + "."; }
  else { m = rnd(2, 4); n = rnd(2, 3); e = m * n; q = "(" + g + sup(m) + ")" + sup(n) + " ="; w = [pw(g, m + n), pw(g, Math.pow(m, n)), pw(g * n, m)]; st = "Macht van een macht: vermenigvuldig de exponenten. " + m + " " + TIMES + " " + n + " = " + e + ", dus " + g + sup(e) + "."; }
  var ansP = pw(g, e), all = [ansP].concat(w).filter(function(p) { return Math.pow(p.b, p.e) <= 9007199254740991 && p.e >= 1; });
  var fmt = function(r) { for (var i = 0; i < all.length; i++) { if (same(all[i].v, r)) return all[i].b + sup(all[i].e); } return null; };
  return Q(q + "\n(als \u00e9\u00e9n macht)", choose(ansP.v, all.slice(1).map(function(p) { return p.v; }), fmt), st);
};

// 26. Minteken en macht: −a² tegenover (−a)²
GEN.wg26 = function(sub3) {
  var a = rnd(2, 9), v, q, st;
  if (sub3 === 0) { v = -a * a; q = MIN + a + sup(2) + " ="; st = "De macht hoort alleen bij de " + a + ": " + a + sup(2) + " = " + (a * a) + ", met de min ervoor: " + int(v) + "."; }
  else if (sub3 === 1) { v = a * a; q = "(" + MIN + a + ")" + sup(2) + " ="; st = "(" + MIN + a + ") " + TIMES + " (" + MIN + a + ") = " + v + ": twee keer min geeft plus."; }
  else { a = rnd(2, 5); v = -a * a * a; q = "(" + MIN + a + ")" + sup(3) + " ="; st = "(" + MIN + a + ") " + TIMES + " (" + MIN + a + ") " + TIMES + " (" + MIN + a + ") = " + int(v) + ": drie keer min geeft min."; }
  return Q(q, choose(R(v), [R(-v), R(-2 * a), R(2 * a)], frac, near(R(v))), st);
};

// 27. Wortel van een kwadraat
GEN.wg27 = function() {
  var n = rnd(2, 20), sq = n * n;
  return Q(SQRT + int(sq) + " =", choose(R(n), [sq % 2 === 0 ? R(sq / 2) : null, R(sq), R(n * 2)], frac, nearPos(R(n))),
    "Welk getal keer zichzelf is " + int(sq) + "? " + n + " " + TIMES + " " + n + " = " + int(sq) + ". Dus " + SQRT + int(sq) + " = " + n + ".");
};

// 28. Wortel schatten: tussen welke twee gehele getallen? (het interval is één antwoord)
GEN.wg28 = function() {
  var k = rnd(2, 14), N = rnd(k * k + 1, (k + 1) * (k + 1) - 1);
  var iv = function(r) { var lo = r.n; return lo >= 1 ? lo + " en " + (lo + 1) : null; };
  return Q(SQRT + N + " ligt tussen", choose(R(k), [R(k - 1), R(k + 1), R(Math.floor(N / 2))], iv, near(R(k))),
    k + sup(2) + " = " + (k * k) + " en " + (k + 1) + sup(2) + " = " + ((k + 1) * (k + 1)) + ". " + N + " ligt ertussen, dus " + SQRT + N + " ligt tussen " + k + " en " + (k + 1) + ".");
};

// 29. Volgorde met machten en wortels
GEN.wg29 = function(sub2) {
  if (sub2 === 0) {
    var a = rnd(1, 9), b = rnd(2, 6), c = rnd(2, 4), r = a + b * b * c;
    return Q(a + " + " + b + sup(2) + " " + TIMES + " " + c + " =", choose(R(r), [R((a + b) * (a + b) * c), R(a + (b * c) * (b * c)), R(a + 2 * b * c)], frac, near(R(r))),
      "Eerst de macht: " + b + sup(2) + " = " + (b * b) + ". Dan keer: " + (b * b) + " " + TIMES + " " + c + " = " + (b * b * c) + ". Dan plus: " + a + " + " + (b * b * c) + " = " + r + ".");
  }
  var n = rnd(2, 12), b2 = rnd(2, 5), c2 = rnd(2, 4), r2 = n + b2 * c2 * c2;
  return Q(SQRT + (n * n) + " + " + b2 + " " + TIMES + " " + c2 + sup(2) + " =", choose(R(r2), [R((n + b2) * c2 * c2), R(n + (b2 * c2) * (b2 * c2)), R(n + b2 * c2 * 2)], frac, nearPos(R(r2))),
    "Eerst wortel en macht: " + SQRT + (n * n) + " = " + n + " en " + c2 + sup(2) + " = " + (c2 * c2) + ". Dan keer: " + b2 + " " + TIMES + " " + (c2 * c2) + " = " + (b2 * c2 * c2) + ". Dan plus: " + n + " + " + (b2 * c2 * c2) + " = " + r2 + ".");
};

// Wetenschappelijke notatie: waarde m × 10^k, met 1 <= m < 10 (m met hoogstens één decimaal)
function sciFmt(table) { return function(r) { for (var i = 0; i < table.length; i++) { if (same(table[i].v, r)) return table[i].t; } return null; }; }
function sci(mTen, k) { // mTen = m × 10 (geheel getal), k exponent
  var v = k >= 1 ? R(mTen * Math.pow(10, k), 10) : R(mTen, 10 * Math.pow(10, -k));
  return { v: v, t: dec(R(mTen, 10)) + " " + TIMES + " 10" + sup(k) };
}

// 30. Wetenschappelijke notatie, grote getallen
GEN.wg30 = function() {
  var mTen = rnd(11, 99), k = rnd(3, 7);
  if (mTen % 10 === 0) return null;
  var a = sci(mTen, k), w = [sci(mTen, k - 1), sci(mTen, k + 1), sci(mTen, -k)];
  var full = int(a.v.n);
  return Q(full + " =", choose(a.v, w.map(function(x) { return x.v; }), sciFmt([a].concat(w))),
    "Komma achter het eerste cijfer: " + dec(R(mTen, 10)) + ". De komma schuift " + k + " plaatsen, dus " + a.t + ".");
};

// 31. Wetenschappelijke notatie, kleine getallen
GEN.wg31 = function() {
  var mTen = rnd(11, 99), k = -rnd(2, 5);
  if (mTen % 10 === 0) return null;
  var a = sci(mTen, k), w = [sci(mTen, -k), sci(mTen, k + 1), sci(mTen, k - 1)];
  return Q(dec(a.v) + " =", choose(a.v, w.map(function(x) { return x.v; }), sciFmt([a].concat(w))),
    "Schuif de komma " + (-k) + " plaatsen naar rechts tot " + dec(R(mTen, 10)) + ". Naar rechts schuiven geeft een negatieve exponent: " + a.t + ".");
};

// 32. Schatten en orde van grootte (keuzes verschillen een factor 10 of meer)
GEN.wg32 = function() {
  var lead = rnd(2, 9), a = lead * 1000 + rnd(-150, 150), b0 = rnd(2, 9), b = b0 * 10 + rnd(-2, 2);
  var est = lead * 1000 * b0 * 10, exact = a * b;
  if (exact / est < 0.75 || exact / est > 1.3) return null;
  return Q(int(a) + " " + TIMES + " " + b + " ≈", choose(R(est), [R(est / 10), R(est * 10), R(est / 100)], frac),
    "Rond af: " + int(a) + " ≈ " + int(lead * 1000) + " en " + b + " ≈ " + (b0 * 10) + ". " + int(lead * 1000) + " " + TIMES + " " + (b0 * 10) + " = " + int(est) + ".");
};

// 33. Fout spotten: vier sommen, precies één is fout (typische fout: teken of volgorde)
GEN.wg33 = function() {
  var makers = [
    function(ok) { var a = rnd(2, 9), b = rnd(2, 9), c = rnd(2, 9), r = a + b * c; return a + " + " + b + " " + TIMES + " " + c + " = " + (ok ? r : (a + b) * c); },
    function(ok) { var a = rnd(2, 12), b = rnd(2, 12), r = a - (-b); return a + " " + MIN + " (" + MIN + b + ") = " + int(ok ? r : a - b); },
    function(ok) { var a = rnd(2, 9), b = rnd(2, 9), r = -a * b; return MIN + a + " " + TIMES + " " + b + " = " + int(ok ? r : -r); },
    function(ok) { var a = rnd(2, 9); return MIN + a + sup(2) + " = " + int(ok ? -a * a : a * a); },
    function(ok) { var a = rnd(2, 9); return "(" + MIN + a + ")" + sup(2) + " = " + int(ok ? a * a : -a * a); },
    function(ok) { var a = rnd(3, 6), b = rnd(2, 4); return a + sup(b) + " = " + (ok ? Math.pow(a, b) : a * b); },
  ];
  var idx = shuffle([0, 1, 2, 3, 4, 5]).slice(0, 4), bad = rnd(0, 3);
  var sums = idx.map(function(m, i) { return makers[m](i !== bad); });
  if (sums.some(function(s, i) { return sums.indexOf(s) !== i; })) return null;
  return { question: "Welke som is FOUT?", answer: sums[bad], choices: shuffle(sums.slice()), terms: ["Fout: " + sums[bad] + ". Controleer de tekens en de volgorde: machten eerst, dan keer en delen, dan plus en min."], isErrorSpotter: true, smallChoices: true };
};

// ─────────────────────────────────────────────────────────────────
// VAARDIGHEDEN
// [id, label, groep, desc, strategy, uitleg, voorbeeld, minCorrect, subtypes]
// ─────────────────────────────────────────────────────────────────

var G1 = "Negatieve getallen", G2 = "Rekenvolgorde", G3 = "Rekenregels", G4 = "Breuken", G5 = "Breuk, decimaal en procent",
    G6 = "Verhoudingen", G7 = "Machten", G8 = "Wortels", G9 = "Combineren", G10 = "Controle";

var DEFS = [
  ["wg01_vergelijken", "Vergelijken en ordenen", G1, "Welk getal is het kleinst: " + MIN + "3, 2, " + MIN + "7, 0?", "getallenlijn",
    "Op de getallenlijn staan de kleinere getallen links. " + MIN + "7 is kleiner dan " + MIN + "3, want het staat verder links: hoe groter het getal na het minteken, hoe kleiner de waarde.",
    "Kleinst: " + MIN + "3, 2, " + MIN + "7, 0?\n" + MIN + "7 < " + MIN + "3 < 0 < 2.\nAntwoord: " + MIN + "7.", 8, 2],
  ["wg02_optellen", "Optellen met negatieve getallen", G1, MIN + "7 + 3 = " + MIN + "4", "getallenlijn",
    "Begin bij het eerste getal op de getallenlijn. Plus een positief getal: naar rechts. Plus een negatief getal: naar links.",
    MIN + "7 + 3 = ?\nVan " + MIN + "7 drie stappen naar rechts.\nAntwoord: " + MIN + "4.", 8, 0],
  ["wg03_aftrekken", "Aftrekken met negatieve getallen", G1, "5 " + MIN + " (" + MIN + "3) = 8", "min min is plus",
    "Een negatief getal aftrekken is hetzelfde als het positieve getal erbij optellen: a " + MIN + " (" + MIN + "b) = a + b. Een positief getal aftrekken: naar links op de getallenlijn.",
    "5 " + MIN + " (" + MIN + "3) = ?\n5 + 3.\nAntwoord: 8.", 8, 2],
  ["wg04_keer_delen", "Keer en delen met negatieve getallen", G1, MIN + "6 " + TIMES + " 4 = " + MIN + "24", "tekenregels",
    "Reken eerst zonder mintekens. Daarna het teken: één minteken geeft een negatief antwoord, twee mintekens geven een positief antwoord. Dat geldt voor keer en voor delen.",
    MIN + "6 " + TIMES + " 4 = ?\n6 " + TIMES + " 4 = 24, één min.\nAntwoord: " + MIN + "24.", 8, 2],
  ["wg05_keer_voor_plus", "Keer en delen vóór plus en min", G2, "3 + 4 " + TIMES + " 2 = 11", "volgorde",
    "Keer en delen gaan vóór plus en min. Reken dus eerst de keersom uit, ook als die rechts staat.",
    "3 + 4 " + TIMES + " 2 = ?\nEerst 4 " + TIMES + " 2 = 8, dan 3 + 8.\nAntwoord: 11.", 8, 2],
  ["wg06_links_rechts", "Van links naar rechts", G2, "24 : 4 " + TIMES + " 2 = 12", "links naar rechts",
    "Plus en min zijn gelijkwaardig, net als keer en delen. Staan ze naast elkaar, dan reken je van links naar rechts.",
    "24 : 4 " + TIMES + " 2 = ?\n24 : 4 = 6, dan 6 " + TIMES + " 2.\nAntwoord: 12.", 8, 2],
  ["wg07_haakjes", "Haakjes eerst", G2, "(3 + 4) " + TIMES + " 2 = 14", "haakjes",
    "Wat tussen haakjes staat, reken je altijd als eerste uit. Daarna gelden de gewone regels.",
    "(3 + 4) " + TIMES + " 2 = ?\n3 + 4 = 7, dan 7 " + TIMES + " 2.\nAntwoord: 14.", 8, 2],
  ["wg08_volgorde_negatief", "Rekenvolgorde met negatieve getallen", G2, MIN + "3 + 4 " + TIMES + " (" + MIN + "2) = " + MIN + "11", "volgorde + tekens",
    "Eerst de keersom (met de tekenregel), daarna optellen of aftrekken op de getallenlijn.",
    MIN + "3 + 4 " + TIMES + " (" + MIN + "2) = ?\n4 " + TIMES + " (" + MIN + "2) = " + MIN + "8, dan " + MIN + "3 + (" + MIN + "8).\nAntwoord: " + MIN + "11.", 8, 0],
  ["wg09_wisselen_groeperen", "Wisselen en groeperen", G3, "25 " + TIMES + " 7 " + TIMES + " 4 = 700", "slim groeperen",
    "Bij alleen plus of alleen keer mag je de volgorde wisselen en anders groeperen. Zoek getallen die samen een rond getal maken.",
    "25 " + TIMES + " 7 " + TIMES + " 4 = ?\n25 " + TIMES + " 4 = 100, dan " + TIMES + " 7.\nAntwoord: 700.", 8, 2],
  ["wg10_haakjes_uitwerken", "Haakjes uitwerken", G3, "8 " + TIMES + " (5 + 2) = 8 " + TIMES + " 5 + 8 " + TIMES + " 2", "verdeelregel",
    "Het getal vóór de haakjes gaat keer elk getal tussen de haakjes: a " + TIMES + " (b + c) = a " + TIMES + " b + a " + TIMES + " c.",
    "8 " + TIMES + " (5 + 2) = 8 " + TIMES + " 5 + ?\nOok de 2 gaat keer 8.\nAntwoord: 8 " + TIMES + " 2.", 8, 2],
  ["wg11_buiten_haakjes", "Buiten haakjes halen", G3, "4 " + TIMES + " 13 + 4 " + TIMES + " 7 = 80", "gemeenschappelijke factor",
    "Komt dezelfde factor in twee producten voor, dan zet je die buiten haakjes: a " + TIMES + " b + a " + TIMES + " c = a " + TIMES + " (b + c).",
    "4 " + TIMES + " 13 + 4 " + TIMES + " 7 = ?\n4 " + TIMES + " (13 + 7) = 4 " + TIMES + " 20.\nAntwoord: 80.", 8, 0],
  ["wg12_vereenvoudigen", "Breuk vereenvoudigen", G4, "12/18 = 2/3", "delen door de ggd",
    "Deel teller en noemer door het grootste getal dat in allebei past. Dan is de breuk zo eenvoudig mogelijk.",
    "12/18 = ?\nAllebei delen door 6.\nAntwoord: 2/3.", 8, 0],
  ["wg13_breuken_vergelijken", "Breuken vergelijken", G4, "2/3 is groter dan 5/8", "gelijknamig maken",
    "Maak de breuken gelijknamig, of reken ze om naar een kommagetal. Dan kun je ze direct vergelijken.",
    "Grootst: 2/3 of 5/8?\n16/24 en 15/24.\nAntwoord: 2/3.", 8, 2],
  ["wg14_breuken_plus_min", "Breuken optellen en aftrekken", G4, "1/3 + 1/4 = 7/12", "gelijknamig maken",
    "Optellen en aftrekken kan alleen bij dezelfde noemer. Maak de breuken eerst gelijknamig, tel dan de tellers op en vereenvoudig.",
    "1/3 + 1/4 = ?\n4/12 + 3/12 = 7/12.\nAntwoord: 7/12.", 8, 2],
  ["wg15_breuken_keer", "Breuken vermenigvuldigen", G4, "2/3 " + TIMES + " 3/4 = 1/2", "teller keer teller",
    "Teller keer teller en noemer keer noemer. Vereenvoudig daarna.",
    "2/3 " + TIMES + " 3/4 = ?\n6/12.\nAntwoord: 1/2.", 8, 0],
  ["wg16_breuken_delen", "Delen door een breuk", G4, "2/3 : 1/6 = 4", "keer het omgekeerde",
    "Delen door een breuk is vermenigvuldigen met het omgekeerde: wissel teller en noemer van de tweede breuk om en vermenigvuldig.",
    "2/3 : 1/6 = ?\n2/3 " + TIMES + " 6/1 = 12/3.\nAntwoord: 4.", 8, 0],
  ["wg17_omrekenen", "Breuk, kommagetal en procent", G5, "3/8 = 0,375 en 0,35 = 35%", "omrekenen",
    "Breuk naar kommagetal: deel de teller door de noemer. Kommagetal naar procent: keer 100. Procent naar breuk: het getal gedeeld door 100, en dan vereenvoudigen.",
    "3/8 = ?\n3 : 8 = 0,375.\nAntwoord: 0,375.", 8, 3],
  ["wg18_procent_van", "Percentage van een getal", G5, "15% van 240 = 36", "via 1% of 10%",
    "Reken eerst 1% of 10% uit en vermenigvuldig dan. 10% van 240 is 24, 5% is 12, dus 15% is 36.",
    "15% van 240 = ?\n10% = 24, 5% = 12.\nAntwoord: 36.", 8, 0],
  ["wg19_hoeveel_procent", "Hoeveel procent?", G5, "18 van 72 = 25%", "deel gedeeld door geheel",
    "Deel het deel door het geheel en vermenigvuldig met 100.",
    "18 van 72 = ?%\n18 : 72 = 0,25.\nAntwoord: 25%.", 8, 0],
  ["wg20_verhoudingstabel", "Verhoudingstabel", G6, "3 : 5 = 12 : 20", "zelfde factor",
    "In een verhouding vermenigvuldig je beide kanten met hetzelfde getal. Niet erbij optellen.",
    "3 : 5 = 12 : ?\n3 " + TIMES + " 4 = 12, dus 5 " + TIMES + " 4.\nAntwoord: 20.", 8, 0],
  ["wg21_evenredigheid", "Evenredigheid", G6, "4 kg kost €" + NB + "10, 6 kg kost €" + NB + "15", "via 1",
    "Bij evenredigheid hoort bij twee keer zoveel ook twee keer de prijs. Reken eerst uit wat 1 stuk kost.",
    "4 kg kost €" + NB + "10. 6 kg?\n1 kg = €" + NB + "2,50.\nAntwoord: €" + NB + "15.", 8, 0],
  ["wg22_kwadraat", "Kwadraat en derdemacht", G7, "7" + SUP["2"] + " = 49", "herhaald vermenigvuldigen",
    "Een macht is herhaald vermenigvuldigen: 7" + SUP["2"] + " = 7 " + TIMES + " 7 en 2" + SUP["3"] + " = 2 " + TIMES + " 2 " + TIMES + " 2. Niet 7 " + TIMES + " 2.",
    "7" + SUP["2"] + " = ?\n7 " + TIMES + " 7.\nAntwoord: 49.", 8, 2],
  ["wg23_machten_10", "Machten van 10", G7, "10" + SUP["3"] + " " + TIMES + " 10" + SUP["2"] + " = 100" + NB + "000", "nullen tellen",
    "10 tot de macht n is een 1 met n nullen. Bij vermenigvuldigen tel je de exponenten op.",
    "10" + SUP["3"] + " " + TIMES + " 10" + SUP["2"] + " = ?\n10" + SUP["5"] + ".\nAntwoord: 100" + NB + "000.", 8, 2],
  ["wg24_exponent_0_negatief", "Exponent 0 en negatieve exponent", G7, "2" + SUP["-"] + SUP["3"] + " = 1/8", "1 gedeeld door",
    "Elk getal (behalve 0) tot de macht 0 is 1. Een negatieve exponent betekent 1 gedeeld door de macht: a" + SUP["-"] + "ⁿ = 1/aⁿ.",
    "2" + SUP["-"] + SUP["3"] + " = ?\n1/2" + SUP["3"] + " = 1/8.\nAntwoord: 1/8.", 8, 2],
  ["wg25_rekenregels_machten", "Rekenregels voor machten", G7, "2" + SUP["3"] + " " + TIMES + " 2" + SUP["4"] + " = 2" + SUP["7"], "exponenten",
    "Bij hetzelfde grondtal: keer is exponenten optellen, delen is exponenten aftrekken, en een macht van een macht is exponenten vermenigvuldigen.",
    "2" + SUP["3"] + " " + TIMES + " 2" + SUP["4"] + " = ?\n3 + 4 = 7.\nAntwoord: 2" + SUP["7"] + ".", 8, 3],
  ["wg26_min_en_macht", "Minteken en macht", G7, MIN + "3" + SUP["2"] + " = " + MIN + "9, (" + MIN + "3)" + SUP["2"] + " = 9", "waar hoort de macht bij",
    "Zonder haakjes hoort de macht alleen bij het getal, niet bij het minteken: " + MIN + "3" + SUP["2"] + " = " + MIN + "(3 " + TIMES + " 3). Met haakjes hoort het minteken erbij: (" + MIN + "3)" + SUP["2"] + " = (" + MIN + "3) " + TIMES + " (" + MIN + "3).",
    MIN + "3" + SUP["2"] + " = ?\n3" + SUP["2"] + " = 9, met min ervoor.\nAntwoord: " + MIN + "9.", 8, 3],
  ["wg27_wortel", "Wat is een wortel", G8, SQRT + "81 = 9", "terugrekenen",
    "De wortel van een getal is het getal dat keer zichzelf dat getal geeft. " + SQRT + "81 = 9, want 9 " + TIMES + " 9 = 81. Niet de helft.",
    SQRT + "81 = ?\n9 " + TIMES + " 9 = 81.\nAntwoord: 9.", 8, 0],
  ["wg28_wortel_schatten", "Wortel schatten", G8, SQRT + "50 ligt tussen 7 en 8", "kwadraten eromheen",
    "Zoek de kwadraten net onder en net boven het getal. " + SQRT + "50: 7" + SUP["2"] + " = 49 en 8" + SUP["2"] + " = 64, dus " + SQRT + "50 ligt tussen 7 en 8.",
    SQRT + "50 ligt tussen?\n49 < 50 < 64.\nAntwoord: 7 en 8.", 8, 0],
  ["wg29_volgorde_machten", "Volgorde met machten en wortels", G9, "2 + 3" + SUP["2"] + " " + TIMES + " 2 = 20", "machten eerst",
    "De volgorde: haakjes, dan machten en wortels, dan keer en delen, dan plus en min.",
    "2 + 3" + SUP["2"] + " " + TIMES + " 2 = ?\n9 " + TIMES + " 2 = 18, dan 2 + 18.\nAntwoord: 20.", 8, 2],
  ["wg30_wetenschappelijk_groot", "Wetenschappelijke notatie: groot", G9, "45" + NB + "000 = 4,5 " + TIMES + " 10" + SUP["4"], "komma schuiven",
    "Schrijf het getal als een getal van 1 tot 10 keer een macht van 10. De exponent is het aantal plaatsen dat de komma naar links schuift.",
    "45" + NB + "000 = ?\n4,5, komma 4 plaatsen.\nAntwoord: 4,5 " + TIMES + " 10" + SUP["4"] + ".", 8, 0],
  ["wg31_wetenschappelijk_klein", "Wetenschappelijke notatie: klein", G9, "0,003 = 3 " + TIMES + " 10" + SUP["-"] + SUP["3"], "komma schuiven",
    "Bij een getal kleiner dan 1 schuift de komma naar rechts; dan is de exponent negatief.",
    "0,003 = ?\nKomma 3 plaatsen naar rechts.\nAntwoord: 3 " + TIMES + " 10" + SUP["-"] + SUP["3"] + ".", 8, 0],
  ["wg32_schatten", "Schatten en orde van grootte", G9, "4" + NB + "897 " + TIMES + " 21 ≈ 100" + NB + "000", "afronden",
    "Rond beide getallen af op één cijfer met nullen en reken dan. Zo zie je snel of een antwoord de juiste grootte heeft.",
    "4" + NB + "897 " + TIMES + " 21 ≈ ?\n5" + NB + "000 " + TIMES + " 20.\nAntwoord: 100" + NB + "000.", 8, 0],
  ["wg33_fout_spotten", "Fout spotten", G10, "Welke som is FOUT?", "controleren",
    "Controleer elke som: eerst de tekens (min min is plus), dan de volgorde (machten, dan keer en delen, dan plus en min).",
    "Welke som is FOUT?\n" + MIN + "3" + SUP["2"] + " = 9 is fout: het is " + MIN + "9.", 10, 0],
];

function tipOf(terms) { return terms && terms[0] ? terms[0] : ""; }

// Typen (Kiezen | Typen): vaardigheden waarvan het antwoord altijd een geheel getal is, ook
// negatief. De invoer en het nakijken staan in inputResolve.js en grading.js; de vragen zelf
// veranderen niet. Alle andere vaardigheden blijven kiezen.
var TYPEN = {
  wg02_optellen: true, wg03_aftrekken: true, wg04_keer_delen: true, wg05_keer_voor_plus: true,
  wg06_links_rechts: true, wg07_haakjes: true, wg08_volgorde_negatief: true, wg09_wisselen_groeperen: true,
  wg11_buiten_haakjes: true, wg18_procent_van: true, wg20_verhoudingstabel: true, wg22_kwadraat: true,
  wg23_machten_10: true, wg26_min_en_macht: true, wg27_wortel: true, wg29_volgorde_machten: true,
};

var RAW_SKILLS = DEFS.map(function(d) {
  var key = d[0].slice(0, 4), gen = GEN[key], subs = d[8];
  var skill = {
    id: d[0], label: d[1], group: d[2], desc: d[3], strategy: d[4], tip: tipOf,
    uitleg: d[5], voorbeeld: d[6], minCorrect: d[7], subtypes: subs || undefined,
    make: function(s) { return retry(function() { return gen(s || 0); }); },
  };
  if (TYPEN[d[0]]) { skill.inputType = "number"; skill.inputConfig = { allowNegative: true }; }
  return skill;
});

var SKILLS = createSkills("wiskunde_getallen", RAW_SKILLS);

export var WISK_GETALLEN_SKILLS = SKILLS.list;
export var WISK_GETALLEN_ORDER  = SKILLS.list.map(function(s) { return s.id; });

// Voor tests: generator per vaardigheid met een vast subtype, en de exacte rekenhulp
export var WISK_GETALLEN_GEN = GEN;
