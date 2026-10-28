// Onderdeel Reizen (groep Praktisch rekenen): skills, volgorde en vaste vraagpools (ontwerp B1).
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Het vraagverloop (rekenmoment, stapels, gemengde ronde) staat in ./flow.js.
// Reizen combineert vaardigheden (snelheid, afstand en tijd; overstappen; kosten; valuta; tijdzones).
// Notatie (B1):
//   snelheid "60 km/u"; afstand "35 km"; tijdstip "9:45"; duur "45 min", "2 uur", "1u15"
//   geld zoals Geld: "€ 5" of "€ 12,50" (intern in centen)
//   koers en tijdsverschil staan altijd in de vraag (geen actuele koersen, geen zomertijdregels)
//   getal + eenheid en "€" + bedrag met een niet-afbrekende spatie (NB)
// Alle vragen op één regel; 36 tekens is een richtlijn (max 43). Elke skill heeft een vaste,
// nagekeken pool en trekt via deckPick. 4 keuzes, precies één goed antwoord.

import { shuffle } from "./helpers.js";
import { registerSkillId, createSkills, createMixer, deckPick } from "./flow.js";

var NB = "\u00a0";
var MIN = "−";
var TIMES = " × ";

var P = {};

function put(id, question, answer, choices, tip, kind) {
  (P[id] || (P[id] = [])).push({ question: question, answer: answer, choices: choices, tip: tip, kind: kind || "kort" });
}

function pad(n) { return n < 10 ? "0" + n : String(n); }
function tijd(t) { var x = ((t % 1440) + 1440) % 1440; return Math.floor(x / 60) + ":" + pad(x % 60); }
function dur(m) {
  if (m < 60) return m + NB + "min";
  if (m % 60 === 0) return (m / 60) + NB + "uur";
  return Math.floor(m / 60) + "u" + pad(m % 60);
}
function kg(v, div) {
  var h = Math.round(v * 100 / div);
  if (Math.abs(h - v * 100 / div) > 1e-9) return null;
  var e = Math.floor(h / 100), r = h % 100;
  if (r === 0) return String(e);
  return e + "," + (r % 10 === 0 ? String(r / 10) : (r < 10 ? "0" + r : String(r)));
}
function eur(c) { var e = Math.floor(c / 100), k = c % 100; return "€" + NB + e + "," + (k < 10 ? "0" : "") + k; }
function eurQ(c) { return c % 100 === 0 ? "€" + NB + (c / 100) : eur(c); }
function km(n) { var s = kg(n, 1); return s === null ? null : s + NB + "km"; }
function kmh(n) { return n + NB + "km/u"; }

// Keuzes: antwoord + kandidaten (uniek in waarde, > 0), aanvullen met reserve ± stap
function pickV(ansV, cands, fmt, step) {
  var out = [fmt(ansV)], seen = {};
  seen[ansV] = true;
  function add(c) { if (out.length >= 4 || typeof c !== "number" || !(c > 0) || seen[c]) return; var s = fmt(c); if (s === null) return; seen[c] = true; out.push(s); }
  cands.forEach(add);
  var st = step || 1;
  for (var k = 1; k < 80 && out.length < 4; k++) { add(ansV + k * st); add(ansV - k * st); }
  return out;
}
function kms(a, c, st) { return pickV(a, c, km, st || 5); }
function durs(a, c, st) { return pickV(a, c, dur, st || 5); }
function euros(a, c, st) { return pickV(a, c, function(x) { return x % 1 === 0 ? eurQ(x) : null; }, st || 100); }
function nums(a, c, st) { return pickV(a, c, function(x) { return kg(x, 1); }, st || 1); }
function tijden(a, c) {
  var out = [tijd(a)];
  function add(x) { if (out.length < 4 && typeof x === "number" && out.indexOf(tijd(x)) < 0) out.push(tijd(x)); }
  c.forEach(add);
  for (var k = 1; k < 30 && out.length < 4; k++) { add(a + k * 10); add(a - k * 10); }
  return out;
}
function kmhs(a, c, st) { return pickV(a, c, function(x) { return x % 1 === 0 ? kmh(x) : null; }, st || 5); }

// ── Blok 1: afstand en route ──────────────────────────────────────
(function() {
  [[12, 18], [25, 37], [14, 9], [48, 26], [33, 19], [7, 16], [55, 45], [28, 34], [16, 27], [41, 38]].forEach(function(p) {
    var s = p[0] + p[1];
    put("r01", "A-B " + p[0] + " km, B-C " + p[1] + " km: samen?", km(s), kms(s, [Math.abs(p[0] - p[1]), s + 10, s - 10]),
      "Tel de stukken op: " + p[0] + " + " + p[1] + " = " + s + " km.");
  });
  [[12, 18, 9], [25, 14, 31], [8, 17, 23], [40, 35, 15], [6, 12, 19]].forEach(function(p) {
    var s = p[0] + p[1] + p[2];
    put("r01", p[0] + " km + " + p[1] + " km + " + p[2] + " km = ?", km(s), kms(s, [p[0] + p[1], s + 10, s - 10]),
      "Tel alle stukken op: " + p[0] + " + " + p[1] + " + " + p[2] + " = " + s + " km.");
  });
  [35, 18, 42, 27, 65, 120, 9, 48, 75, 14].forEach(function(a) {
    put("r02", "Enkele reis " + a + " km. Heen en terug?", km(2 * a), kms(2 * a, [a, 3 * a, 2 * a + 10]),
      "Heen " + a + " km en terug " + a + " km: 2" + TIMES + a + " = " + 2 * a + " km.");
  });
  [[120, 3], [90, 2], [150, 5], [84, 4], [96, 3], [140, 4], [75, 3], [180, 6], [60, 4], [210, 7]].forEach(function(p) {
    var d = p[0] / p[1];
    put("r03", "Tocht " + p[0] + " km in " + p[1] + " dagen. Per dag?", km(d), kms(d, [p[0] * p[1], p[0] - p[1], p[0] / (p[1] - 1) % 1 === 0 ? p[0] / (p[1] - 1) : d + 10]),
      "Eerlijk verdelen: " + p[0] + " : " + p[1] + " = " + d + " km per dag.");
  });
  [[120, 35], [80, 27], [150, 64], [95, 38], [200, 115], [64, 19], [130, 75], [110, 48], [75, 26], [160, 84]].forEach(function(p) {
    var r = p[0] - p[1], borrow = (Math.floor(p[0] / 10) - Math.floor(p[1] / 10)) * 10 + Math.abs(p[0] % 10 - p[1] % 10);
    put("r04", "Route " + p[0] + " km, " + p[1] + " km gedaan. Nog?", km(r), kms(r, [p[0] + p[1], borrow !== r ? borrow : null, p[1]]),
      p[0] + " " + MIN + " " + p[1] + " = " + r + " km nog te gaan.");
  });
  [[14, 9, 11, 13], [8, 15, 12, 10], [21, 7, 16, 14], [13, 18, 25, 4], [9, 9, 6, 13], [17, 12, 20, 11], [6, 22, 15, 15], [24, 11, 18, 19]].forEach(function(p) {
    var a = p[0] + p[1], b = p[2] + p[3], k = Math.min(a, b);
    if (a === b) return;
    put("r05", "Route " + p[0] + "+" + p[1] + " km of " + p[2] + "+" + p[3] + " km: kortste?", km(k), kms(k, [Math.max(a, b), Math.abs(a - b), Math.max(p[0], p[1], p[2], p[3])]),
      "Route 1: " + a + " km. Route 2: " + b + " km. De kortste is " + k + " km.");
  });
})();

