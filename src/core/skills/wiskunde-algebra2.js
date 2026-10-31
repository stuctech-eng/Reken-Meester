// Wiskunde, domein Algebra 2: haakjes keer haakjes, kwadratische vergelijkingen en stelsels.
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Uitdrukkingen zijn veeltermen in x (x², x, los getal), exact vergeleken per term.
// Kwadratische vergelijkingen worden gemaakt vanuit hun oplossingen (altijd geheel of breuk);
// stelsels vanuit hun oplossing, met determinant ongelijk aan 0 (precies één oplossing).
// Oplossingen: "x = −5 of x = 3" (kleinste eerst). Keerteken: "·".

import { rnd, shuffle } from "./helpers.js";
import { createSkills } from "./flow.js";

var MIN  = "−";
var DOT  = "·";
var NB   = "\u00a0";
var SQ   = "²";

function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = b; b = a % b; a = t; } return a || 1; }
function nz(min, max) { var x = 0; while (x === 0) x = rnd(min, max); return x; }
function pickOne(list) { return list[rnd(0, list.length - 1)]; }
function int(x) { return (x < 0 ? MIN : "") + Math.abs(x); }
function neg(x) { return x < 0 ? "(" + int(x) + ")" : String(x); }

// ── Exacte breuken ────────────────────────────────────────────────
function R(n, d) { if (d === undefined) d = 1; if (d < 0) { n = -n; d = -d; } var g = gcd(n, d); return { n: n / g, d: d / g }; }
function rtext(r) { return r.d === 1 ? int(r.n) : (r.n < 0 ? MIN : "") + Math.abs(r.n) + "/" + r.d; }
function rkey(r) { return r.n + "/" + r.d; }
function rcmp(a, b) { return a.n * b.d - b.n * a.d; }

// ── Veeltermen in x: { x2, x, c } ─────────────────────────────────
function Q2(a, b, c) { return { x2: a, x: b, c: c }; }
function ptext(p) {
  var parts = [];
  function term(coef, body) {
    if (!coef) return;
    var a = Math.abs(coef), t = body === "" ? String(a) : (a === 1 ? "" : String(a)) + body;
    if (parts.length === 0) parts.push((coef < 0 ? MIN : "") + t);
    else parts.push((coef < 0 ? " " + MIN + " " : " + ") + t);
  }
  term(p.x2, "x" + SQ); term(p.x, "x"); term(p.c, "");
  return parts.length ? parts.join("") : "0";
}
function pkey(p) { return p.x2 + "|" + p.x + "|" + p.c; }
function polyItem(p) { if (!p.x2 && !p.x && !p.c) return null; return { key: pkey(p), text: ptext(p) }; }
// Lineaire factor (p·x + q); product van factoren uitwerken
function lf(p, q) { return { p: p, q: q }; }
function lftext(f) { return "(" + ptext(Q2(0, f.p, f.q)) + ")"; }
function expand(fs) { var a = fs[0], b = fs[1]; return Q2(a.p * b.p, a.p * b.q + a.q * b.p, a.q * b.q); }
// Vaste volgorde: kleinste losse getal eerst; twee gelijke factoren als kwadraat
function factText(fs) {
  var s = fs.slice().sort(function(u, v) { return u.q - v.q || u.p - v.p; });
  if (s[0].p === s[1].p && s[0].q === s[1].q) return lftext(s[0]) + SQ;
  return lftext(s[0]) + lftext(s[1]);
}
function factItem(fs) { var e = expand(fs); return { key: pkey(e), text: factText(fs) }; }

// ── Oplossingen (verzameling, kleinste eerst) ──────────────────────
function solItem(list) {
  if (list === null) return { key: "geen", text: "geen oplossing" };
  var u = [];
  list.forEach(function(r) { if (!u.some(function(v) { return rcmp(v, r) === 0; })) u.push(r); });
  u.sort(rcmp);
  return { key: u.map(rkey).join(";"), text: u.map(function(r) { return "x = " + rtext(r); }).join(" of ") };
}
function sysItem(x, y, fmt) { return { key: rkey(x) + "|" + rkey(y), text: fmt ? fmt(x, y) : "x = " + rtext(x) + ", y = " + rtext(y) }; }
function numItem(v) { return { key: String(v), text: int(v) }; }

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
function Q(question, c, steps, extra) {
  if (!c) return null;
  question = question.replace(/ =$/, NB + "=");
  if (question.indexOf("\n") === -1 && question.length <= 22 && !/[a-wzA-Z]/.test(question.replace(/x/g, ""))) question = question.replace(/ /g, NB);
  var q = { question: question, answer: c.answer, choices: c.choices, terms: [steps] };
  if (c.choices.some(function(t) { return t.length > 5; })) q.smallChoices = true;
  if (extra) { for (var k in extra) q[k] = extra[k]; }
  return q;
}
function retry(fn) { for (var i = 0; i < 400; i++) { var q = fn(); if (q) return q; } throw new Error("geen geldige vraag"); }
function eq0(p) { return ptext(p) + " = 0"; }

var GEN = {};

// ── Blok 1: haakjes keer haakjes ──────────────────────────────────

