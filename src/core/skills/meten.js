// Onderdeel Meten (groep Praktisch rekenen): skills, volgorde en vaste vraagpools (ontwerp B1).
// NO BACKTICKS / TEMPLATE LITERALS anywhere in this file.
//
// Het vraagverloop (rekenmoment, stapels, gemengde ronde) staat in ./flow.js.
// Intern rekent alles in gehele getallen: lengte in mm of cm, gewicht in g, inhoud in ml.
// Notatie (B1):
//   - komma als decimaalteken, kortste vorm, maximaal 2 decimalen
//   - tussen getal en eenheid een niet-afbrekende spatie (NB), zodat "1,5 l" nooit breekt
//   - antwoorden en keuzes maximaal 7 tekens; fout-spot-regels maximaal 16 tekens
//   - eenheden: mm, cm, dm, m, km; g, kg; ml, cl, dl, l; cm², m², cm³, m³ (geen ton, mg, hm, dam)
// Elke skill heeft een vaste, nagekeken pool. Alle skills trekken via deckPick: elke vraag komt
// één keer langs voordat de stapel opnieuw wordt geschud, en nooit direct dezelfde vraag als de
// vorige (ook niet bij kleine pools). Elke vraag heeft 4 keuzes met 4 verschillende waarden.

import { shuffle } from "./helpers.js";
import { registerSkillId, createSkills, createMixer, deckPick } from "./flow.js";

var NB    = "\u00a0";
var MIN   = "−";
var TIMES = " × ";
var FULL  = "■";

// ─────────────────────────────────────────────────────────────────
// NOTATIE-HELPERS
// ─────────────────────────────────────────────────────────────────

// v / div als kortste kommagetal (max 2 decimalen), anders null. fmt(1500, 1000) -> "1,5"
function fmt(v, div) {
  var x = v / div;
  var h = Math.round(x * 100);
  if (Math.abs(h - x * 100) > 1e-9) return null;
  var e = Math.floor(h / 100);
  var r = h % 100;
  if (r === 0) return String(e);
  return e + "," + (r % 10 === 0 ? String(r / 10) : (r < 10 ? "0" + r : String(r)));
}

function num(v) { return fmt(v, 1); }

// Getal met eenheid, niet-afbrekend: U(1.5, "l") -> "1,5 l"
function U(n, u) { return String(n).replace(".", ",") + NB + u; }

// Uniek: eerste voorkomen blijft
function uniq(list) {
  return list.filter(function(x, i, arr) { return arr.indexOf(x) === i; });
}

// Vier getalkeuzes: antwoord + geldige kandidaten (uniek, > 0, ≤ 7 tekens), daarna reserve ± stap
function pickN(ans, cands, fmtFn, step) {
  var out  = [fmtFn(ans)];
  var seen = {};
  seen[ans] = true;
  function tryAdd(c) {
    if (out.length >= 4 || c === null || c === undefined || c <= 0 || seen[c]) return;
    var f = fmtFn(c);
    if (f === null || f.length > 7) return;
    seen[c] = true;
    out.push(f);
  }
  cands.forEach(tryAdd);
  var st = step || (ans >= 1000 ? 100 : ans >= 100 ? 10 : 1);
  for (var k = 1; k < 60 && out.length < 4; k++) { tryAdd(ans + k * st); tryAdd(ans - k * st); }
  return out;
}

// ─────────────────────────────────────────────────────────────────
// VASTE POOLS (één keer opgebouwd bij het laden)
// Een item: { question, answer, choices, tip } — tip is de korte uitleg bij deze vraag.
// ─────────────────────────────────────────────────────────────────

var P = {};

function put(id, question, answer, choices, tip, extra) {
  var list = P[id] || (P[id] = []);
  var item = { question: question, answer: answer, choices: choices, tip: tip };
  if (extra) { for (var k in extra) { if (Object.prototype.hasOwnProperty.call(extra, k)) item[k] = extra[k]; } }
  list.push(item);
}

// Omrekenvraag met kaal getal als antwoord (eenheid staat in de vraag)
function conv(id, question, ansV, cands, tip) {
  put(id, question, num(ansV), pickN(ansV, cands, num), tip);
}

// ── Blok 1: maten kennen ──────────────────────────────────────────

var ORDER_TIP = "1" + NB + "km = 1000" + NB + "m, 1" + NB + "m = 100" + NB + "cm en 1" + NB + "cm = 10" + NB + "mm.";
var UNIT_TIP  = "Heel klein: mm. Klein: cm. Groot: m. Heel ver: km.";

[["Lengte van een potlood", "cm"], ["Hoogte van een deur", "m"], ["Afstand tussen twee steden", "km"],
 ["Dikte van een munt", "mm"], ["Lengte van een voetbalveld", "m"], ["Lengte van je duim", "cm"],
 ["Lengte van een mier", "mm"], ["Lengte van een fietstocht", "km"], ["Breedte van een schrift", "cm"],
 ["Lengte van een zwembad", "m"]].forEach(function(it) {
  put("m01", it[0] + ": eenheid?", it[1], ["mm", "cm", "m", "km"], UNIT_TIP);
});
["langst", "kortst"].forEach(function(w) {
  put("m01", "Welke is het " + w + "?", w === "langst" ? U(1, "km") : U(1, "mm"),
    [U(1, "mm"), U(1, "cm"), U(1, "m"), U(1, "km")], ORDER_TIP);
});

// Realistisch schatten: vaste nagekeken lijsten, afleiders minstens een factor 10 ernaast
function realTip(ans) { return "Stel het je voor: ongeveer " + ans + ". De andere keuzes zijn veel te groot of te klein."; }

[["Hoe lang is een potlood ongeveer?", 15, "cm", [[15, "m"], [15, "mm"], [15, "km"]]],
 ["Hoe hoog is een deur ongeveer?", 2, "m", [[2, "cm"], [2, "km"], [20, "m"]]],
 ["Een voetbalveld is ongeveer?", 100, "m", [[100, "cm"], [100, "km"], [10, "m"]]],
 ["Hoe lang is een mier ongeveer?", 5, "mm", [[5, "cm"], [5, "m"], [50, "cm"]]],
 ["Hoe lang is een A4-blad ongeveer?", 30, "cm", [[30, "mm"], [30, "m"], [3, "m"]]],
 ["Hoe lang is een auto ongeveer?", 4, "m", [[4, "cm"], [40, "m"], [4, "km"]]],
 ["Hoe hoog is een tafel ongeveer?", 75, "cm", [[75, "mm"], [75, "m"], [7, "m"]]],
 ["Een klaslokaal is ongeveer?", 8, "m", [[8, "cm"], [80, "m"], [8, "km"]]],
 ["Nederland is ongeveer?", 300, "km", [[300, "m"], [30, "m"], [3, "km"]]],
 ["Een rijstkorrel is ongeveer?", 5, "mm", [[5, "cm"], [5, "km"], [5, "m"]]]].forEach(function(it) {
  var ans = U(it[1], it[2]);
  put("m02", it[0], ans, [ans].concat(it[3].map(function(d) { return U(d[0], d[1]); })), realTip(ans));
});

