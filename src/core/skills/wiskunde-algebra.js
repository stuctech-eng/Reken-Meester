// Wiskunde, domein B: Algebra, uitdrukkingen en vergelijkingen (volwassenen).
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Uitdrukkingen zijn veeltermen: een lijst coefficienten per term (x-machten, a, b, ab, los getal).
// Er is één vaste schrijfwijze (hoogste macht eerst, los getal achteraan), dus twee keuzes zijn
// nooit dezelfde uitdrukking in een andere volgorde. Keuzes worden op waarde vergeleken
// (coefficienten), niet op tekst. Vergelijkingen worden gemaakt vanuit hun oplossing.
// Keerteken in algebra: "·" (geen ×, dat lijkt op x).

import { rnd, shuffle } from "./helpers.js";
import { createSkills } from "./flow.js";

var MIN  = "−";
var DOT  = "·";
var NB   = "\u00a0";
var LE   = "≤";
var GE   = "≥";
var SUPD = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];

function sup(n) { return String(n).split("").map(function(c) { return SUPD[Number(c)]; }).join(""); }
function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = b; b = a % b; a = t; } return a || 1; }
function nz(min, max) { var x = 0; while (x === 0) x = rnd(min, max); return x; }
function pickOne(list) { return list[rnd(0, list.length - 1)]; }
function int(x) { return (x < 0 ? MIN : "") + Math.abs(x); }
function neg(x) { return x < 0 ? "(" + int(x) + ")" : String(x); }

// ─────────────────────────────────────────────────────────────────
// VEELTERMEN: { sleutel: coefficient } met sleutels "x9".."x2", "x", "ab", "a", "b", ""
// ─────────────────────────────────────────────────────────────────

var ORDER = ["x9", "x8", "x7", "x6", "x5", "x4", "x3", "x2", "x", "a2", "ab", "a", "b", ""];
function P(map) { var o = {}; for (var k in map) { if (map[k] !== 0) o[k] = map[k]; } return o; }
function lin(a, c) { return P({ x: a, "": c }); }
function padd(p, q) { var o = {}, k; for (k in p) o[k] = (o[k] || 0) + p[k]; for (k in q) o[k] = (o[k] || 0) + q[k]; return P(o); }
function pscale(p, s) { var o = {}; for (var k in p) o[k] = p[k] * s; return P(o); }
// Variabele-tekst voor een sleutel
function varText(k) {
  if (k === "x") return "x";
  if (k.charAt(0) === "x") return "x" + sup(Number(k.slice(1)));
  if (k === "a2") return "a" + sup(2);
  return k;
}
// Vaste schrijfwijze
function ptext(p) {
  var parts = [];
  ORDER.forEach(function(k) {
    if (!p[k]) return;
    var c = p[k], a = Math.abs(c), body = k === "" ? String(a) : (a === 1 ? "" : String(a)) + varText(k);
    if (parts.length === 0) parts.push((c < 0 ? MIN : "") + body);
    else parts.push((c < 0 ? " " + MIN + " " : " + ") + body);
  });
  return parts.length ? parts.join("") : "0";
}
function pkey(p) { return ptext(p); }

// ─────────────────────────────────────────────────────────────────
// KEUZES: vier verschillende waarden (vergeleken met key), het goede antwoord precies één keer
// items: { key, text } ; het eerste item is het antwoord
// ─────────────────────────────────────────────────────────────────

function choose4(items) {
  var keys = [], texts = [];
  items.forEach(function(it) {
    if (!it || texts.length >= 4) return;
    if (keys.indexOf(it.key) !== -1 || texts.indexOf(it.text) !== -1) return;
    keys.push(it.key); texts.push(it.text);
  });
  if (texts.length < 4) return null;
  return { answer: texts[0], choices: shuffle(texts) };
}
function polyItem(p) { if (!p || Object.keys(p).length === 0) return null; return { key: pkey(p), text: ptext(p) }; }
// Breuk-getal als tekst, vereenvoudigd
function fr(n, d) { if (d < 0) { n = -n; d = -d; } var g = gcd(n, d); n /= g; d /= g; return d === 1 ? int(n) : (n < 0 ? MIN : "") + Math.abs(n) + "/" + d; }
function frKey(n, d) { if (d < 0) { n = -n; d = -d; } var g = gcd(n, d); return (n / g) + "/" + (d / g); }
function solItem(n, d, rel) { if (d === 0) return null; return { key: (rel || "=") + frKey(n, d), text: "x " + (rel || "=") + " " + fr(n, d) }; }
function numItem(v) { return { key: String(v), text: int(v) }; }

function Q(question, c, steps, extra) {
  if (!c) return null;
  // "=" aan het eind blijft bij de som (geen losse regel met alleen "=")
  question = question.replace(/ =$/, NB + "=");
  // Korte formule zonder woorden: niet afbreken (de letter wordt zo nodig kleiner)
  if (question.indexOf("\n") === -1 && question.length <= 18 && !/[c-wyzA-Z]/.test(question)) question = question.replace(/ /g, NB);
  var q = { question: question, answer: c.answer, choices: c.choices, terms: [steps] };
  // Uitdrukkingen en oplossingen zijn langer dan een getal: kleine knopletter (één regel)
  if (c.choices.some(function(t) { return t.length > 5; })) q.smallChoices = true;
  if (extra) { for (var k in extra) q[k] = extra[k]; }
  return q;
}
function retry(fn) { for (var i = 0; i < 300; i++) { var q = fn(); if (q) return q; } throw new Error("geen geldige vraag"); }

var GEN = {};

// ── Blok 1: variabelen ─────────────────────────────────────────────

// 1. Van woorden naar formule
GEN.al01 = function() {
  var k = rnd(2, 9), m = pickOne([2, 3, 4]), w = { 2: "dubbele", 3: "drievoud", 4: "viervoud" }[m];
  var t = pickOne([
    [k + " meer dan x", lin(1, k), [lin(k, 0), lin(1, -k), lin(-1, k)]],
    [k + " minder dan x", lin(1, -k), [lin(-1, k), lin(1, k), lin(k, -k)]],
    ["het " + w + " van x", lin(m, 0), [lin(1, m), P({ x: m === 2 ? 0 : 0 }), P({ x2: 0 })]],
    ["het " + w + " van x, plus " + k, lin(m, k), [lin(m, m * k), lin(1, m + k), lin(m + k, 0)]],
    ["x keer zichzelf", P({ x2: 1 }), [lin(2, 0), lin(1, 2), P({ x2: 2 })]],
  ]);
  if (t[0].indexOf(w + " van x") !== -1 && t[0].indexOf("plus") === -1) t[2] = [lin(1, m), P({ ["x" + m]: 1 }), lin(m, m)];
  return Q("Schrijf als formule:\n" + t[0], choose4([polyItem(t[1])].concat(t[2].map(polyItem))),
    "\"" + t[0] + "\" wordt " + ptext(t[1]) + ".");
};

