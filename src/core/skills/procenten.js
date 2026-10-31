// Onderdeel Procenten en verhoudingen (groep Praktisch rekenen): skills, volgorde en vaste vraagpools (ontwerp B1).
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Het vraagverloop (rekenmoment, stapels, gemengde ronde) staat in ./flow.js.
// Notatie (B1):
//   procent    "25%"  (geen spatie)
//   verhouding "3 : 2" alleen na het woord "verhouding" of "schaal" (NB rond de dubbele punt)
//   geld       zoals Geld: "€ 5" (hele euro's) of "€ 12,50"; intern in centen
//   getal + eenheid met een niet-afbrekende spatie (NB)
// Rekengrenzen: 1, 5, 10, 20, 25, 50, 75% en samengesteld via 10%; hoeveel-procent-vragen altijd een
// heel percentage; schaal 1 : 100, 1 : 1000 en 1 : 100 000 met hooguit één eenvoudige omrekening.
// Alle vragen staan op één regel. Elke skill heeft een vaste, nagekeken pool en trekt via deckPick:
// elke vraag één keer per ronde, nooit direct dezelfde. 4 keuzes, precies één goed antwoord.

import { shuffle, gcd } from "./helpers.js";
import { registerSkillId, createSkills, createMixer, deckPick } from "./flow.js";

var NB = "\u00a0";
var RATIO = NB + ":" + NB;
var MIN = "−";
var TIMES = " × ";

var P = {};

function put(id, question, answer, choices, tip, kind) {
  (P[id] || (P[id] = [])).push({ question: question, answer: answer, choices: choices, tip: tip, kind: kind || "kort" });
}

// Kommagetal met maximaal 2 decimalen uit een geheel getal gedeeld door div
function kg(v, div) {
  var h = Math.round(v * 100 / div);
  if (Math.abs(h - v * 100 / div) > 1e-9) return null;
  var e = Math.floor(h / 100), r = h % 100;
  if (r === 0) return String(e);
  return e + "," + (r % 10 === 0 ? String(r / 10) : (r < 10 ? "0" + r : String(r)));
}
function pct(n) { return n + "%"; }
// Geld in centen
function eur(c) { var e = Math.floor(c / 100), k = c % 100; return "€" + NB + e + "," + (k < 10 ? "0" : "") + k; }
function eurQ(c) { return c % 100 === 0 ? "€" + NB + (c / 100) : eur(c); }
function ratio(a, b) { return a + RATIO + b; }

// Vier keuzes, uniek op tekst, eerste voorkomen blijft
function four(answer, cands, reserve) {
  var out = [answer];
  function add(c) { if (out.length < 4 && c !== null && c !== undefined && out.indexOf(c) < 0) out.push(c); }
  cands.forEach(add);
  (reserve || []).forEach(add);
  return out;
}
// Getalkeuzes (gehele of kommagetallen als waarde * 100 / 100), > 0, uniek in waarde
// maxLen (optioneel): langste keuzetekst die nog mag (standaard 7 tekens)
function nums(ans, cands, step, fmtFn, maxLen) {
  var f = fmtFn || function(x) { return kg(x, 1); };
  var ml = maxLen || 7;
  var out = [f(ans)], seen = {};
  seen[ans] = true;
  function add(c) { if (out.length >= 4 || typeof c !== "number" || c <= 0 || seen[c]) return; var s = f(c); if (s === null || s.length > ml) return; seen[c] = true; out.push(s); }
  cands.forEach(add);
  var st = step || 1;
  for (var k = 1; k < 60 && out.length < 4; k++) { add(ans + k * st); add(ans - k * st); }
  return out;
}
function pcts(ans, cands, step) { return nums(ans, cands, step || 5, function(x) { return x <= 1000 && x % 1 === 0 ? pct(x) : null; }); }
function euros(ans, cands, step) { return nums(ans, cands, step || 100, function(c) { return c % 1 === 0 ? eurQ(c) : null; }); }

// ── Blok 1: procent begrijpen ─────────────────────────────────────
var KNOWN = [[50, 1, 2], [25, 1, 4], [75, 3, 4], [10, 1, 10], [20, 1, 5], [40, 2, 5], [60, 3, 5], [80, 4, 5], [30, 3, 10], [70, 7, 10], [90, 9, 10]];
(function() {
  var n;
  for (n = 3; n <= 97; n += 4) put("p01", n + " van de 100: hoeveel %?", pct(n), pcts(n, [100 - n, n + 10, n - 10]),
    "Procent betekent: van de 100. " + n + " van de 100 = " + n + "%.");
  for (n = 1; n <= 9; n++) put("p01", n + " van de 10: hoeveel %?", pct(n * 10), pcts(n * 10, [n, 100 - n * 10, n * 10 + 5]),
    n + " van de 10 is hetzelfde als " + n * 10 + " van de 100: " + n * 10 + "%.");
  KNOWN.forEach(function(k) {
    var p = k[0], fr = k[1] + "/" + k[2];
    put("p02", fr + " = ?%", pct(p), pcts(p, [Number(String(k[1]) + String(k[2])) <= 100 ? Number(String(k[1]) + String(k[2])) : null, k[2], 100 - p]),
      fr + " van 100 = " + p + ". Dus " + fr + " = " + p + "%.");
    put("p02", pct(p) + " = welke breuk?", fr, four(fr, ["1/" + p, (100 - p) / gcd(100 - p, 100) + "/" + 100 / gcd(100 - p, 100), k[2] + "/" + k[1]], [k[1] + "/" + (k[2] * 2), k[1] + "/" + (k[2] + 1)]),
      p + "% = " + p + "/100 = " + fr + ".");
  });
  [5, 15, 25, 30, 35, 40, 45, 60, 65, 70, 80, 85].forEach(function(p) {
    var d = kg(p, 100);
    put("p03", d + " = ?%", pct(p), pcts(p, [p % 10 === 0 ? p / 10 : null, p * 10, p < 50 ? p + 50 : p - 50]),
      d + " = " + p + " honderdsten = " + p + "%.");
    put("p03", pct(p) + " = welk kommagetal?", d, four(d, [kg(p, 10), String(p), kg(100 - p, 100)]),
      p + "% = " + p + "/100 = " + d + ".");
  });
  for (n = 5; n <= 95; n += 5) {
    put("p04", n + "% is rood, de rest blauw. Blauw?", pct(100 - n), pcts(100 - n, [n, (100 - n) % 10 !== 0 ? 100 - n + 10 : null, 100 - n - 10 > 0 ? 100 - n - 10 : null, 100 - n + 20]),
      "Samen is 100%. 100 " + MIN + " " + n + " = " + (100 - n) + "%.");
  }
  // p05: vier verschillende waarden in gemengde notatie; vraag naar de grootste of kleinste
  var REP = { 5: ["5%", "0,05"], 10: ["10%", "1/10", "0,1"], 20: ["20%", "1/5", "0,2"], 25: ["25%", "1/4", "0,25"], 30: ["30%", "0,3"], 40: ["40%", "2/5", "0,4"],
              50: ["50%", "1/2", "0,5"], 60: ["60%", "3/5", "0,6"], 75: ["75%", "3/4", "0,75"], 80: ["80%", "4/5", "0,8"], 90: ["90%", "0,9"] };
  var VALS = [5, 10, 20, 25, 30, 40, 50, 60, 75, 80, 90];
  var sets = [[25, 30, 20, 10], [50, 40, 60, 25], [75, 80, 60, 50], [5, 10, 20, 25], [30, 25, 40, 20], [90, 80, 75, 60], [20, 25, 10, 30], [40, 50, 30, 25], [60, 75, 50, 40], [10, 5, 25, 20]];
  sets.forEach(function(s, i) {
    var reps = s.map(function(v, j) { var r = REP[v]; return r[(i + j) % r.length]; });
    var hi = reps[s.indexOf(Math.max.apply(null, s))], lo = reps[s.indexOf(Math.min.apply(null, s))];
    var tipTxt = "Schrijf alles als procent: " + s.map(function(v, j) { return reps[j] + " = " + v + "%"; }).join(", ") + ".";
    put("p05", "Welke is het meest?", hi, reps.slice(), tipTxt);
    put("p05", "Welke is het minst?", lo, reps.slice(), tipTxt);
  });
})();