[["een appel", 150, "g", [[150, "kg"], [15, "kg"], [1500, "g"]]],
 ["een volwassene", 75, "kg", [[75, "g"], [750, "kg"], [7, "kg"]]],
 ["een pak suiker", 1, "kg", [[1, "g"], [10, "kg"], [10, "g"]]],
 ["een fiets", 15, "kg", [[15, "g"], [150, "kg"], [1, "kg"]]],
 ["een potlood", 5, "g", [[5, "kg"], [500, "g"], [50, "kg"]]],
 ["een ei", 60, "g", [[60, "kg"], [6, "kg"], [600, "g"]]],
 ["een schooltas", 5, "kg", [[5, "g"], [50, "kg"], [500, "g"]]],
 ["een brood", 800, "g", [[800, "kg"], [80, "g"], [8, "kg"]]]].forEach(function(it) {
  var ans = U(it[1], it[2]);
  put("m03", "Hoe zwaar is " + it[0] + "?", ans, [ans].concat(it[3].map(function(d) { return U(d[0], d[1]); })), realTip(ans));
});

[["een pak melk", 1, "l", [[1, "ml"], [10, "l"], [1, "dl"]]],
 ["een emmer", 10, "l", [[10, "ml"], [100, "l"], [1, "dl"]]],
 ["een glas", 250, "ml", [[250, "l"], [25, "ml"], [25, "l"]]],
 ["een theelepel", 5, "ml", [[5, "l"], [50, "ml"], [5, "dl"]]],
 ["een blikje", 330, "ml", [[330, "l"], [33, "ml"], [33, "l"]]],
 ["een badkuip", 150, "l", [[150, "ml"], [15, "ml"], [15, "dl"]]],
 ["een gieter", 5, "l", [[5, "ml"], [50, "l"], [5, "cl"]]],
 ["een fles frisdrank", 1.5, "l", [[1.5, "ml"], [15, "l"], [15, "ml"]]]].forEach(function(it) {
  var ans = U(it[1], it[2]);
  put("m04", "Hoeveel past in " + it[0] + "?", ans, [ans].concat(it[3].map(function(d) { return U(d[0], d[1]); })), realTip(ans));
});

// ── Blok 2: lengte omrekenen ──────────────────────────────────────

(function() {
  var a, c;
  for (a = 1; a <= 20; a++) {
    conv("m05", a + " m = ? cm", a * 100, [a * 10, a * 1000, a * 100 + 100], "1 m = 100 cm: " + a + TIMES + "100 = " + a * 100 + ".");
    conv("m05", a * 100 + " cm = ? m", a, [a * 10, a * 100, a + 1], "100 cm = 1 m: " + a * 100 + " : 100 = " + a + ".");
  }
  for (a = 1; a <= 9; a++) {
    for (c = 5; c <= 95; c += 5) {
      conv("m05", a + " m " + c + " cm = ? cm", a * 100 + c, [a * 10 + c, a * 1000 + c, a * 100 + c + 10], a + " m = " + a * 100 + " cm. Plus " + c + " cm = " + (a * 100 + c) + " cm.");
    }
  }
  for (a = 1; a <= 30; a++) {
    conv("m06", a + " cm = ? mm", a * 10, [a * 100, a, a * 10 + 10], "1 cm = 10 mm: " + a + TIMES + "10 = " + a * 10 + ".");
    conv("m06", a * 10 + " mm = ? cm", a, [a * 10, a * 100, a + 1], "10 mm = 1 cm: " + a * 10 + " : 10 = " + a + ".");
  }
  for (a = 1; a <= 20; a++) {
    conv("m07", a + " km = ? m", a * 1000, [a * 100, a * 10000, a * 10], "1 km = 1000 m: " + a + TIMES + "1000 = " + a * 1000 + ".");
    conv("m07", a * 1000 + " m = ? km", a, [a * 10, a * 100, a + 1], "1000 m = 1 km: " + a * 1000 + " : 1000 = " + a + ".");
  }
  for (a = 1; a <= 9; a++) {
    conv("m08", a + ",5 m = ? cm", a * 100 + 50, [a * 10 + 5, a * 1000 + 500, a * 100 + 5], a + " m = " + a * 100 + " cm en 0,5 m = 50 cm. Samen " + (a * 100 + 50) + " cm.");
    conv("m08", a + ",5 km = ? m", a * 1000 + 500, [a * 100 + 50, a * 1000 + 5, a * 1000 + 50], a + " km = " + a * 1000 + " m en 0,5 km = 500 m. Samen " + (a * 1000 + 500) + " m.");
    // Afleiders: keer 100 (150), niet omgerekend (1,5), ",5" er gewoon achter gezet (105)
    put("m08", a + ",5 cm = ? mm", num(a * 10 + 5), [num(a * 10 + 5), num(a * 100 + 50), a + ",5", num(a * 100 + 5)], a + " cm = " + a * 10 + " mm en 0,5 cm = 5 mm. Samen " + (a * 10 + 5) + " mm.");
    [25, 75].forEach(function(d) {
      var v = a * 100 + d;
      // Afleiders: delen door 10 (12,5), niet omgerekend (125), de hele meter vergeten (0,25)
      put("m08", v + " cm = ? m", fmt(v, 100), [fmt(v, 100), fmt(v, 10), num(v), fmt(d, 100)], "100 cm = 1 m: " + v + " : 100 = " + fmt(v, 100) + ".");
    });
  }
  for (a = 1; a <= 9; a++) {
    conv("m09", a + " dm = ? cm", a * 10, [a * 100, a, a * 10 + 10], "1 dm = 10 cm: " + a + TIMES + "10 = " + a * 10 + ".");
    conv("m09", a * 10 + " cm = ? dm", a, [a * 10, a * 100, a + 1], "10 cm = 1 dm: " + a * 10 + " : 10 = " + a + ".");
  }
  for (a = 1; a <= 9; a++) {
    conv("m09", a + " m = ? dm", a * 10, [a * 100, a, a * 1000], "1 m = 10 dm: " + a + TIMES + "10 = " + a * 10 + ".");
  }
})();