GEN.aq01 = function() {
  var a = rnd(1, 9), b = rnd(1, 9), s = a + b, p = a * b, ans = Q2(1, s, p);
  return Q(factText([lf(1, a), lf(1, b)]) + " =", choose4([polyItem(ans), polyItem(Q2(1, 0, p)), polyItem(Q2(1, s, s)), polyItem(Q2(1, p, s)), polyItem(Q2(1, s + 1, p))]),
    "Elke term keer elke term: x" + DOT + "x = x" + SQ + ", x" + DOT + b + " + " + a + DOT + "x = " + s + "x, " + a + DOT + b + " = " + p + ". Samen " + ptext(ans) + ".");
};
GEN.aq02 = function() {
  var a = rnd(1, 9), b = rnd(1, 9);
  if (a === b) return null;
  var ans = Q2(1, b - a, -a * b);
  return Q(factText([lf(1, -a), lf(1, b)]) + " =", choose4([polyItem(ans), polyItem(Q2(1, a - b, -a * b)), polyItem(Q2(1, b - a, a * b)), polyItem(Q2(1, 0, -a * b)), polyItem(Q2(1, a + b, -a * b))]),
    "x" + DOT + "x = x" + SQ + ", x" + DOT + b + " + (" + MIN + a + ")" + DOT + "x = " + ptext(Q2(0, b - a, 0)) + ", (" + MIN + a + ")" + DOT + b + " = " + int(-a * b) + ". Samen " + ptext(ans) + ".");
};
GEN.aq03 = function() {
  var a = rnd(1, 12), ans = Q2(1, 2 * a, a * a);
  return Q("(x + " + a + ")" + SQ + " =", choose4([polyItem(ans), polyItem(Q2(1, 0, a * a)), polyItem(Q2(1, a, a * a)), polyItem(Q2(1, 2 * a, 2 * a))]),
    "(x + " + a + ")(x + " + a + "): x" + SQ + " + " + a + "x + " + a + "x + " + (a * a) + " = " + ptext(ans) + ".");
};
GEN.aq04 = function() {
  var a = rnd(1, 12), ans = Q2(1, -2 * a, a * a);
  return Q("(x " + MIN + " " + a + ")" + SQ + " =", choose4([polyItem(ans), polyItem(Q2(1, 0, -a * a)), polyItem(Q2(1, 0, a * a)), polyItem(Q2(1, -2 * a, -a * a))]),
    "(x " + MIN + " " + a + ")(x " + MIN + " " + a + "): x" + SQ + " " + MIN + " " + a + "x " + MIN + " " + a + "x + " + (a * a) + " = " + ptext(ans) + ".");
};
GEN.aq05 = function() {
  var a = rnd(2, 12), ans = Q2(1, 0, -a * a);
  return Q("(x + " + a + ")(x " + MIN + " " + a + ") =", choose4([polyItem(ans), polyItem(Q2(1, 0, a * a)), polyItem(Q2(1, -2 * a, -a * a)), polyItem(Q2(1, 0, -2 * a)), polyItem(Q2(1, 0, -a))]),
    "x" + SQ + " " + MIN + " " + a + "x + " + a + "x " + MIN + " " + (a * a) + ": de x-termen vallen weg. " + ptext(ans) + ".");
};
GEN.aq06 = function() {
  var p = rnd(2, 5), b = rnd(1, 9), d = rnd(1, 9), ans = Q2(p, p * d + b, b * d);
  return Q("(" + p + "x + " + b + ")(x + " + d + ") =", choose4([polyItem(ans), polyItem(Q2(p, b + d, b * d)), polyItem(Q2(p, 0, b * d)), polyItem(Q2(p + 1, p * d + b, b * d)), polyItem(Q2(p, p * d, b * d))]),
    p + "x" + DOT + "x = " + p + "x" + SQ + ", " + p + "x" + DOT + d + " + " + b + DOT + "x = " + (p * d + b) + "x, " + b + DOT + d + " = " + (b * d) + ". Samen " + ptext(ans) + ".");
};

// ── Blok 2: ontbinden ─────────────────────────────────────────────

// Alle ontbindingen (x + u)(x + v) met u·v = c, als foute keuzes (zonder het goede paar)
function otherPairs(c, good) {
  var out = [], m = Math.abs(c);
  for (var u = -m; u <= m; u++) { if (u === 0 || c % u !== 0) continue; var v = c / u; if (u > v) continue; out.push([lf(1, u), lf(1, v)]); }
  return out.filter(function(fs) { return pkey(expand(fs)) !== pkey(expand(good)); });
}
GEN.aq07 = function() {
  var a = rnd(1, 9), b = rnd(1, 9);
  if (a === b) return null;
  var good = [lf(1, a), lf(1, b)], target = expand(good);
  var items = [factItem(good), factItem([lf(1, -a), lf(1, -b)])].concat(shuffle(otherPairs(a * b, good)).map(factItem), [factItem([lf(1, a + b), lf(1, 1)])]);
  return Q(ptext(target) + " =", choose4(items), "Zoek twee getallen met product " + (a * b) + " en som " + (a + b) + ": " + Math.min(a, b) + " en " + Math.max(a, b) + ". Dus " + factText(good) + ".");
};
GEN.aq08 = function() {
  var a = nz(-9, 9), b = nz(-9, 9);
  if (a === b || a * b > 0 || a === -b) return null;
  var good = [lf(1, a), lf(1, b)], target = expand(good);
  var items = [factItem(good), factItem([lf(1, -a), lf(1, -b)])].concat(shuffle(otherPairs(a * b, good)).map(factItem));
  return Q(ptext(target) + " =", choose4(items), "Zoek twee getallen met product " + int(a * b) + " en som " + int(a + b) + ": " + int(Math.min(a, b)) + " en " + int(Math.max(a, b)) + ". Dus " + factText(good) + ".");
};
GEN.aq09 = function() {
  var a = rnd(2, 12), good = [lf(1, -a), lf(1, a)];
  return Q("x" + SQ + " " + MIN + " " + (a * a) + " =", choose4([factItem(good), factItem([lf(1, -a), lf(1, -a)]), factItem([lf(1, a), lf(1, a)]), factItem([lf(1, -a * a), lf(1, 1)])]),
    (a * a) + " = " + a + SQ + ". Verschil van twee kwadraten: x" + SQ + " " + MIN + " " + a + SQ + " = " + factText(good) + ".");
};
GEN.aq10 = function(sub) {
  var a = rnd(1, 10) * (sub === 0 ? 1 : -1), good = [lf(1, a), lf(1, a)], target = expand(good);
  return Q(ptext(target) + " =", choose4([factItem(good), factItem([lf(1, a * a), lf(1, a * a)]), factItem([lf(1, a), lf(1, -a)]), factItem([lf(1, 2 * a), lf(1, a)]), factItem([lf(1, -a), lf(1, -a)])]),
    (a * a) + " = " + Math.abs(a) + SQ + " en " + int(2 * a) + "x = 2" + DOT + neg(a) + DOT + "x. Dus " + factText(good) + ".");
};