// 2. Invullen: x = v
GEN.al02 = function(sub) {
  var a = rnd(2, 9), b = rnd(1, 9), v = rnd(2, 9), r, q, wr, st;
  if (sub === 0) { r = a * v - b; q = "x = " + v + ": " + a + "x " + MIN + " " + b + " ="; wr = [a + v - b, a * (v - b), a * v + b];
    st = a + DOT + v + " " + MIN + " " + b + " = " + (a * v) + " " + MIN + " " + b + " = " + int(r) + "."; }
  else { r = a * v + b; q = "x = " + v + ": " + a + "x + " + b + " ="; wr = [a + v + b, a * (v + b), a * v - b];
    st = a + DOT + v + " + " + b + " = " + (a * v) + " + " + b + " = " + int(r) + "."; }
  return Q(q, choose4([numItem(r)].concat(wr.map(numItem), [numItem(r + 1), numItem(r - 1)])), st);
};

// 3. Invullen met een negatief getal
GEN.al03 = function(sub) {
  var v = -rnd(1, 6), a = rnd(2, 7), r, q, wr, st;
  if (sub === 0) { r = v * v + a * v; q = "x = " + int(v) + ": x" + sup(2) + " + " + a + "x ="; wr = [-v * v + a * v, v * v - a * v, -(v * v) - a * v];
    st = neg(v) + sup(2) + " + " + a + DOT + neg(v) + " = " + (v * v) + " + " + neg(a * v) + " = " + int(r) + "."; }
  else { var b = rnd(1, 9); r = a * v - b; q = "x = " + int(v) + ": " + a + "x " + MIN + " " + b + " ="; wr = [-a * v - b, a * v + b, a + v - b];
    st = a + DOT + neg(v) + " " + MIN + " " + b + " = " + int(a * v) + " " + MIN + " " + b + " = " + int(r) + "."; }
  return Q(q, choose4([numItem(r)].concat(wr.map(numItem), [numItem(r + 1), numItem(r - 1)])), st);
};

// 4. Twee letters invullen
GEN.al04 = function(sub) {
  var p = rnd(2, 6), qq = rnd(2, 6), a = nz(-6, 6), b = nz(-6, 6), r, txt, wr, st;
  if (a > 0 && b > 0) return null;
  if (sub === 0) { r = p * a - qq * b; txt = p + "a " + MIN + " " + qq + "b"; wr = [p * a + qq * b, p * b - qq * a, p * a - qq * Math.abs(b)];
    st = p + DOT + neg(a) + " " + MIN + " " + qq + DOT + neg(b) + " = " + int(p * a) + " " + MIN + " " + neg(qq * b) + " = " + int(r) + "."; }
  else { r = p * a + qq * b; txt = p + "a + " + qq + "b"; wr = [p * a - qq * b, p * b + qq * a, p * Math.abs(a) + qq * Math.abs(b)];
    st = p + DOT + neg(a) + " + " + qq + DOT + neg(b) + " = " + int(p * a) + " + " + neg(qq * b) + " = " + int(r) + "."; }
  return Q("a = " + int(a) + ", b = " + int(b) + ": " + txt + " =", choose4([numItem(r)].concat(wr.map(numItem), [numItem(r + 1), numItem(r - 1)])), st);
};

// ── Blok 2: herleiden ──────────────────────────────────────────────

// 5. Gelijksoortige termen
GEN.al05 = function() {
  var p = rnd(2, 9), c = rnd(1, 9), qq = rnd(1, p - 1);
  var ans = lin(p - qq, c);
  return Q(p + "x + " + c + " " + MIN + " " + (qq === 1 ? "" : qq) + "x =",
    choose4([polyItem(ans), polyItem(lin(p, c)), polyItem(lin(p - qq + c, 0)), polyItem(lin(p + qq, c)), polyItem(lin(p - qq, -c))]),
    "Alleen de x-termen samen: " + p + "x " + MIN + " " + qq + "x = " + ptext(lin(p - qq, 0)) + ". Het losse getal blijft: " + ptext(ans) + ".");
};

// 6. Met negatieve uitkomst
GEN.al06 = function() {
  var p = rnd(1, 6), qq = rnd(p + 1, 9), c = nz(-9, 9), ans = lin(p - qq, c);
  var q = (p === 1 ? "" : p) + "x " + MIN + " " + qq + "x " + (c < 0 ? MIN + " " + (-c) : "+ " + c) + " =";
  return Q(q, choose4([polyItem(ans), polyItem(lin(qq - p, c)), polyItem(lin(-p - qq, c)), polyItem(lin(p - qq + c, 0)), polyItem(lin(p - qq, -c))]),
    (p === 1 ? "" : p) + "x " + MIN + " " + qq + "x = " + ptext(lin(p - qq, 0)) + ", dus " + ptext(ans) + ".");
};

// 7. Twee letters herleiden
GEN.al07 = function() {
  var p = rnd(2, 7), r = rnd(1, p - 1), qq = rnd(1, 6), s = rnd(1, 6), ans = P({ a: p - r, b: qq + s });
  return Q(p + "a + " + (qq === 1 ? "" : qq) + "b " + MIN + " " + (r === 1 ? "" : r) + "a + " + (s === 1 ? "" : s) + "b =",
    choose4([polyItem(ans), polyItem(P({ a: p + r, b: qq + s })), polyItem(P({ a: p - r, b: qq - s })), polyItem(P({ ab: p - r + qq + s })), polyItem(P({ a: p - r + qq + s }))]),
    "a-termen: " + p + "a " + MIN + " " + r + "a = " + ptext(P({ a: p - r })) + ". b-termen: " + qq + "b + " + s + "b = " + ptext(P({ b: qq + s })) + ". Samen " + ptext(ans) + ".");
};

// 8. Termen vermenigvuldigen
GEN.al08 = function(sub) {
  var p = rnd(2, 9), qq = rnd(2, 9), ans, q, wr, st;
  if (sub === 0) { ans = P({ x: p * qq }); q = p + " " + DOT + " " + qq + "x ="; wr = [P({ x: p + qq }), P({ x2: p * qq }), P({ x2: p + qq }), P({ x: p * qq + p })]; st = p + " " + DOT + " " + qq + " = " + (p * qq) + ", de x blijft: " + ptext(ans) + "."; }
  else { ans = P({ x2: p * qq }); q = p + "x " + DOT + " " + qq + "x ="; wr = [P({ x: p * qq }), P({ x2: p + qq }), P({ x: p + qq })]; st = "Getallen: " + p + " " + DOT + " " + qq + " = " + (p * qq) + ". Letters: x " + DOT + " x = x" + sup(2) + ". Samen " + ptext(ans) + "."; }
  return Q(q, choose4([polyItem(ans)].concat(wr.map(polyItem))), st);
};