// ── Blok 2: procent van een getal, eenvoudig ──────────────────────
(function() {
  var n;
  for (n = 20; n <= 200; n += 10) put("p06", "50% van " + n + " = ?", String(n / 2), nums(n / 2, [n, n * 2, n - 50, n / 2 + 10]),
    "50% is de helft: " + n + " : 2 = " + n / 2 + ".");
  for (n = 8; n <= 120; n += 8) {
    put("p07", "25% van " + n + " = ?", String(n / 4), nums(n / 4, [n * 3 / 4, n / 2, n - 25]),
      "25% is een kwart: " + n + " : 4 = " + n / 4 + ".");
    put("p07", "75% van " + n + " = ?", String(n * 3 / 4), nums(n * 3 / 4, [n / 4, n / 2, n - 75, n]),
      "75% is 3 kwart: " + n + " : 4 = " + n / 4 + ", " + TIMES.trim() + " 3 = " + n * 3 / 4 + ".");
  }
  for (n = 30; n <= 400; n += 10) {
    if (n > 100 && n % 50 !== 0) continue;
    put("p08", "10% van " + n + " = ?", String(n / 10), nums(n / 10, [n - 10, n / 100, n, n / 10 + 10]),
      "10% is een tiende: " + n + " : 10 = " + n / 10 + ".");
  }
  for (n = 200; n <= 2000; n += 100) {
    if (n > 1000 && n % 500 !== 0) continue;
    put("p09", "1% van " + n + " = ?", String(n / 100), nums(n / 100, [n / 10, n - 1, n]),
      "1% is een honderdste: " + n + " : 100 = " + n / 100 + ".");
  }
  // p10: 20/30/40% = 2/3/4 × 10%, en 5% = de helft van 10%.
  // Afleiders per methode: alleen 10% genomen, k% in plaats van k0%, verkeerde factor (k ± 1) × 10%.
  [2, 3, 4].forEach(function(k) { [100, 200, 300, 400, 500, 600, 800, 900].forEach(function(n) {
    var ten = n / 10, ans = k * ten, wrongF = (k === 2 ? 3 : k - 1) * ten;
    put("p10", k * 10 + "% van " + n + " = ?", String(ans), four(String(ans), [String(ten), String(k * n / 100), String(wrongF)]),
      "10% van " + n + " = " + ten + ". " + k * 10 + "% = " + k + TIMES + "10% = " + k + TIMES + ten + " = " + ans + ".");
  }); });
  [40, 60, 80, 100, 120, 160, 200, 240, 300, 400].forEach(function(n) {
    var ten = n / 10, ans = ten / 2;
    put("p10", "5% van " + n + " = ?", kg(ans, 1), four(kg(ans, 1), [String(ten), String(ten * 2), String(n - 5)]),
      "10% van " + n + " = " + ten + ". 5% is de helft daarvan: " + kg(ans, 1) + ".");
  });
})();

// ── Blok 3: procent van, samengesteld ─────────────────────────────
(function() {
  // p11: 15% = 10% + 5%. Afleiders: alleen 10%, 10% + 10%, 15 eraf
  [40, 60, 80, 100, 120, 140, 160, 200, 240, 300, 400, 600].forEach(function(n) {
    var ten = n / 10, five = ten / 2, ans = ten + five;
    put("p11", "15% van " + n + " = ?", String(ans), four(String(ans), [String(ten), String(2 * ten), String(n - 15)]),
      "15% = 10% + 5%. 10% van " + n + " = " + ten + ", 5% = " + five + ". Samen " + ans + ".");
  });
  // p12: procent van een geldbedrag (centen). Afleiders: alles als 10%, het restbedrag, het dubbele
  [[10, 2000], [10, 4500], [10, 1500], [20, 3000], [20, 1500], [25, 2000], [25, 1200], [25, 5000], [50, 1800], [50, 2500], [50, 900], [75, 2000], [75, 1200], [5, 4000], [5, 6000], [20, 4500]].forEach(function(p) {
    var part = p[1] * p[0] / 100;
    put("p12", p[0] + "% van " + eurQ(p[1]) + " = ?", eurQ(part), euros(part, [p[0] === 10 ? p[1] / 100 : p[1] / 10, p[1] - part, part * 2], 50),
      p[0] + "% van " + eurQ(p[1]) + ": " + (p[0] === 50 ? "de helft" : p[0] === 25 ? "een kwart" : p[0] === 75 ? "3 kwart" : p[0] === 10 ? "een tiende" : p[0] === 20 ? "2 × 10%" : "de helft van 10%") + " = " + eurQ(part) + ".");
  });
  // p13: deel van totaal → procent, altijd een heel percentage
  [[15, 60], [5, 20], [10, 25], [30, 50], [12, 40], [9, 30], [18, 60], [6, 24], [21, 30], [16, 80], [45, 60], [8, 32], [14, 40], [24, 80], [36, 40], [7, 35]].forEach(function(p) {
    var ans = p[0] * 100 / p[1];
    put("p13", p[0] + " van de " + p[1] + ": hoeveel %?", pct(ans), pcts(ans, [p[0], 100 - ans, Math.round(p[1] / p[0]) * 10 !== ans ? Math.round(p[1] / p[0]) * 10 : null, ans + 10]),
      p[0] + " van de " + p[1] + " = " + p[0] + "/" + p[1] + " = " + ans + "/100 = " + ans + "%.");
  });
  // p14: totaal 20 (× 5), 25 (× 4), 50 (× 2). Afleiders: deel als procent en een verkeerde factor
  var F = { 20: 5, 25: 4, 50: 2 };
  [[7, 20], [3, 20], [11, 20], [13, 20], [17, 20], [9, 25], [6, 25], [11, 25], [19, 25], [13, 50], [21, 50], [37, 50], [9, 50], [43, 50]].forEach(function(p) {
    var f = F[p[1]], ans = p[0] * f, wrong = [5, 4, 2].filter(function(x) { return x !== f; });
    put("p14", p[0] + " van de " + p[1] + ": hoeveel %?", pct(ans), pcts(ans, [p[0], p[0] * wrong[0], p[0] * wrong[1]]),
      p[1] + TIMES + f + " = 100. Dus ook " + p[0] + TIMES + f + " = " + ans + "%.");
  });
})();