// ── Blok 2: snelheid, afstand, tijd ───────────────────────────────
(function() {
  [[60, 2], [80, 3], [50, 4], [15, 2], [100, 3], [70, 2], [20, 3], [90, 2], [45, 4], [12, 5]].forEach(function(p) {
    var d = p[0] * p[1];
    put("r06", kmh(p[0]) + ", " + p[1] + " uur. Afstand?", km(d), kms(d, [p[0] / p[1] % 1 === 0 ? p[0] / p[1] : null, p[0] + p[1], p[0] * (p[1] + 1)]),
      "Elk uur " + p[0] + " km. " + p[1] + " uur: " + p[1] + TIMES + p[0] + " = " + d + " km.");
  });
  [[120, 60], [240, 80], [150, 50], [45, 15], [300, 100], [140, 70], [60, 20], [180, 90], [36, 12], [200, 50]].forEach(function(p) {
    var h = p[0] / p[1];
    put("r07", p[0] + " km bij " + kmh(p[1]) + ". Hoe lang?", dur(h * 60), durs(h * 60, [h * 60 + 60, h * 60 - 60, h], 60),
      "Elk uur " + p[1] + " km. " + p[0] + " : " + p[1] + " = " + h + " uur.");
  });
  // r08: halve uren. 1u30 = 1,5 uur (niet 1,3). Afleiders: 1,3 uur, alleen het hele uur, een uur te veel
  [[90, 90], [60, 90], [40, 150], [80, 90], [100, 150], [20, 150], [70, 90], [50, 150]].forEach(function(p) {
    var d = p[0] * p[1] / 60, h = Math.floor(p[1] / 60);
    put("r08", kmh(p[0]) + ", " + dur(p[1]) + ". Afstand?", km(d), kms(d, [p[0] * (h + 0.3) % 1 === 0 ? p[0] * (h + 0.3) : null, p[0] * h, p[0] * (h + 1)]),
      dur(p[1]) + " = " + kg(p[1], 60) + " uur. " + kg(p[1], 60) + TIMES + p[0] + " = " + d + " km.");
  });
  [[45, 30], [30, 20], [135, 90], [75, 50], [150, 60], [25, 10], [105, 70], [225, 90]].forEach(function(p) {
    var m = p[0] / p[1] * 60;
    put("r08", p[0] + " km bij " + kmh(p[1]) + ". Hoe lang?", dur(m), durs(m, [Math.floor(m / 60) * 60 + 50, m + 30, m - 30], 15),
      p[0] + " : " + p[1] + " = " + kg(m, 60) + " uur = " + dur(m) + " (een half uur is 30 min, niet 50).");
  });
  // r09: snelheid uit minuten. Eerst de minuten als deel van een uur: 30 min = 1/2 (× 2), 15 min = 1/4 (× 4),
  // 20 min = 1/3 (× 3), 10 min = 1/6 (× 6). Afleiders: niet omgerekend, opgeteld, de helft (verkeerde factor)
  [[30, 25], [30, 40], [30, 15], [15, 20], [15, 5], [15, 12], [20, 30], [20, 10], [10, 15], [10, 5]].forEach(function(p) {
    var f = 60 / p[0], v = p[1] * f, frac = { 30: "1/2", 15: "1/4", 20: "1/3", 10: "1/6" }[p[0]];
    put("r09", p[1] + " km in " + p[0] + " min. Snelheid?", kmh(v), kmhs(v, [p[1], p[1] + p[0], v / 2]),
      p[0] + " min = " + frac + " uur. In 1 uur dus " + f + TIMES + p[1] + " = " + v + " km: " + v + " km/u.");
  });
  [[15, 5], [20, 4], [60, 15], [100, 20], [30, 6], [80, 20], [24, 6], [90, 15]].forEach(function(p) {
    var k = p[0] / p[1];
    put("r10", kmh(p[0]) + " of " + kmh(p[1]) + ": hoeveel keer?", String(k), nums(k, [p[0] - p[1], p[0] + p[1], p[0] * p[1] <= 99999 ? p[0] * p[1] : null]),
      p[0] + " : " + p[1] + " = " + k + ". Dus " + k + " keer zo snel.");
  });
})();

// ── Blok 3: plannen ───────────────────────────────────────────────
(function() {
  [[9, 30, 120, 60], [8, 15, 150, 50], [10, 45, 90, 60], [13, 20, 160, 80], [7, 50, 180, 60], [14, 10, 45, 30], [11, 40, 100, 40], [16, 25, 60, 40]].forEach(function(p) {
    var S = p[0] * 60 + p[1], m = p[2] / p[3] * 60, E = S + m;
    put("r11", "Weg " + tijd(S) + ", " + p[2] + " km bij " + kmh(p[3]) + ". Aan?", tijd(E), tijden(E, [E + 60, E - 30, E + 30]),
      "Reistijd: " + p[2] + " : " + p[3] + " = " + dur(m) + ". " + tijd(S) + " + " + dur(m) + " = " + tijd(E) + ".");
  });
  // r12: vertrektijd terugrekenen. Afleiders: opgeteld in plaats van afgetrokken, rekenen alsof een uur 100 minuten heeft
  [[14, 0, 105], [9, 0, 50], [12, 30, 85], [16, 15, 100], [11, 10, 45], [18, 0, 135], [10, 20, 75], [15, 5, 70]].forEach(function(p) {
    var T = p[0] * 60 + p[1], D = p[2], S = T - D;
    var h100 = p[0] * 100 + p[1] - (Math.floor(D / 60) * 100 + D % 60), wrong = Math.floor(h100 / 100) * 60 + h100 % 100;
    put("r12", "Om " + tijd(T) + " er zijn, reis " + dur(D) + ". Weg?", tijd(S), tijden(S, [T + D, h100 % 100 < 60 && wrong !== S ? wrong : null, S + 10]),
      "Reken terug: " + tijd(T) + " " + MIN + " " + dur(D) + " = " + tijd(S) + ".");
  });
  [[135, 30], [90, 20], [150, 45], [75, 15], [110, 25], [200, 40], [95, 30], [165, 20]].forEach(function(p) {
    var t = p[0] + p[1];
    put("r13", dur(p[0]) + " fietsen + " + dur(p[1]) + " pauze: totaal?", dur(t), durs(t, [p[0], t + 10, t - 10]),
      "Tel de pauze erbij: " + dur(p[0]) + " + " + dur(p[1]) + " = " + dur(t) + ".");
  });
  // r14: overstaptijd over het hele uur heen. Afleider: rekenen alsof een uur 100 minuten heeft
  [[10, 52, 11, 5], [9, 47, 10, 3], [14, 55, 15, 10], [8, 40, 8, 52], [12, 50, 13, 2], [16, 45, 17, 5], [11, 38, 11, 54], [7, 56, 8, 9]].forEach(function(p) {
    var d = (p[2] * 60 + p[3]) - (p[0] * 60 + p[1]), w = (p[2] * 100 + p[3]) - (p[0] * 100 + p[1]);
    put("r14", "Trein aan " + p[0] + ":" + pad(p[1]) + ", bus " + p[2] + ":" + pad(p[3]) + ". Overstap?", dur(d), durs(d, [w !== d ? w : null, d + 10, d - 5 > 0 ? d - 5 : d + 20], 1),
      (p[0] === p[2] ? "" : "Tot " + p[2] + ":00 is " + (60 - p[1]) + " min, dan nog " + p[3] + " min. ") + "Samen " + d + " min.");
  });
})();