// 9. Machten van x
GEN.al09 = function(sub) {
  var m = rnd(2, 5), n = rnd(2, 4), e, q, wr, st;
  if (sub === 0) { e = m + n; q = "x" + sup(m) + " " + DOT + " x" + sup(n) + " ="; wr = [P({ ["x" + Math.min(9, m * n)]: m * n <= 9 ? 1 : 0 }), P({ ["x" + e]: 2 }), P({ ["x" + Math.min(9, e + 1)]: 1 })]; st = "Zelfde letter: exponenten optellen. " + m + " + " + n + " = " + e + ", dus x" + sup(e) + "."; }
  else { if (m <= n + 1) m = n + 2; e = m - n; q = "x" + sup(m) + " : x" + sup(n) + " ="; wr = [P({ ["x" + Math.min(9, m + n)]: m + n <= 9 ? 1 : 0 }), P({ ["x" + e]: 2 }), e > 2 ? P({ ["x" + (e - 1)]: 1 }) : P({ x: 1 })]; st = "Zelfde letter: exponenten aftrekken. " + m + " " + MIN + " " + n + " = " + e + ", dus " + ptext(P({ ["x" + e]: 1 })) + "."; }
  var ans = e === 1 ? P({ x: 1 }) : P({ ["x" + e]: 1 });
  return Q(q, choose4([polyItem(ans)].concat(wr.filter(function(p) { return Object.keys(p).length; }).map(polyItem))), st);
};

// 10. Term delen
GEN.al10 = function() {
  var p = rnd(2, 9), qq = rnd(2, 9), ans = P({ x: qq });
  return Q((p * qq) + "x : " + p + " =", choose4([polyItem(ans), polyItem(P({ x: p * qq - p })), polyItem(P({ x: p * qq * p })), polyItem(P({ x: qq + p })), polyItem(P({ x2: qq }))]),
    (p * qq) + " : " + p + " = " + qq + ", de x blijft: " + ptext(ans) + ".");
};

// ── Blok 3: haakjes ────────────────────────────────────────────────

// 11. Haakjes uitwerken
GEN.al11 = function(sub) {
  var a = rnd(2, 9), b = rnd(1, 9), s = sub === 0 ? 1 : -1, ans = lin(a, s * a * b);
  return Q(a + "(x " + (s > 0 ? "+" : MIN) + " " + b + ") =",
    choose4([polyItem(ans), polyItem(lin(a, s * b)), polyItem(lin(1, s * a * b)), polyItem(lin(a, s * (a + b))), polyItem(lin(a, -s * a * b))]),
    "De " + a + " keer allebei: " + a + DOT + "x " + (s > 0 ? "+" : MIN) + " " + a + DOT + b + " = " + ptext(ans) + ".");
};

// 12. Min vóór haakjes
GEN.al12 = function(sub) {
  var c = rnd(1, 9), ans, q, wr, st;
  if (sub === 0) {
    var p = rnd(2, 9), qq = rnd(1, p - 1); ans = lin(p - qq, -c);
    q = p + "x " + MIN + " (" + (qq === 1 ? "" : qq) + "x + " + c + ") =";
    wr = [lin(p - qq, c), lin(p + qq, -c), lin(p - qq, -2 * c)];
    st = "Min vóór haakjes: alle tekens binnen omdraaien. " + p + "x " + MIN + " " + qq + "x " + MIN + " " + c + " = " + ptext(ans) + ".";
  } else {
    ans = lin(-1, c); q = MIN + "(x " + MIN + " " + c + ") =";
    wr = [lin(-1, -c), lin(1, -c), lin(1, c)];
    st = "Min vóór haakjes: alle tekens omdraaien. " + MIN + "x + " + c + " = " + ptext(ans) + ".";
  }
  return Q(q, choose4([polyItem(ans)].concat(wr.map(polyItem))), st);
};

// 13. Negatief getal vóór haakjes
GEN.al13 = function(sub) {
  var a = rnd(2, 9), b = rnd(1, 9), s = sub === 0 ? -1 : 1, ans = lin(-a, -a * s * b);
  return Q(MIN + a + "(x " + (s > 0 ? "+" : MIN) + " " + b + ") =",
    choose4([polyItem(ans), polyItem(lin(-a, a * s * b)), polyItem(lin(-a, s * b)), polyItem(lin(a, -a * s * b)), polyItem(lin(a, a * s * b))]),
    MIN + a + DOT + "x = " + ptext(lin(-a, 0)) + " en " + MIN + a + DOT + neg(s * b) + " = " + int(-a * s * b) + ". Samen " + ptext(ans) + ".");
};

// 14. Uitwerken en herleiden
GEN.al14 = function() {
  var a = rnd(2, 6), b = rnd(1, 9), c = rnd(1, 9), ans = lin(a + c, a * b);
  return Q(a + "(x + " + b + ") + " + (c === 1 ? "" : c) + "x =",
    choose4([polyItem(ans), polyItem(lin(a + c, b)), polyItem(lin(a + c + a * b, 0)), polyItem(lin(a + c, a + b)), polyItem(lin(1 + c, a * b))]),
    "Uitwerken: " + ptext(lin(a, a * b)) + ". Dan + " + c + "x: " + ptext(ans) + ".");
};

// Ontbonden vorm: g(p) met p een veelterm; waarde = uitgewerkt
function factItem(gText, gPoly, inner, innerText) {
  var exp = {}, k;
  // gPoly is een eenterm: { sleutel: c }
  var gk = Object.keys(gPoly)[0], gc = gPoly[gk];
  for (k in inner) {
    var nk = mulKey(gk, k);
    if (nk === null) return null;
    exp[nk] = (exp[nk] || 0) + gc * inner[k];
  }
  var e = P(exp);
  return { key: pkey(e), text: gText + "(" + (innerText || ptext(inner)) + ")" };
}
function mulKey(k1, k2) {
  function deg(k) { return k === "" ? 0 : (k === "x" ? 1 : Number(k.slice(1))); }
  if ((k1 !== "" && k1.charAt(0) !== "x") || (k2 !== "" && k2.charAt(0) !== "x")) return null;
  var d = deg(k1) + deg(k2);
  return d === 0 ? "" : (d === 1 ? "x" : "x" + d);
}