// ── Blok 4: korting en verhoging ──────────────────────────────────
(function() {
  var LIST = [[25, 4000], [10, 5000], [20, 3000], [50, 2400], [25, 6000], [10, 2500], [20, 4500], [50, 3800], [25, 1600], [10, 8000], [20, 1500], [50, 7000]];
  LIST.forEach(function(p) {
    var k = p[1] * p[0] / 100, nieuw = p[1] - k;
    put("p15", p[0] + "% korting op " + eurQ(p[1]) + ": hoeveel?", eurQ(k), euros(k, [p[0] * 100, nieuw, p[0] === 10 ? p[1] / 100 : p[1] / 10]),
      p[0] + "% van " + eurQ(p[1]) + " = " + eurQ(k) + " korting.");
    put("p16", eurQ(p[1]) + " met " + p[0] + "% korting. Prijs?", eurQ(nieuw), euros(nieuw, [k, p[1] - p[0] * 100, p[1] + k]),
      "Korting: " + p[0] + "% van " + eurQ(p[1]) + " = " + eurQ(k) + ". " + eurQ(p[1]) + " " + MIN + " " + eurQ(k) + " = " + eurQ(nieuw) + ".");
  });
  [[10, 4000], [10, 2000], [20, 3000], [25, 4000], [50, 1200], [10, 7000], [20, 2500], [25, 2000], [50, 3000], [10, 1500]].forEach(function(p) {
    var up = p[1] * p[0] / 100, nieuw = p[1] + up;
    put("p17", eurQ(p[1]) + " wordt " + p[0] + "% duurder. Prijs?", eurQ(nieuw), euros(nieuw, [p[1] + p[0] * 100, p[1] - up, up]),
      p[0] + "% van " + eurQ(p[1]) + " = " + eurQ(up) + " erbij: " + eurQ(nieuw) + ".");
  });
  // p18: hoeveel procent korting? Afleiders: het euroverschil als procent, nieuw/oud als procent, ± 5
  [[4000, 3000], [5000, 4000], [2000, 1500], [6000, 4500], [8000, 6000], [2500, 2000], [3000, 2700], [10000, 7500], [1200, 900], [4000, 2000], [5000, 4500], [6000, 3000]].forEach(function(p) {
    var diff = p[0] - p[1], ans = diff * 100 / p[0], keep = p[1] * 100 / p[0];
    put("p18", "Van " + eurQ(p[0]) + " naar " + eurQ(p[1]) + ": % korting?", pct(ans), pcts(ans, [diff / 100 !== ans ? diff / 100 : null, keep, ans + 5]),
      "Korting " + eurQ(diff) + " van " + eurQ(p[0]) + ": " + diff / 100 + "/" + p[0] / 100 + " = " + ans + "%.");
  });
  // p19: welke korting is meer? Vaste lijst, verschil steeds minstens € 2, nooit even veel
  [[6000, 25, 1000], [4000, 25, 1500], [8000, 10, 500], [3000, 50, 1200], [5000, 20, 1200], [12000, 25, 2500], [9000, 10, 1200], [2400, 25, 800],
   [20000, 5, 1500], [7000, 10, 500], [3600, 25, 700], [10000, 15, 1200]].forEach(function(p) {
    var a = p[0] * p[1] / 100, b = p[2], A = p[1] + "% korting", B = eurQ(b) + " korting";
    put("p19", "Op " + eurQ(p[0]) + ": wat geeft meer korting?", a > b ? A : B, [A, B, "allebei evenveel", "geen korting"],
      p[1] + "% van " + eurQ(p[0]) + " = " + eurQ(a) + ". Dat is " + (a > b ? "meer" : "minder") + " dan " + eurQ(b) + ".", "lang");
  });
})();

// ── Blok 5: verhoudingen ──────────────────────────────────────────
(function() {
  var FULL = "■", EMPTY = "□";
  for (var r = 1; r <= 6; r++) for (var b = 1; b <= 6; b++) {
    if (r === b || r + b > 9) continue;
    var row = FULL.repeat(r) + EMPTY.repeat(b);
    put("p20", row + " Verhouding ■" + RATIO + "□?", ratio(r, b), four(ratio(r, b), [ratio(b, r), ratio(r, r + b), ratio(b, r + b)]),
      "Tel: " + r + " zwart (■) en " + b + " wit (□). Verhouding zwart : wit = " + r + " : " + b + ".");
    if (gcd(r, r + b) === 1) put("p21", row + " Welk deel is ■?", r + "/" + (r + b), four(r + "/" + (r + b), [r + "/" + b, b + "/" + (r + b), b + "/" + r]),
      r + " van de " + (r + b) + " vakjes zijn zwart: " + r + "/" + (r + b) + ".");
  }
  // p22: gelijkwaardige verhouding. Afleiders: optellen in plaats van vermenigvuldigen, overnemen, verkeerde factor
  [[2, 3, 2], [2, 3, 3], [3, 4, 2], [1, 3, 4], [2, 5, 3], [3, 5, 2], [4, 3, 2], [1, 4, 3], [5, 2, 3], [3, 2, 4], [2, 7, 2], [4, 5, 3]].forEach(function(p) {
    var a = p[0], b = p[1], f = p[2], c = a * f, ans = b * f;
    put("p22", "Verhouding " + ratio(a, b) + " = " + c + RATIO + "?", String(ans), nums(ans, [b + (c - a), b, b * (f + 1)]),
      a + TIMES + f + " = " + c + ", dus ook " + b + TIMES + f + " = " + ans + ".");
  });
  // p23: vereenvoudigen. Afleiders: omgedraaid, maar één kant gedeeld, verkeerd deeltal
  [[6, 9], [4, 10], [8, 12], [10, 15], [6, 8], [12, 18], [15, 20], [9, 12], [14, 21], [10, 25], [16, 24], [20, 30]].forEach(function(p) {
    var g = gcd(p[0], p[1]), a = p[0] / g, b = p[1] / g;
    put("p23", "Verhouding " + ratio(p[0], p[1]) + ": zo eenvoudig?", ratio(a, b), four(ratio(a, b), [ratio(b, a), ratio(a, p[1]), ratio(p[0], b)]),
      "Deel beide getallen door " + g + ": " + p[0] + " : " + g + " = " + a + " en " + p[1] + " : " + g + " = " + b + ".");
  });
})();