// ── Blok 3: kwadratische vergelijkingen ───────────────────────────

GEN.aq11 = function() {
  var n = rnd(2, 15);
  return Q("x" + SQ + " = " + (n * n), choose4([solItem([R(-n), R(n)]), solItem([R(n)]), solItem([R(-n)]), solItem([R(n * n, 2)]), solItem([R(-n * n), R(n * n)])]),
    "Welk getal keer zichzelf is " + (n * n) + "? " + n + " en ook " + MIN + n + ". Dus " + solItem([R(-n), R(n)]).text + ".");
};
GEN.aq12 = function() {
  var p = rnd(1, 9), q = rnd(1, 9);
  if (p === q) return null;
  return Q("(x " + MIN + " " + p + ")(x + " + q + ") = 0", choose4([solItem([R(p), R(-q)]), solItem([R(-p), R(q)]), solItem([R(p)]), solItem([R(-p * q)]), solItem([R(-q)])]),
    "Een product is 0 als een van de factoren 0 is: x " + MIN + " " + p + " = 0 of x + " + q + " = 0. Dus " + solItem([R(p), R(-q)]).text + ".");
};
GEN.aq13 = function() {
  var k = nz(-12, 12);
  return Q(eq0(Q2(1, k, 0)), choose4([solItem([R(0), R(-k)]), solItem([R(-k)]), solItem([R(0), R(k)]), solItem([R(0)]), solItem([R(k)])]),
    "x buiten haakjes: x(" + ptext(Q2(0, 1, k)) + ") = 0. Dus x = 0 of " + ptext(Q2(0, 1, k)) + " = 0: " + solItem([R(0), R(-k)]).text + ".");
};
GEN.aq14 = function() {
  var r1 = nz(-9, 9), r2 = nz(-9, 9);
  if (r1 === r2) return null;
  var p = Q2(1, -(r1 + r2), r1 * r2);
  return Q(eq0(p), choose4([solItem([R(r1), R(r2)]), solItem([R(-r1), R(-r2)]), solItem([R(Math.max(r1, r2))]), solItem([R(r1 * r2)]), solItem([R(-(r1 + r2))])]),
    "Ontbind: " + factText([lf(1, -r1), lf(1, -r2)]) + " = 0. Dus " + solItem([R(r1), R(r2)]).text + ".");
};
GEN.aq15 = function() {
  var a = rnd(2, 6), n = rnd(2, 10);
  return Q(a + "x" + SQ + " = " + (a * n * n), choose4([solItem([R(-n), R(n)]), solItem([R(n)]), solItem([R(-n * n), R(n * n)]), solItem([R(a * n * n - a)]), solItem([R(-a * n), R(a * n)])]),
    "Eerst delen door " + a + ": x" + SQ + " = " + (n * n) + ". Dan " + solItem([R(-n), R(n)]).text + ".");
};
GEN.aq16 = function() {
  var r1 = nz(-9, 9), r2 = nz(-9, 9);
  if (r1 === r2 || r1 * r2 === 0) return null;
  var B = -(r1 + r2), C = -r1 * r2;
  if (B === 0) return null;
  return Q(ptext(Q2(1, B, 0)) + " = " + int(C), choose4([solItem([R(r1), R(r2)]), solItem([R(-r1), R(-r2)]), solItem([R(C)]), solItem([R(Math.max(r1, r2))]), solItem([R(0), R(-B)])]),
    "Eerst alles naar links: " + eq0(Q2(1, B, -C)) + ". Ontbind: " + factText([lf(1, -r1), lf(1, -r2)]) + " = 0. Dus " + solItem([R(r1), R(r2)]).text + ".");
};
GEN.aq17 = function() {
  var a = nz(-4, 5), b = nz(-9, 9), c = nz(-9, 9), D = b * b - 4 * a * c;
  return Q("D bij " + eq0(Q2(a, b, c)) + "?", choose4([numItem(D), numItem(b * b + 4 * a * c), numItem(-b * b - 4 * a * c), numItem(b * b - 4 * c), numItem(b - 4 * a * c)]),
    "D = b" + SQ + " " + MIN + " 4ac = " + neg(b) + SQ + " " + MIN + " 4" + DOT + neg(a) + DOT + neg(c) + " = " + (b * b) + " " + MIN + " " + neg(4 * a * c) + " = " + int(D) + ".", { smallChoices: false });
};
// abc-formule met nette uitkomst: (a·x − p)(x − q) = 0 met een breuk als oplossing
GEN.aq18 = function() {
  var a = rnd(2, 4), p = nz(-9, 9), q = nz(-6, 6);
  if (p % a === 0) return null;
  var e = expand([lf(a, -p), lf(1, -q)]), D = e.x * e.x - 4 * e.x2 * e.c, r = R(p, a);
  if (rcmp(r, R(q)) === 0) return null;
  var good = solItem([r, R(q)]);
  return Q(eq0(e), choose4([good, solItem([R(-p, a), R(-q)]), solItem([R(q)]), solItem(null), solItem([R(p), R(q)])]),
    "D = " + neg(e.x) + SQ + " " + MIN + " 4" + DOT + e.x2 + DOT + neg(e.c) + " = " + D + " = " + Math.round(Math.sqrt(D)) + SQ + ". x = (" + int(-e.x) + " ± " + Math.round(Math.sqrt(D)) + ")/" + (2 * e.x2) + ", dus " + good.text + ".");
};
GEN.aq19 = function(sub) {
  if (sub === 0) {
    var b = nz(-8, 8), c = Math.floor(b * b / 4) + rnd(1, 9), D = b * b - 4 * c;
    if (D >= 0) return null;
    var w = b % 2 === 0 ? R(-b / 2) : R(-b, 2);
    return Q(eq0(Q2(1, b, c)), choose4([solItem(null), solItem([w]), solItem([R(c)]), solItem([R(-1), R(1)]), solItem([R(-c), R(c)])]),
      "D = " + neg(b) + SQ + " " + MIN + " 4" + DOT + "1" + DOT + c + " = " + int(D) + ". D is kleiner dan 0: geen oplossing.");
  }
  var a = nz(-9, 9), e = Q2(1, 2 * a, a * a);
  return Q(eq0(e), choose4([solItem([R(-a)]), solItem([R(-a), R(a)]), solItem([R(a)]), solItem(null)]),
    "D = " + neg(2 * a) + SQ + " " + MIN + " 4" + DOT + (a * a) + " = 0: precies één oplossing. " + factText([lf(1, a), lf(1, a)]) + " = 0, dus x = " + int(-a) + ".");
};
GEN.aq20 = function() {
  var r1 = nz(-9, 9), r2 = nz(-9, 9);
  if (r1 === r2) return null;
  var p = Q2(1, -(r1 + r2), r1 * r2), pick = pickOne([r1, r2]);
  var isRoot = function(v) { return v === r1 || v === r2; };
  var cands = [-pick, pick + 1, pick - 1, r1 * r2, -(r1 + r2), r1 + r2].filter(function(v) { return !isRoot(v); });
  return Q("Welke x past bij " + eq0(p) + "?", choose4([numItem(pick)].concat(cands.map(numItem))),
    "Invullen: " + neg(pick) + SQ + " " + (-(r1 + r2) < 0 ? MIN : "+") + " " + Math.abs(r1 + r2) + DOT + neg(pick) + " " + (r1 * r2 < 0 ? MIN : "+") + " " + Math.abs(r1 * r2) + " = 0. Dus x = " + int(pick) + " is een oplossing.");
};