// ── Blok 3: gewicht ───────────────────────────────────────────────

(function() {
  var a, v;
  for (a = 1; a <= 20; a++) {
    conv("m10", a + " kg = ? g", a * 1000, [a * 100, a * 10000, a * 10], "1 kg = 1000 g: " + a + TIMES + "1000 = " + a * 1000 + ".");
    conv("m10", a * 1000 + " g = ? kg", a, [a * 10, a * 100, a + 1], "1000 g = 1 kg: " + a * 1000 + " : 1000 = " + a + ".");
  }
  for (a = 0; a <= 9; a++) {
    [250, 500, 750].forEach(function(d) {
      var w = a * 1000 + d;
      if (w < 1000) return;
      put("m11", fmt(w, 1000) + " kg = ? g", num(w), pickN(w, [a * 100 + d / 10, a * 1000 + d / 10, w + 1000], num),
        "1 kg = 1000 g: " + fmt(w, 1000) + TIMES + "1000 = " + w + ".");
    });
  }
  for (v = 100; v <= 4900; v += (v < 1000 ? 50 : 250)) {
    if (v % 1000 === 0) continue;
    var f = fmt(v, 1000);
    if (f === null) continue;
    var cands = [v * 10, v / 10, v + 1000, v * 100].filter(function(x) { return x % 10 === 0 && x < 100000; });
    put("m12", v + " g = ? kg", f, pickN(v, cands, function(x) { return fmt(x, 1000); }, 250),
      (v < 1000 ? v + " g is minder dan 1 kg, dus 0 en een komma. " : "") + "1000 g = 1 kg: " + v + " : 1000 = " + f + ".");
  }
})();

// ── Blok 4: inhoud ────────────────────────────────────────────────

(function() {
  var a;
  for (a = 1; a <= 20; a++) {
    conv("m13", a + " l = ? ml", a * 1000, [a * 100, a * 10000, a * 10], "1 l = 1000 ml: " + a + TIMES + "1000 = " + a * 1000 + ".");
    conv("m13", a * 1000 + " ml = ? l", a, [a * 10, a * 100, a + 1], "1000 ml = 1 l: " + a * 1000 + " : 1000 = " + a + ".");
  }
  for (a = 1; a <= 9; a++) {
    conv("m14", a + " l = ? dl", a * 10, [a * 100, a, a * 1000], "1 l = 10 dl: " + a + TIMES + "10 = " + a * 10 + ".");
    conv("m14", a + " l = ? cl", a * 100, [a * 10, a * 1000, a], "1 l = 100 cl: " + a + TIMES + "100 = " + a * 100 + ".");
    conv("m14", a + " dl = ? ml", a * 100, [a * 10, a * 1000, a], "1 dl = 100 ml: " + a + TIMES + "100 = " + a * 100 + ".");
    conv("m14", a * 5 + " cl = ? ml", a * 50, [a * 500, a * 5, a * 50 + 10], "1 cl = 10 ml: " + a * 5 + TIMES + "10 = " + a * 50 + ".");
  }
  for (a = 0; a <= 9; a++) {
    [250, 500, 750].forEach(function(d) {
      var v = a * 1000 + d;
      if (v >= 1000) {
        put("m15", fmt(v, 1000) + " l = ? ml", num(v), pickN(v, [a * 100 + d / 10, a * 1000 + d / 10, v + 1000], num),
          "1 l = 1000 ml: " + fmt(v, 1000) + TIMES + "1000 = " + v + ".");
      }
      put("m15", v + " ml = ? l", fmt(v, 1000), pickN(v, [v * 10, v / 10, v + 1000], function(x) { return fmt(x, 1000); }, 250),
        (v < 1000 ? v + " ml is minder dan 1 l, dus 0 en een komma. " : "") + "1000 ml = 1 l: " + v + " : 1000 = " + fmt(v, 1000) + ".");
    });
  }
})();

// ── Blok 5: vergelijken met verschillende eenheden ────────────────
// set: [[getal, eenheid], ...]; units: eenheid -> waarde in de tip-eenheid

function cmpSets(id, list, units, baseUnit, questions) {
  list.forEach(function(set) {
    var vals = set.map(function(x) { return Math.round(x[0] * units[x[1]]); });
    var ch   = set.map(function(x) { return U(x[0], x[1]); });
    var tip  = "Alles in " + baseUnit + ": " + vals.map(function(v, i) { return ch[i] + " = " + num(v) + " " + baseUnit; }).join(", ") + ".";
    [0, 1].forEach(function(j) {
      var best = j === 0 ? Math.max.apply(null, vals) : Math.min.apply(null, vals);
      put(id, questions[j], ch[vals.indexOf(best)], ch, tip);
    });
  });
}

(function() {
  var L16 = [], G17 = [], I18 = [];
  for (var k = 1; k <= 9; k++) {
    L16.push([[k + 0.2, "m"], [k * 100 - 5, "cm"], [k * 1000 + 50, "mm"], [k, "m"]]);
    L16.push([[k * 10 + 5, "cm"], [k * 100 + 20, "mm"], [(k * 100 + 80) / 1000, "m"], [k * 10, "cm"]]);
    G17.push([[k + 0.5, "kg"], [k * 1000 - 100, "g"], [k * 1000 + 200, "g"], [k, "kg"]]);
    I18.push([[k + 0.5, "l"], [k * 1000 - 250, "ml"], [k * 10 + 2, "dl"], [k, "l"]]);
  }
  cmpSets("m16", L16, { mm: 0.1, cm: 1, m: 100 }, "cm", ["Welke is het langst?", "Welke is het kortst?"]);
  cmpSets("m17", G17, { g: 1, kg: 1000 }, "g", ["Welke is het zwaarst?", "Welke is het lichtst?"]);
  cmpSets("m18", I18, { ml: 1, dl: 100, l: 1000 }, "ml", ["Waar zit het meest in?", "Waar zit het minst in?"]);
})();

// ── Blok 6: rekenen met maten ─────────────────────────────────────