// 15. Getal buiten haakjes
GEN.al15 = function() {
  var g = rnd(2, 6), p = rnd(2, 7), qq = rnd(1, 9);
  if (gcd(p, qq) !== 1) return null;
  var whole = lin(g * p, g * qq);
  return Q(ptext(whole) + " =", choose4([
      factItem(String(g), { "": g }, lin(p, qq)), factItem(String(g), { "": g }, lin(p, g * qq)), factItem(String(g * p), { "": g * p }, lin(1, qq)),
      factItem(String(g), { "": g }, lin(g * p, qq)), factItem(String(g), { "": g }, lin(p, qq + 1))]),
    "Beide termen zijn deelbaar door " + g + ": " + (g * p) + "x = " + g + DOT + p + "x en " + (g * qq) + " = " + g + DOT + qq + ". Dus " + g + "(" + ptext(lin(p, qq)) + ").");
};

// 16. x buiten haakjes
GEN.al16 = function(sub) {
  var k = rnd(2, 9), s = sub === 0 ? 1 : -1, whole = P({ x2: 1, x: s * k });
  return Q(ptext(whole) + " =", choose4([
      factItem("x", { x: 1 }, lin(1, s * k)), factItem("x", { x: 1 }, P({ x: 1 + s * k }), "x " + (s > 0 ? "+ " : MIN + " ") + k + "x"), factItem(k + "x", { x: k }, lin(1, s)),
      factItem("x", { x: 1 }, lin(s * k, 1)), factItem("x", { x: 1 }, lin(1, -s * k))]),
    "Beide termen hebben een x: x" + sup(2) + " = x" + DOT + "x en " + ptext(P({ x: s * k })) + " = x" + DOT + neg(s * k) + ". Dus x(" + ptext(lin(1, s * k)) + ").");
};

// ── Blok 4: vergelijkingen ─────────────────────────────────────────

// 17. Wat is een oplossing
GEN.al17 = function() {
  var a = rnd(2, 6), s = rnd(1, 9), b = rnd(1, 9), c = a * s + b;
  return Q("Welke x past bij " + a + "x + " + b + " = " + c + "?",
    choose4([numItem(s), numItem(c - b), numItem(s + 1), numItem(c), numItem(s - 1 > 0 ? s - 1 : s + 2)]),
    "Invullen: " + a + DOT + s + " + " + b + " = " + (a * s) + " + " + b + " = " + c + ". Dus x = " + s + ".");
};

// 18. Eén stap
GEN.al18 = function(sub) {
  if (sub === 0) {
    var b = rnd(2, 15), s = nz(-9, 15), c = s + b;
    return Q("x + " + b + " = " + int(c), choose4([solItem(s, 1), solItem(c + b, 1), solItem(c, 1), solItem(b - c, 1)]),
      "Haal aan beide kanten " + b + " eraf: x = " + int(c) + " " + MIN + " " + b + ", dus x = " + int(s) + ".");
  }
  var a = rnd(2, 9), s2 = rnd(2, 12), c2 = a * s2;
  return Q(a + "x = " + c2, choose4([solItem(s2, 1), solItem(c2 - a, 1), solItem(c2 + a, 1), solItem(c2 * a, 1)]),
    "Deel beide kanten door " + a + ": x = " + c2 + " : " + a + ", dus x = " + s2 + ".");
};

// 19. Twee stappen
GEN.al19 = function() {
  var a = rnd(2, 9), s = rnd(1, 12), b = rnd(1, 15), c = a * s + b;
  return Q(a + "x + " + b + " = " + c, choose4([solItem(s, 1), solItem(c + b, a), solItem(c - b, 1), solItem((c - b) * a, 1), solItem(c, a)]),
    "Eerst " + b + " eraf: " + a + "x = " + (c - b) + ". Dan delen door " + a + ": x = " + s + ".");
};

// 20. Negatieve coefficient of oplossing
GEN.al20 = function() {
  var a = rnd(2, 6), s = nz(-9, 9), b = rnd(1, 12), c = -a * s + b;
  return Q(MIN + a + "x + " + b + " = " + int(c), choose4([solItem(s, 1), solItem(-s, 1), solItem(c + b, -a), solItem(c - b, 1), solItem(s + 1, 1), solItem(s - 1, 1)]),
    "Eerst " + b + " eraf: " + MIN + a + "x = " + int(c - b) + ". Dan delen door " + MIN + a + ": x = " + int(s) + ".");
};

// 21. x aan beide kanten
GEN.al21 = function() {
  var r = rnd(1, 5), p = r + rnd(1, 5), s = nz(-8, 10), qq = nz(-9, 9), t = (p - r) * s + qq;
  var side = function(a, b) { return (a === 1 ? "" : a) + "x " + (b < 0 ? MIN + " " + (-b) : "+ " + b); };
  return Q(side(p, qq) + " = " + side(r, t), choose4([solItem(s, 1), solItem(t - qq, p + r), solItem(t + qq, p - r), solItem(-s, 1), solItem(t - qq, 1)]),
    "x-termen links, getallen rechts: " + p + "x " + MIN + " " + r + "x = " + int(t) + " " + MIN + " " + neg(qq) + ", dus " + (p - r) + "x = " + int(t - qq) + ". Delen: x = " + int(s) + ".");
};

// 22. Met haakjes
GEN.al22 = function() {
  var a = rnd(2, 6), b = rnd(1, 9), s = rnd(b + 1, b + 10), c = a * (s - b);
  return Q(a + "(x " + MIN + " " + b + ") = " + c, choose4([solItem(s, 1), solItem(c + b, a), solItem(c / a - b, 1), solItem(c / a, 1), solItem(c - b, 1)]),
    "Deel eerst door " + a + ": x " + MIN + " " + b + " = " + (c / a) + ". Dan " + b + " erbij: x = " + s + ".");
};

// 23. Met een breuk
GEN.al23 = function() {
  var a = rnd(2, 6), b = rnd(1, 9), k = rnd(1, 8), c = k + b, s = a * k;
  return Q("x/" + a + " + " + b + " = " + c, choose4([solItem(s, 1), solItem(c - b, 1), solItem(c - b, a), solItem(a * c - b, 1), solItem(a * c + b, 1)]),
    "Eerst " + b + " eraf: x/" + a + " = " + (c - b) + ". Dan keer " + a + ": x = " + s + ".");
};

// 24. Oplossing is een breuk
GEN.al24 = function() {
  var a = rnd(2, 9), c = rnd(1, 20);
  if (c % a === 0) return null;
  return Q(a + "x = " + c, choose4([solItem(c, a), solItem(a, c), solItem(c - a, 1), solItem(c * a, 1), solItem(c + a, 1)]),
    "Deel door " + a + ": x = " + c + "/" + a + (gcd(c, a) > 1 ? " = " + fr(c, a) : "") + ". Dus x = " + fr(c, a) + ".");
};