// ── Blok 4: stelsels (determinant ≠ 0) ────────────────────────────

function lineText(a, b, c) { // a·x + b·y = c
  var parts = [];
  function t(k, v) { if (!k) return; var s = (Math.abs(k) === 1 ? "" : Math.abs(k)) + v; parts.push(parts.length === 0 ? (k < 0 ? MIN : "") + s : (k < 0 ? " " + MIN + " " : " + ") + s); }
  t(a, "x"); t(b, "y");
  return parts.join("") + " = " + int(c);
}
GEN.aq21 = function() {
  var k = rnd(2, 5), x = rnd(1, 9), y = k * x, s = x + y;
  return Q("y = " + k + "x\nx + y = " + s, choose4([sysItem(R(x), R(y)), sysItem(R(y), R(x)), sysItem(R(s, 2), R(s, 2)), sysItem(R(x), R(s)), sysItem(R(x + 1), R(k * (x + 1)))]),
    "Vul y = " + k + "x in: x + " + k + "x = " + s + ", dus " + (k + 1) + "x = " + s + " en x = " + x + ". Dan y = " + k + DOT + x + " = " + y + ": x = " + x + ", y = " + y + ".", { smallChoices: true });
};
GEN.aq22 = function() {
  var c = nz(-6, 9), a = rnd(2, 5), x = nz(-6, 9), y = x + c, t = a * x + y;
  return Q("y = " + ptext(Q2(0, 1, c)) + "\n" + lineText(a, 1, t), choose4([sysItem(R(x), R(y)), sysItem(R(y), R(x)), sysItem(R(x), R(x)), sysItem(R(x + 1), R(x + 1 + c)), sysItem(R(t - c, a), R(t - c, a))]),
    "Vul y in: " + a + "x + x " + (c < 0 ? MIN + " " + (-c) : "+ " + c) + " = " + int(t) + ", dus " + (a + 1) + "x = " + int(t - c) + " en x = " + int(x) + ". y = " + int(x) + (c < 0 ? " " + MIN + " " + (-c) : " + " + c) + " = " + int(y) + ": x = " + int(x) + ", y = " + int(y) + ".", { smallChoices: true });
};
GEN.aq23 = function() {
  var x = rnd(1, 12), y = nz(-9, 9);
  if (x === y) return null;
  var S = x + y, Dd = x - y;
  return Q("x + y = " + int(S) + "\nx " + MIN + " y = " + int(Dd), choose4([sysItem(R(x), R(y)), sysItem(R(y), R(x)), sysItem(R(S + Dd), R(-Dd)), sysItem(R(x), R(Dd)), sysItem(R(x), R(-y))]),
    "Tel op: 2x = " + int(S + Dd) + ", dus x = " + x + ". Dan y = " + int(S) + " " + MIN + " " + x + " = " + int(y) + ": x = " + x + ", y = " + int(y) + ".", { smallChoices: true });
};
GEN.aq24 = function() {
  var a1 = rnd(1, 4), b1 = rnd(1, 4), a2 = rnd(1, 4), b2 = rnd(1, 4), x = nz(-5, 6), y = nz(-5, 6);
  if (a1 * b2 - a2 * b1 === 0 || (a1 === 1 && b1 === 1) || (a2 === 1 && b2 === 1)) return null;
  var c1 = a1 * x + b1 * y, c2 = a2 * x + b2 * y;
  return Q(lineText(a1, b1, c1) + "\n" + lineText(a2, b2, c2), choose4([sysItem(R(x), R(y)), sysItem(R(y), R(x)), sysItem(R(x), R(-y)), sysItem(R(-x), R(y)), sysItem(R(x + 1), R(y))]),
    "Maak de y-termen gelijk: eerste " + DOT + " " + b2 + ", tweede " + DOT + " " + b1 + ". Aftrekken: " + (a1 * b2 - a2 * b1) + "x = " + int(c1 * b2 - c2 * b1) + ", dus x = " + int(x) + ". Invullen geeft y = " + int(y) + ": x = " + int(x) + ", y = " + int(y) + ".", { smallChoices: true });
};
GEN.aq25 = function() {
  var p = rnd(1, 4), q = rnd(1, 3), r = rnd(1, 4), s = rnd(1, 3), k = rnd(2, 6), t = rnd(1, 5);
  if (p * s - r * q === 0 || k === t) return null;
  var tot1 = p * k + q * t, tot2 = r * k + s * t;
  var fmt = function(x, y) { return "koffie €" + NB + rtext(x) + ", thee €" + NB + rtext(y); };
  var pos = function(it, x, y) { return x.n > 0 && y.n >= 0 && x.d === 1 && y.d === 1 ? it : null; };
  return Q(p + " koffie + " + q + " thee = €" + NB + tot1 + "\n" + r + " koffie + " + s + " thee = €" + NB + tot2,
    choose4([sysItem(R(k), R(t), fmt), sysItem(R(t), R(k), fmt), pos(sysItem(R(k + 1), R(t - 1), fmt), R(k + 1), R(t - 1)), sysItem(R(k), R(t + 1), fmt), sysItem(R(k + 1), R(t), fmt)]),
    "Stelsel: " + p + "k + " + q + "t = " + tot1 + " en " + r + "k + " + s + "t = " + tot2 + ". Oplossen geeft k = " + k + " en t = " + t + ": koffie €" + NB + k + ", thee €" + NB + t + ".", { smallChoices: true });
};