// ── Blok 4: dienstregeling ────────────────────────────────────────
(function() {
  [[9, 47, [15, 50]], [10, 12, [5, 35]], [8, 28, [20, 40]], [11, 52, [10, 45]], [13, 33, [0, 30]], [7, 41, [15, 45]], [15, 18, [10, 25]], [16, 55, [5, 50]]].forEach(function(p) {
    var A = p[0] * 60 + p[1], all = [];
    for (var h = p[0] - 1; h <= p[0] + 1; h++) p[2].forEach(function(m) { all.push(h * 60 + m); });
    all.sort(function(a, b) { return a - b; });
    var nxt = all.filter(function(x) { return x >= A; })[0], prev = all.filter(function(x) { return x < A; }).pop(), after = all.filter(function(x) { return x > nxt; })[0];
    put("r15", "Aan " + tijd(A) + ". Bus :" + pad(p[2][0]) + " en :" + pad(p[2][1]) + ". Welke?", tijd(nxt), tijden(nxt, [prev, after, nxt + 60]),
      "De bus gaat om :" + pad(p[2][0]) + " en :" + pad(p[2][1]) + ". De eerste na " + tijd(A) + " is " + tijd(nxt) + ".");
  });
  // r16: reistijd uit vertrek en aankomst. Afleider: uren en minuten los afgetrokken zonder lenen
  [[8, 47, 10, 13], [9, 35, 11, 20], [7, 50, 9, 5], [13, 40, 15, 15], [10, 55, 12, 30], [14, 25, 17, 10], [6, 48, 8, 2], [11, 36, 13, 21]].forEach(function(p) {
    var d = (p[2] * 60 + p[3]) - (p[0] * 60 + p[1]), nb = (p[2] - p[0]) * 60 + Math.abs(p[3] - p[1]);
    put("r16", "Trein " + p[0] + ":" + pad(p[1]) + " tot " + p[2] + ":" + pad(p[3]) + ". Reistijd?", dur(d), durs(d, [nb !== d ? nb : null, d + 10, d - 10]),
      "Tot " + (p[0] + 1) + ":00 is " + (60 - p[1]) + " min, dan tot " + p[2] + ":" + pad(p[3]) + ". Samen " + dur(d) + ".");
  });
  // r17: laatste trein die op tijd is. Treinen om :05 en :35; antwoord = laatste vertrek ≤ deadline − reistijd
  [[11, 0, 50], [9, 30, 40], [14, 0, 70], [16, 30, 45], [10, 15, 35], [12, 45, 55], [8, 50, 30], [15, 20, 60]].forEach(function(p) {
    var T = p[0] * 60 + p[1], L = T - p[2], best = null;
    for (var x = L - 120; x <= L; x++) { if (x % 60 === 5 || x % 60 === 35) best = x; }
    put("r17", "Reis " + dur(p[2]) + ", om " + tijd(T) + " er. Laatste trein?", tijd(best), tijden(best, [best + 30, best + 10 > L ? best + 10 : best + 40, best - 30]),
      tijd(T) + " " + MIN + " " + dur(p[2]) + " = " + tijd(L) + ". De laatste trein vóór " + tijd(L) + " (:05 en :35) is " + tijd(best) + ".");
  });
  [[40, 12, 25], [55, 8, 35], [30, 15, 20], [45, 10, 50], [65, 7, 20], [25, 18, 40], [50, 5, 30], [35, 14, 45]].forEach(function(p) {
    var t = p[0] + p[1] + p[2];
    put("r18", p[0] + " min trein, " + p[1] + " wachten, " + p[2] + " bus: totaal?", dur(t), durs(t, [p[0] + p[2], t + 10, t - 10]),
      "Tel alles op, ook het wachten: " + p[0] + " + " + p[1] + " + " + p[2] + " = " + t + " min = " + dur(t) + ".");
  });
})();

// ── Blok 5: reiskosten ────────────────────────────────────────────
(function() {
  [[2, 1200, 3, 600], [2, 900, 2, 450], [1, 1500, 3, 750], [2, 1100, 1, 550], [2, 800, 4, 400], [1, 2000, 2, 1000], [2, 1350, 2, 700], [3, 1000, 2, 500]].forEach(function(p) {
    var t = p[0] * p[1] + p[2] * p[3];
    put("r19", p[0] + TIMES + eurQ(p[1]) + " en " + p[2] + TIMES + eurQ(p[3]) + ": totaal?", eurQ(t), euros(t, [p[1] + p[3], p[2] * p[1] + p[0] * p[3], (p[0] + p[2]) * p[1]], 50),
      p[0] + TIMES + eurQ(p[1]) + " = " + eurQ(p[0] * p[1]) + " en " + p[2] + TIMES + eurQ(p[3]) + " = " + eurQ(p[2] * p[3]) + ". Samen " + eurQ(t) + ".");
  });
  // r20: kosten per km (centen). Afleiders: komma een plaats verschoven (twee kanten), gedeeld in plaats van keer
  [[150, 20], [200, 25], [80, 50], [120, 30], [250, 20], [60, 40], [300, 15], [90, 20]].forEach(function(p) {
    var c = p[0] * p[1];
    put("r20", p[0] + " km, " + eurQ(p[1]) + " per km: kosten?", eurQ(c), euros(c, [c / 10, c * 10, p[0] / p[1] * 100 % 1 === 0 ? p[0] / p[1] * 100 : null], 100),
      p[0] + TIMES + eurQ(p[1]) + " = " + eurQ(c) + ".");
  });
  // r21: liters. Verbruik "1 l per 15 km": liters = afstand : km per liter.
  // Afleiders: vermenigvuldigd in plaats van gedeeld, de afstand als liters, het verbruik als liters
  [[300, 15], [240, 12], [450, 15], [200, 20], [360, 18], [150, 15], [480, 16], [210, 14]].forEach(function(p) {
    var l = p[0] / p[1];
    put("r21", p[0] + " km, 1 l per " + p[1] + " km: liters?", l + NB + "l", pickV(l, [p[0] * p[1] <= 99999 ? p[0] * p[1] : null, p[0], p[1]], function(x) { return x % 1 === 0 ? x + NB + "l" : null; }, 5),
      "Elke " + p[1] + " km kost 1 liter. " + p[0] + " : " + p[1] + " = " + l + " liter.");
  });
  // r22: kosten bij gegeven liters. Afleiders: opgeteld, gedeeld, de liters als euro's
  [[20, 200], [15, 200], [30, 150], [25, 200], [40, 150], [12, 250], [18, 200], [24, 150]].forEach(function(p) {
    var c = p[0] * p[1];
    put("r22", p[0] + " l, " + eurQ(p[1]) + " per liter: kosten?", eurQ(c), euros(c, [p[0] * 100 + p[1], p[0] * 100 / (p[1] / 100) % 1 === 0 ? p[0] * 100 / (p[1] / 100) : null, p[0] * 100], 100),
      p[0] + TIMES + eurQ(p[1]) + " = " + eurQ(c) + ".");
  });
  [[6000, 4], [4500, 3], [8000, 5], [3600, 4], [7200, 6], [5000, 4], [9000, 6], [2400, 3]].forEach(function(p) {
    var c = p[0] / p[1];
    put("r23", "Reis " + eurQ(p[0]) + " met " + p[1] + " personen: elk?", eurQ(c), euros(c, [p[0] * p[1] <= 9999900 ? p[0] * p[1] : null, p[0] - p[1] * 100, p[0] / (p[1] - 1) % 1 === 0 ? p[0] / (p[1] - 1) : null], 50),
      eurQ(p[0]) + " : " + p[1] + " = " + eurQ(c) + " per persoon.");
  });
})();