// ── Blok 6: verhoudingstabel (twee tekstregels) ───────────────────
(function() {
  // p24: × 2 of × 3. Afleiders: optellen (additieve fout), verkeerde factor, keer het aantal
  [["pakken", 2, 500, 3], ["pakken", 2, 300, 2], ["flessen", 3, 400, 2], ["kaartjes", 2, 700, 3], ["boeken", 4, 1000, 2], ["schriften", 3, 200, 3],
   ["flessen", 2, 150, 3], ["kaartjes", 5, 1200, 2], ["pakken", 3, 450, 2], ["boeken", 2, 900, 3]].forEach(function(p) {
    var n2 = p[1] * p[3], c2 = p[2] * p[3];
    put("p24", p[1] + " " + p[0] + " kosten " + eurQ(p[2]) + ". En " + n2 + "?", eurQ(c2), euros(c2, [p[2] + (n2 - p[1]) * 100, p[2] * (p[3] === 2 ? 3 : 2), p[2] * n2], 50),
      p[1] + TIMES + p[3] + " = " + n2 + ", dus ook " + eurQ(p[2]) + TIMES + p[3] + " = " + eurQ(c2) + ".");
  });
  // p25: via 1. Afleiders: optellen/aftrekken, alleen de prijs van 1, keer het oude totaal
  [["kaartjes", 4, 1200, 3], ["kaartjes", 5, 1500, 2], ["pakken", 3, 900, 5], ["flessen", 4, 600, 6], ["boeken", 2, 1400, 3], ["schriften", 6, 1200, 4],
   ["pakken", 4, 1000, 6], ["flessen", 5, 1000, 3], ["kaartjes", 3, 2100, 4], ["boeken", 4, 2000, 5]].forEach(function(p) {
    var one = p[2] / p[1], ans = one * p[3];
    put("p25", p[1] + " " + p[0] + " kosten " + eurQ(p[2]) + ". En " + p[3] + "?", eurQ(ans), euros(ans, [p[2] + (p[3] - p[1]) * 100, one, p[2] * p[3]], 50),
      "Eerst 1: " + eurQ(p[2]) + " : " + p[1] + " = " + eurQ(one) + ". Dan " + p[3] + TIMES + eurQ(one) + " = " + eurQ(ans) + ".");
  });
  // p26: delen. Afleiders: aftrekken (additief), half, het dubbele
  [["stuks", 10, 3000, 2], ["stuks", 10, 5000, 5], ["kaartjes", 6, 2400, 2], ["pakken", 8, 4000, 2], ["flessen", 9, 1800, 3], ["stuks", 12, 6000, 3],
   ["boeken", 6, 4200, 2], ["kaartjes", 8, 2400, 4], ["pakken", 10, 1500, 5], ["stuks", 20, 4000, 5]].forEach(function(p) {
    var f = p[1] / p[3], ans = p[2] / f;
    put("p26", p[1] + " " + p[0] + " kosten " + eurQ(p[2]) + ". En " + p[3] + "?", eurQ(ans), euros(ans, [p[2] - (p[1] - p[3]) * 100, p[2] / 2 !== ans ? p[2] / 2 : null, ans * 2, p[2] / p[1]], 50),
      p[1] + " : " + f + " = " + p[3] + ", dus ook " + eurQ(p[2]) + " : " + f + " = " + eurQ(ans) + ".");
  });
  // p27: recept. Afleiders: optellen, verdubbelen, keer het aantal personen
  [[4, 200, 6, "g"], [2, 150, 6, "g"], [4, 300, 2, "g"], [3, 120, 6, "g"], [4, 100, 8, "g"], [2, 250, 4, "g"], [6, 300, 2, "g"], [4, 500, 6, "ml"],
   [2, 200, 3, "ml"], [3, 450, 2, "g"], [4, 400, 3, "ml"], [5, 250, 10, "g"]].forEach(function(p) {
    var ans = p[1] / p[0] * p[2];
    put("p27", "Voor " + p[0] + " personen " + p[1] + " " + p[3] + ". Voor " + p[2] + "?", ans + NB + p[3],
      nums(ans, [p[1] + (p[2] - p[0]), p[1] * 2, p[1] * p[2]], 10, function(x) { return x % 1 === 0 ? x + NB + p[3] : null; }),
      "Per persoon " + p[1] / p[0] + " " + p[3] + ". " + p[2] + TIMES + p[1] / p[0] + " = " + ans + " " + p[3] + ".");
  });
})();

// ── Blok 7: schaal (één schaalfactor, hooguit één eenvoudige omrekening) ──
(function() {
  // p28: kaart → werkelijkheid in m (1 : 100 en 1 : 1000). Afleiders: schaal vergeten, eenheid niet omgerekend, factor 10 fout
  [100, 1000].forEach(function(s) { [2, 3, 4, 5, 6, 7, 8, 9].forEach(function(cm) {
    var real = cm * s / 100; // in m
    put("p28", "Schaal " + ratio(1, s) + ". " + cm + " cm = ? m", real + NB + "m",
      nums(real, [cm / 100, cm * s, real * 10, real / 10], 1, function(x) { var t = kg(Math.round(x * 100), 100); return t === null ? null : t + NB + "m"; }),
      cm + " cm" + TIMES + s + " = " + cm * s + " cm = " + real + " m.");
  }); });
  // p29: 1 : 100 000 → km (1 cm = 1 km)
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 12, 15].forEach(function(cm) {
    put("p29", "Schaal " + ratio(1, "100" + NB + "000") + ". " + cm + " cm = ? km", cm + NB + "km",
      nums(cm, [cm * 10, cm * 100, cm / 10], 1, function(x) { var t = kg(Math.round(x * 100), 100); return t === null ? null : t + NB + "km"; }),
      cm + " cm" + TIMES + "100 000 = " + cm + "00 000 cm = " + cm + " km.");
  });
  // p30: werkelijkheid → kaart in cm. Afleiders: vermenigvuldigd in plaats van gedeeld, factor 10 fout, eenheid niet omgerekend
  [[100, 5, "m"], [100, 3, "m"], [100, 8, "m"], [100, 4, "m"], [1000, 20, "m"], [1000, 50, "m"], [1000, 70, "m"], [1000, 30, "m"],
   [100000, 4, "km"], [100000, 7, "km"], [100000, 2, "km"], [100000, 9, "km"]].forEach(function(p) {
    var realCm = p[2] === "m" ? p[1] * 100 : p[1] * 100000, ans = realCm / p[0];
    put("p30", "Schaal " + ratio(1, p[0] === 100000 ? "100" + NB + "000" : p[0]) + ". " + p[1] + " " + p[2] + " = ? cm", ans + NB + "cm",
      nums(ans, [ans * 10, ans / 10, p[1] * p[0] <= 9999 ? p[1] * p[0] : ans * 100], 1, function(x) { var t = kg(Math.round(x * 100), 100); return t === null ? null : t + NB + "cm"; }),
      p[1] + " " + p[2] + " = " + realCm + " cm. " + realCm + " : " + p[0] + " = " + ans + " cm op de kaart.");
  });
})();