// ── Blok 5: toepassen en controle ─────────────────────────────────

GEN.aq26 = function() {
  var b = rnd(2, 12), d = rnd(1, 6), A = b * (b + d);
  return Q("Rechthoek: lengte = breedte + " + d + ".\nOppervlakte " + A + ". Breedte?", choose4([numItem(b), numItem(b + d), numItem(-(b + d)), numItem(A - d), numItem(A / 2 === Math.round(A / 2) ? A / 2 : b + 1)]),
    "x(x + " + d + ") = " + A + ", dus " + eq0(Q2(1, d, -A)) + ". Ontbind: " + factText([lf(1, -b), lf(1, b + d)]) + " = 0. x = " + b + " of x = " + int(-(b + d)) + "; een breedte is positief: " + b + ".");
};
GEN.aq27 = function() {
  var mk = [
    function(ok) { var a = rnd(1, 9); return "(x + " + a + ")" + SQ + " = " + ptext(ok ? Q2(1, 2 * a, a * a) : Q2(1, 0, a * a)); },
    function(ok) { var a = rnd(1, 9); return "(x " + MIN + " " + a + ")" + SQ + " = " + ptext(ok ? Q2(1, -2 * a, a * a) : Q2(1, 0, -a * a)); },
    function(ok) { var a = rnd(2, 9); return "(x + " + a + ")(x " + MIN + " " + a + ") = " + ptext(ok ? Q2(1, 0, -a * a) : Q2(1, 0, a * a)); },
    function(ok) { var a = rnd(1, 9), b = rnd(1, 9); return factText([lf(1, a), lf(1, b)]) + " = " + ptext(ok ? Q2(1, a + b, a * b) : Q2(1, 0, a * b)); },
    function(ok) { var a = rnd(2, 6), b = rnd(a + 1, 9); return ptext(Q2(1, a + b, a * b)) + " = " + (ok ? factText([lf(1, a), lf(1, b)]) : factText([lf(1, 1), lf(1, a * b)])); },
    function(ok) { var a = rnd(2, 12); return "x" + SQ + " " + MIN + " " + (a * a) + " = " + (ok ? factText([lf(1, -a), lf(1, a)]) : factText([lf(1, -a), lf(1, -a)])); },
  ];
  var idx = shuffle([0, 1, 2, 3, 4, 5]).slice(0, 4), bad = rnd(0, 3);
  var sums = idx.map(function(m, i) { return mk[m](i !== bad); });
  if (sums.some(function(s, i) { return sums.indexOf(s) !== i; })) return null;
  return { question: "Welke herleiding is FOUT?", answer: sums[bad], choices: shuffle(sums.slice()), smallChoices: true, isErrorSpotter: true,
    terms: ["Fout: " + sums[bad] + ". Let op: (x + a)" + SQ + " = x" + SQ + " + 2ax + a" + SQ + " (niet alleen x" + SQ + " + a" + SQ + "), en (x + a)(x " + MIN + " a) = x" + SQ + " " + MIN + " a" + SQ + "."] };
};
// 28. Fout in de oplossing van x² + Bx = C (vier stappen, precies één fout; de stappen erna volgen consequent)
GEN.aq28 = function() {
  var r1 = nz(-9, 9), r2 = nz(-9, 9);
  if (r1 === r2 || r1 * r2 === 0) return null;
  var B = -(r1 + r2), C = -r1 * r2;
  if (B === 0) return null;
  var good = [eq0(Q2(1, B, -C)), factText([lf(1, -r1), lf(1, -r2)]) + " = 0", ptext(Q2(0, 1, -Math.min(r1, r2))) + " = 0 of " + ptext(Q2(0, 1, -Math.max(r1, r2))) + " = 0", solItem([R(r1), R(r2)]).text];
  var steps = good.slice(), bad = rnd(0, 3), lo = Math.min(r1, r2), hi = Math.max(r1, r2);
  if (bad === 0) { // C vergeten: x² + Bx = 0
    steps[0] = eq0(Q2(1, B, 0)); steps[1] = "x(" + ptext(Q2(0, 1, B)) + ") = 0";
    steps[2] = "x = 0 of " + ptext(Q2(0, 1, B)) + " = 0"; steps[3] = solItem([R(0), R(-B)]).text;
  } else if (bad === 1) { // tekens bij ontbinden omgedraaid
    steps[1] = factText([lf(1, r1), lf(1, r2)]) + " = 0"; steps[2] = ptext(Q2(0, 1, Math.min(r1, r2) === r1 ? r1 : r2)) + " = 0 of " + ptext(Q2(0, 1, Math.max(r1, r2))) + " = 0";
    steps[2] = ptext(Q2(0, 1, lo)) + " = 0 of " + ptext(Q2(0, 1, hi)) + " = 0"; steps[3] = solItem([R(-r1), R(-r2)]).text;
  } else if (bad === 2) { // teken in één factor fout
    steps[2] = ptext(Q2(0, 1, -lo)) + " = 0 of " + ptext(Q2(0, 1, hi)) + " = 0"; steps[3] = solItem([R(lo), R(-hi)]).text;
    if (lo === -hi) return null;
  } else { // één oplossing vergeten
    steps[3] = solItem([R(hi)]).text;
  }
  var labels = steps.map(function(t, i) { return "Stap " + (i + 1) + ": " + t; });
  if (labels.some(function(l, i) { return labels.indexOf(l) !== i; })) return null;
  return { question: "Welke stap is fout?\n" + ptext(Q2(1, B, 0)) + " = " + int(C), answer: labels[bad], choices: labels.slice(), smallChoices: true, isErrorSpotter: true,
    terms: ["Fout is " + labels[bad] + ". Goed is: " + good[bad] + "."] };
};