// ── Blok 6: valuta (koers altijd in de vraag) ─────────────────────
(function() {
  // Munten die bestaan, met een afgeronde koers (lei ongeveer 5,3; lira ongeveer 55 in 2026)
  var CUR = [["kronen", 10], ["dirham", 4], ["lira", 50], ["lei", 5], ["zloty", 4], ["kronen", 10], ["lira", 50], ["dirham", 4]];
  [15, 8, 25, 12, 30, 20, 45, 7].forEach(function(e, i) {
    var c = CUR[i], v = e * c[1];
    put("r24", "€ 1 = " + c[1] + " " + c[0] + ". € " + e + " = ? " + c[0], String(v), nums(v, [e / c[1] % 1 === 0 ? e / c[1] : null, e + c[1], v * 10], 1),
      "Elke euro is " + c[1] + " " + c[0] + ". " + e + TIMES + c[1] + " = " + v + " " + c[0] + ".");
  });
  [80, 36, 1500, 60, 120, 18, 2500, 140].forEach(function(v, i) {
    var c = CUR[i], e = v / c[1];
    if (e % 1 !== 0) return;
    // Bij een hoge koers (lira) zijn "keer de koers" en "koers erbij/eraf" onzinbedragen; dan de
    // echte vergissingen: een nul te veel of te weinig, of gedeeld door 100 in plaats van 50
    var wrong = c[1] >= 50 ? [e * 1000, e * 10, v] : [v * c[1] * 100, (v - c[1]) * 100, (v + c[1]) * 100];
    put("r25", "€ 1 = " + c[1] + " " + c[0] + ". " + v + " " + c[0] + " = €" + NB + "?", eurQ(e * 100), euros(e * 100, wrong, 100),
      c[1] + " " + c[0] + " is " + eurQ(100) + ". " + v + " : " + c[1] + " = " + eurQ(e * 100) + ".");
  });
  // r26: goedkoopste van drie prijzen in verschillende munten; verschil steeds minstens € 0,20
  [["kronen", 10, 45, 500, 52], ["dirham", 4, 18, 400, 22], ["lira", 50, 225, 500, 275], ["lei", 5, 30, 550, 26], ["zloty", 4, 22, 500, 18], ["kronen", 10, 65, 600, 72]].forEach(function(p) {
    var a = p[2] * 100 / p[1], b = p[3], c = p[4] * 100 / p[1];
    var opts = [p[2] + " " + p[0], eurQ(b), p[4] + " " + p[0]], vals = [a, b, c], mn = Math.min.apply(null, vals);
    put("r26", "€ 1 = " + p[1] + " " + p[0] + ". Wat is goedkoopst?", opts[vals.indexOf(mn)], opts.concat(["even duur"]),
      "Alles in euro: " + opts.map(function(o, i) { return o + " = " + eurQ(vals[i]); }).join(", ") + ".", "lang");
  });
})();

// ── Blok 7: tijdzones (verschil altijd in de vraag) ───────────────
(function() {
  var Z = [["Londen", -1], ["Lissabon", -1], ["New York", -6], ["Athene", 1], ["Helsinki", 1]];
  [[14, 0, 0], [9, 30, 2], [16, 15, 3], [11, 45, 1], [20, 0, 4], [8, 30, 0], [13, 15, 2], [18, 45, 3]].forEach(function(p) {
    var z = Z[p[2]], T = p[0] * 60 + p[1], L = T + z[1] * 60;
    var rel = z[1] < 0 ? (-z[1]) + " uur vroeger" : z[1] + " uur later";
    put("r27", "Hier " + tijd(T) + ". " + z[0] + " " + rel + ". Daar?", tijd(L), tijden(L, [T - z[1] * 60, T, L + (z[1] < 0 ? -60 : 60)]),
      z[0] + " is " + rel + ": " + tijd(T) + (z[1] < 0 ? " " + MIN + " " : " + ") + Math.abs(z[1]) + " uur = " + tijd(L) + ".");
  });
  // r28: lokale aankomsttijd. Reistijd (verstreken) is iets anders dan de kloktijd daar.
  // Afleiders: verschil vergeten, verschil de verkeerde kant op, vliegtijd vergeten
  [[10, 0, 90, 0], [8, 30, 480, 2], [14, 15, 180, 3], [9, 45, 120, 1], [11, 0, 510, 2], [15, 30, 210, 4], [7, 20, 100, 0], [12, 10, 165, 3]].forEach(function(p) {
    var z = Z[p[3]], S = p[0] * 60 + p[1], E = S + p[2] + z[1] * 60;
    var rel = z[1] < 0 ? (-z[1]) + " uur vroeger" : z[1] + " uur later", sgn = (z[1] < 0 ? MIN : "+") + Math.abs(z[1]) + " u";
    put("r28", "Om " + tijd(S) + " " + dur(p[2]) + " vliegen, " + z[0] + " " + sgn + ". Daar?", tijd(E), tijden(E, [S + p[2], S + p[2] - z[1] * 60, S + z[1] * 60]),
      "Eerst de vliegtijd: " + tijd(S) + " + " + dur(p[2]) + " = " + tijd(S + p[2]) + " (onze tijd). " + z[0] + " is " + rel + ": " + tijd(E) + " daar. De reis duurde gewoon " + dur(p[2]) + ".");
  });
  // r29: over middernacht. Kloktijd na middernacht en verstreken tijd over middernacht
  [[22, 30, 120, 1], [23, 15, 90, 0], [21, 40, 180, 0], [23, 0, 150, 1], [22, 50, 75, 0], [20, 30, 270, 1]].forEach(function(p) {
    var S = p[0] * 60 + p[1], E = S + p[2] + p[3] * 60;
    put("r29", "Om " + tijd(S) + " " + dur(p[2]) + " reizen" + (p[3] ? ", daar +1 u" : "") + ". Aan?", tijd(E), tijden(E, [S + p[2] - p[3] * 60 !== E ? S + p[2] - p[3] * 60 : null, E - 60 * (p[3] ? 2 : 1), E + 60]),
      tijd(S) + " + " + dur(p[2]) + (p[3] ? " + 1 uur verschil" : "") + ": na middernacht begint de klok weer bij 0:00. Aan: " + tijd(E) + ".");
  });
  [[23, 0, 1, 15], [22, 40, 0, 20], [23, 30, 2, 5], [21, 50, 0, 35], [22, 15, 1, 45], [23, 45, 0, 30]].forEach(function(p) {
    var d = (24 * 60 + p[2] * 60 + p[3]) - (p[0] * 60 + p[1]);
    put("r29", "Weg " + p[0] + ":" + pad(p[1]) + ", aan " + p[2] + ":" + pad(p[3]) + ". Reistijd?", dur(d), durs(d, [d + 60, d - 30 > 0 ? d - 30 : d + 30, p[2] * 60 + p[3] !== d ? p[2] * 60 + p[3] : null]),
      "Tot middernacht is " + dur(24 * 60 - (p[0] * 60 + p[1])) + ", daarna nog " + dur(p[2] * 60 + p[3]) + ". Samen " + dur(d) + ".");
  });
})();