(function() {
  var a, c, g;
  for (a = 1; a <= 4; a++) {
    for (c = 5; c <= 95; c += 5) {
      var s = a * 100 + 50 + c;
      conv("m19", a + ",5 m + " + c + " cm = ? cm", s, [a * 100 + 5 + c, s + 10, s - 10],
        a + ",5 m = " + (a * 100 + 50) + " cm. Plus " + c + " cm = " + s + " cm.");
    }
  }
  for (a = 1; a <= 9; a++) {
    for (c = 5; c <= 95; c += 5) {
      var d = a * 100 - c;
      conv("m20", a + " m " + MIN + " " + c + " cm = ? cm", d, [a * 100 + c, d + 10, d - 10, d + 20],
        a + " m = " + a * 100 + " cm. Min " + c + " cm = " + d + " cm.");
    }
  }
  for (a = 1; a <= 4; a++) {
    for (g = 50; g <= 950; g += 50) {
      var m = a * 1000 - g, p = a * 1000 + g;
      conv("m21", a + " kg " + MIN + " " + g + " g = ? g", m, [p, a * 100 - g > 0 ? a * 100 - g : null, m + 100, m - 100],
        a + " kg = " + a * 1000 + " g. Min " + g + " g = " + m + " g.");
      conv("m21", a + " kg + " + g + " g = ? g", p, [a * 100 + g, p + 100, p - 100],
        a + " kg = " + a * 1000 + " g. Plus " + g + " g = " + p + " g.");
    }
  }
  [[1000, [4, 5, 8, 10]], [1500, [2, 3, 4, 5, 6, 10]], [2000, [4, 5, 8, 10]], [750, [3, 5]], [500, [2, 4, 5]], [1200, [4, 6, 8]]].forEach(function(pp) {
    pp[1].forEach(function(n) {
      var per  = pp[0] / n;
      var next = pp[0] / (n + 1);
      put("m22", fmt(pp[0], 1000) + " l over " + n + " glazen: ml per glas?", num(per),
        pickN(per, [next % 1 === 0 ? next : null, per * 10, per + 50, per - 50], num),
        fmt(pp[0], 1000) + " l = " + pp[0] + " ml. " + pp[0] + " : " + n + " = " + per + " ml.");
    });
  });
  for (var n = 2; n <= 8; n++) {
    [125, 150, 200, 250, 300, 400, 500, 750].forEach(function(w) {
      var t = n * w;
      if (t > 9999) return;
      conv("m23", n + TIMES + w + " g = ? g", t, [t + w, t - w, t / 10, t * 10 < 100000 ? t * 10 : null],
        n + TIMES + w + " = " + t + " g.");
      if (t % 250 === 0 && t >= 1000) {
        put("m23", n + TIMES + w + " g = ? kg", fmt(t, 1000), pickN(t, [t + w, t - w, t * 10, t / 10], function(x) { return fmt(x, 1000); }, 250),
          n + TIMES + w + " = " + t + " g. 1000 g = 1 kg, dus " + fmt(t, 1000) + " kg.");
      }
    });
  }
})();

// ── Blok 7: omtrek ────────────────────────────────────────────────

(function() {
  var l, b, z;
  for (l = 3; l <= 15; l++) {
    for (b = 2; b < l; b++) {
      var o = 2 * (l + b);
      put("m24", "Rechthoek " + l + " cm bij " + b + " cm. Omtrek?", U(o, "cm"),
        uniq([U(o, "cm"), U(l + b, "cm"), U(l * b, "cm"), U(o + 2, "cm")]).concat([U(o + 4, "cm")]).slice(0, 4),
        "Omtrek = alle zijden samen: " + l + " + " + b + " + " + l + " + " + b + " = " + o + " cm.");
    }
  }
  for (z = 2; z <= 25; z++) {
    put("m25", "Vierkant met zijde " + z + " m. Omtrek?", U(4 * z, "m"),
      uniq([U(4 * z, "m"), U(2 * z, "m"), U(z * z, "m"), U(4 * z + 4, "m")]).concat([U(4 * z + 8, "m")]).slice(0, 4),
      "Een vierkant heeft 4 gelijke zijden: 4" + TIMES + z + " = " + 4 * z + " m.");
    put("m26", "Vierkant, omtrek " + 4 * z + " cm. Zijde?", U(z, "cm"),
      [U(z, "cm"), U(2 * z, "cm"), U(4 * z, "cm"), U(z + 1, "cm")],
      "4 gelijke zijden: " + 4 * z + " : 4 = " + z + " cm.");
  }
})();

// ── Blok 8: oppervlakte ───────────────────────────────────────────

(function() {
  var r, c, l, b, z;
  // m27: 2–4 rijen van hooguit 5 hokjes (kolomweergave)
  for (r = 2; r <= 4; r++) {
    for (c = 2; c <= 5; c++) {
      var rows = [];
      for (var i = 0; i < r; i++) rows.push(FULL.repeat(c));
      put("m27", rows.join("\n") + "\nElk hokje 1 cm². Samen?", U(r * c, "cm²"),
        uniq([U(r * c, "cm²"), U(2 * (r + c), "cm²"), U(r + c, "cm²"), U(r * c + 1, "cm²")]).concat([U(r * c + 2, "cm²")]).slice(0, 4),
        r + " rijen van " + c + " hokjes: " + r + TIMES + c + " = " + r * c + " cm².");
    }
  }
  for (l = 3; l <= 12; l++) {
    for (b = 2; b < l; b++) {
      put("m28", l + " m bij " + b + " m. Oppervlakte?", U(l * b, "m²"),
        uniq([U(l * b, "m²"), U(2 * (l + b), "m²"), U(l + b, "m²"), U(l * b + l, "m²")]).concat([U(l * b + b + 1, "m²")]).slice(0, 4),
        "Oppervlakte = lengte" + TIMES + "breedte: " + l + TIMES + b + " = " + l * b + " m².");
    }
  }
  for (z = 2; z <= 12; z++) {
    put("m29", "Vierkant zijde " + z + " cm. Oppervlakte?", U(z * z, "cm²"),
      uniq([U(z * z, "cm²"), U(4 * z, "cm²"), U(2 * z, "cm²"), U(z * z + z, "cm²")]).concat([U(z * z + 1, "cm²")]).slice(0, 4),
      "Oppervlakte = zijde" + TIMES + "zijde: " + z + TIMES + z + " = " + z * z + " cm².");
  }
  // m30: diagnostisch, omtrek óf oppervlakte van dezelfde rechthoek
  for (l = 3; l <= 10; l++) {
    for (b = 2; b < l; b++) {
      var O = 2 * (l + b), A = l * b;
      if (O === A) continue;
      put("m30", l + " bij " + b + " cm. Omtrek?", U(O, "cm"),
        uniq([U(O, "cm"), U(A, "cm²"), U(l + b, "cm"), U(A, "cm")]),
        "Omtrek is de rand: " + l + " + " + b + " + " + l + " + " + b + " = " + O + " cm. Oppervlakte (" + A + " cm²) is de binnenkant.");
      put("m30", l + " bij " + b + " cm. Oppervlakte?", U(A, "cm²"),
        [U(A, "cm²"), U(O, "cm"), U(O, "cm²"), U(l + b, "cm²")],
        "Oppervlakte is de binnenkant: " + l + TIMES + b + " = " + A + " cm². Omtrek (" + O + " cm) is de rand.");
    }
  }
  // m31: lengte, oppervlakte of inhoud?
  [["Verf voor een muur", "m²"], ["Lengte van een touw", "m"], ["Zand in een zandbak", "m³"],
   ["Grootte van een tuin", "m²"], ["Hoogte van een toren", "m"], ["Water in een zwembad", "m³"],
   ["Grootte van een tegel", "cm²"], ["Breedte van een boek", "cm"], ["Inhoud van een doosje", "cm³"]].forEach(function(it) {
    var fam  = it[1].replace(/[²³]/, "");
    var opts = [fam, fam + "²", fam + "³", fam === "m" ? "km" : "mm"];
    put("m31", it[0] + ": eenheid?", it[1], opts,
      "Een lijn (lengte): " + fam + ". Een vlak (oppervlakte): " + fam + "². Een ruimte (inhoud): " + fam + "³.");
  });
})();