// 25. Fout in de oplossing: vier stappen van a(x − p) + q = c, precies één stap klopt niet
function eqText(lp, rc) { return ptext(lp) + " = " + int(rc); }
GEN.al25 = function() {
  var a = rnd(2, 6), p = rnd(1, 6), qq = rnd(1, 9), s = rnd(p + 1, p + 8), c = a * (s - p) + qq;
  var good = [
    [lin(a, -a * p + qq + 0), c, "uitwerken"], // tijdelijk, vervangen hieronder
  ];
  // Stappen (goed): 1 uitgewerkt met losse getallen, 2 herleid, 3 getallen naar rechts, 4 delen
  var s1 = ptext(lin(a, -a * p)) + " + " + qq + " = " + c;
  var st = [
    { t: s1, sol: s },
    { t: eqText(lin(a, -a * p + qq), c), sol: s },
    { t: eqText(lin(a, 0), c + a * p - qq), sol: s },
    { t: "x = " + s, sol: s },
  ];
  var bad = rnd(0, 3), wrong;
  if (bad === 0) wrong = { t: ptext(lin(a, a * p)) + " + " + qq + " = " + c, sol: (c - a * p - qq) / a };
  else if (bad === 1) wrong = { t: eqText(lin(a, -a * p - qq), c), sol: (c + a * p + qq) / a };
  else if (bad === 2) wrong = { t: eqText(lin(a, 0), c - a * p + qq), sol: (c - a * p + qq) / a };
  else { if (a * (s - 1) === s) return null; wrong = { t: "x = " + int(a * (s - 1)), sol: a * (s - 1) }; }
  // Stappen na de foute stap rekenen door vanuit de foute stap (dus alleen die ene stap is fout)
  var steps = st.slice();
  steps[bad] = wrong;
  if (bad < 3) {
    var A = a, rhs;
    if (bad === 0) { rhs = c - a * p - qq; steps[1] = { t: eqText(lin(a, a * p + qq), c) }; steps[2] = { t: eqText(lin(a, 0), rhs) }; }
    if (bad === 1) { rhs = c + a * p + qq; steps[2] = { t: eqText(lin(a, 0), rhs) }; }
    if (bad === 2) { rhs = c - a * p + qq; }
    if (rhs % A !== 0) return null;
    steps[3] = { t: "x = " + int(rhs / A) };
  }
  var texts = steps.map(function(x) { return x.t; });
  if (texts.some(function(x, i) { return texts.indexOf(x) !== i; })) return null;
  var labels = texts.map(function(x, i) { return "Stap " + (i + 1) + ": " + x; });
  return { question: "Welke stap is fout?\n" + a + "(x " + MIN + " " + p + ") + " + qq + " = " + c, answer: labels[bad], choices: labels.slice(),
    terms: ["Fout is " + labels[bad] + ". Goed is: " + st[bad].t + "."], isErrorSpotter: true, smallChoices: true };
};

// ── Blok 5: formules ───────────────────────────────────────────────

// 26. Formule invullen
GEN.al26 = function(sub) {
  if (sub === 0) {
    var C = rnd(1, 8) * 5, F = C * 9 / 5 + 32;
    return Q("F = 1,8 " + DOT + " C + 32\nC = " + C + ". F =", choose4([numItem(F), numItem(C + 32), numItem(C * 9 / 5), numItem((C + 32) * 9 / 5 === Math.round((C + 32) * 9 / 5) ? (C + 32) * 9 / 5 : F + 10)]),
      "1,8 " + DOT + " " + C + " = " + (C * 9 / 5) + ", plus 32 = " + F + ".");
  }
  if (sub === 1) {
    var l = rnd(3, 15), b = rnd(2, 12), O = 2 * l + 2 * b;
    return Q("O = 2l + 2b\nl = " + l + ", b = " + b + ". O =", choose4([numItem(O), numItem(l + b), numItem(2 * l + b), numItem(4 * l * b), numItem(l * b)]),
      "2" + DOT + l + " + 2" + DOT + b + " = " + (2 * l) + " + " + (2 * b) + " = " + O + ".");
  }
  var v = rnd(3, 12) * 5, t = rnd(2, 6), sAns = v * t;
  return Q("s = v " + DOT + " t\nv = " + v + ", t = " + t + ". s =", choose4([numItem(sAns), numItem(v + t), numItem(v - t), numItem(sAns + v)]),
    v + " " + DOT + " " + t + " = " + sAns + ".");
};

// 27. Formule omvormen (keuzes zijn formules; controle door invullen)
GEN.al27 = function() {
  var a = rnd(2, 9), c = rnd(1, 12), L = pickOne([["v", "s", "t"], ["I", "U", "R"], ["l", "A", "b"]]);
  var T = pickOne([
    ["P = 2l + 2b", "b", ["(P " + MIN + " 2l)/2", "P " + MIN + " 2l", "(P " + MIN + " l)/2", "P/2 " + MIN + " 2l"], "Eerst 2l naar de andere kant: 2b = P " + MIN + " 2l. Dan delen door 2: b = (P " + MIN + " 2l)/2."],
    [L[1] + " = " + L[0] + " " + DOT + " " + L[2], L[2], [L[1] + "/" + L[0], L[0] + "/" + L[1], L[1] + " " + DOT + " " + L[0], L[1] + " " + MIN + " " + L[0]], "Deel beide kanten door " + L[0] + ": " + L[2] + " = " + L[1] + "/" + L[0] + "."],
    ["y = " + a + "x + " + c, "x", ["(y " + MIN + " " + c + ")/" + a, "(y + " + c + ")/" + a, "y/" + a + " " + MIN + " " + c, "(y " + MIN + " " + a + ")/" + c], "Eerst " + c + " eraf: " + a + "x = y " + MIN + " " + c + ". Dan delen door " + a + ": x = (y " + MIN + " " + c + ")/" + a + "."],
  ]);
  if (T[2][3] === T[2][0]) return null;
  return { question: T[0] + "\nSchrijf als " + T[1] + " =", answer: T[2][0], choices: shuffle(T[2].slice()), terms: [T[3]], smallChoices: true };
};

// ── Blok 6: ongelijkheden ──────────────────────────────────────────

var FLIP = { "<": ">", ">": "<" };
FLIP[LE] = GE; FLIP[GE] = LE;
// 28. Ongelijkheid oplossen (positieve coefficient)
GEN.al28 = function() {
  var a = rnd(2, 9), s = nz(-6, 12), b = rnd(1, 12), c = a * s + b, rel = pickOne(["<", ">", LE, GE]);
  return Q(a + "x + " + b + " " + rel + " " + c, choose4([solItem(s, 1, rel), solItem(s, 1, FLIP[rel]), solItem(c + b, a, rel), solItem(c - b, 1, rel), solItem(c, a, rel)]),
    "Eerst " + b + " eraf: " + a + "x " + rel + " " + int(c - b) + ". Delen door " + a + " (positief, teken blijft): x " + rel + " " + int(s) + ".");
};