// ── Blok 8: fietskaart ────────────────────────────────────────────
(function() {
  // r30: schaal 1 : 25 000 en 1 : 50 000. cm op de kaart × schaal = cm in het echt; dan naar m of km
  [[50000, 4, "km"], [50000, 6, "km"], [50000, 3, "km"], [50000, 10, "km"], [25000, 8, "km"], [25000, 4, "km"], [25000, 12, "km"], [25000, 6, "km"],
   [25000, 2, "m"], [25000, 3, "m"], [50000, 1, "m"], [50000, 5, "m"]].forEach(function(p) {
    var realCm = p[1] * p[0], div = p[2] === "km" ? 100000 : 100, v = realCm / div;
    var f = function(x) { var s = kg(Math.round(x * 100), 100); return s === null ? null : s + NB + p[2]; };
    put("r30", "Schaal 1" + NB + ":" + NB + (p[0] === 50000 ? "50" : "25") + NB + "000. " + p[1] + " cm = ? " + p[2], f(v), pickV(v, [v * 10, v / 10, p[1]], f, p[2] === "km" ? 1 : 100),
      p[1] + " cm" + TIMES + (p[0] === 50000 ? "50 000" : "25 000") + " = " + realCm + " cm = " + kg(Math.round(v * 100), 100) + " " + p[2] + ".");
  });
  // r31: fietssnelheid als de pauze eraf gaat. Afleiders: pauze meegerekend, de afstand, de pauze opgeteld
  [[60, 3, 1], [45, 4, 1], [80, 5, 1], [36, 4, 1], [90, 4, 1], [50, 3, 1], [75, 6, 1], [40, 3, 1]].forEach(function(p) {
    var v = p[0] / (p[1] - p[2]);
    put("r31", p[0] + " km in " + p[1] + " uur, " + p[2] + " uur pauze. Km/u?", kmh(v), kmhs(v, [p[0] / p[1] % 1 === 0 ? p[0] / p[1] : null, p[0], p[0] / (p[1] + p[2]) % 1 === 0 ? p[0] / (p[1] + p[2]) : null], 5),
      "Echt gefietst: " + p[1] + " " + MIN + " " + p[2] + " = " + (p[1] - p[2]) + " uur. " + p[0] + " : " + (p[1] - p[2]) + " = " + v + " km/u.");
  });
  // r32: hoe ver als er een pauze tussen zit. Afleiders: pauze vergeten, alleen 1 uur, pauze als extra
  [[20, 3, 1], [15, 4, 1], [18, 3, 1], [12, 5, 1], [25, 3, 1], [16, 4, 1], [14, 5, 1], [22, 3, 1]].forEach(function(p) {
    var d = p[0] * (p[1] - p[2]);
    put("r32", kmh(p[0]) + ", " + p[1] + " uur weg, " + p[2] + " uur pauze. Ver?", km(d), kms(d, [p[0] * p[1], p[0], p[0] * (p[1] + p[2])]),
      "Echt gefietst: " + (p[1] - p[2]) + " uur. " + (p[1] - p[2]) + TIMES + p[0] + " = " + d + " km.");
  });
})();

// ── Blok 9: toepassen ─────────────────────────────────────────────
(function() {
  // r33: reistijd schatten; eerlijk: de echte uitkomst ligt het dichtst bij het goede antwoord
  [[118, 59], [179, 61], [241, 79], [149, 51], [302, 99], [61, 29], [208, 69], [96, 31]].forEach(function(p) {
    var e = Math.round(p[0] / p[1]), ex = p[0] / p[1];
    put("r33", "Ongeveer: " + p[0] + " km bij " + kmh(p[1]) + " ≈ ?", dur(e * 60), [e, e + 1, e - 1 > 0 ? e - 1 : e + 2, e + (e - 1 > 0 ? 2 : 3)].map(function(x) { return dur(x * 60); }),
      "Rond af: " + p[0] + " is ongeveer " + (Math.round(p[0] / 10) * 10) + " en " + p[1] + " ongeveer " + (Math.round(p[1] / 10) * 10) + ". Dat is ongeveer " + e + " uur.");
  });
  // r34: kort verhaal in twee stappen
  [[240, 16, 200], [300, 15, 200], [180, 12, 150], [320, 16, 200], [225, 15, 200], [280, 14, 150]].forEach(function(p) {
    var l = p[0] / p[1], c = l * p[2];
    put("r34", p[0] + " km, 1 l per " + p[1] + " km, " + eurQ(p[2]) + "/l: kosten?", eurQ(c), euros(c, [l * 100, p[0] * p[2] / 10 % 1 === 0 ? p[0] * p[2] / 10 : null, c * 2], 100),
      "Eerst liters: " + p[0] + " : " + p[1] + " = " + l + " l. Dan " + l + TIMES + eurQ(p[2]) + " = " + eurQ(c) + ".");
  });
  // Groepsreis retour, twee stappen: retour = 2 × enkel, dan × aantal personen. Telkens een andere
  // volgorde van de gegevens. Afleiders: alleen enkel voor de groep, retour voor één persoon, opgeteld
  [["A", 1200, 3], ["B", 800, 4], ["C", 650, 5], ["D", 1100, 6]].forEach(function(p) {
    var e = p[1], n = p[2], t = 2 * e * n;
    var q = p[0] === "A" ? "Kaartje " + eurQ(e) + " enkel. " + n + " personen, retour?"
          : p[0] === "B" ? n + " personen gaan retour. Enkel " + eurQ(e) + ". Samen?"
          : p[0] === "C" ? "Retour voor " + n + " personen, enkel " + eurQ(e) + "?"
          : "Enkel " + eurQ(e) + ". Met " + n + " personen heen en terug?";
    put("r34", q, eurQ(t), euros(t, [e * n, 2 * e, e + n * 100], 100),
      "Eerst retour voor 1 persoon: 2" + TIMES + eurQ(e) + " = " + eurQ(2 * e) + ". Dan voor " + n + " personen: " + n + TIMES + eurQ(2 * e) + " = " + eurQ(t) + ".");
  });
  // r35: fout spotten
  var GOOD = [], BAD = [];
  [[60, 2], [80, 3], [50, 4], [90, 2]].forEach(function(p) { var g = p[0] + " km/u, " + p[1] + " uur = " + p[0] * p[1] + " km"; GOOD.push(g); BAD.push([p[0] + " km/u, " + p[1] + " uur = " + (p[0] + p[1]) + " km", g]); });
  [[1, 30, "1,5"], [2, 30, "2,5"], [3, 30, "3,5"]].forEach(function(p) { var g = p[0] + "u" + p[1] + " = " + p[2] + " uur"; GOOD.push(g); BAD.push([p[0] + "u" + p[1] + " = " + p[0] + ",3 uur", g]); });
  [[90, 60, "1u30"], [150, 100, "1u30"], [45, 30, "1u30"]].forEach(function(p) { var g = p[0] + " km, " + p[1] + " km/u = " + p[2]; GOOD.push(g); BAD.push([p[0] + " km, " + p[1] + " km/u = 1u50", g]); });
  [[15, "1/4"], [30, "1/2"], [20, "1/3"]].forEach(function(p) { var g = p[0] + " min = " + p[1] + " uur"; GOOD.push(g); BAD.push([p[0] + " min = 0," + p[0] + " uur", g]); });
  BAD.forEach(function(b, i) {
    var g3 = [], k = i * 7 + 3;
    for (var t = 0; t < GOOD.length && g3.length < 3; t++) { var g = GOOD[(k + t * 5) % GOOD.length]; if (g !== b[1] && g3.indexOf(g) < 0) g3.push(g); }
    put("r35", "Welke is FOUT?", b[0], [b[0]].concat(g3), "Goed is: " + b[1] + ".", "fout");
  });
  // r36: beste keuze met een criterium; antwoord is de waarde van de beste keuze
  [[30, 15, 105], [24, 12, 150], [40, 20, 135], [36, 12, 165], [45, 15, 200], [20, 10, 90]].forEach(function(p) {
    var f = p[0] / p[1] * 60, best = Math.min(f, p[2]);
    put("r36", p[0] + " km: fiets " + kmh(p[1]) + " of bus " + dur(p[2]) + ". Snelste?", dur(best), durs(best, [Math.max(f, p[2]), Math.abs(f - p[2]), f + p[2]], 15),
      "Fiets: " + p[0] + " : " + p[1] + " = " + dur(f) + ". Bus: " + dur(p[2]) + ". De snelste duurt " + dur(best) + ".");
  });
  [[100, 20, 1800], [150, 15, 2000], [80, 25, 2200], [120, 20, 2600], [200, 10, 1700], [60, 30, 2000]].forEach(function(p) {
    var a = p[0] * p[1], best = Math.min(a, p[2]);
    put("r36", p[0] + " km: auto " + eurQ(p[1]) + "/km of trein " + eurQ(p[2]) + ". Goedkoopst?", eurQ(best), euros(best, [Math.max(a, p[2]), Math.abs(a - p[2]), a + p[2]], 100),
      "Auto: " + p[0] + TIMES + eurQ(p[1]) + " = " + eurQ(a) + ". Trein: " + eurQ(p[2]) + ". Het goedkoopst is " + eurQ(best) + ".");
  });
})();