// ── Blok 9: toepassen, controleren, verdieping ────────────────────

(function() {
  // m32: schatten. Elke lengte afronden op hele meters, dan optellen. Alleen eerlijke vragen:
  // de schatting ligt strikt minder dan een halve meter van de echte uitkomst (zoals fairEstimate).
  var near = [];
  for (var mm = 1; mm <= 9; mm++) { [-10, -5, 5, 10].forEach(function(d) { near.push(mm * 100 + d); }); }
  near.forEach(function(x) {
    near.forEach(function(y) {
      if (y < x) return;
      var rx = Math.round(x / 100), ry = Math.round(y / 100), est = rx + ry;
      if (Math.abs((x + y) - est * 100) * 2 >= 100) return;
      var d3 = est + 2 === est - 1 ? est + 3 : (est - 1 > 0 ? est + 2 : est + 3);
      put("m32", "Ongeveer: " + fmt(x, 100) + " m + " + fmt(y, 100) + " m ≈ ?", U(est, "m"),
        [U(est, "m"), U(est + 1, "m"), U(est - 1 > 0 ? est - 1 : est + 2, "m"), U(d3, "m")],
        "Rond af op hele meters: " + fmt(x, 100) + " wordt " + rx + " en " + fmt(y, 100) + " wordt " + ry + ". Samen ongeveer " + est + " m.");
    });
  });

  // m33: kort verhaal, aantal keer een maat
  [["planken van", "m"], ["linten van", "m"], ["flessen van", "l"], ["zakken van", "kg"]].forEach(function(ctx) {
    for (var n = 2; n <= 6; n++) {
      [1250, 1500, 2500, 750].forEach(function(q) {
        var t = n * q;
        if (fmt(t, 1000) === null) return;
        var ans = U(fmt(t, 1000), ctx[1]);
        put("m33", n + " " + ctx[0] + " " + fmt(q, 1000) + " " + ctx[1] + ": samen?", ans,
          [ans, U(fmt(t + q, 1000), ctx[1]), U(fmt(t - q, 1000), ctx[1]), U(fmt(t / 10, 1000) || fmt(t + 2 * q, 1000), ctx[1])],
          n + TIMES + fmt(q, 1000) + " = " + fmt(t, 1000) + " " + ctx[1] + ".");
      });
    }
  });

  // m34: missende maat tot 1 m of 1 kg
  for (var c = 5; c <= 95; c += 5) {
    var mc = 100 - c;
    var ch = [U(mc, "cm")];
    [mc + 10, mc - 10 > 0 ? mc - 10 : mc + 20, c, 1000 - c].forEach(function(x) {
      var s = U(x, "cm");
      if (ch.length < 4 && ch.indexOf(s) < 0) ch.push(s);
    });
    if (ch.length < 4) ch.push(U(mc + 30, "cm"));
    put("m34", "? + " + c + " cm = 1 m", U(mc, "cm"), ch, "1 m = 100 cm. 100 " + MIN + " " + c + " = " + mc + " cm.");
  }
  for (var g = 50; g <= 950; g += 50) {
    var rest = 1000 - g;
    put("m34", "? + " + g + " g = 1 kg", U(rest, "g"),
      uniq([U(rest, "g"), U(rest + 100, "g"), U(100 - g > 0 ? 100 - g : 1100 - g, "g"), U(10000 - g, "g")])
        .concat([U(rest - 100 > 0 ? rest - 100 : rest + 200, "g")]).slice(0, 4),
      "1 kg = 1000 g. 1000 " + MIN + " " + g + " = " + rest + " g.");
  }

  // m35: fout spotten bij omrekenen (factor 10 fout) tussen 3 juiste omrekeningen
  var good = [], bad = [];
  for (var a = 1; a <= 9; a++) {
    good.push(a + ",5 m = " + (a * 100 + 50) + " cm"); bad.push(a + ",5 m = " + (a * 10 + 5) + " cm");
    good.push(a + " kg = " + a * 1000 + " g");        bad.push(a + " kg = " + a * 100 + " g");
    good.push(a + " l = " + a * 1000 + " ml");        bad.push(a + " l = " + a * 100 + " ml");
    good.push(a + " km = " + a * 1000 + " m");        bad.push(a + " km = " + a * 100 + " m");
  }
  bad.forEach(function(w, i) {
    var g3 = [good[(i * 7 + 3) % good.length], good[(i * 7 + 11) % good.length], good[(i * 7 + 23) % good.length]];
    put("m35", "Welke omrekening is FOUT?", w, [w].concat(g3), "Goed is: " + good[i] + ".",
      { isErrorSpotter: true, smallChoices: true });
  });

  // m36: inhoud van een doos in cm³, en 1000 cm³ = 1 l
  [[10, 10, 10], [20, 10, 5], [5, 4, 3], [10, 5, 4], [20, 20, 10], [8, 5, 5], [6, 5, 4], [10, 10, 5], [25, 10, 4], [12, 5, 5]].forEach(function(d) {
    var v = d[0] * d[1] * d[2];
    put("m36", "Doos " + d.join(TIMES) + " cm. Inhoud in cm³?", num(v),
      pickN(v, [d[0] * d[1] + d[2], 2 * (d[0] * d[1] + d[1] * d[2] + d[0] * d[2]), v * 10, v + 100], num),
      "Lengte" + TIMES + "breedte" + TIMES + "hoogte: " + d.join(TIMES) + " = " + v + " cm³.");
  });
  [1000, 2000, 3000, 500, 1500, 250].forEach(function(v) {
    put("m36", v + " cm³ = ? l", fmt(v, 1000),
      pickN(v, [v * 10, v / 10, v * 100].filter(function(x) { return x % 10 === 0 || x < 10; }), function(x) { return fmt(x, 1000); }, 250),
      "1000 cm³ = 1 l: " + v + " : 1000 = " + fmt(v, 1000) + " l.");
  });
})();