// ─────────────────────────────────────────────────────────────────
// VAARDIGHEDEN [id, label, groep, desc, strategy, uitleg, voorbeeld, minCorrect, subtypes]
// ─────────────────────────────────────────────────────────────────

var G1 = "Haakjes keer haakjes", G2 = "Ontbinden", G3 = "Kwadratische vergelijkingen", G4 = "Stelsels", G5 = "Toepassen en controle";

var DEFS = [
  ["aq01_haakjes_keer_haakjes", "(x + a)(x + b) uitwerken", G1, "(x + 2)(x + 3) = x" + SQ + " + 5x + 6", "elke term keer elke term",
    "Vermenigvuldig elke term van de eerste haakjes met elke term van de tweede: x" + DOT + "x, x" + DOT + "b, a" + DOT + "x en a" + DOT + "b. Neem daarna de x-termen samen.",
    "(x + 2)(x + 3)\nx" + SQ + " + 3x + 2x + 6 = x" + SQ + " + 5x + 6.", 8, 0],
  ["aq02_met_minnen", "Haakjes met minnen", G1, "(x " + MIN + " 4)(x + 1) = x" + SQ + " " + MIN + " 3x " + MIN + " 4", "tekens meenemen",
    "Werk uit zoals altijd en neem de tekens mee: een min keer een plus geeft min.",
    "(x " + MIN + " 4)(x + 1)\nx" + SQ + " + x " + MIN + " 4x " + MIN + " 4 = x" + SQ + " " + MIN + " 3x " + MIN + " 4.", 8, 0],
  ["aq03_kwadraat_plus", "Kwadraat (x + a)" + SQ, G1, "(x + 3)" + SQ + " = x" + SQ + " + 6x + 9", "merkwaardig product",
    "(x + a)" + SQ + " = (x + a)(x + a) = x" + SQ + " + 2ax + a" + SQ + ". Vergeet de middelste term 2ax niet.",
    "(x + 3)" + SQ + "\nx" + SQ + " + 6x + 9.", 8, 0],
  ["aq04_kwadraat_min", "Kwadraat (x " + MIN + " a)" + SQ, G1, "(x " + MIN + " 5)" + SQ + " = x" + SQ + " " + MIN + " 10x + 25", "merkwaardig product",
    "(x " + MIN + " a)" + SQ + " = x" + SQ + " " + MIN + " 2ax + a" + SQ + ". Het laatste getal is altijd positief: min keer min is plus.",
    "(x " + MIN + " 5)" + SQ + "\nx" + SQ + " " + MIN + " 10x + 25.", 8, 0],
  ["aq05_som_keer_verschil", "(x + a)(x " + MIN + " a)", G1, "(x + 6)(x " + MIN + " 6) = x" + SQ + " " + MIN + " 36", "merkwaardig product",
    "(x + a)(x " + MIN + " a) = x" + SQ + " " + MIN + " a" + SQ + ": de x-termen vallen tegen elkaar weg.",
    "(x + 6)(x " + MIN + " 6)\nx" + SQ + " " + MIN + " 6x + 6x " + MIN + " 36 = x" + SQ + " " + MIN + " 36.", 8, 0],
  ["aq06_getal_voor_x", "Met een getal vóór x", G1, "(2x + 1)(x + 3) = 2x" + SQ + " + 7x + 3", "elke term keer elke term",
    "Ook met een getal vóór x gaat elke term keer elke term: 2x" + DOT + "x = 2x" + SQ + ", 2x" + DOT + "3 = 6x, 1" + DOT + "x = x, 1" + DOT + "3 = 3.",
    "(2x + 1)(x + 3)\n2x" + SQ + " + 6x + x + 3 = 2x" + SQ + " + 7x + 3.", 8, 0],
  ["aq07_som_product", "Ontbinden: som en product", G2, "x" + SQ + " + 5x + 6 = (x + 2)(x + 3)", "som en product",
    "Bij x" + SQ + " + bx + c zoek je twee getallen met product c en som b. Die komen in de haakjes.",
    "x" + SQ + " + 5x + 6\n2 " + DOT + " 3 = 6, 2 + 3 = 5.\n(x + 2)(x + 3).", 8, 0],
  ["aq08_ontbinden_negatief", "Ontbinden met negatieve getallen", G2, "x" + SQ + " " + MIN + " x " + MIN + " 6 = (x " + MIN + " 3)(x + 2)", "som en product",
    "Is het losse getal negatief, dan heeft één van de twee getallen een minteken. De som bepaalt welk.",
    "x" + SQ + " " + MIN + " x " + MIN + " 6\n" + MIN + "3 " + DOT + " 2 = " + MIN + "6, " + MIN + "3 + 2 = " + MIN + "1.\n(x " + MIN + " 3)(x + 2).", 8, 0],
  ["aq09_verschil_kwadraten", "Verschil van kwadraten", G2, "x" + SQ + " " + MIN + " 49 = (x " + MIN + " 7)(x + 7)", "a" + SQ + " " + MIN + " b" + SQ,
    "x" + SQ + " " + MIN + " a" + SQ + " = (x " + MIN + " a)(x + a). Herken het kwadraat: 49 = 7" + SQ + ".",
    "x" + SQ + " " + MIN + " 49\n(x " + MIN + " 7)(x + 7).", 8, 0],
  ["aq10_kwadraat_herkennen", "Kwadraat herkennen", G2, "x" + SQ + " + 6x + 9 = (x + 3)" + SQ, "merkwaardig product",
    "Is het losse getal een kwadraat a" + SQ + " en de middelste term 2ax, dan is het (x + a)" + SQ + " (of (x " + MIN + " a)" + SQ + " bij een min).",
    "x" + SQ + " + 6x + 9\n9 = 3" + SQ + ", 6 = 2 " + DOT + " 3.\n(x + 3)" + SQ + ".", 8, 2],
  ["aq11_x_kwadraat_is", "x" + SQ + " = getal", G3, "x" + SQ + " = 49 geeft x = " + MIN + "7 of x = 7", "twee oplossingen",
    "x" + SQ + " = 49 heeft twee oplossingen: 7 en " + MIN + "7, want (" + MIN + "7)" + SQ + " is ook 49.",
    "x" + SQ + " = 49\nx = " + MIN + "7 of x = 7.", 8, 0],
  ["aq12_product_nul", "Product is nul", G3, "(x " + MIN + " 3)(x + 5) = 0", "een factor is 0",
    "Een product is 0 als een van de factoren 0 is. Maak elke factor apart 0.",
    "(x " + MIN + " 3)(x + 5) = 0\nx = 3 of x = " + MIN + "5.", 8, 0],
  ["aq13_x_buiten_haakjes", "x buiten haakjes", G3, "x" + SQ + " + 4x = 0 geeft x = " + MIN + "4 of x = 0", "x(…) = 0",
    "Zet x buiten haakjes: x(x + 4) = 0. Dan is x = 0 altijd een van de oplossingen.",
    "x" + SQ + " + 4x = 0\nx(x + 4) = 0.\nx = " + MIN + "4 of x = 0.", 8, 0],
  ["aq14_oplossen_ontbinden", "Oplossen door ontbinden", G3, "x" + SQ + " + x " + MIN + " 12 = 0", "ontbinden",
    "Ontbind de linkerkant in twee haakjes en maak dan elke factor 0. Let op het teken: (x " + MIN + " 3) = 0 geeft x = 3.",
    "x" + SQ + " + x " + MIN + " 12 = 0\n(x " + MIN + " 3)(x + 4) = 0.\nx = " + MIN + "4 of x = 3.", 8, 0],
  ["aq15_getal_voor_x2", "Getal vóór x" + SQ, G3, "3x" + SQ + " = 48", "eerst delen",
    "Deel eerst door het getal vóór x" + SQ + ". Daarna twee oplossingen, positief en negatief.",
    "3x" + SQ + " = 48\nx" + SQ + " = 16.\nx = " + MIN + "4 of x = 4.", 8, 0],
  ["aq16_eerst_herleiden", "Eerst herleiden", G3, "x" + SQ + " + 2x = 15", "alles naar links",
    "Breng eerst alles naar één kant, zodat er = 0 staat. Pas dan ontbinden.",
    "x" + SQ + " + 2x = 15\nx" + SQ + " + 2x " + MIN + " 15 = 0.\n(x + 5)(x " + MIN + " 3) = 0.\nx = " + MIN + "5 of x = 3.", 8, 0],
  ["aq17_discriminant", "Discriminant", G3, "D = b" + SQ + " " + MIN + " 4ac", "D uitrekenen",
    "Bij ax" + SQ + " + bx + c = 0 is D = b" + SQ + " " + MIN + " 4ac. D > 0: twee oplossingen, D = 0: één, D < 0: geen.",
    "x" + SQ + " + 4x + 5 = 0\nD = 16 " + MIN + " 20 = " + MIN + "4.\nGeen oplossing.", 8, 0],
  ["aq18_abc_formule", "abc-formule", G3, "2x" + SQ + " " + MIN + " x " + MIN + " 3 = 0", "x = (" + MIN + "b ± √D)/2a",
    "Reken eerst D uit. Dan x = (" + MIN + "b + √D)/2a of x = (" + MIN + "b " + MIN + " √D)/2a.",
    "2x" + SQ + " " + MIN + " x " + MIN + " 3 = 0\nD = 1 + 24 = 25.\nx = (1 ± 5)/4.\nx = " + MIN + "1 of x = 3/2.", 8, 0],
  ["aq19_geen_of_een", "Geen of één oplossing", G3, "x" + SQ + " + 2x + 5 = 0: geen oplossing", "discriminant",
    "Bekijk eerst D. Is D kleiner dan 0, dan is er geen oplossing. Is D = 0, dan is er precies één.",
    "x" + SQ + " + 2x + 5 = 0\nD = 4 " + MIN + " 20 = " + MIN + "16.\nGeen oplossing.", 8, 2],
  ["aq20_welke_x", "Welke x is een oplossing", G3, "Welke x past bij x" + SQ + " " + MIN + " 5x + 6 = 0?", "invullen",
    "Vul elke keuze in. Komt er 0 uit, dan is het een oplossing.",
    "x" + SQ + " " + MIN + " 5x + 6, x = 2\n4 " + MIN + " 10 + 6 = 0. Klopt.", 8, 0],
  ["aq21_stelsel_invullen", "Stelsel: invullen", G4, "y = 2x en x + y = 9", "invullen",
    "Staat er al y = …, vul dat dan in de andere vergelijking in. Dan houd je alleen x over.",
    "y = 2x, x + y = 9\nx + 2x = 9, x = 3, y = 6.", 8, 0],
  ["aq22_stelsel_substitutie", "Stelsel: substitutie", G4, "y = x + 1 en 2x + y = 10", "substitueren",
    "Vervang y in de tweede vergelijking door wat er bij y = … staat. Los x op en reken daarna y uit.",
    "y = x + 1, 2x + y = 10\n2x + x + 1 = 10, x = 3, y = 4.", 8, 0],
  ["aq23_stelsel_optellen", "Stelsel: optellen", G4, "x + y = 10 en x " + MIN + " y = 4", "eliminatie",
    "Tel de vergelijkingen op: de y valt weg. Reken x uit en daarna y.",
    "x + y = 10, x " + MIN + " y = 4\n2x = 14, x = 7, y = 3.", 8, 0],
  ["aq24_stelsel_vermenigvuldigen", "Stelsel: eerst vermenigvuldigen", G4, "2x + y = 7 en x + 3y = 11", "gelijk maken",
    "Vermenigvuldig een of beide vergelijkingen zodat x of y even groot wordt. Trek ze dan af.",
    "2x + y = 7, x + 3y = 11\nEerste " + DOT + " 3: 6x + 3y = 21.\nAftrekken: 5x = 10, x = 2, y = 3.", 8, 0],
  ["aq25_stelsel_verhaal", "Stelsel bij een verhaal", G4, "2 koffie + 1 thee = €" + NB + "8", "stelsel maken",
    "Geef elke onbekende prijs een letter en maak bij elke zin een vergelijking. Los het stelsel op.",
    "2k + t = 8, k + t = 5\nAftrekken: k = 3, t = 2.", 8, 0],
  ["aq26_kwadratisch_verhaal", "Kwadratisch verhaal", G5, "Lengte = breedte + 3, oppervlakte 40", "vergelijking maken",
    "Maak een vergelijking met x (bijvoorbeeld de breedte), los op en kies de oplossing die past: een lengte is positief.",
    "x(x + 3) = 40\nx" + SQ + " + 3x " + MIN + " 40 = 0.\n(x " + MIN + " 5)(x + 8) = 0.\nBreedte 5.", 8, 0],
  ["aq27_fout_herleiden", "Fout spotten", G5, "Welke herleiding is FOUT?", "controleren",
    "Controleer elke herleiding door hem uit te werken. Veelgemaakt: (x + a)" + SQ + " = x" + SQ + " + a" + SQ + " (de middelste term vergeten).",
    "(x + 3)" + SQ + " = x" + SQ + " + 9 is fout: x" + SQ + " + 6x + 9.", 10, 0],
  ["aq28_fout_oplossing", "Fout in de oplossing", G5, "Welke stap is fout?", "stap voor stap",
    "Controleer elke stap: staat alles naar links, kloppen de tekens bij het ontbinden, en zijn beide oplossingen genoemd?",
    "x" + SQ + " = 25\nx = 5 is fout: ook x = " + MIN + "5.", 10, 0],
];

function tipOf(terms) { return terms && terms[0] ? terms[0] : ""; }

// Typen (Kiezen | Typen): vaardigheden waarvan het antwoord altijd één geheel getal is, ook
// negatief. aq20 (welke x past) blijft kiezen: een kwadratische vergelijking heeft vaak twee oplossingen,
// terwijl de keuzes er één tonen. De invoer en het nakijken staan in inputResolve.js en grading.js;
// de vragen zelf veranderen niet. Alle andere vaardigheden blijven kiezen.
var TYPEN = { aq17_discriminant: true, aq26_kwadratisch_verhaal: true };

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

var SKILLS = createSkills("wiskunde_algebra2", RAW_SKILLS);

export var WISK_ALGEBRA2_SKILLS = SKILLS.list;
export var WISK_ALGEBRA2_ORDER  = SKILLS.list.map(function(s) { return s.id; });
export var WISK_ALGEBRA2_GEN    = GEN;