// Niet-afbrekende spatie tussen getal en eenheid en na "€" in vragen en (niet fout-spot) keuzes
var UNIT_RE = /(\d) (km\/u|km|min|uur|u|l|cm|m|kronen|dirham|lira|lei|zloty|dagen|personen)(?=[\s:.?,\/]|$)/g;
var EUR_RE = /€ (\d)/g;
Object.keys(P).forEach(function(id) { P[id].forEach(function(it) {
  it.question = it.question.replace(UNIT_RE, "$1" + NB + "$2").replace(EUR_RE, "€" + NB + "$1");
  if (it.kind !== "fout") {
    it.answer = it.answer.replace(UNIT_RE, "$1" + NB + "$2").replace(EUR_RE, "€" + NB + "$1");
    it.choices = it.choices.map(function(c) { return c.replace(UNIT_RE, "$1" + NB + "$2").replace(EUR_RE, "€" + NB + "$1"); });
  }
}); });

// Getoonde vraag: nieuwe kopie met geschudde keuzes; terms = [tip] voor de tip na een fout
function pick(poolId, skillId) {
  var it = deckPick(skillId, P[poolId]);
  var q  = { terms: [it.tip], question: it.question, answer: it.answer, choices: shuffle(it.choices) };
  if (it.kind === "lang" || it.kind === "fout") q.smallChoices = true;
  if (it.kind === "fout") q.isErrorSpotter = true;
  return q;
}

function tipOf(t) { return t && t[0] ? t[0] : ""; }

// ─────────────────────────────────────────────────────────────────
// SKILL DEFINITIONS
// ─────────────────────────────────────────────────────────────────

var G1  = "Afstand en route";
var G2  = "Snelheid, afstand, tijd";
var G3  = "Plannen";
var G4  = "Dienstregeling";
var G5  = "Reiskosten";
var G6  = "Valuta";
var G7  = "Tijdzones";
var G8  = "Fietskaart";
var G9  = "Toepassen";
var G10 = "Slot";

var BLOCK_GROUPS = [G1, G2, G3, G4, G5, G6, G7, G8, G9];