// Vragen: overal NB tussen getal en eenheid, zodat "1,5 m" ook in de vraag niet over twee regels breekt.
Object.keys(P).forEach(function(id) {
  P[id].forEach(function(it) {
    it.question = it.question.replace(/(\d) (mm|cm|dm|m|km|g|kg|ml|cl|dl|l)(?=[\s:.?,²³]|$)/g, "$1" + NB + "$2");
  });
});

// Getoonde vraag: nieuwe kopie met geschudde keuzes; terms = [tip] voor de tip na een fout
function pick(poolId, skillId) {
  var it = deckPick(skillId, P[poolId]);
  var q  = { terms: [it.tip], question: it.question, answer: it.answer, choices: shuffle(it.choices) };
  if (it.isErrorSpotter) q.isErrorSpotter = true;
  if (it.smallChoices) q.smallChoices = true;
  return q;
}

function tipOf(t) { return t && t[0] ? t[0] : ""; }

// ─────────────────────────────────────────────────────────────────
// SKILL DEFINITIONS
// ─────────────────────────────────────────────────────────────────

var G1  = "Maten kennen";
var G2  = "Lengte omrekenen";
var G3  = "Gewicht";
var G4  = "Inhoud";
var G5  = "Vergelijken";
var G6  = "Rekenen met maten";
var G7  = "Omtrek";
var G8  = "Oppervlakte";
var G9  = "Toepassen";
var G10 = "Slot";

var BLOCK_GROUPS = [G1, G2, G3, G4, G5, G6, G7, G8, G9];