// 29. Delen door een negatief getal: teken omdraaien
GEN.al29 = function() {
  var a = rnd(2, 9), s = nz(-9, 9), rel = pickOne(["<", ">", LE, GE]), c = -a * s;
  return Q(MIN + a + "x " + rel + " " + int(c), choose4([solItem(s, 1, FLIP[rel]), solItem(s, 1, rel), solItem(-s, 1, FLIP[rel]), solItem(-s, 1, rel)]),
    "Delen door " + MIN + a + " (negatief): het teken draait om. " + int(c) + " : " + MIN + a + " = " + int(s) + ", dus x " + FLIP[rel] + " " + int(s) + ".");
};

// ── Blok 7: toepassen ──────────────────────────────────────────────

// 30. Vergelijking opstellen bij een verhaal
GEN.al30 = function(sub) {
  var a = rnd(2, 6), b = rnd(2, 9), s = rnd(1, 9), story, ans, wr, st;
  if (sub === 0) {
    var c = a * s + b; story = "Een getal keer " + a + ", plus " + b + ",\ngeeft " + c + ".";
    ans = { lhs: lin(a, b), text: ptext(lin(a, b)) + " = " + c };
    wr = [{ lhs: lin(a, a * b), text: a + "(x + " + b + ") = " + c }, { lhs: lin(1, a + b), text: ptext(lin(1, a + b)) + " = " + c }, { lhs: lin(b, a), text: ptext(lin(b, a)) + " = " + c }];
    st = "Het getal is x. Keer " + a + ": " + a + "x. Plus " + b + ": " + ptext(lin(a, b)) + ". Dat geeft " + c + ": " + ans.text + ".";
    return Q(story, choose4([ans].concat(wr).map(function(e) { return { key: pkey(e.lhs), text: e.text }; })), st, { smallChoices: true });
  }
  var c2 = a * (s + b); story = "Een getal plus " + b + ",\ndaarna keer " + a + ", geeft " + c2 + ".";
  ans = { lhs: lin(a, a * b), text: a + "(x + " + b + ") = " + c2 };
  wr = [{ lhs: lin(a, b), text: ptext(lin(a, b)) + " = " + c2 }, { lhs: lin(1, a + b), text: ptext(lin(1, a + b)) + " = " + c2 }, { lhs: lin(b, b * a + 1), text: b + "(x + " + a + ") + 1 = " + c2 }];
  wr[2] = { lhs: lin(b, a * b), text: b + "(x + " + a + ") = " + c2 };
  st = "Het getal is x. Plus " + b + ": x + " + b + ". Daarna keer " + a + ": " + ans.text + ".";
  return Q(story, choose4([ans].concat(wr).map(function(e) { return { key: pkey(e.lhs), text: e.text }; })), st, { smallChoices: true });
};

// 31. Verhaalsom oplossen
GEN.al31 = function() {
  var n = rnd(2, 6), x = rnd(4, 25), p = rnd(2, 15), t = n * x + p;
  var item = pickOne([["kaartjes", "kaartje", "parkeren"], ["pizza's", "pizza", "bezorgen"], ["boeken", "boek", "verzenden"]]);
  var e = function(v) { return { key: String(v), text: "€" + NB + v }; };
  return Q(n + " " + item[0] + " en €" + NB + p + " " + item[2] + "\nkosten samen €" + NB + t + ".\nWat kost één " + item[1] + "?",
    choose4([e(x), e((t + p) % n === 0 ? (t + p) / n : x + 3), e(t - p), e(x + 1), e(t % n === 0 ? t / n : x - 1)]),
    n + "x + " + p + " = " + t + ". Dus " + n + "x = " + (t - p) + " en x = " + x + ": één " + item[1] + " kost €" + NB + x + ".");
};

// 32. Fout spotten bij herleiden
GEN.al32 = function() {
  var mk = [
    function(ok) { var a = rnd(2, 6), b = rnd(1, 9); return a + "(x + " + b + ") = " + ptext(lin(a, ok ? a * b : b)); },
    function(ok) { var a = rnd(2, 6), b = rnd(1, 9); return MIN + a + "(x " + MIN + " " + b + ") = " + ptext(lin(-a, ok ? a * b : -a * b)); },
    function(ok) { var p = rnd(2, 9), q = rnd(1, p - 1), c = rnd(1, 9); return p + "x " + MIN + " (" + (q === 1 ? "" : q) + "x + " + c + ") = " + ptext(lin(p - q, ok ? -c : c)); },
    function(ok) { var p = rnd(2, 6), q = rnd(2, 6); return p + "x " + DOT + " " + q + "x = " + ptext(ok ? P({ x2: p * q }) : P({ x: p * q })); },
    function(ok) { var m = rnd(2, 4), n = rnd(2, 3); if (m === 2 && n === 2) m = 3; return "x" + sup(m) + " " + DOT + " x" + sup(n) + " = " + ptext(P({ ["x" + (ok ? m + n : m * n)]: 1 })); },
    function(ok) { var p = rnd(3, 9), q = rnd(1, p - 1), c = rnd(1, 9); return p + "x + " + c + " " + MIN + " " + (q === 1 ? "" : q) + "x = " + ptext(ok ? lin(p - q, c) : lin(p - q + c, 0)); },
  ];
  var idx = shuffle([0, 1, 2, 3, 4, 5]).slice(0, 4), bad = rnd(0, 3);
  var sums = idx.map(function(m, i) { return mk[m](i !== bad); });
  if (sums.some(function(s, i) { return sums.indexOf(s) !== i; })) return null;
  return { question: "Welke herleiding is FOUT?", answer: sums[bad], choices: shuffle(sums.slice()), terms: ["Fout: " + sums[bad] + ". Let op: min vóór haakjes draait alle tekens om, het getal vóór de haakjes gaat keer elke term, x " + DOT + " x = x" + sup(2) + "."], isErrorSpotter: true, smallChoices: true };
};

// ─────────────────────────────────────────────────────────────────
// VAARDIGHEDEN
// [id, label, groep, desc, strategy, uitleg, voorbeeld, minCorrect, subtypes]
// ─────────────────────────────────────────────────────────────────

var G1 = "Variabelen", G2 = "Herleiden", G3 = "Haakjes", G4 = "Vergelijkingen", G5 = "Formules", G6 = "Ongelijkheden", G7 = "Toepassen";