// [id, label, groep, desc, strategy, uitleg, voorbeeld, minCorrect]
var DEFS = [
  ["r01_route_optellen", "Route optellen", G1, "12 km + 18 km = 30 km", "optellen",
    "Een route bestaat uit stukken. De hele afstand is alle stukken bij elkaar opgeteld.",
    "A-B 15 km, B-C 20 km: samen?\n15 + 20.\nAntwoord: 35 km.", 8],
  ["r02_heen_en_terug", "Heen en terug", G1, "35 km enkel = 70 km heen en terug", "keer 2",
    "Heen en terug is twee keer dezelfde afstand: enkele reis keer 2.",
    "Enkele reis 40 km. Heen en terug?\n2 × 40.\nAntwoord: 80 km.", 8],
  ["r03_per_dag", "Tocht per dag", G1, "120 km in 3 dagen = 40 km per dag", "eerlijk verdelen",
    "Verdeel de hele afstand eerlijk over de dagen: afstand gedeeld door het aantal dagen.",
    "Tocht 100 km in 4 dagen. Per dag?\n100 : 4.\nAntwoord: 25 km.", 8],
  ["r04_nog_te_gaan", "Nog te gaan", G1, "120 km, 35 gedaan: nog 85 km", "aftrekken",
    "Wat je nog moet: de hele route min het stuk dat je al gedaan hebt.",
    "Route 90 km, 36 km gedaan. Nog?\n90 − 36.\nAntwoord: 54 km.", 8],
  ["r05_kortste_route", "Kortste route", G1, "14+9 of 11+13 km: 23 km", "vergelijken",
    "Tel per route de stukken op en kies de kleinste uitkomst.",
    "Route 10+8 km of 9+12 km: kortste?\n18 km en 21 km.\nAntwoord: 18 km.", 8],
  ["r06_afstand", "Afstand uit snelheid", G2, "60 km/u, 2 uur = 120 km", "snelheid × tijd",
    "60 km/u betekent: elk uur 60 km. In 2 uur dus 2 × 60 = 120 km.",
    "80 km/u, 3 uur. Afstand?\n3 × 80.\nAntwoord: 240 km.", 8],
  ["r07_reistijd", "Reistijd", G2, "120 km bij 60 km/u = 2 uur", "afstand : snelheid",
    "Hoeveel keer past de snelheid in de afstand? 120 km bij 60 km/u: 120 : 60 = 2 uur.",
    "150 km bij 50 km/u. Hoe lang?\n150 : 50.\nAntwoord: 3 uur.", 8],
  ["r08_halve_uren", "Met halve uren", G2, "90 km/u, 1u30 = 135 km", "half uur",
    "Een half uur is de helft van een uur. 1u30 = 1,5 uur, niet 1,3 uur. 90 km/u in 1u30: 90 + 45 = 135 km.",
    "60 km/u, 1u30. Afstand?\n60 + 30.\nAntwoord: 90 km.", 8],
  ["r09_kmu_uit_minuten", "Km/u uit minuten", G2, "20 km in 15 min = 80 km/u", "naar 1 uur",
    "Zet de minuten eerst om naar een deel van een uur: 30 min = 1/2, 15 min = 1/4, 20 min = 1/3, 10 min = 1/6. Reken dan door naar een heel uur: 20 km in 1/4 uur is 4 × 20 = 80 km/u.",
    "15 km in 30 min. Snelheid?\n30 min = 1/2 uur, dus 2 × 15.\nAntwoord: 30 km/u.", 8],
  ["r10_keer_zo_snel", "Hoeveel keer zo snel", G2, "15 km/u is 3 keer 5 km/u", "delen",
    "Hoeveel keer zo snel: deel de grote snelheid door de kleine. 15 : 5 = 3.",
    "20 km/u of 4 km/u: hoeveel keer?\n20 : 4.\nAntwoord: 5.", 8],
  ["r11_aankomsttijd", "Aankomsttijd", G3, "Weg 9:30, 2 uur rijden: aan 11:30", "reistijd erbij",
    "Reken eerst de reistijd uit (afstand : snelheid) en tel die bij de vertrektijd op.",
    "Weg 8:00, 150 km bij 50 km/u. Aan?\n3 uur rijden.\nAntwoord: 11:00.", 8],
  ["r12_vertrektijd", "Vertrektijd", G3, "Om 14:00 er, 1u45 reizen: weg 12:15", "terug rekenen",
    "Reken terug: haal de reistijd van de aankomsttijd af. Ga eerst terug naar het hele uur. Een uur heeft 60 minuten, geen 100.",
    "Om 10:00 er zijn, reis 1u30. Weg?\n10:00 − 1u30.\nAntwoord: 8:30.", 8],
  ["r13_met_pauze", "Met pauze", G3, "2u15 + 30 min = 2u45", "erbij tellen",
    "Een pauze hoort bij de tijd die je onderweg bent. Tel de pauze bij de reistijd op.",
    "1u40 fietsen + 20 min pauze: totaal?\n1u40 + 20 min.\nAntwoord: 2 uur.", 8],
  ["r14_overstaptijd", "Overstaptijd", G3, "Aan 10:52, bus 11:05: 13 min", "aanvullen",
    "Tel van de aankomst door tot het vertrek: eerst tot het hele uur, dan verder. Van 10:52 tot 11:00 is 8 min, plus 5 min = 13 min.",
    "Trein aan 9:48, bus 10:06. Overstap?\n12 + 6.\nAntwoord: 18 min.", 8],
  ["r15_aansluiting", "Aansluiting", G4, "Aan 9:47, bus :50: de bus van 9:50", "rooster lezen",
    "Zoek in het rooster het eerste vertrek ná je aankomst. Een bus die al weg is, haal je niet.",
    "Aan 8:20. Bus :15 en :45. Welke?\n8:15 is al weg.\nAntwoord: 8:45.", 8],
  ["r16_reistijd_trein", "Reistijd van de trein", G4, "8:47 tot 10:13 = 1u26", "aanvullen",
    "Tel van vertrek naar aankomst: eerst tot het hele uur, dan de hele uren, dan de rest.",
    "Trein 9:40 tot 11:10. Reistijd?\n20 min + 1 uur + 10 min.\nAntwoord: 1u30.", 8],
  ["r17_laatste_trein", "Laatste trein", G4, "Reis 50 min, om 11:00 er: 10:05", "terug rekenen",
    "Reken eerst terug hoe laat je uiterlijk weg moet (aankomst − reistijd). Kies dan de laatste trein die vóór dat moment vertrekt.",
    "Reis 40 min, om 10:00 er. Laatste trein?\nUiterlijk 9:20 weg.\nAntwoord: 9:05.", 8],
  ["r18_totaal_overstap", "Totaal met overstap", G4, "40 + 12 + 25 min = 1u17", "optellen",
    "De hele reis is alles samen: de rit, het wachten en de volgende rit. Vergeet het wachten niet.",
    "30 min trein, 10 wachten, 20 bus: totaal?\n30 + 10 + 20.\nAntwoord: 1 uur.", 8],
  ["r19_kaartjes", "Kaartjes", G5, "2 × € 12 + 3 × € 6 = € 42", "keer, dan optellen",
    "Reken per soort kaartje uit wat het samen kost, en tel dat dan op.",
    "2 × € 10 en 2 × € 5: totaal?\n€ 20 + € 10.\nAntwoord: € 30.", 8],
  ["r20_per_km", "Kosten per km", G5, "150 km × € 0,20 = € 30", "keer",
    "Kosten per km keer het aantal km. 150 × € 0,20 = € 30. Let op de komma: 20 cent, geen 2 euro.",
    "100 km, € 0,25 per km: kosten?\n100 × 25 cent.\nAntwoord: € 25.", 8],
  ["r21_liters", "Liters brandstof", G5, "300 km, 1 l per 15 km = 20 l", "delen",
    "1 l per 15 km betekent: met 1 liter rijd je 15 km. Hoeveel liter voor 300 km? 300 : 15 = 20 liter. Niet vermenigvuldigen.",
    "200 km, 1 l per 20 km: liters?\n200 : 20.\nAntwoord: 10 l.", 8],
  ["r22_brandstofkosten", "Brandstofkosten", G5, "20 l × € 2 = € 40", "keer",
    "De kosten zijn het aantal liters keer de prijs per liter.",
    "15 l, € 2 per liter: kosten?\n15 × € 2.\nAntwoord: € 30.", 8],
  ["r23_kosten_delen", "Kosten delen", G5, "€ 60 met 4 personen = € 15", "eerlijk verdelen",
    "Eerlijk delen: het totaal gedeeld door het aantal personen.",
    "Reis € 50 met 5 personen: elk?\n€ 50 : 5.\nAntwoord: € 10.", 8],
  ["r24_naar_munt", "Euro naar andere munt", G6, "€ 1 = 10 kronen: € 15 = 150", "keer de koers",
    "De koers zegt hoeveel je voor 1 euro krijgt. Voor meer euro's: aantal euro's keer de koers.",
    "€ 1 = 4 dirham. € 12 = ? dirham\n12 × 4.\nAntwoord: 48.", 8],
  ["r25_naar_euro", "Terug naar euro", G6, "80 kronen = € 8", "delen door de koers",
    "Andersom deel je door de koers: hoeveel keer zit 10 kronen in 80 kronen? 80 : 10 = € 8.",
    "€ 1 = 4 zloty. 60 zloty = € ?\n60 : 4.\nAntwoord: € 15.", 8],
  ["r26_goedkoopst_valuta", "Goedkoopst in euro", G6, "45 kronen = € 4,50 < € 5", "zelfde munt",
    "Reken alle prijzen om naar euro's en vergelijk dan. 45 kronen bij € 1 = 10 kronen is € 4,50: goedkoper dan € 5.",
    "€ 1 = 10 kronen. 60 kronen of € 5?\n60 kronen = € 6.\nAntwoord: € 5.", 8],
  ["r27_tijd_daar", "Hoe laat is het daar", G7, "Hier 14:00, Londen 13:00", "tijdsverschil",
    "Is het daar vroeger, haal het verschil eraf. Is het daar later, tel het erbij. Londen is 1 uur vroeger dan Nederland.",
    "Hier 10:00. Athene 1 uur later. Daar?\n10:00 + 1 uur.\nAntwoord: 11:00.", 8],
  ["r28_lokale_aankomst", "Lokale aankomsttijd", G7, "Om 10:00 1u30 vliegen, Londen −1 u: 10:30", "twee stappen",
    "Eerst de vliegtijd erbij: dan weet je hoe laat het bij ons is als je landt. Pas daarna het tijdsverschil: −1 u betekent daar 1 uur vroeger. De reis duurt echt even lang; alleen de klok daar staat anders.",
    "Om 9:00 2 uur vliegen, Athene +1 u. Daar?\n11:00 bij ons, +1 uur.\nAntwoord: 12:00.", 8],
  ["r29_middernacht", "Over middernacht", G7, "Weg 23:00, aan 1:15 = 2u15", "via 0:00",
    "Na 23:59 begint de klok weer bij 0:00. Reken via middernacht: van 23:00 tot 0:00 is 1 uur, daarna nog 1u15. Een kloktijd (Aan?) is iets anders dan de reistijd (Reistijd?).",
    "Weg 22:30, aan 0:45. Reistijd?\n1u30 tot 0:00, dan 45 min.\nAntwoord: 2u15.", 8],
  ["r30_fietskaart", "Fietskaart", G8, "1 : 50 000, 4 cm = 2 km", "schaal",
    "Schaal 1 : 50 000 betekent: 1 cm op de kaart is 50 000 cm in het echt. 50 000 cm = 500 m. 4 cm is dus 2000 m = 2 km. Bij 1 : 25 000 is 1 cm = 250 m.",
    "Schaal 1 : 25 000. 4 cm = ? km\n4 × 250 m = 1000 m.\nAntwoord: 1 km.", 8],
  ["r31_snelheid_zonder_pauze", "Snelheid zonder pauze", G8, "60 km in 3 uur, 1 uur pauze: 30 km/u", "pauze eraf",
    "Tijdens de pauze rijd je niet. Haal de pauze van de tijd af en deel dan de afstand door de echte rijtijd.",
    "40 km in 3 uur, 1 uur pauze. Km/u?\n40 : 2.\nAntwoord: 20 km/u.", 8],
  ["r32_afstand_met_pauze", "Afstand met pauze", G8, "20 km/u, 3 uur weg, 1 uur pauze: 40 km", "pauze eraf",
    "Je rijdt alleen buiten de pauze. Echte rijtijd keer de snelheid.",
    "15 km/u, 4 uur weg, 1 uur pauze. Ver?\n3 × 15.\nAntwoord: 45 km.", 8],
  ["r33_schatten", "Reistijd schatten", G9, "118 km bij 59 km/u ≈ 2 uur", "afronden",
    "Rond af naar handige getallen en reken dan. 118 km is ongeveer 120, 59 km/u ongeveer 60: ongeveer 2 uur.",
    "Ongeveer: 149 km bij 51 km/u ≈ ?\n150 : 50.\nAntwoord: 3 uur.", 8],
  ["r34_twee_stappen", "Twee stappen", G9, "240 km, 1 l per 16 km, € 2/l: € 30", "stap voor stap",
    "Reken in twee stappen. Brandstof: eerst de liters (km : km per liter), dan keer de prijs. Groepsreis retour: eerst retour voor 1 persoon (2 × enkel), dan keer het aantal personen.",
    "Kaartje € 5 enkel. 4 personen, retour?\n2 × € 5 = € 10, 4 × € 10.\nAntwoord: € 40.", 8],
  ["r35_fout_spotten", "Fout spotten: reizen", G9, "1u30 = 1,3 uur is fout", "controleren",
    "Veel gemaakte fouten: 1u30 = 1,3 uur (goed is 1,5 uur), 90 km bij 60 km/u = 1u50 (goed is 1u30), 60 km/u in 2 uur = 62 km (goed is 120 km) en 15 min = 0,15 uur (goed is 1/4 uur).",
    "Welke is FOUT?\n2u30 = 2,3 uur → goed is 2,5 uur.\nDie is fout.", 12],
  ["r36_beste_keuze", "Beste keuze", G9, "Fiets 2 uur of bus 1u45: 1u45", "vergelijken",
    "Reken elke keuze uit in dezelfde eenheid (tijd of euro's) en kies volgens de vraag: de snelste of de goedkoopste.",
    "100 km: auto € 0,20/km of trein € 25. Goedkoopst?\nAuto € 20.\nAntwoord: € 20.", 8],
];