// ── Blok 8: per eenheid ───────────────────────────────────────────
(function() {
  [[3, 1200], [2, 900], [4, 1000], [5, 1500], [2, 700], [3, 750], [4, 1400], [6, 1800]].forEach(function(p) {
    var per = p[1] / p[0];
    put("p31", p[0] + " kg kost " + eurQ(p[1]) + ". Per kg?", eurQ(per), euros(per, [p[1] * p[0], p[1] - p[0] * 100, p[1]], 50),
      eurQ(p[1]) + " : " + p[0] + " = " + eurQ(per) + " per kg.");
  });
  [[500, 300], [500, 450], [250, 200], [500, 175], [250, 350]].forEach(function(p) {
    var per = p[1] * 1000 / p[0];
    put("p31", p[0] + " g kost " + eurQ(p[1]) + ". Per kg?", eurQ(per), euros(per, [p[1] / 2, p[1], per * 2], 50),
      "1 kg = " + 1000 / p[0] + TIMES + p[0] + " g. " + eurQ(p[1]) + TIMES + 1000 / p[0] + " = " + eurQ(per) + ".");
  });
  [[120, 2], [180, 3], [100, 4], [90, 3], [240, 4], [150, 2], [60, 4], [200, 5]].forEach(function(p) {
    var v = p[0] / p[1];
    put("p32", p[0] + " km in " + p[1] + " uur. Per uur?", v + NB + "km/u", nums(v, [p[0] * p[1], p[0] - p[1], p[0]], 5, function(x) { return x % 1 === 0 ? x + NB + "km/u" : null; }, 9),
      p[0] + " : " + p[1] + " = " + v + " km per uur.");
  });
  [[15, 30], [10, 30], [20, 30], [5, 15], [8, 30], [12, 15]].forEach(function(p) {
    var v = p[0] * 60 / p[1];
    put("p32", "In " + p[1] + " min " + p[0] + " km. Per uur?", v + NB + "km/u", nums(v, [p[0], p[0] + p[1], v * 2], 5, function(x) { return x % 1 === 0 ? x + NB + "km/u" : null; }, 9),
      "1 uur = " + 60 / p[1] + TIMES + p[1] + " min. " + p[0] + TIMES + 60 / p[1] + " = " + v + " km per uur.");
  });
  // p33: drie aanbiedingen, één is per kg het goedkoopst (verschil per kg steeds minstens € 0,50)
  [[[1000, 600], [500, 200], [2000, 1400]], [[500, 300], [1000, 500], [250, 200]], [[2000, 900], [1000, 600], [500, 250]], [[250, 150], [500, 350], [1000, 500]],
   [[1000, 800], [500, 350], [2000, 1800]], [[500, 400], [250, 250], [1000, 650]], [[1000, 400], [2000, 900], [500, 250]], [[250, 100], [500, 300], [1000, 550]]].forEach(function(o) {
    var per = o.map(function(x) { return x[1] * 1000 / x[0]; }), best = per.indexOf(Math.min.apply(null, per));
    function lbl(x) { return x[0] >= 1000 ? x[0] / 1000 + NB + "kg" : x[0] + NB + "g"; }
    var offers = o.map(function(x) { return lbl(x) + " " + eurQ(x[1]); });
    put("p33", "Welke is per kg het goedkoopst?", offers[best], offers.concat(["even duur"]),
      "Per kg: " + offers.map(function(t, i) { return t + " = " + eurQ(per[i]); }).join(", ") + ". " + offers[best] + " is het goedkoopst.", "lang");
  });
})();

// ── Blok 9: toepassen ─────────────────────────────────────────────
(function() {
  // p34: schatten. Rond procent en getal af op een handig getal; eerlijk: de echte uitkomst ligt
  // strikt dichter bij het goede antwoord dan bij elke andere keuze.
  [[19, 61, 20, 60], [21, 39, 20, 40], [49, 82, 50, 80], [51, 118, 50, 120], [9, 312, 10, 300], [11, 198, 10, 200], [24, 81, 25, 80], [26, 39, 25, 40],
   [49, 61, 50, 60], [19, 152, 20, 150], [10, 489, 10, 500], [25, 199, 25, 200]].forEach(function(p) {
    var est = p[2] * p[3] / 100, step = est >= 40 ? 10 : 5, ch = [est, est + step, est - step > 0 ? est - step : est + 2 * step, est + 2 * step === (est - step > 0 ? est - step : est + 2 * step) ? est + 3 * step : (est - step > 0 ? est + 2 * step : est + 3 * step)];
    put("p34", "Ongeveer: " + p[0] + "% van " + p[1] + " ≈ ?", String(est), ch.map(String),
      "Rond af: " + p[0] + "% wordt " + p[2] + "% en " + p[1] + " wordt " + p[3] + ". " + p[2] + "% van " + p[3] + " = " + est + ".");
  });
  // p35: kort verhaal
  [["Klas van 25, 40% fietst. Fietsers?", 10, [40, 15, 4]], ["Klas van 30, 10% is ziek. Zieken?", 3, [10, 27, 30]], ["Toets: 20 vragen, 75% goed. Goed?", 15, [75, 5, 25]],
   ["40 leerlingen, 25% loopt. Lopers?", 10, [25, 30, 4]], ["Zak van 50 snoep, 20% rood. Rood?", 10, [20, 40, 5]], ["Team van 20, 50% traint. Hoeveel?", 10, [50, 20, 5]],
   ["80 tickets, 75% verkocht. Verkocht?", 60, [75, 20, 8]], ["60 vragen, 10% fout. Fout?", 6, [10, 54, 60]]].forEach(function(p) {
    put("p35", p[0], String(p[1]), nums(p[1], p[2]), "Reken het percentage uit van het totaal: " + p[1] + ".");
  });
  [["Toets van 20: 15 goed. Procent?", 75], ["Klas van 25: 5 ziek. Procent?", 20], ["50 lootjes, 10 prijs. Procent?", 20], ["40 appels, 10 rot. Procent?", 25], ["20 dagen, 4 regen. Procent?", 20], ["30 vragen, 27 goed. Procent?", 90]].forEach(function(p) {
    var m = /(\d+)[^\d]+(\d+)/.exec(p[0]), part = Number(m[2]), tot = Number(m[1]);
    put("p35", p[0], pct(p[1]), pcts(p[1], [part, 100 - p[1], p[1] + 10]), part + " van de " + tot + " = " + p[1] + "%.");
  });
  // p36: fout spotten (één foute regel tussen drie juiste)
  var GOOD = [], BAD = [];
  [[50, 1, 2], [25, 1, 4], [75, 3, 4], [20, 1, 5], [10, 1, 10]].forEach(function(k) {
    // Fout: p% = 1/p. Bij 10% is dat toevallig goed, daar is de fout 10% = 1/100
    GOOD.push(k[0] + "% = " + k[1] + "/" + k[2]); BAD.push([k[0] + "% = 1/" + (k[0] === 10 ? 100 : k[0]), k[0] + "% = " + k[1] + "/" + k[2]]);
  });
  [[40, 4], [30, 3], [70, 7], [60, 6]].forEach(function(p) { GOOD.push("0," + p[1] + " = " + p[0] + "%"); BAD.push(["0," + p[1] + " = " + p[1] + "%", "0," + p[1] + " = " + p[0] + "%"]); });
  // Fouten: het dubbele, het percentage eraf getrokken, de rest in plaats van het deel
  [[50, 30, 15, 60], [50, 80, 40, 30], [10, 70, 7, 60], [10, 40, 4, 30], [25, 40, 10, 15], [25, 80, 20, 60]].forEach(function(p) {
    var good = p[0] + "% van " + p[1] + " = " + p[2];
    GOOD.push(good);
    BAD.push([p[0] + "% van " + p[1] + " = " + p[3], good]);
  });
  BAD.forEach(function(b, i) {
    var g3 = [], k = i * 7 + 3;
    for (var t = 0; t < GOOD.length && g3.length < 3; t++) { var g = GOOD[(k + t * 4) % GOOD.length]; if (g !== b[1] && g3.indexOf(g) < 0) g3.push(g); }
    put("p36", "Welke is FOUT?", b[0], [b[0]].concat(g3), "Goed is: " + b[1] + ".", "fout");
  });
})();