var DEFS = [
  ["al01_woorden", "Van woorden naar formule", G1, "3 meer dan x = x + 3", "vertalen",
    "Een letter staat voor een onbekend getal. \"3 meer dan x\" is x + 3, \"het dubbele van x\" is 2x en \"x keer zichzelf\" is x" + sup(2) + ".",
    "Het drievoud van x, plus 4\n3x + 4.", 8, 0],
  ["al02_invullen", "Invullen", G1, "x = 4: 3x " + MIN + " 5 = 7", "invullen",
    "Vervang de letter door het getal. 3x betekent 3 " + DOT + " x, dus bij x = 4 is 3x = 12. Daarna de gewone rekenvolgorde.",
    "x = 4: 3x " + MIN + " 5\n3 " + DOT + " 4 " + MIN + " 5 = 7.", 8, 2],
  ["al03_invullen_negatief", "Invullen met een negatief getal", G1, "x = " + MIN + "2: x" + sup(2) + " + 3x = " + MIN + "2", "haakjes om het getal",
    "Zet een negatief getal tussen haakjes als je het invult: x" + sup(2) + " wordt (" + MIN + "2)" + sup(2) + " = 4, niet " + MIN + "4.",
    "x = " + MIN + "2: x" + sup(2) + " + 3x\n(" + MIN + "2)" + sup(2) + " + 3 " + DOT + " (" + MIN + "2) = 4 " + MIN + " 6 = " + MIN + "2.", 8, 2],
  ["al04_twee_letters", "Twee letters invullen", G1, "a = 3, b = " + MIN + "2: 2a " + MIN + " b = 8", "invullen",
    "Vul elke letter apart in, met haakjes om negatieve getallen. Min een negatief getal wordt plus.",
    "a = 3, b = " + MIN + "2: 2a " + MIN + " b\n6 " + MIN + " (" + MIN + "2) = 8.", 8, 2],
  ["al05_gelijksoortig", "Gelijksoortige termen", G2, "4x + 3 " + MIN + " x = 3x + 3", "x bij x",
    "Je mag alleen termen met dezelfde letter samennemen: x-termen bij x-termen, losse getallen bij losse getallen. 3x + 3 is niet 6x.",
    "4x + 3 " + MIN + " x\n4x " + MIN + " x = 3x, dus 3x + 3.", 8, 0],
  ["al06_negatief_herleiden", "Herleiden met negatieve getallen", G2, "2x " + MIN + " 7x + 4 = " + MIN + "5x + 4", "getallenlijn",
    "Neem de getallen vóór de x samen, met hun teken: 2 " + MIN + " 7 = " + MIN + "5.",
    "2x " + MIN + " 7x + 4\n" + MIN + "5x + 4.", 8, 0],
  ["al07_twee_letters_herleiden", "Herleiden met twee letters", G2, "3a + 2b " + MIN + " a + b = 2a + 3b", "a bij a, b bij b",
    "a-termen en b-termen zijn verschillend: je mag ze niet samennemen. 2a + 3b blijft 2a + 3b.",
    "3a + 2b " + MIN + " a + b\na: 3 " + MIN + " 1 = 2, b: 2 + 1 = 3.\n2a + 3b.", 8, 0],
  ["al08_vermenigvuldigen", "Termen vermenigvuldigen", G2, "2x " + DOT + " 5x = 10x" + sup(2), "getallen en letters apart",
    "Vermenigvuldig de getallen met elkaar en de letters met elkaar: 2x " + DOT + " 5x = 2 " + DOT + " 5 " + DOT + " x " + DOT + " x = 10x" + sup(2) + ".",
    "2x " + DOT + " 5x\n2 " + DOT + " 5 = 10, x " + DOT + " x = x" + sup(2) + ".\n10x" + sup(2) + ".", 8, 2],
  ["al09_machten_x", "Machten van x", G2, "x" + sup(3) + " " + DOT + " x" + sup(2) + " = x" + sup(5), "exponenten",
    "Bij dezelfde letter: keer is exponenten optellen, delen is exponenten aftrekken.",
    "x" + sup(3) + " " + DOT + " x" + sup(2) + "\n3 + 2 = 5: x" + sup(5) + ".", 8, 2],
  ["al10_delen", "Term delen", G2, "12x : 3 = 4x", "getal delen",
    "Deel het getal vóór de letter; de letter blijft staan.",
    "12x : 3\n12 : 3 = 4: 4x.", 8, 0],
  ["al11_haakjes", "Haakjes uitwerken", G3, "3(x + 4) = 3x + 12", "verdeelregel",
    "Het getal vóór de haakjes gaat keer élke term tussen de haakjes: a(x + b) = ax + ab.",
    "3(x + 4)\n3 " + DOT + " x + 3 " + DOT + " 4 = 3x + 12.", 8, 2],
  ["al12_min_voor_haakjes", "Min vóór haakjes", G3, "2x " + MIN + " (x + 3) = x " + MIN + " 3", "tekens omdraaien",
    "Een min vóór haakjes draait het teken van elke term binnen de haakjes om: " + MIN + "(x + 3) = " + MIN + "x " + MIN + " 3.",
    "2x " + MIN + " (x + 3)\n2x " + MIN + " x " + MIN + " 3 = x " + MIN + " 3.", 8, 2],
  ["al13_negatief_voor_haakjes", "Negatief getal vóór haakjes", G3, MIN + "2(x " + MIN + " 3) = " + MIN + "2x + 6", "tekenregels",
    "Het negatieve getal gaat keer elke term. " + MIN + " keer " + MIN + " is plus: " + MIN + "2 " + DOT + " " + MIN + "3 = 6.",
    MIN + "2(x " + MIN + " 3)\n" + MIN + "2x + 6.", 8, 2],
  ["al14_uitwerken_herleiden", "Uitwerken en herleiden", G3, "2(x + 3) + 4x = 6x + 6", "eerst haakjes",
    "Werk eerst de haakjes uit en neem daarna de gelijksoortige termen samen.",
    "2(x + 3) + 4x\n2x + 6 + 4x = 6x + 6.", 8, 0],
  ["al15_buiten_haakjes", "Getal buiten haakjes", G3, "6x + 9 = 3(2x + 3)", "grootste gemeenschappelijke deler",
    "Zoek het grootste getal waardoor alle termen deelbaar zijn en zet dat vóór de haakjes. Controle: haakjes weer uitwerken.",
    "6x + 9\nBeide deelbaar door 3: 3(2x + 3).", 8, 0],
  ["al16_x_buiten_haakjes", "x buiten haakjes", G3, "x" + sup(2) + " + 5x = x(x + 5)", "gemeenschappelijke letter",
    "Hebben alle termen een x, dan kun je die x buiten haakjes zetten: x" + sup(2) + " + 5x = x(x + 5).",
    "x" + sup(2) + " " + MIN + " 3x\nx(x " + MIN + " 3).", 8, 2],
  ["al17_oplossing", "Wat is een oplossing", G4, "2x + 1 = 7 past bij x = 3", "invullen",
    "Een oplossing is een getal dat de vergelijking waar maakt. Vul in en controleer of links en rechts gelijk zijn.",
    "2x + 1 = 7, x = 3?\n2 " + DOT + " 3 + 1 = 7. Klopt.", 8, 0],
  ["al18_een_stap", "Vergelijking in één stap", G4, "4x = 28, dus x = 7", "terugrekenen",
    "Doe aan beide kanten hetzelfde, zodat x alleen overblijft: plus wordt min, keer wordt delen.",
    "4x = 28\nDelen door 4: x = 7.", 8, 2],
  ["al19_twee_stappen", "Vergelijking in twee stappen", G4, "3x + 5 = 20, dus x = 5", "eerst plus/min, dan delen",
    "Haal eerst het losse getal weg (aan beide kanten), deel daarna door het getal vóór de x.",
    "3x + 5 = 20\n3x = 15, x = 5.", 8, 0],
  ["al20_negatief", "Negatieve getallen in vergelijkingen", G4, MIN + "2x + 3 = 11, dus x = " + MIN + "4", "delen door negatief",
    "Werk zoals altijd; deel ook door een negatief getal als dat vóór de x staat. Let op de tekenregels.",
    MIN + "2x + 3 = 11\n" + MIN + "2x = 8, x = " + MIN + "4.", 8, 0],
  ["al21_beide_kanten", "x aan beide kanten", G4, "5x " + MIN + " 3 = 2x + 9, dus x = 4", "balans",
    "Breng alle x-termen naar één kant en alle getallen naar de andere kant, door aan beide kanten hetzelfde te doen.",
    "5x " + MIN + " 3 = 2x + 9\n3x = 12, x = 4.", 8, 0],
  ["al22_met_haakjes", "Vergelijking met haakjes", G4, "3(x " + MIN + " 2) = 12, dus x = 6", "eerst delen of uitwerken",
    "Deel eerst beide kanten door het getal vóór de haakjes (of werk de haakjes uit) en los dan op.",
    "3(x " + MIN + " 2) = 12\nx " + MIN + " 2 = 4, x = 6.", 8, 0],
  ["al23_met_breuk", "Vergelijking met een breuk", G4, "x/3 + 2 = 5, dus x = 9", "keer de noemer",
    "Haal eerst het losse getal weg. Is x gedeeld door een getal, vermenigvuldig dan beide kanten met dat getal.",
    "x/3 + 2 = 5\nx/3 = 3, x = 9.", 8, 0],
  ["al24_breuk_oplossing", "Oplossing is een breuk", G4, "4x = 6, dus x = 3/2", "breuk vereenvoudigen",
    "Gaat het delen niet precies op, dan is de oplossing een breuk. Vereenvoudig die.",
    "4x = 6\nx = 6/4 = 3/2.", 8, 0],
  ["al25_fout_oplossing", "Fout in de oplossing", G4, "Welke stap is fout?", "stap voor stap controleren",
    "Controleer elke stap: werk je haakjes goed uit, neem je de getallen goed samen, en doe je aan beide kanten hetzelfde?",
    "3(x " + MIN + " 2) + 4 = 19\nStap 1: 3x + 6 + 4 = 19 is fout: 3 " + DOT + " " + MIN + "2 = " + MIN + "6.", 10, 0],
  ["al26_formule_invullen", "Formule invullen", G5, "F = 1,8 " + DOT + " C + 32, C = 25: F = 77", "invullen en volgorde",
    "Vervang de letters door de gegeven getallen en reken uit met de gewone rekenvolgorde.",
    "O = 2l + 2b, l = 5, b = 3\n10 + 6 = 16.", 8, 3],
  ["al27_formule_omvormen", "Formule omvormen", G5, "P = 2l + 2b, dus b = (P " + MIN + " 2l)/2", "balans",
    "Behandel de formule als een vergelijking: doe aan beide kanten hetzelfde tot de gevraagde letter alleen staat.",
    "s = v " + DOT + " t, t = ?\nDelen door v: t = s/v.", 8, 0],
  ["al28_ongelijkheid", "Ongelijkheid oplossen", G6, "2x + 3 < 11, dus x < 4", "als een vergelijking",
    "Los een ongelijkheid op als een vergelijking. Bij delen door een positief getal blijft het teken staan.",
    "2x + 3 < 11\n2x < 8, x < 4.", 8, 0],
  ["al29_teken_omdraaien", "Delen door een negatief getal", G6, MIN + "3x " + GE + " 12, dus x " + LE + " " + MIN + "4", "teken omdraaien",
    "Deel of vermenigvuldig je beide kanten met een negatief getal, dan draait het ongelijkheidsteken om.",
    MIN + "3x " + GE + " 12\nDelen door " + MIN + "3: x " + LE + " " + MIN + "4.", 8, 0],
  ["al30_opstellen", "Vergelijking opstellen", G7, "Keer 3, plus 4, geeft 19: 3x + 4 = 19", "volgorde volgen",
    "Noem het onbekende getal x en schrijf de bewerkingen in de goede volgorde op. \"Eerst plus, daarna keer\" vraagt om haakjes.",
    "Plus 2, daarna keer 3, geeft 21\n3(x + 2) = 21.", 8, 2],
  ["al31_verhaalsom", "Verhaalsom oplossen", G7, "3 kaartjes en €" + NB + "5 = €" + NB + "41: één kaartje €" + NB + "12", "vergelijking maken",
    "Maak een vergelijking: het onbekende bedrag is x. Los die op met de stappen die je kent.",
    "3x + 5 = 41\n3x = 36, x = 12.", 8, 0],
  ["al32_fout_herleiden", "Fout spotten", G7, "Welke herleiding is FOUT?", "controleren",
    "Controleer elke herleiding: haakjes uitwerken (elke term), min vóór haakjes (alle tekens om), alleen gelijksoortige termen samen.",
    "Welke is FOUT?\n" + MIN + "2(x " + MIN + " 3) = " + MIN + "2x " + MIN + " 6 is fout: het is " + MIN + "2x + 6.", 10, 0],
];

function tipOf(terms) { return terms && terms[0] ? terms[0] : ""; }

var RAW_SKILLS = DEFS.map(function(d) {
  var key = d[0].slice(0, 4), gen = GEN[key], subs = d[8];
  return {
    id: d[0], label: d[1], group: d[2], desc: d[3], strategy: d[4], tip: tipOf,
    uitleg: d[5], voorbeeld: d[6], minCorrect: d[7], subtypes: subs || undefined,
    make: function(s) { return retry(function() { return gen(s || 0); }); },
  };
});

var SKILLS = createSkills("wiskunde_algebra", RAW_SKILLS);

export var WISK_ALGEBRA_SKILLS = SKILLS.list;
export var WISK_ALGEBRA_ORDER  = SKILLS.list.map(function(s) { return s.id; });
export var WISK_ALGEBRA_GEN    = GEN;