var RAW_SKILLS = DEFS.map(function(d) {
  var poolId = d[0].slice(0, 3);
  return {
    id:         d[0],
    label:      d[1],
    group:      d[2],
    desc:       d[3],
    strategy:   d[4],
    tip:        tipOf,
    uitleg:     d[5],
    voorbeeld:  d[6],
    minCorrect: d[7],
    deck:       true,
    // Pool via het korte ID (r01), stapel per volledige skill-ID
    make:       function() { return pick(poolId, d[0]); },
  };
});

// ─────────────────────────────────────────────────────────────────
// SKILLS MET VRAAGVERLOOP + r37 SNELHEIDSRONDE
// ─────────────────────────────────────────────────────────────────

var SKILLS = createSkills("reizen", RAW_SKILLS);
var MIXER  = createMixer(RAW_SKILLS, BLOCK_GROUPS, SKILLS.byId);

export var REIS_SKILLS = SKILLS.list;

registerSkillId("reizen", "r37_snelheid");

REIS_SKILLS.push({
  id:         "r37_snelheid",
  label:      "Snelheidsronde",
  group:      G10,
  desc:       "Gemengd: afstand, reistijd, kosten en tijdzones",
  strategy:   "snel",
  tip:        "Kijk eerst wat er gevraagd wordt: een afstand, een tijd, een bedrag of een kloktijd. Reken dan stap voor stap.",
  uitleg:     "In de snelheidsronde komen alle soorten reisvragen door elkaar voorbij. Kies per vraag de aanpak die je hebt geleerd.",
  voorbeeld:  "Gemengd, bijvoorbeeld:\n60 km/u, 2 uur, € 1 = 10 kronen, Londen −1 u",
  minCorrect: 15,
  generate:   MIXER.generate,
});

export var REIS_ORDER = REIS_SKILLS.map(function(s) { return s.id; });

// Voor tests: de vaste pools (alleen lezen)
export var REIS_POOLS = P;