// [id, label, groep, desc, strategy, uitleg, voorbeeld, minCorrect]
var DEFS = [
  ["m01_eenheid_kiezen", "Eenheid kiezen", G1, "Potlood: cm, afstand: km", "eenheden",
    "Bij lengte kies je de maat die past: mm voor heel kleine dingen, cm voor kleine dingen, m voor grote dingen en km voor grote afstanden. Van klein naar groot: mm, cm, m, km.",
    "Hoogte van een deur: eenheid?\nGroot, maar geen afstand.\nAntwoord: m.", 8],
  ["m02_lengte_schatten", "Lengte schatten", G1, "Een deur is ongeveer 2 m", "voorstellen",
    "Vergelijk met iets wat je kent. Je duim is ongeveer 2 cm breed, een grote stap is ongeveer 1 m. Een antwoord dat 10 keer te groot of te klein is, kan niet kloppen.",
    "Hoe lang is een potlood ongeveer?\nKorter dan je onderarm.\nAntwoord: 15 cm.", 8],
  ["m03_gewicht_kennen", "Gewicht kennen", G1, "Een appel weegt ongeveer 150 g", "voorstellen",
    "Een pak suiker weegt 1 kg = 1000 g. Kleine dingen zoals een appel of een ei weeg je in gram, grote dingen zoals een fiets of een mens in kilogram.",
    "Hoe zwaar is een ei?\nVeel lichter dan een pak suiker.\nAntwoord: 60 g.", 8],
  ["m04_inhoud_kennen", "Inhoud kennen", G1, "Een pak melk is 1 l", "voorstellen",
    "Een pak melk is 1 liter = 1000 ml. Kleine hoeveelheden zoals een glas of een lepel meet je in ml, grote zoals een emmer of een bad in liters.",
    "Hoeveel past in een glas?\nVeel minder dan een pak melk.\nAntwoord: 250 ml.", 8],
  ["m05_m_cm", "Meter en centimeter", G2, "3 m = 300 cm", "omrekenen",
    "1 meter is 100 centimeter. Van m naar cm: keer 100. Van cm naar m: delen door 100. 2 m 35 cm is 200 + 35 = 235 cm.",
    "4 m = ? cm\n4 × 100 = 400.\nAntwoord: 400.", 8],
  ["m06_cm_mm", "Centimeter en millimeter", G2, "5 cm = 50 mm", "omrekenen",
    "1 centimeter is 10 millimeter. Van cm naar mm: keer 10. Van mm naar cm: delen door 10.",
    "7 cm = ? mm\n7 × 10 = 70.\nAntwoord: 70.", 8],
  ["m07_km_m", "Kilometer en meter", G2, "2 km = 2000 m", "omrekenen",
    "1 kilometer is 1000 meter. Van km naar m: keer 1000. Van m naar km: delen door 1000.",
    "3000 m = ? km\n3000 : 1000 = 3.\nAntwoord: 3.", 8],
  ["m08_lengte_komma", "Lengte met komma", G2, "1,5 m = 150 cm", "omrekenen",
    "Een halve meter is 50 cm, dus 1,5 m = 100 + 50 = 150 cm. Andersom: 125 cm = 1 m en 25 cm = 1,25 m.",
    "2,5 m = ? cm\n2 m = 200 cm, 0,5 m = 50 cm.\nAntwoord: 250.", 8],
  ["m09_decimeter", "Decimeter", G2, "1 dm = 10 cm", "omrekenen",
    "Tussen centimeter en meter zit de decimeter. 1 dm = 10 cm en 1 m = 10 dm. Een liniaal van 30 cm is 3 dm.",
    "4 dm = ? cm\n4 × 10 = 40.\nAntwoord: 40.", 8],
  ["m10_kg_g", "Kilogram en gram", G3, "2 kg = 2000 g", "omrekenen",
    "1 kilogram is 1000 gram. Van kg naar g: keer 1000. Van g naar kg: delen door 1000.",
    "5 kg = ? g\n5 × 1000 = 5000.\nAntwoord: 5000.", 8],
  ["m11_kg_komma", "Kilogram met komma", G3, "1,5 kg = 1500 g", "omrekenen",
    "Een halve kilo is 500 g, een kwart kilo is 250 g. Dus 2,5 kg = 2000 + 500 = 2500 g en 1,25 kg = 1250 g.",
    "3,5 kg = ? g\n3000 g + 500 g.\nAntwoord: 3500.", 8],
  ["m12_g_naar_kg", "Gram naar kilogram", G3, "750 g = 0,75 kg", "omrekenen",
    "Van gram naar kilogram deel je door 1000. Is het minder dan 1000 g, dan is het minder dan 1 kg: het antwoord begint met 0 en een komma. 500 g is een halve kilo: 0,5 kg. 750 g = 0,75 kg.",
    "250 g = ? kg\nMinder dan 1 kg, een kwart kilo.\nAntwoord: 0,25.", 8],
  ["m13_l_ml", "Liter en milliliter", G4, "2 l = 2000 ml", "omrekenen",
    "1 liter is 1000 milliliter. Van l naar ml: keer 1000. Van ml naar l: delen door 1000.",
    "3 l = ? ml\n3 × 1000 = 3000.\nAntwoord: 3000.", 8],
  ["m14_l_dl_cl", "Liter, deciliter, centiliter", G4, "1 l = 10 dl = 100 cl", "omrekenen",
    "1 liter = 10 deciliter = 100 centiliter = 1000 milliliter. 1 dl = 100 ml en 1 cl = 10 ml. Op een blikje staat vaak 33 cl.",
    "2 l = ? dl\n2 × 10 = 20.\nAntwoord: 20.", 8],
  ["m15_inhoud_komma", "Inhoud met komma", G4, "1,5 l = 1500 ml", "omrekenen",
    "Een halve liter is 500 ml, een kwart liter 250 ml. 1,5 l = 1500 ml. Andersom: 750 ml is minder dan 1 l, dus 0,75 l.",
    "500 ml = ? l\nEen halve liter.\nAntwoord: 0,5.", 8],
  ["m16_lengte_vergelijken", "Lengtes vergelijken", G5, "1,2 m is langer dan 95 cm", "zelfde eenheid",
    "Je kunt alleen goed vergelijken in dezelfde eenheid. Zet alles om naar cm: 1,2 m = 120 cm, 1050 mm = 105 cm. Daarna vergelijk je gewone getallen.",
    "Welke is het langst: 2 m of 195 cm?\n2 m = 200 cm.\nAntwoord: 2 m.", 8],
  ["m17_gewicht_vergelijken", "Gewichten vergelijken", G5, "1,5 kg is zwaarder dan 1400 g", "zelfde eenheid",
    "Zet alles om naar gram: 1,5 kg = 1500 g. Daarna vergelijk je gewone getallen.",
    "Welke is het zwaarst: 2 kg of 2100 g?\n2 kg = 2000 g.\nAntwoord: 2100 g.", 8],
  ["m18_inhoud_vergelijken", "Inhoud vergelijken", G5, "1,5 l is meer dan 12 dl", "zelfde eenheid",
    "Zet alles om naar ml: 1 l = 1000 ml en 1 dl = 100 ml. 12 dl = 1200 ml. Daarna vergelijk je gewone getallen.",
    "Waar zit het meest in: 1,5 l of 12 dl?\n1500 ml en 1200 ml.\nAntwoord: 1,5 l.", 8],
  ["m19_lengtes_optellen", "Lengtes optellen", G6, "1,5 m + 30 cm = 180 cm", "omrekenen en rekenen",
    "Maak eerst de eenheden gelijk, dan tel je op. 1,5 m = 150 cm. 150 cm + 30 cm = 180 cm.",
    "2,5 m + 20 cm = ? cm\n250 + 20.\nAntwoord: 270.", 8],
  ["m20_lengte_verschil", "Lengte aftrekken", G6, "1 m − 30 cm = 70 cm", "omrekenen en rekenen",
    "Maak eerst de eenheden gelijk. 1 m = 100 cm. 100 cm − 30 cm = 70 cm.",
    "2 m − 45 cm = ? cm\n200 − 45.\nAntwoord: 155.", 8],
  ["m21_gewichten_rekenen", "Rekenen met gewicht", G6, "1 kg − 250 g = 750 g", "omrekenen en rekenen",
    "Maak eerst de eenheden gelijk. 1 kg = 1000 g. 1000 g − 250 g = 750 g en 2 kg + 300 g = 2300 g.",
    "1 kg + 400 g = ? g\n1000 + 400.\nAntwoord: 1400.", 8],
  ["m22_inhoud_verdelen", "Inhoud verdelen", G6, "1 l over 4 glazen = 250 ml", "omrekenen en delen",
    "Reken de liters eerst om naar ml, daarna deel je. 1 l = 1000 ml. 1000 ml : 4 glazen = 250 ml per glas.",
    "1,5 l over 3 glazen: ml per glas?\n1500 : 3.\nAntwoord: 500.", 8],
  ["m23_maten_keer", "Maten keer", G6, "4 × 250 g = 1000 g", "vermenigvuldigen",
    "Heb je meer van hetzelfde, dan reken je aantal keer de maat. 4 pakjes van 250 g = 1000 g = 1 kg.",
    "3 × 200 g = ? g\n3 × 200 = 600.\nAntwoord: 600.", 8],
  ["m24_omtrek_rechthoek", "Omtrek rechthoek", G7, "5 bij 3 cm: omtrek 16 cm", "rand meten",
    "De omtrek is de lengte van de hele rand. Bij een rechthoek tel je alle 4 zijden op: lengte + breedte + lengte + breedte.",
    "Rechthoek 6 cm bij 2 cm. Omtrek?\n6 + 2 + 6 + 2.\nAntwoord: 16 cm.", 8],
  ["m25_omtrek_vierkant", "Omtrek vierkant", G7, "Zijde 5 m: omtrek 20 m", "rand meten",
    "Een vierkant heeft 4 even lange zijden. De omtrek is 4 keer de zijde.",
    "Vierkant met zijde 7 m. Omtrek?\n4 × 7.\nAntwoord: 28 m.", 8],
  ["m26_zijde_uit_omtrek", "Zijde uit omtrek", G7, "Omtrek 20 cm: zijde 5 cm", "terugrekenen",
    "Ken je de omtrek van een vierkant, dan deel je door 4: alle 4 zijden zijn even lang.",
    "Vierkant, omtrek 36 cm. Zijde?\n36 : 4.\nAntwoord: 9 cm.", 8],
  ["m27_hokjes_tellen", "Hokjes tellen", G8, "3 rijen van 4 = 12 cm²", "tellen",
    "Oppervlakte is hoeveel ruimte een vlak inneemt. Is elk hokje 1 cm², dan tel je de hokjes. Rijen keer hokjes per rij gaat sneller.",
    "■■■\n■■■\n2 rijen van 3 hokjes.\nAntwoord: 6 cm².", 8],
  ["m28_opp_rechthoek", "Oppervlakte rechthoek", G8, "4 m bij 3 m = 12 m²", "lengte keer breedte",
    "De oppervlakte van een rechthoek is lengte keer breedte. Meet je in meter, dan is de oppervlakte in vierkante meter: m².",
    "5 m bij 2 m. Oppervlakte?\n5 × 2.\nAntwoord: 10 m².", 8],
  ["m29_opp_vierkant", "Oppervlakte vierkant", G8, "Zijde 4 cm = 16 cm²", "zijde keer zijde",
    "Bij een vierkant zijn lengte en breedte gelijk. De oppervlakte is zijde keer zijde.",
    "Vierkant zijde 6 cm. Oppervlakte?\n6 × 6.\nAntwoord: 36 cm².", 8],
  ["m30_omtrek_of_opp", "Omtrek of oppervlakte", G8, "Rand in cm, binnenkant in cm²", "onderscheiden",
    "Omtrek is de rand: alle zijden opgeteld, in cm. Oppervlakte is de binnenkant: lengte keer breedte, in cm². Lees goed wat er gevraagd wordt.",
    "5 bij 3 cm. Omtrek?\n5 + 3 + 5 + 3 = 16.\nAntwoord: 16 cm (niet 15 cm²).", 8],
  ["m31_lengte_opp_inhoud", "Lengte, oppervlakte, inhoud", G8, "m, m² of m³", "onderscheiden",
    "Een lijn meet je in m of cm (lengte). Een vlak, zoals een vloer of muur, in m² of cm² (oppervlakte). Een ruimte, zoals een bak of doos, in m³ of cm³ (inhoud).",
    "Zand in een zandbak: eenheid?\nHet vult een ruimte.\nAntwoord: m³.", 8],
  ["m32_schatten", "Schatten met maten", G9, "1,95 m + 2,05 m ≈ 4 m", "afronden",
    "Rond elke lengte af op hele meters en tel dan op. 1,95 m wordt 2 m, 2,05 m wordt 2 m: samen ongeveer 4 m.",
    "Ongeveer: 2,9 m + 3,1 m ≈ ?\n3 m + 3 m.\nAntwoord: 6 m.", 8],
  ["m33_kort_verhaal", "Kort verhaal", G9, "3 flessen van 1,5 l = 4,5 l", "toepassen",
    "Heb je meer van hetzelfde, dan reken je aantal keer de maat. 3 flessen van 1,5 liter: 3 × 1,5 = 4,5 liter.",
    "2 planken van 1,25 m: samen?\n1,25 + 1,25.\nAntwoord: 2,5 m.", 8],
  ["m34_missende_maat", "Missende maat", G9, "? + 30 cm = 1 m: 70 cm", "aanvullen",
    "Weet je wat er al is en wat het totaal moet zijn, dan reken je het verschil uit. 1 m = 100 cm, dus ? + 30 cm = 1 m geeft 70 cm.",
    "? + 250 g = 1 kg\n1000 − 250.\nAntwoord: 750 g.", 8],
  ["m35_fout_omrekenen", "Fout spotten: omrekenen", G9, "1,5 m = 15 cm is fout", "controleren",
    "Controleer bij elke omrekening de factor: 1 m = 100 cm, 1 kg = 1000 g, 1 l = 1000 ml, 1 km = 1000 m. Een veelgemaakte fout is 10 keer te weinig: 1,5 m = 15 cm (goed is 150 cm).",
    "Welke omrekening is FOUT?\n2 kg = 200 g → goed is 2000 g.\nDie is fout.", 12],
  ["m36_inhoud_doos", "Inhoud van een doos", G9, "10 × 10 × 10 cm = 1000 cm³ = 1 l", "lengte keer breedte keer hoogte",
    "De inhoud van een doos is lengte keer breedte keer hoogte, in kubieke centimeter: cm³. Een doos van 10 × 10 × 10 cm heeft 1000 cm³, en daar past precies 1 liter in. Dus 1000 cm³ = 1 l.",
    "Doos 5 × 4 × 2 cm. Inhoud?\n5 × 4 × 2 = 40.\nAntwoord: 40 cm³.", 8],
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
    // Pool via het korte ID (m01), stapel per volledige skill-ID
    make:       function() { return pick(poolId, d[0]); },
  };
});