// Niet-afbrekende spatie tussen getal en eenheid en na "€" in vragen en (niet fout-spot) keuzes
var UNIT_RE = /(\d) (cm|m|km|g|kg|ml|uur|min)(?=[\s:.?,]|$)/g;
Object.keys(P).forEach(function(id) { P[id].forEach(function(it) {
  it.question = it.question.replace(UNIT_RE, "$1" + NB + "$2");
  if (it.kind !== "fout") {
    it.answer = it.answer.replace(UNIT_RE, "$1" + NB + "$2");
    it.choices = it.choices.map(function(c) { return c.replace(UNIT_RE, "$1" + NB + "$2"); });
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

var G1  = "Procent begrijpen";
var G2  = "Procent van een getal";
var G3  = "Procent samengesteld";
var G4  = "Korting en verhoging";
var G5  = "Verhoudingen";
var G6  = "Verhoudingstabel";
var G7  = "Schaal";
var G8  = "Per eenheid";
var G9  = "Toepassen";
var G10 = "Slot";

var BLOCK_GROUPS = [G1, G2, G3, G4, G5, G6, G7, G8, G9];

// [id, label, groep, desc, strategy, uitleg, voorbeeld, minCorrect]
var DEFS = [
  ["p01_van_de_100", "Van de 100", G1, "37 van de 100 = 37%", "procent",
    "Procent betekent: van de 100. 37 van de 100 is 37%. Van de 10 reken je eerst om naar van de 100: 3 van de 10 = 30 van de 100 = 30%.",
    "7 van de 10: hoeveel %?\n7 van de 10 = 70 van de 100.\nAntwoord: 70%.", 8],
  ["p02_bekende_breuk", "Procent en breuk", G1, "1/4 = 25%", "omzetten",
    "Een paar procenten moet je kennen: 50% = 1/2, 25% = 1/4, 75% = 3/4, 10% = 1/10, 20% = 1/5. Een breuk naar procent: hoeveel is het van de 100?",
    "1/5 = ?%\n1/5 van 100 = 20.\nAntwoord: 20%.", 8],
  ["p03_kommagetal", "Procent en kommagetal", G1, "0,25 = 25%", "omzetten",
    "Procent is honderdsten: 25% = 25/100 = 0,25. Andersom: 0,4 = 0,40 = 40 honderdsten = 40%, niet 4%.",
    "0,6 = ?%\n0,60 = 60 honderdsten.\nAntwoord: 60%.", 8],
  ["p04_aanvullen_100", "Aanvullen tot 100%", G1, "35% rood, 65% blauw", "aanvullen",
    "Het geheel is altijd 100%. Is 35% rood, dan is de rest 100 − 35 = 65%.",
    "40% is rood, de rest blauw. Blauw?\n100 − 40.\nAntwoord: 60%.", 8],
  ["p05_vergelijken", "Vergelijken", G1, "1/4 is minder dan 30%", "zelfde vorm",
    "Schrijf alles in dezelfde vorm, bijvoorbeeld als procent: 1/4 = 25%, 0,3 = 30%, 1/5 = 20%. Daarna vergelijk je gewone getallen.",
    "Welke is het meest: 1/2, 40%, 0,3?\n50%, 40%, 30%.\nAntwoord: 1/2.", 8],
  ["p06_helft", "50% van", G2, "50% van 80 = 40", "de helft",
    "50% is de helft. 50% van 80 = 80 : 2 = 40.",
    "50% van 60 = ?\n60 : 2.\nAntwoord: 30.", 8],
  ["p07_kwart", "25% en 75% van", G2, "25% van 40 = 10", "een kwart",
    "25% is een kwart: deel door 4. 75% is 3 kwart: eerst door 4, dan keer 3. 75% van 40: 40 : 4 = 10, 3 × 10 = 30.",
    "25% van 32 = ?\n32 : 4.\nAntwoord: 8.", 8],
  ["p08_tiende", "10% van", G2, "10% van 70 = 7", "een tiende",
    "10% is een tiende: deel door 10. 10% van 70 = 7.",
    "10% van 250 = ?\n250 : 10.\nAntwoord: 25.", 8],
  ["p09_honderdste", "1% van", G2, "1% van 300 = 3", "een honderdste",
    "1% is een honderdste: deel door 100. 1% van 300 = 3.",
    "1% van 800 = ?\n800 : 100.\nAntwoord: 8.", 8],
  ["p10_via_tien", "Via 10%", G2, "30% van 60 = 18", "via 10%",
    "Reken eerst 10% uit, dan verder. 20% = 2 × 10%, 30% = 3 × 10%, 40% = 4 × 10%. 5% is de helft van 10%. Let op: 30% is niet hetzelfde als 3%.",
    "30% van 200 = ?\n10% = 20, dus 3 × 20.\nAntwoord: 60.", 8],
  ["p11_vijftien", "15% van", G3, "15% van 60 = 9", "10% + 5%",
    "15% = 10% + 5%. Reken 10% uit, neem daarvan de helft voor 5%, en tel ze op. 15% van 60: 6 + 3 = 9.",
    "15% van 80 = ?\n10% = 8, 5% = 4.\nAntwoord: 12.", 8],
  ["p12_geld", "Procent van geld", G3, "25% van € 20 = € 5", "procent van",
    "Met geld reken je net zo: 25% van € 20 is een kwart: € 5. 10% van € 45 is een tiende: € 4,50.",
    "20% van € 30 = ?\n10% = € 3, dus 2 × € 3.\nAntwoord: € 6.", 8],
  ["p13_hoeveel_procent", "Hoeveel procent?", G3, "15 van de 60 = 25%", "deel van het geheel",
    "Schrijf het deel als breuk en maak er honderdsten van. 15 van de 60 = 15/60 = 1/4 = 25/100 = 25%.",
    "12 van de 40: hoeveel %?\n12/40 = 3/10 = 30/100.\nAntwoord: 30%.", 8],
  ["p14_totaal_naar_100", "Totaal naar 100", G3, "7 van de 20 = 35%", "keer naar 100",
    "Maak het totaal 100: 20 × 5 = 100, dus ook het deel keer 5. Bij 25 is dat keer 4, bij 50 keer 2. 7 van de 20 = 35 van de 100 = 35%.",
    "9 van de 25: hoeveel %?\n25 × 4 = 100, dus 9 × 4.\nAntwoord: 36%.", 8],
  ["p15_korting", "Korting in euro's", G4, "25% korting op € 40 = € 10", "procent van",
    "De korting is het percentage van de oude prijs. 25% korting op € 40: een kwart van € 40 = € 10.",
    "10% korting op € 50: hoeveel?\nEen tiende van € 50.\nAntwoord: € 5.", 8],
  ["p16_nieuwe_prijs", "Prijs na korting", G4, "€ 40 met 25% korting = € 30", "eraf",
    "Reken eerst de korting uit en haal die van de prijs af. € 40 met 25% korting: korting € 10, nieuwe prijs € 30.",
    "€ 60 met 50% korting. Prijs?\nKorting € 30.\nAntwoord: € 30.", 8],
  ["p17_verhoging", "Prijs na verhoging", G4, "€ 40 + 10% = € 44", "erbij",
    "Reken de verhoging uit en tel die bij de prijs op. € 40 wordt 10% duurder: 10% = € 4, nieuwe prijs € 44.",
    "€ 20 wordt 25% duurder. Prijs?\n25% = € 5.\nAntwoord: € 25.", 8],
  ["p18_procent_korting", "Hoeveel procent korting?", G4, "€ 40 naar € 30 = 25%", "deel van het geheel",
    "Bereken eerst de korting in euro's en vergelijk die met de oude prijs. Van € 40 naar € 30: € 10 korting, 10/40 = 1/4 = 25%.",
    "Van € 50 naar € 40: % korting?\n€ 10 van € 50 = 1/5.\nAntwoord: 20%.", 8],
  ["p19_beste_korting", "Welke korting is meer?", G4, "25% of € 10 korting op € 60", "vergelijken",
    "Reken het percentage om naar euro's en vergelijk. Op € 60 is 25% korting € 15. Dat is meer dan € 10 korting.",
    "Op € 40: 25% of € 15 korting?\n25% van € 40 = € 10.\nAntwoord: € 15 korting.", 8],
  ["p20_verhouding_lezen", "Verhouding lezen", G5, "■■■□□: 3 : 2", "tellen",
    "Een verhouding vergelijkt twee aantallen. Bij 3 zwarte en 2 witte vakjes is de verhouding zwart : wit = 3 : 2. De volgorde doet ertoe.",
    "■■□□□□ verhouding ■ : □?\n2 zwart, 4 wit.\nAntwoord: 2 : 4.", 8],
  ["p21_deel_van_geheel", "Deel van het geheel", G5, "■■■□□: 3/5 zwart", "deel van het totaal",
    "Een deel van het geheel schrijf je als breuk: het deel boven de streep, het totaal eronder. 3 zwart van 5 vakjes = 3/5. Niet 3/2: dat is de verhouding.",
    "■□□□ welk deel is ■?\n1 van de 4.\nAntwoord: 1/4.", 8],
  ["p22_gelijkwaardig", "Gelijkwaardige verhouding", G5, "2 : 3 = 4 : 6", "keer hetzelfde",
    "Een verhouding blijft gelijk als je beide getallen met hetzelfde getal vermenigvuldigt. 2 : 3 = 4 : 6 (allebei keer 2). Niet erbij optellen.",
    "Verhouding 3 : 5 = 6 : ?\n3 × 2 = 6, dus 5 × 2.\nAntwoord: 10.", 8],
  ["p23_vereenvoudigen", "Verhouding vereenvoudigen", G5, "6 : 9 = 2 : 3", "delen door hetzelfde",
    "Deel beide getallen door hetzelfde getal tot het niet verder kan. 6 : 9 — allebei door 3 — wordt 2 : 3.",
    "Verhouding 8 : 12: zo eenvoudig?\nAllebei door 4.\nAntwoord: 2 : 3.", 8],
  ["p24_tabel_keer", "Verhoudingstabel: keer", G6, "2 pakken € 5, 6 pakken € 15", "keer hetzelfde",
    "Wordt het aantal 3 keer zo groot, dan wordt de prijs ook 3 keer zo groot. 2 pakken € 5, dus 6 pakken € 15. Niet € 4 erbij.",
    "3 schriften kosten € 2. En 6?\n2 keer zo veel.\nAntwoord: € 4.", 8],
  ["p25_tabel_via_1", "Verhoudingstabel: via 1", G6, "4 kosten € 12, 3 kosten € 9", "via 1",
    "Reken eerst uit wat 1 kost, daarna het gevraagde aantal. 4 kaartjes € 12: 1 kaartje € 3, dus 3 kaartjes € 9.",
    "5 pakken kosten € 15. En 2?\n1 pak € 3.\nAntwoord: € 6.", 8],
  ["p26_tabel_delen", "Verhoudingstabel: delen", G6, "10 kosten € 30, 2 kosten € 6", "delen door hetzelfde",
    "Wordt het aantal 5 keer zo klein, dan wordt de prijs ook 5 keer zo klein. 10 stuks € 30, dus 2 stuks € 6.",
    "8 pakken kosten € 40. En 2?\n4 keer zo weinig.\nAntwoord: € 10.", 8],
  ["p27_recept", "Recept omrekenen", G6, "4 personen 200 g, 6 personen 300 g", "via 1",
    "Reken eerst uit hoeveel er per persoon nodig is. 200 g voor 4 personen is 50 g per persoon, dus voor 6 personen 300 g.",
    "Voor 2 personen 150 g. Voor 6?\n3 keer zo veel.\nAntwoord: 450 g.", 8],
  ["p28_schaal_meter", "Schaal naar meter", G7, "1 : 100, 3 cm = 3 m", "schaal",
    "Schaal 1 : 100 betekent: 1 cm op de kaart is 100 cm in het echt. 3 cm wordt 300 cm = 3 m. Bij 1 : 1000 is 1 cm = 1000 cm = 10 m.",
    "Schaal 1 : 100. 7 cm = ? m\n7 × 100 = 700 cm.\nAntwoord: 7 m.", 8],
  ["p29_schaal_km", "Schaal naar kilometer", G7, "1 : 100 000, 1 cm = 1 km", "schaal",
    "Bij schaal 1 : 100 000 is 1 cm op de kaart 100 000 cm in het echt. Dat is 1000 m = 1 km. Dus het aantal cm is het aantal km.",
    "Schaal 1 : 100 000. 4 cm = ? km\n4 × 100 000 cm = 4 km.\nAntwoord: 4 km.", 8],
  ["p30_schaal_terug", "Schaal terugrekenen", G7, "1 : 100, 5 m = 5 cm", "terug rekenen",
    "Reken de echte afstand om naar cm en deel door de schaal. 5 m = 500 cm, bij 1 : 100 is dat 500 : 100 = 5 cm op de kaart.",
    "Schaal 1 : 1000. 40 m = ? cm\n4000 cm : 1000.\nAntwoord: 4 cm.", 8],
  ["p31_per_kilo", "Prijs per kilo", G8, "3 kg € 12, per kg € 4", "via 1",
    "Deel de prijs door het aantal kilo. 3 kg voor € 12: € 12 : 3 = € 4 per kg. Bij 500 g: dat is een halve kilo, dus per kg het dubbele.",
    "2 kg kost € 8. Per kg?\n€ 8 : 2.\nAntwoord: € 4.", 8],
  ["p32_snelheid", "Kilometer per uur", G8, "120 km in 2 uur = 60 km per uur", "via 1",
    "Snelheid is hoeveel km je in 1 uur aflegt. 120 km in 2 uur: 120 : 2 = 60 km per uur. In 30 min 15 km: in 1 uur het dubbele, 30 km.",
    "90 km in 3 uur. Per uur?\n90 : 3.\nAntwoord: 30 km.", 8],
  ["p33_goedkoopst", "Goedkoopst per kilo", G8, "1 kg € 6 of 500 g € 2?", "vergelijken",
    "Reken elke aanbieding om naar de prijs per kg en vergelijk. 500 g € 2 is € 4 per kg, dat is goedkoper dan 1 kg € 6.",
    "1 kg € 5 of 500 g € 3?\n500 g € 3 = € 6 per kg.\nAntwoord: 1 kg € 5.", 8],
  ["p34_schatten", "Schatten met procenten", G9, "19% van 61 ≈ 12", "afronden",
    "Rond af naar handige getallen en reken dan. 19% van 61 wordt 20% van 60 = 12.",
    "Ongeveer: 51% van 79 ≈ ?\n50% van 80.\nAntwoord: 40.", 8],
  ["p35_kort_verhaal", "Kort verhaal", G9, "Klas van 25, 40% fietst: 10", "toepassen",
    "Zoek uit wat gevraagd wordt: een aantal of een percentage. Klas van 25, 40% fietst: 40% van 25 = 10 leerlingen.",
    "Toets van 20 vragen, 15 goed. Procent?\n15 van de 20.\nAntwoord: 75%.", 8],
  ["p36_fout_spotten", "Fout spotten: procenten", G9, "0,4 = 4% is fout", "controleren",
    "Veel gemaakte fouten: 0,4 = 4% (goed is 40%), 25% = 1/25 (goed is 1/4), 50% van 80 = 30 (je haalde er 50 af; goed is 40).",
    "Welke is FOUT?\n0,3 = 3% → goed is 30%.\nDie is fout.", 12],
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
    // Pool via het korte ID (p01), stapel per volledige skill-ID
    make:       function() { return pick(poolId, d[0]); },
  };
});

// ─────────────────────────────────────────────────────────────────
// SKILLS MET VRAAGVERLOOP + p37 SNELHEIDSRONDE
// ─────────────────────────────────────────────────────────────────

// Typen (Kiezen | Typen): per vaardigheid het type van het antwoord. Vragen met een andere vorm dan het
// type (p02: breuk; p03: procent; p35: procent) blijven per vraag vanzelf kiezen (resolveInput).
// Blijven kiezen: p05, p19, p33 (kiesvragen), p20, p23 (verhouding), p21 (breuk), p27-p30 en p32
// (eenheid), p34 (schatten), p36 (fout spotten). p37 typt per vraag volgens zijn bron. Vragen veranderen niet.
var TYPEN = {
  p01_van_de_100: "percent", p02_bekende_breuk: "percent", p04_aanvullen_100: "percent", p13_hoeveel_procent: "percent",
  p14_totaal_naar_100: "percent", p18_procent_korting: "percent",
  p03_kommagetal: "decimal",
  p06_helft: "number", p07_kwart: "number", p08_tiende: "number", p09_honderdste: "number", p10_via_tien: "number",
  p11_vijftien: "number", p22_gelijkwaardig: "number", p35_kort_verhaal: "number",
  p12_geld: "money", p15_korting: "money", p16_nieuwe_prijs: "money", p17_verhoging: "money", p24_tabel_keer: "money",
  p25_tabel_via_1: "money", p26_tabel_delen: "money", p31_per_kilo: "money",
};
RAW_SKILLS.forEach(function(s) {
  var t = TYPEN[s.id];
  if (!t) return;
  s.inputType = t;
  if (t === "decimal") s.inputConfig = { maxDecimals: 3 };
  if (t === "money") s.inputConfig = { maxDecimals: 2 };
});

var SKILLS = createSkills("procenten", RAW_SKILLS);
var MIXER  = createMixer(RAW_SKILLS, BLOCK_GROUPS, SKILLS.byId);

export var PROCENT_SKILLS = SKILLS.list;

registerSkillId("procenten", "p37_snelheid");

PROCENT_SKILLS.push({
  id:         "p37_snelheid",
  label:      "Snelheidsronde",
  group:      G10,
  desc:       "Gemengd: procenten, verhoudingen en schaal",
  strategy:   "snel",
  tip:        "Kijk eerst wat er gevraagd wordt: een procent, een deel, een verhouding of een schaal. Kies dan de handigste aanpak.",
  uitleg:     "In de snelheidsronde komen alle soorten vragen over procenten en verhoudingen door elkaar voorbij. Kies per vraag de aanpak die je hebt geleerd.",
  voorbeeld:  "Gemengd, bijvoorbeeld:\n25% van 40, 2 : 3 = 4 : ?, schaal 1 : 100",
  minCorrect: 15,
  generate:   MIXER.generate,
});

export var PROCENT_ORDER = PROCENT_SKILLS.map(function(s) { return s.id; });

// Voor tests: de vaste pools (alleen lezen)
export var PROCENT_POOLS = P;