// ─────────────────────────────────────────────────────────────────
// SKILLS MET VRAAGVERLOOP + m37 SNELHEIDSRONDE
// ─────────────────────────────────────────────────────────────────

var SKILLS = createSkills("meten", RAW_SKILLS);
var MIXER  = createMixer(RAW_SKILLS, BLOCK_GROUPS, SKILLS.byId);

export var METEN_SKILLS = SKILLS.list;

registerSkillId("meten", "m37_snelheid");

METEN_SKILLS.push({
  id:         "m37_snelheid",
  label:      "Snelheidsronde",
  group:      G10,
  desc:       "Gemengd: alle soorten meten",
  strategy:   "snel",
  tip:        "Kijk eerst wat er gevraagd wordt: omrekenen, vergelijken, omtrek of oppervlakte. Maak de eenheden gelijk en reken dan.",
  uitleg:     "In de snelheidsronde komen alle soorten meetvragen door elkaar voorbij. Kies per vraag de aanpak die je hebt geleerd.",
  voorbeeld:  "Gemengd, bijvoorbeeld:\n1,5 m = ? cm, 750 g = ? kg, omtrek van een vierkant",
  minCorrect: 15,
  generate:   MIXER.generate,
});

export var METEN_ORDER = METEN_SKILLS.map(function(s) { return s.id; });

// Voor tests: de vaste pools (alleen lezen)
export var METEN_POOLS = P;
